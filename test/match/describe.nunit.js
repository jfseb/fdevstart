/**
 * @file
 * @module toolmatcher.nunit
 * @copyright (c) 2016 Gerd Forstmann
 */

var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

var debuglog = require('debug')('describe.nunit');

//var debuglog = require('debug')('listall.nunit');

const Describe = require(root + '/match/describe.js');

const Model = require(root + '/model/model.js');
const theModel = Model.loadModels();

exports.testSloppyOrExactExact = function (test) {
  var res = Describe.sloppyOrExact('unit tests', 'unit tEsts', theModel);
  test.deepEqual(res, '"unit tEsts"');
  test.done();
};

exports.testSloppyOrExactPlural = function (test) {
  var res = Describe.sloppyOrExact('unit test', 'Unit tests', theModel);
  test.deepEqual(res, '"Unit tests" (interpreted as "unit test")');
  test.done();
};

exports.testSloppyOrExactSloppy = function (test) {
  var res = Describe.sloppyOrExact('unit tests', 'Uint tests', theModel);
  test.deepEqual(res, '"Uint tests" (interpreted as "unit tests")');
  test.done();
};

exports.testSloppyOrExactSyn = function (test) {
  var res = Describe.sloppyOrExact('element name','name', theModel);
  test.deepEqual(res, '"name" (interpreted as synonym for "element name")');
  test.done();
};

exports.testCountPresence = function (test) {
  var res = Describe.countRecordPresence('orbits', 'Cosmos', theModel);
  test.deepEqual(res, {
    totalrecords : 7,
    presentrecords : 3,
    values : { 'Sun' : 2, 'Alpha Centauri C' : 1, undefined : 3 , 'n/a' : 1 },
    multivalued : false
  });
  test.done();
};

exports.testDescribeFactInDomain = function (test) {
  var res = Describe.describeFactInDomain('nomatchnotevenclose', undefined, theModel);
  var cmp = 'I don\'t know anything about "nomatchnotevenclose".\n';
  debuglog(res);
  debuglog(cmp);
  test.equals(res,cmp);
  test.done();
};

exports.testDescribeFactInDomainFilter = function (test) {
  var res = Describe.describeFactInDomain('nomatchnotevenclose', 'IUPAC', theModel);
  var cmp = '"nomatchnotevenclose" is no known fact in domain "IUPAC".\n';
  debuglog(res);
  debuglog(cmp);
  test.equals(res,cmp);
  test.done();
};

exports.testDescribeFactInDomainSun = function (test) {
  var res = Describe.describeFactInDomain('sun', undefined, theModel);
  //var cmp = '"sun" has a meaning in domain "Cosmos":\n"sun" ...\nis a value for category "orbits" present in 2(28.6%) of records;\nis a value for category "object name" present in 1(14.3%) of records;\n' == '"sun" has a meaning in domain "Cosmos":\n"sun" is a value for category "orbits" present in 2(28.6%) of records;\n';
  //var cmp = '"sun" has a meaning in domain "Cosmos":\n"sun" ...\nis a value for category "orbits" present in 2(28.6%) of records;\nis a value for category "object name" present in 1(14.3%) of records;\n';
  var cmp =  '"sun" has a meaning in one domain "Cosmos":\n"sun" ...\nis a value for category "orbits" present in 2(28.6%) of records;\nis a value for category "object name" present in 1(14.3%) of records;\n';
  debuglog(res);
  debuglog(cmp);
  test.equals(res,cmp);
  test.done();
};

exports.testDescribeFactInDomainSunCosmos = function (test) {
  var res = Describe.describeFactInDomain('sun', 'Cosmos', theModel);

  var cmp = '"sun" has a meaning in domain "Cosmos":\n"sun" ...\nis a value for category "orbits" present in 2(28.6%) of records;\nis a value for category "object name" present in 1(14.3%) of records;\n';

  debuglog(res);
  debuglog(cmp);
  test.equals(res,cmp);
  test.done();
};

