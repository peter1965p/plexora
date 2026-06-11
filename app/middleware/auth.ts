export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return;

  try {
    const { fetchAuthSession } = await import("aws-amplify/auth");
    await fetchAuthSession({ forceRefresh: false });
  } catch {
    return navigateTo("/login");
  }
});
