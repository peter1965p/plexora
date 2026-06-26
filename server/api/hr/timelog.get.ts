import { queryByUser, getUserId } from '../../utils/queryByUser'
export default defineEventHandler(async (event) => {
  const items = await queryByUser('plexora-hr-timelog', getUserId(event), event)
  return { entries: (items as any[]).sort((a, b) => b.date.localeCompare(a.date)) }
})
