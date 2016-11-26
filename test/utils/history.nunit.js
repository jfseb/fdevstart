
var process = require('process')
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen'

var History = require(root + '/utils/history.js')

exports.testCtor = function (test) {
  // test.expect(3)
  var u = new History({
    length: 10, pos: 10
  })
  test.deepEqual(typeof u, 'object', 'is object')
  test.done()
}

exports.testHistory0 = function (test) {
  // test.expect(3)
  var u
  u = new History({ length: 3,
    default: 'defaultfwd'
  })
  test.equal(u.get(), 'defaultfwd', 'defaultfwd 1 ')
  u.backward()
  test.equal(u.get(), 'defaultfwd', 'defaultfwd after back')
  u.forward()
  test.equal(u.get(), 'defaultfwd', 'defaultfwd afeter forward')
  test.done()
}

exports.testHistory1 = function (test) {
  // test.expect(3)
  var u
  u = new History({ length: 3,
    default: 'defaultfwd'
  })
  u.push('entry 1')
  test.equal(u.get(), 'defaultfwd', 'after push entry1 on empty list')
  u.push('entry 2')
  test.equal(u.get(), 'defaultfwd', 'after push')
  u.push('entry 3')
  test.equal(u.get(), 'defaultfwd', 'after push')
  test.equal(u._pos, 3, 'backward')
  test.equal(u.backward(), 'entry 3', 'backward returns')
  test.equal(u._pos, 2, 'backward')
  test.equal(u.get(), 'entry 3', 'back 3 now')
  u.backward()
  test.equal(u.get(), 'entry 2', 'back 1')
  u.forward()
  test.equal(u.get(), 'entry 3', ' fwd to 3')
  u.forward()
  test.equal(u.get(), 'entry 3', 'forward')
  u.forward()
  test.equal(u.get(), 'entry 3', 'forward')
  u.backward()
  test.equal(u.get(), 'entry 2', 'back 1')

  test.done()
}

exports.testBackHitBorder = function (test) {
  // test.expect(3)
  var u
  u = new History({ length: 3,
    default: 'defaultfwd'
  })
  u.push('e 1')
  u.push('e 2')
  u.push('e 3')
  u.push('e 4')
  test.equal(u.backward(), 'e 4', 'backward 4')
  test.equal(u.backward(), 'e 3', 'backward 3')
  test.equal(u.backward(), 'e 2', 'backward 2')
  test.equal(u.backward(), 'e 2', 'backward 2A')
  test.equal(u.backward(), 'e 2', 'backward 2B')
  test.equal(u.backward(), 'e 2', 'backward 2c')
  test.equal(u.backward(), 'e 2', 'backward 2')
  test.equal(u.forward(), 'e 3', 'backward 3')
  test.done()
}

exports.testPushUndefined = function (test) {
  test.expect(11)
  var u
  u = new History({ length: 3,
    default: 'defaultfwd'
  })
  u.push('e 1')
  try {
    u.push(null)
    test.ok(false, 'not here')
  } catch (e) {
    test.ok(true, 'got here')
  }
  u.push('e 2')
  try {
    u.push(undefined)
    test.ok(false, 'not here')
  } catch (e) {
    test.ok(true, 'got here')
  }
  u.push('e 3')
  u.push('e 4')
  test.equal(u.backward(), 'e 4', 'backward 4')
  test.equal(u.backward(), 'e 3', 'backward 3')
  test.equal(u.backward(), 'e 2', 'backward 2')
  test.equal(u.backward(), 'e 2', 'backward 2A')
  test.equal(u.backward(), 'e 2', 'backward 2B')
  test.equal(u.backward(), 'e 2', 'backward 2c')
  test.equal(u.backward(), 'e 2', 'backward 2')
  test.equal(u.forward(), 'e 3', 'backward 3')
  test.ok(true, 'nr 3')
  test.done()
}

exports.testPushSameBackHitBorder = function (test) {
  // test.expect(3)
  var u
  u = new History({ length: 3,
    default: 'defaultfwd'
  })
  u.push('e 1')
  u.push('e 2')
  u.push('e 2')
  u.push('e 3')
  u.push('e 4')
  test.equal(u.backward(), 'e 4', 'backward 4')
  test.equal(u.backward(), 'e 3', 'backward 3')
  test.equal(u.backward(), 'e 2', 'backward 2')
  test.equal(u.backward(), 'e 2', 'backward 2A')
  test.equal(u.backward(), 'e 2', 'backward 2B')
  test.equal(u.backward(), 'e 2', 'backward 2c')
  test.equal(u.backward(), 'e 2', 'backward 2')
  test.equal(u.forward(), 'e 3', 'backward 3')
  test.done()
}