exports.testDescribeFactInDomainProxima2 = function (test) {
  var res = Describe.describeFactInDomain('Proxima Centauri', 'Cosmos', theModel);
  var cmp =`"Proxima Centauri" has a meaning in domain "Cosmos":
"Proxima Centauri" (interpreted as "Alpha Centauri C") is a value for category "object name" present in 1(14.3%) of records;\n`;

  cmp = '"Proxima Centauri" has a meaning in domain "Cosmos":\n"Proxima Centauri" (interpreted as "Alpha Centauri C") is a value for category "object name" present in 1(14.3%) of records;\n"Proxima Centauri" (interpreted as "Proxima Centauri b") is a value for category "object name" present in 1(14.3%) of records;\n';

  cmp = '"Proxima Centauri" has a meaning in domain "Cosmos":\n"Proxima Centauri" (interpreted as "Alpha Centauri C") is a value for category "object name" present in 1(14.3%) of records;\n';


  debuglog(res);
  debuglog(cmp);
  test.equals(res,cmp);
  test.done();
};

///TODO FIX THIS

exports.testDescribeFactInDomainAlpha = function (test) {
  var res = Describe.describeFactInDomain('Alpha Centauri C', 'Cosmos', theModel);
  var cmp = '"Alpha Centauri C" has a meaning in domain "Cosmos":\n' +
  '"Alpha Centauri C" ...\n' +
      'is a value for category "object name" present in 1(14.3%) of records;\n' +
      'is a value for category "orbits" present in 1(14.3%) of records;\n' ;

  cmp =
'"Alpha Centauri C" has a meaning in domain "Cosmos":\n"Alpha Centauri C" (interpreted as "Alpha Centauri A") is a value for category "object name" present in 1(14.3%) of records;\n"Alpha Centauri C" (interpreted as "Alpha Centauri B") is a value for category "object name" present in 1(14.3%) of records;\n"Alpha Centauri C" ...\nis a value for category "object name" present in 1(14.3%) of records;\nis a value for category "orbits" present in 1(14.3%) of records;\n';


  debuglog(res);
  debuglog(cmp);
  test.equals(res,cmp);
  test.done();
};

exports.testDescribeFactInDomainAlphaFuzz = function (test) {
  var res = Describe.describeFactInDomain('Alpha Centauri X', 'Cosmos', theModel);
  var cmp =`"Alpha Centauri X" has a meaning in domain "Cosmos":
"Alpha Centauri X" (interpreted as "Alpha Centauri A") is a value for category "object name" present in 1(14.3%) of records;
"Alpha Centauri X" (interpreted as "Alpha Centauri B") is a value for category "object name" present in 1(14.3%) of records;
"Alpha Centauri X" (interpreted as "Alpha Centauri C") ...
is a value for category "object name" present in 1(14.3%) of records;
is a value for category "orbits" present in 1(14.3%) of records;\n`;
  debuglog(res);
  debuglog(cmp);
  test.equals(res,cmp);
  test.done();
};


exports.testDescribeFactInDomainBluePlanet = function (test) {
  var res = Describe.describeFactInDomain('blue planet', 'Cosmos', theModel);
  var cmp = '"blue planet" has a meaning in domain "Cosmos":\n' +
    '"blue planet" (interpreted as "earth") is a value for category "object name" present in 1(14.3%) of records;\n';
  debuglog(res);
  debuglog(cmp);
  test.equals(res,cmp);
  test.done();
};



exports.testDescribeFactInDomainEarth = function (test) {
  //TODO , restrict synonyms per domain!
  var res = Describe.describeFactInDomain('earth', undefined, theModel);
  var cmp = `"earth" has a meaning in 2 domains: "Cosmos" and "Philosophers elements"
in domain "Cosmos" "earth" is a value for category "object name" present in 1(14.3%) of records;
in domain "Philosophers elements" "earth" is a value for category "element name" present in 1(25.0%) of records;\n`;
  debuglog(res);
  debuglog(cmp);
  test.equals(res,cmp);
  test.done();
};


