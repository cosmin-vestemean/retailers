export async function parseS1Json(response, label) {
  const text = await response.text()
  const status = response.statusText ? `${response.status} ${response.statusText}` : response.status
  if (!text || !text.trim()) {
    throw new Error(`${label} returned empty response (HTTP ${status})`)
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`${label} returned non-JSON response (HTTP ${status}): ${text.slice(0, 300)}`)
  }
}