exports.testRetpushOld = function (test) {
  // test.expect(3)
  var u
  u = new History({ length: 6,
    default: 'defaultfwd'
  })
  u.push('entry 1')
  u.push('entry 2')
  u.push('entry 3')
  u.push('entry 4')
  test.equal(u.backward(), 'entry 4', 'backward 4')
  test.equal(u.backward(), 'entry 3', 'backward 3')
  test.equal(u.backward(), 'entry 2', 'backward 2 ')
  u.push('entry 2')
  test.equal(u._pos, 1, 'still at 1')
  test.equal(u._state, 'pushed', 'still at 1')
  test.equal(u.backward(), 'entry 2', 'backward 2b')
  test.equal(u._pos, 1, 'still at 1b')
  test.equal(u.backward(), 'entry 1', 'backward 1c')
  test.equal(u._pos, 0, 'still at 1c')
  test.equal(u.forward(), 'entry 2', 'fw 2')
  test.equal(u.forward(), 'entry 3', 'fw 3')
  test.equal(u.forward(), 'entry 4', 'fw 4')
  test.equal(u._pos, 3, 'still at 1c')
  test.equal(u.forward(), 'entry 2', 'fw 2x')
  test.equal(u._pos, 4, 'still at 1c')
  test.equal(u.forward(), 'entry 2', 'fw 2y')
  test.done()
}

exports.testRetpushOld2 = function (test) {
  // test.expect(3)
  var u
  u = new History({ length: 6,
    default: 'defaultfwd'
  })
  u.push('entry 1')
  u.push('exntry 2')
  u.push('entry 3')
  u.push('entry 4')
  test.equal(u.backward(), 'entry 4', 'backward 4')
  test.equal(u.backward(), 'entry 3', 'backward 3')
  test.equal(u.backward(), 'exntry 2', 'backward 2 ')
  u.push('exntry 2')
  test.equal(u._pos, 1, 'still at 1')
  test.equal(u._state, 'pushed', 'still at 1')
  test.equal(u.forward(), 'entry 3', 'backward 2b')
  test.equal(u._state, 'history', 'still at 1')
  test.equal(u._pos, 2, 'still at 3b')
  test.equal(u.forward(), 'entry 4', 'fw 4')
  test.equal(u._pos, 3, 'still at 1c')
  test.equal(u.forward(), 'exntry 2', 'fw 2x')
  test.equal(u._pos, 4, 'still at 1c')
  test.equal(u.forward(), 'exntry 2', 'fw 2y')
  test.done()
}

exports.testHistoryPersistenceWrite = function (test) {
  // test.expect(3)
  var u
  var oLastSave
  function fnSave (oData) {
    oLastSave = oData
  }
  u = new History({ length: 6,
    default: 'defaultfwd',
    save: fnSave
  })
  u.push('entry 1')
  u.push('exntry 2')
  u.push('entry 3')

  test.deepEqual(oLastSave, {
    pos: 3,
    entries: [ 'entry 1', 'exntry 2', 'entry 3' ]
  }, 'last save')
  u.push('entry 4')
  test.equal(u.backward(), 'entry 4', 'backward 4')
  test.deepEqual(oLastSave, {
    pos: 4,
    entries: [ 'entry 1', 'exntry 2', 'entry 3', 'entry 4' ]
  }, 'save after backwards')

  test.done()
}

exports.testHistoryPersistenceLoadEmpty = function (test) {
  // test.expect(3)
  var u
  var fnCB
  function fnLoad (cb) {
    fnCB = cb
  }
  u = new History({ length: 5,
    default: 'defaultfwd',
    load: fnLoad
  })
  fnCB(undefined, {
    pos: 2,
    entries: [ 'hentry1', 'hentry2', 'hentry3' ]
  })
  u.push('entry 1')
  test.equal(u.backward(), 'hentry3', 'backward 2')
  test.equal(u.backward(), 'hentry2', 'backward 2')
  test.equal(u.backward(), 'hentry1', 'backward 2n')
  test.done()
}

exports.testHistoryPersistenceLoadEmptyPos2 = function (test) {
  // test.expect(3)
  var u
  var fnCB
  function fnLoad (cb) {
    fnCB = cb
  }
  u = new History({ length: 5,
    default: 'defaultfwd',
    load: fnLoad
  })
  fnCB(undefined, {
    pos: 3,
    entries: [ 'hentry1', 'hentry2', 'hentry3' ]
  })
  u.push('entry 1')
  test.equal(u.backward(), 'entry 1', 'backward 1')
  test.equal(u.backward(), 'hentry3', 'backward 2')
  test.equal(u.backward(), 'hentry2', 'backward 2')
  test.equal(u.backward(), 'hentry1', 'backward 2n')
  test.done()
}

exports.testHistoryPersistenceLoadLate = function (test) {
  // test.expect(3)
  var u
  var fnCB
  function fnLoad (cb) {
    fnCB = cb
  }
  u = new History({ length: 5,
    default: 'defaultfwd',
    load: fnLoad
  })
  u.push('entry 1')
  fnCB(undefined, {
    pos: 3,
    entries: [ 'hentry1', 'hentry2', 'hentry3' ]
  })
  u.push('exntry 2')
  u.push('entry 3')
  test.equal(u.backward(), 'entry 3', 'backward 1 ')
  test.equal(u.backward(), 'exntry 2', 'backward 2')
  test.equal(u.backward(), 'entry 1', 'backward 1')
  test.equal(u.backward(), 'hentry3', 'backward 2')
  test.equal(u.backward(), 'hentry2', 'backward 2')
  test.equal(u.backward(), 'hentry2', 'backward 2n')
  test.done()
}
