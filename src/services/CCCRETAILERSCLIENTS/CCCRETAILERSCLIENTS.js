// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import { hooks as schemaHooks } from '@feathersjs/schema'
import {
  cccretailersclientsDataValidator,
  cccretailersclientsPatchValidator,
  cccretailersclientsQueryValidator,
  cccretailersclientsResolver,
  cccretailersclientsExternalResolver,
  cccretailersclientsDataResolver,
  cccretailersclientsPatchResolver,
  cccretailersclientsQueryResolver
} from './CCCRETAILERSCLIENTS.schema.js'
import { CccretailersclientsService, getOptions } from './CCCRETAILERSCLIENTS.class.js'
import { cccretailersclientsPath, cccretailersclientsMethods } from './CCCRETAILERSCLIENTS.shared.js'

export * from './CCCRETAILERSCLIENTS.class.js'
export * from './CCCRETAILERSCLIENTS.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const cccretailersclients = (app) => {
  // Register our service on the Feathers application
  app.use(cccretailersclientsPath, new CccretailersclientsService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: cccretailersclientsMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(cccretailersclientsPath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(cccretailersclientsExternalResolver),
        schemaHooks.resolveResult(cccretailersclientsResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(cccretailersclientsQueryValidator),
        schemaHooks.resolveQuery(cccretailersclientsQueryResolver)
      ],
      find: [],
      get: [],
      create: [
        schemaHooks.validateData(cccretailersclientsDataValidator),
        schemaHooks.resolveData(cccretailersclientsDataResolver)
      ],
      patch: [
        schemaHooks.validateData(cccretailersclientsPatchValidator),
        schemaHooks.resolveData(cccretailersclientsPatchResolver)
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
