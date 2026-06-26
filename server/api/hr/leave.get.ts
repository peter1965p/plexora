import { queryByUser, getUserId } from '../../utils/queryByUser'
export default defineEventHandler(async (event) => {
  const items = await queryByUser('plexora-leave', getUserId(event), event)
  return { requests: (items as any[]).sort((a, b) => b.created.localeCompare(a.created)) }
})
