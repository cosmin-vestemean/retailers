# EDInet Connector – manual

## Table of contents

EDInet Connector – manual....1

Installation....1

Orders relation ....3

Retanns relation ......5

Invoices relations ....5

## Installation

1. Please download EC from here: http://www.infinite.pl/pub/soft/edinetconnector/  
File: EdinetConnector-1.6.exe  
You need the latest java library.  
2. Start installation process with EdinetConnector-1.6.exe  
3. Chose language and click Next

![](images/3044fd731eaa5f49d3ab54e528b4f993a988a6beb611aa143c621a2de14b22ed.jpg)

<details>
<summary>text_image</summary>

EdinetConnector 1.6
Edinet
pki adapter
Select language:
Wybierz język:
Nyelv:
English
Cancel	Next
</details>

4. Accept the agreement  
5. Please implement License key.
You got the License from Edinet helpdesk

![](images/4a77b18e5c4a1fbe433d4b6fed0c1024dc4a7a41499929b1fab926a802f546ea.jpg)

<details>
<summary>text_image</summary>

EdinetConnector 1.6
Licence key
Cancel	Back	Next
</details>

6. Click install  
![](images/77d274439d9474ff5b75be111d3ed92278655e7ad3ccddb5e057e64f2fe9c55c.jpg)

<details>
<summary>text_image</summary>

EdinetConnector 1.6
Install
Autostart
Back	Finish
</details>

7. Start and open EDInet Connector from tray

![](images/19831b5a14d1f46d03d0fa8c3885b5dd3735c15bf3e11717ae899ee0c8eee872.jpg)

<details>
<summary>text_image</summary>

Start
Stop
Open
Update
Close
13:53
2012-11-28
Start
Stop
Open
Update
Close
13:56
2012-11-28
</details>

8. Type login and password (admin/admin).

![](images/53f2bd0f9f8b3e262bf2b05d12b6034a7d77d524cce9fd4f123c934aa11cd50b.jpg)

<details>
<summary>text_image</summary>

Podaj nazwę użytkownika i hasło
Witryna http://localhost:29292 prosi o podanie nazwy użytkownika i hasła. Komunikat witryny:
„EdinetConnector"
Użytkownik: admin
Hasło: •••••
OK	Anuluj
</details>

### Orders relation

1. Proceed to RELATIONS bookmark and Add new relation.

![](images/f15b2af9a7e8d7cd9081f75b34cfda3f4b4eba0367bd451ab242e883e3e4cfda.jpg)

<details>
<summary>flowchart</summary>

```mermaid
graph LR
  A["TRANSACTION NODE"] --> B["MESSAGE TRACKER"]
  B --> C["RELATIONS"]
  C --> D["ADMINISTRATION"]
  E["Save\nAdd\nRemove"] -.-> F["Add"]
  F -.-> G["Remove"]
  H["Id"] --> I["ON"]
  I --> J["Relation description"]
  J --> K["Source type"]
  K --> L["Connection type"]
```
</details>

2. You can create few types of relations: DIRECTORY to DIRECTORY, FTP to FTP, DIRECTORY to FTP or FTP to DIRECTORY.

Please select: FTP -> Directory

Also type name of relation.

![](images/6a849534b1e3153cf008fb5f27ca1a06aac103d0ff6c8da0e863f4557529e4a4.jpg)

<details>
<summary>flowchart</summary>

```mermaid
graph LR
  A["TRANSACTION NODE"] --> B["MESSAGE TRACKER"]
  B --> C["RELATIONS"]
  C --> D["ADMINISTRATION"]
  E["Save"] --> F["Add"]
  G["Remove"] --> H["Remove"]
  I["ID"] --> J["ON"]
  K["Relation description"] --> L["Source type"]
  M["Connection type"] --> N["Relation description orders"]
  O["Relation with FTP"] --> P["to DIRECTORY"]
  Q["Add"] --> R["Add"]
```
</details>

3. Enter the source settings:

You got those data from Edinet helpdesk.

Host name: ftp.infinite.pl

Remote directory: /orders/

### Port: 21

User name and password are different for every client.

![](images/a1369243d54eefdadcb1d0be3d8a76c9d489e3a862931dd1ebdc054618800506.jpg)

<details>
<summary>text_image</summary>

Source settings
? Host name ftp.infinite.pl
? Port 21
? Remote directory /orders/
? User name test
? Password
? Pattern filename
? FTP type FTP
? Type of connection passive
? Proxy method
? Proxy host name
? Proxy port
? Proxy user name
? Proxy password
? Validate? true
</details>

#### 4. Check the connection:

![](images/7523841e323df408fd14bd3be34b82bd127ffd2f1278b25a32c960a849400f6e.jpg)

<details>
<summary>text_image</summary>

Check connection
Success
</details>

5. Enter the destination settings. Where orders will be downloading to your system.

![](images/2f7785c2e907a282396fc88511b326a052159cb4b8091e4f394ed96952dce235.jpg)

<details>
<summary>text_image</summary>

Destination settings
? Path for destination directory d:\orders
Check connection Success
</details>

