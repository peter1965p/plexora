import { defineStore } from "pinia";

export type ThemeKey = "dark" | "light" | "midnight" | "forest" | "violet" | "rose" | "carbon" | "ocean";

export const THEMES: Record<ThemeKey, { name: string; accent: string; accentRgb: string; bg: string; surface: string }> = {
  dark:     { name: "Dark",     accent: "#6C3FE8", accentRgb: "108,63,232",  bg: "#0a0e1a", surface: "#13182a" },
  light:    { name: "Light",    accent: "#ea580c", accentRgb: "234,88,12",   bg: "#fafafa", surface: "#ffffff" },
  midnight: { name: "Midnight", accent: "#3b82f6", accentRgb: "59,130,246",  bg: "#020817", surface: "#0d1627" },
  forest:   { name: "Forest",   accent: "#10b981", accentRgb: "16,185,129",  bg: "#030f08", surface: "#0a1f10" },
  violet:   { name: "Violet",   accent: "#8b5cf6", accentRgb: "139,92,246",  bg: "#080512", surface: "#130e24" },
  rose:     { name: "Rose",     accent: "#e11d48", accentRgb: "225,29,72",   bg: "#0f0308", surface: "#1f0a14" },
  carbon:   { name: "Carbon",   accent: "#e2e8f0", accentRgb: "226,232,240", bg: "#000000", surface: "#0f0f0f" },
  ocean:    { name: "Ocean",    accent: "#06b6d4", accentRgb: "6,182,212",   bg: "#020d14", surface: "#081a28" },
};

