import { Cccxmls1MappingsService, getOptions } from './CCCXMLS1MAPPINGS.class.js'
import { cccxmls1MappingsPath, cccxmls1MappingsMethods } from './CCCXMLS1MAPPINGS.shared.js'

export * from './CCCXMLS1MAPPINGS.class.js'

export const cccxmls1Mappings = (app) => {
  app.use(cccxmls1MappingsPath, new Cccxmls1MappingsService(getOptions(app)), {
    methods: cccxmls1MappingsMethods,
    events: []
  })
}
