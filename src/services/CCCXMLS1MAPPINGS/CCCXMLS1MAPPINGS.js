// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import { hooks as schemaHooks } from '@feathersjs/schema'
import {
  cccxmls1MappingsDataValidator,
  cccxmls1MappingsPatchValidator,
  cccxmls1MappingsQueryValidator,
  cccxmls1MappingsResolver,
  cccxmls1MappingsExternalResolver,
  cccxmls1MappingsDataResolver,
  cccxmls1MappingsPatchResolver,
  cccxmls1MappingsQueryResolver
} from './CCCXMLS1MAPPINGS.schema.js'
import { Cccxmls1MappingsService, getOptions } from './CCCXMLS1MAPPINGS.class.js'
import { cccxmls1MappingsPath, cccxmls1MappingsMethods } from './CCCXMLS1MAPPINGS.shared.js'

export * from './CCCXMLS1MAPPINGS.class.js'
export * from './CCCXMLS1MAPPINGS.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const cccxmls1Mappings = (app) => {
  // Register our service on the Feathers application
  app.use(cccxmls1MappingsPath, new Cccxmls1MappingsService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: cccxmls1MappingsMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(cccxmls1MappingsPath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(cccxmls1MappingsExternalResolver),
        schemaHooks.resolveResult(cccxmls1MappingsResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(cccxmls1MappingsQueryValidator),
        schemaHooks.resolveQuery(cccxmls1MappingsQueryResolver)
      ],
      find: [],
      get: [],
      create: [
        schemaHooks.validateData(cccxmls1MappingsDataValidator),
        schemaHooks.resolveData(cccxmls1MappingsDataResolver)
      ],
      patch: [
        schemaHooks.validateData(cccxmls1MappingsPatchValidator),
        schemaHooks.resolveData(cccxmls1MappingsPatchResolver)
      ],
      remove: []
    },
    after: {
      all: []
    },
    error: {
      all: []
    }
  })
}
