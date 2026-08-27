//Cod specific S1 - AJS
//// InfiniteInvoice
//
// Dedicated Infinite (Auchan/Dedeman) invoice XML builder -- native <Invoice Version="1.0.1">
// schema, NOT DocProcess's <DXInvoice> (that one stays in runCmd20210915.js, unchanged).
// Field mappings are ported 1:1 from the two proven SOIMPORT scripts that have generated these
// invoices in production for years (documentatie/infinite_samples/*.soimport.txt):
//   - AR_ORIGINAL_INVOICE      (Auchan,  FPRMS=712, EXPN=0)
//   - ExpFactDedeman_ButonNew  (Dedeman, SERIES IN (7123,7033))
// Deliberately scoped to exactly these two retailers per beneficiary directive 2026-08-27 (new
// retailers onboard on DocProcess, not Infinite) -- do not generalize this into a config-driven
// engine. See .copilot/wiki/infinite-invoice-format.md for the full field-by-field audit.
//
// Deploy: copy this file into ERP -> Customization tools -> Advanced JavaScript Editor.
// Endpoint: https://petfactory.oncloud.gr/s1services/JS/InfiniteInvoice/buildInvoiceXml

function esc(val) {
  return val === undefined || val === null ? '' : String(val);
}

function tag(name, val) {
  return '<' + name + '>' + esc(val) + '</' + name + '>';
}

function fail(message) {
  return { success: false, dom: null, trimis: false, filename: null, computername: null, message: message, errors: [message] };
}

/**
 * Builds the native Infinite invoice XML for one Auchan or Dedeman invoice.
 * params: { findoc } - the invoice's own FINDOC (SERIES 7122 Auchan / 7123,7033 Dedeman)
 * returns: { success, dom, trimis, filename, computername, message, errors }
 *   (dom/trimis/filename/computername mirror runCmd20210915.js's DocProcess contract so
 *   get-invoice-dom.class.js's existing frontend consumers keep working unchanged; `message`/
 *   `errors` are new - a field-by-field validation report instead of a generic bind-error dump).
 */
function buildInvoiceXml(params) {
  var findoc = parseInt(params.findoc, 10) || 0;
  if (!findoc || findoc <= 0) {
    return fail('FINDOC invalid sau lipsa.');
  }

  var head = X.GETSQLDATASET(
    'SELECT FINDOC, SERIES, FPRMS, TRDR, ISNULL(EXPN,0) AS EXPN, ISCANCEL FROM FINDOC WHERE FINDOC=:1',
    findoc
  );
  if (!head.RECORDCOUNT) {
    return fail('Documentul FINDOC=' + findoc + ' nu a fost gasit.');
  }
  head.FIRST;
  if (head.ISCANCEL) {
    return fail('Documentul FINDOC=' + findoc + ' este anulat.');
  }

  var retailer;
  if (head.FPRMS == 712) {
    if (head.EXPN > 0) {
      return fail('Factura Auchan cu EXPN>0 ("timbru verde") nu este acoperita de acest builder - foloseste varianta manuala AR_ORIGINAL_INVOICE_WGT.');
    }
    retailer = 'auchan';
  } else if (head.SERIES == 7123 || head.SERIES == 7033) {
    retailer = 'dedeman';
  } else {
    return fail('Document nesuportat pentru builder-ul Infinite (asteptat Auchan FPRMS=712 sau Dedeman SERIES 7123/7033; gasit SERIES=' + head.SERIES + ' FPRMS=' + head.FPRMS + ').');
  }

  var trimis = false;
  var sendDs = X.GETSQLDATASET('SELECT CCCXMLSendDate FROM MTRDOC WHERE FINDOC=:1', findoc);
  if (sendDs.RECORDCOUNT) {
    sendDs.FIRST;
    trimis = !!sendDs.CCCXMLSendDate;
  }

  var dsHeader = retailer == 'auchan' ? auchanHeader(findoc) : dedemanHeader(findoc);
  if (!dsHeader.RECORDCOUNT) {
    return fail('Nu s-au gasit date de antet pentru FINDOC=' + findoc + ' (' + retailer + ').');
  }
  dsHeader.FIRST;

  var dsTax = taxSummary(findoc);

  var dsLinii = retailer == 'auchan' ? auchanLines(findoc) : dedemanLines(findoc);
  if (!dsLinii.RECORDCOUNT) {
    return fail('Documentul FINDOC=' + findoc + ' nu are linii.');
  }

  var taxCategory = retailer == 'auchan' ? 'S' : '3D';
  var person = retailer == 'auchan' ? 'Ion Ion' : '';

  var errors = validate(dsHeader, dsLinii);
  if (errors.length) {
    return { success: false, dom: null, trimis: trimis, filename: null, computername: null, message: errors.join('\n'), errors: errors };
  }

  var dom = buildXml(dsHeader, dsTax, dsLinii, retailer, taxCategory, person);
  var filename = esc(dsHeader.InvoiceNumber) + '_' + esc(dsHeader.Data) + '.xml';

  return { success: true, dom: dom, trimis: trimis, filename: filename, computername: null, message: null, errors: [] };
}

