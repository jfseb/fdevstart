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
var utils = require('../utils/utils');
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
var clone = utils.cloneDeep;
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
/**
 * Weight factor to use on the a given word distance
 * of 0, 1, 2, 3 ....
 */
var aDistWeight = [0, 3, 1, 0.2];
/**
 * Calculate a weight factor for a given distance and
 * category
 * @param {integer} dist distance in words
 * @param {string} category category to use
 * @returns {number} a distance factor >= 1
 *  1.0 for no effect
 */
function distWeight(dist, category) {
    var abs = Math.abs(dist);
    return 1.0 + (aDistWeight[abs] || 0);
}
exports.distWeight = distWeight;
/**
 * Given a sentence, extact categories
 */
function extractCategoryMap(oSentence) {
    var res = {};
    oSentence.forEach(function (oWord, iIndex) {
        if (oWord.category === IFMatch.CAT_CATEGORY) {
            res[oWord.matchedString] = res[oWord.matchedString] || [];
            res[oWord.matchedString].push({ pos: iIndex });
        }
    });
    utils.deepFreeze(res);
    return res;
}
exports.extractCategoryMap = extractCategoryMap;
function reinForceSentence(oSentence) {
    var oCategoryMap = extractCategoryMap(oSentence);
    oSentence.forEach(function (oWord, iIndex) {
        var m = oCategoryMap[oWord.category] || [];
        m.forEach(function (oPosition) {
            oWord.reinforce = oWord.reinforce || 1;
            oWord.reinforce *= distWeight(iIndex - oPosition.pos, oWord.category);
        });
    });
    return oSentence;
}
exports.reinForceSentence = reinForceSentence;
function reinForce(aCategoryizedArray) {
    aCategoryizedArray.forEach(function (oSentence) {
        reinForceSentence(oSentence);
    });
    return aCategoryizedArray;
}
exports.reinForce = reinForce;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9pbnB1dEZpbHRlci50cyIsIm1hdGNoL2lucHV0RmlsdGVyLmpzIl0sIm5hbWVzIjpbImRpc3RhbmNlIiwicmVxdWlyZSIsImRlYnVnIiwidXRpbHMiLCJicmVha2Rvd24iLCJkZWJ1Z2xvZyIsIm1hdGNoZGF0YSIsIm9Vbml0VGVzdHMiLCJjYWxjRGlzdGFuY2UiLCJzVGV4dDEiLCJzVGV4dDIiLCJhMCIsImxldmVuc2h0ZWluIiwic3Vic3RyaW5nIiwibGVuZ3RoIiwiYSIsInRvTG93ZXJDYXNlIiwiSUZNYXRjaCIsIm5vblByaXZhdGVLZXlzIiwib0EiLCJPYmplY3QiLCJrZXlzIiwiZmlsdGVyIiwia2V5IiwiY291bnRBaW5CIiwib0IiLCJmbkNvbXBhcmUiLCJhS2V5SWdub3JlIiwiQXJyYXkiLCJpc0FycmF5IiwiaW5kZXhPZiIsInJlZHVjZSIsInByZXYiLCJwcm90b3R5cGUiLCJoYXNPd25Qcm9wZXJ0eSIsImNhbGwiLCJleHBvcnRzIiwic3B1cmlvdXNBbm90SW5CIiwibG93ZXJDYXNlIiwibyIsImNvbXBhcmVDb250ZXh0IiwiZXF1YWwiLCJiIiwiZGlmZmVyZW50Iiwic3B1cmlvdXNMIiwic3B1cmlvdXNSIiwiY2F0ZWdvcml6ZVN0cmluZyIsInN0cmluZyIsImV4YWN0Iiwib1J1bGVzIiwicmVzIiwiZm9yRWFjaCIsIm9SdWxlIiwidHlwZSIsIndvcmQiLCJwdXNoIiwibWF0Y2hlZFN0cmluZyIsImNhdGVnb3J5IiwibGV2ZW5tYXRjaCIsIkpTT04iLCJzdHJpbmdpZnkiLCJ1bmRlZmluZWQiLCJtIiwicmVnZXhwIiwiZXhlYyIsIm1hdGNoSW5kZXgiLCJFcnJvciIsIm1hdGNoV29yZCIsImNvbnRleHQiLCJvcHRpb25zIiwiczEiLCJzMiIsImRlbHRhIiwiZm9sbG93cyIsIm1hdGNob3RoZXJzIiwiYyIsImFzc2lnbiIsIm92ZXJyaWRlIiwiX3dlaWdodCIsImZyZWV6ZSIsImV4dHJhY3RBcmdzTWFwIiwibWF0Y2giLCJhcmdzTWFwIiwiaUtleSIsInZhbHVlIiwiYW5hbHl6ZVN0cmluZyIsInNTdHJpbmciLCJhUnVsZXMiLCJjbnQiLCJmYWMiLCJ1IiwiYnJlYWtkb3duU3RyaW5nIiwid29yZHMiLCJtYXAiLCJhQXJyIiwic1dvcmRHcm91cCIsInNlZW5JdCIsImNsb25lIiwiY2xvbmVEZWVwIiwiZXhwYW5kTWF0Y2hBcnIiLCJkZWVwIiwibGluZSIsInVCcmVha0Rvd25MaW5lIiwiaUluZGV4IiwiYVdvcmRHcm91cCIsIndnSW5kZXgiLCJvV29yZFZhcmlhbnQiLCJpV1ZJbmRleCIsIm52ZWNzIiwiaSIsInZlY3MiLCJydmVjIiwiayIsIm5leHRCYXNlIiwibCIsInNsaWNlIiwiY29uY2F0IiwiYURpc3RXZWlnaHQiLCJkaXN0V2VpZ2h0IiwiZGlzdCIsImFicyIsIk1hdGgiLCJleHRyYWN0Q2F0ZWdvcnlNYXAiLCJvU2VudGVuY2UiLCJvV29yZCIsIkNBVF9DQVRFR09SWSIsInBvcyIsImRlZXBGcmVlemUiLCJyZWluRm9yY2VTZW50ZW5jZSIsIm9DYXRlZ29yeU1hcCIsIm9Qb3NpdGlvbiIsInJlaW5mb3JjZSIsInJlaW5Gb3JjZSIsImFDYXRlZ29yeWl6ZWRBcnJheSIsIm1hdGNoUmVnRXhwIiwic0tleSIsInJlZyIsIm9FeHRyYWN0ZWRDb250ZXh0Iiwic29ydEJ5V2VpZ2h0Iiwib0NvbnRleHRBIiwib0NvbnRleHRCIiwicmFua2luZ0EiLCJwYXJzZUZsb2F0IiwicmFua2luZ0IiLCJ3ZWlnaHRBIiwid2VpZ2h0QiIsImF1Z21lbnRDb250ZXh0MSIsImVuYWJsZWQiLCJldmVyeSIsImlSdWxlIiwib3JlcyIsInNvcnQiLCJiaW5kIiwiYXVnbWVudENvbnRleHQiLCJvcHRpb25zMSIsImFSZXMiLCJvcHRpb25zMiIsImluc2VydE9yZGVyZWQiLCJyZXN1bHQiLCJpSW5zZXJ0ZWRNZW1iZXIiLCJsaW1pdCIsInRha2VUb3BOIiwiYXJyIiwiaW5uZXJBcnIiLCJpQXJyIiwidG9wIiwic2hpZnQiLCJpbnB1dEZpbHRlclJ1bGVzIiwicm0iLCJnZXRSTU9uY2UiLCJnZXRSdWxlTWFwIiwiYXBwbHlSdWxlcyIsImJlc3ROIiwib0tleU9yZGVyIiwiYmVzdE5leHQiLCJvQ29udGV4dCIsImFwcGx5UnVsZXNQaWNrRmlyc3QiLCJyIiwiZGVjaWRlT25SZVF1ZXJ5Il0sIm1hcHBpbmdzIjoiQUFBQTtBQ0NBO0FERUE7Ozs7Ozs7Ozs7Ozs7Ozs7QUFlQSxJQUFZQSxXQUFRQyxRQUFNLDZCQUFOLENBQXBCO0FBRUEsSUFBWUMsUUFBS0QsUUFBTSxPQUFOLENBQWpCO0FBRUEsSUFBWUUsUUFBS0YsUUFBTSxnQkFBTixDQUFqQjtBQUlBLElBQVlHLFlBQVNILFFBQU0sYUFBTixDQUFyQjtBQUVBLElBQU1JLFdBQVdILE1BQU0sYUFBTixDQUFqQjtBQUVBLElBQVlJLFlBQVNMLFFBQU0sYUFBTixDQUFyQjtBQUNFLElBQUlNLGFBQWFELFVBQVVDLFVBQTNCO0FBRUE7Ozs7OztBQU1BLFNBQUFDLFlBQUEsQ0FBdUJDLE1BQXZCLEVBQXdDQyxNQUF4QyxFQUF1RDtBQUNyRDtBQUNBLFFBQUlDLEtBQUtYLFNBQVNZLFdBQVQsQ0FBcUJILE9BQU9JLFNBQVAsQ0FBaUIsQ0FBakIsRUFBb0JILE9BQU9JLE1BQTNCLENBQXJCLEVBQXlESixNQUF6RCxDQUFUO0FBQ0EsUUFBSUssSUFBSWYsU0FBU1ksV0FBVCxDQUFxQkgsT0FBT08sV0FBUCxFQUFyQixFQUEyQ04sTUFBM0MsQ0FBUjtBQUNBLFdBQU9DLEtBQUssR0FBTCxHQUFXRCxPQUFPSSxNQUFsQixHQUEyQkMsQ0FBbEM7QUFDRDtBQUVILElBQVlFLFVBQU9oQixRQUFNLGtCQUFOLENBQW5CO0FBcUJBLFNBQUFpQixjQUFBLENBQXdCQyxFQUF4QixFQUEwQjtBQUN4QixXQUFPQyxPQUFPQyxJQUFQLENBQVlGLEVBQVosRUFBZ0JHLE1BQWhCLENBQXdCLGVBQUc7QUFDaEMsZUFBT0MsSUFBSSxDQUFKLE1BQVcsR0FBbEI7QUFDRCxLQUZNLENBQVA7QUFHRDtBQUVELFNBQUFDLFNB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QVQsQ0FBSixFQUFvQjtBQUNqQmxJLHlCQUFTLDJCQUEyQmtJLElBQXBDO0FBQ0Esb0JBQUlyRixNQUFNdUcsZUFBZXNCLFFBQWYsRUFBeUJOLFlBQVlsQyxJQUFaLEtBQXFCLEVBQTlDLENBQVY7QUFDQWxJLHlCQUFTLG1CQUFtQmtJLElBQW5CLEdBQTBCLEtBQTFCLEdBQWtDNUUsS0FBS0MsU0FBTCxDQUFlVixHQUFmLEVBQW9CVyxTQUFwQixFQUErQixDQUEvQixDQUEzQztBQUNBaUgseUJBQVN2SCxJQUFULENBQWNMLE9BQU8sRUFBckI7QUFDRixhQUxELE1BS087QUFDTDtBQUNBNEgseUJBQVN2SCxJQUFULENBQWMsQ0FBQ3dILFFBQUQsQ0FBZDtBQUNEO0FBQ0gsU0FWQTtBQVdESCxnQkFBUVgsU0FBU2EsUUFBVCxDQUFSO0FBQ0QsS0FkRDtBQWVBLFdBQU9GLEtBQVA7QUFDRDtBQWxCZXhJLFFBQUF1SSxVQUFBLEdBQVVBLFVBQVY7QUFxQmhCLFNBQUFLLG1CQUFBLENBQW9DNUcsT0FBcEMsRUFBNkQ7QUFDM0QsUUFBSTZHLElBQUlOLFdBQVd2RyxPQUFYLENBQVI7QUFDQSxXQUFPNkcsS0FBS0EsRUFBRSxDQUFGLENBQVo7QUFDRDtBQUhlN0ksUUFBQTRJLG1CQUFBLEdBQW1CQSxtQkFBbkI7QUFLaEI7OztBQUdBLFNBQUFFLGVBQUEsQ0FBaUM5RyxPQUFqQyxFQUEwRDtBQUN4RCxXQUFPLEVBQVA7QUFDRDtBQUZlaEMsUUFBQThJLGVBQUEsR0FBZUEsZUFBZiIsImZpbGUiOiJtYXRjaC9pbnB1dEZpbHRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9saWIvbm9kZS00LmQudHNcIiAvPlxyXG5cclxuXHJcbi8qKlxyXG4gKiB0aGUgaW5wdXQgZmlsdGVyIHN0YWdlIHByZXByb2Nlc3NlcyBhIGN1cnJlbnQgY29udGV4dFxyXG4gKlxyXG4gKiBJdCBhKSBjb21iaW5lcyBtdWx0aS1zZWdtZW50IGFyZ3VtZW50cyBpbnRvIG9uZSBjb250ZXh0IG1lbWJlcnNcclxuICogSXQgYikgYXR0ZW1wdHMgdG8gYXVnbWVudCB0aGUgY29udGV4dCBieSBhZGRpdGlvbmFsIHF1YWxpZmljYXRpb25zXHJcbiAqICAgICAgICAgICAoTWlkIHRlcm0gZ2VuZXJhdGluZyBBbHRlcm5hdGl2ZXMsIGUuZy5cclxuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHVuaXQgdGVzdD9cclxuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHNvdXJjZSA/XHJcbiAqICAgICAgICAgICApXHJcbiAqICBTaW1wbGUgcnVsZXMgbGlrZSAgSW50ZW50XHJcbiAqXHJcbiAqXHJcbiAqIEBtb2R1bGVcclxuICogQGZpbGUgaW5wdXRGaWx0ZXIudHNcclxuICovXHJcbmltcG9ydCAqIGFzIGRpc3RhbmNlIGZyb20gJy4uL3V0aWxzL2RhbWVyYXVMZXZlbnNodGVpbic7XHJcblxyXG5pbXBvcnQgKiBhcyBkZWJ1ZyBmcm9tICdkZWJ1Zyc7XHJcblxyXG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuLi91dGlscy91dGlscyc7XHJcblxyXG5pbXBvcnQgKiBhcyBJTWF0Y2ggZnJvbSAnLi9pZm1hdGNoJztcclxuXHJcbmltcG9ydCAqIGFzIGJyZWFrZG93biBmcm9tICcuL2JyZWFrZG93bic7XHJcblxyXG5jb25zdCBkZWJ1Z2xvZyA9IGRlYnVnKCdpbnB1dEZpbHRlcicpXHJcblxyXG5pbXBvcnQgKiBhcyBtYXRjaGRhdGEgZnJvbSAnLi9tYXRjaGRhdGEnO1xyXG4gIHZhciBvVW5pdFRlc3RzID0gbWF0Y2hkYXRhLm9Vbml0VGVzdHNcclxuXHJcbiAgLyoqXHJcbiAgICogQHBhcmFtIHNUZXh0IHtzdHJpbmd9IHRoZSB0ZXh0IHRvIG1hdGNoIHRvIE5hdlRhcmdldFJlc29sdXRpb25cclxuICAgKiBAcGFyYW0gc1RleHQyIHtzdHJpbmd9IHRoZSBxdWVyeSB0ZXh0LCBlLmcuIE5hdlRhcmdldFxyXG4gICAqXHJcbiAgICogQHJldHVybiB0aGUgZGlzdGFuY2UsIG5vdGUgdGhhdCBpcyBpcyAqbm90KiBzeW1tZXRyaWMhXHJcbiAgICovXHJcbiAgZnVuY3Rpb24gY2FsY0Rpc3RhbmNlIChzVGV4dDEgOiBzdHJpbmcsIHNUZXh0MiA6IHN0cmluZykgOiBudW1iZXIge1xyXG4gICAgLy8gY29uc29sZS5sb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxyXG4gICAgdmFyIGEwID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnN1YnN0cmluZygwLCBzVGV4dDIubGVuZ3RoKSwgc1RleHQyKVxyXG4gICAgdmFyIGEgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEudG9Mb3dlckNhc2UoKSwgc1RleHQyKVxyXG4gICAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGFcclxuICB9XHJcblxyXG5pbXBvcnQgKiBhcyBJRk1hdGNoIGZyb20gJy4uL21hdGNoL2lmbWF0Y2gnO1xyXG5cclxudHlwZSBJUnVsZSA9IElGTWF0Y2guSVJ1bGVcclxuXHJcblxyXG5pbnRlcmZhY2UgSU1hdGNoT3B0aW9ucyB7XHJcbiAgbWF0Y2hvdGhlcnM/IDogYm9vbGVhbixcclxuICBhdWdtZW50PzogYm9vbGVhbixcclxuICBvdmVycmlkZT8gOiBib29sZWFuXHJcbn1cclxuXHJcbmludGVyZmFjZSBJTWF0Y2hDb3VudCB7XHJcbiAgZXF1YWwgOiBudW1iZXJcclxuICBkaWZmZXJlbnQgOiBudW1iZXJcclxuICBzcHVyaW91c1IgOiBudW1iZXJcclxuICBzcHVyaW91c0wgOiBudW1iZXJcclxufVxyXG5cclxudHlwZSBFbnVtUnVsZVR5cGUgPSBJRk1hdGNoLkVudW1SdWxlVHlwZVxyXG5cclxuXHJcbmZ1bmN0aW9uIG5vblByaXZhdGVLZXlzKG9BKSB7XHJcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG9BKS5maWx0ZXIoIGtleSA9PiB7XHJcbiAgICByZXR1cm4ga2V5WzBdICE9PSAnXyc7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjb3VudEFpbkIgKG9BLCBvQiwgZm5Db21wYXJlLCBhS2V5SWdub3JlPykgOiBudW1iZXJ7XHJcbiAgIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gIGFLZXlJZ25vcmUgOlxyXG4gICAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6ICBbXTtcclxuICAgZm5Db21wYXJlID0gZm5Db21wYXJlIHx8IGZ1bmN0aW9uKCkgeyByZXR1cm4gdHJ1ZTsgfVxyXG4gICByZXR1cm4gbm9uUHJpdmF0ZUtleXMob0EpLmZpbHRlciggZnVuY3Rpb24oa2V5KSB7XHJcbiAgICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcclxuICAgIH0pLlxyXG4gICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xyXG4gICAgICAgIHByZXYgPSBwcmV2ICsgKGZuQ29tcGFyZShvQVtrZXldLG9CW2tleV0sIGtleSkgPyAxIDogMClcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldlxyXG4gICAgfSwgMClcclxuICB9XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc3B1cmlvdXNBbm90SW5CKG9BLG9CLCBhS2V5SWdub3JlPyApIHtcclxuICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/ICBhS2V5SWdub3JlIDpcclxuICAgICAgdHlwZW9mIGFLZXlJZ25vcmUgPT09IFwic3RyaW5nXCIgPyBbYUtleUlnbm9yZV0gOiAgW107XHJcbiAgIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKCBmdW5jdGlvbihrZXkpIHtcclxuICAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xyXG4gICAgfSkuXHJcbiAgICByZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xyXG4gICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xyXG4gICAgICAgIHByZXYgPSBwcmV2ICsgMVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBwcmV2XHJcbiAgICB9LCAwKVxyXG59XHJcblxyXG5mdW5jdGlvbiBsb3dlckNhc2Uobykge1xyXG4gIGlmICh0eXBlb2YgbyA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgcmV0dXJuIG8udG9Mb3dlckNhc2UoKVxyXG4gIH1cclxuICByZXR1cm4gb1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY29tcGFyZUNvbnRleHQob0EgLCBvQiwgYUtleUlnbm9yZT8pIHtcclxuICB2YXIgZXF1YWwgPSBjb3VudEFpbkIob0Esb0IsIGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpID09PSBsb3dlckNhc2UoYik7fSwgYUtleUlnbm9yZSk7XHJcbiAgdmFyIGRpZmZlcmVudCA9IGNvdW50QWluQihvQSxvQiwgZnVuY3Rpb24oYSxiKSB7IHJldHVybiBsb3dlckNhc2UoYSkgIT09IGxvd2VyQ2FzZShiKTt9LCBhS2V5SWdub3JlKTtcclxuICB2YXIgc3B1cmlvdXNMID0gc3B1cmlvdXNBbm90SW5CKG9BLG9CLCBhS2V5SWdub3JlKVxyXG4gIHZhciBzcHVyaW91c1IgPSBzcHVyaW91c0Fub3RJbkIob0Isb0EsIGFLZXlJZ25vcmUpXHJcbiAgcmV0dXJuIHtcclxuICAgIGVxdWFsIDogZXF1YWwsXHJcbiAgICBkaWZmZXJlbnQ6IGRpZmZlcmVudCxcclxuICAgIHNwdXJpb3VzTDogc3B1cmlvdXNMLFxyXG4gICAgc3B1cmlvdXNSOiBzcHVyaW91c1JcclxuICB9XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVN0cmluZyhzdHJpbmcgOiBzdHJpbmcsIGV4YWN0IDogYm9vbGVhbiwgIG9SdWxlcyA6IEFycmF5PElNYXRjaC5tUnVsZT4pIDogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IHtcclxuICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXHJcbiAgdmFyIHJlcyA6IEFycmF5PElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+ID0gW11cclxuICBvUnVsZXMuZm9yRWFjaChmdW5jdGlvbihvUnVsZSkge1xyXG4gICAgc3dpdGNoKG9SdWxlLnR5cGUpIHtcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5XT1JEIDpcclxuICAgICAgICAgIGlmICggZXhhY3QgJiYgb1J1bGUud29yZCA9PT0gc3RyaW5nKSB7XHJcbiAgICAgICAgICAgIHJlcy5wdXNoKCB7XHJcbiAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZyA6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXHJcbiAgICAgICAgICAgICAgY2F0ZWdvcnkgOiBvUnVsZS5jYXRlZ29yeVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKCFleGFjdCkge1xyXG4gICAgICAgICAgICB2YXIgbGV2ZW5tYXRjaCA9IGNhbGNEaXN0YW5jZShvUnVsZS53b3JkLHN0cmluZylcclxuICAgICAgICAgICAgaWYgKGxldmVubWF0Y2ggPCAxNTApIHtcclxuICAgICAgICAgICAgICByZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcclxuICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmcgOiBvUnVsZS53b3JkLFxyXG4gICAgICAgICAgICAgICAgY2F0ZWdvcnkgOiBvUnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgICAgIGxldmVubWF0Y2ggOiBsZXZlbm1hdGNoXHJcbiAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuUkVHRVhQOiB7XHJcblxyXG4gICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KFwiIGhlcmUgcmVnZXhwXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSx1bmRlZmluZWQsMikpKVxyXG4gICAgICAgIHZhciBtID0gb1J1bGUucmVnZXhwLmV4ZWMoc3RyaW5nKVxyXG4gICAgICAgIGlmKG0pIHtcclxuICAgICAgICAgICAgcmVzLnB1c2goIHtcclxuICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZyA6IChvUnVsZS5tYXRjaEluZGV4ICE9PSB1bmRlZmluZWQgJiYgbVtvUnVsZS5tYXRjaEluZGV4XSkgfHwgc3RyaW5nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeSA6IG9SdWxlLmNhdGVnb3J5XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgICBkZWZhdWx0OlxyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInVua25vd24gdHlwZVwiICsgSlNPTi5zdHJpbmdpZnkgKG9SdWxlLHVuZGVmaW5lZCwgMikpXHJcbiAgICB9XHJcbiAgfSk7XHJcbiAgICByZXR1cm4gcmVzO1xyXG59XHJcbi8qKlxyXG4gKlxyXG4gKiBPcHRpb25zIG1heSBiZSB7XHJcbiAqIG1hdGNob3RoZXJzIDogdHJ1ZSwgID0+IG9ubHkgcnVsZXMgd2hlcmUgYWxsIG90aGVycyBtYXRjaCBhcmUgY29uc2lkZXJlZFxyXG4gKiBhdWdtZW50IDogdHJ1ZSxcclxuICogb3ZlcnJpZGUgOiB0cnVlIH0gID0+XHJcbiAqXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hXb3JkKG9SdWxlIDogSVJ1bGUsIGNvbnRleHQgOiBJRk1hdGNoLmNvbnRleHQsIG9wdGlvbnMgPyA6IElNYXRjaE9wdGlvbnMpIHtcclxuICBpZiAoY29udGV4dFtvUnVsZS5rZXldID09PSB1bmRlZmluZWQpIHtcclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgfVxyXG4gIHZhciBzMSA9IGNvbnRleHRbb1J1bGUua2V5XS50b0xvd2VyQ2FzZSgpXHJcbiAgdmFyIHMyID0gb1J1bGUud29yZC50b0xvd2VyQ2FzZSgpO1xyXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XHJcbiAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCxvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpXHJcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XHJcbiAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKXtcclxuICAgIHJldHVybiB1bmRlZmluZWRcclxuICB9XHJcbiAgdmFyIGMgOiBudW1iZXIgPSBjYWxjRGlzdGFuY2UoczIsIHMxKTtcclxuICAgZGVidWdsb2coXCIgczEgPD4gczIgXCIgKyBzMSArIFwiPD5cIiArIHMyICsgXCIgID0+OiBcIiArIGMpO1xyXG4gIGlmKGMgPCAxNTAgKSB7XHJcbiAgICB2YXIgcmVzID0gT2JqZWN0LmFzc2lnbih7fSwgb1J1bGUuZm9sbG93cykgYXMgYW55O1xyXG4gICAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIGNvbnRleHQpO1xyXG4gICAgaWYgKG9wdGlvbnMub3ZlcnJpZGUpIHtcclxuICAgICAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xyXG4gICAgfVxyXG4gICAgLy8gZm9yY2Uga2V5IHByb3BlcnR5XHJcbiAgICAvLyBjb25zb2xlLmxvZygnIG9iamVjdGNhdGVnb3J5JywgcmVzWydzeXN0ZW1PYmplY3RDYXRlZ29yeSddKTtcclxuICAgIHJlc1tvUnVsZS5rZXldID0gb1J1bGUuZm9sbG93c1tvUnVsZS5rZXldIHx8IHJlc1tvUnVsZS5rZXldO1xyXG4gICAgcmVzLl93ZWlnaHQgPSBPYmplY3QuYXNzaWduKHt9LCByZXMuX3dlaWdodCk7XHJcbiAgICByZXMuX3dlaWdodFtvUnVsZS5rZXldID0gYztcclxuICAgIE9iamVjdC5mcmVlemUocmVzKTtcclxuICAgIGRlYnVnbG9nKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLHVuZGVmaW5lZCwyKSk7XHJcbiAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuICByZXR1cm4gdW5kZWZpbmVkO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEFyZ3NNYXAobWF0Y2ggOiBBcnJheTxzdHJpbmc+ICwgYXJnc01hcCA6IHsgW2tleSA6IG51bWJlcl0gOiBzdHJpbmd9KSA6IElGTWF0Y2guY29udGV4dCB7XHJcbiAgdmFyIHJlcyA9IHt9IGFzIElGTWF0Y2guY29udGV4dDtcclxuICBpZiAoIWFyZ3NNYXApIHtcclxuICAgIHJldHVybiByZXM7XHJcbiAgfVxyXG4gIE9iamVjdC5rZXlzKGFyZ3NNYXApLmZvckVhY2goZnVuY3Rpb24oaUtleSkge1xyXG4gICAgICB2YXIgdmFsdWUgPSBtYXRjaFtpS2V5XVxyXG4gICAgICB2YXIga2V5ID0gYXJnc01hcFtpS2V5XTtcclxuICAgICAgaWYgKCh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpICYmIHZhbHVlLmxlbmd0aCA+IDApIHtcclxuICAgICAgICByZXNba2V5XSA9IHZhbHVlXHJcbiAgICAgIH1cclxuICAgIH1cclxuICApO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVTdHJpbmcoc1N0cmluZyA6IHN0cmluZywgYVJ1bGVzIDogQXJyYXk8SU1hdGNoLm1SdWxlPiApIHtcclxuXHJcbiAgdmFyIGNudCA9IDA7XHJcbiAgdmFyIGZhYyA9IDE7XHJcbiAgdmFyIHUgPSBicmVha2Rvd24uYnJlYWtkb3duU3RyaW5nKHNTdHJpbmcpO1xyXG4gIGRlYnVnbG9nKFwiaGVyZSBicmVha2Rvd25cIiArIEpTT04uc3RyaW5naWZ5KHUpKTtcclxuICB2YXIgd29yZHMgPSB7fSBhcyAgeyBba2V5OiBzdHJpbmddOiAgQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+fTtcclxuICB2YXIgcmVzID0gdS5tYXAoZnVuY3Rpb24oYUFycikge1xyXG4gICAgcmV0dXJuIGFBcnIubWFwKGZ1bmN0aW9uIChzV29yZEdyb3VwIDogc3RyaW5nKSB7XHJcbiAgICAgIHZhciBzZWVuSXQgPSB3b3Jkc1tzV29yZEdyb3VwXTtcclxuICAgICAgaWYgKHNlZW5JdCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgc2Vlbkl0ID0gIGNhdGVnb3JpemVTdHJpbmcoc1dvcmRHcm91cCwgdHJ1ZSwgYVJ1bGVzKTtcclxuICAgICAgICB3b3Jkc1tzV29yZEdyb3VwXSA9IHNlZW5JdDtcclxuICAgICAgfVxyXG4gICAgICAgIGNudCA9IGNudCArIHNlZW5JdC5sZW5ndGg7XHJcbiAgICAgICAgZmFjID0gZmFjICogc2Vlbkl0Lmxlbmd0aDtcclxuICAgICAgaWYoIXNlZW5JdCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGluZyBhdCBsZWFzdCBvbmUgbWF0Y2ggZm9yIFwiICsgc1dvcmRHcm91cClcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gc2Vlbkl0O1xyXG4gICAgfSk7XHJcbiAgfSlcclxuICBkZWJ1Z2xvZyhcIiBzZW50ZW5jZXMgXCIgKyB1Lmxlbmd0aCArIFwiIG1hdGNoZXMgXCIgKyBjbnQgKyBcIiBmYWM6IFwiICsgZmFjKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG4vKlxyXG5bIFthLGJdLCBbYyxkXV1cclxuXHJcbjAwIGFcclxuMDEgYlxyXG4xMCBjXHJcbjExIGRcclxuMTIgY1xyXG4qL1xyXG5cclxuXHJcbmNvbnN0IGNsb25lID0gdXRpbHMuY2xvbmVEZWVwO1xyXG5cclxuLy8gd2UgY2FuIHJlcGxpY2F0ZSB0aGUgdGFpbCBvciB0aGUgaGVhZCxcclxuLy8gd2UgcmVwbGljYXRlIHRoZSB0YWlsIGFzIGl0IGlzIHNtYWxsZXIuXHJcblxyXG4vLyBbYSxiLGMgXVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGV4cGFuZE1hdGNoQXJyKGRlZXAgOiBBcnJheTxBcnJheTxhbnk+PikgOiBBcnJheTxBcnJheTxhbnk+PiB7XHJcbiAgdmFyIGEgPSBbXTtcclxuICB2YXIgbGluZSA9IFtdO1xyXG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlZXApKTtcclxuICBkZWVwLmZvckVhY2goZnVuY3Rpb24odUJyZWFrRG93bkxpbmUsIGlJbmRleCA6IG51bWJlcikge1xyXG4gICAgbGluZVtpSW5kZXhdID0gW107XHJcbiAgICB1QnJlYWtEb3duTGluZS5mb3JFYWNoKGZ1bmN0aW9uKGFXb3JkR3JvdXAgLCB3Z0luZGV4OiBudW1iZXIpIHtcclxuICAgICAgbGluZVtpSW5kZXhdW3dnSW5kZXhdID0gW107XHJcbiAgICAgIGFXb3JkR3JvdXAuZm9yRWFjaChmdW5jdGlvbiAob1dvcmRWYXJpYW50LCBpV1ZJbmRleCA6IG51bWJlcikge1xyXG4gICAgICAgIGxpbmVbaUluZGV4XVt3Z0luZGV4XVtpV1ZJbmRleF0gPSBvV29yZFZhcmlhbnQ7XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfSlcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShsaW5lKSk7XHJcbiAgdmFyIHJlcyA9IFtdO1xyXG4gIHZhciBudmVjcyA9IFtdO1xyXG4gIGZvcih2YXIgaSA9IDA7IGkgPCBsaW5lLmxlbmd0aDsgKytpKSB7XHJcbiAgICB2YXIgdmVjcyA9IFtbXV07XHJcbiAgICB2YXIgbnZlY3MgPVtdO1xyXG4gICAgdmFyIHJ2ZWMgPSBbXTtcclxuICAgIGZvcih2YXIgayA9IDA7IGsgPCBsaW5lW2ldLmxlbmd0aDsgKytrKSB7IC8vIHdvcmRncm91cCBrXHJcbiAgICAgIC8vdmVjcyBpcyB0aGUgdmVjdG9yIG9mIGFsbCBzbyBmYXIgc2VlbiB2YXJpYW50cyB1cCB0byBrIHdncy5cclxuICAgICAgdmFyIG5leHRCYXNlID0gW107XHJcbiAgICAgIGZvcih2YXIgbCA9IDA7IGwgPCBsaW5lW2ldW2tdLmxlbmd0aDsgKytsICkgeyAvLyBmb3IgZWFjaCB2YXJpYW50XHJcbiAgICAgICAgZGVidWdsb2coXCJ2ZWNzIG5vd1wiICsgSlNPTi5zdHJpbmdpZnkodmVjcykpO1xyXG4gICAgICAgIG52ZWNzID0gW107IC8vdmVjcy5zbGljZSgpOyAvLyBjb3B5IHRoZSB2ZWNbaV0gYmFzZSB2ZWN0b3I7XHJcbiAgICAgICAgZGVidWdsb2coXCJ2ZWNzIGNvcGllZCBub3dcIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSk7XHJcbiAgICAgICAgZm9yKHZhciB1ID0gMDsgdSA8IHZlY3MubGVuZ3RoOyArK3UpIHtcclxuICAgICAgICAgICBudmVjc1t1XSA9IHZlY3NbdV0uc2xpY2UoKTsgLy9cclxuICAgICAgICAgICBkZWJ1Z2xvZyhcImNvcGllZCB2ZWNzW1wiKyB1K1wiXVwiICsgSlNPTi5zdHJpbmdpZnkodmVjc1t1XSkpO1xyXG4gICAgICAgICAgIG52ZWNzW3VdLnB1c2goXHJcbiAgICAgICAgICAgICBjbG9uZShsaW5lW2ldW2tdW2xdKSk7IC8vIHB1c2ggdGhlIGx0aCB2YXJpYW50XHJcbiAgICAgICAgICAgZGVidWdsb2coXCJub3cgbnZlY3MgXCIgKyBudmVjcy5sZW5ndGggKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGRlYnVnbG9nKFwiIGF0ICAgICBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiBuZXh0YmFzZSA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpXHJcbiAgICAgICAgZGVidWdsb2coXCIgYXBwZW5kIFwiICsgayArIFwiOlwiICsgbCArIFwiIG52ZWNzICAgID5cIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSlcclxuICAgICAgICBuZXh0QmFzZSA9IG5leHRCYXNlLmNvbmNhdChudmVjcyk7XHJcbiAgICAgICAgZGVidWdsb2coXCIgIHJlc3VsdCBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiBudmVjcyAgICA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpXHJcbiAgICAgIH0gLy9jb25zdHJ1XHJcbiAgICAgIGRlYnVnbG9nKFwibm93IGF0IFwiICsgayArIFwiOlwiICsgbCArIFwiID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcclxuICAgICAgdmVjcyA9IG5leHRCYXNlO1xyXG4gICAgfVxyXG4gICAgZGVidWdsb2coXCJBUFBFTkRJTkcgVE8gUkVTXCIgKyBpICsgXCI6XCIgKyBsICsgXCIgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxyXG4gICAgcmVzID0gcmVzLmNvbmNhdCh2ZWNzKTtcclxuICB9XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuLyoqXHJcbiAqIFdlaWdodCBmYWN0b3IgdG8gdXNlIG9uIHRoZSBhIGdpdmVuIHdvcmQgZGlzdGFuY2VcclxuICogb2YgMCwgMSwgMiwgMyAuLi4uXHJcbiAqL1xyXG5jb25zdCBhRGlzdFdlaWdodCA6IEFycmF5PG51bWJlcj4gID0gWzAsIDMsIDEsICAwLjJdO1xyXG5cclxuLyoqXHJcbiAqIENhbGN1bGF0ZSBhIHdlaWdodCBmYWN0b3IgZm9yIGEgZ2l2ZW4gZGlzdGFuY2UgYW5kXHJcbiAqIGNhdGVnb3J5XHJcbiAqIEBwYXJhbSB7aW50ZWdlcn0gZGlzdCBkaXN0YW5jZSBpbiB3b3Jkc1xyXG4gKiBAcGFyYW0ge3N0cmluZ30gY2F0ZWdvcnkgY2F0ZWdvcnkgdG8gdXNlXHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IGEgZGlzdGFuY2UgZmFjdG9yID49IDFcclxuICogIDEuMCBmb3Igbm8gZWZmZWN0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZGlzdFdlaWdodChkaXN0IDogbnVtYmVyLCBjYXRlZ29yeSA6IHN0cmluZykgOiBudW1iZXIge1xyXG4gIHZhciBhYnMgPSBNYXRoLmFicyhkaXN0KTtcclxuICByZXR1cm4gMS4wICsgKGFEaXN0V2VpZ2h0W2Fic10gfHwgMCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHaXZlbiBhIHNlbnRlbmNlLCBleHRhY3QgY2F0ZWdvcmllc1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RDYXRlZ29yeU1hcChvU2VudGVuY2UpIDogeyBba2V5IDogc3RyaW5nXSA6IEFycmF5PHsgcG9zIDogbnVtYmVyfT4gfSB7XHJcbiAgdmFyIHJlcyA9IHt9O1xyXG4gIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uKG9Xb3JkLCBpSW5kZXgpIHtcclxuICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gSUZNYXRjaC5DQVRfQ0FURUdPUlkpIHtcclxuICAgICAgcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddID0gcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddIHx8IFtdO1xyXG4gICAgICByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10ucHVzaCh7IHBvcyA6IGlJbmRleCB9KTtcclxuICAgIH1cclxuICB9KTtcclxuICB1dGlscy5kZWVwRnJlZXplKHJlcyk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlaW5Gb3JjZVNlbnRlbmNlKG9TZW50ZW5jZSkge1xyXG4gIHZhciBvQ2F0ZWdvcnlNYXAgPSBleHRyYWN0Q2F0ZWdvcnlNYXAob1NlbnRlbmNlKTtcclxuICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbihvV29yZCwgaUluZGV4KSB7XHJcbiAgICB2YXIgbSA9IG9DYXRlZ29yeU1hcFtvV29yZC5jYXRlZ29yeV0gfHwgW107XHJcbiAgICBtLmZvckVhY2goZnVuY3Rpb24gKG9Qb3NpdGlvbiA6IHsgcG9zIDogbnVtYmVyIH0pIHtcclxuICAgICAgb1dvcmQucmVpbmZvcmNlID0gb1dvcmQucmVpbmZvcmNlIHx8IDE7XHJcbiAgICAgIG9Xb3JkLnJlaW5mb3JjZSAqPSBkaXN0V2VpZ2h0KGlJbmRleCAtIG9Qb3NpdGlvbi5wb3MsIG9Xb3JkLmNhdGVnb3J5KTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG4gIHJldHVybiBvU2VudGVuY2U7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWluRm9yY2UoYUNhdGVnb3J5aXplZEFycmF5KSB7XHJcbiAgYUNhdGVnb3J5aXplZEFycmF5LmZvckVhY2goZnVuY3Rpb24ob1NlbnRlbmNlKSB7XHJcbiAgICByZWluRm9yY2VTZW50ZW5jZShvU2VudGVuY2UpO1xyXG4gIH0pXHJcbiAgcmV0dXJuIGFDYXRlZ29yeWl6ZWRBcnJheTtcclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFJlZ0V4cChvUnVsZSA6IElSdWxlLCBjb250ZXh0IDogSUZNYXRjaC5jb250ZXh0LCBvcHRpb25zID8gOiBJTWF0Y2hPcHRpb25zKSB7XHJcbiAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICB2YXIgc0tleSA9IG9SdWxlLmtleTtcclxuICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKVxyXG4gIHZhciByZWcgPSBvUnVsZS5yZWdleHA7XHJcblxyXG4gIHZhciBtID0gcmVnLmV4ZWMoczEpO1xyXG4gIGRlYnVnbG9nKFwiYXBwbHlpbmcgcmVnZXhwOiBcIiArIHMxICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XHJcbiAgaWYgKCFtKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxyXG4gIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KVxyXG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlbHRhKSk7XHJcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkob3B0aW9ucykpO1xyXG4gIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSl7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkXHJcbiAgfVxyXG4gIHZhciBvRXh0cmFjdGVkQ29udGV4dCA9IGV4dHJhY3RBcmdzTWFwKG0sIG9SdWxlLmFyZ3NNYXAgKTtcclxuICBkZWJ1Z2xvZyhcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUuYXJnc01hcCkpO1xyXG4gIGRlYnVnbG9nKFwibWF0Y2ggXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XHJcblxyXG4gIGRlYnVnbG9nKFwiZXh0cmFjdGVkIGFyZ3MgXCIgKyBKU09OLnN0cmluZ2lmeShvRXh0cmFjdGVkQ29udGV4dCkpO1xyXG4gIHZhciByZXMgPSBPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKSBhcyBhbnk7XHJcbiAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIG9FeHRyYWN0ZWRDb250ZXh0KTtcclxuICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgY29udGV4dCk7XHJcbiAgaWYgKG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldICE9PSB1bmRlZmluZWQpIHtcclxuICAgIHJlc1tzS2V5XSA9IG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldO1xyXG4gIH1cclxuICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xyXG4gICAgIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBvUnVsZS5mb2xsb3dzKTtcclxuICAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpXHJcbiAgfVxyXG4gIE9iamVjdC5mcmVlemUocmVzKTtcclxuICBkZWJ1Z2xvZygnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcyx1bmRlZmluZWQsMikpO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzb3J0QnlXZWlnaHQoc0tleSA6IHN0cmluZywgb0NvbnRleHRBIDogSUZNYXRjaC5jb250ZXh0LCBvQ29udGV4dEIgOiBJRk1hdGNoLmNvbnRleHQpICA6IG51bWJlcntcclxuICBkZWJ1Z2xvZygnc29ydGluZzogJyArIHNLZXkgKyAnaW52b2tlZCB3aXRoXFxuIDE6JyArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QSx1bmRlZmluZWQsMikrXHJcbiAgIFwiIHZzIFxcbiAyOlwiICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHRCLHVuZGVmaW5lZCwyKSk7XHJcbiAgdmFyIHJhbmtpbmdBIDogbnVtYmVyID0gIHBhcnNlRmxvYXQob0NvbnRleHRBW1wiX3JhbmtpbmdcIl0gfHwgXCIxXCIpO1xyXG4gIHZhciByYW5raW5nQiA6IG51bWJlciAgPSBwYXJzZUZsb2F0KG9Db250ZXh0QltcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcclxuICBpZiAocmFua2luZ0EgIT09IHJhbmtpbmdCKSB7XHJcbiAgICBkZWJ1Z2xvZyhcIiByYW5raW4gZGVsdGFcIiArIDEwMCoocmFua2luZ0IgLSByYW5raW5nQSkpO1xyXG4gICAgcmV0dXJuIDEwMCoocmFua2luZ0IgLSByYW5raW5nQSlcclxuICB9XHJcblxyXG4gIHZhciB3ZWlnaHRBID0gb0NvbnRleHRBW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdW3NLZXldICB8fCAwO1xyXG4gIHZhciB3ZWlnaHRCID0gb0NvbnRleHRCW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdW3NLZXldICB8fCAwO1xyXG4gIHJldHVybiArKHdlaWdodEEgLSB3ZWlnaHRCKTtcclxufVxyXG5cclxuXHJcbi8vIFdvcmQsIFN5bm9ueW0sIFJlZ2V4cCAvIEV4dHJhY3Rpb25SdWxlXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXVnbWVudENvbnRleHQxKCBjb250ZXh0IDogSUZNYXRjaC5jb250ZXh0LCBvUnVsZXMgOiBBcnJheTxJUnVsZT4sIG9wdGlvbnMgOiBJTWF0Y2hPcHRpb25zKSA6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIHZhciBzS2V5ID0gb1J1bGVzWzBdLmtleTtcclxuICAvLyBjaGVjayB0aGF0IHJ1bGVcclxuICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgLy8gY2hlY2sgY29uc2lzdGVuY3lcclxuICAgIG9SdWxlcy5ldmVyeShmdW5jdGlvbiAoaVJ1bGUpIHtcclxuICAgICAgaWYgKGlSdWxlLmtleSAhPT0gc0tleSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkluaG9tb2dlbm91cyBrZXlzIGluIHJ1bGVzLCBleHBlY3RlZCBcIiArIHNLZXkgKyBcIiB3YXMgXCIgKyBKU09OLnN0cmluZ2lmeShpUnVsZSkpO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvLyBsb29rIGZvciBydWxlcyB3aGljaCBtYXRjaFxyXG4gIHZhciByZXMgPSBvUnVsZXMubWFwKGZ1bmN0aW9uKG9SdWxlKSB7XHJcbiAgICAvLyBpcyB0aGlzIHJ1bGUgYXBwbGljYWJsZVxyXG4gICAgc3dpdGNoKG9SdWxlLnR5cGUpIHtcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5XT1JEOlxyXG4gICAgICAgIHJldHVybiBtYXRjaFdvcmQob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpXHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuUkVHRVhQOlxyXG4gICAgICAgIHJldHVybiBtYXRjaFJlZ0V4cChvUnVsZSwgY29udGV4dCwgb3B0aW9ucyk7XHJcbiAgIC8vICAgY2FzZSBcIkV4dHJhY3Rpb25cIjpcclxuICAgLy8gICAgIHJldHVybiBtYXRjaEV4dHJhY3Rpb24ob1J1bGUsY29udGV4dCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkXHJcbiAgfSkuZmlsdGVyKGZ1bmN0aW9uKG9yZXMpIHtcclxuICAgIHJldHVybiAhIW9yZXNcclxuICB9KS5zb3J0KFxyXG4gICAgc29ydEJ5V2VpZ2h0LmJpbmQodGhpcywgc0tleSlcclxuICApO1xyXG4gIHJldHVybiByZXM7XHJcbiAgLy8gT2JqZWN0LmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XHJcbiAgLy8gfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhdWdtZW50Q29udGV4dCggY29udGV4dCA6IElGTWF0Y2guY29udGV4dCwgYVJ1bGVzIDogQXJyYXk8SVJ1bGU+KSA6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG5cclxudmFyIG9wdGlvbnMxIDogSU1hdGNoT3B0aW9ucyA9IHtcclxuICAgIG1hdGNob3RoZXJzIDogdHJ1ZSxcclxuICAgIG92ZXJyaWRlOiBmYWxzZVxyXG4gIH0gYXMgSU1hdGNoT3B0aW9ucztcclxuXHJcbiAgdmFyIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCxhUnVsZXMsb3B0aW9uczEpXHJcblxyXG4gIGlmIChhUmVzLmxlbmd0aCA9PT0gMCkgIHtcclxuICAgIHZhciBvcHRpb25zMiA6IElNYXRjaE9wdGlvbnMgPSB7XHJcbiAgICAgICAgbWF0Y2hvdGhlcnMgOiBmYWxzZSxcclxuICAgICAgICBvdmVycmlkZTogdHJ1ZVxyXG4gICAgfSBhcyBJTWF0Y2hPcHRpb25zO1xyXG4gICAgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMyKTtcclxuICB9XHJcbiAgcmV0dXJuIGFSZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBpbnNlcnRPcmRlcmVkKHJlc3VsdCA6IEFycmF5PElGTWF0Y2guY29udGV4dD4sIGlJbnNlcnRlZE1lbWJlciA6IElGTWF0Y2guY29udGV4dCwgbGltaXQgOiBudW1iZXIpIDogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgLy8gVE9ETzogdXNlIHNvbWUgd2VpZ2h0XHJcbiAgaWYgKHJlc3VsdC5sZW5ndGggPCBsaW1pdCkge1xyXG4gICAgcmVzdWx0LnB1c2goaUluc2VydGVkTWVtYmVyKVxyXG4gIH1cclxuICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHRha2VUb3BOKGFyciA6IEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+KTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgdmFyIHUgPSBhcnIuZmlsdGVyKGZ1bmN0aW9uKGlubmVyQXJyKSB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwfSlcclxuXHJcbiAgdmFyIHJlcyA9W107XHJcbiAgLy8gc2hpZnQgb3V0IHRoZSB0b3Agb25lc1xyXG4gIHUgPSB1Lm1hcChmdW5jdGlvbihpQXJyKSB7XHJcbiAgICB2YXIgdG9wID0gaUFyci5zaGlmdCgpO1xyXG4gICAgcmVzID0gaW5zZXJ0T3JkZXJlZChyZXMsdG9wLDUpXHJcbiAgICByZXR1cm4gaUFyclxyXG4gIH0pLmZpbHRlcihmdW5jdGlvbihpbm5lckFycjogQXJyYXk8SUZNYXRjaC5jb250ZXh0PikgOiBib29sZWFuIHsgcmV0dXJuIGlubmVyQXJyLmxlbmd0aCA+IDB9KTtcclxuICAvLyBhcyBBcnJheTxBcnJheTxJRk1hdGNoLmNvbnRleHQ+PlxyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmltcG9ydCAqIGFzIGlucHV0RmlsdGVyUnVsZXMgZnJvbSAnLi9pbnB1dEZpbHRlclJ1bGVzJztcclxuXHJcbnZhciBybTtcclxuXHJcbmZ1bmN0aW9uIGdldFJNT25jZSgpIHtcclxuICBpZiAoIXJtKSB7XHJcbiAgICBybSA9IGlucHV0RmlsdGVyUnVsZXMuZ2V0UnVsZU1hcCgpXHJcbiAgfVxyXG4gIHJldHVybiBybTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UnVsZXMoY29udGV4dCA6IElGTWF0Y2guY29udGV4dCkgOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICB2YXIgYmVzdE4gOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+ID0gW2NvbnRleHRdO1xyXG4gIGlucHV0RmlsdGVyUnVsZXMub0tleU9yZGVyLmZvckVhY2goZnVuY3Rpb24gKHNLZXkgOiBzdHJpbmcpIHtcclxuICAgICB2YXIgYmVzdE5leHQ6IEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+ID0gW107XHJcbiAgICAgYmVzdE4uZm9yRWFjaChmdW5jdGlvbihvQ29udGV4dCA6IElGTWF0Y2guY29udGV4dCkge1xyXG4gICAgICAgaWYgKG9Db250ZXh0W3NLZXldKSB7XHJcbiAgICAgICAgICBkZWJ1Z2xvZygnKiogYXBwbHlpbmcgcnVsZXMgZm9yICcgKyBzS2V5KVxyXG4gICAgICAgICAgdmFyIHJlcyA9IGF1Z21lbnRDb250ZXh0KG9Db250ZXh0LCBnZXRSTU9uY2UoKVtzS2V5XSB8fCBbXSlcclxuICAgICAgICAgIGRlYnVnbG9nKCcqKiByZXN1bHQgZm9yICcgKyBzS2V5ICsgJyA9ICcgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpXHJcbiAgICAgICAgICBiZXN0TmV4dC5wdXNoKHJlcyB8fCBbXSlcclxuICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgIC8vIHJ1bGUgbm90IHJlbGV2YW50XHJcbiAgICAgICAgIGJlc3ROZXh0LnB1c2goW29Db250ZXh0XSk7XHJcbiAgICAgICB9XHJcbiAgICB9KVxyXG4gICAgYmVzdE4gPSB0YWtlVG9wTihiZXN0TmV4dCk7XHJcbiAgfSk7XHJcbiAgcmV0dXJuIGJlc3ROXHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlSdWxlc1BpY2tGaXJzdChjb250ZXh0IDogSUZNYXRjaC5jb250ZXh0KSA6IElGTWF0Y2guY29udGV4dCB7XHJcbiAgdmFyIHIgPSBhcHBseVJ1bGVzKGNvbnRleHQpO1xyXG4gIHJldHVybiByICYmIHJbMF07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZWNpZGUgd2hldGhlciB0byByZXF1ZXJ5IGZvciBhIGNvbnRldFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGRlY2lkZU9uUmVRdWVyeSggY29udGV4dCA6IElGTWF0Y2guY29udGV4dCkgOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICByZXR1cm4gW11cclxufVxyXG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vbGliL25vZGUtNC5kLnRzXCIgLz5cblwidXNlIHN0cmljdFwiO1xuLyoqXG4gKiB0aGUgaW5wdXQgZmlsdGVyIHN0YWdlIHByZXByb2Nlc3NlcyBhIGN1cnJlbnQgY29udGV4dFxuICpcbiAqIEl0IGEpIGNvbWJpbmVzIG11bHRpLXNlZ21lbnQgYXJndW1lbnRzIGludG8gb25lIGNvbnRleHQgbWVtYmVyc1xuICogSXQgYikgYXR0ZW1wdHMgdG8gYXVnbWVudCB0aGUgY29udGV4dCBieSBhZGRpdGlvbmFsIHF1YWxpZmljYXRpb25zXG4gKiAgICAgICAgICAgKE1pZCB0ZXJtIGdlbmVyYXRpbmcgQWx0ZXJuYXRpdmVzLCBlLmcuXG4gKiAgICAgICAgICAgICAgICAgQ2xpZW50U2lkZVRhcmdldFJlc29sdXRpb24gLT4gdW5pdCB0ZXN0P1xuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHNvdXJjZSA/XG4gKiAgICAgICAgICAgKVxuICogIFNpbXBsZSBydWxlcyBsaWtlICBJbnRlbnRcbiAqXG4gKlxuICogQG1vZHVsZVxuICogQGZpbGUgaW5wdXRGaWx0ZXIudHNcbiAqL1xuY29uc3QgZGlzdGFuY2UgPSByZXF1aXJlKCcuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4nKTtcbmNvbnN0IGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKTtcbmNvbnN0IHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMvdXRpbHMnKTtcbmNvbnN0IGJyZWFrZG93biA9IHJlcXVpcmUoJy4vYnJlYWtkb3duJyk7XG5jb25zdCBkZWJ1Z2xvZyA9IGRlYnVnKCdpbnB1dEZpbHRlcicpO1xuY29uc3QgbWF0Y2hkYXRhID0gcmVxdWlyZSgnLi9tYXRjaGRhdGEnKTtcbnZhciBvVW5pdFRlc3RzID0gbWF0Y2hkYXRhLm9Vbml0VGVzdHM7XG4vKipcbiAqIEBwYXJhbSBzVGV4dCB7c3RyaW5nfSB0aGUgdGV4dCB0byBtYXRjaCB0byBOYXZUYXJnZXRSZXNvbHV0aW9uXG4gKiBAcGFyYW0gc1RleHQyIHtzdHJpbmd9IHRoZSBxdWVyeSB0ZXh0LCBlLmcuIE5hdlRhcmdldFxuICpcbiAqIEByZXR1cm4gdGhlIGRpc3RhbmNlLCBub3RlIHRoYXQgaXMgaXMgKm5vdCogc3ltbWV0cmljIVxuICovXG5mdW5jdGlvbiBjYWxjRGlzdGFuY2Uoc1RleHQxLCBzVGV4dDIpIHtcbiAgICAvLyBjb25zb2xlLmxvZyhcImxlbmd0aDJcIiArIHNUZXh0MSArIFwiIC0gXCIgKyBzVGV4dDIpXG4gICAgdmFyIGEwID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnN1YnN0cmluZygwLCBzVGV4dDIubGVuZ3RoKSwgc1RleHQyKTtcbiAgICB2YXIgYSA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS50b0xvd2VyQ2FzZSgpLCBzVGV4dDIpO1xuICAgIHJldHVybiBhMCAqIDUwMCAvIHNUZXh0Mi5sZW5ndGggKyBhO1xufVxuY29uc3QgSUZNYXRjaCA9IHJlcXVpcmUoJy4uL21hdGNoL2lmbWF0Y2gnKTtcbmZ1bmN0aW9uIG5vblByaXZhdGVLZXlzKG9BKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKG9BKS5maWx0ZXIoa2V5ID0+IHtcbiAgICAgICAgcmV0dXJuIGtleVswXSAhPT0gJ18nO1xuICAgIH0pO1xufVxuZnVuY3Rpb24gY291bnRBaW5CKG9BLCBvQiwgZm5Db21wYXJlLCBhS2V5SWdub3JlKSB7XG4gICAgYUtleUlnbm9yZSA9IEFycmF5LmlzQXJyYXkoYUtleUlnbm9yZSkgPyBhS2V5SWdub3JlIDpcbiAgICAgICAgdHlwZW9mIGFLZXlJZ25vcmUgPT09IFwic3RyaW5nXCIgPyBbYUtleUlnbm9yZV0gOiBbXTtcbiAgICBmbkNvbXBhcmUgPSBmbkNvbXBhcmUgfHwgZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICByZXR1cm4gbm9uUHJpdmF0ZUtleXMob0EpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHJldHVybiBhS2V5SWdub3JlLmluZGV4T2Yoa2V5KSA8IDA7XG4gICAgfSkuXG4gICAgICAgIHJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgKGZuQ29tcGFyZShvQVtrZXldLCBvQltrZXldLCBrZXkpID8gMSA6IDApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIDApO1xufVxuZXhwb3J0cy5jb3VudEFpbkIgPSBjb3VudEFpbkI7XG5mdW5jdGlvbiBzcHVyaW91c0Fub3RJbkIob0EsIG9CLCBhS2V5SWdub3JlKSB7XG4gICAgYUtleUlnbm9yZSA9IEFycmF5LmlzQXJyYXkoYUtleUlnbm9yZSkgPyBhS2V5SWdub3JlIDpcbiAgICAgICAgdHlwZW9mIGFLZXlJZ25vcmUgPT09IFwic3RyaW5nXCIgPyBbYUtleUlnbm9yZV0gOiBbXTtcbiAgICByZXR1cm4gbm9uUHJpdmF0ZUtleXMob0EpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHJldHVybiBhS2V5SWdub3JlLmluZGV4T2Yoa2V5KSA8IDA7XG4gICAgfSkuXG4gICAgICAgIHJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XG4gICAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9CLCBrZXkpKSB7XG4gICAgICAgICAgICBwcmV2ID0gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG59XG5leHBvcnRzLnNwdXJpb3VzQW5vdEluQiA9IHNwdXJpb3VzQW5vdEluQjtcbmZ1bmN0aW9uIGxvd2VyQ2FzZShvKSB7XG4gICAgaWYgKHR5cGVvZiBvID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIHJldHVybiBvLnRvTG93ZXJDYXNlKCk7XG4gICAgfVxuICAgIHJldHVybiBvO1xufVxuZnVuY3Rpb24gY29tcGFyZUNvbnRleHQob0EsIG9CLCBhS2V5SWdub3JlKSB7XG4gICAgdmFyIGVxdWFsID0gY291bnRBaW5CKG9BLCBvQiwgZnVuY3Rpb24gKGEsIGIpIHsgcmV0dXJuIGxvd2VyQ2FzZShhKSA9PT0gbG93ZXJDYXNlKGIpOyB9LCBhS2V5SWdub3JlKTtcbiAgICB2YXIgZGlmZmVyZW50ID0gY291bnRBaW5CKG9BLCBvQiwgZnVuY3Rpb24gKGEsIGIpIHsgcmV0dXJuIGxvd2VyQ2FzZShhKSAhPT0gbG93ZXJDYXNlKGIpOyB9LCBhS2V5SWdub3JlKTtcbiAgICB2YXIgc3B1cmlvdXNMID0gc3B1cmlvdXNBbm90SW5CKG9BLCBvQiwgYUtleUlnbm9yZSk7XG4gICAgdmFyIHNwdXJpb3VzUiA9IHNwdXJpb3VzQW5vdEluQihvQiwgb0EsIGFLZXlJZ25vcmUpO1xuICAgIHJldHVybiB7XG4gICAgICAgIGVxdWFsOiBlcXVhbCxcbiAgICAgICAgZGlmZmVyZW50OiBkaWZmZXJlbnQsXG4gICAgICAgIHNwdXJpb3VzTDogc3B1cmlvdXNMLFxuICAgICAgICBzcHVyaW91c1I6IHNwdXJpb3VzUlxuICAgIH07XG59XG5leHBvcnRzLmNvbXBhcmVDb250ZXh0ID0gY29tcGFyZUNvbnRleHQ7XG5mdW5jdGlvbiBjYXRlZ29yaXplU3RyaW5nKHN0cmluZywgZXhhY3QsIG9SdWxlcykge1xuICAgIC8vIHNpbXBseSBhcHBseSBhbGwgcnVsZXNcbiAgICB2YXIgcmVzID0gW107XG4gICAgb1J1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgIHN3aXRjaCAob1J1bGUudHlwZSkge1xuICAgICAgICAgICAgY2FzZSAwIC8qIFdPUkQgKi86XG4gICAgICAgICAgICAgICAgaWYgKGV4YWN0ICYmIG9SdWxlLndvcmQgPT09IHN0cmluZykge1xuICAgICAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnlcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghZXhhY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxldmVubWF0Y2ggPSBjYWxjRGlzdGFuY2Uob1J1bGUud29yZCwgc3RyaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxldmVubWF0Y2ggPCAxNTApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBvUnVsZS53b3JkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXZlbm1hdGNoOiBsZXZlbm1hdGNoXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMSAvKiBSRUdFWFAgKi86XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShcIiBoZXJlIHJlZ2V4cFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUsIHVuZGVmaW5lZCwgMikpKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG0gPSBvUnVsZS5yZWdleHAuZXhlYyhzdHJpbmcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IChvUnVsZS5tYXRjaEluZGV4ICE9PSB1bmRlZmluZWQgJiYgbVtvUnVsZS5tYXRjaEluZGV4XSkgfHwgc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInVua25vd24gdHlwZVwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZVN0cmluZyA9IGNhdGVnb3JpemVTdHJpbmc7XG4vKipcbiAqXG4gKiBPcHRpb25zIG1heSBiZSB7XG4gKiBtYXRjaG90aGVycyA6IHRydWUsICA9PiBvbmx5IHJ1bGVzIHdoZXJlIGFsbCBvdGhlcnMgbWF0Y2ggYXJlIGNvbnNpZGVyZWRcbiAqIGF1Z21lbnQgOiB0cnVlLFxuICogb3ZlcnJpZGUgOiB0cnVlIH0gID0+XG4gKlxuICovXG5mdW5jdGlvbiBtYXRjaFdvcmQob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAoY29udGV4dFtvUnVsZS5rZXldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIHMxID0gY29udGV4dFtvUnVsZS5rZXldLnRvTG93ZXJDYXNlKCk7XG4gICAgdmFyIHMyID0gb1J1bGUud29yZC50b0xvd2VyQ2FzZSgpO1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsIG9SdWxlLmZvbGxvd3MsIG9SdWxlLmtleSk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XG4gICAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBjID0gY2FsY0Rpc3RhbmNlKHMyLCBzMSk7XG4gICAgZGVidWdsb2coXCIgczEgPD4gczIgXCIgKyBzMSArIFwiPD5cIiArIHMyICsgXCIgID0+OiBcIiArIGMpO1xuICAgIGlmIChjIDwgMTUwKSB7XG4gICAgICAgIHZhciByZXMgPSBPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKTtcbiAgICAgICAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIGNvbnRleHQpO1xuICAgICAgICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xuICAgICAgICAgICAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGZvcmNlIGtleSBwcm9wZXJ0eVxuICAgICAgICAvLyBjb25zb2xlLmxvZygnIG9iamVjdGNhdGVnb3J5JywgcmVzWydzeXN0ZW1PYmplY3RDYXRlZ29yeSddKTtcbiAgICAgICAgcmVzW29SdWxlLmtleV0gPSBvUnVsZS5mb2xsb3dzW29SdWxlLmtleV0gfHwgcmVzW29SdWxlLmtleV07XG4gICAgICAgIHJlcy5fd2VpZ2h0ID0gT2JqZWN0LmFzc2lnbih7fSwgcmVzLl93ZWlnaHQpO1xuICAgICAgICByZXMuX3dlaWdodFtvUnVsZS5rZXldID0gYztcbiAgICAgICAgT2JqZWN0LmZyZWV6ZShyZXMpO1xuICAgICAgICBkZWJ1Z2xvZygnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5leHBvcnRzLm1hdGNoV29yZCA9IG1hdGNoV29yZDtcbmZ1bmN0aW9uIGV4dHJhY3RBcmdzTWFwKG1hdGNoLCBhcmdzTWFwKSB7XG4gICAgdmFyIHJlcyA9IHt9O1xuICAgIGlmICghYXJnc01hcCkge1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cbiAgICBPYmplY3Qua2V5cyhhcmdzTWFwKS5mb3JFYWNoKGZ1bmN0aW9uIChpS2V5KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IG1hdGNoW2lLZXldO1xuICAgICAgICB2YXIga2V5ID0gYXJnc01hcFtpS2V5XTtcbiAgICAgICAgaWYgKCh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpICYmIHZhbHVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJlc1trZXldID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5leHRyYWN0QXJnc01hcCA9IGV4dHJhY3RBcmdzTWFwO1xuZnVuY3Rpb24gYW5hbHl6ZVN0cmluZyhzU3RyaW5nLCBhUnVsZXMpIHtcbiAgICB2YXIgY250ID0gMDtcbiAgICB2YXIgZmFjID0gMTtcbiAgICB2YXIgdSA9IGJyZWFrZG93bi5icmVha2Rvd25TdHJpbmcoc1N0cmluZyk7XG4gICAgZGVidWdsb2coXCJoZXJlIGJyZWFrZG93blwiICsgSlNPTi5zdHJpbmdpZnkodSkpO1xuICAgIHZhciB3b3JkcyA9IHt9O1xuICAgIHZhciByZXMgPSB1Lm1hcChmdW5jdGlvbiAoYUFycikge1xuICAgICAgICByZXR1cm4gYUFyci5tYXAoZnVuY3Rpb24gKHNXb3JkR3JvdXApIHtcbiAgICAgICAgICAgIHZhciBzZWVuSXQgPSB3b3Jkc1tzV29yZEdyb3VwXTtcbiAgICAgICAgICAgIGlmIChzZWVuSXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHNlZW5JdCA9IGNhdGVnb3JpemVTdHJpbmcoc1dvcmRHcm91cCwgdHJ1ZSwgYVJ1bGVzKTtcbiAgICAgICAgICAgICAgICB3b3Jkc1tzV29yZEdyb3VwXSA9IHNlZW5JdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNudCA9IGNudCArIHNlZW5JdC5sZW5ndGg7XG4gICAgICAgICAgICBmYWMgPSBmYWMgKiBzZWVuSXQubGVuZ3RoO1xuICAgICAgICAgICAgaWYgKCFzZWVuSXQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RpbmcgYXQgbGVhc3Qgb25lIG1hdGNoIGZvciBcIiArIHNXb3JkR3JvdXApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHNlZW5JdDtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgZGVidWdsb2coXCIgc2VudGVuY2VzIFwiICsgdS5sZW5ndGggKyBcIiBtYXRjaGVzIFwiICsgY250ICsgXCIgZmFjOiBcIiArIGZhYyk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuYW5hbHl6ZVN0cmluZyA9IGFuYWx5emVTdHJpbmc7XG4vKlxuWyBbYSxiXSwgW2MsZF1dXG5cbjAwIGFcbjAxIGJcbjEwIGNcbjExIGRcbjEyIGNcbiovXG5jb25zdCBjbG9uZSA9IHV0aWxzLmNsb25lRGVlcDtcbi8vIHdlIGNhbiByZXBsaWNhdGUgdGhlIHRhaWwgb3IgdGhlIGhlYWQsXG4vLyB3ZSByZXBsaWNhdGUgdGhlIHRhaWwgYXMgaXQgaXMgc21hbGxlci5cbi8vIFthLGIsYyBdXG5mdW5jdGlvbiBleHBhbmRNYXRjaEFycihkZWVwKSB7XG4gICAgdmFyIGEgPSBbXTtcbiAgICB2YXIgbGluZSA9IFtdO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlZXApKTtcbiAgICBkZWVwLmZvckVhY2goZnVuY3Rpb24gKHVCcmVha0Rvd25MaW5lLCBpSW5kZXgpIHtcbiAgICAgICAgbGluZVtpSW5kZXhdID0gW107XG4gICAgICAgIHVCcmVha0Rvd25MaW5lLmZvckVhY2goZnVuY3Rpb24gKGFXb3JkR3JvdXAsIHdnSW5kZXgpIHtcbiAgICAgICAgICAgIGxpbmVbaUluZGV4XVt3Z0luZGV4XSA9IFtdO1xuICAgICAgICAgICAgYVdvcmRHcm91cC5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZFZhcmlhbnQsIGlXVkluZGV4KSB7XG4gICAgICAgICAgICAgICAgbGluZVtpSW5kZXhdW3dnSW5kZXhdW2lXVkluZGV4XSA9IG9Xb3JkVmFyaWFudDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShsaW5lKSk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIHZhciBudmVjcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZS5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgdmVjcyA9IFtbXV07XG4gICAgICAgIHZhciBudmVjcyA9IFtdO1xuICAgICAgICB2YXIgcnZlYyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBrID0gMDsgayA8IGxpbmVbaV0ubGVuZ3RoOyArK2spIHtcbiAgICAgICAgICAgIC8vdmVjcyBpcyB0aGUgdmVjdG9yIG9mIGFsbCBzbyBmYXIgc2VlbiB2YXJpYW50cyB1cCB0byBrIHdncy5cbiAgICAgICAgICAgIHZhciBuZXh0QmFzZSA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIgbCA9IDA7IGwgPCBsaW5lW2ldW2tdLmxlbmd0aDsgKytsKSB7XG4gICAgICAgICAgICAgICAgZGVidWdsb2coXCJ2ZWNzIG5vd1wiICsgSlNPTi5zdHJpbmdpZnkodmVjcykpO1xuICAgICAgICAgICAgICAgIG52ZWNzID0gW107IC8vdmVjcy5zbGljZSgpOyAvLyBjb3B5IHRoZSB2ZWNbaV0gYmFzZSB2ZWN0b3I7XG4gICAgICAgICAgICAgICAgZGVidWdsb2coXCJ2ZWNzIGNvcGllZCBub3dcIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgdSA9IDA7IHUgPCB2ZWNzLmxlbmd0aDsgKyt1KSB7XG4gICAgICAgICAgICAgICAgICAgIG52ZWNzW3VdID0gdmVjc1t1XS5zbGljZSgpOyAvL1xuICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcImNvcGllZCB2ZWNzW1wiICsgdSArIFwiXVwiICsgSlNPTi5zdHJpbmdpZnkodmVjc1t1XSkpO1xuICAgICAgICAgICAgICAgICAgICBudmVjc1t1XS5wdXNoKGNsb25lKGxpbmVbaV1ba11bbF0pKTsgLy8gcHVzaCB0aGUgbHRoIHZhcmlhbnRcbiAgICAgICAgICAgICAgICAgICAgZGVidWdsb2coXCJub3cgbnZlY3MgXCIgKyBudmVjcy5sZW5ndGggKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGRlYnVnbG9nKFwiIGF0ICAgICBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiBuZXh0YmFzZSA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpO1xuICAgICAgICAgICAgICAgIGRlYnVnbG9nKFwiIGFwcGVuZCBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiBudmVjcyAgICA+XCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpO1xuICAgICAgICAgICAgICAgIG5leHRCYXNlID0gbmV4dEJhc2UuY29uY2F0KG52ZWNzKTtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcIiAgcmVzdWx0IFwiICsgayArIFwiOlwiICsgbCArIFwiIG52ZWNzICAgID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSk7XG4gICAgICAgICAgICB9IC8vY29uc3RydVxuICAgICAgICAgICAgZGVidWdsb2coXCJub3cgYXQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKTtcbiAgICAgICAgICAgIHZlY3MgPSBuZXh0QmFzZTtcbiAgICAgICAgfVxuICAgICAgICBkZWJ1Z2xvZyhcIkFQUEVORElORyBUTyBSRVNcIiArIGkgKyBcIjpcIiArIGwgKyBcIiA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpO1xuICAgICAgICByZXMgPSByZXMuY29uY2F0KHZlY3MpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5leHBhbmRNYXRjaEFyciA9IGV4cGFuZE1hdGNoQXJyO1xuLyoqXG4gKiBXZWlnaHQgZmFjdG9yIHRvIHVzZSBvbiB0aGUgYSBnaXZlbiB3b3JkIGRpc3RhbmNlXG4gKiBvZiAwLCAxLCAyLCAzIC4uLi5cbiAqL1xuY29uc3QgYURpc3RXZWlnaHQgPSBbMCwgMywgMSwgMC4yXTtcbi8qKlxuICogQ2FsY3VsYXRlIGEgd2VpZ2h0IGZhY3RvciBmb3IgYSBnaXZlbiBkaXN0YW5jZSBhbmRcbiAqIGNhdGVnb3J5XG4gKiBAcGFyYW0ge2ludGVnZXJ9IGRpc3QgZGlzdGFuY2UgaW4gd29yZHNcbiAqIEBwYXJhbSB7c3RyaW5nfSBjYXRlZ29yeSBjYXRlZ29yeSB0byB1c2VcbiAqIEByZXR1cm5zIHtudW1iZXJ9IGEgZGlzdGFuY2UgZmFjdG9yID49IDFcbiAqICAxLjAgZm9yIG5vIGVmZmVjdFxuICovXG5mdW5jdGlvbiBkaXN0V2VpZ2h0KGRpc3QsIGNhdGVnb3J5KSB7XG4gICAgdmFyIGFicyA9IE1hdGguYWJzKGRpc3QpO1xuICAgIHJldHVybiAxLjAgKyAoYURpc3RXZWlnaHRbYWJzXSB8fCAwKTtcbn1cbmV4cG9ydHMuZGlzdFdlaWdodCA9IGRpc3RXZWlnaHQ7XG4vKipcbiAqIEdpdmVuIGEgc2VudGVuY2UsIGV4dGFjdCBjYXRlZ29yaWVzXG4gKi9cbmZ1bmN0aW9uIGV4dHJhY3RDYXRlZ29yeU1hcChvU2VudGVuY2UpIHtcbiAgICB2YXIgcmVzID0ge307XG4gICAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpSW5kZXgpIHtcbiAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBJRk1hdGNoLkNBVF9DQVRFR09SWSkge1xuICAgICAgICAgICAgcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddID0gcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddIHx8IFtdO1xuICAgICAgICAgICAgcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddLnB1c2goeyBwb3M6IGlJbmRleCB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHV0aWxzLmRlZXBGcmVlemUocmVzKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5leHRyYWN0Q2F0ZWdvcnlNYXAgPSBleHRyYWN0Q2F0ZWdvcnlNYXA7XG5mdW5jdGlvbiByZWluRm9yY2VTZW50ZW5jZShvU2VudGVuY2UpIHtcbiAgICB2YXIgb0NhdGVnb3J5TWFwID0gZXh0cmFjdENhdGVnb3J5TWFwKG9TZW50ZW5jZSk7XG4gICAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpSW5kZXgpIHtcbiAgICAgICAgdmFyIG0gPSBvQ2F0ZWdvcnlNYXBbb1dvcmQuY2F0ZWdvcnldIHx8IFtdO1xuICAgICAgICBtLmZvckVhY2goZnVuY3Rpb24gKG9Qb3NpdGlvbikge1xuICAgICAgICAgICAgb1dvcmQucmVpbmZvcmNlID0gb1dvcmQucmVpbmZvcmNlIHx8IDE7XG4gICAgICAgICAgICBvV29yZC5yZWluZm9yY2UgKj0gZGlzdFdlaWdodChpSW5kZXggLSBvUG9zaXRpb24ucG9zLCBvV29yZC5jYXRlZ29yeSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiBvU2VudGVuY2U7XG59XG5leHBvcnRzLnJlaW5Gb3JjZVNlbnRlbmNlID0gcmVpbkZvcmNlU2VudGVuY2U7XG5mdW5jdGlvbiByZWluRm9yY2UoYUNhdGVnb3J5aXplZEFycmF5KSB7XG4gICAgYUNhdGVnb3J5aXplZEFycmF5LmZvckVhY2goZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICByZWluRm9yY2VTZW50ZW5jZShvU2VudGVuY2UpO1xuICAgIH0pO1xuICAgIHJldHVybiBhQ2F0ZWdvcnlpemVkQXJyYXk7XG59XG5leHBvcnRzLnJlaW5Gb3JjZSA9IHJlaW5Gb3JjZTtcbmZ1bmN0aW9uIG1hdGNoUmVnRXhwKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBzS2V5ID0gb1J1bGUua2V5O1xuICAgIHZhciBzMSA9IGNvbnRleHRbb1J1bGUua2V5XS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciByZWcgPSBvUnVsZS5yZWdleHA7XG4gICAgdmFyIG0gPSByZWcuZXhlYyhzMSk7XG4gICAgZGVidWdsb2coXCJhcHBseWluZyByZWdleHA6IFwiICsgczEgKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KG0pKTtcbiAgICBpZiAoIW0pIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCwgb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcbiAgICBpZiAob3B0aW9ucy5tYXRjaG90aGVycyAmJiAoZGVsdGEuZGlmZmVyZW50ID4gMCkpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIG9FeHRyYWN0ZWRDb250ZXh0ID0gZXh0cmFjdEFyZ3NNYXAobSwgb1J1bGUuYXJnc01hcCk7XG4gICAgZGVidWdsb2coXCJleHRyYWN0ZWQgYXJncyBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLmFyZ3NNYXApKTtcbiAgICBkZWJ1Z2xvZyhcIm1hdGNoIFwiICsgSlNPTi5zdHJpbmdpZnkobSkpO1xuICAgIGRlYnVnbG9nKFwiZXh0cmFjdGVkIGFyZ3MgXCIgKyBKU09OLnN0cmluZ2lmeShvRXh0cmFjdGVkQ29udGV4dCkpO1xuICAgIHZhciByZXMgPSBPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKTtcbiAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpO1xuICAgIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcbiAgICBpZiAob0V4dHJhY3RlZENvbnRleHRbc0tleV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXNbc0tleV0gPSBvRXh0cmFjdGVkQ29udGV4dFtzS2V5XTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMub3ZlcnJpZGUpIHtcbiAgICAgICAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xuICAgICAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpO1xuICAgIH1cbiAgICBPYmplY3QuZnJlZXplKHJlcyk7XG4gICAgZGVidWdsb2coJ0ZvdW5kIG9uZScgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLm1hdGNoUmVnRXhwID0gbWF0Y2hSZWdFeHA7XG5mdW5jdGlvbiBzb3J0QnlXZWlnaHQoc0tleSwgb0NvbnRleHRBLCBvQ29udGV4dEIpIHtcbiAgICBkZWJ1Z2xvZygnc29ydGluZzogJyArIHNLZXkgKyAnaW52b2tlZCB3aXRoXFxuIDE6JyArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QSwgdW5kZWZpbmVkLCAyKSArXG4gICAgICAgIFwiIHZzIFxcbiAyOlwiICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHRCLCB1bmRlZmluZWQsIDIpKTtcbiAgICB2YXIgcmFua2luZ0EgPSBwYXJzZUZsb2F0KG9Db250ZXh0QVtcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcbiAgICB2YXIgcmFua2luZ0IgPSBwYXJzZUZsb2F0KG9Db250ZXh0QltcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcbiAgICBpZiAocmFua2luZ0EgIT09IHJhbmtpbmdCKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiIHJhbmtpbiBkZWx0YVwiICsgMTAwICogKHJhbmtpbmdCIC0gcmFua2luZ0EpKTtcbiAgICAgICAgcmV0dXJuIDEwMCAqIChyYW5raW5nQiAtIHJhbmtpbmdBKTtcbiAgICB9XG4gICAgdmFyIHdlaWdodEEgPSBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QVtcIl93ZWlnaHRcIl1bc0tleV0gfHwgMDtcbiAgICB2YXIgd2VpZ2h0QiA9IG9Db250ZXh0QltcIl93ZWlnaHRcIl0gJiYgb0NvbnRleHRCW1wiX3dlaWdodFwiXVtzS2V5XSB8fCAwO1xuICAgIHJldHVybiArKHdlaWdodEEgLSB3ZWlnaHRCKTtcbn1cbmV4cG9ydHMuc29ydEJ5V2VpZ2h0ID0gc29ydEJ5V2VpZ2h0O1xuLy8gV29yZCwgU3lub255bSwgUmVnZXhwIC8gRXh0cmFjdGlvblJ1bGVcbmZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBvUnVsZXMsIG9wdGlvbnMpIHtcbiAgICB2YXIgc0tleSA9IG9SdWxlc1swXS5rZXk7XG4gICAgLy8gY2hlY2sgdGhhdCBydWxlXG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgLy8gY2hlY2sgY29uc2lzdGVuY3lcbiAgICAgICAgb1J1bGVzLmV2ZXJ5KGZ1bmN0aW9uIChpUnVsZSkge1xuICAgICAgICAgICAgaWYgKGlSdWxlLmtleSAhPT0gc0tleSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkluaG9tb2dlbm91cyBrZXlzIGluIHJ1bGVzLCBleHBlY3RlZCBcIiArIHNLZXkgKyBcIiB3YXMgXCIgKyBKU09OLnN0cmluZ2lmeShpUnVsZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBsb29rIGZvciBydWxlcyB3aGljaCBtYXRjaFxuICAgIHZhciByZXMgPSBvUnVsZXMubWFwKGZ1bmN0aW9uIChvUnVsZSkge1xuICAgICAgICAvLyBpcyB0aGlzIHJ1bGUgYXBwbGljYWJsZVxuICAgICAgICBzd2l0Y2ggKG9SdWxlLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgMCAvKiBXT1JEICovOlxuICAgICAgICAgICAgICAgIHJldHVybiBtYXRjaFdvcmQob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgY2FzZSAxIC8qIFJFR0VYUCAqLzpcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2hSZWdFeHAob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSkuZmlsdGVyKGZ1bmN0aW9uIChvcmVzKSB7XG4gICAgICAgIHJldHVybiAhIW9yZXM7XG4gICAgfSkuc29ydChzb3J0QnlXZWlnaHQuYmluZCh0aGlzLCBzS2V5KSk7XG4gICAgcmV0dXJuIHJlcztcbiAgICAvLyBPYmplY3Qua2V5cygpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAvLyB9KTtcbn1cbmV4cG9ydHMuYXVnbWVudENvbnRleHQxID0gYXVnbWVudENvbnRleHQxO1xuZnVuY3Rpb24gYXVnbWVudENvbnRleHQoY29udGV4dCwgYVJ1bGVzKSB7XG4gICAgdmFyIG9wdGlvbnMxID0ge1xuICAgICAgICBtYXRjaG90aGVyczogdHJ1ZSxcbiAgICAgICAgb3ZlcnJpZGU6IGZhbHNlXG4gICAgfTtcbiAgICB2YXIgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMxKTtcbiAgICBpZiAoYVJlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdmFyIG9wdGlvbnMyID0ge1xuICAgICAgICAgICAgbWF0Y2hvdGhlcnM6IGZhbHNlLFxuICAgICAgICAgICAgb3ZlcnJpZGU6IHRydWVcbiAgICAgICAgfTtcbiAgICAgICAgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMyKTtcbiAgICB9XG4gICAgcmV0dXJuIGFSZXM7XG59XG5leHBvcnRzLmF1Z21lbnRDb250ZXh0ID0gYXVnbWVudENvbnRleHQ7XG5mdW5jdGlvbiBpbnNlcnRPcmRlcmVkKHJlc3VsdCwgaUluc2VydGVkTWVtYmVyLCBsaW1pdCkge1xuICAgIC8vIFRPRE86IHVzZSBzb21lIHdlaWdodFxuICAgIGlmIChyZXN1bHQubGVuZ3RoIDwgbGltaXQpIHtcbiAgICAgICAgcmVzdWx0LnB1c2goaUluc2VydGVkTWVtYmVyKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cbmV4cG9ydHMuaW5zZXJ0T3JkZXJlZCA9IGluc2VydE9yZGVyZWQ7XG5mdW5jdGlvbiB0YWtlVG9wTihhcnIpIHtcbiAgICB2YXIgdSA9IGFyci5maWx0ZXIoZnVuY3Rpb24gKGlubmVyQXJyKSB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwOyB9KTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgLy8gc2hpZnQgb3V0IHRoZSB0b3Agb25lc1xuICAgIHUgPSB1Lm1hcChmdW5jdGlvbiAoaUFycikge1xuICAgICAgICB2YXIgdG9wID0gaUFyci5zaGlmdCgpO1xuICAgICAgICByZXMgPSBpbnNlcnRPcmRlcmVkKHJlcywgdG9wLCA1KTtcbiAgICAgICAgcmV0dXJuIGlBcnI7XG4gICAgfSkuZmlsdGVyKGZ1bmN0aW9uIChpbm5lckFycikgeyByZXR1cm4gaW5uZXJBcnIubGVuZ3RoID4gMDsgfSk7XG4gICAgLy8gYXMgQXJyYXk8QXJyYXk8SUZNYXRjaC5jb250ZXh0Pj5cbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy50YWtlVG9wTiA9IHRha2VUb3BOO1xuY29uc3QgaW5wdXRGaWx0ZXJSdWxlcyA9IHJlcXVpcmUoJy4vaW5wdXRGaWx0ZXJSdWxlcycpO1xudmFyIHJtO1xuZnVuY3Rpb24gZ2V0Uk1PbmNlKCkge1xuICAgIGlmICghcm0pIHtcbiAgICAgICAgcm0gPSBpbnB1dEZpbHRlclJ1bGVzLmdldFJ1bGVNYXAoKTtcbiAgICB9XG4gICAgcmV0dXJuIHJtO1xufVxuZnVuY3Rpb24gYXBwbHlSdWxlcyhjb250ZXh0KSB7XG4gICAgdmFyIGJlc3ROID0gW2NvbnRleHRdO1xuICAgIGlucHV0RmlsdGVyUnVsZXMub0tleU9yZGVyLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgICAgdmFyIGJlc3ROZXh0ID0gW107XG4gICAgICAgIGJlc3ROLmZvckVhY2goZnVuY3Rpb24gKG9Db250ZXh0KSB7XG4gICAgICAgICAgICBpZiAob0NvbnRleHRbc0tleV0pIHtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZygnKiogYXBwbHlpbmcgcnVsZXMgZm9yICcgKyBzS2V5KTtcbiAgICAgICAgICAgICAgICB2YXIgcmVzID0gYXVnbWVudENvbnRleHQob0NvbnRleHQsIGdldFJNT25jZSgpW3NLZXldIHx8IFtdKTtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZygnKiogcmVzdWx0IGZvciAnICsgc0tleSArICcgPSAnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgICAgICAgICBiZXN0TmV4dC5wdXNoKHJlcyB8fCBbXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBydWxlIG5vdCByZWxldmFudFxuICAgICAgICAgICAgICAgIGJlc3ROZXh0LnB1c2goW29Db250ZXh0XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBiZXN0TiA9IHRha2VUb3BOKGJlc3ROZXh0KTtcbiAgICB9KTtcbiAgICByZXR1cm4gYmVzdE47XG59XG5leHBvcnRzLmFwcGx5UnVsZXMgPSBhcHBseVJ1bGVzO1xuZnVuY3Rpb24gYXBwbHlSdWxlc1BpY2tGaXJzdChjb250ZXh0KSB7XG4gICAgdmFyIHIgPSBhcHBseVJ1bGVzKGNvbnRleHQpO1xuICAgIHJldHVybiByICYmIHJbMF07XG59XG5leHBvcnRzLmFwcGx5UnVsZXNQaWNrRmlyc3QgPSBhcHBseVJ1bGVzUGlja0ZpcnN0O1xuLyoqXG4gKiBEZWNpZGUgd2hldGhlciB0byByZXF1ZXJ5IGZvciBhIGNvbnRldFxuICovXG5mdW5jdGlvbiBkZWNpZGVPblJlUXVlcnkoY29udGV4dCkge1xuICAgIHJldHVybiBbXTtcbn1cbmV4cG9ydHMuZGVjaWRlT25SZVF1ZXJ5ID0gZGVjaWRlT25SZVF1ZXJ5O1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
