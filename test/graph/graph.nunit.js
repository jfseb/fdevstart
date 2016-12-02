var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';
const graphs = require(root + '/graph/graph.js');

var debuglog = require('debug')('graph.nunit');


const level = require('level');
const levelgraph = require('levelgraph');


var relations = [
    ['Tool', 'is', 'FLP', { weight: 24 }],
    ['Tool', 'is', 'FLPD', { weight: 0 }],
    //  [ 'Tool' ,'is', 'Wiki' , {weight : 0}],
    ['FLP', 'requires', 'SystemId', { weight: 1 }],
    ['FLP', 'requires', 'client', { weight: 1 }],
    ['FLP', 'relatesto', 'client', { weight: 1 }],
    ['Wiki', 'relatesto', 'Wiki', { weight: 1 }],
    ['FLP', 'requires', 'SystemId', { weight: 1 }],
    ['FLP', 'requires', 'client', { weight: 1 }],
    ['FLP', 'relatesto', 'client', { weight: 1 }],
    ['Wiki', 'relatesto', 'Wiki', { weight: 1 }],
    ['BOM Editor', 'relatesto', 'Fiori Application', { weight: 17 }],
    ['Fiori Application', 'relatesto', 'OData Service'],
    ['Fiori Application', 'relatesto', 'Intent', { weight: 1 }],
    ['Intent', 'relatesto', 'Fiori Application', { weight: 17 }],
    ['Intent', 'relatesto', 'Support Component', { weight: 17 }],
    ['Transaction', 'relatesto', 'Transaction Name', { weight: 1 }],
    ['STARTTA', 'relatesto', 'Transaction', { weight: 1 }]
];

function toTriples(relations) {
  return relations.map(function (oEntry) {
    var res = {
      subject: oEntry[0],
      predicate: oEntry[1],
      object: oEntry[2]
    };
    return Object.assign(res, oEntry[3]);
  });
}

var testdbname = 'testdb';
var dbraw = undefined; // the underlying level database
var db = undefined; // the db to use in the test

var r = new Promise(function(resolve, reject) {
  level.destroy(testdbname, function (err) {
    dbraw = level(testdbname);
    db = levelgraph(dbraw);
    debuglog('setup ' + JSON.stringify(toTriples(relations)));
    db.put(toTriples(relations), function (err) {
      debuglog('callback setup');
      resolve();
    });
  });
});

exports.group = {
  setUp: function (callback) {
        // just use this in the browser with the provided bundle
    r.then(function() {
      callback();
    });
    debuglog('exit destroy');
  },
  group : {
    testGetLevel: function (test) {
      var getToolAsStream = function getToolsAsStream() {
        return db.getStream( {subject : 'FLP', predicate : 'relatesto' });
      };
      getToolAsStream().on('data', function(data) {
        debuglog('raw:>' + JSON.stringify(data));
      });

      debuglog('got result');
      const res = graphs.getRelatedLevel(db, undefined, 'relatesto', undefined, 1);
      debuglog('got stream');
      var cnt = 0;
      res.on('data', function (data) {
        debuglog(data);
        cnt = cnt + 1;
      });
      res.on('end', function () {
        test.equal(cnt, 8);
        test.done();
      });
    },
    testGetLevel2 : function (test) {
    //  var getToolAsStream = function getToolsAsStream() {
    //    return db.getStream( {subject : 'FLP', predicate : 'relatesto' });
    //  };
    //  getToolAsStream().on('data', function(data) {
    //    debuglog('raw:>' + JSON.stringify(data));
    //  });
      var result = [];
      debuglog('got result');
      const res = graphs.getRelatedLevel(db, undefined, 'relatesto', undefined, 2);
      debuglog('got stream');
      var cnt = 0;
      res.on('data', function (data) {
        debuglog(data);
        cnt = cnt + 1;
        result.push(data);
      });
      res.on('end', function () {
        test.equal(cnt, 4);
        test.deepEqual(result, [ [ 'BOM Editor', 'Fiori Application', 'Intent' ],
    [ 'BOM Editor', 'Fiori Application', 'OData Service' ],
    [ 'Fiori Application', 'Intent', 'Support Component' ],
    [ 'STARTTA', 'Transaction', 'Transaction Name' ] ]);
        test.done();
      });
    }
  },
  group2 : {
    testStreamExtract : function (test) {
    //  var getToolAsStream = function getToolsAsStream() {
    //    return db.getStream( {subject : 'FLP', predicate : 'relatesto' });
    //  };
    //  getToolAsStream().on('data', function(data) {
    //    debuglog('raw:>' + JSON.stringify(data));
    //  });
      var result = [];
      debuglog('got result');
      var res = graphs.getAsStream(db, { subject: 'Tool' }).pipe(
        new graphs.ExtractMembersTransformer(
          'object'
      )).on('data', function(data) {

      });
      var cnt = 0;
      result = [];
      res.on('data', function (data) {
        debuglog(data);
        cnt = cnt + 1;
        result.push(data);
      });
      res.on('end', function () {
        test.equal(cnt, 2);
        test.deepEqual(result, ['FLP', 'FLPD' ]);
        test.done();
      });
    },
    testStreamExtractPipe2 : function (test) {
    //  var getToolAsStream = function getToolsAsStream() {
    //    return db.getStream( {subject : 'FLP', predicate : 'relatesto' });
    //  };
    //  getToolAsStream().on('data', function(data) {
    //    debuglog('raw:>' + JSON.stringify(data));
    //  });
      var result = [];
      debuglog('got result');
      var res = graphs.getAsStream(db, { subject: 'Tool' }).pipe(
        new graphs.ExtractMembersTransformer(
          ['object','weight','subject']
      )).on('data', function(data) {

      });
      var cnt = 0;
      result = [];
      res.on('data', function (data) {
        debuglog(data);
        cnt = cnt + 1;
        result.push(data);
      });
      res.on('end', function () {
        test.equal(cnt, 2);
        test.deepEqual(result, [
         { object: 'FLP', subject : 'Tool', weight: 24},
        { 'object': 'FLPD', 'subject' : 'Tool', weight: 0 }]
       );
        test.done();
      });
    }
  }

};