#### 6. Save the relation

![](images/1519b70127e4ea788beec63f0b312cb0f3bbb7229dc602d528fd95f48ae10efa.jpg)

<details>
<summary>flowchart</summary>

```mermaid
graph LR
  A["TRANSACTION NODE"] --> B["MESSAGE TRACKER"]
  B --> C["RELATIONS"]
  C --> D["ADMINISTRATION"]
  E["Save\nAdd\nRemove"] -.-> E
  F["Id"] --> G["ON"]
  G --> H["Relation description"]
  H --> I["Source type"]
  I --> J["Connection type"]
  K["1"] --> L["No"]
  L --> M["orders"]
  M --> N["FTP"]
  N --> O["DIRECTORY"]
```
</details>

7. To launch the EDInet Connector go to TRANSACTION MODE and press start or start all button. Order will be downloading from Edinet system to your server

![](images/acc6bcc5094b685c2bc6877131a2431c6b8cbc3306b6bc8c1bb05c296281828d.jpg)

<details>
<summary>flowchart</summary>

```mermaid
graph LR
  A["TRANSACTION NODE"] --> B["MESSAGE TRACKER"]
  B --> C["RELATIONS"]
  C --> D["ADMINISTRATION"]
  E["Start all"] --> F["Stop all"]
  F --> G["Cancel Alerts"]
  H["Rel. Id"] --> I["Status"]
  I --> J["Relation description"]
  J --> K["Last monitoring date"]
  K --> L["Last hour statistics"]
  M["1"] --> N["STOPPED"]
  N --> O["orders"]
  O --> P["ok: 0 errors: 0"]
  Q["Start"] -.-> R["Start"]
```
</details>

8. To check the document status, please go to MESSAGE TRACKER bookmark.

![](images/e157ea61239027286a79880a84e14a37e512a5ccc7f3f12a2a961c5828721c33.jpg)

TRANSACTION NODE

MESSAGE TRACKER

RELATIONS

ADMINISTRATION

<table><tr><td>Status:</td><td>Relations:</td><td>Date:</td></tr><tr><td>processing</td><td>All</td><td></td></tr><tr><td>sent</td><td></td><td>search by date</td></tr><tr><td>confirmed</td><td>File name:</td><td>date range</td></tr><tr><td>error</td><td></td><td>1 day</td></tr></table>

<table><tr><td>Rel. Id</td><td>Status</td><td>File name</td><td>Last operation date</td><td>Date of retry message sending</td><td></td></tr><tr><td>2</td><td>SENT</td><td>PKI12188209.xml</td><td>2012-11-28 14:26:52</td><td></td><td></td></tr><tr><td>2</td><td>SENT</td><td>PKI12188210.xml</td><td>2012-11-28 14:26:52</td><td></td><td></td></tr><tr><td>2</td><td>SENT</td><td>PKI12188211.xml</td><td>2012-11-28 14:26:52</td><td></td><td></td></tr><tr><td>2</td><td>SENT</td><td>PKI12188212.xml</td><td>2012-11-28 14:26:52</td><td></td><td></td></tr><tr><td>2</td><td>SENT</td><td>PKI12188208.xml</td><td>2012-11-28 14:26:52</td><td></td><td></td></tr></table>

<table><tr><td>Date</td><td>Type</td><td>Content</td></tr><tr><td>2012-11-28 14:26:52</td><td>INFO</td><td>Upload success. File PKI12188209.xml</td></tr><tr><td>2012-11-28 14:26:52</td><td>INFO</td><td>Upload start. File PKI12188209.xml</td></tr><tr><td>2012-11-28 14:26:52</td><td>INFO</td><td>Download success. File PKI12188209.xml</td></tr><tr><td>2012-11-28 14:26:52</td><td>INFO</td><td>Download start. File PKI12188209.xml</td></tr></table>

### Retanns relation

Configuration is the same like for orders.

Only remote directory is different.

The source settings:

You got those data from Edinet helpdesk.

Host name: ftp.infinite.pl

Remote directory: /retanns/

Port: 21

User name and password are different for every client.

### Invoices relations

1. Proceed to RELATIONS bookmark and Add new relation.

![](images/f57e1f934dc4c74597078f95f441685e20aad80cb1819af5f450505283eaa3b4.jpg)

<details>
<summary>flowchart</summary>

```mermaid
graph LR
  A["TRANSACTION NODE"] --> B["MESSAGE TRACKER"]
  B --> C["RELATIONS"]
  C --> D["ADMINISTRATION"]
  E["Save"] --> F["Add"]
  F --> G["Remove"]
  H["Id"] --> I["ON"]
  I --> J["Relation description"]
  J --> K["Source type"]
  K --> L["Connection type"]
```
</details>

2. You can create few types of relations: DIRECTORY to DIRECTORY, FTP to FTP, DIRECTORY to FTP or FTP to DIRECTORY.

#### Please select: Directory -> FTP

Also type name of relation.

![](images/8b4ddd76f5cb1eafabe423c5063d5c980edbf7afa3318f77888e6d86f1c6e15d.jpg)

