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
    if (prsnname) where.push("b.name='" + prsnname + "'");
    if (prsnisactive) where.push("b.isactive='" + prsnisactive + "'");

    var qry = 'select a.company, a.dimension, a.abcst, a.code abccode, a.name abcname, a.isactive abcisactive, a.acnmsk, a.cccidcontextual, a.sohcode, b.code prsncode, ' +
        'b.name prsnname, b.name2, b.isactive prsnisactive, b.branch, b.depart, b.email,b.insdate  from abcst a ' +
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
            var maxIdQry = "SELECT MAX(abcst) + 1 as nextId FROM abcst";
            var nextId = X.GETSQLDATASET(maxIdQry, null).nextId || 1;

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
        ' order by a.name';
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