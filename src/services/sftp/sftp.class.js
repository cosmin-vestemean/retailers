import Client from 'ssh2-sftp-client'
import * as fs from 'fs'
import { parseString } from 'xml2js'

const invoicePath = 'data/invoice'
const invoiceXmlPath = invoicePath + '/xml'
const retailersArr = [11639, 12349, 78631, 11322, 12664, 12649, 11654]

export class SftpService {
  constructor(options) {
    this.options = options
    this.app = options.app
    this.scanAndSend = this.scanAndSend.bind(this)
  }

  async downloadXml(data, params) {
    const rootPath = params.query.rootPath
    const xmlPath = rootPath + '/xml'
    const startsWith = params.query.startsWith
    try {
      const { sftp, config, sftpDataObj } = await this.prepareConnection(data, params)
      const initialDir = sftpDataObj.INITIALDIRIN
      const returnedData = []

      await sftp.connect(config)
      console.log('Connected')

      const olderThan = new Date()
      const n = 7
      olderThan.setDate(olderThan.getDate() - n)

      const files = await sftp.list(initialDir, (item) => {
        return (
          item.type === '-' &&
          item.name.endsWith('.xml') &&
          item.modifyTime > olderThan &&
          item.name.startsWith(startsWith)
        )
      })

      if (files.length === 0) {
        console.log('No files on server')
        sftp.end()
        returnedData.push({ success: true, message: 'No files on server' })
      }

      files.forEach((item) => {
        console.log('Found on server: ' + item.name)
      })

      const limit = 20000000
      let count = 0
      for (const item of files) {
        if (count < limit) {
          const filename = item.name
          const localPath = xmlPath + '/' + filename

          if (!fs.existsSync(xmlPath)) {
            fs.mkdirSync(xmlPath)
          }

          const dst = fs.createWriteStream(localPath)
          await sftp.get(initialDir + '/' + filename, dst)
          console.log(`File ${filename} downloaded successfully as ${dst.path}`)
          returnedData.push({ filename: filename, success: true })
          dst.end()

          if (filename === files[files.length - 1].name) {
            sftp.end()
          }
        }

        count++
      }

      return returnedData
    } catch (err) {
      console.error('Error:', err)
    }
  }

  async prepareConnection(data, params) {
    const retailer = params.query.retailer
    const sftpData = await this.app.service('CCCSFTP').find({ query: { TRDR_RETAILER: retailer } })
    const sftpDataObj = sftpData.data[0]
    const privateKey = sftpDataObj.PRIVATEKEY
    const privateKeyPath = 'privateKey.txt'

    return new Promise((resolve, reject) => {
      fs.writeFile(privateKeyPath, privateKey, (err) => {
        if (err) {
          reject(err)
        } else {
          const sftp = new Client()
          const config = {
            host: sftpDataObj.URL,
            port: sftpDataObj.PORT,
            username: sftpDataObj.USERNAME,
            passphrase: sftpDataObj.PASSPHRASE,
            privateKey: fs.readFileSync(privateKeyPath),
            cipher: 'aes256-cbc',
            algorithm: 'ssh-rsa',
            readyTimeout: 99999
          }
          resolve({ sftp, config, sftpDataObj })
        }
      })
    })
  }

