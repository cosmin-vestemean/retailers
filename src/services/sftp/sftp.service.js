import { SftpService, getOptions } from './sftp.class.js'

export const sftpPath = 'sftp'
export const sftpMethods = [
  'downloadXml',
  'storeXmlInDB',
  'storeAperakInErpMessages',
  'uploadXml',
  'scanPeriodically',
  'createOrders',
  'sendStoredOrder',
  'scanNow'
]

export const sftp = (app) => {
  app.use(sftpPath, new SftpService(getOptions(app)), {
    methods: sftpMethods,
    events: ['uploadResult']
  })
}