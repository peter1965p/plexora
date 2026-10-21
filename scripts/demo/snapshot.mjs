// Speichert den AKTUELLEN Stand des Demo-Kontos als "Standard", auf den das Demo-Konto beim Abmelden, beim Start und nach Leerlauf zurückgesetzt wird.
// Erst das Demo-Konto so einrichten, wie es aussehen soll (scripts/demo/seed-*.mjs), dann dieses Skript. Aufruf: npx vite-node scripts/demo/snapshot.mjs
// Nutzt die lokalen AWS-Zugangsdaten (aws configure / Umgebung), nicht die Variablen der App.
process.env.AWS_LAMBDA_FUNCTION_NAME = process.env.AWS_LAMBDA_FUNCTION_NAME || 'demo-snapshot-script'
const { saveDemoSnapshot, resetTables } = await import('../../server/utils/demoSandbox')
console.log(`speichere Standard aus ${resetTables().length} Tabellen …`)
const r = await saveDemoSnapshot()
console.log(`fertig: ${r.rows} Zeilen aus ${r.tables} Tabellen als Standard gespeichert`)