  async storeXmlInDB(data, params) {
    let retailer = params.query.retailer
    const rootPath = params.query.rootPath
    const xmlPath = rootPath + '/xml'
    const processedPath = xmlPath + '/processed'
    const errorPath = xmlPath + '/error'
    console.log('storing xml in S1 DB for retailer', retailer)
    const folderPath = xmlPath
    const files = fs.readdirSync(folderPath)
    const returnedData = []

    for (const file of files) {
      const filename = file
      console.log('storing filename in S1 DB', filename)
      if (filename.endsWith('.xml')) {
        const localPath = folderPath + '/' + filename
        console.log('localPath', localPath)
        const xml = fs.readFileSync(localPath, 'utf8')

        let xmlClean = xml.replace(/<\?xml.*\?>/g, '')
        xmlClean = xmlClean.replace(/[\n\r\t]/g, '')

        let json = null
        parseString(xmlClean, function (err, result) {
          json = result
        })
        const json1 = await new Promise((resolve, reject) =>
          parseString(xmlClean, { explicitArray: false }, (err, result) => {
            if (err) reject(err)
            else resolve(result)
          })
        )
        const endpointID = json.Order.DeliveryParty[0].EndpointID[0]
        console.log('endpointID', endpointID)
        const trdr = endpointID
          ? await this.app
            .service('getDataset')
            .find({
              query: {
                sqlQuery:
                  "SELECT a.trdr FROM trdbranch a inner join trdr b on a.trdr=b.trdr WHERE b.sodtype=13 and a.CCCS1DXGLN = '" +
                  endpointID +
                  "'"
              }
            })
            .then((result) => {
              console.log('getDataset result', result)
              return result
            })
          : null
        console.log('trdr', trdr)
        if (trdr.data) {
          retailer = parseInt(trdr.data)
        }
        console.log('new retailer value', retailer)
        const d = {
          filename: filename,
          xml: xmlClean,
          json: JSON.stringify(json1)
        }
        console.log('data', d)
        try {
          const result = await this.app.service('storeXml').create(d, { query: { retailer: retailer } })
          console.log('storeXml result', result)
          if (result.success) {
            returnedData.push({ filename: filename, success: true, response: result })
            if (!fs.existsSync(processedPath)) {
              fs.mkdirSync(processedPath)
            }
            fs.renameSync(localPath, processedPath + '/' + filename)
          } else {
            returnedData.push({ filename: filename, success: false, response: result })
            if (!fs.existsSync(errorPath)) {
              fs.mkdirSync(errorPath)
            }
            fs.renameSync(localPath, errorPath + '/' + filename)
          }
        } catch (err) {
          console.error(err)
          returnedData.push({ filename: filename, success: false, error: err.message })
        }
      } else {
        console.log('not an xml file', filename)
      }
    }

    console.log('List of inserted files', returnedData)
    if (returnedData.length === 0) {
      returnedData.push({ success: true, message: 'No files inserted' })
    }
    return returnedData
  }

