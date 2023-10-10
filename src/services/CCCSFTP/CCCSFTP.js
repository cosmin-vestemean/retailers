// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import { hooks as schemaHooks } from '@feathersjs/schema'
import {
  cccsftpDataValidator,
  cccsftpPatchValidator,
  cccsftpQueryValidator,
  cccsftpResolver,
  cccsftpExternalResolver,
  cccsftpDataResolver,
  cccsftpPatchResolver,
  cccsftpQueryResolver
} from './CCCSFTP.schema.js'
import { CccsftpService, getOptions } from './CCCSFTP.class.js'
import { cccsftpPath, cccsftpMethods } from './CCCSFTP.shared.js'

export * from './CCCSFTP.class.js'
export * from './CCCSFTP.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const cccsftp = (app) => {
  // Register our service on the Feathers application
  app.use(cccsftpPath, new CccsftpService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: cccsftpMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(cccsftpPath).hooks({
    around: {
      all: [schemaHooks.resolveExternal(cccsftpExternalResolver), schemaHooks.resolveResult(cccsftpResolver)]
    },
    before: {
      all: [schemaHooks.validateQuery(cccsftpQueryValidator), schemaHooks.resolveQuery(cccsftpQueryResolver)],
      find: [],
      get: [],
      create: [schemaHooks.validateData(cccsftpDataValidator), schemaHooks.resolveData(cccsftpDataResolver)],
      patch: [schemaHooks.validateData(cccsftpPatchValidator), schemaHooks.resolveData(cccsftpPatchResolver)],
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
