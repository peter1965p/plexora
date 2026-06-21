import { defineStore } from "pinia";

export const useAppStore = defineStore("app", {
  state: () => ({
    theme: "dark" as "dark" | "light",
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
      { key: "shop",        name: "Shop",          icon: "ti-shopping-cart",  on: false, locked: false, plan: "pro",        desc: "Produkt-Verwaltung, Stripe-Checkout, Bestellungen, Webhooks" },
      { key: "pagebuilder", name: "Pagebuilder",   icon: "ti-layout-2",       on: false, locked: false, plan: "pro",        desc: "Drag & Drop Seiteneditor, öffentliche Seiten, Navigation" },
      { key: "forms",       name: "Formulare",     icon: "ti-forms",          on: false, locked: false, plan: "pro",        desc: "Formular-Builder, Einbettung, Submissions-Übersicht" },
      { key: "marketing",   name: "Marketing",     icon: "ti-speakerphone",   on: true,  locked: false, plan: "enterprise", desc: "Lead-Kampagnen, Landing-Page-Builder, UTM-Tracking, QR-Codes, Stats" },
    ],
  }),
  actions: {
    setTheme(t: "dark" | "light") {
      this.theme = t;
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
        const res = await $fetch<{ theme: any }>(useApiUrl("/api/settings/theme"));
        const t = res?.theme || {};
        if (t.theme === "dark" || t.theme === "light") this.setTheme(t.theme);
        if (t.accent && t.accentRgb) this.setAccent(t.accent, t.accentRgb);
      } catch {
        // Defaults bleiben aktiv
      } finally {
        this.themeLoaded = true;
      }
    },
    async saveTheme() {
      await $fetch(useApiUrl("/api/settings/theme"), {
        method: "POST",
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
      // 1. Gespeicherte Ein/Aus-Zustände aus DynamoDB laden
      try {
        const res = await $fetch<any>(useApiUrl("/api/settings/modules"));
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
              useApiUrl(`/api/licenses/my?email=${encodeURIComponent(u.email)}`)
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
