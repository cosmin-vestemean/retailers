// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { hooks as schemaHooks } from '@feathersjs/schema'
import {
  ipLoggerDataValidator,
  ipLoggerPatchValidator,
  ipLoggerQueryValidator,
  ipLoggerResolver,
  ipLoggerExternalResolver,
  ipLoggerDataResolver,
  ipLoggerPatchResolver,
  ipLoggerQueryResolver
} from './ip-logger.schema.js'
import { IpLoggerService, getOptions } from './ip-logger.class.js'

export const ipLoggerPath = 'ip-logger'
export const ipLoggerMethods = ['find']

export * from './ip-logger.class.js'
export * from './ip-logger.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const ipLogger = (app) => {
  // Register our service on the Feathers application
  app.use(ipLoggerPath, new IpLoggerService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: ipLoggerMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(ipLoggerPath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(ipLoggerExternalResolver),
        schemaHooks.resolveResult(ipLoggerResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(ipLoggerQueryValidator),
        schemaHooks.resolveQuery(ipLoggerQueryResolver)
      ],
      find: [],
      get: [],
      create: [
        schemaHooks.validateData(ipLoggerDataValidator),
        schemaHooks.resolveData(ipLoggerDataResolver)
      ],
      patch: [
        schemaHooks.validateData(ipLoggerPatchValidator),
        schemaHooks.resolveData(ipLoggerPatchResolver)
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
