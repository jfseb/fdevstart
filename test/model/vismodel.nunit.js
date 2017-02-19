var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

//var debug = require('debug')('vismodel.nunit');

const Vismodel = require(root + '/model/vismodel.js');

const Model = require('fdevsta_monmove').Model;

var m = Model.loadModels();

exports.testCalcCategoryRecord = function (test) {

  const rec = Vismodel.calcCategoryRecord(m, 'element name', 'IUPAC');

  test.deepEqual(rec, {
    otherdomains : ['Philosophers elements'],
    nrDistinctValues : 122,
    nrDistinctValuesInDomain : 118,
    nrRecords : 122,
    nrRecordsInDomain: 118,
    nrTotalRecordsInDomain : 118
  });
  test.done();
};

exports.testCalcCategoryRecordOtherDomain = function (test) {

  const rec = Vismodel.calcCategoryRecord(m, 'element name', 'XYZ');

  test.deepEqual(rec, {
    otherdomains : ['IUPAC', 'Philosophers elements'],
    nrDistinctValues : 122,
    nrDistinctValuesInDomain : 0,
    nrRecords : 122,
    nrRecordsInDomain: 0,
    nrTotalRecordsInDomain : 0
  });
  test.done();
};


var mdl2 = Model.loadModels('testmodel2');

exports.testCalcCategoryRecordAppComp = function (test) {
  const rec = Vismodel.calcCategoryRecord(mdl2, 'ApplicationComponent', 'BOM');
  test.deepEqual(rec, {
    otherdomains : ['FioriBOM'],
    nrDistinctValues : 710,
    nrDistinctValuesInDomain : 0,
    nrRecords : 12779,
    nrRecordsInDomain: 0,
    nrTotalRecordsInDomain : 0
  });
  test.done();
};

var fs = require('fs');

exports.testMakeViz2 = function (test) {
  try {
    fs.mkdirSync('./testmodel2/graph');
  } catch (e) {
   /*emtpy*/
  }
  Vismodel.visModels(mdl2, './testmodel2/graph');

  test.done();
};



var mdltest = Model.loadModels();

try {
  fs.mkdirSync('./testmodel');
} catch (e) {
   /*emtpy*/
}


exports.testMakeViz = function (test) {
  try {
    fs.mkdirSync('./testmodel/graph');
  } catch (e) {
   /*emtpy*/
  }
  Vismodel.visModels(mdltest, './testmodel/graph');

  test.done();
};

exports.testMakeTab = function (test) {
  try {
    fs.mkdirSync('./testmodel/graph');
  } catch (e) {
   /*emtpy*/
  }
  Vismodel.tabModels(mdltest, './testmodel/graph');

  test.done();
};

var TESTMODELLOCATION = 'node_modules/abot_testmodel/';

exports.testMakeLUNR = function (test) {
  Vismodel.makeLunrIndex(TESTMODELLOCATION  + 'testmodel/iupac','./app/public/js/model_iupac', true);
  test.done();
};