var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';
//var debuglog = require('debug')('plainRecoginizer.nunit');

const recognizer = require(root + '/bot/plainrecognizer.js');

exports.testParseRuleInt = function (test) {
  const res =
  recognizer.parseRule('what is <category> in <A1>');
//  test.deepEqual(res.regexp, new RegExp('^what is (.*) in (.*)$', 'i'), 're 1' );
//  test.deepEqual(res.regexp.toString(), (new RegExp('^what is (.*) in (.*)$', 'i')).toString(), 're 2' );

  test.deepEqual(res, {
    type: 1,
    regexp : new RegExp('^what is (.*) in (.*)$', 'i'),
    argsMap : {
      'category' : 1,
      'A1' : 2
    }
  } , 'parsed ok');
  test.done();
};


exports.testParseRuleIntParen = function (test) {
  const res =
  recognizer.parseRule('what (is)|(was) a <category> in <A1> and');
  test.deepEqual(res, {
    type: 1,
    regexp : /^what (is)|(was) a (.*) in (.*) and$/i,
    argsMap : {
      'category' : 3,
      'A1' : 4
    }
  } , 'parsed ok');
  test.done();
};

exports.testParseRuleIntParenWeird = function (test) {
  const res =
  recognizer.parseRule('what (is)|(was) (a <category>) in <A1> and');
  test.deepEqual(res, {
    type: 1,
    regexp : /^what (is)|(was) (a (.*)) in (.*) and$/i,
    argsMap : {
      'category' : 4,
      'A1' : 5
    }
  } , 'parsed ok');
  test.done();
};

exports.testParseRuleIntArray = function (test) {
  const res =
  recognizer.parseRule([ /^what (is)|(was) (a (.*)) in (.*) and$/i, { 'category' : 4, 'A1' : 5}]);
  test.deepEqual(res, {
    type: 1,
    regexp : /^what (is)|(was) (a (.*)) in (.*) and$/i,
    argsMap : {
      'category' : 4,
      'A1' : 5
    }
  } , 'parsed ok');
  test.done();
};

exports.testRecognize = function (test) {
  const res =
  recognizer.parseRule('what ((is)|(was)) (a <category>) in <A1> and');
  test.deepEqual(res, {
    type: 1,
    regexp : /^what ((is)|(was)) (a (.*)) in (.*) and$/i,
    argsMap : {
      'category' : 5,
      'A1' : 6
    }
  } , 'parsed ok');
  var match = recognizer.recognizeText('What is a ABC AND K in CDEF and', [res]);
  test.deepEqual(match, {

    entities : [{
      type: 'category',
      'entity' : 'ABC AND K',
      startIndex : 10,
      endIndex : 19
    },
    {
      type : 'A1',
      entity : 'CDEF',
      startIndex : 23,
      endIndex : 27
    }
    ] ,
    score:0.9
  }, 'matche ok');
  test.done();
};

var fs = require('fs');

exports.testRecognizeSome = function (test) {

  var oJSON = JSON.parse(fs.readFileSync('./resources/model/intents.json'));
  var oRules = recognizer.parseRules(oJSON);
  var Recognizer = new (recognizer.RegExpRecognizer)(oRules);

  var oContext = {
    message : {
      text : 'Show me Transaction ABC in UV2 client 130'
    }
  };

  Recognizer.recognize(oContext, function(err, res) {
    test.deepEqual(res,
      {
        entities:
        [ {
          type: 'A1',
          entity: 'Transaction ABC in UV2 client 130',
          startIndex: 8,
          endIndex: 41
        }
        ],
        score: 0.9,
        intent: 'ShowMe' }

    , 'correct result');
    test.done();
  });
};