// ---- Header queries (ported from AR_ORIGINAL_INVOICE / ExpFactDedeman_ButonNew dsHeader) ----
// InvoiceeParty is never anything other than a copy of BuyerParty in either proven script, and
// ShipFromParty is always emitted empty - both are handled directly in buildXml() without their
// own SQL columns, matching real behaviour with fewer moving parts.

function auchanHeader(findoc) {
  var sql =
    "SELECT isnull(A.fincode,'') InvoiceNumber," +
    "isnull(CONVERT(VARCHAR(10),A.trndate,120),'') Data," +
    "(SELECT TOP 1 isnull(CONVERT(VARCHAR(10),finaldate,120),'') FROM finpayterms WHERE findoc=A.findoc) InvoiceDueDate," +
    "isnull(C.REMARKS,'') Comment," +
    "isnull(A.num04,'') BuyerOrderNumber," +
    // dateTime with the 'T', unlike every other date here. Proven correct: the accepted
    // FAEX1-PF-40689 carries 2026-08-21T00:00:00. Do not "normalize" this to varchar(10).
    "isnull(replace(convert(varchar(50),A.date01,120),' ','T'),'') BuyerOrderDate," +
    "isnull(convert(varchar(10),B.delivdate,120),'') DeliveryDate," +
    "(SELECT TOP 1 isnull(b1.fincode,'') FROM mtrlines a1 LEFT OUTER JOIN findoc b1 ON a1.findocs=b1.findoc WHERE a1.findoc=A.findoc AND a1.findocs IS NOT NULL) DeliveryDocumentNumber," +
    "(SELECT TOP 1 isnull(CONVERT(VARCHAR(10),b1.trndate,120),'') FROM mtrlines a1 LEFT OUTER JOIN findoc b1 ON a1.findocs=b1.findoc WHERE a1.findoc=A.findoc AND a1.findocs IS NOT NULL) DeliveryDocumentDate," +
    "isnull(C.CCCS1DXGLN,'') ILN," +
    "isnull(C.BGBULSTAT+C.AFM,'') TaxID," +
    "isnull(C.NAME,'') Name," +
    "isnull(C.ADDRESS,'') Street," +
    "isnull(C.ZIP,'') PostalCode," +
    "isnull(C.city,'') City," +
    "isnull(D.shortcut,'') Country," +
    "isnull(E.CCCS1DXGLN,'') ShipToILN," +
    "isnull(E.NAME,'') ShipToName," +
    "isnull(E.ADDRESS,'') ShipToStreet," +
    "isnull(E.ZIP,'') ShipToPostalCode," +
    "isnull(E.CITY,'') ShipToCity," +
    "isnull(F.SHORTCUT,'') ShipToCountry," +
    "isnull(G.CCCS1DXGLN,'') SellerILN," +
    "isnull(A.CCCSELLERID,'') BuyerSellerID," +
    "isnull(G.AFM,'') SellerTaxID," +
    "isnull(Stuff(Stuff(G.BGREPNAME,9,0,'-'),18,0,'-'),'') BankAccount," +
    "isnull(G.BGREPTITLE,'') BankName," +
    "isnull(G.NAME,'') SellerName," +
    "isnull(G.ADDRESS,'') SellerStreet," +
    "isnull(G.ZIP,'') SellerPostalCode," +
    "isnull(G.CITY,'') SellerCity," +
    "isnull(H.SHORTCUT,'') SellerCountry," +
    // PHONE2, not PHONE1 - both proven scripts read PHONE2, which is empty on this company, so
    // every accepted invoice carries <Tel></Tel>. PHONE1 ('0723.319.834') is a deviation.
    "isnull(G.PHONE2,'') SellerTel," +
    "(SELECT Count(*) FROM mtrlines WHERE findoc=A.findoc AND sodtype=51) NumberOfLines," +
    "convert(varchar(36),cast(round(A.NETAMNT,2) as numeric(36,2))) NetValue," +
    "convert(varchar(36),cast(round(A.VATAMNT,2) as numeric(36,2))) TaxValue," +
    "convert(varchar(36),cast(round(A.NETAMNT,2) as numeric(36,2))) TaxableValue," +
    "convert(varchar(36),cast(round(A.SUMAMNT,2) as numeric(36,2))) GrossValue " +
    "FROM findoc A " +
    "LEFT OUTER JOIN mtrdoc B ON A.findoc=B.findoc " +
    "LEFT OUTER JOIN trdr C ON A.trdr=C.trdr " +
    "LEFT OUTER JOIN country D ON C.country=D.country " +
    "LEFT OUTER JOIN trdbranch E ON A.trdbranch=E.trdbranch " +
    "LEFT OUTER JOIN country F ON E.country=F.country " +
    "LEFT OUTER JOIN company G ON A.company=G.company " +
    "LEFT OUTER JOIN country H ON G.country=H.country " +
    "WHERE A.findoc=:1 AND A.expn=0 AND A.fprms=712";
  return X.GETSQLDATASET(sql, findoc);
}

