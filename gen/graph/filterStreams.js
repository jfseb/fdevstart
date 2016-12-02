'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * @file graph db files
 * @copyright (c) 2016 Gerd Forstmann
 */

var level = require('level');
var levelgraph = require('levelgraph');

// just use this in the browser with the provided bundle
var db = levelgraph(level('modeldb'));

var relations = [['Tool', 'is', 'FLP', { weight: 0 }], ['Tool', 'is', 'FLPD', { weight: 0 }], ['Tool', 'relatesTo', 'FLPD', { weight: 0 }],
//  [ 'Tool' ,'is', 'Wiki' , {weight : 0}],
['FLP', 'requires', 'SystemId', { weight: 1 }], ['FLP', 'requires', 'client', { weight: 1 }], ['FLP', 'relatesto', 'client', { weight: 1 }], ['FLPD', 'relatesto', 'Fiori Catalog', { weight: 1 }], ['FLPD', 'relatesto', 'Fiori Group', { weight: 1 }], ['FLP', 'relatesto', 'Fiori Group', { weight: 1 }], ['FLP', 'relatesto', 'Fiori Application', { weight: 1 }], ['Wiki', 'relatesto', 'Wiki', { weight: 1 }], ['STARTTA', 'relatesto', 'Transaction', { weight: 1 }]];

function toTriples() {
  return relations.map(function (oEntry) {
    var res = {
      subject: oEntry[0],
      predicate: oEntry[1],
      object: oEntry[2]
    };
    return Object.assign(res, oEntry[3]);
  });
}

// var triples = { subject: 'a', predicate: 'b', object: 'c', 'someprop' : 1, 'other' : 2 };

db.put(toTriples(), function (err) {
  // do something after the triple is inserted
  db.get({ subject: 'Tool' }, function (err, list) {
    console.log(list);
  });
});

function getToolsAsStream() {
  return db.getStream({ subject: 'Tool', predicate: 'is' });
}

getToolsAsStream().on('data', function (a, b) {
  // here the stream;
  console.log('entry');
  console.log(a);
  console.log(b);
});

// a tranformer which filters
var Transform = require('stream').Transform;

var ExtractMembersTransformer = function (_Transform) {
  _inherits(ExtractMembersTransformer, _Transform);

  function ExtractMembersTransformer(sMember) {
    _classCallCheck(this, ExtractMembersTransformer);

    var _this = _possibleConstructorReturn(this, (ExtractMembersTransformer.__proto__ || Object.getPrototypeOf(ExtractMembersTransformer)).call(this, { objectMode: true }));

    _this.sMember = sMember;
    return _this;
  }

  _createClass(ExtractMembersTransformer, [{
    key: '_transform',
    value: function _transform(chunk, encoding, callback) {
      // Push the data onto the readable queue.
      if (typeof this.sMember === 'string') {
        this.push(chunk[this.sMember]);
      } else if (Array.isArray(this.sMember)) {
        var res = {};
        this.sMember.forEach(function (sKey) {
          if (chunk.hasOwnProperty(sKey)) {
            res[sKey] = chunk[sKey];
          }
        });
        this.push(res);
      }
      callback();
    }
  }]);

  return ExtractMembersTransformer;
}(Transform);

var u1 = new ExtractMembersTransformer('object');

getToolsAsStream().pipe(u1).on('data', function (ars) {
  console.log(' u1 > ' + ars);
});

var u2 = new ExtractMembersTransformer(['object', 'weight']);

getToolsAsStream().pipe(u2).on('data', function (ars) {
  console.log(' u2 > ' + JSON.stringify(ars));
});