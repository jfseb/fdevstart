var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';
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

function doRecognize( sText, cb) {
  debuglog('type ' + typeof botdialog.SimpleUpDownRecognizer);
  var recognizer = new (botdialog.SimpleUpDownRecognizer)();
  recognizer.recognize({
    message : {
      text : sText
    }
  }, cb);
}

exports.testUpDownRecognizerQuit2 =  function (test) {
  doRecognize('quit', function(err, res) {
    test.deepEqual(res.intent,  'intent.up');
    test.done();
  });
};

exports.testUpDownRecognizerUp = function (test) {
  doRecognize('up', function(err, res) {
    test.deepEqual(res.intent,  'intent.up');
    test.done();
  });
};


exports.testUpDownRecognizerUp = function (test) {
  doRecognize('down', function(err, res) {
    test.deepEqual(res.intent,  'intent.down');
    test.done();
  });
};
exports.testUpDownRecognizerDone = function (test) {
  doRecognize('done', function(err, res) {
    test.deepEqual(res.intent,  'intent.up');
    test.done();
  });
};

exports.testUpDownRecognizerExit = function (test) {
  doRecognize('exit', function(err, res) {
    test.deepEqual(res.intent,  'intent.up');
    test.done();
  });
};

exports.testUpDownRecognizer2 = function (test) {
  doRecognize('donenothing', function(err, res) {
    test.deepEqual(res.intent,  'nothing');
    test.done();
  });
};

exports.testUpDownRecognizer2 = function (test) {
  doRecognize('exit', function(err, res) {
    test.deepEqual(res.intent,  'intent.up');
    test.done();
  });
};


/* TODO!

exports.testShowMe1 = function (test) {
  var cnt = 0;
  testOne('start SU01 in',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    cnt = cnt + 1;
    test.deepEqual((cnt === 1) && (sRes.indexOf('Not enough') < 0), false);
    test.deepEqual((cnt === 2) && (sRes.indexOf('Please provide') < 0), false, 'first call');
    if(cnt === 2) {
      testOne('UV2', function(oRes) {
        debuglog(JSON.stringify(oRes));
        testOne('120', function(oRes) {
          debuglog(JSON.stringify(oRes));
          test.done();
        });
      });
    }
  });
};
*/

exports.testShowMe2 = function (test) {
  testOne('start SU01 in UV2 client 120',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes.indexOf('120') >= 0, false, 'wiki present');
    test.done();
  });
};



exports.testShowMe2 = function (test) {
  testOne('What is the element weight for element name silver',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes.indexOf('107.') >= 0, true, 'wiki present');
    test.done();
  });
};


exports.testDomainsListAllIn = function (test) {
  testOne('list all categories in domain IUPAC',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes.indexOf('wiki') >= 0, false, 'wiki present');
    test.deepEqual(sRes.indexOf('element name') >= 0, true, 'wiki present');
    test.done();
  });
};


exports.testDomains = function (test) {
  testOne('list all domains',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes.indexOf('wiki') >= 0, true, 'wiki present');
    test.deepEqual(sRes.indexOf('FioriFLP') >= 0, true, 'wiki present');
    test.done();
  });
};


exports.testSuggest = function (test) {
  testOne('help me',function(oRes) {
    //var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.done();
  });
};


exports.testListWithContextDontKnow = function (test) {
  testOne('list abcnames for silver',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes.indexOf('know anything about \"abcnames\"') >= 0, true, 'not found');
    test.done();
  });
};

exports.testListWithContextKnow = function (test) {
  testOne('list all element name for silver',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes.indexOf('silver') >= 0, true, 'silver present');
    test.done();
  });
};


exports.testEliza = function (test) {
  testOne('i am sad',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes.indexOf('sad') >= 0, true, 'sad present');
    test.done();
  });
};

exports.testTrain = function (test) {
  testOne('i am sad',function(oRes) {
    testOne('Wrong', function(oRes){
      testOne('down', function(oRes){
        testOne('What is this', function(oRes){
          testOne('done', function(oRes){
            testOne('done', function(oRes){
              testOne('list all domains', function(oRes){
                var sRes = oRes;
                debuglog(JSON.stringify(oRes));
                test.deepEqual(sRes.indexOf('wiki') >= 0, true, 'wiki present');
                test.deepEqual(sRes.indexOf('FioriFLP') >= 0, true, 'FioriFLP present');
                test.done();
              });
            });
          });
        });
      });
    });
  });
};




exports.testListAllCategories = function (test) {
  testOne('list all categories',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes.indexOf('wiki') >= 0, true, 'wiki present');
    test.deepEqual(sRes.indexOf('FioriFLP') < 0, true, 'wiki present');
    test.done();
  });
};

exports.testListAllCategoriesInDomain = function (test) {
  testOne('list all categories in domain unit test',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes.indexOf('wiki') < 0, true, 'wiki present');
    test.deepEqual(sRes.indexOf('url') >= 0, true, 'wiki present');
    test.deepEqual(sRes.indexOf('unit test') >= 0, true, 'wiki present');
    test.done();
  });
};

exports.testListAllCategoriesRelatedTo = function (test) {
  testOne('list all categories related to unit test',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes.indexOf('wiki') < 0, true, 'wiki present');
    test.deepEqual(sRes.indexOf('unit test') >= 0, true, 'wiki present');
    test.done();
  });
};

//var debug = require('debug');

var logPerf = logger.perf('perflistall');
//var perflog = debug('perf');


exports.testPerfListAll1 = function (test) {
  logPerf('testPerfListAll1');
  testOne('list all AppNames in FIN-GL Account Manage fiori intent MM-PUR Work Center WBS Elements Planning',function(oRes) {
   // var sRes = oRes;
    logPerf('testPerfListAll1');
    debuglog(JSON.stringify(oRes));
    test.deepEqual(true, true);
    test.done();
  });
};


exports.testPerfListAll2 = function (test) {
  logPerf('testPerfListAll');
 // var u = 'list all AppNames in FIN-GL Account Manage fiori intent MM-PUR Work Center WBS Elements Planning related to unit test';
  testOne('list all AppNames in FIN-GL Account Manage fiori intent related to unit test',function(oRes) {
  //  var sRes = oRes;
    logPerf('testPerfListAll');
    debuglog(JSON.stringify(oRes));
    test.deepEqual(true, true);
    test.done();
  });
};


exports.testUpDownRecognizerUp = function (test) {
  doRecognize('up', function(err, res) {
    test.deepEqual(res.intent,  'intent.up');
    test.done();
  });
};