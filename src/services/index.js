import { cccorderslog } from './CCCORDERSLOG/CCCORDERSLOG.js'

import { cccaperak } from './CCCAPERAK/CCCAPERAK.js'

import { cccretailersclients } from './CCCRETAILERSCLIENTS/CCCRETAILERSCLIENTS.js'

import { cccxmls1Mappings } from './CCCXMLS1MAPPINGS/CCCXMLS1MAPPINGS.js'

import { cccdocumentes1Mappings } from './CCCDOCUMENTES1MAPPINGS/CCCDOCUMENTES1MAPPINGS.js'

import { cccsftpxml } from './CCCSFTPXML/CCCSFTPXML.js'

import { cccsftp } from './CCCSFTP/CCCSFTP.js'
import { ipLogger } from './ip-logger/ip-logger.service.js'
import { outboundIp } from './outbound-ip/outbound-ip.service.js'
import { s1Users } from './s1-users/s1-users.service.js'
import { s1Auth } from './s1-auth/s1-auth.service.js'
import { ordersLog } from './orders-log/orders-log.service.js'
import { ordersData } from './orders-data/orders-data.service.js'
import { invoicesData } from './invoices-data/invoices-data.service.js'
import { lookupFindoc } from './lookup-findoc/lookup-findoc.service.js'

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

  app.configure(s1Users)

  app.configure(s1Auth)

  app.configure(ordersLog)

  app.configure(ordersData)

  app.configure(invoicesData)

  app.configure(lookupFindoc)

  // All services will be registered here
}