<details>
<summary>text_image</summary>

Relation description invoices
Relation with DIRECTORY to FTP
Add
</details>

### 3. Main setting:

3.1 Signature type: please select Key storage  
3.2 Path to key store: type the path where you put Edinet key (you got from Edinet helpdesk, file edinet.p12)  
3.3 Enter the password  
3.4 Click on Certificate list, select certificate and click OK.  
3.5 The rest stays in default.

![](images/def3f78ae0adcb33f75f09e43e4aa7322de593e66f4e0875d71792dca625d64c.jpg)

<details>
<summary>text_image</summary>

Main settings
? Relation description invoices
? Retry interval for directory monitoring (seconds) 30
? Frequency of sending attempts 5
? Maximum retry attempts of message sending 5
? Maximum retry interval of message sending (seconds) 300
? Transformations Do not transform Transform to PDF Transform specially
? Signature type Not sign Key storage Card Signature
? Path to key store C:\Users\Konrad Majewski\Desktop\pick\phd\edinet.p12
? Password to key store Check key store
? Signature certificate Certificate list
? Signature algorithm SHA128withRSA
? Signature file format S/MIME
</details>

#### 4. Enter the source settings:

The place where invoices are imported from your ERP system.

![](images/2cc0918b80d1567ead79e3b4ece5e341d4be78202aec6de90687e35720cd9260.jpg)

<details>
<summary>text_image</summary>

Source settings
? Path for source directory D:\invoices\
? Pattern filename
? Validate? true
? Min. file size
? File contents
</details>

#### 5. Enter the destination settings.

#### You got those data from Edinet helpdesk.

Host name: ftp.infinite.pl

Remote directory: /invoice/

Port: 21

User name and password are different for every client.

![](images/41641f8930edf53c07d528fae9c2a9d6a8124fc981af5b277f9f7af36b460a27.jpg)

<details>
<summary>text_image</summary>

Destination settings
? Host name ftp.infinite.pl
? Port 21
? Remote directory /invoice/
? User name test
? Password ••••••••
? FTP type FTP
? Type of connection passive
? Proxy method
? Proxy host name
? Proxy port
? Proxy user name
? Proxy password
Check connection Success
</details>

#### 6. Check the connection:

![](images/7de8f433167942f27a57f99ba217d54ef2750995c964b5de5c13d3f40d25dea6.jpg)

<details>
<summary>text_image</summary>

Check connection
Success
</details>

#### 7. Save the relation

![](images/8500d3a87067b3491777d1d78d2ff493188b62236ae76351fa2942fd44b56c48.jpg)

<details>
<summary>flowchart</summary>

```mermaid
graph LR
  A["TRANSACTION NODE"] --> B["MESSAGE TRACKER"]
  B --> C["RELATIONS"]
  C --> D["ADMINISTRATION"]
  E["Save"] --> F["Add"]
  F --> G["Remove"]
  H["Id"] --> I["ON"]
  I --> J["Relation description"]
  J --> K["Source type"]
  K --> L["Connection type"]
  M["1"] --> N["No"]
  N --> O["orders"]
  O --> P["FTP"]
  P --> Q["DIRECTORY"]
```
</details>

8. To launch the EDInet Connector go to TRANSACTION MODE and press start or start all button. Invoices will be sending to Edinet system.

![](images/1614b6f49ff36289c9f7cdb0912dfe179b781119ffda3a89c99c2878648fecb5.jpg)

<details>
<summary>flowchart</summary>

```mermaid
graph LR
  A["TRANSACTION NODE"] --> B["MESSAGE TRACKER"]
  B --> C["RELATIONS"]
  C --> D["ADMINISTRATION"]
  E["Start all"] --> F["Stop all"]
  F --> G["Cancel Alerts"]
  H["Rel. Id"] --> I["Status"]
  I --> J["Relation description"]
  J --> K["Last monitoring date"]
  K --> L["Last hour statistics"]
  M["1"] --> N["STOPPED"]
  N --> O["orders"]
  O --> P["ok: 0 errors: 0"]
  Q["Start"] -.-> R["End of Process"]
```
</details>

9. To check the document status, please go to MESSAGE TRACKER bookmark.

![](images/726be4c471a4e43dd8013baa64b3607d4749b18beac5d300d985533a63d3ef8b.jpg)

<details>
<summary>text_image</summary>

TRANSACTION NODE
MESSAGE TRACKER
RELATIONS
ADMINISTRATION
Status:
processing
sent
confirmed
error
Relations:
All
File name:
Date:
search by date
date range
1 day
Filter
Reset
Rel. Id	Status	File name	Last operation date	Data of retry
message sending
2	SENT	PKI12188209.xml	2012-11-28 14:26:52			①
2	SENT	PKI12188210.xml	2012-11-28 14:26:52			①
2	SENT	PKI12188211.xml	2012-11-28 14:26:52			①
2	SENT	PKI12188212.xml	2012-11-28 14:26:52			①
2	SENT	PKI12188208.xml	2012-11-28 14:26:52			①
</details>