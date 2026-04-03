export class StoreXmlService {
  constructor(options) {
    this.options = options
    this.app = options.app
  }

  async create(data, params) {
    return new Promise((resolve, reject) => {
      const retailer = params.query.retailer
      const filename = data.filename
      const xml = data.xml
      const json = data.json
      const xmlDate = new Date().toISOString().slice(0, 19).replace('T', ' ')
      const xmlStatus = 'NEW'
      const xmlError = ''

      this.app
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
            this.app
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

export const getOptions = (app) => ({ app })