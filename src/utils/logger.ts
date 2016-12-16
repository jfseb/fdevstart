

/**
 * a simple logger utility
 *
 *
 * There are two types of logs ( append and overwrite, default is append)
 */

/// <reference path="../../lib/node-4.d.ts" />

import * as debug from 'debug';

const debuglog = debug('logger');

interface ILogger {
  name: string,
  flags: string,
  logIt?: (any) => void
};


var perfs = {} as {[key : string] : { enabled : boolean, name : string, last: number, first : number, on : {}}};


function logPerf(sString) {
  if(!this || !this.enabled) {
    return;
  }
  var label = 'perf' + this.name;
  console.log('Perf' + this.name);
  if(this.first === 0) {
      this.first = Date.now();
  } else {
    console.log('Perf' + this.name + ' total ' + (Date.now() - this.first));
  }
  if( this.on[sString]) {
     console.timeEnd(sString)
     delete this.on[sString];
  } else {
      console.time(sString);
      this.on[sString] = 1;
  }
}

export function perf(string) {
  perfs[string] = { name : string, last : 0, first: 0, on : {}, enabled : false };
  if (debug('perf' + string).enabled )
  { perfs[string].enabled = true;
  }
  return logPerf.bind(perfs[string]);
}

import * as fs from 'fs';

var loggers = {} as { [key: string]: ILogger };

function getFileName(name: string) {
  return './logs/' + name + ".log";
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