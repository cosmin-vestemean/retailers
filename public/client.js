import client from './modules/feathersjs-client.js'
import { displayDocsForRetailers } from './modules/invoiceTable.js'
import { displayOrdersForRetailers, getValFromXML } from './modules/orderTable.js'

console.log('Client.js loaded')

const orderPath = 'data/order'
const aperakPath = 'data/aperak'

//https://retailers-modular-975638ebe522.herokuapp.com/retailer_file_manager.html?tdr=11639&logo=%27https://s13emagst.akamaized.net/layout/ro/images/logo//59/88362.svg%27
//get trdr and logo from url
var url = new URL(window.location.href)
console.log('url', url)
export const trdrRetailerFromUrl = parseInt(url.searchParams.get('tdr'))
export const urlLogoRetailerFromUrl = url.searchParams.get('logo')

async function getXmlListFromErp(retailer) {
  return new Promise((resolve, reject) => {
    client
      .service('CCCSFTPXML')
      .find({
        query: {
          TRDR_RETAILER: retailer,
          $limit: 200,
          $sort: {
            XMLDATE: -1
          }
        }
      })
      .then((res) => {
        resolve(res)
      })
  })
}

async function getRemoteXmlListToErp() {
  var retailer
  try {
    retailer = trdrRetailerFromUrl
  } catch (err) {
    alert('Please select a retailer')
    console.log('Retailer 11639 selected by default')
    retailer = 11639
  }
  //change button text
  document.getElementById('preluareComenziBtn').innerHTML = 'Please wait...'
  await client
    .service('sftp')
    .downloadXml({}, { query: { retailer: retailer, rootPath: orderPath, startsWith: 'ORDERS_' } })
    .then((res) => {
      console.log('downloadXml', res)
    })

  await client
    .service('sftp')
    .storeXmlInDB({}, { query: { retailer: retailer, rootPath: orderPath } })
    .then((res) => {
      console.log('storeXmlInDB', res)
    })

  await getNDisplayOrders(retailer)
  //5. change document.getElementById('preluareComenziBtn') text according to stage of process
  document.getElementById('preluareComenziBtn').innerHTML = 'Preluare comenzi'
}

export async function getRemoteAperakXmlListToErp() {
  var retailer
  try {
    retailer = trdrRetailerFromUrl
  } catch (err) {
    alert('Please select a retailer')
    console.log('Retailer 11639 selected by default')
    retailer = 11639
  }
  //change button text
  document.getElementById('preluareAperakBtn').innerHTML = 'Please wait...'
  await client
    .service('sftp')
    .downloadXml({}, { query: { retailer: retailer, rootPath: aperakPath, startsWith: 'APERAK_' } })
    .then((res) => {
      console.log('downloadXml', res)
    })

  await client
    .service('sftp')
    .storeAperakInErpMessages({}, { query: { rootPath: aperakPath } })
    .then((res) => {
      console.log('storeAperakInMessages', res)
    })

  document.getElementById('preluareAperakBtn').innerHTML = 'Preluare APERAK'
}

async function getNDisplayOrders(retailer) {
  await getXmlListFromErp(retailer).then((data) => {
    console.log('getXmlListFromErp', data)
    displayOrdersForRetailers(data, retailer, 'xmlTableBody')
  })
}

async function getNDisplayS1Docs(sosource, fprms, series) {
  var trdr
  try {
    trdr = parseInt(trdrRetailerFromUrl)
  } catch (err) {
    alert('Please select a retailer')
    console.log('Please select a retailer')
    return
  }
  console.log('trdr', trdr)
  //Open tab facturi
  document.getElementById('facturi_link').click()
  var daysOlder = document.getElementById('daysOlder').value
  client
    .service('getS1SqlData')
    .find({
      query: {
        clientID: await client
          .service('connectToS1')
          .find()
          .then((result) => {
            return result.token
          }),
        appID: '1001',
        SqlName: 'Retailers_Index_Docs',
        trdr: trdr,
        sosource: sosource,
        fprms: fprms,
        series: series,
        daysOlder: daysOlder
      }
    })
    .then(async (result) => {
      console.debug(JSON.stringify(result, null, 2))
      await displayDocsForRetailers(result, trdr, sosource, fprms, series, 'facturiTableBody')
      //check id comenziTrimise
      document.getElementById('comenziTrimise').checked = true
      toggleComenziNetrimise()
      //facturiTrimise
      document.getElementById('facturiTrimise').checked = true
      toggleFacturiNetrimise()
    })
}

async function sendAllFacturi() {
  alert('To be implemented')
}

//create function to close bulma modal on escape key
//from bulma docs: To activate the modal, just add the is-active modifier on the .modal container.
document.addEventListener('keydown', function (event) {
  var modal = document.getElementById('commonsDigging')
  if (event.key == 'Escape') {
    modal.classList.remove('is-active')
  }
})

window.onload = function () {
  var params = {}
  params['query'] = {}
  params['query']['sqlQuery'] =
    'select name from trdr where sodtype=13 and trdr=' + trdrRetailerFromUrl
  client
    .service('getDataset')
    .find(params)
    .then((res) => {
      if (res.data) {
        //alert(res.data)
        //get id of div id="retailerName"
        var retailerName = document.getElementById('retailerName')
        retailerName.innerHTML = res.data
      }
    })
}

async function openTab(evt, tabName) {
  var i, x, tablinks
  x = document.getElementsByClassName('content-tab')
  for (i = 0; i < x.length; i++) {
    x[i].style.display = 'none'
  }
  tablinks = document.getElementsByClassName('tab')
  for (i = 0; i < x.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(' is-active', '')
  }
  document.getElementById(tabName).style.display = 'block'
  evt.currentTarget.className += ' is-active'

  if (tabName == 'comenzi') {
    //check id comenziTrimise
    document.getElementById('comenziTrimise').checked = true
    toggleComenziNetrimise()
  }

  if (tabName == 'facturi') {
    //facturiTrimise
    document.getElementById('facturiTrimise').checked = true
    toggleFacturiNetrimise()
  }
}

async function toggleComenziNetrimise() {
  hideRows('comenziTrimise', 'xmlTableBody', 'trimisCheckbox')
}

//onClick event for id="facturiTrimise" to show only facturi netrimise sau toate facturile
//netrimise means <td class="trimis"> contains <i class="fas fa-xl fa-times-circle has-text-danger">
async function toggleFacturiNetrimise() {
  hideRows('facturiTrimise', 'facturiTableBody', 'trimisCheckbox')
}

function hideRows(chkName, tbodyName, className) {
  var facturiTrimise = document.getElementById(chkName)
  var table = document.getElementById(tbodyName)
  if (facturiTrimise.checked) {
    //hide rows with cell class trimis and checkbox trimisCheckbox is checked
    var rows = table.getElementsByTagName('tr')
    for (var i = 0; i < rows.length; i++) {
      //get checkbox with class trimisCheckbox
      var trimisCheckbox = rows[i].getElementsByClassName(className)[0]
      //if checked, hide row
      if (trimisCheckbox && trimisCheckbox.checked) {
        rows[i].style.display = 'none'
      }
    }
  } else {
    //show all rows
    var rows = table.getElementsByTagName('tr')
    for (var i = 0; i < rows.length; i++) {
      rows[i].style.display = ''
    }
  }
}

export {
  openTab,
  getRemoteXmlListToErp,
  getNDisplayOrders,
  getNDisplayS1Docs,
  toggleComenziNetrimise,
  sendAllFacturi,
  toggleFacturiNetrimise
}
