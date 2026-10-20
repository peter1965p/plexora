// Hilfe-Inhalte für Plexora und Nexora: reine Daten, ohne Netz und Oberfläche. Die Hilfe-Seite, die Tooltips und die Einführung lesen alle hieraus.
import { KIT_PACKAGES, KIT_ROUTE } from './branchKit'
// Regel: nur beschreiben, was es wirklich gibt. Bei neuen Modulen hier ein Thema ergänzen (der Test tests/help/content.test.ts prüft die Abdeckung).
export interface HelpFaq { q: string; a: string }
export interface HelpTopic {
  id: string; group: string; title: string; icon: string
  /** Seite in Plexora, auf die sich das Thema bezieht (für "Hilfe zu dieser Seite" und den Sprung dorthin) */
  route?: string
  /** Wer darf das? Entspricht shared/roles.ts (Inhaber > Admin > Mitglied) */
  role?: 'Mitglied' | 'Admin' | 'Inhaber'
  summary: string
  steps: string[]
  tips?: string[]
  faq?: HelpFaq[]
}

export const HELP_GROUPS = [
  { id: 'start', title: 'Erste Schritte', icon: 'ti-rocket' },
  { id: 'kunden', title: 'Kunden & Verkauf', icon: 'ti-users' },
  { id: 'orga', title: 'Organisation', icon: 'ti-calendar-event' },
  { id: 'marketing', title: 'Marketing & Web', icon: 'ti-speakerphone' },
  { id: 'branche', title: 'Branchen-Pakete', icon: 'ti-building-store' },
  { id: 'nexora', title: 'Nexora (Website)', icon: 'ti-world' },
  { id: 'system', title: 'System & Konto', icon: 'ti-settings' },
] as const

