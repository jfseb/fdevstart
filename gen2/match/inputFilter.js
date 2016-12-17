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
var Logger = require('../utils/logger');
var logger = Logger.logger('inputFilter');
var debug = require('debug');
var debugperf = debug('perf');
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
    if (sText1.length - sText2.length > 8 || sText2.length > 1.5 * sText1.length || sText2.length < sText1.length / 2) {
        return 50000;
    }
    var a0 = distance.levenshtein(sText1.substring(0, sText2.length), sText2);
    if (debuglog.enabled) {
        debuglog("distance" + a0 + "stripped>" + sText1.substring(0, sText2.length) + "<>" + sText2 + "<");
    }
    if (a0 * 50 > 15 * sText2.length) {
        return 50000;
    }
    var a = distance.levenshtein(sText1, sText2);
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
    var r = -((a._ranking || 1.0) - (b._ranking || 1.0));
    if (r) {
        return r;
    }
    if (a.category && b.category) {
        r = a.category.localeCompare(b.category);
        if (r) {
            return r;
        }
    }
    if (a.matchedString && b.matchedString) {
        r = a.matchedString.localeCompare(b.matchedString);
        if (r) {
            return r;
        }
    }
    return 0;
}
function categorizeString(string, exact, oRules) {
    // simply apply all rules
    if (debuglog.enabled) {
        debuglog("rules : " + JSON.stringify(oRules));
    }
    var lcString = string.toLowerCase();
    var res = [];
    oRules.forEach(function (oRule) {
        if (debuglog.enabled) {
            debuglog('attempting to match rule ' + JSON.stringify(oRule) + " to string \"" + string + "\"");
        }
        switch (oRule.type) {
            case 0 /* WORD */:
                if (!oRule.lowercaseword) {
                    throw new Error('rule without a lowercase variant' + JSON.stringify(oRule, undefined, 2));
                }
                ;
                if (exact && oRule.word === string || oRule.lowercaseword === lcString) {
                    res.push({
                        string: string,
                        matchedString: oRule.matchedString,
                        category: oRule.category,
                        _ranking: oRule._ranking || 1.0
                    });
                }
                if (!exact && !oRule.exactOnly) {
                    var levenmatch = calcDistance(oRule.lowercaseword, lcString);
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
                    if (debuglog.enabled) {
                        debuglog(JSON.stringify(" here regexp" + JSON.stringify(oRule, undefined, 2)));
                    }
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
    if (debuglog.enabled) {
        debuglog(JSON.stringify(delta));
        debuglog(JSON.stringify(options));
    }
    if (options.matchothers && delta.different > 0) {
        return undefined;
    }
    var c = calcDistance(s2, s1);
    if (debuglog.enabled) {
        debuglog(" s1 <> s2 " + s1 + "<>" + s2 + "  =>: " + c);
    }
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
        if (debuglog.enabled) {
            debuglog('Found one' + JSON.stringify(res, undefined, 2));
        }
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
/*
var exactLen = 0;
var fuzzyLen = 0;
var fuzzyCnt = 0;
var exactCnt = 0;
var totalCnt = 0;
var totalLen = 0;
var retainedCnt = 0;

export function resetCnt() {
  exactLen = 0;
  fuzzyLen = 0;
  fuzzyCnt = 0;
  exactCnt = 0;
  totalCnt = 0;
  totalLen = 0;
  retainedCnt = 0;
}
*/
function categorizeWordWithRankCutoff(sWordGroup, aRules) {
    var seenIt = categorizeString(sWordGroup, true, aRules);
    //totalCnt += 1;
    // exactLen += seenIt.length;
    if (exports.RankWord.hasAbove(seenIt, 0.8)) {
        seenIt = exports.RankWord.takeAbove(seenIt, 0.8);
    } else {
        seenIt = categorizeString(sWordGroup, false, aRules);
    }
    // totalLen += seenIt.length;
    seenIt = exports.RankWord.takeFirstN(seenIt, Algol.Top_N_WordCategorizations);
    // retainedCnt += seenIt.length;
    return seenIt;
}
exports.categorizeWordWithRankCutoff = categorizeWordWithRankCutoff;
/*
export function dumpCnt() {
  console.log(`
exactLen = ${exactLen};
exactCnt = ${exactCnt};
fuzzyLen = ${fuzzyLen};
fuzzyCnt = ${fuzzyCnt};
totalCnt = ${totalCnt};
totalLen = ${totalLen};
retainedLen = ${retainedCnt};
  `);
}
*/
function filterRemovingUncategorizedSentence(oSentence) {
    return oSentence.every(function (oWordGroup) {
        return oWordGroup.length > 0;
    });
}
exports.filterRemovingUncategorizedSentence = filterRemovingUncategorizedSentence;
function filterRemovingUncategorized(arr) {
    return arr.filter(function (oSentence) {
        return filterRemovingUncategorizedSentence(oSentence);
    });
}
exports.filterRemovingUncategorized = filterRemovingUncategorized;
function categorizeAWord(sWordGroup, aRules, sString, words) {
    var seenIt = words[sWordGroup];
    if (seenIt === undefined) {
        seenIt = categorizeWordWithRankCutoff(sWordGroup, aRules);
        utils.deepFreeze(seenIt);
        if (seenIt === undefined) {
            words[sWordGroup] = seenIt;
        }
        words[sWordGroup] = seenIt;
    }
    if (!seenIt || seenIt.length === 0) {
        logger("***WARNING: Did not find any categorization for \"" + sWordGroup + "\" in sentence \"" + sString + "\"");
        if (sWordGroup.indexOf(" ") <= 0) {
            debuglog("***WARNING: Did not find any categorization for primitive (!)" + sWordGroup);
        }
        debuglog("***WARNING: Did not find any categorization for " + sWordGroup);
        if (!seenIt) {
            throw new Error("Expecting emtpy list, not undefined for \"" + sWordGroup + "\"");
        }
        words[sWordGroup] = [];
        return [];
    }
    return utils.cloneDeep(seenIt);
}
exports.categorizeAWord = categorizeAWord;
/**
 * Given a  string, break it down into components,
 * [['A', 'B'], ['A B']]
 *
 * then categorizeWords
 * returning
 *
 * [ [[ { category: 'systemId', word : 'A'},
 *      { category: 'otherthing', word : 'A'}
 *    ],
 *    // result of B
 *    [ { category: 'systemId', word : 'B'},
 *      { category: 'otherthing', word : 'A'}
 *      { category: 'anothertryp', word : 'B'}
 *    ]
 *   ],
 * ]]]
 *
 *
 *
 */
function analyzeString(sString, aRules, words) {
    var cnt = 0;
    var fac = 1;
    var u = breakdown.breakdownString(sString, Algol.MaxSpacesPerCombinedWord);
    if (debuglog.enabled) {
        debuglog("here breakdown" + JSON.stringify(u));
    }
    words = words || {};
    debugperf('this many known words' + Object.keys(words).length);
    var res = u.map(function (aArr) {
        return aArr.map(function (sWordGroup) {
            var seenIt = categorizeAWord(sWordGroup, aRules, sString, words);
            cnt = cnt + seenIt.length;
            fac = fac * seenIt.length;
            return seenIt;
        });
    });
    res = filterRemovingUncategorized(res);
    debuglog(" sentences " + u.length + " matches " + cnt + " fac: " + fac);
    debugperf(" sentences " + u.length + " matches " + cnt + " fac: " + fac);
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
    "use strict";

    var oCategoryMap = extractCategoryMap(oSentence);
    oSentence.forEach(function (oWord, iIndex) {
        var m = oCategoryMap[oWord.category] || [];
        m.forEach(function (oPosition) {
            "use strict";

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
    "use strict";

    aCategorizedArray.forEach(function (oSentence) {
        reinForceSentence(oSentence);
    });
    aCategorizedArray.sort(Sentence.cmpRankingProduct);
    if (debuglog.enabled) {
        debuglog("after reinforce" + aCategorizedArray.map(function (oSentence) {
            return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
        }).join("\n"));
    }
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
    if (debuglog.enabled) {
        debuglog("applying regexp: " + s1 + " " + JSON.stringify(m));
    }
    if (!m) {
        return undefined;
    }
    options = options || {};
    var delta = compareContext(context, oRule.follows, oRule.key);
    if (debuglog.enabled) {
        debuglog(JSON.stringify(delta));
        debuglog(JSON.stringify(options));
    }
    if (options.matchothers && delta.different > 0) {
        return undefined;
    }
    var oExtractedContext = extractArgsMap(m, oRule.argsMap);
    if (debuglog.enabled) {
        debuglog("extracted args " + JSON.stringify(oRule.argsMap));
        debuglog("match " + JSON.stringify(m));
        debuglog("extracted args " + JSON.stringify(oExtractedContext));
    }
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
    if (debuglog.enabled) {
        debuglog('sorting: ' + sKey + 'invoked with\n 1:' + JSON.stringify(oContextA, undefined, 2) + " vs \n 2:" + JSON.stringify(oContextB, undefined, 2));
    }
    var rankingA = parseFloat(oContextA["_ranking"] || "1");
    var rankingB = parseFloat(oContextB["_ranking"] || "1");
    if (rankingA !== rankingB) {
        if (debuglog.enabled) {
            debuglog(" rankin delta" + 100 * (rankingB - rankingA));
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1hdGNoL2lucHV0RmlsdGVyLmpzIiwiLi4vc3JjL21hdGNoL2lucHV0RmlsdGVyLnRzIl0sIm5hbWVzIjpbImRpc3RhbmNlIiwicmVxdWlyZSIsIkxvZ2dlciIsImxvZ2dlciIsImRlYnVnIiwiZGVidWdwZXJmIiwidXRpbHMiLCJBbGdvbCIsImJyZWFrZG93biIsIkFueU9iamVjdCIsIk9iamVjdCIsImRlYnVnbG9nIiwibWF0Y2hkYXRhIiwib1VuaXRUZXN0cyIsImNhbGNEaXN0YW5jZSIsInNUZXh0MSIsInNUZXh0MiIsImxlbmd0aCIsImEwIiwibGV2ZW5zaHRlaW4iLCJzdWJzdHJpbmciLCJlbmFibGVkIiwiYSIsIklGTWF0Y2giLCJsZXZlbkN1dG9mZiIsIkN1dG9mZl9MZXZlblNodGVpbiIsImxldmVuUGVuYWx0eSIsImkiLCJleHBvcnRzIiwibm9uUHJpdmF0ZUtleXMiLCJvQSIsImtleXMiLCJmaWx0ZXIiLCJrZXkiLCJjb3VudEFpbkIiLCJvQiIsImZuQ29tcGFyZSIsImFLZXlJZ25vcmUiLCJBcnJheSIsImlzQXJyYXkiLCJpbmRleE9mIiwicmVkdWNlIiwicHJldiIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiY2FsbCIsInNwdXJpb3VzQW5vdEluQiIsImxvd2VyQ2FzZSIsIm8iLCJ0b0xvd2VyQ2FzZSIsImNvbXBhcmVDb250ZXh0IiwiZXF1YWwiLCJiIiwiZGlmZmVyZW50Iiwic3B1cmlvdXNMIiwic3B1cmlvdXNSIiwic29ydEJ5UmFuayIsInIiLCJfcmFua2luZyIsImNhdGVnb3J5IiwibG9jYWxlQ29tcGFyZSIsIm1hdGNoZWRTdHJpbmciLCJjYXRlZ29yaXplU3RyaW5nIiwic3RyaW5nIiwiZXhhY3QiLCJvUnVsZXMiLCJKU09OIiwic3RyaW5naWZ5IiwibGNTdHJpbmciLCJyZXMiLCJmb3JFYWNoIiwib1J1bGUiLCJ0eXBlIiwibG93ZXJjYXNld29yZCIsIkVycm9yIiwidW5kZWZpbmVkIiwid29yZCIsInB1c2giLCJleGFjdE9ubHkiLCJsZXZlbm1hdGNoIiwibSIsInJlZ2V4cCIsImV4ZWMiLCJtYXRjaEluZGV4Iiwic29ydCIsIm1hdGNoV29yZCIsImNvbnRleHQiLCJvcHRpb25zIiwiczEiLCJzMiIsImRlbHRhIiwiZm9sbG93cyIsIm1hdGNob3RoZXJzIiwiYyIsImFzc2lnbiIsIm92ZXJyaWRlIiwiX3dlaWdodCIsImZyZWV6ZSIsImV4dHJhY3RBcmdzTWFwIiwibWF0Y2giLCJhcmdzTWFwIiwiaUtleSIsInZhbHVlIiwiUmFua1dvcmQiLCJoYXNBYm92ZSIsImxzdCIsImJvcmRlciIsImV2ZXJ5Iiwib01lbWJlciIsInRha2VGaXJzdE4iLCJuIiwiaUluZGV4IiwibGFzdFJhbmtpbmciLCJ0YWtlQWJvdmUiLCJjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmIiwic1dvcmRHcm91cCIsImFSdWxlcyIsInNlZW5JdCIsIlRvcF9OX1dvcmRDYXRlZ29yaXphdGlvbnMiLCJmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWRTZW50ZW5jZSIsIm9TZW50ZW5jZSIsIm9Xb3JkR3JvdXAiLCJmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWQiLCJhcnIiLCJjYXRlZ29yaXplQVdvcmQiLCJzU3RyaW5nIiwid29yZHMiLCJkZWVwRnJlZXplIiwiY2xvbmVEZWVwIiwiYW5hbHl6ZVN0cmluZyIsImNudCIsImZhYyIsInUiLCJicmVha2Rvd25TdHJpbmciLCJNYXhTcGFjZXNQZXJDb21iaW5lZFdvcmQiLCJtYXAiLCJhQXJyIiwiY2xvbmUiLCJleHBhbmRNYXRjaEFyciIsImRlZXAiLCJsaW5lIiwidUJyZWFrRG93bkxpbmUiLCJhV29yZEdyb3VwIiwid2dJbmRleCIsIm9Xb3JkVmFyaWFudCIsImlXVkluZGV4IiwibnZlY3MiLCJ2ZWNzIiwicnZlYyIsImsiLCJuZXh0QmFzZSIsImwiLCJzbGljZSIsImNvbmNhdCIsInJlaW5mb3JjZURpc3RXZWlnaHQiLCJkaXN0IiwiYWJzIiwiTWF0aCIsImFSZWluZm9yY2VEaXN0V2VpZ2h0IiwiZXh0cmFjdENhdGVnb3J5TWFwIiwib1dvcmQiLCJDQVRfQ0FURUdPUlkiLCJwb3MiLCJyZWluRm9yY2VTZW50ZW5jZSIsIm9DYXRlZ29yeU1hcCIsIm9Qb3NpdGlvbiIsInJlaW5mb3JjZSIsImJvb3N0IiwiU2VudGVuY2UiLCJyZWluRm9yY2UiLCJhQ2F0ZWdvcml6ZWRBcnJheSIsImNtcFJhbmtpbmdQcm9kdWN0IiwicmFua2luZ1Byb2R1Y3QiLCJqb2luIiwibWF0Y2hSZWdFeHAiLCJzS2V5IiwicmVnIiwib0V4dHJhY3RlZENvbnRleHQiLCJzb3J0QnlXZWlnaHQiLCJvQ29udGV4dEEiLCJvQ29udGV4dEIiLCJyYW5raW5nQSIsInBhcnNlRmxvYXQiLCJyYW5raW5nQiIsIndlaWdodEEiLCJ3ZWlnaHRCIiwiYXVnbWVudENvbnRleHQxIiwiaVJ1bGUiLCJvcmVzIiwiYmluZCIsImF1Z21lbnRDb250ZXh0Iiwib3B0aW9uczEiLCJhUmVzIiwib3B0aW9uczIiLCJpbnNlcnRPcmRlcmVkIiwicmVzdWx0IiwiaUluc2VydGVkTWVtYmVyIiwibGltaXQiLCJ0YWtlVG9wTiIsImlubmVyQXJyIiwiaUFyciIsInRvcCIsInNoaWZ0IiwiaW5wdXRGaWx0ZXJSdWxlcyIsInJtIiwiZ2V0Uk1PbmNlIiwiZ2V0UnVsZU1hcCIsImFwcGx5UnVsZXMiLCJiZXN0TiIsIm9LZXlPcmRlciIsImJlc3ROZXh0Iiwib0NvbnRleHQiLCJhcHBseVJ1bGVzUGlja0ZpcnN0IiwiZGVjaWRlT25SZVF1ZXJ5Il0sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOzs7Ozs7Ozs7Ozs7Ozs7O0FBZ0JBOztBQUNBLElBQVlBLFdBQVFDLFFBQU0sNkJBQU4sQ0FBcEI7QUFFQSxJQUFZQyxTQUFNRCxRQUFNLGlCQUFOLENBQWxCO0FBRUEsSUFBTUUsU0FBU0QsT0FBT0MsTUFBUCxDQUFjLGFBQWQsQ0FBZjtBQUVBLElBQVlDLFFBQUtILFFBQU0sT0FBTixDQUFqQjtBQUNBLElBQUlJLFlBQVlELE1BQU0sTUFBTixDQUFoQjtBQUVB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SXNKLFdBQVd6SCxPQUFYLENBQVI7QUFDQSxXQUFPN0IsS0FBS0EsRUFBRSxDQUFGLENBQVo7QUFDRDtBQUhlN0IsUUFBQXdMLG1CQUFBLEdBQW1CQSxtQkFBbkI7QUFLaEI7OztBQUdBLFNBQUFDLGVBQUEsQ0FBZ0MvSCxPQUFoQyxFQUF3RDtBQUN0RCxXQUFPLEVBQVA7QUFDRDtBQUZlMUQsUUFBQXlMLGVBQUEsR0FBZUEsZUFBZiIsImZpbGUiOiJtYXRjaC9pbnB1dEZpbHRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuLyoqXG4gKiB0aGUgaW5wdXQgZmlsdGVyIHN0YWdlIHByZXByb2Nlc3NlcyBhIGN1cnJlbnQgY29udGV4dFxuICpcbiAqIEl0IGEpIGNvbWJpbmVzIG11bHRpLXNlZ21lbnQgYXJndW1lbnRzIGludG8gb25lIGNvbnRleHQgbWVtYmVyc1xuICogSXQgYikgYXR0ZW1wdHMgdG8gYXVnbWVudCB0aGUgY29udGV4dCBieSBhZGRpdGlvbmFsIHF1YWxpZmljYXRpb25zXG4gKiAgICAgICAgICAgKE1pZCB0ZXJtIGdlbmVyYXRpbmcgQWx0ZXJuYXRpdmVzLCBlLmcuXG4gKiAgICAgICAgICAgICAgICAgQ2xpZW50U2lkZVRhcmdldFJlc29sdXRpb24gLT4gdW5pdCB0ZXN0P1xuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHNvdXJjZSA/XG4gKiAgICAgICAgICAgKVxuICogIFNpbXBsZSBydWxlcyBsaWtlICBJbnRlbnRcbiAqXG4gKlxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuaW5wdXRGaWx0ZXJcbiAqIEBmaWxlIGlucHV0RmlsdGVyLnRzXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXG4gKi9cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9saWIvbm9kZS00LmQudHNcIiAvPlxudmFyIGRpc3RhbmNlID0gcmVxdWlyZSgnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluJyk7XG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi4vdXRpbHMvbG9nZ2VyJyk7XG52YXIgbG9nZ2VyID0gTG9nZ2VyLmxvZ2dlcignaW5wdXRGaWx0ZXInKTtcbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJyk7XG52YXIgZGVidWdwZXJmID0gZGVidWcoJ3BlcmYnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzL3V0aWxzJyk7XG52YXIgQWxnb2wgPSByZXF1aXJlKCcuL2FsZ29sJyk7XG52YXIgYnJlYWtkb3duID0gcmVxdWlyZSgnLi9icmVha2Rvd24nKTtcbnZhciBBbnlPYmplY3QgPSBPYmplY3Q7XG52YXIgZGVidWdsb2cgPSBkZWJ1ZygnaW5wdXRGaWx0ZXInKTtcbnZhciBtYXRjaGRhdGEgPSByZXF1aXJlKCcuL21hdGNoZGF0YScpO1xudmFyIG9Vbml0VGVzdHMgPSBtYXRjaGRhdGEub1VuaXRUZXN0cztcbi8qKlxuICogQHBhcmFtIHNUZXh0IHtzdHJpbmd9IHRoZSB0ZXh0IHRvIG1hdGNoIHRvIE5hdlRhcmdldFJlc29sdXRpb25cbiAqIEBwYXJhbSBzVGV4dDIge3N0cmluZ30gdGhlIHF1ZXJ5IHRleHQsIGUuZy4gTmF2VGFyZ2V0XG4gKlxuICogQHJldHVybiB0aGUgZGlzdGFuY2UsIG5vdGUgdGhhdCBpcyBpcyAqbm90KiBzeW1tZXRyaWMhXG4gKi9cbmZ1bmN0aW9uIGNhbGNEaXN0YW5jZShzVGV4dDEsIHNUZXh0Mikge1xuICAgIC8vIGNvbnNvbGUubG9nKFwibGVuZ3RoMlwiICsgc1RleHQxICsgXCIgLSBcIiArIHNUZXh0MilcbiAgICBpZiAoKChzVGV4dDEubGVuZ3RoIC0gc1RleHQyLmxlbmd0aCkgPiA4KVxuICAgICAgICB8fCAoc1RleHQyLmxlbmd0aCA+IDEuNSAqIHNUZXh0MS5sZW5ndGgpXG4gICAgICAgIHx8IChzVGV4dDIubGVuZ3RoIDwgKHNUZXh0MS5sZW5ndGggLyAyKSkpIHtcbiAgICAgICAgcmV0dXJuIDUwMDAwO1xuICAgIH1cbiAgICB2YXIgYTAgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEuc3Vic3RyaW5nKDAsIHNUZXh0Mi5sZW5ndGgpLCBzVGV4dDIpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiZGlzdGFuY2VcIiArIGEwICsgXCJzdHJpcHBlZD5cIiArIHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCkgKyBcIjw+XCIgKyBzVGV4dDIgKyBcIjxcIik7XG4gICAgfVxuICAgIGlmIChhMCAqIDUwID4gMTUgKiBzVGV4dDIubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiA1MDAwMDtcbiAgICB9XG4gICAgdmFyIGEgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEsIHNUZXh0Mik7XG4gICAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGE7XG59XG52YXIgSUZNYXRjaCA9IHJlcXVpcmUoJy4uL21hdGNoL2lmbWF0Y2gnKTtcbnZhciBsZXZlbkN1dG9mZiA9IEFsZ29sLkN1dG9mZl9MZXZlblNodGVpbjtcbmZ1bmN0aW9uIGxldmVuUGVuYWx0eShpKSB7XG4gICAgLy8gMC0+IDFcbiAgICAvLyAxIC0+IDAuMVxuICAgIC8vIDE1MCAtPiAgMC44XG4gICAgaWYgKGkgPT09IDApIHtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgfVxuICAgIC8vIHJldmVyc2UgbWF5IGJlIGJldHRlciB0aGFuIGxpbmVhclxuICAgIHJldHVybiAxICsgaSAqICgwLjggLSAxKSAvIDE1MDtcbn1cbmV4cG9ydHMubGV2ZW5QZW5hbHR5ID0gbGV2ZW5QZW5hbHR5O1xuZnVuY3Rpb24gbm9uUHJpdmF0ZUtleXMob0EpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMob0EpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHJldHVybiBrZXlbMF0gIT09ICdfJztcbiAgICB9KTtcbn1cbmZ1bmN0aW9uIGNvdW50QWluQihvQSwgb0IsIGZuQ29tcGFyZSwgYUtleUlnbm9yZSkge1xuICAgIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gYUtleUlnbm9yZSA6XG4gICAgICAgIHR5cGVvZiBhS2V5SWdub3JlID09PSBcInN0cmluZ1wiID8gW2FLZXlJZ25vcmVdIDogW107XG4gICAgZm5Db21wYXJlID0gZm5Db21wYXJlIHx8IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH07XG4gICAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xuICAgIH0pLlxuICAgICAgICByZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9CLCBrZXkpKSB7XG4gICAgICAgICAgICBwcmV2ID0gcHJldiArIChmbkNvbXBhcmUob0Fba2V5XSwgb0Jba2V5XSwga2V5KSA/IDEgOiAwKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbn1cbmV4cG9ydHMuY291bnRBaW5CID0gY291bnRBaW5CO1xuZnVuY3Rpb24gc3B1cmlvdXNBbm90SW5CKG9BLCBvQiwgYUtleUlnbm9yZSkge1xuICAgIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gYUtleUlnbm9yZSA6XG4gICAgICAgIHR5cGVvZiBhS2V5SWdub3JlID09PSBcInN0cmluZ1wiID8gW2FLZXlJZ25vcmVdIDogW107XG4gICAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xuICAgIH0pLlxuICAgICAgICByZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xuICAgICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xuICAgICAgICAgICAgcHJldiA9IHByZXYgKyAxO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIDApO1xufVxuZXhwb3J0cy5zcHVyaW91c0Fub3RJbkIgPSBzcHVyaW91c0Fub3RJbkI7XG5mdW5jdGlvbiBsb3dlckNhc2Uobykge1xuICAgIGlmICh0eXBlb2YgbyA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICByZXR1cm4gby50b0xvd2VyQ2FzZSgpO1xuICAgIH1cbiAgICByZXR1cm4gbztcbn1cbmZ1bmN0aW9uIGNvbXBhcmVDb250ZXh0KG9BLCBvQiwgYUtleUlnbm9yZSkge1xuICAgIHZhciBlcXVhbCA9IGNvdW50QWluQihvQSwgb0IsIGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBsb3dlckNhc2UoYSkgPT09IGxvd2VyQ2FzZShiKTsgfSwgYUtleUlnbm9yZSk7XG4gICAgdmFyIGRpZmZlcmVudCA9IGNvdW50QWluQihvQSwgb0IsIGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBsb3dlckNhc2UoYSkgIT09IGxvd2VyQ2FzZShiKTsgfSwgYUtleUlnbm9yZSk7XG4gICAgdmFyIHNwdXJpb3VzTCA9IHNwdXJpb3VzQW5vdEluQihvQSwgb0IsIGFLZXlJZ25vcmUpO1xuICAgIHZhciBzcHVyaW91c1IgPSBzcHVyaW91c0Fub3RJbkIob0IsIG9BLCBhS2V5SWdub3JlKTtcbiAgICByZXR1cm4ge1xuICAgICAgICBlcXVhbDogZXF1YWwsXG4gICAgICAgIGRpZmZlcmVudDogZGlmZmVyZW50LFxuICAgICAgICBzcHVyaW91c0w6IHNwdXJpb3VzTCxcbiAgICAgICAgc3B1cmlvdXNSOiBzcHVyaW91c1JcbiAgICB9O1xufVxuZXhwb3J0cy5jb21wYXJlQ29udGV4dCA9IGNvbXBhcmVDb250ZXh0O1xuZnVuY3Rpb24gc29ydEJ5UmFuayhhLCBiKSB7XG4gICAgdmFyIHIgPSAtKChhLl9yYW5raW5nIHx8IDEuMCkgLSAoYi5fcmFua2luZyB8fCAxLjApKTtcbiAgICBpZiAocikge1xuICAgICAgICByZXR1cm4gcjtcbiAgICB9XG4gICAgaWYgKGEuY2F0ZWdvcnkgJiYgYi5jYXRlZ29yeSkge1xuICAgICAgICByID0gYS5jYXRlZ29yeS5sb2NhbGVDb21wYXJlKGIuY2F0ZWdvcnkpO1xuICAgICAgICBpZiAocikge1xuICAgICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKGEubWF0Y2hlZFN0cmluZyAmJiBiLm1hdGNoZWRTdHJpbmcpIHtcbiAgICAgICAgciA9IGEubWF0Y2hlZFN0cmluZy5sb2NhbGVDb21wYXJlKGIubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgIGlmIChyKSB7XG4gICAgICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gMDtcbn1cbmZ1bmN0aW9uIGNhdGVnb3JpemVTdHJpbmcoc3RyaW5nLCBleGFjdCwgb1J1bGVzKSB7XG4gICAgLy8gc2ltcGx5IGFwcGx5IGFsbCBydWxlc1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwicnVsZXMgOiBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlcykpO1xuICAgIH1cbiAgICB2YXIgbGNTdHJpbmcgPSBzdHJpbmcudG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgb1J1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZygnYXR0ZW1wdGluZyB0byBtYXRjaCBydWxlICcgKyBKU09OLnN0cmluZ2lmeShvUnVsZSkgKyBcIiB0byBzdHJpbmcgXFxcIlwiICsgc3RyaW5nICsgXCJcXFwiXCIpO1xuICAgICAgICB9XG4gICAgICAgIHN3aXRjaCAob1J1bGUudHlwZSkge1xuICAgICAgICAgICAgY2FzZSAwIC8qIFdPUkQgKi86XG4gICAgICAgICAgICAgICAgaWYgKCFvUnVsZS5sb3dlcmNhc2V3b3JkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncnVsZSB3aXRob3V0IGEgbG93ZXJjYXNlIHZhcmlhbnQnICsgSlNPTi5zdHJpbmdpZnkob1J1bGUsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICA7XG4gICAgICAgICAgICAgICAgaWYgKGV4YWN0ICYmIG9SdWxlLndvcmQgPT09IHN0cmluZyB8fCBvUnVsZS5sb3dlcmNhc2V3b3JkID09PSBsY1N0cmluZykge1xuICAgICAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgICAgICBfcmFua2luZzogb1J1bGUuX3JhbmtpbmcgfHwgMS4wXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIWV4YWN0ICYmICFvUnVsZS5leGFjdE9ubHkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxldmVubWF0Y2ggPSBjYWxjRGlzdGFuY2Uob1J1bGUubG93ZXJjYXNld29yZCwgbGNTdHJpbmcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobGV2ZW5tYXRjaCA8IGxldmVuQ3V0b2ZmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUud29yZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IChvUnVsZS5fcmFua2luZyB8fCAxLjApICogbGV2ZW5QZW5hbHR5KGxldmVubWF0Y2gpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldmVubWF0Y2g6IGxldmVubWF0Y2hcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAxIC8qIFJFR0VYUCAqLzpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShcIiBoZXJlIHJlZ2V4cFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUsIHVuZGVmaW5lZCwgMikpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB2YXIgbSA9IG9SdWxlLnJlZ2V4cC5leGVjKHN0cmluZyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogKG9SdWxlLm1hdGNoSW5kZXggIT09IHVuZGVmaW5lZCAmJiBtW29SdWxlLm1hdGNoSW5kZXhdKSB8fCBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmtub3duIHR5cGVcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJlcy5zb3J0KHNvcnRCeVJhbmspO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmNhdGVnb3JpemVTdHJpbmcgPSBjYXRlZ29yaXplU3RyaW5nO1xuLyoqXG4gKlxuICogT3B0aW9ucyBtYXkgYmUge1xuICogbWF0Y2hvdGhlcnMgOiB0cnVlLCAgPT4gb25seSBydWxlcyB3aGVyZSBhbGwgb3RoZXJzIG1hdGNoIGFyZSBjb25zaWRlcmVkXG4gKiBhdWdtZW50IDogdHJ1ZSxcbiAqIG92ZXJyaWRlIDogdHJ1ZSB9ICA9PlxuICpcbiAqL1xuZnVuY3Rpb24gbWF0Y2hXb3JkKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBzMSA9IGNvbnRleHRbb1J1bGUua2V5XS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciBzMiA9IG9SdWxlLndvcmQudG9Mb3dlckNhc2UoKTtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB2YXIgZGVsdGEgPSBjb21wYXJlQ29udGV4dChjb250ZXh0LCBvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlbHRhKSk7XG4gICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBjID0gY2FsY0Rpc3RhbmNlKHMyLCBzMSk7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCIgczEgPD4gczIgXCIgKyBzMSArIFwiPD5cIiArIHMyICsgXCIgID0+OiBcIiArIGMpO1xuICAgIH1cbiAgICBpZiAoYyA8IDE1MCkge1xuICAgICAgICB2YXIgcmVzID0gQW55T2JqZWN0LmFzc2lnbih7fSwgb1J1bGUuZm9sbG93cyk7XG4gICAgICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcbiAgICAgICAgaWYgKG9wdGlvbnMub3ZlcnJpZGUpIHtcbiAgICAgICAgICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvUnVsZS5mb2xsb3dzKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBmb3JjZSBrZXkgcHJvcGVydHlcbiAgICAgICAgLy8gY29uc29sZS5sb2coJyBvYmplY3RjYXRlZ29yeScsIHJlc1snc3lzdGVtT2JqZWN0Q2F0ZWdvcnknXSk7XG4gICAgICAgIHJlc1tvUnVsZS5rZXldID0gb1J1bGUuZm9sbG93c1tvUnVsZS5rZXldIHx8IHJlc1tvUnVsZS5rZXldO1xuICAgICAgICByZXMuX3dlaWdodCA9IEFueU9iamVjdC5hc3NpZ24oe30sIHJlcy5fd2VpZ2h0KTtcbiAgICAgICAgcmVzLl93ZWlnaHRbb1J1bGUua2V5XSA9IGM7XG4gICAgICAgIE9iamVjdC5mcmVlemUocmVzKTtcbiAgICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgICAgIGRlYnVnbG9nKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xufVxuZXhwb3J0cy5tYXRjaFdvcmQgPSBtYXRjaFdvcmQ7XG5mdW5jdGlvbiBleHRyYWN0QXJnc01hcChtYXRjaCwgYXJnc01hcCkge1xuICAgIHZhciByZXMgPSB7fTtcbiAgICBpZiAoIWFyZ3NNYXApIHtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG4gICAgT2JqZWN0LmtleXMoYXJnc01hcCkuZm9yRWFjaChmdW5jdGlvbiAoaUtleSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBtYXRjaFtpS2V5XTtcbiAgICAgICAgdmFyIGtleSA9IGFyZ3NNYXBbaUtleV07XG4gICAgICAgIGlmICgodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKSAmJiB2YWx1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXNba2V5XSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZXh0cmFjdEFyZ3NNYXAgPSBleHRyYWN0QXJnc01hcDtcbmV4cG9ydHMuUmFua1dvcmQgPSB7XG4gICAgaGFzQWJvdmU6IGZ1bmN0aW9uIChsc3QsIGJvcmRlcikge1xuICAgICAgICByZXR1cm4gIWxzdC5ldmVyeShmdW5jdGlvbiAob01lbWJlcikge1xuICAgICAgICAgICAgcmV0dXJuIChvTWVtYmVyLl9yYW5raW5nIDwgYm9yZGVyKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICB0YWtlRmlyc3ROOiBmdW5jdGlvbiAobHN0LCBuKSB7XG4gICAgICAgIHJldHVybiBsc3QuZmlsdGVyKGZ1bmN0aW9uIChvTWVtYmVyLCBpSW5kZXgpIHtcbiAgICAgICAgICAgIHZhciBsYXN0UmFua2luZyA9IDEuMDtcbiAgICAgICAgICAgIGlmICgoaUluZGV4IDwgbikgfHwgb01lbWJlci5fcmFua2luZyA9PT0gbGFzdFJhbmtpbmcpIHtcbiAgICAgICAgICAgICAgICBsYXN0UmFua2luZyA9IG9NZW1iZXIuX3Jhbmtpbmc7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgdGFrZUFib3ZlOiBmdW5jdGlvbiAobHN0LCBib3JkZXIpIHtcbiAgICAgICAgcmV0dXJuIGxzdC5maWx0ZXIoZnVuY3Rpb24gKG9NZW1iZXIpIHtcbiAgICAgICAgICAgIHJldHVybiAob01lbWJlci5fcmFua2luZyA+PSBib3JkZXIpO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuLypcbnZhciBleGFjdExlbiA9IDA7XG52YXIgZnV6enlMZW4gPSAwO1xudmFyIGZ1enp5Q250ID0gMDtcbnZhciBleGFjdENudCA9IDA7XG52YXIgdG90YWxDbnQgPSAwO1xudmFyIHRvdGFsTGVuID0gMDtcbnZhciByZXRhaW5lZENudCA9IDA7XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNldENudCgpIHtcbiAgZXhhY3RMZW4gPSAwO1xuICBmdXp6eUxlbiA9IDA7XG4gIGZ1enp5Q250ID0gMDtcbiAgZXhhY3RDbnQgPSAwO1xuICB0b3RhbENudCA9IDA7XG4gIHRvdGFsTGVuID0gMDtcbiAgcmV0YWluZWRDbnQgPSAwO1xufVxuKi9cbmZ1bmN0aW9uIGNhdGVnb3JpemVXb3JkV2l0aFJhbmtDdXRvZmYoc1dvcmRHcm91cCwgYVJ1bGVzKSB7XG4gICAgdmFyIHNlZW5JdCA9IGNhdGVnb3JpemVTdHJpbmcoc1dvcmRHcm91cCwgdHJ1ZSwgYVJ1bGVzKTtcbiAgICAvL3RvdGFsQ250ICs9IDE7XG4gICAgLy8gZXhhY3RMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcbiAgICBpZiAoZXhwb3J0cy5SYW5rV29yZC5oYXNBYm92ZShzZWVuSXQsIDAuOCkpIHtcbiAgICAgICAgc2Vlbkl0ID0gZXhwb3J0cy5SYW5rV29yZC50YWtlQWJvdmUoc2Vlbkl0LCAwLjgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc2Vlbkl0ID0gY2F0ZWdvcml6ZVN0cmluZyhzV29yZEdyb3VwLCBmYWxzZSwgYVJ1bGVzKTtcbiAgICB9XG4gICAgLy8gdG90YWxMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcbiAgICBzZWVuSXQgPSBleHBvcnRzLlJhbmtXb3JkLnRha2VGaXJzdE4oc2Vlbkl0LCBBbGdvbC5Ub3BfTl9Xb3JkQ2F0ZWdvcml6YXRpb25zKTtcbiAgICAvLyByZXRhaW5lZENudCArPSBzZWVuSXQubGVuZ3RoO1xuICAgIHJldHVybiBzZWVuSXQ7XG59XG5leHBvcnRzLmNhdGVnb3JpemVXb3JkV2l0aFJhbmtDdXRvZmYgPSBjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmO1xuLypcbmV4cG9ydCBmdW5jdGlvbiBkdW1wQ250KCkge1xuICBjb25zb2xlLmxvZyhgXG5leGFjdExlbiA9ICR7ZXhhY3RMZW59O1xuZXhhY3RDbnQgPSAke2V4YWN0Q250fTtcbmZ1enp5TGVuID0gJHtmdXp6eUxlbn07XG5mdXp6eUNudCA9ICR7ZnV6enlDbnR9O1xudG90YWxDbnQgPSAke3RvdGFsQ250fTtcbnRvdGFsTGVuID0gJHt0b3RhbExlbn07XG5yZXRhaW5lZExlbiA9ICR7cmV0YWluZWRDbnR9O1xuICBgKTtcbn1cbiovXG5mdW5jdGlvbiBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWRTZW50ZW5jZShvU2VudGVuY2UpIHtcbiAgICByZXR1cm4gb1NlbnRlbmNlLmV2ZXJ5KGZ1bmN0aW9uIChvV29yZEdyb3VwKSB7XG4gICAgICAgIHJldHVybiAob1dvcmRHcm91cC5sZW5ndGggPiAwKTtcbiAgICB9KTtcbn1cbmV4cG9ydHMuZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkU2VudGVuY2UgPSBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWRTZW50ZW5jZTtcbmZ1bmN0aW9uIGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZChhcnIpIHtcbiAgICByZXR1cm4gYXJyLmZpbHRlcihmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgIHJldHVybiBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWRTZW50ZW5jZShvU2VudGVuY2UpO1xuICAgIH0pO1xufVxuZXhwb3J0cy5maWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWQgPSBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWQ7XG5mdW5jdGlvbiBjYXRlZ29yaXplQVdvcmQoc1dvcmRHcm91cCwgYVJ1bGVzLCBzU3RyaW5nLCB3b3Jkcykge1xuICAgIHZhciBzZWVuSXQgPSB3b3Jkc1tzV29yZEdyb3VwXTtcbiAgICBpZiAoc2Vlbkl0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgc2Vlbkl0ID0gY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZihzV29yZEdyb3VwLCBhUnVsZXMpO1xuICAgICAgICB1dGlscy5kZWVwRnJlZXplKHNlZW5JdCk7XG4gICAgICAgIGlmIChzZWVuSXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgd29yZHNbc1dvcmRHcm91cF0gPSBzZWVuSXQ7XG4gICAgICAgIH1cbiAgICAgICAgd29yZHNbc1dvcmRHcm91cF0gPSBzZWVuSXQ7XG4gICAgfVxuICAgIGlmICghc2Vlbkl0IHx8IHNlZW5JdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgbG9nZ2VyKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgXFxcIlwiICsgc1dvcmRHcm91cCArIFwiXFxcIiBpbiBzZW50ZW5jZSBcXFwiXCJcbiAgICAgICAgICAgICsgc1N0cmluZyArIFwiXFxcIlwiKTtcbiAgICAgICAgaWYgKHNXb3JkR3JvdXAuaW5kZXhPZihcIiBcIikgPD0gMCkge1xuICAgICAgICAgICAgZGVidWdsb2coXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBwcmltaXRpdmUgKCEpXCIgKyBzV29yZEdyb3VwKTtcbiAgICAgICAgfVxuICAgICAgICBkZWJ1Z2xvZyhcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIFwiICsgc1dvcmRHcm91cCk7XG4gICAgICAgIGlmICghc2Vlbkl0KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RpbmcgZW10cHkgbGlzdCwgbm90IHVuZGVmaW5lZCBmb3IgXFxcIlwiICsgc1dvcmRHcm91cCArIFwiXFxcIlwiKTtcbiAgICAgICAgfVxuICAgICAgICB3b3Jkc1tzV29yZEdyb3VwXSA9IFtdO1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHJldHVybiB1dGlscy5jbG9uZURlZXAoc2Vlbkl0KTtcbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZUFXb3JkID0gY2F0ZWdvcml6ZUFXb3JkO1xuLyoqXG4gKiBHaXZlbiBhICBzdHJpbmcsIGJyZWFrIGl0IGRvd24gaW50byBjb21wb25lbnRzLFxuICogW1snQScsICdCJ10sIFsnQSBCJ11dXG4gKlxuICogdGhlbiBjYXRlZ29yaXplV29yZHNcbiAqIHJldHVybmluZ1xuICpcbiAqIFsgW1sgeyBjYXRlZ29yeTogJ3N5c3RlbUlkJywgd29yZCA6ICdBJ30sXG4gKiAgICAgIHsgY2F0ZWdvcnk6ICdvdGhlcnRoaW5nJywgd29yZCA6ICdBJ31cbiAqICAgIF0sXG4gKiAgICAvLyByZXN1bHQgb2YgQlxuICogICAgWyB7IGNhdGVnb3J5OiAnc3lzdGVtSWQnLCB3b3JkIDogJ0InfSxcbiAqICAgICAgeyBjYXRlZ29yeTogJ290aGVydGhpbmcnLCB3b3JkIDogJ0EnfVxuICogICAgICB7IGNhdGVnb3J5OiAnYW5vdGhlcnRyeXAnLCB3b3JkIDogJ0InfVxuICogICAgXVxuICogICBdLFxuICogXV1dXG4gKlxuICpcbiAqXG4gKi9cbmZ1bmN0aW9uIGFuYWx5emVTdHJpbmcoc1N0cmluZywgYVJ1bGVzLCB3b3Jkcykge1xuICAgIHZhciBjbnQgPSAwO1xuICAgIHZhciBmYWMgPSAxO1xuICAgIHZhciB1ID0gYnJlYWtkb3duLmJyZWFrZG93blN0cmluZyhzU3RyaW5nLCBBbGdvbC5NYXhTcGFjZXNQZXJDb21iaW5lZFdvcmQpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiaGVyZSBicmVha2Rvd25cIiArIEpTT04uc3RyaW5naWZ5KHUpKTtcbiAgICB9XG4gICAgd29yZHMgPSB3b3JkcyB8fCB7fTtcbiAgICBkZWJ1Z3BlcmYoJ3RoaXMgbWFueSBrbm93biB3b3JkcycgKyBPYmplY3Qua2V5cyh3b3JkcykubGVuZ3RoKTtcbiAgICB2YXIgcmVzID0gdS5tYXAoZnVuY3Rpb24gKGFBcnIpIHtcbiAgICAgICAgcmV0dXJuIGFBcnIubWFwKGZ1bmN0aW9uIChzV29yZEdyb3VwKSB7XG4gICAgICAgICAgICB2YXIgc2Vlbkl0ID0gY2F0ZWdvcml6ZUFXb3JkKHNXb3JkR3JvdXAsIGFSdWxlcywgc1N0cmluZywgd29yZHMpO1xuICAgICAgICAgICAgY250ID0gY250ICsgc2Vlbkl0Lmxlbmd0aDtcbiAgICAgICAgICAgIGZhYyA9IGZhYyAqIHNlZW5JdC5sZW5ndGg7XG4gICAgICAgICAgICByZXR1cm4gc2Vlbkl0O1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICByZXMgPSBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWQocmVzKTtcbiAgICBkZWJ1Z2xvZyhcIiBzZW50ZW5jZXMgXCIgKyB1Lmxlbmd0aCArIFwiIG1hdGNoZXMgXCIgKyBjbnQgKyBcIiBmYWM6IFwiICsgZmFjKTtcbiAgICBkZWJ1Z3BlcmYoXCIgc2VudGVuY2VzIFwiICsgdS5sZW5ndGggKyBcIiBtYXRjaGVzIFwiICsgY250ICsgXCIgZmFjOiBcIiArIGZhYyk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuYW5hbHl6ZVN0cmluZyA9IGFuYWx5emVTdHJpbmc7XG4vKlxuWyBbYSxiXSwgW2MsZF1dXG5cbjAwIGFcbjAxIGJcbjEwIGNcbjExIGRcbjEyIGNcbiovXG52YXIgY2xvbmUgPSB1dGlscy5jbG9uZURlZXA7XG4vLyB3ZSBjYW4gcmVwbGljYXRlIHRoZSB0YWlsIG9yIHRoZSBoZWFkLFxuLy8gd2UgcmVwbGljYXRlIHRoZSB0YWlsIGFzIGl0IGlzIHNtYWxsZXIuXG4vLyBbYSxiLGMgXVxuZnVuY3Rpb24gZXhwYW5kTWF0Y2hBcnIoZGVlcCkge1xuICAgIHZhciBhID0gW107XG4gICAgdmFyIGxpbmUgPSBbXTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWVwKSk7XG4gICAgZGVlcC5mb3JFYWNoKGZ1bmN0aW9uICh1QnJlYWtEb3duTGluZSwgaUluZGV4KSB7XG4gICAgICAgIGxpbmVbaUluZGV4XSA9IFtdO1xuICAgICAgICB1QnJlYWtEb3duTGluZS5mb3JFYWNoKGZ1bmN0aW9uIChhV29yZEdyb3VwLCB3Z0luZGV4KSB7XG4gICAgICAgICAgICBsaW5lW2lJbmRleF1bd2dJbmRleF0gPSBbXTtcbiAgICAgICAgICAgIGFXb3JkR3JvdXAuZm9yRWFjaChmdW5jdGlvbiAob1dvcmRWYXJpYW50LCBpV1ZJbmRleCkge1xuICAgICAgICAgICAgICAgIGxpbmVbaUluZGV4XVt3Z0luZGV4XVtpV1ZJbmRleF0gPSBvV29yZFZhcmlhbnQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkobGluZSkpO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICB2YXIgbnZlY3MgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpbmUubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIHZlY3MgPSBbW11dO1xuICAgICAgICB2YXIgbnZlY3MgPSBbXTtcbiAgICAgICAgdmFyIHJ2ZWMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCBsaW5lW2ldLmxlbmd0aDsgKytrKSB7XG4gICAgICAgICAgICAvL3ZlY3MgaXMgdGhlIHZlY3RvciBvZiBhbGwgc28gZmFyIHNlZW4gdmFyaWFudHMgdXAgdG8gayB3Z3MuXG4gICAgICAgICAgICB2YXIgbmV4dEJhc2UgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGwgPSAwOyBsIDwgbGluZVtpXVtrXS5sZW5ndGg7ICsrbCkge1xuICAgICAgICAgICAgICAgIC8vZGVidWdsb2coXCJ2ZWNzIG5vd1wiICsgSlNPTi5zdHJpbmdpZnkodmVjcykpO1xuICAgICAgICAgICAgICAgIG52ZWNzID0gW107IC8vdmVjcy5zbGljZSgpOyAvLyBjb3B5IHRoZSB2ZWNbaV0gYmFzZSB2ZWN0b3I7XG4gICAgICAgICAgICAgICAgLy9kZWJ1Z2xvZyhcInZlY3MgY29waWVkIG5vd1wiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciB1ID0gMDsgdSA8IHZlY3MubGVuZ3RoOyArK3UpIHtcbiAgICAgICAgICAgICAgICAgICAgbnZlY3NbdV0gPSB2ZWNzW3VdLnNsaWNlKCk7IC8vXG4gICAgICAgICAgICAgICAgICAgIC8vIGRlYnVnbG9nKFwiY29waWVkIHZlY3NbXCIrIHUrXCJdXCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzW3VdKSk7XG4gICAgICAgICAgICAgICAgICAgIG52ZWNzW3VdLnB1c2goY2xvbmUobGluZVtpXVtrXVtsXSkpOyAvLyBwdXNoIHRoZSBsdGggdmFyaWFudFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyAgIGRlYnVnbG9nKFwiIGF0ICAgICBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiBuZXh0YmFzZSA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpXG4gICAgICAgICAgICAgICAgLy8gICBkZWJ1Z2xvZyhcIiBhcHBlbmQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbnZlY3MgICAgPlwiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKVxuICAgICAgICAgICAgICAgIG5leHRCYXNlID0gbmV4dEJhc2UuY29uY2F0KG52ZWNzKTtcbiAgICAgICAgICAgIH0gLy9jb25zdHJ1XG4gICAgICAgICAgICAvLyAgZGVidWdsb2coXCJub3cgYXQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxuICAgICAgICAgICAgdmVjcyA9IG5leHRCYXNlO1xuICAgICAgICB9XG4gICAgICAgIGRlYnVnbG9nKFwiQVBQRU5ESU5HIFRPIFJFU1wiICsgaSArIFwiOlwiICsgbCArIFwiID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSk7XG4gICAgICAgIHJlcyA9IHJlcy5jb25jYXQodmVjcyk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmV4cGFuZE1hdGNoQXJyID0gZXhwYW5kTWF0Y2hBcnI7XG4vKipcbiAqIENhbGN1bGF0ZSBhIHdlaWdodCBmYWN0b3IgZm9yIGEgZ2l2ZW4gZGlzdGFuY2UgYW5kXG4gKiBjYXRlZ29yeVxuICogQHBhcmFtIHtpbnRlZ2VyfSBkaXN0IGRpc3RhbmNlIGluIHdvcmRzXG4gKiBAcGFyYW0ge3N0cmluZ30gY2F0ZWdvcnkgY2F0ZWdvcnkgdG8gdXNlXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBhIGRpc3RhbmNlIGZhY3RvciA+PSAxXG4gKiAgMS4wIGZvciBubyBlZmZlY3RcbiAqL1xuZnVuY3Rpb24gcmVpbmZvcmNlRGlzdFdlaWdodChkaXN0LCBjYXRlZ29yeSkge1xuICAgIHZhciBhYnMgPSBNYXRoLmFicyhkaXN0KTtcbiAgICByZXR1cm4gMS4wICsgKEFsZ29sLmFSZWluZm9yY2VEaXN0V2VpZ2h0W2Fic10gfHwgMCk7XG59XG5leHBvcnRzLnJlaW5mb3JjZURpc3RXZWlnaHQgPSByZWluZm9yY2VEaXN0V2VpZ2h0O1xuLyoqXG4gKiBHaXZlbiBhIHNlbnRlbmNlLCBleHRhY3QgY2F0ZWdvcmllc1xuICovXG5mdW5jdGlvbiBleHRyYWN0Q2F0ZWdvcnlNYXAob1NlbnRlbmNlKSB7XG4gICAgdmFyIHJlcyA9IHt9O1xuICAgIGRlYnVnbG9nKCdleHRyYWN0Q2F0ZWdvcnlNYXAgJyArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSkpO1xuICAgIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaUluZGV4KSB7XG4gICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gSUZNYXRjaC5DQVRfQ0FURUdPUlkpIHtcbiAgICAgICAgICAgIHJlc1tvV29yZC5tYXRjaGVkU3RyaW5nXSA9IHJlc1tvV29yZC5tYXRjaGVkU3RyaW5nXSB8fCBbXTtcbiAgICAgICAgICAgIHJlc1tvV29yZC5tYXRjaGVkU3RyaW5nXS5wdXNoKHsgcG9zOiBpSW5kZXggfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICB1dGlscy5kZWVwRnJlZXplKHJlcyk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZXh0cmFjdENhdGVnb3J5TWFwID0gZXh0cmFjdENhdGVnb3J5TWFwO1xuZnVuY3Rpb24gcmVpbkZvcmNlU2VudGVuY2Uob1NlbnRlbmNlKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgdmFyIG9DYXRlZ29yeU1hcCA9IGV4dHJhY3RDYXRlZ29yeU1hcChvU2VudGVuY2UpO1xuICAgIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaUluZGV4KSB7XG4gICAgICAgIHZhciBtID0gb0NhdGVnb3J5TWFwW29Xb3JkLmNhdGVnb3J5XSB8fCBbXTtcbiAgICAgICAgbS5mb3JFYWNoKGZ1bmN0aW9uIChvUG9zaXRpb24pIHtcbiAgICAgICAgICAgIFwidXNlIHN0cmljdFwiO1xuICAgICAgICAgICAgb1dvcmQucmVpbmZvcmNlID0gb1dvcmQucmVpbmZvcmNlIHx8IDE7XG4gICAgICAgICAgICB2YXIgYm9vc3QgPSByZWluZm9yY2VEaXN0V2VpZ2h0KGlJbmRleCAtIG9Qb3NpdGlvbi5wb3MsIG9Xb3JkLmNhdGVnb3J5KTtcbiAgICAgICAgICAgIG9Xb3JkLnJlaW5mb3JjZSAqPSBib29zdDtcbiAgICAgICAgICAgIG9Xb3JkLl9yYW5raW5nICo9IGJvb3N0O1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gb1NlbnRlbmNlO1xufVxuZXhwb3J0cy5yZWluRm9yY2VTZW50ZW5jZSA9IHJlaW5Gb3JjZVNlbnRlbmNlO1xudmFyIFNlbnRlbmNlID0gcmVxdWlyZSgnLi9zZW50ZW5jZScpO1xuZnVuY3Rpb24gcmVpbkZvcmNlKGFDYXRlZ29yaXplZEFycmF5KSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgYUNhdGVnb3JpemVkQXJyYXkuZm9yRWFjaChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgIHJlaW5Gb3JjZVNlbnRlbmNlKG9TZW50ZW5jZSk7XG4gICAgfSk7XG4gICAgYUNhdGVnb3JpemVkQXJyYXkuc29ydChTZW50ZW5jZS5jbXBSYW5raW5nUHJvZHVjdCk7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCJhZnRlciByZWluZm9yY2VcIiArIGFDYXRlZ29yaXplZEFycmF5Lm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICAgICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgfVxuICAgIHJldHVybiBhQ2F0ZWdvcml6ZWRBcnJheTtcbn1cbmV4cG9ydHMucmVpbkZvcmNlID0gcmVpbkZvcmNlO1xuLy8vIGJlbG93IG1heSBubyBsb25nZXIgYmUgdXNlZFxuZnVuY3Rpb24gbWF0Y2hSZWdFeHAob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAoY29udGV4dFtvUnVsZS5rZXldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIHNLZXkgPSBvUnVsZS5rZXk7XG4gICAgdmFyIHMxID0gY29udGV4dFtvUnVsZS5rZXldLnRvTG93ZXJDYXNlKCk7XG4gICAgdmFyIHJlZyA9IG9SdWxlLnJlZ2V4cDtcbiAgICB2YXIgbSA9IHJlZy5leGVjKHMxKTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcImFwcGx5aW5nIHJlZ2V4cDogXCIgKyBzMSArIFwiIFwiICsgSlNPTi5zdHJpbmdpZnkobSkpO1xuICAgIH1cbiAgICBpZiAoIW0pIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCwgb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xuICAgICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgb0V4dHJhY3RlZENvbnRleHQgPSBleHRyYWN0QXJnc01hcChtLCBvUnVsZS5hcmdzTWFwKTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUuYXJnc01hcCkpO1xuICAgICAgICBkZWJ1Z2xvZyhcIm1hdGNoIFwiICsgSlNPTi5zdHJpbmdpZnkobSkpO1xuICAgICAgICBkZWJ1Z2xvZyhcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob0V4dHJhY3RlZENvbnRleHQpKTtcbiAgICB9XG4gICAgdmFyIHJlcyA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpO1xuICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvRXh0cmFjdGVkQ29udGV4dCk7XG4gICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIGNvbnRleHQpO1xuICAgIGlmIChvRXh0cmFjdGVkQ29udGV4dFtzS2V5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlc1tzS2V5XSA9IG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xuICAgICAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb1J1bGUuZm9sbG93cyk7XG4gICAgICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvRXh0cmFjdGVkQ29udGV4dCk7XG4gICAgfVxuICAgIE9iamVjdC5mcmVlemUocmVzKTtcbiAgICBkZWJ1Z2xvZygnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMubWF0Y2hSZWdFeHAgPSBtYXRjaFJlZ0V4cDtcbmZ1bmN0aW9uIHNvcnRCeVdlaWdodChzS2V5LCBvQ29udGV4dEEsIG9Db250ZXh0Qikge1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKCdzb3J0aW5nOiAnICsgc0tleSArICdpbnZva2VkIHdpdGhcXG4gMTonICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHRBLCB1bmRlZmluZWQsIDIpICtcbiAgICAgICAgICAgIFwiIHZzIFxcbiAyOlwiICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHRCLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgdmFyIHJhbmtpbmdBID0gcGFyc2VGbG9hdChvQ29udGV4dEFbXCJfcmFua2luZ1wiXSB8fCBcIjFcIik7XG4gICAgdmFyIHJhbmtpbmdCID0gcGFyc2VGbG9hdChvQ29udGV4dEJbXCJfcmFua2luZ1wiXSB8fCBcIjFcIik7XG4gICAgaWYgKHJhbmtpbmdBICE9PSByYW5raW5nQikge1xuICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgZGVidWdsb2coXCIgcmFua2luIGRlbHRhXCIgKyAxMDAgKiAocmFua2luZ0IgLSByYW5raW5nQSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAxMDAgKiAocmFua2luZ0IgLSByYW5raW5nQSk7XG4gICAgfVxuICAgIHZhciB3ZWlnaHRBID0gb0NvbnRleHRBW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdW3NLZXldIHx8IDA7XG4gICAgdmFyIHdlaWdodEIgPSBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QltcIl93ZWlnaHRcIl1bc0tleV0gfHwgMDtcbiAgICByZXR1cm4gKyh3ZWlnaHRBIC0gd2VpZ2h0Qik7XG59XG5leHBvcnRzLnNvcnRCeVdlaWdodCA9IHNvcnRCeVdlaWdodDtcbi8vIFdvcmQsIFN5bm9ueW0sIFJlZ2V4cCAvIEV4dHJhY3Rpb25SdWxlXG5mdW5jdGlvbiBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgb1J1bGVzLCBvcHRpb25zKSB7XG4gICAgdmFyIHNLZXkgPSBvUnVsZXNbMF0ua2V5O1xuICAgIC8vIGNoZWNrIHRoYXQgcnVsZVxuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIC8vIGNoZWNrIGNvbnNpc3RlbmN5XG4gICAgICAgIG9SdWxlcy5ldmVyeShmdW5jdGlvbiAoaVJ1bGUpIHtcbiAgICAgICAgICAgIGlmIChpUnVsZS5rZXkgIT09IHNLZXkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbmhvbW9nZW5vdXMga2V5cyBpbiBydWxlcywgZXhwZWN0ZWQgXCIgKyBzS2V5ICsgXCIgd2FzIFwiICsgSlNPTi5zdHJpbmdpZnkoaVJ1bGUpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8gbG9vayBmb3IgcnVsZXMgd2hpY2ggbWF0Y2hcbiAgICB2YXIgcmVzID0gb1J1bGVzLm1hcChmdW5jdGlvbiAob1J1bGUpIHtcbiAgICAgICAgLy8gaXMgdGhpcyBydWxlIGFwcGxpY2FibGVcbiAgICAgICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlIDAgLyogV09SRCAqLzpcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2hXb3JkKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKTtcbiAgICAgICAgICAgIGNhc2UgMSAvKiBSRUdFWFAgKi86XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hdGNoUmVnRXhwKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0pLmZpbHRlcihmdW5jdGlvbiAob3Jlcykge1xuICAgICAgICByZXR1cm4gISFvcmVzO1xuICAgIH0pLnNvcnQoc29ydEJ5V2VpZ2h0LmJpbmQodGhpcywgc0tleSkpO1xuICAgIHJldHVybiByZXM7XG4gICAgLy8gT2JqZWN0LmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgLy8gfSk7XG59XG5leHBvcnRzLmF1Z21lbnRDb250ZXh0MSA9IGF1Z21lbnRDb250ZXh0MTtcbmZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0KGNvbnRleHQsIGFSdWxlcykge1xuICAgIHZhciBvcHRpb25zMSA9IHtcbiAgICAgICAgbWF0Y2hvdGhlcnM6IHRydWUsXG4gICAgICAgIG92ZXJyaWRlOiBmYWxzZVxuICAgIH07XG4gICAgdmFyIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMSk7XG4gICAgaWYgKGFSZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHZhciBvcHRpb25zMiA9IHtcbiAgICAgICAgICAgIG1hdGNob3RoZXJzOiBmYWxzZSxcbiAgICAgICAgICAgIG92ZXJyaWRlOiB0cnVlXG4gICAgICAgIH07XG4gICAgICAgIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMik7XG4gICAgfVxuICAgIHJldHVybiBhUmVzO1xufVxuZXhwb3J0cy5hdWdtZW50Q29udGV4dCA9IGF1Z21lbnRDb250ZXh0O1xuZnVuY3Rpb24gaW5zZXJ0T3JkZXJlZChyZXN1bHQsIGlJbnNlcnRlZE1lbWJlciwgbGltaXQpIHtcbiAgICAvLyBUT0RPOiB1c2Ugc29tZSB3ZWlnaHRcbiAgICBpZiAocmVzdWx0Lmxlbmd0aCA8IGxpbWl0KSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKGlJbnNlcnRlZE1lbWJlcik7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5leHBvcnRzLmluc2VydE9yZGVyZWQgPSBpbnNlcnRPcmRlcmVkO1xuZnVuY3Rpb24gdGFrZVRvcE4oYXJyKSB7XG4gICAgdmFyIHUgPSBhcnIuZmlsdGVyKGZ1bmN0aW9uIChpbm5lckFycikgeyByZXR1cm4gaW5uZXJBcnIubGVuZ3RoID4gMDsgfSk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIC8vIHNoaWZ0IG91dCB0aGUgdG9wIG9uZXNcbiAgICB1ID0gdS5tYXAoZnVuY3Rpb24gKGlBcnIpIHtcbiAgICAgICAgdmFyIHRvcCA9IGlBcnIuc2hpZnQoKTtcbiAgICAgICAgcmVzID0gaW5zZXJ0T3JkZXJlZChyZXMsIHRvcCwgNSk7XG4gICAgICAgIHJldHVybiBpQXJyO1xuICAgIH0pLmZpbHRlcihmdW5jdGlvbiAoaW5uZXJBcnIpIHsgcmV0dXJuIGlubmVyQXJyLmxlbmd0aCA+IDA7IH0pO1xuICAgIC8vIGFzIEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMudGFrZVRvcE4gPSB0YWtlVG9wTjtcbnZhciBpbnB1dEZpbHRlclJ1bGVzID0gcmVxdWlyZSgnLi9pbnB1dEZpbHRlclJ1bGVzJyk7XG52YXIgcm07XG5mdW5jdGlvbiBnZXRSTU9uY2UoKSB7XG4gICAgaWYgKCFybSkge1xuICAgICAgICBybSA9IGlucHV0RmlsdGVyUnVsZXMuZ2V0UnVsZU1hcCgpO1xuICAgIH1cbiAgICByZXR1cm4gcm07XG59XG5mdW5jdGlvbiBhcHBseVJ1bGVzKGNvbnRleHQpIHtcbiAgICB2YXIgYmVzdE4gPSBbY29udGV4dF07XG4gICAgaW5wdXRGaWx0ZXJSdWxlcy5vS2V5T3JkZXIuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xuICAgICAgICB2YXIgYmVzdE5leHQgPSBbXTtcbiAgICAgICAgYmVzdE4uZm9yRWFjaChmdW5jdGlvbiAob0NvbnRleHQpIHtcbiAgICAgICAgICAgIGlmIChvQ29udGV4dFtzS2V5XSkge1xuICAgICAgICAgICAgICAgIGRlYnVnbG9nKCcqKiBhcHBseWluZyBydWxlcyBmb3IgJyArIHNLZXkpO1xuICAgICAgICAgICAgICAgIHZhciByZXMgPSBhdWdtZW50Q29udGV4dChvQ29udGV4dCwgZ2V0Uk1PbmNlKClbc0tleV0gfHwgW10pO1xuICAgICAgICAgICAgICAgIGRlYnVnbG9nKCcqKiByZXN1bHQgZm9yICcgKyBzS2V5ICsgJyA9ICcgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgICAgICAgICAgIGJlc3ROZXh0LnB1c2gocmVzIHx8IFtdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIHJ1bGUgbm90IHJlbGV2YW50XG4gICAgICAgICAgICAgICAgYmVzdE5leHQucHVzaChbb0NvbnRleHRdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGJlc3ROID0gdGFrZVRvcE4oYmVzdE5leHQpO1xuICAgIH0pO1xuICAgIHJldHVybiBiZXN0Tjtcbn1cbmV4cG9ydHMuYXBwbHlSdWxlcyA9IGFwcGx5UnVsZXM7XG5mdW5jdGlvbiBhcHBseVJ1bGVzUGlja0ZpcnN0KGNvbnRleHQpIHtcbiAgICB2YXIgciA9IGFwcGx5UnVsZXMoY29udGV4dCk7XG4gICAgcmV0dXJuIHIgJiYgclswXTtcbn1cbmV4cG9ydHMuYXBwbHlSdWxlc1BpY2tGaXJzdCA9IGFwcGx5UnVsZXNQaWNrRmlyc3Q7XG4vKipcbiAqIERlY2lkZSB3aGV0aGVyIHRvIHJlcXVlcnkgZm9yIGEgY29udGV0XG4gKi9cbmZ1bmN0aW9uIGRlY2lkZU9uUmVRdWVyeShjb250ZXh0KSB7XG4gICAgcmV0dXJuIFtdO1xufVxuZXhwb3J0cy5kZWNpZGVPblJlUXVlcnkgPSBkZWNpZGVPblJlUXVlcnk7XG4iLCIvKipcclxuICogdGhlIGlucHV0IGZpbHRlciBzdGFnZSBwcmVwcm9jZXNzZXMgYSBjdXJyZW50IGNvbnRleHRcclxuICpcclxuICogSXQgYSkgY29tYmluZXMgbXVsdGktc2VnbWVudCBhcmd1bWVudHMgaW50byBvbmUgY29udGV4dCBtZW1iZXJzXHJcbiAqIEl0IGIpIGF0dGVtcHRzIHRvIGF1Z21lbnQgdGhlIGNvbnRleHQgYnkgYWRkaXRpb25hbCBxdWFsaWZpY2F0aW9uc1xyXG4gKiAgICAgICAgICAgKE1pZCB0ZXJtIGdlbmVyYXRpbmcgQWx0ZXJuYXRpdmVzLCBlLmcuXHJcbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiB1bml0IHRlc3Q/XHJcbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiBzb3VyY2UgP1xyXG4gKiAgICAgICAgICAgKVxyXG4gKiAgU2ltcGxlIHJ1bGVzIGxpa2UgIEludGVudFxyXG4gKlxyXG4gKlxyXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5pbnB1dEZpbHRlclxyXG4gKiBAZmlsZSBpbnB1dEZpbHRlci50c1xyXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXHJcbiAqL1xyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vbGliL25vZGUtNC5kLnRzXCIgLz5cclxuaW1wb3J0ICogYXMgZGlzdGFuY2UgZnJvbSAnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluJztcclxuXHJcbmltcG9ydCAqIGFzIExvZ2dlciBmcm9tICcuLi91dGlscy9sb2dnZXInXHJcblxyXG5jb25zdCBsb2dnZXIgPSBMb2dnZXIubG9nZ2VyKCdpbnB1dEZpbHRlcicpO1xyXG5cclxuaW1wb3J0ICogYXMgZGVidWcgZnJvbSAnZGVidWcnO1xyXG52YXIgZGVidWdwZXJmID0gZGVidWcoJ3BlcmYnKTtcclxuXHJcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gJy4uL3V0aWxzL3V0aWxzJztcclxuXHJcblxyXG5pbXBvcnQgKiBhcyBBbGdvbCBmcm9tICcuL2FsZ29sJztcclxuXHJcbmltcG9ydCAqIGFzIElNYXRjaCBmcm9tICcuL2lmbWF0Y2gnO1xyXG5cclxuaW1wb3J0ICogYXMgYnJlYWtkb3duIGZyb20gJy4vYnJlYWtkb3duJztcclxuXHJcbmNvbnN0IEFueU9iamVjdCA9IDxhbnk+T2JqZWN0O1xyXG5cclxuY29uc3QgZGVidWdsb2cgPSBkZWJ1ZygnaW5wdXRGaWx0ZXInKVxyXG5cclxuaW1wb3J0ICogYXMgbWF0Y2hkYXRhIGZyb20gJy4vbWF0Y2hkYXRhJztcclxudmFyIG9Vbml0VGVzdHMgPSBtYXRjaGRhdGEub1VuaXRUZXN0c1xyXG5cclxuLyoqXHJcbiAqIEBwYXJhbSBzVGV4dCB7c3RyaW5nfSB0aGUgdGV4dCB0byBtYXRjaCB0byBOYXZUYXJnZXRSZXNvbHV0aW9uXHJcbiAqIEBwYXJhbSBzVGV4dDIge3N0cmluZ30gdGhlIHF1ZXJ5IHRleHQsIGUuZy4gTmF2VGFyZ2V0XHJcbiAqXHJcbiAqIEByZXR1cm4gdGhlIGRpc3RhbmNlLCBub3RlIHRoYXQgaXMgaXMgKm5vdCogc3ltbWV0cmljIVxyXG4gKi9cclxuZnVuY3Rpb24gY2FsY0Rpc3RhbmNlKHNUZXh0MTogc3RyaW5nLCBzVGV4dDI6IHN0cmluZyk6IG51bWJlciB7XHJcbiAgLy8gY29uc29sZS5sb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxyXG4gICBpZigoKHNUZXh0MS5sZW5ndGggLSBzVGV4dDIubGVuZ3RoKSA+IDgpXHJcbiAgICB8fCAoc1RleHQyLmxlbmd0aCA+IDEuNSAqIHNUZXh0MS5sZW5ndGggKVxyXG4gICAgfHwgKHNUZXh0Mi5sZW5ndGggPCAoc1RleHQxLmxlbmd0aC8yKSkgKSB7XHJcbiAgICByZXR1cm4gNTAwMDA7XHJcbiAgfVxyXG4gIHZhciBhMCA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCksIHNUZXh0MilcclxuICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZyhcImRpc3RhbmNlXCIgKyBhMCArIFwic3RyaXBwZWQ+XCIgKyBzVGV4dDEuc3Vic3RyaW5nKDAsc1RleHQyLmxlbmd0aCkgKyBcIjw+XCIgKyBzVGV4dDIrIFwiPFwiKTtcclxuICB9XHJcbiAgaWYoYTAgKiA1MCA+IDE1ICogc1RleHQyLmxlbmd0aCkge1xyXG4gICAgICByZXR1cm4gNTAwMDA7XHJcbiAgfVxyXG4gIHZhciBhID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLCBzVGV4dDIpXHJcbiAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGFcclxufVxyXG5cclxuaW1wb3J0ICogYXMgSUZNYXRjaCBmcm9tICcuLi9tYXRjaC9pZm1hdGNoJztcclxuXHJcbnR5cGUgSVJ1bGUgPSBJRk1hdGNoLklSdWxlXHJcblxyXG5cclxuaW50ZXJmYWNlIElNYXRjaE9wdGlvbnMge1xyXG4gIG1hdGNob3RoZXJzPzogYm9vbGVhbixcclxuICBhdWdtZW50PzogYm9vbGVhbixcclxuICBvdmVycmlkZT86IGJvb2xlYW5cclxufVxyXG5cclxuaW50ZXJmYWNlIElNYXRjaENvdW50IHtcclxuICBlcXVhbDogbnVtYmVyXHJcbiAgZGlmZmVyZW50OiBudW1iZXJcclxuICBzcHVyaW91c1I6IG51bWJlclxyXG4gIHNwdXJpb3VzTDogbnVtYmVyXHJcbn1cclxuXHJcbnR5cGUgRW51bVJ1bGVUeXBlID0gSUZNYXRjaC5FbnVtUnVsZVR5cGVcclxuXHJcbmNvbnN0IGxldmVuQ3V0b2ZmID0gQWxnb2wuQ3V0b2ZmX0xldmVuU2h0ZWluO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGxldmVuUGVuYWx0eShpOiBudW1iZXIpOiBudW1iZXIge1xyXG4gIC8vIDAtPiAxXHJcbiAgLy8gMSAtPiAwLjFcclxuICAvLyAxNTAgLT4gIDAuOFxyXG4gIGlmIChpID09PSAwKSB7XHJcbiAgICByZXR1cm4gMTtcclxuICB9XHJcbiAgLy8gcmV2ZXJzZSBtYXkgYmUgYmV0dGVyIHRoYW4gbGluZWFyXHJcbiAgcmV0dXJuIDEgKyBpICogKDAuOCAtIDEpIC8gMTUwXHJcbn1cclxuXHJcbmZ1bmN0aW9uIG5vblByaXZhdGVLZXlzKG9BKSB7XHJcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG9BKS5maWx0ZXIoa2V5ID0+IHtcclxuICAgIHJldHVybiBrZXlbMF0gIT09ICdfJztcclxuICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNvdW50QWluQihvQSwgb0IsIGZuQ29tcGFyZSwgYUtleUlnbm9yZT8pOiBudW1iZXIge1xyXG4gIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gYUtleUlnbm9yZSA6XHJcbiAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xyXG4gIGZuQ29tcGFyZSA9IGZuQ29tcGFyZSB8fCBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9XHJcbiAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xyXG4gICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcclxuICB9KS5cclxuICAgIHJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XHJcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIChmbkNvbXBhcmUob0Fba2V5XSwgb0Jba2V5XSwga2V5KSA/IDEgOiAwKVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBwcmV2XHJcbiAgICB9LCAwKVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc3B1cmlvdXNBbm90SW5CKG9BLCBvQiwgYUtleUlnbm9yZT8pIHtcclxuICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxyXG4gICAgdHlwZW9mIGFLZXlJZ25vcmUgPT09IFwic3RyaW5nXCIgPyBbYUtleUlnbm9yZV0gOiBbXTtcclxuICByZXR1cm4gbm9uUHJpdmF0ZUtleXMob0EpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xyXG4gIH0pLlxyXG4gICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIDFcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldlxyXG4gICAgfSwgMClcclxufVxyXG5cclxuZnVuY3Rpb24gbG93ZXJDYXNlKG8pIHtcclxuICBpZiAodHlwZW9mIG8gPT09IFwic3RyaW5nXCIpIHtcclxuICAgIHJldHVybiBvLnRvTG93ZXJDYXNlKClcclxuICB9XHJcbiAgcmV0dXJuIG9cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmVDb250ZXh0KG9BLCBvQiwgYUtleUlnbm9yZT8pIHtcclxuICB2YXIgZXF1YWwgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpID09PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xyXG4gIHZhciBkaWZmZXJlbnQgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpICE9PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xyXG4gIHZhciBzcHVyaW91c0wgPSBzcHVyaW91c0Fub3RJbkIob0EsIG9CLCBhS2V5SWdub3JlKVxyXG4gIHZhciBzcHVyaW91c1IgPSBzcHVyaW91c0Fub3RJbkIob0IsIG9BLCBhS2V5SWdub3JlKVxyXG4gIHJldHVybiB7XHJcbiAgICBlcXVhbDogZXF1YWwsXHJcbiAgICBkaWZmZXJlbnQ6IGRpZmZlcmVudCxcclxuICAgIHNwdXJpb3VzTDogc3B1cmlvdXNMLFxyXG4gICAgc3B1cmlvdXNSOiBzcHVyaW91c1JcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNvcnRCeVJhbmsoYTogSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmcsIGI6IElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nKTogbnVtYmVyIHtcclxuICB2YXIgciA9IC0oKGEuX3JhbmtpbmcgfHwgMS4wKSAtIChiLl9yYW5raW5nIHx8IDEuMCkpO1xyXG4gIGlmIChyKSB7XHJcbiAgICByZXR1cm4gcjtcclxuICB9XHJcbiAgaWYgKGEuY2F0ZWdvcnkgJiYgYi5jYXRlZ29yeSkge1xyXG4gICAgciA9IGEuY2F0ZWdvcnkubG9jYWxlQ29tcGFyZShiLmNhdGVnb3J5KTtcclxuICAgIGlmIChyKSB7XHJcbiAgICAgIHJldHVybiByO1xyXG4gICAgfVxyXG4gIH1cclxuICBpZiAoYS5tYXRjaGVkU3RyaW5nICYmIGIubWF0Y2hlZFN0cmluZykge1xyXG4gICAgciA9IGEubWF0Y2hlZFN0cmluZy5sb2NhbGVDb21wYXJlKGIubWF0Y2hlZFN0cmluZyk7XHJcbiAgICBpZiAocikge1xyXG4gICAgICByZXR1cm4gcjtcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIDA7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVN0cmluZyhzdHJpbmc6IHN0cmluZywgZXhhY3Q6IGJvb2xlYW4sIG9SdWxlczogQXJyYXk8SU1hdGNoLm1SdWxlPik6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiB7XHJcbiAgLy8gc2ltcGx5IGFwcGx5IGFsbCBydWxlc1xyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQgKSAge1xyXG4gICAgZGVidWdsb2coXCJydWxlcyA6IFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGVzKSk7XHJcbiAgfVxyXG4gIHZhciBsY1N0cmluZyA9IHN0cmluZy50b0xvd2VyQ2FzZSgpO1xyXG4gIHZhciByZXM6IEFycmF5PElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+ID0gW11cclxuICBvUnVsZXMuZm9yRWFjaChmdW5jdGlvbiAob1J1bGUpIHtcclxuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAgIGRlYnVnbG9nKCdhdHRlbXB0aW5nIHRvIG1hdGNoIHJ1bGUgJyArIEpTT04uc3RyaW5naWZ5KG9SdWxlKSArIFwiIHRvIHN0cmluZyBcXFwiXCIgKyBzdHJpbmcgKyBcIlxcXCJcIik7XHJcbiAgICB9XHJcbiAgICBzd2l0Y2ggKG9SdWxlLnR5cGUpIHtcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5XT1JEOlxyXG4gICAgICAgIGlmKCFvUnVsZS5sb3dlcmNhc2V3b3JkKSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3J1bGUgd2l0aG91dCBhIGxvd2VyY2FzZSB2YXJpYW50JyArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKTtcclxuICAgICAgICAgfTtcclxuICAgICAgICBpZiAoZXhhY3QgJiYgb1J1bGUud29yZCA9PT0gc3RyaW5nIHx8IG9SdWxlLmxvd2VyY2FzZXdvcmQgPT09IGxjU3RyaW5nKSB7XHJcbiAgICAgICAgICByZXMucHVzaCh7XHJcbiAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxyXG4gICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBvUnVsZS5tYXRjaGVkU3RyaW5nLFxyXG4gICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXHJcbiAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghZXhhY3QgJiYgIW9SdWxlLmV4YWN0T25seSkge1xyXG4gICAgICAgICAgdmFyIGxldmVubWF0Y2ggPSBjYWxjRGlzdGFuY2Uob1J1bGUubG93ZXJjYXNld29yZCwgbGNTdHJpbmcpXHJcbiAgICAgICAgICBpZiAobGV2ZW5tYXRjaCA8IGxldmVuQ3V0b2ZmKSB7XHJcbiAgICAgICAgICAgIHJlcy5wdXNoKHtcclxuICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcclxuICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBvUnVsZS53b3JkLFxyXG4gICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgICBfcmFua2luZzogKG9SdWxlLl9yYW5raW5nIHx8IDEuMCkgKiBsZXZlblBlbmFsdHkobGV2ZW5tYXRjaCksXHJcbiAgICAgICAgICAgICAgbGV2ZW5tYXRjaDogbGV2ZW5tYXRjaFxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5SRUdFWFA6IHtcclxuICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoXCIgaGVyZSByZWdleHBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKSlcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIG0gPSBvUnVsZS5yZWdleHAuZXhlYyhzdHJpbmcpXHJcbiAgICAgICAgaWYgKG0pIHtcclxuICAgICAgICAgIHJlcy5wdXNoKHtcclxuICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IChvUnVsZS5tYXRjaEluZGV4ICE9PSB1bmRlZmluZWQgJiYgbVtvUnVsZS5tYXRjaEluZGV4XSkgfHwgc3RyaW5nLFxyXG4gICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXHJcbiAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidW5rbm93biB0eXBlXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSlcclxuICAgIH1cclxuICB9KTtcclxuICByZXMuc29ydChzb3J0QnlSYW5rKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcbi8qKlxyXG4gKlxyXG4gKiBPcHRpb25zIG1heSBiZSB7XHJcbiAqIG1hdGNob3RoZXJzIDogdHJ1ZSwgID0+IG9ubHkgcnVsZXMgd2hlcmUgYWxsIG90aGVycyBtYXRjaCBhcmUgY29uc2lkZXJlZFxyXG4gKiBhdWdtZW50IDogdHJ1ZSxcclxuICogb3ZlcnJpZGUgOiB0cnVlIH0gID0+XHJcbiAqXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hXb3JkKG9SdWxlOiBJUnVsZSwgY29udGV4dDogSUZNYXRjaC5jb250ZXh0LCBvcHRpb25zPzogSU1hdGNoT3B0aW9ucykge1xyXG4gIGlmIChjb250ZXh0W29SdWxlLmtleV0gPT09IHVuZGVmaW5lZCkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICB9XHJcbiAgdmFyIHMxID0gY29udGV4dFtvUnVsZS5rZXldLnRvTG93ZXJDYXNlKClcclxuICB2YXIgczIgPSBvUnVsZS53b3JkLnRvTG93ZXJDYXNlKCk7XHJcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cclxuICB2YXIgZGVsdGEgPSBjb21wYXJlQ29udGV4dChjb250ZXh0LCBvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpXHJcbiAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcclxuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcclxuICB9XHJcbiAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkXHJcbiAgfVxyXG4gIHZhciBjOiBudW1iZXIgPSBjYWxjRGlzdGFuY2UoczIsIHMxKTtcclxuICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZyhcIiBzMSA8PiBzMiBcIiArIHMxICsgXCI8PlwiICsgczIgKyBcIiAgPT46IFwiICsgYyk7XHJcbiAgfVxyXG4gIGlmIChjIDwgMTUwKSB7XHJcbiAgICB2YXIgcmVzID0gQW55T2JqZWN0LmFzc2lnbih7fSwgb1J1bGUuZm9sbG93cykgYXMgYW55O1xyXG4gICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIGNvbnRleHQpO1xyXG4gICAgaWYgKG9wdGlvbnMub3ZlcnJpZGUpIHtcclxuICAgICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xyXG4gICAgfVxyXG4gICAgLy8gZm9yY2Uga2V5IHByb3BlcnR5XHJcbiAgICAvLyBjb25zb2xlLmxvZygnIG9iamVjdGNhdGVnb3J5JywgcmVzWydzeXN0ZW1PYmplY3RDYXRlZ29yeSddKTtcclxuICAgIHJlc1tvUnVsZS5rZXldID0gb1J1bGUuZm9sbG93c1tvUnVsZS5rZXldIHx8IHJlc1tvUnVsZS5rZXldO1xyXG4gICAgcmVzLl93ZWlnaHQgPSBBbnlPYmplY3QuYXNzaWduKHt9LCByZXMuX3dlaWdodCk7XHJcbiAgICByZXMuX3dlaWdodFtvUnVsZS5rZXldID0gYztcclxuICAgIE9iamVjdC5mcmVlemUocmVzKTtcclxuICAgIGlmICggZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgICBkZWJ1Z2xvZygnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuICByZXR1cm4gdW5kZWZpbmVkO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEFyZ3NNYXAobWF0Y2g6IEFycmF5PHN0cmluZz4sIGFyZ3NNYXA6IHsgW2tleTogbnVtYmVyXTogc3RyaW5nIH0pOiBJRk1hdGNoLmNvbnRleHQge1xyXG4gIHZhciByZXMgPSB7fSBhcyBJRk1hdGNoLmNvbnRleHQ7XHJcbiAgaWYgKCFhcmdzTWFwKSB7XHJcbiAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuICBPYmplY3Qua2V5cyhhcmdzTWFwKS5mb3JFYWNoKGZ1bmN0aW9uIChpS2V5KSB7XHJcbiAgICB2YXIgdmFsdWUgPSBtYXRjaFtpS2V5XVxyXG4gICAgdmFyIGtleSA9IGFyZ3NNYXBbaUtleV07XHJcbiAgICBpZiAoKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikgJiYgdmFsdWUubGVuZ3RoID4gMCkge1xyXG4gICAgICByZXNba2V5XSA9IHZhbHVlXHJcbiAgICB9XHJcbiAgfVxyXG4gICk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IFJhbmtXb3JkID0ge1xyXG4gIGhhc0Fib3ZlOiBmdW5jdGlvbiAobHN0OiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4sIGJvcmRlcjogbnVtYmVyKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gIWxzdC5ldmVyeShmdW5jdGlvbiAob01lbWJlcikge1xyXG4gICAgICByZXR1cm4gKG9NZW1iZXIuX3JhbmtpbmcgPCBib3JkZXIpO1xyXG4gICAgfSk7XHJcbiAgfSxcclxuXHJcbiAgdGFrZUZpcnN0TjogZnVuY3Rpb24gKGxzdDogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+LCBuOiBudW1iZXIpOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4ge1xyXG4gICAgcmV0dXJuIGxzdC5maWx0ZXIoZnVuY3Rpb24gKG9NZW1iZXIsIGlJbmRleCkge1xyXG4gICAgICB2YXIgbGFzdFJhbmtpbmcgPSAxLjA7XHJcbiAgICAgIGlmICgoaUluZGV4IDwgbikgfHwgb01lbWJlci5fcmFua2luZyA9PT0gbGFzdFJhbmtpbmcpIHtcclxuICAgICAgICBsYXN0UmFua2luZyA9IG9NZW1iZXIuX3Jhbmtpbmc7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfSk7XHJcbiAgfSxcclxuICB0YWtlQWJvdmU6IGZ1bmN0aW9uIChsc3Q6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiwgYm9yZGVyOiBudW1iZXIpOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4ge1xyXG4gICAgcmV0dXJuIGxzdC5maWx0ZXIoZnVuY3Rpb24gKG9NZW1iZXIpIHtcclxuICAgICAgcmV0dXJuIChvTWVtYmVyLl9yYW5raW5nID49IGJvcmRlcik7XHJcbiAgICB9KTtcclxuICB9XHJcbn07XHJcblxyXG4vKlxyXG52YXIgZXhhY3RMZW4gPSAwO1xyXG52YXIgZnV6enlMZW4gPSAwO1xyXG52YXIgZnV6enlDbnQgPSAwO1xyXG52YXIgZXhhY3RDbnQgPSAwO1xyXG52YXIgdG90YWxDbnQgPSAwO1xyXG52YXIgdG90YWxMZW4gPSAwO1xyXG52YXIgcmV0YWluZWRDbnQgPSAwO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlc2V0Q250KCkge1xyXG4gIGV4YWN0TGVuID0gMDtcclxuICBmdXp6eUxlbiA9IDA7XHJcbiAgZnV6enlDbnQgPSAwO1xyXG4gIGV4YWN0Q250ID0gMDtcclxuICB0b3RhbENudCA9IDA7XHJcbiAgdG90YWxMZW4gPSAwO1xyXG4gIHJldGFpbmVkQ250ID0gMDtcclxufVxyXG4qL1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNhdGVnb3JpemVXb3JkV2l0aFJhbmtDdXRvZmYoc1dvcmRHcm91cDogc3RyaW5nLCBhUnVsZXM6IEFycmF5PElGTWF0Y2gubVJ1bGU+KTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IHtcclxuICB2YXIgc2Vlbkl0ID0gY2F0ZWdvcml6ZVN0cmluZyhzV29yZEdyb3VwLCB0cnVlLCBhUnVsZXMpO1xyXG4gIC8vdG90YWxDbnQgKz0gMTtcclxuICAvLyBleGFjdExlbiArPSBzZWVuSXQubGVuZ3RoO1xyXG4gIGlmIChSYW5rV29yZC5oYXNBYm92ZShzZWVuSXQsIDAuOCkpIHtcclxuICAgIHNlZW5JdCA9IFJhbmtXb3JkLnRha2VBYm92ZShzZWVuSXQsIDAuOCk7XHJcbiAgIC8vIGV4YWN0Q250ICs9IDE7XHJcbiAgfSBlbHNlIHtcclxuICAgIHNlZW5JdCA9IGNhdGVnb3JpemVTdHJpbmcoc1dvcmRHcm91cCwgZmFsc2UsIGFSdWxlcyk7XHJcbiAgLy8gIGZ1enp5TGVuICs9IHNlZW5JdC5sZW5ndGg7XHJcbiAgLy8gIGZ1enp5Q250ICs9IDE7XHJcbiAgfVxyXG4gLy8gdG90YWxMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcclxuICBzZWVuSXQgPSBSYW5rV29yZC50YWtlRmlyc3ROKHNlZW5JdCwgQWxnb2wuVG9wX05fV29yZENhdGVnb3JpemF0aW9ucyk7XHJcbiAvLyByZXRhaW5lZENudCArPSBzZWVuSXQubGVuZ3RoO1xyXG4gIHJldHVybiBzZWVuSXQ7XHJcbn1cclxuXHJcbi8qXHJcbmV4cG9ydCBmdW5jdGlvbiBkdW1wQ250KCkge1xyXG4gIGNvbnNvbGUubG9nKGBcclxuZXhhY3RMZW4gPSAke2V4YWN0TGVufTtcclxuZXhhY3RDbnQgPSAke2V4YWN0Q250fTtcclxuZnV6enlMZW4gPSAke2Z1enp5TGVufTtcclxuZnV6enlDbnQgPSAke2Z1enp5Q250fTtcclxudG90YWxDbnQgPSAke3RvdGFsQ250fTtcclxudG90YWxMZW4gPSAke3RvdGFsTGVufTtcclxucmV0YWluZWRMZW4gPSAke3JldGFpbmVkQ250fTtcclxuICBgKTtcclxufVxyXG4qL1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZFNlbnRlbmNlKG9TZW50ZW5jZTogSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXVtdKTogYm9vbGVhbiB7XHJcbiAgcmV0dXJuIG9TZW50ZW5jZS5ldmVyeShmdW5jdGlvbiAob1dvcmRHcm91cCkge1xyXG4gICAgcmV0dXJuIChvV29yZEdyb3VwLmxlbmd0aCA+IDApO1xyXG4gIH0pO1xyXG59XHJcblxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWQoYXJyOiBJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdW11bXSk6IElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11bXVtdIHtcclxuICByZXR1cm4gYXJyLmZpbHRlcihmdW5jdGlvbiAob1NlbnRlbmNlKSB7XHJcbiAgICByZXR1cm4gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkU2VudGVuY2Uob1NlbnRlbmNlKTtcclxuICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNhdGVnb3JpemVBV29yZChzV29yZEdyb3VwOiBzdHJpbmcsIGFSdWxlczogQXJyYXk8SU1hdGNoLm1SdWxlPiwgc1N0cmluZzogc3RyaW5nLCB3b3JkczogeyBba2V5OiBzdHJpbmddOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4gfSkge1xyXG4gIHZhciBzZWVuSXQgPSB3b3Jkc1tzV29yZEdyb3VwXTtcclxuICBpZiAoc2Vlbkl0ID09PSB1bmRlZmluZWQpIHtcclxuICAgIHNlZW5JdCA9IGNhdGVnb3JpemVXb3JkV2l0aFJhbmtDdXRvZmYoc1dvcmRHcm91cCwgYVJ1bGVzKTtcclxuICAgIHV0aWxzLmRlZXBGcmVlemUoc2Vlbkl0KTtcclxuICAgIGlmIChzZWVuSXQgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICB3b3Jkc1tzV29yZEdyb3VwXSA9IHNlZW5JdDtcclxuICAgIH1cclxuICAgIHdvcmRzW3NXb3JkR3JvdXBdID0gc2Vlbkl0O1xyXG4gIH1cclxuICBpZiAoIXNlZW5JdCB8fCBzZWVuSXQubGVuZ3RoID09PSAwKSB7XHJcbiAgICBsb2dnZXIoXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBcXFwiXCIgKyBzV29yZEdyb3VwICsgXCJcXFwiIGluIHNlbnRlbmNlIFxcXCJcIlxyXG4gICAgICArIHNTdHJpbmcgKyBcIlxcXCJcIik7XHJcbiAgICBpZiAoc1dvcmRHcm91cC5pbmRleE9mKFwiIFwiKSA8PSAwKSB7XHJcbiAgICAgIGRlYnVnbG9nKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgcHJpbWl0aXZlICghKVwiICsgc1dvcmRHcm91cCk7XHJcbiAgICB9XHJcbiAgICBkZWJ1Z2xvZyhcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIFwiICsgc1dvcmRHcm91cCk7XHJcbiAgICBpZiAoIXNlZW5JdCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RpbmcgZW10cHkgbGlzdCwgbm90IHVuZGVmaW5lZCBmb3IgXFxcIlwiICsgc1dvcmRHcm91cCArIFwiXFxcIlwiKVxyXG4gICAgfVxyXG4gICAgd29yZHNbc1dvcmRHcm91cF0gPSBbXVxyXG4gICAgcmV0dXJuIFtdO1xyXG4gIH1cclxuICByZXR1cm4gdXRpbHMuY2xvbmVEZWVwKHNlZW5JdCk7XHJcbn1cclxuXHJcblxyXG4vKipcclxuICogR2l2ZW4gYSAgc3RyaW5nLCBicmVhayBpdCBkb3duIGludG8gY29tcG9uZW50cyxcclxuICogW1snQScsICdCJ10sIFsnQSBCJ11dXHJcbiAqXHJcbiAqIHRoZW4gY2F0ZWdvcml6ZVdvcmRzXHJcbiAqIHJldHVybmluZ1xyXG4gKlxyXG4gKiBbIFtbIHsgY2F0ZWdvcnk6ICdzeXN0ZW1JZCcsIHdvcmQgOiAnQSd9LFxyXG4gKiAgICAgIHsgY2F0ZWdvcnk6ICdvdGhlcnRoaW5nJywgd29yZCA6ICdBJ31cclxuICogICAgXSxcclxuICogICAgLy8gcmVzdWx0IG9mIEJcclxuICogICAgWyB7IGNhdGVnb3J5OiAnc3lzdGVtSWQnLCB3b3JkIDogJ0InfSxcclxuICogICAgICB7IGNhdGVnb3J5OiAnb3RoZXJ0aGluZycsIHdvcmQgOiAnQSd9XHJcbiAqICAgICAgeyBjYXRlZ29yeTogJ2Fub3RoZXJ0cnlwJywgd29yZCA6ICdCJ31cclxuICogICAgXVxyXG4gKiAgIF0sXHJcbiAqIF1dXVxyXG4gKlxyXG4gKlxyXG4gKlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVTdHJpbmcoc1N0cmluZzogc3RyaW5nLCBhUnVsZXM6IEFycmF5PElNYXRjaC5tUnVsZT4sXHJcbiAgd29yZHM/OiB7IFtrZXk6IHN0cmluZ106IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiB9KSB7XHJcbiAgdmFyIGNudCA9IDA7XHJcbiAgdmFyIGZhYyA9IDE7XHJcbiAgdmFyIHUgPSBicmVha2Rvd24uYnJlYWtkb3duU3RyaW5nKHNTdHJpbmcsIEFsZ29sLk1heFNwYWNlc1BlckNvbWJpbmVkV29yZCk7XHJcbiAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgZGVidWdsb2coXCJoZXJlIGJyZWFrZG93blwiICsgSlNPTi5zdHJpbmdpZnkodSkpO1xyXG4gIH1cclxuICB3b3JkcyA9IHdvcmRzIHx8IHt9O1xyXG4gIGRlYnVncGVyZigndGhpcyBtYW55IGtub3duIHdvcmRzJyArIE9iamVjdC5rZXlzKHdvcmRzKS5sZW5ndGgpO1xyXG4gIHZhciByZXMgPSB1Lm1hcChmdW5jdGlvbiAoYUFycikge1xyXG4gICAgcmV0dXJuIGFBcnIubWFwKGZ1bmN0aW9uIChzV29yZEdyb3VwOiBzdHJpbmcpIHtcclxuICAgICAgdmFyIHNlZW5JdCA9IGNhdGVnb3JpemVBV29yZChzV29yZEdyb3VwLCBhUnVsZXMsIHNTdHJpbmcsIHdvcmRzKTtcclxuICAgICAgY250ID0gY250ICsgc2Vlbkl0Lmxlbmd0aDtcclxuICAgICAgZmFjID0gZmFjICogc2Vlbkl0Lmxlbmd0aDtcclxuICAgICAgcmV0dXJuIHNlZW5JdDtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG4gIHJlcyA9IGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZChyZXMpO1xyXG4gIGRlYnVnbG9nKFwiIHNlbnRlbmNlcyBcIiArIHUubGVuZ3RoICsgXCIgbWF0Y2hlcyBcIiArIGNudCArIFwiIGZhYzogXCIgKyBmYWMpO1xyXG4gIGRlYnVncGVyZihcIiBzZW50ZW5jZXMgXCIgKyB1Lmxlbmd0aCArIFwiIG1hdGNoZXMgXCIgKyBjbnQgKyBcIiBmYWM6IFwiICsgZmFjKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG4vKlxyXG5bIFthLGJdLCBbYyxkXV1cclxuXHJcbjAwIGFcclxuMDEgYlxyXG4xMCBjXHJcbjExIGRcclxuMTIgY1xyXG4qL1xyXG5cclxuXHJcbmNvbnN0IGNsb25lID0gdXRpbHMuY2xvbmVEZWVwO1xyXG5cclxuLy8gd2UgY2FuIHJlcGxpY2F0ZSB0aGUgdGFpbCBvciB0aGUgaGVhZCxcclxuLy8gd2UgcmVwbGljYXRlIHRoZSB0YWlsIGFzIGl0IGlzIHNtYWxsZXIuXHJcblxyXG4vLyBbYSxiLGMgXVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGV4cGFuZE1hdGNoQXJyKGRlZXA6IEFycmF5PEFycmF5PGFueT4+KTogQXJyYXk8QXJyYXk8YW55Pj4ge1xyXG4gIHZhciBhID0gW107XHJcbiAgdmFyIGxpbmUgPSBbXTtcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWVwKSk7XHJcbiAgZGVlcC5mb3JFYWNoKGZ1bmN0aW9uICh1QnJlYWtEb3duTGluZSwgaUluZGV4OiBudW1iZXIpIHtcclxuICAgIGxpbmVbaUluZGV4XSA9IFtdO1xyXG4gICAgdUJyZWFrRG93bkxpbmUuZm9yRWFjaChmdW5jdGlvbiAoYVdvcmRHcm91cCwgd2dJbmRleDogbnVtYmVyKSB7XHJcbiAgICAgIGxpbmVbaUluZGV4XVt3Z0luZGV4XSA9IFtdO1xyXG4gICAgICBhV29yZEdyb3VwLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkVmFyaWFudCwgaVdWSW5kZXg6IG51bWJlcikge1xyXG4gICAgICAgIGxpbmVbaUluZGV4XVt3Z0luZGV4XVtpV1ZJbmRleF0gPSBvV29yZFZhcmlhbnQ7XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfSlcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShsaW5lKSk7XHJcbiAgdmFyIHJlcyA9IFtdO1xyXG4gIHZhciBudmVjcyA9IFtdO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZS5sZW5ndGg7ICsraSkge1xyXG4gICAgdmFyIHZlY3MgPSBbW11dO1xyXG4gICAgdmFyIG52ZWNzID0gW107XHJcbiAgICB2YXIgcnZlYyA9IFtdO1xyXG4gICAgZm9yICh2YXIgayA9IDA7IGsgPCBsaW5lW2ldLmxlbmd0aDsgKytrKSB7IC8vIHdvcmRncm91cCBrXHJcbiAgICAgIC8vdmVjcyBpcyB0aGUgdmVjdG9yIG9mIGFsbCBzbyBmYXIgc2VlbiB2YXJpYW50cyB1cCB0byBrIHdncy5cclxuICAgICAgdmFyIG5leHRCYXNlID0gW107XHJcbiAgICAgIGZvciAodmFyIGwgPSAwOyBsIDwgbGluZVtpXVtrXS5sZW5ndGg7ICsrbCkgeyAvLyBmb3IgZWFjaCB2YXJpYW50XHJcbiAgICAgICAgLy9kZWJ1Z2xvZyhcInZlY3Mgbm93XCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzKSk7XHJcbiAgICAgICAgbnZlY3MgPSBbXTsgLy92ZWNzLnNsaWNlKCk7IC8vIGNvcHkgdGhlIHZlY1tpXSBiYXNlIHZlY3RvcjtcclxuICAgICAgICAvL2RlYnVnbG9nKFwidmVjcyBjb3BpZWQgbm93XCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpO1xyXG4gICAgICAgIGZvciAodmFyIHUgPSAwOyB1IDwgdmVjcy5sZW5ndGg7ICsrdSkge1xyXG4gICAgICAgICAgbnZlY3NbdV0gPSB2ZWNzW3VdLnNsaWNlKCk7IC8vXHJcbiAgICAgICAgICAvLyBkZWJ1Z2xvZyhcImNvcGllZCB2ZWNzW1wiKyB1K1wiXVwiICsgSlNPTi5zdHJpbmdpZnkodmVjc1t1XSkpO1xyXG4gICAgICAgICAgbnZlY3NbdV0ucHVzaChcclxuICAgICAgICAgICAgY2xvbmUobGluZVtpXVtrXVtsXSkpOyAvLyBwdXNoIHRoZSBsdGggdmFyaWFudFxyXG4gICAgICAgICAgLy8gZGVidWdsb2coXCJub3cgbnZlY3MgXCIgKyBudmVjcy5sZW5ndGggKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vICAgZGVidWdsb2coXCIgYXQgICAgIFwiICsgayArIFwiOlwiICsgbCArIFwiIG5leHRiYXNlID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcclxuICAgICAgICAvLyAgIGRlYnVnbG9nKFwiIGFwcGVuZCBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiBudmVjcyAgICA+XCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpXHJcbiAgICAgICAgbmV4dEJhc2UgPSBuZXh0QmFzZS5jb25jYXQobnZlY3MpO1xyXG4gICAgICAgIC8vICAgZGVidWdsb2coXCIgIHJlc3VsdCBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiBudmVjcyAgICA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpXHJcbiAgICAgIH0gLy9jb25zdHJ1XHJcbiAgICAgIC8vICBkZWJ1Z2xvZyhcIm5vdyBhdCBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpXHJcbiAgICAgIHZlY3MgPSBuZXh0QmFzZTtcclxuICAgIH1cclxuICAgIGRlYnVnbG9nKFwiQVBQRU5ESU5HIFRPIFJFU1wiICsgaSArIFwiOlwiICsgbCArIFwiID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcclxuICAgIHJlcyA9IHJlcy5jb25jYXQodmVjcyk7XHJcbiAgfVxyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcblxyXG4vKipcclxuICogQ2FsY3VsYXRlIGEgd2VpZ2h0IGZhY3RvciBmb3IgYSBnaXZlbiBkaXN0YW5jZSBhbmRcclxuICogY2F0ZWdvcnlcclxuICogQHBhcmFtIHtpbnRlZ2VyfSBkaXN0IGRpc3RhbmNlIGluIHdvcmRzXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBjYXRlZ29yeSBjYXRlZ29yeSB0byB1c2VcclxuICogQHJldHVybnMge251bWJlcn0gYSBkaXN0YW5jZSBmYWN0b3IgPj0gMVxyXG4gKiAgMS4wIGZvciBubyBlZmZlY3RcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiByZWluZm9yY2VEaXN0V2VpZ2h0KGRpc3Q6IG51bWJlciwgY2F0ZWdvcnk6IHN0cmluZyk6IG51bWJlciB7XHJcbiAgdmFyIGFicyA9IE1hdGguYWJzKGRpc3QpO1xyXG4gIHJldHVybiAxLjAgKyAoQWxnb2wuYVJlaW5mb3JjZURpc3RXZWlnaHRbYWJzXSB8fCAwKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdpdmVuIGEgc2VudGVuY2UsIGV4dGFjdCBjYXRlZ29yaWVzXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdENhdGVnb3J5TWFwKG9TZW50ZW5jZTogQXJyYXk8SUZNYXRjaC5JV29yZD4pOiB7IFtrZXk6IHN0cmluZ106IEFycmF5PHsgcG9zOiBudW1iZXIgfT4gfSB7XHJcbiAgdmFyIHJlcyA9IHt9O1xyXG4gIGRlYnVnbG9nKCdleHRyYWN0Q2F0ZWdvcnlNYXAgJyArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSkpO1xyXG4gIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaUluZGV4KSB7XHJcbiAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IElGTWF0Y2guQ0FUX0NBVEVHT1JZKSB7XHJcbiAgICAgIHJlc1tvV29yZC5tYXRjaGVkU3RyaW5nXSA9IHJlc1tvV29yZC5tYXRjaGVkU3RyaW5nXSB8fCBbXTtcclxuICAgICAgcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddLnB1c2goeyBwb3M6IGlJbmRleCB9KTtcclxuICAgIH1cclxuICB9KTtcclxuICB1dGlscy5kZWVwRnJlZXplKHJlcyk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlaW5Gb3JjZVNlbnRlbmNlKG9TZW50ZW5jZSkge1xyXG4gIFwidXNlIHN0cmljdFwiO1xyXG4gIHZhciBvQ2F0ZWdvcnlNYXAgPSBleHRyYWN0Q2F0ZWdvcnlNYXAob1NlbnRlbmNlKTtcclxuICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGlJbmRleCkge1xyXG4gICAgdmFyIG0gPSBvQ2F0ZWdvcnlNYXBbb1dvcmQuY2F0ZWdvcnldIHx8IFtdO1xyXG4gICAgbS5mb3JFYWNoKGZ1bmN0aW9uIChvUG9zaXRpb246IHsgcG9zOiBudW1iZXIgfSkge1xyXG4gICAgICBcInVzZSBzdHJpY3RcIjtcclxuICAgICAgb1dvcmQucmVpbmZvcmNlID0gb1dvcmQucmVpbmZvcmNlIHx8IDE7XHJcbiAgICAgIHZhciBib29zdCA9IHJlaW5mb3JjZURpc3RXZWlnaHQoaUluZGV4IC0gb1Bvc2l0aW9uLnBvcywgb1dvcmQuY2F0ZWdvcnkpO1xyXG4gICAgICBvV29yZC5yZWluZm9yY2UgKj0gYm9vc3Q7XHJcbiAgICAgIG9Xb3JkLl9yYW5raW5nICo9IGJvb3N0O1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcbiAgcmV0dXJuIG9TZW50ZW5jZTtcclxufVxyXG5cclxuXHJcbmltcG9ydCAqIGFzIFNlbnRlbmNlIGZyb20gJy4vc2VudGVuY2UnO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlaW5Gb3JjZShhQ2F0ZWdvcml6ZWRBcnJheSkge1xyXG4gIFwidXNlIHN0cmljdFwiO1xyXG4gIGFDYXRlZ29yaXplZEFycmF5LmZvckVhY2goZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xyXG4gICAgcmVpbkZvcmNlU2VudGVuY2Uob1NlbnRlbmNlKTtcclxuICB9KVxyXG4gIGFDYXRlZ29yaXplZEFycmF5LnNvcnQoU2VudGVuY2UuY21wUmFua2luZ1Byb2R1Y3QpO1xyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nKFwiYWZ0ZXIgcmVpbmZvcmNlXCIgKyBhQ2F0ZWdvcml6ZWRBcnJheS5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xyXG4gICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcclxuICAgIH0pLmpvaW4oXCJcXG5cIikpO1xyXG4gIH1cclxuICByZXR1cm4gYUNhdGVnb3JpemVkQXJyYXk7XHJcbn1cclxuXHJcblxyXG4vLy8gYmVsb3cgbWF5IG5vIGxvbmdlciBiZSB1c2VkXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hSZWdFeHAob1J1bGU6IElSdWxlLCBjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQsIG9wdGlvbnM/OiBJTWF0Y2hPcHRpb25zKSB7XHJcbiAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICB2YXIgc0tleSA9IG9SdWxlLmtleTtcclxuICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKVxyXG4gIHZhciByZWcgPSBvUnVsZS5yZWdleHA7XHJcblxyXG4gIHZhciBtID0gcmVnLmV4ZWMoczEpO1xyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nKFwiYXBwbHlpbmcgcmVnZXhwOiBcIiArIHMxICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XHJcbiAgfVxyXG4gIGlmICghbSkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICB9XHJcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cclxuICB2YXIgZGVsdGEgPSBjb21wYXJlQ29udGV4dChjb250ZXh0LCBvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpXHJcbiAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlbHRhKSk7XHJcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XHJcbiAgfVxyXG4gIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gIH1cclxuICB2YXIgb0V4dHJhY3RlZENvbnRleHQgPSBleHRyYWN0QXJnc01hcChtLCBvUnVsZS5hcmdzTWFwKTtcclxuICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgZGVidWdsb2coXCJleHRyYWN0ZWQgYXJncyBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLmFyZ3NNYXApKTtcclxuICAgIGRlYnVnbG9nKFwibWF0Y2ggXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XHJcbiAgICBkZWJ1Z2xvZyhcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob0V4dHJhY3RlZENvbnRleHQpKTtcclxuICB9XHJcbiAgdmFyIHJlcyA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpIGFzIGFueTtcclxuICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpO1xyXG4gIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcclxuICBpZiAob0V4dHJhY3RlZENvbnRleHRbc0tleV0gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgcmVzW3NLZXldID0gb0V4dHJhY3RlZENvbnRleHRbc0tleV07XHJcbiAgfVxyXG4gIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XHJcbiAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb1J1bGUuZm9sbG93cyk7XHJcbiAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpXHJcbiAgfVxyXG4gIE9iamVjdC5mcmVlemUocmVzKTtcclxuICBkZWJ1Z2xvZygnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNvcnRCeVdlaWdodChzS2V5OiBzdHJpbmcsIG9Db250ZXh0QTogSUZNYXRjaC5jb250ZXh0LCBvQ29udGV4dEI6IElGTWF0Y2guY29udGV4dCk6IG51bWJlciB7XHJcbiAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nKCdzb3J0aW5nOiAnICsgc0tleSArICdpbnZva2VkIHdpdGhcXG4gMTonICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHRBLCB1bmRlZmluZWQsIDIpICtcclxuICAgIFwiIHZzIFxcbiAyOlwiICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHRCLCB1bmRlZmluZWQsIDIpKTtcclxuICB9XHJcbiAgdmFyIHJhbmtpbmdBOiBudW1iZXIgPSBwYXJzZUZsb2F0KG9Db250ZXh0QVtcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcclxuICB2YXIgcmFua2luZ0I6IG51bWJlciA9IHBhcnNlRmxvYXQob0NvbnRleHRCW1wiX3JhbmtpbmdcIl0gfHwgXCIxXCIpO1xyXG4gIGlmIChyYW5raW5nQSAhPT0gcmFua2luZ0IpIHtcclxuICAgIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgICAgZGVidWdsb2coXCIgcmFua2luIGRlbHRhXCIgKyAxMDAgKiAocmFua2luZ0IgLSByYW5raW5nQSkpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIDEwMCAqIChyYW5raW5nQiAtIHJhbmtpbmdBKVxyXG4gIH1cclxuXHJcbiAgdmFyIHdlaWdodEEgPSBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QVtcIl93ZWlnaHRcIl1bc0tleV0gfHwgMDtcclxuICB2YXIgd2VpZ2h0QiA9IG9Db250ZXh0QltcIl93ZWlnaHRcIl0gJiYgb0NvbnRleHRCW1wiX3dlaWdodFwiXVtzS2V5XSB8fCAwO1xyXG4gIHJldHVybiArKHdlaWdodEEgLSB3ZWlnaHRCKTtcclxufVxyXG5cclxuXHJcbi8vIFdvcmQsIFN5bm9ueW0sIFJlZ2V4cCAvIEV4dHJhY3Rpb25SdWxlXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXVnbWVudENvbnRleHQxKGNvbnRleHQ6IElGTWF0Y2guY29udGV4dCwgb1J1bGVzOiBBcnJheTxJUnVsZT4sIG9wdGlvbnM6IElNYXRjaE9wdGlvbnMpOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICB2YXIgc0tleSA9IG9SdWxlc1swXS5rZXk7XHJcbiAgLy8gY2hlY2sgdGhhdCBydWxlXHJcbiAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIC8vIGNoZWNrIGNvbnNpc3RlbmN5XHJcbiAgICBvUnVsZXMuZXZlcnkoZnVuY3Rpb24gKGlSdWxlKSB7XHJcbiAgICAgIGlmIChpUnVsZS5rZXkgIT09IHNLZXkpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbmhvbW9nZW5vdXMga2V5cyBpbiBydWxlcywgZXhwZWN0ZWQgXCIgKyBzS2V5ICsgXCIgd2FzIFwiICsgSlNPTi5zdHJpbmdpZnkoaVJ1bGUpKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLy8gbG9vayBmb3IgcnVsZXMgd2hpY2ggbWF0Y2hcclxuICB2YXIgcmVzID0gb1J1bGVzLm1hcChmdW5jdGlvbiAob1J1bGUpIHtcclxuICAgIC8vIGlzIHRoaXMgcnVsZSBhcHBsaWNhYmxlXHJcbiAgICBzd2l0Y2ggKG9SdWxlLnR5cGUpIHtcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5XT1JEOlxyXG4gICAgICAgIHJldHVybiBtYXRjaFdvcmQob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpXHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuUkVHRVhQOlxyXG4gICAgICAgIHJldHVybiBtYXRjaFJlZ0V4cChvUnVsZSwgY29udGV4dCwgb3B0aW9ucyk7XHJcbiAgICAgIC8vICAgY2FzZSBcIkV4dHJhY3Rpb25cIjpcclxuICAgICAgLy8gICAgIHJldHVybiBtYXRjaEV4dHJhY3Rpb24ob1J1bGUsY29udGV4dCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkXHJcbiAgfSkuZmlsdGVyKGZ1bmN0aW9uIChvcmVzKSB7XHJcbiAgICByZXR1cm4gISFvcmVzXHJcbiAgfSkuc29ydChcclxuICAgIHNvcnRCeVdlaWdodC5iaW5kKHRoaXMsIHNLZXkpXHJcbiAgICApO1xyXG4gIHJldHVybiByZXM7XHJcbiAgLy8gT2JqZWN0LmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XHJcbiAgLy8gfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhdWdtZW50Q29udGV4dChjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQsIGFSdWxlczogQXJyYXk8SVJ1bGU+KTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcblxyXG4gIHZhciBvcHRpb25zMTogSU1hdGNoT3B0aW9ucyA9IHtcclxuICAgIG1hdGNob3RoZXJzOiB0cnVlLFxyXG4gICAgb3ZlcnJpZGU6IGZhbHNlXHJcbiAgfSBhcyBJTWF0Y2hPcHRpb25zO1xyXG5cclxuICB2YXIgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMxKVxyXG5cclxuICBpZiAoYVJlcy5sZW5ndGggPT09IDApIHtcclxuICAgIHZhciBvcHRpb25zMjogSU1hdGNoT3B0aW9ucyA9IHtcclxuICAgICAgbWF0Y2hvdGhlcnM6IGZhbHNlLFxyXG4gICAgICBvdmVycmlkZTogdHJ1ZVxyXG4gICAgfSBhcyBJTWF0Y2hPcHRpb25zO1xyXG4gICAgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMyKTtcclxuICB9XHJcbiAgcmV0dXJuIGFSZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBpbnNlcnRPcmRlcmVkKHJlc3VsdDogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiwgaUluc2VydGVkTWVtYmVyOiBJRk1hdGNoLmNvbnRleHQsIGxpbWl0OiBudW1iZXIpOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICAvLyBUT0RPOiB1c2Ugc29tZSB3ZWlnaHRcclxuICBpZiAocmVzdWx0Lmxlbmd0aCA8IGxpbWl0KSB7XHJcbiAgICByZXN1bHQucHVzaChpSW5zZXJ0ZWRNZW1iZXIpXHJcbiAgfVxyXG4gIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdGFrZVRvcE4oYXJyOiBBcnJheTxBcnJheTxJRk1hdGNoLmNvbnRleHQ+Pik6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIHZhciB1ID0gYXJyLmZpbHRlcihmdW5jdGlvbiAoaW5uZXJBcnIpIHsgcmV0dXJuIGlubmVyQXJyLmxlbmd0aCA+IDAgfSlcclxuXHJcbiAgdmFyIHJlcyA9IFtdO1xyXG4gIC8vIHNoaWZ0IG91dCB0aGUgdG9wIG9uZXNcclxuICB1ID0gdS5tYXAoZnVuY3Rpb24gKGlBcnIpIHtcclxuICAgIHZhciB0b3AgPSBpQXJyLnNoaWZ0KCk7XHJcbiAgICByZXMgPSBpbnNlcnRPcmRlcmVkKHJlcywgdG9wLCA1KVxyXG4gICAgcmV0dXJuIGlBcnJcclxuICB9KS5maWx0ZXIoZnVuY3Rpb24gKGlubmVyQXJyOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+KTogYm9vbGVhbiB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwIH0pO1xyXG4gIC8vIGFzIEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuaW1wb3J0ICogYXMgaW5wdXRGaWx0ZXJSdWxlcyBmcm9tICcuL2lucHV0RmlsdGVyUnVsZXMnO1xyXG5cclxudmFyIHJtO1xyXG5cclxuZnVuY3Rpb24gZ2V0Uk1PbmNlKCkge1xyXG4gIGlmICghcm0pIHtcclxuICAgIHJtID0gaW5wdXRGaWx0ZXJSdWxlcy5nZXRSdWxlTWFwKClcclxuICB9XHJcbiAgcmV0dXJuIHJtO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlSdWxlcyhjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQpOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICB2YXIgYmVzdE46IEFycmF5PElGTWF0Y2guY29udGV4dD4gPSBbY29udGV4dF07XHJcbiAgaW5wdXRGaWx0ZXJSdWxlcy5vS2V5T3JkZXIuZm9yRWFjaChmdW5jdGlvbiAoc0tleTogc3RyaW5nKSB7XHJcbiAgICB2YXIgYmVzdE5leHQ6IEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+ID0gW107XHJcbiAgICBiZXN0Ti5mb3JFYWNoKGZ1bmN0aW9uIChvQ29udGV4dDogSUZNYXRjaC5jb250ZXh0KSB7XHJcbiAgICAgIGlmIChvQ29udGV4dFtzS2V5XSkge1xyXG4gICAgICAgIGRlYnVnbG9nKCcqKiBhcHBseWluZyBydWxlcyBmb3IgJyArIHNLZXkpXHJcbiAgICAgICAgdmFyIHJlcyA9IGF1Z21lbnRDb250ZXh0KG9Db250ZXh0LCBnZXRSTU9uY2UoKVtzS2V5XSB8fCBbXSlcclxuICAgICAgICBkZWJ1Z2xvZygnKiogcmVzdWx0IGZvciAnICsgc0tleSArICcgPSAnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKVxyXG4gICAgICAgIGJlc3ROZXh0LnB1c2gocmVzIHx8IFtdKVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIHJ1bGUgbm90IHJlbGV2YW50XHJcbiAgICAgICAgYmVzdE5leHQucHVzaChbb0NvbnRleHRdKTtcclxuICAgICAgfVxyXG4gICAgfSlcclxuICAgIGJlc3ROID0gdGFrZVRvcE4oYmVzdE5leHQpO1xyXG4gIH0pO1xyXG4gIHJldHVybiBiZXN0TlxyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UnVsZXNQaWNrRmlyc3QoY29udGV4dDogSUZNYXRjaC5jb250ZXh0KTogSUZNYXRjaC5jb250ZXh0IHtcclxuICB2YXIgciA9IGFwcGx5UnVsZXMoY29udGV4dCk7XHJcbiAgcmV0dXJuIHIgJiYgclswXTtcclxufVxyXG5cclxuLyoqXHJcbiAqIERlY2lkZSB3aGV0aGVyIHRvIHJlcXVlcnkgZm9yIGEgY29udGV0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZGVjaWRlT25SZVF1ZXJ5KGNvbnRleHQ6IElGTWF0Y2guY29udGV4dCk6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIHJldHVybiBbXVxyXG59XHJcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
