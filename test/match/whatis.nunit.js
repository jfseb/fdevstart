/**
 * @file
 * @module toolmatcher.nunit
 * @copyright (c) 2016 Gerd Forstmann
 */

var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

var debuglog = require('debug')('analyze.nunit');

const WhatIs = require(root + '/match/whatis.js');

var Sentence = require(root + '/match/sentence.js');

const InputFilterRules = require(root + '/match/inputFilterRules.js');

const mRules = InputFilterRules.getMRulesSample();

const Model = require(root + '/model/model.js');
const theModel = Model.loadModels();

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

  var resx = WhatIs.filterRetainTopRankedResult({ answers: res });
  res = resx.answers;

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
      record: { 'category': 'AAA', 'some': 'AAAA' }
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
    record: { 'category': 'AAA', 'nosome': 'AAAA' }
  }, 'sort order');
  test.deepEqual(res[1], {
    result: 'ABC', _ranking: 1.0,
    record: {
      'category': 'AAA',
      'some': 'AAAA'
    }
  }, 'sort order 2nd');


  test.done();
};


exports.testFilterAcceptingOnly = function (test) {

  var inp = [
    [
      {
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
      }
    ],
    [
      {
        string: 'unit test',
        matchedString: 'unit test',
        category: 'abc',
        _ranking: 1
      },
      {
        string: 'NavTargetResolution',
        matchedString: 'NavTargetResolution',
        category: 'unit test',
        _ranking: 1.1,
        reinforce: 1.1
      }
    ],
    [
      {
        string: 'unit test',
        matchedString: 'unit test',
        category: 'filler',
        _ranking: 1
      },
      {
        string: 'NavTargetResolution',
        matchedString: 'NavTargetResolution',
        category: 'category',
        _ranking: 1.1,
        reinforce: 1.1
      }
    ]
  ];
  var res = WhatIs.filterAcceptingOnly(inp, ['filler', 'category']);
  test.deepEqual(res, [inp[2]]);
  test.done();
};



exports.testcmpByNrCategoriesAndSameDomain2 = function (test) {
  var inp = [
    [
      { matchedString : 'abc',
        category: 'category'
      },
      {matchedString : 'abc',
        category: 'filler'
      }],
    [
      {
        matchedString : 'abc',
        'category': 'category'
      },
      {
        matchedString : 'abc',
        'category': 'category'
      },
      {
        matchedString : 'abc',
        'category': 'category'
      },
      {
        matchedString : 'def',
        category: 'category'
      }],
    [
      {
        matchedString : 'abc',
        'category': 'category'
      },
      {
        matchedString : 'hij',
        'category': 'category'
      },
      {
        matchedString : 'def',
        category: 'category'
      }],
    [
      {
        category: 'filler'
      },
      {
        category: 'filler'
      }
    ]
  ];
  var res = inp;
  res.sort(WhatIs.cmpByNrCategoriesAndSameDomain);
  var res2 = Sentence.getDistinctCategoriesInSentence(res[0]);
  test.deepEqual(res2, ['abc','hij','def']);
  test.done();
};



exports.testcmpByNrCategoriesAndSameDomain = function (test) {
  var inp = [
    [
      { matchedString : 'abc',
        category: 'category'
      },
      {matchedString : 'abc',
        category: 'filler'
      }],
    [
      {
        matchedString : 'abc',
        'category': 'category'
      },
      {
        matchedString : 'def',
        category: 'category'
      }],
    [
      {
        category: 'filler'
      },
      {
        category: 'filler'
      }
    ]
  ];
  var best = inp[1];
  var res = inp;
  res.sort(WhatIs.cmpByNrCategoriesAndSameDomain);
  test.deepEqual(res[0],best);
  test.done();
};



exports.testAnalyzeCategoryElemSingle = function (test) {
  var res = WhatIs.analyzeCategory('element names', theModel.rules, 'what is unit test wiki for abc');
  test.deepEqual(res, 'element name');
  test.done();
};



exports.testAnalyzeCategoryElem = function (test) {
  var res = WhatIs.analyzeCategory('element namess', theModel.rules, 'what is unit test wiki for abc');
  test.deepEqual(res, 'element name');
  test.done();
};


exports.testAnalyzeCategoryMult = function (test) {
  var res = WhatIs.analyzeCategoryMult('unit test and', theModel.rules, 'what is unit test wiki for abc');
  test.deepEqual(res, ['unit test']);
  test.done();
};

exports.testAnalyzeCategoryMult2 = function (test) {
  var res = WhatIs.analyzeCategoryMult('unit test and wiki', mRules, 'what is unit test wiki for abc');
  test.deepEqual(res, undefined); // ['unit test', 'wiki']);
  test.done();
};

// TODO, this is bullshit, complete cover must be better than sloppy matches!
exports.testCategorizeMultElement = function (test) {
  var res = WhatIs.analyzeCategoryMult('element name and element number, element symbol', theModel.rules, 'what is unit test and wiki for abc');
  test.deepEqual(res, ['element name', 'element number', 'element symbol']);
  test.done();
};


// TODO, this is bullshit, complete cover must be better than sloppy matches!
exports.testAnalyzeCusmos = function (test) {
  var res = WhatIs.analyzeContextString('cusmos', theModel.rules);
  delete res.sentences[0][0].rule;
  test.deepEqual(res.sentences, [ [ { string: 'cusmos',
    matchedString: 'Cosmos',
    category: 'domain',
    _ranking: 0.855,
    levenmatch: 0.9 } ] ]
      );
  test.done();
};


