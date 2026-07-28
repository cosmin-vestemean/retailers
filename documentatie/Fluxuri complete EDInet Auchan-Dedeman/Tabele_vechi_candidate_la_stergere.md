# Tabele vechi candidate la ștergere — inventar Soft1 (company 50)

> Măsurat pe baza de date de producție la **2026-07-28**. Toate interogările au fost `SELECT`.
> **Nu s-a executat niciun `DROP`.** Documentul este o propunere care necesită confirmare.

## Cuprins

- [1. Metodologie](#1-metodologie)
- [2. Rezumat pe familii](#2-rezumat-pe-familii)
- [3. Constatarea centrală: fluxul vechi a murit la migrarea din 09.06.2026](#3-constatarea-centrală-fluxul-vechi-a-murit-la-migrarea-din-09062026)
- [4. Avertisment: tabelele nu sunt izolate](#4-avertisment-tabelele-nu-sunt-izolate)
- [5. Nivelul A — sigur de șters](#5-nivelul-a--sigur-de-șters-0-rânduri-flux-abandonat)
- [6. Nivelul B — de șters după backup](#6-nivelul-b--de-șters-după-backup-populate-dar-moarte)
- [7. Nivelul C — de confirmat înainte de ștergere](#7-nivelul-c--de-confirmat-înainte-de-ștergere)
- [8. Nivelul D — NU se șterg](#8-nivelul-d--nu-se-șterg)
- [9. Ordinea de execuție propusă](#9-ordinea-de-execuție-propusă)

---

## 1. Metodologie

Criteriul cerut — *ultima dată când s-a făcut un insert* — **nu poate fi citit direct**:

```
sys.dm_db_index_usage_stats  →  VIEW SERVER PERFORMANCE STATE permission was denied
```

Contul de web service nu are dreptul de a citi vizualizările de management dinamic. Ultima
inserare a fost dedusă din trei surse independente, care se confirmă reciproc:

| Sursă | Ce arată |
| --- | --- |
| `MAX(<coloană de dată>)` pe datele efective | ultima dată de business încărcată |
| Ordinea coloanei `IDENTITY` (ultimul ID ↔ ultima dată) | confirmă că ordinea de inserare = ordinea datelor |
| Distribuția lunară a rândurilor | arată *cum* s-a oprit fluxul (brusc sau treptat) |

Peste asta s-au adăugat două verificări de siguranță:

- **Referințe în cod**: `grep` pe tot workspace-ul (`**/*.{js,sql,mjs,json}`) după numele tabelelor.
- **Referințe în obiecte SQL**: `sys.sql_expression_dependencies`, pentru vizualizări, proceduri
  și funcții care ar rămâne rupte după `DROP`.

---

## 2. Rezumat pe familii

| Familie | Tabele | Rânduri | Spațiu | Ultima activitate | Verdict |
| --- | ---: | ---: | ---: | --- | --- |
| `A_TMP_AUCHAN_*` | 12 | 415.888 | **161 MB** | 2026-06-05 | B — de șters |
| `A_*_CARREFOUR_*` | 19 | 256.209 | **87 MB** | 2026-04-22 | B — de șters |
| `A_*_EXPERT_*` | 24 | 62.792 | **28 MB** | 2026-05-29 | B — de șters (cu o excepție) |
| `A_TMP_DEDEMAN_*` | 25 | 67 | 6 MB | 2026-06-09 | A + B |
| `A_IKA_*` | 4 | 36 | <1 MB | 2026-06-16 | A + D (mixt) |
| `CCCEDI*` (redesign 2025) | 6 | 218 | <1 MB | 2025-05-06 | C — de confirmat |
| `A_CLIENTI1`, `A_MDW_08042015` | 2 | 3.746 | 1 MB | — (2015/2018) | B — de șters |
| **Total** | **92** | **738.956** | **~284 MB** | | |

> `CCCEDIPROVIDER` este exclus din familia `CCCEDI*` — vezi [nivelul D](#8-nivelul-d--nu-se-șterg).

---

## 3. Constatarea centrală: fluxul vechi a murit la migrarea din 09.06.2026

Distribuția lunară a inserărilor în `A_TMP_AUCHAN_DOCUMENT`, cel mai mare tabel din inventar:

| Perioadă | Documente / lună |
| --- | ---: |
| 2025-01 → 2026-05 (17 luni) | 38–77, constant |
| **2026-06** | **9, ultimul pe 05.06.2026** |
| 2026-07 | **0** |

Ultimul `IDENTITY` inserat este `Document_Id = 23837`, cu data `2026-06-05 10:50:17`. Nimic după.

Același tipar la Dedeman: ultimul document `2026-06-09 13:10:31`, ultimul XML încărcat
`2026-06-09 16:22:12`. **Exact momentul migrării pe scanner-ul nou.**

La Carrefour, fluxul de intrare murise deja mai devreme: un singur rând în 2026 (22.04.2026),
comenzile trecând între timp prin DocProcess.

> **Concluzie.** Aceste tabele nu sunt „vechi pentru că au fost create în 2018" — sunt moarte
> pentru că fluxul care le alimenta a fost înlocuit. Oprirea este bruscă, datată și explicabilă,
> nu o scădere treptată care ar putea însemna „se folosește rar".

---

## 4. Avertisment: tabelele nu sunt izolate

**Fiecare** tabel `A_TMP_*` este referit de vizualizări și proceduri stocate `G_*`. Ștergerea
tabelelor fără ștergerea acestor obiecte lasă în bază proceduri rupte care vor eșua la execuție.

| Familie | Obiecte SQL care trebuie șterse odată cu tabelele |
| --- | --- |
| Auchan | `G_Auchan_GetOrder`, `G_Auchan_Order_Header`, `G_Auchan_Order_Lines` |
| Carrefour | `G_Carrefour_GetOrder`, `G_Carrefour_Order_Header`, `G_Carrefour_Order_Lines` |
| Expert | `G_Expert_GetOrder`, `G_Expert_Order_Header`, `G_Expert_Order_Lines` |
| Dedeman | `G_DEDEMAN_GetOrder`, `G_DEDEMAN_Order_Header`, `G_DEDEMAN_Order_Lines`, `G_DEDEMAN_DeleteTMP`, `G_DEDEMAN_MutareXML_ERR`, `G_DEDEMAN_Get_XML`, `G_DEDEMAN_Get_XML_MS` |
| Dedeman RETANN | `G_DEDEMAN_GetRetann`, `G_DEDEMAN_Retann_Header`, `G_DEDEMAN_Retann_Lines`, `G_DEDEMAN_RETANN_DeleteTMP`, `G_DEDEMAN_Retann_MutareXML_ERR`, `G_DEDEMAN_Get_XML_RETANN` |
| Comun | `G_Ika_GetOrder`, `G_Ika_GetOrder_AfterInsert` |

> **Două obiecte cer atenție specială.** `G_DEDEMAN_Get_XML_MS` a fost **creată pe 22.04.2026**, iar
> `G_DEDEMAN_Get_XML` și `G_Ika_GetOrder` au fost **modificate în aceeași zi** — cu mai puțin de două
> luni înainte de migrare. Cineva încă lucra la calea veche. Înainte de ștergere trebuie confirmat
> că munca respectivă a fost abandonată, nu doar suspendată.

### Ce NU se atinge din obiectele `G_*`

`G_XML_ExportDoc` este apelată din codul EDA de producție ([S1/JS/SALDOC_EF_27072026.js](S1/JS/SALDOC_EF_27072026.js#L37))
și dispecerizează către `G_XML_Carrefour_ExportDoc`, `G_XML_Expert_ExportDoc` și
`G_XML_Infinite_ExportDoc`. Toate patru sunt **vii** și citesc din `FINDOC`/`TRDR`, nu din tabelele
`A_TMP_*` — verificat prin `sys.sql_expression_dependencies`.

Fluxul de export este în continuare activ: ultimele XML-uri trimise sunt din **28.07.2026**
(Carrefour, 515 documente în 2026), 17.07.2026 (Supeco, 1.089) și 17.07.2026 (Dante/eMAG, 126).

---

## 5. Nivelul A — sigur de șters (0 rânduri, flux abandonat)

Staging-ul RETANN construit în februarie 2019 și **niciodată folosit**: 14 tabele, zero rânduri
în șapte ani și jumătate.

| Tabel | Rânduri | Creat |
| --- | ---: | --- |
| `A_IKA_RETANN` | 0 | 2019-02-26 |
| `A_IKA_RETANNDETAIL` | 0 | 2019-02-26 |
| `A_TMP_DEDEMAN_RETANN` | 0 | 2019-02-26 |
| `A_TMP_DEDEMAN_RETANNDETAIL` | 0 | 2019-02-26 |
| `A_TMP_DEDEMAN_RETANNHEADER` | 0 | 2019-02-26 |
| `A_TMP_DEDEMAN_RETANNSUMMARY` | 0 | 2019-02-26 |
| `A_TMP_DEDEMAN_RETANN_ADDRESSDETAILS` | 0 | 2019-02-26 |
| `A_TMP_DEDEMAN_RETANN_BUYERPARTY` | 0 | 2019-02-26 |
| `A_TMP_DEDEMAN_RETANN_DESADVPARTY` | 0 | 2019-02-26 |
| `A_TMP_DEDEMAN_RETANN_ITEM` | 0 | 2019-02-26 |
| `A_TMP_DEDEMAN_RETANN_ITEM_ORDERATBUYERPARTY` | 0 | 2019-02-26 |
| `A_TMP_DEDEMAN_RETANN_ORDERATBUYERPARTY` | 0 | 2019-02-26 |
| `A_TMP_DEDEMAN_RETANN_SELLERPARTY` | 0 | 2019-02-26 |
| `A_TMP_DEDEMAN_RETANN_SHIPTOPARTY` | 0 | 2019-02-26 |
| `A_Tmp_Expert_OrderLine` | 0 | 2020-09-24 |

> **Relevant pentru proiectul curent.** Aceste tabele sunt o încercare din 2019 de a implementa exact
> fluxul RETANN pe care îl construim acum. Faptul că sunt goale confirmă că **nu a existat niciodată
> o implementare RETANN funcțională** în Soft1 — nu se pierde nicio logică prin ștergere. Merită însă
> citit codul din `G_DEDEMAN_Retann_Header` / `G_DEDEMAN_Retann_Lines` **înainte** de ștergere: este
> singura descriere formală a structurii RETANN făcută de partenerul Soft1, chiar dacă nu a fost
> pusă în producție.

---

## 6. Nivelul B — de șters după backup (populate, dar moarte)

### 6.1 Auchan — 161 MB, cel mai mare câștig

| Tabel | Rânduri |
| --- | ---: |
| `A_TMP_AUCHAN_ITEM` | 275.218 |
| `A_TMP_AUCHAN_DOCUMENT` | 15.613 |
| `A_TMP_AUCHAN_ORDERHEADER` | 15.610 |
| `A_TMP_AUCHAN_ORDERPARTY` | 15.609 |
| `A_TMP_AUCHAN_BUYERPARTY` | 15.608 |
| `A_TMP_AUCHAN_DOCUMENTSUMMARY` | 15.608 |
| `A_TMP_AUCHAN_INVOICEEPARTY` | 15.608 |
| `A_TMP_AUCHAN_ORDERSUMMARY` | 15.608 |
| `A_TMP_AUCHAN_SELLERPARTY` | 15.608 |
| `A_TMP_AUCHAN_SHIPTOPARTY` | 15.608 |
| `A_TMP_AUCHAN_ORDER` | 95 |
| `A_TMP_AUCHAN_ORDERDETAIL` | 95 |

Ultima inserare: **05.06.2026**. Zero referințe în codul din repository.

### 6.2 Carrefour — 87 MB

`A_TMP_CARREFOUR_QUANTITY` (58.412), `A_TMP_CARREFOUR_ITEM` (58.397),
`A_TMP_CARREFOUR_ORDERLINE` (58.397), `A_TMP_CARREFOUR_PRICE` (58.395),
`A_TMP_CARREFOUR_POSTALADDRESS` (7.256), `A_TMP_CARREFOUR_ORDER` (1.828),
`A_TMP_CARREFOUR_REQUESTEDDELIVERYPERIOD` (1.812), `A_TMP_CARREFOUR_ACCOUNTINGCUSTOMERPARTY`,
`A_TMP_CARREFOUR_BUYERCUSTOMERPARTY`, `A_TMP_CARREFOUR_DELIVERYPARTY`,
`A_TMP_CARREFOUR_SELLERSUPPLIERPARTY` (1.808 fiecare),
`A_TMP_CARREFOUR_ANTICIPATEDMONETARYTOTAL`, `A_TMP_CARREFOUR_TAXEXCLUSIVEAMOUNT` (1.804 fiecare),
`A_TMP_CARREFOUR_CARREFOURMESSAGE` (257), `A_TMP_CARREFOUR_DXMESSAGE` (252),
`A_Tmp_Carrefour_MaximumMeasure`, `A_Tmp_Carrefour_Measure`,
`A_Tmp_Carrefour_PalletSpaceMeasurementDimension` (116 fiecare), `A_Tmp_Carrefour_Delivery` (15).

Ultima comandă intrată: **22.04.2026**. Tabelele de mesaje s-au oprit în **2014–2015**.

> Carrefour rămâne client activ (515 facturi exportate în 2026), dar comenzile intră acum prin
> DocProcess. Se șterge doar calea **de intrare** veche, nu exportul.

### 6.3 Expert / Remarkt — 28 MB

`A_TMP_EXPERT_MESSAGE`, `A_TMP_EXPERT_SUMMARY` (8.742), `A_TMP_EXPERT_BUYER`,
`A_TMP_EXPERT_DELIVERY`, `A_TMP_EXPERT_DOCUMENTS`, `A_TMP_EXPERT_INVOICEE`,
`A_TMP_EXPERT_SELLER` (8.741 fiecare), `A_TMP_EXPERT_LINE` (145),
`A_Tmp_Expert_Item`, `A_Tmp_Expert_Price`, `A_Tmp_Expert_Quantity` (84 fiecare),
`A_TMP_EXPERT_HEADER`, `A_TMP_EXPERT_LINES`, `A_Tmp_Expert_PostalAddress` (4),
`A_TMP_EXPERT_ORDER` (2), plus șapte tabele de părți din 2020 cu câte 1 rând.

Ultima comandă: **25.05.2026**.

### 6.4 Dedeman — mic, dar complet

`A_TMP_DEDEMAN_ITEM` (31), `A_TMP_DEDEMAN_XML` (3) și celelalte nouă tabele de comenzi cu câte
3 rânduri. Ultima încărcare: **09.06.2026 16:22**.

### 6.5 Reziduuri istorice

| Tabel | Rânduri | Observație |
| --- | ---: | --- |
| `A_CLIENTI1` | 3.485 | import unic de clienți, fără referințe |
| `A_MDW_08042015` | 261 | snapshot datat în chiar numele tabelului: 08.04.2015 |

---

## 7. Nivelul C — de confirmat înainte de ștergere

Un redesign al platformei EDI început în **aprilie 2025** și abandonat. Tabelele apar **exclusiv**
în [S1/SQL/migrations.sql](S1/SQL/migrations.sql#L296) — niciun cod aplicativ, nicio vizualizare,
nicio procedură nu le atinge.

| Tabel | Rânduri | Creat | Ultima activitate |
| --- | ---: | --- | --- |
| `CCCEDIGLNMAPPINGS` | 207 | 2025-04-16 | fără coloană de dată |
| `CCCEDIRETAILERROUTING` | 10 | 2025-04-16 | `MIGRATION_DATE` gol pe toate rândurile |
| `CCCEDIRAWDOCUMENTS` | 1 | 2025-04-16 | **06.05.2025** — un singur test |
| `CCCEDIPROCESSMONITOR` | 0 | 2025-04-16 | niciodată |
| `CCCEDIRETAILERMIGRATIONLOG` | 0 | 2025-04-16 | niciodată |
| `CCCEDIUSERS` | 0 | 2025-06-12 | niciodată |

> **De ce „de confirmat" și nu „de șters".** `CCCEDIGLNMAPPINGS` conține 207 corespondențe
> GLN → `TRDR`. Chiar dacă tabelul nu e citit de nimeni, **conținutul** poate fi util: proiectul
> curent rezolvă aceeași problemă prin `TRDRBRANCH.CCCGLNCODE`. Înainte de `DROP`, conținutul
> trebuie comparat cu maparea actuală, ca să nu se piardă corespondențe validate manual.
>
> `CCCEDIUSERS` conține o coloană `PASSWORD_HASH`. Chiar goală fiind, ștergerea reduce suprafața
> de atac și elimină confuzia cu autentificarea reală din aplicația Node.

---

## 8. Nivelul D — NU se șterg

| Obiect | Motiv |
| --- | --- |
| `A_IKA_ORDER`, `A_IKA_ORDERDETAIL` | **Scrise de codul EDA de producție.** [S1/JS/SALDOC_EF_27072026.js](S1/JS/SALDOC_EF_27072026.js#L1399) face `INSERT` în ele pentru comenzile DocProcess. Numărul mic de rânduri (4 și 32) înseamnă că sunt tabele de lucru golite periodic, nu tabele moarte. |
| `CCCDOCPROCDANTEXML`, `CCCDOCPROCDANTEXMLERR` | Scrise de același cod de producție, care le și **recreează automat** dacă lipsesc (`if OBJECT_ID(...) is null CREATE TABLE`). Ștergerea este inutilă. |
| `CCCEDIPROVIDER` | **Viu și esențial** — citit de aplicația Node în [src/services/retailer/retailer.class.js](src/services/retailer/retailer.class.js#L11), [src/services/CCCSFTP/CCCSFTP.class.js](src/services/CCCSFTP/CCCSFTP.class.js#L39) și [src/edi/transports/factory.js](src/edi/transports/factory.js#L40). |
| `G_XML_ExportDoc` și cele trei proceduri apelate de ea | Exportul de facturi funcționează zilnic (ultimul: 28.07.2026). |
| `TMPACNBAL`, `TMPCDIMMTRLN`, `TMPCDIMTRN`, `TMPCREDIT*`, `TMPNEGBAL*`, `TMPSALESCOST`, `CCCS1DXTYPES`, `CCCVATPAYANAL` | Tabele standard Soft1 de lucru. Goale prin natura lor, nu prin abandon. |
| `CCCPNLUSERPREFS`, `CCCPNLWORKLIST`, `CCCPNLWORKLISTITEM` | Goale, dar create în **mai 2026** pentru proiectul PNL, în curs. |

---

## 9. Ordinea de execuție propusă

1. **Backup complet al bazei**, nu doar al tabelelor vizate.
2. **Extrage scriptul obiectelor `G_*`** care urmează să dispară (`sp_helptext` sau Generate
   Scripts) și salvează-l în repository, la `S1/SQL/legacy/`. Este documentație asupra formatelor
   XML vechi și dispare definitiv odată cu obiectele.
3. **Exportă conținutul** tabelelor de la nivelul C într-un fișier, înainte de orice `DROP`.
4. **Redenumește, nu șterge**, ca prim pas: `sp_rename 'A_TMP_AUCHAN_ITEM', 'ZZ_DEL_A_TMP_AUCHAN_ITEM'`.
   Dacă timp de o lună nimic nu eșuează, `DROP`-ul devine sigur. Dacă ceva eșuează, redenumirea
   se anulează instantaneu.
5. **Șterge în ordine**: întâi vizualizările și procedurile `G_*`, apoi tabelele — invers față de
   dependențe.
6. Nivelurile A și B pot merge împreună. Nivelul C doar după confirmarea de la pasul 3.

> **Câștig estimat:** ~284 MB și 92 de tabele eliminate din schemă. Câștigul real nu este spațiul,
> ci faptul că `Database Explorer` și orice analiză viitoare nu vor mai întoarce zeci de tabele
> care par relevante după nume și nu sunt.
