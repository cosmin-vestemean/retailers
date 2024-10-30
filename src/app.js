// For more information about this file see https://dove.feathersjs.com/guides/cli/application.html
import { feathers } from '@feathersjs/feathers'
import configuration from '@feathersjs/configuration'
import { koa, rest, bodyParser, errorHandler, parseAuthentication, cors, serveStatic } from '@feathersjs/koa'
import socketio from '@feathersjs/socketio'

import { configurationValidator } from './configuration.js'
import { logError } from './hooks/log-error.js'
import { mssql } from './mssql.js'

import { services } from './services/index.js'
import { channels } from './channels.js'

//ssh2-sftp-client
import Client from 'ssh2-sftp-client'

//fs
import * as fs from 'fs'

import fetch from 'node-fetch'

//xml2js
import { parseString } from 'xml2js'

const app = koa(feathers())

// Load our app configuration (see config/ folder)
app.configure(configuration(configurationValidator))

// Set up Koa middleware
app.use(cors())
app.use(serveStatic(app.get('public')))
app.use(errorHandler())
app.use(parseAuthentication())
app.use(bodyParser())

// Configure services and transports
app.configure(rest())
app.configure(
  socketio({
    cors: {
      origin: app.get('origins')
    }
  })
)
app.configure(channels)
app.configure(mssql)

app.configure(services)

// Register hooks that run on all service methods
app.hooks({
  around: {
    all: [logError]
  },
  before: {},
  after: {},
  error: {}
})
// Register application setup and teardown hooks here
app.hooks({
  setup: [],
  teardown: []
})

const mainURL = 'https://petfactory.oncloud.gr/s1services'
const invoicePath = 'data/invoice'
const invoiceXmlPath = invoicePath + '/xml'
const retailersArr = [11639, 12349, 13249, 78631, 11322, 12664, 38804, 11654]

