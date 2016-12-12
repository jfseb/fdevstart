/*! copyright gerd forstmann, all rights reserved */
//var debug = require('debug')('appdata.nunit');
var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

var Model = require(root + '/model/model.js');


var Tools = require(root + '/match/tools.js');

var InputFilterRules = require(root + '/match/inputFilterRules.js');


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
      'url',
      'wiki' ] , 'correct data read');
  test.done();
};


/**
 * Unit test for sth
 */
exports.testModelCheckExactOnly = function (test) {
  test.expect(1);
  var u = Model.loadModels();
  var res = u.mRules.filter(function(oRule) {
    return oRule.exactOnly === true;
  });
  test.equal(res.length, 113 , 'correct flag applied');
  test.done();
};


var fs = require('fs');
/**
 * Unit test for sth
 */
exports.testModel2 = function (test) {
  test.expect(2);
  var u = Model.loadModels();

  fs.writeFileSync('logs/model.tools.json', JSON.stringify(u.tools, undefined,2));

  fs.writeFileSync('logs/model.mRules.json', JSON.stringify(u.mRules, undefined,2));


  var tools = Tools.getTools();
  fs.writeFileSync('logs/modelx.tools.json', JSON.stringify(tools,undefined,2));

  var rulesSample = InputFilterRules.getMRulesSample();
  fs.writeFileSync('logs/modelSample.mRules.json', JSON.stringify(rulesSample,undefined,2));

  var rulesFull = InputFilterRules.getMRulesFull();
  fs.writeFileSync('logs/modelFull.mRules.json', JSON.stringify(rulesFull,undefined,2));

  fs.writeFileSync('logs/model.all.json', JSON.stringify(u, undefined,2));

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
      'url',
      'wiki' ] , 'correct data read');
  test.done();

};