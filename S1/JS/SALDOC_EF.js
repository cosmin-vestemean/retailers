/*
 * https://winscp.net/download/WinSCP-5.19.3-Portable.zip
 */

lib.include('runCmd20210915')

var zoomed = false,
  objABC = {},
  aDoua = false,
  itsMeStackOverflow = false,
  danteOutFolder = 'dante_out',
  pdfFile = ''
//end teste---------------------------------------------------------------------------------------------------

function exportXML() {
  //testjs('test apel');
  //var a = ShowMessage('This is a warning message');
  var id = getID()
  X.CANCELEDITS
  var tempfolder = 'c:\\Temp'
  CheckFolder(tempfolder)

  DsP1 = X.GETSQLDATASET(
    "SELECT convert(varchar(10), CCCXMLSendDate,103) CCCXMLSendDate, left(replace(trdr.name,' ',''),8) name from findoc join mtrdoc on findoc.findoc=mtrdoc.findoc join trdr on findoc.trdr=trdr.trdr where findoc.findoc=" +
      id,
    null
  )
  CCCXMLSendDate = DsP1.CCCXMLSendDate
  tempfolder = DsP1.name
  tempfolder = 'c:\\ReadXMLFiles\\Upload\\' + tempfolder

  DsP1 = null

  if (CCCXMLSendDate != '' && CCCXMLSendDate != null) {
    X.EXCEPTION('Documentul a trimis ! ' + CCCXMLSendDate)
    return
  }

  sql = 'exec dbo.G_XML_ExportDoc ' + id
  var ds
  try {
    ds = X.GETSQLDATASET(sql, null)
  } catch (e) {
    X.EXCEPTION(e.message)
    return
  }

  if (SALDOC.ISNULL('DATE01')) {
    X.EXCEPTION('Lipsa data comanda!')
    Ds = null
    return
  }
  if (SALDOC.ISNULL('NUM04')) {
    X.EXCEPTION('Lipsa numar comanda!')
    Ds = null
    return
  }
  if (MTRDOC.ISNULL('CCCDispatcheDoc')) {
    X.EXCEPTION('Lipsa document/aviz livrare!')
    Ds = null
    return
  }
  if (MTRDOC.ISNULL('CCCDispatcheDate')) {
    X.EXCEPTION('Lipsa data document/aviz livrare!')
    Ds = null
    return
  }

  if (ds.RecordCount == 0) {
    X.EXCEPTION('Lipsa date de transmis!')
    Ds = null
    return
  }

  var fileName = ds.FileName
  var isFTP = ds.isFTP
  var filePath = ds.filePath
  var ERRORMSG = ds.ERRORMSG
  var xmlData = ds.xmlData

  if (ERRORMSG != '') {
    X.EXCEPTION(ERRORMSG)
    Ds = null
    return
  }

  var ds22, sql1
  sql1 = 'select CCCXMLfile from mtrdoc where findoc=' + id

  ds22 = X.GETSQLDATASET(sql1, null)
  xmlData = ds22.CCCXMLfile
  ds22 = null

  //xmlData = GetQueryResults('SoftOne', sql1, null);

  if (xmlData == '' || xmlData == null) {
    X.EXCEPTION('Nu exista date de trimis')
    Ds = null
    return
  }

  CheckFolder(tempfolder)
  Ds = null

  if (SALDOC.TRDR != 11322) {
    //fara carrfour
    CheckFolder(filePath)
  }
  var fso, f1
  var fileName_Temp = tempfolder + '\\' + 'fisierExport.xml'
  var FisFinal = filePath + fileName

  if (SALDOC.TRDR != 11322) {
    SaveStringToFile(fileName_Temp, xmlData)
    fso = new ActiveXObject('Scripting.FileSystemObject')
    f2 = fso.GetFile(fileName_Temp)
    f2.Copy(FisFinal, true)
    fso = null
  } else {
    fileName_Temp = tempfolder + '\\' + fileName
    SaveStringToFile(fileName_Temp, xmlData)
    SaveStringToFTPFile(fileName_Temp, tempfolder, fileName)
  }

  //X.Warning('fisierul a fost trimis '+fileName+' !');
  X.RUNSQL('update mtrdoc set CCCXMLSendDate=GETDATE(), CCCXMLfile=null where findoc=' + SALDOC.FINDOC, null)
}

function parseLocalNum(num) {
  var rez = num
  var sir = 'Number(Replace(' + num + ", ',' " + ", '.' ))"
  //X.Warning(sir);
  rez = X.EVAL(sir)
  //X.WARNING(rez);
  rez = rez + 0.0
  //X.WARNING(rez);
  return rez
}

// carrefour
function SaveStringToFTPFile(temp_filename, tempfolder, fileName) {
  var id = getID()
  var DsP1 = X.GETSQLDATASET(
    'SELECT trdr.CCCFtpServer, trdr.CCCFtpUser, trdr.CCCFtpPwd, CCCFtpPath from findoc join trdr on findoc.trdr=trdr.trdr where findoc.findoc=' +
      id,
    null
  )
  var CCCFtpServer = DsP1.CCCFtpServer
  var CCCFtpUser = DsP1.CCCFtpUser
  var CCCFtpPwd = DsP1.CCCFtpPwd
  var CCCFtpPath = DsP1.CCCFtpPath
  DsP1 = null

  var ftpText, ftpcmd, ftpFileCmd, WshShell
  ftpText = 'open ' + CCCFtpServer + '\n'
  ftpText += 'user ' + CCCFtpUser + '\n'
  ftpText += CCCFtpPwd + '\n'
  ftpText += 'binary' + '\n'
  ftpText += 'put ' + temp_filename + ' ' + CCCFtpPath + fileName + '\n'
  ftpText += 'bye' + '\n'

  var ftpFileScript = tempfolder + '\\' + 'scriptFTP.scr'

  //SaveStringToFile(ftpFileScript, ftpText);

  /*
    //pe ftp la carrfoue nu merge
    ftpFileCmd=tempfolder+'\\'+'copytoFTP.cmd';
    ftpcmd='@echo off '+'\n';
    ftpcmd+='echo.'+'\n';
    ftpcmd+='c:'+'\n';
    ftpcmd+='cd '+tempfolder+'\n';
    ftpcmd+='ftp -n -s:scriptFTP.scr'+'\n';
    ftpcmd+='echo.'+'\n';
    ftpcmd+='cmd/k'+'\n';
     */

  var ftpFileNameCmd = tempfolder + '\\' + 'gmcSendToFTP.exe'
  CheckFileExists(ftpFileNameCmd)

  ftpFileCmd = tempfolder + '\\' + 'copytoFTP.cmd'
  ftpcmd = '@echo off ' + '\n'
  ftpcmd += 'c:' + '\n'
  ftpcmd += 'cd ' + tempfolder + '\n'
  ftpcmd += '@echo on ' + '\n'
  //ftpcmd+='gmcSendToFTP.exe '+fileName+'.test'+' noexit'+'\n';
  ftpcmd += 'gmcSendToFTP.exe ' + fileName + '\n'
  ftpcmd += 'cmd/k' + '\n'

  SaveStringToFile(ftpFileCmd, ftpcmd)

  //ftpFileCmd= ftpFileNameCmd +'\\'+fileName+'.test'+' noexit';
  WshShell = new ActiveXObject('WScript.Shell')
  WshShell.Run(ftpFileCmd, 1, true)

  WshShell = null
}

function getID() {
  vID = SALDOC.FINDOC
  if (vID < 0) vID = X.NEWID
  return vID
}

function CheckFileExists(FileName) {
  var rez, fso, msg
  fso = new ActiveXObject('Scripting.FileSystemObject')

  if (fso.FileExists(FileName)) {
    rez = 1
  } else {
    msg = ' nu exista fisierul! ' + FileName
    X.EXCEPTION(msg)
  }
  fso = null
}

function CheckFolder(FolderName) {
  var rez, fso, msg
  fso = new ActiveXObject('Scripting.FileSystemObject')

  if (fso.FolderExists(FolderName)) {
    rez = 1
  } else {
    msg = ' nu exista folderul! ' + FolderName
    X.EXCEPTION(msg)
  }
  fso = null
}

