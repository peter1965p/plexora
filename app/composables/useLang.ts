const KEY = 'plexora-lang'
const EVT = 'plexora-lang-change'

type Lang = 'de' | 'en'

const _lang = ref<Lang>('de')

export function useLang() {
  onMounted(() => {
    const saved = localStorage.getItem(KEY) as Lang | null
    if (saved === 'de' || saved === 'en') _lang.value = saved

    const handler = (e: Event) => { _lang.value = (e as CustomEvent<Lang>).detail }
    window.addEventListener(EVT, handler)
    onUnmounted(() => window.removeEventListener(EVT, handler))
  })

  function setLang(l: Lang) {
    _lang.value = l
    localStorage.setItem(KEY, l)
    window.dispatchEvent(new CustomEvent<Lang>(EVT, { detail: l }))
  }

  const t = computed(() => translations[_lang.value])

  return { lang: _lang, setLang, t }
}

const translations = {
  de: {
    // ── Sidebar ────────────────────────────────────────────────────────────────
    navOverview: 'Übersicht',
    navModules:  'Module',
    navSystem:   'System',
    settings:    'Einstellungen',
    moduleNames: {
      crm: 'CRM', projects: 'Projekte', contracts: 'Verträge', finance: 'Finanzen',
      hr: 'HR', support: 'Support', analytics: 'Analytics', shop: 'Shop',
      pagebuilder: 'Pagebuilder', forms: 'Formulare', marketing: 'Marketing', nexora: 'Website',
      termine: 'Termine',
    } as Record<string, string>,

    // ── Topbar titles ──────────────────────────────────────────────────────────
    pageTitles: {
      '/dashboard':  'Dashboard', '/crm':        'CRM',        '/projects':   'Projekte',
      '/lead':       'Lead-Landingpage', '/finance': 'Finanzen', '/contracts':  'Verträge',
      '/hr':         'HR',         '/support':    'Support',    '/marketing':  'Marketing',
      '/shop-admin': 'Shop',       '/pagebuilder':'Pagebuilder','/forms':      'Formulare',
      '/analytics':  'Analytics',  '/settings':   'Einstellungen', '/website': 'Website',
      '/blog':       'Blog',      '/automotive': 'Automotive', '/termine':    'Termine',
    } as Record<string, string>,

    // ── Topbar user menu ───────────────────────────────────────────────────────
    menuSettings: 'Einstellungen',
    menuLogout:   'Abmelden',

    // ── Quick actions ──────────────────────────────────────────────────────────
    quick: [
      { label: 'Neuer Kontakt',     icon: 'ti-user-plus',     path: '/crm',       query: 'new=contact' },
      { label: 'Neuer Deal',        icon: 'ti-briefcase',     path: '/crm',       query: 'new=deal'    },
      { label: 'Neue Rechnung',     icon: 'ti-receipt',       path: '/finance',   query: 'new=1'       },
      { label: 'Neues Projekt',     icon: 'ti-layout-kanban', path: '/projects',  query: 'new=1'       },
      { label: 'Neues Ticket',      icon: 'ti-headset',       path: '/support',   query: 'new=1'       },
      { label: 'Neuer Mitarbeiter', icon: 'ti-id-badge',      path: '/hr',        query: 'new=1'       },
      { label: 'Neue Kampagne',     icon: 'ti-speakerphone',  path: '/marketing', query: 'new=1'       },
    ],

    // ── Common ─────────────────────────────────────────────────────────────────
    common: {
      new: 'Neu', save: 'Speichern', cancel: 'Abbrechen', edit: 'Bearbeiten', delete: 'Löschen',
      name: 'Name', status: 'Status', email: 'E-Mail', phone: 'Telefon', website: 'Website',
      notes: 'Notizen', industry: 'Branche', street: 'Straße & Nr.', zip: 'PLZ',
      city: 'Stadt', country: 'Land', company: 'Unternehmen', title: 'Titel',
      description: 'Beschreibung', type: 'Typ', date: 'Datum', amount: 'Betrag',
      from: 'Von', to: 'Bis', active: 'Aktiv', inactive: 'Inaktiv',
      open: 'Offen', closed: 'Geschlossen', loading: 'Lädt...', refresh: 'Aktualisieren',
      copy: 'Kopieren', back: 'Zurück', preview: 'Vorschau', upload: 'Hochladen',
      client: 'Kunde', value: 'Wert', stage: 'Phase', low: 'Niedrig', medium: 'Mittel',
      high: 'Hoch', critical: 'Kritisch', monthly: 'Monatlich', annual: 'Jährlich',
      oneTime: 'Einmalig', other: 'Sonstiges', noResults: 'Keine Ergebnisse',
      assignee: 'Zuständig', priority: 'Priorität', actions: 'Aktionen',
    },

    // ── Dashboard ──────────────────────────────────────────────────────────────
    dash: {
      weightedPipeline: 'Pipeline Gewichtet', activeDeals: 'Aktive Deals',
      openTickets: 'Offene Tickets', employees: 'Mitarbeiter',
      dealsActive: 'Deals aktiv', won: 'gewonnen', total: 'gesamt', active: 'aktiv',
      financeOverview: 'Finanzen — Übersicht', contacts: 'Kontakte',
      pipelineDeals: 'Pipeline — Deals', supportTickets: 'Support — Offene Tickets',
      demoUsage: 'Demo-Nutzung', apiCalls: 'API-Aufrufe', today: 'Heute',
      thisMonth: 'Diesen Monat', last7days: 'Letzte 7 Tage',
      revenue: 'Einnahmen', expenses: 'Ausgaben', profit: 'Gewinn',
      invoicePaid: 'Bezahlt', invoicePending: 'Ausstehend', invoiceOverdue: 'Überfällig',
      viewAll: 'Alle ansehen', viewAllDeals: 'Alle Deals ansehen', viewAllTickets: 'Alle Tickets',
      noDeals: 'Keine Deals vorhanden', noTickets: 'Keine Tickets', noContacts: 'Keine Kontakte',
      cancelSub: 'Abonnement kündigen', totalLabel: 'Gesamt', calls: 'Aufrufe',
      adminOnly: 'nur sichtbar für Admin',
      colCompany: 'Unternehmen', colValue: 'Wert', colStage: 'Phase',
      colProbability: 'Wahrscheinlichkeit', colStatus: 'Status',
      colTitle: 'Titel', colClient: 'Kunde', colPriority: 'Priorität',
    },

    // ── CRM ────────────────────────────────────────────────────────────────────
    crm: {
      totalContacts: 'Kontakte gesamt', totalDeals: 'Deals gesamt',
      pipelineValue: 'Pipeline Wert', winRate: 'Win Rate',
      customers: 'Kunden', won: 'gewonnen', weighted: 'gewichtet', of: 'von',
      contacts: 'Kontakte', deals: 'Deals', companies: 'Unternehmen',
      noContacts: 'Keine Kontakte', noDeals: 'Keine Deals', noCompanies: 'Keine Unternehmen',
      makeCustomer: 'Zu Kunde machen',
      editContact: 'Kontakt bearbeiten', newContact: 'Neuer Kontakt', createContact: 'Kontakt anlegen',
      editDeal: 'Deal bearbeiten', newDeal: 'Neuer Deal', createDeal: 'Deal anlegen',
      editCompany: 'Unternehmen bearbeiten', newCompany: 'Neues Unternehmen', createCompany: 'Unternehmen anlegen',
      firstName: 'Vorname', lastName: 'Nachname',
      companyDb: 'Unternehmen (Datenbank)', noCompanyLinked: '— kein Unternehmen verknüpft —',
      companyFreetext: 'Firma (Freitext)',
      leadSourceLabel: 'Lead-Quelle', leadStatusLabel: 'Lead-Status',
      srcManual: 'Manuell', srcCsv: 'CSV/Excel-Import', srcLandingpage: 'Landingpage',
      srcReferral: 'Empfehlung', srcOther: 'Sonstiges',
      lsNew: 'Neu', lsContacted: 'Kontaktiert', lsQualified: 'Qualifiziert', lsUnqualified: 'Unqualifiziert',
      optLead: 'Lead', optCustomer: 'Kunde', optChurned: 'Verloren',
      dealProb: 'Wahrscheinlichkeit %',
      dsInProgress: 'In Arbeit', dsNegotiation: 'Verhandlung', dsWon: 'Gewonnen', dsLost: 'Verloren',
      internalNotes: 'Interne Notizen...',
    },

    // ── Finance ────────────────────────────────────────────────────────────────
    finance: {
      paid: 'Bezahlt', pending: 'Ausstehend', overdue: 'Überfällig', total: 'gesamt',
      invoices: 'Rechnungen', cashbook: 'Kassenbuch', bankImport: 'Bank-Import', tax: 'Steuer & Export',
      number: 'Nummer', client: 'Kunde', amount: 'Betrag', dueDate: 'Fälligkeit',
      mailSent: 'Mail gesendet', archived: 'GoBD-archiviert',
      noInvoices: 'Keine Rechnungen', newInvoice: 'Neue Rechnung',
      downloadPdf: 'PDF herunterladen', downloadXRechnung: 'XRechnung herunterladen',
      sendMail: 'Per Mail senden', archiveGobd: 'GoBD-konform archivieren (sperrt Bearbeitung)',
      dunning1: '1. Mahnung senden', dunning2: '2. Mahnung senden', dunning3: '3. Mahnung senden',
      booking: 'Buchung', description: 'Beschreibung', balance: 'Saldo',
      noCashbook: 'Keine Kassenbucheinträge',
      bankImportTitle: 'Bank-CSV importieren', importBtn: 'Importieren',
      importedBookings: 'Importierte Buchungen', assignInvoice: 'Rechnung zuordnen',
      noBookings: 'Noch keine Buchungen importiert', assigned: '✓ Zugeordnet', assign: '✓ Zuordnen',
      vatReport: 'Umsatzsteuer-Voranmeldung (UStVA)', quarterly: 'Quartalsweise',
      period: 'Zeitraum', netKz41: 'Netto (Kz. 41)', vat19Kz81: 'USt 19% (Kz. 81)', gross: 'Brutto',
      totalYear: 'Gesamt {year}', elsterOpen: 'Mein ELSTER öffnen',
      euRTitle: 'EÜR — Einnahmen-Überschuss-Rechnung {year}',
      businessRevenue: 'Betriebseinnahmen', businessExpenses: 'Betriebsausgaben',
      profitBeforeTax: 'Gewinn vor Steuer', exports: 'Exporte',
      cashbookEntry: 'Kassenbuch-Eintrag', income: 'Einnahme', expense: 'Ausgabe', book: 'Buchen',
      clientEmail: 'Kunden-E-Mail', saveAndMail: 'Speichern + Mail',
    },

    // ── Projects ───────────────────────────────────────────────────────────────
    projects: {
      active: 'aktiv', completed: 'Abgeschlossen', thisMonth: 'diesen Monat',
      overdue: 'In Verzug', actNow: 'sofort handeln', onTrack: 'alles im Plan',
      openTasks: 'Offene Tasks', total: 'gesamt',
      listView: 'Liste', ganttView: 'Planer',
      allStatus: 'Alle Status', statusActive: 'Aktiv', statusReview: 'Review',
      statusCompleted: 'Abgeschlossen', statusOverdue: 'Verzug',
      newProject: 'Neues Projekt', editProject: 'Projekt bearbeiten', createProject: 'Projekt anlegen',
      noTasks: 'Keine Tasks', task: 'Task', subtask: 'Subtask', comment: 'Kommentar', time: 'Zeit',
      ganttTitle: 'Projektplaner — Gantt',
      ganttEmpty: 'Keine Projekte mit Deadline für Gantt-Ansicht.',
      projectTask: 'Projekt / Task',
      projectName: 'Projektname', client: 'Mandant', noClient: '— kein Mandant —',
      team: 'Team', deadline: 'Deadline', priority: 'Priorität', progress: 'Fortschritt',
      newTask: 'Neuer Task', taskTitle: 'Titel', assignee: 'Zuständig', start: 'Start',
      estimatedHours: 'Geschätzte Stunden', createTask: 'Task anlegen',
      addSubtask: 'Subtask hinzufügen', bookTime: 'Zeit buchen', hours: 'Stunden',
      colTasks: 'TASKS',
    },

    // ── HR ─────────────────────────────────────────────────────────────────────
    hr: {
      totalEmployees: 'Mitarbeiter gesamt', active: 'aktiv',
      onLeave: 'Im Urlaub', current: 'aktuell',
      activeCampaigns: 'Kampagnen aktiv', applications: 'Bewerbungen',
      offboarding: 'Offboarding', inProgress: 'in Bearbeitung',
      tabEmployees: 'Mitarbeiter', tabRecruiting: 'Recruiting',
      tabLeave: 'Urlaub', tabTimelog: 'Zeiterfassung', tabOnboarding: 'Onboarding',
      department: 'Abteilung', role: 'Rolle', start: 'Start',
      noEmployees: 'Keine Mitarbeiter',
      newEmployee: 'Neuer Mitarbeiter', startDate: 'Startdatum', saveEmployee: 'Mitarbeiter speichern',
      campaigns: 'Stellenkampagnen', newCampaign: 'Neue Kampagne',
      position: 'Stelle', location: 'Ort', employmentType: 'Typ', link: 'Link', applicants: 'Bewerb.',
      copyLink: 'Link kopieren', noCampaigns: 'Keine Kampagnen',
      applicationsFor: 'Bewerbungen — {title}', noApplications: 'Keine Bewerbungen',
      newCampaignTitle: 'Neue Stellenkampagne', jobTitle: 'Stellenbezeichnung',
      fullTime: 'Vollzeit', partTime: 'Teilzeit', internship: 'Praktikum', freelance: 'Freelance',
      jobDescription: 'Stellenbeschreibung', requirements: 'Anforderungen',
      createCampaign: 'Kampagne erstellen',
      leaveRequests: 'Urlaubsanträge', requestLeave: 'Antrag stellen',
      reason: 'Grund', approved: 'Genehmigt', rejected: 'Abgelehnt', pending: 'Ausstehend',
      approve: 'Genehmigen', reject: 'Ablehnen', noRequests: 'Keine Anträge',
      leaveModal: 'Urlaubsantrag', employee: 'Mitarbeiter', selectEmployee: '– wählen –',
      vacation: 'Urlaub', sick: 'Krank', homeOffice: 'Home Office',
      submitRequest: 'Antrag einreichen',
      timeclock: 'Digitale Stempeluhr', openTimeclock: 'Stempeluhr öffnen',
      recordTime: 'Arbeitszeiten erfassen', entry: 'Eintrag', note: 'Notiz', noEntries: 'Keine Einträge',
      recordTimeModal: 'Arbeitszeit erfassen', fromTime: 'Von (Uhrzeit)', toTime: 'Bis (Uhrzeit)',
      onboarding: 'Onboarding-Checklisten', selectEmployee2: 'Mitarbeiter wählen',
      addTask: 'Aufgabe hinzufügen...', noTasks: 'Keine Aufgaben. Füge welche hinzu!',
      done: 'erledigt', selectEmployeeHint: 'Mitarbeiter oben auswählen',
    },

    // ── Support ────────────────────────────────────────────────────────────────
    support: {
      totalTickets: 'Tickets gesamt', open: 'offen',
      criticalHigh: 'Kritisch / Hoch', actNow: 'sofort handeln',
      inProgress: 'In Bearbeitung', active: 'aktiv',
      resolved: 'Gelöst', today: 'heute',
      filterAll: 'Alle', filterOpen: 'Offen', filterInProgress: 'In Bearbeitung',
      filterResolved: 'Gelöst', filterClosed: 'Geschlossen',
      filterAllPrios: 'Alle Prios', critical: 'Kritisch', high: 'Hoch', medium: 'Mittel', low: 'Niedrig',
      newTicket: 'Neues Ticket',
      colTitle: 'Titel', colClient: 'Kunde', colAssignee: 'Zuständig', colPrio: 'Prio', colSla: 'SLA',
      noComments: 'Noch keine Kommentare', replyPlaceholder: 'Antwort eingeben...',
      sendReply: 'Antwort senden', copyPortalLink: 'Kunden-Portal-Link kopieren',
      problemDesc: 'Problem beschreiben...', clientEmail: 'Kunden-E-Mail', agentName: 'Name des Agents',
      createTicket: 'Ticket erstellen',
      slaOverdue: 'überfällig', slaDone: 'Erledigt',
    },

    // ── Contracts ──────────────────────────────────────────────────────────────
    contracts: {
      total: 'Verträge gesamt', active: 'aktiv',
      activeContracts: 'Aktive Verträge', autoRenewing: 'auto-verlängernd',
      mrr: 'MRR (geschätzt)', perYear: '/ Jahr',
      expiringSoon: 'Laufen bald aus', expiringHint: 'in den nächsten 30 Tagen / Kündigungsfrist',
      contracts: 'Verträge', newContract: 'Neu',
      colTitle: 'Titel', colCompany: 'Unternehmen', colType: 'Typ', colTerm: 'Laufzeit',
      editContract: 'Vertrag bearbeiten', newContractTitle: 'Neuer Vertrag', createContract: 'Vertrag anlegen',
      contractNumber: 'Vertragsnummer',
      typeService: 'Dienstleistung', typeLicense: 'Lizenz', typeMaintenance: 'Wartung',
      typeRent: 'Miete', typeInsurance: 'Versicherung', typeOther: 'Sonstiges',
      contact: 'Ansprechpartner', noContact: '— kein Kontakt verknüpft —',
      begin: 'Beginn', end: 'Ende', billing: 'Abrechnung',
      quarterly: 'Quartalsweise', monthly: 'Monatlich', annual: 'Jährlich', oneTime: 'Einmalig',
      noticePeriod: 'Kündigungsfrist (Tage)', autoRenew: 'Automatische Verlängerung',
      statusDraft: 'Entwurf', statusCancelled: 'Gekündigt', statusExpired: 'Abgelaufen',
    },

    // ── Marketing ──────────────────────────────────────────────────────────────
    marketing: {
      campaigns: 'Kampagnen', totalLeads: 'Leads gesamt', viaLandingpages: 'via Landingpages',
      bestCampaign: 'Beste Kampagne', mostLeads: 'meiste Leads', baseUrl: 'Basis-URL',
      newCampaign: 'Neue Kampagne', form: 'Formular', slug: 'Slug', leads: 'Leads', utm: 'UTM',
      copyLink: 'Link kopieren', qrCode: 'QR-Code',
      noCampaigns: 'Keine Kampagnen — erste anlegen!', inactive: 'Inaktiv',
      editCampaign: 'Kampagne bearbeiten', newCampaignTitle: 'Neue Kampagne', createCampaign: 'Kampagne erstellen',
      campaignName: 'Kampagnen-Name', selectForm: 'Formular wählen', noForm: '— Formular wählen —',
      vanitySlug: 'Vanity-Slug (optional)', link: 'Link:', design: '🎨 Design',
      headline: 'Headline', subtext: 'Subtext', headerBanner: 'Header-Banner',
      utmTracking: '📊 UTM-Tracking', livePreview: '👁 Live-Vorschau',
    },

    // ── Forms ──────────────────────────────────────────────────────────────────
    forms: {
      title: 'Formulare', subtitle: 'Formulare erstellen & Submissions verwalten',
      newForm: 'Neues Formular', tabForms: 'Formulare', tabSubmissions: 'Submissions',
      noForms: 'Noch keine Formulare', fields: 'Felder', edit: 'Bearbeiten',
      settings: 'Formular-Einstellungen', titleLabel: 'Titel', descLabel: 'Beschreibung',
      btnText: 'Button Text', successMsg: 'Erfolgsmeldung', notifyTo: 'Benachrichtigung an',
      addField: 'Feld hinzufügen',
      ftText: 'Text', ftEmail: 'E-Mail', ftPhone: 'Telefon', ftNumber: 'Zahl',
      ftTextarea: 'Textblock', ftSelect: 'Auswahl', ftCheckbox: 'Checkbox',
      labelField: 'Label', placeholderField: 'Placeholder', optionsField: 'Optionen (kommagetrennt)',
      required: 'Pflichtfeld',
      selectForm: 'Wähle ein Formular aus der Formulare-Liste',
      submissions: 'Einreichungen', noSubmissions: 'Noch keine Submissions', submission: 'Einreichung',
    },

    // ── Shop ───────────────────────────────────────────────────────────────────
    shop: {
      title: 'Shop', subtitle: 'Produkte, Kategorien, Lieferanten & Bestand',
      newProduct: 'Neues Produkt', newSupplier: 'Neuer Lieferant',
      tabProducts: 'Produkte', tabCategories: 'Kategorien', tabSuppliers: 'Lieferanten',
      tabStock: 'Bestand', tabOrders: 'Bestellungen',
      noProducts: 'Noch keine Produkte — leg das erste an!',
      stock: 'Stock:', vat: 'MwSt.',
      newCategory: 'Neue Kategorie', add: 'Hinzufügen',
      noSuppliers: 'Noch keine Lieferanten angelegt!', contactPerson: 'Kontakt',
      stockOverview: 'Bestandsübersicht', product: 'Produkt', category: 'Kategorie',
      minStock: 'Mindestbestand', supplier: 'Lieferant', noProductsStock: 'Keine Produkte',
      reorder: 'Nachbestellen', ok: 'OK', orderBtn: 'Bestellen',
      orders: 'Bestellvorgänge', openOrders: 'offen',
      orderNumber: 'Bestell-Nr.', quantity: 'Menge', units: 'Stk.', noOrders: 'Keine Bestellungen vorhanden',
      confirmOrder: 'Als bestätigt markieren', confirmDelivery: 'Als geliefert markieren',
      editProduct: 'Produkt bearbeiten', newProductTitle: 'Neues Produkt anlegen', createProduct: 'Produkt anlegen',
      productName: 'Produktname *', price: 'Preis (€) *',
      vat19: '19% (Standard)', vat7: '7% (ermäßigt)', vat0: '0% (steuerfrei)',
      noSupplier: '— kein Lieferant —', shortDesc: 'Kurzbeschreibung',
      priceModel: 'Preismodell', onRequest: 'Auf Anfrage', longDesc: 'Langbeschreibung',
      features: 'Features (eine pro Zeile)',
      reorderTitle: 'Nachbestellung', currentStock: 'Aktueller Bestand:',
      minStockLabel: 'Mindestbestand:', supplierLabel: 'Lieferant:',
      orderQty: 'Bestellmenge', orderNotes: 'Hinweise an Lieferant (optional)', placeOrder: 'Bestellung aufgeben',
      newSupplierTitle: 'Neuer Lieferant', companyName: 'Firmenname *',
      contactPersonLabel: 'Ansprechpartner', address: 'Adresse', createSupplier: 'Lieferant anlegen',
    },

    // ── Settings ───────────────────────────────────────────────────────────────
    settingsPage: {
      demoNotice: 'Demo-Modus — Einstellungen können nicht gespeichert werden',
      tabBranding: 'Branding', tabCompany: 'Unternehmen', tabAgb: 'AGB',
      tabTheme: 'Darstellung', tabSecurity: 'Sicherheit', tabInvoices: 'Rechnungen',
      tabDunning: 'Mahnwesen', tabModules: 'Module', tabLicenses: 'Lizenzen',
      tabPayment: 'Payment', tabAccount: 'Konto', tabNavigation: 'Navigation',
      tabInfra: 'Infrastruktur', tabTeam: 'Team',
      brandingTitle: 'Logo (Upload)', productName: 'Produktname', tagline: 'Tagline (Landing Page)',
      portalTitle: 'Kundenportal Titel', preview: 'Vorschau', change: 'Ändern', uploadLogo: 'Logo hochladen',
      companyTitle: 'Unternehmensdaten', owner: 'Firma / Inhaber', rep: 'Vertreten durch',
      vatId: 'USt-IdNr.', tradeReg: 'Handelsregister (optional)', court: 'Registergericht (optional)',
      agbTitle: 'Allgemeine Geschäftsbedingungen',
      themeTitle: 'Theme', accentColor: 'Eigene Akzentfarbe (überschreibt Theme)',
      securityTitle: 'Sicherheit', autoLogout: 'Automatische Abmeldung nach Inaktivität',
      min5: '5 Minuten', min15: '15 Minuten', min30: '30 Minuten', min60: '60 Minuten', never: 'Nie',
      invoiceTitle: 'Rechnungseinstellungen', defaultDue: 'Standard-Fälligkeit (Tage nach Rechnungsdatum)',
      paymentText: 'Zahlungsziel-Text auf Rechnung', vatRate: 'MwSt.-Satz (%)',
      priceDisplay: 'Preisanzeige im Shop', netPrice: 'Netto (zzgl. MwSt.)', grossPrice: 'Brutto (inkl. MwSt.)',
      dunningTitle: 'Mahnwesen', level1: 'Stufe 1', level2: 'Stufe 2', level3: 'Stufe 3',
      daysAfterDue: 'Tage nach Fälligkeit', fee: 'Mahngebühr (€)', dunningText: 'Mahntext',
      teamTitle: 'Team', inviteMember: 'E-Mail des neuen Mitglieds', invite: 'Einladen',
      noMembers: 'Noch keine Teammitglieder.', memberRole: 'Member', adminRole: 'Admin',
      invitePending: 'Einladung ausstehend', remove: 'Entfernen',
      infraTitle: 'AWS Controlcenter',
    },

    // ── Status labels ──────────────────────────────────────────────────────────
    dealStage: { lead: 'Lead', contact: 'Kontakt', proposal: 'Angebot', negotiation: 'Verhandlung', success: 'Gewonnen', lost: 'Verloren' } as Record<string,string>,
    contactStatus: { lead: 'Lead', prospect: 'Prospect', customer: 'Kunde', inactive: 'Inaktiv' } as Record<string,string>,
    ticketStatus: { open: 'Offen', in_progress: 'In Arbeit', resolved: 'Gelöst', closed: 'Geschlossen' } as Record<string,string>,
    priority: { low: 'Niedrig', medium: 'Mittel', high: 'Hoch', critical: 'Kritisch' } as Record<string,string>,
  },

  en: {
    // ── Sidebar ────────────────────────────────────────────────────────────────
    navOverview: 'Overview',
    navModules:  'Modules',
    navSystem:   'System',
    settings:    'Settings',
    moduleNames: {
      crm: 'CRM', projects: 'Projects', contracts: 'Contracts', finance: 'Finance',
      hr: 'HR', support: 'Support', analytics: 'Analytics', shop: 'Shop',
      pagebuilder: 'Page Builder', forms: 'Forms', marketing: 'Marketing', nexora: 'Website',
      termine: 'Appointments',
    } as Record<string, string>,

    // ── Topbar titles ──────────────────────────────────────────────────────────
    pageTitles: {
      '/dashboard':  'Dashboard', '/crm':        'CRM',        '/projects':   'Projects',
      '/lead':       'Lead Page',  '/finance':    'Finance',    '/contracts':  'Contracts',
      '/hr':         'HR',         '/support':    'Support',    '/marketing':  'Marketing',
      '/shop-admin': 'Shop',       '/pagebuilder':'Page Builder','/forms':     'Forms',
      '/analytics':  'Analytics',  '/settings':   'Settings',   '/website':   'Website',
      '/blog':       'Blog',      '/automotive': 'Automotive', '/termine':   'Appointments',
    } as Record<string, string>,

    // ── Topbar user menu ───────────────────────────────────────────────────────
    menuSettings: 'Settings',
    menuLogout:   'Sign Out',

    // ── Quick actions ──────────────────────────────────────────────────────────
    quick: [
      { label: 'New Contact',  icon: 'ti-user-plus',     path: '/crm',       query: 'new=contact' },
      { label: 'New Deal',     icon: 'ti-briefcase',     path: '/crm',       query: 'new=deal'    },
      { label: 'New Invoice',  icon: 'ti-receipt',       path: '/finance',   query: 'new=1'       },
      { label: 'New Project',  icon: 'ti-layout-kanban', path: '/projects',  query: 'new=1'       },
      { label: 'New Ticket',   icon: 'ti-headset',       path: '/support',   query: 'new=1'       },
      { label: 'New Employee', icon: 'ti-id-badge',      path: '/hr',        query: 'new=1'       },
      { label: 'New Campaign', icon: 'ti-speakerphone',  path: '/marketing', query: 'new=1'       },
    ],

    // ── Common ─────────────────────────────────────────────────────────────────
    common: {
      new: 'New', save: 'Save', cancel: 'Cancel', edit: 'Edit', delete: 'Delete',
      name: 'Name', status: 'Status', email: 'E-Mail', phone: 'Phone', website: 'Website',
      notes: 'Notes', industry: 'Industry', street: 'Street & No.', zip: 'ZIP',
      city: 'City', country: 'Country', company: 'Company', title: 'Title',
      description: 'Description', type: 'Type', date: 'Date', amount: 'Amount',
      from: 'From', to: 'To', active: 'Active', inactive: 'Inactive',
      open: 'Open', closed: 'Closed', loading: 'Loading...', refresh: 'Refresh',
      copy: 'Copy', back: 'Back', preview: 'Preview', upload: 'Upload',
      client: 'Client', value: 'Value', stage: 'Stage', low: 'Low', medium: 'Medium',
      high: 'High', critical: 'Critical', monthly: 'Monthly', annual: 'Annual',
      oneTime: 'One-time', other: 'Other', noResults: 'No results',
      assignee: 'Assignee', priority: 'Priority', actions: 'Actions',
    },

    // ── Dashboard ──────────────────────────────────────────────────────────────
    dash: {
      weightedPipeline: 'Weighted Pipeline', activeDeals: 'Active Deals',
      openTickets: 'Open Tickets', employees: 'Employees',
      dealsActive: 'Deals active', won: 'won', total: 'total', active: 'active',
      financeOverview: 'Finance — Overview', contacts: 'Contacts',
      pipelineDeals: 'Pipeline — Deals', supportTickets: 'Support — Open Tickets',
      demoUsage: 'Demo Usage', apiCalls: 'API Calls', today: 'Today',
      thisMonth: 'This Month', last7days: 'Last 7 Days',
      revenue: 'Revenue', expenses: 'Expenses', profit: 'Profit',
      invoicePaid: 'Paid', invoicePending: 'Pending', invoiceOverdue: 'Overdue',
      viewAll: 'View All', viewAllDeals: 'View All Deals', viewAllTickets: 'View All Tickets',
      noDeals: 'No deals found', noTickets: 'No tickets', noContacts: 'No contacts',
      cancelSub: 'Cancel Subscription', totalLabel: 'Total', calls: 'Calls',
      adminOnly: 'visible to admin only',
      colCompany: 'Company', colValue: 'Value', colStage: 'Stage',
      colProbability: 'Probability', colStatus: 'Status',
      colTitle: 'Title', colClient: 'Client', colPriority: 'Priority',
    },

    // ── CRM ────────────────────────────────────────────────────────────────────
    crm: {
      totalContacts: 'Total Contacts', totalDeals: 'Total Deals',
      pipelineValue: 'Pipeline Value', winRate: 'Win Rate',
      customers: 'Customers', won: 'won', weighted: 'weighted', of: 'of',
      contacts: 'Contacts', deals: 'Deals', companies: 'Companies',
      noContacts: 'No contacts', noDeals: 'No deals', noCompanies: 'No companies',
      makeCustomer: 'Make Customer',
      editContact: 'Edit Contact', newContact: 'New Contact', createContact: 'Create Contact',
      editDeal: 'Edit Deal', newDeal: 'New Deal', createDeal: 'Create Deal',
      editCompany: 'Edit Company', newCompany: 'New Company', createCompany: 'Create Company',
      firstName: 'First Name', lastName: 'Last Name',
      companyDb: 'Company (Database)', noCompanyLinked: '— no company linked —',
      companyFreetext: 'Company (Free Text)',
      leadSourceLabel: 'Lead Source', leadStatusLabel: 'Lead Status',
      srcManual: 'Manual', srcCsv: 'CSV/Excel Import', srcLandingpage: 'Landing Page',
      srcReferral: 'Referral', srcOther: 'Other',
      lsNew: 'New', lsContacted: 'Contacted', lsQualified: 'Qualified', lsUnqualified: 'Unqualified',
      optLead: 'Lead', optCustomer: 'Customer', optChurned: 'Churned',
      dealProb: 'Probability %',
      dsInProgress: 'In Progress', dsNegotiation: 'Negotiation', dsWon: 'Won', dsLost: 'Lost',
      internalNotes: 'Internal notes...',
    },

    // ── Finance ────────────────────────────────────────────────────────────────
    finance: {
      paid: 'Paid', pending: 'Pending', overdue: 'Overdue', total: 'total',
      invoices: 'Invoices', cashbook: 'Cash Book', bankImport: 'Bank Import', tax: 'Tax & Export',
      number: 'Number', client: 'Client', amount: 'Amount', dueDate: 'Due Date',
      mailSent: 'Mail sent', archived: 'GoBD archived',
      noInvoices: 'No invoices', newInvoice: 'New Invoice',
      downloadPdf: 'Download PDF', downloadXRechnung: 'Download XRechnung',
      sendMail: 'Send by email', archiveGobd: 'Archive GoBD-compliant (locks editing)',
      dunning1: 'Send 1st reminder', dunning2: 'Send 2nd reminder', dunning3: 'Send 3rd reminder',
      booking: 'Transaction', description: 'Description', balance: 'Balance',
      noCashbook: 'No cash book entries',
      bankImportTitle: 'Import Bank CSV', importBtn: 'Import',
      importedBookings: 'Imported Transactions', assignInvoice: 'Assign Invoice',
      noBookings: 'No transactions imported yet', assigned: '✓ Assigned', assign: '✓ Assign',
      vatReport: 'VAT Return (UStVA)', quarterly: 'Quarterly',
      period: 'Period', netKz41: 'Net (line 41)', vat19Kz81: 'VAT 19% (line 81)', gross: 'Gross',
      totalYear: 'Total {year}', elsterOpen: 'Open ELSTER',
      euRTitle: 'P&L Statement {year}',
      businessRevenue: 'Business Revenue', businessExpenses: 'Business Expenses',
      profitBeforeTax: 'Profit before Tax', exports: 'Exports',
      cashbookEntry: 'Cash Book Entry', income: 'Income', expense: 'Expense', book: 'Post',
      clientEmail: 'Client E-Mail', saveAndMail: 'Save + Mail',
    },

    // ── Projects ───────────────────────────────────────────────────────────────
    projects: {
      active: 'active', completed: 'Completed', thisMonth: 'this month',
      overdue: 'Overdue', actNow: 'act now', onTrack: 'on track',
      openTasks: 'Open Tasks', total: 'total',
      listView: 'List', ganttView: 'Planner',
      allStatus: 'All Status', statusActive: 'Active', statusReview: 'Review',
      statusCompleted: 'Completed', statusOverdue: 'Overdue',
      newProject: 'New Project', editProject: 'Edit Project', createProject: 'Create Project',
      noTasks: 'No tasks', task: 'Task', subtask: 'Subtask', comment: 'Comment', time: 'Time',
      ganttTitle: 'Project Planner — Gantt',
      ganttEmpty: 'No projects with deadline for Gantt view.',
      projectTask: 'Project / Task',
      projectName: 'Project Name', client: 'Client', noClient: '— no client —',
      team: 'Team', deadline: 'Deadline', priority: 'Priority', progress: 'Progress',
      newTask: 'New Task', taskTitle: 'Title', assignee: 'Assignee', start: 'Start',
      estimatedHours: 'Estimated Hours', createTask: 'Create Task',
      addSubtask: 'Add Subtask', bookTime: 'Log Time', hours: 'Hours',
      colTasks: 'TASKS',
    },

    // ── HR ─────────────────────────────────────────────────────────────────────
    hr: {
      totalEmployees: 'Total Employees', active: 'active',
      onLeave: 'On Leave', current: 'currently',
      activeCampaigns: 'Active Campaigns', applications: 'Applications',
      offboarding: 'Offboarding', inProgress: 'in progress',
      tabEmployees: 'Employees', tabRecruiting: 'Recruiting',
      tabLeave: 'Leave', tabTimelog: 'Time Tracking', tabOnboarding: 'Onboarding',
      department: 'Department', role: 'Role', start: 'Start',
      noEmployees: 'No employees',
      newEmployee: 'New Employee', startDate: 'Start Date', saveEmployee: 'Save Employee',
      campaigns: 'Job Campaigns', newCampaign: 'New Campaign',
      position: 'Position', location: 'Location', employmentType: 'Type', link: 'Link', applicants: 'Applic.',
      copyLink: 'Copy Link', noCampaigns: 'No campaigns',
      applicationsFor: 'Applications — {title}', noApplications: 'No applications',
      newCampaignTitle: 'New Job Campaign', jobTitle: 'Job Title',
      fullTime: 'Full-time', partTime: 'Part-time', internship: 'Internship', freelance: 'Freelance',
      jobDescription: 'Job Description', requirements: 'Requirements',
      createCampaign: 'Create Campaign',
      leaveRequests: 'Leave Requests', requestLeave: 'Request Leave',
      reason: 'Reason', approved: 'Approved', rejected: 'Rejected', pending: 'Pending',
      approve: 'Approve', reject: 'Reject', noRequests: 'No requests',
      leaveModal: 'Leave Request', employee: 'Employee', selectEmployee: '— select —',
      vacation: 'Vacation', sick: 'Sick Leave', homeOffice: 'Home Office',
      submitRequest: 'Submit Request',
      timeclock: 'Digital Time Clock', openTimeclock: 'Open Time Clock',
      recordTime: 'Record Work Time', entry: 'Entry', note: 'Note', noEntries: 'No entries',
      recordTimeModal: 'Record Work Time', fromTime: 'From (time)', toTime: 'To (time)',
      onboarding: 'Onboarding Checklists', selectEmployee2: 'Select employee',
      addTask: 'Add task...', noTasks: 'No tasks. Add some!',
      done: 'done', selectEmployeeHint: 'Select employee above',
    },

    // ── Support ────────────────────────────────────────────────────────────────
    support: {
      totalTickets: 'Total Tickets', open: 'open',
      criticalHigh: 'Critical / High', actNow: 'act now',
      inProgress: 'In Progress', active: 'active',
      resolved: 'Resolved', today: 'today',
      filterAll: 'All', filterOpen: 'Open', filterInProgress: 'In Progress',
      filterResolved: 'Resolved', filterClosed: 'Closed',
      filterAllPrios: 'All Prios', critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
      newTicket: 'New Ticket',
      colTitle: 'Title', colClient: 'Client', colAssignee: 'Assignee', colPrio: 'Prio', colSla: 'SLA',
      noComments: 'No comments yet', replyPlaceholder: 'Enter reply...',
      sendReply: 'Send Reply', copyPortalLink: 'Copy client portal link',
      problemDesc: 'Describe the problem...', clientEmail: 'Client E-Mail', agentName: 'Agent Name',
      createTicket: 'Create Ticket',
      slaOverdue: 'overdue', slaDone: 'Done',
    },

    // ── Contracts ──────────────────────────────────────────────────────────────
    contracts: {
      total: 'Total Contracts', active: 'active',
      activeContracts: 'Active Contracts', autoRenewing: 'auto-renewing',
      mrr: 'MRR (estimated)', perYear: '/ year',
      expiringSoon: 'Expiring Soon', expiringHint: 'in the next 30 days / notice period',
      contracts: 'Contracts', newContract: 'New',
      colTitle: 'Title', colCompany: 'Company', colType: 'Type', colTerm: 'Term',
      editContract: 'Edit Contract', newContractTitle: 'New Contract', createContract: 'Create Contract',
      contractNumber: 'Contract Number',
      typeService: 'Service', typeLicense: 'License', typeMaintenance: 'Maintenance',
      typeRent: 'Rental', typeInsurance: 'Insurance', typeOther: 'Other',
      contact: 'Contact Person', noContact: '— no contact linked —',
      begin: 'Start', end: 'End', billing: 'Billing',
      quarterly: 'Quarterly', monthly: 'Monthly', annual: 'Annual', oneTime: 'One-time',
      noticePeriod: 'Notice Period (days)', autoRenew: 'Auto Renewal',
      statusDraft: 'Draft', statusCancelled: 'Cancelled', statusExpired: 'Expired',
    },

    // ── Marketing ──────────────────────────────────────────────────────────────
    marketing: {
      campaigns: 'Campaigns', totalLeads: 'Total Leads', viaLandingpages: 'via landing pages',
      bestCampaign: 'Best Campaign', mostLeads: 'most leads', baseUrl: 'Base URL',
      newCampaign: 'New Campaign', form: 'Form', slug: 'Slug', leads: 'Leads', utm: 'UTM',
      copyLink: 'Copy Link', qrCode: 'QR Code',
      noCampaigns: 'No campaigns — create the first!', inactive: 'Inactive',
      editCampaign: 'Edit Campaign', newCampaignTitle: 'New Campaign', createCampaign: 'Create Campaign',
      campaignName: 'Campaign Name', selectForm: 'Select Form', noForm: '— select form —',
      vanitySlug: 'Vanity Slug (optional)', link: 'Link:', design: '🎨 Design',
      headline: 'Headline', subtext: 'Subtext', headerBanner: 'Header Banner',
      utmTracking: '📊 UTM Tracking', livePreview: '👁 Live Preview',
    },

    // ── Forms ──────────────────────────────────────────────────────────────────
    forms: {
      title: 'Forms', subtitle: 'Create forms & manage submissions',
      newForm: 'New Form', tabForms: 'Forms', tabSubmissions: 'Submissions',
      noForms: 'No forms yet', fields: 'Fields', edit: 'Edit',
      settings: 'Form Settings', titleLabel: 'Title', descLabel: 'Description',
      btnText: 'Button Text', successMsg: 'Success Message', notifyTo: 'Notify to',
      addField: 'Add Field',
      ftText: 'Text', ftEmail: 'E-Mail', ftPhone: 'Phone', ftNumber: 'Number',
      ftTextarea: 'Text Area', ftSelect: 'Select', ftCheckbox: 'Checkbox',
      labelField: 'Label', placeholderField: 'Placeholder', optionsField: 'Options (comma-separated)',
      required: 'Required',
      selectForm: 'Select a form from the list',
      submissions: 'Submissions', noSubmissions: 'No submissions yet', submission: 'Submission',
    },

    // ── Shop ───────────────────────────────────────────────────────────────────
    shop: {
      title: 'Shop', subtitle: 'Products, Categories, Suppliers & Inventory',
      newProduct: 'New Product', newSupplier: 'New Supplier',
      tabProducts: 'Products', tabCategories: 'Categories', tabSuppliers: 'Suppliers',
      tabStock: 'Inventory', tabOrders: 'Orders',
      noProducts: 'No products yet — create the first!',
      stock: 'Stock:', vat: 'VAT',
      newCategory: 'New Category', add: 'Add',
      noSuppliers: 'No suppliers yet!', contactPerson: 'Contact',
      stockOverview: 'Inventory Overview', product: 'Product', category: 'Category',
      minStock: 'Min. Stock', supplier: 'Supplier', noProductsStock: 'No products',
      reorder: 'Reorder', ok: 'OK', orderBtn: 'Order',
      orders: 'Purchase Orders', openOrders: 'open',
      orderNumber: 'Order No.', quantity: 'Qty', units: 'pcs.', noOrders: 'No orders',
      confirmOrder: 'Mark as confirmed', confirmDelivery: 'Mark as delivered',
      editProduct: 'Edit Product', newProductTitle: 'New Product', createProduct: 'Create Product',
      productName: 'Product Name *', price: 'Price (€) *',
      vat19: '19% (Standard)', vat7: '7% (reduced)', vat0: '0% (tax-free)',
      noSupplier: '— no supplier —', shortDesc: 'Short Description',
      priceModel: 'Pricing Model', onRequest: 'On Request', longDesc: 'Description',
      features: 'Features (one per line)',
      reorderTitle: 'Reorder', currentStock: 'Current Stock:',
      minStockLabel: 'Min. Stock:', supplierLabel: 'Supplier:',
      orderQty: 'Order Quantity', orderNotes: 'Notes for supplier (optional)', placeOrder: 'Place Order',
      newSupplierTitle: 'New Supplier', companyName: 'Company Name *',
      contactPersonLabel: 'Contact Person', address: 'Address', createSupplier: 'Create Supplier',
    },

    // ── Settings ───────────────────────────────────────────────────────────────
    settingsPage: {
      demoNotice: 'Demo mode — settings cannot be saved',
      tabBranding: 'Branding', tabCompany: 'Company', tabAgb: 'Terms',
      tabTheme: 'Appearance', tabSecurity: 'Security', tabInvoices: 'Invoices',
      tabDunning: 'Dunning', tabModules: 'Modules', tabLicenses: 'Licenses',
      tabPayment: 'Payment', tabAccount: 'Account', tabNavigation: 'Navigation',
      tabInfra: 'Infrastructure', tabTeam: 'Team',
      brandingTitle: 'Logo (Upload)', productName: 'Product Name', tagline: 'Tagline (Landing Page)',
      portalTitle: 'Customer Portal Title', preview: 'Preview', change: 'Change', uploadLogo: 'Upload Logo',
      companyTitle: 'Company Data', owner: 'Company / Owner', rep: 'Represented by',
      vatId: 'VAT ID', tradeReg: 'Trade Register (optional)', court: 'Registration Court (optional)',
      agbTitle: 'Terms & Conditions',
      themeTitle: 'Theme', accentColor: 'Custom Accent Color (overrides theme)',
      securityTitle: 'Security', autoLogout: 'Auto logout after inactivity',
      min5: '5 minutes', min15: '15 minutes', min30: '30 minutes', min60: '60 minutes', never: 'Never',
      invoiceTitle: 'Invoice Settings', defaultDue: 'Default due date (days after invoice date)',
      paymentText: 'Payment terms text on invoice', vatRate: 'VAT Rate (%)',
      priceDisplay: 'Price display in shop', netPrice: 'Net (excl. VAT)', grossPrice: 'Gross (incl. VAT)',
      dunningTitle: 'Dunning', level1: 'Level 1', level2: 'Level 2', level3: 'Level 3',
      daysAfterDue: 'Days after due date', fee: 'Dunning fee (€)', dunningText: 'Dunning text',
      teamTitle: 'Team', inviteMember: 'New member e-mail', invite: 'Invite',
      noMembers: 'No team members yet.', memberRole: 'Member', adminRole: 'Admin',
      invitePending: 'Invitation pending', remove: 'Remove',
      infraTitle: 'AWS Control Center',
    },

    // ── Status labels ──────────────────────────────────────────────────────────
    dealStage: { lead: 'Lead', contact: 'Contact', proposal: 'Proposal', negotiation: 'Negotiation', success: 'Won', lost: 'Lost' } as Record<string,string>,
    contactStatus: { lead: 'Lead', prospect: 'Prospect', customer: 'Customer', inactive: 'Inactive' } as Record<string,string>,
    ticketStatus: { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' } as Record<string,string>,
    priority: { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' } as Record<string,string>,
  },
}
