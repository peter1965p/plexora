import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export function getDynamoClient(): DynamoDBDocumentClient {
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  const dynamo = isLambda
    ? new DynamoDBClient({ region: "eu-central-1" })
    : new DynamoDBClient({
        region: "eu-central-1",
        credentials: {
          accessKeyId: (process.env.NUXT_AWS_ACCESS_KEY_ID || '').replace(/^"|"$/g, ''),
          secretAccessKey: (process.env.NUXT_AWS_SECRET_ACCESS_KEY || '').replace(/^"|"$/g, ''),
        },
      });

  return DynamoDBDocumentClient.from(dynamo, {
    marshallOptions: { removeUndefinedValues: true },
  });
}
