/*
 //SBSL:
 
Form {
    [TABLES]
    ImpTable =;;;; Master; 3; 0

    [ImpTable]
    vMess=16;64000;0;1;1;Get orders from Doc Process and create S1 documents...;;;;

    [PANELS]
    PANEL13=4;Job messages...;0;100,G10,N,L3
    [PANEL13]
    ImpTable.vMess
}

Connect Xplorer SoftOne {
  connect();

    //sql stuff
}

Var
    x, jScript, vMess;

{
    jScript = VarToStr(GetQueryResults('Softone', 'SELECT SOIMPORT FROM SOIMPORT WHERE CODE='+#39+'getDanteOrders'+#39, Null));
    x = CallPublished('SysRequest.ExecuteXScript', VarArray(XModule, 1, jScript, 'main', 4));
    vMess = 'Job done.' + Char(13) + 'Verificati comanzile si raportul pentru eventualele erori.';
    x = SendResponse(vMess ,'ImpTable.vMess');
}

 */

var folderPath = 'C:\\S1Print\\FTP\\Online\\',
  danteOutFolder = 'dante_out',
  debugg_mode = {},
  test_mode = {}

function main() {
  //teste------------------IN PRODUCTIE TOATE PE FALSE---------------------------------------------------------
  //false = no test
  test_mode.trimiteInv2DanteFromDocProc = false
  test_mode.getComDanteFromDocProc = false
  //false = no debugging messaging
  debugg_mode.trimiteInv2DanteFromDocProc = false
  debugg_mode.getComDanteFromDocProc = false
  //end teste---------------------------------------------------------------------------------------------------

  if (debugg_mode.getComDanteFromDocProc) debugger
  sfptFromDocProcess(folderPath)
  parseFolderFileList(folderPath + danteOutFolder)
}

