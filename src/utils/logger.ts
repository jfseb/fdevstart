

/**
 * a simple logger utility
 *
 *
 * There are two types of logs ( append and overwrite, default is append)
 */

// <reference path="../../lib/node-4.d.ts" />

import * as debug from 'debug';

const debuglog = debug('logger');

interface ILogger {
  name: string,
  flags: string,
  logIt?: (any) => void
};

var perfs = {} as {[key : string] : { enabled : boolean, name : string, last: number, first : number, on : {}}};

export function logPerf(cons : any, sString : string) {
  if(!this || !this.enabled) {
    return;
  }
  var label = 'perf' + this.name;
  cons.log('Perf' + this.name);
  if(this.first === 0) {
      this.first = Date.now();
      this.last = this.first;
  } else {
    var t = Date.now();
    cons.log('Perf' + this.name +
     ' delta: '  + String("      " + (t-this.last)).slice(-6)
    +' total: '  + String("      " + (t-this.first)).slice(-6));
    this.last =  t;
  }
  if(this.on[sString]) {
     cons.timeEnd(sString)
     delete this.on[sString];
  } else {
      cons.time(sString);
      this.on[sString] = 1;
  }
}

export function perf(string) {
  perfs[string] = { name : string, last : 0, first: 0, on : {}, enabled : false };
  if (debug('perf' + string).enabled )
  { perfs[string].enabled = true;
  }
  return logPerf.bind(perfs[string], console);
}

import * as fs from 'fs';

var loggers = {} as { [key: string]: ILogger };

var os = require('os');

function getWritableDir() {
  // return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
  return os.tmpdir();
}


function setupOnce() {

  var home = getWritableDir();
  try {
    fs.mkdirSync(home + '/' + 'fdevstart' );
  } catch (e) {

  }
  try {
    fs.mkdirSync(home + '/fdevstart/logs' );
  } catch(e) {

  }
}
setupOnce();


function getFileName(name: string) {
  return os.tmpdir()  + '/fdevstart/logs/' + name + ".log";
}

export const _test = {
  getFileName: getFileName
};

function logIt(logger: ILogger, arg) {
  var text: string;
  if (typeof arg === "string") {
    text = arg;
  } else if (arg instanceof Error) {
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

export function logger(name: string, flags?: string): (any) => void {
  if (flags !== 'a' && flags !== '' && flags !== undefined) {
    throw new Error('only a allowed as flags');
  }
  flags = (flags === undefined )?  'a' : flags;
  if (typeof name !== "string" || !/^[A-Za-z][A-Za-z0-9_]+$/.exec(name)) {
    throw new Error('Logger name must be at least two alphanumeric characters')
  }
  if (!loggers[name]) {
    var alogger = {
      name: name,
      flags: flags
    } as ILogger;
    alogger.logIt = logIt.bind(undefined, alogger);
    // reset the file
    if (flags === '') {
      try {
        fs.unlinkSync(getFileName(name));
      } catch (e) {
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