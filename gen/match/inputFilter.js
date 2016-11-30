/// <reference path="../../lib/node-4.d.ts" />
"use strict";
/**
 * the input filter stage preprocesses a current context
 *
 * It a) combines multi-segment arguments into one context members
 * It b) attempts to augment the context by additional qualifications
 *           (Mid term generating Alternatives, e.g.
 *                 ClientSideTargetResolution -> unit test?
 *                 ClientSideTargetResolution -> source ?
 *           )
 *  Simple rules like  Intent
 *
 *
 * @module
 * @file inputFilter.ts
 */

var distance = require('../utils/damerauLevenshtein');
var debug = require('debug');
var breakdown = require('./breakdown');
var debuglog = debug('inputFilter');
var matchdata = require('./matchdata');
var oUnitTests = matchdata.oUnitTests;
/**
 * @param sText {string} the text to match to NavTargetResolution
 * @param sText2 {string} the query text, e.g. NavTarget
 *
 * @return the distance, note that is is *not* symmetric!
 */
function calcDistance(sText1, sText2) {
    // console.log("length2" + sText1 + " - " + sText2)
    var a0 = distance.levenshtein(sText1.substring(0, sText2.length), sText2);
    var a = distance.levenshtein(sText1.toLowerCase(), sText2);
    return a0 * 500 / sText2.length + a;
}
var IFMatch = require('../match/ifmatch');
function nonPrivateKeys(oA) {
    return Object.keys(oA).filter(function (key) {
        return key[0] !== '_';
    });
}
function countAinB(oA, oB, fnCompare, aKeyIgnore) {
    aKeyIgnore = Array.isArray(aKeyIgnore) ? aKeyIgnore : typeof aKeyIgnore === "string" ? [aKeyIgnore] : [];
    fnCompare = fnCompare || function () {
        return true;
    };
    return nonPrivateKeys(oA).filter(function (key) {
        return aKeyIgnore.indexOf(key) < 0;
    }).reduce(function (prev, key) {
        if (Object.prototype.hasOwnProperty.call(oB, key)) {
            prev = prev + (fnCompare(oA[key], oB[key], key) ? 1 : 0);
        }
        return prev;
    }, 0);
}
exports.countAinB = countAinB;
function spuriousAnotInB(oA, oB, aKeyIgnore) {
    aKeyIgnore = Array.isArray(aKeyIgnore) ? aKeyIgnore : typeof aKeyIgnore === "string" ? [aKeyIgnore] : [];
    return nonPrivateKeys(oA).filter(function (key) {
        return aKeyIgnore.indexOf(key) < 0;
    }).reduce(function (prev, key) {
        if (!Object.prototype.hasOwnProperty.call(oB, key)) {
            prev = prev + 1;
        }
        return prev;
    }, 0);
}
exports.spuriousAnotInB = spuriousAnotInB;
function lowerCase(o) {
    if (typeof o === "string") {
        return o.toLowerCase();
    }
    return o;
}
function compareContext(oA, oB, aKeyIgnore) {
    var equal = countAinB(oA, oB, function (a, b) {
        return lowerCase(a) === lowerCase(b);
    }, aKeyIgnore);
    var different = countAinB(oA, oB, function (a, b) {
        return lowerCase(a) !== lowerCase(b);
    }, aKeyIgnore);
    var spuriousL = spuriousAnotInB(oA, oB, aKeyIgnore);
    var spuriousR = spuriousAnotInB(oB, oA, aKeyIgnore);
    return {
        equal: equal,
        different: different,
        spuriousL: spuriousL,
        spuriousR: spuriousR
    };
}
exports.compareContext = compareContext;
function categorizeString(string, exact, oRules) {
    // simply apply all rules
    var res = [];
    oRules.forEach(function (oRule) {
        switch (oRule.type) {
            case 0 /* WORD */:
                if (exact && oRule.word === string) {
                    res.push({
                        string: string,
                        matchedString: oRule.matchedString,
                        category: oRule.category
                    });
                }
                if (!exact) {
                    var levenmatch = calcDistance(oRule.word, string);
                    if (levenmatch < 150) {
                        res.push({
                            string: string,
                            matchedString: oRule.word,
                            category: oRule.category,
                            levenmatch: levenmatch
                        });
                    }
                }
                break;
            case 1 /* REGEXP */:
                {
                    debuglog(JSON.stringify(" here regexp" + JSON.stringify(oRule, undefined, 2)));
                    var m = oRule.regexp.exec(string);
                    if (m) {
                        res.push({
                            string: string,
                            matchedString: oRule.matchIndex !== undefined && m[oRule.matchIndex] || string,
                            category: oRule.category
                        });
                    }
                }
                break;
            default:
                throw new Error("unknown type" + JSON.stringify(oRule, undefined, 2));
        }
    });
    return res;
}
exports.categorizeString = categorizeString;
/**
 *
 * Options may be {
 * matchothers : true,  => only rules where all others match are considered
 * augment : true,
 * override : true }  =>
 *
 */
function matchWord(oRule, context, options) {
    if (context[oRule.key] === undefined) {
        return undefined;
    }
    var s1 = context[oRule.key].toLowerCase();
    var s2 = oRule.word.toLowerCase();
    options = options || {};
    var delta = compareContext(context, oRule.follows, oRule.key);
    debuglog(JSON.stringify(delta));
    debuglog(JSON.stringify(options));
    if (options.matchothers && delta.different > 0) {
        return undefined;
    }
    var c = calcDistance(s2, s1);
    debuglog(" s1 <> s2 " + s1 + "<>" + s2 + "  =>: " + c);
    if (c < 150) {
        var res = Object.assign({}, oRule.follows);
        res = Object.assign(res, context);
        if (options.override) {
            res = Object.assign(res, oRule.follows);
        }
        // force key property
        // console.log(' objectcategory', res['systemObjectCategory']);
        res[oRule.key] = oRule.follows[oRule.key] || res[oRule.key];
        res._weight = Object.assign({}, res._weight);
        res._weight[oRule.key] = c;
        Object.freeze(res);
        debuglog('Found one' + JSON.stringify(res, undefined, 2));
        return res;
    }
    return undefined;
}
exports.matchWord = matchWord;
function extractArgsMap(match, argsMap) {
    var res = {};
    if (!argsMap) {
        return res;
    }
    Object.keys(argsMap).forEach(function (iKey) {
        var value = match[iKey];
        var key = argsMap[iKey];
        if (typeof value === "string" && value.length > 0) {
            res[key] = value;
        }
    });
    return res;
}
exports.extractArgsMap = extractArgsMap;
function analyzeString(sString, aRules) {
    var cnt = 0;
    var fac = 1;
    var u = breakdown.breakdownString(sString);
    debuglog("here breakdown" + JSON.stringify(u));
    var words = {};
    var res = u.map(function (aArr) {
        return aArr.map(function (sWordGroup) {
            var seenIt = words[sWordGroup];
            if (seenIt === undefined) {
                seenIt = categorizeString(sWordGroup, true, aRules);
                words[sWordGroup] = seenIt;
            }
            cnt = cnt + seenIt.length;
            fac = fac * seenIt.length;
            if (!seenIt) {
                throw new Error("Expecting at least one match for " + sWordGroup);
            }
            return seenIt;
        });
    });
    debuglog(" sentences " + u.length + " matches " + cnt + " fac: " + fac);
    return res;
}
exports.analyzeString = analyzeString;
/*
[ [a,b], [c,d]]

00 a
01 b
10 c
11 d
12 c
*/
// we can replicate the tail or the head,
// we replicate the tail as it is smaller.
// [a,b,c ]
function expandMatchArr(deep) {
    var a = [];
    var line = [];
    debuglog(JSON.stringify(deep));
    deep.forEach(function (uBreakDownLine, iIndex) {
        line[iIndex] = [];
        uBreakDownLine.forEach(function (aWordGroup, wgIndex) {
            line[iIndex][wgIndex] = [];
            aWordGroup.forEach(function (oWordVariant, iWVIndex) {
                line[iIndex][wgIndex][iWVIndex] = oWordVariant;
            });
        });
    });
    debuglog(JSON.stringify(line));
    var res = [];
    var nvecs = [];
    for (var i = 0; i < line.length; ++i) {
        var vecs = [[]];
        var nvecs = [];
        var rvec = [];
        for (var k = 0; k < line[i].length; ++k) {
            //vecs is the vector of all so far seen variants up to k wgs.
            var nextBase = [];
            for (var l = 0; l < line[i][k].length; ++l) {
                debuglog("vecs now" + JSON.stringify(vecs));
                nvecs = []; //vecs.slice(); // copy the vec[i] base vector;
                debuglog("vecs copied now" + JSON.stringify(nvecs));
                for (var u = 0; u < vecs.length; ++u) {
                    nvecs[u] = vecs[u].slice(); //
                    debuglog("copied vecs[" + u + "]" + JSON.stringify(vecs[u]));
                    nvecs[u].push(line[i][k][l]); // push the lth variant
                    debuglog("now nvecs " + nvecs.length + " " + JSON.stringify(nvecs));
                }
                debuglog(" at     " + k + ":" + l + " nextbase >" + JSON.stringify(nextBase));
                debuglog(" append " + k + ":" + l + " nvecs    >" + JSON.stringify(nvecs));
                nextBase = nextBase.concat(nvecs);
                debuglog("  result " + k + ":" + l + " nvecs    >" + JSON.stringify(nextBase));
            } //constru
            debuglog("now at " + k + ":" + l + " >" + JSON.stringify(nextBase));
            vecs = nextBase;
        }
        debuglog("APPENDING TO RES" + i + ":" + l + " >" + JSON.stringify(nextBase));
        res = res.concat(vecs);
    }
    return res;
}
exports.expandMatchArr = expandMatchArr;
function matchRegExp(oRule, context, options) {
    if (context[oRule.key] === undefined) {
        return undefined;
    }
    var sKey = oRule.key;
    var s1 = context[oRule.key].toLowerCase();
    var reg = oRule.regexp;
    var m = reg.exec(s1);
    debuglog("applying regexp: " + s1 + " " + JSON.stringify(m));
    if (!m) {
        return undefined;
    }
    options = options || {};
    var delta = compareContext(context, oRule.follows, oRule.key);
    debuglog(JSON.stringify(delta));
    debuglog(JSON.stringify(options));
    if (options.matchothers && delta.different > 0) {
        return undefined;
    }
    var oExtractedContext = extractArgsMap(m, oRule.argsMap);
    debuglog("extracted args " + JSON.stringify(oRule.argsMap));
    debuglog("match " + JSON.stringify(m));
    debuglog("extracted args " + JSON.stringify(oExtractedContext));
    var res = Object.assign({}, oRule.follows);
    res = Object.assign(res, oExtractedContext);
    res = Object.assign(res, context);
    if (oExtractedContext[sKey] !== undefined) {
        res[sKey] = oExtractedContext[sKey];
    }
    if (options.override) {
        res = Object.assign(res, oRule.follows);
        res = Object.assign(res, oExtractedContext);
    }
    Object.freeze(res);
    debuglog('Found one' + JSON.stringify(res, undefined, 2));
    return res;
}
exports.matchRegExp = matchRegExp;
function sortByWeight(sKey, oContextA, oContextB) {
    debuglog('sorting: ' + sKey + 'invoked with\n 1:' + JSON.stringify(oContextA, undefined, 2) + " vs \n 2:" + JSON.stringify(oContextB, undefined, 2));
    var rankingA = parseFloat(oContextA["_ranking"] || "1");
    var rankingB = parseFloat(oContextB["_ranking"] || "1");
    if (rankingA !== rankingB) {
        debuglog(" rankin delta" + 100 * (rankingB - rankingA));
        return 100 * (rankingB - rankingA);
    }
    var weightA = oContextA["_weight"] && oContextA["_weight"][sKey] || 0;
    var weightB = oContextB["_weight"] && oContextB["_weight"][sKey] || 0;
    return +(weightA - weightB);
}
exports.sortByWeight = sortByWeight;
// Word, Synonym, Regexp / ExtractionRule
function augmentContext1(context, oRules, options) {
    var sKey = oRules[0].key;
    // check that rule
    if (debuglog.enabled) {
        // check consistency
        oRules.every(function (iRule) {
            if (iRule.key !== sKey) {
                throw new Error("Inhomogenous keys in rules, expected " + sKey + " was " + JSON.stringify(iRule));
            }
            return true;
        });
    }
    // look for rules which match
    var res = oRules.map(function (oRule) {
        // is this rule applicable
        switch (oRule.type) {
            case 0 /* WORD */:
                return matchWord(oRule, context, options);
            case 1 /* REGEXP */:
                return matchRegExp(oRule, context, options);
        }
        return undefined;
    }).filter(function (ores) {
        return !!ores;
    }).sort(sortByWeight.bind(this, sKey));
    return res;
    // Object.keys().forEach(function (sKey) {
    // });
}
exports.augmentContext1 = augmentContext1;
function augmentContext(context, aRules) {
    var options1 = {
        matchothers: true,
        override: false
    };
    var aRes = augmentContext1(context, aRules, options1);
    if (aRes.length === 0) {
        var options2 = {
            matchothers: false,
            override: true
        };
        aRes = augmentContext1(context, aRules, options2);
    }
    return aRes;
}
exports.augmentContext = augmentContext;
function insertOrdered(result, iInsertedMember, limit) {
    // TODO: use some weight
    if (result.length < limit) {
        result.push(iInsertedMember);
    }
    return result;
}
exports.insertOrdered = insertOrdered;
function takeTopN(arr) {
    var u = arr.filter(function (innerArr) {
        return innerArr.length > 0;
    });
    var res = [];
    // shift out the top ones
    u = u.map(function (iArr) {
        var top = iArr.shift();
        res = insertOrdered(res, top, 5);
        return iArr;
    }).filter(function (innerArr) {
        return innerArr.length > 0;
    });
    // as Array<Array<IFMatch.context>>
    return res;
}
exports.takeTopN = takeTopN;
var inputFilterRules = require('./inputFilterRules');
var rm;
function getRMOnce() {
    if (!rm) {
        rm = inputFilterRules.getRuleMap();
    }
    return rm;
}
function applyRules(context) {
    var bestN = [context];
    inputFilterRules.oKeyOrder.forEach(function (sKey) {
        var bestNext = [];
        bestN.forEach(function (oContext) {
            if (oContext[sKey]) {
                debuglog('** applying rules for ' + sKey);
                var res = augmentContext(oContext, getRMOnce()[sKey] || []);
                debuglog('** result for ' + sKey + ' = ' + JSON.stringify(res, undefined, 2));
                bestNext.push(res || []);
            } else {
                // rule not relevant
                bestNext.push([oContext]);
            }
        });
        bestN = takeTopN(bestNext);
    });
    return bestN;
}
exports.applyRules = applyRules;
function applyRulesPickFirst(context) {
    var r = applyRules(context);
    return r && r[0];
}
exports.applyRulesPickFirst = applyRulesPickFirst;
/**
 * Decide whether to requery for a contet
 */
