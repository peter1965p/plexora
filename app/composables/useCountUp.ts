/** Zahl zählt beim Erscheinen sanft hoch (nicht bei "weniger Bewegung", nicht auf dem Server). */
export function useCountUp(source: () => number, ms = 900) {
  const shown = ref(0)
  let raf = 0
  const run = (to: number) => {
    cancelAnimationFrame(raf)
    if (!import.meta.client || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !Number.isFinite(to)) { shown.value = to; return }
    const from = shown.value, t0 = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms)
      shown.value = from + (to - from) * (1 - Math.pow(1 - p, 3))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
  }
  onMounted(() => { run(source()); watch(source, run) })
  onBeforeUnmount(() => cancelAnimationFrame(raf))
  return shown
}
