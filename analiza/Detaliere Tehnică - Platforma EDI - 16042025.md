# Detaliere Tehnică - Platforma EDI

## 1. Arhitectura Software - Detalii Tehnice

### 1.1 Schema Tehnică Componentelor
```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  Vue.js        │     │  FeathersJS    │     │  S1 AJS        │
│  Frontend      │─────┤  Middleware    │─────┤  Backend       │
│  (Heroku)      │     │  (Heroku)      │     │  (On-premise)  │
└────────────────┘     └────────────────┘     └────────────────┘
                             │                        │
                             │                ┌───────▼────────┐
                             │                │ S1 Database    │
                             └────────────────► SQL Server     │
                                              └────────────────┘
```

### 1.2 Fluxul de Date
- **Autentificare**: JWT între Frontend-Middleware, Token API între Middleware-S1
- **Comunicare**: REST pentru operații standard, WebSockets pentru notificări real-time
- **Procesare**: Worker threads pentru procesare asincronă a documentelor

## 2. Schema Detaliată a Bazei de Date

### 2.1 Tabele Primare
```sql
-- Documente brute XML/JSON
CREATE TABLE CCCEDIRAWDOCUMENTS (
    CCCEDIRAWDOCUMENTS INT NOT NULL IDENTITY(1, 1),
    FILENAME VARCHAR(200) NOT NULL,
    PROVIDER VARCHAR(50) NOT NULL,
    RETAILER_ID INT NULL,
    CLIENT_ID INT NOT NULL,
    CONTENT NVARCHAR(MAX) NOT NULL,
    CONTENT_TYPE VARCHAR(20) NOT NULL, -- 'XML', 'JSON'
    DOCUMENT_TYPE VARCHAR(20) NULL, -- 'ORDER', 'INVOICE', 'DESADV', 'APERAK'
    DOCUMENT_NUMBER VARCHAR(50) NULL,
    DOCUMENT_DATE DATETIME NULL,
    DOCUMENT_CURRENCY VARCHAR(3) NULL,
    PROCESS_STATUS VARCHAR(20) NOT NULL DEFAULT 'NEW', -- 'NEW', 'PROCESSED', 'ERROR'
    PROCESS_MESSAGE NVARCHAR(MAX) NULL,
    RELATED_FINDOC INT NULL,
    DOWNLOAD_DATE DATETIME NOT NULL DEFAULT GETDATE(),
    PROCESS_DATE DATETIME NULL,
    APP_OWNER VARCHAR(20) NULL DEFAULT 'new', -- 'legacy', 'new'
    LEGACY_PROCESSING TINYINT NOT NULL DEFAULT 0,
    CONSTRAINT PK_CCCEDIRAWDOCUMENTS PRIMARY KEY (CCCEDIRAWDOCUMENTS)
)

-- Monitor de procesare
CREATE TABLE CCCEDIPROCESSMONITOR (
    CCCEDIPROCESSMONITOR INT NOT NULL IDENTITY(1, 1),
    DOCUMENT_ID INT NOT NULL, -- FK către CCCEDIRAWDOCUMENTS
    PROCESS_STEP VARCHAR(50) NOT NULL,
    STEP_STATUS VARCHAR(20) NOT NULL, -- 'SUCCESS', 'WARNING', 'ERROR'
    MESSAGE NVARCHAR(MAX) NULL,
    EXECUTION_TIME INT NULL, -- msec
    DETAILS NVARCHAR(MAX) NULL, -- JSON cu detalii
    CREATED_DATE DATETIME NOT NULL DEFAULT GETDATE(),
    CREATED_BY VARCHAR(50) NOT NULL,
    CONSTRAINT PK_CCCEDIPROCESSMONITOR PRIMARY KEY (CCCEDIPROCESSMONITOR)
)

-- Mapare document EDI la document S1
CREATE TABLE CCCDOCUMENTES1MAPPINGS (
    CCCDOCUMENTES1MAPPINGS INT NOT NULL IDENTITY(1, 1),
    RETAILER_ID INT NOT NULL,
    DOCUMENT_TYPE VARCHAR(20) NOT NULL, -- 'ORDER', 'INVOICE', 'DESADV', 'APERAK'
    DIRECTION VARCHAR(10) NOT NULL, -- 'INBOUND', 'OUTBOUND'
    SOSOURCE INT NOT NULL,
    FPRMS INT NOT NULL,
    SERIES INT NOT NULL,
    AUTO_PROCESS TINYINT NOT NULL DEFAULT 1,
    ACTIVE TINYINT NOT NULL DEFAULT 1,
    TEST_MODE TINYINT NOT NULL DEFAULT 0,
    XML_ROOT_PATH VARCHAR(200) NULL,
    HEADER_PATH VARCHAR(200) NULL,
    LINES_PATH VARCHAR(200) NULL,
    CREATED_DATE DATETIME NOT NULL DEFAULT GETDATE(),
    MODIFIED_DATE DATETIME NULL,
    CREATED_BY VARCHAR(50) NOT NULL,
    CONSTRAINT PK_CCCDOCUMENTES1MAPPINGS PRIMARY KEY (CCCDOCUMENTES1MAPPINGS),
    CONSTRAINT UQ_CCCDOCUMENTES1MAPPINGS UNIQUE (RETAILER_ID, DOCUMENT_TYPE, DIRECTION)
)
```

