/**
 * @file
 * @module jfseb.fdevstart.breakdown
 * @copyright (c) 2016 Gerd Forstmann
 */
"use strict";
var debug = require("debug");
var debuglog = debug('dispatcher');
function cleanseString(sString) {
    var len = 0;
    while (len !== sString.length) {
        len = sString.length;
        sString = sString.replace(/\s+/g, ' ');
        sString = sString.replace(/^\s+/, '');
        sString = sString.replace(/\s+$/, '');
        sString = sString.replace(/^[,;.]+/, '');
        sString = sString.replace(/[,;.]+$/, '');
    }
    return sString;
}
exports.cleanseString = cleanseString;
function cleanseQuotedString(sString) {
    var len = 0;
    while (len !== sString.length) {
        len = sString.length;
        sString = sString.replace(/\s\s+/g, ' ');
        sString = sString.replace(/\s+/g, ' ');
        sString = sString.replace(/^\s+/, '');
        sString = sString.replace(/\s+$/, '');
        sString = sString.replace(/^[,;.]+/, '');
        sString = sString.replace(/[,;.]+$/, '');
    }
    return sString;
}
exports.cleanseQuotedString = cleanseQuotedString;
var regexpRemoveDouble = new RegExp(/^\"(\".*\")\"$/);
var striptail = new RegExp(/^\"([^\"]+)"$/);
function trimQuoted(sString) {
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
exports.trimQuoted = trimQuoted;
function trimQuotedSpaced(sString) {
    var skipUntil = 0;
    sString = sString.replace(/^"\s+/g, '"');
    sString = sString.replace(/\s+\"$/g, '"');
    return sString;
}
exports.trimQuotedSpaced = trimQuotedSpaced;
function recombineQuoted(aArr) {
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
            }
            else {
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
    });
    return aArr;
}
exports.recombineQuoted = recombineQuoted;
function isQuoted(sString) {
    return !!/^".*"$/.exec(sString);
}
exports.isQuoted = isQuoted;
function countSpaces(sString) {
    var r = 0;
    for (var i = 0; i < sString.length; ++i) {
        if (sString.charAt(i) === ' ') {
            r = r + 1;
        }
    }
    return r;
}
exports.countSpaces = countSpaces;
var Quotes = /^"([^"]+)"/;
function swallowQuote(str, i) {
    var m = Quotes.exec(str.substring(i));
    if (!m) {
        return { token: undefined,
            nextpos: i
        };
    }
    return {
        token: cleanseString(m[1]),
        nextpos: (i + m[0].length)
    };
}
exports.swallowQuote = swallowQuote;
var Word = /^(([-#A-Z_a-z0-9\/\\\%\$&](\'[-#A-Z_a-z0-9\/\\\%\$&])*)+)/;
function swallowWord(str, i) {
    var m = Word.exec(str.substring(i));
    if (!m) {
        return { token: undefined,
            nextpos: i
        };
    }
    return {
        token: m[1],
        nextpos: (i + m[0].length)
    };
}
exports.swallowWord = swallowWord;
function pushToken(res, token) {
    res.tokens.push(token);
    res.fusable[res.tokens.length] = true;
}
/**
 *@param {string} sString , e.g. "a,b c;d O'Hara and "murph'ys"
 *@return {Array<String>} broken down array, e.g.
 * [["a b c"], ["a", "b c"], ["a b", "c"], ....["a", "b", "c"]]
 */
function tokenizeString(sString, spacesLimit) {
    var res = {
        tokens: [],
        fusable: [false]
    };
    var i = 0;
    var seenSep = false;
    while (i < sString.length) {
        switch (sString.charAt(i)) {
            case '"':
                var _a = swallowQuote(sString, i), token = _a.token, nextpos = _a.nextpos;
                if (nextpos === i) {
                    // unterminated quote, treat like separator
                    res.fusable[res.tokens.length] = false;
                    seenSep = true;
                    ++i;
                }
                else if (token === "") {
                    res.fusable[res.tokens.length] = false;
                    seenSep = true;
                    i = nextpos;
                }
                else {
                    res.fusable[res.tokens.length] = false;
                    pushToken(res, token);
                    res.fusable[res.tokens.length] = false;
                    i = nextpos;
                }
                break;
            case '\t':
            case '\n':
            case '\r':
            case ' ':
                i++;
                break;
            case ':':
            case ',':
            case '.':
            case '?':
            case '!':
            case ';':
                res.fusable[res.tokens.length] = false;
                seenSep = true;
                ++i;
                break;
            default:
                var _b = swallowWord(sString, i), token = _b.token, nextpos = _b.nextpos;
                if (token) {
                    pushToken(res, token);
                    i = nextpos;
                }
                else {
                    res.fusable[res.tokens.length] = false;
                    i++;
                }
                break;
        }
    }
    res.fusable[res.tokens.length] = false;
    return res;
}
exports.tokenizeString = tokenizeString;
function makeMatchPattern(str) {
    var tokens = tokenizeString(str);
    var bestlen = 0;
    var best = {
        longestToken: "",
        span: { low: 0, high: 0 }
    };
    if (tokens.tokens.length > 1) {
        tokens.tokens.forEach(function (token, index) {
            var len = token.length;
            if (len > bestlen) {
                bestlen = len;
                best.longestToken = token;
                best.span.low = -index;
            }
        });
        best.span.high = tokens.tokens.length + best.span.low - 1;
        return best;
    }
    return undefined;
}
exports.makeMatchPattern = makeMatchPattern;
/**
 *@param {string} sString , e.g. "a b c"
 *@return {Array<Array<String>>} broken down array, e.g.
 *[["a b c"], ["a", "b c"], ["a b", "c"], ....["a", "b", "c"]]
 */
function breakdownString(sString, spacesLimit) {
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
            var preventry = entry[entry.length - 1];
            // do not combine quoted strings!
            if (preventry === null) {
            }
            else if (isQuoted(u[k]) || isQuoted(preventry)) {
                entry[entry.length - 1] = null;
            }
            else {
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
            return entry;
        });
        debuglog(JSON.stringify(r1));
        debuglog(JSON.stringify(r2));
        w = r1.concat(r2);
    }
    w = w.filter(function (oMap) {
        return oMap.every(function (sWord) {
            return sWord !== null;
        });
    });
    return w.map(function (oMap) {
        return oMap.map(function (sWord) {
            return trimQuoted(sWord);
        });
    });
}
exports.breakdownString = breakdownString;

//# sourceMappingURL=breakdown.js.map
