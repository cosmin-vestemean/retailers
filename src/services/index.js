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
import { sftp } from './sftp/sftp.service.js'
import { storeXml } from './store-xml/store-xml.service.js'
import { connectToS1 } from './connect-to-s1/connect-to-s1.service.js'
import { setDocument } from './set-document/set-document.service.js'
import { getDataset } from './get-dataset/get-dataset.service.js'
import { getDataset1 } from './get-dataset1/get-dataset1.service.js'
import { sendEmail } from './send-email/send-email.service.js'
import { getS1ObjData } from './get-s1-obj-data/get-s1-obj-data.service.js'
import { getS1SqlData } from './get-s1-sql-data/get-s1-sql-data.service.js'
import { getInvoiceDom } from './get-invoice-dom/get-invoice-dom.service.js'
import { retailer } from './retailer/retailer.service.js'
import { retailerStats } from './retailer-stats/retailer-stats.service.js'

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

  app.configure(sftp)

  app.configure(storeXml)

  app.configure(connectToS1)

  app.configure(setDocument)

  app.configure(getDataset)

  app.configure(getDataset1)

  app.configure(sendEmail)

  app.configure(getS1ObjData)

  app.configure(getS1SqlData)

  app.configure(getInvoiceDom)

  app.configure(retailer)

  app.configure(retailerStats)

  // All services will be registered here
}
