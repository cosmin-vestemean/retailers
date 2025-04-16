# Arhitectură Tehnică pentru Platforma EDI - Nivel Mediu de Detaliere

## 1. Schema de Date Extinsă (Cu Implementare)

### 1.1 Script Complet Tabele Noi

```sql
-- Tabel pentru documente XML raw (înlocuiește stocarea în filesystem)
CREATE TABLE CCCEDIRAWDOCUMENTS (
  CCCEDIRAWDOCUMENTS INT NOT NULL IDENTITY(1, 1),
  FILENAME VARCHAR(255) NOT NULL,             -- Numele original al fișierului de pe SFTP
  PROVIDER VARCHAR(50) NOT NULL,              -- DocProcess, Infinite, etc
  PROVIDER_INSTANCE VARCHAR(50) NULL,         -- Specific provider instance if needed
  RETAILER_ID INT NULL,                       -- FK to TRDR table
  CLIENT_ID INT NOT NULL,                     -- FK to TRDR table (represents our company)
  CONTENT NVARCHAR(MAX) NOT NULL,             -- Conținutul XML stocat ca text
  CONTENT_TYPE VARCHAR(20) NOT NULL DEFAULT 'XML', -- XML, JSON, etc
  DOCUMENT_TYPE VARCHAR(50) NULL,             -- ORDER, INVOICE, DESADV, APERAK
  DOCUMENT_NUMBER VARCHAR(100) NULL,          -- Număr document preluat din XML dacă există
  DOCUMENT_DATE DATETIME NULL,                -- Data document din XML dacă există
  PROCESS_STATUS VARCHAR(20) NOT NULL,        -- NEW, PROCESSING, PROCESSED, ERROR, IGNORED
  DOWNLOAD_DATE DATETIME NOT NULL,            -- Data descărcării de pe SFTP
  PROCESS_DATE DATETIME NULL,                 -- Data procesării sau tentativei de procesare
  PROCESS_MESSAGE VARCHAR(1000) NULL,         -- Mesaj de eroare sau succes
  RELATED_FINDOC INT NULL,                    -- Document S1 creat/corelat
  APP_OWNER VARCHAR(20) NULL,                 -- 'legacy' sau 'new' pentru tranziție
  CONSTRAINT PK_CCCEDIRAWDOCUMENTS PRIMARY KEY (CCCEDIRAWDOCUMENTS)
);

CREATE INDEX IDX_CCCRAWS_STATUS ON CCCEDIRAWDOCUMENTS (PROCESS_STATUS, DOWNLOAD_DATE);
CREATE INDEX IDX_CCCRAWS_RETAILER ON CCCEDIRAWDOCUMENTS (RETAILER_ID, DOCUMENT_TYPE);
CREATE INDEX IDX_CCCRAWS_FINDOC ON CCCEDIRAWDOCUMENTS (RELATED_FINDOC);

-- Tabel pentru monitorizare centralizată
CREATE TABLE CCCEDIPROCESSMONITOR (
  CCCEDIPROCESSMONITOR INT NOT NULL IDENTITY(1, 1),
  PROCESS_TYPE VARCHAR(50) NOT NULL,           -- 'INBOUND', 'OUTBOUND', 'APERAK'
  DOCUMENT_TYPE VARCHAR(50) NOT NULL,          -- 'ORDER', 'INVOICE', 'DESADV', etc.
  TRDR_RETAILER INT NOT NULL,                  -- FK to TRDR table
  TRDR_CLIENT INT NOT NULL,                    -- FK to TRDR table (our company)
  FILENAME VARCHAR(250) NULL,                  -- Numele fișierului procesat
  FINDOC INT NULL,                             -- Document S1 asociat
  RAW_DOCUMENT_ID INT NULL,                    -- FK to CCCEDIRAWDOCUMENTS
  ORIGINAL_DOCUMENT_ID VARCHAR(100) NULL,      -- ID document original (ex: nr. comandă)
  PROCESS_DATE DATETIME NOT NULL DEFAULT GETDATE(),
  COMPLETE_DATE DATETIME NULL,                 -- Data finalizare procesare
  STATUS VARCHAR(50) NOT NULL,                 -- 'SUCCESS', 'ERROR', 'WARNING', 'PENDING'
  SUBSTATUS VARCHAR(50) NULL,                  -- Detalii suplimentare despre status
  ERROR_CODE VARCHAR(50) NULL,                 -- Cod de eroare pentru categorisire
  ERROR_MESSAGE NVARCHAR(MAX) NULL,            -- Mesaj detaliat eroare
  PROCESS_DURATION INT NULL,                   -- Durata în ms
  RETRY_COUNT INT DEFAULT 0,                   -- Număr de reîncercări
  NEXT_RETRY_DATE DATETIME NULL,               -- Data programată pentru reîncercare
  USER_PROCESSED VARCHAR(50) NULL,             -- Utilizator care a procesat manual
  CONSTRAINT PK_CCCEDIPROCESSMONITOR PRIMARY KEY (CCCEDIPROCESSMONITOR)
);

CREATE INDEX IDX_CCCEDIMON_STATUS ON CCCEDIPROCESSMONITOR (STATUS, PROCESS_DATE);
CREATE INDEX IDX_CCCEDIMON_RETAILER ON CCCEDIPROCESSMONITOR (TRDR_RETAILER, DOCUMENT_TYPE);
CREATE INDEX IDX_CCCEDIMON_FINDOC ON CCCEDIPROCESSMONITOR (FINDOC);
CREATE INDEX IDX_CCCEDIMON_RAW ON CCCEDIPROCESSMONITOR (RAW_DOCUMENT_ID);

-- Tabel pentru mapare documente cu extensii noi
CREATE TABLE CCCDOCUMENTES1MAPPINGS (
  CCCDOCUMENTES1MAPPINGS INT NOT NULL IDENTITY(1, 1),
  TRDR_RETAILER INT NOT NULL,                 -- FK to TRDR table
  TRDR_CLIENT INT NOT NULL,                   -- FK to TRDR table (our company) 
  SOSOURCE INT NOT NULL,                      -- Source type (S1)
  FPRMS INT NOT NULL,                         -- Financial parameter set (S1)
  SERIES INT NOT NULL,                        -- Document series (S1)
  DOCUMENT_TYPE VARCHAR(20) NOT NULL,         -- EDI document type (ORDERS, INVOIC, etc)
  DIRECTION VARCHAR(10) NOT NULL,             -- INBOUND, OUTBOUND
  DIRECTION_PATH VARCHAR(100) NULL,           -- Path on EDI server
  XML_ROOT_NODE VARCHAR(100) NULL,            -- Root XML node for identification 
  AUTO_PROCESS TINYINT NOT NULL DEFAULT 1,    -- 0=Manual, 1=Auto Process
  IDENTIFICATION_XPATH VARCHAR(255) NULL,     -- XPath to identify retailer
  TEST_MODE TINYINT NOT NULL DEFAULT 0,       -- 0=No, 1=Test Mode
  ACTIVE TINYINT NOT NULL DEFAULT 1,          -- 0=Disabled, 1=Enabled
  MODIFIED_ON DATETIME NOT NULL DEFAULT GETDATE(),
  MODIFIED_BY VARCHAR(50) NULL,
  CONSTRAINT PK_CCCDOCMAPPINGS PRIMARY KEY (CCCDOCUMENTES1MAPPINGS)
);

-- Modificări tabele existente
ALTER TABLE CCCSFTP ADD PROVIDER_TYPE VARCHAR(20); 
ALTER TABLE CCCSFTP ADD PROVIDER_VERSION VARCHAR(20);
ALTER TABLE CCCSFTP ADD API_KEY VARCHAR(255);
ALTER TABLE CCCSFTP ADD API_SECRET VARCHAR(255);
ALTER TABLE CCCSFTP ADD CONNECTION_TIMEOUT INT DEFAULT 30;
ALTER TABLE CCCSFTP ADD ACTIVE TINYINT DEFAULT 1;

ALTER TABLE CCCXMLS1MAPPINGS ADD VALIDATION_RULE VARCHAR(500);
ALTER TABLE CCCXMLS1MAPPINGS ADD ERROR_MESSAGE VARCHAR(200); 
ALTER TABLE CCCXMLS1MAPPINGS ADD DEFAULT_VALUE VARCHAR(255);
ALTER TABLE CCCXMLS1MAPPINGS ADD TRANSFORMATION_TYPE VARCHAR(20); -- DIRECT, LOOKUP, SCRIPT
ALTER TABLE CCCXMLS1MAPPINGS ADD TRANSFORMATION_SCRIPT NVARCHAR(MAX);
```

