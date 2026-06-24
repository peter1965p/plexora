import { queryByUser, getUserId } from '../../utils/queryByUser'
export default defineEventHandler(async (event) => {
  const items = await queryByUser('plexora-campaigns', getUserId(event))
  return { campaigns: items }
})
