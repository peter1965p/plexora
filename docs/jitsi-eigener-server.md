# Eigener Jitsi-Server für Video-Termine (Anleitung)

Stand 12.10.2026. **Nur nötig, wenn du Gespräche nicht über meet.jit.si laufen lassen willst.** Plexora funktioniert ohne diesen Schritt (Standard: meet.jit.si). Auf deinen Server komme ich nicht, die Schritte machst du selbst. Prüfe sie vorher gegen das offizielle Handbuch, Versionen ändern sich:
https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-quickstart

## 0. Vorher klären (vor dem Bestellen)
- Tarif: Dogado Cloud Server S 4.0 (4 GB RAM, 2 vCores, Standort Deutschland). Preis: die ersten 6 Monate 0,99 €, danach 6,99 € im Monat (laut Preisseite). Fußnote 1 lesen: Mindestlaufzeit, Kündigungsfrist.
- Das Betriebssystem muss **Debian 12 oder Ubuntu 22.04/24.04** sein (ohne Plesk). Das Panel-Angebot (Plesk Obsidian) nicht dazubuchen.
- Der Anbieter muss die Ports **80/TCP, 443/TCP und 10000/UDP** freigeben (Firewall im Kundenbereich, falls es eine gibt).

## 1. Subdomain (DNS)
Beim Anbieter deiner Domain einen **A-Eintrag** anlegen: `meet.paeffgen-it.de` zeigt auf die IP-Adresse des Servers. Warten, bis `ping meet.paeffgen-it.de` die richtige IP zeigt.

## 2. Server vorbereiten (als root oder mit sudo)
```bash
hostnamectl set-hostname meet.paeffgen-it.de
echo "127.0.0.1 meet.paeffgen-it.de" >> /etc/hosts
apt update && apt -y upgrade
apt install -y ufw
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 10000/udp
ufw --force enable
```
Port 22 (SSH) nicht vergessen, sonst sperrst du dich selbst aus.

## 3. Jitsi installieren (Paketquelle laut Handbuch)
Die Schritte aus dem Handbuch („Quick Install“): Jitsi-Paketquelle und Schlüssel eintragen, dann `apt install jitsi-meet`. Der Installer fragt nach dem Servernamen (`meet.paeffgen-it.de`) und nach dem Zertifikat. Wähle „Generate a new self-signed certificate“ und erzeuge danach das echte:
```bash
/usr/share/jitsi-meet/scripts/install-letsencrypt-cert.sh
```
(Let’s Encrypt braucht Port 80 und eine E-Mail-Adresse für Warnungen.) Danach im Browser `https://meet.paeffgen-it.de` öffnen: Die Startseite von Jitsi muss erscheinen und ein Testraum funktionieren (Kamera/Ton mit zwei Geräten prüfen, auch mit mobilem Netz).

## 4. Nicht jeder darf Räume anlegen (wichtig)
Ohne diese Einstellung kann jeder auf deinem Server Räume starten. Im Handbuch heißt das **„Secure Domain“** (Moderatoren melden sich an, Gäste kommen nur in bereits geöffnete Räume). Danach gilt für Plexora-Termine:
- Du öffnest den Link aus der Termin-Mail zuerst und meldest dich als Moderator an.
- Der Kunde wartet, bis der Raum offen ist, und kommt dann ohne Konto hinein.
Moderator anlegen: `prosodyctl register <name> meet.paeffgen-it.de <passwort>` (Passwort selbst wählen, nirgends in Chats oder Mails weitergeben).

## 5. Plexora einstellen
Einstellungen → Video | Kalender → Karte „Eigener Videoraum je Termin“ → Feld **Eigener Jitsi-Server**: `meet.paeffgen-it.de` (ohne https://) → Speichern. Neue Video-Buchungen bekommen dann Links wie `https://meet.paeffgen-it.de/Plexora-…`. Bereits verschickte Mails behalten ihren alten Link. **Zurück zu meet.jit.si:** Feld leeren und speichern.

## 6. Betrieb (bleibt bei dir)
- Updates: regelmäßig `apt update && apt upgrade` (monatlich, Sicherheitsupdates sofort). Das Zertifikat erneuert sich selbst, bei Zweifel `certbot renew --dry-run`.
- Backup: ein Server-Abbild beim Anbieter („Backup Service“ ist optional dazubuchbar). Es sind kaum Daten auf dem Server, ein Neuaufbau nach dieser Anleitung dauert etwa eine Stunde.
- Datenschutz: Dann ist **dein** Server der Verantwortliche für die Gesprächsdaten. Der Absatz in der Datenschutzerklärung muss dazu geändert werden (nicht mehr 8x8/meet.jit.si, sondern dein Server in Deutschland). Dazu mach ich dir einen neuen Entwurf.
- Fällt der Server aus, bekommen neue Buchungen einen Link, der nicht öffnet. Dann das Feld in Plexora leeren (Rückweg oben).
