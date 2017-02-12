// import * as dlsh from '../../src/ts/utils/damerauLevenshtein.js'

var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

var dl = require(root + '/utils/damerauLevenshtein.js');

//var dlsh = dl.levenshteinDamerau;

exports.testDLSH = function (test) {
  var fn = dl.calcDistanceAdjusted;
  // test.expect(3);
  test.deepEqual(fn('abcdef', '').toFixed(2), '0.63', 'empty b');
  test.deepEqual(fn('', '').toFixed(2), '1.00', 'both empty');
  test.deepEqual(fn('abc', 'abc').toFixed(2), '1.00', 'a is a');
  test.deepEqual(fn('', 'abc').toFixed(2), '0.63', ' empty a');
  test.deepEqual(fn('abcdef', 'abcde').toFixed(2),  '0.98', 'a is a');
  test.deepEqual(fn('abcdef', 'abcdef').toFixed(2),  '1.00', 'a is a');
  test.deepEqual(fn('hijk', 'abcd').toFixed(2), '0.41', 'a is a');
  test.deepEqual(fn('fabcde', 'abcdef').toFixed(2), '0.93', 'shift');
  test.deepEqual(fn('abc', 'acb').toFixed(2), '0.77', ' abc acb');
  test.deepEqual(fn('Shell.controller.js', 'Shell').toFixed(2), '0.58', 'Shell.controller.js, Shell');
  test.deepEqual(fn('Emma3', 'Shell').toFixed(2), '0.40', ' Emma3, Shell');
  test.done();
};

/*
exports.testDLSHGen = function (test) {
  var fn = dl.levenshtein('abc','abc');
  test.equal(fn,0);
  test.done();
};
*/


exports.testCDA = function (test) {
  var fn = dl.calcDistanceAdjusted;
  // test.expect(3);
  test.deepEqual(fn('manage sales domains', 'manage sales groups').toFixed(3), '0.912');
  test.deepEqual(fn('cusmos', 'cosmos').toFixed(3), '0.938');
  test.done();
};

/*
exports.testsift3 = function (test) {
  var fn = dl.sift3Distance;
  // test.expect(3);
  test.deepEqual(fn('element name', 'element names'),0.5, 'close 1');
  test.deepEqual(fn('element names', 'element name'),0.5, ' close');
  test.deepEqual(fn('element', 'elements'),0.5,' one in short');
  test.deepEqual(fn('abcdef', ''), 6, 'empty b');
  test.deepEqual(fn('very long and equal element', 'very long annd equal element'),1.5, 'long ');

  test.deepEqual(fn('', ''), 0, 'both empty');
  test.deepEqual(fn('abc', 'abc'), 0, 'a is a');
  test.deepEqual(fn('', 'abc'), 3, ' empty a');
  test.deepEqual(fn('abcdef', 'abcde'), 0.5, 'a is a');
  test.deepEqual(fn('abcdef', 'abcdef'), 0, 'a is a');
  test.deepEqual(fn('hijk', 'abcd'), 4, 'hijk abcd');
  test.deepEqual(fn('fabcde', 'abcdef'), 2, 'shift');
  test.deepEqual(fn('abc', 'acb'), 2, ' abc acb');
  test.deepEqual(fn('Shell.controller.js', 'Shell'), 7, '(1) Shell.controller.js, Shell');
  test.deepEqual(fn('Emma3', 'Shell'), 5, ' Emma3, Shell');
  test.deepEqual(fn('Shlell.controller.js', 'Shell', 1, 20), 8.5, '(2) Shell.controller.js 2 20, Shell');

  test.deepEqual(fn('Shell.controller.js', 'AbcdefghShell.controller.js', 1, 20), 22, '(2a) Shell.controller.js 2 20, Shell');
  test.deepEqual(fn('Shell.controller.js', 'AbcdefgShell.controller.js', 1, 20), 21.5, '(2b) Shell.controller.js 2 20, Shell');
  test.deepEqual(fn('Shell.controller.js', 'AbcdefShell.controller.js', 1, 20), 22, '(2c) Shell.controller.js 2 20, Shell');
  test.deepEqual(fn('Shell.controller.js', 'AbcdeShell.controller.js', 1, 20), 20.5, '(2d) Shell.controller.js 2 20, Shell');
  test.deepEqual(fn('Shell.controller.js', 'AbcdShell.controller.js', 1, 20), 20, '(2dd) Shell.controller.js 2 20, Shell');
  test.deepEqual(fn('Shell.controller.js', 'AbcShell.controller.js', 1, 20), 20.5, '(2ddd) Shell.controller.js 2 20, Shell');
  test.deepEqual(fn('Shell.controller.js', 'AbShell.controller.js', 1, 20), 2, '(2e2) Shell.controller.js 2 20, Shell');
  test.deepEqual(fn('Shell.controller.js', 'AShell.controller.js', 1, 20), 1.5, '(2e1) Shell.controller.js 2 20, Shell');
  test.deepEqual(fn('Shell.controller.js', 'Shell.controller.jsAbcdefgh', 1, 20), 4, '(2e) Shell.controller.js 2 20, Shell');


  test.deepEqual(fn('Shlell.controller.js', 'Shell.contrller', 5, 20), 4.5, '(3) Shell.controller.js Shell.contrller');
  test.deepEqual(fn('Shlell.controller.js', 'Shell.contrller',1, 20), 4.5, 'S(4) hell.controller.js 2 20, Shell');

  test.deepEqual(fn('Shell.controller.js', 'Shell', 2, 4),7, 'Shell.controller.js, Shell');

  test.done();
};
*/
