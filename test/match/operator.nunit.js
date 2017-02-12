/**
 * @file
 * @module word.nunit
 * @copyright (c) 2016 Gerd Forstmann
 */

var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

//var debuglog = require('debug')('word.nunit');

const Operator = require(root + '/match/operator.js');
//const Category = OpsWord.Category;

exports.testMatches= function (test) {
  // prepare
  // act
  // check
  [{
    operator : { operator : 'containing'},
    fragment : 'abc',
    str : 'xabcy',
    expectedResult: true
  },
  {
    operator : { operator : 'ending with'},
    fragment : 'abc',
    str : 'xyzabc',
    expectedResult: true
  },
  {
    operator : { operator : 'ending with'},
    fragment : 'abc',
    str : 'xyzabcz',
    expectedResult: false
  },
  {
    operator : { operator : 'ending with'},
    fragment : 'abc',
    str : 'xyzabczdefabc',
    expectedResult: true
  },
  {
    operator : { operator : 'starting with'},
    fragment : 'abc',
    str : 'aBcz',
    expectedResult: false
  },
  {
    operator : { operator : 'starting with'},
    fragment : 'abc',
    str : 'xabc',
    expectedResult: false
  },
  {
    operator : { operator : 'starting with'},
    fragment : 'abc',
    str : 'abcz',
    expectedResult: true
  },
  {
    operator : { operator : 'starting with'},
    fragment : 'abc',
    str : 'abc',
    expectedResult: true
  },
  {
    operator : { operator : 'starting with'},
    fragment : 'abc',
    str : '',
    expectedResult: false
  }
  ].forEach(function(oFixture) {
    test.deepEqual(Operator.matches(
      oFixture.operator,
      oFixture.fragment,
    oFixture.str),
    oFixture.expectedResult, ' correct result  for ' + JSON.stringify(oFixture));
  });
  test.done();
};


exports.testMatchesError = function (test) {
  test.expect(1);
  try {
    Operator.matches(
      'not an operator',
      'abc',
      'def');
    test.equal(1,0);
  } catch(e) {
    test.equal(1,1);
  }
  test.done();
};


