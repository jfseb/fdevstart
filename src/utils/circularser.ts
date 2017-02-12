/**
 * (c) gerd forstmann 2017
 */
'use strict';

var JSONx = require('circular-json');

import * as fs from 'fs';
import * as debug from 'debug';

const debuglog = debug('circularser');


/* this from http://stackoverflow.com/questions/12075927/serialization-of-regexp */
function replacer(key, value) {
  if (value instanceof RegExp)
    return ("__REGEXP " + value.toString());
  else
    return value;
}

function reviver(key, value) {
  if (value && value.toString().indexOf("__REGEXP ") == 0) {
    var m = value.split("__REGEXP ")[1].match(/\/(.*)\/(.*)?/);
    return new RegExp(m[1], m[2] || "");
  } else
    return value;
}

//console.logJSON.parse(JSON.stringify(obj, replacer, 2), reviver));

export function stringify(obj: any) : string {
    var s = JSONx.stringify(obj, replacer);
    return s;
}

export function parse(s: string) : any {
    var obj;
    try {
        obj = JSONx.parse(s, reviver);
    } catch (e) {
        //console.log("here e" + e);
        return undefined;
    }
    return obj;
}

export function save(fn : string, obj: any) : void {
    var s = stringify(obj);
    fs.writeFileSync(fn, s, { encoding : 'utf-8'});
}

export function load(fn: string) {
    var obj;
    try {
        var s = '' + fs.readFileSync(fn,'utf-8');
        debuglog('loaded file' + s.length);
        obj = parse(s);

    } catch (e) {
        debuglog('here e' +e);
        return undefined;
    }
    return obj;
}
