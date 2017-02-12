/**
 * @file
 * @module toolmatcher.nunit
 * @copyright (c) 2016 Gerd Forstmann
 */

var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

//var debuglog = require('debug')('listall.nunit');

const ListAll = require(root + '/match/listall.js');
const WhatIs = require(root + '/match/whatis');
const InputFilterRules = require(root + '/match/inputFilterRules.js');


const Model = require(root + '/model/model.js');
const theModel = Model.loadModels();


const mRules = InputFilterRules.getMRulesSample();

/*
export function resolveCategory(category: string, sString: string,
  aRules: Array<IMatch.mRule>, aTools: Array<IMatch.ITool>, records: Array<IMatch.IRecord>): Array<IMatch.IWhatIsAnswer> {
  if (sString.length === 0) {
    return [];
  } else {
*/

var records = [
  {
    'unit test': 'NavTargetResolution',
    'url': 'com.sap.NTA'
  },
  {
    'unit test': 'CrossApplcationNavigation',
    'url': 'com.sap.NTA'
  },
  {
    'unit test': 'ShellNavigation',
    'url': 'com.sap.SNav'
  }
];

//WhatIs.resetCache();

exports.testListAllWithContext = function (test) {
  WhatIs.resetCache();
  var res = ListAll.listAllWithContext('url', 'unit test NavTargetResolution',
    mRules, records);

  test.deepEqual(ListAll.formatDistinctFromWhatIfResult([]), '');
  var res3 = ListAll.joinResults(res);
  test.deepEqual(res3, ['com.sap.NTA' ]);

  var res2 = ListAll.formatDistinctFromWhatIfResult(res);

  test.deepEqual(res2, '"com.sap.NTA"');
  test.done();
};

exports.testJoinResultsTupel = function (test) {

  var result = [{'sentence':[{'string':'mercury','matchedString':'mercury','category':'element name','_ranking':0.95}],
    'record':{'element name':'mercury','element symbol':'Hg','element number':'80','atomic weight':'200.592(3)',
      'tool':'NoTool','_domain':'IUPAC'},
    'categories':['element name','atomic weight'],'result':['mercury','200.592(3)'],'_ranking':1.5}];

  var res = ListAll.joinResultsTupel(result);

  test.deepEqual(res, ['"mercury" and "200.592(3)"']);
  test.done();
};


exports.testListAllWithContextEmpty = function (test) {
  var res = ListAll.listAllWithContext('url', '',
    mRules, records);
  test.deepEqual(res,[]);
  test.done();
};

exports.testListAllHavingContext = function (test) {
  WhatIs.resetCache();
  var res = ListAll.listAllHavingContext('url', 'unit test',
    mRules, records);
  var res2 = ListAll.formatDistinctFromWhatIfResult(res.answers);

  test.deepEqual(res2, ''); // '"com.sap.NTA"; "com.sap.SNav"');
  test.done();
};


exports.testListAllHavingContextEmpty = function (test) {
  var res = ListAll.listAllHavingContext('url', '', mRules, records);
  var res2 = ListAll.formatDistinctFromWhatIfResult(res.answers);
  test.deepEqual(res2, '');
  test.done();
};


exports.testListAllWithCategory = function (test) {

  var res = ListAll.listAllWithCategory('unit test',
     records);
  var res2 = ListAll.joinDistinct('unit test', res);
  test.deepEqual(res2, '"CrossApplcationNavigation"; "NavTargetResolution"; "ShellNavigation"');
  test.done();
};



exports.testinferDomain = function (test) {
  var domain = ListAll.inferDomain(theModel, 'domain FioriFLP');
  test.equal(domain, 'FioriFLP', ' correct domain inferred');
  test.done();
};


exports.testinferDomainUndef = function (test) {
  var domain = ListAll.inferDomain(theModel, 'cannot be analyzed');
  test.equal(domain, undefined, ' correct undefined inferred');
  test.done();
};



exports.testinferDomain2 = function (test) {
  var domain = ListAll.inferDomain(theModel, 'domain related to wiki');
  test.equal(domain, 'wiki', ' correct domain inferred');
  test.done();
};


exports.testinferDomainTwoDomains = function (test) {
  var domain = ListAll.inferDomain(theModel, 'domain FioriFLP domain wiki');
  test.equal(domain, undefined, ' correct domain inferred');
  test.done();
};

exports.testinferDomainDomainByCategory = function (test) {
  var domain = ListAll.inferDomain(theModel, 'element symbol');

  test.equal(domain, 'IUPAC', ' correct domain inferred');
  test.done();
};

exports.testinferDomainDomainByCategoryAmbiguous = function (test) {
  var domain = '';
  try {
    domain = ListAll.inferDomain(theModel, 'element name');
    test.equal(true,true);
  } catch(e) {
    test.equal(false,true);
    //empty
  }
  test.equal(domain, undefined, ' correct domain inferred');
  test.done();
};

exports.testinferDomainTwoDomainsByCategory = function (test) {
  var domain = ListAll.inferDomain(theModel, 'element name country');
  //console.log('here domain: ' + domain);
  test.equal(domain, undefined, ' correct domain inferred');
  test.done();
};

exports.testListAllFilterStringList = function (test) {
  var res = ListAll.filterStringListByOp({
    operator: 'contains'
  }, 'abc',  [ '', 'abc', 'def abc hij', 'soabc', 'sonothing', 'abbutnotc']);
  test.deepEqual(res, [ 'abc' , 'def abc hij', 'soabc']);
  test.done();
};


exports.testListAllRemoveCaseDuplicates = function (test) {
  var res = ListAll.removeCaseDuplicates(['abC', 'abc', 'Abc', 'ABC', 'abcD', 'ABCD', 'AB', 'a']);
  test.deepEqual(res, ['a', 'AB', 'ABC', 'ABCD']);
  test.done();
};

exports.testlikelyPluralDiff = function (test) {
  test.equal(ListAll.likelyPluralDiff('element name', 'element names' ), true);
  test.equal(ListAll.likelyPluralDiff('element name', '"element names"' ), true);
  test.equal(ListAll.likelyPluralDiff('element name', '"element nam"' ), false);
  test.equal(ListAll.likelyPluralDiff('element names', '"element name"' ), false);
  test.done();
};

exports.testListAllFilterStringList = function (test) {
  var res = ListAll.getCategoryOpFilterAsDistinctStrings( {
    operator : 'starting with'
  }, 'aBc' , 'cat1',    [
    { 'cat1' : 'abCAndMore'},
    { 'cat1' : 'abCAndSomeMore'},
    { 'cat1' : 'abcAndsomemore'},
    { 'cat1' : 'abCAndAnything'},
     { 'cat1' : 'AbcAndsomemore'},

    { 'cat1' : 'abCAndMore',
      'cat2': 'abcAndMore' },
    { 'cat1' : 'nononAndMore',
      'cat2': 'abcAndMore' },
    { 'cat0' : 'abCAndMore'},
    { 'cat1' : 'abCAndMore'},
  ]);
  test.deepEqual(res, [ 'abCAndAnything' , 'abCAndMore', 'AbcAndsomemore' ]);
  test.done();
};


