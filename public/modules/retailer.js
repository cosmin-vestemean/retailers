import { client } from './feathersjs-client.js'
export async function getRetailerConfData() {
    var localStorageRetailer
    try {
      localStorageRetailer = parseInt(localStorage.getItem('trdr_retailer'))
    } catch (err) {
      console.log(err)
    }
    client
      .service('CCCSFTP')
      .find({
        query: {
          TRDR_RETAILER: localStorageRetailer
        }
      })
      .then((res) => {
        console.log(res)
        //URL
        document.getElementById('URL').value = res.data[0].URL
        //PORT
        document.getElementById('PORT').value = res.data[0].PORT
        //USERNAME
        document.getElementById('USERNAME').value = res.data[0].USERNAME
        //PASSPHRASE
        document.getElementById('PASSPHRASE').value = res.data[0].PASSPHRASE
        privateKey = res.data[0].PRIVATEKEY
        document.getElementById('FINGERPRINT').value = res.data[0].FINGERPRINT
        document.getElementById('TRDR_RETAILER').value = res.data[0].TRDR_RETAILER
        //INITIALDIRIN
        document.getElementById('INITIALDIRIN').value = res.data[0].INITIALDIRIN
        //INITIALDIROUT
        document.getElementById('INITIALDIROUT').value = res.data[0].INITIALDIROUT
      })
  }