console.log('Client.js loaded')

//const socket = io('https://retailers-ac9953f6caca.herokuapp.com')
const socket = io('www.retailers.acct.ro')
const client = feathers()
const socketClient = feathers.socketio(socket)

client.configure(socketClient)

client.use('sftp', socketClient.service('sftp'), {
  methods: ['downloadXml', 'storeXmlInDB', 'uploadXml'],
  events: ['uploadResult']
})

client.use('storeXml', socketClient.service('storeXml'), {
  methods: ['find', 'get', 'create', 'update', 'patch', 'remove']
})

client.use('CCCDOCUMENTES1MAPPINGS', socketClient.service('CCCDOCUMENTES1MAPPINGS'), {
  methods: ['find', 'get', 'create', 'update', 'patch', 'remove']
})

client.use('CCCXMLS1MAPPINGS', socketClient.service('CCCXMLS1MAPPINGS'), {
  methods: ['find', 'get', 'create', 'update', 'patch', 'remove']
})

client.use('CCCRETAILERSCLIENTS', socketClient.service('CCCRETAILERSCLIENTS'), {
  methods: ['find', 'get', 'create', 'update', 'patch', 'remove']
})

client.use('connectToS1', socketClient.service('connectToS1'), {
  methods: ['find', 'get', 'create', 'update', 'patch', 'remove']
})

client.use('setDocument', socketClient.service('setDocument'), {
  methods: ['find', 'get', 'create', 'update', 'patch', 'remove']
})

client.use('getDataset', socketClient.service('getDataset'), {
  methods: ['find', 'get', 'create', 'update', 'patch', 'remove']
})

client.use('getS1ObjData', socketClient.service('getS1ObjData'), {
  methods: ['find', 'get', 'create', 'update', 'patch', 'remove']
})

client.use('getS1SqlData', socketClient.service('getS1SqlData'), {
  methods: ['find', 'get', 'create', 'update', 'patch', 'remove']
})

//getInvoiceDom
client.use('getInvoiceDom', socketClient.service('getInvoiceDom'), {
  methods: ['find', 'get', 'create', 'update', 'patch', 'remove']
})

client.service('sftp').on('uploadResult', (data) => {
  console.log('uploadResult', data)
})

var url = '',
  username = '',
  passphrase = '',
  privateKey = '',
  fingerprint = ''

