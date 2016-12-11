/**
 * a simple logger utility
 *
 *
 * There are two types of logs ( append and overwrite, default is append)
 */
"use strict";
/// <reference path="../../lib/node-4.d.ts" />
var debug = require('debug');
var debuglog = debug('logger');
;
var fs = require('fs');
var loggers = {};
function getFileName(name) {
    return './logs/' + name + ".log";
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
    flags = flags || "a";
    if (flags !== 'a' && flags !== '') {
        throw new Error('only a allowed as flags');
    }
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