### 2.2 Tabele de Configurare
```sql
-- Mapare câmpuri XML la câmpuri S1
CREATE TABLE CCCXMLS1MAPPINGS (
    CCCXMLS1MAPPINGS INT NOT NULL IDENTITY(1, 1),
    MAPPING_ID INT NOT NULL, -- FK către CCCDOCUMENTES1MAPPINGS
    XML_PATH VARCHAR(500) NOT NULL,
    S1_TABLE VARCHAR(50) NOT NULL, -- 'FINDOC', 'ITELINES', etc.
    S1_FIELD VARCHAR(50) NOT NULL,
    DEFAULT_VALUE NVARCHAR(MAX) NULL,
    TRANSFORMATION VARCHAR(50) NULL, -- 'FORMAT_DATE', 'LOOKUP_MTRL', etc.
    TRANSFORMATION_PARAMS NVARCHAR(500) NULL, -- Parametri pentru transformare, format JSON
    REQUIRED TINYINT NOT NULL DEFAULT 0,
    POSITION INT NOT NULL DEFAULT 0,
    CONSTRAINT PK_CCCXMLS1MAPPINGS PRIMARY KEY (CCCXMLS1MAPPINGS)
)

-- Mapare GLN la Retaileri
CREATE TABLE CCCEDIGLNMAPPINGS (
    CCCEDIGLNMAPPINGS INT NOT NULL IDENTITY(1, 1),
    GLN VARCHAR(50) NOT NULL,
    TRDR_RETAILER INT NOT NULL,
    TRDR_CLIENT INT NOT NULL,
    ACTIVE TINYINT NOT NULL DEFAULT 1,
    CONSTRAINT PK_CCCEDIGLNMAPPINGS PRIMARY KEY (CCCEDIGLNMAPPINGS),
    CONSTRAINT UQ_CCCEDIGLNMAPPINGS UNIQUE (GLN)
)

-- Control rutare retaileri (pentru migrare)
CREATE TABLE CCCEDIRETAILERROUTING (
    CCCEDIRETAILERROUTING INT NOT NULL IDENTITY(1, 1),
    TRDR_RETAILER INT NOT NULL,
    PROCESS_IN_LEGACY TINYINT NOT NULL DEFAULT 1,
    ACTIVE TINYINT NOT NULL DEFAULT 1,
    MIGRATION_DATE DATETIME NULL,
    MIGRATED_BY VARCHAR(50) NULL,
    NOTES VARCHAR(500) NULL,
    CONSTRAINT PK_CCCEDIRETAILERROUTING PRIMARY KEY (CCCEDIRETAILERROUTING),
    CONSTRAINT UQ_CCCEDIRETAILERROUTING_RETAILER UNIQUE (TRDR_RETAILER)
)
```

