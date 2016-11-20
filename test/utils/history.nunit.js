var History = require('../../src/utils/history.js')

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
