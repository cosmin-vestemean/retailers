# Sinteza Platformei EDI - Agrementul Final

În urma discuțiilor avute, am ajuns la următorul consens privind noua platformă EDI care va înlocui aplicația existentă:

## 1. Arhitectură Generală

### 1.1 Structura pe Trei Niveluri
- **Backend S1** - Acces la ERP prin Web Services cu endpoints custom în JavaScript ES5
- **Middleware FeathersJS** - Gestionează comunicarea între frontend și S1
- **Frontend Vue.js 3** - Interfață modernă bazată pe componente

### 1.2 Stocare Date
- **Zero Filesystem** - Arhitectură compatibilă cu Heroku (stocare exclusiv în bază de date)
- **GDPR-compliant** - Toate datele persistate în baza de date S1 prin tabele CCC*
- **Abstractizare** - Acces la date exclusiv prin API-uri dedicate

## 2. Componente Cheie

### 2.1 EDI Connector Service
- Microserviciu specializat pentru descărcarea documentelor de la provideri (DocProcess, Infinite)
- Download în memorie și stocare imediată în baza de date
- Soluționează problema auto-ștergerii fișierelor DocProcess

### 2.2 Document Processing Service
- Procesează documentele conform mapărilor configurate
- Suport pentru flux bidirecțional (EDI → S1 și S1 → EDI)
- Rutare documente între sistemul vechi și nou în perioada de tranziție

### 2.3 Monitoring & Error Handling
- Sistem centralizat pentru urmărirea procesării
- Dashboard cu statistici și indicatori de performanță
- Clasificare avansată a erorilor pentru troubleshooting rapid

## 3. Schema de Date

### 3.1 Tabele Fundamentale
- **CCCEDIRAWDOCUMENTS** - Stocare XML-uri brute (înlocuiește filesystem)
- **CCCEDIPROCESSMONITOR** - Urmărire centralizată procesare documente
- **CCCDOCUMENTES1MAPPINGS** - Asociere între documente EDI și documente S1
- **CCCXMLS1MAPPINGS** - Mapare câmpuri XML la câmpuri S1

### 3.2 Acces Prin Endpoints
- Endpoints S1 dedicate pentru fiecare operațiune CRUD
- Servicii FeathersJS corespunzătoare pentru comunicare frontend-backend

## 4. Interfață Utilizator

### 4.1 Configurare
- **Editor Document Mapping** - Asociere documente EDI la triplet S1 {sosource, fprms, series}
- **Editor Field Mapping** - Configurare mapare câmpuri XML la câmpuri S1
- **Funcții avansate** - Clonare configurații, validare, modele predefinite

### 4.2 Procesare Documente
- **Tab-uri dinamice** organizate pe tipuri de documente și direcție
- **Vizualizări separate** pentru documente în așteptare și istoricul procesării
- **Acțiuni contextuale** - procesare individuală sau în batch

### 4.3 Monitoring
- **Dashboard analitic** cu vizualizări agregate
- **Filtre avansate** pentru identificare rapidă a problemelor
- **Logging detaliat** al fiecărui pas din procesare

## 5. Fluxuri de Procesare

### 5.1 Inbound (EDI → S1)
- Descărcare automată XML → Identificare retailer → Aplicare mapare → Creare document S1

### 5.2 Outbound (S1 → EDI)
- Identificare documente de trimis → Transformare conform mapare → Generare XML → Upload la EDI

### 5.3 APERAK
- Procesare specială a confirmărilor → Asociere cu documentul original → Actualizare status

## 6. Strategie de Migrare

### 6.1 Perioada de Tranziție
- Aplicația nouă procesează inițial doar retailerii noi (Sezamo, Auchan, Dedeman)
- EDI Connector Service deservește ambele aplicații (veche și nouă)
- Coordonare prin tabela CCCEDIRAWDOCUMENTS (câmp APP_OWNER)

### 6.2 Migrare Graduală
- Transfer retailer cu retailer din sistemul vechi în cel nou
- Validare paralelă a rezultatelor procesării
- Dezactivare progresivă a componentelor vechi

Această arhitectură abordează punctele slabe ale sistemului actual, oferind o platformă modernă, scalabilă și ușor de menținut, cu posibilități de extindere pentru funcționalități avansate de reporting și analiză în viitor.