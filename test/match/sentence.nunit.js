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
      {'matchedString' : 'start', 'category' : 'filler'},
      {'matchedString' : 'catalog', 'category' : 'category'},
      {'matchedString' : 'ABC', 'category' : 'catalog'},
      {'matchedString' : 'in', 'category' : 'filler'},
      {'matchedString' : 'FLPD', 'category' : 'tool'},
      {'matchedString' : 'in', 'category' : 'filler'},
      {'matchedString' : 'UV2', 'category' : 'systemId'},
      {'matchedString' : 'client', 'category' : 'category'},
      {'matchedString' : '120', 'category' : 'client'}
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



exports.testGetDistinctCategoriesInSentence = function (test) {
  // prepare
  // act
  const res = sentence.getDistinctCategoriesInSentence([
      {'matchedString' : 'start', 'category' : 'filler'},
      {'matchedString' : 'catalog', 'category' : 'category'},
      {'matchedString' : 'ABC', 'category' : 'catalog'},
      {'matchedString' : 'in', 'category' : 'filler'},
      {'matchedString' : 'FLPD', 'category' : 'category'},
      {'matchedString' : 'in', 'category' : 'filler'},
      {'matchedString' : 'catalog', 'category' : 'category'},
      {'matchedString' : 'client', 'category' : 'category'},
      {'matchedString' : '120', 'category' : 'client'}
  ]);
  // check
  test.deepEqual(res, ['catalog', 'FLPD', 'client']);
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


exports.testRankingGeometricMean = function(test) {
  test.equal(sentence.rankingGeometricMean( [{_ranking : 1 }, { _ranking : 1}] ), 1, 'correct 1');
  test.equal(sentence.rankingGeometricMean( [{_ranking : 0.5 }, { _ranking : 0.5}] ), 0.5, 'correct 2');
  test.equal(sentence.rankingGeometricMean( [] ), 1, 'correct 2');
  test.equal(sentence.rankingGeometricMean( [{_ranking : 0.8 }] ), 0.8, 'correct 3');
  test.equal(sentence.rankingGeometricMean( [{_ranking : 0.5 }, { _ranking : 1.0}] ), Math.pow(0.5,0.5), 'correct 5');

  test.done();
};

exports.testCmpRanking = function(test) {
  test.ok(sentence.cmpRankingProduct([{ _ranking : 0.5},{ _ranking : 0.5 }] , [ { _ranking : 0.4}]) < 0, ' 2nd is weaker');
  test.done();
};
