<template>
  <div class="page">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:22px;font-weight:800;margin:0">Team <span style="color:var(--accent)">Übersicht</span></h1>
        <p style="color:var(--text-muted);font-size:13px;margin:4px 0 0">Mitglieder einladen, Rollen vergeben und sehen, wer was darf</p>
      </div>
      <button class="accent-btn" :disabled="isDemo" @click="openInvite"><i class="ti ti-user-plus"></i> Mitglied einladen</button>
    </div>

    <div v-if="roles.state.value.loaded && !roles.enforced.value" class="note" style="margin-bottom:14px"><i class="ti ti-eye"></i> Die Rollen werden zurzeit nur <strong>beobachtet</strong>: Du kannst sie hier schon vergeben, gesperrt wird aber erst, wenn der Betreiber die Rechteprüfung scharf schaltet.</div>

    <div class="stats">
      <div class="stat"><div class="stat-v">{{ activeCount + 1 }}</div><div class="stat-l">Personen im Konto</div></div>
      <div class="stat"><div class="stat-v">{{ adminCount }}</div><div class="stat-l">davon Admins</div></div>
      <div class="stat"><div class="stat-v">{{ pendingCount }}</div><div class="stat-l">offene Einladungen</div></div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><span class="card-title"><i class="ti ti-users" style="margin-right:8px;color:var(--accent)"></i>Mitglieder<HelpTip k="rollen" /></span></div>
      <div v-if="loading" style="padding:20px;color:var(--text-muted)"><i class="ti ti-loader-2 spin"></i></div>
      <div v-else-if="loadError" class="err" style="margin:12px">{{ loadError }}</div>
      <table v-else class="data-table">
        <thead><tr><th>Person</th><th>Rolle</th><th>Status</th><th style="width:110px"></th></tr></thead>
        <tbody>
          <tr>
            <td><div class="who"><span class="av">{{ initial(userEmail) }}</span><div><strong>{{ userEmail }}</strong><div class="sub">das bist du</div></div></div></td>
            <td><span class="role owner">Inhaber</span></td>
            <td><span class="st on">Aktiv</span></td>
            <td></td>
          </tr>
          <tr v-for="m in members" :key="m.memberEmail">
            <td><div class="who"><span class="av">{{ initial(m.memberEmail) }}</span><div><strong>{{ m.memberEmail }}</strong><div class="sub" v-if="m.invitedAt">{{ m.status === 'invited' ? 'eingeladen am ' : 'dabei seit ' }}{{ dateDe(m.invitedAt) }}</div></div></div></td>
            <td>
              <select class="form-select" style="height:30px" :value="m.role === 'admin' ? 'admin' : 'member'" :disabled="isDemo || busy === m.memberEmail" title="Rolle ändern" @change="changeRole(m, ($event.target as HTMLSelectElement).value)">
                <option value="member">Mitglied</option><option value="admin">Admin</option>
              </select>
            </td>
            <td><span class="st" :class="m.status === 'active' ? 'on' : (m.inviteExpired ? 'exp' : 'pend')">{{ m.status === 'active' ? 'Aktiv' : (m.inviteExpired ? 'Einladung abgelaufen' : 'Eingeladen') }}</span></td>
            <td style="white-space:nowrap;text-align:right">
              <button v-if="m.status === 'invited' && m.inviteExpired" class="icon-btn" title="Einladung erneut senden" :disabled="isDemo" @click="resend(m)"><i class="ti ti-send"></i></button>
              <button class="icon-btn" style="color:var(--danger)" :title="m.status === 'invited' ? 'Einladung zurückziehen' : 'Aus dem Team entfernen'" :disabled="isDemo" @click="remove(m)"><i class="ti ti-trash"></i></button>
            </td>
          </tr>
          <tr v-if="!members.length"><td colspan="4" style="text-align:center;color:var(--text-muted);padding:22px">Noch niemand eingeladen. Mit „Mitglied einladen“ legst du los.</td></tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title"><i class="ti ti-shield-check" style="margin-right:8px;color:var(--accent)"></i>Wer darf was</span></div>
      <div style="padding:0 16px 8px;font-size:12px;color:var(--text-muted)"><strong>Mitglied:</strong> {{ ROLE_DESCRIPTIONS.member }}. <strong>Admin:</strong> {{ ROLE_DESCRIPTIONS.admin }}. Die Rolle <strong>Inhaber</strong> hast nur du.</div>
      <table class="data-table matrix">
        <thead><tr><th>Bereich</th><th>Mitglied</th><th>Admin</th><th>Inhaber</th></tr></thead>
        <tbody>
          <tr v-for="a in matrix" :key="a.area"><td>{{ a.area }}</td><td v-for="r in ROLES" :key="r" :class="{ yes: roleAllows(r, a.role) }">{{ roleAllows(r, a.role) ? '✓' : '–' }}</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="toast" class="toast">{{ toast }}</div>

    <div v-if="showInvite" class="modal-overlay" @click.self="showInvite = false">
      <div class="modal-card" style="max-width:460px">
        <div class="modal-header"><span class="card-title">Mitglied einladen</span><button class="icon-btn" @click="showInvite = false"><i class="ti ti-x"></i></button></div>
        <div class="modal-body">
          <div v-if="inviteError" class="err">{{ inviteError }}</div>
          <div class="auth-field"><label>E-Mail-Adresse</label><input v-model="invite.email" type="email" placeholder="name@firma.de" @keydown.enter="sendInvite" /></div>
          <div class="auth-field"><label>Rolle</label><select v-model="invite.role" class="form-select"><option value="member">Mitglied: {{ ROLE_DESCRIPTIONS.member }}</option><option value="admin">Admin: {{ ROLE_DESCRIPTIONS.admin }}</option></select></div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Die Person bekommt eine Mail mit einem Link (7 Tage gültig). Ihre Rolle kannst du jederzeit hier ändern.</div>
          <button class="auth-btn" :disabled="inviting || !invite.email" style="width:100%" @click="sendInvite"><i class="ti" :class="inviting ? 'ti-loader-2 spin' : 'ti-send'"></i> Einladung senden</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { isDemoEmail } from '~~/shared/demo'
