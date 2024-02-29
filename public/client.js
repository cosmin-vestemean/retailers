import client from './modules/feathersjs-client.js'
import { displayDocsForRetailers } from './modules/invoiceTable.js'

console.log('Client.js loaded')

async function setRetailerId(trdr, urlLogo) {
  localStorage.setItem('trdr_retailer', trdr)
  localStorage.setItem('logo_retailer', urlLogo)
  console.log('Retailer id set to ', parseInt(localStorage.getItem('trdr_retailer')))
  console.log('Logo url set to ', localStorage.getItem('logo_retailer'))
}

async function getRetailerXMLData(retailer) {
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

async function sendOrder(xml, xmlFilename, xmlDate, retailer) {
  return await createOrderJSON(xml, 1351, 701, 7012, xmlFilename, xmlDate, retailer)
}

async function createOrderJSON(xml, sosource, fprms, series, xmlFilename, xmlDate, retailer) {
  //use await instead of promises
  //get a token for s1 connection
  var res = await client.service('CCCRETAILERSCLIENTS').find({
    query: {
      TRDR_CLIENT: 1
    }
  })
  console.log('date logare', res)
  var url = res.data[0].WSURL
  var username = res.data[0].WSUSER
  var password = res.data[0].WSPASS
  var res = await client.service('connectToS1').find({
    query: {
      url: url,
      username: username,
      password: password
    }
  })
  console.log('connectToS1', res)
  var token = res.token
  //get CCCDOCUMENTES1MAPPINGS for sourcCCCDOCUMENTES1MAPPINGSe, fprms, series
  var res = await client.service('CCCDOCUMENTES1MAPPINGS').find({
    query: {
      SOSOURCE: sosource,
      FPRMS: fprms,
      SERIES: series,
      TRDR_RETAILER: retailer
    }
  })
  console.log('CCCDOCUMENTES1MAPPINGS', res)

  var CCCDOCUMENTES1MAPPINGS = res.data[0].CCCDOCUMENTES1MAPPINGS
  //get CCCXMLS1MAPPINGS for CCCDOCUMENTES1MAPPINGS
  var res = await client.service('CCCXMLS1MAPPINGS').find({
    query: {
      CCCDOCUMENTES1MAPPINGS: CCCDOCUMENTES1MAPPINGS
    }
  })
  console.log('CCCXMLS1MAPPINGS', res)
  var CCCXMLS1MAPPINGS = res.data
  //create json order
  var jsonOrder = {}
  jsonOrder['service'] = 'setData'
  jsonOrder['clientID'] = token
  jsonOrder['appId'] = 1001
  jsonOrder['OBJECT'] = 'SALDOC'
  jsonOrder['FORM'] = 'EFIntegrareRetailers'

  //find distinct S1TABLE1, for grouping data
  var distinctS1TABLE1 = []
  CCCXMLS1MAPPINGS.forEach((item) => {
    if (distinctS1TABLE1.indexOf(item.S1TABLE1) == -1) {
      distinctS1TABLE1.push(item.S1TABLE1)
    }
  })
  console.log('distinctS1TABLE1', distinctS1TABLE1)
  //create jsonOrder['DATA']
  var DATA = {}
  //create jsonOrder['DATA'][distinct]
  distinctS1TABLE1.forEach((item) => {
    DATA[item] = []
  })
  //add data to jsonOrder['DATA'][distinct]
  CCCXMLS1MAPPINGS.forEach((item) => {
    var xmlVals = getValFromXML(xml, item.XMLNODE)
    xmlVals.forEach((xmlVal) => {
      var val = 0
      if (item.SQL) {
        //SQL: select trdbranch from trdbranch where trdr=12334 and cccs1dxgln='{value}'
        //{value} is the value from xml for current node
        //execute sql
        /*
              executeSQL(sql).then((res) => {
                console.log('res', res)
                val = res.data[0][item.S1FIELD1]
              })
              */
        val = { SQL: item.SQL, value: xmlVal }
      } else {
        val = xmlVal
      }
      var obj = {}
      obj[item.S1FIELD1] = val
      DATA[item.S1TABLE1].push(obj)
    })
  })
  jsonOrder['DATA'] = DATA

  console.log('jsonOrder', jsonOrder)

  //for each value containing an object, replace it with the returned getDataset value from the object
  //for ex: {SQL: "select trdbranch from trdbranch where trdr=12334 and cccs1dxgln='{value}'"}
  //replace it with the client.service('getDataset').find({SQL: "select trdbranch from trdbranch where trdr=12334 and cccs1dxgln='{value}'"})
  //parse jsonOrder['DATA'] to get all objects
  var objects = []
  for (var key in jsonOrder['DATA']) {
    jsonOrder['DATA'][key].forEach((item) => {
      objects.push(item)
    })
  }
  console.log('objects', objects)
  var errors = [],
    errors2 = []
  //if object has an object with a key SQL, replace it with the returned getDataset value from the object
  for (var i = 0; i < objects.length; i++) {
    var item = objects[i]
    for (var key in item) {
      if (typeof item[key] == 'object') {
        if (item[key].SQL) {
          console.log('SQL', item[key].SQL)
          console.log('xml Value', item[key].value)
          //replace item[key] with the returned getDataset value from the object

          //set params' query
          var params = {}
          params['query'] = {}
          params['query']['sqlQuery'] = item[key].SQL
          //replace {value} with xml value
          params['query']['sqlQuery'] = params['query']['sqlQuery'].replace('{value}', item[key].value)
          var res = await client.service('getDataset').find(params)
          console.log('getDataset', JSON.stringify(res))
          if (res.data) {
            item[key] = res.data
          } else {
            //1. xml > dom
            var parser = new DOMParser()
            var xmlDoc = parser.parseFromString(xml, 'text/xml')
            /*2.1. example
            <Item><Description>Litter without roof Stefanplast Sprint Corner Plus, Blue, 40x56x h 14</Description><BuyersItemIdentification>8003507968158</BuyersItemIdentification><SellersItemIdentification>MF.06759</SellersItemIdentification><StandardItemIdentification>8003507968158</StandardItemIdentification><AdditionalItemIdentification>DeliveryDate:2023-10-03</AdditionalItemIdentification><AdditionalItemIdentification>LineStatus:valid</AdditionalItemIdentification><AdditionalItemIdentification>ClientConfirmationStatus:confirmed</AdditionalItemIdentification></Item>
            */
            //2.2. xpath: find node with item[key].value and coresponing sibling "Description"
            var xpath = `//*[contains(text(), '${item[key].value}')]`
            console.log('xpath', xpath, 'key', key, 'value', item[key].value, 'sql', item[key].SQL)
            var nodes = xmlDoc.evaluate(xpath, xmlDoc, null, XPathResult.ANY_TYPE, null)
            console.log('nodes', nodes)
            errors2.push({ key: key, value: item[key].value, sql: item[key].SQL, xpath: xpath, nodes: nodes })
            try {
              var node = nodes.iterateNext()
              //2.3. get sibling "Description"
              var description = node.parentNode.getElementsByTagName('Description')[0].innerHTML
              //2.4. get sibling "BuyersItemIdentification"
              var BuyersItemIdentification =
                node.parentNode.getElementsByTagName('BuyersItemIdentification')[0].innerHTML
              //make error message fiendly
              errors.push(
                `Error in converting code ${item[key].value} to S1 value.\nDescription: ${description},\nBuyersItemIdentification: ${BuyersItemIdentification}`
              )
            } catch (err) {
              console.log(err)
              errors.push(`Error in converting code ${item[key].value} to S1 value.`)
            }
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    alert(errors.join('\n\n'))
  }

  if (errors2.length > 0) {
    console.log('errors2', errors2)
    return { success: false, errors: errors2 }
  }

  //match mtrl with price and qty1 in an object in itelines array
  var itelines = jsonOrder['DATA']['ITELINES']
  //select distinct fieldnames from itelines
  var fieldNames = []
  itelines.forEach((item) => {
    for (var key in item) {
      if (fieldNames.indexOf(key) == -1) {
        fieldNames.push(key)
      }
    }
  })
  //create n distinct arrays for each fieldname
  var arrays = {}
  fieldNames.forEach((item) => {
    arrays[item] = []
  })
  //add values to arrays
  itelines.forEach((item) => {
    for (var key in item) {
      arrays[key].push(item[key])
    }
  })

  //create itelines array
  var itelines = []
  //create objects with fieldnames and values
  for (var i = 0; i < arrays[fieldNames[0]].length; i++) {
    var obj = {}
    for (var j = 0; j < fieldNames.length; j++) {
      obj[fieldNames[j]] = arrays[fieldNames[j]][i]
    }
    itelines.push(obj)
  }

  //add itelines to jsonOrder['DATA']
  jsonOrder['DATA']['ITELINES'] = itelines

  distinctS1TABLE1.forEach((item) => {
    //except itelines
    if (item != 'ITELINES') {
      var obj = {}
      jsonOrder['DATA'][item].forEach((item2) => {
        for (var key in item2) {
          obj[key] = item2[key]
        }
      })
      jsonOrder['DATA'][item] = [obj]
    }
  })

  //add series and trdr to SALDOC
  jsonOrder['DATA']['SALDOC'][0]['SERIES'] = series
  //TRDR_RETAILER
  localStorageRetailer = parseInt(localStorage.getItem('trdr_retailer'))
  jsonOrder['DATA']['SALDOC'][0]['TRDR'] = localStorageRetailer

  console.log('jsonOrder', jsonOrder)

  //send order to server
  await sendOrderToServer(jsonOrder, xmlFilename, xmlDate, retailer)

  return { success: true }
}

async function sendOrderToServer(jsonOrder, xmlFilename, xmlDate, retailer) {
  //1. url, username and password returnd from call to service CCCRETAILERSCLIENTS
  //2. server new service: app.use('connectToS1', new connectToS1ServiceClass()) return connection token to use in axios call
  //3. call setDocument service with jsonOrder and token

  //1. url, username and password returnd from call to service CCCRETAILERSCLIENTS
  await client
    .service('CCCRETAILERSCLIENTS')
    .find({
      query: {
        TRDR_CLIENT: 1
      }
    })
    .then(async (res) => {
      console.log('date logare', res)
      //2. server new service: app.use('connectToS1', new connectToS1ServiceClass()) return connection token to use in axios call
      var url = res.data[0].WSURL
      var username = res.data[0].WSUSER
      var password = res.data[0].WSPASS
      await client
        .service('connectToS1')
        .find({
          query: {
            url: url,
            username: username,
            password: password
          }
        })
        .then(async (res) => {
          console.log(res)
          console.log('s1 token', res.token)
          //replace jsonOrder clientID with token
          jsonOrder['clientID'] = res.token
          console.log('jsonOrder', jsonOrder)
          console.log('url', url)
          await client
            .service('setDocument')
            .create(jsonOrder)
            .then((res) => {
              console.log(res)
              if (res.success == true) {
                alert('Order sent to S1, order internal number: ' + res.id)
                //update CCCSFTPXML with order internal number as findoc
                client
                  .service('CCCSFTPXML')
                  .patch(
                    null,
                    { FINDOC: parseInt(res.id) },
                    { query: { XMLFILENAME: xmlFilename, XMLDATE: xmlDate, TRDR_RETAILER: retailer } }
                  )
                  .then((res) => {
                    console.log('CCCSFTPXML patch', res)
                    //refresh xml table
                    getNDisplayOrders(retailer)
                  })
              } else {
                alert('Error: ' + res.error)
              }
            })
        })
    })
}

function getValFromXML(xml, node) {
  //Xpath
  var dom = new DOMParser().parseFromString(xml, 'text/xml')
  var doc = dom.documentElement
  //console.log('getValFromXML', doc)
  //node value by xpath
  var iterator = dom.evaluate(node, doc, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null)
  console.log('getValFromXML', iterator)
  var matchingNodes = []
  try {
    let thisNode = iterator.iterateNext()

    while (thisNode) {
      // console.log(thisNode.textContent)
      matchingNodes.push(thisNode.textContent)
      thisNode = iterator.iterateNext()
    }
  } catch (e) {
    console.error(`Error: Document tree modified during iteration ${e}`)
  }

  return matchingNodes
}

async function fetchXMLFromRemoteServer() {
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
  await getRetailerXMLData(retailer).then((data) => {
    console.log('getRetailerXMLData', data)
    //get the table body
    const xmlTableBody = document.getElementById('xmlTableBody')
    //empty the table body
    xmlTableBody.innerHTML = ''
    //loop through the data
    data.data.forEach(async (xml) => {
      //create a new row
      var row = xmlTableBody.insertRow()
      //insert the cells
      //insert hidden xml.CCCSFTPXML
      var cccsftpxml = row.insertCell()
      cccsftpxml.innerHTML = xml.CCCSFTPXML
      cccsftpxml.style.display = 'none'
      var humanDate = new Date(xml.XMLDATE).toLocaleString()
      row.insertCell().innerHTML = humanDate
      //row.insertCell().innerHTML = xml.XMLFILENAME ? xml.XMLFILENAME : ''
      var filenameCell = row.insertCell()
      filenameCell.innerHTML = xml.XMLFILENAME ? xml.XMLFILENAME : ''
      var xmlDataCell = row.insertCell()
      xmlDataCell.innerHTML = '<textarea class="textarea is-small is-info" rows="10" cols="50">' + xml.XMLDATA + '</textarea>'
      //spellcheck="false"
      xmlDataCell.spellcheck = false
      var parser = new DOMParser()
      var xmlDoc = parser.parseFromString(xml.XMLDATA, 'text/xml')
      //parse xml to dom and find <AccountingCustomerParty> something <PartyName> node
      var partyName = xmlDoc.getElementsByTagName('AccountingCustomerParty')[0]
        ? xmlDoc.getElementsByTagName('AccountingCustomerParty')[0].getElementsByTagName('PartyName')[0]
        : null
      //get /Order/ID value
      var orderId = getValFromXML(xml.XMLDATA, '/Order/ID')[0]
      //if exists append to cell xmlfilename
      if (orderId) {
        filenameCell.innerHTML += '<br><span class="tag is-info is-light">' + orderId + '</span>'
      }
      row.insertCell().innerHTML = partyName ? partyName.innerHTML : ''
      //create the actions cell
      var actionsCell = row.insertCell()
      //create the buttons
      var saveButton = document.createElement('button')
      saveButton.innerHTML = 'Save'
      saveButton.className = 'button is-small is-info ml-2'
      saveButton.onclick = function () {
        //save the xml to file
        var xmlBlob = new Blob([xml.XMLDATA], { type: 'text/xml' })
        var xmlURL = window.URL.createObjectURL(xmlBlob)
        var tempLink = document.createElement('a')
        tempLink.href = xmlURL
        tempLink.setAttribute('download', xml.XMLFILENAME)
        tempLink.click()
      }
      var copyButton = document.createElement('button')
      copyButton.innerHTML = 'Copy'
      copyButton.className = 'button is-small is-primary ml-2'
      copyButton.onclick = function () {
        //copy the xml to clipboard
        navigator.clipboard.writeText(xml.XMLDATA).then(
          function () {
            alert('copied')
          },
          function (err) {
            console.error('Async: Could not copy text: ', err)
          }
        )
      }
      var deleteButton = document.createElement('button')
      deleteButton.innerHTML = 'Delete'
      deleteButton.className = 'button is-small is-danger ml-2'
      deleteButton.onclick = function () {
        alert('delete')
      }
      //send order
      var sendOrderButton = document.createElement('button')
      sendOrderButton.innerHTML = xml.FINDOC ? 'Order sent' : 'Send order'
      sendOrderButton.className = 'button is-small is-success ml-2'
      sendOrderButton.onclick = async function () {
        //daca am findoc nu mai trimit
        if (!xml.FINDOC) {
          sendOrderButton.innerHTML = 'Sending...'
          var response = await sendOrder(xml.XMLDATA, xml.XMLFILENAME, xml.XMLDATE, retailer)
          if (response.success == false) {
            //show no of errors
            var errorMsg = ''
            errorMsg += 'Errors: ' + response.errors.length + '\n\n'
            for (var i = 0; i < response.errors.length; i++) {
              var error = response.errors[i]
              //{ key: key, value: item[key].value, sql: item[key].SQL, xpath: xpath, nodes: nodes }
              //if error.sql contains "from trdbranch" then the title of error is Sucursala
              if (error.sql.indexOf('from trdbranch') > -1) {
                error.title = 'Sucursala'
              }
              //display title
              errorMsg += i + 1 + '.' + error.title + '\n'
              //count title characters and add dashes under it
              for (var j = 0; j < error.title.length; j++) {
                errorMsg += '-'
              }
              errorMsg += '\n'
              errorMsg += `Error in converting ${error.key} code ${error.value} to S1 value.\nSQL: ${
                error.sql
              },\nNodes: ${error.nodes.iterateNext().parentNode.innerHTML}\n\n`
              sendOrderButton.innerHTML = 'See errors'
              //add text area with errors beneath the buttons
              var textarea = document.createElement('textarea')
              textarea.rows = 10
              textarea.cols = 50
              textarea.innerHTML = errorMsg
              actionsCell.appendChild(textarea)
              //no spellcheck
              textarea.spellcheck = false
              //class
              textarea.className = 'textarea is-small is-danger'
            }
            return
          } else {
            sendOrderButton.innerHTML = 'Order sent'
          }
        } else {
          alert('Already sent')
        }
      }
      //append the buttons to the actions cell
      actionsCell.appendChild(saveButton)
      actionsCell.appendChild(copyButton)
      actionsCell.appendChild(deleteButton)
      actionsCell.appendChild(sendOrderButton)

      //add cell for findoc
      var findoc = row.insertCell()
      //add class for findoc
      findoc.className = 'findoc'
      //if findoc is not null, add a green tick, else add a red cross; big icons
      if (xml.FINDOC) {
        findoc.innerHTML = '<i class="fas fa-xl fa-check-circle has-text-success"></i><br><br>' + xml.FINDOC
      } else {
        //verify if order was sent but not confirmed
        //get Order > ID value from XMLDATA and search in SALDOC table by processSqlAsDataset
        var orderId = getValFromXML(xml.XMLDATA, '/Order/ID')[0]
        console.log('orderId', orderId)
        //get order from SALDOC
        var params = {}
        params['query'] = {}
        params['query'][
          'sqlQuery'
        ] = `select findoc from findoc where sosource=1351 and trdr=${retailer} and num04='${orderId}'`
        var res = await client.service('getDataset').find(params)
        console.log('getDataset', JSON.stringify(res))
        if (res.data) {
          findoc.innerHTML = '<i class="fas fa-xl fa-check-circle has-text-success"></i><br><br>' + res.data
          //update CCCSFTPXML with order internal number as findoc
          client
            .service('CCCSFTPXML')
            .patch(
              null,
              { FINDOC: parseInt(res.data) },
              { query: { XMLFILENAME: xml.XMLFILENAME, XMLDATE: xml.XMLDATE, TRDR_RETAILER: retailer } }
            )
            .then((res) => {
              console.log('CCCSFTPXML patch', res)
            })
          //button text
          sendOrderButton.innerHTML = 'Order sent'
        } else {
          findoc.innerHTML = '<i class="fas fa-xl fa-times-circle has-text-danger"></i>'
          //add a checkbox to actions cell
          var input = document.createElement('input')
          input.type = 'checkbox'
          input.name = xml.XMLFILENAME
          input.id = xml.XMLFILENAME
          input.className = 'checkbox is-small ml-2'
          actionsCell.appendChild(input)
        }
      }
    })
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
  fetchXMLFromRemoteServer,
  getNDisplayOrders,
  getNDisplayS1Docs,
  toggleComenziNetrimise,
  sendAllFacturi,
  toggleFacturiNetrimise
}
