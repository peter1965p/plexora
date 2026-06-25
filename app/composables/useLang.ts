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
    // Sidebar
    navOverview: 'Übersicht',
    navModules:  'Module',
    navSystem:   'System',
    settings:    'Einstellungen',
    moduleNames: {
      crm: 'CRM', projects: 'Projekte', contracts: 'Verträge', finance: 'Finanzen',
      hr: 'HR', support: 'Support', analytics: 'Analytics', shop: 'Shop',
      pagebuilder: 'Pagebuilder', forms: 'Formulare', marketing: 'Marketing',
    } as Record<string, string>,
    // Topbar titles
    pageTitles: {
      '/dashboard':  'Dashboard', '/crm':        'CRM',        '/projects':   'Projekte',
      '/lead':       'Lead-Landingpage', '/finance':    'Finanzen',   '/contracts':  'Verträge',
      '/hr':         'HR',         '/support':    'Support',    '/marketing':  'Marketing',
      '/shop-admin': 'Shop',       '/pagebuilder':'Pagebuilder','/forms':      'Formulare',
      '/analytics':  'Analytics',  '/settings':   'Einstellungen',
    } as Record<string, string>,
    // Topbar user menu
    menuSettings: 'Einstellungen',
    menuLogout:   'Abmelden',
    // Quick actions
    quick: [
      { label: 'Neuer Kontakt',     icon: 'ti-user-plus',     path: '/crm',       query: 'new=contact' },
      { label: 'Neuer Deal',        icon: 'ti-briefcase',     path: '/crm',       query: 'new=deal'    },
      { label: 'Neue Rechnung',     icon: 'ti-receipt',       path: '/finance',   query: 'new=1'       },
      { label: 'Neues Projekt',     icon: 'ti-layout-kanban', path: '/projects',  query: 'new=1'       },
      { label: 'Neues Ticket',      icon: 'ti-headset',       path: '/support',   query: 'new=1'       },
      { label: 'Neuer Mitarbeiter', icon: 'ti-id-badge',      path: '/hr',        query: 'new=1'       },
      { label: 'Neue Kampagne',     icon: 'ti-speakerphone',  path: '/marketing', query: 'new=1'       },
    ],
    // Dashboard
    dash: {
      weightedPipeline: 'Pipeline Gewichtet',
      activeDeals:      'Aktive Deals',
      openTickets:      'Offene Tickets',
      employees:        'Mitarbeiter',
      dealsActive:      'Deals aktiv',
      won:              'gewonnen',
      total:            'gesamt',
      active:           'aktiv',
      financeOverview:  'Finanzen — Übersicht',
      contacts:         'Kontakte',
      pipelineDeals:    'Pipeline — Deals',
      supportTickets:   'Support — Offene Tickets',
      demoUsage:        'Demo-Nutzung',
      apiCalls:         'API-Aufrufe',
      today:            'Heute',
      thisMonth:        'Diesen Monat',
      last7days:        'Letzte 7 Tage',
      revenue:          'Einnahmen',
      expenses:         'Ausgaben',
      profit:           'Gewinn',
      invoicePaid:      'Bezahlt',
      invoicePending:   'Ausstehend',
      invoiceOverdue:   'Überfällig',
      viewAll:          'Alle ansehen',
      viewAllDeals:     'Alle Deals ansehen',
      viewAllTickets:   'Alle Tickets',
      noDeals:          'Keine Deals vorhanden',
      noTickets:        'Keine Tickets',
      noContacts:       'Keine Kontakte',
      cancelSub:        'Abonnement kündigen',
      totalLabel:       'Gesamt',
      calls:            'Aufrufe',
      adminOnly:        'nur sichtbar für Admin',
      colCompany:       'Unternehmen',
      colValue:         'Wert',
      colStage:         'Phase',
      colProbability:   'Wahrscheinlichkeit',
      colStatus:        'Status',
      colTitle:         'Titel',
      colClient:        'Kunde',
      colPriority:      'Priorität',
    },
    priority: { low: 'Niedrig', medium: 'Mittel', high: 'Hoch', critical: 'Kritisch' } as Record<string,string>,
    // Status labels
    dealStage: { lead: 'Lead', contact: 'Kontakt', proposal: 'Angebot', negotiation: 'Verhandlung', success: 'Gewonnen', lost: 'Verloren' } as Record<string,string>,
    contactStatus: { lead: 'Lead', prospect: 'Prospect', customer: 'Kunde', inactive: 'Inaktiv' } as Record<string,string>,
    ticketStatus: { open: 'Offen', in_progress: 'In Arbeit', resolved: 'Gelöst', closed: 'Geschlossen' } as Record<string,string>,
  },
  en: {
    navOverview: 'Overview',
    navModules:  'Modules',
    navSystem:   'System',
    settings:    'Settings',
    moduleNames: {
      crm: 'CRM', projects: 'Projects', contracts: 'Contracts', finance: 'Finance',
      hr: 'HR', support: 'Support', analytics: 'Analytics', shop: 'Shop',
      pagebuilder: 'Page Builder', forms: 'Forms', marketing: 'Marketing',
    } as Record<string, string>,
    pageTitles: {
      '/dashboard':  'Dashboard', '/crm':        'CRM',        '/projects':   'Projects',
      '/lead':       'Lead Page',  '/finance':    'Finance',    '/contracts':  'Contracts',
      '/hr':         'HR',         '/support':    'Support',    '/marketing':  'Marketing',
      '/shop-admin': 'Shop',       '/pagebuilder':'Page Builder','/forms':     'Forms',
      '/analytics':  'Analytics',  '/settings':   'Settings',
    } as Record<string, string>,
    menuSettings: 'Settings',
    menuLogout:   'Sign Out',
    quick: [
      { label: 'New Contact',  icon: 'ti-user-plus',     path: '/crm',       query: 'new=contact' },
      { label: 'New Deal',     icon: 'ti-briefcase',     path: '/crm',       query: 'new=deal'    },
      { label: 'New Invoice',  icon: 'ti-receipt',       path: '/finance',   query: 'new=1'       },
      { label: 'New Project',  icon: 'ti-layout-kanban', path: '/projects',  query: 'new=1'       },
      { label: 'New Ticket',   icon: 'ti-headset',       path: '/support',   query: 'new=1'       },
      { label: 'New Employee', icon: 'ti-id-badge',      path: '/hr',        query: 'new=1'       },
      { label: 'New Campaign', icon: 'ti-speakerphone',  path: '/marketing', query: 'new=1'       },
    ],
    dash: {
      weightedPipeline: 'Weighted Pipeline',
      activeDeals:      'Active Deals',
      openTickets:      'Open Tickets',
      employees:        'Employees',
      dealsActive:      'Deals active',
      won:              'won',
      total:            'total',
      active:           'active',
      financeOverview:  'Finance — Overview',
      contacts:         'Contacts',
      pipelineDeals:    'Pipeline — Deals',
      supportTickets:   'Support — Open Tickets',
      demoUsage:        'Demo Usage',
      apiCalls:         'API Calls',
      today:            'Today',
      thisMonth:        'This Month',
      last7days:        'Last 7 Days',
      revenue:          'Revenue',
      expenses:         'Expenses',
      profit:           'Profit',
      invoicePaid:      'Paid',
      invoicePending:   'Pending',
      invoiceOverdue:   'Overdue',
      viewAll:          'View All',
      viewAllDeals:     'View All Deals',
      viewAllTickets:   'View All Tickets',
      noDeals:          'No deals found',
      noTickets:        'No tickets',
      noContacts:       'No contacts',
      cancelSub:        'Cancel Subscription',
      totalLabel:       'Total',
      calls:            'Calls',
      adminOnly:        'visible to admin only',
      colCompany:       'Company',
      colValue:         'Value',
      colStage:         'Stage',
      colProbability:   'Probability',
      colStatus:        'Status',
      colTitle:         'Title',
      colClient:        'Client',
      colPriority:      'Priority',
    },
    priority: { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' } as Record<string,string>,
    dealStage: { lead: 'Lead', contact: 'Contact', proposal: 'Proposal', negotiation: 'Negotiation', success: 'Won', lost: 'Lost' } as Record<string,string>,
    contactStatus: { lead: 'Lead', prospect: 'Prospect', customer: 'Customer', inactive: 'Inactive' } as Record<string,string>,
    ticketStatus: { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' } as Record<string,string>,
  },
}