## 3. Endpoints S1 AJS și Interogări Principale

### 3.1 Stocare Document XML

```javascript
// Cod specific S1 - AJS
// EDIDocumentService.js

function storeRawXMLDocument(obj) {
    try {
        if (!obj.content || !obj.filename || !obj.provider) {
            return { success: false, error: "Parametri obligatorii lipsă" };
        }
        
        // Detectare document_type din nume fișier
        var docType = detectDocumentType(obj.filename);
        
        // Extragere informații din XML pentru indexare
        var xmlInfo = extractXMLInfo(obj.content, docType);
        
        // Verificare dacă documentul există deja
        var existsDs = X.GETSQLDATASET(`
            SELECT COUNT(*) AS CNT 
            FROM CCCEDIRAWDOCUMENTS 
            WHERE FILENAME = :1 AND PROVIDER = :2
        `, obj.filename, obj.provider);
        
        if (existsDs.CNT > 0) {
            return { success: false, error: "Document deja existent" };
        }
        
        // Inserare în tabelul raw
        X.RUNSQL(`
            INSERT INTO CCCEDIRAWDOCUMENTS 
                (FILENAME, PROVIDER, RETAILER_ID, CLIENT_ID, CONTENT, CONTENT_TYPE, 
                 DOCUMENT_TYPE, DOCUMENT_NUMBER, DOCUMENT_DATE, PROCESS_STATUS, 
                 DOWNLOAD_DATE, APP_OWNER)
            VALUES 
                (:1, :2, :3, :4, :5, :6, :7, :8, :9, :10, GETDATE(), :11)
        `, 
        obj.filename, 
        obj.provider,
        xmlInfo.retailerId || null,
        obj.clientId || X.SYS.COMPANY,
        obj.content,
        'XML',
        docType,
        xmlInfo.documentNumber || null,
        xmlInfo.documentDate || null,
        'NEW',
        obj.appOwner || 'new'
        );
        
        // Obținere ID document
        var newDocDs = X.GETSQLDATASET(`
            SELECT MAX(CCCEDIRAWDOCUMENTS) AS DOCID 
            FROM CCCEDIRAWDOCUMENTS 
            WHERE FILENAME = :1
        `, obj.filename);
        
        // Înregistrare în monitor procesare
        X.RUNSQL(`
            INSERT INTO CCCEDIPROCESSMONITOR
                (DOCUMENT_ID, PROCESS_STEP, STEP_STATUS, MESSAGE, CREATED_BY)
            VALUES
                (:1, 'DOCUMENT_RECEIVED', 'SUCCESS', :2, :X.SYS.USER)
        `, newDocDs.DOCID, 'Document stored successfully');
        
        return {
            success: true,
            docId: newDocDs.DOCID,
            message: "Document stocat cu succes"
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}
```

### 3.2 Procesare Document EDI