function dedemanHeader(findoc) {
  var sql =
    "SELECT isnull(A.fincode,'') InvoiceNumber," +
    "isnull(CONVERT(VARCHAR(10),A.trndate,120),'') Data," +
    "(SELECT TOP 1 isnull(CONVERT(VARCHAR(10),finaldate,120),'') FROM finpayterms WHERE findoc=A.findoc) InvoiceDueDate," +
    "cast('' as varchar) Comment," +
    "isnull(A.num04,'') BuyerOrderNumber," +
    "(SELECT isnull(CONVERT(VARCHAR(10),trndate,120),'') FROM findoc WHERE num04=A.num04 and series=7012 and iscancel=0 " +
    "and findoc=(select findoc from findoc where findoc=(select top 1 findocs from mtrlines where findoc=(select top 1 findocs from mtrlines where findoc=A.findoc)))) BuyerOrderDate," +
    "isnull(convert(varchar(10),B.delivdate,120),'') DeliveryDate," +
    "(SELECT TOP 1 isnull(b1.fincode,'') FROM mtrlines a1 LEFT OUTER JOIN findoc b1 ON a1.findocs=b1.findoc WHERE a1.findoc=A.findoc AND a1.findocs IS NOT NULL) DeliveryDocumentNumber," +
    "(SELECT TOP 1 isnull(CONVERT(VARCHAR(10),b1.trndate,120),'') FROM mtrlines a1 LEFT OUTER JOIN findoc b1 ON a1.findocs=b1.findoc WHERE a1.findoc=A.findoc AND a1.findocs IS NOT NULL) DeliveryDocumentDate," +
    "isnull(C.CCCS1DXGLN,'') ILN," +
    "isnull(C.BGBULSTAT+C.AFM,'') TaxID," +
    "isnull(C.NAME,'') Name," +
    "isnull(C.ADDRESS,'') Street," +
    "isnull(C.ZIP,'') PostalCode," +
    "isnull(C.city,'') City," +
    "isnull(D.shortcut,'') Country," +
    "isnull(E.CCCS1DXGLN,'') ShipToILN," +
    "isnull(E.NAME,'') ShipToName," +
    "isnull(E.ADDRESS,'') ShipToStreet," +
    "isnull(E.ZIP,'') ShipToPostalCode," +
    "isnull(E.CITY,'') ShipToCity," +
    "isnull(F.SHORTCUT,'') ShipToCountry," +
    "isnull(G.CCCS1DXGLN,'') SellerILN," +
    "isnull(A.CCCSELLERID,'') BuyerSellerID," +
    "isnull(G.AFM,'') SellerTaxID," +
    "isnull(Stuff(Stuff(G.BGREPNAME,9,0,'-'),18,0,'-'),'') BankAccount," +
    "isnull(G.BGREPTITLE,'') BankName," +
    "isnull(G.NAME,'') SellerName," +
    "isnull(G.ADDRESS,'') SellerStreet," +
    "isnull(G.ZIP,'') SellerPostalCode," +
    "isnull(G.CITY,'') SellerCity," +
    "isnull(H.SHORTCUT,'') SellerCountry," +
    "isnull(G.PHONE2,'') SellerTel," +
    "(SELECT Count(*) FROM mtrlines WHERE findoc=A.findoc AND sodtype=51) NumberOfLines," +
    "convert(varchar(36),cast(round(A.NETAMNT,2) as numeric(36,2))) NetValue," +
    "convert(varchar(36),cast(round(A.VATAMNT,2) as numeric(36,2))) TaxValue," +
    "convert(varchar(36),cast(round(A.NETAMNT,2) as numeric(36,2))) TaxableValue," +
    "convert(varchar(36),cast(round(A.SUMAMNT,2) as numeric(36,2))) GrossValue " +
    "FROM findoc A " +
    "LEFT OUTER JOIN mtrdoc B ON A.findoc=B.findoc " +
    "LEFT OUTER JOIN trdr C ON A.trdr=C.trdr " +
    "LEFT OUTER JOIN country D ON C.country=D.country " +
    "LEFT OUTER JOIN trdbranch E ON A.trdbranch=E.trdbranch " +
    "LEFT OUTER JOIN country F ON E.country=F.country " +
    "LEFT OUTER JOIN company G ON A.company=G.company " +
    "LEFT OUTER JOIN country H ON G.country=H.country " +
    "WHERE A.findoc=:1 AND A.Series IN (7123,7033) AND A.iscancel=0 AND A.sosource=1351 AND A.company=50 AND A.trdr=11654";
  return X.GETSQLDATASET(sql, findoc);
}

