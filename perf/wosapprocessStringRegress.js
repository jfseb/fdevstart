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
//var debug = require('debug');
//const debuglog = debug('smartdialog.regress');


// run regressions

var fs = require('fs');

function getArg(s) {
  var i = 1;
  console.log(process.argv.length);
  for(i = 0; i < process.argv.length; i = i + 1) {
    if(process.argv[i] === '-' + s && process.argv[i+1]) {
      return process.argv[i + 1];
    }
  }
  return undefined;
}

//

// -i input
var fnin = getArg('i') || '../wosap_regr/data/input.json';

var dataS = fs.readFileSync(fnin);
var data = JSON.parse(dataS);

var newProcess = !!getArg('N') || false;
console.log('here data ' + data.length);
if(newProcess) {
  console.log('NEW!!!!\n');
}

const Model  = require(root + '/model/model.js');

const WhatIs = require(root + '/match/whatis.js');

const Erbase = require(root + '/match/erbase.js');



var theModelNew = Model.loadModels('sensitive', true);
var  theModel = Model.loadModels('sensitive', false);

var re = /^(list all )|(what is (the )?)/i;

data = data.map(function(s) {
  var m = re.exec(s);
  if(m) {
    return s.substring(m[0].length);
  }
  return s;
});
console.log('here data ' + data.length);
data = data.slice(0, 650 /*200*/);

function calcData(data, fn, rules)
{
  var t = new Date();

  var resOld = data.map(function(message) {
    return fn(message, rules);
  });

  var t2Old = new Date() - t;
  var undefOld  = 0;
  var cntOld = 0;

  resOld.forEach(rec => {
    if(rec === undefined || rec.sentences.length === 0) {
      undefOld += 1;
    } else {
      cntOld += rec.sentences.length;
    }
  });
  return {
    time : t2Old,
    cnt : cntOld,
    cntUndef : undefOld,
    res : resOld
  };
}

var ane = calcData(data,Erbase.processString,theModelNew.rules);
var old = calcData(data,WhatIs.processString,theModel.rules);

var unknown = {};

function getUnknownWord(error) {
  if(error[0] && (error[0].err_code === 'NO_KNOWN_WORD')) {
    return error[0].context.token;
  }
  return undefined;
}

for(var i = 0; i < old.res.length; ++i) {
  if ((old.res[i].sentences.length > 0) && (ane.res[i].sentences.length === 0)) {
    console.log(`\n${i} : ${data[i]}`);
   // var message = data[i];
    console.log('old: \n' + Erbase.simplifySentence(old.res[i].sentences.slice(0,3)).join('\n'));
    console.log('new: \n' + Erbase.simplifySentence(ane.res[i].sentences.slice(0,3)).join('\n'));
    var u = getUnknownWord(ane.res[i].errors);
    if(u) {
      unknown[u] = { index : i, data : data[i]};
      console.log(`*** unknown word ${u} !\n`);
    } else {
      console.log('new: e\n' + ane.res[i].errors.map(e => JSON.stringify(e)).join('\n'));
    }
  }
}


var eq = 0;
var fulla = '';
var fullb = '';
for( i = 0; i < old.res.length; ++i) {
  if ((old.res[i].sentences.length > 0) && (ane.res[i].sentences.length === 0)) {
    var a = Erbase.simplifySentence(old.res[i].sentences.slice(0,3)).join('\n');
    var b =  Erbase.simplifySentence(ane.res[i].sentences.slice(0,3)).join('\n');
    if(a !== b) {
      eq += 1;
    } else {
      fulla += `\n${i} : ${data[i]} \n` + a;
      fullb += `\n${i} : ${data[i]} \n` + b;
    }
  }
}

fs.writeFileSync('./regress/runs/processOld.txt',fulla);
fs.writeFileSync('./regress/runs/processNew.txt',fullb);
console.log(' ');
var keys = Object.keys(unknown);
keys.sort();
keys.forEach(function(k) {
  console.log(`unknown: ${k} at ${unknown[k].index} in "${unknown[k].data}"`);
});
console.log('found ' + keys.length + ' unknown words\n');

console.log('found ' + eq + 'equal\n');

/*
for(var i = 0; i < Math.min(res.length,5); ++i) {
  console.log(`${i} : ${data[i]} \n`);
  var message = data[i];
  console.log('old: \n' + Erbase.simplifySentence(WhatIs.processString(message,theModel.rules).sentences).join('\n'));
  console.log('new: \n' + Erbase.simplifySentence(Erbase.processString(message,theModelNew.rules).sentences).join('\n'));
}*/


//


var summary = `processing ${data.length} generating ${old.cnt}/${old.cntUndef} took ${(old.time)}  at ${ new Date().toString() }\n`;
summary += `processing ${data.length} generating ${ane.cnt}/${ane.cntUndef} took ${(ane.time)}  at ${ new Date().toString() }\n`;
console.log(summary);


fs.appendFile('./regress/runs/processString',
      summary);