export const HELP_TOPICS: HelpTopic[] = [
  // ── Erste Schritte ──
  {
    id: 'ueberblick', group: 'start', title: 'Was ist Plexora?', icon: 'ti-layout-dashboard',
    summary: 'Plexora ist dein Büro im Browser: Kunden, Rechnungen, Projekte, Termine, Marketing und deine Website an einem Ort. Nexora ist die Website-Engine dazu.',
    steps: [
      'Links siehst du die Seitenleiste. Sie ist in Übersicht, Module, Branche und System gegliedert.',
      'Oben rechts findest du Benachrichtigungen, den Knopf „Neu“ zum schnellen Anlegen und dein Profil.',
      'Welche Module du siehst, hängt von deinem Tarif und den Modulen ab, die du im Modul-Store eingeschaltet hast.',
      'Alles, was du nicht brauchst, kannst du im Modul-Store ausschalten. Deine Daten bleiben dabei erhalten.',
    ],
    tips: ['Mit dem Fragezeichen oben rechts kommst du von jeder Seite direkt zur passenden Hilfe.', 'Die Einführung kannst du jederzeit unter „Hilfe“ erneut starten.'],
  },
  {
    id: 'rollen', group: 'start', title: 'Rollen: Inhaber, Admin, Mitglied', icon: 'ti-shield-check', route: '/team',
    summary: 'Jede Person im Konto hat eine Rolle. Sie bestimmt, welche Bereiche sie sieht und ändern darf.',
    steps: [
      'Inhaber: gehört das Konto. Darf alles, auch Team, Modul-Store und Tarif.',
      'Admin: darf Geschäftsbereiche wie Finanzen, Verträge, HR, Shop, Blog, Newsletter und Einstellungen verwalten.',
      'Mitglied: arbeitet im Tagesgeschäft (CRM, Support, Projekte, Termine, Marketing, Formulare).',
      'Rollen vergibst und änderst du unter Team in der Seitenleiste (nur Inhaber).',
    ],
    tips: ['Wichtig: Die Rollen werden zurzeit nur beobachtet. Die Oberfläche blendet Bereiche aus, durchgesetzt werden die Rechte erst, wenn der Inhaber das einschaltet.'],
    faq: [{ q: 'Warum sehe ich einen Bereich nicht?', a: 'Entweder ist das Modul nicht eingeschaltet (Modul-Store) oder deine Rolle reicht dafür nicht. Frage den Inhaber.' }],
  },
  {
    id: 'neu-menue', group: 'start', title: 'Schnell anlegen mit „Neu“', icon: 'ti-plus',
    summary: 'Der Knopf „Neu“ oben rechts legt in einem Schritt Kunden, Angebote, Aufgaben, Termine und mehr an.',
    steps: ['Klicke oben rechts auf „Neu“.', 'Wähle, was du anlegen willst. Du landest direkt im passenden Formular.', 'Speichere. Der Eintrag erscheint sofort in der jeweiligen Liste.'],
  },
  {
    id: 'benachrichtigungen', group: 'start', title: 'Benachrichtigungen', icon: 'ti-bell',
    summary: 'Die Glocke oben zeigt neue Anfragen, Zahlungen, Termin-Erinnerungen und Hinweise.',
    steps: ['Klicke auf die Glocke. Ungelesene Meldungen haben eine rote Zahl.', 'Ein Klick auf eine Meldung markiert sie als gelesen.', 'Mit „Alle gelesen“ oder „Alle löschen“ räumst du auf.'],
  },

  // ── Kunden & Verkauf ──
  {
    id: 'dashboard', group: 'kunden', title: 'Dashboard', icon: 'ti-layout-dashboard', route: '/dashboard', role: 'Mitglied',
    summary: 'Die Startseite mit den wichtigsten Kennzahlen und offenen Aufgaben auf einen Blick.',
    steps: ['Öffne „Dashboard“ in der Seitenleiste.', 'Die Kacheln zeigen aktuelle Zahlen aus deinen Modulen.', 'Ein Klick auf eine Kachel führt dich zur Detailseite.'],
  },
  {
    id: 'crm', group: 'kunden', title: 'CRM: Kunden und Kontakte', icon: 'ti-users', route: '/crm', role: 'Mitglied',
    summary: 'Hier verwaltest du Kontakte, Firmen und deren Verlauf.',
    steps: ['Öffne CRM und klicke auf „Neu“, um einen Kontakt anzulegen.', 'Trage Name, E-Mail, Telefon und Firma ein.', 'Im Kontakt siehst du Notizen und den Verlauf. Anfragen aus Formularen und Kampagnen landen automatisch hier.', 'Mit der Suche findest du Kontakte nach Name oder E-Mail.'],
    tips: ['Lege Kunden immer im CRM an, bevor du ein Angebot oder eine Rechnung schreibst. Dann sind alle Daten verknüpft.'],
  },
  {
    id: 'support', group: 'kunden', title: 'Support: Tickets', icon: 'ti-headset', route: '/support', role: 'Mitglied',
    summary: 'Kundenanfragen als Tickets bearbeiten, damit nichts untergeht.',
    steps: ['Öffne Support und lege ein Ticket an oder öffne ein eingegangenes.', 'Vergib Status und Priorität.', 'Antworte im Ticket und schließe es, wenn es erledigt ist.'],
  },
  {
    id: 'finanzen', group: 'kunden', title: 'Finanzen: Rechnungen und Zahlungen', icon: 'ti-receipt', route: '/finance', role: 'Admin',
    summary: 'Rechnungen schreiben, verschicken und Zahlungen verfolgen.',
    steps: ['Öffne Finanzen und lege eine neue Rechnung an.', 'Wähle den Kunden und füge Positionen hinzu (oder nimm Einträge aus „Leistungen“).', 'Speichere und versende die Rechnung. Der Kunde erhält einen Link zur Bezahlseite.', 'Bezahlte Rechnungen werden automatisch als bezahlt markiert.'],
    tips: ['Das Aussehen der Rechnung stellst du unter „Rechnungs-Design“ ein.'],
    faq: [{ q: 'Wo pflege ich meine Preise?', a: 'Unter „Leistungen“ (Finanzen, Reiter Katalog). Von dort übernimmst du Positionen in Rechnungen und Angebote.' }],
  },
  {
    id: 'angebote', group: 'kunden', title: 'Angebote', icon: 'ti-file-description', route: '/finance?tab=quotes', role: 'Admin',
    summary: 'Angebote schreiben, per Link verschicken und vom Kunden online annehmen lassen.',
    steps: ['Öffne Finanzen, Reiter „Angebote“, und klicke auf „Neues Angebot“.', 'Wähle den Kunden, füge Positionen hinzu und setze die Gültigkeit.', 'Verschicke das Angebot. Der Kunde bekommt einen persönlichen Link (/angebot/…) zum Ansehen und Annehmen.', 'Nach der Annahme kannst du das Angebot in eine Rechnung umwandeln.'],
    tips: ['In einer Kampagne kannst du einschalten, dass bei einer Anfrage automatisch ein Angebots-Entwurf entsteht.'],
  },
  {
    id: 'vertraege', group: 'kunden', title: 'Verträge', icon: 'ti-file-text', route: '/contracts', role: 'Admin',
    summary: 'Verträge mit Laufzeiten ablegen und im Blick behalten.',
    steps: ['Öffne Verträge und lege einen neuen Vertrag an.', 'Trage Partner, Beginn, Laufzeit und Kündigungsfrist ein.', 'Behalte Ablaufdaten in der Liste im Auge.'],
  },
  {
    id: 'shop', group: 'kunden', title: 'Shop', icon: 'ti-shopping-cart', route: '/shop-admin', role: 'Admin',
    summary: 'Produkte verwalten und Bestellungen bearbeiten.',
    steps: ['Öffne Shop und lege Produkte mit Preis und Beschreibung an.', 'Bestellungen erscheinen in der Liste. Setze den Status, sobald du versendet hast.'],
  },
  {
    id: 'portal', group: 'kunden', title: 'Kundenportal', icon: 'ti-door-enter', route: '/portal',
    summary: 'Deine Kunden sehen unter /portal ihre eigenen Angebote und Rechnungen.',
    steps: ['Gib deinen Kunden die Portal-Adresse.', 'Sie melden sich mit ihrer E-Mail an und sehen nur ihre eigenen Unterlagen.'],
  },

  // ── Organisation ──
  {
    id: 'projekte', group: 'orga', title: 'Projekte und Aufgaben', icon: 'ti-checklist', route: '/projects', role: 'Mitglied',
    summary: 'Aufgaben und Meilensteine planen und abarbeiten.',
    steps: ['Öffne Projekte und lege ein Projekt an.', 'Füge Aufgaben mit Beginn, Ende und Verantwortlichem hinzu.', 'Setze Aufgaben auf erledigt, sobald sie fertig sind.'],
  },
  {
    id: 'planer', group: 'orga', title: 'Planer (Gantt)', icon: 'ti-timeline', route: '/projects', role: 'Mitglied',
    summary: 'Die Zeitleiste zu deinen Projekten: Balken, Abhängigkeiten, Fortschritt und kritischer Pfad, wie bei MS Project.',
    steps: [
      'Öffne Projekte und wechsle zur Ansicht „Planer“.',
      'Ziehe einen Balken mit der Maus, um den Vorgang zu verschieben. An den Rändern änderst du die Dauer, am unteren Rand den Fortschritt. Ein Doppelklick öffnet den Vorgang zum Bearbeiten.',
      'Abhängigkeit setzen: Ziehe vom Punkt rechts am Balken auf einen anderen Vorgang. Ein Vorgang kann einen Vorgänger haben. Der Nachfolger beginnt frühestens am Tag nach dem Ende des Vorgängers und wird automatisch nach hinten geschoben.',
      'Der Fortschritt wird in Prozent geführt. Der Gesamtfortschritt des Projekts wird nach Dauer gewichtet berechnet.',
      'Mit dem Haken „Kritischer Pfad“ siehst du die Vorgänge ohne Puffer. Verzögern sie sich, verschiebt sich das Projektende.',
    ],
    tips: ['Kreise in den Abhängigkeiten (A nach B nach A) werden abgelehnt.', 'Meilensteine haben keine Dauer und markieren Zwischenziele.'],
  },
  {
    id: 'termine', group: 'orga', title: 'Termine und Kalender', icon: 'ti-calendar-event', route: '/termine', role: 'Mitglied',
    summary: 'Eigener Kalender mit Terminarten und Online-Buchung. Es wird kein Google-Kalender mehr benötigt.',
    steps: ['Öffne Termine. Der Kalender zeigt Monat, Woche und Tag.', 'Lege unter „Terminarten“ fest, was gebucht werden kann (Dauer, Name).', 'Unter „Einstellungen“ legst du Zeiten und Erinnerungen fest.', 'Termine kannst du als iCal-Abo in deine Handy-Kalender übernehmen.'],
    tips: ['Vor einem Termin erscheint eine Erinnerung als Hinweisfenster.'],
  },
  {
    id: 'hr', group: 'orga', title: 'HR und Stellen', icon: 'ti-id-badge', route: '/hr', role: 'Admin',
    summary: 'Mitarbeiter, Urlaub und offene Stellen verwalten.',
    steps: ['Öffne HR und lege Mitarbeiter an.', 'Unter Stellen veröffentlichst du offene Positionen. Bewerbungen erscheinen in der Liste.'],
  },
  {
    id: 'formulare', group: 'orga', title: 'Formulare', icon: 'ti-forms', route: '/forms', role: 'Mitglied',
    summary: 'Eigene Formulare bauen, einbetten und Antworten sammeln.',
    steps: ['Öffne Formulare und erstelle ein neues Formular.', 'Füge Felder hinzu und speichere.', 'Binde das Formular auf deiner Website ein oder teile den Link. Antworten erscheinen in der Liste und im CRM.'],
  },
  {
    id: 'analytics', group: 'orga', title: 'Analytics', icon: 'ti-chart-bar', route: '/analytics', role: 'Admin',
    summary: 'Zahlen zu Besuchern und Umsatz.',
    steps: ['Öffne Analytics und wähle den Zeitraum.', 'Vergleiche die Kennzahlen mit früheren Zeiträumen.'],
  },

  // ── Marketing & Web ──
  {
    id: 'marketing', group: 'marketing', title: 'Marketing: Kampagnen und Lead-Seiten', icon: 'ti-speakerphone', route: '/marketing', role: 'Mitglied',
    summary: 'Kampagnen planen und Lead-Seiten (Landingpages) veröffentlichen, die Anfragen einsammeln.',
    steps: ['Öffne Marketing und lege eine Kampagne an.', 'Erstelle eine Lead-Seite (/lead/…) mit Text, Vertrauenspunkten und Formular.', 'Veröffentliche sie. Anfragen landen im CRM.', 'Entwürfe werden automatisch zwischengespeichert.'],
    tips: ['Schalte unter Einstellungen den Bot-Schutz ein, wenn du viel Spam bekommst.'],
  },
  {
    id: 'bot-schutz', group: 'marketing', title: 'Bot-Schutz (Cloudflare Turnstile)', icon: 'ti-shield-lock', route: '/settings', role: 'Admin',
    summary: 'Schützt Formulare, Kampagnen und Konto-Anlegen auf deiner Website vor automatischem Spam. Besucher merken in der Regel nichts davon.',
    steps: ['Öffne Einstellungen und den Reiter „Bot-Schutz“.', 'Schalte den Schutz für die gewünschten Bereiche ein.', 'Bei einem Fehlschlag sieht der Besucher eine freundliche Meldung und kann es erneut versuchen.'],
  },
  {
    id: 'newsletter', group: 'marketing', title: 'Newsletter', icon: 'ti-mail', route: '/newsletter', role: 'Admin',
    summary: 'Abonnenten sammeln und Rundmails verschicken.',
    steps: ['Öffne Newsletter und lege eine Ausgabe an.', 'Schreibe den Text und sende erst eine Probe an dich selbst.', 'Versende an die Abonnenten. Abmelden ist für Empfänger über einen Link möglich.'],
  },
  {
    id: 'blog', group: 'marketing', title: 'Blog verwalten', icon: 'ti-news', route: '/blog', role: 'Admin',
    summary: 'Beiträge schreiben, mit Tags versehen und Kommentare moderieren.',
    steps: ['Öffne Blog und klicke auf „Neuer Beitrag“.', 'Titel, Text, Tags und Autor eintragen. Der Autor ist für Leser sichtbar.', 'Veröffentlichen. Besucher können nach Tags filtern (/blog?tag=…).', 'Im Reiter „Kommentare“ schaltest du Kommentare ein oder aus und moderierst sie.'],
    tips: ['Kommentieren dürfen nur Besucher mit Konto (Registrierung mit Mail-Bestätigung). Du kannst die Funktion jederzeit abschalten.'],
  },
  {
    id: 'seo', group: 'marketing', title: 'SEO / GEO', icon: 'ti-chart-line', route: '/seo', role: 'Admin',
    summary: 'Hilft, in Suchmaschinen und KI-Antworten besser gefunden zu werden.',
    steps: ['Öffne SEO / GEO und prüfe die Hinweise zu Titel, Beschreibung und Struktur.', 'Setze die Empfehlungen auf deinen Seiten um.'],
  },
  {
    id: 'leistungen', group: 'marketing', title: 'Leistungen (Katalog)', icon: 'ti-list-details', route: '/finance?tab=catalog', role: 'Admin',
    summary: 'Deine Leistungen und Preise einmal pflegen und überall wiederverwenden.',
    steps: ['Öffne „Leistungen“ in der Seitenleiste.', 'Lege Leistungen mit Name, Beschreibung und Preis an.', 'In Rechnungen und Angeboten wählst du sie aus.'],
  },

  // ── Branchen-Pakete ──
  {
    id: 'branchen', group: 'branche', title: 'Branchen-Pakete aktivieren', icon: 'ti-puzzle', route: '/store', role: 'Inhaber',
    summary: 'Zusätzliche Module für deine Branche: Automotive, Einzelhandel, Gastronomie, Handwerk, Immobilien, Friseur & Beauty, Ferienwohnungen, Fitness & Sport, Bildung & Kurse, Veranstaltungen, Reinigung & Gebäudeservice, Verein sowie Taxi & Fahrdienst.',
    steps: ['Öffne den Modul-Store.', 'Schalte das passende Branchen-Paket ein. Es erscheint in der Seitenleiste unter „BRANCHE“.', 'Du kannst auswählen, welche Pakete auf deiner Startseite angezeigt werden.'],
  },
  {
    id: 'fewo', group: 'branche', title: 'Ferienwohnungen', icon: 'ti-home-2', route: '/fewo', role: 'Admin',
    summary: 'Wohnungen, Buchungen und Belegung verwalten, auch mit Abgleich über iCal (zum Beispiel Booking.com).',
    steps: ['Öffne Ferienwohnungen und lege deine Wohnungen an.', 'Trage Buchungen ein oder lasse sie über einen iCal-Link abgleichen.', 'Im Belegungsplan siehst du freie und gebuchte Tage.'],
  },
  {
    id: 'automotive', group: 'branche', title: 'Automotive', icon: 'ti-car', route: '/automotive', role: 'Admin',
    summary: 'Fahrzeuge und Werkstattaufträge verwalten.', steps: ['Öffne Automotive.', 'Lege Fahrzeuge an und verknüpfe sie mit Kunden und Aufträgen.'],
  },
  {
    id: 'retail', group: 'branche', title: 'Einzelhandel', icon: 'ti-shopping-bag', route: '/retail', role: 'Admin',
    summary: 'Artikel und Bestand für den Laden.', steps: ['Öffne Einzelhandel.', 'Pflege Artikel und kontrolliere den Bestand.'],
  },
  {
    id: 'gastro', group: 'branche', title: 'Gastronomie', icon: 'ti-tools-kitchen-2', route: '/gastro', role: 'Admin',
    summary: 'Speisekarte, Reservierungen und Tische.', steps: ['Öffne Gastronomie.', 'Pflege die Speisekarte und nimm Reservierungen an.'],
  },
  {
    id: 'handwerk', group: 'branche', title: 'Handwerk', icon: 'ti-hammer', route: '/handwerk', role: 'Admin',
    summary: 'Aufträge, Baustellen und Material.', steps: ['Öffne Handwerk.', 'Lege Aufträge an und halte den Stand fest.'],
  },
  {
    id: 'immobilien', group: 'branche', title: 'Immobilien', icon: 'ti-building', route: '/immobilien', role: 'Admin',
    summary: 'Objekte und Interessenten.', steps: ['Öffne Immobilien.', 'Lege Objekte an und verknüpfe Interessenten.'],
  },

  // ── Nexora ──
  {
    id: 'nexora-ueberblick', group: 'nexora', title: 'Was ist Nexora?', icon: 'ti-world', route: '/website', role: 'Admin',
    summary: 'Nexora ist die Website-Engine: Deine öffentliche Website holt Seiten, Blog, Kontaktformular und Support-Inhalte aus Plexora. Du pflegst alles an einer Stelle.',
    steps: ['Öffne „Website“ in der Seitenleiste.', 'Lege Seiten an, bearbeite Texte und veröffentliche.', 'Die Änderungen sind direkt auf deiner Website sichtbar.'],
  },
  {
    id: 'nexora-seiten', group: 'nexora', title: 'Seiten mit HTML anlegen', icon: 'ti-code', route: '/website', role: 'Admin',
    summary: 'Eine Seite kann Text oder ein komplettes HTML-Dokument sein.',
    steps: ['Lege im Website-Editor eine neue Seite an.', 'Füge deinen Text oder dein HTML ein.', 'Ein vollständiges HTML-Dokument wird 1:1 und isoliert angezeigt: Es hat volle Breite, und sein CSS beeinflusst den Rest der Website nicht.'],
    tips: ['Skripte in einem eingebetteten HTML-Dokument werden aus Sicherheitsgründen nicht ausgeführt.'],
  },
  {
    id: 'nexora-blog', group: 'nexora', title: 'Blog und Kommentare auf der Website', icon: 'ti-messages',
    summary: 'Besucher lesen Beiträge, filtern nach Tags und können kommentieren, wenn du das einschaltest.',
    steps: ['Besucher klicken auf einen Tag und sehen alle Beiträge dazu.', 'Zum Kommentieren legt ein Besucher ein Konto an und bestätigt seine E-Mail.', 'Du kannst Kommentare im Blog-Bereich in Plexora jederzeit abschalten oder löschen.'],
    faq: [{ q: 'Können Besucher ihr Konto löschen?', a: 'Ja. Besucher können ihr Konto selbst löschen und ein vergessenes Passwort zurücksetzen.' }],
  },
  {
    id: 'nexora-startseite', group: 'nexora', title: 'Startseite und Design', icon: 'ti-palette', route: '/settings', role: 'Admin',
    summary: 'Farben der Startseite (zum Beispiel Hintergrund und Schrift) und die Auswahl der Branchen-Pakete stellst du in den Einstellungen ein.',
    steps: ['Öffne Einstellungen, Reiter „Startseite (Design)“.', 'Wähle Hintergrund und Schriftfarbe.', 'Wähle, welche Branchen-Pakete auf der Startseite erscheinen.'],
  },

  // ── System & Konto ──
  {
    id: 'einstellungen', group: 'system', title: 'Einstellungen', icon: 'ti-settings', route: '/settings', role: 'Admin',
    summary: 'Zentrale Einstellungen in Reitern: Firma, Video, Startseite (Design), Bot-Schutz, E-Mail-Vorlagen, Team, Testimonials und mehr.',
    steps: ['Öffne Einstellungen.', 'Wechsle oben zwischen den Reitern.', 'Speichere jede Änderung mit dem Speichern-Knopf des Reiters.'],
  },
  {
    id: 'mailvorlagen', group: 'system', title: 'E-Mail-Vorlagen', icon: 'ti-template', route: '/settings', role: 'Admin',
    summary: 'Texte der Mails, die Plexora für dich verschickt, anpassen.',
    steps: ['Öffne Einstellungen, Reiter „E-Mail-Vorlagen“.', 'Wähle die Vorlage und passe Betreff und Text an.'],
  },
  {
    id: 'rechnungsdesign', group: 'system', title: 'Rechnungs-Design', icon: 'ti-file-invoice', route: '/rechnungs-design', role: 'Admin',
    summary: 'Logo, Farben und Fußzeile deiner Rechnungen.',
    steps: ['Öffne Rechnungs-Design.', 'Lade dein Logo hoch und wähle Farben.', 'Die Vorschau zeigt, wie die Rechnung aussieht.'],
  },
  {
    id: 'store', group: 'system', title: 'Modul-Store', icon: 'ti-building-store', route: '/store', role: 'Inhaber',
    summary: 'Hier schaltest du Module und Branchen-Pakete ein und aus.',
    steps: ['Öffne den Modul-Store.', 'Schalte ein Modul ein oder aus. Gesperrte Module gehören zu einem höheren Tarif.'],
  },
  {
    id: 'eigene-module', group: 'system', title: 'Eigene Module einbinden', icon: 'ti-puzzle', route: '/store', role: 'Inhaber',
    summary: 'Kleine eigene Module (zum Beispiel Listen oder Checklisten) kannst du als Zero-Deploy-Plugin einbinden. Größere Module werden in Plexora eingebaut.',
    steps: [
      'Schreibe das Modul als .mjs-Datei nach der Vorlage docs/vorlagen/plugin-vorlage.mjs und lege sie auf eine https-Adresse, der du vertraust.',
      'Öffne den Modul-Store, Reiter „Branchen-Pakete“, und klicke auf „Neues Modul registrieren“ (nur Plattform-Admins).',
      'Trage Key, Name, Icon, Preis, Beschreibung und die Adresse der Datei ein. Danach erscheint es in der Seitenleiste unter „BRANCHE“.',
    ],
    tips: ['Das Modul darf nur über die vorgegebenen Funktionen Daten lesen und speichern (höchstens 200 KB) und soll die Farben des Themes nutzen.', 'Plugins laufen mit deiner Sitzung: nur Code aus eigener, vertrauenswürdiger Quelle eintragen.'],
  },
  {
    id: 'team', group: 'system', title: 'Team verwalten', icon: 'ti-users', route: '/team', role: 'Inhaber',
    summary: 'Personen einladen, Rollen ändern und sehen, wer was darf.',
    steps: ['Öffne Team und klicke auf „Mitglied einladen“.', 'Gib die E-Mail ein und wähle die Rolle. Die Person bekommt einen Einladungslink.', 'Später kannst du die Rolle in der Liste ändern.'],
  },
  {
    id: 'profil', group: 'system', title: 'Profil und Anmeldung', icon: 'ti-user-circle', route: '/profile',
    summary: 'Name, Bild und Passwort ändern. Die Anmeldung geht mit E-Mail und Passwort oder mit Google.',
    steps: ['Klicke oben rechts auf deinen Namen und dann auf „Profil“.', 'Ändere Angaben und Profilbild.', 'Nach längerer Inaktivität wirst du aus Sicherheitsgründen automatisch abgemeldet.'],
    faq: [{ q: 'Ich habe mein Passwort vergessen.', a: 'Auf der Anmeldeseite „Passwort vergessen“ wählen. Du bekommst eine Mail mit einem Link.' }],
  },
]

