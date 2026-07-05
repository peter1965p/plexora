import { CloudWatchLogsClient, DescribeLogGroupsCommand, GetLogEventsCommand, DescribeLogStreamsCommand } from '@aws-sdk/client-cloudwatch-logs'
import { requireAdmin } from '../../utils/verifyAuth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const client = new CloudWatchLogsClient({ region: 'eu-central-1' })

  try {
    const { logStreams } = await client.send(new DescribeLogStreamsCommand({
      logGroupName: '/aws/lambda/plexora-api',
      orderBy: 'LastEventTime',
      descending: true,
      limit: 1,
    }))

    if (!logStreams?.length) return { events: [] }

    const { events } = await client.send(new GetLogEventsCommand({
      logGroupName: '/aws/lambda/plexora-api',
      logStreamName: logStreams[0].logStreamName!,
      limit: 50,
    }))

    return {
      events: (events || []).map(e => ({
        message: e.message,
        timestamp: e.timestamp,
      }))
    }
  } catch {
    return { events: [] }
  }
})
