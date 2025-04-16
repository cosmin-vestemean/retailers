# Arhitectură Tehnică pentru Platforma EDI - Sinteză

## 1. Arhitectură de Sistem

### 1.1 Structura pe Trei Niveluri

1. **Nivelul Backend S1**
   - Endpoints custom în JavaScript ES5 expuse prin Web Services
   - Accesul la tabele CCC* exclusiv prin API-uri dedicare
   - Utilizare X.GETSQLDATASET și X.RUNSQL în loc de conexiuni directe
   - Centralizarea logicii de business în S1

2. **Nivelul Middleware**
   - Microservicii FeathersJS specializate
   - Procesare în memorie a documentelor XML
   - Fără dependențe de filesystem (compatibilitate Heroku)
   - Orchestrare procese prin evenimente

3. **Nivelul Frontend**
   - Interfață Vue.js 3 cu componente Single-File
   - Organizare dinamică a interfețelor pe tipuri de documente
   - Tab-uri generate automat în funcție de configurație

## 2. Microservicii Principale

### 2.1 EDI Connector Service
- Gestionează conexiunile la providerii EDI (DocProcess, Infinite)
- Descărcarea documentelor direct în memorie
- Stocarea imediată în CCCEDIRAWDOCUMENTS (tabel nou)
- Identificare retailer și direcționare spre aplicația corespunzătoare
- Componenta de tranziție între sistemul vechi și cel nou

### 2.2 Processing Service
- Procesarea documentelor conform configurațiilor
- Aplicarea mapărilor de câmpuri pentru transformarea datelor
- Gestionarea salvării în S1 sau trimiterii către EDI
- Log centralizat al procesării în CCCEDIPROCESSMONITOR (tabel nou)

### 2.3 Monitoring Service
- Dashboard centralizat cu stare documente
- Statistici de procesare și erori
- Filtrare avansată pe retailer, tip document, status

## 3. Schema de Date Extinsă

### 3.1 Tabele Existente (modificate)
```sql
-- Modificări CCCSFTP - Adăugare tip EDI provider
ALTER TABLE CCCSFTP ADD PROVIDER_TYPE VARCHAR(20); -- DocProcess, Infinite, etc.

-- Modificări CCCDOCUMENTES1MAPPINGS - Adăugare direcție flux
ALTER TABLE CCCDOCUMENTES1MAPPINGS ADD DIRECTION VARCHAR(10); -- INBOUND, OUTBOUND
ALTER TABLE CCCDOCUMENTES1MAPPINGS ADD DOCUMENT_TYPE VARCHAR(20); -- ORDERS, INVOIC, DESADV, etc.

-- Modificări CCCXMLS1MAPPINGS - Extindere pentru validări
ALTER TABLE CCCXMLS1MAPPINGS ADD VALIDATION_RULE VARCHAR(500);
ALTER TABLE CCCXMLS1MAPPINGS ADD ERROR_MESSAGE VARCHAR(200);
```

### 3.2 Tabele Noi
```sql
-- Tabel pentru documente XML raw (înlocuiește stocarea în filesystem)
CREATE TABLE CCCEDIRAWDOCUMENTS (
  CCCEDIRAWDOCUMENTS INT NOT NULL IDENTITY(1, 1),
  FILENAME VARCHAR(255) NOT NULL,
  PROVIDER VARCHAR(50) NOT NULL,
  RETAILER_ID INT NULL,
  CONTENT NVARCHAR(MAX) NOT NULL,
  PROCESS_STATUS VARCHAR(20) NOT NULL,
  DOWNLOAD_DATE DATETIME NOT NULL,
  PROCESS_DATE DATETIME NULL,
  PROCESS_MESSAGE VARCHAR(1000) NULL,
  APP_OWNER VARCHAR(20) NULL, -- 'legacy' sau 'new' pentru perioada de tranziție
  CONSTRAINT PK_CCCEDIRAWDOCUMENTS PRIMARY KEY (CCCEDIRAWDOCUMENTS)
);

-- Tabel pentru monitorizare centralizată
CREATE TABLE CCCEDIPROCESSMONITOR (
  CCCEDIPROCESSMONITOR INT NOT NULL IDENTITY(1, 1),
  PROCESS_TYPE VARCHAR(50) NOT NULL,  -- 'INBOUND', 'OUTBOUND', 'APERAK'
  DOCUMENT_TYPE VARCHAR(50) NOT NULL, -- 'ORDER', 'INVOICE', 'DESADV', etc.
  TRDR_RETAILER INT NOT NULL,
  TRDR_CLIENT INT NOT NULL,
  FILENAME VARCHAR(250),
  FINDOC INT,
  PROCESS_DATE DATETIME NOT NULL DEFAULT GETDATE(),
  STATUS VARCHAR(50) NOT NULL, -- 'SUCCESS', 'ERROR', 'WARNING', 'PENDING'
  ERROR_MESSAGE NVARCHAR(MAX),
  PROCESS_DURATION INT, -- Durata în ms
  RETRY_COUNT INT DEFAULT 0,
  NEXT_RETRY_DATE DATETIME,
  CONSTRAINT PK_CCCEDIPROCESSMONITOR PRIMARY KEY (CCCEDIPROCESSMONITOR)
);
```