## 2. Implementare Endpoints S1

### 2.1 Endpoint pentru Gestionarea Documentelor Raw

```javascript
// Cod specific S1 - AJS
// EDIDocumentService.js

/**
 * Stochează un document XML raw în baza de date S1
 * @param {Object} obj Parametrii pentru stocare
 * @returns {Object} Rezultatul operațiunii
 */
function storeRawXMLDocument(obj) {
    try {
        // Validare parametri obligatorii
        if (!obj.content || !obj.filename || !obj.provider) {
            return { 
                success: false, 
                error: "Parametrii obligatorii lipsă: content, filename, provider" 
            };
        }

        var clientId = obj.clientId || X.SYS.COMPANY;
        var retailerId = obj.retailerId || null;
        var documentType = obj.documentType || null;
        var documentNumber = obj.documentNumber || null;
        var documentDate = obj.documentDate || null;
        var appOwner = obj.appOwner || 'new';

        // Verificare dacă fișierul există deja
        var checkDs = X.GETSQLDATASET(
            "SELECT CCCEDIRAWDOCUMENTS FROM CCCEDIRAWDOCUMENTS WHERE FILENAME = :1 AND PROVIDER = :2",
            obj.filename, obj.provider
        );
        
        if (!checkDs.EOF) {
            return {
                success: false,
                error: "Fișierul a fost deja importat",
                fileId: checkDs.CCCEDIRAWDOCUMENTS
            };
        }

        // Inserare document nou
        X.RUNSQL(`
            INSERT INTO CCCEDIRAWDOCUMENTS 
                (FILENAME, PROVIDER, RETAILER_ID, CLIENT_ID, 
                CONTENT, DOCUMENT_TYPE, DOCUMENT_NUMBER, DOCUMENT_DATE,
                PROCESS_STATUS, DOWNLOAD_DATE, APP_OWNER)
            VALUES 
                (:1, :2, :3, :4, :5, :6, :7, :8, 'NEW', GETDATE(), :9)
        `, obj.filename, obj.provider, retailerId, clientId, 
           obj.content, documentType, documentNumber, documentDate, appOwner);
        
        // Obținere ID-ul noului document
        var newDocDs = X.GETSQLDATASET(
            "SELECT CCCEDIRAWDOCUMENTS FROM CCCEDIRAWDOCUMENTS WHERE FILENAME = :1 AND PROVIDER = :2",
            obj.filename, obj.provider
        );
        
        if (newDocDs.EOF) {
            return {
                success: false,
                error: "Eroare la inserare - documentul nu a fost găsit după inserare"
            };
        }
        
        var newDocId = newDocDs.CCCEDIRAWDOCUMENTS;
        
        // Identificare retailer dacă nu este specificat
        if (!retailerId && documentType) {
            identifyRetailerAndUpdate(newDocId);
        }
        
        // Logare activitate
        logProcessActivity({
            processType: 'DOWNLOAD',
            documentType: documentType || 'UNKNOWN',
            retailerId: retailerId || 0,
            clientId: clientId,
            filename: obj.filename,
            status: 'SUCCESS',
            rawDocumentId: newDocId
        });
        
        return {
            success: true,
            fileId: newDocId,
            message: "Document salvat cu succes"
        };
    } catch (error) {
        // Logare eroare
        X.RUNSQL(`
            INSERT INTO CCCEDIPROCESSMONITOR
                (PROCESS_TYPE, DOCUMENT_TYPE, TRDR_RETAILER, TRDR_CLIENT,
                 FILENAME, STATUS, ERROR_MESSAGE, PROCESS_DATE)
            VALUES
                ('DOWNLOAD', 'UNKNOWN', 0, :1, :2, 'ERROR', :3, GETDATE())
        `, X.SYS.COMPANY, obj.filename || 'N/A', error.message);
        
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Identifică retailer-ul pe baza conținutului XML și actualizează înregistrarea
 * @param {number} docId ID-ul documentului raw
 * @returns {boolean} Rezultatul identificării
 */
function identifyRetailerAndUpdate(docId) {
    try {
        // Obținere conținut și tip document
        var docDs = X.GETSQLDATASET(`
            SELECT CONTENT, DOCUMENT_TYPE 
            FROM CCCEDIRAWDOCUMENTS 
            WHERE CCCEDIRAWDOCUMENTS = :1
        `, docId);
        
        if (docDs.EOF) return false;
        
        var content = docDs.CONTENT;
        var docType = docDs.DOCUMENT_TYPE;
        
        // Obținere mapări de documente active pentru tip document
        var mappingsDs = X.GETSQLDATASET(`
            SELECT m.CCCDOCUMENTES1MAPPINGS, m.TRDR_RETAILER, m.IDENTIFICATION_XPATH
            FROM CCCDOCUMENTES1MAPPINGS m
            WHERE m.DOCUMENT_TYPE = :1
              AND m.DIRECTION = 'INBOUND'
              AND m.ACTIVE = 1
        `, docType);
        
        if (mappingsDs.EOF) return false;
        
        // Creare obiect DOM pentru XPath query
        var xmlDoc = X.CREATEOBJ('MSXML2.DOMDocument.6.0');
        xmlDoc.async = false;
        xmlDoc.loadXML(content);
        
        if (xmlDoc.parseError.errorCode != 0) {
            X.RUNSQL(`
                UPDATE CCCEDIRAWDOCUMENTS SET 
                PROCESS_MESSAGE = :1,
                PROCESS_STATUS = 'ERROR'
                WHERE CCCEDIRAWDOCUMENTS = :2
            `, "XML parse error: " + xmlDoc.parseError.reason, docId);
            return false;
        }
        
        mappingsDs.FIRST;
        while (!mappingsDs.EOF) {
            try {
                var xpath = mappingsDs.IDENTIFICATION_XPATH;
                if (!xpath) {
                    mappingsDs.NEXT;
                    continue;
                }
                
                var nodes = xmlDoc.selectNodes(xpath);
                if (nodes.length > 0) {
                    // Retailer identificat
                    X.RUNSQL(`
                        UPDATE CCCEDIRAWDOCUMENTS SET 
                        RETAILER_ID = :1
                        WHERE CCCEDIRAWDOCUMENTS = :2
                    `, mappingsDs.TRDR_RETAILER, docId);
                    return true;
                }
            } catch (e) {
                // Eroare la evaluarea XPath - continuăm cu următoarea mapare
            }
            mappingsDs.NEXT;
        }
        
        // Nu s-a găsit retailer compatibil
        X.RUNSQL(`
            UPDATE CCCEDIRAWDOCUMENTS SET 
            PROCESS_MESSAGE = 'Nu s-a putut identifica retailer-ul',
            PROCESS_STATUS = 'ERROR'
            WHERE CCCEDIRAWDOCUMENTS = :1
        `, docId);
        
        return false;
    } catch (error) {
        X.RUNSQL(`
            UPDATE CCCEDIRAWDOCUMENTS SET 
            PROCESS_MESSAGE = :1,
            PROCESS_STATUS = 'ERROR'
            WHERE CCCEDIRAWDOCUMENTS = :2
        `, "Eroare identificare retailer: " + error.message, docId);
        return false;
    }
}

/**
 * Procesează documentele raw în așteptare
 * @param {Object} obj Parametri opționali de filtrare
 * @returns {Object} Rezultate procesare
 */
function processNewDocuments(obj) {
    try {
        var retailerId = obj.retailerId || 0;
        var limit = obj.limit || 10;
        var appOwner = obj.appOwner || 'new';
        
        var whereClause = "WHERE PROCESS_STATUS = 'NEW'";
        if (retailerId > 0) {
            whereClause += " AND RETAILER_ID = " + retailerId;
        }
        if (appOwner) {
            whereClause += " AND APP_OWNER = '" + appOwner + "'";
        }
        
        var pendingDocsDs = X.GETSQLDATASET(`
            SELECT TOP ${limit} * FROM CCCEDIRAWDOCUMENTS
            ${whereClause}
            ORDER BY DOWNLOAD_DATE
        `);
        
        var results = {
            processed: 0,
            failed: 0,
            skipped: 0,
            details: []
        };
        
        pendingDocsDs.FIRST;
        while (!pendingDocsDs.EOF) {
            var docId = pendingDocsDs.CCCEDIRAWDOCUMENTS;
            
            // Marcare document ca fiind în procesare
            X.RUNSQL(`
                UPDATE CCCEDIRAWDOCUMENTS SET
                PROCESS_STATUS = 'PROCESSING',
                PROCESS_DATE = GETDATE()
                WHERE CCCEDIRAWDOCUMENTS = :1
            `, docId);
            
            var startTime = new Date().getTime();
            var processResult = {};
            
            try {
                // Procesare în funcție de tipul documentului
                switch (pendingDocsDs.DOCUMENT_TYPE) {
                    case 'ORDER':
                        processResult = processOrderDocument(docId);
                        break;
                    case 'APERAK':
                        processResult = processAperakDocument(docId);
                        break;
                    default:
                        processResult = {
                            success: false,
                            error: "Tip document nesuportat: " + pendingDocsDs.DOCUMENT_TYPE
                        };
                }
                
                var duration = new Date().getTime() - startTime;
                
                // Actualizare status document
                var newStatus = processResult.success ? 'PROCESSED' : 'ERROR';
                X.RUNSQL(`
                    UPDATE CCCEDIRAWDOCUMENTS SET
                    PROCESS_STATUS = :1,
                    PROCESS_MESSAGE = :2,
                    RELATED_FINDOC = :3
                    WHERE CCCEDIRAWDOCUMENTS = :4
                `, newStatus, 
                   processResult.message || processResult.error || '', 
                   processResult.findoc || null,
                   docId);
                
                // Adăugare în monitor
                logProcessActivity({
                    processType: 'PROCESSING',
                    documentType: pendingDocsDs.DOCUMENT_TYPE || 'UNKNOWN',
                    retailerId: pendingDocsDs.RETAILER_ID || 0,
                    clientId: pendingDocsDs.CLIENT_ID,
                    filename: pendingDocsDs.FILENAME,
                    findoc: processResult.findoc || null,
                    rawDocumentId: docId,
                    status: processResult.success ? 'SUCCESS' : 'ERROR',
                    errorMessage: processResult.error || '',
                    processDuration: duration
                });
                
                if (processResult.success) {
                    results.processed++;
                } else {
                    results.failed++;
                }
                
                results.details.push({
                    id: docId,
                    filename: pendingDocsDs.FILENAME,
                    type: pendingDocsDs.DOCUMENT_TYPE,
                    success: processResult.success,
                    message: processResult.message || processResult.error || '',
                    findoc: processResult.findoc
                });
                
            } catch (error) {
                X.RUNSQL(`
                    UPDATE CCCEDIRAWDOCUMENTS SET
                    PROCESS_STATUS = 'ERROR',
                    PROCESS_MESSAGE = :1
                    WHERE CCCEDIRAWDOCUMENTS = :2
                `, error.message, docId);
                
                logProcessActivity({
                    processType: 'PROCESSING',
                    documentType: pendingDocsDs.DOCUMENT_TYPE || 'UNKNOWN',
                    retailerId: pendingDocsDs.RETAILER_ID || 0,
                    clientId: pendingDocsDs.CLIENT_ID,
                    filename: pendingDocsDs.FILENAME,
                    rawDocumentId: docId,
                    status: 'ERROR',
                    errorMessage: error.message
                });
                
                results.failed++;
                results.details.push({
                    id: docId,
                    filename: pendingDocsDs.FILENAME,
                    type: pendingDocsDs.DOCUMENT_TYPE,
                    success: false,
                    message: error.message
                });
            }
            
            pendingDocsDs.NEXT;
        }
        
        return {
            success: true,
            results: results
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Înregistrează activitate de procesare în monitorul central
 * @param {Object} obj Detalii despre procesare
 */
function logProcessActivity(obj) {
    try {
        X.RUNSQL(`
            INSERT INTO CCCEDIPROCESSMONITOR
                (PROCESS_TYPE, DOCUMENT_TYPE, TRDR_RETAILER, TRDR_CLIENT,
                 FILENAME, FINDOC, RAW_DOCUMENT_ID, PROCESS_DATE,
                 STATUS, ERROR_MESSAGE, PROCESS_DURATION)
            VALUES
                (:1, :2, :3, :4, :5, :6, :7, GETDATE(), :8, :9, :10)
        `, obj.processType || 'UNKNOWN',
           obj.documentType || 'UNKNOWN',
           obj.retailerId || 0,
           obj.clientId || X.SYS.COMPANY,
           obj.filename || '',
           obj.findoc || null,
           obj.rawDocumentId || null,
           obj.status || 'UNKNOWN',
           obj.errorMessage || '',
           obj.processDuration || null);
    } catch (error) {
        X.WARNING("Eroare la logarea activității: " + error.message);
    }
}
```

