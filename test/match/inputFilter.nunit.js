/**
 * @file inputFilter
 * @copyright (c) 2016-2016 Gerd Forstmann
 */
var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

var debuglog = require('debug')('inputFilter.nunit');

const inputFilter = require(root + '/match/inputFilter.js');


const utils = require(root + '/utils/utils.js');

const inputFilterRules = require(root + '/match/inputFilterRules.js');

const ab = inputFilter;

exports.testcountAinB = function (test) {
  var fut = inputFilter.countAinB;
  test.equal(fut({abc: 'def', hij: 1}, {hijs: 4}), 0, 'ok');
  test.done();
};

exports.testcountAinBOne = function (test) {
  //  console.log(JSON.stringify(inputFilter, undefined, 2) + "yyyyyyyyyyyyyyyy")
  var fut = inputFilter.countAinB;
  test.equal(fut({abc: 'def', hij: 1}, {hij: 2}), 1, 'ok');
  test.done();
};

exports.testcountAinBCompareEQ = function (test) {
  var fut = inputFilter.countAinB;
  test.equal(fut({abc: 'def', hij: 1}, {hij: 1}, function (s1, s2) { return s1 && (s1 === s2); }), 1, 'ok');
  test.done();
};

exports.testcountAinBCompareFN = function (test) {
  var fut = inputFilter.countAinB;
  test.equal(fut({abc: 'def', hij: 1, klm: 'U'}, {hij: 1, klm: 'U'},
    function (s1, s2) { return s1 && s1 === s2; }), 2, 'ok');
  test.done();
};

exports.testcountAinBCompareMult1 = function (test) {
  var fut = inputFilter.countAinB;
  test.equal(fut({abc: 'def', hij: 1, klm: undefined}, {hij: 1, klm: 'U'},
    function (s1, s2) { return s1 && s1 === s2; }), 1, 'ok');
  test.done();
};

exports.testcountAinBCompareMult = function (test) {
  var fut = inputFilter.countAinB;
  test.equal(fut({abc: 'def', hij: 1, klm: 0}, {hij: 1, klm: 0},
    function (s1, s2) { return s1 !== undefined && s1 === s2; }), 2, 'ok');
  test.done();
};

exports.testcountAinBCompareIgnore = function (test) {
  var fut = inputFilter.countAinB;
  test.equal(fut({abc: 'def', hij: 1, klm: 0}, {hij: 1, klm: 0},
    function (s1, s2) { return s1 !== undefined && s1 === s2; }, 'klm'), 1, 'ok');
  test.done();
};

exports.testcountAinBCompareIgnore2 = function (test) {
  var fut = inputFilter.countAinB;
  test.equal(fut({abc: 'def', hij: 1, klm: 0}, {hij: 1, klm: 0},
    function (s1, s2) { return (s1 !== undefined) && (s1 === s2); }, ['klm', 'hij']), 0, 'ok');
  test.done();
};

exports.testspuriouAnotInB = function (test) {
  var fut = inputFilter.spuriousAnotInB;
  test.deepEqual(fut({abc: 'def', hij: 1, klm: 0}, {hij: 1, klm: 0}, ['klm', 'hij']), 1, 'ok');
  test.done();
};

exports.testspuriouAnotInBIgnore = function (test) {
  var fut = inputFilter.spuriousAnotInB;
  test.equal(fut({abc: 'def', hij: 1, klm: 0}, {hij: 1, klm: 0}, ['abc', ' klm', 'hij']), 0, 'ok');
  test.done();
};

exports.testspuriouAnotInBIgnore2 = function (test) {
  var fut = inputFilter.spuriousAnotInB;
  test.equal(fut({abc: 'def', 'u': 1, hij: 1, klm: 0}, {c: 3, hij: 1, klm: 0},
    ['abc', ' klm', 'hij']), 1, 'ok');
  test.done();
};

exports.testcompareContext = function (test) {
  var fut = inputFilter.compareContext;
  var a = {abc: 'def', hij: 1, klm: 0, ff: 'B'};
  var b = {hij: 1, klm: 0, ff: 'A', e: 1, c: 0, h: 2};
  test.deepEqual(fut(a, b),
    { equal: 2,
      different: 1,
      spuriousL: 1,
      spuriousR: 3
    },
    'ok');
  test.done();
};

exports.testcompareContextIgnorePrivate = function (test) {
  var fut = inputFilter.compareContext;
  var a = {abc: 'def', _a: 1, _b: 3, hij: 1, klm: 0, ff: 'B'};
  var b = {hij: 1, _a: 1, _c: 3, _b: 4, klm: 0, ff: 'A', e: 1, c: 0, h: 2};
  test.deepEqual(fut(a, b),
    { equal: 2,
      different: 1,
      spuriousL: 1,
      spuriousR: 3
    },
    'ok');
  test.done();
};

exports.testcompareContextIgnore = function (test) {
  var fut = inputFilter.compareContext;
  var a = {abc: 'def', hij: 1, klm: 0, ff: 'B'};
  var b = {hij: 1, klm: 0, ff: 'A', e: 1, c: 0, h: 2};
  test.deepEqual(fut(a, b, ['abc']),
    { equal: 2,
      different: 1,
      spuriousL: 0,
      spuriousR: 3
    },
    'ok');
  test.done();
};

