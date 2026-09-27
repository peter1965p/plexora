<template>
  <div class="layout">
    <AppSidebar />
    <div class="main">
      <AppTopbar />
      <slot />
    </div>
    <ConfirmDialog />
    <AiAssistantWidget />
  </div>
</template>