function getRetailerConfData() {
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

function setRetailerId(trdr, urlLogo) {
  localStorage.setItem('trdr_retailer', trdr)
  localStorage.setItem('logo_retailer', urlLogo)
  console.log('Retailer id set to ', parseInt(localStorage.getItem('trdr_retailer')))
}

function updateRetailerConfData() {
  //URL
  url = document.getElementById('URL').value
  //PORT
  port = document.getElementById('PORT').value
  //USERNAME
  username = document.getElementById('USERNAME').value
  //PASSPHRASE
  passphrase = document.getElementById('PASSPHRASE').value
  //FINGERPRINT
  fingerprint = document.getElementById('FINGERPRINT').value
  //TRDR_RETAILER
  trdr_retailer = document.getElementById('TRDR_RETAILER').value
  //INITIALDIRIN
  initialdirin = document.getElementById('INITIALDIRIN').value
  //INITIALDIROUT
  initialdirout = document.getElementById('INITIALDIROUT').value

  client
    .service('CCCSFTP')
    .update(
      {
        query: {
          TRDR_RETAILER: trdr_retailer
        }
      },
      (data = {
        URL: url,
        PORT: port,
        USERNAME: username,
        PASSPHRASE: passphrase,
        FINGERPRINT: fingerprint,
        INITIALDIRIN: initialdirin,
        INITIALDIROUT: initialdirout
      })
    )
    .then((res) => {
      console.log(res)
    })
}

async function getRetailerXMLData(retailer) {
  return new Promise((resolve, reject) => {
    client
      .service('CCCSFTPXML')
      .find({
        query: {
          TRDR_RETAILER: retailer,
          $limit: 20,
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

function getClientConfData() {
  //CCCRETAILERSCLIENTS
  client
    .service('CCCRETAILERSCLIENTS')
    .find({ query: { TRDR_CLIENT: 1 } })
    .then((res) => {
      //WSURL
      document.getElementById('WSURL').value = res.data[0].WSURL
      //LOGINCOMPANY
      document.getElementById('LOGINCOMPANY').value = res.data[0].COMPANY
      //BRANCH
      document.getElementById('LOGINBRANCH').value = res.data[0].BRANCH
      //LOGINUSER
      document.getElementById('LOGINUSER').value = res.data[0].WSUSER
      //LOGINPASS
      document.getElementById('LOGINPASSWORD').value = res.data[0].WSPASS
    })
}

//config_retailer section
function openTab(evt, tabName) {
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
}

function loadFile(event) {
  var xml = event.target.files[0]
  var reader = new FileReader()
  reader.onload = function (e) {
    var textArea = document.getElementById('xmlTextArea')
    textArea.value = e.target.result
    //loop iterates through the xml file and displays the content in the console
    var parser = new DOMParser()
    var xmlDoc = parser.parseFromString(e.target.result, 'text/xml')
    //get main node from select id "xmlRoot"
    var mainNode = document.getElementById('xmlRoot').value
    var x = xmlDoc.getElementsByTagName(mainNode)
    //loop recursivly through all nodes from main node "Order" and create an object with the values
    var obj = xml2json(x[0])
    console.log('xml2json', obj)

    //get node name for lines; select id "delimitareLinieDocument"
    var linesNode = document.getElementById('delimitareLinieDocument').value
    //cut obj in two parts: header and lines; lines are in an array (obj.OrderLine)
    var header = {}
    var lines = []
    console.log('header', header)
    for (var i in obj) {
      if (i == linesNode && obj[i].length > 0 && typeof obj[i] === 'object') {
        lines = obj[i]
      } else {
        header[i] = obj[i]
      }
    }
    var table = document.getElementById('xmlAsTable')
    //delete innerHTML
    table.innerHTML = ''
    //add thead
    addTableHeader(table)
    var headerArrayOfObjects = []
    var linesArrayOfObjects = []
    recurse(header, [], mainNode, '#FFFAFC', '#0a0a0a', headerArrayOfObjects)
    addRowsToTable(headerArrayOfObjects)
    //recurse first line, no point to recurse through all lines, it's a reference for all lines
    recurse(lines[0], [], mainNode + '/' + linesNode, '#eff5fb', '#0a0a0a', linesArrayOfObjects)
    addRowsToTable(linesArrayOfObjects)
  }

  try {
    reader.readAsText(xml)
  } catch (err) {
    console.log(err)
  }
}

function addTableHeader(table) {
  var thead = table.createTHead()
  var row = thead.insertRow()
  var cell0 = document.createElement('th')
  cell0.innerHTML = 'XML Ord.'
  cell0.className = 'xmlOrder'
  row.appendChild(cell0)
  var cell1 = document.createElement('th')
  row.appendChild(cell1)
  cell1.innerHTML = 'Pick'
  //text orientation up
  //cell1.style.writingMode = 'vertical-rl'
  //cell1.style.textOrientation = 'upright'
  var cell2 = document.createElement('th')
  row.appendChild(cell2)
  cell2.innerHTML = 'Req.'
  //same
  //cell2.style.writingMode = 'vertical-rl'
  //cell2.style.textOrientation = 'upright'
  var cell3 = document.createElement('th')
  row.appendChild(cell3)
  cell3.innerHTML = 'XML Path'
  var cell4 = document.createElement('th')
  row.appendChild(cell4)
  cell4.innerHTML = 'S1 Table 1'
  var cell5 = document.createElement('th')
  row.appendChild(cell5)
  cell5.innerHTML = 'S1 Field 1'
  var cell6 = document.createElement('th')
  row.appendChild(cell6)
  cell6.innerHTML = 'S1 Table 2'
  var cell7 = document.createElement('th')
  row.appendChild(cell7)
  cell7.innerHTML = 'S1 Field 2'
  var cell8 = document.createElement('th')
  row.appendChild(cell8)
  cell8.innerHTML = 'SQL'
  var cell9 = document.createElement('th')
  row.appendChild(cell9)
  cell9.innerHTML = 'Value'
  //add column Observatii
  var cell10 = document.createElement('th')
  row.appendChild(cell10)
  cell10.innerHTML = 'Observatii'
  //make it prety and sticky
  thead.style.backgroundColor = '#e6e6e6'
  thead.style.fontWeight = 'bold'
  thead.style.zIndex = '1'
  //add hideUnselectedRows button on another row
  row = thead.insertRow()
  cell1 = document.createElement('th')
  row.appendChild(cell1)
  cell1.colSpan = 10
  cell1.innerHTML = `<button id="hideUnselectedRows" class="button is-small is-info" onclick="hideUnselectedRows()">Show/Hide unselected rows</button>`
  //add 4 buttons on the same row; on click hide/show cells: 1. S1 Table 2, S1 Field 2, 2. Value, 3. Observatii
  cell1.innerHTML += `<button id="hideS1Table2S1Field2" class="button is-small is-info ml-2" onclick="showHideCell(['S1 Table 2', 'S1 Field 2'], document.getElementById('xmlAsTable'))">Show/Hide Table 2</button>`
  cell1.innerHTML += `<button id="hideValue" class="button is-small is-info ml-2" onclick="showHideCell(['Value'], document.getElementById('xmlAsTable'))">Show/Hide Value</button>`
  cell1.innerHTML += `<button id="hideObservatii" class="button is-small is-info ml-2" onclick="showHideCell(['Observatii'], document.getElementById('xmlAsTable'))">Show/Hide Observatii</button>`
  //hide/show all the above buttons
  cell1.innerHTML += `<button id="hideShowAll" class="button is-small is-info ml-2" onclick="showHideCell(['S1 Table 2', 'S1 Field 2', 'Value', 'Observatii'], document.getElementById('xmlAsTable'))">Hide all</button>`
  //add saveMapping button on the same row
  cell1.innerHTML += `<button class="button is-small is-success ml-2" onclick="saveMapping()">Save mapping</button>`
}

function showHideCell(cellsByName, table) {
  //show hide cells in table
  var rowCount = table.rows.length
  var cells = []
  //look in thead for cells with name in cellsByName and retain index of cells
  var thead = table.tHead
  var row = thead.rows[0]
  for (var i = 0; i < row.cells.length; i++) {
    if (cellsByName.indexOf(row.cells[i].innerHTML) > -1) {
      cells.push(i)
    }
  }

  //search by index in tbody and show/hide cells
  for (var i = 0; i < rowCount; i++) {
    var row = table.rows[i]
    for (var j = 0; j < cells.length; j++) {
      var cell = row.cells[cells[j]]
      try {
        if (cell.style.display == 'none') {
          cell.style.display = ''
        } else {
          cell.style.display = 'none'
        }
      } catch (err) {
        console.log(err)
      }
    }
  }
}

function recurse(obj, parent, root, color, color1, result) {
  //recurse through the object and add rows to result
  for (var i in obj) {
    if (obj[i] !== null && typeof obj[i] === 'object') {
      //detect if it is an array
      if (Array.isArray(obj[i])) {
        //change color for entire array
        recurse(obj[i], parent.concat(i), root, color, '#3850b7', result)
        //recurse first element of array
        recurse(obj[i][0], parent.concat(i), root, color, '#cc0f35', result)
      } else {
        recurse(obj[i], parent.concat(i), root, color, color1, result)
      }
    } else {
      //add row to table xmlAsTable
      result.push({ obj, parent, root, i, color, color1 })
    }
  }
}

function addRowsToTable(arr) {
  var table = document.getElementById('xmlAsTable')
  //if body doesn't exist create it otherwise get it
  var tbody = table.tBodies[0] ? table.tBodies[0] : table.createTBody()
  arr.forEach((item) => {
    var obj = item.obj
    var parent = item.parent
    var root = item.root
    var i = item.i
    var color = item.color
    var color1 = item.color1
    var row = tbody.insertRow()
    //root as class name
    row.className = root
    var xmlOrder = row.insertCell()
    //class
    xmlOrder.className = 'xmlOrder'
    xmlOrder.innerHTML = 0
    var remains = row.insertCell()
    var mandatory = row.insertCell()
    var xmlPath = row.insertCell()
    var s1Tbl1 = row.insertCell()
    var s1Fld1 = row.insertCell()
    var s1Tbl2 = row.insertCell()
    var s1Fld2 = row.insertCell()
    var sql = row.insertCell()
    var value = row.insertCell()
    //add column Observatii
    var cell10 = row.insertCell()
    //BuyerCustomerParty/PostalAddress/AdditionalStreetName
    var xmlJoinBySlash = parent && parent.length > 0 ? parent.join('/') + '/' + i : i
    //Order_BuyerCustomerParty_PostalAddress_AdditionalStreetName
    var xmlJoinByUnderscore =
      parent && parent.length > 0 ? root + '_' + parent.join('_') + '_' + i : root + '_' + i

    //add column with checkbox "Remaining"
    var input1 = document.createElement('input')
    input1.type = 'checkbox'
    input1.name = xmlJoinByUnderscore + '_Remaining'
    input1.className = 'remaining checkbox is-small' //important, used in hideUnselectedRows()
    input1.id = xmlJoinByUnderscore + '_Remaining'
    remains.appendChild(input1)
    remains.onclick = function () {
      //change color for entire row
      var row = this.parentNode
      if (this.childNodes[0].checked) {
        row.style.backgroundColor = '#e6ffe6'
      } else {
        row.style.backgroundColor = 'white'
      }
    }
    //add column with checkbox "Mandatory"
    var input2 = document.createElement('input')
    input2.type = 'checkbox'
    input2.name = xmlJoinByUnderscore + '_Mandatory'
    input2.id = xmlJoinByUnderscore + '_Mandatory'
    input2.className = 'mandatory checkbox is-small'
    mandatory.appendChild(input2)
    //xmlPath
    //if too long word wrap, rember it one word
    xmlPath.style.maxWidth = '300px'
    //wrap
    xmlPath.style.wordWrap = 'break-word'
    xmlPath.innerHTML = root + '/' + xmlJoinBySlash
    xmlPath.className = 'xmlPath'
    //xmlPath.style.paddingLeft = parent.length * 10 + 'px'
    //s1Tbl1
    var input3 = document.createElement('input')
    input3.type = 'text'
    input3.name = xmlJoinByUnderscore + '_S1Table1'
    input3.id = xmlJoinByUnderscore + '_S1Table1'
    input3.className = 'input is-small'
    input3.value = ''
    input3.placeholder = 'S1 table'
    s1Tbl1.appendChild(input3)
    //s1Fld1
    var input4 = document.createElement('input')
    input4.type = 'text'
    input4.name = xmlJoinByUnderscore + '_S1Field1'
    input4.id = xmlJoinByUnderscore + '_S1Field1'
    input4.className = 'input is-small'
    input4.value = ''
    input4.placeholder = 'S1 field'
    s1Fld1.appendChild(input4)
    //s1Tbl2
    var input5 = document.createElement('input')
    input5.type = 'text'
    input5.name = xmlJoinByUnderscore + '_S1Table2'
    input5.id = xmlJoinByUnderscore + '_S1Table2'
    input5.className = 'input is-small'
    input5.value = ''
    input5.placeholder = 'S1 table'
    s1Tbl2.appendChild(input5)
    //s1Fld2
    var input6 = document.createElement('input')
    input6.type = 'text'
    input6.name = xmlJoinByUnderscore + '_S1Field2'
    input6.id = xmlJoinByUnderscore + '_S1Field2'
    input6.className = 'input is-small'
    input6.value = ''
    input6.placeholder = 'S1 field'
    s1Fld2.appendChild(input6)
    //Value
    value.innerHTML = obj[i]
    //add sql textarea field
    var input7 = document.createElement('textarea')
    //1 row
    input7.rows = 1
    input7.id = xmlJoinByUnderscore + '_Sql'
    input7.className = 'textarea is-small'
    input7.rows = 1
    input7.value = ''
    input7.placeholder = 'SQL'
    input7.spellcheck = false
    input7.style.width = '300px'
    sql.appendChild(input7)
    //add column Observatii
    var input8 = document.createElement('textarea')
    input8.rows = 1
    input8.id = xmlJoinByUnderscore + '_Observatii'
    input8.className = 'textarea is-small'
    input8.rows = 1
    input8.value = ''
    input8.placeholder = 'Observatii'
    input8.spellcheck = false
    input8.style.width = '300px'
    cell10.appendChild(input8)
    //add onclick event to row
    row.onclick = function () {
      var table = document.getElementById('xmlAsTable')
      var rowCount = table.rows.length
      for (var i = 1; i < rowCount; i++) {
        table.rows[i].className = ''
      }
      this.className = 'is-selected'
    }
    row.style.backgroundColor = color
    row.style.color = color1
  })
}

function xml2json(node) {
  var result = {}
  if (node.hasAttributes()) {
    result['__attributes'] = {}
    var attrs = node.attributes
    for (var i = 0; i < attrs.length; i++) {
      result['__attributes'][attrs[i].nodeName] = attrs[i].nodeValue
    }
  }
  if (node.hasChildNodes()) {
    var children = node.childNodes
    for (var i = 0; i < children.length; i++) {
      var child = children[i]
      if (child.nodeType == 1) {
        if (child.childNodes.length == 1 && child.firstChild.nodeType == 3) {
          // text value
          //result[child.nodeName] = child.firstChild.nodeValue
          var objAttrs = {}
          if (child.hasAttributes()) {
            var attrs = child.attributes
            for (var j = 0; j < attrs.length; j++) {
              objAttrs['__' + attrs[j].nodeName] = attrs[j].nodeValue
            }
            objAttrs[child.nodeName] = child.firstChild.nodeValue
            //console.log('objAttrs', objAttrs)
            //result[child.nodeName] = objAttrs
            result[child.nodeName] = xml2json(child)
            //add child.firstChild.nodeValue as a property to result[child.nodeName]
            result[child.nodeName]['__value'] = child.firstChild.nodeValue
          } else {
            result[child.nodeName] = child.firstChild.nodeValue
            //console.log(child.nodeName, result[child.nodeName])
          }
        } else {
          // sub-object
          if (typeof result[child.nodeName] == 'undefined') {
            result[child.nodeName] = xml2json(child)
          } else {
            //array
            if (typeof result[child.nodeName].push == 'undefined') {
              var old = result[child.nodeName]
              result[child.nodeName] = []
              result[child.nodeName].push(old)
              console.log('old', old)
            }
            result[child.nodeName].push(xml2json(child))
            console.log('array', child.nodeName)
          }
        }
      }
    }
  }
  return result
}

function addRow() {
  var table = document.getElementById('documente')
  var row = table.insertRow()
  var cell1 = row.insertCell()
  var cell2 = row.insertCell()
  var cell3 = row.insertCell()
  var cell4 = row.insertCell()
  cell1.innerHTML = `<input id = "FPRMS${table.rows.length}" class="input" type="text" placeholder="FPRMS" />`
  cell2.innerHTML = `<input id = "SERIES${table.rows.length}" class="input" type="text" placeholder="SERIES" />`
  cell3.innerHTML = `<input id = "INITIALDIRIN${table.rows.length}" class="input" type="text" placeholder="INITIALDIRIN" />`
  cell4.innerHTML = `<input id = "INITIALDIROUT${table.rows.length}" class="input" type="text" placeholder="INITIALDIROUT" />`
  var cell5 = row.insertCell()
  cell5.className = 'CCCDOCUMENTES1MAPPINGS'
  cell5.innerHTML = table.rows.length
  //hide it
  cell5.style.display = 'none'
  //add actions column
  var cell6 = row.insertCell()
  cell6.innerHTML += `<button class="button is-small is-danger m-2" onclick="deleteRow()">Delete</button>`
  cell6.innerHTML += `<button class="button is-small is-info m-2" onclick="loadMapping()">Load</button>`
  //add class is-selected to current row
  row.className = 'is-selected'
  //add onclick event to row
  row.onclick = function () {
    var table = document.getElementById('documente')
    var rowCount = table.rows.length
    for (var i = 1; i < rowCount; i++) {
      table.rows[i].className = ''
    }
    this.className = 'is-selected'
  }
}

function deleteRow() {
  var table = document.getElementById('documente')
  var rowCount = table.rows.length
  table.deleteRow(rowCount - 1)
}

function hideUnselectedRows() {
  //if caption is "Hide unselected rows" change it to "Show all rows" and viceversa
  var caption = document.getElementById('hideUnselectedRows').innerHTML
  if (caption == 'Hide unselected rows') {
    document.getElementById('hideUnselectedRows').innerHTML = 'Show all rows'
  } else {
    document.getElementById('hideUnselectedRows').innerHTML = 'Hide unselected rows'
  }
  var table = document.getElementById('xmlAsTable')
  var tbody = table.tBodies[0]
  var rowCount = tbody.rows.length
  if (caption == 'Show all rows') {
    for (var i = 1; i < rowCount; i++) {
      var row = tbody.rows[i]
      row.style.display = ''
    }
    return
  } else {
    for (var i = 1; i < rowCount; i++) {
      var row = tbody.rows[i]
      var input = row.cells[0].childNodes[0]
      if (input.checked) {
        row.style.display = ''
      } else {
        row.style.display = 'none'
      }
    }
  }
}

function saveMapping() {
  //SET CAPTION TO "SHOW ALL ROWS"
  document.getElementById('hideUnselectedRows').innerHTML = 'Show all rows'
  hideUnselectedRows()
  if (!validateMappings()) {
    return
  }
  //get current row from table documente and add class is-selected
  var currentDoc = getDocument()
  //verify if currentDoc already exists in database table CCCDOCUMENTES1MAPPINGS
  client
    .service('CCCDOCUMENTES1MAPPINGS')
    .find({
      query: {
        FPRMS: currentDoc.FPRMS,
        SERIES: currentDoc.SERIES
      }
    })
    .then((res) => {
      console.log(res)
      if (res.data.length > 0) {
        //ask user if he wants to overwrite the existing mapping
        var answer = confirm('Mapping already exists. Do you want to overwrite it?')
        if (answer) {
          //check if it has children in table CCCXMLS1MAPPINGS
          client
            .service('CCCXMLS1MAPPINGS')
            .find({
              query: {
                CCCDOCUMENTES1MAPPINGS: res.data[0].CCCDOCUMENTES1MAPPINGS
              }
            })
            .then(async (res) => {
              console.log('for delete', res)
              try {
                await deleteMapping(res.data[0].CCCDOCUMENTES1MAPPINGS)
              } catch (err) {
                console.log(err)
              }
              insertNewMapping(currentDoc)
            })
        } else {
          return
        }
      } else {
        insertNewMapping(currentDoc)
      }
    })
}

function insertNewMapping(currentDoc) {
  //insert currentDoc in database table CCCDOCUMENTES1MAPPINGS
  client
    .service('CCCDOCUMENTES1MAPPINGS')
    .create(currentDoc)
    .then((res) => {
      console.log(res)
      var mappings = getSelectedMappingData()
      var cccdocumentes1Mappings = res.CCCDOCUMENTES1MAPPINGS
      mappings.forEach((item) => {
        item['CCCDOCUMENTES1MAPPINGS'] = cccdocumentes1Mappings
      })
      console.log('mappings', mappings)
      for (var i = 0; i < mappings.length; i++) {
        client
          .service('CCCXMLS1MAPPINGS')
          .create(mappings[i])
          .then((res) => {
            //console.log('response', res)
          })
      }
    })
}

function getDocument() {
  var table = document.getElementById('documente')
  var rowCount = table.rows.length
  var row = table.rows[rowCount - 1]
  row.className = 'is-selected'
  //find cell in row with class CCCDOCUMENTES1MAPPINGS
  var cell = row.getElementsByClassName('CCCDOCUMENTES1MAPPINGS')[0]
  var CCCDOCUMENTES1MAPPINGS = cell.innerHTML
  console.log('CCCDOCUMENTES1MAPPINGS', CCCDOCUMENTES1MAPPINGS)
  //save row data in an object
  var currentDoc = {}
  currentDoc['SOSOURCE'] = 1351
  currentDoc['FPRMS'] = parseInt(document.getElementById('FPRMS' + CCCDOCUMENTES1MAPPINGS.toString()).value)
  currentDoc['SERIES'] = parseInt(document.getElementById('SERIES' + CCCDOCUMENTES1MAPPINGS.toString()).value)
  currentDoc['INITIALDIRIN'] = document.getElementById(
    'INITIALDIRIN' + CCCDOCUMENTES1MAPPINGS.toString()
  ).value
  currentDoc['INITIALDIROUT'] = document.getElementById(
    'INITIALDIROUT' + CCCDOCUMENTES1MAPPINGS.toString()
  ).value
  currentDoc['TRDR_RETAILER'] = parseInt(document.getElementById('TRDR_RETAILER').value)
  currentDoc['TRDR_CLIENT'] = 1
  console.log(currentDoc)
  return currentDoc
}

function getSelectedMappingData() {
  if (!validateMappings()) {
    return
  }
  var table = document.getElementById('xmlAsTable')
  var rowCount = table.rows.length
  var mapping = []
  for (var i = 1; i < rowCount; i++) {
    var row = table.rows[i]
    var input = row.cells[1].childNodes[0]
    if (input.checked) {
      var obj = {}
      /* obj['XMLNODE'] =
        row.className.toLowerCase().indexOf('line') > -1
          ? row.className + '/' + row.cells[2].innerHTML
          : row.cells[2].innerHTML */
      obj['XMLNODE'] = row.cells[3].innerHTML
      //cells 3, 4, 5, 6 have an input type text field inside, get the value from input instead of innerHTML
      obj['S1TABLE1'] = document.getElementById(row.cells[4].childNodes[0].id).value
      obj['S1FIELD1'] = document.getElementById(row.cells[5].childNodes[0].id).value
      if (document.getElementById(row.cells[6].childNodes[0].id).value)
        obj['S1TABLE2'] = document.getElementById(row.cells[6].childNodes[0].id).value
      if (document.getElementById(row.cells[7].childNodes[0].id).value)
        obj['S1FIELD2'] = document.getElementById(row.cells[7].childNodes[0].id).value
      obj['MANDATORY'] = row.cells[2].childNodes[0].checked ? 1 : 0
      //sql
      obj['SQL'] = document.getElementById(row.cells[8].childNodes[0].id).value
      //Observatii
      obj['OBSERVATII'] = document.getElementById(row.cells[10].childNodes[0].id).value
      //add XMLORDER
      obj['XMLORDER'] = parseFloat(row.cells[0].innerHTML)
      mapping.push(obj)
    }
  }
  return mapping
}

function validateMappings() {
  /* var docTable = document.getElementById('documenteBody')
  //get selected row from table documente
  //find cell with input starting with initialdirin
  var cell = docTable.rows[docTable.rows.length - 1].querySelector('input[id^="INITIALDIRIN"]')
  var hasInitialDirIn = cell.value ? true : false
  console.log('hasInitialDirIn', hasInitialDirIn)
  var table = document.getElementById('xmlAsTable')
  //get tbody
  var tbody = table.tBodies[0]
  var rowCount = tbody.rows.length
  var countSelectedRows = 0
  for (var i = 1; i < rowCount; i++) {
    var row = tbody.rows[i]
    var input = row.cells[0].childNodes[0]
    if (input.checked) {
      countSelectedRows++
      if (hasInitialDirIn && !document.getElementById(row.cells[3].childNodes[0].id).value) {
        alert('Please fill in first S1 table field')
        return false
      }
      if (hasInitialDirIn && !document.getElementById(row.cells[4].childNodes[0].id).value) {
        alert('Please fill in first S1 field field')
        return false
      }
    }
  }
  if (countSelectedRows == 0) {
    alert('Please select at least one row')
    return false
  } */
  return true
}

function loadListaDocumente() {
  //get all documents from database table CCCDOCUMENTES1MAPPINGS
  var localStorageRetailer
  try {
    localStorageRetailer = parseInt(localStorage.getItem('trdr_retailer'))
  } catch (err) {
    console.log(err)
    return
  }
  client
    .service('CCCDOCUMENTES1MAPPINGS')
    .find({
      query: {
        TRDR_RETAILER: localStorageRetailer
      }
    })
    .then((res) => {
      console.log(res)
      var table = document.getElementById('documenteBody')
      res.data.forEach((item) => {
        var row = table.insertRow()
        var cell1 = row.insertCell()
        var cell2 = row.insertCell()
        var cell3 = row.insertCell()
        var cell4 = row.insertCell()
        var cell5 = row.insertCell()
        var cell6 = row.insertCell()
        cell1.innerHTML = `<input id = "FPRMS${item.CCCDOCUMENTES1MAPPINGS}" class="input" type="text" placeholder="FPRMS" value="${item.FPRMS}" />`
        cell2.innerHTML = `<input id = "SERIES${item.CCCDOCUMENTES1MAPPINGS}" class="input" type="text" placeholder="SERIES" value="${item.SERIES}" />`
        cell3.innerHTML = `<input id = "INITIALDIRIN${item.CCCDOCUMENTES1MAPPINGS}" class="input" type="text" placeholder="INITIALDIRIN" value="${item.INITIALDIRIN}" />`
        cell4.innerHTML = `<input id = "INITIALDIROUT${item.CCCDOCUMENTES1MAPPINGS}" class="input" type="text" placeholder="INITIALDIROUT" value="${item.INITIALDIROUT}" />`
        cell5.innerHTML = `<button class="button is-danger is-small" onclick="deleteMapping(${item.CCCDOCUMENTES1MAPPINGS})">Delete</button>`
        //button for loading xml mappings for current document
        cell5.innerHTML += `<button class="button is-info is-small ml-2" onclick="loadMapping(${item.CCCDOCUMENTES1MAPPINGS})">Load</button>`
        //add button for loading from another document from table documente
        cell5.innerHTML += `<button class="button is-info is-small ml-2" onclick="copyFromAnotherDocument(${item.CCCDOCUMENTES1MAPPINGS})">Clone</button>`
        //cell6 hidden CCCDOCUMENTES1MAPPINGS, no input
        cell6.innerHTML = item.CCCDOCUMENTES1MAPPINGS
        //hide cell6
        cell6.style.display = 'none'
        //name cell6
        cell6.className = 'CCCDOCUMENTES1MAPPINGS'
      })
    })
}

async function deleteMapping(id) {
  //ask user if he wants to delete the mapping
  var answer = confirm('Are you sure you want to delete this mapping?')
  if (!answer) {
    return
  }
  //delete from table CCCXMLS1MAPPINGS then CCCDOCUMENTES1MAPPINGS; wait for each transaction to complete
  await client
    .service('CCCXMLS1MAPPINGS')
    .remove(null, { query: { CCCDOCUMENTES1MAPPINGS: id } })
    .then((res) => {
      console.log(res)
    })

  await client
    .service('CCCDOCUMENTES1MAPPINGS')
    .remove(id)
    .then((res) => {
      console.log(res)
    })
}

function loadMapping(id) {
  //add mappings from db into xmlAsTable table id
  //get all mappings from table CCCXMLS1MAPPINGS
  client
    .service('CCCXMLS1MAPPINGS')
    .find({
      query: {
        CCCDOCUMENTES1MAPPINGS: id,
        $sort: {
          XMLORDER: 1
        }
      }
    })
    .then((res) => {
      console.log(res)
      //get all rows from xmlAsTable
      var table = document.getElementById('xmlAsTable')
      //if xmlAsTable has rows, delete the ones with the same item.XMLNODE in the third column
      res.data.forEach((item) => {
        var rowCount = table.rows.length
        for (var i = 1; i < rowCount; i++) {
          var row = table.rows[i]
          if (row.cells.length && row.cells.length > 5 && row.cells[2].innerHTML == item.XMLNODE) {
            table.deleteRow(i)
            break
          }
        }
      })
      //add rows from db and create xml dom
      //Order is the main node
      //id res length is 0, return
      if (res.data.length == 0) {
        //no data message
        var row = table.insertRow()
        var cell = row.insertCell()
        cell.innerHTML = 'No data'
        cell.colSpan = 9
        cell.style.textAlign = 'center'
        return
      } else {
        //thead if doesn't exist
        if (!table.tHead) {
          addTableHeader(table)
        }
      }
      //create tbody
      addTableBody(table, res.data)
      //add xml dom to xmlTextArea
      addXmlDomToTextArea(res.data)
    })
}

function addTableBody(table, data) {
  //if body doesn't exist create it otherwise get it
  var tbody = table.tBodies[0] ? table.tBodies[0] : table.createTBody()
  data.forEach((item) => {
    //add rows
    var row = tbody.insertRow()
    //add cells
    //xml order
    var xmlOrder = row.insertCell()
    xmlOrder.innerHTML = item.XMLORDER
    xmlOrder.className = 'xmlOrder'
    var pick = row.insertCell()
    var req = row.insertCell()
    var xmlPath = row.insertCell()
    var s1Tbl1 = row.insertCell()
    var s1Fld1 = row.insertCell()
    var s1Tbl2 = row.insertCell()
    var s1Fld2 = row.insertCell()
    var sql = row.insertCell()
    var value = row.insertCell()
    var observatii = row.insertCell()
    //add checkbox for pick
    var input1 = document.createElement('input')
    input1.type = 'checkbox'
    input1.name = item.XMLNODE + '_Remaining'
    input1.className = 'remaining checkbox is-small' //important, used in hideUnselectedRows()
    input1.id = item.XMLNODE + '_Remaining'
    input1.checked = true
    pick.appendChild(input1)
    pick.onclick = function () {
      //change color for entire row
      var row = this.parentNode
      if (this.childNodes[0].checked) {
        row.style.backgroundColor = '#e6ffe6'
      } else {
        row.style.backgroundColor = 'white'
      }
    }
    //add checkbox for req
    var input2 = document.createElement('input')
    input2.type = 'checkbox'
    input2.name = item.XMLNODE + '_Mandatory'
    input2.id = item.XMLNODE + '_Mandatory'
    input2.className = 'mandatory checkbox is-small'
    input2.checked = item.MANDATORY == 1 ? true : false
    req.appendChild(input2)
    //xmlPath
    //if too long word wrap, rember it one word
    xmlPath.style.maxWidth = '300px'
    //wrap
    xmlPath.style.wordWrap = 'break-word'
    xmlPath.innerHTML = item.XMLNODE
    xmlPath.className = 'xmlPath'
    //s1Tbl1
    var input3 = document.createElement('input')
    input3.type = 'text'
    input3.name = item.XMLNODE + '_S1Table1'
    input3.id = item.XMLNODE + '_S1Table1'
    input3.className = 'input is-small'
    input3.value = item.S1TABLE1
    input3.placeholder = 'S1 table'
    s1Tbl1.appendChild(input3)
    //s1Fld1
    var input4 = document.createElement('input')
    input4.type = 'text'
    input4.name = item.XMLNODE + '_S1Field1'
    input4.id = item.XMLNODE + '_S1Field1'
    input4.className = 'input is-small'
    input4.value = item.S1FIELD1
    input4.placeholder = 'S1 field'
    s1Fld1.appendChild(input4)
    //s1Tbl2
    var input5 = document.createElement('input')
    input5.type = 'text'
    input5.name = item.XMLNODE + '_S1Table2'
    input5.id = item.XMLNODE + '_S1Table2'
    input5.className = 'input is-small'
    input5.value = item.S1TABLE2
    input5.placeholder = 'S1 table'
    s1Tbl2.appendChild(input5)
    //s1Fld2
    var input6 = document.createElement('input')
    input6.type = 'text'
    input6.name = item.XMLNODE + '_S1Field2'
    input6.id = item.XMLNODE + '_S1Field2'
    input6.className = 'input is-small'
    input6.value = item.S1FIELD2
    input6.placeholder = 'S1 field'
    s1Fld2.appendChild(input6)
    //Value
    value.innerHTML = ''
    //add sql textarea field
    var input7 = document.createElement('textarea')
    //1 row
    input7.rows = 1
    input7.id = item.XMLNODE + '_Sql'
    input7.className = 'textarea is-small'
    input7.value = item.SQL
    input7.placeholder = 'SQL'
    input7.spellcheck = false
    input7.style.width = '300px'
    sql.appendChild(input7)

    //add observatii textarea field
    var input8 = document.createElement('textarea')
    //1 row
    input8.rows = 1
    input8.id = item.XMLNODE + '_Observatii'
    input8.className = 'textarea is-small'
    input8.value = item.OBSERVATII
    input8.placeholder = 'Observatii'
    input8.spellcheck = false
    input8.style.width = '300px'
    observatii.appendChild(input8)
    //color row so it can be easily identified
    row.style.backgroundColor = 'whitesmoke'
  })
}

function addXmlDomToTextArea(data) {
  //create xml dom
  var xmlDom = document.implementation.createDocument('', '', null)
  var root = xmlDom.createElement(document.getElementById('xmlRoot').value)
  xmlDom.appendChild(root)
  data.forEach((item) => {
    var xmlNodes = item.XMLNODE.split('/')
    //add xml elements to xml dom
    var root = xmlDom.documentElement //Order or...
    for (var i = 0; i < xmlNodes.length; i++) {
      var node
      //verify if node already exists
      if (root.getElementsByTagName(xmlNodes[i]).length > 0) {
        node = root.getElementsByTagName(xmlNodes[i])[0]
        root.appendChild(node)
        root = node
      } else {
        try {
          node = xmlDom.createElement(xmlNodes[i])
          root.appendChild(node)
          root = node
        } catch (err) {
          console.log(err)
        }
      }
    }
  })
  //add xml dom to xmlTextArea
  var xmlTextArea = document.getElementById('xmlTextArea')
  xmlTextArea.value = xmlDom.documentElement.outerHTML
}

loadListaDocumente()

function searchTable(tableId, searchBoxId) {
  // Declare variables
  var input, filter, table, tr, td, i, txtValue
  input = document.getElementById(searchBoxId)
  filter = input.value.toUpperCase()
  table = document.getElementById(tableId)
  //search third column
  tr = table.getElementsByTagName('tr')
  // Loop through all table rows, and hide those who don't match the search query
  for (i = 0; i < tr.length; i++) {
    td = tr[i].getElementsByTagName('td')[2]
    if (td) {
      txtValue = td.textContent || td.innerText
      if (txtValue.toUpperCase().indexOf(filter) > -1) {
        tr[i].style.display = ''
      } else {
        tr[i].style.display = 'none'
      }
    }
  }
}

async function sendOrder(xml, xmlFilename, xmlDate, retailer) {
  await createOrderJSONRefactored(xml, 1351, 701, 7012, xmlFilename, xmlDate, retailer)
}

async function createOrderJSONRefactored(xml, sosource, fprms, series, xmlFilename, xmlDate, retailer) {
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
  var errors = []
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
            //log some context
            console.log('item', item)
            console.log('key', key)
            console.log('item[key]', item[key])
            console.log('item[key].SQL', item[key].SQL)
            console.log('item[key].value', item[key].value)
            //1. xml > dom
            var parser = new DOMParser()
            var xmlDoc = parser.parseFromString(xml, 'text/xml')
            /*2.1. example
            <Item><Description>Litter without roof Stefanplast Sprint Corner Plus, Blue, 40x56x h 14</Description><BuyersItemIdentification>8003507968158</BuyersItemIdentification><SellersItemIdentification>MF.06759</SellersItemIdentification><StandardItemIdentification>8003507968158</StandardItemIdentification><AdditionalItemIdentification>DeliveryDate:2023-10-03</AdditionalItemIdentification><AdditionalItemIdentification>LineStatus:valid</AdditionalItemIdentification><AdditionalItemIdentification>ClientConfirmationStatus:confirmed</AdditionalItemIdentification></Item>
            */
            //2.2. xpath: find node with item[key].value and coresponing sibling "Description"
            var xpath = `//*[contains(text(), '${item[key].value}')]`
            var nodes = xmlDoc.evaluate(xpath, xmlDoc, null, XPathResult.ANY_TYPE, null)
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
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    alert(errors.join('\n\n'))
    return
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
                    displayXmlDataForRetailer(retailer)
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
  //4. displayXmlDataForRetailer(localStorage.getItem('trdr_retailer'))"
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

  //4. displayXmlDataForRetailer(localStorage.getItem('trdr_retailer'))"
  await displayXmlDataForRetailer(retailer)
  //5. change document.getElementById('preluareComenziBtn') text according to stage of process
  document.getElementById('preluareComenziBtn').innerHTML = 'Preluare comenzi'
}

async function displayXmlDataForRetailer(retailer) {
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
      var humanDate = new Date(xml.XMLDATE).toLocaleString()
      row.insertCell().innerHTML = humanDate
      //row.insertCell().innerHTML = xml.XMLFILENAME ? xml.XMLFILENAME : ''
      var filenameCell = row.insertCell()
      filenameCell.innerHTML = xml.XMLFILENAME ? xml.XMLFILENAME : ''
      row.insertCell().innerHTML =
        '<textarea class="textarea is-small is-info" rows="10" cols="50">' + xml.XMLDATA + '</textarea>'
      //spellcheck="false"
      row.cells[2].spellcheck = false
      //row.insertCell().innerHTML = xml.JSONDATA
      //parse xml to dom and find first <PartyName> node
      var parser = new DOMParser()
      var xmlDoc = parser.parseFromString(xml.XMLDATA, 'text/xml')
      var partyName = xmlDoc.getElementsByTagName('PartyName')[0]
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
          await sendOrder(xml.XMLDATA, xml.XMLFILENAME, xml.XMLDATE, retailer)
          sendOrderButton.innerHTML = 'Order sent'
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

function copyFromAnotherDocument(id) {
  alert('to be implemented')
}

async function fetchDocsFromS1WS(sosource, fprms, series) {
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
      displayDocsForRetailers(result, trdr, sosource, fprms, series)
    })
}

function displayDocsForRetailers(result, trdr, sosource, fprms, series) {
  /*
      response like {
  "success": true,
  "totalcount": 1,
  "rows": [
    {
      "findoc": "1236204"
      "trndate": "2023-09-20 00:00:00",
      "fincode": "FAEX-PF-16625",
      "sumamnt": "1888.45"
    }
    ]
  }
      */
  const tbody = document.getElementById('facturiTableBody')
  tbody.innerHTML = ''
  if (result.success == false) {
    var tr = tbody.insertRow()
    var td = tr.insertCell()
    td.innerHTML = 'Error: ' + result.error
    td.colSpan = 3
    td.style.textAlign = 'center'
    return
  }

  if (result.totalcount == 0) {
    var tr = tbody.insertRow()
    var td = tr.insertCell()
    td.innerHTML = 'No data'
    td.colSpan = 6
    td.style.textAlign = 'center'
    td.style.color = 'red'
    td.style.fontWeight = 'bold'
    td.style.fontSize = '20px'
    return
  }

  result.rows.forEach((row) => {
    var tr = tbody.insertRow()
    var findoc = tr.insertCell()
    findoc.innerHTML = row.findoc
    //hide findoc
    findoc.style.display = 'none'
    var trndate = tr.insertCell()
    trndate.innerHTML = row.trndate
    var fincode = tr.insertCell()
    //add fincode.innerHTML = row.fincode and a empty text input 
    fincode.innerHTML = '<span>'+row.fincode+'</span>'
    var input = document.createElement('input')
    input.type = 'text'
    input.name = row.findoc
    input.id = row.findoc
    input.className = 'input is-small is-inline-block'
    input.placeholder = 'Postfix'
    fincode.appendChild(input)
    var sumamnt = tr.insertCell()
    sumamnt.innerHTML = row.sumamnt
    //create actions cell
    var actions = tr.insertCell()

    //create xml button
    var button2 = document.createElement('button')
    button2.className = 'button is-small is-info ml-2'
    button2.innerHTML = 'Create XML'
    button2.onclick = async function () {
      /* var domObj = await createXML(row.findoc, trdr, sosource, fprms, series)
      //wait for domObj
      while (domObj == undefined) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
      console.log('domObj', domObj)
      //var domObj = await cheatGetXmlFromS1(row.findoc)
      if (domObj.trimis == true) {
        alert('Factura a fost deja trimisa')
        return
      }*/
      const domObj = await cheatGetXmlFromS1(row.findoc)
      /*
      if (domObj.trimis == false) { */
      //add cell and textarea
      var textarea = document.createElement('textarea')
      textarea.className = 'textarea is-small'
      textarea.rows = 10
      textarea.cols = 50
      textarea.innerHTML = domObj.dom
      //no spellcheck
      textarea.spellcheck = false
      //add cell
      var td = tr.insertCell()
      td.appendChild(textarea)
      //}
    }
    actions.appendChild(button2)
    //save xml button
    var button3 = document.createElement('button')
    button3.className = 'button is-small is-primary ml-2'
    button3.innerHTML = 'Save XML'
    button3.onclick = async function () {
      //const xml = await createXML(row.findoc, trdr, sosource, fprms, series)
      const domObj = await cheatGetXmlFromS1(row.findoc)
      if (domObj.trimis == true) {
        alert('Factura a fost deja trimisa')
        return
      } else {
        const xml = domObj.dom
        //save the xml to file
        var xmlBlob = new Blob([xml], { type: 'text/xml' })
        var xmlURL = window.URL.createObjectURL(xmlBlob)
        var tempLink = document.createElement('a')
        tempLink.href = xmlURL
        tempLink.setAttribute('download', row.findoc + '.xml')
        tempLink.click()
      }
    }
    actions.appendChild(button3)
    var button = document.createElement('button')
    button.className = 'button is-small is-success ml-2'
    button.innerHTML = 'Send Invoice'
    button.onclick = async function () {
      var domObj = await cheatGetXmlFromS1(row.findoc)
      if (domObj.trimis == true) {
        alert('Factura a fost deja trimisa')
        return
      }
      //update btn caption to sending
      //font awesome spinner
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>Sending...'
      await sendInvoice(row.findoc).then(async (response) => {
        //update btn caption to sent
        button.innerHTML = 'Sent'
        console.log('response', response)
        var xml = response.xml
        var success = response.success
        if (success == true) {
          //add cell and textarea
          var textarea = document.createElement('textarea')
          textarea.className = 'textarea is-small'
          textarea.rows = 10
          textarea.cols = 50
          textarea.innerHTML = xml
          //no spellcheck
          textarea.spellcheck = false
          //add cell
          var td = tr.insertCell()
          td.appendChild(textarea)
        }
        var body = {}
        body['service'] = 'setData'
        body['clientID'] = await client
          .service('connectToS1')
          .find()
          .then((result) => {
            return result.token
          })
        body['appId'] = '1001'
        body['OBJECT'] = 'SALDOC'
        body['FORM'] = 'EFIntegrareRetailers'
        body['KEY'] = row.findoc
        body['DATA'] = {}
        body['DATA']['MTRDOC'] = [{ CCCXMLSendDate: new Date().toISOString().slice(0, 19).replace('T', ' ') }]
        console.log('body', body)
        await client
          .service('setDocument')
          .create(body)
          .then((res) => {
            console.log(res)
          })
          .catch((err) => {
            console.log(err)
          })
      })
      //update btn caption to sent
      button.innerHTML = 'Sent Invoice'
      //find cell class="trimis" in current row and add date now and green check
      var trimis = tr.getElementsByClassName('trimis')[0]
      trimis.innerHTML =
        '<i class="fas fa-xl fa-check-circle has-text-success"></i>  ' +
        new Date().toISOString().slice(0, 19).replace('T', ' ')
    }
    actions.appendChild(button)
    //add cell trimis
    var trimis = tr.insertCell()
    //add class for trimis
    trimis.className = 'trimis'
    //trimis.innerHTML = row.CCCXMLSendDate
    if (row.CCCXMLSendDate) {
      trimis.innerHTML = '<i class="fas fa-xl fa-check-circle has-text-success"></i>  ' + row.CCCXMLSendDate
    } else {
      trimis.innerHTML = '<i class="fas fa-xl fa-times-circle has-text-danger"></i>'
    }
  })
}

async function sendInvoice(findoc) {
  var response = { success: false, xml: '' }
  const domObj = await cheatGetXmlFromS1(findoc)
  var localStorageRetailer
  try {
    localStorageRetailer = parseInt(localStorage.getItem('trdr_retailer'))
  } catch (err) {
    alert('Please select a retailer')
    return
  }

  console.log('localStorageRetailer', localStorageRetailer)

  if (domObj.trimis == false) {
    //uploadXml service
    var xml = domObj.dom
    var filename = domObj.filename
    await client
      .service('sftp')
      .uploadXml(
        { findoc: findoc, xml: xml, filename: filename },
        { query: { retailer: localStorageRetailer } }
      )
      .then((res) => {
        console.log('sftp uploadXml', res)
        if (res && Object.keys(res).length > 0 && Object.hasOwnProperty.call(res, 'success')) {
          if (res.success == true) {
            alert('Factura fost trimisa cu succes sub denumirea ' + res.filename + ' (' + res.findoc + ')')
            response = { success: true, xml: xml }
          } else {
            alert('Eroare la trimiterea facturii')
            response = { success: false, xml: xml }
          }
        } else {
          alert('No response from server')
          response = { success: false, xml: xml }
        }
      })
  } else {
    alert('Factura a fost deja trimisa')
    response = { success: false, xml: xml }
  }
  return response
}

async function createLOCATEINFO(trdr, sosource, fprms, series) {
  //scenariul 2
  //get distinct S1TABLE1, for grouping data
  //get xml mappings for trdr, sosource, fprms, series from cccdocumentes1mappings
  //get CCCDOCUMENTES1MAPPINGS for trdr_retailer, source, fprms, series
  var res = await client
    .service('CCCDOCUMENTES1MAPPINGS')
    .find({ query: { TRDR_RETAILER: trdr, SOSOURCE: sosource, FPRMS: fprms, SERIES: series } })
  var CCCDOCUMENTES1MAPPINGS = res.data[0].CCCDOCUMENTES1MAPPINGS
  //get CCCXMLS1MAPPINGS for CCCDOCUMENTES1MAPPINGS
  var res = await client
    .service('CCCXMLS1MAPPINGS')
    .find({ query: { CCCDOCUMENTES1MAPPINGS: CCCDOCUMENTES1MAPPINGS } })
  console.log('CCCXMLS1MAPPINGS', res)
  var CCCXMLS1MAPPINGS = res.data
  var distinctS1TABLE1 = []
  CCCXMLS1MAPPINGS.forEach((item) => {
    if (item.S1TABLE1 && distinctS1TABLE1.indexOf(item.S1TABLE1) == -1) {
      distinctS1TABLE1.push(item.S1TABLE1)
    }
  })

  var distinctS1TABLE2 = []
  CCCXMLS1MAPPINGS.forEach((item) => {
    if (item.S1TABLE2 && distinctS1TABLE2.indexOf(item.S1TABLE2) == -1) {
      distinctS1TABLE2.push(item.S1TABLE2)
    }
  })

  //create LOCATEINFO
  var LOCATEINFO = ''
  distinctS1TABLE1.forEach((item) => {
    var S1TABLE1 = item
    var S1FIELD1 = ''
    CCCXMLS1MAPPINGS.forEach((item) => {
      if (item.S1TABLE1 && item.S1FIELD1 && item.S1TABLE1 == S1TABLE1) {
        //if item.S1FIELD1 is not already in S1FIELD1
        const split = S1FIELD1.split(',')
        var wordExists = false
        split.every((item2) => {
          if (item2 == item.S1FIELD1) {
            wordExists = true
            return false
          }
          return true
        })
        if (!wordExists) {
          S1FIELD1 += item.S1FIELD1 + ','
        }
      }
    })

    S1FIELD1 = S1FIELD1.slice(0, -1)
    LOCATEINFO += S1TABLE1 + ':' + S1FIELD1 + ';'
  })

  distinctS1TABLE2.forEach((item) => {
    var S1TABLE2 = item
    var S1FIELD2 = ''
    CCCXMLS1MAPPINGS.forEach((item) => {
      if (item.S1TABLE2 && item.S1FIELD2 && item.S1TABLE2 == S1TABLE2) {
        //if item.S1FIELD2 is not already in S1FIELD2
        const split = S1FIELD2.split(',')
        var wordExists = false
        split.every((item2) => {
          if (item2 == item.S1FIELD2) {
            wordExists = true
            return false
          }
          return true
        })
        if (!wordExists) {
          S1FIELD2 += item.S1FIELD2 + ','
        }
      }
    })

    S1FIELD2 = S1FIELD2.slice(0, -1)
    //check if locateinfo contains S1TABLE2 already
    var split = LOCATEINFO.split(';')
    var tableExists = false
    split.every((item) => {
      if (item.split(':')[0] == S1TABLE2) {
        tableExists = true
        return false
      }
      return true
    })
    if (!tableExists) {
      LOCATEINFO += S1TABLE2 + ':' + S1FIELD2 + ';'
    } else {
      //add S1FIELD2 to LOCATEINFO
      split.every((item, index) => {
        if (item.split(':')[0] == S1TABLE2) {
          split[index] = item + ',' + S1FIELD2
          return false
        }
        return true
      })
      LOCATEINFO = split.join(';')
    }
  })

  LOCATEINFO = LOCATEINFO.slice(0, -1)

  return { LOCATEINFO: LOCATEINFO, CCCXMLS1MAPPINGS: CCCXMLS1MAPPINGS }
}

function createXMLDOM(CCCXMLS1MAPPINGS) {
  //create xml dom
  var xmlDom = document.implementation.createDocument('', '', null)
  //root node <= first node from xml mappings split by '/'
  var root = xmlDom.createElement(CCCXMLS1MAPPINGS[0].XMLNODE.split('/')[0])
  xmlDom.appendChild(root)
  //add xml elements to xml dom
  CCCXMLS1MAPPINGS.forEach((item) => {
    var xmlNodes = item.XMLNODE.split('/')
    //add xml elements to xml dom
    var root = xmlDom.documentElement //Order or...
    for (var i = 1; i < xmlNodes.length; i++) {
      var node
      //verify if node already exists
      if (root.getElementsByTagName(xmlNodes[i]).length > 0) {
        node = root.getElementsByTagName(xmlNodes[i])[0]
        root.appendChild(node)
        root = node
      } else {
        try {
          node = xmlDom.createElement(xmlNodes[i])
          //give it a dummy value in order to be able to append it; but just for the last node
          if (i == xmlNodes.length - 1) node.textContent = 'dummy'
          root.appendChild(node)
          root = node
        } catch (err) {
          console.log(err)
        }
      }
    }
  })

  return xmlDom
}

async function populateXMLDOMScenariu2(xmlDom, CCCXMLS1MAPPINGS, S1ObjData) {
  //scenariul 2
  //match xml nodes with S1 Table 1 and S1 Field 1
  const mainNode = 'DXInvoice'
  var x = xmlDom.getElementsByTagName(mainNode)
  var obj = xml2json(x[0])
  console.log('xml2json', obj)
  //get node name for lines; select id "delimitareLinieDocument"
  const linesNode = 'InvoiceLine'
  //cut obj in two parts: header and lines; lines are in an array (obj.OrderLine)
  var header = {}
  var lines = {}
  for (var i in obj) {
    if (i == linesNode) {
      lines[i] = obj[i]
    } else {
      header[i] = obj[i]
    }
  }
  console.log('header', header)
  console.log('lines', lines)
  var headerArrayOfObjects = []
  var linesArrayOfObjects = []
  recurse(header, [], mainNode, null, null, headerArrayOfObjects)
  recurse(lines, [], mainNode, null, null, linesArrayOfObjects)

  await mapS1ObjDataToArrayOfObjects(xmlDom, S1ObjData, CCCXMLS1MAPPINGS, headerArrayOfObjects)

  const S1Table1 = 'ITELINES'
  const S1ObjDataLines = S1ObjData[S1Table1]
  //map S1ObjDataLines to linesArrayOfObjects through CCCXMLS1MAPPINGS
  S1ObjDataLines.forEach(async (line) => {
    //create a new xml node for each line by cloning the first line node
    //for the first line select the first lineNode
    //for the next lines clone and append the first lineNode
    if (S1ObjDataLines.indexOf(line) == 0) {
      var node = xmlDom.getElementsByTagName(linesNode)[0]
    } else {
      var node = xmlDom.getElementsByTagName(linesNode)[0].cloneNode(true)
      //add node to xmlDom
      xmlDom.getElementsByTagName(mainNode)[0].appendChild(node)
    }
    //map line to linesArrayOfObjects
    await mapS1ObjDataToArrayOfObjects(xmlDom, { ITELINES: [line] }, CCCXMLS1MAPPINGS, linesArrayOfObjects)
  })

  //alert(xmlDom.getElementsByTagName(mainNode)[0].innerHTML)
}

async function mapS1ObjDataToArrayOfObjects(xmlDom, S1ObjData, CCCXMLS1MAPPINGS, arrayOfObjects) {
  console.log({ S1ObjData, CCCXMLS1MAPPINGS, arrayOfObjects })
  var arrays = []
  arrayOfObjects.forEach(async (item) => {
    //flatten item xmlPath so as to compare it with CCCXMLS1MAPPINGS
    var xmlPath =
      item.parent && item.parent.length > 0
        ? item.root + '/' + item.parent.join('/') + '/' + item.i
        : item.root + '/' + item.i
    console.log('xmlPath', xmlPath)
    CCCXMLS1MAPPINGS.forEach(async (item2) => {
      if (item2.XMLNODE == xmlPath) {
        console.log('pair found', item2)
        console.log('S1ObjData[item2.S1TABLE1]', S1ObjData[item2.S1TABLE1])
        //set node value
        if (S1ObjData[item2.S1TABLE1]) {
          if (S1ObjData[item2.S1TABLE1].length > 1) {
            arrays.push({
              mapping: item2,
              iterations: S1ObjData[item2.S1TABLE1].length,
              S1Data: S1ObjData[item2.S1TABLE1]
            })
          } else {
            var node = findNodeInXMLDOM(xmlDom, item2.XMLNODE)
            //if found, set node value else create node and set value
            if (node) {
              var value = S1ObjData[item2.S1TABLE1][0][item2.S1FIELD1]
              console.log('node', node)
              console.log('S1ObjData[item2.S1TABLE1]', S1ObjData[item2.S1TABLE1])
              //check for 123|RON and get RON
              if (value && value.indexOf('|') > -1) {
                value = value.split('|')[1]
              }
              //check for 2023-09-20 00:00:00 and get 2023-09-20
              //only for strings resambling dates
              if (value && value.indexOf('-') > -1 && value.indexOf(':') > -1) {
                value = value.split(' ')[0]
              }
              node.textContent = value
            } else {
              //create node and set value
              console.log('create node and set value')
              var node = xmlDom.createElement(item2.XMLNODE.split('/')[item2.XMLNODE.split('/').length - 1])
              node.textContent = S1ObjData[item2.S1TABLE1][0][item2.S1FIELD1]
              findNodeInXMLDOM(xmlDom, item2.XMLNODE).parentNode.appendChild(node)
            }
          }
        } else {
          if (item2.SQL) {
            console.log('has SQL', item2.SQL)
            //set node value
            //if sql SELECT PERCNT FROM VAT WHERE VAT={S1Table1.S1Field1} or SELECT PERCNT FROM VAT WHERE VAT={S1Table1.S1Field1} and VAT2={S1Table1.S1Field2}
            //then replace {S1Table1.S1Field1} with S1ObjData[S1Table1][0][S1Field1]
            //and {S1Table1.S1Field2} with S1ObjData[S1Table1][0][S1Field2]
            //then execute the query and set node value
            //else execute the query and set node value
            //set params' query
            var params = {}
            params['query'] = {}
            //replace {S1Table1.S1Field1} with S1ObjData[S1Table1][0][S1Field1]
            //and {S1Table1.S1Field2} with S1ObjData[S1Table1][0][S1Field2]
            //parse and replace {s1table1.s1field1} with S1ObjData[item.S1TABLE1][0][item.S1FIELD1] or {s1table1.s1field2} with S1ObjData[item.S1TABLE2][0][item.S1FIELD2]
            var sqlQuery = item2.SQL
            var regex = /{([^}]+)}/g
            var matches = sqlQuery.match(regex)
            console.log('matches', matches)
            if (matches) {
              matches.forEach((match) => {
                try {
                  var s1table = match.split('.')[0].replace('{', '')
                  var s1field = match.split('.')[1].replace('}', '')
                  //upper case
                  s1table = s1table.toUpperCase()
                  s1field = s1field.toUpperCase()
                  console.log('s1table', s1table)
                  console.log('s1field', s1field)
                  console.log('match', match)
                  console.log('S1ObjData[s1table]', S1ObjData[item2[s1table]])
                  console.log('S1ObjData[s1table][0]', S1ObjData[item2[s1table]][0])
                  console.log('S1ObjData[s1table][0][s1field]', S1ObjData[item2[s1table]][0][item2[s1field]])
                  sqlQuery = sqlQuery.replace(match, S1ObjData[item2[s1table]][0][item2[s1field]])
                } catch (err) {
                  console.log(sqlQuery, err)
                }
              })
            }
            console.log('sqlQuery', sqlQuery)
            params['query']['sqlQuery'] = sqlQuery

            var node = findNodeInXMLDOM(xmlDom, item2.XMLNODE)
            //if found, set node value else create node and set value
            if (node) {
              var res = await client.service('getDataset').find(params)
              console.log('getDataset for ' + item2.XMLNODE, res)
              if (res.data) {
                node.textContent = res.data
              }
            } else {
              //create node and set value
              console.log('create node and set value')
              var node = xmlDom.createElement(item2.XMLNODE.split('/')[item2.XMLNODE.split('/').length - 1])
              var res = await client.service('getDataset').find(params)
              console.log('getDataset for ' + item2.XMLNODE, res.data)
              if (res.data) {
                node.textContent = res.data
              }
              findNodeInXMLDOM(xmlDom, item2.XMLNODE).parentNode.appendChild(node)
            }
          }
        }
      }
    })
  })

  if (arrays.length > 0) {
    console.log('arrays', arrays)

    //zoom out from array to whole sequence
    var sequences = []
    var lastPath = ''
    arrays.forEach((obj) => {
      //find in CCCXMLS1MAPPINGS the all nodes sharing the shortest path
      var xmlNodes = obj.mapping.XMLNODE.split('/')
      path = xmlNodes.slice(0, xmlNodes.length - 1).join('/')
      if (path != lastPath) {
        console.log('path', path)

        var alike = []
        CCCXMLS1MAPPINGS.forEach((mapping) => {
          if (mapping.XMLNODE.includes(path)) {
            alike.push(mapping)
          }
        })
        sequences.push({ path: path, mappings: alike, iterations: obj.iterations, S1Data: obj.S1Data })
        lastPath = path
      }
    })

    console.log('sequences', sequences)

    //map sequences to S1ObjData through CCCXMLS1MAPPINGS
    //map sequences to xmlDom
    //for each sequences[i].path, loop sequences[i].iterations times and find in S1ObjData the corresponding values
    //then add them to xmlDom
    sequences.forEach((sequence) => {
      var seqPath = sequence.path
      var seqMappings = sequence.mappings
      var seqIterations = sequence.iterations
      var seqData = sequence.S1Data
      var refNode = findNodeInXMLDOM(xmlDom, seqPath)
      console.log('refNode', refNode)
      var newChild = refNode.cloneNode(true)
      var sequenceNewNodes = []
      seqData.forEach((item) => {
        seqMappings.forEach((mapping) => {
          console.log('mapping', mapping)
          console.log('item', item)
          console.log('seqPath', seqPath)
          //substract seqPath from mapping.XMLNODE
          var partialPath = mapping.XMLNODE.replace(seqPath + '/', '')
          console.log('partialPath', partialPath)
          splited = partialPath.split('/')
          console.log('splited', splited)
          console.log('splited root', partialPath.split('/')[0])
          var rootExists = findRootInSequence([...sequenceNewNodes], partialPath.split('/')[0])
          console.log('rootExists', rootExists)

          if (!rootExists) {
            //create new node
            var newNode = xmlDom.createElement(partialPath.split('/')[0])
            //add node to sequenceNewNodes
            sequenceNewNodes.push(newNode)
          } else {
            //find node in sequenceNewNodes
            var found = false
            sequenceNewNodes.every((item2) => {
              if (item2.nodeName == partialPath.split('/')[0]) {
                found = true
                console.log('found', item2.nodeName)
                //adauga restul nodurilor
                var node = item2
                for (var i = 1; i < splited.length; i++) {
                  //daca nu exista nodul, creeaza-l
                  if (node.getElementsByTagName(splited[i]).length == 0) {
                    var newNode = xmlDom.createElement(splited[i])
                    node.appendChild(newNode)
                    node = newNode
                  }
                }
                console.log('nod ierarhic', node)
                return false
              }
              return true
            })
          }
        })
        console.log('sequenceNewNodes', sequenceNewNodes)
        sequenceNewNodes.forEach((item) => {
          console.log('itemToBeAppended', item)
          newChild.appendChild(item)
        })
        console.log('newChild', newChild)
        refNode.parentNode.insertBefore(newChild, refNode.nextSibling)
        newChild = null
        newChild = refNode.cloneNode(true)
        sequenceNewNodes = []
        sequenceNewNodes.push(newChild)
        console.log('sequenceNewNodes', sequenceNewNodes)
      })
    })
  }
}

function findRootInSequence(seqArr, nodeName) {
  console.log('seqArr', seqArr)
  console.log('nodeName', nodeName)
  var found = false
  seqArr.every((item) => {
    if (item.nodeName == nodeName) {
      found = true
      return false
    }
    return true
  })
  return found
}

function findNodeInXMLDOM(xmlDom, xmlNode) {
  var xmlNodes = xmlNode.split('/')
  var root = xmlDom.documentElement
  //find node in xmlDom, but do not change ierachy of nodes
  for (var i = 0; i < xmlNodes.length; i++) {
    var node
    if (root.getElementsByTagName(xmlNodes[i]).length > 0) {
      //first found node
      //node = root.getElementsByTagName(xmlNodes[i])[0]
      //last found node
      node = root.getElementsByTagName(xmlNodes[i])[root.getElementsByTagName(xmlNodes[i]).length - 1]
      root.appendChild(node)
      root = node
    }
  }

  return node
}

async function populateXMLDOMScenariu1(xmlDom, CCCXMLS1MAPPINGS) {
  //scenariul 1
  CCCXMLS1MAPPINGS.forEach(async (item) => {
    if (item.SQL && !item.SQL.includes('{')) {
      //set node value
      var node = findNodeInXMLDOM(xmlDom, item.XMLNODE)
      var res = await client.service('getDataset').find({ query: { sqlQuery: item.SQL } })
      console.log('getDataset', res)
      if (res.data) {
        node.textContent = res.data
      }
    }
  })
}

async function populateXMLDOMScenariu3(xmlDom, CCCXMLS1MAPPINGS, S1ObjData) {
  //scenariul 3
  CCCXMLS1MAPPINGS.forEach(async (item) => {
    if (item.SQL && item.SQL.includes('{')) {
      //set node value
      var node = findNodeInXMLDOM(xmlDom, item.XMLNODE)
      //parse and replace {s1table1.s1field1} with S1ObjData[item.S1TABLE1][0][item.S1FIELD1] or {s1table1.s1field2} with S1ObjData[item.S1TABLE2][0][item.S1FIELD2]
      var sqlQuery = item.SQL
      var regex = /{([^}]+)}/g
      var matches = sqlQuery.match(regex)
      console.log('matches', matches)
      matches.forEach(async (match) => {
        var s1table = match.split('.')[0].replace('{', '')
        var s1field = match.split('.')[1].replace('}', '')
        //upper case
        s1table = s1table.toUpperCase()
        s1field = s1field.toUpperCase()
        console.log('s1table', s1table)
        console.log('s1field', s1field)
        console.log('match', match)
        try {
          console.log('item[s1table]]', item[s1table])
          console.log('item[s1field]]', item[s1field])
          try {
            var val = S1ObjData[item[s1table]][0][item[s1field]]
            //val could be 1|Buc
            //if val is 1|Buc, then val = 1
            if (val && val.indexOf('|') > -1) {
              val = val.split('|')[0]
            }
            sqlQuery = sqlQuery.replace(match, val)
            console.log('actual value', val)
          } catch (err) {
            console.log(err)
            console.log(S1ObjData[item[s1table]])
          }
          console.log('sqlQuery', sqlQuery)
          var res = await client.service('getDataset').find({ query: { sqlQuery: sqlQuery } })
          console.log('getDataset', res)
          if (res.data) {
            node.textContent = res.data
          }
        } catch (err) {
          console.log(err)
        }
      })
    }
  })
}

async function createXML(findoc, trdr, sosource, fprms, series) {
  var ret = await createLOCATEINFO(trdr, sosource, fprms, series)
  var LOCATEINFO = ret.LOCATEINFO
  var CCCXMLS1MAPPINGS = ret.CCCXMLS1MAPPINGS
  //sort CCCXMLS1MAPPINGS by XMLORDER
  CCCXMLS1MAPPINGS.sort((a, b) => {
    return a.XMLORDER - b.XMLORDER
  })

  console.log('LOCATEINFO', LOCATEINFO)
  console.log('CCCXMLS1MAPPINGS', CCCXMLS1MAPPINGS)

  //get data from S1; LOCATEINFO  results from reading data from xml mappings
  var S1Obj = await client.service('getS1ObjData').find({
    query: {
      KEY: findoc,
      clientID: await client
        .service('connectToS1')
        .find()
        .then((result) => {
          return result.token
        }),
      appID: '1001',
      OBJECT: 'SALDOC',
      FORM: 'EFIntegrareRetailers',
      LOCATEINFO: LOCATEINFO
    }
  })

  console.log('S1ObjData(LocateInfo)', S1Obj)
  const S1ObjData = S1Obj.data

  var header = 'DXInvoice/Invoice/'
  var lines = 'DXInvoice/InvoiceLine/'

  var CCCXMLS1MAPPINGS_HEADER = []
  var CCCXMLS1MAPPINGS_LINES = []
  CCCXMLS1MAPPINGS.forEach((item) => {
    if (item.XMLNODE.includes(header)) {
      CCCXMLS1MAPPINGS_HEADER.push(item)
    }
    if (item.XMLNODE.includes(lines)) {
      CCCXMLS1MAPPINGS_LINES.push(item)
    }
  })

  console.log('CCCXMLS1MAPPINGS_HEADER', CCCXMLS1MAPPINGS_HEADER)
  console.log('CCCXMLS1MAPPINGS_LINES', CCCXMLS1MAPPINGS_LINES)

  //header
  var _HEADER = await joinThings(CCCXMLS1MAPPINGS_HEADER, S1ObjData)

  //create xml dom
  var xmlDomHeader = document.implementation.createDocument('', '', null)
  var root = 'DXInvoice'
  var root = xmlDomHeader.createElement(root)
  xmlDomHeader.appendChild(root)

  xmlDomHeader = createDomPart(_HEADER, xmlDomHeader)
  console.log('xmlDomHeader', xmlDomHeader)

  //lines
  //S1ObjData but without ITELINES
  var S1ObjDataNoITELINES = {}
  Object.keys(S1ObjData).forEach((key) => {
    if (key != 'ITELINES') {
      S1ObjDataNoITELINES[key] = S1ObjData[key]
    }
  })
  var S1ITELINES = S1ObjData['ITELINES']
  var xmlDomLines = []
  S1ITELINES.forEach(async (line) => {
    var currLine = { ITELINES: [line] }
    //add currLine to S1ObjDataNoITELINES
    var S1ObjDataNoITELINES_currLine = Object.assign({}, S1ObjDataNoITELINES, currLine)
    console.log('currLine', currLine)
    joinThings(CCCXMLS1MAPPINGS_LINES, S1ObjDataNoITELINES_currLine).then((part) => {
      console.log('part', part)
      var xmlDomLine = document.implementation.createDocument('', '', null)
      var root = 'DXInvoice'
      var root = xmlDomLine.createElement(root)
      xmlDomLine.appendChild(root)
      xmlDomLine = createDomPart(part, xmlDomLine)
      xmlDomLines.push(xmlDomLine)
    })
  })

  //wait until xmlDomLines is populated, meaning xmlDomLines.length == S1ITELINES.length
  while (xmlDomLines.length < S1ITELINES.length) {
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  console.log('xmlDomLines', xmlDomLines)

  //take xmlDomHeader and xmlDomLines and merge them into one xmlDom
  var xmlDom = xmlDomHeader
  xmlDomLines.forEach((item) => {
    var xmlNodes = item.documentElement.childNodes
    for (var i = 0; i < xmlNodes.length; i++) {
      xmlDom.documentElement.appendChild(xmlNodes[i])
    }
  })

  console.log('xmlDom', xmlDom)

  //return DXInvoice from document
  var xml = xmlDom.getElementsByTagName('DXInvoice')[0].outerHTML

  return { dom: xml, trimis: false }

  async function joinThings(CCCXMLS1MAPPINGS_PART, S1ObjData) {
    var _PART = []
    CCCXMLS1MAPPINGS_PART.forEach(async (item) => {
      item.SQL = item.SQL.trim()
      var o = {}
      o.xmlNode = item.XMLNODE
      o.table1 = item.S1TABLE1 || null
      o.field1 = item.S1FIELD1 || null
      if (item.S1TABLE1 && item.S1FIELD1) {
        possibleArray = S1ObjData[item.S1TABLE1]
        if (possibleArray && possibleArray.length == 1) {
          o.value1 = S1ObjData[item.S1TABLE1][0][item.S1FIELD1] || 'n/a'
        } else if (possibleArray && possibleArray.length > 1) {
          o.value1 = []
          possibleArray.forEach((item2) => {
            o.value1.push(item2[item.S1FIELD1])
          })
        } else {
          o.value1 = 'n/a'
        }
        if (o.value1 && o.value1.indexOf('|') > -1) {
          o.value1 = o.value1.split('|')[0]
        }
        //if o.value1 is an arrat then check every item for | and split it
        if (Array.isArray(o.value1)) {
          o.value1.forEach((item2, index) => {
            if (item2.indexOf('|') > -1) {
              o.value1[index] = item2.split('|')[0]
            }
          })
        }
        o.value = o.value1
      } else {
        o.value1 = 'n/a'
        o.value = 'n/a'
      }
      if (item.SQL == '') {
        //...
      } else {
        item.SQL = item.SQL.replace(/\n/g, ' ').replace(/\r/g, ' ')
        o.table2 = item.S1TABLE2 || null
        o.field2 = item.S1FIELD2 || null
        o.value2 = item.S1TABLE2 && item.S1FIELD2 ? S1ObjData[item.S1TABLE2][0][item.S1FIELD2] : 'n/a'
        o.sql = item.SQL
        var sqlQuery = item.SQL
        if (o.value2 && o.value2.indexOf('|') > -1) {
          o.value2 = o.value2.split('|')[0]
        }
        if (item.SQL.includes('{S1Table1.S1Field1}')) {
          sqlQuery = sqlQuery.replace('{S1Table1.S1Field1}', o.value1)
        }

        if (item.SQL.includes('{S1Table2.S1Field2}')) {
          sqlQuery = sqlQuery.replace('{S1Table2.S1Field2}', o.value2)
        }

        o.sqlQuery = sqlQuery
        //value = await client.service('getDataset').find(params)
        var params = {}
        params['query'] = {}
        params['query']['sqlQuery'] = sqlQuery
        var res = await client.service('getDataset').find(params)
        console.log('sqlQuery', sqlQuery, 'queryResponse', res)
        if (res.data) {
          //for xml path ('') [1,2,3]
          if (res.data.indexOf('[') > -1) {
            o.value = JSON.parse(res.data)
          } else {
            o.value = res.data
          }
        }
      }
      _PART.push(o)
    })

    //wait until _HEADER is populated, meaning _HEADER.length == CCCXMLS1MAPPINGS_HEADER.length
    while (_PART.length < CCCXMLS1MAPPINGS_PART.length) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    //sort _HEADER by xmlNode alphabetically
    /* _PART.sort((a, b) => {
      var txtA = a.xmlNode.toUpperCase()
      var txtB = b.xmlNode.toUpperCase()
      return txtA < txtB ? -1 : txtA > txtB ? 1 : 0
    }) */

    return _PART
  }

  function createDomPart(_PART, xmlDom) {
    _PART.forEach((item) => {
      console.log({ xml: item.xmlNode, value: item.value })
      var xmlNodes = item.xmlNode.split('/')
      //add xml elements to xml dom
      var root = xmlDom.documentElement
      for (var i = 1; i < xmlNodes.length; i++) {
        var node
        var existingElements = root.getElementsByTagName(xmlNodes[i])
        //verify if node already exists
        if (existingElements.length > 0) {
          node = existingElements[existingElements.length - 1]
          root.appendChild(node)
          root = node
        } else {
          try {
            node = xmlDom.createElement(xmlNodes[i])
            //give it a dummy value in order to be able to append it; but just for the last node
            if (i == xmlNodes.length - 1) node.textContent = item.value
            root.appendChild(node)
            root = node
          } catch (err) {
            console.log(err)
          }
        }
      }
    })

    //find in _HEADER item.value as array
    var whatToReplace = []
    _PART.forEach((item) => {
      if (Array.isArray(item.value)) {
        var parentName = item.xmlNode.split('/')[item.xmlNode.split('/').length - 2]
        //copy parent node with all its children item.value times with different values
        whatToReplace.push({
          parent: xmlDom.getElementsByTagName(parentName)[0],
          childToChange: item.xmlNode.split('/')[item.xmlNode.split('/').length - 1],
          value: item.value
        })
      }
    })

    console.log('whatToReplace', whatToReplace)

    //regroup children of whatToReplace by parent; eg: whatToReplace.parent <> array of childToChange/value with said parent
    var distinctParents = []
    whatToReplace.forEach((item) => {
      if (distinctParents.indexOf(item.parent) == -1) {
        distinctParents.push(item.parent)
      }
    })

    var groupedByParent = []
    distinctParents.forEach((parent) => {
      whatToReplace.forEach((item) => {
        if (item.parent == parent) {
          //find in groupedByParent if parent exists
          var found = false
          groupedByParent.every((item2) => {
            if (item2.parent == parent) {
              found = true
              item2.children.push({ childToChange: item.childToChange, value: item.value })
              return false
            }
            return true
          })
          if (!found) {
            groupedByParent.push({
              parent: parent,
              children: [{ childToChange: item.childToChange, value: item.value }]
            })
          }
        }
      })
    })

    console.log('groupedByParent', groupedByParent)

    //for each distinct parent, clone it by the first childToChange/value
    //then change the values of the childToChange nodes
    groupedByParent.forEach((item) => {
      var parent = item.parent
      var times = item.children[0].value.length
      console.log('times', times)
      //clone parent times times but keep the original parent, so I don't have to delete it later
      for (var i = 1; i < times; i++) {
        var clone = parent.cloneNode(true)
        parent.parentNode.appendChild(clone)
      }

      var clones = []
      //get cloned elements plus the original one
      clones = xmlDom.getElementsByTagName(parent.nodeName)
      console.log('clones', clones)

      var arrClones = Array.from(clones)

      arrClones.forEach((clone, index) => {
        //change childToChange/value
        item.children.forEach((item2) => {
          var childToChange = item2.childToChange
          var value = item2.value[index]
          console.log('childToChange', childToChange)
          console.log('value', value)
          clone.getElementsByTagName(childToChange)[0].textContent = value
        })
      })
    })

    //parse xmlDom thru DOMParser
    var xmlString = new XMLSerializer().serializeToString(xmlDom)
    var parser = new DOMParser()
    var xmlDomm = parser.parseFromString(xmlString, 'text/xml')

    return xmlDomm
  }

  // var xmlDom = createXMLDOM(CCCXMLS1MAPPINGS)

  // console.log('xmlDom', xmlDom)

  // await populateXMLDOMScenariu2(xmlDom, CCCXMLS1MAPPINGS, S1ObjData)

  // //await populateXMLDOMScenariu1(xmlDom, CCCXMLS1MAPPINGS)

  // //await populateXMLDOMScenariu3(xmlDom, CCCXMLS1MAPPINGS, S1ObjData)

  // console.log('xmlDom', xmlDom)

  // //return xml innerHTML
  // return xmlDom.getElementsByTagName('DXInvoice')[0].innerHTML
}

async function cheatGetXmlFromS1(findoc) {
  var dom = await client.service('getInvoiceDom').find({
    query: {
      clientID: await client
        .service('connectToS1')
        .find()
        .then((result) => {
          return result.token
        }),
      appID: '1001',
      findoc: findoc
    }
  })



  console.log('dom', dom)
  return dom
}

function toggleComenziNetrimise() {
  var comenziTrimise = document.getElementById('comenziTrimise')
  var table = document.getElementById('xmlTableBody tbody')
  if (comenziTrimise.checked) {
    //show only rows with cell class="findoc" innerHTML empty if checkbox is checked, else show all rows
    var rows = table.getElementsByTagName('tr')
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i]
      var cell = row.getElementsByClassName('findoc')[0]
      if (cell.innerHTML == '') {
        row.style.display = 'none'
      }
    }
  } else {
    var rows = table.getElementsByTagName('tr')
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i]
      row.style.display = ''
    }
  }
}

function mandatoryFields() {
  //get file from input id="xsdFile"
  var xsdFile = document.getElementById('xsdFile').files[0]
  console.log('xsdFile', xsdFile)
  //find elements without minOccurs="0"
  var mandatoryFields = []
  var nonMandatoryFields = []
  var reader = new FileReader()
  reader.readAsText(xsdFile)
  reader.onload = function (e) {
    var xsd = e.target.result
    var parser = new DOMParser()
    var xsdDom = parser.parseFromString(xsd, 'text/xml')
    //find and remove element name='DXInvoice' from xsdDom
    var dxInvoice = xsdDom.getElementsByTagName('xs:element')[0]
    dxInvoice.parentNode.removeChild(dxInvoice)
    var elements = xsdDom.getElementsByTagName('xs:element')
    console.log('numar elemente', elements.length)
    for (var i = 0; i < elements.length; i++) {
      var element = elements[i]
      //find parents
      var parents = []
      var parent = element.parentNode
      while (parent.nodeName != 'xs:schema') {
        parents.push(parent)
        parent = parent.parentNode
      }
      var path = ''
      for (var j = parents.length - 1; j >= 0; j--) {
        var parentName = parents[j].getAttribute('name')
        if (parentName) {
          path += parentName + '/'
        }
      }
      path += element.getAttribute('name')
      path = path.replace('InvoiceType', 'DXInvoice/Invoice')
      path = path.replace('InvoiceLineType', 'DXInvoice/InvoiceLine')

      recursiveSearchInElement(element, path)

      function recursiveSearchInElement(element, path) {
        /*
      <xs:annotation>
					<xs:documentation>Invoice Currency</xs:documentation>
				</xs:annotation>
      */
        //get documentation value if exists
        var documentationValue = ''
        var annotation = element.getElementsByTagName('xs:annotation')[0]
        if (annotation) {
          var documentation = annotation.getElementsByTagName('xs:documentation')[0]
          if (documentation) {
            documentationValue = documentation.innerHTML
          }
        }
        if (element.hasAttribute('minOccurs') && element.getAttribute('minOccurs') == '0') {
          nonMandatoryFields.push({
            name: element.getAttribute('name'),
            type: element.getAttribute('type'),
            path: path,
            documentation: documentationValue,
            orderNumber: i + 1
          })
        } else {
          //nu are minOccurs deci este obligatoriu, dar daca este complexType nu inregistrez, vor fi inregistrate elementele care il compun
          var isComplexType = element.getElementsByTagName('xs:complexType')[0]
          var needsFurtherInvestigation = false
          //if type is in form commons:something then needs further investigation with commons.xsd
          needsFurtherInvestigation = element.getAttribute('type')
            ? element.getAttribute('type').includes('commons:')
            : false
          if (!isComplexType)
            if (!needsFurtherInvestigation) {
              mandatoryFields.push({
                name: element.getAttribute('name'),
                type: element.getAttribute('type'),
                path: path,
                documentation: documentationValue,
                orderNumber: i + 1
              })
            } else {
              recursiveSearchForTypes(
                element.getAttribute('type').split(':')[1],
                i + 1,
                mandatoryFields,
                nonMandatoryFields,
                path
              )
            }
        }
      }
    }
    console.log('mandatoryFields', mandatoryFields)
    console.log('nonMandatoryFields', nonMandatoryFields)

    displayMandatoryFields(mandatoryFields, nonMandatoryFields)

    if (document.getElementById('xmlAsTable').getElementsByTagName('tbody')[0])
      setMandatoryAndFieldOrder(
        mandatoryFields,
        nonMandatoryFields,
        document.getElementById('xmlAsTable').getElementsByTagName('tbody')[0]
      )
  }

  function displayMandatoryFields(mandatoryFields, nonMandatoryFields) {
    var label = document.getElementById('mandatoryFieldsLabel')
    label.innerHTML = 'Obligatorii: ' + mandatoryFields.length
    //get table id="mandatoryFieldsTable" and create mandatory data
    var table = document.getElementById('mandatoryFieldsTable')
    //empty table
    table.innerHTML = ''
    //Create table head
    var thead = table.createTHead()
    var row = thead.insertRow()
    var th = document.createElement('th')
    th.innerHTML = 'Name'
    row.appendChild(th)
    var th = document.createElement('th')
    th.innerHTML = 'Type'
    row.appendChild(th)
    var th = document.createElement('th')
    th.innerHTML = 'Path'
    row.appendChild(th)
    var th = document.createElement('th')
    th.innerHTML = 'Documentation'
    row.appendChild(th)
    var th = document.createElement('th')
    th.innerHTML = 'Order Number'
    row.appendChild(th)

    //create table body
    var tbody = table.createTBody()
    mandatoryFields.forEach((item) => {
      var tr = document.createElement('tr')
      var td = document.createElement('td')
      td.innerHTML = item.name
      tr.appendChild(td)
      var td = document.createElement('td')
      td.innerHTML = item.type
      //onclick event
      td.onclick = function () {
        showCommonType(
          this.innerHTML.split(':')[1],
          item.orderNumber,
          mandatoryFields,
          nonMandatoryFields,
          item.path
        )
      }
      tr.appendChild(td)
      var td = document.createElement('td')
      td.innerHTML = item.path
      tr.appendChild(td)
      var td = document.createElement('td')
      td.innerHTML = item.documentation
      tr.appendChild(td)
      var td = document.createElement('td')
      td.innerHTML = item.orderNumber
      tr.appendChild(td)
      tbody.appendChild(tr)
    })

    //label
    var label = document.getElementById('nonMandatoryFieldsLabel')
    label.innerHTML = 'Facultative: ' + nonMandatoryFields.length
    //table id="nonMandatoryFieldsTable"
    var table = document.getElementById('nonMandatoryFieldsTable')
    //empty table
    table.innerHTML = ''
    //Create table head
    var thead = table.createTHead()
    var row = thead.insertRow()
    var th = document.createElement('th')
    th.innerHTML = 'Name'
    row.appendChild(th)
    var th = document.createElement('th')
    th.innerHTML = 'Type'
    row.appendChild(th)
    var th = document.createElement('th')
    th.innerHTML = 'Path'
    row.appendChild(th)
    var th = document.createElement('th')
    th.innerHTML = 'Documentation'
    row.appendChild(th)
    var th = document.createElement('th')
    th.innerHTML = 'Order Number'
    row.appendChild(th)

    //create table body
    var tbody = table.createTBody()
    nonMandatoryFields.forEach((item) => {
      var tr = document.createElement('tr')
      var td = document.createElement('td')
      td.innerHTML = item.name
      tr.appendChild(td)
      var td = document.createElement('td')
      td.innerHTML = item.type
      //onclick event
      td.onclick = function () {
        showCommonType(
          this.innerHTML.split(':')[1],
          item.orderNumber,
          mandatoryFields,
          nonMandatoryFields,
          item.path
        )
      }
      tr.appendChild(td)
      var td = document.createElement('td')
      td.innerHTML = item.path
      tr.appendChild(td)
      var td = document.createElement('td')
      td.innerHTML = item.documentation
      tr.appendChild(td)
      var td = document.createElement('td')
      td.innerHTML = item.orderNumber
      tr.appendChild(td)
      tbody.appendChild(tr)
    })
  }

  function setMandatoryAndFieldOrder(mandatoryFields, nonMandatoryFields, table) {
    //in table id="xmlAsTable" fill column "Mandatory" with "Yes" or "No" by path
    var rows = table.getElementsByTagName('tr')
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i]
      var cell = row.getElementsByClassName('xmlPath')[0]
      var path = cell.innerHTML
      mandatoryFields.every((item) => {
        if (item.path == path) {
          cell = row.getElementsByClassName('mandatory')[0]
          //child select
          cell.value = true
          return false
        }
        return true
      })
    }

    //xmlOrderNumber
    rows = table.getElementsByTagName('tr')
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i]
      var cell = row.getElementsByClassName('xmlPath')[0]
      var path = cell.innerHTML
      mandatoryFields.every((item) => {
        console.log('path', path, 'item.path', item.path)
        //if (item.path == path) {
        //if (path.includes(item.path)) {
        if (path == item.path) {
          cell = row.getElementsByClassName('xmlOrder')[0]
          cell.innerHTML = item.orderNumber
          return false
        }
        return true
      })

      nonMandatoryFields.every((item) => {
        if (item.path == path) {
          //if (path.includes(item.path)) {
          cell = row.getElementsByClassName('xmlOrder')[0]
          cell.innerHTML = item.orderNumber
          return false
        }
        return true
      })
    }
  }
}

