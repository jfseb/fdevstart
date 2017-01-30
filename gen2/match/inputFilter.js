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
function cntChars(str, len) {
    var cnt = 0;
    for (var i = 0; i < len; ++i) {
        cnt += str.charAt(i) === 'X' ? 1 : 0;
    }
    return cnt;
}
/**
 * @param sText {string} the text to match to NavTargetResolution
 * @param sText2 {string} the query text, e.g. NavTarget
 *
 * @return the distance, note that is is *not* symmetric!
 */
function calcDistance(sText1, sText2) {
    // console.log("length2" + sText1 + " - " + sText2)
    var s1len = sText1.length;
    var s2len = sText2.length;
    var min = Math.min(s1len, s2len);
    if (Math.abs(s1len - s2len) > Math.min(s1len, s2len)) {
        return 0.3;
    }
    var dist = distance.jaroWinklerDistance(sText1, sText2);
    var cnt1 = cntChars(sText1, s1len);
    var cnt2 = cntChars(sText2, s2len);
    if (cnt1 !== cnt2) {
        dist = dist * 0.7;
    }
    return dist;
    /*
    var a0 = distance.levenshtein(sText1.substring(0, sText2.length), sText2)
    if(debuglogV.enabled) {
      debuglogV("distance" + a0 + "stripped>" + sText1.substring(0,sText2.length) + "<>" + sText2+ "<");
    }
    if(a0 * 50 > 15 * sText2.length) {
        return 40000;
    }
    var a = distance.levenshtein(sText1, sText2)
    return a0 * 500 / sText2.length + a
    */
}
exports.calcDistance = calcDistance;
/**
 * @param sText {string} the text to match to NavTargetResolution
 * @param sText2 {string} the query text, e.g. NavTarget
 *
 * @return the distance, note that is is *not* symmetric!
 */
