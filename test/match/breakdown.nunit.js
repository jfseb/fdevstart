var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';
var debuglog = require('debug')('breakdown.nunit');

const breakdown = require(root + '/match/breakdown.js');

exports.testcleanse = function (test) {
  const res = breakdown.cleanseString('  system and \n some \t others are ');
  // test.expect(3)
  test.deepEqual(res, 'system and some others are', 'cleansed ok');
  test.done();
};


exports.testRecombineQuoted = function (test) {
  const res = breakdown.recombineQuoted('A "My quoted string" and some "others"'.split(' '));
  // test.expect(3)
  debuglog(res);
  test.deepEqual(res, ['A', '"My quoted string"', 'and', 'some', '"others"'], 'one string');
  test.done();
};

exports.testRecombineQuotedUnterminated = function (test) {
  const res = breakdown.recombineQuoted('A "My quoted string'.split(' '));
  // test.expect(3)
  debuglog(res);
  test.deepEqual(res, ['A', '"My', 'quoted', 'string'], 'one string');
  test.done();
};


exports.testRecombineQuotedSingleQuote = function (test) {
  const res = breakdown.recombineQuoted('A " My quoted " string'.split(' '));
  // test.expect(3)
  debuglog(res);
  test.deepEqual(res, ['A', '"My quoted"', 'string'], 'correct combined');
  test.done();
};


exports.testRecombineQuotedOnly = function (test) {
  const res = breakdown.recombineQuoted('"My quoted string"'.split(' '));
  // test.expect(3)
  debuglog(res);
  test.deepEqual(res, ['"My quoted string"'], 'one string');
  test.done();
};

exports.testtrimQuoted = function (test) {
  const res = breakdown.trimQuoted('"ABC"');
  // test.expect(3)
  debuglog(res);
  test.deepEqual(res, 'ABC', 'one string');
  test.done();
};


exports.testtrimQuoted = function (test) {
  const res = breakdown.trimQuoted('"Aabc');
  // test.expect(3)
  debuglog(res);
  test.deepEqual(breakdown.trimQuoted('"Aabc'), '"Aabc', 'one string');
  test.deepEqual(breakdown.trimQuoted('Aabc"'), 'Aabc"', 'one string');
  test.deepEqual(breakdown.trimQuoted('""Aabc""'), 'Aabc', 'one string');
  test.deepEqual(breakdown.trimQuoted('"'), '"', 'one string');
  test.deepEqual(breakdown.trimQuoted('""'), '""', 'one string');
  test.deepEqual(breakdown.trimQuoted('"""'), '"""', 'one string');
  test.deepEqual(breakdown.trimQuoted('""""'), '""""', 'one string');
  test.done();
};



exports.testBreakdown = function (test) {
  const res = breakdown.breakdownString('system');
  // test.expect(3)
  debuglog(res);
  test.deepEqual(res, [['system']], 'one string');
  test.done();
};

exports.testBreakdownQuotes = function (test) {
  const res = breakdown.breakdownString('run "My Fiori"');
  // test.expect(3)
  debuglog(res);
  test.deepEqual(res, [['run', 'My Fiori']], ' keep My Fiori together');
  test.done();
};


exports.testBreakDownLimitSpaces = function (test) {
  const res = breakdown.breakdownString('A "My q u o t e d" and some "others"', 4);
  // test.expect(3)
  debuglog(res);
  test.deepEqual(res,
    [
      ['A', 'My q u o t e d', 'and some', 'others'],
      ['A', 'My q u o t e d', 'and','some', 'others'],
    ]
    , 'one string');
  test.deepEqual(res.length, 2);
  test.done();
};

exports.testBreakDownLimitSpaces2 = function (test) {
  const res = breakdown.breakdownString('A B and some', 2);
  // test.expect(3)
  debuglog(res);
  test.deepEqual(res,
    [ [ 'A', 'B and some' ],
  [ 'A B', 'and some' ],
  [ 'A', 'B', 'and some' ],
  [ 'A B and', 'some' ],
  [ 'A', 'B and', 'some' ],
  [ 'A B', 'and', 'some' ],
  [ 'A', 'B', 'and', 'some' ] ]
    , 'one string');
  test.deepEqual(res.length, 7);
  test.done();
};


exports.testSwallowQuote = function (test) {
  const res = breakdown.swallowQuote('abc"hij  klm"',3);
  test.deepEqual(res,{ token: 'hij klm', nextpos : 13});
  test.done();
};


