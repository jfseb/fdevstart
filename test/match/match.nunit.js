/**
 * @file
 * @module match.nunit
 * @copyright (c) 2016 Gerd Forstmann
 */

var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

var debuglog = require('debug')('match.nunit');

const match= require(root + '/match/match.js');
const ToolMatch = match.ToolMatch;
//const Category = OpsWord.Category;

var oMatch1 = {
  toolmatchresult : { spurious : {}, missing : {},
    required : { 'a' : { _ranking : 0.4}, 'b' : { _ranking : 0.3}},
    optional :{ 'b' : { _ranking : 0.5} }
  }
};
var oMatch2 = {
  toolmatchresult : { spurious : {}, missing : {'A' : { _ranking : 0.3}},
    required : { 'a' : { _ranking : 0.4}, 'b' :{ _ranking : 0.3 }},
    optional : {}
  }
};
exports.testMatchCompare= function (test) {
  // prepare

  // act
  // check
  test.deepEqual(ToolMatch.compBetterMatch(oMatch1, oMatch2), -129.94, 'delta');
  test.done();
};

exports.testRankResult = function (test) {
  // prepare

  // act
  // check
  test.deepEqual(ToolMatch.rankResult(oMatch1.toolmatchresult), 300.06,'correct rank');
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
  for(var i = 0; i < res.length && i < expected.length; ++i) {
    if(res.charAt(i) === expected.charAt(i)) {
      s = s + res.charAt(i);
    } else {
      s = s + `[${res.charAt(i)} <> ${expected.charAt(i)}]`;
    }
  }
  debuglog(s);

  test.deepEqual(res,expected, ' dumped');
  test.done();
};



