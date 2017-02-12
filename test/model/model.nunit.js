/*! copyright gerd forstmann, all rights reserved */
//var debug = require('debug')('appdata.nunit');
var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

var Model = require(root + '/model/model.js');
var Meta = require(root + '/model/meta.js');



var Tools = require(root + '/match/tools.js');

var InputFilterRules = require(root + '/match/inputFilterRules.js');

var theModel = Model.loadModels();

/**
 * Unit test for sth
 */
exports.testModel = function (test) {
  test.expect(2);
  var u = theModel;
  test.equal(u.tools.length, 5, 'no error');
  test.deepEqual(u.category.sort(),
    [ '_url',
      'albedo',
      'atomic weight',
      'client',
      'distance',
      'eccentricity',
      'element name',
      'element number',
      'element properties',
      'element symbol',
      'fiori catalog',
      'fiori group',
      'fiori intent',
      'mass',
      'object name',
      'object type',
      'orbit radius',
      'orbital period',
      'orbits',
      'radius',
      'systemId',
      'tool',
      'transaction',
      'unit test',
      'url',
      'visual luminosity',
      'visual magnitude',
      'wiki' ]
   , 'correct data read');
  test.done();
};

exports.testModelGetOperator = function (test) {
  test.expect(1);
  var op = Model.getOperator(theModel,'containing');
  test.deepEqual(op,
    {
      'arity': 2,
      'operator' : 'containing',
      'argcategory': [
        [
          'category'
        ],
        [
          '_fragment'
        ]
      ]
    }
  , 'no error');
  test.done();
};


exports.testgetAllRecordCategoriesForTargetCategory = function (test) {

  var res = Model.getAllRecordCategoriesForTargetCategory(theModel, 'element name');
  test.deepEqual(res, {
    'element name': true,
    'element symbol' : true,
    'atomic weight' : true,
    'element properties': true,
    'element number' : true
  });
  test.done();
};


exports.testModelGetDomainIndex = function (test) {
  var res = Model.getDomainBitIndex('IUPAC', theModel);
  test.equal(res, 0x0020);
  test.done();
};
exports.testModelGetDomainIndexNotPresent = function (test) {
  var res = Model.getDomainBitIndex('NOTPRESENT', theModel);
  test.equal(res, 0x00100, 'abc');
  test.done();
};


exports.testModelGetDomainIndexThrows = function (test) {
  var a = [];
  for(var i = 0; i < 32; ++i) {
    a.push('xx');
  }
  try {
    Model.getDomainBitIndex('IUPAC', { domains : a });
    test.equal(1,0);
  } catch(e) {
    test.equal(1,1);
  }
  test.done();
};

exports.testAddSplitSingleWord = function(test) {
  var seenIt = {};
  var rules = [];

  var newRule =  {
    category: 'stars',
    matchedString: 'AlphaCentauriA',
    type: 0,
    word: 'Alpha Centauri A',
    lowercaseword: 'alphacentauria',
    bitindex : 0x32,
    _ranking: 0.95
  };
  Model.addBestSplit(rules,newRule, seenIt);
  test.equals(rules.length, 0);
  test.done();
};

exports.testAddSplitNotCombinable = function(test) {
  var seenIt = {};
  var rules = [];
  var newRule =  {
    category: 'stars',
    matchedString: 'AlphaCentauriA',
    type: 0,
    word: 'Peter, Paul and Mary',
    lowercaseword: 'Peter, Paul and Mary',
    bitindex : 0x10,
    _ranking: 0.95
  };
  Model.addBestSplit(rules,newRule, seenIt);
  test.equals(rules.length, 0);
  test.done();
};


exports.testAddSplit = function(test) {

  var seenIt = {};

  var rules = [];

  var newRule =  {
    category: 'stars',
    matchedString: 'Alpha Centauri A',
    type: 0,
    word: 'Alpha Centauri A',
    lowercaseword: 'alpha centauri a',
    bitindex : 0x20,
    _ranking: 0.95
  };

  Model.global_AddSplits = true;
  Model.addBestSplit(rules, newRule, seenIt);
  Model.global_AddSplits = false;

  test.deepEqual(rules[0], { category: 'stars',
    matchedString: 'Alpha Centauri A',
    bitindex: 32,
    word: 'centauri',
    type: 0,
    lowercaseword: 'centauri',
    _ranking : 0.95,
    range:
    { low: -1,
      high: 1,
      rule: newRule }
  }
  );
  test.done();

};