//create a class as feathersjs service
class SftpServiceClass {
  /*
  1. inputs param retailer as integer
  2. call CCCSFTP rest feathersjs service with retailer param and return data obj with URL, USERNAME, PASSPHRASE, INITIALDIRIN, FINGERPRINT, PRIVATEKEY
  3. save private key in a file on disk
  4. open ssh2-sftp-client connection with the above information. 
  4.1. documentation for ssh2-sftp--client is here: https://www.npmjs.com/package/ssh2-sftp-client and working conection by use of winscp in file sftp_sample.js from documentatie folder
  5. download all xml files locally
  6. search item.name in service CCCSFTPXML
  7. if not found push in filesToBeProcessed array only the files that are not in database
  8. save each file in database table CCCSFTPXML(TRDR_CLIENT, TRDR_RETAILER, XML, XMLDATE, XMLSTATUS, XMLERROR)
  */
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
      const n = 7 // Number of days
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
        returnedData.push({ filename: '', success: false, error: 'No files on server' })
      }

      files.forEach((item) => {
        console.log('Found on server: ' + item.name)
      })

      var limit = 20000000
      //var limit = 1
      var count = 0
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
    const sftpData = await app.service('CCCSFTP').find({ query: { TRDR_RETAILER: retailer } })
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
    var retailer = params.query.retailer
    const rootPath = params.query.rootPath
    const xmlPath = rootPath + '/xml'
    const processedPath = xmlPath + '/processed'
    const errorPath = xmlPath + '/error'
    console.log('storing xml in S1 DB for retailer', retailer)
    const folderPath = xmlPath
    const files = fs.readdirSync(folderPath)
    var returnedData = []

    for (const file of files) {
      const filename = file
      console.log('storing filename in S1 DB', filename)
      if (filename.endsWith('.xml')) {
        const localPath = folderPath + '/' + filename
        console.log('localPath', localPath)
        const xml = fs.readFileSync(localPath, 'utf8')

        //parse xml for /Order/DeliveryParty/EndpointID
        //check trdr with getDataset service in table trdbranch searching for CCCS1DXGLN = /Order/DeliveryParty/EndpointID
        //retailer = trdr

        //remove xml declaration
        let xmlClean = xml.replace(/<\?xml.*\?>/g, '')
        //remove unneeded characters from xml
        xmlClean = xmlClean.replace(/[\n\r\t]/g, '')
        //parse xml to json
        var json = null
        parseString(xmlClean, function (err, result) {
          json = result
        })
        var endpointID = json.Order.DeliveryParty[0].EndpointID[0]
        console.log('endpointID', endpointID)
        //getDataset service in table trdbranch searching for CCCS1DXGLN = /Order/DeliveryParty/EndpointID
        var trdr = endpointID
          ? await app
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
        //json will ne stored in DB as string
        const d = {
          filename: filename,
          xml: xmlClean,
          json: JSON.stringify(json)
        }
        console.log('data', d)
        try {
          const result = await app.service('storeXml').create(d, { query: { retailer: retailer } })
          console.log('storeXml result', result)
          if (result.success) {
            returnedData.push({ filename: filename, success: true, response: result })
            //move file to processed folder
            if (!fs.existsSync(processedPath)) {
              fs.mkdirSync(processedPath)
            }
            fs.renameSync(localPath, processedPath + '/' + filename)
          } else {
            returnedData.push({ filename: filename, success: false, response: result })
            //move file to error folder
            if (!fs.existsSync(errorPath)) {
              fs.mkdirSync(errorPath)
            }
            fs.renameSync(localPath, errorPath + '/' + filename)
          }
        } catch (err) {
          console.error(err)
          returnedData.push({ filename: filename, success: false, error: err })
        }
      } else {
        console.log('not an xml file')
        returnedData.push({ filename: filename, success: false, error: 'not an xml file' })
      }
    }

    console.log('List of inserted files', returnedData)
    return returnedData
  }

  async storeAperakInErpMessages(data, params) {
    const rootPath = params.query.rootPath
    const xmlPath = rootPath + '/xml'
    const processedPath = xmlPath + '/processed'
    const errorPath = xmlPath + '/error'
    const folderPath = xmlPath
    const files = fs.readdirSync(folderPath)
    var returnedData = []

    for (const file of files) {
      const filename = file
      if (filename.endsWith('.xml')) {
        const localPath = folderPath + '/' + filename
        console.log('localPath', localPath)
        const xml = fs.readFileSync(localPath, 'utf8')
        //remove xml declaration
        let xmlClean = xml.replace(/<\?xml.*\?>/g, '')
        //ufeff
        xmlClean = xmlClean.replace(/\ufeff/g, '')
        console.log('xmlClean', xmlClean)
        //parse xml to json
        const json = await new Promise((resolve, reject) =>
          parseString(xmlClean, { explicitArray: false }, (err, result) => {
            if (err) reject(err)
            else resolve(result)
          })
        )
        console.log('json', json)
        var MessageDate = json.DXMessage.MessageDate
        var MessageTime = json.DXMessage.MessageTime
        var MessageOrigin = json.DXMessage.MessageOrigin
        var DocumentReference = json.DXMessage.DocumentReference
        //if DocumentReference is in this format: 'INVOIC_19362_VAT_RO25190857.xml' retain only the number
        if (DocumentReference.includes('INVOIC_')) {
          DocumentReference = DocumentReference.split('_')[1].split('_')[0]
        }
        var DocumentUID = json.DXMessage.DocumentUID
        var SupplierReceiverCode = json.DXMessage.SupplierReceiverCode
        var DocumentResponse = json.DXMessage.DocumentResponse
        var DocumentDetail = json.DXMessage.DocumentDetail
        /*- - ID document: DX01_099_20240313_01005264 Nume fisier: INVOIC_19868_VAT_RO25190857.xml Status: Primit de DX Mesaj: Documentul a fost receptionat de platforma DocXchange The document has been received by DocXchange platform. */
        //search for Nume fisier: INVOIC_19868_VAT_RO25190857.xml in messagedetail and try to recup 19868 part
        var possibleDocumentReference = DocumentDetail.split('Nume fisier: ')[1].split('.xml')[0]
        if (DocumentReference === 'Necunoscut' && possibleDocumentReference.includes('INVOIC_')) {
          DocumentReference = possibleDocumentReference.split('_')[1]
          console.log('DocumentReference', DocumentReference)
        }
        //getDataset1 returns success, data, total or success, error
        const response = await app.service('getDataset1').find({
          query: {
            sqlQuery:
              `SELECT FORMAT(a.trndate, 'dd.MM.yyyy') TRNDATE , A.FINDOC, A.FINCODE, a.SERIESNUM DocumentReference, CONCAT(B.BGBULSTAT, B.AFM) MessageOrigin, A.TRDR retailer, c.CCCXmlFile xmlFilename, c.CCCXMLSendDate xmlSentDate FROM FINDOC A INNER JOIN TRDR B ON A.TRDR = B.TRDR ` +
              ` left join mtrdoc c on c.findoc=a.findoc WHERE A.SOSOURCE = 1351 and fprms=712 and A.FINCODE LIKE '%${DocumentReference}%' order by a.TRNDATE desc`
            //` AND A.TRNDATE = '${MessageDate}' `
            //` and ((CONCAT(B.BGBULSTAT, B.AFM) = '${MessageOrigin}') or (b.afm = '${MessageOrigin}'))`
          }
        })
        var dataToCccAperakTable = {
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
            //move file to error folder
            if (!fs.existsSync(errorPath)) {
              fs.mkdirSync(errorPath)
            }
          } else {
            if (response.total > 1) {
              returnedData.push({
                filename: filename,
                success: false,
                response:
                  'More than one document found in ERP with the same DocumentReference and MessageDate'
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
            const result = await app.service('CCCAPERAK').create(dataToCccAperakTable)
            console.log('CCCAPERAK result', result)

            if (result.CCCAPERAK) {
              returnedData.push({ filename: filename, success: true, response: result })
              //move file to processed folder
              if (!fs.existsSync(processedPath)) {
                fs.mkdirSync(processedPath)
              }
              fs.renameSync(localPath, processedPath + '/' + filename)
            } else {
              returnedData.push({ filename: filename, success: false, response: result })
              //move file to error folder
              if (!fs.existsSync(errorPath)) {
                fs.mkdirSync(errorPath)
              }
              fs.renameSync(localPath, errorPath + '/' + filename)
            }
          }
        } else {
          //push data to CCCAPERAK, findoc is mandaTory, TRDR_RETAILER is mandatory, they will be -1
          dataToCccAperakTable.FINDOC = -1
          dataToCccAperakTable.TRDR_RETAILER = -1
          const result = await app.service('CCCAPERAK').create(dataToCccAperakTable)
          console.log('CCCAPERAK result with no link to findoc', result)
          returnedData.push({
            filename: filename,
            success: false,
            response: response + ` Error in getDataset1 with params ${MessageDate}, ${DocumentReference}`
          })
          //move file to error folder
          if (!fs.existsSync(errorPath)) {
            fs.mkdirSync(errorPath)
          }
          fs.renameSync(localPath, errorPath + '/' + filename)
        }
      }
    }
    return returnedData
  }

  async scanPeriodically(data, params) {
    //downloadXml({}, { query: { retailer, rootPath: aperakPath, startsWith: 'APERAK_' } })
    //storeAperakInErpMessages({}, { query: { rootPath: aperakPath } })
    //scan periodically (30') for aperak files
    const min = 30
    const period = min * 60 * 1000
    const aperakPath = 'data/aperak'
    const orderPath = 'data/order'
    setInterval(async () => {
      console.log('scanning for orders...')
      data = {}
      params = { query: { retailer: 11639, rootPath: orderPath, startsWith: 'ORDERS_' } }
      await this.downloadXml(data, params)
      data = {}
      params = { query: { retailer: 11639, rootPath: orderPath } }
      await this.storeXmlInDB(data, params)
      console.log('scanning for aperak...')
      data = {}
      params = { query: { retailer: 11639, rootPath: aperakPath, startsWith: 'APERAK_' } }
      await this.downloadXml(data, params)
      data = {}
      params = { query: { rootPath: aperakPath } }
      await this.storeAperakInErpMessages(data, params)
      //await this.createOrders({}, {})
    }, period)
  }

  async createOrders(data, params) {
    const strRetailers = retailersArr.join(',')
    const daysOld = 30
    //getDataset1
    const res = await app.service('getDataset1').find({
      query: {
        sqlQuery: `WITH cte1 AS (SELECT (SELECT a.xmldata.query('/Order/ID') ) AS OrderIdTag ,* FROM CCCSFTPXML a WHERE a.findoc IS NULL AND a.trdr_retailer IN (${strRetailers}) AND a.xmldate > DATEADD(day, -${daysOld}, GETDATE()) ) SELECT findoc1, OrderId, TRDR_RETAILER, XMLFILENAME, XMLDATA, XMLDATE FROM ( SELECT f.findoc findoc1 ,x.* FROM ( SELECT replace(replace(cast(OrderIdTag AS VARCHAR(max)), '<ID>', ''), '</ID>', '') OrderId ,* FROM cte1 ) x LEFT JOIN findoc f ON ( f.num04 = x.OrderId AND f.iscancel = 0 AND f.sosource = 1351 AND f.fprms = 701 ) ) y WHERE findoc1 IS NULL ORDER BY trdr_retailer ,xmldate ASC`
      }
    })

    console.log('res', res)

    if (res.success) {
      for (const item of res.data) {
        const xml = item.XMLDATA
        const sosource = 1351
        const fprms = 701
        const series = 7012
        const retailer = item.TRDR_RETAILER
        const resOrder = await this.createOrderJSON(xml, sosource, fprms, series, retailer)
        console.log('jsonOrder', JSON.stringify(resOrder.jsonOrder))
        if (resOrder.success) {
          const jsonOrder = resOrder.jsonOrder
          //const resCreateOrder = await this.sendOrderToServer(jsonOrder, item.XMLFILENAME)
          //for testing we will not send the order to S1 but return fabricated response
          const resCreateOrder = { success: true, message: 'Order created successfully' }
          console.log('resCreateOrder', resCreateOrder)
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
      console.error('Error fetching data:', res.error)
    }
  }

  async createOrderJSON(xml, sosource, fprms, series, retailer) {
    // Get a token for S1 connection
    const resClient = await app.service('CCCRETAILERSCLIENTS').find({
      query: { TRDR_CLIENT: 1 }
    })
    const url = resClient.data[0].WSURL
    const username = resClient.data[0].WSUSER
    const password = resClient.data[0].WSPASS

    // Connect to S1
    const resConnect = await app.service('connectToS1').find({
      query: { url: url, username: username, password: password }
    })
    const token = resConnect.token

    // Get CCCDOCUMENTES1MAPPINGS
    const resDocMappings = await app.service('CCCDOCUMENTES1MAPPINGS').find({
      query: {
        SOSOURCE: sosource,
        FPRMS: fprms,
        SERIES: series,
        TRDR_RETAILER: retailer
      }
    })
    const CCCDOCUMENTES1MAPPINGS = resDocMappings.data[0].CCCDOCUMENTES1MAPPINGS

    // Get CCCXMLS1MAPPINGS
    const resXmlMappings = await app.service('CCCXMLS1MAPPINGS').find({
      query: { CCCDOCUMENTES1MAPPINGS: CCCDOCUMENTES1MAPPINGS }
    })
    const CCCXMLS1MAPPINGS = resXmlMappings.data

    // Create JSON order
    let jsonOrder = {
      service: 'setData',
      clientID: token,
      appId: 1001,
      OBJECT: 'SALDOC',
      FORM: 'EFIntegrareRetailers'
    }

    // Group data by distinct S1TABLE1
    let distinctS1TABLE1 = []
    CCCXMLS1MAPPINGS.forEach((item) => {
      if (!distinctS1TABLE1.includes(item.S1TABLE1)) {
        distinctS1TABLE1.push(item.S1TABLE1)
      }
    })

    // Initialize DATA object
    let DATA = {}
    distinctS1TABLE1.forEach((item) => {
      DATA[item] = []
    })

    // Convert XML to JSON
    const xmlJson = await new Promise((resolve, reject) =>
      parseString(xml, { explicitArray: false }, (err, result) => {
        if (err) reject(err)
        else resolve(result)
      })
    )

    console.log('xmlJson', JSON.stringify(xmlJson))

    // Add data to DATA object
    for (const item of CCCXMLS1MAPPINGS) {
      console.log('item', item)
      const xmlVals = this.getValFromXML(xmlJson, item.XMLNODE)
      console.log('xmlVals', xmlVals)
      for (const xmlVal of xmlVals) {
        let val = 0
        if (item.SQL) {
          val = { SQL: item.SQL, value: xmlVal }
        } else {
          val = xmlVal
        }
        const obj = {}
        obj[item.S1FIELD1] = val
        console.log('obj', obj)
        DATA[item.S1TABLE1].push(obj)
      }
    }

    jsonOrder['DATA'] = DATA

    // Process objects requiring SQL queries
    let errors = []
    for (let key in jsonOrder['DATA']) {
      let dataArray = jsonOrder['DATA'][key]
      for (let item of dataArray) {
        for (let field in item) {
          if (typeof item[field] === 'object' && item[field].SQL) {
            let sqlQuery = item[field].SQL.replace('{value}', item[field].value)
            try {
              let resSQL = await app.service('getDataset').find({ query: { sqlQuery: sqlQuery } })
              if (resSQL.data) {
                item[field] = resSQL.data
              } else {
                errors.push({
                  message: 'Error fetching data from SQL query',
                  sqlQuery: sqlQuery,
                  field: field,
                  value: item[field].value
                })
              }
            } catch (error) {
              errors.push(error.message)
            }
          }
        }
      }
    }

    if (errors.length > 0) {
      return { success: false, errors: errors }
    }

    console.log('jsonOrder', JSON.stringify(jsonOrder))

    // Process ITELINES array
    let itelines = jsonOrder['DATA']['ITELINES']
    let fieldNames = []
    itelines.forEach((item) => {
      for (let key in item) {
        if (!fieldNames.includes(key)) {
          fieldNames.push(key)
        }
      }
    })

    console.log('fieldNames', fieldNames)

    let arrays = {}
    fieldNames.forEach((item) => {
      arrays[item] = []
    })

    itelines.forEach((item) => {
      for (let key in item) {
        arrays[key].push(item[key])
      }
    })

    console.log('arrays', arrays)

    // Reconstruct ITELINES array
    itelines = []
    for (let i = 0; i < arrays[fieldNames[0]].length; i++) {
      let obj = {}
      for (let j = 0; j < fieldNames.length; j++) {
        obj[fieldNames[j]] = arrays[fieldNames[j]][i]
      }
      itelines.push(obj)
    }
    jsonOrder['DATA']['ITELINES'] = itelines

    // Add additional data to SALDOC
    jsonOrder['DATA']['SALDOC'][0]['SERIES'] = series
    jsonOrder['DATA']['SALDOC'][0]['TRDR'] = parseInt(retailer)

    return { success: true, jsonOrder: jsonOrder }
  }

  getValFromXML(jsonObj, xmlNode) {
    //add /Order/ to xmlNode
    xmlNode = '/Order/' + xmlNode
    const nodes = xmlNode.split('/').filter(Boolean)
    let results = []

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
          if (item && item.hasOwnProperty(currentNode)) {
            traverse(item[currentNode], nodeIndex + 1)
          }
        })
      } else if (currentObj && currentObj.hasOwnProperty(currentNode)) {
        traverse(currentObj[currentNode], nodeIndex + 1)
      }
    }

    traverse(jsonObj, 0)
    return results
  }

  async uploadXml(data, params) {
    const { sftp, config, sftpDataObj } = await this.prepareConnection(data, params)
    const initialDir = sftpDataObj.INITIALDIROUT
    //data is a object with filename and xml
    //send xml to sftp server
    const filename = data.filename
    const xml = data.xml
    const findoc = data.findoc
    const localPath = invoiceXmlPath + filename
    //create path if not exists
    if (!fs.existsSync(invoiceXmlPath)) {
      fs.mkdirSync(invoiceXmlPath)
    }
    //write xml to file
    fs.writeFileSync(localPath, xml)
    var response = null
    //upload file
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

    //return response
    this.emit('uploadResult', response)
    return response
  }
}