function loadCommonXSD() {
  //1.get file from input id="xsdCommonsFile"
  //2. create dom from file
  var xsdFile = document.getElementById('xsdCommonsFile').files[0]
  if (!xsdFile) {
    alert('Select XSD Commons file')
    return
  }
  console.log('xsdFile', xsdFile)

  //find elements without minOccurs="0"
  var reader = new FileReader()
  reader.readAsText(xsdFile)
  reader.onload = function (e) {
    var xsd = e.target.result
    var parser = new DOMParser()
    xsdCommonsDom = parser.parseFromString(xsd, 'text/xml')
  }
}

var xsdCommonsDom = null
function showCommonType(type, orderNumber, mandatoryFields, nonMandatoryFields, path) {
  //commons:PartyType => search for PartyType and get mandatory fields and non mandatory fields
  var thisMandatoryFields = []
  var thisNonMandatoryFields = []
  var searchFor = type
  //search for attributes with name = searchFor
  var response = recursiveSearchForTypes(searchFor, orderNumber, mandatoryFields, nonMandatoryFields, path)
  thisMandatoryFields = response.thisMandatoryFields
  thisNonMandatoryFields = response.thisNonMandatoryFields

  displayDetails()

  function displayDetails() {
    //dislay modal with id-"commonsDigging" with mandatoryFields and nonMandatoryFields
    //from bulma docs: To activate the modal, just add the is-active modifier on the .modal container.
    var modal = document.getElementById('commonsDigging')
    //add listener to modal close button
    var modalClose = modal.getElementsByClassName('modal-close')[0]
    modalClose.onclick = function () {
      modal.classList.remove('is-active')
    }
    modal.classList.add('is-active')
    //modal-content with data mentioned above
    var modalContent = modal.getElementsByClassName('modal-content')[0]
    //empty modalContent
    modalContent.innerHTML = ''
    //create table in modalContent
    var table = document.createElement('table')
    modalContent.appendChild(table)
    table.classList.add('table')
    table.classList.add('is-striped')
    table.classList.add('is-hoverable')
    table.classList.add('is-fullwidth')
    table.classList.add('is-narrow')
    table.classList.add('is-size-7')
    //create table head
    var thead = table.createTHead()
    var row = thead.insertRow()
    var th = document.createElement('th')
    th.innerHTML = 'Name'
    row.appendChild(th)
    var th = document.createElement('th')
    th.innerHTML = 'Type'
    row.appendChild(th)
    var th = document.createElement('th')
    th.innerHTML = 'Path'
    row.appendChild(th)
    var th = document.createElement('th')
    th.innerHTML = 'Documentation'
    row.appendChild(th)
    var th = document.createElement('th')
    th.innerHTML = 'Order Number'
    row.appendChild(th)
    //create table body
    var tbody = table.createTBody()
    thisMandatoryFields.forEach((item) => {
      var tr = document.createElement('tr')
      var td = document.createElement('td')
      td.innerHTML = item.name
      //color
      td.style.color = 'red'
      tr.appendChild(td)
      var td = document.createElement('td')
      td.innerHTML = item.type
      tr.appendChild(td)
      var td = document.createElement('td')
      td.innerHTML = item.path
      tr.appendChild(td)
      var td = document.createElement('td')
      td.innerHTML = item.documentation
      tr.appendChild(td)
      var td = document.createElement('td')
      td.innerHTML = item.orderNumber
      tr.appendChild(td)
      tbody.appendChild(tr)
    })
    thisNonMandatoryFields.forEach((item) => {
      var tr = document.createElement('tr')
      var td = document.createElement('td')
      td.innerHTML = item.name
      tr.appendChild(td)
      var td = document.createElement('td')
      td.innerHTML = item.type
      tr.appendChild(td)
      var td = document.createElement('td')
      td.innerHTML = item.path
      tr.appendChild(td)
      var td = document.createElement('td')
      td.innerHTML = item.documentation
      tr.appendChild(td)
      var td = document.createElement('td')
      td.innerHTML = item.orderNumber
      tr.appendChild(td)
      tbody.appendChild(tr)
    })
  }
}

