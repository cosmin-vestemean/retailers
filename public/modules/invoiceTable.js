import client from './feathersjs-client.js'
import { trdrRetailerFromUrl } from '../client.js'

export async function displayDocsForRetailers(jsonData, trdr, sosource, fprms, series, tableBodyId) {
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

  const tbody = document.getElementById(tableBodyId)
  //clear table
  tbody.innerHTML = ''
  //validate params
  validateParams(jsonData, trdr, sosource, fprms, series, tableBodyId)

  jsonData.rows.forEach(async (row) => {
    //create row
    var tr = tbody.insertRow()
    //create cells
    //create findoc cell
    var findoc = tr.insertCell()
    findoc.innerHTML = row.findoc
    findoc.style.display = 'none'
    //create trndate cell
    var trndate = tr.insertCell()
    //trndate.innerHTML = row.trndate
    //check for ' 00:00:00'
    if (row.trndate.indexOf(' 00:00:00') > -1) {
      trndate.innerHTML = row.trndate.replace(' 00:00:00', '')
    } else {
      trndate.innerHTML = row.trndate
    }
    //create fincode cell
    var fincode = tr.insertCell()
    //add row.fincode and a empty text input all inlined; input text has unique id
    fincode.innerHTML =
      row.fincode +
      '<input type="text" id="' +
      row.fincode +
      '_postfix" class="input is-small ml-2" style="width: 100px;">'
    //create sumamnt cell
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
        domObj.filename = getNewFilenamePostfix(domObj.filename, row)
        //save the xml to file
        var xmlBlob = new Blob([xml], { type: 'text/xml' })
        var xmlURL = window.URL.createObjectURL(xmlBlob)
        var tempLink = document.createElement('a')
        tempLink.href = xmlURL
        tempLink.setAttribute('download', domObj.filename + '.xml')
        tempLink.click()
      }
    }
    actions.appendChild(button3)
    var button = document.createElement('button')
    button.className = 'button is-small is-success ml-2'
    //set id
    button.id = row.findoc + '_sendInvoice'
    button.innerHTML = 'Send Invoice'
    button.onclick = async function () {
      sendInvoiceAndMark(row, tr, button.id)
    }
    actions.appendChild(button)
    //add cell trimis
    var trimis = tr.insertCell()
    //add class for trimis
    trimis.className = 'trimis'
    //trimis.innerHTML = row.CCCXMLSendDate
    if (row.CCCXMLSendDate) {
      //trimis.innerHTML = '<i class="fas fa-xl fa-check-circle has-text-success"></i>  ' + row.CCCXMLSendDate
      //add checkbox readonly and checked
      var checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.checked = true
      checkbox.readOnly = true
      checkbox.className = 'trimisCheckbox'
      trimis.appendChild(checkbox)
      //add label for checkbox row.CCCXMLSendDate
      var label = document.createElement('label')
      label.htmlFor = row.findoc + '_alreadySent'
      label.appendChild(document.createTextNode(row.CCCXMLSendDate))
      trimis.appendChild(label)
      //add link to trimis cell for resending invoice with overrideTrimis = true
      var div = document.createElement('div')
      var resend = document.createElement('a')
      resend.innerHTML = 'Resend'
      resend.className = 'is-small is-danger ml-2'
      resend.onclick = async function () {
        //ask if sure
        var r = confirm('Resend invoice?')
        if (r == true) {
          sendInvoiceAndMark(row, tr, button.id, true)
        }
      }
      div.appendChild(resend)
      trimis.appendChild(div)
    } else {
      //add checkbox readonly and not checked
      var checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.readOnly = true
      //hidden by default
      checkbox.style.display = 'none'
      checkbox.className = 'trimisCheckbox'
      trimis.appendChild(checkbox)
      //create checlbox already sent  by other means
      var checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.id = row.findoc + '_alreadySent'
      checkbox.className = 'ml-2'
      var label = document.createElement('label')
      label.htmlFor = row.findoc + '_alreadySent'
      label.appendChild(document.createTextNode('Already sent'))
      trimis.appendChild(checkbox)
      trimis.appendChild(label)
    }
    //add row.CCCXMLFile
    var xmlFile = tr.insertCell()
    if (row.CCCXMLFile) {
      xmlFile.innerHTML = row.CCCXMLFile
    }
    //CCCAPERAK(FINDOC, TRDR_RETAILER) last DOCUMENTRESPONSE + DOCUMENTDETAIL; sort by MESSAGEDATE adn MESSAGETIME
    var aperakRes = await client.service('CCCAPERAK').find({
      query: {
        FINDOC: row.findoc,
        TRDR_RETAILER: trdr,
        $sort: {
          MESSAGEDATE: -1,
          MESSAGETIME: -1
        }
      }
    })
    console.log('response', aperakRes)
    var lastDXResponse = tr.insertCell()
    var messageDate = tr.insertCell()
    //set width
    lastDXResponse.style.width = '330px'
    if (aperakRes.total > 0) {
      var responseColor =
        aperakRes.data[0].DOCUMENTRESPONSE.toLowerCase() == 'acceptat' ||
        aperakRes.data[0].DOCUMENTRESPONSE.toLowerCase() == 'receptionat'
          ? 'is-success'
          : 'is-danger'
      //article specific tags. header contains DOCUMENTREFERENCE, DOCUMENTUID, DOCUMENTRESPONSE. body contains DOCUMENTDETAIL in a narrow column
      var article = document.createElement('article')
      article.className = 'message is-small ' + responseColor
      var header = document.createElement('div')
      header.className = 'message-header'
      //on click show hide body
      header.onclick = function () {
        var body = article.getElementsByClassName('message-body')[0]
        if (body.style.display == 'none') {
          body.style.display = 'block'
        } else {
          body.style.display = 'none'
        }
      }
      header.innerHTML =
        aperakRes.data[0].DOCUMENTREFERENCE +
        ' ' +
        aperakRes.data[0].DOCUMENTUID +
        ' ' +
        aperakRes.data[0].DOCUMENTRESPONSE
      article.appendChild(header)
      var body = document.createElement('div')
      body.className = 'message-body'
      //hidden by default
      body.style.display = 'none'
      body.innerHTML = aperakRes.data[0].DOCUMENTDETAIL.replace('Status', '<br>Status').replace(
        'Mesaj',
        '<br>Mesaj'
      ).replace('Nume fisier', '<br>Nume fisier')
      article.appendChild(body)
      lastDXResponse.appendChild(article)
      //add column MESSAGEDATE, take only date part
      var messageDateData
      if (aperakRes.data[0].MESSAGEDATE) {
        messageDateData = aperakRes.data[0].MESSAGEDATE.split('T')[0]
        //add MESSAGETIME, time part
        var messageTimeData = aperakRes.data[0].MESSAGETIME.split('T')[1]
        //split 22:26:22.000Z to 22:26:22
        messageTimeData = messageTimeData.split('.')[0]
        messageDateData += ' ' + messageTimeData
        messageDate.innerHTML = messageDateData
      } else {
        messageDateData = ''
      }
    } else {
      //font awesome waiting spinner
      lastDXResponse.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'
    }
  })
}