exports.test_matchWord = function (test) {
  const fn = inputFilter.matchWord;

  // test.expect(3)
  test.deepEqual(fn({
    key: 'NoTPresent'
  },
    {
      systemObjectId: 'ClientSideTragetResol',
      systemObjectCategory: 'unit'
    }),
    undefined, 'not applicable to irrelevant key');
  test.done();
};

exports.test_matchWordAlias = function (test) {
  const fn = inputFilter.matchWord;
  // test.expect(3)
  test.deepEqual(fn({
    key: 'systemObjectId',
    word: 'CSTR',
    follows: {
      systemObjectId: 'ClientSideTargetResolution',
      systemObjectCategory: 'unit'
    }
  },
    {
      systemObjectId: 'CSTR',
      systemObjectCategory: 'unit'
    }),
    undefined, 'not applicable to irrelevant key');
  test.done();
};

exports.test_matchWordAliasMatchOthersTrue = function (test) {
  const fn = inputFilter.matchWord;
  // test.expect(3)
  var oRule = {
    key: 'systemObjectId',
    word: 'ClientSideTargetResolution',
    follows: {
      systemObjectId: 'ClientSideTargetResolution',
      systemObjectCategory: 'unit'
    }
  };
  var oValue = {
    systemObjectId: 'CSTR',
    systemObjectCategory: 'xunit'
  };
  test.deepEqual(fn(oRule,
    oValue, { matchothers: true }),
    undefined, 'not applicable to irrelevant key');
  test.done();
};

exports.test_matchWordAliasMatchOthersFalse = function (test) {
  const fn = inputFilter.matchWord;
  // test.expect(3)
  var oRule = {
    key: 'systemObjectId',
    word: 'clientsidetargetresolution',
    follows: {
      systemObjectId: 'ClientSideTargetResolution',
      systemObjectCategory: 'unit'
    }
  };
  var oValue = {
    systemObjectId: 'ClientSideTargetResolution',
    systemObjectCategory: 'xunit',
    abc: 'ABC'
  };
  test.deepEqual(fn(oRule,
    oValue, { matchothers: false }),
    {
      systemObjectId: 'ClientSideTargetResolution',
      systemObjectCategory: 'xunit',
      abc: 'ABC',
      _weight: {
        'systemObjectId': 0
      }
    }
    , ' matched');
  test.done();
};

exports.test_matchWordAliasMatchOthersFalseOverride = function (test) {
  const fn = inputFilter.matchWord;
  // test.expect(3)
  var oRule = {
    key: 'systemObjectId',
    word: 'clientsidetargetresolution',
    follows: {
      systemObjectId: 'ClientSideTargetResolution',
      systemObjectCategory: 'unit'
    }
  };
  var oValue = {
    systemObjectId: 'ClientSideTargetResolution',
    systemObjectCategory: 'xunit',
    abc: 'ABC'
  };
  test.deepEqual(fn(oRule,
    oValue, { matchothers: false,
      override: true
    }),
    {
      systemObjectId: 'ClientSideTargetResolution',
      systemObjectCategory: 'unit',
      abc: 'ABC',
      _weight: {
        'systemObjectId': 0
      }
    }
    , ' matched and override');
  test.done();
};

var oRuleWord = {
  type: 'word',
  key: 'systemObjectId',
  word: 'cstr',
  follows: {
    systemObjectId: 'ClientSideTargetResolution',
    systemObjectCategory: 'unit'
  }
};

var oRuleWordLong = {
  type: 'word',
  key: 'systemObjectId',
  word: 'ClientSideTargetResolution',
  follows: {
    systemObjectId: 'ClientSideTargetResolution',
    systemObjectCategory: 'unit'
  }
};

exports.test_matchWordAlias = function (test) {
  const fn = ab.matchWord;
  // test.expect(3)
  var oContext = {
    systemObjectId: 'CSTR',
    systemObjectCategory: 'unit',
    abc: 'ABC'
  };
  var res = fn(oRuleWord, oContext);
  // console.log(JSON.stringify(res))
  test.deepEqual(res,
    {
      systemObjectId: 'ClientSideTargetResolution',
      systemObjectCategory: 'unit',
      abc: 'ABC',
      _weight: {
        'systemObjectId': 0
      }
    }, ' incorrect result');
  test.done();
};

exports.test_matchWordAliasDifferentCat = function (test) {
  const fn = ab.matchWord;
  // test.expect(3)

  var oContext = {
    systemObjectId: 'CSTR',
    systemObjectCategory: 'xunit',
    abc: 'ABC'
  };
  var res = fn(oRuleWord, oContext);
  test.deepEqual(res, {
    systemObjectId: 'ClientSideTargetResolution',
    systemObjectCategory: 'xunit',
    abc: 'ABC',
    _weight: { 'systemObjectId': 0 }
  }
  /* undefined */, ' no match');
  test.done();
};

const enumRULETYPEWORD = 0;
const enumRULETYPEREGEXP = 1;

