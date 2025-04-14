//Cod specific S1 - AJS

var doc,
  SALDOC = X.SALDOC,
  MTRDOC = X.MTRDOC,
  FINPAYTERMS = X.FINPAYTERMS,
  debugg_mode = {},
test_mode = {},
findoc_exception = 0,
denumireDocProcess = '',
folderPath = 'C:\\S1Print\\FTP\\Online\\';

//CustomerAssignedAccountID default => 3446, trdr=13249 => 3103211
const defaultCustomerAssignedAccountID = 3446;
//array for particular cases
const customerAssignedAccountID = [
    {trdr: 13249, CustomerAssignedAccountID: 3103211},
    {trdr: 78631, CustomerAssignedAccountID: 15121},
    {trdr: 11322, CustomerAssignedAccountID: 15121},
    {trdr: 11639, CustomerAssignedAccountID: 3446},
    {trdr: 12349, CustomerAssignedAccountID: 10011546},
];

//teste------------------IN PRODUCTIE TOATE PE FALSE---------------------------------------------------------
//false = no test
test_mode.trimiteInv2DanteFromDocProc = false;
test_mode.getComDanteFromDocProc = false;
//false = mo debugging messaging
debugg_mode.trimiteInv2DanteFromDocProc = false;
debugg_mode.getComDanteFromDocProc = false;

function runExternalCode(objFindoc) {
  //web service: 1002
  var findoc = objFindoc.findoc
  if ((X.SYS.USER = 1002)) {
    doc = X.CreateObj('SALDOC;EF')
    try {
      doc.DBLocate(findoc)
      MTRDOC = doc.FindTable('MTRDOC')
      SALDOC = doc.FindTable('SALDOC')
      FINPAYTERMS = doc.FindTable('FINPAYTERMS')
    } catch (e) {
      X.WARNING('Error: ' + e.message)
    }
  }

  return createDanteInvoice()
}

function createDanteInvoice() {
    denumireDocProcess = 'INVOIC_' + SALDOC.SERIESNUM + '_VAT_' +
        X.SQL("select coalesce(afm, 'RO25190857') as PartyIdentification from company where company=" + X.SYS.COMPANY, null) + '.xml';
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
        if ((j == 0 || j == 1) && debugg_mode.trimiteInv2DanteFromDocProc) {
            debugger;
        }
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
                if ((i == 0 || i == 1) && (j == 0 || j == 1) && debugg_mode.trimiteInv2DanteFromDocProc) {
                    debugger;
                }
                
                if (dsSrc.FIELDS(i)) {
                    dsNoDups.FIELDS(i) = dsSrc.FIELDS(i);
                }
            }
            dsNoDups.POST;
        }
        dsSrc.NEXT;
    }

    return createSomeInvoice(dsNoDups);
}

