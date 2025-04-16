Sinteză Discuție - Implementare Platformă EDI Pet Factory
1. Analiză Structură Documente XML
Am analizat structura documentelor EDI primite de la diferiți retaileri:

Comandă Kaufland - format UBL standard cu identificatori GLN
Comandă eMAG - format UBL similar, cu variații minore
Factură emisă - format DXInvoice cu structură complexă, inclusiv linii și informații fiscale
S-a observat că majoritatea documentelor respectă standardul UBL (Universal Business Language), ceea ce permite o abordare unificată pentru procesare.

2. Arhitectura Bazei de Date
Am definit schema completă pentru noua platformă EDI:

Tabele Principale
CCCEDIRAWDOCUMENTS - stocarea documentelor XML brute
CCCEDIPROCESSMONITOR - monitorizarea procesării documentelor
CCCEDIGLNMAPPINGS - maparea codurilor GLN la retaileri
CCCEDIRETAILERROUTING - controlul migrării retailerilor între sisteme
CCCEDIRETAILERMIGRATIONLOG - audit pentru procesul de migrare
Modificări Tabele Existente
Extensie CCCXMLS1MAPPINGS pentru suport flexibil de transformări
Extindere CCCDOCUMENTES1MAPPINGS pentru tipuri multiple de documente
3. Strategie de Migrare Controlată
Am stabilit o strategie graduală de migrare care permite:

Rularea în paralel a sistemelor vechi și nou
Procesarea selectivă a retailerilor pe fiecare sistem
Configurarea separată pentru fiecare retailer (PROCESS_IN_LEGACY)
Configurare Retaileri Existenți:
Migrați în noua platformă: Sezamo, Auchan, Dedeman
Rămân în sistemul legacy: Carrefour, eMAG, Kaufland, Metro, Cora, Profi, Supeco
4. Implementare Procesare Documente
S-a dezvoltat codul pentru procesarea comenzilor:

Extragere date din documentele XML UBL
Identificarea retailerilor după GLN
Maparea câmpurilor XML la câmpuri S1
Integrare cu business objects Soft1 pentru creare documente
Înregistrare detaliată a pașilor de procesare pentru debugging
5. Optimizări de Performanță
Am adăugat indecși strategici pentru performanță:

6. Concluzii și Pași Următori
Implementare bază de date: Executarea scripturilor de migrare în ordinea definită
Configurare retaileri: Setarea configurațiilor inițiale pentru procesarea documentelor
Testare paralelă: Validarea funcționalității pe retailerii pilot
Migrare graduală: Transferul controlat al retailerilor din sistemul legacy în noua platformă
Arhitectura dezvoltată permite tranziția lină între cele două sisteme și gestionarea eficientă a documentelor EDI în format UBL.

*Copilot, datele din tabele in acest moment:
CCCEDIRETAILERROUTING	TRDR_RETAILER	PROCESS_IN_LEGACY	ACTIVE	MIGRATION_DATE	MIGRATED_BY	NOTES	name
1	11322	1	1		SYSTEM		Carrefour Romania S.A.
2	11639	1	1		SYSTEM		DANTE INTERNATIONAL SA
3	11654	0	1		SYSTEM		DEDEMAN SRL
4	12349	1	1		SYSTEM		KAUFLAND ROMANIA SCS 
5	12664	1	1		SYSTEM		Metro Cash & Carry Romania S.R.L.
6	13249	1	1		SYSTEM		ROMANIA HYPERMARCHE SA
7	38804	1	1		SYSTEM		PROFI ROM FOOD SRL
8	78631	1	1		SYSTEM		Supeco Investment S.R.L.
9	126888	0	1		SYSTEM		Sezamo S.R.L.
10	13248	0	1		SYSTEM		Auchan Romania S.A.

CCCDOCUMENTES1MAPPINGS	TRDR_RETAILER	TRDR_CLIENT	SOSOURCE	FPRMS	SERIES	INITIALDIRIN	INITIALDIROUT	DOCUMENT_TYPE	DIRECTION	AUTO_PROCESS	ACTIVE	TEST_MODE	XML_ROOT_PATH	HEADER_PATH	LINES_PATH	MODIFIED_DATE	CREATED_BY	CREATED_DATE	BUYER_ID_PATH	SELLER_ID_PATH	DOCUMENT_DATE_PATH	LINE_ITEM_PATH	LINE_QTY_PATH
13	11639	1	1351	701	7012	/001G_rFRDUyK4xAMVFfEFelF5WNqhBNujBx38gMmV1fVqIGLNZoQg5f/out		ORDER	INBOUND	1	1	0	/Order	/Order	/Order/OrderLine		1000	16/04/2025 13:50					
34	78631	1	1351	701	7012	/001G_rFRDUyK4xAMVFfEFelF5WNqhBNujBx38gMmV1fVqIGLNZoQg5f/out		ORDER	INBOUND	1	1	0	/Order	/Order	/Order/OrderLine		1000	16/04/2025 13:50					
35	78631	1	1351	712	7121		/001G_rFRDUyK4xAMVFfEFelF5WNqhBNujBx38gMmV1fVqIGLNZoQg5f/in	INVIOCE	OUTBOUND	1	1	0	/DXInvoice	/DXInvoice/Invoice	/DXInvoice/InvoiceLine		1000	16/04/2025 13:50					
36	11639	1	1351	712	7121		/001G_rFRDUyK4xAMVFfEFelF5WNqhBNujBx38gMmV1fVqIGLNZoQg5f/in	INVIOCE	OUTBOUND	1	1	0	/DXInvoice	/DXInvoice/Invoice	/DXInvoice/InvoiceLine		1000	16/04/2025 13:50					
37	11322	1	1351	701	7012	/001G_rFRDUyK4xAMVFfEFelF5WNqhBNujBx38gMmV1fVqIGLNZoQg5f/out		ORDER	INBOUND	1	1	0	/Order	/Order	/Order/OrderLine		1000	16/04/2025 13:50					
38	11322	1	1351	712	7121		/001G_rFRDUyK4xAMVFfEFelF5WNqhBNujBx38gMmV1fVqIGLNZoQg5f/in	INVIOCE	OUTBOUND	1	1	0	/DXInvoice	/DXInvoice/Invoice	/DXInvoice/InvoiceLine		1000	16/04/2025 13:50					
39	13249	1	1351	701	7012	/001G_rFRDUyK4xAMVFfEFelF5WNqhBNujBx38gMmV1fVqIGLNZoQg5f/out		ORDER	INBOUND	1	1	0	/Order	/Order	/Order/OrderLine		1000	16/04/2025 13:50					
40	13249	1	1351	712	7121		/001G_rFRDUyK4xAMVFfEFelF5WNqhBNujBx38gMmV1fVqIGLNZoQg5f/in	INVIOCE	OUTBOUND	1	1	0	/DXInvoice	/DXInvoice/Invoice	/DXInvoice/InvoiceLine		1000	16/04/2025 13:50					
41	12349	1	1351	701	7012	/001G_rFRDUyK4xAMVFfEFelF5WNqhBNujBx38gMmV1fVqIGLNZoQg5f/out		ORDER	INBOUND	1	1	0	/Order	/Order	/Order/OrderLine		1000	16/04/2025 13:50					
42	12349	1	1351	712	7121		/001G_rFRDUyK4xAMVFfEFelF5WNqhBNujBx38gMmV1fVqIGLNZoQg5f/in	INVIOCE	OUTBOUND	1	1	0	/DXInvoice	/DXInvoice/Invoice	/DXInvoice/InvoiceLine		1000	16/04/2025 13:50					
43	11654	1	1351	701	7012	/orders		ORDER	INBOUND	1	1	0	/Order	/Order	/Order/OrderLine		1000	16/04/2025 13:50					
44	11654	1	1351	711	7111		/desadv	DESADV	OUTBOUND	1	1	0	/Order	/Order	/Order/OrderLine		1000	16/04/2025 13:50					
45	11654	1	1351	716	7123		/invoice	INVIOCE	OUTBOUND	1	1	0	/DXInvoice	/DXInvoice/Invoice	/DXInvoice/InvoiceLine		1000	16/04/2025 13:50					
46	11654	1	1351	753	7531	/retanns		RETANNS	INBOUND	1	1	0	/Order	/Order	/Order/OrderLine		1000	16/04/2025 13:50					
47	12664	1	1351	701	7012	/001G_rFRDUyK4xAMVFfEFelF5WNqhBNujBx38gMmV1fVqIGLNZoQg5f/out		ORDER	INBOUND	1	1	0	/Order	/Order	/Order/OrderLine		1000	16/04/2025 13:50					
48	38804	1	1351	701	7012	/001G_rFRDUyK4xAMVFfEFelF5WNqhBNujBx38gMmV1fVqIGLNZoQg5f/out		ORDER	INBOUND	1	1	0	/Order	/Order	/Order/OrderLine		1000	16/04/2025 13:50					

