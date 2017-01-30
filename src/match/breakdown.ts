/**
 * @file
 * @module jfseb.fdevstart.breakdown
 * @copyright (c) 2016 Gerd Forstmann
 */

import * as debug from 'debug';
const debuglog = debug('dispatcher')


export function cleanseString(sString: string): string {
    var len = 0;
    while (len !== sString.length) {
        len = sString.length;
        sString = sString.replace(/\s\s+/g, ' ');
        sString = sString.replace(/\s\s+/g, ' ');
        sString = sString.replace(/^\s+/, '');
        sString = sString.replace(/\s+$/, '');
        sString = sString.replace(/^[,;.]+/, '');
        sString = sString.replace(/[,;.]+$/, '');
    }
    return sString
}


const regexpRemoveDouble = new RegExp(/^\"(\".*\")\"$/);
const striptail = new RegExp(/^\"([^\"]+)"$/)

export function trimQuoted(sString: string): string {
    var skipUntil = 0;
    var stripped = sString;
    var m = regexpRemoveDouble.exec(sString);
    while (m) {
        stripped = m[1];
        m = regexpRemoveDouble.exec(stripped);
    }
    debuglog("stripped " + stripped);
    m = striptail.exec(stripped);
    if (m) {
        return m[1];
    }
    return cleanseString(sString);
}


export function trimQuotedSpaced(sString: string): string {
    var skipUntil = 0;
    sString = sString.replace(/^"\s+/g, '"');
    sString = sString.replace(/\s+\"$/g, '"');
    return sString;
}


export function recombineQuoted(aArr: Array<string>): Array<string> {
    var skipUntil = 0;
    aArr = aArr.map(function (s, index) {
        if (index < skipUntil) {
            debuglog("skipping >" + s + "<");
            return undefined;
        }
        if (/^"/.exec(s)) {
            var i = index;
            while (i < aArr.length && (!/"$/.exec(aArr[i]) || (index === i && s === '"'))) {
                i = i + 1;
            }
            if (i === aArr.length) {
                debuglog("Unterminated quoted string");
                return s;
            } else {
                skipUntil = i + 1;
                var res = aArr.slice(index, i + 1).join(" ");
            }
            return res;
        }
        return s;
    }).filter(function (s) {
        return s !== undefined;
    }).map(function (s) {
        return trimQuotedSpaced(s);
    })
    return aArr;
}

export function isQuoted(sString) {
    return !!/^".*"$/.exec(sString);
}

export function countSpaces(sString: string) {
    var r = 0;
    for (var i = 0; i < sString.length; ++i) {
        if (sString.charAt(i) === ' ') {
            r = r + 1;
        }
    }
    return r;
}


/**
 *@param {string} sString , e.g. "a b c"
 *@return {Array<Array<String>>} broken down array, e.g.
 *[["a b c"], ["a", "b c"], ["a b", "c"], ....["a", "b", "c"]]
 */
export function breakdownString(sString: string, spacesLimit?: number): Array<Array<String>> {
    var rString = cleanseString(sString);
    if (spacesLimit === undefined) {
        spacesLimit = -1;
    }
    var u = rString.split(" ");
    u = recombineQuoted(u);
    var k = 0;
    if (u.length === 0) {
        return [[]];
    }
    var w = [[u[0]]];
    while (k < u.length - 1) {
        k = k + 1;
        var r1 = w.map(function (entry) {
            debuglog(JSON.stringify(entry));
            var entry = entry.slice(0);
            debuglog(JSON.stringify(entry));
            var preventry = entry[entry.length -1];
            // do not combine quoted strings!
            if (preventry === null) {
                /* do nothing */ //return entry;
            } else if (isQuoted(u[k]) || isQuoted(preventry)) {
                entry[entry.length - 1] = null;
            } else {
                var combined = preventry + " " + u[k];
                if (spacesLimit > 0 && countSpaces(combined) > spacesLimit) {
                    combined = null;
                }
                entry[entry.length - 1] = combined;
            }
            return entry;
        });
        var r2 = w.map(function (entry) {
            debuglog("2 >" + JSON.stringify(entry));
            var entry = entry.slice(0);
            entry.push(u[k]);
            return entry
        });
        debuglog(JSON.stringify(r1));
        debuglog(JSON.stringify(r2));
        w = r1.concat(r2);
    }
    w = w.filter(function(oMap) {
        return oMap.every(function(sWord) {
            return sWord !== null;
        });
    });
    return w.map(function (oMap) {
        return oMap.map(function (sWord) {
            return trimQuoted(sWord);
        });
    });
}

import * as IMatch from './ifmatch'

