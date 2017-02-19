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

var m0 = Model.loadModels();


var pglocalurl = "postgres://joe:abcdef@localhost:5432/abot";
var dburl = process.env.DATABASE_URL || pglocalurl;

pg.defaults.ssl = true;

exports.testLoadWords = function (test) {
  if (process.env.ABOT_EMAIL_USER) {
    test.done();
    return;
  }
  if(!process.env.ABOT_INDEXWORDS) {
    test.done();
    return; // not today
  }
  var fut = IndexWords.dumpWords(dburl, m);
  test.done();
};


var m0 = {
  rules: {}
}

exports.testSimulateLoadWordPGs = function (test) {
  var cA1 = undefined;
  var cA2 = undefined;
  test.expect(2);
  var fakePG = {
    connect : function(o, fn) {
      debuglog('connect called');
      fn(undefined /*undef*/,
        {
          query : function(qa1,qa2, fn) {
            debuglog('queryy called');
            cA1 = qa1;
            cA2 = qa2;
            fn(undefined, {
              a: 1234
            }
          );
          }
        }, function(err,o) {
          test.equal(2,2);
          debuglog('done');
        }
        );
    }
  };
  IndexWords.mockPG(fakePG);
  var fut = IndexWords.insertWord("anurl", "lcword", "matchedSTring", "category",
function() {
  test.equal(1,1);
  debuglog("didi it");
  test.done();
});


}


exports.testSimulateLoadWordsConnectFail = function (test) {
  var cA1 = undefined;
  var cA2 = undefined;
  var fakePG = {
    connect : function(o, fn) {
      debuglog('connect called');
      fn('connect failed',
        {
          query : function(qa1,qa2, fn) {
            debuglog('queryy called');
            test.equal(1,0);
            cA1 = qa1;
            cA2 = qa2;
            fn(undefined, {
              a: 1234
            }
          );
          }
        }, function(err,o) {
          debuglog('done');
          test.equal(1,2);
        }
        );
    }
  };
  IndexWords.mockPG(fakePG);
  var fut = IndexWords.insertWord("anurl", "lcword", "matchedSTring", "category",
function(err) {
  test.equal(!!err,true);
  test.done();
});


}


