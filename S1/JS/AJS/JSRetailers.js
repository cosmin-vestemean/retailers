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
