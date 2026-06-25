/**
 * Demo Seed Script — füllt alle Plexora-Tabellen mit realistischen Testdaten
 * für userId = 'demo-user'
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'
import 'dotenv/config'

const raw = new DynamoDBClient({
  region: 'eu-central-1',
  credentials: {
    accessKeyId:     process.env.NUXT_AWS_ACCESS_KEY_ID?.replace(/"/g,''),
    secretAccessKey: process.env.NUXT_AWS_SECRET_ACCESS_KEY?.replace(/"/g,''),
  },
})
const db = DynamoDBDocumentClient.from(raw, { marshallOptions: { removeUndefinedValues: true } })
const put = (TableName, Item) => db.send(new PutCommand({ TableName, Item }))
const DEMO = 'demo-user'
const ago  = (days) => new Date(Date.now() - days * 86400000).toISOString()
const from = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0,10)

console.log('🌱 Seeding demo data...\n')

// ─── SUPPORT TICKETS ──────────────────────────────────────────────────────────
const tickets = [
  {
    ticketId: randomUUID(), userId: DEMO, portalToken: randomUUID(),
    title: 'Login funktioniert nach Update nicht mehr',
    client: 'Müller & Partner GmbH', clientEmail: 'info@mueller-partner.de',
    priority: 'critical', status: 'in_progress', assignee: 'Sarah K.',
    created: ago(2),
    comments: [
      { id: randomUUID(), author: 'Sarah K.', text: 'Danke für die Meldung! Wir schauen uns das sofort an.', created: ago(2), isCustomer: false },
      { id: randomUUID(), author: 'Markus Müller', text: 'Das betrifft alle 5 unserer Accounts. Bitte dringend!', created: ago(1), isCustomer: true },
      { id: randomUUID(), author: 'Sarah K.', text: 'Wir haben das Problem isoliert — es liegt am Cache nach dem Update. Fix kommt heute Nachmittag.', created: ago(0.5), isCustomer: false },
    ],
  },
  {
    ticketId: randomUUID(), userId: DEMO, portalToken: randomUUID(),
    title: 'PDF-Rechnungsexport zeigt falsche MwSt.',
    client: 'TechStart Berlin', clientEmail: 'billing@techstart.de',
    priority: 'high', status: 'open', assignee: 'Max W.',
    created: ago(1),
    comments: [
      { id: randomUUID(), author: 'Max W.', text: 'Können Sie uns ein Beispiel-PDF zusenden?', created: ago(0.8), isCustomer: false },
    ],
  },
  {
    ticketId: randomUUID(), userId: DEMO, portalToken: randomUUID(),
    title: 'Excel-Export enthält leere Spalten',
    client: 'Handwerk & Service AG', clientEmail: 'support@hwservice.de',
    priority: 'medium', status: 'resolved', assignee: 'Lisa T.',
    created: ago(5),
    comments: [
      { id: randomUUID(), author: 'Lisa T.', text: 'Reproduziert. Wir beheben das im nächsten Release.', created: ago(4), isCustomer: false },
      { id: randomUUID(), author: 'Lisa T.', text: 'Fix deployed! Bitte erneut versuchen.', created: ago(1), isCustomer: false },
      { id: randomUUID(), author: 'Jana S.', text: 'Perfekt, funktioniert jetzt! Danke!', created: ago(0.5), isCustomer: true },
    ],
  },
  {
    ticketId: randomUUID(), userId: DEMO, portalToken: randomUUID(),
    title: 'Dashboard lädt sehr langsam (> 10 Sek.)',
    client: 'Kreativbüro Zink', clientEmail: 'info@kreativzink.de',
    priority: 'medium', status: 'open', assignee: '',
    created: ago(0.5),
    comments: [],
  },
  {
    ticketId: randomUUID(), userId: DEMO, portalToken: randomUUID(),
    title: 'Neue Teammitglieder können keine Aufgaben sehen',
    client: 'Logistics Pro GmbH', clientEmail: 'it@logpro.de',
    priority: 'high', status: 'in_progress', assignee: 'Max W.',
    created: ago(3),
    comments: [
      { id: randomUUID(), author: 'Max W.', text: 'Liegt an fehlenden Team-Berechtigungen. Wir prüfen das.', created: ago(2), isCustomer: false },
    ],
  },
]
for (const t of tickets) {
  await put('plexora-support', t)
}
console.log(`✅ Support: ${tickets.length} Tickets mit Kommentaren`)

// ─── PROJEKTE — Tasks + Deadlines für Gantt ───────────────────────────────────
const scan = await db.send(new ScanCommand({ TableName: 'plexora-projects', FilterExpression: 'userId = :u', ExpressionAttributeValues: { ':u': DEMO } }))
const existingProjects = scan.Items || []

// Bestehende Projekte mit Deadline + Tasks updaten wenn möglich
for (const p of existingProjects.slice(0, 3)) {
  const tasks = [
    { taskId: randomUUID(), title: 'Anforderungsanalyse', assignee: 'Team', startDate: ago(20).slice(0,10), endDate: ago(10).slice(0,10), status: 'done', priority: 'high', estimatedHours: 8, loggedHours: 7.5, subtasks: [{ id: randomUUID(), text: 'Stakeholder-Interview', done: true }, { id: randomUUID(), text: 'Use-Cases dokumentieren', done: true }], comments: [{ id: randomUUID(), author: 'Team', text: 'Alle Anforderungen sind klar. Weiter!', created: ago(10) }] },
    { taskId: randomUUID(), title: 'Design & Konzept', assignee: 'Anna M.', startDate: ago(10).slice(0,10), endDate: from(5), status: 'doing', priority: 'medium', estimatedHours: 12, loggedHours: 6, subtasks: [{ id: randomUUID(), text: 'Wireframes erstellen', done: true }, { id: randomUUID(), text: 'Farbkonzept abstimmen', done: false }], comments: [] },
    { taskId: randomUUID(), title: 'Implementierung', assignee: 'Dev-Team', startDate: from(5), endDate: from(25), status: 'todo', priority: 'high', estimatedHours: 40, loggedHours: 0, subtasks: [], comments: [] },
  ]
  await db.send(new UpdateCommand({
    TableName: 'plexora-projects',
    Key: { userId: p.userId, projectId: p.projectId },
    UpdateExpression: 'SET deadline = :d, tasks = :t, progress = :p',
    ExpressionAttributeValues: { ':d': from(30), ':t': tasks, ':p': 35 },
  }))
}

// Neue Demo-Projekte falls zu wenige vorhanden
if (existingProjects.length < 2) {
  const newProjects = [
    { userId: DEMO, projectId: randomUUID(), name: 'Website Relaunch', description: 'Komplette Neugestaltung der Unternehmenswebsite', status: 'active', priority: 'high', deadline: from(45), progress: 40, team: 'Design & Dev', created: ago(30), tasks: [
      { taskId: randomUUID(), title: 'Konzept & Wireframes', assignee: 'Anna', startDate: ago(25).slice(0,10), endDate: ago(10).slice(0,10), status: 'done', priority: 'high', estimatedHours: 10, loggedHours: 9, subtasks: [], comments: [] },
      { taskId: randomUUID(), title: 'Frontend-Entwicklung', assignee: 'Dev-Team', startDate: ago(10).slice(0,10), endDate: from(20), status: 'doing', priority: 'high', estimatedHours: 30, loggedHours: 12, subtasks: [{ id: randomUUID(), text: 'Header & Navigation', done: true }, { id: randomUUID(), text: 'Landingpage', done: false }], comments: [{ id: randomUUID(), author: 'Dev-Team', text: 'Header steht, jetzt Unterseiten.', created: ago(2) }] },
    ]},
    { userId: DEMO, projectId: randomUUID(), name: 'CRM Migration', description: 'Datenübertragung aus altem System', status: 'review', priority: 'critical', deadline: from(15), progress: 80, team: 'IT', created: ago(60), tasks: [
      { taskId: randomUUID(), title: 'Datenmapping', assignee: 'IT-Team', startDate: ago(50).slice(0,10), endDate: ago(20).slice(0,10), status: 'done', priority: 'critical', estimatedHours: 20, loggedHours: 22, subtasks: [], comments: [] },
      { taskId: randomUUID(), title: 'Test & Abnahme', assignee: 'Max', startDate: ago(5).slice(0,10), endDate: from(15), status: 'doing', priority: 'high', estimatedHours: 8, loggedHours: 3, subtasks: [{ id: randomUUID(), text: 'Testdaten prüfen', done: true }, { id: randomUUID(), text: 'Abnahmeprotokoll', done: false }], comments: [] },
    ]},
  ]
  for (const p of newProjects) await put('plexora-projects', p)
  console.log(`✅ Projekte: ${newProjects.length} neue mit Gantt-Daten`)
} else {
  console.log(`✅ Projekte: ${Math.min(existingProjects.length, 3)} bestehende mit Tasks + Deadlines geupdated`)
}

// ─── KASSENBUCH ───────────────────────────────────────────────────────────────
const cashEntries = [
  { cashId: randomUUID(), userId: DEMO, date: ago(30).slice(0,10), description: 'Büromaterial Staples', amount: -87.50, type: 'ausgabe', created: ago(30) },
  { cashId: randomUUID(), userId: DEMO, date: ago(28).slice(0,10), description: 'Bareinzahlung Kundenzahlung Schmidt GmbH', amount: 2400.00, type: 'einnahme', created: ago(28) },
  { cashId: randomUUID(), userId: DEMO, date: ago(25).slice(0,10), description: 'Taxi Kundentermin', amount: -34.00, type: 'ausgabe', created: ago(25) },
  { cashId: randomUUID(), userId: DEMO, date: ago(20).slice(0,10), description: 'Bewirtung Geschäftsessen', amount: -156.80, type: 'ausgabe', created: ago(20) },
  { cashId: randomUUID(), userId: DEMO, date: ago(18).slice(0,10), description: 'Bareinzahlung Messeeinnahmen', amount: 850.00, type: 'einnahme', created: ago(18) },
  { cashId: randomUUID(), userId: DEMO, date: ago(15).slice(0,10), description: 'Portokosten', amount: -12.40, type: 'ausgabe', created: ago(15) },
  { cashId: randomUUID(), userId: DEMO, date: ago(12).slice(0,10), description: 'Druckerpatronen', amount: -67.90, type: 'ausgabe', created: ago(12) },
  { cashId: randomUUID(), userId: DEMO, date: ago(8).slice(0,10), description: 'Bareinzahlung Erstattung Reisekosten', amount: 320.00, type: 'einnahme', created: ago(8) },
  { cashId: randomUUID(), userId: DEMO, date: ago(5).slice(0,10), description: 'Kaffee & Catering Teammeeting', amount: -45.30, type: 'ausgabe', created: ago(5) },
  { cashId: randomUUID(), userId: DEMO, date: ago(2).slice(0,10), description: 'Bareinzahlung Kleinkunde', amount: 180.00, type: 'einnahme', created: ago(2) },
]
for (const e of cashEntries) await put('plexora-cashbook', e)
console.log(`✅ Kassenbuch: ${cashEntries.length} Einträge`)

// ─── URLAUBSANTRÄGE ───────────────────────────────────────────────────────────
const hrScan = await db.send(new ScanCommand({ TableName: 'plexora-hr', FilterExpression: 'userId = :u', ExpressionAttributeValues: { ':u': DEMO } }))
const employees = hrScan.Items || []
const empNames = employees.slice(0,4).map(e => ({ id: e.employeeId, name: `${e.firstName} ${e.lastName}` }))
const fallbackEmps = [
  { id: 'emp-1', name: 'Max Mustermann' },
  { id: 'emp-2', name: 'Anna Schmidt' },
  { id: 'emp-3', name: 'Thomas Meier' },
]
const useEmps = empNames.length >= 2 ? empNames : fallbackEmps

const leaveRequests = [
  { leaveId: randomUUID(), userId: DEMO, employeeId: useEmps[0].id, employeeName: useEmps[0].name, type: 'vacation', startDate: from(10), endDate: from(17), reason: 'Sommerurlaub', status: 'pending', created: ago(3) },
  { leaveId: randomUUID(), userId: DEMO, employeeId: useEmps[1%useEmps.length].id, employeeName: useEmps[1%useEmps.length].name, type: 'sick', startDate: ago(2).slice(0,10), endDate: ago(0).slice(0,10), reason: 'Erkältung', status: 'approved', created: ago(3) },
  { leaveId: randomUUID(), userId: DEMO, employeeId: useEmps[0].id, employeeName: useEmps[0].name, type: 'remote', startDate: from(1), endDate: from(2), reason: 'Homeoffice-Woche', status: 'approved', created: ago(1) },
  { leaveId: randomUUID(), userId: DEMO, employeeId: useEmps[1%useEmps.length].id, employeeName: useEmps[1%useEmps.length].name, type: 'vacation', startDate: from(30), endDate: from(40), reason: 'Familienurlaub', status: 'rejected', created: ago(5) },
]
for (const r of leaveRequests) await put('plexora-leave', r)
console.log(`✅ Urlaub: ${leaveRequests.length} Anträge`)

// ─── HR ZEITERFASSUNG ─────────────────────────────────────────────────────────
const today = new Date()
const timeEntries = Array.from({ length: 10 }, (_, i) => {
  const d = new Date(today); d.setDate(d.getDate() - i)
  const emp = useEmps[i % useEmps.length]
  const clockIn  = `0${8 + Math.floor(Math.random()*2)}:${Math.random()>0.5?'00':'30'}`.slice(-5)
  const clockOut = `1${6 + Math.floor(Math.random()*3)}:${Math.random()>0.5?'00':'30'}`.slice(-5)
  const [hi, mi] = clockIn.split(':').map(Number)
  const [ho, mo] = clockOut.split(':').map(Number)
  const minutes  = (ho*60+mo) - (hi*60+mi)
  return { logId: randomUUID(), userId: DEMO, employeeId: emp.id, employeeName: emp.name, date: d.toISOString().slice(0,10), clockIn, clockOut, minutes, note: ['Kundenprojekt A','Interne Meetings','Entwicklung','Dokumentation','Support'][i%5], created: d.toISOString() }
})
for (const e of timeEntries) await put('plexora-hr-timelog', e)
console.log(`✅ Zeiterfassung: ${timeEntries.length} Einträge`)

console.log('\n🎉 Demo-Seed abgeschlossen!')