function taxSummary(findoc) {
  // Identical query in both proven scripts - only the hardcoded TaxCategoryCoded literal differs,
  // and that is applied per-retailer in buildXml() instead of duplicating this query.
  var sql =
    "SELECT convert(varchar(36),cast(round(B.percnt,2) as numeric(36,2))) TaxPercent," +
    "convert(varchar(36),cast(round(A.SUBVAL,2) as numeric(36,2))) TaxNettoAmount," +
    "convert(varchar(36),cast(round(A.SUBVAL,2) as numeric(36,2))) TaxableAmount," +
    "convert(varchar(36),cast(round(A.VATVAL,2) as numeric(36,2))) TaxAmount," +
    "convert(varchar(36),cast(round(A.SUBVAL+A.VATVAL,2) as numeric(36,2))) TaxGrossAmount " +
    "FROM vatanal A LEFT OUTER JOIN vat B ON A.vat=B.vat WHERE A.findoc=:1";
  return X.GETSQLDATASET(sql, findoc);
}

// ---- Line queries ----
// ItemNum is deliberately NOT read from these datasets: the proven scripts write a running
// fetch-order counter instead of the SQL's own ItemNum/linenum column (verified against both
// .soimport.txt sources) - buildXml() replicates that with its own counter, ordered by linenum.

function auchanLines(findoc) {
  var sql =
    "SELECT isnull(B.code1,'') EAN," +
    "isnull(D.code,'') BuyerItemID," +
    "isnull(B.code,'') SellerItemID," +
    "isnull(E.CODE,'') CustomTariffNumber," +
    "isnull(D.UnitPack,'') PacketContentQuantity," +
    "convert(varchar(36),cast(round(A.QTY1,2) as numeric(36,2))) QuantityValue," +
    "isnull(F.percnt,'') TaxPercent," +
    "convert(varchar(36),cast(round(A.VATAMNT,2) as numeric(36,2))) TaxAmount," +
    "convert(varchar(36),cast(round(A.TRNLINEVAL+A.VATAMNT,2) as numeric(36,2))) MonetaryGrossValue," +
    "convert(varchar(36),cast(round(A.TRNLINEVAL,2) as numeric(36,2))) MonetaryNetValue," +
    "convert(varchar(36),cast(round(A.TRNLINEVAL+A.VATAMNT,2) as numeric(36,2))) MonetaryAmountPayable," +
    "isnull(G.SHORTCUT,'') UnitOfMeasure," +
    "convert(varchar(36),cast(Round(A.TRNLINEVAL/A.QTY1,3) as numeric(36,3))) UnitPriceValue," +
    "convert(varchar(36),cast(Round((A.TRNLINEVAL+A.VATAMNT)/A.QTY1,2) as numeric(36,2))) UnitPriceValueGross," +
    "B.NAME Name " +
    "FROM mtrlines A " +
    "LEFT OUTER JOIN mtrl B ON A.mtrl=B.mtrl " +
    "LEFT OUTER JOIN findoc C ON A.findoc=C.findoc " +
    "LEFT OUTER JOIN cccs1dxtrdrmtrl D ON A.mtrl=D.mtrl AND C.trdr=D.trdr " +
    "LEFT OUTER JOIN intrastat E ON B.intrastat=E.intrastat " +
    "LEFT OUTER JOIN vat F ON A.vat=F.vat " +
    "LEFT OUTER JOIN mtrunit G ON B.MTRUNIT1=G.MTRUNIT " +
    "WHERE A.findoc=:1 AND A.sodtype=51 " +
    "ORDER BY A.linenum";
  return X.GETSQLDATASET(sql, findoc);
}

