/**
 * Module to obtains database statitics
 * (C) gerd forstmann 1995
 */


/*
	ESTABLISH DATABASE CONNECTION
*/
var pglocalurl = 'postgres://joe:abcdef@localhost:5432/abot';
var dburl = process.env.DATABASE_URL || pglocalurl;

var pg = require('pg');
pg.defaults.ssl = true;

/*
pg.connect(dburl, function(err,client,done) {
    if(err) {
        console.log(" here conn err : " + err);
    }
    client.query('SELECT * FROM sdd', function(err, result) {
      done();
*/

var accounts = {
  getStats: function (cb) {
    pg.connect(dburl, function (err, client, done) {
      if (err) {
        console.log(' here conn err : ' + err);
        done();
        return;
      }
      client.query('SELECT count(*) FROM logconv', function (err, result) {
        if(err) {
          console.log('here err ************' + err);
          done();
        }
        console.log(JSON.stringify(result));
        var res = {
          'logconv' : result.rows[0].count,
          'session' : 0
        };
        client.query('SELECT count(*) from session', function(err,result) {
          if(err) {
            console.log('2 *********'  + err);
            done();
          }
          res.session = result.rows[0].count;
          done();
          cb(undefined, res);
        });
      });
    });
  }
};

exports.getStats = function (callback) {
  accounts.getStats(callback); // reset accounts collection for testing //
};