exports.testCategorizeMultElement2 = function (test) {
  var res = WhatIs.analyzeCategoryMultOnlyAndComma('element name and element number, element symbol', theModel.rules, 'what is unit test and wiki for abc');
  test.deepEqual(res, ['element name', 'element number', 'element symbol']);
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

exports.testanalyzeOperator = function (test) {
  var res = WhatIs.analyzeOperator('starting with', mRules, 'what is unit test for abc');
  test.equal(res, 'starts with');
  test.done();
};

exports.testanalyzeOperatorBad = function (test) {
  var res = WhatIs.analyzeOperator('ain no op', mRules, 'what is unit test for abc');
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
  res.answers.forEach(function(r) { stripResult(r); });
  test.deepEqual(res.answers,[ { sentence:
  [ {
    string: 'unit',
    matchedString: 'unit',
    category: 'transaction',
    _ranking: 0.7 },
  { string: 'test',
    matchedString: 'test',
    category: 'transaction',
    _ranking: 0.7 },
  { string: 'NavTargetResolution',
    matchedString: 'NavTargetResolution',
    category: 'unit test',
    _ranking: 1 } ],
    record: { 'unit test': 'NavTargetResolution', url: 'com.sap.NTA' },
    category: 'url',
    result: 'com.sap.NTA',
    _ranking: 1.5 } ]
    , 'compare result');
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

exports.testResolveCategoryNoAmb2 = function (test) {
  var cat = WhatIs.analyzeCategory('url', mRules);
  test.equal(cat, 'url', ' category present');
  var res = WhatIs.resolveCategory(cat, 'unit test NavTargetResolution',
    mRules, recordsNoAmb);
  test.equal(res.answers.length, 1, ' resolved length ok');
  test.deepEqual(stripResult(res.answers[0]),{ sentence:
  [ {
    string: 'unit',
    matchedString: 'unit',
    category: 'transaction',
    _ranking: 0.7 },
  { string: 'test',
    matchedString: 'test',
    category: 'transaction',
    _ranking: 0.7 },
  { string: 'NavTargetResolution',
    matchedString: 'NavTargetResolution',
    category: 'unit test',
    _ranking: 1 } ],
    record:
    { 'unit test': 'NavTargetResolution',
      url: 'com.sap.NTA',
      systemId: 'UV2',
      client: '110' },
    category: 'url',
    result: 'com.sap.NTA',
    _ranking: 1.5 }, 'unit test compare 1');
  var indis = WhatIs.isIndiscriminateResult(res.answers);
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

function stripResult(r) {
  delete r.sentence.forEach(function(s) { delete s.rule;  delete s.span;});
  return r;
}

exports.testResolveCategoryAmb = function (test) {
  var cat = WhatIs.analyzeCategory('url', mRules);
  test.equal(cat, 'url', ' category present');
  var res = WhatIs.resolveCategory(cat, 'unit test NavTargetResolution',
    mRules, recordsAmb);
    //TODO
  //console.log(JSON.stringify(res.answers,undefined, 2));
  test.equal(res.answers.length, 2);
  test.deepEqual(stripResult(res.answers[1]), { sentence:
  [ {
    string: 'unit',
    matchedString: 'unit',
    category: 'fiori catalog',
    _ranking: 0.5 },
  { string: 'test',
    matchedString: 'test',
    category: 'transaction',
    _ranking: 0.7 },
  { string: 'NavTargetResolution',
    matchedString: 'NavTargetResolution',
    category: 'unit test',
    _ranking: 1 } ],
    record:
    { 'unit test': 'NavTargetResolution',
      url: 'com.sap.NTAUV2120',
      systemId: 'UV2',
      client: '120' },
    category: 'url',
    result: 'com.sap.NTAUV2120',
    _ranking: 1.5 }, ' result 0');
  test.deepEqual(stripResult(res.answers[0]), { sentence:
  [ {
    string: 'unit',
    matchedString: 'unit',
    category: 'transaction',
    _ranking: 0.7 },
  { string: 'test',
    matchedString: 'test',
    category: 'transaction',
    _ranking: 0.7 },
  { string: 'NavTargetResolution',
    matchedString: 'NavTargetResolution',
    category: 'unit test',
    _ranking: 1 } ],
    record:
    { 'unit test': 'NavTargetResolution',
      url: 'com.sap.NTAUV2110',
      systemId: 'UV2',
      client: '110' },
    category: 'url',
    result: 'com.sap.NTAUV2110',
    _ranking: 1.5 },
   'result 2');
  var dmp = WhatIs.dumpWeightsTop(res.answers, { top: 3 });
  var indis = WhatIs.isIndiscriminateResult(res.answers);
  test.equal(indis, 'Many comparable results, perhaps you want to specify a discriminating client', 'correct string');
  test.equal(dmp.indexOf('category'), 32, 'correct dump');
  test.done();
};

var aResults = [{ _ranking: 1 }, { _ranking: 1 }, { _ranking: 0.7 }];
exports.testFilterOnlyTopRanked = function (test) {
  var res = WhatIs.filterOnlyTopRanked(aResults);
  test.equal(res.length, 2);
  test.done();
};

var aResultsMisOrdered = [{ _ranking: 1 }, { _ranking: 1 }, { _ranking: 1.2 }];
exports.testFilterOnlyTopRankedThrows = function (test) {
  test.expect(1);
  try {
    WhatIs.filterOnlyTopRanked(aResultsMisOrdered);
    test.equal(1, 0);
  } catch (e) {
    /*empty*/
    test.equal(1, 1);
  }
  test.done();
};




