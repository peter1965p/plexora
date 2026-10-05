// SPA-Fallback mit Status 200: Die Nuxt-App rendert alle client-seitigen Routen (z. B. /lead/:slug,
// /termine) selbst. Cloudflare Pages liefert für diese Pfade sonst 404 aus, obwohl die App sie zeigt.
// Googles Prüfer und Werbenetzwerke (Facebook) werten den Statuscode aus.
//
// WICHTIG: Hier muss die neutrale App-Hülle (/200) ausgeliefert werden, NICHT /index.html.
// index.html ist die vorgerenderte Startseite; Nuxt würde damit die Route "/" annehmen und
// nach jedem Neuladen (F5) auf die Startseite springen.
export async function onRequest(context) {
  const response = await context.next()
  if (response.status !== 404) return response

  const accept = context.request.headers.get('accept') || ''
  if (!accept.includes('text/html')) return response

  const shell = await context.env.ASSETS.fetch(new URL('/200', context.request.url))
  if (shell.status !== 200) return response
  return new Response(shell.body, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' },
  })
}
