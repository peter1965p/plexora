import { queryByUser, getUserId } from '../../utils/queryByUser'
export default defineEventHandler(async (event) => {
  const items = await queryByUser('plexora-deals', getUserId(event), event)
  return { deals: items }
})