  async storeAperakInErpMessages(data, params) {
    const rootPath = params.query.rootPath
    const xmlPath = rootPath + '/xml'
    const processedPath = xmlPath + '/processed'
    const errorPath = xmlPath + '/error'
    const folderPath = xmlPath
    const files = fs.readdirSync(folderPath)
    const returnedData = []

    for (const file of files) {
      const filename = file
      if (filename.endsWith('.xml')) {
        const localPath = folderPath + '/' + filename
        console.log('localPath', localPath)
        const xml = fs.readFileSync(localPath, 'utf8')
        let xmlClean = xml.replace(/<\?xml.*\?>/g, '')
        xmlClean = xmlClean.replace(/\ufeff/g, '')
        console.log('xmlClean', xmlClean)
        const json = await new Promise((resolve, reject) =>
          parseString(xmlClean, { explicitArray: false }, (err, result) => {
            if (err) reject(err)
            else resolve(result)
          })
        )
        console.log('json', json)
        const MessageDate = json.DXMessage.MessageDate
        const MessageTime = json.DXMessage.MessageTime
        const MessageOrigin = json.DXMessage.MessageOrigin
        let DocumentReference = json.DXMessage.DocumentReference
        if (DocumentReference.includes('INVOIC_')) {
          DocumentReference = DocumentReference.split('_')[1].split('_')[0]
        }
        const DocumentUID = json.DXMessage.DocumentUID
        const SupplierReceiverCode = json.DXMessage.SupplierReceiverCode
        const DocumentResponse = json.DXMessage.DocumentResponse
        const DocumentDetail = json.DXMessage.DocumentDetail
        let possibleDocumentReference = ''
        try {
          possibleDocumentReference = DocumentDetail.split('Nume fisier: ')[1].split('.xml')[0]
          if (DocumentReference === 'Necunoscut' && possibleDocumentReference.includes('INVOIC_')) {
            DocumentReference = possibleDocumentReference.split('_')[1]
            console.log('DocumentReference', DocumentReference)
          }
        } catch (error) {
          console.error('Error in parsing DocumentReference:', error)
        }
        const response = await this.app.service('getDataset1').find({
          query: {
            sqlQuery:
              `SELECT FORMAT(a.trndate, 'dd.MM.yyyy') TRNDATE , A.FINDOC, A.FINCODE, a.SERIESNUM DocumentReference, CONCAT(B.BGBULSTAT, B.AFM) MessageOrigin, A.TRDR retailer, c.CCCXmlFile xmlFilename, c.CCCXMLSendDate xmlSentDate FROM FINDOC A INNER JOIN TRDR B ON A.TRDR = B.TRDR ` +
              ` left join mtrdoc c on c.findoc=a.findoc WHERE A.SOSOURCE = 1351 and fprms=712 and A.FINCODE LIKE '%${DocumentReference}%' order by a.TRNDATE desc`
          }
        })
        const dataToCccAperakTable = {
          TRDR_CLIENT: 1,
          MESSAGEDATE: MessageDate,
          MESSAGETIME: MessageTime,
          MESSAGEORIGIN: MessageOrigin,
          DOCUMENTREFERENCE: DocumentReference,
          DOCUMENTUID: DocumentUID,
          SUPPLIERRECEIVERCODE: SupplierReceiverCode,
          DOCUMENTRESPONSE: DocumentResponse,
          DOCUMENTDETAIL: DocumentDetail
        }
        if (response.success) {
          if (response.total === 0) {
            returnedData.push({
              filename: filename,
              success: false,
              response: response + ' No document found in ERP'
            })
            if (!fs.existsSync(errorPath)) {
              fs.mkdirSync(errorPath)
            }
          } else {
            if (response.total > 1) {
              returnedData.push({
                filename: filename,
                success: false,
                response: 'More than one document found in ERP with the same DocumentReference and MessageDate'
              })
            }
            const findoc = response.data[0].FINDOC
            const retailer = response.data[0].retailer
            const xmlFilename = response.data[0].xmlFilename || null
            const xmlSentDate = response.data[0].xmlSentDate || null

            if (findoc) dataToCccAperakTable.FINDOC = parseInt(findoc)
            if (retailer) dataToCccAperakTable.TRDR_RETAILER = parseInt(retailer)
            if (xmlFilename) dataToCccAperakTable.XMLFILENAME = xmlFilename
            if (xmlSentDate) dataToCccAperakTable.XMLSENTDATE = xmlSentDate
            console.log('data', dataToCccAperakTable)
            const result = await this.app.service('CCCAPERAK').create(dataToCccAperakTable)
            console.log('CCCAPERAK result', result)

            if (result.CCCAPERAK) {
              returnedData.push({ filename: filename, success: true, response: result })
              if (!fs.existsSync(processedPath)) {
                fs.mkdirSync(processedPath)
              }
              fs.renameSync(localPath, processedPath + '/' + filename)
            } else {
              returnedData.push({ filename: filename, success: false, response: result })
              if (!fs.existsSync(errorPath)) {
                fs.mkdirSync(errorPath)
              }
              fs.renameSync(localPath, errorPath + '/' + filename)
            }
          }
        } else {
          dataToCccAperakTable.FINDOC = -1
          dataToCccAperakTable.TRDR_RETAILER = -1
          const result = await this.app.service('CCCAPERAK').create(dataToCccAperakTable)
          console.log('CCCAPERAK result with no link to findoc', result)
          returnedData.push({
            filename: filename,
            success: false,
            response: response + ` Error in getDataset1 with params ${MessageDate}, ${DocumentReference}`
          })
          if (!fs.existsSync(errorPath)) {
            fs.mkdirSync(errorPath)
          }
          fs.renameSync(localPath, errorPath + '/' + filename)
        }
      }
    }
    return returnedData
  }

