<template>
    <div class="card psc-top" :style="{ '--psc-line': lineColor }">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-database-cog" style="margin-right:8px;color:var(--accent)"></i>{{ tr('Datenintegrität') }}</span>
        <button class="accent-btn" style="height:32px;font-size:12px" @click="loadIntegrityScan" :disabled="integrityScanning">
          <i class="ti" :class="integrityScanning ? 'ti-loader-2 spin' : 'ti-search'"></i> {{ integrityScanning ? 'Scannt...' : 'Scan starten' }}
        </button>
      </div>
      <div class="card-body">
        <p style="font-size:12px;color:var(--text-muted);margin:0 0 20px">
          {{ tr('Sucht in allen userId-gescopten Tabellen nach Datensätzen, deren Besitzer noch eine rohe Cognito-ID statt der heutigen E-Mail-Identität ist (ein Artefakt aus der Zeit vor der aktuellen Konvention). Diese Datensätze sind für ihren echten Besitzer unsichtbar. Nichts wird automatisch verändert — erst nach Auswahl und expliziter Bestätigung unten.') }}
        </p>

        <div v-if="!integrityScanResult && !integrityScanning" style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px">
          {{ tr('Noch kein Scan durchgeführt.') }}
        </div>
        <div v-if="integrityScanning" style="padding:32px;text-align:center;color:var(--text-muted)"><i class="ti ti-loader-2 spin" style="font-size:24px"></i></div>

        <template v-if="integrityScanResult && !integrityScanning">
          <div v-if="!integrityScanResult.resolvable.length && !integrityScanResult.unresolvable.length"
            style="padding:24px;text-align:center;color:#00D4B4;font-size:13px">
            <i class="ti ti-circle-check"></i> {{ tr('Keine verwaisten Datensätze gefunden.') }}
          </div>

          <!-- Zuordenbare Funde -->
          <div v-if="integrityScanResult.resolvable.length" style="margin-bottom:24px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
              <div style="font-size:13px;font-weight:700">{{ tr('Zuordenbare Funde (') }}{{ integrityScanResult.resolvable.length }})</div>
              <button style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:12px" @click="toggleAllIntegrity">
                {{ allIntegritySelected ? 'Alle abwählen' : 'Alle auswählen' }}
              </button>
            </div>
            <div style="border:0.5px solid var(--border);border-radius:10px;overflow:hidden">
              <div v-for="g in integrityScanResult.resolvable" :key="integrityKey(g)"
                style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:0.5px solid var(--border)">
                <input type="checkbox" :checked="integritySelected.has(integrityKey(g))" @change="toggleIntegritySelection(g)" style="cursor:pointer" />
                <div style="flex:1;min-width:0">
                  <div style="font-size:13px;font-weight:600">{{ g.table.replace('plexora-','') }} <span style="color:var(--text-muted);font-weight:400">{{ tr('· Feld') }} {{ g.field }}</span></div>
                  <div style="font-size:11px;color:var(--text-muted);font-family:monospace;overflow:hidden;text-overflow:ellipsis">{{ g.legacyId }}</div>
                </div>
                <div style="font-size:12px;color:var(--text-muted);white-space:nowrap">{{ g.count }} {{ g.count === 1 ? 'Datensatz' : 'Datensätze' }}</div>
                <div style="display:flex;align-items:center;gap:6px;white-space:nowrap">
                  <i class="ti ti-arrow-right" style="color:var(--text-muted);font-size:12px"></i>
                  <span style="font-size:12px;font-weight:600;color:#00D4B4">{{ g.suggestedTarget }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Nicht zuordenbar -->
          <div v-if="integrityScanResult.unresolvable.length" style="margin-bottom:24px">
            <div style="font-size:13px;font-weight:700;margin-bottom:12px;color:var(--text-muted)">{{ tr('Nicht zuordenbar (') }}{{ integrityScanResult.unresolvable.length }})</div>
            <div style="border:0.5px solid var(--border);border-radius:10px;overflow:hidden;opacity:0.7">
              <div v-for="g in integrityScanResult.unresolvable" :key="integrityKey(g)"
                style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:0.5px solid var(--border)">
                <i class="ti ti-help-circle" style="color:var(--text-muted)"></i>
                <div style="flex:1;min-width:0">
                  <div style="font-size:13px;font-weight:600">{{ g.table.replace('plexora-','') }} <span style="color:var(--text-muted);font-weight:400">{{ tr('· Feld') }} {{ g.field }}</span></div>
                  <div style="font-size:11px;color:var(--text-muted);font-family:monospace">{{ g.legacyId }}</div>
                </div>
                <div style="font-size:12px;color:var(--text-muted);white-space:nowrap">{{ g.count }} {{ g.count === 1 ? 'Datensatz' : 'Datensätze' }}</div>
                <div style="font-size:11px;color:var(--text-muted)">{{ tr('Cognito-Nutzer nicht mehr auffindbar — manuelle Prüfung nötig') }}</div>
              </div>
            </div>
          </div>

          <button v-if="integrityScanResult.resolvable.length" class="accent-btn" style="background:#E05C5C" :disabled="!integritySelected.size || integrityMigrating" @click="runIntegrityMigration">
            <i class="ti" :class="integrityMigrating ? 'ti-loader-2 spin' : 'ti-arrow-move-right'"></i>
            {{ integrityMigrating ? 'Migriert...' : `Migration bestätigen & ausführen (${integritySelected.size})` }}
          </button>

          <div v-if="integrityResult" style="margin-top:16px;padding:14px;border-radius:10px;background:var(--bg-elevated);border:0.5px solid var(--border)">
            <div style="font-size:13px;font-weight:700;margin-bottom:4px;color:#00D4B4">
              <i class="ti ti-circle-check"></i> {{ integrityResult.totalMigrated }} {{ tr('Datensätze migriert') }}
            </div>
            <div v-if="integrityResult.totalSkipped" style="font-size:12px;color:var(--text-muted)">{{ integrityResult.totalSkipped }} {{ tr('übersprungen (evtl. bereits migriert)') }}</div>
            <div v-if="integrityResult.errors?.length" style="font-size:12px;color:#E05C5C;margin-top:4px">{{ integrityResult.errors.length }} {{ tr('Fehler — siehe Konsole') }}</div>
          </div>
        </template>
      </div>
    </div>
