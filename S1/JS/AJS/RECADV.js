//Cod specific S1 - AJS
//// RECADV
//
// Implements the SQL side of src/edi/recadv-reconciler.js's `lookup` seam:
//   getAdvicesByCode / getAdvicesByOrder -> lookup.findAdvices({trdr, suffixes, orders})
//   getAdviceLines                       -> lookup.findAdviceLines({findocs})
// getReceptionsData is the paginated aviz (7111) list for the reception screen, with the
// invoiced-state predicate from soft1-schema-facts.md (SALFPRMS.TFPRMS = 103, never FPRMS=712).
// getRecadvDocuments (F5) feeds the reconciler itself: parsed RECADV payloads stored in
// CCCSFTPXML.JSONDATA, so the Feathers layer can run reconcileRecadv() on demand.
//
// Deploy: copy this file into ERP -> Customization tools -> Advanced JavaScript Editor.
// Endpoint: https://petfactory.oncloud.gr/s1services/JS/RECADV/<functionName>

var ID_PATTERN = /^\d{1,15}$/;

function convertDatasetToArray(dataset) {
  var arr = [];
  dataset.FIRST;
  while (!dataset.EOF) {
    var row = {};
    for (var i = 0; i < dataset.fieldcount; i++) {
      var columnName = dataset.fieldname(i);
      row[columnName] = dataset.fields(i);
    }
    arr.push(row);
    dataset.NEXT;
  }
  return arr;
}

function toCsv(value) {
  if (Object.prototype.toString.call(value) === '[object Array]') {
    return value.join(',');
  }
  return value;
}

// Bulk lists travel as ONE bound parameter (STRING_SPLIT on the SQL side); every element is
// re-validated here as defence in depth, even though the reconciler already validates upstream.
// Soft1 binds placeholders by ORDER OF APPEARANCE in the SQL text, not by :N, and infers int
// for an all-digit string — so the list parameter must appear first AND be CAST to VARCHAR(MAX).
function parseNumericList(raw) {
  var parts = String(raw || '').split(',');
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    var value = parts[i].replace(/^\s+|\s+$/g, '');
    if (!value) continue;
    if (!ID_PATTERN.test(value)) {
      throw new Error('Refusing non-numeric value in bulk list: "' + value + '"');
    }
    out.push(value);
  }
  return out;
}

/**
 * Advices (FINDOC.SERIES=7111) for a retailer matched by the last 6 digits of FINCODE.
 * params: { trdr, codes } — codes: comma-separated string or array of 1-6 digit suffixes
 * returns: { success, data: [{FINDOC, FINCODE, TRDR, NUM04}] } or { success: false, error }
 */
