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

const mRules = InputFilterRules.getMRulesSample();

var oToolFLPD = { 'name' : 'FLPD',
  'requires' : { 'systemId' : {}, 'client' :{}},
  'optional' : { 'catalog' : {}, 'group' :{}}
};

var oToolTA = { 'name' : 'StartTA',
  'requires' : { 'transaction' : {}, 'systemId' : {}, 'client' :{}},
  'optional' : { 'catalog' : {}, 'group' :{}}
};

var oToolWiki = { 'name' : 'wiki',
  'requires' : { 'wiki' : {} },
  'optional' : { 'wikipage' : {} }
};

var oToolWikiPage = { 'name' : 'WikiPage',
  'requires' : { 'wikipage' : {} }
};


const tools = [oToolWiki, oToolTA, oToolFLPD, oToolWikiPage];

exports.testMatchAtool = function (test) {

  const result  = Analyze.analyzeAll('start catalog ABC in flpd in UV2 client 120',
    mRules,
  tools);
  // test.expect(3)
 //  test.deepEqual(result.weight, 120, 'correct weight');

  debuglog('result : ' + JSON.stringify(result, undefined, 2));

  debuglog('result : ' + JSON.stringify(result[0],undefined, 2));
  debuglog('top : ' + Match.ToolMatch.dumpWeightsTop(result, { top : 220 }));
  test.deepEqual(result.length, 528, 'correct length result');
  test.deepEqual(result[0].tool.name, 'FLPD', 'correct tool picked');
  test.done();
};

exports.testMatchTools = function (test) {
  const result = Analyze.analyzeAll('start wiki UI2 Integration',
  mRules,tools);
  // test.expect(3)
 //  test.deepEqual(result.weight, 120, 'correct weight');

  debuglog('result : ' + JSON.stringify(result, undefined, 2));
  debuglog('best result : ' + JSON.stringify(result[0] || {}, undefined, 2));
  debuglog('top : ' + Match.ToolMatch.dumpWeightsTop(result,{ top : 3 }));
  test.deepEqual(result.length, 28, 'correct length list');
  test.deepEqual(result[0].tool.name, 'wiki', 'correct tool picked');

  test.done();
};



exports.testMatchNonsence = function (test) {

  const result = Analyze.analyzeAll('start garbage from hell',
  mRules,tools);
  // test.expect(3)
 //  test.deepEqual(result.weight, 120, 'correct weight');

  debuglog('result : ' + JSON.stringify(result, undefined, 2));
  debuglog('best result : ' + JSON.stringify(result[0] || {}, undefined, 2));
  debuglog('top : ' + Match.ToolMatch.dumpWeightsTop(result,{ top : 3 }));
  test.deepEqual(result.length, 5, 'correct length list');
 // test.deepEqual(result[0].tool.name, 'Wiki', 'correct tool picked');

  test.done();
};
