import { queryByUser, getUserId } from '../../utils/queryByUser'
export default defineEventHandler(async (event) => {
  const items = await queryByUser('plexora-contracts', getUserId(event), event)
  return { contracts: items }
})
