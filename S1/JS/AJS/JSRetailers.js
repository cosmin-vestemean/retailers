//// JSRetailers
function processSqlAsDataset(obj) {
  return { data: X.SQL(obj.sqlQuery, null) }
}

function convertDatasetToArray(dataset) {
  var arr = []
  dataset.FIRST
  while (!dataset.EOF) {
    var row = {}
    for (var i = 0; i < dataset.fieldcount; i++) {
      var columnName = dataset.fieldname(i)
      row[columnName] = dataset.fields(i)
    }
    arr.push(row)
    dataset.NEXT
  }
  return arr
}

function processSqlAsDataset1(obj) {
  var ds, err;
  if (!obj.sqlQuery)
    return { success: false, error: "No sql query transmited." };
  try {
    ds = X.GETSQLDATASET(obj.sqlQuery, null);
  } catch (e) {
    err = e.message;
  }
  if (ds.RECORDCOUNT > 0) {
    return {
      success: true,
      data: convertDatasetToArray(ds),
      total: ds.RECORDCOUNT,
    };
  } else {
    return {
      success: false,
      error: err,
    };
  }
}