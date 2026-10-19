# Hilfe in Plexora (Stand 19.10.2026)

- **Inhalte:** `shared/helpContent.ts` (Themen mit Schritten, Tipps, Fragen; Tooltip-Texte `HELP_TIPS`; Einführung `TOUR_STEPS`). Nur hier pflegen.
- **Hilfe-Seite:** `/help` (Suche, Gruppen, „Hilfe zu dieser Seite“ über das Fragezeichen in der Kopfleiste, `?topic=<id>`). Für alle Rollen sichtbar.
- **Tooltips:** `<HelpTip k="schlüssel" />` (app/components/HelpTip.vue). Gesetzt bei Team-Rollen, Planer (Kritischer Pfad), Bot-Schutz, Blog-Kommentare, Angebote, Modul-Store.
- **Einführung:** `OnboardingTour.vue` startet beim ersten Besuch (Merker im Browser `plexora-tour-done`) und erneut über „Einführung starten“ auf der Hilfe-Seite.
- **Pflege:** Neues Modul = neues Thema in `HELP_TOPICS`. `tests/help/content.test.ts` prüft, dass jeder Bereich aus `AREA_ROLES` ein Thema hat und alle Verweise auf vorhandene Seiten zeigen.
- Nur Deutsch; Englisch ist noch offen.
