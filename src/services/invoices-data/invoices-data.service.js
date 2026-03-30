import { InvoicesDataService, getOptions } from './invoices-data.class.js'

export const invoicesDataPath = 'invoices-data'
export const invoicesDataMethods = ['find']

export const invoicesData = (app) => {
  app.use(invoicesDataPath, new InvoicesDataService(getOptions(app)), {
    methods: invoicesDataMethods,
    events: []
  })
}
