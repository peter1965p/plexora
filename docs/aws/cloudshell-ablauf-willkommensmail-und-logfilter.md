# CloudShell-Ablauf: Recht für den Einmal-Link und Log-Filter für den Alarm

Stand 08.10.2026. Zwei Dinge, die nur ein Administrator in der CloudShell tun kann. Alles andere (Schalter, Test) macht Claude danach selbst.
Region oben rechts in der Konsole auf **Europa (Frankfurt) eu-central-1**, dann CloudShell öffnen (`>_` in der Kopfzeile).

## Teil A: Recht für die Willkommensmail mit Einmal-Link

Was es tut: Die Rolle der API-Lambda (`plexora-lambda-role`) darf genau eine Aktion ausführen, `cognito-idp:AdminSetUserPassword`, und nur auf deinen User Pool. Das wird gebraucht, damit ein Kunde über den Link sein Passwort festlegen kann. Ohne dieses Recht bleibt der alte Ablauf aktiv (Schalter aus), nichts geht kaputt.

### A0) Prüfen, wer du bist
```bash
echo "Region: $AWS_REGION"; aws sts get-caller-identity --query Arn --output text
```
Erwartet: `eu-central-1` und **dein** Administrator-Benutzer oder deine Rolle, **nicht** `user/plexora-app`.

### A1) Skript hochladen
Menü **Actions → Upload file**, Datei `~/Dev/plexora/scripts/aws/grant-set-password-right.sh` auswählen.
```bash
chmod +x grant-set-password-right.sh
```

### A2) Probelauf (ändert nichts)
```bash
./grant-set-password-right.sh --dry-run
```
Erwartet: genau eine Zeile `PasswortPerEinmalLinkFestlegen : cognito-idp:AdminSetUserPassword auf arn:aws:cognito-idp:eu-central-1:…:userpool/eu-central-1_lM7sN6LvC` und `(Probelauf: nichts geändert)`.

### A3) Anwenden
```bash
./grant-set-password-right.sh --apply
```
Erwartet: `Gesetzt. Als Nächstes: scripts/aws/set-enforce.sh welcome on, …`.

### A4) Prüfen, dass es gesetzt ist
```bash
aws iam get-role-policy --role-name plexora-lambda-role --policy-name plexora-set-password --query 'PolicyDocument.Statement[].[Sid,Action,Resource]' --output text
```
Erwartet: eine Zeile mit `PasswortPerEinmalLinkFestlegen`, `cognito-idp:AdminSetUserPassword` und der Pool-Adresse.

### A5) Mir Bescheid sagen: "Recht gesetzt"
Dann mache ich:
1. Ist-Zustand festhalten (Aliase, Versionen, Konfiguration ohne Werte).
2. `scripts/aws/set-enforce.sh welcome on` und `scripts/aws/deploy-backend.sh --config-only`.
3. Test ohne deinen Browser: ein von mir korrekt signiertes `checkout.session.completed`-Ereignis (Lizenzkauf, Stufe Starter, Adresse `news24regional+plxtest@gmail.com`) an den Webhook. Das legt eine Test-Lizenz und ein Test-Konto an und löst die Willkommensmail aus.
   - Prüfung: Mail enthält den Link, aber **kein** Passwort und keinen Lizenzschlüssel; im Mail-Protokoll steht keine Vorschau.
   - Den Link löse ich per Programm ein (Passwort setzen), danach muss der Link tot sein; das Konto steht auf bestätigt.
   - Danach räume ich meine Testdaten auf (Test-Lizenz, Test-Konto, Token-Zeilen) und belege, dass sie weg sind.
4. Fällt der Test durch (z. B. `AccessDenied` beim Setzen des Passworts): Schalter sofort wieder aus (`set-enforce.sh welcome off` und `--config-only`), Ursache berichten und anhalten.
5. Zuletzt `check-public-flows.sh`, `check-demo-login.sh`, `check-storage.sh`.

Du bekommst bei dem Test eine Mail an `news24regional+plxtest@gmail.com` (landet in deinem normalen Postfach). Sie ist harmlos; der Link darin ist nach meinem Test ungültig.

### Rückweg
```bash
./grant-set-password-right.sh --revoke
```
Danach unbedingt `scripts/aws/set-enforce.sh welcome off` (sage mir Bescheid, ich erledige es), sonst bekämen neue Kunden einen Link, der nicht funktioniert.

## Teil B: Log-Filter für den Alarm "Anwendungsfehler"

Der Alarm `plexora-app-errors-log` existiert schon, bekommt aber keine Daten, solange der Filter fehlt (er zählt Zeilen mit `[request error]` im Log der API). Der Alarm steht deshalb heute auf OK, ohne etwas zu messen.

### B1) Filter anlegen (ein Befehl, nur dieser eine Eintrag)
```bash
aws logs put-metric-filter --region eu-central-1 --log-group-name /aws/lambda/plexora-api --filter-name plexora-request-errors --filter-pattern '"[request error]"' --metric-transformations metricName=RequestErrors,metricNamespace=Plexora,metricValue=1,defaultValue=0,unit=Count
```
Erwartet: keine Ausgabe (Erfolg ist still). Fehler wie `AccessDeniedException` heißen: dein Benutzer hat `logs:PutMetricFilter` nicht.

### B2) Prüfen, dass er steht
```bash
aws logs describe-metric-filters --region eu-central-1 --log-group-name /aws/lambda/plexora-api --query 'metricFilters[].[filterName,filterPattern]' --output text
```
Erwartet: `plexora-request-errors  "[request error]"`.

### B3) Mir Bescheid sagen: "Filter gesetzt"
Ich prüfe lesend, ob die Metrik `Plexora/RequestErrors` existiert (sie erscheint nach der ersten Protokollzeile, spätestens nach wenigen Minuten) und ob der Alarm sie sieht.

### Rückweg
```bash
aws logs delete-metric-filter --region eu-central-1 --log-group-name /aws/lambda/plexora-api --filter-name plexora-request-errors
```
