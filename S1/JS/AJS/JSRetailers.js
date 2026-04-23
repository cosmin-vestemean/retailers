//Cod specific S1 - AJS
//// JSRetailers
function processSqlAsDataset(obj) {
  return { data: X.SQL(obj.sqlQuery, null) }
}

function convertDatasetToArray(dataset) {
  var arr = []
  dataset.FIRST
  while (!dataset.EOF) {
    var row = {}
    for (var i = 0; i < dataset.fieldcount; i++) {
      var columnName = dataset.fieldname(i)
      row[columnName] = dataset.fields(i)
    }
    arr.push(row)
    dataset.NEXT
  }
  return arr
}

function processSqlAsDataset1(obj) {
  var ds
  if (!obj.sqlQuery) return { success: false, error: 'No sql query transmited.' }
  try {
    ds = X.GETSQLDATASET(obj.sqlQuery, null)
  } catch (e) {
    return { success: false, error: e.message }
  }
  if (ds.RECORDCOUNT > 0) {
    return {
      success: true,
      data: convertDatasetToArray(ds),
      total: ds.RECORDCOUNT
    }
  } else {
    return {
      success: true,
      message: 'Nothing to process.'
    }
  }
}

/**
 * PHP-like print_r() & var_dump() equivalent for JavaScript Object
 *
 * @author Faisalman <movedpixel@gmail.com>
 * @license http://www.opensource.org/licenses/mit-license.php
 * @link http://gist.github.com/879208
 */
function var_dump(obj, t) {
  // define tab spacing
  var tab = t || ''

  // check if it's array
  var isArr = Object.prototype.toString.call(obj) === '[object Array]' ? true : false

  // use {} for object, [] for array
  var str = isArr ? 'Array\n' + tab + '[\n' : 'Object\n' + tab + '{\n'

  // walk through it's properties
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      var val1 = obj[prop]
      var val2 = ''
      var type = Object.prototype.toString.call(val1)
      switch (type) {
        // recursive if object/array
        case '[object Array]':
        case '[object Object]':
          val2 = var_dump(val1, tab + '\t')
          break

        case '[object String]':
          val2 = "'" + val1 + "'"
          break

        default:
          val2 = val1
      }
      str += tab + '\t' + prop + ' => ' + val2 + ',\n'
    }
  }

  // remove extra comma for last property
  str = str.substring(0, str.length - 2) + '\n' + tab

  return isArr ? str + ']' : str + '}'
}

/**
 * Lookup the S1 sales document (FINDOC) for a given order, then update CCCSFTPXML.
 * Replaces the direct-DB approach used by the old frontend.
 * params: { trdr, orderId }
 * returns: { success, findoc, fincode, trndate } or { success: false, error }
 */
