/**
 * (c) 2017 jfsebpublic
 * perform regression run on input filename
 *
 * Regression output is written to the given database url
 * Fileformat is array of strings
 *
 * optional parameters -i <filename> e.g. -i input_r
 *
 */
var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../gen_cov' : '../gen';
//var debuglog = require('debug')('plainRecoginizer.nunit');
var debug = require('debug');
const debuglog = debug('stringcompare.perf');

//var dataExpS = fs.readFileSync('./regress/' + fnin + '.expect.json');
//var dataExp = JSON.parse(dataExpS);

//var logger = require(root + '/utils/logger');
const ds = require(root + '/utils/damerauLevenshtein.js');

const Model = require(root + '/model/model.js');
const theModel = Model.loadModels('./sensitive');


var seen = {};
var strings = theModel.mRules.map(function(o) {
  var lc = o.matchedString.toLowerCase();
  if(seen[lc]) {
    return undefined;
  }
  seen[lc] = lc;
  return lc;
});

strings = strings.filter(function(oString) {
  return (typeof oString === 'string') && oString.length > 2;
});

strings = strings.filter(function(oString, index) {
  return !(index % 10);
});

strings.sort(function(a,b) {
  return a.length - b.length;
});

var delta = 10;

console.log('got ' + strings.length + ' strings');

var t = Date.now();
for(var i = 0; i < strings.length; ++i) {
  var lower = Math.max(0,i- delta);
  var higher = Math.min(strings.length, i + delta);
  var a = strings[i];
  for(var k = lower; k < higher; ++k) {
    if(k != i) {
      ds.levenshtein(a,strings[k]);
    }
  }
}
console.log('levenshtein: '  + (Date.now()- t));
/*
t = Date.now();
for( i = 0; i < strings.length; ++i) {
  lower = Math.max(0,i- delta);
  higher = Math.min(strings.length, i + delta);
  a = strings[i];
  for( k = lower; k < higher; ++k) {
    if(k != i) {
      ds.jaro_winkler_adj(a,strings[k]);
    }
  }
}
console.log('jaro_winkler: '  + (Date.now()- t));
*/
t = Date.now();
for( i = 0; i < strings.length; ++i) {
  lower = Math.max(0,i- delta);
  higher = Math.min(strings.length, i + delta);
  a = strings[i];
  for( k = lower; k < higher; ++k) {
    if(k != i) {
      ds.talisman_jaro(a,strings[k]);
    }
  }
}
console.log('talisman_jaro: '  + (Date.now()- t));


console.log('here dist names number ' + ds.jaroWinklerDistance('element names', 'element number'));
console.log('here dist names name ' + ds.jaroWinklerDistance('element names', 'element name'));
console.log('here dist names elementnumber ' + ds.jaroWinklerDistance('element names', 'elementnumber'));
console.log('here dist names elementname ' + ds.jaroWinklerDistance('element names', 'elementname'));

console.log('here sap.cu.sd.lib.processflow ' + ds.jaroWinklerDistance('sap.cu.sd.lib.processflow', 'sap.cus.sd.lib.processflow'));


console.log('here dist namess number ' + ds.jaroWinklerDistance('element namess', 'element number'));
console.log('here dist namess name ' + ds.jaroWinklerDistance('element namess', 'element name'));
console.log('here dist cusmos cosmos r ' + ds.jaroWinklerDistance('cusmos', 'cosmos'));
console.log('here dist cusmos cosmos r ' + ds.jaroWinklerDistance('cosmos', 'cosmus'));
console.log('here dist namess name ' + ds.jaroWinklerDistance('element namess', 'element name'));

console.log('saniation facilities ' + ds.jaroWinklerDistance('saniation facilities', 'sanitation facilities'));
console.log('here dist cusmos cosmos r ' + ds.jaroWinklerDistance('cusmos', 'cosmos'));
console.log('here dist cusmos cosmos r ' + ds.jaroWinklerDistance('cosmos', 'cosmus'));
console.log('here dist namess name ' + ds.jaroWinklerDistance('element namess', 'element name'));



console.log('here dist names number ' + ds.jaroDistance('element names', 'element number'));
console.log('here dist names name ' + ds.jaroDistance('element names', 'element name'));
console.log('here dist names elementnumber ' + ds.jaroDistance('element names', 'elementnumber'));

t = Date.now();
for( i = 0; i < strings.length; ++i) {
  lower = Math.max(0,i- delta);
  higher = Math.min(strings.length, i + delta);
  a = strings[i];
  for( k = lower; k < higher; ++k) {
    if(k != i) {
      ds.jaroWinkler(a,strings[k]);
    }
  }
}
console.log('talisman_jaroWinkler: '  + (Date.now()- t));

t = Date.now();
for( i = 0; i < strings.length; ++i) {
  lower = Math.max(0,i- delta);
  higher = Math.min(strings.length, i + delta);
  a = strings[i];
  for( k = lower; k < higher; ++k) {
    if(k != i) {
      ds.jaroDistance(a,strings[k]);
    }
  }
}
console.log('natural_jaro: '  + (Date.now()- t));


t = Date.now();
for( i = 0; i < strings.length; ++i) {
  lower = Math.max(0,i- delta);
  higher = Math.min(strings.length, i + delta);
  a = strings[i];
  for( k = lower; k < higher; ++k) {
    if(k != i) {
      ds.jaroWinklerDistance(a,strings[k]);
    }
  }
}
console.log('natural_jaroWinkler: '  + (Date.now()- t));

//jaro_winkler_adj;

//talisman_jaro;

//jaroWinkler;


function normLeven(a,b) { return 1 - ds.levenshtein(a,b)/Math.max(a.length, b.length); }

delta = 40;

var res = [];

for(var ix = 0; ix < strings.length; ++ix) {
  i = ix;
  lower = Math.max(0,i- delta);
  higher = Math.min(strings.length, i + delta);
  a = strings[i];
  for( k = lower; k < higher; ++k) {
    if(k != i) {
      var b = strings[k];
      res.push( {
        a : a,
        b : strings[k],
        dl : normLeven(a,b),
        jaroW : ds.jaroWinkler(a,b),
        jaro : ds.talisman_jaro(a,b),
        jaro2 : ds.jaroDistance(a,b),
        jaroW2 : ds.jaroWinklerDistance(a,b)
      });
    }
  }
}

res.sort(function(a,b) {
  return - (a.jaroW2 - b.jaroW2);
});

var s = '';
res.forEach(function(r, index) {
  s += '\n\na=' + r.a + '\n';
  s += 'b=' + r.b + '\n';
  s += '\ndl=' + r.dl.toFixed(3);
  s += '\nja=' + r.jaro.toFixed(3);
  s += '\njw=' + r.jaroW.toFixed(3);
  s += '\nj2=' + r.jaro2.toFixed(3);
  s += '\njW=' + r.jaroW2.toFixed(3);
});
var fs = require('fs');
fs.writeFileSync('comparets.txt',s);




