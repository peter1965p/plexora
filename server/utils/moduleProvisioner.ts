import { PutCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { Resend } from 'resend'
import { randomBytes } from 'crypto'

const MODULE_NAMES: Record<string, string> = {
  crm:          'CRM',
  finance:      'Finanzen',
  projects:     'Projekte',
  hr:           'HR',
  support:      'Support',
  marketing:    'Marketing',
  shop:         'Shop',
  forms:        'Formulare',
  nexora:       'Unternehmens-Webseite (Nexora)',
  automotive:   'Automotive',
  einzelhandel: 'Einzelhandel',
  gastro:       'Gastronomie',
  handwerk:     'Handwerk',
  immobilien:   'Immobilien',
  gesundheit:   'Gesundheit / Praxis',
}

// Muss mit branchenPakete in app/pages/store.vue und BRANCH_MODULES in
// AppSidebar.vue synchron gehalten werden.
const BRANCH_PACKAGE_KEYS = new Set(['automotive', 'einzelhandel', 'gastro', 'handwerk', 'immobilien', 'gesundheit'])

async function findNexoraTenant(dynamo: DynamoDBDocumentClient, email: string) {
  const res = await dynamo.send(new ScanCommand({
    TableName: 'plexora-nexora',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  }))
  return res.Items?.[0] as any | undefined
}

function newNexoraTenantItem(licenseKey: string, email: string) {
  return {
    tenantId:    licenseKey,
    email,
    apiKey:      'plx_pub_' + randomBytes(20).toString('hex'),
    status:      'active',
    companyName: '',
    subdomain:   '',
    branchPackages: [] as string[],
    config: {
      primaryColor:   '#6C3FE8',
      secondaryColor: '#0a0e1a',
      fontFamily:     'Inter, sans-serif',
    },
    pages:     [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export async function provisionModule(
  moduleKey:  string,
  licenseKey: string,
  email:      string,
  dynamo:     DynamoDBDocumentClient,
  resend:     Resend,
) {
  const moduleName = MODULE_NAMES[moduleKey] || moduleKey
  let extraHtml    = ''

  if (moduleKey === 'nexora') {
    try {
      const existing = await findNexoraTenant(dynamo, email)
      let apiKey = existing?.apiKey || ''
      if (existing) {
        // Tenant-Datensatz existiert schon (z.B. weil zuvor ein Branchenpaket gekauft
        // wurde und dabei bereits einen minimalen Datensatz angelegt hat) — nicht
        // überschreiben, sonst gehen branchPackages/config/pages verloren.
        console.log(`ℹ️  Nexora Tenant ${existing.tenantId} existiert bereits, kein Überschreiben`)
      } else {
        const item = newNexoraTenantItem(licenseKey, email)
        apiKey = item.apiKey
        await dynamo.send(new PutCommand({ TableName: 'plexora-nexora', Item: item }))
        console.log(`✅ Nexora Tenant ${licenseKey} provisioniert`)
      }
      extraHtml = `
        <div style="background:#f5f3ff;border:2px solid #6C3FE8;border-radius:12px;padding:20px 28px;margin:24px 0">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#7c6ab5;margin-bottom:10px">Dein Nexora API-Key</div>
          <code style="font-size:13px;font-weight:700;letter-spacing:1px;color:#6C3FE8;word-break:break-all;display:block;padding:10px;background:#ede9fe;border-radius:6px">${apiKey}</code>
          <p style="margin:12px 0 0;font-size:12px;color:#7c6ab5">Diesen Key benötigst du im Nexora-Frontend unter <code>VITE_PLEXORA_API_KEY</code>.<br>Er ist jederzeit in <strong>Plexora → Website</strong> einsehbar.</p>
        </div>
        <p style="font-size:13px;color:#555">Richte deine Webseite jetzt in <strong>Plexora → Website</strong> ein.</p>
      `
    } catch (err) {
      console.error('Nexora-Provisioning fehlgeschlagen:', err)
    }
  }

  if (BRANCH_PACKAGE_KEYS.has(moduleKey)) {
    try {
      let tenant = await findNexoraTenant(dynamo, email)
      if (!tenant) {
        tenant = newNexoraTenantItem(licenseKey, email)
        await dynamo.send(new PutCommand({ TableName: 'plexora-nexora', Item: tenant }))
        console.log(`✅ Nexora Tenant ${licenseKey} für Branchenpaket ${moduleKey} minimal angelegt`)
      }

      const bp = tenant.branchPackages
      const existingPackages: string[] = bp instanceof Set ? Array.from(bp as Set<string>) : (Array.isArray(bp) ? bp : [])
      if (!existingPackages.includes(moduleKey)) {
        const updated = [...existingPackages, moduleKey]
        await dynamo.send(new UpdateCommand({
          TableName: 'plexora-nexora',
          Key: { tenantId: tenant.tenantId },
          UpdateExpression: 'SET branchPackages = :p, updatedAt = :u',
          ExpressionAttributeValues: { ':p': updated, ':u': new Date().toISOString() },
        }))
        console.log(`✅ Branchenpaket ${moduleKey} für Tenant ${tenant.tenantId} freigeschaltet`)
      } else {
        console.log(`ℹ️  Branchenpaket ${moduleKey} war bei Tenant ${tenant.tenantId} bereits freigeschaltet`)
      }
    } catch (err) {
      console.error('Branchenpaket-Freischaltung fehlgeschlagen:', err)
    }
  }

  try {
    await resend.emails.send({
      from:    'Plexora <noreply@plexora.eu>',
      to:      email,
      subject: `✅ ${moduleName} wurde aktiviert`,
      html: `
        <html><body style="font-family:sans-serif;color:#333;max-width:600px;margin:0 auto;padding:32px">
          <div style="text-align:center;margin-bottom:32px">
            <div style="display:inline-block;background:#6C3FE8;border-radius:12px;padding:10px 18px">
              <span style="color:#fff;font-weight:900;font-size:18px;letter-spacing:1px">PLEXORA</span>
            </div>
          </div>
          <div style="background:#22c55e18;border:1px solid #22c55e55;border-radius:12px;padding:16px 20px;margin-bottom:24px">
            <div style="font-weight:700;color:#166534;font-size:15px;margin-bottom:4px">✅ ${moduleName} ist jetzt aktiv!</div>
            <div style="font-size:12px;color:#555">Das Modul wurde deiner Lizenz hinzugefügt und steht sofort bereit.</div>
          </div>
          ${extraHtml}
          <div style="text-align:center;margin:32px 0">
            <a href="https://app.plexora.eu" style="background:#6C3FE8;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
              Jetzt in Plexora ansehen
            </a>
          </div>
          <p style="font-size:12px;color:#aaa;border-top:1px solid #eee;padding-top:20px;margin-top:32px">
            Das Plexora Team · <a href="mailto:billing@plexora.eu" style="color:#6C3FE8">billing@plexora.eu</a>
          </p>
        </body></html>
      `,
    })
    console.log(`✅ Bestätigungsmail Modul ${moduleKey} → ${email}`)
  } catch (err) {
    console.error('Bestätigungsmail fehlgeschlagen:', err)
  }
}
