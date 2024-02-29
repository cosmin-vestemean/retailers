import client from './modules/feathersjs-client.js'
import { displayDocsForRetailers } from './modules/invoiceTable.js'
import { displayOrdersForRetailers, getValFromXML } from './modules/orderTable.js'

console.log('Client.js loaded')

async function setRetailerId(trdr, urlLogo) {
  localStorage.setItem('trdr_retailer', trdr)
  localStorage.setItem('logo_retailer', urlLogo)
  console.log('Retailer id set to ', parseInt(localStorage.getItem('trdr_retailer')))
  console.log('Logo url set to ', localStorage.getItem('logo_retailer'))
}

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
  //1. localStorage.getItem('trdr_retailer')
  //2. client.service('sftp').downloadXml({}, { query: { retailer: localStorage.getItem('trdr_retailer') } })
  //3. client.service('sftp').storeXmlInDB({}, { query: { retailer: localStorage.getItem('trdr_retailer') } })
  //4. getNDisplayOrders(localStorage.getItem('trdr_retailer'))"
  //5. change document.getElementById('preluareComenziBtn') text according to stage of process
  var retailer
  try {
    retailer = parseInt(localStorage.getItem('trdr_retailer'))
  } catch (err) {
    alert('Please select a retailer')
    console.log('Please select a retailer')
    return
  }
  //change button text
  document.getElementById('preluareComenziBtn').innerHTML = 'Please wait...'
  //1. localStorage.getItem('trdr_retailer')
  //2. client.service('sftp').downloadXml({}, { query: { retailer: localStorage.getItem('trdr_retailer') } })
  await client
    .service('sftp')
    .downloadXml({}, { query: { retailer: retailer } })
    .then((res) => {
      console.log('downloadXml', res)
    })

  //3. client.service('sftp').storeXmlInDB({}, { query: { retailer: localStorage.getItem('trdr_retailer') } })
  await client
    .service('sftp')
    .storeXmlInDB({}, { query: { retailer: retailer } })
    .then((res) => {
      console.log('storeXmlInDB', res)
    })

  //4. getNDisplayOrders(localStorage.getItem('trdr_retailer'))"
  await getNDisplayOrders(retailer)
  //5. change document.getElementById('preluareComenziBtn') text according to stage of process
  document.getElementById('preluareComenziBtn').innerHTML = 'Preluare comenzi'
}

async function getNDisplayOrders(retailer) {
  //localStorage.getItem('trdr_retailer')
  await getXmlListFromErp(retailer).then((data) => {
    console.log('getXmlListFromErp', data)
    displayOrdersForRetailers(data, retailer, 'xmlTableBody')
  })
}

async function getNDisplayS1Docs(sosource, fprms, series) {
  var trdr
  try {
    trdr = parseInt(localStorage.getItem('trdr_retailer'))
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

//if user refreshes page, then message alert localStorageRetailer
window.onload = function () {
  var params = {}
  params['query'] = {}
  params['query']['sqlQuery'] =
    'select name from trdr where sodtype=13 and trdr=' + localStorage.getItem('trdr_retailer')
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
  var comenziTrimise = document.getElementById('comenziTrimise')
  var table = document.getElementById('xmlTableBody')
  if (comenziTrimise.checked) {
    var nrTrimise = 0
    var totalCOmenzi = table.getElementsByTagName('tr').length
    //hide rows with <i class="fas fa-xl fa-check-circle has-text-success"></i> or all
    var rows = table.getElementsByTagName('tr')
    for (var i = 0; i < totalCOmenzi; i++) {
      if (rows[i].innerHTML.indexOf('fa-check-circle') > -1) {
        rows[i].style.display = 'none'
        nrTrimise++
      }
    }
    if (totalCOmenzi > 0 && nrTrimise == totalCOmenzi) {
      //alert('Toate comenzile au fost trimise')
      //xmlTableBody if table has rows, even if they are hidden
      var tr = table.insertRow()
      var td = tr.insertCell()
      td.innerHTML = 'Toate comenzile au fost trimise'
      td.colSpan = 6
      td.classList.add('alertMesssage')
      td.style.textAlign = 'center'
      td.style.color = 'green'
      td.style.fontWeight = 'bold'
      td.style.fontSize = '20px'
    }
  } else {
    //show all rows
    var rows = table.getElementsByTagName('tr')
    for (var i = 0; i < rows.length; i++) {
      rows[i].style.display = ''
    }
    //find td class="alertMesssage" and remove it
    var alertMessage = table.getElementsByClassName('alertMesssage')[0]
    if (alertMessage) {
      alertMessage.remove()
    }
  }
}

//onClick event for id="facturiTrimise" to show only facturi netrimise sau toate facturile
//netrimise means <td class="trimis"> contains <i class="fas fa-xl fa-times-circle has-text-danger">
async function toggleFacturiNetrimise() {
  var facturiTrimise = document.getElementById('facturiTrimise')
  var table = document.getElementById('facturiTableBody')
  if (facturiTrimise.checked) {
    const nrFacturi = table.getElementsByTagName('tr').length
    var nrTrimise = 0
    //show only rows with cell class="trimis" innerHTML empty if checkbox is checked, else show all rows
    var rows = table.getElementsByTagName('tr')
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i]
      var cell = row.getElementsByClassName('trimis')[0]
      //contains <i class="fas fa-xl fa-check-circle has-text-danger">
      if (cell.innerHTML.includes('fa-check-circle')) {
        row.style.display = 'none'
        nrTrimise++
      }
    }
    if (nrFacturi > 0 && nrTrimise == nrFacturi) {
      //alert('Toate facturile au fost trimise')
      //write on the facturiTableBody if table has rows, even if they are hidden
      var tr = table.insertRow()
      var td = tr.insertCell()
      td.innerHTML = 'Toate facturile au fost trimise'
      td.colSpan = 6
      td.classList.add('alertMesssage')
      td.style.textAlign = 'center'
      td.style.color = 'green'
      td.style.fontWeight = 'bold'
      td.style.fontSize = '20px'
    }
  } else {
    var rows = table.getElementsByTagName('tr')
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i]
      row.style.display = ''
    }
    //find td class="alertMesssage" and remove it
    var alertMessage = table.getElementsByClassName('alertMesssage')[0]
    if (alertMessage) {
      alertMessage.remove()
    }
  }
}

export {
  setRetailerId,
  openTab,
  getRemoteXmlListToErp,
  getNDisplayOrders,
  getNDisplayS1Docs,
  toggleComenziNetrimise,
  sendAllFacturi,
  toggleFacturiNetrimise
}
