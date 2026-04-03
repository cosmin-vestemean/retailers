import { RetailerStatsService, getOptions } from './retailer-stats.class.js'

export const retailerStatsPath = 'retailer-stats'
export const retailerStatsMethods = ['find']

export const retailerStats = (app) => {
  app.use(retailerStatsPath, new RetailerStatsService(getOptions(app)), {
    methods: retailerStatsMethods,
    events: []
  })
}