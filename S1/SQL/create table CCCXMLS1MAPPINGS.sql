CREATE TABLE CCCSFTP (
    CCCSFTP INT NOT NULL PRIMARY KEY IDENTITY(1, 1),
    TRDR_RETAILER INT NOT NULL,
    URL VARCHAR(MAX),
    USERNAME VARCHAR(MAX),
    PASSPHRASE VARCHAR(MAX),
    INITIALDIRIN VARCHAR(MAX),
    INITIALDIROUT VARCHAR(MAX),
    FINGERPRINT VARCHAR(MAX),
    PRIVATEKEY VARCHAR(MAX)
);
INSERT INTO CCCSFTP (
        PORT,
        TRDR_RETAILER,
        URL,
        USERNAME,
        PASSPHRASE,
        INITIALDIRIN,
        INITIALDIROUT,
        FINGERPRINT,
        PRIVATEKEY
    )
VALUES (
        2222,
        13249,
        'dx.doc-process.com',
        'pet_factory',
        'PetFactory2021#',
        '/001G_rFRDUyK4xAMVFfEFelF5WNqhBNujBx38gMmV1fVqIGLNZoQg5f/out',
        '/001G_rFRDUyK4xAMVFfEFelF5WNqhBNujBx38gMmV1fVqIGLNZoQg5f/in',
        'ssh-rsa 2048 BgJCCAEN43vo4+AL1uCvW4MNUioITEQ5+W10ubLAeUs=',
        N'-----BEGIN RSA PRIVATE KEY-----
Proc-Type: 4,ENCRYPTED
DEK-Info: DES-EDE3-CBC,611AD7C2FDCB1C46

lL8DQUja5rx5vsj0hJ/G/iYR9+k3A9j2dFpafUtwWOEKzRPNvop+cxx0eoxwDE21
adrpofOOMBAKHbnKypOQxim6uaDGm5DL/8t+8ezb0jCI817RsDumQU952IpDAhjm
2KuEMKBbHL67HINaMJpCMLTV+2tl35XeCcTdK+lBkKjbODSKyO1KatOFWU2fh4M+
izx+8r5iDXivBH//Ngsby7IAzShENFDYI30I8BgIWaOfdGGCYyTy9Q5xQ7QzC3FH
h+VuEYLbLRJPWcOaYK9WYSW8UdAvV4hxtac8gmhCR3SI2M8CPcGr9yzUFkzW0fUW
Ks4ETEWx7LDLySBylHJANGYki02FivuEYAZOb3NeilqwfW3rXyNydck96U7aTAEb
YvOX2zKMRntILrOYZt1qQNlnOuq6zXh/EOVSzJOexIle56pszn/cxqXkrmh7WgfO
vvGgYQI1yTrRO31QszDmbicyutLlwNqJpI9G+qNT99EEcjdSrUG0JwEtn/zmuGZY
sR51LKtt+9oy1fgENInDwF50TjGFnUx83ynQ1YOh0np1FiwQrir5GoBr64K/LgIR
QudMUlRFyXnmMiprhxjmdmCuisGs6cBWzCjDBgt4XxwzplLVPl5gLNnaO4B+1IdM
cKnb9PsFOi3XH47j2i4tG9lAuWaWc2RRqbFdyKP6PhUasY7qa26D1MMfmlYRYpBv
GQ88TgeLt9oYafibxKVQIiZwuwt+H73MKunveEWD9Qhc0qQHfWUTSu5v1m/AiuUG
zFFgtkeT+tTB1DLYr006x7OyAAxcr/JWGSmDWcIJMz+mMMV1gUeNThNEiX6lmnQ0
FOu+iKdY6pN8P4Mjk78pFIF+Y4xo4Yl+b9czw6Uo6yT+dv53sBE99KqP9LVsPWRg
Ttpb6lUTYwW/gYH+TZjGY0511aSmwoujeImd2+0a69Dgbgu+aZU4VAnmQea2DfQc
2lEZwJhGpLB4htFwoC4kLWwTXGoxvoaHBPGnfwfU8ZoNsH5P6Tf7O2yLVOm1z5s5
g9ALVIzZZKUTnfIy8FWRBwCqec7qAhqDFoWie6Duj3pxwl2GBAk/ygHP7/gx1RV3
FcvI9c+JVVFKeRHGVT5lek4CATbOXwfUHH58h0wCtObtrNSaAFdCKFHV3DcbsAbv
SW+7q4Dm/gSJ+2R5zDyHgGJeglHMPDNbPbpGloETj5siRvQmv4TdryoVaZqzr7An
Eq1Z00H5LQK7OvKy9OpnXtDxPzL12dq4/Tf9F8uzHiMNBmHRcuhVOrCMKIZ9vZ9L
b/bMyM9bDwP3PPKQAxoF51t2VNGaZSIYVxO63nBgfcqbPwKJl66JIQ8aWisMMEhA
eiZB067cFlY2bXa7PJclG3YAJ4PCjH374Bsqsb7AGYKjnoDaBAy9CRJTHWySyfGg
zYTHygvxDqYTKYsKoNce7smyiNYo8tdzGN0HCSXOZXSVbq+7vS0TEUSFNXJ3TgQj
HgLHzfJvo1MUT+ChXr5FuJidytUm0xw8182rEYZtiSzMIs/7vdjok119ygWg10oq
zUuAEns7wlkd2Yu7qicl6GNSXebdJRL5fBWyeGNEacPgFPcKWLENLs/9gl3zuY5I
-----END RSA PRIVATE KEY----- '
    );
