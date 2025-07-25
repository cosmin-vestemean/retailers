// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { hooks as schemaHooks } from '@feathersjs/schema'
import {
  outboundIpDataValidator,
  outboundIpPatchValidator,
  outboundIpQueryValidator,
  outboundIpResolver,
  outboundIpExternalResolver,
  outboundIpDataResolver,
  outboundIpPatchResolver,
  outboundIpQueryResolver
} from './outbound-ip.schema.js'
import { OutboundIpService, getOptions } from './outbound-ip.class.js'

export const outboundIpPath = 'outbound-ip'
export const outboundIpMethods = ['find']

export * from './outbound-ip.class.js'
export * from './outbound-ip.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const outboundIp = (app) => {
  // Register our service on the Feathers application
  app.use(outboundIpPath, new OutboundIpService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: outboundIpMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(outboundIpPath).hooks({
    around: {
      all: [
        schemaHooks.resolveExternal(outboundIpExternalResolver),
        schemaHooks.resolveResult(outboundIpResolver)
      ]
    },
    before: {
      all: [
        schemaHooks.validateQuery(outboundIpQueryValidator),
        schemaHooks.resolveQuery(outboundIpQueryResolver)
      ],
      find: [],
    },
    after: {
      all: []
    },
    error: {
      all: []
    }
  })
}