function recursiveSearchForTypes(searchFor, orderNumber, mandatoryFields, nonMandatoryFields, path) {
  if (!xsdCommonsDom) {
    console.log('xsdCommonsDom not ready')
    return
  }
  var thisMandatoryFields = []
  var thisNonMandatoryFields = []
  var mySearchedComplexType
  //search xs:complexType name = searchFor
  //when found, search for all children xs:element with minOccurs="0" and add them to nonMandatoryFields
  //if not minOccurs="0" or even doesn't have minOccurs, add them to mandatoryFields
  var myComplexType = [...xsdCommonsDom.getElementsByTagName('xs:complexType')]
  if (myComplexType.length > 0) {
    mySearchedComplexType = myComplexType.find((item) => {
      return item.getAttribute('name') == searchFor
    })

    if (!mySearchedComplexType) {
      console.log('mySearchedComplexType not found')
      return { thisMandatoryFields: thisMandatoryFields, thisNonMandatoryFields: thisNonMandatoryFields }
    }
    console.log('searchFor', searchFor, 'mySearchedComplexType', mySearchedComplexType)
    //get all xs:element children
    var myElements = mySearchedComplexType.getElementsByTagName('xs:element')
    var arrMyElements = Array.from(myElements)
    arrMyElements.forEach((item, index) => {
      var parents = []
      var parent = item.parentNode
      //while not mySeachedComplexType
      while (parent.getAttribute('name') != searchFor) {
        parents.push(parent)
        parent = parent.parentNode
      }
      //construct path
      var path1 = ''
      for (var j = parents.length - 1; j >= 0; j--) {
        var parentName = parents[j].getAttribute('name')
        if (parentName) {
          path1 += parentName + '/'
        }
      }
      var keeper = {
        name: item.getAttribute('name'),
        type: item.getAttribute('type'),
        path: path + '/' + path1 + item.getAttribute('name'),
        documentation: '',
        orderNumber: parseFloat(orderNumber) + (index + 1) * 0.001
      }
      if (item.hasAttribute('minOccurs') && item.getAttribute('minOccurs') == '0') {
        nonMandatoryFields.push(keeper)
        thisNonMandatoryFields.push(keeper)
      } else {
        mandatoryFields.push(keeper)
        thisMandatoryFields.push(keeper)
      }
      //try further investigation with commons.xsd by type
      var type = item.getAttribute('type')
      listOfPrimitiveTypes = [
        'xs:string',
        'xs:decimal',
        'xs:integer',
        'xs:boolean',
        'xs:date',
        'xs:time',
        'xs:dateTime',
        'xs:duration',
        'xs:hexBinary',
        'xs:base64Binary',
        'xs:anyURI',
        'xs:QName',
        'xs:NOTATION'
      ]
      if (listOfPrimitiveTypes.indexOf(type) == -1) {
        if (type) {
          var response = recursiveSearchForTypes(
            type,
            keeper.orderNumber,
            mandatoryFields,
            nonMandatoryFields,
            keeper.path
          )
          thisMandatoryFields = thisMandatoryFields.concat(response.thisMandatoryFields)
          thisNonMandatoryFields = thisNonMandatoryFields.concat(response.thisNonMandatoryFields)
        }
      }
    })
  }

  console.log('thisMandatoryFields', thisMandatoryFields, 'thisNonMandatoryFields', thisNonMandatoryFields)
  return { thisMandatoryFields: thisMandatoryFields, thisNonMandatoryFields: thisNonMandatoryFields }
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
        alert(res.data)
      }
    })
}