```javascript
// Cod specific S1 - AJS
// EDIProcessingService.js

function processDocument(obj) {
    try {
        if (!obj.docId) {
            return { success: false, error: "ID document lipsă" };
        }
        
        // Obținere document
        var docDs = X.GETSQLDATASET(`
            SELECT CCCEDIRAWDOCUMENTS, RETAILER_ID, DOCUMENT_TYPE, 
                   CONTENT, PROCESS_STATUS
            FROM CCCEDIRAWDOCUMENTS 
            WHERE CCCEDIRAWDOCUMENTS = :1
        `, obj.docId);
        
        if (docDs.EOF || docDs.PROCESS_STATUS !== 'NEW') {
            return { 
                success: false, 
                error: "Document inexistent sau deja procesat" 
            };
        }
        
        // Verificare existență mapare
        var mappingDs = X.GETSQLDATASET(`
            SELECT CCCDOCUMENTES1MAPPINGS, S1_SOSOURCE, S1_FPRMS, S1_SERIES
            FROM CCCDOCUMENTES1MAPPINGS
            WHERE RETAILER_ID = :1 
              AND DOCUMENT_TYPE = :2
              AND DIRECTION = 'INBOUND'
              AND ACTIVE = 1
        `, docDs.RETAILER_ID, docDs.DOCUMENT_TYPE);
        
        if (mappingDs.EOF) {
            logProcessStep(obj.docId, 'MAPPING_CHECK', 'ERROR', 'No mapping found');
            return { 
                success: false, 
                error: `Mapare lipsă pentru retailer ${docDs.RETAILER_ID} și document ${docDs.DOCUMENT_TYPE}` 
            };
        }
        
        // Începere procesare - log
        logProcessStep(obj.docId, 'PROCESSING_STARTED', 'SUCCESS', 'Document processing started');
        
        // Obținere configurație câmpuri
        var fieldMappingsDs = X.GETSQLDATASET(`
            SELECT XML_PATH, S1_TABLE, S1_FIELD, DEFAULT_VALUE, TRANSFORMATION
            FROM CCCXMLS1MAPPINGS
            WHERE MAPPING_ID = :1
            ORDER BY POSITION
        `, mappingDs.CCCDOCUMENTES1MAPPINGS);
        
        // Parsare XML și extragere date conform mapare
        var extractedData = parseXMLWithMapping(docDs.CONTENT, fieldMappingsDs);
        
        // Creare document în S1 utilizând metoda business object
        var findocId = createS1Document(
            mappingDs.S1_SOSOURCE,
            mappingDs.S1_FPRMS,
            mappingDs.S1_SERIES,
            extractedData
        );
        
        // Actualizare status document procesat
        X.RUNSQL(`
            UPDATE CCCEDIRAWDOCUMENTS
            SET PROCESS_STATUS = 'PROCESSED',
                RELATED_FINDOC = :1,
                PROCESS_DATE = GETDATE()
            WHERE CCCEDIRAWDOCUMENTS = :2
        `, findocId, obj.docId);
        
        // Log procesare completă
        logProcessStep(obj.docId, 'PROCESSING_COMPLETED', 'SUCCESS', 
                      `Document processed successfully. Created FINDOC ${findocId}`);
        
        return {
            success: true,
            docId: obj.docId,
            findocId: findocId,
            message: "Document procesat cu succes"
        };
        
    } catch (error) {
        // Log eroare
        logProcessStep(obj.docId, 'PROCESSING_ERROR', 'ERROR', error.message);
        
        // Actualizare status eroare
        X.RUNSQL(`
            UPDATE CCCEDIRAWDOCUMENTS
            SET PROCESS_STATUS = 'ERROR',
                PROCESS_MESSAGE = :1,
                PROCESS_DATE = GETDATE()
            WHERE CCCEDIRAWDOCUMENTS = :2
        `, error.message.substr(0, 1000), obj.docId);
        
        return { 
            success: false, 
            docId: obj.docId,
            error: error.message 
        };
    }
}

// Funcție helper pentru logare pași procesare
function logProcessStep(docId, step, status, message, details) {
    try {
        X.RUNSQL(`
            INSERT INTO CCCEDIPROCESSMONITOR
                (DOCUMENT_ID, PROCESS_STEP, STEP_STATUS, MESSAGE, DETAILS, CREATED_BY)
            VALUES
                (:1, :2, :3, :4, :5, :X.SYS.USER)
        `, docId, step, status, message, details || null);
    } catch (e) {
        // Eroare silențioasă la logging
    }
}
```

### 3.3 Creare Document S1

```javascript
// Metoda de creare document S1
function createS1Document(sosource, fprms, series, data) {
    var docObj = X.CREATEOBJ('SALDOC');
    try {
        // Inițiere document nou
        docObj.DBINSERT;
        
        // Obținere tabele
        var tblFINDOC = docObj.FINDTABLE('FINDOC');
        var tblITELINES = docObj.FINDTABLE('ITELINES');
        var tblTRDEXTRA = docObj.FINDTABLE('TRDEXTRA');
        
        // Setare date header
        tblFINDOC.SOSOURCE = sosource;
        tblFINDOC.FPRMS = fprms;
        tblFINDOC.SERIES = series;
        
        // Populare cu datele extrase din XML
        for (var tbl in data.header) {
            var table = docObj.FINDTABLE(tbl);
            for (var field in data.header[tbl]) {
                table[field] = data.header[tbl][field];
            }
        }
        
        // Adăugare linii
        for (var i = 0; i < data.lines.length; i++) {
            tblITELINES.APPEND;
            for (var field in data.lines[i]) {
                tblITELINES[field] = data.lines[i][field];
            }
            tblITELINES.POST;
        }
        
        // Salvare document
        var findocId = docObj.DBPOST;
        
        return findocId;
    } catch (error) {
        // Captare erori specifice S1
        var errorMessage = error.message;
        if (docObj && docObj.GETLASTERROR) {
            errorMessage += " | " + docObj.GETLASTERROR;
        }
        throw new Error(errorMessage);
    }
}
```

