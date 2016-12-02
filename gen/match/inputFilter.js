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

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

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
// courtesy of
// http://stackoverflow.com/questions/4459928/how-to-deep-clone-in-javascript
function clone(item) {
    if (!item) {
        return item;
    } // null, undefined values check
    var types = [Number, String, Boolean],
        result;
    // normalizing primitives if someone did new String('aaa'), or new Number('444');
    types.forEach(function (type) {
        if (item instanceof type) {
            result = type(item);
        }
    });
    if (typeof result == "undefined") {
        if (Object.prototype.toString.call(item) === "[object Array]") {
            result = [];
            item.forEach(function (child, index, array) {
                result[index] = clone(child);
            });
        } else if ((typeof item === 'undefined' ? 'undefined' : _typeof(item)) == "object") {
            // testing that this is DOM
            if (item.nodeType && typeof item.cloneNode == "function") {
                var result = item.cloneNode(true);
            } else if (!item.prototype) {
                if (item instanceof Date) {
                    result = new Date(item);
                } else {
                    // it is an object literal
                    result = {};
                    for (var i in item) {
                        result[i] = clone(item[i]);
                    }
                }
            } else {
                // depending what you would like here,
                //   // just keep the reference, or create new object
                //   if (false && item.constructor) {
                // would not advice to do that, reason? Read below
                //        result = new item.constructor();
                //    } else {
                result = item;
            }
        } else {
            result = item;
        }
    }
    return result;
}
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
                    nvecs[u].push(clone(line[i][k][l])); // push the lth variant
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9pbnB1dEZpbHRlci50cyIsIm1hdGNoL2lucHV0RmlsdGVyLmpzIl0sIm5hbWVzIjpbImRpc3RhbmNlIiwicmVxdWlyZSIsImRlYnVnIiwiYnJlYWtkb3duIiwiZGVidWdsb2ciLCJtYXRjaGRhdGEiLCJvVW5pdFRlc3RzIiwiY2FsY0Rpc3RhbmNlIiwic1RleHQxIiwic1RleHQyIiwiYTAiLCJsZXZlbnNodGVpbiIsInN1YnN0cmluZyIsImxlbmd0aCIsImEiLCJ0b0xvd2VyQ2FzZSIsIklGTWF0Y2giLCJub25Qcml2YXRlS2V5cyIsIm9BIiwiT2JqZWN0Iiwia2V5cyIsImZpbHRlciIsImtleSIsImNvdW50QWluQiIsIm9CIiwiZm5Db21wYXJlIiwiYUtleUlnbm9yZSIsIkFycmF5IiwiaXNBcnJheSIsImluZGV4T2YiLCJyZWR1Y2UiLCJwcmV2IiwicHJvdG90eXBlIiwiaGFzT3duUHJvcGVydHkiLCJjYWxsIiwiZXhwb3J0cyIsInNwdXJpb3VzQW5vdEluQiIsImxvd2VyQ2FzZSIsIm8iLCJjb21wYXJlQ29udGV4dCIsImVxdWFsIiwiYiIsImRpZmZlcmVudCIsInNwdXJpb3VzTCIsInNwdXJpb3VzUiIsImNhdGVnb3JpemVTdHJpbmciLCJzdHJpbmciLCJleGFjdCIsIm9SdWxlcyIsInJlcyIsImZvckVhY2giLCJvUnVsZSIsInR5cGUiLCJ3b3JkIiwicHVzaCIsIm1hdGNoZWRTdHJpbmciLCJjYXRlZ29yeSIsImxldmVubWF0Y2giLCJKU09OIiwic3RyaW5naWZ5IiwidW5kZWZpbmVkIiwibSIsInJlZ2V4cCIsImV4ZWMiLCJtYXRjaEluZGV4IiwiRXJyb3IiLCJtYXRjaFdvcmQiLCJjb250ZXh0Iiwib3B0aW9ucyIsInMxIiwiczIiLCJkZWx0YSIsImZvbGxvd3MiLCJtYXRjaG90aGVycyIsImMiLCJhc3NpZ24iLCJvdmVycmlkZSIsIl93ZWlnaHQiLCJmcmVlemUiLCJleHRyYWN0QXJnc01hcCIsIm1hdGNoIiwiYXJnc01hcCIsImlLZXkiLCJ2YWx1ZSIsImFuYWx5emVTdHJpbmciLCJzU3RyaW5nIiwiYVJ1bGVzIiwiY250IiwiZmFjIiwidSIsImJyZWFrZG93blN0cmluZyIsIndvcmRzIiwibWFwIiwiYUFyciIsInNXb3JkR3JvdXAiLCJzZWVuSXQiLCJjbG9uZSIsIml0ZW0iLCJ0eXBlcyIsIk51bWJlciIsIlN0cmluZyIsIkJvb2xlYW4iLCJyZXN1bHQiLCJ0b1N0cmluZyIsImNoaWxkIiwiaW5kZXgiLCJhcnJheSIsIm5vZGVUeXBlIiwiY2xvbmVOb2RlIiwiRGF0ZSIsImkiLCJleHBhbmRNYXRjaEFyciIsImRlZXAiLCJsaW5lIiwidUJyZWFrRG93bkxpbmUiLCJpSW5kZXgiLCJhV29yZEdyb3VwIiwid2dJbmRleCIsIm9Xb3JkVmFyaWFudCIsImlXVkluZGV4IiwibnZlY3MiLCJ2ZWNzIiwicnZlYyIsImsiLCJuZXh0QmFzZSIsImwiLCJzbGljZSIsImNvbmNhdCIsIm1hdGNoUmVnRXhwIiwic0tleSIsInJlZyIsIm9FeHRyYWN0ZWRDb250ZXh0Iiwic29ydEJ5V2VpZ2h0Iiwib0NvbnRleHRBIiwib0NvbnRleHRCIiwicmFua2luZ0EiLCJwYXJzZUZsb2F0IiwicmFua2luZ0IiLCJ3ZWlnaHRBIiwid2VpZ2h0QiIsImF1Z21lbnRDb250ZXh0MSIsImVuYWJsZWQiLCJldmVyeSIsImlSdWxlIiwib3JlcyIsInNvcnQiLCJiaW5kIiwiYXVnbWVudENvbnRleHQiLCJvcHRpb25zMSIsImFSZXMiLCJvcHRpb25zMiIsImluc2VydE9yZGVyZWQiLCJpSW5zZXJ0ZWRNZW1iZXIiLCJsaW1pdCIsInRha2VUb3BOIiwiYXJyIiwiaW5uZXJBcnIiLCJpQXJyIiwidG9wIiwic2hpZnQiLCJpbnB1dEZpbHRlclJ1bGVzIiwicm0iLCJnZXRSTU9uY2UiLCJnZXRSdWxlTWFwIiwiYXBwbHlSdWxlcyIsImJlc3ROIiwib0tleU9yZGVyIiwiYmVzdE5leHQiLCJvQ29udGV4dCIsImFwcGx5UnVsZXNQaWNrRmlyc3QiLCJyIiwiZGVj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O0FBQ0gsU0FWQTtBQVdESCxnQkFBUVgsU0FBU2EsUUFBVCxDQUFSO0FBQ0QsS0FkRDtBQWVBLFdBQU9GLEtBQVA7QUFDRDtBQWxCZWxJLFFBQUFpSSxVQUFBLEdBQVVBLFVBQVY7QUFxQmhCLFNBQUFLLG1CQUFBLENBQW9DdEcsT0FBcEMsRUFBNkQ7QUFDM0QsUUFBSXVHLElBQUlOLFdBQVdqRyxPQUFYLENBQVI7QUFDQSxXQUFPdUcsS0FBS0EsRUFBRSxDQUFGLENBQVo7QUFDRDtBQUhldkksUUFBQXNJLG1CQUFBLEdBQW1CQSxtQkFBbkI7QUFLaEI7OztBQUdBLFNBQUFFLGVBQUEsQ0FBaUN4RyxPQUFqQyxFQUEwRDtBQUN4RCxXQUFPLEVBQVA7QUFDRDtBQUZlaEMsUUFBQXdJLGVBQUEsR0FBZUEsZUFBZiIsImZpbGUiOiJtYXRjaC9pbnB1dEZpbHRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9saWIvbm9kZS00LmQudHNcIiAvPlxyXG5cclxuXHJcbi8qKlxyXG4gKiB0aGUgaW5wdXQgZmlsdGVyIHN0YWdlIHByZXByb2Nlc3NlcyBhIGN1cnJlbnQgY29udGV4dFxyXG4gKlxyXG4gKiBJdCBhKSBjb21iaW5lcyBtdWx0aS1zZWdtZW50IGFyZ3VtZW50cyBpbnRvIG9uZSBjb250ZXh0IG1lbWJlcnNcclxuICogSXQgYikgYXR0ZW1wdHMgdG8gYXVnbWVudCB0aGUgY29udGV4dCBieSBhZGRpdGlvbmFsIHF1YWxpZmljYXRpb25zXHJcbiAqICAgICAgICAgICAoTWlkIHRlcm0gZ2VuZXJhdGluZyBBbHRlcm5hdGl2ZXMsIGUuZy5cclxuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHVuaXQgdGVzdD9cclxuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHNvdXJjZSA/XHJcbiAqICAgICAgICAgICApXHJcbiAqICBTaW1wbGUgcnVsZXMgbGlrZSAgSW50ZW50XHJcbiAqXHJcbiAqXHJcbiAqIEBtb2R1bGVcclxuICogQGZpbGUgaW5wdXRGaWx0ZXIudHNcclxuICovXHJcbmltcG9ydCAqIGFzIGRpc3RhbmNlIGZyb20gJy4uL3V0aWxzL2RhbWVyYXVMZXZlbnNodGVpbic7XHJcblxyXG5pbXBvcnQgKiBhcyBkZWJ1ZyBmcm9tICdkZWJ1Zyc7XHJcblxyXG5pbXBvcnQgKiBhcyBJTWF0Y2ggZnJvbSAnLi9pZm1hdGNoJztcclxuXHJcbmltcG9ydCAqIGFzIGJyZWFrZG93biBmcm9tICcuL2JyZWFrZG93bic7XHJcblxyXG5jb25zdCBkZWJ1Z2xvZyA9IGRlYnVnKCdpbnB1dEZpbHRlcicpXHJcblxyXG5pbXBvcnQgKiBhcyBtYXRjaGRhdGEgZnJvbSAnLi9tYXRjaGRhdGEnO1xyXG4gIHZhciBvVW5pdFRlc3RzID0gbWF0Y2hkYXRhLm9Vbml0VGVzdHNcclxuXHJcbiAgLyoqXHJcbiAgICogQHBhcmFtIHNUZXh0IHtzdHJpbmd9IHRoZSB0ZXh0IHRvIG1hdGNoIHRvIE5hdlRhcmdldFJlc29sdXRpb25cclxuICAgKiBAcGFyYW0gc1RleHQyIHtzdHJpbmd9IHRoZSBxdWVyeSB0ZXh0LCBlLmcuIE5hdlRhcmdldFxyXG4gICAqXHJcbiAgICogQHJldHVybiB0aGUgZGlzdGFuY2UsIG5vdGUgdGhhdCBpcyBpcyAqbm90KiBzeW1tZXRyaWMhXHJcbiAgICovXHJcbiAgZnVuY3Rpb24gY2FsY0Rpc3RhbmNlIChzVGV4dDEgOiBzdHJpbmcsIHNUZXh0MiA6IHN0cmluZykgOiBudW1iZXIge1xyXG4gICAgLy8gY29uc29sZS5sb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxyXG4gICAgdmFyIGEwID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnN1YnN0cmluZygwLCBzVGV4dDIubGVuZ3RoKSwgc1RleHQyKVxyXG4gICAgdmFyIGEgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEudG9Mb3dlckNhc2UoKSwgc1RleHQyKVxyXG4gICAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGFcclxuICB9XHJcblxyXG5pbXBvcnQgKiBhcyBJRk1hdGNoIGZyb20gJy4uL21hdGNoL2lmbWF0Y2gnO1xyXG5cclxudHlwZSBJUnVsZSA9IElGTWF0Y2guSVJ1bGVcclxuXHJcblxyXG5pbnRlcmZhY2UgSU1hdGNoT3B0aW9ucyB7XHJcbiAgbWF0Y2hvdGhlcnM/IDogYm9vbGVhbixcclxuICBhdWdtZW50PzogYm9vbGVhbixcclxuICBvdmVycmlkZT8gOiBib29sZWFuXHJcbn1cclxuXHJcbmludGVyZmFjZSBJTWF0Y2hDb3VudCB7XHJcbiAgZXF1YWwgOiBudW1iZXJcclxuICBkaWZmZXJlbnQgOiBudW1iZXJcclxuICBzcHVyaW91c1IgOiBudW1iZXJcclxuICBzcHVyaW91c0wgOiBudW1iZXJcclxufVxyXG5cclxudHlwZSBFbnVtUnVsZVR5cGUgPSBJRk1hdGNoLkVudW1SdWxlVHlwZVxyXG5cclxuXHJcbmZ1bmN0aW9uIG5vblByaXZhdGVLZXlzKG9BKSB7XHJcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG9BKS5maWx0ZXIoIGtleSA9PiB7XHJcbiAgICByZXR1cm4ga2V5WzBdICE9PSAnXyc7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjb3VudEFpbkIgKG9BLCBvQiwgZm5Db21wYXJlLCBhS2V5SWdub3JlPykgOiBudW1iZXJ7XHJcbiAgIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gIGFLZXlJZ25vcmUgOlxyXG4gICAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6ICBbXTtcclxuICAgZm5Db21wYXJlID0gZm5Db21wYXJlIHx8IGZ1bmN0aW9uKCkgeyByZXR1cm4gdHJ1ZTsgfVxyXG4gICByZXR1cm4gbm9uUHJpdmF0ZUtleXMob0EpLmZpbHRlciggZnVuY3Rpb24oa2V5KSB7XHJcbiAgICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcclxuICAgIH0pLlxyXG4gICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xyXG4gICAgICAgIHByZXYgPSBwcmV2ICsgKGZuQ29tcGFyZShvQVtrZXldLG9CW2tleV0sIGtleSkgPyAxIDogMClcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldlxyXG4gICAgfSwgMClcclxuICB9XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc3B1cmlvdXNBbm90SW5CKG9BLG9CLCBhS2V5SWdub3JlPyApIHtcclxuICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/ICBhS2V5SWdub3JlIDpcclxuICAgICAgdHlwZW9mIGFLZXlJZ25vcmUgPT09IFwic3RyaW5nXCIgPyBbYUtleUlnbm9yZV0gOiAgW107XHJcbiAgIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKCBmdW5jdGlvbihrZXkpIHtcclxuICAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xyXG4gICAgfSkuXHJcbiAgICByZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xyXG4gICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xyXG4gICAgICAgIHByZXYgPSBwcmV2ICsgMVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBwcmV2XHJcbiAgICB9LCAwKVxyXG59XHJcblxyXG5mdW5jdGlvbiBsb3dlckNhc2Uobykge1xyXG4gIGlmICh0eXBlb2YgbyA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgcmV0dXJuIG8udG9Mb3dlckNhc2UoKVxyXG4gIH1cclxuICByZXR1cm4gb1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY29tcGFyZUNvbnRleHQob0EgLCBvQiwgYUtleUlnbm9yZT8pIHtcclxuICB2YXIgZXF1YWwgPSBjb3VudEFpbkIob0Esb0IsIGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpID09PSBsb3dlckNhc2UoYik7fSwgYUtleUlnbm9yZSk7XHJcbiAgdmFyIGRpZmZlcmVudCA9IGNvdW50QWluQihvQSxvQiwgZnVuY3Rpb24oYSxiKSB7IHJldHVybiBsb3dlckNhc2UoYSkgIT09IGxvd2VyQ2FzZShiKTt9LCBhS2V5SWdub3JlKTtcclxuICB2YXIgc3B1cmlvdXNMID0gc3B1cmlvdXNBbm90SW5CKG9BLG9CLCBhS2V5SWdub3JlKVxyXG4gIHZhciBzcHVyaW91c1IgPSBzcHVyaW91c0Fub3RJbkIob0Isb0EsIGFLZXlJZ25vcmUpXHJcbiAgcmV0dXJuIHtcclxuICAgIGVxdWFsIDogZXF1YWwsXHJcbiAgICBkaWZmZXJlbnQ6IGRpZmZlcmVudCxcclxuICAgIHNwdXJpb3VzTDogc3B1cmlvdXNMLFxyXG4gICAgc3B1cmlvdXNSOiBzcHVyaW91c1JcclxuICB9XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVN0cmluZyhzdHJpbmcgOiBzdHJpbmcsIGV4YWN0IDogYm9vbGVhbiwgIG9SdWxlcyA6IEFycmF5PElNYXRjaC5tUnVsZT4pIDogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IHtcclxuICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXHJcbiAgdmFyIHJlcyA6IEFycmF5PElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+ID0gW11cclxuICBvUnVsZXMuZm9yRWFjaChmdW5jdGlvbihvUnVsZSkge1xyXG4gICAgc3dpdGNoKG9SdWxlLnR5cGUpIHtcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5XT1JEIDpcclxuICAgICAgICAgIGlmICggZXhhY3QgJiYgb1J1bGUud29yZCA9PT0gc3RyaW5nKSB7XHJcbiAgICAgICAgICAgIHJlcy5wdXNoKCB7XHJcbiAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZyA6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXHJcbiAgICAgICAgICAgICAgY2F0ZWdvcnkgOiBvUnVsZS5jYXRlZ29yeVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKCFleGFjdCkge1xyXG4gICAgICAgICAgICB2YXIgbGV2ZW5tYXRjaCA9IGNhbGNEaXN0YW5jZShvUnVsZS53b3JkLHN0cmluZylcclxuICAgICAgICAgICAgaWYgKGxldmVubWF0Y2ggPCAxNTApIHtcclxuICAgICAgICAgICAgICByZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcclxuICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmcgOiBvUnVsZS53b3JkLFxyXG4gICAgICAgICAgICAgICAgY2F0ZWdvcnkgOiBvUnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgICAgIGxldmVubWF0Y2ggOiBsZXZlbm1hdGNoXHJcbiAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuUkVHRVhQOiB7XHJcblxyXG4gICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KFwiIGhlcmUgcmVnZXhwXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSx1bmRlZmluZWQsMikpKVxyXG4gICAgICAgIHZhciBtID0gb1J1bGUucmVnZXhwLmV4ZWMoc3RyaW5nKVxyXG4gICAgICAgIGlmKG0pIHtcclxuICAgICAgICAgICAgcmVzLnB1c2goIHtcclxuICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZyA6IChvUnVsZS5tYXRjaEluZGV4ICE9PSB1bmRlZmluZWQgJiYgbVtvUnVsZS5tYXRjaEluZGV4XSkgfHwgc3RyaW5nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeSA6IG9SdWxlLmNhdGVnb3J5XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgICBkZWZhdWx0OlxyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInVua25vd24gdHlwZVwiICsgSlNPTi5zdHJpbmdpZnkgKG9SdWxlLHVuZGVmaW5lZCwgMikpXHJcbiAgICB9XHJcbiAgfSk7XHJcbiAgICByZXR1cm4gcmVzO1xyXG59XHJcbi8qKlxyXG4gKlxyXG4gKiBPcHRpb25zIG1heSBiZSB7XHJcbiAqIG1hdGNob3RoZXJzIDogdHJ1ZSwgID0+IG9ubHkgcnVsZXMgd2hlcmUgYWxsIG90aGVycyBtYXRjaCBhcmUgY29uc2lkZXJlZFxyXG4gKiBhdWdtZW50IDogdHJ1ZSxcclxuICogb3ZlcnJpZGUgOiB0cnVlIH0gID0+XHJcbiAqXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hXb3JkKG9SdWxlIDogSVJ1bGUsIGNvbnRleHQgOiBJRk1hdGNoLmNvbnRleHQsIG9wdGlvbnMgPyA6IElNYXRjaE9wdGlvbnMpIHtcclxuICBpZiAoY29udGV4dFtvUnVsZS5rZXldID09PSB1bmRlZmluZWQpIHtcclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgfVxyXG4gIHZhciBzMSA9IGNvbnRleHRbb1J1bGUua2V5XS50b0xvd2VyQ2FzZSgpXHJcbiAgdmFyIHMyID0gb1J1bGUud29yZC50b0xvd2VyQ2FzZSgpO1xyXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XHJcbiAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCxvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpXHJcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XHJcbiAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKXtcclxuICAgIHJldHVybiB1bmRlZmluZWRcclxuICB9XHJcbiAgdmFyIGMgOiBudW1iZXIgPSBjYWxjRGlzdGFuY2UoczIsIHMxKTtcclxuICAgZGVidWdsb2coXCIgczEgPD4gczIgXCIgKyBzMSArIFwiPD5cIiArIHMyICsgXCIgID0+OiBcIiArIGMpO1xyXG4gIGlmKGMgPCAxNTAgKSB7XHJcbiAgICB2YXIgcmVzID0gT2JqZWN0LmFzc2lnbih7fSwgb1J1bGUuZm9sbG93cykgYXMgYW55O1xyXG4gICAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIGNvbnRleHQpO1xyXG4gICAgaWYgKG9wdGlvbnMub3ZlcnJpZGUpIHtcclxuICAgICAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xyXG4gICAgfVxyXG4gICAgLy8gZm9yY2Uga2V5IHByb3BlcnR5XHJcbiAgICAvLyBjb25zb2xlLmxvZygnIG9iamVjdGNhdGVnb3J5JywgcmVzWydzeXN0ZW1PYmplY3RDYXRlZ29yeSddKTtcclxuICAgIHJlc1tvUnVsZS5rZXldID0gb1J1bGUuZm9sbG93c1tvUnVsZS5rZXldIHx8IHJlc1tvUnVsZS5rZXldO1xyXG4gICAgcmVzLl93ZWlnaHQgPSBPYmplY3QuYXNzaWduKHt9LCByZXMuX3dlaWdodCk7XHJcbiAgICByZXMuX3dlaWdodFtvUnVsZS5rZXldID0gYztcclxuICAgIE9iamVjdC5mcmVlemUocmVzKTtcclxuICAgIGRlYnVnbG9nKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLHVuZGVmaW5lZCwyKSk7XHJcbiAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuICByZXR1cm4gdW5kZWZpbmVkO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEFyZ3NNYXAobWF0Y2ggOiBBcnJheTxzdHJpbmc+ICwgYXJnc01hcCA6IHsgW2tleSA6IG51bWJlcl0gOiBzdHJpbmd9KSA6IElGTWF0Y2guY29udGV4dCB7XHJcbiAgdmFyIHJlcyA9IHt9IGFzIElGTWF0Y2guY29udGV4dDtcclxuICBpZiAoIWFyZ3NNYXApIHtcclxuICAgIHJldHVybiByZXM7XHJcbiAgfVxyXG4gIE9iamVjdC5rZXlzKGFyZ3NNYXApLmZvckVhY2goZnVuY3Rpb24oaUtleSkge1xyXG4gICAgICB2YXIgdmFsdWUgPSBtYXRjaFtpS2V5XVxyXG4gICAgICB2YXIga2V5ID0gYXJnc01hcFtpS2V5XTtcclxuICAgICAgaWYgKCh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpICYmIHZhbHVlLmxlbmd0aCA+IDApIHtcclxuICAgICAgICByZXNba2V5XSA9IHZhbHVlXHJcbiAgICAgIH1cclxuICAgIH1cclxuICApO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVTdHJpbmcoc1N0cmluZyA6IHN0cmluZywgYVJ1bGVzIDogQXJyYXk8SU1hdGNoLm1SdWxlPiApIHtcclxuXHJcbiAgdmFyIGNudCA9IDA7XHJcbiAgdmFyIGZhYyA9IDE7XHJcbiAgdmFyIHUgPSBicmVha2Rvd24uYnJlYWtkb3duU3RyaW5nKHNTdHJpbmcpO1xyXG4gIGRlYnVnbG9nKFwiaGVyZSBicmVha2Rvd25cIiArIEpTT04uc3RyaW5naWZ5KHUpKTtcclxuICB2YXIgd29yZHMgPSB7fSBhcyAgeyBba2V5OiBzdHJpbmddOiAgQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+fTtcclxuICB2YXIgcmVzID0gdS5tYXAoZnVuY3Rpb24oYUFycikge1xyXG4gICAgcmV0dXJuIGFBcnIubWFwKGZ1bmN0aW9uIChzV29yZEdyb3VwIDogc3RyaW5nKSB7XHJcbiAgICAgIHZhciBzZWVuSXQgPSB3b3Jkc1tzV29yZEdyb3VwXTtcclxuICAgICAgaWYgKHNlZW5JdCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgc2Vlbkl0ID0gIGNhdGVnb3JpemVTdHJpbmcoc1dvcmRHcm91cCwgdHJ1ZSwgYVJ1bGVzKTtcclxuICAgICAgICB3b3Jkc1tzV29yZEdyb3VwXSA9IHNlZW5JdDtcclxuICAgICAgfVxyXG4gICAgICAgIGNudCA9IGNudCArIHNlZW5JdC5sZW5ndGg7XHJcbiAgICAgICAgZmFjID0gZmFjICogc2Vlbkl0Lmxlbmd0aDtcclxuICAgICAgaWYoIXNlZW5JdCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGluZyBhdCBsZWFzdCBvbmUgbWF0Y2ggZm9yIFwiICsgc1dvcmRHcm91cClcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gc2Vlbkl0O1xyXG4gICAgfSk7XHJcbiAgfSlcclxuICBkZWJ1Z2xvZyhcIiBzZW50ZW5jZXMgXCIgKyB1Lmxlbmd0aCArIFwiIG1hdGNoZXMgXCIgKyBjbnQgKyBcIiBmYWM6IFwiICsgZmFjKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG4vKlxyXG5bIFthLGJdLCBbYyxkXV1cclxuXHJcbjAwIGFcclxuMDEgYlxyXG4xMCBjXHJcbjExIGRcclxuMTIgY1xyXG4qL1xyXG5cclxuLy8gY291cnRlc3kgb2ZcclxuLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy80NDU5OTI4L2hvdy10by1kZWVwLWNsb25lLWluLWphdmFzY3JpcHRcclxuXHJcbmZ1bmN0aW9uIGNsb25lKGl0ZW0pIHtcclxuICAgIGlmICghaXRlbSkgeyByZXR1cm4gaXRlbTsgfSAvLyBudWxsLCB1bmRlZmluZWQgdmFsdWVzIGNoZWNrXHJcblxyXG4gICAgdmFyIHR5cGVzID0gWyBOdW1iZXIsIFN0cmluZywgQm9vbGVhbiBdLFxyXG4gICAgICAgIHJlc3VsdDtcclxuXHJcbiAgICAvLyBub3JtYWxpemluZyBwcmltaXRpdmVzIGlmIHNvbWVvbmUgZGlkIG5ldyBTdHJpbmcoJ2FhYScpLCBvciBuZXcgTnVtYmVyKCc0NDQnKTtcclxuICAgIHR5cGVzLmZvckVhY2goZnVuY3Rpb24odHlwZSkge1xyXG4gICAgICAgIGlmIChpdGVtIGluc3RhbmNlb2YgdHlwZSkge1xyXG4gICAgICAgICAgICByZXN1bHQgPSB0eXBlKCBpdGVtICk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgaWYgKHR5cGVvZiByZXN1bHQgPT0gXCJ1bmRlZmluZWRcIikge1xyXG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoIGl0ZW0gKSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiKSB7XHJcbiAgICAgICAgICAgIHJlc3VsdCA9IFtdO1xyXG4gICAgICAgICAgICBpdGVtLmZvckVhY2goZnVuY3Rpb24oY2hpbGQsIGluZGV4LCBhcnJheSkge1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0W2luZGV4XSA9IGNsb25lKCBjaGlsZCApO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBpdGVtID09IFwib2JqZWN0XCIpIHtcclxuICAgICAgICAgICAgLy8gdGVzdGluZyB0aGF0IHRoaXMgaXMgRE9NXHJcbiAgICAgICAgICAgIGlmIChpdGVtLm5vZGVUeXBlICYmIHR5cGVvZiBpdGVtLmNsb25lTm9kZSA9PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBpdGVtLmNsb25lTm9kZSggdHJ1ZSApO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKCFpdGVtLnByb3RvdHlwZSkgeyAvLyBjaGVjayB0aGF0IHRoaXMgaXMgYSBsaXRlcmFsXHJcbiAgICAgICAgICAgICAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIERhdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBuZXcgRGF0ZShpdGVtKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gaXQgaXMgYW4gb2JqZWN0IGxpdGVyYWxcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB7fTtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpIGluIGl0ZW0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0W2ldID0gY2xvbmUoIGl0ZW1baV0gKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBkZXBlbmRpbmcgd2hhdCB5b3Ugd291bGQgbGlrZSBoZXJlLFxyXG4gICAgICAgICAgICAgLy8gICAvLyBqdXN0IGtlZXAgdGhlIHJlZmVyZW5jZSwgb3IgY3JlYXRlIG5ldyBvYmplY3RcclxuICAgICAgICAgICAgIC8vICAgaWYgKGZhbHNlICYmIGl0ZW0uY29uc3RydWN0b3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyB3b3VsZCBub3QgYWR2aWNlIHRvIGRvIHRoYXQsIHJlYXNvbj8gUmVhZCBiZWxvd1xyXG4gICAgICAgICAgICAvLyAgICAgICAgcmVzdWx0ID0gbmV3IGl0ZW0uY29uc3RydWN0b3IoKTtcclxuICAgICAgICAgICAgLy8gICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBpdGVtO1xyXG4gICAgICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJlc3VsdCA9IGl0ZW07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuLy8gd2UgY2FuIHJlcGxpY2F0ZSB0aGUgdGFpbCBvciB0aGUgaGVhZCxcclxuLy8gd2UgcmVwbGljYXRlIHRoZSB0YWlsIGFzIGl0IGlzIHNtYWxsZXIuXHJcblxyXG4vLyBbYSxiLGMgXVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGV4cGFuZE1hdGNoQXJyKGRlZXAgOiBBcnJheTxBcnJheTxhbnk+PikgOiBBcnJheTxBcnJheTxhbnk+PiB7XHJcbiAgdmFyIGEgPSBbXTtcclxuICB2YXIgbGluZSA9IFtdO1xyXG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlZXApKTtcclxuICBkZWVwLmZvckVhY2goZnVuY3Rpb24odUJyZWFrRG93bkxpbmUsIGlJbmRleCA6IG51bWJlcikge1xyXG4gICAgbGluZVtpSW5kZXhdID0gW107XHJcbiAgICB1QnJlYWtEb3duTGluZS5mb3JFYWNoKGZ1bmN0aW9uKGFXb3JkR3JvdXAgLCB3Z0luZGV4OiBudW1iZXIpIHtcclxuICAgICAgbGluZVtpSW5kZXhdW3dnSW5kZXhdID0gW107XHJcbiAgICAgIGFXb3JkR3JvdXAuZm9yRWFjaChmdW5jdGlvbiAob1dvcmRWYXJpYW50LCBpV1ZJbmRleCA6IG51bWJlcikge1xyXG4gICAgICAgIGxpbmVbaUluZGV4XVt3Z0luZGV4XVtpV1ZJbmRleF0gPSBvV29yZFZhcmlhbnQ7XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfSlcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShsaW5lKSk7XHJcbiAgdmFyIHJlcyA9IFtdO1xyXG4gIHZhciBudmVjcyA9IFtdO1xyXG4gIGZvcih2YXIgaSA9IDA7IGkgPCBsaW5lLmxlbmd0aDsgKytpKSB7XHJcbiAgICB2YXIgdmVjcyA9IFtbXV07XHJcbiAgICB2YXIgbnZlY3MgPVtdO1xyXG4gICAgdmFyIHJ2ZWMgPSBbXTtcclxuICAgIGZvcih2YXIgayA9IDA7IGsgPCBsaW5lW2ldLmxlbmd0aDsgKytrKSB7IC8vIHdvcmRncm91cCBrXHJcbiAgICAgIC8vdmVjcyBpcyB0aGUgdmVjdG9yIG9mIGFsbCBzbyBmYXIgc2VlbiB2YXJpYW50cyB1cCB0byBrIHdncy5cclxuICAgICAgdmFyIG5leHRCYXNlID0gW107XHJcbiAgICAgIGZvcih2YXIgbCA9IDA7IGwgPCBsaW5lW2ldW2tdLmxlbmd0aDsgKytsICkgeyAvLyBmb3IgZWFjaCB2YXJpYW50XHJcbiAgICAgICAgZGVidWdsb2coXCJ2ZWNzIG5vd1wiICsgSlNPTi5zdHJpbmdpZnkodmVjcykpO1xyXG4gICAgICAgIG52ZWNzID0gW107IC8vdmVjcy5zbGljZSgpOyAvLyBjb3B5IHRoZSB2ZWNbaV0gYmFzZSB2ZWN0b3I7XHJcbiAgICAgICAgZGVidWdsb2coXCJ2ZWNzIGNvcGllZCBub3dcIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSk7XHJcbiAgICAgICAgZm9yKHZhciB1ID0gMDsgdSA8IHZlY3MubGVuZ3RoOyArK3UpIHtcclxuICAgICAgICAgICBudmVjc1t1XSA9IHZlY3NbdV0uc2xpY2UoKTsgLy9cclxuICAgICAgICAgICBkZWJ1Z2xvZyhcImNvcGllZCB2ZWNzW1wiKyB1K1wiXVwiICsgSlNPTi5zdHJpbmdpZnkodmVjc1t1XSkpO1xyXG4gICAgICAgICAgIG52ZWNzW3VdLnB1c2goXHJcbiAgICAgICAgICAgICBjbG9uZShsaW5lW2ldW2tdW2xdKSk7IC8vIHB1c2ggdGhlIGx0aCB2YXJpYW50XHJcbiAgICAgICAgICAgZGVidWdsb2coXCJub3cgbnZlY3MgXCIgKyBudmVjcy5sZW5ndGggKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGRlYnVnbG9nKFwiIGF0ICAgICBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiBuZXh0YmFzZSA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpXHJcbiAgICAgICAgZGVidWdsb2coXCIgYXBwZW5kIFwiICsgayArIFwiOlwiICsgbCArIFwiIG52ZWNzICAgID5cIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSlcclxuICAgICAgICBuZXh0QmFzZSA9IG5leHRCYXNlLmNvbmNhdChudmVjcyk7XHJcbiAgICAgICAgZGVidWdsb2coXCIgIHJlc3VsdCBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiBudmVjcyAgICA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpXHJcbiAgICAgIH0gLy9jb25zdHJ1XHJcbiAgICAgIGRlYnVnbG9nKFwibm93IGF0IFwiICsgayArIFwiOlwiICsgbCArIFwiID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcclxuICAgICAgdmVjcyA9IG5leHRCYXNlO1xyXG4gICAgfVxyXG4gICAgZGVidWdsb2coXCJBUFBFTkRJTkcgVE8gUkVTXCIgKyBpICsgXCI6XCIgKyBsICsgXCIgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxyXG4gICAgcmVzID0gcmVzLmNvbmNhdCh2ZWNzKTtcclxuICB9XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVnRXhwKG9SdWxlIDogSVJ1bGUsIGNvbnRleHQgOiBJRk1hdGNoLmNvbnRleHQsIG9wdGlvbnMgPyA6IElNYXRjaE9wdGlvbnMpIHtcclxuICBpZiAoY29udGV4dFtvUnVsZS5rZXldID09PSB1bmRlZmluZWQpIHtcclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgfVxyXG4gIHZhciBzS2V5ID0gb1J1bGUua2V5O1xyXG4gIHZhciBzMSA9IGNvbnRleHRbb1J1bGUua2V5XS50b0xvd2VyQ2FzZSgpXHJcbiAgdmFyIHJlZyA9IG9SdWxlLnJlZ2V4cDtcclxuXHJcbiAgdmFyIG0gPSByZWcuZXhlYyhzMSk7XHJcbiAgZGVidWdsb2coXCJhcHBseWluZyByZWdleHA6IFwiICsgczEgKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KG0pKTtcclxuICBpZiAoIW0pIHtcclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgfVxyXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XHJcbiAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCxvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpXHJcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XHJcbiAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKXtcclxuICAgIHJldHVybiB1bmRlZmluZWRcclxuICB9XHJcbiAgdmFyIG9FeHRyYWN0ZWRDb250ZXh0ID0gZXh0cmFjdEFyZ3NNYXAobSwgb1J1bGUuYXJnc01hcCApO1xyXG4gIGRlYnVnbG9nKFwiZXh0cmFjdGVkIGFyZ3MgXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZS5hcmdzTWFwKSk7XHJcbiAgZGVidWdsb2coXCJtYXRjaCBcIiArIEpTT04uc3RyaW5naWZ5KG0pKTtcclxuXHJcbiAgZGVidWdsb2coXCJleHRyYWN0ZWQgYXJncyBcIiArIEpTT04uc3RyaW5naWZ5KG9FeHRyYWN0ZWRDb250ZXh0KSk7XHJcbiAgdmFyIHJlcyA9IE9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpIGFzIGFueTtcclxuICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpO1xyXG4gIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcclxuICBpZiAob0V4dHJhY3RlZENvbnRleHRbc0tleV0gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgcmVzW3NLZXldID0gb0V4dHJhY3RlZENvbnRleHRbc0tleV07XHJcbiAgfVxyXG4gIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XHJcbiAgICAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xyXG4gICAgIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBvRXh0cmFjdGVkQ29udGV4dClcclxuICB9XHJcbiAgT2JqZWN0LmZyZWV6ZShyZXMpO1xyXG4gIGRlYnVnbG9nKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLHVuZGVmaW5lZCwyKSk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNvcnRCeVdlaWdodChzS2V5IDogc3RyaW5nLCBvQ29udGV4dEEgOiBJRk1hdGNoLmNvbnRleHQsIG9Db250ZXh0QiA6IElGTWF0Y2guY29udGV4dCkgIDogbnVtYmVye1xyXG4gIGRlYnVnbG9nKCdzb3J0aW5nOiAnICsgc0tleSArICdpbnZva2VkIHdpdGhcXG4gMTonICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHRBLHVuZGVmaW5lZCwyKStcclxuICAgXCIgdnMgXFxuIDI6XCIgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEIsdW5kZWZpbmVkLDIpKTtcclxuICB2YXIgcmFua2luZ0EgOiBudW1iZXIgPSAgcGFyc2VGbG9hdChvQ29udGV4dEFbXCJfcmFua2luZ1wiXSB8fCBcIjFcIik7XHJcbiAgdmFyIHJhbmtpbmdCIDogbnVtYmVyICA9IHBhcnNlRmxvYXQob0NvbnRleHRCW1wiX3JhbmtpbmdcIl0gfHwgXCIxXCIpO1xyXG4gIGlmIChyYW5raW5nQSAhPT0gcmFua2luZ0IpIHtcclxuICAgIGRlYnVnbG9nKFwiIHJhbmtpbiBkZWx0YVwiICsgMTAwKihyYW5raW5nQiAtIHJhbmtpbmdBKSk7XHJcbiAgICByZXR1cm4gMTAwKihyYW5raW5nQiAtIHJhbmtpbmdBKVxyXG4gIH1cclxuXHJcbiAgdmFyIHdlaWdodEEgPSBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QVtcIl93ZWlnaHRcIl1bc0tleV0gIHx8IDA7XHJcbiAgdmFyIHdlaWdodEIgPSBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QltcIl93ZWlnaHRcIl1bc0tleV0gIHx8IDA7XHJcbiAgcmV0dXJuICsod2VpZ2h0QSAtIHdlaWdodEIpO1xyXG59XHJcblxyXG5cclxuLy8gV29yZCwgU3lub255bSwgUmVnZXhwIC8gRXh0cmFjdGlvblJ1bGVcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhdWdtZW50Q29udGV4dDEoIGNvbnRleHQgOiBJRk1hdGNoLmNvbnRleHQsIG9SdWxlcyA6IEFycmF5PElSdWxlPiwgb3B0aW9ucyA6IElNYXRjaE9wdGlvbnMpIDogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgdmFyIHNLZXkgPSBvUnVsZXNbMF0ua2V5O1xyXG4gIC8vIGNoZWNrIHRoYXQgcnVsZVxyXG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAvLyBjaGVjayBjb25zaXN0ZW5jeVxyXG4gICAgb1J1bGVzLmV2ZXJ5KGZ1bmN0aW9uIChpUnVsZSkge1xyXG4gICAgICBpZiAoaVJ1bGUua2V5ICE9PSBzS2V5KSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW5ob21vZ2Vub3VzIGtleXMgaW4gcnVsZXMsIGV4cGVjdGVkIFwiICsgc0tleSArIFwiIHdhcyBcIiArIEpTT04uc3RyaW5naWZ5KGlSdWxlKSk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vIGxvb2sgZm9yIHJ1bGVzIHdoaWNoIG1hdGNoXHJcbiAgdmFyIHJlcyA9IG9SdWxlcy5tYXAoZnVuY3Rpb24ob1J1bGUpIHtcclxuICAgIC8vIGlzIHRoaXMgcnVsZSBhcHBsaWNhYmxlXHJcbiAgICBzd2l0Y2gob1J1bGUudHlwZSkge1xyXG4gICAgICBjYXNlIElGTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQ6XHJcbiAgICAgICAgcmV0dXJuIG1hdGNoV29yZChvUnVsZSwgY29udGV4dCwgb3B0aW9ucylcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5SRUdFWFA6XHJcbiAgICAgICAgcmV0dXJuIG1hdGNoUmVnRXhwKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKTtcclxuICAgLy8gICBjYXNlIFwiRXh0cmFjdGlvblwiOlxyXG4gICAvLyAgICAgcmV0dXJuIG1hdGNoRXh0cmFjdGlvbihvUnVsZSxjb250ZXh0KTtcclxuICAgIH1cclxuICAgIHJldHVybiB1bmRlZmluZWRcclxuICB9KS5maWx0ZXIoZnVuY3Rpb24ob3Jlcykge1xyXG4gICAgcmV0dXJuICEhb3Jlc1xyXG4gIH0pLnNvcnQoXHJcbiAgICBzb3J0QnlXZWlnaHQuYmluZCh0aGlzLCBzS2V5KVxyXG4gICk7XHJcbiAgcmV0dXJuIHJlcztcclxuICAvLyBPYmplY3Qua2V5cygpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcclxuICAvLyB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0KCBjb250ZXh0IDogSUZNYXRjaC5jb250ZXh0LCBhUnVsZXMgOiBBcnJheTxJUnVsZT4pIDogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcblxyXG52YXIgb3B0aW9uczEgOiBJTWF0Y2hPcHRpb25zID0ge1xyXG4gICAgbWF0Y2hvdGhlcnMgOiB0cnVlLFxyXG4gICAgb3ZlcnJpZGU6IGZhbHNlXHJcbiAgfSBhcyBJTWF0Y2hPcHRpb25zO1xyXG5cclxuICB2YXIgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LGFSdWxlcyxvcHRpb25zMSlcclxuXHJcbiAgaWYgKGFSZXMubGVuZ3RoID09PSAwKSAge1xyXG4gICAgdmFyIG9wdGlvbnMyIDogSU1hdGNoT3B0aW9ucyA9IHtcclxuICAgICAgICBtYXRjaG90aGVycyA6IGZhbHNlLFxyXG4gICAgICAgIG92ZXJyaWRlOiB0cnVlXHJcbiAgICB9IGFzIElNYXRjaE9wdGlvbnM7XHJcbiAgICBhUmVzID0gYXVnbWVudENvbnRleHQxKGNvbnRleHQsIGFSdWxlcywgb3B0aW9uczIpO1xyXG4gIH1cclxuICByZXR1cm4gYVJlcztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGluc2VydE9yZGVyZWQocmVzdWx0IDogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiwgaUluc2VydGVkTWVtYmVyIDogSUZNYXRjaC5jb250ZXh0LCBsaW1pdCA6IG51bWJlcikgOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICAvLyBUT0RPOiB1c2Ugc29tZSB3ZWlnaHRcclxuICBpZiAocmVzdWx0Lmxlbmd0aCA8IGxpbWl0KSB7XHJcbiAgICByZXN1bHQucHVzaChpSW5zZXJ0ZWRNZW1iZXIpXHJcbiAgfVxyXG4gIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdGFrZVRvcE4oYXJyIDogQXJyYXk8QXJyYXk8SUZNYXRjaC5jb250ZXh0Pj4pOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICB2YXIgdSA9IGFyci5maWx0ZXIoZnVuY3Rpb24oaW5uZXJBcnIpIHsgcmV0dXJuIGlubmVyQXJyLmxlbmd0aCA+IDB9KVxyXG5cclxuICB2YXIgcmVzID1bXTtcclxuICAvLyBzaGlmdCBvdXQgdGhlIHRvcCBvbmVzXHJcbiAgdSA9IHUubWFwKGZ1bmN0aW9uKGlBcnIpIHtcclxuICAgIHZhciB0b3AgPSBpQXJyLnNoaWZ0KCk7XHJcbiAgICByZXMgPSBpbnNlcnRPcmRlcmVkKHJlcyx0b3AsNSlcclxuICAgIHJldHVybiBpQXJyXHJcbiAgfSkuZmlsdGVyKGZ1bmN0aW9uKGlubmVyQXJyOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+KSA6IGJvb2xlYW4geyByZXR1cm4gaW5uZXJBcnIubGVuZ3RoID4gMH0pO1xyXG4gIC8vIGFzIEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuaW1wb3J0ICogYXMgaW5wdXRGaWx0ZXJSdWxlcyBmcm9tICcuL2lucHV0RmlsdGVyUnVsZXMnO1xyXG5cclxudmFyIHJtO1xyXG5cclxuZnVuY3Rpb24gZ2V0Uk1PbmNlKCkge1xyXG4gIGlmICghcm0pIHtcclxuICAgIHJtID0gaW5wdXRGaWx0ZXJSdWxlcy5nZXRSdWxlTWFwKClcclxuICB9XHJcbiAgcmV0dXJuIHJtO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlSdWxlcyhjb250ZXh0IDogSUZNYXRjaC5jb250ZXh0KSA6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIHZhciBiZXN0TiA6IEFycmF5PElGTWF0Y2guY29udGV4dD4gPSBbY29udGV4dF07XHJcbiAgaW5wdXRGaWx0ZXJSdWxlcy5vS2V5T3JkZXIuZm9yRWFjaChmdW5jdGlvbiAoc0tleSA6IHN0cmluZykge1xyXG4gICAgIHZhciBiZXN0TmV4dDogQXJyYXk8QXJyYXk8SUZNYXRjaC5jb250ZXh0Pj4gPSBbXTtcclxuICAgICBiZXN0Ti5mb3JFYWNoKGZ1bmN0aW9uKG9Db250ZXh0IDogSUZNYXRjaC5jb250ZXh0KSB7XHJcbiAgICAgICBpZiAob0NvbnRleHRbc0tleV0pIHtcclxuICAgICAgICAgIGRlYnVnbG9nKCcqKiBhcHBseWluZyBydWxlcyBmb3IgJyArIHNLZXkpXHJcbiAgICAgICAgICB2YXIgcmVzID0gYXVnbWVudENvbnRleHQob0NvbnRleHQsIGdldFJNT25jZSgpW3NLZXldIHx8IFtdKVxyXG4gICAgICAgICAgZGVidWdsb2coJyoqIHJlc3VsdCBmb3IgJyArIHNLZXkgKyAnID0gJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSlcclxuICAgICAgICAgIGJlc3ROZXh0LnB1c2gocmVzIHx8IFtdKVxyXG4gICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgLy8gcnVsZSBub3QgcmVsZXZhbnRcclxuICAgICAgICAgYmVzdE5leHQucHVzaChbb0NvbnRleHRdKTtcclxuICAgICAgIH1cclxuICAgIH0pXHJcbiAgICBiZXN0TiA9IHRha2VUb3BOKGJlc3ROZXh0KTtcclxuICB9KTtcclxuICByZXR1cm4gYmVzdE5cclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhcHBseVJ1bGVzUGlja0ZpcnN0KGNvbnRleHQgOiBJRk1hdGNoLmNvbnRleHQpIDogSUZNYXRjaC5jb250ZXh0IHtcclxuICB2YXIgciA9IGFwcGx5UnVsZXMoY29udGV4dCk7XHJcbiAgcmV0dXJuIHIgJiYgclswXTtcclxufVxyXG5cclxuLyoqXHJcbiAqIERlY2lkZSB3aGV0aGVyIHRvIHJlcXVlcnkgZm9yIGEgY29udGV0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZGVjaWRlT25SZVF1ZXJ5KCBjb250ZXh0IDogSUZNYXRjaC5jb250ZXh0KSA6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIHJldHVybiBbXVxyXG59XHJcbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9saWIvbm9kZS00LmQudHNcIiAvPlxuXCJ1c2Ugc3RyaWN0XCI7XG4vKipcbiAqIHRoZSBpbnB1dCBmaWx0ZXIgc3RhZ2UgcHJlcHJvY2Vzc2VzIGEgY3VycmVudCBjb250ZXh0XG4gKlxuICogSXQgYSkgY29tYmluZXMgbXVsdGktc2VnbWVudCBhcmd1bWVudHMgaW50byBvbmUgY29udGV4dCBtZW1iZXJzXG4gKiBJdCBiKSBhdHRlbXB0cyB0byBhdWdtZW50IHRoZSBjb250ZXh0IGJ5IGFkZGl0aW9uYWwgcXVhbGlmaWNhdGlvbnNcbiAqICAgICAgICAgICAoTWlkIHRlcm0gZ2VuZXJhdGluZyBBbHRlcm5hdGl2ZXMsIGUuZy5cbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiB1bml0IHRlc3Q/XG4gKiAgICAgICAgICAgICAgICAgQ2xpZW50U2lkZVRhcmdldFJlc29sdXRpb24gLT4gc291cmNlID9cbiAqICAgICAgICAgICApXG4gKiAgU2ltcGxlIHJ1bGVzIGxpa2UgIEludGVudFxuICpcbiAqXG4gKiBAbW9kdWxlXG4gKiBAZmlsZSBpbnB1dEZpbHRlci50c1xuICovXG5jb25zdCBkaXN0YW5jZSA9IHJlcXVpcmUoJy4uL3V0aWxzL2RhbWVyYXVMZXZlbnNodGVpbicpO1xuY29uc3QgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpO1xuY29uc3QgYnJlYWtkb3duID0gcmVxdWlyZSgnLi9icmVha2Rvd24nKTtcbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ2lucHV0RmlsdGVyJyk7XG5jb25zdCBtYXRjaGRhdGEgPSByZXF1aXJlKCcuL21hdGNoZGF0YScpO1xudmFyIG9Vbml0VGVzdHMgPSBtYXRjaGRhdGEub1VuaXRUZXN0cztcbi8qKlxuICogQHBhcmFtIHNUZXh0IHtzdHJpbmd9IHRoZSB0ZXh0IHRvIG1hdGNoIHRvIE5hdlRhcmdldFJlc29sdXRpb25cbiAqIEBwYXJhbSBzVGV4dDIge3N0cmluZ30gdGhlIHF1ZXJ5IHRleHQsIGUuZy4gTmF2VGFyZ2V0XG4gKlxuICogQHJldHVybiB0aGUgZGlzdGFuY2UsIG5vdGUgdGhhdCBpcyBpcyAqbm90KiBzeW1tZXRyaWMhXG4gKi9cbmZ1bmN0aW9uIGNhbGNEaXN0YW5jZShzVGV4dDEsIHNUZXh0Mikge1xuICAgIC8vIGNvbnNvbGUubG9nKFwibGVuZ3RoMlwiICsgc1RleHQxICsgXCIgLSBcIiArIHNUZXh0MilcbiAgICB2YXIgYTAgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEuc3Vic3RyaW5nKDAsIHNUZXh0Mi5sZW5ndGgpLCBzVGV4dDIpO1xuICAgIHZhciBhID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnRvTG93ZXJDYXNlKCksIHNUZXh0Mik7XG4gICAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGE7XG59XG5jb25zdCBJRk1hdGNoID0gcmVxdWlyZSgnLi4vbWF0Y2gvaWZtYXRjaCcpO1xuZnVuY3Rpb24gbm9uUHJpdmF0ZUtleXMob0EpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMob0EpLmZpbHRlcihrZXkgPT4ge1xuICAgICAgICByZXR1cm4ga2V5WzBdICE9PSAnXyc7XG4gICAgfSk7XG59XG5mdW5jdGlvbiBjb3VudEFpbkIob0EsIG9CLCBmbkNvbXBhcmUsIGFLZXlJZ25vcmUpIHtcbiAgICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxuICAgICAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xuICAgIGZuQ29tcGFyZSA9IGZuQ29tcGFyZSB8fCBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcbiAgICB9KS5cbiAgICAgICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xuICAgICAgICAgICAgcHJldiA9IHByZXYgKyAoZm5Db21wYXJlKG9BW2tleV0sIG9CW2tleV0sIGtleSkgPyAxIDogMCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG59XG5leHBvcnRzLmNvdW50QWluQiA9IGNvdW50QWluQjtcbmZ1bmN0aW9uIHNwdXJpb3VzQW5vdEluQihvQSwgb0IsIGFLZXlJZ25vcmUpIHtcbiAgICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxuICAgICAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xuICAgIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcbiAgICB9KS5cbiAgICAgICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbn1cbmV4cG9ydHMuc3B1cmlvdXNBbm90SW5CID0gc3B1cmlvdXNBbm90SW5CO1xuZnVuY3Rpb24gbG93ZXJDYXNlKG8pIHtcbiAgICBpZiAodHlwZW9mIG8gPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgcmV0dXJuIG8udG9Mb3dlckNhc2UoKTtcbiAgICB9XG4gICAgcmV0dXJuIG87XG59XG5mdW5jdGlvbiBjb21wYXJlQ29udGV4dChvQSwgb0IsIGFLZXlJZ25vcmUpIHtcbiAgICB2YXIgZXF1YWwgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpID09PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xuICAgIHZhciBkaWZmZXJlbnQgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpICE9PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xuICAgIHZhciBzcHVyaW91c0wgPSBzcHVyaW91c0Fub3RJbkIob0EsIG9CLCBhS2V5SWdub3JlKTtcbiAgICB2YXIgc3B1cmlvdXNSID0gc3B1cmlvdXNBbm90SW5CKG9CLCBvQSwgYUtleUlnbm9yZSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZXF1YWw6IGVxdWFsLFxuICAgICAgICBkaWZmZXJlbnQ6IGRpZmZlcmVudCxcbiAgICAgICAgc3B1cmlvdXNMOiBzcHVyaW91c0wsXG4gICAgICAgIHNwdXJpb3VzUjogc3B1cmlvdXNSXG4gICAgfTtcbn1cbmV4cG9ydHMuY29tcGFyZUNvbnRleHQgPSBjb21wYXJlQ29udGV4dDtcbmZ1bmN0aW9uIGNhdGVnb3JpemVTdHJpbmcoc3RyaW5nLCBleGFjdCwgb1J1bGVzKSB7XG4gICAgLy8gc2ltcGx5IGFwcGx5IGFsbCBydWxlc1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBvUnVsZXMuZm9yRWFjaChmdW5jdGlvbiAob1J1bGUpIHtcbiAgICAgICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlIDAgLyogV09SRCAqLzpcbiAgICAgICAgICAgICAgICBpZiAoZXhhY3QgJiYgb1J1bGUud29yZCA9PT0gc3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFleGFjdCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGV2ZW5tYXRjaCA9IGNhbGNEaXN0YW5jZShvUnVsZS53b3JkLCBzdHJpbmcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobGV2ZW5tYXRjaCA8IDE1MCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLndvcmQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldmVubWF0Y2g6IGxldmVubWF0Y2hcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAxIC8qIFJFR0VYUCAqLzpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KFwiIGhlcmUgcmVnZXhwXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSkpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbSA9IG9SdWxlLnJlZ2V4cC5leGVjKHN0cmluZyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogKG9SdWxlLm1hdGNoSW5kZXggIT09IHVuZGVmaW5lZCAmJiBtW29SdWxlLm1hdGNoSW5kZXhdKSB8fCBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidW5rbm93biB0eXBlXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5jYXRlZ29yaXplU3RyaW5nID0gY2F0ZWdvcml6ZVN0cmluZztcbi8qKlxuICpcbiAqIE9wdGlvbnMgbWF5IGJlIHtcbiAqIG1hdGNob3RoZXJzIDogdHJ1ZSwgID0+IG9ubHkgcnVsZXMgd2hlcmUgYWxsIG90aGVycyBtYXRjaCBhcmUgY29uc2lkZXJlZFxuICogYXVnbWVudCA6IHRydWUsXG4gKiBvdmVycmlkZSA6IHRydWUgfSAgPT5cbiAqXG4gKi9cbmZ1bmN0aW9uIG1hdGNoV29yZChvUnVsZSwgY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChjb250ZXh0W29SdWxlLmtleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgczIgPSBvUnVsZS53b3JkLnRvTG93ZXJDYXNlKCk7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCwgb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcbiAgICBpZiAob3B0aW9ucy5tYXRjaG90aGVycyAmJiAoZGVsdGEuZGlmZmVyZW50ID4gMCkpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIGMgPSBjYWxjRGlzdGFuY2UoczIsIHMxKTtcbiAgICBkZWJ1Z2xvZyhcIiBzMSA8PiBzMiBcIiArIHMxICsgXCI8PlwiICsgczIgKyBcIiAgPT46IFwiICsgYyk7XG4gICAgaWYgKGMgPCAxNTApIHtcbiAgICAgICAgdmFyIHJlcyA9IE9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpO1xuICAgICAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgY29udGV4dCk7XG4gICAgICAgIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XG4gICAgICAgICAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgb1J1bGUuZm9sbG93cyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZm9yY2Uga2V5IHByb3BlcnR5XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCcgb2JqZWN0Y2F0ZWdvcnknLCByZXNbJ3N5c3RlbU9iamVjdENhdGVnb3J5J10pO1xuICAgICAgICByZXNbb1J1bGUua2V5XSA9IG9SdWxlLmZvbGxvd3Nbb1J1bGUua2V5XSB8fCByZXNbb1J1bGUua2V5XTtcbiAgICAgICAgcmVzLl93ZWlnaHQgPSBPYmplY3QuYXNzaWduKHt9LCByZXMuX3dlaWdodCk7XG4gICAgICAgIHJlcy5fd2VpZ2h0W29SdWxlLmtleV0gPSBjO1xuICAgICAgICBPYmplY3QuZnJlZXplKHJlcyk7XG4gICAgICAgIGRlYnVnbG9nKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbmV4cG9ydHMubWF0Y2hXb3JkID0gbWF0Y2hXb3JkO1xuZnVuY3Rpb24gZXh0cmFjdEFyZ3NNYXAobWF0Y2gsIGFyZ3NNYXApIHtcbiAgICB2YXIgcmVzID0ge307XG4gICAgaWYgKCFhcmdzTWFwKSB7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIE9iamVjdC5rZXlzKGFyZ3NNYXApLmZvckVhY2goZnVuY3Rpb24gKGlLZXkpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gbWF0Y2hbaUtleV07XG4gICAgICAgIHZhciBrZXkgPSBhcmdzTWFwW2lLZXldO1xuICAgICAgICBpZiAoKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikgJiYgdmFsdWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmVzW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmV4dHJhY3RBcmdzTWFwID0gZXh0cmFjdEFyZ3NNYXA7XG5mdW5jdGlvbiBhbmFseXplU3RyaW5nKHNTdHJpbmcsIGFSdWxlcykge1xuICAgIHZhciBjbnQgPSAwO1xuICAgIHZhciBmYWMgPSAxO1xuICAgIHZhciB1ID0gYnJlYWtkb3duLmJyZWFrZG93blN0cmluZyhzU3RyaW5nKTtcbiAgICBkZWJ1Z2xvZyhcImhlcmUgYnJlYWtkb3duXCIgKyBKU09OLnN0cmluZ2lmeSh1KSk7XG4gICAgdmFyIHdvcmRzID0ge307XG4gICAgdmFyIHJlcyA9IHUubWFwKGZ1bmN0aW9uIChhQXJyKSB7XG4gICAgICAgIHJldHVybiBhQXJyLm1hcChmdW5jdGlvbiAoc1dvcmRHcm91cCkge1xuICAgICAgICAgICAgdmFyIHNlZW5JdCA9IHdvcmRzW3NXb3JkR3JvdXBdO1xuICAgICAgICAgICAgaWYgKHNlZW5JdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgc2Vlbkl0ID0gY2F0ZWdvcml6ZVN0cmluZyhzV29yZEdyb3VwLCB0cnVlLCBhUnVsZXMpO1xuICAgICAgICAgICAgICAgIHdvcmRzW3NXb3JkR3JvdXBdID0gc2Vlbkl0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY250ID0gY250ICsgc2Vlbkl0Lmxlbmd0aDtcbiAgICAgICAgICAgIGZhYyA9IGZhYyAqIHNlZW5JdC5sZW5ndGg7XG4gICAgICAgICAgICBpZiAoIXNlZW5JdCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGluZyBhdCBsZWFzdCBvbmUgbWF0Y2ggZm9yIFwiICsgc1dvcmRHcm91cCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc2Vlbkl0O1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBkZWJ1Z2xvZyhcIiBzZW50ZW5jZXMgXCIgKyB1Lmxlbmd0aCArIFwiIG1hdGNoZXMgXCIgKyBjbnQgKyBcIiBmYWM6IFwiICsgZmFjKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5hbmFseXplU3RyaW5nID0gYW5hbHl6ZVN0cmluZztcbi8qXG5bIFthLGJdLCBbYyxkXV1cblxuMDAgYVxuMDEgYlxuMTAgY1xuMTEgZFxuMTIgY1xuKi9cbi8vIGNvdXJ0ZXN5IG9mXG4vLyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzQ0NTk5MjgvaG93LXRvLWRlZXAtY2xvbmUtaW4tamF2YXNjcmlwdFxuZnVuY3Rpb24gY2xvbmUoaXRlbSkge1xuICAgIGlmICghaXRlbSkge1xuICAgICAgICByZXR1cm4gaXRlbTtcbiAgICB9IC8vIG51bGwsIHVuZGVmaW5lZCB2YWx1ZXMgY2hlY2tcbiAgICB2YXIgdHlwZXMgPSBbTnVtYmVyLCBTdHJpbmcsIEJvb2xlYW5dLCByZXN1bHQ7XG4gICAgLy8gbm9ybWFsaXppbmcgcHJpbWl0aXZlcyBpZiBzb21lb25lIGRpZCBuZXcgU3RyaW5nKCdhYWEnKSwgb3IgbmV3IE51bWJlcignNDQ0Jyk7XG4gICAgdHlwZXMuZm9yRWFjaChmdW5jdGlvbiAodHlwZSkge1xuICAgICAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIHR5cGUpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHR5cGUoaXRlbSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAodHlwZW9mIHJlc3VsdCA9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoaXRlbSkgPT09IFwiW29iamVjdCBBcnJheV1cIikge1xuICAgICAgICAgICAgcmVzdWx0ID0gW107XG4gICAgICAgICAgICBpdGVtLmZvckVhY2goZnVuY3Rpb24gKGNoaWxkLCBpbmRleCwgYXJyYXkpIHtcbiAgICAgICAgICAgICAgICByZXN1bHRbaW5kZXhdID0gY2xvbmUoY2hpbGQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIGl0ZW0gPT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgLy8gdGVzdGluZyB0aGF0IHRoaXMgaXMgRE9NXG4gICAgICAgICAgICBpZiAoaXRlbS5ub2RlVHlwZSAmJiB0eXBlb2YgaXRlbS5jbG9uZU5vZGUgPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IGl0ZW0uY2xvbmVOb2RlKHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoIWl0ZW0ucHJvdG90eXBlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGl0ZW0gaW5zdGFuY2VvZiBEYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IG5ldyBEYXRlKGl0ZW0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gaXQgaXMgYW4gb2JqZWN0IGxpdGVyYWxcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0ge307XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgaW4gaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0W2ldID0gY2xvbmUoaXRlbVtpXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBkZXBlbmRpbmcgd2hhdCB5b3Ugd291bGQgbGlrZSBoZXJlLFxuICAgICAgICAgICAgICAgIC8vICAgLy8ganVzdCBrZWVwIHRoZSByZWZlcmVuY2UsIG9yIGNyZWF0ZSBuZXcgb2JqZWN0XG4gICAgICAgICAgICAgICAgLy8gICBpZiAoZmFsc2UgJiYgaXRlbS5jb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgICAgIC8vIHdvdWxkIG5vdCBhZHZpY2UgdG8gZG8gdGhhdCwgcmVhc29uPyBSZWFkIGJlbG93XG4gICAgICAgICAgICAgICAgLy8gICAgICAgIHJlc3VsdCA9IG5ldyBpdGVtLmNvbnN0cnVjdG9yKCk7XG4gICAgICAgICAgICAgICAgLy8gICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBpdGVtO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0ID0gaXRlbTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuLy8gd2UgY2FuIHJlcGxpY2F0ZSB0aGUgdGFpbCBvciB0aGUgaGVhZCxcbi8vIHdlIHJlcGxpY2F0ZSB0aGUgdGFpbCBhcyBpdCBpcyBzbWFsbGVyLlxuLy8gW2EsYixjIF1cbmZ1bmN0aW9uIGV4cGFuZE1hdGNoQXJyKGRlZXApIHtcbiAgICB2YXIgYSA9IFtdO1xuICAgIHZhciBsaW5lID0gW107XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZGVlcCkpO1xuICAgIGRlZXAuZm9yRWFjaChmdW5jdGlvbiAodUJyZWFrRG93bkxpbmUsIGlJbmRleCkge1xuICAgICAgICBsaW5lW2lJbmRleF0gPSBbXTtcbiAgICAgICAgdUJyZWFrRG93bkxpbmUuZm9yRWFjaChmdW5jdGlvbiAoYVdvcmRHcm91cCwgd2dJbmRleCkge1xuICAgICAgICAgICAgbGluZVtpSW5kZXhdW3dnSW5kZXhdID0gW107XG4gICAgICAgICAgICBhV29yZEdyb3VwLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkVmFyaWFudCwgaVdWSW5kZXgpIHtcbiAgICAgICAgICAgICAgICBsaW5lW2lJbmRleF1bd2dJbmRleF1baVdWSW5kZXhdID0gb1dvcmRWYXJpYW50O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGxpbmUpKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgdmFyIG52ZWNzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciB2ZWNzID0gW1tdXTtcbiAgICAgICAgdmFyIG52ZWNzID0gW107XG4gICAgICAgIHZhciBydmVjID0gW107XG4gICAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgbGluZVtpXS5sZW5ndGg7ICsraykge1xuICAgICAgICAgICAgLy92ZWNzIGlzIHRoZSB2ZWN0b3Igb2YgYWxsIHNvIGZhciBzZWVuIHZhcmlhbnRzIHVwIHRvIGsgd2dzLlxuICAgICAgICAgICAgdmFyIG5leHRCYXNlID0gW107XG4gICAgICAgICAgICBmb3IgKHZhciBsID0gMDsgbCA8IGxpbmVbaV1ba10ubGVuZ3RoOyArK2wpIHtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcInZlY3Mgbm93XCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzKSk7XG4gICAgICAgICAgICAgICAgbnZlY3MgPSBbXTsgLy92ZWNzLnNsaWNlKCk7IC8vIGNvcHkgdGhlIHZlY1tpXSBiYXNlIHZlY3RvcjtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcInZlY3MgY29waWVkIG5vd1wiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciB1ID0gMDsgdSA8IHZlY3MubGVuZ3RoOyArK3UpIHtcbiAgICAgICAgICAgICAgICAgICAgbnZlY3NbdV0gPSB2ZWNzW3VdLnNsaWNlKCk7IC8vXG4gICAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKFwiY29waWVkIHZlY3NbXCIgKyB1ICsgXCJdXCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzW3VdKSk7XG4gICAgICAgICAgICAgICAgICAgIG52ZWNzW3VdLnB1c2goY2xvbmUobGluZVtpXVtrXVtsXSkpOyAvLyBwdXNoIHRoZSBsdGggdmFyaWFudFxuICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcIm5vdyBudmVjcyBcIiArIG52ZWNzLmxlbmd0aCArIFwiIFwiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZGVidWdsb2coXCIgYXQgICAgIFwiICsgayArIFwiOlwiICsgbCArIFwiIG5leHRiYXNlID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSk7XG4gICAgICAgICAgICAgICAgZGVidWdsb2coXCIgYXBwZW5kIFwiICsgayArIFwiOlwiICsgbCArIFwiIG52ZWNzICAgID5cIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSk7XG4gICAgICAgICAgICAgICAgbmV4dEJhc2UgPSBuZXh0QmFzZS5jb25jYXQobnZlY3MpO1xuICAgICAgICAgICAgICAgIGRlYnVnbG9nKFwiICByZXN1bHQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbnZlY3MgICAgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKTtcbiAgICAgICAgICAgIH0gLy9jb25zdHJ1XG4gICAgICAgICAgICBkZWJ1Z2xvZyhcIm5vdyBhdCBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpO1xuICAgICAgICAgICAgdmVjcyA9IG5leHRCYXNlO1xuICAgICAgICB9XG4gICAgICAgIGRlYnVnbG9nKFwiQVBQRU5ESU5HIFRPIFJFU1wiICsgaSArIFwiOlwiICsgbCArIFwiID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSk7XG4gICAgICAgIHJlcyA9IHJlcy5jb25jYXQodmVjcyk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmV4cGFuZE1hdGNoQXJyID0gZXhwYW5kTWF0Y2hBcnI7XG5mdW5jdGlvbiBtYXRjaFJlZ0V4cChvUnVsZSwgY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChjb250ZXh0W29SdWxlLmtleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgc0tleSA9IG9SdWxlLmtleTtcbiAgICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgcmVnID0gb1J1bGUucmVnZXhwO1xuICAgIHZhciBtID0gcmVnLmV4ZWMoczEpO1xuICAgIGRlYnVnbG9nKFwiYXBwbHlpbmcgcmVnZXhwOiBcIiArIHMxICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XG4gICAgaWYgKCFtKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsIG9SdWxlLmZvbGxvd3MsIG9SdWxlLmtleSk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XG4gICAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBvRXh0cmFjdGVkQ29udGV4dCA9IGV4dHJhY3RBcmdzTWFwKG0sIG9SdWxlLmFyZ3NNYXApO1xuICAgIGRlYnVnbG9nKFwiZXh0cmFjdGVkIGFyZ3MgXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZS5hcmdzTWFwKSk7XG4gICAgZGVidWdsb2coXCJtYXRjaCBcIiArIEpTT04uc3RyaW5naWZ5KG0pKTtcbiAgICBkZWJ1Z2xvZyhcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob0V4dHJhY3RlZENvbnRleHQpKTtcbiAgICB2YXIgcmVzID0gT2JqZWN0LmFzc2lnbih7fSwgb1J1bGUuZm9sbG93cyk7XG4gICAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIG9FeHRyYWN0ZWRDb250ZXh0KTtcbiAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgY29udGV4dCk7XG4gICAgaWYgKG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVzW3NLZXldID0gb0V4dHJhY3RlZENvbnRleHRbc0tleV07XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XG4gICAgICAgIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBvUnVsZS5mb2xsb3dzKTtcbiAgICAgICAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIG9FeHRyYWN0ZWRDb250ZXh0KTtcbiAgICB9XG4gICAgT2JqZWN0LmZyZWV6ZShyZXMpO1xuICAgIGRlYnVnbG9nKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5tYXRjaFJlZ0V4cCA9IG1hdGNoUmVnRXhwO1xuZnVuY3Rpb24gc29ydEJ5V2VpZ2h0KHNLZXksIG9Db250ZXh0QSwgb0NvbnRleHRCKSB7XG4gICAgZGVidWdsb2coJ3NvcnRpbmc6ICcgKyBzS2V5ICsgJ2ludm9rZWQgd2l0aFxcbiAxOicgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEEsIHVuZGVmaW5lZCwgMikgK1xuICAgICAgICBcIiB2cyBcXG4gMjpcIiArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QiwgdW5kZWZpbmVkLCAyKSk7XG4gICAgdmFyIHJhbmtpbmdBID0gcGFyc2VGbG9hdChvQ29udGV4dEFbXCJfcmFua2luZ1wiXSB8fCBcIjFcIik7XG4gICAgdmFyIHJhbmtpbmdCID0gcGFyc2VGbG9hdChvQ29udGV4dEJbXCJfcmFua2luZ1wiXSB8fCBcIjFcIik7XG4gICAgaWYgKHJhbmtpbmdBICE9PSByYW5raW5nQikge1xuICAgICAgICBkZWJ1Z2xvZyhcIiByYW5raW4gZGVsdGFcIiArIDEwMCAqIChyYW5raW5nQiAtIHJhbmtpbmdBKSk7XG4gICAgICAgIHJldHVybiAxMDAgKiAocmFua2luZ0IgLSByYW5raW5nQSk7XG4gICAgfVxuICAgIHZhciB3ZWlnaHRBID0gb0NvbnRleHRBW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdW3NLZXldIHx8IDA7XG4gICAgdmFyIHdlaWdodEIgPSBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QltcIl93ZWlnaHRcIl1bc0tleV0gfHwgMDtcbiAgICByZXR1cm4gKyh3ZWlnaHRBIC0gd2VpZ2h0Qik7XG59XG5leHBvcnRzLnNvcnRCeVdlaWdodCA9IHNvcnRCeVdlaWdodDtcbi8vIFdvcmQsIFN5bm9ueW0sIFJlZ2V4cCAvIEV4dHJhY3Rpb25SdWxlXG5mdW5jdGlvbiBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgb1J1bGVzLCBvcHRpb25zKSB7XG4gICAgdmFyIHNLZXkgPSBvUnVsZXNbMF0ua2V5O1xuICAgIC8vIGNoZWNrIHRoYXQgcnVsZVxuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIC8vIGNoZWNrIGNvbnNpc3RlbmN5XG4gICAgICAgIG9SdWxlcy5ldmVyeShmdW5jdGlvbiAoaVJ1bGUpIHtcbiAgICAgICAgICAgIGlmIChpUnVsZS5rZXkgIT09IHNLZXkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbmhvbW9nZW5vdXMga2V5cyBpbiBydWxlcywgZXhwZWN0ZWQgXCIgKyBzS2V5ICsgXCIgd2FzIFwiICsgSlNPTi5zdHJpbmdpZnkoaVJ1bGUpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8gbG9vayBmb3IgcnVsZXMgd2hpY2ggbWF0Y2hcbiAgICB2YXIgcmVzID0gb1J1bGVzLm1hcChmdW5jdGlvbiAob1J1bGUpIHtcbiAgICAgICAgLy8gaXMgdGhpcyBydWxlIGFwcGxpY2FibGVcbiAgICAgICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlIDAgLyogV09SRCAqLzpcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2hXb3JkKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKTtcbiAgICAgICAgICAgIGNhc2UgMSAvKiBSRUdFWFAgKi86XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hdGNoUmVnRXhwKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0pLmZpbHRlcihmdW5jdGlvbiAob3Jlcykge1xuICAgICAgICByZXR1cm4gISFvcmVzO1xuICAgIH0pLnNvcnQoc29ydEJ5V2VpZ2h0LmJpbmQodGhpcywgc0tleSkpO1xuICAgIHJldHVybiByZXM7XG4gICAgLy8gT2JqZWN0LmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgLy8gfSk7XG59XG5leHBvcnRzLmF1Z21lbnRDb250ZXh0MSA9IGF1Z21lbnRDb250ZXh0MTtcbmZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0KGNvbnRleHQsIGFSdWxlcykge1xuICAgIHZhciBvcHRpb25zMSA9IHtcbiAgICAgICAgbWF0Y2hvdGhlcnM6IHRydWUsXG4gICAgICAgIG92ZXJyaWRlOiBmYWxzZVxuICAgIH07XG4gICAgdmFyIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMSk7XG4gICAgaWYgKGFSZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHZhciBvcHRpb25zMiA9IHtcbiAgICAgICAgICAgIG1hdGNob3RoZXJzOiBmYWxzZSxcbiAgICAgICAgICAgIG92ZXJyaWRlOiB0cnVlXG4gICAgICAgIH07XG4gICAgICAgIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMik7XG4gICAgfVxuICAgIHJldHVybiBhUmVzO1xufVxuZXhwb3J0cy5hdWdtZW50Q29udGV4dCA9IGF1Z21lbnRDb250ZXh0O1xuZnVuY3Rpb24gaW5zZXJ0T3JkZXJlZChyZXN1bHQsIGlJbnNlcnRlZE1lbWJlciwgbGltaXQpIHtcbiAgICAvLyBUT0RPOiB1c2Ugc29tZSB3ZWlnaHRcbiAgICBpZiAocmVzdWx0Lmxlbmd0aCA8IGxpbWl0KSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKGlJbnNlcnRlZE1lbWJlcik7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5leHBvcnRzLmluc2VydE9yZGVyZWQgPSBpbnNlcnRPcmRlcmVkO1xuZnVuY3Rpb24gdGFrZVRvcE4oYXJyKSB7XG4gICAgdmFyIHUgPSBhcnIuZmlsdGVyKGZ1bmN0aW9uIChpbm5lckFycikgeyByZXR1cm4gaW5uZXJBcnIubGVuZ3RoID4gMDsgfSk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIC8vIHNoaWZ0IG91dCB0aGUgdG9wIG9uZXNcbiAgICB1ID0gdS5tYXAoZnVuY3Rpb24gKGlBcnIpIHtcbiAgICAgICAgdmFyIHRvcCA9IGlBcnIuc2hpZnQoKTtcbiAgICAgICAgcmVzID0gaW5zZXJ0T3JkZXJlZChyZXMsIHRvcCwgNSk7XG4gICAgICAgIHJldHVybiBpQXJyO1xuICAgIH0pLmZpbHRlcihmdW5jdGlvbiAoaW5uZXJBcnIpIHsgcmV0dXJuIGlubmVyQXJyLmxlbmd0aCA+IDA7IH0pO1xuICAgIC8vIGFzIEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMudGFrZVRvcE4gPSB0YWtlVG9wTjtcbmNvbnN0IGlucHV0RmlsdGVyUnVsZXMgPSByZXF1aXJlKCcuL2lucHV0RmlsdGVyUnVsZXMnKTtcbnZhciBybTtcbmZ1bmN0aW9uIGdldFJNT25jZSgpIHtcbiAgICBpZiAoIXJtKSB7XG4gICAgICAgIHJtID0gaW5wdXRGaWx0ZXJSdWxlcy5nZXRSdWxlTWFwKCk7XG4gICAgfVxuICAgIHJldHVybiBybTtcbn1cbmZ1bmN0aW9uIGFwcGx5UnVsZXMoY29udGV4dCkge1xuICAgIHZhciBiZXN0TiA9IFtjb250ZXh0XTtcbiAgICBpbnB1dEZpbHRlclJ1bGVzLm9LZXlPcmRlci5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgICAgIHZhciBiZXN0TmV4dCA9IFtdO1xuICAgICAgICBiZXN0Ti5mb3JFYWNoKGZ1bmN0aW9uIChvQ29udGV4dCkge1xuICAgICAgICAgICAgaWYgKG9Db250ZXh0W3NLZXldKSB7XG4gICAgICAgICAgICAgICAgZGVidWdsb2coJyoqIGFwcGx5aW5nIHJ1bGVzIGZvciAnICsgc0tleSk7XG4gICAgICAgICAgICAgICAgdmFyIHJlcyA9IGF1Z21lbnRDb250ZXh0KG9Db250ZXh0LCBnZXRSTU9uY2UoKVtzS2V5XSB8fCBbXSk7XG4gICAgICAgICAgICAgICAgZGVidWdsb2coJyoqIHJlc3VsdCBmb3IgJyArIHNLZXkgKyAnID0gJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgICAgICAgICAgYmVzdE5leHQucHVzaChyZXMgfHwgW10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gcnVsZSBub3QgcmVsZXZhbnRcbiAgICAgICAgICAgICAgICBiZXN0TmV4dC5wdXNoKFtvQ29udGV4dF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgYmVzdE4gPSB0YWtlVG9wTihiZXN0TmV4dCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGJlc3ROO1xufVxuZXhwb3J0cy5hcHBseVJ1bGVzID0gYXBwbHlSdWxlcztcbmZ1bmN0aW9uIGFwcGx5UnVsZXNQaWNrRmlyc3QoY29udGV4dCkge1xuICAgIHZhciByID0gYXBwbHlSdWxlcyhjb250ZXh0KTtcbiAgICByZXR1cm4gciAmJiByWzBdO1xufVxuZXhwb3J0cy5hcHBseVJ1bGVzUGlja0ZpcnN0ID0gYXBwbHlSdWxlc1BpY2tGaXJzdDtcbi8qKlxuICogRGVjaWRlIHdoZXRoZXIgdG8gcmVxdWVyeSBmb3IgYSBjb250ZXRcbiAqL1xuZnVuY3Rpb24gZGVjaWRlT25SZVF1ZXJ5KGNvbnRleHQpIHtcbiAgICByZXR1cm4gW107XG59XG5leHBvcnRzLmRlY2lkZU9uUmVRdWVyeSA9IGRlY2lkZU9uUmVRdWVyeTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