import { AREA_ROLES, ROLE_DESCRIPTIONS, roleAllows, type Role } from '~~/shared/roles'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

// Teamübersicht für den Inhaber: Mitglieder, Rollen ändern, einladen, entfernen und eine Tabelle "Wer darf was". Alle Regeln setzt der Server durch (nur der Inhaber darf, Demo gesperrt).
const roles = useRole()
const { openConfirm } = useConfirm()
const members = ref<any[]>([]), loading = ref(true), loadError = ref(''), busy = ref(''), toast = ref('')
const userEmail = ref('–'), isDemo = ref(false)
const showInvite = ref(false), inviting = ref(false), inviteError = ref('')
const invite = reactive({ email: '', role: 'member' })
const ROLES: Role[] = ['member', 'admin', 'owner']

const matrix = computed(() => [
  ...AREA_ROLES.filter(a => a.prefix !== '/store' && a.prefix !== '/settings').map(a => ({ area: a.area, role: a.role })),
  { area: 'Einstellungen (außer Zahlungs- und KI-Schlüssel)', role: 'admin' as const },
  { area: 'Team verwalten', role: 'owner' as const }, { area: 'Sicherung', role: 'owner' as const }, { area: 'Abrechnung', role: 'owner' as const },
  { area: 'Module im Store kaufen', role: 'owner' as const }, { area: 'Zahlungs- und KI-Schlüssel', role: 'owner' as const },
])
const activeCount = computed(() => members.value.filter(m => m.status === 'active').length)
const adminCount = computed(() => members.value.filter(m => m.status === 'active' && m.role === 'admin').length + 1)    // der Inhaber zählt mit
const pendingCount = computed(() => members.value.filter(m => m.status === 'invited' && !m.inviteExpired).length)

