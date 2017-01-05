var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';
//var debuglog = require('debug')('plainRecoginizer.nunit');

var debug = require('debug');
const debuglog = debug('smartdialog.nunit');

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
  testOne('list all domains',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes.indexOf('wiki') >= 0, true, 'wiki present');
    test.deepEqual(sRes.indexOf('FioriFLP') >= 0, true, 'wiki present');
    test.done();
  });
};


exports.testListWithContextDontKnow = function (test) {
  testOne('list element names for silver',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes.indexOf('know anything about \"element names\"') >= 0, true, 'not found');
    test.done();
  });
};

exports.testListWithContextDontKnow = function (test) {
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
    test.deepEqual(sRes.indexOf('sad') >= 0, true, 'sad presnet');
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
                test.deepEqual(sRes.indexOf('FioriFLP') >= 0, true, 'wiki present');
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
