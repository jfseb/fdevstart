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
var Algol = require('./algol');
var breakdown = require('./breakdown');
var AnyObject = Object;
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
var levenCutoff = Algol.Cutoff_LevenShtein;
function levenPenalty(i) {
    // 0-> 1
    // 1 -> 0.1
    // 150 ->  0.8
    if (i === 0) {
        return 1;
    }
    // reverse may be better than linear
    return 1 + i * (0.8 - 1) / 150;
}
exports.levenPenalty = levenPenalty;
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
function sortByRank(a, b) {
    return -((a._ranking || 1.0) - (b._ranking || 1.0));
}
function categorizeString(string, exact, oRules) {
    // simply apply all rules
    debug("rules : " + JSON.stringify(oRules));
    var res = [];
    oRules.forEach(function (oRule) {
        switch (oRule.type) {
            case 0 /* WORD */:
                if (exact && oRule.word === string) {
                    res.push({
                        string: string,
                        matchedString: oRule.matchedString,
                        category: oRule.category,
                        _ranking: oRule._ranking || 1.0
                    });
                }
                if (!exact) {
                    var levenmatch = calcDistance(oRule.word, string);
                    if (levenmatch < levenCutoff) {
                        res.push({
                            string: string,
                            matchedString: oRule.word,
                            category: oRule.category,
                            _ranking: (oRule._ranking || 1.0) * levenPenalty(levenmatch),
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
                            category: oRule.category,
                            _ranking: oRule._ranking || 1.0
                        });
                    }
                }
                break;
            default:
                throw new Error("unknown type" + JSON.stringify(oRule, undefined, 2));
        }
    });
    res.sort(sortByRank);
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
        var res = AnyObject.assign({}, oRule.follows);
        res = AnyObject.assign(res, context);
        if (options.override) {
            res = AnyObject.assign(res, oRule.follows);
        }
        // force key property
        // console.log(' objectcategory', res['systemObjectCategory']);
        res[oRule.key] = oRule.follows[oRule.key] || res[oRule.key];
        res._weight = AnyObject.assign({}, res._weight);
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
exports.RankWord = {
    hasAbove: function hasAbove(lst, border) {
        return !lst.every(function (oMember) {
            return oMember._ranking < border;
        });
    },
    takeFirstN: function takeFirstN(lst, n) {
        return lst.filter(function (oMember, iIndex) {
            var lastRanking = 1.0;
            if (iIndex < n || oMember._ranking === lastRanking) {
                lastRanking = oMember._ranking;
                return true;
            }
            return false;
        });
    },
    takeAbove: function takeAbove(lst, border) {
        return lst.filter(function (oMember) {
            return oMember._ranking >= border;
        });
    }
};
function categorizeWordWithRankCutoff(sWordGroup, aRules) {
    var seenIt = categorizeString(sWordGroup, true, aRules);
    if (exports.RankWord.hasAbove(seenIt, 0.8)) {
        seenIt = exports.RankWord.takeAbove(seenIt, 0.8);
    } else {
        seenIt = categorizeString(sWordGroup, false, aRules);
    }
    seenIt = exports.RankWord.takeFirstN(seenIt, Algol.Top_N_WordCategorizations);
    return seenIt;
}
exports.categorizeWordWithRankCutoff = categorizeWordWithRankCutoff;
/**
 * Given a  string, break it down into components,
 * then categorizeWords
 */
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
                seenIt = categorizeWordWithRankCutoff(sWordGroup, aRules);
                words[sWordGroup] = seenIt;
            }
            cnt = cnt + seenIt.length;
            fac = fac * seenIt.length;
            if (!seenIt || seenIt.length === 0) {
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
                //debuglog("vecs now" + JSON.stringify(vecs));
                nvecs = []; //vecs.slice(); // copy the vec[i] base vector;
                //debuglog("vecs copied now" + JSON.stringify(nvecs));
                for (var u = 0; u < vecs.length; ++u) {
                    nvecs[u] = vecs[u].slice(); //
                    // debuglog("copied vecs["+ u+"]" + JSON.stringify(vecs[u]));
                    nvecs[u].push(clone(line[i][k][l])); // push the lth variant
                }
                //   debuglog(" at     " + k + ":" + l + " nextbase >" + JSON.stringify(nextBase))
                //   debuglog(" append " + k + ":" + l + " nvecs    >" + JSON.stringify(nvecs))
                nextBase = nextBase.concat(nvecs);
            } //constru
            //  debuglog("now at " + k + ":" + l + " >" + JSON.stringify(nextBase))
            vecs = nextBase;
        }
        debuglog("APPENDING TO RES" + i + ":" + l + " >" + JSON.stringify(nextBase));
        res = res.concat(vecs);
    }
    return res;
}
exports.expandMatchArr = expandMatchArr;
/**
 * Calculate a weight factor for a given distance and
 * category
 * @param {integer} dist distance in words
 * @param {string} category category to use
 * @returns {number} a distance factor >= 1
 *  1.0 for no effect
 */
