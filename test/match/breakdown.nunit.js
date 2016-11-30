var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';
var debuglog = require('debug')('breakdown.nunit');

const breakdown = require(root + '/match/breakdown.js');

exports.testcleanse = function (test) {
  const res = breakdown.cleanseString('  system and \n some \t others are ');
  // test.expect(3)
  test.deepEqual(res, 'system and some others are', 'cleansed ok');
  test.done();
};

exports.testBreakdown = function (test) {
  const res = breakdown.breakdownString('system');
  // test.expect(3)
  debuglog(res);
  test.deepEqual(res, [['system']], 'one string');
  test.done();
};

exports.testBreakdown2 = function (test) {
  const res = breakdown.breakdownString('system a b');
  // test.expect(3)
  test.deepEqual(res,
    [['system a b'],
    ['system', 'a b'],
    ['system a', 'b'],
    ['system', 'a', 'b']]
    , 'one string');
  test.done();
};