## 4. Integrări și Fluxuri Tehnice

### 4.1 Comunicare FeathersJS cu S1
```javascript
// Exemplu serviciu FeathersJS pentru S1
module.exports = class S1Service {
  constructor(options) {
    this.options = options || {};
    this.s1BaseUrl = process.env.S1_BASE_URL;
    this.s1AppId = process.env.S1_APPID;
  }

  async login() {
    const response = await axios.post(`${this.s1BaseUrl}/s1services`, {
      service: 'login',
      username: process.env.S1_USER,
      password: process.env.S1_PASSWORD,
      appId: this.s1AppId
    });
    
    if (response.data.success) {
      this.token = response.data.clientID;
      return this.token;
    } else {
      throw new Error('S1 authentication failed');
    }
  }
  
  async callS1AJS(endpoint, data) {
    if (!this.token) await this.login();
    
    try {
      const response = await axios.post(
        `${this.s1BaseUrl}${endpoint}`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          }
        }
      );
      
      return response.data;
    } catch (error) {
      // Auto-relogin on session expired
      if (error.response && error.response.status === 401) {
        await this.login();
        return this.callS1AJS(endpoint, data);
      }
      throw error;
    }
  }
  
  async find(params) {
    // Implementare pentru interogări
    return this.callS1AJS('/s1services/JS/AJS/EDIDocumentService/getDocumentList', params.query);
  }
  
  async create(data) {
    // Implementare pentru inserări/procesări
    const endpoint = `/s1services/JS/AJS/${data.service}/${data.method}`;
    return this.callS1AJS(endpoint, data.params);
  }
}
```

### 4.2 Flux Descărcare și Procesare Automată

```javascript
// FeathersJS Job Scheduler pentru procesare periodică
class EDIProcessingJob {
  constructor(app) {
    this.app = app;
    this.interval = 5 * 60 * 1000; // 5 minute
    this.maxConcurrent = 5;
    this.processing = false;
  }
  
  async start() {
    setInterval(() => this.run(), this.interval);
    // Rulare imediată la pornire
    setTimeout(() => this.run(), 5000);
  }
  
  async run() {
    if (this.processing) return;
    
    this.processing = true;
    try {
      // 1. Descărcare documente noi de la toți furnizorii
      await this.downloadFromAllProviders();
      
      // 2. Procesare documente în așteptare
      await this.processNewDocuments();
    } catch (error) {
      this.app.logger.error('EDI processing job error', error);
    } finally {
      this.processing = false;
    }
  }
  
  async downloadFromAllProviders() {
    const providers = [
      { name: 'DOCPROCESS', service: 'edi-docprocess' },
      { name: 'INFINITE', service: 'edi-infinite' }
    ];
    
    for (const provider of providers) {
      try {
        const result = await this.app.service(provider.service).download();
        this.app.logger.info(`Downloaded from ${provider.name}:`, result);
      } catch (error) {
        this.app.logger.error(`Error downloading from ${provider.name}:`, error);
      }
    }
  }
  
  async processNewDocuments() {
    // Obținere documente noi cu auto-procesare activată
    const docs = await this.app.service('s1-service').find({
      query: {
        service: 'EDIDocumentService',
        method: 'getDocumentsToProcess',
        params: {
          status: 'NEW',
          autoProcess: true,
          limit: this.maxConcurrent
        }
      }
    });
    
    if (docs.success && docs.documents && docs.documents.length > 0) {
      const processes = docs.documents.map(doc => 
        this.app.service('s1-service').create({
          service: 'EDIProcessingService',
          method: 'processDocument',
          params: {
            docId: doc.CCCEDIRAWDOCUMENTS
          }
        })
      );
      
      // Procesare paralelă
      const results = await Promise.allSettled(processes);
      
      // Logging rezultate
      const summary = {
        processed: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
        errors: results.filter(r => r.status === 'rejected' || !r.value.success).length
      };
      
      this.app.logger.info('Batch processing complete', summary);
    }
  }
}
```

