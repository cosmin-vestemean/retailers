export const AUTH_COOKIE = 'retailers_session'

function cookieOptions(maxAgeMs) {
  const isProd = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    overwrite: true,
    ...(maxAgeMs ? { maxAge: maxAgeMs } : {})
  }
}

function jwtExpiryMs(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'))
    if (payload?.exp) {
      const ms = payload.exp * 1000 - Date.now()
      return ms > 0 ? ms : undefined
    }
  } catch {
    // Fall back to a browser session cookie.
  }
  return undefined
}

function readCookieHeader(header, name) {
  const cookies = String(header || '').split(';')
  for (const cookie of cookies) {
    const [rawName, ...rawValue] = cookie.trim().split('=')
    if (rawName === name && rawValue.length) {
      const value = rawValue.join('=')
      try {
        return decodeURIComponent(value)
      } catch {
        return value
      }
    }
  }
  return undefined
}

function readCookie(ctx, name) {
  return ctx.cookies.get(name) || readCookieHeader(ctx.get('cookie'), name)
}

export const readAuthCookie = () => async (ctx, next) => {
  ctx.feathers = ctx.feathers || {}
  ctx.feathers.koa = { ctx }

  const existing = ctx.feathers.authentication
  const token = readCookie(ctx, AUTH_COOKIE)
  if (token && !existing?.accessToken) {
    ctx.feathers.authentication = { ...existing, strategy: 'jwt', accessToken: token }
  }
  await next()
}

export const setAuthCookie = async (context) => {
  const ctx = context.params?.koa?.ctx
  const token = context.result?.accessToken
  if (ctx && token) {
    ctx.cookies.set(AUTH_COOKIE, token, cookieOptions(jwtExpiryMs(token)))
  }
  return context
}

export const clearAuthCookie = async (context) => {
  const ctx = context.params?.koa?.ctx
  if (ctx) {
    ctx.cookies.set(AUTH_COOKIE, '', { ...cookieOptions(), maxAge: 0 })
  }
  return context
}