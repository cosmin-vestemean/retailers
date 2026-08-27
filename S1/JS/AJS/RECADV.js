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
 * Advice lines, with the retailer-specific product code, the Soft1 product code and the EAN,
 * for a set of advices.
 * params: { findocs } — comma-separated string or array of FINDOC ids
 * returns: { success, data: [{FINDOC, RETAILERCODE, MTRLCODE, EAN, QTY1}] } or { success: false, error }
 */
function getAdviceLines(params) {
  var findocs;
  try {
    findocs = parseNumericList(toCsv(params.findocs));
  } catch (e) {
    return { success: false, error: e.message };
  }
  if (!findocs.length) return { success: true, data: [] };

  var sql = 'SELECT l.FINDOC, ml.CODE AS RETAILERCODE, m.CODE AS MTRLCODE, m.CODE1 AS EAN, l.QTY1'
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
 * params: { trdr, daysOlder=30, page=1, pageSize=25, search }
 * `search` (optional) matches the aviz FINCODE, the EDI order number (NUM04), the Soft1
 * product code (MTRL.CODE) or the retailer product code (CCCS1DXTRDRMTRL.CODE) on any line.
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

  var search = params.search ? String(params.search).replace(/^\s+|\s+$/g, '') : '';
  // NUM04 is a float: default FLOAT->VARCHAR conversion (style 0) renders it in scientific
  // notation past 6 significant digits, so every real order number needs the BIGINT detour.
  // Retailers also send the order zero-padded (Auchan `01433687`) but it lands in NUM04 without
  // the leading zero, so the order-search term is stripped of leading zeros the same way
  // `normalizeOrderNumber` does in src/edi/recadv-reconciler.js.
  var orderSearch = search.replace(/^0+(?=\d)/, '');
  var searchClause = '';
  if (search) {
    searchClause = ' AND ('
      + ' f.FINCODE LIKE :1'
      + ' OR CAST(CAST(ISNULL(f.NUM04, 0) AS BIGINT) AS VARCHAR(30)) LIKE :2'
      + ' OR EXISTS (SELECT 1 FROM MTRLINES l2 INNER JOIN MTRL m2 ON m2.MTRL = l2.MTRL'
      + '   WHERE l2.FINDOC = f.FINDOC AND m2.CODE LIKE :3)'
      + ' OR EXISTS (SELECT 1 FROM MTRLINES l3 INNER JOIN CCCS1DXTRDRMTRL x3'
      + '   ON x3.MTRL = l3.MTRL AND x3.TRDR = f.TRDR'
      + '   WHERE l3.FINDOC = f.FINDOC AND x3.CODE LIKE :4)'
      + ')';
  }

  var fromClause = 'FROM FINDOC f'
    + ' WHERE f.TRDR = ' + trdr
    + ' AND f.SERIES = 7111 AND f.ISCANCEL = 0'
    + ' AND f.TRNDATE >= DATEADD(day, -' + daysOlder + ', GETDATE())'
    // Keeps advices with at least one merchandise line, so a mixed advice would still show up.
    + ' AND EXISTS (SELECT 1 FROM MTRLINES l INNER JOIN MTRL m ON m.MTRL = l.MTRL'
    + "   WHERE l.FINDOC = f.FINDOC AND m.NAME NOT LIKE '%PALET%')"
    + searchClause;

  var like = '%' + search + '%';
  var likeOrder = '%' + orderSearch + '%';

  var total = 0;
  try {
    total = parseInt(search
      ? X.SQL('SELECT COUNT(*) ' + fromClause, like, likeOrder, like, like)
      : X.SQL('SELECT COUNT(*) ' + fromClause, null)) || 0;
  } catch (e) {
    return { success: false, error: 'Count failed: ' + e.message };
  }

  // Invoice identity (FINCODE/TRNDATE), not just a Da/Nu flag, so the reception screen can
  // show which invoice already covers an advice instead of only that one exists (item C).
  // Same TFPRMS=103 predicate as before — never FPRMS=712, that is Auchan-only.
  // FINDOC/CCCXMLSendDate are also returned so the Trimite button (item A) can act on the
  // invoice document itself and know whether it was already sent via SFTP.
  var invoiceFrom = 'MTRLINES l INNER JOIN FINDOC i ON i.FINDOC = l.FINDOC AND i.ISCANCEL = 0'
    + ' INNER JOIN SALFPRMS p ON p.FPRMS = i.FPRMS AND p.COMPANY = i.COMPANY'
    + ' LEFT JOIN MTRDOC md ON md.FINDOC = i.FINDOC'
    + ' WHERE l.FINDOCS = f.FINDOC AND p.TFPRMS = 103';
  // Verified 2026-08-24: 0 advices currently have more than one invoice, but INVOICE_COUNT is
  // still returned so the frontend can flag it (+N) if consolidation/partial invoicing ever occurs.
  var invoiceColumns = '(SELECT TOP 1 i.FINDOC FROM ' + invoiceFrom
      + ' ORDER BY i.TRNDATE DESC, i.FINDOC DESC) AS INVOICE_FINDOC, '
    + '(SELECT TOP 1 i.FINCODE FROM ' + invoiceFrom
      + ' ORDER BY i.TRNDATE DESC, i.FINDOC DESC) AS INVOICE_FINCODE, '
    + '(SELECT TOP 1 CONVERT(VARCHAR(19), i.TRNDATE, 120) FROM ' + invoiceFrom
      + ' ORDER BY i.TRNDATE DESC, i.FINDOC DESC) AS INVOICE_TRNDATE, '
    + '(SELECT TOP 1 CONVERT(VARCHAR(19), md.CCCXMLSendDate, 120) FROM ' + invoiceFrom
      + ' ORDER BY i.TRNDATE DESC, i.FINDOC DESC) AS INVOICE_SENT_DATE, '
    + '(SELECT COUNT(DISTINCT i.FINDOC) FROM ' + invoiceFrom + ') AS INVOICE_COUNT';

  var sql = 'SELECT f.FINDOC, f.FINCODE, f.TRDBRANCH, ISNULL(f.NUM04, 0) AS NUM04, '
    + "CONVERT(VARCHAR(19), f.TRNDATE, 120) AS TRNDATE, "
    + invoiceColumns + ' '
    + fromClause
    + ' ORDER BY f.TRNDATE DESC, f.FINDOC DESC'
    + ' OFFSET ' + offset + ' ROWS FETCH NEXT ' + pageSize + ' ROWS ONLY';

  try {
    var ds = search
      ? X.GETSQLDATASET(sql, like, likeOrder, like, like)
      : X.GETSQLDATASET(sql, null);
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

/**
 * Creates the invoice (Auchan 7122 / Dedeman 7123) for one clean 7111 advice, via
 * X.CreateObj('SALDOC;EF') so the ON_RESTOREEVENTS/preiaDateAviz and ON_AFTERPOST hooks bound
 * to that view fire exactly as they do for a UI-created invoice (see reception-screen.md item B).
 * Series is read from CCCDOCUMENTES1MAPPINGS joined to SALFPRMS.TFPRMS=103 - never hardcoded.
 * "Clean reception" gating happens in the caller (reconciliation status); this function only
 * guards against inserting a second invoice for the same advice.
 * params: { findoc } - the source advice's FINDOC (SERIES=7111)
 * returns: { success, findoc, fincode, trndate } or { success: false, error }
 */
function createInvoiceFromReception(params) {
  var advFindoc = parseInt(params.findoc) || 0;
  if (!advFindoc || advFindoc <= 0) {
    return { success: false, error: 'Invalid advice FINDOC provided.' };
  }

  var adv = X.GETSQLDATASET(
    'SELECT TRDR, TRDBRANCH, ISNULL(NUM04, 0) AS NUM04, CCCORDERDOC, DATE01'
    + ' FROM FINDOC WHERE FINDOC=:1 AND SERIES=7111 AND ISCANCEL=0',
    advFindoc
  );
  if (!adv.RECORDCOUNT) {
    return { success: false, error: 'Advice not found, cancelled, or not a 7111 document.' };
  }
  adv.FIRST;

  // Same TFPRMS=103 idempotency predicate as getReceptionsData - never FPRMS=712 (Auchan-only).
  var already = X.SQL(
    'SELECT TOP 1 i.FINCODE FROM MTRLINES l'
    + ' INNER JOIN FINDOC i ON i.FINDOC = l.FINDOC AND i.ISCANCEL = 0'
    + ' INNER JOIN SALFPRMS p ON p.FPRMS = i.FPRMS AND p.COMPANY = i.COMPANY'
    + ' WHERE l.FINDOCS = :1 AND p.TFPRMS = 103',
    advFindoc
  );
  if (already) {
    return { success: false, error: 'Advice already invoiced (' + already + ').' };
  }

  var mapping = X.GETSQLDATASET(
    'SELECT TOP 1 m.SERIES FROM CCCDOCUMENTES1MAPPINGS m'
    + ' INNER JOIN SALFPRMS p ON p.FPRMS = m.FPRMS AND p.COMPANY = :1'
    + ' WHERE m.TRDR_RETAILER = :2 AND p.TFPRMS = 103 AND m.ACTIVE = 1',
    X.SYS.COMPANY, adv.TRDR
  );
  if (!mapping.RECORDCOUNT) {
    return { success: false, error: 'No active invoice series mapped for TRDR ' + adv.TRDR + ' in CCCDOCUMENTES1MAPPINGS.' };
  }
  mapping.FIRST;
  var series = mapping.SERIES;

  var lines = X.GETSQLDATASET(
    'SELECT MTRLINES, MTRL, QTY1, PRICE, DISC1PRC, VAT FROM MTRLINES WHERE FINDOC=:1 ORDER BY LINENUM',
    advFindoc
  );
  if (!lines.RECORDCOUNT) {
    return { success: false, error: 'Advice has no lines to invoice.' };
  }

  var obj = null;
  try {
    // 2026-08-27: 'SALDOC;EF' initially failed with "document number must be provided" because
    // series 7122 was admin-flagged "Doar din conversie" (conversion-only) - not a form issue.
    // Fixed at the source: SALDOC_EF_27072026.js ON_SALDOC_SERIES now allows SERIES=7122 for the
    // WEB user (X.SYS.USER==1002, i.e. this AJS call) once the series-level flag was removed.
    obj = X.CreateObj('SALDOC;EF');
    obj.DBINSERT;

    var tblFINDOC = obj.FindTable('FINDOC');
    tblFINDOC.Edit;
    tblFINDOC.SERIES = series;
    tblFINDOC.TRDR = adv.TRDR;
    tblFINDOC.TRDBRANCH = adv.TRDBRANCH;
    tblFINDOC.NUM04 = adv.NUM04;
    tblFINDOC.CCCORDERDOC = adv.CCCORDERDOC;
    // Never copied before 2026-08-27 - left <OrderParty><BuyerOrderDate> empty on every Infinite
    // invoice created here, which Infinite's schema validation rejects as "Invalid file structure"
    // (confirmed live via the EDInet portal - the FTP-level MessageAcknowledgement stays clean
    // even when this fails, so it is NOT a reliable success signal on its own).
    tblFINDOC.DATE01 = adv.DATE01;

    var tblITELINES = obj.FindTable('ITELINES');
    lines.FIRST;
    while (!lines.EOF) {
      tblITELINES.APPEND;
      tblITELINES.MTRL = lines.MTRL;
      tblITELINES.QTY1 = lines.QTY1;
      tblITELINES.PRICE = lines.PRICE;
      tblITELINES.DISC1PRC = lines.DISC1PRC;
      tblITELINES.VAT = lines.VAT;
      tblITELINES.FINDOCS = advFindoc;
      tblITELINES.MTRLINESS = lines.MTRLINES;
      tblITELINES.POST;
      lines.NEXT;
    }

    var newFindoc = obj.DBPOST;
    if (!(newFindoc > 0)) {
      return { success: false, error: 'DBPOST did not return a new FINDOC id.' };
    }

    var created = X.GETSQLDATASET(
      'SELECT FINCODE, CONVERT(VARCHAR(19), TRNDATE, 120) AS TRNDATE FROM FINDOC WHERE FINDOC=:1',
      newFindoc
    );
    created.FIRST;
    return { success: true, findoc: newFindoc, fincode: created.FINCODE, trndate: created.TRNDATE };
  } catch (e) {
    return { success: false, error: e.message + (obj ? ' | ' + obj.GETLASTERROR : '') };
  } finally {
    if (obj) { obj.FREE; obj = null; }
  }
}
