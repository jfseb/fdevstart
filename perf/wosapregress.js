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
var fnin = getArg('i') || 'input';

var dataS = fs.readFileSync(fnin);
var data = JSON.parse(dataS);

//var dataExpS = fs.readFileSync('./regress/' + fnin + '.expect.json');
//var dataExp = JSON.parse(dataExpS);

//var logger = require(root + '/utils/logger');
const botdialog = require(root + '/bot/smartdialog.js');
var HTMLConnector = require(root + '/ui/htmlconnector.js');

var modelpath = 'sensitive';

// Create bot and bind to console
function getBotInstance() {
  var botversion = 0;

  // increase the generation
  try {
    var a = fs.readFileSync('./regress/botversion');
    botversion = parseInt(a);
    if(!botversion) {
      throw new Error('unkonwn botversion');
    }
    botversion = botversion + 1;
    fs.writeFileSync('./regress/botversion', '' + botversion);
  } catch(e) {
    console.log('could not get botversion' + e);
    process.exit(-1);
  }

  var options = {
    bot : 'regress_' + botversion
  };
  var connector = new HTMLConnector.HTMLConnector(options);
  botdialog.makeBot(connector,modelpath);
  return connector;
}

var conn = getBotInstance();

function testOne(str,cb) {
  conn.setAnswerHook(cb);
  conn.processMessage(str,  { id : 'regress_' + modelpath, user : 'regress_' + modelpath, 'conversationId' : modelpath });
}

//SimpleUpDownRecognizer

//var perflog = debug('perf');

/*
function doOne(str,cb) {
  logPerf('testPerflistAll1');
  testOne('list all AppNames in FIN-GL Account Manage fiori intent MM-PUR Work Center WBS Elements Planning',function(oRes) {
   // var sRes = oRes;
    logPerf('testPerflistAll1');
    console.log('done first');
    if(cb) {
      cb(undefined, oRes);
    }
  });
}*/

function hasFlag(sFlag) {
  return process.argv.filter(function(sArg) {
    return sArg === '-' + sFlag;
  }).length > 0;
}

var dt = new Date().toISOString();
var run = dt.replace(/[:.-]/g,'_');

function runNext(context, i, fnRunOne,  cb) {
  console.log('here i' + i);
  if ( i >= context.maxI) {
    if(cb) {
      cb(undefined);
    }
    return;
  }
  fnRunOne(context, i, runNext.bind(undefined , context, i+1, fnRunOne, cb));
}

function getContext() {
  var context = {
    maxI : data.length,
    input : data,
    ok : 0,
    bad : 0,
    diffs : [],
    actual : [],
    runtimes :[]
  };
  return context;
}

function runOne(context, i, cb ) {
  var input =  context.input[i];
  var expected =  '';
  var start = Date.now();
  testOne(input, function(oRes) {
    var sRes = oRes;
    var end = Date.now();
    console.log(i + ' ' + sRes);
    context.actual[i] = sRes;
    context.runtimes[i] = end - start;
    if (oRes === expected) {
      context.ok += 1;
      console.log('ok\n');
    } else {
    /*  context.bad += 1;
      var s = '['+ i +'] input : "' + input + '"\n'
       +    '['+ i +'] expect: "' + oRes.replace(/[\n]/g,'\\n') + '"\n'
     +    '['+ i +'] actual: \"' + oRes.replace(/[\n]/g,'\\n') + '"\n';
      var k = 0;
      for(k = 0; k < oRes.length && k < expected.length && oRes.charAt[k] === expected.charAt[k]; ++k) {
        / * empty * /
      }
      console.log(s);
      console.log('diff at ' + k + '\n...>' + oRes.substring(Math.max(k-2, 0)) + '\n...>' +
      expected.substring(Math.max(k-2, 0)) + '\n');
      context.diffs.push(s);
      */
    }
    cb();
  });
}

function outFile(s) {
  return './regress/runs/' + run + '_' + s ;
}



if(hasFlag('p')) {
  run = 'p' + run;
  // performance run;
  console.log('not implemented');
} else {
  var context = getContext();
  runNext(context, 0 , runOne , function() {
    var rtfull = context.runtimes.reduce(function(prev,curr) {
      return prev + curr;
    },0);
    var rtavg = rtfull / context.input.length;
    var summary = 'run: ' + run + '\t' + 'size: ' + context.input.length + '\tok: ' + context.ok + '/' + context.bad + '\t'
     + 'avg:' + (rtavg/1000).toFixed(2)  + 's  total:' +  (rtfull/1000).toFixed(2) + 's' + '\t' + fnin + '\n';
    console.log(summary);
    fs.appendFile('./regress/runs/r_userinput_all.txt',
     fnin + '\t' + context.runtimes.map(function(rt) {
       return String('        ' + rt).slice(-7); }).join('\t') + '\n',
     function() {});
  });
}

