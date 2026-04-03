import { GetInvoiceDomService, getOptions } from './get-invoice-dom.class.js'

export const getInvoiceDomPath = 'getInvoiceDom'
export const getInvoiceDomMethods = ['find']

export const getInvoiceDom = (app) => {
  app.use(getInvoiceDomPath, new GetInvoiceDomService(getOptions(app)), {
    methods: getInvoiceDomMethods,
    events: []
  })
}