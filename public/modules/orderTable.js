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
      '<textarea class="textarea is-small is-info" rows="10" cols="50">' + xml.XMLDATA + '</textarea>'
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
}

export async function getValFromXML(xml, node) {
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