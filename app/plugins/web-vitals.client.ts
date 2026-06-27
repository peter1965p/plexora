import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals'

export default defineNuxtPlugin(() => {
  // Nur auf app.plexora.eu tracken, nicht auf der Marketing-Landing-Page
  if (!window.location.hostname.includes('plexora.eu') && !window.location.hostname.includes('localhost')) return

  const send = (metric: { name: string; value: number; rating: string }) => {
    const apiUrl = '/api/analytics/vitals'  // relativ → Cloudflare proxy, kein CORS
    const data = JSON.stringify({
      name:   metric.name,
      value:  metric.value,
      rating: metric.rating,
      path:   window.location.pathname,
    })
    if (navigator.sendBeacon) {
      // text/plain vermeidet CORS-Preflight (OPTIONS) — Server parst als JSON
      navigator.sendBeacon(apiUrl, new Blob([data], { type: 'text/plain' }))
    } else {
      fetch(apiUrl, { method: 'POST', body: data, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {})
    }
  }

  onCLS(send)
  onFCP(send)
  onINP(send)
  onLCP(send)
  onTTFB(send)
})
