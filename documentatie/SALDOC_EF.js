/*
 * https://winscp.net/download/WinSCP-5.19.3-Portable.zip
 */

var zoomed = false,
objABC = {},
aDoua = false,
itsMeStackOverflow = false,
folderPath = 'C:\\S1Print\\FTP\\Online\\',
danteOutFolder = 'dante_out',
denumireDocProcess = '',
pdfFile = '',
findoc_exception = 0,
debugg_mode = {},
test_mode = {};

//teste------------------IN PRODUCTIE TOATE PE FALSE---------------------------------------------------------
//false = no test
test_mode.trimiteInv2DanteFromDocProc = false;
test_mode.getComDanteFromDocProc = false;
//false = mo debugging messaging
debugg_mode.trimiteInv2DanteFromDocProc = false;
debugg_mode.getComDanteFromDocProc = false;
//end teste---------------------------------------------------------------------------------------------------

function exportXML() {
    //testjs('test apel');
    //var a = ShowMessage('This is a warning message');
    var id = getID();
    X.CANCELEDITS;
    var tempfolder = "c:\\Temp";
    CheckFolder(tempfolder);

    DsP1 = X.GETSQLDATASET('SELECT convert(varchar(10), CCCXMLSendDate,103) CCCXMLSendDate, left(replace(trdr.name,\' \',\'\'),8) name from findoc join mtrdoc on findoc.findoc=mtrdoc.findoc join trdr on findoc.trdr=trdr.trdr where findoc.findoc=' + id, null);
    CCCXMLSendDate = DsP1.CCCXMLSendDate;
    tempfolder = DsP1.name;
    tempfolder = 'c:\\ReadXMLFiles\\Upload\\' + tempfolder;

    DsP1 = null;

    if ((CCCXMLSendDate != '') && (CCCXMLSendDate != null)) {
        X.EXCEPTION('Documentul a trimis ! ' + CCCXMLSendDate);
        return;
    }

    sql = 'exec dbo.G_XML_ExportDoc ' + id;
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

    if (ERRORMSG != '') {
        X.EXCEPTION(ERRORMSG);
        Ds = null;
        return;
    }

    var ds22,
    sql1;
    sql1 = 'select CCCXMLfile from mtrdoc where findoc=' + id;

    ds22 = X.GETSQLDATASET(sql1, null);
    xmlData = ds22.CCCXMLfile;
    ds22 = null;

    //xmlData = GetQueryResults('SoftOne', sql1, null);


    if ((xmlData == '') || (xmlData == null)) {
        X.EXCEPTION('Nu exista date de trimis');
        Ds = null;
        return;
    }

    CheckFolder(tempfolder);
    Ds = null;

    if (SALDOC.TRDR != 11322) //fara carrfour
    {
        CheckFolder(filePath);
    }
    var fso,
    f1;
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
    X.RUNSQL('update mtrdoc set CCCXMLSendDate=GETDATE(), CCCXMLfile=null where findoc=' + SALDOC.FINDOC, null);

}

function parseLocalNum(num) {

    var rez = num;
    var sir = 'Number(Replace(' + num + ', \',\' ' + ', \'.\' ))';
    //X.Warning(sir);
    rez = X.EVAL(sir);
    //X.WARNING(rez);
    rez = rez + 0.0000;
    //X.WARNING(rez);
    return rez;
}

// carrefour
function SaveStringToFTPFile(temp_filename, tempfolder, fileName) {
    var id = getID();
    var DsP1 = X.GETSQLDATASET('SELECT trdr.CCCFtpServer, trdr.CCCFtpUser, trdr.CCCFtpPwd, CCCFtpPath from findoc join trdr on findoc.trdr=trdr.trdr where findoc.findoc=' + id, null);
    var CCCFtpServer = DsP1.CCCFtpServer;
    var CCCFtpUser = DsP1.CCCFtpUser;
    var CCCFtpPwd = DsP1.CCCFtpPwd;
    var CCCFtpPath = DsP1.CCCFtpPath;
    DsP1 = null;

    var ftpText,
    ftpcmd,
    ftpFileCmd,
    WshShell;
    ftpText = 'open ' + CCCFtpServer + '\n';
    ftpText += 'user ' + CCCFtpUser + '\n';
    ftpText += CCCFtpPwd + '\n';
    ftpText += 'binary' + '\n';
    ftpText += 'put ' + temp_filename + ' ' + CCCFtpPath + fileName + '\n';
    ftpText += 'bye' + '\n';

    var ftpFileScript = tempfolder + '\\' + 'scriptFTP.scr';

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

    var ftpFileNameCmd = tempfolder + '\\' + "gmcSendToFTP.exe";
    CheckFileExists(ftpFileNameCmd);

    ftpFileCmd = tempfolder + '\\' + 'copytoFTP.cmd';
    ftpcmd = '@echo off ' + '\n';
    ftpcmd += 'c:' + '\n';
    ftpcmd += 'cd ' + tempfolder + '\n';
    ftpcmd += '@echo on ' + '\n';
    //ftpcmd+='gmcSendToFTP.exe '+fileName+'.test'+' noexit'+'\n';
    ftpcmd += 'gmcSendToFTP.exe ' + fileName + '\n';
    ftpcmd += 'cmd/k' + '\n';

    SaveStringToFile(ftpFileCmd, ftpcmd);

    //ftpFileCmd= ftpFileNameCmd +'\\'+fileName+'.test'+' noexit';
    WshShell = new ActiveXObject("WScript.Shell");
    WshShell.Run(ftpFileCmd, 1, true);

    WshShell = null;
}

function SaveStringToFile(temp_filename, text, trimis) {
    if (trimis)
        return;

    var fso,
    f1,
    f2;
    fso = new ActiveXObject("Scripting.FileSystemObject");
    f1 = fso.CreateTextFile(temp_filename, true);
    //f1 = fso.OpenTextFile(temp_filename, 2);
    f1.write(text);
    f1.Close();
    fso = null;
}

function getID() {
    vID = SALDOC.FINDOC;
    if (vID < 0)
        vID = X.NEWID;
    return vID;
}

function CheckFileExists(FileName) {
    var rez,
    fso,
    msg;
    fso = new ActiveXObject("Scripting.FileSystemObject");

    if (fso.FileExists(FileName)) {
        rez = 1;
    } else {
        msg = ' nu exista fisierul! ' + FileName;
        X.EXCEPTION(msg);
    }
    fso = null;
}

function CheckFolder(FolderName) {
    var rez,
    fso,
    msg;
    fso = new ActiveXObject("Scripting.FileSystemObject");

    if (fso.FolderExists(FolderName)) {
        rez = 1;
    } else {
        msg = ' nu exista folderul! ' + FolderName;
        X.EXCEPTION(msg);
    }
    fso = null;

}

function ON_AFTERPOST() {
    var vID = SALDOC.FINDOC;
    if (vID < 0)
        vID = X.NEWID;
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
    var createTblQ = 'create table CCCFINDOCPOST (CCCFINDOCPOST int not null identity(1,1) primary key, findoc int not null, trndate date not null, fincode varchar(max) not null)',
    theQ = "if OBJECT_ID('dbo.CCCFINDOCPOST') is null " + createTblQ;

    try {
        X.RUNSQL(theQ, null);
    } catch (err) {
        X.WARNING('Eroare la creare tabel CCCFINDOCPOST:\n' + err.message);
    }

    var markDoc = "insert into CCCFINDOCPOST (findoc, trndate, fincode) values (" + vID + ", '" + X.FORMATDATE('yyyymmdd', SALDOC.TRNDATE) + "', '" + SALDOC.FINCODE + "')",
    theQ = X.SQL('select isnull(findoc, 0) from CCCFINDOCPOST where findoc=' + vID, null) ? '' : markDoc;

    try {
        if (theQ)
            X.RUNSQL(theQ, null);
    } catch (err) {
        X.WARNING('Eroare la marcare document pentru afterjobs:\n' + err.message);
    }

    sSQL = X.GETSQLDATASET('select unitpack AS UP from CCCS1DXTRDRMTRL where mtrl=' + ITELINES.MTRL + ' and trdr=' + SALDOC.TRDR, null);
    X.RUNSQL('UPDATE MTRLINES SET CCCUNITPACK=' + String.fromCharCode(39) + sSQL.UP + String.fromCharCode(39) + 'WHERE MTRL=' + ITELINES.MTRL + 'AND FINDOC=' + vID, null);

    saveABC();
    aDoua = true;
}

