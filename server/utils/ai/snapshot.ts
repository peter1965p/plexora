import { queryByUser, getUserId } from '../queryByUser'

// Kompakte Momentaufnahme der Geschäftsdaten eines Tenants (CRM/Finanzen/Support),
// als Kontext für Assistent & Insights. Bewusst nur Zahlen/Kurzlisten, keine
// Rohdaten — hält den Prompt klein und die Kosten pro Anfrage niedrig.
export async function buildBusinessSnapshot(event: any) {
  const userId = getUserId(event)
  const [contacts, deals, finance, support] = await Promise.all([
    queryByUser('plexora-contacts', userId, event),
    queryByUser('plexora-deals', userId, event),
    queryByUser('plexora-finance', userId, event),
    queryByUser('plexora-support', userId, event),
  ])

  const leads = contacts.filter((c: any) => c.status === 'lead').length
  const customers = contacts.filter((c: any) => c.status === 'customer').length

  const openDeals = deals.filter((d: any) => d.status !== 'won' && d.status !== 'lost')
  const pipelineValue = openDeals.reduce((sum: number, d: any) => sum + (Number(d.value) || 0) * (Number(d.prob) || 0) / 100, 0)

  const openInvoices = finance.filter((f: any) => f.status === 'pending' || f.status?.startsWith('dunning'))
  const overdueInvoices = finance.filter((f: any) => f.status === 'overdue')
  const openAmount = openInvoices.reduce((sum: number, f: any) => sum + (Number(f.amount) || 0), 0)
  const overdueAmount = overdueInvoices.reduce((sum: number, f: any) => sum + (Number(f.amount) || 0), 0)

  const openTickets = support.filter((s: any) => s.status === 'open' || s.status === 'in_progress')
  const highPriorityTickets = openTickets.filter((s: any) => s.priority === 'high' || s.priority === 'urgent')

  const summary = {
    leads, customers,
    openDealsCount: openDeals.length, pipelineValue: Math.round(pipelineValue),
    openInvoicesCount: openInvoices.length, openAmount: Math.round(openAmount),
    overdueInvoicesCount: overdueInvoices.length, overdueAmount: Math.round(overdueAmount),
    openTicketsCount: openTickets.length, highPriorityTicketsCount: highPriorityTickets.length,
  }

  const text = `Aktuelle Geschäftsdaten (Momentaufnahme):
- Leads: ${summary.leads}, Kunden: ${summary.customers}
- Offene Deals: ${summary.openDealsCount} (gewichteter Pipeline-Wert: ${summary.pipelineValue}€)
- Offene Rechnungen: ${summary.openInvoicesCount} (Summe: ${summary.openAmount}€)
- Überfällige Rechnungen: ${summary.overdueInvoicesCount} (Summe: ${summary.overdueAmount}€)
- Offene Support-Tickets: ${summary.openTicketsCount} (davon ${summary.highPriorityTicketsCount} mit hoher Priorität)`

  return { summary, text }
}