  async scanAndSend() {
    const aperakPath = 'data/aperak'
    const orderPath = 'data/order'

    console.log('scanning for orders...')
    let data = {}
    let params = { query: { retailer: 11639, rootPath: orderPath, startsWith: 'ORDERS_' } }
    const dwlRes = await this.downloadXml(data, params)
    const dwlNoFiles = dwlRes.length === 1 && dwlRes[0].message === 'No files on server'
    await this.app.service('orders-log').create({
      TRDR_CLIENT: 1,
      TRDR_RETAILER: -1,
      ORDERID: '',
      CCCSFTPXML: -1,
      OPERATION: 'downloadXml',
      LEVEL: dwlNoFiles ? 'info' : 'success',
      MESSAGETEXT: dwlNoFiles ? 'No files on server' : JSON.stringify(dwlRes)
    })
    data = {}
    params = { query: { retailer: 11639, rootPath: orderPath } }
    const storeRes = await this.storeXmlInDB(data, params)
    const storeNoFiles = storeRes.length === 1 && storeRes[0].message === 'No files inserted'
    if (!(dwlNoFiles && storeNoFiles)) {
      await this.app.service('orders-log').create({
        TRDR_CLIENT: 1,
        TRDR_RETAILER: -1,
        ORDERID: '',
        CCCSFTPXML: -1,
        OPERATION: 'storeXmlInDB',
        LEVEL: storeNoFiles ? 'info' : 'success',
        MESSAGETEXT: storeNoFiles ? 'No files to store' : JSON.stringify(storeRes)
      })
    }
    console.log('Creating orders...')
    await this.createOrders({}, {})
    console.log('scanning for aperak...')
    data = {}
    params = { query: { retailer: 11639, rootPath: aperakPath, startsWith: 'APERAK_' } }
    await this.downloadXml(data, params)
    data = {}
    params = { query: { rootPath: aperakPath } }
    await this.storeAperakInErpMessages(data, params)

    try {
      const cleanup = await this.app.service('orders-log').remove(null, { query: { days: 30 } })
      if (cleanup.deleted > 0) {
        console.log(`Cleaned up ${cleanup.deleted} log entries older than 30 days`)
      }
    } catch (e) {
      console.error('Log cleanup failed:', e.message)
    }
  }

  async sendStoredOrder(data, params) {
    const retailer = parseInt(data.trdr ?? params?.query?.trdr, 10)
    const cccsftpxml = parseInt(data.CCCSFTPXML, 10)
    const xml = data.xmlData
    const xmlFilename = data.filename
    const orderId = data.orderId
    const sosource = 1351
    const fprms = 701
    const series = 7012

    if (!Number.isInteger(retailer)) {
      return { success: false, message: 'Missing retailer' }
    }
    if (!xml) {
      return { success: false, message: 'Missing XML data' }
    }
    if (!xmlFilename) {
      return { success: false, message: 'Missing XML filename' }
    }

    const resOrder = await this.createOrderJSON(
      xml,
      sosource,
      fprms,
      series,
      retailer,
      orderId,
      cccsftpxml
    )

    if (!resOrder.success) {
      return {
        success: false,
        errors: resOrder.errors,
        message: resOrder.message || 'Failed to create order payload'
      }
    }

    const response = await this.sendOrderToServer(
      resOrder.jsonOrder,
      xmlFilename,
      retailer,
      orderId,
      cccsftpxml
    )

    return response
  }

  async scanNow(data, params) {
    await this.scanAndSend()
  }

  async scanPeriodically(data, params) {
    const min = 30
    const period = min * 60 * 1000
    setInterval(this.scanAndSend, period)
  }

