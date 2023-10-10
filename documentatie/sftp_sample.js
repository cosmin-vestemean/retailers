function sample_working_conn() {
  var oShell = new ActiveXObject('Shell.Application'),
    url = 'dx.doc-process.com:2222/',
    usr = 'pet_factory',
    initialDir = '/001G_rFRDUyK4xAMVFfEFelF5WNqhBNujBx38gMmV1fVqIGLNZoQg5f/in/'
  //passphrase = 'PetFactory2021#'.replace('%', '%25').replace('#', '%23').replace(' ', '%20').replace('+', '%2B').replace('/', '%2F').replace('@', '%40').replace(':', '%3A').replace(';', '%3B'),
  ;(passphrase = 'PetFactory2021#'),
    (priv = ''),
    (nume_priv = 'Private Key.ppk'),
    (fingerprint = 'ssh-rsa 2048 BgJCCAEN43vo4+AL1uCvW4MNUioITEQ5+W10ubLAeUs='),
    (wd = ''),
    (sFile = ''),
    (winscpComm = ''),
    (vArguments = ''),
    (vDirectory = ''),
    (vOperation = 'open'),
    (vShow = 0),
    (WshShell = new ActiveXObject('WScript.Shell'))
  wd = WshShell.CurrentDirectory
  priv = wd + '\\' + nume_priv
  winscpComm =
    '"open sftp://' +
    usr +
    '@' +
    url +
    ' -hostkey=""' +
    fingerprint +
    '"" -privatekey=""' +
    priv +
    '"" -passphrase=""' +
    passphrase +
    '"" -rawsettings AuthKI=0 AuthGSSAPIKEX=1 GSSAPIFwdTGT=1" ' +
    '"put -delete -resume ' +
    fisier +
    ' ' +
    initialDir +
    ' " ' +
    '"exit"'
  vArguments =
    ' /log="' + logFldr + 'WinSCP.log" /loglevel=1 /nointeractiveinput /ini=nul /command ' + winscpComm
  sFile = wd + '\\WinSCP.com'

  oShell.ShellExecute(sFile, vArguments, vDirectory, vOperation, vShow)
  if (debugg_mode.trimiteInv2DanteFromDocProc) X.WARNING(vArguments)
  X.RUNSQL('update mtrdoc set CCCXMLSendDate=GETDATE() where findoc=' + SALDOC.FINDOC, null)
  return true
}

/*
Private Key.ppk content:
PuTTY-User-Key-File-3: ssh-rsa
Encryption: aes256-cbc
Comment: rsa-key-20210802
Public-Lines: 6
AAAAB3NzaC1yc2EAAAADAQABAAABAQCSpOcwvL1vBGLOeMBzXaZDZsAOF180qi/u
swI1HewLLJWApUKi2UsYZ4dvEnSnifW1OJn9dclGidgZr1wgzwdIIpTvpp6Pw951
5+ybddIVf5fvANRvmIH+GakDhdVMFTVKAKxo10ZVtl5LSFOE/MTiTcIYZBJ68Daz
f/qS+oUku8uzBI5v4ntQ2WsygsVYX36HI4p1yK9iexp9aJaQIgtLe1GGHGPwe5Hl
ntpJjH0M4kWQvmy3RDGEYS75+ryMZDh8ZFPSoCHF4KmPaPkstVL+9vQ0MRIAfmJE
Kq/9AMCqByBmh3j0IDdJPAZu9HIF4aJx5cN+y1Qcpyx4WXtY6Yw1
Key-Derivation: Argon2id
Argon2-Memory: 8192
Argon2-Passes: 8
Argon2-Parallelism: 1
Argon2-Salt: 97c9d30d1216f91323d5138eb2cffcd0
Private-Lines: 14
OkMFZQuUawvTHNvU9J6CdE1wc8+P76pFLOPaexJRSp8S7biBNNQt3cJY3bKka7zX
dZdZaf2MG0ZzCJmyT8v9+i1HjGqAImU0o4qL2RkbODjvjZ3pls7yKyyBCYJN1wyo
mQm3rrx9lJMNfP0uYcAoKb/yCKKAa3p95ZIg8gnUQyxmu9O3DKg99rW6sAP1DFfj
GATN0SYCjrqX9tk/hdNcvVIBC5bSB6Ji71r/RXrxUQJrhornLzmEuyY4zpyXNwXd
wgB2Zg+NiKrocUGkCuJqRfIqHBwapY+Z05g5wj20kIMX9p7vtZRHcrKxLDuMxwRI
LQppvsIPL8jYmrs5LUm5kNRkyVv+25drYAZM52zoyTchRy7LO2pn8nlFfM1TFmgC
shnkUDnm0DC5eD0UToZgb7Q/MOx8nQMFvunojLueVFSLP+pkpbHvn1mQMOjhd9jp
6a9slZWHlK5NUro/w2Pyh/TAZlIW6btEN/5EGMBgxlNlRuw/3/RWRWdy+/+J5xyQ
Ge4d+idRqQGqrWJHyUh0YUJ5LrlXwj11+jAnQ/xuFWH0ATgE2FBPd6z436Ko75R2
HdQp2X3F/pC1HCuca10aXv7uvdGWHIZ0fildnYRIBhejTeaH3gwmFDVLZa/ZTGik
rmQe3uI/G/lG4HOVk/sTCvQC0gPDOp98mcF8wNNhYHcPnI1PaMUfEbI8QE2Mvyxq
oMC3+cBm1pL2eHhUJBwZDPINV4O9z5qr/KcRIczEBxo4tG/REnAqF2BT39wYXtmg
dYm8OKA/LYfSsun/zVEvjc1+r5jR8MMu2xzVeZGMMEQvx1GrTu6iQo/f1ct21nz0
GZVtTP0Jrs9soRu21KwDmfB9+vq9ofrUTQ6+ljp7PlAZOgrkhWzhA+R5fnNfiO/O
Private-MAC: 1b35f2d94d8a94ff5b862b4bcfdcac346511576b7ccc41ee008ea2698db552e6 

CREATE TABLE CCCSFTP (
	CCCSFTP INT NOT NULL PRIMARY KEY IDENTITY(1, 1)
	,TRDR_RETAILER INT NOT NULL
	,URL VARCHAR(MAX)
	,USERNAME VARCHAR(MAX)
	,PASSPHRASE VARCHAR(MAX)
	,INITIALDIR VARCHAR(MAX)
	,FINGERPRINT VARCHAR(MAX)
	,PRIVATEKEY VARCHAR(MAX)
	)

INSERT INTO CCCSFTP (TRDR_RETAILER, URL, USERNAME, PASSPHRASE, INITIALDIR, FINGERPRINT, PRIVATEKEY)
VALUES (1, 'dx.doc-process.com', 'pet_factory', 'PetFactory2021#', '/001G_rFRDUyK4xAMVFfEFelF5WNqhBNujBx38gMmV1fVqIGLNZoQg5f/in', 'ssh-rsa 2048 BgJCCAEN43vo4+AL1uCvW4MNUioITEQ5+W10ubLAeUs=', 
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
-----END RSA PRIVATE KEY----- ')
*/
