// Englische Hilfetexte: überlagern shared/helpContent.ts (gleiche IDs). Fehlt ein Thema hier, schlägt tests/help/content.test.ts fehl.
export interface EnTopic { title: string; summary: string; steps: string[]; tips?: string[]; faq?: Array<{ q: string; a: string }> }

export const EN_GROUPS: Record<string, string> = {
  start: 'Getting started', kunden: 'Customers & sales', orga: 'Organisation', marketing: 'Marketing & web',
  branche: 'Industry packages', nexora: 'Nexora (website)', system: 'System & account',
}

export const EN_ROLES: Record<string, string> = { Mitglied: 'Member', Admin: 'Admin', Inhaber: 'Owner' }

export const EN_TOPICS: Record<string, EnTopic> = {
  ueberblick: {
    title: 'What is Plexora?',
    summary: 'Plexora is your office in the browser: customers, invoices, projects, appointments, marketing and your website in one place. Nexora is the website engine that goes with it.',
    steps: [
      'On the left you see the sidebar. It is divided into Overview, Modules, Industry and System.',
      'At the top right you find notifications, the "New" button for quick creation and your profile.',
      'Which modules you see depends on your plan and on the modules you switched on in the Module Store.',
      'You can switch off anything you do not need in the Module Store. Your data is kept.',
    ],
    tips: ['The question mark at the top right takes you from any page straight to the matching help.', 'You can restart the introduction at any time under "Help".'],
  },
  rollen: {
    title: 'Roles: Owner, Admin, Member',
    summary: 'Everyone in the account has a role. It decides which areas they can see and change.',
    steps: [
      'Owner: owns the account. May do everything, including team, Module Store and plan.',
      'Admin: may manage business areas such as finance, contracts, HR, shop, blog, newsletter and settings.',
      'Member: works in day-to-day business (CRM, support, projects, appointments, marketing, forms).',
      'You assign and change roles under Team in the sidebar (owner only).',
    ],
    tips: ['Important: roles are currently only observed. The interface hides areas, but the permissions are only enforced once the owner switches that on.'],
    faq: [{ q: 'Why can I not see an area?', a: 'Either the module is not switched on (Module Store) or your role is not high enough. Ask the owner.' }],
  },
  'neu-menue': {
    title: 'Quick create with "New"',
    summary: 'The "New" button at the top right creates customers, quotes, tasks, appointments and more in a single step.',
    steps: ['Click "New" at the top right.', 'Choose what you want to create. You land directly in the matching form.', 'Save. The entry appears immediately in the relevant list.'],
  },
  benachrichtigungen: {
    title: 'Notifications',
    summary: 'The bell at the top shows new enquiries, payments, appointment reminders and notices.',
    steps: ['Click the bell. Unread messages show a red number.', 'Clicking a message marks it as read.', 'Use "Mark all read" or "Delete all" to tidy up.'],
  },
  dashboard: {
    title: 'Dashboard',
    summary: 'The start page with the most important figures and open tasks at a glance.',
    steps: ['Open "Dashboard" in the sidebar.', 'The tiles show current figures from your modules.', 'Clicking a tile takes you to the detail page.'],
  },
  crm: {
    title: 'CRM: customers and contacts',
    summary: 'This is where you manage contacts, companies and their history.',
    steps: ['Open CRM and click "New" to create a contact.', 'Enter name, email, phone and company.', 'In the contact you see notes and history. Enquiries from forms and campaigns land here automatically.', 'Use search to find contacts by name or email.'],
    tips: ['Always create customers in the CRM before you write a quote or an invoice. Then all data is linked.'],
  },
  support: {
    title: 'Support: tickets',
    summary: 'Handle customer enquiries as tickets so that nothing gets lost.',
    steps: ['Open Support and create a ticket or open an incoming one.', 'Set status and priority.', 'Reply in the ticket and close it when it is done.'],
  },
  finanzen: {
    title: 'Finance: invoices and payments',
    summary: 'Write and send invoices and follow up on payments.',
    steps: ['Open Finance and create a new invoice.', 'Choose the customer and add line items (or take entries from "Services").', 'Save and send the invoice. The customer receives a link to the payment page.', 'Paid invoices are marked as paid automatically.'],
    tips: ['You set the look of the invoice under "Invoice design".'],
    faq: [{ q: 'Where do I maintain my prices?', a: 'Under "Services" (Finance, Catalogue tab). From there you copy line items into invoices and quotes.' }],
  },
  erechnung: {
    title: 'E-invoice (XRechnung and ZUGFeRD)',
    summary: 'Create invoices as e-invoices under the European standard EN 16931 (XRechnung 3.0 as XML, ZUGFeRD as a PDF with the invoice embedded) and read incoming e-invoices.',
    steps: [
      'Under Settings → Company, fill in: company name, street, postcode and city ("12345 Town"), VAT ID or tax number, contact person, phone, email and IBAN.',
      'When creating an invoice, enter the customer\'s street, postcode, city and email under "Address & e-invoice". For public authorities, the Leitweg ID goes into the buyer reference field.',
      'In the invoice list, "Check e-invoice" opens a list that tells you what is still missing for XRechnung and ZUGFeRD.',
      'With "Download XRechnung" you get the XML file (for authorities and portals); with "Download ZUGFeRD" you get the PDF with the invoice embedded as a file (for companies and tax advisers).',
      'Under Settings → Invoice you choose what goes out with the email: normal PDF, ZUGFeRD or XRechnung in addition. If mandatory details are missing, nothing is sent and the missing details are named.',
      'Upload incoming e-invoices in the "Incoming invoices" tab (XML or ZUGFeRD PDF). Plexora reads them, checks the totals, and you mark them as "paid" once settled.',
    ],
    tips: [
      'Supported syntaxes are CII (XRechnung, ZUGFeRD) and UBL (reading only). The generated files were checked with the official KoSIT validator (XRechnung 3.0) and with Mustang/veraPDF (PDF/A-3).',
      'Small businesses (§ 19 UStG, German VAT exemption) are supported. An invoice has one tax rate (from the invoice settings).',
      'In Germany, receiving e-invoices has been mandatory between businesses since 2025; issuing them becomes mandatory in stages by turnover from 2027 and 2028. Please clarify individual questions with your tax adviser.',
      'Sending through the Peppol network or an authority interface is not built in: you download the file or send it by email.',
    ],
    faq: [{ q: 'What is the difference between XRechnung and ZUGFeRD?', a: 'Both contain the same data under EN 16931. XRechnung is just the XML file; ZUGFeRD is a readable PDF with the invoice attached.' }],
  },
  angebote: {
    title: 'Quotes',
    summary: 'Write quotes, send them by link and let the customer accept them online.',
    steps: ['Open Finance, "Quotes" tab, and click "New quote".', 'Choose the customer, add line items and set the validity.', 'Send the quote. The customer gets a personal link (/angebot/…) to view and accept it.', 'After acceptance you can convert the quote into an invoice.'],
    tips: ['In a campaign you can switch on that an enquiry automatically creates a draft quote.'],
  },
  vertraege: {
    title: 'Contracts',
    summary: 'Store contracts with their terms and keep an eye on them.',
    steps: ['Open Contracts and create a new contract.', 'Enter partner, start, term and notice period.', 'Watch expiry dates in the list.'],
  },
  shop: {
    title: 'Shop',
    summary: 'Manage products and process orders.',
    steps: ['Open Shop and create products with price and description.', 'Orders appear in the list. Set the status once you have shipped.'],
  },
  portal: {
    title: 'Customer portal',
    summary: 'Your customers see their own quotes and invoices under /portal.',
    steps: ['Give your customers the portal address.', 'They log in with their email and only see their own documents.'],
  },
  projekte: {
    title: 'Projects and tasks',
    summary: 'Plan and work through tasks and milestones.',
    steps: ['Open Projects and create a project.', 'Add tasks with start, end and person responsible.', 'Mark tasks as done once they are finished.'],
  },
  planer: {
    title: 'Planner (Gantt)',
    summary: 'The timeline for your projects: bars, dependencies, progress and critical path, as in MS Project.',
    steps: [
      'Open Projects and switch to the "Planner" view.',
      'Drag a bar with the mouse to move the task. At the edges you change the duration, at the lower edge the progress. A double-click opens the task for editing.',
      'Set a dependency: drag from the dot at the right of a bar to another task. A task can have one predecessor. The successor starts at the earliest on the day after the predecessor ends and is pushed back automatically.',
      'Progress is kept in percent. The overall progress of the project is weighted by duration.',
      'With the "Critical path" checkbox you see the tasks without slack. If they slip, the project end moves.',
    ],
    tips: ['Cycles in the dependencies (A to B to A) are rejected.', 'Milestones have no duration and mark intermediate goals.'],
  },
  termine: {
    title: 'Appointments and calendar',
    summary: 'Your own calendar with appointment types and online booking. A Google calendar is no longer needed.',
    steps: ['Open Appointments. The calendar shows month, week and day.', 'Under "Appointment types" define what can be booked (duration, name).', 'Under "Settings" you set times and reminders.', 'You can add appointments to your phone calendar as an iCal subscription.'],
    tips: ['Before an appointment a reminder appears as a notice.'],
  },
  hr: {
    title: 'HR and jobs',
    summary: 'Manage employees, leave and open positions.',
    steps: ['Open HR and create employees.', 'Under Jobs you publish open positions. Applications appear in the list.'],
  },
  formulare: {
    title: 'Forms',
    summary: 'Build your own forms, embed them and collect responses.',
    steps: ['Open Forms and create a new form.', 'Add fields and save.', 'Embed the form on your website or share the link. Responses appear in the list and in the CRM.'],
  },
  analytics: {
    title: 'Analytics',
    summary: 'Figures on visitors and revenue.',
    steps: ['Open Analytics and choose the period.', 'Compare the figures with earlier periods.'],
  },
  marketing: {
    title: 'Marketing: campaigns and lead pages',
    summary: 'Plan campaigns and publish lead pages (landing pages) that collect enquiries.',
    steps: ['Open Marketing and create a campaign.', 'Create a lead page (/lead/…) with text, trust points and form.', 'Publish it. Enquiries land in the CRM.', 'Drafts are saved automatically.'],
    tips: ['Switch on bot protection under Settings if you receive a lot of spam.'],
  },
  'bot-schutz': {
    title: 'Bot protection (Cloudflare Turnstile)',
    summary: 'Protects forms, campaigns and account creation on your website from automated spam. Visitors usually do not notice anything.',
    steps: ['Open Settings and the "Bot protection" tab.', 'Switch the protection on for the areas you want.', 'If it fails, the visitor sees a friendly message and can try again.'],
  },
  newsletter: {
    title: 'Newsletter',
    summary: 'Collect subscribers and send bulk emails.',
    steps: ['Open Newsletter and create an issue.', 'Write the text and first send a test to yourself.', 'Send to the subscribers. Recipients can unsubscribe through a link.'],
  },
  blog: {
    title: 'Managing the blog',
    summary: 'Write posts, add tags and moderate comments.',
    steps: ['Open Blog and click "New post".', 'Enter title, text, tags and author. The author is visible to readers.', 'Publish. Visitors can filter by tag (/blog?tag=…).', 'In the "Comments" tab you switch comments on or off and moderate them.'],
    tips: ['Only visitors with an account may comment (registration with email confirmation). You can switch the feature off at any time.'],
  },
  seo: {
    title: 'SEO / GEO',
    summary: 'Helps you to be found better in search engines and AI answers.',
    steps: ['Open SEO / GEO and check the notes on title, description and structure.', 'Apply the recommendations on your pages.'],
  },
  leistungen: {
    title: 'Services (catalogue)',
    summary: 'Maintain your services and prices once and reuse them everywhere.',
    steps: ['Open "Services" in the sidebar.', 'Create services with name, description and price.', 'Select them in invoices and quotes.'],
  },
  branchen: {
    title: 'Activating industry packages',
    summary: 'Additional modules for your industry: automotive, retail, hospitality, trades, real estate, hair & beauty, holiday rentals, fitness & sport, education & courses, events, cleaning & facility services, clubs and taxi & transport.',
    steps: ['Open the Module Store.', 'Switch on the matching industry package. It appears in the sidebar under "INDUSTRY".', 'You can choose which packages are shown on your start page.'],
  },
  fewo: {
    title: 'Holiday rentals',
    summary: 'Manage apartments, bookings and occupancy, including synchronisation over iCal (for example Booking.com).',
    steps: ['Open Holiday rentals and create your apartments.', 'Enter bookings or have them synchronised through an iCal link.', 'The occupancy plan shows free and booked days.'],
  },
  automotive: { title: 'Automotive', summary: 'Manage vehicles and workshop orders.', steps: ['Open Automotive.', 'Create vehicles and link them to customers and orders.'] },
  retail: { title: 'Retail', summary: 'Articles and stock for the shop.', steps: ['Open Retail.', 'Maintain articles and check the stock.'] },
  gastro: { title: 'Hospitality', summary: 'Menu, reservations and tables.', steps: ['Open Hospitality.', 'Maintain the menu and take reservations.'] },
  handwerk: { title: 'Trades', summary: 'Jobs, building sites and materials.', steps: ['Open Trades.', 'Create jobs and record their status.'] },
  immobilien: { title: 'Real estate', summary: 'Properties and prospects.', steps: ['Open Real estate.', 'Create properties and link prospects.'] },
  'nexora-ueberblick': {
    title: 'What is Nexora?',
    summary: 'Nexora is the website engine: your public website fetches pages, blog, contact form and support content from Plexora. You maintain everything in one place.',
    steps: ['Open "Website" in the sidebar.', 'Create pages, edit texts and publish.', 'The changes are visible on your website immediately.'],
  },
  'nexora-seiten': {
    title: 'Creating pages with HTML',
    summary: 'A page can be text or a complete HTML document.',
    steps: ['Create a new page in the website editor.', 'Paste your text or your HTML.', 'A complete HTML document is shown 1:1 and isolated: it has full width, and its CSS does not affect the rest of the website.'],
    tips: ['For security reasons, scripts in an embedded HTML document are not executed.'],
  },
  'nexora-blog': {
    title: 'Blog and comments on the website',
    summary: 'Visitors read posts, filter by tag and can comment if you switch that on.',
    steps: ['Visitors click a tag and see all posts for it.', 'To comment, a visitor creates an account and confirms their email.', 'You can switch off or delete comments in the blog area in Plexora at any time.'],
    faq: [{ q: 'Can visitors delete their account?', a: 'Yes. Visitors can delete their account themselves and reset a forgotten password.' }],
  },
  'nexora-startseite': {
    title: 'Start page and design',
    summary: 'You set the colours of the start page (for example background and text) and the selection of industry packages in the settings.',
    steps: ['Open Settings, "Start page (design)" tab.', 'Choose background and text colour.', 'Choose which industry packages appear on the start page.'],
  },
  einstellungen: {
    title: 'Settings',
    summary: 'Central settings in tabs: company, video, start page (design), bot protection, email templates, team, testimonials and more.',
    steps: ['Open Settings.', 'Switch between the tabs at the top.', 'Save every change with the save button of the tab.'],
  },
  mailvorlagen: {
    title: 'Email templates',
    summary: 'Adjust the texts of the emails that Plexora sends for you.',
    steps: ['Open Settings, "Email templates" tab.', 'Choose the template and adjust subject and text.'],
  },
  rechnungsdesign: {
    title: 'Invoice design',
    summary: 'Logo, colours and footer of your invoices.',
    steps: ['Open Invoice design.', 'Upload your logo and choose colours.', 'The preview shows what the invoice looks like.'],
  },
  store: {
    title: 'Module Store',
    summary: 'Here you switch modules and industry packages on and off.',
    steps: ['Open the Module Store.', 'Switch a module on or off. Locked modules belong to a higher plan.'],
  },
  'eigene-module': {
    title: 'Adding your own modules',
    summary: 'You can add small modules of your own (for example lists or checklists) as zero-deploy plugins. Larger modules are built into Plexora.',
    steps: [
      'Write the module as an .mjs file following the template docs/vorlagen/plugin-vorlage.mjs and put it on an https address you trust.',
      'Open the Module Store, "Industry packages" tab, and click "Register new module" (platform admins only).',
      'Enter key, name, icon, price, description and the address of the file. It then appears in the sidebar under "INDUSTRY".',
    ],
    tips: ['The module may only read and store data through the provided functions (at most 200 KB) and should use the colours of the theme.', 'Plugins run with your session: only enter code from your own, trusted source.'],
  },
  psc: {
    title: 'PSC Manager (security centre)',
    summary: 'The security centre of the platform operator: state of the platform, protection, backup and emergency preparedness at a glance. Visible to the operator only.',
    steps: [
      'Open "PSC Manager" in the sidebar under System.',
      'The overview shows the platform monitor: concurrent executions, requests of the last 24 hours with throttles and errors, the database (tables, records, recovery) and the function.',
      'Below are tiles for protection (roles, plan, login), demo pool, full backup and emergency readiness, plus a list of notes on what is still to do.',
      'The "Infrastructure" and "Data integrity" tabs contain what used to be in the settings. "Backup & emergency" shows the path to a fallback system on PostgreSQL or MySQL.',
    ],
    tips: ['The values come live from AWS and are refreshed every minute. If a section lacks a permission, it says "not available" and the rest keeps working.'],
  },
  team: {
    title: 'Managing the team',
    summary: 'Invite people, change roles and see who may do what.',
    steps: ['Open Team and click "Invite member".', 'Enter the email and choose the role. The person gets an invitation link.', 'Later you can change the role in the list.'],
  },
  profil: {
    title: 'Profile and login',
    summary: 'Change name, picture and password. You can log in with email and password or with Google.',
    steps: ['Click your name at the top right and then "Profile".', 'Change your details and profile picture.', 'After a long period of inactivity you are logged out automatically for security.'],
    faq: [{ q: 'I forgot my password.', a: 'Choose "Forgot password" on the login page. You will get an email with a link.' }],
  },
}

