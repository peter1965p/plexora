import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamoClient } from "../../utils/dynamodb";

export default defineEventHandler(async (event) => {
  const client = getDynamoClient();

  const result = await client.send(
    new ScanCommand({
      TableName: "plexora-deals",
    }),
  );

  return {
    deals: result.Items || [],
  };
});
