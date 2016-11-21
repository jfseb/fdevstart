/**
 * The appdata service
 * @file src/utils/appdata.js
 * @author jfseb
 */

/**
 * @module fsdevstart.utils.appdata
 */

;(function () {
  'use strict'
  var process = require('process')
  var dbg = require('debug')
  var fs = require('fs')
  var path = require('path')
  var logger = {
    info: dbg('appdata:info'),
    log: dbg('appdata:log')
  }

  function getUserHome () {
    return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME']
  }
  /**
   * Construct an appdata entity
   * @constructor
   */
  const AppData = function (sAppName, sFileName) {
    this.AppName = sAppName
    logger.log('Dest' + sAppName)
    this.dir = getUserHome() + path.sep + sAppName
    this.fileName = this.dir + path.sep + sFileName
    this.filename = process.env['USERDATA']
    this.data = {}
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir)
    }
    try {
      this.data = JSON.parse(fs.readFileSync(this.fileName))
    } catch (e) {
      this.data = {}
    }
  }

  AppData.prototype.setProperty = function (sKey, oValue) {
    this.data[sKey] = oValue
    fs.writeFileSync(this.fileName, JSON.stringify(this.data, undefined, 2))
  }

  AppData.prototype.getProperty = function (sKey, oValue) {
    return this.data[sKey]
  }

  /**
   * Constructor for file persistence handle,
   * uses user home directory + <sAppName> + / + sFileName for persitence
   * @param sAppName {string} the application name
   * @param sFileName {string} the filename
   * @constructor
   */
  function PersistenceHandle (sAppName, sFileName) {
    this.AppName = sAppName
    logger.log('Dest' + sAppName)
    this.dir = getUserHome() + path.sep + sAppName
    this.fileName = this.dir + path.sep + sFileName
    this.filename = process.env['USERDATA']
    this.data = {}
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir)
    }
    try {
      this.data = JSON.parse(fs.readFileSync(this.fileName))
    } catch (e) {
      this.data = {}
    }
  }

  PersistenceHandle.prototype.writeFile = function (file, data, cb) {
    var sData = JSON.stringify(data)
    fs.writeFile(this.fileName, sData, {
      // encoding : "utf8",
      flag: 'w'
    }, (err) => {
      if (err) {
        cb(err)
      }
      cb()
    })
  }

  PersistenceHandle.prototype.save = function (data, cb) {
    var that = this
    fs.stat(this.dir, function (err, stat) {
      if (err == null) {
        that.writeFile(that.fileName, data, cb)
      } else if (err.code === 'ENOENT') {
        // file does not exist
        fs.mkdir(this.dir, (err) => {
          if (err) {
            cb(err)
          }
          that.writeFile(that.fileName, data, cb)
        }
        )
      } else {
        console.log('Some other error: ', err.code)
        cb(err)
      }
    })
  }

  PersistenceHandle.prototype.load = function (cb) {
    fs.readFile(this.fileName, 'utf8', function (err, data) {
      if (err) {
        cb(err)
        return
      }
      try {
        var sData = JSON.parse(data)
      } catch (e) {
        cb(e)
        return
      }
      cb(undefined, sData)
    })
  }

  module.exports = {
    AppData: AppData,
    PersistenceHandle: PersistenceHandle
  }
}())
