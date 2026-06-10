import { EdiInvoicesService, getOptions } from './edi-invoices.class.js'

export const ediInvoicesPath = 'edi-invoices'
export const ediInvoicesMethods = ['create']

export const ediInvoices = (app) => {
  app.use(ediInvoicesPath, new EdiInvoicesService(getOptions(app)), {
    methods: ediInvoicesMethods,
    events: []
  })
}