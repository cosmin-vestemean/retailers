const STORAGE_KEY = 'retailers.ui.theme'
const THEME_STYLESHEET_ID = 'retailers-theme-stylesheet'
const BUILTIN_THEME_ID = 'tabler'

const themeModules = import.meta.glob('./themes/*.css', {
  eager: true,
  import: 'default',
  query: '?url',
})

const scannedThemes = Object.entries(themeModules)
  .map(([filePath, href]) => {
    const match = filePath.match(/\.\/themes\/([^/]+)\.css$/)
    if (!match) {
      return null
    }

    const id = match[1]
    return {
      id,
      label: formatThemeLabel(id),
      href,
    }
  })
  .filter(Boolean)
  .sort((left, right) => left.label.localeCompare(right.label))

const themes = [
  {
    id: BUILTIN_THEME_ID,
    label: 'Tabler',
    href: null,
  },
  ...scannedThemes,
]

function formatThemeLabel(id) {
  return id
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getThemeDefinition(themeId) {
  return themes.find((theme) => theme.id === themeId) || themes[0]
}

function getThemeStylesheet() {
  return document.getElementById(THEME_STYLESHEET_ID)
}

function ensureThemeStylesheet() {
  let stylesheet = getThemeStylesheet()
  if (stylesheet) {
    return stylesheet
  }

  stylesheet = document.createElement('link')
  stylesheet.id = THEME_STYLESHEET_ID
  stylesheet.rel = 'stylesheet'
  document.head.appendChild(stylesheet)
  return stylesheet
}

export function getAvailableThemes() {
  return themes
}

export function getStoredThemeId() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function getActiveThemeId() {
  const storedThemeId = getStoredThemeId()
  return getThemeDefinition(storedThemeId).id
}

export function applyTheme(themeId, { persist = true } = {}) {
  const theme = getThemeDefinition(themeId)
  const root = document.documentElement

  root.dataset.uiTheme = theme.id

  if (theme.href) {
    const stylesheet = ensureThemeStylesheet()
    if (stylesheet.getAttribute('href') !== theme.href) {
      stylesheet.setAttribute('href', theme.href)
    }
  } else {
    getThemeStylesheet()?.remove()
  }

  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, theme.id)
    } catch {
      // Ignore storage failures and keep the theme applied in-memory.
    }
  }

  return theme.id
}

export function initializeTheme() {
  return applyTheme(getStoredThemeId(), { persist: false })
}