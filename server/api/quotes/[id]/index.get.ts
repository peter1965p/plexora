import { loadOwnedQuote, ownerView } from '../../../utils/quoteStore'
export default defineEventHandler(async (event) => ({ quote: ownerView((await loadOwnedQuote(event)).quote) }))
