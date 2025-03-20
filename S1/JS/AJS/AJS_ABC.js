function getABCEmployees(o) {
    if (!o) {
        o = {};
    }
    var abcst = o.abcst || null;
    var prsn = o.prsn || null;
    var abccode = o.abccode || null;
    var abcname = o.abcname || null;
    var abcisactive = o.abcisactive || null;
    var prsncode = o.prsncode || null;
    var prsnname = o.prsnname || null;
    var prsnisactive = o.prsnisactive || null;

    //construct a possible where clause
    var where = [];
    if (prsn) where.push("a.cccidcontextual='" + prsn + "'");
    if (abcst) where.push("a.abcst='" + abcst + "'");
    if (abccode) where.push("a.code='" + abccode + "'");
    if (abcname) where.push("a.name='" + abcname + "'");
    if (abcisactive) where.push("a.isactive='" + abcisactive + "'");
    if (prsncode) where.push("b.code='" + prsncode + "'");
    if (prsnname) where.push("b.name2='" + prsnname + "'");
    if (prsnisactive) where.push("b.isactive='" + prsnisactive + "'");

    var qry = 'select a.company, a.dimension, a.abcst, a.code abccode, a.name abcname, a.isactive abcisactive, a.acnmsk, a.cccidcontextual, a.sohcode, b.code prsncode, ' +
        'b.name2 prsnname, b.isactive prsnisactive, b.branch, b.depart, b.email,b.insdate  from abcst a ' +
        'left join prsn b on (b.prsn=a.cccidcontextual and a.company=b.company) ' +
        'where a.dimension=4' + (where.length > 0 ? ' and ' + where.join(' and ') : '') +
        ' order by b.name, a.name';
    var result = X.GETSQLDATASET(qry, null);
    if (result && result.RECORDCOUNT > 0) {
        var data = [];
        result.first;
        while (!result.eof) {
            data.push({
                company: result.company,
                dimension: result.dimension,
                abcst: result.abcst,
                abccode: result.abccode,
                abcname: result.abcname,
                abcisactive: result.abcisactive,
                acnmsk: result.acnmsk,
                cccidcontextual: result.cccidcontextual,
                sohcode: result.sohcode,
                prsncode: result.prsncode,
                prsnname: result.prsnname,
                name2: result.name2,
                prsnisactive: result.prsnisactive,
                branch: result.branch,
                depart: result.depart,
                email: result.email,
                insdate: result.insdate
            });
            result.next;
        }
        return { success: true, total: result.RECORDCOUNT, data: data };
    } else {
        return { success: false, message: 'No data found' };
    }
}

function setEmployee(emp) {
    //emp: { abcst, code, name, isactive, prsn - mandatory }
    if (!emp || !emp.prsn) {
        return { success: false, message: 'Person ID is required' };
    }

    // Verify person exists and get details
    var checkPrsn = "SELECT prsn, code, name2 FROM prsn WHERE prsn=" + emp.prsn;
    var prsnExists = X.GETSQLDATASET(checkPrsn, null);
    
    if (!prsnExists || prsnExists.RECORDCOUNT === 0) {
        return { success: false, message: 'Person not found' };
    }

    try {
        if (emp.abcst) {
            // Build update fields dynamically
            var updateFields = [];
            if (emp.code) updateFields.push("code='" + emp.code + "'");
            if (emp.name) updateFields.push("name='" + emp.name + "'");
            updateFields.push("isactive=" + (emp.isactive || 1));
            updateFields.push("cccidcontextual=" + emp.prsn); // Always update person correlation

            var updateQry = "UPDATE abcst SET " +
                updateFields.join(", ") +
                " WHERE abcst=" + emp.abcst + " AND dimension=4";
            X.RUNSQL(updateQry, null);
        } else {
            // Replace the MAX+1 approach with a gap-finding query
            var unusedIdQry = 'SELECT MIN(t1.abcst + 1) AS nextId FROM abcst t1 LEFT JOIN abcst t2 ON t1.abcst + 1 = t2.abcst WHERE t2.abcst IS NULL AND t1.abcst + 1 > 0';

            var nextId = X.GETSQLDATASET(unusedIdQry, null).nextId;

            // In case there are no gaps, fall back to MAX+1
            if (!nextId) {
              var maxIdQry = "SELECT MAX(abcst) + 1 as nextId FROM abcst";
              nextId = X.GETSQLDATASET(maxIdQry, null).nextId || 1;
            }

            var insertQry = "INSERT INTO abcst (abcst, company, dimension, code, name, isactive, cccidcontextual) " +
                "VALUES (" + nextId + ", 50, 4, '" + 
                (emp.code || prsnExists.code) + "', '" + 
                (emp.name || prsnExists.name2) + "', " + 
                (emp.isactive || 1) + ", " + 
                emp.prsn + ")";
            X.RUNSQL(insertQry, null);
        }
        return { success: true, message: 'Employee saved successfully' };
    } catch (e) {
        return { success: false, message: 'Error saving employee: ' + e.message };
    }
}