## 4. Endpoints S1 Web Services

```javascript
// === CONECTORI EDI ===
function getEDIConnectors(obj) { /* Returnează configurațiile EDI */ }
function saveEDIConnector(obj) { /* Salvează configurațiile EDI */ }

// === MAPARE DOCUMENTE ===
function getDocumentMappings(obj) { /* Returnează mapările la nivel de document */ }
function saveDocumentMapping(obj) { /* Salvează mapările la nivel de document */ }

// === MAPARE CÂMPURI ===
function getFieldMappings(obj) { /* Returnează mapările de câmpuri */ }
function saveFieldMapping(obj) { /* Salvează mapările de câmpuri */ }

// === PROCESARE XML ===
function storeRawXMLDocument(obj) { /* Stochează XML brut în ERP */ }
function processNewDocuments() { /* Procesează documentele noi */ }

// === MONITORIZARE ===
function getProcessingLog(obj) { /* Returnează istoricul procesării */ }
function getProcessingStatistics(obj) { /* Returnează statistici de procesare */ }
function logProcessActivity(obj) { /* Înregistrează activitate de procesare */ }
```

## 5. Fluxuri de Procesare

### 5.1 Flux Inbound (EDI → S1)
```
EDI Provider → EDI Connector → CCCEDIRAWDOCUMENTS → Identificare Retailer →
Verificare Mapare → Transformare Date → Creare Document S1 → Log Rezultat
```

### 5.2 Flux Outbound (S1 → EDI)
```
Document S1 → Verificare Eligibilitate → Identificare Mapare →
Transformare în XML → Upload la EDI Provider → Așteptare APERAK → Log Rezultat
```

### 5.3 Procesare APERAK
```
EDI Provider → EDI Connector → CCCEDIRAWDOCUMENTS → Parsare APERAK →
Identificare Document Original → Marcare Status → Log Rezultat
```

## 6. Arhitectură Frontend

### 6.1 Componente Vue.js
```
App
├── Configuration
│   ├── EDIConnectors
│   ├── RetailerSettings
│   ├── DocumentTypeMappings
│   └── FieldMappings
└── Processing
    ├── InboundDocuments
    │   ├── OrdersQueue
    │   ├── RecadvsQueue
    │   └── RetannsQueue
    ├── OutboundDocuments
    │   ├── InvoicesQueue
    │   └── DesadvsQueue
    └── Monitoring
        ├── ProcessingStatistics
        ├── ErrorSummary
        └── AudirLog
```

### 6.2 Caractestici Cheie Frontend
- Tab-uri dinamice generate pe baza configurației retailer-document
- Interfețe specifice pentru configurare vs. monitorizare procesare
- Vizualizare ierarhică a documentelor după flow (inbound/outbound)
- Indicatori de status vizibili pentru fiecare tip de document
- Funcții de clonare pentru configurații între retaileri similari

## 7. Strategie de Migrare

1. **Serviciul Partajat de Download**
   - Primul component dezvoltat pentru noua arhitectură
   - Integrare cu aplicația existentă prin CCCEDIRAWDOCUMENTS
   - Rezolvă problema auto-ștergerii fișierelor DocProcess

2. **Dezvoltare Paralelă**
   - Noua aplicație dezvoltată pentru retailerii noi
   - Aplicația existentă modificată pentru a citi din CCCEDIRAWDOCUMENTS
   - Coexistență controlată prin proprietatea APP_OWNER

3. **Migrare Graduală**
   - Migrarea treptată a retailerilor existenți
   - Verificări paralele pentru validarea rezultatelor
   - Dezactivarea componentelor vechi după validare

Această arhitectură oferă un sistem modular, scalabil și compatibil cu restricțiile de infrastructură Heroku, păstrând în același timp integrarea strânsă cu ERP-ul S1 conform cerințelor GDPR.