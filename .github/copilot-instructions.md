# Soft1 Web Services Integration Reference

This repository integrates with the Soft1 Web Services API available at https://www.softone.gr/ws/

## Key Endpoints

The base URL format for API calls is:
```
http://[Registered Name or Serial Number].oncloud.gr/s1services
```

## Authentication
- Requires Web Service account (AppID)
- Login service requires:
    - Username
    - Password 
    - AppID

## Documentation
For complete API documentation and integration details, visit [Soft1 Web Services Documentation](https://www.softone.gr/ws/)

## Code Structure

The `/public/S1` folder contains:
- `/AJS` - Customizable Soft1 endpoint implementations 
- Other reference code from Soft1 ERP (view only)

Only files in the `/AJS` directory should be modified. Other files serve as reference implementations.

### RUNSQL(ASQL: string; AParams: Variant)

Executes an action query using the provided SQL statement and parameters.

#### Parameters
- `ASQL` (string): The SQL statement to execute. Can include parameterized queries using :1, :2 etc syntax.
- `AParams` (Variant): Array containing parameter values to substitute in the SQL statement. Parameters are matched by position to :1, :2 etc in the SQL.

#### Usage Notes
- Used for executing UPDATE, INSERT, DELETE and other action queries
- SQL parameters should be specified using :1, :2 etc syntax
- Number of parameters in AParams must match number of :n placeholders in SQL
- Company context is often required in queries

#### Example

```javascript
// Example of RUNSQL usage
var sql = "UPDATE TRDR SET ISACTIVE=0 WHERE COMPANY=:1 AND CODE=:2";
X.RUNSQL(sql, X.SYS.COMPANY, "CUST001");
```

### GETSQLDATASET(ASQL: string; AParams: Variant): TDataset

Executes a SQL query and returns results in a dataset.

#### Parameters
- `ASQL` (string): The SQL query to execute. Can include parameterized queries using :1, :2 etc syntax
- `AParams` (Variant): Parameter values to substitute in the SQL statement, matched by position

#### Returns
- `TDataset`: Dataset containing the query results

#### Usage Notes
- Used for SELECT queries that return data
- SQL parameters use :1, :2 etc syntax
- Number of AParams must match :n placeholders
- Company context typically required

#### Example
```javascript
var qry = "SELECT CODE, NAME FROM TRDR WHERE COMPANY=:1 AND SODTYPE=:2 AND BUSUNITS=:3";
var ds = X.GETSQLDATASET(qry, X.SYS.COMPANY, 13, 100);
```

### HTTPCALL(URL: string, PostData: string, Headers: string, Method: string): Variant

Makes HTTP requests for interacting with web services, APIs and websites.

#### Parameters
- `URL` (string): Target URL for the web request
- `PostData` (string): Data to send in the request body
- `Headers` (string): Request headers separated by \r\n
- `Method` (string): HTTP method (GET, POST, PUT, PATCH, DELETE)

#### Returns
- `Variant`: Response from the HTTP request

#### Usage Notes
- Used for external web service integration
- Headers must be \r\n delimited
- Supports standard HTTP methods
- Returns raw response data

#### Examples
```javascript
// GET request example
function makeGetRequest() {
    try {
        var response = X.HTTPCALL("https://www.mysite.com/api"); 
        if (response) {
            return true;
        }
    } catch (err) {
        X.WARNING(err.message);
    }
    return false;
}

// POST request example
function makePostRequest(apiKey) {
    var headers = "Content-Type: application/json\r\nAuthorization: Bearer " + apiKey;
    var data = JSON.stringify({
        username: "user1",
        password: "pass"
    });
    
    return X.HTTPCALL("https://www.mysite.com/api", data, headers, "POST");
}
```

### WEBREQUEST(JSONRequest: string): string

Executes SoftOne web service requests using built-in services.

#### Parameters
- `JSONRequest` (string): JSON string containing the service request parameters

#### Returns
- `string`: JSON response from the web service

#### Usage Notes
- Used for built-in SoftOne services like SetData, GetData, GetBrowserInfo
- For custom web services, use WSCALL instead
- Supports both external and internal requests
- Request must be properly formatted JSON

#### Examples
```javascript
// Get data using SqlData service
function getItems() {
    var ws = {
        SERVICE: "SqlData",
        SQLNAME: "CallFromForm",
        PARAM1: "2020,2021,2022,2023"
    };
    return JSON.parse(X.WEBREQUEST(JSON.stringify(ws)));
}

// Get INST data using getData service
function getInstData(key) {
    var ws = {
        SERVICE: "getData",
        OBJECT: "INST",
        KEY: key,
        appid: 3000,
        LOCATEINFO: "INST:INST,CODE,NAME,GDATEFROM,GDATETO"
    };
    return JSON.parse(X.WEBREQUEST(JSON.stringify(ws)));
}
```
### WSCALL(scope: variant, Uri: string, postData: string, callbackFunc: variant): string

Executes SoftOne web service requests, supporting both built-in and custom services.

#### Parameters
- `scope` (variant): Scope for the web service call (use null for most cases)
- `Uri` (string): URL path for custom web services, null for built-in services
- `postData` (string): JSON string containing request parameters
- `callbackFunc` (variant): Optional callback function (use null if not needed)

#### Returns
- `string`: JSON response from the web service

#### Usage Notes
- Handles both built-in and custom web service requests
- For built-in services, set Uri to null
- For custom services, specify the URL path (e.g. "/s1services/JS/mywebcall")
- PostData must be properly formatted JSON

#### Example
```javascript
// Custom web service request
function CustomWSRequest() {
    var ws = {
        clientID: "xxx",
        categ: 100
    };
    var url = "/s1services/JS/myWS/getItemCategories";
    var result = X.WSCALL(null, url, JSON.stringify(ws), null);
    return JSON.parse(result);
}
```

### GETXML(withmetadata: boolean): string

Converts a dataset to XML format.

#### Parameters
- `withmetadata` (boolean): Whether to include metadata in the XML output
    - `false` (0): Basic XML without metadata
    - `true` (1): XML including field definitions and parameters

#### Returns
- `string`: XML representation of the dataset

#### Usage Notes
- Converts dataset contents to XML format
- Metadata includes field definitions when enabled
- Uses ISO-8859-7 encoding
- Useful for data exchange and web services

#### Example
```javascript
function GetXMLFormat(withmetadata) {
        var ds = X.GETSQLDATASET("SELECT CODE, NAME FROM TRDR WHERE TRDR=:1", SALDOC.TRDR);
        return ds.GETXML(withmetadata);
}
```

Sample Output (without metadata):
```xml
<?xml version="1.0" encoding="ISO-8859-7"?>
<SODATA>
<ROWDATA><ROW CODE="09" NAME="Test Customer 1"/>
</ROWDATA>
</SODATA>
```

Sample Output (with metadata):
```xml
<?xml version="1.0" encoding="ISO-8859-7"?>
<SODATA>
<METADATA>
<FIELDS>
<FIELD fieldname="CODE" fieldtype="string" WIDTH="25" fieldcaption=""/>
<FIELD fieldname="NAME" fieldtype="string" WIDTH="64" fieldcaption=""/>
</FIELDS>
<PARAMS PRIMARY_KEY=""/>
</METADATA>
<ROWDATA>
<ROW CODE="09" NAME="Test Customer 1"/>
</ROWDATA>
</SODATA>
```


### JSON: string

Returns a dataset or table contents in JSON format.

#### Returns
- `string`: JSON representation of the dataset or table

#### Usage Notes
- Converts dataset/table contents to JSON string
- Includes column names and data rows
- Useful for web services and data exchange
- Compatible with standard JSON parsers

#### Example
```javascript
function GetTableAsJson() {
    var vjson = MTRSUBSTITUTE.JSON;
    X.WARNING(vjson);
    return vjson;
}
```