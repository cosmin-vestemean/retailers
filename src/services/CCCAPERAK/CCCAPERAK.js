// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import { hooks as schemaHooks } from '@feathersjs/schema'
import {
  cccaperakDataValidator,
  cccaperakPatchValidator,
  cccaperakQueryValidator,
  cccaperakResolver,
  cccaperakExternalResolver,
  cccaperakDataResolver,
  cccaperakPatchResolver,
  cccaperakQueryResolver
} from './CCCAPERAK.schema.js'
import { CccaperakService, getOptions } from './CCCAPERAK.class.js'
import { cccaperakPath, cccaperakMethods } from './CCCAPERAK.shared.js'

export * from './CCCAPERAK.class.js'
export * from './CCCAPERAK.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const cccaperak = (app) => {
  // Register our service on the Feathers application
  app.use(cccaperakPath, new CccaperakService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: cccaperakMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(cccaperakPath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(cccaperakExternalResolver),
        schemaHooks.resolveResult(cccaperakResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(cccaperakQueryValidator),
        schemaHooks.resolveQuery(cccaperakQueryResolver)
      ],
      find: [],
      get: [],
      create: [
        schemaHooks.validateData(cccaperakDataValidator),
        schemaHooks.resolveData(cccaperakDataResolver)
      ],
      patch: [
        schemaHooks.validateData(cccaperakPatchValidator),
        schemaHooks.resolveData(cccaperakPatchResolver)
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
