/**
 * @file
 * @module match.nunit
 * @copyright (c) 2016 Gerd Forstmann
 */

var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

//var debuglog = require('debug')('word.nunit');

const match= require(root + '/match/match.js');
const ToolMatch = match.ToolMatch;
//const Category = OpsWord.Category;

var oMatch1 = {
  toolmatchresult : { spurious : {}, missing : {},
    required : { 'a' : 1, 'b' : 2},
    optional :{ 'b' : 2}
  }
};
var oMatch2 = {
  toolmatchresult : { spurious : {}, missing : {'A' : 1},
    required : { 'a' :1, 'b' : 2},
    optional : {}
  }
};
exports.testMatchCompare= function (test) {
  // prepare

  // act
  // check
  test.deepEqual(ToolMatch.compBetterMatch(oMatch1, oMatch2), -103, 'delta');
  test.done();
};

exports.testRankResult = function (test) {
  // prepare

  // act
  // check
  test.deepEqual(ToolMatch.rankResult(oMatch1.toolmatchresult), 300,'correct rank');
  test.done();
};

exports.testMatchIsAny = function (test) {
  // prepare

  // act
  // check
  test.deepEqual(ToolMatch.isAnyMatch(oMatch1), true, 'anyMatch');
  test.done();
};

exports.testMatchIsComplete = function (test) {
  // prepare

  // act
  // check

  test.deepEqual(ToolMatch.isComplete(oMatch1), true, ' complete');
  test.deepEqual(ToolMatch.isComplete(oMatch2), false, 'complete');
  test.done();
};
