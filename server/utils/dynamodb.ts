import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

let client: DynamoDBDocumentClient | null = null;

export function getDynamoClient(): DynamoDBDocumentClient {
  if (client) return client;

  const config = useRuntimeConfig();

  const secretKey = (config.awsSecretAccessKey as string).replace(/^"|"$/g, "");
  const accessKey = (config.awsAccessKeyId as string).replace(/^"|"$/g, "");

  const dynamo = new DynamoDBClient({
    region: "eu-central-1",
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
  });

  client = DynamoDBDocumentClient.from(dynamo, {
    marshallOptions: { removeUndefinedValues: true },
  });

  return client;
}
