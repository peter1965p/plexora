import { queryByUser, getUserId } from '../../utils/queryByUser'

export default defineEventHandler(async (event) => {
  const items = await queryByUser('plexora-cashbook', getUserId(event))
  const sorted = (items as any[]).sort((a, b) => b.date.localeCompare(a.date))
  let balance = 0
  const withBalance = sorted.slice().reverse().map((e: any) => {
    balance += Number(e.amount) || 0
    return { ...e, balance: Math.round(balance * 100) / 100 }
  }).reverse()
  return { entries: withBalance }
})
