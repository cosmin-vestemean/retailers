import { cccorderslog } from './CCCORDERSLOG/CCCORDERSLOG.js'

import { cccaperak } from './CCCAPERAK/CCCAPERAK.js'

import { cccretailersclients } from './CCCRETAILERSCLIENTS/CCCRETAILERSCLIENTS.js'

import { cccxmls1Mappings } from './CCCXMLS1MAPPINGS/CCCXMLS1MAPPINGS.js'

import { cccdocumentes1Mappings } from './CCCDOCUMENTES1MAPPINGS/CCCDOCUMENTES1MAPPINGS.js'

import { cccsftpxml } from './CCCSFTPXML/CCCSFTPXML.js'

import { cccsftp } from './CCCSFTP/CCCSFTP.js'
import { ipLogger } from './ip-logger/ip-logger.service.js'
import { outboundIp } from './outbound-ip/outbound-ip.service.js'

export const services = (app) => {
  app.configure(cccorderslog)

  app.configure(cccaperak)

  app.configure(cccretailersclients)

  app.configure(cccxmls1Mappings)

  app.configure(cccdocumentes1Mappings)

  app.configure(cccsftpxml)

  app.configure(cccsftp)

  app.configure(ipLogger)

  app.configure(outboundIp)

  // All services will be registered here
}
