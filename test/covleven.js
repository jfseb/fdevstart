// import * as dlsh from '../../src/ts/utils/damerauLevenshtein.js'
var dlsh = require('../src-cov/damerauLevenshtein.js').distance

exports.testDLSH = function (test) {
  var fn = dlsh
    // test.expect(3);
  test.deepEqual(fn('abcdef', 'abcde'), 1, 'a is a')
  test.deepEqual(fn('abcdef', 'abcdef'), 0, 'a is a')
  test.deepEqual(fn('hijk', 'abcd'), 4, 'a is a')
  test.deepEqual(fn('abc', 'acb'), 1, ' abc acb')
  test.deepEqual(fn('Shell.controller.js', 'Shell'), 14, 'Shell.controller.js, Shell')
  test.deepEqual(fn('Emma3', 'Shell'), 5, ' Emma3, Shell')
  test.done()
}
