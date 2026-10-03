import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { decryptSecret } from '../../utils/crypto'

// Lädt die öffentlichen GitHub-Repos entweder mit einem frisch eingegebenen PAT (Body)
// oder, falls keins mitgeschickt wurde, mit dem bereits gespeicherten (serverseitig
// entschlüsselt) — der PAT selbst verlässt den Server dabei nie in Richtung Browser.
export default defineEventHandler(async (event) => {
  const email = event.context.auth?.email || ''
  if (!email) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = await readBody(event)
  const dynamo = getDynamoClient()

  const res = await dynamo.send(new ScanCommand({
    TableName: 'plexora-nexora',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  }))
  const item = res.Items?.[0]
  if (!item) throw createError({ statusCode: 404, message: 'Nexora Tenant nicht gefunden' })

  let pat = (body?.githubPat || '').trim()
  if (!pat) {
    if (!item.githubPatEncrypted) throw createError({ statusCode: 400, message: 'Kein GitHub PAT hinterlegt' })
    pat = decryptSecret(item.githubPatEncrypted)
  }

  try {
    const repos = await $fetch<any[]>('https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member', {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
    const repoList = repos
      .filter((r: any) => !r.private)
      .map((r: any) => ({ name: r.name, description: r.description || '', language: r.language || '', stars: r.stargazers_count }))
    return { repos: repoList }
  } catch (err: any) {
    const status = err?.response?.status
    const ghMessage = err?.data?.message || err?.response?._data?.message
    throw createError({
      statusCode: 400,
      message: ghMessage
        ? `GitHub: ${ghMessage}`
        : status === 401
          ? 'GitHub PAT ungültig oder abgelaufen.'
          : status === 403
            ? 'Zugriff verweigert (Rate-Limit erreicht oder PAT benötigt SSO-Autorisierung für die Organisation).'
            : 'Fehler beim Laden der Repos.',
    })
  }
})
