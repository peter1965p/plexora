<template>
  <div class="page">
    <div class="card">
      <div class="card-header">
        <span class="card-title">Meine Dokumente</span>
      </div>
      <table class="data-table">
        <thead>
          <tr><th>Name</th><th>Typ</th><th>Datum</th><th style="width:80px">Download</th></tr>
        </thead>
        <tbody>
          <tr v-if="!documents.length">
            <td colspan="4" style="text-align:center;color:var(--text-muted);padding:24px">Keine Dokumente</td>
          </tr>
          <tr v-for="d in documents" :key="d.documentId">
            <td class="td-name">{{ d.name }}</td>
            <td><span class="badge badge-info">{{ d.type }}</span></td>
            <td style="font-size:12px">{{ d.created?.slice(0,10) }}</td>
            <td>
              <button class="icon-btn" @click="download(d)">
                <i class="ti ti-download"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'portal', middleware: 'auth' })

const { data } = await useFetch('/api/portal/documents')
const documents = computed(() => (data.value as any)?.documents || [])

function download(doc: any) {
  window.open(doc.url, '_blank')
}
</script>
