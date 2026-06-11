import { Amplify } from "aws-amplify";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.public.awsUserPoolId as string,
        userPoolClientId: config.public.awsClientId as string,
      },
    },
  });
});
