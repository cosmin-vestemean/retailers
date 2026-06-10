import { EdiAperaksService, getOptions } from './edi-aperaks.class.js'

export const ediAperaksPath = 'edi-aperaks'
export const ediAperaksMethods = ['create']

export const ediAperaks = (app) => {
  app.use(ediAperaksPath, new EdiAperaksService(getOptions(app)), {
    methods: ediAperaksMethods,
    events: []
  })
}