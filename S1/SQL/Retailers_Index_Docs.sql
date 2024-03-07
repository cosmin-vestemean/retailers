select top 200 f.findoc,
    f.trndate,
    f.fincode,
    f.sumamnt,
    md.CCCXMLSendDate,
    md.CCCXMLFile
from findoc f
    left join mtrdoc md on md.findoc = f.findoc
where f.trdr = { trdr }
    and f.series = { series }
    and f.sosource = { sosource }
    and f.fprms = { fprms }
    and cast(f.trndate as date) between dateadd(day, - { daysOlder }, getdate())
    and cast(getdate() as date)
order by f.trndate desc,
    md.CCCXMLSendDate desc