function decideOnReQuery(context) {
    return [];
}
exports.decideOnReQuery = decideOnReQuery;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9pbnB1dEZpbHRlci50cyIsIm1hdGNoL2lucHV0RmlsdGVyLmpzIl0sIm5hbWVzIjpbImRpc3RhbmNlIiwicmVxdWlyZSIsImRlYnVnIiwiYnJlYWtkb3duIiwiZGVidWdsb2ciLCJtYXRjaGRhdGEiLCJvVW5pdFRlc3RzIiwiY2FsY0Rpc3RhbmNlIiwic1RleHQxIiwic1RleHQyIiwiYTAiLCJsZXZlbnNodGVpbiIsInN1YnN0cmluZyIsImxlbmd0aCIsImEiLCJ0b0xvd2VyQ2FzZSIsIklGTWF0Y2giLCJub25Qcml2YXRlS2V5cyIsIm9BIiwiT2JqZWN0Iiwia2V5cyIsImZpbHRlciIsImtleSIsImNvdW50QWluQiIsIm9CIiwiZm5Db21wYXJlIiwiYUtleUlnbm9yZSIsIkFycmF5IiwiaXNBcnJheSIsImluZGV4T2YiLCJyZWR1Y2UiLCJwcmV2IiwicHJvdG90eXBlIiwiaGFzT3duUHJvcGVydHkiLCJjYWxsIiwiZXhwb3J0cyIsInNwdXJpb3VzQW5vdEluQiIsImxvd2VyQ2FzZSIsIm8iLCJjb21wYXJlQ29udGV4dCIsImVxdWFsIiwiYiIsImRpZmZlcmVudCIsInNwdXJpb3VzTCIsInNwdXJpb3VzUiIsImNhdGVnb3JpemVTdHJpbmciLCJzdHJpbmciLCJleGFjdCIsIm9SdWxlcyIsInJlcyIsImZvckVhY2giLCJvUnVsZSIsInR5cGUiLCJ3b3JkIiwicHVzaCIsIm1hdGNoZWRTdHJpbmciLCJjYXRlZ29yeSIsImxldmVubWF0Y2giLCJKU09OIiwic3RyaW5naWZ5IiwidW5kZWZpbmVkIiwibSIsInJlZ2V4cCIsImV4ZWMiLCJtYXRjaEluZGV4IiwiRXJyb3IiLCJtYXRjaFdvcmQiLCJjb250ZXh0Iiwib3B0aW9ucyIsInMxIiwiczIiLCJkZWx0YSIsImZvbGxvd3MiLCJtYXRjaG90aGVycyIsImMiLCJhc3NpZ24iLCJvdmVycmlkZSIsIl93ZWlnaHQiLCJmcmVlemUiLCJleHRyYWN0QXJnc01hcCIsIm1hdGNoIiwiYXJnc01hcCIsImlLZXkiLCJ2YWx1ZSIsImFuYWx5emVTdHJpbmciLCJzU3RyaW5nIiwiYVJ1bGVzIiwiY250IiwiZmFjIiwidSIsImJyZWFrZG93blN0cmluZyIsIndvcmRzIiwibWFwIiwiYUFyciIsInNXb3JkR3JvdXAiLCJzZWVuSXQiLCJleHBhbmRNYXRjaEFyciIsImRlZXAiLCJsaW5lIiwidUJyZWFrRG93bkxpbmUiLCJpSW5kZXgiLCJhV29yZEdyb3VwIiwid2dJbmRleCIsIm9Xb3JkVmFyaWFudCIsImlXVkluZGV4IiwibnZlY3MiLCJpIiwidmVjcyIsInJ2ZWMiLCJrIiwibmV4dEJhc2UiLCJsIiwic2xpY2UiLCJjb25jYXQiLCJtYXRjaFJlZ0V4cCIsInNLZXkiLCJyZWciLCJvRXh0cmFjdGVkQ29udGV4dCIsInNvcnRCeVdlaWdodCIsIm9Db250ZXh0QSIsIm9Db250ZXh0QiIsInJhbmtpbmdBIiwicGFyc2VGbG9hdCIsInJhbmtpbmdCIiwid2VpZ2h0QSIsIndlaWdodEIiLCJhdWdtZW50Q29udGV4dDEiLCJlbmFibGVkIiwiZXZlcnkiLCJpUnVsZSIsIm9yZXMiLCJzb3J0IiwiYmluZCIsImF1Z21lbnRDb250ZXh0Iiwib3B0aW9uczEiLCJhUmVzIiwib3B0aW9uczIiLCJpbnNlcnRPcmRlcmVkIiwicmVzdWx0IiwiaUluc2VydGVkTWVtYmVyIiwibGltaXQiLCJ0YWtlVG9wTiIsImFyciIsImlubmVyQXJyIiwiaUFyciIsInRvcCIsInNoaWZ0IiwiaW5wdXRGaWx0ZXJSdWxlcyIsInJtIiwiZ2V0Uk1PbmNlIiwiZ2V0UnVsZU1hcCIsImFwcGx5UnVsZXMiLCJiZXN0TiIsIm9LZXlPcmRlciIsImJlc3ROZXh0Iiwib0NvbnRleHQiLCJhcHBseVJ1bGVzUGlja0ZpcnN0IiwiciIsImRlY2lkZU9uUmVRdWVyeSJdLCJtYXBwaW5ncyI6IkFBQUE7QUNDQTtBREVBOzs7Ozs7Ozs7Ozs7Ozs7O0FBZUEsSUFBWUEsV0FBUUMsUUFBTSw2QkFBTixDQUFwQjtBQUVBLElBQVlDLFFBQUtELFFBQU0sT0FB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aWx0ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vbGliL25vZGUtNC5kLnRzXCIgLz5cclxuXHJcblxyXG4vKipcclxuICogdGhlIGlucHV0IGZpbHRlciBzdGFnZSBwcmVwcm9jZXNzZXMgYSBjdXJyZW50IGNvbnRleHRcclxuICpcclxuICogSXQgYSkgY29tYmluZXMgbXVsdGktc2VnbWVudCBhcmd1bWVudHMgaW50byBvbmUgY29udGV4dCBtZW1iZXJzXHJcbiAqIEl0IGIpIGF0dGVtcHRzIHRvIGF1Z21lbnQgdGhlIGNvbnRleHQgYnkgYWRkaXRpb25hbCBxdWFsaWZpY2F0aW9uc1xyXG4gKiAgICAgICAgICAgKE1pZCB0ZXJtIGdlbmVyYXRpbmcgQWx0ZXJuYXRpdmVzLCBlLmcuXHJcbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiB1bml0IHRlc3Q/XHJcbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiBzb3VyY2UgP1xyXG4gKiAgICAgICAgICAgKVxyXG4gKiAgU2ltcGxlIHJ1bGVzIGxpa2UgIEludGVudFxyXG4gKlxyXG4gKlxyXG4gKiBAbW9kdWxlXHJcbiAqIEBmaWxlIGlucHV0RmlsdGVyLnRzXHJcbiAqL1xyXG5pbXBvcnQgKiBhcyBkaXN0YW5jZSBmcm9tICcuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4nO1xyXG5cclxuaW1wb3J0ICogYXMgZGVidWcgZnJvbSAnZGVidWcnO1xyXG5cclxuaW1wb3J0ICogYXMgSU1hdGNoIGZyb20gJy4vaWZtYXRjaCc7XHJcblxyXG5pbXBvcnQgKiBhcyBicmVha2Rvd24gZnJvbSAnLi9icmVha2Rvd24nO1xyXG5cclxuY29uc3QgZGVidWdsb2cgPSBkZWJ1ZygnaW5wdXRGaWx0ZXInKVxyXG5cclxuaW1wb3J0ICogYXMgbWF0Y2hkYXRhIGZyb20gJy4vbWF0Y2hkYXRhJztcclxuICB2YXIgb1VuaXRUZXN0cyA9IG1hdGNoZGF0YS5vVW5pdFRlc3RzXHJcblxyXG4gIC8qKlxyXG4gICAqIEBwYXJhbSBzVGV4dCB7c3RyaW5nfSB0aGUgdGV4dCB0byBtYXRjaCB0byBOYXZUYXJnZXRSZXNvbHV0aW9uXHJcbiAgICogQHBhcmFtIHNUZXh0MiB7c3RyaW5nfSB0aGUgcXVlcnkgdGV4dCwgZS5nLiBOYXZUYXJnZXRcclxuICAgKlxyXG4gICAqIEByZXR1cm4gdGhlIGRpc3RhbmNlLCBub3RlIHRoYXQgaXMgaXMgKm5vdCogc3ltbWV0cmljIVxyXG4gICAqL1xyXG4gIGZ1bmN0aW9uIGNhbGNEaXN0YW5jZSAoc1RleHQxIDogc3RyaW5nLCBzVGV4dDIgOiBzdHJpbmcpIDogbnVtYmVyIHtcclxuICAgIC8vIGNvbnNvbGUubG9nKFwibGVuZ3RoMlwiICsgc1RleHQxICsgXCIgLSBcIiArIHNUZXh0MilcclxuICAgIHZhciBhMCA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCksIHNUZXh0MilcclxuICAgIHZhciBhID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnRvTG93ZXJDYXNlKCksIHNUZXh0MilcclxuICAgIHJldHVybiBhMCAqIDUwMCAvIHNUZXh0Mi5sZW5ndGggKyBhXHJcbiAgfVxyXG5cclxuaW1wb3J0ICogYXMgSUZNYXRjaCBmcm9tICcuLi9tYXRjaC9pZm1hdGNoJztcclxuXHJcbnR5cGUgSVJ1bGUgPSBJRk1hdGNoLklSdWxlXHJcblxyXG5cclxuaW50ZXJmYWNlIElNYXRjaE9wdGlvbnMge1xyXG4gIG1hdGNob3RoZXJzPyA6IGJvb2xlYW4sXHJcbiAgYXVnbWVudD86IGJvb2xlYW4sXHJcbiAgb3ZlcnJpZGU/IDogYm9vbGVhblxyXG59XHJcblxyXG5pbnRlcmZhY2UgSU1hdGNoQ291bnQge1xyXG4gIGVxdWFsIDogbnVtYmVyXHJcbiAgZGlmZmVyZW50IDogbnVtYmVyXHJcbiAgc3B1cmlvdXNSIDogbnVtYmVyXHJcbiAgc3B1cmlvdXNMIDogbnVtYmVyXHJcbn1cclxuXHJcbnR5cGUgRW51bVJ1bGVUeXBlID0gSUZNYXRjaC5FbnVtUnVsZVR5cGVcclxuXHJcblxyXG5mdW5jdGlvbiBub25Qcml2YXRlS2V5cyhvQSkge1xyXG4gIHJldHVybiBPYmplY3Qua2V5cyhvQSkuZmlsdGVyKCBrZXkgPT4ge1xyXG4gICAgcmV0dXJuIGtleVswXSAhPT0gJ18nO1xyXG4gIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY291bnRBaW5CIChvQSwgb0IsIGZuQ29tcGFyZSwgYUtleUlnbm9yZT8pIDogbnVtYmVye1xyXG4gICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/ICBhS2V5SWdub3JlIDpcclxuICAgICAgdHlwZW9mIGFLZXlJZ25vcmUgPT09IFwic3RyaW5nXCIgPyBbYUtleUlnbm9yZV0gOiAgW107XHJcbiAgIGZuQ29tcGFyZSA9IGZuQ29tcGFyZSB8fCBmdW5jdGlvbigpIHsgcmV0dXJuIHRydWU7IH1cclxuICAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoIGZ1bmN0aW9uKGtleSkge1xyXG4gICAgIHJldHVybiBhS2V5SWdub3JlLmluZGV4T2Yoa2V5KSA8IDA7XHJcbiAgICB9KS5cclxuICAgIHJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XHJcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIChmbkNvbXBhcmUob0Fba2V5XSxvQltrZXldLCBrZXkpID8gMSA6IDApXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHByZXZcclxuICAgIH0sIDApXHJcbiAgfVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNwdXJpb3VzQW5vdEluQihvQSxvQiwgYUtleUlnbm9yZT8gKSB7XHJcbiAgYUtleUlnbm9yZSA9IEFycmF5LmlzQXJyYXkoYUtleUlnbm9yZSkgPyAgYUtleUlnbm9yZSA6XHJcbiAgICAgIHR5cGVvZiBhS2V5SWdub3JlID09PSBcInN0cmluZ1wiID8gW2FLZXlJZ25vcmVdIDogIFtdO1xyXG4gICByZXR1cm4gbm9uUHJpdmF0ZUtleXMob0EpLmZpbHRlciggZnVuY3Rpb24oa2V5KSB7XHJcbiAgICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcclxuICAgIH0pLlxyXG4gICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIDFcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldlxyXG4gICAgfSwgMClcclxufVxyXG5cclxuZnVuY3Rpb24gbG93ZXJDYXNlKG8pIHtcclxuICBpZiAodHlwZW9mIG8gPT09IFwic3RyaW5nXCIpIHtcclxuICAgIHJldHVybiBvLnRvTG93ZXJDYXNlKClcclxuICB9XHJcbiAgcmV0dXJuIG9cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmVDb250ZXh0KG9BICwgb0IsIGFLZXlJZ25vcmU/KSB7XHJcbiAgdmFyIGVxdWFsID0gY291bnRBaW5CKG9BLG9CLCBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGxvd2VyQ2FzZShhKSA9PT0gbG93ZXJDYXNlKGIpO30sIGFLZXlJZ25vcmUpO1xyXG4gIHZhciBkaWZmZXJlbnQgPSBjb3VudEFpbkIob0Esb0IsIGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpICE9PSBsb3dlckNhc2UoYik7fSwgYUtleUlnbm9yZSk7XHJcbiAgdmFyIHNwdXJpb3VzTCA9IHNwdXJpb3VzQW5vdEluQihvQSxvQiwgYUtleUlnbm9yZSlcclxuICB2YXIgc3B1cmlvdXNSID0gc3B1cmlvdXNBbm90SW5CKG9CLG9BLCBhS2V5SWdub3JlKVxyXG4gIHJldHVybiB7XHJcbiAgICBlcXVhbCA6IGVxdWFsLFxyXG4gICAgZGlmZmVyZW50OiBkaWZmZXJlbnQsXHJcbiAgICBzcHVyaW91c0w6IHNwdXJpb3VzTCxcclxuICAgIHNwdXJpb3VzUjogc3B1cmlvdXNSXHJcbiAgfVxyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNhdGVnb3JpemVTdHJpbmcoc3RyaW5nIDogc3RyaW5nLCBleGFjdCA6IGJvb2xlYW4sICBvUnVsZXMgOiBBcnJheTxJTWF0Y2gubVJ1bGU+KSA6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiB7XHJcbiAgLy8gc2ltcGx5IGFwcGx5IGFsbCBydWxlc1xyXG4gIHZhciByZXMgOiBBcnJheTxJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiA9IFtdXHJcbiAgb1J1bGVzLmZvckVhY2goZnVuY3Rpb24ob1J1bGUpIHtcclxuICAgIHN3aXRjaChvUnVsZS50eXBlKSB7XHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuV09SRCA6XHJcbiAgICAgICAgICBpZiAoIGV4YWN0ICYmIG9SdWxlLndvcmQgPT09IHN0cmluZykge1xyXG4gICAgICAgICAgICByZXMucHVzaCgge1xyXG4gICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxyXG4gICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmcgOiBvUnVsZS5tYXRjaGVkU3RyaW5nLFxyXG4gICAgICAgICAgICAgIGNhdGVnb3J5IDogb1J1bGUuY2F0ZWdvcnlcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmICghZXhhY3QpIHtcclxuICAgICAgICAgICAgdmFyIGxldmVubWF0Y2ggPSBjYWxjRGlzdGFuY2Uob1J1bGUud29yZCxzdHJpbmcpXHJcbiAgICAgICAgICAgIGlmIChsZXZlbm1hdGNoIDwgMTUwKSB7XHJcbiAgICAgICAgICAgICAgcmVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nIDogb1J1bGUud29yZCxcclxuICAgICAgICAgICAgICAgIGNhdGVnb3J5IDogb1J1bGUuY2F0ZWdvcnksXHJcbiAgICAgICAgICAgICAgICBsZXZlbm1hdGNoIDogbGV2ZW5tYXRjaFxyXG4gICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIElGTWF0Y2guRW51bVJ1bGVUeXBlLlJFR0VYUDoge1xyXG5cclxuICAgICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShcIiBoZXJlIHJlZ2V4cFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUsdW5kZWZpbmVkLDIpKSlcclxuICAgICAgICB2YXIgbSA9IG9SdWxlLnJlZ2V4cC5leGVjKHN0cmluZylcclxuICAgICAgICBpZihtKSB7XHJcbiAgICAgICAgICAgIHJlcy5wdXNoKCB7XHJcbiAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmcgOiAob1J1bGUubWF0Y2hJbmRleCAhPT0gdW5kZWZpbmVkICYmIG1bb1J1bGUubWF0Y2hJbmRleF0pIHx8IHN0cmluZyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnkgOiBvUnVsZS5jYXRlZ29yeVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBicmVhaztcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmtub3duIHR5cGVcIiArIEpTT04uc3RyaW5naWZ5IChvUnVsZSx1bmRlZmluZWQsIDIpKVxyXG4gICAgfVxyXG4gIH0pO1xyXG4gICAgcmV0dXJuIHJlcztcclxufVxyXG4vKipcclxuICpcclxuICogT3B0aW9ucyBtYXkgYmUge1xyXG4gKiBtYXRjaG90aGVycyA6IHRydWUsICA9PiBvbmx5IHJ1bGVzIHdoZXJlIGFsbCBvdGhlcnMgbWF0Y2ggYXJlIGNvbnNpZGVyZWRcclxuICogYXVnbWVudCA6IHRydWUsXHJcbiAqIG92ZXJyaWRlIDogdHJ1ZSB9ICA9PlxyXG4gKlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoV29yZChvUnVsZSA6IElSdWxlLCBjb250ZXh0IDogSUZNYXRjaC5jb250ZXh0LCBvcHRpb25zID8gOiBJTWF0Y2hPcHRpb25zKSB7XHJcbiAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKVxyXG4gIHZhciBzMiA9IG9SdWxlLndvcmQudG9Mb3dlckNhc2UoKTtcclxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxyXG4gIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KVxyXG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlbHRhKSk7XHJcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkob3B0aW9ucykpO1xyXG4gIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSl7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkXHJcbiAgfVxyXG4gIHZhciBjIDogbnVtYmVyID0gY2FsY0Rpc3RhbmNlKHMyLCBzMSk7XHJcbiAgIGRlYnVnbG9nKFwiIHMxIDw+IHMyIFwiICsgczEgKyBcIjw+XCIgKyBzMiArIFwiICA9PjogXCIgKyBjKTtcclxuICBpZihjIDwgMTUwICkge1xyXG4gICAgdmFyIHJlcyA9IE9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpIGFzIGFueTtcclxuICAgIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcclxuICAgIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XHJcbiAgICAgIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBvUnVsZS5mb2xsb3dzKTtcclxuICAgIH1cclxuICAgIC8vIGZvcmNlIGtleSBwcm9wZXJ0eVxyXG4gICAgLy8gY29uc29sZS5sb2coJyBvYmplY3RjYXRlZ29yeScsIHJlc1snc3lzdGVtT2JqZWN0Q2F0ZWdvcnknXSk7XHJcbiAgICByZXNbb1J1bGUua2V5XSA9IG9SdWxlLmZvbGxvd3Nbb1J1bGUua2V5XSB8fCByZXNbb1J1bGUua2V5XTtcclxuICAgIHJlcy5fd2VpZ2h0ID0gT2JqZWN0LmFzc2lnbih7fSwgcmVzLl93ZWlnaHQpO1xyXG4gICAgcmVzLl93ZWlnaHRbb1J1bGUua2V5XSA9IGM7XHJcbiAgICBPYmplY3QuZnJlZXplKHJlcyk7XHJcbiAgICBkZWJ1Z2xvZygnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcyx1bmRlZmluZWQsMikpO1xyXG4gICAgcmV0dXJuIHJlcztcclxuICB9XHJcbiAgcmV0dXJuIHVuZGVmaW5lZDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RBcmdzTWFwKG1hdGNoIDogQXJyYXk8c3RyaW5nPiAsIGFyZ3NNYXAgOiB7IFtrZXkgOiBudW1iZXJdIDogc3RyaW5nfSkgOiBJRk1hdGNoLmNvbnRleHQge1xyXG4gIHZhciByZXMgPSB7fSBhcyBJRk1hdGNoLmNvbnRleHQ7XHJcbiAgaWYgKCFhcmdzTWFwKSB7XHJcbiAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuICBPYmplY3Qua2V5cyhhcmdzTWFwKS5mb3JFYWNoKGZ1bmN0aW9uKGlLZXkpIHtcclxuICAgICAgdmFyIHZhbHVlID0gbWF0Y2hbaUtleV1cclxuICAgICAgdmFyIGtleSA9IGFyZ3NNYXBbaUtleV07XHJcbiAgICAgIGlmICgodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKSAmJiB2YWx1ZS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgcmVzW2tleV0gPSB2YWx1ZVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhbmFseXplU3RyaW5nKHNTdHJpbmcgOiBzdHJpbmcsIGFSdWxlcyA6IEFycmF5PElNYXRjaC5tUnVsZT4gKSB7XHJcblxyXG4gIHZhciBjbnQgPSAwO1xyXG4gIHZhciBmYWMgPSAxO1xyXG4gIHZhciB1ID0gYnJlYWtkb3duLmJyZWFrZG93blN0cmluZyhzU3RyaW5nKTtcclxuICBkZWJ1Z2xvZyhcImhlcmUgYnJlYWtkb3duXCIgKyBKU09OLnN0cmluZ2lmeSh1KSk7XHJcbiAgdmFyIHdvcmRzID0ge30gYXMgIHsgW2tleTogc3RyaW5nXTogIEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPn07XHJcbiAgdmFyIHJlcyA9IHUubWFwKGZ1bmN0aW9uKGFBcnIpIHtcclxuICAgIHJldHVybiBhQXJyLm1hcChmdW5jdGlvbiAoc1dvcmRHcm91cCA6IHN0cmluZykge1xyXG4gICAgICB2YXIgc2Vlbkl0ID0gd29yZHNbc1dvcmRHcm91cF07XHJcbiAgICAgIGlmIChzZWVuSXQgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHNlZW5JdCA9ICBjYXRlZ29yaXplU3RyaW5nKHNXb3JkR3JvdXAsIHRydWUsIGFSdWxlcyk7XHJcbiAgICAgICAgd29yZHNbc1dvcmRHcm91cF0gPSBzZWVuSXQ7XHJcbiAgICAgIH1cclxuICAgICAgICBjbnQgPSBjbnQgKyBzZWVuSXQubGVuZ3RoO1xyXG4gICAgICAgIGZhYyA9IGZhYyAqIHNlZW5JdC5sZW5ndGg7XHJcbiAgICAgIGlmKCFzZWVuSXQpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RpbmcgYXQgbGVhc3Qgb25lIG1hdGNoIGZvciBcIiArIHNXb3JkR3JvdXApXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHNlZW5JdDtcclxuICAgIH0pO1xyXG4gIH0pXHJcbiAgZGVidWdsb2coXCIgc2VudGVuY2VzIFwiICsgdS5sZW5ndGggKyBcIiBtYXRjaGVzIFwiICsgY250ICsgXCIgZmFjOiBcIiArIGZhYyk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuLypcclxuWyBbYSxiXSwgW2MsZF1dXHJcblxyXG4wMCBhXHJcbjAxIGJcclxuMTAgY1xyXG4xMSBkXHJcbjEyIGNcclxuKi9cclxuXHJcblxyXG4vLyB3ZSBjYW4gcmVwbGljYXRlIHRoZSB0YWlsIG9yIHRoZSBoZWFkLFxyXG4vLyB3ZSByZXBsaWNhdGUgdGhlIHRhaWwgYXMgaXQgaXMgc21hbGxlci5cclxuXHJcbi8vIFthLGIsYyBdXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZXhwYW5kTWF0Y2hBcnIoZGVlcCA6IEFycmF5PEFycmF5PGFueT4+KSA6IEFycmF5PEFycmF5PGFueT4+IHtcclxuICB2YXIgYSA9IFtdO1xyXG4gIHZhciBsaW5lID0gW107XHJcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZGVlcCkpO1xyXG4gIGRlZXAuZm9yRWFjaChmdW5jdGlvbih1QnJlYWtEb3duTGluZSwgaUluZGV4IDogbnVtYmVyKSB7XHJcbiAgICBsaW5lW2lJbmRleF0gPSBbXTtcclxuICAgIHVCcmVha0Rvd25MaW5lLmZvckVhY2goZnVuY3Rpb24oYVdvcmRHcm91cCAsIHdnSW5kZXg6IG51bWJlcikge1xyXG4gICAgICBsaW5lW2lJbmRleF1bd2dJbmRleF0gPSBbXTtcclxuICAgICAgYVdvcmRHcm91cC5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZFZhcmlhbnQsIGlXVkluZGV4IDogbnVtYmVyKSB7XHJcbiAgICAgICAgbGluZVtpSW5kZXhdW3dnSW5kZXhdW2lXVkluZGV4XSA9IG9Xb3JkVmFyaWFudDtcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9KVxyXG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGxpbmUpKTtcclxuICB2YXIgcmVzID0gW107XHJcbiAgdmFyIG52ZWNzID0gW107XHJcbiAgZm9yKHZhciBpID0gMDsgaSA8IGxpbmUubGVuZ3RoOyArK2kpIHtcclxuICAgIHZhciB2ZWNzID0gW1tdXTtcclxuICAgIHZhciBudmVjcyA9W107XHJcbiAgICB2YXIgcnZlYyA9IFtdO1xyXG4gICAgZm9yKHZhciBrID0gMDsgayA8IGxpbmVbaV0ubGVuZ3RoOyArK2spIHsgLy8gd29yZGdyb3VwIGtcclxuICAgICAgLy92ZWNzIGlzIHRoZSB2ZWN0b3Igb2YgYWxsIHNvIGZhciBzZWVuIHZhcmlhbnRzIHVwIHRvIGsgd2dzLlxyXG4gICAgICB2YXIgbmV4dEJhc2UgPSBbXTtcclxuICAgICAgZm9yKHZhciBsID0gMDsgbCA8IGxpbmVbaV1ba10ubGVuZ3RoOyArK2wgKSB7IC8vIGZvciBlYWNoIHZhcmlhbnRcclxuICAgICAgICBkZWJ1Z2xvZyhcInZlY3Mgbm93XCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzKSk7XHJcbiAgICAgICAgbnZlY3MgPSBbXTsgLy92ZWNzLnNsaWNlKCk7IC8vIGNvcHkgdGhlIHZlY1tpXSBiYXNlIHZlY3RvcjtcclxuICAgICAgICBkZWJ1Z2xvZyhcInZlY3MgY29waWVkIG5vd1wiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKTtcclxuICAgICAgICBmb3IodmFyIHUgPSAwOyB1IDwgdmVjcy5sZW5ndGg7ICsrdSkge1xyXG4gICAgICAgICAgIG52ZWNzW3VdID0gdmVjc1t1XS5zbGljZSgpOyAvL1xyXG4gICAgICAgICAgIGRlYnVnbG9nKFwiY29waWVkIHZlY3NbXCIrIHUrXCJdXCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzW3VdKSk7XHJcbiAgICAgICAgICAgbnZlY3NbdV0ucHVzaChsaW5lW2ldW2tdW2xdKTsgLy8gcHVzaCB0aGUgbHRoIHZhcmlhbnRcclxuICAgICAgICAgICBkZWJ1Z2xvZyhcIm5vdyBudmVjcyBcIiArIG52ZWNzLmxlbmd0aCArIFwiIFwiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZGVidWdsb2coXCIgYXQgICAgIFwiICsgayArIFwiOlwiICsgbCArIFwiIG5leHRiYXNlID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcclxuICAgICAgICBkZWJ1Z2xvZyhcIiBhcHBlbmQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbnZlY3MgICAgPlwiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKVxyXG4gICAgICAgIG5leHRCYXNlID0gbmV4dEJhc2UuY29uY2F0KG52ZWNzKTtcclxuICAgICAgICBkZWJ1Z2xvZyhcIiAgcmVzdWx0IFwiICsgayArIFwiOlwiICsgbCArIFwiIG52ZWNzICAgID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcclxuICAgICAgfSAvL2NvbnN0cnVcclxuICAgICAgZGVidWdsb2coXCJub3cgYXQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxyXG4gICAgICB2ZWNzID0gbmV4dEJhc2U7XHJcbiAgICB9XHJcbiAgICBkZWJ1Z2xvZyhcIkFQUEVORElORyBUTyBSRVNcIiArIGkgKyBcIjpcIiArIGwgKyBcIiA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpXHJcbiAgICByZXMgPSByZXMuY29uY2F0KHZlY3MpO1xyXG4gIH1cclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hSZWdFeHAob1J1bGUgOiBJUnVsZSwgY29udGV4dCA6IElGTWF0Y2guY29udGV4dCwgb3B0aW9ucyA/IDogSU1hdGNoT3B0aW9ucykge1xyXG4gIGlmIChjb250ZXh0W29SdWxlLmtleV0gPT09IHVuZGVmaW5lZCkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICB9XHJcbiAgdmFyIHNLZXkgPSBvUnVsZS5rZXk7XHJcbiAgdmFyIHMxID0gY29udGV4dFtvUnVsZS5rZXldLnRvTG93ZXJDYXNlKClcclxuICB2YXIgcmVnID0gb1J1bGUucmVnZXhwO1xyXG5cclxuICB2YXIgbSA9IHJlZy5leGVjKHMxKTtcclxuICBkZWJ1Z2xvZyhcImFwcGx5aW5nIHJlZ2V4cDogXCIgKyBzMSArIFwiIFwiICsgSlNPTi5zdHJpbmdpZnkobSkpO1xyXG4gIGlmICghbSkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICB9XHJcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cclxuICB2YXIgZGVsdGEgPSBjb21wYXJlQ29udGV4dChjb250ZXh0LG9SdWxlLmZvbGxvd3MsIG9SdWxlLmtleSlcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xyXG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcclxuICBpZiAob3B0aW9ucy5tYXRjaG90aGVycyAmJiAoZGVsdGEuZGlmZmVyZW50ID4gMCkpe1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gIH1cclxuICB2YXIgb0V4dHJhY3RlZENvbnRleHQgPSBleHRyYWN0QXJnc01hcChtLCBvUnVsZS5hcmdzTWFwICk7XHJcbiAgZGVidWdsb2coXCJleHRyYWN0ZWQgYXJncyBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLmFyZ3NNYXApKTtcclxuICBkZWJ1Z2xvZyhcIm1hdGNoIFwiICsgSlNPTi5zdHJpbmdpZnkobSkpO1xyXG5cclxuICBkZWJ1Z2xvZyhcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob0V4dHJhY3RlZENvbnRleHQpKTtcclxuICB2YXIgcmVzID0gT2JqZWN0LmFzc2lnbih7fSwgb1J1bGUuZm9sbG93cykgYXMgYW55O1xyXG4gIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBvRXh0cmFjdGVkQ29udGV4dCk7XHJcbiAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIGNvbnRleHQpO1xyXG4gIGlmIChvRXh0cmFjdGVkQ29udGV4dFtzS2V5XSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICByZXNbc0tleV0gPSBvRXh0cmFjdGVkQ29udGV4dFtzS2V5XTtcclxuICB9XHJcbiAgaWYgKG9wdGlvbnMub3ZlcnJpZGUpIHtcclxuICAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgb1J1bGUuZm9sbG93cyk7XHJcbiAgICAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIG9FeHRyYWN0ZWRDb250ZXh0KVxyXG4gIH1cclxuICBPYmplY3QuZnJlZXplKHJlcyk7XHJcbiAgZGVidWdsb2coJ0ZvdW5kIG9uZScgKyBKU09OLnN0cmluZ2lmeShyZXMsdW5kZWZpbmVkLDIpKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc29ydEJ5V2VpZ2h0KHNLZXkgOiBzdHJpbmcsIG9Db250ZXh0QSA6IElGTWF0Y2guY29udGV4dCwgb0NvbnRleHRCIDogSUZNYXRjaC5jb250ZXh0KSAgOiBudW1iZXJ7XHJcbiAgZGVidWdsb2coJ3NvcnRpbmc6ICcgKyBzS2V5ICsgJ2ludm9rZWQgd2l0aFxcbiAxOicgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEEsdW5kZWZpbmVkLDIpK1xyXG4gICBcIiB2cyBcXG4gMjpcIiArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0Qix1bmRlZmluZWQsMikpO1xyXG4gIHZhciByYW5raW5nQSA6IG51bWJlciA9ICBwYXJzZUZsb2F0KG9Db250ZXh0QVtcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcclxuICB2YXIgcmFua2luZ0IgOiBudW1iZXIgID0gcGFyc2VGbG9hdChvQ29udGV4dEJbXCJfcmFua2luZ1wiXSB8fCBcIjFcIik7XHJcbiAgaWYgKHJhbmtpbmdBICE9PSByYW5raW5nQikge1xyXG4gICAgZGVidWdsb2coXCIgcmFua2luIGRlbHRhXCIgKyAxMDAqKHJhbmtpbmdCIC0gcmFua2luZ0EpKTtcclxuICAgIHJldHVybiAxMDAqKHJhbmtpbmdCIC0gcmFua2luZ0EpXHJcbiAgfVxyXG5cclxuICB2YXIgd2VpZ2h0QSA9IG9Db250ZXh0QVtcIl93ZWlnaHRcIl0gJiYgb0NvbnRleHRBW1wiX3dlaWdodFwiXVtzS2V5XSAgfHwgMDtcclxuICB2YXIgd2VpZ2h0QiA9IG9Db250ZXh0QltcIl93ZWlnaHRcIl0gJiYgb0NvbnRleHRCW1wiX3dlaWdodFwiXVtzS2V5XSAgfHwgMDtcclxuICByZXR1cm4gKyh3ZWlnaHRBIC0gd2VpZ2h0Qik7XHJcbn1cclxuXHJcblxyXG4vLyBXb3JkLCBTeW5vbnltLCBSZWdleHAgLyBFeHRyYWN0aW9uUnVsZVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0MSggY29udGV4dCA6IElGTWF0Y2guY29udGV4dCwgb1J1bGVzIDogQXJyYXk8SVJ1bGU+LCBvcHRpb25zIDogSU1hdGNoT3B0aW9ucykgOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICB2YXIgc0tleSA9IG9SdWxlc1swXS5rZXk7XHJcbiAgLy8gY2hlY2sgdGhhdCBydWxlXHJcbiAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIC8vIGNoZWNrIGNvbnNpc3RlbmN5XHJcbiAgICBvUnVsZXMuZXZlcnkoZnVuY3Rpb24gKGlSdWxlKSB7XHJcbiAgICAgIGlmIChpUnVsZS5rZXkgIT09IHNLZXkpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbmhvbW9nZW5vdXMga2V5cyBpbiBydWxlcywgZXhwZWN0ZWQgXCIgKyBzS2V5ICsgXCIgd2FzIFwiICsgSlNPTi5zdHJpbmdpZnkoaVJ1bGUpKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLy8gbG9vayBmb3IgcnVsZXMgd2hpY2ggbWF0Y2hcclxuICB2YXIgcmVzID0gb1J1bGVzLm1hcChmdW5jdGlvbihvUnVsZSkge1xyXG4gICAgLy8gaXMgdGhpcyBydWxlIGFwcGxpY2FibGVcclxuICAgIHN3aXRjaChvUnVsZS50eXBlKSB7XHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuV09SRDpcclxuICAgICAgICByZXR1cm4gbWF0Y2hXb3JkKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKVxyXG4gICAgICBjYXNlIElGTWF0Y2guRW51bVJ1bGVUeXBlLlJFR0VYUDpcclxuICAgICAgICByZXR1cm4gbWF0Y2hSZWdFeHAob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xyXG4gICAvLyAgIGNhc2UgXCJFeHRyYWN0aW9uXCI6XHJcbiAgIC8vICAgICByZXR1cm4gbWF0Y2hFeHRyYWN0aW9uKG9SdWxlLGNvbnRleHQpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gIH0pLmZpbHRlcihmdW5jdGlvbihvcmVzKSB7XHJcbiAgICByZXR1cm4gISFvcmVzXHJcbiAgfSkuc29ydChcclxuICAgIHNvcnRCeVdlaWdodC5iaW5kKHRoaXMsIHNLZXkpXHJcbiAgKTtcclxuICByZXR1cm4gcmVzO1xyXG4gIC8vIE9iamVjdC5rZXlzKCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xyXG4gIC8vIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXVnbWVudENvbnRleHQoIGNvbnRleHQgOiBJRk1hdGNoLmNvbnRleHQsIGFSdWxlcyA6IEFycmF5PElSdWxlPikgOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuXHJcbnZhciBvcHRpb25zMSA6IElNYXRjaE9wdGlvbnMgPSB7XHJcbiAgICBtYXRjaG90aGVycyA6IHRydWUsXHJcbiAgICBvdmVycmlkZTogZmFsc2VcclxuICB9IGFzIElNYXRjaE9wdGlvbnM7XHJcblxyXG4gIHZhciBhUmVzID0gYXVnbWVudENvbnRleHQxKGNvbnRleHQsYVJ1bGVzLG9wdGlvbnMxKVxyXG5cclxuICBpZiAoYVJlcy5sZW5ndGggPT09IDApICB7XHJcbiAgICB2YXIgb3B0aW9uczIgOiBJTWF0Y2hPcHRpb25zID0ge1xyXG4gICAgICAgIG1hdGNob3RoZXJzIDogZmFsc2UsXHJcbiAgICAgICAgb3ZlcnJpZGU6IHRydWVcclxuICAgIH0gYXMgSU1hdGNoT3B0aW9ucztcclxuICAgIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMik7XHJcbiAgfVxyXG4gIHJldHVybiBhUmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gaW5zZXJ0T3JkZXJlZChyZXN1bHQgOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+LCBpSW5zZXJ0ZWRNZW1iZXIgOiBJRk1hdGNoLmNvbnRleHQsIGxpbWl0IDogbnVtYmVyKSA6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIC8vIFRPRE86IHVzZSBzb21lIHdlaWdodFxyXG4gIGlmIChyZXN1bHQubGVuZ3RoIDwgbGltaXQpIHtcclxuICAgIHJlc3VsdC5wdXNoKGlJbnNlcnRlZE1lbWJlcilcclxuICB9XHJcbiAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB0YWtlVG9wTihhcnIgOiBBcnJheTxBcnJheTxJRk1hdGNoLmNvbnRleHQ+Pik6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIHZhciB1ID0gYXJyLmZpbHRlcihmdW5jdGlvbihpbm5lckFycikgeyByZXR1cm4gaW5uZXJBcnIubGVuZ3RoID4gMH0pXHJcblxyXG4gIHZhciByZXMgPVtdO1xyXG4gIC8vIHNoaWZ0IG91dCB0aGUgdG9wIG9uZXNcclxuICB1ID0gdS5tYXAoZnVuY3Rpb24oaUFycikge1xyXG4gICAgdmFyIHRvcCA9IGlBcnIuc2hpZnQoKTtcclxuICAgIHJlcyA9IGluc2VydE9yZGVyZWQocmVzLHRvcCw1KVxyXG4gICAgcmV0dXJuIGlBcnJcclxuICB9KS5maWx0ZXIoZnVuY3Rpb24oaW5uZXJBcnI6IEFycmF5PElGTWF0Y2guY29udGV4dD4pIDogYm9vbGVhbiB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwfSk7XHJcbiAgLy8gYXMgQXJyYXk8QXJyYXk8SUZNYXRjaC5jb250ZXh0Pj5cclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5pbXBvcnQgKiBhcyBpbnB1dEZpbHRlclJ1bGVzIGZyb20gJy4vaW5wdXRGaWx0ZXJSdWxlcyc7XHJcblxyXG52YXIgcm07XHJcblxyXG5mdW5jdGlvbiBnZXRSTU9uY2UoKSB7XHJcbiAgaWYgKCFybSkge1xyXG4gICAgcm0gPSBpbnB1dEZpbHRlclJ1bGVzLmdldFJ1bGVNYXAoKVxyXG4gIH1cclxuICByZXR1cm4gcm07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhcHBseVJ1bGVzKGNvbnRleHQgOiBJRk1hdGNoLmNvbnRleHQpIDogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgdmFyIGJlc3ROIDogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiA9IFtjb250ZXh0XTtcclxuICBpbnB1dEZpbHRlclJ1bGVzLm9LZXlPcmRlci5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5IDogc3RyaW5nKSB7XHJcbiAgICAgdmFyIGJlc3ROZXh0OiBBcnJheTxBcnJheTxJRk1hdGNoLmNvbnRleHQ+PiA9IFtdO1xyXG4gICAgIGJlc3ROLmZvckVhY2goZnVuY3Rpb24ob0NvbnRleHQgOiBJRk1hdGNoLmNvbnRleHQpIHtcclxuICAgICAgIGlmIChvQ29udGV4dFtzS2V5XSkge1xyXG4gICAgICAgICAgZGVidWdsb2coJyoqIGFwcGx5aW5nIHJ1bGVzIGZvciAnICsgc0tleSlcclxuICAgICAgICAgIHZhciByZXMgPSBhdWdtZW50Q29udGV4dChvQ29udGV4dCwgZ2V0Uk1PbmNlKClbc0tleV0gfHwgW10pXHJcbiAgICAgICAgICBkZWJ1Z2xvZygnKiogcmVzdWx0IGZvciAnICsgc0tleSArICcgPSAnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKVxyXG4gICAgICAgICAgYmVzdE5leHQucHVzaChyZXMgfHwgW10pXHJcbiAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAvLyBydWxlIG5vdCByZWxldmFudFxyXG4gICAgICAgICBiZXN0TmV4dC5wdXNoKFtvQ29udGV4dF0pO1xyXG4gICAgICAgfVxyXG4gICAgfSlcclxuICAgIGJlc3ROID0gdGFrZVRvcE4oYmVzdE5leHQpO1xyXG4gIH0pO1xyXG4gIHJldHVybiBiZXN0TlxyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UnVsZXNQaWNrRmlyc3QoY29udGV4dCA6IElGTWF0Y2guY29udGV4dCkgOiBJRk1hdGNoLmNvbnRleHQge1xyXG4gIHZhciByID0gYXBwbHlSdWxlcyhjb250ZXh0KTtcclxuICByZXR1cm4gciAmJiByWzBdO1xyXG59XHJcblxyXG4vKipcclxuICogRGVjaWRlIHdoZXRoZXIgdG8gcmVxdWVyeSBmb3IgYSBjb250ZXRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBkZWNpZGVPblJlUXVlcnkoIGNvbnRleHQgOiBJRk1hdGNoLmNvbnRleHQpIDogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgcmV0dXJuIFtdXHJcbn1cclxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2xpYi9ub2RlLTQuZC50c1wiIC8+XG5cInVzZSBzdHJpY3RcIjtcbi8qKlxuICogdGhlIGlucHV0IGZpbHRlciBzdGFnZSBwcmVwcm9jZXNzZXMgYSBjdXJyZW50IGNvbnRleHRcbiAqXG4gKiBJdCBhKSBjb21iaW5lcyBtdWx0aS1zZWdtZW50IGFyZ3VtZW50cyBpbnRvIG9uZSBjb250ZXh0IG1lbWJlcnNcbiAqIEl0IGIpIGF0dGVtcHRzIHRvIGF1Z21lbnQgdGhlIGNvbnRleHQgYnkgYWRkaXRpb25hbCBxdWFsaWZpY2F0aW9uc1xuICogICAgICAgICAgIChNaWQgdGVybSBnZW5lcmF0aW5nIEFsdGVybmF0aXZlcywgZS5nLlxuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHVuaXQgdGVzdD9cbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiBzb3VyY2UgP1xuICogICAgICAgICAgIClcbiAqICBTaW1wbGUgcnVsZXMgbGlrZSAgSW50ZW50XG4gKlxuICpcbiAqIEBtb2R1bGVcbiAqIEBmaWxlIGlucHV0RmlsdGVyLnRzXG4gKi9cbmNvbnN0IGRpc3RhbmNlID0gcmVxdWlyZSgnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluJyk7XG5jb25zdCBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJyk7XG5jb25zdCBicmVha2Rvd24gPSByZXF1aXJlKCcuL2JyZWFrZG93bicpO1xuY29uc3QgZGVidWdsb2cgPSBkZWJ1ZygnaW5wdXRGaWx0ZXInKTtcbmNvbnN0IG1hdGNoZGF0YSA9IHJlcXVpcmUoJy4vbWF0Y2hkYXRhJyk7XG52YXIgb1VuaXRUZXN0cyA9IG1hdGNoZGF0YS5vVW5pdFRlc3RzO1xuLyoqXG4gKiBAcGFyYW0gc1RleHQge3N0cmluZ30gdGhlIHRleHQgdG8gbWF0Y2ggdG8gTmF2VGFyZ2V0UmVzb2x1dGlvblxuICogQHBhcmFtIHNUZXh0MiB7c3RyaW5nfSB0aGUgcXVlcnkgdGV4dCwgZS5nLiBOYXZUYXJnZXRcbiAqXG4gKiBAcmV0dXJuIHRoZSBkaXN0YW5jZSwgbm90ZSB0aGF0IGlzIGlzICpub3QqIHN5bW1ldHJpYyFcbiAqL1xuZnVuY3Rpb24gY2FsY0Rpc3RhbmNlKHNUZXh0MSwgc1RleHQyKSB7XG4gICAgLy8gY29uc29sZS5sb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxuICAgIHZhciBhMCA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCksIHNUZXh0Mik7XG4gICAgdmFyIGEgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEudG9Mb3dlckNhc2UoKSwgc1RleHQyKTtcbiAgICByZXR1cm4gYTAgKiA1MDAgLyBzVGV4dDIubGVuZ3RoICsgYTtcbn1cbmNvbnN0IElGTWF0Y2ggPSByZXF1aXJlKCcuLi9tYXRjaC9pZm1hdGNoJyk7XG5mdW5jdGlvbiBub25Qcml2YXRlS2V5cyhvQSkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhvQSkuZmlsdGVyKGtleSA9PiB7XG4gICAgICAgIHJldHVybiBrZXlbMF0gIT09ICdfJztcbiAgICB9KTtcbn1cbmZ1bmN0aW9uIGNvdW50QWluQihvQSwgb0IsIGZuQ29tcGFyZSwgYUtleUlnbm9yZSkge1xuICAgIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gYUtleUlnbm9yZSA6XG4gICAgICAgIHR5cGVvZiBhS2V5SWdub3JlID09PSBcInN0cmluZ1wiID8gW2FLZXlJZ25vcmVdIDogW107XG4gICAgZm5Db21wYXJlID0gZm5Db21wYXJlIHx8IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH07XG4gICAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xuICAgIH0pLlxuICAgICAgICByZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9CLCBrZXkpKSB7XG4gICAgICAgICAgICBwcmV2ID0gcHJldiArIChmbkNvbXBhcmUob0Fba2V5XSwgb0Jba2V5XSwga2V5KSA/IDEgOiAwKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbn1cbmV4cG9ydHMuY291bnRBaW5CID0gY291bnRBaW5CO1xuZnVuY3Rpb24gc3B1cmlvdXNBbm90SW5CKG9BLCBvQiwgYUtleUlnbm9yZSkge1xuICAgIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gYUtleUlnbm9yZSA6XG4gICAgICAgIHR5cGVvZiBhS2V5SWdub3JlID09PSBcInN0cmluZ1wiID8gW2FLZXlJZ25vcmVdIDogW107XG4gICAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xuICAgIH0pLlxuICAgICAgICByZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xuICAgICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xuICAgICAgICAgICAgcHJldiA9IHByZXYgKyAxO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIDApO1xufVxuZXhwb3J0cy5zcHVyaW91c0Fub3RJbkIgPSBzcHVyaW91c0Fub3RJbkI7XG5mdW5jdGlvbiBsb3dlckNhc2Uobykge1xuICAgIGlmICh0eXBlb2YgbyA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICByZXR1cm4gby50b0xvd2VyQ2FzZSgpO1xuICAgIH1cbiAgICByZXR1cm4gbztcbn1cbmZ1bmN0aW9uIGNvbXBhcmVDb250ZXh0KG9BLCBvQiwgYUtleUlnbm9yZSkge1xuICAgIHZhciBlcXVhbCA9IGNvdW50QWluQihvQSwgb0IsIGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBsb3dlckNhc2UoYSkgPT09IGxvd2VyQ2FzZShiKTsgfSwgYUtleUlnbm9yZSk7XG4gICAgdmFyIGRpZmZlcmVudCA9IGNvdW50QWluQihvQSwgb0IsIGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBsb3dlckNhc2UoYSkgIT09IGxvd2VyQ2FzZShiKTsgfSwgYUtleUlnbm9yZSk7XG4gICAgdmFyIHNwdXJpb3VzTCA9IHNwdXJpb3VzQW5vdEluQihvQSwgb0IsIGFLZXlJZ25vcmUpO1xuICAgIHZhciBzcHVyaW91c1IgPSBzcHVyaW91c0Fub3RJbkIob0IsIG9BLCBhS2V5SWdub3JlKTtcbiAgICByZXR1cm4ge1xuICAgICAgICBlcXVhbDogZXF1YWwsXG4gICAgICAgIGRpZmZlcmVudDogZGlmZmVyZW50LFxuICAgICAgICBzcHVyaW91c0w6IHNwdXJpb3VzTCxcbiAgICAgICAgc3B1cmlvdXNSOiBzcHVyaW91c1JcbiAgICB9O1xufVxuZXhwb3J0cy5jb21wYXJlQ29udGV4dCA9IGNvbXBhcmVDb250ZXh0O1xuZnVuY3Rpb24gY2F0ZWdvcml6ZVN0cmluZyhzdHJpbmcsIGV4YWN0LCBvUnVsZXMpIHtcbiAgICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIG9SdWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChvUnVsZSkge1xuICAgICAgICBzd2l0Y2ggKG9SdWxlLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgMCAvKiBXT1JEICovOlxuICAgICAgICAgICAgICAgIGlmIChleGFjdCAmJiBvUnVsZS53b3JkID09PSBzdHJpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBvUnVsZS5tYXRjaGVkU3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIWV4YWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsZXZlbm1hdGNoID0gY2FsY0Rpc3RhbmNlKG9SdWxlLndvcmQsIHN0cmluZyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsZXZlbm1hdGNoIDwgMTUwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUud29yZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV2ZW5tYXRjaDogbGV2ZW5tYXRjaFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDEgLyogUkVHRVhQICovOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoXCIgaGVyZSByZWdleHBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBtID0gb1J1bGUucmVnZXhwLmV4ZWMoc3RyaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiAob1J1bGUubWF0Y2hJbmRleCAhPT0gdW5kZWZpbmVkICYmIG1bb1J1bGUubWF0Y2hJbmRleF0pIHx8IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnlcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmtub3duIHR5cGVcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmNhdGVnb3JpemVTdHJpbmcgPSBjYXRlZ29yaXplU3RyaW5nO1xuLyoqXG4gKlxuICogT3B0aW9ucyBtYXkgYmUge1xuICogbWF0Y2hvdGhlcnMgOiB0cnVlLCAgPT4gb25seSBydWxlcyB3aGVyZSBhbGwgb3RoZXJzIG1hdGNoIGFyZSBjb25zaWRlcmVkXG4gKiBhdWdtZW50IDogdHJ1ZSxcbiAqIG92ZXJyaWRlIDogdHJ1ZSB9ICA9PlxuICpcbiAqL1xuZnVuY3Rpb24gbWF0Y2hXb3JkKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBzMSA9IGNvbnRleHRbb1J1bGUua2V5XS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciBzMiA9IG9SdWxlLndvcmQudG9Mb3dlckNhc2UoKTtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB2YXIgZGVsdGEgPSBjb21wYXJlQ29udGV4dChjb250ZXh0LCBvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlbHRhKSk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkob3B0aW9ucykpO1xuICAgIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgYyA9IGNhbGNEaXN0YW5jZShzMiwgczEpO1xuICAgIGRlYnVnbG9nKFwiIHMxIDw+IHMyIFwiICsgczEgKyBcIjw+XCIgKyBzMiArIFwiICA9PjogXCIgKyBjKTtcbiAgICBpZiAoYyA8IDE1MCkge1xuICAgICAgICB2YXIgcmVzID0gT2JqZWN0LmFzc2lnbih7fSwgb1J1bGUuZm9sbG93cyk7XG4gICAgICAgIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcbiAgICAgICAgaWYgKG9wdGlvbnMub3ZlcnJpZGUpIHtcbiAgICAgICAgICAgIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBvUnVsZS5mb2xsb3dzKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBmb3JjZSBrZXkgcHJvcGVydHlcbiAgICAgICAgLy8gY29uc29sZS5sb2coJyBvYmplY3RjYXRlZ29yeScsIHJlc1snc3lzdGVtT2JqZWN0Q2F0ZWdvcnknXSk7XG4gICAgICAgIHJlc1tvUnVsZS5rZXldID0gb1J1bGUuZm9sbG93c1tvUnVsZS5rZXldIHx8IHJlc1tvUnVsZS5rZXldO1xuICAgICAgICByZXMuX3dlaWdodCA9IE9iamVjdC5hc3NpZ24oe30sIHJlcy5fd2VpZ2h0KTtcbiAgICAgICAgcmVzLl93ZWlnaHRbb1J1bGUua2V5XSA9IGM7XG4gICAgICAgIE9iamVjdC5mcmVlemUocmVzKTtcbiAgICAgICAgZGVidWdsb2coJ0ZvdW5kIG9uZScgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xufVxuZXhwb3J0cy5tYXRjaFdvcmQgPSBtYXRjaFdvcmQ7XG5mdW5jdGlvbiBleHRyYWN0QXJnc01hcChtYXRjaCwgYXJnc01hcCkge1xuICAgIHZhciByZXMgPSB7fTtcbiAgICBpZiAoIWFyZ3NNYXApIHtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG4gICAgT2JqZWN0LmtleXMoYXJnc01hcCkuZm9yRWFjaChmdW5jdGlvbiAoaUtleSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBtYXRjaFtpS2V5XTtcbiAgICAgICAgdmFyIGtleSA9IGFyZ3NNYXBbaUtleV07XG4gICAgICAgIGlmICgodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKSAmJiB2YWx1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXNba2V5XSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZXh0cmFjdEFyZ3NNYXAgPSBleHRyYWN0QXJnc01hcDtcbmZ1bmN0aW9uIGFuYWx5emVTdHJpbmcoc1N0cmluZywgYVJ1bGVzKSB7XG4gICAgdmFyIGNudCA9IDA7XG4gICAgdmFyIGZhYyA9IDE7XG4gICAgdmFyIHUgPSBicmVha2Rvd24uYnJlYWtkb3duU3RyaW5nKHNTdHJpbmcpO1xuICAgIGRlYnVnbG9nKFwiaGVyZSBicmVha2Rvd25cIiArIEpTT04uc3RyaW5naWZ5KHUpKTtcbiAgICB2YXIgd29yZHMgPSB7fTtcbiAgICB2YXIgcmVzID0gdS5tYXAoZnVuY3Rpb24gKGFBcnIpIHtcbiAgICAgICAgcmV0dXJuIGFBcnIubWFwKGZ1bmN0aW9uIChzV29yZEdyb3VwKSB7XG4gICAgICAgICAgICB2YXIgc2Vlbkl0ID0gd29yZHNbc1dvcmRHcm91cF07XG4gICAgICAgICAgICBpZiAoc2Vlbkl0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBzZWVuSXQgPSBjYXRlZ29yaXplU3RyaW5nKHNXb3JkR3JvdXAsIHRydWUsIGFSdWxlcyk7XG4gICAgICAgICAgICAgICAgd29yZHNbc1dvcmRHcm91cF0gPSBzZWVuSXQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjbnQgPSBjbnQgKyBzZWVuSXQubGVuZ3RoO1xuICAgICAgICAgICAgZmFjID0gZmFjICogc2Vlbkl0Lmxlbmd0aDtcbiAgICAgICAgICAgIGlmICghc2Vlbkl0KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0aW5nIGF0IGxlYXN0IG9uZSBtYXRjaCBmb3IgXCIgKyBzV29yZEdyb3VwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzZWVuSXQ7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIGRlYnVnbG9nKFwiIHNlbnRlbmNlcyBcIiArIHUubGVuZ3RoICsgXCIgbWF0Y2hlcyBcIiArIGNudCArIFwiIGZhYzogXCIgKyBmYWMpO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmFuYWx5emVTdHJpbmcgPSBhbmFseXplU3RyaW5nO1xuLypcblsgW2EsYl0sIFtjLGRdXVxuXG4wMCBhXG4wMSBiXG4xMCBjXG4xMSBkXG4xMiBjXG4qL1xuLy8gd2UgY2FuIHJlcGxpY2F0ZSB0aGUgdGFpbCBvciB0aGUgaGVhZCxcbi8vIHdlIHJlcGxpY2F0ZSB0aGUgdGFpbCBhcyBpdCBpcyBzbWFsbGVyLlxuLy8gW2EsYixjIF1cbmZ1bmN0aW9uIGV4cGFuZE1hdGNoQXJyKGRlZXApIHtcbiAgICB2YXIgYSA9IFtdO1xuICAgIHZhciBsaW5lID0gW107XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZGVlcCkpO1xuICAgIGRlZXAuZm9yRWFjaChmdW5jdGlvbiAodUJyZWFrRG93bkxpbmUsIGlJbmRleCkge1xuICAgICAgICBsaW5lW2lJbmRleF0gPSBbXTtcbiAgICAgICAgdUJyZWFrRG93bkxpbmUuZm9yRWFjaChmdW5jdGlvbiAoYVdvcmRHcm91cCwgd2dJbmRleCkge1xuICAgICAgICAgICAgbGluZVtpSW5kZXhdW3dnSW5kZXhdID0gW107XG4gICAgICAgICAgICBhV29yZEdyb3VwLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkVmFyaWFudCwgaVdWSW5kZXgpIHtcbiAgICAgICAgICAgICAgICBsaW5lW2lJbmRleF1bd2dJbmRleF1baVdWSW5kZXhdID0gb1dvcmRWYXJpYW50O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGxpbmUpKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgdmFyIG52ZWNzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciB2ZWNzID0gW1tdXTtcbiAgICAgICAgdmFyIG52ZWNzID0gW107XG4gICAgICAgIHZhciBydmVjID0gW107XG4gICAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgbGluZVtpXS5sZW5ndGg7ICsraykge1xuICAgICAgICAgICAgLy92ZWNzIGlzIHRoZSB2ZWN0b3Igb2YgYWxsIHNvIGZhciBzZWVuIHZhcmlhbnRzIHVwIHRvIGsgd2dzLlxuICAgICAgICAgICAgdmFyIG5leHRCYXNlID0gW107XG4gICAgICAgICAgICBmb3IgKHZhciBsID0gMDsgbCA8IGxpbmVbaV1ba10ubGVuZ3RoOyArK2wpIHtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcInZlY3Mgbm93XCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzKSk7XG4gICAgICAgICAgICAgICAgbnZlY3MgPSBbXTsgLy92ZWNzLnNsaWNlKCk7IC8vIGNvcHkgdGhlIHZlY1tpXSBiYXNlIHZlY3RvcjtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcInZlY3MgY29waWVkIG5vd1wiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciB1ID0gMDsgdSA8IHZlY3MubGVuZ3RoOyArK3UpIHtcbiAgICAgICAgICAgICAgICAgICAgbnZlY3NbdV0gPSB2ZWNzW3VdLnNsaWNlKCk7IC8vXG4gICAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKFwiY29waWVkIHZlY3NbXCIgKyB1ICsgXCJdXCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzW3VdKSk7XG4gICAgICAgICAgICAgICAgICAgIG52ZWNzW3VdLnB1c2gobGluZVtpXVtrXVtsXSk7IC8vIHB1c2ggdGhlIGx0aCB2YXJpYW50XG4gICAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKFwibm93IG52ZWNzIFwiICsgbnZlY3MubGVuZ3RoICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcIiBhdCAgICAgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbmV4dGJhc2UgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKTtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcIiBhcHBlbmQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbnZlY3MgICAgPlwiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKTtcbiAgICAgICAgICAgICAgICBuZXh0QmFzZSA9IG5leHRCYXNlLmNvbmNhdChudmVjcyk7XG4gICAgICAgICAgICAgICAgZGVidWdsb2coXCIgIHJlc3VsdCBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiBudmVjcyAgICA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpO1xuICAgICAgICAgICAgfSAvL2NvbnN0cnVcbiAgICAgICAgICAgIGRlYnVnbG9nKFwibm93IGF0IFwiICsgayArIFwiOlwiICsgbCArIFwiID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSk7XG4gICAgICAgICAgICB2ZWNzID0gbmV4dEJhc2U7XG4gICAgICAgIH1cbiAgICAgICAgZGVidWdsb2coXCJBUFBFTkRJTkcgVE8gUkVTXCIgKyBpICsgXCI6XCIgKyBsICsgXCIgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKTtcbiAgICAgICAgcmVzID0gcmVzLmNvbmNhdCh2ZWNzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZXhwYW5kTWF0Y2hBcnIgPSBleHBhbmRNYXRjaEFycjtcbmZ1bmN0aW9uIG1hdGNoUmVnRXhwKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBzS2V5ID0gb1J1bGUua2V5O1xuICAgIHZhciBzMSA9IGNvbnRleHRbb1J1bGUua2V5XS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciByZWcgPSBvUnVsZS5yZWdleHA7XG4gICAgdmFyIG0gPSByZWcuZXhlYyhzMSk7XG4gICAgZGVidWdsb2coXCJhcHBseWluZyByZWdleHA6IFwiICsgczEgKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KG0pKTtcbiAgICBpZiAoIW0pIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCwgb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcbiAgICBpZiAob3B0aW9ucy5tYXRjaG90aGVycyAmJiAoZGVsdGEuZGlmZmVyZW50ID4gMCkpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIG9FeHRyYWN0ZWRDb250ZXh0ID0gZXh0cmFjdEFyZ3NNYXAobSwgb1J1bGUuYXJnc01hcCk7XG4gICAgZGVidWdsb2coXCJleHRyYWN0ZWQgYXJncyBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLmFyZ3NNYXApKTtcbiAgICBkZWJ1Z2xvZyhcIm1hdGNoIFwiICsgSlNPTi5zdHJpbmdpZnkobSkpO1xuICAgIGRlYnVnbG9nKFwiZXh0cmFjdGVkIGFyZ3MgXCIgKyBKU09OLnN0cmluZ2lmeShvRXh0cmFjdGVkQ29udGV4dCkpO1xuICAgIHZhciByZXMgPSBPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKTtcbiAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpO1xuICAgIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcbiAgICBpZiAob0V4dHJhY3RlZENvbnRleHRbc0tleV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXNbc0tleV0gPSBvRXh0cmFjdGVkQ29udGV4dFtzS2V5XTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMub3ZlcnJpZGUpIHtcbiAgICAgICAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xuICAgICAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpO1xuICAgIH1cbiAgICBPYmplY3QuZnJlZXplKHJlcyk7XG4gICAgZGVidWdsb2coJ0ZvdW5kIG9uZScgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLm1hdGNoUmVnRXhwID0gbWF0Y2hSZWdFeHA7XG5mdW5jdGlvbiBzb3J0QnlXZWlnaHQoc0tleSwgb0NvbnRleHRBLCBvQ29udGV4dEIpIHtcbiAgICBkZWJ1Z2xvZygnc29ydGluZzogJyArIHNLZXkgKyAnaW52b2tlZCB3aXRoXFxuIDE6JyArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QSwgdW5kZWZpbmVkLCAyKSArXG4gICAgICAgIFwiIHZzIFxcbiAyOlwiICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHRCLCB1bmRlZmluZWQsIDIpKTtcbiAgICB2YXIgcmFua2luZ0EgPSBwYXJzZUZsb2F0KG9Db250ZXh0QVtcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcbiAgICB2YXIgcmFua2luZ0IgPSBwYXJzZUZsb2F0KG9Db250ZXh0QltcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcbiAgICBpZiAocmFua2luZ0EgIT09IHJhbmtpbmdCKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiIHJhbmtpbiBkZWx0YVwiICsgMTAwICogKHJhbmtpbmdCIC0gcmFua2luZ0EpKTtcbiAgICAgICAgcmV0dXJuIDEwMCAqIChyYW5raW5nQiAtIHJhbmtpbmdBKTtcbiAgICB9XG4gICAgdmFyIHdlaWdodEEgPSBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QVtcIl93ZWlnaHRcIl1bc0tleV0gfHwgMDtcbiAgICB2YXIgd2VpZ2h0QiA9IG9Db250ZXh0QltcIl93ZWlnaHRcIl0gJiYgb0NvbnRleHRCW1wiX3dlaWdodFwiXVtzS2V5XSB8fCAwO1xuICAgIHJldHVybiArKHdlaWdodEEgLSB3ZWlnaHRCKTtcbn1cbmV4cG9ydHMuc29ydEJ5V2VpZ2h0ID0gc29ydEJ5V2VpZ2h0O1xuLy8gV29yZCwgU3lub255bSwgUmVnZXhwIC8gRXh0cmFjdGlvblJ1bGVcbmZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBvUnVsZXMsIG9wdGlvbnMpIHtcbiAgICB2YXIgc0tleSA9IG9SdWxlc1swXS5rZXk7XG4gICAgLy8gY2hlY2sgdGhhdCBydWxlXG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgLy8gY2hlY2sgY29uc2lzdGVuY3lcbiAgICAgICAgb1J1bGVzLmV2ZXJ5KGZ1bmN0aW9uIChpUnVsZSkge1xuICAgICAgICAgICAgaWYgKGlSdWxlLmtleSAhPT0gc0tleSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkluaG9tb2dlbm91cyBrZXlzIGluIHJ1bGVzLCBleHBlY3RlZCBcIiArIHNLZXkgKyBcIiB3YXMgXCIgKyBKU09OLnN0cmluZ2lmeShpUnVsZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBsb29rIGZvciBydWxlcyB3aGljaCBtYXRjaFxuICAgIHZhciByZXMgPSBvUnVsZXMubWFwKGZ1bmN0aW9uIChvUnVsZSkge1xuICAgICAgICAvLyBpcyB0aGlzIHJ1bGUgYXBwbGljYWJsZVxuICAgICAgICBzd2l0Y2ggKG9SdWxlLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgMCAvKiBXT1JEICovOlxuICAgICAgICAgICAgICAgIHJldHVybiBtYXRjaFdvcmQob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgY2FzZSAxIC8qIFJFR0VYUCAqLzpcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2hSZWdFeHAob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSkuZmlsdGVyKGZ1bmN0aW9uIChvcmVzKSB7XG4gICAgICAgIHJldHVybiAhIW9yZXM7XG4gICAgfSkuc29ydChzb3J0QnlXZWlnaHQuYmluZCh0aGlzLCBzS2V5KSk7XG4gICAgcmV0dXJuIHJlcztcbiAgICAvLyBPYmplY3Qua2V5cygpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAvLyB9KTtcbn1cbmV4cG9ydHMuYXVnbWVudENvbnRleHQxID0gYXVnbWVudENvbnRleHQxO1xuZnVuY3Rpb24gYXVnbWVudENvbnRleHQoY29udGV4dCwgYVJ1bGVzKSB7XG4gICAgdmFyIG9wdGlvbnMxID0ge1xuICAgICAgICBtYXRjaG90aGVyczogdHJ1ZSxcbiAgICAgICAgb3ZlcnJpZGU6IGZhbHNlXG4gICAgfTtcbiAgICB2YXIgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMxKTtcbiAgICBpZiAoYVJlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdmFyIG9wdGlvbnMyID0ge1xuICAgICAgICAgICAgbWF0Y2hvdGhlcnM6IGZhbHNlLFxuICAgICAgICAgICAgb3ZlcnJpZGU6IHRydWVcbiAgICAgICAgfTtcbiAgICAgICAgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMyKTtcbiAgICB9XG4gICAgcmV0dXJuIGFSZXM7XG59XG5leHBvcnRzLmF1Z21lbnRDb250ZXh0ID0gYXVnbWVudENvbnRleHQ7XG5mdW5jdGlvbiBpbnNlcnRPcmRlcmVkKHJlc3VsdCwgaUluc2VydGVkTWVtYmVyLCBsaW1pdCkge1xuICAgIC8vIFRPRE86IHVzZSBzb21lIHdlaWdodFxuICAgIGlmIChyZXN1bHQubGVuZ3RoIDwgbGltaXQpIHtcbiAgICAgICAgcmVzdWx0LnB1c2goaUluc2VydGVkTWVtYmVyKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cbmV4cG9ydHMuaW5zZXJ0T3JkZXJlZCA9IGluc2VydE9yZGVyZWQ7XG5mdW5jdGlvbiB0YWtlVG9wTihhcnIpIHtcbiAgICB2YXIgdSA9IGFyci5maWx0ZXIoZnVuY3Rpb24gKGlubmVyQXJyKSB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwOyB9KTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgLy8gc2hpZnQgb3V0IHRoZSB0b3Agb25lc1xuICAgIHUgPSB1Lm1hcChmdW5jdGlvbiAoaUFycikge1xuICAgICAgICB2YXIgdG9wID0gaUFyci5zaGlmdCgpO1xuICAgICAgICByZXMgPSBpbnNlcnRPcmRlcmVkKHJlcywgdG9wLCA1KTtcbiAgICAgICAgcmV0dXJuIGlBcnI7XG4gICAgfSkuZmlsdGVyKGZ1bmN0aW9uIChpbm5lckFycikgeyByZXR1cm4gaW5uZXJBcnIubGVuZ3RoID4gMDsgfSk7XG4gICAgLy8gYXMgQXJyYXk8QXJyYXk8SUZNYXRjaC5jb250ZXh0Pj5cbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy50YWtlVG9wTiA9IHRha2VUb3BOO1xuY29uc3QgaW5wdXRGaWx0ZXJSdWxlcyA9IHJlcXVpcmUoJy4vaW5wdXRGaWx0ZXJSdWxlcycpO1xudmFyIHJtO1xuZnVuY3Rpb24gZ2V0Uk1PbmNlKCkge1xuICAgIGlmICghcm0pIHtcbiAgICAgICAgcm0gPSBpbnB1dEZpbHRlclJ1bGVzLmdldFJ1bGVNYXAoKTtcbiAgICB9XG4gICAgcmV0dXJuIHJtO1xufVxuZnVuY3Rpb24gYXBwbHlSdWxlcyhjb250ZXh0KSB7XG4gICAgdmFyIGJlc3ROID0gW2NvbnRleHRdO1xuICAgIGlucHV0RmlsdGVyUnVsZXMub0tleU9yZGVyLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgICAgdmFyIGJlc3ROZXh0ID0gW107XG4gICAgICAgIGJlc3ROLmZvckVhY2goZnVuY3Rpb24gKG9Db250ZXh0KSB7XG4gICAgICAgICAgICBpZiAob0NvbnRleHRbc0tleV0pIHtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZygnKiogYXBwbHlpbmcgcnVsZXMgZm9yICcgKyBzS2V5KTtcbiAgICAgICAgICAgICAgICB2YXIgcmVzID0gYXVnbWVudENvbnRleHQob0NvbnRleHQsIGdldFJNT25jZSgpW3NLZXldIHx8IFtdKTtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZygnKiogcmVzdWx0IGZvciAnICsgc0tleSArICcgPSAnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgICAgICAgICBiZXN0TmV4dC5wdXNoKHJlcyB8fCBbXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBydWxlIG5vdCByZWxldmFudFxuICAgICAgICAgICAgICAgIGJlc3ROZXh0LnB1c2goW29Db250ZXh0XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBiZXN0TiA9IHRha2VUb3BOKGJlc3ROZXh0KTtcbiAgICB9KTtcbiAgICByZXR1cm4gYmVzdE47XG59XG5leHBvcnRzLmFwcGx5UnVsZXMgPSBhcHBseVJ1bGVzO1xuZnVuY3Rpb24gYXBwbHlSdWxlc1BpY2tGaXJzdChjb250ZXh0KSB7XG4gICAgdmFyIHIgPSBhcHBseVJ1bGVzKGNvbnRleHQpO1xuICAgIHJldHVybiByICYmIHJbMF07XG59XG5leHBvcnRzLmFwcGx5UnVsZXNQaWNrRmlyc3QgPSBhcHBseVJ1bGVzUGlja0ZpcnN0O1xuLyoqXG4gKiBEZWNpZGUgd2hldGhlciB0byByZXF1ZXJ5IGZvciBhIGNvbnRldFxuICovXG5mdW5jdGlvbiBkZWNpZGVPblJlUXVlcnkoY29udGV4dCkge1xuICAgIHJldHVybiBbXTtcbn1cbmV4cG9ydHMuZGVjaWRlT25SZVF1ZXJ5ID0gZGVjaWRlT25SZVF1ZXJ5O1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