/** Branchen-Baukasten: englischer Name, Beschreibung und Schritte je Paket */
export const EN_KIT: Record<string, { name: string; desc: string; steps: string[] }> = {
  fitness: {
    name: 'Fitness & Sport',
    desc: 'Members, staff and trainers, courses with sign-up, trial sessions and a fee list for studios and sports providers.',
    steps: ['Create members with plan and status, and your staff and trainers under "Staff & trainers".', 'Record courses with instructor, weekday, time and places and enter sign-ups.', 'Trial sessions pass through the stages new, arranged, attended and member.', 'The fee list shows per month who has paid. You keep writing invoices under Finance.'],
  },
  bildung: {
    name: 'Education & Courses',
    desc: 'Participants, teachers, course dates, attendance and a fee list for tutoring, driving schools and music schools.',
    steps: ['Create participants and teachers.', 'Plan course dates with date, time, place and teacher.', 'Record attendance for each date.', 'The fee list shows open and paid fees.'],
  },
  events: {
    name: 'Events',
    desc: 'Plan events, record registrations and tickets and keep attendee lists.',
    steps: ['Create an event with date, place and number of seats.', 'Record registrations with ticket type and quantity.', 'The registrations are your attendee list: it can be searched by event.'],
  },
  reinigung: {
    name: 'Cleaning & Facility Services',
    desc: 'Sites, staff, job scheduling and time sheets for cleaning and facility services.',
    steps: ['Create the sites with address and contact, and your staff.', 'Plan jobs with date, site and staff member.', 'Record time sheets per staff member and site. The total of the hours is shown below the table.'],
  },
  vereine: {
    name: 'Club',
    desc: 'Members, fees and dates for clubs.',
    steps: ['Create members with entry date and fee type.', 'Keep the fee list: who has paid for which year.', 'Enter club dates such as meetings and parties.'],
  },
  taxi: {
    name: 'Taxi & Transport',
    desc: 'Vehicles, drivers and trips for taxis, hire cars and transport services.',
    steps: ['Create vehicles and drivers.', 'Record trips with date, pick-up, destination, driver and vehicle.', 'Set the status (open, under way, done). The total price of the completed trips is shown below the table.'],
  },
}
export const EN_KIT_FIRST_STEP = 'Switch the package on in the Module Store. It appears in the sidebar under "INDUSTRY".'
export const EN_KIT_TIPS = [
  'The package keeps lists and records. It does not book money and does not issue invoices; you write invoices under Finance.',
  'Only the fields of the lists are stored. Do not enter health data or other particularly sensitive data.',
]