### 2.2 Endpoint pentru Mapări Documente și Câmpuri

```javascript
// Cod specific S1 - AJS
// EDIMappingService.js

/**
 * Obține mapările de documente configurate
 * @param {Object} obj Parametri de filtrare
 * @returns {Object} Mapările găsite
 */
function getDocumentMappings(obj) {
    try {
        var retailerId = obj.retailerId || 0;
        var documentType = obj.documentType || '';
        var direction = obj.direction || '';
        
        var whereClause = ' WHERE 1=1';
        var params = [];
        
        if (retailerId > 0) {
            whereClause += ' AND M.TRDR_RETAILER = :' + (params.length + 1);
            params.push(retailerId);
        }
        
        if (documentType) {
            whereClause += ' AND M.DOCUMENT_TYPE = :' + (params.length + 1);
            params.push(documentType);
        }
        
        if (direction) {
            whereClause += ' AND M.DIRECTION = :' + (params.length + 1);
            params.push(direction);
        }
        
        var query = `
            SELECT 
                M.CCCDOCUMENTES1MAPPINGS,
                M.TRDR_RETAILER,
                T.CODE AS RETAILER_CODE, 
                T.NAME AS RETAILER_NAME,
                M.TRDR_CLIENT,
                M.SOSOURCE,
                SS.NAME AS SOSOURCE_NAME,
                M.FPRMS,
                FP.NAME AS FPRMS_NAME,
                M.SERIES,
                S.NAME AS SERIES_NAME,
                M.DOCUMENT_TYPE,
                M.DIRECTION,
                M.DIRECTION_PATH,
                M.XML_ROOT_NODE,
                M.AUTO_PROCESS,
                M.IDENTIFICATION_XPATH,
                M.TEST_MODE,
                M.ACTIVE,
                M.MODIFIED_ON,
                M.MODIFIED_BY,
                (SELECT COUNT(*) FROM CCCXMLS1MAPPINGS X WHERE X.CCCDOCUMENTES1MAPPINGS = M.CCCDOCUMENTES1MAPPINGS) AS FIELD_COUNT
            FROM CCCDOCUMENTES1MAPPINGS M
            JOIN TRDR T ON M.TRDR_RETAILER = T.TRDR
            JOIN SOSOURCES SS ON M.SOSOURCE = SS.SOSOURCE
            JOIN FPRMS FP ON M.FPRMS = FP.FPRMS
            JOIN SERIES S ON M.SERIES = S.SERIES
            ${whereClause}
            ORDER BY T.NAME, M.DOCUMENT_TYPE, SS.NAME
        `;
        
        var dataset = X.GETSQLDATASET(query, ...params);
        
        return {
            success: true,
            data: JSON.parse(dataset.JSON),
            total: dataset.RECORDCOUNT
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Salvează o mapare de document
 * @param {Object} obj Datele pentru mapare
 * @returns {Object} Rezultatul operațiunii
 */
function saveDocumentMapping(obj) {
    try {
        var id = obj.CCCDOCUMENTES1MAPPINGS || 0;
        var operation = id > 0 ? "update" : "insert";
        var myObj = X.CREATEOBJ('CUSTOMFORM;CCCDOCMAPPING');
        var tbl;
        
        if (operation === "update") {
            // Verifică dacă înregistrarea există
            var checkDs = X.GETSQLDATASET(`
                SELECT CCCDOCUMENTES1MAPPINGS 
                FROM CCCDOCUMENTES1MAPPINGS 
                WHERE CCCDOCUMENTES1MAPPINGS = :1
            `, id);
            
            if (checkDs.EOF) {
                return {
                    success: false,
                    error: "Maparea documentului cu ID-ul " + id + " nu există"
                };
            }
            
            myObj.DBLOCATE(id);
        } else {
            // Verificăm dacă există deja o mapare similară
            var checkDs = X.GETSQLDATASET(`
                SELECT CCCDOCUMENTES1MAPPINGS 
                FROM CCCDOCUMENTES1MAPPINGS 
                WHERE TRDR_RETAILER = :1 
                AND DOCUMENT_TYPE = :2
                AND DIRECTION = :3
                AND SOSOURCE = :4
                AND FPRMS = :5
                AND SERIES = :6
            `, obj.TRDR_RETAILER, obj.DOCUMENT_TYPE, obj.DIRECTION,
               obj.SOSOURCE, obj.FPRMS, obj.SERIES);
            
            if (!checkDs.EOF) {
                return {
                    success: false,
                    error: "Există deja o mapare pentru acest retailer și tip de document cu aceeași serie"
                };
            }
            
            myObj.DBINSERT();
        }
        
        tbl = myObj.FINDTABLE('CCCDOCUMENTES1MAPPINGS');
        
        // Setare câmpuri
        tbl.TRDR_RETAILER = obj.TRDR_RETAILER;
        tbl.TRDR_CLIENT = obj.TRDR_CLIENT || X.SYS.COMPANY;
        tbl.SOSOURCE = obj.SOSOURCE;
        tbl.FPRMS = obj.FPRMS;
        tbl.SERIES = obj.SERIES;
        tbl.DOCUMENT_TYPE = obj.DOCUMENT_TYPE;
        tbl.DIRECTION = obj.DIRECTION;
        tbl.DIRECTION_PATH = obj.DIRECTION_PATH || '';
        tbl.XML_ROOT_NODE = obj.XML_ROOT_NODE || '';
        tbl.AUTO_PROCESS = obj.AUTO_PROCESS || 1;
        tbl.IDENTIFICATION_XPATH = obj.IDENTIFICATION_XPATH || '';
        tbl.TEST_MODE = obj.TEST_MODE || 0;
        tbl.ACTIVE = obj.ACTIVE || 1;
        tbl.MODIFIED_BY = X.SYS.USER;
        
        // Salvare
        var newId = myObj.DBPOST();
        
        return {
            success: true,
            id: newId,
            message: operation === "update" ? "Mapare actualizată cu succes" : "Mapare creată cu succes"
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Clonează o mapare de document existentă pentru alt retailer
 * @param {Object} obj Parametri pentru clonare
 * @returns {Object} Rezultatul operațiunii
 */
function cloneDocumentMapping(obj) {
    try {
        var sourceId = obj.sourceId;
        var targetRetailerId = obj.targetRetailerId;
        var includeMappings = obj.includeMappings !== false; // implicit true
        
        if (!sourceId || !targetRetailerId) {
            return {
                success: false,
                error: "ID-ul sursei și ID-ul retailer-ului țintă sunt obligatorii"
            };
        }
        
        // Verifică dacă există maparea sursă
        var sourceDs = X.GETSQLDATASET(`
            SELECT * FROM CCCDOCUMENTES1MAPPINGS 
            WHERE CCCDOCUMENTES1MAPPINGS = :1
        `, sourceId);
        
        if (sourceDs.EOF) {
            return {
                success: false,
                error: "Maparea sursă nu există"
            };
        }
        
        // Verifică dacă există deja o mapare pentru retailer-ul țintă și același tip de document
        var checkDs = X.GETSQLDATASET(`
            SELECT CCCDOCUMENTES1MAPPINGS 
            FROM CCCDOCUMENTES1MAPPINGS 
            WHERE TRDR_RETAILER = :1 
            AND DOCUMENT_TYPE = :2
            AND DIRECTION = :3
            AND SOSOURCE = :4
            AND FPRMS = :5
            AND SERIES = :6
        `, targetRetailerId, sourceDs.DOCUMENT_TYPE, sourceDs.DIRECTION,
           sourceDs.SOSOURCE, sourceDs.FPRMS, sourceDs.SERIES);
        
        if (!checkDs.EOF) {
            return {
                success: false,
                error: "Există deja o mapare pentru retailer-ul țintă cu aceste setări"
            };
        }
        
        // Creare mapare nouă
        var myObj = X.CREATEOBJ('CUSTOMFORM;CCCDOCMAPPING');
        myObj.DBINSERT();
        
        var tbl = myObj.FINDTABLE('CCCDOCUMENTES1MAPPINGS');
        tbl.TRDR_RETAILER = targetRetailerId;
        tbl.TRDR_CLIENT = sourceDs.TRDR_CLIENT;
        tbl.SOSOURCE = sourceDs.SOSOURCE;
        tbl.FPRMS = sourceDs.FPRMS;
        tbl.SERIES = sourceDs.SERIES;
        tbl.DOCUMENT_TYPE = sourceDs.DOCUMENT_TYPE;
        tbl.DIRECTION = sourceDs.DIRECTION;
        tbl.DIRECTION_PATH = sourceDs.DIRECTION_PATH;
        tbl.XML_ROOT_NODE = sourceDs.XML_ROOT_NODE;
        tbl.AUTO_PROCESS = sourceDs.AUTO_PROCESS;
        tbl.IDENTIFICATION_XPATH = sourceDs.IDENTIFICATION_XPATH;
        tbl.TEST_MODE = sourceDs.TEST_MODE;
        tbl.ACTIVE = sourceDs.ACTIVE;
        tbl.MODIFIED_BY = X.SYS.USER;
        
        var newId = myObj.DBPOST();
        
        // Clonează și mapările de câmpuri dacă este necesar
        if (includeMappings) {
            var mappingsDs = X.GETSQLDATASET(`
                SELECT * FROM CCCXMLS1MAPPINGS
                WHERE CCCDOCUMENTES1MAPPINGS = :1
                ORDER BY XMLORDER
            `, sourceId);
            
            mappingsDs.FIRST;
            while (!mappingsDs.EOF) {
                X.RUNSQL(`
                    INSERT INTO CCCXMLS1MAPPINGS 
                        (CCCDOCUMENTES1MAPPINGS, XMLNODE, MANDATORY, 
                         S1TABLE1, S1FIELD1, S1TABLE2, S1FIELD2,
                         SQL, OBSERVATII, XMLORDER, SIZE, FORMAT,
                         VALIDATION_RULE, ERROR_MESSAGE, DEFAULT_VALUE,
                         TRANSFORMATION_TYPE, TRANSFORMATION_SCRIPT)
                    VALUES
                        (:1, :2, :3, :4, :5, :6, :7, :8, :9, :10, :11, :12,
                         :13, :14, :15, :16, :17)
                `, newId, mappingsDs.XMLNODE, mappingsDs.MANDATORY,
                   mappingsDs.S1TABLE1, mappingsDs.S1FIELD1, 
                   mappingsDs.S1TABLE2, mappingsDs.S1FIELD2,
                   mappingsDs.SQL, mappingsDs.OBSERVATII, 
                   mappingsDs.XMLORDER, mappingsDs.SIZE, mappingsDs.FORMAT,
                   mappingsDs.VALIDATION_RULE, mappingsDs.ERROR_MESSAGE,
                   mappingsDs.DEFAULT_VALUE, mappingsDs.TRANSFORMATION_TYPE,
                   mappingsDs.TRANSFORMATION_SCRIPT);
                
                mappingsDs.NEXT;
            }
        }
        
        return {
            success: true,
            id: newId,
            message: "Mapare clonată cu succes" + (includeMappings ? " inclusiv mapările de câmpuri" : "")
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}
```

