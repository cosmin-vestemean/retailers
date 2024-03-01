import { cccretailersclients } from './CCCRETAILERSCLIENTS/CCCRETAILERSCLIENTS.js'

import { cccxmls1Mappings } from './CCCXMLS1MAPPINGS/CCCXMLS1MAPPINGS.js'

import { cccdocumentes1Mappings } from './CCCDOCUMENTES1MAPPINGS/CCCDOCUMENTES1MAPPINGS.js'

import { cccsftpxml } from './CCCSFTPXML/CCCSFTPXML.js'

import { cccsftp } from './CCCSFTP/CCCSFTP.js'

export const services = (app) => {

  app.configure(cccretailersclients)

  app.configure(cccxmls1Mappings)

  app.configure(cccdocumentes1Mappings)

  app.configure(cccsftpxml)

  app.configure(cccsftp)

  // All services will be registered here
}
