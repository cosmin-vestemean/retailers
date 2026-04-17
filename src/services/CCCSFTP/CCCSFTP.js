import { CccsftpService, getOptions } from './CCCSFTP.class.js'
import { cccsftpPath, cccsftpMethods } from './CCCSFTP.shared.js'

export * from './CCCSFTP.class.js'

export const cccsftp = (app) => {
  app.use(cccsftpPath, new CccsftpService(getOptions(app)), {
    methods: cccsftpMethods,
    events: []
  })
}