exports.testModelHasDomainIndexinRules = function (test) {
  var a = [];
  for(var i = 0; i < 32; ++i) {
    a.push('xx');
  }
  try {
    Model.getDomainBitIndex('IUPAC', { domains : a });
    test.equal(1,0);
  } catch(e) {
    test.equal(1,1);
  }
  test.done();
};


exports.testModelHasDomainIndexInDomains = function (test) {
  // check that every domain has an index which is distinct
  var all = 0;
  theModel.domains.forEach(function(o) {
    var idx = theModel.full.domain[o].bitindex;
    test.equal(idx !== 0, true);
    //console.log(all);
    all = all | idx;
  });
  test.equal(all, 0x000FF);
  test.done();
};


exports.testModelHasDomainIndexInAllRules = function (test) {
  // check that every domain has an index which is distinct
  var all = 0;
  theModel.domains.forEach(function(o) {
    var idx = theModel.full.domain[o].bitindex;
    test.equal(idx !== 0, true);
    //console.log(all);
    all = all | idx;
  });
  test.equal(all, 0x000FF);
  test.done();
};



exports.testgetAllRecordCategoriesForTargetCategories1 = function (test) {

  try {
    Model.getAllRecordCategoriesForTargetCategories(theModel, ['element name', 'wiki' ]);
    test.equal(true,false);
  } catch(e) {
    test.equal(e.toString(), 'Error: categories "element name" and "wiki" have no common domain.');
  }
  test.done();
};


exports.testgetAllRecordCategoriesForTargetCategories2 = function (test) {

  var res = Model.getAllRecordCategoriesForTargetCategories(theModel, ['element name', 'element symbol']);
  test.deepEqual(res, {
    'element name': true,
    'element symbol' : true,
    'atomic weight' : true,
    'element number' : true
  });
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
    [
      'Fiori FLPD',
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
  test.equal(res.length, 234 , 'correct flag applied');
  test.done();
};

exports.testMakeWordMap = function(test) {
  var rules  = [
    { type : 0, lowercaseword : 'abc', category : '1', bitindex : 0x1 },
    { type : 1, lowercaseword : 'def', category : '2', bitindex : 0x10 },
    { type : 0 , lowercaseword : 'klm', category : '4', bitindex : 0x100},
    { type : 0 , lowercaseword : 'abc', category : '3', bitindex : 0x80},
  ];
  var res = Model.splitRules(rules);

  test.deepEqual(res,
    { allRules : [
      { type : 0, lowercaseword : 'abc', category : '1', bitindex : 0x1 },
    { type : 1, lowercaseword : 'def', category : '2', bitindex : 0x10},
    { type : 0 , lowercaseword : 'klm', category : '4', bitindex : 0x100},
    { type : 0 , lowercaseword : 'abc', category : '3', bitindex : 0x80},
    ],
      wordMap : {
        'abc' : { bitindex : 0x81,
          rules: [
            { type : 0, lowercaseword : 'abc', category : '1', bitindex : 0x1 },
            { type : 0 , lowercaseword : 'abc', category : '3', bitindex : 0x80 }
          ]
        },
        'klm' : { bitindex : 0x100,
          rules: [
           { type : 0 , lowercaseword : 'klm', category : '4', bitindex : 0x100 }
          ]
        }
      },
      nonWordRules : [ { type : 1, lowercaseword : 'def', category : '2', bitindex : 0x10 } ]
    }
 );
  test.done();
};


/**
 * Unit test for sth
 */
exports.testCategorySorting = function (test) {
  var map = { 'a' : { importance : 0.1}, 'b' : { importance : 0.2 },
    'd' : { importance : 0.2 } , 'c' : { importance: 0.2}, 'f' : { }};

  test.equals(Model.rankCategoryByImportance({}, 'uu', 'ff'), 1, 'localcomp');
  test.equals(Model.rankCategoryByImportance({ 'uu' : {} }, 'uu', 'ff'), -1, 'onehas');

  test.equals(Model.rankCategoryByImportance({ 'uu' : { } , 'ff' : {importance  : 1 } }, 'uu', 'ff'), 98, '2ndimp');
  test.equals(Model.rankCategoryByImportance({ 'uu' : {  importance : 0.1 } , 'ff' : {importance  : 1 } }, 'uu', 'ff'), -0.9, 'firstmoreimp');

  var res = Model.sortCategoriesByImportance(map, ['j', 'e', 'f', 'b', 'c', 'd', 'a', 'b', 'h']);
  test.deepEqual( res, ['a', 'b', 'b', 'c', 'd', 'f', 'e', 'h', 'j']);
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

    [ '_url',
      'albedo',
      'atomic weight',
      'client',
      'distance',
      'eccentricity',
      'element name',
      'element number',
      'element properties',
      'element symbol',
      'fiori catalog',
      'fiori group',
      'fiori intent',
      'mass',
      'object name',
      'object type',
      'orbit radius',
      'orbital period',
      'orbits',
      'radius',
      'systemId',
      'tool',
      'transaction',
      'unit test',
      'url',
      'visual luminosity',
      'visual magnitude',
      'wiki' ]
 , 'correct data read');
  test.done();

};


