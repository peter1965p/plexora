import { queryByUser, getUserId } from '../../utils/queryByUser'
export default defineEventHandler(async (event) => {
  const items = await queryByUser('plexora-contacts', getUserId(event), event)
  return { contacts: items }
})
