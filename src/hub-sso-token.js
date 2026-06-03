import { createHmac, timingSafeEqual } from 'node:crypto'

const ALG = 'HS256'

function getSecret() {
  const secret = process.env.HUB_SSO_SECRET
  if (!secret) {
    throw new Error('Hub SSO is not configured')
  }
  return secret
}

function sign(input) {
  return createHmac('sha256', getSecret()).update(input).digest('base64url')
}

export function verifyHubSsoToken(token, audience) {
  const parts = String(token || '').split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid SSO token format')
  }

  const [encodedHeader, encodedPayload, signature] = parts
  const input = `${encodedHeader}.${encodedPayload}`
  const expected = sign(input)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new Error('Invalid SSO token signature')
  }

  const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'))
  if (header.alg !== ALG) {
    throw new Error('Unsupported SSO token algorithm')
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))
  const now = Math.floor(Date.now() / 1000)
  if (payload.iss !== 'pet-factory-hub' || payload.aud !== audience) {
    throw new Error('Invalid SSO token issuer or audience')
  }
  if (!payload.exp || payload.exp < now) {
    throw new Error('Expired SSO token')
  }
  if (!Number.isInteger(Number(payload.userId)) || Number(payload.userId) <= 0) {
    throw new Error('Invalid SSO token user')
  }

  return {
    userId: Number(payload.userId),
    username: payload.username || null,
    name: payload.name || payload.username || ''
  }
}