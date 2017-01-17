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
function categorizeAWord(sWordGroup, rules, sentence, words, cntRec) {
    var seenIt = words[sWordGroup];
    if (seenIt === undefined) {
        seenIt = categorizeWordWithRankCutoff(sWordGroup, rules, cntRec);
        utils.deepFreeze(seenIt);
        words[sWordGroup] = seenIt;
    }
    if (!seenIt || seenIt.length === 0) {
        logger("***WARNING: Did not find any categorization for \"" + sWordGroup + "\" in sentence \"" + sentence + "\"");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1hdGNoL2lucHV0RmlsdGVyLmpzIiwiLi4vc3JjL21hdGNoL2lucHV0RmlsdGVyLnRzIl0sIm5hbWVzIjpbImRpc3RhbmNlIiwicmVxdWlyZSIsIkxvZ2dlciIsImxvZ2dlciIsImRlYnVnIiwiZGVidWdwZXJmIiwidXRpbHMiLCJBbGdvbCIsImJyZWFrZG93biIsIkFueU9iamVjdCIsIk9iamVjdCIsImRlYnVnbG9nIiwiZGVidWdsb2dWIiwiZGVidWdsb2dNIiwibWF0Y2hkYXRhIiwib1VuaXRUZXN0cyIsImNhbGNEaXN0YW5jZSIsInNUZXh0MSIsInNUZXh0MiIsImxlbmd0aCIsImNhbGNEaXN0IiwibGVuZ3RoRGVsdGExIiwiYTAiLCJsZXZlbnNodGVpbiIsInN1YnN0cmluZyIsImVuYWJsZWQiLCJhIiwiSUZNYXRjaCIsImxldmVuQ3V0b2ZmIiwiQ3V0b2ZmX0xldmVuU2h0ZWluIiwibGV2ZW5QZW5hbHR5IiwiaSIsImV4cG9ydHMiLCJub25Qcml2YXRlS2V5cyIsIm9BIiwia2V5cyIsImZpbHRlciIsImtleSIsImNvdW50QWluQiIsIm9CIiwiZm5Db21wYXJlIiwiYUtleUlnbm9yZSIsIkFycmF5IiwiaXNBcnJheSIsImluZGV4T2YiLCJyZWR1Y2UiLCJwcmV2IiwicHJvdG90eXBlIiwiaGFzT3duUHJvcGVydHkiLCJjYWxsIiwic3B1cmlvdXNBbm90SW5CIiwibG93ZXJDYXNlIiwibyIsInRvTG93ZXJDYXNlIiwiY29tcGFyZUNvbnRleHQiLCJlcXVhbCIsImIiLCJkaWZmZXJlbnQiLCJzcHVyaW91c0wiLCJzcHVyaW91c1IiLCJzb3J0QnlSYW5rIiwiciIsIl9yYW5raW5nIiwiY2F0ZWdvcnkiLCJsb2NhbGVDb21wYXJlIiwibWF0Y2hlZFN0cmluZyIsImNoZWNrT25lUnVsZSIsInN0cmluZyIsImxjU3RyaW5nIiwiZXhhY3QiLCJyZXMiLCJvUnVsZSIsImNudFJlYyIsIkpTT04iLCJzdHJpbmdpZnkiLCJ0eXBlIiwibG93ZXJjYXNld29yZCIsIkVycm9yIiwidW5kZWZpbmVkIiwid29yZCIsInB1c2giLCJleGFjdE9ubHkiLCJsZXZlbm1hdGNoIiwiYWRkQ250UmVjIiwibSIsInJlZ2V4cCIsImV4ZWMiLCJtYXRjaEluZGV4IiwibWVtYmVyIiwibnVtYmVyIiwiY2F0ZWdvcml6ZVN0cmluZyIsIm9SdWxlcyIsImZvckVhY2giLCJzb3J0IiwiY2F0ZWdvcml6ZVN0cmluZzIiLCJydWxlcyIsIndvcmRNYXAiLCJub25Xb3JkUnVsZXMiLCJhbGxSdWxlcyIsIm1hdGNoV29yZCIsImNvbnRleHQiLCJvcHRpb25zIiwiczEiLCJzMiIsImRlbHRhIiwiZm9sbG93cyIsIm1hdGNob3RoZXJzIiwiYyIsImFzc2lnbiIsIm92ZXJyaWRlIiwiX3dlaWdodCIsImZyZWV6ZSIsImV4dHJhY3RBcmdzTWFwIiwibWF0Y2giLCJhcmdzTWFwIiwiaUtleSIsInZhbHVlIiwiUmFua1dvcmQiLCJoYXNBYm92ZSIsImxzdCIsImJvcmRlciIsImV2ZXJ5Iiwib01lbWJlciIsInRha2VGaXJzdE4iLCJuIiwiaUluZGV4IiwibGFzdFJhbmtpbmciLCJ0YWtlQWJvdmUiLCJjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmIiwic1dvcmRHcm91cCIsInNwbGl0UnVsZXMiLCJzZWVuSXQiLCJUb3BfTl9Xb3JkQ2F0ZWdvcml6YXRpb25zIiwiZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkU2VudGVuY2UiLCJvU2VudGVuY2UiLCJvV29yZEdyb3VwIiwiZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkIiwiYXJyIiwiY2F0ZWdvcml6ZUFXb3JkIiwic2VudGVuY2UiLCJ3b3JkcyIsImRlZXBGcmVlemUiLCJjbG9uZURlZXAiLCJhbmFseXplU3RyaW5nIiwic1N0cmluZyIsImNudCIsImZhYyIsInUiLCJicmVha2Rvd25TdHJpbmciLCJNYXhTcGFjZXNQZXJDb21iaW5lZFdvcmQiLCJhQnJlYWtEb3duU2VudGVuY2UiLCJjYXRlZ29yaXplZFNlbnRlbmNlIiwiaXNWYWxpZCIsImluZGV4IiwiY2xvbmUiLCJjb3B5VmVjTWVtYmVycyIsImV4cGFuZE1hdGNoQXJyIiwiZGVlcCIsImxpbmUiLCJ1QnJlYWtEb3duTGluZSIsImFXb3JkR3JvdXAiLCJ3Z0luZGV4Iiwib1dvcmRWYXJpYW50IiwiaVdWSW5kZXgiLCJudmVjcyIsInZlY3MiLCJydmVjIiwiayIsIm5leHRCYXNlIiwibCIsInNsaWNlIiwiY29uY2F0IiwicmVpbmZvcmNlRGlzdFdlaWdodCIsImRpc3QiLCJhYnMiLCJNYXRoIiwiYVJlaW5mb3JjZURpc3RXZWlnaHQiLCJleHRyYWN0Q2F0ZWdvcnlNYXAiLCJvV29yZCIsIkNBVF9DQVRFR09SWSIsInBvcyIsInJlaW5Gb3JjZVNlbnRlbmNlIiwib0NhdGVnb3J5TWFwIiwib1Bvc2l0aW9uIiwicmVpbmZvcmNlIiwiYm9vc3QiLCJTZW50ZW5jZSIsInJlaW5Gb3JjZSIsImFDYXRlZ29yaXplZEFycmF5IiwiY21wUmFua2luZ1Byb2R1Y3QiLCJtYXAiLCJyYW5raW5nUHJvZHVjdCIsImpvaW4iLCJtYXRjaFJlZ0V4cCIsInNLZXkiLCJyZWciLCJvRXh0cmFjdGVkQ29udGV4dCIsInNvcnRCeVdlaWdodCIsIm9Db250ZXh0QSIsIm9Db250ZXh0QiIsInJhbmtpbmdBIiwicGFyc2VGbG9hdCIsInJhbmtpbmdCIiwid2VpZ2h0QSIsIndlaWdodEIiLCJhdWdtZW50Q29udGV4dDEiLCJpUnVsZSIsIm9yZXMiLCJiaW5kIiwiYXVnbWVudENvbnRleHQiLCJhUnVsZXMiLCJvcHRpb25zMSIsImFSZXMiLCJvcHRpb25zMiIsImluc2VydE9yZGVyZWQiLCJyZXN1bHQiLCJpSW5zZXJ0ZWRNZW1iZXIiLCJsaW1pdCIsInRha2VUb3BOIiwiaW5uZXJBcnIiLCJpQXJyIiwidG9wIiwic2hpZnQiLCJpbnB1dEZpbHRlclJ1bGVzIiwicm0iLCJnZXRSTU9uY2UiLCJnZXRSdWxlTWFwIiwiYXBwbHlSdWxlcyIsImJlc3ROIiwib0tleU9yZGVyIiwiYmVzdE5leHQiLCJvQ29udGV4dCIsImFw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TSxtQkFBQSxHQUFtQkEsbUJBQW5CO0FBS2hCOzs7QUFHQSxTQUFBQyxlQUFBLENBQWdDckksT0FBaEMsRUFBd0Q7QUFDdEQsV0FBTyxFQUFQO0FBQ0Q7QUFGZXBFLFFBQUF5TSxlQUFBLEdBQWVBLGVBQWYiLCJmaWxlIjoibWF0Y2gvaW5wdXRGaWx0ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcbi8qKlxuICogdGhlIGlucHV0IGZpbHRlciBzdGFnZSBwcmVwcm9jZXNzZXMgYSBjdXJyZW50IGNvbnRleHRcbiAqXG4gKiBJdCBhKSBjb21iaW5lcyBtdWx0aS1zZWdtZW50IGFyZ3VtZW50cyBpbnRvIG9uZSBjb250ZXh0IG1lbWJlcnNcbiAqIEl0IGIpIGF0dGVtcHRzIHRvIGF1Z21lbnQgdGhlIGNvbnRleHQgYnkgYWRkaXRpb25hbCBxdWFsaWZpY2F0aW9uc1xuICogICAgICAgICAgIChNaWQgdGVybSBnZW5lcmF0aW5nIEFsdGVybmF0aXZlcywgZS5nLlxuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHVuaXQgdGVzdD9cbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiBzb3VyY2UgP1xuICogICAgICAgICAgIClcbiAqICBTaW1wbGUgcnVsZXMgbGlrZSAgSW50ZW50XG4gKlxuICpcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmlucHV0RmlsdGVyXG4gKiBAZmlsZSBpbnB1dEZpbHRlci50c1xuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxuICovXG4vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9saWIvbm9kZS00LmQudHNcIiAvPlxudmFyIGRpc3RhbmNlID0gcmVxdWlyZSgnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluJyk7XG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi4vdXRpbHMvbG9nZ2VyJyk7XG52YXIgbG9nZ2VyID0gTG9nZ2VyLmxvZ2dlcignaW5wdXRGaWx0ZXInKTtcbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJyk7XG52YXIgZGVidWdwZXJmID0gZGVidWcoJ3BlcmYnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzL3V0aWxzJyk7XG52YXIgQWxnb2wgPSByZXF1aXJlKCcuL2FsZ29sJyk7XG52YXIgYnJlYWtkb3duID0gcmVxdWlyZSgnLi9icmVha2Rvd24nKTtcbnZhciBBbnlPYmplY3QgPSBPYmplY3Q7XG52YXIgZGVidWdsb2cgPSBkZWJ1ZygnaW5wdXRGaWx0ZXInKTtcbnZhciBkZWJ1Z2xvZ1YgPSBkZWJ1ZygnaW5wdXRWRmlsdGVyJyk7XG52YXIgZGVidWdsb2dNID0gZGVidWcoJ2lucHV0TUZpbHRlcicpO1xudmFyIG1hdGNoZGF0YSA9IHJlcXVpcmUoJy4vbWF0Y2hkYXRhJyk7XG52YXIgb1VuaXRUZXN0cyA9IG1hdGNoZGF0YS5vVW5pdFRlc3RzO1xuLyoqXG4gKiBAcGFyYW0gc1RleHQge3N0cmluZ30gdGhlIHRleHQgdG8gbWF0Y2ggdG8gTmF2VGFyZ2V0UmVzb2x1dGlvblxuICogQHBhcmFtIHNUZXh0MiB7c3RyaW5nfSB0aGUgcXVlcnkgdGV4dCwgZS5nLiBOYXZUYXJnZXRcbiAqXG4gKiBAcmV0dXJuIHRoZSBkaXN0YW5jZSwgbm90ZSB0aGF0IGlzIGlzICpub3QqIHN5bW1ldHJpYyFcbiAqL1xuZnVuY3Rpb24gY2FsY0Rpc3RhbmNlKHNUZXh0MSwgc1RleHQyKSB7XG4gICAgLy8gY29uc29sZS5sb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxuICAgIGlmICgoKHNUZXh0MS5sZW5ndGggLSBzVGV4dDIubGVuZ3RoKSA+IEFsZ29sLmNhbGNEaXN0Lmxlbmd0aERlbHRhMSlcbiAgICAgICAgfHwgKHNUZXh0Mi5sZW5ndGggPiAxLjUgKiBzVGV4dDEubGVuZ3RoKVxuICAgICAgICB8fCAoc1RleHQyLmxlbmd0aCA8IChzVGV4dDEubGVuZ3RoIC8gMikpKSB7XG4gICAgICAgIHJldHVybiA1MDAwMDtcbiAgICB9XG4gICAgdmFyIGEwID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnN1YnN0cmluZygwLCBzVGV4dDIubGVuZ3RoKSwgc1RleHQyKTtcbiAgICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2dWKFwiZGlzdGFuY2VcIiArIGEwICsgXCJzdHJpcHBlZD5cIiArIHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCkgKyBcIjw+XCIgKyBzVGV4dDIgKyBcIjxcIik7XG4gICAgfVxuICAgIGlmIChhMCAqIDUwID4gMTUgKiBzVGV4dDIubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiA0MDAwMDtcbiAgICB9XG4gICAgdmFyIGEgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEsIHNUZXh0Mik7XG4gICAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGE7XG59XG52YXIgSUZNYXRjaCA9IHJlcXVpcmUoJy4uL21hdGNoL2lmbWF0Y2gnKTtcbnZhciBsZXZlbkN1dG9mZiA9IEFsZ29sLkN1dG9mZl9MZXZlblNodGVpbjtcbmZ1bmN0aW9uIGxldmVuUGVuYWx0eShpKSB7XG4gICAgLy8gMC0+IDFcbiAgICAvLyAxIC0+IDAuMVxuICAgIC8vIDE1MCAtPiAgMC44XG4gICAgaWYgKGkgPT09IDApIHtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgfVxuICAgIC8vIHJldmVyc2UgbWF5IGJlIGJldHRlciB0aGFuIGxpbmVhclxuICAgIHJldHVybiAxICsgaSAqICgwLjggLSAxKSAvIDE1MDtcbn1cbmV4cG9ydHMubGV2ZW5QZW5hbHR5ID0gbGV2ZW5QZW5hbHR5O1xuZnVuY3Rpb24gbm9uUHJpdmF0ZUtleXMob0EpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMob0EpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHJldHVybiBrZXlbMF0gIT09ICdfJztcbiAgICB9KTtcbn1cbmZ1bmN0aW9uIGNvdW50QWluQihvQSwgb0IsIGZuQ29tcGFyZSwgYUtleUlnbm9yZSkge1xuICAgIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gYUtleUlnbm9yZSA6XG4gICAgICAgIHR5cGVvZiBhS2V5SWdub3JlID09PSBcInN0cmluZ1wiID8gW2FLZXlJZ25vcmVdIDogW107XG4gICAgZm5Db21wYXJlID0gZm5Db21wYXJlIHx8IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH07XG4gICAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xuICAgIH0pLlxuICAgICAgICByZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9CLCBrZXkpKSB7XG4gICAgICAgICAgICBwcmV2ID0gcHJldiArIChmbkNvbXBhcmUob0Fba2V5XSwgb0Jba2V5XSwga2V5KSA/IDEgOiAwKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbn1cbmV4cG9ydHMuY291bnRBaW5CID0gY291bnRBaW5CO1xuZnVuY3Rpb24gc3B1cmlvdXNBbm90SW5CKG9BLCBvQiwgYUtleUlnbm9yZSkge1xuICAgIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gYUtleUlnbm9yZSA6XG4gICAgICAgIHR5cGVvZiBhS2V5SWdub3JlID09PSBcInN0cmluZ1wiID8gW2FLZXlJZ25vcmVdIDogW107XG4gICAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xuICAgIH0pLlxuICAgICAgICByZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xuICAgICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xuICAgICAgICAgICAgcHJldiA9IHByZXYgKyAxO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIDApO1xufVxuZXhwb3J0cy5zcHVyaW91c0Fub3RJbkIgPSBzcHVyaW91c0Fub3RJbkI7XG5mdW5jdGlvbiBsb3dlckNhc2Uobykge1xuICAgIGlmICh0eXBlb2YgbyA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICByZXR1cm4gby50b0xvd2VyQ2FzZSgpO1xuICAgIH1cbiAgICByZXR1cm4gbztcbn1cbmZ1bmN0aW9uIGNvbXBhcmVDb250ZXh0KG9BLCBvQiwgYUtleUlnbm9yZSkge1xuICAgIHZhciBlcXVhbCA9IGNvdW50QWluQihvQSwgb0IsIGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBsb3dlckNhc2UoYSkgPT09IGxvd2VyQ2FzZShiKTsgfSwgYUtleUlnbm9yZSk7XG4gICAgdmFyIGRpZmZlcmVudCA9IGNvdW50QWluQihvQSwgb0IsIGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBsb3dlckNhc2UoYSkgIT09IGxvd2VyQ2FzZShiKTsgfSwgYUtleUlnbm9yZSk7XG4gICAgdmFyIHNwdXJpb3VzTCA9IHNwdXJpb3VzQW5vdEluQihvQSwgb0IsIGFLZXlJZ25vcmUpO1xuICAgIHZhciBzcHVyaW91c1IgPSBzcHVyaW91c0Fub3RJbkIob0IsIG9BLCBhS2V5SWdub3JlKTtcbiAgICByZXR1cm4ge1xuICAgICAgICBlcXVhbDogZXF1YWwsXG4gICAgICAgIGRpZmZlcmVudDogZGlmZmVyZW50LFxuICAgICAgICBzcHVyaW91c0w6IHNwdXJpb3VzTCxcbiAgICAgICAgc3B1cmlvdXNSOiBzcHVyaW91c1JcbiAgICB9O1xufVxuZXhwb3J0cy5jb21wYXJlQ29udGV4dCA9IGNvbXBhcmVDb250ZXh0O1xuZnVuY3Rpb24gc29ydEJ5UmFuayhhLCBiKSB7XG4gICAgdmFyIHIgPSAtKChhLl9yYW5raW5nIHx8IDEuMCkgLSAoYi5fcmFua2luZyB8fCAxLjApKTtcbiAgICBpZiAocikge1xuICAgICAgICByZXR1cm4gcjtcbiAgICB9XG4gICAgaWYgKGEuY2F0ZWdvcnkgJiYgYi5jYXRlZ29yeSkge1xuICAgICAgICByID0gYS5jYXRlZ29yeS5sb2NhbGVDb21wYXJlKGIuY2F0ZWdvcnkpO1xuICAgICAgICBpZiAocikge1xuICAgICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKGEubWF0Y2hlZFN0cmluZyAmJiBiLm1hdGNoZWRTdHJpbmcpIHtcbiAgICAgICAgciA9IGEubWF0Y2hlZFN0cmluZy5sb2NhbGVDb21wYXJlKGIubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgIGlmIChyKSB7XG4gICAgICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gMDtcbn1cbmZ1bmN0aW9uIGNoZWNrT25lUnVsZShzdHJpbmcsIGxjU3RyaW5nLCBleGFjdCwgcmVzLCBvUnVsZSwgY250UmVjKSB7XG4gICAgaWYgKGRlYnVnbG9nVi5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nVignYXR0ZW1wdGluZyB0byBtYXRjaCBydWxlICcgKyBKU09OLnN0cmluZ2lmeShvUnVsZSkgKyBcIiB0byBzdHJpbmcgXFxcIlwiICsgc3RyaW5nICsgXCJcXFwiXCIpO1xuICAgIH1cbiAgICBzd2l0Y2ggKG9SdWxlLnR5cGUpIHtcbiAgICAgICAgY2FzZSAwIC8qIFdPUkQgKi86XG4gICAgICAgICAgICBpZiAoIW9SdWxlLmxvd2VyY2FzZXdvcmQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3J1bGUgd2l0aG91dCBhIGxvd2VyY2FzZSB2YXJpYW50JyArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDtcbiAgICAgICAgICAgIGlmIChleGFjdCAmJiBvUnVsZS53b3JkID09PSBzdHJpbmcgfHwgb1J1bGUubG93ZXJjYXNld29yZCA9PT0gbGNTdHJpbmcpIHtcbiAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBvUnVsZS5tYXRjaGVkU3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghZXhhY3QgJiYgIW9SdWxlLmV4YWN0T25seSkge1xuICAgICAgICAgICAgICAgIHZhciBsZXZlbm1hdGNoID0gY2FsY0Rpc3RhbmNlKG9SdWxlLmxvd2VyY2FzZXdvcmQsIGxjU3RyaW5nKTtcbiAgICAgICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLCBcImNhbGNEaXN0YW5jZVwiLCAxKTtcbiAgICAgICAgICAgICAgICBpZiAobGV2ZW5tYXRjaCA8IDUwMDAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsIFwiY2FsY0Rpc3RhbmNlRXhwXCIsIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobGV2ZW5tYXRjaCA8IDQwMDAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsIFwiY2FsY0Rpc3RhbmNlQmVsb3c0MGtcIiwgMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChsZXZlbm1hdGNoIDwgbGV2ZW5DdXRvZmYpIHtcbiAgICAgICAgICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYywgXCJjYWxjRGlzdGFuY2VPa1wiLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBvUnVsZS5tYXRjaGVkU3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IChvUnVsZS5fcmFua2luZyB8fCAxLjApICogbGV2ZW5QZW5hbHR5KGxldmVubWF0Y2gpLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGV2ZW5tYXRjaDogbGV2ZW5tYXRjaFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAxIC8qIFJFR0VYUCAqLzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShcIiBoZXJlIHJlZ2V4cFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUsIHVuZGVmaW5lZCwgMikpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIG0gPSBvUnVsZS5yZWdleHAuZXhlYyhzdHJpbmcpO1xuICAgICAgICAgICAgICAgIGlmIChtKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogKG9SdWxlLm1hdGNoSW5kZXggIT09IHVuZGVmaW5lZCAmJiBtW29SdWxlLm1hdGNoSW5kZXhdKSB8fCBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgICAgICBfcmFua2luZzogb1J1bGUuX3JhbmtpbmcgfHwgMS4wXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidW5rbm93biB0eXBlXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxufVxuZXhwb3J0cy5jaGVja09uZVJ1bGUgPSBjaGVja09uZVJ1bGU7XG47XG5mdW5jdGlvbiBhZGRDbnRSZWMoY250UmVjLCBtZW1iZXIsIG51bWJlcikge1xuICAgIGlmICgoIWNudFJlYykgfHwgKG51bWJlciA9PT0gMCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjbnRSZWNbbWVtYmVyXSA9IChjbnRSZWNbbWVtYmVyXSB8fCAwKSArIG51bWJlcjtcbn1cbmZ1bmN0aW9uIGNhdGVnb3JpemVTdHJpbmcoc3RyaW5nLCBleGFjdCwgb1J1bGVzLCBjbnRSZWMpIHtcbiAgICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXG4gICAgaWYgKGRlYnVnbG9nTS5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nTShcInJ1bGVzIDogXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZXMsIHVuZGVmaW5lZCwgMikpO1xuICAgIH1cbiAgICB2YXIgbGNTdHJpbmcgPSBzdHJpbmcudG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgb1J1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgIGNoZWNrT25lUnVsZShzdHJpbmcsIGxjU3RyaW5nLCBleGFjdCwgcmVzLCBvUnVsZSwgY250UmVjKTtcbiAgICB9KTtcbiAgICByZXMuc29ydChzb3J0QnlSYW5rKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5jYXRlZ29yaXplU3RyaW5nID0gY2F0ZWdvcml6ZVN0cmluZztcbmZ1bmN0aW9uIGNhdGVnb3JpemVTdHJpbmcyKHN0cmluZywgZXhhY3QsIHJ1bGVzLCBjbnRSZWMpIHtcbiAgICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXG4gICAgaWYgKGRlYnVnbG9nTS5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nTShcInJ1bGVzIDogXCIgKyBKU09OLnN0cmluZ2lmeShydWxlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHZhciBsY1N0cmluZyA9IHN0cmluZy50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBpZiAoZXhhY3QpIHtcbiAgICAgICAgdmFyIHIgPSBydWxlcy53b3JkTWFwW2xjU3RyaW5nXTtcbiAgICAgICAgaWYgKHIpIHtcbiAgICAgICAgICAgIHIuZm9yRWFjaChmdW5jdGlvbiAob1J1bGUpIHtcbiAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBvUnVsZS5tYXRjaGVkU3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJ1bGVzLm5vbldvcmRSdWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChvUnVsZSkge1xuICAgICAgICAgICAgY2hlY2tPbmVSdWxlKHN0cmluZywgbGNTdHJpbmcsIGV4YWN0LCByZXMsIG9SdWxlLCBjbnRSZWMpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGRlYnVnbG9nKFwiY2F0ZWdvcml6ZSBub24gZXhhY3RcIiArIHN0cmluZyArIFwiIHh4ICBcIiArIHJ1bGVzLmFsbFJ1bGVzLmxlbmd0aCk7XG4gICAgICAgIHJldHVybiBjYXRlZ29yaXplU3RyaW5nKHN0cmluZywgZXhhY3QsIHJ1bGVzLmFsbFJ1bGVzLCBjbnRSZWMpO1xuICAgIH1cbiAgICByZXMuc29ydChzb3J0QnlSYW5rKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5jYXRlZ29yaXplU3RyaW5nMiA9IGNhdGVnb3JpemVTdHJpbmcyO1xuLyoqXG4gKlxuICogT3B0aW9ucyBtYXkgYmUge1xuICogbWF0Y2hvdGhlcnMgOiB0cnVlLCAgPT4gb25seSBydWxlcyB3aGVyZSBhbGwgb3RoZXJzIG1hdGNoIGFyZSBjb25zaWRlcmVkXG4gKiBhdWdtZW50IDogdHJ1ZSxcbiAqIG92ZXJyaWRlIDogdHJ1ZSB9ICA9PlxuICpcbiAqL1xuZnVuY3Rpb24gbWF0Y2hXb3JkKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBzMSA9IGNvbnRleHRbb1J1bGUua2V5XS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciBzMiA9IG9SdWxlLndvcmQudG9Mb3dlckNhc2UoKTtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB2YXIgZGVsdGEgPSBjb21wYXJlQ29udGV4dChjb250ZXh0LCBvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlbHRhKSk7XG4gICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBjID0gY2FsY0Rpc3RhbmNlKHMyLCBzMSk7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCIgczEgPD4gczIgXCIgKyBzMSArIFwiPD5cIiArIHMyICsgXCIgID0+OiBcIiArIGMpO1xuICAgIH1cbiAgICBpZiAoYyA8IDE1MCkge1xuICAgICAgICB2YXIgcmVzID0gQW55T2JqZWN0LmFzc2lnbih7fSwgb1J1bGUuZm9sbG93cyk7XG4gICAgICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcbiAgICAgICAgaWYgKG9wdGlvbnMub3ZlcnJpZGUpIHtcbiAgICAgICAgICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvUnVsZS5mb2xsb3dzKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBmb3JjZSBrZXkgcHJvcGVydHlcbiAgICAgICAgLy8gY29uc29sZS5sb2coJyBvYmplY3RjYXRlZ29yeScsIHJlc1snc3lzdGVtT2JqZWN0Q2F0ZWdvcnknXSk7XG4gICAgICAgIHJlc1tvUnVsZS5rZXldID0gb1J1bGUuZm9sbG93c1tvUnVsZS5rZXldIHx8IHJlc1tvUnVsZS5rZXldO1xuICAgICAgICByZXMuX3dlaWdodCA9IEFueU9iamVjdC5hc3NpZ24oe30sIHJlcy5fd2VpZ2h0KTtcbiAgICAgICAgcmVzLl93ZWlnaHRbb1J1bGUua2V5XSA9IGM7XG4gICAgICAgIE9iamVjdC5mcmVlemUocmVzKTtcbiAgICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgICAgIGRlYnVnbG9nKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xufVxuZXhwb3J0cy5tYXRjaFdvcmQgPSBtYXRjaFdvcmQ7XG5mdW5jdGlvbiBleHRyYWN0QXJnc01hcChtYXRjaCwgYXJnc01hcCkge1xuICAgIHZhciByZXMgPSB7fTtcbiAgICBpZiAoIWFyZ3NNYXApIHtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG4gICAgT2JqZWN0LmtleXMoYXJnc01hcCkuZm9yRWFjaChmdW5jdGlvbiAoaUtleSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBtYXRjaFtpS2V5XTtcbiAgICAgICAgdmFyIGtleSA9IGFyZ3NNYXBbaUtleV07XG4gICAgICAgIGlmICgodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKSAmJiB2YWx1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXNba2V5XSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZXh0cmFjdEFyZ3NNYXAgPSBleHRyYWN0QXJnc01hcDtcbmV4cG9ydHMuUmFua1dvcmQgPSB7XG4gICAgaGFzQWJvdmU6IGZ1bmN0aW9uIChsc3QsIGJvcmRlcikge1xuICAgICAgICByZXR1cm4gIWxzdC5ldmVyeShmdW5jdGlvbiAob01lbWJlcikge1xuICAgICAgICAgICAgcmV0dXJuIChvTWVtYmVyLl9yYW5raW5nIDwgYm9yZGVyKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICB0YWtlRmlyc3ROOiBmdW5jdGlvbiAobHN0LCBuKSB7XG4gICAgICAgIHJldHVybiBsc3QuZmlsdGVyKGZ1bmN0aW9uIChvTWVtYmVyLCBpSW5kZXgpIHtcbiAgICAgICAgICAgIHZhciBsYXN0UmFua2luZyA9IDEuMDtcbiAgICAgICAgICAgIGlmICgoaUluZGV4IDwgbikgfHwgb01lbWJlci5fcmFua2luZyA9PT0gbGFzdFJhbmtpbmcpIHtcbiAgICAgICAgICAgICAgICBsYXN0UmFua2luZyA9IG9NZW1iZXIuX3Jhbmtpbmc7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgdGFrZUFib3ZlOiBmdW5jdGlvbiAobHN0LCBib3JkZXIpIHtcbiAgICAgICAgcmV0dXJuIGxzdC5maWx0ZXIoZnVuY3Rpb24gKG9NZW1iZXIpIHtcbiAgICAgICAgICAgIHJldHVybiAob01lbWJlci5fcmFua2luZyA+PSBib3JkZXIpO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuLypcbnZhciBleGFjdExlbiA9IDA7XG52YXIgZnV6enlMZW4gPSAwO1xudmFyIGZ1enp5Q250ID0gMDtcbnZhciBleGFjdENudCA9IDA7XG52YXIgdG90YWxDbnQgPSAwO1xudmFyIHRvdGFsTGVuID0gMDtcbnZhciByZXRhaW5lZENudCA9IDA7XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNldENudCgpIHtcbiAgZXhhY3RMZW4gPSAwO1xuICBmdXp6eUxlbiA9IDA7XG4gIGZ1enp5Q250ID0gMDtcbiAgZXhhY3RDbnQgPSAwO1xuICB0b3RhbENudCA9IDA7XG4gIHRvdGFsTGVuID0gMDtcbiAgcmV0YWluZWRDbnQgPSAwO1xufVxuKi9cbmZ1bmN0aW9uIGNhdGVnb3JpemVXb3JkV2l0aFJhbmtDdXRvZmYoc1dvcmRHcm91cCwgc3BsaXRSdWxlcywgY250UmVjKSB7XG4gICAgdmFyIHNlZW5JdCA9IGNhdGVnb3JpemVTdHJpbmcyKHNXb3JkR3JvdXAsIHRydWUsIHNwbGl0UnVsZXMsIGNudFJlYyk7XG4gICAgLy90b3RhbENudCArPSAxO1xuICAgIC8vIGV4YWN0TGVuICs9IHNlZW5JdC5sZW5ndGg7XG4gICAgYWRkQ250UmVjKGNudFJlYywgJ2NudENhdEV4YWN0JywgMSk7XG4gICAgYWRkQ250UmVjKGNudFJlYywgJ2NudENhdEV4YWN0UmVzJywgc2Vlbkl0Lmxlbmd0aCk7XG4gICAgaWYgKGV4cG9ydHMuUmFua1dvcmQuaGFzQWJvdmUoc2Vlbkl0LCAwLjgpKSB7XG4gICAgICAgIGlmIChjbnRSZWMpIHtcbiAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsICdleGFjdFByaW9yVGFrZScsIHNlZW5JdC5sZW5ndGgpO1xuICAgICAgICB9XG4gICAgICAgIHNlZW5JdCA9IGV4cG9ydHMuUmFua1dvcmQudGFrZUFib3ZlKHNlZW5JdCwgMC44KTtcbiAgICAgICAgaWYgKGNudFJlYykge1xuICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYywgJ2V4YWN0QWZ0ZXJUYWtlJywgc2Vlbkl0Lmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHNlZW5JdCA9IGNhdGVnb3JpemVTdHJpbmcyKHNXb3JkR3JvdXAsIGZhbHNlLCBzcGxpdFJ1bGVzLCBjbnRSZWMpO1xuICAgICAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Tm9uRXhhY3QnLCAxKTtcbiAgICAgICAgYWRkQ250UmVjKGNudFJlYywgJ2NudE5vbkV4YWN0UmVzJywgc2Vlbkl0Lmxlbmd0aCk7XG4gICAgfVxuICAgIC8vIHRvdGFsTGVuICs9IHNlZW5JdC5sZW5ndGg7XG4gICAgc2Vlbkl0ID0gZXhwb3J0cy5SYW5rV29yZC50YWtlRmlyc3ROKHNlZW5JdCwgQWxnb2wuVG9wX05fV29yZENhdGVnb3JpemF0aW9ucyk7XG4gICAgLy8gcmV0YWluZWRDbnQgKz0gc2Vlbkl0Lmxlbmd0aDtcbiAgICByZXR1cm4gc2Vlbkl0O1xufVxuZXhwb3J0cy5jYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmID0gY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZjtcbi8qXG5leHBvcnQgZnVuY3Rpb24gZHVtcENudCgpIHtcbiAgY29uc29sZS5sb2coYFxuZXhhY3RMZW4gPSAke2V4YWN0TGVufTtcbmV4YWN0Q250ID0gJHtleGFjdENudH07XG5mdXp6eUxlbiA9ICR7ZnV6enlMZW59O1xuZnV6enlDbnQgPSAke2Z1enp5Q250fTtcbnRvdGFsQ250ID0gJHt0b3RhbENudH07XG50b3RhbExlbiA9ICR7dG90YWxMZW59O1xucmV0YWluZWRMZW4gPSAke3JldGFpbmVkQ250fTtcbiAgYCk7XG59XG4qL1xuZnVuY3Rpb24gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkU2VudGVuY2Uob1NlbnRlbmNlKSB7XG4gICAgcmV0dXJuIG9TZW50ZW5jZS5ldmVyeShmdW5jdGlvbiAob1dvcmRHcm91cCkge1xuICAgICAgICByZXR1cm4gKG9Xb3JkR3JvdXAubGVuZ3RoID4gMCk7XG4gICAgfSk7XG59XG5leHBvcnRzLmZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZFNlbnRlbmNlID0gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkU2VudGVuY2U7XG5mdW5jdGlvbiBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWQoYXJyKSB7XG4gICAgcmV0dXJuIGFyci5maWx0ZXIoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICByZXR1cm4gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkU2VudGVuY2Uob1NlbnRlbmNlKTtcbiAgICB9KTtcbn1cbmV4cG9ydHMuZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkID0gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkO1xuZnVuY3Rpb24gY2F0ZWdvcml6ZUFXb3JkKHNXb3JkR3JvdXAsIHJ1bGVzLCBzZW50ZW5jZSwgd29yZHMsIGNudFJlYykge1xuICAgIHZhciBzZWVuSXQgPSB3b3Jkc1tzV29yZEdyb3VwXTtcbiAgICBpZiAoc2Vlbkl0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgc2Vlbkl0ID0gY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZihzV29yZEdyb3VwLCBydWxlcywgY250UmVjKTtcbiAgICAgICAgdXRpbHMuZGVlcEZyZWV6ZShzZWVuSXQpO1xuICAgICAgICB3b3Jkc1tzV29yZEdyb3VwXSA9IHNlZW5JdDtcbiAgICB9XG4gICAgaWYgKCFzZWVuSXQgfHwgc2Vlbkl0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBsb2dnZXIoXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBcXFwiXCIgKyBzV29yZEdyb3VwICsgXCJcXFwiIGluIHNlbnRlbmNlIFxcXCJcIlxuICAgICAgICAgICAgKyBzZW50ZW5jZSArIFwiXFxcIlwiKTtcbiAgICAgICAgaWYgKHNXb3JkR3JvdXAuaW5kZXhPZihcIiBcIikgPD0gMCkge1xuICAgICAgICAgICAgZGVidWdsb2coXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBwcmltaXRpdmUgKCEpXCIgKyBzV29yZEdyb3VwKTtcbiAgICAgICAgfVxuICAgICAgICBkZWJ1Z2xvZyhcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIFwiICsgc1dvcmRHcm91cCk7XG4gICAgICAgIGlmICghc2Vlbkl0KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RpbmcgZW10cHkgbGlzdCwgbm90IHVuZGVmaW5lZCBmb3IgXFxcIlwiICsgc1dvcmRHcm91cCArIFwiXFxcIlwiKTtcbiAgICAgICAgfVxuICAgICAgICB3b3Jkc1tzV29yZEdyb3VwXSA9IFtdO1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHJldHVybiB1dGlscy5jbG9uZURlZXAoc2Vlbkl0KTtcbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZUFXb3JkID0gY2F0ZWdvcml6ZUFXb3JkO1xuLyoqXG4gKiBHaXZlbiBhICBzdHJpbmcsIGJyZWFrIGl0IGRvd24gaW50byBjb21wb25lbnRzLFxuICogW1snQScsICdCJ10sIFsnQSBCJ11dXG4gKlxuICogdGhlbiBjYXRlZ29yaXplV29yZHNcbiAqIHJldHVybmluZ1xuICpcbiAqIFsgW1sgeyBjYXRlZ29yeTogJ3N5c3RlbUlkJywgd29yZCA6ICdBJ30sXG4gKiAgICAgIHsgY2F0ZWdvcnk6ICdvdGhlcnRoaW5nJywgd29yZCA6ICdBJ31cbiAqICAgIF0sXG4gKiAgICAvLyByZXN1bHQgb2YgQlxuICogICAgWyB7IGNhdGVnb3J5OiAnc3lzdGVtSWQnLCB3b3JkIDogJ0InfSxcbiAqICAgICAgeyBjYXRlZ29yeTogJ290aGVydGhpbmcnLCB3b3JkIDogJ0EnfVxuICogICAgICB7IGNhdGVnb3J5OiAnYW5vdGhlcnRyeXAnLCB3b3JkIDogJ0InfVxuICogICAgXVxuICogICBdLFxuICogXV1dXG4gKlxuICpcbiAqXG4gKi9cbmZ1bmN0aW9uIGFuYWx5emVTdHJpbmcoc1N0cmluZywgcnVsZXMsIHdvcmRzKSB7XG4gICAgdmFyIGNudCA9IDA7XG4gICAgdmFyIGZhYyA9IDE7XG4gICAgdmFyIHUgPSBicmVha2Rvd24uYnJlYWtkb3duU3RyaW5nKHNTdHJpbmcsIEFsZ29sLk1heFNwYWNlc1BlckNvbWJpbmVkV29yZCk7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCJoZXJlIGJyZWFrZG93blwiICsgSlNPTi5zdHJpbmdpZnkodSkpO1xuICAgIH1cbiAgICAvL2NvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHUpKTtcbiAgICB3b3JkcyA9IHdvcmRzIHx8IHt9O1xuICAgIGRlYnVncGVyZigndGhpcyBtYW55IGtub3duIHdvcmRzOiAnICsgT2JqZWN0LmtleXMod29yZHMpLmxlbmd0aCk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIHZhciBjbnRSZWMgPSB7fTtcbiAgICB1LmZvckVhY2goZnVuY3Rpb24gKGFCcmVha0Rvd25TZW50ZW5jZSkge1xuICAgICAgICB2YXIgY2F0ZWdvcml6ZWRTZW50ZW5jZSA9IFtdO1xuICAgICAgICB2YXIgaXNWYWxpZCA9IGFCcmVha0Rvd25TZW50ZW5jZS5ldmVyeShmdW5jdGlvbiAoc1dvcmRHcm91cCwgaW5kZXgpIHtcbiAgICAgICAgICAgIHZhciBzZWVuSXQgPSBjYXRlZ29yaXplQVdvcmQoc1dvcmRHcm91cCwgcnVsZXMsIHNTdHJpbmcsIHdvcmRzLCBjbnRSZWMpO1xuICAgICAgICAgICAgaWYgKHNlZW5JdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRlZ29yaXplZFNlbnRlbmNlW2luZGV4XSA9IHNlZW5JdDtcbiAgICAgICAgICAgIGNudCA9IGNudCArIHNlZW5JdC5sZW5ndGg7XG4gICAgICAgICAgICBmYWMgPSBmYWMgKiBzZWVuSXQubGVuZ3RoO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoaXNWYWxpZCkge1xuICAgICAgICAgICAgcmVzLnB1c2goY2F0ZWdvcml6ZWRTZW50ZW5jZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBkZWJ1Z2xvZyhcIiBzZW50ZW5jZXMgXCIgKyB1Lmxlbmd0aCArIFwiIG1hdGNoZXMgXCIgKyBjbnQgKyBcIiBmYWM6IFwiICsgZmFjKTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCAmJiB1Lmxlbmd0aCkge1xuICAgICAgICBkZWJ1Z2xvZyhcImZpcnN0IG1hdGNoIFwiICsgSlNPTi5zdHJpbmdpZnkodSwgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIGRlYnVncGVyZihcIiBzZW50ZW5jZXMgXCIgKyB1Lmxlbmd0aCArIFwiIC8gXCIgKyByZXMubGVuZ3RoICsgXCIgbWF0Y2hlcyBcIiArIGNudCArIFwiIGZhYzogXCIgKyBmYWMgKyBcIiByZWMgOiBcIiArIEpTT04uc3RyaW5naWZ5KGNudFJlYywgdW5kZWZpbmVkLCAyKSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuYW5hbHl6ZVN0cmluZyA9IGFuYWx5emVTdHJpbmc7XG4vKlxuWyBbYSxiXSwgW2MsZF1dXG5cbjAwIGFcbjAxIGJcbjEwIGNcbjExIGRcbjEyIGNcbiovXG52YXIgY2xvbmUgPSB1dGlscy5jbG9uZURlZXA7XG5mdW5jdGlvbiBjb3B5VmVjTWVtYmVycyh1KSB7XG4gICAgdmFyIGkgPSAwO1xuICAgIGZvciAoaSA9IDA7IGkgPCB1Lmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHVbaV0gPSBjbG9uZSh1W2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIHU7XG59XG4vLyB3ZSBjYW4gcmVwbGljYXRlIHRoZSB0YWlsIG9yIHRoZSBoZWFkLFxuLy8gd2UgcmVwbGljYXRlIHRoZSB0YWlsIGFzIGl0IGlzIHNtYWxsZXIuXG4vLyBbYSxiLGMgXVxuZnVuY3Rpb24gZXhwYW5kTWF0Y2hBcnIoZGVlcCkge1xuICAgIHZhciBhID0gW107XG4gICAgdmFyIGxpbmUgPSBbXTtcbiAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gSlNPTi5zdHJpbmdpZnkoZGVlcCkgOiAnLScpO1xuICAgIGRlZXAuZm9yRWFjaChmdW5jdGlvbiAodUJyZWFrRG93bkxpbmUsIGlJbmRleCkge1xuICAgICAgICBsaW5lW2lJbmRleF0gPSBbXTtcbiAgICAgICAgdUJyZWFrRG93bkxpbmUuZm9yRWFjaChmdW5jdGlvbiAoYVdvcmRHcm91cCwgd2dJbmRleCkge1xuICAgICAgICAgICAgbGluZVtpSW5kZXhdW3dnSW5kZXhdID0gW107XG4gICAgICAgICAgICBhV29yZEdyb3VwLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkVmFyaWFudCwgaVdWSW5kZXgpIHtcbiAgICAgICAgICAgICAgICBsaW5lW2lJbmRleF1bd2dJbmRleF1baVdWSW5kZXhdID0gb1dvcmRWYXJpYW50O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGxpbmUpKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgdmFyIG52ZWNzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciB2ZWNzID0gW1tdXTtcbiAgICAgICAgdmFyIG52ZWNzID0gW107XG4gICAgICAgIHZhciBydmVjID0gW107XG4gICAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgbGluZVtpXS5sZW5ndGg7ICsraykge1xuICAgICAgICAgICAgLy92ZWNzIGlzIHRoZSB2ZWN0b3Igb2YgYWxsIHNvIGZhciBzZWVuIHZhcmlhbnRzIHVwIHRvIGsgd2dzLlxuICAgICAgICAgICAgdmFyIG5leHRCYXNlID0gW107XG4gICAgICAgICAgICBmb3IgKHZhciBsID0gMDsgbCA8IGxpbmVbaV1ba10ubGVuZ3RoOyArK2wpIHtcbiAgICAgICAgICAgICAgICAvL2RlYnVnbG9nKFwidmVjcyBub3dcIiArIEpTT04uc3RyaW5naWZ5KHZlY3MpKTtcbiAgICAgICAgICAgICAgICBudmVjcyA9IFtdOyAvL3ZlY3Muc2xpY2UoKTsgLy8gY29weSB0aGUgdmVjW2ldIGJhc2UgdmVjdG9yO1xuICAgICAgICAgICAgICAgIC8vZGVidWdsb2coXCJ2ZWNzIGNvcGllZCBub3dcIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgdSA9IDA7IHUgPCB2ZWNzLmxlbmd0aDsgKyt1KSB7XG4gICAgICAgICAgICAgICAgICAgIG52ZWNzW3VdID0gdmVjc1t1XS5zbGljZSgpOyAvL1xuICAgICAgICAgICAgICAgICAgICBudmVjc1t1XSA9IGNvcHlWZWNNZW1iZXJzKG52ZWNzW3VdKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gZGVidWdsb2coXCJjb3BpZWQgdmVjc1tcIisgdStcIl1cIiArIEpTT04uc3RyaW5naWZ5KHZlY3NbdV0pKTtcbiAgICAgICAgICAgICAgICAgICAgbnZlY3NbdV0ucHVzaChjbG9uZShsaW5lW2ldW2tdW2xdKSk7IC8vIHB1c2ggdGhlIGx0aCB2YXJpYW50XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vICAgZGVidWdsb2coXCIgYXQgICAgIFwiICsgayArIFwiOlwiICsgbCArIFwiIG5leHRiYXNlID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcbiAgICAgICAgICAgICAgICAvLyAgIGRlYnVnbG9nKFwiIGFwcGVuZCBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiBudmVjcyAgICA+XCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpXG4gICAgICAgICAgICAgICAgbmV4dEJhc2UgPSBuZXh0QmFzZS5jb25jYXQobnZlY3MpO1xuICAgICAgICAgICAgfSAvL2NvbnN0cnVcbiAgICAgICAgICAgIC8vICBkZWJ1Z2xvZyhcIm5vdyBhdCBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpXG4gICAgICAgICAgICB2ZWNzID0gbmV4dEJhc2U7XG4gICAgICAgIH1cbiAgICAgICAgZGVidWdsb2dWKGRlYnVnbG9nVi5lbmFibGVkID8gKFwiQVBQRU5ESU5HIFRPIFJFU1wiICsgaSArIFwiOlwiICsgbCArIFwiID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSkgOiAnLScpO1xuICAgICAgICByZXMgPSByZXMuY29uY2F0KHZlY3MpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5leHBhbmRNYXRjaEFyciA9IGV4cGFuZE1hdGNoQXJyO1xuLyoqXG4gKiBDYWxjdWxhdGUgYSB3ZWlnaHQgZmFjdG9yIGZvciBhIGdpdmVuIGRpc3RhbmNlIGFuZFxuICogY2F0ZWdvcnlcbiAqIEBwYXJhbSB7aW50ZWdlcn0gZGlzdCBkaXN0YW5jZSBpbiB3b3Jkc1xuICogQHBhcmFtIHtzdHJpbmd9IGNhdGVnb3J5IGNhdGVnb3J5IHRvIHVzZVxuICogQHJldHVybnMge251bWJlcn0gYSBkaXN0YW5jZSBmYWN0b3IgPj0gMVxuICogIDEuMCBmb3Igbm8gZWZmZWN0XG4gKi9cbmZ1bmN0aW9uIHJlaW5mb3JjZURpc3RXZWlnaHQoZGlzdCwgY2F0ZWdvcnkpIHtcbiAgICB2YXIgYWJzID0gTWF0aC5hYnMoZGlzdCk7XG4gICAgcmV0dXJuIDEuMCArIChBbGdvbC5hUmVpbmZvcmNlRGlzdFdlaWdodFthYnNdIHx8IDApO1xufVxuZXhwb3J0cy5yZWluZm9yY2VEaXN0V2VpZ2h0ID0gcmVpbmZvcmNlRGlzdFdlaWdodDtcbi8qKlxuICogR2l2ZW4gYSBzZW50ZW5jZSwgZXh0YWN0IGNhdGVnb3JpZXNcbiAqL1xuZnVuY3Rpb24gZXh0cmFjdENhdGVnb3J5TWFwKG9TZW50ZW5jZSkge1xuICAgIHZhciByZXMgPSB7fTtcbiAgICBkZWJ1Z2xvZygnZXh0cmFjdENhdGVnb3J5TWFwICcgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpKTtcbiAgICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGlJbmRleCkge1xuICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IElGTWF0Y2guQ0FUX0NBVEVHT1JZKSB7XG4gICAgICAgICAgICByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10gfHwgW107XG4gICAgICAgICAgICByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10ucHVzaCh7IHBvczogaUluZGV4IH0pO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgdXRpbHMuZGVlcEZyZWV6ZShyZXMpO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmV4dHJhY3RDYXRlZ29yeU1hcCA9IGV4dHJhY3RDYXRlZ29yeU1hcDtcbmZ1bmN0aW9uIHJlaW5Gb3JjZVNlbnRlbmNlKG9TZW50ZW5jZSkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciBvQ2F0ZWdvcnlNYXAgPSBleHRyYWN0Q2F0ZWdvcnlNYXAob1NlbnRlbmNlKTtcbiAgICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGlJbmRleCkge1xuICAgICAgICB2YXIgbSA9IG9DYXRlZ29yeU1hcFtvV29yZC5jYXRlZ29yeV0gfHwgW107XG4gICAgICAgIG0uZm9yRWFjaChmdW5jdGlvbiAob1Bvc2l0aW9uKSB7XG4gICAgICAgICAgICBcInVzZSBzdHJpY3RcIjtcbiAgICAgICAgICAgIG9Xb3JkLnJlaW5mb3JjZSA9IG9Xb3JkLnJlaW5mb3JjZSB8fCAxO1xuICAgICAgICAgICAgdmFyIGJvb3N0ID0gcmVpbmZvcmNlRGlzdFdlaWdodChpSW5kZXggLSBvUG9zaXRpb24ucG9zLCBvV29yZC5jYXRlZ29yeSk7XG4gICAgICAgICAgICBvV29yZC5yZWluZm9yY2UgKj0gYm9vc3Q7XG4gICAgICAgICAgICBvV29yZC5fcmFua2luZyAqPSBib29zdDtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpSW5kZXgpIHtcbiAgICAgICAgaWYgKGlJbmRleCA+IDApIHtcbiAgICAgICAgICAgIGlmIChvU2VudGVuY2VbaUluZGV4IC0gMV0uY2F0ZWdvcnkgPT09IFwibWV0YVwiICYmIChvV29yZC5jYXRlZ29yeSA9PT0gb1NlbnRlbmNlW2lJbmRleCAtIDFdLm1hdGNoZWRTdHJpbmcpKSB7XG4gICAgICAgICAgICAgICAgb1dvcmQucmVpbmZvcmNlID0gb1dvcmQucmVpbmZvcmNlIHx8IDE7XG4gICAgICAgICAgICAgICAgdmFyIGJvb3N0ID0gcmVpbmZvcmNlRGlzdFdlaWdodCgxLCBvV29yZC5jYXRlZ29yeSk7XG4gICAgICAgICAgICAgICAgb1dvcmQucmVpbmZvcmNlICo9IGJvb3N0O1xuICAgICAgICAgICAgICAgIG9Xb3JkLl9yYW5raW5nICo9IGJvb3N0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG9TZW50ZW5jZTtcbn1cbmV4cG9ydHMucmVpbkZvcmNlU2VudGVuY2UgPSByZWluRm9yY2VTZW50ZW5jZTtcbnZhciBTZW50ZW5jZSA9IHJlcXVpcmUoJy4vc2VudGVuY2UnKTtcbmZ1bmN0aW9uIHJlaW5Gb3JjZShhQ2F0ZWdvcml6ZWRBcnJheSkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIGFDYXRlZ29yaXplZEFycmF5LmZvckVhY2goZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICByZWluRm9yY2VTZW50ZW5jZShvU2VudGVuY2UpO1xuICAgIH0pO1xuICAgIGFDYXRlZ29yaXplZEFycmF5LnNvcnQoU2VudGVuY2UuY21wUmFua2luZ1Byb2R1Y3QpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiYWZ0ZXIgcmVpbmZvcmNlXCIgKyBhQ2F0ZWdvcml6ZWRBcnJheS5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICAgIH1cbiAgICByZXR1cm4gYUNhdGVnb3JpemVkQXJyYXk7XG59XG5leHBvcnRzLnJlaW5Gb3JjZSA9IHJlaW5Gb3JjZTtcbi8vLyBiZWxvdyBtYXkgbm8gbG9uZ2VyIGJlIHVzZWRcbmZ1bmN0aW9uIG1hdGNoUmVnRXhwKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBzS2V5ID0gb1J1bGUua2V5O1xuICAgIHZhciBzMSA9IGNvbnRleHRbb1J1bGUua2V5XS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciByZWcgPSBvUnVsZS5yZWdleHA7XG4gICAgdmFyIG0gPSByZWcuZXhlYyhzMSk7XG4gICAgaWYgKGRlYnVnbG9nVi5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nVihcImFwcGx5aW5nIHJlZ2V4cDogXCIgKyBzMSArIFwiIFwiICsgSlNPTi5zdHJpbmdpZnkobSkpO1xuICAgIH1cbiAgICBpZiAoIW0pIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCwgb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KTtcbiAgICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2dWKEpTT04uc3RyaW5naWZ5KGRlbHRhKSk7XG4gICAgICAgIGRlYnVnbG9nVihKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgb0V4dHJhY3RlZENvbnRleHQgPSBleHRyYWN0QXJnc01hcChtLCBvUnVsZS5hcmdzTWFwKTtcbiAgICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2dWKFwiZXh0cmFjdGVkIGFyZ3MgXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZS5hcmdzTWFwKSk7XG4gICAgICAgIGRlYnVnbG9nVihcIm1hdGNoIFwiICsgSlNPTi5zdHJpbmdpZnkobSkpO1xuICAgICAgICBkZWJ1Z2xvZ1YoXCJleHRyYWN0ZWQgYXJncyBcIiArIEpTT04uc3RyaW5naWZ5KG9FeHRyYWN0ZWRDb250ZXh0KSk7XG4gICAgfVxuICAgIHZhciByZXMgPSBBbnlPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKTtcbiAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpO1xuICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcbiAgICBpZiAob0V4dHJhY3RlZENvbnRleHRbc0tleV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXNbc0tleV0gPSBvRXh0cmFjdGVkQ29udGV4dFtzS2V5XTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMub3ZlcnJpZGUpIHtcbiAgICAgICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xuICAgICAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpO1xuICAgIH1cbiAgICBPYmplY3QuZnJlZXplKHJlcyk7XG4gICAgZGVidWdsb2coJ0ZvdW5kIG9uZScgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLm1hdGNoUmVnRXhwID0gbWF0Y2hSZWdFeHA7XG5mdW5jdGlvbiBzb3J0QnlXZWlnaHQoc0tleSwgb0NvbnRleHRBLCBvQ29udGV4dEIpIHtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZ1YoJ3NvcnRpbmc6ICcgKyBzS2V5ICsgJ2ludm9rZWQgd2l0aFxcbiAxOicgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEEsIHVuZGVmaW5lZCwgMikgK1xuICAgICAgICAgICAgXCIgdnMgXFxuIDI6XCIgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEIsIHVuZGVmaW5lZCwgMikpO1xuICAgIH1cbiAgICB2YXIgcmFua2luZ0EgPSBwYXJzZUZsb2F0KG9Db250ZXh0QVtcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcbiAgICB2YXIgcmFua2luZ0IgPSBwYXJzZUZsb2F0KG9Db250ZXh0QltcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcbiAgICBpZiAocmFua2luZ0EgIT09IHJhbmtpbmdCKSB7XG4gICAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZyhcIiByYW5raW4gZGVsdGFcIiArIDEwMCAqIChyYW5raW5nQiAtIHJhbmtpbmdBKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIDEwMCAqIChyYW5raW5nQiAtIHJhbmtpbmdBKTtcbiAgICB9XG4gICAgdmFyIHdlaWdodEEgPSBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QVtcIl93ZWlnaHRcIl1bc0tleV0gfHwgMDtcbiAgICB2YXIgd2VpZ2h0QiA9IG9Db250ZXh0QltcIl93ZWlnaHRcIl0gJiYgb0NvbnRleHRCW1wiX3dlaWdodFwiXVtzS2V5XSB8fCAwO1xuICAgIHJldHVybiArKHdlaWdodEEgLSB3ZWlnaHRCKTtcbn1cbmV4cG9ydHMuc29ydEJ5V2VpZ2h0ID0gc29ydEJ5V2VpZ2h0O1xuLy8gV29yZCwgU3lub255bSwgUmVnZXhwIC8gRXh0cmFjdGlvblJ1bGVcbmZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBvUnVsZXMsIG9wdGlvbnMpIHtcbiAgICB2YXIgc0tleSA9IG9SdWxlc1swXS5rZXk7XG4gICAgLy8gY2hlY2sgdGhhdCBydWxlXG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgLy8gY2hlY2sgY29uc2lzdGVuY3lcbiAgICAgICAgb1J1bGVzLmV2ZXJ5KGZ1bmN0aW9uIChpUnVsZSkge1xuICAgICAgICAgICAgaWYgKGlSdWxlLmtleSAhPT0gc0tleSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkluaG9tb2dlbm91cyBrZXlzIGluIHJ1bGVzLCBleHBlY3RlZCBcIiArIHNLZXkgKyBcIiB3YXMgXCIgKyBKU09OLnN0cmluZ2lmeShpUnVsZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBsb29rIGZvciBydWxlcyB3aGljaCBtYXRjaFxuICAgIHZhciByZXMgPSBvUnVsZXMubWFwKGZ1bmN0aW9uIChvUnVsZSkge1xuICAgICAgICAvLyBpcyB0aGlzIHJ1bGUgYXBwbGljYWJsZVxuICAgICAgICBzd2l0Y2ggKG9SdWxlLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgMCAvKiBXT1JEICovOlxuICAgICAgICAgICAgICAgIHJldHVybiBtYXRjaFdvcmQob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgY2FzZSAxIC8qIFJFR0VYUCAqLzpcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2hSZWdFeHAob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSkuZmlsdGVyKGZ1bmN0aW9uIChvcmVzKSB7XG4gICAgICAgIHJldHVybiAhIW9yZXM7XG4gICAgfSkuc29ydChzb3J0QnlXZWlnaHQuYmluZCh0aGlzLCBzS2V5KSk7XG4gICAgcmV0dXJuIHJlcztcbiAgICAvLyBPYmplY3Qua2V5cygpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAvLyB9KTtcbn1cbmV4cG9ydHMuYXVnbWVudENvbnRleHQxID0gYXVnbWVudENvbnRleHQxO1xuZnVuY3Rpb24gYXVnbWVudENvbnRleHQoY29udGV4dCwgYVJ1bGVzKSB7XG4gICAgdmFyIG9wdGlvbnMxID0ge1xuICAgICAgICBtYXRjaG90aGVyczogdHJ1ZSxcbiAgICAgICAgb3ZlcnJpZGU6IGZhbHNlXG4gICAgfTtcbiAgICB2YXIgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMxKTtcbiAgICBpZiAoYVJlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdmFyIG9wdGlvbnMyID0ge1xuICAgICAgICAgICAgbWF0Y2hvdGhlcnM6IGZhbHNlLFxuICAgICAgICAgICAgb3ZlcnJpZGU6IHRydWVcbiAgICAgICAgfTtcbiAgICAgICAgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMyKTtcbiAgICB9XG4gICAgcmV0dXJuIGFSZXM7XG59XG5leHBvcnRzLmF1Z21lbnRDb250ZXh0ID0gYXVnbWVudENvbnRleHQ7XG5mdW5jdGlvbiBpbnNlcnRPcmRlcmVkKHJlc3VsdCwgaUluc2VydGVkTWVtYmVyLCBsaW1pdCkge1xuICAgIC8vIFRPRE86IHVzZSBzb21lIHdlaWdodFxuICAgIGlmIChyZXN1bHQubGVuZ3RoIDwgbGltaXQpIHtcbiAgICAgICAgcmVzdWx0LnB1c2goaUluc2VydGVkTWVtYmVyKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cbmV4cG9ydHMuaW5zZXJ0T3JkZXJlZCA9IGluc2VydE9yZGVyZWQ7XG5mdW5jdGlvbiB0YWtlVG9wTihhcnIpIHtcbiAgICB2YXIgdSA9IGFyci5maWx0ZXIoZnVuY3Rpb24gKGlubmVyQXJyKSB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwOyB9KTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgLy8gc2hpZnQgb3V0IHRoZSB0b3Agb25lc1xuICAgIHUgPSB1Lm1hcChmdW5jdGlvbiAoaUFycikge1xuICAgICAgICB2YXIgdG9wID0gaUFyci5zaGlmdCgpO1xuICAgICAgICByZXMgPSBpbnNlcnRPcmRlcmVkKHJlcywgdG9wLCA1KTtcbiAgICAgICAgcmV0dXJuIGlBcnI7XG4gICAgfSkuZmlsdGVyKGZ1bmN0aW9uIChpbm5lckFycikgeyByZXR1cm4gaW5uZXJBcnIubGVuZ3RoID4gMDsgfSk7XG4gICAgLy8gYXMgQXJyYXk8QXJyYXk8SUZNYXRjaC5jb250ZXh0Pj5cbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy50YWtlVG9wTiA9IHRha2VUb3BOO1xudmFyIGlucHV0RmlsdGVyUnVsZXMgPSByZXF1aXJlKCcuL2lucHV0RmlsdGVyUnVsZXMnKTtcbnZhciBybTtcbmZ1bmN0aW9uIGdldFJNT25jZSgpIHtcbiAgICBpZiAoIXJtKSB7XG4gICAgICAgIHJtID0gaW5wdXRGaWx0ZXJSdWxlcy5nZXRSdWxlTWFwKCk7XG4gICAgfVxuICAgIHJldHVybiBybTtcbn1cbmZ1bmN0aW9uIGFwcGx5UnVsZXMoY29udGV4dCkge1xuICAgIHZhciBiZXN0TiA9IFtjb250ZXh0XTtcbiAgICBpbnB1dEZpbHRlclJ1bGVzLm9LZXlPcmRlci5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgICAgIHZhciBiZXN0TmV4dCA9IFtdO1xuICAgICAgICBiZXN0Ti5mb3JFYWNoKGZ1bmN0aW9uIChvQ29udGV4dCkge1xuICAgICAgICAgICAgaWYgKG9Db250ZXh0W3NLZXldKSB7XG4gICAgICAgICAgICAgICAgZGVidWdsb2coJyoqIGFwcGx5aW5nIHJ1bGVzIGZvciAnICsgc0tleSk7XG4gICAgICAgICAgICAgICAgdmFyIHJlcyA9IGF1Z21lbnRDb250ZXh0KG9Db250ZXh0LCBnZXRSTU9uY2UoKVtzS2V5XSB8fCBbXSk7XG4gICAgICAgICAgICAgICAgZGVidWdsb2coJyoqIHJlc3VsdCBmb3IgJyArIHNLZXkgKyAnID0gJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgICAgICAgICAgYmVzdE5leHQucHVzaChyZXMgfHwgW10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gcnVsZSBub3QgcmVsZXZhbnRcbiAgICAgICAgICAgICAgICBiZXN0TmV4dC5wdXNoKFtvQ29udGV4dF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgYmVzdE4gPSB0YWtlVG9wTihiZXN0TmV4dCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGJlc3ROO1xufVxuZXhwb3J0cy5hcHBseVJ1bGVzID0gYXBwbHlSdWxlcztcbmZ1bmN0aW9uIGFwcGx5UnVsZXNQaWNrRmlyc3QoY29udGV4dCkge1xuICAgIHZhciByID0gYXBwbHlSdWxlcyhjb250ZXh0KTtcbiAgICByZXR1cm4gciAmJiByWzBdO1xufVxuZXhwb3J0cy5hcHBseVJ1bGVzUGlja0ZpcnN0ID0gYXBwbHlSdWxlc1BpY2tGaXJzdDtcbi8qKlxuICogRGVjaWRlIHdoZXRoZXIgdG8gcmVxdWVyeSBmb3IgYSBjb250ZXRcbiAqL1xuZnVuY3Rpb24gZGVjaWRlT25SZVF1ZXJ5KGNvbnRleHQpIHtcbiAgICByZXR1cm4gW107XG59XG5leHBvcnRzLmRlY2lkZU9uUmVRdWVyeSA9IGRlY2lkZU9uUmVRdWVyeTtcbiIsIi8qKlxyXG4gKiB0aGUgaW5wdXQgZmlsdGVyIHN0YWdlIHByZXByb2Nlc3NlcyBhIGN1cnJlbnQgY29udGV4dFxyXG4gKlxyXG4gKiBJdCBhKSBjb21iaW5lcyBtdWx0aS1zZWdtZW50IGFyZ3VtZW50cyBpbnRvIG9uZSBjb250ZXh0IG1lbWJlcnNcclxuICogSXQgYikgYXR0ZW1wdHMgdG8gYXVnbWVudCB0aGUgY29udGV4dCBieSBhZGRpdGlvbmFsIHF1YWxpZmljYXRpb25zXHJcbiAqICAgICAgICAgICAoTWlkIHRlcm0gZ2VuZXJhdGluZyBBbHRlcm5hdGl2ZXMsIGUuZy5cclxuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHVuaXQgdGVzdD9cclxuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHNvdXJjZSA/XHJcbiAqICAgICAgICAgICApXHJcbiAqICBTaW1wbGUgcnVsZXMgbGlrZSAgSW50ZW50XHJcbiAqXHJcbiAqXHJcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmlucHV0RmlsdGVyXHJcbiAqIEBmaWxlIGlucHV0RmlsdGVyLnRzXHJcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cclxuICovXHJcbi8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2xpYi9ub2RlLTQuZC50c1wiIC8+XHJcbmltcG9ydCAqIGFzIGRpc3RhbmNlIGZyb20gJy4uL3V0aWxzL2RhbWVyYXVMZXZlbnNodGVpbic7XHJcblxyXG5pbXBvcnQgKiBhcyBMb2dnZXIgZnJvbSAnLi4vdXRpbHMvbG9nZ2VyJ1xyXG5cclxuY29uc3QgbG9nZ2VyID0gTG9nZ2VyLmxvZ2dlcignaW5wdXRGaWx0ZXInKTtcclxuXHJcbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcclxudmFyIGRlYnVncGVyZiA9IGRlYnVnKCdwZXJmJyk7XHJcblxyXG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuLi91dGlscy91dGlscyc7XHJcblxyXG5cclxuaW1wb3J0ICogYXMgQWxnb2wgZnJvbSAnLi9hbGdvbCc7XHJcblxyXG5pbXBvcnQgKiBhcyBJTWF0Y2ggZnJvbSAnLi9pZm1hdGNoJztcclxuXHJcbmltcG9ydCAqIGFzIGJyZWFrZG93biBmcm9tICcuL2JyZWFrZG93bic7XHJcblxyXG5jb25zdCBBbnlPYmplY3QgPSA8YW55Pk9iamVjdDtcclxuXHJcbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ2lucHV0RmlsdGVyJylcclxuY29uc3QgZGVidWdsb2dWID0gZGVidWcoJ2lucHV0VkZpbHRlcicpXHJcbmNvbnN0IGRlYnVnbG9nTSA9IGRlYnVnKCdpbnB1dE1GaWx0ZXInKVxyXG5cclxuXHJcblxyXG5pbXBvcnQgKiBhcyBtYXRjaGRhdGEgZnJvbSAnLi9tYXRjaGRhdGEnO1xyXG52YXIgb1VuaXRUZXN0cyA9IG1hdGNoZGF0YS5vVW5pdFRlc3RzXHJcblxyXG4vKipcclxuICogQHBhcmFtIHNUZXh0IHtzdHJpbmd9IHRoZSB0ZXh0IHRvIG1hdGNoIHRvIE5hdlRhcmdldFJlc29sdXRpb25cclxuICogQHBhcmFtIHNUZXh0MiB7c3RyaW5nfSB0aGUgcXVlcnkgdGV4dCwgZS5nLiBOYXZUYXJnZXRcclxuICpcclxuICogQHJldHVybiB0aGUgZGlzdGFuY2UsIG5vdGUgdGhhdCBpcyBpcyAqbm90KiBzeW1tZXRyaWMhXHJcbiAqL1xyXG5mdW5jdGlvbiBjYWxjRGlzdGFuY2Uoc1RleHQxOiBzdHJpbmcsIHNUZXh0Mjogc3RyaW5nKTogbnVtYmVyIHtcclxuICAvLyBjb25zb2xlLmxvZyhcImxlbmd0aDJcIiArIHNUZXh0MSArIFwiIC0gXCIgKyBzVGV4dDIpXHJcbiAgIGlmKCgoc1RleHQxLmxlbmd0aCAtIHNUZXh0Mi5sZW5ndGgpID4gQWxnb2wuY2FsY0Rpc3QubGVuZ3RoRGVsdGExKVxyXG4gICAgfHwgKHNUZXh0Mi5sZW5ndGggPiAxLjUgKiBzVGV4dDEubGVuZ3RoIClcclxuICAgIHx8IChzVGV4dDIubGVuZ3RoIDwgKHNUZXh0MS5sZW5ndGgvMikpICkge1xyXG4gICAgcmV0dXJuIDUwMDAwO1xyXG4gIH1cclxuICB2YXIgYTAgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEuc3Vic3RyaW5nKDAsIHNUZXh0Mi5sZW5ndGgpLCBzVGV4dDIpXHJcbiAgaWYoZGVidWdsb2dWLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nVihcImRpc3RhbmNlXCIgKyBhMCArIFwic3RyaXBwZWQ+XCIgKyBzVGV4dDEuc3Vic3RyaW5nKDAsc1RleHQyLmxlbmd0aCkgKyBcIjw+XCIgKyBzVGV4dDIrIFwiPFwiKTtcclxuICB9XHJcbiAgaWYoYTAgKiA1MCA+IDE1ICogc1RleHQyLmxlbmd0aCkge1xyXG4gICAgICByZXR1cm4gNDAwMDA7XHJcbiAgfVxyXG4gIHZhciBhID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLCBzVGV4dDIpXHJcbiAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGFcclxufVxyXG5cclxuaW1wb3J0ICogYXMgSUZNYXRjaCBmcm9tICcuLi9tYXRjaC9pZm1hdGNoJztcclxuXHJcbnR5cGUgSVJ1bGUgPSBJRk1hdGNoLklSdWxlXHJcblxyXG5cclxuaW50ZXJmYWNlIElNYXRjaE9wdGlvbnMge1xyXG4gIG1hdGNob3RoZXJzPzogYm9vbGVhbixcclxuICBhdWdtZW50PzogYm9vbGVhbixcclxuICBvdmVycmlkZT86IGJvb2xlYW5cclxufVxyXG5cclxuaW50ZXJmYWNlIElNYXRjaENvdW50IHtcclxuICBlcXVhbDogbnVtYmVyXHJcbiAgZGlmZmVyZW50OiBudW1iZXJcclxuICBzcHVyaW91c1I6IG51bWJlclxyXG4gIHNwdXJpb3VzTDogbnVtYmVyXHJcbn1cclxuXHJcbnR5cGUgRW51bVJ1bGVUeXBlID0gSUZNYXRjaC5FbnVtUnVsZVR5cGVcclxuXHJcbmNvbnN0IGxldmVuQ3V0b2ZmID0gQWxnb2wuQ3V0b2ZmX0xldmVuU2h0ZWluO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGxldmVuUGVuYWx0eShpOiBudW1iZXIpOiBudW1iZXIge1xyXG4gIC8vIDAtPiAxXHJcbiAgLy8gMSAtPiAwLjFcclxuICAvLyAxNTAgLT4gIDAuOFxyXG4gIGlmIChpID09PSAwKSB7XHJcbiAgICByZXR1cm4gMTtcclxuICB9XHJcbiAgLy8gcmV2ZXJzZSBtYXkgYmUgYmV0dGVyIHRoYW4gbGluZWFyXHJcbiAgcmV0dXJuIDEgKyBpICogKDAuOCAtIDEpIC8gMTUwXHJcbn1cclxuXHJcbmZ1bmN0aW9uIG5vblByaXZhdGVLZXlzKG9BKSB7XHJcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG9BKS5maWx0ZXIoa2V5ID0+IHtcclxuICAgIHJldHVybiBrZXlbMF0gIT09ICdfJztcclxuICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNvdW50QWluQihvQSwgb0IsIGZuQ29tcGFyZSwgYUtleUlnbm9yZT8pOiBudW1iZXIge1xyXG4gIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gYUtleUlnbm9yZSA6XHJcbiAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xyXG4gIGZuQ29tcGFyZSA9IGZuQ29tcGFyZSB8fCBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9XHJcbiAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xyXG4gICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcclxuICB9KS5cclxuICAgIHJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XHJcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIChmbkNvbXBhcmUob0Fba2V5XSwgb0Jba2V5XSwga2V5KSA/IDEgOiAwKVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBwcmV2XHJcbiAgICB9LCAwKVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc3B1cmlvdXNBbm90SW5CKG9BLCBvQiwgYUtleUlnbm9yZT8pIHtcclxuICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxyXG4gICAgdHlwZW9mIGFLZXlJZ25vcmUgPT09IFwic3RyaW5nXCIgPyBbYUtleUlnbm9yZV0gOiBbXTtcclxuICByZXR1cm4gbm9uUHJpdmF0ZUtleXMob0EpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xyXG4gIH0pLlxyXG4gICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIDFcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldlxyXG4gICAgfSwgMClcclxufVxyXG5cclxuZnVuY3Rpb24gbG93ZXJDYXNlKG8pIHtcclxuICBpZiAodHlwZW9mIG8gPT09IFwic3RyaW5nXCIpIHtcclxuICAgIHJldHVybiBvLnRvTG93ZXJDYXNlKClcclxuICB9XHJcbiAgcmV0dXJuIG9cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmVDb250ZXh0KG9BLCBvQiwgYUtleUlnbm9yZT8pIHtcclxuICB2YXIgZXF1YWwgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpID09PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xyXG4gIHZhciBkaWZmZXJlbnQgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpICE9PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xyXG4gIHZhciBzcHVyaW91c0wgPSBzcHVyaW91c0Fub3RJbkIob0EsIG9CLCBhS2V5SWdub3JlKVxyXG4gIHZhciBzcHVyaW91c1IgPSBzcHVyaW91c0Fub3RJbkIob0IsIG9BLCBhS2V5SWdub3JlKVxyXG4gIHJldHVybiB7XHJcbiAgICBlcXVhbDogZXF1YWwsXHJcbiAgICBkaWZmZXJlbnQ6IGRpZmZlcmVudCxcclxuICAgIHNwdXJpb3VzTDogc3B1cmlvdXNMLFxyXG4gICAgc3B1cmlvdXNSOiBzcHVyaW91c1JcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNvcnRCeVJhbmsoYTogSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmcsIGI6IElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nKTogbnVtYmVyIHtcclxuICB2YXIgciA9IC0oKGEuX3JhbmtpbmcgfHwgMS4wKSAtIChiLl9yYW5raW5nIHx8IDEuMCkpO1xyXG4gIGlmIChyKSB7XHJcbiAgICByZXR1cm4gcjtcclxuICB9XHJcbiAgaWYgKGEuY2F0ZWdvcnkgJiYgYi5jYXRlZ29yeSkge1xyXG4gICAgciA9IGEuY2F0ZWdvcnkubG9jYWxlQ29tcGFyZShiLmNhdGVnb3J5KTtcclxuICAgIGlmIChyKSB7XHJcbiAgICAgIHJldHVybiByO1xyXG4gICAgfVxyXG4gIH1cclxuICBpZiAoYS5tYXRjaGVkU3RyaW5nICYmIGIubWF0Y2hlZFN0cmluZykge1xyXG4gICAgciA9IGEubWF0Y2hlZFN0cmluZy5sb2NhbGVDb21wYXJlKGIubWF0Y2hlZFN0cmluZyk7XHJcbiAgICBpZiAocikge1xyXG4gICAgICByZXR1cm4gcjtcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIDA7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tPbmVSdWxlKHN0cmluZzogc3RyaW5nLCBsY1N0cmluZyA6IHN0cmluZywgZXhhY3QgOiBib29sZWFuLFxyXG5yZXMgOiBBcnJheTxJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPixcclxub1J1bGUgOiBJTWF0Y2gubVJ1bGUsIGNudFJlYz8gOiBJQ250UmVjICkge1xyXG4gICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcclxuICAgICAgZGVidWdsb2dWKCdhdHRlbXB0aW5nIHRvIG1hdGNoIHJ1bGUgJyArIEpTT04uc3RyaW5naWZ5KG9SdWxlKSArIFwiIHRvIHN0cmluZyBcXFwiXCIgKyBzdHJpbmcgKyBcIlxcXCJcIik7XHJcbiAgICB9XHJcbiAgICBzd2l0Y2ggKG9SdWxlLnR5cGUpIHtcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5XT1JEOlxyXG4gICAgICAgIGlmKCFvUnVsZS5sb3dlcmNhc2V3b3JkKSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3J1bGUgd2l0aG91dCBhIGxvd2VyY2FzZSB2YXJpYW50JyArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKTtcclxuICAgICAgICAgfTtcclxuICAgICAgICBpZiAoZXhhY3QgJiYgb1J1bGUud29yZCA9PT0gc3RyaW5nIHx8IG9SdWxlLmxvd2VyY2FzZXdvcmQgPT09IGxjU3RyaW5nKSB7XHJcbiAgICAgICAgICByZXMucHVzaCh7XHJcbiAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxyXG4gICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBvUnVsZS5tYXRjaGVkU3RyaW5nLFxyXG4gICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXHJcbiAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghZXhhY3QgJiYgIW9SdWxlLmV4YWN0T25seSkge1xyXG4gICAgICAgICAgdmFyIGxldmVubWF0Y2ggPSBjYWxjRGlzdGFuY2Uob1J1bGUubG93ZXJjYXNld29yZCwgbGNTdHJpbmcpO1xyXG5cclxuICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VcIiwgMSk7XHJcbiAgICAgICAgICBpZihsZXZlbm1hdGNoIDwgNTAwMDApIHtcclxuICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYyxcImNhbGNEaXN0YW5jZUV4cFwiLCAxKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmKGxldmVubWF0Y2ggPCA0MDAwMCkge1xyXG4gICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlQmVsb3c0MGtcIiwgMSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAobGV2ZW5tYXRjaCA8IGxldmVuQ3V0b2ZmKSB7XHJcbiAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VPa1wiLCAxKTtcclxuICAgICAgICAgICAgcmVzLnB1c2goe1xyXG4gICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxyXG4gICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXHJcbiAgICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxyXG4gICAgICAgICAgICAgIF9yYW5raW5nOiAob1J1bGUuX3JhbmtpbmcgfHwgMS4wKSAqIGxldmVuUGVuYWx0eShsZXZlbm1hdGNoKSxcclxuICAgICAgICAgICAgICBsZXZlbm1hdGNoOiBsZXZlbm1hdGNoXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIElGTWF0Y2guRW51bVJ1bGVUeXBlLlJFR0VYUDoge1xyXG4gICAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAgICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShcIiBoZXJlIHJlZ2V4cFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUsIHVuZGVmaW5lZCwgMikpKVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgbSA9IG9SdWxlLnJlZ2V4cC5leGVjKHN0cmluZylcclxuICAgICAgICBpZiAobSkge1xyXG4gICAgICAgICAgcmVzLnB1c2goe1xyXG4gICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogKG9SdWxlLm1hdGNoSW5kZXggIT09IHVuZGVmaW5lZCAmJiBtW29SdWxlLm1hdGNoSW5kZXhdKSB8fCBzdHJpbmcsXHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmtub3duIHR5cGVcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKVxyXG4gICAgfVxyXG59XHJcblxyXG5cclxuaW50ZXJmYWNlIElDbnRSZWMge1xyXG5cclxufTtcclxuXHJcbmZ1bmN0aW9uIGFkZENudFJlYyhjbnRSZWMgOiBJQ250UmVjLCBtZW1iZXIgOiBzdHJpbmcsIG51bWJlciA6IG51bWJlcikge1xyXG4gIGlmKCghY250UmVjKSB8fCAobnVtYmVyID09PSAwKSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICBjbnRSZWNbbWVtYmVyXSA9IChjbnRSZWNbbWVtYmVyXSB8fCAwKSArIG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNhdGVnb3JpemVTdHJpbmcoc3RyaW5nOiBzdHJpbmcsIGV4YWN0OiBib29sZWFuLCBvUnVsZXM6IEFycmF5PElNYXRjaC5tUnVsZT4sXHJcbiBjbnRSZWM/IDogSUNudFJlYyk6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiB7XHJcbiAgLy8gc2ltcGx5IGFwcGx5IGFsbCBydWxlc1xyXG4gIGlmKGRlYnVnbG9nTS5lbmFibGVkICkgIHtcclxuICAgIGRlYnVnbG9nTShcInJ1bGVzIDogXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZXMsIHVuZGVmaW5lZCwgMikpO1xyXG4gIH1cclxuICB2YXIgbGNTdHJpbmcgPSBzdHJpbmcudG9Mb3dlckNhc2UoKTtcclxuICB2YXIgcmVzOiBBcnJheTxJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiA9IFtdXHJcbiAgb1J1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XHJcbiAgICBjaGVja09uZVJ1bGUoc3RyaW5nLGxjU3RyaW5nLGV4YWN0LHJlcyxvUnVsZSxjbnRSZWMpO1xyXG4gIH0pO1xyXG4gIHJlcy5zb3J0KHNvcnRCeVJhbmspO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjYXRlZ29yaXplU3RyaW5nMihzdHJpbmc6IHN0cmluZywgZXhhY3Q6IGJvb2xlYW4sICBydWxlcyA6IElNYXRjaC5TcGxpdFJ1bGVzXHJcbiAgLCBjbnRSZWM/IDpJQ250UmVjKTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IHtcclxuICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXHJcbiAgaWYgKGRlYnVnbG9nTS5lbmFibGVkICkgIHtcclxuICAgIGRlYnVnbG9nTShcInJ1bGVzIDogXCIgKyBKU09OLnN0cmluZ2lmeShydWxlcyx1bmRlZmluZWQsIDIpKTtcclxuICB9XHJcbiAgdmFyIGxjU3RyaW5nID0gc3RyaW5nLnRvTG93ZXJDYXNlKCk7XHJcbiAgdmFyIHJlczogQXJyYXk8SU1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4gPSBbXTtcclxuICBpZiAoZXhhY3QpIHtcclxuICAgIHZhciByID0gcnVsZXMud29yZE1hcFtsY1N0cmluZ107XHJcbiAgICBpZiAocikge1xyXG4gICAgICByLmZvckVhY2goZnVuY3Rpb24ob1J1bGUpIHtcclxuICAgICAgICByZXMucHVzaCh7XHJcbiAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxyXG4gICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBvUnVsZS5tYXRjaGVkU3RyaW5nLFxyXG4gICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXHJcbiAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcclxuICAgICAgICAgIH0pXHJcbiAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBydWxlcy5ub25Xb3JkUnVsZXMuZm9yRWFjaChmdW5jdGlvbiAob1J1bGUpIHtcclxuICAgICAgY2hlY2tPbmVSdWxlKHN0cmluZyxsY1N0cmluZyxleGFjdCxyZXMsb1J1bGUsY250UmVjKTtcclxuICAgIH0pO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBkZWJ1Z2xvZyhcImNhdGVnb3JpemUgbm9uIGV4YWN0XCIgKyBzdHJpbmcgKyBcIiB4eCAgXCIgKyBydWxlcy5hbGxSdWxlcy5sZW5ndGgpO1xyXG4gICAgcmV0dXJuIGNhdGVnb3JpemVTdHJpbmcoc3RyaW5nLCBleGFjdCwgcnVsZXMuYWxsUnVsZXMsIGNudFJlYyk7XHJcbiAgfVxyXG4gIHJlcy5zb3J0KHNvcnRCeVJhbmspO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcblxyXG5cclxuLyoqXHJcbiAqXHJcbiAqIE9wdGlvbnMgbWF5IGJlIHtcclxuICogbWF0Y2hvdGhlcnMgOiB0cnVlLCAgPT4gb25seSBydWxlcyB3aGVyZSBhbGwgb3RoZXJzIG1hdGNoIGFyZSBjb25zaWRlcmVkXHJcbiAqIGF1Z21lbnQgOiB0cnVlLFxyXG4gKiBvdmVycmlkZSA6IHRydWUgfSAgPT5cclxuICpcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFdvcmQob1J1bGU6IElSdWxlLCBjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQsIG9wdGlvbnM/OiBJTWF0Y2hPcHRpb25zKSB7XHJcbiAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKVxyXG4gIHZhciBzMiA9IG9SdWxlLndvcmQudG9Mb3dlckNhc2UoKTtcclxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxyXG4gIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsIG9SdWxlLmZvbGxvd3MsIG9SdWxlLmtleSlcclxuICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xyXG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkob3B0aW9ucykpO1xyXG4gIH1cclxuICBpZiAob3B0aW9ucy5tYXRjaG90aGVycyAmJiAoZGVsdGEuZGlmZmVyZW50ID4gMCkpIHtcclxuICAgIHJldHVybiB1bmRlZmluZWRcclxuICB9XHJcbiAgdmFyIGM6IG51bWJlciA9IGNhbGNEaXN0YW5jZShzMiwgczEpO1xyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nKFwiIHMxIDw+IHMyIFwiICsgczEgKyBcIjw+XCIgKyBzMiArIFwiICA9PjogXCIgKyBjKTtcclxuICB9XHJcbiAgaWYgKGMgPCAxNTApIHtcclxuICAgIHZhciByZXMgPSBBbnlPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKSBhcyBhbnk7XHJcbiAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgY29udGV4dCk7XHJcbiAgICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xyXG4gICAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb1J1bGUuZm9sbG93cyk7XHJcbiAgICB9XHJcbiAgICAvLyBmb3JjZSBrZXkgcHJvcGVydHlcclxuICAgIC8vIGNvbnNvbGUubG9nKCcgb2JqZWN0Y2F0ZWdvcnknLCByZXNbJ3N5c3RlbU9iamVjdENhdGVnb3J5J10pO1xyXG4gICAgcmVzW29SdWxlLmtleV0gPSBvUnVsZS5mb2xsb3dzW29SdWxlLmtleV0gfHwgcmVzW29SdWxlLmtleV07XHJcbiAgICByZXMuX3dlaWdodCA9IEFueU9iamVjdC5hc3NpZ24oe30sIHJlcy5fd2VpZ2h0KTtcclxuICAgIHJlcy5fd2VpZ2h0W29SdWxlLmtleV0gPSBjO1xyXG4gICAgT2JqZWN0LmZyZWV6ZShyZXMpO1xyXG4gICAgaWYgKCBkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAgIGRlYnVnbG9nKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcclxuICAgIH1cclxuICAgIHJldHVybiByZXM7XHJcbiAgfVxyXG4gIHJldHVybiB1bmRlZmluZWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0QXJnc01hcChtYXRjaDogQXJyYXk8c3RyaW5nPiwgYXJnc01hcDogeyBba2V5OiBudW1iZXJdOiBzdHJpbmcgfSk6IElGTWF0Y2guY29udGV4dCB7XHJcbiAgdmFyIHJlcyA9IHt9IGFzIElGTWF0Y2guY29udGV4dDtcclxuICBpZiAoIWFyZ3NNYXApIHtcclxuICAgIHJldHVybiByZXM7XHJcbiAgfVxyXG4gIE9iamVjdC5rZXlzKGFyZ3NNYXApLmZvckVhY2goZnVuY3Rpb24gKGlLZXkpIHtcclxuICAgIHZhciB2YWx1ZSA9IG1hdGNoW2lLZXldXHJcbiAgICB2YXIga2V5ID0gYXJnc01hcFtpS2V5XTtcclxuICAgIGlmICgodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKSAmJiB2YWx1ZS5sZW5ndGggPiAwKSB7XHJcbiAgICAgIHJlc1trZXldID0gdmFsdWVcclxuICAgIH1cclxuICB9XHJcbiAgKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgUmFua1dvcmQgPSB7XHJcbiAgaGFzQWJvdmU6IGZ1bmN0aW9uIChsc3Q6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiwgYm9yZGVyOiBudW1iZXIpOiBib29sZWFuIHtcclxuICAgIHJldHVybiAhbHN0LmV2ZXJ5KGZ1bmN0aW9uIChvTWVtYmVyKSB7XHJcbiAgICAgIHJldHVybiAob01lbWJlci5fcmFua2luZyA8IGJvcmRlcik7XHJcbiAgICB9KTtcclxuICB9LFxyXG5cclxuICB0YWtlRmlyc3ROOiBmdW5jdGlvbiAobHN0OiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4sIG46IG51bWJlcik6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiB7XHJcbiAgICByZXR1cm4gbHN0LmZpbHRlcihmdW5jdGlvbiAob01lbWJlciwgaUluZGV4KSB7XHJcbiAgICAgIHZhciBsYXN0UmFua2luZyA9IDEuMDtcclxuICAgICAgaWYgKChpSW5kZXggPCBuKSB8fCBvTWVtYmVyLl9yYW5raW5nID09PSBsYXN0UmFua2luZykge1xyXG4gICAgICAgIGxhc3RSYW5raW5nID0gb01lbWJlci5fcmFua2luZztcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9KTtcclxuICB9LFxyXG4gIHRha2VBYm92ZTogZnVuY3Rpb24gKGxzdDogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+LCBib3JkZXI6IG51bWJlcik6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiB7XHJcbiAgICByZXR1cm4gbHN0LmZpbHRlcihmdW5jdGlvbiAob01lbWJlcikge1xyXG4gICAgICByZXR1cm4gKG9NZW1iZXIuX3JhbmtpbmcgPj0gYm9yZGVyKTtcclxuICAgIH0pO1xyXG4gIH1cclxufTtcclxuXHJcbi8qXHJcbnZhciBleGFjdExlbiA9IDA7XHJcbnZhciBmdXp6eUxlbiA9IDA7XHJcbnZhciBmdXp6eUNudCA9IDA7XHJcbnZhciBleGFjdENudCA9IDA7XHJcbnZhciB0b3RhbENudCA9IDA7XHJcbnZhciB0b3RhbExlbiA9IDA7XHJcbnZhciByZXRhaW5lZENudCA9IDA7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVzZXRDbnQoKSB7XHJcbiAgZXhhY3RMZW4gPSAwO1xyXG4gIGZ1enp5TGVuID0gMDtcclxuICBmdXp6eUNudCA9IDA7XHJcbiAgZXhhY3RDbnQgPSAwO1xyXG4gIHRvdGFsQ250ID0gMDtcclxuICB0b3RhbExlbiA9IDA7XHJcbiAgcmV0YWluZWRDbnQgPSAwO1xyXG59XHJcbiovXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZihzV29yZEdyb3VwOiBzdHJpbmcsIHNwbGl0UnVsZXMgOiBJTWF0Y2guU3BsaXRSdWxlcyAsIGNudFJlYz8gOiBJQ250UmVjICk6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiB7XHJcbiAgdmFyIHNlZW5JdCA9IGNhdGVnb3JpemVTdHJpbmcyKHNXb3JkR3JvdXAsIHRydWUsIHNwbGl0UnVsZXMsIGNudFJlYyk7XHJcbiAgLy90b3RhbENudCArPSAxO1xyXG4gIC8vIGV4YWN0TGVuICs9IHNlZW5JdC5sZW5ndGg7XHJcbiAgYWRkQ250UmVjKGNudFJlYywgJ2NudENhdEV4YWN0JywgMSk7XHJcbiAgYWRkQ250UmVjKGNudFJlYywgJ2NudENhdEV4YWN0UmVzJywgc2Vlbkl0Lmxlbmd0aCk7XHJcblxyXG4gIGlmIChSYW5rV29yZC5oYXNBYm92ZShzZWVuSXQsIDAuOCkpIHtcclxuICAgIGlmKGNudFJlYykge1xyXG4gICAgICBhZGRDbnRSZWMoY250UmVjLCAnZXhhY3RQcmlvclRha2UnLCBzZWVuSXQubGVuZ3RoKVxyXG4gICAgfVxyXG4gICAgc2Vlbkl0ID0gUmFua1dvcmQudGFrZUFib3ZlKHNlZW5JdCwgMC44KTtcclxuICAgIGlmKGNudFJlYykge1xyXG4gICAgICBhZGRDbnRSZWMoY250UmVjLCAnZXhhY3RBZnRlclRha2UnLCBzZWVuSXQubGVuZ3RoKVxyXG4gICAgfVxyXG4gICAvLyBleGFjdENudCArPSAxO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBzZWVuSXQgPSBjYXRlZ29yaXplU3RyaW5nMihzV29yZEdyb3VwLCBmYWxzZSwgc3BsaXRSdWxlcywgY250UmVjKTtcclxuICAgIGFkZENudFJlYyhjbnRSZWMsICdjbnROb25FeGFjdCcsIDEpO1xyXG4gICAgYWRkQ250UmVjKGNudFJlYywgJ2NudE5vbkV4YWN0UmVzJywgc2Vlbkl0Lmxlbmd0aCk7XHJcbiAgLy8gIGZ1enp5TGVuICs9IHNlZW5JdC5sZW5ndGg7XHJcbiAgLy8gIGZ1enp5Q250ICs9IDE7XHJcbiAgfVxyXG4gLy8gdG90YWxMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcclxuICBzZWVuSXQgPSBSYW5rV29yZC50YWtlRmlyc3ROKHNlZW5JdCwgQWxnb2wuVG9wX05fV29yZENhdGVnb3JpemF0aW9ucyk7XHJcbiAvLyByZXRhaW5lZENudCArPSBzZWVuSXQubGVuZ3RoO1xyXG4gIHJldHVybiBzZWVuSXQ7XHJcbn1cclxuXHJcbi8qXHJcbmV4cG9ydCBmdW5jdGlvbiBkdW1wQ250KCkge1xyXG4gIGNvbnNvbGUubG9nKGBcclxuZXhhY3RMZW4gPSAke2V4YWN0TGVufTtcclxuZXhhY3RDbnQgPSAke2V4YWN0Q250fTtcclxuZnV6enlMZW4gPSAke2Z1enp5TGVufTtcclxuZnV6enlDbnQgPSAke2Z1enp5Q250fTtcclxudG90YWxDbnQgPSAke3RvdGFsQ250fTtcclxudG90YWxMZW4gPSAke3RvdGFsTGVufTtcclxucmV0YWluZWRMZW4gPSAke3JldGFpbmVkQ250fTtcclxuICBgKTtcclxufVxyXG4qL1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZFNlbnRlbmNlKG9TZW50ZW5jZTogSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXVtdKTogYm9vbGVhbiB7XHJcbiAgcmV0dXJuIG9TZW50ZW5jZS5ldmVyeShmdW5jdGlvbiAob1dvcmRHcm91cCkge1xyXG4gICAgcmV0dXJuIChvV29yZEdyb3VwLmxlbmd0aCA+IDApO1xyXG4gIH0pO1xyXG59XHJcblxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWQoYXJyOiBJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdW11bXSk6IElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11bXVtdIHtcclxuICByZXR1cm4gYXJyLmZpbHRlcihmdW5jdGlvbiAob1NlbnRlbmNlKSB7XHJcbiAgICByZXR1cm4gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkU2VudGVuY2Uob1NlbnRlbmNlKTtcclxuICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNhdGVnb3JpemVBV29yZChzV29yZEdyb3VwOiBzdHJpbmcsIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgc2VudGVuY2U6IHN0cmluZywgd29yZHM6IHsgW2tleTogc3RyaW5nXTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+fSxcclxuY250UmVjID8gOiBJQ250UmVjICkgOiBJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW10ge1xyXG4gIHZhciBzZWVuSXQgPSB3b3Jkc1tzV29yZEdyb3VwXTtcclxuICBpZiAoc2Vlbkl0ID09PSB1bmRlZmluZWQpIHtcclxuICAgIHNlZW5JdCA9IGNhdGVnb3JpemVXb3JkV2l0aFJhbmtDdXRvZmYoc1dvcmRHcm91cCwgcnVsZXMsIGNudFJlYyk7XHJcbiAgICB1dGlscy5kZWVwRnJlZXplKHNlZW5JdCk7XHJcbiAgICB3b3Jkc1tzV29yZEdyb3VwXSA9IHNlZW5JdDtcclxuICB9XHJcbiAgaWYgKCFzZWVuSXQgfHwgc2Vlbkl0Lmxlbmd0aCA9PT0gMCkge1xyXG4gICAgbG9nZ2VyKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgXFxcIlwiICsgc1dvcmRHcm91cCArIFwiXFxcIiBpbiBzZW50ZW5jZSBcXFwiXCJcclxuICAgICAgKyBzZW50ZW5jZSArIFwiXFxcIlwiKTtcclxuICAgIGlmIChzV29yZEdyb3VwLmluZGV4T2YoXCIgXCIpIDw9IDApIHtcclxuICAgICAgZGVidWdsb2coXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBwcmltaXRpdmUgKCEpXCIgKyBzV29yZEdyb3VwKTtcclxuICAgIH1cclxuICAgIGRlYnVnbG9nKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgXCIgKyBzV29yZEdyb3VwKTtcclxuICAgIGlmICghc2Vlbkl0KSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGluZyBlbXRweSBsaXN0LCBub3QgdW5kZWZpbmVkIGZvciBcXFwiXCIgKyBzV29yZEdyb3VwICsgXCJcXFwiXCIpXHJcbiAgICB9XHJcbiAgICB3b3Jkc1tzV29yZEdyb3VwXSA9IFtdXHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG4gIHJldHVybiB1dGlscy5jbG9uZURlZXAoc2Vlbkl0KTtcclxufVxyXG5cclxuXHJcbi8qKlxyXG4gKiBHaXZlbiBhICBzdHJpbmcsIGJyZWFrIGl0IGRvd24gaW50byBjb21wb25lbnRzLFxyXG4gKiBbWydBJywgJ0InXSwgWydBIEInXV1cclxuICpcclxuICogdGhlbiBjYXRlZ29yaXplV29yZHNcclxuICogcmV0dXJuaW5nXHJcbiAqXHJcbiAqIFsgW1sgeyBjYXRlZ29yeTogJ3N5c3RlbUlkJywgd29yZCA6ICdBJ30sXHJcbiAqICAgICAgeyBjYXRlZ29yeTogJ290aGVydGhpbmcnLCB3b3JkIDogJ0EnfVxyXG4gKiAgICBdLFxyXG4gKiAgICAvLyByZXN1bHQgb2YgQlxyXG4gKiAgICBbIHsgY2F0ZWdvcnk6ICdzeXN0ZW1JZCcsIHdvcmQgOiAnQid9LFxyXG4gKiAgICAgIHsgY2F0ZWdvcnk6ICdvdGhlcnRoaW5nJywgd29yZCA6ICdBJ31cclxuICogICAgICB7IGNhdGVnb3J5OiAnYW5vdGhlcnRyeXAnLCB3b3JkIDogJ0InfVxyXG4gKiAgICBdXHJcbiAqICAgXSxcclxuICogXV1dXHJcbiAqXHJcbiAqXHJcbiAqXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZVN0cmluZyhzU3RyaW5nOiBzdHJpbmcsIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcyxcclxuICB3b3Jkcz86IHsgW2tleTogc3RyaW5nXTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IH0pXHJcbiAgOiBbIFsgSU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdXSBdXHJcbiAgIHtcclxuICB2YXIgY250ID0gMDtcclxuICB2YXIgZmFjID0gMTtcclxuICB2YXIgdSA9IGJyZWFrZG93bi5icmVha2Rvd25TdHJpbmcoc1N0cmluZywgQWxnb2wuTWF4U3BhY2VzUGVyQ29tYmluZWRXb3JkKTtcclxuICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZyhcImhlcmUgYnJlYWtkb3duXCIgKyBKU09OLnN0cmluZ2lmeSh1KSk7XHJcbiAgfVxyXG4gIC8vY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkodSkpO1xyXG4gIHdvcmRzID0gd29yZHMgfHwge307XHJcbiAgZGVidWdwZXJmKCd0aGlzIG1hbnkga25vd24gd29yZHM6ICcgKyBPYmplY3Qua2V5cyh3b3JkcykubGVuZ3RoKTtcclxuICB2YXIgcmVzID0gW10gYXMgW1sgSU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdXSBdO1xyXG4gIHZhciBjbnRSZWMgPSB7fTtcclxuICB1LmZvckVhY2goZnVuY3Rpb24gKGFCcmVha0Rvd25TZW50ZW5jZSkge1xyXG4gICAgICB2YXIgY2F0ZWdvcml6ZWRTZW50ZW5jZSA9IFtdIGFzIFsgSU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdIF07XHJcbiAgICAgIHZhciBpc1ZhbGlkID0gYUJyZWFrRG93blNlbnRlbmNlLmV2ZXJ5KGZ1bmN0aW9uIChzV29yZEdyb3VwOiBzdHJpbmcsIGluZGV4IDogbnVtYmVyKSB7XHJcbiAgICAgICAgdmFyIHNlZW5JdCA9IGNhdGVnb3JpemVBV29yZChzV29yZEdyb3VwLCBydWxlcywgc1N0cmluZywgd29yZHMsIGNudFJlYyk7XHJcbiAgICAgICAgaWYoc2Vlbkl0Lmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXRlZ29yaXplZFNlbnRlbmNlW2luZGV4XSA9IHNlZW5JdDtcclxuICAgICAgICBjbnQgPSBjbnQgKyBzZWVuSXQubGVuZ3RoO1xyXG4gICAgICAgIGZhYyA9IGZhYyAqIHNlZW5JdC5sZW5ndGg7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgIH0pO1xyXG4gICAgICBpZihpc1ZhbGlkKSB7XHJcbiAgICAgICAgcmVzLnB1c2goY2F0ZWdvcml6ZWRTZW50ZW5jZSk7XHJcbiAgICAgIH1cclxuICB9KTtcclxuICBkZWJ1Z2xvZyhcIiBzZW50ZW5jZXMgXCIgKyB1Lmxlbmd0aCArIFwiIG1hdGNoZXMgXCIgKyBjbnQgKyBcIiBmYWM6IFwiICsgZmFjKTtcclxuICBpZihkZWJ1Z2xvZy5lbmFibGVkICYmIHUubGVuZ3RoKSB7XHJcbiAgICBkZWJ1Z2xvZyhcImZpcnN0IG1hdGNoIFwiKyBKU09OLnN0cmluZ2lmeSh1LHVuZGVmaW5lZCwyKSk7XHJcbiAgfVxyXG4gIGRlYnVncGVyZihcIiBzZW50ZW5jZXMgXCIgKyB1Lmxlbmd0aCArIFwiIC8gXCIgKyByZXMubGVuZ3RoICsgIFwiIG1hdGNoZXMgXCIgKyBjbnQgKyBcIiBmYWM6IFwiICsgZmFjICsgXCIgcmVjIDogXCIgKyBKU09OLnN0cmluZ2lmeShjbnRSZWMsdW5kZWZpbmVkLDIpKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG4vKlxyXG5bIFthLGJdLCBbYyxkXV1cclxuXHJcbjAwIGFcclxuMDEgYlxyXG4xMCBjXHJcbjExIGRcclxuMTIgY1xyXG4qL1xyXG5cclxuXHJcbmNvbnN0IGNsb25lID0gdXRpbHMuY2xvbmVEZWVwO1xyXG5cclxuXHJcbmZ1bmN0aW9uIGNvcHlWZWNNZW1iZXJzKHUpIHtcclxuICB2YXIgaSA9IDA7XHJcbiAgZm9yKGkgPSAwOyBpIDwgdS5sZW5ndGg7ICsraSkge1xyXG4gICAgdVtpXSA9IGNsb25lKHVbaV0pO1xyXG4gIH1cclxuICByZXR1cm4gdTtcclxufVxyXG4vLyB3ZSBjYW4gcmVwbGljYXRlIHRoZSB0YWlsIG9yIHRoZSBoZWFkLFxyXG4vLyB3ZSByZXBsaWNhdGUgdGhlIHRhaWwgYXMgaXQgaXMgc21hbGxlci5cclxuXHJcbi8vIFthLGIsYyBdXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZXhwYW5kTWF0Y2hBcnIoZGVlcDogQXJyYXk8QXJyYXk8YW55Pj4pOiBBcnJheTxBcnJheTxhbnk+PiB7XHJcbiAgdmFyIGEgPSBbXTtcclxuICB2YXIgbGluZSA9IFtdO1xyXG4gIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyBKU09OLnN0cmluZ2lmeShkZWVwKSA6ICctJyk7XHJcbiAgZGVlcC5mb3JFYWNoKGZ1bmN0aW9uICh1QnJlYWtEb3duTGluZSwgaUluZGV4OiBudW1iZXIpIHtcclxuICAgIGxpbmVbaUluZGV4XSA9IFtdO1xyXG4gICAgdUJyZWFrRG93bkxpbmUuZm9yRWFjaChmdW5jdGlvbiAoYVdvcmRHcm91cCwgd2dJbmRleDogbnVtYmVyKSB7XHJcbiAgICAgIGxpbmVbaUluZGV4XVt3Z0luZGV4XSA9IFtdO1xyXG4gICAgICBhV29yZEdyb3VwLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkVmFyaWFudCwgaVdWSW5kZXg6IG51bWJlcikge1xyXG4gICAgICAgIGxpbmVbaUluZGV4XVt3Z0luZGV4XVtpV1ZJbmRleF0gPSBvV29yZFZhcmlhbnQ7XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfSlcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShsaW5lKSk7XHJcbiAgdmFyIHJlcyA9IFtdO1xyXG4gIHZhciBudmVjcyA9IFtdO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZS5sZW5ndGg7ICsraSkge1xyXG4gICAgdmFyIHZlY3MgPSBbW11dO1xyXG4gICAgdmFyIG52ZWNzID0gW107XHJcbiAgICB2YXIgcnZlYyA9IFtdO1xyXG4gICAgZm9yICh2YXIgayA9IDA7IGsgPCBsaW5lW2ldLmxlbmd0aDsgKytrKSB7IC8vIHdvcmRncm91cCBrXHJcbiAgICAgIC8vdmVjcyBpcyB0aGUgdmVjdG9yIG9mIGFsbCBzbyBmYXIgc2VlbiB2YXJpYW50cyB1cCB0byBrIHdncy5cclxuICAgICAgdmFyIG5leHRCYXNlID0gW107XHJcbiAgICAgIGZvciAodmFyIGwgPSAwOyBsIDwgbGluZVtpXVtrXS5sZW5ndGg7ICsrbCkgeyAvLyBmb3IgZWFjaCB2YXJpYW50XHJcbiAgICAgICAgLy9kZWJ1Z2xvZyhcInZlY3Mgbm93XCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzKSk7XHJcbiAgICAgICAgbnZlY3MgPSBbXTsgLy92ZWNzLnNsaWNlKCk7IC8vIGNvcHkgdGhlIHZlY1tpXSBiYXNlIHZlY3RvcjtcclxuICAgICAgICAvL2RlYnVnbG9nKFwidmVjcyBjb3BpZWQgbm93XCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpO1xyXG4gICAgICAgIGZvciAodmFyIHUgPSAwOyB1IDwgdmVjcy5sZW5ndGg7ICsrdSkge1xyXG4gICAgICAgICAgbnZlY3NbdV0gPSB2ZWNzW3VdLnNsaWNlKCk7IC8vXHJcbiAgICAgICAgICBudmVjc1t1XSA9IGNvcHlWZWNNZW1iZXJzKG52ZWNzW3VdKTtcclxuICAgICAgICAgIC8vIGRlYnVnbG9nKFwiY29waWVkIHZlY3NbXCIrIHUrXCJdXCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzW3VdKSk7XHJcbiAgICAgICAgICBudmVjc1t1XS5wdXNoKFxyXG4gICAgICAgICAgICBjbG9uZShsaW5lW2ldW2tdW2xdKSk7IC8vIHB1c2ggdGhlIGx0aCB2YXJpYW50XHJcbiAgICAgICAgICAvLyBkZWJ1Z2xvZyhcIm5vdyBudmVjcyBcIiArIG52ZWNzLmxlbmd0aCArIFwiIFwiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gICBkZWJ1Z2xvZyhcIiBhdCAgICAgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbmV4dGJhc2UgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxyXG4gICAgICAgIC8vICAgZGVidWdsb2coXCIgYXBwZW5kIFwiICsgayArIFwiOlwiICsgbCArIFwiIG52ZWNzICAgID5cIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSlcclxuICAgICAgICBuZXh0QmFzZSA9IG5leHRCYXNlLmNvbmNhdChudmVjcyk7XHJcbiAgICAgICAgLy8gICBkZWJ1Z2xvZyhcIiAgcmVzdWx0IFwiICsgayArIFwiOlwiICsgbCArIFwiIG52ZWNzICAgID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcclxuICAgICAgfSAvL2NvbnN0cnVcclxuICAgICAgLy8gIGRlYnVnbG9nKFwibm93IGF0IFwiICsgayArIFwiOlwiICsgbCArIFwiID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcclxuICAgICAgdmVjcyA9IG5leHRCYXNlO1xyXG4gICAgfVxyXG4gICAgZGVidWdsb2dWKGRlYnVnbG9nVi5lbmFibGVkID8gKFwiQVBQRU5ESU5HIFRPIFJFU1wiICsgaSArIFwiOlwiICsgbCArIFwiID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSkgOiAnLScpO1xyXG4gICAgcmVzID0gcmVzLmNvbmNhdCh2ZWNzKTtcclxuICB9XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuXHJcbi8qKlxyXG4gKiBDYWxjdWxhdGUgYSB3ZWlnaHQgZmFjdG9yIGZvciBhIGdpdmVuIGRpc3RhbmNlIGFuZFxyXG4gKiBjYXRlZ29yeVxyXG4gKiBAcGFyYW0ge2ludGVnZXJ9IGRpc3QgZGlzdGFuY2UgaW4gd29yZHNcclxuICogQHBhcmFtIHtzdHJpbmd9IGNhdGVnb3J5IGNhdGVnb3J5IHRvIHVzZVxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBhIGRpc3RhbmNlIGZhY3RvciA+PSAxXHJcbiAqICAxLjAgZm9yIG5vIGVmZmVjdFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlaW5mb3JjZURpc3RXZWlnaHQoZGlzdDogbnVtYmVyLCBjYXRlZ29yeTogc3RyaW5nKTogbnVtYmVyIHtcclxuICB2YXIgYWJzID0gTWF0aC5hYnMoZGlzdCk7XHJcbiAgcmV0dXJuIDEuMCArIChBbGdvbC5hUmVpbmZvcmNlRGlzdFdlaWdodFthYnNdIHx8IDApO1xyXG59XHJcblxyXG4vKipcclxuICogR2l2ZW4gYSBzZW50ZW5jZSwgZXh0YWN0IGNhdGVnb3JpZXNcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0Q2F0ZWdvcnlNYXAob1NlbnRlbmNlOiBBcnJheTxJRk1hdGNoLklXb3JkPik6IHsgW2tleTogc3RyaW5nXTogQXJyYXk8eyBwb3M6IG51bWJlciB9PiB9IHtcclxuICB2YXIgcmVzID0ge307XHJcbiAgZGVidWdsb2coJ2V4dHJhY3RDYXRlZ29yeU1hcCAnICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKSk7XHJcbiAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpSW5kZXgpIHtcclxuICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gSUZNYXRjaC5DQVRfQ0FURUdPUlkpIHtcclxuICAgICAgcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddID0gcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddIHx8IFtdO1xyXG4gICAgICByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10ucHVzaCh7IHBvczogaUluZGV4IH0pO1xyXG4gICAgfVxyXG4gIH0pO1xyXG4gIHV0aWxzLmRlZXBGcmVlemUocmVzKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVpbkZvcmNlU2VudGVuY2Uob1NlbnRlbmNlKSB7XHJcbiAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgdmFyIG9DYXRlZ29yeU1hcCA9IGV4dHJhY3RDYXRlZ29yeU1hcChvU2VudGVuY2UpO1xyXG4gIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaUluZGV4KSB7XHJcbiAgICB2YXIgbSA9IG9DYXRlZ29yeU1hcFtvV29yZC5jYXRlZ29yeV0gfHwgW107XHJcbiAgICBtLmZvckVhY2goZnVuY3Rpb24gKG9Qb3NpdGlvbjogeyBwb3M6IG51bWJlciB9KSB7XHJcbiAgICAgIFwidXNlIHN0cmljdFwiO1xyXG4gICAgICBvV29yZC5yZWluZm9yY2UgPSBvV29yZC5yZWluZm9yY2UgfHwgMTtcclxuICAgICAgdmFyIGJvb3N0ID0gcmVpbmZvcmNlRGlzdFdlaWdodChpSW5kZXggLSBvUG9zaXRpb24ucG9zLCBvV29yZC5jYXRlZ29yeSk7XHJcbiAgICAgIG9Xb3JkLnJlaW5mb3JjZSAqPSBib29zdDtcclxuICAgICAgb1dvcmQuX3JhbmtpbmcgKj0gYm9vc3Q7XHJcbiAgICB9KTtcclxuICB9KTtcclxuICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGlJbmRleCkge1xyXG4gICAgaWYgKGlJbmRleCA+IDAgKSB7XHJcbiAgICAgIGlmIChvU2VudGVuY2VbaUluZGV4LTFdLmNhdGVnb3J5ID09PSBcIm1ldGFcIiAgJiYgKG9Xb3JkLmNhdGVnb3J5ID09PSBvU2VudGVuY2VbaUluZGV4LTFdLm1hdGNoZWRTdHJpbmcpICkge1xyXG4gICAgICAgIG9Xb3JkLnJlaW5mb3JjZSA9IG9Xb3JkLnJlaW5mb3JjZSB8fCAxO1xyXG4gICAgICAgIHZhciBib29zdCA9IHJlaW5mb3JjZURpc3RXZWlnaHQoMSwgb1dvcmQuY2F0ZWdvcnkpO1xyXG4gICAgICAgIG9Xb3JkLnJlaW5mb3JjZSAqPSBib29zdDtcclxuICAgICAgICBvV29yZC5fcmFua2luZyAqPSBib29zdDtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0pO1xyXG4gIHJldHVybiBvU2VudGVuY2U7XHJcbn1cclxuXHJcblxyXG5pbXBvcnQgKiBhcyBTZW50ZW5jZSBmcm9tICcuL3NlbnRlbmNlJztcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWluRm9yY2UoYUNhdGVnb3JpemVkQXJyYXkpIHtcclxuICBcInVzZSBzdHJpY3RcIjtcclxuICBhQ2F0ZWdvcml6ZWRBcnJheS5mb3JFYWNoKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcclxuICAgIHJlaW5Gb3JjZVNlbnRlbmNlKG9TZW50ZW5jZSk7XHJcbiAgfSlcclxuICBhQ2F0ZWdvcml6ZWRBcnJheS5zb3J0KFNlbnRlbmNlLmNtcFJhbmtpbmdQcm9kdWN0KTtcclxuICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZyhcImFmdGVyIHJlaW5mb3JjZVwiICsgYUNhdGVnb3JpemVkQXJyYXkubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcclxuICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XHJcbiAgICB9KS5qb2luKFwiXFxuXCIpKTtcclxuICB9XHJcbiAgcmV0dXJuIGFDYXRlZ29yaXplZEFycmF5O1xyXG59XHJcblxyXG5cclxuLy8vIGJlbG93IG1heSBubyBsb25nZXIgYmUgdXNlZFxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVnRXhwKG9SdWxlOiBJUnVsZSwgY29udGV4dDogSUZNYXRjaC5jb250ZXh0LCBvcHRpb25zPzogSU1hdGNoT3B0aW9ucykge1xyXG4gIGlmIChjb250ZXh0W29SdWxlLmtleV0gPT09IHVuZGVmaW5lZCkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICB9XHJcbiAgdmFyIHNLZXkgPSBvUnVsZS5rZXk7XHJcbiAgdmFyIHMxID0gY29udGV4dFtvUnVsZS5rZXldLnRvTG93ZXJDYXNlKClcclxuICB2YXIgcmVnID0gb1J1bGUucmVnZXhwO1xyXG5cclxuICB2YXIgbSA9IHJlZy5leGVjKHMxKTtcclxuICBpZihkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xyXG4gICAgZGVidWdsb2dWKFwiYXBwbHlpbmcgcmVnZXhwOiBcIiArIHMxICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XHJcbiAgfVxyXG4gIGlmICghbSkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICB9XHJcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cclxuICB2YXIgZGVsdGEgPSBjb21wYXJlQ29udGV4dChjb250ZXh0LCBvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpXHJcbiAgaWYgKGRlYnVnbG9nVi5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZ1YoSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcclxuICAgIGRlYnVnbG9nVihKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XHJcbiAgfVxyXG4gIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gIH1cclxuICB2YXIgb0V4dHJhY3RlZENvbnRleHQgPSBleHRyYWN0QXJnc01hcChtLCBvUnVsZS5hcmdzTWFwKTtcclxuICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nVihcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUuYXJnc01hcCkpO1xyXG4gICAgZGVidWdsb2dWKFwibWF0Y2ggXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XHJcbiAgICBkZWJ1Z2xvZ1YoXCJleHRyYWN0ZWQgYXJncyBcIiArIEpTT04uc3RyaW5naWZ5KG9FeHRyYWN0ZWRDb250ZXh0KSk7XHJcbiAgfVxyXG4gIHZhciByZXMgPSBBbnlPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKSBhcyBhbnk7XHJcbiAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9FeHRyYWN0ZWRDb250ZXh0KTtcclxuICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgY29udGV4dCk7XHJcbiAgaWYgKG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldICE9PSB1bmRlZmluZWQpIHtcclxuICAgIHJlc1tzS2V5XSA9IG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldO1xyXG4gIH1cclxuICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xyXG4gICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xyXG4gICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9FeHRyYWN0ZWRDb250ZXh0KVxyXG4gIH1cclxuICBPYmplY3QuZnJlZXplKHJlcyk7XHJcbiAgZGVidWdsb2coJ0ZvdW5kIG9uZScgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzb3J0QnlXZWlnaHQoc0tleTogc3RyaW5nLCBvQ29udGV4dEE6IElGTWF0Y2guY29udGV4dCwgb0NvbnRleHRCOiBJRk1hdGNoLmNvbnRleHQpOiBudW1iZXIge1xyXG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZ1YoJ3NvcnRpbmc6ICcgKyBzS2V5ICsgJ2ludm9rZWQgd2l0aFxcbiAxOicgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEEsIHVuZGVmaW5lZCwgMikgK1xyXG4gICAgXCIgdnMgXFxuIDI6XCIgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEIsIHVuZGVmaW5lZCwgMikpO1xyXG4gIH1cclxuICB2YXIgcmFua2luZ0E6IG51bWJlciA9IHBhcnNlRmxvYXQob0NvbnRleHRBW1wiX3JhbmtpbmdcIl0gfHwgXCIxXCIpO1xyXG4gIHZhciByYW5raW5nQjogbnVtYmVyID0gcGFyc2VGbG9hdChvQ29udGV4dEJbXCJfcmFua2luZ1wiXSB8fCBcIjFcIik7XHJcbiAgaWYgKHJhbmtpbmdBICE9PSByYW5raW5nQikge1xyXG4gICAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgICBkZWJ1Z2xvZyhcIiByYW5raW4gZGVsdGFcIiArIDEwMCAqIChyYW5raW5nQiAtIHJhbmtpbmdBKSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gMTAwICogKHJhbmtpbmdCIC0gcmFua2luZ0EpXHJcbiAgfVxyXG5cclxuICB2YXIgd2VpZ2h0QSA9IG9Db250ZXh0QVtcIl93ZWlnaHRcIl0gJiYgb0NvbnRleHRBW1wiX3dlaWdodFwiXVtzS2V5XSB8fCAwO1xyXG4gIHZhciB3ZWlnaHRCID0gb0NvbnRleHRCW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdW3NLZXldIHx8IDA7XHJcbiAgcmV0dXJuICsod2VpZ2h0QSAtIHdlaWdodEIpO1xyXG59XHJcblxyXG5cclxuLy8gV29yZCwgU3lub255bSwgUmVnZXhwIC8gRXh0cmFjdGlvblJ1bGVcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhdWdtZW50Q29udGV4dDEoY29udGV4dDogSUZNYXRjaC5jb250ZXh0LCBvUnVsZXM6IEFycmF5PElSdWxlPiwgb3B0aW9uczogSU1hdGNoT3B0aW9ucyk6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIHZhciBzS2V5ID0gb1J1bGVzWzBdLmtleTtcclxuICAvLyBjaGVjayB0aGF0IHJ1bGVcclxuICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgLy8gY2hlY2sgY29uc2lzdGVuY3lcclxuICAgIG9SdWxlcy5ldmVyeShmdW5jdGlvbiAoaVJ1bGUpIHtcclxuICAgICAgaWYgKGlSdWxlLmtleSAhPT0gc0tleSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkluaG9tb2dlbm91cyBrZXlzIGluIHJ1bGVzLCBleHBlY3RlZCBcIiArIHNLZXkgKyBcIiB3YXMgXCIgKyBKU09OLnN0cmluZ2lmeShpUnVsZSkpO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvLyBsb29rIGZvciBydWxlcyB3aGljaCBtYXRjaFxyXG4gIHZhciByZXMgPSBvUnVsZXMubWFwKGZ1bmN0aW9uIChvUnVsZSkge1xyXG4gICAgLy8gaXMgdGhpcyBydWxlIGFwcGxpY2FibGVcclxuICAgIHN3aXRjaCAob1J1bGUudHlwZSkge1xyXG4gICAgICBjYXNlIElGTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQ6XHJcbiAgICAgICAgcmV0dXJuIG1hdGNoV29yZChvUnVsZSwgY29udGV4dCwgb3B0aW9ucylcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5SRUdFWFA6XHJcbiAgICAgICAgcmV0dXJuIG1hdGNoUmVnRXhwKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKTtcclxuICAgICAgLy8gICBjYXNlIFwiRXh0cmFjdGlvblwiOlxyXG4gICAgICAvLyAgICAgcmV0dXJuIG1hdGNoRXh0cmFjdGlvbihvUnVsZSxjb250ZXh0KTtcclxuICAgIH1cclxuICAgIHJldHVybiB1bmRlZmluZWRcclxuICB9KS5maWx0ZXIoZnVuY3Rpb24gKG9yZXMpIHtcclxuICAgIHJldHVybiAhIW9yZXNcclxuICB9KS5zb3J0KFxyXG4gICAgc29ydEJ5V2VpZ2h0LmJpbmQodGhpcywgc0tleSlcclxuICAgICk7XHJcbiAgcmV0dXJuIHJlcztcclxuICAvLyBPYmplY3Qua2V5cygpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcclxuICAvLyB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0KGNvbnRleHQ6IElGTWF0Y2guY29udGV4dCwgYVJ1bGVzOiBBcnJheTxJUnVsZT4pOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuXHJcbiAgdmFyIG9wdGlvbnMxOiBJTWF0Y2hPcHRpb25zID0ge1xyXG4gICAgbWF0Y2hvdGhlcnM6IHRydWUsXHJcbiAgICBvdmVycmlkZTogZmFsc2VcclxuICB9IGFzIElNYXRjaE9wdGlvbnM7XHJcblxyXG4gIHZhciBhUmVzID0gYXVnbWVudENvbnRleHQxKGNvbnRleHQsIGFSdWxlcywgb3B0aW9uczEpXHJcblxyXG4gIGlmIChhUmVzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgdmFyIG9wdGlvbnMyOiBJTWF0Y2hPcHRpb25zID0ge1xyXG4gICAgICBtYXRjaG90aGVyczogZmFsc2UsXHJcbiAgICAgIG92ZXJyaWRlOiB0cnVlXHJcbiAgICB9IGFzIElNYXRjaE9wdGlvbnM7XHJcbiAgICBhUmVzID0gYXVnbWVudENvbnRleHQxKGNvbnRleHQsIGFSdWxlcywgb3B0aW9uczIpO1xyXG4gIH1cclxuICByZXR1cm4gYVJlcztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGluc2VydE9yZGVyZWQocmVzdWx0OiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+LCBpSW5zZXJ0ZWRNZW1iZXI6IElGTWF0Y2guY29udGV4dCwgbGltaXQ6IG51bWJlcik6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIC8vIFRPRE86IHVzZSBzb21lIHdlaWdodFxyXG4gIGlmIChyZXN1bHQubGVuZ3RoIDwgbGltaXQpIHtcclxuICAgIHJlc3VsdC5wdXNoKGlJbnNlcnRlZE1lbWJlcilcclxuICB9XHJcbiAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB0YWtlVG9wTihhcnI6IEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+KTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgdmFyIHUgPSBhcnIuZmlsdGVyKGZ1bmN0aW9uIChpbm5lckFycikgeyByZXR1cm4gaW5uZXJBcnIubGVuZ3RoID4gMCB9KVxyXG5cclxuICB2YXIgcmVzID0gW107XHJcbiAgLy8gc2hpZnQgb3V0IHRoZSB0b3Agb25lc1xyXG4gIHUgPSB1Lm1hcChmdW5jdGlvbiAoaUFycikge1xyXG4gICAgdmFyIHRvcCA9IGlBcnIuc2hpZnQoKTtcclxuICAgIHJlcyA9IGluc2VydE9yZGVyZWQocmVzLCB0b3AsIDUpXHJcbiAgICByZXR1cm4gaUFyclxyXG4gIH0pLmZpbHRlcihmdW5jdGlvbiAoaW5uZXJBcnI6IEFycmF5PElGTWF0Y2guY29udGV4dD4pOiBib29sZWFuIHsgcmV0dXJuIGlubmVyQXJyLmxlbmd0aCA+IDAgfSk7XHJcbiAgLy8gYXMgQXJyYXk8QXJyYXk8SUZNYXRjaC5jb250ZXh0Pj5cclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5pbXBvcnQgKiBhcyBpbnB1dEZpbHRlclJ1bGVzIGZyb20gJy4vaW5wdXRGaWx0ZXJSdWxlcyc7XHJcblxyXG52YXIgcm07XHJcblxyXG5mdW5jdGlvbiBnZXRSTU9uY2UoKSB7XHJcbiAgaWYgKCFybSkge1xyXG4gICAgcm0gPSBpbnB1dEZpbHRlclJ1bGVzLmdldFJ1bGVNYXAoKVxyXG4gIH1cclxuICByZXR1cm4gcm07XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhcHBseVJ1bGVzKGNvbnRleHQ6IElGTWF0Y2guY29udGV4dCk6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIHZhciBiZXN0TjogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiA9IFtjb250ZXh0XTtcclxuICBpbnB1dEZpbHRlclJ1bGVzLm9LZXlPcmRlci5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5OiBzdHJpbmcpIHtcclxuICAgIHZhciBiZXN0TmV4dDogQXJyYXk8QXJyYXk8SUZNYXRjaC5jb250ZXh0Pj4gPSBbXTtcclxuICAgIGJlc3ROLmZvckVhY2goZnVuY3Rpb24gKG9Db250ZXh0OiBJRk1hdGNoLmNvbnRleHQpIHtcclxuICAgICAgaWYgKG9Db250ZXh0W3NLZXldKSB7XHJcbiAgICAgICAgZGVidWdsb2coJyoqIGFwcGx5aW5nIHJ1bGVzIGZvciAnICsgc0tleSlcclxuICAgICAgICB2YXIgcmVzID0gYXVnbWVudENvbnRleHQob0NvbnRleHQsIGdldFJNT25jZSgpW3NLZXldIHx8IFtdKVxyXG4gICAgICAgIGRlYnVnbG9nKCcqKiByZXN1bHQgZm9yICcgKyBzS2V5ICsgJyA9ICcgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpXHJcbiAgICAgICAgYmVzdE5leHQucHVzaChyZXMgfHwgW10pXHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gcnVsZSBub3QgcmVsZXZhbnRcclxuICAgICAgICBiZXN0TmV4dC5wdXNoKFtvQ29udGV4dF0pO1xyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gICAgYmVzdE4gPSB0YWtlVG9wTihiZXN0TmV4dCk7XHJcbiAgfSk7XHJcbiAgcmV0dXJuIGJlc3ROXHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlSdWxlc1BpY2tGaXJzdChjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQpOiBJRk1hdGNoLmNvbnRleHQge1xyXG4gIHZhciByID0gYXBwbHlSdWxlcyhjb250ZXh0KTtcclxuICByZXR1cm4gciAmJiByWzBdO1xyXG59XHJcblxyXG4vKipcclxuICogRGVjaWRlIHdoZXRoZXIgdG8gcmVxdWVyeSBmb3IgYSBjb250ZXRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBkZWNpZGVPblJlUXVlcnkoY29udGV4dDogSUZNYXRjaC5jb250ZXh0KTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgcmV0dXJuIFtdXHJcbn1cclxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
