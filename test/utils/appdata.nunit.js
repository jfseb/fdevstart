/*! copyright gerd forstmann, all rights reserved */
var process = require('process')
var root = (process.env.DO_COVERAGE) ? '../../gen_cov' : '../../gen'

var AppData = require(root + '/utils/appdata.js')

exports.testCtor = function (test) {
  // test.expect(3)
  var u = new AppData('_Test1', 'File1')
  test.deepEqual(typeof u, 'object', 'is object')
  test.done()
}

exports.testCtor = function (test) {
  // test.expect(3)
  var u
  var k
  u = new AppData.AppData('_Test2', 'File1')
  u.setProperty('key1', {
    a: 42
  })

  k = new AppData.AppData('_Test2', 'File1')
  test.deepEqual(k.getProperty('key1').a, 42)
  test.done()
}

/**
 * Unit test for sth
 */
exports.testPersistence = function (test) {
  test.expect(2)
  var u
  u = new AppData.PersistenceHandle('_Test3', 'File1')
  u.save({
    a: 1
  }, function (err) {
    if (err) {
      console.log('got an error' + err)
      throw err
    }
    var k = new AppData.PersistenceHandle('_Test3', 'File1')
    k.load(function (err, sData) {
      test.equal(err, undefined, 'no error')
      test.deepEqual(sData, {a: 1}, 'correct data read')
      test.done()
    })
  })
}
