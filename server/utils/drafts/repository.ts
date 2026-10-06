// Repository-Schicht für Entwürfe: alle Datenbankzugriffe laufen hierüber.
// Ein späterer Wechsel weg von DynamoDB betrifft nur eine neue Implementierung von DraftRepository.

export interface DraftRecord {
  owner: string          // "<Tenant-Scope>#<Nutzer-ID aus dem Token>"
  formType: string
  status: 'draft'
  name: string
  data: Record<string, unknown>
  clientUpdatedAt: number   // Zeitstempel der Client-Uhr (für Konfliktvergleich mit der lokalen Kopie)
  updatedAt: string         // ISO, Server-Uhr
  expiresAt: number         // Unix-Sekunden, DynamoDB-TTL
}

export interface DraftRepository {
  get(owner: string, formType: string): Promise<DraftRecord | null>
  /** Upsert: ersetzt den vorhandenen Entwurf für (owner, formType) */
  put(record: DraftRecord): Promise<void>
  delete(owner: string, formType: string): Promise<void>
}

export const DRAFTS_TABLE = 'plexora-drafts'

type DynamoLike = { send(command: any): Promise<any> }

export class DynamoDraftRepository implements DraftRepository {
  // Commands werden injiziert, damit das Modul ohne AWS-SDK testbar bleibt
  constructor(
    private client: DynamoLike,
    private cmd: { Get: any; Put: any; Delete: any },
    private table = DRAFTS_TABLE,
  ) {}

  async get(owner: string, formType: string) {
    const res = await this.client.send(new this.cmd.Get({ TableName: this.table, Key: { owner, formType } }))
    return (res.Item as DraftRecord | undefined) ?? null
  }

  async put(record: DraftRecord) {
    await this.client.send(new this.cmd.Put({ TableName: this.table, Item: record }))
  }

  async delete(owner: string, formType: string) {
    await this.client.send(new this.cmd.Delete({ TableName: this.table, Key: { owner, formType } }))
  }
}

/** In-Memory-Variante für Tests (und lokale Entwicklung ohne AWS) */
export class InMemoryDraftRepository implements DraftRepository {
  readonly items = new Map<string, DraftRecord>()
  private key(owner: string, formType: string) { return `${owner}\u0000${formType}` }
  async get(owner: string, formType: string) { return structuredClone(this.items.get(this.key(owner, formType)) ?? null) }
  async put(record: DraftRecord) { this.items.set(this.key(record.owner, record.formType), structuredClone(record)) }
  async delete(owner: string, formType: string) { this.items.delete(this.key(owner, formType)) }
}
