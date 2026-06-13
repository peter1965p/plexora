import { LambdaClient, ListFunctionsCommand, GetFunctionCommand } from '@aws-sdk/client-lambda'
import { CloudWatchClient, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch'

export default defineEventHandler(async () => {
  const lambda = new LambdaClient({ region: 'eu-central-1' })
  const { Functions } = await lambda.send(new ListFunctionsCommand({}))

  const functions = (Functions || []).map(f => ({
    name: f.FunctionName,
    runtime: f.Runtime,
    memory: f.MemorySize,
    timeout: f.Timeout,
    lastModified: f.LastModified,
    codeSize: f.CodeSize,
    description: f.Description,
  }))

  return { functions }
})