//register the service
app.use('sftp', new SftpServiceClass(), {
  methods: [
    'downloadXml',
    'storeXmlInDB',
    'storeAperakInErpMessages',
    'uploadXml',
    'scanPeriodically',
    'createOrders'
  ],
  events: ['uploadResult']
})

class storeXmlServiceClass {
  async create(data, params) {
    return new Promise((resolve, reject) => {
      const retailer = params.query.retailer
      const filename = data.filename
      const xml = data.xml
      const json = data.json
      const xmlDate = new Date().toISOString().slice(0, 19).replace('T', ' ')
      const xmlStatus = 'NEW'
      const xmlError = ''

      app
        .service('CCCSFTPXML')
        .find({ query: { XMLFILENAME: filename } })
        .then((xmlExists) => {
          if (xmlExists.total > 0) {
            console.log('XML file already exists in database')
            resolve({
              xmlInsert: xmlExists.data[0],
              filename: filename,
              success: false,
              message: 'XML file already exists in database'
            })
          } else {
            console.log('XML file does not exist in database')
            app
              .service('CCCSFTPXML')
              .create({
                TRDR_CLIENT: 1,
                TRDR_RETAILER: retailer,
                XMLDATA: xml,
                JSONDATA: json,
                XMLDATE: xmlDate,
                XMLSTATUS: xmlStatus,
                XMLERROR: xmlError,
                XMLFILENAME: filename
              })
              .then((xmlInsert) => {
                resolve({
                  xmlInsert: xmlInsert,
                  filename: filename,
                  success: true,
                  message: 'XML file inserted in database'
                })
              })
              .catch((err) => {
                console.error(err)
                reject({
                  filename: filename,
                  success: false,
                  message: 'XML file not inserted in database',
                  error: err
                })
              })
          }
        })
        .catch((err) => {
          console.error(err)
          reject({
            filename: filename,
            success: false,
            message: 'Error checking if XML file exists in database',
            error: err
          })
        })
    })
  }
}

