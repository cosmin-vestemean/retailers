import { RetailerService, getOptions } from './retailer.class.js'

export const retailerPath = 'retailer'
export const retailerMethods = ['find']

export const retailer = (app) => {
  app.use(retailerPath, new RetailerService(getOptions(app)), {
    methods: retailerMethods,
    events: []
  })
}