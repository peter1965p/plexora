import { queryByUser, getUserId } from '../../utils/queryByUser'

export default defineEventHandler(async (event) => {
  const items = await queryByUser('plexora-bank-txn', getUserId(event))
  const sorted = (items as any[]).sort((a, b) => b.date.localeCompare(a.date))
  return { transactions: sorted }
})
