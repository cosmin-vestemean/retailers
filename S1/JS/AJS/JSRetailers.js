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
    + 'ISNULL(c.FINDOC, 0) AS FINDOC, c.XMLSTATUS, c.XMLERROR, c.XMLDATA, '
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
  var excludeResolvedDuplicateGuard = params.excludeResolvedDuplicateGuard === true || params.excludeResolvedDuplicateGuard === 'true';
  var excludeHeartbeat = params.excludeHeartbeat === true || params.excludeHeartbeat === 'true';
  if (pageSize > 100) pageSize = 100;
  if (page < 1) page = 1;
  var offset = (page - 1) * pageSize;

  // Append time to dateTo so it covers the full day
  if (dateTo) {
    dateTo = dateTo + ' 23:59:59';
  }

  // Build WHERE dynamically. Each :N placeholder must appear EXACTLY once —
  // S1 binds parameters positionally per occurrence, so repeating :1 causes
  // "Variant or safe array index out of bounds".
  // trdr is a safe parseInt result, inlined directly.
  var where = 'WHERE 1=1';
  if (trdr === -1) {
    where += ' AND TRDR_RETAILER = -1';
  } else if (trdr > 0) {
    where += ' AND TRDR_RETAILER = ' + trdr;
  }
  var sqlParams = [];
  if (orderid) {
    where += ' AND ORDERID = :' + (sqlParams.length + 1);
    sqlParams.push(orderid);
  }
  if (operation) {
    where += ' AND OPERATION = :' + (sqlParams.length + 1);
    sqlParams.push(operation);
  }
  if (level) {
    where += ' AND [LEVEL] = :' + (sqlParams.length + 1);
    sqlParams.push(level);
  }
  if (excludeResolvedDuplicateGuard && operation !== 'duplicateGuard') {
    where += " AND NOT (OPERATION = 'duplicateGuard' AND [LEVEL] = 'warn')";
  }
  if (excludeHeartbeat && operation !== 'downloadXml' && operation !== 'createOrders' && operation !== 'system') {
    where += " AND NOT ([LEVEL] = 'info' AND ("
           + "OPERATION IN ('downloadXml', 'createOrders', 'system')"
           + " OR ISNULL(OPERATION, '') = ''"
           + " OR CAST(MESSAGETEXT AS VARCHAR(MAX)) LIKE '%No files on server%'"
           + " OR CAST(MESSAGETEXT AS VARCHAR(MAX)) LIKE '%No files in server%'"
           + " OR CAST(MESSAGETEXT AS VARCHAR(MAX)) LIKE '%No files inserted%'"
           + " OR CAST(MESSAGETEXT AS VARCHAR(MAX)) LIKE '%No files to store%'"
           + " OR CAST(MESSAGETEXT AS VARCHAR(MAX)) LIKE '%No orders to create%'"
           + "))";
  }
  if (dateFrom) {
    where += ' AND MESSAGEDATE >= :' + (sqlParams.length + 1);
    sqlParams.push(dateFrom);
  }
  if (dateTo) {
    where += ' AND MESSAGEDATE <= :' + (sqlParams.length + 1);
    sqlParams.push(dateTo);
  }

  // Count total — use GETSQLDATASET because X.SQL does not accept multiple params
  var countSql = 'SELECT COUNT(*) AS CNT FROM CCCORDERSLOG ' + where;
  var total = 0;
  try {
    var dsCount;
    if (sqlParams.length === 0) {
      dsCount = X.GETSQLDATASET(countSql, null);
    } else if (sqlParams.length === 1) {
      dsCount = X.GETSQLDATASET(countSql, sqlParams[0]);
    } else if (sqlParams.length === 2) {
      dsCount = X.GETSQLDATASET(countSql, sqlParams[0], sqlParams[1]);
    } else if (sqlParams.length === 3) {
      dsCount = X.GETSQLDATASET(countSql, sqlParams[0], sqlParams[1], sqlParams[2]);
    } else if (sqlParams.length === 4) {
      dsCount = X.GETSQLDATASET(countSql, sqlParams[0], sqlParams[1], sqlParams[2], sqlParams[3]);
    } else {
      dsCount = X.GETSQLDATASET(countSql, sqlParams[0], sqlParams[1], sqlParams[2], sqlParams[3], sqlParams[4]);
    }
    if (dsCount.RECORDCOUNT > 0) {
      total = parseInt(dsCount.CNT) || 0;
    }
  } catch (e) {
    return { success: false, error: 'Count failed: ' + e.message };
  }

  // Fetch page — offset/pageSize are safe integers
  var sql = 'SELECT CCCORDERSLOG.CCCORDERSLOG, CCCORDERSLOG.TRDR_RETAILER, '
    + 'TRDR.NAME AS RETAILERNAME, '
    + 'OPERATION, [LEVEL], '
    + "FORMAT(MESSAGEDATE, 'yyyy-MM-dd HH:mm:ss') AS MESSAGEDATE, "
    + 'MESSAGETEXT, F.FINCODE '
    + 'FROM CCCORDERSLOG '
    + 'LEFT JOIN TRDR ON TRDR.TRDR = CCCORDERSLOG.TRDR_RETAILER '
    + 'LEFT JOIN (SELECT CCCSFTPXML, FINDOC FROM CCCSFTPXML) XLOG ON XLOG.CCCSFTPXML = CCCORDERSLOG.CCCSFTPXML '
    + 'LEFT JOIN FINDOC F ON F.FINDOC = XLOG.FINDOC ' + where
    + ' ORDER BY CCCORDERSLOG DESC'
    + ' OFFSET ' + offset + ' ROWS FETCH NEXT ' + pageSize + ' ROWS ONLY';

  try {
    var ds;
    if (sqlParams.length === 0) {
      ds = X.GETSQLDATASET(sql, null);
    } else if (sqlParams.length === 1) {
      ds = X.GETSQLDATASET(sql, sqlParams[0]);
    } else if (sqlParams.length === 2) {
      ds = X.GETSQLDATASET(sql, sqlParams[0], sqlParams[1]);
    } else if (sqlParams.length === 3) {
      ds = X.GETSQLDATASET(sql, sqlParams[0], sqlParams[1], sqlParams[2]);
    } else if (sqlParams.length === 4) {
      ds = X.GETSQLDATASET(sql, sqlParams[0], sqlParams[1], sqlParams[2], sqlParams[3]);
    } else {
      ds = X.GETSQLDATASET(sql, sqlParams[0], sqlParams[1], sqlParams[2], sqlParams[3], sqlParams[4]);
    }
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

// Enumerate all SFTP/FTP configs joined with their EDI provider.
// Used by the EDI scanner to dispatch downloads per provider/transport.
function listEdiConfigs(params) {
  var onlyActive = params && (params.onlyActive === false || params.onlyActive === 'false') ? 0 : 1;
  var sql = 'SELECT s.CCCSFTP, s.TRDR_CLIENT, s.TRDR_RETAILER, s.URL, s.PORT, s.USERNAME, '
    + 's.PASSPHRASE, s.INITIALDIRIN, s.INITIALDIROUT, s.FINGERPRINT, s.PRIVATEKEY, s.EDIPROVIDER, '
    + 'p.CODE AS PROVIDER_CODE, p.NAME AS PROVIDER_NAME, p.CONNTYPE AS PROVIDER_CONNTYPE, '
    + 'ISNULL(p.ISACTIVE, 1) AS PROVIDER_ISACTIVE, '
    + '(SELECT NAME FROM TRDR WHERE TRDR = s.TRDR_RETAILER) AS RETAILER_NAME '
    + 'FROM CCCSFTP s LEFT JOIN CCCEDIPROVIDER p ON p.CCCEDIPROVIDER = s.EDIPROVIDER';
  if (onlyActive) {
    sql += ' WHERE ISNULL(p.ISACTIVE, 1) = 1';
  }
  sql += ' ORDER BY s.TRDR_RETAILER';
  try {
    var ds = X.GETSQLDATASET(sql, null);
    return { success: true, data: convertDatasetToArray(ds), total: ds.RECORDCOUNT };
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
  var trdr = parseInt(params.TRDR_RETAILER) || 0;
  var sosource = parseInt(params.SOSOURCE) || 0;
  var fprms = parseInt(params.FPRMS) || 0;
  var series = parseInt(params.SERIES) || 0;

  // Safe integers inlined directly — each :N must appear exactly once in S1 SQL
  var where = 'WHERE 1=1';
  if (trdr) where += ' AND TRDR_RETAILER = ' + trdr;
  if (sosource) where += ' AND SOSOURCE = ' + sosource;
  if (fprms) where += ' AND FPRMS = ' + fprms;
  if (series) where += ' AND SERIES = ' + series;

  var sql = 'SELECT CCCDOCUMENTES1MAPPINGS, TRDR_RETAILER, TRDR_CLIENT, SOSOURCE, FPRMS, SERIES, '
    + 'INITIALDIRIN, INITIALDIROUT '
    + 'FROM CCCDOCUMENTES1MAPPINGS ' + where;
  try {
    var ds = X.GETSQLDATASET(sql, null);
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

// Execute a CCCXMLS1MAPPINGS template SQL with the XML-extracted value bound
// as a parameter (closes SQL injection on user-controlled XML input).
// Template uses the legacy '{value}' placeholder; we rewrite it to :1 before
// calling X.SQL so the engine binds the value safely.
function runMappingSql(params) {
  var sql = (params.sql || '').toString();
  var value = params.value;
  if (value === undefined || value === null) value = '';
  if (!sql) return { success: false, error: 'Missing sql' };
  // Replace '{value}' (with surrounding quotes) or {value}; X.SQL :1 takes care of escaping.
  var bound = sql.replace(/'\{value\}'/g, ':1').replace(/\{value\}/g, ':1');
  try {
    var data;
    if (bound.indexOf(':1') >= 0) {
      data = X.SQL(bound, value.toString());
    } else {
      data = X.SQL(bound, null);
    }
    return { success: true, data: data };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getSftpXml(params) {
  var id = parseInt(params.id) || 0;
  var trdr = parseInt(params.TRDR_RETAILER) || 0;
  var filename = (params.XMLFILENAME || '').toString();
  var routingErrors = params.ROUTING_ERRORS === true || params.ROUTING_ERRORS === 'true' || params.ROUTING_ERRORS === 1;
  var limit = parseInt(params.$limit) || 50;
  var sortDir = (params.$sortDir || 'DESC').toString().toUpperCase();
  if (sortDir !== 'ASC') sortDir = 'DESC';

  // trdr is a safe integer; filename is user string with a single :1 occurrence
  var where = 'WHERE 1=1';
  if (id) where += ' AND CCCSFTPXML = ' + id;
  if (routingErrors) where += " AND TRDR_RETAILER = 0 AND XMLSTATUS = 'ERROR' AND EDIDOCTYPE = 'ORDERS' AND XMLERROR LIKE 'DocProcess routing error:%'";
  if (trdr) where += ' AND TRDR_RETAILER = ' + trdr;
  if (filename) where += ' AND CAST(XMLFILENAME AS VARCHAR(MAX)) = CAST(:1 AS VARCHAR(MAX))';

  var sql = 'SELECT TOP ' + limit + ' CCCSFTPXML, TRDR_CLIENT, TRDR_RETAILER, '
    + 'XMLDATA, JSONDATA, XMLDATE, XMLSTATUS, XMLERROR, FINDOC, XMLFILENAME, EDIDOCTYPE '
    + 'FROM CCCSFTPXML ' + where
    + ' ORDER BY XMLDATE ' + sortDir;
  try {
    var ds = filename ? X.GETSQLDATASET(sql, filename) : X.GETSQLDATASET(sql, null);
    return { success: true, data: convertDatasetToArray(ds), total: ds.RECORDCOUNT };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function createSftpXml(params) {
  var sql = 'INSERT INTO CCCSFTPXML (TRDR_CLIENT, TRDR_RETAILER, XMLDATA, JSONDATA, XMLDATE, XMLSTATUS, XMLERROR, XMLFILENAME, EDIDOCTYPE) '
    + 'VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9)';
  try {
    var trdrRetailer = parseInt(params.TRDR_RETAILER) || 0;
    var xmlFilename = (params.XMLFILENAME || '').toString();
    X.RUNSQL(sql,
      parseInt(params.TRDR_CLIENT) || 1,
      trdrRetailer,
      (params.XMLDATA || '').toString(),
      (params.JSONDATA || '').toString(),
      (params.XMLDATE || '').toString(),
      (params.XMLSTATUS || 'NEW').toString(),
      (params.XMLERROR || '').toString(),
      xmlFilename,
      (params.EDIDOCTYPE || 'ORDERS').toString()
    );
    var newId = parseInt(X.SQL('SELECT SCOPE_IDENTITY()', null)) || 0;
    if (newId <= 0 && xmlFilename) {
      newId = parseInt(X.SQL(
        'SELECT TOP 1 CCCSFTPXML FROM CCCSFTPXML WHERE CAST(XMLFILENAME AS VARCHAR(MAX)) = CAST(:1 AS VARCHAR(MAX)) AND TRDR_RETAILER=' + trdrRetailer + ' ORDER BY CCCSFTPXML DESC',
        xmlFilename
      )) || 0;
    }
    // Return the inserted row so callers get the full record
    var row = {};
    if (newId > 0) {
      var ds2 = X.GETSQLDATASET('SELECT CCCSFTPXML, TRDR_CLIENT, TRDR_RETAILER, XMLDATA, JSONDATA, XMLDATE, XMLSTATUS, XMLERROR, FINDOC, XMLFILENAME, EDIDOCTYPE FROM CCCSFTPXML WHERE CCCSFTPXML = :1', newId);
      var rows = convertDatasetToArray(ds2);
      if (rows.length > 0) row = rows[0];
    }
    return { success: true, id: newId, data: row };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function patchSftpXml(params) {
  var filename = (params.XMLFILENAME || '').toString();
  var trdr = parseInt(params.TRDR_RETAILER) || 0;
  var id = parseInt(params.id) || 0;

  // Build SET clause from provided fields (all optional except at least one must be set)
  var sets = [];
  if (params.FINDOC !== undefined && params.FINDOC !== null && !isNaN(parseInt(params.FINDOC))) {
    sets.push('FINDOC = ' + parseInt(params.FINDOC));
  }
  if (params.SET_TRDR_RETAILER !== undefined && params.SET_TRDR_RETAILER !== null && !isNaN(parseInt(params.SET_TRDR_RETAILER))) {
    sets.push('TRDR_RETAILER = ' + parseInt(params.SET_TRDR_RETAILER));
  }
  if (params.XMLSTATUS) {
    sets.push("XMLSTATUS = '" + (params.XMLSTATUS + '').replace(/'/g, "''") + "'");
  }
  if (params.XMLERROR !== undefined) {
    sets.push("XMLERROR = '" + (params.XMLERROR + '').replace(/'/g, "''") + "'");
  }
  if (params.JSONDATA !== undefined) {
    sets.push("JSONDATA = '" + (params.JSONDATA + '').replace(/'/g, "''") + "'");
  }
  if (sets.length === 0) return { success: false, error: 'No fields to patch (FINDOC, TRDR_RETAILER, XMLSTATUS, XMLERROR, JSONDATA)' };
  if (!filename && !id) return { success: false, error: 'Missing XMLFILENAME or id' };

  var updateWhere = 'WHERE 1=1';
  if (id) updateWhere += ' AND CCCSFTPXML = ' + id;
  if (filename) updateWhere += ' AND CAST(XMLFILENAME AS VARCHAR(MAX)) = CAST(:1 AS VARCHAR(MAX))';
  if (trdr) updateWhere += ' AND TRDR_RETAILER = ' + trdr;

  var updateSql = 'UPDATE CCCSFTPXML SET ' + sets.join(', ') + ' ' + updateWhere;
  try {
    if (filename) {
      X.RUNSQL(updateSql, filename);
    } else {
      X.RUNSQL(updateSql, null);
    }
    var selectWhere = 'WHERE 1=1';
    if (id) selectWhere += ' AND CCCSFTPXML = ' + id;
    if (filename) selectWhere += ' AND CAST(XMLFILENAME AS VARCHAR(MAX)) = CAST(:1 AS VARCHAR(MAX))';
    if (trdr) selectWhere += ' AND TRDR_RETAILER = ' + trdr;
    var selectSql = 'SELECT CCCSFTPXML, TRDR_CLIENT, TRDR_RETAILER, XMLDATA, JSONDATA, XMLDATE, XMLSTATUS, XMLERROR, FINDOC, XMLFILENAME, EDIDOCTYPE '
      + 'FROM CCCSFTPXML ' + selectWhere;
    var ds = filename ? X.GETSQLDATASET(selectSql, filename) : X.GETSQLDATASET(selectSql, null);
    return { success: true, data: convertDatasetToArray(ds), total: ds.RECORDCOUNT };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Atomic claim: transitions XMLSTATUS 'NEW' -> 'PROCESSING'.
// Returns claimed=true only if the row was in 'NEW' state and is now ours.
function claimSftpXml(params) {
  var id = parseInt(params.id) || 0;
  if (!id) return { success: false, error: 'Missing id' };
  try {
    X.RUNSQL("UPDATE CCCSFTPXML SET XMLSTATUS = 'PROCESSING' WHERE CCCSFTPXML = " + id + " AND XMLSTATUS = 'NEW'", null);
    var affected = parseInt(X.SQL('SELECT @@ROWCOUNT', null)) || 0;
    return { success: true, claimed: affected === 1, id: id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Return pending CCCSFTPXML rows (XMLSTATUS='NEW') for a set of retailers,
// limited to a doctype and a date window. Used by the EDI scanner.
function getPendingSftpXml(params) {
  var doctype = (params.EDIDOCTYPE || 'ORDERS').toString().toUpperCase();
  var daysOld = parseInt(params.daysOld) || 30;
  var limit = parseInt(params.$limit) || 50;
  var retailers = (params.TRDR_RETAILERS || '').toString();
  // Only digits and commas allowed
  if (!/^[0-9,\s]*$/.test(retailers)) return { success: false, error: 'Invalid TRDR_RETAILERS' };
  retailers = retailers.replace(/\s+/g, '');

  var where = "WHERE XMLSTATUS = 'NEW' AND EDIDOCTYPE = '" + doctype.replace(/'/g, "''") + "'"
    + ' AND XMLDATE > DATEADD(day, -' + daysOld + ', GETDATE())';
  if (retailers) where += ' AND TRDR_RETAILER IN (' + retailers + ')';

  var sql = 'SELECT TOP ' + limit + ' CCCSFTPXML, TRDR_RETAILER, XMLFILENAME, XMLDATA, '
    + "FORMAT(XMLDATE, 'yyyy-MM-dd HH:mm:ss') AS XMLDATE, EDIDOCTYPE, "
    + '(SELECT NAME FROM TRDR WHERE TRDR = CCCSFTPXML.TRDR_RETAILER) AS RETAILER_NAME '
    + 'FROM CCCSFTPXML ' + where + ' ORDER BY XMLDATE ASC';
  try {
    var ds = X.GETSQLDATASET(sql, null);
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
  var trdr = parseInt(params.TRDR_RETAILER) || 0;
  var trdrClient = parseInt(params.TRDR_CLIENT) || 0;
  var findoc = parseInt(params.FINDOC) || 0;
  var limit = parseInt(params.$limit) || 50;

  // Safe integers inlined directly — each :N must appear exactly once in S1 SQL
  var where = 'WHERE 1=1';
  if (trdr) where += ' AND TRDR_RETAILER = ' + trdr;
  if (trdrClient) where += ' AND TRDR_CLIENT = ' + trdrClient;
  if (findoc) where += ' AND FINDOC = ' + findoc;

  var sql = 'SELECT TOP ' + limit + ' CCCAPERAK, TRDR_RETAILER, TRDR_CLIENT, FINDOC, '
    + 'XMLFILENAME, XMLSENTDATE, MESSAGEDATE, MESSAGETIME, MESSAGEORIGIN, '
    + 'DOCUMENTREFERENCE, DOCUMENTUID, SUPPLIERRECEIVERCODE, DOCUMENTRESPONSE, DOCUMENTDETAIL '
    + 'FROM CCCAPERAK ' + where
    + ' ORDER BY CCCAPERAK DESC';
  try {
    var ds = X.GETSQLDATASET(sql, null);
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
