import { Amplify } from "aws-amplify";

export default defineNuxtPlugin(() => {
  try {
    const config = useRuntimeConfig();
    const userPoolId = config.public.awsUserPoolId as string || 'eu-central-1_lM7sN6LvC'
    const userPoolClientId = config.public.awsClientId as string || '1aa9chqqkgr9dp232cgpa4nanb'
    // Cognito-Hosted-Domain fürs OAuth-Redirect (Google-Login) — kein eigenes Google-Secret
    // im Frontend nötig, das steckt schon im Cognito Identity Provider selbst.
    const cognitoDomain = 'eu-central-1lm7sn6lvc.auth.eu-central-1.amazoncognito.com'
    const redirectSignIn = `${window.location.origin}/auth/callback`
    const redirectSignOut = `${window.location.origin}/login`

    if (userPoolId && userPoolClientId) {
      Amplify.configure({
        Auth: {
          Cognito: {
            userPoolId,
            userPoolClientId,
            loginWith: {
              oauth: {
                domain: cognitoDomain,
                scopes: ['email', 'openid', 'profile'],
                redirectSignIn: [redirectSignIn],
                redirectSignOut: [redirectSignOut],
                responseType: 'code',
              },
            },
          },
        },
      })
    }
  } catch(e) {
    console.warn('Amplify config error:', e)
  }
})