//get prsn list
function getPrsnList(o) {
    if (!o) {
        o = {};
    }
    var prsn = o.prsn || null;
    var code = o.code || null;
    var name = o.name || null;
    var name2 = o.name2 || null;
    var isactive = o.isactive || null;
    var branch = o.branch || null;
    var depart = o.depart || null;
    var email = o.email || null;
    var insdate = o.insdate || null;

    //construct a possible where clause
    var where = [];
    if (prsn) where.push("a.prsn='" + prsn + "'");
    if (code) where.push("a.code='" + code + "'");
    if (name) where.push("a.name='" + name + "'");
    if (name2) where.push("a.name2='" + name2 + "'");
    if (isactive) where.push("a.isactive='" + isactive + "'");
    if (branch) where.push("a.branch='" + branch + "'");
    if (depart) where.push("a.depart='" + depart + "'");
    if (email) where.push("a.email='" + email + "'");
    if (insdate) where.push("a.insdate='" + insdate + "'");

    var qry = 'select a.company, a.prsn, a.code, a.name, a.name2, a.isactive, a.branch, a.depart, a.email, a.insdate from prsn a ' +
        'where 1=1' + (where.length > 0 ? ' and ' + where.join(' and ') : '') +
        ' order by a.name2';
    var result = X.GETSQLDATASET(qry, null);
    if (result && result.RECORDCOUNT > 0) {
        var data = [];
        result.first;
        while (!result.eof) {
            data.push({
                company: result.company,
                prsn: result.prsn,
                code: result.code,
                name: result.name,
                name2: result.name2,
                isactive: result.isactive,
                branch: result.branch,
                depart: result.depart,
                email: result.email,
                insdate: result.insdate
            });
            result.next;
        }
        return { success: true, total: result.RECORDCOUNT, data: data };
    }
    else {
        return { success: false, message: 'No data found' };
    }
}

//abc reports
//dimension 4: employees

