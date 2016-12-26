/*! copyright gerd forstmann, all rights reserved */
//var debug = require('debug')('appdata.nunit');
var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

var Model = require(root + '/model/model.js');
var Meta = require(root + '/model/meta.js');



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


const MetaF = Meta.getMetaFactory();

exports.testgetResultAsArrayBad = function (test) {
  try {
    Model.getResultAsArray({}, MetaF.Domain('abc'), MetaF.Domain('def'));
    test.equal(true,false, 'everything ok');
  } catch(e) {
    //console.log(e.toString());
    test.deepEqual(e.toString().indexOf('relation') >= 0, true, '2nd arg not a relation');
  }
  test.done();
};


exports.testgetResultAsArrayOk = function (test) {
  var res = Model.getResultAsArray({ meta : {
    t3 : { 'domain -:- abc': {
      'relation -:- def' : { 'category -:- kkk' : {} }
    }}
  }}, MetaF.Domain('abc'), MetaF.Relation('def'));
  test.deepEqual(res[0].toFullString(), 'category -:- kkk', ' correct relation');
  test.done();
};

exports.testgetCategoriesForDomainBadDomain = function (test) {
  var u = Model.loadModels();
  try {
    Model.getCategoriesForDomain(u, 'notpresent');
    test.equal(true,false, 'everything ok');
  } catch(e) {
    test.deepEqual(e.toString().indexOf('notpresent') >= 0, true, 'flawed domain listed');
  }
  test.done();
};

exports.testgetDomainsForCategoryBadCategory = function (test) {
  var u = Model.loadModels();
  try {
    Model.getDomainsForCategory(u, 'notpresent');
    test.equal(true,false, 'everything ok');
  } catch(e) {
    test.deepEqual(e.toString().indexOf('notpresent') >= 0, true, 'flawed category listed');
  }
  test.done();
};


exports.testgetCategoriesForDomain = function (test) {
  test.expect(1);
  var u = Model.loadModels();
  //console.log('here the model ************ ' + JSON.stringify(u.meta.t3,undefined,2));
  var res = Model.getCategoriesForDomain(u, 'FioriFLP');
  test.deepEqual(res,
    [ 'client',
      'fiori intent',
      'systemId',
      'tool' ] , 'correct data read');
  test.done();
};



exports.testgetDomainsForCategory = function (test) {
  test.expect(1);
  var u = Model.loadModels();
  //console.log('here the model ************ ' + JSON.stringify(u.meta.t3,undefined,2));
  var res = Model.getDomainsForCategory(u, 'client');
  test.deepEqual(res,
    [ 'Fiori FLPD',
      'FioriFLP',
      'StartTA' ] , 'correct data read');
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



exports.testModelHasDomains = function (test) {
  test.expect(2);
  var u = Model.loadModels();

    // we expect a rule "domain" -> meta

  var r = u.mRules.filter(function(oRule) {
    return oRule.category === 'meta' && oRule.matchedString=== 'domain';
  });
  test.equals(r.length, 1, 'domain present');

  var r2 = u.mRules.filter(function(oRule) {
    return oRule.category === 'domain';
  });

  var rx = r2.map(function(oRule) { return oRule.matchedString; });

  test.deepEqual(rx.sort(),
    [ 'Fiori FLPD',
      'FioriFLP',
      'StartTA',
      'unit test',
      'wiki'
    ] , 'correct data read');
  test.done();

};