function ON_AFTERPOST() {
  var vID = SALDOC.FINDOC
  if (vID < 0) vID = X.NEWID
  //USRID = X.SYS.USER;
  /*
    var startOraG = new Date().getTime();
    X.RUNSQL('exec G_FINDOC_POST ' + vID + ', ' + SALDOC.COMPANY + ', ' + USRID, null);
    var stopOraG = new Date().getTime(),
    durataExecSG = (stopOraG - startOraG) / 1000;
    recPerf(durataExecSG, getID(), ITELINES.RECORDCOUNT, X.SYS.USER, 'G_FINDOC_POST');
     */

  //am elimiat rularea proc G_FINDOC_POST din afterpost, se muta intr-un job care ruleaza automat.
  //Insemnez doc astfel: Daca exista findoc in tabelul CCCFINDOCPOST job-ul ruleaza procedura si apoi scoate findoc din tabel.
  var createTblQ =
      'create table CCCFINDOCPOST (CCCFINDOCPOST int not null identity(1,1) primary key, findoc int not null, trndate date not null, fincode varchar(max) not null)',
    theQ = "if OBJECT_ID('dbo.CCCFINDOCPOST') is null " + createTblQ

  try {
    X.RUNSQL(theQ, null)
  } catch (err) {
    X.WARNING('Eroare la creare tabel CCCFINDOCPOST:\n' + err.message)
  }

  var markDoc =
      'insert into CCCFINDOCPOST (findoc, trndate, fincode) values (' +
      vID +
      ", '" +
      X.FORMATDATE('yyyymmdd', SALDOC.TRNDATE) +
      "', '" +
      SALDOC.FINCODE +
      "')",
    theQ = X.SQL('select isnull(findoc, 0) from CCCFINDOCPOST where findoc=' + vID, null) ? '' : markDoc

  try {
    if (theQ) X.RUNSQL(theQ, null)
  } catch (err) {
    X.WARNING('Eroare la marcare document pentru afterjobs:\n' + err.message)
  }

  sSQL = X.GETSQLDATASET(
    'select unitpack AS UP from CCCS1DXTRDRMTRL where mtrl=' + ITELINES.MTRL + ' and trdr=' + SALDOC.TRDR,
    null
  )
  X.RUNSQL(
    'UPDATE MTRLINES SET CCCUNITPACK=' +
      String.fromCharCode(39) +
      sSQL.UP +
      String.fromCharCode(39) +
      'WHERE MTRL=' +
      ITELINES.MTRL +
      'AND FINDOC=' +
      vID,
    null
  )

  saveABC()
  aDoua = true
}

function ON_POST() {
  if (SALDOC.SERIES == 7022) {
    if (SALDOC.NUM04) {
      //verifica daca exista numarul de comanda online in tabelul findoc pt seria 7022, comanda online nu poate fi duplicata
      var qd = X.SQL('select count(*) from findoc where series=7022 and num04=' + SALDOC.NUM04, null)
      if (qd > 0) {
        X.EXCEPTION('Comanda online ' + SALDOC.NUM04 + ' a mai introdusa anterior!')
      }
    }
  }
  //am findocs = comanda aferenta in linii; update fullytransf comanda =1
  //protectie dublare: daca am o factura care provine din comanda findocs atunci tell WMS beautiful lies; cum?
  //daca pun un X.EXCEPTION primeste succes:false;
  //doar la introducerea unei facturi, nu si la resalvare
  if (SALDOC.FINDOC < 0 && (SALDOC.SERIES == 7111 || SALDOC.SERIES == 7031 || SALDOC.SERIES == 7033)) {
    ITELINES.FIRST
    if (ITELINES.FINDOCS) {
      var factExistenta =
        'select top 1 isnull(a.findoc, 0) findoc from mtrlines a inner join findoc b on (a.findoc=b.findoc and a.sosource=b.sosource) ' +
        'where b.sosource = 1351 and (b.SERIES = 7111  or b.SERIES = 7031 or b.SERIES = 7033) and a.findocs=' +
        ITELINES.FINDOCS
      var fin = X.SQL(factExistenta, null)
      if (fin > 0) {
        X.EXCEPTION('Factura deja exista in ERP cu id:' + fin + '.\nDublare refuzata.')
      }
    } else {
      //X.EXCEPTION('Nu exista FINDOCS in linii.');
    }
  }

  var findocs = 0
  ITELINES.FIRST
  while (!ITELINES.EOF()) {
    if (findocs == 0) {
      if (ITELINES.FINDOCS != null && ITELINES.FINDOCS != 0 && ITELINES.FINDOCS != '') {
        findocs = ITELINES.FINDOCS
      }
    }
    ITELINES.NEXT
  }
  //X.WARNING(findocs);
  ITELINES.FIRST
  while (!ITELINES.EOF()) {
    if (ITELINES.FINDOCS == null || ITELINES.FINDOCS == 0 || ITELINES.FINDOCS == '') {
      if (findocs > 0) {
        ITELINES.FINDOCS = findocs
      }
    }

    if (
      (SALDOC.SERIES == 9221 || SALDOC.SERIES == 7531) &&
      (ITELINES.FINDOCL == null || ITELINES.FINDOCL == '')
    ) {
      X.EXCEPTION('Completati Document storno pentru articolul ' + ITELINES.MTRL_ITEM_NAME)
    }

    if (
      (SALDOC.SERIES == 9221 || SALDOC.SERIES == 7531) &&
      ITELINES.FINDOCL != null &&
      ITELINES.FINDOCL != ''
    ) {
      var Mtr =
        'select sum(qty1) QTY1 from mtrtrn where findoc=' + ITELINES.FINDOCL + ' and mtrl=' + ITELINES.MTRL
      var Qty1 = X.SQL(Mtr, null)

      if (ITELINES.QTY1 > Qty1) {
        X.EXCEPTION(
          'Nu puteti returna mai mult decat cantitatea din documentul storno, pentru articolul' +
            ITELINES.MTRL_ITEM_NAME
        )
      }
    }

    ITELINES.NEXT
  }
  itereaza()

  /*ITELINES.FIRST;
    while(!ITELINES.EOF()){
    if((ITELINES.FINDOCL == null) || (ITELINES.FINDOCL == 0) || (ITELINES.FINDOCL == '')){
    if ((SALDOC.SERIES == 7531)){
    X.EXCEPTION('Completati documentul storno in linia de document!');
    }
    }
    ITELINES.NEXT;
    }*/
  //nu las sa selecteze seriile de avize custodie clienti pe acest view
  if (SALDOC.SERIES == 7132 || SALDOC.SERIES == 7133) {
    X.EXCEPTION(
      'Pe aceasta fereastra nu se pot folosi seriile de avize custodie tur si retur! Va rugam folositi meniul Custodie marfuri clienti!'
    )
  }

  //Verificare comanda deja convertita
  if (SALDOC.FPRMS == 703 || SALDOC.FPRMS == 721 || SALDOC.FPRMS == 753) {
    sSql = 'SELECT FULLYTRANSF FROM FINDOC WHERE FINDOC=' + ITELINES.FINDOCS
    ds = X.GETSQLDATASET(sSql, null)

    if (ds.FULLYTRANSF == 2) {
      X.WARNING('Comanda deja a fost convertita!')
    }
  }
  //alerta de completat picker-ul
  if (SALDOC.FPRMS == 714) {
    if (SALDOC.CCCPICKER == '' || SALDOC.CCCPICKER == null || SALDOC.CCCPICKER == 0) {
      X.EXCEPTION('Completati campul Picker depozit!')
    }
  }
  //alerta de completat metoda de livrare pe serie de document picking online
  if (SALDOC.SERIES == 7016) {
    if (SALDOC.SHIPMENT == '' || SALDOC.SHIPMENT == null || SALDOC.SHIPMENT == 0) {
      X.EXCEPTION('Completati campul "Metoda de livrare"!')
    }
  }

  //Alerta pentru completarea campului Cda Arobs/Client in cazul seriei 7022 CONL
  {
    if (SALDOC.SERIES == 7022 && (SALDOC.NUM04 == '' || SALDOC.NUM04 == null || SALDOC.NUM04 == 0))
      X.EXCEPTION('Completati campul Cda Arobs/Client')
    else {
    }
  }

  //Daca am factura sau bon fiscal de la ONLINE, creez BT - InsertNewITEDOC

  //sterge linii cu bifa DA pe BOOL01
  if (SALDOC.FPRMS == 714) {
    //X.WARNING('Trece pe aici');
    //sterge la salvare cantitatile cu 0
    ITELINES.FIRST
    while (!ITELINES.Eof) {
      if (ITELINES.BOOL01 == 1) {
        ITELINES.DELETE
        ITELINES.FIRST
      } else {
        ITELINES.NEXT
      }
    }
  }

  /*
    var startOraB64 = new Date().getTime();
    //fa rost de b64 din pdf factura, daca nu ai deja, dar doar pentru vanzari valorice
    //daca nu are deja
    if (!X.SQL('select isnull(findoc, 0) from CCCPRINTB64 where findoc =' + SALDOC.FINDOC, null)) {

    var q = "SELECT a.findoc FROM TRDTRN A JOIN TPRMS B ON A.COMPANY = B.COMPANY AND A.SODTYPE = B.SODTYPE AND A.TPRMS = B.TPRMS WHERE A.COMPANY IN (50) " +
    "AND A.SODTYPE = 13 	AND(A.TRNVAL * B.FLG02 <> 0 OR A.TRNVAL * B.FLG01 <> 0) AND a.sosource = 1351 and a.findoc = " + SALDOC.FINDOC;
    if (X.SQL(q, null)) {
    try {
    createTblPrintB64();
    var invPdf = printInvoice('SALDOC', 107),
    b64 = invPdf ? encode64(invPdf) : '';
    if (debugg_mode.getComDanteFromDocProc)
    X.WARNING(b64);
    if (b64)
    X.RUNSQL("insert into CCCPRINTB64 (printb64, findoc, trndate) values ('" + b64 + "', " + SALDOC.FINDOC + ", '" + X.FORMATDATE('YYYYMMDD', SALDOC.TRNDATE) + "')", null);
    if (invPdf)
    delFile(invPdf);
    } catch (err) {
    X.WARNING('Generarea facturi tiparite pentru download eronata.\n' + err.message)
    }
    }
    var stopOraB64 = new Date().getTime(),
    durataExecSB64 = (stopOraB64 - startOraB64) / 1000;
    recPerf(durataExecSB64, getID(), ITELINES.RECORDCOUNT, X.SYS.USER, 'B64');
    }
     */
}