export const EN_TIPS: Record<string, string> = {
  rollen: 'Owner may do everything, Admin manages business areas, Member works in day-to-day business. Roles are currently only observed, not yet enforced.',
  gantt: 'Dragging a bar moves the task, the edges change start and end. Successors are pushed back automatically.',
  kritisch: 'Critical path: tasks without slack. If one of them slips, the project end moves.',
  botschutz: 'Cloudflare Turnstile unobtrusively checks whether a human submits the form. Without protection, robots can send spam.',
  angebot: 'The customer gets a personal link, sees the quote and can accept it online.',
  kommentare: 'Only visitors with a confirmed account may comment. You can switch the feature off at any time.',
  ical: 'With the iCal link you synchronise bookings with other portals, for example Booking.com.',
  erechnung: 'ZUGFeRD is a PDF with an embedded invoice file, XRechnung a pure XML file (for authorities). Both follow the European standard EN 16931. For this you need the company address, VAT ID or tax number, IBAN and a contact person.',
  modulstore: 'Locked modules belong to a higher plan. Switched-off modules keep their data.',
  entwurf: 'Drafts are saved automatically. They only become public once published.',
  tags: 'Visitors can click a tag and see all posts for it.',
}

export const EN_TOUR: Array<{ title: string; text: string }> = [
  { title: 'Welcome to Plexora', text: 'Plexora is your office in the browser: customers, invoices, projects, appointments, marketing and your website in one place. This short introduction shows you the most important spots.' },
  { title: 'The sidebar', text: 'On the left you choose the area: Overview, Modules, Industry and System. What you see there depends on your plan, your switched-on modules and your role.' },
  { title: 'Quick create with "New"', text: 'At the top right, "New" creates customers, quotes, tasks and appointments in one step. This way you start quickly without searching through menus first.' },
  { title: 'Customers, quotes, invoices', text: 'Create customers in the CRM, write quotes and invoices under Finance and let customers accept and pay online.' },
  { title: 'Projects and appointments', text: 'Plan projects in the planner with bars, dependencies and progress. You manage appointments and online booking in your own calendar.' },
  { title: 'Marketing and website', text: 'With lead pages, newsletter and blog you win customers. Nexora, the website engine, shows your content on your public website.' },
  { title: 'Help is always there', text: 'The question mark at the top right opens the help for the current page. Small question marks next to settings explain details. You can find this introduction in the help at any time.' },
]

