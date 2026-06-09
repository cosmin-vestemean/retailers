import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3'

const DEFAULT_LIMIT = 100

export function getDoStorageConfig(env = process.env) {
  const endpoint = trimTrailingSlash(env.DO_ENDPOINT || '')
  const bucket = env.DO_BUCKET || ''
  const accessKeyId = env.DO_ACCESS_KEY || ''
  const secretAccessKey = env.DO_SECRET_KEY || ''
  const region = env.DO_REGION || inferRegion(endpoint)

  return {
    bucket,
    endpoint,
    region,
    accessKeyId,
    secretAccessKey,
    configured: !!(bucket && endpoint && accessKeyId && secretAccessKey)
  }
}

export function createDoStorageClient({ env = process.env, s3Client } = {}) {
  const config = getDoStorageConfig(env)
  const s3 = s3Client || (config.configured
    ? new S3Client({
        region: config.region,
        endpoint: config.endpoint,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey
        }
      })
    : null)

  const assertConfigured = () => {
    if (!config.configured || !s3) throw new Error('DigitalOcean Spaces is not configured')
  }

  return {
    config: publicConfig(config),
    isConfigured: () => config.configured,

    async status() {
      if (!config.configured || !s3) return { ...publicConfig(config), accessible: false }
      try {
        await s3.send(new HeadBucketCommand({ Bucket: config.bucket }))
        return { ...publicConfig(config), accessible: true }
      } catch (error) {
        return { ...publicConfig(config), accessible: false, error: error.message }
      }
    },

    async list({ prefix = '', limit = DEFAULT_LIMIT, continuationToken } = {}) {
      assertConfigured()
      const result = await s3.send(new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: prefix,
        MaxKeys: clampLimit(limit),
        ContinuationToken: continuationToken
      }))

      const data = (result.Contents || []).map((item) => ({
        key: item.Key,
        size: item.Size || 0,
        lastModified: item.LastModified ? item.LastModified.toISOString() : null,
        storageClass: item.StorageClass || ''
      }))

      return {
        data,
        total: data.length,
        prefix,
        isTruncated: !!result.IsTruncated,
        nextContinuationToken: result.NextContinuationToken || null
      }
    },

    async putXml({ key, xml, metadata = {}, contentType = 'application/xml; charset=utf-8' }) {
      assertConfigured()
      await s3.send(new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: xml,
        ContentType: contentType,
        Metadata: sanitizeMetadata(metadata)
      }))
      return { key }
    },

    async getText(key) {
      assertConfigured()
      const result = await s3.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }))
      return {
        key,
        body: await streamToString(result.Body),
        metadata: result.Metadata || {},
        contentType: result.ContentType || '',
        lastModified: result.LastModified ? result.LastModified.toISOString() : null
      }
    },

    async head(key) {
      assertConfigured()
      const result = await s3.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }))
      return { key, metadata: result.Metadata || {}, contentType: result.ContentType || '' }
    },

    async delete(key) {
      assertConfigured()
      await s3.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }))
      return { key }
    },

    async copy({ fromKey, toKey, metadata }) {
      assertConfigured()
      let nextMetadata = metadata
      let contentType = 'application/xml; charset=utf-8'
      if (!nextMetadata) {
        try {
          const head = await this.head(fromKey)
          nextMetadata = head.metadata
          contentType = head.contentType || contentType
        } catch {
          nextMetadata = {}
        }
      }
      await s3.send(new CopyObjectCommand({
        Bucket: config.bucket,
        Key: toKey,
        CopySource: copySource(config.bucket, fromKey),
        MetadataDirective: 'REPLACE',
        ContentType: contentType,
        Metadata: sanitizeMetadata(nextMetadata || {})
      }))
      return { key: toKey }
    },

    async move({ fromKey, toKey, metadata }) {
      await this.copy({ fromKey, toKey, metadata })
      await this.delete(fromKey)
      return { fromKey, key: toKey }
    }
  }
}

export function makeDoXmlKey({ state, stage, provider, retailer, docType, filename, date = new Date() }) {
  const datePart = typeof date === 'string' ? date.slice(0, 10) : date.toISOString().slice(0, 10)
  const prefix = state === 'retry'
    ? `retry/${safeSegment(stage || 'unknown')}`
    : state === 'archive'
      ? `archive/${safeSegment(stage || 'processed')}`
      : 'incoming'

  return [
    prefix,
    safeSegment(provider || 'unknown'),
    safeSegment(retailer || 'unknown'),
    safeSegment(docType || 'unknown').toUpperCase(),
    datePart,
    safeFilename(filename || 'xml-file.xml')
  ].join('/')
}

export function metadataForXml({ provider, retailer, trdrClient, docType, filename, stage, error, cccsftpxmlId, sourcePath, retryCount }) {
  return sanitizeMetadata({
    provider,
    retailer,
    trdrclient: trdrClient,
    doctype: docType,
    filename,
    stage,
    error,
    cccsftpxmlid: cccsftpxmlId,
    sourcepath: sourcePath,
    retrycount: retryCount,
    updatedat: new Date().toISOString()
  })
}

function publicConfig(config) {
  return {
    configured: config.configured,
    bucket: config.bucket || null,
    endpoint: config.endpoint || null,
    region: config.region || null,
    hasAccessKey: !!config.accessKeyId,
    hasSecretKey: !!config.secretAccessKey
  }
}

function inferRegion(endpoint) {
  if (!endpoint) return 'fra1'
  try {
    const host = new URL(endpoint).hostname
    return host.split('.')[0] || 'fra1'
  } catch {
    return 'fra1'
  }
}

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '')
}

function clampLimit(limit) {
  const parsed = parseInt(limit) || DEFAULT_LIMIT
  return Math.max(1, Math.min(parsed, 1000))
}

function safeSegment(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_.=-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown'
}

function safeFilename(value) {
  const base = String(value || '').split(/[\\/]/).pop() || 'xml-file.xml'
  return base.replace(/[^a-zA-Z0-9_.=-]+/g, '-')
}

function sanitizeMetadata(metadata) {
  const out = {}
  for (const [rawKey, rawValue] of Object.entries(metadata || {})) {
    if (rawValue === undefined || rawValue === null || rawValue === '') continue
    const key = String(rawKey).toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 64)
    if (!key) continue
    out[key] = String(rawValue).replace(/[\r\n]+/g, ' ').slice(0, 1800)
  }
  return out
}

function copySource(bucket, key) {
  const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/')
  return `/${bucket}/${encodedKey}`
}

async function streamToString(stream) {
  if (!stream) return ''
  if (typeof stream.transformToString === 'function') return stream.transformToString()
  const chunks = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}