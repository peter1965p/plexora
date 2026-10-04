// SPA-Fallback mit Status 200: Die Nuxt-App rendert alle client-seitigen Routen (z. B. /lead/:slug,
// /termine) selbst. Cloudflare Pages liefert für diese Pfade sonst 404 aus, obwohl die App sie zeigt.
// Googles Prüfer und Werbenetzwerke (Facebook) werten den Statuscode aus.
export async function onRequest(context) {
  const response = await context.next()
  if (response.status !== 404) return response

  const accept = context.request.headers.get('accept') || ''
  if (!accept.includes('text/html')) return response

  const shell = await context.env.ASSETS.fetch(new URL('/index.html', context.request.url))
  return new Response(shell.body, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' },
  })
}
