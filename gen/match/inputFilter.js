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
 * @module jfseb.fdevstart.inputFilter
 * @file inputFilter.ts
 * @copyright (c) 2016 Gerd Forstmann
 */
/// <reference path="../../lib/node-4.d.ts" />

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
    debuglog('extractCategoryMap ' + JSON.stringify(oSentence));
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
/// below may no longer be used
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1hdGNoL2lucHV0RmlsdGVyLmpzIiwiLi4vc3JjL21hdGNoL2lucHV0RmlsdGVyLnRzIl0sIm5hbWVzIjpbImRpc3RhbmNlIiwicmVxdWlyZSIsImRlYnVnIiwidXRpbHMiLCJicmVha2Rvd24iLCJkZWJ1Z2xvZyIsIm1hdGNoZGF0YSIsIm9Vbml0VGVzdHMiLCJjYWxjRGlzdGFuY2UiLCJzVGV4dDEiLCJzVGV4dDIiLCJhMCIsImxldmVuc2h0ZWluIiwic3Vic3RyaW5nIiwibGVuZ3RoIiwiYSIsInRvTG93ZXJDYXNlIiwiSUZNYXRjaCIsIm5vblByaXZhdGVLZXlzIiwib0EiLCJPYmplY3QiLCJrZXlzIiwiZmlsdGVyIiwia2V5IiwiY291bnRBaW5CIiwib0IiLCJmbkNvbXBhcmUiLCJhS2V5SWdub3JlIiwiQXJyYXkiLCJpc0FycmF5IiwiaW5kZXhPZiIsInJlZHVjZSIsInByZXYiLCJwcm90b3R5cGUiLCJoYXNPd25Qcm9wZXJ0eSIsImNhbGwiLCJleHBvcnRzIiwic3B1cmlvdXNBbm90SW5CIiwibG93ZXJDYXNlIiwibyIsImNvbXBhcmVDb250ZXh0IiwiZXF1YWwiLCJiIiwiZGlmZmVyZW50Iiwic3B1cmlvdXNMIiwic3B1cmlvdXNSIiwiY2F0ZWdvcml6ZVN0cmluZyIsInN0cmluZyIsImV4YWN0Iiwib1J1bGVzIiwicmVzIiwiZm9yRWFjaCIsIm9SdWxlIiwidHlwZSIsIndvcmQiLCJwdXNoIiwibWF0Y2hlZFN0cmluZyIsImNhdGVnb3J5IiwibGV2ZW5tYXRjaCIsIkpTT04iLCJzdHJpbmdpZnkiLCJ1bmRlZmluZWQiLCJtIiwicmVnZXhwIiwiZXhlYyIsIm1hdGNoSW5kZXgiLCJFcnJvciIsIm1hdGNoV29yZCIsImNvbnRleHQiLCJvcHRpb25zIiwiczEiLCJzMiIsImRlbHRhIiwiZm9sbG93cyIsIm1hdGNob3RoZXJzIiwiYyIsImFzc2lnbiIsIm92ZXJyaWRlIiwiX3dlaWdodCIsImZyZWV6ZSIsImV4dHJhY3RBcmdzTWFwIiwibWF0Y2giLCJhcmdzTWFwIiwiaUtleSIsInZhbHVlIiwiYW5hbHl6ZVN0cmluZyIsInNTdHJpbmciLCJhUnVsZXMiLCJjbnQiLCJmYWMiLCJ1IiwiYnJlYWtkb3duU3RyaW5nIiwid29yZHMiLCJtYXAiLCJhQXJyIiwic1dvcmRHcm91cCIsInNlZW5JdCIsImNsb25lIiwiY2xvbmVEZWVwIiwiZXhwYW5kTWF0Y2hBcnIiLCJkZWVwIiwibGluZSIsInVCcmVha0Rvd25MaW5lIiwiaUluZGV4IiwiYVdvcmRHcm91cCIsIndnSW5kZXgiLCJvV29yZFZhcmlhbnQiLCJpV1ZJbmRleCIsIm52ZWNzIiwiaSIsInZlY3MiLCJydmVjIiwiayIsIm5leHRCYXNlIiwibCIsInNsaWNlIiwiY29uY2F0IiwiYURpc3RXZWlnaHQiLCJkaXN0V2VpZ2h0IiwiZGlzdCIsImFicyIsIk1hdGgiLCJleHRyYWN0Q2F0ZWdvcnlNYXAiLCJvU2VudGVuY2UiLCJvV29yZCIsIkNBVF9DQVRFR09SWSIsInBvcyIsImRlZXBGcmVlemUiLCJyZWluRm9yY2VTZW50ZW5jZSIsIm9DYXRlZ29yeU1hcCIsIm9Qb3NpdGlvbiIsInJlaW5mb3JjZSIsInJlaW5Gb3JjZSIsImFDYXRlZ29yeWl6ZWRBcnJheSIsIm1hdGNoUmVnRXhwIiwic0tleSIsInJlZyIsIm9FeHRyYWN0ZWRDb250ZXh0Iiwic29ydEJ5V2VpZ2h0Iiwib0NvbnRleHRBIiwib0NvbnRleHRCIiwicmFua2luZ0EiLCJwYXJzZUZsb2F0IiwicmFua2luZ0IiLCJ3ZWlnaHRBIiwid2VpZ2h0QiIsImF1Z21lbnRDb250ZXh0MSIsImVuYWJsZWQiLCJldmVyeSIsImlSdWxlIiwib3JlcyIsInNvcnQiLCJiaW5kIiwiYXVnbWVudENvbnRleHQiLCJvcHRpb25zMSIsImFSZXMiLCJvcHRpb25zMiIsImluc2VydE9yZGVyZWQiLCJyZXN1bHQiLCJpSW5zZXJ0ZWRNZW1iZXIiLCJsaW1pdCIsInRha2VUb3BOIiwiYXJyIiwiaW5uZXJBcnIiLCJpQXJyIiwidG9wIiwic2hpZnQiLCJpbnB1dEZpbHRlclJ1bGVzIiwicm0iLCJnZXRSTU9uY2UiLCJnZXRSdWxlTWFwIiwiYXBwbHlSdWxlcyIsImJlc3ROIiwib0tleU9yZGVyIiwiYmVzdE5leHQiLCJvQ29udGV4dCIsImFwcGx5UnVsZXNQaWNrRmlyc3QiLCJyIiwiZGVjaWRlT25SZVF1ZXJ5Il0sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOzs7Ozs7Ozs7Ozs7Ozs7O0FBZ0JBOztBQUNBLElBQVlBLFdBQVFDLFFBQU0sNkJBQU4sQ0FBcEI7QUFFQSxJQUFZQyxRQUFLRCxRQUFNLE9BQU4sQ0FBakI7QUFFQSxJQUFZRSxRQUFLRixRQUFNLGdCQUFOLENBQWpCO0FBSUEsSUFBWUcsWUFBU0gsUUFBTSxhQUFOLENBQXJCO0FBRUEsSUFBTUksV0FBV0gsTUFBTSxhQUFOLENBQWpCO0FBRUEsSUFBWUksWUFBU0wsUUFBTSxhQUFOLENBQXJCO0FBQ0UsSUFBSU0sYUFBYUQsVUFBVUMsVUFBM0I7QUFFQTs7Ozs7O0FBTUEsU0FBQUMsWUFBQSxDQUF1QkMsTUFBdkIsRUFBd0NDLE1BQXhDLEVBQXVEO0FBQ3JEO0FBQ0EsUUFBSUMsS0FBS1gsU0FBU1ksV0FBVCxDQUFxQkgsT0FBT0ksU0FBUCxDQUFpQixDQUFqQixFQUFvQkgsT0FBT0ksTUFBM0IsQ0FBckIsRUFBeURKLE1BQXpELENBQVQ7QUFDQSxRQUFJSyxJQUFJZixTQUFTWSxXQUFULENBQXFCSCxPQUFPTyxXQUFQLEVBQXJCLEVBQTJDTixNQUEzQyxDQUFSO0FBQ0EsV0FBT0MsS0FBSyxHQUFMLEdBQVdELE9BQU9JLE1BQWxCLEdBQTJCQyxDQUFsQztBQUNEO0FBRUgsSUFBWUUsVUFBT2hCLFFBQU0sa0JBQU4sQ0FBbkI7QUFxQkEsU0FBQWlCLGNBQUEsQ0FBd0JDLEVBQXhCLEVBQTBCO0FBQ3hCLFdBQU9DLE9BQU9DLElBQVAsQ0FBWUYsRUFBWixFQUFnQkcsTUFBaEIsQ0FBd0IsZUFBRztBQUNoQyxlQUFPQyxJQUFJLENBQUosTUFBVyxHQUFsQjtBQUNELEtBRk0sQ0FBUDtBQUdEO0FBRUQsU0FBQUMsU0FBQSxDQUEyQkwsRUFBM0IsRUFBK0JNLEVBQS9CLEVBQW1DQyxTQUFuQyxFQUE4Q0MsVUFBOUMsRUFBeUQ7QUFDdERBLGlCQUFhQyxNQUFNQyxPQUFOLENBQWNGLFVBQWQsSUFBNkJBLFVBQTdCLEdBQ1YsT0FBT0EsVUFBUCxLQUFzQixRQUF0QixHQUFpQyxDQUFDQSxVQUFELENBQWpDLEdBQWlELEVBRHBEO0FBRUFELGdCQUFZQSxhQUFhLFlBQUE7QUFBYSxlQUFPLElBQVA7QUFBYyxLQUFwRDtBQUNBLFdBQU9SLGVBQWVDLEVBQWYsRUFBbUJHLE1BQW5CLENBQTJCLFVBQVNDLEdBQVQsRUFBWTtBQUM1QyxlQUFPSSxXQUFXRyxPQUFYLENBQW1CUCxHQUFuQixJQUEwQixDQUFqQztBQUNBLEtBRkssRUFHTlEsTUFITSxDQUdDLFVBQVVDLElBQVYsRUFBZ0JULEdBQWhCLEVBQW1CO0FBQ3hCLFlBQUlILE9BQU9hLFNBQVAsQ0FBaUJDLGNBQWpCLENBQWdDQyxJQUFoQyxDQUFxQ1YsRUFBckMsRUFBeUNGLEdBQXpDLENBQUosRUFBbUQ7QUFDakRTLG1CQUFPQSxRQUFRTixVQUFVUCxHQUFHSSxHQUFILENBQVYsRUFBa0JFLEdBQUdGLEdBQUgsQ0FBbEIsRUFBMkJBLEdBQTNCLElBQWtDLENBQWxDLEdBQXNDLENBQTlDLENBQVA7QUFDRDtBQUNELGVBQU9TLElBQVA7QUFDRCxLQVJLLEVBUUgsQ0FSRyxDQUFQO0FBU0E7QUFiYUksUUFBQVosU0FBQSxHQUFTQSxTQUFUO0FBZWhCLFNBQUFhLGVBQUEsQ0FBZ0NsQixFQUFoQyxFQUFtQ00sRUFBbkMsRUFBdUNFLFVBQXZDLEVBQWtEO0FBQ2hEQSxpQkFBYUMsTUFBTUMsT0FBTixDQUFjRixVQUFkLElBQTZCQSxVQUE3QixHQUNULE9BQU9BLFVBQVAsS0FBc0IsUUFBdEIsR0FBaUMsQ0FBQ0EsVUFBRCxDQUFqQyxHQUFpRCxFQURyRDtBQUVDLFdBQU9ULGVBQWVDLEVBQWYsRUFBbUJHLE1BQW5CLENBQTJCLFVBQVNDLEdBQVQsRUFBWTtBQUM1QyxlQUFPSSxXQUFXRyxPQUFYLENBQW1CUCxHQUFuQixJQUEwQixDQUFqQztBQUNBLEtBRkssRUFHTlEsTUFITSxDQUdDLFVBQVVDLElBQVYsRUFBZ0JULEdBQWhCLEVBQW1CO0FBQ3hCLFlBQUksQ0FBQ0gsT0FBT2EsU0FBUCxDQUFpQkMsY0FBakIsQ0FBZ0NDLElBQWhDLENBQXFDVixFQUFyQyxFQUF5Q0YsR0FBekMsQ0FBTCxFQUFvRDtBQUNsRFMsbUJBQU9BLE9BQU8sQ0FBZDtBQUNEO0FBQ0QsZUFBT0EsSUFBUDtBQUNELEtBUkssRUFRSCxDQVJHLENBQVA7QUFTRjtBQVplSSxRQUFBQyxlQUFBLEdBQWVBLGVBQWY7QUFjaEIsU0FBQUMsU0FBQSxDQUFtQkMsQ0FBbkIsRUFBb0I7QUFDbEIsUUFBSSxPQUFPQSxDQUFQLEtBQWEsUUFBakIsRUFBMkI7QUFDekIsZUFBT0EsRUFBRXZCLFdBQUYsRUFBUDtBQUNEO0FBQ0QsV0FBT3VCLENBQVA7QUFDRDtBQUVELFNBQUFDLGNBQUEsQ0FBK0JyQixFQUEvQixFQUFvQ00sRUFBcEMsRUFBd0NFLFVBQXhDLEVBQW1EO0FBQ2pELFFBQUljLFFBQVFqQixVQUFVTCxFQUFWLEVBQWFNLEVBQWIsRUFBaUIsVUFBU1YsQ0FBVCxFQUFXMkIsQ0FBWCxFQUFZO0FBQUksZUFBT0osVUFBVXZCLENBQVYsTUFBaUJ1QixVQUFVSSxDQUFWLENBQXhCO0FBQXNDLEtBQXZFLEVBQXlFZixVQUF6RSxDQUFaO0FBQ0EsUUFBSWdCLFlBQVluQixVQUFVTCxFQUFWLEVBQWFNLEVBQWIsRUFBaUIsVUFBU1YsQ0FBVCxFQUFXMkIsQ0FBWCxFQUFZO0FBQUksZUFBT0osVUFBVXZCLENBQVYsTUFBaUJ1QixVQUFVSSxDQUFWLENBQXhCO0FBQXNDLEtBQXZFLEVBQXlFZixVQUF6RSxDQUFoQjtBQUNBLFFBQUlpQixZQUFZUCxnQkFBZ0JsQixFQUFoQixFQUFtQk0sRUFBbkIsRUFBdUJFLFVBQXZCLENBQWhCO0FBQ0EsUUFBSWtCLFlBQVlSLGdCQUFnQlosRUFBaEIsRUFBbUJOLEVBQW5CLEVBQXVCUSxVQUF2QixDQUFoQjtBQUNBLFdBQU87QUFDTGMsZUFBUUEsS0FESDtBQUVMRSxtQkFBV0EsU0FGTjtBQUdMQyxtQkFBV0EsU0FITjtBQUlMQyxtQkFBV0E7QUFKTixLQUFQO0FBTUQ7QUFYZVQsUUFBQUksY0FBQSxHQUFjQSxjQUFkO0FBY2hCLFNBQUFNLGdCQUFBLENBQWlDQyxNQUFqQyxFQUFrREMsS0FBbEQsRUFBb0VDLE1BQXBFLEVBQWdHO0FBQzlGO0FBQ0EsUUFBSUMsTUFBeUMsRUFBN0M7QUFDQUQsV0FBT0UsT0FBUCxDQUFlLFVBQVNDLEtBQVQsRUFBYztBQUMzQixnQkFBT0EsTUFBTUMsSUFBYjtBQUNFLGlCQUFLLENBQUwsQ0FBSyxVQUFMO0FBQ0ksb0JBQUtMLFNBQVNJLE1BQU1FLElBQU4sS0FBZVAsTUFBN0IsRUFBcUM7QUFDbkNHLHdCQUFJSyxJQUFKLENBQVU7QUFDUlIsZ0NBQVFBLE1BREE7QUFFUlMsdUNBQWdCSixNQUFNSSxhQUZkO0FBR1JDLGtDQUFXTCxNQUFNSztBQUhULHFCQUFWO0FBS0Q7QUFDRCxvQkFBSSxDQUFDVCxLQUFMLEVBQVk7QUFDVix3QkFBSVUsYUFBYWxELGFBQWE0QyxNQUFNRSxJQUFuQixFQUF3QlAsTUFBeEIsQ0FBakI7QUFDQSx3QkFBSVcsYUFBYSxHQUFqQixFQUFzQjtBQUNwQlIsNEJBQUlLLElBQUosQ0FBUztBQUNQUixvQ0FBUUEsTUFERDtBQUVQUywyQ0FBZ0JKLE1BQU1FLElBRmY7QUFHUEcsc0NBQVdMLE1BQU1LLFFBSFY7QUFJUEMsd0NBQWFBO0FBSk4seUJBQVQ7QUFNRDtBQUNGO0FBQ0Q7QUFDSixpQkFBSyxDQUFMLENBQUssWUFBTDtBQUFrQztBQUVoQ3JELDZCQUFTc0QsS0FBS0MsU0FBTCxDQUFlLGlCQUFpQkQsS0FBS0MsU0FBTCxDQUFlUixLQUFmLEVBQXFCUyxTQUFyQixFQUErQixDQUEvQixDQUFoQyxDQUFUO0FBQ0Esd0JBQUlDLElBQUlWLE1BQU1XLE1BQU4sQ0FBYUMsSUFBYixDQUFrQmpCLE1BQWxCLENBQVI7QUFDQSx3QkFBR2UsQ0FBSCxFQUFNO0FBQ0ZaLDRCQUFJSyxJQUFKLENBQVU7QUFDUlIsb0NBQVFBLE1BREE7QUFFRVMsMkNBQWlCSixNQUFNYSxVQUFOLEtBQXFCSixTQUFyQixJQUFrQ0MsRUFBRVYsTUFBTWEsVUFBUixDQUFuQyxJQUEyRGxCLE1BRjdFO0FBR0VVLHNDQUFXTCxNQUFNSztBQUhuQix5QkFBVjtBQUtIO0FBQ0Y7QUFDRDtBQUNBO0FBQ0Usc0JBQU0sSUFBSVMsS0FBSixDQUFVLGlCQUFpQlAsS0FBS0MsU0FBTCxDQUFnQlIsS0FBaEIsRUFBc0JTLFNBQXRCLEVBQWlDLENBQWpDLENBQTNCLENBQU47QUFuQ0o7QUFxQ0QsS0F0Q0Q7QUF1Q0UsV0FBT1gsR0FBUDtBQUNIO0FBM0NlZCxRQUFBVSxnQkFBQSxHQUFnQkEsZ0JBQWhCO0FBNENoQjs7Ozs7Ozs7QUFRQSxTQUFBcUIsU0FBQSxDQUEwQmYsS0FBMUIsRUFBeUNnQixPQUF6QyxFQUFvRUMsT0FBcEUsRUFBNkY7QUFDM0YsUUFBSUQsUUFBUWhCLE1BQU03QixHQUFkLE1BQXVCc0MsU0FBM0IsRUFBc0M7QUFDcEMsZUFBT0EsU0FBUDtBQUNEO0FBQ0QsUUFBSVMsS0FBS0YsUUFBUWhCLE1BQU03QixHQUFkLEVBQW1CUCxXQUFuQixFQUFUO0FBQ0EsUUFBSXVELEtBQUtuQixNQUFNRSxJQUFOLENBQVd0QyxXQUFYLEVBQVQ7QUFDQXFELGNBQVVBLFdBQVcsRUFBckI7QUFDQSxRQUFJRyxRQUFRaEMsZUFBZTRCLE9BQWYsRUFBdUJoQixNQUFNcUIsT0FBN0IsRUFBc0NyQixNQUFNN0IsR0FBNUMsQ0FBWjtBQUNBbEIsYUFBU3NELEtBQUtDLFNBQUwsQ0FBZVksS0FBZixDQUFUO0FBQ0FuRSxhQUFTc0QsS0FBS0MsU0FBTCxDQUFlUyxPQUFmLENBQVQ7QUFDQSxRQUFJQSxRQUFRSyxXQUFSLElBQXdCRixNQUFNN0IsU0FBTixHQUFrQixDQUE5QyxFQUFpRDtBQUMvQyxlQUFPa0IsU0FBUDtBQUNEO0FBQ0QsUUFBSWMsSUFBYW5FLGFBQWErRCxFQUFiLEVBQWlCRCxFQUFqQixDQUFqQjtBQUNDakUsYUFBUyxlQUFlaUUsRUFBZixHQUFvQixJQUFwQixHQUEyQkMsRUFBM0IsR0FBZ0MsUUFBaEMsR0FBMkNJLENBQXBEO0FBQ0QsUUFBR0EsSUFBSSxHQUFQLEVBQWE7QUFDWCxZQUFJekIsTUFBTTlCLE9BQU93RCxNQUFQLENBQWMsRUFBZCxFQUFrQnhCLE1BQU1xQixPQUF4QixDQUFWO0FBQ0F2QixjQUFNOUIsT0FBT3dELE1BQVAsQ0FBYzFCLEdBQWQsRUFBbUJrQixPQUFuQixDQUFOO0FBQ0EsWUFBSUMsUUFBUVEsUUFBWixFQUFzQjtBQUNwQjNCLGtCQUFNOUIsT0FBT3dELE1BQVAsQ0FBYzFCLEdBQWQsRUFBbUJFLE1BQU1xQixPQUF6QixDQUFOO0FBQ0Q7QUFDRDtBQUNBO0FBQ0F2QixZQUFJRSxNQUFNN0IsR0FBVixJQUFpQjZCLE1BQU1xQixPQUFOLENBQWNyQixNQUFNN0IsR0FBcEIsS0FBNEIyQixJQUFJRSxNQUFNN0IsR0FBVixDQUE3QztBQUNBMkIsWUFBSTRCLE9BQUosR0FBYzFELE9BQU93RCxNQUFQLENBQWMsRUFBZCxFQUFrQjFCLElBQUk0QixPQUF0QixDQUFkO0FBQ0E1QixZQUFJNEIsT0FBSixDQUFZMUIsTUFBTTdCLEdBQWxCLElBQXlCb0QsQ0FBekI7QUFDQXZELGVBQU8yRCxNQUFQLENBQWM3QixHQUFkO0FBQ0E3QyxpQkFBUyxjQUFjc0QsS0FBS0MsU0FBTCxDQUFlVixHQUFmLEVBQW1CVyxTQUFuQixFQUE2QixDQUE3QixDQUF2QjtBQUNBLGVBQU9YLEdBQVA7QUFDRDtBQUNELFdBQU9XLFNBQVA7QUFDRDtBQS9CZXpCLFFBQUErQixTQUFBLEdBQVNBLFNBQVQ7QUFpQ2hCLFNBQUFhLGNBQUEsQ0FBK0JDLEtBQS9CLEVBQXVEQyxPQUF2RCxFQUEyRjtBQUN6RixRQUFJaEMsTUFBTSxFQUFWO0FBQ0EsUUFBSSxDQUFDZ0MsT0FBTCxFQUFjO0FBQ1osZUFBT2hDLEdBQVA7QUFDRDtBQUNEOUIsV0FBT0MsSUFBUCxDQUFZNkQsT0FBWixFQUFxQi9CLE9BQXJCLENBQTZCLFVBQVNnQyxJQUFULEVBQWE7QUFDdEMsWUFBSUMsUUFBUUgsTUFBTUUsSUFBTixDQUFaO0FBQ0EsWUFBSTVELE1BQU0yRCxRQUFRQyxJQUFSLENBQVY7QUFDQSxZQUFLLE9BQU9DLEtBQVAsS0FBaUIsUUFBbEIsSUFBK0JBLE1BQU10RSxNQUFOLEdBQWUsQ0FBbEQsRUFBcUQ7QUFDbkRvQyxnQkFBSTNCLEdBQUosSUFBVzZELEtBQVg7QUFDRDtBQUNGLEtBTkg7QUFRQSxXQUFPbEMsR0FBUDtBQUNEO0FBZGVkLFFBQUE0QyxjQUFBLEdBQWNBLGNBQWQ7QUFrQmhCLFNBQUFLLGFBQUEsQ0FBOEJDLE9BQTlCLEVBQWdEQyxNQUFoRCxFQUE0RTtBQUUxRSxRQUFJQyxNQUFNLENBQVY7QUFDQSxRQUFJQyxNQUFNLENBQVY7QUFDQSxRQUFJQyxJQUFJdEYsVUFBVXVGLGVBQVYsQ0FBMEJMLE9BQTFCLENBQVI7QUFDQWpGLGFBQVMsbUJBQW1Cc0QsS0FBS0MsU0FBTCxDQUFlOEIsQ0FBZixDQUE1QjtBQUNBLFFBQUlFLFFBQVEsRUFBWjtBQUNBLFFBQUkxQyxNQUFNd0MsRUFBRUcsR0FBRixDQUFNLFVBQVNDLElBQVQsRUFBYTtBQUMzQixlQUFPQSxLQUFLRCxHQUFMLENBQVMsVUFBVUUsVUFBVixFQUE2QjtBQUMzQyxnQkFBSUMsU0FBU0osTUFBTUcsVUFBTixDQUFiO0FBQ0EsZ0JBQUlDLFdBQVduQyxTQUFmLEVBQTBCO0FBQ3hCbUMseUJBQVVsRCxpQkFBaUJpRCxVQUFqQixFQUE2QixJQUE3QixFQUFtQ1IsTUFBbkMsQ0FBVjtBQUNBSyxzQkFBTUcsVUFBTixJQUFvQkMsTUFBcEI7QUFDRDtBQUNEUixrQkFBTUEsTUFBTVEsT0FBT2xGLE1BQW5CO0FBQ0EyRSxrQkFBTUEsTUFBTU8sT0FBT2xGLE1BQW5CO0FBQ0EsZ0JBQUcsQ0FBQ2tGLE1BQUosRUFBWTtBQUNWLHNCQUFNLElBQUk5QixLQUFKLENBQVUsc0NBQXNDNkIsVUFBaEQsQ0FBTjtBQUNEO0FBQ0QsbUJBQU9DLE1BQVA7QUFDRCxTQVpNLENBQVA7QUFhRCxLQWRTLENBQVY7QUFlQTNGLGFBQVMsZ0JBQWdCcUYsRUFBRTVFLE1BQWxCLEdBQTJCLFdBQTNCLEdBQXlDMEUsR0FBekMsR0FBK0MsUUFBL0MsR0FBMERDLEdBQW5FO0FBQ0EsV0FBT3ZDLEdBQVA7QUFDRDtBQXhCZWQsUUFBQWlELGFBQUEsR0FBYUEsYUFBYjtBQTBCaEI7Ozs7Ozs7OztBQVdBLElBQU1ZLFFBQVE5RixNQUFNK0YsU0FBcEI7QUFFQTtBQUNBO0FBRUE7QUFFQSxTQUFBQyxjQUFBLENBQStCQyxJQUEvQixFQUF1RDtBQUNyRCxRQUFJckYsSUFBSSxFQUFSO0FBQ0EsUUFBSXNGLE9BQU8sRUFBWDtBQUNBaEcsYUFBU3NELEtBQUtDLFNBQUwsQ0FBZXdDLElBQWYsQ0FBVDtBQUNBQSxTQUFLakQsT0FBTCxDQUFhLFVBQVNtRCxjQUFULEVBQXlCQyxNQUF6QixFQUF3QztBQUNuREYsYUFBS0UsTUFBTCxJQUFlLEVBQWY7QUFDQUQsdUJBQWVuRCxPQUFmLENBQXVCLFVBQVNxRCxVQUFULEVBQXNCQyxPQUF0QixFQUFxQztBQUMxREosaUJBQUtFLE1BQUwsRUFBYUUsT0FBYixJQUF3QixFQUF4QjtBQUNBRCx1QkFBV3JELE9BQVgsQ0FBbUIsVUFBVXVELFlBQVYsRUFBd0JDLFFBQXhCLEVBQXlDO0FBQzFETixxQkFBS0UsTUFBTCxFQUFhRSxPQUFiLEVBQXNCRSxRQUF0QixJQUFrQ0QsWUFBbEM7QUFDRCxhQUZEO0FBR0QsU0FMRDtBQU1ELEtBUkQ7QUFTQXJHLGFBQVNzRCxLQUFLQyxTQUFMLENBQWV5QyxJQUFmLENBQVQ7QUFDQSxRQUFJbkQsTUFBTSxFQUFWO0FBQ0EsUUFBSTBELFFBQVEsRUFBWjtBQUNBLFNBQUksSUFBSUMsSUFBSSxDQUFaLEVBQWVBLElBQUlSLEtBQUt2RixNQUF4QixFQUFnQyxFQUFFK0YsQ0FBbEMsRUFBcUM7QUFDbkMsWUFBSUMsT0FBTyxDQUFDLEVBQUQsQ0FBWDtBQUNBLFlBQUlGLFFBQU8sRUFBWDtBQUNBLFlBQUlHLE9BQU8sRUFBWDtBQUNBLGFBQUksSUFBSUMsSUFBSSxDQUFaLEVBQWVBLElBQUlYLEtBQUtRLENBQUwsRUFBUS9GLE1BQTNCLEVBQW1DLEVBQUVrRyxDQUFyQyxFQUF3QztBQUN0QztBQUNBLGdCQUFJQyxXQUFXLEVBQWY7QUFDQSxpQkFBSSxJQUFJQyxJQUFJLENBQVosRUFBZUEsSUFBSWIsS0FBS1EsQ0FBTCxFQUFRRyxDQUFSLEVBQVdsRyxNQUE5QixFQUFzQyxFQUFFb0csQ0FBeEMsRUFBNEM7QUFDMUM3Ryx5QkFBUyxhQUFhc0QsS0FBS0MsU0FBTCxDQUFla0QsSUFBZixDQUF0QjtBQUNBRix3QkFBUSxFQUFSLENBRjBDLENBRTlCO0FBQ1p2Ryx5QkFBUyxvQkFBb0JzRCxLQUFLQyxTQUFMLENBQWVnRCxLQUFmLENBQTdCO0FBQ0EscUJBQUksSUFBSWxCLElBQUksQ0FBWixFQUFlQSxJQUFJb0IsS0FBS2hHLE1BQXhCLEVBQWdDLEVBQUU0RSxDQUFsQyxFQUFxQztBQUNsQ2tCLDBCQUFNbEIsQ0FBTixJQUFXb0IsS0FBS3BCLENBQUwsRUFBUXlCLEtBQVIsRUFBWCxDQURrQyxDQUNOO0FBQzVCOUcsNkJBQVMsaUJBQWdCcUYsQ0FBaEIsR0FBa0IsR0FBbEIsR0FBd0IvQixLQUFLQyxTQUFMLENBQWVrRCxLQUFLcEIsQ0FBTCxDQUFmLENBQWpDO0FBQ0FrQiwwQkFBTWxCLENBQU4sRUFBU25DLElBQVQsQ0FDRTBDLE1BQU1JLEtBQUtRLENBQUwsRUFBUUcsQ0FBUixFQUFXRSxDQUFYLENBQU4sQ0FERixFQUhrQyxDQUlUO0FBQ3pCN0csNkJBQVMsZUFBZXVHLE1BQU05RixNQUFyQixHQUE4QixHQUE5QixHQUFvQzZDLEtBQUtDLFNBQUwsQ0FBZWdELEtBQWYsQ0FBN0M7QUFDRjtBQUNEdkcseUJBQVMsYUFBYTJHLENBQWIsR0FBaUIsR0FBakIsR0FBdUJFLENBQXZCLEdBQTJCLGFBQTNCLEdBQTJDdkQsS0FBS0MsU0FBTCxDQUFlcUQsUUFBZixDQUFwRDtBQUNBNUcseUJBQVMsYUFBYTJHLENBQWIsR0FBaUIsR0FBakIsR0FBdUJFLENBQXZCLEdBQTJCLGFBQTNCLEdBQTJDdkQsS0FBS0MsU0FBTCxDQUFlZ0QsS0FBZixDQUFwRDtBQUNBSywyQkFBV0EsU0FBU0csTUFBVCxDQUFnQlIsS0FBaEIsQ0FBWDtBQUNBdkcseUJBQVMsY0FBYzJHLENBQWQsR0FBa0IsR0FBbEIsR0FBd0JFLENBQXhCLEdBQTRCLGFBQTVCLEdBQTRDdkQsS0FBS0MsU0FBTCxDQUFlcUQsUUFBZixDQUFyRDtBQUNELGFBbEJxQyxDQWtCcEM7QUFDRjVHLHFCQUFTLFlBQVkyRyxDQUFaLEdBQWdCLEdBQWhCLEdBQXNCRSxDQUF0QixHQUEwQixJQUExQixHQUFpQ3ZELEtBQUtDLFNBQUwsQ0FBZXFELFFBQWYsQ0FBMUM7QUFDQUgsbUJBQU9HLFFBQVA7QUFDRDtBQUNENUcsaUJBQVMscUJBQXFCd0csQ0FBckIsR0FBeUIsR0FBekIsR0FBK0JLLENBQS9CLEdBQW1DLElBQW5DLEdBQTBDdkQsS0FBS0MsU0FBTCxDQUFlcUQsUUFBZixDQUFuRDtBQUNBL0QsY0FBTUEsSUFBSWtFLE1BQUosQ0FBV04sSUFBWCxDQUFOO0FBQ0Q7QUFDRCxXQUFPNUQsR0FBUDtBQUNEO0FBOUNlZCxRQUFBK0QsY0FBQSxHQUFjQSxjQUFkO0FBZ0RoQjs7OztBQUlBLElBQU1rQixjQUErQixDQUFDLENBQUQsRUFBSSxDQUFKLEVBQU8sQ0FBUCxFQUFXLEdBQVgsQ0FBckM7QUFFQTs7Ozs7Ozs7QUFRQSxTQUFBQyxVQUFBLENBQTJCQyxJQUEzQixFQUEwQzlELFFBQTFDLEVBQTJEO0FBQ3pELFFBQUkrRCxNQUFNQyxLQUFLRCxHQUFMLENBQVNELElBQVQsQ0FBVjtBQUNBLFdBQU8sT0FBT0YsWUFBWUcsR0FBWixLQUFvQixDQUEzQixDQUFQO0FBQ0Q7QUFIZXBGLFFBQUFrRixVQUFBLEdBQVVBLFVBQVY7QUFLaEI7OztBQUdBLFNBQUFJLGtCQUFBLENBQW1DQyxTQUFuQyxFQUFtRTtBQUNqRSxRQUFJekUsTUFBTSxFQUFWO0FBQ0E3QyxhQUFTLHdCQUF3QnNELEtBQUtDLFNBQUwsQ0FBZStELFNBQWYsQ0FBakM7QUFDQUEsY0FBVXhFLE9BQVYsQ0FBa0IsVUFBU3lFLEtBQVQsRUFBZ0JyQixNQUFoQixFQUFzQjtBQUN0QyxZQUFJcUIsTUFBTW5FLFFBQU4sS0FBbUJ4QyxRQUFRNEcsWUFBL0IsRUFBNkM7QUFDM0MzRSxnQkFBSTBFLE1BQU1wRSxhQUFWLElBQTJCTixJQUFJMEUsTUFBTXBFLGFBQVYsS0FBNEIsRUFBdkQ7QUFDQU4sZ0JBQUkwRSxNQUFNcEUsYUFBVixFQUF5QkQsSUFBekIsQ0FBOEIsRUFBRXVFLEtBQU12QixNQUFSLEVBQTlCO0FBQ0Q7QUFDRixLQUxEO0FBTUFwRyxVQUFNNEgsVUFBTixDQUFpQjdFLEdBQWpCO0FBQ0EsV0FBT0EsR0FBUDtBQUNEO0FBWGVkLFFBQUFzRixrQkFBQSxHQUFrQkEsa0JBQWxCO0FBYWhCLFNBQUFNLGlCQUFBLENBQWtDTCxTQUFsQyxFQUEyQztBQUN6QyxRQUFJTSxlQUFlUCxtQkFBbUJDLFNBQW5CLENBQW5CO0FBQ0FBLGNBQVV4RSxPQUFWLENBQWtCLFVBQVN5RSxLQUFULEVBQWdCckIsTUFBaEIsRUFBc0I7QUFDdEMsWUFBSXpDLElBQUltRSxhQUFhTCxNQUFNbkUsUUFBbkIsS0FBZ0MsRUFBeEM7QUFDQUssVUFBRVgsT0FBRixDQUFVLFVBQVUrRSxTQUFWLEVBQXNDO0FBQzlDTixrQkFBTU8sU0FBTixHQUFrQlAsTUFBTU8sU0FBTixJQUFtQixDQUFyQztBQUNBUCxrQkFBTU8sU0FBTixJQUFtQmIsV0FBV2YsU0FBUzJCLFVBQVVKLEdBQTlCLEVBQW1DRixNQUFNbkUsUUFBekMsQ0FBbkI7QUFDRCxTQUhEO0FBSUQsS0FORDtBQU9BLFdBQU9rRSxTQUFQO0FBQ0Q7QUFWZXZGLFFBQUE0RixpQkFBQSxHQUFpQkEsaUJBQWpCO0FBWWhCLFNBQUFJLFNBQUEsQ0FBMEJDLGtCQUExQixFQUE0QztBQUMxQ0EsdUJBQW1CbEYsT0FBbkIsQ0FBMkIsVUFBU3dFLFNBQVQsRUFBa0I7QUFDM0NLLDBCQUFrQkwsU0FBbEI7QUFDRCxLQUZEO0FBR0EsV0FBT1Usa0JBQVA7QUFDRDtBQUxlakcsUUFBQWdHLFNBQUEsR0FBU0EsU0FBVDtBQVFoQjtBQUVBLFNBQUFFLFdBQUEsQ0FBNEJsRixLQUE1QixFQUEyQ2dCLE9BQTNDLEVBQXNFQyxPQUF0RSxFQUErRjtBQUM3RixRQUFJRCxRQUFRaEIsTUFBTTdCLEdBQWQsTUFBdUJzQyxTQUEzQixFQUFzQztBQUNwQyxlQUFPQSxTQUFQO0FBQ0Q7QUFDRCxRQUFJMEUsT0FBT25GLE1BQU03QixHQUFqQjtBQUNBLFFBQUkrQyxLQUFLRixRQUFRaEIsTUFBTTdCLEdBQWQsRUFBbUJQLFdBQW5CLEVBQVQ7QUFDQSxRQUFJd0gsTUFBTXBGLE1BQU1XLE1BQWhCO0FBRUEsUUFBSUQsSUFBSTBFLElBQUl4RSxJQUFKLENBQVNNLEVBQVQsQ0FBUjtBQUNBakUsYUFBUyxzQkFBc0JpRSxFQUF0QixHQUEyQixHQUEzQixHQUFpQ1gsS0FBS0MsU0FBTCxDQUFlRSxDQUFmLENBQTFDO0FBQ0EsUUFBSSxDQUFDQSxDQUFMLEVBQVE7QUFDTixlQUFPRCxTQUFQO0FBQ0Q7QUFDRFEsY0FBVUEsV0FBVyxFQUFyQjtBQUNBLFFBQUlHLFFBQVFoQyxlQUFlNEIsT0FBZixFQUF1QmhCLE1BQU1xQixPQUE3QixFQUFzQ3JCLE1BQU03QixHQUE1QyxDQUFaO0FBQ0FsQixhQUFTc0QsS0FBS0MsU0FBTCxDQUFlWSxLQUFmLENBQVQ7QUFDQW5FLGFBQVNzRCxLQUFLQyxTQUFMLENBQWVTLE9BQWYsQ0FBVDtBQUNBLFFBQUlBLFFBQVFLLFdBQVIsSUFBd0JGLE1BQU03QixTQUFOLEdBQWtCLENBQTlDLEVBQWlEO0FBQy9DLGVBQU9rQixTQUFQO0FBQ0Q7QUFDRCxRQUFJNEUsb0JBQW9CekQsZUFBZWxCLENBQWYsRUFBa0JWLE1BQU04QixPQUF4QixDQUF4QjtBQUNBN0UsYUFBUyxvQkFBb0JzRCxLQUFLQyxTQUFMLENBQWVSLE1BQU04QixPQUFyQixDQUE3QjtBQUNBN0UsYUFBUyxXQUFXc0QsS0FBS0MsU0FBTCxDQUFlRSxDQUFmLENBQXBCO0FBRUF6RCxhQUFTLG9CQUFvQnNELEtBQUtDLFNBQUwsQ0FBZTZFLGlCQUFmLENBQTdCO0FBQ0EsUUFBSXZGLE1BQU05QixPQUFPd0QsTUFBUCxDQUFjLEVBQWQsRUFBa0J4QixNQUFNcUIsT0FBeEIsQ0FBVjtBQUNBdkIsVUFBTTlCLE9BQU93RCxNQUFQLENBQWMxQixHQUFkLEVBQW1CdUYsaUJBQW5CLENBQU47QUFDQXZGLFVBQU05QixPQUFPd0QsTUFBUCxDQUFjMUIsR0FBZCxFQUFtQmtCLE9BQW5CLENBQU47QUFDQSxRQUFJcUUsa0JBQWtCRixJQUFsQixNQUE0QjFFLFNBQWhDLEVBQTJDO0FBQ3pDWCxZQUFJcUYsSUFBSixJQUFZRSxrQkFBa0JGLElBQWxCLENBQVo7QUFDRDtBQUNELFFBQUlsRSxRQUFRUSxRQUFaLEVBQXNCO0FBQ25CM0IsY0FBTTlCLE9BQU93RCxNQUFQLENBQWMxQixHQUFkLEVBQW1CRSxNQUFNcUIsT0FBekIsQ0FBTjtBQUNBdkIsY0FBTTlCLE9BQU93RCxNQUFQLENBQWMxQixHQUFkLEVBQW1CdUYsaUJBQW5CLENBQU47QUFDRjtBQUNEckgsV0FBTzJELE1BQVAsQ0FBYzdCLEdBQWQ7QUFDQTdDLGFBQVMsY0FBY3NELEtBQUtDLFNBQUwsQ0FBZVYsR0FBZixFQUFtQlcsU0FBbkIsRUFBNkIsQ0FBN0IsQ0FBdkI7QUFDQSxXQUFPWCxHQUFQO0FBQ0Q7QUF0Q2VkLFFBQUFrRyxXQUFBLEdBQVdBLFdBQVg7QUF3Q2hCLFNBQUFJLFlBQUEsQ0FBNkJILElBQTdCLEVBQTRDSSxTQUE1QyxFQUF5RUMsU0FBekUsRUFBb0c7QUFDbEd2SSxhQUFTLGNBQWNrSSxJQUFkLEdBQXFCLG1CQUFyQixHQUEyQzVFLEtBQUtDLFNBQUwsQ0FBZStFLFNBQWYsRUFBeUI5RSxTQUF6QixFQUFtQyxDQUFuQyxDQUEzQyxHQUNSLFdBRFEsR0FDTUYsS0FBS0MsU0FBTCxDQUFlZ0YsU0FBZixFQUF5Qi9FLFNBQXpCLEVBQW1DLENBQW5DLENBRGY7QUFFQSxRQUFJZ0YsV0FBcUJDLFdBQVdILFVBQVUsVUFBVixLQUF5QixHQUFwQyxDQUF6QjtBQUNBLFFBQUlJLFdBQXFCRCxXQUFXRixVQUFVLFVBQVYsS0FBeUIsR0FBcEMsQ0FBekI7QUFDQSxRQUFJQyxhQUFhRSxRQUFqQixFQUEyQjtBQUN6QjFJLGlCQUFTLGtCQUFrQixPQUFLMEksV0FBV0YsUUFBaEIsQ0FBM0I7QUFDQSxlQUFPLE9BQUtFLFdBQVdGLFFBQWhCLENBQVA7QUFDRDtBQUVELFFBQUlHLFVBQVVMLFVBQVUsU0FBVixLQUF3QkEsVUFBVSxTQUFWLEVBQXFCSixJQUFyQixDQUF4QixJQUF1RCxDQUFyRTtBQUNBLFFBQUlVLFVBQVVMLFVBQVUsU0FBVixLQUF3QkEsVUFBVSxTQUFWLEVBQXFCTCxJQUFyQixDQUF4QixJQUF1RCxDQUFyRTtBQUNBLFdBQU8sRUFBRVMsVUFBVUMsT0FBWixDQUFQO0FBQ0Q7QUFiZTdHLFFBQUFzRyxZQUFBLEdBQVlBLFlBQVo7QUFnQmhCO0FBRUEsU0FBQVEsZUFBQSxDQUFpQzlFLE9BQWpDLEVBQTREbkIsTUFBNUQsRUFBbUZvQixPQUFuRixFQUEwRztBQUN4RyxRQUFJa0UsT0FBT3RGLE9BQU8sQ0FBUCxFQUFVMUIsR0FBckI7QUFDQTtBQUNBLFFBQUlsQixTQUFTOEksT0FBYixFQUFzQjtBQUNwQjtBQUNBbEcsZUFBT21HLEtBQVAsQ0FBYSxVQUFVQyxLQUFWLEVBQWU7QUFDMUIsZ0JBQUlBLE1BQU05SCxHQUFOLEtBQWNnSCxJQUFsQixFQUF3QjtBQUN0QixzQkFBTSxJQUFJckUsS0FBSixDQUFVLDBDQUEwQ3FFLElBQTFDLEdBQWlELE9BQWpELEdBQTJENUUsS0FBS0MsU0FBTCxDQUFleUYsS0FBZixDQUFyRSxDQUFOO0FBQ0Q7QUFDRCxtQkFBTyxJQUFQO0FBQ0QsU0FMRDtBQU1EO0FBRUQ7QUFDQSxRQUFJbkcsTUFBTUQsT0FBTzRDLEdBQVAsQ0FBVyxVQUFTekMsS0FBVCxFQUFjO0FBQ2pDO0FBQ0EsZ0JBQU9BLE1BQU1DLElBQWI7QUFDRSxpQkFBSyxDQUFMLENBQUssVUFBTDtBQUNFLHVCQUFPYyxVQUFVZixLQUFWLEVBQWlCZ0IsT0FBakIsRUFBMEJDLE9BQTFCLENBQVA7QUFDRixpQkFBSyxDQUFMLENBQUssWUFBTDtBQUNFLHVCQUFPaUUsWUFBWWxGLEtBQVosRUFBbUJnQixPQUFuQixFQUE0QkMsT0FBNUIsQ0FBUDtBQUpKO0FBUUEsZUFBT1IsU0FBUDtBQUNELEtBWFMsRUFXUHZDLE1BWE8sQ0FXQSxVQUFTZ0ksSUFBVCxFQUFhO0FBQ3JCLGVBQU8sQ0FBQyxDQUFDQSxJQUFUO0FBQ0QsS0FiUyxFQWFQQyxJQWJPLENBY1JiLGFBQWFjLElBQWIsQ0FBa0IsSUFBbEIsRUFBd0JqQixJQUF4QixDQWRRLENBQVY7QUFnQkEsV0FBT3JGLEdBQVA7QUFDQTtBQUNBO0FBQ0Q7QUFqQ2VkLFFBQUE4RyxlQUFBLEdBQWVBLGVBQWY7QUFtQ2hCLFNBQUFPLGNBQUEsQ0FBZ0NyRixPQUFoQyxFQUEyRG1CLE1BQTNELEVBQWdGO0FBRWhGLFFBQUltRSxXQUEyQjtBQUMzQmhGLHFCQUFjLElBRGE7QUFFM0JHLGtCQUFVO0FBRmlCLEtBQS9CO0FBS0UsUUFBSThFLE9BQU9ULGdCQUFnQjlFLE9BQWhCLEVBQXdCbUIsTUFBeEIsRUFBK0JtRSxRQUEvQixDQUFYO0FBRUEsUUFBSUMsS0FBSzdJLE1BQUwsS0FBZ0IsQ0FBcEIsRUFBd0I7QUFDdEIsWUFBSThJLFdBQTJCO0FBQzNCbEYseUJBQWMsS0FEYTtBQUUzQkcsc0JBQVU7QUFGaUIsU0FBL0I7QUFJQThFLGVBQU9ULGdCQUFnQjlFLE9BQWhCLEVBQXlCbUIsTUFBekIsRUFBaUNxRSxRQUFqQyxDQUFQO0FBQ0Q7QUFDRCxXQUFPRCxJQUFQO0FBQ0Q7QUFqQmV2SCxRQUFBcUgsY0FBQSxHQUFjQSxjQUFkO0FBbUJoQixTQUFBSSxhQUFBLENBQThCQyxNQUE5QixFQUErREMsZUFBL0QsRUFBa0dDLEtBQWxHLEVBQWdIO0FBQzlHO0FBQ0EsUUFBSUYsT0FBT2hKLE1BQVAsR0FBZ0JrSixLQUFwQixFQUEyQjtBQUN6QkYsZUFBT3ZHLElBQVAsQ0FBWXdHLGVBQVo7QUFDRDtBQUNELFdBQU9ELE1BQVA7QUFDRDtBQU5lMUgsUUFBQXlILGFBQUEsR0FBYUEsYUFBYjtBQVNoQixTQUFBSSxRQUFBLENBQXlCQyxHQUF6QixFQUE0RDtBQUMxRCxRQUFJeEUsSUFBSXdFLElBQUk1SSxNQUFKLENBQVcsVUFBUzZJLFFBQVQsRUFBaUI7QUFBSSxlQUFPQSxTQUFTckosTUFBVCxHQUFrQixDQUF6QjtBQUEyQixLQUEzRCxDQUFSO0FBRUEsUUFBSW9DLE1BQUssRUFBVDtBQUNBO0FBQ0F3QyxRQUFJQSxFQUFFRyxHQUFGLENBQU0sVUFBU3VFLElBQVQsRUFBYTtBQUNyQixZQUFJQyxNQUFNRCxLQUFLRSxLQUFMLEVBQVY7QUFDQXBILGNBQU0yRyxjQUFjM0csR0FBZCxFQUFrQm1ILEdBQWxCLEVBQXNCLENBQXRCLENBQU47QUFDQSxlQUFPRCxJQUFQO0FBQ0QsS0FKRyxFQUlEOUksTUFKQyxDQUlNLFVBQVM2SSxRQUFULEVBQXlDO0FBQWMsZUFBT0EsU0FBU3JKLE1BQVQsR0FBa0IsQ0FBekI7QUFBMkIsS0FKeEYsQ0FBSjtBQUtBO0FBQ0EsV0FBT29DLEdBQVA7QUFDRDtBQVplZCxRQUFBNkgsUUFBQSxHQUFRQSxRQUFSO0FBY2hCLElBQVlNLG1CQUFnQnRLLFFBQU0sb0JBQU4sQ0FBNUI7QUFFQSxJQUFJdUssRUFBSjtBQUVBLFNBQUFDLFNBQUEsR0FBQTtBQUNFLFFBQUksQ0FBQ0QsRUFBTCxFQUFTO0FBQ1BBLGFBQUtELGlCQUFpQkcsVUFBakIsRUFBTDtBQUNEO0FBQ0QsV0FBT0YsRUFBUDtBQUNEO0FBRUQsU0FBQUcsVUFBQSxDQUEyQnZHLE9BQTNCLEVBQW9EO0FBQ2xELFFBQUl3RyxRQUFpQyxDQUFDeEcsT0FBRCxDQUFyQztBQUNBbUcscUJBQWlCTSxTQUFqQixDQUEyQjFILE9BQTNCLENBQW1DLFVBQVVvRixJQUFWLEVBQXVCO0FBQ3ZELFlBQUl1QyxXQUEwQyxFQUE5QztBQUNBRixjQUFNekgsT0FBTixDQUFjLFVBQVM0SCxRQUFULEVBQW1DO0FBQy9DLGdCQUFJQSxTQUFTeEMsSUFBVCxDQUFKLEVBQW9CO0FBQ2pCbEkseUJBQVMsMkJBQTJCa0ksSUFBcEM7QUFDQSxvQkFBSXJGLE1BQU11RyxlQUFlc0IsUUFBZixFQUF5Qk4sWUFBWWxDLElBQVosS0FBcUIsRUFBOUMsQ0FBVjtBQUNBbEkseUJBQVMsbUJBQW1Ca0ksSUFBbkIsR0FBMEIsS0FBMUIsR0FBa0M1RSxLQUFLQyxTQUFMLENBQWVWLEdBQWYsRUFBb0JXLFNBQXBCLEVBQStCLENBQS9CLENBQTNDO0FBQ0FpSCx5QkFBU3ZILElBQVQsQ0FBY0wsT0FBTyxFQUFyQjtBQUNGLGFBTEQsTUFLTztBQUNMO0FBQ0E0SCx5QkFBU3ZILElBQVQsQ0FBYyxDQUFDd0gsUUFBRCxDQUFkO0FBQ0Q7QUFDSCxTQVZBO0FBV0RILGdCQUFRWCxTQUFTYSxRQUFULENBQVI7QUFDRCxLQWREO0FBZUEsV0FBT0YsS0FBUDtBQUNEO0FBbEJleEksUUFBQXVJLFVBQUEsR0FBVUEsVUFBVjtBQXFCaEIsU0FBQUssbUJBQUEsQ0FBb0M1RyxPQUFwQyxFQUE2RDtBQUMzRCxRQUFJNkcsSUFBSU4sV0FBV3ZHLE9BQVgsQ0FBUjtBQUNBLFdBQU82RyxLQUFLQSxFQUFFLENBQUYsQ0FBWjtBQUNEO0FBSGU3SSxRQUFBNEksbUJBQUEsR0FBbUJBLG1CQUFuQjtBQUtoQjs7O0FBR0EsU0FBQUUsZUFBQSxDQUFpQzlHLE9BQWpDLEVBQTBEO0FBQ3hELFdBQU8sRUFBUDtBQUNEO0FBRmVoQyxRQUFBOEksZUFBQSxHQUFlQSxlQUFmIiwiZmlsZSI6Im1hdGNoL2lucHV0RmlsdGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XG4vKipcbiAqIHRoZSBpbnB1dCBmaWx0ZXIgc3RhZ2UgcHJlcHJvY2Vzc2VzIGEgY3VycmVudCBjb250ZXh0XG4gKlxuICogSXQgYSkgY29tYmluZXMgbXVsdGktc2VnbWVudCBhcmd1bWVudHMgaW50byBvbmUgY29udGV4dCBtZW1iZXJzXG4gKiBJdCBiKSBhdHRlbXB0cyB0byBhdWdtZW50IHRoZSBjb250ZXh0IGJ5IGFkZGl0aW9uYWwgcXVhbGlmaWNhdGlvbnNcbiAqICAgICAgICAgICAoTWlkIHRlcm0gZ2VuZXJhdGluZyBBbHRlcm5hdGl2ZXMsIGUuZy5cbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiB1bml0IHRlc3Q/XG4gKiAgICAgICAgICAgICAgICAgQ2xpZW50U2lkZVRhcmdldFJlc29sdXRpb24gLT4gc291cmNlID9cbiAqICAgICAgICAgICApXG4gKiAgU2ltcGxlIHJ1bGVzIGxpa2UgIEludGVudFxuICpcbiAqXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5pbnB1dEZpbHRlclxuICogQGZpbGUgaW5wdXRGaWx0ZXIudHNcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cbiAqL1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2xpYi9ub2RlLTQuZC50c1wiIC8+XG5jb25zdCBkaXN0YW5jZSA9IHJlcXVpcmUoJy4uL3V0aWxzL2RhbWVyYXVMZXZlbnNodGVpbicpO1xuY29uc3QgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpO1xuY29uc3QgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy91dGlscycpO1xuY29uc3QgYnJlYWtkb3duID0gcmVxdWlyZSgnLi9icmVha2Rvd24nKTtcbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ2lucHV0RmlsdGVyJyk7XG5jb25zdCBtYXRjaGRhdGEgPSByZXF1aXJlKCcuL21hdGNoZGF0YScpO1xudmFyIG9Vbml0VGVzdHMgPSBtYXRjaGRhdGEub1VuaXRUZXN0cztcbi8qKlxuICogQHBhcmFtIHNUZXh0IHtzdHJpbmd9IHRoZSB0ZXh0IHRvIG1hdGNoIHRvIE5hdlRhcmdldFJlc29sdXRpb25cbiAqIEBwYXJhbSBzVGV4dDIge3N0cmluZ30gdGhlIHF1ZXJ5IHRleHQsIGUuZy4gTmF2VGFyZ2V0XG4gKlxuICogQHJldHVybiB0aGUgZGlzdGFuY2UsIG5vdGUgdGhhdCBpcyBpcyAqbm90KiBzeW1tZXRyaWMhXG4gKi9cbmZ1bmN0aW9uIGNhbGNEaXN0YW5jZShzVGV4dDEsIHNUZXh0Mikge1xuICAgIC8vIGNvbnNvbGUubG9nKFwibGVuZ3RoMlwiICsgc1RleHQxICsgXCIgLSBcIiArIHNUZXh0MilcbiAgICB2YXIgYTAgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEuc3Vic3RyaW5nKDAsIHNUZXh0Mi5sZW5ndGgpLCBzVGV4dDIpO1xuICAgIHZhciBhID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnRvTG93ZXJDYXNlKCksIHNUZXh0Mik7XG4gICAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGE7XG59XG5jb25zdCBJRk1hdGNoID0gcmVxdWlyZSgnLi4vbWF0Y2gvaWZtYXRjaCcpO1xuZnVuY3Rpb24gbm9uUHJpdmF0ZUtleXMob0EpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMob0EpLmZpbHRlcihrZXkgPT4ge1xuICAgICAgICByZXR1cm4ga2V5WzBdICE9PSAnXyc7XG4gICAgfSk7XG59XG5mdW5jdGlvbiBjb3VudEFpbkIob0EsIG9CLCBmbkNvbXBhcmUsIGFLZXlJZ25vcmUpIHtcbiAgICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxuICAgICAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xuICAgIGZuQ29tcGFyZSA9IGZuQ29tcGFyZSB8fCBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcbiAgICB9KS5cbiAgICAgICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xuICAgICAgICAgICAgcHJldiA9IHByZXYgKyAoZm5Db21wYXJlKG9BW2tleV0sIG9CW2tleV0sIGtleSkgPyAxIDogMCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG59XG5leHBvcnRzLmNvdW50QWluQiA9IGNvdW50QWluQjtcbmZ1bmN0aW9uIHNwdXJpb3VzQW5vdEluQihvQSwgb0IsIGFLZXlJZ25vcmUpIHtcbiAgICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxuICAgICAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xuICAgIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcbiAgICB9KS5cbiAgICAgICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbn1cbmV4cG9ydHMuc3B1cmlvdXNBbm90SW5CID0gc3B1cmlvdXNBbm90SW5CO1xuZnVuY3Rpb24gbG93ZXJDYXNlKG8pIHtcbiAgICBpZiAodHlwZW9mIG8gPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgcmV0dXJuIG8udG9Mb3dlckNhc2UoKTtcbiAgICB9XG4gICAgcmV0dXJuIG87XG59XG5mdW5jdGlvbiBjb21wYXJlQ29udGV4dChvQSwgb0IsIGFLZXlJZ25vcmUpIHtcbiAgICB2YXIgZXF1YWwgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpID09PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xuICAgIHZhciBkaWZmZXJlbnQgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpICE9PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xuICAgIHZhciBzcHVyaW91c0wgPSBzcHVyaW91c0Fub3RJbkIob0EsIG9CLCBhS2V5SWdub3JlKTtcbiAgICB2YXIgc3B1cmlvdXNSID0gc3B1cmlvdXNBbm90SW5CKG9CLCBvQSwgYUtleUlnbm9yZSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZXF1YWw6IGVxdWFsLFxuICAgICAgICBkaWZmZXJlbnQ6IGRpZmZlcmVudCxcbiAgICAgICAgc3B1cmlvdXNMOiBzcHVyaW91c0wsXG4gICAgICAgIHNwdXJpb3VzUjogc3B1cmlvdXNSXG4gICAgfTtcbn1cbmV4cG9ydHMuY29tcGFyZUNvbnRleHQgPSBjb21wYXJlQ29udGV4dDtcbmZ1bmN0aW9uIGNhdGVnb3JpemVTdHJpbmcoc3RyaW5nLCBleGFjdCwgb1J1bGVzKSB7XG4gICAgLy8gc2ltcGx5IGFwcGx5IGFsbCBydWxlc1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBvUnVsZXMuZm9yRWFjaChmdW5jdGlvbiAob1J1bGUpIHtcbiAgICAgICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlIDAgLyogV09SRCAqLzpcbiAgICAgICAgICAgICAgICBpZiAoZXhhY3QgJiYgb1J1bGUud29yZCA9PT0gc3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFleGFjdCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGV2ZW5tYXRjaCA9IGNhbGNEaXN0YW5jZShvUnVsZS53b3JkLCBzdHJpbmcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobGV2ZW5tYXRjaCA8IDE1MCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLndvcmQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldmVubWF0Y2g6IGxldmVubWF0Y2hcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAxIC8qIFJFR0VYUCAqLzpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KFwiIGhlcmUgcmVnZXhwXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSkpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbSA9IG9SdWxlLnJlZ2V4cC5leGVjKHN0cmluZyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogKG9SdWxlLm1hdGNoSW5kZXggIT09IHVuZGVmaW5lZCAmJiBtW29SdWxlLm1hdGNoSW5kZXhdKSB8fCBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidW5rbm93biB0eXBlXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5jYXRlZ29yaXplU3RyaW5nID0gY2F0ZWdvcml6ZVN0cmluZztcbi8qKlxuICpcbiAqIE9wdGlvbnMgbWF5IGJlIHtcbiAqIG1hdGNob3RoZXJzIDogdHJ1ZSwgID0+IG9ubHkgcnVsZXMgd2hlcmUgYWxsIG90aGVycyBtYXRjaCBhcmUgY29uc2lkZXJlZFxuICogYXVnbWVudCA6IHRydWUsXG4gKiBvdmVycmlkZSA6IHRydWUgfSAgPT5cbiAqXG4gKi9cbmZ1bmN0aW9uIG1hdGNoV29yZChvUnVsZSwgY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChjb250ZXh0W29SdWxlLmtleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgczIgPSBvUnVsZS53b3JkLnRvTG93ZXJDYXNlKCk7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCwgb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcbiAgICBpZiAob3B0aW9ucy5tYXRjaG90aGVycyAmJiAoZGVsdGEuZGlmZmVyZW50ID4gMCkpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIGMgPSBjYWxjRGlzdGFuY2UoczIsIHMxKTtcbiAgICBkZWJ1Z2xvZyhcIiBzMSA8PiBzMiBcIiArIHMxICsgXCI8PlwiICsgczIgKyBcIiAgPT46IFwiICsgYyk7XG4gICAgaWYgKGMgPCAxNTApIHtcbiAgICAgICAgdmFyIHJlcyA9IE9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpO1xuICAgICAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgY29udGV4dCk7XG4gICAgICAgIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XG4gICAgICAgICAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgb1J1bGUuZm9sbG93cyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZm9yY2Uga2V5IHByb3BlcnR5XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCcgb2JqZWN0Y2F0ZWdvcnknLCByZXNbJ3N5c3RlbU9iamVjdENhdGVnb3J5J10pO1xuICAgICAgICByZXNbb1J1bGUua2V5XSA9IG9SdWxlLmZvbGxvd3Nbb1J1bGUua2V5XSB8fCByZXNbb1J1bGUua2V5XTtcbiAgICAgICAgcmVzLl93ZWlnaHQgPSBPYmplY3QuYXNzaWduKHt9LCByZXMuX3dlaWdodCk7XG4gICAgICAgIHJlcy5fd2VpZ2h0W29SdWxlLmtleV0gPSBjO1xuICAgICAgICBPYmplY3QuZnJlZXplKHJlcyk7XG4gICAgICAgIGRlYnVnbG9nKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbmV4cG9ydHMubWF0Y2hXb3JkID0gbWF0Y2hXb3JkO1xuZnVuY3Rpb24gZXh0cmFjdEFyZ3NNYXAobWF0Y2gsIGFyZ3NNYXApIHtcbiAgICB2YXIgcmVzID0ge307XG4gICAgaWYgKCFhcmdzTWFwKSB7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIE9iamVjdC5rZXlzKGFyZ3NNYXApLmZvckVhY2goZnVuY3Rpb24gKGlLZXkpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gbWF0Y2hbaUtleV07XG4gICAgICAgIHZhciBrZXkgPSBhcmdzTWFwW2lLZXldO1xuICAgICAgICBpZiAoKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikgJiYgdmFsdWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmVzW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmV4dHJhY3RBcmdzTWFwID0gZXh0cmFjdEFyZ3NNYXA7XG5mdW5jdGlvbiBhbmFseXplU3RyaW5nKHNTdHJpbmcsIGFSdWxlcykge1xuICAgIHZhciBjbnQgPSAwO1xuICAgIHZhciBmYWMgPSAxO1xuICAgIHZhciB1ID0gYnJlYWtkb3duLmJyZWFrZG93blN0cmluZyhzU3RyaW5nKTtcbiAgICBkZWJ1Z2xvZyhcImhlcmUgYnJlYWtkb3duXCIgKyBKU09OLnN0cmluZ2lmeSh1KSk7XG4gICAgdmFyIHdvcmRzID0ge307XG4gICAgdmFyIHJlcyA9IHUubWFwKGZ1bmN0aW9uIChhQXJyKSB7XG4gICAgICAgIHJldHVybiBhQXJyLm1hcChmdW5jdGlvbiAoc1dvcmRHcm91cCkge1xuICAgICAgICAgICAgdmFyIHNlZW5JdCA9IHdvcmRzW3NXb3JkR3JvdXBdO1xuICAgICAgICAgICAgaWYgKHNlZW5JdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgc2Vlbkl0ID0gY2F0ZWdvcml6ZVN0cmluZyhzV29yZEdyb3VwLCB0cnVlLCBhUnVsZXMpO1xuICAgICAgICAgICAgICAgIHdvcmRzW3NXb3JkR3JvdXBdID0gc2Vlbkl0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY250ID0gY250ICsgc2Vlbkl0Lmxlbmd0aDtcbiAgICAgICAgICAgIGZhYyA9IGZhYyAqIHNlZW5JdC5sZW5ndGg7XG4gICAgICAgICAgICBpZiAoIXNlZW5JdCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGluZyBhdCBsZWFzdCBvbmUgbWF0Y2ggZm9yIFwiICsgc1dvcmRHcm91cCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc2Vlbkl0O1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBkZWJ1Z2xvZyhcIiBzZW50ZW5jZXMgXCIgKyB1Lmxlbmd0aCArIFwiIG1hdGNoZXMgXCIgKyBjbnQgKyBcIiBmYWM6IFwiICsgZmFjKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5hbmFseXplU3RyaW5nID0gYW5hbHl6ZVN0cmluZztcbi8qXG5bIFthLGJdLCBbYyxkXV1cblxuMDAgYVxuMDEgYlxuMTAgY1xuMTEgZFxuMTIgY1xuKi9cbmNvbnN0IGNsb25lID0gdXRpbHMuY2xvbmVEZWVwO1xuLy8gd2UgY2FuIHJlcGxpY2F0ZSB0aGUgdGFpbCBvciB0aGUgaGVhZCxcbi8vIHdlIHJlcGxpY2F0ZSB0aGUgdGFpbCBhcyBpdCBpcyBzbWFsbGVyLlxuLy8gW2EsYixjIF1cbmZ1bmN0aW9uIGV4cGFuZE1hdGNoQXJyKGRlZXApIHtcbiAgICB2YXIgYSA9IFtdO1xuICAgIHZhciBsaW5lID0gW107XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZGVlcCkpO1xuICAgIGRlZXAuZm9yRWFjaChmdW5jdGlvbiAodUJyZWFrRG93bkxpbmUsIGlJbmRleCkge1xuICAgICAgICBsaW5lW2lJbmRleF0gPSBbXTtcbiAgICAgICAgdUJyZWFrRG93bkxpbmUuZm9yRWFjaChmdW5jdGlvbiAoYVdvcmRHcm91cCwgd2dJbmRleCkge1xuICAgICAgICAgICAgbGluZVtpSW5kZXhdW3dnSW5kZXhdID0gW107XG4gICAgICAgICAgICBhV29yZEdyb3VwLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkVmFyaWFudCwgaVdWSW5kZXgpIHtcbiAgICAgICAgICAgICAgICBsaW5lW2lJbmRleF1bd2dJbmRleF1baVdWSW5kZXhdID0gb1dvcmRWYXJpYW50O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGxpbmUpKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgdmFyIG52ZWNzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciB2ZWNzID0gW1tdXTtcbiAgICAgICAgdmFyIG52ZWNzID0gW107XG4gICAgICAgIHZhciBydmVjID0gW107XG4gICAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgbGluZVtpXS5sZW5ndGg7ICsraykge1xuICAgICAgICAgICAgLy92ZWNzIGlzIHRoZSB2ZWN0b3Igb2YgYWxsIHNvIGZhciBzZWVuIHZhcmlhbnRzIHVwIHRvIGsgd2dzLlxuICAgICAgICAgICAgdmFyIG5leHRCYXNlID0gW107XG4gICAgICAgICAgICBmb3IgKHZhciBsID0gMDsgbCA8IGxpbmVbaV1ba10ubGVuZ3RoOyArK2wpIHtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcInZlY3Mgbm93XCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzKSk7XG4gICAgICAgICAgICAgICAgbnZlY3MgPSBbXTsgLy92ZWNzLnNsaWNlKCk7IC8vIGNvcHkgdGhlIHZlY1tpXSBiYXNlIHZlY3RvcjtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcInZlY3MgY29waWVkIG5vd1wiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciB1ID0gMDsgdSA8IHZlY3MubGVuZ3RoOyArK3UpIHtcbiAgICAgICAgICAgICAgICAgICAgbnZlY3NbdV0gPSB2ZWNzW3VdLnNsaWNlKCk7IC8vXG4gICAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKFwiY29waWVkIHZlY3NbXCIgKyB1ICsgXCJdXCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzW3VdKSk7XG4gICAgICAgICAgICAgICAgICAgIG52ZWNzW3VdLnB1c2goY2xvbmUobGluZVtpXVtrXVtsXSkpOyAvLyBwdXNoIHRoZSBsdGggdmFyaWFudFxuICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcIm5vdyBudmVjcyBcIiArIG52ZWNzLmxlbmd0aCArIFwiIFwiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZGVidWdsb2coXCIgYXQgICAgIFwiICsgayArIFwiOlwiICsgbCArIFwiIG5leHRiYXNlID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSk7XG4gICAgICAgICAgICAgICAgZGVidWdsb2coXCIgYXBwZW5kIFwiICsgayArIFwiOlwiICsgbCArIFwiIG52ZWNzICAgID5cIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSk7XG4gICAgICAgICAgICAgICAgbmV4dEJhc2UgPSBuZXh0QmFzZS5jb25jYXQobnZlY3MpO1xuICAgICAgICAgICAgICAgIGRlYnVnbG9nKFwiICByZXN1bHQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbnZlY3MgICAgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKTtcbiAgICAgICAgICAgIH0gLy9jb25zdHJ1XG4gICAgICAgICAgICBkZWJ1Z2xvZyhcIm5vdyBhdCBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpO1xuICAgICAgICAgICAgdmVjcyA9IG5leHRCYXNlO1xuICAgICAgICB9XG4gICAgICAgIGRlYnVnbG9nKFwiQVBQRU5ESU5HIFRPIFJFU1wiICsgaSArIFwiOlwiICsgbCArIFwiID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSk7XG4gICAgICAgIHJlcyA9IHJlcy5jb25jYXQodmVjcyk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmV4cGFuZE1hdGNoQXJyID0gZXhwYW5kTWF0Y2hBcnI7XG4vKipcbiAqIFdlaWdodCBmYWN0b3IgdG8gdXNlIG9uIHRoZSBhIGdpdmVuIHdvcmQgZGlzdGFuY2VcbiAqIG9mIDAsIDEsIDIsIDMgLi4uLlxuICovXG5jb25zdCBhRGlzdFdlaWdodCA9IFswLCAzLCAxLCAwLjJdO1xuLyoqXG4gKiBDYWxjdWxhdGUgYSB3ZWlnaHQgZmFjdG9yIGZvciBhIGdpdmVuIGRpc3RhbmNlIGFuZFxuICogY2F0ZWdvcnlcbiAqIEBwYXJhbSB7aW50ZWdlcn0gZGlzdCBkaXN0YW5jZSBpbiB3b3Jkc1xuICogQHBhcmFtIHtzdHJpbmd9IGNhdGVnb3J5IGNhdGVnb3J5IHRvIHVzZVxuICogQHJldHVybnMge251bWJlcn0gYSBkaXN0YW5jZSBmYWN0b3IgPj0gMVxuICogIDEuMCBmb3Igbm8gZWZmZWN0XG4gKi9cbmZ1bmN0aW9uIGRpc3RXZWlnaHQoZGlzdCwgY2F0ZWdvcnkpIHtcbiAgICB2YXIgYWJzID0gTWF0aC5hYnMoZGlzdCk7XG4gICAgcmV0dXJuIDEuMCArIChhRGlzdFdlaWdodFthYnNdIHx8IDApO1xufVxuZXhwb3J0cy5kaXN0V2VpZ2h0ID0gZGlzdFdlaWdodDtcbi8qKlxuICogR2l2ZW4gYSBzZW50ZW5jZSwgZXh0YWN0IGNhdGVnb3JpZXNcbiAqL1xuZnVuY3Rpb24gZXh0cmFjdENhdGVnb3J5TWFwKG9TZW50ZW5jZSkge1xuICAgIHZhciByZXMgPSB7fTtcbiAgICBkZWJ1Z2xvZygnZXh0cmFjdENhdGVnb3J5TWFwICcgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpKTtcbiAgICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGlJbmRleCkge1xuICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IElGTWF0Y2guQ0FUX0NBVEVHT1JZKSB7XG4gICAgICAgICAgICByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10gfHwgW107XG4gICAgICAgICAgICByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10ucHVzaCh7IHBvczogaUluZGV4IH0pO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgdXRpbHMuZGVlcEZyZWV6ZShyZXMpO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmV4dHJhY3RDYXRlZ29yeU1hcCA9IGV4dHJhY3RDYXRlZ29yeU1hcDtcbmZ1bmN0aW9uIHJlaW5Gb3JjZVNlbnRlbmNlKG9TZW50ZW5jZSkge1xuICAgIHZhciBvQ2F0ZWdvcnlNYXAgPSBleHRyYWN0Q2F0ZWdvcnlNYXAob1NlbnRlbmNlKTtcbiAgICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGlJbmRleCkge1xuICAgICAgICB2YXIgbSA9IG9DYXRlZ29yeU1hcFtvV29yZC5jYXRlZ29yeV0gfHwgW107XG4gICAgICAgIG0uZm9yRWFjaChmdW5jdGlvbiAob1Bvc2l0aW9uKSB7XG4gICAgICAgICAgICBvV29yZC5yZWluZm9yY2UgPSBvV29yZC5yZWluZm9yY2UgfHwgMTtcbiAgICAgICAgICAgIG9Xb3JkLnJlaW5mb3JjZSAqPSBkaXN0V2VpZ2h0KGlJbmRleCAtIG9Qb3NpdGlvbi5wb3MsIG9Xb3JkLmNhdGVnb3J5KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIG9TZW50ZW5jZTtcbn1cbmV4cG9ydHMucmVpbkZvcmNlU2VudGVuY2UgPSByZWluRm9yY2VTZW50ZW5jZTtcbmZ1bmN0aW9uIHJlaW5Gb3JjZShhQ2F0ZWdvcnlpemVkQXJyYXkpIHtcbiAgICBhQ2F0ZWdvcnlpemVkQXJyYXkuZm9yRWFjaChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgIHJlaW5Gb3JjZVNlbnRlbmNlKG9TZW50ZW5jZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGFDYXRlZ29yeWl6ZWRBcnJheTtcbn1cbmV4cG9ydHMucmVpbkZvcmNlID0gcmVpbkZvcmNlO1xuLy8vIGJlbG93IG1heSBubyBsb25nZXIgYmUgdXNlZFxuZnVuY3Rpb24gbWF0Y2hSZWdFeHAob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAoY29udGV4dFtvUnVsZS5rZXldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIHNLZXkgPSBvUnVsZS5rZXk7XG4gICAgdmFyIHMxID0gY29udGV4dFtvUnVsZS5rZXldLnRvTG93ZXJDYXNlKCk7XG4gICAgdmFyIHJlZyA9IG9SdWxlLnJlZ2V4cDtcbiAgICB2YXIgbSA9IHJlZy5leGVjKHMxKTtcbiAgICBkZWJ1Z2xvZyhcImFwcGx5aW5nIHJlZ2V4cDogXCIgKyBzMSArIFwiIFwiICsgSlNPTi5zdHJpbmdpZnkobSkpO1xuICAgIGlmICghbSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB2YXIgZGVsdGEgPSBjb21wYXJlQ29udGV4dChjb250ZXh0LCBvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlbHRhKSk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkob3B0aW9ucykpO1xuICAgIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgb0V4dHJhY3RlZENvbnRleHQgPSBleHRyYWN0QXJnc01hcChtLCBvUnVsZS5hcmdzTWFwKTtcbiAgICBkZWJ1Z2xvZyhcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUuYXJnc01hcCkpO1xuICAgIGRlYnVnbG9nKFwibWF0Y2ggXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XG4gICAgZGVidWdsb2coXCJleHRyYWN0ZWQgYXJncyBcIiArIEpTT04uc3RyaW5naWZ5KG9FeHRyYWN0ZWRDb250ZXh0KSk7XG4gICAgdmFyIHJlcyA9IE9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpO1xuICAgIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBvRXh0cmFjdGVkQ29udGV4dCk7XG4gICAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIGNvbnRleHQpO1xuICAgIGlmIChvRXh0cmFjdGVkQ29udGV4dFtzS2V5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlc1tzS2V5XSA9IG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xuICAgICAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgb1J1bGUuZm9sbG93cyk7XG4gICAgICAgIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBvRXh0cmFjdGVkQ29udGV4dCk7XG4gICAgfVxuICAgIE9iamVjdC5mcmVlemUocmVzKTtcbiAgICBkZWJ1Z2xvZygnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMubWF0Y2hSZWdFeHAgPSBtYXRjaFJlZ0V4cDtcbmZ1bmN0aW9uIHNvcnRCeVdlaWdodChzS2V5LCBvQ29udGV4dEEsIG9Db250ZXh0Qikge1xuICAgIGRlYnVnbG9nKCdzb3J0aW5nOiAnICsgc0tleSArICdpbnZva2VkIHdpdGhcXG4gMTonICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHRBLCB1bmRlZmluZWQsIDIpICtcbiAgICAgICAgXCIgdnMgXFxuIDI6XCIgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEIsIHVuZGVmaW5lZCwgMikpO1xuICAgIHZhciByYW5raW5nQSA9IHBhcnNlRmxvYXQob0NvbnRleHRBW1wiX3JhbmtpbmdcIl0gfHwgXCIxXCIpO1xuICAgIHZhciByYW5raW5nQiA9IHBhcnNlRmxvYXQob0NvbnRleHRCW1wiX3JhbmtpbmdcIl0gfHwgXCIxXCIpO1xuICAgIGlmIChyYW5raW5nQSAhPT0gcmFua2luZ0IpIHtcbiAgICAgICAgZGVidWdsb2coXCIgcmFua2luIGRlbHRhXCIgKyAxMDAgKiAocmFua2luZ0IgLSByYW5raW5nQSkpO1xuICAgICAgICByZXR1cm4gMTAwICogKHJhbmtpbmdCIC0gcmFua2luZ0EpO1xuICAgIH1cbiAgICB2YXIgd2VpZ2h0QSA9IG9Db250ZXh0QVtcIl93ZWlnaHRcIl0gJiYgb0NvbnRleHRBW1wiX3dlaWdodFwiXVtzS2V5XSB8fCAwO1xuICAgIHZhciB3ZWlnaHRCID0gb0NvbnRleHRCW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdW3NLZXldIHx8IDA7XG4gICAgcmV0dXJuICsod2VpZ2h0QSAtIHdlaWdodEIpO1xufVxuZXhwb3J0cy5zb3J0QnlXZWlnaHQgPSBzb3J0QnlXZWlnaHQ7XG4vLyBXb3JkLCBTeW5vbnltLCBSZWdleHAgLyBFeHRyYWN0aW9uUnVsZVxuZnVuY3Rpb24gYXVnbWVudENvbnRleHQxKGNvbnRleHQsIG9SdWxlcywgb3B0aW9ucykge1xuICAgIHZhciBzS2V5ID0gb1J1bGVzWzBdLmtleTtcbiAgICAvLyBjaGVjayB0aGF0IHJ1bGVcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAvLyBjaGVjayBjb25zaXN0ZW5jeVxuICAgICAgICBvUnVsZXMuZXZlcnkoZnVuY3Rpb24gKGlSdWxlKSB7XG4gICAgICAgICAgICBpZiAoaVJ1bGUua2V5ICE9PSBzS2V5KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW5ob21vZ2Vub3VzIGtleXMgaW4gcnVsZXMsIGV4cGVjdGVkIFwiICsgc0tleSArIFwiIHdhcyBcIiArIEpTT04uc3RyaW5naWZ5KGlSdWxlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8vIGxvb2sgZm9yIHJ1bGVzIHdoaWNoIG1hdGNoXG4gICAgdmFyIHJlcyA9IG9SdWxlcy5tYXAoZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgIC8vIGlzIHRoaXMgcnVsZSBhcHBsaWNhYmxlXG4gICAgICAgIHN3aXRjaCAob1J1bGUudHlwZSkge1xuICAgICAgICAgICAgY2FzZSAwIC8qIFdPUkQgKi86XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hdGNoV29yZChvUnVsZSwgY29udGV4dCwgb3B0aW9ucyk7XG4gICAgICAgICAgICBjYXNlIDEgLyogUkVHRVhQICovOlxuICAgICAgICAgICAgICAgIHJldHVybiBtYXRjaFJlZ0V4cChvUnVsZSwgY29udGV4dCwgb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9KS5maWx0ZXIoZnVuY3Rpb24gKG9yZXMpIHtcbiAgICAgICAgcmV0dXJuICEhb3JlcztcbiAgICB9KS5zb3J0KHNvcnRCeVdlaWdodC5iaW5kKHRoaXMsIHNLZXkpKTtcbiAgICByZXR1cm4gcmVzO1xuICAgIC8vIE9iamVjdC5rZXlzKCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xuICAgIC8vIH0pO1xufVxuZXhwb3J0cy5hdWdtZW50Q29udGV4dDEgPSBhdWdtZW50Q29udGV4dDE7XG5mdW5jdGlvbiBhdWdtZW50Q29udGV4dChjb250ZXh0LCBhUnVsZXMpIHtcbiAgICB2YXIgb3B0aW9uczEgPSB7XG4gICAgICAgIG1hdGNob3RoZXJzOiB0cnVlLFxuICAgICAgICBvdmVycmlkZTogZmFsc2VcbiAgICB9O1xuICAgIHZhciBhUmVzID0gYXVnbWVudENvbnRleHQxKGNvbnRleHQsIGFSdWxlcywgb3B0aW9uczEpO1xuICAgIGlmIChhUmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB2YXIgb3B0aW9uczIgPSB7XG4gICAgICAgICAgICBtYXRjaG90aGVyczogZmFsc2UsXG4gICAgICAgICAgICBvdmVycmlkZTogdHJ1ZVxuICAgICAgICB9O1xuICAgICAgICBhUmVzID0gYXVnbWVudENvbnRleHQxKGNvbnRleHQsIGFSdWxlcywgb3B0aW9uczIpO1xuICAgIH1cbiAgICByZXR1cm4gYVJlcztcbn1cbmV4cG9ydHMuYXVnbWVudENvbnRleHQgPSBhdWdtZW50Q29udGV4dDtcbmZ1bmN0aW9uIGluc2VydE9yZGVyZWQocmVzdWx0LCBpSW5zZXJ0ZWRNZW1iZXIsIGxpbWl0KSB7XG4gICAgLy8gVE9ETzogdXNlIHNvbWUgd2VpZ2h0XG4gICAgaWYgKHJlc3VsdC5sZW5ndGggPCBsaW1pdCkge1xuICAgICAgICByZXN1bHQucHVzaChpSW5zZXJ0ZWRNZW1iZXIpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuZXhwb3J0cy5pbnNlcnRPcmRlcmVkID0gaW5zZXJ0T3JkZXJlZDtcbmZ1bmN0aW9uIHRha2VUb3BOKGFycikge1xuICAgIHZhciB1ID0gYXJyLmZpbHRlcihmdW5jdGlvbiAoaW5uZXJBcnIpIHsgcmV0dXJuIGlubmVyQXJyLmxlbmd0aCA+IDA7IH0pO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICAvLyBzaGlmdCBvdXQgdGhlIHRvcCBvbmVzXG4gICAgdSA9IHUubWFwKGZ1bmN0aW9uIChpQXJyKSB7XG4gICAgICAgIHZhciB0b3AgPSBpQXJyLnNoaWZ0KCk7XG4gICAgICAgIHJlcyA9IGluc2VydE9yZGVyZWQocmVzLCB0b3AsIDUpO1xuICAgICAgICByZXR1cm4gaUFycjtcbiAgICB9KS5maWx0ZXIoZnVuY3Rpb24gKGlubmVyQXJyKSB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwOyB9KTtcbiAgICAvLyBhcyBBcnJheTxBcnJheTxJRk1hdGNoLmNvbnRleHQ+PlxuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLnRha2VUb3BOID0gdGFrZVRvcE47XG5jb25zdCBpbnB1dEZpbHRlclJ1bGVzID0gcmVxdWlyZSgnLi9pbnB1dEZpbHRlclJ1bGVzJyk7XG52YXIgcm07XG5mdW5jdGlvbiBnZXRSTU9uY2UoKSB7XG4gICAgaWYgKCFybSkge1xuICAgICAgICBybSA9IGlucHV0RmlsdGVyUnVsZXMuZ2V0UnVsZU1hcCgpO1xuICAgIH1cbiAgICByZXR1cm4gcm07XG59XG5mdW5jdGlvbiBhcHBseVJ1bGVzKGNvbnRleHQpIHtcbiAgICB2YXIgYmVzdE4gPSBbY29udGV4dF07XG4gICAgaW5wdXRGaWx0ZXJSdWxlcy5vS2V5T3JkZXIuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xuICAgICAgICB2YXIgYmVzdE5leHQgPSBbXTtcbiAgICAgICAgYmVzdE4uZm9yRWFjaChmdW5jdGlvbiAob0NvbnRleHQpIHtcbiAgICAgICAgICAgIGlmIChvQ29udGV4dFtzS2V5XSkge1xuICAgICAgICAgICAgICAgIGRlYnVnbG9nKCcqKiBhcHBseWluZyBydWxlcyBmb3IgJyArIHNLZXkpO1xuICAgICAgICAgICAgICAgIHZhciByZXMgPSBhdWdtZW50Q29udGV4dChvQ29udGV4dCwgZ2V0Uk1PbmNlKClbc0tleV0gfHwgW10pO1xuICAgICAgICAgICAgICAgIGRlYnVnbG9nKCcqKiByZXN1bHQgZm9yICcgKyBzS2V5ICsgJyA9ICcgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgICAgICAgICAgIGJlc3ROZXh0LnB1c2gocmVzIHx8IFtdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIHJ1bGUgbm90IHJlbGV2YW50XG4gICAgICAgICAgICAgICAgYmVzdE5leHQucHVzaChbb0NvbnRleHRdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGJlc3ROID0gdGFrZVRvcE4oYmVzdE5leHQpO1xuICAgIH0pO1xuICAgIHJldHVybiBiZXN0Tjtcbn1cbmV4cG9ydHMuYXBwbHlSdWxlcyA9IGFwcGx5UnVsZXM7XG5mdW5jdGlvbiBhcHBseVJ1bGVzUGlja0ZpcnN0KGNvbnRleHQpIHtcbiAgICB2YXIgciA9IGFwcGx5UnVsZXMoY29udGV4dCk7XG4gICAgcmV0dXJuIHIgJiYgclswXTtcbn1cbmV4cG9ydHMuYXBwbHlSdWxlc1BpY2tGaXJzdCA9IGFwcGx5UnVsZXNQaWNrRmlyc3Q7XG4vKipcbiAqIERlY2lkZSB3aGV0aGVyIHRvIHJlcXVlcnkgZm9yIGEgY29udGV0XG4gKi9cbmZ1bmN0aW9uIGRlY2lkZU9uUmVRdWVyeShjb250ZXh0KSB7XG4gICAgcmV0dXJuIFtdO1xufVxuZXhwb3J0cy5kZWNpZGVPblJlUXVlcnkgPSBkZWNpZGVPblJlUXVlcnk7XG4iLCIvKipcclxuICogdGhlIGlucHV0IGZpbHRlciBzdGFnZSBwcmVwcm9jZXNzZXMgYSBjdXJyZW50IGNvbnRleHRcclxuICpcclxuICogSXQgYSkgY29tYmluZXMgbXVsdGktc2VnbWVudCBhcmd1bWVudHMgaW50byBvbmUgY29udGV4dCBtZW1iZXJzXHJcbiAqIEl0IGIpIGF0dGVtcHRzIHRvIGF1Z21lbnQgdGhlIGNvbnRleHQgYnkgYWRkaXRpb25hbCBxdWFsaWZpY2F0aW9uc1xyXG4gKiAgICAgICAgICAgKE1pZCB0ZXJtIGdlbmVyYXRpbmcgQWx0ZXJuYXRpdmVzLCBlLmcuXHJcbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiB1bml0IHRlc3Q/XHJcbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiBzb3VyY2UgP1xyXG4gKiAgICAgICAgICAgKVxyXG4gKiAgU2ltcGxlIHJ1bGVzIGxpa2UgIEludGVudFxyXG4gKlxyXG4gKlxyXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5pbnB1dEZpbHRlclxyXG4gKiBAZmlsZSBpbnB1dEZpbHRlci50c1xyXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXHJcbiAqL1xyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vbGliL25vZGUtNC5kLnRzXCIgLz5cclxuaW1wb3J0ICogYXMgZGlzdGFuY2UgZnJvbSAnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluJztcclxuXHJcbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcclxuXHJcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gJy4uL3V0aWxzL3V0aWxzJztcclxuXHJcbmltcG9ydCAqIGFzIElNYXRjaCBmcm9tICcuL2lmbWF0Y2gnO1xyXG5cclxuaW1wb3J0ICogYXMgYnJlYWtkb3duIGZyb20gJy4vYnJlYWtkb3duJztcclxuXHJcbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ2lucHV0RmlsdGVyJylcclxuXHJcbmltcG9ydCAqIGFzIG1hdGNoZGF0YSBmcm9tICcuL21hdGNoZGF0YSc7XHJcbiAgdmFyIG9Vbml0VGVzdHMgPSBtYXRjaGRhdGEub1VuaXRUZXN0c1xyXG5cclxuICAvKipcclxuICAgKiBAcGFyYW0gc1RleHQge3N0cmluZ30gdGhlIHRleHQgdG8gbWF0Y2ggdG8gTmF2VGFyZ2V0UmVzb2x1dGlvblxyXG4gICAqIEBwYXJhbSBzVGV4dDIge3N0cmluZ30gdGhlIHF1ZXJ5IHRleHQsIGUuZy4gTmF2VGFyZ2V0XHJcbiAgICpcclxuICAgKiBAcmV0dXJuIHRoZSBkaXN0YW5jZSwgbm90ZSB0aGF0IGlzIGlzICpub3QqIHN5bW1ldHJpYyFcclxuICAgKi9cclxuICBmdW5jdGlvbiBjYWxjRGlzdGFuY2UgKHNUZXh0MSA6IHN0cmluZywgc1RleHQyIDogc3RyaW5nKSA6IG51bWJlciB7XHJcbiAgICAvLyBjb25zb2xlLmxvZyhcImxlbmd0aDJcIiArIHNUZXh0MSArIFwiIC0gXCIgKyBzVGV4dDIpXHJcbiAgICB2YXIgYTAgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEuc3Vic3RyaW5nKDAsIHNUZXh0Mi5sZW5ndGgpLCBzVGV4dDIpXHJcbiAgICB2YXIgYSA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS50b0xvd2VyQ2FzZSgpLCBzVGV4dDIpXHJcbiAgICByZXR1cm4gYTAgKiA1MDAgLyBzVGV4dDIubGVuZ3RoICsgYVxyXG4gIH1cclxuXHJcbmltcG9ydCAqIGFzIElGTWF0Y2ggZnJvbSAnLi4vbWF0Y2gvaWZtYXRjaCc7XHJcblxyXG50eXBlIElSdWxlID0gSUZNYXRjaC5JUnVsZVxyXG5cclxuXHJcbmludGVyZmFjZSBJTWF0Y2hPcHRpb25zIHtcclxuICBtYXRjaG90aGVycz8gOiBib29sZWFuLFxyXG4gIGF1Z21lbnQ/OiBib29sZWFuLFxyXG4gIG92ZXJyaWRlPyA6IGJvb2xlYW5cclxufVxyXG5cclxuaW50ZXJmYWNlIElNYXRjaENvdW50IHtcclxuICBlcXVhbCA6IG51bWJlclxyXG4gIGRpZmZlcmVudCA6IG51bWJlclxyXG4gIHNwdXJpb3VzUiA6IG51bWJlclxyXG4gIHNwdXJpb3VzTCA6IG51bWJlclxyXG59XHJcblxyXG50eXBlIEVudW1SdWxlVHlwZSA9IElGTWF0Y2guRW51bVJ1bGVUeXBlXHJcblxyXG5cclxuZnVuY3Rpb24gbm9uUHJpdmF0ZUtleXMob0EpIHtcclxuICByZXR1cm4gT2JqZWN0LmtleXMob0EpLmZpbHRlcigga2V5ID0+IHtcclxuICAgIHJldHVybiBrZXlbMF0gIT09ICdfJztcclxuICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNvdW50QWluQiAob0EsIG9CLCBmbkNvbXBhcmUsIGFLZXlJZ25vcmU/KSA6IG51bWJlcntcclxuICAgYUtleUlnbm9yZSA9IEFycmF5LmlzQXJyYXkoYUtleUlnbm9yZSkgPyAgYUtleUlnbm9yZSA6XHJcbiAgICAgIHR5cGVvZiBhS2V5SWdub3JlID09PSBcInN0cmluZ1wiID8gW2FLZXlJZ25vcmVdIDogIFtdO1xyXG4gICBmbkNvbXBhcmUgPSBmbkNvbXBhcmUgfHwgZnVuY3Rpb24oKSB7IHJldHVybiB0cnVlOyB9XHJcbiAgIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKCBmdW5jdGlvbihrZXkpIHtcclxuICAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xyXG4gICAgfSkuXHJcbiAgICByZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xyXG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9CLCBrZXkpKSB7XHJcbiAgICAgICAgcHJldiA9IHByZXYgKyAoZm5Db21wYXJlKG9BW2tleV0sb0Jba2V5XSwga2V5KSA/IDEgOiAwKVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBwcmV2XHJcbiAgICB9LCAwKVxyXG4gIH1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzcHVyaW91c0Fub3RJbkIob0Esb0IsIGFLZXlJZ25vcmU/ICkge1xyXG4gIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gIGFLZXlJZ25vcmUgOlxyXG4gICAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6ICBbXTtcclxuICAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoIGZ1bmN0aW9uKGtleSkge1xyXG4gICAgIHJldHVybiBhS2V5SWdub3JlLmluZGV4T2Yoa2V5KSA8IDA7XHJcbiAgICB9KS5cclxuICAgIHJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XHJcbiAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9CLCBrZXkpKSB7XHJcbiAgICAgICAgcHJldiA9IHByZXYgKyAxXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHByZXZcclxuICAgIH0sIDApXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvd2VyQ2FzZShvKSB7XHJcbiAgaWYgKHR5cGVvZiBvID09PSBcInN0cmluZ1wiKSB7XHJcbiAgICByZXR1cm4gby50b0xvd2VyQ2FzZSgpXHJcbiAgfVxyXG4gIHJldHVybiBvXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjb21wYXJlQ29udGV4dChvQSAsIG9CLCBhS2V5SWdub3JlPykge1xyXG4gIHZhciBlcXVhbCA9IGNvdW50QWluQihvQSxvQiwgZnVuY3Rpb24oYSxiKSB7IHJldHVybiBsb3dlckNhc2UoYSkgPT09IGxvd2VyQ2FzZShiKTt9LCBhS2V5SWdub3JlKTtcclxuICB2YXIgZGlmZmVyZW50ID0gY291bnRBaW5CKG9BLG9CLCBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGxvd2VyQ2FzZShhKSAhPT0gbG93ZXJDYXNlKGIpO30sIGFLZXlJZ25vcmUpO1xyXG4gIHZhciBzcHVyaW91c0wgPSBzcHVyaW91c0Fub3RJbkIob0Esb0IsIGFLZXlJZ25vcmUpXHJcbiAgdmFyIHNwdXJpb3VzUiA9IHNwdXJpb3VzQW5vdEluQihvQixvQSwgYUtleUlnbm9yZSlcclxuICByZXR1cm4ge1xyXG4gICAgZXF1YWwgOiBlcXVhbCxcclxuICAgIGRpZmZlcmVudDogZGlmZmVyZW50LFxyXG4gICAgc3B1cmlvdXNMOiBzcHVyaW91c0wsXHJcbiAgICBzcHVyaW91c1I6IHNwdXJpb3VzUlxyXG4gIH1cclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjYXRlZ29yaXplU3RyaW5nKHN0cmluZyA6IHN0cmluZywgZXhhY3QgOiBib29sZWFuLCAgb1J1bGVzIDogQXJyYXk8SU1hdGNoLm1SdWxlPikgOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4ge1xyXG4gIC8vIHNpbXBseSBhcHBseSBhbGwgcnVsZXNcclxuICB2YXIgcmVzIDogQXJyYXk8SU1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4gPSBbXVxyXG4gIG9SdWxlcy5mb3JFYWNoKGZ1bmN0aW9uKG9SdWxlKSB7XHJcbiAgICBzd2l0Y2gob1J1bGUudHlwZSkge1xyXG4gICAgICBjYXNlIElGTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQgOlxyXG4gICAgICAgICAgaWYgKCBleGFjdCAmJiBvUnVsZS53b3JkID09PSBzdHJpbmcpIHtcclxuICAgICAgICAgICAgcmVzLnB1c2goIHtcclxuICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcclxuICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nIDogb1J1bGUubWF0Y2hlZFN0cmluZyxcclxuICAgICAgICAgICAgICBjYXRlZ29yeSA6IG9SdWxlLmNhdGVnb3J5XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoIWV4YWN0KSB7XHJcbiAgICAgICAgICAgIHZhciBsZXZlbm1hdGNoID0gY2FsY0Rpc3RhbmNlKG9SdWxlLndvcmQsc3RyaW5nKVxyXG4gICAgICAgICAgICBpZiAobGV2ZW5tYXRjaCA8IDE1MCkge1xyXG4gICAgICAgICAgICAgIHJlcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxyXG4gICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZyA6IG9SdWxlLndvcmQsXHJcbiAgICAgICAgICAgICAgICBjYXRlZ29yeSA6IG9SdWxlLmNhdGVnb3J5LFxyXG4gICAgICAgICAgICAgICAgbGV2ZW5tYXRjaCA6IGxldmVubWF0Y2hcclxuICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5SRUdFWFA6IHtcclxuXHJcbiAgICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoXCIgaGVyZSByZWdleHBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLHVuZGVmaW5lZCwyKSkpXHJcbiAgICAgICAgdmFyIG0gPSBvUnVsZS5yZWdleHAuZXhlYyhzdHJpbmcpXHJcbiAgICAgICAgaWYobSkge1xyXG4gICAgICAgICAgICByZXMucHVzaCgge1xyXG4gICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nIDogKG9SdWxlLm1hdGNoSW5kZXggIT09IHVuZGVmaW5lZCAmJiBtW29SdWxlLm1hdGNoSW5kZXhdKSB8fCBzdHJpbmcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5IDogb1J1bGUuY2F0ZWdvcnlcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgYnJlYWs7XHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidW5rbm93biB0eXBlXCIgKyBKU09OLnN0cmluZ2lmeSAob1J1bGUsdW5kZWZpbmVkLCAyKSlcclxuICAgIH1cclxuICB9KTtcclxuICAgIHJldHVybiByZXM7XHJcbn1cclxuLyoqXHJcbiAqXHJcbiAqIE9wdGlvbnMgbWF5IGJlIHtcclxuICogbWF0Y2hvdGhlcnMgOiB0cnVlLCAgPT4gb25seSBydWxlcyB3aGVyZSBhbGwgb3RoZXJzIG1hdGNoIGFyZSBjb25zaWRlcmVkXHJcbiAqIGF1Z21lbnQgOiB0cnVlLFxyXG4gKiBvdmVycmlkZSA6IHRydWUgfSAgPT5cclxuICpcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFdvcmQob1J1bGUgOiBJUnVsZSwgY29udGV4dCA6IElGTWF0Y2guY29udGV4dCwgb3B0aW9ucyA/IDogSU1hdGNoT3B0aW9ucykge1xyXG4gIGlmIChjb250ZXh0W29SdWxlLmtleV0gPT09IHVuZGVmaW5lZCkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICB9XHJcbiAgdmFyIHMxID0gY29udGV4dFtvUnVsZS5rZXldLnRvTG93ZXJDYXNlKClcclxuICB2YXIgczIgPSBvUnVsZS53b3JkLnRvTG93ZXJDYXNlKCk7XHJcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cclxuICB2YXIgZGVsdGEgPSBjb21wYXJlQ29udGV4dChjb250ZXh0LG9SdWxlLmZvbGxvd3MsIG9SdWxlLmtleSlcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xyXG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcclxuICBpZiAob3B0aW9ucy5tYXRjaG90aGVycyAmJiAoZGVsdGEuZGlmZmVyZW50ID4gMCkpe1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gIH1cclxuICB2YXIgYyA6IG51bWJlciA9IGNhbGNEaXN0YW5jZShzMiwgczEpO1xyXG4gICBkZWJ1Z2xvZyhcIiBzMSA8PiBzMiBcIiArIHMxICsgXCI8PlwiICsgczIgKyBcIiAgPT46IFwiICsgYyk7XHJcbiAgaWYoYyA8IDE1MCApIHtcclxuICAgIHZhciByZXMgPSBPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKSBhcyBhbnk7XHJcbiAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgY29udGV4dCk7XHJcbiAgICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xyXG4gICAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgb1J1bGUuZm9sbG93cyk7XHJcbiAgICB9XHJcbiAgICAvLyBmb3JjZSBrZXkgcHJvcGVydHlcclxuICAgIC8vIGNvbnNvbGUubG9nKCcgb2JqZWN0Y2F0ZWdvcnknLCByZXNbJ3N5c3RlbU9iamVjdENhdGVnb3J5J10pO1xyXG4gICAgcmVzW29SdWxlLmtleV0gPSBvUnVsZS5mb2xsb3dzW29SdWxlLmtleV0gfHwgcmVzW29SdWxlLmtleV07XHJcbiAgICByZXMuX3dlaWdodCA9IE9iamVjdC5hc3NpZ24oe30sIHJlcy5fd2VpZ2h0KTtcclxuICAgIHJlcy5fd2VpZ2h0W29SdWxlLmtleV0gPSBjO1xyXG4gICAgT2JqZWN0LmZyZWV6ZShyZXMpO1xyXG4gICAgZGVidWdsb2coJ0ZvdW5kIG9uZScgKyBKU09OLnN0cmluZ2lmeShyZXMsdW5kZWZpbmVkLDIpKTtcclxuICAgIHJldHVybiByZXM7XHJcbiAgfVxyXG4gIHJldHVybiB1bmRlZmluZWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0QXJnc01hcChtYXRjaCA6IEFycmF5PHN0cmluZz4gLCBhcmdzTWFwIDogeyBba2V5IDogbnVtYmVyXSA6IHN0cmluZ30pIDogSUZNYXRjaC5jb250ZXh0IHtcclxuICB2YXIgcmVzID0ge30gYXMgSUZNYXRjaC5jb250ZXh0O1xyXG4gIGlmICghYXJnc01hcCkge1xyXG4gICAgcmV0dXJuIHJlcztcclxuICB9XHJcbiAgT2JqZWN0LmtleXMoYXJnc01hcCkuZm9yRWFjaChmdW5jdGlvbihpS2V5KSB7XHJcbiAgICAgIHZhciB2YWx1ZSA9IG1hdGNoW2lLZXldXHJcbiAgICAgIHZhciBrZXkgPSBhcmdzTWFwW2lLZXldO1xyXG4gICAgICBpZiAoKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikgJiYgdmFsdWUubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIHJlc1trZXldID0gdmFsdWVcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZVN0cmluZyhzU3RyaW5nIDogc3RyaW5nLCBhUnVsZXMgOiBBcnJheTxJTWF0Y2gubVJ1bGU+ICkge1xyXG5cclxuICB2YXIgY250ID0gMDtcclxuICB2YXIgZmFjID0gMTtcclxuICB2YXIgdSA9IGJyZWFrZG93bi5icmVha2Rvd25TdHJpbmcoc1N0cmluZyk7XHJcbiAgZGVidWdsb2coXCJoZXJlIGJyZWFrZG93blwiICsgSlNPTi5zdHJpbmdpZnkodSkpO1xyXG4gIHZhciB3b3JkcyA9IHt9IGFzICB7IFtrZXk6IHN0cmluZ106ICBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz59O1xyXG4gIHZhciByZXMgPSB1Lm1hcChmdW5jdGlvbihhQXJyKSB7XHJcbiAgICByZXR1cm4gYUFyci5tYXAoZnVuY3Rpb24gKHNXb3JkR3JvdXAgOiBzdHJpbmcpIHtcclxuICAgICAgdmFyIHNlZW5JdCA9IHdvcmRzW3NXb3JkR3JvdXBdO1xyXG4gICAgICBpZiAoc2Vlbkl0ID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBzZWVuSXQgPSAgY2F0ZWdvcml6ZVN0cmluZyhzV29yZEdyb3VwLCB0cnVlLCBhUnVsZXMpO1xyXG4gICAgICAgIHdvcmRzW3NXb3JkR3JvdXBdID0gc2Vlbkl0O1xyXG4gICAgICB9XHJcbiAgICAgIGNudCA9IGNudCArIHNlZW5JdC5sZW5ndGg7XHJcbiAgICAgIGZhYyA9IGZhYyAqIHNlZW5JdC5sZW5ndGg7XHJcbiAgICAgIGlmKCFzZWVuSXQpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RpbmcgYXQgbGVhc3Qgb25lIG1hdGNoIGZvciBcIiArIHNXb3JkR3JvdXApXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHNlZW5JdDtcclxuICAgIH0pO1xyXG4gIH0pXHJcbiAgZGVidWdsb2coXCIgc2VudGVuY2VzIFwiICsgdS5sZW5ndGggKyBcIiBtYXRjaGVzIFwiICsgY250ICsgXCIgZmFjOiBcIiArIGZhYyk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuLypcclxuWyBbYSxiXSwgW2MsZF1dXHJcblxyXG4wMCBhXHJcbjAxIGJcclxuMTAgY1xyXG4xMSBkXHJcbjEyIGNcclxuKi9cclxuXHJcblxyXG5jb25zdCBjbG9uZSA9IHV0aWxzLmNsb25lRGVlcDtcclxuXHJcbi8vIHdlIGNhbiByZXBsaWNhdGUgdGhlIHRhaWwgb3IgdGhlIGhlYWQsXHJcbi8vIHdlIHJlcGxpY2F0ZSB0aGUgdGFpbCBhcyBpdCBpcyBzbWFsbGVyLlxyXG5cclxuLy8gW2EsYixjIF1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBleHBhbmRNYXRjaEFycihkZWVwIDogQXJyYXk8QXJyYXk8YW55Pj4pIDogQXJyYXk8QXJyYXk8YW55Pj4ge1xyXG4gIHZhciBhID0gW107XHJcbiAgdmFyIGxpbmUgPSBbXTtcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWVwKSk7XHJcbiAgZGVlcC5mb3JFYWNoKGZ1bmN0aW9uKHVCcmVha0Rvd25MaW5lLCBpSW5kZXggOiBudW1iZXIpIHtcclxuICAgIGxpbmVbaUluZGV4XSA9IFtdO1xyXG4gICAgdUJyZWFrRG93bkxpbmUuZm9yRWFjaChmdW5jdGlvbihhV29yZEdyb3VwICwgd2dJbmRleDogbnVtYmVyKSB7XHJcbiAgICAgIGxpbmVbaUluZGV4XVt3Z0luZGV4XSA9IFtdO1xyXG4gICAgICBhV29yZEdyb3VwLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkVmFyaWFudCwgaVdWSW5kZXggOiBudW1iZXIpIHtcclxuICAgICAgICBsaW5lW2lJbmRleF1bd2dJbmRleF1baVdWSW5kZXhdID0gb1dvcmRWYXJpYW50O1xyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gIH0pXHJcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkobGluZSkpO1xyXG4gIHZhciByZXMgPSBbXTtcclxuICB2YXIgbnZlY3MgPSBbXTtcclxuICBmb3IodmFyIGkgPSAwOyBpIDwgbGluZS5sZW5ndGg7ICsraSkge1xyXG4gICAgdmFyIHZlY3MgPSBbW11dO1xyXG4gICAgdmFyIG52ZWNzID1bXTtcclxuICAgIHZhciBydmVjID0gW107XHJcbiAgICBmb3IodmFyIGsgPSAwOyBrIDwgbGluZVtpXS5sZW5ndGg7ICsraykgeyAvLyB3b3JkZ3JvdXAga1xyXG4gICAgICAvL3ZlY3MgaXMgdGhlIHZlY3RvciBvZiBhbGwgc28gZmFyIHNlZW4gdmFyaWFudHMgdXAgdG8gayB3Z3MuXHJcbiAgICAgIHZhciBuZXh0QmFzZSA9IFtdO1xyXG4gICAgICBmb3IodmFyIGwgPSAwOyBsIDwgbGluZVtpXVtrXS5sZW5ndGg7ICsrbCApIHsgLy8gZm9yIGVhY2ggdmFyaWFudFxyXG4gICAgICAgIGRlYnVnbG9nKFwidmVjcyBub3dcIiArIEpTT04uc3RyaW5naWZ5KHZlY3MpKTtcclxuICAgICAgICBudmVjcyA9IFtdOyAvL3ZlY3Muc2xpY2UoKTsgLy8gY29weSB0aGUgdmVjW2ldIGJhc2UgdmVjdG9yO1xyXG4gICAgICAgIGRlYnVnbG9nKFwidmVjcyBjb3BpZWQgbm93XCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpO1xyXG4gICAgICAgIGZvcih2YXIgdSA9IDA7IHUgPCB2ZWNzLmxlbmd0aDsgKyt1KSB7XHJcbiAgICAgICAgICAgbnZlY3NbdV0gPSB2ZWNzW3VdLnNsaWNlKCk7IC8vXHJcbiAgICAgICAgICAgZGVidWdsb2coXCJjb3BpZWQgdmVjc1tcIisgdStcIl1cIiArIEpTT04uc3RyaW5naWZ5KHZlY3NbdV0pKTtcclxuICAgICAgICAgICBudmVjc1t1XS5wdXNoKFxyXG4gICAgICAgICAgICAgY2xvbmUobGluZVtpXVtrXVtsXSkpOyAvLyBwdXNoIHRoZSBsdGggdmFyaWFudFxyXG4gICAgICAgICAgIGRlYnVnbG9nKFwibm93IG52ZWNzIFwiICsgbnZlY3MubGVuZ3RoICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBkZWJ1Z2xvZyhcIiBhdCAgICAgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbmV4dGJhc2UgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxyXG4gICAgICAgIGRlYnVnbG9nKFwiIGFwcGVuZCBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiBudmVjcyAgICA+XCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpXHJcbiAgICAgICAgbmV4dEJhc2UgPSBuZXh0QmFzZS5jb25jYXQobnZlY3MpO1xyXG4gICAgICAgIGRlYnVnbG9nKFwiICByZXN1bHQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbnZlY3MgICAgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxyXG4gICAgICB9IC8vY29uc3RydVxyXG4gICAgICBkZWJ1Z2xvZyhcIm5vdyBhdCBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpXHJcbiAgICAgIHZlY3MgPSBuZXh0QmFzZTtcclxuICAgIH1cclxuICAgIGRlYnVnbG9nKFwiQVBQRU5ESU5HIFRPIFJFU1wiICsgaSArIFwiOlwiICsgbCArIFwiID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcclxuICAgIHJlcyA9IHJlcy5jb25jYXQodmVjcyk7XHJcbiAgfVxyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBXZWlnaHQgZmFjdG9yIHRvIHVzZSBvbiB0aGUgYSBnaXZlbiB3b3JkIGRpc3RhbmNlXHJcbiAqIG9mIDAsIDEsIDIsIDMgLi4uLlxyXG4gKi9cclxuY29uc3QgYURpc3RXZWlnaHQgOiBBcnJheTxudW1iZXI+ICA9IFswLCAzLCAxLCAgMC4yXTtcclxuXHJcbi8qKlxyXG4gKiBDYWxjdWxhdGUgYSB3ZWlnaHQgZmFjdG9yIGZvciBhIGdpdmVuIGRpc3RhbmNlIGFuZFxyXG4gKiBjYXRlZ29yeVxyXG4gKiBAcGFyYW0ge2ludGVnZXJ9IGRpc3QgZGlzdGFuY2UgaW4gd29yZHNcclxuICogQHBhcmFtIHtzdHJpbmd9IGNhdGVnb3J5IGNhdGVnb3J5IHRvIHVzZVxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBhIGRpc3RhbmNlIGZhY3RvciA+PSAxXHJcbiAqICAxLjAgZm9yIG5vIGVmZmVjdFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGRpc3RXZWlnaHQoZGlzdCA6IG51bWJlciwgY2F0ZWdvcnkgOiBzdHJpbmcpIDogbnVtYmVyIHtcclxuICB2YXIgYWJzID0gTWF0aC5hYnMoZGlzdCk7XHJcbiAgcmV0dXJuIDEuMCArIChhRGlzdFdlaWdodFthYnNdIHx8IDApO1xyXG59XHJcblxyXG4vKipcclxuICogR2l2ZW4gYSBzZW50ZW5jZSwgZXh0YWN0IGNhdGVnb3JpZXNcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0Q2F0ZWdvcnlNYXAob1NlbnRlbmNlIDogQXJyYXk8SUZNYXRjaC5JV29yZD4pIDogeyBba2V5IDogc3RyaW5nXSA6IEFycmF5PHsgcG9zIDogbnVtYmVyfT4gfSB7XHJcbiAgdmFyIHJlcyA9IHt9O1xyXG4gIGRlYnVnbG9nKCdleHRyYWN0Q2F0ZWdvcnlNYXAgJyArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSkpO1xyXG4gIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uKG9Xb3JkLCBpSW5kZXgpIHtcclxuICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gSUZNYXRjaC5DQVRfQ0FURUdPUlkpIHtcclxuICAgICAgcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddID0gcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddIHx8IFtdO1xyXG4gICAgICByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10ucHVzaCh7IHBvcyA6IGlJbmRleCB9KTtcclxuICAgIH1cclxuICB9KTtcclxuICB1dGlscy5kZWVwRnJlZXplKHJlcyk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlaW5Gb3JjZVNlbnRlbmNlKG9TZW50ZW5jZSkge1xyXG4gIHZhciBvQ2F0ZWdvcnlNYXAgPSBleHRyYWN0Q2F0ZWdvcnlNYXAob1NlbnRlbmNlKTtcclxuICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbihvV29yZCwgaUluZGV4KSB7XHJcbiAgICB2YXIgbSA9IG9DYXRlZ29yeU1hcFtvV29yZC5jYXRlZ29yeV0gfHwgW107XHJcbiAgICBtLmZvckVhY2goZnVuY3Rpb24gKG9Qb3NpdGlvbiA6IHsgcG9zIDogbnVtYmVyIH0pIHtcclxuICAgICAgb1dvcmQucmVpbmZvcmNlID0gb1dvcmQucmVpbmZvcmNlIHx8IDE7XHJcbiAgICAgIG9Xb3JkLnJlaW5mb3JjZSAqPSBkaXN0V2VpZ2h0KGlJbmRleCAtIG9Qb3NpdGlvbi5wb3MsIG9Xb3JkLmNhdGVnb3J5KTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG4gIHJldHVybiBvU2VudGVuY2U7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWluRm9yY2UoYUNhdGVnb3J5aXplZEFycmF5KSB7XHJcbiAgYUNhdGVnb3J5aXplZEFycmF5LmZvckVhY2goZnVuY3Rpb24ob1NlbnRlbmNlKSB7XHJcbiAgICByZWluRm9yY2VTZW50ZW5jZShvU2VudGVuY2UpO1xyXG4gIH0pXHJcbiAgcmV0dXJuIGFDYXRlZ29yeWl6ZWRBcnJheTtcclxufVxyXG5cclxuXHJcbi8vLyBiZWxvdyBtYXkgbm8gbG9uZ2VyIGJlIHVzZWRcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFJlZ0V4cChvUnVsZSA6IElSdWxlLCBjb250ZXh0IDogSUZNYXRjaC5jb250ZXh0LCBvcHRpb25zID8gOiBJTWF0Y2hPcHRpb25zKSB7XHJcbiAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICB2YXIgc0tleSA9IG9SdWxlLmtleTtcclxuICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKVxyXG4gIHZhciByZWcgPSBvUnVsZS5yZWdleHA7XHJcblxyXG4gIHZhciBtID0gcmVnLmV4ZWMoczEpO1xyXG4gIGRlYnVnbG9nKFwiYXBwbHlpbmcgcmVnZXhwOiBcIiArIHMxICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XHJcbiAgaWYgKCFtKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxyXG4gIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KVxyXG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlbHRhKSk7XHJcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkob3B0aW9ucykpO1xyXG4gIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSl7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkXHJcbiAgfVxyXG4gIHZhciBvRXh0cmFjdGVkQ29udGV4dCA9IGV4dHJhY3RBcmdzTWFwKG0sIG9SdWxlLmFyZ3NNYXAgKTtcclxuICBkZWJ1Z2xvZyhcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUuYXJnc01hcCkpO1xyXG4gIGRlYnVnbG9nKFwibWF0Y2ggXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XHJcblxyXG4gIGRlYnVnbG9nKFwiZXh0cmFjdGVkIGFyZ3MgXCIgKyBKU09OLnN0cmluZ2lmeShvRXh0cmFjdGVkQ29udGV4dCkpO1xyXG4gIHZhciByZXMgPSBPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKSBhcyBhbnk7XHJcbiAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIG9FeHRyYWN0ZWRDb250ZXh0KTtcclxuICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgY29udGV4dCk7XHJcbiAgaWYgKG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldICE9PSB1bmRlZmluZWQpIHtcclxuICAgIHJlc1tzS2V5XSA9IG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldO1xyXG4gIH1cclxuICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xyXG4gICAgIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBvUnVsZS5mb2xsb3dzKTtcclxuICAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpXHJcbiAgfVxyXG4gIE9iamVjdC5mcmVlemUocmVzKTtcclxuICBkZWJ1Z2xvZygnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcyx1bmRlZmluZWQsMikpO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzb3J0QnlXZWlnaHQoc0tleSA6IHN0cmluZywgb0NvbnRleHRBIDogSUZNYXRjaC5jb250ZXh0LCBvQ29udGV4dEIgOiBJRk1hdGNoLmNvbnRleHQpICA6IG51bWJlcntcclxuICBkZWJ1Z2xvZygnc29ydGluZzogJyArIHNLZXkgKyAnaW52b2tlZCB3aXRoXFxuIDE6JyArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QSx1bmRlZmluZWQsMikrXHJcbiAgIFwiIHZzIFxcbiAyOlwiICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHRCLHVuZGVmaW5lZCwyKSk7XHJcbiAgdmFyIHJhbmtpbmdBIDogbnVtYmVyID0gIHBhcnNlRmxvYXQob0NvbnRleHRBW1wiX3JhbmtpbmdcIl0gfHwgXCIxXCIpO1xyXG4gIHZhciByYW5raW5nQiA6IG51bWJlciAgPSBwYXJzZUZsb2F0KG9Db250ZXh0QltcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcclxuICBpZiAocmFua2luZ0EgIT09IHJhbmtpbmdCKSB7XHJcbiAgICBkZWJ1Z2xvZyhcIiByYW5raW4gZGVsdGFcIiArIDEwMCoocmFua2luZ0IgLSByYW5raW5nQSkpO1xyXG4gICAgcmV0dXJuIDEwMCoocmFua2luZ0IgLSByYW5raW5nQSlcclxuICB9XHJcblxyXG4gIHZhciB3ZWlnaHRBID0gb0NvbnRleHRBW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdW3NLZXldICB8fCAwO1xyXG4gIHZhciB3ZWlnaHRCID0gb0NvbnRleHRCW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdW3NLZXldICB8fCAwO1xyXG4gIHJldHVybiArKHdlaWdodEEgLSB3ZWlnaHRCKTtcclxufVxyXG5cclxuXHJcbi8vIFdvcmQsIFN5bm9ueW0sIFJlZ2V4cCAvIEV4dHJhY3Rpb25SdWxlXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXVnbWVudENvbnRleHQxKCBjb250ZXh0IDogSUZNYXRjaC5jb250ZXh0LCBvUnVsZXMgOiBBcnJheTxJUnVsZT4sIG9wdGlvbnMgOiBJTWF0Y2hPcHRpb25zKSA6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIHZhciBzS2V5ID0gb1J1bGVzWzBdLmtleTtcclxuICAvLyBjaGVjayB0aGF0IHJ1bGVcclxuICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgLy8gY2hlY2sgY29uc2lzdGVuY3lcclxuICAgIG9SdWxlcy5ldmVyeShmdW5jdGlvbiAoaVJ1bGUpIHtcclxuICAgICAgaWYgKGlSdWxlLmtleSAhPT0gc0tleSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkluaG9tb2dlbm91cyBrZXlzIGluIHJ1bGVzLCBleHBlY3RlZCBcIiArIHNLZXkgKyBcIiB3YXMgXCIgKyBKU09OLnN0cmluZ2lmeShpUnVsZSkpO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvLyBsb29rIGZvciBydWxlcyB3aGljaCBtYXRjaFxyXG4gIHZhciByZXMgPSBvUnVsZXMubWFwKGZ1bmN0aW9uKG9SdWxlKSB7XHJcbiAgICAvLyBpcyB0aGlzIHJ1bGUgYXBwbGljYWJsZVxyXG4gICAgc3dpdGNoKG9SdWxlLnR5cGUpIHtcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5XT1JEOlxyXG4gICAgICAgIHJldHVybiBtYXRjaFdvcmQob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpXHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuUkVHRVhQOlxyXG4gICAgICAgIHJldHVybiBtYXRjaFJlZ0V4cChvUnVsZSwgY29udGV4dCwgb3B0aW9ucyk7XHJcbiAgIC8vICAgY2FzZSBcIkV4dHJhY3Rpb25cIjpcclxuICAgLy8gICAgIHJldHVybiBtYXRjaEV4dHJhY3Rpb24ob1J1bGUsY29udGV4dCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkXHJcbiAgfSkuZmlsdGVyKGZ1bmN0aW9uKG9yZXMpIHtcclxuICAgIHJldHVybiAhIW9yZXNcclxuICB9KS5zb3J0KFxyXG4gICAgc29ydEJ5V2VpZ2h0LmJpbmQodGhpcywgc0tleSlcclxuICApO1xyXG4gIHJldHVybiByZXM7XHJcbiAgLy8gT2JqZWN0LmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XHJcbiAgLy8gfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhdWdtZW50Q29udGV4dCggY29udGV4dCA6IElGTWF0Y2guY29udGV4dCwgYVJ1bGVzIDogQXJyYXk8SVJ1bGU+KSA6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG5cclxudmFyIG9wdGlvbnMxIDogSU1hdGNoT3B0aW9ucyA9IHtcclxuICAgIG1hdGNob3RoZXJzIDogdHJ1ZSxcclxuICAgIG92ZXJyaWRlOiBmYWxzZVxyXG4gIH0gYXMgSU1hdGNoT3B0aW9ucztcclxuXHJcbiAgdmFyIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCxhUnVsZXMsb3B0aW9uczEpXHJcblxyXG4gIGlmIChhUmVzLmxlbmd0aCA9PT0gMCkgIHtcclxuICAgIHZhciBvcHRpb25zMiA6IElNYXRjaE9wdGlvbnMgPSB7XHJcbiAgICAgICAgbWF0Y2hvdGhlcnMgOiBmYWxzZSxcclxuICAgICAgICBvdmVycmlkZTogdHJ1ZVxyXG4gICAgfSBhcyBJTWF0Y2hPcHRpb25zO1xyXG4gICAgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMyKTtcclxuICB9XHJcbiAgcmV0dXJuIGFSZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBpbnNlcnRPcmRlcmVkKHJlc3VsdCA6IEFycmF5PElGTWF0Y2guY29udGV4dD4sIGlJbnNlcnRlZE1lbWJlciA6IElGTWF0Y2guY29udGV4dCwgbGltaXQgOiBudW1iZXIpIDogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgLy8gVE9ETzogdXNlIHNvbWUgd2VpZ2h0XHJcbiAgaWYgKHJlc3VsdC5sZW5ndGggPCBsaW1pdCkge1xyXG4gICAgcmVzdWx0LnB1c2goaUluc2VydGVkTWVtYmVyKVxyXG4gIH1cclxuICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHRha2VUb3BOKGFyciA6IEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+KTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgdmFyIHUgPSBhcnIuZmlsdGVyKGZ1bmN0aW9uKGlubmVyQXJyKSB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwfSlcclxuXHJcbiAgdmFyIHJlcyA9W107XHJcbiAgLy8gc2hpZnQgb3V0IHRoZSB0b3Agb25lc1xyXG4gIHUgPSB1Lm1hcChmdW5jdGlvbihpQXJyKSB7XHJcbiAgICB2YXIgdG9wID0gaUFyci5zaGlmdCgpO1xyXG4gICAgcmVzID0gaW5zZXJ0T3JkZXJlZChyZXMsdG9wLDUpXHJcbiAgICByZXR1cm4gaUFyclxyXG4gIH0pLmZpbHRlcihmdW5jdGlvbihpbm5lckFycjogQXJyYXk8SUZNYXRjaC5jb250ZXh0PikgOiBib29sZWFuIHsgcmV0dXJuIGlubmVyQXJyLmxlbmd0aCA+IDB9KTtcclxuICAvLyBhcyBBcnJheTxBcnJheTxJRk1hdGNoLmNvbnRleHQ+PlxyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmltcG9ydCAqIGFzIGlucHV0RmlsdGVyUnVsZXMgZnJvbSAnLi9pbnB1dEZpbHRlclJ1bGVzJztcclxuXHJcbnZhciBybTtcclxuXHJcbmZ1bmN0aW9uIGdldFJNT25jZSgpIHtcclxuICBpZiAoIXJtKSB7XHJcbiAgICBybSA9IGlucHV0RmlsdGVyUnVsZXMuZ2V0UnVsZU1hcCgpXHJcbiAgfVxyXG4gIHJldHVybiBybTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UnVsZXMoY29udGV4dCA6IElGTWF0Y2guY29udGV4dCkgOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICB2YXIgYmVzdE4gOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+ID0gW2NvbnRleHRdO1xyXG4gIGlucHV0RmlsdGVyUnVsZXMub0tleU9yZGVyLmZvckVhY2goZnVuY3Rpb24gKHNLZXkgOiBzdHJpbmcpIHtcclxuICAgICB2YXIgYmVzdE5leHQ6IEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+ID0gW107XHJcbiAgICAgYmVzdE4uZm9yRWFjaChmdW5jdGlvbihvQ29udGV4dCA6IElGTWF0Y2guY29udGV4dCkge1xyXG4gICAgICAgaWYgKG9Db250ZXh0W3NLZXldKSB7XHJcbiAgICAgICAgICBkZWJ1Z2xvZygnKiogYXBwbHlpbmcgcnVsZXMgZm9yICcgKyBzS2V5KVxyXG4gICAgICAgICAgdmFyIHJlcyA9IGF1Z21lbnRDb250ZXh0KG9Db250ZXh0LCBnZXRSTU9uY2UoKVtzS2V5XSB8fCBbXSlcclxuICAgICAgICAgIGRlYnVnbG9nKCcqKiByZXN1bHQgZm9yICcgKyBzS2V5ICsgJyA9ICcgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpXHJcbiAgICAgICAgICBiZXN0TmV4dC5wdXNoKHJlcyB8fCBbXSlcclxuICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgIC8vIHJ1bGUgbm90IHJlbGV2YW50XHJcbiAgICAgICAgIGJlc3ROZXh0LnB1c2goW29Db250ZXh0XSk7XHJcbiAgICAgICB9XHJcbiAgICB9KVxyXG4gICAgYmVzdE4gPSB0YWtlVG9wTihiZXN0TmV4dCk7XHJcbiAgfSk7XHJcbiAgcmV0dXJuIGJlc3ROXHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlSdWxlc1BpY2tGaXJzdChjb250ZXh0IDogSUZNYXRjaC5jb250ZXh0KSA6IElGTWF0Y2guY29udGV4dCB7XHJcbiAgdmFyIHIgPSBhcHBseVJ1bGVzKGNvbnRleHQpO1xyXG4gIHJldHVybiByICYmIHJbMF07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZWNpZGUgd2hldGhlciB0byByZXF1ZXJ5IGZvciBhIGNvbnRldFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGRlY2lkZU9uUmVRdWVyeSggY29udGV4dCA6IElGTWF0Y2guY29udGV4dCkgOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICByZXR1cm4gW11cclxufVxyXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
