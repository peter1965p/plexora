// Passwortregeln für das Festlegen per Einmal-Link. Strenger als der Cognito-Pool (mindestens 8): mindestens 12 Zeichen, Groß- und Kleinbuchstabe, Ziffer, Sonderzeichen.
// Dieselbe Funktion prüft in der Oberfläche (Hinweis beim Tippen) und auf dem Server (maßgeblich).
export const PASSWORD_MIN = 12
export const PASSWORD_MAX = 128

export function passwordProblem(pw: unknown): string | null {
  if (typeof pw !== 'string' || !pw) return 'Bitte ein Passwort eingeben.'
  if (pw.length < PASSWORD_MIN) return `Das Passwort braucht mindestens ${PASSWORD_MIN} Zeichen.`
  if (pw.length > PASSWORD_MAX) return `Das Passwort darf höchstens ${PASSWORD_MAX} Zeichen lang sein.`
  if (pw !== pw.trim()) return 'Das Passwort darf nicht mit einem Leerzeichen beginnen oder enden.'
  if (!/[a-zäöüß]/.test(pw)) return 'Das Passwort braucht mindestens einen Kleinbuchstaben.'
  if (!/[A-ZÄÖÜ]/.test(pw)) return 'Das Passwort braucht mindestens einen Großbuchstaben.'
  if (!/[0-9]/.test(pw)) return 'Das Passwort braucht mindestens eine Ziffer.'
  if (!/[^A-Za-z0-9äöüßÄÖÜ]/.test(pw)) return 'Das Passwort braucht mindestens ein Sonderzeichen (z. B. ! ? # %).'
  return null
}
