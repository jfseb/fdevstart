/*! copyright gerd forstmann, all rights reserved */
//var debug = require('debug')('appdata.nunit');
var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

var Model = require(root + '/model/model.js');


/**
 * Unit test for sth
 */
exports.testModel = function (test) {
  test.expect(2);
  var u = Model.loadModels();
  test.equal(u.tools.length, 5, 'no error');
  test.deepEqual(u.category.sort(),
    [ 'client',
      'fiori catalog',
      'fiori group',
      'fiori intent',
      'systemId',
      'tool',
      'transaction',
      'unit test',
      'wiki' ] , 'correct data read');
  test.done();

};
