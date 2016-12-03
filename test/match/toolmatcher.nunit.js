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
      {'matchedWord' : 'start', 'category' : 'filler'},
      {'matchedWord' : 'catalog', 'category' : 'category'},
      {'matchedWord' : 'ABC', 'category' : 'catalog'},
      {'matchedWord' : 'in', 'category' : 'filler'},
      {'matchedWord' : 'FLPD', 'category' : 'tool'},
      {'matchedWord' : 'in', 'category' : 'filler'},
      {'matchedWord' : 'UV2', 'category' : 'systemId'},
      {'matchedWord' : 'client', 'category' : 'category'},
      {'matchedWord' : '120', 'category' : 'client'}
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
  test.deepEqual(Object.keys(fn.spurious).length, 1, 'correct length spurious');
  test.done();
};


exports.testMatchAtoolIncomplete = function (test) {

  var oSentence = [
      {'matchedWord' : 'start', 'category' : 'filler'},
      {'matchedWord' : 'catalog', 'category' : 'category'},
      {'matchedWord' : 'ABC', 'category' : 'catalog'},
      {'matchedWord' : 'in', 'category' : 'filler'},
      {'matchedWord' : 'FLPD', 'category' : 'tool'},
      {'matchedWord' : 'in', 'category' : 'filler'},
      {'matchedWord' : 'UV2', 'category' : 'systemId'},
      {'matchedWord' : 'client', 'category' : 'category'},
      {'matchedWord' : 'UI2 Integrattion', 'category' : 'wiki'}
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
      {'matchedWord' : 'start', 'category' : 'filler'},
      {'matchedWord' : 'catalog', 'category' : 'category'},
      {'matchedWord' : 'ABC', 'category' : 'catalog'},
      {'matchedWord' : 'in', 'category' : 'filler'},
      {'matchedWord' : 'FLPD', 'category' : 'tool'},
      {'matchedWord' : 'in', 'category' : 'filler'},
      {'matchedWord' : 'UV2', 'category' : 'systemId'},
      {'matchedWord' : 'client', 'category' : 'category'},
      {'matchedWord' : 'UI2 Integrattion', 'category' : 'wiki'}
  ];

  var oSentence2 = [
      {'matchedWord' : 'start', 'category' : 'filler'},
      {'matchedWord' : 'wiki', 'category' : 'category'},
      {'matchedWord' : 'ABC', 'category' : 'catalog'},
      {'matchedWord' : 'in', 'category' : 'filler'},
      {'matchedWord' : 'FLPD', 'category' : 'tool'},
      {'matchedWord' : 'in', 'category' : 'filler'},
      {'matchedWord' : 'UV2', 'category' : 'systemId'},
      {'matchedWord' : 'client', 'category' : 'category'},
      {'matchedWord' : 'UI2 Integrattion', 'category' : 'wiki'}
  ];


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
  test.deepEqual(fn[0].tool.name, 'FLPD', 'correct length missing');

  test.deepEqual(Object.keys(fn[0].toolmatchresult.missing).length, 1, 'correct length missing');
  test.deepEqual(Object.keys(fn[0].toolmatchresult.required).length, 1, 'correct length required');
  test.deepEqual(Object.keys(fn[1].toolmatchresult.optional).length, 1, 'correct length optional');
  test.deepEqual(Object.keys(fn[1].toolmatchresult.spurious).length, 1, 'correct length spurious');
  test.done();
};


