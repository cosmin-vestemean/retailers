import { MarkInvoiceSentService, getOptions } from './mark-invoice-sent.class.js'

export const markInvoiceSentPath = 'mark-invoice-sent'
export const markInvoiceSentMethods = ['create']

export const markInvoiceSent = (app) => {
  app.use(markInvoiceSentPath, new MarkInvoiceSentService(getOptions(app)), {
    methods: markInvoiceSentMethods,
    events: []
  })
}