// Creare bon transfer intre 2 depozite Depozit si Online
function InsertNewITEDOC() {
  NEWFINDOCID = 0
  nTransferSeries = 1101 // Seria bonului de transfer
  nFromWH = 1000 // Din gestiunea Depozit cu codul
  nToWH = 1150 // In gestiunea Online cu codul
  nToBranch = X.SYS.BRANCH // In sucursala cu codul
  //verificare de stoc pe magazia sursa
  //VerifStocMag();

  try {
    ObjITEDOC = X.CreateObj('ITEDOC')
    ObjITEDOC.DBInsert

    TblITEDOC = ObjITEDOC.FindTable('ITEDOC')
    TblITEDOC.Edit
    TblITEDOC.SERIES = nTransferSeries // Series, the series of the transfer document should already exist in the inventory documents
    TblITEDOC.TRNDATE = SALDOC.TRNDATE

    TblMTRDOC = ObjITEDOC.FindTable('MTRDOC')
    TblMTRDOC.Edit
    TblMTRDOC.WHOUSE = nFromWH // From which warehouse
    TblMTRDOC.BRANCHSEC = nToBranch // To which branch belongs the second warehouse
    TblMTRDOC.WHOUSESEC = nToWH // To which warehouse

    TblITELINES = ObjITEDOC.FindTable('ITELINES')

    ITELINES.FIRST
    while (!ITELINES.Eof) {
      stocVar = X.EVAL('FRemQty1PerWHouse(ITELINES.MTRL,MTRDOC.WHOUSE,X.SYS.LOGINDATE)')
      //stocVar2 = X.EVAL("FRemQty1PerWHouse(ITELINES.MTRL,1000,X.SYS.LOGINDATE)");

      if (stocVar < ITELINES.QTY1) {
        //X.WARNING(stocVar);
        TblITELINES.APPEND
        TblITELINES.MTRL = ITELINES.MTRL
        TblITELINES.QTY1 = ITELINES.QTY1 - stocVar
        //TblITELINES.FINDOCS = FINDOCID;

        TblITELINES.POST
      }
      ITELINES.NEXT
    }

    NEWFINDOCID = ObjITEDOC.DBPost
  } finally {
    ObjITEDOC.FREE
    ObjITEDOC = null
  }

  // If the new findoc was created succesfully
  if (NEWFINDOCID > 0) {
    sSQL = 'select fincode from findoc where findoc = ' + NEWFINDOCID
    ds = X.GETSQLDATASET(sSQL, null)
    X.WARNING('Bon de transfer creat: ' + ds.fincode)
    SALDOC.CCCBT = NEWFINDOCID
  } else {
    X.WARNING('Problema creare bon de transfer')
  }
  if (SALDOC.FINDOC < 0) {
    X.EXEC('button:Save')
  }
}

function ON_ITELINES_POST() {
  if (SALDOC.SERIES != 7033) {
    if (
      ITELINES.CCCPRETCATALOG != 0 &&
      ITELINES.CCCPRETCATALOG != '' &&
      ITELINES.CCCPRETCATALOG != null &&
      ITELINES.CCCREDUCERE != '' &&
      ITELINES.CCCREDUCERE != 0 &&
      ITELINES.CCCREDUCERE != null
    ) {
      ITELINES.PRICE = roundNumber(ITELINES.CCCPRETCATALOG * (1 - ITELINES.CCCREDUCERE / 100), 2)
    }
  }
}

function itereaza() {
  if (SALDOC.ISCANCEL != 0 || SALDOC.APPRV != 1 || SALDOC.SOCURRENCY != 123) return

  vID = -1
  USRID = X.SYS.USER
  COMP = X.SYS.COMPANY
  BRA = X.SYS.BRANCH
  vID = SALDOC.FINDOC
  if (vID < 0) vID = X.NEWID
  tip = X.CONNECTIONSTATUS

  DateforSQLQuery = X.EVAL('SQLDATE(SALDOC.TRNDATE)')
  randnou = String.fromCharCode(13) + String.fromCharCode(10)

  parametru = 'VerificareVanzaresubCost'
  TRDR = SALDOC.TRDR
  SOSOURCE = SALDOC.SOSOURCE
  FPRMS = SALDOC.FPRMS
  Series = SALDOC.Series

  SQL =
    'SELECT dbo.fn_GCheckType(' +
    vID +
    ', ' +
    USRID +
    ', ' +
    COMP +
    ', ' +
    BRA +
    ', ' +
    tip +
    ', ' +
    TRDR +
    ', ' +
    SOSOURCE +
    ', ' +
    FPRMS +
    ', ' +
    Series +
    ', ' +
    DateforSQLQuery +
    ", '" +
    parametru +
    "' ) rez "

  DsRez = X.GETSQLDATASET(SQL, null)
  rez = DsRez.rez

  if (rez == 'return' || rez == '0' || rez == '' || rez == 'exit') return

  if (rez != 'verifica' && rez != '1') {
    X.EXCEPTION(rez)
    return
  }

  mesaj = ''
  ITELINES.FIRST
  while (!ITELINES.EOF) {
    //code...

    DsP = X.GETSQLDATASET(
      'SELECT dbo.fnG_GetCostPrice(MTRL, ' +
        SALDOC.FISCPRD +
        ', ' +
        SALDOC.PERIOD +
        ' ) CMP, isnull(MINPRCMK,0) MINPRCMK, left(MTRL.ACNMSK1,3) ACNMSK1  FROM MTRL WHERE MTRL=' +
        ITELINES.MTRL,
      null
    )
    CMP = DsP.CMP
    MINPRCMK = DsP.MINPRCMK
    cant = 0

    //ITELINES.EDIT;
    ITELINES.CCCUNITCOST = CMP
    ACNMSK1 = DsP.ACNMSK1

    if (SALDOC.FPRMS == 721) {
      if (ACNMSK1 == '704' || ACNMSK1 == '709') {
        ITELINES.NUM03 = ITELINES.NETLINEVAL + ITELINES.VATAMNT
      } else {
        ITELINES.NUM03 = 0
      }
    }

    if (ITELINES.ISNULL('QTY1') != 1 && ITELINES.ISNULL('CCCUNITCOST') != 1) {
      if (ITELINES.MTRTYPE != 3) ITELINES.SALESCVAL = roundNumber(ITELINES.CCCUNITCOST * ITELINES.QTY1, 2)
      else ITELINES.SALESCVAL = 0
      cant = ITELINES.QTY1
    }
    //ITELINES.POST;

    if (ITELINES.ISNULL('SALESCVAL') != 1 && ITELINES.ISNULL('LINEVAL') != 1) {
      valNetaMinima = roundNumber(ITELINES.SALESCVAL * (1.0 + MINPRCMK / 100), 2)
      valLinie = roundNumber(ITELINES.LINEVAL, 2)

      if (cant > 0 && valLinie < valNetaMinima) {
        // doar pentru cantitati pozitive
        // mesaj=mesaj+'la linia: '+ITELINES.LINENUM+  ' valoarea minima este '+valNetaMinima +randnou;
      }
    }

    ITELINES.NEXT
  }
  //if (mesaj != '')
  //X.EXCEPTION('Vanzari sub pret cost!!!'+randnou+ mesaj);
  //X.EXCEPTION('Eroare : ');
}

