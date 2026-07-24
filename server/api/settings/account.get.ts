import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const config = useRuntimeConfig()
  const dynamo = getDynamoClient()

  const res = await dynamo.send(new GetCommand({
    TableName: 'plexora-user-profiles',
    Key: { email: auth.email },
  }))

  // Google-Verknüpfungsstatus separat aus Cognito lesen (nicht Teil des eigenen
  // Profil-Datensatzes) — Konto gilt als verknüpft, sobald identities einen Eintrag hat.
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME
  const cognito = isLambda
    ? new CognitoIdentityProviderClient({ region: 'eu-central-1' })
    : new CognitoIdentityProviderClient({
        region: 'eu-central-1',
        credentials: {
          accessKeyId:     (process.env.NUXT_AWS_ACCESS_KEY_ID || '').replace(/^"|"$/g, ''),
          secretAccessKey: (process.env.NUXT_AWS_SECRET_ACCESS_KEY || '').replace(/^"|"$/g, ''),
        },
      })
  const userPoolId = (config.public as any).awsUserPoolId as string || 'eu-central-1_lM7sN6LvC'

  let googleLinked = false
  try {
    const listRes = await cognito.send(new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `email = "${auth.email}"`,
      Limit: 1,
    }))
    const identities = listRes.Users?.[0]?.Attributes?.find(a => a.Name === 'identities')?.Value
    googleLinked = !!identities && identities.includes('"providerName":"Google"')
  } catch {}

  return {
    profile: {
      name: res.Item?.name || '',
      avatarUrl: res.Item?.avatarUrl || '',
    },
    googleLinked,
  }
})
