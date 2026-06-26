import { queryByUser, getUserId } from '../../utils/queryByUser'
export default defineEventHandler(async (event) => {
  const items = await queryByUser('plexora-marketing', getUserId(event), event)
  return { campaigns: items }
})