// Branchen-Baukasten: je Paket ein Thema, erzeugt aus der Paketbeschreibung (shared/branchKit.ts)
for (const p of KIT_PACKAGES) HELP_TOPICS.push({
  id: `kit-${p.key}`, group: 'branche', title: p.name, icon: p.tablerIcon, route: KIT_ROUTE(p.key), role: 'Admin', summary: p.desc,
  steps: ['Schalte das Paket im Modul-Store ein. Es erscheint in der Seitenleiste unter „BRANCHE“.', ...p.steps],
  tips: ['Das Paket führt Listen und Stände. Es bucht kein Geld und stellt keine Rechnungen aus; Rechnungen schreibst du unter Finanzen.', 'Gespeichert werden nur die Felder der Listen. Gib keine Gesundheits- oder sonstigen besonders sensiblen Daten ein.'],
})

/** Kurze Erklärungen für das Fragezeichen-Symbol (HelpTip) an einzelnen Bedienelementen */
export const HELP_TIPS: Record<string, string> = {
  rollen: 'Inhaber darf alles, Admin verwaltet Geschäftsbereiche, Mitglied arbeitet im Tagesgeschäft. Die Rollen werden zurzeit nur beobachtet, noch nicht durchgesetzt.',
  gantt: 'Balken ziehen verschiebt den Vorgang, die Ränder ändern Beginn und Ende. Nachfolger werden automatisch nach hinten geschoben.',
  kritisch: 'Kritischer Pfad: Vorgänge ohne Puffer. Verzögert sich einer davon, verschiebt sich das Projektende.',
  botschutz: 'Cloudflare Turnstile prüft unauffällig, ob ein Mensch das Formular abschickt. Ohne Schutz können Roboter Spam senden.',
  angebot: 'Der Kunde bekommt einen persönlichen Link, sieht das Angebot und kann es online annehmen.',
  kommentare: 'Kommentieren dürfen nur Besucher mit bestätigtem Konto. Du kannst die Funktion jederzeit abschalten.',
  ical: 'Mit dem iCal-Link gleichst du Buchungen mit anderen Portalen ab, zum Beispiel Booking.com.',
  modulstore: 'Gesperrte Module gehören zu einem höheren Tarif. Ausgeschaltete Module behalten ihre Daten.',
  entwurf: 'Entwürfe werden automatisch zwischengespeichert. Sie erscheinen erst nach dem Veröffentlichen öffentlich.',
  tags: 'Besucher können auf einen Tag klicken und sehen alle Beiträge dazu.',
}