async function sendInvoiceAndMark(row, tr, elemId, overrideTrimis = false) {
  //send invoice
  var button = document.getElementById(elemId)
  var domObj = await cheatGetXmlFromS1(row.findoc)
  var filename = domObj.filename
  if (domObj.trimis == true && overrideTrimis == false) {
    alert('Factura ' + filename + ' a fost deja trimisa')
    return
  }
  //update btn caption to sending
  //font awesome spinner
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>Sending ' + filename + '...'
  //alter domObj filename with postfix
  domObj.filename = getNewFilenamePostfix(domObj.filename, row)
  await sendInvoice(row.findoc, domObj, overrideTrimis).then(async (response) => {
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
      markInvoiceAsSent(row.findoc, domObj.filename)
    }
  })
  //update btn caption to sent
  button.innerHTML = 'Sent Invoice file ' + filename
  //find cell class="trimis" in current row and add date now and green check
  var trimis = tr.getElementsByClassName('trimis')[0]
  trimis.innerHTML =
    '<i class="fas fa-xl fa-check-circle has-text-success"></i>  ' +
    new Date().toISOString().slice(0, 19).replace('T', ' ')
}

async function markInvoiceAsSent(findoc, xmlFilename) {
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
  body['KEY'] = findoc
  body['DATA'] = {}
  body['DATA']['MTRDOC'] = [{ CCCXMLFile: xmlFilename }]
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
}

async function sendInvoice(findoc, domObj, overrideTrimis = false) {
  var response = { success: false, xml: '' }
  var localStorageRetailer
  try {
    localStorageRetailer = trdrRetailerFromUrl
  } catch (err) {
    alert('Please select a retailer')
    return
  }

  console.log('localStorageRetailer', localStorageRetailer)

  if (domObj.trimis == false || overrideTrimis == true) {
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

function getNewFilenamePostfix(filename, row) {
  var postfixElem = document.getElementById(row.fincode + '_postfix')
  var posfixVal = ''
  try {
    posfixVal = postfixElem.value
    console.log('posfix', posfixVal)
  } catch (err) {
    console.log('no postfix')
  }
  //filename like INVOIC_17713_VAT_RO25190857.xml; split before_vat then add postfix then add _vat...
  var split = filename.split('_')
  //get INVOIC_17713 then add _postfix then add _VAT...
  var newFilename = posfixVal
    ? split[0] + '_' + split[1] + posfixVal + '_' + split[2] + '_' + split[3]
    : filename

  return newFilename
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

function validateParams(jsonData, trdr, sosource, fprms, series, tableBodyId) {
  const tbody = document.getElementById(tableBodyId)
  if (!tableBodyId) {
    console.error('tableBodyId is required')
    return
  }
  if (!jsonData) {
    console.error('jsonData is required')
    return
  }
  //if jsonData is not an object, return
  if (typeof jsonData !== 'object') {
    console.error('jsonData is not an object')
    return
  }

  //check for success
  if (jsonData.success == false) {
    tbody.innerHTML = ''
    var tr = tbody.insertRow()
    var td = tr.insertCell()
    td.innerHTML = 'Error: ' + jsonData.error
    td.colSpan = 9
    td.style.textAlign = 'center'
    return
  }

  //check for totalcount
  if (jsonData.totalcount == 0) {
    tbody.innerHTML = ''
    var tr = tbody.insertRow()
    var td = tr.insertCell()
    td.innerHTML = 'No data'
    td.className = 'has-text-danger has-text-centered has-text-weight-bold'
    //font 20px
    td.style.fontSize = '20px'
    td.colSpan = 9
    return
  }
}
