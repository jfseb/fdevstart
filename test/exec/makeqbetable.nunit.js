/**
 * @file
 * @module toolmatcher.nunit
 * @copyright (c) 2016 Gerd Forstmann
 */

var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

//var debuglog = require('debug')('maketable.nunit');

const MakeTable = require(root + '/exec/makeqbetable.js');
const Model = require(root + '/model/model.js');

const theModel = Model.loadModels();



exports.testMakeTableNoCommonDomain = function(test) {
  //console.log(JSON.stringify(theModel));
  var res = MakeTable.makeTable(['element name', 'orbit radius'], theModel);
  test.deepEqual(res,
    { text: 'No commxon domains for "element name" and "orbit radius"',
      action: {} }
  );
  test.done();
};

exports.testMakeTable = function(test) {
  var res = MakeTable.makeTable(['element name', 'element number'], theModel);
  test.equal(res.text, 'Creating and starting table with "element name" and "element number"', 'text ok');
  test.equal(res.action.url,  'table_iupac?c2,1' , 'acttion ok ');
  test.done();
};

exports.testMakeTableIllegalCol = function(test) {
  var res = MakeTable.makeTable(['element name', 'element number', 'atomic weight'], theModel);
  test.equal(res.text,
  'I had to drop "atomic weight". But here you go ...\nCreating and starting table with "element name" and "element number"',
   'text ok');
  test.equal(res.action.url,  'table_iupac?c2,1' , 'acttion ok ');
  test.done();
};