export const useAppStore = defineStore("app", {
  state: () => ({
    theme: "dark" as ThemeKey,
    accent: "#6C3FE8",
    accentRgb: "108, 63, 232",
    activeRoute: "dashboard",
    themeLoaded: false,
    license: null as any,
    licenseModules: null as string[] | null,
    accentColors: [
      { name: "Violet", hex: "#6C3FE8", rgb: "108,63,232" },
      { name: "Cyan", hex: "#00A896", rgb: "0,168,150" },
      { name: "Rose", hex: "#E83F6C", rgb: "232,63,108" },
      { name: "Amber", hex: "#E88A3F", rgb: "232,138,63" },
      { name: "Sky", hex: "#3F8FE8", rgb: "63,143,232" },
      { name: "Lime", hex: "#5CB85C", rgb: "92,184,92" },
    ],
    modules: [
      { key: "crm",         name: "CRM",          icon: "ti-users",          on: true,  locked: false, plan: "basic",      desc: "Kontakte, Deals, Companies, Lead-Tracking, CSV-Import/Export" },
      { key: "support",     name: "Support",       icon: "ti-headset",        on: true,  locked: false, plan: "basic",      desc: "Ticket-System, Prioritäten, SLA-Tracking, Kundenzuordnung" },
      { key: "finance",     name: "Finanzen",      icon: "ti-receipt",        on: true,  locked: false, plan: "pro",        desc: "Rechnungen, PDF-Versand, Mahnwesen, Cashflow-Übersicht, Export" },
      { key: "projects",    name: "Projekte",      icon: "ti-layout-kanban",  on: true,  locked: false, plan: "pro",        desc: "Mandanten-Projekte, Deadlines, Fortschritt, Team-Zuordnung" },
      { key: "contracts",   name: "Verträge",      icon: "ti-file-text",      on: true,  locked: false, plan: "pro",        desc: "Vertragsverwaltung, MRR-Schätzung, Kündigungsfristen-Tracking" },
      { key: "hr",          name: "HR",            icon: "ti-id-badge",       on: false, locked: false, plan: "pro",        desc: "Mitarbeiterverwaltung, Urlaub, Recruiting-Kampagnen, Onboarding" },
      { key: "analytics",   name: "Analytics",     icon: "ti-chart-dots",     on: false, locked: false, plan: "pro",        desc: "Umsatz-Trends, Lead-Conversion, Win Rate, Modul-Übersicht" },
      { key: "marketing",   name: "Marketing",     icon: "ti-speakerphone",   on: true,  locked: false, plan: "enterprise", desc: "Lead-Kampagnen, Landing-Page-Builder, UTM-Tracking, QR-Codes, Stats" },
      { key: "shop",        name: "Shop",          icon: "ti-shopping-cart",  on: false, locked: false, plan: "pro",        desc: "Produkt-Verwaltung, Stripe-Checkout, Bestellungen, Webhooks" },
      { key: "forms",       name: "Formulare",     icon: "ti-forms",          on: false, locked: false, plan: "pro",        desc: "Formular-Builder, Einbettung, Submissions-Übersicht" },
      { key: "nexora",      name: "Website",       icon: "ti-world",          on: false, locked: false, plan: "pro",        desc: "Unternehmens-Webseite via Nexora, API-gesteuert, aus Plexora verwaltet" },
      { key: "termine",     name: "Termine",       icon: "ti-calendar-event", on: false, locked: false, plan: "pro",        desc: "Terminplaner mit öffentlicher Buchungsseite und Google-Calendar/Meet-Anbindung" },
      { key: "newsletter",  name: "Newsletter",    icon: "ti-mail",           on: false, locked: false, plan: "pro",        desc: "Mandantenfähiger Newsletter: Double-Opt-In-Anmeldung, Kampagnen-Versand, Tracking" },
    ],
  }),
  actions: {
    setTheme(t: ThemeKey) {
      this.theme = t;
      const preset = THEMES[t];
      if (preset) {
        this.accent = preset.accent;
        this.accentRgb = preset.accentRgb;
      }
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-theme", t);
      }
    },
    setAccent(hex: string, rgb: string) {
      this.accent = hex;
      this.accentRgb = rgb;
      if (typeof document !== "undefined") {
        document.documentElement.style.setProperty("--accent", hex);
        document.documentElement.style.setProperty("--accent-rgb", rgb);
      }
    },
    toggleModule(key: string) {
      const m = this.modules.find((m) => m.key === key);
      if (m) m.on = !m.on;
    },
    async loadTheme() {
      if (this.themeLoaded) return;
      try {
        const { useAuthHeader } = await import('~/composables/useAuth');
        const res = await $fetch<{ theme: any }>(useApiUrl("/api/settings/theme"), { headers: await useAuthHeader() });
        const t = res?.theme || {};
        if (t.theme && t.theme in THEMES) this.setTheme(t.theme as ThemeKey);
        if (t.accent && t.accentRgb) this.setAccent(t.accent, t.accentRgb);
      } catch {
        // Defaults bleiben aktiv (u.a. für ausgeloggte Besucher auf öffentlichen Seiten)
      } finally {
        this.themeLoaded = true;
      }
    },
    async saveTheme() {
      const { useAuthHeader } = await import('~/composables/useAuth');
      await $fetch(useApiUrl("/api/settings/theme"), {
        method: "POST",
        headers: await useAuthHeader(),
        body: { theme: this.theme, accent: this.accent, accentRgb: this.accentRgb },
      });
    },
    setLicense(license: any) {
      this.license = license;
      this.licenseModules = license?.status === 'active' && Array.isArray(license.modules)
        ? license.modules as string[]
        : null;
      this.modules = this.modules.map(m => ({
        ...m,
        locked: this.licenseModules !== null && !this.licenseModules.includes(m.key),
      }));
    },

    async loadModules() {
      const { useAuthHeader } = await import('~/composables/useAuth');
      const authHeaders = import.meta.client ? await useAuthHeader() : {};

      // 1. Gespeicherte Ein/Aus-Zustände aus DynamoDB laden
      try {
        const res = await $fetch<any>(useApiUrl("/api/settings/modules"), { headers: authHeaders });
        if (res?.modules) {
          const saved = JSON.parse(res.modules);
          this.modules = this.modules.map(m => {
            const found = saved.find((s: any) => s.key === m.key);
            return found ? { ...m, on: found.on } : m;
          });
        }
      } catch {}

      // 2. Lizenz laden und Module sperren/freischalten (nur client-seitig)
      if (import.meta.client) {
        try {
          const { useAuthUser } = await import('~/composables/useAuth');
          const u = await useAuthUser();
          if (u.email) {
            const licRes = await $fetch<any>(
              useApiUrl('/api/licenses/my'), { headers: authHeaders }
            );
            this.setLicense(licRes?.license || null);
          }
        } catch {
          // Bei Fehler: keine Einschränkung
        }
      }
    },
  },
});