exports.testDescribeFactInDomainBluePlanetAll = function (test) {
  //TODO , restrict synonyms per domain!
  var res = Describe.describeFactInDomain('blue planet', undefined, theModel);
  var cmp = `"blue planet" has a meaning in one domain "Cosmos":
"blue planet" (interpreted as "earth") is a value for category "object name" present in 1(14.3%) of records;\n`;
  debuglog(res);
  debuglog(cmp);
  test.equals(res,cmp);
  test.done();
};

exports.testDescribeFactInDomainSIUPAC = function (test) {
  var res = Describe.describeFactInDomain('sun', 'IUPAC', theModel);
  var cmp = '"sun" is no known fact in domain "IUPAC".\n';
  debuglog(res);
  debuglog(cmp);
  test.equals(res,cmp);
  test.done();
};

exports.testDescribeDomain = function (test) {
  var oRes = Describe.describeDomain('cusmos', 'Cosmos', theModel);
  test.deepEqual(oRes,
 '"cusmos" (interpreted as "Cosmos")is a domain with 13 categories and 7 records\nDescription:a model with a small subset of cosmological entities. Main purpose is to test \na)properties which occur multiple times (e.g. "Sun" in "object name" as key and in "orbits"; \nb) "earth" as a property which is also present in a differnt model\n' );
  test.done();
};

exports.testDescribeFactWhichIsADomain = function (test) {
  var oRes = Describe.describeFactInDomain('cusmos', undefined, theModel);
  test.deepEqual(oRes,
 '"cusmos" (interpreted as "Cosmos")is a domain with 13 categories and 7 records\nDescription:a model with a small subset of cosmological entities. Main purpose is to test \na)properties which occur multiple times (e.g. "Sun" in "object name" as key and in "orbits"; \nb) "earth" as a property which is also present in a differnt model\n' );
  test.done();
};


exports.testDescribeCategoryStatsInDomain = function (test) {
  var oRes = Describe.getCategoryStatsInDomain('element name', 'IUPAC', theModel);
  test.deepEqual(oRes,
    {
      categoryDesc:
      { name: 'element name',
        description: 'element name',
        defaultWidth: 120,
        QBE: true,
        LUNRIndex: true,
        synonyms: [ 'name' ] },
      distinct: '118',
      delta: '',
      presentRecords: 118,
      percPresent: '100.0',
      sampleValues: 'Possible values are ...\n"actinium", "aluminium", "americium", "antimony", "argon", "arsenic", "astatine" ...' });
  test.done();
};


exports.testMakeValuesListOne = function (test) {
  var res = Describe.makeValuesListString(['abc'] );
  test.deepEqual(res, 'The sole value is "abc"');
  test.done();
};



exports.testMakeValuesListEarth = function (test) {
  var res = Describe.makeValuesListString(['earth', 'fire', 'water', 'wind']);
  test.deepEqual(res, 'Possible values are ...\n"earth", "fire", "water" or "wind"');
  test.done();
};


exports.testMakeValuesListFits = function (test) {
  var res = Describe.makeValuesListString(['abc', 'def', 'hif', 'klm']);
  test.deepEqual(res, 'Possible values are ...\n"abc", "def", "hif" or "klm"');
  test.done();
};

exports.testMakeValuesListNoFit = function (test) {
  var res = Describe.makeValuesListString(['abc', 'def', 'hiasfasfasfsaf', 'klasfasfasfsafasfm', 'hijsasfasfasfasfdfsf', 'desafsfasff', 'kasdfasfsafsafdlm']);
  test.deepEqual(res, 'Possible values are ...\n"abc", "def", "hiasfasfasfsaf", "klasfasfasfsafasfm", "hijsasfasfasfasfdfsf" ...');
  test.done();
};



exports.testMakeValuesListLong = function (test) {
  var val1 = 'abcs';
  var val2 = 'abcsadlfaj askdf skfjKKKKK aksdlfj saldkf jaslkfdjas lfjsad flskjaf lsdfkjs alfjks df';
  var val3 = 'abcsadlfaj askdf skfjKKKKK aksdlfj saldkf jaslkfdjas lfjsad flskjaf lsdfkjs alfjks df';
  var res = Describe.makeValuesListString([val1,val2, val3, 'SAFSDFSDF']);
  test.equals(res, 'Possible values are ...\n(1): "' + val1 +
  '"\n(2): "' + val2 + '"\n(3): "' + val3 + '"\n...');
  test.done();
};


