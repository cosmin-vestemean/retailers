//Cod specific S1 - AJS
const eMagMarketplaceBatchSize = 10
var ftpQueue = []
folderPath = 'C:\\S1Print\\FTP\\Online\\'

function processEmagMarketplace(selectedDocsArr) {
  var batchSize = eMagMarketplaceBatchSize
  for (var i = 0; i < selectedDocsArr.length; i += batchSize) {
    var vSelRecsArrBatch = []
    vSelRecsArrBatch = selectedDocsArr.slice(i, i + batchSize)
    //debugger
    //if last batch redim eMagMarketplaceBatchSize to the actual length
    if (i + batchSize > selectedDocsArr.length) {
      batchSize = selectedDocsArr.length - i
    }
    //debugger
    trimiteSelectateLaEmag(vSelRecsArrBatch, batchSize)
    X.PROCESSMESSAGES
  }
}

function trimiteSelectateLaEmag(batch, batchSize) {
  var startTime = new Date().getTime()
  var startDateTime = new Date()
  ftpQueue = []
  //debugger
  var errors = []
  var msg = []
  var msgAndErr = []

  for (var i = 0; i < batch.length; i++) {
    //debugger
    var currentFindoc = batch[i]
    //create a new SALDOC object
    var sal = X.CreateObj('SALDOC')
    try {
      sal.DBLocate(currentFindoc)
      var findocTbl = sal.findTable('FINDOC')
      var series = findocTbl.SERIES
      var agent = findocTbl.SALESMAN
      var fincode = findocTbl.FINCODE
      var trimis = findocTbl.CCCTRIMIS
      //documentul trebuie sa fie din seria 7033 si sa aiba agentul 170, altfel continuam cu urmatorul
      if (series != 7033) {
        continue
      } else if (agent != 170) {
        errors.push('Factura ' + fincode + ' nu are agentul CLIENTI EMAG.')
        continue
      } else if (trimis) {
        errors.push('Factura ' + fincode + ' a fost deja trimisa.')
        continue
      }
      var resp
      resp = printAndFtp('SALDOC', 107, folderPath, currentFindoc, batchSize, {
        startTime: startTime,
        startDateTime: startDateTime
      })
      if (resp) msg.push(resp)
    } catch (e) {
      errors.push(currentFindoc)
    } finally {
      sal.free
      sal = null
    }
    X.PROCESSMESSAGES
  }

  if (errors.length) {
    msgAndErr.push('Erori la trimiterea facturilor:\n' + errors.join('\n'))
  }

  if (msg.length) {
    msgAndErr.push('Mesaje:\n' + msg.join('\n'))
  }
  if (msgAndErr.length) X.WARNING(msgAndErr.join('\n'))
}

function printAndFtp(strModul, printTemplate, fldr, findoc, batchSize, startDetails) {
  var startOfBatch = startDetails.startTime
  var startDateTime = startDetails.startDateTime
  if (!findoc) return 'Nu exista document de procesat.\n'
  var msg = []
  asiguraCalea(fldr)
  var pdfFile = '',
    num04 = '',
    fincode = ''
  var resp = printInvoice(strModul, printTemplate, findoc)
  if (resp) {
    //check for keys
    if (Object.keys(resp).length) {
      if (resp.hasOwnProperty('pdfFile')) pdfFile = resp.pdfFile
      if (resp.hasOwnProperty('fincode')) fincode = resp.fincode
      if (resp.hasOwnProperty('num04')) num04 = resp.num04
    } else {
      msg.push('Factura ' + findoc + ' nu a putut fi tiparita in PDF.')
    }
  } else {
    msg.push('Factura ' + findoc + ' nu a putut fi tiparita in PDF.')
  }
  if ((pdfFile, fincode, num04)) {
    var url = 'https://ftp.petfactory.ro/petfactortypdf/' + fincode + '.pdf'
    if (!urlExists(url)) {
      url = ftpPdf(pdfFile, fincode)
    }

    //debugger
    if (url) {
      ftpQueue.push({ url: url, num04: num04, findoc: findoc, fincode: fincode })
      if (ftpQueue.length == batchSize) {
        eMag_publishURL(ftpQueue, { startTime: startOfBatch, startDateTime: startDateTime }, batchSize)
      }
    } else {
      msg.push('Factura ' + fincode + ' nu a putut fi incarcata pe FTP.')
    }
  } else {
    if (fincode) {
      msg.push('Factura ' + fincode + ' nu a putut fi tiparita in PDF.')
    } else {
      msg.push('Factura ' + findoc + ' nu a putut fi tiparita in PDF.')
    }
  }

  return msg.join('\n')
}

