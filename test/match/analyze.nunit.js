/**
 * @file
 * @module toolmatcher.nunit
 * @copyright (c) 2016 Gerd Forstmann
 */

var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

var debuglog = require('debug')('analyze.nunit');

const Analyze = require(root + '/match/analyze.js');

const Match = require(root + '/match/match.js');

const InputFilterRules = require(root + '/match/inputFilterRules.js');

const mRules = InputFilterRules.getMRules();

exports.testMatchAtool = function (test) {

  var oTool = { 'name' : 'FLPD',
    'requires' : { 'systemId' : {}, 'client' :{}},
    'optional' : { 'catalog' : {}, 'group' :{}}
  };

  const result  = Analyze.analyzeAll('start catalog ABC in FLPD in UV2 client 120',
    mRules,
  [oTool] );
  // test.expect(3)
 //  test.deepEqual(result.weight, 120, 'correct weight');

  debuglog('result : ' + JSON.stringify(result, undefined, 2));

  debuglog('result : ' + JSON.stringify(result[0],undefined, 2));
  debuglog('top : ' + Match.ToolMatch.dumpNiceTop(result,{ top : 3 }));
  test.deepEqual(result.length, 460, 'correct length result');
  test.deepEqual(result[0].tool.name, 'FLPD', 'correct tool picked');
  test.done();
};


exports.testMatchTools = function (test) {

  var oToolFLPD = { 'name' : 'FLPD',
    'requires' : { 'systemId' : {}, 'client' :{}},
    'optional' : { 'catalog' : {}, 'group' :{}}
  };

  var oToolWiki = { 'name' : 'Wiki',
    'requires' : { 'wiki' : {} },
    'optional' : { 'wikipage' : {} }
  };

  var oToolWikiPage = { 'name' : 'WikiPage',
    'requires' : { 'wikipage' : {} }
  };

  const result = Analyze.analyzeAll('start wiki UI2 Services',
  mRules,
  [oToolWiki, oToolFLPD, oToolWikiPage] );
  // test.expect(3)
 //  test.deepEqual(result.weight, 120, 'correct weight');

  debuglog('result : ' + JSON.stringify(result, undefined, 2));
  debuglog('best result : ' + JSON.stringify(result[0] || {}, undefined, 2));
  debuglog('top : ' + Match.ToolMatch.dumpNiceTop(result,{ top : 3 }));
  test.deepEqual(result.length, 9, 'correct length list');
  test.deepEqual(result[0].tool.name, 'Wiki', 'correct tool picked');

  test.done();
};



exports.testMatchNonsence = function (test) {
  var oToolFLPD = { 'name' : 'FLPD',
    'requires' : { 'systemId' : {}, 'client' :{}},
    'optional' : { 'catalog' : {}, 'group' :{}}
  };

  var oToolWiki = { 'name' : 'Wiki',
    'requires' : { 'wiki' : {} },
    'optional' : { 'wikipage' : {} }
  };

  var oToolWikiPage = { 'name' : 'WikiPage',
    'requires' : { 'wikipage' : {} }
  };

  const result = Analyze.analyzeAll('start garbage from hell',
  mRules,
  [oToolWiki, oToolFLPD, oToolWikiPage] );
  // test.expect(3)
 //  test.deepEqual(result.weight, 120, 'correct weight');

  debuglog('result : ' + JSON.stringify(result, undefined, 2));
  debuglog('best result : ' + JSON.stringify(result[0] || {}, undefined, 2));

  test.deepEqual(result.length, 0, 'correct length list');
 // test.deepEqual(result[0].tool.name, 'Wiki', 'correct tool picked');

  test.done();
};
