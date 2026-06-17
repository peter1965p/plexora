export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { slug, formId, utmSource, utmMedium, utmCampaign } = body

  if (!slug || !formId) return { success: false, message: 'slug und formId erforderlich' }

  const token = process.env.GITHUB_TOKEN
  const repo  = process.env.GITHUB_REPO || 'peter1965p/plexora'

  if (!token) throw createError({ statusCode: 500, message: 'GITHUB_TOKEN nicht gesetzt' })

  const fileRes = await fetch(`https://api.github.com/repos/${repo}/contents/public/_redirects`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' }
  })
  if (!fileRes.ok) throw createError({ statusCode: 500, message: 'Konnte _redirects nicht lesen' })

  const fileData = await fileRes.json() as any
  const currentContent = Buffer.from(fileData.content, 'base64').toString('utf-8')

  if (currentContent.includes(`/${slug} `)) {
    return { success: true, message: 'Slug bereits vorhanden' }
  }

  const params = new URLSearchParams()
  if (utmSource)   params.set('utm_source', utmSource)
  if (utmMedium)   params.set('utm_medium', utmMedium)
  if (utmCampaign) params.set('utm_campaign', utmCampaign)
  const query  = params.toString()
  const target = `https://plexora.paeffgen-it.de/lead/${formId}${query ? '?' + query : ''}`
  const newContent = currentContent.trimEnd() + `\n/${slug} ${target} 302\n`
  const encoded    = Buffer.from(newContent).toString('base64')

  const updateRes = await fetch(`https://api.github.com/repos/${repo}/contents/public/_redirects`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `Marketing: Vanity-Slug /${slug} hinzugefügt`,
      content: encoded,
      sha: fileData.sha,
    })
  })

  if (!updateRes.ok) {
    const err = await updateRes.json() as any
    throw createError({ statusCode: 500, message: err.message || 'GitHub-Commit fehlgeschlagen' })
  }

  return { success: true, message: `/${slug} → ${target} eingetragen` }
})
