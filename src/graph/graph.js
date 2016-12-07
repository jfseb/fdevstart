/**
 * @file graph db files
 */

/**
 * graph algorithms using levelgraph
 * @module fsdevstart.graph
 */


//const level = require('level');
//const levelgraph = require('levelgraph');

//var db = levelgraph(level('modeldb'));

const debuglog = require('debug')('graph');


// a tranformer which filters
const Transform = require('stream').Transform;

function objAnToArray(chunk) {
  var res = [];
  for(var i = 0; (i < 100) && chunk.hasOwnProperty('a' + i); ++i ) {
    res.push(chunk['a' + i]);
  }
  return res;
}

class MakeAxArrayTransformer extends Transform {
  constructor(inr) {
    super({ objectMode: true});
    this.inr = inr;
  }
  _transform(chunk, encoding, callback) {
    // Push the data onto the readable queue.
    var res = objAnToArray(chunk);
    debuglog('output is ' + JSON.stringify(res));
    this.push(res);
    callback();
    //callback(null, new Buffer(chunk.subject) );
  }
}

/*
var relations = [
    [ 'Tool' ,'is', 'FLP' , {weight: 0}],
    [ 'Tool' ,'is', 'FLPD' , {weight : 0}],
    [ 'Tool' ,'relatesTo', 'FLPD' , {weight : 0}],
  //  [ 'Tool' ,'is', 'Wiki' , {weight : 0}],
    [ 'FLP' , 'requires' , 'SystemId' , {weight: 1}],
    [ 'FLP' , 'requires', 'client' , {weight: 1}],
    [ 'FLP' , 'relatesto', 'client', {weight: 1}],
    [ 'Wiki', 'relatesto', 'Wiki',  {weight: 1}],
      [ 'Transaction', 'relatesto', 'Transaction Name',  {weight: 1}],
    [ 'STARTTA', 'relatesto', 'Transaction', {weight: 1 }]
];

*/


module.exports = {};

function getAsStream(db, query) {
  return db.getStream(query);
}
module.exports.getAsStream = getAsStream;


/**
 * Get all nodes related by {predicate}, if supplied
 * starting at {start} and ending at {end}
 *
 * Graphs with cycles are rejected
 *
 *
 * @param {string} predicate
 * @param {number} distance
 * @returns {stream}
 * a stream of arrays of length distance + 1 is returned, listing the
 * respective objects, e.g ['A', 'B', 'C']
 */
function getRelatedLevel(db, start, predicate, end , distance) {
  var rquery = [];
  rquery[0] = Object.assign({ predicate : predicate }, start || {});
  rquery[distance - 1] = Object.assign({ predicate: predicate }, end || {});

  for(var i = 0; i < distance; ++i) {
    rquery[i] = rquery[i] || {};
    rquery[i].subject = db.v('a' + i);
    rquery[i].predicate = predicate;
    var u = i + 1;
    debuglog('here v2:' + u);
    rquery[i].object = db.v('a' + u);
  }
  debuglog('rquery : ' + JSON.stringify(rquery));
  return db.searchStream(
    rquery /*[
    {
      subject: db.v('a'),
      predicate : 'relatesto',
      object : db.v('x'),
      weight: db.v('w2')
    }, {
      subject: db.v('x'),
      predicate: 'relatesto',
      object: db.v('y'),
      weight: db.v('w')
    }, {
      subject: db.v('y'),
      predicate: 'relatesto',
      object: db.v('b')
    }
  ] */,{
    filter: function (solution, callback) {
      var n = Object.keys(solution).length;
      for(var i = 0; i < n; ++i) {
        for(var k = 0; k < i; ++k) {
          if (solution['a' + i ] === solution['a' + k]) {
            debuglog('rejecting ' + JSON.stringify(solution));
            callback(null);
            return;
          }
        }
      }
      callback(null, solution);
    }
  }
).pipe(new MakeAxArrayTransformer(distance));
}

module.exports.getRelatedLevel = getRelatedLevel;

/*
getRelatedLevel(db,2).on('data', function(data) {
  console.log('here we go ' + JSON.stringify(data));
});
*/
/*
getToolsAsStream(db).on('data', function(a,b) {
    // here the stream;
  console.log('entry');
  console.log(a);
  console.log(b);
});
*/

class ExtractMembersTransformer extends Transform {
  constructor(sMember) {
    super({ objectMode: true});
    this.sMember = sMember;
  }
  _transform(chunk, encoding, callback) {
    // Push the data onto the readable queue.
    if (typeof this.sMember === 'string') {
      this.push(chunk[this.sMember]);
    } else if (Array.isArray(this.sMember)) {
      var res = {};
      this.sMember.forEach(function(sKey) {
        if(chunk.hasOwnProperty(sKey)) {
          res[sKey] = chunk[sKey];
        }
      });
      this.push(res);
    }
    callback();
    //callback(null, new Buffer(chunk.subject) );
  }
}

module.exports.ExtractMembersTransformer = ExtractMembersTransformer;

// console.log('can we get length: ' + getToolsAsStream());

/*
var u1 = new ExtractMembersTransformer('object');

getToolsAsStream(db).pipe(u1).on('data' ,function(ars) {
  console.log(' u1 > ' + ars);
});


var u2 = new ExtractMembersTransformer([ 'object', 'weight' ]);

getToolsAsStream(db).pipe(u2).on('data' ,function(ars) {
  console.log(' u2 > ' + JSON.stringify(ars));
});
*/

// get first level neighbours



