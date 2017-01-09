var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../gen_cov' : '../gen';
//var debuglog = require('debug')('plainRecoginizer.nunit');

var debug = require('debug');
const debuglog = debug('smartdialog.nunit');


var logger = require(root + '/utils/logger');
const botdialog = require(root + '/bot/smartdialog.js');

var HTMLConnector = require(root + '/ui/htmlconnector.js');


// Create bot and bind to console
function getBotInstance() {
  var connector = new HTMLConnector.HTMLConnector();
  botdialog.makeBot(connector);
  return connector;
}

var conn = getBotInstance();

function testOne(str,cb) {
  conn.setAnswerHook(cb);
  conn.processMessage(str, 'unittest');
}

//SimpleUpDownRecognizer


var logPerf = logger.perf('listall');
//var perflog = debug('perf');

function test1(cb) {
  logPerf('testPerflistAll1');
  testOne('list all AppNames in FIN-GL Account Manage fiori intent MM-PUR Work Center WBS Elements Planning',function(oRes) {
   // var sRes = oRes;
    logPerf('testPerflistAll1');
    console.log('done first');
    if(cb) {
      cb();
    }
  });
}


function test2(cb) {
  logPerf('testPerfListAll');
  //var u = 'list all AppNames in FIN-GL Account Manage fiori intent MM-PUR Work Center WBS Elements Planning related to unit test';
  testOne('list all AppNames in FIN-GL Account Manage fiori intent related to unit test',function(oRes) {
  //  var sRes = oRes;
    logPerf('testPerfListAll');
    console.log('done 2nd');
    if(cb) {
      cb();
    }
  });
}

if (process.env.ABOT_FOREVER) {
  var i = 0;
  for(i = 0; i < 3; ++i) {
    test1();
    test2();
  }
} else {
  test1(function() {
    test2(function() {
      return;
      test2(function() {
        test2(function() {
        });
      });
    });
  });
}