function printInvoice(strModul, printTemplate, findoc) {
  if (findoc) {
    try {
      asiguraCalea(folderPath)
      sal = X.CreateObj(strModul)
      sal.DBLocate(findoc)
      var findocTbl = sal.FINDTABLE('FINDOC')
      var fincode = findocTbl.FINCODE
      //verifica in ftp daca exista deja; daca exista in https://ftp.petfactory.ro/petfactortypdf/fincode.pdf returneaza url-ul
      var url = 'https://ftp.petfactory.ro/petfactortypdf/' + fincode + '.pdf'
      if (urlExists(url)) {
        return { pdfFile: url, fincode: findocTbl.FINCODE, num04: findocTbl.NUM04 }
      }
      pdfFile = folderPath + fincode + '.pdf'
      sal.PRINTFORM(printTemplate, 'PDF file', pdfFile)
      return { pdfFile: pdfFile, fincode: findocTbl.FINCODE, num04: findocTbl.NUM04 }
    } catch (e) {
      X.WARNING(e.message)
      return null
    }
  } else {
    return false
  }
}

function urlExists(url) {
  var http = new ActiveXObject('Msxml2.XMLHTTP')
  http.open('GET', url, false)
  http.send()
  return http.status != 404
}

function ftpPdf(fisier, fincode) {
  try {
    //debugger;
    var shell = new ActiveXObject('WScript.Shell')
    //get current directory
    var currentDir = shell.CurrentDirectory
    var winscpexe = currentDir + '\\WinSCP.com'
    var command =
      '"' +
      winscpexe +
      '" /xmllog=log.xml /log=' +
      folderPath +
      'WinSCP.log /command "open ftp://petfactortypdf@petfactory.ro:1#kBsWpGZI51@ftp.petfactory.ro" "put -delete ' +
      fisier +
      '" "exit"'
    shell.Run(command, 0, true)
    var doc = new ActiveXObject('MSXML2.DOMDocument')
    doc.async = false
    doc.load('log.xml')
    doc.setProperty('SelectionNamespaces', "xmlns:w='http://winscp.net/schema/session/1.0'")
    var nodes = doc.selectNodes('//w:upload')
    var success = false
    for (var i = 0; i < nodes.length; ++i) {
      var filename = nodes[i].selectSingleNode('w:filename/@value').value
      if (filename === fisier) {
        success = true
        break
      }
    }
    if (success) {
      return 'https://ftp.petfactory.ro/petfactortypdf/' + fincode + '.pdf'
    } else {
      return false
    }
  } catch (e) {
    X.WARNING(e.message)
    return false
  }
}

function eMag_publishURL(linksToSend, startDetails, batchSize) {
  try {
    var xmlhttp = new ActiveXObject('MSXML2.XMLHTTP.6.0')
    xmlhttp.open('POST', 'https://marketplace-api.emag.ro/api-3/order/attachments/save', true)
    xmlhttp.setRequestHeader(
      'Authorization',
      'Basic b3ZpZGl1LnR1dHVuYXJ1QHBldGZhY3Rvcnkucm86ZnJlZWRvbTMxMg=='
    )
    xmlhttp.setRequestHeader('Content-Type', 'application/json')
    xmlhttp.onreadystatechange = handleEmagAPIResponse(xmlhttp, linksToSend, startDetails, batchSize)

    var dataToSend = composeJSON(linksToSend)

    xmlhttp.send(dataToSend)
    ftpQueue = []
  } catch (err) {
    msg.push(err.message)
  }
}

