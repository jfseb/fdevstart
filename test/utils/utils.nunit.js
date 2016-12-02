/*! copyright gerd forstmann, all rights reserved */
//var debug = require('debug')('utils.nunit');
var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

var utils = require(root + '/utils/utils.js');

'use strict';
/**
 * Unit test for sth
 */
exports.testdeepFreeze = function (test) {
  'use strict';
  test.expect(3);
  var u;
  u = { a: 1 , b : [], c : undefined,
    d : { dd : 1, dd2: 2}
  };
  utils.deepFreeze(u);

  try {
    delete u.d.dd2;
    test.ok(false);
  } catch(ex) {
    test.ok(true, 'cannot alter');
  }
  try {
    u.a = 5;
    test.ok(false);
  } catch(ex) {
    test.ok(true, 'cannot alter');
  }
  try {
    u.next = 5;
    test.ok(false);
  } catch(ex) {
    test.ok(true, 'cannot alter');
  }
  test.done();
};



/**
 * Unit test for sth
 */
exports.testCloneDeep = function (test) {
  'use strict';
  var u;
  u = { a: 1 , b : [], c : undefined,
    d : { dd : 1, dd2: 2}
  };

  var u2 = utils.cloneDeep(u);

  u.d.dd = 2;
  test.equal(u2.d.dd,1);
  test.equal(u.d.dd,2);
  test.done();
};


/**
 * Unit test for sth
 */
exports.testCloneDeepPrimitive = function (test) {
  'use strict';
  var u2 = utils.cloneDeep(1);
  test.equal(u2, 1);
  test.equal(utils.cloneDeep(undefined), undefined, 'undefined');
  test.equal(utils.cloneDeep(null), null, 'undefined');
  test.deepEqual(utils.cloneDeep({ a: undefined}), {a: undefined}, 'object with empty property');
  test.deepEqual(utils.cloneDeep([1,2,'a']), [1,2,'a'], 'undefined');
  test.done();
};

/**
 * Unit test for sth
 */
exports.testSetMinus = function (test) {
  'use strict';
  var u2 = utils.ArrayUtils.setMinus(['A','D', 'B', 'A', 'C'], ['B', 'A']);
  test.deepEqual(u2, ['D', 'C']);
  test.done();
};


/**
 * Unit test for sth
 */
exports.testindexOf = function (test) {
  'use strict';
  // act
  var u1 = utils.ArrayUtils.indexOf('D',['d','D', 'B', 'A', 'C']);
  // check
  test.deepEqual(u1, 1);
  // act
  var u2 = utils.ArrayUtils.indexOf('D',['d','D', 'B', 'A', 'C'], function(a, b) {
    return a.toLowerCase()=== b.toLowerCase();
  });
  // check
  test.deepEqual(u2, 0, 'where is d');

  // act
  var u3 = utils.ArrayUtils.indexOf('Da',['d','D', 'B', 'A', 'C'], function(a, b) {
    return a.toLowerCase()=== b.toLowerCase();
  });
  // check
  test.deepEqual(u3, -1, 'where is Da');
  test.done();
};