function lookupFindoc(params) {
  var trdr = parseInt(params.trdr) || 0;
  var orderId = params.orderId || '';
  var xmlFilename = params.xmlFilename || '';

  if (!trdr || !orderId) {
    return { success: false, error: 'trdr and orderId are required' };
  }

  try {
    var sql = "SELECT a.FINDOC, a.FINCODE, FORMAT(a.TRNDATE, 'dd.MM.yyyy') TRNDATE" +
      " FROM findoc a INNER JOIN salfprms b ON a.fprms=b.fprms" +
      " WHERE a.sosource=1351 AND a.trdr=:1 AND a.num04=:2" +
      " AND a.TRNDATE > DATEADD(day, -30, GETDATE()) AND b.tfprms=201";
    var ds = X.GETSQLDATASET(sql, trdr, orderId);

    if (ds.RECORDCOUNT === 0) {
      return { success: false, error: 'No matching sales document found' };
    }

    var findoc = parseInt(ds.FINDOC);
    var fincode = ds.FINCODE;
    var trndate = ds.TRNDATE;

    // Update CCCSFTPXML to link the order XML to the found document
    if (xmlFilename) {
      var updateSql = "UPDATE CCCSFTPXML SET FINDOC=:1" +
        " WHERE XMLFILENAME=:2 AND TRDR_RETAILER=:3";
      X.RUNSQL(updateSql, findoc, xmlFilename, trdr);
    }

    return { success: true, findoc: findoc, fincode: fincode, trndate: trndate };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getOrdersData(params) {
  var trdr = parseInt(params.trdr) || 0;
  var daysOlder = parseInt(params.daysOlder) || 30;
  var page = parseInt(params.page) || 1;
  var pageSize = parseInt(params.pageSize) || 25;
  var includeSent = !(params.includeSent === false || params.includeSent === 'false' || params.includeSent === 0 || params.includeSent === '0');
  if (pageSize > 100) pageSize = 100;
  var offset = (page - 1) * pageSize;

  if (!trdr || trdr <= 0) {
    return { success: false, error: 'Invalid retailer ID (trdr) provided.' };
  }

  var fromClause = 'FROM CCCSFTPXML c WHERE c.TRDR_RETAILER = ' + trdr
    + ' AND c.XMLDATE >= DATEADD(day, -' + daysOlder + ', GETDATE())';

  if (!includeSent) {
    fromClause += ' AND ISNULL(c.FINDOC, 0) = 0';
  }

  var total = 0;
  try {
    total = parseInt(X.SQL('SELECT COUNT(*) ' + fromClause, null)) || 0;
  } catch (e) {
    return { success: false, error: 'Count failed: ' + e.message };
  }

  var sql = 'SELECT c.CCCSFTPXML, c.TRDR_RETAILER, c.XMLFILENAME, '
    + "FORMAT(c.XMLDATE, 'yyyy-MM-dd HH:mm:ss') AS XMLDATE, "
    + 'ISNULL(c.FINDOC, 0) AS FINDOC, c.XMLDATA, '
    + "REPLACE(REPLACE(CAST(c.xmldata.query('/Order/ID') AS VARCHAR(MAX)), '<ID>', ''), '</ID>', '') AS OrderId "
    + fromClause
    + ' ORDER BY c.XMLDATE DESC'
    + ' OFFSET ' + offset + ' ROWS FETCH NEXT ' + pageSize + ' ROWS ONLY';

  try {
    var ds = X.GETSQLDATASET(sql, null);
    return {
      success: true,
      data: convertDatasetToArray(ds),
      total: total,
      page: page,
      pageSize: pageSize
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getInvoicesData(params) {
  var trdr = parseInt(params.trdr) || 0;
  var sosource = parseInt(params.sosource) || 1351;
  var fprms = parseInt(params.fprms) || 712;
  var series = parseInt(params.series) || 7121;
  var daysOlder = parseInt(params.daysOlder) || 7;
  var page = parseInt(params.page) || 1;
  var pageSize = parseInt(params.pageSize) || 25;
  if (pageSize > 100) pageSize = 100;
  var offset = (page - 1) * pageSize;

  if (!trdr || trdr <= 0) {
    return { success: false, error: 'Invalid retailer ID (trdr) provided.' };
  }

  var fromClause = 'FROM findoc f INNER JOIN mtrdoc m ON f.findoc = m.findoc '
    + 'WHERE f.sosource = ' + sosource
    + ' AND f.fprms = ' + fprms
    + ' AND f.series = ' + series
    + ' AND f.trdr = ' + trdr
    + ' AND f.iscancel = 0'
    + ' AND f.trndate >= DATEADD(day, -' + daysOlder + ', GETDATE())';

  var total = 0;
  try {
    total = parseInt(X.SQL('SELECT COUNT(*) ' + fromClause, null)) || 0;
  } catch (e) {
    return { success: false, error: 'Count failed: ' + e.message };
  }

  var sql = 'SELECT f.findoc, f.fincode, '
    + "FORMAT(f.trndate, 'yyyy-MM-dd') AS trndate, "
    + 'f.sumamnt, m.CCCXMLSendDate, m.CCCXMLFile '
    + fromClause
    + ' ORDER BY f.trndate DESC, f.findoc DESC'
    + ' OFFSET ' + offset + ' ROWS FETCH NEXT ' + pageSize + ' ROWS ONLY';

  try {
    var ds = X.GETSQLDATASET(sql, null);
    return {
      success: true,
      data: convertDatasetToArray(ds),
      total: total,
      page: page,
      pageSize: pageSize
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function sendEmail(params) {
  var strTO = params.to || ''
  var strCC = params.cc || ''
  var strBCC = params.bcc || ''
  var strSubject = params.subject || ''
  var strBodyPlain = params.bodyPlain || ''
  var strBodyHTML = params.bodyHTML || ''
  var strAttachment = params.attachment || ''
  var strFromName = params.fromName || ''
  var eMailAccount = 200;
  //if there is no subject, to or body, return false
  if (!strSubject || !strTO || (!strBodyPlain && !strBodyHTML)) {
    return { success: false, message: 'Missing required parameters' }
  }
  return X.EXEC(
    'CODE:SysRequest.doSendMail3',
    strTO,
    strCC,
    strBCC,
    strSubject,
    strBodyPlain,
    strBodyHTML,
    strAttachment,
    strFromName,
    eMailAccount
  )
}

function validatePassword(params) {
  var stringToValidate = params.stringToValidate || ''
  var encryptedPassword = params.encryptedPassword || ''
  if (!stringToValidate || !encryptedPassword) {
    return { success: false, valid: false, message: 'Missing required parameters' }
  }
  try {
    var result = X.PASSWORDVALIDATE(stringToValidate, encryptedPassword)
    return { success: true, valid: result }
  } catch (e) {
    return { success: false, valid: false, message: e.message }
  }
}

function getOrdersLog(params) {
  var trdr = parseInt(params.trdr) || 0;
  var orderid = (params.orderid || '').toString().substring(0, 100);
  var operation = (params.operation || '').toString().substring(0, 50);
  var level = (params.level || '').toString().substring(0, 10);
  var dateFrom = (params.dateFrom || '').toString().substring(0, 10);
  var dateTo = (params.dateTo || '').toString().substring(0, 10);
  var page = parseInt(params.page) || 1;
  var pageSize = parseInt(params.pageSize) || 25;
  if (pageSize > 100) pageSize = 100;
  if (page < 1) page = 1;
  var offset = (page - 1) * pageSize;

  // Append time to dateTo so it covers the full day
  if (dateTo) {
    dateTo = dateTo + ' 23:59:59';
  }

  // 5 fixed positional params — when empty, the (:N = '' OR ...) pattern skips the filter
  // :1 = orderid, :2 = operation, :3 = level, :4 = dateFrom, :5 = dateTo
  // trdr is a safe parseInt result, inlined directly
  var where = 'WHERE 1=1';
  if (trdr === -1) {
    where += ' AND TRDR_RETAILER = -1';
  } else if (trdr > 0) {
    where += ' AND TRDR_RETAILER = ' + trdr;
  }
  where += " AND (:1 = '' OR ORDERID = :1)";
  where += " AND (:2 = '' OR OPERATION = :2)";
  where += " AND (:3 = '' OR LEVEL = :3)";
  where += " AND (:4 = '' OR MESSAGEDATE >= :4)";
  where += " AND (:5 = '' OR MESSAGEDATE <= :5)";

  // Count total — use GETSQLDATASET because X.SQL does not accept multiple params (throws EVariantBadIndexError)
  var countSql = 'SELECT COUNT(*) AS CNT FROM CCCORDERSLOG ' + where;
  var total = 0;
  try {
    var dsCount = X.GETSQLDATASET(countSql, orderid, operation, level, dateFrom, dateTo);
    if (dsCount.RECORDCOUNT > 0) {
      total = parseInt(dsCount.CNT) || 0;
    }
  } catch (e) {
    return { success: false, error: 'Count failed: ' + e.message };
  }

  // Fetch page — offset/pageSize are safe integers
  var sql = 'SELECT CCCORDERSLOG, TRDR_RETAILER, '
    + "(SELECT NAME FROM TRDR WHERE TRDR = CCCORDERSLOG.TRDR_RETAILER) AS RETAILERNAME, "
    + 'OPERATION, LEVEL, '
    + "FORMAT(MESSAGEDATE, 'yyyy-MM-dd HH:mm:ss') AS MESSAGEDATE, "
    + 'MESSAGETEXT '
    + 'FROM CCCORDERSLOG ' + where
    + ' ORDER BY CCCORDERSLOG DESC'
    + ' OFFSET ' + offset + ' ROWS FETCH NEXT ' + pageSize + ' ROWS ONLY';

  try {
    var ds = X.GETSQLDATASET(sql, orderid, operation, level, dateFrom, dateTo);
    if (ds.RECORDCOUNT > 0) {
      return {
        success: true,
        data: convertDatasetToArray(ds),
        total: total,
        page: page,
        pageSize: pageSize
      };
    } else {
      return { success: true, data: [], total: total, page: page, pageSize: pageSize };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function createOrderLog(params) {
  var trdrClient = parseInt(params.TRDR_CLIENT) || 1;
  var trdrRetailer = parseInt(params.TRDR_RETAILER) || -1;
  var orderid = (params.ORDERID || '').toString().substring(0, 100);
  var cccsftpxml = parseInt(params.CCCSFTPXML) || -1;
  var operation = (params.OPERATION || '').toString().substring(0, 50);
  var level = (params.LEVEL || 'info').toString().substring(0, 10);
  var messagetext = (params.MESSAGETEXT || '').toString();

  var sql = 'INSERT INTO CCCORDERSLOG (TRDR_CLIENT, TRDR_RETAILER, ORDERID, CCCSFTPXML, OPERATION, LEVEL, MESSAGETEXT) '
    + 'VALUES (:1, :2, :3, :4, :5, :6, :7)';

  try {
    X.RUNSQL(sql, trdrClient, trdrRetailer, orderid, cccsftpxml, operation, level, messagetext);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function cleanupOrdersLog(params) {
  var days = parseInt(params.days) || 30;
  if (days < 1) days = 1;
  var sql = 'DELETE FROM CCCORDERSLOG WHERE MESSAGEDATE < DATEADD(day, -' + days + ', GETDATE())';
  try {
    X.RUNSQL(sql, null);
    var countSql = 'SELECT @@ROWCOUNT AS DELETED';
    var deleted = parseInt(X.SQL(countSql, null)) || 0;
    return { success: true, deleted: deleted, days: days };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * One-time cleanup: strip HTML formatting from CCCORDERSLOG.MESSAGETEXT
 * Removes: <pre><code>...</code></pre>, <span class="tag is-*">...</span>
 * Also back-fills OPERATION from ORDERID where possible.
 * Run manually from AJS, then delete.
 */
function cleanupOrdersLogHtml() {
  var stats = { preCode: 0, span: 0, operation: 0, errors: [] };

  // 1. Strip <pre><code>...</code></pre>
  try {
    X.RUNSQL(
      "UPDATE CCCORDERSLOG SET MESSAGETEXT = REPLACE(REPLACE(MESSAGETEXT, '<pre><code>', ''), '</code></pre>', '') WHERE MESSAGETEXT LIKE '%<pre><code>%'",
      null
    );
    stats.preCode = parseInt(X.SQL("SELECT @@ROWCOUNT", null)) || 0;
  } catch (e) {
    stats.errors.push('preCode: ' + e.message);
  }

  // 2. Strip <span class="tag is-*">...</span> (all variants)
  //    SQL Server doesn't have regex replace, so we loop until none remain
  var maxIter = 20;
  var iter = 0;
  while (iter < maxIter) {
    iter++;
    try {
      var remaining = parseInt(X.SQL("SELECT COUNT(*) FROM CCCORDERSLOG WHERE MESSAGETEXT LIKE '%<span class=%'", null)) || 0;
      if (remaining === 0) break;
      // Remove opening tags: <span class="tag is-primary">, <span class="tag is-success">, etc.
      X.RUNSQL(
        "UPDATE CCCORDERSLOG SET MESSAGETEXT = REPLACE(MESSAGETEXT, '<span class=\"tag is-primary\">', '') WHERE MESSAGETEXT LIKE '%<span class=\"tag is-primary\">%'",
        null
      );
      X.RUNSQL(
        "UPDATE CCCORDERSLOG SET MESSAGETEXT = REPLACE(MESSAGETEXT, '<span class=\"tag is-success\">', '') WHERE MESSAGETEXT LIKE '%<span class=\"tag is-success\">%'",
        null
      );
      X.RUNSQL(
        "UPDATE CCCORDERSLOG SET MESSAGETEXT = REPLACE(MESSAGETEXT, '<span class=\"tag is-danger\">', '') WHERE MESSAGETEXT LIKE '%<span class=\"tag is-danger\">%'",
        null
      );
      X.RUNSQL(
        "UPDATE CCCORDERSLOG SET MESSAGETEXT = REPLACE(MESSAGETEXT, '<span class=\"tag is-warning\">', '') WHERE MESSAGETEXT LIKE '%<span class=\"tag is-warning\">%'",
        null
      );
      X.RUNSQL(
        "UPDATE CCCORDERSLOG SET MESSAGETEXT = REPLACE(MESSAGETEXT, '<span class=\"tag is-info\">', '') WHERE MESSAGETEXT LIKE '%<span class=\"tag is-info\">%'",
        null
      );
      // Remove closing </span>
      X.RUNSQL(
        "UPDATE CCCORDERSLOG SET MESSAGETEXT = REPLACE(MESSAGETEXT, '</span>', '') WHERE MESSAGETEXT LIKE '%</span>%'",
        null
      );
    } catch (e) {
      stats.errors.push('span iter ' + iter + ': ' + e.message);
      break;
    }
  }
  stats.span = iter;

  // 3. Back-fill OPERATION from ORDERID pattern where OPERATION is empty
  try {
    X.RUNSQL("UPDATE CCCORDERSLOG SET OPERATION = ORDERID WHERE ISNULL(OPERATION, '') = '' AND ORDERID IN ('downloadXml','storeXmlInDB','createOrders','processOrder','createDocument','mappingError','emailNotify','system')", null);
    stats.operation = parseInt(X.SQL("SELECT @@ROWCOUNT", null)) || 0;
  } catch (e) {
    stats.errors.push('operation: ' + e.message);
  }

  // 4. Verify
  var remainingHtml = parseInt(X.SQL("SELECT COUNT(*) FROM CCCORDERSLOG WHERE MESSAGETEXT LIKE '%<span class=%' OR MESSAGETEXT LIKE '%<pre><code>%'", null)) || 0;
  stats.remainingHtml = remainingHtml;
  stats.emptyOp = parseInt(X.SQL("SELECT COUNT(*) FROM CCCORDERSLOG WHERE ISNULL(OPERATION, '') = ''", null)) || 0;

  return stats;
}

// =====================================================
// Config / Mapping endpoints (replace direct DB access)
// =====================================================

function getSftpConfig(params) {
  var trdr = parseInt(params.TRDR_RETAILER) || 0;
  if (!trdr) return { success: false, error: 'Missing TRDR_RETAILER' };

  var sql = 'SELECT CCCSFTP, TRDR_RETAILER, URL, PORT, USERNAME, PASSPHRASE, '
    + 'INITIALDIRIN, INITIALDIROUT, FINGERPRINT, PRIVATEKEY, EDIPROVIDER '
    + 'FROM CCCSFTP WHERE TRDR_RETAILER = :1';
  try {
    var ds = X.GETSQLDATASET(sql, trdr);
    return { success: true, data: convertDatasetToArray(ds), total: ds.RECORDCOUNT };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function updateSftpConfig(params) {
  var trdr = parseInt(params.TRDR_RETAILER) || 0;
  if (!trdr) return { success: false, error: 'Missing TRDR_RETAILER' };

  var sql = 'UPDATE CCCSFTP SET '
    + 'URL = :1, PORT = :2, USERNAME = :3, PASSPHRASE = :4, '
    + 'INITIALDIRIN = :5, INITIALDIROUT = :6, FINGERPRINT = :7, '
    + 'PRIVATEKEY = :8, EDIPROVIDER = :9 '
    + 'WHERE TRDR_RETAILER = :10';

  try {
    X.RUNSQL(sql,
      (params.URL || '').toString(),
      parseInt(params.PORT) || 22,
      (params.USERNAME || '').toString(),
      (params.PASSPHRASE || '').toString(),
      (params.INITIALDIRIN || '').toString(),
      (params.INITIALDIROUT || '').toString(),
      (params.FINGERPRINT || '').toString(),
      (params.PRIVATEKEY || '').toString(),
      (params.EDIPROVIDER || '').toString(),
      trdr
    );
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getRetailersClients(params) {
  var trdrClient = parseInt(params.TRDR_CLIENT) || 0;
  var sql = 'SELECT CCCRETAILERSCLIENTS, TRDR_CLIENT, WSURL, WSUSER, WSPASS, COMPANY, BRANCH '
    + 'FROM CCCRETAILERSCLIENTS';
  if (trdrClient > 0) {
    sql += ' WHERE TRDR_CLIENT = :1';
  }
  try {
    var ds = trdrClient > 0
      ? X.GETSQLDATASET(sql, trdrClient)
      : X.GETSQLDATASET(sql, null);
    return { success: true, data: convertDatasetToArray(ds), total: ds.RECORDCOUNT };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getDocumentMappings(params) {
  var trdr = (parseInt(params.TRDR_RETAILER) || 0).toString();
  var sosource = (parseInt(params.SOSOURCE) || 0).toString();
  var fprms = (parseInt(params.FPRMS) || 0).toString();
  var series = (parseInt(params.SERIES) || 0).toString();

  var sql = 'SELECT CCCDOCUMENTES1MAPPINGS, TRDR_RETAILER, TRDR_CLIENT, SOSOURCE, FPRMS, SERIES, '
    + 'INITIALDIRIN, INITIALDIROUT '
    + 'FROM CCCDOCUMENTES1MAPPINGS WHERE '
    + '(:1 = \'0\' OR TRDR_RETAILER = :1) AND '
    + '(:2 = \'0\' OR SOSOURCE = :2) AND '
    + '(:3 = \'0\' OR FPRMS = :3) AND '
    + '(:4 = \'0\' OR SERIES = :4)';
  try {
    var ds = X.GETSQLDATASET(sql, trdr, sosource, fprms, series);
    return { success: true, data: convertDatasetToArray(ds), total: ds.RECORDCOUNT };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function createDocumentMapping(params) {
  var sql = 'INSERT INTO CCCDOCUMENTES1MAPPINGS (TRDR_RETAILER, TRDR_CLIENT, SOSOURCE, FPRMS, SERIES, INITIALDIRIN, INITIALDIROUT) '
    + 'VALUES (:1, :2, :3, :4, :5, :6, :7)';
  try {
    X.RUNSQL(sql,
      parseInt(params.TRDR_RETAILER) || 0,
      parseInt(params.TRDR_CLIENT) || 1,
      parseInt(params.SOSOURCE) || 0,
      parseInt(params.FPRMS) || 0,
      parseInt(params.SERIES) || 0,
      (params.INITIALDIRIN || '').toString(),
      (params.INITIALDIROUT || '').toString()
    );
    var newId = parseInt(X.SQL('SELECT SCOPE_IDENTITY()', null)) || 0;
    return { success: true, id: newId };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function removeDocumentMapping(params) {
  var id = parseInt(params.id) || 0;
  if (!id) return { success: false, error: 'Missing id' };
  try {
    X.RUNSQL('DELETE FROM CCCDOCUMENTES1MAPPINGS WHERE CCCDOCUMENTES1MAPPINGS = :1', id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getXmlMappings(params) {
  var docId = parseInt(params.CCCDOCUMENTES1MAPPINGS) || 0;
  var sql = 'SELECT CCCXMLS1MAPPINGS, XMLNODE, MANDATORY, S1TABLE1, S1FIELD1, S1TABLE2, S1FIELD2, '
    + 'SQL, OBSERVATII, XMLORDER, CCCDOCUMENTES1MAPPINGS '
    + 'FROM CCCXMLS1MAPPINGS';
  if (docId > 0) {
    sql += ' WHERE CCCDOCUMENTES1MAPPINGS = :1';
  }
  sql += ' ORDER BY XMLORDER';
  try {
    var ds = docId > 0
      ? X.GETSQLDATASET(sql, docId)
      : X.GETSQLDATASET(sql, null);
    return { success: true, data: convertDatasetToArray(ds), total: ds.RECORDCOUNT };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function createXmlMapping(params) {
  var sql = 'INSERT INTO CCCXMLS1MAPPINGS (XMLNODE, MANDATORY, S1TABLE1, S1FIELD1, S1TABLE2, S1FIELD2, SQL, OBSERVATII, XMLORDER, CCCDOCUMENTES1MAPPINGS) '
    + 'VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9, :10)';
  try {
    X.RUNSQL(sql,
      (params.XMLNODE || '').toString(),
      parseInt(params.MANDATORY) || 0,
      (params.S1TABLE1 || '').toString(),
      (params.S1FIELD1 || '').toString(),
      (params.S1TABLE2 || '').toString(),
      (params.S1FIELD2 || '').toString(),
      (params.SQL || '').toString(),
      (params.OBSERVATII || '').toString(),
      parseFloat(params.XMLORDER) || 0,
      parseInt(params.CCCDOCUMENTES1MAPPINGS) || 0
    );
    var newId = parseInt(X.SQL('SELECT SCOPE_IDENTITY()', null)) || 0;
    return { success: true, id: newId };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function removeXmlMappings(params) {
  var docId = parseInt(params.CCCDOCUMENTES1MAPPINGS) || 0;
  var singleId = parseInt(params.id) || 0;
  if (!docId && !singleId) return { success: false, error: 'Missing id or CCCDOCUMENTES1MAPPINGS' };
  try {
    if (singleId) {
      X.RUNSQL('DELETE FROM CCCXMLS1MAPPINGS WHERE CCCXMLS1MAPPINGS = :1', singleId);
    } else {
      X.RUNSQL('DELETE FROM CCCXMLS1MAPPINGS WHERE CCCDOCUMENTES1MAPPINGS = :1', docId);
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// =====================================================
// CCCSFTPXML endpoints (replace direct DB access)
// =====================================================

function getSftpXml(params) {
  var trdr = (parseInt(params.TRDR_RETAILER) || 0).toString();
  var filename = (params.XMLFILENAME || '').toString();
  var limit = parseInt(params.$limit) || 50;
  var sortDir = (params.$sortDir || 'DESC').toString().toUpperCase();
  if (sortDir !== 'ASC') sortDir = 'DESC';

  var sql = 'SELECT TOP ' + limit + ' CCCSFTPXML, TRDR_CLIENT, TRDR_RETAILER, '
    + 'XMLDATA, JSONDATA, XMLDATE, XMLSTATUS, XMLERROR, FINDOC, XMLFILENAME '
    + 'FROM CCCSFTPXML WHERE '
    + '(:1 = \'0\' OR TRDR_RETAILER = :1) AND '
    + '(:2 = \'\' OR XMLFILENAME = :2) '
    + 'ORDER BY XMLDATE ' + sortDir;
  try {
    var ds = X.GETSQLDATASET(sql, trdr, filename);
    return { success: true, data: convertDatasetToArray(ds), total: ds.RECORDCOUNT };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function createSftpXml(params) {
  var sql = 'INSERT INTO CCCSFTPXML (TRDR_CLIENT, TRDR_RETAILER, XMLDATA, JSONDATA, XMLDATE, XMLSTATUS, XMLERROR, XMLFILENAME) '
    + 'VALUES (:1, :2, :3, :4, :5, :6, :7, :8)';
  try {
    X.RUNSQL(sql,
      parseInt(params.TRDR_CLIENT) || 1,
      parseInt(params.TRDR_RETAILER) || 0,
      (params.XMLDATA || '').toString(),
      (params.JSONDATA || '').toString(),
      (params.XMLDATE || '').toString(),
      (params.XMLSTATUS || 'NEW').toString(),
      (params.XMLERROR || '').toString(),
      (params.XMLFILENAME || '').toString()
    );
    var newId = parseInt(X.SQL('SELECT SCOPE_IDENTITY()', null)) || 0;
    // Return the inserted row so callers get the full record
    var row = {};
    if (newId > 0) {
      var ds2 = X.GETSQLDATASET('SELECT CCCSFTPXML, TRDR_CLIENT, TRDR_RETAILER, XMLDATA, JSONDATA, XMLDATE, XMLSTATUS, XMLERROR, FINDOC, XMLFILENAME FROM CCCSFTPXML WHERE CCCSFTPXML = :1', newId);
      var rows = convertDatasetToArray(ds2);
      if (rows.length > 0) row = rows[0];
    }
    return { success: true, id: newId, data: row };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function patchSftpXml(params) {
  var findoc = parseInt(params.FINDOC);
  var filename = (params.XMLFILENAME || '').toString();
  var trdr = (parseInt(params.TRDR_RETAILER) || 0).toString();
  var id = (parseInt(params.id) || 0).toString();

  if (isNaN(findoc)) return { success: false, error: 'Missing FINDOC' };
  if (!filename && !id) return { success: false, error: 'Missing XMLFILENAME or id' };

  var sql = 'UPDATE CCCSFTPXML SET FINDOC = :1 WHERE '
    + '(:2 = \'0\' OR CCCSFTPXML = :2) AND '
    + '(:3 = \'\' OR XMLFILENAME = :3) AND '
    + '(:4 = \'0\' OR TRDR_RETAILER = :4)';
  try {
    X.RUNSQL(sql, findoc, id, filename, trdr);
    // Return patched rows for callers that use patchRes[0].CCCSFTPXML
    var selectSql = 'SELECT CCCSFTPXML, TRDR_CLIENT, TRDR_RETAILER, XMLDATA, JSONDATA, XMLDATE, XMLSTATUS, XMLERROR, FINDOC, XMLFILENAME '
      + 'FROM CCCSFTPXML WHERE '
      + '(:1 = \'0\' OR CCCSFTPXML = :1) AND '
      + '(:2 = \'\' OR XMLFILENAME = :2) AND '
      + '(:3 = \'0\' OR TRDR_RETAILER = :3)';
    var ds = X.GETSQLDATASET(selectSql, id, filename, trdr);
    return { success: true, data: convertDatasetToArray(ds), total: ds.RECORDCOUNT };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function removeSftpXml(params) {
  var id = parseInt(params.id) || 0;
  if (!id) return { success: false, error: 'Missing id' };
  try {
    X.RUNSQL('DELETE FROM CCCSFTPXML WHERE CCCSFTPXML = :1', id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// =====================================================
// CCCAPERAK endpoints (replace direct DB access)
// =====================================================

function getAperaks(params) {
  var trdr = (parseInt(params.TRDR_RETAILER) || 0).toString();
  var trdrClient = (parseInt(params.TRDR_CLIENT) || 0).toString();
  var findoc = (parseInt(params.FINDOC) || 0).toString();
  var limit = parseInt(params.$limit) || 50;

  var sql = 'SELECT TOP ' + limit + ' CCCAPERAK, TRDR_RETAILER, TRDR_CLIENT, FINDOC, '
    + 'XMLFILENAME, XMLSENTDATE, MESSAGEDATE, MESSAGETIME, MESSAGEORIGIN, '
    + 'DOCUMENTREFERENCE, DOCUMENTUID, SUPPLIERRECEIVERCODE, DOCUMENTRESPONSE, DOCUMENTDETAIL '
    + 'FROM CCCAPERAK WHERE '
    + '(:1 = \'0\' OR TRDR_RETAILER = :1) AND '
    + '(:2 = \'0\' OR TRDR_CLIENT = :2) AND '
    + '(:3 = \'0\' OR FINDOC = :3) '
    + 'ORDER BY CCCAPERAK DESC';
  try {
    var ds = X.GETSQLDATASET(sql, trdr, trdrClient, findoc);
    return { success: true, data: convertDatasetToArray(ds), total: ds.RECORDCOUNT };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function createAperak(params) {
  var sql = 'INSERT INTO CCCAPERAK (TRDR_RETAILER, TRDR_CLIENT, FINDOC, XMLFILENAME, XMLSENTDATE, '
    + 'MESSAGEDATE, MESSAGETIME, MESSAGEORIGIN, DOCUMENTREFERENCE, DOCUMENTUID, '
    + 'SUPPLIERRECEIVERCODE, DOCUMENTRESPONSE, DOCUMENTDETAIL) '
    + 'VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9, :10, :11, :12, :13)';
  try {
    X.RUNSQL(sql,
      parseInt(params.TRDR_RETAILER) || 0,
      parseInt(params.TRDR_CLIENT) || 1,
      parseInt(params.FINDOC) || 0,
      (params.XMLFILENAME || '').toString(),
      (params.XMLSENTDATE || '').toString(),
      (params.MESSAGEDATE || '').toString(),
      (params.MESSAGETIME || '').toString(),
      (params.MESSAGEORIGIN || '').toString(),
      (params.DOCUMENTREFERENCE || '').toString(),
      (params.DOCUMENTUID || '').toString(),
      (params.SUPPLIERRECEIVERCODE || '').toString(),
      (params.DOCUMENTRESPONSE || '').toString(),
      (params.DOCUMENTDETAIL || '').toString()
    );
    var newId = parseInt(X.SQL('SELECT SCOPE_IDENTITY()', null)) || 0;
    return { success: true, CCCAPERAK: newId };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