## 3. Implementare FeathersJS Middleware

```javascript
// EDIConnectorService.js - middleware pentru conectarea la providerii EDI

const { Service } = require('@feathersjs/feathers');
const { Readable } = require('stream');
const { Client } = require('ssh2');
const axios = require('axios');

class EDIConnectorService extends Service {
  constructor(options) {
    super();
    this.options = options || {};
    this.s1Service = options.s1Service;
  }

  /**
   * Conectare la server SFTP și descărcare documente
   */
  async downloadDocumentsFromProvider(data, params) {
    const { providerId } = params.query || {};
    
    if (!providerId) {
      throw new Error('Provider ID is required');
    }

    // Obține configurația provider-ului din S1
    const providerConfig = await this.s1Service.post('/s1services/JS/AJS/EDIConfigService/getEDIConnector', {
      providerId
    });

    if (!providerConfig.success) {
      throw new Error(`Failed to get provider configuration: ${providerConfig.error}`);
    }

    const provider = providerConfig.data;
    
    // Verifică tipul de provider și folosește metoda corespunzătoare
    if (provider.PROVIDER_TYPE === 'SFTP') {
      return await this._downloadFromSFTP(provider);
    } else if (provider.PROVIDER_TYPE === 'API') {
      return await this._downloadFromAPI(provider);
    } else {
      throw new Error(`Unsupported provider type: ${provider.PROVIDER_TYPE}`);
    }
  }

  /**
   * Descarcă documente de pe un server SFTP
   */
  async _downloadFromSFTP(provider) {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      const results = { 
        downloaded: 0, 
        failed: 0,
        skipped: 0,
        files: [] 
      };

      conn.on('ready', () => {
        conn.sftp((err, sftp) => {
          if (err) {
            return reject(new Error(`SFTP subsystem error: ${err.message}`));
          }

          // Listează directorul de intrare
          sftp.readdir(provider.INITIALDIRIN || '/', async (err, list) => {
            if (err) {
              conn.end();
              return reject(new Error(`Failed to read directory: ${err.message}`));
            }

            // Filtrează doar fișierele XML
            const xmlFiles = list.filter(item => 
              item.filename.toLowerCase().endsWith('.xml') && 
              item.attrs.isFile()
            );

            // Procesează fiecare fișier
            for (const file of xmlFiles) {
              try {
                const remoteFilePath = `${provider.INITIALDIRIN || '/'}/${file.filename}`;
                
                // Stream-ul pentru citirea fișierului
                const readStream = sftp.createReadStream(remoteFilePath);
                let xmlContent = '';
                
                // Acumulează datele din stream
                readStream.on('data', (chunk) => {
                  xmlContent += chunk.toString();
                });
                
                // Procesează când s-a terminat de citit
                await new Promise((resolveFile, rejectFile) => {
                  readStream.on('end', async () => {
                    try {
                      // Identifică tipul documentului din XML
                      const docType = this._identifyDocumentType(xmlContent);
                      
                      // Salvează documentul în baza de date S1
                      const storeResult = await this.s1Service.post('/s1services/JS/AJS/EDIDocumentService/storeRawXMLDocument', {
                        filename: file.filename,
                        provider: provider.NAME,
                        content: xmlContent,
                        documentType: docType
                      });
                      
                      if (storeResult.success) {
                        results.downloaded++;
                        results.files.push({
                          filename: file.filename,
                          status: 'success',
                          id: storeResult.fileId
                        });
                        
                        // Șterge fișierul de pe SFTP după salvare
                        try {
                          await new Promise((resolveDelete, rejectDelete) => {
                            sftp.unlink(remoteFilePath, (unlinkErr) => {
                              if (unlinkErr) {
                                rejectDelete(unlinkErr);
                              } else {
                                resolveDelete();
                              }
                            });
                          });
                        } catch (deleteErr) {
                          console.error(`Warning: Could not delete file ${file.filename}: ${deleteErr.message}`);
                        }
                      } else {
                        if (storeResult.fileId) {
                          // Fișierul exista deja
                          results.skipped++;
                          results.files.push({
                            filename: file.filename,
                            status: 'skipped',
                            reason: storeResult.error
                          });
                        } else {
                          results.failed++;
                          results.files.push({
                            filename: file.filename,
                            status: 'error',
                            error: storeResult.error
                          });
                        }
                      }
                      
                      resolveFile();
                    } catch (err) {
                      results.failed++;
                      results.files.push({
                        filename: file.filename,
                        status: 'error',
                        error: err.message
                      });
                      resolveFile();
                    }
                  });
                  
                  readStream.on('error', (err) => {
                    results.failed++;
                    results.files.push({
                      filename: file.filename,
                      status: 'error',
                      error: `Read error: ${err.message}`
                    });
                    rejectFile(err);
                  });
                });
                
              } catch (fileErr) {
                results.failed++;
                results.files.push({
                  filename: file.filename,
                  status: 'error',
                  error: fileErr.message
                });
              }
            }
            
            conn.end();
            resolve(results);
          });
        });
      });
      
      conn.on('error', (err) => {
        reject(new Error(`Connection error: ${err.message}`));
      });
      
      // Configurare conexiune SFTP
      const connConfig = {
        host: provider.URL,
        port: provider.PORT || 22,
        username: provider.USERNAME
      };
      
      // Adaugă parola sau cheie privată în funcție de configurație
      if (provider.PRIVATEKEY) {
        connConfig.privateKey = provider.PRIVATEKEY;
        if (provider.PASSPHRASE) {
          connConfig.passphrase = provider.PASSPHRASE;
        }
      } else {
        connConfig.password = provider.PASSWORD;
      }
      
      // Inițiere conexiune
      conn.connect(connConfig);
    });
  }

  /**
   * Identifică tipul documentului din conținutul XML
   */
  _identifyDocumentType(xmlContent) {
    if (xmlContent.includes('<ORDERS') || xmlContent.includes('<Orders')) {
      return 'ORDER';
    } else if (xmlContent.includes('<INVOIC') || xmlContent.includes('<Invoice')) {
      return 'INVOICE';
    } else if (xmlContent.includes('<DESADV') || xmlContent.includes('<DeliveryNote')) {
      return 'DESADV';
    } else if (xmlContent.includes('<APERAK') || xmlContent.includes('<ApplicationResponseMessage')) {
      return 'APERAK';
    } else if (xmlContent.includes('<RECADV') || xmlContent.includes('<ReceivingAdvice')) {
      return 'RECADV';
    } else if (xmlContent.includes('<RETANN') || xmlContent.includes('<ReturnAnnouncement')) {
      return 'RETANN';
    }
    
    return 'UNKNOWN';
  }

  /**
   * Inițiază procesarea documentelor descărcate
   */
  async processDownloadedDocuments(data, params) {
    const { retailerId, limit } = params.query || {};
    
    try {
      const processResult = await this.s1Service.post('/s1services/JS/AJS/EDIDocumentService/processNewDocuments', {
        retailerId: retailerId || 0,
        limit: limit || 10
      });
      
      return processResult;
    } catch (error) {
      throw new Error(`Failed to process documents: ${error.message}`);
    }
  }
  
  /**
   * Pregătește document S1 pentru trimitere către EDI
   */
  async prepareOutboundDocument(data, params) {
    const { findoc } = data;
    
    if (!findoc) {
      throw new Error('Document ID is required');
    }
    
    try {
      // Verifică dacă documentul e eligibil pentru EDI
      const eligibilityResult = await this.s1Service.post('/s1services/JS/AJS/EDIDocumentService/checkDocumentEligibility', {
        findoc
      });
      
      if (!eligibilityResult.success || !eligibilityResult.eligible) {
        throw new Error(eligibilityResult.error || 'Document is not eligible for EDI');
      }
      
      // Transformă documentul în format XML
      const transformResult = await this.s1Service.post('/s1services/JS/AJS/EDIDocumentService/transformToEDI', {
        findoc,
        mappingId: eligibilityResult.mappingId
      });
      
      if (!transformResult.success) {
        throw new Error(transformResult.error || 'Failed to transform document');
      }
      
      return transformResult;
    } catch (error) {
      throw new Error(`Failed to prepare outbound document: ${error.message}`);
    }
  }
}

module.exports = function (options) {
  return new EDIConnectorService(options);
};
```

