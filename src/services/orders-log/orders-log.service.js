import { OrdersLogService, getOptions } from './orders-log.class.js'

export const ordersLogPath = 'orders-log'
export const ordersLogMethods = ['find', 'remove']

export const ordersLog = (app) => {
  app.use(ordersLogPath, new OrdersLogService(getOptions(app)), {
    methods: ordersLogMethods,
    events: []
  })
}
