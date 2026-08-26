import { RecadvService, getOptions } from './recadv.class.js'

export const recadvPath = 'recadv'
export const recadvMethods = ['find', 'create']

export const recadv = (app) => {
  app.use(recadvPath, new RecadvService(getOptions(app)), {
    methods: recadvMethods,
    events: []
  })
}