function calcDistanceLeven(sText1, sText2) {
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
exports.calcDistanceLeven = calcDistanceLeven;
var IFMatch = require('../match/ifmatch');
//const levenCutoff = Algol.Cutoff_LevenShtein;
function levenPenaltyOld(i) {
    // 0-> 1
    // 1 -> 0.1
    // 150 ->  0.8
    if (i === 0) {
        return 1;
    }
    // reverse may be better than linear
    return 1 + i * (0.8 - 1) / 150;
}
exports.levenPenaltyOld = levenPenaltyOld;
function levenPenalty(i) {
    // 1 -> 1
    // cutOff => 0.8
    return i;
    //return   1 -  (1 - i) *0.2/Algol.Cutoff_WordMatch;
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
                if (debuglog.enabled) {
                    debuglog("\n!matched exact " + string + "=" + oRule.lowercaseword + " => " + oRule.matchedString + "/" + oRule.category);
                }
                res.push({
                    string: string,
                    matchedString: oRule.matchedString,
                    category: oRule.category,
                    _ranking: oRule._ranking || 1.0
                });
            }
            if (!exact && !oRule.exactOnly) {
                var levenmatch = calcDistance(oRule.lowercaseword, lcString);
                /*
                          addCntRec(cntRec,"calcDistance", 1);
                          if(levenmatch < 50) {
                            addCntRec(cntRec,"calcDistanceExp", 1);
                          }
                          if(levenmatch < 40000) {
                            addCntRec(cntRec,"calcDistanceBelow40k", 1);
                          }
                          */
                //if(oRule.lowercaseword === "cosmos") {
                //  console.log("here ranking " + levenmatch + " " + oRule.lowercaseword + " " + lcString);
                //}
                if (levenmatch >= Algol.Cutoff_WordMatch) {
                    addCntRec(cntRec, "calcDistanceOk", 1);
                    var rec = {
                        string: string,
                        matchedString: oRule.matchedString,
                        category: oRule.category,
                        _ranking: (oRule._ranking || 1.0) * levenPenalty(levenmatch),
                        levenmatch: levenmatch
                    };
                    if (debuglog) {
                        debuglog("\n!fuzzy " + levenmatch.toFixed(3) + " " + rec._ranking.toFixed(3) + "  " + string + "=" + oRule.lowercaseword + " => " + oRule.matchedString + "/" + oRule.category);
                    }
                    res.push(rec);
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
function categorizeString(word, exact, oRules, cntRec) {
    // simply apply all rules
    if (debuglogM.enabled) {
        debuglogM("rules : " + JSON.stringify(oRules, undefined, 2));
    }
    var lcString = word.toLowerCase();
    var res = [];
    oRules.forEach(function (oRule) {
        checkOneRule(word, lcString, exact, res, oRule, cntRec);
    });
    res.sort(sortByRank);
    return res;
}
exports.categorizeString = categorizeString;
function postFilter(res) {
    res.sort(sortByRank);
    var bestRank = 0;
    //console.log("\npiltered " + JSON.stringify(res));
    if (debuglog.enabled) {
        debuglog(" preFilter : \n" + res.map(function (word) {
            return " " + word._ranking + "  => \"" + word.category + "\" " + word.matchedString + " \n";
        }).join("\n"));
    }
    var r = res.filter(function (resx, index) {
        if (index === 0) {
            bestRank = resx._ranking;
            return true;
        }
        // 1-0.9 = 0.1
        // 1- 0.93 = 0.7
        // 1/7
        var delta = bestRank / resx._ranking;
        if (resx.matchedString === res[index - 1].matchedString && resx.category === res[index - 1].category) {
            return false;
        }
        //console.log("\n delta for " + delta + "  " + resx._ranking);
        if (resx.levenmatch && delta > 1.03) {
            return false;
        }
        return true;
    });
    if (debuglog.enabled) {
        debuglog("\nfiltered " + r.length + "/" + res.length + JSON.stringify(r));
    }
    return r;
}
exports.postFilter = postFilter;
function categorizeString2(word, exact, rules, cntRec) {
    // simply apply all rules
    if (debuglogM.enabled) {
        debuglogM("rules : " + JSON.stringify(rules, undefined, 2));
    }
    var lcString = word.toLowerCase();
    var res = [];
    if (exact) {
        var r = rules.wordMap[lcString];
        if (r) {
            r.forEach(function (oRule) {
                res.push({
                    string: word,
                    matchedString: oRule.matchedString,
                    category: oRule.category,
                    _ranking: oRule._ranking || 1.0
                });
            });
        }
        rules.nonWordRules.forEach(function (oRule) {
            checkOneRule(word, lcString, exact, res, oRule, cntRec);
        });
    } else {
        debuglog("categorize non exact" + word + " xx  " + rules.allRules.length);
        return postFilter(categorizeString(word, exact, rules.allRules, cntRec));
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
    if (c > 0.80) {
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
    return +(weightB - weightA);
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
    //debuglog("hassorted" + JSON.stringify(res,undefined,2));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1hdGNoL2lucHV0RmlsdGVyLmpzIiwiLi4vc3JjL21hdGNoL2lucHV0RmlsdGVyLnRzIl0sIm5hbWVzIjpbImRpc3RhbmNlIiwicmVxdWlyZSIsIkxvZ2dlciIsImxvZ2dlciIsImRlYnVnIiwiZGVidWdwZXJmIiwidXRpbHMiLCJBbGdvbCIsImJyZWFrZG93biIsIkFueU9iamVjdCIsIk9iamVjdCIsImRlYnVnbG9nIiwiZGVidWdsb2dWIiwiZGVidWdsb2dNIiwibWF0Y2hkYXRhIiwib1VuaXRUZXN0cyIsImNudENoYXJzIiwic3RyIiwibGVuIiwiY250IiwiaSIsImNoYXJBdCIsImNhbGNEaXN0YW5jZSIsInNUZXh0MSIsInNUZXh0MiIsInMxbGVuIiwibGVuZ3RoIiwiczJsZW4iLCJtaW4iLCJNYXRoIiwiYWJzIiwiZGlzdCIsImphcm9XaW5rbGVyRGlzdGFuY2UiLCJjbnQxIiwiY250MiIsImV4cG9ydHMiLCJjYWxjRGlzdGFuY2VMZXZlbiIsImNhbGNEaXN0IiwibGVuZ3RoRGVsdGExIiwiYTAiLCJsZXZlbnNodGVpbiIsInN1YnN0cmluZyIsImVuYWJsZWQiLCJhIiwiSUZNYXRjaCIsImxldmVuUGVuYWx0eU9sZCIsImxldmVuUGVuYWx0eSIsIm5vblByaXZhdGVLZXlzIiwib0EiLCJrZXlzIiwiZmlsdGVyIiwia2V5IiwiY291bnRBaW5CIiwib0IiLCJmbkNvbXBhcmUiLCJhS2V5SWdub3JlIiwiQXJyYXkiLCJpc0FycmF5IiwiaW5kZXhPZiIsInJlZHVjZSIsInByZXYiLCJwcm90b3R5cGUiLCJoYXNPd25Qcm9wZXJ0eSIsImNhbGwiLCJzcHVyaW91c0Fub3RJbkIiLCJsb3dlckNhc2UiLCJvIiwidG9Mb3dlckNhc2UiLCJjb21wYXJlQ29udGV4dCIsImVxdWFsIiwiYiIsImRpZmZlcmVudCIsInNwdXJpb3VzTCIsInNwdXJpb3VzUiIsInNvcnRCeVJhbmsiLCJyIiwiX3JhbmtpbmciLCJjYXRlZ29yeSIsImxvY2FsZUNvbXBhcmUiLCJtYXRjaGVkU3RyaW5nIiwiY2hlY2tPbmVSdWxlIiwic3RyaW5nIiwibGNTdHJpbmciLCJleGFjdCIsInJlcyIsIm9SdWxlIiwiY250UmVjIiwiSlNPTiIsInN0cmluZ2lmeSIsInR5cGUiLCJsb3dlcmNhc2V3b3JkIiwiRXJyb3IiLCJ1bmRlZmluZWQiLCJ3b3JkIiwicHVzaCIsImV4YWN0T25seSIsImxldmVubWF0Y2giLCJDdXRvZmZfV29yZE1hdGNoIiwiYWRkQ250UmVjIiwicmVjIiwidG9GaXhlZCIsIm0iLCJyZWdleHAiLCJleGVjIiwibWF0Y2hJbmRleCIsIm1lbWJlciIsIm51bWJlciIsImNhdGVnb3JpemVTdHJpbmciLCJvUnVsZXMiLCJmb3JFYWNoIiwic29ydCIsInBvc3RGaWx0ZXIiLCJiZXN0UmFuayIsIm1hcCIsImpvaW4iLCJyZXN4IiwiaW5kZXgiLCJkZWx0YSIsImNhdGVnb3JpemVTdHJpbmcyIiwicnVsZXMiLCJ3b3JkTWFwIiwibm9uV29yZFJ1bGVzIiwiYWxsUnVsZXMiLCJtYXRjaFdvcmQiLCJjb250ZXh0Iiwib3B0aW9ucyIsInMxIiwiczIiLCJmb2xsb3dzIiwibWF0Y2hvdGhlcnMiLCJjIiwiYXNzaWduIiwib3ZlcnJpZGUiLCJfd2VpZ2h0IiwiZnJlZXplIiwiZXh0cmFjdEFyZ3NNYXAiLCJtYXRjaCIsImFyZ3NNYXAiLCJpS2V5IiwidmFsdWUiLCJSYW5rV29yZCIsImhhc0Fib3ZlIiwibHN0IiwiYm9yZGVyIiwiZXZlcnkiLCJvTWVtYmVyIiwidGFrZUZpcnN0TiIsIm4iLCJpSW5kZXgiLCJsYXN0UmFua2luZyIsInRha2VBYm92ZSIsImNhdGVnb3JpemVXb3JkV2l0aFJhbmtDdXRvZmYiLCJzV29yZEdyb3VwIiwic3BsaXRSdWxlcyIsInNlZW5JdCIsIlRvcF9OX1dvcmRDYXRlZ29yaXphdGlvbnMiLCJmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWRTZW50ZW5jZSIsIm9TZW50ZW5jZSIsIm9Xb3JkR3JvdXAiLCJmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWQiLCJhcnIiLCJjYXRlZ29yaXplQVdvcmQiLCJzZW50ZW5jZSIsIndvcmRzIiwiZGVlcEZyZWV6ZSIsImNsb25lRGVlcCIsImFuYWx5emVTdHJpbmciLCJzU3RyaW5nIiwiZmFjIiwidSIsImJyZWFrZG93blN0cmluZyIsIk1heFNwYWNlc1BlckNvbWJpbmVkV29yZCIsImFCcmVha0Rvd25TZW50ZW5jZSIsImNhdGVnb3JpemVkU2VudGVuY2UiLCJpc1ZhbGlkIiwiY2xvbmUiLCJjb3B5VmVjTWVtYmVycyIsImV4cGFuZE1hdGNoQXJyIiwiZGVlcCIsImxpbmUiLCJ1QnJlYWtEb3duTGluZSIsImFXb3JkR3JvdXAiLCJ3Z0luZGV4Iiwib1dvcmRWYXJpYW50IiwiaVdWSW5kZXgiLCJudmVjcyIsInZlY3MiLCJydmVjIiwiayIsIm5leHRCYXNlIiwibCIsInNsaWNlIiwiY29uY2F0IiwicmVpbmZvcmNlRGlzdFdlaWdodCIsImFSZWluZm9yY2VEaXN0V2VpZ2h0IiwiZXh0cmFjdENhdGVnb3J5TWFwIiwib1dvcmQiLCJDQVRfQ0FURUdPUlkiLCJwb3MiLCJyZWluRm9yY2VTZW50ZW5jZSIsIm9DYXRlZ29yeU1hcCIsIm9Qb3NpdGlvbiIsInJlaW5mb3JjZSIsImJvb3N0IiwiU2VudGVuY2UiLCJyZWluRm9yY2UiLCJhQ2F0ZWdvcml6ZWRBcnJheSIsImNtcFJhbmtpbmdQcm9kdWN0IiwicmFua2luZ1Byb2R1Y3QiLCJtYXRjaFJlZ0V4cCIsInNLZXkiLCJyZWciLCJvRXh0cmFjdGVkQ29udGV4dCIsInNvcnRCeVdlaWdodCIsIm9Db250ZXh0QSIsIm9Db250ZXh0QiIsInJhbmtpbmdBIiwicGFyc2VGbG9hdCIsInJhbmtpbmdCIiwid2VpZ2h0QSIsIndlaWdodEIiLCJhdWdtZW50Q29udGV4dDEiLCJpUnVsZSIsIm9yZXMiLCJiaW5kIiwiYXVnbWVudENvbnRleHQiLCJhUnVsZXMiLCJvcHRpb25zMSIsImFSZXMiLCJvcHRpb25zMiIsImluc2VydE9yZGVyZWQiLCJyZXN1bHQiLCJpSW5zZXJ0ZWRNZW1iZXIiLCJsaW1pdCIsInRha2VUb3BOIiwiaW5uZXJBcnIiLCJpQXJyIiwidG9wIiwic2hpZnQiLCJpbnB1dEZpbHRlclJ1bGVzIiwicm0iLCJnZXRSTU9uY2UiLCJnZXRSdWxlTWFwIiwiYXBwbHlSdWxlcyIsImJlc3ROIiwib0tleU9yZGVyIiwiYmVzdE5leHQiLCJvQ29udGV4dCIsImFwcGx5UnVsZXNQaWNrRmlyc3QiLCJkZWNpZGVPblJlUXVlcnkiXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7Ozs7Ozs7Ozs7Ozs7Ozs7QUFnQkE7O0FBQ0EsSUFBWUEsV0FBUUMsUUFBTSw2QkFBTixDQUFwQjtBQUVBLElBQVlDLFNBQU1ELFFBQU0saUJBQU4sQ0FBbEI7QUFFQSxJQUFNRSxTQUFTRCxPQUFPQyxNQUFQLENBQWMsYUFBZCxDQUFmO0FBRUEsSUFBWUMsUUFBS0gsUUFBTSxPQUFOLENBQWpCO0FBQ0EsSUFBSUksWUFBWUQsTUFBTSxNQUFOLENBQWhCO0FBRUEsSUFBWUUsUUFBS0wsUUFBTSxnQkFBTixDQUFqQjtBQUdBLElBQVlNLFFBQUtOLFFBQU0sU0FBTixDQUFqQjtBQUlBLElBQVlPLFlBQVNQLFFBQU0sYUFBTixDQUFyQjtBQUVBLElBQU1RLFlBQWlCQyxNQUF2QjtBQUVBLElBQU1DLFdBQVdQLE1BQU0sYUFBTixDQUFqQjtBQUNBLElBQU1RLFlBQVlSLE1BQU0sY0FBTixDQUFsQjtBQUNBLElBQU1TLFlBQVlULE1BQU0sY0FBTixDQUFsQjtBQUlBLElBQVlVLFlBQVNiLFFBQU0sYUFBTixDQUFyQjtBQUNBLElBQUljLGFBQWFELFVBQVVDLFVBQTNCO0FBRUEsU0FBQUMsUUFBQSxDQUFrQkMsR0FBbEIsRUFBZ0NDLEdBQWhDLEVBQTRDO0FBQzFDLFFBQUlDLE1BQU0sQ0FBVjtBQUNBLFNBQUksSUFBSUMsSUFBSSxDQUFaLEVBQWVBLElBQUlGLEdBQW5CLEVBQXdCLEVBQUVFLENBQTFCLEVBQTZCO0FBQzNCRCxlQUFRRixJQUFJSSxNQUFKLENBQVdELENBQVgsTUFBa0IsR0FBbkIsR0FBeUIsQ0FBekIs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OUM7QUFDQUYsY0FBTXZJLE9BQU4sQ0FBYyxVQUFVMEksUUFBVixFQUFtQztBQUMvQyxnQkFBSUEsU0FBU3JDLElBQVQsQ0FBSixFQUFvQjtBQUNsQnZNLHlCQUFTLDJCQUEyQnVNLElBQXBDO0FBQ0Esb0JBQUk5SCxNQUFNNkksZUFBZXNCLFFBQWYsRUFBeUJOLFlBQVkvQixJQUFaLEtBQXFCLEVBQTlDLENBQVY7QUFDQXZNLHlCQUFTLG1CQUFtQnVNLElBQW5CLEdBQTBCLEtBQTFCLEdBQWtDM0gsS0FBS0MsU0FBTCxDQUFlSixHQUFmLEVBQW9CUSxTQUFwQixFQUErQixDQUEvQixDQUEzQztBQUNBMEoseUJBQVN4SixJQUFULENBQWNWLE9BQU8sRUFBckI7QUFDRCxhQUxELE1BS087QUFDTDtBQUNBa0sseUJBQVN4SixJQUFULENBQWMsQ0FBQ3lKLFFBQUQsQ0FBZDtBQUNEO0FBQ0YsU0FWRDtBQVdBSCxnQkFBUVYsU0FBU1ksUUFBVCxDQUFSO0FBQ0QsS0FkRDtBQWVBLFdBQU9GLEtBQVA7QUFDRDtBQWxCZWpOLFFBQUFnTixVQUFBLEdBQVVBLFVBQVY7QUFxQmhCLFNBQUFLLG1CQUFBLENBQW9DNUgsT0FBcEMsRUFBNEQ7QUFDMUQsUUFBSWpELElBQUl3SyxXQUFXdkgsT0FBWCxDQUFSO0FBQ0EsV0FBT2pELEtBQUtBLEVBQUUsQ0FBRixDQUFaO0FBQ0Q7QUFIZXhDLFFBQUFxTixtQkFBQSxHQUFtQkEsbUJBQW5CO0FBS2hCOzs7QUFHQSxTQUFBQyxlQUFBLENBQWdDN0gsT0FBaEMsRUFBd0Q7QUFDdEQsV0FBTyxFQUFQO0FBQ0Q7QUFGZXpGLFFBQUFzTixlQUFBLEdBQWVBLGVBQWYiLCJmaWxlIjoibWF0Y2gvaW5wdXRGaWx0ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcbi8qKlxuICogdGhlIGlucHV0IGZpbHRlciBzdGFnZSBwcmVwcm9jZXNzZXMgYSBjdXJyZW50IGNvbnRleHRcbiAqXG4gKiBJdCBhKSBjb21iaW5lcyBtdWx0aS1zZWdtZW50IGFyZ3VtZW50cyBpbnRvIG9uZSBjb250ZXh0IG1lbWJlcnNcbiAqIEl0IGIpIGF0dGVtcHRzIHRvIGF1Z21lbnQgdGhlIGNvbnRleHQgYnkgYWRkaXRpb25hbCBxdWFsaWZpY2F0aW9uc1xuICogICAgICAgICAgIChNaWQgdGVybSBnZW5lcmF0aW5nIEFsdGVybmF0aXZlcywgZS5nLlxuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHVuaXQgdGVzdD9cbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiBzb3VyY2UgP1xuICogICAgICAgICAgIClcbiAqICBTaW1wbGUgcnVsZXMgbGlrZSAgSW50ZW50XG4gKlxuICpcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmlucHV0RmlsdGVyXG4gKiBAZmlsZSBpbnB1dEZpbHRlci50c1xuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxuICovXG4vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9saWIvbm9kZS00LmQudHNcIiAvPlxudmFyIGRpc3RhbmNlID0gcmVxdWlyZSgnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluJyk7XG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi4vdXRpbHMvbG9nZ2VyJyk7XG52YXIgbG9nZ2VyID0gTG9nZ2VyLmxvZ2dlcignaW5wdXRGaWx0ZXInKTtcbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJyk7XG52YXIgZGVidWdwZXJmID0gZGVidWcoJ3BlcmYnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzL3V0aWxzJyk7XG52YXIgQWxnb2wgPSByZXF1aXJlKCcuL2FsZ29sJyk7XG52YXIgYnJlYWtkb3duID0gcmVxdWlyZSgnLi9icmVha2Rvd24nKTtcbnZhciBBbnlPYmplY3QgPSBPYmplY3Q7XG52YXIgZGVidWdsb2cgPSBkZWJ1ZygnaW5wdXRGaWx0ZXInKTtcbnZhciBkZWJ1Z2xvZ1YgPSBkZWJ1ZygnaW5wdXRWRmlsdGVyJyk7XG52YXIgZGVidWdsb2dNID0gZGVidWcoJ2lucHV0TUZpbHRlcicpO1xudmFyIG1hdGNoZGF0YSA9IHJlcXVpcmUoJy4vbWF0Y2hkYXRhJyk7XG52YXIgb1VuaXRUZXN0cyA9IG1hdGNoZGF0YS5vVW5pdFRlc3RzO1xuZnVuY3Rpb24gY250Q2hhcnMoc3RyLCBsZW4pIHtcbiAgICB2YXIgY250ID0gMDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgIGNudCArPSAoc3RyLmNoYXJBdChpKSA9PT0gJ1gnKSA/IDEgOiAwO1xuICAgIH1cbiAgICByZXR1cm4gY250O1xufVxuLyoqXG4gKiBAcGFyYW0gc1RleHQge3N0cmluZ30gdGhlIHRleHQgdG8gbWF0Y2ggdG8gTmF2VGFyZ2V0UmVzb2x1dGlvblxuICogQHBhcmFtIHNUZXh0MiB7c3RyaW5nfSB0aGUgcXVlcnkgdGV4dCwgZS5nLiBOYXZUYXJnZXRcbiAqXG4gKiBAcmV0dXJuIHRoZSBkaXN0YW5jZSwgbm90ZSB0aGF0IGlzIGlzICpub3QqIHN5bW1ldHJpYyFcbiAqL1xuZnVuY3Rpb24gY2FsY0Rpc3RhbmNlKHNUZXh0MSwgc1RleHQyKSB7XG4gICAgLy8gY29uc29sZS5sb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxuICAgIHZhciBzMWxlbiA9IHNUZXh0MS5sZW5ndGg7XG4gICAgdmFyIHMybGVuID0gc1RleHQyLmxlbmd0aDtcbiAgICB2YXIgbWluID0gTWF0aC5taW4oczFsZW4sIHMybGVuKTtcbiAgICBpZiAoTWF0aC5hYnMoczFsZW4gLSBzMmxlbikgPiBNYXRoLm1pbihzMWxlbiwgczJsZW4pKSB7XG4gICAgICAgIHJldHVybiAwLjM7XG4gICAgfVxuICAgIHZhciBkaXN0ID0gZGlzdGFuY2UuamFyb1dpbmtsZXJEaXN0YW5jZShzVGV4dDEsIHNUZXh0Mik7XG4gICAgdmFyIGNudDEgPSBjbnRDaGFycyhzVGV4dDEsIHMxbGVuKTtcbiAgICB2YXIgY250MiA9IGNudENoYXJzKHNUZXh0MiwgczJsZW4pO1xuICAgIGlmIChjbnQxICE9PSBjbnQyKSB7XG4gICAgICAgIGRpc3QgPSBkaXN0ICogMC43O1xuICAgIH1cbiAgICByZXR1cm4gZGlzdDtcbiAgICAvKlxuICAgIHZhciBhMCA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCksIHNUZXh0MilcbiAgICBpZihkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xuICAgICAgZGVidWdsb2dWKFwiZGlzdGFuY2VcIiArIGEwICsgXCJzdHJpcHBlZD5cIiArIHNUZXh0MS5zdWJzdHJpbmcoMCxzVGV4dDIubGVuZ3RoKSArIFwiPD5cIiArIHNUZXh0MisgXCI8XCIpO1xuICAgIH1cbiAgICBpZihhMCAqIDUwID4gMTUgKiBzVGV4dDIubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiA0MDAwMDtcbiAgICB9XG4gICAgdmFyIGEgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEsIHNUZXh0MilcbiAgICByZXR1cm4gYTAgKiA1MDAgLyBzVGV4dDIubGVuZ3RoICsgYVxuICAgICovXG59XG5leHBvcnRzLmNhbGNEaXN0YW5jZSA9IGNhbGNEaXN0YW5jZTtcbi8qKlxuICogQHBhcmFtIHNUZXh0IHtzdHJpbmd9IHRoZSB0ZXh0IHRvIG1hdGNoIHRvIE5hdlRhcmdldFJlc29sdXRpb25cbiAqIEBwYXJhbSBzVGV4dDIge3N0cmluZ30gdGhlIHF1ZXJ5IHRleHQsIGUuZy4gTmF2VGFyZ2V0XG4gKlxuICogQHJldHVybiB0aGUgZGlzdGFuY2UsIG5vdGUgdGhhdCBpcyBpcyAqbm90KiBzeW1tZXRyaWMhXG4gKi9cbmZ1bmN0aW9uIGNhbGNEaXN0YW5jZUxldmVuKHNUZXh0MSwgc1RleHQyKSB7XG4gICAgLy8gY29uc29sZS5sb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxuICAgIGlmICgoKHNUZXh0MS5sZW5ndGggLSBzVGV4dDIubGVuZ3RoKSA+IEFsZ29sLmNhbGNEaXN0Lmxlbmd0aERlbHRhMSlcbiAgICAgICAgfHwgKHNUZXh0Mi5sZW5ndGggPiAxLjUgKiBzVGV4dDEubGVuZ3RoKVxuICAgICAgICB8fCAoc1RleHQyLmxlbmd0aCA8IChzVGV4dDEubGVuZ3RoIC8gMikpKSB7XG4gICAgICAgIHJldHVybiA1MDAwMDtcbiAgICB9XG4gICAgdmFyIGEwID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnN1YnN0cmluZygwLCBzVGV4dDIubGVuZ3RoKSwgc1RleHQyKTtcbiAgICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2dWKFwiZGlzdGFuY2VcIiArIGEwICsgXCJzdHJpcHBlZD5cIiArIHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCkgKyBcIjw+XCIgKyBzVGV4dDIgKyBcIjxcIik7XG4gICAgfVxuICAgIGlmIChhMCAqIDUwID4gMTUgKiBzVGV4dDIubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiA0MDAwMDtcbiAgICB9XG4gICAgdmFyIGEgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEsIHNUZXh0Mik7XG4gICAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGE7XG59XG5leHBvcnRzLmNhbGNEaXN0YW5jZUxldmVuID0gY2FsY0Rpc3RhbmNlTGV2ZW47XG52YXIgSUZNYXRjaCA9IHJlcXVpcmUoJy4uL21hdGNoL2lmbWF0Y2gnKTtcbi8vY29uc3QgbGV2ZW5DdXRvZmYgPSBBbGdvbC5DdXRvZmZfTGV2ZW5TaHRlaW47XG5mdW5jdGlvbiBsZXZlblBlbmFsdHlPbGQoaSkge1xuICAgIC8vIDAtPiAxXG4gICAgLy8gMSAtPiAwLjFcbiAgICAvLyAxNTAgLT4gIDAuOFxuICAgIGlmIChpID09PSAwKSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgIH1cbiAgICAvLyByZXZlcnNlIG1heSBiZSBiZXR0ZXIgdGhhbiBsaW5lYXJcbiAgICByZXR1cm4gMSArIGkgKiAoMC44IC0gMSkgLyAxNTA7XG59XG5leHBvcnRzLmxldmVuUGVuYWx0eU9sZCA9IGxldmVuUGVuYWx0eU9sZDtcbmZ1bmN0aW9uIGxldmVuUGVuYWx0eShpKSB7XG4gICAgLy8gMSAtPiAxXG4gICAgLy8gY3V0T2ZmID0+IDAuOFxuICAgIHJldHVybiBpO1xuICAgIC8vcmV0dXJuICAgMSAtICAoMSAtIGkpICowLjIvQWxnb2wuQ3V0b2ZmX1dvcmRNYXRjaDtcbn1cbmV4cG9ydHMubGV2ZW5QZW5hbHR5ID0gbGV2ZW5QZW5hbHR5O1xuZnVuY3Rpb24gbm9uUHJpdmF0ZUtleXMob0EpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMob0EpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHJldHVybiBrZXlbMF0gIT09ICdfJztcbiAgICB9KTtcbn1cbmZ1bmN0aW9uIGNvdW50QWluQihvQSwgb0IsIGZuQ29tcGFyZSwgYUtleUlnbm9yZSkge1xuICAgIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gYUtleUlnbm9yZSA6XG4gICAgICAgIHR5cGVvZiBhS2V5SWdub3JlID09PSBcInN0cmluZ1wiID8gW2FLZXlJZ25vcmVdIDogW107XG4gICAgZm5Db21wYXJlID0gZm5Db21wYXJlIHx8IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH07XG4gICAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xuICAgIH0pLlxuICAgICAgICByZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9CLCBrZXkpKSB7XG4gICAgICAgICAgICBwcmV2ID0gcHJldiArIChmbkNvbXBhcmUob0Fba2V5XSwgb0Jba2V5XSwga2V5KSA/IDEgOiAwKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbn1cbmV4cG9ydHMuY291bnRBaW5CID0gY291bnRBaW5CO1xuZnVuY3Rpb24gc3B1cmlvdXNBbm90SW5CKG9BLCBvQiwgYUtleUlnbm9yZSkge1xuICAgIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gYUtleUlnbm9yZSA6XG4gICAgICAgIHR5cGVvZiBhS2V5SWdub3JlID09PSBcInN0cmluZ1wiID8gW2FLZXlJZ25vcmVdIDogW107XG4gICAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xuICAgIH0pLlxuICAgICAgICByZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xuICAgICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xuICAgICAgICAgICAgcHJldiA9IHByZXYgKyAxO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIDApO1xufVxuZXhwb3J0cy5zcHVyaW91c0Fub3RJbkIgPSBzcHVyaW91c0Fub3RJbkI7XG5mdW5jdGlvbiBsb3dlckNhc2Uobykge1xuICAgIGlmICh0eXBlb2YgbyA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICByZXR1cm4gby50b0xvd2VyQ2FzZSgpO1xuICAgIH1cbiAgICByZXR1cm4gbztcbn1cbmZ1bmN0aW9uIGNvbXBhcmVDb250ZXh0KG9BLCBvQiwgYUtleUlnbm9yZSkge1xuICAgIHZhciBlcXVhbCA9IGNvdW50QWluQihvQSwgb0IsIGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBsb3dlckNhc2UoYSkgPT09IGxvd2VyQ2FzZShiKTsgfSwgYUtleUlnbm9yZSk7XG4gICAgdmFyIGRpZmZlcmVudCA9IGNvdW50QWluQihvQSwgb0IsIGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBsb3dlckNhc2UoYSkgIT09IGxvd2VyQ2FzZShiKTsgfSwgYUtleUlnbm9yZSk7XG4gICAgdmFyIHNwdXJpb3VzTCA9IHNwdXJpb3VzQW5vdEluQihvQSwgb0IsIGFLZXlJZ25vcmUpO1xuICAgIHZhciBzcHVyaW91c1IgPSBzcHVyaW91c0Fub3RJbkIob0IsIG9BLCBhS2V5SWdub3JlKTtcbiAgICByZXR1cm4ge1xuICAgICAgICBlcXVhbDogZXF1YWwsXG4gICAgICAgIGRpZmZlcmVudDogZGlmZmVyZW50LFxuICAgICAgICBzcHVyaW91c0w6IHNwdXJpb3VzTCxcbiAgICAgICAgc3B1cmlvdXNSOiBzcHVyaW91c1JcbiAgICB9O1xufVxuZXhwb3J0cy5jb21wYXJlQ29udGV4dCA9IGNvbXBhcmVDb250ZXh0O1xuZnVuY3Rpb24gc29ydEJ5UmFuayhhLCBiKSB7XG4gICAgdmFyIHIgPSAtKChhLl9yYW5raW5nIHx8IDEuMCkgLSAoYi5fcmFua2luZyB8fCAxLjApKTtcbiAgICBpZiAocikge1xuICAgICAgICByZXR1cm4gcjtcbiAgICB9XG4gICAgaWYgKGEuY2F0ZWdvcnkgJiYgYi5jYXRlZ29yeSkge1xuICAgICAgICByID0gYS5jYXRlZ29yeS5sb2NhbGVDb21wYXJlKGIuY2F0ZWdvcnkpO1xuICAgICAgICBpZiAocikge1xuICAgICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKGEubWF0Y2hlZFN0cmluZyAmJiBiLm1hdGNoZWRTdHJpbmcpIHtcbiAgICAgICAgciA9IGEubWF0Y2hlZFN0cmluZy5sb2NhbGVDb21wYXJlKGIubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgIGlmIChyKSB7XG4gICAgICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gMDtcbn1cbmZ1bmN0aW9uIGNoZWNrT25lUnVsZShzdHJpbmcsIGxjU3RyaW5nLCBleGFjdCwgcmVzLCBvUnVsZSwgY250UmVjKSB7XG4gICAgaWYgKGRlYnVnbG9nVi5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nVignYXR0ZW1wdGluZyB0byBtYXRjaCBydWxlICcgKyBKU09OLnN0cmluZ2lmeShvUnVsZSkgKyBcIiB0byBzdHJpbmcgXFxcIlwiICsgc3RyaW5nICsgXCJcXFwiXCIpO1xuICAgIH1cbiAgICBzd2l0Y2ggKG9SdWxlLnR5cGUpIHtcbiAgICAgICAgY2FzZSAwIC8qIFdPUkQgKi86XG4gICAgICAgICAgICBpZiAoIW9SdWxlLmxvd2VyY2FzZXdvcmQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3J1bGUgd2l0aG91dCBhIGxvd2VyY2FzZSB2YXJpYW50JyArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDtcbiAgICAgICAgICAgIGlmIChleGFjdCAmJiBvUnVsZS53b3JkID09PSBzdHJpbmcgfHwgb1J1bGUubG93ZXJjYXNld29yZCA9PT0gbGNTdHJpbmcpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcIlxcbiFtYXRjaGVkIGV4YWN0IFwiICsgc3RyaW5nICsgXCI9XCIgKyBvUnVsZS5sb3dlcmNhc2V3b3JkICsgXCIgPT4gXCIgKyBvUnVsZS5tYXRjaGVkU3RyaW5nICsgXCIvXCIgKyBvUnVsZS5jYXRlZ29yeSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFleGFjdCAmJiAhb1J1bGUuZXhhY3RPbmx5KSB7XG4gICAgICAgICAgICAgICAgdmFyIGxldmVubWF0Y2ggPSBjYWxjRGlzdGFuY2Uob1J1bGUubG93ZXJjYXNld29yZCwgbGNTdHJpbmcpO1xuICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VcIiwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGxldmVubWF0Y2ggPCA1MCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VFeHBcIiwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYobGV2ZW5tYXRjaCA8IDQwMDAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYyxcImNhbGNEaXN0YW5jZUJlbG93NDBrXCIsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgLy9pZihvUnVsZS5sb3dlcmNhc2V3b3JkID09PSBcImNvc21vc1wiKSB7XG4gICAgICAgICAgICAgICAgLy8gIGNvbnNvbGUubG9nKFwiaGVyZSByYW5raW5nIFwiICsgbGV2ZW5tYXRjaCArIFwiIFwiICsgb1J1bGUubG93ZXJjYXNld29yZCArIFwiIFwiICsgbGNTdHJpbmcpO1xuICAgICAgICAgICAgICAgIC8vfVxuICAgICAgICAgICAgICAgIGlmIChsZXZlbm1hdGNoID49IEFsZ29sLkN1dG9mZl9Xb3JkTWF0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYywgXCJjYWxjRGlzdGFuY2VPa1wiLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlYyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiAob1J1bGUuX3JhbmtpbmcgfHwgMS4wKSAqIGxldmVuUGVuYWx0eShsZXZlbm1hdGNoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldmVubWF0Y2g6IGxldmVubWF0Y2hcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlYnVnbG9nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcIlxcbiFmdXp6eSBcIiArIChsZXZlbm1hdGNoKS50b0ZpeGVkKDMpICsgXCIgXCIgKyByZWMuX3JhbmtpbmcudG9GaXhlZCgzKSArIFwiICBcIiArIHN0cmluZyArIFwiPVwiICsgb1J1bGUubG93ZXJjYXNld29yZCArIFwiID0+IFwiICsgb1J1bGUubWF0Y2hlZFN0cmluZyArIFwiL1wiICsgb1J1bGUuY2F0ZWdvcnkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKHJlYyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMSAvKiBSRUdFWFAgKi86XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoXCIgaGVyZSByZWdleHBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBtID0gb1J1bGUucmVnZXhwLmV4ZWMoc3RyaW5nKTtcbiAgICAgICAgICAgICAgICBpZiAobSkge1xuICAgICAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IChvUnVsZS5tYXRjaEluZGV4ICE9PSB1bmRlZmluZWQgJiYgbVtvUnVsZS5tYXRjaEluZGV4XSkgfHwgc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInVua25vd24gdHlwZVwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUsIHVuZGVmaW5lZCwgMikpO1xuICAgIH1cbn1cbmV4cG9ydHMuY2hlY2tPbmVSdWxlID0gY2hlY2tPbmVSdWxlO1xuO1xuZnVuY3Rpb24gYWRkQ250UmVjKGNudFJlYywgbWVtYmVyLCBudW1iZXIpIHtcbiAgICBpZiAoKCFjbnRSZWMpIHx8IChudW1iZXIgPT09IDApKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY250UmVjW21lbWJlcl0gPSAoY250UmVjW21lbWJlcl0gfHwgMCkgKyBudW1iZXI7XG59XG5mdW5jdGlvbiBjYXRlZ29yaXplU3RyaW5nKHdvcmQsIGV4YWN0LCBvUnVsZXMsIGNudFJlYykge1xuICAgIC8vIHNpbXBseSBhcHBseSBhbGwgcnVsZXNcbiAgICBpZiAoZGVidWdsb2dNLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2dNKFwicnVsZXMgOiBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHZhciBsY1N0cmluZyA9IHdvcmQudG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgb1J1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgIGNoZWNrT25lUnVsZSh3b3JkLCBsY1N0cmluZywgZXhhY3QsIHJlcywgb1J1bGUsIGNudFJlYyk7XG4gICAgfSk7XG4gICAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZVN0cmluZyA9IGNhdGVnb3JpemVTdHJpbmc7XG5mdW5jdGlvbiBwb3N0RmlsdGVyKHJlcykge1xuICAgIHJlcy5zb3J0KHNvcnRCeVJhbmspO1xuICAgIHZhciBiZXN0UmFuayA9IDA7XG4gICAgLy9jb25zb2xlLmxvZyhcIlxcbnBpbHRlcmVkIFwiICsgSlNPTi5zdHJpbmdpZnkocmVzKSk7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCIgcHJlRmlsdGVyIDogXFxuXCIgKyByZXMubWFwKGZ1bmN0aW9uICh3b3JkKSB7XG4gICAgICAgICAgICByZXR1cm4gXCIgXCIgKyB3b3JkLl9yYW5raW5nICsgXCIgID0+IFxcXCJcIiArIHdvcmQuY2F0ZWdvcnkgKyBcIlxcXCIgXCIgKyB3b3JkLm1hdGNoZWRTdHJpbmcgKyBcIiBcXG5cIjtcbiAgICAgICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgfVxuICAgIHZhciByID0gcmVzLmZpbHRlcihmdW5jdGlvbiAocmVzeCwgaW5kZXgpIHtcbiAgICAgICAgaWYgKGluZGV4ID09PSAwKSB7XG4gICAgICAgICAgICBiZXN0UmFuayA9IHJlc3guX3Jhbmtpbmc7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyAxLTAuOSA9IDAuMVxuICAgICAgICAvLyAxLSAwLjkzID0gMC43XG4gICAgICAgIC8vIDEvN1xuICAgICAgICB2YXIgZGVsdGEgPSBiZXN0UmFuayAvIHJlc3guX3Jhbmtpbmc7XG4gICAgICAgIGlmICgocmVzeC5tYXRjaGVkU3RyaW5nID09PSByZXNbaW5kZXggLSAxXS5tYXRjaGVkU3RyaW5nKVxuICAgICAgICAgICAgJiYgKHJlc3guY2F0ZWdvcnkgPT09IHJlc1tpbmRleCAtIDFdLmNhdGVnb3J5KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJcXG4gZGVsdGEgZm9yIFwiICsgZGVsdGEgKyBcIiAgXCIgKyByZXN4Ll9yYW5raW5nKTtcbiAgICAgICAgaWYgKHJlc3gubGV2ZW5tYXRjaCAmJiAoZGVsdGEgPiAxLjAzKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKChcIlxcbmZpbHRlcmVkIFwiICsgci5sZW5ndGggKyBcIi9cIiArIHJlcy5sZW5ndGgpICsgSlNPTi5zdHJpbmdpZnkocikpO1xuICAgIH1cbiAgICByZXR1cm4gcjtcbn1cbmV4cG9ydHMucG9zdEZpbHRlciA9IHBvc3RGaWx0ZXI7XG5mdW5jdGlvbiBjYXRlZ29yaXplU3RyaW5nMih3b3JkLCBleGFjdCwgcnVsZXMsIGNudFJlYykge1xuICAgIC8vIHNpbXBseSBhcHBseSBhbGwgcnVsZXNcbiAgICBpZiAoZGVidWdsb2dNLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2dNKFwicnVsZXMgOiBcIiArIEpTT04uc3RyaW5naWZ5KHJ1bGVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgdmFyIGxjU3RyaW5nID0gd29yZC50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBpZiAoZXhhY3QpIHtcbiAgICAgICAgdmFyIHIgPSBydWxlcy53b3JkTWFwW2xjU3RyaW5nXTtcbiAgICAgICAgaWYgKHIpIHtcbiAgICAgICAgICAgIHIuZm9yRWFjaChmdW5jdGlvbiAob1J1bGUpIHtcbiAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIHN0cmluZzogd29yZCxcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICBfcmFua2luZzogb1J1bGUuX3JhbmtpbmcgfHwgMS4wXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBydWxlcy5ub25Xb3JkUnVsZXMuZm9yRWFjaChmdW5jdGlvbiAob1J1bGUpIHtcbiAgICAgICAgICAgIGNoZWNrT25lUnVsZSh3b3JkLCBsY1N0cmluZywgZXhhY3QsIHJlcywgb1J1bGUsIGNudFJlYyk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgZGVidWdsb2coXCJjYXRlZ29yaXplIG5vbiBleGFjdFwiICsgd29yZCArIFwiIHh4ICBcIiArIHJ1bGVzLmFsbFJ1bGVzLmxlbmd0aCk7XG4gICAgICAgIHJldHVybiBwb3N0RmlsdGVyKGNhdGVnb3JpemVTdHJpbmcod29yZCwgZXhhY3QsIHJ1bGVzLmFsbFJ1bGVzLCBjbnRSZWMpKTtcbiAgICB9XG4gICAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZVN0cmluZzIgPSBjYXRlZ29yaXplU3RyaW5nMjtcbi8qKlxuICpcbiAqIE9wdGlvbnMgbWF5IGJlIHtcbiAqIG1hdGNob3RoZXJzIDogdHJ1ZSwgID0+IG9ubHkgcnVsZXMgd2hlcmUgYWxsIG90aGVycyBtYXRjaCBhcmUgY29uc2lkZXJlZFxuICogYXVnbWVudCA6IHRydWUsXG4gKiBvdmVycmlkZSA6IHRydWUgfSAgPT5cbiAqXG4gKi9cbmZ1bmN0aW9uIG1hdGNoV29yZChvUnVsZSwgY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChjb250ZXh0W29SdWxlLmtleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgczIgPSBvUnVsZS53b3JkLnRvTG93ZXJDYXNlKCk7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCwgb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xuICAgICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgYyA9IGNhbGNEaXN0YW5jZShzMiwgczEpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiIHMxIDw+IHMyIFwiICsgczEgKyBcIjw+XCIgKyBzMiArIFwiICA9PjogXCIgKyBjKTtcbiAgICB9XG4gICAgaWYgKGMgPiAwLjgwKSB7XG4gICAgICAgIHZhciByZXMgPSBBbnlPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKTtcbiAgICAgICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIGNvbnRleHQpO1xuICAgICAgICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xuICAgICAgICAgICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGZvcmNlIGtleSBwcm9wZXJ0eVxuICAgICAgICAvLyBjb25zb2xlLmxvZygnIG9iamVjdGNhdGVnb3J5JywgcmVzWydzeXN0ZW1PYmplY3RDYXRlZ29yeSddKTtcbiAgICAgICAgcmVzW29SdWxlLmtleV0gPSBvUnVsZS5mb2xsb3dzW29SdWxlLmtleV0gfHwgcmVzW29SdWxlLmtleV07XG4gICAgICAgIHJlcy5fd2VpZ2h0ID0gQW55T2JqZWN0LmFzc2lnbih7fSwgcmVzLl93ZWlnaHQpO1xuICAgICAgICByZXMuX3dlaWdodFtvUnVsZS5rZXldID0gYztcbiAgICAgICAgT2JqZWN0LmZyZWV6ZShyZXMpO1xuICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgZGVidWdsb2coJ0ZvdW5kIG9uZScgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5leHBvcnRzLm1hdGNoV29yZCA9IG1hdGNoV29yZDtcbmZ1bmN0aW9uIGV4dHJhY3RBcmdzTWFwKG1hdGNoLCBhcmdzTWFwKSB7XG4gICAgdmFyIHJlcyA9IHt9O1xuICAgIGlmICghYXJnc01hcCkge1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cbiAgICBPYmplY3Qua2V5cyhhcmdzTWFwKS5mb3JFYWNoKGZ1bmN0aW9uIChpS2V5KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IG1hdGNoW2lLZXldO1xuICAgICAgICB2YXIga2V5ID0gYXJnc01hcFtpS2V5XTtcbiAgICAgICAgaWYgKCh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpICYmIHZhbHVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJlc1trZXldID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5leHRyYWN0QXJnc01hcCA9IGV4dHJhY3RBcmdzTWFwO1xuZXhwb3J0cy5SYW5rV29yZCA9IHtcbiAgICBoYXNBYm92ZTogZnVuY3Rpb24gKGxzdCwgYm9yZGVyKSB7XG4gICAgICAgIHJldHVybiAhbHN0LmV2ZXJ5KGZ1bmN0aW9uIChvTWVtYmVyKSB7XG4gICAgICAgICAgICByZXR1cm4gKG9NZW1iZXIuX3JhbmtpbmcgPCBib3JkZXIpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIHRha2VGaXJzdE46IGZ1bmN0aW9uIChsc3QsIG4pIHtcbiAgICAgICAgcmV0dXJuIGxzdC5maWx0ZXIoZnVuY3Rpb24gKG9NZW1iZXIsIGlJbmRleCkge1xuICAgICAgICAgICAgdmFyIGxhc3RSYW5raW5nID0gMS4wO1xuICAgICAgICAgICAgaWYgKChpSW5kZXggPCBuKSB8fCBvTWVtYmVyLl9yYW5raW5nID09PSBsYXN0UmFua2luZykge1xuICAgICAgICAgICAgICAgIGxhc3RSYW5raW5nID0gb01lbWJlci5fcmFua2luZztcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICB0YWtlQWJvdmU6IGZ1bmN0aW9uIChsc3QsIGJvcmRlcikge1xuICAgICAgICByZXR1cm4gbHN0LmZpbHRlcihmdW5jdGlvbiAob01lbWJlcikge1xuICAgICAgICAgICAgcmV0dXJuIChvTWVtYmVyLl9yYW5raW5nID49IGJvcmRlcik7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG4vKlxudmFyIGV4YWN0TGVuID0gMDtcbnZhciBmdXp6eUxlbiA9IDA7XG52YXIgZnV6enlDbnQgPSAwO1xudmFyIGV4YWN0Q250ID0gMDtcbnZhciB0b3RhbENudCA9IDA7XG52YXIgdG90YWxMZW4gPSAwO1xudmFyIHJldGFpbmVkQ250ID0gMDtcblxuZXhwb3J0IGZ1bmN0aW9uIHJlc2V0Q250KCkge1xuICBleGFjdExlbiA9IDA7XG4gIGZ1enp5TGVuID0gMDtcbiAgZnV6enlDbnQgPSAwO1xuICBleGFjdENudCA9IDA7XG4gIHRvdGFsQ250ID0gMDtcbiAgdG90YWxMZW4gPSAwO1xuICByZXRhaW5lZENudCA9IDA7XG59XG4qL1xuZnVuY3Rpb24gY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZihzV29yZEdyb3VwLCBzcGxpdFJ1bGVzLCBjbnRSZWMpIHtcbiAgICB2YXIgc2Vlbkl0ID0gY2F0ZWdvcml6ZVN0cmluZzIoc1dvcmRHcm91cCwgdHJ1ZSwgc3BsaXRSdWxlcywgY250UmVjKTtcbiAgICAvL3RvdGFsQ250ICs9IDE7XG4gICAgLy8gZXhhY3RMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcbiAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Q2F0RXhhY3QnLCAxKTtcbiAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Q2F0RXhhY3RSZXMnLCBzZWVuSXQubGVuZ3RoKTtcbiAgICBpZiAoZXhwb3J0cy5SYW5rV29yZC5oYXNBYm92ZShzZWVuSXQsIDAuOCkpIHtcbiAgICAgICAgaWYgKGNudFJlYykge1xuICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYywgJ2V4YWN0UHJpb3JUYWtlJywgc2Vlbkl0Lmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgICAgc2Vlbkl0ID0gZXhwb3J0cy5SYW5rV29yZC50YWtlQWJvdmUoc2Vlbkl0LCAwLjgpO1xuICAgICAgICBpZiAoY250UmVjKSB7XG4gICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLCAnZXhhY3RBZnRlclRha2UnLCBzZWVuSXQubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc2Vlbkl0ID0gY2F0ZWdvcml6ZVN0cmluZzIoc1dvcmRHcm91cCwgZmFsc2UsIHNwbGl0UnVsZXMsIGNudFJlYyk7XG4gICAgICAgIGFkZENudFJlYyhjbnRSZWMsICdjbnROb25FeGFjdCcsIDEpO1xuICAgICAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Tm9uRXhhY3RSZXMnLCBzZWVuSXQubGVuZ3RoKTtcbiAgICB9XG4gICAgLy8gdG90YWxMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcbiAgICBzZWVuSXQgPSBleHBvcnRzLlJhbmtXb3JkLnRha2VGaXJzdE4oc2Vlbkl0LCBBbGdvbC5Ub3BfTl9Xb3JkQ2F0ZWdvcml6YXRpb25zKTtcbiAgICAvLyByZXRhaW5lZENudCArPSBzZWVuSXQubGVuZ3RoO1xuICAgIHJldHVybiBzZWVuSXQ7XG59XG5leHBvcnRzLmNhdGVnb3JpemVXb3JkV2l0aFJhbmtDdXRvZmYgPSBjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmO1xuLypcbmV4cG9ydCBmdW5jdGlvbiBkdW1wQ250KCkge1xuICBjb25zb2xlLmxvZyhgXG5leGFjdExlbiA9ICR7ZXhhY3RMZW59O1xuZXhhY3RDbnQgPSAke2V4YWN0Q250fTtcbmZ1enp5TGVuID0gJHtmdXp6eUxlbn07XG5mdXp6eUNudCA9ICR7ZnV6enlDbnR9O1xudG90YWxDbnQgPSAke3RvdGFsQ250fTtcbnRvdGFsTGVuID0gJHt0b3RhbExlbn07XG5yZXRhaW5lZExlbiA9ICR7cmV0YWluZWRDbnR9O1xuICBgKTtcbn1cbiovXG5mdW5jdGlvbiBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWRTZW50ZW5jZShvU2VudGVuY2UpIHtcbiAgICByZXR1cm4gb1NlbnRlbmNlLmV2ZXJ5KGZ1bmN0aW9uIChvV29yZEdyb3VwKSB7XG4gICAgICAgIHJldHVybiAob1dvcmRHcm91cC5sZW5ndGggPiAwKTtcbiAgICB9KTtcbn1cbmV4cG9ydHMuZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkU2VudGVuY2UgPSBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWRTZW50ZW5jZTtcbmZ1bmN0aW9uIGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZChhcnIpIHtcbiAgICByZXR1cm4gYXJyLmZpbHRlcihmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgIHJldHVybiBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWRTZW50ZW5jZShvU2VudGVuY2UpO1xuICAgIH0pO1xufVxuZXhwb3J0cy5maWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWQgPSBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWQ7XG5mdW5jdGlvbiBjYXRlZ29yaXplQVdvcmQoc1dvcmRHcm91cCwgcnVsZXMsIHNlbnRlbmNlLCB3b3JkcywgY250UmVjKSB7XG4gICAgdmFyIHNlZW5JdCA9IHdvcmRzW3NXb3JkR3JvdXBdO1xuICAgIGlmIChzZWVuSXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBzZWVuSXQgPSBjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmKHNXb3JkR3JvdXAsIHJ1bGVzLCBjbnRSZWMpO1xuICAgICAgICB1dGlscy5kZWVwRnJlZXplKHNlZW5JdCk7XG4gICAgICAgIHdvcmRzW3NXb3JkR3JvdXBdID0gc2Vlbkl0O1xuICAgIH1cbiAgICBpZiAoIXNlZW5JdCB8fCBzZWVuSXQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGxvZ2dlcihcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIFxcXCJcIiArIHNXb3JkR3JvdXAgKyBcIlxcXCIgaW4gc2VudGVuY2UgXFxcIlwiXG4gICAgICAgICAgICArIHNlbnRlbmNlICsgXCJcXFwiXCIpO1xuICAgICAgICBpZiAoc1dvcmRHcm91cC5pbmRleE9mKFwiIFwiKSA8PSAwKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZyhcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIHByaW1pdGl2ZSAoISlcIiArIHNXb3JkR3JvdXApO1xuICAgICAgICB9XG4gICAgICAgIGRlYnVnbG9nKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgXCIgKyBzV29yZEdyb3VwKTtcbiAgICAgICAgaWYgKCFzZWVuSXQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGluZyBlbXRweSBsaXN0LCBub3QgdW5kZWZpbmVkIGZvciBcXFwiXCIgKyBzV29yZEdyb3VwICsgXCJcXFwiXCIpO1xuICAgICAgICB9XG4gICAgICAgIHdvcmRzW3NXb3JkR3JvdXBdID0gW107XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgcmV0dXJuIHV0aWxzLmNsb25lRGVlcChzZWVuSXQpO1xufVxuZXhwb3J0cy5jYXRlZ29yaXplQVdvcmQgPSBjYXRlZ29yaXplQVdvcmQ7XG4vKipcbiAqIEdpdmVuIGEgIHN0cmluZywgYnJlYWsgaXQgZG93biBpbnRvIGNvbXBvbmVudHMsXG4gKiBbWydBJywgJ0InXSwgWydBIEInXV1cbiAqXG4gKiB0aGVuIGNhdGVnb3JpemVXb3Jkc1xuICogcmV0dXJuaW5nXG4gKlxuICogWyBbWyB7IGNhdGVnb3J5OiAnc3lzdGVtSWQnLCB3b3JkIDogJ0EnfSxcbiAqICAgICAgeyBjYXRlZ29yeTogJ290aGVydGhpbmcnLCB3b3JkIDogJ0EnfVxuICogICAgXSxcbiAqICAgIC8vIHJlc3VsdCBvZiBCXG4gKiAgICBbIHsgY2F0ZWdvcnk6ICdzeXN0ZW1JZCcsIHdvcmQgOiAnQid9LFxuICogICAgICB7IGNhdGVnb3J5OiAnb3RoZXJ0aGluZycsIHdvcmQgOiAnQSd9XG4gKiAgICAgIHsgY2F0ZWdvcnk6ICdhbm90aGVydHJ5cCcsIHdvcmQgOiAnQid9XG4gKiAgICBdXG4gKiAgIF0sXG4gKiBdXV1cbiAqXG4gKlxuICpcbiAqL1xuZnVuY3Rpb24gYW5hbHl6ZVN0cmluZyhzU3RyaW5nLCBydWxlcywgd29yZHMpIHtcbiAgICB2YXIgY250ID0gMDtcbiAgICB2YXIgZmFjID0gMTtcbiAgICB2YXIgdSA9IGJyZWFrZG93bi5icmVha2Rvd25TdHJpbmcoc1N0cmluZywgQWxnb2wuTWF4U3BhY2VzUGVyQ29tYmluZWRXb3JkKTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcImhlcmUgYnJlYWtkb3duXCIgKyBKU09OLnN0cmluZ2lmeSh1KSk7XG4gICAgfVxuICAgIC8vY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkodSkpO1xuICAgIHdvcmRzID0gd29yZHMgfHwge307XG4gICAgZGVidWdwZXJmKCd0aGlzIG1hbnkga25vd24gd29yZHM6ICcgKyBPYmplY3Qua2V5cyh3b3JkcykubGVuZ3RoKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgdmFyIGNudFJlYyA9IHt9O1xuICAgIHUuZm9yRWFjaChmdW5jdGlvbiAoYUJyZWFrRG93blNlbnRlbmNlKSB7XG4gICAgICAgIHZhciBjYXRlZ29yaXplZFNlbnRlbmNlID0gW107XG4gICAgICAgIHZhciBpc1ZhbGlkID0gYUJyZWFrRG93blNlbnRlbmNlLmV2ZXJ5KGZ1bmN0aW9uIChzV29yZEdyb3VwLCBpbmRleCkge1xuICAgICAgICAgICAgdmFyIHNlZW5JdCA9IGNhdGVnb3JpemVBV29yZChzV29yZEdyb3VwLCBydWxlcywgc1N0cmluZywgd29yZHMsIGNudFJlYyk7XG4gICAgICAgICAgICBpZiAoc2Vlbkl0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGVnb3JpemVkU2VudGVuY2VbaW5kZXhdID0gc2Vlbkl0O1xuICAgICAgICAgICAgY250ID0gY250ICsgc2Vlbkl0Lmxlbmd0aDtcbiAgICAgICAgICAgIGZhYyA9IGZhYyAqIHNlZW5JdC5sZW5ndGg7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChpc1ZhbGlkKSB7XG4gICAgICAgICAgICByZXMucHVzaChjYXRlZ29yaXplZFNlbnRlbmNlKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGRlYnVnbG9nKFwiIHNlbnRlbmNlcyBcIiArIHUubGVuZ3RoICsgXCIgbWF0Y2hlcyBcIiArIGNudCArIFwiIGZhYzogXCIgKyBmYWMpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkICYmIHUubGVuZ3RoKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiZmlyc3QgbWF0Y2ggXCIgKyBKU09OLnN0cmluZ2lmeSh1LCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgZGVidWdwZXJmKFwiIHNlbnRlbmNlcyBcIiArIHUubGVuZ3RoICsgXCIgLyBcIiArIHJlcy5sZW5ndGggKyBcIiBtYXRjaGVzIFwiICsgY250ICsgXCIgZmFjOiBcIiArIGZhYyArIFwiIHJlYyA6IFwiICsgSlNPTi5zdHJpbmdpZnkoY250UmVjLCB1bmRlZmluZWQsIDIpKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5hbmFseXplU3RyaW5nID0gYW5hbHl6ZVN0cmluZztcbi8qXG5bIFthLGJdLCBbYyxkXV1cblxuMDAgYVxuMDEgYlxuMTAgY1xuMTEgZFxuMTIgY1xuKi9cbnZhciBjbG9uZSA9IHV0aWxzLmNsb25lRGVlcDtcbmZ1bmN0aW9uIGNvcHlWZWNNZW1iZXJzKHUpIHtcbiAgICB2YXIgaSA9IDA7XG4gICAgZm9yIChpID0gMDsgaSA8IHUubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdVtpXSA9IGNsb25lKHVbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gdTtcbn1cbi8vIHdlIGNhbiByZXBsaWNhdGUgdGhlIHRhaWwgb3IgdGhlIGhlYWQsXG4vLyB3ZSByZXBsaWNhdGUgdGhlIHRhaWwgYXMgaXQgaXMgc21hbGxlci5cbi8vIFthLGIsYyBdXG5mdW5jdGlvbiBleHBhbmRNYXRjaEFycihkZWVwKSB7XG4gICAgdmFyIGEgPSBbXTtcbiAgICB2YXIgbGluZSA9IFtdO1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyBKU09OLnN0cmluZ2lmeShkZWVwKSA6ICctJyk7XG4gICAgZGVlcC5mb3JFYWNoKGZ1bmN0aW9uICh1QnJlYWtEb3duTGluZSwgaUluZGV4KSB7XG4gICAgICAgIGxpbmVbaUluZGV4XSA9IFtdO1xuICAgICAgICB1QnJlYWtEb3duTGluZS5mb3JFYWNoKGZ1bmN0aW9uIChhV29yZEdyb3VwLCB3Z0luZGV4KSB7XG4gICAgICAgICAgICBsaW5lW2lJbmRleF1bd2dJbmRleF0gPSBbXTtcbiAgICAgICAgICAgIGFXb3JkR3JvdXAuZm9yRWFjaChmdW5jdGlvbiAob1dvcmRWYXJpYW50LCBpV1ZJbmRleCkge1xuICAgICAgICAgICAgICAgIGxpbmVbaUluZGV4XVt3Z0luZGV4XVtpV1ZJbmRleF0gPSBvV29yZFZhcmlhbnQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkobGluZSkpO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICB2YXIgbnZlY3MgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpbmUubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIHZlY3MgPSBbW11dO1xuICAgICAgICB2YXIgbnZlY3MgPSBbXTtcbiAgICAgICAgdmFyIHJ2ZWMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCBsaW5lW2ldLmxlbmd0aDsgKytrKSB7XG4gICAgICAgICAgICAvL3ZlY3MgaXMgdGhlIHZlY3RvciBvZiBhbGwgc28gZmFyIHNlZW4gdmFyaWFudHMgdXAgdG8gayB3Z3MuXG4gICAgICAgICAgICB2YXIgbmV4dEJhc2UgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGwgPSAwOyBsIDwgbGluZVtpXVtrXS5sZW5ndGg7ICsrbCkge1xuICAgICAgICAgICAgICAgIC8vZGVidWdsb2coXCJ2ZWNzIG5vd1wiICsgSlNPTi5zdHJpbmdpZnkodmVjcykpO1xuICAgICAgICAgICAgICAgIG52ZWNzID0gW107IC8vdmVjcy5zbGljZSgpOyAvLyBjb3B5IHRoZSB2ZWNbaV0gYmFzZSB2ZWN0b3I7XG4gICAgICAgICAgICAgICAgLy9kZWJ1Z2xvZyhcInZlY3MgY29waWVkIG5vd1wiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciB1ID0gMDsgdSA8IHZlY3MubGVuZ3RoOyArK3UpIHtcbiAgICAgICAgICAgICAgICAgICAgbnZlY3NbdV0gPSB2ZWNzW3VdLnNsaWNlKCk7IC8vXG4gICAgICAgICAgICAgICAgICAgIG52ZWNzW3VdID0gY29weVZlY01lbWJlcnMobnZlY3NbdV0pO1xuICAgICAgICAgICAgICAgICAgICAvLyBkZWJ1Z2xvZyhcImNvcGllZCB2ZWNzW1wiKyB1K1wiXVwiICsgSlNPTi5zdHJpbmdpZnkodmVjc1t1XSkpO1xuICAgICAgICAgICAgICAgICAgICBudmVjc1t1XS5wdXNoKGNsb25lKGxpbmVbaV1ba11bbF0pKTsgLy8gcHVzaCB0aGUgbHRoIHZhcmlhbnRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gICBkZWJ1Z2xvZyhcIiBhdCAgICAgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbmV4dGJhc2UgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxuICAgICAgICAgICAgICAgIC8vICAgZGVidWdsb2coXCIgYXBwZW5kIFwiICsgayArIFwiOlwiICsgbCArIFwiIG52ZWNzICAgID5cIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSlcbiAgICAgICAgICAgICAgICBuZXh0QmFzZSA9IG5leHRCYXNlLmNvbmNhdChudmVjcyk7XG4gICAgICAgICAgICB9IC8vY29uc3RydVxuICAgICAgICAgICAgLy8gIGRlYnVnbG9nKFwibm93IGF0IFwiICsgayArIFwiOlwiICsgbCArIFwiID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcbiAgICAgICAgICAgIHZlY3MgPSBuZXh0QmFzZTtcbiAgICAgICAgfVxuICAgICAgICBkZWJ1Z2xvZ1YoZGVidWdsb2dWLmVuYWJsZWQgPyAoXCJBUFBFTkRJTkcgVE8gUkVTXCIgKyBpICsgXCI6XCIgKyBsICsgXCIgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKSA6ICctJyk7XG4gICAgICAgIHJlcyA9IHJlcy5jb25jYXQodmVjcyk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmV4cGFuZE1hdGNoQXJyID0gZXhwYW5kTWF0Y2hBcnI7XG4vKipcbiAqIENhbGN1bGF0ZSBhIHdlaWdodCBmYWN0b3IgZm9yIGEgZ2l2ZW4gZGlzdGFuY2UgYW5kXG4gKiBjYXRlZ29yeVxuICogQHBhcmFtIHtpbnRlZ2VyfSBkaXN0IGRpc3RhbmNlIGluIHdvcmRzXG4gKiBAcGFyYW0ge3N0cmluZ30gY2F0ZWdvcnkgY2F0ZWdvcnkgdG8gdXNlXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBhIGRpc3RhbmNlIGZhY3RvciA+PSAxXG4gKiAgMS4wIGZvciBubyBlZmZlY3RcbiAqL1xuZnVuY3Rpb24gcmVpbmZvcmNlRGlzdFdlaWdodChkaXN0LCBjYXRlZ29yeSkge1xuICAgIHZhciBhYnMgPSBNYXRoLmFicyhkaXN0KTtcbiAgICByZXR1cm4gMS4wICsgKEFsZ29sLmFSZWluZm9yY2VEaXN0V2VpZ2h0W2Fic10gfHwgMCk7XG59XG5leHBvcnRzLnJlaW5mb3JjZURpc3RXZWlnaHQgPSByZWluZm9yY2VEaXN0V2VpZ2h0O1xuLyoqXG4gKiBHaXZlbiBhIHNlbnRlbmNlLCBleHRhY3QgY2F0ZWdvcmllc1xuICovXG5mdW5jdGlvbiBleHRyYWN0Q2F0ZWdvcnlNYXAob1NlbnRlbmNlKSB7XG4gICAgdmFyIHJlcyA9IHt9O1xuICAgIGRlYnVnbG9nKCdleHRyYWN0Q2F0ZWdvcnlNYXAgJyArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSkpO1xuICAgIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaUluZGV4KSB7XG4gICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gSUZNYXRjaC5DQVRfQ0FURUdPUlkpIHtcbiAgICAgICAgICAgIHJlc1tvV29yZC5tYXRjaGVkU3RyaW5nXSA9IHJlc1tvV29yZC5tYXRjaGVkU3RyaW5nXSB8fCBbXTtcbiAgICAgICAgICAgIHJlc1tvV29yZC5tYXRjaGVkU3RyaW5nXS5wdXNoKHsgcG9zOiBpSW5kZXggfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICB1dGlscy5kZWVwRnJlZXplKHJlcyk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZXh0cmFjdENhdGVnb3J5TWFwID0gZXh0cmFjdENhdGVnb3J5TWFwO1xuZnVuY3Rpb24gcmVpbkZvcmNlU2VudGVuY2Uob1NlbnRlbmNlKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgdmFyIG9DYXRlZ29yeU1hcCA9IGV4dHJhY3RDYXRlZ29yeU1hcChvU2VudGVuY2UpO1xuICAgIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaUluZGV4KSB7XG4gICAgICAgIHZhciBtID0gb0NhdGVnb3J5TWFwW29Xb3JkLmNhdGVnb3J5XSB8fCBbXTtcbiAgICAgICAgbS5mb3JFYWNoKGZ1bmN0aW9uIChvUG9zaXRpb24pIHtcbiAgICAgICAgICAgIFwidXNlIHN0cmljdFwiO1xuICAgICAgICAgICAgb1dvcmQucmVpbmZvcmNlID0gb1dvcmQucmVpbmZvcmNlIHx8IDE7XG4gICAgICAgICAgICB2YXIgYm9vc3QgPSByZWluZm9yY2VEaXN0V2VpZ2h0KGlJbmRleCAtIG9Qb3NpdGlvbi5wb3MsIG9Xb3JkLmNhdGVnb3J5KTtcbiAgICAgICAgICAgIG9Xb3JkLnJlaW5mb3JjZSAqPSBib29zdDtcbiAgICAgICAgICAgIG9Xb3JkLl9yYW5raW5nICo9IGJvb3N0O1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGlJbmRleCkge1xuICAgICAgICBpZiAoaUluZGV4ID4gMCkge1xuICAgICAgICAgICAgaWYgKG9TZW50ZW5jZVtpSW5kZXggLSAxXS5jYXRlZ29yeSA9PT0gXCJtZXRhXCIgJiYgKG9Xb3JkLmNhdGVnb3J5ID09PSBvU2VudGVuY2VbaUluZGV4IC0gMV0ubWF0Y2hlZFN0cmluZykpIHtcbiAgICAgICAgICAgICAgICBvV29yZC5yZWluZm9yY2UgPSBvV29yZC5yZWluZm9yY2UgfHwgMTtcbiAgICAgICAgICAgICAgICB2YXIgYm9vc3QgPSByZWluZm9yY2VEaXN0V2VpZ2h0KDEsIG9Xb3JkLmNhdGVnb3J5KTtcbiAgICAgICAgICAgICAgICBvV29yZC5yZWluZm9yY2UgKj0gYm9vc3Q7XG4gICAgICAgICAgICAgICAgb1dvcmQuX3JhbmtpbmcgKj0gYm9vc3Q7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gb1NlbnRlbmNlO1xufVxuZXhwb3J0cy5yZWluRm9yY2VTZW50ZW5jZSA9IHJlaW5Gb3JjZVNlbnRlbmNlO1xudmFyIFNlbnRlbmNlID0gcmVxdWlyZSgnLi9zZW50ZW5jZScpO1xuZnVuY3Rpb24gcmVpbkZvcmNlKGFDYXRlZ29yaXplZEFycmF5KSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgYUNhdGVnb3JpemVkQXJyYXkuZm9yRWFjaChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgIHJlaW5Gb3JjZVNlbnRlbmNlKG9TZW50ZW5jZSk7XG4gICAgfSk7XG4gICAgYUNhdGVnb3JpemVkQXJyYXkuc29ydChTZW50ZW5jZS5jbXBSYW5raW5nUHJvZHVjdCk7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCJhZnRlciByZWluZm9yY2VcIiArIGFDYXRlZ29yaXplZEFycmF5Lm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICAgICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgfVxuICAgIHJldHVybiBhQ2F0ZWdvcml6ZWRBcnJheTtcbn1cbmV4cG9ydHMucmVpbkZvcmNlID0gcmVpbkZvcmNlO1xuLy8vIGJlbG93IG1heSBubyBsb25nZXIgYmUgdXNlZFxuZnVuY3Rpb24gbWF0Y2hSZWdFeHAob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAoY29udGV4dFtvUnVsZS5rZXldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIHNLZXkgPSBvUnVsZS5rZXk7XG4gICAgdmFyIHMxID0gY29udGV4dFtvUnVsZS5rZXldLnRvTG93ZXJDYXNlKCk7XG4gICAgdmFyIHJlZyA9IG9SdWxlLnJlZ2V4cDtcbiAgICB2YXIgbSA9IHJlZy5leGVjKHMxKTtcbiAgICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2dWKFwiYXBwbHlpbmcgcmVnZXhwOiBcIiArIHMxICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XG4gICAgfVxuICAgIGlmICghbSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB2YXIgZGVsdGEgPSBjb21wYXJlQ29udGV4dChjb250ZXh0LCBvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpO1xuICAgIGlmIChkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZ1YoSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcbiAgICAgICAgZGVidWdsb2dWKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBvRXh0cmFjdGVkQ29udGV4dCA9IGV4dHJhY3RBcmdzTWFwKG0sIG9SdWxlLmFyZ3NNYXApO1xuICAgIGlmIChkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZ1YoXCJleHRyYWN0ZWQgYXJncyBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLmFyZ3NNYXApKTtcbiAgICAgICAgZGVidWdsb2dWKFwibWF0Y2ggXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XG4gICAgICAgIGRlYnVnbG9nVihcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob0V4dHJhY3RlZENvbnRleHQpKTtcbiAgICB9XG4gICAgdmFyIHJlcyA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpO1xuICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvRXh0cmFjdGVkQ29udGV4dCk7XG4gICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIGNvbnRleHQpO1xuICAgIGlmIChvRXh0cmFjdGVkQ29udGV4dFtzS2V5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlc1tzS2V5XSA9IG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xuICAgICAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb1J1bGUuZm9sbG93cyk7XG4gICAgICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvRXh0cmFjdGVkQ29udGV4dCk7XG4gICAgfVxuICAgIE9iamVjdC5mcmVlemUocmVzKTtcbiAgICBkZWJ1Z2xvZygnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMubWF0Y2hSZWdFeHAgPSBtYXRjaFJlZ0V4cDtcbmZ1bmN0aW9uIHNvcnRCeVdlaWdodChzS2V5LCBvQ29udGV4dEEsIG9Db250ZXh0Qikge1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nVignc29ydGluZzogJyArIHNLZXkgKyAnaW52b2tlZCB3aXRoXFxuIDE6JyArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QSwgdW5kZWZpbmVkLCAyKSArXG4gICAgICAgICAgICBcIiB2cyBcXG4gMjpcIiArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QiwgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHZhciByYW5raW5nQSA9IHBhcnNlRmxvYXQob0NvbnRleHRBW1wiX3JhbmtpbmdcIl0gfHwgXCIxXCIpO1xuICAgIHZhciByYW5raW5nQiA9IHBhcnNlRmxvYXQob0NvbnRleHRCW1wiX3JhbmtpbmdcIl0gfHwgXCIxXCIpO1xuICAgIGlmIChyYW5raW5nQSAhPT0gcmFua2luZ0IpIHtcbiAgICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgICAgIGRlYnVnbG9nKFwiIHJhbmtpbiBkZWx0YVwiICsgMTAwICogKHJhbmtpbmdCIC0gcmFua2luZ0EpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMTAwICogKHJhbmtpbmdCIC0gcmFua2luZ0EpO1xuICAgIH1cbiAgICB2YXIgd2VpZ2h0QSA9IG9Db250ZXh0QVtcIl93ZWlnaHRcIl0gJiYgb0NvbnRleHRBW1wiX3dlaWdodFwiXVtzS2V5XSB8fCAwO1xuICAgIHZhciB3ZWlnaHRCID0gb0NvbnRleHRCW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdW3NLZXldIHx8IDA7XG4gICAgcmV0dXJuICsod2VpZ2h0QiAtIHdlaWdodEEpO1xufVxuZXhwb3J0cy5zb3J0QnlXZWlnaHQgPSBzb3J0QnlXZWlnaHQ7XG4vLyBXb3JkLCBTeW5vbnltLCBSZWdleHAgLyBFeHRyYWN0aW9uUnVsZVxuZnVuY3Rpb24gYXVnbWVudENvbnRleHQxKGNvbnRleHQsIG9SdWxlcywgb3B0aW9ucykge1xuICAgIHZhciBzS2V5ID0gb1J1bGVzWzBdLmtleTtcbiAgICAvLyBjaGVjayB0aGF0IHJ1bGVcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAvLyBjaGVjayBjb25zaXN0ZW5jeVxuICAgICAgICBvUnVsZXMuZXZlcnkoZnVuY3Rpb24gKGlSdWxlKSB7XG4gICAgICAgICAgICBpZiAoaVJ1bGUua2V5ICE9PSBzS2V5KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW5ob21vZ2Vub3VzIGtleXMgaW4gcnVsZXMsIGV4cGVjdGVkIFwiICsgc0tleSArIFwiIHdhcyBcIiArIEpTT04uc3RyaW5naWZ5KGlSdWxlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8vIGxvb2sgZm9yIHJ1bGVzIHdoaWNoIG1hdGNoXG4gICAgdmFyIHJlcyA9IG9SdWxlcy5tYXAoZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgIC8vIGlzIHRoaXMgcnVsZSBhcHBsaWNhYmxlXG4gICAgICAgIHN3aXRjaCAob1J1bGUudHlwZSkge1xuICAgICAgICAgICAgY2FzZSAwIC8qIFdPUkQgKi86XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hdGNoV29yZChvUnVsZSwgY29udGV4dCwgb3B0aW9ucyk7XG4gICAgICAgICAgICBjYXNlIDEgLyogUkVHRVhQICovOlxuICAgICAgICAgICAgICAgIHJldHVybiBtYXRjaFJlZ0V4cChvUnVsZSwgY29udGV4dCwgb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9KS5maWx0ZXIoZnVuY3Rpb24gKG9yZXMpIHtcbiAgICAgICAgcmV0dXJuICEhb3JlcztcbiAgICB9KS5zb3J0KHNvcnRCeVdlaWdodC5iaW5kKHRoaXMsIHNLZXkpKTtcbiAgICAvL2RlYnVnbG9nKFwiaGFzc29ydGVkXCIgKyBKU09OLnN0cmluZ2lmeShyZXMsdW5kZWZpbmVkLDIpKTtcbiAgICByZXR1cm4gcmVzO1xuICAgIC8vIE9iamVjdC5rZXlzKCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xuICAgIC8vIH0pO1xufVxuZXhwb3J0cy5hdWdtZW50Q29udGV4dDEgPSBhdWdtZW50Q29udGV4dDE7XG5mdW5jdGlvbiBhdWdtZW50Q29udGV4dChjb250ZXh0LCBhUnVsZXMpIHtcbiAgICB2YXIgb3B0aW9uczEgPSB7XG4gICAgICAgIG1hdGNob3RoZXJzOiB0cnVlLFxuICAgICAgICBvdmVycmlkZTogZmFsc2VcbiAgICB9O1xuICAgIHZhciBhUmVzID0gYXVnbWVudENvbnRleHQxKGNvbnRleHQsIGFSdWxlcywgb3B0aW9uczEpO1xuICAgIGlmIChhUmVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB2YXIgb3B0aW9uczIgPSB7XG4gICAgICAgICAgICBtYXRjaG90aGVyczogZmFsc2UsXG4gICAgICAgICAgICBvdmVycmlkZTogdHJ1ZVxuICAgICAgICB9O1xuICAgICAgICBhUmVzID0gYXVnbWVudENvbnRleHQxKGNvbnRleHQsIGFSdWxlcywgb3B0aW9uczIpO1xuICAgIH1cbiAgICByZXR1cm4gYVJlcztcbn1cbmV4cG9ydHMuYXVnbWVudENvbnRleHQgPSBhdWdtZW50Q29udGV4dDtcbmZ1bmN0aW9uIGluc2VydE9yZGVyZWQocmVzdWx0LCBpSW5zZXJ0ZWRNZW1iZXIsIGxpbWl0KSB7XG4gICAgLy8gVE9ETzogdXNlIHNvbWUgd2VpZ2h0XG4gICAgaWYgKHJlc3VsdC5sZW5ndGggPCBsaW1pdCkge1xuICAgICAgICByZXN1bHQucHVzaChpSW5zZXJ0ZWRNZW1iZXIpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuZXhwb3J0cy5pbnNlcnRPcmRlcmVkID0gaW5zZXJ0T3JkZXJlZDtcbmZ1bmN0aW9uIHRha2VUb3BOKGFycikge1xuICAgIHZhciB1ID0gYXJyLmZpbHRlcihmdW5jdGlvbiAoaW5uZXJBcnIpIHsgcmV0dXJuIGlubmVyQXJyLmxlbmd0aCA+IDA7IH0pO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICAvLyBzaGlmdCBvdXQgdGhlIHRvcCBvbmVzXG4gICAgdSA9IHUubWFwKGZ1bmN0aW9uIChpQXJyKSB7XG4gICAgICAgIHZhciB0b3AgPSBpQXJyLnNoaWZ0KCk7XG4gICAgICAgIHJlcyA9IGluc2VydE9yZGVyZWQocmVzLCB0b3AsIDUpO1xuICAgICAgICByZXR1cm4gaUFycjtcbiAgICB9KS5maWx0ZXIoZnVuY3Rpb24gKGlubmVyQXJyKSB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwOyB9KTtcbiAgICAvLyBhcyBBcnJheTxBcnJheTxJRk1hdGNoLmNvbnRleHQ+PlxuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLnRha2VUb3BOID0gdGFrZVRvcE47XG52YXIgaW5wdXRGaWx0ZXJSdWxlcyA9IHJlcXVpcmUoJy4vaW5wdXRGaWx0ZXJSdWxlcycpO1xudmFyIHJtO1xuZnVuY3Rpb24gZ2V0Uk1PbmNlKCkge1xuICAgIGlmICghcm0pIHtcbiAgICAgICAgcm0gPSBpbnB1dEZpbHRlclJ1bGVzLmdldFJ1bGVNYXAoKTtcbiAgICB9XG4gICAgcmV0dXJuIHJtO1xufVxuZnVuY3Rpb24gYXBwbHlSdWxlcyhjb250ZXh0KSB7XG4gICAgdmFyIGJlc3ROID0gW2NvbnRleHRdO1xuICAgIGlucHV0RmlsdGVyUnVsZXMub0tleU9yZGVyLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgICAgdmFyIGJlc3ROZXh0ID0gW107XG4gICAgICAgIGJlc3ROLmZvckVhY2goZnVuY3Rpb24gKG9Db250ZXh0KSB7XG4gICAgICAgICAgICBpZiAob0NvbnRleHRbc0tleV0pIHtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZygnKiogYXBwbHlpbmcgcnVsZXMgZm9yICcgKyBzS2V5KTtcbiAgICAgICAgICAgICAgICB2YXIgcmVzID0gYXVnbWVudENvbnRleHQob0NvbnRleHQsIGdldFJNT25jZSgpW3NLZXldIHx8IFtdKTtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZygnKiogcmVzdWx0IGZvciAnICsgc0tleSArICcgPSAnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgICAgICAgICBiZXN0TmV4dC5wdXNoKHJlcyB8fCBbXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBydWxlIG5vdCByZWxldmFudFxuICAgICAgICAgICAgICAgIGJlc3ROZXh0LnB1c2goW29Db250ZXh0XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBiZXN0TiA9IHRha2VUb3BOKGJlc3ROZXh0KTtcbiAgICB9KTtcbiAgICByZXR1cm4gYmVzdE47XG59XG5leHBvcnRzLmFwcGx5UnVsZXMgPSBhcHBseVJ1bGVzO1xuZnVuY3Rpb24gYXBwbHlSdWxlc1BpY2tGaXJzdChjb250ZXh0KSB7XG4gICAgdmFyIHIgPSBhcHBseVJ1bGVzKGNvbnRleHQpO1xuICAgIHJldHVybiByICYmIHJbMF07XG59XG5leHBvcnRzLmFwcGx5UnVsZXNQaWNrRmlyc3QgPSBhcHBseVJ1bGVzUGlja0ZpcnN0O1xuLyoqXG4gKiBEZWNpZGUgd2hldGhlciB0byByZXF1ZXJ5IGZvciBhIGNvbnRldFxuICovXG5mdW5jdGlvbiBkZWNpZGVPblJlUXVlcnkoY29udGV4dCkge1xuICAgIHJldHVybiBbXTtcbn1cbmV4cG9ydHMuZGVjaWRlT25SZVF1ZXJ5ID0gZGVjaWRlT25SZVF1ZXJ5O1xuIiwiLyoqXHJcbiAqIHRoZSBpbnB1dCBmaWx0ZXIgc3RhZ2UgcHJlcHJvY2Vzc2VzIGEgY3VycmVudCBjb250ZXh0XHJcbiAqXHJcbiAqIEl0IGEpIGNvbWJpbmVzIG11bHRpLXNlZ21lbnQgYXJndW1lbnRzIGludG8gb25lIGNvbnRleHQgbWVtYmVyc1xyXG4gKiBJdCBiKSBhdHRlbXB0cyB0byBhdWdtZW50IHRoZSBjb250ZXh0IGJ5IGFkZGl0aW9uYWwgcXVhbGlmaWNhdGlvbnNcclxuICogICAgICAgICAgIChNaWQgdGVybSBnZW5lcmF0aW5nIEFsdGVybmF0aXZlcywgZS5nLlxyXG4gKiAgICAgICAgICAgICAgICAgQ2xpZW50U2lkZVRhcmdldFJlc29sdXRpb24gLT4gdW5pdCB0ZXN0P1xyXG4gKiAgICAgICAgICAgICAgICAgQ2xpZW50U2lkZVRhcmdldFJlc29sdXRpb24gLT4gc291cmNlID9cclxuICogICAgICAgICAgIClcclxuICogIFNpbXBsZSBydWxlcyBsaWtlICBJbnRlbnRcclxuICpcclxuICpcclxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuaW5wdXRGaWx0ZXJcclxuICogQGZpbGUgaW5wdXRGaWx0ZXIudHNcclxuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxyXG4gKi9cclxuLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vbGliL25vZGUtNC5kLnRzXCIgLz5cclxuaW1wb3J0ICogYXMgZGlzdGFuY2UgZnJvbSAnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluJztcclxuXHJcbmltcG9ydCAqIGFzIExvZ2dlciBmcm9tICcuLi91dGlscy9sb2dnZXInXHJcblxyXG5jb25zdCBsb2dnZXIgPSBMb2dnZXIubG9nZ2VyKCdpbnB1dEZpbHRlcicpO1xyXG5cclxuaW1wb3J0ICogYXMgZGVidWcgZnJvbSAnZGVidWcnO1xyXG52YXIgZGVidWdwZXJmID0gZGVidWcoJ3BlcmYnKTtcclxuXHJcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gJy4uL3V0aWxzL3V0aWxzJztcclxuXHJcblxyXG5pbXBvcnQgKiBhcyBBbGdvbCBmcm9tICcuL2FsZ29sJztcclxuXHJcbmltcG9ydCAqIGFzIElNYXRjaCBmcm9tICcuL2lmbWF0Y2gnO1xyXG5cclxuaW1wb3J0ICogYXMgYnJlYWtkb3duIGZyb20gJy4vYnJlYWtkb3duJztcclxuXHJcbmNvbnN0IEFueU9iamVjdCA9IDxhbnk+T2JqZWN0O1xyXG5cclxuY29uc3QgZGVidWdsb2cgPSBkZWJ1ZygnaW5wdXRGaWx0ZXInKVxyXG5jb25zdCBkZWJ1Z2xvZ1YgPSBkZWJ1ZygnaW5wdXRWRmlsdGVyJylcclxuY29uc3QgZGVidWdsb2dNID0gZGVidWcoJ2lucHV0TUZpbHRlcicpXHJcblxyXG5cclxuXHJcbmltcG9ydCAqIGFzIG1hdGNoZGF0YSBmcm9tICcuL21hdGNoZGF0YSc7XHJcbnZhciBvVW5pdFRlc3RzID0gbWF0Y2hkYXRhLm9Vbml0VGVzdHNcclxuXHJcbmZ1bmN0aW9uIGNudENoYXJzKHN0ciA6IHN0cmluZywgbGVuIDogbnVtYmVyKSB7XHJcbiAgdmFyIGNudCA9IDA7XHJcbiAgZm9yKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XHJcbiAgICBjbnQgKz0gKHN0ci5jaGFyQXQoaSkgPT09ICdYJyk/IDEgOiAwO1xyXG4gIH1cclxuICByZXR1cm4gY250O1xyXG59XHJcblxyXG4vKipcclxuICogQHBhcmFtIHNUZXh0IHtzdHJpbmd9IHRoZSB0ZXh0IHRvIG1hdGNoIHRvIE5hdlRhcmdldFJlc29sdXRpb25cclxuICogQHBhcmFtIHNUZXh0MiB7c3RyaW5nfSB0aGUgcXVlcnkgdGV4dCwgZS5nLiBOYXZUYXJnZXRcclxuICpcclxuICogQHJldHVybiB0aGUgZGlzdGFuY2UsIG5vdGUgdGhhdCBpcyBpcyAqbm90KiBzeW1tZXRyaWMhXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY2FsY0Rpc3RhbmNlKHNUZXh0MTogc3RyaW5nLCBzVGV4dDI6IHN0cmluZyk6IG51bWJlciB7XHJcbiAgLy8gY29uc29sZS5sb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxyXG4gIHZhciBzMWxlbiA9IHNUZXh0MS5sZW5ndGg7XHJcbiAgdmFyIHMybGVuID0gc1RleHQyLmxlbmd0aDtcclxuICB2YXIgbWluID0gTWF0aC5taW4oczFsZW4sczJsZW4pO1xyXG4gIGlmKE1hdGguYWJzKHMxbGVuIC0gczJsZW4pID4gTWF0aC5taW4oczFsZW4sczJsZW4pKSB7XHJcbiAgICByZXR1cm4gMC4zO1xyXG4gIH1cclxuICB2YXIgZGlzdCA9IGRpc3RhbmNlLmphcm9XaW5rbGVyRGlzdGFuY2Uoc1RleHQxLHNUZXh0Mik7XHJcbiAgdmFyIGNudDEgPSBjbnRDaGFycyhzVGV4dDEsIHMxbGVuKTtcclxuICB2YXIgY250MiA9IGNudENoYXJzKHNUZXh0MiwgczJsZW4pO1xyXG4gIGlmKGNudDEgIT09IGNudDIpIHtcclxuICAgIGRpc3QgPSBkaXN0ICogMC43O1xyXG4gIH1cclxuICByZXR1cm4gZGlzdDtcclxuICAvKlxyXG4gIHZhciBhMCA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCksIHNUZXh0MilcclxuICBpZihkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xyXG4gICAgZGVidWdsb2dWKFwiZGlzdGFuY2VcIiArIGEwICsgXCJzdHJpcHBlZD5cIiArIHNUZXh0MS5zdWJzdHJpbmcoMCxzVGV4dDIubGVuZ3RoKSArIFwiPD5cIiArIHNUZXh0MisgXCI8XCIpO1xyXG4gIH1cclxuICBpZihhMCAqIDUwID4gMTUgKiBzVGV4dDIubGVuZ3RoKSB7XHJcbiAgICAgIHJldHVybiA0MDAwMDtcclxuICB9XHJcbiAgdmFyIGEgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEsIHNUZXh0MilcclxuICByZXR1cm4gYTAgKiA1MDAgLyBzVGV4dDIubGVuZ3RoICsgYVxyXG4gICovXHJcbn1cclxuXHJcblxyXG5cclxuLyoqXHJcbiAqIEBwYXJhbSBzVGV4dCB7c3RyaW5nfSB0aGUgdGV4dCB0byBtYXRjaCB0byBOYXZUYXJnZXRSZXNvbHV0aW9uXHJcbiAqIEBwYXJhbSBzVGV4dDIge3N0cmluZ30gdGhlIHF1ZXJ5IHRleHQsIGUuZy4gTmF2VGFyZ2V0XHJcbiAqXHJcbiAqIEByZXR1cm4gdGhlIGRpc3RhbmNlLCBub3RlIHRoYXQgaXMgaXMgKm5vdCogc3ltbWV0cmljIVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNEaXN0YW5jZUxldmVuKHNUZXh0MTogc3RyaW5nLCBzVGV4dDI6IHN0cmluZyk6IG51bWJlciB7XHJcbiAgLy8gY29uc29sZS5sb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxyXG4gICBpZigoKHNUZXh0MS5sZW5ndGggLSBzVGV4dDIubGVuZ3RoKSA+IEFsZ29sLmNhbGNEaXN0Lmxlbmd0aERlbHRhMSlcclxuICAgIHx8IChzVGV4dDIubGVuZ3RoID4gMS41ICogc1RleHQxLmxlbmd0aCApXHJcbiAgICB8fCAoc1RleHQyLmxlbmd0aCA8IChzVGV4dDEubGVuZ3RoLzIpKSApIHtcclxuICAgIHJldHVybiA1MDAwMDtcclxuICB9XHJcbiAgdmFyIGEwID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnN1YnN0cmluZygwLCBzVGV4dDIubGVuZ3RoKSwgc1RleHQyKVxyXG4gIGlmKGRlYnVnbG9nVi5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZ1YoXCJkaXN0YW5jZVwiICsgYTAgKyBcInN0cmlwcGVkPlwiICsgc1RleHQxLnN1YnN0cmluZygwLHNUZXh0Mi5sZW5ndGgpICsgXCI8PlwiICsgc1RleHQyKyBcIjxcIik7XHJcbiAgfVxyXG4gIGlmKGEwICogNTAgPiAxNSAqIHNUZXh0Mi5sZW5ndGgpIHtcclxuICAgICAgcmV0dXJuIDQwMDAwO1xyXG4gIH1cclxuICB2YXIgYSA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MSwgc1RleHQyKVxyXG4gIHJldHVybiBhMCAqIDUwMCAvIHNUZXh0Mi5sZW5ndGggKyBhXHJcbn1cclxuXHJcblxyXG5cclxuXHJcbmltcG9ydCAqIGFzIElGTWF0Y2ggZnJvbSAnLi4vbWF0Y2gvaWZtYXRjaCc7XHJcblxyXG50eXBlIElSdWxlID0gSUZNYXRjaC5JUnVsZVxyXG5cclxuXHJcbmludGVyZmFjZSBJTWF0Y2hPcHRpb25zIHtcclxuICBtYXRjaG90aGVycz86IGJvb2xlYW4sXHJcbiAgYXVnbWVudD86IGJvb2xlYW4sXHJcbiAgb3ZlcnJpZGU/OiBib29sZWFuXHJcbn1cclxuXHJcbmludGVyZmFjZSBJTWF0Y2hDb3VudCB7XHJcbiAgZXF1YWw6IG51bWJlclxyXG4gIGRpZmZlcmVudDogbnVtYmVyXHJcbiAgc3B1cmlvdXNSOiBudW1iZXJcclxuICBzcHVyaW91c0w6IG51bWJlclxyXG59XHJcblxyXG50eXBlIEVudW1SdWxlVHlwZSA9IElGTWF0Y2guRW51bVJ1bGVUeXBlXHJcblxyXG4vL2NvbnN0IGxldmVuQ3V0b2ZmID0gQWxnb2wuQ3V0b2ZmX0xldmVuU2h0ZWluO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBsZXZlblBlbmFsdHlPbGQoaTogbnVtYmVyKTogbnVtYmVyIHtcclxuICAvLyAwLT4gMVxyXG4gIC8vIDEgLT4gMC4xXHJcbiAgLy8gMTUwIC0+ICAwLjhcclxuICBpZiAoaSA9PT0gMCkge1xyXG4gICAgcmV0dXJuIDE7XHJcbiAgfVxyXG4gIC8vIHJldmVyc2UgbWF5IGJlIGJldHRlciB0aGFuIGxpbmVhclxyXG4gIHJldHVybiAxICsgaSAqICgwLjggLSAxKSAvIDE1MFxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbGV2ZW5QZW5hbHR5KGk6IG51bWJlcik6IG51bWJlciB7XHJcbiAgLy8gMSAtPiAxXHJcbiAgLy8gY3V0T2ZmID0+IDAuOFxyXG4gIHJldHVybiBpO1xyXG4gIC8vcmV0dXJuICAgMSAtICAoMSAtIGkpICowLjIvQWxnb2wuQ3V0b2ZmX1dvcmRNYXRjaDtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIG5vblByaXZhdGVLZXlzKG9BKSB7XHJcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG9BKS5maWx0ZXIoa2V5ID0+IHtcclxuICAgIHJldHVybiBrZXlbMF0gIT09ICdfJztcclxuICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNvdW50QWluQihvQSwgb0IsIGZuQ29tcGFyZSwgYUtleUlnbm9yZT8pOiBudW1iZXIge1xyXG4gIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gYUtleUlnbm9yZSA6XHJcbiAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xyXG4gIGZuQ29tcGFyZSA9IGZuQ29tcGFyZSB8fCBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9XHJcbiAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xyXG4gICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcclxuICB9KS5cclxuICAgIHJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XHJcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIChmbkNvbXBhcmUob0Fba2V5XSwgb0Jba2V5XSwga2V5KSA/IDEgOiAwKVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBwcmV2XHJcbiAgICB9LCAwKVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc3B1cmlvdXNBbm90SW5CKG9BLCBvQiwgYUtleUlnbm9yZT8pIHtcclxuICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxyXG4gICAgdHlwZW9mIGFLZXlJZ25vcmUgPT09IFwic3RyaW5nXCIgPyBbYUtleUlnbm9yZV0gOiBbXTtcclxuICByZXR1cm4gbm9uUHJpdmF0ZUtleXMob0EpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xyXG4gIH0pLlxyXG4gICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIDFcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldlxyXG4gICAgfSwgMClcclxufVxyXG5cclxuZnVuY3Rpb24gbG93ZXJDYXNlKG8pIHtcclxuICBpZiAodHlwZW9mIG8gPT09IFwic3RyaW5nXCIpIHtcclxuICAgIHJldHVybiBvLnRvTG93ZXJDYXNlKClcclxuICB9XHJcbiAgcmV0dXJuIG9cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmVDb250ZXh0KG9BLCBvQiwgYUtleUlnbm9yZT8pIHtcclxuICB2YXIgZXF1YWwgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpID09PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xyXG4gIHZhciBkaWZmZXJlbnQgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpICE9PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xyXG4gIHZhciBzcHVyaW91c0wgPSBzcHVyaW91c0Fub3RJbkIob0EsIG9CLCBhS2V5SWdub3JlKVxyXG4gIHZhciBzcHVyaW91c1IgPSBzcHVyaW91c0Fub3RJbkIob0IsIG9BLCBhS2V5SWdub3JlKVxyXG4gIHJldHVybiB7XHJcbiAgICBlcXVhbDogZXF1YWwsXHJcbiAgICBkaWZmZXJlbnQ6IGRpZmZlcmVudCxcclxuICAgIHNwdXJpb3VzTDogc3B1cmlvdXNMLFxyXG4gICAgc3B1cmlvdXNSOiBzcHVyaW91c1JcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNvcnRCeVJhbmsoYTogSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmcsIGI6IElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nKTogbnVtYmVyIHtcclxuICB2YXIgciA9IC0oKGEuX3JhbmtpbmcgfHwgMS4wKSAtIChiLl9yYW5raW5nIHx8IDEuMCkpO1xyXG4gIGlmIChyKSB7XHJcbiAgICByZXR1cm4gcjtcclxuICB9XHJcbiAgaWYgKGEuY2F0ZWdvcnkgJiYgYi5jYXRlZ29yeSkge1xyXG4gICAgciA9IGEuY2F0ZWdvcnkubG9jYWxlQ29tcGFyZShiLmNhdGVnb3J5KTtcclxuICAgIGlmIChyKSB7XHJcbiAgICAgIHJldHVybiByO1xyXG4gICAgfVxyXG4gIH1cclxuICBpZiAoYS5tYXRjaGVkU3RyaW5nICYmIGIubWF0Y2hlZFN0cmluZykge1xyXG4gICAgciA9IGEubWF0Y2hlZFN0cmluZy5sb2NhbGVDb21wYXJlKGIubWF0Y2hlZFN0cmluZyk7XHJcbiAgICBpZiAocikge1xyXG4gICAgICByZXR1cm4gcjtcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIDA7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tPbmVSdWxlKHN0cmluZzogc3RyaW5nLCBsY1N0cmluZyA6IHN0cmluZywgZXhhY3QgOiBib29sZWFuLFxyXG5yZXMgOiBBcnJheTxJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPixcclxub1J1bGUgOiBJTWF0Y2gubVJ1bGUsIGNudFJlYz8gOiBJQ250UmVjICkge1xyXG4gICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcclxuICAgICAgZGVidWdsb2dWKCdhdHRlbXB0aW5nIHRvIG1hdGNoIHJ1bGUgJyArIEpTT04uc3RyaW5naWZ5KG9SdWxlKSArIFwiIHRvIHN0cmluZyBcXFwiXCIgKyBzdHJpbmcgKyBcIlxcXCJcIik7XHJcbiAgICB9XHJcbiAgICBzd2l0Y2ggKG9SdWxlLnR5cGUpIHtcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5XT1JEOlxyXG4gICAgICAgIGlmKCFvUnVsZS5sb3dlcmNhc2V3b3JkKSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3J1bGUgd2l0aG91dCBhIGxvd2VyY2FzZSB2YXJpYW50JyArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKTtcclxuICAgICAgICAgfTtcclxuICAgICAgICBpZiAoZXhhY3QgJiYgb1J1bGUud29yZCA9PT0gc3RyaW5nIHx8IG9SdWxlLmxvd2VyY2FzZXdvcmQgPT09IGxjU3RyaW5nKSB7XHJcbiAgICAgICAgICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAgICAgICAgIGRlYnVnbG9nKFwiXFxuIW1hdGNoZWQgZXhhY3QgXCIgKyBzdHJpbmcgKyBcIj1cIiAgKyBvUnVsZS5sb3dlcmNhc2V3b3JkICArIFwiID0+IFwiICsgb1J1bGUubWF0Y2hlZFN0cmluZyArIFwiL1wiICsgb1J1bGUuY2F0ZWdvcnkpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmVzLnB1c2goe1xyXG4gICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcclxuICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxyXG4gICAgICAgICAgICBfcmFua2luZzogb1J1bGUuX3JhbmtpbmcgfHwgMS4wXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIWV4YWN0ICYmICFvUnVsZS5leGFjdE9ubHkpIHtcclxuICAgICAgICAgIHZhciBsZXZlbm1hdGNoID0gY2FsY0Rpc3RhbmNlKG9SdWxlLmxvd2VyY2FzZXdvcmQsIGxjU3RyaW5nKTtcclxuXHJcbi8qXHJcbiAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlXCIsIDEpO1xyXG4gICAgICAgICAgaWYobGV2ZW5tYXRjaCA8IDUwKSB7XHJcbiAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VFeHBcIiwgMSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZihsZXZlbm1hdGNoIDwgNDAwMDApIHtcclxuICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYyxcImNhbGNEaXN0YW5jZUJlbG93NDBrXCIsIDEpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgKi9cclxuICAgICAgICAgIC8vaWYob1J1bGUubG93ZXJjYXNld29yZCA9PT0gXCJjb3Ntb3NcIikge1xyXG4gICAgICAgICAgLy8gIGNvbnNvbGUubG9nKFwiaGVyZSByYW5raW5nIFwiICsgbGV2ZW5tYXRjaCArIFwiIFwiICsgb1J1bGUubG93ZXJjYXNld29yZCArIFwiIFwiICsgbGNTdHJpbmcpO1xyXG4gICAgICAgICAgLy99XHJcbiAgICAgICAgICBpZiAobGV2ZW5tYXRjaCA+PSBBbGdvbC5DdXRvZmZfV29yZE1hdGNoKSB7IC8vIGxldmVuQ3V0b2ZmKSB7XHJcbiAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VPa1wiLCAxKTtcclxuICAgICAgICAgICAgdmFyIHJlYyA9IHtcclxuICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcclxuICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBvUnVsZS5tYXRjaGVkU3RyaW5nLFxyXG4gICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgICBfcmFua2luZzogKG9SdWxlLl9yYW5raW5nIHx8IDEuMCkgKiBsZXZlblBlbmFsdHkobGV2ZW5tYXRjaCksXHJcbiAgICAgICAgICAgICAgbGV2ZW5tYXRjaDogbGV2ZW5tYXRjaFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBpZihkZWJ1Z2xvZykge1xyXG4gICAgICAgICAgICAgIGRlYnVnbG9nKFwiXFxuIWZ1enp5IFwiICsgKGxldmVubWF0Y2gpLnRvRml4ZWQoMykgKyBcIiBcIiArIHJlYy5fcmFua2luZy50b0ZpeGVkKDMpICsgXCIgIFwiICsgc3RyaW5nICsgXCI9XCIgICsgb1J1bGUubG93ZXJjYXNld29yZCAgKyBcIiA9PiBcIiArIG9SdWxlLm1hdGNoZWRTdHJpbmcgKyBcIi9cIiArIG9SdWxlLmNhdGVnb3J5KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXMucHVzaChyZWMpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5SRUdFWFA6IHtcclxuICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoXCIgaGVyZSByZWdleHBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKSlcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIG0gPSBvUnVsZS5yZWdleHAuZXhlYyhzdHJpbmcpXHJcbiAgICAgICAgaWYgKG0pIHtcclxuICAgICAgICAgIHJlcy5wdXNoKHtcclxuICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IChvUnVsZS5tYXRjaEluZGV4ICE9PSB1bmRlZmluZWQgJiYgbVtvUnVsZS5tYXRjaEluZGV4XSkgfHwgc3RyaW5nLFxyXG4gICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXHJcbiAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidW5rbm93biB0eXBlXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSlcclxuICAgIH1cclxufVxyXG5cclxuXHJcbmludGVyZmFjZSBJQ250UmVjIHtcclxuXHJcbn07XHJcblxyXG5mdW5jdGlvbiBhZGRDbnRSZWMoY250UmVjIDogSUNudFJlYywgbWVtYmVyIDogc3RyaW5nLCBudW1iZXIgOiBudW1iZXIpIHtcclxuICBpZigoIWNudFJlYykgfHwgKG51bWJlciA9PT0gMCkpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgY250UmVjW21lbWJlcl0gPSAoY250UmVjW21lbWJlcl0gfHwgMCkgKyBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjYXRlZ29yaXplU3RyaW5nKHdvcmQ6IHN0cmluZywgZXhhY3Q6IGJvb2xlYW4sIG9SdWxlczogQXJyYXk8SU1hdGNoLm1SdWxlPixcclxuIGNudFJlYz8gOiBJQ250UmVjKTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IHtcclxuICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXHJcbiAgaWYoZGVidWdsb2dNLmVuYWJsZWQgKSAge1xyXG4gICAgZGVidWdsb2dNKFwicnVsZXMgOiBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlcywgdW5kZWZpbmVkLCAyKSk7XHJcbiAgfVxyXG4gIHZhciBsY1N0cmluZyA9IHdvcmQudG9Mb3dlckNhc2UoKTtcclxuICB2YXIgcmVzOiBBcnJheTxJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiA9IFtdXHJcbiAgb1J1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XHJcbiAgICBjaGVja09uZVJ1bGUod29yZCxsY1N0cmluZyxleGFjdCxyZXMsb1J1bGUsY250UmVjKTtcclxuICB9KTtcclxuICByZXMuc29ydChzb3J0QnlSYW5rKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcG9zdEZpbHRlcihyZXMgOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4pIDogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IHtcclxuICByZXMuc29ydChzb3J0QnlSYW5rKTtcclxuICB2YXIgYmVzdFJhbmsgPSAwO1xyXG4gIC8vY29uc29sZS5sb2coXCJcXG5waWx0ZXJlZCBcIiArIEpTT04uc3RyaW5naWZ5KHJlcykpO1xyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nKFwiIHByZUZpbHRlciA6IFxcblwiICsgcmVzLm1hcChmdW5jdGlvbih3b3JkKSB7XHJcbiAgICAgIHJldHVybiBgICR7d29yZC5fcmFua2luZ30gID0+IFwiJHt3b3JkLmNhdGVnb3J5fVwiICR7d29yZC5tYXRjaGVkU3RyaW5nfSBcXG5gO1xyXG4gICAgfSkuam9pbihcIlxcblwiKSk7XHJcbiAgfVxyXG4gIHZhciByID0gcmVzLmZpbHRlcihmdW5jdGlvbihyZXN4LGluZGV4KSB7XHJcbiAgICBpZihpbmRleCA9PT0gMCkge1xyXG4gICAgICBiZXN0UmFuayA9IHJlc3guX3Jhbmtpbmc7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgLy8gMS0wLjkgPSAwLjFcclxuICAgIC8vIDEtIDAuOTMgPSAwLjdcclxuICAgIC8vIDEvN1xyXG4gICAgdmFyIGRlbHRhID0gYmVzdFJhbmsgLyByZXN4Ll9yYW5raW5nO1xyXG4gICAgaWYoKHJlc3gubWF0Y2hlZFN0cmluZyA9PT0gcmVzW2luZGV4LTFdLm1hdGNoZWRTdHJpbmcpXHJcbiAgICAgICYmIChyZXN4LmNhdGVnb3J5ID09PSByZXNbaW5kZXgtMV0uY2F0ZWdvcnkpKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIC8vY29uc29sZS5sb2coXCJcXG4gZGVsdGEgZm9yIFwiICsgZGVsdGEgKyBcIiAgXCIgKyByZXN4Ll9yYW5raW5nKTtcclxuICAgIGlmIChyZXN4LmxldmVubWF0Y2ggJiYgKGRlbHRhID4gMS4wMykpIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfSk7XHJcbiAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgICBkZWJ1Z2xvZyhgXFxuZmlsdGVyZWQgJHtyLmxlbmd0aH0vJHtyZXMubGVuZ3RofWAgKyBKU09OLnN0cmluZ2lmeShyKSk7XHJcbiAgfVxyXG4gIHJldHVybiByO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVN0cmluZzIod29yZDogc3RyaW5nLCBleGFjdDogYm9vbGVhbiwgIHJ1bGVzIDogSU1hdGNoLlNwbGl0UnVsZXNcclxuICAsIGNudFJlYz8gOklDbnRSZWMpOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4ge1xyXG4gIC8vIHNpbXBseSBhcHBseSBhbGwgcnVsZXNcclxuICBpZiAoZGVidWdsb2dNLmVuYWJsZWQgKSAge1xyXG4gICAgZGVidWdsb2dNKFwicnVsZXMgOiBcIiArIEpTT04uc3RyaW5naWZ5KHJ1bGVzLHVuZGVmaW5lZCwgMikpO1xyXG4gIH1cclxuICB2YXIgbGNTdHJpbmcgPSB3b3JkLnRvTG93ZXJDYXNlKCk7XHJcbiAgdmFyIHJlczogQXJyYXk8SU1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4gPSBbXTtcclxuICBpZiAoZXhhY3QpIHtcclxuICAgIHZhciByID0gcnVsZXMud29yZE1hcFtsY1N0cmluZ107XHJcbiAgICBpZiAocikge1xyXG4gICAgICByLmZvckVhY2goZnVuY3Rpb24ob1J1bGUpIHtcclxuICAgICAgICByZXMucHVzaCh7XHJcbiAgICAgICAgICAgIHN0cmluZzogd29yZCxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcclxuICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxyXG4gICAgICAgICAgICBfcmFua2luZzogb1J1bGUuX3JhbmtpbmcgfHwgMS4wXHJcbiAgICAgICAgICB9KVxyXG4gICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcnVsZXMubm9uV29yZFJ1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XHJcbiAgICAgIGNoZWNrT25lUnVsZSh3b3JkLGxjU3RyaW5nLGV4YWN0LHJlcyxvUnVsZSxjbnRSZWMpO1xyXG4gICAgfSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIGRlYnVnbG9nKFwiY2F0ZWdvcml6ZSBub24gZXhhY3RcIiArIHdvcmQgKyBcIiB4eCAgXCIgKyBydWxlcy5hbGxSdWxlcy5sZW5ndGgpO1xyXG4gICAgcmV0dXJuIHBvc3RGaWx0ZXIoY2F0ZWdvcml6ZVN0cmluZyh3b3JkLCBleGFjdCwgcnVsZXMuYWxsUnVsZXMsIGNudFJlYykpO1xyXG4gIH1cclxuICByZXMuc29ydChzb3J0QnlSYW5rKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5cclxuXHJcbi8qKlxyXG4gKlxyXG4gKiBPcHRpb25zIG1heSBiZSB7XHJcbiAqIG1hdGNob3RoZXJzIDogdHJ1ZSwgID0+IG9ubHkgcnVsZXMgd2hlcmUgYWxsIG90aGVycyBtYXRjaCBhcmUgY29uc2lkZXJlZFxyXG4gKiBhdWdtZW50IDogdHJ1ZSxcclxuICogb3ZlcnJpZGUgOiB0cnVlIH0gID0+XHJcbiAqXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hXb3JkKG9SdWxlOiBJUnVsZSwgY29udGV4dDogSUZNYXRjaC5jb250ZXh0LCBvcHRpb25zPzogSU1hdGNoT3B0aW9ucykge1xyXG4gIGlmIChjb250ZXh0W29SdWxlLmtleV0gPT09IHVuZGVmaW5lZCkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICB9XHJcbiAgdmFyIHMxID0gY29udGV4dFtvUnVsZS5rZXldLnRvTG93ZXJDYXNlKClcclxuICB2YXIgczIgPSBvUnVsZS53b3JkLnRvTG93ZXJDYXNlKCk7XHJcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cclxuICB2YXIgZGVsdGEgPSBjb21wYXJlQ29udGV4dChjb250ZXh0LCBvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpXHJcbiAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcclxuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcclxuICB9XHJcbiAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkXHJcbiAgfVxyXG4gIHZhciBjOiBudW1iZXIgPSBjYWxjRGlzdGFuY2UoczIsIHMxKTtcclxuICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZyhcIiBzMSA8PiBzMiBcIiArIHMxICsgXCI8PlwiICsgczIgKyBcIiAgPT46IFwiICsgYyk7XHJcbiAgfVxyXG4gIGlmIChjID4gMC44MCkge1xyXG4gICAgdmFyIHJlcyA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpIGFzIGFueTtcclxuICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcclxuICAgIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XHJcbiAgICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvUnVsZS5mb2xsb3dzKTtcclxuICAgIH1cclxuICAgIC8vIGZvcmNlIGtleSBwcm9wZXJ0eVxyXG4gICAgLy8gY29uc29sZS5sb2coJyBvYmplY3RjYXRlZ29yeScsIHJlc1snc3lzdGVtT2JqZWN0Q2F0ZWdvcnknXSk7XHJcbiAgICByZXNbb1J1bGUua2V5XSA9IG9SdWxlLmZvbGxvd3Nbb1J1bGUua2V5XSB8fCByZXNbb1J1bGUua2V5XTtcclxuICAgIHJlcy5fd2VpZ2h0ID0gQW55T2JqZWN0LmFzc2lnbih7fSwgcmVzLl93ZWlnaHQpO1xyXG4gICAgcmVzLl93ZWlnaHRbb1J1bGUua2V5XSA9IGM7XHJcbiAgICBPYmplY3QuZnJlZXplKHJlcyk7XHJcbiAgICBpZiAoIGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgICAgZGVidWdsb2coJ0ZvdW5kIG9uZScgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlcztcclxuICB9XHJcbiAgcmV0dXJuIHVuZGVmaW5lZDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RBcmdzTWFwKG1hdGNoOiBBcnJheTxzdHJpbmc+LCBhcmdzTWFwOiB7IFtrZXk6IG51bWJlcl06IHN0cmluZyB9KTogSUZNYXRjaC5jb250ZXh0IHtcclxuICB2YXIgcmVzID0ge30gYXMgSUZNYXRjaC5jb250ZXh0O1xyXG4gIGlmICghYXJnc01hcCkge1xyXG4gICAgcmV0dXJuIHJlcztcclxuICB9XHJcbiAgT2JqZWN0LmtleXMoYXJnc01hcCkuZm9yRWFjaChmdW5jdGlvbiAoaUtleSkge1xyXG4gICAgdmFyIHZhbHVlID0gbWF0Y2hbaUtleV1cclxuICAgIHZhciBrZXkgPSBhcmdzTWFwW2lLZXldO1xyXG4gICAgaWYgKCh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpICYmIHZhbHVlLmxlbmd0aCA+IDApIHtcclxuICAgICAgcmVzW2tleV0gPSB2YWx1ZVxyXG4gICAgfVxyXG4gIH1cclxuICApO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBSYW5rV29yZCA9IHtcclxuICBoYXNBYm92ZTogZnVuY3Rpb24gKGxzdDogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+LCBib3JkZXI6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuICFsc3QuZXZlcnkoZnVuY3Rpb24gKG9NZW1iZXIpIHtcclxuICAgICAgcmV0dXJuIChvTWVtYmVyLl9yYW5raW5nIDwgYm9yZGVyKTtcclxuICAgIH0pO1xyXG4gIH0sXHJcblxyXG4gIHRha2VGaXJzdE46IGZ1bmN0aW9uIChsc3Q6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiwgbjogbnVtYmVyKTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IHtcclxuICAgIHJldHVybiBsc3QuZmlsdGVyKGZ1bmN0aW9uIChvTWVtYmVyLCBpSW5kZXgpIHtcclxuICAgICAgdmFyIGxhc3RSYW5raW5nID0gMS4wO1xyXG4gICAgICBpZiAoKGlJbmRleCA8IG4pIHx8IG9NZW1iZXIuX3JhbmtpbmcgPT09IGxhc3RSYW5raW5nKSB7XHJcbiAgICAgICAgbGFzdFJhbmtpbmcgPSBvTWVtYmVyLl9yYW5raW5nO1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH0pO1xyXG4gIH0sXHJcbiAgdGFrZUFib3ZlOiBmdW5jdGlvbiAobHN0OiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4sIGJvcmRlcjogbnVtYmVyKTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IHtcclxuICAgIHJldHVybiBsc3QuZmlsdGVyKGZ1bmN0aW9uIChvTWVtYmVyKSB7XHJcbiAgICAgIHJldHVybiAob01lbWJlci5fcmFua2luZyA+PSBib3JkZXIpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG59O1xyXG5cclxuLypcclxudmFyIGV4YWN0TGVuID0gMDtcclxudmFyIGZ1enp5TGVuID0gMDtcclxudmFyIGZ1enp5Q250ID0gMDtcclxudmFyIGV4YWN0Q250ID0gMDtcclxudmFyIHRvdGFsQ250ID0gMDtcclxudmFyIHRvdGFsTGVuID0gMDtcclxudmFyIHJldGFpbmVkQ250ID0gMDtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZXNldENudCgpIHtcclxuICBleGFjdExlbiA9IDA7XHJcbiAgZnV6enlMZW4gPSAwO1xyXG4gIGZ1enp5Q250ID0gMDtcclxuICBleGFjdENudCA9IDA7XHJcbiAgdG90YWxDbnQgPSAwO1xyXG4gIHRvdGFsTGVuID0gMDtcclxuICByZXRhaW5lZENudCA9IDA7XHJcbn1cclxuKi9cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmKHNXb3JkR3JvdXA6IHN0cmluZywgc3BsaXRSdWxlcyA6IElNYXRjaC5TcGxpdFJ1bGVzICwgY250UmVjPyA6IElDbnRSZWMgKTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IHtcclxuICB2YXIgc2Vlbkl0ID0gY2F0ZWdvcml6ZVN0cmluZzIoc1dvcmRHcm91cCwgdHJ1ZSwgc3BsaXRSdWxlcywgY250UmVjKTtcclxuICAvL3RvdGFsQ250ICs9IDE7XHJcbiAgLy8gZXhhY3RMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcclxuICBhZGRDbnRSZWMoY250UmVjLCAnY250Q2F0RXhhY3QnLCAxKTtcclxuICBhZGRDbnRSZWMoY250UmVjLCAnY250Q2F0RXhhY3RSZXMnLCBzZWVuSXQubGVuZ3RoKTtcclxuXHJcbiAgaWYgKFJhbmtXb3JkLmhhc0Fib3ZlKHNlZW5JdCwgMC44KSkge1xyXG4gICAgaWYoY250UmVjKSB7XHJcbiAgICAgIGFkZENudFJlYyhjbnRSZWMsICdleGFjdFByaW9yVGFrZScsIHNlZW5JdC5sZW5ndGgpXHJcbiAgICB9XHJcbiAgICBzZWVuSXQgPSBSYW5rV29yZC50YWtlQWJvdmUoc2Vlbkl0LCAwLjgpO1xyXG4gICAgaWYoY250UmVjKSB7XHJcbiAgICAgIGFkZENudFJlYyhjbnRSZWMsICdleGFjdEFmdGVyVGFrZScsIHNlZW5JdC5sZW5ndGgpXHJcbiAgICB9XHJcbiAgIC8vIGV4YWN0Q250ICs9IDE7XHJcbiAgfSBlbHNlIHtcclxuICAgIHNlZW5JdCA9IGNhdGVnb3JpemVTdHJpbmcyKHNXb3JkR3JvdXAsIGZhbHNlLCBzcGxpdFJ1bGVzLCBjbnRSZWMpO1xyXG4gICAgYWRkQ250UmVjKGNudFJlYywgJ2NudE5vbkV4YWN0JywgMSk7XHJcbiAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Tm9uRXhhY3RSZXMnLCBzZWVuSXQubGVuZ3RoKTtcclxuICAvLyAgZnV6enlMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcclxuICAvLyAgZnV6enlDbnQgKz0gMTtcclxuICB9XHJcbiAvLyB0b3RhbExlbiArPSBzZWVuSXQubGVuZ3RoO1xyXG4gIHNlZW5JdCA9IFJhbmtXb3JkLnRha2VGaXJzdE4oc2Vlbkl0LCBBbGdvbC5Ub3BfTl9Xb3JkQ2F0ZWdvcml6YXRpb25zKTtcclxuIC8vIHJldGFpbmVkQ250ICs9IHNlZW5JdC5sZW5ndGg7XHJcbiAgcmV0dXJuIHNlZW5JdDtcclxufVxyXG5cclxuLypcclxuZXhwb3J0IGZ1bmN0aW9uIGR1bXBDbnQoKSB7XHJcbiAgY29uc29sZS5sb2coYFxyXG5leGFjdExlbiA9ICR7ZXhhY3RMZW59O1xyXG5leGFjdENudCA9ICR7ZXhhY3RDbnR9O1xyXG5mdXp6eUxlbiA9ICR7ZnV6enlMZW59O1xyXG5mdXp6eUNudCA9ICR7ZnV6enlDbnR9O1xyXG50b3RhbENudCA9ICR7dG90YWxDbnR9O1xyXG50b3RhbExlbiA9ICR7dG90YWxMZW59O1xyXG5yZXRhaW5lZExlbiA9ICR7cmV0YWluZWRDbnR9O1xyXG4gIGApO1xyXG59XHJcbiovXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkU2VudGVuY2Uob1NlbnRlbmNlOiBJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdW10pOiBib29sZWFuIHtcclxuICByZXR1cm4gb1NlbnRlbmNlLmV2ZXJ5KGZ1bmN0aW9uIChvV29yZEdyb3VwKSB7XHJcbiAgICByZXR1cm4gKG9Xb3JkR3JvdXAubGVuZ3RoID4gMCk7XHJcbiAgfSk7XHJcbn1cclxuXHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZChhcnI6IElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11bXVtdKTogSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXVtdW10ge1xyXG4gIHJldHVybiBhcnIuZmlsdGVyKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcclxuICAgIHJldHVybiBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWRTZW50ZW5jZShvU2VudGVuY2UpO1xyXG4gIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZUFXb3JkKHNXb3JkR3JvdXA6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCBzZW50ZW5jZTogc3RyaW5nLCB3b3JkczogeyBba2V5OiBzdHJpbmddOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz59LFxyXG5jbnRSZWMgPyA6IElDbnRSZWMgKSA6IElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXSB7XHJcbiAgdmFyIHNlZW5JdCA9IHdvcmRzW3NXb3JkR3JvdXBdO1xyXG4gIGlmIChzZWVuSXQgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgc2Vlbkl0ID0gY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZihzV29yZEdyb3VwLCBydWxlcywgY250UmVjKTtcclxuICAgIHV0aWxzLmRlZXBGcmVlemUoc2Vlbkl0KTtcclxuICAgIHdvcmRzW3NXb3JkR3JvdXBdID0gc2Vlbkl0O1xyXG4gIH1cclxuICBpZiAoIXNlZW5JdCB8fCBzZWVuSXQubGVuZ3RoID09PSAwKSB7XHJcbiAgICBsb2dnZXIoXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBcXFwiXCIgKyBzV29yZEdyb3VwICsgXCJcXFwiIGluIHNlbnRlbmNlIFxcXCJcIlxyXG4gICAgICArIHNlbnRlbmNlICsgXCJcXFwiXCIpO1xyXG4gICAgaWYgKHNXb3JkR3JvdXAuaW5kZXhPZihcIiBcIikgPD0gMCkge1xyXG4gICAgICBkZWJ1Z2xvZyhcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIHByaW1pdGl2ZSAoISlcIiArIHNXb3JkR3JvdXApO1xyXG4gICAgfVxyXG4gICAgZGVidWdsb2coXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBcIiArIHNXb3JkR3JvdXApO1xyXG4gICAgaWYgKCFzZWVuSXQpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0aW5nIGVtdHB5IGxpc3QsIG5vdCB1bmRlZmluZWQgZm9yIFxcXCJcIiArIHNXb3JkR3JvdXAgKyBcIlxcXCJcIilcclxuICAgIH1cclxuICAgIHdvcmRzW3NXb3JkR3JvdXBdID0gW11cclxuICAgIHJldHVybiBbXTtcclxuICB9XHJcbiAgcmV0dXJuIHV0aWxzLmNsb25lRGVlcChzZWVuSXQpO1xyXG59XHJcblxyXG5cclxuLyoqXHJcbiAqIEdpdmVuIGEgIHN0cmluZywgYnJlYWsgaXQgZG93biBpbnRvIGNvbXBvbmVudHMsXHJcbiAqIFtbJ0EnLCAnQiddLCBbJ0EgQiddXVxyXG4gKlxyXG4gKiB0aGVuIGNhdGVnb3JpemVXb3Jkc1xyXG4gKiByZXR1cm5pbmdcclxuICpcclxuICogWyBbWyB7IGNhdGVnb3J5OiAnc3lzdGVtSWQnLCB3b3JkIDogJ0EnfSxcclxuICogICAgICB7IGNhdGVnb3J5OiAnb3RoZXJ0aGluZycsIHdvcmQgOiAnQSd9XHJcbiAqICAgIF0sXHJcbiAqICAgIC8vIHJlc3VsdCBvZiBCXHJcbiAqICAgIFsgeyBjYXRlZ29yeTogJ3N5c3RlbUlkJywgd29yZCA6ICdCJ30sXHJcbiAqICAgICAgeyBjYXRlZ29yeTogJ290aGVydGhpbmcnLCB3b3JkIDogJ0EnfVxyXG4gKiAgICAgIHsgY2F0ZWdvcnk6ICdhbm90aGVydHJ5cCcsIHdvcmQgOiAnQid9XHJcbiAqICAgIF1cclxuICogICBdLFxyXG4gKiBdXV1cclxuICpcclxuICpcclxuICpcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBhbmFseXplU3RyaW5nKHNTdHJpbmc6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLFxyXG4gIHdvcmRzPzogeyBba2V5OiBzdHJpbmddOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4gfSlcclxuICA6IFsgWyBJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11dIF1cclxuICAge1xyXG4gIHZhciBjbnQgPSAwO1xyXG4gIHZhciBmYWMgPSAxO1xyXG4gIHZhciB1ID0gYnJlYWtkb3duLmJyZWFrZG93blN0cmluZyhzU3RyaW5nLCBBbGdvbC5NYXhTcGFjZXNQZXJDb21iaW5lZFdvcmQpO1xyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nKFwiaGVyZSBicmVha2Rvd25cIiArIEpTT04uc3RyaW5naWZ5KHUpKTtcclxuICB9XHJcbiAgLy9jb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeSh1KSk7XHJcbiAgd29yZHMgPSB3b3JkcyB8fCB7fTtcclxuICBkZWJ1Z3BlcmYoJ3RoaXMgbWFueSBrbm93biB3b3JkczogJyArIE9iamVjdC5rZXlzKHdvcmRzKS5sZW5ndGgpO1xyXG4gIHZhciByZXMgPSBbXSBhcyBbWyBJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11dIF07XHJcbiAgdmFyIGNudFJlYyA9IHt9O1xyXG4gIHUuZm9yRWFjaChmdW5jdGlvbiAoYUJyZWFrRG93blNlbnRlbmNlKSB7XHJcbiAgICAgIHZhciBjYXRlZ29yaXplZFNlbnRlbmNlID0gW10gYXMgWyBJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW10gXTtcclxuICAgICAgdmFyIGlzVmFsaWQgPSBhQnJlYWtEb3duU2VudGVuY2UuZXZlcnkoZnVuY3Rpb24gKHNXb3JkR3JvdXA6IHN0cmluZywgaW5kZXggOiBudW1iZXIpIHtcclxuICAgICAgICB2YXIgc2Vlbkl0ID0gY2F0ZWdvcml6ZUFXb3JkKHNXb3JkR3JvdXAsIHJ1bGVzLCBzU3RyaW5nLCB3b3JkcywgY250UmVjKTtcclxuICAgICAgICBpZihzZWVuSXQubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhdGVnb3JpemVkU2VudGVuY2VbaW5kZXhdID0gc2Vlbkl0O1xyXG4gICAgICAgIGNudCA9IGNudCArIHNlZW5JdC5sZW5ndGg7XHJcbiAgICAgICAgZmFjID0gZmFjICogc2Vlbkl0Lmxlbmd0aDtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgfSk7XHJcbiAgICAgIGlmKGlzVmFsaWQpIHtcclxuICAgICAgICByZXMucHVzaChjYXRlZ29yaXplZFNlbnRlbmNlKTtcclxuICAgICAgfVxyXG4gIH0pO1xyXG4gIGRlYnVnbG9nKFwiIHNlbnRlbmNlcyBcIiArIHUubGVuZ3RoICsgXCIgbWF0Y2hlcyBcIiArIGNudCArIFwiIGZhYzogXCIgKyBmYWMpO1xyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQgJiYgdS5sZW5ndGgpIHtcclxuICAgIGRlYnVnbG9nKFwiZmlyc3QgbWF0Y2ggXCIrIEpTT04uc3RyaW5naWZ5KHUsdW5kZWZpbmVkLDIpKTtcclxuICB9XHJcbiAgZGVidWdwZXJmKFwiIHNlbnRlbmNlcyBcIiArIHUubGVuZ3RoICsgXCIgLyBcIiArIHJlcy5sZW5ndGggKyAgXCIgbWF0Y2hlcyBcIiArIGNudCArIFwiIGZhYzogXCIgKyBmYWMgKyBcIiByZWMgOiBcIiArIEpTT04uc3RyaW5naWZ5KGNudFJlYyx1bmRlZmluZWQsMikpO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbi8qXHJcblsgW2EsYl0sIFtjLGRdXVxyXG5cclxuMDAgYVxyXG4wMSBiXHJcbjEwIGNcclxuMTEgZFxyXG4xMiBjXHJcbiovXHJcblxyXG5cclxuY29uc3QgY2xvbmUgPSB1dGlscy5jbG9uZURlZXA7XHJcblxyXG5cclxuZnVuY3Rpb24gY29weVZlY01lbWJlcnModSkge1xyXG4gIHZhciBpID0gMDtcclxuICBmb3IoaSA9IDA7IGkgPCB1Lmxlbmd0aDsgKytpKSB7XHJcbiAgICB1W2ldID0gY2xvbmUodVtpXSk7XHJcbiAgfVxyXG4gIHJldHVybiB1O1xyXG59XHJcbi8vIHdlIGNhbiByZXBsaWNhdGUgdGhlIHRhaWwgb3IgdGhlIGhlYWQsXHJcbi8vIHdlIHJlcGxpY2F0ZSB0aGUgdGFpbCBhcyBpdCBpcyBzbWFsbGVyLlxyXG5cclxuLy8gW2EsYixjIF1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBleHBhbmRNYXRjaEFycihkZWVwOiBBcnJheTxBcnJheTxhbnk+Pik6IEFycmF5PEFycmF5PGFueT4+IHtcclxuICB2YXIgYSA9IFtdO1xyXG4gIHZhciBsaW5lID0gW107XHJcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IEpTT04uc3RyaW5naWZ5KGRlZXApIDogJy0nKTtcclxuICBkZWVwLmZvckVhY2goZnVuY3Rpb24gKHVCcmVha0Rvd25MaW5lLCBpSW5kZXg6IG51bWJlcikge1xyXG4gICAgbGluZVtpSW5kZXhdID0gW107XHJcbiAgICB1QnJlYWtEb3duTGluZS5mb3JFYWNoKGZ1bmN0aW9uIChhV29yZEdyb3VwLCB3Z0luZGV4OiBudW1iZXIpIHtcclxuICAgICAgbGluZVtpSW5kZXhdW3dnSW5kZXhdID0gW107XHJcbiAgICAgIGFXb3JkR3JvdXAuZm9yRWFjaChmdW5jdGlvbiAob1dvcmRWYXJpYW50LCBpV1ZJbmRleDogbnVtYmVyKSB7XHJcbiAgICAgICAgbGluZVtpSW5kZXhdW3dnSW5kZXhdW2lXVkluZGV4XSA9IG9Xb3JkVmFyaWFudDtcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9KVxyXG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGxpbmUpKTtcclxuICB2YXIgcmVzID0gW107XHJcbiAgdmFyIG52ZWNzID0gW107XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lLmxlbmd0aDsgKytpKSB7XHJcbiAgICB2YXIgdmVjcyA9IFtbXV07XHJcbiAgICB2YXIgbnZlY3MgPSBbXTtcclxuICAgIHZhciBydmVjID0gW107XHJcbiAgICBmb3IgKHZhciBrID0gMDsgayA8IGxpbmVbaV0ubGVuZ3RoOyArK2spIHsgLy8gd29yZGdyb3VwIGtcclxuICAgICAgLy92ZWNzIGlzIHRoZSB2ZWN0b3Igb2YgYWxsIHNvIGZhciBzZWVuIHZhcmlhbnRzIHVwIHRvIGsgd2dzLlxyXG4gICAgICB2YXIgbmV4dEJhc2UgPSBbXTtcclxuICAgICAgZm9yICh2YXIgbCA9IDA7IGwgPCBsaW5lW2ldW2tdLmxlbmd0aDsgKytsKSB7IC8vIGZvciBlYWNoIHZhcmlhbnRcclxuICAgICAgICAvL2RlYnVnbG9nKFwidmVjcyBub3dcIiArIEpTT04uc3RyaW5naWZ5KHZlY3MpKTtcclxuICAgICAgICBudmVjcyA9IFtdOyAvL3ZlY3Muc2xpY2UoKTsgLy8gY29weSB0aGUgdmVjW2ldIGJhc2UgdmVjdG9yO1xyXG4gICAgICAgIC8vZGVidWdsb2coXCJ2ZWNzIGNvcGllZCBub3dcIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSk7XHJcbiAgICAgICAgZm9yICh2YXIgdSA9IDA7IHUgPCB2ZWNzLmxlbmd0aDsgKyt1KSB7XHJcbiAgICAgICAgICBudmVjc1t1XSA9IHZlY3NbdV0uc2xpY2UoKTsgLy9cclxuICAgICAgICAgIG52ZWNzW3VdID0gY29weVZlY01lbWJlcnMobnZlY3NbdV0pO1xyXG4gICAgICAgICAgLy8gZGVidWdsb2coXCJjb3BpZWQgdmVjc1tcIisgdStcIl1cIiArIEpTT04uc3RyaW5naWZ5KHZlY3NbdV0pKTtcclxuICAgICAgICAgIG52ZWNzW3VdLnB1c2goXHJcbiAgICAgICAgICAgIGNsb25lKGxpbmVbaV1ba11bbF0pKTsgLy8gcHVzaCB0aGUgbHRoIHZhcmlhbnRcclxuICAgICAgICAgIC8vIGRlYnVnbG9nKFwibm93IG52ZWNzIFwiICsgbnZlY3MubGVuZ3RoICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyAgIGRlYnVnbG9nKFwiIGF0ICAgICBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiBuZXh0YmFzZSA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpXHJcbiAgICAgICAgLy8gICBkZWJ1Z2xvZyhcIiBhcHBlbmQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbnZlY3MgICAgPlwiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKVxyXG4gICAgICAgIG5leHRCYXNlID0gbmV4dEJhc2UuY29uY2F0KG52ZWNzKTtcclxuICAgICAgICAvLyAgIGRlYnVnbG9nKFwiICByZXN1bHQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbnZlY3MgICAgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxyXG4gICAgICB9IC8vY29uc3RydVxyXG4gICAgICAvLyAgZGVidWdsb2coXCJub3cgYXQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxyXG4gICAgICB2ZWNzID0gbmV4dEJhc2U7XHJcbiAgICB9XHJcbiAgICBkZWJ1Z2xvZ1YoZGVidWdsb2dWLmVuYWJsZWQgPyAoXCJBUFBFTkRJTkcgVE8gUkVTXCIgKyBpICsgXCI6XCIgKyBsICsgXCIgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKSA6ICctJyk7XHJcbiAgICByZXMgPSByZXMuY29uY2F0KHZlY3MpO1xyXG4gIH1cclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5cclxuLyoqXHJcbiAqIENhbGN1bGF0ZSBhIHdlaWdodCBmYWN0b3IgZm9yIGEgZ2l2ZW4gZGlzdGFuY2UgYW5kXHJcbiAqIGNhdGVnb3J5XHJcbiAqIEBwYXJhbSB7aW50ZWdlcn0gZGlzdCBkaXN0YW5jZSBpbiB3b3Jkc1xyXG4gKiBAcGFyYW0ge3N0cmluZ30gY2F0ZWdvcnkgY2F0ZWdvcnkgdG8gdXNlXHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IGEgZGlzdGFuY2UgZmFjdG9yID49IDFcclxuICogIDEuMCBmb3Igbm8gZWZmZWN0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcmVpbmZvcmNlRGlzdFdlaWdodChkaXN0OiBudW1iZXIsIGNhdGVnb3J5OiBzdHJpbmcpOiBudW1iZXIge1xyXG4gIHZhciBhYnMgPSBNYXRoLmFicyhkaXN0KTtcclxuICByZXR1cm4gMS4wICsgKEFsZ29sLmFSZWluZm9yY2VEaXN0V2VpZ2h0W2Fic10gfHwgMCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHaXZlbiBhIHNlbnRlbmNlLCBleHRhY3QgY2F0ZWdvcmllc1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RDYXRlZ29yeU1hcChvU2VudGVuY2U6IEFycmF5PElGTWF0Y2guSVdvcmQ+KTogeyBba2V5OiBzdHJpbmddOiBBcnJheTx7IHBvczogbnVtYmVyIH0+IH0ge1xyXG4gIHZhciByZXMgPSB7fTtcclxuICBkZWJ1Z2xvZygnZXh0cmFjdENhdGVnb3J5TWFwICcgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpKTtcclxuICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGlJbmRleCkge1xyXG4gICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBJRk1hdGNoLkNBVF9DQVRFR09SWSkge1xyXG4gICAgICByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10gfHwgW107XHJcbiAgICAgIHJlc1tvV29yZC5tYXRjaGVkU3RyaW5nXS5wdXNoKHsgcG9zOiBpSW5kZXggfSk7XHJcbiAgICB9XHJcbiAgfSk7XHJcbiAgdXRpbHMuZGVlcEZyZWV6ZShyZXMpO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWluRm9yY2VTZW50ZW5jZShvU2VudGVuY2UpIHtcclxuICBcInVzZSBzdHJpY3RcIjtcclxuICB2YXIgb0NhdGVnb3J5TWFwID0gZXh0cmFjdENhdGVnb3J5TWFwKG9TZW50ZW5jZSk7XHJcbiAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpSW5kZXgpIHtcclxuICAgIHZhciBtID0gb0NhdGVnb3J5TWFwW29Xb3JkLmNhdGVnb3J5XSB8fCBbXTtcclxuICAgIG0uZm9yRWFjaChmdW5jdGlvbiAob1Bvc2l0aW9uOiB7IHBvczogbnVtYmVyIH0pIHtcclxuICAgICAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgICAgIG9Xb3JkLnJlaW5mb3JjZSA9IG9Xb3JkLnJlaW5mb3JjZSB8fCAxO1xyXG4gICAgICB2YXIgYm9vc3QgPSByZWluZm9yY2VEaXN0V2VpZ2h0KGlJbmRleCAtIG9Qb3NpdGlvbi5wb3MsIG9Xb3JkLmNhdGVnb3J5KTtcclxuICAgICAgb1dvcmQucmVpbmZvcmNlICo9IGJvb3N0O1xyXG4gICAgICBvV29yZC5fcmFua2luZyAqPSBib29zdDtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG4gIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaUluZGV4KSB7XHJcbiAgICBpZiAoaUluZGV4ID4gMCApIHtcclxuICAgICAgaWYgKG9TZW50ZW5jZVtpSW5kZXgtMV0uY2F0ZWdvcnkgPT09IFwibWV0YVwiICAmJiAob1dvcmQuY2F0ZWdvcnkgPT09IG9TZW50ZW5jZVtpSW5kZXgtMV0ubWF0Y2hlZFN0cmluZykgKSB7XHJcbiAgICAgICAgb1dvcmQucmVpbmZvcmNlID0gb1dvcmQucmVpbmZvcmNlIHx8IDE7XHJcbiAgICAgICAgdmFyIGJvb3N0ID0gcmVpbmZvcmNlRGlzdFdlaWdodCgxLCBvV29yZC5jYXRlZ29yeSk7XHJcbiAgICAgICAgb1dvcmQucmVpbmZvcmNlICo9IGJvb3N0O1xyXG4gICAgICAgIG9Xb3JkLl9yYW5raW5nICo9IGJvb3N0O1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSk7XHJcbiAgcmV0dXJuIG9TZW50ZW5jZTtcclxufVxyXG5cclxuXHJcbmltcG9ydCAqIGFzIFNlbnRlbmNlIGZyb20gJy4vc2VudGVuY2UnO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlaW5Gb3JjZShhQ2F0ZWdvcml6ZWRBcnJheSkge1xyXG4gIFwidXNlIHN0cmljdFwiO1xyXG4gIGFDYXRlZ29yaXplZEFycmF5LmZvckVhY2goZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xyXG4gICAgcmVpbkZvcmNlU2VudGVuY2Uob1NlbnRlbmNlKTtcclxuICB9KVxyXG4gIGFDYXRlZ29yaXplZEFycmF5LnNvcnQoU2VudGVuY2UuY21wUmFua2luZ1Byb2R1Y3QpO1xyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nKFwiYWZ0ZXIgcmVpbmZvcmNlXCIgKyBhQ2F0ZWdvcml6ZWRBcnJheS5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xyXG4gICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcclxuICAgIH0pLmpvaW4oXCJcXG5cIikpO1xyXG4gIH1cclxuICByZXR1cm4gYUNhdGVnb3JpemVkQXJyYXk7XHJcbn1cclxuXHJcblxyXG4vLy8gYmVsb3cgbWF5IG5vIGxvbmdlciBiZSB1c2VkXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hSZWdFeHAob1J1bGU6IElSdWxlLCBjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQsIG9wdGlvbnM/OiBJTWF0Y2hPcHRpb25zKSB7XHJcbiAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICB2YXIgc0tleSA9IG9SdWxlLmtleTtcclxuICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKVxyXG4gIHZhciByZWcgPSBvUnVsZS5yZWdleHA7XHJcblxyXG4gIHZhciBtID0gcmVnLmV4ZWMoczEpO1xyXG4gIGlmKGRlYnVnbG9nVi5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZ1YoXCJhcHBseWluZyByZWdleHA6IFwiICsgczEgKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KG0pKTtcclxuICB9XHJcbiAgaWYgKCFtKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxyXG4gIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsIG9SdWxlLmZvbGxvd3MsIG9SdWxlLmtleSlcclxuICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nVihKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xyXG4gICAgZGVidWdsb2dWKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcclxuICB9XHJcbiAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkXHJcbiAgfVxyXG4gIHZhciBvRXh0cmFjdGVkQ29udGV4dCA9IGV4dHJhY3RBcmdzTWFwKG0sIG9SdWxlLmFyZ3NNYXApO1xyXG4gIGlmIChkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xyXG4gICAgZGVidWdsb2dWKFwiZXh0cmFjdGVkIGFyZ3MgXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZS5hcmdzTWFwKSk7XHJcbiAgICBkZWJ1Z2xvZ1YoXCJtYXRjaCBcIiArIEpTT04uc3RyaW5naWZ5KG0pKTtcclxuICAgIGRlYnVnbG9nVihcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob0V4dHJhY3RlZENvbnRleHQpKTtcclxuICB9XHJcbiAgdmFyIHJlcyA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpIGFzIGFueTtcclxuICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpO1xyXG4gIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcclxuICBpZiAob0V4dHJhY3RlZENvbnRleHRbc0tleV0gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgcmVzW3NLZXldID0gb0V4dHJhY3RlZENvbnRleHRbc0tleV07XHJcbiAgfVxyXG4gIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XHJcbiAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb1J1bGUuZm9sbG93cyk7XHJcbiAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpXHJcbiAgfVxyXG4gIE9iamVjdC5mcmVlemUocmVzKTtcclxuICBkZWJ1Z2xvZygnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNvcnRCeVdlaWdodChzS2V5OiBzdHJpbmcsIG9Db250ZXh0QTogSUZNYXRjaC5jb250ZXh0LCBvQ29udGV4dEI6IElGTWF0Y2guY29udGV4dCk6IG51bWJlciB7XHJcbiAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nVignc29ydGluZzogJyArIHNLZXkgKyAnaW52b2tlZCB3aXRoXFxuIDE6JyArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QSwgdW5kZWZpbmVkLCAyKSArXHJcbiAgICBcIiB2cyBcXG4gMjpcIiArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QiwgdW5kZWZpbmVkLCAyKSk7XHJcbiAgfVxyXG4gIHZhciByYW5raW5nQTogbnVtYmVyID0gcGFyc2VGbG9hdChvQ29udGV4dEFbXCJfcmFua2luZ1wiXSB8fCBcIjFcIik7XHJcbiAgdmFyIHJhbmtpbmdCOiBudW1iZXIgPSBwYXJzZUZsb2F0KG9Db250ZXh0QltcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcclxuICBpZiAocmFua2luZ0EgIT09IHJhbmtpbmdCKSB7XHJcbiAgICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAgIGRlYnVnbG9nKFwiIHJhbmtpbiBkZWx0YVwiICsgMTAwICogKHJhbmtpbmdCIC0gcmFua2luZ0EpKTtcclxuICAgIH1cclxuICAgIHJldHVybiAxMDAgKiAocmFua2luZ0IgLSByYW5raW5nQSlcclxuICB9XHJcblxyXG4gIHZhciB3ZWlnaHRBID0gb0NvbnRleHRBW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdW3NLZXldIHx8IDA7XHJcbiAgdmFyIHdlaWdodEIgPSBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QltcIl93ZWlnaHRcIl1bc0tleV0gfHwgMDtcclxuICByZXR1cm4gKyh3ZWlnaHRCIC0gd2VpZ2h0QSk7XHJcbn1cclxuXHJcblxyXG4vLyBXb3JkLCBTeW5vbnltLCBSZWdleHAgLyBFeHRyYWN0aW9uUnVsZVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0MShjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQsIG9SdWxlczogQXJyYXk8SVJ1bGU+LCBvcHRpb25zOiBJTWF0Y2hPcHRpb25zKTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgdmFyIHNLZXkgPSBvUnVsZXNbMF0ua2V5O1xyXG4gIC8vIGNoZWNrIHRoYXQgcnVsZVxyXG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAvLyBjaGVjayBjb25zaXN0ZW5jeVxyXG4gICAgb1J1bGVzLmV2ZXJ5KGZ1bmN0aW9uIChpUnVsZSkge1xyXG4gICAgICBpZiAoaVJ1bGUua2V5ICE9PSBzS2V5KSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW5ob21vZ2Vub3VzIGtleXMgaW4gcnVsZXMsIGV4cGVjdGVkIFwiICsgc0tleSArIFwiIHdhcyBcIiArIEpTT04uc3RyaW5naWZ5KGlSdWxlKSk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vIGxvb2sgZm9yIHJ1bGVzIHdoaWNoIG1hdGNoXHJcbiAgdmFyIHJlcyA9IG9SdWxlcy5tYXAoZnVuY3Rpb24gKG9SdWxlKSB7XHJcbiAgICAvLyBpcyB0aGlzIHJ1bGUgYXBwbGljYWJsZVxyXG4gICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuV09SRDpcclxuICAgICAgICByZXR1cm4gbWF0Y2hXb3JkKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKVxyXG4gICAgICBjYXNlIElGTWF0Y2guRW51bVJ1bGVUeXBlLlJFR0VYUDpcclxuICAgICAgICByZXR1cm4gbWF0Y2hSZWdFeHAob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xyXG4gICAgICAvLyAgIGNhc2UgXCJFeHRyYWN0aW9uXCI6XHJcbiAgICAgIC8vICAgICByZXR1cm4gbWF0Y2hFeHRyYWN0aW9uKG9SdWxlLGNvbnRleHQpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gIH0pLmZpbHRlcihmdW5jdGlvbiAob3Jlcykge1xyXG4gICAgcmV0dXJuICEhb3Jlc1xyXG4gIH0pLnNvcnQoXHJcbiAgICBzb3J0QnlXZWlnaHQuYmluZCh0aGlzLCBzS2V5KVxyXG4gICAgKTtcclxuICAgIC8vZGVidWdsb2coXCJoYXNzb3J0ZWRcIiArIEpTT04uc3RyaW5naWZ5KHJlcyx1bmRlZmluZWQsMikpO1xyXG4gIHJldHVybiByZXM7XHJcbiAgLy8gT2JqZWN0LmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XHJcbiAgLy8gfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhdWdtZW50Q29udGV4dChjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQsIGFSdWxlczogQXJyYXk8SVJ1bGU+KTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcblxyXG4gIHZhciBvcHRpb25zMTogSU1hdGNoT3B0aW9ucyA9IHtcclxuICAgIG1hdGNob3RoZXJzOiB0cnVlLFxyXG4gICAgb3ZlcnJpZGU6IGZhbHNlXHJcbiAgfSBhcyBJTWF0Y2hPcHRpb25zO1xyXG5cclxuICB2YXIgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMxKVxyXG5cclxuICBpZiAoYVJlcy5sZW5ndGggPT09IDApIHtcclxuICAgIHZhciBvcHRpb25zMjogSU1hdGNoT3B0aW9ucyA9IHtcclxuICAgICAgbWF0Y2hvdGhlcnM6IGZhbHNlLFxyXG4gICAgICBvdmVycmlkZTogdHJ1ZVxyXG4gICAgfSBhcyBJTWF0Y2hPcHRpb25zO1xyXG4gICAgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMyKTtcclxuICB9XHJcbiAgcmV0dXJuIGFSZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBpbnNlcnRPcmRlcmVkKHJlc3VsdDogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiwgaUluc2VydGVkTWVtYmVyOiBJRk1hdGNoLmNvbnRleHQsIGxpbWl0OiBudW1iZXIpOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICAvLyBUT0RPOiB1c2Ugc29tZSB3ZWlnaHRcclxuICBpZiAocmVzdWx0Lmxlbmd0aCA8IGxpbWl0KSB7XHJcbiAgICByZXN1bHQucHVzaChpSW5zZXJ0ZWRNZW1iZXIpXHJcbiAgfVxyXG4gIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdGFrZVRvcE4oYXJyOiBBcnJheTxBcnJheTxJRk1hdGNoLmNvbnRleHQ+Pik6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIHZhciB1ID0gYXJyLmZpbHRlcihmdW5jdGlvbiAoaW5uZXJBcnIpIHsgcmV0dXJuIGlubmVyQXJyLmxlbmd0aCA+IDAgfSlcclxuXHJcbiAgdmFyIHJlcyA9IFtdO1xyXG4gIC8vIHNoaWZ0IG91dCB0aGUgdG9wIG9uZXNcclxuICB1ID0gdS5tYXAoZnVuY3Rpb24gKGlBcnIpIHtcclxuICAgIHZhciB0b3AgPSBpQXJyLnNoaWZ0KCk7XHJcbiAgICByZXMgPSBpbnNlcnRPcmRlcmVkKHJlcywgdG9wLCA1KVxyXG4gICAgcmV0dXJuIGlBcnJcclxuICB9KS5maWx0ZXIoZnVuY3Rpb24gKGlubmVyQXJyOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+KTogYm9vbGVhbiB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwIH0pO1xyXG4gIC8vIGFzIEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuaW1wb3J0ICogYXMgaW5wdXRGaWx0ZXJSdWxlcyBmcm9tICcuL2lucHV0RmlsdGVyUnVsZXMnO1xyXG5cclxudmFyIHJtO1xyXG5cclxuZnVuY3Rpb24gZ2V0Uk1PbmNlKCkge1xyXG4gIGlmICghcm0pIHtcclxuICAgIHJtID0gaW5wdXRGaWx0ZXJSdWxlcy5nZXRSdWxlTWFwKClcclxuICB9XHJcbiAgcmV0dXJuIHJtO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlSdWxlcyhjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQpOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICB2YXIgYmVzdE46IEFycmF5PElGTWF0Y2guY29udGV4dD4gPSBbY29udGV4dF07XHJcbiAgaW5wdXRGaWx0ZXJSdWxlcy5vS2V5T3JkZXIuZm9yRWFjaChmdW5jdGlvbiAoc0tleTogc3RyaW5nKSB7XHJcbiAgICB2YXIgYmVzdE5leHQ6IEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+ID0gW107XHJcbiAgICBiZXN0Ti5mb3JFYWNoKGZ1bmN0aW9uIChvQ29udGV4dDogSUZNYXRjaC5jb250ZXh0KSB7XHJcbiAgICAgIGlmIChvQ29udGV4dFtzS2V5XSkge1xyXG4gICAgICAgIGRlYnVnbG9nKCcqKiBhcHBseWluZyBydWxlcyBmb3IgJyArIHNLZXkpXHJcbiAgICAgICAgdmFyIHJlcyA9IGF1Z21lbnRDb250ZXh0KG9Db250ZXh0LCBnZXRSTU9uY2UoKVtzS2V5XSB8fCBbXSlcclxuICAgICAgICBkZWJ1Z2xvZygnKiogcmVzdWx0IGZvciAnICsgc0tleSArICcgPSAnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKVxyXG4gICAgICAgIGJlc3ROZXh0LnB1c2gocmVzIHx8IFtdKVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIHJ1bGUgbm90IHJlbGV2YW50XHJcbiAgICAgICAgYmVzdE5leHQucHVzaChbb0NvbnRleHRdKTtcclxuICAgICAgfVxyXG4gICAgfSlcclxuICAgIGJlc3ROID0gdGFrZVRvcE4oYmVzdE5leHQpO1xyXG4gIH0pO1xyXG4gIHJldHVybiBiZXN0TlxyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UnVsZXNQaWNrRmlyc3QoY29udGV4dDogSUZNYXRjaC5jb250ZXh0KTogSUZNYXRjaC5jb250ZXh0IHtcclxuICB2YXIgciA9IGFwcGx5UnVsZXMoY29udGV4dCk7XHJcbiAgcmV0dXJuIHIgJiYgclswXTtcclxufVxyXG5cclxuLyoqXHJcbiAqIERlY2lkZSB3aGV0aGVyIHRvIHJlcXVlcnkgZm9yIGEgY29udGV0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZGVjaWRlT25SZVF1ZXJ5KGNvbnRleHQ6IElGTWF0Y2guY29udGV4dCk6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIHJldHVybiBbXVxyXG59XHJcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
