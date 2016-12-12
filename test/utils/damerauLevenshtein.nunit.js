// import * as dlsh from '../../src/ts/utils/damerauLevenshtein.js'

var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

var dl = require(root + '/utils/damerauLevenshtein.js');
var dlsh = dl.levenshtein;

exports.testDLSH = function (test) {
  var fn = dlsh;
  // test.expect(3);
  test.deepEqual(fn('abcdef', ''), 6, 'empty b');
  test.deepEqual(fn('', ''), 0, 'both empty');
  test.deepEqual(fn('abc', 'abc'), 0, 'a is a');
  test.deepEqual(fn('', 'abc'), 3, ' empty a');
  test.deepEqual(fn('abcdef', 'abcde'), 1, 'a is a');
  test.deepEqual(fn('abcdef', 'abcdef'), 0, 'a is a');
  test.deepEqual(fn('hijk', 'abcd'), 4, 'a is a');
  test.deepEqual(fn('fabcde', 'abcdef'), 6, 'shift');
  test.deepEqual(fn('abc', 'acb'), 1, ' abc acb');
  test.deepEqual(fn('Shell.controller.js', 'Shell'), 14, 'Shell.controller.js, Shell');
  test.deepEqual(fn('Emma3', 'Shell'), 5, ' Emma3, Shell');
  test.done();
};


exports.testDLSH = function (test) {
  var fn = dl.sift4;
  // test.expect(3);
  test.deepEqual(fn('abcdef', ''), 6, 'empty b');
  test.deepEqual(fn('', ''), 0, 'both empty');
  test.deepEqual(fn('abc', 'abc'), 0, 'a is a');
  test.deepEqual(fn('', 'abc'), 3, ' empty a');
  test.deepEqual(fn('abcdef', 'abcde'), 1, 'a is a');
  test.deepEqual(fn('abcdef', 'abcdef'), 0, 'a is a');
  test.deepEqual(fn('hijk', 'abcd'), 4, 'a is a');
  test.deepEqual(fn('fabcde', 'abcdef'), 6, 'shift');
  test.deepEqual(fn('abc', 'acb'), 2, ' abc acb');
  test.deepEqual(fn('Shell.controller.js', 'Shell'), 14, 'Shell.controller.js, Shell');
  test.deepEqual(fn('Emma3', 'Shell'), 5, ' Emma3, Shell');

  test.deepEqual(fn('Shlell.controller.js', 'Shell', 1, 20), 17, 'Shell.controller.js 2 20, Shell');

  test.deepEqual(fn('Shlell.controller.js', 'Shell.contrller', 5, 20), 5, 'Shell.controller.js 2 20, Shell');

  test.deepEqual(fn('Shlell.controller.js', 'Shell.contrller',1, 20), 17, 'Shell.controller.js 2 20, Shell');

  test.deepEqual(fn('Shell.controller.js', 'Shell', 2, 4),500, 'Shell.controller.js, Shell');

  test.done();
};
