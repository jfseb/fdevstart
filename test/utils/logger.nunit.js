/*! copyright gerd forstmann, all rights reserved */

var debuglog = require('debug')('logger.nunit');

var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

var Logger = require(root + '/utils/logger.js');


exports.testPerf = function (test) {
  var perf = Logger.perf('ABC');
  perf('abc');
  perf('abc');

  test.equal(typeof perf, 'function');
  test.done();
};
/**
 * Unit test for sth
 */

exports.testCTor = function (test) {
  test.expect(8);
  try {
    Logger.logger('$');
    test.ok(false,true);
  } catch (e) {
    test.ok(true,true);
  }
  try {
    Logger.logger('aBC$');
    test.ok(false,true);
  } catch (e) {
    test.ok(true,true);
  }
  try {
    Logger.logger('0aBCD');
    test.ok(false,true);
  } catch (e) {
    test.ok(true,true);
  }

  try {
    // illegal argument
    Logger.logger('ABCDEF','w');
    test.ok(false,true,'wrong flag');
  } catch (e) {
    test.ok(true,true);
  }


  try {
    Logger.logger('AaBCD.def');
    test.ok(false,true);
  } catch (e) {
    test.ok(true,true);
  }
  var log = Logger.logger('AB');

  try {
    Logger.logger('AB','');
    test.ok(false,true, 'differnt flag on 2nd invocation');
  } catch (e) {
    test.ok(true,true);
  }
  Logger.logger('aBC');

  try {
    log(undefined);
    test.ok(false,true);
  } catch (e) {
    test.ok(true,true);
  }

  Logger.logger('ABC_abc0234');
  test.ok(true,true);
  test.done();
};


exports.testSameInstanceHandedOut = function (test) {
  test.expect(2);
  var res = Logger.logger('AB');
  var res2 = Logger.logger('aBC');
  var res3 = Logger.logger('AB');
  test.equal(res, res3);
  test.equal(res === res2, false);
  test.done();
};


var fs = require('fs');

exports.testLogOpenOverwrite = function (test) {
  test.expect(2);
  var filef = Logger._test.getFileName('TEST_OV');
  try {
    fs.unlinkSync(filef);
  } catch (e) {
    /* empty */
    // emtpy
    // debug("could not remove file");
  }
  var log1 = Logger.logger('TEST_OV','');
  log1('my entry');
  var res = ' ' + fs.readFileSync(filef);
  test.equal(res.indexOf('my entry') > 0 , true);
  test.ok(true,true);
  test.done();
};


exports.testLogOpenAppend = function (test) {
  test.expect(4);
  var filef = Logger._test.getFileName('TEST_AB');
  try {
    fs.unlinkSync(filef);
  } catch (e) {
    /* empty */
    // emtpy
    // debug("could not remove file");
  }
  fs.writeFileSync(filef,'already in log');
  var log1 = Logger.logger('TEST_AB','a');
  log1('my entry 1');
  var log2 = Logger.logger('TEST_AB','a');
  log1('my entry 2');
  log2('my entry 3');
  var res = ' ' + fs.readFileSync(filef);
  test.equal(res.indexOf('my entry 1') > 0 , true);
  test.equal(res.indexOf('my entry 2') > 0 , true);
  test.equal(res.indexOf('my entry 3') > 0 , true);
  test.equal(res.indexOf('already in log') > 0 , true);
  test.done();
};


exports.testLogException = function (test) {
  test.expect(2);
  var filef = Logger._test.getFileName('TEST_AC');
  try {
    fs.unlinkSync(filef);
  } catch (e) {
    /* empty */
    // emtpy
    // debug("could not remove file");
  }
  var log1 = Logger.logger('TEST_AC','');
  var stack = '';
  try {
    throw new Error('wow i crashed');
  } catch (e) {
    log1(e);
    stack = e.stack;
    debuglog('here a stack' + stack.toString());
  }
  var res = ' ' + fs.readFileSync(filef);
  test.equal(res.indexOf('wow i crashed') >= 0, true, 'message') ;
  test.equal(res.indexOf(stack.toString()) >= 0, true, 'message') ;
  test.done();
};


exports.testLogPerf = function (test) {
  test.expect(18);

  var sS = undefined;
  var sU = undefined;
  var sK = undefined;
  var cS = 0;
  var cU = 0;
  var cK = 0;
  var FakeCons = {
    log : function(s) { ++cS; sS = s;},
    time : function(u) { ++cU; sU = u; },
    timeEnd : function(k) { ++cK; sK= k;}
  };

  var logger = Logger.logPerf.bind({ enabled : true , first : 0, on : {}, name: 'thename'}, FakeCons);
  logger('here');
  test.equal(cS, 1 , 'cS');
  test.equal(sS, 'Perfthename',  'firt run hename present');
  test.equal(cK, 0 , 'cK');
  test.equal(sK, undefined, 'sK');
  test.equal(cU, 1 , 'cK');
  test.equal(sU, 'here', 'sU');


  logger('here');

  test.equal(cS, 3 , 'cS');
  test.equal(sS.indexOf('Perfthename delta:'),0,  'perfthename present');
  test.equal(cK, 1 , 'cK');
  test.equal(sK, 'here', 'sK');
  test.equal(cU, 1 , 'cU');
  test.equal(sU, 'here', 'sU');

  logger('here');

  test.equal(cS, 5, 'cS');
  test.equal(sS.indexOf('Perfthename delta:'),0,  'perfthename present');
  test.equal(cK, 1 , 'cK');
  test.equal(sK, 'here', 'sK');
  test.equal(cU, 2 , 'cU');
  test.equal(sU, 'here', 'sU');

  test.done();
};


