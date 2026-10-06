import { draftContext, toHttpError } from '../../utils/drafts/context'
import { saveDraft } from '../../utils/drafts/service'

// PUT /api/drafts/:type – Upsert des eigenen Entwurfs. Nebenwirkungen: keine (nur Tabelle plexora-drafts).
export default defineEventHandler(async (event) => {
  try {
    const { owner, repo } = await draftContext(event)
    const type = getRouterParam(event, 'type') || ''
    const body = await readBody(event)
    return { draft: await saveDraft(repo, owner, type, body || {}) }
  } catch (e) { toHttpError(e) }
})
