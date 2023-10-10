// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import { hooks as schemaHooks } from '@feathersjs/schema'
import {
  cccsftpxmlDataValidator,
  cccsftpxmlPatchValidator,
  cccsftpxmlQueryValidator,
  cccsftpxmlResolver,
  cccsftpxmlExternalResolver,
  cccsftpxmlDataResolver,
  cccsftpxmlPatchResolver,
  cccsftpxmlQueryResolver
} from './CCCSFTPXML.schema.js'
import { CccsftpxmlService, getOptions } from './CCCSFTPXML.class.js'
import { cccsftpxmlPath, cccsftpxmlMethods } from './CCCSFTPXML.shared.js'

export * from './CCCSFTPXML.class.js'
export * from './CCCSFTPXML.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const cccsftpxml = (app) => {
  // Register our service on the Feathers application
  app.use(cccsftpxmlPath, new CccsftpxmlService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: cccsftpxmlMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(cccsftpxmlPath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(cccsftpxmlExternalResolver),
        schemaHooks.resolveResult(cccsftpxmlResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(cccsftpxmlQueryValidator),
        schemaHooks.resolveQuery(cccsftpxmlQueryResolver)
      ],
      find: [],
      get: [],
      create: [
        schemaHooks.validateData(cccsftpxmlDataValidator),
        schemaHooks.resolveData(cccsftpxmlDataResolver)
      ],
      patch: [
        schemaHooks.validateData(cccsftpxmlPatchValidator),
        schemaHooks.resolveData(cccsftpxmlPatchResolver)
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