## 4. Arhitectură Vue.js 3 - Componente Principale

### 4.1 Structura Componentelor Frontend

```vue
<!-- DocumentTypeMappingEditor.vue -->
<template>
  <div class="document-mapping-editor">
    <div class="card">
      <header class="card-header">
        <p class="card-header-title">
          {{ isNew ? 'Adăugare mapare document' : 'Editare mapare document' }}
        </p>
      </header>
      <div class="card-content">
        <form @submit.prevent="saveMapping">
          <!-- Detalii document -->
          <div class="columns">
            <div class="column">
              <div class="field">
                <label class="label">Retailer</label>
                <div class="control">
                  <div class="select is-fullwidth">
                    <select v-model="mapping.TRDR_RETAILER" required>
                      <option v-for="retailer in retailers" :key="retailer.TRDR" :value="retailer.TRDR">
                        {{ retailer.NAME }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div class="column">
              <div class="field">
                <label class="label">Tip Document EDI</label>
                <div class="control">
                  <div class="select is-fullwidth">
                    <select v-model="mapping.DOCUMENT_TYPE" required>
                      <option value="ORDER">Comandă (ORDER)</option>
                      <option value="INVOICE">Factură (INVOICE)</option>
                      <option value="DESADV">Aviz (DESADV)</option>
                      <option value="RECADV">Recepție (RECADV)</option>
                      <option value="RETANN">Retur (RETANN)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div class="column">
              <div class="field">
                <label class="label">Direcție</label>
                <div class="control">
                  <div class="select is-fullwidth">
                    <select v-model="mapping.DIRECTION" required>
                      <option value="INBOUND">Intrare (INBOUND)</option>
                      <option value="OUTBOUND">Ieșire (OUTBOUND)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Document S1 -->
          <div class="columns">
            <div class="column">
              <div class="field">
                <label class="label">Modul S1</label>
                <div class="control">
                  <div class="select is-fullwidth">
                    <select v-model="mapping.SOSOURCE" required @change="loadFprmsList">
                      <option v-for="source in soSources" :key="source.SOSOURCE" :value="source.SOSOURCE">
                        {{ source.NAME }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div class="column">
              <div class="field">
                <label class="label">Set Parametri</label>
                <div class="control">
                  <div class="select is-fullwidth">
                    <select v-model="mapping.FPRMS" required @change="loadSeriesList">
                      <option v-for="fprm in fprmsList" :key="fprm.FPRMS" :value="fprm.FPRMS">
                        {{ fprm.NAME }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div class="column">
              <div class="field">
                <label class="label">Serie</label>
                <div class="control">
                  <div class="select is-fullwidth">
                    <select v-model="mapping.SERIES" required>
                      <option v-for="series in seriesList" :key="series.SERIES" :value="series.SERIES">
                        {{ series.NAME }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Setări avansate -->
          <div class="columns">
            <div class="column">
              <div class="field">
                <label class="label">XML Root Node</label>
                <div class="control">
                  <input class="input" type="text" v-model="mapping.XML_ROOT_NODE"
                         placeholder="Element rădăcină în XML">
                </div>
              </div>
            </div>
            <div class="column">
              <div class="field">
                <label class="label">Path Director</label>
                <div class="control">
                  <input class="input" type="text" v-model="mapping.DIRECTION_PATH"
                         placeholder="Calea în EDI pentru acest tip de document">
                </div>
              </div>
            </div>
          </div>
          
          <div class="columns">
            <div class="column">
              <div class="field">
                <label class="label">XPath Identificare</label>
                <div class="control">
                  <input class="input" type="text" v-model="mapping.IDENTIFICATION_XPATH"
                         placeholder="XPath pentru identificarea retailer-ului în XML">
                </div>
              </div>
            </div>
            <div class="column is-3">
              <div class="field">
                <label class="label">Activ</label>
                <div class="control">
                  <label class="checkbox">
                    <input type="checkbox" v-model="mapping.ACTIVE">
                    Mapare activă
                  </label>
                </div>
              </div>
            </div>
            <div class="column is-3">
              <div class="field">
                <label class="label">Procesare Automată</label>
                <div class="control">
                  <label class="checkbox">
                    <input type="checkbox" v-model="mapping.AUTO_PROCESS">
                    Procesare automată
                  </label>
                </div>
              </div>
            </div>
            <div class="column is-3">
              <div class="field">
                <label class="label">Mod Test</label>
                <div class="control">
                  <label class="checkbox">
                    <input type="checkbox" v-model="mapping.TEST_MODE">
                    Procesare în mod test
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Butoane acțiune -->
          <div class="field is-grouped mt-5">
            <div class="control">
              <button type="submit" class="button is-primary" :class="{'is-loading': saving}">
                Salvează
              </button>
            </div>
            <div class="control">
              <button type="button" class="button" @click="cancel">
                Anulează
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useS1Service } from '@/services/s1Service';

export default {
  name: 'DocumentTypeMappingEditor',
  props: {
    mappingId: {
      type: Number,
      default: 0
    }
  },
  setup(props, { emit }) {
    const s1Service = useS1Service();
    const mapping = ref({
      TRDR_RETAILER: null,
      DOCUMENT_TYPE: '',
      DIRECTION: 'INBOUND',
      SOSOURCE: null,
      FPRMS: null, 
      SERIES: null,
      XML_ROOT_NODE: '',
      DIRECTION_PATH: '',
      IDENTIFICATION_XPATH: '',
      AUTO_PROCESS: true,
      TEST_MODE: false,
      ACTIVE: true
    });
    
    const retailers = ref([]);
    const soSources = ref([]);
    const fprmsList = ref([]);
    const seriesList = ref([]);
    const saving = ref(false);
    
    const isNew = computed(() => props.mappingId === 0);
    
    // Încărcare date inițiale
    onMounted(async () => {
      try {
        // Încărcare retaileri
        const retailersResult = await s1Service.post('/s1services/JS/AJS/CommonService/getRetailers');
        if (retailersResult.success) {
          retailers.value = retailersResult.data;
        }
        
        // Încărcare module S1
        const soSourcesResult = await s1Service.post('/s1services/JS/AJS/CommonService/getSOSources');
        if (soSourcesResult.success) {
          soSources.value = soSourcesResult.data;
        }
        
        // Încărcare mapare existentă dacă se editează
        if (props.mappingId > 0) {
          const mappingResult = await s1Service.post('/s1services/JS/AJS/EDIMappingService/getDocumentMapping', {
            id: props.mappingId
          });
          
          if (mappingResult.success) {
            mapping.value = { ...mappingResult.data };
            await loadFprmsList();
            await loadSeriesList();
          }
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
        // TODO: Notificare eroare
      }
    });
    
    // Încărcare parametri în funcție de modul
    const loadFprmsList = async () => {
      if (!mapping.value.SOSOURCE) return;
      
      try {
        const fprmsResult = await s1Service.post('/s1services/JS/AJS/CommonService/getFprms', {
          sosource: mapping.value.SOSOURCE
        });
        
        if (fprmsResult.success) {
          fprmsList.value = fprmsResult.data;
        }
      } catch (error) {
        console.error('Failed to load FPRMS list:', error);
      }
    };
    
    // Încărcare serii în funcție de modul și parametri
    const loadSeriesList = async () => {
      if (!mapping.value.SOSOURCE || !mapping.value.FPRMS) return;
      
      try {
        const seriesResult = await s1Service.post('/s1services/JS/AJS/CommonService/getSeries', {
          sosource: mapping.value.SOSOURCE,
          fprms: mapping.value.FPRMS
        });
        
        if (seriesResult.success) {
          seriesList.value = seriesResult.data;
        }
      } catch (error) {
        console.error('Failed to load series list:', error);
      }
    };
    
    // Salvare mapare
    const saveMapping = async () => {
      saving.value = true;
      
      try {
        const result = await s1Service.post('/s1services/JS/AJS/EDIMappingService/saveDocumentMapping', mapping.value);
        
        if (result.success) {
          emit('saved', result.id);
        } else {
          // TODO: Notificare eroare
          console.error('Failed to save mapping:', result.error);
        }
      } catch (error) {
        console.error('Error saving mapping:', error);
      } finally {
        saving.value = false;
      }
    };
    
    // Anulare editare
    const cancel = () => {
      emit('cancel');
    };
    
    return {
      mapping,
      retailers,
      soSources,
      fprmsList,
      seriesList,
      isNew,
      saving,
      loadFprmsList,
      loadSeriesList,
      saveMapping,
      cancel
    };
  }
};
</script>
```

