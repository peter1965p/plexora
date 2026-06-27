<template>
  <div class="layout">
    <AppSidebar />
    <div class="main">
      <AppTopbar />
      <slot />
    </div>
    <ConfirmDialog />
  </div>
</template>