### 4.3 Migrare și Control Retaileri

```javascript
// Cod specific S1 - AJS
// EDIMigrationControl.js

// Rutare documente bazată pe configurația retailer
function routeDocumentToSystem(obj) {
    try {
        const retailerId = obj.retailerId;
        
        // Verificare retailer în tabela de rutare
        var routingDs = X.GETSQLDATASET(`
            SELECT PROCESS_IN_LEGACY, ACTIVE
            FROM CCCEDIRETAILERROUTING 
            WHERE TRDR_RETAILER = :1
        `, retailerId);
        
        var processInLegacy = false;
        
        // Dacă există în tabela de rutare
        if (!routingDs.EOF && routingDs.ACTIVE == 1) {
            processInLegacy = (routingDs.PROCESS_IN_LEGACY == 1);
        }
        
        // Documentele pentru retailerii marcați în legacy sunt procesate de ambele sisteme
        // Documentele pentru retailerii migrați sunt procesate doar de sistemul nou
        return {
            success: true,
            retailerId: retailerId,
            processInLegacy: processInLegacy,
            processInNew: true
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}
```

## 5. Optimizări și Considerații de Securitate

### 5.1 Performanță
- **Indecși cheie**:
  ```sql
  CREATE INDEX IDX_CCCEDIRAWDOC_STATUS ON CCCEDIRAWDOCUMENTS (PROCESS_STATUS, RETAILER_ID);
  CREATE INDEX IDX_CCCEDIRAWDOC_FINDOC ON CCCEDIRAWDOCUMENTS (RELATED_FINDOC);
  CREATE INDEX IDX_CCCEDIPROCESSMON_DOC ON CCCEDIPROCESSMONITOR (DOCUMENT_ID, PROCESS_STEP);
  ```

- **Backup procesare erori**:
  ```javascript
  // Retry pentru documente eșuate
  function retryFailedDocuments() {
      var failedDs = X.GETSQLDATASET(`
          SELECT CCCEDIRAWDOCUMENTS
          FROM CCCEDIRAWDOCUMENTS
          WHERE PROCESS_STATUS = 'ERROR'
          AND DATEDIFF(HOUR, PROCESS_DATE, GETDATE()) <= 24
          AND (
              SELECT COUNT(*) FROM CCCEDIPROCESSMONITOR
              WHERE DOCUMENT_ID = CCCEDIRAWDOCUMENTS.CCCEDIRAWDOCUMENTS
              AND STEP_STATUS = 'ERROR'
              AND PROCESS_STEP = 'PROCESSING_ERROR'
          ) <= 3  -- Max 3 încercări
      `);
      
      // Procesare în serie pentru documente eșuate
      failedDs.FIRST;
      while (!failedDs.EOF) {
          processDocument({docId: failedDs.CCCEDIRAWDOCUMENTS});
          failedDs.NEXT;
      }
  }
  ```

### 5.2 Securitate
- **Verificare acces**: Implementare verificări explicite de permisiuni pentru fiecare endpoint
- **Criptare credențiale**: Stocare securizată a credențialelor de API și FTP
- **Auditare**: Logare completă a tuturor acțiunilor utilizatorilor în tabela de monitorizare

Această detaliere tehnică prezintă structura concretă a arhitecturii software și implementarea fluxurilor de lucru ale platformei EDI, cu exemple concrete de cod și SQL pentru a satisface cerințele definite.

Similar code found with 2 license types