function sfptFromDocProcess(logFldr) {
  var initialDir = '/001G_rFRDUyK4xAMVFfEFelF5WNqhBNujBx38gMmV1fVqIGLNZoQg5f/out/',
    downloadDir = folderPath + 'dante_out\\',
    winscpAction = '"get -resume ' + initialDir + 'order*.xml ' + downloadDir + ' " '

  asiguraCalea(logFldr)
  asiguraCalea(downloadDir)
  connect2SftpDocProc(logFldr, winscpAction, false)
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

function connect2SftpDocProc(logFldr, winscpAction, toBeMarked) {
  try {
    var oShell = new ActiveXObject('Shell.Application'),
      url = 'dx.doc-process.com:2222/',
      usr = 'pet_factory',
      //passphrase = 'PetFactory2021#'.replace('%', '%25').replace('#', '%23').replace(' ', '%20').replace('+', '%2B').replace('/', '%2F').replace('@', '%40').replace(':', '%3A').replace(';', '%3B'),
      passphrase = 'PetFactory2021#',
      priv = '',
      nume_priv = 'Private Key.ppk',
      fingerprint = 'ssh-rsa 2048 BgJCCAEN43vo4+AL1uCvW4MNUioITEQ5+W10ubLAeUs=',
      wd = '',
      sFile = '',
      winscpComm = '',
      vArguments = '',
      vDirectory = '',
      vOperation = 'open',
      vShow = 0,
      WshShell = new ActiveXObject('WScript.Shell')
    wd = WshShell.CurrentDirectory
    priv = wd + '\\' + nume_priv
    winscpComm =
      '"open sftp://' +
      usr +
      '@' +
      url +
      ' -hostkey=""' +
      fingerprint +
      '"" -privatekey=""' +
      priv +
      '"" -passphrase=""' +
      passphrase +
      '"" -rawsettings AuthKI=0 AuthGSSAPIKEX=1 GSSAPIFwdTGT=1" ' +
      winscpAction +
      '"exit"'
    vArguments =
      ' /log="' +
      logFldr +
      'WinSCP.log" /xmllog="' +
      logFldr +
      'WinSCP.xml" /loglevel=0 /nointeractiveinput /ini=nul /command ' +
      winscpComm
    sFile = wd + '\\WinSCP.com'

    oShell.ShellExecute(sFile, vArguments, vDirectory, vOperation, vShow)
    if (debugg_mode.trimiteInv2DanteFromDocProc || debugg_mode.getComDanteFromDocProc) X.WARNING(vArguments)
    if (toBeMarked) markItAsSentDate()
    return true
  } catch (e) {
    X.WARNING(e.message)
    return false
  }
}

function markItAsSentDate() {
  X.RUNSQL('update mtrdoc set CCCXMLSendDate=GETDATE() where findoc=' + SALDOC.FINDOC, null)
}

function parseFolderFileList(folderspec) {
  var fso, f, fc
  fso = new ActiveXObject('Scripting.FileSystemObject')
  f = fso.GetFolder(folderspec)
  fc = new Enumerator(f.files)
  for (; !fc.atEnd(); fc.moveNext()) {
    processXML(fc.item().Path, null)
  }
}

function processXML(xmlFile, xmlStr) {
  var xmlDoc = new ActiveXObject('Msxml2.DOMDocument.6.0')
  xmlDoc.async = false
  if (xmlFile) xmlDoc.load(xmlFile)
  else if (xmlStr) xmlDoc.loadXML(xmlStr)

  createTblForXmlErr()

  if (xmlDoc.parseError.errorCode != 0) {
    var myErr = xmlDoc.parseError
    if (xmlFile) postXmlErr(myErr.reason, xmlFile)
    else if (xmlStr) postXmlErr(myErr, xmlStr)
    return
  } else {
    myErr = xmlDoc.parseError
    if (myErr.errorCode != 0) {
      if (xmlFile) postXmlErr(myErr.reason, xmlFile)
      else if (xmlStr) postXmlErr(myErr, xmlStr)
      return
    }
  }

  xmlDoc.setProperty('SelectionLanguage', 'XPath')

  var orderID = xmlDoc.selectNodes('Order/ID').item(0).text,
    orderDate = xmlDoc.selectNodes('Order/IssueDate').item(0).text,
    CustomerEndpoint = xmlDoc.selectNodes('Order/BuyerCustomerParty/EndpointID').item(0).text

  createTblForXmlBak()

  //daca nu este dante endpoint
  if (CustomerEndpoint != '5949129999992') {
    return
  }

  var deja = X.SQL(
    'select top 1 findoc from findoc where series=7012 and trdr = 11639 and num04=' + orderID,
    null
  )
  //daca a fost introdus deja
  if (!test_mode.getComDanteFromDocProc && deja) {
    markXmlAsOrderCreatedAndDelFile(orderID, true, xmlFile)
    return
  }

  //backup xml to db before doing anything else
  bakXmlToDB(xmlDoc.xml, orderID, orderDate)

  var endpoint = xmlDoc.selectNodes('Order/DeliveryParty/EndpointID').item(0).text,
    delivdate = xmlDoc.selectNodes('Order/RequestedDeliveryPeriod/EndDate').item(0).text,
    coduriArticole = xmlDoc.selectNodes('Order/OrderLine/Item/BuyersItemIdentification'),
    canitati = xmlDoc.selectNodes('Order/OrderLine/Quantity/Amount'),
    preturi = xmlDoc.selectNodes('Order/OrderLine/Price/Amount'),
    denumiri = xmlDoc.selectNodes('Order/OrderLine/Item/Description'),
    denumiriPet = xmlDoc.selectNodes('Order/OrderLine/Item/SellersItemIdentification'),
    sume = xmlDoc.selectNodes('Order/OrderLine/LineExtensionAmount/Amount')

  var odoc = X.CREATEOBJFORM('SALDOC')
  try {
    var f = odoc.findTable('FINDOC'),
      l = odoc.findTable('ITELINES'),
      m = odoc.findTable('MTRDOC')
    odoc.dbinsert
    f.edit
    f.series = 7012
    f.trdr = 11639
    //livrare functie de endpoint
    var deliveryBranches = X.GETSQLDATASET(
      'select trdbranch, cccs1dxgln from trdbranch where trdr=11639 and isactive=1',
      null
    )
    deliveryBranches.FIRST
    while (!deliveryBranches.EOF) {
      if (deliveryBranches.CCCS1DXGLN == endpoint) {
        f.trdbranch = deliveryBranches.trdbranch
        break
      }
      deliveryBranches.NEXT
    }
    if (orderID) f.NUM04 = orderID
    if (orderDate) f.DATE01 = orderDate
    if (delivdate) m.DELIVDATE = delivdate
    for (var i = 0, errCnt = 0; i < coduriArticole.length; i++) {
      var idArticol = X.SQL(
        "select mtrl from CCCS1DXTRDRMTRL where trdr=11639 and code='" + coduriArticole.item(i).text + "'",
        null
      )
      if (idArticol) {
        l.append
        l.MTRL = idArticol
        l.QTY1 = parseFloat(canitati.item(i).text)
        l.PRICE = parseFloat(preturi.item(i).text)
        l.post
      } else {
        if (errCnt == 0) {
          var new_masterid = getFirstAvailMasterid()
          X.RUNSQL(
            'insert into [dbo].[A_IKA_ORDER] (trdr, trdbranch, cusname, whouse, iscancel, apprv, branch, series, imported, imptype, comanda, cccs1dxid, orderdate, ' +
              "filename, masterid, delivdate) values (11639, 3329, 'Dante', 1001, 0, 0, 1000, 7012, 0, 'Doc Process', " +
              orderID +
              ', ' +
              orderID +
              ", '" +
              orderDate +
              "', '" +
              xmlFile +
              "', " +
              new_masterid +
              ", '" +
              delivdate +
              "')",
            null
          )
        }

        X.RUNSQL(
          "insert into [dbo].[A_Ika_OrderDetail] (imptype, masterid, filename,qty1, price, LINEVAL, comments1, ean, comments, _matcode) values ('Doc Process', " +
            new_masterid +
            ",'" +
            xmlFile +
            "'," +
            parseFloat(canitati.item(i).text) +
            ', ' +
            parseFloat(preturi.item(i).text) +
            ',' +
            parseFloat(sume.item(i).text) +
            ",'" +
            coduriArticole.item(i).text +
            "','" +
            coduriArticole.item(i).text +
            "','" +
            denumiri.item(i).text +
            "', '" +
            denumiriPet.item(i).text +
            "')",
          null
        )
        errCnt++
      }
    }

    //exista erori, abort order creation, but mark it
    if (errCnt) {
      return
    } else {
      var id = odoc.dbPost
      //var id = odoc.showObjForm;
      if (id) {
        markXmlAsOrderCreatedAndDelFile(orderID, true, xmlFile)
      }
    }
  } catch (e) {
    X.WARNING(e.message)
  } finally {
    odoc.free
    odoc = null
  }

  function getFirstAvailMasterid() {
    return X.SQL(
      'SELECT top 1 n FROM (SELECT ROW_NUMBER() OVER (ORDER BY masterid) AS n FROM A_IKA_ORDER) n LEFT JOIN A_IKA_ORDER cda ON (n.n = cda.masterid) WHERE cda.masterid IS NULL',
      null
    )
  }

  function markXmlAsOrderCreatedAndDelFile(orderId, created, xmlFile) {
    var i = created ? 1 : 0
    X.RUNSQL('update CCCDOCPROCDANTEXML set orderCreated = ' + i + ' where orderID=' + orderId, null)

    if (created) {
      //delete file from local
      if (!test_mode.getComDanteFromDocProc) delFile(xmlFile)
    }
  }

  function delFile(file) {
    var fso = new ActiveXObject('Scripting.FileSystemObject'),
      f2 = fso.GetFile(file)
    //f2.Copy ("c:\\Somth\\Bak");
    f2.Delete()
  }

  function createTblForXmlBak() {
    var createTblQ =
        'create table CCCDOCPROCDANTEXML (CCCDOCPROCDANTEXML int not null identity(1,1) primary key, dataExtractie datetime not null default getDate(), xml varchar(max) not null, ' +
        'orderID int not null, orderDate date not null, orderCreated smallint default 0)',
      theQ = "if OBJECT_ID('dbo.CCCDOCPROCDANTEXML') is null " + createTblQ

    X.RUNSQL(theQ, null)
  }

  function createTblForXmlErr() {
    var createTblQ =
        'create table CCCDOCPROCDANTEXMLERR (CCCDOCPROCDANTEXMLERR int not null identity(1,1) primary key, dataExtractie datetime not null default getDate(), xmlFile varchar(max) not null, ' +
        'err varchar(max) not null)',
      theQ = "if OBJECT_ID('dbo.CCCDOCPROCDANTEXMLERR') is null " + createTblQ

    X.RUNSQL(theQ, null)
  }

  function bakXmlToDB(xml, idCom, dataCom) {
    var doStuff =
      "insert into CCCDOCPROCDANTEXML (xml, orderID, orderDate) values ('" +
      xml +
      "', " +
      idCom +
      ",'" +
      dataCom +
      "')"
    //do not duplicate pretty please
    if (!X.SQL('select orderID from CCCDOCPROCDANTEXML where orderID = ' + idCom, null))
      X.RUNSQL(doStuff, null)
  }

  function postXmlErr(err, xmlFile) {
    var doStuff = "insert into CCCDOCPROCDANTEXMLERR (xmlFile, err) values ('" + xmlFile + "', '" + err + "')"
    X.RUNSQL(doStuff, null)
  }
}
