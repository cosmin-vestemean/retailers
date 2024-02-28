import { client } from './feathersjs-client.js'

var privateKey = '',
  url = '',
  username = '',
  passphrase = '',
  fingerprint = ''

export { privateKey, url, username, passphrase, fingerprint }

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

export function updateRetailerConfData() {
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

export function loadMapping(id) {
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

export function addXmlDomToTextArea(data) {
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

export async function loadFile(event) {
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

export function recurse(obj, parent, root, color, color1, result) {
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