exports.test_applyRulesEqualChoice = function (test) {
  // prepare
  var aRules = [
    { word: 'valuea',
      key: 'keyA',
      type: enumRULETYPEWORD,
      follows: {
        'keyA': 'Synonym',
        'keyB': 'CategoryB'
      }
    },
    { word: 'valuea',
      key: 'keyA',
      type: enumRULETYPEWORD,
      follows: {
        'keyA': 'Synonym',
        'keyB': 'CategoryC'
      }
    }
  ];

  var oContext = {
    keyA: 'ValueA'
  };
  // act
  var res = ab.augmentContext(oContext, aRules);
  // test
  test.ok(res.length >= 2, 'found at least two');
  // console.log(' =================>' + JSON.stringify(res, undefined, 2))
  test.deepEqual(res[0].keyB, 'CategoryB', 'category respected');
  test.deepEqual(res[1].keyB, 'CategoryC', 'category respected');
  test.done();
};

exports.test_matchOthersTrue = function (test) {
  // prepare
  var aRules = [
    { word: 'valuea',
      key: 'keyA',
      type: enumRULETYPEWORD,
      follows: {
        'keyA': 'Synonym',
        'keyB': 'CategoryB'
      }
    },
    { word: 'valuea',
      key: 'keyA',
      type: enumRULETYPEWORD,
      follows: {
        'keyA': 'Synonym',
        'keyB': 'CategoryC'
      }
    }
  ];

  var oContext = {
    keyA: 'ValueA',
    keyB: 'Nothingmatches'
  };
  // act
  var res = ab.matchWord(aRules[0], oContext, { matchothers: true });
  // test
  test.ok(res === undefined, ' undefined ');
  test.done();
};

exports.test_matchOthersFalse = function (test) {
  // prepare
  var aRules = [
    { word: 'valuea',
      key: 'keyA',
      type: enumRULETYPEWORD,
      follows: {
        'keyA': 'Synonym',
        'keyB': 'CategoryB'
      }
    },
    { word: 'valuea',
      key: 'keyA',
      type: enumRULETYPEWORD,
      follows: {
        'keyA': 'Synonym',
        'keyB': 'CategoryC'
      }
    }
  ];

  var oContext = {
    keyA: 'ValueA',
    keyB: 'NothingMatches'
  };
  // act
  var res = ab.matchWord(aRules[0], oContext, { matchothers: false });
  debuglog('2222222222>' + JSON.stringify(res, undefined, 2));
  // test
  test.deepEqual(res.keyB, 'NothingMatches', ' categorypicked ');
  test.done();
};

exports.test_matchOthersFalseOverride = function (test) {
  // prepare
  var aRules = [
    { word: 'valuea',
      key: 'keyA',
      type: enumRULETYPEWORD,
      follows: {
        'keyA': 'Synonym',
        'keyB': 'CategoryB'
      }
    },
    { word: 'valuea',
      key: 'keyA',
      type: enumRULETYPEWORD,
      follows: {
        'keyA': 'Synonym',
        'keyB': 'CategoryC'
      }
    }
  ];

  var oContext = {
    keyA: 'ValueA',
    keyB: 'NothingMatches'
  };
  // act
  var res = ab.matchWord(aRules[0], oContext, { matchothers: false, override: true });
  debuglog('2222222222>' + JSON.stringify(res, undefined, 2));
  // test
  test.deepEqual(res.keyB, 'CategoryB', ' categorypicked ');
  test.done();
};

exports.test_applyRules = function (test) {
  // prepare
  var aRules = [
    { word: 'valuea',
      key: 'keyA',
      type: enumRULETYPEWORD, // WORD
      follows: {
        'keyA': 'Synonym',
        'keyB': 'CategoryC'
      }
    },
    { word: 'valuea',
      key: 'keyA',
      type: enumRULETYPEWORD, // WORD
      follows: {
        'keyA': 'Synonym',
        'keyB': 'CategoryB'
      }
    }
  ];

  var oContext = {
    keyA: 'ValueA',
    keyB: 'CategoryB'
  };
  // act
  var res = ab.augmentContext(oContext, aRules);
  // test
  test.ok(res.length > 0, 'found one');
  test.deepEqual(res[0].keyB, 'CategoryB', 'category respected');
  test.done();
};

exports.test_applyRulesEqualChoice = function (test) {
  // prepare
  var aRules = [
    { word: 'valuea',
      key: 'keyA',
      type: enumRULETYPEWORD,
      follows: {
        'keyA': 'Synonym',
        'keyB': 'CategoryB'
      }
    },
    { word: 'valuea',
      key: 'keyA',
      type: enumRULETYPEWORD,
      follows: {
        'keyA': 'Synonym',
        'keyB': 'CategoryC'
      }
    }
  ];

  var oContext = {
    keyA: 'ValueA'
  };
  // act
  var res = ab.augmentContext(oContext, aRules);
  // test
  test.ok(res.length >= 2, 'found at least two');
  // console.log(' =================>' + JSON.stringify(res, undefined, 2))
  test.deepEqual(res[0].keyB, 'CategoryB', 'category respected');
  test.deepEqual(res[1].keyB, 'CategoryC', 'category respected');
  test.done();
};