function handleEmagAPIResponse(xmlhttp, linksToSend, startDetails, batchSize) {
  return function () {
    var emagAPImessages = []
    //write to log
    //create or append if exists
    //var logFile = folderPath + 'emagAPIlog.txt'
    //make it daily
    var f = connectToLog()
    if (xmlhttp.readyState == 4) {
      var currentDate = new Date()
      var dateString =
        currentDate.getDate() + '/' + (currentDate.getMonth() + 1) + '/' + currentDate.getFullYear()
      var timeString =
        currentDate.getHours() + ':' + currentDate.getMinutes() + ':' + currentDate.getSeconds()
      f.WriteLine(
        '\n\n' + dateString + ' ' + timeString + ' - ' + xmlhttp.status + ' - ' + xmlhttp.responseText
      )
      var startTime = startDetails.startTime
      var startDateTime = startDetails.startDateTime
      var stopTime = new Date().getTime()
      var duration = (stopTime - startTime) / 1000
      //add start, stop and duration in seconds, human readable
      f.WriteLine('Start: ' + startDateTime)
      f.WriteLine('Stop: ' + currentDate)
      f.WriteLine('Duration: ' + duration + ' seconds')
      if (xmlhttp.status == 200) {
        /*
      {
        "isError": false,
        "messages": [],
        "results": []
      }
      */
        eval('var o = ' + xmlhttp.responseText)
        if (o.isError) {
          var messages = o.messages,
            results = o.results,
            strM = ''
          //messages
          if (messages.length) {
            strM = messages.join('\n')
          }
          if (results.length) {
            for (var i = 0; i < results.length; i++) {
              strM += '\n' + JSON.stringify(results[i])
            }
          }
          //markItAsSent(0, findoc)
          //X.WARNING('Eroare la transmitere link factura.\n' + strM)
          emagAPImessages.push(strM)
          f.WriteLine(strM)
        } else {
          //markItAsSent(1, findoc)
          //emagAPImessages.push('Factura ' + fincode + ' a fost trimisa cu succes.')
          for (let i = 0; i < linksToSend.length; i++) {
            markItAsSent(1, linksToSend[i].findoc)
            emagAPImessages.push('Factura ' + linksToSend[i].fincode + ' a fost trimisa cu succes.')
          }
          //X.WARNING(emagAPImessages.join('\n'))
          f.WriteLine(emagAPImessages.join('\n'))
          //debugger;
          ftpQueue = []
        }
      } else if (xmlhttp.readyState == 4 && xmlhttp.status != 200) {
        //markItAsSent(0, findoc)
        //X.WARNING('Eroare la transmitere link factura.\n' + xmlhttp.responseText)
        emagAPImessages.push('Eroare la transmitere link factura ' + fincode + '.\n' + xmlhttp.responseText)
        if (crt == last) {
          //X.WARNING(emagAPImessages.join('\n'))
          f.WriteLine(emagAPImessages.join('\n'))
        }
      }
    }
    f.Close()
    if (batchSize != eMagMarketplaceBatchSize) {
      //open file for display
      fso = new ActiveXObject('Scripting.FileSystemObject')
      var logFile = folderPath + 'emagAPIlog' + new Date().toISOString().split('T')[0] + '.txt'
      if (fso.FileExists(logFile)) {
        var shell = new ActiveXObject('WScript.Shell')
        shell.Run(logFile)
      }
    }
  }
}

function connectToLog() {
  var logFile = folderPath + 'emagAPIlog' + new Date().toISOString().split('T')[0] + '.txt'
  var f
  var fso = new ActiveXObject('Scripting.FileSystemObject')
  //check if it's open
  if (fso.FileExists(logFile)) {
    f = fso.OpenTextFile(logFile, 8, false)
    f.Close()
  }
  f = fso.OpenTextFile(logFile, 8, true)
  return f
}

function composeJSON(linksToSend) {
  var r = {
    data: []
  }

  for (var i = 0; i < linksToSend.length; i++) {
    var o = {
      order_id: linksToSend[i].num04,
      name: linksToSend[i].fincode,
      url: linksToSend[i].url,
      type: 1 //invoice
    }
    r.data.push(o)
  }

  return JSON.stringify(r)
}

function markItAsSent(sent, findoc) {
  //debugger
  if (findoc && findoc > 0) {
    X.RUNSQL('update findoc set CCCTRIMIS=' + sent + ' where findoc=' + findoc, null)
  } else return 'Documentul ' + findoc + ' nu a fost marcat ca trimis.'
}

function asiguraCalea(fldr) {
  var parts = fldr.split('\\'),
    c = parts[0],
    fso = new ActiveXObject('Scripting.FileSystemObject')
  for (var i = 1; i < parts.length - 1; i++) {
    c += '\\' + parts[i]
    if (!fso.FolderExists(c)) fso.CreateFolder(c)
  }
}