function createSomeInvoice(dsIte) {
    var trimis = false,
    data_trimitere = X.SQL('select CCCXMLSendDate from mtrdoc where findoc=' + SALDOC.FINDOC, null);
    if (data_trimitere) {
        trimis = true;
        X.WARNING('Xml file already sent in ' + data_trimitere);
    }

    // if (trimis)
    //     return {dom: null, trimis: trimis, filename: null, computername: null, message: 'Xml file already sent in ' + data_trimitere};

    //dependente:
    var companyData = X.GETSQLDATASET('select coalesce(afm, null) as PartyIdentification, coalesce(name, null) as PartyName, coalesce(city, null) as CityName, ' +
            'coalesce(zip, null) as PostalZone, coalesce(district, null) as sector, ' +
            'coalesce(BGBULSTAT, null) as CompanyID, coalesce(IDENTITYNUM, null) as CorporateStockAmount, coalesce(NAME3, null) as PayerFinancialAccountID, ' +
            ' coalesce(NAME2, null) as PayerFinancialAccountName, ' +
            "CCCNUMESTREDIDX as StreetName, 118 as BuildingNumber " +
            ' from company where isactive = 1 and company=' + X.SYS.COMPANY, null);
    if (!companyData.RECORDCOUNT) {
        X.WARNING('Nu gasesc datele companiei PET FACTORY)...');
        return {dom: null, trimis: trimis, filename: null, computername: null, message: 'Nu gasesc datele companiei PET FACTORY)'};
    }

    if (SALDOC.TRDR) {
        var danteData = X.GETSQLDATASET("SELECT (select b.name from TRDBANKACC a inner join bank b on (a.bank=b.bank) where a.trdr="+SALDOC.TRDR+") bank, (select a.iban from TRDBANKACC a inner join bank b on (a.bank=b.bank) where a.trdr="+SALDOC.TRDR+") as iban, concat(coalesce(bgbulstat, null), coalesce(afm, null)) as PartyIdentification, name as PartyName, CCCDOCPROCCITY as CityName, " +
                'coalesce(zip, null) as PostalZone, coalesce(CCCNUMESTREDIDX, null) as StreetName, coalesce(CCCNREDIDX, null) as BuildingNumber, coalesce(JOBTYPETRD, null) as CompanyID, coalesce(remarks, null) remarks, ' +
                'coalesce(CCCS1DXGLN, null) as CustomerLocationCoordinate, coalesce(CCCGLNFORCUSTOMER, null) SupplierLocationCoordinate ' +
                'from trdr where isactive=1 and company=' + X.SYS.COMPANY + ' and trdr=' + SALDOC.TRDR, null);
        if (!danteData.RECORDCOUNT) {
            X.WARNING('Nu gasesc datele companiei EMAG (DANTE)...');
            return {dom: null, trimis: trimis, filename: null, computername: null, message: 'Nu gasesc datele companiei EMAG (DANTE)'};
        }
    } else {
        X.WARNING('Alegeti clientul...');
    }

    if (SALDOC.TRDBRANCH) {
        var depozitLivrare = X.GETSQLDATASET('select coalesce(CCCS1DXGLN, null) as ID, coalesce(name, null) as Description, coalesce(address, null) as StreetName, ' +
                'coalesce(city, null) as CityName, coalesce(CCCBUILDINGNUMBER, null) BuildingNumber, coalesce(ZIP, null) PostalZone from trdbranch where isactive=1 and trdbranch=' + SALDOC.TRDBRANCH, null);
        if (!depozitLivrare) {
            X.WARNING('Nu gasesc date depozit livrare.');
            return {dom: null, trimis: trimis, filename: null, computername: null, message: 'Nu gasesc date depozit livrare'};
        }
    } else {
        X.WARNING('Alegeti filiala...');
        return {dom: null, trimis: trimis, filename: null, computername: null, message: 'Alegeti filiala'};
    }

    //first level; create _Invoice var:
    var inv = createInvoice();
    if (SALDOC.FINDOC < 0)
        return {dom: null, trimis: trimis, filename: null, computername: null, message: 'Nu gasesc documentul de vanzare'};

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
                UIRef: 'CUSTOMER.CCCGLNFORCUSTOMER',
                UIVal: danteData.SupplierLocationCoordinate,
                x: 'Party.PostalAddress.LocationCoordinate'
            },{
                UIRef: 'COMPANY.AFM',
                UIVal: companyData.PartyIdentification,
                x: 'Party.PartyIdentification'
            }, {
                UIRef: 'COMPANY.NAME',
                UIVal: companyData.PartyName,
                x: 'Party.PartyName'
            }, {
                UIRef: 'StreetName',
                UIVal: companyData.StreetName,
                x: 'Party.PostalAddress.StreetName'
            }, {
                UIRef: 'BuildingNumber',
                UIVal: companyData.BuildingNumber,
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
    inv.set_AccountingCustomerParty([{
                UIRef: 'CUSTOMER.CCCS1DXGLN',
                UIVal: danteData.CustomerLocationCoordinate,
                x: 'Party.PostalAddress.LocationCoordinate'
            },{
                UIRef: 'COMPANY.AFM',
                UIVal: danteData.PartyIdentification,
                x: 'Party.PartyIdentification'
            }, {
                UIRef: 'COMPANY.NAME',
                UIVal: danteData.PartyName,
                x: 'Party.PartyName'
            }, {
                UIRef: 'StreetName',
                UIVal: danteData.StreetName,
                x: 'Party.PostalAddress.StreetName'
            }, {
                UIRef: 'BuildingNumber',
                UIVal: danteData.BuildingNumber,
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
                UIRef: 'CUSBRANCH.CCCBUILDINGNUMBER',
                UIVal: checkNull(depozitLivrare, 'BuildingNumber', depozitLivrare.BuildingNumber),
                x: 'DeliveryLocation.LocationAddress.BuildingNumber'
            }, {
                UIRef: 'CUSBRANCH.CITY',
                UIVal: checkNull(depozitLivrare, 'CityName', depozitLivrare.CityName),
                x: 'DeliveryLocation.LocationAddress.CityName'
            }, //post code
            {
                UIRef: 'CUSBRANCH.ZIP',
                UIVal: checkNull(depozitLivrare, 'PostalZone', depozitLivrare.PostalZone),
                x: 'DeliveryLocation.LocationAddress.PostalZone'
            }/* ,
            //country
            {
                UIRef: 'RO',
                UIVal: SALDOC.TRDR == 12349 ? 'RO' : null,
                x: 'DeliveryLocation.LocationAddress.CountryCode'
            } */
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
                UIVal: checkNull(danteData, 'iban', danteData.iban),
                x: 'PayeeFinancialAccount.ID'
            }, {
                UIRef: 'Banca Dante',
                UIVal: checkNull(danteData, 'bank', danteData.bank),
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
        }, {
            UIRef: nrLinie + ': dsIte.LNETLINEVAL + dsItet.VATAMNT',
            UIVal: precise_round(parseFloat(dsIte.LNETLINEVAL) + parseFloat(dsIte.VATAMNT), 2),
            x: 'TaxInclusiveAmount'
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
                    //AdditionalInformation
                      UIRef: 'AdditionalInformation',
                      UIVal: SALDOC.TRDR == 12349 ? 'ReturnableMaterialIndicator:false ' : null,
                      x: 'AdditionalInformation'  
                },{
                    UIRef: nrLinie + ': dsIte.MTRL_ITEM_CODE1',
                    UIVal: X.SQL('select CODE1 from mtrl where mtrl=' + dsIte.MTRL, null),
                    x: 'StandardItemIdentification.ID'
                }, {
                    UIRef: nrLinie + ': CCCS1DXTRDRMTRL (Cod client)',
                    UIVal: X.SQL('select code from CCCS1DXTRDRMTRL where mtrl=' + dsIte.MTRL + ' and trdr=' + SALDOC.TRDR + 'and msodtype=51 and tsodtype=13', null),
                    x: 'BuyersItemIdentification.ID'
                }, {
                    UIRef: nrLinie + ': dsIte.MTRL_ITEM_CODE (Cod vanzator)',
                    UIVal: X.SQL('select CODE from mtrl where mtrl=' + dsIte.MTRL, null),
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
        return {dom: null, trimis: trimis, filename: null, computername: null, message: 'Erori de rezolvat:\n' + mess + '\n\nXML errors:\n' + xmlMess};
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
    //X.EXCEPTION(folderPath + denumireDocProcess + ' ' + dom + ' ' + trimis);
    var computerName;
    //get computer name through WMI
    try {
        var locator = new ActiveXObject("WbemScripting.SWbemLocator");
        var service = locator.ConnectServer(".");
        var properties = service.ExecQuery("SELECT * FROM Win32_OperatingSystem");
        var e = new Enumerator(properties);
        computerName = e.item().CSName;
    } catch (e) {
        computerName = 'N/A';
    }
    
    if (X.SYS.USER == 1002) {
        return {dom: dom, trimis: trimis, filename: denumireDocProcess, computername: computerName};
    } else {
        SaveStringToFile(folderPath + denumireDocProcess, dom, trimis);
        if (!test_mode.trimiteInv2DanteFromDocProc) {
            ftp2DocProc(folderPath + denumireDocProcess, folderPath, trimis);
            X.WARNING('Am trimis XML la DocProcess. Mai multe detalii in fisierul ' + folderPath + 'WinSCP.log');
        } else {
            X.WARNING('XML salvat local, netrimis.');
        }
    }
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
                PostalZone: getPrimitiveObj(null, false, 'string', 35, '700805', 'PostalZone'),
                CountryCode: getPrimitiveObj(null, false, 'string', 35, 'RO', 'CountryCode'),
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
                    var ERPUnitCode = X.SQL('select shortcut from mtrunit where mtrunit=' + mtrunit, null);
                    var codeLaClient = X.SQL('select shortcut from CCCALTTRDRMTRUNIT where mtrunit=' + mtrunit + ' and trdr_retailer=' + SALDOC.TRDR, null);
                    unitCode = codeLaClient ? codeLaClient : 'PCE';
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
        TaxInclusiveAmount: {
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

                    return '<TaxInclusiveAmount>' + emptyFunction(amnt, 2) + '</TaxInclusiveAmount>';
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
        //additional information
        AdditionalInformation: getPrimitiveObj(null, false, 'string', 255, 'ReturnableMaterialIndicator:false', 'AdditionalInformation'),
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
                    LocationCoordinate: getPrimitiveObj(null, false, 'string', 13, '5940475754006/4049728610005', 'LocationCoordinate'),
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
            retObj.CustomerAssignedAccountID = getPrimitiveObj(defaultCustomerAssignedAccountID.toString(), true, 'string', 20, '3446', 'CustomerAssignedAccountID');
            customerAssignedAccountID.every(function (el) {
                if (el.trdr == SALDOC.TRDR) {
                    retObj.CustomerAssignedAccountID = getPrimitiveObj(el.CustomerAssignedAccountID, true, 'string', 20, 'default: 3446', 'CustomerAssignedAccountID');
                    return false;
                } else return true;
            });
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
        set_CurrentInvoiceLine: function (ID, qtyMtrunit, lnetlineval, taxInclusiveAmount) {
            //ID, InvoicedQuantity@unitCode, LineExtensionAmount
            _InvoiceLines.push(copy(_lineTemplate));
            _CurrentInvoiceLine = _InvoiceLines[_InvoiceLines.length - 1];
            if (bindUI(ID.UIRef, ID.UIVal, _CurrentInvoiceLine.ID))
                _CurrentInvoiceLine.Count++;
            //debugger;
            _CurrentInvoiceLine.InvoicedQuantity = _CurrentInvoiceLine.calcInvoicedQuantity(qtyMtrunit.QTY1, qtyMtrunit.MTRUNIT);
            if (bindUI(lnetlineval.UIRef, lnetlineval.UIVal, _CurrentInvoiceLine.LineExtensionAmount))
                _CurrentInvoiceLine.Count++;
            if (bindUI(taxInclusiveAmount.UIRef, taxInclusiveAmount.UIVal, _CurrentInvoiceLine.TaxInclusiveAmount))
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

function SaveStringToFile(temp_filename, text, trimis) {
    if (trimis)
        return;
    var fso,
    f1;
    try {
    fso = new ActiveXObject("Scripting.FileSystemObject");
    f1 = fso.CreateTextFile(temp_filename, true);
    //f1 = fso.OpenTextFile(temp_filename, 2);
    f1.write(text);
    f1.Close();
    } catch (e) {
    X.WARNING(e.message + '\n' + temp_filename + '\n' + text);
    } finally {
    fso = null;
    f1 = null;
    }
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

        //X.WARNING('sFile=' + sFile + '\nvArguments=' + vArguments + '\nvDirectory=' + vDirectory + '\nvOperation=' + vOperation + '\nvShow=' + vShow);

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

function checkNull(obj, strField, valField) {
    if (obj.ISNULL(strField) == 1)
        return null;
    else
        return valField;
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