// import * as dlsh from '../../src/ts/utils/damerauLevenshtein.js'

var process = require('process')
var root = (process.env.DO_COVERAGE) ? '../../gen_cov' : '../../gen'

var dlsh = require(root + '/utils/damerauLevenshtein.js').levenshtein

exports.testDLSH = function (test) {
  var fn = dlsh
    // test.expect(3);
  test.deepEqual(fn('abcdef', ''), 6, 'empty b')
  test.deepEqual(fn('', ''), 0, 'both empty')
  test.deepEqual(fn('abc', 'abc'), 0, 'a is a')
  test.deepEqual(fn('', 'abc'), 3, ' empty a')
  test.deepEqual(fn('abcdef', 'abcde'), 1, 'a is a')
  test.deepEqual(fn('abcdef', 'abcdef'), 0, 'a is a')
  test.deepEqual(fn('hijk', 'abcd'), 4, 'a is a')
  test.deepEqual(fn('abc', 'acb'), 1, ' abc acb')
  test.deepEqual(fn('Shell.controller.js', 'Shell'), 14, 'Shell.controller.js, Shell')
  test.deepEqual(fn('Emma3', 'Shell'), 5, ' Emma3, Shell')
  test.done()
}
