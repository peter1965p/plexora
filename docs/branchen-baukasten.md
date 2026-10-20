# Branchen-Baukasten (Stand 20.10.2026)

Sechs Branchen-Pakete aus einem Guss: **Fitness & Sport, Bildung & Kurse, Veranstaltungen, Reinigung & Gebäudeservice, Verein, Taxi & Fahrdienst.**
Sie ersetzen das frühere Paket „Gesundheit / Praxis“ (Medizinsoftware ist in Deutschland streng geregelt; es ist entfernt, die Rezept- und Patienten-Routen gibt es nicht mehr).

## Aufbau
- **Beschreibung:** `shared/branchKit.ts` (`KIT_PACKAGES`): Pakete → Listen → Felder (Typen: Text, Zahl, Betrag, Datum, Uhrzeit, Auswahl, E-Mail, Telefon, Verweis auf eine andere Liste, Ja/Nein). Einzige Quelle für Oberfläche, Server, Hilfe und Prüfungen.
- **Seite:** `app/pages/branche/[pkg].vue` (`/branche/<paket>`): Reiter je Liste, Suche, Anlegen/Bearbeiten/Löschen, Summe unter der Tabelle (z. B. offene Beiträge).
- **Server:** `/api/branchen/<paket>/<liste>` (GET, POST) und `/<id>` (PUT, DELETE), Logik in `server/utils/branchKitStore.ts`. Alles in der Tabelle `plexora-branch-records` (Schlüssel: Mandant + `paket#liste#id`).
- **Regeln:** Paketzugriff je Paket (`moduleAccess.ts`), Rolle Admin (`rolePolicy.ts`, `AREA_ROLES` `/branche`), Demo-Konto darf nicht schreiben, höchstens 2000 Einträge je Liste, Verweise müssen auf vorhandene Einträge desselben Mandanten zeigen, nur bekannte und geprüfte Felder werden gespeichert.
- **Sicherung:** Tabelle in `shared/backupConfig.json` (`ownerTenant`).

## Was die Pakete bewusst nicht tun
Sie führen Listen und Stände. Sie buchen kein Geld und stellen keine Rechnungen aus (Rechnungen: Finanzen). Es gibt keine Felder für Gesundheits-, Diagnose- oder Bankdaten (ein Test prüft das). In der Oberfläche steht der Hinweis, keine besonders sensiblen Daten einzutragen.

## Neues Paket oder neue Liste
1. In `KIT_PACKAGES` ergänzen (Tests `tests/branchkit` prüfen Stimmigkeit).
2. Symbol (Lucide-Name) in `AppSidebar.vue`, `store.vue`, `index.vue` ergänzen, falls neu.
3. `npx vite-node scripts/register-branch-kit.mjs --apply` trägt es im Modul-Store ein (Preis dort ändern oder im Skript).
4. Hilfethema entsteht automatisch.

## Preise (Vorschlag, im Modul-Store änderbar)
Verein 29 €, die anderen 39 € im Monat.
