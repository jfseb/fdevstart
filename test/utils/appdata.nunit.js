/*! copyright gerd forstmann, all rights reserved */
var debug = require('debug')('appdata.nunit');
var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

var AppData = require(root + '/utils/appdata.js');


/**
 * Unit test for sth
 */
exports.testPersistence = function (test) {
  test.expect(2);
  var u;
  u = new AppData.PersistenceHandle('_Test3', 'File1');
  u.save({
    a: 1
  }, function (err) {
    if (err) {
      debug('got an error' + err);
      throw err;
    }
    var k = new AppData.PersistenceHandle('_Test3', 'File1');
    k.load(function (err, sData) {
      test.equal(err, undefined, 'no error');
      test.deepEqual(sData, { a: 1 }, 'correct data read');
      test.done();
    });
  });
};

var fs = require('fs');

function rmDir(dirPath) {
  try {
    var files = fs.readdirSync(dirPath);
  } catch (e) { return; }
  if (files.length > 0) {
    for (var i = 0; i < files.length; i++) {
      var filePath = dirPath + '/' + files[i];
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      } else {
        rmDir(filePath);
      }
    }
  }
  fs.rmdirSync(dirPath);
}

exports.testPersistenceNoDirOnSave = function (test) {
  test.expect(2);
  var dirf = AppData._test.getFileAndDir('_Test4a', 'File1');
  try {
    rmDir(dirf.dir);
  } catch (e) {
    /* empty */
    // emtpy
    // debug("could not remove file");
  }

  var u = new AppData.PersistenceHandle('_Test4a', 'File1');
  u.save({
    a: 1
  }, function (err) {
    if (err) {
      debug('error on save bad' + err);
      test.ok(true, 'got here!');
      test.done();
    }
    var k = new AppData.PersistenceHandle('_Test4a', 'File1');
    k.load(function (err, sData) {
      test.equal(err, undefined, 'no error');
      test.deepEqual(sData, { a: 1 }, 'correct data read');
      test.done();
    });
  });
};

/*eslint no-unused-vars: ["error", { "caughtErrors": "none" }]*/

exports.testPersistenceNoDirOnRead = function (test) {
  test.expect(1);
  var dirf = AppData._test.getFileAndDir('_Test4b', 'File1');
  try {
    rmDir(dirf.dir);
  } catch (e) {
    /*empty */
  }
  debug('got past file removal');
  var u = new AppData.PersistenceHandle('_Test4b', 'File1');
  /*eslint-disable no-unused-vars*/
  u.load(function (err, sData) {
    if (err) {
      debug('got an error' + err);
      test.ok(true, 'loading impossible');
      test.done();
      return;
    }
    test.ok(false, ' should not get here');
    test.ok(sData, 'not zero');
    test.done();
  });
};

exports.testPersistenceNoJSON = function (test) {
  test.expect(1);
  var dirf = AppData._test.getFileAndDir('_Test3x', 'FileA.json');
  try {
    if (!fs.existsSync(dirf.dir)) {
      fs.mkdirSync(dirf.dir);
    }
  } catch (e) {
    // ok, hope not present
  }
  fs.writeFile(dirf.fileName, 'ABC', {
    flag: 'w',
    encoding: 'utf8'
  },
    function (err) {
      if (err) {
        // console.log('cannot open file for writing!')
        test.ok(false, 'error preparing test');
        test.done();
        return;
      }
      // console.log('wrote file!')
      var u = new AppData.PersistenceHandle('_Test3x', 'FileA.json');
      u.load(function (err, sData) {
        if (err) {
          test.ok(true, 'cannot load');
          test.done();
          return;
        }
        test.ok(false, 'got here');
        test.equal(err, undefined, 'no error');
        test.deepEqual(sData, {}, 'correct data read');
        test.done();
      });
    });
};

/**
 * Unit test for sth
 */
exports.testPersistenceNoDir = function (test) {
  test.expect(3);
  // prepare
  var u = new AppData.PersistenceHandle('_Test4', 'File1');
  // console.log('got handle')
  // creates dir, must be first!
  var dirf = AppData._test.getFileAndDir('_Test4', 'File1');
  try {
    rmDir(dirf.dir);
  } catch (e) {
    debug(' trouble removing ' + dirf.dir + ' ' + e.message);
  }
  // console.log('removed')
  // act
  u.save({
    a: 444
  }, function (err) {
    // console.log('saved')
    if (err) {
      test.ok(false, ' no error');
      debug('got an error' + err);
      test.done();
      throw err;
    }
    var k = new AppData.PersistenceHandle('_Test4', 'File1');
    k.load(function (err, sData) {
      test.ok(true, 'could save and read');
      test.equal(err, undefined, 'no error');
      test.deepEqual(sData, { a: 444 }, 'correct data read');
      test.done();
    });
  });
};

/**
 * Unit test for sth
 */
/*
exports.testPersistenceFileLocked = function (test) {
  test.expect(2)
  var dirf = AppData._test.getFileAndDir('_Test5', 'File1')
  try {
    rmDir(dirf.dir)
  } catch (e) {}
  var u = new AppData.PersistenceHandle('_Test5', 'File1')
  u.save({
    a: 333
  }, function (err) {
    if (err) {
      debug('got an error' + err)
      test.ok(false, ' no save')
      test.done()
      throw err
    }
    var fd = fs.openSync(dirf.fileName, 'r')
    var k = new AppData.PersistenceHandle('_Test5', 'File1')
    k.load(function (err, sData) {
      test.equal(err, undefined, 'no error')
      test.deepEqual(sData, {}, 'correct data read')
      fs.close(fd, function (err) {
        debug('got an error closing fd' + err)
      })
      test.done()
    })
  })
}
*/
