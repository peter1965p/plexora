import { getDemoStats } from '../../utils/demoTracker'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const userId = getQuery(event).userId as string

  if (!userId || userId !== config.adminEmail) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  return getDemoStats()
})