exports.test_applyRulesNotCategoryFit = function (test) {
  // prepare
  var aRules = [
    { word: 'valuea',
      key: 'keyA',
      type: enumRULETYPEWORD,
      follows: {
        'keyA': 'Synonym',
        'keyB': 'CategoryB'
      }
    },
    { word: 'valuea',
      key: 'keyA',
      type: enumRULETYPEWORD,
      follows: {
        'keyA': 'Synonym',
        'keyB': 'CategoryC'
      }
    }
  ];

  var oContext = {
    keyA: 'ValueA',
    keyB: 'Nothingmatches'
  };
  // act
  var res = ab.augmentContext(oContext, aRules);
  // test
  test.ok(res.length >= 2, 'found at least two');
  debuglog(' =================>' + JSON.stringify(res, undefined, 2));
  test.deepEqual(res[0].keyB, 'CategoryB', 'category respected');
  test.deepEqual(res[1].keyB, 'CategoryC', 'category respected');
  test.done();
};

exports.test_applyRulesGoodFitInOtherCategory = function (test) {
  // prepare
  var aRules = [
    { word: 'valuea',
      key: 'keyA',
      type: enumRULETYPEWORD,
      follows: {
        'keyA': 'Synonym',
        'keyB': 'CategoryB'
      }
    },
    { word: 'valueb',
      key: 'keyA',
      type: enumRULETYPEWORD,
      follows: {
        'keyA': 'Synonym',
        'keyB': 'CategoryC'
      }
    }
  ];
  var oContext = {
    keyA: 'ValueB',
    keyB: 'CategoryB'
  };
  // act
  var res = ab.augmentContext(oContext, aRules);
  // test
  test.ok(res.length >= 1, 'found at least two');
  debuglog(' =================>' + JSON.stringify(res, undefined, 2));
  test.deepEqual(res[0].keyB, 'CategoryB', 'category respected');
  test.deepEqual(res[0].keyA, 'Synonym', 'category respected');
  // test.deepEqual(res[1].keyB, 'CategoryC', 'category respected')
  test.done();
};

exports.test_applyRulesLevenBestFitCategory = function (test) {
  // prepare
  var aRules = [
    { word: 'valuea',
      key: 'keyA',
      type: enumRULETYPEWORD,
      follows: {
        'keyA': 'SynonymA',
        'keyB': 'CategoryB'
      }
    },
    { word: 'valueabc',
      key: 'keyA',
      type: enumRULETYPEWORD,
      follows: {
        'keyA': 'SynonymABC',
        'keyB': 'CategoryB'
      }
    },
    { word: 'valueabcdefg',
      key: 'keyA',
      type: enumRULETYPEWORD,
      follows: {
        'keyA': 'SynonymDEF',
        'keyB': 'CategoryB'
      }
    },
    { word: 'valueb',
      key: 'keyA',
      type: enumRULETYPEWORD,
      follows: {
        'keyA': 'Synonym',
        'keyB': 'CategoryC'
      }
    }
  ];
  var oContext = {
    keyA: 'valueabf',
    keyB: 'CategoryB'
  };
  // act
  var res = ab.augmentContext(oContext, aRules);
  // test
  test.ok(res.length >= 1, 'found at least two');
  debuglog(' =================>' + JSON.stringify(res, undefined, 2));
  test.deepEqual(res[0].keyB, 'CategoryB', 'category respected');
  test.deepEqual(res[0].keyA, 'SynonymABC', 'category respected');

  // test.deepEqual(res[1].keyB, 'CategoryC', 'category respected')
  test.done();
};

exports.test_matchWordAliasOverride = function (test) {
  const fn = ab.matchWord;
  // test.expect(3)

  var oContext = {
    systemObjectId: 'CSTR',
    abc: 'ABC'
  };
  var res = fn(oRuleWord, oContext, {
    augment: true
  });
  test.deepEqual(res,
    {
      systemObjectId: 'ClientSideTargetResolution',
      systemObjectCategory: 'unit',
      abc: 'ABC',
      _weight: {
        'systemObjectId': 0
      }
    }, ' incorrect result');
  test.done();
};

exports.test_matchWordAliasOverrideDifferent = function (test) {
  const fn = ab.matchWord;
  // test.expect(3)

  var oContext = {
    systemObjectId: 'CSTR',
    systemObjectCategory: 'xunit',
    abc: 'ABC'
  };
  var res = fn(oRuleWord, oContext, {
    override: true
  });
  test.deepEqual(res,
    {
      systemObjectId: 'ClientSideTargetResolution',
      systemObjectCategory: 'unit',
      abc: 'ABC',
      _weight: {
        'systemObjectId': 0
      }
    }, ' incorrect result');
  test.done();
};

exports.test_ruleLevenBeforeFallback = function (test) {
  // prepare
  // there a
  var aRules = [
    {
      word: 'somewhatfar',
      key: 'keyA',
      type: enumRULETYPEWORD,
      follows: {
        'keyA': 'somewhatfar',
        'keyB': 'System3'
      }
    },
    {
      word: 'somewhatclose',
      key: 'keyA',
      type: enumRULETYPEWORD,
      follows: {
        'keyA': 'somewhatclose',
        'keyB': 'System2'
      }
    },
    {
      regexp: /^.*$/,
      key: 'keyA',
      type: enumRULETYPEREGEXP,
      follows: {
        _ranking: 0.9
      }
    }
  ];
  var oContext = {
    keyA: 'somewhatcl'
  };
  // act
  var res = ab.augmentContext(oContext, aRules);
  // test
  test.ok(res.length >= 1, 'found at least one');
  debuglog(' =================>' + JSON.stringify(res, undefined, 2));
  test.deepEqual(res[0].keyA, 'somewhatclose', 'category propagated');
  test.deepEqual(res[0].keyB, 'System2', 'category picked');

  oContext = {
    keyA: 'gibts gar nicht'
  };
  // act
  res = ab.augmentContext(oContext, aRules);
  // test
  test.ok(res.length >= 1, 'found at least one');
  debuglog(' =================>' + JSON.stringify(res, undefined, 2));
  test.deepEqual(res[0].keyA, 'gibts gar nicht', 'result propagated');
  test.deepEqual(res[0].keyB, undefined, 'category picked');
  test.done();
// test.deepEqual(res[1].keyB, 'CategoryC', 'category respected')
};

