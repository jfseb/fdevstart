/**
 * @file inputFilter
 * @copyright (c) 2016-2016 Gerd Forstmann
 */


/* eslint-disable */

var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

var debuglog = require('debug')('indexwords.nunit');

const IndexWords = require(root + '/match/indexwords.js');

const Model = require(root + '/model/model.js');

const pg = require('pg');

var m = Model.loadModels('testmodel2');


var pglocalurl = "postgres://joe:abcdef@localhost:5432/abot";
var dburl = process.env.DATABASE_URL || pglocalurl;

pg.defaults.ssl = true;


exports.testLoadWords = function (test) {
  if (process.env.ABOT_EMAIL_USER) {
    return;
  }
  var fut = IndexWords.dumpWords(dburl, m);
  test.done();
};
