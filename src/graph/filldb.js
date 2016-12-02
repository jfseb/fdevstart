/**
 * @file fill the database
 */

const level = require('level');
const levelgraph = require('levelgraph');

// just use this in the browser with the provided bundle
var db = levelgraph(level('modeldb'));

var relations = [
    [ 'Tool' ,'is', 'FLP' , {weight: 24}],
    [ 'Tool' ,'is', 'FLPD' , {weight : 0}],
  //  [ 'Tool' ,'is', 'Wiki' , {weight : 0}],
    [ 'FLP' , 'requires' , 'SystemId' , {weight: 1}],
    [ 'FLP' , 'requires', 'client' , {weight: 1}],
    [ 'FLP' , 'relatesto', 'client', {weight: 1}],
    [ 'Wiki', 'relatesto', 'Wiki',  {weight: 1}],
    [ 'FLP' , 'requires' , 'SystemId' , {weight: 1}],
    [ 'FLP' , 'requires', 'client' , {weight: 1}],
    [ 'FLP' , 'relatesto', 'client', {weight: 1}],
    [ 'Wiki', 'relatesto', 'Wiki',  {weight: 1}],
    [ 'BOM Editor', 'relatesto', 'Fiori Application', {weight: 17}],
    [ 'Fiori Application', 'relatesto', 'OData Service'],
    [ 'Fiori Application', 'relatesto', 'Intent', {weight: 1}],
    [ 'Intent', 'relatesto', 'Fiori Application', {weight: 17}],
    [ 'Intent', 'relatesto', 'Support Component', {weight: 17}],
    [ 'Transaction', 'relatesto', 'Transaction Name',  {weight: 1}],
    [ 'STARTTA', 'relatesto', 'Transaction', {weight: 1 }]
];

function toTriples(relations) {
  return relations.map(function(oEntry) {
    var res = {
      subject : oEntry[0],
      predicate : oEntry[1],
      object : oEntry[2]
    };
    return Object.assign(res,oEntry[3]);
  });
}

db.put(toTriples(relations), function(err) {
  // do something after the triple is inserted
  db.get({ subject: 'Tool' }, function(err, list) {
    console.log(list);
  });
});