create table CCCXMLS1MAPPINGS (
    CCCXMLS1MAPPINGS INT NOT NULL IDENTITY(1, 1),
    XMLNODE VARCHAR(200) NOT NULL,
    MANDATORY SMALLINT DEFAULT 0,
    S1TABLE1 VARCHAR(100) NOT NULL,
    S1FIELD1 VARCHAR(100) NOT NULL,
    S1TABLE2 VARCHAR(100),
    S1FIELD2 VARCHAR(100),
    SQL VARCHAR(MAX),
    CCCDOCUMENTES1MAPPINGS INT NOT NULL,
    OBSERVATII VARCHAR(MAX),
    XMLORDER float,
    SIZE INT,
    FORMAT VARCHAR(50),
    CONSTRAINT PK_CCCXMLS1MAPPINGS PRIMARY KEY (CCCXMLS1MAPPINGS)
);
CREATE TABLE CCCDOCUMENTES1MAPPINGS (
    CCCDOCUMENTES1MAPPINGS INT NOT NULL IDENTITY(1, 1),
    TRDR_RETAILER INT NOT NULL,
    TRDR_CLIENT INT NOT NULL,
    SOSOURCE INT NOT NULL,
    FPRMS INT NOT NULL,
    SERIES INT NOT NULL,
    INITIALDIRIN VARCHAR(200) NOT NULL,
    INITIALDIROUT VARCHAR(200) NOT NULL,
    CONSTRAINT PK_CCCDOCUMENTES1MAPPINGS PRIMARY KEY (CCCDOCUMENTES1MAPPINGS)
);
INSERT INTO CCCDOCUMENTES1MAPPINGS (
        TRDR_RETAILER,
        TRDR_CLIENT,
        SOSOURCE,
        FPRMS,
        SERIES,
        INITIALDIRIN,
        INITIALDIROUT
    )
VALUES (
        69999,
        1,
        1351,
        702,
        7022,
        '/001G_rFRDUyK4xAMVFfEFelF5WNqhBNujBx38gMmV1fVqIGLNZoQg5f/in',
        '/001G_rFRDUyK4xAMVFfEFelF5WNqhBNujBx38gMmV1fVqIGLNZoQg5f/out'
    );
create table CCCSFTPXML (
    CCCSFTPXML INT NOT NULL IDENTITY(1, 1),
    TRDR_RETAILER INT NOT NULL,
    TRDR_CLIENT INT NOT NULL,
    XMLFILENAME VARCHAR(MAX),
    XMLDATA XML,
    XMLDATE DATETIME,
    XMLSTATUS VARCHAR(50),
    XMLERROR VARCHAR(MAX),
    JSONDATA VARCHAR(MAX),
    CONSTRAINT PK_CCCSFTPXML PRIMARY KEY (CCCSFTPXML)
);
alter table CCCSFTPXML
add FINDOC int,
    COMANDACLIENT VARCHAR(50),
    DATACOMANDACLIENT DATE create table CCCRETAILERSCLIENTS (
        CCCRETAILERSCLIENTS INT NOT NULL IDENTITY(1, 1),
        TRDR_CLIENT INT NOT NULL,
        WSURL VARCHAR(MAX),
        WSUSER VARCHAR(MAX),
        WSPASS VARCHAR(MAX),
        COMPANY INT,
        BRANCH INT,
        CONSTRAINT PK_CCCRETAILERSCLIENTS PRIMARY KEY (CCCRETAILERSCLIENTS)
    );
