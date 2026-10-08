// Speicher-Regel: JEDER S3-Bucket des Kontos braucht hier eine bewusste Entscheidung (Zweck, öffentlich ja/nein, Verschlüsselung, Versionierung, Lifecycle,
// Block Public Access). Ein Bucket ohne Eintrag lässt den Test (tests/storage) und das Deploy-Gate (scripts/aws/check-storage.sh) scheitern.
//
// Öffentlich heißt hier IMMER: Principal "*" nur mit s3:GetObject auf deklarierte Präfixe ("<Bucket>/<Präfix>/*"), nie Auflisten, nie "s3:*", nie der ganze Bucket
// (Ausnahme nur für fremde Projekte unter owner "extern", dort fest dokumentiert). Eine neue öffentliche Aktion oder ein neues Präfix = hier eintragen UND begründen.
// Die Datei nutzt nur löschbare TypeScript-Syntax: Node führt sie direkt aus (scripts/aws/check-storage.mjs), ohne Build.
//
// "{account}" im Namen wird zur Laufzeit durch die Konto-ID ersetzt (sie steht nicht im Repo).

export interface BlockPublicAccess { BlockPublicAcls: boolean; IgnorePublicAcls: boolean; BlockPublicPolicy: boolean; RestrictPublicBuckets: boolean }
export interface LifecycleRuleDecl { id: string; expirationDays?: number; noncurrentDays?: number }
export interface PublicPrefix { prefix: string; reason: string }
export type BucketAccess =
  | { kind: 'private' }
  | { kind: 'public-prefixes'; prefixes: PublicPrefix[] }
  | { kind: 'public-whole'; reason: string }
export interface BucketDecl {
  /** Name, "{account}" wird ersetzt */
  name: string
  purpose: string
  /** plexora = von diesem Projekt verwaltet; extern = anderes Projekt im selben Konto (Zustand wird festgeschrieben und überwacht, aber nicht von uns verändert) */
  owner: 'plexora' | 'extern'
  region: string
  access: BucketAccess
  blockPublicAccess: BlockPublicAccess
  encryption: 'AES256' | 'aws:kms'
  versioning: 'Enabled' | 'None'
  /** erwartete Lifecycle-Regeln (genau diese, keine weiteren) */
  lifecycle: LifecycleRuleDecl[]
  /** Bucket-Policy mit Deny für unverschlüsselte Verbindungen (aws:SecureTransport=false) */
  denyInsecureTransport: boolean
  ownership: 'BucketOwnerEnforced'
  /** Schlüssel, die per HTTP 403 liefern müssen (HTTP-Prüfung); zusätzlich wird ein beliebiger nicht öffentlicher Schlüssel aus dem Bucket gezogen */
  privateExamples: string[]
  note?: string
}
export interface StorageDeclaration {
  buckets: BucketDecl[]
  /** Block Public Access auf Konto-Ebene: null = nicht gesetzt (heute so, weil plexora-files öffentliche Präfixe braucht; Plan: docs/security/plan-cloudfront-oac.md) */
  accountBlockPublicAccess: BlockPublicAccess | null
}

const ALL_BLOCKED: BlockPublicAccess = { BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: true, RestrictPublicBuckets: true }
const PUBLIC_POLICY_ALLOWED: BlockPublicAccess = { BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: false, RestrictPublicBuckets: false }

