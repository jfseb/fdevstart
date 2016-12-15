
var fs = require('fs');

var transactions = fs.readFileSync('sensitive/raw/bom/all8000.json');

var transact = JSON.parse(transactions);

function divideValue(string) {
  var res = string;
  console.log(string);
  for(var i = 2; i < 10 && i < string.length; ++i) {
    if( i * Math.round(string.length/i) === string.length  ) {
      var segment = string.substring(0, string.length/i);
    //  console.log('analyzing ' + segment);
      var len = segment.length;
      for(var k = 0; (k < i -1 ) && (string.substring(k*len, (k+1)*(len)) === segment) ; ++k) {
        /*emtpy*/
      }
      if(k === i - 1) {
      //  console.log('got it' + segment);
        res = segment;
      }
    }
  }
  return res;
}

var NULL_MARK = '_null_';
var TransData = transact.map(function(oTrans) {
  var obj = {};
  Object.keys(oTrans).forEach(function(sKey) {
    obj[sKey] = oTrans[sKey] || NULL_MARK;
    if (sKey === 'SemanticObject' || sKey === 'SemanticAction') {
      var res = divideValue(oTrans[sKey]);
      if(res !== oTrans[sKey]) {
        console.log('fixing duplicate ' + res + ' <= ' + oTrans[sKey]);
      }
      obj[sKey]  = res;
    }
    if( obj.SemanticObject && obj.SemanticObject !== NULL_MARK && obj.SemanticAction && obj.SemanticAction !== NULL_MARK) {
      obj['fiori intent'] = '#' + obj.SemanticObject + '-' + obj.SemanticAction;
    } else {
      obj['fiori intent'] = '_null_';
    }
  });
  return obj;
});

fs.writeFileSync('sensitive/bom.data.json', JSON.stringify(TransData,undefined,2), { encoding : 'utf8', flag : 'w'});