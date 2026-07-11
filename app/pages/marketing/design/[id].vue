<template>
  <CampaignDesignEditor type="lead" :campaign-id="campaignId" />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const route = useRoute()
const campaignId = route.params.id as string
</script>