function getAdvicesByCode(params) {
  var trdr = parseInt(params.trdr) || 0;
  if (!trdr || trdr <= 0) {
    return { success: false, error: 'Invalid retailer ID (trdr) provided.' };
  }

  var codes;
  try {
    codes = parseNumericList(toCsv(params.codes));
  } catch (e) {
    return { success: false, error: e.message };
  }
  if (!codes.length) return { success: true, data: [] };

  var sql = 'SELECT f.FINDOC, f.FINCODE, f.TRDR, f.NUM04'
    + ' FROM FINDOC f'
    + " INNER JOIN STRING_SPLIT(CAST(:1 AS VARCHAR(MAX)), ',') s"
    + "   ON RIGHT('000000' + LTRIM(RTRIM(s.value)), 6) = RIGHT(f.FINCODE, 6)"
    + ' WHERE f.TRDR = :2 AND f.SERIES = 7111 AND f.ISCANCEL = 0';

  try {
    var ds = X.GETSQLDATASET(sql, codes.join(','), trdr);
    return { success: true, data: convertDatasetToArray(ds) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Advices (FINDOC.SERIES=7111) for a retailer matched by NUM04 (the EDI order number).
 * params: { trdr, orders } — orders: comma-separated string or array of numeric order numbers
 * returns: { success, data: [{FINDOC, FINCODE, TRDR, NUM04}] } or { success: false, error }
 */
function getAdvicesByOrder(params) {
  var trdr = parseInt(params.trdr) || 0;
  if (!trdr || trdr <= 0) {
    return { success: false, error: 'Invalid retailer ID (trdr) provided.' };
  }

  var orders;
  try {
    orders = parseNumericList(toCsv(params.orders));
  } catch (e) {
    return { success: false, error: e.message };
  }
  if (!orders.length) return { success: true, data: [] };

  var sql = 'SELECT f.FINDOC, f.FINCODE, f.TRDR, f.NUM04'
    + ' FROM FINDOC f'
    + " INNER JOIN STRING_SPLIT(CAST(:1 AS VARCHAR(MAX)), ',') s ON f.NUM04 = TRY_CONVERT(FLOAT, s.value)"
    + ' WHERE f.TRDR = :2 AND f.SERIES = 7111 AND f.ISCANCEL = 0';

  try {
    var ds = X.GETSQLDATASET(sql, orders.join(','), trdr);
    return { success: true, data: convertDatasetToArray(ds) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Advice lines, with the retailer-specific product code and the EAN, for a set of advices.
 * params: { findocs } — comma-separated string or array of FINDOC ids
 * returns: { success, data: [{FINDOC, RETAILERCODE, EAN, QTY1}] } or { success: false, error }
 */
function getAdviceLines(params) {
  var findocs;
  try {
    findocs = parseNumericList(toCsv(params.findocs));
  } catch (e) {
    return { success: false, error: e.message };
  }
  if (!findocs.length) return { success: true, data: [] };

  var sql = 'SELECT l.FINDOC, ml.CODE AS RETAILERCODE, m.CODE1 AS EAN, l.QTY1'
    + ' FROM MTRLINES l'
    + ' INNER JOIN FINDOC f ON f.FINDOC = l.FINDOC AND f.ISCANCEL = 0'
    + ' INNER JOIN MTRL m ON m.MTRL = l.MTRL'
    // CCCS1DXTRDRMTRL has no COMPANY column and can carry more than one LINENUM per MTRL/TRDR;
    // OUTER APPLY + TOP 1 keeps this a single row per advice line instead of fanning it out.
    + ' OUTER APPLY ('
    + '   SELECT TOP 1 x.CODE AS CODE FROM CCCS1DXTRDRMTRL x'
    + '   WHERE x.MTRL = l.MTRL AND x.TRDR = f.TRDR ORDER BY x.LINENUM'
    + ' ) ml'
    + " WHERE l.FINDOC IN (SELECT value FROM STRING_SPLIT(CAST(:1 AS VARCHAR(MAX)), ','))";

  try {
    var ds = X.GETSQLDATASET(sql, findocs.join(','));
    return { success: true, data: convertDatasetToArray(ds) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Paginated list of advices (FINDOC.SERIES=7111) for the reception screen, with the invoiced
 * state computed by the verified TFPRMS=103 predicate (never FPRMS=712 — that is Auchan-only).
 * Pallet-only advices are excluded: measured on 60 days, all 74 Auchan ones carry a single
 * AM.00006 line, no source order, no NUM04 and are never invoiced — nothing to reconcile.
 * params: { trdr, daysOlder=30, page=1, pageSize=25 }
 * returns: { success, data, total, page, pageSize } or { success: false, error }
 */
function getReceptionsData(params) {
  var trdr = parseInt(params.trdr) || 0;
  var daysOlder = parseInt(params.daysOlder) || 30;
  var page = parseInt(params.page) || 1;
  var pageSize = parseInt(params.pageSize) || 25;
  if (pageSize > 100) pageSize = 100;
  var offset = (page - 1) * pageSize;

  if (!trdr || trdr <= 0) {
    return { success: false, error: 'Invalid retailer ID (trdr) provided.' };
  }

  var fromClause = 'FROM FINDOC f'
    + ' WHERE f.TRDR = ' + trdr
    + ' AND f.SERIES = 7111 AND f.ISCANCEL = 0'
    + ' AND f.TRNDATE >= DATEADD(day, -' + daysOlder + ', GETDATE())'
    // Keeps advices with at least one merchandise line, so a mixed advice would still show up.
    + ' AND EXISTS (SELECT 1 FROM MTRLINES l INNER JOIN MTRL m ON m.MTRL = l.MTRL'
    + "   WHERE l.FINDOC = f.FINDOC AND m.NAME NOT LIKE '%PALET%')";

  var total = 0;
  try {
    total = parseInt(X.SQL('SELECT COUNT(*) ' + fromClause, null)) || 0;
  } catch (e) {
    return { success: false, error: 'Count failed: ' + e.message };
  }

  var invoicedPredicate = 'CASE WHEN EXISTS ('
    + '   SELECT 1 FROM MTRLINES l'
    + '   INNER JOIN FINDOC i ON i.FINDOC = l.FINDOC AND i.ISCANCEL = 0'
    + '   INNER JOIN SALFPRMS p ON p.FPRMS = i.FPRMS AND p.COMPANY = i.COMPANY'
    + '   WHERE l.FINDOCS = f.FINDOC AND p.TFPRMS = 103'
    + ' ) THEN 1 ELSE 0 END AS INVOICED';

  var sql = 'SELECT f.FINDOC, f.FINCODE, f.TRDBRANCH, ISNULL(f.NUM04, 0) AS NUM04, '
    + "CONVERT(VARCHAR(19), f.TRNDATE, 120) AS TRNDATE, "
    + invoicedPredicate + ' '
    + fromClause
    + ' ORDER BY f.TRNDATE DESC, f.FINDOC DESC'
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

/**
 * Parsed RECADV documents ingested for a retailer (CCCSFTPXML, EDIDOCTYPE='RECADV',
 * XMLSTATUS='INGESTED'), for on-demand reconciliation. JSONDATA travels as-is (a JSON string);
 * the Feathers layer parses it, never this AJS module.
 * params: { trdr, daysOlder=30, limit=500 }
 * returns: { success, data: [{CCCSFTPXML, XMLFILENAME, JSONDATA, XMLDATE}] } or { success: false, error }
 */
function getRecadvDocuments(params) {
  var trdr = parseInt(params.trdr) || 0;
  var daysOlder = parseInt(params.daysOlder) || 30;
  var limit = parseInt(params.limit) || 500;
  if (limit > 1000) limit = 1000;

  if (!trdr || trdr <= 0) {
    return { success: false, error: 'Invalid retailer ID (trdr) provided.' };
  }

  var sql = 'SELECT TOP ' + limit + ' CCCSFTPXML, XMLFILENAME, JSONDATA, '
    + 'CONVERT(VARCHAR(19), XMLDATE, 120) AS XMLDATE'
    + ' FROM CCCSFTPXML'
    + " WHERE TRDR_RETAILER = :1 AND EDIDOCTYPE = 'RECADV' AND XMLSTATUS = 'INGESTED'"
    + ' AND XMLDATE >= DATEADD(day, -' + daysOlder + ', GETDATE())'
    + ' ORDER BY XMLDATE DESC';

  try {
    var ds = X.GETSQLDATASET(sql, trdr);
    return { success: true, data: convertDatasetToArray(ds) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
