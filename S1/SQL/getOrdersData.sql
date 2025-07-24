-- Cod specific S1 - SQL Script
-- getOrdersData - Script SQL pentru serviciul getS1SqlData
-- Returneaza documentele pentru retailer cu filtru de perioada

SELECT TOP 50 
    c.CCCSFTPXML, 
    c.XMLFILENAME, 
    FORMAT(c.XMLDATE, 'yyyy-MM-dd HH:mm:ss') AS XMLDATE, 
    c.XMLDATA
FROM CCCSFTPXML c 
WHERE c.TRDR_RETAILER = {trdr} 
    AND CAST(c.XMLDATE AS DATE) >= DATEADD(day, -30, GETDATE()) 
ORDER BY c.XMLDATE DESC;
