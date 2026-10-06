import { draftContext, toHttpError } from '../../utils/drafts/context'
import { deleteDraft } from '../../utils/drafts/service'

// DELETE /api/drafts/:type – Entwurf verwerfen
export default defineEventHandler(async (event) => {
  try {
    const { owner, repo } = await draftContext(event)
    const type = getRouterParam(event, 'type') || ''
    await deleteDraft(repo, owner, type)
    return { success: true }
  } catch (e) { toHttpError(e) }
})