/** Beschriftungen der Hilfe-Seite und der Einführung */
export const HELP_UI = {
  de: {
    title: 'Hilfe', titleAccent: '& Anleitungen', subtitle: 'Funktionen von Plexora und Nexora erklärt: was sie tun und wie man sie bedient',
    tour: 'Einführung starten', search: 'Suchen, zum Beispiel „Rechnung“, „Gantt“ oder „Rollen“', searchLabel: 'Hilfe durchsuchen', topics: 'Themen', all: 'Alle Themen',
    none: 'Dazu gibt es keinen Treffer. Versuche ein anderes Wort oder wähle links ein Thema.', from: 'ab', how: 'So geht’s', good: 'Gut zu wissen', faq: 'Häufige Fragen', goto: 'Zur Seite',
    skip: 'Überspringen', back: 'Zurück', next: 'Weiter', done: 'Fertig',
  },
  en: {
    title: 'Help', titleAccent: '& guides', subtitle: 'Functions of Plexora and Nexora explained: what they do and how to use them',
    tour: 'Start introduction', search: 'Search, for example "invoice", "Gantt" or "roles"', searchLabel: 'Search help', topics: 'Topics', all: 'All topics',
    none: 'No match found. Try another word or choose a topic on the left.', from: 'from', how: 'How it works', good: 'Good to know', faq: 'Frequently asked questions', goto: 'Go to page',
    skip: 'Skip', back: 'Back', next: 'Next', done: 'Done',
  },
} as const
