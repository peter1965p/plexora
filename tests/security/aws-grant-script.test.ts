import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const grant = readFileSync('scripts/aws/grant-backup-setup-rights.sh', 'utf8')
const setup = readFileSync('scripts/aws/setup-backup.sh', 'utf8')
const policy = grant.slice(grant.indexOf('{"Version"'), grant.indexOf('JSON\n\necho'))
const statements: any[] = JSON.parse(policy.replace(/\$WORKER_ROLE/g, 'ROLE-W').replace(/\$API_ROLE/g, 'ROLE-A').replace(/\$WORKER_FN/g, 'FN-W').replace(/\$API_FN/g, 'FN-A')).Statement
const actions = statements.flatMap(s => (Array.isArray(s.Action) ? s.Action : [s.Action]))

describe('Vorübergehende Rechte für setup-backup.sh (grant-backup-setup-rights.sh)', () => {
  it('nie "*": weder als Ressource noch als Aktion (kein iam:*, lambda:*, s3:*)', () => {
    for (const s of statements) { expect(s.Resource, s.Sid).not.toBe('*'); expect(String(s.Resource), s.Sid).not.toContain('*') }
    for (const a of actions) expect(a, a).not.toMatch(/\*/)
    expect(actions.filter(a => a.startsWith('s3:') || a.startsWith('dynamodb:'))).toEqual([])
  })
  it('keine gefährlichen Rechte: kein Benutzer-/Schlüssel-/Richtlinien-Verwalten, kein Anlegen anderer Rollen, kein Löschen', () => {
    for (const bad of ['iam:CreateUser', 'iam:CreateAccessKey', 'iam:PutUserPolicy', 'iam:AttachUserPolicy', 'iam:DeleteRole', 'iam:UpdateAssumeRolePolicy', 'iam:CreatePolicy', 'lambda:DeleteFunction', 'lambda:AddPermission', 'sts:AssumeRole']) expect(actions, bad).not.toContain(bad)
    expect(statements.filter(s => String(s.Resource).includes('ROLE-W') || String(s.Resource).includes('ROLE-A') || String(s.Resource).includes('FN-')).length).toBe(statements.length)
  })
  it('PassRole nur für die Worker-Rolle und nur an Lambda', () => {
    const p = statements.find(s => s.Action === 'iam:PassRole')!
    expect(p.Resource).toBe('ROLE-W'); expect(p.Condition.StringEquals['iam:PassedToService']).toBe('lambda.amazonaws.com')
  })
  it('deckt jeden IAM- und Lambda-Befehl ab, den setup-backup.sh --apply ausführt (sonst scheitert es wieder)', () => {
    const map: Record<string, string> = {
      'iam create-role': 'iam:CreateRole', 'iam put-role-policy': 'iam:PutRolePolicy', 'iam attach-role-policy': 'iam:AttachRolePolicy', 'iam get-role': 'iam:GetRole',
      'lambda create-function': 'lambda:CreateFunction', 'lambda get-function': 'lambda:GetFunction', 'lambda update-function-configuration': 'lambda:UpdateFunctionConfiguration',
      'lambda get-function-configuration': 'lambda:GetFunctionConfiguration', 'lambda wait': 'lambda:GetFunction',
    }
    const used = new Set([...setup.matchAll(/aws (iam|lambda) ([a-z-]+)/g)].map(m => `${m[1]} ${m[2]}`).filter(c => !/detach|delete|remove/.test(c)))
    expect(used.size).toBeGreaterThan(3)
    for (const c of used) { expect(map[c], `Befehl nicht zugeordnet: ${c}`).toBeDefined(); expect(actions, c).toContain(map[c]) }
  })
  it('Sicherungen: Probelauf ändert nichts; Anwenden/Entfernen nur mit Admin (bricht als plexora-app ab); --revoke löscht genau diese Richtlinie', () => {
    expect(grant).toMatch(/--dry-run\) echo; echo "\(Probelauf: nichts geändert\)"; exit 0/)
    expect(grant).toMatch(/\$CALLER" == \*"user\/\$USER_NAME"[\s\S]*exit 2/)
    expect(grant).toContain('aws iam delete-user-policy --user-name "$USER_NAME" --policy-name "$POLICY"')
    expect(grant).toContain('POLICY="plexora-backup-setup-temp"'); expect(grant).not.toMatch(/delete-user(?!-policy)|delete-role|create-access-key|create-user/)
  })
  it('gibt keine Secret-Werte aus (keine Umgebungsvariablen-Abfrage)', () => {
    expect(grant).not.toMatch(/aws lambda get-function-configuration|Environment|SECRET|printenv/)
  })
})
