import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

interface GithubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  homepage: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  topics: string[]
  updated_at: string
  fork: boolean
  private: boolean
}

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=120',
  })

  const tenantId = getRouterParam(event, 'tenantId') || ''
  const dynamo   = getDynamoClient()

  const res = await dynamo.send(new GetCommand({
    TableName: 'plexora-nexora',
    Key: { tenantId },
  }))

  if (!res.Item || res.Item.status !== 'active') {
    throw createError({ statusCode: 404, message: 'Tenant not found' })
  }

  if (!res.Item.githubEnabled) {
    return { enabled: false, repos: [], title: 'PROJEKTE' }
  }

  const pat      = res.Item.githubPat      || ''
  const selected = res.Item.githubRepos    || []   // [] = alle, sonst Array von repo-Namen
  const title    = res.Item.githubTitle    || 'PROJEKTE'
  const showForks = res.Item.githubShowForks ?? false

  if (!pat) return { enabled: true, repos: [], title }

  try {
    const ghRes = await $fetch<GithubRepo[]>('https://api.github.com/user/repos?per_page=100&sort=updated&type=owner', {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    let repos = ghRes.filter(r => !r.private)
    if (!showForks) repos = repos.filter(r => !r.fork)
    if (selected.length > 0) repos = repos.filter(r => selected.includes(r.name))

    return {
      enabled: true,
      title,
      repos: repos.map(r => ({
        name:        r.name,
        description: r.description || '',
        url:         r.html_url,
        homepage:    r.homepage || '',
        language:    r.language || '',
        stars:       r.stargazers_count,
        forks:       r.forks_count,
        topics:      r.topics || [],
        updatedAt:   r.updated_at,
      })),
    }
  } catch {
    return { enabled: true, repos: [], title }
  }
})
