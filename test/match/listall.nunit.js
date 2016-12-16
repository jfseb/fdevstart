/**
 * @file
 * @module toolmatcher.nunit
 * @copyright (c) 2016 Gerd Forstmann
 */

var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

//var debuglog = require('debug')('listall.nunit');

const ListAll = require(root + '/match/listall.js');

const InputFilterRules = require(root + '/match/inputFilterRules.js');

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

exports.testListAllWithContext = function (test) {
  var res = ListAll.listAllWithContext('url', 'unit test NavTargetResolution',
    mRules, records);

  test.deepEqual(ListAll.formatDistinctFromWhatIfResult([]), '');
  var res3 = ListAll.joinResults(res);
  test.deepEqual(res3, ['com.sap.NTA' ]);

  var res2 = ListAll.formatDistinctFromWhatIfResult(res);

  test.deepEqual(res2, '"com.sap.NTA"');
  test.done();
};


exports.testListAllHavingContext = function (test) {

  var res = ListAll.listAllHavingContext('url', 'unit test',
    mRules, records);
  var res2 = ListAll.formatDistinctFromWhatIfResult(res);

  test.deepEqual(res2, '"com.sap.NTA"; "com.sap.SNav"');
  test.done();
};



exports.testListAllWithCategory = function (test) {

  var res = ListAll.listAllWithCategory('unit test',
     records);
  var res2 = ListAll.joinDistinct('unit test', res);
  test.deepEqual(res2, '"CrossApplcationNavigation"; "NavTargetResolution"; "ShellNavigation"');
  test.done();
};
