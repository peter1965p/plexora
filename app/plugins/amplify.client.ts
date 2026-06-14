import { Amplify } from "aws-amplify";

export default defineNuxtPlugin(() => {
  try {
    const config = useRuntimeConfig();
    const userPoolId = config.public.awsUserPoolId as string || 'eu-central-1_lM7sN6LvC'
    const userPoolClientId = config.public.awsClientId as string || '1aa9chqqkgr9dp232cgpa4nanb'

    if (userPoolId && userPoolClientId) {
      Amplify.configure({
        Auth: {
          Cognito: {
            userPoolId,
            userPoolClientId,
          },
        },
      })
    }
  } catch(e) {
    console.warn('Amplify config error:', e)
  }
})
