/**
 * @file
 * @module toolmatcher.nunit
 * @copyright (c) 2016 Gerd Forstmann
 */

var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

var debuglog = require('debug')('sentence.nunit');

const sentence = require(root + '/match/sentence.js');

debuglog(' here sentence ' + JSON.stringify(sentence));

const oSentence = [
      {'matchedWord' : 'start', 'category' : 'filler'},
      {'matchedWord' : 'catalog', 'category' : 'category'},
      {'matchedWord' : 'ABC', 'category' : 'catalog'},
      {'matchedWord' : 'in', 'category' : 'filler'},
      {'matchedWord' : 'FLPD', 'category' : 'tool'},
      {'matchedWord' : 'in', 'category' : 'filler'},
      {'matchedWord' : 'UV2', 'category' : 'systemId'},
      {'matchedWord' : 'client', 'category' : 'category'},
      {'matchedWord' : '120', 'category' : 'client'}
];

exports.testFindWordByCategory = function (test) {
  // prepare
  // act
  const res = sentence.findWordByCategory(oSentence, 'catalog');
  // check
  test.deepEqual(res, { word : oSentence[2], index : 2}, 'correct result');
  test.equal(res.word, oSentence[2], 'correct result');
  test.done();
};

exports.testFindWordByCategoryNotFound = function (test) {
  // prepare
  // act
  const res = sentence.findWordByCategory(oSentence, 'notthese');
  // check
  test.deepEqual(res, {});
  test.done();
};
