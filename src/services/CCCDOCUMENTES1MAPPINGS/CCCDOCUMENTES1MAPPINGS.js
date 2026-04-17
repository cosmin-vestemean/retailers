import { Cccdocumentes1MappingsService, getOptions } from './CCCDOCUMENTES1MAPPINGS.class.js'
import { cccdocumentes1MappingsPath, cccdocumentes1MappingsMethods } from './CCCDOCUMENTES1MAPPINGS.shared.js'

export * from './CCCDOCUMENTES1MAPPINGS.class.js'

export const cccdocumentes1Mappings = (app) => {
  app.use(cccdocumentes1MappingsPath, new Cccdocumentes1MappingsService(getOptions(app)), {
    methods: cccdocumentes1MappingsMethods,
    events: []
  })
}
