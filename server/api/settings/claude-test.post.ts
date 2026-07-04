export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const apiKey = body?.apiKey as string | undefined
  if (!apiKey) return { ok: false, error: 'Kein API-Key angegeben' }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    })
    if (res.ok) return { ok: true }
    const data = await res.json().catch(() => null) as any
    return { ok: false, error: data?.error?.message || `HTTP ${res.status}` }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Verbindung fehlgeschlagen' }
  }
})
