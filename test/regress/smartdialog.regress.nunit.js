var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';
//var debuglog = require('debug')('plainRecoginizer.nunit');
var debug = require('debug');
const debuglog = debug('smartdialog.nunit.regress');

var rootdata = './test/regress/test/';

// run regressions

var fs = require('fs');

function getArg(s) {
  var i = 1;
  debuglog(process.argv.length);
  for(i = 0; i < process.argv.length; i = i + 1) {
    if(process.argv[i] === '-' + s && process.argv[i+1]) {
      return process.argv[i + 1];
    }
  }
  return undefined;
}

var fnin = getArg('i') || 'input';


var dataS = fs.readFileSync( rootdata + fnin + '.json');
var data = JSON.parse(dataS);

var dataExpS = fs.readFileSync(rootdata + fnin + '.expect.json');
var dataExp = JSON.parse(dataExpS);

//var logger = require(root + '/utils/logger');
const botdialog = require(root + '/bot/smartdialog.js');
var HTMLConnector = require(root + '/ui/htmlconnector.js');

// Create bot and bind to console
function getBotInstance() {
  var connector = new HTMLConnector.HTMLConnector();
  botdialog.makeBot(connector, 'testmodel2');
  return connector;
}

var conn = getBotInstance();

function testOne(str,cb) {
  conn.setAnswerHook(cb);
  conn.processMessage(str, 'unittest');
}

//SimpleUpDownRecognizer

//var logPerf = logger.perf('listall');
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

var run = new Date().toISOString().replace(/[:.-]/g,'_');

function runNext(context, i, fnRunOne,  cb) {
  debuglog('here i' + i);
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
    expected : dataExp,
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
  var expected = context.expected[i] || '';
  var start = Date.now();
  testOne(input, function(oRes) {
    var sRes = oRes;
    var end = Date.now();
    debuglog(i + ' ' + sRes);
    context.actual[i] = sRes;
    context.runtimes[i] = end - start;
    if(oRes === expected) {
      context.ok += 1;
      debuglog('ok\n');
    } else {
      context.bad += 1;
      var s = '['+ i +'] input : "' + input + '"\n'
       +    '['+ i +'] expect: "' + oRes.replace(/[\n]/g,'\\n') + '"\n'
     +    '['+ i +'] actual: \"' + oRes.replace(/[\n]/g,'\\n') + '"\n';
      var k = 0;
      for(k = 0; k < oRes.length && k < expected.length && oRes.charAt[k] === expected.charAt[k]; ++k) {
        /* empty */
      }
      debuglog(s);
      debuglog('diff at ' + k + '\n...>' + oRes.substring(Math.max(k-2, 0)) + '\n...>' +
      expected.substring(Math.max(k-2, 0)) + '\n');
      context.diffs.push(s);
    }
    cb();
  });
}

function outFile(s) {
  return  rootdata + 'runs/' + run + '_' + s ;
}


exports.testRegress1 = function(test) {

  var prefix = '';
  if(hasFlag('p')) {
    prefix = 'p';
    run = 'p' + run;
    // performance run;
    console.log('not implemented');
  } else {
    var context = getContext();
    runNext(context, 0 , runOne , function() {
      var rtfull = context.runtimes.reduce(function(prev,curr) {
        return prev + curr;
      }, 0);

      if(!context.diffs.length === 0) {
        console.log(context.diffs.join('\n'));
      }

      test.deepEqual(context.diffs.length,0, 'no diffs');
      context.actual.forEach(function(sActual,iIndex) {
        test.deepEqual(sActual, context.expected[iIndex], iIndex +  ` result differs: question: >${context.input[iIndex]}<`);
      });
      var rtavg = rtfull / context.input.length;
      var summaryCompact = run + '\t' + context.input.length + '\t' + (rtavg/1000).toFixed(2) + '\t' + context.ok + '\t'
      + context.bad + '\t' + fnin + '\n';
      var summary = 'run: ' + run + '\t' + 'size: ' + context.input.length + '\tok: ' + context.ok + '/' + context.bad + '\t'
      + 'avg:' + (rtavg/1000).toFixed(2)  + 's  total:' +  (rtfull/1000).toFixed(2) + 's' + '\t' + fnin + '\n';
      if (process.env.ABOT_WRITE_REGRESS) {
        console.log(summary);
        fs.writeFileSync(outFile('actual.json'), JSON.stringify(context.actual, undefined,2));
        fs.writeFileSync(outFile('diffs.txt'), summary + context.diffs.join('\n'));
        fs.writeFileSync(outFile('rts.txt'), summary + context.runtimes.join('\n'));
        fs.appendFile(rootdata  + 'runs/' + prefix + 'all.txt', summaryCompact, function() {});
        fs.appendFile(rootdata  + 'runs/' + prefix + 'rt_all.txt',
        fnin + '\t' + context.runtimes.map(function(rt) {
          return String('        ' + rt).slice(-7); }).join('\t') + '\n',
        function() {});
      }
      test.done();
    });
  }

};
