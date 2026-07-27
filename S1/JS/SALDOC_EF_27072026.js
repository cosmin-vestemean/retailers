/*
 * https://winscp.net/download/WinSCP-5.19.3-Portable.zip
 */

lib.include("runCmd20210915");
lib.include("eMagMarketplace");
lib.include("core");

var zoomed = false;
var aDoua = false;
var danteOutFolder = "dante_out";

function exportXML() {
  //testjs('test apel');
  //var a = ShowMessage('This is a warning message');
  var id = getID();
  X.CANCELEDITS;
  var tempfolder = "c:\\Temp";
  CheckFolder(tempfolder);

  DsP1 = X.GETSQLDATASET(
    "SELECT convert(varchar(10), CCCXMLSendDate,103) CCCXMLSendDate, left(replace(trdr.name,' ',''),8) name from findoc join mtrdoc on findoc.findoc=mtrdoc.findoc join trdr on findoc.trdr=trdr.trdr where findoc.findoc=" +
    id,
    null
  );
  CCCXMLSendDate = DsP1.CCCXMLSendDate;
  tempfolder = DsP1.name;
  tempfolder = "c:\\ReadXMLFiles\\Upload\\" + tempfolder;

  DsP1 = null;

  if (CCCXMLSendDate != "" && CCCXMLSendDate != null) {
    X.EXCEPTION("Documentul a trimis ! " + CCCXMLSendDate);
    return;
  }

  sql = "exec dbo.G_XML_ExportDoc " + id;
  var ds;
  try {
    ds = X.GETSQLDATASET(sql, null);
  } catch (e) {
    X.EXCEPTION(e.message);
    return;
  }

  if (SALDOC.ISNULL("DATE01")) {
    X.EXCEPTION("Lipsa data comanda!");
    Ds = null;
    return;
  }
  if (SALDOC.ISNULL("NUM04")) {
    X.EXCEPTION("Lipsa numar comanda!");
    Ds = null;
    return;
  }
  if (MTRDOC.ISNULL("CCCDispatcheDoc")) {
    X.EXCEPTION("Lipsa document/aviz livrare!");
    Ds = null;
    return;
  }
  if (MTRDOC.ISNULL("CCCDispatcheDate")) {
    X.EXCEPTION("Lipsa data document/aviz livrare!");
    Ds = null;
    return;
  }

  if (ds.RecordCount == 0) {
    X.EXCEPTION("Lipsa date de transmis!");
    Ds = null;
    return;
  }

  var fileName = ds.FileName;
  var isFTP = ds.isFTP;
  var filePath = ds.filePath;
  var ERRORMSG = ds.ERRORMSG;
  var xmlData = ds.xmlData;

  if (ERRORMSG != "") {
    X.EXCEPTION(ERRORMSG);
    Ds = null;
    return;
  }

  var ds22, sql1;
  sql1 = "select CCCXMLfile from mtrdoc where findoc=" + id;

  ds22 = X.GETSQLDATASET(sql1, null);
  xmlData = ds22.CCCXMLfile;
  ds22 = null;

  //xmlData = GetQueryResults('SoftOne', sql1, null);

  if (xmlData == "" || xmlData == null) {
    X.EXCEPTION("Nu exista date de trimis");
    Ds = null;
    return;
  }

  CheckFolder(tempfolder);
  Ds = null;

  if (SALDOC.TRDR != 11322) {
    //fara carrfour
    CheckFolder(filePath);
  }
  var fso, f1;
  var fileName_Temp = tempfolder + "\\" + "fisierExport.xml";
  var FisFinal = filePath + fileName;

  if (SALDOC.TRDR != 11322) {
    SaveStringToFile(fileName_Temp, xmlData);
    fso = new ActiveXObject("Scripting.FileSystemObject");
    f2 = fso.GetFile(fileName_Temp);
    f2.Copy(FisFinal, true);
    fso = null;
  } else {
    fileName_Temp = tempfolder + "\\" + fileName;
    SaveStringToFile(fileName_Temp, xmlData);
    SaveStringToFTPFile(fileName_Temp, tempfolder, fileName);
  }

  //X.Warning('fisierul a fost trimis '+fileName+' !');
  X.RUNSQL(
    "update mtrdoc set CCCXMLSendDate=GETDATE(), CCCXMLfile=null where findoc=" +
    SALDOC.FINDOC,
    null
  );
}

function parseLocalNum(num) {
  var rez = num;
  var sir = "Number(Replace(" + num + ", ',' " + ", '.' ))";
  //X.Warning(sir);
  rez = X.EVAL(sir);
  //X.WARNING(rez);
  rez = rez + 0.0;
  //X.WARNING(rez);
  return rez;
}

// carrefour
function SaveStringToFTPFile(temp_filename, tempfolder, fileName) {
  var id = getID();
  var DsP1 = X.GETSQLDATASET(
    "SELECT trdr.CCCFtpServer, trdr.CCCFtpUser, trdr.CCCFtpPwd, CCCFtpPath from findoc join trdr on findoc.trdr=trdr.trdr where findoc.findoc=" +
    id,
    null
  );
  var CCCFtpServer = DsP1.CCCFtpServer;
  var CCCFtpUser = DsP1.CCCFtpUser;
  var CCCFtpPwd = DsP1.CCCFtpPwd;
  var CCCFtpPath = DsP1.CCCFtpPath;
  DsP1 = null;

  var ftpText, ftpcmd, ftpFileCmd, WshShell;
  ftpText = "open " + CCCFtpServer + "\n";
  ftpText += "user " + CCCFtpUser + "\n";
  ftpText += CCCFtpPwd + "\n";
  ftpText += "binary" + "\n";
  ftpText += "put " + temp_filename + " " + CCCFtpPath + fileName + "\n";
  ftpText += "bye" + "\n";

  var ftpFileScript = tempfolder + "\\" + "scriptFTP.scr";

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

  var ftpFileNameCmd = tempfolder + "\\" + "gmcSendToFTP.exe";
  CheckFileExists(ftpFileNameCmd);

  ftpFileCmd = tempfolder + "\\" + "copytoFTP.cmd";
  ftpcmd = "@echo off " + "\n";
  ftpcmd += "c:" + "\n";
  ftpcmd += "cd " + tempfolder + "\n";
  ftpcmd += "@echo on " + "\n";
  //ftpcmd+='gmcSendToFTP.exe '+fileName+'.test'+' noexit'+'\n';
  ftpcmd += "gmcSendToFTP.exe " + fileName + "\n";
  ftpcmd += "cmd/k" + "\n";

  SaveStringToFile(ftpFileCmd, ftpcmd);

  //ftpFileCmd= ftpFileNameCmd +'\\'+fileName+'.test'+' noexit';
  WshShell = new ActiveXObject("WScript.Shell");
  WshShell.Run(ftpFileCmd, 1, true);

  WshShell = null;
}

function getID() {
  vID = SALDOC.FINDOC;
  if (vID < 0) vID = X.NEWID;
  return vID;
}

function CheckFileExists(FileName) {
  var rez, fso, msg;
  fso = new ActiveXObject("Scripting.FileSystemObject");

  if (fso.FileExists(FileName)) {
    rez = 1;
  } else {
    msg = " nu exista fisierul! " + FileName;
    X.EXCEPTION(msg);
  }
  fso = null;
}

function CheckFolder(FolderName) {
  var rez, fso, msg;
  fso = new ActiveXObject("Scripting.FileSystemObject");

  if (fso.FolderExists(FolderName)) {
    rez = 1;
  } else {
    msg = " nu exista folderul! " + FolderName;
    X.EXCEPTION(msg);
  }
  fso = null;
}

function ON_AFTERPOST() {

  //26.03.2025 - update id comanda, document la salvare comanda 
  if ((SALDOC.FPRMS == 700) || (SALDOC.FPRMS == 701)) {
    var vFindocID;
    vFindocID = getID();
    X.RUNSQL("UPDATE FINDOC SET CCCORDERID=FINDOC, CCCORDERDOC=FINCODE WHERE FINDOC=:1", vFindocID);
  }

  //Calcul greutate produse
  DsGreutate = X.GETSQLDATASET('select sum(weight) as id from mtrl where mtrl in (select mtrl from mtrlines where findoc = ' + docID() + ')', null);

  //Update greutate la nivel de document
  X.RUNSQL('update findoc set NUM03 = ' + DsGreutate.id + ' where findoc = ' + docID(), null);

  var vID = SALDOC.FINDOC;
  if (vID < 0) vID = X.NEWID;
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
    "create table CCCFINDOCPOST (CCCFINDOCPOST int not null identity(1,1) primary key, findoc int not null, trndate date not null, fincode varchar(max) not null)",
    theQ = "if OBJECT_ID('dbo.CCCFINDOCPOST') is null " + createTblQ;

  try {
    X.RUNSQL(theQ, null);
  } catch (err) {
    X.WARNING("Eroare la creare tabel CCCFINDOCPOST:\n" + err.message);
  }

  var markDoc =
    "insert into CCCFINDOCPOST (findoc, trndate, fincode) values (" +
    vID +
    ", '" +
    X.FORMATDATE("yyyymmdd", SALDOC.TRNDATE) +
    "', '" +
    SALDOC.FINCODE +
    "')",
    theQ = X.SQL(
      "select isnull(findoc, 0) from CCCFINDOCPOST where findoc=" + vID,
      null
    )
      ? ""
      : markDoc;

  try {
    if (theQ) X.RUNSQL(theQ, null);
  } catch (err) {
    X.WARNING("Eroare la marcare document pentru afterjobs:\n" + err.message);
  }

  var up = X.SQL(
    "select coalesce(unitpack, 0) from CCCS1DXTRDRMTRL where mtrl=" +
    ITELINES.MTRL +
    " and trdr=" +
    SALDOC.TRDR,
    null
  );
  if (up) {
    X.RUNSQL(
      "UPDATE MTRLINES SET CCCUNITPACK=" +
      up +
      "WHERE MTRL=" +
      ITELINES.MTRL +
      "AND FINDOC=" +
      vID,
      null
    );
  }

  saveABC();
  aDoua = true;

  //25.03.2025 - inchidere comanda la salvare factura externa
  if (SALDOC.FPRMS == 747) {
    var vSQL = 'exec cccInchidereComanda :1';
    X.RunSQL(vSQL, ITELINES.FINDOCS);
  }

}