## 5. Diagrame de Flux Detaliate

### 5.1 Flux Procesare Documente Inbound

1. **Download Document XML**
   - EDI Connector verifică periodic SFTP-ul providerului
   - Documentele noi sunt descărcate în memorie
   - Identificare preliminară a tipului de document

2. **Stocare în Baza de Date**
   - Documentul XML este salvat în CCCEDIRAWDOCUMENTS
   - Status inițial: NEW
   - Logare activitate în CCCEDIPROCESSMONITOR

3. **Identificare Retailer**
   - Parsare XML pentru identificare retailer
   - Verificare XPath-uri din configurații
   - Actualizare RETAILER_ID în CCCEDIRAWDOCUMENTS

4. **Verificare Mapare**
   - Căutare mapare corespunzătoare tripletului retailer-tip document-direcție
   - Verificare AUTO_PROCESS, ACTIVE, TEST_MODE
   - Preluare configurație mapare câmpuri

5. **Transformare Date**
   - Parsare XML pentru extragere date conform mapării
   - Aplicare validări și transformări configurate
   - Pregătire structură date pentru S1

6. **Creare Document S1**
   - Creare obiect business S1 corespunzător (X.CREATEOBJ)
   - Populare câmpuri header și linii
   - Aplicare reguli business specifice retailerului

7. **Validare și Salvare**
   - Prevalidare date înainte de DBPOST
   - Salvare document (DBPOST)
   - Tratare erori specifice S1

8. **Actualizare Status**
   - Actualizare PROCESS_STATUS și RELATED_FINDOC în CCCEDIRAWDOCUMENTS
   - Completare detalii procesare în CCCEDIPROCESSMONITOR
   - Notificare UI pentru actualizare în timp real

Acest nivel de detaliere oferă o bază solidă pentru implementarea noii platforme EDI, acoperind atât aspectele de arhitectură cât și detaliile de implementare specifice pentru S1, middleware și frontend.