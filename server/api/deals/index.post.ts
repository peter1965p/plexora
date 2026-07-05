import { resolveUserId } from '../../utils/tenant'
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamoClient } from "../../utils/dynamodb";
import { randomUUID } from "crypto";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const client = getDynamoClient();

  const deal = {
    userId: await resolveUserId(event.context.auth?.email || 'demo-user'),
    dealId: randomUUID(),
    name: body.name,
    value: body.value,
    stage: body.stage,
    prob: body.prob || 0,
    status: body.status || "info",
    created: new Date().toISOString(),
  };

  await client.send(
    new PutCommand({
      TableName: "plexora-deals",
      Item: deal,
    }),
  );

  return { success: true, deal };
});
