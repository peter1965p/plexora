import { queryByUser, getUserId } from '../../utils/queryByUser'
export default defineEventHandler(async (event) => {
  const items = await queryByUser('plexora-companies', getUserId(event), event)
  return { companies: items }
})