function printare_bon_fprintWin() {
  if (
    SALDOC.FPRMS == 721 ||
    SALDOC.FPRMS == 7101 ||
    SALDOC.FPRMS == 720 ||
    SALDOC.FPRMS == 7105 ||
    SALDOC.FPRMS == 7120
  ) {
    DsP1 = X.GETSQLDATASET('SELECT ISNULL(BOOL01,0) BOOL01 FROM FINDOC WHERE FINDOC=' + SALDOC.FINDOC, null)
    BOOL01 = DsP1.BOOL01
    if (BOOL01 == 1) {
      X.EXCEPTION('Documentul s-a trimis la casa fiscala!')
      return
    }

    var id = getID()
    CheckFolder('c:\\temp')
    CheckFolder('c:\\FPrintWin')
    CheckFolder('C:\\Program Files\\Datecs Applications\\FPrintWIN')

    sql = 'exec dbo.G_CashDatecs ' + id
    var ds
    try {
      ds = X.GETSQLDATASET(sql, null)
    } catch (e) {
      X.EXCEPTION(e.message)
      return
    }

    var txtData = ds.txtData
    ds = null
    var fileName_Temp = 'c:\\temp\\testfile.txt'
    var FisFinal = 'C:\\FPrintWin\\cashfile.inp'
    SaveStringToFile(fileName_Temp, txtData)

    fso = new ActiveXObject('Scripting.FileSystemObject')
    f2 = fso.GetFile(fileName_Temp)
    f2.Copy(FisFinal, true)
    fso = null

    //f2.Copy ("c:\\Temp\\backup.txt");
    //f2.Delete();
    WshShell = new ActiveXObject('WScript.Shell')
    WshShell.Run('C:\\FPrintWin\\Cash.cmd', 1, true)

    X.RUNSQL('update findoc set bool01=1 where findoc=' + id, null)
  }
}

function printare_bon_fprintWin1() {
  if (SALDOC.FPRMS == 721 || SALDOC.FPRMS == 7101 || SALDOC.FPRMS == 7105 || SALDOC.FPRMS == 7120) {
    DsP1 = X.GETSQLDATASET('SELECT ISNULL(BOOL01,0) BOOL01 FROM FINDOC WHERE FINDOC=' + SALDOC.FINDOC, null)
    BOOL01 = DsP1.BOOL01
    if (BOOL01 == 1) {
      X.EXCEPTION('Documentul s-a trimis la casa fiscala!')
      return
    }
    CheckFolder('c:\\temp')
    CheckFolder('C:\\Program Files\\Datecs Applications\\FPrintWIN')

    var fso, f1, ts, s
    var ForReading = 1
    fso = new ActiveXObject('Scripting.FileSystemObject')

    f1 = fso.CreateTextFile('c:\\temp\\testfile.txt', true)

    ITELINES.FIRST
    while (!ITELINES.EOF) {
      ceProdus = ITELINES.MTRL
      Ds = X.GETSQLDATASET('select name,1 as mtrmark from mtrl where mtrl=' + ceProdus, null)
      ceNume = Ds.name.substring(0, 22)
      //ceNume=ceNume.replace(/,/,' ');
      //ceNume=ceNume.replace(/;/,' ');
      //ceNume=ceNume.replace(/./,' ');

      ceGroup = 1

      ce_pret = (ITELINES.LNETLINEVAL + ITELINES.LVATAMNT) / ITELINES.QTY1 // trimit la casa pret calculat;

      ce_cant = ITELINES.QTY1

      ceCant = X.EVAL('LTrim(FString(' + ce_cant + ',12,3))')
      ceCant = ceCant.replace(/,/, '')

      cePret = X.EVAL('LTrim(FString(' + ce_pret + ',12,2))')
      cePret = cePret.replace(/,/, '')

      f1.WriteLine('S,1,______,_,__;' + ceNume + ';' + cePret + ';' + ceCant + ';1;' + ceGroup + ';1;0;0;')

      ITELINES.NEXT
    }
    //f1.WriteLine("P,1,______,_,__;Va multumim!;");

    ceVal = parseLocalNum(SALDOC.SUMAMNT)
    //ceVal=0;
    //ceVal = X.EVAL('LTrim(FString('+ceVal+',12,2))');
    //ceVal = ceVal.replace(/,/,'.');

    //if(VBUFSET.CARDSPAYED!=0)
    //  {
    //	ceCard=VBUFSET.CARDSPAYED;
    //	f1.Wr/iteLine("T,1,______,_,__;3;"+ceCard+";;;;");
    //}

    //	f1.WriteLine("T,1,______,_,__;0;"+ceVal+";;;;");
    f1.Writeline('T,1,______,_,__;0;;;;;') // trimit ca sa inchida cu cash totalul

    f1.Close()
    f2 = fso.GetFile('c:\\temp\\testfile.txt')
    f2.Copy('C:\\Program Files\\Datecs Applications\\FPrintWIN\\cashfile.inp')
    //f2.Copy ("c:\\Temp\\backup.txt");
    //f2.Delete();
    WshShell = new ActiveXObject('WScript.Shell')
    //WshShell.Run ("C:\\FPrintWin\\Cash.bat",1,true);

    X.RUNSQL('update findoc set bool01=1 where findoc=' + SALDOC.FINDOC, null)
  }
}

function ON_ITELINES_MTRL() {
  if (ITELINES.MTRL != 0) {
    AddPrice()
  }
}

function AddPrice() {
  if (SALDOC.SERIES != 7130 && SALDOC.SERIES != 7131 && SALDOC.SERIES != 7210) {
    DateforSQLQuery = X.EVAL('SQLDATE(SALDOC.TRNDATE)')
    DsP = X.GETSQLDATASET(
      'SELECT PRICEW PV, PRICER PAM, MAXPRCDISC Red, dbo.fnG_GetCostPrice(MTRL, ' +
        SALDOC.FISCPRD +
        ', ' +
        SALDOC.PERIOD +
        ' ) CMP, DBO.fn_GCheckAMA(MTRL.COMPANY, 1351,' +
        SALDOC.FPRMS +
        ') IsRetail,  dbo.fnG_SalePrice(MTRL.MTRL, ' +
        SALDOC.TRDR +
        ', ' +
        SALDOC.FPRMS +
        ', ' +
        DateforSQLQuery +
        ') PretClient FROM MTRL WHERE MTRL=' +
        ITELINES.MTRL,
      null
    )
    CMP = DsP.CMP
    PretCat = DsP.PV
    PretPAM = DsP.PAM
    Red = DsP.Red
    Pnet = DsP.Pnet
    IsRetail = DsP.IsRetail
    PretClient = DsP.PretClient

    if (IsRetail != 1) {
      CCCPretcatalog = PretCat
      //ITELINES.CCCReducere=Red;
    } else {
      CCCPretcatalog = PretPAM
    }

    if (CCCPretcatalog > 0 && PretClient > 0 && PretClient > CCCPretcatalog) {
      ITELINES.CCCPretcatalog = PretClient //PretClient > CCCPretcatalog
    } else {
      ITELINES.CCCPretcatalog = CCCPretcatalog
    }

    if (PretClient > 0) {
      ITELINES.PRICE = PretClient
    }
    ITELINES.CCCUNITCOST = CMP
  }
}

