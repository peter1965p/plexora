import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

const BUCKET = 'plexora-files'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const prefix = (query.prefix as string) || ''

  const client = new S3Client({ region: 'eu-central-1' })

  const result = await client.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: prefix,
    Delimiter: '/',
  }))

  const folders = (result.CommonPrefixes || []).map(p => ({
    name: (p.Prefix || '').slice(prefix.length).replace(/\/$/, ''),
    prefix: p.Prefix,
  }))

  const files = (result.Contents || [])
    .filter(o => o.Key !== prefix) // Ordner-Marker selbst ausschließen
    .map(o => ({
      key: o.Key,
      name: (o.Key || '').slice(prefix.length),
      size: o.Size || 0,
      lastModified: o.LastModified,
      url: `https://${BUCKET}.s3.eu-central-1.amazonaws.com/${o.Key}`,
    }))

  return { bucket: BUCKET, prefix, folders, files }
})
