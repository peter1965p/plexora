<template>
  <div class="layout">
    <AppSidebar />
    <div class="main">
      <AppTopbar />
      <DemoBanner />
      <slot />
    </div>
    <ConfirmDialog />
    <AiAssistantWidget />
    <PlanNotice />
    <OnboardingTour />
  </div>
</template>
