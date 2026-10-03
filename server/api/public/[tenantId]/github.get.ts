import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { decryptSecret } from '../../../utils/crypto'

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
  default_branch: string
}

// Badge-/Shield-Bilder (Build-Status, Lizenz, npm-Version, ...) sind in fast jedem README
// die ERSTEN Bilder — die wollen wir nicht als "Projekt-Screenshot" anzeigen.
const BADGE_HOSTS = ['shields.io', 'badge.fury.io', 'travis-ci', 'codecov.io', 'coveralls.io', 'github.com/workflows', 'actions/workflows', 'img.shields.io']

function isBadgeImage(url: string): boolean {
  return BADGE_HOSTS.some(h => url.includes(h))
}

async function extractReadmeImage(fullName: string, defaultBranch: string, pat: string): Promise<string | null> {
  try {
    const raw = await $fetch<string>(`https://api.github.com/repos/${fullName}/readme`, {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/vnd.github.raw',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
    const matches = [...raw.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g), ...raw.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)]
    for (const m of matches) {
      let url = m[1]
      if (isBadgeImage(url)) continue
      if (!/^https?:\/\//i.test(url)) {
        url = `https://raw.githubusercontent.com/${fullName}/${defaultBranch}/${url.replace(/^\.?\//, '')}`
      }
      return url
    }
    return null
  } catch {
    return null
  }
}

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
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

  const selected = res.Item.githubRepos    || []   // [] = alle, sonst Array von repo-Namen
  const title    = res.Item.githubTitle    || 'PROJEKTE'
  const showForks = res.Item.githubShowForks ?? false

  if (!res.Item.githubPatEncrypted) return { enabled: true, repos: [], title }

  let pat: string
  try {
    pat = decryptSecret(res.Item.githubPatEncrypted)
  } catch {
    return { enabled: true, repos: [], title }
  }

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

    const images = await Promise.all(repos.map(r => extractReadmeImage(r.full_name, r.default_branch || 'main', pat)))

    return {
      enabled: true,
      title,
      repos: repos.map((r, i) => ({
        name:        r.name,
        description: r.description || '',
        url:         r.html_url,
        homepage:    r.homepage || '',
        language:    r.language || '',
        stars:       r.stargazers_count,
        forks:       r.forks_count,
        topics:      r.topics || [],
        updatedAt:   r.updated_at,
        imageUrl:    images[i] || '',
      })),
    }
  } catch {
    return { enabled: true, repos: [], title }
  }
})
