


var fs = require('fs');


var u = fs.readFileSync('sensitive/bom.data.json');

var data = JSON.parse(u);


fs.writeFileSync('sensitive/bom.data.u.json', JSON.stringify(data,undefined,2));

data.forEach(function(rec) {
  if(rec.appId && rec.releaseId) {
    rec.uri = `https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/#/detail/Apps('${rec.appId}')/${rec.releaseId}`;
  } else {
    delete rec.uri;
  }
});

fs.writeFileSync('sensitive/bom.data.uri0.json', JSON.stringify(data,undefined,2));
