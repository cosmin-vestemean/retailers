export const UI_PREFIX = '/app'

export const UI_ROUTES = {
  dashboard: UI_PREFIX,
  retailer: `${UI_PREFIX}/retailer/:trdr`,
  config: `${UI_PREFIX}/config/:trdr`,
  logs: `${UI_PREFIX}/logs`,
  fallback: UI_PREFIX,
}

export const dashboardUrl = () => UI_ROUTES.dashboard
export const retailerUrl = (trdr) => `${UI_PREFIX}/retailer/${trdr}`
export const configUrl = (trdr) => `${UI_PREFIX}/config/${trdr}`
export const logsUrl = () => UI_ROUTES.logs