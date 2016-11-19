
var AppData = require('../../src/utils/appdata.js')

exports.testCtor = function (test) {
    // test.expect(3);
  var u = new AppData('_Test1', 'File1')
  test.deepEqual(typeof u, 'object', 'is object')
  test.done()
}

exports.testCtor = function (test) {
    // test.expect(3);
  var u
  var k
  u = new AppData('_Test2', 'File1')
  u.setProperty('key1', {
    a: 42
  })

  k = new AppData('_Test2', 'File1')
  test.deepEqual(k.getProperty('key1').a, 42)
  test.done()
}