  async createOrders(data, params) {
    const strRetailers = retailersArr.join(',')
    const daysOld = 30
    const top = ''
    const res = await this.app.service('getDataset1').find({
      query: {
        sqlQuery: `WITH cte1 AS (SELECT (SELECT a.xmldata.query('/Order/ID') ) AS OrderIdTag ,* FROM CCCSFTPXML a WHERE a.findoc IS NULL AND a.trdr_retailer IN (${strRetailers}) AND a.xmldate > DATEADD(day, -${daysOld}, GETDATE()) ) SELECT ${top} findoc1, OrderId, TRDR_RETAILER, (select name from trdr where trdr=TRDR_RETAILER) Client, XMLFILENAME, XMLDATA, FORMAT(XMLDATE, 'yyyy-MM-dd HH:mm:ss') AS XMLDATE, CCCSFTPXML FROM ( SELECT f.findoc findoc1, x.* FROM ( SELECT replace(replace(cast(OrderIdTag AS VARCHAR(max)), '<ID>', ''), '</ID>', '') OrderId ,* FROM cte1 ) x LEFT JOIN findoc f ON ( f.num04 = x.OrderId AND f.TRDR = x.TRDR_RETAILER AND f.iscancel = 0 AND f.sosource = 1351 AND f.fprms = 701 ) ) y WHERE findoc1 IS NULL ORDER BY trdr_retailer ,xmldate ASC`
      }
    })

    if (res.success) {
      if (res.total > 0) {
        const nowIts = new Date().toLocaleString()
        console.log(`Found ${res.total} orders to create, ${nowIts}`)
        let count = 0
        for (const item of res.data) {
          count++
          console.log(
            `Processing order ${item.OrderId} ${item.XMLDATE} from ${item.Client}, ${count}/${res.total}`
          )
          try {
            this.app.service('orders-log').create({
              TRDR_CLIENT: 1,
              TRDR_RETAILER: item.TRDR_RETAILER,
              ORDERID: item.OrderId,
              CCCSFTPXML: item.CCCSFTPXML,
              OPERATION: 'processOrder',
              LEVEL: 'info',
              MESSAGETEXT: `Processing order ${item.OrderId} ${item.XMLDATE} from ${item.Client}, ${count}/${res.total}`
            })
          } catch (error) {
            console.error('Error inserting into orders-log:', error)
          }
          const xml = item.XMLDATA
          const sosource = 1351
          const fprms = 701
          const series = 7012
          const retailer = item.TRDR_RETAILER
          const resOrder = await this.createOrderJSON(
            xml,
            sosource,
            fprms,
            series,
            retailer,
            item.OrderId,
            item.CCCSFTPXML
          )
          if (resOrder.success) {
            const jsonOrder = resOrder.jsonOrder
            const resCreateOrder = await this.sendOrderToServer(
              jsonOrder,
              item.XMLFILENAME,
              retailer,
              item.OrderId,
              item.CCCSFTPXML
            )
            if (resCreateOrder.success) {
              console.log('Order created successfully')
            } else {
              console.error('Error creating order:', resCreateOrder.message)
            }
          } else {
            console.error('Error creating order JSON:', resOrder.errors)
          }
        }
      } else {
        console.log('No orders to create')
        await this.app.service('orders-log').create({
          TRDR_CLIENT: 1,
          TRDR_RETAILER: -1,
          ORDERID: '',
          CCCSFTPXML: -1,
          OPERATION: 'createOrders',
          LEVEL: 'info',
          MESSAGETEXT: 'No orders to create'
        })
      }
    } else {
      console.error('Error fetching data:', {
        success: res.success,
        errorcode: res.errorcode,
        message: res.message
      })
      await this.app.service('orders-log').create({
        TRDR_CLIENT: 1,
        TRDR_RETAILER: -1,
        ORDERID: '',
        CCCSFTPXML: -1,
        OPERATION: 'system',
        LEVEL: 'error',
        MESSAGETEXT: 'Error fetching orders data: ' + JSON.stringify({ errorcode: res.errorcode, message: res.message })
      })
    }
  }

