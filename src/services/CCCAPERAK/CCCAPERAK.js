import { CccaperakService, getOptions } from './CCCAPERAK.class.js'
import { cccaperakPath, cccaperakMethods } from './CCCAPERAK.shared.js'

export * from './CCCAPERAK.class.js'

export const cccaperak = (app) => {
  app.use(cccaperakPath, new CccaperakService(getOptions(app)), {
    methods: cccaperakMethods,
    events: []
  })
}
