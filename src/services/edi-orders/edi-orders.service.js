import { EdiOrdersService, getOptions } from './edi-orders.class.js'

export const ediOrdersPath = 'edi-orders'
export const ediOrdersMethods = ['create']

export const ediOrders = (app) => {
  app.use(ediOrdersPath, new EdiOrdersService(getOptions(app)), {
    methods: ediOrdersMethods,
    events: []
  })
}