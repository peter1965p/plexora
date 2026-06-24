<template>
  <div>
    <h1 class="lp-page-title">Impressum</h1>

    <section class="lp-section">
      <h2 class="lp-section-h">Angaben gemäß § 5 TMG</h2>
      <p class="lp-text">
        {{ company.legalName }}<br />
        <template v-if="company.representedBy">{{ company.representedBy }}<br /></template>
        {{ company.street }}<br />
        {{ company.zipCity }}<br />
        {{ company.country }}
      </p>
    </section>

    <section v-if="company.email || company.phone" class="lp-section">
      <h2 class="lp-section-h">Kontakt</h2>
      <p class="lp-text">
        <template v-if="company.phone">Telefon: {{ company.phone }}<br /></template>
        <template v-if="company.email">E-Mail: <a :href="`mailto:${company.email}`" class="lp-link">{{ company.email }}</a></template>
      </p>
    </section>

    <section v-if="company.vatId" class="lp-section">
      <h2 class="lp-section-h">Umsatzsteuer-ID</h2>
      <p class="lp-text">
        Umsatzsteuer-Identifikationsnummer gemäß §27a Umsatzsteuergesetz:<br />
        {{ company.vatId }}
      </p>
    </section>

    <section v-if="company.register" class="lp-section">
      <h2 class="lp-section-h">Registereintrag</h2>
      <p class="lp-text">
        {{ company.register }}<br />
        <template v-if="company.registerCourt">{{ company.registerCourt }}</template>
      </p>
    </section>

    <section class="lp-section">
      <h2 class="lp-section-h">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p class="lp-text">
        {{ company.representedBy || company.legalName }}<br />
        {{ company.street }}<br />
        {{ company.zipCity }}
      </p>
    </section>

    <section class="lp-section">
      <h2 class="lp-section-h">Haftung für Inhalte</h2>
      <p class="lp-text">
        Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
      </p>
    </section>

    <section class="lp-section">
      <h2 class="lp-section-h">Haftung für Links</h2>
      <p class="lp-text">
        Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
      </p>
    </section>

    <section class="lp-section">
      <h2 class="lp-section-h">Urheberrecht</h2>
      <p class="lp-text">
        Die durch den Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'lp' })

const company = reactive({
  legalName: '', representedBy: '', street: '', zipCity: '', country: 'Deutschland',
  email: '', phone: '', vatId: '', register: '', registerCourt: ''
})

const { data } = await useFetch(useApiUrl('/api/settings/company'))
if ((data.value as any)?.company) Object.assign(company, (data.value as any).company)
</script>

<style scoped>
.lp-page-title { font-family: "Space Grotesk", sans-serif; font-size: 36px; font-weight: 800; color: #f0eef9; margin: 0 0 40px; letter-spacing: -0.5px; }
.lp-section { margin-bottom: 32px; }
.lp-section-h { font-family: "Space Grotesk", sans-serif; font-size: 18px; font-weight: 700; color: #f0eef9; margin: 0 0 12px; }
.lp-text { font-size: 14px; line-height: 1.9; color: #8b8fa8; margin: 0; }
.lp-link { color: #ea580c; text-decoration: none; }
.lp-link:hover { text-decoration: underline; }
</style>
