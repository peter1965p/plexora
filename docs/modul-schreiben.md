# Neue Module für Plexora schreiben (Stand 19.10.2026)

Es gibt zwei Wege. Faustregel: **Kleine Listen/Einstellungen ohne eigenes Backend → Zero-Deploy-Plugin. Alles mit Rechnungen, Zahlungen, öffentlichen Seiten oder eigenen Tabellen → eingebautes Modul.**

## A. Zero-Deploy-Plugin (ohne Deploy von Plexora)
**Aufbau:** eine `.mjs`-Datei auf einer https-Adresse (z. B. S3), Vorlage: `docs/vorlagen/plugin-vorlage.mjs` (geprüft: rendert mit echtem Vue).
- Standard-Export `default(Vue, host)`, gibt eine Vue-Komponente zurück. Vue kommt vom Host, nicht selbst bündeln.
- **Render-Funktionen (`h`)** statt Template-Text: Plexora liefert Vue ohne Template-Compiler aus.
- **Daten nur über `host`:** `await host.getData()` und `await host.saveData(objekt)`. Ein JSON-Block je Mandant und Plugin (Tabelle `plexora-plugin-data`), höchstens 200 KB. Kein eigenes `fetch` auf Plexora-Routen.
- **Aussehen:** Farbvariablen `--bg-surface`, `--bg-elevated`, `--bg-hover`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border`, `--accent`; Klassen `card`, `card-header`, `card-title`, `accent-btn`, `icon-btn`, `data-table`; Symbole `ti ti-…` (Tabler). Keine festen Farben für Hintergrund/Schrift, sonst ist es auf einem Theme unlesbar.
- Fehler im Plugin abfangen und als Text anzeigen, nie still scheitern.

**Registrieren:** Modul-Store → Reiter Branchen-Pakete → „Neues Modul registrieren“ (nur Plattform-Admin). Key (a–z, 0–9, Bindestrich), Name, Icon (Lucide-Name), Preis, Beschreibung, Features, Typ „Zero-Deploy-Plugin“ und die Bundle-URL. Danach: Seitenleiste „BRANCHE“, Seite `/plugins/<key>`.

**Sicherheit:** Das Bundle läuft mit der Sitzung des Benutzers. Nur eigene, vertrauenswürdige Quellen eintragen; ändert sich die Datei, ändert sich das Modul sofort bei allen. Rollen: `/api/plugins` verlangt Admin (Rollenprüfung wirkt, sobald der Inhaber sie einschaltet) und einen bezahlten Tarif; das Demo-Konto darf nicht speichern.

## B. Eingebautes Modul (Änderung im Repository)
Checkliste (jede Zeile wird von einem Test erzwungen):
1. Seite `app/pages/<name>/index.vue` mit `definePageMeta({ layout: 'dashboard', middleware: 'auth' })`, gestaltet mit den Variablen/Klassen oben.
2. `shared/roles.ts` → `AREA_ROLES`: Mindestrolle der Seite.
3. `server/utils/rolePolicy.ts` und `moduleAccess.ts`: Rolle und Tarif/Paket der Routen.
4. Server-Routen unter `server/api/<name>/…`: Mandantentrennung (`requireTenantId`/`resolveUserId`), `assertNotDemo` bei Schreibzugriffen, Eingaben prüfen, einheitliche Fehler.
5. Neue Tabellen: Skript `scripts/create-…`, und `shared/backupConfig.json` (Klasse der Tabelle), sonst rot.
6. Öffentliche Routen: `routePolicy.ts` plus Nachweis in `tests/security/publicRoutes.evidence.ts`; einheitlich 404/401, Drossel, ggf. Bot-Schutz.
7. Buckets/Speicher deklarieren (Deploy-Gate `check-storage.sh`).
8. Eintrag in der Registry (Modul-Store) mit `builtin: true` und `route`.
9. **Hilfe:** Thema in `shared/helpContent.ts` (der Test `tests/help/content.test.ts` verlangt eines je Bereich).
10. Tests: Logik, Mandantentrennung, Demo-Sperre; dann `deploy-backend.sh` und die drei Prüfskripte.

Beispiel für ein vollständiges Paket: `docs/fewo-modul.md`.