function dedemanLines(findoc) {
  // Aggregated per source-document group (a.findocs), exactly as ExpFactDedeman_ButonNew does -
  // including the hardcoded " + Taxa verde " name suffix on every line. This looks like a
  // template artefact, but it is the proven, beneficiary-vouched production behaviour: replicate
  // as-is, do not "fix" it.
  var sql =
    "SELECT isnull(B.CODE1,'') EAN," +
    "isnull(D.CODE,'') BuyerItemID," +
    "isnull(B.code,'') SellerItemID," +
    "isnull(E.CODE,'') CustomTariffNumber," +
    "convert(varchar(36),cast(round(sum(A.QTY1),2) as numeric(36,2))) QuantityValue," +
    "convert(varchar(36),cast(round(isnull(max(F.percnt),0),2) as numeric(36,2))) TaxPercent," +
    "convert(varchar(36),cast(round(sum(A.VATAMNT),2) as numeric(36,2))) TaxAmount," +
    "convert(varchar(36),cast(round(sum(A.TRNLINEVAL+A.VATAMNT),2) as numeric(36,2))) MonetaryGrossValue," +
    "convert(varchar(36),cast(round(sum(A.TRNLINEVAL),2) as numeric(36,2))) MonetaryNetValue," +
    "convert(varchar(36),cast(round(sum(A.TRNLINEVAL+A.VATAMNT),2) as numeric(36,2))) MonetaryAmountPayable," +
    "isnull(max(G.SHORTCUT),'') UnitOfMeasure," +
    "convert(varchar(36),cast(Round(sum(A.TRNLINEVAL)/sum(A.QTY1),3) as numeric(36,3))) UnitPriceValue," +
    "convert(varchar(36),cast(Round((sum(A.TRNLINEVAL+A.VATAMNT))/sum(A.QTY1),2) as numeric(36,2))) UnitPriceValueGross," +
    "replace(B.NAME,'&',' ') + ' + Taxa verde ' Name," +
    "(SELECT isnull(num04,'') FROM findoc WHERE findoc=A.findocs) BuyerOrderNumber," +
    "(SELECT isnull(CONVERT(VARCHAR(10),trndate,120),'') FROM findoc WHERE findoc=A.findocs) BuyerOrderDate " +
    "FROM mtrlines A " +
    "LEFT OUTER JOIN mtrl B ON A.mtrl=B.mtrl " +
    "LEFT OUTER JOIN findoc C ON A.findoc=C.findoc " +
    "LEFT OUTER JOIN CCCS1DXTRDRMTRL D ON A.mtrl=D.mtrl AND C.trdr=D.trdr " +
    "LEFT OUTER JOIN intrastat E ON B.intrastat=E.intrastat and A.company=E.company " +
    "LEFT OUTER JOIN vat F ON A.vat=F.vat " +
    "LEFT OUTER JOIN mtrunit G ON B.MTRUNIT1=G.MTRUNIT and A.company=G.company " +
    "WHERE A.findoc=:1 AND A.sodtype=51 " +
    "GROUP BY B.CODE1, D.code, B.code, E.code, B.name, A.findocs";
  return X.GETSQLDATASET(sql, findoc);
}

// ---- Validation (M fields only - D/optional fields are allowed to be blank) ----
// BuyerParty/ShipToParty <PostalCode> is deliberately NOT checked here (spec marks it M) - live
// data shows TRDR.ZIP/TRDBRANCH.ZIP is NULL for the large majority of real invoices (measured
// 2026-08-27: 84% of the last 90 days, both retailers), and the proven scripts never gated on it
// either. Same "spec says M, real practice is lenient" pattern as HouseNumber - still emitted
// blank in the XML when absent, just not treated as a blocking error. <Contact><Tel> is not
// checked for the same reason: COMPANY.PHONE2 is empty, so every accepted invoice has it blank.