export interface TourStep { title: string; text: string; icon: string }
/** Die Einführung für neue Benutzer: kurz, in der Reihenfolge, in der man Plexora kennenlernt */
export const TOUR_STEPS: TourStep[] = [
  { title: 'Willkommen bei Plexora', icon: 'ti-sparkles', text: 'Plexora ist dein Büro im Browser: Kunden, Rechnungen, Projekte, Termine, Marketing und deine Website an einem Ort. Diese kurze Einführung zeigt dir die wichtigsten Stellen.' },
  { title: 'Die Seitenleiste', icon: 'ti-layout-sidebar', text: 'Links wählst du den Bereich: Übersicht, Module, Branche und System. Was du dort siehst, hängt von deinem Tarif, deinen eingeschalteten Modulen und deiner Rolle ab.' },
  { title: 'Schnell anlegen mit „Neu“', icon: 'ti-plus', text: 'Oben rechts legt „Neu“ Kunden, Angebote, Aufgaben und Termine in einem Schritt an. So beginnst du schnell, ohne erst durch Menüs zu suchen.' },
  { title: 'Kunden, Angebote, Rechnungen', icon: 'ti-receipt', text: 'Lege Kunden im CRM an, schreibe Angebote und Rechnungen unter Finanzen und lass Kunden online annehmen und bezahlen.' },
  { title: 'Projekte und Termine', icon: 'ti-timeline', text: 'Plane Projekte im Planer mit Balken, Abhängigkeiten und Fortschritt. Termine und Online-Buchung verwaltest du im eigenen Kalender.' },
  { title: 'Marketing und Website', icon: 'ti-world', text: 'Mit Lead-Seiten, Newsletter und Blog gewinnst du Kunden. Nexora, die Website-Engine, zeigt deine Inhalte auf deiner öffentlichen Website.' },
  { title: 'Hilfe ist immer da', icon: 'ti-help-circle', text: 'Das Fragezeichen oben rechts öffnet die Hilfe zur aktuellen Seite. Kleine Fragezeichen neben Einstellungen erklären Details. Diese Einführung findest du in der Hilfe jederzeit wieder.' },
]

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss')

