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

function getOrdersData(params) {
  // Default values
  var trdr = params.trdr || 0;
  var daysOlder = params.daysOlder || 30;
  var limit = params.limit || 50;
  
  if (!trdr || trdr <= 0) {
    return { success: false, error: 'Invalid retailer ID (trdr) provided.' };
  }
  
  // SQL query to get orders data similar to how invoices are retrieved
  var sqlQuery = "SELECT TOP " + limit + " " +
    "c.CCCSFTPXML, " +
    "c.TRDR_RETAILER, " +
    "(SELECT name FROM trdr WHERE trdr = c.TRDR_RETAILER) AS RetailerName, " +
    "c.XMLFILENAME, " +
    "FORMAT(c.XMLDATE, 'yyyy-MM-dd HH:mm:ss') AS XMLDATE, " +
    "ISNULL(c.FINDOC, 0) AS FINDOC, " +
    "CASE WHEN c.FINDOC IS NOT NULL THEN 'Procesat' ELSE 'Neprocesat' END AS Status, " +
    // Extract OrderID from XML
    "REPLACE(REPLACE(CAST(c.xmldata.query('/Order/ID') AS VARCHAR(max)), '<ID>', ''), '</ID>', '') AS OrderId " +
    "FROM CCCSFTPXML c " +
    "WHERE c.TRDR_RETAILER = " + trdr + " " +
    "AND CAST(c.XMLDATE AS DATE) >= DATEADD(day, -" + daysOlder + ", GETDATE()) " +
    "ORDER BY c.XMLDATE DESC";
  
  try {
    var ds = X.GETSQLDATASET(sqlQuery, null);
    if (ds.RECORDCOUNT > 0) {
      return {
        success: true,
        data: convertDatasetToArray(ds),
        total: ds.RECORDCOUNT
      };
    } else {
      return {
        success: true,
        message: 'No orders found for the specified criteria.',
        data: [],
        total: 0
      };
    }
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
