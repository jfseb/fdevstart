
import * as debug from 'debug';
const debuglog = debug('dispatcher')


export function cleanseString(sString : string) : string {
    sString = sString.replace(/^\s+/,'');
    sString = sString.replace(/\s+$/,'');
    sString = sString.replace(/\s\s+/g, ' ');
    return sString
}
/**
 *
 */
export function breakdownString(sString: string) : Array<Array<String>> {
    var u = sString.split(" ");
    var k = 0;
    if(u.length === 0) {
        return [[]];
    }
    var w = [[u[0]]];
    while(k < u.length - 1) {
        k = k + 1;
        var r1 = w.map(function (entry) {
            debuglog(JSON.stringify(entry));
            var entry = entry.slice(0);
            debuglog(JSON.stringify(entry));
            entry[entry.length -1 ] = entry[entry.length-1 ] + " " + u[k];
            return entry;
        });
        var r2 =  w.map(function (entry) {
            debuglog("2 >" + JSON.stringify(entry));
            var entry = entry.slice(0);
            entry.push(u[k]);
            return entry
        });
        debuglog(JSON.stringify(r1));
        debuglog(JSON.stringify(r2));
        w = r1.concat(r2);
    }
    return w;
}

import * as IMatch from './ifmatch'

