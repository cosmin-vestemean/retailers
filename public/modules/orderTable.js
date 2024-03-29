import { trdrRetailerFromUrl, getNDisplayOrders } from '../client.js'
import client from './feathersjs-client.js'

const testUrl = 'https://dev-petfactory.oncloud.gr/s1services'

export async function displayOrdersForRetailers(data, retailer, tableBodyId) {
  //get the table body
  const xmlTableBody = document.getElementById(tableBodyId)
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
    xmlDataCell.innerHTML =
      '<textarea class="textarea is-small is-info" rows="5" cols="50">' + xml.XMLDATA + '</textarea>'
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
    //row.insertCell().innerHTML = partyName ? partyName.innerHTML : ''
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
    var deleteModal = document.getElementById('deleteModal')
    var h1deletedRow = document.getElementById('deletedRow')
    h1deletedRow.innerHTML = `Row with filename: ${xml.XMLFILENAME} and date: ${humanDate} will be deleted.<br><br>Are you sure?`
    deleteButton.onclick = function () {
      //ask for confirmation
      //on click on id="deleteYes" remove the xml from the table
      document.getElementById('deleteYes').onclick = function () {
        //delete the xml from the table
        const CCCSFTPXML = xml.CCCSFTPXML
        client
          .service('CCCSFTPXML')
          .remove(CCCSFTPXML)
          .then((res) => {
            //console.log('CCCSFTPXML remove', res)
            //refresh xml table
            row.remove()
            //close the modal by removing the class is-active
            deleteModal.classList.remove('is-active')
          })
          .catch((err) => {
            console.error('CCCSFTPXML remove', err)
          })
      }
      //deleteNo
      document.getElementById('deleteNo').onclick = function () {
        //close the modal by removing the class is-active
        deleteModal.classList.remove('is-active')
      }

      //add class is-active to show the modal
      deleteModal.classList.add('is-active')
    }
    //send order
    var sendOrderButton = document.createElement('button')
    sendOrderButton.innerHTML = xml.FINDOC ? 'Order sent' : 'Send order'
    sendOrderButton.className = 'button is-small is-success ml-2'
    sendOrderButton.onclick = async function () {
      //daca am findoc nu mai trimit
      if (!xml.FINDOC) {
        //disable the button
        sendOrderButton.disabled = true
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
            textarea.rows = 5
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
          //enable the button
          sendOrderButton.disabled = false
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
    //verify if order was sent but not confirmed
    //get Order > ID value from XMLDATA and search in SALDOC table by processSqlAsDataset

    if (xml.FINDOC) {
      var input = document.createElement('input')
      input.type = 'checkbox'
      input.name = xml.XMLFILENAME
      input.id = xml.XMLFILENAME
      input.className = 'checkbox is-small ml-2 trimisCheckbox'
      input.checked = true
      input.disabled = true
      findoc.appendChild(input)
      //add label
      var label = document.createElement('label')
      label.htmlFor = xml.XMLFILENAME
      label.appendChild(document.createTextNode(xml.FINDOC))
      findoc.appendChild(label)
      //add details icon
      var detailsIcon = document.createElement('i')
      detailsIcon.className = 'fas fa-xl fa-info-circle ml-2'
      //style
      detailsIcon.style.cursor = 'pointer'
      detailsIcon.style.color = 'blue'
      detailsIcon.title = 'Details'
      detailsIcon.onclick = async function () {
        //delete detailsIcon
        detailsIcon.remove()
        var { orderId, res } = await getFindocForOrder(orderId, xml)
        //nicely display res.data[0].FINDOC, res.data[0].FINCODE, res.data[0].TRNDATE in same td as detailsIcon
        var details = document.createElement('div')
        var detailsText = `${res.data[0].FINCODE}<br>${res.data[0].TRNDATE}`
        details.innerHTML = detailsText
        //add class to details
        details.className = 'is-info is-small'
        findoc.appendChild(details)
      }
      findoc.appendChild(detailsIcon)
    } else {
      var { orderId, res } = await getFindocForOrder(orderId, xml)
      //console.log('getDataset1', res)
      if (res.success == true && res.data.length > 0) {
        //update CCCSFTPXML with order internal number as findoc
        client
          .service('CCCSFTPXML')
          .patch(
            null,
            { FINDOC: parseInt(res.data[0].FINDOC) },
            { query: { XMLFILENAME: xml.XMLFILENAME, XMLDATE: xml.XMLDATE, TRDR_RETAILER: retailer } }
          )
          .then((res) => {
            console.log('CCCSFTPXML patch', res)
            //checkbox checked
            var input = document.createElement('input')
            input.type = 'checkbox'
            input.name = xml.XMLFILENAME
            input.id = xml.XMLFILENAME
            input.className = 'checkbox is-small ml-2 trimisCheckbox'
            input.checked = true
            input.disabled = true
            findoc.appendChild(input)
          })
        //button text
        sendOrderButton.innerHTML = 'Order sent'
      } else {
        //findoc.innerHTML = '<i class="fas fa-xl fa-times-circle has-text-danger"></i>'
        //add a checkbox to FINDOC cell
        var input = document.createElement('input')
        input.type = 'checkbox'
        input.name = xml.XMLFILENAME
        input.id = xml.XMLFILENAME
        input.className = 'checkbox is-small ml-2 trimisCheckbox'
        //hide
        input.style.display = 'none'
        findoc.appendChild(input)
      }
    }
  })

  async function getFindocForOrder(orderId, xml) {
    var orderId = getValFromXML(xml.XMLDATA, '/Order/ID')[0]
    //console.log('orderId', orderId)
    //get order from SALDOC
    var params = {}
    params['query'] = {}
    params['query'][
      'sqlQuery'
    ] = `select FINDOC, FINCODE, FORMAT(TRNDATE, 'dd.MM.yyyy') TRNDATE from findoc where sosource=1351 and trdr=${retailer} and num04='${orderId}'`
    var res = await client.service('getDataset1').find(params)
    return { orderId, res }
  }
}