function reinforceDistWeight(dist, category) {
    var abs = Math.abs(dist);
    return 1.0 + (Algol.aReinforceDistWeight[abs] || 0);
}
exports.reinforceDistWeight = reinforceDistWeight;
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
            var boost = reinforceDistWeight(iIndex - oPosition.pos, oWord.category);
            oWord.reinforce *= boost;
            oWord._ranking *= boost;
        });
    });
    return oSentence;
}
exports.reinForceSentence = reinForceSentence;
var Sentence = require('./sentence');
function reinForce(aCategorizedArray) {
    aCategorizedArray.forEach(function (oSentence) {
        reinForceSentence(oSentence);
    });
    aCategorizedArray.sort(Sentence.cmpRankingProduct);
    debuglog("after reinforce" + aCategorizedArray.map(function (oSentence) {
        return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
    }).join("\n"));
    return aCategorizedArray;
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
    var res = AnyObject.assign({}, oRule.follows);
    res = AnyObject.assign(res, oExtractedContext);
    res = AnyObject.assign(res, context);
    if (oExtractedContext[sKey] !== undefined) {
        res[sKey] = oExtractedContext[sKey];
    }
    if (options.override) {
        res = AnyObject.assign(res, oRule.follows);
        res = AnyObject.assign(res, oExtractedContext);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1hdGNoL2lucHV0RmlsdGVyLmpzIiwiLi4vc3JjL21hdGNoL2lucHV0RmlsdGVyLnRzIl0sIm5hbWVzIjpbImRpc3RhbmNlIiwicmVxdWlyZSIsImRlYnVnIiwidXRpbHMiLCJBbGdvbCIsImJyZWFrZG93biIsIkFueU9iamVjdCIsIk9iamVjdCIsImRlYnVnbG9nIiwibWF0Y2hkYXRhIiwib1VuaXRUZXN0cyIsImNhbGNEaXN0YW5jZSIsInNUZXh0MSIsInNUZXh0MiIsImEwIiwibGV2ZW5zaHRlaW4iLCJzdWJzdHJpbmciLCJsZW5ndGgiLCJhIiwidG9Mb3dlckNhc2UiLCJJRk1hdGNoIiwibGV2ZW5DdXRvZmYiLCJDdXRvZmZfTGV2ZW5TaHRlaW4iLCJsZXZlblBlbmFsdHkiLCJpIiwiZXhwb3J0cyIsIm5vblByaXZhdGVLZXlzIiwib0EiLCJrZXlzIiwiZmlsdGVyIiwia2V5IiwiY291bnRBaW5CIiwib0IiLCJmbkNvbXBhcmUiLCJhS2V5SWdub3JlIiwiQXJyYXkiLCJpc0FycmF5IiwiaW5kZXhPZiIsInJlZHVjZSIsInByZXYiLCJwcm90b3R5cGUiLCJoYXNPd25Qcm9wZXJ0eSIsImNhbGwiLCJzcHVyaW91c0Fub3RJbkIiLCJsb3dlckNhc2UiLCJvIiwiY29tcGFyZUNvbnRleHQiLCJlcXVhbCIsImIiLCJkaWZmZXJlbnQiLCJzcHVyaW91c0wiLCJzcHVyaW91c1IiLCJzb3J0QnlSYW5rIiwiX3JhbmtpbmciLCJjYXRlZ29yaXplU3RyaW5nIiwic3RyaW5nIiwiZXhhY3QiLCJvUnVsZXMiLCJKU09OIiwic3RyaW5naWZ5IiwicmVzIiwiZm9yRWFjaCIsIm9SdWxlIiwidHlwZSIsIndvcmQiLCJwdXNoIiwibWF0Y2hlZFN0cmluZyIsImNhdGVnb3J5IiwibGV2ZW5tYXRjaCIsInVuZGVmaW5lZCIsIm0iLCJyZWdleHAiLCJleGVjIiwibWF0Y2hJbmRleCIsIkVycm9yIiwic29ydCIsIm1hdGNoV29yZCIsImNvbnRleHQiLCJvcHRpb25zIiwiczEiLCJzMiIsImRlbHRhIiwiZm9sbG93cyIsIm1hdGNob3RoZXJzIiwiYyIsImFzc2lnbiIsIm92ZXJyaWRlIiwiX3dlaWdodCIsImZyZWV6ZSIsImV4dHJhY3RBcmdzTWFwIiwibWF0Y2giLCJhcmdzTWFwIiwiaUtleSIsInZhbHVlIiwiUmFua1dvcmQiLCJoYXNBYm92ZSIsImxzdCIsImJvcmRlciIsImV2ZXJ5Iiwib01lbWJlciIsInRha2VGaXJzdE4iLCJuIiwiaUluZGV4IiwibGFzdFJhbmtpbmciLCJ0YWtlQWJvdmUiLCJjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmIiwic1dvcmRHcm91cCIsImFSdWxlcyIsInNlZW5JdCIsIlRvcF9OX1dvcmRDYXRlZ29yaXphdGlvbnMiLCJhbmFseXplU3RyaW5nIiwic1N0cmluZyIsImNudCIsImZhYyIsInUiLCJicmVha2Rvd25TdHJpbmciLCJ3b3JkcyIsIm1hcCIsImFBcnIiLCJjbG9uZSIsImNsb25lRGVlcCIsImV4cGFuZE1hdGNoQXJyIiwiZGVlcCIsImxpbmUiLCJ1QnJlYWtEb3duTGluZSIsImFXb3JkR3JvdXAiLCJ3Z0luZGV4Iiwib1dvcmRWYXJpYW50IiwiaVdWSW5kZXgiLCJudmVjcyIsInZlY3MiLCJydmVjIiwiayIsIm5leHRCYXNlIiwibCIsInNsaWNlIiwiY29uY2F0IiwicmVpbmZvcmNlRGlzdFdlaWdodCIsImRpc3QiLCJhYnMiLCJNYXRoIiwiYVJlaW5mb3JjZURpc3RXZWlnaHQiLCJleHRyYWN0Q2F0ZWdvcnlNYXAiLCJvU2VudGVuY2UiLCJvV29yZCIsIkNBVF9DQVRFR09SWSIsInBvcyIsImRlZXBGcmVlemUiLCJyZWluRm9yY2VTZW50ZW5jZSIsIm9DYXRlZ29yeU1hcCIsIm9Qb3NpdGlvbiIsInJlaW5mb3JjZSIsImJvb3N0IiwiU2VudGVuY2UiLCJyZWluRm9yY2UiLCJhQ2F0ZWdvcml6ZWRBcnJheSIsImNtcFJhbmtpbmdQcm9kdWN0IiwicmFua2luZ1Byb2R1Y3QiLCJqb2luIiwibWF0Y2hSZWdFeHAiLCJzS2V5IiwicmVnIiwib0V4dHJhY3RlZENvbnRleHQiLCJzb3J0QnlXZWlnaHQiLCJvQ29udGV4dEEiLCJvQ29udGV4dEIiLCJyYW5raW5nQSIsInBhcnNlRmxvYXQiLCJyYW5raW5nQiIsIndlaWdodEEiLCJ3ZWlnaHRCIiwiYXVnbWVudENvbnRleHQxIiwiZW5hYmxlZCIsImlSdWxlIiwib3JlcyIsImJpbmQiLCJhdWdtZW50Q29udGV4dCIsIm9wdGlvbnMxIiwiYVJlcyIsIm9wdGlvbnMyIiwiaW5zZXJ0T3JkZXJlZCIsInJlc3VsdCIsImlJbnNlcnRlZE1lbWJlciIsImxpbWl0IiwidGFrZVRvcE4iLCJhcnIiLCJpbm5lckFyciIsImlBcnIiLCJ0b3AiLCJzaGlmdCIsImlucHV0RmlsdGVyUnVsZXMiLCJybSIsImdldFJNT25jZSIsImdldFJ1bGVNYXAiLCJhcHBseVJ1bGVzIiwiYmVzdE4iLCJvS2V5T3JkZXIiLCJiZXN0TmV4dCIsIm9Db250ZXh0IiwiYXBwbHlSdWxlc1BpY2tGaXJzdCIsInIiLCJkZWNpZGVPblJlUXVlcnkiXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7Ozs7Ozs7Ozs7Ozs7Ozs7QUFnQkE7O0FBQ0EsSUFBWUEsV0FBUUMsUUFBTSw2QkFBTixDQUFwQjtBQUVBLElBQVlDLFFBQUtELFFBQU0sT0FBTixDQUFqQjtBQUVBLElBQVlFLFFBQUtGLFFBQU0sZ0JBQU4sQ0FBakI7QUFHQSxJQUFZRyxRQUFLSCxRQUFNLFNBQU4sQ0FBakI7QUFJQSxJQUFZSSxZQUFTSixRQUFNLGFBQU4sQ0FBckI7QUFFQSxJQUFNSyxZQUFpQkMsTUFBdkI7QUFFQSxJQUFNQyxXQUFXTixNQUFNLGFBQU4sQ0FBakI7QUFFQSxJQUFZTyxZQUFTUixRQUFNLGFBQU4sQ0FBckI7QUFDQSxJQUFJUyxhQUFhRCxVQUFVQyxVQUEzQjtBQUVBOzs7Ozs7QUFNQSxTQUFBQyxZQUFBLENBQXNCQyxNQUF0QixFQUFzQ0MsTUFBdEMsRUFBb0Q7QUFDbEQ7QUFDQSxRQUFJQyxLQUFLZCxTQUFTZSxXQUFULENBQXFCSCxPQUFPSSxT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SUEsU0FBU3RDLElBQVQsQ0FBSixFQUFvQjtBQUNsQnhKLHlCQUFTLDJCQUEyQndKLElBQXBDO0FBQ0Esb0JBQUlwRyxNQUFNb0gsZUFBZXNCLFFBQWYsRUFBeUJOLFlBQVloQyxJQUFaLEtBQXFCLEVBQTlDLENBQVY7QUFDQXhKLHlCQUFTLG1CQUFtQndKLElBQW5CLEdBQTBCLEtBQTFCLEdBQWtDdEcsS0FBS0MsU0FBTCxDQUFlQyxHQUFmLEVBQW9CUyxTQUFwQixFQUErQixDQUEvQixDQUEzQztBQUNBZ0kseUJBQVNwSSxJQUFULENBQWNMLE9BQU8sRUFBckI7QUFDRCxhQUxELE1BS087QUFDTDtBQUNBeUkseUJBQVNwSSxJQUFULENBQWMsQ0FBQ3FJLFFBQUQsQ0FBZDtBQUNEO0FBQ0YsU0FWRDtBQVdBSCxnQkFBUVgsU0FBU2EsUUFBVCxDQUFSO0FBQ0QsS0FkRDtBQWVBLFdBQU9GLEtBQVA7QUFDRDtBQWxCZTFLLFFBQUF5SyxVQUFBLEdBQVVBLFVBQVY7QUFxQmhCLFNBQUFLLG1CQUFBLENBQW9DMUgsT0FBcEMsRUFBNEQ7QUFDMUQsUUFBSTJILElBQUlOLFdBQVdySCxPQUFYLENBQVI7QUFDQSxXQUFPMkgsS0FBS0EsRUFBRSxDQUFGLENBQVo7QUFDRDtBQUhlL0ssUUFBQThLLG1CQUFBLEdBQW1CQSxtQkFBbkI7QUFLaEI7OztBQUdBLFNBQUFFLGVBQUEsQ0FBZ0M1SCxPQUFoQyxFQUF3RDtBQUN0RCxXQUFPLEVBQVA7QUFDRDtBQUZlcEQsUUFBQWdMLGVBQUEsR0FBZUEsZUFBZiIsImZpbGUiOiJtYXRjaC9pbnB1dEZpbHRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuLyoqXG4gKiB0aGUgaW5wdXQgZmlsdGVyIHN0YWdlIHByZXByb2Nlc3NlcyBhIGN1cnJlbnQgY29udGV4dFxuICpcbiAqIEl0IGEpIGNvbWJpbmVzIG11bHRpLXNlZ21lbnQgYXJndW1lbnRzIGludG8gb25lIGNvbnRleHQgbWVtYmVyc1xuICogSXQgYikgYXR0ZW1wdHMgdG8gYXVnbWVudCB0aGUgY29udGV4dCBieSBhZGRpdGlvbmFsIHF1YWxpZmljYXRpb25zXG4gKiAgICAgICAgICAgKE1pZCB0ZXJtIGdlbmVyYXRpbmcgQWx0ZXJuYXRpdmVzLCBlLmcuXG4gKiAgICAgICAgICAgICAgICAgQ2xpZW50U2lkZVRhcmdldFJlc29sdXRpb24gLT4gdW5pdCB0ZXN0P1xuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHNvdXJjZSA/XG4gKiAgICAgICAgICAgKVxuICogIFNpbXBsZSBydWxlcyBsaWtlICBJbnRlbnRcbiAqXG4gKlxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuaW5wdXRGaWx0ZXJcbiAqIEBmaWxlIGlucHV0RmlsdGVyLnRzXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXG4gKi9cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9saWIvbm9kZS00LmQudHNcIiAvPlxudmFyIGRpc3RhbmNlID0gcmVxdWlyZSgnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluJyk7XG52YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMvdXRpbHMnKTtcbnZhciBBbGdvbCA9IHJlcXVpcmUoJy4vYWxnb2wnKTtcbnZhciBicmVha2Rvd24gPSByZXF1aXJlKCcuL2JyZWFrZG93bicpO1xudmFyIEFueU9iamVjdCA9IE9iamVjdDtcbnZhciBkZWJ1Z2xvZyA9IGRlYnVnKCdpbnB1dEZpbHRlcicpO1xudmFyIG1hdGNoZGF0YSA9IHJlcXVpcmUoJy4vbWF0Y2hkYXRhJyk7XG52YXIgb1VuaXRUZXN0cyA9IG1hdGNoZGF0YS5vVW5pdFRlc3RzO1xuLyoqXG4gKiBAcGFyYW0gc1RleHQge3N0cmluZ30gdGhlIHRleHQgdG8gbWF0Y2ggdG8gTmF2VGFyZ2V0UmVzb2x1dGlvblxuICogQHBhcmFtIHNUZXh0MiB7c3RyaW5nfSB0aGUgcXVlcnkgdGV4dCwgZS5nLiBOYXZUYXJnZXRcbiAqXG4gKiBAcmV0dXJuIHRoZSBkaXN0YW5jZSwgbm90ZSB0aGF0IGlzIGlzICpub3QqIHN5bW1ldHJpYyFcbiAqL1xuZnVuY3Rpb24gY2FsY0Rpc3RhbmNlKHNUZXh0MSwgc1RleHQyKSB7XG4gICAgLy8gY29uc29sZS5sb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxuICAgIHZhciBhMCA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCksIHNUZXh0Mik7XG4gICAgdmFyIGEgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEudG9Mb3dlckNhc2UoKSwgc1RleHQyKTtcbiAgICByZXR1cm4gYTAgKiA1MDAgLyBzVGV4dDIubGVuZ3RoICsgYTtcbn1cbnZhciBJRk1hdGNoID0gcmVxdWlyZSgnLi4vbWF0Y2gvaWZtYXRjaCcpO1xudmFyIGxldmVuQ3V0b2ZmID0gQWxnb2wuQ3V0b2ZmX0xldmVuU2h0ZWluO1xuZnVuY3Rpb24gbGV2ZW5QZW5hbHR5KGkpIHtcbiAgICAvLyAwLT4gMVxuICAgIC8vIDEgLT4gMC4xXG4gICAgLy8gMTUwIC0+ICAwLjhcbiAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgICByZXR1cm4gMTtcbiAgICB9XG4gICAgLy8gcmV2ZXJzZSBtYXkgYmUgYmV0dGVyIHRoYW4gbGluZWFyXG4gICAgcmV0dXJuIDEgKyBpICogKDAuOCAtIDEpIC8gMTUwO1xufVxuZXhwb3J0cy5sZXZlblBlbmFsdHkgPSBsZXZlblBlbmFsdHk7XG5mdW5jdGlvbiBub25Qcml2YXRlS2V5cyhvQSkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhvQSkuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIGtleVswXSAhPT0gJ18nO1xuICAgIH0pO1xufVxuZnVuY3Rpb24gY291bnRBaW5CKG9BLCBvQiwgZm5Db21wYXJlLCBhS2V5SWdub3JlKSB7XG4gICAgYUtleUlnbm9yZSA9IEFycmF5LmlzQXJyYXkoYUtleUlnbm9yZSkgPyBhS2V5SWdub3JlIDpcbiAgICAgICAgdHlwZW9mIGFLZXlJZ25vcmUgPT09IFwic3RyaW5nXCIgPyBbYUtleUlnbm9yZV0gOiBbXTtcbiAgICBmbkNvbXBhcmUgPSBmbkNvbXBhcmUgfHwgZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICByZXR1cm4gbm9uUHJpdmF0ZUtleXMob0EpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHJldHVybiBhS2V5SWdub3JlLmluZGV4T2Yoa2V5KSA8IDA7XG4gICAgfSkuXG4gICAgICAgIHJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgKGZuQ29tcGFyZShvQVtrZXldLCBvQltrZXldLCBrZXkpID8gMSA6IDApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIDApO1xufVxuZXhwb3J0cy5jb3VudEFpbkIgPSBjb3VudEFpbkI7XG5mdW5jdGlvbiBzcHVyaW91c0Fub3RJbkIob0EsIG9CLCBhS2V5SWdub3JlKSB7XG4gICAgYUtleUlnbm9yZSA9IEFycmF5LmlzQXJyYXkoYUtleUlnbm9yZSkgPyBhS2V5SWdub3JlIDpcbiAgICAgICAgdHlwZW9mIGFLZXlJZ25vcmUgPT09IFwic3RyaW5nXCIgPyBbYUtleUlnbm9yZV0gOiBbXTtcbiAgICByZXR1cm4gbm9uUHJpdmF0ZUtleXMob0EpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHJldHVybiBhS2V5SWdub3JlLmluZGV4T2Yoa2V5KSA8IDA7XG4gICAgfSkuXG4gICAgICAgIHJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XG4gICAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9CLCBrZXkpKSB7XG4gICAgICAgICAgICBwcmV2ID0gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG59XG5leHBvcnRzLnNwdXJpb3VzQW5vdEluQiA9IHNwdXJpb3VzQW5vdEluQjtcbmZ1bmN0aW9uIGxvd2VyQ2FzZShvKSB7XG4gICAgaWYgKHR5cGVvZiBvID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIHJldHVybiBvLnRvTG93ZXJDYXNlKCk7XG4gICAgfVxuICAgIHJldHVybiBvO1xufVxuZnVuY3Rpb24gY29tcGFyZUNvbnRleHQob0EsIG9CLCBhS2V5SWdub3JlKSB7XG4gICAgdmFyIGVxdWFsID0gY291bnRBaW5CKG9BLCBvQiwgZnVuY3Rpb24gKGEsIGIpIHsgcmV0dXJuIGxvd2VyQ2FzZShhKSA9PT0gbG93ZXJDYXNlKGIpOyB9LCBhS2V5SWdub3JlKTtcbiAgICB2YXIgZGlmZmVyZW50ID0gY291bnRBaW5CKG9BLCBvQiwgZnVuY3Rpb24gKGEsIGIpIHsgcmV0dXJuIGxvd2VyQ2FzZShhKSAhPT0gbG93ZXJDYXNlKGIpOyB9LCBhS2V5SWdub3JlKTtcbiAgICB2YXIgc3B1cmlvdXNMID0gc3B1cmlvdXNBbm90SW5CKG9BLCBvQiwgYUtleUlnbm9yZSk7XG4gICAgdmFyIHNwdXJpb3VzUiA9IHNwdXJpb3VzQW5vdEluQihvQiwgb0EsIGFLZXlJZ25vcmUpO1xuICAgIHJldHVybiB7XG4gICAgICAgIGVxdWFsOiBlcXVhbCxcbiAgICAgICAgZGlmZmVyZW50OiBkaWZmZXJlbnQsXG4gICAgICAgIHNwdXJpb3VzTDogc3B1cmlvdXNMLFxuICAgICAgICBzcHVyaW91c1I6IHNwdXJpb3VzUlxuICAgIH07XG59XG5leHBvcnRzLmNvbXBhcmVDb250ZXh0ID0gY29tcGFyZUNvbnRleHQ7XG5mdW5jdGlvbiBzb3J0QnlSYW5rKGEsIGIpIHtcbiAgICByZXR1cm4gLSgoYS5fcmFua2luZyB8fCAxLjApIC0gKGIuX3JhbmtpbmcgfHwgMS4wKSk7XG59XG5mdW5jdGlvbiBjYXRlZ29yaXplU3RyaW5nKHN0cmluZywgZXhhY3QsIG9SdWxlcykge1xuICAgIC8vIHNpbXBseSBhcHBseSBhbGwgcnVsZXNcbiAgICBkZWJ1ZyhcInJ1bGVzIDogXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZXMpKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgb1J1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgIHN3aXRjaCAob1J1bGUudHlwZSkge1xuICAgICAgICAgICAgY2FzZSAwIC8qIFdPUkQgKi86XG4gICAgICAgICAgICAgICAgaWYgKGV4YWN0ICYmIG9SdWxlLndvcmQgPT09IHN0cmluZykge1xuICAgICAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgICAgICBfcmFua2luZzogb1J1bGUuX3JhbmtpbmcgfHwgMS4wXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIWV4YWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsZXZlbm1hdGNoID0gY2FsY0Rpc3RhbmNlKG9SdWxlLndvcmQsIHN0cmluZyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsZXZlbm1hdGNoIDwgbGV2ZW5DdXRvZmYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBvUnVsZS53b3JkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfcmFua2luZzogKG9SdWxlLl9yYW5raW5nIHx8IDEuMCkgKiBsZXZlblBlbmFsdHkobGV2ZW5tYXRjaCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV2ZW5tYXRjaDogbGV2ZW5tYXRjaFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDEgLyogUkVHRVhQICovOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoXCIgaGVyZSByZWdleHBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBtID0gb1J1bGUucmVnZXhwLmV4ZWMoc3RyaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiAob1J1bGUubWF0Y2hJbmRleCAhPT0gdW5kZWZpbmVkICYmIG1bb1J1bGUubWF0Y2hJbmRleF0pIHx8IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInVua25vd24gdHlwZVwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZVN0cmluZyA9IGNhdGVnb3JpemVTdHJpbmc7XG4vKipcbiAqXG4gKiBPcHRpb25zIG1heSBiZSB7XG4gKiBtYXRjaG90aGVycyA6IHRydWUsICA9PiBvbmx5IHJ1bGVzIHdoZXJlIGFsbCBvdGhlcnMgbWF0Y2ggYXJlIGNvbnNpZGVyZWRcbiAqIGF1Z21lbnQgOiB0cnVlLFxuICogb3ZlcnJpZGUgOiB0cnVlIH0gID0+XG4gKlxuICovXG5mdW5jdGlvbiBtYXRjaFdvcmQob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAoY29udGV4dFtvUnVsZS5rZXldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIHMxID0gY29udGV4dFtvUnVsZS5rZXldLnRvTG93ZXJDYXNlKCk7XG4gICAgdmFyIHMyID0gb1J1bGUud29yZC50b0xvd2VyQ2FzZSgpO1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsIG9SdWxlLmZvbGxvd3MsIG9SdWxlLmtleSk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XG4gICAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBjID0gY2FsY0Rpc3RhbmNlKHMyLCBzMSk7XG4gICAgZGVidWdsb2coXCIgczEgPD4gczIgXCIgKyBzMSArIFwiPD5cIiArIHMyICsgXCIgID0+OiBcIiArIGMpO1xuICAgIGlmIChjIDwgMTUwKSB7XG4gICAgICAgIHZhciByZXMgPSBBbnlPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKTtcbiAgICAgICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIGNvbnRleHQpO1xuICAgICAgICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xuICAgICAgICAgICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGZvcmNlIGtleSBwcm9wZXJ0eVxuICAgICAgICAvLyBjb25zb2xlLmxvZygnIG9iamVjdGNhdGVnb3J5JywgcmVzWydzeXN0ZW1PYmplY3RDYXRlZ29yeSddKTtcbiAgICAgICAgcmVzW29SdWxlLmtleV0gPSBvUnVsZS5mb2xsb3dzW29SdWxlLmtleV0gfHwgcmVzW29SdWxlLmtleV07XG4gICAgICAgIHJlcy5fd2VpZ2h0ID0gQW55T2JqZWN0LmFzc2lnbih7fSwgcmVzLl93ZWlnaHQpO1xuICAgICAgICByZXMuX3dlaWdodFtvUnVsZS5rZXldID0gYztcbiAgICAgICAgT2JqZWN0LmZyZWV6ZShyZXMpO1xuICAgICAgICBkZWJ1Z2xvZygnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5leHBvcnRzLm1hdGNoV29yZCA9IG1hdGNoV29yZDtcbmZ1bmN0aW9uIGV4dHJhY3RBcmdzTWFwKG1hdGNoLCBhcmdzTWFwKSB7XG4gICAgdmFyIHJlcyA9IHt9O1xuICAgIGlmICghYXJnc01hcCkge1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cbiAgICBPYmplY3Qua2V5cyhhcmdzTWFwKS5mb3JFYWNoKGZ1bmN0aW9uIChpS2V5KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IG1hdGNoW2lLZXldO1xuICAgICAgICB2YXIga2V5ID0gYXJnc01hcFtpS2V5XTtcbiAgICAgICAgaWYgKCh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpICYmIHZhbHVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJlc1trZXldID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5leHRyYWN0QXJnc01hcCA9IGV4dHJhY3RBcmdzTWFwO1xuZXhwb3J0cy5SYW5rV29yZCA9IHtcbiAgICBoYXNBYm92ZTogZnVuY3Rpb24gKGxzdCwgYm9yZGVyKSB7XG4gICAgICAgIHJldHVybiAhbHN0LmV2ZXJ5KGZ1bmN0aW9uIChvTWVtYmVyKSB7XG4gICAgICAgICAgICByZXR1cm4gKG9NZW1iZXIuX3JhbmtpbmcgPCBib3JkZXIpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIHRha2VGaXJzdE46IGZ1bmN0aW9uIChsc3QsIG4pIHtcbiAgICAgICAgcmV0dXJuIGxzdC5maWx0ZXIoZnVuY3Rpb24gKG9NZW1iZXIsIGlJbmRleCkge1xuICAgICAgICAgICAgdmFyIGxhc3RSYW5raW5nID0gMS4wO1xuICAgICAgICAgICAgaWYgKChpSW5kZXggPCBuKSB8fCBvTWVtYmVyLl9yYW5raW5nID09PSBsYXN0UmFua2luZykge1xuICAgICAgICAgICAgICAgIGxhc3RSYW5raW5nID0gb01lbWJlci5fcmFua2luZztcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICB0YWtlQWJvdmU6IGZ1bmN0aW9uIChsc3QsIGJvcmRlcikge1xuICAgICAgICByZXR1cm4gbHN0LmZpbHRlcihmdW5jdGlvbiAob01lbWJlcikge1xuICAgICAgICAgICAgcmV0dXJuIChvTWVtYmVyLl9yYW5raW5nID49IGJvcmRlcik7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5mdW5jdGlvbiBjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmKHNXb3JkR3JvdXAsIGFSdWxlcykge1xuICAgIHZhciBzZWVuSXQgPSBjYXRlZ29yaXplU3RyaW5nKHNXb3JkR3JvdXAsIHRydWUsIGFSdWxlcyk7XG4gICAgaWYgKGV4cG9ydHMuUmFua1dvcmQuaGFzQWJvdmUoc2Vlbkl0LCAwLjgpKSB7XG4gICAgICAgIHNlZW5JdCA9IGV4cG9ydHMuUmFua1dvcmQudGFrZUFib3ZlKHNlZW5JdCwgMC44KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHNlZW5JdCA9IGNhdGVnb3JpemVTdHJpbmcoc1dvcmRHcm91cCwgZmFsc2UsIGFSdWxlcyk7XG4gICAgfVxuICAgIHNlZW5JdCA9IGV4cG9ydHMuUmFua1dvcmQudGFrZUZpcnN0TihzZWVuSXQsIEFsZ29sLlRvcF9OX1dvcmRDYXRlZ29yaXphdGlvbnMpO1xuICAgIHJldHVybiBzZWVuSXQ7XG59XG5leHBvcnRzLmNhdGVnb3JpemVXb3JkV2l0aFJhbmtDdXRvZmYgPSBjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmO1xuLyoqXG4gKiBHaXZlbiBhICBzdHJpbmcsIGJyZWFrIGl0IGRvd24gaW50byBjb21wb25lbnRzLFxuICogdGhlbiBjYXRlZ29yaXplV29yZHNcbiAqL1xuZnVuY3Rpb24gYW5hbHl6ZVN0cmluZyhzU3RyaW5nLCBhUnVsZXMpIHtcbiAgICB2YXIgY250ID0gMDtcbiAgICB2YXIgZmFjID0gMTtcbiAgICB2YXIgdSA9IGJyZWFrZG93bi5icmVha2Rvd25TdHJpbmcoc1N0cmluZyk7XG4gICAgZGVidWdsb2coXCJoZXJlIGJyZWFrZG93blwiICsgSlNPTi5zdHJpbmdpZnkodSkpO1xuICAgIHZhciB3b3JkcyA9IHt9O1xuICAgIHZhciByZXMgPSB1Lm1hcChmdW5jdGlvbiAoYUFycikge1xuICAgICAgICByZXR1cm4gYUFyci5tYXAoZnVuY3Rpb24gKHNXb3JkR3JvdXApIHtcbiAgICAgICAgICAgIHZhciBzZWVuSXQgPSB3b3Jkc1tzV29yZEdyb3VwXTtcbiAgICAgICAgICAgIGlmIChzZWVuSXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHNlZW5JdCA9IGNhdGVnb3JpemVXb3JkV2l0aFJhbmtDdXRvZmYoc1dvcmRHcm91cCwgYVJ1bGVzKTtcbiAgICAgICAgICAgICAgICB3b3Jkc1tzV29yZEdyb3VwXSA9IHNlZW5JdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNudCA9IGNudCArIHNlZW5JdC5sZW5ndGg7XG4gICAgICAgICAgICBmYWMgPSBmYWMgKiBzZWVuSXQubGVuZ3RoO1xuICAgICAgICAgICAgaWYgKCFzZWVuSXQgfHwgc2Vlbkl0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGluZyBhdCBsZWFzdCBvbmUgbWF0Y2ggZm9yIFwiICsgc1dvcmRHcm91cCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc2Vlbkl0O1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBkZWJ1Z2xvZyhcIiBzZW50ZW5jZXMgXCIgKyB1Lmxlbmd0aCArIFwiIG1hdGNoZXMgXCIgKyBjbnQgKyBcIiBmYWM6IFwiICsgZmFjKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5hbmFseXplU3RyaW5nID0gYW5hbHl6ZVN0cmluZztcbi8qXG5bIFthLGJdLCBbYyxkXV1cblxuMDAgYVxuMDEgYlxuMTAgY1xuMTEgZFxuMTIgY1xuKi9cbnZhciBjbG9uZSA9IHV0aWxzLmNsb25lRGVlcDtcbi8vIHdlIGNhbiByZXBsaWNhdGUgdGhlIHRhaWwgb3IgdGhlIGhlYWQsXG4vLyB3ZSByZXBsaWNhdGUgdGhlIHRhaWwgYXMgaXQgaXMgc21hbGxlci5cbi8vIFthLGIsYyBdXG5mdW5jdGlvbiBleHBhbmRNYXRjaEFycihkZWVwKSB7XG4gICAgdmFyIGEgPSBbXTtcbiAgICB2YXIgbGluZSA9IFtdO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlZXApKTtcbiAgICBkZWVwLmZvckVhY2goZnVuY3Rpb24gKHVCcmVha0Rvd25MaW5lLCBpSW5kZXgpIHtcbiAgICAgICAgbGluZVtpSW5kZXhdID0gW107XG4gICAgICAgIHVCcmVha0Rvd25MaW5lLmZvckVhY2goZnVuY3Rpb24gKGFXb3JkR3JvdXAsIHdnSW5kZXgpIHtcbiAgICAgICAgICAgIGxpbmVbaUluZGV4XVt3Z0luZGV4XSA9IFtdO1xuICAgICAgICAgICAgYVdvcmRHcm91cC5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZFZhcmlhbnQsIGlXVkluZGV4KSB7XG4gICAgICAgICAgICAgICAgbGluZVtpSW5kZXhdW3dnSW5kZXhdW2lXVkluZGV4XSA9IG9Xb3JkVmFyaWFudDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShsaW5lKSk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIHZhciBudmVjcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZS5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgdmVjcyA9IFtbXV07XG4gICAgICAgIHZhciBudmVjcyA9IFtdO1xuICAgICAgICB2YXIgcnZlYyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBrID0gMDsgayA8IGxpbmVbaV0ubGVuZ3RoOyArK2spIHtcbiAgICAgICAgICAgIC8vdmVjcyBpcyB0aGUgdmVjdG9yIG9mIGFsbCBzbyBmYXIgc2VlbiB2YXJpYW50cyB1cCB0byBrIHdncy5cbiAgICAgICAgICAgIHZhciBuZXh0QmFzZSA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIgbCA9IDA7IGwgPCBsaW5lW2ldW2tdLmxlbmd0aDsgKytsKSB7XG4gICAgICAgICAgICAgICAgLy9kZWJ1Z2xvZyhcInZlY3Mgbm93XCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzKSk7XG4gICAgICAgICAgICAgICAgbnZlY3MgPSBbXTsgLy92ZWNzLnNsaWNlKCk7IC8vIGNvcHkgdGhlIHZlY1tpXSBiYXNlIHZlY3RvcjtcbiAgICAgICAgICAgICAgICAvL2RlYnVnbG9nKFwidmVjcyBjb3BpZWQgbm93XCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIHUgPSAwOyB1IDwgdmVjcy5sZW5ndGg7ICsrdSkge1xuICAgICAgICAgICAgICAgICAgICBudmVjc1t1XSA9IHZlY3NbdV0uc2xpY2UoKTsgLy9cbiAgICAgICAgICAgICAgICAgICAgLy8gZGVidWdsb2coXCJjb3BpZWQgdmVjc1tcIisgdStcIl1cIiArIEpTT04uc3RyaW5naWZ5KHZlY3NbdV0pKTtcbiAgICAgICAgICAgICAgICAgICAgbnZlY3NbdV0ucHVzaChjbG9uZShsaW5lW2ldW2tdW2xdKSk7IC8vIHB1c2ggdGhlIGx0aCB2YXJpYW50XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vICAgZGVidWdsb2coXCIgYXQgICAgIFwiICsgayArIFwiOlwiICsgbCArIFwiIG5leHRiYXNlID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcbiAgICAgICAgICAgICAgICAvLyAgIGRlYnVnbG9nKFwiIGFwcGVuZCBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiBudmVjcyAgICA+XCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpXG4gICAgICAgICAgICAgICAgbmV4dEJhc2UgPSBuZXh0QmFzZS5jb25jYXQobnZlY3MpO1xuICAgICAgICAgICAgfSAvL2NvbnN0cnVcbiAgICAgICAgICAgIC8vICBkZWJ1Z2xvZyhcIm5vdyBhdCBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpXG4gICAgICAgICAgICB2ZWNzID0gbmV4dEJhc2U7XG4gICAgICAgIH1cbiAgICAgICAgZGVidWdsb2coXCJBUFBFTkRJTkcgVE8gUkVTXCIgKyBpICsgXCI6XCIgKyBsICsgXCIgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKTtcbiAgICAgICAgcmVzID0gcmVzLmNvbmNhdCh2ZWNzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZXhwYW5kTWF0Y2hBcnIgPSBleHBhbmRNYXRjaEFycjtcbi8qKlxuICogQ2FsY3VsYXRlIGEgd2VpZ2h0IGZhY3RvciBmb3IgYSBnaXZlbiBkaXN0YW5jZSBhbmRcbiAqIGNhdGVnb3J5XG4gKiBAcGFyYW0ge2ludGVnZXJ9IGRpc3QgZGlzdGFuY2UgaW4gd29yZHNcbiAqIEBwYXJhbSB7c3RyaW5nfSBjYXRlZ29yeSBjYXRlZ29yeSB0byB1c2VcbiAqIEByZXR1cm5zIHtudW1iZXJ9IGEgZGlzdGFuY2UgZmFjdG9yID49IDFcbiAqICAxLjAgZm9yIG5vIGVmZmVjdFxuICovXG5mdW5jdGlvbiByZWluZm9yY2VEaXN0V2VpZ2h0KGRpc3QsIGNhdGVnb3J5KSB7XG4gICAgdmFyIGFicyA9IE1hdGguYWJzKGRpc3QpO1xuICAgIHJldHVybiAxLjAgKyAoQWxnb2wuYVJlaW5mb3JjZURpc3RXZWlnaHRbYWJzXSB8fCAwKTtcbn1cbmV4cG9ydHMucmVpbmZvcmNlRGlzdFdlaWdodCA9IHJlaW5mb3JjZURpc3RXZWlnaHQ7XG4vKipcbiAqIEdpdmVuIGEgc2VudGVuY2UsIGV4dGFjdCBjYXRlZ29yaWVzXG4gKi9cbmZ1bmN0aW9uIGV4dHJhY3RDYXRlZ29yeU1hcChvU2VudGVuY2UpIHtcbiAgICB2YXIgcmVzID0ge307XG4gICAgZGVidWdsb2coJ2V4dHJhY3RDYXRlZ29yeU1hcCAnICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKSk7XG4gICAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpSW5kZXgpIHtcbiAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBJRk1hdGNoLkNBVF9DQVRFR09SWSkge1xuICAgICAgICAgICAgcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddID0gcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddIHx8IFtdO1xuICAgICAgICAgICAgcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddLnB1c2goeyBwb3M6IGlJbmRleCB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHV0aWxzLmRlZXBGcmVlemUocmVzKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5leHRyYWN0Q2F0ZWdvcnlNYXAgPSBleHRyYWN0Q2F0ZWdvcnlNYXA7XG5mdW5jdGlvbiByZWluRm9yY2VTZW50ZW5jZShvU2VudGVuY2UpIHtcbiAgICB2YXIgb0NhdGVnb3J5TWFwID0gZXh0cmFjdENhdGVnb3J5TWFwKG9TZW50ZW5jZSk7XG4gICAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpSW5kZXgpIHtcbiAgICAgICAgdmFyIG0gPSBvQ2F0ZWdvcnlNYXBbb1dvcmQuY2F0ZWdvcnldIHx8IFtdO1xuICAgICAgICBtLmZvckVhY2goZnVuY3Rpb24gKG9Qb3NpdGlvbikge1xuICAgICAgICAgICAgb1dvcmQucmVpbmZvcmNlID0gb1dvcmQucmVpbmZvcmNlIHx8IDE7XG4gICAgICAgICAgICB2YXIgYm9vc3QgPSByZWluZm9yY2VEaXN0V2VpZ2h0KGlJbmRleCAtIG9Qb3NpdGlvbi5wb3MsIG9Xb3JkLmNhdGVnb3J5KTtcbiAgICAgICAgICAgIG9Xb3JkLnJlaW5mb3JjZSAqPSBib29zdDtcbiAgICAgICAgICAgIG9Xb3JkLl9yYW5raW5nICo9IGJvb3N0O1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gb1NlbnRlbmNlO1xufVxuZXhwb3J0cy5yZWluRm9yY2VTZW50ZW5jZSA9IHJlaW5Gb3JjZVNlbnRlbmNlO1xudmFyIFNlbnRlbmNlID0gcmVxdWlyZSgnLi9zZW50ZW5jZScpO1xuZnVuY3Rpb24gcmVpbkZvcmNlKGFDYXRlZ29yaXplZEFycmF5KSB7XG4gICAgYUNhdGVnb3JpemVkQXJyYXkuZm9yRWFjaChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgIHJlaW5Gb3JjZVNlbnRlbmNlKG9TZW50ZW5jZSk7XG4gICAgfSk7XG4gICAgYUNhdGVnb3JpemVkQXJyYXkuc29ydChTZW50ZW5jZS5jbXBSYW5raW5nUHJvZHVjdCk7XG4gICAgZGVidWdsb2coXCJhZnRlciByZWluZm9yY2VcIiArIGFDYXRlZ29yaXplZEFycmF5Lm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICAgIHJldHVybiBhQ2F0ZWdvcml6ZWRBcnJheTtcbn1cbmV4cG9ydHMucmVpbkZvcmNlID0gcmVpbkZvcmNlO1xuLy8vIGJlbG93IG1heSBubyBsb25nZXIgYmUgdXNlZFxuZnVuY3Rpb24gbWF0Y2hSZWdFeHAob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAoY29udGV4dFtvUnVsZS5rZXldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIHNLZXkgPSBvUnVsZS5rZXk7XG4gICAgdmFyIHMxID0gY29udGV4dFtvUnVsZS5rZXldLnRvTG93ZXJDYXNlKCk7XG4gICAgdmFyIHJlZyA9IG9SdWxlLnJlZ2V4cDtcbiAgICB2YXIgbSA9IHJlZy5leGVjKHMxKTtcbiAgICBkZWJ1Z2xvZyhcImFwcGx5aW5nIHJlZ2V4cDogXCIgKyBzMSArIFwiIFwiICsgSlNPTi5zdHJpbmdpZnkobSkpO1xuICAgIGlmICghbSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB2YXIgZGVsdGEgPSBjb21wYXJlQ29udGV4dChjb250ZXh0LCBvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlbHRhKSk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkob3B0aW9ucykpO1xuICAgIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgb0V4dHJhY3RlZENvbnRleHQgPSBleHRyYWN0QXJnc01hcChtLCBvUnVsZS5hcmdzTWFwKTtcbiAgICBkZWJ1Z2xvZyhcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUuYXJnc01hcCkpO1xuICAgIGRlYnVnbG9nKFwibWF0Y2ggXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XG4gICAgZGVidWdsb2coXCJleHRyYWN0ZWQgYXJncyBcIiArIEpTT04uc3RyaW5naWZ5KG9FeHRyYWN0ZWRDb250ZXh0KSk7XG4gICAgdmFyIHJlcyA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpO1xuICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvRXh0cmFjdGVkQ29udGV4dCk7XG4gICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIGNvbnRleHQpO1xuICAgIGlmIChvRXh0cmFjdGVkQ29udGV4dFtzS2V5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlc1tzS2V5XSA9IG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xuICAgICAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb1J1bGUuZm9sbG93cyk7XG4gICAgICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvRXh0cmFjdGVkQ29udGV4dCk7XG4gICAgfVxuICAgIE9iamVjdC5mcmVlemUocmVzKTtcbiAgICBkZWJ1Z2xvZygnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMubWF0Y2hSZWdFeHAgPSBtYXRjaFJlZ0V4cDtcbmZ1bmN0aW9uIHNvcnRCeVdlaWdodChzS2V5LCBvQ29udGV4dEEsIG9Db250ZXh0Qikge1xuICAgIGRlYnVnbG9nKCdzb3J0aW5nOiAnICsgc0tleSArICdpbnZva2VkIHdpdGhcXG4gMTonICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHRBLCB1bmRlZmluZWQsIDIpICtcbiAgICAgICAgXCIgdnMgXFxuIDI6XCIgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEIsIHVuZGVmaW5lZCwgMikpO1xuICAgIHZhciByYW5raW5nQSA9IHBhcnNlRmxvYXQob0NvbnRleHRBW1wiX3JhbmtpbmdcIl0gfHwgXCIxXCIpO1xuICAgIHZhciByYW5raW5nQiA9IHBhcnNlRmxvYXQob0NvbnRleHRCW1wiX3JhbmtpbmdcIl0gfHwgXCIxXCIpO1xuICAgIGlmIChyYW5raW5nQSAhPT0gcmFua2luZ0IpIHtcbiAgICAgICAgZGVidWdsb2coXCIgcmFua2luIGRlbHRhXCIgKyAxMDAgKiAocmFua2luZ0IgLSByYW5raW5nQSkpO1xuICAgICAgICByZXR1cm4gMTAwICogKHJhbmtpbmdCIC0gcmFua2luZ0EpO1xuICAgIH1cbiAgICB2YXIgd2VpZ2h0QSA9IG9Db250ZXh0QVtcIl93ZWlnaHRcIl0gJiYgb0NvbnRleHRBW1wiX3dlaWdodFwiXVtzS2V5XSB8fCAwO1xuICAgIHZhciB3ZWlnaHRCID0gb0NvbnRleHRCW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdW3NLZXldIHx8IDA7XG4gICAgcmV0dXJuICsod2VpZ2h0QSAtIHdlaWdodEIpO1xufVxuZXhwb3J0cy5zb3J0QnlXZWlnaHQgPSBzb3J0QnlXZWlnaHQ7XG4vLyBXb3JkLCBTeW5vbnltLCBSZWdleHAgLyBFeHRyYWN0aW9uUnVsZVxuZnVuY3Rpb24gYXVnbWVudENvbnRleHQxKGNvbnRleHQsIG9SdWxlcywgb3B0aW9ucykge1xuICAgIHZhciBzS2V5ID0gb1J1bGVzWzBdLmtleTtcbiAgICAvLyBjaGVjayB0aGF0IHJ1bGVcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAvLyBjaGVjayBjb25zaXN0ZW5jeVxuICAgICAgICBvUnVsZXMuZXZlcnkoZnVuY3Rpb24gKGlSdWxlKSB7XG4gICAgICAgICAgICBpZiAoaVJ1bGUua2V5ICE9PSBzS2V5KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW5ob21vZ2Vub3VzIGtleXMgaW4gcnVsZXMsIGV4cGVjdGVkIFwiICsgc0tleSArIFwiIHdhcyBcIiArIEpTT04uc3RyaW5naWZ5KGlSdWxlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8vIGxvb2sgZm9yIHJ1bGVzIHdoaWNoIG1hdGNoXG4gICAgdmFyIHJlcyA9IG9SdWxlcy5tYXAoZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgIC8vIGlzIHRoaXMgcnVsZSBhcHBsaWNhYmxlXG4gICAgICAgIHN3aXRjaCAob1J1bGUudHlwZSkge1xuICAgICAgICAgICAgY2FzZSAwIC8qIFdPUkQgKi86XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hdGNoV29yZChvUnVsZSwgY29udGV4dCwgb3B0aW9ucyk7XG4gICAgICAgICAgICBjYXNlIDEgLyogUkVHRVhQICovOlxuICAgICAgICAgICAgICAgIHJldHVybiBtYXRjaFJlZ0V4cChvUnVsZSwgY29udGV4dCwgb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9KS5maWx0ZXIoZnVuY3Rpb24gKG9yZXMpIHtcbiAgICAgICAgcmV0dXJuICEhb3JlcztcbiAgICB9KS5zb3J0KHNvcnRCeVdlaWdodC5iaW5kKHRoaXMsIHNLZXkpKTtcbiAgICByZXR1cm4gcmVzO1xuICAgIC8vIE9iamVjdC5rZXlzKCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xuICAgIC8vIH0pO1xufVxuZXhwb3J0cy5hdWdtZW50Q29udGV4dDEgPSBhdWdtZW50Q29udGV4dDE7XG5mdW5jdGlvbiBhdWdtZW50Q29udGV4dChjb250ZXh0LCBhUnVsZXMpIHtcbiAgICB2YXIgb3B0aW9uczEgPSB7XG4gICAgICAgIG1hdGNob3RoZXJzOiB0cnVlLFxuICAgICAgICBvdmVycmlkZTogZmFsc2VcbiAgICB9O1xuICAgIHZhciBhUmVzID0gYXVnbWVudENvbnRleHQxKGNvbnRleHQsIGFSdWxlcywgb3B0aW9uczEpO1xuICAgIGlmIChhUmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB2YXIgb3B0aW9uczIgPSB7XG4gICAgICAgICAgICBtYXRjaG90aGVyczogZmFsc2UsXG4gICAgICAgICAgICBvdmVycmlkZTogdHJ1ZVxuICAgICAgICB9O1xuICAgICAgICBhUmVzID0gYXVnbWVudENvbnRleHQxKGNvbnRleHQsIGFSdWxlcywgb3B0aW9uczIpO1xuICAgIH1cbiAgICByZXR1cm4gYVJlcztcbn1cbmV4cG9ydHMuYXVnbWVudENvbnRleHQgPSBhdWdtZW50Q29udGV4dDtcbmZ1bmN0aW9uIGluc2VydE9yZGVyZWQocmVzdWx0LCBpSW5zZXJ0ZWRNZW1iZXIsIGxpbWl0KSB7XG4gICAgLy8gVE9ETzogdXNlIHNvbWUgd2VpZ2h0XG4gICAgaWYgKHJlc3VsdC5sZW5ndGggPCBsaW1pdCkge1xuICAgICAgICByZXN1bHQucHVzaChpSW5zZXJ0ZWRNZW1iZXIpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuZXhwb3J0cy5pbnNlcnRPcmRlcmVkID0gaW5zZXJ0T3JkZXJlZDtcbmZ1bmN0aW9uIHRha2VUb3BOKGFycikge1xuICAgIHZhciB1ID0gYXJyLmZpbHRlcihmdW5jdGlvbiAoaW5uZXJBcnIpIHsgcmV0dXJuIGlubmVyQXJyLmxlbmd0aCA+IDA7IH0pO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICAvLyBzaGlmdCBvdXQgdGhlIHRvcCBvbmVzXG4gICAgdSA9IHUubWFwKGZ1bmN0aW9uIChpQXJyKSB7XG4gICAgICAgIHZhciB0b3AgPSBpQXJyLnNoaWZ0KCk7XG4gICAgICAgIHJlcyA9IGluc2VydE9yZGVyZWQocmVzLCB0b3AsIDUpO1xuICAgICAgICByZXR1cm4gaUFycjtcbiAgICB9KS5maWx0ZXIoZnVuY3Rpb24gKGlubmVyQXJyKSB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwOyB9KTtcbiAgICAvLyBhcyBBcnJheTxBcnJheTxJRk1hdGNoLmNvbnRleHQ+PlxuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLnRha2VUb3BOID0gdGFrZVRvcE47XG52YXIgaW5wdXRGaWx0ZXJSdWxlcyA9IHJlcXVpcmUoJy4vaW5wdXRGaWx0ZXJSdWxlcycpO1xudmFyIHJtO1xuZnVuY3Rpb24gZ2V0Uk1PbmNlKCkge1xuICAgIGlmICghcm0pIHtcbiAgICAgICAgcm0gPSBpbnB1dEZpbHRlclJ1bGVzLmdldFJ1bGVNYXAoKTtcbiAgICB9XG4gICAgcmV0dXJuIHJtO1xufVxuZnVuY3Rpb24gYXBwbHlSdWxlcyhjb250ZXh0KSB7XG4gICAgdmFyIGJlc3ROID0gW2NvbnRleHRdO1xuICAgIGlucHV0RmlsdGVyUnVsZXMub0tleU9yZGVyLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgICAgdmFyIGJlc3ROZXh0ID0gW107XG4gICAgICAgIGJlc3ROLmZvckVhY2goZnVuY3Rpb24gKG9Db250ZXh0KSB7XG4gICAgICAgICAgICBpZiAob0NvbnRleHRbc0tleV0pIHtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZygnKiogYXBwbHlpbmcgcnVsZXMgZm9yICcgKyBzS2V5KTtcbiAgICAgICAgICAgICAgICB2YXIgcmVzID0gYXVnbWVudENvbnRleHQob0NvbnRleHQsIGdldFJNT25jZSgpW3NLZXldIHx8IFtdKTtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZygnKiogcmVzdWx0IGZvciAnICsgc0tleSArICcgPSAnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgICAgICAgICBiZXN0TmV4dC5wdXNoKHJlcyB8fCBbXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBydWxlIG5vdCByZWxldmFudFxuICAgICAgICAgICAgICAgIGJlc3ROZXh0LnB1c2goW29Db250ZXh0XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBiZXN0TiA9IHRha2VUb3BOKGJlc3ROZXh0KTtcbiAgICB9KTtcbiAgICByZXR1cm4gYmVzdE47XG59XG5leHBvcnRzLmFwcGx5UnVsZXMgPSBhcHBseVJ1bGVzO1xuZnVuY3Rpb24gYXBwbHlSdWxlc1BpY2tGaXJzdChjb250ZXh0KSB7XG4gICAgdmFyIHIgPSBhcHBseVJ1bGVzKGNvbnRleHQpO1xuICAgIHJldHVybiByICYmIHJbMF07XG59XG5leHBvcnRzLmFwcGx5UnVsZXNQaWNrRmlyc3QgPSBhcHBseVJ1bGVzUGlja0ZpcnN0O1xuLyoqXG4gKiBEZWNpZGUgd2hldGhlciB0byByZXF1ZXJ5IGZvciBhIGNvbnRldFxuICovXG5mdW5jdGlvbiBkZWNpZGVPblJlUXVlcnkoY29udGV4dCkge1xuICAgIHJldHVybiBbXTtcbn1cbmV4cG9ydHMuZGVjaWRlT25SZVF1ZXJ5ID0gZGVjaWRlT25SZVF1ZXJ5O1xuIiwiLyoqXHJcbiAqIHRoZSBpbnB1dCBmaWx0ZXIgc3RhZ2UgcHJlcHJvY2Vzc2VzIGEgY3VycmVudCBjb250ZXh0XHJcbiAqXHJcbiAqIEl0IGEpIGNvbWJpbmVzIG11bHRpLXNlZ21lbnQgYXJndW1lbnRzIGludG8gb25lIGNvbnRleHQgbWVtYmVyc1xyXG4gKiBJdCBiKSBhdHRlbXB0cyB0byBhdWdtZW50IHRoZSBjb250ZXh0IGJ5IGFkZGl0aW9uYWwgcXVhbGlmaWNhdGlvbnNcclxuICogICAgICAgICAgIChNaWQgdGVybSBnZW5lcmF0aW5nIEFsdGVybmF0aXZlcywgZS5nLlxyXG4gKiAgICAgICAgICAgICAgICAgQ2xpZW50U2lkZVRhcmdldFJlc29sdXRpb24gLT4gdW5pdCB0ZXN0P1xyXG4gKiAgICAgICAgICAgICAgICAgQ2xpZW50U2lkZVRhcmdldFJlc29sdXRpb24gLT4gc291cmNlID9cclxuICogICAgICAgICAgIClcclxuICogIFNpbXBsZSBydWxlcyBsaWtlICBJbnRlbnRcclxuICpcclxuICpcclxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuaW5wdXRGaWx0ZXJcclxuICogQGZpbGUgaW5wdXRGaWx0ZXIudHNcclxuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxyXG4gKi9cclxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2xpYi9ub2RlLTQuZC50c1wiIC8+XHJcbmltcG9ydCAqIGFzIGRpc3RhbmNlIGZyb20gJy4uL3V0aWxzL2RhbWVyYXVMZXZlbnNodGVpbic7XHJcblxyXG5pbXBvcnQgKiBhcyBkZWJ1ZyBmcm9tICdkZWJ1Zyc7XHJcblxyXG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuLi91dGlscy91dGlscyc7XHJcblxyXG5cclxuaW1wb3J0ICogYXMgQWxnb2wgZnJvbSAnLi9hbGdvbCc7XHJcblxyXG5pbXBvcnQgKiBhcyBJTWF0Y2ggZnJvbSAnLi9pZm1hdGNoJztcclxuXHJcbmltcG9ydCAqIGFzIGJyZWFrZG93biBmcm9tICcuL2JyZWFrZG93bic7XHJcblxyXG5jb25zdCBBbnlPYmplY3QgPSA8YW55Pk9iamVjdDtcclxuXHJcbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ2lucHV0RmlsdGVyJylcclxuXHJcbmltcG9ydCAqIGFzIG1hdGNoZGF0YSBmcm9tICcuL21hdGNoZGF0YSc7XHJcbnZhciBvVW5pdFRlc3RzID0gbWF0Y2hkYXRhLm9Vbml0VGVzdHNcclxuXHJcbi8qKlxyXG4gKiBAcGFyYW0gc1RleHQge3N0cmluZ30gdGhlIHRleHQgdG8gbWF0Y2ggdG8gTmF2VGFyZ2V0UmVzb2x1dGlvblxyXG4gKiBAcGFyYW0gc1RleHQyIHtzdHJpbmd9IHRoZSBxdWVyeSB0ZXh0LCBlLmcuIE5hdlRhcmdldFxyXG4gKlxyXG4gKiBAcmV0dXJuIHRoZSBkaXN0YW5jZSwgbm90ZSB0aGF0IGlzIGlzICpub3QqIHN5bW1ldHJpYyFcclxuICovXHJcbmZ1bmN0aW9uIGNhbGNEaXN0YW5jZShzVGV4dDE6IHN0cmluZywgc1RleHQyOiBzdHJpbmcpOiBudW1iZXIge1xyXG4gIC8vIGNvbnNvbGUubG9nKFwibGVuZ3RoMlwiICsgc1RleHQxICsgXCIgLSBcIiArIHNUZXh0MilcclxuICB2YXIgYTAgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEuc3Vic3RyaW5nKDAsIHNUZXh0Mi5sZW5ndGgpLCBzVGV4dDIpXHJcbiAgdmFyIGEgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEudG9Mb3dlckNhc2UoKSwgc1RleHQyKVxyXG4gIHJldHVybiBhMCAqIDUwMCAvIHNUZXh0Mi5sZW5ndGggKyBhXHJcbn1cclxuXHJcbmltcG9ydCAqIGFzIElGTWF0Y2ggZnJvbSAnLi4vbWF0Y2gvaWZtYXRjaCc7XHJcblxyXG50eXBlIElSdWxlID0gSUZNYXRjaC5JUnVsZVxyXG5cclxuXHJcbmludGVyZmFjZSBJTWF0Y2hPcHRpb25zIHtcclxuICBtYXRjaG90aGVycz86IGJvb2xlYW4sXHJcbiAgYXVnbWVudD86IGJvb2xlYW4sXHJcbiAgb3ZlcnJpZGU/OiBib29sZWFuXHJcbn1cclxuXHJcbmludGVyZmFjZSBJTWF0Y2hDb3VudCB7XHJcbiAgZXF1YWw6IG51bWJlclxyXG4gIGRpZmZlcmVudDogbnVtYmVyXHJcbiAgc3B1cmlvdXNSOiBudW1iZXJcclxuICBzcHVyaW91c0w6IG51bWJlclxyXG59XHJcblxyXG50eXBlIEVudW1SdWxlVHlwZSA9IElGTWF0Y2guRW51bVJ1bGVUeXBlXHJcblxyXG5jb25zdCBsZXZlbkN1dG9mZiA9IEFsZ29sLkN1dG9mZl9MZXZlblNodGVpbjtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBsZXZlblBlbmFsdHkoaTogbnVtYmVyKTogbnVtYmVyIHtcclxuICAvLyAwLT4gMVxyXG4gIC8vIDEgLT4gMC4xXHJcbiAgLy8gMTUwIC0+ICAwLjhcclxuICBpZiAoaSA9PT0gMCkge1xyXG4gICAgcmV0dXJuIDE7XHJcbiAgfVxyXG4gIC8vIHJldmVyc2UgbWF5IGJlIGJldHRlciB0aGFuIGxpbmVhclxyXG4gIHJldHVybiAxICsgaSAqICgwLjggLSAxKSAvIDE1MFxyXG59XHJcblxyXG5mdW5jdGlvbiBub25Qcml2YXRlS2V5cyhvQSkge1xyXG4gIHJldHVybiBPYmplY3Qua2V5cyhvQSkuZmlsdGVyKGtleSA9PiB7XHJcbiAgICByZXR1cm4ga2V5WzBdICE9PSAnXyc7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjb3VudEFpbkIob0EsIG9CLCBmbkNvbXBhcmUsIGFLZXlJZ25vcmU/KTogbnVtYmVyIHtcclxuICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxyXG4gICAgdHlwZW9mIGFLZXlJZ25vcmUgPT09IFwic3RyaW5nXCIgPyBbYUtleUlnbm9yZV0gOiBbXTtcclxuICBmbkNvbXBhcmUgPSBmbkNvbXBhcmUgfHwgZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfVxyXG4gIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcclxuICAgIHJldHVybiBhS2V5SWdub3JlLmluZGV4T2Yoa2V5KSA8IDA7XHJcbiAgfSkuXHJcbiAgICByZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xyXG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9CLCBrZXkpKSB7XHJcbiAgICAgICAgcHJldiA9IHByZXYgKyAoZm5Db21wYXJlKG9BW2tleV0sIG9CW2tleV0sIGtleSkgPyAxIDogMClcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldlxyXG4gICAgfSwgMClcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNwdXJpb3VzQW5vdEluQihvQSwgb0IsIGFLZXlJZ25vcmU/KSB7XHJcbiAgYUtleUlnbm9yZSA9IEFycmF5LmlzQXJyYXkoYUtleUlnbm9yZSkgPyBhS2V5SWdub3JlIDpcclxuICAgIHR5cGVvZiBhS2V5SWdub3JlID09PSBcInN0cmluZ1wiID8gW2FLZXlJZ25vcmVdIDogW107XHJcbiAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xyXG4gICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcclxuICB9KS5cclxuICAgIHJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XHJcbiAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9CLCBrZXkpKSB7XHJcbiAgICAgICAgcHJldiA9IHByZXYgKyAxXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHByZXZcclxuICAgIH0sIDApXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvd2VyQ2FzZShvKSB7XHJcbiAgaWYgKHR5cGVvZiBvID09PSBcInN0cmluZ1wiKSB7XHJcbiAgICByZXR1cm4gby50b0xvd2VyQ2FzZSgpXHJcbiAgfVxyXG4gIHJldHVybiBvXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjb21wYXJlQ29udGV4dChvQSwgb0IsIGFLZXlJZ25vcmU/KSB7XHJcbiAgdmFyIGVxdWFsID0gY291bnRBaW5CKG9BLCBvQiwgZnVuY3Rpb24gKGEsIGIpIHsgcmV0dXJuIGxvd2VyQ2FzZShhKSA9PT0gbG93ZXJDYXNlKGIpOyB9LCBhS2V5SWdub3JlKTtcclxuICB2YXIgZGlmZmVyZW50ID0gY291bnRBaW5CKG9BLCBvQiwgZnVuY3Rpb24gKGEsIGIpIHsgcmV0dXJuIGxvd2VyQ2FzZShhKSAhPT0gbG93ZXJDYXNlKGIpOyB9LCBhS2V5SWdub3JlKTtcclxuICB2YXIgc3B1cmlvdXNMID0gc3B1cmlvdXNBbm90SW5CKG9BLCBvQiwgYUtleUlnbm9yZSlcclxuICB2YXIgc3B1cmlvdXNSID0gc3B1cmlvdXNBbm90SW5CKG9CLCBvQSwgYUtleUlnbm9yZSlcclxuICByZXR1cm4ge1xyXG4gICAgZXF1YWw6IGVxdWFsLFxyXG4gICAgZGlmZmVyZW50OiBkaWZmZXJlbnQsXHJcbiAgICBzcHVyaW91c0w6IHNwdXJpb3VzTCxcclxuICAgIHNwdXJpb3VzUjogc3B1cmlvdXNSXHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBzb3J0QnlSYW5rKGE6IElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nLCBiOiBJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZyk6IG51bWJlciB7XHJcbiAgcmV0dXJuIC0oKGEuX3JhbmtpbmcgfHwgMS4wKSAtIChiLl9yYW5raW5nIHx8IDEuMCkpO1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNhdGVnb3JpemVTdHJpbmcoc3RyaW5nOiBzdHJpbmcsIGV4YWN0OiBib29sZWFuLCBvUnVsZXM6IEFycmF5PElNYXRjaC5tUnVsZT4pOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4ge1xyXG4gIC8vIHNpbXBseSBhcHBseSBhbGwgcnVsZXNcclxuICBkZWJ1ZyhcInJ1bGVzIDogXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZXMpKTtcclxuICB2YXIgcmVzOiBBcnJheTxJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiA9IFtdXHJcbiAgb1J1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XHJcbiAgICBzd2l0Y2ggKG9SdWxlLnR5cGUpIHtcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5XT1JEOlxyXG4gICAgICAgIGlmIChleGFjdCAmJiBvUnVsZS53b3JkID09PSBzdHJpbmcpIHtcclxuICAgICAgICAgIHJlcy5wdXNoKHtcclxuICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCFleGFjdCkge1xyXG4gICAgICAgICAgdmFyIGxldmVubWF0Y2ggPSBjYWxjRGlzdGFuY2Uob1J1bGUud29yZCwgc3RyaW5nKVxyXG4gICAgICAgICAgaWYgKGxldmVubWF0Y2ggPCBsZXZlbkN1dG9mZikge1xyXG4gICAgICAgICAgICByZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUud29yZCxcclxuICAgICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXHJcbiAgICAgICAgICAgICAgX3Jhbmtpbmc6IChvUnVsZS5fcmFua2luZyB8fCAxLjApICogbGV2ZW5QZW5hbHR5KGxldmVubWF0Y2gpLFxyXG4gICAgICAgICAgICAgIGxldmVubWF0Y2g6IGxldmVubWF0Y2hcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuUkVHRVhQOiB7XHJcbiAgICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoXCIgaGVyZSByZWdleHBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKSlcclxuICAgICAgICB2YXIgbSA9IG9SdWxlLnJlZ2V4cC5leGVjKHN0cmluZylcclxuICAgICAgICBpZiAobSkge1xyXG4gICAgICAgICAgcmVzLnB1c2goe1xyXG4gICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogKG9SdWxlLm1hdGNoSW5kZXggIT09IHVuZGVmaW5lZCAmJiBtW29SdWxlLm1hdGNoSW5kZXhdKSB8fCBzdHJpbmcsXHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmtub3duIHR5cGVcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKVxyXG4gICAgfVxyXG4gIH0pO1xyXG4gIHJlcy5zb3J0KHNvcnRCeVJhbmspO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuLyoqXHJcbiAqXHJcbiAqIE9wdGlvbnMgbWF5IGJlIHtcclxuICogbWF0Y2hvdGhlcnMgOiB0cnVlLCAgPT4gb25seSBydWxlcyB3aGVyZSBhbGwgb3RoZXJzIG1hdGNoIGFyZSBjb25zaWRlcmVkXHJcbiAqIGF1Z21lbnQgOiB0cnVlLFxyXG4gKiBvdmVycmlkZSA6IHRydWUgfSAgPT5cclxuICpcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFdvcmQob1J1bGU6IElSdWxlLCBjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQsIG9wdGlvbnM/OiBJTWF0Y2hPcHRpb25zKSB7XHJcbiAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKVxyXG4gIHZhciBzMiA9IG9SdWxlLndvcmQudG9Mb3dlckNhc2UoKTtcclxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxyXG4gIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsIG9SdWxlLmZvbGxvd3MsIG9SdWxlLmtleSlcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xyXG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcclxuICBpZiAob3B0aW9ucy5tYXRjaG90aGVycyAmJiAoZGVsdGEuZGlmZmVyZW50ID4gMCkpIHtcclxuICAgIHJldHVybiB1bmRlZmluZWRcclxuICB9XHJcbiAgdmFyIGM6IG51bWJlciA9IGNhbGNEaXN0YW5jZShzMiwgczEpO1xyXG4gIGRlYnVnbG9nKFwiIHMxIDw+IHMyIFwiICsgczEgKyBcIjw+XCIgKyBzMiArIFwiICA9PjogXCIgKyBjKTtcclxuICBpZiAoYyA8IDE1MCkge1xyXG4gICAgdmFyIHJlcyA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpIGFzIGFueTtcclxuICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcclxuICAgIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XHJcbiAgICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvUnVsZS5mb2xsb3dzKTtcclxuICAgIH1cclxuICAgIC8vIGZvcmNlIGtleSBwcm9wZXJ0eVxyXG4gICAgLy8gY29uc29sZS5sb2coJyBvYmplY3RjYXRlZ29yeScsIHJlc1snc3lzdGVtT2JqZWN0Q2F0ZWdvcnknXSk7XHJcbiAgICByZXNbb1J1bGUua2V5XSA9IG9SdWxlLmZvbGxvd3Nbb1J1bGUua2V5XSB8fCByZXNbb1J1bGUua2V5XTtcclxuICAgIHJlcy5fd2VpZ2h0ID0gQW55T2JqZWN0LmFzc2lnbih7fSwgcmVzLl93ZWlnaHQpO1xyXG4gICAgcmVzLl93ZWlnaHRbb1J1bGUua2V5XSA9IGM7XHJcbiAgICBPYmplY3QuZnJlZXplKHJlcyk7XHJcbiAgICBkZWJ1Z2xvZygnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSk7XHJcbiAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuICByZXR1cm4gdW5kZWZpbmVkO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEFyZ3NNYXAobWF0Y2g6IEFycmF5PHN0cmluZz4sIGFyZ3NNYXA6IHsgW2tleTogbnVtYmVyXTogc3RyaW5nIH0pOiBJRk1hdGNoLmNvbnRleHQge1xyXG4gIHZhciByZXMgPSB7fSBhcyBJRk1hdGNoLmNvbnRleHQ7XHJcbiAgaWYgKCFhcmdzTWFwKSB7XHJcbiAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuICBPYmplY3Qua2V5cyhhcmdzTWFwKS5mb3JFYWNoKGZ1bmN0aW9uIChpS2V5KSB7XHJcbiAgICB2YXIgdmFsdWUgPSBtYXRjaFtpS2V5XVxyXG4gICAgdmFyIGtleSA9IGFyZ3NNYXBbaUtleV07XHJcbiAgICBpZiAoKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikgJiYgdmFsdWUubGVuZ3RoID4gMCkge1xyXG4gICAgICByZXNba2V5XSA9IHZhbHVlXHJcbiAgICB9XHJcbiAgfVxyXG4gICk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IFJhbmtXb3JkID0ge1xyXG4gIGhhc0Fib3ZlOiBmdW5jdGlvbiAobHN0OiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4sIGJvcmRlcjogbnVtYmVyKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gIWxzdC5ldmVyeShmdW5jdGlvbiAob01lbWJlcikge1xyXG4gICAgICByZXR1cm4gKG9NZW1iZXIuX3JhbmtpbmcgPCBib3JkZXIpO1xyXG4gICAgfSk7XHJcbiAgfSxcclxuXHJcbiAgdGFrZUZpcnN0TjogZnVuY3Rpb24gKGxzdDogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+LCBuOiBudW1iZXIpOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4ge1xyXG4gICAgcmV0dXJuIGxzdC5maWx0ZXIoZnVuY3Rpb24gKG9NZW1iZXIsIGlJbmRleCkge1xyXG4gICAgICB2YXIgbGFzdFJhbmtpbmcgPSAxLjA7XHJcbiAgICAgIGlmICgoaUluZGV4IDwgbikgfHwgb01lbWJlci5fcmFua2luZyA9PT0gbGFzdFJhbmtpbmcpIHtcclxuICAgICAgICBsYXN0UmFua2luZyA9IG9NZW1iZXIuX3Jhbmtpbmc7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfSk7XHJcbiAgfSxcclxuICB0YWtlQWJvdmU6IGZ1bmN0aW9uIChsc3Q6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiwgYm9yZGVyOiBudW1iZXIpOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4ge1xyXG4gICAgcmV0dXJuIGxzdC5maWx0ZXIoZnVuY3Rpb24gKG9NZW1iZXIpIHtcclxuICAgICAgcmV0dXJuIChvTWVtYmVyLl9yYW5raW5nID49IGJvcmRlcik7XHJcbiAgICB9KTtcclxuICB9XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZihzV29yZEdyb3VwOiBzdHJpbmcsIGFSdWxlczogQXJyYXk8SUZNYXRjaC5tUnVsZT4pOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4ge1xyXG4gIHZhciBzZWVuSXQgPSBjYXRlZ29yaXplU3RyaW5nKHNXb3JkR3JvdXAsIHRydWUsIGFSdWxlcyk7XHJcbiAgaWYgKFJhbmtXb3JkLmhhc0Fib3ZlKHNlZW5JdCwgMC44KSkge1xyXG4gICAgc2Vlbkl0ID0gUmFua1dvcmQudGFrZUFib3ZlKHNlZW5JdCwgMC44KTtcclxuICB9IGVsc2Uge1xyXG4gICAgc2Vlbkl0ID0gY2F0ZWdvcml6ZVN0cmluZyhzV29yZEdyb3VwLCBmYWxzZSwgYVJ1bGVzKTtcclxuICB9XHJcbiAgc2Vlbkl0ID0gUmFua1dvcmQudGFrZUZpcnN0TihzZWVuSXQsIEFsZ29sLlRvcF9OX1dvcmRDYXRlZ29yaXphdGlvbnMpO1xyXG4gIHJldHVybiBzZWVuSXQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHaXZlbiBhICBzdHJpbmcsIGJyZWFrIGl0IGRvd24gaW50byBjb21wb25lbnRzLFxyXG4gKiB0aGVuIGNhdGVnb3JpemVXb3Jkc1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVTdHJpbmcoc1N0cmluZzogc3RyaW5nLCBhUnVsZXM6IEFycmF5PElNYXRjaC5tUnVsZT4pIHtcclxuICB2YXIgY250ID0gMDtcclxuICB2YXIgZmFjID0gMTtcclxuICB2YXIgdSA9IGJyZWFrZG93bi5icmVha2Rvd25TdHJpbmcoc1N0cmluZyk7XHJcbiAgZGVidWdsb2coXCJoZXJlIGJyZWFrZG93blwiICsgSlNPTi5zdHJpbmdpZnkodSkpO1xyXG4gIHZhciB3b3JkcyA9IHt9IGFzIHsgW2tleTogc3RyaW5nXTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IH07XHJcbiAgdmFyIHJlcyA9IHUubWFwKGZ1bmN0aW9uIChhQXJyKSB7XHJcbiAgICByZXR1cm4gYUFyci5tYXAoZnVuY3Rpb24gKHNXb3JkR3JvdXA6IHN0cmluZykge1xyXG4gICAgICB2YXIgc2Vlbkl0ID0gd29yZHNbc1dvcmRHcm91cF07XHJcbiAgICAgIGlmIChzZWVuSXQgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHNlZW5JdCA9IGNhdGVnb3JpemVXb3JkV2l0aFJhbmtDdXRvZmYoc1dvcmRHcm91cCwgYVJ1bGVzKTtcclxuICAgICAgICB3b3Jkc1tzV29yZEdyb3VwXSA9IHNlZW5JdDtcclxuICAgICAgfVxyXG4gICAgICBjbnQgPSBjbnQgKyBzZWVuSXQubGVuZ3RoO1xyXG4gICAgICBmYWMgPSBmYWMgKiBzZWVuSXQubGVuZ3RoO1xyXG4gICAgICBpZiAoIXNlZW5JdCB8fCBzZWVuSXQubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0aW5nIGF0IGxlYXN0IG9uZSBtYXRjaCBmb3IgXCIgKyBzV29yZEdyb3VwKVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBzZWVuSXQ7XHJcbiAgICB9KTtcclxuICB9KVxyXG4gIGRlYnVnbG9nKFwiIHNlbnRlbmNlcyBcIiArIHUubGVuZ3RoICsgXCIgbWF0Y2hlcyBcIiArIGNudCArIFwiIGZhYzogXCIgKyBmYWMpO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbi8qXHJcblsgW2EsYl0sIFtjLGRdXVxyXG5cclxuMDAgYVxyXG4wMSBiXHJcbjEwIGNcclxuMTEgZFxyXG4xMiBjXHJcbiovXHJcblxyXG5cclxuY29uc3QgY2xvbmUgPSB1dGlscy5jbG9uZURlZXA7XHJcblxyXG4vLyB3ZSBjYW4gcmVwbGljYXRlIHRoZSB0YWlsIG9yIHRoZSBoZWFkLFxyXG4vLyB3ZSByZXBsaWNhdGUgdGhlIHRhaWwgYXMgaXQgaXMgc21hbGxlci5cclxuXHJcbi8vIFthLGIsYyBdXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZXhwYW5kTWF0Y2hBcnIoZGVlcDogQXJyYXk8QXJyYXk8YW55Pj4pOiBBcnJheTxBcnJheTxhbnk+PiB7XHJcbiAgdmFyIGEgPSBbXTtcclxuICB2YXIgbGluZSA9IFtdO1xyXG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlZXApKTtcclxuICBkZWVwLmZvckVhY2goZnVuY3Rpb24gKHVCcmVha0Rvd25MaW5lLCBpSW5kZXg6IG51bWJlcikge1xyXG4gICAgbGluZVtpSW5kZXhdID0gW107XHJcbiAgICB1QnJlYWtEb3duTGluZS5mb3JFYWNoKGZ1bmN0aW9uIChhV29yZEdyb3VwLCB3Z0luZGV4OiBudW1iZXIpIHtcclxuICAgICAgbGluZVtpSW5kZXhdW3dnSW5kZXhdID0gW107XHJcbiAgICAgIGFXb3JkR3JvdXAuZm9yRWFjaChmdW5jdGlvbiAob1dvcmRWYXJpYW50LCBpV1ZJbmRleDogbnVtYmVyKSB7XHJcbiAgICAgICAgbGluZVtpSW5kZXhdW3dnSW5kZXhdW2lXVkluZGV4XSA9IG9Xb3JkVmFyaWFudDtcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9KVxyXG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGxpbmUpKTtcclxuICB2YXIgcmVzID0gW107XHJcbiAgdmFyIG52ZWNzID0gW107XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lLmxlbmd0aDsgKytpKSB7XHJcbiAgICB2YXIgdmVjcyA9IFtbXV07XHJcbiAgICB2YXIgbnZlY3MgPSBbXTtcclxuICAgIHZhciBydmVjID0gW107XHJcbiAgICBmb3IgKHZhciBrID0gMDsgayA8IGxpbmVbaV0ubGVuZ3RoOyArK2spIHsgLy8gd29yZGdyb3VwIGtcclxuICAgICAgLy92ZWNzIGlzIHRoZSB2ZWN0b3Igb2YgYWxsIHNvIGZhciBzZWVuIHZhcmlhbnRzIHVwIHRvIGsgd2dzLlxyXG4gICAgICB2YXIgbmV4dEJhc2UgPSBbXTtcclxuICAgICAgZm9yICh2YXIgbCA9IDA7IGwgPCBsaW5lW2ldW2tdLmxlbmd0aDsgKytsKSB7IC8vIGZvciBlYWNoIHZhcmlhbnRcclxuICAgICAgICAvL2RlYnVnbG9nKFwidmVjcyBub3dcIiArIEpTT04uc3RyaW5naWZ5KHZlY3MpKTtcclxuICAgICAgICBudmVjcyA9IFtdOyAvL3ZlY3Muc2xpY2UoKTsgLy8gY29weSB0aGUgdmVjW2ldIGJhc2UgdmVjdG9yO1xyXG4gICAgICAgIC8vZGVidWdsb2coXCJ2ZWNzIGNvcGllZCBub3dcIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSk7XHJcbiAgICAgICAgZm9yICh2YXIgdSA9IDA7IHUgPCB2ZWNzLmxlbmd0aDsgKyt1KSB7XHJcbiAgICAgICAgICBudmVjc1t1XSA9IHZlY3NbdV0uc2xpY2UoKTsgLy9cclxuICAgICAgICAgIC8vIGRlYnVnbG9nKFwiY29waWVkIHZlY3NbXCIrIHUrXCJdXCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzW3VdKSk7XHJcbiAgICAgICAgICBudmVjc1t1XS5wdXNoKFxyXG4gICAgICAgICAgICBjbG9uZShsaW5lW2ldW2tdW2xdKSk7IC8vIHB1c2ggdGhlIGx0aCB2YXJpYW50XHJcbiAgICAgICAgICAvLyBkZWJ1Z2xvZyhcIm5vdyBudmVjcyBcIiArIG52ZWNzLmxlbmd0aCArIFwiIFwiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gICBkZWJ1Z2xvZyhcIiBhdCAgICAgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbmV4dGJhc2UgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxyXG4gICAgICAgIC8vICAgZGVidWdsb2coXCIgYXBwZW5kIFwiICsgayArIFwiOlwiICsgbCArIFwiIG52ZWNzICAgID5cIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSlcclxuICAgICAgICBuZXh0QmFzZSA9IG5leHRCYXNlLmNvbmNhdChudmVjcyk7XHJcbiAgICAgICAgLy8gICBkZWJ1Z2xvZyhcIiAgcmVzdWx0IFwiICsgayArIFwiOlwiICsgbCArIFwiIG52ZWNzICAgID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcclxuICAgICAgfSAvL2NvbnN0cnVcclxuICAgICAgLy8gIGRlYnVnbG9nKFwibm93IGF0IFwiICsgayArIFwiOlwiICsgbCArIFwiID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcclxuICAgICAgdmVjcyA9IG5leHRCYXNlO1xyXG4gICAgfVxyXG4gICAgZGVidWdsb2coXCJBUFBFTkRJTkcgVE8gUkVTXCIgKyBpICsgXCI6XCIgKyBsICsgXCIgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxyXG4gICAgcmVzID0gcmVzLmNvbmNhdCh2ZWNzKTtcclxuICB9XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuXHJcbi8qKlxyXG4gKiBDYWxjdWxhdGUgYSB3ZWlnaHQgZmFjdG9yIGZvciBhIGdpdmVuIGRpc3RhbmNlIGFuZFxyXG4gKiBjYXRlZ29yeVxyXG4gKiBAcGFyYW0ge2ludGVnZXJ9IGRpc3QgZGlzdGFuY2UgaW4gd29yZHNcclxuICogQHBhcmFtIHtzdHJpbmd9IGNhdGVnb3J5IGNhdGVnb3J5IHRvIHVzZVxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBhIGRpc3RhbmNlIGZhY3RvciA+PSAxXHJcbiAqICAxLjAgZm9yIG5vIGVmZmVjdFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlaW5mb3JjZURpc3RXZWlnaHQoZGlzdDogbnVtYmVyLCBjYXRlZ29yeTogc3RyaW5nKTogbnVtYmVyIHtcclxuICB2YXIgYWJzID0gTWF0aC5hYnMoZGlzdCk7XHJcbiAgcmV0dXJuIDEuMCArIChBbGdvbC5hUmVpbmZvcmNlRGlzdFdlaWdodFthYnNdIHx8IDApO1xyXG59XHJcblxyXG4vKipcclxuICogR2l2ZW4gYSBzZW50ZW5jZSwgZXh0YWN0IGNhdGVnb3JpZXNcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0Q2F0ZWdvcnlNYXAob1NlbnRlbmNlOiBBcnJheTxJRk1hdGNoLklXb3JkPik6IHsgW2tleTogc3RyaW5nXTogQXJyYXk8eyBwb3M6IG51bWJlciB9PiB9IHtcclxuICB2YXIgcmVzID0ge307XHJcbiAgZGVidWdsb2coJ2V4dHJhY3RDYXRlZ29yeU1hcCAnICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKSk7XHJcbiAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpSW5kZXgpIHtcclxuICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gSUZNYXRjaC5DQVRfQ0FURUdPUlkpIHtcclxuICAgICAgcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddID0gcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddIHx8IFtdO1xyXG4gICAgICByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10ucHVzaCh7IHBvczogaUluZGV4IH0pO1xyXG4gICAgfVxyXG4gIH0pO1xyXG4gIHV0aWxzLmRlZXBGcmVlemUocmVzKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVpbkZvcmNlU2VudGVuY2Uob1NlbnRlbmNlKSB7XHJcbiAgdmFyIG9DYXRlZ29yeU1hcCA9IGV4dHJhY3RDYXRlZ29yeU1hcChvU2VudGVuY2UpO1xyXG4gIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaUluZGV4KSB7XHJcbiAgICB2YXIgbSA9IG9DYXRlZ29yeU1hcFtvV29yZC5jYXRlZ29yeV0gfHwgW107XHJcbiAgICBtLmZvckVhY2goZnVuY3Rpb24gKG9Qb3NpdGlvbjogeyBwb3M6IG51bWJlciB9KSB7XHJcbiAgICAgIG9Xb3JkLnJlaW5mb3JjZSA9IG9Xb3JkLnJlaW5mb3JjZSB8fCAxO1xyXG4gICAgICB2YXIgYm9vc3QgPSByZWluZm9yY2VEaXN0V2VpZ2h0KGlJbmRleCAtIG9Qb3NpdGlvbi5wb3MsIG9Xb3JkLmNhdGVnb3J5KTtcclxuICAgICAgb1dvcmQucmVpbmZvcmNlICo9IGJvb3N0O1xyXG4gICAgICBvV29yZC5fcmFua2luZyAqPSBib29zdDtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG4gIHJldHVybiBvU2VudGVuY2U7XHJcbn1cclxuXHJcblxyXG5pbXBvcnQgKiBhcyBTZW50ZW5jZSBmcm9tICcuL3NlbnRlbmNlJztcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWluRm9yY2UoYUNhdGVnb3JpemVkQXJyYXkpIHtcclxuICBhQ2F0ZWdvcml6ZWRBcnJheS5mb3JFYWNoKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcclxuICAgIHJlaW5Gb3JjZVNlbnRlbmNlKG9TZW50ZW5jZSk7XHJcbiAgfSlcclxuICBhQ2F0ZWdvcml6ZWRBcnJheS5zb3J0KFNlbnRlbmNlLmNtcFJhbmtpbmdQcm9kdWN0KTtcclxuICBkZWJ1Z2xvZyhcImFmdGVyIHJlaW5mb3JjZVwiICsgYUNhdGVnb3JpemVkQXJyYXkubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcclxuICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xyXG4gIH0pLmpvaW4oXCJcXG5cIikpO1xyXG4gIHJldHVybiBhQ2F0ZWdvcml6ZWRBcnJheTtcclxufVxyXG5cclxuXHJcbi8vLyBiZWxvdyBtYXkgbm8gbG9uZ2VyIGJlIHVzZWRcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFJlZ0V4cChvUnVsZTogSVJ1bGUsIGNvbnRleHQ6IElGTWF0Y2guY29udGV4dCwgb3B0aW9ucz86IElNYXRjaE9wdGlvbnMpIHtcclxuICBpZiAoY29udGV4dFtvUnVsZS5rZXldID09PSB1bmRlZmluZWQpIHtcclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgfVxyXG4gIHZhciBzS2V5ID0gb1J1bGUua2V5O1xyXG4gIHZhciBzMSA9IGNvbnRleHRbb1J1bGUua2V5XS50b0xvd2VyQ2FzZSgpXHJcbiAgdmFyIHJlZyA9IG9SdWxlLnJlZ2V4cDtcclxuXHJcbiAgdmFyIG0gPSByZWcuZXhlYyhzMSk7XHJcbiAgZGVidWdsb2coXCJhcHBseWluZyByZWdleHA6IFwiICsgczEgKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KG0pKTtcclxuICBpZiAoIW0pIHtcclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgfVxyXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XHJcbiAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCwgb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KVxyXG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlbHRhKSk7XHJcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkob3B0aW9ucykpO1xyXG4gIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gIH1cclxuICB2YXIgb0V4dHJhY3RlZENvbnRleHQgPSBleHRyYWN0QXJnc01hcChtLCBvUnVsZS5hcmdzTWFwKTtcclxuICBkZWJ1Z2xvZyhcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUuYXJnc01hcCkpO1xyXG4gIGRlYnVnbG9nKFwibWF0Y2ggXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XHJcblxyXG4gIGRlYnVnbG9nKFwiZXh0cmFjdGVkIGFyZ3MgXCIgKyBKU09OLnN0cmluZ2lmeShvRXh0cmFjdGVkQ29udGV4dCkpO1xyXG4gIHZhciByZXMgPSBBbnlPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKSBhcyBhbnk7XHJcbiAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9FeHRyYWN0ZWRDb250ZXh0KTtcclxuICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgY29udGV4dCk7XHJcbiAgaWYgKG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldICE9PSB1bmRlZmluZWQpIHtcclxuICAgIHJlc1tzS2V5XSA9IG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldO1xyXG4gIH1cclxuICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xyXG4gICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xyXG4gICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9FeHRyYWN0ZWRDb250ZXh0KVxyXG4gIH1cclxuICBPYmplY3QuZnJlZXplKHJlcyk7XHJcbiAgZGVidWdsb2coJ0ZvdW5kIG9uZScgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzb3J0QnlXZWlnaHQoc0tleTogc3RyaW5nLCBvQ29udGV4dEE6IElGTWF0Y2guY29udGV4dCwgb0NvbnRleHRCOiBJRk1hdGNoLmNvbnRleHQpOiBudW1iZXIge1xyXG4gIGRlYnVnbG9nKCdzb3J0aW5nOiAnICsgc0tleSArICdpbnZva2VkIHdpdGhcXG4gMTonICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHRBLCB1bmRlZmluZWQsIDIpICtcclxuICAgIFwiIHZzIFxcbiAyOlwiICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHRCLCB1bmRlZmluZWQsIDIpKTtcclxuICB2YXIgcmFua2luZ0E6IG51bWJlciA9IHBhcnNlRmxvYXQob0NvbnRleHRBW1wiX3JhbmtpbmdcIl0gfHwgXCIxXCIpO1xyXG4gIHZhciByYW5raW5nQjogbnVtYmVyID0gcGFyc2VGbG9hdChvQ29udGV4dEJbXCJfcmFua2luZ1wiXSB8fCBcIjFcIik7XHJcbiAgaWYgKHJhbmtpbmdBICE9PSByYW5raW5nQikge1xyXG4gICAgZGVidWdsb2coXCIgcmFua2luIGRlbHRhXCIgKyAxMDAgKiAocmFua2luZ0IgLSByYW5raW5nQSkpO1xyXG4gICAgcmV0dXJuIDEwMCAqIChyYW5raW5nQiAtIHJhbmtpbmdBKVxyXG4gIH1cclxuXHJcbiAgdmFyIHdlaWdodEEgPSBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QVtcIl93ZWlnaHRcIl1bc0tleV0gfHwgMDtcclxuICB2YXIgd2VpZ2h0QiA9IG9Db250ZXh0QltcIl93ZWlnaHRcIl0gJiYgb0NvbnRleHRCW1wiX3dlaWdodFwiXVtzS2V5XSB8fCAwO1xyXG4gIHJldHVybiArKHdlaWdodEEgLSB3ZWlnaHRCKTtcclxufVxyXG5cclxuXHJcbi8vIFdvcmQsIFN5bm9ueW0sIFJlZ2V4cCAvIEV4dHJhY3Rpb25SdWxlXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXVnbWVudENvbnRleHQxKGNvbnRleHQ6IElGTWF0Y2guY29udGV4dCwgb1J1bGVzOiBBcnJheTxJUnVsZT4sIG9wdGlvbnM6IElNYXRjaE9wdGlvbnMpOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICB2YXIgc0tleSA9IG9SdWxlc1swXS5rZXk7XHJcbiAgLy8gY2hlY2sgdGhhdCBydWxlXHJcbiAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIC8vIGNoZWNrIGNvbnNpc3RlbmN5XHJcbiAgICBvUnVsZXMuZXZlcnkoZnVuY3Rpb24gKGlSdWxlKSB7XHJcbiAgICAgIGlmIChpUnVsZS5rZXkgIT09IHNLZXkpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbmhvbW9nZW5vdXMga2V5cyBpbiBydWxlcywgZXhwZWN0ZWQgXCIgKyBzS2V5ICsgXCIgd2FzIFwiICsgSlNPTi5zdHJpbmdpZnkoaVJ1bGUpKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLy8gbG9vayBmb3IgcnVsZXMgd2hpY2ggbWF0Y2hcclxuICB2YXIgcmVzID0gb1J1bGVzLm1hcChmdW5jdGlvbiAob1J1bGUpIHtcclxuICAgIC8vIGlzIHRoaXMgcnVsZSBhcHBsaWNhYmxlXHJcbiAgICBzd2l0Y2ggKG9SdWxlLnR5cGUpIHtcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5XT1JEOlxyXG4gICAgICAgIHJldHVybiBtYXRjaFdvcmQob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpXHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuUkVHRVhQOlxyXG4gICAgICAgIHJldHVybiBtYXRjaFJlZ0V4cChvUnVsZSwgY29udGV4dCwgb3B0aW9ucyk7XHJcbiAgICAgIC8vICAgY2FzZSBcIkV4dHJhY3Rpb25cIjpcclxuICAgICAgLy8gICAgIHJldHVybiBtYXRjaEV4dHJhY3Rpb24ob1J1bGUsY29udGV4dCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkXHJcbiAgfSkuZmlsdGVyKGZ1bmN0aW9uIChvcmVzKSB7XHJcbiAgICByZXR1cm4gISFvcmVzXHJcbiAgfSkuc29ydChcclxuICAgIHNvcnRCeVdlaWdodC5iaW5kKHRoaXMsIHNLZXkpXHJcbiAgICApO1xyXG4gIHJldHVybiByZXM7XHJcbiAgLy8gT2JqZWN0LmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XHJcbiAgLy8gfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhdWdtZW50Q29udGV4dChjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQsIGFSdWxlczogQXJyYXk8SVJ1bGU+KTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcblxyXG4gIHZhciBvcHRpb25zMTogSU1hdGNoT3B0aW9ucyA9IHtcclxuICAgIG1hdGNob3RoZXJzOiB0cnVlLFxyXG4gICAgb3ZlcnJpZGU6IGZhbHNlXHJcbiAgfSBhcyBJTWF0Y2hPcHRpb25zO1xyXG5cclxuICB2YXIgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMxKVxyXG5cclxuICBpZiAoYVJlcy5sZW5ndGggPT09IDApIHtcclxuICAgIHZhciBvcHRpb25zMjogSU1hdGNoT3B0aW9ucyA9IHtcclxuICAgICAgbWF0Y2hvdGhlcnM6IGZhbHNlLFxyXG4gICAgICBvdmVycmlkZTogdHJ1ZVxyXG4gICAgfSBhcyBJTWF0Y2hPcHRpb25zO1xyXG4gICAgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMyKTtcclxuICB9XHJcbiAgcmV0dXJuIGFSZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBpbnNlcnRPcmRlcmVkKHJlc3VsdDogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiwgaUluc2VydGVkTWVtYmVyOiBJRk1hdGNoLmNvbnRleHQsIGxpbWl0OiBudW1iZXIpOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICAvLyBUT0RPOiB1c2Ugc29tZSB3ZWlnaHRcclxuICBpZiAocmVzdWx0Lmxlbmd0aCA8IGxpbWl0KSB7XHJcbiAgICByZXN1bHQucHVzaChpSW5zZXJ0ZWRNZW1iZXIpXHJcbiAgfVxyXG4gIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdGFrZVRvcE4oYXJyOiBBcnJheTxBcnJheTxJRk1hdGNoLmNvbnRleHQ+Pik6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIHZhciB1ID0gYXJyLmZpbHRlcihmdW5jdGlvbiAoaW5uZXJBcnIpIHsgcmV0dXJuIGlubmVyQXJyLmxlbmd0aCA+IDAgfSlcclxuXHJcbiAgdmFyIHJlcyA9IFtdO1xyXG4gIC8vIHNoaWZ0IG91dCB0aGUgdG9wIG9uZXNcclxuICB1ID0gdS5tYXAoZnVuY3Rpb24gKGlBcnIpIHtcclxuICAgIHZhciB0b3AgPSBpQXJyLnNoaWZ0KCk7XHJcbiAgICByZXMgPSBpbnNlcnRPcmRlcmVkKHJlcywgdG9wLCA1KVxyXG4gICAgcmV0dXJuIGlBcnJcclxuICB9KS5maWx0ZXIoZnVuY3Rpb24gKGlubmVyQXJyOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+KTogYm9vbGVhbiB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwIH0pO1xyXG4gIC8vIGFzIEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuaW1wb3J0ICogYXMgaW5wdXRGaWx0ZXJSdWxlcyBmcm9tICcuL2lucHV0RmlsdGVyUnVsZXMnO1xyXG5cclxudmFyIHJtO1xyXG5cclxuZnVuY3Rpb24gZ2V0Uk1PbmNlKCkge1xyXG4gIGlmICghcm0pIHtcclxuICAgIHJtID0gaW5wdXRGaWx0ZXJSdWxlcy5nZXRSdWxlTWFwKClcclxuICB9XHJcbiAgcmV0dXJuIHJtO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlSdWxlcyhjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQpOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICB2YXIgYmVzdE46IEFycmF5PElGTWF0Y2guY29udGV4dD4gPSBbY29udGV4dF07XHJcbiAgaW5wdXRGaWx0ZXJSdWxlcy5vS2V5T3JkZXIuZm9yRWFjaChmdW5jdGlvbiAoc0tleTogc3RyaW5nKSB7XHJcbiAgICB2YXIgYmVzdE5leHQ6IEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+ID0gW107XHJcbiAgICBiZXN0Ti5mb3JFYWNoKGZ1bmN0aW9uIChvQ29udGV4dDogSUZNYXRjaC5jb250ZXh0KSB7XHJcbiAgICAgIGlmIChvQ29udGV4dFtzS2V5XSkge1xyXG4gICAgICAgIGRlYnVnbG9nKCcqKiBhcHBseWluZyBydWxlcyBmb3IgJyArIHNLZXkpXHJcbiAgICAgICAgdmFyIHJlcyA9IGF1Z21lbnRDb250ZXh0KG9Db250ZXh0LCBnZXRSTU9uY2UoKVtzS2V5XSB8fCBbXSlcclxuICAgICAgICBkZWJ1Z2xvZygnKiogcmVzdWx0IGZvciAnICsgc0tleSArICcgPSAnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKVxyXG4gICAgICAgIGJlc3ROZXh0LnB1c2gocmVzIHx8IFtdKVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIHJ1bGUgbm90IHJlbGV2YW50XHJcbiAgICAgICAgYmVzdE5leHQucHVzaChbb0NvbnRleHRdKTtcclxuICAgICAgfVxyXG4gICAgfSlcclxuICAgIGJlc3ROID0gdGFrZVRvcE4oYmVzdE5leHQpO1xyXG4gIH0pO1xyXG4gIHJldHVybiBiZXN0TlxyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UnVsZXNQaWNrRmlyc3QoY29udGV4dDogSUZNYXRjaC5jb250ZXh0KTogSUZNYXRjaC5jb250ZXh0IHtcclxuICB2YXIgciA9IGFwcGx5UnVsZXMoY29udGV4dCk7XHJcbiAgcmV0dXJuIHIgJiYgclswXTtcclxufVxyXG5cclxuLyoqXHJcbiAqIERlY2lkZSB3aGV0aGVyIHRvIHJlcXVlcnkgZm9yIGEgY29udGV0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZGVjaWRlT25SZVF1ZXJ5KGNvbnRleHQ6IElGTWF0Y2guY29udGV4dCk6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIHJldHVybiBbXVxyXG59XHJcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
