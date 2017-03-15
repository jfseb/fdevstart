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
const InputFilter = require('abot_erbase').InputFilter;

const Result = Match.Result;
const InputFilterRules = require('abot_erbase').InputFilterRules;

const mRules = InputFilterRules.getMRulesSample();

var oToolFLPD = { 'name' : 'FLPD',
  'requires' : { 'systemId' : {}, 'client' :{}},
  'optional' : { 'fiori catalog' : {}, 'fiori group' :{}}
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


//xport function categorizeAWord(sWordGroup: string, rules: IMatch.SplitRules, sentence: string, words: { [key: string]: Array<IFMatch.ICategorizedString>},
//cntRec ? : ICntRec ) : IMatch.ICategorizedString[] {


exports.testWordCategorizationABC = function(test) {
  const result  = InputFilter.categorizeAWord('ABC', mRules, 'abc is def', {});
 // console.log('result : ' + JSON.stringify(result[0],undefined, 2));
  test.deepEqual(result,
    [ {
      string: 'ABC',
      matchedString: 'ABC',
      category: 'systemId',
      _ranking: 0.7 },
    { string: 'ABC',
      matchedString: 'ABC',
      category: 'fiori catalog',
      _ranking: 0.5 },
    { string: 'ABC',
      matchedString: 'ABC',
      category: 'systemObjectId',
      _ranking: 0.5 } ]);
  test.done();
};

exports.testMatchAtool = function (test) {

  const result  = Analyze.analyzeAll('start catalog ABC in flpd in UV2 client 120',
    mRules,
  tools);
  //console.log('result : ' + JSON.stringify(result[0],undefined, 2));
  debuglog('top : ' + Match.ToolMatch.dumpWeightsTop(result, { top : 5 }));
  //console.log(' length is ' + result.length);
  test.ok(result.length > 30 && result.length <500, 'correct length result');
  test.ok(result[0].rank > 0.8, 'rank sufficiently high');
  test.deepEqual(result[0].tool.name, 'FLPD', 'correct tool picked');

  //this is irritaging, but currently true
  //test.deepEqual(Result.getEntity(result[0],'fiori catalog').matchedString, 'ABC', 'correct catalog');
  test.deepEqual(Result.getEntity(result[0], 'systemId').matchedString, 'UV2', 'correct catalog');
  test.deepEqual(Result.getEntity(result[0], 'client').matchedString, '120', 'correct catalog');
  test.done();
};


exports.testMatchIncomplete = function (test) {
  const result  = Analyze.analyzeAll('start catalog ABC in flpd in UV2',
    mRules,
  tools);
  debuglog('here result ' + JSON.stringify(result[0]));

  test.equal(Analyze.isComplete(result[0]),false);

  var p = Analyze.getPrompt(result[0]);
  debuglog('here prompt ' + JSON.stringify(p));

  test.deepEqual(p,
    {
      category : 'client',
      text : 'Please provide a missing "' + 'client' + '"?'
    }
  );

  Analyze.setPrompt(result[0],p,'120');
  test.deepEqual(result[0].toolmatchresult.required['client'], {
    category : 'client',
    _ranking : 1.0,
    matchedString : '120'
  }, 'correct set prompt');
  test.done();
};


exports.testMatchTools = function (test) {
  const result = Analyze.analyzeAll('start wiki UI2 Integration',
  mRules,tools);
  // test.expect(3)
 //  test.deepEqual(result.weight, 120, 'correct weight');

 // debuglog('result : ' + JSON.stringify(result, undefined, 2));
 // debuglog('best result : ' + JSON.stringify(result[0] || {}, undefined, 2));
  debuglog('top : ' + Match.ToolMatch.dumpWeightsTop(result,{ top : 30 }));
// test.deepEqual(result.length, 28, 'correct length list');
  test.ok(result[0].rank > 0.8, 'rank sufficiently high');
  test.deepEqual(result[0].tool.name, 'wiki', 'correct tool picked');
  test.deepEqual(Result.getEntity(result[0], 'wiki').matchedString, 'UI2 Integration', 'correct tool picked');
  test.done();
};


exports.testMatchNonsence = function (test) {

  const result = Analyze.analyzeAll('start garbage from hell',
  mRules,tools);
  // test.expect(3)
 //  test.deepEqual(result.weight, 120, 'correct weight');

 // debuglog('result : ' + JSON.stringify(result, undefined, 2));
  debuglog('best result : ' + JSON.stringify(result[0] || {}, undefined, 2));
  debuglog('top : ' + Match.ToolMatch.dumpWeightsTop(result,{ top : 3 }));
  //test.deepEqual(result.length, 5, 'correct length list');
  test.ok(result[0].rank < 0.6, 'rank sufficiently low');
 // test.deepEqual(result[0].tool.name, 'Wiki', 'correct tool picked');

  test.done();
};
