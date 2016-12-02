/**
 * @file
 * @module toolmatcher.nunit
 * @copyright (c) 2016 Gerd Forstmann
 */

var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

// var debug = require('debug')('toolmatcher.nunit');

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
  test.deepEqual(Object.keys(fn.missing).length, 0, 'correct length missing');
  test.deepEqual(Object.keys(fn.required).length, 4, 'correct length required');
  test.done();
};
