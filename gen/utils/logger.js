/**
 * a simple logger utility
 *
 *
 * There are two types of logs ( append and overwrite, default is append)
 */
"use strict";
// <reference path="../../lib/node-4.d.ts" />
var debug = require('debug');
var debuglog = debug('logger');
;
var perfs = {};
function logPerf(sString) {
    if (!this || !this.enabled) {
        return;
    }
    var label = 'perf' + this.name;
    console.log('Perf' + this.name);
    if (this.first === 0) {
        this.first = Date.now();
        this.last = this.first;
    }
    else {
        var t = Date.now();
        console.log('Perf' + this.name +
            ' delta: ' + String("      " + (t - this.last)).slice(-6)
            + ' total: ' + String("      " + (t - this.first)).slice(-6));
        this.last = t;
    }
    if (this.on[sString]) {
        console.timeEnd(sString);
        delete this.on[sString];
    }
    else {
        console.time(sString);
        this.on[sString] = 1;
    }
}
function perf(string) {
    perfs[string] = { name: string, last: 0, first: 0, on: {}, enabled: false };
    if (debug('perf' + string).enabled) {
        perfs[string].enabled = true;
    }
    return logPerf.bind(perfs[string]);
}
exports.perf = perf;
var fs = require('fs');
var loggers = {};
var os = require('os');
function getWritableDir() {
    // return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
    return os.tmpdir();
}
function setupOnce() {
    var home = getWritableDir();
    try {
        fs.mkdirSync(home + '/' + 'fdevstart');
    }
    catch (e) {
    }
    try {
        fs.mkdirSync(home + '/fdevstart/logs');
    }
    catch (e) {
    }
}
setupOnce();
function getFileName(name) {
    return os.tmpdir() + '/fdevstart/logs/' + name + ".log";
}
exports._test = {
    getFileName: getFileName
};
function logIt(logger, arg) {
    var text;
    if (typeof arg === "string") {
        text = arg;
    }
    else if (arg instanceof Error) {
        text = "Error:" + arg.message + " " + arg.stack;
    }
    if (!text) {
        throw new Error("Illegal argument to log");
    }
    var filename = getFileName(logger.name);
    var d = new Date();
    var n = d.toUTCString() + "\t" + text;
    debuglog('writing log entry to ' + filename + ' ' + n);
    fs.writeFileSync(filename, n, { encoding: 'utf-8', flag: 'a' });
}
function logger(name, flags) {
    if (flags !== 'a' && flags !== '' && flags !== undefined) {
        throw new Error('only a allowed as flags');
    }
    flags = (flags === undefined) ? 'a' : flags;
    if (typeof name !== "string" || !/^[A-Za-z][A-Za-z0-9_]+$/.exec(name)) {
        throw new Error('Logger name must be at least two alphanumeric characters');
    }
    if (!loggers[name]) {
        var alogger = {
            name: name,
            flags: flags
        };
        alogger.logIt = logIt.bind(undefined, alogger);
        // reset the file
        if (flags === '') {
            try {
                fs.unlinkSync(getFileName(name));
            }
            catch (e) {
                debuglog("***ERROR: unable to remove log file " + getFileName(name));
            }
        }
        loggers[name] = alogger;
    }
    if (loggers[name].flags !== flags) {
        throw new Error('FLags mismatch in logger' + name);
    }
    return loggers[name].logIt;
}
exports.logger = logger;

//# sourceMappingURL=logger.js.map
