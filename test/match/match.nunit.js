/**
 * @file
 * @module match.nunit
 * @copyright (c) 2016 Gerd Forstmann
 */

var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

var debuglog = require('debug')('match.nunit');

const Match = require(root + '/match/match.js');
const ToolMatch = Match.ToolMatch;
//const Category = OpsWord.Category;

var oMatch1 = {
  toolmatchresult: {
    spurious: {}, missing: {},
    required: { 'a': { _ranking: 0.4 }, 'b': { _ranking: 0.3 } },
    optional: { 'b': { _ranking: 0.5 } }
  }
};
var oMatch2 = {
  toolmatchresult: {
    spurious: {}, missing: { 'A': { _ranking: 0.3 } },
    required: { 'a': { _ranking: 0.4 }, 'b': { _ranking: 0.3 } },
    optional: {}
  }
};
exports.testMatchCompare = function (test) {
  // prepare

  // act
  // check
  test.ok(ToolMatch.compBetterMatch(oMatch1, oMatch2) < 0, 'delta');
  test.done();
};

exports.testRankResult = function (test) {
  // prepare

  // act
  // check
  test.ok(ToolMatch.rankResult(oMatch1.toolmatchresult) > 0.91, 'correct rank');
  test.done();
};

exports.testMatchIsAny = function (test) {
  // prepare

  // act
  // check
  test.deepEqual(ToolMatch.isAnyMatch(oMatch1), true, 'anyMatch');
  test.done();
};

exports.testMatchIsComplete = function (test) {
  // prepare

  // act
  // check

  test.deepEqual(ToolMatch.isComplete(oMatch1), true, ' complete');
  test.deepEqual(ToolMatch.isComplete(oMatch2), false, 'complete');
  test.done();
};


var oMatch3 = {
  'toolmatchresult': {
    'required': {
      'systemId': {
        'string': '120',
        'matchedString': '120',
        'category': 'systemId'
      }
    },
    'missing': {
      'client': 1
    },
    'optional': {},
    'spurious': {
      'start catalog': 1,
      'ABC in FLPD in UV2': 1,
      'client': 1
    },
    'toolmentioned': []
  },
  'sentence': [
    {
      'string': 'start catalog',
      'matchedString': 'start catalog',
      'category': 'systemObjectId'
    },
    {
      'string': 'ABC in FLPD in UV2',
      'matchedString': 'ABC in FLPD in UV2',
      'category': 'systemObjectId'
    },
    {
      'string': 'client',
      'matchedString': 'client',
      'category': 'systemObjectId'
    },
    {
      'string': '120',
      'matchedString': '120',
      'category': 'systemId'
    }
  ],
  'tool': {
    'name': 'FLPD',
    'requires': {
      'systemId': {},
      'client': {}
    },
    'optional': {
      'catalog': {},
      'group': {}
    }
  },
  'rank': 97
};



exports.testMatchGetEntity = function (test) {


  var oMatchX = {
    'toolmatchresult': {
      'required': {
        'systemId': {
          'string': 'U20',
          'matchedString': 'U20',
          'category': 'systemId'
        }
      },
      'missing': {
        'client': 1
      },
      'optional': {
        'fiori client':
        {
          'string': 'ABC',
          'matchedString': 'ABC',
          'category': 'fiori client'

        }
      },
      'spurious': {
        'start catalog': 1,
        'ABC in FLPD in UV2': 1,
        'client': 1
      },
      'toolmentioned': []
    },
  };

  var res = Match.Result.getEntity(oMatchX, 'systemId');
  test.equal(res.matchedString, 'U20');
  res = Match.Result.getEntity(oMatchX, 'fiori client');
  test.equal(res.matchedString, 'ABC');

  res = Match.Result.getEntity(oMatchX, 'not presnet');
  test.equal(res, undefined);
  res = Match.Result.getEntity({}, 'client');
  test.equal(res, undefined);
  test.done();
};


exports.testMatchdumpNiceTop = function (test) {

  var res = ToolMatch.dumpNiceTop([oMatch3, oMatch3], { top: 2 });
  test.equal(res.length > 0, true);
  res = ToolMatch.dumpNiceTop([oMatch3, oMatch3], { top: 4 });
  test.equal(res.length > 0, true);
  res = ToolMatch.dumpNiceTop([oMatch3, oMatch3, oMatch3], { top: 2 });
  test.equal(res.length > 0, true);
  test.done();
};

exports.testMatchdumpNiceTop = function (test) {

  var res = ToolMatch.dumpWeightsTop([oMatch3, oMatch3], { top: 2 });
  test.equal(res.length > 0, true);
  res = ToolMatch.dumpWeights(oMatch3, { top: 4 });
  test.equal(res.length > 0, true);
  test.done();
};



exports.testMatchdumpNice = function (test) {
  // prepare

  // act
  // check
  var res = ToolMatch.dumpNice(oMatch3);
  debuglog('>\n' + res.toString('utf8'));

  var expected =
    `**Result for tool: FLPD
 rank: 97
required: systemId -> "120"
required: client -> ? missing!
optional : catalog -> ?
optional : group -> ?
[0] : systemObjectId "start catalog" => "start catalog"
[1] : systemObjectId "ABC in FLPD in UV2" => "ABC in FLPD in UV2"
[2] : systemObjectId "client" => "client"
[3] : systemId "120" => "120"
.
`;
  debuglog('>\n' + expected);

  var s = '';
  for (var i = 0; i < res.length && i < expected.length; ++i) {
    if (res.charAt(i) === expected.charAt(i)) {
      s = s + res.charAt(i);
    } else {
      s = s + `[${res.charAt(i)} <> ${expected.charAt(i)}]`;
    }
  }
  debuglog(s);

  test.deepEqual(res, expected, ' dumped');
  test.done();
};



