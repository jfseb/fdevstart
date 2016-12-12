/**
 * @file
 * @module toolmatcher.nunit
 * @copyright (c) 2016 Gerd Forstmann
 */

var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

var debuglog = require('debug')('analyze.nunit');

const WhatIs = require(root + '/match/whatis.js');


const InputFilterRules = require(root + '/match/inputFilterRules.js');

const mRules = InputFilterRules.getMRulesSample();




exports.testCmbByResult = function (test) {
  var aList = [
    {
      _ranking: 1.0,
      result: 'ABC'
    },
    {
      _ranking: 0.9,
      result: 'ABC'
    },
    {
      _ranking: 1.2,
      result: 'DEF'
    },
    {
      _ranking: 0.3,
      result: 'DEF'
    },
  ];

  var res = aList.sort(WhatIs.cmpByResultThenRanking);

  test.deepEqual(res[0], { result: 'ABC', _ranking: 1.0 }, 'sort order');
  test.deepEqual(res[1], { result: 'ABC', _ranking: 0.9 }, 'sort order 2nd');

  res = WhatIs.filterRetainTopRankedResult(res);

  debuglog(' after filter: ' + JSON.stringify(res));
  res.sort(WhatIs.cmpByRanking);
  debuglog(JSON.stringify(res));
  test.deepEqual(res[0], { result: 'DEF', _ranking: 1.2 });
  test.deepEqual(res[1], { result: 'ABC', _ranking: 1.0 });

  test.equal(res.length, 2);
  test.done();
};




exports.testCmbByRankTied = function (test) {
  var aList = [
    {
      _ranking: 1.0,
      result: 'ABC',
      record: { 'category': 'ccc' }
    },
    {
      _ranking: 1.0,
      result: 'ABC',
      record: { 'category' : 'AAA', 'some': 'AAAA' }
    },
    {
      _ranking: 1.0,
      result: 'ABC',
      record: { 'category': 'AAA', 'nosome': 'AAAA' }
    },
    {
      _ranking: 1.0,
      result: 'ABC',
      record: { 'category': 'ZZZ' }
    }
  ];

  var res = aList.sort(WhatIs.cmpByRanking);

  test.deepEqual(res[0], {
    result: 'ABC', _ranking: 1.0,
    record: { 'category': 'AAA' , 'nosome' : 'AAAA' }
  }, 'sort order');
  test.deepEqual(res[1], {
    result: 'ABC', _ranking: 1.0,
    record: {
      'category' : 'AAA',
      'some':     'AAAA'
    }
  }, 'sort order 2nd');


  test.done();
};

exports.testCategorize = function (test) {
  var res = WhatIs.analyzeCategory('unit test', mRules, 'what is unit test for abc');
  test.equal(res, 'unit test');
  test.done();
};

exports.testCategorizeBad = function (test) {
  var res = WhatIs.analyzeCategory('NavTargetResolution', mRules, 'what is unit test for abc');
  test.equal(res, undefined);
  test.done();
};


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

exports.testResolveCategory = function (test) {
  var cat = WhatIs.analyzeCategory('url', mRules);
  test.equal(cat, 'url', ' category present');

  var res = WhatIs.resolveCategory(cat, 'unit test NavTargetResolution',
    mRules, records);
  test.deepEqual(res, [{
    sentence:
    [{
      string: 'unit test',
      matchedString: 'unit test',
      category: 'category',
      _ranking: 1
    },
    {
      string: 'NavTargetResolution',
      matchedString: 'NavTargetResolution',
      category: 'unit test',
      _ranking: 1.1,
      reinforce: 1.1
    }],
    category: 'url',
    record: { 'unit test': 'NavTargetResolution', url: 'com.sap.NTA' },
    result: 'com.sap.NTA',
    _ranking: 1.6500000000000001
  }], 'unit test');
  test.done();
};


// not ambigious as same result
var recordsNoAmb = [
  {
    'unit test': 'NavTargetResolution',
    'url': 'com.sap.NTA',
    'systemId': 'UV2',
    'client': '120'
  },
  {
    'unit test': 'NavTargetResolution',
    'url': 'com.sap.NTA',
    'systemId': 'UV2',
    'client': '110'
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

exports.testResolveCategoryNoAmb = function (test) {
  var cat = WhatIs.analyzeCategory('url', mRules);
  test.equal(cat, 'url', ' category present');
  var res = WhatIs.resolveCategory(cat, 'unit test NavTargetResolution',
    mRules, recordsNoAmb);
  test.equal(res.length, 1);
  test.deepEqual(res[0], {
    sentence:
    [{
      string: 'unit test',
      matchedString: 'unit test',
      category: 'category',
      _ranking: 1
    },
    {
      string: 'NavTargetResolution',
      matchedString: 'NavTargetResolution',
      category: 'unit test',
      _ranking: 1.1,
      reinforce: 1.1
    }],
    category: 'url',
    record: { 'unit test': 'NavTargetResolution', url: 'com.sap.NTA', 'systemId': 'UV2', 'client': '110' },
    result: 'com.sap.NTA',
    _ranking: 1.6500000000000001
  }, 'unit test');
  var indis = WhatIs.isIndiscriminateResult(res);
  test.equal(indis, undefined, 'correct string');
  test.done();
};


var recordsAmb = [
  {
    'unit test': 'NavTargetResolution',
    'url': 'com.sap.NTAUV2120',
    'systemId': 'UV2',
    'client': '120'
  },
  {
    'unit test': 'NavTargetResolution',
    'url': 'com.sap.NTAUV2110',
    'systemId': 'UV2',
    'client': '110'
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

exports.testResolveCategoryAmb = function (test) {
  var cat = WhatIs.analyzeCategory('url', mRules);
  test.equal(cat, 'url', ' category present');
  var res = WhatIs.resolveCategory(cat, 'unit test NavTargetResolution',
    mRules, recordsAmb);
  test.equal(res.length, 2);
  test.deepEqual(res[1], {
    sentence:
    [{
      string: 'unit test',
      matchedString: 'unit test',
      category: 'category',
      _ranking: 1
    },
    {
      string: 'NavTargetResolution',
      matchedString: 'NavTargetResolution',
      category: 'unit test',
      _ranking: 1.1,
      reinforce: 1.1
    }],
    category: 'url',
    record: { 'unit test': 'NavTargetResolution', url: 'com.sap.NTAUV2120', 'systemId': 'UV2', 'client': '120' },
    result: 'com.sap.NTAUV2120',
    _ranking: 1.6500000000000001
  }, ' result 0');
  test.deepEqual(res[0], {
    sentence:
    [{
      string: 'unit test',
      matchedString: 'unit test',
      category: 'category',
      _ranking: 1
    },
    {
      string: 'NavTargetResolution',
      matchedString: 'NavTargetResolution',
      category: 'unit test',
      _ranking: 1.1,
      reinforce: 1.1
    }],
    category: 'url',
    record: { 'unit test': 'NavTargetResolution', url: 'com.sap.NTAUV2110', 'systemId': 'UV2', 'client': '110' },
    result: 'com.sap.NTAUV2110',
    _ranking: 1.6500000000000001
  }, 'result 2');
  var dmp = WhatIs.dumpWeightsTop(res, { top: 3 });
  var indis = WhatIs.isIndiscriminateResult(res);
  test.equal(indis, 'Many comparable results, perhaps you want to specify a discriminating client', 'correct string');
  test.equal(dmp.indexOf('category'), 32, 'correct dump');
  test.done();
};

