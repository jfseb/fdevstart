/**
 * (c) gerd forstmann 2017
 */
'use strict';

var JSONx = require('circular-json');

import * as fs from 'fs';
import * as debug from 'debug';

import * as zlib from 'zlib';

const debuglog = debug('circularser');


function zipData(data : string)  : Buffer {
    var r = zlib.deflateSync(Buffer.from(data,'utf-8'));
    //console.log("here r" + typeof r + " r" + r.length + " to string" + r.toString().length);
    var k = zlib.inflateSync(r);
   //  var k = zlib.inflateSync(Buffer.from(r.toString()));
    return r;
}

function unzipData(r : any) : string {
    //console.log("here data  " + typeof r + " r" + r.length + " to string" + r.toString().length);
    r = new Buffer(r, 'binary');
      //console.log("here data  " + typeof r + " r" + r.length + " to string" + r.toString().length);
    return zlib.inflateSync(r).toString();
}

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

    var u = zipData(s);
    fs.writeFileSync(fn + ".zip", u,  'binary'); // { encoding : 'utf-8'});
}

export function load(fn: string) {
    var obj;
    try {
        debuglog("read file " + fn);
        var d =  fs.readFileSync(fn + ".zip", 'binary'); // utf-8'); //utf-8');
        debuglog("start unzip : " + (typeof d) + " length ? " + ('' + d).length );
        var s = '' + unzipData(d);
        debuglog('loaded file' + s.length);
        debuglog("end unzip");
        if(global && global.gc) {
            global.gc();
        }
        obj = parse(s);
        if(global && global.gc) {
            global.gc();
        }
        debuglog("end parse");
    } catch (e) {
        debuglog('here e :' +e);
        return undefined;
    }
    return obj;
}
