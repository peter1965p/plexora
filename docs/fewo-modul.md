# Branchenpaket Ferienwohnungen (Stand 13.10.2026)

Seite: `/fewo` (Rolle Admin, Paket `fewo`). Daten: Tabellen `plexora-fewo-units`, `plexora-fewo-bookings` (je Mandant).

## Was es kann
- **Unterkünfte**: Name, Personen, Schlafzimmer, Mindestaufenthalt, Preis pro Nacht, Saisonpreise, Endreinigung, Kurtaxe (je Person/Nacht), An-/Abreisezeit.
- **Buchungen**: Bestätigt, Anfrage, Sperrzeit (Eigennutzung), Storniert. Preis wird berechnet (oder von Hand überschrieben). Überschneidungen werden abgelehnt; Abreisetag = Anreisetag ist erlaubt.
- **Belegungsplan**: Monatsansicht je Unterkunft, Klick auf einen freien Tag legt eine Buchung an. Doppelbelegungen (z. B. durch einen Kanal) sind rot schraffiert.
- **Rechnung aus Buchung** (nur bestätigt, nur einmal): Positionen Übernachtung, Endreinigung, Kurtaxe, in Finanzen als offene Rechnung (14 Tage Ziel).

## Booking.com und andere Kanäle: iCal-Abgleich
Eine Live-Schnittstelle (Preise, Buchungsdetails) bietet Booking.com nur zugelassenen „Connectivity Partnern“ an. Dieses Paket gleicht daher **Belegungen per iCal** ab:
1. **Raus**: Unterkünfte → „Dein Kalender-Link“ kopieren und beim Kanal als Kalender-Import eintragen (Booking.com: Extranet → Preise & Verfügbarkeit → Kalender synchronisieren; Airbnb: Verfügbarkeit → Kalender verbinden). Es steht nur „Belegt“ mit Datum darin.
2. **Rein**: den iCal-Link des Kanals bei „Kanäle einlesen“ eintragen. Plexora sperrt die Tage (Sperrzeit mit dem Kanalnamen). „Jetzt abgleichen“ liest neu; beim Hinzufügen wird sofort einmal gelesen.
3. **Mehrere Kanäle**: Für jeden Kanal gibt es einen eigenen Link „inkl. anderer Kanäle“ (ohne die eigenen Buchungen dieses Kanals), damit Booking.com auch Airbnb-Belegungen sieht, ohne seine eigenen zurückzubekommen.
Grenzen: Die Kanäle lesen den Link nur alle paar Stunden; in dieser Zeit kann eine Doppelbuchung entstehen (der Plan markiert sie). Preise, Gästenamen und Zahlungen kommen nicht aus dem Kanal. Der Abgleich läuft derzeit auf Knopfdruck, noch nicht automatisch.

## Sicherheit
- Kalender-Link: Geheimnis (24 Byte) im Link, einheitlich 404 bei jedem Fehler, Drossel; neuer Link macht den alten ungültig.
- Eingelesene Adressen: nur https, keine internen Adressen (auch nicht über Weiterleitungen), Größen- und Zeitlimit; Kanal-Adressen werden in der Oberfläche nie gezeigt (nur Servername).
- Alle Routen mit Mandantentrennung, Demo-Konto kann nichts ändern.

## Offen
- Eintrag im Modul-Store (Preis, Beschreibung) und damit der Menüpunkt in der Seitenleiste: wartet auf Peters Preis. Bis dahin ist die Seite direkt unter `/fewo` erreichbar.
- Automatischer Abgleich (EventBridge) und Verfügbarkeitsseite für Gäste auf der Nexora-Website: nicht gebaut.
- Booking.com-Live-Anbindung: Bewerbung als Connectivity Partner nötig.