exports.test_extractArgsMap = function (test) {
  var res = ab.extractArgsMap(['A', 'B', 'C'], { 2: 'X2', 1: 'X1' });
  test.deepEqual(res,
    { 'X2': 'C', 'X1': 'B' }, ' incorrect result');
  test.done();
};
exports.test_extractArgsMapUndef = function (test) {
  var res = ab.extractArgsMap(['A', 'B', 'C'], undefined);
  test.deepEqual(res,
    { }, ' incorrect result');
  test.done();
};
exports.test_extractArgsMapEmptyMatch = function (test) {
  var res = ab.extractArgsMap(['A', '', 'C'], { 2: 'X2', 1: 'X1' });
  test.deepEqual(res,
    { 'X2': 'C' }, ' incorrect result');
  test.done();
};
exports.test_extractArgsMapOutOfRange = function (test) {
  var res = ab.extractArgsMap(['A', '', 'C'], { 2: 'X2', 4: 'X1' });
  test.deepEqual(res,
    { 'X2': 'C' }, ' incorrect result');
  test.done();
};

exports.test_matchWordNonMatched = function (test) {
  const fn = ab.matchWord;
  // test.expect(3)
  var oContext = {
    systemObjectId: 'Way off the page',
    systemObjectCategory: 'xunit',
    abc: 'ABC'
  };
  var res = fn(oRuleWord, oContext);
  test.deepEqual(res,
    undefined, ' incorrect result');
  test.done();
};

exports.test_matchWordLevenClose = function (test) {
  const fn = ab.matchWord;
  // test.expect(3)
  var oContext = {
    systemObjectId: 'ClientSideTrgetResolution',
    systemObjectCategory: 'unit',
    abc: 'ABC'
  };
  var res = fn(oRuleWordLong, oContext);
  // console.log('Res is ' + res)
  test.deepEqual(res,
    {
      systemObjectId: 'ClientSideTargetResolution',
      systemObjectCategory: 'unit',
      abc: 'ABC',
      _weight: {
        'systemObjectId': 41
      }
    }, ' incorrect result ');
  test.done();
};

exports.test_ruleRegexp = function (test) {
  // prepare
  // there a
  var aRules = [
    { regexp: /^[a-z0-9_]{3,3}$/,
      key: 'keyA',
      type: enumRULETYPEREGEXP,
      follows: {
        'keyB': 'System3'
      }
    },
    {
      regexp: /^[a-z0-9_]{4,4}$/,
      key: 'keyA',
      type: enumRULETYPEREGEXP,
      follows: {
        'keyB': 'System4'
      }
    }
  ];
  var oContext = {
    keyA: 'ABC'
  };
  // act
  var res = ab.augmentContext(oContext, aRules);
  // test
  test.ok(res.length >= 1, 'found at least one');
  debuglog(' =================>' + JSON.stringify(res, undefined, 2));
  test.deepEqual(res[0].keyA, 'ABC', 'category propagated');
  test.deepEqual(res[0].keyB, 'System3', 'category picked');

  oContext = {
    keyA: 'ABCD'
  };
  // act
  res = ab.augmentContext(oContext, aRules);
  // test
  test.ok(res.length >= 1, 'found at least one');
  debuglog(' =================>' + JSON.stringify(res, undefined, 2));
  test.deepEqual(res[0].keyA, 'ABCD', 'result propagated');
  test.deepEqual(res[0].keyB, 'System4', 'category picked');
  // test.deepEqual(res[1].keyB, 'CategoryC', 'category respected')
  oContext = {
    keyA: 'ABCDE'
  };
  // act
  res = ab.augmentContext(oContext, aRules);
  // test
  test.ok(res.length === 0, 'found nothing');
  test.done();
};

exports.test_ruleRegexpExtraction = function (test) {
  // prepare
  // there a
  var aRules = [
    { regexp: /^([a-z0-9_]{3,3})clnt(\d{3,3})$/i,
      key: 'keyA',
      argsMap: {
        1: 'systemId',
        2: 'client'
      },
      type: enumRULETYPEREGEXP,
      follows: {
        'keyB': 'System3'
      }
    }
  ];
  var oContext = {
    keyA: 'UV2CLNT123'
  };
  // act
  var res = ab.augmentContext(oContext, aRules);
  // test
  test.ok(res.length >= 1, 'found at least one');
  debuglog(' =================>' + JSON.stringify(res, undefined, 2));
  test.deepEqual(res[0].keyA, 'UV2CLNT123', 'category propagated');
  test.deepEqual(res[0].keyB, 'System3', 'category picked');
  test.deepEqual(res[0].systemId, 'uv2', 'extract1 picked');
  test.deepEqual(res[0].client, '123', 'extract2 picked');
  test.done();
};

