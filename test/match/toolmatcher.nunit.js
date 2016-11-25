/**
 * @file
 * @module toolmatcher.nunit
 * @copyright (c) 2016 Gerd Forstmann
 */

var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

var debuglog = require('debug')('toolmatcher.nunit');

const toolmatcher = require(root + '/match/toolmatcher.js');

exports.testMatchAtool = function (test) {

  var oSentence = [
      {'matchedString' : 'start', 'category' : 'filler'},
      {'matchedString' : 'catalog', 'category' : 'category'},
      {'matchedString' : 'ABC', 'category' : 'catalog'},
      {'matchedString' : 'in', 'category' : 'filler'},
      {'matchedString' : 'FLPD', 'category' : 'tool'},
      {'matchedString' : 'in', 'category' : 'filler'},
      {'matchedString' : 'UV2', 'category' : 'systemId'},
      {'matchedString' : 'client', 'category' : 'category'},
      {'matchedString' : '120', 'category' : 'client'}
  ];

  var oTool = { 'name' : 'FLPD',
    'requires' : { 'systemId' : {}, 'client' :{}},
    'optional' : { 'catalog' : {}, 'group' :{}}
  };

  const fn = toolmatcher.matchTool(oSentence, oTool);
  // test.expect(3)
 //  test.deepEqual(fn.weight, 120, 'correct weight');

  debuglog('result : ' + JSON.stringify(fn, undefined, 2));
  test.deepEqual(Object.keys(fn.missing).length, 0, 'correct length missing');
  test.deepEqual(Object.keys(fn.required).length, 2, 'correct length required');
  test.deepEqual(Object.keys(fn.optional).length, 1, 'correct length optional');
  test.deepEqual(Object.keys(fn.spurious).length, 0, 'correct length spurious');
  test.deepEqual(Object.keys(fn.toolmentioned).length, 1, 'correct length toolmentioned');
  test.done();
};


exports.testMatchAtoolIncomplete = function (test) {

  var oSentence = [
      {'matchedString' : 'start', 'category' : 'filler'},
      {'matchedString' : 'catalog', 'category' : 'category'},
      {'matchedString' : 'ABC', 'category' : 'catalog'},
      {'matchedString' : 'in', 'category' : 'filler'},
      {'matchedString' : 'FLPD', 'category' : 'tool'},
      {'matchedString' : 'in', 'category' : 'filler'},
      {'matchedString' : 'UV2', 'category' : 'systemId'},
      {'matchedString' : 'client', 'category' : 'category'},
      {'matchedString' : 'UI2 Integrattion', 'category' : 'wiki'}
  ];

  var oTool = { 'name' : 'FLPD',
    'requires' : { 'systemId' : {}, 'client' :{}},
    'optional' : { 'catalog' : {}, 'group' :{}}
  };

  const fn = toolmatcher.matchTool(oSentence, oTool);
  // test.expect(3)
 //  test.deepEqual(fn.weight, 120, 'correct weight');

  debuglog('result : ' + JSON.stringify(fn, undefined, 2));
  test.deepEqual(Object.keys(fn.missing).length, 1, 'correct length missing');
  test.deepEqual(Object.keys(fn.required).length, 1, 'correct length required');
  test.deepEqual(Object.keys(fn.optional).length, 1, 'correct length optional');
  test.deepEqual(Object.keys(fn.spurious).length, 1, 'correct length spurious');
  test.done();
};




exports.testMatchTools = function (test) {

  var oSentence1 = [
      {'matchedString' : 'start', 'category' : 'filler'},
      {'matchedString' : 'catalog', 'category' : 'category'},
      {'matchedString' : 'ABC', 'category' : 'catalog'},
      {'matchedString' : 'in', 'category' : 'filler'},
      {'matchedString' : 'FLPD', 'category' : 'tool'},
      {'matchedString' : 'in', 'category' : 'filler'},
      {'matchedString' : 'UV2', 'category' : 'systemId'},
      {'matchedString' : 'client', 'category' : 'category'},
      {'matchedString' : 'UI2 Integrattion', 'category' : 'wiki'}
  ].map(function(oMember) { oMember._ranking = 1; return oMember; });

  var oSentence2 = [
      {'matchedString' : 'start', 'category' : 'filler'},
      {'matchedString' : 'wiki', 'category' : 'category'},
      {'matchedString' : 'ABC', 'category' : 'catalog'},
      {'matchedString' : 'in', 'category' : 'filler'},
      {'matchedString' : 'FLPD', 'category' : 'tool'},
      {'matchedString' : 'in', 'category' : 'filler'},
      {'matchedString' : 'UV2', 'category' : 'systemId'},
      {'matchedString' : 'client', 'category' : 'category'},
      {'matchedString' : 'UI2 Integrattion', 'category' : 'wiki'}
  ].map(function(oMember) { oMember._ranking = 1; return oMember; });


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

  const fn = toolmatcher.matchTools([oSentence1, oSentence2],
  [oToolWiki, oToolFLPD, oToolWikiPage] );
  // test.expect(3)
 //  test.deepEqual(fn.weight, 120, 'correct weight');

  debuglog('result : ' + JSON.stringify(fn, undefined, 2));

  test.deepEqual(fn.length, 4, 'correct length list');
  test.deepEqual(fn[0].tool.name, 'Wiki', 'correct tool result');

 // TODO: this is an edge case and may require some tuning !
 // this is some really questionable result
//  test.deepEqual(Object.keys(fn[0].toolmatchresult.missing).length, 1, 'correct length missing');
//  test.deepEqual(Object.keys(fn[0].toolmatchresult.required).length, 1, 'correct length required');
//  test.deepEqual(Object.keys(fn[1].toolmatchresult.optional).length, 1, 'correct length optional');
//  test.deepEqual(Object.keys(fn[1].toolmatchresult.spurious).length, 1, 'correct length spurious');
  test.done();
};


