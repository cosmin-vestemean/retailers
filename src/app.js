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

//xml2js
import { parseStringPromise } from 'xml2js'

//fs
import * as fs from 'fs'

import fetch from 'node-fetch'

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
const orderPath = 'data/order'
const orderXmlPath = orderPath + '/xml'
const orderProcessedPath = orderPath + '/processed'
const orderErrorPath = orderPath + '/error'
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
    const { sftp, config, sftpDataObj } = await this.prepareConection(data, params)
    const initialDir = sftpDataObj.INITIALDIRIN

    var returnedData = []

    sftp
      .connect(config)
      .then(() => {
        console.log('connected')
        var olderThen = new Date()
        //not older then n days
        var n = 7
        olderThen.setDate(olderThen.getDate() - n)
        return sftp.list(initialDir, (item) => {
          //console.log('item', item)
          return (
            item.type === '-' &&
            item.name.endsWith('.xml') &&
            item.modifyTime > olderThen &&
            item.name.startsWith('ORD')
          )
        })
      })
      .then((data) => {
        if (data.length === 0) {
          console.log('No files on server')
          sftp.end()
          return []
        }
        //console log file names
        data.forEach((item) => {
          console.log(item.name)
        })
        //download each xml file and send it to storeXml service
        data.forEach((item) => {
          const filename = item.name
          const localPath = orderXmlPath + filename
          //create path if not exists
          if (!fs.existsSync(orderXmlPath)) {
            fs.mkdirSync(orderXmlPath)
          }
          let dst = fs.createWriteStream(localPath)
          sftp
            .get(initialDir + '/' + filename, dst)
            .then(() => {
              console.log(`File ${filename} downloaded successfully!`)
              returnedData.push({ filename: filename, success: true })
            })
            .catch((err) => {
              console.error(err)
              returnedData.push({ filename: filename, success: false })
            })
            .finally(() => {
              dst.end()
              //last file downloaded, close connection
              if (filename === data[data.length - 1].name) {
                sftp.end()
              }
            })
        })

        //return data
        return returnedData
      })
      .catch((err) => {
        console.error('list error', err)
        sftp.end()
        return err
      })
  }

  async prepareConection(data, params) {
    const retailer = params.query.retailer
    const sftpData = await app.service('CCCSFTP').find({ query: { TRDR_RETAILER: retailer } })
    //console.log('Date conexiune', sftpData)
    const sftpDataObj = sftpData.data[0]
    const privateKey = sftpDataObj.PRIVATEKEY
    const privateKeyPath = 'privateKey.txt'
    fs.writeFileSync(privateKeyPath, privateKey)
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

    return { sftp: sftp, config: config, sftpDataObj: sftpDataObj }
  }

  async storeXmlInDB(data, params) {
    const retailer = params.query.retailer
    const folderPath = orderXmlPath
    const files = fs.readdirSync(folderPath)
    var returnedData = []

    files.forEach((file) => {
      const filename = file
      if (filename.endsWith('.xml')) {
        const localPath = folderPath + '/' + filename
        console.log('localPath', localPath)
        const xml = fs.readFileSync(localPath, 'utf8')
        //remove xml declaration
        var xmlClean = xml.replace(/<\?xml.*\?>/g, '')
        //remove unneeded characters from xml
        xmlClean = xmlClean.replace(/[\n\r\t]/g, '')
        //parse xml to json
        const json = parseStringPromise(xmlClean)
        const d = {
          filename: filename,
          xml: xmlClean,
          json: JSON.stringify(json)
        }
        console.log('data', d)
        app
          .service('storeXml')
          .create(d, { query: { retailer: retailer } })
          .then((result) => {
            console.log('storeXml result', result)
            if (result.success) {
              returnedData.push({ filename: filename, success: true })
              //move file to processed folder
              const processedPath = orderProcessedPath
              if (!fs.existsSync(processedPath)) {
                fs.mkdirSync(processedPath)
              }
              fs.renameSync(localPath, processedPath + '/' + filename)
            } else {
              returnedData.push({ filename: filename, success: false })
              //move file to error folder
              const errorPath = orderErrorPath
              if (!fs.existsSync(errorPath)) {
                fs.mkdirSync(errorPath)
              }
              fs.renameSync(localPath, errorPath + '/' + filename)
            }
          })
          .catch((err) => {
            console.error(err)
            returnedData.push({ filename: filename, success: false })
          })
      }
    })

    return returnedData
  }

  async uploadXml(data, params) {
    const { sftp, config, sftpDataObj } = await this.prepareConection(data, params)
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
    //upload file
    sftp
      .connect(config)
      .then(() => {
        console.log('connected')
        return sftp.put(localPath, initialDir + '/' + filename)
      })
      .then((data) => {
        console.log(`File ${filename} uploaded successfully!`, data)
        const response = { findoc: findoc, filename: filename, success: true }
        console.log('response', response)
        return response
      })
      .catch((err) => {
        console.error(err)
        return { findoc: findoc, filename: filename, success: false }
      })
      .finally(() => {
        sftp.end()
      })
  }
}

//register the service
app.use('sftp', new SftpServiceClass(), {
  methods: ['downloadXml', 'storeXmlInDB', 'uploadXml']
})

class storeXmlServiceClass {
  async create(data, params) {
    const retailer = params.query.retailer
    const filename = data.filename
    const xml = data.xml
    const json = data.json
    //format date as yyyy-mm-dd hh:mm:ss
    const xmlDate = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const xmlStatus = 'NEW'
    const xmlError = ''
    //check if filename exists in database
    const xmlExists = await app.service('CCCSFTPXML').find({ query: { XMLFILENAME: filename } })
    if (xmlExists.total > 0) {
      console.log('XML file already exists in database')
      return {
        xmlInsert: xmlExists.data[0],
        filename: filename,
        success: false
      }
    } else {
      console.log('XML file does not exist in database')
      try {
        const xmlInsert = await app.service('CCCSFTPXML').create({
          TRDR_CLIENT: 1,
          TRDR_RETAILER: retailer,
          XMLDATA: xml,
          JSONDATA: json,
          XMLDATE: xmlDate,
          XMLSTATUS: xmlStatus,
          XMLERROR: xmlError,
          XMLFILENAME: filename
        })
        return { xmlInsert: xmlInsert, filename: filename, success: true }
      } catch (err) {
        console.error(err)
        return { filename: filename, success: false }
      }
    }
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
    console.log('getDatasetServiceClass', params)
    const url = mainURL + '/JS/JSRetailers/processSqlAsDataset'
    const method = 'POST'
    const sqlQuery = params.query.sqlQuery
    console.log('sqlQuery', sqlQuery)
    const response = await fetch(url, { method: method, body: JSON.stringify({ sqlQuery: sqlQuery }) })
    console.log('response', response)
    const json = await response.json()
    console.log(json)
    return json
  }
}

//register the service
app.use('getDataset', new getDatasetServiceClass())

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
