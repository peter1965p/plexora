import { defineStore } from "pinia";

export const useAppStore = defineStore("app", {
  state: () => ({
    theme: "dark" as "dark" | "light",
    accent: "#6C3FE8",
    accentRgb: "108, 63, 232",
    activeRoute: "dashboard",
    accentColors: [
      { name: "Violet", hex: "#6C3FE8", rgb: "108,63,232" },
      { name: "Cyan", hex: "#00A896", rgb: "0,168,150" },
      { name: "Rose", hex: "#E83F6C", rgb: "232,63,108" },
      { name: "Amber", hex: "#E88A3F", rgb: "232,138,63" },
      { name: "Sky", hex: "#3F8FE8", rgb: "63,143,232" },
      { name: "Lime", hex: "#5CB85C", rgb: "92,184,92" },
    ],
    modules: [
      { key: "crm", name: "CRM", icon: "ti-users", on: true },
      { key: "projects", name: "Projekte", icon: "ti-layout-kanban", on: true },
      { key: "finance", name: "Finanzen", icon: "ti-receipt", on: true },
      { key: "hr", name: "HR", icon: "ti-id-badge", on: false },
      { key: "support", name: "Support", icon: "ti-headset", on: false },
      { key: "analytics", name: "Analytics", icon: "ti-chart-dots", on: false },
    ],
  }),
  actions: {
    setTheme(t: "dark" | "light") {
      this.theme = t;
      document.documentElement.setAttribute("data-theme", t);
    },
    setAccent(hex: string, rgb: string) {
      this.accent = hex;
      this.accentRgb = rgb;
      document.documentElement.style.setProperty("--accent", hex);
      document.documentElement.style.setProperty("--accent-rgb", rgb);
    },
    toggleModule(key: string) {
      const m = this.modules.find((m) => m.key === key);
      if (m) m.on = !m.on;
    },
  },
});