function ON_POST() {
    if (SALDOC.SERIES == 7022) {
        if (SALDOC.NUM04) {
            //verifica daca exista numarul de comanda online in tabelul findoc pt seria 7022, comanda online nu poate fi duplicata
            var qd = X.SQL('select count(*) from findoc where series=7022 and num04=' + SALDOC.NUM04, null);
            if (qd > 0) {
                X.EXCEPTION('Comanda online ' + SALDOC.NUM04 + ' a mai introdusa anterior!');
            }
        }
    }
    //am findocs = comanda aferenta in linii; update fullytransf comanda =1
    //protectie dublare: daca am o factura care provine din comanda findocs atunci tell WMS beautiful lies; cum?
    //daca pun un X.EXCEPTION primeste succes:false;
    //doar la introducerea unei facturi, nu si la resalvare
    if (SALDOC.FINDOC < 0 && (SALDOC.SERIES == 7111 || SALDOC.SERIES == 7031 || SALDOC.SERIES == 7033)) {
        ITELINES.FIRST;
        if (ITELINES.FINDOCS) {
            var factExistenta = 'select top 1 isnull(a.findoc, 0) findoc from mtrlines a inner join findoc b on (a.findoc=b.findoc and a.sosource=b.sosource) ' +
                'where b.sosource = 1351 and (b.SERIES = 7111  or b.SERIES = 7031 or b.SERIES = 7033) and a.findocs=' + ITELINES.FINDOCS;
            var fin = X.SQL(factExistenta, null);
            if (fin > 0) {
                X.EXCEPTION('Factura deja exista in ERP cu id:' + fin + '.\nDublare refuzata.');
            }
        } else {
            //X.EXCEPTION('Nu exista FINDOCS in linii.');
        }
    }

    var findocs = 0;
    ITELINES.FIRST;
    while (!ITELINES.EOF()) {
        if (findocs == 0) {
            if ((ITELINES.FINDOCS != null) && (ITELINES.FINDOCS != 0) && (ITELINES.FINDOCS != '')) {
                findocs = ITELINES.FINDOCS;
            }
        }
        ITELINES.NEXT
    }
    //X.WARNING(findocs);
    ITELINES.FIRST;
    while (!ITELINES.EOF()) {
        if ((ITELINES.FINDOCS == null) || (ITELINES.FINDOCS == 0) || (ITELINES.FINDOCS == '')) {
            if (findocs > 0) {
                ITELINES.FINDOCS = findocs;
            }
        }

        if (((SALDOC.SERIES == 9221) || (SALDOC.SERIES == 7531)) && ((ITELINES.FINDOCL == null) || (ITELINES.FINDOCL == ''))) {
            X.EXCEPTION('Completati Document storno pentru articolul ' + ITELINES.MTRL_ITEM_NAME);
        }

        if (((SALDOC.SERIES == 9221) || (SALDOC.SERIES == 7531)) && ((ITELINES.FINDOCL != null) && (ITELINES.FINDOCL != ''))) {
            var Mtr = 'select sum(qty1) QTY1 from mtrtrn where findoc=' + ITELINES.FINDOCL + ' and mtrl=' + ITELINES.MTRL;
            var Qty1 = X.SQL(Mtr, null);

            if (ITELINES.QTY1 > Qty1) {
                X.EXCEPTION('Nu puteti returna mai mult decat cantitatea din documentul storno, pentru articolul' + ITELINES.MTRL_ITEM_NAME);
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
    if ((SALDOC.SERIES == 7132) || (SALDOC.SERIES == 7133)) {
        X.EXCEPTION('Pe aceasta fereastra nu se pot folosi seriile de avize custodie tur si retur! Va rugam folositi meniul Custodie marfuri clienti!');
    }

    //Verificare comanda deja convertita
    if ((SALDOC.FPRMS == 703) || (SALDOC.FPRMS == 721) || (SALDOC.FPRMS == 753)) {
        sSql = 'SELECT FULLYTRANSF FROM FINDOC WHERE FINDOC=' + ITELINES.FINDOCS;
        ds = X.GETSQLDATASET(sSql, null);

        if (ds.FULLYTRANSF == 2) {
            X.WARNING('Comanda deja a fost convertita!');
        }
    }
    //alerta de completat picker-ul
    if (SALDOC.FPRMS == 714) {
        if ((SALDOC.CCCPICKER == '') || (SALDOC.CCCPICKER == null) || (SALDOC.CCCPICKER == 0)) {
            X.EXCEPTION('Completati campul Picker depozit!');
        }
    }
    //alerta de completat metoda de livrare pe serie de document picking online
    if (SALDOC.SERIES == 7016) {
        if ((SALDOC.SHIPMENT == '') || (SALDOC.SHIPMENT == null) || (SALDOC.SHIPMENT == 0)) {
            X.EXCEPTION('Completati campul "Metoda de livrare"!');
        }
    }

    //Alerta pentru completarea campului Cda Arobs/Client in cazul seriei 7022 CONL
    {
        if ((SALDOC.SERIES == 7022) && ((SALDOC.NUM04 == '') || (SALDOC.NUM04 == null) || (SALDOC.NUM04 == 0)))
            X.EXCEPTION('Completati campul Cda Arobs/Client');
        else {}
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
        ObjITEDOC = X.CreateObj('ITEDOC');
        ObjITEDOC.DBInsert;

        TblITEDOC = ObjITEDOC.FindTable('ITEDOC');
        TblITEDOC.Edit;
        TblITEDOC.SERIES = nTransferSeries; // Series, the series of the transfer document should already exist in the inventory documents
        TblITEDOC.TRNDATE = SALDOC.TRNDATE;

        TblMTRDOC = ObjITEDOC.FindTable('MTRDOC');
        TblMTRDOC.Edit;
        TblMTRDOC.WHOUSE = nFromWH; // From which warehouse
        TblMTRDOC.BRANCHSEC = nToBranch; // To which branch belongs the second warehouse
        TblMTRDOC.WHOUSESEC = nToWH; // To which warehouse

        TblITELINES = ObjITEDOC.FindTable('ITELINES');

        ITELINES.FIRST;
        while (!ITELINES.Eof) {
            stocVar = X.EVAL("FRemQty1PerWHouse(ITELINES.MTRL,MTRDOC.WHOUSE,X.SYS.LOGINDATE)");
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

    }
    finally {
        ObjITEDOC.FREE;
        ObjITEDOC = null;
    }

    // If the new findoc was created succesfully
    if (NEWFINDOCID > 0) {
        sSQL = 'select fincode from findoc where findoc = ' + NEWFINDOCID;
        ds = X.GETSQLDATASET(sSQL, null);
        X.WARNING('Bon de transfer creat: ' + ds.fincode);
        SALDOC.CCCBT = NEWFINDOCID;

    } else {
        X.WARNING('Problema creare bon de transfer');
    }
    if (SALDOC.FINDOC < 0) {
        X.EXEC('button:Save');
    }
}

function ON_ITELINES_POST() {
    if (SALDOC.SERIES != 7033) {
        if ((ITELINES.CCCPRETCATALOG != 0) && (ITELINES.CCCPRETCATALOG != '') && (ITELINES.CCCPRETCATALOG != null) && (ITELINES.CCCREDUCERE != '') && (ITELINES.CCCREDUCERE != 0) && (ITELINES.CCCREDUCERE != null)) {
            ITELINES.PRICE = roundNumber(ITELINES.CCCPRETCATALOG * (1 - ITELINES.CCCREDUCERE / 100), 2);

        }
    }
}

function itereaza() {

    if ((SALDOC.ISCANCEL != 0) || (SALDOC.APPRV != 1) || (SALDOC.SOCURRENCY != 123))
        return;

    vID = -1;
    USRID = X.SYS.USER;
    COMP = X.SYS.COMPANY;
    BRA = X.SYS.BRANCH;
    vID = SALDOC.FINDOC;
    if (vID < 0)
        vID = X.NEWID;
    tip = X.CONNECTIONSTATUS;

    DateforSQLQuery = X.EVAL('SQLDATE(SALDOC.TRNDATE)');
    randnou = String.fromCharCode(13) + String.fromCharCode(10);

    parametru = 'VerificareVanzaresubCost';
    TRDR = SALDOC.TRDR;
    SOSOURCE = SALDOC.SOSOURCE;
    FPRMS = SALDOC.FPRMS;
    Series = SALDOC.Series;

    SQL = 'SELECT dbo.fn_GCheckType(' + vID + ', ' + USRID + ', ' + COMP + ', ' + BRA + ', ' + tip + ', ' + TRDR + ', ' + SOSOURCE + ', ' + FPRMS + ', ' + Series + ', ' + DateforSQLQuery + ', \'' + parametru + '\' ) rez ';

    DsRez = X.GETSQLDATASET(SQL, null);
    rez = DsRez.rez;

    if ((rez == 'return') || (rez == '0') || (rez == '') || (rez == 'exit'))
        return;

    if ((rez != 'verifica') && (rez != '1')) {
        X.EXCEPTION(rez);
        return;
    }

    mesaj = '';
    ITELINES.FIRST;
    while (!ITELINES.EOF) { //code...

        DsP = X.GETSQLDATASET('SELECT dbo.fnG_GetCostPrice(MTRL, ' + SALDOC.FISCPRD + ', ' + SALDOC.PERIOD + ' ) CMP, isnull(MINPRCMK,0) MINPRCMK, left(MTRL.ACNMSK1,3) ACNMSK1  FROM MTRL WHERE MTRL=' + ITELINES.MTRL, null);
        CMP = DsP.CMP;
        MINPRCMK = DsP.MINPRCMK;
        cant = 0;

        //ITELINES.EDIT;
        ITELINES.CCCUNITCOST = CMP;
        ACNMSK1 = DsP.ACNMSK1;

        if (SALDOC.FPRMS == 721) {
            if ((ACNMSK1 == '704') || (ACNMSK1 == '709')) {
                ITELINES.NUM03 = ITELINES.NETLINEVAL + ITELINES.VATAMNT;
            } else {
                ITELINES.NUM03 = 0;
            }
        }

        if ((ITELINES.ISNULL('QTY1') != 1) && (ITELINES.ISNULL('CCCUNITCOST') != 1)) {
            if (ITELINES.MTRTYPE != 3)
                ITELINES.SALESCVAL = roundNumber(ITELINES.CCCUNITCOST * ITELINES.QTY1, 2);
            else
                ITELINES.SALESCVAL = 0;
            cant = ITELINES.QTY1;
        }
        //ITELINES.POST;

        if ((ITELINES.ISNULL('SALESCVAL') != 1) && (ITELINES.ISNULL('LINEVAL') != 1)) {

            valNetaMinima = roundNumber(ITELINES.SALESCVAL * (1.0 + MINPRCMK / 100), 2);
            valLinie = roundNumber(ITELINES.LINEVAL, 2);

            if ((cant > 0) && (valLinie < valNetaMinima)) // doar pentru cantitati pozitive
            {
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
    if (((SALDOC.FPRMS == 721) || (SALDOC.FPRMS == 7101) || (SALDOC.FPRMS == 720) || (SALDOC.FPRMS == 7105) || (SALDOC.FPRMS == 7120))) {

        DsP1 = X.GETSQLDATASET('SELECT ISNULL(BOOL01,0) BOOL01 FROM FINDOC WHERE FINDOC=' + SALDOC.FINDOC, null);
        BOOL01 = DsP1.BOOL01;
        if (BOOL01 == 1) {
            X.EXCEPTION('Documentul s-a trimis la casa fiscala!');
            return;
        }

        var id = getID();
        CheckFolder('c:\\temp');
        CheckFolder('c:\\FPrintWin');
        CheckFolder("C:\\Program Files\\Datecs Applications\\FPrintWIN");

        sql = 'exec dbo.G_CashDatecs ' + id;
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

        X.RUNSQL('update findoc set bool01=1 where findoc=' + id, null);
    }
}

function printare_bon_fprintWin1() {

    if (((SALDOC.FPRMS == 721) || (SALDOC.FPRMS == 7101) || (SALDOC.FPRMS == 7105) || (SALDOC.FPRMS == 7120))) {

        DsP1 = X.GETSQLDATASET('SELECT ISNULL(BOOL01,0) BOOL01 FROM FINDOC WHERE FINDOC=' + SALDOC.FINDOC, null);
        BOOL01 = DsP1.BOOL01;
        if (BOOL01 == 1) {
            X.EXCEPTION('Documentul s-a trimis la casa fiscala!');
            return;
        }
        CheckFolder('c:\\temp');
        CheckFolder("C:\\Program Files\\Datecs Applications\\FPrintWIN");

        var fso,
        f1,
        ts,
        s;
        var ForReading = 1;
        fso = new ActiveXObject("Scripting.FileSystemObject");

        f1 = fso.CreateTextFile("c:\\temp\\testfile.txt", true);

        ITELINES.FIRST;
        while (!ITELINES.EOF) {
            ceProdus = ITELINES.MTRL;
            Ds = X.GETSQLDATASET('select name,1 as mtrmark from mtrl where mtrl=' + ceProdus, null);
            ceNume = Ds.name.substring(0, 22);
            //ceNume=ceNume.replace(/,/,' ');
            //ceNume=ceNume.replace(/;/,' ');
            //ceNume=ceNume.replace(/./,' ');


            ceGroup = 1;

            ce_pret = (ITELINES.LNETLINEVAL + ITELINES.LVATAMNT) / ITELINES.QTY1; // trimit la casa pret calculat;

            ce_cant = ITELINES.QTY1;

            ceCant = X.EVAL('LTrim(FString(' + ce_cant + ',12,3))');
            ceCant = ceCant.replace(/,/, '');

            cePret = X.EVAL('LTrim(FString(' + ce_pret + ',12,2))');
            cePret = cePret.replace(/,/, '');

            f1.WriteLine("S,1,______,_,__;" + ceNume + ";" + cePret + ";" + ceCant + ";1;" + ceGroup + ";1;0;0;");

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
        f1.Writeline("T,1,______,_,__;0;;;;;") // trimit ca sa inchida cu cash totalul


        f1.Close();
        f2 = fso.GetFile("c:\\temp\\testfile.txt");
        f2.Copy("C:\\Program Files\\Datecs Applications\\FPrintWIN\\cashfile.inp");
        //f2.Copy ("c:\\Temp\\backup.txt");
        //f2.Delete();
        WshShell = new ActiveXObject("WScript.Shell");
        //WshShell.Run ("C:\\FPrintWin\\Cash.bat",1,true);

        X.RUNSQL('update findoc set bool01=1 where findoc=' + SALDOC.FINDOC, null);
    }
}

function ON_ITELINES_MTRL() {
    if (ITELINES.MTRL != 0) {
        AddPrice();
    }
}

function AddPrice() {
    if ((SALDOC.SERIES != 7130) && (SALDOC.SERIES != 7131) && (SALDOC.SERIES != 7210)) {
        DateforSQLQuery = X.EVAL('SQLDATE(SALDOC.TRNDATE)');
        DsP = X.GETSQLDATASET('SELECT PRICEW PV, PRICER PAM, MAXPRCDISC Red, dbo.fnG_GetCostPrice(MTRL, ' + SALDOC.FISCPRD + ', ' + SALDOC.PERIOD + ' ) CMP, DBO.fn_GCheckAMA(MTRL.COMPANY, 1351,' + SALDOC.FPRMS + ') IsRetail,  dbo.fnG_SalePrice(MTRL.MTRL, ' + SALDOC.TRDR + ', ' + SALDOC.FPRMS + ', ' + DateforSQLQuery + ') PretClient FROM MTRL WHERE MTRL=' + ITELINES.MTRL, null);
        CMP = DsP.CMP;
        PretCat = DsP.PV;
        PretPAM = DsP.PAM;
        Red = DsP.Red;
        Pnet = DsP.Pnet
            IsRetail = DsP.IsRetail;
        PretClient = DsP.PretClient;

        if (IsRetail != 1) {
            CCCPretcatalog = PretCat;
            //ITELINES.CCCReducere=Red;
        } else {
            CCCPretcatalog = PretPAM;
        }

        if ((CCCPretcatalog > 0) && (PretClient > 0) && (PretClient > CCCPretcatalog)) {
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
    if ((ITELINES.CCCPRETCATALOG != 0) && (ITELINES.CCCPRETCATALOG != '') && (ITELINES.CCCPRETCATALOG != null) && (ITELINES.CCCREDUCERE != '') && (ITELINES.CCCREDUCERE != 0) && (ITELINES.CCCREDUCERE != null)) {
        ITELINES.PRICE = roundNumber(ITELINES.CCCPRETCATALOG * (1 - ITELINES.CCCREDUCERE / 100), 2);
    }
}

function ON_ITELINES_QTY1() {

    if ((SALDOC.TRDR == 12349) && (SALDOC.SERIES == 7111) || (SALDOC.SERIES == 7121)) {

        sBax = 'select isnull(UnitPack,0) buc from CCCS1DXTRDRMTRL where trdr=' + SALDOC.TRDR + ' and mtrl=' + ITELINES.MTRL;
        dsBax = X.GETSQLDATASET(sBax, null);

        if ((dsBax.buc == 0) || (dsBax.buc == '') || (dsBax.buc == null)) {
            ITELINES.CCCCUTII = 0.00;
        } else {
            ITELINES.CCCCUTII = ITELINES.QTY1 / dsBax.buc;
        }
    }

    //if ((ITELINES.ISNULL('QTY1') == 1) || (ITELINES.ISNULL('CCCUNITCOST') == 1))
    if ((ITELINES.ISNULL('QTY1') == 1))
        return;
    //	if (ITELINES.MTRTYPE!=3)
    //		ITELINES.SALESCVAL=roundNumber(ITELINES.CCCUNITCOST * ITELINES.QTY1,2);
    //	else
    //		ITELINES.SALESCVAL=0;

    if (SALDOC.SERIES != 7033) {
        if ((ITELINES.CCCPRETCATALOG != 0) && (ITELINES.CCCPRETCATALOG != '') && (ITELINES.CCCPRETCATALOG != null) && (ITELINES.CCCREDUCERE != '') && (ITELINES.CCCREDUCERE != 0) && (ITELINES.CCCREDUCERE != null)) {
            ITELINES.PRICE = roundNumber(ITELINES.CCCPRETCATALOG * (1 - ITELINES.CCCREDUCERE / 100), 2);
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
    if ((SALDOC.SERIES != 7130) && (SALDOC.SERIES != 7131)) {
        // daca valoare  linie <> 0
        if (ITELINES.LINEVAL != 0) {
            PretNet = ((ITELINES.price * (100 - ITELINES.DISC1PRC)) / 100);
            X.warning(PretNet);
            // iau din baza Pret Achizitie
            DsA = X.GETSQLDATASET('SELECT top 1 isnull(REPLPRICE,0) as Ach FROM MTRL WHERE MTRL=' + ITELINES.MTRL + ' ', null);
            PretAch = DsA.Ach;
            //X.warning(PretAch);
            //DsA = X.GETSQLDATASET('SELECT Round(PRICEW/(1+(MAXPRCDISC/100)),4) as PM FROM MTRL WHERE MTRL='+ITELINES.MTRL,null);
            //PretMin = DsA.PM;
            //PRICEW/(1+MAXPRCDISC/100)
            //determin pret minim de vanzare (adaos 12%)
            PretMin = roundNumber(PretAch * 1.12, 2);
            //X.warning(PretMin);

            if (PretNet <= PretMin) {
                X.Warning('Pret net (' + PretNet + ') sub pret minim de achizitie (' + PretMin + ')!');
            }

        }
    }
}

function roundNumber(num, dec) {
    var result = Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
    return result;
}

function EXECCOMMAND(cmd) {
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
    //DEDEMAN
    if (cmd == 20190529) {
        if (SALDOC.TRDR == 11654) {
            exportXMLDedeman();
        }
    }

    //zoom
    if (cmd == 202006111) {
        X.SETPROPERTY('PANEL', 'Panel12', 'VISIBLE', zoomed);
        X.SETPROPERTY('PANEL', 'Panel13', 'VISIBLE', zoomed);
        X.SETPROPERTY('PANEL', 'Panel14', 'VISIBLE', zoomed);
        X.SETPROPERTY('PANEL', 'Panel15', 'VISIBLE', zoomed);

        zoomed = !zoomed;
    }

    //ABC popup
    if (cmd == 202006121) {
        X.OPENSUBFORM('SFABCL');
    }

    if (cmd == 20210704) {

        if (SALDOC.NUM04.toString().length == 9) {
            printAndFtp('SALDOC', 107, folderPath);
        }
    }

    if (cmd == 20210915) {
        //createSomeInvoice(ITELINES);
        var cols = X.SQL("select stuff(( select distinct '], [' + a.name from " +
                'sys.columns a ' +
                'inner join sys.tables b on (a.object_id=b.object_id) ' +
                "where b.name='mtrlines' and a.name not in ('mtrlot') " +
                "for xml path('')), 1, 2, '') + ']'", null),
        dsSrc = X.GETSQLDATASET("select " + cols + " from mtrlines where sodtype=51 and findoc=" + SALDOC.FINDOC, null),
        dsNoDups = X.GETSQLDATASET("select top 1 " + cols + " from mtrlines where sodtype=51 and findoc=" + SALDOC.FINDOC, null),
        j = 0;

        dsNoDups.FIRST;
        dsNoDups.DELETE;

        dsSrc.FIRST;
        while (!dsSrc.EOF) {
            if ((j == 0 || j == 1) && debugg_mode.trimiteInv2DanteFromDocProc)
                debugger;
            j++;
            if (dsNoDups.LOCATE('MTRL', dsSrc.MTRL)) {
                //gasit, add
                if (debugg_mode.trimiteInv2DanteFromDocProc)
                    debugger;
                dsNoDups.QTY1 += dsSrc.QTY1;
                dsNoDups.LNETLINEVAL += dsSrc.LNETLINEVAL;
                dsNoDups.VATAMNT += dsSrc.VATAMNT;
            } else {
                dsNoDups.APPEND;
                for (i = 0; i <= dsSrc.FIELDCOUNT - 1; i++) {
                    if ((i == 0 || i == 1) && (j == 0 || j == 1) && debugg_mode.trimiteInv2DanteFromDocProc)
                        debugger;
                    if (dsSrc.FIELDS(i))
                        dsNoDups.FIELDS(i) = dsSrc.FIELDS(i);
                }
                dsNoDups.POST;
            }
            dsSrc.NEXT;
        }

        createSomeInvoice(dsNoDups);
    }

    if (cmd == 20211123) {
        if (debugg_mode.getComDanteFromDocProc)
            debugger;
        if (!test_mode.getComDanteFromDocProc)
            sfptFromDocProcess(folderPath);
        //processXML("c:\\S1Print\\FTP\\Online\\dante_out\\ORDERS_DXSziDUYPNMI0mwGF6euB02A_VAT_RO17275880.xml");
        parseFolderFileList(folderPath + danteOutFolder);
    }
}

function parseFolderFileList(folderspec) {
    var fso,
    f,
    fc;
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
    if (xmlFile)
        xmlDoc.load(xmlFile);
    else if (xmlStr)
        xmlDoc.loadXML(xmlStr);

    createTblForXmlErr();

    if (xmlDoc.parseError.errorCode != 0) {
        var myErr = xmlDoc.parseError;
        if (xmlFile)
            postXmlErr(myErr.reason, xmlFile);
        else if (xmlStr)
            postXmlErr(myErr, xmlStr);
        return;
    } else {
        myErr = xmlDoc.parseError;
        if (myErr.errorCode != 0) {
            if (xmlFile)
                postXmlErr(myErr.reason, xmlFile);
            else if (xmlStr)
                postXmlErr(myErr, xmlStr);
            return;
        }
    }

    xmlDoc.setProperty("SelectionLanguage", "XPath");

    var orderID = xmlDoc.selectNodes("Order/ID").item(0).text,
    orderDate = xmlDoc.selectNodes("Order/IssueDate").item(0).text,
    CustomerEndpoint = xmlDoc.selectNodes("Order/BuyerCustomerParty/EndpointID").item(0).text;

    createTblForXmlBak();

    //daca nu este dante endpoint
    if (CustomerEndpoint != '5949129999992') {
        return;
    }

    var deja = X.SQL('select top 1 findoc from findoc where series=7012 and trdr = 11639 and num04=' + orderID, null);
    //daca a fost introdus deja
    if (!test_mode.getComDanteFromDocProc && deja) {
        markXmlAsOrderCreatedAndDelFile(orderID, true, xmlFile);
        return;
    }

    //backup xml to db before doing anything else
    bakXmlToDB(xmlDoc.xml, orderID, orderDate);

    var endpoint = xmlDoc.selectNodes("Order/DeliveryParty/EndpointID").item(0).text,
    delivdate = xmlDoc.selectNodes("Order/RequestedDeliveryPeriod/EndDate").item(0).text,
    coduriArticole = xmlDoc.selectNodes("Order/OrderLine/Item/BuyersItemIdentification"),
    canitati = xmlDoc.selectNodes("Order/OrderLine/Quantity/Amount"),
    preturi = xmlDoc.selectNodes("Order/OrderLine/Price/Amount"),
    denumiri = xmlDoc.selectNodes("Order/OrderLine/Item/Description"),
    denumiriPet = xmlDoc.selectNodes("Order/OrderLine/Item/SellersItemIdentification"),
    sume = xmlDoc.selectNodes("Order/OrderLine/LineExtensionAmount/Amount");

    var odoc = X.CREATEOBJFORM('SALDOC')
        try {

            var f = odoc.findTable('FINDOC'),
            l = odoc.findTable('ITELINES'),
            m = odoc.findTable('MTRDOC');
            odoc.dbinsert;
            f.edit;
            f.series = 7012;
            f.trdr = 11639;
            if (endpoint == '5940477490162')
                f.trdbranch = 3329;
            else if (endpoint == '5940477490018')
                f.trdbranch = 1890;
            if (orderID)
                f.NUM04 = orderID;
            if (orderDate)
                f.DATE01 = orderDate;
            if (delivdate)
                m.DELIVDATE = delivdate;
            for (var i = 0, errCnt = 0; i < coduriArticole.length; i++) {
                var idArticol = X.SQL("select mtrl from CCCS1DXTRDRMTRL where trdr=11639 and code='" + coduriArticole.item(i).text + "'", null);
                if (idArticol) {
                    l.append;
                    l.MTRL = idArticol;
                    l.QTY1 = parseFloat(canitati.item(i).text);
                    l.PRICE = parseFloat(preturi.item(i).text);
                    l.post;
                } else {
                    if (errCnt == 0) {
                        var new_masterid = getFirstAvailMasterid();
                        X.RUNSQL("insert into [dbo].[A_IKA_ORDER] (trdr, trdbranch, cusname, whouse, iscancel, apprv, branch, series, imported, imptype, comanda, cccs1dxid, orderdate, " +
                            "filename, masterid, delivdate) values (11639, 3329, 'Dante', 1001, 0, 0, 1000, 7012, 0, 'Doc Process', " + orderID + ", " + orderID + ", '" + orderDate + "', '" +
                            xmlFile + "', " + new_masterid + ", '" + delivdate + "')", null);
                    }

                    X.RUNSQL("insert into [dbo].[A_Ika_OrderDetail] (imptype, masterid, filename,qty1, price, LINEVAL, comments1, ean, comments) values ('Doc Process', " +
                        new_masterid + ",'" + xmlFile + "'," + parseFloat(canitati.item(i).text) + ", " + parseFloat(preturi.item(i).text) + "," +
                        parseFloat(sume.item(i).text) + ",'" + coduriArticole.item(i).text + "','" + coduriArticole.item(i).text + "','" + denumiri.item(i).text + "')", null);
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
        }
        finally {
            odoc.free;
            odoc = null;
        }

    function getFirstAvailMasterid() {
        return X.SQL('SELECT top 1 n FROM (SELECT ROW_NUMBER() OVER (ORDER BY masterid) AS n FROM A_IKA_ORDER) n LEFT JOIN A_IKA_ORDER cda ON (n.n = cda.masterid) WHERE cda.masterid IS NULL', null);
    }

    function markXmlAsOrderCreatedAndDelFile(orderId, created, xmlFile) {
        var i = created ? 1 : 0;
        X.RUNSQL('update CCCDOCPROCDANTEXML set orderCreated = ' + i + ' where orderID=' + orderId, null);

        if (created) {
            //delete file from local
            if (!test_mode.getComDanteFromDocProc)
                delFile(xmlFile);
        }
    }

    function createTblForXmlBak() {
        var createTblQ = 'create table CCCDOCPROCDANTEXML (CCCDOCPROCDANTEXML int not null identity(1,1) primary key, dataExtractie datetime not null default getDate(), xml varchar(max) not null, ' +
            'orderID int not null, orderDate date not null, orderCreated smallint default 0)',
        theQ = "if OBJECT_ID('dbo.CCCDOCPROCDANTEXML') is null " + createTblQ;

        X.RUNSQL(theQ, null);
    }

    function createTblForXmlErr() {
        var createTblQ = 'create table CCCDOCPROCDANTEXMLERR (CCCDOCPROCDANTEXMLERR int not null identity(1,1) primary key, dataExtractie datetime not null default getDate(), xmlFile varchar(max) not null, ' +
            'err varchar(max) not null)',
        theQ = "if OBJECT_ID('dbo.CCCDOCPROCDANTEXMLERR') is null " + createTblQ;

        X.RUNSQL(theQ, null);
    }

    function bakXmlToDB(xml, idCom, dataCom) {
        var doStuff = "insert into CCCDOCPROCDANTEXML (xml, orderID, orderDate) values ('" + xml + "', " + idCom + ",'" + dataCom + "')";
        //do not duplicate pretty please
        if (!X.SQL('select orderID from CCCDOCPROCDANTEXML where orderID = ' + idCom, null))
            X.RUNSQL(doStuff, null);
    }

    function postXmlErr(err, xmlFile) {
        var doStuff = "insert into CCCDOCPROCDANTEXMLERR (xmlFile, err) values ('" + xmlFile + "', '" + err + "')";
        X.RUNSQL(doStuff, null);
    }

}

//printAndFtp('SALDOC', 107, folderPath)
function printAndFtp(strModul, printTemplate, fldr) {
    asiguraCalea(fldr);
    if (printInvoice(strModul, printTemplate)) {
        var url = ftpPdf(pdfFile);
        if (url) {
            eMag_publishURL(url);
        } else {
            X.WARNING('Factura nu a putut fi transferata spre FTP.');
        }
    } else {
        X.WARNING('Factura nu a putut fi tiparita in PDF.');
    }
}

function delFile(file) {
    var fso = new ActiveXObject("Scripting.FileSystemObject"),
    f2 = fso.GetFile(file);
    //f2.Copy ("c:\\Somth\\Bak");
    f2.Delete();
}

function asiguraCalea(fldr) {
    var parts = fldr.split('\\'),
    c = parts[0],
    fso = new ActiveXObject("Scripting.FileSystemObject");
    for (var i = 1; i < parts.length - 1; i++) {
        c += '\\' + parts[i];
        if (!fso.FolderExists(c))
            fso.CreateFolder(c);
    }
}

function printInvoice(strModul, printTemplate) {
    if (SALDOC.FINDOC) {
        try {
            asiguraCalea(folderPath);
            sal = X.CreateObj(strModul);
            sal.DBLocate(SALDOC.FINDOC);
            pdfFile = folderPath + SALDOC.FINCODE + '.pdf';
            sal.PRINTFORM(printTemplate, 'PDF file', pdfFile);
            return pdfFile;
        } catch (e) {
            X.WARNING(e.message);
            return null;
        }
    } else {
        return false;
    }
}

function ftpPdf(fisier) {
    try {
        var oShell = new ActiveXObject("Shell.Application"),
        host = 'ftp.petfactory.ro',
        usr = 'petfactortypdf@petfactory.ro',
        pwd = '1#kBsWpGZI51',
        wd = '',
        sFile = '',
        winscpComm = '"open ftp://' + usr + ':' + pwd + '@' + host + '" ' +
            '"put -delete -resume ' + fisier + '" ' +
            '"exit"',
        vArguments = '/log="' + folderPath + 'WinSCP.log" /nointeractiveinput /ini=nul /command ' + winscpComm,
        vDirectory = "",
        vOperation = "open",
        vShow = 0,
        WshShell = new ActiveXObject("WScript.Shell");
        wd = WshShell.CurrentDirectory;
        sFile = wd + '\\WinSCP.com';
        oShell.ShellExecute(sFile, vArguments, vDirectory, vOperation, vShow);
        return 'https://ftp.petfactory.ro/petfactortypdf/' + SALDOC.FINCODE + '.pdf';
    } catch (e) {
        X.WARNING(e.message);
        return false;
    }
}

function eMag_publishURL(linkToSend) {
    try {

        var xmlhttp = new ActiveXObject("MSXML2.XMLHTTP.6.0");
        xmlhttp.open("POST", 'https://marketplace-api.emag.ro/api-3/order/attachments/save', true);
        xmlhttp.setRequestHeader("Authorization", "Basic b3ZpZGl1LnR1dHVuYXJ1QHBldGZhY3Rvcnkucm86ZnJlZWRvbTMxMg==");
        xmlhttp.setRequestHeader("Content-Type", "application/json");
        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState != 4)
                return;
            if (xmlhttp.status != 200 && xmlhttp.status != 304) {
                X.WARNING('HTTP error ' + xmlhttp.status);
                markItAsSent(0);
            }
            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                interpretResponse(xmlhttp);
            }
        }

        var dataToSend = composeJSON(linkToSend);

        xmlhttp.send(dataToSend);

    } catch (err) {
        X.WARNING(err.message);
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

    eval('var o = ' + xmlhttp.responseText);
    if (o.isError) {
        var messages = o.messages,
        results = o.results,
        strM = '';
        for (var i = 0; i < messages.length; i++) {
            strM += messages[i] + '\n';
        }
        if (results.length)
            strM += 'order_id:' + results[0][0].order_id + '\n' + 'url:' + results[0][0].url;
        X.WARNING('Eroare la transmitere link factura.\n' + strM);
        markItAsSent(0);
    } else {
        markItAsSent(1);
        X.WARNING('Link factura transmis.');
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
    };

    return JSON.stringify(r);
}

function markItAsSent(sent) {
    if (SALDOC.FINDOC)
        X.RUNSQL('update findoc set CCCTRIMIS=' + sent + ' where findoc=' + SALDOC.FINDOC, null);
}

function exportXML1() {
    if ((SALDOC.FPRMS == 712) && (SALDOC.EXPN == 0)) {
        aCommand = 'XCMD:ClientImport,ScriptName: AR_ORIGINAL_INVOICE,myFindoc:' + SALDOC.FINDOC;
        X.EXEC(aCommand);
    }

    if ((SALDOC.FPRMS == 712) && (SALDOC.EXPN > 0)) {
        aCommand = 'XCMD:ClientImport,ScriptName: AR_ORIGINAL_INVOICE_WGT,myFindoc:' + SALDOC.FINDOC;
        X.EXEC(aCommand);
    }

    if ((SALDOC.FPRMS == 753) || (SALDOC.FPRMS == 953)) {
        aCommand = 'XCMD:ClientImport,ScriptName: AR_STORNO_INVOICE,myFindoc:' + SALDOC.FINDOC;
        X.EXEC(aCommand);
    }

    if (SALDOC.FPRMS == 703) {
        aCommand = 'XCMD:ClientImport,ScriptName: AR_CORRECTION_INVOICE,myFindoc:' + SALDOC.FINDOC;
        X.EXEC(aCommand);
    }
}

//nu las sa selecteze seriile de avize custodie clienti pe acest view
function ON_SALDOC_SERIES() {
    if ((SALDOC.SERIES == 7132) || (SALDOC.SERIES == 7133)) {
        X.EXCEPTION('Pe aceasta fereastra nu se pot folosi seriile de avize custodie tur si retur! Va rugam folositi meniul Custodie marfuri clienti!');
    }

    if (SALDOC.SERIES == 7210) {
        SALDOC.TRDR = 40225;
    }
}

function ON_DELETE() {
    // stergerea documentului factura client online sau bon fiscal face si stergere de bon de transfer, daca
    if ((SALDOC.SERIES == 7034) || (SALDOC.SERIES == 7211)) {
        if ((SALDOC.CCCBT != 0) && (SALDOC.CCCBT != null) && (SALDOC.CCCBT != '')) {
            sSQL = 'select top 1 A.findoc from mtrlines A left outer join findoc B on A.findoc = B.findoc where A.findoc= ' + SALDOC.CCCBT + ' and B.series = 1101 and B.sosource = 1151';
            ds = X.GETSQLDATASET(sSQL, null);

            if (ds.RECORDCOUNT > 0) {
                ObjConv = X.CreateObj('ITEDOC');

                ObjConv.DBLocate(SALDOC.CCCBT);
                ObjConv.DBDelete;
                //SALDOC.CCCBT = null;
            }
        }
    }

    objABC.D();
}

function ON_SALDOC_ISCANCEL() {
    // anularea documentului factura client online sau bon fiscal face si stergere de bon de transfer, daca
    if ((SALDOC.SERIES == 7034) || (SALDOC.SERIES == 7211)) {
        if ((SALDOC.CCCBT != 0) && (SALDOC.CCCBT != null) && (SALDOC.CCCBT != '')) {
            sSQL = 'select top 1 A.findoc from mtrlines A left outer join findoc B on A.findoc = B.findoc where A.findoc= ' + SALDOC.CCCBT + ' and B.series = 1101 and B.sosource = 1151';
            ds = X.GETSQLDATASET(sSQL, null);

            if (ds.RECORDCOUNT > 0) {
                ObjConv = X.CreateObj('ITEDOC');

                ObjConv.DBLocate(SALDOC.CCCBT);
                ObjConv.DBDelete;
                //SALDOC.CCCBT = null;
            }
        }
    }

    if (SALDOC.ISCANCEL == 1)
        objABC.D();
}

//Export XML Cora factura tur si factura retur
function exportXMLCora() {
    if (SALDOC.SERIES == 7121) {
        aCommand = 'XCMD:ClientImport,ScriptName: AR_CORA_ORIGINAL_INVOICE,myFindoc:' + SALDOC.FINDOC;
        X.EXEC(aCommand);
    }
    if (SALDOC.SERIES == 7531) {
        aCommand = 'XCMD:ClientImport,ScriptName: AR_CORA_RETUR_INVOICE,myFindoc:' + SALDOC.FINDOC;
        X.EXEC(aCommand);
    }

}
//Export XML Carrefour factura tur si factura retur
function exportXMLCarrefour() {
    if (SALDOC.SERIES == 7121) {
        aCommand = 'XCMD:ClientImport,ScriptName: AR_CARREFOUR_ORIG_INV,myFindoc:' + SALDOC.FINDOC;
        X.EXEC(aCommand);
    }
    if (SALDOC.SERIES == 7531) {
        aCommand = 'XCMD:ClientImport,ScriptName: AR_CARREFOUR_RETUR_INV,myFindoc:' + SALDOC.FINDOC;
        X.EXEC(aCommand);
    }

}
//Export XML Carrefour factura tur si factura retur
function exportXMLColumbus() {
    if (SALDOC.SERIES == 7121) {
        aCommand = 'XCMD:ClientImport,ScriptName: AT_COLUMBUS_ORIG_INV,myFindoc:' + SALDOC.FINDOC;
        X.EXEC(aCommand);
    }
    if (SALDOC.SERIES == 7531) {
        aCommand = 'XCMD:ClientImport,ScriptName: AT_COLUMBUS_RETUR_INV,myFindoc:' + SALDOC.FINDOC;
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
        aCommand = 'XCMD:ClientImport,ScriptName: ExpFactDedeman_ButonNew,myFindoc:' + SALDOC.FINDOC;
        X.EXEC(aCommand);
    }
}

//ABC related
function ON_ITELINES_NEW() {
    //init ABC
    initABC();

    var dims = objABC.setImpliciteLinie();
    if (dims.length) {
        ITELINES.CCCABCDIM1 = dims[0];
        ITELINES.CCCABCDIM2 = dims[1];
        ITELINES.CCCABCDIM3 = dims[2];
        ITELINES.CCCABCDIM4 = dims[3];
        ITELINES.CCCABCDIM5 = dims[4];
        ITELINES.CCCABCDIM6 = dims[5];
    }
}

function ON_SRVLINES_NEW() {
    //init ABC
    initABC();
    var dims = objABC.setImpliciteLinie();
    if (dims.length) {
        SRVLINES.CCCABCDIM1 = dims[0];
        SRVLINES.CCCABCDIM2 = dims[1];
        SRVLINES.CCCABCDIM3 = dims[2];
        SRVLINES.CCCABCDIM4 = dims[3];
        SRVLINES.CCCABCDIM5 = dims[4];
        SRVLINES.CCCABCDIM6 = dims[5];
    }
}

function loadABC() {
    var dsSoImport,
    jsCode;
    //aceasta functie returneaza un closure ABC, care se foloseste gen objABC.upsert();
    //daca nu a mai fost executata, ABC global e undefined
    //se executa global la operare form sau in _POST daca webservice

    if (Object.keys(objABC).length === 0 && objABC.constructor === Object) {
        dsSoImport = X.GETSQLDATASET("SELECT SOIMPORT FROM SOIMPORT WHERE CODE='ABC'", null);
        dsSoImport.FIRST;
        jsCode = dsSoImport.SOIMPORT;
        eval(jsCode); //returneaza var ABC local
        objABC = ABC; //o fac accesibila global
    }
}

function initABC() {
    var q = 'select CCCABCREPRSENTBUSINESS catCom from trdr where trdbusiness=112',
    dsCatCom = X.GETSQLDATASET(q, null),
    trdb = X.SQL('select trdbusiness from trdr where trdr=' + SALDOC.TRDR, null),
    reprezentant;

    if (dsCatCom.RECORDCOUNT) {
        dsCatCom.FIRST;
        while (!dsCatCom.eof) {
            if (trdb == dsCatCom.catCom) {
                reprezentant = X.SQL('select trdr from trdr where cccabcreprsentbusiness=' + trdb, null);
                break;
            }
            dsCatCom.NEXT;
        }
    };

    var uiFrom = [{
            ui: SALDOC.TRDR_CUSTOMER_TRDBUSINESS,
            sql: ''
        }, {
            ui: reprezentant ? reprezentant : SALDOC.TRDR,
            sql: ''
        }, {
            ui: SALDOC.SALESMAN,
            sql: 'select isnull(depart, 0) from prsn where prsn='
        }, {
            ui: SALDOC.SALESMAN,
            sql: ''
        }, {
            ui: SALDOC.TRDBRANCH,
            sql: 'select isnull(CCCZONAGEO, 0) from trdbranch where trdbranch='
        }, {
            ui: SALDOC.SALESMAN,
            sql: 'select isnull(trucks, 0) from prsn where prsn='
        }
    ];
    objABC.init(SALDOC, ITELINES, SRVLINES, 1000, 1001, 1002, 1003, uiFrom); //paseaza variabilele necesare in closure ABC
}

function ON_SALDOC_TRDR() {
    initABC();
}

function ON_SALDOC_SALESMAN() {
    initABC();
}

function ON_SALDOC_TRDBRANCH() {
    initABC();
}

function ON_CREATE() {
    loadABC(); //creaza var ABC global
    //X.WARNING('__ABC module loaded__');
}

function ON_LOCATE() {
    //debugger;
    initABC(); //init la modificare doc
    if (!aDoua) {
        //saveABC();
    } else {
        aDoua = false;
    }

    X.ABCST.REFRESH;
    X.INVALIDATEFIELD('ITELINES.CCCABCDIM2');

    denumireDocProcess = 'INVOIC_' + SALDOC.SERIESNUM + '_VAT_' +
        X.SQL("select coalesce(afm, 'RO25190857') as PartyIdentification from company where company=" + X.SYS.COMPANY, null) + '.xml';

}

function saveABC() {

    reevalueazaModelele();
    objABC.D();

    objABC.upsert();
}

function ON_INSERT() {
    initABC(); //init la modificare doc
}

function ON_ITELINES_CCCABCDIMMDL1() {
    if (ITELINES.CCCABCDIMMDL1)
        on_linlines_abc(ITELINES, ITELINES.CCCABCDIMMDL1, 'CCCABCDIMMDL1', 'ITELINES.CCCABCDIMMDL1');
}

function ON_ITELINES_CCCABCDIMMDL2() {
    if (ITELINES.CCCABCDIMMDL2)
        on_linlines_abc(ITELINES, ITELINES.CCCABCDIMMDL2, 'CCCABCDIMMDL2', 'ITELINES.CCCABCDIMMDL2');
}

function ON_ITELINES_CCCABCDIMMDL3() {
    if (ITELINES.CCCABCDIMMDL3)
        on_linlines_abc(ITELINES, ITELINES.CCCABCDIMMDL3, 'CCCABCDIMMDL3', 'ITELINES.CCCABCDIMMDL3');
}

function ON_ITELINES_CCCABCDIMMDL4() {
    if (ITELINES.CCCABCDIMMDL4)
        on_linlines_abc(ITELINES, ITELINES.CCCABCDIMMDL4, 'CCCABCDIMMDL4', 'ITELINES.CCCABCDIMMDL4');
}

function ON_ITELINES_CCCABCDIMMDL5() {
    if (ITELINES.CCCABCDIMMDL5)
        on_linlines_abc(ITELINES, ITELINES.CCCABCDIMMDL5, 'CCCABCDIMMDL5', 'ITELINES.CCCABCDIMMDL5');
}

function ON_ITELINES_CCCABCDIMMDL6() {
    if (ITELINES.CCCABCDIMMDL6)
        on_linlines_abc(ITELINES, ITELINES.CCCABCDIMMDL6, 'CCCABCDIMMDL6', 'ITELINES.CCCABCDIMMDL6');
}

function adminMdl(dimCell, dimSql) {
    var da = X.FORMATDATE('yyyymmdd', SALDOC.TRNDATE);
    if (dimCell) {
        var d = parseInt(objABC.administrareModeleDinamice(dimCell, da));
        if (dimCell != d) {
            return d;
        } else {
            return 0;
        }
    }
}

function on_linlines_abc(ds, gridCellVal, cellName, fullCellName) {
    if (itsMeStackOverflow) {
        itsMeStackOverflow = false;
        return;
    }
    var val = adminMdl(gridCellVal, cellName);
    X.ABCDIMMDL.REFRESH;
    if (val) {
        itsMeStackOverflow = true;
        switch (cellName) {
        case 'CCCABCDIMMDL1':
            X.INVALIDATEFIELD(fullCellName);
            ds.CCCABCDIMMDL1 = val;
            break;
        case 'CCCABCDIMMDL2':
            X.INVALIDATEFIELD(fullCellName);
            ds.CCCABCDIMMDL2 = val;
            break;
        case 'CCCABCDIMMDL3':
            X.INVALIDATEFIELD(fullCellName);
            ds.CCCABCDIMMDL3 = val;
            break;
        case 'CCCABCDIMMDL4':
            X.INVALIDATEFIELD(fullCellName);
            ds.CCCABCDIMMDL4 = val;
            break;
        case 'CCCABCDIMMDL5':
            X.INVALIDATEFIELD(fullCellName);
            ds.CCCABCDIMMDL5 = val;
            break;
        case 'CCCABCDIMMDL6':
            X.INVALIDATEFIELD(fullCellName);
            ds.CCCABCDIMMDL6 = val;
            break;
        }
    }
}

function ON_SRVLINES_CCCABCDIMMDL1() {
    if (SRVLINES.CCCABCDIMMDL1)
        on_linlines_abc(SRVLINES, SRVLINES.CCCABCDIMMDL1, 'CCCABCDIMMDL1', 'SRVLINES.CCCABCDIMMDL1');
}

function ON_SRVLINES_CCCABCDIMMDL2() {
    if (SRVLINES.CCCABCDIMMDL2)
        on_linlines_abc(SRVLINES, SRVLINES.CCCABCDIMMDL2, 'CCCABCDIMMDL2', 'SRVLINES.CCCABCDIMMDL2');
}

function ON_SRVLINES_CCCABCDIMMDL3() {
    if (SRVLINES.CCCABCDIMMDL3)
        on_linlines_abc(SRVLINES, SRVLINES.CCCABCDIMMDL3, 'CCCABCDIMMDL3', 'SRVLINES.CCCABCDIMMDL3');
}

function ON_SRVLINES_CCCABCDIMMDL4() {
    if (SRVLINES.CCCABCDIMMDL4)
        on_linlines_abc(SRVLINES, SRVLINES.CCCABCDIMMDL4, 'CCCABCDIMMDL4', 'SRVLINES.CCCABCDIMMDL4');
}

function ON_SRVLINES_CCCABCDIMMDL5() {
    if (SRVLINES.CCCABCDIMMDL5)
        on_linlines_abc(SRVLINES, SRVLINES.CCCABCDIMMDL5, 'CCCABCDIMMDL5', 'SRVLINES.CCCABCDIMMDL5');
}

function ON_SRVLINES_CCCABCDIMMDL6() {
    if (SRVLINES.CCCABCDIMMDL6)
        on_linlines_abc(SRVLINES, SRVLINES.CCCABCDIMMDL6, 'CCCABCDIMMDL6', 'SRVLINES.CCCABCDIMMDL6');
}

function reevalueazaModelele() {
    if (ITELINES.CCCABCDIMMDL1)
        on_linlines_abc(ITELINES, ITELINES.CCCABCDIMMDL1, 'CCCABCDIMMDL1', 'ITELINES.CCCABCDIMMDL1');
    if (ITELINES.CCCABCDIMMDL2)
        on_linlines_abc(ITELINES, ITELINES.CCCABCDIMMDL2, 'CCCABCDIMMDL2', 'ITELINES.CCCABCDIMMDL2');
    if (ITELINES.CCCABCDIMMDL3)
        on_linlines_abc(ITELINES, ITELINES.CCCABCDIMMDL3, 'CCCABCDIMMDL3', 'ITELINES.CCCABCDIMMDL3');
    if (ITELINES.CCCABCDIMMDL4)
        on_linlines_abc(ITELINES, ITELINES.CCCABCDIMMDL4, 'CCCABCDIMMDL4', 'ITELINES.CCCABCDIMMDL4');
    if (ITELINES.CCCABCDIMMDL5)
        on_linlines_abc(ITELINES, ITELINES.CCCABCDIMMDL5, 'CCCABCDIMMDL5', 'ITELINES.CCCABCDIMMDL5');
    if (ITELINES.CCCABCDIMMDL6)
        on_linlines_abc(ITELINES, ITELINES.CCCABCDIMMDL6, 'CCCABCDIMMDL6', 'ITELINES.CCCABCDIMMDL6');
    if (SRVLINES.CCCABCDIMMDL1)
        on_linlines_abc(SRVLINES, SRVLINES.CCCABCDIMMDL1, 'CCCABCDIMMDL1', 'SRVLINES.CCCABCDIMMDL1');
    if (SRVLINES.CCCABCDIMMDL2)
        on_linlines_abc(SRVLINES, SRVLINES.CCCABCDIMMDL2, 'CCCABCDIMMDL2', 'SRVLINES.CCCABCDIMMDL2');
    if (SRVLINES.CCCABCDIMMDL3)
        on_linlines_abc(SRVLINES, SRVLINES.CCCABCDIMMDL3, 'CCCABCDIMMDL3', 'SRVLINES.CCCABCDIMMDL3');
    if (SRVLINES.CCCABCDIMMDL4)
        on_linlines_abc(SRVLINES, SRVLINES.CCCABCDIMMDL4, 'CCCABCDIMMDL4', 'SRVLINES.CCCABCDIMMDL4');
    if (SRVLINES.CCCABCDIMMDL5)
        on_linlines_abc(SRVLINES, SRVLINES.CCCABCDIMMDL5, 'CCCABCDIMMDL5', 'SRVLINES.CCCABCDIMMDL5');
    if (SRVLINES.CCCABCDIMMDL6)
        on_linlines_abc(SRVLINES, SRVLINES.CCCABCDIMMDL6, 'CCCABCDIMMDL6', 'SRVLINES.CCCABCDIMMDL6');
}

/*
Framework for binding S1 UI to required XML, validation, error system, defaults, easy to extend or cut, no blanks in XML elements
DocProcess integration, EMAG, invoice js class
Vestemean Cosmin, 0744 236 760, cosmin.vestemean@serrasoftware.ro, cosmin.ve@gmail.com
8-27.09.2021
 */

/*
//primitiva:

XXX: {
Count: 0,
Start: {
XML: function () {
return '<XXX>';
}
},
YYY: {
UI: null,
requiredInXMLSchema: true,
type: 'numeric',
length: 0,
format: '42',
XML: function () {
if (this.UI)
return '<YYY>' + this.UI + '</YYY>';
else
return '';
}
},
Stop: {
XML: function () {
return '</XXX>';
}
}
}

 */

//getPrimitiveObj(defaultValue_, requiredInXMLSchema_, type_, length_, format_, elemName_, closinElemName_)
function createInvoice() {
    var _Invoice = {
        Count: 1,
        Start: {
            XML: function () {
                return '<Invoice xmlns="">';
            }
        },
        CustomizationID: getPrimitiveObj('FMF', true, 'string', 3, 'FMF (impus)', 'CustomizationID'),
        ID: getPrimitiveObj(null, true, 'numeric', 20, 'The value must be equal with "FMF" (the characters are case sensitive).', 'ID'),
        CopyIndicator: getPrimitiveObj('FALSE', true, 'string', 5, '', 'CopyIndicator'),
        IssueDate: getPrimitiveObj(null, true, 'date', 10, 'YYYY-MM-DD', 'IssueDate'),
        InvoiceTypeCode: getPrimitiveObj(null, true, 'numeric', 3, '380 = original invoice 381 = storno invoice 384 = correction invoice', 'InvoiceTypeCode'),
        Note: getPrimitiveObj(null, false, 'string', 3000, 'TVA la incasare', 'Note'),
        DocumentCurrencyCode: getPrimitiveObj(null, true, 'string', 3, 'ISO 4217 code', 'DocumentCurrencyCode'),
        LineCountNumeric: getPrimitiveObj(null, true, 'numeric', 6, 'The value must be equal with the invoice lines number.', 'LineCountNumeric'),
        OrderReference: {},
        DespatchDocumentReference: {},
        AccountingSupplierParty: {},
        AccountingCustomerParty: {},
        Delivery: {},
        PaymentMeans: {},
        PaymentTerms: {},
        TaxTotal: {},
        LegalMonetaryTotal: {},
        Stop: {
            XML: function () {
                return '</Invoice>';
            }
        }
    },
    //OrderReference namespace
    OrderReference = {
        Count: 0,
        Start: {
            XML: function () {
                return '<OrderReference>';
            }
        },
        ID: getPrimitiveObj(null, true, 'string', 20, '123', 'ID'),
        IssueDate: getPrimitiveObj(null, false, 'date', 10, 'YYYY-MM-DD', 'IssueDate'),
        Stop: {
            XML: function () {
                return '</OrderReference>';
            }
        }
    },
    //DespatchDocumentReference namespace
    DespatchDocumentReference = {
        Count: 0,
        Start: {
            XML: function () {
                return '<DespatchDocumentReference>';
            }
        },
        ID: getPrimitiveObj(null, false, 'string', 20, '123', 'ID'),
        IssueDate: getPrimitiveObj(null, false, 'date', 10, 'YYYY-MM-DD', 'IssueDate'),
        Stop: {
            XML: function () {
                return '</DespatchDocumentReference>';
            }
        }
    },
    //AccountingSupplierParty namespace
    AccountingSupplierParty = getAccountingPartyObj('AccountingSupplierParty'),
    //AccountingCustomerParty namespace
    AccountingCustomerParty = getAccountingPartyObj('AccountingCustomerParty'),
    //Delivery namespace
    Delivery = {
        Count: 0,
        Start: {
            XML: function () {
                return '<Delivery>';
            }
        },
        ActualDeliveryDate: getPrimitiveObj(null, true, 'date', 10, 'YYYY-MM-DD', 'ActualDeliveryDate'),
        DeliveryLocation: {
            Count: 0,
            Start: {
                XML: function () {
                    return '<DeliveryLocation>';
                }
            },
            ID: getPrimitiveObj(null, true, 'numeric', 13, '5940477490018 (The value must be equal with one of the GLNs associated to the customer delivery locations.)', 'ID'),
            Description: getPrimitiveObj(null, false, 'string', 50, 'DANTE INTERNATIONAL SA - Depozit Central (DC)', 'Description'),
            LocationAddress: {
                Count: 0,
                Start: {
                    XML: function () {
                        return '<LocationAddress>';
                    }
                },
                StreetName: getPrimitiveObj(null, false, 'string', 100, 'Str. Italia, Parcul Logistic EuroPolis (Cefin)', 'StreetName'),
                BuildingNumber: getPrimitiveObj(null, false, 'string', 10, '', 'BuildingNumber'),
                CityName: getPrimitiveObj(null, false, 'string', 100, 'Chiajna, IF', 'CityName'),
                Country: {
                    Count: 1,
                    Start: {
                        XML: function () {
                            return '<Country>';
                        }
                    },
                    IdentificationCode: getPrimitiveObj('RO', true, 'string', 2, 'RO', 'IdentificationCode'),
                    Stop: {
                        XML: function () {
                            return '</Country>';
                        }
                    }
                },
                Stop: {
                    XML: function () {
                        return '</LocationAddress>';
                    }
                }
            },
            Stop: {
                XML: function () {
                    return '</DeliveryLocation>';
                }
            }
        },
        Stop: {
            XML: function () {
                return '</Delivery>';
            }
        }
    },
    //PaymentMeans namespace
    PaymentMeans = {
        Count: 0,
        Start: {
            XML: function () {
                return '<PaymentMeans>';
            }
        },
        PaymentMeansCode: getPrimitiveObj(42, true, 'numeric', 0, '42', 'PaymentMeansCode'),
        PaymentDueDate: getPrimitiveObj(null, true, 'date', 10, 'YYYY-MM-DD', 'PaymentDueDate'),
        PayerFinancialAccount: getBankAccountObj('PayerFinancialAccount'),
        PayeeFinancialAccount: getBankAccountObj('PayeeFinancialAccount'),
        Stop: {
            XML: function () {
                return '</PaymentMeans>';
            }
        }
    },
    //PaymentTerms namespace
    PaymentTerms = {
        Count: 1,
        Start: {
            XML: function () {
                return '<PaymentTerms>';
            }
        },
        SettlementPeriod: {
            Count: 0,
            Start: {
                XML: function () {
                    return '<SettlementPeriod>';
                }
            },
            DurationMeasure: getPrimitiveObj(null, true, 'numeric', 0, '80', 'DurationMeasure'),
            DescriptionCode: getPrimitiveObj('D', true, 'string', 1, 'D (days, impus)', 'DescriptionCode'),
            Stop: {
                XML: function () {
                    return '</SettlementPeriod>';
                }
            }
        },
        Stop: {
            XML: function () {
                return '</PaymentTerms>';
            }
        }
    },
    //TaxTotal namespace
    TaxSubtotal = {
        Count: 0,
        Start: {
            XML: function () {
                return '<TaxSubtotal>';
            }
        },
        TaxableAmount: getPrimitiveObj(null, true, 'R2', 0, '10.00', 'TaxableAmount'),
        TaxAmount: getPrimitiveObj(null, true, 'R2', 0, '10.00', 'TaxAmount'),
        Percent: getPrimitiveObj(null, true, 'R2', 0, '10.00', 'Percent'),
        TaxCategory: {
            Count: 3,
            Start: {
                XML: function () {
                    return '<TaxCategory>';
                }
            },
            TaxScheme: {
                Count: 3,
                Start: {
                    XML: function () {
                        return '<TaxScheme>';
                    }
                },
                ID: getPrimitiveObj('7', true, 'string', 1, '7 (impus)', 'ID'),
                Name: getPrimitiveObj('S', true, 'string', 1, 'Standard UNECE 5305. The value must be equal with one of the values: S = standard VAT ' +
                    'B = reverse charge AC = TVA la incasare', 'Name'),
                TaxTypeCode: getPrimitiveObj('VAT', true, 'string', 3, 'VAT (impus)', 'TaxTypeCode'),
                Stop: {
                    XML: function () {
                        return '</TaxScheme>';
                    }
                }
            },
            Stop: {
                XML: function () {
                    return '</TaxCategory>';
                }
            }
        },
        Stop: {
            XML: function () {
                return '</TaxSubtotal>';
            }
        }
    },
    TaxTotal = {
        Count: 0,
        Start: {
            XML: function () {
                return '<TaxTotal>';
            }
        },
        TaxAmount: getPrimitiveObj(null, true, 'R2', 0, '10.00', 'TaxAmount'),
        TaxSubtotal: {},
        TaxSubtotal0: {},
        TaxSubtotal1: {},
        TaxSubtotal2: {},
        TaxSubtotal3: {},
        TaxSubtotal4: {},
        TaxSubtotal5: {},
        TaxSubtotal6: {},
        TaxCategory: {},
        TaxScheme: {},
        Stop: {
            XML: function () {
                return '</TaxTotal>';
            }
        }
    },
    //LegalMonetaryTotal namespace
    LegalMonetaryTotal = {
        Count: 0,
        Start: {
            XML: function () {
                return '<LegalMonetaryTotal>';
            }
        },
        TaxExclusiveAmount: getPrimitiveObj(null, true, 'R2', 0, '40.00', 'TaxExclusiveAmount'),
        TaxInclusiveAmount: getPrimitiveObj(null, true, 'R2', 0, '40.00', 'TaxInclusiveAmount'),
        Stop: {
            XML: function () {
                return '</LegalMonetaryTotal>';
            }
        }
    },
    //current invoice line namespace; dupa ce se construieste, umple cu valori, se adauga in _InvoiceLines array
    _CurrentInvoiceLine,
    _lineTemplate = {
        Count: 0,
        Start: {
            XML: function () {
                return ' <InvoiceLine xmlns="">';
            }
        },
        ID: getPrimitiveObj(null, true, 'numeric', 4, '1', 'ID'),
        Note: getPrimitiveObj(null, false, 'string', 200, '', 'Note'),
        InvoicedQuantity: {},
        calcInvoicedQuantity: function (qty1, mtrunit) {

            var iq = getPrimitiveObj({
                QTY1: qty1,
                MTRUNIT: mtrunit
            }, true, 'numeric', 0, '', 'InvoicedQuantity');
            iq.XML = function () {
                //debugger;
                var unitCode = '';
                if (qty1 && mtrunit) {
                    switch (parseInt(mtrunit)) {
                    case 1:
                        unitCode = 'PC';
                        break;
                    case 10:
                        unitCode = 'BC';
                        break;
                    case 7:
                        unitCode = 'KG';
                        break;
                    case 6:
                        unitCode = 'L';
                        break;
                    case 3:
                        unitCode = 'M';
                        break;
                    default:
                        unitCode = 'PC';
                        _errBindErrors += 'MTRUNIT=' + mtrunit + ' a fost convertit implicit in bucati (PC)\n';
                        break;
                    }
                    return '<InvoicedQuantity unitCode="' + unitCode + '">' + qty1 + '</InvoicedQuantity>';
                } else
                    return '';
            }

            return iq;
        },
        LineExtensionAmount: {
            UI: null,
            requiredInXMLSchema: true,
            type: 'R2',
            length: 0,
            format: '120.00',
            XML: function () {
                //debugger;
                var amnt = 0;
                if (!_Invoice.InvoiceTypeCode) {
                    _errBindErrors += 'Nu a fost transmisa seria, nu stiu daca este tur sau retur.\n';
                }

                if (this.UI) {
                    switch (_Invoice.InvoiceTypeCode.UI) {
                    case 380:
                        //tur
                        amnt = this.UI;
                        break;
                    case 381:
                        //retur
                        amnt = -1 * this.UI;
                        break;
                    default:
                        amnt = this.UI;
                        _errBindErrors += 'Valoare linie implicit pozitiva, seria nici tur, nici retur.\n';
                        break;
                    }

                    return '<LineExtensionAmount>' + emptyFunction(amnt, 2) + '</LineExtensionAmount>';
                } else
                    return '';
            }
        },
        TaxTotal: {},
        Item: {},
        Price: {},
        Stop: {
            XML: function () {
                return '</InvoiceLine>';
            }
        }
    },
    AllowanceCharge = getDiscountObj(),
    Item = {
        Count: 0,
        Start: {
            XML: function () {
                return '<Item>';
            }
        },
        Description: getPrimitiveObj(null, true, 'string', 255, 'Produs test 1', 'Description'),
        BuyersItemIdentification: {
            Count: 0,
            Start: {
                XML: function () {
                    return '<BuyersItemIdentification>';
                }
            },
            ID: getPrimitiveObj(null, true, 'string', 13, '1234567891234', 'ID'),
            Stop: {
                XML: function () {
                    return '</BuyersItemIdentification>';
                }
            }
        },
        SellersItemIdentification: {
            Count: 0,
            Start: {
                XML: function () {
                    return '<SellersItemIdentification>';
                }
            },
            ID: getPrimitiveObj(null, false, 'string', 13, '1234567891234', 'ID'),
            Stop: {
                XML: function () {
                    return '</SellersItemIdentification>';
                }
            }
        },
        StandardItemIdentification: {
            Count: 0,
            Start: {
                XML: function () {
                    return '<StandardItemIdentification>';
                }
            },
            ID: getPrimitiveObj(null, false, 'string', 13, '1234567891234', 'ID'),
            Stop: {
                XML: function () {
                    return '</StandardItemIdentification>';
                }
            }
        },
        Stop: {
            XML: function () {
                return '</Item>';
            }
        },
        Stop: {
            XML: function () {
                return '</Item>';
            }
        }
    },
    Price = {
        Count: 0,
        Start: {
            XML: function () {
                return '<Price>';
            }
        },
        PriceAmount: getPrimitiveObj(null, true, 'R2', 0, '15.00', 'PriceAmount'),
        Stop: {
            XML: function () {
                return '</Price>';
            }
        }
    },
    _TaxSubtotals = [],
    _InvoiceLines = [],
    _errBindErrors = '',
    _errXMLErrors = '',
    _dom = '';

    function getPrimitiveObj(defaultValue_, requiredInXMLSchema_, type_, length_, format_, elemName, closinElemName) {
        var primitiva = {
            UI: defaultValue_,
            requiredInXMLSchema: requiredInXMLSchema_,
            type: type_,
            length: length_,
            format: format_
        }

        var last = closinElemName ? closinElemName : elemName;
        elemName = elemName == 'CorporateStockAmount' ? 'CorporateStockAmount  currencyID="RON"' : elemName;
        if (type_ == 'R2') {
            primitiva.XML = function () {
                if (this.UI)
                    return '<' + elemName + '>' + emptyFunction(parseFloat(this.UI), 2) + '</' + last + '>';
                else
                    return null;
            }
        } else if (type_ == 'string') {
            primitiva.XML = function () {
                if (this.UI)
                    if (this.type == 'string' && this.length) {
                        return '<' + elemName + '>' + this.UI.toString().trim().substring(0, this.length) + '</' + last + '>';
                    } else {
                        _errBindErrors += elemName + '(lungimePrimitiva=' + this.length + ', typePrimitiva=' + this.type + ')\n';
                        return '';
                    }
                else
                    return '';
            }
        } else if (type_ == 'date') {
            primitiva.XML = function () {
                if (this.UI && this.UI.toString() != '1899-12-30')
                    //return '<' + elemName + '>' + X.FORMATDATE(this.format, this.UI) + '</' + last + '>';
                    return '<' + elemName + '>' + this.UI + '</' + last + '>';
                else
                    return '';
            }
        } else if (type_ == 'numeric') {
            primitiva.XML = function () {
                if (this.UI)
                    return '<' + elemName + '>' + this.UI + '</' + last + '>';
                else
                    return null;
            }
        }

        return primitiva;
    }

    function isInt(value) {
        var x;
        if (isNaN(value)) {
            return false;
        }
        x = parseFloat(value);
        return (x | 0) === x;
    }

    function bindUI(UiRef, UI, _prop) {
        Number.isInteger = Number.isInteger || function (value) {
            return typeof value === "number" && isFinite(value) && Math.floor(value) === value;
        };

        if (UI)
            if (typeof UI === 'string') {
                UI = UI.trim();
                UI = UI.replace(/&/g, '&amp;').replace(/'/g, "&pos;").replace(/"/g, '& quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            } else if (typeof UI === 'number') {
                if (Number.isInteger(UI))
                    UI = parseInt(UI);
                else
                    UI = parseFloat(UI);
            }

        if (_prop.type == 'date') {
            if (UI == '1899-12-30')
                UI = null;
        }

        if (_prop.requiredInXMLSchema) {
            if (UI) {
                _prop.UI = UI;
                return true;
            } else {
                //throw error
                _errBindErrors += UiRef + '\n';
                return false;
            }
        } else {
            if (UI) {
                _prop.UI = UI;
                return true;
            } else {
                return false;
            }
        }
    }

    function getBankAccountObj(player) {
        return {
            Count: 0,
            Start: {
                XML: function () {
                    return '<' + player + '>';
                }
            },
            ID: getPrimitiveObj(null, true, 'string', 50, 'RO81RNCB0082155066260001', 'ID'),
            CurrencyCode: getPrimitiveObj('RON', true, 'string', 3, 'RON (ISO 4217 code)', 'CurrencyCode'),
            FinancialInstitutionBranch: {
                Count: 0,
                Start: {
                    XML: function () {
                        return '<FinancialInstitutionBranch>';
                    }
                },
                FinancialInstitution: {
                    Count: 0,
                    Start: {
                        XML: function () {
                            return '<FinancialInstitution>';
                        }
                    },
                    Name: getPrimitiveObj(null, true, 'string', 70, 'BANCA COMERCIALA ROMANA', 'Name'),
                    Address: {
                        Count: 1,
                        Start: {
                            XML: function () {
                                return '<Address>';
                            }
                        },
                        Country: {
                            Count: 1,
                            Start: {
                                XML: function () {
                                    return '<Country>';
                                }
                            },
                            IdentificationCode: getPrimitiveObj('RO', true, 'string', 2, 'RO', 'IdentificationCode'),
                            Stop: {
                                XML: function () {
                                    return '</Country>';
                                }
                            }
                        },
                        Stop: {
                            XML: function () {
                                return '</Address>';
                            }
                        }
                    },
                    Stop: {
                        XML: function () {
                            return '</FinancialInstitution>';
                        }
                    }
                },
                Stop: {
                    XML: function () {
                        return '</FinancialInstitutionBranch>';
                    }
                }
            },
            Stop: {
                XML: function () {
                    return '</' + player + '>';
                }
            }
        };
    }

    function getAccountingPartyObj(player) {
        var retObj = {
            Count: 0,
            Start: {
                XML: function () {
                    return '<' + player + '>';
                }
            },
            CustomerAssignedAccountID: {},
            Party: {
                Count: 0,
                Start: {
                    XML: function () {
                        return '<Party>';
                    }
                },
                PartyIdentification: getPrimitiveObj(null, true, 'string', 20, 'RO12345', 'PartyIdentification'),
                PartyName: getPrimitiveObj(null, true, 'string', 100, 'EXEMPLU SA', 'PartyName'),
                PostalAddress: {
                    Count: 0,
                    Start: {
                        XML: function () {
                            return '<PostalAddress>';
                        }
                    },
                    StreetName: getPrimitiveObj(null, true, 'string', 100, 'Trotus', 'StreetName'),
                    BuildingNumber: getPrimitiveObj(null, true, 'string', 10, 'Nr. 10', 'BuildingNumber'),
                    CityName: getPrimitiveObj(null, true, 'string', 100, 'Bucuresti, Sector 2', 'CityName'),
                    PostalZone: getPrimitiveObj(null, false, 'string', 10, '12345', 'PostalZone'),
                    Country: {
                        Count: 1,
                        Start: {
                            XML: function () {
                                return '<Country>';
                            }
                        },
                        IdentificationCode: getPrimitiveObj('RO', false, 'string', 2, 'RO (Coded, according to ISO3166 (2 characters ))', 'IdentificationCode'),
                        Stop: {
                            XML: function () {
                                return '</Country>';
                            }
                        }
                    },
                    Stop: {
                        XML: function () {
                            return '</PostalAddress>';
                        }
                    }
                },
                PartyLegalEntity: {
                    Count: 0,
                    Start: {
                        XML: function () {
                            return '<PartyLegalEntity>';
                        }
                    },
                    CompanyID: getPrimitiveObj(null, true, 'string', 50, 'J30/12.01.2014', 'CompanyID'),
                    CorporateStockAmount: getPrimitiveObj(0, false, 'R2', 0, '1000.00', 'CorporateStockAmount'),
                    Stop: {
                        XML: function () {
                            return '</PartyLegalEntity>';
                        }
                    }
                },
                Stop: {
                    XML: function () {
                        return '</Party>';
                    }
                }
            },
            Stop: {
                XML: function () {
                    return '</' + player + '>';
                }
            }
        };

        if (player == 'AccountingSupplierParty') {
            retObj.CustomerAssignedAccountID = getPrimitiveObj('3446', true, 'string', 20, '3446', 'CustomerAssignedAccountID');
        }

        return retObj;
    }

    function getDiscountObj() {
        return {
            Count: 0,
            Start: {
                XML: function () {
                    return '<AllowanceCharge>';
                }
            },
            ID: getPrimitiveObj(null, false, 'numeric', 0, '1', 'ID'),
            ChargeIndicator: getPrimitiveObj('false', true, 'string', 5, '"false" for discount, "true" for (green) tax', 'ChargeIndicator'),
            AllowanceChargeReason: getPrimitiveObj('Discount', false, 'string', 20, 'Discount, Taxa verde, etc', 'AllowanceChargeReason'),
            MultiplierFactorNumeric: getPrimitiveObj(null, true, 'R2', 0, '10 (Procentual value without "%" sign)', 'MultiplierFactorNumeric'),
            Amount: getPrimitiveObj(null, true, 'R2', 0, '2 (Total discount amount per line)', 'Amount currencyID="RON"', 'Amount'),
            /*{
            UI: null,
            requiredInXMLSchema: true,
            type: 'R2',
            length: 0,
            format: '2 (Total discount amount per line)',
            XML: function () {
            if (this.UI)
            return '<Amount currencyID="RON">' + emptyFunction(this.UI, 2) + '</Amount>';
            else
            return '';
            }
            },
             */
            PerUnitAmount: getPrimitiveObj(null, true, 'R2', 0, '0.5 (Discount unitary value)', 'PerUnitAmount'),
            Stop: {
                XML: function () {
                    return '</AllowanceCharge>';
                }
            }
        };
    }

    function emptyFunction(num, decimals) {
        /*
        if (isNaN(num)) {
        X.WARNING(num + ' is not a number.');
        return 0;
        }
        var t = Math.pow(10, decimals);
        if (typeof Math.sign === 'undefined') {
        Math.sign = function (x) {
        return x > 0 ? 1 : x < 0 ? -1 : x;
        }
        }
        return (Math.round((num * t) + (decimals > 0 ? 1 : 0) * (Math.sign(num) * (10 / Math.pow(100, decimals)))) / t).toFixed(decimals);
         */

        return num;
    }

    function precise_round(num, decimals) {
        if (isNaN(num)) {
            X.WARNING(num + ' is not a number.');
            return 0;
        }
        var t = Math.pow(10, decimals);
        if (typeof Math.sign === 'undefined') {
            Math.sign = function (x) {
                return x > 0 ? 1 : x < 0 ? -1 : x;
            }
        }
        return (Math.round((num * t) + (decimals > 0 ? 1 : 0) * (Math.sign(num) * (10 / Math.pow(100, decimals)))) / t).toFixed(decimals);
    }

    function copy(aObject) {
        if (!aObject) {
            return aObject;
        }

        var v,
        bObject = Array.isArray(aObject) ? [] : {};
        for (var k in aObject) {
            v = aObject[k];
            bObject[k] = (typeof v === "object") ? copy(v) : v;
        }

        return bObject;
    }

    function _set_NamespaceBind(_obj, newKeyName, namespace, arr) {

        //clone namespace so the original stays clean
        _obj[newKeyName] = copy(namespace);
        for (var i = 0; i < arr.length; i++) {
            var s = arr[i].x.split('.'),
            branch = _obj[newKeyName],
            pcteInflex = [];
            pcteInflex.push(branch);
            for (var j = 0; j < s.length; j++) {
                branch = branch[s[j]];
                pcteInflex.push(branch);
            }

            if (bindUI(arr[i].UIRef, arr[i].UIVal, branch)) {
                _obj.Count++;
                for (k = 0; k < pcteInflex.length - 1; k++) {
                    pcteInflex[k].Count++;
                }
            }
        }
    }

    function eachRecursive(obj) {

        for (var k in obj) {
            if (typeof obj[k] == "object" && obj[k] !== null) {
                if (obj.Count && obj[k].XML) {
                    var aXML = obj[k].XML();
                    if (aXML)
                        _dom += aXML;
                }
                eachRecursive(obj[k]);
            }
        }
    }

    function parseXML(str) {
        var xmlDoc;
        var versions = ["MSXML2.DOMDocument.6.0",
            "MSXML2.DOMDocument.3.0",
            "MSXML2.DOMDocument"];

        for (var i = 0; i < 3; i++) {
            try {
                xmlDoc = new ActiveXObject(versions[i]);

                if (xmlDoc)
                    break;
            } catch (ex) {
                xmlDoc = null;
            }
        }

        if (xmlDoc) {
            xmlDoc.async = "false";
            xmlDoc.validateOnParse = "true";
            xmlDoc.setProperty("ProhibitDTD", "true");
            xmlDoc.loadXML(str);
            if (xmlDoc.parseError.errorCode != 0) {
                _errXMLErrors += 'Reason:' + xmlDoc.parseError.reason + '\nErrorCode:' + xmlDoc.parseError.errorCode + '\nLine:' + xmlDoc.parseError.line + '\n';
                return null;
            } else
                return xmlDoc.xml;

        }
    }

    return {
        /*
        Series = {
        UIRef: 'SALDOC.SERIES',	//for error system to report
        UIVal: 7121
        };
         */
        set_Invoice: function (ID, IssueDate, Series, Note, DocumentCurrencyCode, LineCountNumeric) {
            if (bindUI(ID.UIRef, ID.UIVal, _Invoice.ID))
                _Invoice.Count++;
            if (bindUI(IssueDate.UIRef, IssueDate.UIVal, _Invoice.IssueDate))
                _Invoice.Count++;
            if (parseInt(Series.UIVal) == 7121) {
                if (bindUI(Series.UIRef, 380, _Invoice.InvoiceTypeCode))
                    _Invoice.Count++;
            } else if (parseInt(Series.UIVal) == 7531) {
                if (bindUI(Series.UIRef, 381, _Invoice.InvoiceTypeCode))
                    _Invoice.Count++;
            } else
                _errBindErrors += Series.UIRef + '=' + Series.UIVal + '\nInvoiceTypeCode error (Serie necunoscuta)\n';
            if (bindUI(Note.UIRef, Note.UIVal, _Invoice.Note))
                _Invoice.Count++;
            if (bindUI(DocumentCurrencyCode.UIRef, DocumentCurrencyCode.UIVal, _Invoice.DocumentCurrencyCode))
                _Invoice.Count++;
            if (bindUI(LineCountNumeric.UIRef, LineCountNumeric.UIVal, _Invoice.LineCountNumeric))
                _Invoice.Count++;
        },
        set_OrderReference: function (arr) {

            _set_NamespaceBind(_Invoice, 'OrderReference', OrderReference, arr);
        },
        set_DespatchDocumentReference: function (arr) {
            _set_NamespaceBind(_Invoice, 'DespatchDocumentReference', DespatchDocumentReference, arr);
        },
        set_AccountingSupplierParty: function (arr) {
            _set_NamespaceBind(_Invoice, 'AccountingSupplierParty', AccountingSupplierParty, arr);
        },
        set_AccountingCustomerParty: function (arr) {
            _set_NamespaceBind(_Invoice, 'AccountingCustomerParty', AccountingCustomerParty, arr);
        },
        set_Delivery: function (arr) {
            _set_NamespaceBind(_Invoice, 'Delivery', Delivery, arr);
        },
        set_PaymentMeans: function (arr) {
            _set_NamespaceBind(_Invoice, 'PaymentMeans', PaymentMeans, arr);
        },
        set_PaymentTerms: function (arr) {
            _set_NamespaceBind(_Invoice, 'PaymentTerms', PaymentTerms, arr);
        },
        set_TaxTotal: function (arr) {
            _set_NamespaceBind(_Invoice, 'TaxTotal', TaxTotal, arr);

            if (_TaxSubtotals.length) {
                for (var n = 0; n < _TaxSubtotals.length; n++) {
                    var arrTS = [{
                            UIRef: 'VATANAL:' + _TaxSubtotals[n].Procent.toString() + '%' + ' TaxableAmount',
                            UIVal: _TaxSubtotals[n].TaxableAmount,
                            x: 'TaxableAmount'
                        }, {
                            UIRef: 'VATANAL:' + _TaxSubtotals[n].Procent.toString() + '%' + ' TaxAmount',
                            UIVal: _TaxSubtotals[n].TaxAmount,
                            x: 'TaxAmount'
                        }, {
                            UIRef: 'VATANAL:' + _TaxSubtotals[n].Procent.toString() + '%' + ' Percent',
                            UIVal: _TaxSubtotals[n].Procent,
                            x: 'Percent'
                        }
                    ];
                    _set_NamespaceBind(_Invoice.TaxTotal, 'TaxSubtotal' + n.toString(), TaxSubtotal, arrTS);
                }
            }
        },
        set_TaxSubtotal: function (arr) {

            _TaxSubtotals.push(arr);
        },
        set_LegalMonetaryTotal: function (arr) {
            _set_NamespaceBind(_Invoice, 'LegalMonetaryTotal', LegalMonetaryTotal, arr);
        },
        set_CurrentInvoiceLine: function (ID, qtyMtrunit, lnetlineval) {
            //ID, InvoicedQuantity@unitCode, LineExtensionAmount
            _InvoiceLines.push(copy(_lineTemplate));
            _CurrentInvoiceLine = _InvoiceLines[_InvoiceLines.length - 1];
            if (bindUI(ID.UIRef, ID.UIVal, _CurrentInvoiceLine.ID))
                _CurrentInvoiceLine.Count++;
            //debugger;
            _CurrentInvoiceLine.InvoicedQuantity = _CurrentInvoiceLine.calcInvoicedQuantity(qtyMtrunit.QTY1, qtyMtrunit.MTRUNIT);
            //debugger;
            if (bindUI(lnetlineval.UIRef, lnetlineval.UIVal, _CurrentInvoiceLine.LineExtensionAmount))
                _CurrentInvoiceLine.Count++;
        },
        //[ChargeIndicator, AllowanceChargeReason, MultiplierFactorNumeric, Amount, PerUnitAmount]
        set_CurrentInvoiceLine_AllowanceCharge: function (arr) {
            var MultiplierFactorNumeric = arr && arr.length ? arr[2] : 0;
            //MultiplierFactorNumeric (Procentual value without "%" sign)
            if (MultiplierFactorNumeric) {
                //am discount
                _set_NamespaceBind(_CurrentInvoiceLine, 'AllowanceCharge', AllowanceCharge, arr);
            }
        },
        set_CurrentInvoiceLine_TaxTotal: function (arr) {
            //arr[0] = [{UIRef/UIVal/x: taxamount}], arr[1] ={TaxableAmount,TaxAmount, Percent}, arr[2]=linenum
            //TaxTotal

            _set_NamespaceBind(_CurrentInvoiceLine, 'TaxTotal', TaxTotal, arr[0]);
            //TaxSubtotals
            if (arr[1] && Object.keys(arr[1]).length > 0 && arr[1].constructor === Object) {
                var arrTS = [{
                        UIRef: 'linia ' + arr[2] + ':' + arr[1].Procent.toString() + '%' + ' TaxableAmount',
                        UIVal: arr[1].TaxableAmount,
                        x: 'TaxableAmount'
                    }, {
                        UIRef: 'linia ' + arr[2] + ':' + arr[1].Procent.toString() + '%' + ' TaxAmount',
                        UIVal: arr[1].TaxAmount,
                        x: 'TaxAmount'
                    }, {
                        UIRef: 'linia ' + arr[2] + ':' + arr[1].Procent.toString() + '%' + ' Percent',
                        UIVal: arr[1].Procent,
                        x: 'Percent'
                    }
                ];
                _set_NamespaceBind(_CurrentInvoiceLine.TaxTotal, 'TaxSubtotal', TaxSubtotal, arrTS);
            }
        },
        set_CurrentInvoiceLine_Item: function (arr) {
            _set_NamespaceBind(_CurrentInvoiceLine, 'Item', Item, arr);
        },
        set_CurrentInvoiceLine_Price: function (arr) {
            _set_NamespaceBind(_CurrentInvoiceLine, 'Price', Price, arr);
        },
        get_Invoice: function () {
            return _Invoice;
        },
        get_InvoiceLines: function () {
            return _InvoiceLines;
        },
        get_Messages: function () {
            return _errBindErrors;
        },
        get_XMLMessages: function () {
            return _errXMLErrors;
        },
        get_XML: function () {
            //debugger;
            eachRecursive(_Invoice);
            for (var i = 0; i < _InvoiceLines.length; i++) {
                eachRecursive(_InvoiceLines[i]);
            }

            return parseXML('<DXInvoice xmlns="http://www.doc-process.com/schema/extended/invoice">' + _dom + '</DXInvoice>');
        },
        get_RawDom: function () {
            return '<DXInvoice xmlns="http://www.doc-process.com/schema/extended/invoice">' + _dom + '</DXInvoice>';
        }
    }
}

function createSomeInvoice(dsIte) {
    var trimis = false,
    data_trimitere = X.SQL('select CCCXMLSendDate from mtrdoc where findoc=' + X.SALDOC.FINDOC, null);
    if (data_trimitere) {
        trimis = true;
        X.WARNING('Xml file already sent in ' + data_trimitere);
    }

    if (trimis)
        return;

    //dependente:
    var companyData = X.GETSQLDATASET('select coalesce(afm, null) as PartyIdentification, coalesce(name, null) as PartyName, coalesce(city, null) as CityName, ' +
            'coalesce(zip, null) as PostalZone, coalesce(district, null) as sector, ' +
            'coalesce(BGBULSTAT, null) as CompanyID, coalesce(IDENTITYNUM, null) as CorporateStockAmount, coalesce(NAME3, null) as PayerFinancialAccountID, ' +
            ' coalesce(NAME2, null) as PayerFinancialAccountName ' +
            'from company where isactive = 1 and company=' + X.SYS.COMPANY, null);
    if (!companyData.RECORDCOUNT) {
        X.WARNING('Nu gasesc datele companiei PET FACTORY)...');
        return;
    }

    if (SALDOC.TRDR) {
        var danteData = X.GETSQLDATASET("select concat(coalesce(bgbulstat, null), coalesce(afm, null)) as PartyIdentification, 'DANTE INTERNATIONAL SA' as PartyName, 'BUCURESTI, SECTOR 6' as CityName, " +
                'coalesce(zip, null) as PostalZone, coalesce(address, null) as address, coalesce(JOBTYPETRD, null) as CompanyID, coalesce(remarks, null) remarks ' +
                'from trdr where isactive=1 and company=' + X.SYS.COMPANY + ' and trdr=' + SALDOC.TRDR, null);
        if (!danteData.RECORDCOUNT) {
            X.WARNING('Nu gasesc datele companiei EMAG (DANTE)...');
            return;
        }
    } else {
        X.WARNING('Alegeti clientul...');
    }

    if (SALDOC.TRDBRANCH) {
        var depozitLivrare = X.GETSQLDATASET('select coalesce(CCCS1DXGLN, null) as ID, coalesce(name, null) as Description, coalesce(address, null) as StreetName, ' +
                'coalesce(city, null) as CityName from trdbranch where isactive=1 and trdbranch=' + SALDOC.TRDBRANCH, null);
        if (!depozitLivrare) {
            X.WARNING('Nu gasesc date depozit livrare.');
            return;
        }
    } else {
        X.WARNING('Alegeti filiala...');
        return;
    }

    //first level; create _Invoice var:
    var inv = createInvoice();
    if (SALDOC.FINDOC < 0)
        return;

    //atribuie-i valori din S1 UI:
    inv.set_Invoice({
        UIRef: 'SALDOC.SERIESNUM',
        UIVal: SALDOC.SERIESNUM
    }, {
        UIRef: 'SALDOC.TRNDATE',
        UIVal: checkNull(SALDOC, 'TRNDATE', SALDOC.TRNDATE) ? null : X.FORMATDATE('YYYY-MM-DD', SALDOC.TRNDATE)
    }, {
        UIRef: 'SALDOC.SERIES',
        UIVal: SALDOC.SERIES
    }, {
        UIRef: 'SALDOC.REMARKS',
        UIVal: SALDOC.REMARKS
    }, {
        UIRef: 'SALDOC.SOCURRENCY',
        UIVal: X.SQL('select shortcut from socurrency where isactive=1 and socurrency=' + SALDOC.SOCURRENCY, null)
    }, {
        UIRef: 'dsIte.RECORDCOUNT',
        UIVal: dsIte.RECORDCOUNT
    });

    //second levels

    inv.set_OrderReference([{
                UIRef: 'SALDOC.NUM04',
                UIVal: SALDOC.NUM04,
                x: 'ID'
            }, {
                UIRef: 'SALDOC.DATE01',
                UIVal: checkNull(SALDOC, 'DATE01', SALDOC.DATE01) ? null : X.FORMATDATE('YYYY-MM-DD', SALDOC.DATE01),
                x: 'IssueDate'
            }
        ]);

    inv.set_DespatchDocumentReference([{
                UIRef: 'MTRDOC.CCCDispatcheDoc (Aviz livrare)',
                UIVal: MTRDOC.CCCDispatcheDoc,
                x: 'ID'
            }, {
                UIRef: 'MTRDOC.CCCDispatcheDate (Data aviz)',
                UIVal: checkNull(MTRDOC, 'CCCDispatcheDate', MTRDOC.CCCDispatcheDate) ? null : X.FORMATDATE('YYYY-MM-DD', MTRDOC.CCCDispatcheDate),
                x: 'IssueDate'
            }
        ]);

    //[PartyIdentification, PartyName, StreetName, BuildingNumber, CityName, PostalZone, CompanyID, CorporateStockAmount]
    inv.set_AccountingSupplierParty([{
                UIRef: 'COMPANY.AFM',
                UIVal: companyData.PartyIdentification,
                x: 'Party.PartyIdentification'
            }, {
                UIRef: 'COMPANY.NAME',
                UIVal: companyData.PartyName,
                x: 'Party.PartyName'
            }, {
                UIRef: 'StreetName',
                UIVal: 'Sos. Giurgiului',
                x: 'Party.PostalAddress.StreetName'
            }, {
                UIRef: 'BuildingNumber',
                UIVal: '118',
                x: 'Party.PostalAddress.BuildingNumber'
            }, {
                UIRef: 'COMPANY.CITY, COMPANY.DISTRICT',
                UIVal: companyData.CityName + ' ' + companyData.sector,
                x: 'Party.PostalAddress.CityName'
            }, {
                UIRef: 'COMPANY.ZIP',
                UIVal: companyData.PostalZone,
                x: 'Party.PostalAddress.PostalZone'
            }, {
                UIRef: 'COMPANY.BGBULSTAT',
                UIVal: companyData.CompanyID,
                x: 'Party.PartyLegalEntity.CompanyID'
            }, {
                UIRef: 'COMPANY.IDENTITYNUM',
                UIVal: 1000,
                x: 'Party.PartyLegalEntity.CorporateStockAmount'
            }
        ]);

    //[PartyIdentification, PartyName, StreetName, BuildingNumber, CityName, PostalZone, CompanyID, CorporateStockAmount, CustomerAssignedAccountID]
    //COnventie adresa: "Sos. Virtutii 148, Spatiul E47, Bucuresti Sect 6"
    var address = danteData.address,
    splt = address.split(','),
    StreetName = splt[0].trim(),
    BuildingNumber = splt[1].trim(),
    CityName = splt[2].trim();
    inv.set_AccountingCustomerParty([{
                UIRef: 'COMPANY.AFM',
                UIVal: danteData.PartyIdentification,
                x: 'Party.PartyIdentification'
            }, {
                UIRef: 'COMPANY.NAME',
                UIVal: danteData.PartyName,
                x: 'Party.PartyName'
            }, {
                UIRef: 'StreetName',
                UIVal: StreetName,
                x: 'Party.PostalAddress.StreetName'
            }, {
                UIRef: 'BuildingNumber',
                UIVal: BuildingNumber,
                x: 'Party.PostalAddress.BuildingNumber'
            }, {
                UIRef: 'COMPANY.CITY, COMPANY.DISTRICT',
                UIVal: danteData.CityName,
                x: 'Party.PostalAddress.CityName'
            }, {
                UIRef: 'COMPANY.ZIP',
                UIVal: danteData.PostalZone,
                x: 'Party.PostalAddress.PostalZone'
            }, {
                UIRef: 'COMPANY.BGBULSTAT',
                UIVal: danteData.CompanyID,
                x: 'Party.PartyLegalEntity.CompanyID'
            }
        ]);
    //[ActualDeliveryDate (MTRDOC.DELIVDATE), DeliveryLocation_ID, Description, StreetName, BuildingNumber, CityName]
    //DeliveryLocation_ID (GLN)/ CUSBRANCH.CCCS1DXGLN:
    //DC: 5940477490018
    //DC1: 5940477490162
    //'select CCCS1DXGLN as ID, name as Description, address as StreetName, city as CityName from trdbranch where isactive=1 and trdbranch='+SALDOC.TRDBRANCH
    inv.set_Delivery([{
                UIRef: 'MTRDOC.DELIVDATE',
                UIVal: checkNull(MTRDOC, 'DELIVDATE', MTRDOC.DELIVDATE) ? null : X.FORMATDATE('YYYY-MM-DD', MTRDOC.DELIVDATE),
                x: 'ActualDeliveryDate'
            }, {
                UIRef: 'CUSBRANCH.CCCS1DXGLN',
                UIVal: checkNull(depozitLivrare, 'ID', depozitLivrare.ID),
                x: 'DeliveryLocation.ID'
            }, {
                UIRef: 'CUSBRANCH.NAME',
                UIVal: checkNull(depozitLivrare, 'Description', depozitLivrare.Description),
                x: 'DeliveryLocation.Description'
            }, {
                UIRef: 'CUSBRANCH.ADDRESS',
                UIVal: checkNull(depozitLivrare, 'StreetName', depozitLivrare.StreetName),
                x: 'DeliveryLocation.LocationAddress.StreetName'
            }, {
                UIRef: 'BuildingNumber',
                UIVal: null,
                x: 'DeliveryLocation.LocationAddress.BuildingNumber'
            }, {
                UIRef: 'CUSBRANCH.CITY',
                UIVal: checkNull(depozitLivrare, 'CityName', depozitLivrare.CityName),
                x: 'DeliveryLocation.LocationAddress.CityName'
            }
        ]);
    //[PaymentMeansCode/42, PaymentDueDate/FINPAYTERMS.FINALDATE]
    //debugger;
    inv.set_PaymentMeans([{
                UIRef: 'FINPAYTERMS.FINALDATE',
                UIVal: checkNull(FINPAYTERMS, 'FINALDATE', FINPAYTERMS.FINALDATE) ? null : X.FORMATDATE('YYYY-MM-DD', FINPAYTERMS.FINALDATE),
                x: 'PaymentDueDate'
            }, {
                UIRef: 'COMPANY.NAME3',
                UIVal: checkNull(companyData, 'PayerFinancialAccountID', companyData.PayerFinancialAccountID),
                x: 'PayerFinancialAccount.ID'
            }, {
                UIRef: 'COMPANY.NAME2',
                UIVal: checkNull(companyData, 'PayerFinancialAccountName', companyData.PayerFinancialAccountName),
                x: 'PayerFinancialAccount.FinancialInstitutionBranch.FinancialInstitution.Name'
            }, {
                UIRef: 'IBAN Dante Intl.',
                UIVal: 'RO60RNCB0082B00132506875',
                x: 'PayeeFinancialAccount.ID'
            }, {
                UIRef: 'Banca Dante',
                UIVal: 'BANCA COMERCIALA ROMANA',
                x: 'PayeeFinancialAccount.FinancialInstitutionBranch.FinancialInstitution.Name'
            }

        ]);
    //DurationMeasure
    var sod = X.SQL('SELECT sodata from payment a WHERE A.COMPANY=' + X.SYS.COMPANY + ' AND A.SODTYPE=13 AND A.PAYMENT=' + SALDOC.PAYMENT, null),
    dm = X.EVAL("GETQUERYVALUE('" + sod + "',0,1)");
    inv.set_PaymentTerms([{
                UIRef: 'PAYMENTd.PAYDAYS',
                UIVal: dm,
                x: 'SettlementPeriod.DurationMeasure'
            }
        ]);

    //tax subtotals per vat
    var ds = X.GETSQLDATASET('SELECT ISNULL(BB.PERCNT, 0) perc, ISNULL(AA.LVATVAL, 0) TaxAmount, isnull(AA.LSUBVAL, 0) TaxableAmount ' +
            'FROM VATANAL AA INNER JOIN VAT BB ON (AA.VAT=BB.VAT) WHERE AA.FINDOC=' + SALDOC.FINDOC, null);
    if (ds.RECORDCOUNT > 0) {
        ds.FIRST;
        while (!ds.EOF) {
            var aVat = {};
            aVat.Procent = ds.perc;
            aVat.TaxAmount = ds.TaxAmount;
            aVat.TaxableAmount = ds.TaxableAmount;
            inv.set_TaxSubtotal(aVat);
            ds.NEXT;
        }
    }

    //[TaxAmount/SALDOC.VATAMNT, TaxableAmount/SALDOC.NETAMNT, Percent/19, TaxScheme_ID/7, TaxScheme_Name/[S,B,AC] ]
    //daca exista subtotals le "leaga"
    inv.set_TaxTotal([{
                UIRef: 'SALDOC.VATAMNT',
                UIVal: SALDOC.VATAMNT,
                x: 'TaxAmount'
            }
        ]);

    //[TaxExclusiveAmount/SALDOC.VATAMNT, TaxInclusiveAmount/SALDOC.NETAMNT+SALDOC.VATAMNT]

    inv.set_LegalMonetaryTotal([{
                UiRef: 'SALDOC.NETAMNT',
                UIVal: SALDOC.NETAMNT,
                x: 'TaxExclusiveAmount'
            }, {
                UiRef: 'SALDOC.NETAMNT+SALDOC.VATAMNT',
                UIVal: precise_round(SALDOC.NETAMNT + SALDOC.VATAMNT, 2),
                x: 'TaxInclusiveAmount'
            }
        ]);

    var nrLinie = 0;
    dsIte.FIRST;
    while (!dsIte.EOF) {
        if (!dsIte.MTRL)
            dsIte.NEXT;
        nrLinie++;
        //[ID/ds.LINENUM, InvoicedQuantity/ds.QTY1, LineExtensionAmount=ds.LINEVAL]
        inv.set_CurrentInvoiceLine({
            UIRef: nrLinie + ': Ordinea afisarii dupa salvare, contor',
            UIVal: nrLinie,
            x: 'ID'
        }, {
            QTY1: dsIte.QTY1,
            MTRUNIT: dsIte.MTRUNIT
        }, {
            UIRef: nrLinie + ': dsIte.LNETLINEVAL',
            UIVal: dsIte.LNETLINEVAL,
            x: 'LineExtensionAmount'
        });

        //[ChargeIndicator, AllowanceChargeReason, MultiplierFactorNumeric, Amount, PerUnitAmount]
        //inv.set_CurrentInvoiceLine_AllowanceCharge('false', 'Discount', ds.CCCREDUCERE, );

        inv.set_CurrentInvoiceLine_TaxTotal([[{
                        UIRef: nrLinie + ': dsIte.VATAMNT',
                        UIVal: dsIte.VATAMNT,
                        x: 'TaxAmount',
                    }
                ], {
                    Procent: X.SQL('select percnt from vat where vat=' + dsIte.VAT, null),
                    TaxAmount: dsIte.VATAMNT,
                    TaxableAmount: dsIte.LNETLINEVAL
                }, dsIte.LINENUM]);

        //[Description/ds.MTRL_ITEM_NAME, ID/ds.MTRL_ITEM_CODE1]
        inv.set_CurrentInvoiceLine_Item([{
                    UIRef: nrLinie + ': dsIte.MTRL_ITEM_NAME',
                    UIVal: X.SQL('select name from mtrl where mtrl=' + dsIte.MTRL, null),
                    x: 'Description'
                }, {
                    UIRef: nrLinie + ': dsIte.MTRL_ITEM_CODE1',
                    UIVal: dsIte.MTRL_ITEM_CODE1,
                    x: 'StandardItemIdentification.ID'
                }, {
                    UIRef: nrLinie + ': CCCS1DXTRDRMTRL (Cod client)',
                    UIVal: X.SQL('select code from CCCS1DXTRDRMTRL where mtrl=' + dsIte.MTRL + ' and trdr=' + SALDOC.TRDR + 'and msodtype=51 and tsodtype=13', null),
                    x: 'BuyersItemIdentification.ID'
                }, {
                    UIRef: nrLinie + ': dsIte.MTRL_ITEM_CODE1 (Cod vanzator)',
                    UIVal: dsIte.MTRL_ITEM_CODE,
                    x: 'SellersItemIdentification.ID'
                }
            ]);
        //[PriceAmount/ds.PRICE]
        inv.set_CurrentInvoiceLine_Price([{
                    UIRef: 'dsIte.PRICE',
                    UIVal: dsIte.PRICE,
                    x: 'PriceAmount'
                }
            ]);
        dsIte.NEXT;
    }

    //debugging only
    var debugg_Invoice = debugg_mode.trimiteInv2DanteFromDocProc ? inv.get_Invoice() : null;
    var debugg_linii = debugg_mode.trimiteInv2DanteFromDocProc ? inv.get_InvoiceLines() : null;

    var dom = inv.get_XML();

    if (!dom)
        dom = inv.get_RawDom();

    if (debugg_mode.trimiteInv2DanteFromDocProc)
        X.WARNING(dom);

    //debugger;

    var mess = inv.get_Messages(),
    xmlMess = debugg_mode.trimiteInv2DanteFromDocProc ? inv.get_XMLMessages() : '';
    if (mess || xmlMess) {
        X.WARNING('Erori de rezolvat:\n' + mess + '\n\nXML errors:\n' + xmlMess);
        return;
    }

    if (debugg_mode.trimiteInv2DanteFromDocProc)
        debugger;

    if (findoc_exception && SALDOC.FINDOC == findoc_exception) {
        denumireDocProcess = 'INVOIC_' + SALDOC.SERIESNUM + '_VAT_' +
            X.SQL("select coalesce(afm, 'RO25190857') as PartyIdentification from company where company=" + X.SYS.COMPANY, null) + '.xml';
        var splt = denumireDocProcess.split('_'), //invoic_seriesnum_VAT_RO123456.xml
        apendice = X.INPUTBOX("Modificati denumire fisier xml prin adaugarea unuei particule:", "retrimis");
        if (apendice) {
            denumireDocProcess = splt[0] + '_' + splt[1] + '_' + apendice.toString(apendice) + '_' + splt[2] + '_' + splt[3];
        }
    }
    SaveStringToFile(folderPath + denumireDocProcess, dom, trimis);
    if (!test_mode.trimiteInv2DanteFromDocProc) {
        ftp2DocProc(folderPath + denumireDocProcess, folderPath, trimis);
        X.WARNING('Am trimis XML la DocProcess. Mai multe detalii in fisierul ' + folderPath + 'WinSCP.log');
    } else {
        X.WARNING('XML salvat local, netrimis.');
    }
}

function checkNull(obj, strField, valField) {
    if (obj.ISNULL(strField) == 1)
        return null;
    else
        return valField;
}

//trying to make this obsolete and replaced by sfpt2DocProc
function ftp2DocProc(fisier, logFldr, trimis) {
    if (trimis)
        return;

    asiguraCalea(logFldr);

    try {
        var oShell = new ActiveXObject("Shell.Application"),
        url = 'dx.doc-process.com:2222/',
        usr = 'pet_factory',
        initialDir = '/001G_rFRDUyK4xAMVFfEFelF5WNqhBNujBx38gMmV1fVqIGLNZoQg5f/in/';
        //passphrase = 'PetFactory2021#'.replace('%', '%25').replace('#', '%23').replace(' ', '%20').replace('+', '%2B').replace('/', '%2F').replace('@', '%40').replace(':', '%3A').replace(';', '%3B'),
        passphrase = 'PetFactory2021#',
        priv = '',
        nume_priv = 'Private Key.ppk',
        fingerprint = 'ssh-rsa 2048 BgJCCAEN43vo4+AL1uCvW4MNUioITEQ5+W10ubLAeUs=',
        wd = '',
        sFile = '',
        winscpComm = '',
        vArguments = '',
        vDirectory = "",
        vOperation = "open",
        vShow = 0,
        WshShell = new ActiveXObject("WScript.Shell");
        wd = WshShell.CurrentDirectory;
        priv = wd + '\\' + nume_priv;
        winscpComm = '"open sftp://' + usr + '@' + url +
            ' -hostkey=""' + fingerprint +
            '"" -privatekey=""' + priv +
            '"" -passphrase=""' + passphrase +
            '"" -rawsettings AuthKI=0 AuthGSSAPIKEX=1 GSSAPIFwdTGT=1" ' +
            '"put -delete -resume ' + fisier + ' ' + initialDir + ' " ' +
            '"exit"';
        vArguments = ' /log="' + logFldr + 'WinSCP.log" /loglevel=1 /nointeractiveinput /ini=nul /command ' + winscpComm;
        sFile = wd + '\\WinSCP.com';

        oShell.ShellExecute(sFile, vArguments, vDirectory, vOperation, vShow);
        if (debugg_mode.trimiteInv2DanteFromDocProc)
            X.WARNING(vArguments);
        X.RUNSQL('update mtrdoc set CCCXMLSendDate=GETDATE() where findoc=' + SALDOC.FINDOC, null);
        return true;
    } catch (e) {
        X.WARNING(e.message);
        return false;
    }
}

function sfpt2DocProcess(fisier, logFldr, trimis) {
    if (trimis)
        return;

    asiguraCalea(logFldr);

    var initialDir = '/001G_rFRDUyK4xAMVFfEFelF5WNqhBNujBx38gMmV1fVqIGLNZoQg5f/in/',
    winscpAction = '"put -delete -resume ' + fisier + ' ' + initialDir + ' " ';
    connect2SftpDocProc(logFldr, winscpAction, true);
}

function sfptFromDocProcess(logFldr) {
    var initialDir = '/001G_rFRDUyK4xAMVFfEFelF5WNqhBNujBx38gMmV1fVqIGLNZoQg5f/out/',
    downloadDir = folderPath + 'dante_out\\',
    winscpAction = '"get -resume ' + initialDir + 'order*.xml ' + downloadDir + ' " ';

    asiguraCalea(logFldr);
    asiguraCalea(downloadDir);
    connect2SftpDocProc(logFldr, winscpAction, false);
}

function connect2SftpDocProc(logFldr, winscpAction, toBeMarked) {
    try {
        var oShell = new ActiveXObject("Shell.Application"),
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
        vDirectory = "",
        vOperation = "open",
        vShow = 0,
        WshShell = new ActiveXObject("WScript.Shell");
        wd = WshShell.CurrentDirectory;
        priv = wd + '\\' + nume_priv;
        winscpComm = '"open sftp://' + usr + '@' + url +
            ' -hostkey=""' + fingerprint +
            '"" -privatekey=""' + priv +
            '"" -passphrase=""' + passphrase +
            '"" -rawsettings AuthKI=0 AuthGSSAPIKEX=1 GSSAPIFwdTGT=1" ' +
            winscpAction +
            '"exit"';
        vArguments = ' /log="' + logFldr + 'WinSCP.log" /xmllog="' + logFldr + 'WinSCP.xml" /loglevel=0 /nointeractiveinput /ini=nul /command ' + winscpComm;
        sFile = wd + '\\WinSCP.com';

        oShell.ShellExecute(sFile, vArguments, vDirectory, vOperation, vShow);
        if (debugg_mode.trimiteInv2DanteFromDocProc)
            X.WARNING(vArguments);
        if (toBeMarked)
            markItAsSentDate();
        return true;
    } catch (e) {
        X.WARNING(e.message);
        return false;
    }
}

function markItAsSentDate() {
    X.RUNSQL('update mtrdoc set CCCXMLSendDate=GETDATE() where findoc=' + SALDOC.FINDOC, null);
}

function precise_round(num, decimals) {
    if (isNaN(num)) {
        X.WARNING(num + ' is not a number.');
        return 0;
    }
    var t = Math.pow(10, decimals);
    if (typeof Math.sign === 'undefined') {
        Math.sign = function (x) {
            return x > 0 ? 1 : x < 0 ? -1 : x;
        }
    }
    return (Math.round((num * t) + (decimals > 0 ? 1 : 0) * (Math.sign(num) * (10 / Math.pow(100, decimals)))) / t).toFixed(decimals);
}