function validate(dsHeader, dsLinii) {
  var erori = [];
  function need(cond, label) { if (!cond) erori.push(label); }

  need(dsHeader.InvoiceNumber, '<InvoiceNumber> lipsa');
  need(dsHeader.Data, '<Date> lipsa');
  need(dsHeader.InvoiceDueDate, '<InvoiceDueDate> lipsa - verificati FINPAYTERMS');
  need(dsHeader.BuyerOrderNumber, '<OrderParty><BuyerOrderNumber> lipsa - completati NUM04 pe document');
  need(dsHeader.BuyerOrderDate, '<OrderParty><BuyerOrderDate> lipsa');
  need(dsHeader.DeliveryDate, '<DeliveryParty><DeliveryDate> lipsa - verificati MTRDOC.DELIVDATE pe avizul sursa');
  need(dsHeader.DeliveryDocumentNumber, '<DeliveryParty><DeliveryDocumentNumber> lipsa - verificati MTRLINES.FINDOCS');
  need(dsHeader.DeliveryDocumentDate, '<DeliveryParty><DeliveryDocumentDate> lipsa');
  need(dsHeader.ILN, '<BuyerParty><ILN> lipsa - verificati CCCS1DXGLN pe partener');
  need(dsHeader.TaxID, '<BuyerParty><TaxID> lipsa');
  need(dsHeader.Name, '<BuyerParty><Name> lipsa');
  need(dsHeader.Street, '<BuyerParty><Street> lipsa');
  need(dsHeader.City, '<BuyerParty><City> lipsa');
  need(dsHeader.ShipToILN, '<ShipToParty><ILN> lipsa - verificati CCCS1DXGLN pe filiala (TRDBRANCH)');
  need(dsHeader.ShipToName, '<ShipToParty><Name> lipsa');
  need(dsHeader.ShipToStreet, '<ShipToParty><Street> lipsa');
  need(dsHeader.ShipToCity, '<ShipToParty><City> lipsa');
  need(dsHeader.SellerILN, '<SellerParty><ILN> lipsa - verificati CCCS1DXGLN pe companie');
  need(dsHeader.SellerTaxID, '<SellerParty><TaxID> lipsa');
  need(dsHeader.BankAccount, '<SellerParty><BankAccount> lipsa - verificati BGREPNAME pe companie');
  need(dsHeader.SellerName, '<SellerParty><Name> lipsa');
  need(dsHeader.SellerStreet, '<SellerParty><Street> lipsa');
  need(dsHeader.SellerPostalCode, '<SellerParty><PostalCode> lipsa');
  need(dsHeader.SellerCity, '<SellerParty><City> lipsa');

  dsLinii.FIRST;
  var n = 0;
  while (!dsLinii.EOF) {
    n++;
    var ln = 'Linia ' + n + ': ';
    need(dsLinii.EAN, ln + '<EAN> lipsa');
    need(dsLinii.BuyerItemID, ln + '<BuyerItemID> lipsa - verificati CCCS1DXTRDRMTRL');
    need(dsLinii.UnitOfMeasure, ln + '<UnitOfMeasure> lipsa');
    need(dsLinii.Name, ln + '<Name> lipsa');
    dsLinii.NEXT;
  }
  dsLinii.FIRST;

  return erori;
}

// ---- XML assembly ----