exports.test_ruleRegexpExtractionReplacing = function (test) {
  // prepare
  // there a
  var aRules = [
    { regexp: /^([a-z0-9_]{3,3})CLNT(\d{3,3})$/i,
      key: 'systemId',
      argsMap: {
        1: 'systemId',
        2: 'client'
      },
      type: enumRULETYPEREGEXP,
      follows: {
        'keyB': 'System3'
      }
    }
  ];
  var oContext = {
    systemId: 'UV2CLNT123'
  };
  // act
  var res = ab.augmentContext(oContext, aRules);
  // test
  test.ok(res.length >= 1, 'found at least one');
  debuglog(' =================>' + JSON.stringify(res, undefined, 2));
  test.deepEqual(res[0].keyB, 'System3', 'category propagated');
  test.deepEqual(res[0].systemId, 'uv2', 'category picked');
  test.deepEqual(res[0].client, '123', 'category picked');
  test.done();
};

exports.test_matchSthElse = function (test) {
  const fn = ab.matchWord;
  // test.expect(3)
  var oContext = {
    systemObjectId: 'CSTR',
    systemObjectCategory: 'xunit',
    abc: 'ABC'
  };
  var res = fn(oRuleWord, oContext);
  // console.log(JSON.stringify(res))
  test.deepEqual(res,
    {
      systemObjectId: 'ClientSideTargetResolution',
      systemObjectCategory: 'xunit',
      abc: 'ABC',
      _weight: {
        'systemObjectId': 0
      }
    }, ' incorrect result');
  test.done();
};

exports.test_applyRules = function (test) {
  // prepare
  var oContext = {
    'systemObjectId': 'ClientsideTrgetRes'
  };
  // act
  var res = ab.applyRules(oContext);
  // test
  debuglog('The end result : ' + JSON.stringify(res, undefined, 2));
  test.deepEqual(res[0].systemObjectId, 'ClientSideTargetResolution', ' typo corrected');
  test.deepEqual(res[0].systemObjectCategory, 'unit test', 'category determined ok');
  test.done();
};

exports.test_applyRulesWithCategory = function (test) {
  // prepare
  var oContext = {
    'systemObjectId': 'ClientsideTrgetRes',
    'systemObjectCategory': 'unit'
  };
  // act
  var res = ab.applyRules(oContext);
  // test
  test.deepEqual(res[0].systemObjectId, 'ClientSideTargetResolution', ' typo corrected');
  test.deepEqual(res[0].systemObjectCategory, 'unit test', 'category determined ok');
  test.done();
};

exports.testinputFilter = function (test) {
  const fn = ab.augmentContext;
  // test.expect(3)
  test.deepEqual(fn({
    systemObjectId: 'ClientSideTragetResol',
    systemObjectCategory: 'unit'
  }, [
    {
      type: 1
    }
  ]),
    [], 'return undefined');
  test.done();
};

var ifr = inputFilterRules.getMRules();

exports.testCategorizeString = function (test) {
  // debuglog(JSON.stringify(ifr, undefined, 2))
  var res = ab.categorizeString('UV2', true, ifr);
  debuglog('res > ' + JSON.stringify(res, undefined, 2));
  test.deepEqual(res, [
    { string: 'UV2', matchedString: 'UV2', category: 'systemId' },
    { string: 'UV2', matchedString: 'UV2', category: 'systemObjectId' }
  ], 'correct result');
  test.done();
};

exports.testCategorizeString2 = function (test) {
  // debuglog(JSON.stringify(ifr, undefined, 2))
  var res = ab.categorizeString('NavTargetRes', true, ifr);
  debuglog('res > ' + JSON.stringify(res, undefined, 2));

  test.deepEqual(res, [
    {
      'string': 'NavTargetRes',
      'matchedString': 'NavTargetRes',
      'category': 'systemObjectId'
    }
  ], 'what is this nr 2');
  test.done();
};

exports.testCategorizeString4 = function (test) {
  // debuglog(JSON.stringify(ifr, undefined, 2))
  var res = ab.categorizeString('NavTargetResolution', true, ifr);
  debuglog('res > ' + JSON.stringify(res, undefined, 2));

  test.deepEqual(res, [
    {
      'string': 'NavTargetResolution',
      'matchedString': 'NavTargetResolution',
      'category': 'unit test'
    },
    {
      'string': 'NavTargetResolution',
      'matchedString': 'NavTargetResolution',
      'category': 'systemObjectId'
    }
  ], 'what is this nr 4');
  test.done();
};

