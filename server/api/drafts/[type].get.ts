import { draftContext, toHttpError } from '../../utils/drafts/context'
import { getDraft } from '../../utils/drafts/service'

// GET /api/drafts/:type – eigener Entwurf des angemeldeten Nutzers (oder { draft: null })
export default defineEventHandler(async (event) => {
  try {
    const { owner, repo } = await draftContext(event)
    const type = getRouterParam(event, 'type') || ''
    return { draft: await getDraft(repo, owner, type) }
  } catch (e) { toHttpError(e) }
})
