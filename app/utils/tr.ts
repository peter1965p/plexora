import { EN } from '~~/shared/i18n/en'
import { uiLang } from '~/composables/useLang'

/** Übersetzt einen festen deutschen Text der Oberfläche; ohne Eintrag oder in Deutsch bleibt er unverändert. */
export function tr(s: string): string {
  return uiLang.value === 'en' ? (EN[s] ?? s) : s
}
