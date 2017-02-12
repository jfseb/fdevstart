/**
 * @file ererror.nunit
 * @copyright (c) 2016-2016 Gerd Forstmann
 */


/* eslxxint-disable */

var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

//var debuglog = require('debug')('erbase.nunit');

const ERError = require(root + '/match/ererror.js');

exports.testErrorNoWord = function(test) {
  var tokens = ['What', 'is', 'Abc' , 'def' ];
  var res = ERError.makeError_NO_KNOWN_WORD(2, tokens);
  test.deepEqual(res,
    {
      err_code : 'NO_KNOWN_WORD',
      text : 'I do not understand "Abc".',
      context : {
        tokens : tokens,
        token : 'Abc',
        index : 2
      }
    }, 'correct moved and cleansed res');
  test.done();
};

exports.testErrorNoWordThrow = function(test) {
  var tokens = ['What' ];
  try {
    ERError.makeError_NO_KNOWN_WORD(2, tokens);
    test.equal(1,0);
  } catch(e) {
    test.equal(1,1);
  }
  test.done();
};

exports.testErrorEmptyString = function(test) {
  var res = ERError.makeError_EMPTY_INPUT();
  test.deepEqual(res,
    {
      err_code : 'EMPTY_INPUT',
      text : 'I did not get an input.'
    }, 'correct moved and cleansed res');
  test.done();
};


exports.testExplainErrorEmpty = function(test) {
  var empty = ERError.makeError_EMPTY_INPUT();
  var res = ERError.explainError([empty]);
  test.deepEqual(res, '\nMy input was empty.');
  test.done();
};

exports.testExplainErrorEmpty = function(test) {
  var err = ERError.makeError_NO_KNOWN_WORD(1, ['so', 'nicht']);
  var res = ERError.explainError([err]);
  test.deepEqual(res, '\nI do not understand "nicht".');
  test.done();
};

