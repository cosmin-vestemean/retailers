import { OrdersDataService, getOptions } from './orders-data.class.js'

export const ordersDataPath = 'orders-data'
export const ordersDataMethods = ['find']

export const ordersData = (app) => {
  app.use(ordersDataPath, new OrdersDataService(getOptions(app)), {
    methods: ordersDataMethods,
    events: []
  })
}
