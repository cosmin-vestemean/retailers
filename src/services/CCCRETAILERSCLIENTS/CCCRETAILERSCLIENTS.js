import { CccretailersclientsService, getOptions } from './CCCRETAILERSCLIENTS.class.js'
import { cccretailersclientsPath, cccretailersclientsMethods } from './CCCRETAILERSCLIENTS.shared.js'

export * from './CCCRETAILERSCLIENTS.class.js'

export const cccretailersclients = (app) => {
  app.use(cccretailersclientsPath, new CccretailersclientsService(getOptions(app)), {
    methods: cccretailersclientsMethods,
    events: []
  })
}