//register the service
app.use('storeXml', new storeXmlServiceClass())

class connectToS1ServiceClass {
  async find(params) {
    //const url = params.query.url
    const url = mainURL
    const username = 'websitepetfactory'
    const password = 'petfactory4321'
    const method = 'POST'
    const body = {
      service: 'login',
      username: username,
      password: password,
      appId: 1001
    }
    console.log(body)
    const response = await fetch(url, { method: method, body: JSON.stringify(body) })
    const json = await response.json()
    console.log(json)
    const clientID = json.clientID
    const REFID = json.objs[0].REFID
    const MODULE = json.objs[0].MODULE
    const COMPANY = json.objs[0].COMPANY
    const BRANCH = json.objs[0].BRANCH
    const authenticateBody = {
      service: 'authenticate',
      clientID: clientID,
      COMPANY: COMPANY,
      BRANCH: BRANCH,
      MODULE: MODULE,
      REFID: REFID
    }
    console.log(authenticateBody)
    const authenticateResponse = await fetch(url, { method: method, body: JSON.stringify(authenticateBody) })
    const authenticateJson = await authenticateResponse.json()
    console.log(authenticateJson)
    const token = authenticateJson.clientID
    return { token: token }
  }
}

//register the service
app.use('connectToS1', new connectToS1ServiceClass())