</template>

<script setup lang="ts">
// Datenintegrität im PSC Manager (Linie oben: grau = nicht geprüft, grün = nichts gefunden, gelb = Funde): findet Datensätze mit veralteter Besitzer-Kennung (roher Cognito-ID) und ordnet sie nach Bestätigung zu. Aus den Einstellungen hierher verschoben.
const integrityScanning  = ref(false)
const integrityMigrating = ref(false)
const integrityScanResult = ref<{ resolvable: any[]; unresolvable: any[] } | null>(null)
const integritySelected  = ref(new Set<string>())
const integrityResult    = ref<any>(null)

function integrityKey(g: { table: string; field: string; legacyId: string }) {
  return `${g.table}|${g.field}|${g.legacyId}`
}
const allIntegritySelected = computed(() =>
  !!integrityScanResult.value?.resolvable.length &&
  integrityScanResult.value.resolvable.every(g => integritySelected.value.has(integrityKey(g)))
)
function toggleIntegritySelection(g: any) {
  const k = integrityKey(g)
  if (integritySelected.value.has(k)) integritySelected.value.delete(k)
  else integritySelected.value.add(k)
  integritySelected.value = new Set(integritySelected.value)
}
function toggleAllIntegrity() {
  if (!integrityScanResult.value) return
  if (allIntegritySelected.value) {
    integritySelected.value = new Set()
  } else {
    integritySelected.value = new Set(integrityScanResult.value.resolvable.map(integrityKey))
  }
}

async function loadIntegrityScan() {
  integrityScanning.value = true
  integrityResult.value = null
  try {
    const { useAuthHeader } = await import('~/composables/useAuth')
    const res = await $fetch(useApiUrl('/api/admin/data-integrity/scan'), { headers: await useAuthHeader() }) as any
    integrityScanResult.value = { resolvable: res.resolvable || [], unresolvable: res.unresolvable || [] }
    integritySelected.value = new Set(integrityScanResult.value.resolvable.map(integrityKey))
  } catch (e) { console.error(e) }
  integrityScanning.value = false
}

async function runIntegrityMigration() {
  if (!integrityScanResult.value || !integritySelected.value.size) return
  integrityMigrating.value = true
  try {
    const items = integrityScanResult.value.resolvable
      .filter(g => integritySelected.value.has(integrityKey(g)))
      .map(g => ({ table: g.table, field: g.field, legacyId: g.legacyId }))
    const { useAuthHeader } = await import('~/composables/useAuth')
    const res = await $fetch(useApiUrl('/api/admin/data-integrity/migrate'), {
      method: 'POST', headers: await useAuthHeader(), body: { items },
    }) as any
    integrityResult.value = res
    await loadIntegrityScan()
  } catch (e) { console.error(e) }
  integrityMigrating.value = false
}

const lineColor = computed(() => !integrityScanResult.value ? '#8b8fa8' : (integrityScanResult.value.resolvable.length || integrityScanResult.value.unresolvable.length) ? '#f0b428' : '#10b981')
</script>