exports.testSwallowQuoteUnterminated = function (test) {
  const res = breakdown.swallowQuote('abc"hij  klm',3);
  test.deepEqual(res,{ token: undefined, nextpos : 3});
  test.done();
};


exports.testSwallowWord = function (test) {
  const res = breakdown.swallowWord('   def ',3);
  test.deepEqual(res,{ token: 'def', nextpos : 6});
  test.done();
};

exports.testSwallowWordWithQuote = function (test) {
  const res = breakdown.swallowWord('   O\'hara   ',3);
  test.deepEqual(res,{ token: 'O\'hara', nextpos : 9});
  test.done();
};


exports.testSwallowWordWithEndQuote = function (test) {
  const res = breakdown.swallowWord('   O\'hara\' ',3);
  test.deepEqual(res,{ token: 'O\'hara', nextpos : 9});
  test.done();
};

exports.testSwallowWordWithEndQuote2 = function (test) {
  const res = breakdown.swallowWord('   O\'\'Hara ',3);
  test.deepEqual(res,{ token: 'O', nextpos : 4});
  test.done();
};


exports.testSwallowWordWithEndQuote3= function (test) {
  const res = breakdown.swallowWord('   O\'H\'Hara',3);
  test.deepEqual(res,{ token: 'O\'H\'Hara', nextpos : 11});
  test.done();
};


/**
 * Breakdown a string into tokens, marking elements which are not
 * combinable, but keeping O'Hara together
 */

exports.testBreakDownDirect = function (test) {
  const res = breakdown.tokenizeString('A   C0,E%M;F. and What\'s up?in O\'Hara "tod\tay.a t" A?');
  // test.expect(3)
  debuglog(res.tokens.map(function(o,index) {
    return `${res.fusable[index]? ' ' : '|' }`
      + o
      + `${res.fusable[index+1]? ' ' : '|' }`;
  }));
  test.deepEqual(res.tokens.length+1, res.fusable.length);
  test.deepEqual(res,
    { tokens: [ 'A', 'C0','E%M', 'F', 'and', 'What\'s', 'up', 'in' , 'O\'Hara', 'tod ay.a t', 'A'],
      fusable : [false,true,false,false,false,true,true,false,true,false,false,false]
    }
    , 'one string');
  test.done();
};

exports.testBreakDownDirect2 = function (test) {
  const res = breakdown.tokenizeString('A""BCDEF"AND');
  // test.expect(3)
  debuglog(res.tokens.map(function(o,index) {
    return `${res.fusable[index]? ' ' : '|' }`
      + o
      + `${res.fusable[index+1]? ' ' : '|' }`;
  }));
  test.deepEqual(res.tokens.length+1, res.fusable.length);
  test.deepEqual(res,
    { tokens: [ 'A', 'BCDEF','AND'],
      fusable : [false,false,false,false]
    }
    , 'one string');
  test.done();
};


exports.testMakeMatchPattern = function(test) {
  var res = breakdown.makeMatchPattern('abc');
  test.deepEqual(res,undefined);
  test.done();
};


exports.testMakeMatchPattern0 = function(test) {
  var res = breakdown.makeMatchPattern('Life is shorter');
  test.deepEqual(res,{ longestToken: 'shorter',
    span: { low : -2, high : 0}}
    );
  test.done();
};

exports.testMakeMatchPattern1 = function(test) {
  var res = breakdown.makeMatchPattern('Lifer is short');
  test.deepEqual(res,{ longestToken: 'Lifer',
    span: { low : -0, high : 2} });
  test.done();
};





exports.testIsQuoted = function(test) {
  test.equal(breakdown.isQuoted('"AB"'), true);
  test.equal(breakdown.isQuoted('AB'), false);
  test.equal(breakdown.isQuoted('"A"B"'), true);
  test.equal(breakdown.isQuoted('"AB'), false);
  test.done();
};


exports.testCountSpaces = function(test) {
  test.equal(breakdown.countSpaces('A B C'), 2);
  test.equal(breakdown.countSpaces('ABC'), 0);
  test.equal(breakdown.countSpaces('AB '), 1);
  test.done();
};

exports.testBreakdown2 = function (test) {
  const res = breakdown.breakdownString('system a b');
  // test.expect(3)
  test.deepEqual(res,
    [['system a b'],
    ['system', 'a b'],
    ['system a', 'b'],
    ['system', 'a', 'b']]
    , 'one string');
  test.done();
};

exports.testBreakdownQuoted = function (test) {
  const res = breakdown.breakdownString('system "a" b');
  // test.expect(3)
  test.deepEqual(res,
    [['system', 'a', 'b']]
    , 'one string');
  test.done();
};
