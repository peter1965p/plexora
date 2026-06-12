export const useBranding = () => {
  const branding = useState('branding', () => ({
    brandName:    'Plexora',
    brandTagline: 'Business Platform',
    primaryColor: '#7C3AED',
    portalTitle:  'Kundenportal',
  }))

  async function loadBranding() {
    try {
      const data = await $fetch('/api/settings/branding') as any
      if (data?.branding) Object.assign(branding.value, data.branding)
    } catch {}
  }

  return { branding, loadBranding }
}