function ON_ITELINES_CCCREDUCERE() {
  ITELINES.DISC1PRC = null
  if (
    ITELINES.CCCPRETCATALOG != 0 &&
    ITELINES.CCCPRETCATALOG != '' &&
    ITELINES.CCCPRETCATALOG != null &&
    ITELINES.CCCREDUCERE != '' &&
    ITELINES.CCCREDUCERE != 0 &&
    ITELINES.CCCREDUCERE != null
  ) {
    ITELINES.PRICE = roundNumber(ITELINES.CCCPRETCATALOG * (1 - ITELINES.CCCREDUCERE / 100), 2)
  }
}

function ON_ITELINES_QTY1() {
  if ((SALDOC.TRDR == 12349 && SALDOC.SERIES == 7111) || SALDOC.SERIES == 7121) {
    sBax =
      'select isnull(UnitPack,0) buc from CCCS1DXTRDRMTRL where trdr=' +
      SALDOC.TRDR +
      ' and mtrl=' +
      ITELINES.MTRL
    dsBax = X.GETSQLDATASET(sBax, null)

    if (dsBax.buc == 0 || dsBax.buc == '' || dsBax.buc == null) {
      ITELINES.CCCCUTII = 0.0
    } else {
      ITELINES.CCCCUTII = ITELINES.QTY1 / dsBax.buc
    }
  }

  //if ((ITELINES.ISNULL('QTY1') == 1) || (ITELINES.ISNULL('CCCUNITCOST') == 1))
  if (ITELINES.ISNULL('QTY1') == 1) return
  //	if (ITELINES.MTRTYPE!=3)
  //		ITELINES.SALESCVAL=roundNumber(ITELINES.CCCUNITCOST * ITELINES.QTY1,2);
  //	else
  //		ITELINES.SALESCVAL=0;

  if (SALDOC.SERIES != 7033) {
    if (
      ITELINES.CCCPRETCATALOG != 0 &&
      ITELINES.CCCPRETCATALOG != '' &&
      ITELINES.CCCPRETCATALOG != null &&
      ITELINES.CCCREDUCERE != '' &&
      ITELINES.CCCREDUCERE != 0 &&
      ITELINES.CCCREDUCERE != null
    ) {
      ITELINES.PRICE = roundNumber(ITELINES.CCCPRETCATALOG * (1 - ITELINES.CCCREDUCERE / 100), 2)
    }
  }
}

function ON_ITELINES_PRICE() {
  //CheckMinCost();
}

function ON_ITELINES_DISC1PRC() {
  //CheckMinCost();
}

function CheckMinCost() {
  if (SALDOC.SERIES != 7130 && SALDOC.SERIES != 7131) {
    // daca valoare  linie <> 0
    if (ITELINES.LINEVAL != 0) {
      PretNet = (ITELINES.price * (100 - ITELINES.DISC1PRC)) / 100
      X.warning(PretNet)
      // iau din baza Pret Achizitie
      DsA = X.GETSQLDATASET(
        'SELECT top 1 isnull(REPLPRICE,0) as Ach FROM MTRL WHERE MTRL=' + ITELINES.MTRL + ' ',
        null
      )
      PretAch = DsA.Ach
      //X.warning(PretAch);
      //DsA = X.GETSQLDATASET('SELECT Round(PRICEW/(1+(MAXPRCDISC/100)),4) as PM FROM MTRL WHERE MTRL='+ITELINES.MTRL,null);
      //PretMin = DsA.PM;
      //PRICEW/(1+MAXPRCDISC/100)
      //determin pret minim de vanzare (adaos 12%)
      PretMin = roundNumber(PretAch * 1.12, 2)
      //X.warning(PretMin);

      if (PretNet <= PretMin) {
        X.Warning('Pret net (' + PretNet + ') sub pret minim de achizitie (' + PretMin + ')!')
      }
    }
  }
}

function roundNumber(num, dec) {
  var result = Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec)
  return result
}

