lib.include('eMagMarketplace')

function EXECCOMMAND(cmd) {
  if (cmd == 20240618) {
    //empty CCCEMAGMARKETUI if it has rows
    if (CCCEMAGMARKETUI.RecordCount > 0) {
      CCCEMAGMARKETUI.first
      while (!CCCEMAGMARKETUI.eof) {
        CCCEMAGMARKETUI.Delete
      }
    }
    //get all invoices from findoc where sosource=1351 and series=7033 and salesman=170 and fiscprd=2024 and period=6 and isnull(ccctrimis, 0) = 0
    var dsEmagInvoices = X.GETSQLDATASET(
      'select FINDOC, FINCODE, TRNDATE from findoc where sosource=1351 and series=7033 and salesman=170 and fiscprd=year(getdate()) and period=month(getdate()) and isnull(ccctrimis, 0) = 0 order by TRNDATE desc, FINDOC desc',
      null
    )
    dsEmagInvoices.first
    while (!dsEmagInvoices.eof) {
      CCCEMAGMARKETUI.Append
      CCCEMAGMARKETUI.FINDOC = dsEmagInvoices.FINDOC
      CCCEMAGMARKETUI.FINCODE = dsEmagInvoices.FINCODE
      CCCEMAGMARKETUI.TRNDATE = dsEmagInvoices.TRNDATE
      CCCEMAGMARKETUI.Post
      dsEmagInvoices.next
    }
  }

  if (cmd == 202406181) {
    //loop through CCCEMAGMARKETUI and create an array of FINDOC from selected rows (SELECT field)
    var selectedFINDOCs = []
    CCCEMAGMARKETUI.first
    while (!CCCEMAGMARKETUI.eof) {
      if (CCCEMAGMARKETUI.SELECT) {
        selectedFINDOCs.push(CCCEMAGMARKETUI.FINDOC)
      }
      CCCEMAGMARKETUI.next
    }

    if (selectedFINDOCs.length == 0) {
      alert('No invoices selected')
      return
    } else {
      processEmagMarketplace(selectedFINDOCs)
    }
  }

  if (cmd == 202406182) {
    //open file from dir c:\S1Print\FTP\Online\; are tipul txt si numele fisierului este in formatul: emagAPIlog2024-06-18
    //split filename by emagAPIlog and search for split[1] = today date

    var today = new Date().toISOString().slice(0, 10)
    var filename = 'emagAPIlog' + today
    var path = 'c:\\S1Print\\FTP\\Online\\' + filename + '.txt'
    try {
      var file = new ActiveXObject('Scripting.FileSystemObject').GetFile(path)
      var shell = new ActiveXObject('WScript.Shell')
      shell.Run
    } catch (e) {
      X.WARNING('File not found')
    }
  }

  if (cmd == 202406183) {
    //select all= !select all
    CCCEMAGMARKETUI.first
    while (!CCCEMAGMARKETUI.eof) {
      CCCEMAGMARKETUI.SELECT = !CCCEMAGMARKETUI.SELECT
      CCCEMAGMARKETUI.next
    }
  }

  if (cmd == 20240625) {
    //mark selected as trimis
    var selectedFINDOC = X.GETPROPERTY('GRIDSELECTED:Grid|FINDOC')
    var arrFindocs = selectedFINDOC.split('\r\n')
    if (arrFindocs.length > 0)
      var ans = X.ASK('eMag marketplace', 'Confirmati marcarea ca trimis a facturilor selectate?')
    if (ans == 7 || ans == 2) X.EXCEPTION('Cancelled by user')
    for (var i = 0; i < arrFindocs.length -1; i++) {
      X.RUNSQL('update findoc set ccctrimis=1 where findoc=' + arrFindocs[i])
    }
  }
}
