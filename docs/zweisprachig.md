# Zweisprachige Oberfläche (Deutsch / Englisch)

Stand 23.10.2026. Umschalter: Flaggen in der Kopfleiste (Startseite: eigene Flaggen). Die Wahl steht in `localStorage` (`plexora-lang`); beim Umschalten lädt die Seite neu.

## So funktioniert es

- **Feste Texte** stehen deutsch im Quelltext, eingehüllt als `tr('Deutscher Text')` (in Vorlagen `{{ tr('…') }}`, in Skripten `tr('…')`). `tr` (`app/utils/tr.ts`) liefert in Deutsch den Text unverändert, in Englisch den Eintrag aus `shared/i18n/en.ts`. Fehlt der Eintrag, bleibt der deutsche Text stehen.
- **Wörterbuch:** `shared/i18n/en.ts`, Schlüssel = der deutsche Text exakt wie im Quelltext.
- **Ältere Bereiche** (Dashboard-Kacheln, Kernseiten) nutzen weiter `useLang().t` (`app/composables/useLang.ts`).
- **Hilfe:** `shared/helpContent.ts` (Deutsch) + `shared/helpContent.en.ts` (Englisch), siehe `docs/hilfe-system.md`.
- **Test:** `tests/i18n/en.test.ts` schlägt fehl, wenn ein mit `tr()` markierter deutscher Text keine englische Fassung hat.

## Neuer Text

Text mit `tr('…')` einhüllen, dann den Eintrag in `shared/i18n/en.ts` ergänzen. Der Test sagt, was fehlt.

## Bewusst nicht übersetzt

Öffentliche Seiten des Betreibers (Lead-Seiten, Kurzlinks, eigene Website, Impressum, Datenschutz, AGB, Kundenportal, Angebotslinks, Zahlungsseite, Stellenanzeigen), Anmelde- und Einladungsseiten, E-Mail-Texte an Kunden (Mahnungen, Vorlagen), Meldungen, die der Server zurückgibt, und Inhalte, die Benutzer selbst eingeben (Beispieldaten der Demo).

## Bekannte Lücken

Zusammengesetzte Sätze mit eingebauten Werten (`` `${n} Tage …` ``) und Texte in den Branchen-Paketen (Feldnamen) sind noch deutsch.