insert into CCCRETAILERSCLIENTS (
        TRDR_CLIENT,
        WSURL,
        WSUSER,
        WSPASS,
        COMPANY,
        BRANCH
    )
VALUES (
        1,
        'http://petfactory.oncloud.gr/s1services',
        'websitepetfactory',
        'petfactory4321',
        50,
        1000
    );
ALTER TABLE MTRUNIT
ADD CCCDOCPROCESSSHORTCUT VARCHAR(10) --Retailers_Index_Docs SQL script, format f.trndate as date:
select f.trndate,
    f.fincode,
    f.sumamnt
from findoc f
where f.trdr = { trdr }
    and f.series = { series }
    and f.sosource = { sosource }
    and f.fprms = { fprms }
    and cast(f.trndate as date) between dateadd(day, - { daysOlder }, getdate())
    and cast(getdate() as date) create table CCCALTTRDRMTRUNIT (
        CCCALTTRDRMTRUNIT INT NOT NULL IDENTITY(1, 1),
        TRDR_RETAILER INT NOT NULL,
        TRDR_CLIENT INT NOT NULL,
        MTRUNIT INT NOT NULL,
        SHORTCUT VARCHAR(10),
        CONSTRAINT PK_CCCALTTRDRMTRUNIT PRIMARY KEY (CCCALTTRDRMTRUNIT)
    )
INSERT INTO CCCALTTRDRMTRUNIT (TRDR_RETAILER, TRDR_CLIENT, MTRUNIT, SHORTCUT)
VALUES (13249, 1, 1, 'PC'),
    (78631, 1, 1, 'PC'),
    (11322, 1, 1, 'PC'),
    (11639, 1, 1, 'PC'),
    (12349, 1, 1, 'PCE')
    /*
     Aperak.xml file to db
     <?xml version="1.0" encoding="UTF-8" standalone="no"?>
     <DXMessage xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:noNamespaceSchemaLocation="file:///C:/Users/rlixandru/Downloads/docxchange-message.xsd">
     <MessageDate>2023-10-04</MessageDate>
     <MessageTime>15:18:38</MessageTime>
     <MessageOrigin>RO17275880</MessageOrigin>
     <DocumentReference>INVOIC_16850_VAT_RO25190857.xml</DocumentReference>
     <DocumentUID>DXDqGWNEPEcXJmVRGWbisJHQ</DocumentUID>
     <SupplierReceiverCode>-</SupplierReceiverCode>
     <DocumentResponse>RECEPTIONAT</DocumentResponse>
     <DocumentDetail>- - ID document: DXDqGWNEPEcXJmVRGWbisJHQ Nume fisier:
     INVOIC_16850_VAT_RO25190857.xml Status: Receptionat de destinatar / Received by recipient
     Mesaj: Documentul a fost primit de cÄtre destinatar. The document has been received by the
     recipient.</DocumentDetail>
     </DXMessage>
     */
    create table CCCAPERAK (
        CCCAPERAK INT NOT NULL IDENTITY(1, 1),
        TRDR_RETAILER INT NOT NULL,
        TRDR_CLIENT INT NOT NULL,
        FINDOC INT NOT NULL,
        XMLFILENAME VARCHAR(100),
        XMLSENTDATE DATE,
        MESSAGEDATE DATE,
        MESSAGETIME TIME,
        MESSAGEORIGIN VARCHAR(50),
        DOCUMENTREFERENCE VARCHAR(100),
        DOCUMENTUID VARCHAR(50),
        SUPPLIERRECEIVERCODE VARCHAR(50),
        DOCUMENTRESPONSE VARCHAR(50),
        DOCUMENTDETAIL VARCHAR(MAX),
        CONSTRAINT PK_CCCAPERAK PRIMARY KEY (CCCAPERAK)
    );
SELECT A.FINDOC,
    A.FINCODE,
    a.SERIESNUM DocumentReference,
    CONCAT(B.BGBULSTAT, B.AFM) MessageOrigin
FROM FINDOC A
    INNER JOIN TRDR B ON A.TRDR = B.TRDR
WHERE A.SOSOURCE = 1351
    and A.FINCODE LIKE '%19521%'
    AND A.TRNDATE = '2024-03-01'
    and (
        (CONCAT(B.BGBULSTAT, B.AFM) = 'RO13348610')
        or (b.afm = 'RO13348610')
    )