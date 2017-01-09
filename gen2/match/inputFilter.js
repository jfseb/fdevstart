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
// <reference path="../../lib/node-4.d.ts" />

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
var debuglogV = debug('inputVFilter');
var debuglogM = debug('inputMFilter');
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
    if (sText1.length - sText2.length > Algol.calcDist.lengthDelta1 || sText2.length > 1.5 * sText1.length || sText2.length < sText1.length / 2) {
        return 50000;
    }
    var a0 = distance.levenshtein(sText1.substring(0, sText2.length), sText2);
    if (debuglogV.enabled) {
        debuglogV("distance" + a0 + "stripped>" + sText1.substring(0, sText2.length) + "<>" + sText2 + "<");
    }
    if (a0 * 50 > 15 * sText2.length) {
        return 40000;
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
function checkOneRule(string, lcString, exact, res, oRule, cntRec) {
    if (debuglogV.enabled) {
        debuglogV('attempting to match rule ' + JSON.stringify(oRule) + " to string \"" + string + "\"");
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
                addCntRec(cntRec, "calcDistance", 1);
                if (levenmatch < 50000) {
                    addCntRec(cntRec, "calcDistanceExp", 1);
                }
                if (levenmatch < 40000) {
                    addCntRec(cntRec, "calcDistanceBelow40k", 1);
                }
                if (levenmatch < levenCutoff) {
                    addCntRec(cntRec, "calcDistanceOk", 1);
                    res.push({
                        string: string,
                        matchedString: oRule.matchedString,
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
}
exports.checkOneRule = checkOneRule;
;
function addCntRec(cntRec, member, number) {
    if (!cntRec || number === 0) {
        return;
    }
    cntRec[member] = (cntRec[member] || 0) + number;
}
function categorizeString(string, exact, oRules, cntRec) {
    // simply apply all rules
    if (debuglogM.enabled) {
        debuglogM("rules : " + JSON.stringify(oRules, undefined, 2));
    }
    var lcString = string.toLowerCase();
    var res = [];
    oRules.forEach(function (oRule) {
        checkOneRule(string, lcString, exact, res, oRule, cntRec);
    });
    res.sort(sortByRank);
    return res;
}
exports.categorizeString = categorizeString;
function categorizeString2(string, exact, rules, cntRec) {
    // simply apply all rules
    if (debuglogM.enabled) {
        debuglogM("rules : " + JSON.stringify(rules, undefined, 2));
    }
    var lcString = string.toLowerCase();
    var res = [];
    if (exact) {
        var r = rules.wordMap[lcString];
        if (r) {
            r.forEach(function (oRule) {
                res.push({
                    string: string,
                    matchedString: oRule.matchedString,
                    category: oRule.category,
                    _ranking: oRule._ranking || 1.0
                });
            });
        }
        rules.nonWordRules.forEach(function (oRule) {
            checkOneRule(string, lcString, exact, res, oRule, cntRec);
        });
    } else {
        debuglog("categorize non exact" + string + " xx  " + rules.allRules.length);
        return categorizeString(string, exact, rules.allRules, cntRec);
    }
    res.sort(sortByRank);
    return res;
}
exports.categorizeString2 = categorizeString2;
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
function categorizeWordWithRankCutoff(sWordGroup, splitRules, cntRec) {
    var seenIt = categorizeString2(sWordGroup, true, splitRules, cntRec);
    //totalCnt += 1;
    // exactLen += seenIt.length;
    addCntRec(cntRec, 'cntCatExact', 1);
    addCntRec(cntRec, 'cntCatExactRes', seenIt.length);
    if (exports.RankWord.hasAbove(seenIt, 0.8)) {
        if (cntRec) {
            addCntRec(cntRec, 'exactPriorTake', seenIt.length);
        }
        seenIt = exports.RankWord.takeAbove(seenIt, 0.8);
        if (cntRec) {
            addCntRec(cntRec, 'exactAfterTake', seenIt.length);
        }
    } else {
        seenIt = categorizeString2(sWordGroup, false, splitRules, cntRec);
        addCntRec(cntRec, 'cntNonExact', 1);
        addCntRec(cntRec, 'cntNonExactRes', seenIt.length);
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
function categorizeAWord(sWordGroup, rules, sString, words, cntRec) {
    var seenIt = words[sWordGroup];
    if (seenIt === undefined) {
        seenIt = categorizeWordWithRankCutoff(sWordGroup, rules, cntRec);
        utils.deepFreeze(seenIt);
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
function analyzeString(sString, rules, words) {
    var cnt = 0;
    var fac = 1;
    var u = breakdown.breakdownString(sString, Algol.MaxSpacesPerCombinedWord);
    if (debuglog.enabled) {
        debuglog("here breakdown" + JSON.stringify(u));
    }
    //console.log(JSON.stringify(u));
    words = words || {};
    debugperf('this many known words: ' + Object.keys(words).length);
    var res = [];
    var cntRec = {};
    u.forEach(function (aBreakDownSentence) {
        var categorizedSentence = [];
        var isValid = aBreakDownSentence.every(function (sWordGroup, index) {
            var seenIt = categorizeAWord(sWordGroup, rules, sString, words, cntRec);
            if (seenIt.length === 0) {
                return false;
            }
            categorizedSentence[index] = seenIt;
            cnt = cnt + seenIt.length;
            fac = fac * seenIt.length;
            return true;
        });
        if (isValid) {
            res.push(categorizedSentence);
        }
    });
    debuglog(" sentences " + u.length + " matches " + cnt + " fac: " + fac);
    if (debuglog.enabled && u.length) {
        debuglog("first match " + JSON.stringify(u, undefined, 2));
    }
    debugperf(" sentences " + u.length + " / " + res.length + " matches " + cnt + " fac: " + fac + " rec : " + JSON.stringify(cntRec, undefined, 2));
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
function copyVecMembers(u) {
    var i = 0;
    for (i = 0; i < u.length; ++i) {
        u[i] = clone(u[i]);
    }
    return u;
}
// we can replicate the tail or the head,
// we replicate the tail as it is smaller.
// [a,b,c ]
function expandMatchArr(deep) {
    var a = [];
    var line = [];
    debuglog(debuglog.enabled ? JSON.stringify(deep) : '-');
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
                    nvecs[u] = copyVecMembers(nvecs[u]);
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
        debuglogV(debuglogV.enabled ? "APPENDING TO RES" + i + ":" + l + " >" + JSON.stringify(nextBase) : '-');
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
    oSentence.forEach(function (oWord, iIndex) {
        if (iIndex > 0) {
            if (oSentence[iIndex - 1].category === "meta" && oWord.category === oSentence[iIndex - 1].matchedString) {
                oWord.reinforce = oWord.reinforce || 1;
                var boost = reinforceDistWeight(1, oWord.category);
                oWord.reinforce *= boost;
                oWord._ranking *= boost;
            }
        }
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
    if (debuglogV.enabled) {
        debuglogV("applying regexp: " + s1 + " " + JSON.stringify(m));
    }
    if (!m) {
        return undefined;
    }
    options = options || {};
    var delta = compareContext(context, oRule.follows, oRule.key);
    if (debuglogV.enabled) {
        debuglogV(JSON.stringify(delta));
        debuglogV(JSON.stringify(options));
    }
    if (options.matchothers && delta.different > 0) {
        return undefined;
    }
    var oExtractedContext = extractArgsMap(m, oRule.argsMap);
    if (debuglogV.enabled) {
        debuglogV("extracted args " + JSON.stringify(oRule.argsMap));
        debuglogV("match " + JSON.stringify(m));
        debuglogV("extracted args " + JSON.stringify(oExtractedContext));
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
        debuglogV('sorting: ' + sKey + 'invoked with\n 1:' + JSON.stringify(oContextA, undefined, 2) + " vs \n 2:" + JSON.stringify(oContextB, undefined, 2));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1hdGNoL2lucHV0RmlsdGVyLmpzIiwiLi4vc3JjL21hdGNoL2lucHV0RmlsdGVyLnRzIl0sIm5hbWVzIjpbImRpc3RhbmNlIiwicmVxdWlyZSIsIkxvZ2dlciIsImxvZ2dlciIsImRlYnVnIiwiZGVidWdwZXJmIiwidXRpbHMiLCJBbGdvbCIsImJyZWFrZG93biIsIkFueU9iamVjdCIsIk9iamVjdCIsImRlYnVnbG9nIiwiZGVidWdsb2dWIiwiZGVidWdsb2dNIiwibWF0Y2hkYXRhIiwib1VuaXRUZXN0cyIsImNhbGNEaXN0YW5jZSIsInNUZXh0MSIsInNUZXh0MiIsImxlbmd0aCIsImNhbGNEaXN0IiwibGVuZ3RoRGVsdGExIiwiYTAiLCJsZXZlbnNodGVpbiIsInN1YnN0cmluZyIsImVuYWJsZWQiLCJhIiwiSUZNYXRjaCIsImxldmVuQ3V0b2ZmIiwiQ3V0b2ZmX0xldmVuU2h0ZWluIiwibGV2ZW5QZW5hbHR5IiwiaSIsImV4cG9ydHMiLCJub25Qcml2YXRlS2V5cyIsIm9BIiwia2V5cyIsImZpbHRlciIsImtleSIsImNvdW50QWluQiIsIm9CIiwiZm5Db21wYXJlIiwiYUtleUlnbm9yZSIsIkFycmF5IiwiaXNBcnJheSIsImluZGV4T2YiLCJyZWR1Y2UiLCJwcmV2IiwicHJvdG90eXBlIiwiaGFzT3duUHJvcGVydHkiLCJjYWxsIiwic3B1cmlvdXNBbm90SW5CIiwibG93ZXJDYXNlIiwibyIsInRvTG93ZXJDYXNlIiwiY29tcGFyZUNvbnRleHQiLCJlcXVhbCIsImIiLCJkaWZmZXJlbnQiLCJzcHVyaW91c0wiLCJzcHVyaW91c1IiLCJzb3J0QnlSYW5rIiwiciIsIl9yYW5raW5nIiwiY2F0ZWdvcnkiLCJsb2NhbGVDb21wYXJlIiwibWF0Y2hlZFN0cmluZyIsImNoZWNrT25lUnVsZSIsInN0cmluZyIsImxjU3RyaW5nIiwiZXhhY3QiLCJyZXMiLCJvUnVsZSIsImNudFJlYyIsIkpTT04iLCJzdHJpbmdpZnkiLCJ0eXBlIiwibG93ZXJjYXNld29yZCIsIkVycm9yIiwidW5kZWZpbmVkIiwid29yZCIsInB1c2giLCJleGFjdE9ubHkiLCJsZXZlbm1hdGNoIiwiYWRkQ250UmVjIiwibSIsInJlZ2V4cCIsImV4ZWMiLCJtYXRjaEluZGV4IiwibWVtYmVyIiwibnVtYmVyIiwiY2F0ZWdvcml6ZVN0cmluZyIsIm9SdWxlcyIsImZvckVhY2giLCJzb3J0IiwiY2F0ZWdvcml6ZVN0cmluZzIiLCJydWxlcyIsIndvcmRNYXAiLCJub25Xb3JkUnVsZXMiLCJhbGxSdWxlcyIsIm1hdGNoV29yZCIsImNvbnRleHQiLCJvcHRpb25zIiwiczEiLCJzMiIsImRlbHRhIiwiZm9sbG93cyIsIm1hdGNob3RoZXJzIiwiYyIsImFzc2lnbiIsIm92ZXJyaWRlIiwiX3dlaWdodCIsImZyZWV6ZSIsImV4dHJhY3RBcmdzTWFwIiwibWF0Y2giLCJhcmdzTWFwIiwiaUtleSIsInZhbHVlIiwiUmFua1dvcmQiLCJoYXNBYm92ZSIsImxzdCIsImJvcmRlciIsImV2ZXJ5Iiwib01lbWJlciIsInRha2VGaXJzdE4iLCJuIiwiaUluZGV4IiwibGFzdFJhbmtpbmciLCJ0YWtlQWJvdmUiLCJjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmIiwic1dvcmRHcm91cCIsInNwbGl0UnVsZXMiLCJzZWVuSXQiLCJUb3BfTl9Xb3JkQ2F0ZWdvcml6YXRpb25zIiwiZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkU2VudGVuY2UiLCJvU2VudGVuY2UiLCJvV29yZEdyb3VwIiwiZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkIiwiYXJyIiwiY2F0ZWdvcml6ZUFXb3JkIiwic1N0cmluZyIsIndvcmRzIiwiZGVlcEZyZWV6ZSIsImNsb25lRGVlcCIsImFuYWx5emVTdHJpbmciLCJjbnQiLCJmYWMiLCJ1IiwiYnJlYWtkb3duU3RyaW5nIiwiTWF4U3BhY2VzUGVyQ29tYmluZWRXb3JkIiwiYUJyZWFrRG93blNlbnRlbmNlIiwiY2F0ZWdvcml6ZWRTZW50ZW5jZSIsImlzVmFsaWQiLCJpbmRleCIsImNsb25lIiwiY29weVZlY01lbWJlcnMiLCJleHBhbmRNYXRjaEFyciIsImRlZXAiLCJsaW5lIiwidUJyZWFrRG93bkxpbmUiLCJhV29yZEdyb3VwIiwid2dJbmRleCIsIm9Xb3JkVmFyaWFudCIsImlXVkluZGV4IiwibnZlY3MiLCJ2ZWNzIiwicnZlYyIsImsiLCJuZXh0QmFzZSIsImwiLCJzbGljZSIsImNvbmNhdCIsInJlaW5mb3JjZURpc3RXZWlnaHQiLCJkaXN0IiwiYWJzIiwiTWF0aCIsImFSZWluZm9yY2VEaXN0V2VpZ2h0IiwiZXh0cmFjdENhdGVnb3J5TWFwIiwib1dvcmQiLCJDQVRfQ0FURUdPUlkiLCJwb3MiLCJyZWluRm9yY2VTZW50ZW5jZSIsIm9DYXRlZ29yeU1hcCIsIm9Qb3NpdGlvbiIsInJlaW5mb3JjZSIsImJvb3N0IiwiU2VudGVuY2UiLCJyZWluRm9yY2UiLCJhQ2F0ZWdvcml6ZWRBcnJheSIsImNtcFJhbmtpbmdQcm9kdWN0IiwibWFwIiwicmFua2luZ1Byb2R1Y3QiLCJqb2luIiwibWF0Y2hSZWdFeHAiLCJzS2V5IiwicmVnIiwib0V4dHJhY3RlZENvbnRleHQiLCJzb3J0QnlXZWlnaHQiLCJvQ29udGV4dEEiLCJvQ29udGV4dEIiLCJyYW5raW5nQSIsInBhcnNlRmxvYXQiLCJyYW5raW5nQiIsIndlaWdodEEiLCJ3ZWlnaHRCIiwiYXVnbWVudENvbnRleHQxIiwiaVJ1bGUiLCJvcmVzIiwiYmluZCIsImF1Z21lbnRDb250ZXh0IiwiYVJ1bGVzIiwib3B0aW9uczEiLCJhUmVzIiwib3B0aW9uczIiLCJpbnNlcnRPcmRlcmVkIiwicmVzdWx0IiwiaUluc2VydGVkTWVtYmVyIiwibGltaXQiLCJ0YWtlVG9wTiIsImlubmVyQXJyIiwiaUFyciIsInRvcCIsInNoaWZ0IiwiaW5wdXRGaWx0ZXJSdWxlcyIsInJtIiwiZ2V0Uk1PbmNlIiwiZ2V0UnVsZU1hcCIsImFwcGx5UnVsZXMiLCJiZXN0TiIsIm9LZXlPcmRlciIsImJlc3ROZXh0Iiwib0NvbnRleHQiLCJhcHBseVJ1bGVzUGlja0ZpcnN0IiwiZGVjaWRlT25SZVF1ZXJ5Il0sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOzs7Ozs7Ozs7Ozs7Ozs7O0FBZ0JBOztBQUNBLElBQVlBLFdBQVFDLFFBQU0sNkJBQU4sQ0FBcEI7QUFFQSxJQUFZQyxTQUFNRCxRQUFNLGlCQUFOLENBQWxCO0FBRUEsSUFBTUUsU0FBU0QsT0FBT0MsTUFBUCxDQUFjLGFBQWQsQ0FBZjtBQUVBLElBQVlDLFFBQUtILFFBQU0sT0FBTixDQUFqQjtBQUNBLElBQUlJLFlBQVlELE1BQU0sTUFBTixDQUFoQjtBQUVBLElBQVlFLFFBQUtMLFFBQU0sZ0JBQU4sQ0FBakI7QUFHQSxJQUFZTSxRQUFLTixRQUFNLFNBQU4sQ0FBakI7QUFJQSxJQUFZTyxZQUFTUCxRQUFNLGFBQU4sQ0FBckI7QUFFQSxJQUFNUSxZQUFpQkMsTUFBdkI7QUFFQSxJQUFNQyxXQUFXUCxNQUFNLGFBQU4sQ0FBakI7QUFDQSxJQUFNUSxZQUFZUixNQUFNLGNBQU4sQ0FBbEI7QUFDQSxJQUFNUyxZQUFZVCxNQUFNLGNBQU4sQ0FBbEI7QUFJQSxJQUFZVSxZQUFTYixRQUFNLGFBQU4sQ0FBckI7QUFDQSxJQUFJYyxhQUFhRCxVQUFVQyxVQUEzQjtBQUVBOzs7Ozs7QUFNQSxTQUFBQyxZQUFBLENBQXNCQyxNQUF0QixFQUFzQ0MsTUFBdEMsRUFBb0Q7QUFDbEQ7QUFDQyxRQUFLRCxPQUFPRSxNQUFQLEdBQWdCRCxPQUFPQyxNQUF4QixHQUFrQ1osTUFBTWEsUUFBTixDQUFlQyxZQUFsRCxJQUNFSCxPQUFPQyxNQUFQLEdBQWdCLE1BQU1GLE9BQU9FLE1BRC9CLElBRUVELE9BQU9DLE1BQVAsR0FBaUJGLE9BQU9FLE1BQVAsR0FBYyxDQUZwQyxFQUUwQztBQUN6QyxlQUFPLEtBQVA7QUFDRDtBQUNELFFBQUlHLEtBQUt0QixTQUFTdUIsV0FBVCxDQUFxQk4sT0FBT08sU0FBUCxDQUFpQixDQUFqQixFQUFvQk4sT0FBT0MsTUFBM0IsQ0FBckIsRUFBeURELE1BQXpELENBQVQ7QUFDQSxRQUFHTixVQUFVYSxPQUFiLEVBQXNCO0FBQ3BCYixrQkFBVSxhQUFhVSxFQUFiLEdBQWtCLFdBQWxCLEdBQWdDTCxPQUFPTyxTQUFQLENBQWlCLENBQWpCLEVBQW1CTixPQUFPQyxNQUExQixDQUFoQyxHQUFvRSxJQUFwRSxHQUEyRUQsTUFBM0UsR0FBbUYsR0FBN0Y7QUFDRDtBQUNELFFBQUdJLEtBQUssRUFBTCxHQUFVLEtBQUtKLE9BQU9DLE1BQXpCLEVBQWlDO0FBQzdCLGVBQU8sS0FBUDtBQUNIO0FBQ0QsUUFBSU8sSUFBSTFCLFNBQVN1QixXQUFULENBQXFCTixNQUFyQixFQUE2QkMsTUFBN0IsQ0FBUjtBQUNBLFdBQU9JLEtBQUssR0FBTCxHQUFXSixPQUFPQyxNQUFsQixHQUEyQk8sQ0FBbEM7QUFDRDtBQUVELElBQVlDLFVBQU8xQixRQUFNLGtCQUFOLENBQW5CO0FBb0JBLElBQU0yQixjQUFjckIsTUFBTXNCLGtCQUExQjtBQUVBLFNBQUFDLFlBQUEsQ0FBNkJDLENBQTdCLEVBQXNDO0FBQ3BDO0FBQ0E7QUFDQTtBQUNBLFFBQUlBLE1BQU0sQ0FBVixFQUFhO0FBQ1gsZUFBTyxDQUFQO0FBQ0Q7QUFDRDtBQUNBLFdBQU8sSUFBSUEsS0FBSyxNQUFNLENBQVgsSUFBZ0IsR0FBM0I7QUFDRDtBQVRlQyxRQUFBRixZQUFBLEdBQVlBLFlBQVo7QUFXaEIsU0FBQUcsY0FBQSxDQUF3QkMsRUFBeEIsRUFBMEI7QUFDeEIsV0FBT3hCLE9BQU95QixJQUFQLENBQVlELEVBQVosRUFBZ0JFLE1BQWhCLENBQXVCLFVBQUFDLEdBQUEsRUFBRztBQUMvQixlQUFPQSxJQUFJLENBQUosTUFBVyxHQUFsQjtBQUNELEtBRk0sQ0FBUDtBQUdEO0FBRUQsU0FBQUMsU0FBQSxDQUEwQkosRUFBMUIsRUFBOEJLLEVBQTlCLEVBQWtDQyxTQUFsQyxFQUE2Q0MsVUFBN0MsRUFBd0Q7QUFDdERBLGlCQUFhQyxNQUFNQyxPQUFOLENBQWNGLFVBQWQsSUFBNEJBLFVBQTVCLEdBQ1gsT0FBT0EsVUFBUCxLQUFzQixRQUF0QixHQUFpQyxDQUFDQSxVQUFELENBQWpDLEdBQWdELEVBRGxEO0FBRUFELGdCQUFZQSxhQUFhLFlBQUE7QUFBYyxlQUFPLElBQVA7QUFBYyxLQUFyRDtBQUNBLFdBQU9QLGVBQWVDLEVBQWYsRUFBbUJFLE1BQW5CLENBQTBCLFVBQVVDLEdBQVYsRUFBYTtBQUM1QyxlQUFPSSxXQUFXRyxPQUFYLENBQW1CUCxHQUFuQixJQUEwQixDQUFqQztBQUNELEtBRk0sRUFHTFEsTUFISyxDQUdFLFVBQVVDLElBQVYsRUFBZ0JULEdBQWhCLEVBQW1CO0FBQ3hCLFlBQUkzQixPQUFPcUMsU0FBUCxDQUFpQkMsY0FBakIsQ0FBZ0NDLElBQWhDLENBQXFDVixFQUFyQyxFQUF5Q0YsR0FBekMsQ0FBSixFQUFtRDtBQUNqRFMsbUJBQU9BLFFBQVFOLFVBQVVOLEdBQUdHLEdBQUgsQ0FBVixFQUFtQkUsR0FBR0YsR0FBSCxDQUFuQixFQUE0QkEsR0FBNUIsSUFBbUMsQ0FBbkMsR0FBdUMsQ0FBL0MsQ0FBUDtBQUNEO0FBQ0QsZUFBT1MsSUFBUDtBQUNELEtBUkksRUFRRixDQVJFLENBQVA7QUFTRDtBQWJlZCxRQUFBTSxTQUFBLEdBQVNBLFNBQVQ7QUFlaEIsU0FBQVksZUFBQSxDQUFnQ2hCLEVBQWhDLEVBQW9DSyxFQUFwQyxFQUF3Q0UsVUFBeEMsRUFBbUQ7QUFDakRBLGlCQUFhQyxNQUFNQyxPQUFOLENBQWNGLFVBQWQsSUFBNEJBLFVBQTVCLEdBQ1gsT0FBT0EsVUFBUCxLQUFzQixRQUF0QixHQUFpQyxDQUFDQSxVQUFELENBQWpDLEdBQWdELEVBRGxEO0FBRUEsV0FBT1IsZUFBZUMsRUFBZixFQUFtQkUsTUFBbkIsQ0FBMEIsVUFBVUMsR0FBVixFQUFhO0FBQzVDLGVBQU9JLFdBQVdHLE9BQVgsQ0FBbUJQLEdBQW5CLElBQTBCLENBQWpDO0FBQ0QsS0FGTSxFQUdMUSxNQUhLLENBR0UsVUFBVUMsSUFBVixFQUFnQlQsR0FBaEIsRUFBbUI7QUFDeEIsWUFBSSxDQUFDM0IsT0FBT3FDLFNBQVAsQ0FBaUJDLGNBQWpCLENBQWdDQyxJQUFoQyxDQUFxQ1YsRUFBckMsRUFBeUNGLEdBQXpDLENBQUwsRUFBb0Q7QUFDbERTLG1CQUFPQSxPQUFPLENBQWQ7QUFDRDtBQUNELGVBQU9BLElBQVA7QUFDRCxLQVJJLEVBUUYsQ0FSRSxDQUFQO0FBU0Q7QUFaZWQsUUFBQWtCLGVBQUEsR0FBZUEsZUFBZjtBQWNoQixTQUFBQyxTQUFBLENBQW1CQyxDQUFuQixFQUFvQjtBQUNsQixRQUFJLE9BQU9BLENBQVAsS0FBYSxRQUFqQixFQUEyQjtBQUN6QixlQUFPQSxFQUFFQyxXQUFGLEVBQVA7QUFDRDtBQUNELFdBQU9ELENBQVA7QUFDRDtBQUVELFNBQUFFLGNBQUEsQ0FBK0JwQixFQUEvQixFQUFtQ0ssRUFBbkMsRUFBdUNFLFVBQXZDLEVBQWtEO0FBQ2hELFFBQUljLFFBQVFqQixVQUFVSixFQUFWLEVBQWNLLEVBQWQsRUFBa0IsVUFBVWIsQ0FBVixFQUFhOEIsQ0FBYixFQUFjO0FBQUksZUFBT0wsVUFBVXpCLENBQVYsTUFBaUJ5QixVQUFVSyxDQUFWLENBQXhCO0FBQXVDLEtBQTNFLEVBQTZFZixVQUE3RSxDQUFaO0FBQ0EsUUFBSWdCLFlBQVluQixVQUFVSixFQUFWLEVBQWNLLEVBQWQsRUFBa0IsVUFBVWIsQ0FBVixFQUFhOEIsQ0FBYixFQUFjO0FBQUksZUFBT0wsVUFBVXpCLENBQVYsTUFBaUJ5QixVQUFVSyxDQUFWLENBQXhCO0FBQXVDLEtBQTNFLEVBQTZFZixVQUE3RSxDQUFoQjtBQUNBLFFBQUlpQixZQUFZUixnQkFBZ0JoQixFQUFoQixFQUFvQkssRUFBcEIsRUFBd0JFLFVBQXhCLENBQWhCO0FBQ0EsUUFBSWtCLFlBQVlULGdCQUFnQlgsRUFBaEIsRUFBb0JMLEVBQXBCLEVBQXdCTyxVQUF4QixDQUFoQjtBQUNBLFdBQU87QUFDTGMsZUFBT0EsS0FERjtBQUVMRSxtQkFBV0EsU0FGTjtBQUdMQyxtQkFBV0EsU0FITjtBQUlMQyxtQkFBV0E7QUFKTixLQUFQO0FBTUQ7QUFYZTNCLFFBQUFzQixjQUFBLEdBQWNBLGNBQWQ7QUFhaEIsU0FBQU0sVUFBQSxDQUFvQmxDLENBQXBCLEVBQW1EOEIsQ0FBbkQsRUFBZ0Y7QUFDOUUsUUFBSUssSUFBSSxFQUFFLENBQUNuQyxFQUFFb0MsUUFBRixJQUFjLEdBQWYsS0FBdUJOLEVBQUVNLFFBQUYsSUFBYyxHQUFyQyxDQUFGLENBQVI7QUFDQSxRQUFJRCxDQUFKLEVBQU87QUFDTCxlQUFPQSxDQUFQO0FBQ0Q7QUFDRCxRQUFJbkMsRUFBRXFDLFFBQUYsSUFBY1AsRUFBRU8sUUFBcEIsRUFBOEI7QUFDNUJGLFlBQUluQyxFQUFFcUMsUUFBRixDQUFXQyxhQUFYLENBQXlCUixFQUFFTyxRQUEzQixDQUFKO0FBQ0EsWUFBSUYsQ0FBSixFQUFPO0FBQ0wsbUJBQU9BLENBQVA7QUFDRDtBQUNGO0FBQ0QsUUFBSW5DLEVBQUV1QyxhQUFGLElBQW1CVCxFQUFFUyxhQUF6QixFQUF3QztBQUN0Q0osWUFBSW5DLEVBQUV1QyxhQUFGLENBQWdCRCxhQUFoQixDQUE4QlIsRUFBRVMsYUFBaEMsQ0FBSjtBQUNBLFlBQUlKLENBQUosRUFBTztBQUNMLG1CQUFPQSxDQUFQO0FBQ0Q7QUFDRjtBQUNELFdBQU8sQ0FBUDtBQUNEO0FBR0QsU0FBQUssWUFBQSxDQUE2QkMsTUFBN0IsRUFBNkNDLFFBQTdDLEVBQWdFQyxLQUFoRSxFQUNBQyxHQURBLEVBRUFDLEtBRkEsRUFFc0JDLE1BRnRCLEVBRXVDO0FBQ3BDLFFBQUk1RCxVQUFVYSxPQUFkLEVBQXVCO0FBQ3BCYixrQkFBVSw4QkFBOEI2RCxLQUFLQyxTQUFMLENBQWVILEtBQWYsQ0FBOUIsR0FBc0QsZUFBdEQsR0FBd0VKLE1BQXhFLEdBQWlGLElBQTNGO0FBQ0Q7QUFDRCxZQUFRSSxNQUFNSSxJQUFkO0FBQ0UsYUFBSyxDQUFMLENBQUssVUFBTDtBQUNFLGdCQUFHLENBQUNKLE1BQU1LLGFBQVYsRUFBeUI7QUFDdkIsc0JBQU0sSUFBSUMsS0FBSixDQUFVLHFDQUFxQ0osS0FBS0MsU0FBTCxDQUFlSCxLQUFmLEVBQXNCTyxTQUF0QixFQUFpQyxDQUFqQyxDQUEvQyxDQUFOO0FBQ0E7QUFBQTtBQUNGLGdCQUFJVCxTQUFTRSxNQUFNUSxJQUFOLEtBQWVaLE1BQXhCLElBQWtDSSxNQUFNSyxhQUFOLEtBQXdCUixRQUE5RCxFQUF3RTtBQUN0RUUsb0JBQUlVLElBQUosQ0FBUztBQUNQYiw0QkFBUUEsTUFERDtBQUVQRixtQ0FBZU0sTUFBTU4sYUFGZDtBQUdQRiw4QkFBVVEsTUFBTVIsUUFIVDtBQUlQRCw4QkFBVVMsTUFBTVQsUUFBTixJQUFrQjtBQUpyQixpQkFBVDtBQU1EO0FBQ0QsZ0JBQUksQ0FBQ08sS0FBRCxJQUFVLENBQUNFLE1BQU1VLFNBQXJCLEVBQWdDO0FBQzlCLG9CQUFJQyxhQUFhbEUsYUFBYXVELE1BQU1LLGFBQW5CLEVBQWtDUixRQUFsQyxDQUFqQjtBQUVBZSwwQkFBVVgsTUFBVixFQUFpQixjQUFqQixFQUFpQyxDQUFqQztBQUNBLG9CQUFHVSxhQUFhLEtBQWhCLEVBQXVCO0FBQ3JCQyw4QkFBVVgsTUFBVixFQUFpQixpQkFBakIsRUFBb0MsQ0FBcEM7QUFDRDtBQUNELG9CQUFHVSxhQUFhLEtBQWhCLEVBQXVCO0FBQ3JCQyw4QkFBVVgsTUFBVixFQUFpQixzQkFBakIsRUFBeUMsQ0FBekM7QUFDRDtBQUNELG9CQUFJVSxhQUFhdEQsV0FBakIsRUFBOEI7QUFDNUJ1RCw4QkFBVVgsTUFBVixFQUFpQixnQkFBakIsRUFBbUMsQ0FBbkM7QUFDQUYsd0JBQUlVLElBQUosQ0FBUztBQUNQYixnQ0FBUUEsTUFERDtBQUVQRix1Q0FBZU0sTUFBTU4sYUFGZDtBQUdQRixrQ0FBVVEsTUFBTVIsUUFIVDtBQUlQRCxrQ0FBVSxDQUFDUyxNQUFNVCxRQUFOLElBQWtCLEdBQW5CLElBQTBCaEMsYUFBYW9ELFVBQWIsQ0FKN0I7QUFLUEEsb0NBQVlBO0FBTEwscUJBQVQ7QUFPRDtBQUNGO0FBQ0Q7QUFDRixhQUFLLENBQUwsQ0FBSyxZQUFMO0FBQWtDO0FBQ2hDLG9CQUFJdkUsU0FBU2MsT0FBYixFQUFzQjtBQUNwQmQsNkJBQVM4RCxLQUFLQyxTQUFMLENBQWUsaUJBQWlCRCxLQUFLQyxTQUFMLENBQWVILEtBQWYsRUFBc0JPLFNBQXRCLEVBQWlDLENBQWpDLENBQWhDLENBQVQ7QUFDRDtBQUNELG9CQUFJTSxJQUFJYixNQUFNYyxNQUFOLENBQWFDLElBQWIsQ0FBa0JuQixNQUFsQixDQUFSO0FBQ0Esb0JBQUlpQixDQUFKLEVBQU87QUFDTGQsd0JBQUlVLElBQUosQ0FBUztBQUNQYixnQ0FBUUEsTUFERDtBQUVQRix1Q0FBZ0JNLE1BQU1nQixVQUFOLEtBQXFCVCxTQUFyQixJQUFrQ00sRUFBRWIsTUFBTWdCLFVBQVIsQ0FBbkMsSUFBMkRwQixNQUZuRTtBQUdQSixrQ0FBVVEsTUFBTVIsUUFIVDtBQUlQRCxrQ0FBVVMsTUFBTVQsUUFBTixJQUFrQjtBQUpyQixxQkFBVDtBQU1EO0FBQ0Y7QUFDQztBQUNGO0FBQ0Usa0JBQU0sSUFBSWUsS0FBSixDQUFVLGlCQUFpQkosS0FBS0MsU0FBTCxDQUFlSCxLQUFmLEVBQXNCTyxTQUF0QixFQUFpQyxDQUFqQyxDQUEzQixDQUFOO0FBbkRKO0FBcURIO0FBM0RlOUMsUUFBQWtDLFlBQUEsR0FBWUEsWUFBWjtBQWdFZjtBQUVELFNBQUFpQixTQUFBLENBQW1CWCxNQUFuQixFQUFxQ2dCLE1BQXJDLEVBQXNEQyxNQUF0RCxFQUFxRTtBQUNuRSxRQUFJLENBQUNqQixNQUFGLElBQWNpQixXQUFXLENBQTVCLEVBQWdDO0FBQzlCO0FBQ0Q7QUFDRGpCLFdBQU9nQixNQUFQLElBQWlCLENBQUNoQixPQUFPZ0IsTUFBUCxLQUFrQixDQUFuQixJQUF3QkMsTUFBekM7QUFDRDtBQUVELFNBQUFDLGdCQUFBLENBQWlDdkIsTUFBakMsRUFBaURFLEtBQWpELEVBQWlFc0IsTUFBakUsRUFDQ25CLE1BREQsRUFDa0I7QUFDaEI7QUFDQSxRQUFHM0QsVUFBVVksT0FBYixFQUF3QjtBQUN0Qlosa0JBQVUsYUFBYTRELEtBQUtDLFNBQUwsQ0FBZWlCLE1BQWYsRUFBdUJiLFNBQXZCLEVBQWtDLENBQWxDLENBQXZCO0FBQ0Q7QUFDRCxRQUFJVixXQUFXRCxPQUFPZCxXQUFQLEVBQWY7QUFDQSxRQUFJaUIsTUFBd0MsRUFBNUM7QUFDQXFCLFdBQU9DLE9BQVAsQ0FBZSxVQUFVckIsS0FBVixFQUFlO0FBQzVCTCxxQkFBYUMsTUFBYixFQUFvQkMsUUFBcEIsRUFBNkJDLEtBQTdCLEVBQW1DQyxHQUFuQyxFQUF1Q0MsS0FBdkMsRUFBNkNDLE1BQTdDO0FBQ0QsS0FGRDtBQUdBRixRQUFJdUIsSUFBSixDQUFTakMsVUFBVDtBQUNBLFdBQU9VLEdBQVA7QUFDRDtBQWJldEMsUUFBQTBELGdCQUFBLEdBQWdCQSxnQkFBaEI7QUFlaEIsU0FBQUksaUJBQUEsQ0FBa0MzQixNQUFsQyxFQUFrREUsS0FBbEQsRUFBbUUwQixLQUFuRSxFQUNJdkIsTUFESixFQUNvQjtBQUNsQjtBQUNBLFFBQUkzRCxVQUFVWSxPQUFkLEVBQXlCO0FBQ3ZCWixrQkFBVSxhQUFhNEQsS0FBS0MsU0FBTCxDQUFlcUIsS0FBZixFQUFxQmpCLFNBQXJCLEVBQWdDLENBQWhDLENBQXZCO0FBQ0Q7QUFDRCxRQUFJVixXQUFXRCxPQUFPZCxXQUFQLEVBQWY7QUFDQSxRQUFJaUIsTUFBd0MsRUFBNUM7QUFDQSxRQUFJRCxLQUFKLEVBQVc7QUFDVCxZQUFJUixJQUFJa0MsTUFBTUMsT0FBTixDQUFjNUIsUUFBZCxDQUFSO0FBQ0EsWUFBSVAsQ0FBSixFQUFPO0FBQ0xBLGNBQUUrQixPQUFGLENBQVUsVUFBU3JCLEtBQVQsRUFBYztBQUN0QkQsb0JBQUlVLElBQUosQ0FBUztBQUNMYiw0QkFBUUEsTUFESDtBQUVMRixtQ0FBZU0sTUFBTU4sYUFGaEI7QUFHTEYsOEJBQVVRLE1BQU1SLFFBSFg7QUFJTEQsOEJBQVVTLE1BQU1ULFFBQU4sSUFBa0I7QUFKdkIsaUJBQVQ7QUFNRixhQVBBO0FBUUQ7QUFDRGlDLGNBQU1FLFlBQU4sQ0FBbUJMLE9BQW5CLENBQTJCLFVBQVVyQixLQUFWLEVBQWU7QUFDeENMLHlCQUFhQyxNQUFiLEVBQW9CQyxRQUFwQixFQUE2QkMsS0FBN0IsRUFBbUNDLEdBQW5DLEVBQXVDQyxLQUF2QyxFQUE2Q0MsTUFBN0M7QUFDRCxTQUZEO0FBR0QsS0FmRCxNQWVPO0FBQ0w3RCxpQkFBUyx5QkFBeUJ3RCxNQUF6QixHQUFrQyxPQUFsQyxHQUE0QzRCLE1BQU1HLFFBQU4sQ0FBZS9FLE1BQXBFO0FBQ0EsZUFBT3VFLGlCQUFpQnZCLE1BQWpCLEVBQXlCRSxLQUF6QixFQUFnQzBCLE1BQU1HLFFBQXRDLEVBQWdEMUIsTUFBaEQsQ0FBUDtBQUNEO0FBQ0RGLFFBQUl1QixJQUFKLENBQVNqQyxVQUFUO0FBQ0EsV0FBT1UsR0FBUDtBQUNEO0FBN0JldEMsUUFBQThELGlCQUFBLEdBQWlCQSxpQkFBakI7QUFpQ2hCOzs7Ozs7OztBQVFBLFNBQUFLLFNBQUEsQ0FBMEI1QixLQUExQixFQUF3QzZCLE9BQXhDLEVBQWtFQyxPQUFsRSxFQUF5RjtBQUN2RixRQUFJRCxRQUFRN0IsTUFBTWxDLEdBQWQsTUFBdUJ5QyxTQUEzQixFQUFzQztBQUNwQyxlQUFPQSxTQUFQO0FBQ0Q7QUFDRCxRQUFJd0IsS0FBS0YsUUFBUTdCLE1BQU1sQyxHQUFkLEVBQW1CZ0IsV0FBbkIsRUFBVDtBQUNBLFFBQUlrRCxLQUFLaEMsTUFBTVEsSUFBTixDQUFXMUIsV0FBWCxFQUFUO0FBQ0FnRCxjQUFVQSxXQUFXLEVBQXJCO0FBQ0EsUUFBSUcsUUFBUWxELGVBQWU4QyxPQUFmLEVBQXdCN0IsTUFBTWtDLE9BQTlCLEVBQXVDbEMsTUFBTWxDLEdBQTdDLENBQVo7QUFDQSxRQUFHMUIsU0FBU2MsT0FBWixFQUFxQjtBQUNuQmQsaUJBQVM4RCxLQUFLQyxTQUFMLENBQWU4QixLQUFmLENBQVQ7QUFDQTdGLGlCQUFTOEQsS0FBS0MsU0FBTCxDQUFlMkIsT0FBZixDQUFUO0FBQ0Q7QUFDRCxRQUFJQSxRQUFRSyxXQUFSLElBQXdCRixNQUFNL0MsU0FBTixHQUFrQixDQUE5QyxFQUFrRDtBQUNoRCxlQUFPcUIsU0FBUDtBQUNEO0FBQ0QsUUFBSTZCLElBQVkzRixhQUFhdUYsRUFBYixFQUFpQkQsRUFBakIsQ0FBaEI7QUFDQSxRQUFHM0YsU0FBU2MsT0FBWixFQUFxQjtBQUNuQmQsaUJBQVMsZUFBZTJGLEVBQWYsR0FBb0IsSUFBcEIsR0FBMkJDLEVBQTNCLEdBQWdDLFFBQWhDLEdBQTJDSSxDQUFwRDtBQUNEO0FBQ0QsUUFBSUEsSUFBSSxHQUFSLEVBQWE7QUFDWCxZQUFJckMsTUFBTTdELFVBQVVtRyxNQUFWLENBQWlCLEVBQWpCLEVBQXFCckMsTUFBTWtDLE9BQTNCLENBQVY7QUFDQW5DLGNBQU03RCxVQUFVbUcsTUFBVixDQUFpQnRDLEdBQWpCLEVBQXNCOEIsT0FBdEIsQ0FBTjtBQUNBLFlBQUlDLFFBQVFRLFFBQVosRUFBc0I7QUFDcEJ2QyxrQkFBTTdELFVBQVVtRyxNQUFWLENBQWlCdEMsR0FBakIsRUFBc0JDLE1BQU1rQyxPQUE1QixDQUFOO0FBQ0Q7QUFDRDtBQUNBO0FBQ0FuQyxZQUFJQyxNQUFNbEMsR0FBVixJQUFpQmtDLE1BQU1rQyxPQUFOLENBQWNsQyxNQUFNbEMsR0FBcEIsS0FBNEJpQyxJQUFJQyxNQUFNbEMsR0FBVixDQUE3QztBQUNBaUMsWUFBSXdDLE9BQUosR0FBY3JHLFVBQVVtRyxNQUFWLENBQWlCLEVBQWpCLEVBQXFCdEMsSUFBSXdDLE9BQXpCLENBQWQ7QUFDQXhDLFlBQUl3QyxPQUFKLENBQVl2QyxNQUFNbEMsR0FBbEIsSUFBeUJzRSxDQUF6QjtBQUNBakcsZUFBT3FHLE1BQVAsQ0FBY3pDLEdBQWQ7QUFDQSxZQUFLM0QsU0FBU2MsT0FBZCxFQUF1QjtBQUNyQmQscUJBQVMsY0FBYzhELEtBQUtDLFNBQUwsQ0FBZUosR0FBZixFQUFvQlEsU0FBcEIsRUFBK0IsQ0FBL0IsQ0FBdkI7QUFDRDtBQUNELGVBQU9SLEdBQVA7QUFDRDtBQUNELFdBQU9RLFNBQVA7QUFDRDtBQXJDZTlDLFFBQUFtRSxTQUFBLEdBQVNBLFNBQVQ7QUF1Q2hCLFNBQUFhLGNBQUEsQ0FBK0JDLEtBQS9CLEVBQXFEQyxPQUFyRCxFQUF1RjtBQUNyRixRQUFJNUMsTUFBTSxFQUFWO0FBQ0EsUUFBSSxDQUFDNEMsT0FBTCxFQUFjO0FBQ1osZUFBTzVDLEdBQVA7QUFDRDtBQUNENUQsV0FBT3lCLElBQVAsQ0FBWStFLE9BQVosRUFBcUJ0QixPQUFyQixDQUE2QixVQUFVdUIsSUFBVixFQUFjO0FBQ3pDLFlBQUlDLFFBQVFILE1BQU1FLElBQU4sQ0FBWjtBQUNBLFlBQUk5RSxNQUFNNkUsUUFBUUMsSUFBUixDQUFWO0FBQ0EsWUFBSyxPQUFPQyxLQUFQLEtBQWlCLFFBQWxCLElBQStCQSxNQUFNakcsTUFBTixHQUFlLENBQWxELEVBQXFEO0FBQ25EbUQsZ0JBQUlqQyxHQUFKLElBQVcrRSxLQUFYO0FBQ0Q7QUFDRixLQU5EO0FBUUEsV0FBTzlDLEdBQVA7QUFDRDtBQWRldEMsUUFBQWdGLGNBQUEsR0FBY0EsY0FBZDtBQWdCSGhGLFFBQUFxRixRQUFBLEdBQVc7QUFDdEJDLGNBQVUsa0JBQVVDLEdBQVYsRUFBa0RDLE1BQWxELEVBQWdFO0FBQ3hFLGVBQU8sQ0FBQ0QsSUFBSUUsS0FBSixDQUFVLFVBQVVDLE9BQVYsRUFBaUI7QUFDakMsbUJBQVFBLFFBQVE1RCxRQUFSLEdBQW1CMEQsTUFBM0I7QUFDRCxTQUZPLENBQVI7QUFHRCxLQUxxQjtBQU90QkcsZ0JBQVksb0JBQVVKLEdBQVYsRUFBa0RLLENBQWxELEVBQTJEO0FBQ3JFLGVBQU9MLElBQUluRixNQUFKLENBQVcsVUFBVXNGLE9BQVYsRUFBbUJHLE1BQW5CLEVBQXlCO0FBQ3pDLGdCQUFJQyxjQUFjLEdBQWxCO0FBQ0EsZ0JBQUtELFNBQVNELENBQVYsSUFBZ0JGLFFBQVE1RCxRQUFSLEtBQXFCZ0UsV0FBekMsRUFBc0Q7QUFDcERBLDhCQUFjSixRQUFRNUQsUUFBdEI7QUFDQSx1QkFBTyxJQUFQO0FBQ0Q7QUFDRCxtQkFBTyxLQUFQO0FBQ0QsU0FQTSxDQUFQO0FBUUQsS0FoQnFCO0FBaUJ0QmlFLGVBQVcsbUJBQVVSLEdBQVYsRUFBa0RDLE1BQWxELEVBQWdFO0FBQ3pFLGVBQU9ELElBQUluRixNQUFKLENBQVcsVUFBVXNGLE9BQVYsRUFBaUI7QUFDakMsbUJBQVFBLFFBQVE1RCxRQUFSLElBQW9CMEQsTUFBNUI7QUFDRCxTQUZNLENBQVA7QUFHRDtBQXJCcUIsQ0FBWDtBQXdCYjs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQW9CQSxTQUFBUSw0QkFBQSxDQUE2Q0MsVUFBN0MsRUFBaUVDLFVBQWpFLEVBQWtHMUQsTUFBbEcsRUFBbUg7QUFDakgsUUFBSTJELFNBQVNyQyxrQkFBa0JtQyxVQUFsQixFQUE4QixJQUE5QixFQUFvQ0MsVUFBcEMsRUFBZ0QxRCxNQUFoRCxDQUFiO0FBQ0E7QUFDQTtBQUNBVyxjQUFVWCxNQUFWLEVBQWtCLGFBQWxCLEVBQWlDLENBQWpDO0FBQ0FXLGNBQVVYLE1BQVYsRUFBa0IsZ0JBQWxCLEVBQW9DMkQsT0FBT2hILE1BQTNDO0FBRUEsUUFBSWEsUUFBQXFGLFFBQUEsQ0FBU0MsUUFBVCxDQUFrQmEsTUFBbEIsRUFBMEIsR0FBMUIsQ0FBSixFQUFvQztBQUNsQyxZQUFHM0QsTUFBSCxFQUFXO0FBQ1RXLHNCQUFVWCxNQUFWLEVBQWtCLGdCQUFsQixFQUFvQzJELE9BQU9oSCxNQUEzQztBQUNEO0FBQ0RnSCxpQkFBU25HLFFBQUFxRixRQUFBLENBQVNVLFNBQVQsQ0FBbUJJLE1BQW5CLEVBQTJCLEdBQTNCLENBQVQ7QUFDQSxZQUFHM0QsTUFBSCxFQUFXO0FBQ1RXLHNCQUFVWCxNQUFWLEVBQWtCLGdCQUFsQixFQUFvQzJELE9BQU9oSCxNQUEzQztBQUNEO0FBRUYsS0FURCxNQVNPO0FBQ0xnSCxpQkFBU3JDLGtCQUFrQm1DLFVBQWxCLEVBQThCLEtBQTlCLEVBQXFDQyxVQUFyQyxFQUFpRDFELE1BQWpELENBQVQ7QUFDQVcsa0JBQVVYLE1BQVYsRUFBa0IsYUFBbEIsRUFBaUMsQ0FBakM7QUFDQVcsa0JBQVVYLE1BQVYsRUFBa0IsZ0JBQWxCLEVBQW9DMkQsT0FBT2hILE1BQTNDO0FBR0Q7QUFDRjtBQUNDZ0gsYUFBU25HLFFBQUFxRixRQUFBLENBQVNNLFVBQVQsQ0FBb0JRLE1BQXBCLEVBQTRCNUgsTUFBTTZILHlCQUFsQyxDQUFUO0FBQ0Q7QUFDQyxXQUFPRCxNQUFQO0FBQ0Q7QUEzQmVuRyxRQUFBZ0csNEJBQUEsR0FBNEJBLDRCQUE1QjtBQTZCaEI7Ozs7Ozs7Ozs7Ozs7QUFjQSxTQUFBSyxtQ0FBQSxDQUFvREMsU0FBcEQsRUFBNkY7QUFDM0YsV0FBT0EsVUFBVWIsS0FBVixDQUFnQixVQUFVYyxVQUFWLEVBQW9CO0FBQ3pDLGVBQVFBLFdBQVdwSCxNQUFYLEdBQW9CLENBQTVCO0FBQ0QsS0FGTSxDQUFQO0FBR0Q7QUFKZWEsUUFBQXFHLG1DQUFBLEdBQW1DQSxtQ0FBbkM7QUFRaEIsU0FBQUcsMkJBQUEsQ0FBNENDLEdBQTVDLEVBQWlGO0FBQy9FLFdBQU9BLElBQUlyRyxNQUFKLENBQVcsVUFBVWtHLFNBQVYsRUFBbUI7QUFDbkMsZUFBT0Qsb0NBQW9DQyxTQUFwQyxDQUFQO0FBQ0QsS0FGTSxDQUFQO0FBR0Q7QUFKZXRHLFFBQUF3RywyQkFBQSxHQUEyQkEsMkJBQTNCO0FBTWhCLFNBQUFFLGVBQUEsQ0FBZ0NULFVBQWhDLEVBQW9EbEMsS0FBcEQsRUFBOEU0QyxPQUE5RSxFQUErRkMsS0FBL0YsRUFDQXBFLE1BREEsRUFDa0I7QUFDaEIsUUFBSTJELFNBQVNTLE1BQU1YLFVBQU4sQ0FBYjtBQUNBLFFBQUlFLFdBQVdyRCxTQUFmLEVBQTBCO0FBQ3hCcUQsaUJBQVNILDZCQUE2QkMsVUFBN0IsRUFBeUNsQyxLQUF6QyxFQUFnRHZCLE1BQWhELENBQVQ7QUFDQWxFLGNBQU11SSxVQUFOLENBQWlCVixNQUFqQjtBQUNBUyxjQUFNWCxVQUFOLElBQW9CRSxNQUFwQjtBQUNEO0FBQ0QsUUFBSSxDQUFDQSxNQUFELElBQVdBLE9BQU9oSCxNQUFQLEtBQWtCLENBQWpDLEVBQW9DO0FBQ2xDaEIsZUFBTyx1REFBdUQ4SCxVQUF2RCxHQUFvRSxtQkFBcEUsR0FDSFUsT0FERyxHQUNPLElBRGQ7QUFFQSxZQUFJVixXQUFXckYsT0FBWCxDQUFtQixHQUFuQixLQUEyQixDQUEvQixFQUFrQztBQUNoQ2pDLHFCQUFTLGtFQUFrRXNILFVBQTNFO0FBQ0Q7QUFDRHRILGlCQUFTLHFEQUFxRHNILFVBQTlEO0FBQ0EsWUFBSSxDQUFDRSxNQUFMLEVBQWE7QUFDWCxrQkFBTSxJQUFJdEQsS0FBSixDQUFVLCtDQUErQ29ELFVBQS9DLEdBQTRELElBQXRFLENBQU47QUFDRDtBQUNEVyxjQUFNWCxVQUFOLElBQW9CLEVBQXBCO0FBQ0EsZUFBTyxFQUFQO0FBQ0Q7QUFDRCxXQUFPM0gsTUFBTXdJLFNBQU4sQ0FBZ0JYLE1BQWhCLENBQVA7QUFDRDtBQXRCZW5HLFFBQUEwRyxlQUFBLEdBQWVBLGVBQWY7QUF5QmhCOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFxQkEsU0FBQUssYUFBQSxDQUE4QkosT0FBOUIsRUFBK0M1QyxLQUEvQyxFQUNFNkMsS0FERixFQUM4RDtBQUM1RCxRQUFJSSxNQUFNLENBQVY7QUFDQSxRQUFJQyxNQUFNLENBQVY7QUFDQSxRQUFJQyxJQUFJMUksVUFBVTJJLGVBQVYsQ0FBMEJSLE9BQTFCLEVBQW1DcEksTUFBTTZJLHdCQUF6QyxDQUFSO0FBQ0EsUUFBR3pJLFNBQVNjLE9BQVosRUFBcUI7QUFDbkJkLGlCQUFTLG1CQUFtQjhELEtBQUtDLFNBQUwsQ0FBZXdFLENBQWYsQ0FBNUI7QUFDRDtBQUNEO0FBQ0FOLFlBQVFBLFNBQVMsRUFBakI7QUFDQXZJLGNBQVUsNEJBQTRCSyxPQUFPeUIsSUFBUCxDQUFZeUcsS0FBWixFQUFtQnpILE1BQXpEO0FBQ0EsUUFBSW1ELE1BQU0sRUFBVjtBQUNBLFFBQUlFLFNBQVMsRUFBYjtBQUNBMEUsTUFBRXRELE9BQUYsQ0FBVSxVQUFVeUQsa0JBQVYsRUFBNEI7QUFDbEMsWUFBSUMsc0JBQXNCLEVBQTFCO0FBQ0EsWUFBSUMsVUFBVUYsbUJBQW1CNUIsS0FBbkIsQ0FBeUIsVUFBVVEsVUFBVixFQUE4QnVCLEtBQTlCLEVBQTRDO0FBQ2pGLGdCQUFJckIsU0FBU08sZ0JBQWdCVCxVQUFoQixFQUE0QmxDLEtBQTVCLEVBQW1DNEMsT0FBbkMsRUFBNENDLEtBQTVDLEVBQW1EcEUsTUFBbkQsQ0FBYjtBQUNBLGdCQUFHMkQsT0FBT2hILE1BQVAsS0FBa0IsQ0FBckIsRUFBd0I7QUFDdEIsdUJBQU8sS0FBUDtBQUNEO0FBQ0RtSSxnQ0FBb0JFLEtBQXBCLElBQTZCckIsTUFBN0I7QUFDQWEsa0JBQU1BLE1BQU1iLE9BQU9oSCxNQUFuQjtBQUNBOEgsa0JBQU1BLE1BQU1kLE9BQU9oSCxNQUFuQjtBQUNBLG1CQUFPLElBQVA7QUFDRCxTQVRhLENBQWQ7QUFVQSxZQUFHb0ksT0FBSCxFQUFZO0FBQ1ZqRixnQkFBSVUsSUFBSixDQUFTc0UsbUJBQVQ7QUFDRDtBQUNKLEtBZkQ7QUFnQkEzSSxhQUFTLGdCQUFnQnVJLEVBQUUvSCxNQUFsQixHQUEyQixXQUEzQixHQUF5QzZILEdBQXpDLEdBQStDLFFBQS9DLEdBQTBEQyxHQUFuRTtBQUNBLFFBQUd0SSxTQUFTYyxPQUFULElBQW9CeUgsRUFBRS9ILE1BQXpCLEVBQWlDO0FBQy9CUixpQkFBUyxpQkFBZ0I4RCxLQUFLQyxTQUFMLENBQWV3RSxDQUFmLEVBQWlCcEUsU0FBakIsRUFBMkIsQ0FBM0IsQ0FBekI7QUFDRDtBQUNEekUsY0FBVSxnQkFBZ0I2SSxFQUFFL0gsTUFBbEIsR0FBMkIsS0FBM0IsR0FBbUNtRCxJQUFJbkQsTUFBdkMsR0FBaUQsV0FBakQsR0FBK0Q2SCxHQUEvRCxHQUFxRSxRQUFyRSxHQUFnRkMsR0FBaEYsR0FBc0YsU0FBdEYsR0FBa0d4RSxLQUFLQyxTQUFMLENBQWVGLE1BQWYsRUFBc0JNLFNBQXRCLEVBQWdDLENBQWhDLENBQTVHO0FBQ0EsV0FBT1IsR0FBUDtBQUNEO0FBbkNldEMsUUFBQStHLGFBQUEsR0FBYUEsYUFBYjtBQXFDaEI7Ozs7Ozs7OztBQVdBLElBQU1VLFFBQVFuSixNQUFNd0ksU0FBcEI7QUFHQSxTQUFBWSxjQUFBLENBQXdCUixDQUF4QixFQUF5QjtBQUN2QixRQUFJbkgsSUFBSSxDQUFSO0FBQ0EsU0FBSUEsSUFBSSxDQUFSLEVBQVdBLElBQUltSCxFQUFFL0gsTUFBakIsRUFBeUIsRUFBRVksQ0FBM0IsRUFBOEI7QUFDNUJtSCxVQUFFbkgsQ0FBRixJQUFPMEgsTUFBTVAsRUFBRW5ILENBQUYsQ0FBTixDQUFQO0FBQ0Q7QUFDRCxXQUFPbUgsQ0FBUDtBQUNEO0FBQ0Q7QUFDQTtBQUVBO0FBRUEsU0FBQVMsY0FBQSxDQUErQkMsSUFBL0IsRUFBc0Q7QUFDcEQsUUFBSWxJLElBQUksRUFBUjtBQUNBLFFBQUltSSxPQUFPLEVBQVg7QUFDQWxKLGFBQVNBLFNBQVNjLE9BQVQsR0FBbUJnRCxLQUFLQyxTQUFMLENBQWVrRixJQUFmLENBQW5CLEdBQTBDLEdBQW5EO0FBQ0FBLFNBQUtoRSxPQUFMLENBQWEsVUFBVWtFLGNBQVYsRUFBMEJqQyxNQUExQixFQUF3QztBQUNuRGdDLGFBQUtoQyxNQUFMLElBQWUsRUFBZjtBQUNBaUMsdUJBQWVsRSxPQUFmLENBQXVCLFVBQVVtRSxVQUFWLEVBQXNCQyxPQUF0QixFQUFxQztBQUMxREgsaUJBQUtoQyxNQUFMLEVBQWFtQyxPQUFiLElBQXdCLEVBQXhCO0FBQ0FELHVCQUFXbkUsT0FBWCxDQUFtQixVQUFVcUUsWUFBVixFQUF3QkMsUUFBeEIsRUFBd0M7QUFDekRMLHFCQUFLaEMsTUFBTCxFQUFhbUMsT0FBYixFQUFzQkUsUUFBdEIsSUFBa0NELFlBQWxDO0FBQ0QsYUFGRDtBQUdELFNBTEQ7QUFNRCxLQVJEO0FBU0F0SixhQUFTOEQsS0FBS0MsU0FBTCxDQUFlbUYsSUFBZixDQUFUO0FBQ0EsUUFBSXZGLE1BQU0sRUFBVjtBQUNBLFFBQUk2RixRQUFRLEVBQVo7QUFDQSxTQUFLLElBQUlwSSxJQUFJLENBQWIsRUFBZ0JBLElBQUk4SCxLQUFLMUksTUFBekIsRUFBaUMsRUFBRVksQ0FBbkMsRUFBc0M7QUFDcEMsWUFBSXFJLE9BQU8sQ0FBQyxFQUFELENBQVg7QUFDQSxZQUFJRCxRQUFRLEVBQVo7QUFDQSxZQUFJRSxPQUFPLEVBQVg7QUFDQSxhQUFLLElBQUlDLElBQUksQ0FBYixFQUFnQkEsSUFBSVQsS0FBSzlILENBQUwsRUFBUVosTUFBNUIsRUFBb0MsRUFBRW1KLENBQXRDLEVBQXlDO0FBQ3ZDO0FBQ0EsZ0JBQUlDLFdBQVcsRUFBZjtBQUNBLGlCQUFLLElBQUlDLElBQUksQ0FBYixFQUFnQkEsSUFBSVgsS0FBSzlILENBQUwsRUFBUXVJLENBQVIsRUFBV25KLE1BQS9CLEVBQXVDLEVBQUVxSixDQUF6QyxFQUE0QztBQUMxQztBQUNBTCx3QkFBUSxFQUFSLENBRjBDLENBRTlCO0FBQ1o7QUFDQSxxQkFBSyxJQUFJakIsSUFBSSxDQUFiLEVBQWdCQSxJQUFJa0IsS0FBS2pKLE1BQXpCLEVBQWlDLEVBQUUrSCxDQUFuQyxFQUFzQztBQUNwQ2lCLDBCQUFNakIsQ0FBTixJQUFXa0IsS0FBS2xCLENBQUwsRUFBUXVCLEtBQVIsRUFBWCxDQURvQyxDQUNSO0FBQzVCTiwwQkFBTWpCLENBQU4sSUFBV1EsZUFBZVMsTUFBTWpCLENBQU4sQ0FBZixDQUFYO0FBQ0E7QUFDQWlCLDBCQUFNakIsQ0FBTixFQUFTbEUsSUFBVCxDQUNFeUUsTUFBTUksS0FBSzlILENBQUwsRUFBUXVJLENBQVIsRUFBV0UsQ0FBWCxDQUFOLENBREYsRUFKb0MsQ0FLWDtBQUUxQjtBQUNEO0FBQ0E7QUFDQUQsMkJBQVdBLFNBQVNHLE1BQVQsQ0FBZ0JQLEtBQWhCLENBQVg7QUFFRCxhQW5Cc0MsQ0FtQnJDO0FBQ0Y7QUFDQUMsbUJBQU9HLFFBQVA7QUFDRDtBQUNEM0osa0JBQVVBLFVBQVVhLE9BQVYsR0FBcUIscUJBQXFCTSxDQUFyQixHQUF5QixHQUF6QixHQUErQnlJLENBQS9CLEdBQW1DLElBQW5DLEdBQTBDL0YsS0FBS0MsU0FBTCxDQUFlNkYsUUFBZixDQUEvRCxHQUEyRixHQUFyRztBQUNBakcsY0FBTUEsSUFBSW9HLE1BQUosQ0FBV04sSUFBWCxDQUFOO0FBQ0Q7QUFDRCxXQUFPOUYsR0FBUDtBQUNEO0FBL0NldEMsUUFBQTJILGNBQUEsR0FBY0EsY0FBZDtBQWtEaEI7Ozs7Ozs7O0FBUUEsU0FBQWdCLG1CQUFBLENBQW9DQyxJQUFwQyxFQUFrRDdHLFFBQWxELEVBQWtFO0FBQ2hFLFFBQUk4RyxNQUFNQyxLQUFLRCxHQUFMLENBQVNELElBQVQsQ0FBVjtBQUNBLFdBQU8sT0FBT3JLLE1BQU13SyxvQkFBTixDQUEyQkYsR0FBM0IsS0FBbUMsQ0FBMUMsQ0FBUDtBQUNEO0FBSGU3SSxRQUFBMkksbUJBQUEsR0FBbUJBLG1CQUFuQjtBQUtoQjs7O0FBR0EsU0FBQUssa0JBQUEsQ0FBbUMxQyxTQUFuQyxFQUFrRTtBQUNoRSxRQUFJaEUsTUFBTSxFQUFWO0FBQ0EzRCxhQUFTLHdCQUF3QjhELEtBQUtDLFNBQUwsQ0FBZTRELFNBQWYsQ0FBakM7QUFDQUEsY0FBVTFDLE9BQVYsQ0FBa0IsVUFBVXFGLEtBQVYsRUFBaUJwRCxNQUFqQixFQUF1QjtBQUN2QyxZQUFJb0QsTUFBTWxILFFBQU4sS0FBbUJwQyxRQUFRdUosWUFBL0IsRUFBNkM7QUFDM0M1RyxnQkFBSTJHLE1BQU1oSCxhQUFWLElBQTJCSyxJQUFJMkcsTUFBTWhILGFBQVYsS0FBNEIsRUFBdkQ7QUFDQUssZ0JBQUkyRyxNQUFNaEgsYUFBVixFQUF5QmUsSUFBekIsQ0FBOEIsRUFBRW1HLEtBQUt0RCxNQUFQLEVBQTlCO0FBQ0Q7QUFDRixLQUxEO0FBTUF2SCxVQUFNdUksVUFBTixDQUFpQnZFLEdBQWpCO0FBQ0EsV0FBT0EsR0FBUDtBQUNEO0FBWGV0QyxRQUFBZ0osa0JBQUEsR0FBa0JBLGtCQUFsQjtBQWFoQixTQUFBSSxpQkFBQSxDQUFrQzlDLFNBQWxDLEVBQTJDO0FBQ3pDOztBQUNBLFFBQUkrQyxlQUFlTCxtQkFBbUIxQyxTQUFuQixDQUFuQjtBQUNBQSxjQUFVMUMsT0FBVixDQUFrQixVQUFVcUYsS0FBVixFQUFpQnBELE1BQWpCLEVBQXVCO0FBQ3ZDLFlBQUl6QyxJQUFJaUcsYUFBYUosTUFBTWxILFFBQW5CLEtBQWdDLEVBQXhDO0FBQ0FxQixVQUFFUSxPQUFGLENBQVUsVUFBVTBGLFNBQVYsRUFBb0M7QUFDNUM7O0FBQ0FMLGtCQUFNTSxTQUFOLEdBQWtCTixNQUFNTSxTQUFOLElBQW1CLENBQXJDO0FBQ0EsZ0JBQUlDLFFBQVFiLG9CQUFvQjlDLFNBQVN5RCxVQUFVSCxHQUF2QyxFQUE0Q0YsTUFBTWxILFFBQWxELENBQVo7QUFDQWtILGtCQUFNTSxTQUFOLElBQW1CQyxLQUFuQjtBQUNBUCxrQkFBTW5ILFFBQU4sSUFBa0IwSCxLQUFsQjtBQUNELFNBTkQ7QUFPRCxLQVREO0FBVUFsRCxjQUFVMUMsT0FBVixDQUFrQixVQUFVcUYsS0FBVixFQUFpQnBELE1BQWpCLEVBQXVCO0FBQ3ZDLFlBQUlBLFNBQVMsQ0FBYixFQUFpQjtBQUNmLGdCQUFJUyxVQUFVVCxTQUFPLENBQWpCLEVBQW9COUQsUUFBcEIsS0FBaUMsTUFBakMsSUFBNkNrSCxNQUFNbEgsUUFBTixLQUFtQnVFLFVBQVVULFNBQU8sQ0FBakIsRUFBb0I1RCxhQUF4RixFQUF5RztBQUN2R2dILHNCQUFNTSxTQUFOLEdBQWtCTixNQUFNTSxTQUFOLElBQW1CLENBQXJDO0FBQ0Esb0JBQUlDLFFBQVFiLG9CQUFvQixDQUFwQixFQUF1Qk0sTUFBTWxILFFBQTdCLENBQVo7QUFDQWtILHNCQUFNTSxTQUFOLElBQW1CQyxLQUFuQjtBQUNBUCxzQkFBTW5ILFFBQU4sSUFBa0IwSCxLQUFsQjtBQUNEO0FBQ0Y7QUFDRixLQVREO0FBVUEsV0FBT2xELFNBQVA7QUFDRDtBQXhCZXRHLFFBQUFvSixpQkFBQSxHQUFpQkEsaUJBQWpCO0FBMkJoQixJQUFZSyxXQUFReEwsUUFBTSxZQUFOLENBQXBCO0FBRUEsU0FBQXlMLFNBQUEsQ0FBMEJDLGlCQUExQixFQUEyQztBQUN6Qzs7QUFDQUEsc0JBQWtCL0YsT0FBbEIsQ0FBMEIsVUFBVTBDLFNBQVYsRUFBbUI7QUFDM0M4QywwQkFBa0I5QyxTQUFsQjtBQUNELEtBRkQ7QUFHQXFELHNCQUFrQjlGLElBQWxCLENBQXVCNEYsU0FBU0csaUJBQWhDO0FBQ0EsUUFBR2pMLFNBQVNjLE9BQVosRUFBcUI7QUFDbkJkLGlCQUFTLG9CQUFvQmdMLGtCQUFrQkUsR0FBbEIsQ0FBc0IsVUFBVXZELFNBQVYsRUFBbUI7QUFDcEUsbUJBQU9tRCxTQUFTSyxjQUFULENBQXdCeEQsU0FBeEIsSUFBcUMsR0FBckMsR0FBMkM3RCxLQUFLQyxTQUFMLENBQWU0RCxTQUFmLENBQWxEO0FBQ0QsU0FGNEIsRUFFMUJ5RCxJQUYwQixDQUVyQixJQUZxQixDQUE3QjtBQUdEO0FBQ0QsV0FBT0osaUJBQVA7QUFDRDtBQVplM0osUUFBQTBKLFNBQUEsR0FBU0EsU0FBVDtBQWVoQjtBQUVBLFNBQUFNLFdBQUEsQ0FBNEJ6SCxLQUE1QixFQUEwQzZCLE9BQTFDLEVBQW9FQyxPQUFwRSxFQUEyRjtBQUN6RixRQUFJRCxRQUFRN0IsTUFBTWxDLEdBQWQsTUFBdUJ5QyxTQUEzQixFQUFzQztBQUNwQyxlQUFPQSxTQUFQO0FBQ0Q7QUFDRCxRQUFJbUgsT0FBTzFILE1BQU1sQyxHQUFqQjtBQUNBLFFBQUlpRSxLQUFLRixRQUFRN0IsTUFBTWxDLEdBQWQsRUFBbUJnQixXQUFuQixFQUFUO0FBQ0EsUUFBSTZJLE1BQU0zSCxNQUFNYyxNQUFoQjtBQUVBLFFBQUlELElBQUk4RyxJQUFJNUcsSUFBSixDQUFTZ0IsRUFBVCxDQUFSO0FBQ0EsUUFBRzFGLFVBQVVhLE9BQWIsRUFBc0I7QUFDcEJiLGtCQUFVLHNCQUFzQjBGLEVBQXRCLEdBQTJCLEdBQTNCLEdBQWlDN0IsS0FBS0MsU0FBTCxDQUFlVSxDQUFmLENBQTNDO0FBQ0Q7QUFDRCxRQUFJLENBQUNBLENBQUwsRUFBUTtBQUNOLGVBQU9OLFNBQVA7QUFDRDtBQUNEdUIsY0FBVUEsV0FBVyxFQUFyQjtBQUNBLFFBQUlHLFFBQVFsRCxlQUFlOEMsT0FBZixFQUF3QjdCLE1BQU1rQyxPQUE5QixFQUF1Q2xDLE1BQU1sQyxHQUE3QyxDQUFaO0FBQ0EsUUFBSXpCLFVBQVVhLE9BQWQsRUFBdUI7QUFDckJiLGtCQUFVNkQsS0FBS0MsU0FBTCxDQUFlOEIsS0FBZixDQUFWO0FBQ0E1RixrQkFBVTZELEtBQUtDLFNBQUwsQ0FBZTJCLE9BQWYsQ0FBVjtBQUNEO0FBQ0QsUUFBSUEsUUFBUUssV0FBUixJQUF3QkYsTUFBTS9DLFNBQU4sR0FBa0IsQ0FBOUMsRUFBa0Q7QUFDaEQsZUFBT3FCLFNBQVA7QUFDRDtBQUNELFFBQUlxSCxvQkFBb0JuRixlQUFlNUIsQ0FBZixFQUFrQmIsTUFBTTJDLE9BQXhCLENBQXhCO0FBQ0EsUUFBSXRHLFVBQVVhLE9BQWQsRUFBdUI7QUFDckJiLGtCQUFVLG9CQUFvQjZELEtBQUtDLFNBQUwsQ0FBZUgsTUFBTTJDLE9BQXJCLENBQTlCO0FBQ0F0RyxrQkFBVSxXQUFXNkQsS0FBS0MsU0FBTCxDQUFlVSxDQUFmLENBQXJCO0FBQ0F4RSxrQkFBVSxvQkFBb0I2RCxLQUFLQyxTQUFMLENBQWV5SCxpQkFBZixDQUE5QjtBQUNEO0FBQ0QsUUFBSTdILE1BQU03RCxVQUFVbUcsTUFBVixDQUFpQixFQUFqQixFQUFxQnJDLE1BQU1rQyxPQUEzQixDQUFWO0FBQ0FuQyxVQUFNN0QsVUFBVW1HLE1BQVYsQ0FBaUJ0QyxHQUFqQixFQUFzQjZILGlCQUF0QixDQUFOO0FBQ0E3SCxVQUFNN0QsVUFBVW1HLE1BQVYsQ0FBaUJ0QyxHQUFqQixFQUFzQjhCLE9BQXRCLENBQU47QUFDQSxRQUFJK0Ysa0JBQWtCRixJQUFsQixNQUE0Qm5ILFNBQWhDLEVBQTJDO0FBQ3pDUixZQUFJMkgsSUFBSixJQUFZRSxrQkFBa0JGLElBQWxCLENBQVo7QUFDRDtBQUNELFFBQUk1RixRQUFRUSxRQUFaLEVBQXNCO0FBQ3BCdkMsY0FBTTdELFVBQVVtRyxNQUFWLENBQWlCdEMsR0FBakIsRUFBc0JDLE1BQU1rQyxPQUE1QixDQUFOO0FBQ0FuQyxjQUFNN0QsVUFBVW1HLE1BQVYsQ0FBaUJ0QyxHQUFqQixFQUFzQjZILGlCQUF0QixDQUFOO0FBQ0Q7QUFDRHpMLFdBQU9xRyxNQUFQLENBQWN6QyxHQUFkO0FBQ0EzRCxhQUFTLGNBQWM4RCxLQUFLQyxTQUFMLENBQWVKLEdBQWYsRUFBb0JRLFNBQXBCLEVBQStCLENBQS9CLENBQXZCO0FBQ0EsV0FBT1IsR0FBUDtBQUNEO0FBM0NldEMsUUFBQWdLLFdBQUEsR0FBV0EsV0FBWDtBQTZDaEIsU0FBQUksWUFBQSxDQUE2QkgsSUFBN0IsRUFBMkNJLFNBQTNDLEVBQXVFQyxTQUF2RSxFQUFpRztBQUMvRixRQUFJM0wsU0FBU2MsT0FBYixFQUFzQjtBQUNwQmIsa0JBQVUsY0FBY3FMLElBQWQsR0FBcUIsbUJBQXJCLEdBQTJDeEgsS0FBS0MsU0FBTCxDQUFlMkgsU0FBZixFQUEwQnZILFNBQTFCLEVBQXFDLENBQXJDLENBQTNDLEdBQ1YsV0FEVSxHQUNJTCxLQUFLQyxTQUFMLENBQWU0SCxTQUFmLEVBQTBCeEgsU0FBMUIsRUFBcUMsQ0FBckMsQ0FEZDtBQUVEO0FBQ0QsUUFBSXlILFdBQW1CQyxXQUFXSCxVQUFVLFVBQVYsS0FBeUIsR0FBcEMsQ0FBdkI7QUFDQSxRQUFJSSxXQUFtQkQsV0FBV0YsVUFBVSxVQUFWLEtBQXlCLEdBQXBDLENBQXZCO0FBQ0EsUUFBSUMsYUFBYUUsUUFBakIsRUFBMkI7QUFDekIsWUFBRzlMLFNBQVNjLE9BQVosRUFBcUI7QUFDbkJkLHFCQUFTLGtCQUFrQixPQUFPOEwsV0FBV0YsUUFBbEIsQ0FBM0I7QUFDRDtBQUNELGVBQU8sT0FBT0UsV0FBV0YsUUFBbEIsQ0FBUDtBQUNEO0FBRUQsUUFBSUcsVUFBVUwsVUFBVSxTQUFWLEtBQXdCQSxVQUFVLFNBQVYsRUFBcUJKLElBQXJCLENBQXhCLElBQXNELENBQXBFO0FBQ0EsUUFBSVUsVUFBVUwsVUFBVSxTQUFWLEtBQXdCQSxVQUFVLFNBQVYsRUFBcUJMLElBQXJCLENBQXhCLElBQXNELENBQXBFO0FBQ0EsV0FBTyxFQUFFUyxVQUFVQyxPQUFaLENBQVA7QUFDRDtBQWpCZTNLLFFBQUFvSyxZQUFBLEdBQVlBLFlBQVo7QUFvQmhCO0FBRUEsU0FBQVEsZUFBQSxDQUFnQ3hHLE9BQWhDLEVBQTBEVCxNQUExRCxFQUFnRlUsT0FBaEYsRUFBc0c7QUFDcEcsUUFBSTRGLE9BQU90RyxPQUFPLENBQVAsRUFBVXRELEdBQXJCO0FBQ0E7QUFDQSxRQUFJMUIsU0FBU2MsT0FBYixFQUFzQjtBQUNwQjtBQUNBa0UsZUFBTzhCLEtBQVAsQ0FBYSxVQUFVb0YsS0FBVixFQUFlO0FBQzFCLGdCQUFJQSxNQUFNeEssR0FBTixLQUFjNEosSUFBbEIsRUFBd0I7QUFDdEIsc0JBQU0sSUFBSXBILEtBQUosQ0FBVSwwQ0FBMENvSCxJQUExQyxHQUFpRCxPQUFqRCxHQUEyRHhILEtBQUtDLFNBQUwsQ0FBZW1JLEtBQWYsQ0FBckUsQ0FBTjtBQUNEO0FBQ0QsbUJBQU8sSUFBUDtBQUNELFNBTEQ7QUFNRDtBQUVEO0FBQ0EsUUFBSXZJLE1BQU1xQixPQUFPa0csR0FBUCxDQUFXLFVBQVV0SCxLQUFWLEVBQWU7QUFDbEM7QUFDQSxnQkFBUUEsTUFBTUksSUFBZDtBQUNFLGlCQUFLLENBQUwsQ0FBSyxVQUFMO0FBQ0UsdUJBQU93QixVQUFVNUIsS0FBVixFQUFpQjZCLE9BQWpCLEVBQTBCQyxPQUExQixDQUFQO0FBQ0YsaUJBQUssQ0FBTCxDQUFLLFlBQUw7QUFDRSx1QkFBTzJGLFlBQVl6SCxLQUFaLEVBQW1CNkIsT0FBbkIsRUFBNEJDLE9BQTVCLENBQVA7QUFKSjtBQVFBLGVBQU92QixTQUFQO0FBQ0QsS0FYUyxFQVdQMUMsTUFYTyxDQVdBLFVBQVUwSyxJQUFWLEVBQWM7QUFDdEIsZUFBTyxDQUFDLENBQUNBLElBQVQ7QUFDRCxLQWJTLEVBYVBqSCxJQWJPLENBY1J1RyxhQUFhVyxJQUFiLENBQWtCLElBQWxCLEVBQXdCZCxJQUF4QixDQWRRLENBQVY7QUFnQkEsV0FBTzNILEdBQVA7QUFDQTtBQUNBO0FBQ0Q7QUFqQ2V0QyxRQUFBNEssZUFBQSxHQUFlQSxlQUFmO0FBbUNoQixTQUFBSSxjQUFBLENBQStCNUcsT0FBL0IsRUFBeUQ2RyxNQUF6RCxFQUE2RTtBQUUzRSxRQUFJQyxXQUEwQjtBQUM1QnhHLHFCQUFhLElBRGU7QUFFNUJHLGtCQUFVO0FBRmtCLEtBQTlCO0FBS0EsUUFBSXNHLE9BQU9QLGdCQUFnQnhHLE9BQWhCLEVBQXlCNkcsTUFBekIsRUFBaUNDLFFBQWpDLENBQVg7QUFFQSxRQUFJQyxLQUFLaE0sTUFBTCxLQUFnQixDQUFwQixFQUF1QjtBQUNyQixZQUFJaU0sV0FBMEI7QUFDNUIxRyx5QkFBYSxLQURlO0FBRTVCRyxzQkFBVTtBQUZrQixTQUE5QjtBQUlBc0csZUFBT1AsZ0JBQWdCeEcsT0FBaEIsRUFBeUI2RyxNQUF6QixFQUFpQ0csUUFBakMsQ0FBUDtBQUNEO0FBQ0QsV0FBT0QsSUFBUDtBQUNEO0FBakJlbkwsUUFBQWdMLGNBQUEsR0FBY0EsY0FBZDtBQW1CaEIsU0FBQUssYUFBQSxDQUE4QkMsTUFBOUIsRUFBOERDLGVBQTlELEVBQWdHQyxLQUFoRyxFQUE2RztBQUMzRztBQUNBLFFBQUlGLE9BQU9uTSxNQUFQLEdBQWdCcU0sS0FBcEIsRUFBMkI7QUFDekJGLGVBQU90SSxJQUFQLENBQVl1SSxlQUFaO0FBQ0Q7QUFDRCxXQUFPRCxNQUFQO0FBQ0Q7QUFOZXRMLFFBQUFxTCxhQUFBLEdBQWFBLGFBQWI7QUFTaEIsU0FBQUksUUFBQSxDQUF5QmhGLEdBQXpCLEVBQTJEO0FBQ3pELFFBQUlTLElBQUlULElBQUlyRyxNQUFKLENBQVcsVUFBVXNMLFFBQVYsRUFBa0I7QUFBSSxlQUFPQSxTQUFTdk0sTUFBVCxHQUFrQixDQUF6QjtBQUE0QixLQUE3RCxDQUFSO0FBRUEsUUFBSW1ELE1BQU0sRUFBVjtBQUNBO0FBQ0E0RSxRQUFJQSxFQUFFMkMsR0FBRixDQUFNLFVBQVU4QixJQUFWLEVBQWM7QUFDdEIsWUFBSUMsTUFBTUQsS0FBS0UsS0FBTCxFQUFWO0FBQ0F2SixjQUFNK0ksY0FBYy9JLEdBQWQsRUFBbUJzSixHQUFuQixFQUF3QixDQUF4QixDQUFOO0FBQ0EsZUFBT0QsSUFBUDtBQUNELEtBSkcsRUFJRHZMLE1BSkMsQ0FJTSxVQUFVc0wsUUFBVixFQUEwQztBQUFhLGVBQU9BLFNBQVN2TSxNQUFULEdBQWtCLENBQXpCO0FBQTRCLEtBSnpGLENBQUo7QUFLQTtBQUNBLFdBQU9tRCxHQUFQO0FBQ0Q7QUFaZXRDLFFBQUF5TCxRQUFBLEdBQVFBLFFBQVI7QUFjaEIsSUFBWUssbUJBQWdCN04sUUFBTSxvQkFBTixDQUE1QjtBQUVBLElBQUk4TixFQUFKO0FBRUEsU0FBQUMsU0FBQSxHQUFBO0FBQ0UsUUFBSSxDQUFDRCxFQUFMLEVBQVM7QUFDUEEsYUFBS0QsaUJBQWlCRyxVQUFqQixFQUFMO0FBQ0Q7QUFDRCxXQUFPRixFQUFQO0FBQ0Q7QUFFRCxTQUFBRyxVQUFBLENBQTJCOUgsT0FBM0IsRUFBbUQ7QUFDakQsUUFBSStILFFBQWdDLENBQUMvSCxPQUFELENBQXBDO0FBQ0EwSCxxQkFBaUJNLFNBQWpCLENBQTJCeEksT0FBM0IsQ0FBbUMsVUFBVXFHLElBQVYsRUFBc0I7QUFDdkQsWUFBSW9DLFdBQTBDLEVBQTlDO0FBQ0FGLGNBQU12SSxPQUFOLENBQWMsVUFBVTBJLFFBQVYsRUFBbUM7QUFDL0MsZ0JBQUlBLFNBQVNyQyxJQUFULENBQUosRUFBb0I7QUFDbEJ0TCx5QkFBUywyQkFBMkJzTCxJQUFwQztBQUNBLG9CQUFJM0gsTUFBTTBJLGVBQWVzQixRQUFmLEVBQXlCTixZQUFZL0IsSUFBWixLQUFxQixFQUE5QyxDQUFWO0FBQ0F0TCx5QkFBUyxtQkFBbUJzTCxJQUFuQixHQUEwQixLQUExQixHQUFrQ3hILEtBQUtDLFNBQUwsQ0FBZUosR0FBZixFQUFvQlEsU0FBcEIsRUFBK0IsQ0FBL0IsQ0FBM0M7QUFDQXVKLHlCQUFTckosSUFBVCxDQUFjVixPQUFPLEVBQXJCO0FBQ0QsYUFMRCxNQUtPO0FBQ0w7QUFDQStKLHlCQUFTckosSUFBVCxDQUFjLENBQUNzSixRQUFELENBQWQ7QUFDRDtBQUNGLFNBVkQ7QUFXQUgsZ0JBQVFWLFNBQVNZLFFBQVQsQ0FBUjtBQUNELEtBZEQ7QUFlQSxXQUFPRixLQUFQO0FBQ0Q7QUFsQmVuTSxRQUFBa00sVUFBQSxHQUFVQSxVQUFWO0FBcUJoQixTQUFBSyxtQkFBQSxDQUFvQ25JLE9BQXBDLEVBQTREO0FBQzFELFFBQUl2QyxJQUFJcUssV0FBVzlILE9BQVgsQ0FBUjtBQUNBLFdBQU92QyxLQUFLQSxFQUFFLENBQUYsQ0FBWjtBQUNEO0FBSGU3QixRQUFBdU0sbUJBQUEsR0FBbUJBLG1CQUFuQjtBQUtoQjs7O0FBR0EsU0FBQUMsZUFBQSxDQUFnQ3BJLE9BQWhDLEVBQXdEO0FBQ3RELFdBQU8sRUFBUDtBQUNEO0FBRmVwRSxRQUFBd00sZUFBQSxHQUFlQSxlQUFmIiwiZmlsZSI6Im1hdGNoL2lucHV0RmlsdGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XG4vKipcbiAqIHRoZSBpbnB1dCBmaWx0ZXIgc3RhZ2UgcHJlcHJvY2Vzc2VzIGEgY3VycmVudCBjb250ZXh0XG4gKlxuICogSXQgYSkgY29tYmluZXMgbXVsdGktc2VnbWVudCBhcmd1bWVudHMgaW50byBvbmUgY29udGV4dCBtZW1iZXJzXG4gKiBJdCBiKSBhdHRlbXB0cyB0byBhdWdtZW50IHRoZSBjb250ZXh0IGJ5IGFkZGl0aW9uYWwgcXVhbGlmaWNhdGlvbnNcbiAqICAgICAgICAgICAoTWlkIHRlcm0gZ2VuZXJhdGluZyBBbHRlcm5hdGl2ZXMsIGUuZy5cbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiB1bml0IHRlc3Q/XG4gKiAgICAgICAgICAgICAgICAgQ2xpZW50U2lkZVRhcmdldFJlc29sdXRpb24gLT4gc291cmNlID9cbiAqICAgICAgICAgICApXG4gKiAgU2ltcGxlIHJ1bGVzIGxpa2UgIEludGVudFxuICpcbiAqXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5pbnB1dEZpbHRlclxuICogQGZpbGUgaW5wdXRGaWx0ZXIudHNcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cbiAqL1xuLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vbGliL25vZGUtNC5kLnRzXCIgLz5cbnZhciBkaXN0YW5jZSA9IHJlcXVpcmUoJy4uL3V0aWxzL2RhbWVyYXVMZXZlbnNodGVpbicpO1xudmFyIExvZ2dlciA9IHJlcXVpcmUoJy4uL3V0aWxzL2xvZ2dlcicpO1xudmFyIGxvZ2dlciA9IExvZ2dlci5sb2dnZXIoJ2lucHV0RmlsdGVyJyk7XG52YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpO1xudmFyIGRlYnVncGVyZiA9IGRlYnVnKCdwZXJmJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy91dGlscycpO1xudmFyIEFsZ29sID0gcmVxdWlyZSgnLi9hbGdvbCcpO1xudmFyIGJyZWFrZG93biA9IHJlcXVpcmUoJy4vYnJlYWtkb3duJyk7XG52YXIgQW55T2JqZWN0ID0gT2JqZWN0O1xudmFyIGRlYnVnbG9nID0gZGVidWcoJ2lucHV0RmlsdGVyJyk7XG52YXIgZGVidWdsb2dWID0gZGVidWcoJ2lucHV0VkZpbHRlcicpO1xudmFyIGRlYnVnbG9nTSA9IGRlYnVnKCdpbnB1dE1GaWx0ZXInKTtcbnZhciBtYXRjaGRhdGEgPSByZXF1aXJlKCcuL21hdGNoZGF0YScpO1xudmFyIG9Vbml0VGVzdHMgPSBtYXRjaGRhdGEub1VuaXRUZXN0cztcbi8qKlxuICogQHBhcmFtIHNUZXh0IHtzdHJpbmd9IHRoZSB0ZXh0IHRvIG1hdGNoIHRvIE5hdlRhcmdldFJlc29sdXRpb25cbiAqIEBwYXJhbSBzVGV4dDIge3N0cmluZ30gdGhlIHF1ZXJ5IHRleHQsIGUuZy4gTmF2VGFyZ2V0XG4gKlxuICogQHJldHVybiB0aGUgZGlzdGFuY2UsIG5vdGUgdGhhdCBpcyBpcyAqbm90KiBzeW1tZXRyaWMhXG4gKi9cbmZ1bmN0aW9uIGNhbGNEaXN0YW5jZShzVGV4dDEsIHNUZXh0Mikge1xuICAgIC8vIGNvbnNvbGUubG9nKFwibGVuZ3RoMlwiICsgc1RleHQxICsgXCIgLSBcIiArIHNUZXh0MilcbiAgICBpZiAoKChzVGV4dDEubGVuZ3RoIC0gc1RleHQyLmxlbmd0aCkgPiBBbGdvbC5jYWxjRGlzdC5sZW5ndGhEZWx0YTEpXG4gICAgICAgIHx8IChzVGV4dDIubGVuZ3RoID4gMS41ICogc1RleHQxLmxlbmd0aClcbiAgICAgICAgfHwgKHNUZXh0Mi5sZW5ndGggPCAoc1RleHQxLmxlbmd0aCAvIDIpKSkge1xuICAgICAgICByZXR1cm4gNTAwMDA7XG4gICAgfVxuICAgIHZhciBhMCA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCksIHNUZXh0Mik7XG4gICAgaWYgKGRlYnVnbG9nVi5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nVihcImRpc3RhbmNlXCIgKyBhMCArIFwic3RyaXBwZWQ+XCIgKyBzVGV4dDEuc3Vic3RyaW5nKDAsIHNUZXh0Mi5sZW5ndGgpICsgXCI8PlwiICsgc1RleHQyICsgXCI8XCIpO1xuICAgIH1cbiAgICBpZiAoYTAgKiA1MCA+IDE1ICogc1RleHQyLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gNDAwMDA7XG4gICAgfVxuICAgIHZhciBhID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLCBzVGV4dDIpO1xuICAgIHJldHVybiBhMCAqIDUwMCAvIHNUZXh0Mi5sZW5ndGggKyBhO1xufVxudmFyIElGTWF0Y2ggPSByZXF1aXJlKCcuLi9tYXRjaC9pZm1hdGNoJyk7XG52YXIgbGV2ZW5DdXRvZmYgPSBBbGdvbC5DdXRvZmZfTGV2ZW5TaHRlaW47XG5mdW5jdGlvbiBsZXZlblBlbmFsdHkoaSkge1xuICAgIC8vIDAtPiAxXG4gICAgLy8gMSAtPiAwLjFcbiAgICAvLyAxNTAgLT4gIDAuOFxuICAgIGlmIChpID09PSAwKSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgIH1cbiAgICAvLyByZXZlcnNlIG1heSBiZSBiZXR0ZXIgdGhhbiBsaW5lYXJcbiAgICByZXR1cm4gMSArIGkgKiAoMC44IC0gMSkgLyAxNTA7XG59XG5leHBvcnRzLmxldmVuUGVuYWx0eSA9IGxldmVuUGVuYWx0eTtcbmZ1bmN0aW9uIG5vblByaXZhdGVLZXlzKG9BKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4ga2V5WzBdICE9PSAnXyc7XG4gICAgfSk7XG59XG5mdW5jdGlvbiBjb3VudEFpbkIob0EsIG9CLCBmbkNvbXBhcmUsIGFLZXlJZ25vcmUpIHtcbiAgICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxuICAgICAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xuICAgIGZuQ29tcGFyZSA9IGZuQ29tcGFyZSB8fCBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcbiAgICB9KS5cbiAgICAgICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xuICAgICAgICAgICAgcHJldiA9IHByZXYgKyAoZm5Db21wYXJlKG9BW2tleV0sIG9CW2tleV0sIGtleSkgPyAxIDogMCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG59XG5leHBvcnRzLmNvdW50QWluQiA9IGNvdW50QWluQjtcbmZ1bmN0aW9uIHNwdXJpb3VzQW5vdEluQihvQSwgb0IsIGFLZXlJZ25vcmUpIHtcbiAgICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxuICAgICAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xuICAgIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcbiAgICB9KS5cbiAgICAgICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbn1cbmV4cG9ydHMuc3B1cmlvdXNBbm90SW5CID0gc3B1cmlvdXNBbm90SW5CO1xuZnVuY3Rpb24gbG93ZXJDYXNlKG8pIHtcbiAgICBpZiAodHlwZW9mIG8gPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgcmV0dXJuIG8udG9Mb3dlckNhc2UoKTtcbiAgICB9XG4gICAgcmV0dXJuIG87XG59XG5mdW5jdGlvbiBjb21wYXJlQ29udGV4dChvQSwgb0IsIGFLZXlJZ25vcmUpIHtcbiAgICB2YXIgZXF1YWwgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpID09PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xuICAgIHZhciBkaWZmZXJlbnQgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpICE9PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xuICAgIHZhciBzcHVyaW91c0wgPSBzcHVyaW91c0Fub3RJbkIob0EsIG9CLCBhS2V5SWdub3JlKTtcbiAgICB2YXIgc3B1cmlvdXNSID0gc3B1cmlvdXNBbm90SW5CKG9CLCBvQSwgYUtleUlnbm9yZSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZXF1YWw6IGVxdWFsLFxuICAgICAgICBkaWZmZXJlbnQ6IGRpZmZlcmVudCxcbiAgICAgICAgc3B1cmlvdXNMOiBzcHVyaW91c0wsXG4gICAgICAgIHNwdXJpb3VzUjogc3B1cmlvdXNSXG4gICAgfTtcbn1cbmV4cG9ydHMuY29tcGFyZUNvbnRleHQgPSBjb21wYXJlQ29udGV4dDtcbmZ1bmN0aW9uIHNvcnRCeVJhbmsoYSwgYikge1xuICAgIHZhciByID0gLSgoYS5fcmFua2luZyB8fCAxLjApIC0gKGIuX3JhbmtpbmcgfHwgMS4wKSk7XG4gICAgaWYgKHIpIHtcbiAgICAgICAgcmV0dXJuIHI7XG4gICAgfVxuICAgIGlmIChhLmNhdGVnb3J5ICYmIGIuY2F0ZWdvcnkpIHtcbiAgICAgICAgciA9IGEuY2F0ZWdvcnkubG9jYWxlQ29tcGFyZShiLmNhdGVnb3J5KTtcbiAgICAgICAgaWYgKHIpIHtcbiAgICAgICAgICAgIHJldHVybiByO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChhLm1hdGNoZWRTdHJpbmcgJiYgYi5tYXRjaGVkU3RyaW5nKSB7XG4gICAgICAgIHIgPSBhLm1hdGNoZWRTdHJpbmcubG9jYWxlQ29tcGFyZShiLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICBpZiAocikge1xuICAgICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIDA7XG59XG5mdW5jdGlvbiBjaGVja09uZVJ1bGUoc3RyaW5nLCBsY1N0cmluZywgZXhhY3QsIHJlcywgb1J1bGUsIGNudFJlYykge1xuICAgIGlmIChkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZ1YoJ2F0dGVtcHRpbmcgdG8gbWF0Y2ggcnVsZSAnICsgSlNPTi5zdHJpbmdpZnkob1J1bGUpICsgXCIgdG8gc3RyaW5nIFxcXCJcIiArIHN0cmluZyArIFwiXFxcIlwiKTtcbiAgICB9XG4gICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XG4gICAgICAgIGNhc2UgMCAvKiBXT1JEICovOlxuICAgICAgICAgICAgaWYgKCFvUnVsZS5sb3dlcmNhc2V3b3JkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdydWxlIHdpdGhvdXQgYSBsb3dlcmNhc2UgdmFyaWFudCcgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICA7XG4gICAgICAgICAgICBpZiAoZXhhY3QgJiYgb1J1bGUud29yZCA9PT0gc3RyaW5nIHx8IG9SdWxlLmxvd2VyY2FzZXdvcmQgPT09IGxjU3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICBfcmFua2luZzogb1J1bGUuX3JhbmtpbmcgfHwgMS4wXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWV4YWN0ICYmICFvUnVsZS5leGFjdE9ubHkpIHtcbiAgICAgICAgICAgICAgICB2YXIgbGV2ZW5tYXRjaCA9IGNhbGNEaXN0YW5jZShvUnVsZS5sb3dlcmNhc2V3b3JkLCBsY1N0cmluZyk7XG4gICAgICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYywgXCJjYWxjRGlzdGFuY2VcIiwgMSk7XG4gICAgICAgICAgICAgICAgaWYgKGxldmVubWF0Y2ggPCA1MDAwMCkge1xuICAgICAgICAgICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLCBcImNhbGNEaXN0YW5jZUV4cFwiLCAxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGxldmVubWF0Y2ggPCA0MDAwMCkge1xuICAgICAgICAgICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLCBcImNhbGNEaXN0YW5jZUJlbG93NDBrXCIsIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobGV2ZW5tYXRjaCA8IGxldmVuQ3V0b2ZmKSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsIFwiY2FsY0Rpc3RhbmNlT2tcIiwgMSk7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiAob1J1bGUuX3JhbmtpbmcgfHwgMS4wKSAqIGxldmVuUGVuYWx0eShsZXZlbm1hdGNoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldmVubWF0Y2g6IGxldmVubWF0Y2hcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMSAvKiBSRUdFWFAgKi86XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoXCIgaGVyZSByZWdleHBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBtID0gb1J1bGUucmVnZXhwLmV4ZWMoc3RyaW5nKTtcbiAgICAgICAgICAgICAgICBpZiAobSkge1xuICAgICAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IChvUnVsZS5tYXRjaEluZGV4ICE9PSB1bmRlZmluZWQgJiYgbVtvUnVsZS5tYXRjaEluZGV4XSkgfHwgc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInVua25vd24gdHlwZVwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUsIHVuZGVmaW5lZCwgMikpO1xuICAgIH1cbn1cbmV4cG9ydHMuY2hlY2tPbmVSdWxlID0gY2hlY2tPbmVSdWxlO1xuO1xuZnVuY3Rpb24gYWRkQ250UmVjKGNudFJlYywgbWVtYmVyLCBudW1iZXIpIHtcbiAgICBpZiAoKCFjbnRSZWMpIHx8IChudW1iZXIgPT09IDApKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY250UmVjW21lbWJlcl0gPSAoY250UmVjW21lbWJlcl0gfHwgMCkgKyBudW1iZXI7XG59XG5mdW5jdGlvbiBjYXRlZ29yaXplU3RyaW5nKHN0cmluZywgZXhhY3QsIG9SdWxlcywgY250UmVjKSB7XG4gICAgLy8gc2ltcGx5IGFwcGx5IGFsbCBydWxlc1xuICAgIGlmIChkZWJ1Z2xvZ00uZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZ00oXCJydWxlcyA6IFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgdmFyIGxjU3RyaW5nID0gc3RyaW5nLnRvTG93ZXJDYXNlKCk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIG9SdWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChvUnVsZSkge1xuICAgICAgICBjaGVja09uZVJ1bGUoc3RyaW5nLCBsY1N0cmluZywgZXhhY3QsIHJlcywgb1J1bGUsIGNudFJlYyk7XG4gICAgfSk7XG4gICAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZVN0cmluZyA9IGNhdGVnb3JpemVTdHJpbmc7XG5mdW5jdGlvbiBjYXRlZ29yaXplU3RyaW5nMihzdHJpbmcsIGV4YWN0LCBydWxlcywgY250UmVjKSB7XG4gICAgLy8gc2ltcGx5IGFwcGx5IGFsbCBydWxlc1xuICAgIGlmIChkZWJ1Z2xvZ00uZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZ00oXCJydWxlcyA6IFwiICsgSlNPTi5zdHJpbmdpZnkocnVsZXMsIHVuZGVmaW5lZCwgMikpO1xuICAgIH1cbiAgICB2YXIgbGNTdHJpbmcgPSBzdHJpbmcudG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgaWYgKGV4YWN0KSB7XG4gICAgICAgIHZhciByID0gcnVsZXMud29yZE1hcFtsY1N0cmluZ107XG4gICAgICAgIGlmIChyKSB7XG4gICAgICAgICAgICByLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICBfcmFua2luZzogb1J1bGUuX3JhbmtpbmcgfHwgMS4wXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBydWxlcy5ub25Xb3JkUnVsZXMuZm9yRWFjaChmdW5jdGlvbiAob1J1bGUpIHtcbiAgICAgICAgICAgIGNoZWNrT25lUnVsZShzdHJpbmcsIGxjU3RyaW5nLCBleGFjdCwgcmVzLCBvUnVsZSwgY250UmVjKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBkZWJ1Z2xvZyhcImNhdGVnb3JpemUgbm9uIGV4YWN0XCIgKyBzdHJpbmcgKyBcIiB4eCAgXCIgKyBydWxlcy5hbGxSdWxlcy5sZW5ndGgpO1xuICAgICAgICByZXR1cm4gY2F0ZWdvcml6ZVN0cmluZyhzdHJpbmcsIGV4YWN0LCBydWxlcy5hbGxSdWxlcywgY250UmVjKTtcbiAgICB9XG4gICAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZVN0cmluZzIgPSBjYXRlZ29yaXplU3RyaW5nMjtcbi8qKlxuICpcbiAqIE9wdGlvbnMgbWF5IGJlIHtcbiAqIG1hdGNob3RoZXJzIDogdHJ1ZSwgID0+IG9ubHkgcnVsZXMgd2hlcmUgYWxsIG90aGVycyBtYXRjaCBhcmUgY29uc2lkZXJlZFxuICogYXVnbWVudCA6IHRydWUsXG4gKiBvdmVycmlkZSA6IHRydWUgfSAgPT5cbiAqXG4gKi9cbmZ1bmN0aW9uIG1hdGNoV29yZChvUnVsZSwgY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChjb250ZXh0W29SdWxlLmtleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgczIgPSBvUnVsZS53b3JkLnRvTG93ZXJDYXNlKCk7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCwgb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xuICAgICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgYyA9IGNhbGNEaXN0YW5jZShzMiwgczEpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiIHMxIDw+IHMyIFwiICsgczEgKyBcIjw+XCIgKyBzMiArIFwiICA9PjogXCIgKyBjKTtcbiAgICB9XG4gICAgaWYgKGMgPCAxNTApIHtcbiAgICAgICAgdmFyIHJlcyA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpO1xuICAgICAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgY29udGV4dCk7XG4gICAgICAgIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XG4gICAgICAgICAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb1J1bGUuZm9sbG93cyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZm9yY2Uga2V5IHByb3BlcnR5XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCcgb2JqZWN0Y2F0ZWdvcnknLCByZXNbJ3N5c3RlbU9iamVjdENhdGVnb3J5J10pO1xuICAgICAgICByZXNbb1J1bGUua2V5XSA9IG9SdWxlLmZvbGxvd3Nbb1J1bGUua2V5XSB8fCByZXNbb1J1bGUua2V5XTtcbiAgICAgICAgcmVzLl93ZWlnaHQgPSBBbnlPYmplY3QuYXNzaWduKHt9LCByZXMuX3dlaWdodCk7XG4gICAgICAgIHJlcy5fd2VpZ2h0W29SdWxlLmtleV0gPSBjO1xuICAgICAgICBPYmplY3QuZnJlZXplKHJlcyk7XG4gICAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZygnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbmV4cG9ydHMubWF0Y2hXb3JkID0gbWF0Y2hXb3JkO1xuZnVuY3Rpb24gZXh0cmFjdEFyZ3NNYXAobWF0Y2gsIGFyZ3NNYXApIHtcbiAgICB2YXIgcmVzID0ge307XG4gICAgaWYgKCFhcmdzTWFwKSB7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIE9iamVjdC5rZXlzKGFyZ3NNYXApLmZvckVhY2goZnVuY3Rpb24gKGlLZXkpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gbWF0Y2hbaUtleV07XG4gICAgICAgIHZhciBrZXkgPSBhcmdzTWFwW2lLZXldO1xuICAgICAgICBpZiAoKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikgJiYgdmFsdWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmVzW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmV4dHJhY3RBcmdzTWFwID0gZXh0cmFjdEFyZ3NNYXA7XG5leHBvcnRzLlJhbmtXb3JkID0ge1xuICAgIGhhc0Fib3ZlOiBmdW5jdGlvbiAobHN0LCBib3JkZXIpIHtcbiAgICAgICAgcmV0dXJuICFsc3QuZXZlcnkoZnVuY3Rpb24gKG9NZW1iZXIpIHtcbiAgICAgICAgICAgIHJldHVybiAob01lbWJlci5fcmFua2luZyA8IGJvcmRlcik7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgdGFrZUZpcnN0TjogZnVuY3Rpb24gKGxzdCwgbikge1xuICAgICAgICByZXR1cm4gbHN0LmZpbHRlcihmdW5jdGlvbiAob01lbWJlciwgaUluZGV4KSB7XG4gICAgICAgICAgICB2YXIgbGFzdFJhbmtpbmcgPSAxLjA7XG4gICAgICAgICAgICBpZiAoKGlJbmRleCA8IG4pIHx8IG9NZW1iZXIuX3JhbmtpbmcgPT09IGxhc3RSYW5raW5nKSB7XG4gICAgICAgICAgICAgICAgbGFzdFJhbmtpbmcgPSBvTWVtYmVyLl9yYW5raW5nO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIHRha2VBYm92ZTogZnVuY3Rpb24gKGxzdCwgYm9yZGVyKSB7XG4gICAgICAgIHJldHVybiBsc3QuZmlsdGVyKGZ1bmN0aW9uIChvTWVtYmVyKSB7XG4gICAgICAgICAgICByZXR1cm4gKG9NZW1iZXIuX3JhbmtpbmcgPj0gYm9yZGVyKTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcbi8qXG52YXIgZXhhY3RMZW4gPSAwO1xudmFyIGZ1enp5TGVuID0gMDtcbnZhciBmdXp6eUNudCA9IDA7XG52YXIgZXhhY3RDbnQgPSAwO1xudmFyIHRvdGFsQ250ID0gMDtcbnZhciB0b3RhbExlbiA9IDA7XG52YXIgcmV0YWluZWRDbnQgPSAwO1xuXG5leHBvcnQgZnVuY3Rpb24gcmVzZXRDbnQoKSB7XG4gIGV4YWN0TGVuID0gMDtcbiAgZnV6enlMZW4gPSAwO1xuICBmdXp6eUNudCA9IDA7XG4gIGV4YWN0Q250ID0gMDtcbiAgdG90YWxDbnQgPSAwO1xuICB0b3RhbExlbiA9IDA7XG4gIHJldGFpbmVkQ250ID0gMDtcbn1cbiovXG5mdW5jdGlvbiBjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmKHNXb3JkR3JvdXAsIHNwbGl0UnVsZXMsIGNudFJlYykge1xuICAgIHZhciBzZWVuSXQgPSBjYXRlZ29yaXplU3RyaW5nMihzV29yZEdyb3VwLCB0cnVlLCBzcGxpdFJ1bGVzLCBjbnRSZWMpO1xuICAgIC8vdG90YWxDbnQgKz0gMTtcbiAgICAvLyBleGFjdExlbiArPSBzZWVuSXQubGVuZ3RoO1xuICAgIGFkZENudFJlYyhjbnRSZWMsICdjbnRDYXRFeGFjdCcsIDEpO1xuICAgIGFkZENudFJlYyhjbnRSZWMsICdjbnRDYXRFeGFjdFJlcycsIHNlZW5JdC5sZW5ndGgpO1xuICAgIGlmIChleHBvcnRzLlJhbmtXb3JkLmhhc0Fib3ZlKHNlZW5JdCwgMC44KSkge1xuICAgICAgICBpZiAoY250UmVjKSB7XG4gICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLCAnZXhhY3RQcmlvclRha2UnLCBzZWVuSXQubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgICAgICBzZWVuSXQgPSBleHBvcnRzLlJhbmtXb3JkLnRha2VBYm92ZShzZWVuSXQsIDAuOCk7XG4gICAgICAgIGlmIChjbnRSZWMpIHtcbiAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsICdleGFjdEFmdGVyVGFrZScsIHNlZW5JdC5sZW5ndGgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBzZWVuSXQgPSBjYXRlZ29yaXplU3RyaW5nMihzV29yZEdyb3VwLCBmYWxzZSwgc3BsaXRSdWxlcywgY250UmVjKTtcbiAgICAgICAgYWRkQ250UmVjKGNudFJlYywgJ2NudE5vbkV4YWN0JywgMSk7XG4gICAgICAgIGFkZENudFJlYyhjbnRSZWMsICdjbnROb25FeGFjdFJlcycsIHNlZW5JdC5sZW5ndGgpO1xuICAgIH1cbiAgICAvLyB0b3RhbExlbiArPSBzZWVuSXQubGVuZ3RoO1xuICAgIHNlZW5JdCA9IGV4cG9ydHMuUmFua1dvcmQudGFrZUZpcnN0TihzZWVuSXQsIEFsZ29sLlRvcF9OX1dvcmRDYXRlZ29yaXphdGlvbnMpO1xuICAgIC8vIHJldGFpbmVkQ250ICs9IHNlZW5JdC5sZW5ndGg7XG4gICAgcmV0dXJuIHNlZW5JdDtcbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZiA9IGNhdGVnb3JpemVXb3JkV2l0aFJhbmtDdXRvZmY7XG4vKlxuZXhwb3J0IGZ1bmN0aW9uIGR1bXBDbnQoKSB7XG4gIGNvbnNvbGUubG9nKGBcbmV4YWN0TGVuID0gJHtleGFjdExlbn07XG5leGFjdENudCA9ICR7ZXhhY3RDbnR9O1xuZnV6enlMZW4gPSAke2Z1enp5TGVufTtcbmZ1enp5Q250ID0gJHtmdXp6eUNudH07XG50b3RhbENudCA9ICR7dG90YWxDbnR9O1xudG90YWxMZW4gPSAke3RvdGFsTGVufTtcbnJldGFpbmVkTGVuID0gJHtyZXRhaW5lZENudH07XG4gIGApO1xufVxuKi9cbmZ1bmN0aW9uIGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZFNlbnRlbmNlKG9TZW50ZW5jZSkge1xuICAgIHJldHVybiBvU2VudGVuY2UuZXZlcnkoZnVuY3Rpb24gKG9Xb3JkR3JvdXApIHtcbiAgICAgICAgcmV0dXJuIChvV29yZEdyb3VwLmxlbmd0aCA+IDApO1xuICAgIH0pO1xufVxuZXhwb3J0cy5maWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWRTZW50ZW5jZSA9IGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZFNlbnRlbmNlO1xuZnVuY3Rpb24gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkKGFycikge1xuICAgIHJldHVybiBhcnIuZmlsdGVyKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgcmV0dXJuIGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZFNlbnRlbmNlKG9TZW50ZW5jZSk7XG4gICAgfSk7XG59XG5leHBvcnRzLmZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZCA9IGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZDtcbmZ1bmN0aW9uIGNhdGVnb3JpemVBV29yZChzV29yZEdyb3VwLCBydWxlcywgc1N0cmluZywgd29yZHMsIGNudFJlYykge1xuICAgIHZhciBzZWVuSXQgPSB3b3Jkc1tzV29yZEdyb3VwXTtcbiAgICBpZiAoc2Vlbkl0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgc2Vlbkl0ID0gY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZihzV29yZEdyb3VwLCBydWxlcywgY250UmVjKTtcbiAgICAgICAgdXRpbHMuZGVlcEZyZWV6ZShzZWVuSXQpO1xuICAgICAgICB3b3Jkc1tzV29yZEdyb3VwXSA9IHNlZW5JdDtcbiAgICB9XG4gICAgaWYgKCFzZWVuSXQgfHwgc2Vlbkl0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBsb2dnZXIoXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBcXFwiXCIgKyBzV29yZEdyb3VwICsgXCJcXFwiIGluIHNlbnRlbmNlIFxcXCJcIlxuICAgICAgICAgICAgKyBzU3RyaW5nICsgXCJcXFwiXCIpO1xuICAgICAgICBpZiAoc1dvcmRHcm91cC5pbmRleE9mKFwiIFwiKSA8PSAwKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZyhcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIHByaW1pdGl2ZSAoISlcIiArIHNXb3JkR3JvdXApO1xuICAgICAgICB9XG4gICAgICAgIGRlYnVnbG9nKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgXCIgKyBzV29yZEdyb3VwKTtcbiAgICAgICAgaWYgKCFzZWVuSXQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGluZyBlbXRweSBsaXN0LCBub3QgdW5kZWZpbmVkIGZvciBcXFwiXCIgKyBzV29yZEdyb3VwICsgXCJcXFwiXCIpO1xuICAgICAgICB9XG4gICAgICAgIHdvcmRzW3NXb3JkR3JvdXBdID0gW107XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgcmV0dXJuIHV0aWxzLmNsb25lRGVlcChzZWVuSXQpO1xufVxuZXhwb3J0cy5jYXRlZ29yaXplQVdvcmQgPSBjYXRlZ29yaXplQVdvcmQ7XG4vKipcbiAqIEdpdmVuIGEgIHN0cmluZywgYnJlYWsgaXQgZG93biBpbnRvIGNvbXBvbmVudHMsXG4gKiBbWydBJywgJ0InXSwgWydBIEInXV1cbiAqXG4gKiB0aGVuIGNhdGVnb3JpemVXb3Jkc1xuICogcmV0dXJuaW5nXG4gKlxuICogWyBbWyB7IGNhdGVnb3J5OiAnc3lzdGVtSWQnLCB3b3JkIDogJ0EnfSxcbiAqICAgICAgeyBjYXRlZ29yeTogJ290aGVydGhpbmcnLCB3b3JkIDogJ0EnfVxuICogICAgXSxcbiAqICAgIC8vIHJlc3VsdCBvZiBCXG4gKiAgICBbIHsgY2F0ZWdvcnk6ICdzeXN0ZW1JZCcsIHdvcmQgOiAnQid9LFxuICogICAgICB7IGNhdGVnb3J5OiAnb3RoZXJ0aGluZycsIHdvcmQgOiAnQSd9XG4gKiAgICAgIHsgY2F0ZWdvcnk6ICdhbm90aGVydHJ5cCcsIHdvcmQgOiAnQid9XG4gKiAgICBdXG4gKiAgIF0sXG4gKiBdXV1cbiAqXG4gKlxuICpcbiAqL1xuZnVuY3Rpb24gYW5hbHl6ZVN0cmluZyhzU3RyaW5nLCBydWxlcywgd29yZHMpIHtcbiAgICB2YXIgY250ID0gMDtcbiAgICB2YXIgZmFjID0gMTtcbiAgICB2YXIgdSA9IGJyZWFrZG93bi5icmVha2Rvd25TdHJpbmcoc1N0cmluZywgQWxnb2wuTWF4U3BhY2VzUGVyQ29tYmluZWRXb3JkKTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcImhlcmUgYnJlYWtkb3duXCIgKyBKU09OLnN0cmluZ2lmeSh1KSk7XG4gICAgfVxuICAgIC8vY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkodSkpO1xuICAgIHdvcmRzID0gd29yZHMgfHwge307XG4gICAgZGVidWdwZXJmKCd0aGlzIG1hbnkga25vd24gd29yZHM6ICcgKyBPYmplY3Qua2V5cyh3b3JkcykubGVuZ3RoKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgdmFyIGNudFJlYyA9IHt9O1xuICAgIHUuZm9yRWFjaChmdW5jdGlvbiAoYUJyZWFrRG93blNlbnRlbmNlKSB7XG4gICAgICAgIHZhciBjYXRlZ29yaXplZFNlbnRlbmNlID0gW107XG4gICAgICAgIHZhciBpc1ZhbGlkID0gYUJyZWFrRG93blNlbnRlbmNlLmV2ZXJ5KGZ1bmN0aW9uIChzV29yZEdyb3VwLCBpbmRleCkge1xuICAgICAgICAgICAgdmFyIHNlZW5JdCA9IGNhdGVnb3JpemVBV29yZChzV29yZEdyb3VwLCBydWxlcywgc1N0cmluZywgd29yZHMsIGNudFJlYyk7XG4gICAgICAgICAgICBpZiAoc2Vlbkl0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGVnb3JpemVkU2VudGVuY2VbaW5kZXhdID0gc2Vlbkl0O1xuICAgICAgICAgICAgY250ID0gY250ICsgc2Vlbkl0Lmxlbmd0aDtcbiAgICAgICAgICAgIGZhYyA9IGZhYyAqIHNlZW5JdC5sZW5ndGg7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChpc1ZhbGlkKSB7XG4gICAgICAgICAgICByZXMucHVzaChjYXRlZ29yaXplZFNlbnRlbmNlKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGRlYnVnbG9nKFwiIHNlbnRlbmNlcyBcIiArIHUubGVuZ3RoICsgXCIgbWF0Y2hlcyBcIiArIGNudCArIFwiIGZhYzogXCIgKyBmYWMpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkICYmIHUubGVuZ3RoKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiZmlyc3QgbWF0Y2ggXCIgKyBKU09OLnN0cmluZ2lmeSh1LCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgZGVidWdwZXJmKFwiIHNlbnRlbmNlcyBcIiArIHUubGVuZ3RoICsgXCIgLyBcIiArIHJlcy5sZW5ndGggKyBcIiBtYXRjaGVzIFwiICsgY250ICsgXCIgZmFjOiBcIiArIGZhYyArIFwiIHJlYyA6IFwiICsgSlNPTi5zdHJpbmdpZnkoY250UmVjLCB1bmRlZmluZWQsIDIpKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5hbmFseXplU3RyaW5nID0gYW5hbHl6ZVN0cmluZztcbi8qXG5bIFthLGJdLCBbYyxkXV1cblxuMDAgYVxuMDEgYlxuMTAgY1xuMTEgZFxuMTIgY1xuKi9cbnZhciBjbG9uZSA9IHV0aWxzLmNsb25lRGVlcDtcbmZ1bmN0aW9uIGNvcHlWZWNNZW1iZXJzKHUpIHtcbiAgICB2YXIgaSA9IDA7XG4gICAgZm9yIChpID0gMDsgaSA8IHUubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdVtpXSA9IGNsb25lKHVbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gdTtcbn1cbi8vIHdlIGNhbiByZXBsaWNhdGUgdGhlIHRhaWwgb3IgdGhlIGhlYWQsXG4vLyB3ZSByZXBsaWNhdGUgdGhlIHRhaWwgYXMgaXQgaXMgc21hbGxlci5cbi8vIFthLGIsYyBdXG5mdW5jdGlvbiBleHBhbmRNYXRjaEFycihkZWVwKSB7XG4gICAgdmFyIGEgPSBbXTtcbiAgICB2YXIgbGluZSA9IFtdO1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyBKU09OLnN0cmluZ2lmeShkZWVwKSA6ICctJyk7XG4gICAgZGVlcC5mb3JFYWNoKGZ1bmN0aW9uICh1QnJlYWtEb3duTGluZSwgaUluZGV4KSB7XG4gICAgICAgIGxpbmVbaUluZGV4XSA9IFtdO1xuICAgICAgICB1QnJlYWtEb3duTGluZS5mb3JFYWNoKGZ1bmN0aW9uIChhV29yZEdyb3VwLCB3Z0luZGV4KSB7XG4gICAgICAgICAgICBsaW5lW2lJbmRleF1bd2dJbmRleF0gPSBbXTtcbiAgICAgICAgICAgIGFXb3JkR3JvdXAuZm9yRWFjaChmdW5jdGlvbiAob1dvcmRWYXJpYW50LCBpV1ZJbmRleCkge1xuICAgICAgICAgICAgICAgIGxpbmVbaUluZGV4XVt3Z0luZGV4XVtpV1ZJbmRleF0gPSBvV29yZFZhcmlhbnQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkobGluZSkpO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICB2YXIgbnZlY3MgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpbmUubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIHZlY3MgPSBbW11dO1xuICAgICAgICB2YXIgbnZlY3MgPSBbXTtcbiAgICAgICAgdmFyIHJ2ZWMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCBsaW5lW2ldLmxlbmd0aDsgKytrKSB7XG4gICAgICAgICAgICAvL3ZlY3MgaXMgdGhlIHZlY3RvciBvZiBhbGwgc28gZmFyIHNlZW4gdmFyaWFudHMgdXAgdG8gayB3Z3MuXG4gICAgICAgICAgICB2YXIgbmV4dEJhc2UgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGwgPSAwOyBsIDwgbGluZVtpXVtrXS5sZW5ndGg7ICsrbCkge1xuICAgICAgICAgICAgICAgIC8vZGVidWdsb2coXCJ2ZWNzIG5vd1wiICsgSlNPTi5zdHJpbmdpZnkodmVjcykpO1xuICAgICAgICAgICAgICAgIG52ZWNzID0gW107IC8vdmVjcy5zbGljZSgpOyAvLyBjb3B5IHRoZSB2ZWNbaV0gYmFzZSB2ZWN0b3I7XG4gICAgICAgICAgICAgICAgLy9kZWJ1Z2xvZyhcInZlY3MgY29waWVkIG5vd1wiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciB1ID0gMDsgdSA8IHZlY3MubGVuZ3RoOyArK3UpIHtcbiAgICAgICAgICAgICAgICAgICAgbnZlY3NbdV0gPSB2ZWNzW3VdLnNsaWNlKCk7IC8vXG4gICAgICAgICAgICAgICAgICAgIG52ZWNzW3VdID0gY29weVZlY01lbWJlcnMobnZlY3NbdV0pO1xuICAgICAgICAgICAgICAgICAgICAvLyBkZWJ1Z2xvZyhcImNvcGllZCB2ZWNzW1wiKyB1K1wiXVwiICsgSlNPTi5zdHJpbmdpZnkodmVjc1t1XSkpO1xuICAgICAgICAgICAgICAgICAgICBudmVjc1t1XS5wdXNoKGNsb25lKGxpbmVbaV1ba11bbF0pKTsgLy8gcHVzaCB0aGUgbHRoIHZhcmlhbnRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gICBkZWJ1Z2xvZyhcIiBhdCAgICAgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbmV4dGJhc2UgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxuICAgICAgICAgICAgICAgIC8vICAgZGVidWdsb2coXCIgYXBwZW5kIFwiICsgayArIFwiOlwiICsgbCArIFwiIG52ZWNzICAgID5cIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSlcbiAgICAgICAgICAgICAgICBuZXh0QmFzZSA9IG5leHRCYXNlLmNvbmNhdChudmVjcyk7XG4gICAgICAgICAgICB9IC8vY29uc3RydVxuICAgICAgICAgICAgLy8gIGRlYnVnbG9nKFwibm93IGF0IFwiICsgayArIFwiOlwiICsgbCArIFwiID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcbiAgICAgICAgICAgIHZlY3MgPSBuZXh0QmFzZTtcbiAgICAgICAgfVxuICAgICAgICBkZWJ1Z2xvZ1YoZGVidWdsb2dWLmVuYWJsZWQgPyAoXCJBUFBFTkRJTkcgVE8gUkVTXCIgKyBpICsgXCI6XCIgKyBsICsgXCIgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKSA6ICctJyk7XG4gICAgICAgIHJlcyA9IHJlcy5jb25jYXQodmVjcyk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmV4cGFuZE1hdGNoQXJyID0gZXhwYW5kTWF0Y2hBcnI7XG4vKipcbiAqIENhbGN1bGF0ZSBhIHdlaWdodCBmYWN0b3IgZm9yIGEgZ2l2ZW4gZGlzdGFuY2UgYW5kXG4gKiBjYXRlZ29yeVxuICogQHBhcmFtIHtpbnRlZ2VyfSBkaXN0IGRpc3RhbmNlIGluIHdvcmRzXG4gKiBAcGFyYW0ge3N0cmluZ30gY2F0ZWdvcnkgY2F0ZWdvcnkgdG8gdXNlXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBhIGRpc3RhbmNlIGZhY3RvciA+PSAxXG4gKiAgMS4wIGZvciBubyBlZmZlY3RcbiAqL1xuZnVuY3Rpb24gcmVpbmZvcmNlRGlzdFdlaWdodChkaXN0LCBjYXRlZ29yeSkge1xuICAgIHZhciBhYnMgPSBNYXRoLmFicyhkaXN0KTtcbiAgICByZXR1cm4gMS4wICsgKEFsZ29sLmFSZWluZm9yY2VEaXN0V2VpZ2h0W2Fic10gfHwgMCk7XG59XG5leHBvcnRzLnJlaW5mb3JjZURpc3RXZWlnaHQgPSByZWluZm9yY2VEaXN0V2VpZ2h0O1xuLyoqXG4gKiBHaXZlbiBhIHNlbnRlbmNlLCBleHRhY3QgY2F0ZWdvcmllc1xuICovXG5mdW5jdGlvbiBleHRyYWN0Q2F0ZWdvcnlNYXAob1NlbnRlbmNlKSB7XG4gICAgdmFyIHJlcyA9IHt9O1xuICAgIGRlYnVnbG9nKCdleHRyYWN0Q2F0ZWdvcnlNYXAgJyArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSkpO1xuICAgIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaUluZGV4KSB7XG4gICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gSUZNYXRjaC5DQVRfQ0FURUdPUlkpIHtcbiAgICAgICAgICAgIHJlc1tvV29yZC5tYXRjaGVkU3RyaW5nXSA9IHJlc1tvV29yZC5tYXRjaGVkU3RyaW5nXSB8fCBbXTtcbiAgICAgICAgICAgIHJlc1tvV29yZC5tYXRjaGVkU3RyaW5nXS5wdXNoKHsgcG9zOiBpSW5kZXggfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICB1dGlscy5kZWVwRnJlZXplKHJlcyk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZXh0cmFjdENhdGVnb3J5TWFwID0gZXh0cmFjdENhdGVnb3J5TWFwO1xuZnVuY3Rpb24gcmVpbkZvcmNlU2VudGVuY2Uob1NlbnRlbmNlKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgdmFyIG9DYXRlZ29yeU1hcCA9IGV4dHJhY3RDYXRlZ29yeU1hcChvU2VudGVuY2UpO1xuICAgIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaUluZGV4KSB7XG4gICAgICAgIHZhciBtID0gb0NhdGVnb3J5TWFwW29Xb3JkLmNhdGVnb3J5XSB8fCBbXTtcbiAgICAgICAgbS5mb3JFYWNoKGZ1bmN0aW9uIChvUG9zaXRpb24pIHtcbiAgICAgICAgICAgIFwidXNlIHN0cmljdFwiO1xuICAgICAgICAgICAgb1dvcmQucmVpbmZvcmNlID0gb1dvcmQucmVpbmZvcmNlIHx8IDE7XG4gICAgICAgICAgICB2YXIgYm9vc3QgPSByZWluZm9yY2VEaXN0V2VpZ2h0KGlJbmRleCAtIG9Qb3NpdGlvbi5wb3MsIG9Xb3JkLmNhdGVnb3J5KTtcbiAgICAgICAgICAgIG9Xb3JkLnJlaW5mb3JjZSAqPSBib29zdDtcbiAgICAgICAgICAgIG9Xb3JkLl9yYW5raW5nICo9IGJvb3N0O1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGlJbmRleCkge1xuICAgICAgICBpZiAoaUluZGV4ID4gMCkge1xuICAgICAgICAgICAgaWYgKG9TZW50ZW5jZVtpSW5kZXggLSAxXS5jYXRlZ29yeSA9PT0gXCJtZXRhXCIgJiYgKG9Xb3JkLmNhdGVnb3J5ID09PSBvU2VudGVuY2VbaUluZGV4IC0gMV0ubWF0Y2hlZFN0cmluZykpIHtcbiAgICAgICAgICAgICAgICBvV29yZC5yZWluZm9yY2UgPSBvV29yZC5yZWluZm9yY2UgfHwgMTtcbiAgICAgICAgICAgICAgICB2YXIgYm9vc3QgPSByZWluZm9yY2VEaXN0V2VpZ2h0KDEsIG9Xb3JkLmNhdGVnb3J5KTtcbiAgICAgICAgICAgICAgICBvV29yZC5yZWluZm9yY2UgKj0gYm9vc3Q7XG4gICAgICAgICAgICAgICAgb1dvcmQuX3JhbmtpbmcgKj0gYm9vc3Q7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gb1NlbnRlbmNlO1xufVxuZXhwb3J0cy5yZWluRm9yY2VTZW50ZW5jZSA9IHJlaW5Gb3JjZVNlbnRlbmNlO1xudmFyIFNlbnRlbmNlID0gcmVxdWlyZSgnLi9zZW50ZW5jZScpO1xuZnVuY3Rpb24gcmVpbkZvcmNlKGFDYXRlZ29yaXplZEFycmF5KSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgYUNhdGVnb3JpemVkQXJyYXkuZm9yRWFjaChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgIHJlaW5Gb3JjZVNlbnRlbmNlKG9TZW50ZW5jZSk7XG4gICAgfSk7XG4gICAgYUNhdGVnb3JpemVkQXJyYXkuc29ydChTZW50ZW5jZS5jbXBSYW5raW5nUHJvZHVjdCk7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCJhZnRlciByZWluZm9yY2VcIiArIGFDYXRlZ29yaXplZEFycmF5Lm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICAgICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgfVxuICAgIHJldHVybiBhQ2F0ZWdvcml6ZWRBcnJheTtcbn1cbmV4cG9ydHMucmVpbkZvcmNlID0gcmVpbkZvcmNlO1xuLy8vIGJlbG93IG1heSBubyBsb25nZXIgYmUgdXNlZFxuZnVuY3Rpb24gbWF0Y2hSZWdFeHAob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAoY29udGV4dFtvUnVsZS5rZXldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIHNLZXkgPSBvUnVsZS5rZXk7XG4gICAgdmFyIHMxID0gY29udGV4dFtvUnVsZS5rZXldLnRvTG93ZXJDYXNlKCk7XG4gICAgdmFyIHJlZyA9IG9SdWxlLnJlZ2V4cDtcbiAgICB2YXIgbSA9IHJlZy5leGVjKHMxKTtcbiAgICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2dWKFwiYXBwbHlpbmcgcmVnZXhwOiBcIiArIHMxICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XG4gICAgfVxuICAgIGlmICghbSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB2YXIgZGVsdGEgPSBjb21wYXJlQ29udGV4dChjb250ZXh0LCBvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpO1xuICAgIGlmIChkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZ1YoSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcbiAgICAgICAgZGVidWdsb2dWKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBvRXh0cmFjdGVkQ29udGV4dCA9IGV4dHJhY3RBcmdzTWFwKG0sIG9SdWxlLmFyZ3NNYXApO1xuICAgIGlmIChkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZ1YoXCJleHRyYWN0ZWQgYXJncyBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLmFyZ3NNYXApKTtcbiAgICAgICAgZGVidWdsb2dWKFwibWF0Y2ggXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XG4gICAgICAgIGRlYnVnbG9nVihcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob0V4dHJhY3RlZENvbnRleHQpKTtcbiAgICB9XG4gICAgdmFyIHJlcyA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpO1xuICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvRXh0cmFjdGVkQ29udGV4dCk7XG4gICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIGNvbnRleHQpO1xuICAgIGlmIChvRXh0cmFjdGVkQ29udGV4dFtzS2V5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlc1tzS2V5XSA9IG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xuICAgICAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb1J1bGUuZm9sbG93cyk7XG4gICAgICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvRXh0cmFjdGVkQ29udGV4dCk7XG4gICAgfVxuICAgIE9iamVjdC5mcmVlemUocmVzKTtcbiAgICBkZWJ1Z2xvZygnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMubWF0Y2hSZWdFeHAgPSBtYXRjaFJlZ0V4cDtcbmZ1bmN0aW9uIHNvcnRCeVdlaWdodChzS2V5LCBvQ29udGV4dEEsIG9Db250ZXh0Qikge1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nVignc29ydGluZzogJyArIHNLZXkgKyAnaW52b2tlZCB3aXRoXFxuIDE6JyArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QSwgdW5kZWZpbmVkLCAyKSArXG4gICAgICAgICAgICBcIiB2cyBcXG4gMjpcIiArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QiwgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHZhciByYW5raW5nQSA9IHBhcnNlRmxvYXQob0NvbnRleHRBW1wiX3JhbmtpbmdcIl0gfHwgXCIxXCIpO1xuICAgIHZhciByYW5raW5nQiA9IHBhcnNlRmxvYXQob0NvbnRleHRCW1wiX3JhbmtpbmdcIl0gfHwgXCIxXCIpO1xuICAgIGlmIChyYW5raW5nQSAhPT0gcmFua2luZ0IpIHtcbiAgICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgICAgIGRlYnVnbG9nKFwiIHJhbmtpbiBkZWx0YVwiICsgMTAwICogKHJhbmtpbmdCIC0gcmFua2luZ0EpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMTAwICogKHJhbmtpbmdCIC0gcmFua2luZ0EpO1xuICAgIH1cbiAgICB2YXIgd2VpZ2h0QSA9IG9Db250ZXh0QVtcIl93ZWlnaHRcIl0gJiYgb0NvbnRleHRBW1wiX3dlaWdodFwiXVtzS2V5XSB8fCAwO1xuICAgIHZhciB3ZWlnaHRCID0gb0NvbnRleHRCW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdW3NLZXldIHx8IDA7XG4gICAgcmV0dXJuICsod2VpZ2h0QSAtIHdlaWdodEIpO1xufVxuZXhwb3J0cy5zb3J0QnlXZWlnaHQgPSBzb3J0QnlXZWlnaHQ7XG4vLyBXb3JkLCBTeW5vbnltLCBSZWdleHAgLyBFeHRyYWN0aW9uUnVsZVxuZnVuY3Rpb24gYXVnbWVudENvbnRleHQxKGNvbnRleHQsIG9SdWxlcywgb3B0aW9ucykge1xuICAgIHZhciBzS2V5ID0gb1J1bGVzWzBdLmtleTtcbiAgICAvLyBjaGVjayB0aGF0IHJ1bGVcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAvLyBjaGVjayBjb25zaXN0ZW5jeVxuICAgICAgICBvUnVsZXMuZXZlcnkoZnVuY3Rpb24gKGlSdWxlKSB7XG4gICAgICAgICAgICBpZiAoaVJ1bGUua2V5ICE9PSBzS2V5KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW5ob21vZ2Vub3VzIGtleXMgaW4gcnVsZXMsIGV4cGVjdGVkIFwiICsgc0tleSArIFwiIHdhcyBcIiArIEpTT04uc3RyaW5naWZ5KGlSdWxlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8vIGxvb2sgZm9yIHJ1bGVzIHdoaWNoIG1hdGNoXG4gICAgdmFyIHJlcyA9IG9SdWxlcy5tYXAoZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgIC8vIGlzIHRoaXMgcnVsZSBhcHBsaWNhYmxlXG4gICAgICAgIHN3aXRjaCAob1J1bGUudHlwZSkge1xuICAgICAgICAgICAgY2FzZSAwIC8qIFdPUkQgKi86XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hdGNoV29yZChvUnVsZSwgY29udGV4dCwgb3B0aW9ucyk7XG4gICAgICAgICAgICBjYXNlIDEgLyogUkVHRVhQICovOlxuICAgICAgICAgICAgICAgIHJldHVybiBtYXRjaFJlZ0V4cChvUnVsZSwgY29udGV4dCwgb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9KS5maWx0ZXIoZnVuY3Rpb24gKG9yZXMpIHtcbiAgICAgICAgcmV0dXJuICEhb3JlcztcbiAgICB9KS5zb3J0KHNvcnRCeVdlaWdodC5iaW5kKHRoaXMsIHNLZXkpKTtcbiAgICByZXR1cm4gcmVzO1xuICAgIC8vIE9iamVjdC5rZXlzKCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xuICAgIC8vIH0pO1xufVxuZXhwb3J0cy5hdWdtZW50Q29udGV4dDEgPSBhdWdtZW50Q29udGV4dDE7XG5mdW5jdGlvbiBhdWdtZW50Q29udGV4dChjb250ZXh0LCBhUnVsZXMpIHtcbiAgICB2YXIgb3B0aW9uczEgPSB7XG4gICAgICAgIG1hdGNob3RoZXJzOiB0cnVlLFxuICAgICAgICBvdmVycmlkZTogZmFsc2VcbiAgICB9O1xuICAgIHZhciBhUmVzID0gYXVnbWVudENvbnRleHQxKGNvbnRleHQsIGFSdWxlcywgb3B0aW9uczEpO1xuICAgIGlmIChhUmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB2YXIgb3B0aW9uczIgPSB7XG4gICAgICAgICAgICBtYXRjaG90aGVyczogZmFsc2UsXG4gICAgICAgICAgICBvdmVycmlkZTogdHJ1ZVxuICAgICAgICB9O1xuICAgICAgICBhUmVzID0gYXVnbWVudENvbnRleHQxKGNvbnRleHQsIGFSdWxlcywgb3B0aW9uczIpO1xuICAgIH1cbiAgICByZXR1cm4gYVJlcztcbn1cbmV4cG9ydHMuYXVnbWVudENvbnRleHQgPSBhdWdtZW50Q29udGV4dDtcbmZ1bmN0aW9uIGluc2VydE9yZGVyZWQocmVzdWx0LCBpSW5zZXJ0ZWRNZW1iZXIsIGxpbWl0KSB7XG4gICAgLy8gVE9ETzogdXNlIHNvbWUgd2VpZ2h0XG4gICAgaWYgKHJlc3VsdC5sZW5ndGggPCBsaW1pdCkge1xuICAgICAgICByZXN1bHQucHVzaChpSW5zZXJ0ZWRNZW1iZXIpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuZXhwb3J0cy5pbnNlcnRPcmRlcmVkID0gaW5zZXJ0T3JkZXJlZDtcbmZ1bmN0aW9uIHRha2VUb3BOKGFycikge1xuICAgIHZhciB1ID0gYXJyLmZpbHRlcihmdW5jdGlvbiAoaW5uZXJBcnIpIHsgcmV0dXJuIGlubmVyQXJyLmxlbmd0aCA+IDA7IH0pO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICAvLyBzaGlmdCBvdXQgdGhlIHRvcCBvbmVzXG4gICAgdSA9IHUubWFwKGZ1bmN0aW9uIChpQXJyKSB7XG4gICAgICAgIHZhciB0b3AgPSBpQXJyLnNoaWZ0KCk7XG4gICAgICAgIHJlcyA9IGluc2VydE9yZGVyZWQocmVzLCB0b3AsIDUpO1xuICAgICAgICByZXR1cm4gaUFycjtcbiAgICB9KS5maWx0ZXIoZnVuY3Rpb24gKGlubmVyQXJyKSB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwOyB9KTtcbiAgICAvLyBhcyBBcnJheTxBcnJheTxJRk1hdGNoLmNvbnRleHQ+PlxuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLnRha2VUb3BOID0gdGFrZVRvcE47XG52YXIgaW5wdXRGaWx0ZXJSdWxlcyA9IHJlcXVpcmUoJy4vaW5wdXRGaWx0ZXJSdWxlcycpO1xudmFyIHJtO1xuZnVuY3Rpb24gZ2V0Uk1PbmNlKCkge1xuICAgIGlmICghcm0pIHtcbiAgICAgICAgcm0gPSBpbnB1dEZpbHRlclJ1bGVzLmdldFJ1bGVNYXAoKTtcbiAgICB9XG4gICAgcmV0dXJuIHJtO1xufVxuZnVuY3Rpb24gYXBwbHlSdWxlcyhjb250ZXh0KSB7XG4gICAgdmFyIGJlc3ROID0gW2NvbnRleHRdO1xuICAgIGlucHV0RmlsdGVyUnVsZXMub0tleU9yZGVyLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgICAgdmFyIGJlc3ROZXh0ID0gW107XG4gICAgICAgIGJlc3ROLmZvckVhY2goZnVuY3Rpb24gKG9Db250ZXh0KSB7XG4gICAgICAgICAgICBpZiAob0NvbnRleHRbc0tleV0pIHtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZygnKiogYXBwbHlpbmcgcnVsZXMgZm9yICcgKyBzS2V5KTtcbiAgICAgICAgICAgICAgICB2YXIgcmVzID0gYXVnbWVudENvbnRleHQob0NvbnRleHQsIGdldFJNT25jZSgpW3NLZXldIHx8IFtdKTtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZygnKiogcmVzdWx0IGZvciAnICsgc0tleSArICcgPSAnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgICAgICAgICBiZXN0TmV4dC5wdXNoKHJlcyB8fCBbXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBydWxlIG5vdCByZWxldmFudFxuICAgICAgICAgICAgICAgIGJlc3ROZXh0LnB1c2goW29Db250ZXh0XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBiZXN0TiA9IHRha2VUb3BOKGJlc3ROZXh0KTtcbiAgICB9KTtcbiAgICByZXR1cm4gYmVzdE47XG59XG5leHBvcnRzLmFwcGx5UnVsZXMgPSBhcHBseVJ1bGVzO1xuZnVuY3Rpb24gYXBwbHlSdWxlc1BpY2tGaXJzdChjb250ZXh0KSB7XG4gICAgdmFyIHIgPSBhcHBseVJ1bGVzKGNvbnRleHQpO1xuICAgIHJldHVybiByICYmIHJbMF07XG59XG5leHBvcnRzLmFwcGx5UnVsZXNQaWNrRmlyc3QgPSBhcHBseVJ1bGVzUGlja0ZpcnN0O1xuLyoqXG4gKiBEZWNpZGUgd2hldGhlciB0byByZXF1ZXJ5IGZvciBhIGNvbnRldFxuICovXG5mdW5jdGlvbiBkZWNpZGVPblJlUXVlcnkoY29udGV4dCkge1xuICAgIHJldHVybiBbXTtcbn1cbmV4cG9ydHMuZGVjaWRlT25SZVF1ZXJ5ID0gZGVjaWRlT25SZVF1ZXJ5O1xuIiwiLyoqXHJcbiAqIHRoZSBpbnB1dCBmaWx0ZXIgc3RhZ2UgcHJlcHJvY2Vzc2VzIGEgY3VycmVudCBjb250ZXh0XHJcbiAqXHJcbiAqIEl0IGEpIGNvbWJpbmVzIG11bHRpLXNlZ21lbnQgYXJndW1lbnRzIGludG8gb25lIGNvbnRleHQgbWVtYmVyc1xyXG4gKiBJdCBiKSBhdHRlbXB0cyB0byBhdWdtZW50IHRoZSBjb250ZXh0IGJ5IGFkZGl0aW9uYWwgcXVhbGlmaWNhdGlvbnNcclxuICogICAgICAgICAgIChNaWQgdGVybSBnZW5lcmF0aW5nIEFsdGVybmF0aXZlcywgZS5nLlxyXG4gKiAgICAgICAgICAgICAgICAgQ2xpZW50U2lkZVRhcmdldFJlc29sdXRpb24gLT4gdW5pdCB0ZXN0P1xyXG4gKiAgICAgICAgICAgICAgICAgQ2xpZW50U2lkZVRhcmdldFJlc29sdXRpb24gLT4gc291cmNlID9cclxuICogICAgICAgICAgIClcclxuICogIFNpbXBsZSBydWxlcyBsaWtlICBJbnRlbnRcclxuICpcclxuICpcclxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuaW5wdXRGaWx0ZXJcclxuICogQGZpbGUgaW5wdXRGaWx0ZXIudHNcclxuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxyXG4gKi9cclxuLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vbGliL25vZGUtNC5kLnRzXCIgLz5cclxuaW1wb3J0ICogYXMgZGlzdGFuY2UgZnJvbSAnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluJztcclxuXHJcbmltcG9ydCAqIGFzIExvZ2dlciBmcm9tICcuLi91dGlscy9sb2dnZXInXHJcblxyXG5jb25zdCBsb2dnZXIgPSBMb2dnZXIubG9nZ2VyKCdpbnB1dEZpbHRlcicpO1xyXG5cclxuaW1wb3J0ICogYXMgZGVidWcgZnJvbSAnZGVidWcnO1xyXG52YXIgZGVidWdwZXJmID0gZGVidWcoJ3BlcmYnKTtcclxuXHJcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gJy4uL3V0aWxzL3V0aWxzJztcclxuXHJcblxyXG5pbXBvcnQgKiBhcyBBbGdvbCBmcm9tICcuL2FsZ29sJztcclxuXHJcbmltcG9ydCAqIGFzIElNYXRjaCBmcm9tICcuL2lmbWF0Y2gnO1xyXG5cclxuaW1wb3J0ICogYXMgYnJlYWtkb3duIGZyb20gJy4vYnJlYWtkb3duJztcclxuXHJcbmNvbnN0IEFueU9iamVjdCA9IDxhbnk+T2JqZWN0O1xyXG5cclxuY29uc3QgZGVidWdsb2cgPSBkZWJ1ZygnaW5wdXRGaWx0ZXInKVxyXG5jb25zdCBkZWJ1Z2xvZ1YgPSBkZWJ1ZygnaW5wdXRWRmlsdGVyJylcclxuY29uc3QgZGVidWdsb2dNID0gZGVidWcoJ2lucHV0TUZpbHRlcicpXHJcblxyXG5cclxuXHJcbmltcG9ydCAqIGFzIG1hdGNoZGF0YSBmcm9tICcuL21hdGNoZGF0YSc7XHJcbnZhciBvVW5pdFRlc3RzID0gbWF0Y2hkYXRhLm9Vbml0VGVzdHNcclxuXHJcbi8qKlxyXG4gKiBAcGFyYW0gc1RleHQge3N0cmluZ30gdGhlIHRleHQgdG8gbWF0Y2ggdG8gTmF2VGFyZ2V0UmVzb2x1dGlvblxyXG4gKiBAcGFyYW0gc1RleHQyIHtzdHJpbmd9IHRoZSBxdWVyeSB0ZXh0LCBlLmcuIE5hdlRhcmdldFxyXG4gKlxyXG4gKiBAcmV0dXJuIHRoZSBkaXN0YW5jZSwgbm90ZSB0aGF0IGlzIGlzICpub3QqIHN5bW1ldHJpYyFcclxuICovXHJcbmZ1bmN0aW9uIGNhbGNEaXN0YW5jZShzVGV4dDE6IHN0cmluZywgc1RleHQyOiBzdHJpbmcpOiBudW1iZXIge1xyXG4gIC8vIGNvbnNvbGUubG9nKFwibGVuZ3RoMlwiICsgc1RleHQxICsgXCIgLSBcIiArIHNUZXh0MilcclxuICAgaWYoKChzVGV4dDEubGVuZ3RoIC0gc1RleHQyLmxlbmd0aCkgPiBBbGdvbC5jYWxjRGlzdC5sZW5ndGhEZWx0YTEpXHJcbiAgICB8fCAoc1RleHQyLmxlbmd0aCA+IDEuNSAqIHNUZXh0MS5sZW5ndGggKVxyXG4gICAgfHwgKHNUZXh0Mi5sZW5ndGggPCAoc1RleHQxLmxlbmd0aC8yKSkgKSB7XHJcbiAgICByZXR1cm4gNTAwMDA7XHJcbiAgfVxyXG4gIHZhciBhMCA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCksIHNUZXh0MilcclxuICBpZihkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xyXG4gICAgZGVidWdsb2dWKFwiZGlzdGFuY2VcIiArIGEwICsgXCJzdHJpcHBlZD5cIiArIHNUZXh0MS5zdWJzdHJpbmcoMCxzVGV4dDIubGVuZ3RoKSArIFwiPD5cIiArIHNUZXh0MisgXCI8XCIpO1xyXG4gIH1cclxuICBpZihhMCAqIDUwID4gMTUgKiBzVGV4dDIubGVuZ3RoKSB7XHJcbiAgICAgIHJldHVybiA0MDAwMDtcclxuICB9XHJcbiAgdmFyIGEgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEsIHNUZXh0MilcclxuICByZXR1cm4gYTAgKiA1MDAgLyBzVGV4dDIubGVuZ3RoICsgYVxyXG59XHJcblxyXG5pbXBvcnQgKiBhcyBJRk1hdGNoIGZyb20gJy4uL21hdGNoL2lmbWF0Y2gnO1xyXG5cclxudHlwZSBJUnVsZSA9IElGTWF0Y2guSVJ1bGVcclxuXHJcblxyXG5pbnRlcmZhY2UgSU1hdGNoT3B0aW9ucyB7XHJcbiAgbWF0Y2hvdGhlcnM/OiBib29sZWFuLFxyXG4gIGF1Z21lbnQ/OiBib29sZWFuLFxyXG4gIG92ZXJyaWRlPzogYm9vbGVhblxyXG59XHJcblxyXG5pbnRlcmZhY2UgSU1hdGNoQ291bnQge1xyXG4gIGVxdWFsOiBudW1iZXJcclxuICBkaWZmZXJlbnQ6IG51bWJlclxyXG4gIHNwdXJpb3VzUjogbnVtYmVyXHJcbiAgc3B1cmlvdXNMOiBudW1iZXJcclxufVxyXG5cclxudHlwZSBFbnVtUnVsZVR5cGUgPSBJRk1hdGNoLkVudW1SdWxlVHlwZVxyXG5cclxuY29uc3QgbGV2ZW5DdXRvZmYgPSBBbGdvbC5DdXRvZmZfTGV2ZW5TaHRlaW47XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbGV2ZW5QZW5hbHR5KGk6IG51bWJlcik6IG51bWJlciB7XHJcbiAgLy8gMC0+IDFcclxuICAvLyAxIC0+IDAuMVxyXG4gIC8vIDE1MCAtPiAgMC44XHJcbiAgaWYgKGkgPT09IDApIHtcclxuICAgIHJldHVybiAxO1xyXG4gIH1cclxuICAvLyByZXZlcnNlIG1heSBiZSBiZXR0ZXIgdGhhbiBsaW5lYXJcclxuICByZXR1cm4gMSArIGkgKiAoMC44IC0gMSkgLyAxNTBcclxufVxyXG5cclxuZnVuY3Rpb24gbm9uUHJpdmF0ZUtleXMob0EpIHtcclxuICByZXR1cm4gT2JqZWN0LmtleXMob0EpLmZpbHRlcihrZXkgPT4ge1xyXG4gICAgcmV0dXJuIGtleVswXSAhPT0gJ18nO1xyXG4gIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY291bnRBaW5CKG9BLCBvQiwgZm5Db21wYXJlLCBhS2V5SWdub3JlPyk6IG51bWJlciB7XHJcbiAgYUtleUlnbm9yZSA9IEFycmF5LmlzQXJyYXkoYUtleUlnbm9yZSkgPyBhS2V5SWdub3JlIDpcclxuICAgIHR5cGVvZiBhS2V5SWdub3JlID09PSBcInN0cmluZ1wiID8gW2FLZXlJZ25vcmVdIDogW107XHJcbiAgZm5Db21wYXJlID0gZm5Db21wYXJlIHx8IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH1cclxuICByZXR1cm4gbm9uUHJpdmF0ZUtleXMob0EpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xyXG4gIH0pLlxyXG4gICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xyXG4gICAgICAgIHByZXYgPSBwcmV2ICsgKGZuQ29tcGFyZShvQVtrZXldLCBvQltrZXldLCBrZXkpID8gMSA6IDApXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHByZXZcclxuICAgIH0sIDApXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzcHVyaW91c0Fub3RJbkIob0EsIG9CLCBhS2V5SWdub3JlPykge1xyXG4gIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gYUtleUlnbm9yZSA6XHJcbiAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xyXG4gIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcclxuICAgIHJldHVybiBhS2V5SWdub3JlLmluZGV4T2Yoa2V5KSA8IDA7XHJcbiAgfSkuXHJcbiAgICByZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xyXG4gICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xyXG4gICAgICAgIHByZXYgPSBwcmV2ICsgMVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBwcmV2XHJcbiAgICB9LCAwKVxyXG59XHJcblxyXG5mdW5jdGlvbiBsb3dlckNhc2Uobykge1xyXG4gIGlmICh0eXBlb2YgbyA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgcmV0dXJuIG8udG9Mb3dlckNhc2UoKVxyXG4gIH1cclxuICByZXR1cm4gb1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY29tcGFyZUNvbnRleHQob0EsIG9CLCBhS2V5SWdub3JlPykge1xyXG4gIHZhciBlcXVhbCA9IGNvdW50QWluQihvQSwgb0IsIGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBsb3dlckNhc2UoYSkgPT09IGxvd2VyQ2FzZShiKTsgfSwgYUtleUlnbm9yZSk7XHJcbiAgdmFyIGRpZmZlcmVudCA9IGNvdW50QWluQihvQSwgb0IsIGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBsb3dlckNhc2UoYSkgIT09IGxvd2VyQ2FzZShiKTsgfSwgYUtleUlnbm9yZSk7XHJcbiAgdmFyIHNwdXJpb3VzTCA9IHNwdXJpb3VzQW5vdEluQihvQSwgb0IsIGFLZXlJZ25vcmUpXHJcbiAgdmFyIHNwdXJpb3VzUiA9IHNwdXJpb3VzQW5vdEluQihvQiwgb0EsIGFLZXlJZ25vcmUpXHJcbiAgcmV0dXJuIHtcclxuICAgIGVxdWFsOiBlcXVhbCxcclxuICAgIGRpZmZlcmVudDogZGlmZmVyZW50LFxyXG4gICAgc3B1cmlvdXNMOiBzcHVyaW91c0wsXHJcbiAgICBzcHVyaW91c1I6IHNwdXJpb3VzUlxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gc29ydEJ5UmFuayhhOiBJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZywgYjogSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmcpOiBudW1iZXIge1xyXG4gIHZhciByID0gLSgoYS5fcmFua2luZyB8fCAxLjApIC0gKGIuX3JhbmtpbmcgfHwgMS4wKSk7XHJcbiAgaWYgKHIpIHtcclxuICAgIHJldHVybiByO1xyXG4gIH1cclxuICBpZiAoYS5jYXRlZ29yeSAmJiBiLmNhdGVnb3J5KSB7XHJcbiAgICByID0gYS5jYXRlZ29yeS5sb2NhbGVDb21wYXJlKGIuY2F0ZWdvcnkpO1xyXG4gICAgaWYgKHIpIHtcclxuICAgICAgcmV0dXJuIHI7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGlmIChhLm1hdGNoZWRTdHJpbmcgJiYgYi5tYXRjaGVkU3RyaW5nKSB7XHJcbiAgICByID0gYS5tYXRjaGVkU3RyaW5nLmxvY2FsZUNvbXBhcmUoYi5tYXRjaGVkU3RyaW5nKTtcclxuICAgIGlmIChyKSB7XHJcbiAgICAgIHJldHVybiByO1xyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gMDtcclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjaGVja09uZVJ1bGUoc3RyaW5nOiBzdHJpbmcsIGxjU3RyaW5nIDogc3RyaW5nLCBleGFjdCA6IGJvb2xlYW4sXHJcbnJlcyA6IEFycmF5PElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+LFxyXG5vUnVsZSA6IElNYXRjaC5tUnVsZSwgY250UmVjPyA6IElDbnRSZWMgKSB7XHJcbiAgIGlmIChkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xyXG4gICAgICBkZWJ1Z2xvZ1YoJ2F0dGVtcHRpbmcgdG8gbWF0Y2ggcnVsZSAnICsgSlNPTi5zdHJpbmdpZnkob1J1bGUpICsgXCIgdG8gc3RyaW5nIFxcXCJcIiArIHN0cmluZyArIFwiXFxcIlwiKTtcclxuICAgIH1cclxuICAgIHN3aXRjaCAob1J1bGUudHlwZSkge1xyXG4gICAgICBjYXNlIElGTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQ6XHJcbiAgICAgICAgaWYoIW9SdWxlLmxvd2VyY2FzZXdvcmQpIHtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncnVsZSB3aXRob3V0IGEgbG93ZXJjYXNlIHZhcmlhbnQnICsgSlNPTi5zdHJpbmdpZnkob1J1bGUsIHVuZGVmaW5lZCwgMikpO1xyXG4gICAgICAgICB9O1xyXG4gICAgICAgIGlmIChleGFjdCAmJiBvUnVsZS53b3JkID09PSBzdHJpbmcgfHwgb1J1bGUubG93ZXJjYXNld29yZCA9PT0gbGNTdHJpbmcpIHtcclxuICAgICAgICAgIHJlcy5wdXNoKHtcclxuICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCFleGFjdCAmJiAhb1J1bGUuZXhhY3RPbmx5KSB7XHJcbiAgICAgICAgICB2YXIgbGV2ZW5tYXRjaCA9IGNhbGNEaXN0YW5jZShvUnVsZS5sb3dlcmNhc2V3b3JkLCBsY1N0cmluZyk7XHJcblxyXG4gICAgICAgICAgYWRkQ250UmVjKGNudFJlYyxcImNhbGNEaXN0YW5jZVwiLCAxKTtcclxuICAgICAgICAgIGlmKGxldmVubWF0Y2ggPCA1MDAwMCkge1xyXG4gICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlRXhwXCIsIDEpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYobGV2ZW5tYXRjaCA8IDQwMDAwKSB7XHJcbiAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VCZWxvdzQwa1wiLCAxKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmIChsZXZlbm1hdGNoIDwgbGV2ZW5DdXRvZmYpIHtcclxuICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYyxcImNhbGNEaXN0YW5jZU9rXCIsIDEpO1xyXG4gICAgICAgICAgICByZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcclxuICAgICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXHJcbiAgICAgICAgICAgICAgX3Jhbmtpbmc6IChvUnVsZS5fcmFua2luZyB8fCAxLjApICogbGV2ZW5QZW5hbHR5KGxldmVubWF0Y2gpLFxyXG4gICAgICAgICAgICAgIGxldmVubWF0Y2g6IGxldmVubWF0Y2hcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuUkVHRVhQOiB7XHJcbiAgICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KFwiIGhlcmUgcmVnZXhwXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSkpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBtID0gb1J1bGUucmVnZXhwLmV4ZWMoc3RyaW5nKVxyXG4gICAgICAgIGlmIChtKSB7XHJcbiAgICAgICAgICByZXMucHVzaCh7XHJcbiAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxyXG4gICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiAob1J1bGUubWF0Y2hJbmRleCAhPT0gdW5kZWZpbmVkICYmIG1bb1J1bGUubWF0Y2hJbmRleF0pIHx8IHN0cmluZyxcclxuICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxyXG4gICAgICAgICAgICBfcmFua2luZzogb1J1bGUuX3JhbmtpbmcgfHwgMS4wXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBkZWZhdWx0OlxyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInVua25vd24gdHlwZVwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUsIHVuZGVmaW5lZCwgMikpXHJcbiAgICB9XHJcbn1cclxuXHJcblxyXG5pbnRlcmZhY2UgSUNudFJlYyB7XHJcblxyXG59O1xyXG5cclxuZnVuY3Rpb24gYWRkQ250UmVjKGNudFJlYyA6IElDbnRSZWMsIG1lbWJlciA6IHN0cmluZywgbnVtYmVyIDogbnVtYmVyKSB7XHJcbiAgaWYoKCFjbnRSZWMpIHx8IChudW1iZXIgPT09IDApKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIGNudFJlY1ttZW1iZXJdID0gKGNudFJlY1ttZW1iZXJdIHx8IDApICsgbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVN0cmluZyhzdHJpbmc6IHN0cmluZywgZXhhY3Q6IGJvb2xlYW4sIG9SdWxlczogQXJyYXk8SU1hdGNoLm1SdWxlPixcclxuIGNudFJlYz8gOiBJQ250UmVjKTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IHtcclxuICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXHJcbiAgaWYoZGVidWdsb2dNLmVuYWJsZWQgKSAge1xyXG4gICAgZGVidWdsb2dNKFwicnVsZXMgOiBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlcywgdW5kZWZpbmVkLCAyKSk7XHJcbiAgfVxyXG4gIHZhciBsY1N0cmluZyA9IHN0cmluZy50b0xvd2VyQ2FzZSgpO1xyXG4gIHZhciByZXM6IEFycmF5PElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+ID0gW11cclxuICBvUnVsZXMuZm9yRWFjaChmdW5jdGlvbiAob1J1bGUpIHtcclxuICAgIGNoZWNrT25lUnVsZShzdHJpbmcsbGNTdHJpbmcsZXhhY3QscmVzLG9SdWxlLGNudFJlYyk7XHJcbiAgfSk7XHJcbiAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNhdGVnb3JpemVTdHJpbmcyKHN0cmluZzogc3RyaW5nLCBleGFjdDogYm9vbGVhbiwgIHJ1bGVzIDogSU1hdGNoLlNwbGl0UnVsZXNcclxuICAsIGNudFJlYz8gOklDbnRSZWMpOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4ge1xyXG4gIC8vIHNpbXBseSBhcHBseSBhbGwgcnVsZXNcclxuICBpZiAoZGVidWdsb2dNLmVuYWJsZWQgKSAge1xyXG4gICAgZGVidWdsb2dNKFwicnVsZXMgOiBcIiArIEpTT04uc3RyaW5naWZ5KHJ1bGVzLHVuZGVmaW5lZCwgMikpO1xyXG4gIH1cclxuICB2YXIgbGNTdHJpbmcgPSBzdHJpbmcudG9Mb3dlckNhc2UoKTtcclxuICB2YXIgcmVzOiBBcnJheTxJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiA9IFtdO1xyXG4gIGlmIChleGFjdCkge1xyXG4gICAgdmFyIHIgPSBydWxlcy53b3JkTWFwW2xjU3RyaW5nXTtcclxuICAgIGlmIChyKSB7XHJcbiAgICAgIHIuZm9yRWFjaChmdW5jdGlvbihvUnVsZSkge1xyXG4gICAgICAgIHJlcy5wdXNoKHtcclxuICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxyXG4gICAgICAgICAgfSlcclxuICAgICB9KTtcclxuICAgIH1cclxuICAgIHJ1bGVzLm5vbldvcmRSdWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChvUnVsZSkge1xyXG4gICAgICBjaGVja09uZVJ1bGUoc3RyaW5nLGxjU3RyaW5nLGV4YWN0LHJlcyxvUnVsZSxjbnRSZWMpO1xyXG4gICAgfSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIGRlYnVnbG9nKFwiY2F0ZWdvcml6ZSBub24gZXhhY3RcIiArIHN0cmluZyArIFwiIHh4ICBcIiArIHJ1bGVzLmFsbFJ1bGVzLmxlbmd0aCk7XHJcbiAgICByZXR1cm4gY2F0ZWdvcml6ZVN0cmluZyhzdHJpbmcsIGV4YWN0LCBydWxlcy5hbGxSdWxlcywgY250UmVjKTtcclxuICB9XHJcbiAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuXHJcblxyXG4vKipcclxuICpcclxuICogT3B0aW9ucyBtYXkgYmUge1xyXG4gKiBtYXRjaG90aGVycyA6IHRydWUsICA9PiBvbmx5IHJ1bGVzIHdoZXJlIGFsbCBvdGhlcnMgbWF0Y2ggYXJlIGNvbnNpZGVyZWRcclxuICogYXVnbWVudCA6IHRydWUsXHJcbiAqIG92ZXJyaWRlIDogdHJ1ZSB9ICA9PlxyXG4gKlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoV29yZChvUnVsZTogSVJ1bGUsIGNvbnRleHQ6IElGTWF0Y2guY29udGV4dCwgb3B0aW9ucz86IElNYXRjaE9wdGlvbnMpIHtcclxuICBpZiAoY29udGV4dFtvUnVsZS5rZXldID09PSB1bmRlZmluZWQpIHtcclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgfVxyXG4gIHZhciBzMSA9IGNvbnRleHRbb1J1bGUua2V5XS50b0xvd2VyQ2FzZSgpXHJcbiAgdmFyIHMyID0gb1J1bGUud29yZC50b0xvd2VyQ2FzZSgpO1xyXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XHJcbiAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCwgb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KVxyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlbHRhKSk7XHJcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XHJcbiAgfVxyXG4gIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gIH1cclxuICB2YXIgYzogbnVtYmVyID0gY2FsY0Rpc3RhbmNlKHMyLCBzMSk7XHJcbiAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgZGVidWdsb2coXCIgczEgPD4gczIgXCIgKyBzMSArIFwiPD5cIiArIHMyICsgXCIgID0+OiBcIiArIGMpO1xyXG4gIH1cclxuICBpZiAoYyA8IDE1MCkge1xyXG4gICAgdmFyIHJlcyA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpIGFzIGFueTtcclxuICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcclxuICAgIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XHJcbiAgICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvUnVsZS5mb2xsb3dzKTtcclxuICAgIH1cclxuICAgIC8vIGZvcmNlIGtleSBwcm9wZXJ0eVxyXG4gICAgLy8gY29uc29sZS5sb2coJyBvYmplY3RjYXRlZ29yeScsIHJlc1snc3lzdGVtT2JqZWN0Q2F0ZWdvcnknXSk7XHJcbiAgICByZXNbb1J1bGUua2V5XSA9IG9SdWxlLmZvbGxvd3Nbb1J1bGUua2V5XSB8fCByZXNbb1J1bGUua2V5XTtcclxuICAgIHJlcy5fd2VpZ2h0ID0gQW55T2JqZWN0LmFzc2lnbih7fSwgcmVzLl93ZWlnaHQpO1xyXG4gICAgcmVzLl93ZWlnaHRbb1J1bGUua2V5XSA9IGM7XHJcbiAgICBPYmplY3QuZnJlZXplKHJlcyk7XHJcbiAgICBpZiAoIGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgICAgZGVidWdsb2coJ0ZvdW5kIG9uZScgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlcztcclxuICB9XHJcbiAgcmV0dXJuIHVuZGVmaW5lZDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RBcmdzTWFwKG1hdGNoOiBBcnJheTxzdHJpbmc+LCBhcmdzTWFwOiB7IFtrZXk6IG51bWJlcl06IHN0cmluZyB9KTogSUZNYXRjaC5jb250ZXh0IHtcclxuICB2YXIgcmVzID0ge30gYXMgSUZNYXRjaC5jb250ZXh0O1xyXG4gIGlmICghYXJnc01hcCkge1xyXG4gICAgcmV0dXJuIHJlcztcclxuICB9XHJcbiAgT2JqZWN0LmtleXMoYXJnc01hcCkuZm9yRWFjaChmdW5jdGlvbiAoaUtleSkge1xyXG4gICAgdmFyIHZhbHVlID0gbWF0Y2hbaUtleV1cclxuICAgIHZhciBrZXkgPSBhcmdzTWFwW2lLZXldO1xyXG4gICAgaWYgKCh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpICYmIHZhbHVlLmxlbmd0aCA+IDApIHtcclxuICAgICAgcmVzW2tleV0gPSB2YWx1ZVxyXG4gICAgfVxyXG4gIH1cclxuICApO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBSYW5rV29yZCA9IHtcclxuICBoYXNBYm92ZTogZnVuY3Rpb24gKGxzdDogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+LCBib3JkZXI6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuICFsc3QuZXZlcnkoZnVuY3Rpb24gKG9NZW1iZXIpIHtcclxuICAgICAgcmV0dXJuIChvTWVtYmVyLl9yYW5raW5nIDwgYm9yZGVyKTtcclxuICAgIH0pO1xyXG4gIH0sXHJcblxyXG4gIHRha2VGaXJzdE46IGZ1bmN0aW9uIChsc3Q6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiwgbjogbnVtYmVyKTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IHtcclxuICAgIHJldHVybiBsc3QuZmlsdGVyKGZ1bmN0aW9uIChvTWVtYmVyLCBpSW5kZXgpIHtcclxuICAgICAgdmFyIGxhc3RSYW5raW5nID0gMS4wO1xyXG4gICAgICBpZiAoKGlJbmRleCA8IG4pIHx8IG9NZW1iZXIuX3JhbmtpbmcgPT09IGxhc3RSYW5raW5nKSB7XHJcbiAgICAgICAgbGFzdFJhbmtpbmcgPSBvTWVtYmVyLl9yYW5raW5nO1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH0pO1xyXG4gIH0sXHJcbiAgdGFrZUFib3ZlOiBmdW5jdGlvbiAobHN0OiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4sIGJvcmRlcjogbnVtYmVyKTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IHtcclxuICAgIHJldHVybiBsc3QuZmlsdGVyKGZ1bmN0aW9uIChvTWVtYmVyKSB7XHJcbiAgICAgIHJldHVybiAob01lbWJlci5fcmFua2luZyA+PSBib3JkZXIpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG59O1xyXG5cclxuLypcclxudmFyIGV4YWN0TGVuID0gMDtcclxudmFyIGZ1enp5TGVuID0gMDtcclxudmFyIGZ1enp5Q250ID0gMDtcclxudmFyIGV4YWN0Q250ID0gMDtcclxudmFyIHRvdGFsQ250ID0gMDtcclxudmFyIHRvdGFsTGVuID0gMDtcclxudmFyIHJldGFpbmVkQ250ID0gMDtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZXNldENudCgpIHtcclxuICBleGFjdExlbiA9IDA7XHJcbiAgZnV6enlMZW4gPSAwO1xyXG4gIGZ1enp5Q250ID0gMDtcclxuICBleGFjdENudCA9IDA7XHJcbiAgdG90YWxDbnQgPSAwO1xyXG4gIHRvdGFsTGVuID0gMDtcclxuICByZXRhaW5lZENudCA9IDA7XHJcbn1cclxuKi9cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmKHNXb3JkR3JvdXA6IHN0cmluZywgc3BsaXRSdWxlcyA6IElNYXRjaC5TcGxpdFJ1bGVzICwgY250UmVjPyA6IElDbnRSZWMgKTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IHtcclxuICB2YXIgc2Vlbkl0ID0gY2F0ZWdvcml6ZVN0cmluZzIoc1dvcmRHcm91cCwgdHJ1ZSwgc3BsaXRSdWxlcywgY250UmVjKTtcclxuICAvL3RvdGFsQ250ICs9IDE7XHJcbiAgLy8gZXhhY3RMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcclxuICBhZGRDbnRSZWMoY250UmVjLCAnY250Q2F0RXhhY3QnLCAxKTtcclxuICBhZGRDbnRSZWMoY250UmVjLCAnY250Q2F0RXhhY3RSZXMnLCBzZWVuSXQubGVuZ3RoKTtcclxuXHJcbiAgaWYgKFJhbmtXb3JkLmhhc0Fib3ZlKHNlZW5JdCwgMC44KSkge1xyXG4gICAgaWYoY250UmVjKSB7XHJcbiAgICAgIGFkZENudFJlYyhjbnRSZWMsICdleGFjdFByaW9yVGFrZScsIHNlZW5JdC5sZW5ndGgpXHJcbiAgICB9XHJcbiAgICBzZWVuSXQgPSBSYW5rV29yZC50YWtlQWJvdmUoc2Vlbkl0LCAwLjgpO1xyXG4gICAgaWYoY250UmVjKSB7XHJcbiAgICAgIGFkZENudFJlYyhjbnRSZWMsICdleGFjdEFmdGVyVGFrZScsIHNlZW5JdC5sZW5ndGgpXHJcbiAgICB9XHJcbiAgIC8vIGV4YWN0Q250ICs9IDE7XHJcbiAgfSBlbHNlIHtcclxuICAgIHNlZW5JdCA9IGNhdGVnb3JpemVTdHJpbmcyKHNXb3JkR3JvdXAsIGZhbHNlLCBzcGxpdFJ1bGVzLCBjbnRSZWMpO1xyXG4gICAgYWRkQ250UmVjKGNudFJlYywgJ2NudE5vbkV4YWN0JywgMSk7XHJcbiAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Tm9uRXhhY3RSZXMnLCBzZWVuSXQubGVuZ3RoKTtcclxuICAvLyAgZnV6enlMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcclxuICAvLyAgZnV6enlDbnQgKz0gMTtcclxuICB9XHJcbiAvLyB0b3RhbExlbiArPSBzZWVuSXQubGVuZ3RoO1xyXG4gIHNlZW5JdCA9IFJhbmtXb3JkLnRha2VGaXJzdE4oc2Vlbkl0LCBBbGdvbC5Ub3BfTl9Xb3JkQ2F0ZWdvcml6YXRpb25zKTtcclxuIC8vIHJldGFpbmVkQ250ICs9IHNlZW5JdC5sZW5ndGg7XHJcbiAgcmV0dXJuIHNlZW5JdDtcclxufVxyXG5cclxuLypcclxuZXhwb3J0IGZ1bmN0aW9uIGR1bXBDbnQoKSB7XHJcbiAgY29uc29sZS5sb2coYFxyXG5leGFjdExlbiA9ICR7ZXhhY3RMZW59O1xyXG5leGFjdENudCA9ICR7ZXhhY3RDbnR9O1xyXG5mdXp6eUxlbiA9ICR7ZnV6enlMZW59O1xyXG5mdXp6eUNudCA9ICR7ZnV6enlDbnR9O1xyXG50b3RhbENudCA9ICR7dG90YWxDbnR9O1xyXG50b3RhbExlbiA9ICR7dG90YWxMZW59O1xyXG5yZXRhaW5lZExlbiA9ICR7cmV0YWluZWRDbnR9O1xyXG4gIGApO1xyXG59XHJcbiovXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkU2VudGVuY2Uob1NlbnRlbmNlOiBJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdW10pOiBib29sZWFuIHtcclxuICByZXR1cm4gb1NlbnRlbmNlLmV2ZXJ5KGZ1bmN0aW9uIChvV29yZEdyb3VwKSB7XHJcbiAgICByZXR1cm4gKG9Xb3JkR3JvdXAubGVuZ3RoID4gMCk7XHJcbiAgfSk7XHJcbn1cclxuXHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZChhcnI6IElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11bXVtdKTogSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXVtdW10ge1xyXG4gIHJldHVybiBhcnIuZmlsdGVyKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcclxuICAgIHJldHVybiBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWRTZW50ZW5jZShvU2VudGVuY2UpO1xyXG4gIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZUFXb3JkKHNXb3JkR3JvdXA6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCBzU3RyaW5nOiBzdHJpbmcsIHdvcmRzOiB7IFtrZXk6IHN0cmluZ106IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPn0sXHJcbmNudFJlYyA/IDogSUNudFJlYyApIHtcclxuICB2YXIgc2Vlbkl0ID0gd29yZHNbc1dvcmRHcm91cF07XHJcbiAgaWYgKHNlZW5JdCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICBzZWVuSXQgPSBjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmKHNXb3JkR3JvdXAsIHJ1bGVzLCBjbnRSZWMpO1xyXG4gICAgdXRpbHMuZGVlcEZyZWV6ZShzZWVuSXQpO1xyXG4gICAgd29yZHNbc1dvcmRHcm91cF0gPSBzZWVuSXQ7XHJcbiAgfVxyXG4gIGlmICghc2Vlbkl0IHx8IHNlZW5JdC5sZW5ndGggPT09IDApIHtcclxuICAgIGxvZ2dlcihcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIFxcXCJcIiArIHNXb3JkR3JvdXAgKyBcIlxcXCIgaW4gc2VudGVuY2UgXFxcIlwiXHJcbiAgICAgICsgc1N0cmluZyArIFwiXFxcIlwiKTtcclxuICAgIGlmIChzV29yZEdyb3VwLmluZGV4T2YoXCIgXCIpIDw9IDApIHtcclxuICAgICAgZGVidWdsb2coXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBwcmltaXRpdmUgKCEpXCIgKyBzV29yZEdyb3VwKTtcclxuICAgIH1cclxuICAgIGRlYnVnbG9nKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgXCIgKyBzV29yZEdyb3VwKTtcclxuICAgIGlmICghc2Vlbkl0KSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGluZyBlbXRweSBsaXN0LCBub3QgdW5kZWZpbmVkIGZvciBcXFwiXCIgKyBzV29yZEdyb3VwICsgXCJcXFwiXCIpXHJcbiAgICB9XHJcbiAgICB3b3Jkc1tzV29yZEdyb3VwXSA9IFtdXHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG4gIHJldHVybiB1dGlscy5jbG9uZURlZXAoc2Vlbkl0KTtcclxufVxyXG5cclxuXHJcbi8qKlxyXG4gKiBHaXZlbiBhICBzdHJpbmcsIGJyZWFrIGl0IGRvd24gaW50byBjb21wb25lbnRzLFxyXG4gKiBbWydBJywgJ0InXSwgWydBIEInXV1cclxuICpcclxuICogdGhlbiBjYXRlZ29yaXplV29yZHNcclxuICogcmV0dXJuaW5nXHJcbiAqXHJcbiAqIFsgW1sgeyBjYXRlZ29yeTogJ3N5c3RlbUlkJywgd29yZCA6ICdBJ30sXHJcbiAqICAgICAgeyBjYXRlZ29yeTogJ290aGVydGhpbmcnLCB3b3JkIDogJ0EnfVxyXG4gKiAgICBdLFxyXG4gKiAgICAvLyByZXN1bHQgb2YgQlxyXG4gKiAgICBbIHsgY2F0ZWdvcnk6ICdzeXN0ZW1JZCcsIHdvcmQgOiAnQid9LFxyXG4gKiAgICAgIHsgY2F0ZWdvcnk6ICdvdGhlcnRoaW5nJywgd29yZCA6ICdBJ31cclxuICogICAgICB7IGNhdGVnb3J5OiAnYW5vdGhlcnRyeXAnLCB3b3JkIDogJ0InfVxyXG4gKiAgICBdXHJcbiAqICAgXSxcclxuICogXV1dXHJcbiAqXHJcbiAqXHJcbiAqXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZVN0cmluZyhzU3RyaW5nOiBzdHJpbmcsIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcyxcclxuICB3b3Jkcz86IHsgW2tleTogc3RyaW5nXTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IH0pIHtcclxuICB2YXIgY250ID0gMDtcclxuICB2YXIgZmFjID0gMTtcclxuICB2YXIgdSA9IGJyZWFrZG93bi5icmVha2Rvd25TdHJpbmcoc1N0cmluZywgQWxnb2wuTWF4U3BhY2VzUGVyQ29tYmluZWRXb3JkKTtcclxuICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZyhcImhlcmUgYnJlYWtkb3duXCIgKyBKU09OLnN0cmluZ2lmeSh1KSk7XHJcbiAgfVxyXG4gIC8vY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkodSkpO1xyXG4gIHdvcmRzID0gd29yZHMgfHwge307XHJcbiAgZGVidWdwZXJmKCd0aGlzIG1hbnkga25vd24gd29yZHM6ICcgKyBPYmplY3Qua2V5cyh3b3JkcykubGVuZ3RoKTtcclxuICB2YXIgcmVzID0gW107XHJcbiAgdmFyIGNudFJlYyA9IHt9O1xyXG4gIHUuZm9yRWFjaChmdW5jdGlvbiAoYUJyZWFrRG93blNlbnRlbmNlKSB7XHJcbiAgICAgIHZhciBjYXRlZ29yaXplZFNlbnRlbmNlID0gW107XHJcbiAgICAgIHZhciBpc1ZhbGlkID0gYUJyZWFrRG93blNlbnRlbmNlLmV2ZXJ5KGZ1bmN0aW9uIChzV29yZEdyb3VwOiBzdHJpbmcsIGluZGV4IDogbnVtYmVyKSB7XHJcbiAgICAgICAgdmFyIHNlZW5JdCA9IGNhdGVnb3JpemVBV29yZChzV29yZEdyb3VwLCBydWxlcywgc1N0cmluZywgd29yZHMsIGNudFJlYyk7XHJcbiAgICAgICAgaWYoc2Vlbkl0Lmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXRlZ29yaXplZFNlbnRlbmNlW2luZGV4XSA9IHNlZW5JdDtcclxuICAgICAgICBjbnQgPSBjbnQgKyBzZWVuSXQubGVuZ3RoO1xyXG4gICAgICAgIGZhYyA9IGZhYyAqIHNlZW5JdC5sZW5ndGg7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgIH0pO1xyXG4gICAgICBpZihpc1ZhbGlkKSB7XHJcbiAgICAgICAgcmVzLnB1c2goY2F0ZWdvcml6ZWRTZW50ZW5jZSk7XHJcbiAgICAgIH1cclxuICB9KTtcclxuICBkZWJ1Z2xvZyhcIiBzZW50ZW5jZXMgXCIgKyB1Lmxlbmd0aCArIFwiIG1hdGNoZXMgXCIgKyBjbnQgKyBcIiBmYWM6IFwiICsgZmFjKTtcclxuICBpZihkZWJ1Z2xvZy5lbmFibGVkICYmIHUubGVuZ3RoKSB7XHJcbiAgICBkZWJ1Z2xvZyhcImZpcnN0IG1hdGNoIFwiKyBKU09OLnN0cmluZ2lmeSh1LHVuZGVmaW5lZCwyKSk7XHJcbiAgfVxyXG4gIGRlYnVncGVyZihcIiBzZW50ZW5jZXMgXCIgKyB1Lmxlbmd0aCArIFwiIC8gXCIgKyByZXMubGVuZ3RoICsgIFwiIG1hdGNoZXMgXCIgKyBjbnQgKyBcIiBmYWM6IFwiICsgZmFjICsgXCIgcmVjIDogXCIgKyBKU09OLnN0cmluZ2lmeShjbnRSZWMsdW5kZWZpbmVkLDIpKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG4vKlxyXG5bIFthLGJdLCBbYyxkXV1cclxuXHJcbjAwIGFcclxuMDEgYlxyXG4xMCBjXHJcbjExIGRcclxuMTIgY1xyXG4qL1xyXG5cclxuXHJcbmNvbnN0IGNsb25lID0gdXRpbHMuY2xvbmVEZWVwO1xyXG5cclxuXHJcbmZ1bmN0aW9uIGNvcHlWZWNNZW1iZXJzKHUpIHtcclxuICB2YXIgaSA9IDA7XHJcbiAgZm9yKGkgPSAwOyBpIDwgdS5sZW5ndGg7ICsraSkge1xyXG4gICAgdVtpXSA9IGNsb25lKHVbaV0pO1xyXG4gIH1cclxuICByZXR1cm4gdTtcclxufVxyXG4vLyB3ZSBjYW4gcmVwbGljYXRlIHRoZSB0YWlsIG9yIHRoZSBoZWFkLFxyXG4vLyB3ZSByZXBsaWNhdGUgdGhlIHRhaWwgYXMgaXQgaXMgc21hbGxlci5cclxuXHJcbi8vIFthLGIsYyBdXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZXhwYW5kTWF0Y2hBcnIoZGVlcDogQXJyYXk8QXJyYXk8YW55Pj4pOiBBcnJheTxBcnJheTxhbnk+PiB7XHJcbiAgdmFyIGEgPSBbXTtcclxuICB2YXIgbGluZSA9IFtdO1xyXG4gIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyBKU09OLnN0cmluZ2lmeShkZWVwKSA6ICctJyk7XHJcbiAgZGVlcC5mb3JFYWNoKGZ1bmN0aW9uICh1QnJlYWtEb3duTGluZSwgaUluZGV4OiBudW1iZXIpIHtcclxuICAgIGxpbmVbaUluZGV4XSA9IFtdO1xyXG4gICAgdUJyZWFrRG93bkxpbmUuZm9yRWFjaChmdW5jdGlvbiAoYVdvcmRHcm91cCwgd2dJbmRleDogbnVtYmVyKSB7XHJcbiAgICAgIGxpbmVbaUluZGV4XVt3Z0luZGV4XSA9IFtdO1xyXG4gICAgICBhV29yZEdyb3VwLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkVmFyaWFudCwgaVdWSW5kZXg6IG51bWJlcikge1xyXG4gICAgICAgIGxpbmVbaUluZGV4XVt3Z0luZGV4XVtpV1ZJbmRleF0gPSBvV29yZFZhcmlhbnQ7XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfSlcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShsaW5lKSk7XHJcbiAgdmFyIHJlcyA9IFtdO1xyXG4gIHZhciBudmVjcyA9IFtdO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZS5sZW5ndGg7ICsraSkge1xyXG4gICAgdmFyIHZlY3MgPSBbW11dO1xyXG4gICAgdmFyIG52ZWNzID0gW107XHJcbiAgICB2YXIgcnZlYyA9IFtdO1xyXG4gICAgZm9yICh2YXIgayA9IDA7IGsgPCBsaW5lW2ldLmxlbmd0aDsgKytrKSB7IC8vIHdvcmRncm91cCBrXHJcbiAgICAgIC8vdmVjcyBpcyB0aGUgdmVjdG9yIG9mIGFsbCBzbyBmYXIgc2VlbiB2YXJpYW50cyB1cCB0byBrIHdncy5cclxuICAgICAgdmFyIG5leHRCYXNlID0gW107XHJcbiAgICAgIGZvciAodmFyIGwgPSAwOyBsIDwgbGluZVtpXVtrXS5sZW5ndGg7ICsrbCkgeyAvLyBmb3IgZWFjaCB2YXJpYW50XHJcbiAgICAgICAgLy9kZWJ1Z2xvZyhcInZlY3Mgbm93XCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzKSk7XHJcbiAgICAgICAgbnZlY3MgPSBbXTsgLy92ZWNzLnNsaWNlKCk7IC8vIGNvcHkgdGhlIHZlY1tpXSBiYXNlIHZlY3RvcjtcclxuICAgICAgICAvL2RlYnVnbG9nKFwidmVjcyBjb3BpZWQgbm93XCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpO1xyXG4gICAgICAgIGZvciAodmFyIHUgPSAwOyB1IDwgdmVjcy5sZW5ndGg7ICsrdSkge1xyXG4gICAgICAgICAgbnZlY3NbdV0gPSB2ZWNzW3VdLnNsaWNlKCk7IC8vXHJcbiAgICAgICAgICBudmVjc1t1XSA9IGNvcHlWZWNNZW1iZXJzKG52ZWNzW3VdKTtcclxuICAgICAgICAgIC8vIGRlYnVnbG9nKFwiY29waWVkIHZlY3NbXCIrIHUrXCJdXCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzW3VdKSk7XHJcbiAgICAgICAgICBudmVjc1t1XS5wdXNoKFxyXG4gICAgICAgICAgICBjbG9uZShsaW5lW2ldW2tdW2xdKSk7IC8vIHB1c2ggdGhlIGx0aCB2YXJpYW50XHJcbiAgICAgICAgICAvLyBkZWJ1Z2xvZyhcIm5vdyBudmVjcyBcIiArIG52ZWNzLmxlbmd0aCArIFwiIFwiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gICBkZWJ1Z2xvZyhcIiBhdCAgICAgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbmV4dGJhc2UgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxyXG4gICAgICAgIC8vICAgZGVidWdsb2coXCIgYXBwZW5kIFwiICsgayArIFwiOlwiICsgbCArIFwiIG52ZWNzICAgID5cIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSlcclxuICAgICAgICBuZXh0QmFzZSA9IG5leHRCYXNlLmNvbmNhdChudmVjcyk7XHJcbiAgICAgICAgLy8gICBkZWJ1Z2xvZyhcIiAgcmVzdWx0IFwiICsgayArIFwiOlwiICsgbCArIFwiIG52ZWNzICAgID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcclxuICAgICAgfSAvL2NvbnN0cnVcclxuICAgICAgLy8gIGRlYnVnbG9nKFwibm93IGF0IFwiICsgayArIFwiOlwiICsgbCArIFwiID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcclxuICAgICAgdmVjcyA9IG5leHRCYXNlO1xyXG4gICAgfVxyXG4gICAgZGVidWdsb2dWKGRlYnVnbG9nVi5lbmFibGVkID8gKFwiQVBQRU5ESU5HIFRPIFJFU1wiICsgaSArIFwiOlwiICsgbCArIFwiID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSkgOiAnLScpO1xyXG4gICAgcmVzID0gcmVzLmNvbmNhdCh2ZWNzKTtcclxuICB9XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuXHJcbi8qKlxyXG4gKiBDYWxjdWxhdGUgYSB3ZWlnaHQgZmFjdG9yIGZvciBhIGdpdmVuIGRpc3RhbmNlIGFuZFxyXG4gKiBjYXRlZ29yeVxyXG4gKiBAcGFyYW0ge2ludGVnZXJ9IGRpc3QgZGlzdGFuY2UgaW4gd29yZHNcclxuICogQHBhcmFtIHtzdHJpbmd9IGNhdGVnb3J5IGNhdGVnb3J5IHRvIHVzZVxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBhIGRpc3RhbmNlIGZhY3RvciA+PSAxXHJcbiAqICAxLjAgZm9yIG5vIGVmZmVjdFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlaW5mb3JjZURpc3RXZWlnaHQoZGlzdDogbnVtYmVyLCBjYXRlZ29yeTogc3RyaW5nKTogbnVtYmVyIHtcclxuICB2YXIgYWJzID0gTWF0aC5hYnMoZGlzdCk7XHJcbiAgcmV0dXJuIDEuMCArIChBbGdvbC5hUmVpbmZvcmNlRGlzdFdlaWdodFthYnNdIHx8IDApO1xyXG59XHJcblxyXG4vKipcclxuICogR2l2ZW4gYSBzZW50ZW5jZSwgZXh0YWN0IGNhdGVnb3JpZXNcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0Q2F0ZWdvcnlNYXAob1NlbnRlbmNlOiBBcnJheTxJRk1hdGNoLklXb3JkPik6IHsgW2tleTogc3RyaW5nXTogQXJyYXk8eyBwb3M6IG51bWJlciB9PiB9IHtcclxuICB2YXIgcmVzID0ge307XHJcbiAgZGVidWdsb2coJ2V4dHJhY3RDYXRlZ29yeU1hcCAnICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKSk7XHJcbiAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpSW5kZXgpIHtcclxuICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gSUZNYXRjaC5DQVRfQ0FURUdPUlkpIHtcclxuICAgICAgcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddID0gcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddIHx8IFtdO1xyXG4gICAgICByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10ucHVzaCh7IHBvczogaUluZGV4IH0pO1xyXG4gICAgfVxyXG4gIH0pO1xyXG4gIHV0aWxzLmRlZXBGcmVlemUocmVzKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVpbkZvcmNlU2VudGVuY2Uob1NlbnRlbmNlKSB7XHJcbiAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgdmFyIG9DYXRlZ29yeU1hcCA9IGV4dHJhY3RDYXRlZ29yeU1hcChvU2VudGVuY2UpO1xyXG4gIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaUluZGV4KSB7XHJcbiAgICB2YXIgbSA9IG9DYXRlZ29yeU1hcFtvV29yZC5jYXRlZ29yeV0gfHwgW107XHJcbiAgICBtLmZvckVhY2goZnVuY3Rpb24gKG9Qb3NpdGlvbjogeyBwb3M6IG51bWJlciB9KSB7XHJcbiAgICAgIFwidXNlIHN0cmljdFwiO1xyXG4gICAgICBvV29yZC5yZWluZm9yY2UgPSBvV29yZC5yZWluZm9yY2UgfHwgMTtcclxuICAgICAgdmFyIGJvb3N0ID0gcmVpbmZvcmNlRGlzdFdlaWdodChpSW5kZXggLSBvUG9zaXRpb24ucG9zLCBvV29yZC5jYXRlZ29yeSk7XHJcbiAgICAgIG9Xb3JkLnJlaW5mb3JjZSAqPSBib29zdDtcclxuICAgICAgb1dvcmQuX3JhbmtpbmcgKj0gYm9vc3Q7XHJcbiAgICB9KTtcclxuICB9KTtcclxuICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGlJbmRleCkge1xyXG4gICAgaWYgKGlJbmRleCA+IDAgKSB7XHJcbiAgICAgIGlmIChvU2VudGVuY2VbaUluZGV4LTFdLmNhdGVnb3J5ID09PSBcIm1ldGFcIiAgJiYgKG9Xb3JkLmNhdGVnb3J5ID09PSBvU2VudGVuY2VbaUluZGV4LTFdLm1hdGNoZWRTdHJpbmcpICkge1xyXG4gICAgICAgIG9Xb3JkLnJlaW5mb3JjZSA9IG9Xb3JkLnJlaW5mb3JjZSB8fCAxO1xyXG4gICAgICAgIHZhciBib29zdCA9IHJlaW5mb3JjZURpc3RXZWlnaHQoMSwgb1dvcmQuY2F0ZWdvcnkpO1xyXG4gICAgICAgIG9Xb3JkLnJlaW5mb3JjZSAqPSBib29zdDtcclxuICAgICAgICBvV29yZC5fcmFua2luZyAqPSBib29zdDtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0pO1xyXG4gIHJldHVybiBvU2VudGVuY2U7XHJcbn1cclxuXHJcblxyXG5pbXBvcnQgKiBhcyBTZW50ZW5jZSBmcm9tICcuL3NlbnRlbmNlJztcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWluRm9yY2UoYUNhdGVnb3JpemVkQXJyYXkpIHtcclxuICBcInVzZSBzdHJpY3RcIjtcclxuICBhQ2F0ZWdvcml6ZWRBcnJheS5mb3JFYWNoKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcclxuICAgIHJlaW5Gb3JjZVNlbnRlbmNlKG9TZW50ZW5jZSk7XHJcbiAgfSlcclxuICBhQ2F0ZWdvcml6ZWRBcnJheS5zb3J0KFNlbnRlbmNlLmNtcFJhbmtpbmdQcm9kdWN0KTtcclxuICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZyhcImFmdGVyIHJlaW5mb3JjZVwiICsgYUNhdGVnb3JpemVkQXJyYXkubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcclxuICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XHJcbiAgICB9KS5qb2luKFwiXFxuXCIpKTtcclxuICB9XHJcbiAgcmV0dXJuIGFDYXRlZ29yaXplZEFycmF5O1xyXG59XHJcblxyXG5cclxuLy8vIGJlbG93IG1heSBubyBsb25nZXIgYmUgdXNlZFxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVnRXhwKG9SdWxlOiBJUnVsZSwgY29udGV4dDogSUZNYXRjaC5jb250ZXh0LCBvcHRpb25zPzogSU1hdGNoT3B0aW9ucykge1xyXG4gIGlmIChjb250ZXh0W29SdWxlLmtleV0gPT09IHVuZGVmaW5lZCkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICB9XHJcbiAgdmFyIHNLZXkgPSBvUnVsZS5rZXk7XHJcbiAgdmFyIHMxID0gY29udGV4dFtvUnVsZS5rZXldLnRvTG93ZXJDYXNlKClcclxuICB2YXIgcmVnID0gb1J1bGUucmVnZXhwO1xyXG5cclxuICB2YXIgbSA9IHJlZy5leGVjKHMxKTtcclxuICBpZihkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xyXG4gICAgZGVidWdsb2dWKFwiYXBwbHlpbmcgcmVnZXhwOiBcIiArIHMxICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XHJcbiAgfVxyXG4gIGlmICghbSkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICB9XHJcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cclxuICB2YXIgZGVsdGEgPSBjb21wYXJlQ29udGV4dChjb250ZXh0LCBvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpXHJcbiAgaWYgKGRlYnVnbG9nVi5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZ1YoSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcclxuICAgIGRlYnVnbG9nVihKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XHJcbiAgfVxyXG4gIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gIH1cclxuICB2YXIgb0V4dHJhY3RlZENvbnRleHQgPSBleHRyYWN0QXJnc01hcChtLCBvUnVsZS5hcmdzTWFwKTtcclxuICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nVihcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUuYXJnc01hcCkpO1xyXG4gICAgZGVidWdsb2dWKFwibWF0Y2ggXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XHJcbiAgICBkZWJ1Z2xvZ1YoXCJleHRyYWN0ZWQgYXJncyBcIiArIEpTT04uc3RyaW5naWZ5KG9FeHRyYWN0ZWRDb250ZXh0KSk7XHJcbiAgfVxyXG4gIHZhciByZXMgPSBBbnlPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKSBhcyBhbnk7XHJcbiAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9FeHRyYWN0ZWRDb250ZXh0KTtcclxuICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgY29udGV4dCk7XHJcbiAgaWYgKG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldICE9PSB1bmRlZmluZWQpIHtcclxuICAgIHJlc1tzS2V5XSA9IG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldO1xyXG4gIH1cclxuICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xyXG4gICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xyXG4gICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9FeHRyYWN0ZWRDb250ZXh0KVxyXG4gIH1cclxuICBPYmplY3QuZnJlZXplKHJlcyk7XHJcbiAgZGVidWdsb2coJ0ZvdW5kIG9uZScgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzb3J0QnlXZWlnaHQoc0tleTogc3RyaW5nLCBvQ29udGV4dEE6IElGTWF0Y2guY29udGV4dCwgb0NvbnRleHRCOiBJRk1hdGNoLmNvbnRleHQpOiBudW1iZXIge1xyXG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZ1YoJ3NvcnRpbmc6ICcgKyBzS2V5ICsgJ2ludm9rZWQgd2l0aFxcbiAxOicgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEEsIHVuZGVmaW5lZCwgMikgK1xyXG4gICAgXCIgdnMgXFxuIDI6XCIgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEIsIHVuZGVmaW5lZCwgMikpO1xyXG4gIH1cclxuICB2YXIgcmFua2luZ0E6IG51bWJlciA9IHBhcnNlRmxvYXQob0NvbnRleHRBW1wiX3JhbmtpbmdcIl0gfHwgXCIxXCIpO1xyXG4gIHZhciByYW5raW5nQjogbnVtYmVyID0gcGFyc2VGbG9hdChvQ29udGV4dEJbXCJfcmFua2luZ1wiXSB8fCBcIjFcIik7XHJcbiAgaWYgKHJhbmtpbmdBICE9PSByYW5raW5nQikge1xyXG4gICAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgICBkZWJ1Z2xvZyhcIiByYW5raW4gZGVsdGFcIiArIDEwMCAqIChyYW5raW5nQiAtIHJhbmtpbmdBKSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gMTAwICogKHJhbmtpbmdCIC0gcmFua2luZ0EpXHJcbiAgfVxyXG5cclxuICB2YXIgd2VpZ2h0QSA9IG9Db250ZXh0QVtcIl93ZWlnaHRcIl0gJiYgb0NvbnRleHRBW1wiX3dlaWdodFwiXVtzS2V5XSB8fCAwO1xyXG4gIHZhciB3ZWlnaHRCID0gb0NvbnRleHRCW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdW3NLZXldIHx8IDA7XHJcbiAgcmV0dXJuICsod2VpZ2h0QSAtIHdlaWdodEIpO1xyXG59XHJcblxyXG5cclxuLy8gV29yZCwgU3lub255bSwgUmVnZXhwIC8gRXh0cmFjdGlvblJ1bGVcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhdWdtZW50Q29udGV4dDEoY29udGV4dDogSUZNYXRjaC5jb250ZXh0LCBvUnVsZXM6IEFycmF5PElSdWxlPiwgb3B0aW9uczogSU1hdGNoT3B0aW9ucyk6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIHZhciBzS2V5ID0gb1J1bGVzWzBdLmtleTtcclxuICAvLyBjaGVjayB0aGF0IHJ1bGVcclxuICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgLy8gY2hlY2sgY29uc2lzdGVuY3lcclxuICAgIG9SdWxlcy5ldmVyeShmdW5jdGlvbiAoaVJ1bGUpIHtcclxuICAgICAgaWYgKGlSdWxlLmtleSAhPT0gc0tleSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkluaG9tb2dlbm91cyBrZXlzIGluIHJ1bGVzLCBleHBlY3RlZCBcIiArIHNLZXkgKyBcIiB3YXMgXCIgKyBKU09OLnN0cmluZ2lmeShpUnVsZSkpO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvLyBsb29rIGZvciBydWxlcyB3aGljaCBtYXRjaFxyXG4gIHZhciByZXMgPSBvUnVsZXMubWFwKGZ1bmN0aW9uIChvUnVsZSkge1xyXG4gICAgLy8gaXMgdGhpcyBydWxlIGFwcGxpY2FibGVcclxuICAgIHN3aXRjaCAob1J1bGUudHlwZSkge1xyXG4gICAgICBjYXNlIElGTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQ6XHJcbiAgICAgICAgcmV0dXJuIG1hdGNoV29yZChvUnVsZSwgY29udGV4dCwgb3B0aW9ucylcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5SRUdFWFA6XHJcbiAgICAgICAgcmV0dXJuIG1hdGNoUmVnRXhwKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKTtcclxuICAgICAgLy8gICBjYXNlIFwiRXh0cmFjdGlvblwiOlxyXG4gICAgICAvLyAgICAgcmV0dXJuIG1hdGNoRXh0cmFjdGlvbihvUnVsZSxjb250ZXh0KTtcclxuICAgIH1cclxuICAgIHJldHVybiB1bmRlZmluZWRcclxuICB9KS5maWx0ZXIoZnVuY3Rpb24gKG9yZXMpIHtcclxuICAgIHJldHVybiAhIW9yZXNcclxuICB9KS5zb3J0KFxyXG4gICAgc29ydEJ5V2VpZ2h0LmJpbmQodGhpcywgc0tleSlcclxuICAgICk7XHJcbiAgcmV0dXJuIHJlcztcclxuICAvLyBPYmplY3Qua2V5cygpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcclxuICAvLyB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0KGNvbnRleHQ6IElGTWF0Y2guY29udGV4dCwgYVJ1bGVzOiBBcnJheTxJUnVsZT4pOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuXHJcbiAgdmFyIG9wdGlvbnMxOiBJTWF0Y2hPcHRpb25zID0ge1xyXG4gICAgbWF0Y2hvdGhlcnM6IHRydWUsXHJcbiAgICBvdmVycmlkZTogZmFsc2VcclxuICB9IGFzIElNYXRjaE9wdGlvbnM7XHJcblxyXG4gIHZhciBhUmVzID0gYXVnbWVudENvbnRleHQxKGNvbnRleHQsIGFSdWxlcywgb3B0aW9uczEpXHJcblxyXG4gIGlmIChhUmVzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgdmFyIG9wdGlvbnMyOiBJTWF0Y2hPcHRpb25zID0ge1xyXG4gICAgICBtYXRjaG90aGVyczogZmFsc2UsXHJcbiAgICAgIG92ZXJyaWRlOiB0cnVlXHJcbiAgICB9IGFzIElNYXRjaE9wdGlvbnM7XHJcbiAgICBhUmVzID0gYXVnbWVudENvbnRleHQxKGNvbnRleHQsIGFSdWxlcywgb3B0aW9uczIpO1xyXG4gIH1cclxuICByZXR1cm4gYVJlcztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGluc2VydE9yZGVyZWQocmVzdWx0OiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+LCBpSW5zZXJ0ZWRNZW1iZXI6IElGTWF0Y2guY29udGV4dCwgbGltaXQ6IG51bWJlcik6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIC8vIFRPRE86IHVzZSBzb21lIHdlaWdodFxyXG4gIGlmIChyZXN1bHQubGVuZ3RoIDwgbGltaXQpIHtcclxuICAgIHJlc3VsdC5wdXNoKGlJbnNlcnRlZE1lbWJlcilcclxuICB9XHJcbiAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB0YWtlVG9wTihhcnI6IEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+KTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgdmFyIHUgPSBhcnIuZmlsdGVyKGZ1bmN0aW9uIChpbm5lckFycikgeyByZXR1cm4gaW5uZXJBcnIubGVuZ3RoID4gMCB9KVxyXG5cclxuICB2YXIgcmVzID0gW107XHJcbiAgLy8gc2hpZnQgb3V0IHRoZSB0b3Agb25lc1xyXG4gIHUgPSB1Lm1hcChmdW5jdGlvbiAoaUFycikge1xyXG4gICAgdmFyIHRvcCA9IGlBcnIuc2hpZnQoKTtcclxuICAgIHJlcyA9IGluc2VydE9yZGVyZWQocmVzLCB0b3AsIDUpXHJcbiAgICByZXR1cm4gaUFyclxyXG4gIH0pLmZpbHRlcihmdW5jdGlvbiAoaW5uZXJBcnI6IEFycmF5PElGTWF0Y2guY29udGV4dD4pOiBib29sZWFuIHsgcmV0dXJuIGlubmVyQXJyLmxlbmd0aCA+IDAgfSk7XHJcbiAgLy8gYXMgQXJyYXk8QXJyYXk8SUZNYXRjaC5jb250ZXh0Pj5cclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5pbXBvcnQgKiBhcyBpbnB1dEZpbHRlclJ1bGVzIGZyb20gJy4vaW5wdXRGaWx0ZXJSdWxlcyc7XHJcblxyXG52YXIgcm07XHJcblxyXG5mdW5jdGlvbiBnZXRSTU9uY2UoKSB7XHJcbiAgaWYgKCFybSkge1xyXG4gICAgcm0gPSBpbnB1dEZpbHRlclJ1bGVzLmdldFJ1bGVNYXAoKVxyXG4gIH1cclxuICByZXR1cm4gcm07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhcHBseVJ1bGVzKGNvbnRleHQ6IElGTWF0Y2guY29udGV4dCk6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIHZhciBiZXN0TjogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiA9IFtjb250ZXh0XTtcclxuICBpbnB1dEZpbHRlclJ1bGVzLm9LZXlPcmRlci5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5OiBzdHJpbmcpIHtcclxuICAgIHZhciBiZXN0TmV4dDogQXJyYXk8QXJyYXk8SUZNYXRjaC5jb250ZXh0Pj4gPSBbXTtcclxuICAgIGJlc3ROLmZvckVhY2goZnVuY3Rpb24gKG9Db250ZXh0OiBJRk1hdGNoLmNvbnRleHQpIHtcclxuICAgICAgaWYgKG9Db250ZXh0W3NLZXldKSB7XHJcbiAgICAgICAgZGVidWdsb2coJyoqIGFwcGx5aW5nIHJ1bGVzIGZvciAnICsgc0tleSlcclxuICAgICAgICB2YXIgcmVzID0gYXVnbWVudENvbnRleHQob0NvbnRleHQsIGdldFJNT25jZSgpW3NLZXldIHx8IFtdKVxyXG4gICAgICAgIGRlYnVnbG9nKCcqKiByZXN1bHQgZm9yICcgKyBzS2V5ICsgJyA9ICcgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpXHJcbiAgICAgICAgYmVzdE5leHQucHVzaChyZXMgfHwgW10pXHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gcnVsZSBub3QgcmVsZXZhbnRcclxuICAgICAgICBiZXN0TmV4dC5wdXNoKFtvQ29udGV4dF0pO1xyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gICAgYmVzdE4gPSB0YWtlVG9wTihiZXN0TmV4dCk7XHJcbiAgfSk7XHJcbiAgcmV0dXJuIGJlc3ROXHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlSdWxlc1BpY2tGaXJzdChjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQpOiBJRk1hdGNoLmNvbnRleHQge1xyXG4gIHZhciByID0gYXBwbHlSdWxlcyhjb250ZXh0KTtcclxuICByZXR1cm4gciAmJiByWzBdO1xyXG59XHJcblxyXG4vKipcclxuICogRGVjaWRlIHdoZXRoZXIgdG8gcmVxdWVyeSBmb3IgYSBjb250ZXRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBkZWNpZGVPblJlUXVlcnkoY29udGV4dDogSUZNYXRjaC5jb250ZXh0KTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgcmV0dXJuIFtdXHJcbn1cclxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
