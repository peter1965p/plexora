import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals'

export default defineNuxtPlugin(() => {
  const send = (metric: { name: string; value: number; rating: string }) => {
    const apiUrl = useApiUrl('/api/analytics/vitals')
    const data = JSON.stringify({
      name:   metric.name,
      value:  metric.value,
      rating: metric.rating,
      path:   window.location.pathname,
    })
    if (navigator.sendBeacon) {
      navigator.sendBeacon(apiUrl, new Blob([data], { type: 'application/json' }))
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
