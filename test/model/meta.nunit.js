/*! copyright gerd forstmann, all rights reserved */
//var debug = require('debug')('appdata.nunit');
var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

var Meta = require(root + '/model/meta.js');



/**
 * Unit test for sth
 */
exports.testAMetaBad = function (test) {
  try {
    new Meta.AMeta('junk','junk');
    test.equal(true,false, 'everything ok');
  } catch(e) {
    test.deepEqual(e.toString().indexOf('junk') >= 0, true, 'bad type not listed');
  }
  test.done();
};


/**
 * Unit test for sth
 */
exports.testAMeta = function (test) {

  test.deepEqual(new Meta.AMeta('category', 'unit test').toFullString(), 'category -:- unit test', 'proper full string');
  test.deepEqual(new Meta.AMeta('relation', 'abc').toName(), 'abc', 'proper base string');
  test.done();
};

/**
 * Unit test for sth
 */
exports.testMetaFactory = function (test) {
  test.deepEqual(Meta.getMetaFactory().Domain('abc').toFullString(), 'domain -:- abc', 'proper full string');
  test.deepEqual(Meta.getMetaFactory().Category('abc').toFullString(), 'category -:- abc', 'proper full string');
  test.deepEqual(Meta.getMetaFactory().Relation('abc').toFullString(), 'relation -:- abc', 'proper full string');
  test.done();
};


/**
 * Unit test for sth
 */
exports.testgetMetaFactory_parseIMeta = function (test) {
  test.deepEqual(Meta.getMetaFactory().parseIMeta('category -:- def').toFullString(), 'category -:- def', 'proper full string');
  test.deepEqual(Meta.getMetaFactory().parseIMeta('relation -:- def').toFullString(), 'relation -:- def', 'proper full string');
  test.deepEqual(Meta.getMetaFactory().parseIMeta('domain -:- def').toFullString(), 'domain -:- def', 'proper full string');
  try {
    Meta.getMetaFactory().parseIMeta('catego def');
    test.equal(true,false, 'everything ok');
  } catch(e) {
    test.deepEqual(e.toString().indexOf('catego def') >= 0, true, 'bad type not listed');
  }
  try {
    Meta.getMetaFactory().parseIMeta('catego -:- def');
    test.equal(true,false, 'everything ok');
  } catch(e) {
    test.deepEqual(e.toString().indexOf('catego') >= 0, true, 'bad type not listed');
  }
  test.done();
};



exports.testGetStringArray = function (test) {
  test.deepEqual(Meta.getStringArray([
    Meta.getMetaFactory().Domain('abc'),
    Meta.getMetaFactory().Relation('def'),
    Meta.getMetaFactory().Category('abc')
  ]), ['abc', 'def', 'abc'], 'correct result');
  test.done();
};
