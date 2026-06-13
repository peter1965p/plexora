<template>
  <div style="min-height:100vh;background:var(--bg-base)">
    <header style="background:var(--bg-surface);border-bottom:0.5px solid var(--border);padding:0 32px;height:64px;display:flex;align-items:center;justify-content:space-between">
      <span class="logo-text" style="font-size:20px">Shop <span class="logo-accent">Admin</span></span>
      <NuxtLink to="/shop"><button class="accent-btn">← Zum Shop</button></NuxtLink>
    </header>

    <div style="max-width:1000px;margin:40px auto;padding:0 24px">
      <!-- Neues Produkt -->
      <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;padding:24px;margin-bottom:32px">
        <h2 style="font-size:18px;font-weight:700;margin:0 0 20px">Neues Produkt</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <input v-model="form.name" placeholder="Name" class="input-field" />
          <input v-model="form.price" placeholder="Preis (€)" type="number" class="input-field" />
          <input v-model="form.category" placeholder="Kategorie (SOFTWARE/SERVICE)" class="input-field" />
          <input v-model="form.stock" placeholder="Stock" type="number" class="input-field" />
          <textarea v-model="form.description" placeholder="Beschreibung" class="input-field" style="grid-column:span 2;height:80px;resize:none" />
          <input v-model="form.image" placeholder="Bild URL (optional)" class="input-field" style="grid-column:span 2" />
        </div>
        <button class="accent-btn" style="margin-top:16px" @click="createProduct" :disabled="saving">
          <i class="ti ti-plus"></i> {{ saving ? 'Speichern...' : 'Produkt anlegen' }}
        </button>
      </div>

      <!-- Produkt Liste -->
      <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;overflow:hidden">
        <div style="padding:20px 24px;border-bottom:0.5px solid var(--border);font-weight:700">Produkte ({{ products.length }})</div>
        <div v-for="p in products" :key="p.productId" style="padding:16px 24px;border-bottom:0.5px solid var(--border);display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-weight:600">{{ p.name }}</div>
            <div style="font-size:12px;color:var(--text-muted)">{{ p.category }} · € {{ p.price }}</div>
          </div>
          <button @click="deleteProduct(p.productId)" style="background:none;border:none;color:#E05C5C;cursor:pointer;font-size:18px"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    </div>

    <div v-if="toast" class="toast-success"><i class="ti ti-circle-check"></i> {{ toast }}</div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const API = useApiUrl('')
const toast = ref('')
const saving = ref(false)
const form = reactive({ name: '', price: '', category: 'SOFTWARE', description: '', stock: '999', image: '' })

const { data, refresh } = await useFetch(useApiUrl('/api/shop/products'))
const products = computed(() => (data.value as any)?.products || [])

async function createProduct() {
  if (!form.name || !form.price) return
  saving.value = true
  await $fetch(useApiUrl('/api/shop/products'), {
    method: 'POST',
    body: { ...form, price: Number(form.price), stock: Number(form.stock) }
  })
  Object.assign(form, { name: '', price: '', description: '', image: '' })
  await refresh()
  toast.value = 'Produkt angelegt!'
  setTimeout(() => toast.value = '', 2500)
  saving.value = false
}

async function deleteProduct(id: string) {
  await $fetch(useApiUrl(`/api/shop/products/${id}`), { method: 'DELETE' })
  await refresh()
  toast.value = 'Produkt gelöscht!'
  setTimeout(() => toast.value = '', 2500)
}
</script>