function EXECCOMMAND(cmd) {
  if (cmd == 7101000) {
    printare_bon_fprintWin()
  }
  if (cmd == 7102000) {
    //exportXML1();
    exportXML()
  }
  if (cmd == 7103000) {
    exportXML1()
  }
  if (cmd == 20160928) {
    if (SALDOC.TRDR == 13249) {
      exportXMLCora()
    }
  }
  //CARREFOUR
  if (cmd == 20161017) {
    if (SALDOC.TRDR == 11322) {
      exportXMLCarrefour()
    }
  }
  //COLUMBUS
  if (cmd == 20170621) {
    if (SALDOC.TRDR == 25523) {
      exportXMLColumbus()
    }
  }
  //DEDEMAN
  if (cmd == 20190529) {
    if (SALDOC.TRDR == 11654) {
      exportXMLDedeman()
    }
  }

  //zoom
  if (cmd == 202006111) {
    X.SETPROPERTY('PANEL', 'Panel12', 'VISIBLE', zoomed)
    X.SETPROPERTY('PANEL', 'Panel13', 'VISIBLE', zoomed)
    X.SETPROPERTY('PANEL', 'Panel14', 'VISIBLE', zoomed)
    X.SETPROPERTY('PANEL', 'Panel15', 'VISIBLE', zoomed)

    zoomed = !zoomed
  }

  //ABC popup
  if (cmd == 202006121) {
    X.OPENSUBFORM('SFABCL')
  }

  if (cmd == 20210704) {
    if (SALDOC.NUM04.toString().length == 9) {
      printAndFtp('SALDOC', 107, folderPath)
    }
  }

  if (cmd == 20210915) {
    runExternalCode({ findoc: SALDOC.FINDOC })
  }

  if (cmd == 20211123) {
    if (debugg_mode.getComDanteFromDocProc) debugger
    if (!test_mode.getComDanteFromDocProc) sfptFromDocProcess(folderPath)
    //processXML("c:\\S1Print\\FTP\\Online\\dante_out\\ORDERS_DXSziDUYPNMI0mwGF6euB02A_VAT_RO17275880.xml");
    parseFolderFileList(folderPath + danteOutFolder)
  }
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
    if (endpoint == '5940477490162') f.trdbranch = 3329
    else if (endpoint == '5940477490018') f.trdbranch = 1890
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
          "insert into [dbo].[A_Ika_OrderDetail] (imptype, masterid, filename,qty1, price, LINEVAL, comments1, ean, comments) values ('Doc Process', " +
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
            "')",
          null
        )
        errCnt++
      }
    }

    //exista erori, abort order creation, but mark it
    if (errCnt) {
      markXmlAsOrderCreatedAndDelFile(orderID, false)
      return
    } else {
      //var id = odoc.dbPost;
      var id = odoc.showObjForm
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

//printAndFtp('SALDOC', 107, folderPath)
function printAndFtp(strModul, printTemplate, fldr) {
  asiguraCalea(fldr)
  if (printInvoice(strModul, printTemplate)) {
    var url = ftpPdf(pdfFile)
    if (url) {
      eMag_publishURL(url)
    } else {
      X.WARNING('Factura nu a putut fi transferata spre FTP.')
    }
  } else {
    X.WARNING('Factura nu a putut fi tiparita in PDF.')
  }
}

function delFile(file) {
  var fso = new ActiveXObject('Scripting.FileSystemObject'),
    f2 = fso.GetFile(file)
  //f2.Copy ("c:\\Somth\\Bak");
  f2.Delete()
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

function printInvoice(strModul, printTemplate) {
  if (SALDOC.FINDOC) {
    try {
      asiguraCalea(folderPath)
      sal = X.CreateObj(strModul)
      sal.DBLocate(SALDOC.FINDOC)
      pdfFile = folderPath + SALDOC.FINCODE + '.pdf'
      sal.PRINTFORM(printTemplate, 'PDF file', pdfFile)
      return pdfFile
    } catch (e) {
      X.WARNING(e.message)
      return null
    }
  } else {
    return false
  }
}

function ftpPdf(fisier) {
  try {
    var oShell = new ActiveXObject('Shell.Application'),
      host = 'ftp.petfactory.ro',
      usr = 'petfactortypdf@petfactory.ro',
      pwd = '1#kBsWpGZI51',
      wd = '',
      sFile = '',
      winscpComm =
        '"open ftp://' +
        usr +
        ':' +
        pwd +
        '@' +
        host +
        '" ' +
        '"put -delete -resume ' +
        fisier +
        '" ' +
        '"exit"',
      vArguments = '/log="' + folderPath + 'WinSCP.log" /nointeractiveinput /ini=nul /command ' + winscpComm,
      vDirectory = '',
      vOperation = 'open',
      vShow = 0,
      WshShell = new ActiveXObject('WScript.Shell')
    wd = WshShell.CurrentDirectory
    sFile = wd + '\\WinSCP.com'
    oShell.ShellExecute(sFile, vArguments, vDirectory, vOperation, vShow)
    return 'https://ftp.petfactory.ro/petfactortypdf/' + SALDOC.FINCODE + '.pdf'
  } catch (e) {
    X.WARNING(e.message)
    return false
  }
}

function eMag_publishURL(linkToSend) {
  try {
    var xmlhttp = new ActiveXObject('MSXML2.XMLHTTP.6.0')
    xmlhttp.open('POST', 'https://marketplace-api.emag.ro/api-3/order/attachments/save', true)
    xmlhttp.setRequestHeader(
      'Authorization',
      'Basic b3ZpZGl1LnR1dHVuYXJ1QHBldGZhY3Rvcnkucm86ZnJlZWRvbTMxMg=='
    )
    xmlhttp.setRequestHeader('Content-Type', 'application/json')
    xmlhttp.onreadystatechange = function () {
      if (xmlhttp.readyState != 4) return
      if (xmlhttp.status != 200 && xmlhttp.status != 304) {
        X.WARNING('HTTP error ' + xmlhttp.status)
        markItAsSent(0)
      }
      if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
        interpretResponse(xmlhttp)
      }
    }

    var dataToSend = composeJSON(linkToSend)

    xmlhttp.send(dataToSend)
  } catch (err) {
    X.WARNING(err.message)
  }
}

function interpretResponse(xmlhttp) {
  //X.WARNING(xmlhttp.responseText);
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
    for (var i = 0; i < messages.length; i++) {
      strM += messages[i] + '\n'
    }
    if (results.length) strM += 'order_id:' + results[0][0].order_id + '\n' + 'url:' + results[0][0].url
    X.WARNING('Eroare la transmitere link factura.\n' + strM)
    markItAsSent(0)
  } else {
    markItAsSent(1)
    X.WARNING('Link factura transmis.')
  }
}

function composeJSON(linkToSend) {
  var o = {
      order_id: SALDOC.NUM04,
      name: SALDOC.FINCODE,
      url: linkToSend,
      type: 1
    },
    r = {
      data: [o]
    }

  return JSON.stringify(r)
}

function markItAsSent(sent) {
  if (SALDOC.FINDOC) X.RUNSQL('update findoc set CCCTRIMIS=' + sent + ' where findoc=' + SALDOC.FINDOC, null)
}

function exportXML1() {
  if (SALDOC.FPRMS == 712 && SALDOC.EXPN == 0) {
    aCommand = 'XCMD:ClientImport,ScriptName: AR_ORIGINAL_INVOICE,myFindoc:' + SALDOC.FINDOC
    X.EXEC(aCommand)
  }

  if (SALDOC.FPRMS == 712 && SALDOC.EXPN > 0) {
    aCommand = 'XCMD:ClientImport,ScriptName: AR_ORIGINAL_INVOICE_WGT,myFindoc:' + SALDOC.FINDOC
    X.EXEC(aCommand)
  }

  if (SALDOC.FPRMS == 753 || SALDOC.FPRMS == 953) {
    aCommand = 'XCMD:ClientImport,ScriptName: AR_STORNO_INVOICE,myFindoc:' + SALDOC.FINDOC
    X.EXEC(aCommand)
  }

  if (SALDOC.FPRMS == 703) {
    aCommand = 'XCMD:ClientImport,ScriptName: AR_CORRECTION_INVOICE,myFindoc:' + SALDOC.FINDOC
    X.EXEC(aCommand)
  }
}

//nu las sa selecteze seriile de avize custodie clienti pe acest view
function ON_SALDOC_SERIES() {
  if (SALDOC.SERIES == 7132 || SALDOC.SERIES == 7133) {
    X.EXCEPTION(
      'Pe aceasta fereastra nu se pot folosi seriile de avize custodie tur si retur! Va rugam folositi meniul Custodie marfuri clienti!'
    )
  }

  if (SALDOC.SERIES == 7210) {
    SALDOC.TRDR = 40225
  }
}

function ON_DELETE() {
  // stergerea documentului factura client online sau bon fiscal face si stergere de bon de transfer, daca
  if (SALDOC.SERIES == 7034 || SALDOC.SERIES == 7211) {
    if (SALDOC.CCCBT != 0 && SALDOC.CCCBT != null && SALDOC.CCCBT != '') {
      sSQL =
        'select top 1 A.findoc from mtrlines A left outer join findoc B on A.findoc = B.findoc where A.findoc= ' +
        SALDOC.CCCBT +
        ' and B.series = 1101 and B.sosource = 1151'
      ds = X.GETSQLDATASET(sSQL, null)

      if (ds.RECORDCOUNT > 0) {
        ObjConv = X.CreateObj('ITEDOC')

        ObjConv.DBLocate(SALDOC.CCCBT)
        ObjConv.DBDelete
        //SALDOC.CCCBT = null;
      }
    }
  }

  objABC.D()
}

function ON_SALDOC_ISCANCEL() {
  // anularea documentului factura client online sau bon fiscal face si stergere de bon de transfer, daca
  if (SALDOC.SERIES == 7034 || SALDOC.SERIES == 7211) {
    if (SALDOC.CCCBT != 0 && SALDOC.CCCBT != null && SALDOC.CCCBT != '') {
      sSQL =
        'select top 1 A.findoc from mtrlines A left outer join findoc B on A.findoc = B.findoc where A.findoc= ' +
        SALDOC.CCCBT +
        ' and B.series = 1101 and B.sosource = 1151'
      ds = X.GETSQLDATASET(sSQL, null)

      if (ds.RECORDCOUNT > 0) {
        ObjConv = X.CreateObj('ITEDOC')

        ObjConv.DBLocate(SALDOC.CCCBT)
        ObjConv.DBDelete
        //SALDOC.CCCBT = null;
      }
    }
  }

  if (SALDOC.ISCANCEL == 1) objABC.D()
}

