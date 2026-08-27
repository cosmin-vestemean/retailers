export async function parseS1Json(response, label) {
  const status = response.statusText ? `${response.status} ${response.statusText}` : response.status
  const text = await decodeS1Body(response)
  if (!text || !text.trim()) {
    throw new Error(`${label} returned empty response (HTTP ${status})`)
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`${label} returned non-JSON response (HTTP ${status}): ${text.slice(0, 300)}`)
  }
}

// SoftOne declares its real charset (e.g. windows-1253 for Greek object-layer error text such
// as GETLASTERROR messages) in the Content-Type header, but the Fetch spec's response.text()
// always UTF-8-decodes regardless of it -- so non-ASCII S1 text comes back as "?????"/"\uFFFD"
// unless the raw bytes are decoded with the declared charset instead.
async function decodeS1Body(response) {
  const contentType = typeof response.headers?.get === 'function' ? response.headers.get('content-type') : null
  const match = contentType && /charset=([^;]+)/i.exec(contentType)
  const charset = match ? match[1].trim().toLowerCase() : 'utf-8'
  if (charset === 'utf-8' || charset === 'utf8' || typeof response.arrayBuffer !== 'function') {
    return response.text()
  }
  try {
    return new TextDecoder(charset).decode(await response.arrayBuffer())
  } catch {
    return response.text()
  }
}