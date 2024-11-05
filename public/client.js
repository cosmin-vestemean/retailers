import client from './modules/feathersjs-client.js'
import { displayDocsForRetailers } from './modules/invoiceTable.js'
import { displayOrdersForRetailers, getValFromXML } from './modules/orderTable.js'
//import { retailers } from './retailers.js'

//console.log('client.js loaded')

const orderPath = 'data/order'
const aperakPath = 'data/aperak'

//https://retailers-modular-975638ebe522.herokuapp.com/retailer_file_manager.html?tdr=11639&logo=%27https://s13emagst.akamaized.net/layout/ro/images/logo//59/88362.svg%27
//get trdr and logo from url
var url = new URL(window.location.href)
//console.log('url', url)
export const trdrRetailerFromUrl = parseInt(url.searchParams.get('trdr'))
export const urlLogoRetailerFromUrl = url.searchParams.get('logo')

async function getXmlListFromErp(retailer) {
  return new Promise((resolve, reject) => {
    client
      .service('CCCSFTPXML')
      .find({
        query: {
          TRDR_RETAILER: retailer,
          $limit: 50,
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
  var retailer = trdrRetailerFromUrl ? trdrRetailerFromUrl : 11639

  //change button text
  document.getElementById('preluareComenziBtn').innerHTML = 'Please wait...'
  await client
    .service('sftp')
    .downloadXml({}, { query: { retailer: retailer, rootPath: orderPath, startsWith: 'ORDERS_' } })
    .then((res) => {
      //console.log('downloadXml', res)
    })

  await client
    .service('sftp')
    .storeXmlInDB({}, { query: { retailer: retailer, rootPath: orderPath } })
    .then((res) => {
      //console.log('storeXmlInDB', res)
    })

  //await getNDisplayOrders(retailer)
  //5. change document.getElementById('preluareComenziBtn') text according to stage of process
  document.getElementById('preluareComenziBtn').innerHTML = 'Preluare comenzi'
}

export async function getRemoteAperakXmlListToErp() {
  var retailer = trdrRetailerFromUrl ? trdrRetailerFromUrl : 11639

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
      //console.log('storeAperakInMessages', res)
    })

  document.getElementById('preluareAperakBtn').innerHTML = 'Preluare APERAK'
}

async function getNDisplayOrders(retailer) {
  //get table body
  let xmlTableBody = document.getElementById('xmlTableBody')
  //add a message to table: loading...
  var tr = xmlTableBody.insertRow()
  var td = tr.insertCell()
  td.innerHTML = 'Loading...'
  td.className = 'has-text-primary has-text-centered has-text-weight-bold'
  //font 20px
  td.style.fontSize = '20px'
  td.colSpan = 5
  await getXmlListFromErp(retailer).then(async (data) => {
    //console.log('getXmlListFromErp', data)
    await displayOrdersForRetailers(data, retailer, 'xmlTableBody')
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
  //console.log('trdr', trdr)
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
      //document.getElementById('comenziTrimise').checked = true
      //toggleComenziNetrimise()
      //facturiTrimise
      //document.getElementById('facturiTrimise').checked = true
      //toggleFacturiNetrimise()
    })
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
  if (trdrRetailerFromUrl) {
    getRetailerName(trdrRetailerFromUrl)
  }
  //add font to body
  document.body.style.fontFamily =
    'Inter, BlinkMacSystemFont,"Segoe UI","Roboto","Oxygen","Ubuntu","Cantarell","Fira Sans","Droid Sans","Helvetica Neue",sans-serif'
}

function getRetailerName(trdr) {
  var params = {}
  params['query'] = {}
  params['query']['sqlQuery'] = 'select name from trdr where sodtype=13 and trdr=' + trdr
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

async function loadOrdersLog() {
  const ordersLogTable = document.getElementById('ordersLogTable')
  ordersLogTable.innerHTML = '' // Clear existing rows

  const response = await client.service('CCCORDERSLOG').find({
    query: {
      $limit: 100,
      $sort: { MESSAGEDATE: -1 }
    }
  })

  response.data.forEach((order, index) => {
    const row = ordersLogTable.insertRow()
    row.insertCell(0).innerHTML = index + 1 // Row number
    row.insertCell(1).innerHTML = order.MESSAGEDATE
    row.insertCell(2).innerHTML = order.ORDERID
    row.insertCell(3).innerHTML = order.MESSAGETEXT
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
    //document.getElementById('comenziTrimise').checked = true
    //toggleComenziNetrimise()
  }

  if (tabName == 'facturi') {
    //facturiTrimise
    //document.getElementById('facturiTrimise').checked = true
    //toggleFacturiNetrimise()
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

export function createNewOrders() {
  client.service('sftp').createOrders({}, {}).then((res) => {
    document.getElementById('createOrders').innerHTML = 'Please wait...'
    console.log('createNewOrders', res)
    document.getElementById('createOrders').innerHTML = 'Trimite comenzile noi'
  })
}



export function getEmptyAperak() {
  //get * from cccaperak with findoc=-1
  client
    .service('CCCAPERAK')
    .find({
      query: {
        FINDOC: -1,
        TRDR_RETAILER: -1,
        $limit: 50,
        $sort: {
          MESSAGEDATE: -1,
          MESSAGETIME: -1
        }
      }
    })
    .then((res) => {
      //get aperakTable
      var table = document.getElementById('aperakTable') //it's a tbody
      //clear table
      table.innerHTML = ''
      //iterate through res.data
      for (var i = 0; i < res.data.length; i++) {
        //create tr
        var tr = document.createElement('tr')
        //create td
        var td = document.createElement('td')
        //set innerHTML with date part of MESSAGEDATE
        td.innerHTML = res.data[i].MESSAGEDATE.split('T')[0]
        //append td to tr
        tr.appendChild(td)
        //another td
        td = document.createElement('td')
        td.innerHTML = res.data[i].MESSAGETIME.split('T')[1].split('.')[0]
        tr.appendChild(td)
        td = document.createElement('td')
        td.innerHTML = res.data[i].MESSAGEORIGIN
        tr.appendChild(td)
        td = document.createElement('td')
        td.innerHTML = res.data[i].DOCUMENTREFERENCE
        tr.appendChild(td)
        td = document.createElement('td')
        td.innerHTML = res.data[i].DOCUMENTUID
        tr.appendChild(td)
        td = document.createElement('td')
        td.innerHTML = res.data[i].SUPPLIERRECEIVERCODE
        tr.appendChild(td)
        td = document.createElement('td')
        td.innerHTML = res.data[i].DOCUMENTRESPONSE
        tr.appendChild(td)
        td = document.createElement('td')
        td.innerHTML = res.data[i].DOCUMENTDETAIL
        tr.appendChild(td)
        //append tr to table
        table.appendChild(tr)
      }
      // Get the modal
      var modal = document.getElementById('aperakModal')
      //add class is-active to modal
      modal.classList.add('is-active')
    })
}

export {
  openTab,
  getRemoteXmlListToErp,
  getNDisplayOrders,
  getNDisplayS1Docs,
  toggleComenziNetrimise,
  toggleFacturiNetrimise,
  loadOrdersLog
}