function getABCEmployeesReport(o) {
    if (!o) {
        o = {};
    }
    
    // Get parameters or use defaults
    var fiscprd = o.fiscprd || new Date().getFullYear();
    var period = o.period || new Date().getMonth() + 1;
    
    var qry = 'WITH CosturiAngajati AS (' +
        'SELECT ' +
            'D4 AS CodAngajat, ' +
            'tprms, ' +
            'fiscprd, ' +
            'period, ' +
            'articol, ' +
            'treapta1 AS CategoriePrincipala, ' +
            'treapta2 AS Subcategorie, ' +
            'treapta3 AS ElementSpecific, ' +
            'c1.name AS NumeCategoriePrincipala, ' +
            'c2.name AS NumeSubcategorie, ' +
            'c3.name AS NumeElementSpecific, ' +
            'SUM(amnt) AS SumaCost ' +
        'FROM CCCABCTRNLINESMANAGV m ' +
        'LEFT JOIN ccccateg1 c1 ON m.treapta1 = c1.ccccateg1 ' +
        'LEFT JOIN ccccateg2 c2 ON m.treapta2 = c2.ccccateg2 ' +
        'LEFT JOIN ccccateg3 c3 ON m.treapta3 = c3.ccccateg3 ' +
        'WHERE D4 IS NOT NULL ' +
          'AND D4 <> \'\' ' +
          'AND fiscprd = ' + fiscprd + ' ' +
          'AND period = ' + period + ' ' +
        'GROUP BY D4, tprms, fiscprd, period, articol, treapta1, treapta2, treapta3, c1.name, c2.name, c3.name ' +
    '), ' +
    'TotalCosturi AS ( ' +
        'SELECT ' +
            'fiscprd, ' +
            'period, ' +
            'SUM(SumaCost) AS TotalCost ' +
        'FROM CosturiAngajati ' +
        'GROUP BY fiscprd, period ' +
    '), ' +
    'RankAngajati AS ( ' +
        'SELECT ' +
            'ca.CodAngajat, ' +
            'ca.fiscprd, ' +
            'ca.period, ' +
            'ca.tprms, ' +
            'ca.articol, ' +
            'ca.CategoriePrincipala, ' +
            'ca.Subcategorie, ' +
            'ca.ElementSpecific, ' +
            'ca.NumeCategoriePrincipala, ' +
            'ca.NumeSubcategorie, ' +
            'ca.NumeElementSpecific, ' +
            'ca.SumaCost, ' +
            'tc.TotalCost, ' +
            '(ca.SumaCost / tc.TotalCost) * 100 AS ProcentCost, ' +
            'SUM(ca.SumaCost) OVER (PARTITION BY ca.fiscprd, ca.period ORDER BY ca.SumaCost DESC) / tc.TotalCost * 100 AS ProcentCumulativ, ' +
            'CASE ' +
                'WHEN SUM(ca.SumaCost) OVER (PARTITION BY ca.fiscprd, ca.period ORDER BY ca.SumaCost DESC) / tc.TotalCost * 100 <= 80 THEN \'A\' ' +
                'WHEN SUM(ca.SumaCost) OVER (PARTITION BY ca.fiscprd, ca.period ORDER BY ca.SumaCost DESC) / tc.TotalCost * 100 <= 95 THEN \'B\' ' +
                'ELSE \'C\' ' +
            'END AS ClasificareABC ' +
        'FROM CosturiAngajati ca ' +
        'JOIN TotalCosturi tc ON ca.fiscprd = tc.fiscprd AND ca.period = tc.period ' +
    ') ' +
    'SELECT ' +
        '\'Raport ABC Angajați - Martie 2025\' AS TitluRaport, ' +
        'CodAngajat, ' +
        'fiscprd, ' +
        'period, ' +
        'tprms, ' +
        'articol, ' +
        'CategoriePrincipala, ' +
        'NumeCategoriePrincipala, ' +
        'Subcategorie, ' +
        'NumeSubcategorie, ' +
        'ElementSpecific, ' +
        'NumeElementSpecific, ' +
        'SumaCost, ' +
        'CAST(ProcentCost AS DECIMAL(10,2)) AS ProcentCost, ' +
        'CAST(ProcentCumulativ AS DECIMAL(10,2)) AS ProcentCumulativ, ' +
        'ClasificareABC ' +
    'FROM RankAngajati ' +
    'ORDER BY ' +
        'fiscprd, ' +
        'period, ' +
        'CategoriePrincipala, ' +
        'Subcategorie, ' +
        'ElementSpecific, ' +
        'SumaCost DESC';

    var result = X.GETSQLDATASET(qry, null);
    if (result && result.RECORDCOUNT > 0) {
        var data = [];
        result.first;
        while (!result.eof) {
            data.push({
                titluRaport: result.TitluRaport,
                codAngajat: result.CodAngajat,
                fiscprd: result.fiscprd,
                period: result.period,
                tprms: result.tprms,
                articol: result.articol,
                categoriePrincipala: result.CategoriePrincipala,
                numeCategoriePrincipala: result.NumeCategoriePrincipala,
                subcategorie: result.Subcategorie,
                numeSubcategorie: result.NumeSubcategorie,
                elementSpecific: result.ElementSpecific,
                numeElementSpecific: result.NumeElementSpecific,
                sumaCost: result.SumaCost,
                procentCost: result.ProcentCost,
                procentCumulativ: result.ProcentCumulativ,
                clasificareABC: result.ClasificareABC
            });
            result.next;
        }
        return { success: true, total: result.RECORDCOUNT, data: data };
    } else {
        return { success: false, message: 'No ABC report data found' };
    }
}