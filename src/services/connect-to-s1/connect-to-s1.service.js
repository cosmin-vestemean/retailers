import { ConnectToS1Service, getOptions } from './connect-to-s1.class.js'

export const connectToS1Path = 'connectToS1'
export const connectToS1Methods = ['find']

export const connectToS1 = (app) => {
  app.use(connectToS1Path, new ConnectToS1Service(getOptions(app)), {
    methods: connectToS1Methods,
    events: []
  })
}