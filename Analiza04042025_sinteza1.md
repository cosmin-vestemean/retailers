# Product Requirements Document: EDI Integration Platform

## 1. System Overview

We have agreed on developing a new EDI integration platform to replace the existing solution while improving architecture, maintainability, and feature set. The platform will facilitate bidirectional document exchange between EDI providers (DocProcess, Infinite) and the Soft1 ERP system.

## 2. Core Architecture

### 2.1 Three-Tier Architecture

1. **S1 Backend Layer**
   - Custom Web Service endpoints written in ES5 JavaScript
   - Direct access to ERP business logic and database
   - Custom CCC-prefixed tables for configuration and operational data
   - GDPR-compliant data storage

2. **Middleware Layer**
   - FeathersJS-based backend services
   - EDI connector microservice for document acquisition
   - Orchestration of document processing flows

3. **Frontend Layer**
   - Vue.js 3 component-based UI
   - Single-file components for maintainability
   - Dedicated interfaces for configuration and monitoring

### 2.2 Key Microservices

1. **EDI Connector Service**
   - Handles all provider connections (DocProcess, Infinite)
   - Downloads XML files directly to memory
   - Immediately stores content in ERP database
   - Manages retailer identification
   - Operates safely with auto-delete providers like DocProcess

2. **Processing Service**
   - Processes documents according to configured mappings
   - Routes documents to appropriate retailers
   - Handles document transformations in both directions

3. **Status & Monitoring Service**
   - Centralized logging and error tracking
   - Dashboard for monitoring document processing

## 3. Data Management

### 3.1 ERP Database Storage

All persistent data will be stored in S1 database using custom tables:

1. **CCCSFTP**: EDI provider connection details
2. **CCCDOCUMENTES1MAPPINGS**: Document type mapping configurations
3. **CCCXMLS1MAPPINGS**: Field-level XML-to-S1 mappings
4. **CCCEDIRAWDOCUMENTS**: Raw XML document storage
5. **CCCEDIPROCESSMONITOR**: Processing tracking and statistics

### 3.2 S1 Web Services Endpoints

Custom endpoints will abstract database operations:

```javascript
function getCCCData(obj) { /* retrieves data using X.GETSQLDATASET */ }
function setCCCData(obj) { /* inserts/updates using X.RUNSQL */ }
function getEDIProviders(obj) { /* specialized endpoint */ }
// ... other specific endpoints for providers, mappings, etc.
```

## 4. Document Processing Flows

### 4.1 Inbound Documents (EDI → S1)

1. **Download**: EDI Connector retrieves documents from provider
2. **Store Raw**: XML content stored immediately in database
3. **Identify**: Document type and retailer identification
4. **Map**: Apply appropriate field mappings
5. **Create**: Generate corresponding S1 document

### 4.2 Outbound Documents (S1 → EDI)

1. **Identify**: Find eligible S1 documents for transmission
2. **Map**: Transform S1 data to appropriate XML format
3. **Generate**: Create XML file according to retailer specifications
4. **Send**: Transmit to EDI provider
5. **Track**: Process APERAK acknowledgments

### 4.3 APERAK Processing

Dedicated processing flow for APERAK messages:
1. Download from EDI provider
2. Identify corresponding original document
3. Update document status based on response
4. Store acknowledgment details for audit

## 5. Configuration Interface

### 5.1 Document Type Mapping

Each document type will have its own dedicated configuration zone that associates:
- EDI document type (ORDERS, INVOICES, etc.)
- S1 document triplet (sosource, fprms, series)
- Direction (inbound/outbound)

### 5.2 Field Mapping Configuration

XML field paths will be mapped to S1 fields through:
- Direct table-field mappings (e.g., FINDOC.SERIES)
- SQL queries for complex transformations
- Mandatory/optional field designation
- Format specifications and validation rules

### 5.3 Advanced Configuration Features

- **Cloning functionality**: Copy configurations between similar retailers
- **Templates**: Standardized starting points for new mappings
- **Validation**: Automatic checking of mandatory field coverage
- **Testing**: Validate mappings against sample documents

## 6. Document Processing Interface

### 6.1 Dynamic Document Queue Organization

- Hierarchical tab structure separating inbound/outbound flows
- Document-type specific sub-tabs generated dynamically
- Clear indicators of document counts and status

### 6.2 Document Management Features

- Individual and batch processing actions
- Error visualization and reprocessing capabilities
- XML content viewing and validation
- Detailed history and audit trail

## 7. Monitoring and Error Handling

### 7.1 Centralized Error Management

- Dedicated monitoring dashboard with status overview
- Document processing statistics and trends
- Error classification and severity indicators
- Comprehensive filtering and search capabilities

### 7.2 Error Handling Strategy

- Specific error handling for common scenarios (product not found, etc.)
- Automatic retry strategies for transient errors
- Clear error messages with actionable information
- Alerts for critical issues

## 8. Migration Strategy

### 8.1 Parallel Operation Approach

1. Build the new application with support for new retailers
2. Deploy the EDI Connector Service as a shared component
3. Create a database-based coordination mechanism
4. Gradually migrate existing retailers to the new platform
5. Decommission the legacy system after complete migration

### 8.2 Shared Download Service

A critical component for transition that will:
- Download files from all EDI providers
- Store raw XML data in the database
- Identify which system (legacy or new) should process each document
- Flag documents for appropriate processing

## 9. Technology Stack & Infrastructure

### 9.1 Core Technologies

- **Backend**: FeathersJS, Node.js
- **Frontend**: Vue.js 3, Pinia for state management
- **API Integration**: S1 Web Services (vanilla JavaScript)
- **Infrastructure**: Heroku with ephemeral filesystem considerations

### 9.2 Development Approach

- Service-oriented architecture
- Clean separation between UI and business logic
- Component-based frontend development
- Test-driven development for critical components
- GDPR-compliant data handling

This comprehensive architecture addresses the current limitations, provides a clean migration path, and establishes a foundation for future enhancements and multi-client capabilities.