//Export XML Cora factura tur si factura retur
function exportXMLCora() {
  if (SALDOC.SERIES == 7121) {
    aCommand = 'XCMD:ClientImport,ScriptName: AR_CORA_ORIGINAL_INVOICE,myFindoc:' + SALDOC.FINDOC
    X.EXEC(aCommand)
  }
  if (SALDOC.SERIES == 7531) {
    aCommand = 'XCMD:ClientImport,ScriptName: AR_CORA_RETUR_INVOICE,myFindoc:' + SALDOC.FINDOC
    X.EXEC(aCommand)
  }
}
//Export XML Carrefour factura tur si factura retur
function exportXMLCarrefour() {
  if (SALDOC.SERIES == 7121) {
    aCommand = 'XCMD:ClientImport,ScriptName: AR_CARREFOUR_ORIG_INV,myFindoc:' + SALDOC.FINDOC
    X.EXEC(aCommand)
  }
  if (SALDOC.SERIES == 7531) {
    aCommand = 'XCMD:ClientImport,ScriptName: AR_CARREFOUR_RETUR_INV,myFindoc:' + SALDOC.FINDOC
    X.EXEC(aCommand)
  }
}
//Export XML Carrefour factura tur si factura retur
function exportXMLColumbus() {
  if (SALDOC.SERIES == 7121) {
    aCommand = 'XCMD:ClientImport,ScriptName: AT_COLUMBUS_ORIG_INV,myFindoc:' + SALDOC.FINDOC
    X.EXEC(aCommand)
  }
  if (SALDOC.SERIES == 7531) {
    aCommand = 'XCMD:ClientImport,ScriptName: AT_COLUMBUS_RETUR_INV,myFindoc:' + SALDOC.FINDOC
    X.EXEC(aCommand)
  }
}
//Export XML Dedeman factura tur
function exportXMLDedeman() {
  /*
    if(SALDOC.NUM01!=1){
    if(SALDOC.SERIES == 7123){
    aCommand = 'XCMD:ClientImport,ScriptName: ExpFactDedeman_Buton,myFindoc:'+SALDOC.FINDOC;
    X.EXEC(aCommand);
    }
    }
    else{
    X.EXCEPTION('Documentul a fost deja exportat pentru a fi inregistrat in EDI!');
    }
     */
  if (SALDOC.SERIES == 7123 || SALDOC.SERIES == 7033) {
    aCommand = 'XCMD:ClientImport,ScriptName: ExpFactDedeman_ButonNew,myFindoc:' + SALDOC.FINDOC
    X.EXEC(aCommand)
  }
}

//ABC related
function ON_ITELINES_NEW() {
  //init ABC
  initABC()

  var dims = objABC.setImpliciteLinie()
  if (dims.length) {
    ITELINES.CCCABCDIM1 = dims[0]
    ITELINES.CCCABCDIM2 = dims[1]
    ITELINES.CCCABCDIM3 = dims[2]
    ITELINES.CCCABCDIM4 = dims[3]
    ITELINES.CCCABCDIM5 = dims[4]
    ITELINES.CCCABCDIM6 = dims[5]
  }
}

function ON_SRVLINES_NEW() {
  //init ABC
  initABC()
  var dims = objABC.setImpliciteLinie()
  if (dims.length) {
    SRVLINES.CCCABCDIM1 = dims[0]
    SRVLINES.CCCABCDIM2 = dims[1]
    SRVLINES.CCCABCDIM3 = dims[2]
    SRVLINES.CCCABCDIM4 = dims[3]
    SRVLINES.CCCABCDIM5 = dims[4]
    SRVLINES.CCCABCDIM6 = dims[5]
  }
}

function loadABC() {
  var dsSoImport, jsCode
  //aceasta functie returneaza un closure ABC, care se foloseste gen objABC.upsert();
  //daca nu a mai fost executata, ABC global e undefined
  //se executa global la operare form sau in _POST daca webservice

  if (Object.keys(objABC).length === 0 && objABC.constructor === Object) {
    dsSoImport = X.GETSQLDATASET("SELECT SOIMPORT FROM SOIMPORT WHERE CODE='ABC'", null)
    dsSoImport.FIRST
    jsCode = dsSoImport.SOIMPORT
    eval(jsCode) //returneaza var ABC local
    objABC = ABC //o fac accesibila global
  }
}

function initABC() {
  var q = 'select CCCABCREPRSENTBUSINESS catCom from trdr where trdbusiness=112',
    dsCatCom = X.GETSQLDATASET(q, null),
    trdb = X.SQL('select trdbusiness from trdr where trdr=' + SALDOC.TRDR, null),
    reprezentant

  if (dsCatCom.RECORDCOUNT) {
    dsCatCom.FIRST
    while (!dsCatCom.eof) {
      if (trdb == dsCatCom.catCom) {
        reprezentant = X.SQL('select trdr from trdr where cccabcreprsentbusiness=' + trdb, null)
        break
      }
      dsCatCom.NEXT
    }
  }

  var uiFrom = [
    {
      ui: SALDOC.TRDR_CUSTOMER_TRDBUSINESS,
      sql: ''
    },
    {
      ui: reprezentant ? reprezentant : SALDOC.TRDR,
      sql: ''
    },
    {
      ui: SALDOC.SALESMAN,
      sql: 'select isnull(depart, 0) from prsn where prsn='
    },
    {
      ui: SALDOC.SALESMAN,
      sql: ''
    },
    {
      ui: SALDOC.TRDBRANCH,
      sql: 'select isnull(CCCZONAGEO, 0) from trdbranch where trdbranch='
    },
    {
      ui: SALDOC.SALESMAN,
      sql: 'select isnull(trucks, 0) from prsn where prsn='
    }
  ]
  objABC.init(SALDOC, ITELINES, SRVLINES, 1000, 1001, 1002, 1003, uiFrom) //paseaza variabilele necesare in closure ABC
}

function ON_SALDOC_TRDR() {
  var reprVanzari = X.SQL('select salesman from trdr where trdr=' + SALDOC.TRDR, null)
  if (reprVanzari) {
    SALDOC.SALESMAN = reprVanzari
  }
  initABC()
}

function ON_SALDOC_SALESMAN() {
  initABC()
}

function ON_SALDOC_TRDBRANCH() {
  initABC()
}

function ON_CREATE() {
  loadABC() //creaza var ABC global
  //X.WARNING('__ABC module loaded__');
}

function ON_LOCATE() {
  //debugger;
  initABC() //init la modificare doc
  if (!aDoua) {
    //saveABC();
  } else {
    aDoua = false
  }

  X.ABCST.REFRESH
  X.INVALIDATEFIELD('ITELINES.CCCABCDIM2')
}

function saveABC() {
  reevalueazaModelele()
  objABC.D()

  objABC.upsert()
}

function ON_INSERT() {
  initABC() //init la modificare doc
}

function ON_ITELINES_CCCABCDIMMDL1() {
  if (ITELINES.CCCABCDIMMDL1)
    on_linlines_abc(ITELINES, ITELINES.CCCABCDIMMDL1, 'CCCABCDIMMDL1', 'ITELINES.CCCABCDIMMDL1')
}

function ON_ITELINES_CCCABCDIMMDL2() {
  if (ITELINES.CCCABCDIMMDL2)
    on_linlines_abc(ITELINES, ITELINES.CCCABCDIMMDL2, 'CCCABCDIMMDL2', 'ITELINES.CCCABCDIMMDL2')
}

function ON_ITELINES_CCCABCDIMMDL3() {
  if (ITELINES.CCCABCDIMMDL3)
    on_linlines_abc(ITELINES, ITELINES.CCCABCDIMMDL3, 'CCCABCDIMMDL3', 'ITELINES.CCCABCDIMMDL3')
}

function ON_ITELINES_CCCABCDIMMDL4() {
  if (ITELINES.CCCABCDIMMDL4)
    on_linlines_abc(ITELINES, ITELINES.CCCABCDIMMDL4, 'CCCABCDIMMDL4', 'ITELINES.CCCABCDIMMDL4')
}

function ON_ITELINES_CCCABCDIMMDL5() {
  if (ITELINES.CCCABCDIMMDL5)
    on_linlines_abc(ITELINES, ITELINES.CCCABCDIMMDL5, 'CCCABCDIMMDL5', 'ITELINES.CCCABCDIMMDL5')
}

function ON_ITELINES_CCCABCDIMMDL6() {
  if (ITELINES.CCCABCDIMMDL6)
    on_linlines_abc(ITELINES, ITELINES.CCCABCDIMMDL6, 'CCCABCDIMMDL6', 'ITELINES.CCCABCDIMMDL6')
}