CCCXMLS1MAPPINGS	XMLNODE	MANDATORY	S1TABLE1	S1FIELD1	S1TABLE2	S1FIELD2	CCCDOCUMENTES1MAPPINGS	SQL	OBSERVATII	XMLORDER	SIZE	FORMAT	XML_PATH	S1_TABLE	S1_FIELD	DEFAULT_VALUE	TRANSFORMATION	TRANSFORMATION_PARAMS	REQUIRED	POSITION	IS_ATTRIBUTE	PREFIX_FILTER	SOURCE_TYPE
41	RequestedDeliveryPeriod/EndDate	1	MTRDOC	DELIVDATE			13						RequestedDeliveryPeriod/EndDate	MTRDOC	DELIVDATE				1		0		
42	ID	1	SALDOC	NUM04			13						ID	SALDOC	NUM04				1		0		
43	IssueDate	1	SALDOC	DATE01			13						IssueDate	SALDOC	DATE01				1		0		
44	DeliveryParty/EndpointID	1	SALDOC	TRDBRANCH			13	select trdbranch from trdbranch where trdr=11639 AND cccs1dxgln='{value}'					DeliveryParty/EndpointID	SALDOC	TRDBRANCH		SQL_TRANSFORM	select trdbranch from trdbranch where trdr=11639 AND cccs1dxgln='{value}'	1		0		
45	OrderLine/Price/Amount	1	ITELINES	PRICE			13						OrderLine/Price/Amount	ITELINES	PRICE				1		0		
46	OrderLine/Quantity/Amount	1	ITELINES	QTY1			13						OrderLine/Quantity/Amount	ITELINES	QTY1				1		0		
47	OrderLine/Item/BuyersItemIdentification	1	ITELINES	MTRL			13	select mtrl from CCCS1DXTRDRMTRL where trdr=11639 and code='{value}'					OrderLine/Item/BuyersItemIdentification	ITELINES	MTRL		SQL_TRANSFORM	select mtrl from CCCS1DXTRDRMTRL where trdr=11639 and code='{value}'	1		0		
757	RequestedDeliveryPeriod/EndDate	1	MTRDOC	DELIVDATE			34						RequestedDeliveryPeriod/EndDate	MTRDOC	DELIVDATE				1		0		
758	ID	1	SALDOC	NUM04			34						ID	SALDOC	NUM04				1		0		
759	IssueDate	1	SALDOC	DATE01			34						IssueDate	SALDOC	DATE01				1		0		
760	DeliveryParty/EndpointID	1	SALDOC	TRDBRANCH			34	select trdbranch from trdbranch where trdr=78631 and cccs1dxgln='{value}'					DeliveryParty/EndpointID	SALDOC	TRDBRANCH		SQL_TRANSFORM	select trdbranch from trdbranch where trdr=78631 and cccs1dxgln='{value}'	1		0		
761	OrderLine/Price/Amount	1	ITELINES	PRICE			34						OrderLine/Price/Amount	ITELINES	PRICE				1		0		
762	OrderLine/Quantity/Amount	1	ITELINES	QTY1			34						OrderLine/Quantity/Amount	ITELINES	QTY1				1		0		
763	OrderLine/Item/BuyersItemIdentification	1	ITELINES	MTRL			34	select mtrl from cccs1dxtrdrmtrl where trdr=78631 and code='{value}'					OrderLine/Item/BuyersItemIdentification	ITELINES	MTRL		SQL_TRANSFORM	select mtrl from cccs1dxtrdrmtrl where trdr=78631 and code='{value}'	1		0		
764	DXInvoice/InvoiceLine/TaxTotal/TaxAmount	1	ITELINES	VATAMNT			35			77.0			DXInvoice/InvoiceLine/TaxTotal/TaxAmount	ITELINES	VATAMNT				1	77	0		
765	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/ID	1					35	SELECT '7'		77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/ID			7	SQL_TRANSFORM	SELECT '7'	1	77	0		
766	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/Name	1					35	SELECT 'S'		77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/Name			S	SQL_TRANSFORM	SELECT 'S'	1	77	0		
767	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/TaxTypeCode	1					35	SELECT 'VAT'		77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/TaxTypeCode			VAT	SQL_TRANSFORM	SELECT 'VAT'	1	77	0		
768	DXInvoice/Invoice/AccountingCustomerParty/Party/PartyIdentification	1	SALDOC	TRDR_CUSTOMER_AFM			35			35.001			DXInvoice/Invoice/AccountingCustomerParty/Party/PartyIdentification	SALDOC	TRDR_CUSTOMER_AFM				1	35	0		
769	DXInvoice/Invoice/AccountingCustomerParty/Party/PartyLegalEntity/CompanyID	1	SALDOC	TRDR_CUSTOMER_JOBTYPETRD			35			35.007			DXInvoice/Invoice/AccountingCustomerParty/Party/PartyLegalEntity/CompanyID	SALDOC	TRDR_CUSTOMER_JOBTYPETRD				1	35	0		
770	DXInvoice/Invoice/AccountingCustomerParty/Party/PartyName	1	SALDOC	TRDR_CUSTOMER_NAME			35			35.002			DXInvoice/Invoice/AccountingCustomerParty/Party/PartyName	SALDOC	TRDR_CUSTOMER_NAME				1	35	0		
771	DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/BuildingNumber	1					35	select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=78631)) a) b where nr=2		35.014			DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/BuildingNumber				SQL_TRANSFORM	select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=78631)) a) b where nr=2	1	35	0		
772	DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/CityName	1					35	select concat((select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=78631)) a) b where nr=4), ' ' , (select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=78631)) a) b where nr=5))		35.019			DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/CityName				SQL_TRANSFORM	select concat((select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=78631)) a) b where nr=4), ' ' , (select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=78631)) a) b where nr=5))	1	35	0		
773	DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/Country/IdentificationCode	1	SALDOC	TRDR_CUSTOMER_BGBULSTAT			35			35.028			DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/Country/IdentificationCode	SALDOC	TRDR_CUSTOMER_BGBULSTAT				1	35	0		
774	DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/StreetName	1					35	select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=78631)) a) b where nr=1		35.01			DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/StreetName				SQL_TRANSFORM	select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=78631)) a) b where nr=1	1	35	0		
775	DXInvoice/Invoice/AccountingSupplierParty/CustomerAssignedAccountID	1					35	select '3446'	3446	25.0			DXInvoice/Invoice/AccountingSupplierParty/CustomerAssignedAccountID			3446	SQL_TRANSFORM	select '3446'	1	25	0		
776	DXInvoice/Invoice/AccountingSupplierParty/Party/PartyIdentification	1	SALDOC	COMPANY_COMPANY_AFM			35			27.001			DXInvoice/Invoice/AccountingSupplierParty/Party/PartyIdentification	SALDOC	COMPANY_COMPANY_AFM				1	27	0		
777	DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CompanyID	1	SALDOC	COMPANY_COMPANY_BGBULSTAT			35			27.007			DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CompanyID	SALDOC	COMPANY_COMPANY_BGBULSTAT				1	27	0		
778	DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CorporateStockAmount/__attributes/currencyID	1	SALDOC	COMPANY_COMPANY_SOCURRENCY			35			27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CorporateStockAmount/__attributes/currencyID	SALDOC	COMPANY_COMPANY_SOCURRENCY				1	27	0		
779	DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CorporateStockAmount/__value	1	SALDOC	COMPANY_COMPANY_IDENTITYNUM			35		test	27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CorporateStockAmount/__value	SALDOC	COMPANY_COMPANY_IDENTITYNUM				1	27	0		
780	DXInvoice/Invoice/AccountingSupplierParty/Party/PartyName	1	SALDOC	COMPANY_COMPANY_NAME			35			27.002			DXInvoice/Invoice/AccountingSupplierParty/Party/PartyName	SALDOC	COMPANY_COMPANY_NAME				1	27	0		
781	DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/BuildingNumber	1					35	SELECT '118'		27.014			DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/BuildingNumber			118	SQL_TRANSFORM	SELECT '118'	1	27	0		
782	DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/CityName	1					35	SELECT CONCAT(CITY, ', ', DISTRICT) FROM COMPANY WHERE COMPANY=50		27.019			DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/CityName				SQL_TRANSFORM	SELECT CONCAT(CITY, ', ', DISTRICT) FROM COMPANY WHERE COMPANY=50	1	27	0		
783	DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/Country/IdentificationCode	1					35	select 'RO'		27.028			DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/Country/IdentificationCode			RO	SQL_TRANSFORM	select 'RO'	1	27	0		
784	DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/PostalZone	1	SALDOC	COMPANY_COMPANY_ZIP			35			27.02			DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/PostalZone	SALDOC	COMPANY_COMPANY_ZIP				1	27	0		
785	DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/StreetName	1					35	SELECT 'Sos. Giurgiului'		27.01			DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/StreetName			Sos. Giurgiului	SQL_TRANSFORM	SELECT 'Sos. Giurgiului'	1	27	0		
786	DXInvoice/Invoice/CustomizationID	1					35	SELECT 'FMF'	FMF (impus)	1.0			DXInvoice/Invoice/CustomizationID			FMF	SQL_TRANSFORM	SELECT 'FMF'	1	1	0		
787	DXInvoice/Invoice/CopyIndicator	1					35	select 'FALSE'		4.0			DXInvoice/Invoice/CopyIndicator			FALSE	SQL_TRANSFORM	select 'FALSE'	1	4	0		
788	DXInvoice/Invoice/Delivery/ActualDeliveryDate	1	MTRDOC	DELIVDATE			35			39.0			DXInvoice/Invoice/Delivery/ActualDeliveryDate	MTRDOC	DELIVDATE				1	39	0		
789	DXInvoice/Invoice/Delivery/DeliveryLocation/ID	1	SALDOC	TRDBRANCH_CUSBRANCH_CCCS1DXGLN			35			39.0			DXInvoice/Invoice/Delivery/DeliveryLocation/ID	SALDOC	TRDBRANCH_CUSBRANCH_CCCS1DXGLN				1	39	0		
790	DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/CityName	1	SALDOC	TRDBRANCH_CUSBRANCH_CITY			35			39.0			DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/CityName	SALDOC	TRDBRANCH_CUSBRANCH_CITY				1	39	0		
791	DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/Country/IdentificationCode	1					35	SELECT 'RO'		39.0			DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/Country/IdentificationCode			RO	SQL_TRANSFORM	SELECT 'RO'	1	39	0		
792	DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/StreetName	1	SALDOC	TRDBRANCH_CUSBRANCH_ADDRESS			35			39.0			DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/StreetName	SALDOC	TRDBRANCH_CUSBRANCH_ADDRESS				1	39	0		
793	DXInvoice/Invoice/DespatchDocumentReference/ID	1	MTRDOC	CCCDispatcheDoc			35			18.0			DXInvoice/Invoice/DespatchDocumentReference/ID	MTRDOC	CCCDispatcheDoc				1	18	0		
794	DXInvoice/Invoice/DespatchDocumentReference/IssueDate	1	MTRDOC	CCCDispatcheDate			35			18.0			DXInvoice/Invoice/DespatchDocumentReference/IssueDate	MTRDOC	CCCDispatcheDate				1	18	0		
795	DXInvoice/Invoice/DocumentCurrencyCode	1	SALDOC	SOCURRENCY			35			10.0			DXInvoice/Invoice/DocumentCurrencyCode	SALDOC	SOCURRENCY				1	10	0		
796	DXInvoice/Invoice/ID	1	SALDOC	SERIESNUM			35			3.0			DXInvoice/Invoice/ID	SALDOC	SERIESNUM				1	3	0		
797	DXInvoice/Invoice/InvoiceTypeCode	1			SALDOC	FINDOC	35	"SELECT case series 
when 7121 then 380
when 7531 then 381
end
FROM FINDOC WHERE FINDOC={S1Table2.S1Field2}"	380 = original invoice, 381 = storno invoice, 384 = correction invoice	8.0			DXInvoice/Invoice/InvoiceTypeCode				SQL_TRANSFORM	"SELECT case series 
when 7121 then 380
when 7531 then 381
end
FROM FINDOC WHERE FINDOC=SALDOC.FINDOC"	1	8	0		
798	DXInvoice/Invoice/LegalMonetaryTotal/TaxExclusiveAmount	1	SALDOC	NETAMNT			35			54.0			DXInvoice/Invoice/LegalMonetaryTotal/TaxExclusiveAmount	SALDOC	NETAMNT				1	54	0		
799	DXInvoice/Invoice/LegalMonetaryTotal/TaxInclusiveAmount	1	SALDOC	SUMAMNT			35			55.0			DXInvoice/Invoice/LegalMonetaryTotal/TaxInclusiveAmount	SALDOC	SUMAMNT				1	55	0		
800	DXInvoice/Invoice/IssueDate	1	SALDOC	TRNDATE			35			6.0			DXInvoice/Invoice/IssueDate	SALDOC	TRNDATE				1	6	0		
801	DXInvoice/Invoice/LineCountNumeric	1			SALDOC	FINDOC	35	select count(*) from mtrlines where findoc={S1Table2.S1Field2}		15.0			DXInvoice/Invoice/LineCountNumeric				SQL_TRANSFORM	select count(*) from mtrlines where findoc=SALDOC.FINDOC	1	15	0		
802	DXInvoice/Invoice/Note	1	SALDOC	REMARKS			35			9.0			DXInvoice/Invoice/Note	SALDOC	REMARKS				1	9	0		
803	DXInvoice/Invoice/OrderReference/IssueDate	1	SALDOC	DATE01			35			16.0			DXInvoice/Invoice/OrderReference/IssueDate	SALDOC	DATE01				1	16	0		
804	DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/CurrencyCode	1	SALDOC	COMPANY_COMPANY_SOCURRENCY			35			40.0			DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/CurrencyCode	SALDOC	COMPANY_COMPANY_SOCURRENCY				1	40	0		
805	DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/FinancialInstitutionBranch/FinancialInstitution/Address/Country/IdentificationCode	1					35	SELECT 'RO'		40.0			DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/FinancialInstitutionBranch/FinancialInstitution/Address/Country/IdentificationCode				SQL_TRANSFORM	SELECT 'RO'	1	40	0		
806	DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/ID	1					35	SELECT 'RO60RNCB0082B00132506875'		40.0			DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/ID			RO60RNCB0082B00132506875	SQL_TRANSFORM	SELECT 'RO60RNCB0082B00132506875'	1	40	0		
807	DXInvoice/Invoice/OrderReference/ID	1	SALDOC	NUM04			35			16.0			DXInvoice/Invoice/OrderReference/ID	SALDOC	NUM04				1	16	0		
808	DXInvoice/Invoice/PaymentMeans/PayerFinancialAccount/CurrencyCode	1					35	SELECT 'RON'		40.0			DXInvoice/Invoice/PaymentMeans/PayerFinancialAccount/CurrencyCode			RON	SQL_TRANSFORM	SELECT 'RON'	1	40	0		
809	DXInvoice/Invoice/PaymentMeans/PayerFinancialAccount/FinancialInstitutionBranch/FinancialInstitution/Address/Country/IdentificationCode	1					35	SELECT 'RO'		40.0			DXInvoice/Invoice/PaymentMeans/PayerFinancialAccount/FinancialInstitutionBranch/FinancialInstitution/Address/Country/IdentificationCode			RO	SQL_TRANSFORM	SELECT 'RO'	1	40	0		
810	DXInvoice/Invoice/PaymentMeans/PaymentMeansCode	1					35	SELECT '42'		40.0			DXInvoice/Invoice/PaymentMeans/PaymentMeansCode			42	SQL_TRANSFORM	SELECT '42'	1	40	0		
811	DXInvoice/Invoice/PaymentTerms/SettlementPeriod/DescriptionCode	1					35	SELECT 'D'		41.0			DXInvoice/Invoice/PaymentTerms/SettlementPeriod/DescriptionCode			D	SQL_TRANSFORM	SELECT 'D'	1	41	0		
812	DXInvoice/Invoice/TaxTotal/TaxSubtotal/Percent	1	VATANAL	VAT			35	SELECT '[' + STUFF((SELECT ',' + CONVERT(NVARCHAR(20), PERCNT) FROM VAT WHERE VAT in ({S1Table1.S1Field1}) FOR xml path('')), 1, 1, '') + ']'		51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/Percent	VATANAL	VAT		SQL_TRANSFORM	SELECT '[' + STUFF((SELECT ',' + CONVERT(NVARCHAR(20), PERCNT) FROM VAT WHERE VAT in ({S1Table1.S1Field1}) FOR xml path('')), 1, 1, '') + ']'	1	51	0		
813	DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxableAmount	1	VATANAL	LSUBVAL			35			51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxableAmount	VATANAL	LSUBVAL				1	51	0		
814	DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxAmount	1	VATANAL	LVATVAL			35			51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxAmount	VATANAL	LVATVAL				1	51	0		
815	DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/ID	1					35	select 7		51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/ID			7	SQL_TRANSFORM	select 7	1	51	0		
816	DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/Name	1					35	select 'S'	"Standard UNECE 5305. The value must be equal with one of the values: 
S = standard VAT,
B = reverse charge,
AC = TVA la incasare"	51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/Name			S	SQL_TRANSFORM	select 'S'	1	51	0		
817	DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/TaxTypeCode	1					35	select 'VAT'	VAT (impus)	51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/TaxTypeCode			VAT	SQL_TRANSFORM	select 'VAT'	1	51	0		
818	DXInvoice/InvoiceLine/ID	1	ITELINES	LINENUM			35			61.0			DXInvoice/InvoiceLine/ID	ITELINES	LINENUM				1	61	0		
819	DXInvoice/InvoiceLine/InvoicedQuantity/__attributes/unitCode	1	ITELINES	MTRUNIT			35	SELECT CCCDOCPROCESSSHORTCUT FROM MTRUNIT WHERE MTRUNIT={S1Table1.S1Field1}		63.0			DXInvoice/InvoiceLine/InvoicedQuantity/__attributes/unitCode	ITELINES	MTRUNIT		SQL_TRANSFORM	SELECT CCCDOCPROCESSSHORTCUT FROM MTRUNIT WHERE MTRUNIT=ITELINES.MTRUNIT	1	63	0		
820	DXInvoice/InvoiceLine/InvoicedQuantity/__value	1	ITELINES	QTY1			35			63.0			DXInvoice/InvoiceLine/InvoicedQuantity/__value	ITELINES	QTY1				1	63	0		
821	DXInvoice/InvoiceLine/Item/BuyersItemIdentification/ID	1	ITELINES	MTRL	SALDOC	TRDR	35	SELECT CODE FROM CCCS1DXTRDRMTRL WHERE MTRL={S1Table1.S1Field1} AND TRDR={S1Table2.S1Field2}		78.0			DXInvoice/InvoiceLine/Item/BuyersItemIdentification/ID	ITELINES	MTRL		SQL_TRANSFORM	SELECT CODE FROM CCCS1DXTRDRMTRL WHERE MTRL=ITELINES.MTRL AND TRDR=SALDOC.TRDR	1	78	0		
822	DXInvoice/InvoiceLine/Item/Description	1	ITELINES	MTRL_ITEM_NAME			35			78.0			DXInvoice/InvoiceLine/Item/Description	ITELINES	MTRL_ITEM_NAME				1	78	0		
823	DXInvoice/InvoiceLine/Item/SellersItemIdentification/ID	1	ITELINES	MTRL_ITEM_CODE			35			78.0			DXInvoice/InvoiceLine/Item/SellersItemIdentification/ID	ITELINES	MTRL_ITEM_CODE				1	78	0		
824	DXInvoice/InvoiceLine/Item/StandardItemIdentification/ID	1	ITELINES	MTRL_ITEM_CODE1			35			78.0			DXInvoice/InvoiceLine/Item/StandardItemIdentification/ID	ITELINES	MTRL_ITEM_CODE1				1	78	0		
825	DXInvoice/InvoiceLine/LineExtensionAmount	1	ITELINES	LNETLINEVAL			35			64.0			DXInvoice/InvoiceLine/LineExtensionAmount	ITELINES	LNETLINEVAL				1	64	0		
826	DXInvoice/InvoiceLine/Price/PriceAmount	1	ITELINES	PRICE			35			79.0			DXInvoice/InvoiceLine/Price/PriceAmount	ITELINES	PRICE				1	79	0		
827	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/Percent	1	ITELINES	VAT			35	SELECT '[' + STUFF((SELECT ',' + CONVERT(NVARCHAR(20), PERCNT) FROM VAT WHERE VAT in ({S1Table1.S1Field1}) FOR xml path('')), 1, 1, '') + ']'		77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/Percent	ITELINES	VAT		SQL_TRANSFORM	SELECT '[' + STUFF((SELECT ',' + CONVERT(NVARCHAR(20), PERCNT) FROM VAT WHERE VAT in ({S1Table1.S1Field1}) FOR xml path('')), 1, 1, '') + ']'	1	77	0		
828	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxableAmount	1	ITELINES	LNETLINEVAL			35			77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxableAmount	ITELINES	LNETLINEVAL				1	77	0		
829	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxAmount	1	ITELINES	VATAMNT			35			77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxAmount	ITELINES	VATAMNT				1	77	0		
830	DXInvoice/InvoiceLine/TaxTotal/TaxAmount	1	ITELINES	VATAMNT			36			77.0			DXInvoice/InvoiceLine/TaxTotal/TaxAmount	ITELINES	VATAMNT				1	77	0		
831	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/ID	1					36	SELECT '7'		77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/ID			7	SQL_TRANSFORM	SELECT '7'	1	77	0		
832	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/Name	1					36	SELECT 'S'		77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/Name			S	SQL_TRANSFORM	SELECT 'S'	1	77	0		
833	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/TaxTypeCode	1					36	SELECT 'VAT'		77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/TaxTypeCode			VAT	SQL_TRANSFORM	SELECT 'VAT'	1	77	0		
834	DXInvoice/Invoice/AccountingCustomerParty/Party/PartyIdentification	1	SALDOC	TRDR_CUSTOMER_AFM			36			35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PartyIdentification	SALDOC	TRDR_CUSTOMER_AFM				1	35	0		
835	DXInvoice/Invoice/AccountingCustomerParty/Party/PartyLegalEntity/CompanyID	1	SALDOC	TRDR_CUSTOMER_JOBTYPETRD			36			35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PartyLegalEntity/CompanyID	SALDOC	TRDR_CUSTOMER_JOBTYPETRD				1	35	0		
836	DXInvoice/Invoice/AccountingCustomerParty/Party/PartyName	1	SALDOC	TRDR_CUSTOMER_NAME			36			35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PartyName	SALDOC	TRDR_CUSTOMER_NAME				1	35	0		
837	DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/BuildingNumber	1					36	select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=2		35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/BuildingNumber				SQL_TRANSFORM	select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=2	1	35	0		
838	DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/CityName	1					36	select concat((select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=4), ' ' , (select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=5))		35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/CityName				SQL_TRANSFORM	select concat((select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=4), ' ' , (select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=5))	1	35	0		
839	DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/Country/IdentificationCode	1	SALDOC	TRDR_CUSTOMER_BGBULSTAT			36			35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/Country/IdentificationCode	SALDOC	TRDR_CUSTOMER_BGBULSTAT				1	35	0		
840	DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/StreetName	1					36	select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=1		35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/StreetName				SQL_TRANSFORM	select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=1	1	35	0		
841	DXInvoice/Invoice/AccountingSupplierParty/CustomerAssignedAccountID	1					36	select '3446'	3446	25.0			DXInvoice/Invoice/AccountingSupplierParty/CustomerAssignedAccountID			3446	SQL_TRANSFORM	select '3446'	1	25	0		
842	DXInvoice/Invoice/AccountingSupplierParty/Party/PartyIdentification	1	SALDOC	COMPANY_COMPANY_AFM			36			27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PartyIdentification	SALDOC	COMPANY_COMPANY_AFM				1	27	0		
843	DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CompanyID	1	SALDOC	COMPANY_COMPANY_BGBULSTAT			36			27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CompanyID	SALDOC	COMPANY_COMPANY_BGBULSTAT				1	27	0		
844	DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CorporateStockAmount/__attributes/currencyID	1	SALDOC	COMPANY_COMPANY_SOCURRENCY			36			27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CorporateStockAmount/__attributes/currencyID	SALDOC	COMPANY_COMPANY_SOCURRENCY				1	27	0		
845	DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CorporateStockAmount/__value	1	SALDOC	COMPANY_COMPANY_IDENTITYNUM			36		test	27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CorporateStockAmount/__value	SALDOC	COMPANY_COMPANY_IDENTITYNUM				1	27	0		
846	DXInvoice/Invoice/AccountingSupplierParty/Party/PartyName	1	SALDOC	COMPANY_COMPANY_NAME			36			27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PartyName	SALDOC	COMPANY_COMPANY_NAME				1	27	0		
847	DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/BuildingNumber	1					36	SELECT '118'		27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/BuildingNumber			118	SQL_TRANSFORM	SELECT '118'	1	27	0		
848	DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/CityName	1					36	SELECT CONCAT(CITY, ', ', DISTRICT) FROM COMPANY WHERE COMPANY=50		27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/CityName				SQL_TRANSFORM	SELECT CONCAT(CITY, ', ', DISTRICT) FROM COMPANY WHERE COMPANY=50	1	27	0		
849	DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/Country/IdentificationCode	1					36	select 'RO'		27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/Country/IdentificationCode			RO	SQL_TRANSFORM	select 'RO'	1	27	0		
850	DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/PostalZone	1	SALDOC	COMPANY_COMPANY_ZIP			36			27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/PostalZone	SALDOC	COMPANY_COMPANY_ZIP				1	27	0		
851	DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/StreetName	1					36	SELECT 'Sos. Giurgiului'		27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/StreetName			Sos. Giurgiului	SQL_TRANSFORM	SELECT 'Sos. Giurgiului'	1	27	0		
852	DXInvoice/Invoice/CustomizationID	1					36	SELECT 'FMF'	FMF (impus)	1.0			DXInvoice/Invoice/CustomizationID			FMF	SQL_TRANSFORM	SELECT 'FMF'	1	1	0		
853	DXInvoice/Invoice/CopyIndicator	1					36	select 'FALSE'		4.0			DXInvoice/Invoice/CopyIndicator			FALSE	SQL_TRANSFORM	select 'FALSE'	1	4	0		
854	DXInvoice/Invoice/Delivery/ActualDeliveryDate	1	MTRDOC	DELIVDATE			36			39.0			DXInvoice/Invoice/Delivery/ActualDeliveryDate	MTRDOC	DELIVDATE				1	39	0		
855	DXInvoice/Invoice/Delivery/DeliveryLocation/ID	1	SALDOC	TRDBRANCH_CUSBRANCH_CCCS1DXGLN			36			39.0			DXInvoice/Invoice/Delivery/DeliveryLocation/ID	SALDOC	TRDBRANCH_CUSBRANCH_CCCS1DXGLN				1	39	0		
856	DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/CityName	1	SALDOC	TRDBRANCH_CUSBRANCH_CITY			36			39.0			DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/CityName	SALDOC	TRDBRANCH_CUSBRANCH_CITY				1	39	0		
857	DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/Country/IdentificationCode	1					36	SELECT 'RO'		39.0			DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/Country/IdentificationCode			RO	SQL_TRANSFORM	SELECT 'RO'	1	39	0		
858	DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/StreetName	1	SALDOC	TRDBRANCH_CUSBRANCH_ADDRESS			36			39.0			DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/StreetName	SALDOC	TRDBRANCH_CUSBRANCH_ADDRESS				1	39	0		
859	DXInvoice/Invoice/DespatchDocumentReference/ID	1	MTRDOC	CCCDispatcheDoc			36			18.0			DXInvoice/Invoice/DespatchDocumentReference/ID	MTRDOC	CCCDispatcheDoc				1	18	0		
860	DXInvoice/Invoice/DespatchDocumentReference/IssueDate	1	MTRDOC	CCCDispatcheDate			36			18.0			DXInvoice/Invoice/DespatchDocumentReference/IssueDate	MTRDOC	CCCDispatcheDate				1	18	0		
861	DXInvoice/Invoice/DocumentCurrencyCode	1	SALDOC	SOCURRENCY			36			10.0			DXInvoice/Invoice/DocumentCurrencyCode	SALDOC	SOCURRENCY				1	10	0		
862	DXInvoice/Invoice/ID	1	SALDOC	SERIESNUM			36			3.0			DXInvoice/Invoice/ID	SALDOC	SERIESNUM				1	3	0		
863	DXInvoice/Invoice/InvoiceTypeCode	1			SALDOC	FINDOC	36	"SELECT case series 
when 7121 then 380
when 7531 then 381
end
FROM FINDOC WHERE FINDOC={S1Table2.S1Field2}"	380 = original invoice, 381 = storno invoice, 384 = correction invoice	8.0			DXInvoice/Invoice/InvoiceTypeCode				SQL_TRANSFORM	"SELECT case series 
when 7121 then 380
when 7531 then 381
end
FROM FINDOC WHERE FINDOC=SALDOC.FINDOC"	1	8	0		
864	DXInvoice/Invoice/LegalMonetaryTotal/TaxExclusiveAmount	1	SALDOC	NETAMNT			36			54.0			DXInvoice/Invoice/LegalMonetaryTotal/TaxExclusiveAmount	SALDOC	NETAMNT				1	54	0		
865	DXInvoice/Invoice/LegalMonetaryTotal/TaxInclusiveAmount	1	SALDOC	SUMAMNT			36			55.0			DXInvoice/Invoice/LegalMonetaryTotal/TaxInclusiveAmount	SALDOC	SUMAMNT				1	55	0		
866	DXInvoice/Invoice/IssueDate	1	SALDOC	TRNDATE			36			6.0			DXInvoice/Invoice/IssueDate	SALDOC	TRNDATE				1	6	0		
867	DXInvoice/Invoice/LineCountNumeric	1			SALDOC	FINDOC	36	select count(*) from mtrlines where findoc={S1Table2.S1Field2}		15.0			DXInvoice/Invoice/LineCountNumeric				SQL_TRANSFORM	select count(*) from mtrlines where findoc=SALDOC.FINDOC	1	15	0		
868	DXInvoice/Invoice/Note	1	SALDOC	REMARKS			36			9.0			DXInvoice/Invoice/Note	SALDOC	REMARKS				1	9	0		
869	DXInvoice/Invoice/OrderReference/IssueDate	1	SALDOC	DATE01			36			16.0			DXInvoice/Invoice/OrderReference/IssueDate	SALDOC	DATE01				1	16	0		
870	DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/CurrencyCode	1	SALDOC	COMPANY_COMPANY_SOCURRENCY			36			40.0			DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/CurrencyCode	SALDOC	COMPANY_COMPANY_SOCURRENCY				1	40	0		
871	DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/FinancialInstitutionBranch/FinancialInstitution/Address/Country/IdentificationCode	1					36	SELECT 'RO'		40.0			DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/FinancialInstitutionBranch/FinancialInstitution/Address/Country/IdentificationCode			RO	SQL_TRANSFORM	SELECT 'RO'	1	40	0		
872	DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/ID	1					36	SELECT 'RO60RNCB0082B00132506875'		40.0			DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/ID			RO60RNCB0082B00132506875	SQL_TRANSFORM	SELECT 'RO60RNCB0082B00132506875'	1	40	0		
873	DXInvoice/Invoice/OrderReference/ID	1	SALDOC	NUM04			36			16.0			DXInvoice/Invoice/OrderReference/ID	SALDOC	NUM04				1	16	0		
874	DXInvoice/Invoice/PaymentMeans/PayerFinancialAccount/CurrencyCode	1					36	SELECT 'RON'		40.0			DXInvoice/Invoice/PaymentMeans/PayerFinancialAccount/CurrencyCode			RON	SQL_TRANSFORM	SELECT 'RON'	1	40	0		
875	DXInvoice/Invoice/PaymentMeans/PayerFinancialAccount/FinancialInstitutionBranch/FinancialInstitution/Address/Country/IdentificationCode	1					36	SELECT 'RO'		40.0			DXInvoice/Invoice/PaymentMeans/PayerFinancialAccount/FinancialInstitutionBranch/FinancialInstitution/Address/Country/IdentificationCode			RO	SQL_TRANSFORM	SELECT 'RO'	1	40	0		
876	DXInvoice/Invoice/PaymentMeans/PaymentMeansCode	1					36	SELECT '42'		40.0			DXInvoice/Invoice/PaymentMeans/PaymentMeansCode			42	SQL_TRANSFORM	SELECT '42'	1	40	0		
877	DXInvoice/Invoice/PaymentTerms/SettlementPeriod/DescriptionCode	1					36	SELECT 'D'		41.0			DXInvoice/Invoice/PaymentTerms/SettlementPeriod/DescriptionCode			D	SQL_TRANSFORM	SELECT 'D'	1	41	0		
878	DXInvoice/Invoice/TaxTotal/TaxSubtotal/Percent	1	VATANAL	VAT			36	SELECT '[' + STUFF((SELECT ',' + CONVERT(NVARCHAR(20), PERCNT) FROM VAT WHERE VAT in ({S1Table1.S1Field1}) FOR xml path('')), 1, 1, '') + ']'		51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/Percent	VATANAL	VAT		SQL_TRANSFORM	SELECT '[' + STUFF((SELECT ',' + CONVERT(NVARCHAR(20), PERCNT) FROM VAT WHERE VAT in ({S1Table1.S1Field1}) FOR xml path('')), 1, 1, '') + ']'	1	51	0		
879	DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxableAmount	1	VATANAL	LSUBVAL			36			51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxableAmount	VATANAL	LSUBVAL				1	51	0		
880	DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxAmount	1	VATANAL	LVATVAL			36			51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxAmount	VATANAL	LVATVAL				1	51	0		
881	DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/ID	1					36	select 7		51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/ID			7	SQL_TRANSFORM	select 7	1	51	0		
882	DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/Name	1					36	select 'S'	"Standard UNECE 5305. The value must be equal with one of the values: 
S = standard VAT,
B = reverse charge,
AC = TVA la incasare"	51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/Name			S	SQL_TRANSFORM	select 'S'	1	51	0		
883	DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/TaxTypeCode	1					36	select 'VAT'	VAT (impus)	51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/TaxTypeCode			VAT	SQL_TRANSFORM	select 'VAT'	1	51	0		
884	DXInvoice/InvoiceLine/ID	1	ITELINES	LINENUM			36			61.0			DXInvoice/InvoiceLine/ID	ITELINES	LINENUM				1	61	0		
885	DXInvoice/InvoiceLine/InvoicedQuantity/__attributes/unitCode	1	ITELINES	MTRUNIT			36	SELECT CCCDOCPROCESSSHORTCUT FROM MTRUNIT WHERE MTRUNIT={S1Table1.S1Field1}		63.0			DXInvoice/InvoiceLine/InvoicedQuantity/__attributes/unitCode	ITELINES	MTRUNIT		SQL_TRANSFORM	SELECT CCCDOCPROCESSSHORTCUT FROM MTRUNIT WHERE MTRUNIT={S1Table1.S1Field1}	1	63	0		
886	DXInvoice/InvoiceLine/InvoicedQuantity/__value	1	ITELINES	QTY1			36			63.0			DXInvoice/InvoiceLine/InvoicedQuantity/__value	ITELINES	QTY1				1	63	0		
887	DXInvoice/InvoiceLine/Item/BuyersItemIdentification/ID	1	ITELINES	MTRL	SALDOC	TRDR	36	SELECT CODE FROM CCCS1DXTRDRMTRL WHERE MTRL={S1Table1.S1Field1} AND TRDR={S1Table2.S1Field2}		78.0			DXInvoice/InvoiceLine/Item/BuyersItemIdentification/ID	ITELINES	MTRL		SQL_TRANSFORM	SELECT CODE FROM CCCS1DXTRDRMTRL WHERE MTRL=ITELINES.MTRL AND TRDR=SALDOC.TRDR	1	78	0		
888	DXInvoice/InvoiceLine/Item/Description	1	ITELINES	MTRL_ITEM_NAME			36			78.0			DXInvoice/InvoiceLine/Item/Description	ITELINES	MTRL_ITEM_NAME				1	78	0		
889	DXInvoice/InvoiceLine/Item/SellersItemIdentification/ID	1	ITELINES	MTRL_ITEM_CODE			36			78.0			DXInvoice/InvoiceLine/Item/SellersItemIdentification/ID	ITELINES	MTRL_ITEM_CODE				1	78	0		
890	DXInvoice/InvoiceLine/Item/StandardItemIdentification/ID	1	ITELINES	MTRL_ITEM_CODE1			36			78.0			DXInvoice/InvoiceLine/Item/StandardItemIdentification/ID	ITELINES	MTRL_ITEM_CODE1				1	78	0		
891	DXInvoice/InvoiceLine/LineExtensionAmount	1	ITELINES	LNETLINEVAL			36			64.0			DXInvoice/InvoiceLine/LineExtensionAmount	ITELINES	LNETLINEVAL				1	64	0		
892	DXInvoice/InvoiceLine/Price/PriceAmount	1	ITELINES	PRICE			36			79.0			DXInvoice/InvoiceLine/Price/PriceAmount	ITELINES	PRICE				1	79	0		
893	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/Percent	1	ITELINES	VAT			36	SELECT '[' + STUFF((SELECT ',' + CONVERT(NVARCHAR(20), PERCNT) FROM VAT WHERE VAT in ({S1Table1.S1Field1}) FOR xml path('')), 1, 1, '') + ']'		77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/Percent	ITELINES	VAT		SQL_TRANSFORM	SELECT '[' + STUFF((SELECT ',' + CONVERT(NVARCHAR(20), PERCNT) FROM VAT WHERE VAT in ({S1Table1.S1Field1}) FOR xml path('')), 1, 1, '') + ']'	1	77	0		
894	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxableAmount	1	ITELINES	LNETLINEVAL			36			77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxableAmount	ITELINES	LNETLINEVAL				1	77	0		
895	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxAmount	1	ITELINES	VATAMNT			36			77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxAmount	ITELINES	VATAMNT				1	77	0		
896	DXInvoice/InvoiceLine/TaxTotal/TaxAmount	1	ITELINES	VATAMNT			38			77.0			DXInvoice/InvoiceLine/TaxTotal/TaxAmount	ITELINES	VATAMNT				1	77	0		
897	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/ID	1					38	SELECT '7'		77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/ID			7	SQL_TRANSFORM	SELECT '7'	1	77	0		
898	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/Name	1					38	SELECT 'S'		77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/Name			S	SQL_TRANSFORM	SELECT 'S'	1	77	0		
899	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/TaxTypeCode	1					38	SELECT 'VAT'		77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/TaxTypeCode			VAT	SQL_TRANSFORM	SELECT 'VAT'	1	77	0		
900	DXInvoice/Invoice/AccountingCustomerParty/Party/PartyIdentification	1	SALDOC	TRDR_CUSTOMER_AFM			38			35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PartyIdentification	SALDOC	TRDR_CUSTOMER_AFM				1	35	0		
901	DXInvoice/Invoice/AccountingCustomerParty/Party/PartyLegalEntity/CompanyID	1	SALDOC	TRDR_CUSTOMER_JOBTYPETRD			38			35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PartyLegalEntity/CompanyID	SALDOC	TRDR_CUSTOMER_JOBTYPETRD				1	35	0		
902	DXInvoice/Invoice/AccountingCustomerParty/Party/PartyName	1	SALDOC	TRDR_CUSTOMER_NAME			38			35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PartyName	SALDOC	TRDR_CUSTOMER_NAME				1	35	0		
903	DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/BuildingNumber	1					38	select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=2		35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/BuildingNumber				SQL_TRANSFORM	select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=2	1	35	0		
904	DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/CityName	1					38	select concat((select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=4), ' ' , (select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=5))		35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/CityName				SQL_TRANSFORM	select concat((select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=4), ' ' , (select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=5))	1	35	0		
905	DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/Country/IdentificationCode	1	SALDOC	TRDR_CUSTOMER_BGBULSTAT			38			35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/Country/IdentificationCode	SALDOC	TRDR_CUSTOMER_BGBULSTAT				1	35	0		
906	DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/StreetName	1					38	select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=1		35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/StreetName				SQL_TRANSFORM	select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=1	1	35	0		
907	DXInvoice/Invoice/AccountingSupplierParty/CustomerAssignedAccountID	1					38	select '3446'	3446	25.0			DXInvoice/Invoice/AccountingSupplierParty/CustomerAssignedAccountID			3446	SQL_TRANSFORM	select '3446'	1	25	0		
908	DXInvoice/Invoice/AccountingSupplierParty/Party/PartyIdentification	1	SALDOC	COMPANY_COMPANY_AFM			38			27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PartyIdentification	SALDOC	COMPANY_COMPANY_AFM				1	27	0		
909	DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CompanyID	1	SALDOC	COMPANY_COMPANY_BGBULSTAT			38			27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CompanyID	SALDOC	COMPANY_COMPANY_BGBULSTAT				1	27	0		
910	DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CorporateStockAmount/__attributes/currencyID	1	SALDOC	COMPANY_COMPANY_SOCURRENCY			38			27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CorporateStockAmount/__attributes/currencyID	SALDOC	COMPANY_COMPANY_SOCURRENCY				1	27	0		
911	DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CorporateStockAmount/__value	1	SALDOC	COMPANY_COMPANY_IDENTITYNUM			38		test	27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CorporateStockAmount/__value	SALDOC	COMPANY_COMPANY_IDENTITYNUM				1	27	0		
912	DXInvoice/Invoice/AccountingSupplierParty/Party/PartyName	1	SALDOC	COMPANY_COMPANY_NAME			38			27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PartyName	SALDOC	COMPANY_COMPANY_NAME				1	27	0		
913	DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/BuildingNumber	1					38	SELECT '118'		27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/BuildingNumber			118	SQL_TRANSFORM	SELECT '118'	1	27	0		
914	DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/CityName	1					38	SELECT CONCAT(CITY, ', ', DISTRICT) FROM COMPANY WHERE COMPANY=50		27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/CityName				SQL_TRANSFORM	SELECT CONCAT(CITY, ', ', DISTRICT) FROM COMPANY WHERE COMPANY=50	1	27	0		
915	DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/Country/IdentificationCode	1					38	select 'RO'		27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/Country/IdentificationCode			ROM	SQL_TRANSFORM	select 'RO'	1	27	0		
916	DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/PostalZone	1	SALDOC	COMPANY_COMPANY_ZIP			38			27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/PostalZone	SALDOC	COMPANY_COMPANY_ZIP				1	27	0		
917	DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/StreetName	1					38	SELECT 'Sos. Giurgiului'		27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/StreetName			Sos. Giurgiului	SQL_TRANSFORM	SELECT 'Sos. Giurgiului'	1	27	0		
918	DXInvoice/Invoice/CustomizationID	1					38	SELECT 'FMF'	FMF (impus)	1.0			DXInvoice/Invoice/CustomizationID			FMF	SQL_TRANSFORM	SELECT 'FMF'	1	1	0		
919	DXInvoice/Invoice/CopyIndicator	1					38	select 'FALSE'		4.0			DXInvoice/Invoice/CopyIndicator			FALSE	SQL_TRANSFORM	select 'FALSE'	1	4	0		
920	DXInvoice/Invoice/Delivery/ActualDeliveryDate	1	MTRDOC	DELIVDATE			38			39.0			DXInvoice/Invoice/Delivery/ActualDeliveryDate	MTRDOC	DELIVDATE				1	39	0		
921	DXInvoice/Invoice/Delivery/DeliveryLocation/ID	1	SALDOC	TRDBRANCH_CUSBRANCH_CCCS1DXGLN			38			39.0			DXInvoice/Invoice/Delivery/DeliveryLocation/ID	SALDOC	TRDBRANCH_CUSBRANCH_CCCS1DXGLN				1	39	0		
922	DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/CityName	1	SALDOC	TRDBRANCH_CUSBRANCH_CITY			38			39.0			DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/CityName	SALDOC	TRDBRANCH_CUSBRANCH_CITY				1	39	0		
923	DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/Country/IdentificationCode	1					38	SELECT 'RO'		39.0			DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/Country/IdentificationCode			RO	SQL_TRANSFORM	SELECT 'RO'	1	39	0		
924	DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/StreetName	1	SALDOC	TRDBRANCH_CUSBRANCH_ADDRESS			38			39.0			DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/StreetName	SALDOC	TRDBRANCH_CUSBRANCH_ADDRESS				1	39	0		
925	DXInvoice/Invoice/DespatchDocumentReference/ID	1	MTRDOC	CCCDispatcheDoc			38			18.0			DXInvoice/Invoice/DespatchDocumentReference/ID	MTRDOC	CCCDispatcheDoc				1	18	0		
926	DXInvoice/Invoice/DespatchDocumentReference/IssueDate	1	MTRDOC	CCCDispatcheDate			38			18.0			DXInvoice/Invoice/DespatchDocumentReference/IssueDate	MTRDOC	CCCDispatcheDate				1	18	0		
927	DXInvoice/Invoice/DocumentCurrencyCode	1	SALDOC	SOCURRENCY			38			10.0			DXInvoice/Invoice/DocumentCurrencyCode	SALDOC	SOCURRENCY				1	10	0		
928	DXInvoice/Invoice/ID	1	SALDOC	SERIESNUM			38			3.0			DXInvoice/Invoice/ID	SALDOC	SERIESNUM				1	3	0		
929	DXInvoice/Invoice/InvoiceTypeCode	1			SALDOC	FINDOC	38	"SELECT case series 
when 7121 then 380
when 7531 then 381
end
FROM FINDOC WHERE FINDOC={S1Table2.S1Field2}"	380 = original invoice, 381 = storno invoice, 384 = correction invoice	8.0			DXInvoice/Invoice/InvoiceTypeCode				SQL_TRANSFORM	"SELECT case series 
when 7121 then 380
when 7531 then 381
end
FROM FINDOC WHERE FINDOC=SALDOC.FINDOC"	1	8	0		
930	DXInvoice/Invoice/LegalMonetaryTotal/TaxExclusiveAmount	1	SALDOC	NETAMNT			38			54.0			DXInvoice/Invoice/LegalMonetaryTotal/TaxExclusiveAmount	SALDOC	NETAMNT				1	54	0		
931	DXInvoice/Invoice/LegalMonetaryTotal/TaxInclusiveAmount	1	SALDOC	SUMAMNT			38			55.0			DXInvoice/Invoice/LegalMonetaryTotal/TaxInclusiveAmount	SALDOC	SUMAMNT				1	55	0		
932	DXInvoice/Invoice/IssueDate	1	SALDOC	TRNDATE			38			6.0			DXInvoice/Invoice/IssueDate	SALDOC	TRNDATE				1	6	0		
933	DXInvoice/Invoice/LineCountNumeric	1			SALDOC	FINDOC	38	select count(*) from mtrlines where findoc={S1Table2.S1Field2}		15.0			DXInvoice/Invoice/LineCountNumeric				SQL_TRANSFORM	select count(*) from mtrlines where findoc=SALDOC.FINDOC	1	15	0		
934	DXInvoice/Invoice/Note	1	SALDOC	REMARKS			38			9.0			DXInvoice/Invoice/Note	SALDOC	REMARKS				1	9	0		
935	DXInvoice/Invoice/OrderReference/IssueDate	1	SALDOC	DATE01			38			16.0			DXInvoice/Invoice/OrderReference/IssueDate	SALDOC	DATE01				1	16	0		
936	DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/CurrencyCode	1	SALDOC	COMPANY_COMPANY_SOCURRENCY			38			40.0			DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/CurrencyCode	SALDOC	COMPANY_COMPANY_SOCURRENCY				1	40	0		
937	DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/FinancialInstitutionBranch/FinancialInstitution/Address/Country/IdentificationCode	1					38	SELECT 'RO'		40.0			DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/FinancialInstitutionBranch/FinancialInstitution/Address/Country/IdentificationCode			RO	SQL_TRANSFORM	SELECT 'RO'	1	40	0		
938	DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/ID	1					38	SELECT 'RO60RNCB0082B00132506875'		40.0			DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/ID				SQL_TRANSFORM	SELECT 'RO60RNCB0082B00132506875'	1	40	0		
939	DXInvoice/Invoice/OrderReference/ID	1	SALDOC	NUM04			38			16.0			DXInvoice/Invoice/OrderReference/ID	SALDOC	NUM04				1	16	0		
940	DXInvoice/Invoice/PaymentMeans/PayerFinancialAccount/CurrencyCode	1					38	SELECT 'RON'		40.0			DXInvoice/Invoice/PaymentMeans/PayerFinancialAccount/CurrencyCode			RON	SQL_TRANSFORM	SELECT 'RON'	1	40	0		
941	DXInvoice/Invoice/PaymentMeans/PayerFinancialAccount/FinancialInstitutionBranch/FinancialInstitution/Address/Country/IdentificationCode	1					38	SELECT 'RO'		40.0			DXInvoice/Invoice/PaymentMeans/PayerFinancialAccount/FinancialInstitutionBranch/FinancialInstitution/Address/Country/IdentificationCode			RO	SQL_TRANSFORM	SELECT 'RO'	1	40	0		
942	DXInvoice/Invoice/PaymentMeans/PaymentMeansCode	1					38	SELECT '42'		40.0			DXInvoice/Invoice/PaymentMeans/PaymentMeansCode			42	SQL_TRANSFORM	SELECT '42'	1	40	0		
943	DXInvoice/Invoice/PaymentTerms/SettlementPeriod/DescriptionCode	1					38	SELECT 'D'		41.0			DXInvoice/Invoice/PaymentTerms/SettlementPeriod/DescriptionCode			D	SQL_TRANSFORM	SELECT 'D'	1	41	0		
944	DXInvoice/Invoice/TaxTotal/TaxSubtotal/Percent	1	VATANAL	VAT			38	SELECT '[' + STUFF((SELECT ',' + CONVERT(NVARCHAR(20), PERCNT) FROM VAT WHERE VAT in ({S1Table1.S1Field1}) FOR xml path('')), 1, 1, '') + ']'		51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/Percent	VATANAL	VAT		SQL_TRANSFORM	SELECT '[' + STUFF((SELECT ',' + CONVERT(NVARCHAR(20), PERCNT) FROM VAT WHERE VAT in ({S1Table1.S1Field1}) FOR xml path('')), 1, 1, '') + ']'	1	51	0		
945	DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxableAmount	1	VATANAL	LSUBVAL			38			51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxableAmount	VATANAL	LSUBVAL				1	51	0		
946	DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxAmount	1	VATANAL	LVATVAL			38			51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxAmount	VATANAL	LVATVAL				1	51	0		
947	DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/ID	1					38	select 7		51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/ID			7	SQL_TRANSFORM	select 7	1	51	0		
948	DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/Name	1					38	select 'S'	"Standard UNECE 5305. The value must be equal with one of the values: 
S = standard VAT,
B = reverse charge,
AC = TVA la incasare"	51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/Name			S	SQL_TRANSFORM	select 'S'	1	51	0		
949	DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/TaxTypeCode	1					38	select 'VAT'	VAT (impus)	51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/TaxTypeCode			VAT	SQL_TRANSFORM	select 'VAT'	1	51	0		
950	DXInvoice/InvoiceLine/ID	1	ITELINES	LINENUM			38			61.0			DXInvoice/InvoiceLine/ID	ITELINES	LINENUM				1	61	0		
951	DXInvoice/InvoiceLine/InvoicedQuantity/__attributes/unitCode	1	ITELINES	MTRUNIT			38	SELECT CCCDOCPROCESSSHORTCUT FROM MTRUNIT WHERE MTRUNIT={S1Table1.S1Field1}		63.0			DXInvoice/InvoiceLine/InvoicedQuantity/__attributes/unitCode	ITELINES	MTRUNIT		SQL_TRANSFORM	SELECT CCCDOCPROCESSSHORTCUT FROM MTRUNIT WHERE MTRUNIT={S1Table1.S1Field1}	1	63	0		
952	DXInvoice/InvoiceLine/InvoicedQuantity/__value	1	ITELINES	QTY1			38			63.0			DXInvoice/InvoiceLine/InvoicedQuantity/__value	ITELINES	QTY1				1	63	0		
953	DXInvoice/InvoiceLine/Item/BuyersItemIdentification/ID	1	ITELINES	MTRL	SALDOC	TRDR	38	SELECT CODE FROM CCCS1DXTRDRMTRL WHERE MTRL={S1Table1.S1Field1} AND TRDR={S1Table2.S1Field2}		78.0			DXInvoice/InvoiceLine/Item/BuyersItemIdentification/ID	ITELINES	MTRL		SQL_TRANSFORM	SELECT CODE FROM CCCS1DXTRDRMTRL WHERE MTRL=ITELINES.MTRL AND TRDR=SALDOC.TRDR	1	78	0		
954	DXInvoice/InvoiceLine/Item/Description	1	ITELINES	MTRL_ITEM_NAME			38			78.0			DXInvoice/InvoiceLine/Item/Description	ITELINES	MTRL_ITEM_NAME				1	78	0		
955	DXInvoice/InvoiceLine/Item/SellersItemIdentification/ID	1	ITELINES	MTRL_ITEM_CODE			38			78.0			DXInvoice/InvoiceLine/Item/SellersItemIdentification/ID	ITELINES	MTRL_ITEM_CODE				1	78	0		
956	DXInvoice/InvoiceLine/Item/StandardItemIdentification/ID	1	ITELINES	MTRL_ITEM_CODE1			38			78.0			DXInvoice/InvoiceLine/Item/StandardItemIdentification/ID	ITELINES	MTRL_ITEM_CODE1				1	78	0		
957	DXInvoice/InvoiceLine/LineExtensionAmount	1	ITELINES	LNETLINEVAL			38			64.0			DXInvoice/InvoiceLine/LineExtensionAmount	ITELINES	LNETLINEVAL				1	64	0		
958	DXInvoice/InvoiceLine/Price/PriceAmount	1	ITELINES	PRICE			38			79.0			DXInvoice/InvoiceLine/Price/PriceAmount	ITELINES	PRICE				1	79	0		
959	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/Percent	1	ITELINES	VAT			38	SELECT '[' + STUFF((SELECT ',' + CONVERT(NVARCHAR(20), PERCNT) FROM VAT WHERE VAT in ({S1Table1.S1Field1}) FOR xml path('')), 1, 1, '') + ']'		77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/Percent	ITELINES	VAT		SQL_TRANSFORM	SELECT '[' + STUFF((SELECT ',' + CONVERT(NVARCHAR(20), PERCNT) FROM VAT WHERE VAT in ({S1Table1.S1Field1}) FOR xml path('')), 1, 1, '') + ']'	1	77	0		
960	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxableAmount	1	ITELINES	LNETLINEVAL			38			77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxableAmount	ITELINES	LNETLINEVAL				1	77	0		
961	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxAmount	1	ITELINES	VATAMNT			38			77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxAmount	ITELINES	VATAMNT				1	77	0		
1094	DXInvoice/InvoiceLine/TaxTotal/TaxAmount	1	ITELINES	VATAMNT			40			77.0			DXInvoice/InvoiceLine/TaxTotal/TaxAmount	ITELINES	VATAMNT				1	77	0		
1095	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/ID	1					40	SELECT '7'		77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/ID			7	SQL_TRANSFORM	SELECT '7'	1	77	0		
1096	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/Name	1					40	SELECT 'S'		77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/Name			S	SQL_TRANSFORM	SELECT 'S'	1	77	0		
1097	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/TaxTypeCode	1					40	SELECT 'VAT'		77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/TaxTypeCode			VAR	SQL_TRANSFORM	SELECT 'VAT'	1	77	0		
1098	DXInvoice/Invoice/AccountingCustomerParty/Party/PartyIdentification	1	SALDOC	TRDR_CUSTOMER_AFM			40			35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PartyIdentification	SALDOC	TRDR_CUSTOMER_AFM				1	35	0		
1099	DXInvoice/Invoice/AccountingCustomerParty/Party/PartyLegalEntity/CompanyID	1	SALDOC	TRDR_CUSTOMER_JOBTYPETRD			40			35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PartyLegalEntity/CompanyID	SALDOC	TRDR_CUSTOMER_JOBTYPETRD				1	35	0		
1100	DXInvoice/Invoice/AccountingCustomerParty/Party/PartyName	1	SALDOC	TRDR_CUSTOMER_NAME			40			35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PartyName	SALDOC	TRDR_CUSTOMER_NAME				1	35	0		
1101	DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/BuildingNumber	1					40	select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=2		35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/BuildingNumber				SQL_TRANSFORM	select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=2	1	35	0		
1102	DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/CityName	1					40	select concat((select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=4), ' ' , (select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=5))		35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/CityName				SQL_TRANSFORM	select concat((select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=4), ' ' , (select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=5))	1	35	0		
1103	DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/Country/IdentificationCode	1	SALDOC	TRDR_CUSTOMER_BGBULSTAT			40			35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/Country/IdentificationCode	SALDOC	TRDR_CUSTOMER_BGBULSTAT				1	35	0		
1104	DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/StreetName	1					40	select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=1		35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/StreetName				SQL_TRANSFORM	select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=1	1	35	0		
1105	DXInvoice/Invoice/AccountingSupplierParty/CustomerAssignedAccountID	1					40	select '3446'	3446	25.0			DXInvoice/Invoice/AccountingSupplierParty/CustomerAssignedAccountID			3446	SQL_TRANSFORM	select '3446'	1	25	0		
1106	DXInvoice/Invoice/AccountingSupplierParty/Party/PartyIdentification	1	SALDOC	COMPANY_COMPANY_AFM			40			27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PartyIdentification	SALDOC	COMPANY_COMPANY_AFM				1	27	0		
1107	DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CompanyID	1	SALDOC	COMPANY_COMPANY_BGBULSTAT			40			27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CompanyID	SALDOC	COMPANY_COMPANY_BGBULSTAT				1	27	0		
1108	DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CorporateStockAmount/__attributes/currencyID	1	SALDOC	COMPANY_COMPANY_SOCURRENCY			40			27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CorporateStockAmount/__attributes/currencyID	SALDOC	COMPANY_COMPANY_SOCURRENCY				1	27	0		
1109	DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CorporateStockAmount/__value	1	SALDOC	COMPANY_COMPANY_IDENTITYNUM			40		test	27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CorporateStockAmount/__value	SALDOC	COMPANY_COMPANY_IDENTITYNUM				1	27	0		
1110	DXInvoice/Invoice/AccountingSupplierParty/Party/PartyName	1	SALDOC	COMPANY_COMPANY_NAME			40			27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PartyName	SALDOC	COMPANY_COMPANY_NAME				1	27	0		
1111	DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/BuildingNumber	1					40	SELECT '118'		27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/BuildingNumber			118	SQL_TRANSFORM	SELECT '118'	1	27	0		
1112	DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/CityName	1					40	SELECT CONCAT(CITY, ', ', DISTRICT) FROM COMPANY WHERE COMPANY=50		27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/CityName				SQL_TRANSFORM	SELECT CONCAT(CITY, ', ', DISTRICT) FROM COMPANY WHERE COMPANY=50	1	27	0		
1113	DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/Country/IdentificationCode	1					40	select 'RO'		27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/Country/IdentificationCode			RO	SQL_TRANSFORM	select 'RO'	1	27	0		
1114	DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/PostalZone	1	SALDOC	COMPANY_COMPANY_ZIP			40			27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/PostalZone	SALDOC	COMPANY_COMPANY_ZIP				1	27	0		
1115	DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/StreetName	1					40	SELECT 'Sos. Giurgiului'		27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/StreetName			Sos. Giurgiului	SQL_TRANSFORM	SELECT 'Sos. Giurgiului'	1	27	0		
1116	DXInvoice/Invoice/CustomizationID	1					40	SELECT 'FMF'	FMF (impus)	1.0			DXInvoice/Invoice/CustomizationID			FMF	SQL_TRANSFORM	SELECT 'FMF'	1	1	0		
1117	DXInvoice/Invoice/CopyIndicator	1					40	select 'FALSE'		4.0			DXInvoice/Invoice/CopyIndicator			FALSE	SQL_TRANSFORM	select 'FALSE'	1	4	0		
1118	DXInvoice/Invoice/Delivery/ActualDeliveryDate	1	MTRDOC	DELIVDATE			40			39.0			DXInvoice/Invoice/Delivery/ActualDeliveryDate	MTRDOC	DELIVDATE				1	39	0		
1119	DXInvoice/Invoice/Delivery/DeliveryLocation/ID	1	SALDOC	TRDBRANCH_CUSBRANCH_CCCS1DXGLN			40			39.0			DXInvoice/Invoice/Delivery/DeliveryLocation/ID	SALDOC	TRDBRANCH_CUSBRANCH_CCCS1DXGLN				1	39	0		
1120	DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/CityName	1	SALDOC	TRDBRANCH_CUSBRANCH_CITY			40			39.0			DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/CityName	SALDOC	TRDBRANCH_CUSBRANCH_CITY				1	39	0		
1121	DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/Country/IdentificationCode	1					40	SELECT 'RO'		39.0			DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/Country/IdentificationCode			RO	SQL_TRANSFORM	SELECT 'RO'	1	39	0		
1122	DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/StreetName	1	SALDOC	TRDBRANCH_CUSBRANCH_ADDRESS			40			39.0			DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/StreetName	SALDOC	TRDBRANCH_CUSBRANCH_ADDRESS				1	39	0		
1123	DXInvoice/Invoice/DespatchDocumentReference/ID	1	MTRDOC	CCCDispatcheDoc			40			18.0			DXInvoice/Invoice/DespatchDocumentReference/ID	MTRDOC	CCCDispatcheDoc				1	18	0		
1124	DXInvoice/Invoice/DespatchDocumentReference/IssueDate	1	MTRDOC	CCCDispatcheDate			40			18.0			DXInvoice/Invoice/DespatchDocumentReference/IssueDate	MTRDOC	CCCDispatcheDate				1	18	0		
1125	DXInvoice/Invoice/DocumentCurrencyCode	1	SALDOC	SOCURRENCY			40			10.0			DXInvoice/Invoice/DocumentCurrencyCode	SALDOC	SOCURRENCY				1	10	0		
1126	DXInvoice/Invoice/ID	1	SALDOC	SERIESNUM			40			3.0			DXInvoice/Invoice/ID	SALDOC	SERIESNUM				1	3	0		
1127	DXInvoice/Invoice/InvoiceTypeCode	1			SALDOC	FINDOC	40	"SELECT case series 
when 7121 then 380
when 7531 then 381
end
FROM FINDOC WHERE FINDOC={S1Table2.S1Field2}"	380 = original invoice, 381 = storno invoice, 384 = correction invoice	8.0			DXInvoice/Invoice/InvoiceTypeCode				SQL_TRANSFORM	"SELECT case series 
when 7121 then 380
when 7531 then 381
end
FROM FINDOC WHERE FINDOC=SALDOC.FINDOC"	1	8	0		
1128	DXInvoice/Invoice/LegalMonetaryTotal/TaxExclusiveAmount	1	SALDOC	NETAMNT			40			54.0			DXInvoice/Invoice/LegalMonetaryTotal/TaxExclusiveAmount	SALDOC	NETAMNT				1	54	0		
1129	DXInvoice/Invoice/LegalMonetaryTotal/TaxInclusiveAmount	1	SALDOC	SUMAMNT			40			55.0			DXInvoice/Invoice/LegalMonetaryTotal/TaxInclusiveAmount	SALDOC	SUMAMNT				1	55	0		
1130	DXInvoice/Invoice/IssueDate	1	SALDOC	TRNDATE			40			6.0			DXInvoice/Invoice/IssueDate	SALDOC	TRNDATE				1	6	0		
1131	DXInvoice/Invoice/LineCountNumeric	1			SALDOC	FINDOC	40	select count(*) from mtrlines where findoc={S1Table2.S1Field2}		15.0			DXInvoice/Invoice/LineCountNumeric				SQL_TRANSFORM	select count(*) from mtrlines where findoc=SALDOC.FINDOC	1	15	0		
1132	DXInvoice/Invoice/Note	1	SALDOC	REMARKS			40			9.0			DXInvoice/Invoice/Note	SALDOC	REMARKS				1	9	0		
1133	DXInvoice/Invoice/OrderReference/IssueDate	1	SALDOC	DATE01			40			16.0			DXInvoice/Invoice/OrderReference/IssueDate	SALDOC	DATE01				1	16	0		
1134	DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/CurrencyCode	1	SALDOC	COMPANY_COMPANY_SOCURRENCY			40			40.0			DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/CurrencyCode	SALDOC	COMPANY_COMPANY_SOCURRENCY				1	40	0		
1135	DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/FinancialInstitutionBranch/FinancialInstitution/Address/Country/IdentificationCode	1					40	SELECT 'RO'		40.0			DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/FinancialInstitutionBranch/FinancialInstitution/Address/Country/IdentificationCode			RO	SQL_TRANSFORM	SELECT 'RO'	1	40	0		
1136	DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/ID	1					40	SELECT 'RO60RNCB0082B00132506875'		40.0			DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/ID			RO60RNCB0082B00132506875	SQL_TRANSFORM	SELECT 'RO60RNCB0082B00132506875'	1	40	0		
1137	DXInvoice/Invoice/OrderReference/ID	1	SALDOC	NUM04			40			16.0			DXInvoice/Invoice/OrderReference/ID	SALDOC	NUM04				1	16	0		
1138	DXInvoice/Invoice/PaymentMeans/PayerFinancialAccount/CurrencyCode	1					40	SELECT 'RON'		40.0			DXInvoice/Invoice/PaymentMeans/PayerFinancialAccount/CurrencyCode			RON	SQL_TRANSFORM	SELECT 'RON'	1	40	0		
1139	DXInvoice/Invoice/PaymentMeans/PayerFinancialAccount/FinancialInstitutionBranch/FinancialInstitution/Address/Country/IdentificationCode	1					40	SELECT 'RO'		40.0			DXInvoice/Invoice/PaymentMeans/PayerFinancialAccount/FinancialInstitutionBranch/FinancialInstitution/Address/Country/IdentificationCode			RO	SQL_TRANSFORM	SELECT 'RO'	1	40	0		
1140	DXInvoice/Invoice/PaymentMeans/PaymentMeansCode	1					40	SELECT '42'		40.0			DXInvoice/Invoice/PaymentMeans/PaymentMeansCode			42	SQL_TRANSFORM	SELECT '42'	1	40	0		
1141	DXInvoice/Invoice/PaymentTerms/SettlementPeriod/DescriptionCode	1					40	SELECT 'D'		41.0			DXInvoice/Invoice/PaymentTerms/SettlementPeriod/DescriptionCode			D	SQL_TRANSFORM	SELECT 'D'	1	41	0		
1142	DXInvoice/Invoice/TaxTotal/TaxSubtotal/Percent	1	VATANAL	VAT			40	SELECT '[' + STUFF((SELECT ',' + CONVERT(NVARCHAR(20), PERCNT) FROM VAT WHERE VAT in ({S1Table1.S1Field1}) FOR xml path('')), 1, 1, '') + ']'		51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/Percent	VATANAL	VAT		SQL_TRANSFORM	SELECT '[' + STUFF((SELECT ',' + CONVERT(NVARCHAR(20), PERCNT) FROM VAT WHERE VAT in ({S1Table1.S1Field1}) FOR xml path('')), 1, 1, '') + ']'	1	51	0		
1143	DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxableAmount	1	VATANAL	LSUBVAL			40			51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxableAmount	VATANAL	LSUBVAL				1	51	0		
1144	DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxAmount	1	VATANAL	LVATVAL			40			51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxAmount	VATANAL	LVATVAL				1	51	0		
1145	DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/ID	1					40	select 7		51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/ID			7	SQL_TRANSFORM	select 7	1	51	0		
1146	DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/Name	1					40	select 'S'	"Standard UNECE 5305. The value must be equal with one of the values: 
S = standard VAT,
B = reverse charge,
AC = TVA la incasare"	51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/Name			S	SQL_TRANSFORM	select 'S'	1	51	0		
1147	DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/TaxTypeCode	1					40	select 'VAT'	VAT (impus)	51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/TaxTypeCode			VAT	SQL_TRANSFORM	select 'VAT'	1	51	0		
1148	DXInvoice/InvoiceLine/ID	1	ITELINES	LINENUM			40			61.0			DXInvoice/InvoiceLine/ID	ITELINES	LINENUM				1	61	0		
1149	DXInvoice/InvoiceLine/InvoicedQuantity/__attributes/unitCode	1	ITELINES	MTRUNIT			40	SELECT CCCDOCPROCESSSHORTCUT FROM MTRUNIT WHERE MTRUNIT={S1Table1.S1Field1}		63.0			DXInvoice/InvoiceLine/InvoicedQuantity/__attributes/unitCode	ITELINES	MTRUNIT		SQL_TRANSFORM	SELECT CCCDOCPROCESSSHORTCUT FROM MTRUNIT WHERE MTRUNIT={S1Table1.S1Field1}	1	63	0		
1150	DXInvoice/InvoiceLine/InvoicedQuantity/__value	1	ITELINES	QTY1			40			63.0			DXInvoice/InvoiceLine/InvoicedQuantity/__value	ITELINES	QTY1				1	63	0		
1151	DXInvoice/InvoiceLine/Item/BuyersItemIdentification/ID	1	ITELINES	MTRL	SALDOC	TRDR	40	SELECT CODE FROM CCCS1DXTRDRMTRL WHERE MTRL={S1Table1.S1Field1} AND TRDR={S1Table2.S1Field2}		78.0			DXInvoice/InvoiceLine/Item/BuyersItemIdentification/ID	ITELINES	MTRL		SQL_TRANSFORM	SELECT CODE FROM CCCS1DXTRDRMTRL WHERE MTRL=ITELINES.MTRL AND TRDR=SALDOC.TRDR	1	78	0		
1152	DXInvoice/InvoiceLine/Item/Description	1	ITELINES	MTRL_ITEM_NAME			40			78.0			DXInvoice/InvoiceLine/Item/Description	ITELINES	MTRL_ITEM_NAME				1	78	0		
1153	DXInvoice/InvoiceLine/Item/SellersItemIdentification/ID	1	ITELINES	MTRL_ITEM_CODE			40			78.0			DXInvoice/InvoiceLine/Item/SellersItemIdentification/ID	ITELINES	MTRL_ITEM_CODE				1	78	0		
1154	DXInvoice/InvoiceLine/Item/StandardItemIdentification/ID	1	ITELINES	MTRL_ITEM_CODE1			40			78.0			DXInvoice/InvoiceLine/Item/StandardItemIdentification/ID	ITELINES	MTRL_ITEM_CODE1				1	78	0		
1155	DXInvoice/InvoiceLine/LineExtensionAmount	1	ITELINES	LNETLINEVAL			40			64.0			DXInvoice/InvoiceLine/LineExtensionAmount	ITELINES	LNETLINEVAL				1	64	0		
1156	DXInvoice/InvoiceLine/Price/PriceAmount	1	ITELINES	PRICE			40			79.0			DXInvoice/InvoiceLine/Price/PriceAmount	ITELINES	PRICE				1	79	0		
1157	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/Percent	1	ITELINES	VAT			40	SELECT '[' + STUFF((SELECT ',' + CONVERT(NVARCHAR(20), PERCNT) FROM VAT WHERE VAT in ({S1Table1.S1Field1}) FOR xml path('')), 1, 1, '') + ']'		77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/Percent	ITELINES	VAT		SQL_TRANSFORM	SELECT '[' + STUFF((SELECT ',' + CONVERT(NVARCHAR(20), PERCNT) FROM VAT WHERE VAT in ({S1Table1.S1Field1}) FOR xml path('')), 1, 1, '') + ']'	1	77	0		
1158	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxableAmount	1	ITELINES	LNETLINEVAL			40			77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxableAmount	ITELINES	LNETLINEVAL				1	77	0		
1159	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxAmount	1	ITELINES	VATAMNT			40			77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxAmount	ITELINES	VATAMNT				1	77	0		
1226	RequestedDeliveryPeriod/EndDate	1	MTRDOC	DELIVDATE			39						RequestedDeliveryPeriod/EndDate	MTRDOC	DELIVDATE				1		0		
1227	ID	1	SALDOC	NUM04			39						ID	SALDOC	NUM04				1		0		
1228	IssueDate	1	SALDOC	DATE01			39						IssueDate	SALDOC	DATE01				1		0		
1229	DeliveryParty/EndpointID	1	SALDOC	TRDBRANCH			39	select trdbranch from trdbranch where trdr=13249 and cccs1dxgln='{value}'					DeliveryParty/EndpointID	SALDOC	TRDBRANCH		SQL_TRANSFORM	select trdbranch from trdbranch where trdr=13249 and cccs1dxgln='{value}'	1		0		
1230	OrderLine/Price/Amount	1	ITELINES	PRICE			39						OrderLine/Price/Amount	ITELINES	PRICE				1		0		
1231	OrderLine/Quantity/Amount	1	ITELINES	QTY1			39						OrderLine/Quantity/Amount	ITELINES	QTY1				1		0		
1232	OrderLine/Item/BuyersItemIdentification	1	ITELINES	MTRL			39	select mtrl from cccs1dxtrdrmtrl where trdr=13249 and code='{value}'					OrderLine/Item/BuyersItemIdentification	ITELINES	MTRL		SQL_TRANSFORM	select mtrl from cccs1dxtrdrmtrl where trdr=13249 and code='{value}'	1		0		
1233	RequestedDeliveryPeriod/EndDate	1	MTRDOC	DELIVDATE			37						RequestedDeliveryPeriod/EndDate	MTRDOC	DELIVDATE				1		0		
1234	ID	1	SALDOC	NUM04			37						ID	SALDOC	NUM04				1		0		
1235	IssueDate	1	SALDOC	DATE01			37						IssueDate	SALDOC	DATE01				1		0		
1236	DeliveryParty/EndpointID	1	SALDOC	TRDBRANCH			37	select trdbranch from trdbranch where trdr=11322 and cccs1dxgln='{value}'					DeliveryParty/EndpointID	SALDOC	TRDBRANCH		SQL_TRANSFORM	select trdbranch from trdbranch where trdr=11322 and cccs1dxgln='{value}'	1		0		
1237	OrderLine/Price/Amount	1	ITELINES	PRICE			37						OrderLine/Price/Amount	ITELINES	PRICE				1		0		
1238	OrderLine/Quantity/Amount	1	ITELINES	QTY1			37						OrderLine/Quantity/Amount	ITELINES	QTY1				1		0		
1239	OrderLine/Item/BuyersItemIdentification	1	ITELINES	MTRL			37	select mtrl from cccs1dxtrdrmtrl where trdr=11322 and code='{value}'					OrderLine/Item/BuyersItemIdentification	ITELINES	MTRL		SQL_TRANSFORM	select mtrl from cccs1dxtrdrmtrl where trdr=11322 and code='{value}'	1		0		
1240	RequestedDeliveryPeriod/EndDate	1	MTRDOC	DELIVDATE			41						RequestedDeliveryPeriod/EndDate	MTRDOC	DELIVDATE				1		0		
1241	ID	1	SALDOC	NUM04			41						ID	SALDOC	NUM04				1		0		
1242	IssueDate	1	SALDOC	DATE01			41						IssueDate	SALDOC	DATE01				1		0		
1243	DeliveryParty/EndpointID	1	SALDOC	TRDBRANCH			41	select trdbranch from trdbranch where trdr=12349 and cccs1dxgln='{value}'					DeliveryParty/EndpointID	SALDOC	TRDBRANCH		SQL_TRANSFORM	select trdbranch from trdbranch where trdr=12349 and cccs1dxgln='{value}'	1		0		
1244	OrderLine/Price/Amount	1	ITELINES	PRICE			41						OrderLine/Price/Amount	ITELINES	PRICE				1		0		
1245	OrderLine/Quantity/Amount	1	ITELINES	CCCUNITPACK			41						OrderLine/Quantity/Amount	ITELINES	CCCUNITPACK				1		0		
1246	OrderLine/Item/BuyersItemIdentification	1	ITELINES	MTRL			41	select mtrl from cccs1dxtrdrmtrl where trdr=12349 and code='{value}'					OrderLine/Item/BuyersItemIdentification	ITELINES	MTRL		SQL_TRANSFORM	select mtrl from cccs1dxtrdrmtrl where trdr=12349 and code='{value}'	1		0		
1247	DXInvoice/InvoiceLine/TaxTotal/TaxAmount	1	ITELINES	VATAMNT			42			77.0			DXInvoice/InvoiceLine/TaxTotal/TaxAmount	ITELINES	VATAMNT				1	77	0		
1248	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/ID	1					42	SELECT '7'		77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/ID			7	SQL_TRANSFORM	SELECT '7'	1	77	0		
1249	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/Name	1					42	SELECT 'S'		77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/Name			S	SQL_TRANSFORM	SELECT 'S'	1	77	0		
1250	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/TaxTypeCode	1					42	SELECT 'VAT'		77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/TaxTypeCode			VAT	SQL_TRANSFORM	SELECT 'VAT'	1	77	0		
1251	DXInvoice/Invoice/AccountingCustomerParty/Party/PartyIdentification	1	SALDOC	TRDR_CUSTOMER_AFM			42			35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PartyIdentification	SALDOC	TRDR_CUSTOMER_AFM				1	35	0		
1252	DXInvoice/Invoice/AccountingCustomerParty/Party/PartyLegalEntity/CompanyID	1	SALDOC	TRDR_CUSTOMER_JOBTYPETRD			42			35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PartyLegalEntity/CompanyID	SALDOC	TRDR_CUSTOMER_JOBTYPETRD				1	35	0		
1253	DXInvoice/Invoice/AccountingCustomerParty/Party/PartyName	1	SALDOC	TRDR_CUSTOMER_NAME			42			35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PartyName	SALDOC	TRDR_CUSTOMER_NAME				1	35	0		
1254	DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/BuildingNumber	1					42	select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=2		35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/BuildingNumber				SQL_TRANSFORM	select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=2	1	35	0		
1255	DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/CityName	1					42	select concat((select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=4), ' ' , (select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=5))		35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/CityName				SQL_TRANSFORM	select concat((select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=4), ' ' , (select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=5))	1	35	0		
1256	DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/Country/IdentificationCode	1	SALDOC	TRDR_CUSTOMER_BGBULSTAT			42			35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/Country/IdentificationCode	SALDOC	TRDR_CUSTOMER_BGBULSTAT				1	35	0		
1257	DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/StreetName	1					42	select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=1		35.0			DXInvoice/Invoice/AccountingCustomerParty/Party/PostalAddress/StreetName				SQL_TRANSFORM	select Value from (select row_number() over (order by (select null)) as nr, * from dbo.split((select address from trdr where trdr=11639)) a) b where nr=1	1	35	0		
1258	DXInvoice/Invoice/AccountingSupplierParty/CustomerAssignedAccountID	1					42	select '3446'	3446	25.0			DXInvoice/Invoice/AccountingSupplierParty/CustomerAssignedAccountID			3446	SQL_TRANSFORM	select '3446'	1	25	0		
1259	DXInvoice/Invoice/AccountingSupplierParty/Party/PartyIdentification	1	SALDOC	COMPANY_COMPANY_AFM			42			27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PartyIdentification	SALDOC	COMPANY_COMPANY_AFM				1	27	0		
1260	DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CompanyID	1	SALDOC	COMPANY_COMPANY_BGBULSTAT			42			27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CompanyID	SALDOC	COMPANY_COMPANY_BGBULSTAT				1	27	0		
1261	DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CorporateStockAmount/__attributes/currencyID	1	SALDOC	COMPANY_COMPANY_SOCURRENCY			42			27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CorporateStockAmount/__attributes/currencyID	SALDOC	COMPANY_COMPANY_SOCURRENCY				1	27	0		
1262	DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CorporateStockAmount/__value	1	SALDOC	COMPANY_COMPANY_IDENTITYNUM			42		test	27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PartyLegalEntity/CorporateStockAmount/__value	SALDOC	COMPANY_COMPANY_IDENTITYNUM				1	27	0		
1263	DXInvoice/Invoice/AccountingSupplierParty/Party/PartyName	1	SALDOC	COMPANY_COMPANY_NAME			42			27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PartyName	SALDOC	COMPANY_COMPANY_NAME				1	27	0		
1264	DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/BuildingNumber	1					42	SELECT '118'		27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/BuildingNumber			118	SQL_TRANSFORM	SELECT '118'	1	27	0		
1265	DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/CityName	1					42	SELECT CONCAT(CITY, ', ', DISTRICT) FROM COMPANY WHERE COMPANY=50		27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/CityName				SQL_TRANSFORM	SELECT CONCAT(CITY, ', ', DISTRICT) FROM COMPANY WHERE COMPANY=50	1	27	0		
1266	DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/Country/IdentificationCode	1					42	select 'RO'		27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/Country/IdentificationCode			RO	SQL_TRANSFORM	select 'RO'	1	27	0		
1267	DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/PostalZone	1	SALDOC	COMPANY_COMPANY_ZIP			42			27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/PostalZone	SALDOC	COMPANY_COMPANY_ZIP				1	27	0		
1268	DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/StreetName	1					42	SELECT 'Sos. Giurgiului'		27.0			DXInvoice/Invoice/AccountingSupplierParty/Party/PostalAddress/StreetName			Sos. Giurgiului	SQL_TRANSFORM	SELECT 'Sos. Giurgiului'	1	27	0		
1269	DXInvoice/Invoice/CustomizationID	1					42	SELECT 'FMF'	FMF (impus)	1.0			DXInvoice/Invoice/CustomizationID			FMF	SQL_TRANSFORM	SELECT 'FMF'	1	1	0		
1270	DXInvoice/Invoice/CopyIndicator	1					42	select 'FALSE'		4.0			DXInvoice/Invoice/CopyIndicator			FALSE	SQL_TRANSFORM	select 'FALSE'	1	4	0		
1271	DXInvoice/Invoice/Delivery/ActualDeliveryDate	1	MTRDOC	DELIVDATE			42			39.0			DXInvoice/Invoice/Delivery/ActualDeliveryDate	MTRDOC	DELIVDATE				1	39	0		
1272	DXInvoice/Invoice/Delivery/DeliveryLocation/ID	1	SALDOC	TRDBRANCH_CUSBRANCH_CCCS1DXGLN			42			39.0			DXInvoice/Invoice/Delivery/DeliveryLocation/ID	SALDOC	TRDBRANCH_CUSBRANCH_CCCS1DXGLN				1	39	0		
1273	DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/CityName	1	SALDOC	TRDBRANCH_CUSBRANCH_CITY			42			39.0			DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/CityName	SALDOC	TRDBRANCH_CUSBRANCH_CITY				1	39	0		
1274	DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/Country/IdentificationCode	1					42	SELECT 'RO'		39.0			DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/Country/IdentificationCode				SQL_TRANSFORM	SELECT 'RO'	1	39	0		
1275	DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/StreetName	1	SALDOC	TRDBRANCH_CUSBRANCH_ADDRESS			42			39.0			DXInvoice/Invoice/Delivery/DeliveryLocation/LocationAddress/StreetName	SALDOC	TRDBRANCH_CUSBRANCH_ADDRESS				1	39	0		
1276	DXInvoice/Invoice/DespatchDocumentReference/ID	1	MTRDOC	CCCDispatcheDoc			42			18.0			DXInvoice/Invoice/DespatchDocumentReference/ID	MTRDOC	CCCDispatcheDoc				1	18	0		
1277	DXInvoice/Invoice/DespatchDocumentReference/IssueDate	1	MTRDOC	CCCDispatcheDate			42			18.0			DXInvoice/Invoice/DespatchDocumentReference/IssueDate	MTRDOC	CCCDispatcheDate				1	18	0		
1278	DXInvoice/Invoice/DocumentCurrencyCode	1	SALDOC	SOCURRENCY			42			10.0			DXInvoice/Invoice/DocumentCurrencyCode	SALDOC	SOCURRENCY				1	10	0		
1279	DXInvoice/Invoice/ID	1	SALDOC	SERIESNUM			42			3.0			DXInvoice/Invoice/ID	SALDOC	SERIESNUM				1	3	0		
1280	DXInvoice/Invoice/InvoiceTypeCode	1			SALDOC	FINDOC	42	"SELECT case series 
when 7121 then 380
when 7531 then 381
end
FROM FINDOC WHERE FINDOC={S1Table2.S1Field2}"	380 = original invoice, 381 = storno invoice, 384 = correction invoice	8.0			DXInvoice/Invoice/InvoiceTypeCode				SQL_TRANSFORM	"SELECT case series 
when 7121 then 380
when 7531 then 381
end
FROM FINDOC WHERE FINDOC=SALDOC.FINDOC"	1	8	0		
1281	DXInvoice/Invoice/LegalMonetaryTotal/TaxExclusiveAmount	1	SALDOC	NETAMNT			42			54.0			DXInvoice/Invoice/LegalMonetaryTotal/TaxExclusiveAmount	SALDOC	NETAMNT				1	54	0		
1282	DXInvoice/Invoice/LegalMonetaryTotal/TaxInclusiveAmount	1	SALDOC	SUMAMNT			42			55.0			DXInvoice/Invoice/LegalMonetaryTotal/TaxInclusiveAmount	SALDOC	SUMAMNT				1	55	0		
1283	DXInvoice/Invoice/IssueDate	1	SALDOC	TRNDATE			42			6.0			DXInvoice/Invoice/IssueDate	SALDOC	TRNDATE				1	6	0		
1284	DXInvoice/Invoice/LineCountNumeric	1			SALDOC	FINDOC	42	select count(*) from mtrlines where findoc={S1Table2.S1Field2}		15.0			DXInvoice/Invoice/LineCountNumeric				SQL_TRANSFORM	select count(*) from mtrlines where findoc=SALDOC.FINDOC	1	15	0		
1285	DXInvoice/Invoice/Note	1	SALDOC	REMARKS			42			9.0			DXInvoice/Invoice/Note	SALDOC	REMARKS				1	9	0		
1286	DXInvoice/Invoice/OrderReference/IssueDate	1	SALDOC	DATE01			42			16.0			DXInvoice/Invoice/OrderReference/IssueDate	SALDOC	DATE01				1	16	0		
1287	DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/CurrencyCode	1	SALDOC	COMPANY_COMPANY_SOCURRENCY			42			40.0			DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/CurrencyCode	SALDOC	COMPANY_COMPANY_SOCURRENCY				1	40	0		
1288	DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/FinancialInstitutionBranch/FinancialInstitution/Address/Country/IdentificationCode	1					42	SELECT 'RO'		40.0			DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/FinancialInstitutionBranch/FinancialInstitution/Address/Country/IdentificationCode			RO	SQL_TRANSFORM	SELECT 'RO'	1	40	0		
1289	DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/ID	1					42	SELECT 'RO60RNCB0082B00132506875'		40.0			DXInvoice/Invoice/PaymentMeans/PayeeFinancialAccount/ID			RO60RNCB0082B00132506875	SQL_TRANSFORM	SELECT 'RO60RNCB0082B00132506875'	1	40	0		
1290	DXInvoice/Invoice/OrderReference/ID	1	SALDOC	NUM04			42			16.0			DXInvoice/Invoice/OrderReference/ID	SALDOC	NUM04				1	16	0		
1291	DXInvoice/Invoice/PaymentMeans/PayerFinancialAccount/CurrencyCode	1					42	SELECT 'RON'		40.0			DXInvoice/Invoice/PaymentMeans/PayerFinancialAccount/CurrencyCode			RON	SQL_TRANSFORM	SELECT 'RON'	1	40	0		
1292	DXInvoice/Invoice/PaymentMeans/PayerFinancialAccount/FinancialInstitutionBranch/FinancialInstitution/Address/Country/IdentificationCode	1					42	SELECT 'RO'		40.0			DXInvoice/Invoice/PaymentMeans/PayerFinancialAccount/FinancialInstitutionBranch/FinancialInstitution/Address/Country/IdentificationCode			RO	SQL_TRANSFORM	SELECT 'RO'	1	40	0		
1293	DXInvoice/Invoice/PaymentMeans/PaymentMeansCode	1					42	SELECT '42'		40.0			DXInvoice/Invoice/PaymentMeans/PaymentMeansCode			42	SQL_TRANSFORM	SELECT '42'	1	40	0		
1294	DXInvoice/Invoice/PaymentTerms/SettlementPeriod/DescriptionCode	1					42	SELECT 'D'		41.0			DXInvoice/Invoice/PaymentTerms/SettlementPeriod/DescriptionCode			D	SQL_TRANSFORM	SELECT 'D'	1	41	0		
1295	DXInvoice/Invoice/TaxTotal/TaxSubtotal/Percent	1	VATANAL	VAT			42	SELECT '[' + STUFF((SELECT ',' + CONVERT(NVARCHAR(20), PERCNT) FROM VAT WHERE VAT in ({S1Table1.S1Field1}) FOR xml path('')), 1, 1, '') + ']'		51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/Percent	VATANAL	VAT		SQL_TRANSFORM	SELECT '[' + STUFF((SELECT ',' + CONVERT(NVARCHAR(20), PERCNT) FROM VAT WHERE VAT in ({S1Table1.S1Field1}) FOR xml path('')), 1, 1, '') + ']'	1	51	0		
1296	DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxableAmount	1	VATANAL	LSUBVAL			42			51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxableAmount	VATANAL	LSUBVAL				1	51	0		
1297	DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxAmount	1	VATANAL	LVATVAL			42			51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxAmount	VATANAL	LVATVAL				1	51	0		
1298	DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/ID	1					42	select 7		51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/ID			7	SQL_TRANSFORM	select 7	1	51	0		
1299	DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/Name	1					42	select 'S'	"Standard UNECE 5305. The value must be equal with one of the values: 
S = standard VAT,
B = reverse charge,
AC = TVA la incasare"	51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/Name			S	SQL_TRANSFORM	select 'S'	1	51	0		
1300	DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/TaxTypeCode	1					42	select 'VAT'	VAT (impus)	51.0			DXInvoice/Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/TaxTypeCode				SQL_TRANSFORM	select 'VAT'	1	51	0		
1301	DXInvoice/InvoiceLine/ID	1	ITELINES	LINENUM			42			61.0			DXInvoice/InvoiceLine/ID	ITELINES	LINENUM				1	61	0		
1302	DXInvoice/InvoiceLine/InvoicedQuantity/__attributes/unitCode	1	ITELINES	MTRUNIT			42	SELECT CCCDOCPROCESSSHORTCUT FROM MTRUNIT WHERE MTRUNIT={S1Table1.S1Field1}		63.0			DXInvoice/InvoiceLine/InvoicedQuantity/__attributes/unitCode	ITELINES	MTRUNIT		SQL_TRANSFORM	SELECT CCCDOCPROCESSSHORTCUT FROM MTRUNIT WHERE MTRUNIT={S1Table1.S1Field1}	1	63	0		
1303	DXInvoice/InvoiceLine/InvoicedQuantity/__value	1	ITELINES	QTY1			42			63.0			DXInvoice/InvoiceLine/InvoicedQuantity/__value	ITELINES	QTY1				1	63	0		
1304	DXInvoice/InvoiceLine/Item/BuyersItemIdentification/ID	1	ITELINES	MTRL	SALDOC	TRDR	42	SELECT CODE FROM CCCS1DXTRDRMTRL WHERE MTRL={S1Table1.S1Field1} AND TRDR={S1Table2.S1Field2}		78.0			DXInvoice/InvoiceLine/Item/BuyersItemIdentification/ID	ITELINES	MTRL		SQL_TRANSFORM	SELECT CODE FROM CCCS1DXTRDRMTRL WHERE MTRL=ITELINES.MTRL AND TRDR=SALDOC.TRDR	1	78	0		
1305	DXInvoice/InvoiceLine/Item/Description	1	ITELINES	MTRL_ITEM_NAME			42			78.0			DXInvoice/InvoiceLine/Item/Description	ITELINES	MTRL_ITEM_NAME				1	78	0		
1306	DXInvoice/InvoiceLine/Item/SellersItemIdentification/ID	1	ITELINES	MTRL_ITEM_CODE			42			78.0			DXInvoice/InvoiceLine/Item/SellersItemIdentification/ID	ITELINES	MTRL_ITEM_CODE				1	78	0		
1307	DXInvoice/InvoiceLine/Item/StandardItemIdentification/ID	1	ITELINES	MTRL_ITEM_CODE1			42			78.0			DXInvoice/InvoiceLine/Item/StandardItemIdentification/ID	ITELINES	MTRL_ITEM_CODE1				1	78	0		
1308	DXInvoice/InvoiceLine/LineExtensionAmount	1	ITELINES	LNETLINEVAL			42			64.0			DXInvoice/InvoiceLine/LineExtensionAmount	ITELINES	LNETLINEVAL				1	64	0		
1309	DXInvoice/InvoiceLine/Price/PriceAmount	1	ITELINES	PRICE			42			79.0			DXInvoice/InvoiceLine/Price/PriceAmount	ITELINES	PRICE				1	79	0		
1310	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/Percent	1	ITELINES	VAT			42	SELECT '[' + STUFF((SELECT ',' + CONVERT(NVARCHAR(20), PERCNT) FROM VAT WHERE VAT in ({S1Table1.S1Field1}) FOR xml path('')), 1, 1, '') + ']'		77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/Percent	ITELINES	VAT		SQL_TRANSFORM	SELECT '[' + STUFF((SELECT ',' + CONVERT(NVARCHAR(20), PERCNT) FROM VAT WHERE VAT in ({S1Table1.S1Field1}) FOR xml path('')), 1, 1, '') + ']'	1	77	0		
1311	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxableAmount	1	ITELINES	LNETLINEVAL			42			77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxableAmount	ITELINES	LNETLINEVAL				1	77	0		
1312	DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxAmount	1	ITELINES	VATAMNT			42			77.0			DXInvoice/InvoiceLine/TaxTotal/TaxSubtotal/TaxAmount	ITELINES	VATAMNT				1	77	0		
1313	SellerSupplierParty/CustomerAssignedAccountID	1	SALDOC	CCCSELLERID			39						SellerSupplierParty/CustomerAssignedAccountID	SALDOC	CCCSELLERID				1		0		
1314	OrderLine/Item/PackSizeNumeric	1	ITELINES	CCCCUTII			41						OrderLine/Item/PackSizeNumeric	ITELINES	CCCCUTII				1		0		
1315	RequestedDeliveryPeriod/EndDate	1	MTRDOC	DELIVDATE			47						RequestedDeliveryPeriod/EndDate	MTRDOC	DELIVDATE				1		0		
1316	ID	1	SALDOC	NUM04			47						ID	SALDOC	NUM04				1		0		
1317	IssueDate	1	SALDOC	DATE01			47						IssueDate	SALDOC	DATE01				1		0		
1318	DeliveryParty/EndpointID	1	SALDOC	TRDBRANCH			47	select trdbranch from trdbranch where trdr=12664 AND cccs1dxgln='{value}'					DeliveryParty/EndpointID	SALDOC	TRDBRANCH		SQL_TRANSFORM	select trdbranch from trdbranch where trdr=12664 AND cccs1dxgln='{value}'	1		0		
1319	OrderLine/Price/Amount	1	ITELINES	PRICE			47						OrderLine/Price/Amount	ITELINES	PRICE				1		0		
1320	OrderLine/Quantity/Amount	1	ITELINES	QTY1			47						OrderLine/Quantity/Amount	ITELINES	QTY1				1		0		
1321	OrderLine/Item/BuyersItemIdentification	1	ITELINES	MTRL			47	select mtrl from CCCS1DXTRDRMTRL where trdr=12664 and code='{value}'					OrderLine/Item/BuyersItemIdentification	ITELINES	MTRL		SQL_TRANSFORM	select mtrl from CCCS1DXTRDRMTRL where trdr=12664 and code='{value}'	1		0		
1322	RequestedDeliveryPeriod/EndDate	1	MTRDOC	DELIVDATE			48						RequestedDeliveryPeriod/EndDate	MTRDOC	DELIVDATE				1		0		
1323	ID	1	SALDOC	NUM04			48						ID	SALDOC	NUM04				1		0		
1324	IssueDate	1	SALDOC	DATE01			48						IssueDate	SALDOC	DATE01				1		0		
1325	DeliveryParty/EndpointID	1	SALDOC	TRDBRANCH			48	select trdbranch from trdbranch where trdr=38804 AND cccs1dxgln='{value}'					DeliveryParty/EndpointID	SALDOC	TRDBRANCH		SQL_TRANSFORM	select trdbranch from trdbranch where trdr=38804 AND cccs1dxgln='{value}'	1		0		
1326	OrderLine/Price/Amount	1	ITELINES	PRICE			48						OrderLine/Price/Amount	ITELINES	PRICE				1		0		
1327	OrderLine/Quantity/Amount	1	ITELINES	QTY1			48						OrderLine/Quantity/Amount	ITELINES	QTY1				1		0		
1328	OrderLine/Item/BuyersItemIdentification	1	ITELINES	MTRL			48	select mtrl from CCCS1DXTRDRMTRL where trdr=38804 and code='{value}'					OrderLine/Item/BuyersItemIdentification	ITELINES	MTRL		SQL_TRANSFORM	select mtrl from CCCS1DXTRDRMTRL where trdr=38804 and code='{value}'	1		0		

CCCRETAILERSCLIENTS	TRDR_CLIENT	WSURL	WSUSER	WSPASS	COMPANY	BRANCH
1	1	https://petfactory.oncloud.gr/s1services	websitepetfactory	petfactory4321	50	1000