  async sendOrderToServer(jsonOrder, xmlFilename, retailer, OrderId, CCCSFTPXML) {
    try {
      const resClient = await this.app.service('CCCRETAILERSCLIENTS').find({
        query: { TRDR_CLIENT: 1 }
      })
      const url = resClient.data[0].WSURL
      const username = resClient.data[0].WSUSER
      const password = resClient.data[0].WSPASS

      const resConnect = await this.app.service('connectToS1').find({
        query: { url: url, username: username, password: password }
      })

      jsonOrder.clientID = resConnect.token
      console.log('jsonOrder', jsonOrder)

      const setDocumentRes = await this.app.service('setDocument').create(jsonOrder)
      console.log('setDocument', setDocumentRes)

      if (setDocumentRes.success == true) {
        console.log(
          'Document created successfully:',
          setDocumentRes.id,
          'retailer:',
          retailer,
          'xmlFilename:',
          xmlFilename,
          'OrderId:',
          OrderId
        )

        try {
          await this.app.service('orders-log').create({
            TRDR_CLIENT: 1,
            TRDR_RETAILER: retailer,
            ORDERID: OrderId,
            CCCSFTPXML: CCCSFTPXML,
            OPERATION: 'createDocument',
            LEVEL: 'success',
            MESSAGETEXT: `Document created successfully: ${setDocumentRes.id} from ${xmlFilename}`
          })
        } catch (error) {
          console.error('Error inserting into orders-log:', error)
        }

        const patchRes = await this.app
          .service('CCCSFTPXML')
          .patch(
            null,
            { FINDOC: parseInt(setDocumentRes.id) },
            { query: { XMLFILENAME: xmlFilename, TRDR_RETAILER: retailer } }
          )
        console.log('CCCSFTPXML patch', patchRes)

        const response = {
          success: true,
          id: parseInt(setDocumentRes.id),
          message: 'Marked as sent: ' + patchRes[0].CCCSFTPXML + ' ' + patchRes[0].FINDOC
        }
        console.log('CCCSFTPXML', response)
        return response
      } else {
        console.error('Error:', setDocumentRes.errors)
        return { success: false, errors: setDocumentRes.errors }
      }
    } catch (error) {
      console.error('Error:', error)
      return { success: false, errors: [error.message] }
    }
  }