const initial = (e: string) => (e || '?')[0].toUpperCase()
const dateDe = (iso: string) => new Date(iso).toLocaleDateString('de-DE')
const say = (m: string) => { toast.value = m; setTimeout(() => { if (toast.value === m) toast.value = '' }, 3500) }
const errText = (e: any) => e?.data?.message || e?.message || 'Das hat nicht geklappt.'
async function api<T = any>(path: string, opts: any = {}): Promise<T> {
  const { useAuthHeader } = await import('~/composables/useAuth')
  return await $fetch<T>(useApiUrl(`/api/team${path}`), { ...opts, headers: await useAuthHeader() })
}
async function load() {
  try { members.value = (await api('/members')).members || []; loadError.value = '' }
  catch (e: any) { loadError.value = e?.statusCode === 403 ? 'Die Teamverwaltung ist dem Inhaber des Kontos vorbehalten.' : errText(e) }
  finally { loading.value = false }
}
onMounted(async () => {
  const { useAuthUser } = await import('~/composables/useAuth')
  try { const u: any = await useAuthUser(); userEmail.value = u.email || userEmail.value; isDemo.value = isDemoEmail(u.email) } catch {}
  roles.load(); load()
})

function openInvite() { inviteError.value = ''; Object.assign(invite, { email: '', role: 'member' }); showInvite.value = true }
async function sendInvite() {
  if (!invite.email || inviting.value) return
  inviting.value = true; inviteError.value = ''
  try { await api('/invite', { method: 'POST', body: { inviteeEmail: invite.email, role: invite.role } }); showInvite.value = false; await load(); say('Einladung gesendet.') }
  catch (e: any) { inviteError.value = errText(e) } finally { inviting.value = false }
}
async function changeRole(m: any, role: string) {
  const label = role === 'admin' ? 'Admin' : 'Mitglied'
  if (role === 'admin' && !await openConfirm({ title: `${m.memberEmail} zum Admin machen?`, sub: 'Admins sehen und ändern Finanzen, Verträge, HR, Einstellungen und mehr.', icon: 'ti-user-shield', accentColor: 'var(--accent)' })) { await load(); return }
  busy.value = m.memberEmail
  try { await api(`/${encodeURIComponent(m.memberEmail)}`, { method: 'PATCH', body: { role } }); say(`${m.memberEmail} ist jetzt ${label}.`) }
  catch (e: any) { say(errText(e)) } finally { busy.value = ''; await load() }
}
async function resend(m: any) {
  try { await api('/invite', { method: 'POST', body: { inviteeEmail: m.memberEmail, role: m.role === 'admin' ? 'admin' : 'member' } }); await load(); say('Einladung erneut gesendet.') } catch (e: any) { say(errText(e)) }
}
async function remove(m: any) {
  if (!await openConfirm({ title: m.status === 'invited' ? 'Einladung zurückziehen?' : 'Aus dem Team entfernen?', name: m.memberEmail, icon: 'ti-user-off' })) return
  try { await api(`/${encodeURIComponent(m.memberEmail)}`, { method: 'DELETE' }); await load() } catch (e: any) { say(errText(e)) }
}
</script>

<style scoped>
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px }
.stat { background: var(--bg-surface); border: 0.5px solid var(--border); border-radius: 12px; padding: 14px 16px }
.stat-v { font-size: 26px; font-weight: 800 } .stat-l { font-size: 12px; color: var(--text-muted); margin-top: 2px }
.who { display: flex; align-items: center; gap: 12px } .sub { font-size: 11px; color: var(--text-muted) }
.av { width: 36px; height: 36px; border-radius: 50%; background: var(--accent); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0 }
.role.owner { font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 6px; background: #6C3FE822; color: var(--accent) }
.st { font-size: 11px; padding: 3px 8px; border-radius: 5px } .st.on { background: #00C85322; color: #00A844 } .st.pend { background: #F0B42822; color: #B07A00 } .st.exp { background: #E05C5C22; color: #E05C5C }
.matrix td, .matrix th { text-align: center } .matrix td:first-child, .matrix th:first-child { text-align: left } .matrix .yes { color: #00A844; font-weight: 700 }
.note { padding: 10px 14px; border-radius: 10px; background: #F0B42822; color: #8a5d00; font-size: 13px }
.err { padding: 10px 14px; border-radius: 8px; background: #E05C5C18; color: #E05C5C; font-size: 13px }
.toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: var(--bg-surface); border: 0.5px solid var(--border); padding: 10px 18px; border-radius: 10px; font-size: 13px; z-index: 200 }
@media (max-width: 640px) { .stats { grid-template-columns: 1fr } }
</style>