function ON_POST() {
  preiaDateAviz();
  if (SALDOC.SERIES == 7022) {
    if (SALDOC.NUM04) {
      //verifica daca exista numarul de comanda online in tabelul findoc pt seria 7022, comanda online nu poate fi duplicata
      var qd = X.SQL(
        "select count(*) from findoc where series=7022 and num04=" +
        SALDOC.NUM04,
        null
      );
      if (qd > 0) {
        X.EXCEPTION(
          "Comanda online " + SALDOC.NUM04 + " a mai introdusa anterior!"
        );
      }
    }
  }
  //am findocs = comanda aferenta in linii; update fullytransf comanda =1
  //protectie dublare: daca am o factura care provine din comanda findocs atunci tell WMS beautiful lies; cum?
  //daca pun un X.EXCEPTION primeste succes:false;
  //doar la introducerea unei facturi, nu si la resalvare
  if (
    SALDOC.FINDOC < 0 &&
    (SALDOC.SERIES == 7111 || SALDOC.SERIES == 7031 || SALDOC.SERIES == 7033)
  ) {
    ITELINES.FIRST;
    if (ITELINES.FINDOCS) {
      var factExistenta =
        "select top 1 isnull(a.findoc, 0) findoc from mtrlines a inner join findoc b on (a.findoc=b.findoc and a.sosource=b.sosource) " +
        "where b.sosource = 1351 and (b.SERIES = 7111  or b.SERIES = 7031 or b.SERIES = 7033) and a.findocs=" +
        ITELINES.FINDOCS;
      var fin = X.SQL(factExistenta, null);
      if (fin > 0) {
        X.EXCEPTION(
          "Factura deja exista in ERP cu id:" + fin + ".\nDublare refuzata."
        );
      }
    } else {
      //X.EXCEPTION('Nu exista FINDOCS in linii.');
    }
  }

  var findocs = 0;
  ITELINES.FIRST;
  while (!ITELINES.EOF()) {
    if (findocs == 0) {
      if (
        ITELINES.FINDOCS != null &&
        ITELINES.FINDOCS != 0 &&
        ITELINES.FINDOCS != ""
      ) {
        findocs = ITELINES.FINDOCS;
      }
    }
    ITELINES.NEXT;
  }
  //X.WARNING(findocs);
  ITELINES.FIRST;
  while (!ITELINES.EOF()) {
    if (
      ITELINES.FINDOCS == null ||
      ITELINES.FINDOCS == 0 ||
      ITELINES.FINDOCS == ""
    ) {
      if (findocs > 0) {
        ITELINES.FINDOCS = findocs;
      }
    }

    if (
      (SALDOC.SERIES == 9221 || SALDOC.SERIES == 7531) &&
      (ITELINES.FINDOCL == null || ITELINES.FINDOCL == "")
    ) {
      X.EXCEPTION(
        "Completati Document storno pentru articolul " + ITELINES.MTRL_ITEM_NAME
      );
    }

    if (
      (SALDOC.SERIES == 9221 || SALDOC.SERIES == 7531) &&
      ITELINES.FINDOCL != null &&
      ITELINES.FINDOCL != ""
    ) {
      var Mtr =
        "select sum(qty1) QTY1 from mtrtrn where findoc=" +
        ITELINES.FINDOCL +
        " and mtrl=" +
        ITELINES.MTRL;
      var Qty1 = X.SQL(Mtr, null);

      if (ITELINES.QTY1 > Qty1) {
        X.EXCEPTION(
          "Nu puteti returna mai mult decat cantitatea din documentul storno, pentru articolul" +
          ITELINES.MTRL_ITEM_NAME
        );
      }
    }

    ITELINES.NEXT;
  }
  itereaza();

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
      "Pe aceasta fereastra nu se pot folosi seriile de avize custodie tur si retur! Va rugam folositi meniul Custodie marfuri clienti!"
    );
  }

  //Verificare comanda deja convertita
  if (SALDOC.FPRMS == 703 || SALDOC.FPRMS == 721 || SALDOC.FPRMS == 753) {
    sSql = "SELECT FULLYTRANSF FROM FINDOC WHERE FINDOC=" + ITELINES.FINDOCS;
    ds = X.GETSQLDATASET(sSql, null);

    if (ds.FULLYTRANSF == 2) {
      X.WARNING("Comanda deja a fost convertita!");
    }
  }
  //alerta de completat picker-ul
  if (SALDOC.FPRMS == 714) {
    if (
      SALDOC.CCCPICKER == "" ||
      SALDOC.CCCPICKER == null ||
      SALDOC.CCCPICKER == 0
    ) {
      X.EXCEPTION("Completati campul Picker depozit!");
    }
  }
  //alerta de completat metoda de livrare pe serie de document picking online
  if (SALDOC.SERIES == 7016) {
    if (
      SALDOC.SHIPMENT == "" ||
      SALDOC.SHIPMENT == null ||
      SALDOC.SHIPMENT == 0
    ) {
      X.EXCEPTION('Completati campul "Metoda de livrare"!');
    }
  }

  //Alerta pentru completarea campului Cda Arobs/Client in cazul seriei 7022 CONL
  {
    if (
      SALDOC.SERIES == 7022 &&
      (SALDOC.NUM04 == "" || SALDOC.NUM04 == null || SALDOC.NUM04 == 0)
    )
      X.EXCEPTION("Completati campul Cda Arobs/Client");
    else {
    }
  }

  //Daca am factura sau bon fiscal de la ONLINE, creez BT - InsertNewITEDOC

  //sterge linii cu bifa DA pe BOOL01
  if (SALDOC.FPRMS == 714) {
    //X.WARNING('Trece pe aici');
    //sterge la salvare cantitatile cu 0
    ITELINES.FIRST;
    while (!ITELINES.Eof) {
      if (ITELINES.BOOL01 == 1) {
        ITELINES.DELETE;
        ITELINES.FIRST;
      } else {
        ITELINES.NEXT;
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

  //interdictie modificare factura daca a fost trimisa si validata in ANAF, exceptie Sorin Fliundra

  /*
  if ((SALDOC.CCCEXPEFACTURA==1) && (SALDOC.CCCVALDEFACTURA==1) && (SALDOC.CCCIDANAFVIEW!=null) && (SALDOC.CCCIDDWLDVIEW!=null) && (X.SYS.USER!=1) && (X.SYS.USER!=1000)){
        X.EXCEPTION('Factura nu mai poate fi modificata, a fost deja incarcata si validata in SPV');
     } */
}

// Creare bon transfer intre 2 depozite Depozit si Online
function InsertNewITEDOC() {
  NEWFINDOCID = 0;
  nTransferSeries = 1101; // Seria bonului de transfer
  nFromWH = 1000; // Din gestiunea Depozit cu codul
  nToWH = 1150; // In gestiunea Online cu codul
  nToBranch = X.SYS.BRANCH; // In sucursala cu codul
  //verificare de stoc pe magazia sursa
  //VerifStocMag();

  try {
    ObjITEDOC = X.CreateObj("ITEDOC");
    ObjITEDOC.DBInsert;

    TblITEDOC = ObjITEDOC.FindTable("ITEDOC");
    TblITEDOC.Edit;
    TblITEDOC.SERIES = nTransferSeries; // Series, the series of the transfer document should already exist in the inventory documents
    TblITEDOC.TRNDATE = SALDOC.TRNDATE;

    TblMTRDOC = ObjITEDOC.FindTable("MTRDOC");
    TblMTRDOC.Edit;
    TblMTRDOC.WHOUSE = nFromWH; // From which warehouse
    TblMTRDOC.BRANCHSEC = nToBranch; // To which branch belongs the second warehouse
    TblMTRDOC.WHOUSESEC = nToWH; // To which warehouse

    TblITELINES = ObjITEDOC.FindTable("ITELINES");

    ITELINES.FIRST;
    while (!ITELINES.Eof) {
      stocVar = X.EVAL(
        "FRemQty1PerWHouse(ITELINES.MTRL,MTRDOC.WHOUSE,X.SYS.LOGINDATE)"
      );
      //stocVar2 = X.EVAL("FRemQty1PerWHouse(ITELINES.MTRL,1000,X.SYS.LOGINDATE)");

      if (stocVar < ITELINES.QTY1) {
        //X.WARNING(stocVar);
        TblITELINES.APPEND;
        TblITELINES.MTRL = ITELINES.MTRL;
        TblITELINES.QTY1 = ITELINES.QTY1 - stocVar;
        //TblITELINES.FINDOCS = FINDOCID;

        TblITELINES.POST;
      }
      ITELINES.NEXT;
    }

    NEWFINDOCID = ObjITEDOC.DBPost;
  } finally {
    ObjITEDOC.FREE;
    ObjITEDOC = null;
  }

  // If the new findoc was created succesfully
  if (NEWFINDOCID > 0) {
    sSQL = "select fincode from findoc where findoc = " + NEWFINDOCID;
    ds = X.GETSQLDATASET(sSQL, null);
    X.WARNING("Bon de transfer creat: " + ds.fincode);
    SALDOC.CCCBT = NEWFINDOCID;
  } else {
    X.WARNING("Problema creare bon de transfer");
  }
  if (SALDOC.FINDOC < 0) {
    X.EXEC("button:Save");
  }
}

function ON_ITELINES_POST() {
  if (SALDOC.SERIES != 7033) {
    if (
      ITELINES.CCCPRETCATALOG != 0 &&
      ITELINES.CCCPRETCATALOG != "" &&
      ITELINES.CCCPRETCATALOG != null &&
      ITELINES.CCCREDUCERE != "" &&
      ITELINES.CCCREDUCERE != 0 &&
      ITELINES.CCCREDUCERE != null
    ) {
      ITELINES.PRICE = roundNumber(
        ITELINES.CCCPRETCATALOG * (1 - ITELINES.CCCREDUCERE / 100),
        3
      );
    }
  }
}

function itereaza() {
  if (SALDOC.ISCANCEL != 0 || SALDOC.APPRV != 1 || SALDOC.SOCURRENCY != 123)
    return;

  vID = -1;
  USRID = X.SYS.USER;
  COMP = X.SYS.COMPANY;
  BRA = X.SYS.BRANCH;
  vID = SALDOC.FINDOC;
  if (vID < 0) vID = X.NEWID;
  tip = X.CONNECTIONSTATUS;

  DateforSQLQuery = X.EVAL("SQLDATE(SALDOC.TRNDATE)");
  randnou = String.fromCharCode(13) + String.fromCharCode(10);

  parametru = "VerificareVanzaresubCost";
  TRDR = SALDOC.TRDR;
  SOSOURCE = SALDOC.SOSOURCE;
  FPRMS = SALDOC.FPRMS;
  Series = SALDOC.Series;

  SQL =
    "SELECT dbo.fn_GCheckType(" +
    vID +
    ", " +
    USRID +
    ", " +
    COMP +
    ", " +
    BRA +
    ", " +
    tip +
    ", " +
    TRDR +
    ", " +
    SOSOURCE +
    ", " +
    FPRMS +
    ", " +
    Series +
    ", " +
    DateforSQLQuery +
    ", '" +
    parametru +
    "' ) rez ";

  DsRez = X.GETSQLDATASET(SQL, null);
  rez = DsRez.rez;

  if (rez == "return" || rez == "0" || rez == "" || rez == "exit") return;

  if (rez != "verifica" && rez != "1") {
    X.EXCEPTION(rez);
    return;
  }

  mesaj = "";
  ITELINES.FIRST;
  while (!ITELINES.EOF) {
    //code...

    DsP = X.GETSQLDATASET(
      "SELECT dbo.fnG_GetCostPrice(MTRL, " +
      SALDOC.FISCPRD +
      ", " +
      SALDOC.PERIOD +
      " ) CMP, isnull(MINPRCMK,0) MINPRCMK, left(MTRL.ACNMSK1,3) ACNMSK1  FROM MTRL WHERE MTRL=" +
      ITELINES.MTRL,
      null
    );
    CMP = DsP.CMP;
    MINPRCMK = DsP.MINPRCMK;
    cant = 0;

    //ITELINES.EDIT;
    ITELINES.CCCUNITCOST = CMP;
    ACNMSK1 = DsP.ACNMSK1;

    if (SALDOC.FPRMS == 721) {
      if (ACNMSK1 == "704" || ACNMSK1 == "709") {
        ITELINES.NUM03 = ITELINES.NETLINEVAL + ITELINES.VATAMNT;
      } else {
        ITELINES.NUM03 = 0;
      }
    }

    if (ITELINES.ISNULL("QTY1") != 1 && ITELINES.ISNULL("CCCUNITCOST") != 1) {
      if (ITELINES.MTRTYPE != 3)
        ITELINES.SALESCVAL = roundNumber(
          ITELINES.CCCUNITCOST * ITELINES.QTY1,
          2
        );
      else ITELINES.SALESCVAL = 0;
      cant = ITELINES.QTY1;
    }
    //ITELINES.POST;

    if (ITELINES.ISNULL("SALESCVAL") != 1 && ITELINES.ISNULL("LINEVAL") != 1) {
      valNetaMinima = roundNumber(
        ITELINES.SALESCVAL * (1.0 + MINPRCMK / 100),
        2
      );
      valLinie = roundNumber(ITELINES.LINEVAL, 2);

      if (cant > 0 && valLinie < valNetaMinima) {
        // doar pentru cantitati pozitive
        // mesaj=mesaj+'la linia: '+ITELINES.LINENUM+  ' valoarea minima este '+valNetaMinima +randnou;
      }
    }

    ITELINES.NEXT;
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
    DsP1 = X.GETSQLDATASET(
      "SELECT ISNULL(BOOL01,0) BOOL01 FROM FINDOC WHERE FINDOC=" +
      SALDOC.FINDOC,
      null
    );
    BOOL01 = DsP1.BOOL01;
    if (BOOL01 == 1) {
      X.EXCEPTION("Documentul s-a trimis la casa fiscala!");
      return;
    }

    var id = getID();
    CheckFolder("c:\\temp");
    CheckFolder("c:\\FPrintWin");
    CheckFolder("C:\\Program Files\\Datecs Applications\\FPrintWIN");

    sql = "exec dbo.G_CashDatecs " + id;
    var ds;
    try {
      ds = X.GETSQLDATASET(sql, null);
    } catch (e) {
      X.EXCEPTION(e.message);
      return;
    }

    var txtData = ds.txtData;
    ds = null;
    var fileName_Temp = "c:\\temp\\testfile.txt";
    var FisFinal = "C:\\FPrintWin\\cashfile.inp";
    SaveStringToFile(fileName_Temp, txtData);

    fso = new ActiveXObject("Scripting.FileSystemObject");
    f2 = fso.GetFile(fileName_Temp);
    f2.Copy(FisFinal, true);
    fso = null;

    //f2.Copy ("c:\\Temp\\backup.txt");
    //f2.Delete();
    WshShell = new ActiveXObject("WScript.Shell");
    WshShell.Run("C:\\FPrintWin\\Cash.cmd", 1, true);

    X.RUNSQL("update findoc set bool01=1 where findoc=" + id, null);
  }
}

function printare_bon_fprintWin1() {
  if (
    SALDOC.FPRMS == 721 ||
    SALDOC.FPRMS == 7101 ||
    SALDOC.FPRMS == 7105 ||
    SALDOC.FPRMS == 7120
  ) {
    DsP1 = X.GETSQLDATASET(
      "SELECT ISNULL(BOOL01,0) BOOL01 FROM FINDOC WHERE FINDOC=" +
      SALDOC.FINDOC,
      null
    );
    BOOL01 = DsP1.BOOL01;
    if (BOOL01 == 1) {
      X.EXCEPTION("Documentul s-a trimis la casa fiscala!");
      return;
    }
    CheckFolder("c:\\temp");
    CheckFolder("C:\\Program Files\\Datecs Applications\\FPrintWIN");

    var fso, f1, ts, s;
    var ForReading = 1;
    fso = new ActiveXObject("Scripting.FileSystemObject");

    f1 = fso.CreateTextFile("c:\\temp\\testfile.txt", true);

    ITELINES.FIRST;
    while (!ITELINES.EOF) {
      ceProdus = ITELINES.MTRL;
      Ds = X.GETSQLDATASET(
        "select name,1 as mtrmark from mtrl where mtrl=" + ceProdus,
        null
      );
      ceNume = Ds.name.substring(0, 22);
      //ceNume=ceNume.replace(/,/,' ');
      //ceNume=ceNume.replace(/;/,' ');
      //ceNume=ceNume.replace(/./,' ');

      ceGroup = 1;

      ce_pret = (ITELINES.LNETLINEVAL + ITELINES.LVATAMNT) / ITELINES.QTY1; // trimit la casa pret calculat;

      ce_cant = ITELINES.QTY1;

      ceCant = X.EVAL("LTrim(FString(" + ce_cant + ",12,3))");
      ceCant = ceCant.replace(/,/, "");

      cePret = X.EVAL("LTrim(FString(" + ce_pret + ",12,2))");
      cePret = cePret.replace(/,/, "");

      f1.WriteLine(
        "S,1,______,_,__;" +
        ceNume +
        ";" +
        cePret +
        ";" +
        ceCant +
        ";1;" +
        ceGroup +
        ";1;0;0;"
      );

      ITELINES.NEXT;
    }
    //f1.WriteLine("P,1,______,_,__;Va multumim!;");

    ceVal = parseLocalNum(SALDOC.SUMAMNT);
    //ceVal=0;
    //ceVal = X.EVAL('LTrim(FString('+ceVal+',12,2))');
    //ceVal = ceVal.replace(/,/,'.');

    //if(VBUFSET.CARDSPAYED!=0)
    //  {
    //	ceCard=VBUFSET.CARDSPAYED;
    //	f1.Wr/iteLine("T,1,______,_,__;3;"+ceCard+";;;;");
    //}

    //	f1.WriteLine("T,1,______,_,__;0;"+ceVal+";;;;");
    f1.Writeline("T,1,______,_,__;0;;;;;"); // trimit ca sa inchida cu cash totalul

    f1.Close();
    f2 = fso.GetFile("c:\\temp\\testfile.txt");
    f2.Copy("C:\\Program Files\\Datecs Applications\\FPrintWIN\\cashfile.inp");
    //f2.Copy ("c:\\Temp\\backup.txt");
    //f2.Delete();
    WshShell = new ActiveXObject("WScript.Shell");
    //WshShell.Run ("C:\\FPrintWin\\Cash.bat",1,true);

    X.RUNSQL("update findoc set bool01=1 where findoc=" + SALDOC.FINDOC, null);
  }
}

function ON_ITELINES_MTRL() {
  if (ITELINES.MTRL != 0) {
    AddPrice();
    applyPnlDims(ITELINES, resolvePnlLine(ITELINES));
  }
}

function AddPrice() {
  if (SALDOC.SERIES != 7130 && SALDOC.SERIES != 7131 && SALDOC.SERIES != 7210 && SALDOC.SERIES != 7023 && SALDOC.SERIES != 7047) {
    DateforSQLQuery = X.EVAL("SQLDATE(SALDOC.TRNDATE)");
    DsP = X.GETSQLDATASET(
      "SELECT PRICEW PV, PRICER PAM, MAXPRCDISC Red, dbo.fnG_GetCostPrice(MTRL, " +
      SALDOC.FISCPRD +
      ", " +
      SALDOC.PERIOD +
      " ) CMP, DBO.fn_GCheckAMA(MTRL.COMPANY, 1351," +
      SALDOC.FPRMS +
      ") IsRetail,  dbo.fnG_SalePrice(MTRL.MTRL, " +
      SALDOC.TRDR +
      ", " +
      SALDOC.FPRMS +
      ", " +
      DateforSQLQuery +
      ") PretClient FROM MTRL WHERE MTRL=" +
      ITELINES.MTRL,
      null
    );
    CMP = DsP.CMP;
    PretCat = DsP.PV;
    PretPAM = DsP.PAM;
    Red = DsP.Red;
    Pnet = DsP.Pnet;
    IsRetail = DsP.IsRetail;
    PretClient = DsP.PretClient;

    if (IsRetail != 1) {
      CCCPretcatalog = PretCat;
      //ITELINES.CCCReducere=Red;
    } else {
      CCCPretcatalog = PretPAM;
    }

    if (CCCPretcatalog > 0 && PretClient > 0 && PretClient > CCCPretcatalog) {
      ITELINES.CCCPretcatalog = PretClient; //PretClient > CCCPretcatalog
    } else {
      ITELINES.CCCPretcatalog = CCCPretcatalog;
    }

    if (PretClient > 0) {
      ITELINES.PRICE = PretClient;
    }
    ITELINES.CCCUNITCOST = CMP;
  }
}

function ON_ITELINES_CCCREDUCERE() {
  ITELINES.DISC1PRC = null;
  if (
    ITELINES.CCCPRETCATALOG != 0 &&
    ITELINES.CCCPRETCATALOG != "" &&
    ITELINES.CCCPRETCATALOG != null &&
    ITELINES.CCCREDUCERE != "" &&
    ITELINES.CCCREDUCERE != 0 &&
    ITELINES.CCCREDUCERE != null
  ) {
    ITELINES.PRICE = roundNumber(
      ITELINES.CCCPRETCATALOG * (1 - ITELINES.CCCREDUCERE / 100),
      3
    );
  }
}

//create a semaphor to avoid collision between on_itelines_qty1 and on_itelines_cccunitpack and on_itelines_ccccutii
var everybodyWantsQty1 = false;

function ON_ITELINES_QTY1() {
  //Kaufland si comanda
  if (
    SALDOC.TRDR == 12349 &&
    SALDOC.FPRMS == 701 &&
    ITELINES.MTRL != 0 &&
    ITELINES.QTY1 != 0
  ) {
    if (everybodyWantsQty1) {
      everybodyWantsQty1 = false;
      return;
    }
    var q =
      "select isnull(UnitPack,0) buc from CCCS1DXTRDRMTRL where trdr=" +
      SALDOC.TRDR +
      " and mtrl=" +
      ITELINES.MTRL;
    var nrUnitPerCutie = X.SQL(q, null);
    if (nrUnitPerCutie) {
      ITELINES.CCCUNITPACK = nrUnitPerCutie;
    }

    if (!nrUnitPerCutie) {
      ITELINES.CCCCUTII = 0.0;
    } else {
      ITELINES.CCCCUTII = ITELINES.QTY1 / nrUnitPerCutie;
    }
  }

  //if ((ITELINES.ISNULL('QTY1') == 1) || (ITELINES.ISNULL('CCCUNITCOST') == 1))
  if (ITELINES.ISNULL("QTY1") == 1) return;
  //	if (ITELINES.MTRTYPE!=3)
  //		ITELINES.SALESCVAL=roundNumber(ITELINES.CCCUNITCOST * ITELINES.QTY1,2);
  //	else
  //		ITELINES.SALESCVAL=0;

  if (SALDOC.SERIES != 7033) {
    if (
      ITELINES.CCCPRETCATALOG != 0 &&
      ITELINES.CCCPRETCATALOG != "" &&
      ITELINES.CCCPRETCATALOG != null &&
      ITELINES.CCCREDUCERE != "" &&
      ITELINES.CCCREDUCERE != 0 &&
      ITELINES.CCCREDUCERE != null
    ) {
      ITELINES.PRICE = roundNumber(
        ITELINES.CCCPRETCATALOG * (1 - ITELINES.CCCREDUCERE / 100),
        3
      );
    }
  }
}

function ON_ITELINES_CCCCUTII() {
  boxToQty1();
}

function ON_ITELINES_CCCUNITPACK() {
  boxToQty1();
}

function boxToQty1() {
  if (SALDOC.TRDR == 12349 && SALDOC.FPRMS == 701) {
    var qty1 = ITELINES.CCCCUTII * ITELINES.CCCUNITPACK;
    if (qty1 && qty1 != ITELINES.QTY1) {
      everybodyWantsQty1 = true;
      ITELINES.QTY1 = qty1;
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
      PretNet = (ITELINES.price * (100 - ITELINES.DISC1PRC)) / 100;
      X.warning(PretNet);
      // iau din baza Pret Achizitie
      DsA = X.GETSQLDATASET(
        "SELECT top 1 isnull(REPLPRICE,0) as Ach FROM MTRL WHERE MTRL=" +
        ITELINES.MTRL +
        " ",
        null
      );
      PretAch = DsA.Ach;
      //X.warning(PretAch);
      //DsA = X.GETSQLDATASET('SELECT Round(PRICEW/(1+(MAXPRCDISC/100)),4) as PM FROM MTRL WHERE MTRL='+ITELINES.MTRL,null);
      //PretMin = DsA.PM;
      //PRICEW/(1+MAXPRCDISC/100)
      //determin pret minim de vanzare (adaos 12%)
      PretMin = roundNumber(PretAch * 1.12, 2);
      //X.warning(PretMin);

      if (PretNet <= PretMin) {
        X.Warning(
          "Pret net (" +
          PretNet +
          ") sub pret minim de achizitie (" +
          PretMin +
          ")!"
        );
      }
    }
  }
}

function roundNumber(num, dec) {
  var result = Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
  return result;
}

function EXECCOMMAND(cmd) {
  if (cmd == 20260121) {
    var SERIES_COMPANY = 50;           // Company ID for series lookup
    var SERIES_SOSOURCE = 1351;
    var seriesObj = X.CREATEOBJ('SERIES');
    var seriesPrimaryKey = SERIES_COMPANY + ',' + SERIES_SOSOURCE + ',' + 9221;
    seriesObj.DBLOCATE(seriesPrimaryKey);
    var tblSeries = seriesObj.FindTable('SERIES');
    originalSoisconv = tblSeries.SOISCONV;
    if (originalSoisconv === true || originalSoisconv === 1) {
      tblSeries.EDIT;
      tblSeries.SOISCONV = false;
      seriesObj.DBPOST;
    } else {
      // Free the object if we don't need to restore
      seriesObj.FREE;
      seriesObj = null;
    }
  }

  //31.03.2025 - trimitere comanda externa in WMS
  if (cmd == 31032025) {
    ExportWMS();
  }

  //29.05.2025 - validare preturi in valuta
  if (cmd == 29052025) {
    if (SALDOC.SERIES == 7023)
      validare_pret();
  }

  if (cmd == 7101000) {
    printare_bon_fprintWin();
  }
  if (cmd == 7102000) {
    //exportXML1();
    exportXML();
  }
  if (cmd == 7103000) {
    exportXML1();
  }
  if (cmd == 20160928) {
    if (SALDOC.TRDR == 13249) {
      exportXMLCora();
    }
  }
  //CARREFOUR
  if (cmd == 20161017) {
    if (SALDOC.TRDR == 11322) {
      exportXMLCarrefour();
    }
  }
  //COLUMBUS
  if (cmd == 20170621) {
    if (SALDOC.TRDR == 25523) {
      exportXMLColumbus();
    }
  }
  //DEDEMAN factura tur
  if (cmd == 20190529) {
    if (SALDOC.TRDR == 11654) {
      exportXMLDedeman();
    }
  }

  //DEDEMAN factura retur (seria 7531)
  if (cmd == 20260511) {
    if (SALDOC.TRDR == 11654 && SALDOC.SERIES == 7531) {
      exportXMLDedemanReturn();
    } else {
      X.WARNING('Butonul este disponibil doar pentru documentele Dedeman seria 7531.');
    }
  }

  //zoom
  if (cmd == 202006111) {
    X.SETPROPERTY("PANEL", "Panel12", "VISIBLE", zoomed);
    X.SETPROPERTY("PANEL", "Panel13", "VISIBLE", zoomed);
    X.SETPROPERTY("PANEL", "Panel14", "VISIBLE", zoomed);
    X.SETPROPERTY("PANEL", "Panel15", "VISIBLE", zoomed);

    zoomed = !zoomed;
  }

  //ABC popup
  if (cmd == 202006121) {
    X.OPENSUBFORM("SFABCL");
  }

  if (cmd == 20210704) {
    if (SALDOC.NUM04.toString().length == 9) {
      //var resp = printAndFtp('SALDOC', 107, folderPath, SALDOC.FINDOC, 0, 0)
      var resp = processEmagMarketplace([SALDOC.FINDOC]);
      if (resp) X.WARNING(resp);
    }
  }

  if (cmd == 20240613) {
    var vSelRecs;
    vSelRecs = X.GETPARAM("SELRECS");
    vSelRecs = vSelRecs.replace(/\?/g, ",");
    //vSelRecs example: ((FINDOC.FINDOC IN (1447939,1447947,1447950)))
    //get the numbers
    var vSelRecsArr = vSelRecs.match(/\d+/g);
    if (vSelRecsArr.length) {
      var ans;
      ans = X.ASK(
        "eMag marketplace",
        "Confirmati trimiterea facturilor selectate la eMag marketplace?"
      );
      if (ans == 7 || ans == 2) X.EXCEPTION("Cancelled by user");
      //send batches of emagMarketplaceBatchSize from vSelRecsArr by calling trimiteSelectateLaEmag
      processEmagMarketplace(vSelRecsArr);
    } else {
      X.EXCEPTION("Nu sunt documente selectate");
    }
  }

  if (cmd == 20210915) {
    runExternalCode({ findoc: SALDOC.FINDOC });
  }

  if (cmd == 20211123) {
    if (debugg_mode.getComDanteFromDocProc) debugger;
    if (!test_mode.getComDanteFromDocProc) sfptFromDocProcess(folderPath);
    //processXML("c:\\S1Print\\FTP\\Online\\dante_out\\ORDERS_DXSziDUYPNMI0mwGF6euB02A_VAT_RO17275880.xml");
    parseFolderFileList(folderPath + danteOutFolder);
  }

  if (cmd == 20240618) {
    ITELINES.FIRST;
    while (!ITELINES.Eof) {
      //X.WARNING('ITELINES.QTY1 '+ITELINES.QTY1);

      //greutate bruta e-transport;
      sSqlW =
        "select isnull(CCCGREUTATEBRUTAKG,0) CCCGREUTATEBRUTAKG from MTRL where MTRL = " +
        ITELINES.MTRL;
      ds = X.GETSQLDATASET(sSqlW, null);

      ITELINES.GROSSMASS = roundNumber(
        ds.CCCGREUTATEBRUTAKG * ITELINES.QTY1,
        2
      );

      //greutate neta e-transport;
      sSqlW =
        "select isnull(WEIGHT,0) WEIGHT from MTRL where MTRL = " +
        ITELINES.MTRL;
      ds = X.GETSQLDATASET(sSqlW, null);

      ITELINES.NETMASS = roundNumber(ds.WEIGHT * ITELINES.QTY1, 2);

      ITELINES.NEXT;
    }
  }
}

function ExportWMS() {
  if ((SALDOC.CCCREADYWMS == 0) && (SALDOC.FPRMS == 700)) {
    var vFindocID;
    vFindocID = getID();
    //X.WARNING(GetID());
    //X.WARNING(vFindocID);
    X.RUNSQL("UPDATE FINDOC SET CCCREADYWMS = 1 WHERE FINDOC=:1", vFindocID);
    X.WARNING('Documentul a fost marcat pentru export in WMS');
  }

}

function validare_pret() {
  if (SALDOC.TRDR == 0)
    X.EXCEPTION('Selectati clientul !');
  //verificare daca clientul este in politica de preturi in valuta 101
  var vSQL = "SELECT COUNT(DIM1) AS NR " +
    "FROM PRCRDATA PR " +
    "WHERE PR.SODTYPE=13 AND PR.PRCRULE=101 " +
    "AND PR.DIM1=:1";
  var ds = X.GETSQLDATASET(vSQL, SALDOC.TRDR);
  var nr = ds.NR;
  if (nr == 0)
    X.EXCEPTION("Clientul nu se gaseste in politica de pret 101 de preturi in valuta!");
  // Validare preturi politica 101
  X.WARNING('Se incepe verificarea preturilor din linii');
  var contor = 0;
  var mesaj = '';
  ITELINES.FIRST;
  while (!ITELINES.EOF()) {
    //verific daca articolul din linie are pret in politica 101
    vSQL = "SELECT ISNULL(PR.FLD01,0) PRET " +
      "FROM PRCRDATA PR " +
      "WHERE PR.SODTYPE=13 AND PR.PRCRULE=101 " +
      "AND PR.DIM1=:1 " +
      "AND PR.DIM2=:2 " +
      "AND :3 BETWEEN PR.FROMDATE AND ISNULL(PR.FINALDATE,'2099-12-31') ";
    ds = X.GETSQLDATASET(vSQL, SALDOC.TRDR, ITELINES.MTRL, SALDOC.TRNDATE);
    if (ds.RECORDCOUNT == 0) {
      DsCod = X.GETSQLDATASET('select code from mtrl where mtrl=' + ITELINES.MTRL, null);
      //mesaj = mesaj + ' ' + DsCod.code + ' de pe linia  ' + ITELINES.LINENUM  + String.fromCharCode(13) + String.fromCharCode(10);
      mesaj = mesaj + ' ' + DsCod.code + String.fromCharCode(13) + String.fromCharCode(10);
      contor = contor + 1;
      ITELINES.PRICE = 0;
    }
    ITELINES.NEXT;
  } //while

  // X.EXEC('button:Save');
  if (contor > 0) {
    X.EXCEPTION('Urmatoarele articole nu se regasesc in politica de preturi in valuta: ' + String.fromCharCode(13) + String.fromCharCode(10) + mesaj);
  }

  X.WARNING('Preturi linii validate!');
}


function parseFolderFileList(folderspec) {
  var fso, f, fc;
  fso = new ActiveXObject("Scripting.FileSystemObject");
  f = fso.GetFolder(folderspec);
  fc = new Enumerator(f.files);
  for (; !fc.atEnd(); fc.moveNext()) {
    processXML(fc.item().Path, null);
  }
}

function processXML(xmlFile, xmlStr) {
  var xmlDoc = new ActiveXObject("Msxml2.DOMDocument.6.0");
  xmlDoc.async = false;
  if (xmlFile) xmlDoc.load(xmlFile);
  else if (xmlStr) xmlDoc.loadXML(xmlStr);

  createTblForXmlErr();

  if (xmlDoc.parseError.errorCode != 0) {
    var myErr = xmlDoc.parseError;
    if (xmlFile) postXmlErr(myErr.reason, xmlFile);
    else if (xmlStr) postXmlErr(myErr, xmlStr);
    return;
  } else {
    myErr = xmlDoc.parseError;
    if (myErr.errorCode != 0) {
      if (xmlFile) postXmlErr(myErr.reason, xmlFile);
      else if (xmlStr) postXmlErr(myErr, xmlStr);
      return;
    }
  }

  xmlDoc.setProperty("SelectionLanguage", "XPath");

  var orderID = xmlDoc.selectNodes("Order/ID").item(0).text,
    orderDate = xmlDoc.selectNodes("Order/IssueDate").item(0).text,
    CustomerEndpoint = xmlDoc
      .selectNodes("Order/BuyerCustomerParty/EndpointID")
      .item(0).text;

  createTblForXmlBak();

  //daca nu este dante endpoint
  if (CustomerEndpoint != "5949129999992") {
    return;
  }

  var deja = X.SQL(
    "select top 1 findoc from findoc where series=7012 and trdr = 11639 and num04=" +
    orderID,
    null
  );
  //daca a fost introdus deja
  if (!test_mode.getComDanteFromDocProc && deja) {
    markXmlAsOrderCreatedAndDelFile(orderID, true, xmlFile);
    return;
  }

  //backup xml to db before doing anything else
  bakXmlToDB(xmlDoc.xml, orderID, orderDate);

  var endpoint = xmlDoc
    .selectNodes("Order/DeliveryParty/EndpointID")
    .item(0).text,
    delivdate = xmlDoc
      .selectNodes("Order/RequestedDeliveryPeriod/EndDate")
      .item(0).text,
    coduriArticole = xmlDoc.selectNodes(
      "Order/OrderLine/Item/BuyersItemIdentification"
    ),
    canitati = xmlDoc.selectNodes("Order/OrderLine/Quantity/Amount"),
    preturi = xmlDoc.selectNodes("Order/OrderLine/Price/Amount"),
    denumiri = xmlDoc.selectNodes("Order/OrderLine/Item/Description"),
    denumiriPet = xmlDoc.selectNodes(
      "Order/OrderLine/Item/SellersItemIdentification"
    ),
    sume = xmlDoc.selectNodes("Order/OrderLine/LineExtensionAmount/Amount");

  var odoc = X.CREATEOBJFORM("SALDOC");
  try {
    var f = odoc.findTable("FINDOC"),
      l = odoc.findTable("ITELINES"),
      m = odoc.findTable("MTRDOC");
    odoc.dbinsert;
    f.edit;
    f.series = 7012;
    f.trdr = 11639;
    if (endpoint == "5940477490162") f.trdbranch = 3329;
    else if (endpoint == "5940477490018") f.trdbranch = 1890;
    if (orderID) f.NUM04 = orderID;
    if (orderDate) f.DATE01 = orderDate;
    if (delivdate) m.DELIVDATE = delivdate;
    for (var i = 0, errCnt = 0; i < coduriArticole.length; i++) {
      var idArticol = X.SQL(
        "select mtrl from CCCS1DXTRDRMTRL where trdr=11639 and code='" +
        coduriArticole.item(i).text +
        "'",
        null
      );
      if (idArticol) {
        l.append;
        l.MTRL = idArticol;
        l.QTY1 = parseFloat(canitati.item(i).text);
        l.PRICE = parseFloat(preturi.item(i).text);
        l.post;
      } else {
        if (errCnt == 0) {
          var new_masterid = getFirstAvailMasterid();
          X.RUNSQL(
            "insert into [dbo].[A_IKA_ORDER] (trdr, trdbranch, cusname, whouse, iscancel, apprv, branch, series, imported, imptype, comanda, cccs1dxid, orderdate, " +
            "filename, masterid, delivdate) values (11639, 3329, 'Dante', 1001, 0, 0, 1000, 7012, 0, 'Doc Process', " +
            orderID +
            ", " +
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
          );
        }

        X.RUNSQL(
          "insert into [dbo].[A_Ika_OrderDetail] (imptype, masterid, filename,qty1, price, LINEVAL, comments1, ean, comments) values ('Doc Process', " +
          new_masterid +
          ",'" +
          xmlFile +
          "'," +
          parseFloat(canitati.item(i).text) +
          ", " +
          parseFloat(preturi.item(i).text) +
          "," +
          parseFloat(sume.item(i).text) +
          ",'" +
          coduriArticole.item(i).text +
          "','" +
          coduriArticole.item(i).text +
          "','" +
          denumiri.item(i).text +
          "')",
          null
        );
        errCnt++;
      }
    }

    //exista erori, abort order creation, but mark it
    if (errCnt) {
      markXmlAsOrderCreatedAndDelFile(orderID, false);
      return;
    } else {
      //var id = odoc.dbPost;
      var id = odoc.showObjForm;
      if (id) {
        markXmlAsOrderCreatedAndDelFile(orderID, true, xmlFile);
      }
    }
  } catch (e) {
    X.WARNING(e.message);
  } finally {
    odoc.free;
    odoc = null;
  }

  function getFirstAvailMasterid() {
    return X.SQL(
      "SELECT top 1 n FROM (SELECT ROW_NUMBER() OVER (ORDER BY masterid) AS n FROM A_IKA_ORDER) n LEFT JOIN A_IKA_ORDER cda ON (n.n = cda.masterid) WHERE cda.masterid IS NULL",
      null
    );
  }

  function markXmlAsOrderCreatedAndDelFile(orderId, created, xmlFile) {
    var i = created ? 1 : 0;
    X.RUNSQL(
      "update CCCDOCPROCDANTEXML set orderCreated = " +
      i +
      " where orderID=" +
      orderId,
      null
    );

    if (created) {
      //delete file from local
      if (!test_mode.getComDanteFromDocProc) delFile(xmlFile);
    }
  }

  function createTblForXmlBak() {
    var createTblQ =
      "create table CCCDOCPROCDANTEXML (CCCDOCPROCDANTEXML int not null identity(1,1) primary key, dataExtractie datetime not null default getDate(), xml varchar(max) not null, " +
      "orderID int not null, orderDate date not null, orderCreated smallint default 0)",
      theQ = "if OBJECT_ID('dbo.CCCDOCPROCDANTEXML') is null " + createTblQ;

    X.RUNSQL(theQ, null);
  }

  function createTblForXmlErr() {
    var createTblQ =
      "create table CCCDOCPROCDANTEXMLERR (CCCDOCPROCDANTEXMLERR int not null identity(1,1) primary key, dataExtractie datetime not null default getDate(), xmlFile varchar(max) not null, " +
      "err varchar(max) not null)",
      theQ = "if OBJECT_ID('dbo.CCCDOCPROCDANTEXMLERR') is null " + createTblQ;

    X.RUNSQL(theQ, null);
  }

  function bakXmlToDB(xml, idCom, dataCom) {
    var doStuff =
      "insert into CCCDOCPROCDANTEXML (xml, orderID, orderDate) values ('" +
      xml +
      "', " +
      idCom +
      ",'" +
      dataCom +
      "')";
    //do not duplicate pretty please
    if (
      !X.SQL(
        "select orderID from CCCDOCPROCDANTEXML where orderID = " + idCom,
        null
      )
    )
      X.RUNSQL(doStuff, null);
  }

  function postXmlErr(err, xmlFile) {
    var doStuff =
      "insert into CCCDOCPROCDANTEXMLERR (xmlFile, err) values ('" +
      xmlFile +
      "', '" +
      err +
      "')";
    X.RUNSQL(doStuff, null);
  }
}

//printAndFtp('SALDOC', 107, folderPath)

function delFile(file) {
  var fso = new ActiveXObject("Scripting.FileSystemObject"),
    f2 = fso.GetFile(file);
  //f2.Copy ("c:\\Somth\\Bak");
  f2.Delete();
}

function exportXML1() {
  if (SALDOC.FPRMS == 712 && SALDOC.EXPN == 0) {
    aCommand =
      "XCMD:ClientImport,ScriptName: AR_ORIGINAL_INVOICE,myFindoc:" +
      SALDOC.FINDOC;
    X.EXEC(aCommand);
  }

  if (SALDOC.FPRMS == 712 && SALDOC.EXPN > 0) {
    aCommand =
      "XCMD:ClientImport,ScriptName: AR_ORIGINAL_INVOICE_WGT,myFindoc:" +
      SALDOC.FINDOC;
    X.EXEC(aCommand);
  }

  if (SALDOC.FPRMS == 753 || SALDOC.FPRMS == 953) {
    aCommand =
      "XCMD:ClientImport,ScriptName: AR_STORNO_INVOICE,myFindoc:" +
      SALDOC.FINDOC;
    X.EXEC(aCommand);
  }

  if (SALDOC.FPRMS == 703) {
    aCommand =
      "XCMD:ClientImport,ScriptName: AR_CORRECTION_INVOICE,myFindoc:" +
      SALDOC.FINDOC;
    X.EXEC(aCommand);
  }
}

//nu las sa selecteze seriile de avize custodie clienti pe acest view
function ON_SALDOC_SERIES() {
  if (SALDOC.SERIES == 7132 || SALDOC.SERIES == 7133) {
    X.EXCEPTION(
      "Pe aceasta fereastra nu se pot folosi seriile de avize custodie tur si retur! Va rugam folositi meniul Custodie marfuri clienti!"
    );
  }

  if (SALDOC.SERIES == 7210) {
    SALDOC.TRDR = 40225;
  }

  if (
    SALDOC.SERIES == 7011 ||
    SALDOC.SERIES == 7010 ||
    SALDOC.SERIES == 7112 ||
    SALDOC.SERIES == 7113 ||
    SALDOC.SERIES == 7023
  ) {
    //X.SETPROPERTY('PANEL', 'N_353391016', 'VISIBLE', false)
    X.SETPROPERTY("PANEL", "PanelExel", "VISIBLE", true);
    //X.SETPROPERTY('PANEL', 'Panel15', 'VISIBLE', false)
  } else {
    //X.SETPROPERTY('PANEL', 'N_353391016', 'VISIBLE', true)
    X.SETPROPERTY("PANEL", "PanelExel", "VISIBLE", false);
    //X.SETPROPERTY('PANEL', 'Panel15', 'VISIBLE', true)
  }
}

function ON_DELETE() {
  // stergerea documentului factura client online sau bon fiscal face si stergere de bon de transfer, daca
  if (SALDOC.SERIES == 7034 || SALDOC.SERIES == 7211) {
    if (SALDOC.CCCBT != 0 && SALDOC.CCCBT != null && SALDOC.CCCBT != "") {
      sSQL =
        "select top 1 A.findoc from mtrlines A left outer join findoc B on A.findoc = B.findoc where A.findoc= " +
        SALDOC.CCCBT +
        " and B.series = 1101 and B.sosource = 1151";
      ds = X.GETSQLDATASET(sSQL, null);

      if (ds.RECORDCOUNT > 0) {
        ObjConv = X.CreateObj("ITEDOC");

        ObjConv.DBLocate(SALDOC.CCCBT);
        ObjConv.DBDelete;
        //SALDOC.CCCBT = null;
      }
    }
  }

  ABC.D();

  //update findoc to null in cccsftpxml table daca gasesti findoc-ul
  var findoc = SALDOC.FINDOC
  if (findoc > 0) {
    X.RUNSQL('update cccsftpxml set findoc = null where findoc = ' + findoc, null)
  }
}

function ON_SALDOC_ISCANCEL() {
  // anularea documentului factura client online sau bon fiscal face si stergere de bon de transfer, daca
  if (SALDOC.SERIES == 7034 || SALDOC.SERIES == 7211) {
    if (SALDOC.CCCBT != 0 && SALDOC.CCCBT != null && SALDOC.CCCBT != "") {
      sSQL =
        "select top 1 A.findoc from mtrlines A left outer join findoc B on A.findoc = B.findoc where A.findoc= " +
        SALDOC.CCCBT +
        " and B.series = 1101 and B.sosource = 1151";
      ds = X.GETSQLDATASET(sSQL, null);

      if (ds.RECORDCOUNT > 0) {
        ObjConv = X.CreateObj("ITEDOC");

        ObjConv.DBLocate(SALDOC.CCCBT);
        ObjConv.DBDelete;
        //SALDOC.CCCBT = null;
      }
    }
  }

  if (SALDOC.ISCANCEL == 1) ABC.D();

  //update findoc to null in cccsftpxml table daca gasesti findoc-ul
  var findoc = SALDOC.FINDOC
  if (findoc > 0) {
    X.RUNSQL('update cccsftpxml set findoc = null where findoc = ' + findoc, null)
  }
}

//Export XML Cora factura tur si factura retur
function exportXMLCora() {
  if (SALDOC.SERIES == 7121) {
    aCommand =
      "XCMD:ClientImport,ScriptName: AR_CORA_ORIGINAL_INVOICE,myFindoc:" +
      SALDOC.FINDOC;
    X.EXEC(aCommand);
  }
  if (SALDOC.SERIES == 7531) {
    aCommand =
      "XCMD:ClientImport,ScriptName: AR_CORA_RETUR_INVOICE,myFindoc:" +
      SALDOC.FINDOC;
    X.EXEC(aCommand);
  }
}
//Export XML Carrefour factura tur si factura retur
function exportXMLCarrefour() {
  if (SALDOC.SERIES == 7121) {
    aCommand =
      "XCMD:ClientImport,ScriptName: AR_CARREFOUR_ORIG_INV,myFindoc:" +
      SALDOC.FINDOC;
    X.EXEC(aCommand);
  }
  if (SALDOC.SERIES == 7531) {
    aCommand =
      "XCMD:ClientImport,ScriptName: AR_CARREFOUR_RETUR_INV,myFindoc:" +
      SALDOC.FINDOC;
    X.EXEC(aCommand);
  }
}
//Export XML Carrefour factura tur si factura retur
function exportXMLColumbus() {
  if (SALDOC.SERIES == 7121) {
    aCommand =
      "XCMD:ClientImport,ScriptName: AT_COLUMBUS_ORIG_INV,myFindoc:" +
      SALDOC.FINDOC;
    X.EXEC(aCommand);
  }
  if (SALDOC.SERIES == 7531) {
    aCommand =
      "XCMD:ClientImport,ScriptName: AT_COLUMBUS_RETUR_INV,myFindoc:" +
      SALDOC.FINDOC;
    X.EXEC(aCommand);
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
    aCommand =
      "XCMD:ClientImport,ScriptName: ExpFactDedeman_ButonNew,myFindoc:" +
      SALDOC.FINDOC;
    X.EXEC(aCommand);
  }
}

//Export XML Dedeman factura retur (seria 7531)
function exportXMLDedemanReturn() {
  var findoc = SALDOC.FINDOC;
  var buyerOrderNumber = SALDOC.NUM04 ? String(SALDOC.NUM04) : '';
  var buyerOrderDate = X.FORMATDATE('yyyy-mm-dd', SALDOC.DATE01) ? X.FORMATDATE('yyyy-mm-dd', SALDOC.DATE01) + 'T00:00:00' : '';

  // ---- Header query ----
  var sqlHeader =
    'SELECT A.findoc Findoc,' +
    "isnull(A.fincode,'') InvoiceNumber," +
    "isnull(CONVERT(VARCHAR(10),A.trndate,120),'') Data," +
    "(SELECT TOP 1 isnull(CONVERT(VARCHAR(10),finaldate,120),'') FROM finpayterms WHERE findoc=A.findoc) InvoiceDueDate," +
    "(SELECT TOP 1 isnull(datediff(day,A.trndate,finaldate),0) FROM finpayterms WHERE findoc=A.findoc) PaymentTermsDays," +
    "isnull(C.CCCS1DXGLN,'') ILN," +
    "isnull(C.BGBULSTAT+C.AFM,'') TaxID," +
    "isnull(C.NAME,'') BuyerName," +
    "isnull(C.ADDRESS,'') BuyerStreet," +
    "isnull(C.ZIP,'') BuyerZip," +
    "isnull(C.city,'') BuyerCity," +
    "isnull(D.shortcut,'') BuyerCountry," +
    "isnull(E.CCCS1DXGLN,'') ShipToILN," +
    "isnull(E.NAME,'') ShipToName," +
    "isnull(E.ADDRESS,'') ShipToStreet," +
    "isnull(E.ZIP,'') ShipToZip," +
    "isnull(E.city,'') ShipToCity," +
    "isnull(F.shortcut,'') ShipToCountry," +
    "isnull(G.CCCS1DXGLN,'') SellerILN," +
    "isnull(A.CCCSELLERID,'') BuyerSellerID," +
    "isnull(G.AFM,'') SellerTaxID," +
    "isnull(Stuff(Stuff(G.BGREPNAME,9,0,'-'),18,0,'-'),'') BankAccount," +
    "isnull(G.BGREPTITLE,'') BankName," +
    "isnull(G.NAME,'') SellerName," +
    "isnull(G.ADDRESS,'') SellerStreet," +
    "isnull(G.ZIP,'') SellerZip," +
    "isnull(G.CITY,'') SellerCity," +
    "isnull(H.SHORTCUT,'') SellerCountry," +
    "isnull(G.PHONE2,'') SellerTel," +
    "(SELECT fincode FROM findoc WHERE findoc=(SELECT TOP 1 findocs FROM mtrlines WHERE findoc=A.findoc AND findocs IS NOT NULL)) RefInvoiceNumber," +
    "(SELECT isnull(replace(convert(varchar(50),trndate,120),' ','T'),'') FROM findoc WHERE findoc=(SELECT TOP 1 findocs FROM mtrlines WHERE findoc=A.findoc AND findocs IS NOT NULL)) RefInvoiceDate," +
    '(SELECT count(*) FROM mtrlines WHERE findoc=A.findoc AND sodtype=51) NumberOfLines,' +
    'convert(varchar(36),cast(round(A.NETAMNT*(-1),2) as numeric(36,2))) NetValue,' +
    'convert(varchar(36),cast(round(A.VATAMNT*(-1),2) as numeric(36,2))) TaxValue,' +
    'convert(varchar(36),cast(round(A.NETAMNT*(-1),2) as numeric(36,2))) TaxableValue,' +
    'convert(varchar(36),cast(round(A.SUMAMNT*(-1),2) as numeric(36,2))) GrossValue ' +
    'FROM findoc A ' +
    'LEFT OUTER JOIN mtrdoc B ON A.findoc=B.findoc ' +
    'LEFT OUTER JOIN trdr C ON A.trdr=C.trdr ' +
    'LEFT OUTER JOIN country D ON C.country=D.country ' +
    'LEFT OUTER JOIN trdbranch E ON A.trdbranch=E.trdbranch ' +
    'LEFT OUTER JOIN country F ON E.country=F.country ' +
    'LEFT OUTER JOIN company G ON A.company=G.company ' +
    'LEFT OUTER JOIN country H ON G.country=H.country ' +
    'WHERE A.findoc=' + findoc;

  var dsHeader = X.GETSQLDATASET(sqlHeader, null);
  if (!dsHeader.RECORDCOUNT) {
    X.EXCEPTION('Nu s-au gasit date pentru documentul curent.');
    return;
  }
  dsHeader.FIRST;

  // ---- Lines query (negated values, per-line RetAnn/Order/Delivery from findocs) ----
  var sqlLinii =
    'SELECT A.linenum ItemNum,' +
    "isnull(B.CODE1,'') EAN," +
    "isnull(D.CODE,'') BuyerItemID," +
    "isnull(B.code,'') SellerItemID," +
    "isnull(E.CODE,'') CustomTariffNumber," +
    'convert(varchar(36),cast(round(A.QTY1*(-1),2) as numeric(36,2))) QuantityValue,' +
    "'2D' TaxCategoryCoded," +
    "isnull(F.percnt,'') TaxPercent," +
    'convert(varchar(36),cast(round(A.VATAMNT*(-1),2) as numeric(36,2))) TaxAmount,' +
    'convert(varchar(36),cast(round((A.TRNLINEVAL+A.VATAMNT)*(-1),2) as numeric(36,2))) MonetaryGrossValue,' +
    'convert(varchar(36),cast(round(A.TRNLINEVAL*(-1),2) as numeric(36,2))) MonetaryNetValue,' +
    'convert(varchar(36),cast(round((A.TRNLINEVAL+A.VATAMNT)*(-1),2) as numeric(36,2))) MonetaryAmountPayable,' +
    "isnull(G.SHORTCUT,'') UnitOfMeasure," +
    'convert(varchar(36),cast(Round(A.TRNLINEVAL/A.QTY1,3) as numeric(36,3))) UnitPriceValue,' +
    'convert(varchar(36),cast(Round((A.TRNLINEVAL+A.VATAMNT)/A.QTY1,2) as numeric(36,2))) UnitPriceValueGross,' +
    "replace(B.NAME,'&',' ') LineName," +
    "isnull((SELECT fincode FROM findoc WHERE findoc=A.findocl),'') RetAnnNumber," +
    "isnull((SELECT replace(convert(varchar(50),trndate,120),' ','T') FROM findoc WHERE findoc=A.findocl),'') RetAnnDate," +
    "'" + buyerOrderNumber.replace(/'/g, "''") + "' BuyerOrderNumber," +
    "'" + buyerOrderDate + "' BuyerOrderDate," +
    "isnull((SELECT replace(convert(varchar(50),trndate,120),' ','T') FROM findoc WHERE findoc=A.findocl),'') DeliveryDate," +
    "isnull((SELECT fincode FROM findoc WHERE findoc=A.findocl),'') DeliveryDocumentNumber " +
    'FROM mtrlines A ' +
    'LEFT OUTER JOIN mtrl B ON A.mtrl=B.mtrl ' +
    'LEFT OUTER JOIN findoc C ON A.findoc=C.findoc ' +
    'LEFT OUTER JOIN CCCS1DXTRDRMTRL D ON A.mtrl=D.mtrl AND C.trdr=D.trdr ' +
    'LEFT OUTER JOIN intrastat E ON B.intrastat=E.intrastat AND A.company=E.company ' +
    'LEFT OUTER JOIN vat F ON A.vat=F.vat ' +
    'LEFT OUTER JOIN mtrunit G ON B.MTRUNIT1=G.MTRUNIT AND A.company=G.company ' +
    'WHERE A.findoc=' + findoc + ' AND A.sodtype=51';

  var dsLinii = X.GETSQLDATASET(sqlLinii, null);

  // ---- Tax summary query (negated) ----
  var sqlTax =
    "SELECT '2D' TaxCategoryCoded," +
    'convert(varchar(36),cast(round(B.percnt,2) as numeric(36,2))) TaxPercent,' +
    'convert(varchar(36),cast(round(A.SUBVAL*(-1),2) as numeric(36,2))) TaxNettoAmount,' +
    'convert(varchar(36),cast(round(A.SUBVAL*(-1),2) as numeric(36,2))) TaxableAmount,' +
    'convert(varchar(36),cast(round(A.VATVAL*(-1),2) as numeric(36,2))) TaxAmount,' +
    'convert(varchar(36),cast(round((A.SUBVAL+A.VATVAL)*(-1),2) as numeric(36,2))) TaxGrossAmount ' +
    'FROM vatanal A ' +
    'LEFT OUTER JOIN vat B ON A.vat=B.vat ' +
    'WHERE A.findoc=' + findoc;

  var dsTax = X.GETSQLDATASET(sqlTax, null);

  // ---- Validare campuri obligatorii (M) ----
  var erori = [];

  // Document
  if (!buyerOrderNumber) erori.push('<BuyerOrderNumber> (Numar comanda client) lipsa - completati campul NUM04 pe document');
  if (!buyerOrderDate) erori.push('<BuyerOrderDate> (Data comanda client) lipsa - completati campul DATE01 pe document');

  // Header
  if (!dsHeader.InvoiceNumber) erori.push('<InvoiceNumber> (numar document) lipsa');
  if (!dsHeader.ILN) erori.push('<ILN> BuyerParty (GLN Dedeman) lipsa - verificati CCCS1DXGLN pe partener');
  if (!dsHeader.TaxID) erori.push('<TaxID> BuyerParty (CUI Dedeman) lipsa');
  if (!dsHeader.BuyerName) erori.push('<Name> BuyerParty (Nume Dedeman) lipsa');
  if (!dsHeader.BuyerStreet) erori.push('<Street> BuyerParty (Adresa Dedeman) lipsa');
  if (!dsHeader.BuyerZip) erori.push('<PostalCode> BuyerParty (Cod postal Dedeman) lipsa');
  if (!dsHeader.BuyerCity) erori.push('<City> BuyerParty (Oras Dedeman) lipsa');
  if (!dsHeader.BuyerCountry) erori.push('<Country> BuyerParty (Tara Dedeman) lipsa');
  if (!dsHeader.ShipToILN) erori.push('<ILN> ShipToParty (GLN filiala Dedeman) lipsa - verificati CCCS1DXGLN pe filiala client');
  if (!dsHeader.ShipToName) erori.push('<Name> ShipToParty (Nume filiala) lipsa');
  if (!dsHeader.ShipToStreet) erori.push('<Street> ShipToParty (Adresa filiala) lipsa');
  if (!dsHeader.ShipToZip) erori.push('<PostalCode> ShipToParty (Cod postal filiala) lipsa');
  if (!dsHeader.ShipToCity) erori.push('<City> ShipToParty (Oras filiala) lipsa');
  if (!dsHeader.ShipToCountry) erori.push('<Country> ShipToParty (Tara filiala) lipsa');
  if (!dsHeader.SellerILN) erori.push('<ILN> SellerParty (GLN PetFactory) lipsa - verificati CCCS1DXGLN pe companie');
  if (!dsHeader.SellerTaxID) erori.push('<TaxID> SellerParty (CUI PetFactory) lipsa');
  if (!dsHeader.BankAccount) erori.push('<BankAccount> SellerParty (IBAN PetFactory) lipsa - verificati BGREPNAME pe companie');
  if (!dsHeader.SellerName) erori.push('<Name> SellerParty (Nume PetFactory) lipsa');
  if (!dsHeader.SellerStreet) erori.push('<Street> SellerParty (Adresa PetFactory) lipsa');
  if (!dsHeader.SellerZip) erori.push('<PostalCode> SellerParty (Cod postal PetFactory) lipsa');
  if (!dsHeader.SellerCity) erori.push('<City> SellerParty (Oras PetFactory) lipsa');
  if (!dsHeader.SellerCountry) erori.push('<Country> SellerParty (Tara PetFactory) lipsa');
  if (!dsHeader.InvoiceDueDate) erori.push('<InvoiceDueDate> (Termen plata) lipsa - verificati FINPAYTERMS');

  // Linii
  dsLinii.FIRST;
  while (!dsLinii.EOF) {
    var ln = 'Linia ' + dsLinii.ItemNum + ': ';
    if (!dsLinii.EAN) erori.push(ln + '<EAN> lipsa');
    if (!dsLinii.BuyerItemID) erori.push(ln + '<BuyerItemID> (cod articol Dedeman) lipsa - verificati CCCS1DXTRDRMTRL');
    if (!dsLinii.UnitOfMeasure) erori.push(ln + '<UnitOfMeasure> (UM) lipsa');
    if (!dsLinii.LineName) erori.push(ln + '<Name> (denumire articol) lipsa');
    if (!dsLinii.RetAnnNumber) erori.push(ln + '<RetAnnNumber> (numar aviz retur) lipsa - verificati FINDOCL');
    if (!dsLinii.RetAnnDate) erori.push(ln + '<RetAnnDate> (data aviz retur) lipsa - verificati FINDOCL');
    if (!dsLinii.DeliveryDocumentNumber) erori.push(ln + '<DeliveryDocumentNumber> (numar aviz livrare) lipsa - verificati FINDOCL');
    if (!dsLinii.DeliveryDate) erori.push(ln + '<DeliveryDate> (data livrare) lipsa - verificati FINDOCL');
    dsLinii.NEXT;
  }
  dsLinii.FIRST;

  if (erori.length > 0) {
    var ans = X.ASK('XML Dedeman Retur - campuri obligatorii lipsa', '[Ref: INVOICE TECHNICAL SPECIFICATION - DEDICATED FOR DEDEMAN PROJECT - VERSION 4.0 - EDInet XML]\n\n' + erori.join('\n') + '\n\nGenerati XML totusi?');
    if (ans != 6) return; // 6=Yes, 7=No, 2=Cancel
  }

  // ---- Build XML ----
  function tag(name, val) {
    return '<' + name + '>' + (val !== undefined && val !== null ? val : '') + '</' + name + '>';
  }

  var xml = [];
  xml.push('<?xml version="1.0" encoding="UTF-8"?>');
  xml.push('<Invoice Version="1.0.1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.infinite.pl/pub/doc/fmt/xml/invoice/1.0/invoice.xsd">');

  // InvoiceHeader
  xml.push('<InvoiceHeader>');
  xml.push('  ' + tag('InvoiceNumber', dsHeader.InvoiceNumber));
  xml.push('  ' + tag('Date', dsHeader.Data));
  xml.push('  ' + tag('InvoiceDueDate', dsHeader.InvoiceDueDate || dsHeader.Data));
  xml.push('  ' + tag('PaymentTerms', dsHeader.PaymentTermsDays));
  xml.push('  ' + tag('PaymentTermsQualifier', '3'));
  xml.push('  <PaymentMethod>');
  xml.push('    ' + tag('Code', '42'));
  xml.push('    ' + tag('Description', ''));
  xml.push('  </PaymentMethod>');
  xml.push('  ' + tag('InvoiceCurrencyCoded', 'RON'));
  xml.push('  ' + tag('InvoicePurposeCoded', 'O'));
  xml.push('  ' + tag('DocumentRole', 'R'));
  xml.push('  ' + tag('InvType', 'RETURN'));
  xml.push('  ' + tag('Comment', ''));
  xml.push('</InvoiceHeader>');

  // InvoiceParty
  xml.push('<InvoiceParty>');

  // BuyerParty = DEDEMAN
  xml.push('  <BuyerParty>');
  xml.push('    ' + tag('ILN', dsHeader.ILN));
  xml.push('    ' + tag('TaxID', dsHeader.TaxID));
  xml.push('    ' + tag('Name', dsHeader.BuyerName));
  xml.push('    ' + tag('Street', dsHeader.BuyerStreet));
  xml.push('    ' + tag('HouseNumber', ''));
  xml.push('    ' + tag('PostalCode', dsHeader.BuyerZip));
  xml.push('    ' + tag('City', dsHeader.BuyerCity));
  xml.push('    ' + tag('Country', dsHeader.BuyerCountry));
  xml.push('  </BuyerParty>');

  // InvoiceeParty = DEDEMAN (same)
  xml.push('  <InvoiceeParty>');
  xml.push('    ' + tag('ILN', dsHeader.ILN));
  xml.push('    ' + tag('Name', dsHeader.BuyerName));
  xml.push('    ' + tag('Street', dsHeader.BuyerStreet));
  xml.push('    ' + tag('HouseNumber', ''));
  xml.push('    ' + tag('PostalCode', dsHeader.BuyerZip));
  xml.push('    ' + tag('City', dsHeader.BuyerCity));
  xml.push('    ' + tag('Country', dsHeader.BuyerCountry));
  xml.push('  </InvoiceeParty>');

  // ShipToParty = TRDBRANCH (locatia Dedeman)
  xml.push('  <ShipToParty>');
  xml.push('    ' + tag('ILN', dsHeader.ShipToILN));
  xml.push('    ' + tag('Name', dsHeader.ShipToName));
  xml.push('    ' + tag('Street', dsHeader.ShipToStreet));
  xml.push('    ' + tag('HouseNumber', ''));
  xml.push('    ' + tag('PostalCode', dsHeader.ShipToZip));
  xml.push('    ' + tag('City', dsHeader.ShipToCity));
  xml.push('    ' + tag('Country', dsHeader.ShipToCountry));
  xml.push('  </ShipToParty>');

  // SellerParty = PET FACTORY
  xml.push('  <SellerParty>');
  xml.push('    ' + tag('ILN', dsHeader.SellerILN));
  xml.push('    ' + tag('BuyerSellerID', dsHeader.BuyerSellerID));
  xml.push('    ' + tag('TaxID', dsHeader.SellerTaxID));
  xml.push('    ' + tag('BankAccount', dsHeader.BankAccount));
  xml.push('    ' + tag('BankAccountOwner', ''));
  xml.push('    ' + tag('BankName', dsHeader.BankName));
  xml.push('    ' + tag('Name', dsHeader.SellerName));
  xml.push('    ' + tag('Street', dsHeader.SellerStreet));
  xml.push('    ' + tag('HouseNumber', ''));
  xml.push('    ' + tag('PostalCode', dsHeader.SellerZip));
  xml.push('    ' + tag('City', dsHeader.SellerCity));
  xml.push('    ' + tag('Country', dsHeader.SellerCountry));
  xml.push('    <Contact>');
  xml.push('      ' + tag('Person', 'Ion Ion'));
  xml.push('      ' + tag('Tel', dsHeader.SellerTel));
  xml.push('    </Contact>');
  xml.push('  </SellerParty>');

  // ShipFromParty = gol
  xml.push('  <ShipFromParty>');
  xml.push('    ' + tag('ILN', ''));
  xml.push('    ' + tag('Name', ''));
  xml.push('    ' + tag('Street', ''));
  xml.push('    ' + tag('HouseNumber', ''));
  xml.push('    ' + tag('PostalCode', ''));
  xml.push('    ' + tag('City', ''));
  xml.push('    ' + tag('Country', ''));
  xml.push('  </ShipFromParty>');

  xml.push('</InvoiceParty>');

  // InvoiceDetail - linii
  xml.push('<InvoiceDetail>');
  var nContor = 0;
  dsLinii.FIRST;
  while (!dsLinii.EOF) {
    nContor++;
    xml.push('  <Item>');
    xml.push('    ' + tag('ItemNum', nContor));
    xml.push('    ' + tag('EAN', dsLinii.EAN));
    xml.push('    ' + tag('BuyerItemID', dsLinii.BuyerItemID));
    xml.push('    ' + tag('SellerItemID', dsLinii.SellerItemID));
    xml.push('    ' + tag('CustomTariffNumber', dsLinii.CustomTariffNumber));
    xml.push('    ' + tag('ProductIdentifierExt', 'CU'));
    xml.push('    ' + tag('PacketContentQuantity', ''));
    xml.push('    ' + tag('PackageType', 'CT'));
    xml.push('    ' + tag('QuantityValue', dsLinii.QuantityValue));
    xml.push('    ' + tag('TaxCategoryCoded', '2D'));
    xml.push('    ' + tag('TaxPercent', dsLinii.TaxPercent));
    xml.push('    ' + tag('TaxAmount', dsLinii.TaxAmount));
    xml.push('    ' + tag('MonetaryGrossValue', dsLinii.MonetaryGrossValue));
    xml.push('    ' + tag('MonetaryNetValue', dsLinii.MonetaryNetValue));
    xml.push('    ' + tag('MonetaryAmountPayable', dsLinii.MonetaryAmountPayable));
    xml.push('    ' + tag('UnitOfMeasure', dsLinii.UnitOfMeasure));
    xml.push('    ' + tag('UnitOfMeasureXCBL', ''));
    xml.push('    ' + tag('PackUnitOfMeasure', dsLinii.UnitOfMeasure));
    xml.push('    ' + tag('UnitPriceValue', dsLinii.UnitPriceValue));
    xml.push('    ' + tag('UnitPriceValueGross', dsLinii.UnitPriceValueGross));
    xml.push('    ' + tag('Name', dsLinii.LineName));
    xml.push('    <ReturnsAnnouncement>');
    xml.push('      ' + tag('RetAnnNumber', dsLinii.RetAnnNumber));
    xml.push('      ' + tag('RetAnnDate', dsLinii.RetAnnDate));
    xml.push('    </ReturnsAnnouncement>');
    xml.push('    <Order>');
    xml.push('      ' + tag('BuyerOrderNumber', dsLinii.BuyerOrderNumber));
    xml.push('      ' + tag('BuyerOrderDate', dsLinii.BuyerOrderDate));
    xml.push('    </Order>');
    xml.push('    <DeliveryDetail>');
    xml.push('      ' + tag('DeliveryDate', dsLinii.DeliveryDate));
    xml.push('      ' + tag('DeliveryDocumentNumber', dsLinii.DeliveryDocumentNumber));
    xml.push('    </DeliveryDetail>');
    xml.push('  </Item>');
    dsLinii.NEXT;
  }
  xml.push('</InvoiceDetail>');

  // InvoiceSummary
  xml.push('<InvoiceSummary>');
  xml.push('  ' + tag('NumberOfLines', dsHeader.NumberOfLines));
  xml.push('  ' + tag('NetValue', dsHeader.NetValue));
  xml.push('  ' + tag('TaxValue', dsHeader.TaxValue));
  xml.push('  ' + tag('TaxableValue', dsHeader.TaxableValue));
  xml.push('  ' + tag('GrossValue', dsHeader.GrossValue));
  xml.push('  <TaxSummary>');
  dsTax.FIRST;
  while (!dsTax.EOF) {
    xml.push('    <Tax>');
    xml.push('      ' + tag('TaxCategoryCoded', '2D'));
    xml.push('      ' + tag('TaxPercent', dsTax.TaxPercent));
    xml.push('      ' + tag('TaxNettoAmount', dsTax.TaxNettoAmount));
    xml.push('      ' + tag('TaxableAmount', dsTax.TaxableAmount));
    xml.push('      ' + tag('TaxAmount', dsTax.TaxAmount));
    xml.push('      ' + tag('TaxGrossAmount', dsTax.TaxGrossAmount));
    xml.push('    </Tax>');
    dsTax.NEXT;
  }
  xml.push('  </TaxSummary>');
  xml.push('</InvoiceSummary>');
  xml.push('</Invoice>');

  // ---- Scrie fisier UTF-8 si deschide in Notepad ----
  var vFileName = dsHeader.InvoiceNumber + '_' + dsHeader.Data + '.xml';
  var vPath = 'C:\\EDI\\Dedeman\\Facturi_Retur\\';
  var vFilePath = vPath + vFileName;

  var fso = new ActiveXObject('Scripting.FileSystemObject');
  if (!fso.FolderExists(vPath)) {
    var parts = vPath.replace(/\\+$/, '').split('\\');
    var cur = '';
    for (var pi = 0; pi < parts.length; pi++) {
      cur += parts[pi] + '\\';
      if (cur.length > 3 && !fso.FolderExists(cur)) {
        fso.CreateFolder(cur);
      }
    }
  }

  var stream = new ActiveXObject('ADODB.Stream');
  stream.Type = 2; // text
  stream.Charset = 'UTF-8';
  stream.Open();
  stream.WriteText(xml.join('\r\n'));
  stream.SaveToFile(vFilePath, 2); // 2 = overwrite
  stream.Close();

  var shell = new ActiveXObject('WScript.Shell');
  shell.Run('notepad.exe "' + vFilePath + '"');
}

//ABC related
function applyPnlDims(line, dims) {
  if (!dims) {
    return;
  }
  line.CCCABCDIM2 = dims[2];
  line.CCCABCDIM4 = dims[4];
  line.CCCABCDIM6 = dims[6];
  line.CCCABCDIM7 = dims[7];
  line.CCCACTGROUP = dims.actgroup;
  line.CCCABCDIM8 = dims[8];
}

function resolvePnlLine(line) {
  return ABC.setImpliciteLinie({
    mtrl: line.MTRL,
    trdr: SALDOC.TRDR,
    salesman: SALDOC.SALESMAN,
    series: SALDOC.SERIES,
    fprms: SALDOC.FPRMS,
    manualDims: {
      2: line.CCCABCDIM2,
      4: line.CCCABCDIM4,
      6: line.CCCABCDIM6,
      7: line.CCCABCDIM7,
      8: line.CCCABCDIM8,
      actgroup: line.CCCACTGROUP
    }
  });
}

function clearPnlActGroupCascade(line) {
  line.CCCACTGROUP = null;
  line.CCCABCDIM8 = null;
}

function clearPnlDim8Cascade(line) {
  line.CCCABCDIM8 = null;
}

function ON_ITELINES_NEW() {
  //applyPnlDims(ITELINES, resolvePnlLine(ITELINES));
}

function ON_ITELINES_CCCABCDIM4() {
  ABC.setLineEditors('ITELINES', ITELINES);
}

function ON_ITELINES_CCCABCDIM7() {
  clearPnlActGroupCascade(ITELINES);
}

function ON_ITELINES_CCCACTGROUP() {
  clearPnlDim8Cascade(ITELINES);
}

function ON_SRVLINES_NEW() {
  //applyPnlDims(SRVLINES, resolvePnlLine(SRVLINES));
}

function ON_SRVLINES_MTRL() {
  applyPnlDims(SRVLINES, resolvePnlLine(SRVLINES));
}

function ON_SRVLINES_CCCABCDIM4() {
  ABC.setLineEditors('SRVLINES', SRVLINES);
}

function ON_SRVLINES_CCCABCDIM7() {
  clearPnlActGroupCascade(SRVLINES);
}

function ON_SRVLINES_CCCACTGROUP() {
  clearPnlDim8Cascade(SRVLINES);
}

function initABC() {
  var q =
    "select CCCABCREPRSENTBUSINESS catCom from trdr where trdbusiness=112",
    dsCatCom = X.GETSQLDATASET(q, null),
    trdb = X.SQL(
      "select trdbusiness from trdr where trdr=" + SALDOC.TRDR,
      null
    ),
    reprezentant;

  if (dsCatCom.RECORDCOUNT) {
    dsCatCom.FIRST;
    while (!dsCatCom.eof) {
      if (trdb == dsCatCom.catCom) {
        reprezentant = X.SQL(
          "select trdr from trdr where cccabcreprsentbusiness=" + trdb,
          null
        );
        break;
      }
      dsCatCom.NEXT;
    }
  }

  ABC.init({
    module: SALDOC,
    lines1: ITELINES,
    lines2: SRVLINES,
    source: 'SALDOC',
    doc: {
      trdr: SALDOC.TRDR,
      salesman: SALDOC.SALESMAN,
      truck: SALDOC.SALESMAN ? X.SQL('select isnull(trucks, 0) from prsn where prsn=' + SALDOC.SALESMAN, null) : null,
      trdbranch: SALDOC.TRDBRANCH,
      trdbusiness: SALDOC.TRDR_CUSTOMER_TRDBUSINESS
    }
  });
}

function ON_SALDOC_TRDR() {
  var reprVanzari = X.SQL(
    "select salesman from trdr where trdr=" + SALDOC.TRDR,
    null
  );
  if (reprVanzari) {
    SALDOC.SALESMAN = reprVanzari;
  }
  initABC();

  //verificare preturi valuta din politica 101 pentru comanda externa
  if (SALDOC.SERIES == 7023)
    validare_pret();

}

function ON_SALDOC_SALESMAN() {
  initABC();
}

function ON_SALDOC_TRDBRANCH() {
  initABC();

  //select CCCS1DXGLN from trdbranch where trdbranch = SALDOC.TRDBRANCH
  updateSaldocCommentsBasedOnGln();
}

function updateSaldocCommentsBasedOnGln() {
  var gln = X.SQL(
    "select isnull(CCCS1DXGLN, 0) from trdbranch where trdbranch=" +
    SALDOC.TRDBRANCH,
    null
  );

  /*
  daca gln este unul din urmatoarele, atunci e SALDOC.COMMENTS = 'Banner Profi'
  5949065001124
  5949065001131
  5949065001148
  5949065001155
  5949065001162
  5949065001179
  */
  var bannerProfiGlns = [
    "5949065001124",
    "5949065001131",
    "5949065001148",
    "5949065001155",
    "5949065001162",
    "5949065001179"
  ];
  //5940475873134, 5940475875190: Mega
  var bannerMegaGlns = [
    "5940475873134",
    "5940475875190"
  ];
  if (bannerProfiGlns.indexOf(gln) !== -1) {
    SALDOC.COMMENTS = "Banner Profi";
  } else if (bannerMegaGlns.indexOf(gln) !== -1) {
    SALDOC.COMMENTS = "Banner Mega Image";
  }
}

function ON_CREATE() {
  //X.WARNING('__ABC module loaded__');
  ChangeBrowserMenu(); //Change context menu of browser
}

function ChangeBrowserMenu() {
  //StringList of most SoftOne Objects Browser is BRMENU
  var vBrowserMenu = X.EXEC("CODE:ModuleIntf.FindXStrings", X.MODULE, "BRMENU");
  X.EXEC("CODE:PiLib.TStringsAdd", vBrowserMenu, "-=-"); //divider
  X.EXEC(
    "CODE:PiLib.TStringsAdd",
    vBrowserMenu,
    "20240613=1;eMag marketplace: Trimite facturi"
  ); //1; displays the job when one or more rows are selected.
  X.EXEC("CODE:SysRequest.RefreshPopupMenu", X.MODULE, "BRMENU", 1);
}

function ON_LOCATE() {
  //debugger;
  initABC(); //init la modificare doc
  ABC.setBaseLineEditors(['ITELINES', 'SRVLINES']);
  if (!aDoua) {
    //saveABC();
  } else {
    aDoua = false;
  }

  X.ABCST.REFRESH;
  X.INVALIDATEFIELD("ITELINES.CCCABCDIM2");

  if (SALDOC.SERIES == 7011 || SALDOC.SERIES == 7011 || SALDOC.SERIES == 7023) {
    //X.SETPROPERTY('PANEL', 'N_353391016', 'VISIBLE', false)
    X.SETPROPERTY("PANEL", "PanelExel", "VISIBLE", true);
    //X.SETPROPERTY('PANEL', 'Panel15', 'VISIBLE', false)
  } else {
    //X.SETPROPERTY('PANEL', 'N_353391016', 'VISIBLE', true)
    X.SETPROPERTY("PANEL", "PanelExel", "VISIBLE", false);
    //X.SETPROPERTY('PANEL', 'Panel15', 'VISIBLE', true)
  }
}

function saveABC() {
  ABC.D();
  ABC.upsert();
}

function ON_INSERT() {
  initABC(); //init la modificare doc
}

function sfpt2DocProcess(fisier, logFldr, trimis) {
  if (trimis) return;

  asiguraCalea(logFldr);

  var initialDir =
    "/001G_rFRDUyK4xAMVFfEFelF5WNqhBNujBx38gMmV1fVqIGLNZoQg5f/in/",
    winscpAction = '"put -delete -resume ' + fisier + " " + initialDir + ' " ';
  connect2SftpDocProc(logFldr, winscpAction, true);
}

function sfptFromDocProcess(logFldr) {
  var initialDir =
    "/001G_rFRDUyK4xAMVFfEFelF5WNqhBNujBx38gMmV1fVqIGLNZoQg5f/out/",
    downloadDir = folderPath + "dante_out\\",
    winscpAction =
      '"get -resume ' + initialDir + "order*.xml " + downloadDir + ' " ';

  asiguraCalea(logFldr);
  asiguraCalea(downloadDir);
  connect2SftpDocProc(logFldr, winscpAction, false);
}

function connect2SftpDocProc(logFldr, winscpAction, toBeMarked) {
  try {
    var oShell = new ActiveXObject("Shell.Application"),
      url = "dx.doc-process.com:2222/",
      usr = "pet_factory",
      //passphrase = 'PetFactory2021#'.replace('%', '%25').replace('#', '%23').replace(' ', '%20').replace('+', '%2B').replace('/', '%2F').replace('@', '%40').replace(':', '%3A').replace(';', '%3B'),
      passphrase = "PetFactory2021#",
      priv = "",
      nume_priv = "Private Key.ppk",
      fingerprint = "ssh-rsa 2048 BgJCCAEN43vo4+AL1uCvW4MNUioITEQ5+W10ubLAeUs=",
      wd = "",
      sFile = "",
      winscpComm = "",
      vArguments = "",
      vDirectory = "",
      vOperation = "open",
      vShow = 0,
      WshShell = new ActiveXObject("WScript.Shell");
    wd = WshShell.CurrentDirectory;
    priv = wd + "\\" + nume_priv;
    winscpComm =
      '"open sftp://' +
      usr +
      "@" +
      url +
      ' -hostkey=""' +
      fingerprint +
      '"" -privatekey=""' +
      priv +
      '"" -passphrase=""' +
      passphrase +
      '"" -rawsettings AuthKI=0 AuthGSSAPIKEX=1 GSSAPIFwdTGT=1" ' +
      winscpAction +
      '"exit"';
    vArguments =
      ' /log="' +
      logFldr +
      'WinSCP.log" /xmllog="' +
      logFldr +
      'WinSCP.xml" /loglevel=0 /nointeractiveinput /ini=nul /command ' +
      winscpComm;
    sFile = wd + "\\WinSCP.com";

    oShell.ShellExecute(sFile, vArguments, vDirectory, vOperation, vShow);
    if (debugg_mode.trimiteInv2DanteFromDocProc) X.WARNING(vArguments);
    if (toBeMarked) markItAsSentDate();
    return true;
  } catch (e) {
    X.WARNING(e.message);
    return false;
  }
}

function markItAsSentDate() {
  X.RUNSQL(
    "update mtrdoc set CCCXMLSendDate=GETDATE() where findoc=" + SALDOC.FINDOC,
    null
  );
}

function ON_RESTOREEVENTS() {
  // excludere copiere date Efactura la conversie
  SALDOC.CCCAPRBEFACTURA = null;
  SALDOC.CCCEXPEFACTURA = null;
  SALDOC.CCCVALDEFACTURA = null;
  SALDOC.CCCIDANAFVIEW = null;
  SALDOC.CCCIDDWLDVIEW = null;
  SALDOC.CCCFCTELLOADDATE = null;
  SALDOC.CCCFCTELVLDDATE = null;
  SALDOC.CCCEROARE = null;
  SALDOC.CCCEROAREMSJ = null;
  // end excludere efactura
  preiaDateAviz();
}

function preiaDateAviz() {
  if (SALDOC.FPRMS == 712) {
    ITELINES.FIRST;
    if (ITELINES.FINDOCS) {
      var dataset = X.GETSQLDATASET(
        "SELECT FINDOC, FPRMS, TRNDATE, FINCODE FROM FINDOC WHERE FINDOC=" +
        ITELINES.FINDOCS,
        null
      );
      if (dataset.RECORDCOUNT > 0) {
        dataset.FIRST;
        if (dataset.FPRMS == 711) {
          //factura provenita din aviz livrare
          MTRDOC.CCCDispatcheDate = dataset.TRNDATE;
          MTRDOC.CCCDispatcheDoc = dataset.FINCODE;
        }
      }
    }
  }
}

function import_fisier() {
  var Excel = new ActiveXObject("Excel.Application");
  var ExcelApp = Excel.Workbooks.Open(SALDOC.VARCHAR01);
  var ExcelSheet = ExcelApp.Worksheets(1);
  var iRows = Excel.ActiveSheet.UsedRange.Rows.Count;
  var jCol = Excel.ActiveSheet.UsedRange.Columns.Count;

  vMess = "Urmatoarele articole nu exista in nomenclator:";
  vMess1 =
    "Urmatoarele articole nu se regasesc in Fisier Import si sunt eliminate:";
  vNotFound = 0;
  vNotFound1 = 0;
  i = 2;
  while (i <= iRows) {
    var vCod = ExcelSheet.Cells(i, 2).Value;

    var vCant = ExcelSheet.Cells(i, 5).Value;

    var vPret = ExcelSheet.Cells(i, 9).Value;

    DsMtrl = X.GETSQLDATASET(
      "select isnull(mtrl,0) as mtrl from mtrl where code=" +
      String.fromCharCode(39) +
      vCod +
      String.fromCharCode(39),
      null
    );

    if (DsMtrl.mtrl > 0) {
      ITELINES.APPEND;
      ITELINES.MTRL = DsMtrl.mtrl;
      ITELINES.QTY1 = vCant;
      if (SALDOC.SOCURRENCY != 123) {
        ITELINES.PRICE = vPret;
      }
      ITELINES.POST;
    }

    i = i + 1;
  }

  ExcelApp.Close();
  Excel.Application.Quit();
  X.WARNING("Finalizat!");
}

function ON_SALDOC_VARCHAR01() {
  if (SALDOC.FINDOC < 0) import_fisier();
  else X.WARNING("Documentul are linii, nu pot fi adaugate din Excel");
}

function docID() {
  if (SALDOC.FINDOC > 0)
    vID = SALDOC.FINDOC;
  else
    vID = X.NEWID;

  return vID;
}
