/**
 * @file graph db files
 * @copyright (c) 2016 Gerd Forstmann
 */

const level = require('level');
const levelgraph = require('levelgraph');

// just use this in the browser with the provided bundle
var db = levelgraph(level('modeldb'));

var relations = [
    [ 'Tool' ,'is', 'FLP' , {weight: 0}],
    [ 'Tool' ,'is', 'FLPD' , {weight : 0}],
    [ 'Tool' ,'relatesTo', 'FLPD' , {weight : 0}],
  //  [ 'Tool' ,'is', 'Wiki' , {weight : 0}],
    [ 'FLP' , 'requires' , 'SystemId' , {weight: 1}],
    [ 'FLP' , 'requires', 'client' , {weight: 1}],
    [ 'FLP' , 'relatesto', 'client', {weight: 1}],
    [ 'FLPD' , 'relatesto', 'Fiori Catalog', {weight: 1}],
    [ 'FLPD' , 'relatesto', 'Fiori Group', {weight: 1}],
    [ 'FLP' , 'relatesto', 'Fiori Group', {weight: 1}],
    [ 'FLP' , 'relatesto', 'Fiori Application', {weight: 1}],
    [ 'Wiki', 'relatesto', 'Wiki',  {weight: 1}],
    [ 'STARTTA', 'relatesto', 'Transaction', {weight: 1 }]
];

function toTriples() {
  return relations.map(function(oEntry) {
    var res = {
      subject : oEntry[0],
      predicate : oEntry[1],
      object : oEntry[2]
    };
    return Object.assign(res,oEntry[3]);
  });
}

// var triples = { subject: 'a', predicate: 'b', object: 'c', 'someprop' : 1, 'other' : 2 };

db.put(toTriples(), function(err) {
  // do something after the triple is inserted
  db.get({ subject: 'Tool' }, function(err, list) {
    console.log(list);
  });
});


function getToolsAsStream() {
  return db.getStream( {subject : 'Tool', predicate : 'is' });
}

getToolsAsStream().on('data', function(a,b) {
    // here the stream;
  console.log('entry');
  console.log(a);
  console.log(b);
});

// a tranformer which filters
const Transform = require('stream').Transform;

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
  }
}

var u1 = new ExtractMembersTransformer('object');

getToolsAsStream().pipe(u1).on('data' ,function(ars) {
  console.log(' u1 > ' + ars);
});


var u2 = new ExtractMembersTransformer([ 'object', 'weight' ]);

getToolsAsStream().pipe(u2).on('data' ,function(ars) {
  console.log(' u2 > ' + JSON.stringify(ars));
});