function adminMdl(dimCell, dimSql) {
  var da = X.FORMATDATE('yyyymmdd', SALDOC.TRNDATE)
  if (dimCell) {
    var d = parseInt(objABC.administrareModeleDinamice(dimCell, da))
    if (dimCell != d) {
      return d
    } else {
      return 0
    }
  }
}

function on_linlines_abc(ds, gridCellVal, cellName, fullCellName) {
  if (itsMeStackOverflow) {
    itsMeStackOverflow = false
    return
  }
  var val = adminMdl(gridCellVal, cellName)
  X.ABCDIMMDL.REFRESH
  if (val) {
    itsMeStackOverflow = true
    switch (cellName) {
      case 'CCCABCDIMMDL1':
        X.INVALIDATEFIELD(fullCellName)
        ds.CCCABCDIMMDL1 = val
        break
      case 'CCCABCDIMMDL2':
        X.INVALIDATEFIELD(fullCellName)
        ds.CCCABCDIMMDL2 = val
        break
      case 'CCCABCDIMMDL3':
        X.INVALIDATEFIELD(fullCellName)
        ds.CCCABCDIMMDL3 = val
        break
      case 'CCCABCDIMMDL4':
        X.INVALIDATEFIELD(fullCellName)
        ds.CCCABCDIMMDL4 = val
        break
      case 'CCCABCDIMMDL5':
        X.INVALIDATEFIELD(fullCellName)
        ds.CCCABCDIMMDL5 = val
        break
      case 'CCCABCDIMMDL6':
        X.INVALIDATEFIELD(fullCellName)
        ds.CCCABCDIMMDL6 = val
        break
    }
  }
}

function ON_SRVLINES_CCCABCDIMMDL1() {
  if (SRVLINES.CCCABCDIMMDL1)
    on_linlines_abc(SRVLINES, SRVLINES.CCCABCDIMMDL1, 'CCCABCDIMMDL1', 'SRVLINES.CCCABCDIMMDL1')
}

function ON_SRVLINES_CCCABCDIMMDL2() {
  if (SRVLINES.CCCABCDIMMDL2)
    on_linlines_abc(SRVLINES, SRVLINES.CCCABCDIMMDL2, 'CCCABCDIMMDL2', 'SRVLINES.CCCABCDIMMDL2')
}

function ON_SRVLINES_CCCABCDIMMDL3() {
  if (SRVLINES.CCCABCDIMMDL3)
    on_linlines_abc(SRVLINES, SRVLINES.CCCABCDIMMDL3, 'CCCABCDIMMDL3', 'SRVLINES.CCCABCDIMMDL3')
}

function ON_SRVLINES_CCCABCDIMMDL4() {
  if (SRVLINES.CCCABCDIMMDL4)
    on_linlines_abc(SRVLINES, SRVLINES.CCCABCDIMMDL4, 'CCCABCDIMMDL4', 'SRVLINES.CCCABCDIMMDL4')
}

function ON_SRVLINES_CCCABCDIMMDL5() {
  if (SRVLINES.CCCABCDIMMDL5)
    on_linlines_abc(SRVLINES, SRVLINES.CCCABCDIMMDL5, 'CCCABCDIMMDL5', 'SRVLINES.CCCABCDIMMDL5')
}

function ON_SRVLINES_CCCABCDIMMDL6() {
  if (SRVLINES.CCCABCDIMMDL6)
    on_linlines_abc(SRVLINES, SRVLINES.CCCABCDIMMDL6, 'CCCABCDIMMDL6', 'SRVLINES.CCCABCDIMMDL6')
}

function reevalueazaModelele() {
  if (ITELINES.CCCABCDIMMDL1)
    on_linlines_abc(ITELINES, ITELINES.CCCABCDIMMDL1, 'CCCABCDIMMDL1', 'ITELINES.CCCABCDIMMDL1')
  if (ITELINES.CCCABCDIMMDL2)
    on_linlines_abc(ITELINES, ITELINES.CCCABCDIMMDL2, 'CCCABCDIMMDL2', 'ITELINES.CCCABCDIMMDL2')
  if (ITELINES.CCCABCDIMMDL3)
    on_linlines_abc(ITELINES, ITELINES.CCCABCDIMMDL3, 'CCCABCDIMMDL3', 'ITELINES.CCCABCDIMMDL3')
  if (ITELINES.CCCABCDIMMDL4)
    on_linlines_abc(ITELINES, ITELINES.CCCABCDIMMDL4, 'CCCABCDIMMDL4', 'ITELINES.CCCABCDIMMDL4')
  if (ITELINES.CCCABCDIMMDL5)
    on_linlines_abc(ITELINES, ITELINES.CCCABCDIMMDL5, 'CCCABCDIMMDL5', 'ITELINES.CCCABCDIMMDL5')
  if (ITELINES.CCCABCDIMMDL6)
    on_linlines_abc(ITELINES, ITELINES.CCCABCDIMMDL6, 'CCCABCDIMMDL6', 'ITELINES.CCCABCDIMMDL6')
  if (SRVLINES.CCCABCDIMMDL1)
    on_linlines_abc(SRVLINES, SRVLINES.CCCABCDIMMDL1, 'CCCABCDIMMDL1', 'SRVLINES.CCCABCDIMMDL1')
  if (SRVLINES.CCCABCDIMMDL2)
    on_linlines_abc(SRVLINES, SRVLINES.CCCABCDIMMDL2, 'CCCABCDIMMDL2', 'SRVLINES.CCCABCDIMMDL2')
  if (SRVLINES.CCCABCDIMMDL3)
    on_linlines_abc(SRVLINES, SRVLINES.CCCABCDIMMDL3, 'CCCABCDIMMDL3', 'SRVLINES.CCCABCDIMMDL3')
  if (SRVLINES.CCCABCDIMMDL4)
    on_linlines_abc(SRVLINES, SRVLINES.CCCABCDIMMDL4, 'CCCABCDIMMDL4', 'SRVLINES.CCCABCDIMMDL4')
  if (SRVLINES.CCCABCDIMMDL5)
    on_linlines_abc(SRVLINES, SRVLINES.CCCABCDIMMDL5, 'CCCABCDIMMDL5', 'SRVLINES.CCCABCDIMMDL5')
  if (SRVLINES.CCCABCDIMMDL6)
    on_linlines_abc(SRVLINES, SRVLINES.CCCABCDIMMDL6, 'CCCABCDIMMDL6', 'SRVLINES.CCCABCDIMMDL6')
}

function sfpt2DocProcess(fisier, logFldr, trimis) {
  if (trimis) return

  asiguraCalea(logFldr)

  var initialDir = '/001G_rFRDUyK4xAMVFfEFelF5WNqhBNujBx38gMmV1fVqIGLNZoQg5f/in/',
    winscpAction = '"put -delete -resume ' + fisier + ' ' + initialDir + ' " '
  connect2SftpDocProc(logFldr, winscpAction, true)
}

function sfptFromDocProcess(logFldr) {
  var initialDir = '/001G_rFRDUyK4xAMVFfEFelF5WNqhBNujBx38gMmV1fVqIGLNZoQg5f/out/',
    downloadDir = folderPath + 'dante_out\\',
    winscpAction = '"get -resume ' + initialDir + 'order*.xml ' + downloadDir + ' " '

  asiguraCalea(logFldr)
  asiguraCalea(downloadDir)
  connect2SftpDocProc(logFldr, winscpAction, false)
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
    if (debugg_mode.trimiteInv2DanteFromDocProc) X.WARNING(vArguments)
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

function ON_RESTORE_EVENTS() {
  if (SALDOC.FPRMS == 712) {
    ITELINES.FIRST
    if (ITELINES.FINDOCS) {
      var dataset = X.GETSQLDATASET(
        'SELECT FINDOC, FPRMS, TRNDATE, FINCODE FROM FINDOC WHERE FINDOC=' + ITELINES.FINDOCS,
        null
      )
      if (dataset.RECORDCOUNT) {
        dataset.FIRST
        if (dataset.FPRMS == 711) {
          //factura provenita din aviz livrare
          MTRDOC.CCCDispatcheDate = dataset.TRNDATE
          MTRDOC.CCCDispatcheDoc = dataset.FINCODE
        }
      }
    }
  }
}
