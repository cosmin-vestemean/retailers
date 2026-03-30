import { LookupFindocService, getOptions } from './lookup-findoc.class.js'

export const lookupFindocPath = 'lookup-findoc'
export const lookupFindocMethods = ['create']

export const lookupFindoc = (app) => {
  app.use(lookupFindocPath, new LookupFindocService(getOptions(app)), {
    methods: lookupFindocMethods,
    events: []
  })
}