exports.testMakeValuesListLong3 = function (test) {
  // no ...
  var val1 = 'abcs';
  var val2 = 'abcsadlfaj askdf skfjKKKKK aksdlfj saldkf jaslkfdjas lfjsad flskjaf lsdfkjs alfjks df';
  var val3 = 'abcsadlfaj askdf skfjKKKKK aksdlfj saldkf jaslkfdjas lfjsad flskjaf lsdfkjs alfjks df';
  var res = Describe.makeValuesListString([val1,val2, val3]);
  test.deepEqual(res, 'Possible values are ...\n(1): "' + val1 +
  '"\n(2): "' + val2 + '"\n(3): "' + val3 + '"\n');
  test.done();
};

var ELEMENT_NAME_IUPAC =
'is a category in domain "IUPAC"\nIt is present in 118 (100.0%) of records in this domain,\n'
 +  'having 118 distinct values.\n'
  + 'Possible values are ...\n"actinium", "aluminium", "americium", "antimony", "argon", "arsenic", "astatine" ...';

ELEMENT_NAME_IUPAC = 'is a category in domain "IUPAC"\nIt is present in 118 (100.0%) of records in this domain,\n'
+'having 118 distinct values.\n'
+'Possible values are ...\n"actinium", "aluminium", "americium", "antimony", "argon", "arsenic", "astatine" ...\nDescription: element name';



exports.testDescribeInDomain = function (test) {
  var res = Describe.describeCategoryInDomain('element name', 'IUPAC', theModel);
  debuglog(res);
  var cmp =  ELEMENT_NAME_IUPAC;
  debuglog(cmp);
  test.deepEqual(res,cmp);
  test.done();
};


exports.testDescribeCategoryInhomogeneous = function (test) {
  var res = Describe.describeCategory('orbits', undefined, theModel, 'abc');
  var cmp = 'is a category in domain "Cosmos"\nIt is present in 3 (42.9%) of records in this domain,\nhaving 2(+2) distinct values.\nPossible values are ...\n"Alpha Centauri C" or "Sun"\nDescription: for planets, name of the central entity' ;
  //
  //var cmp = 'is a category in domain "Cosmos"\nIt is present in 3 (42.9%) of records in this domain,\nhaving 2(+2) distinct values.\nPossible values are ...\n"Alpha Centauri C" or "Sun"\nDescription:';
  debuglog(res);
  debuglog([cmp]);
  test.deepEqual(res,[cmp]);
  test.done();
};


exports.testDescribeCategoryEcc = function (test) {
  var res = Describe.describeCategory('eccentricity', undefined, theModel, 'abc');
  var cmp = 'is a category in domain "Cosmos"\nIt is present in 2 (28.6%) of records in this domain,\nhaving 2(+1) distinct values.\n'
  + 'Possible values are ...\n"0.0167" or "0.0934"';
  debuglog(res);
  debuglog([cmp]);
  test.deepEqual(res,[cmp]);
  test.done();
};


exports.testDescribeCategoryMult = function (test) {
  var res = Describe.describeCategory('element name', undefined, theModel, 'abc');
  var cmp1 =
 'is a category in domain "Philosophers elements"\nIt is present in 4 (100.0%) of records in this domain,\nhaving 4 distinct values.\nPossible values are ...\n"earth", "fire", "water" or "wind"\nDescription: name of the philosophical element' ;

//  'is a category in domain "Philosophers elements"\nIt is present in 4 (100.0%) of records in this domain,\nhaving 4 distinct values.\nPossible values are ...\n"earth", "fire", "water" or "wind"';
  var cmp2 =  ELEMENT_NAME_IUPAC;
  debuglog(res[0]);
  debuglog(res[0]);

  test.deepEqual(res[0], cmp2);
  test.deepEqual(res[1], cmp1);
  test.done();
};
