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
  var orderid = params.orderid || '';
  var operation = params.operation || '';
  var level = params.level || '';
  var dateFrom = params.dateFrom || '';
  var dateTo = params.dateTo || '';
  var page = parseInt(params.page) || 1;
  var pageSize = parseInt(params.pageSize) || 25;
  if (pageSize > 100) pageSize = 100;
  var offset = (page - 1) * pageSize;

  var where = 'WHERE 1=1';
  if (trdr === -1) {
    where += ' AND TRDR_RETAILER = -1';
  } else if (trdr > 0) {
    where += ' AND TRDR_RETAILER = ' + trdr;
  }
  if (orderid) {
    where += " AND ORDERID = '" + orderid.replace(/'/g, "''") + "'";
  }
  if (operation) {
    where += " AND OPERATION = '" + operation.replace(/'/g, "''") + "'";
  }
  if (level) {
    where += " AND LEVEL = '" + level.replace(/'/g, "''") + "'";
  }
  if (dateFrom) {
    where += " AND MESSAGEDATE >= '" + dateFrom.replace(/'/g, "''") + "'";
  }
  if (dateTo) {
    where += " AND MESSAGEDATE <= '" + dateTo.replace(/'/g, "''") + " 23:59:59'";
  }

  // Count total
  var countSql = 'SELECT COUNT(*) AS CNT FROM CCCORDERSLOG ' + where;
  var total = 0;
  try {
    total = parseInt(X.SQL(countSql, null)) || 0;
  } catch (e) {
    return { success: false, error: 'Count failed: ' + e.message };
  }

  // Fetch page
  var sql = 'SELECT CCCORDERSLOG, TRDR_RETAILER, '
    + "(SELECT NAME FROM TRDR WHERE TRDR = CCCORDERSLOG.TRDR_RETAILER) AS RETAILERNAME, "
    + 'OPERATION, LEVEL, '
    + "FORMAT(MESSAGEDATE, 'yyyy-MM-dd HH:mm:ss') AS MESSAGEDATE, "
    + 'MESSAGETEXT '
    + 'FROM CCCORDERSLOG ' + where
    + ' ORDER BY CCCORDERSLOG DESC'
    + ' OFFSET ' + offset + ' ROWS FETCH NEXT ' + pageSize + ' ROWS ONLY';

  try {
    var ds = X.GETSQLDATASET(sql, null);
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
