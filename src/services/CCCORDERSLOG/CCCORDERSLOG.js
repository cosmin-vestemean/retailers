// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import { hooks as schemaHooks } from '@feathersjs/schema'
import {
  cccorderslogDataValidator,
  cccorderslogPatchValidator,
  cccorderslogQueryValidator,
  cccorderslogResolver,
  cccorderslogExternalResolver,
  cccorderslogDataResolver,
  cccorderslogPatchResolver,
  cccorderslogQueryResolver
} from './CCCORDERSLOG.schema.js'
import { CccorderslogService, getOptions } from './CCCORDERSLOG.class.js'
import { cccorderslogPath, cccorderslogMethods } from './CCCORDERSLOG.shared.js'

export * from './CCCORDERSLOG.class.js'
export * from './CCCORDERSLOG.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const cccorderslog = (app) => {
  // Register our service on the Feathers application
  app.use(cccorderslogPath, new CccorderslogService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: cccorderslogMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(cccorderslogPath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(cccorderslogExternalResolver),
        schemaHooks.resolveResult(cccorderslogResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(cccorderslogQueryValidator),
        schemaHooks.resolveQuery(cccorderslogQueryResolver)
      ],
      find: [],
      get: [],
      create: [
        schemaHooks.validateData(cccorderslogDataValidator),
        schemaHooks.resolveData(cccorderslogDataResolver)
      ],
      patch: [
        schemaHooks.validateData(cccorderslogPatchValidator),
        schemaHooks.resolveData(cccorderslogPatchResolver)
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