exports.testCategorizeStringDistance = function (test) {
  // debuglog(JSON.stringify(ifr, undefined, 2))
  var res = ab.categorizeString('NavTargetResolu', false, ifr);
  debuglog('res > ' + JSON.stringify(res, undefined, 2));

  test.deepEqual(res, [
    {
      'string': 'NavTargetResolu',
      'matchedString': 'NavTargetResolutionAdapter',
      'category': 'unit test',
      'levenmatch': 14
    },
    {
      'string': 'NavTargetResolu',
      'matchedString': 'NavTargetResolution',
      'category': 'unit test',
      'levenmatch': 7
    },
    {
      'string': 'NavTargetResolu',
      'matchedString': 'NavTargetResolutionCDMBlackbox',
      'category': 'unit test',
      'levenmatch': 18
    },
    {
      'string': 'NavTargetResolu',
      'matchedString': 'NavTargetResolu',
      'category': 'systemObjectId'
    }
  ], 'what is this 3');
  test.done();
};

exports.testCategorizeStringBadRule = function (test) {
  // debuglog(JSON.stringify(ifr, undefined, 2))
  test.expect(2);
  try {
    ab.categorizeString('NavTargetResolu', false,
      [ {
        type: -123,
        word: 'walk this way'
      } ]);
    test.ok(false, 'do not get here');
  } catch (e) {
    test.ok(e.message.indexOf('walk this way') >= 0);
    test.ok(true, 'got exception');
  }
  test.done();
};

var sampleRules = [
  {
    type: 0,
    word: 'ab',
    matchedString: 'ab',
    category: 'CAT1'
  },
  {
    type: 0,
    word: 'bc',
    matchedString: 'bc',
    category: 'CAT2'
  },
  {
    type: 0,
    word: 'cat1',
    matchedString: 'CAT2',
    category: 'category'
  },
  {
    type: 0,
    word: 'cat2',
    matchedString: 'CAT2',
    category: 'category'
  },
  {
    type: 1,
    regexp: /^.*$/,
    category: 'unknown'
  }
];

exports.testCategorizeStringDistance = function (test) {
  // debuglog(JSON.stringify(ifr, undefined, 2))
  var res = ab.analyzeString('cat1 and ab', sampleRules);
  debuglog('res > ' + JSON.stringify(res, undefined, 2));

  test.deepEqual(res, [ [ [ { string: 'cat1 and ab',
    matchedString: 'cat1 and ab',
    category: 'unknown' } ] ],
    [ [ { string: 'cat1', matchedString: 'CAT2', category: 'category' },
      { string: 'cat1', matchedString: 'cat1', category: 'unknown' } ],
      [ { string: 'and ab',
        matchedString: 'and ab',
        category: 'unknown' } ] ],
    [ [ { string: 'cat1 and',
      matchedString: 'cat1 and',
      category: 'unknown' } ],
      [ { string: 'ab', matchedString: 'ab', category: 'CAT1' },
      { string: 'ab', matchedString: 'ab', category: 'unknown' } ] ],
    [ [ { string: 'cat1', matchedString: 'CAT2', category: 'category' },
      { string: 'cat1', matchedString: 'cat1', category: 'unknown' } ],
    [ { string: 'and', matchedString: 'and', category: 'unknown' } ],
      [ { string: 'ab', matchedString: 'ab', category: 'CAT1' },
      { string: 'ab', matchedString: 'ab', category: 'unknown' } ] ] ], ' correct result ');
  test.done();
};



exports.testExpand0 = function (test) {
  test.ok(1);
  var src = [ [
    [ { string : 'a', a : 1},
      { string : 'b', a : 1} ],
    [ { string : '1', a : 1},
      { string : '2', a : 1},
      { string : '3', a : 1} ]
  ] ];
  var res = ab.expandMatchArr(src);
  test.deepEqual(res,[ [ { string: 'a', a: 1 }, { string: '1', a: 1 } ],
  [ { string: 'b', a: 1 }, { string: '1', a: 1 } ],
  [ { string: 'a', a: 1 }, { string: '2', a: 1 } ],
  [ { string: 'b', a: 1 }, { string: '2', a: 1 } ],
  [ { string: 'a', a: 1 }, { string: '3', a: 1 } ],
  [ { string: 'b', a: 1 }, { string: '3', a: 1 } ] ], 'correct result');

  test.done();
};



exports.testExpand1 = function (test) {
  test.ok(1);

  var src = [ [ [ { string : 'cat1 and ab', a : 1} ] ],
    [ [ {'string': 'cat1', b1 : 1},
       { 'string': 'cat1', b1 : 2}
    ],
      [ { string: 'and ab',
        b2 : 1 } ] ],
    [ [ { string: 'cat1 and'  } ],
      [ { string: 'ab', c21 : 1 },
        { string: 'ab',  c21 : 2 },
        { string: 'ab', c21 : 3 }
      ]
    ]
  ];

  var res = ab.expandMatchArr(src);
  test.deepEqual(res,[ [ { string: 'cat1 and ab', a: 1 } ],
  [ { string: 'cat1', b1: 1 }, { string: 'and ab', b2: 1 } ],
  [ { string: 'cat1', b1: 2 }, { string: 'and ab', b2: 1 } ],
  [ { string: 'cat1 and' }, { string: 'ab', c21: 1 } ],
  [ { string: 'cat1 and' }, { string: 'ab', c21: 2 } ],
  [ { string: 'cat1 and' }, { string: 'ab', c21: 3 } ] ], 'correct result');

  test.done();
};

