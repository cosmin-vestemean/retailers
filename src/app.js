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
      const n = 14 // Number of days
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

      //var limit = 20000000
      var limit = 1
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
      throw err
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
    const retailer = params.query.retailer
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
    const retailer = params.query.retailer
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
        var json = null
        parseString(xmlClean, { explicitArray: false }, (error, result) => {
          if (error) {
            throw new Error(error);
          } else {
            json = result;
            console.log(result);
          }
        });
        console.log('json', json)
        var MessageDate = json.DXMessage.MessageDate
        var MessageTime = json.DXMessage.MessageTime
        var MessageOrigin = json.DXMessage.MessageOrigin
        var DocumentReference = json.DXMessage.DocumentReference
        var DocumentUID = json.DXMessage.DocumentUID
        var SupplierReceiverCode = json.DXMessage.SupplierReceiverCode
        var DocumentResponse = json.DXMessage.DocumentResponse
        var DocumentDetail = json.DXMessage.DocumentDetail
        //getDataset1 returns success, data, total or success, error
        await app
          .service('getDataset1')
          .find({
            query: {
              sqlQuery:
                `SELECT A.FINDOC, A.FINCODE, a.SERIESNUM DocumentReference, CONCAT(B.BGBULSTAT, B.AFM) MessageOrigin, A.TRDR retailer, c.CCCXmlFile xmlFilename, c.CCCXMLSendDate xmlSentDate FROM FINDOC A INNER JOIN TRDR B ON A.TRDR = B.TRDR ` +
                `  left join mtrdoc c on c.findoc=a.findoc WHERE A.SOSOURCE = 1351 and A.FINCODE LIKE '%${DocumentReference}%' AND A.TRNDATE = '${MessageDate}' and ((CONCAT(B.BGBULSTAT, B.AFM) = '${MessageOrigin}') or (b.afm = '${MessageOrigin}'))`
            }
          })
          .then(async (result) => {
            console.log('getDataset1 result', result)

            if (result.success) {
              const findoc = result.data[0].FINDOC
              const retailer = result.data[0].retailer
              const xmlFilename = result.data[0].xmlFilename
              const xmlSentDate = result.data[0].xmlSentDate
              var dataToCccAperakTable = {
                TRDR_RETAILER: retailer,
                TRDR_CLIENT: 1,
                FINDOC: findoc,
                MESSAGEDATE: MessageDate,
                MESSAGETIME: MessageTime,
                MESSAGEORIGIN: MessageOrigin,
                DOCUMENTREFERENCE: DocumentReference,
                DOCUMENTUID: DocumentUID,
                SUPPLIERRECEIVERCODE: SupplierReceiverCode,
                DOCUMENTRESPONSE: DocumentResponse,
                DOCUMENTDETAIL: DocumentDetail
              }
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
            } else {
              returnedData.push({ filename: filename, success: false, response: result })
              //move file to error folder
              if (!fs.existsSync(errorPath)) {
                fs.mkdirSync(errorPath)
              }
              fs.renameSync(localPath, errorPath + '/' + filename)
            }
          })
      }
    }
    return returnedData
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
  methods: ['downloadXml', 'storeXmlInDB', 'storeAperakInErpMessages', 'uploadXml'],
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
    console.log(body)
    const response = await fetch(url, { method: method, body: JSON.stringify(body) })
    const json = await response.json()
    //console.log(json)
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
    console.log(body)
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
    console.log(body)
    const response = await fetch(url, { method: method, body: JSON.stringify(body) })
    const json = await response.json()
    console.log(json)
    return json
  }
}

app.use('getInvoiceDom', new getInvoiceDom())

//test getInvoiceDom service
/* app
  .service('getInvoiceDom')
  .find({
    query: {
      clientID:
        await app
          .service('connectToS1')
          .find()
          .then((result) => {
            return result.token
          }),
      appID: '1001',
      findoc: '1222852'
    }
  })
  .then(async (result) => {
    //var_dump(result) as in php
    console.debug(JSON.stringify(result, null, 2))
  }) */

/*
example of use
{
    "service": "getData",
    "clientID": "9J8pHczKKqLd9JL3ObHLPMLNLcLdJIKsC2KsC791KbbbLqTGOartQ69DQtXcKNPqG59CS5909JL5GL5FPdHJLYKrH5L5JK5COrDN9JL4HrPIMNLPMb5II7ObDKD3Jsv1S5bKLN9EGdX3IKibDKDZLrfHPLHiL7D0Rq1JIoKtHNb5LLL1PbPvR5D8PqXYHKnCHbLqH5D2PqH29JL5NoKrH4LL9JT3K7LNLq57",
    "appId": "1001",
    "OBJECT": "SALDOC",
    "FORM":"EF",
    "KEY":"1222852",
    "LOCATEINFO": "SALDOC:TRNDATE,FINCODE,TRDR_CUSTOMER_PHONE01;MTRDOC:DELIVDATE,CCCXMLSendDate;ITELINES:MTRL,QTY1,PRICE,MTRL_ITEM_CODE1"
}
*/

//test getS1ObjData service with data from example above
/*
app
  .service('getS1ObjData')
  .find({
    query: {
      KEY: '1222852',
      clientID:
        await app
          .service('connectToS1')
          .find()
          .then((result) => {
            return result.token
          }),
      appID: '1001',
      OBJECT: 'SALDOC',
      FORM: 'EFIntegrareRetailers',
      LOCATEINFO:
        'SALDOC:TRNDATE,FINCODE,TRDR_CUSTOMER_PHONE01;MTRDOC:DELIVDATE,CCCXMLSendDate;ITELINES:MTRL,QTY1,PRICE,MTRL_ITEM_CODE1'
    }
  })
  .then(async (result) => {
    //var_dump(result) as in php
    console.debug(JSON.stringify(result, null, 2))

  })
  */

//test connectToS1 service
/* 
app
  .service('connectToS1')
  .create()
  .then((result) => {
    console.log(result)
  })
  */

//find all sftp data
/* app
  .service('CCCSFTP')
  .find()
  .then((result) => {
    const retailer = result.data[0].TRDR_RETAILER
    app
      .service('sftp')
      .find({ query: { retailer: retailer } })
      .then((data) => {
        console.log(data)
      })
  }) */

export { app }
