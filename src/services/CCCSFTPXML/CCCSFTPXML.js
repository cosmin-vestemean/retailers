import { CccsftpxmlService, getOptions } from './CCCSFTPXML.class.js'
import { cccsftpxmlPath, cccsftpxmlMethods } from './CCCSFTPXML.shared.js'

export * from './CCCSFTPXML.class.js'

export const cccsftpxml = (app) => {
  app.use(cccsftpxmlPath, new CccsftpxmlService(getOptions(app)), {
    methods: cccsftpxmlMethods,
    events: []
  })
}