exports.testFindNextLen = function (test) {
  var offsets = [0,0,0,0,0,0];
  Model.findNextLen(0,['a','a','bb','bb','ccc','ccc','dddd', 'dddd', '123456', '123456'], offsets);
  test.deepEqual(offsets,[0,0,0,0,0,0],' target 0');
  Model.findNextLen(1,['a','a','bb','bb','ccc','ccc','dddd', 'dddd', '123456', '123456'], offsets);
  test.deepEqual(offsets,[0,0,0,0,0,2],' target 1');

  Model.findNextLen(2,['a','a','bb','bb','ccc','ccc','dddd', 'dddd', '123456', '123456'], offsets);
  test.deepEqual(offsets,[0,0,0,0,2,4],' target 2');
  Model.findNextLen(3,['a','a','bb','bb','ccc','ccc','dddd', 'dddd', '123456', '123456'], offsets);
  test.deepEqual(offsets,[0,0,0,2,4,6],' target 3');
  Model.findNextLen(4,['a','a','bb','bb','ccc','ccc','dddd', 'dddd', '123456', '123456'], offsets);
  test.deepEqual(offsets,[0,0,2,4,6,8],' target 4');
  Model.findNextLen(5,['a','a','bb','bb','ccc','ccc','dddd', 'dddd', '123456', '123456'], offsets);
  test.deepEqual(offsets,[0,2,4,6,8,8],' target 5');
  Model.findNextLen(6,['a','a','bb','bb','ccc','ccc','dddd', 'dddd', '123456', '123456'], offsets);
  test.deepEqual(offsets,[2,4,6,8,8,10],' target 6');

  test.done();
};




exports.testModelGetColumns = function (test) {
  test.expect(1);
  var u = Model.loadModels();

    // we expect a rule "domain" -> meta
  //console.log(JSON.stringify(u.rawModels));
  var res = Model.getTableColumns(u,'IUPAC');
  test.deepEqual(res,
    [ 'element symbol',
      'element number',
      'element name'
    ] , 'correct data read');
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
  //console.log(JSON.stringify(r2,undefined,2));
  var rx = r2.map(function(oRule) { return oRule.matchedString; });
  // remove duplicates
  rx.sort();
  rx = rx.filter( (u,index) => rx[index-1] !== u);

  test.deepEqual(rx.sort(),
    [ 'Cosmos',
      'Fiori FLPD',
      'FioriFLP',
      'IUPAC',
      'Philosophers elements',
      'StartTA',
      'unit test',
      'wiki'
    ] , 'correct data read');
  test.done();

};