//create a service called setDocument that sets a document in S1; it uses the token from connectToS1 service and body from data
//using fetch

class setDocumentServiceClass {
  async create(data, params) {
    const url = mainURL
    const method = 'POST'
    const body = data
    const response = await fetch(url, { method: method, body: JSON.stringify(body) })
    const json = await response.json()
    console.log(json)
    return json
  }
}

//register the service
app.use('setDocument', new setDocumentServiceClass())

//create a service called getDataset that gets a dataset from S1 in return to a token and a string containing a sql query
class getDatasetServiceClass {
  async find(params) {
    const url = mainURL + '/JS/JSRetailers/processSqlAsDataset'
    const method = 'POST'
    const sqlQuery = params.query.sqlQuery
    console.log('sqlQuery', sqlQuery)
    const response = await fetch(url, { method: method, body: JSON.stringify({ sqlQuery: sqlQuery }) })
    const json = await response.json()
    console.log(json)
    return json
  }
}

//register the service
app.use('getDataset', new getDatasetServiceClass())

class getDataset1ServiceClass {
  async find(params) {
    const url = mainURL + '/JS/JSRetailers/processSqlAsDataset1'
    const method = 'POST'
    const sqlQuery = params.query.sqlQuery
    console.log('sqlQuery', sqlQuery)
    const response = await fetch(url, { method: method, body: JSON.stringify({ sqlQuery: sqlQuery }) })
    const json = await response.json()
    console.log(json)
    return json //success, data, total or success, error
  }
}

