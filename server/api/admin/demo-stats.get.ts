import { getDemoStats } from '../../utils/demoTracker'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const email = getQuery(event).email as string

  if (!email || email !== config.adminEmail) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  return getDemoStats()
})