function buildXml(dsHeader, dsTax, dsLinii, retailer, taxCategory, person) {
  var xml = [];
  xml.push('<?xml version="1.0" encoding="iso-8859-2"?>');
  xml.push('<Invoice Version="1.0.1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.infinite.pl/pub/doc/fmt/xml/invoice/1.0/invoice.xsd">');

  xml.push('<InvoiceHeader>');
  xml.push(' ' + tag('InvoiceNumber', dsHeader.InvoiceNumber));
  xml.push(' ' + tag('Date', dsHeader.Data));
  xml.push(' ' + tag('InvoiceDueDate', dsHeader.InvoiceDueDate));
  xml.push(' ' + tag('PaymentTermsQualifier', '3'));
  xml.push(' <PaymentMethod>');
  xml.push('  ' + tag('Code', '42'));
  xml.push('  ' + tag('Description', ''));
  xml.push(' </PaymentMethod>');
  xml.push(' ' + tag('InvoiceCurrencyCoded', 'RON'));
  xml.push(' ' + tag('InvoicePurposeCoded', 'O'));
  xml.push(' ' + tag('DocumentRole', 'O'));
  xml.push(' ' + tag('Comment', dsHeader.Comment));
  xml.push('</InvoiceHeader>');

  xml.push('<InvoiceParty>');

  xml.push(' <OrderParty>');
  xml.push('  ' + tag('BuyerOrderNumber', dsHeader.BuyerOrderNumber));
  xml.push('  ' + tag('BuyerOrderDate', dsHeader.BuyerOrderDate));
  xml.push(' </OrderParty>');

  xml.push(' <DeliveryParty>');
  xml.push('  ' + tag('DeliveryDate', dsHeader.DeliveryDate));
  xml.push('  ' + tag('DeliveryDocumentNumber', dsHeader.DeliveryDocumentNumber));
  xml.push('  ' + tag('DeliveryDocumentDate', dsHeader.DeliveryDocumentDate));
  xml.push(' </DeliveryParty>');

  xml.push(' <BuyerParty>');
  xml.push('  ' + tag('ILN', dsHeader.ILN));
  xml.push('  ' + tag('TaxID', dsHeader.TaxID));
  xml.push('  ' + tag('Name', dsHeader.Name));
  xml.push('  ' + tag('Street', dsHeader.Street));
  xml.push('  ' + tag('HouseNumber', ''));
  xml.push('  ' + tag('PostalCode', dsHeader.PostalCode));
  xml.push('  ' + tag('City', dsHeader.City));
  xml.push('  ' + tag('Country', dsHeader.Country || 'RO'));
  xml.push(' </BuyerParty>');

  // InvoiceeParty = BuyerParty, verbatim, in both proven scripts.
  xml.push(' <InvoiceeParty>');
  xml.push('  ' + tag('ILN', dsHeader.ILN));
  xml.push('  ' + tag('Name', dsHeader.Name));
  xml.push('  ' + tag('Street', dsHeader.Street));
  xml.push('  ' + tag('HouseNumber', ''));
  xml.push('  ' + tag('PostalCode', dsHeader.PostalCode));
  xml.push('  ' + tag('City', dsHeader.City));
  xml.push('  ' + tag('Country', dsHeader.Country || 'RO'));
  xml.push(' </InvoiceeParty>');

  xml.push(' <ShipToParty>');
  xml.push('  ' + tag('ILN', dsHeader.ShipToILN));
  xml.push('  ' + tag('Name', dsHeader.ShipToName));
  xml.push('  ' + tag('Street', dsHeader.ShipToStreet));
  xml.push('  ' + tag('HouseNumber', ''));
  xml.push('  ' + tag('PostalCode', dsHeader.ShipToPostalCode));
  xml.push('  ' + tag('City', dsHeader.ShipToCity));
  xml.push('  ' + tag('Country', dsHeader.ShipToCountry || 'RO'));
  xml.push(' </ShipToParty>');

  xml.push(' <SellerParty>');
  xml.push('  ' + tag('ILN', dsHeader.SellerILN));
  xml.push('  ' + tag('BuyerSellerID', dsHeader.BuyerSellerID));
  xml.push('  ' + tag('TaxID', dsHeader.SellerTaxID));
  xml.push('  ' + tag('BankAccount', dsHeader.BankAccount));
  xml.push('  ' + tag('BankAccountOwner', ''));
  xml.push('  ' + tag('BankName', dsHeader.BankName));
  xml.push('  ' + tag('Name', dsHeader.SellerName));
  xml.push('  ' + tag('Street', dsHeader.SellerStreet));
  xml.push('  ' + tag('HouseNumber', ''));
  xml.push('  ' + tag('PostalCode', dsHeader.SellerPostalCode));
  xml.push('  ' + tag('City', dsHeader.SellerCity));
  xml.push('  ' + tag('Country', dsHeader.SellerCountry || 'RO'));
  xml.push('  <Contact>');
  xml.push('   ' + tag('Person', person));
  xml.push('   ' + tag('Tel', dsHeader.SellerTel));
  xml.push('  </Contact>');
  xml.push(' </SellerParty>');

  // ShipFromParty is always emitted empty in both proven scripts.
  xml.push(' <ShipFromParty>');
  xml.push('  ' + tag('ILN', ''));
  xml.push('  ' + tag('Name', ''));
  xml.push('  ' + tag('Street', ''));
  xml.push('  ' + tag('HouseNumber', ''));
  xml.push('  ' + tag('PostalCode', ''));
  xml.push('  ' + tag('City', ''));
  xml.push('  ' + tag('Country', ''));
  xml.push(' </ShipFromParty>');

  xml.push('</InvoiceParty>');

  xml.push('<InvoiceDetail>');
  var n = 0;
  dsLinii.FIRST;
  while (!dsLinii.EOF) {
    n++;
    xml.push(' <Item>');
    xml.push('  ' + tag('ItemNum', n));
    xml.push('  ' + tag('EAN', dsLinii.EAN));
    xml.push('  ' + tag('BuyerItemID', dsLinii.BuyerItemID));
    xml.push('  ' + tag('SellerItemID', dsLinii.SellerItemID));
    xml.push('  ' + tag('CustomTariffNumber', dsLinii.CustomTariffNumber));
    xml.push('  ' + tag('ProductIdentifierExt', 'CU'));
    xml.push('  ' + tag('PacketContentQuantity', retailer == 'auchan' ? dsLinii.PacketContentQuantity : ''));
    xml.push('  ' + tag('PackageType', retailer == 'auchan' ? 'CT' : ''));
    xml.push('  ' + tag('QuantityValue', dsLinii.QuantityValue));
    xml.push('  ' + tag('TaxCategoryCoded', taxCategory));
    xml.push('  ' + tag('TaxPercent', dsLinii.TaxPercent));
    xml.push('  ' + tag('TaxAmount', dsLinii.TaxAmount));
    xml.push('  ' + tag('MonetaryGrossValue', dsLinii.MonetaryGrossValue));
    xml.push('  ' + tag('MonetaryNetValue', dsLinii.MonetaryNetValue));
    xml.push('  ' + tag('MonetaryAmountPayable', dsLinii.MonetaryAmountPayable));
    xml.push('  ' + tag('UnitOfMeasure', dsLinii.UnitOfMeasure));
    xml.push('  ' + tag('UnitOfMeasureXCBL', ''));
    xml.push('  ' + tag('PackUnitOfMeasure', dsLinii.UnitOfMeasure));
    xml.push('  ' + tag('UnitPriceValue', dsLinii.UnitPriceValue));
    xml.push('  ' + tag('UnitPriceValueGross', dsLinii.UnitPriceValueGross));
    xml.push('  ' + tag('Name', dsLinii.Name));
    if (retailer == 'dedeman') {
      // Per-item Order/DeliveryDetail only exist in ExpFactDedeman_ButonNew - Auchan's proven
      // script never emits them on the line level (only the header OrderParty/DeliveryParty).
      xml.push('  <Order>');
      xml.push('   ' + tag('BuyerOrderNumber', dsLinii.BuyerOrderNumber));
      xml.push('   ' + tag('BuyerOrderDate', dsLinii.BuyerOrderDate));
      xml.push('  </Order>');
      xml.push('  <DeliveryDetail>');
      xml.push('   ' + tag('DeliveryDate', dsHeader.DeliveryDate));
      xml.push('   ' + tag('DeliveryDocumentNumber', dsHeader.DeliveryDocumentNumber));
      xml.push('  </DeliveryDetail>');
    }
    xml.push(' </Item>');
    dsLinii.NEXT;
  }
  xml.push('</InvoiceDetail>');

  xml.push('<InvoiceSummary>');
  xml.push(' ' + tag('NumberOfLines', dsHeader.NumberOfLines));
  xml.push(' ' + tag('NetValue', dsHeader.NetValue));
  xml.push(' ' + tag('TaxValue', dsHeader.TaxValue));
  xml.push(' ' + tag('TaxableValue', dsHeader.TaxableValue));
  xml.push(' ' + tag('GrossValue', dsHeader.GrossValue));
  xml.push(' <TaxSummary>');
  dsTax.FIRST;
  while (!dsTax.EOF) {
    xml.push('  <Tax>');
    xml.push('   ' + tag('TaxCategoryCoded', taxCategory));
    xml.push('   ' + tag('TaxPercent', dsTax.TaxPercent));
    xml.push('   ' + tag('TaxNettoAmount', dsTax.TaxNettoAmount));
    xml.push('   ' + tag('TaxableAmount', dsTax.TaxableAmount));
    xml.push('   ' + tag('TaxAmount', dsTax.TaxAmount));
    xml.push('   ' + tag('TaxGrossAmount', dsTax.TaxGrossAmount));
    xml.push('  </Tax>');
    dsTax.NEXT;
  }
  xml.push(' </TaxSummary>');
  xml.push('</InvoiceSummary>');

  xml.push('</Invoice>');
  return xml.join('\r\n');
}