  async createOrderJSON(xml, sosource, fprms, series, retailer, OrderId, CCCSFTPXML) {
    const resClient = await this.app.service('CCCRETAILERSCLIENTS').find({
      query: { TRDR_CLIENT: 1 }
    })
    const url = resClient.data[0].WSURL
    const username = resClient.data[0].WSUSER
    const password = resClient.data[0].WSPASS

    const resConnect = await this.app.service('connectToS1').find({
      query: { url: url, username: username, password: password }
    })
    const token = resConnect.token

    const resDocMappings = await this.app.service('CCCDOCUMENTES1MAPPINGS').find({
      query: {
        SOSOURCE: sosource,
        FPRMS: fprms,
        SERIES: series,
        TRDR_RETAILER: retailer
      }
    })
    const CCCDOCUMENTES1MAPPINGS = resDocMappings.data[0].CCCDOCUMENTES1MAPPINGS

    const resXmlMappings = await this.app.service('CCCXMLS1MAPPINGS').find({
      query: { CCCDOCUMENTES1MAPPINGS: CCCDOCUMENTES1MAPPINGS }
    })
    const CCCXMLS1MAPPINGS = resXmlMappings.data

    const jsonOrder = {
      service: 'setData',
      clientID: token,
      appId: 1001,
      OBJECT: 'SALDOC',
      FORM: 'EFIntegrareRetailers'
    }

    const distinctS1TABLE1 = []
    CCCXMLS1MAPPINGS.forEach((item) => {
      if (!distinctS1TABLE1.includes(item.S1TABLE1)) {
        distinctS1TABLE1.push(item.S1TABLE1)
      }
    })

    const DATA = {}
    distinctS1TABLE1.forEach((item) => {
      DATA[item] = []
    })

    const xmlJson = await new Promise((resolve, reject) =>
      parseString(xml, { explicitArray: false }, (err, result) => {
        if (err) reject(err)
        else resolve(result)
      })
    )

    for (const item of CCCXMLS1MAPPINGS) {
      const xmlVals = this.getValFromXML(xmlJson, item.XMLNODE)
      for (const xmlVal of xmlVals) {
        let val = 0
        if (item.SQL) {
          val = { SQL: item.SQL, value: xmlVal }
        } else {
          val = xmlVal
        }
        const obj = {}
        obj[item.S1FIELD1] = val
        DATA[item.S1TABLE1].push(obj)
      }
    }

    jsonOrder.DATA = DATA

    const errors = []
    for (const key in jsonOrder.DATA) {
      const dataArray = jsonOrder.DATA[key]
      for (const item of dataArray) {
        for (const field in item) {
          if (typeof item[field] === 'object' && item[field].SQL) {
            const sqlQuery = item[field].SQL.replace('{value}', item[field].value)
            try {
              const resSQL = await this.app.service('getDataset').find({ query: { sqlQuery: sqlQuery } })
              if (resSQL.data) {
                item[field] = resSQL.data
              } else {
                if (key === 'ITELINES') {
                  const BuyersItemIdentifications = this.getValFromXML(
                    xmlJson,
                    'OrderLine/Item/BuyersItemIdentification'
                  )
                  const index = BuyersItemIdentifications.indexOf(item[field].value)
                  const BuyersItemIdentification = BuyersItemIdentifications[index]
                  const Description = this.getValFromXML(xmlJson, 'OrderLine/Item/Description')[index]
                  const message = `Error fetching data for BuyersItemIdentification ${BuyersItemIdentification} with Description ${Description} for field ${field} — SQL: ${sqlQuery}`
                  errors.push({
                    message: message,
                    sqlQuery: sqlQuery,
                    field: field,
                    value: item[field].value
                  })
                  try {
                    await this.app.service('orders-log').create({
                      TRDR_CLIENT: 1,
                      TRDR_RETAILER: retailer,
                      ORDERID: OrderId,
                      CCCSFTPXML: CCCSFTPXML,
                      OPERATION: 'mappingError',
                      LEVEL: 'error',
                      MESSAGETEXT: message
                    })
                  } catch (error) {
                    console.error('Error inserting into orders-log:', error)
                  }
                } else {
                  errors.push({
                    message: 'Error fetching data for field ' + field + ' with value ' + item[field].value,
                    sqlQuery: sqlQuery,
                    field: field,
                    value: item[field].value
                  })
                  try {
                    await this.app.service('orders-log').create({
                      TRDR_CLIENT: 1,
                      TRDR_RETAILER: retailer,
                      ORDERID: OrderId,
                      CCCSFTPXML: CCCSFTPXML,
                      OPERATION: 'mappingError',
                      LEVEL: 'error',
                      MESSAGETEXT: `Error fetching data for field ${field} with value ${item[field].value} — SQL: ${sqlQuery}`
                    })
                  } catch (error) {
                    console.error('Error inserting into orders-log:', error)
                  }
                }
              }
            } catch (error) {
              errors.push(error.message)
            }
          }
        }
      }
    }

    if (errors.length > 0) {
      const resTrdr = await this.app.service('getDataset').find({
        query: { sqlQuery: `SELECT NAME FROM TRDR WHERE TRDR = ${retailer}` }
      })
      const retailerName = resTrdr.data || retailer
      const to = 'comenzi@petfactory.ro'
      const cc = 'sorin.fliundra@petfactory.ro'
      const message = errors.map((item) => item.message).join('<br>')
      const subject = 'Erori procesare xml comanda EDI ' + OrderId + ' pentru ' + retailerName
      const bodyPlain = 'Urmatoarele erori au fost intalnite la crearea comenzii:\n\n' + message + '\n'
      const bodyHTML = 'Urmatoarele erori au fost intalnite la crearea comenzii:<br><br>' + message + '<br>'
      const fromName = 'Comenzi EDI - PetFactory'
      const sendEmRes = await this.app.service('sendEmail').create({ to, cc, subject, bodyPlain, bodyHTML, fromName })
      this.app.service('orders-log').create({
        TRDR_CLIENT: 1,
        TRDR_RETAILER: retailer,
        ORDERID: OrderId,
        CCCSFTPXML: CCCSFTPXML,
        OPERATION: 'emailNotify',
        LEVEL: 'warn',
        MESSAGETEXT: (sendEmRes === 'True' ? 'Errors sent by email' : 'Errors NOT sent by email') + ' — ' + errors.length + ' errors'
      })
      const retMessage = sendEmRes === 'True' ? 'Errors sent by email' : 'Errors not sent by email'
      return { success: false, errors: errors, message: retMessage }
    }

    let itelines = jsonOrder.DATA.ITELINES
    const fieldNames = []
    itelines.forEach((item) => {
      for (const key in item) {
        if (!fieldNames.includes(key)) {
          fieldNames.push(key)
        }
      }
    })

    const arrays = {}
    fieldNames.forEach((item) => {
      arrays[item] = []
    })

    itelines.forEach((item) => {
      for (const key in item) {
        arrays[key].push(item[key])
      }
    })

    itelines = []
    for (let i = 0; i < arrays[fieldNames[0]].length; i++) {
      const obj = {}
      for (let j = 0; j < fieldNames.length; j++) {
        obj[fieldNames[j]] = arrays[fieldNames[j]][i]
      }
      itelines.push(obj)
    }
    jsonOrder.DATA.ITELINES = itelines

    jsonOrder.DATA.SALDOC[0].SERIES = series
    jsonOrder.DATA.SALDOC[0].TRDR = parseInt(retailer)

    return { success: true, jsonOrder: jsonOrder }
  }

