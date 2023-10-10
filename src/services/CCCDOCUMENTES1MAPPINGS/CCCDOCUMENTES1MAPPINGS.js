// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import { hooks as schemaHooks } from '@feathersjs/schema'
import {
  cccdocumentes1MappingsDataValidator,
  cccdocumentes1MappingsPatchValidator,
  cccdocumentes1MappingsQueryValidator,
  cccdocumentes1MappingsResolver,
  cccdocumentes1MappingsExternalResolver,
  cccdocumentes1MappingsDataResolver,
  cccdocumentes1MappingsPatchResolver,
  cccdocumentes1MappingsQueryResolver
} from './CCCDOCUMENTES1MAPPINGS.schema.js'
import { Cccdocumentes1MappingsService, getOptions } from './CCCDOCUMENTES1MAPPINGS.class.js'
import { cccdocumentes1MappingsPath, cccdocumentes1MappingsMethods } from './CCCDOCUMENTES1MAPPINGS.shared.js'

export * from './CCCDOCUMENTES1MAPPINGS.class.js'
export * from './CCCDOCUMENTES1MAPPINGS.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const cccdocumentes1Mappings = (app) => {
  // Register our service on the Feathers application
  app.use(cccdocumentes1MappingsPath, new Cccdocumentes1MappingsService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: cccdocumentes1MappingsMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(cccdocumentes1MappingsPath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(cccdocumentes1MappingsExternalResolver),
        schemaHooks.resolveResult(cccdocumentes1MappingsResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(cccdocumentes1MappingsQueryValidator),
        schemaHooks.resolveQuery(cccdocumentes1MappingsQueryResolver)
      ],
      find: [],
      get: [],
      create: [
        schemaHooks.validateData(cccdocumentes1MappingsDataValidator),
        schemaHooks.resolveData(cccdocumentes1MappingsDataResolver)
      ],
      patch: [
        schemaHooks.validateData(cccdocumentes1MappingsPatchValidator),
        schemaHooks.resolveData(cccdocumentes1MappingsPatchResolver)
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