//register the service
app.use('getDataset1', new getDataset1ServiceClass())

class getS1ObjData {
  async find(params) {
    const findoc = params.query.KEY
    const clientID = params.query.clientID
    const appID = params.query.appID
    const OBJECT = params.query.OBJECT
    const FORM = params.query.FORM
    const KEY = findoc
    const service = 'getData'
    const LOCATEINFO = params.query.LOCATEINFO
    const url = mainURL
    const method = 'POST'
    const body = {
      service: service,
      clientID: clientID,
      appID: appID,
      OBJECT: OBJECT,
      FORM: FORM,
      KEY: KEY,
      LOCATEINFO: LOCATEINFO
    }
    //console.log(body)
    const response = await fetch(url, { method: method, body: JSON.stringify(body) })
    const json = await response.json()
    console.log(json)
    return json
  }
}

//register the service
app.use('getS1ObjData', new getS1ObjData())

class getS1SqlData {
  async find(params) {
    const clientID = params.query.clientID
    const appID = params.query.appID
    const service = 'sqlData'
    const SqlName = params.query.SqlName
    const trdr = params.query.trdr
    const sosource = params.query.sosource
    const fprms = params.query.fprms
    const series = params.query.series
    const daysOlder = params.query.daysOlder
    const url = mainURL
    const method = 'POST'
    const body = {
      service: service,
      clientID: clientID,
      appID: appID,
      SqlName: SqlName,
      trdr: trdr,
      sosource: sosource,
      fprms: fprms,
      series: series,
      daysOlder: daysOlder
    }
    //console.log(body)
    const response = await fetch(url, { method: method, body: JSON.stringify(body) })
    const json = await response.json()
    console.log(json)
    return json
  }
}