export function getValFromXML(xml, node) {
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

async function sendOrder(xml, xmlFilename, xmlDate, retailer) {
  return await createOrderJSON(xml, 1351, 701, 7012, xmlFilename, xmlDate, retailer)
}

export async function trimiteComenzileNetrimise() {
  //are you sure?
  if (!confirm('Are you sure?')) {
    return
  }
  //sendOrder
  var table = document.getElementById('xmlTableBody')
  var rows = table.getElementsByTagName('tr')
  var stopAt = 1
  //var stopAt = rows.length
  for (var i = 0; i < stopAt; i++) {
    var trimisCheckbox = rows[i].getElementsByClassName('trimisCheckbox')[0]
    if (trimisCheckbox && !trimisCheckbox.checked) {
      var xmlData = rows[i].getElementsByTagName('textarea')[0].value
      var xmlFilename = rows[i].getElementsByTagName('td')[1].innerHTML
      var xmlDate = rows[i].getElementsByTagName('td')[0].innerHTML
      console.log('xmlData', xmlData, 'xmlFilename', xmlFilename, 'xmlDate', xmlDate, 'retailer', trdrRetailerFromUrl)
      await sendOrder(xmlData, xmlFilename, xmlDate, trdrRetailerFromUrl)
    }
  }
}

async function createOrderJSON(xml, sosource, fprms, series, xmlFilename, xmlDate, retailer) {
  //use await instead of promises
  //get a token for s1 connection
  var res = await client.service('CCCRETAILERSCLIENTS').find({
    query: {
      TRDR_CLIENT: 1
    }
  })
  //console.log('date logare', res)
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
  //console.log('connectToS1', res)
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
  //console.log('CCCDOCUMENTES1MAPPINGS', res)

  var CCCDOCUMENTES1MAPPINGS = res.data[0].CCCDOCUMENTES1MAPPINGS
  //get CCCXMLS1MAPPINGS for CCCDOCUMENTES1MAPPINGS
  var res = await client.service('CCCXMLS1MAPPINGS').find({
    query: {
      CCCDOCUMENTES1MAPPINGS: CCCDOCUMENTES1MAPPINGS
    }
  })
  //console.log('CCCXMLS1MAPPINGS', res)
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
  //console.log('distinctS1TABLE1', distinctS1TABLE1)
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

  //console.log('jsonOrder', jsonOrder)

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
  //console.log('objects', objects)
  var errors = [],
    errors2 = []
  //if object has an object with a key SQL, replace it with the returned getDataset value from the object
  for (var i = 0; i < objects.length; i++) {
    var item = objects[i]
    for (var key in item) {
      if (typeof item[key] == 'object') {
        if (item[key].SQL) {
          //console.log('SQL', item[key].SQL)
          //console.log('xml Value', item[key].value)
          //replace item[key] with the returned getDataset value from the object

          //set params' query
          var params = {}
          params['query'] = {}
          params['query']['sqlQuery'] = item[key].SQL
          //replace {value} with xml value
          params['query']['sqlQuery'] = params['query']['sqlQuery'].replace('{value}', item[key].value)
          var res = await client.service('getDataset').find(params)
          //console.log('getDataset', JSON.stringify(res))
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
            //('xpath', xpath, 'key', key, 'value', item[key].value, 'sql', item[key].SQL)
            var nodes = xmlDoc.evaluate(xpath, xmlDoc, null, XPathResult.ANY_TYPE, null)
            //console.log('nodes', nodes)
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
  jsonOrder['DATA']['SALDOC'][0]['TRDR'] = parseInt(trdrRetailerFromUrl)

  //console.log('jsonOrder', jsonOrder)

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
      //console.log('date logare', res)
      //2. server new service: app.use('connectToS1', new connectToS1ServiceClass()) return connection token to use in axios call
      //var url = res.data[0].WSURL
      var url = testUrl
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
          //console.log(res)
          //console.log('s1 token', res.token)
          //replace jsonOrder clientID with token
          jsonOrder['clientID'] = res.token
          //console.log('jsonOrder', jsonOrder)
          //console.log('url', url)
          await client
            .service('setDocument')
            .create(jsonOrder)
            .then((res) => {
              //console.log(res)
              if (res.success == true) {
                //alert('Order sent to S1, order internal number: ' + res.id)
                //update CCCSFTPXML with order internal number as findoc
                client
                  .service('CCCSFTPXML')
                  .patch(
                    null,
                    { FINDOC: parseInt(res.id) },
                    { query: { XMLFILENAME: xmlFilename, XMLDATE: xmlDate, TRDR_RETAILER: retailer } }
                  )
                  .then((res) => {
                    //console.log('CCCSFTPXML patch', res)
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
