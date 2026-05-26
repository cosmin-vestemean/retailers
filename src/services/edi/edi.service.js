import { EdiService, getOptions } from './edi.class.js'

export const ediPath = 'edi'
export const ediMethods = ['scanNow', 'scanPeriodically', 'stop']

export const edi = (app) => {
  app.use(ediPath, new EdiService(getOptions(app)), {
    methods: ediMethods,
    events: []
  })
}