  getValFromXML(jsonObj, xmlNode) {
    xmlNode = '/Order/' + xmlNode
    const nodes = xmlNode.split('/').filter(Boolean)
    const results = []

    function traverse(currentObj, nodeIndex) {
      if (nodeIndex >= nodes.length) {
        if (Array.isArray(currentObj)) {
          results.push(...currentObj)
        } else {
          results.push(currentObj)
        }
        return
      }
      const currentNode = nodes[nodeIndex]
      if (Array.isArray(currentObj)) {
        currentObj.forEach((item) => {
          if (item && Object.prototype.hasOwnProperty.call(item, currentNode)) {
            traverse(item[currentNode], nodeIndex + 1)
          }
        })
      } else if (currentObj && Object.prototype.hasOwnProperty.call(currentObj, currentNode)) {
        traverse(currentObj[currentNode], nodeIndex + 1)
      }
    }

    traverse(jsonObj, 0)
    return results
  }

  async uploadXml(data, params) {
    const { sftp, config, sftpDataObj } = await this.prepareConnection(data, params)
    const initialDir = sftpDataObj.INITIALDIROUT
    const filename = data.filename
    const xml = data.xml
    const findoc = data.findoc
    const localPath = invoiceXmlPath + filename
    if (!fs.existsSync(invoiceXmlPath)) {
      fs.mkdirSync(invoiceXmlPath)
    }
    fs.writeFileSync(localPath, xml)
    let response = null
    await sftp
      .connect(config)
      .then(() => {
        console.log('connected')
        return sftp.put(localPath, initialDir + '/' + filename)
      })
      .then((data) => {
        console.log(`File ${filename} uploaded successfully!`, data)
        response = { findoc: findoc, filename: filename, success: true }
        console.log('response', response)
      })
      .catch((err) => {
        console.error(err)
        response = { findoc: findoc, filename: filename, success: false }
      })
      .finally(() => {
        sftp.end()
      })

    this.emit('uploadResult', response)
    return response
  }
}

export const getOptions = (app) => ({ app })