//register the service
app.use('getS1SqlData', new getS1SqlData())

class getInvoiceDom {
  async find(params) {
    const clientID = params.query.clientID
    const appID = params.query.appID
    const findoc = params.query.findoc
    const url = mainURL + '/JS/runCmd20210915/runExternalCode'
    const method = 'POST'
    const body = {
      clientID: clientID,
      appID: appID,
      findoc: findoc
    }
    //console.log(body)
    const response = await fetch(url, { method: method, body: JSON.stringify(body) })
    const json = await response.json()
    console.log(json)
    return json
  }
}

app.use('getInvoiceDom', new getInvoiceDom())

class retailerServiceClass {
  async find(params) {
    const retailer = params.query.retailer
    const clientPlatforma = params.query.clientPlatforma
    const ediQry = `SELECT A.*, B.NAME EDIPROVIDERNAME, C.NAME CONNTYPE FROM CCCSFTP A 
      INNER JOIN CCCEDIPROVIDER B ON A.EDIPROVIDER = B.CCCEDIPROVIDER 
      INNER JOIN CCCCONNTYPE C ON B.CONNTYPE = C.CCCCONNTYPE WHERE A.TRDR_RETAILER = ${retailer}`
    const response = await app.service('getDataset1').find({ query: { sqlQuery: ediQry } })
    const ediDetails = response.success
      ? {
          TRDR_RETAILER: response.TRDR_RETAILER,
          EDIPROVIDER: response.EDIPROVIDER,
          EDIPROVIDERNAME: response.EDIPROVIDERNAME,
          CONNTYPE: response.CONNTYPE,
          URL: response.URL,
          PORT: response.PORT,
          USERNAME: response.USERNAME,
          PASSPHRASE: response.PASSPHRASE,
          PRIVATEKEY: response.PRIVATEKEY,
          FINGERPRINT: response.FINGERPRINT,
          INITIALDIRIN: response.INITIALDIRIN,
          INITIALDIROUT: response.INITIALDIROUT
        }
      : {}

    //CCCDOCUMENTES1MAPPINGS
    const documentMappingsQry = `SELECT CCCDOCUMENTES1MAPPINGS, SOSOURCE, FPRMS, SERIES, INITIALDIRIN, INITIALDIROUT FROM CCCDOCUMENTES1MAPPINGS WHERE TRDR_RETAILER = ${retailer} and TRDR_CLIENT = ${clientPlatforma}`
    const documentMappingsResponse = await app
      .service('getDataset1')
      .find({ query: { sqlQuery: documentMappingsQry } })

    const S1DocumentSeries = documentMappingsResponse.success ? documentMappingsResponse.data : []

    return { success: response.success, edi: ediDetails, S1DocumentSeries: S1DocumentSeries }
  }
}

//register the service
app.use('retailer', new retailerServiceClass())

//test it with TRDR_CLIENT=1 and clientPlatforma=11654
//app.service('retailer').find({ query: { retailer: 11654, clientPlatforma: 1 } })

//scanPeriodically run
app.service('sftp').scanPeriodically({}, {})

export { app }

/*
CREATE TABLE CCCEDIPROVIDER (
    CCCEDIPROVIDER INT NOT NULL IDENTITY(1,1) PRIMARY KEY,
    NAME VARCHAR(50),
    CONNTYPE INT NOT NULL
)
*/

//test sftp.createOrders
//app.service('sftp').createOrders({}, {})
