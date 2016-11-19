(function () {
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
  module.exports = AppData
}())