export const STORAGE: StorageDeclaration = {
  accountBlockPublicAccess: null,
  buckets: [
    {
      name: 'plexora-files',
      purpose: 'Bilder und Dateien der Plattform (Marketing, Website, Shop, Avatare, Mail-Logos) und die Deploy-Zips der Lambda (lambda/, lambda-deploy/)',
      owner: 'plexora', region: 'eu-central-1',
      access: {
        kind: 'public-prefixes',
        prefixes: [
          { prefix: 'automotive', reason: 'Fahrzeug- und Preisschildbilder des Branchenmoduls (auf Kundenwebsites eingebunden)' },
          { prefix: 'avatars', reason: 'Profilbilder (werden in der App und auf Buchungsseiten angezeigt)' },
          { prefix: 'blog', reason: 'Bilder der Blogbeiträge (öffentliche Website)' },
          { prefix: 'branding', reason: 'Logos und Favicons der Marken (Login, Landingpages, Rechnungen)' },
          { prefix: 'campaigns', reason: 'Bilder der Kampagnen (öffentliche Lead-Seiten)' },
          { prefix: 'mail-logos', reason: 'Logo im Kopf der Einladungsmail: Mailprogramme laden es von außen, zufällige Dateinamen, nur vom geprüften Upload beschrieben' },
          { prefix: 'marketing', reason: 'Kopf- und Hintergrundbilder der Lead-Seiten' },
          { prefix: 'newsletter', reason: 'Bilder in versendeten Newslettern' },
          { prefix: 'nexora', reason: 'Bilder der Kunden-Websites (Leistungen, Referenzen)' },
          { prefix: 'plugins', reason: 'Bilder der Zero-Deploy-Plugins' },
          { prefix: 'products', reason: 'Produktbilder der Shops' },
          { prefix: 'public', reason: 'allgemein öffentliche Dateien (z. B. Download-Bilder)' },
          { prefix: 'termine', reason: 'Bilder der öffentlichen Buchungsseite' },
        ],
      },
      // Block Public Access: mit einer öffentlichen Policy dürfen BlockPublicPolicy/RestrictPublicBuckets nicht an sein; ACLs werden nicht genutzt (BucketOwnerEnforced)
      blockPublicAccess: PUBLIC_POLICY_ALLOWED,
      encryption: 'AES256', versioning: 'Enabled',
      lifecycle: [{ id: 'lambda-zips-alte-versionen', noncurrentDays: 60 }],
      denyInsecureTransport: false, ownership: 'BucketOwnerEnforced',
      privateExamples: ['lambda/lambda-new.zip', 'lambda-deploy/lambda-new.zip'],
      note: 'Private Schlüssel: alles außerhalb der öffentlichen Präfixe (lambda/, lambda-deploy/, evtl. weitere). Plan für einen komplett privaten Bucket: docs/security/plan-cloudfront-oac.md',
    },
    {
      name: 'plexora-backups-{account}',
      purpose: 'Verschlüsselte Datensicherungen der Mandanten (Export "Meine Daten"), 7 Tage Aufbewahrung, Download nur über kurzlebige signierte Adressen',
      owner: 'plexora', region: 'eu-central-1',
      access: { kind: 'private' }, blockPublicAccess: ALL_BLOCKED,
      encryption: 'AES256', versioning: 'None',
      lifecycle: [{ id: 'sicherungen-nach-7-tagen-loeschen', expirationDays: 7 }],
      denyInsecureTransport: true, ownership: 'BucketOwnerEnforced',
      privateExamples: [],
    },
    {
      name: 'aether-os-assets-{account}-eu-central-1-an',
      purpose: 'FREMDES PROJEKT (Aether OS), nicht Teil von Plexora: statische Dateien',
      owner: 'extern', region: 'eu-central-1',
      access: { kind: 'public-whole', reason: 'Bucket-Policy "PublicReadGetObject": ganzer Bucket öffentlich lesbar, nur s3:GetObject (Auflisten ist nicht erlaubt). Zustand beim Anlegen dieser Regel festgeschrieben; ob das so bleiben soll, entscheidet Peter (offen).' },
      blockPublicAccess: { BlockPublicAcls: false, IgnorePublicAcls: false, BlockPublicPolicy: false, RestrictPublicBuckets: false },
      encryption: 'AES256', versioning: 'None', lifecycle: [], denyInsecureTransport: false, ownership: 'BucketOwnerEnforced', privateExamples: [],
      note: 'Fremdes Projekt: wird nur beobachtet. Ändert sich etwas, schlägt das Deploy-Gate an, damit es jemand bewusst bestätigt (Deklaration anpassen).',
    },
    {
      name: 'aether-os-data-peter-{account}-eu-central-1-an',
      purpose: 'FREMDES PROJEKT (Aether OS), nicht Teil von Plexora: private Daten',
      owner: 'extern', region: 'eu-central-1',
      access: { kind: 'private' }, blockPublicAccess: ALL_BLOCKED,
      encryption: 'AES256', versioning: 'None', lifecycle: [], denyInsecureTransport: false, ownership: 'BucketOwnerEnforced', privateExamples: [],
    },
  ],
}

export const resolveBucketName = (name: string, account: string) => name.replace(/\{account\}/g, account)