/** Volltextsuche über Titel, Zusammenfassung, Schritte, Tipps und Fragen. Treffer im Titel zählen mehr. */
export function searchHelp(query: string, topics: HelpTopic[] = HELP_TOPICS): HelpTopic[] {
  const words = norm(query).split(/\s+/).filter(Boolean)
  if (!words.length) return topics
  const scored: Array<{ t: HelpTopic; score: number }> = []
  for (const t of topics) {
    const title = norm(t.title)
    const body = norm([t.summary, ...t.steps, ...(t.tips || []), ...(t.faq || []).flatMap(f => [f.q, f.a])].join(' '))
    let score = 0, all = true
    for (const w of words) {
      if (title.includes(w)) score += 5
      else if (body.includes(w)) score += 1
      else { all = false; break }
    }
    if (all) scored.push({ t, score })
  }
  return scored.sort((a, b) => b.score - a.score).map(s => s.t)
}

/** Passendes Thema zu einer Plexora-Seite (für "Hilfe zu dieser Seite"). Längster passender Pfad gewinnt. */
export function topicForPath(path: string, topics: HelpTopic[] = HELP_TOPICS): HelpTopic | null {
  const p = path.split('?')[0]
  let best: HelpTopic | null = null, bestLen = -1
  for (const t of topics) {
    if (!t.route || t.group === 'start') continue
    const r = t.route.split('?')[0]
    if ((p === r || p.startsWith(r + '/')) && r.length > bestLen) { best = t; bestLen = r.length }
  }
  return best
}