exports.testExpandMult = function (test) {
  test.ok(1);

  var src = [ [ [ { string: 'cat1 and ab',
    matchedString: 'cat1 and ab',
    category: 'unknown' } ] ],
    [ [ { string: 'cat1', matchedString: 'CAT2', category: 'category' },
      { string: 'cat1', matchedString: 'cat1', category: 'unknown' } ],
      [ { string: 'and ab',
        matchedString: 'and ab',
        category: 'unknown' } ] ],
    [ [ { string: 'cat1 and',
      matchedString: 'cat1 and',
      category: 'unknown' } ],
      [ { string: 'ab', matchedString: 'ab', category: 'CAT1' },
      { string: 'ab', matchedString: 'ab', category: 'unknown' } ] ],
    [ [ { string: 'cat1', matchedString: 'CAT2', category: 'category' },
      { string: 'cat1', matchedString: 'cat1', category: 'unknown' } ],
    [ { string: 'and', matchedString: 'and', category: 'unknown' } ],
      [ { string: 'ab', matchedString: 'ab', category: 'CAT1' },
      { string: 'ab', matchedString: 'ab', category: 'unknown' } ] ] ];
// 1 +  2 x 1  + 1 x 2 + 2 x 1 x 2
  var res = ab.expandMatchArr(src);
  test.equal(res.length, 9, 'correct length');
  test.done();
};



exports.testExtractCategory = function (test) {
  // debuglog(JSON.stringify(ifr, undefined, 2))

  var sentence = [
        { string: 'wiki', matchedString: 'wiki', category: 'category' },
        { string: 'My wiki', matchedString: 'My wiki', category: 'wiki' },
        { string: 'cat', matchedString: 'catalog', category: 'category' },
        { string: 'My cat', matchedString: 'My cat', category: 'wiki' },
        { string: 'in', matchedString: 'in', category: 'filler' },
        { string: 'wiki', matchedString: 'wiki', category: 'category' }
  ];

  var res = ab.extractCategoryMap(sentence);

  test.deepEqual(res,
    { 'wiki' : [ { pos : 0 }, { pos : 5}],
      'catalog' : [{ pos : 2}]
    }, 'correct map');
  test.done();
};



exports.testreinforceSentence = function (test) {
  // debuglog(JSON.stringify(ifr, undefined, 2))

  var sentence = [
    { string: 'wiki', matchedString: 'wiki', category: 'category' },
    { string: 'My wiki', matchedString: 'My wiki', category: 'wiki' },
    { string: 'in', matchedString: 'in', category: 'filler' },
    { string: 'cat', matchedString: 'catalog', category: 'category' },
    { string: 'in', matchedString: 'in', category: 'filler' },
    { string: 'My next wiki', matchedString: 'My next wiki', category: 'wiki' },
    { string: 'in', matchedString: 'in', category: 'filler' },
    { string: 'wiki', matchedString: 'wiki', category: 'category' }
  ];

  var res = ab.reinForceSentence(sentence);

  test.deepEqual(res,
    [ { string: 'wiki', matchedString: 'wiki', category: 'category' },
    { string: 'My wiki',
      matchedString: 'My wiki',
      category: 'wiki',
      reinforce: 4 },
    { string: 'in', matchedString: 'in', category: 'filler' },
    { string: 'cat', matchedString: 'catalog', category: 'category' },
    { string: 'in', matchedString: 'in', category: 'filler' },
    { string: 'My next wiki',
      matchedString: 'My next wiki',
      category: 'wiki',
      reinforce: 2 },
  { string: 'in', matchedString: 'in', category: 'filler' },
  { string: 'wiki', matchedString: 'wiki', category: 'category' } ], 'correct reinforced string');
  test.done();
};



exports.testreinforce = function (test) {
  // debuglog(JSON.stringify(ifr, undefined, 2))

  var sentence = [
    { string: 'wiki', matchedString: 'wiki', category: 'category' },
    { string: 'My wiki', matchedString: 'My wiki', category: 'wiki' },
    { string: 'in', matchedString: 'in', category: 'filler' },
    { string: 'cat', matchedString: 'catalog', category: 'category' },
    { string: 'in', matchedString: 'in', category: 'filler' },
    { string: 'My next wiki', matchedString: 'My next wiki', category: 'wiki' },
    { string: 'in', matchedString: 'in', category: 'filler' },
    { string: 'wiki', matchedString: 'wiki', category: 'category' }
  ];

  var u = [sentence,
    utils.cloneDeep(sentence),
    utils.cloneDeep(sentence)];


  var resline = [ { string: 'wiki', matchedString: 'wiki', category: 'category' },
    {
      string: 'My wiki',
      matchedString: 'My wiki',
      category: 'wiki',
      reinforce: 4 },
    { string: 'in', matchedString: 'in', category: 'filler' },
    { string: 'cat', matchedString: 'catalog', category: 'category' },
    { string: 'in', matchedString: 'in', category: 'filler' },
    { string: 'My next wiki',
      matchedString: 'My next wiki',
      category: 'wiki',
      reinforce: 2 },
  { string: 'in', matchedString: 'in', category: 'filler' },
  { string: 'wiki', matchedString: 'wiki', category: 'category' } ];


  var res = ab.reinForce(u);
  test.deepEqual(res[0],resline, 'line 0 ok');
  test.deepEqual(res[1],resline, 'line 1 ok');
  test.deepEqual(res[2],resline, 'line 2 ok');
  test.done();
};