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

var distance = require("../utils/damerauLevenshtein");
var Logger = require("../utils/logger");
var logger = Logger.logger('inputFilter');
var debug = require("debug");
var debugperf = debug('perf');
var utils = require("../utils/utils");
var Algol = require("./algol");
var breakdown = require("./breakdown");
var AnyObject = Object;
var debuglog = debug('inputFilter');
var debuglogV = debug('inputVFilter');
var debuglogM = debug('inputMFilter');
var matchdata = require("./matchdata");
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
var IFMatch = require("../match/ifmatch");
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
            r.rules.forEach(function (oRule) {
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
    debuglog(debuglog.enabled ? JSON.stringify(line) : '-');
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
    debuglog(debuglog.enabled ? 'extractCategoryMap ' + JSON.stringify(oSentence) : '-');
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
var Sentence = require("./sentence");
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
    debuglog(debuglog.enabled ? 'Found one' + JSON.stringify(res, undefined, 2) : '-');
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
var inputFilterRules = require("./inputFilterRules");
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
                debuglog(debuglog.enabled ? '** result for ' + sKey + ' = ' + JSON.stringify(res, undefined, 2) : '-');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1hdGNoL2lucHV0RmlsdGVyLmpzIiwiLi4vc3JjL21hdGNoL2lucHV0RmlsdGVyLnRzIl0sIm5hbWVzIjpbImRpc3RhbmNlIiwicmVxdWlyZSIsIkxvZ2dlciIsImxvZ2dlciIsImRlYnVnIiwiZGVidWdwZXJmIiwidXRpbHMiLCJBbGdvbCIsImJyZWFrZG93biIsIkFueU9iamVjdCIsIk9iamVjdCIsImRlYnVnbG9nIiwiZGVidWdsb2dWIiwiZGVidWdsb2dNIiwibWF0Y2hkYXRhIiwib1VuaXRUZXN0cyIsImNudENoYXJzIiwic3RyIiwibGVuIiwiY250IiwiaSIsImNoYXJBdCIsImNhbGNEaXN0YW5jZSIsInNUZXh0MSIsInNUZXh0MiIsInMxbGVuIiwibGVuZ3RoIiwiczJsZW4iLCJtaW4iLCJNYXRoIiwiYWJzIiwiZGlzdCIsImphcm9XaW5rbGVyRGlzdGFuY2UiLCJjbnQxIiwiY250MiIsImV4cG9ydHMiLCJjYWxjRGlzdGFuY2VMZXZlbiIsImNhbGNEaXN0IiwibGVuZ3RoRGVsdGExIiwiYTAiLCJsZXZlbnNodGVpbiIsInN1YnN0cmluZyIsImVuYWJsZWQiLCJhIiwiSUZNYXRjaCIsImxldmVuUGVuYWx0eU9sZCIsImxldmVuUGVuYWx0eSIsIm5vblByaXZhdGVLZXlzIiwib0EiLCJrZXlzIiwiZmlsdGVyIiwia2V5IiwiY291bnRBaW5CIiwib0IiLCJmbkNvbXBhcmUiLCJhS2V5SWdub3JlIiwiQXJyYXkiLCJpc0FycmF5IiwiaW5kZXhPZiIsInJlZHVjZSIsInByZXYiLCJwcm90b3R5cGUiLCJoYXNPd25Qcm9wZXJ0eSIsImNhbGwiLCJzcHVyaW91c0Fub3RJbkIiLCJsb3dlckNhc2UiLCJvIiwidG9Mb3dlckNhc2UiLCJjb21wYXJlQ29udGV4dCIsImVxdWFsIiwiYiIsImRpZmZlcmVudCIsInNwdXJpb3VzTCIsInNwdXJpb3VzUiIsInNvcnRCeVJhbmsiLCJyIiwiX3JhbmtpbmciLCJjYXRlZ29yeSIsImxvY2FsZUNvbXBhcmUiLCJtYXRjaGVkU3RyaW5nIiwiY2hlY2tPbmVSdWxlIiwic3RyaW5nIiwibGNTdHJpbmciLCJleGFjdCIsInJlcyIsIm9SdWxlIiwiY250UmVjIiwiSlNPTiIsInN0cmluZ2lmeSIsInR5cGUiLCJsb3dlcmNhc2V3b3JkIiwiRXJyb3IiLCJ1bmRlZmluZWQiLCJ3b3JkIiwicHVzaCIsImV4YWN0T25seSIsImxldmVubWF0Y2giLCJDdXRvZmZfV29yZE1hdGNoIiwiYWRkQ250UmVjIiwicmVjIiwidG9GaXhlZCIsIm0iLCJyZWdleHAiLCJleGVjIiwibWF0Y2hJbmRleCIsIm1lbWJlciIsIm51bWJlciIsImNhdGVnb3JpemVTdHJpbmciLCJvUnVsZXMiLCJmb3JFYWNoIiwic29ydCIsInBvc3RGaWx0ZXIiLCJiZXN0UmFuayIsIm1hcCIsImpvaW4iLCJyZXN4IiwiaW5kZXgiLCJkZWx0YSIsImNhdGVnb3JpemVTdHJpbmcyIiwicnVsZXMiLCJ3b3JkTWFwIiwibm9uV29yZFJ1bGVzIiwiYWxsUnVsZXMiLCJtYXRjaFdvcmQiLCJjb250ZXh0Iiwib3B0aW9ucyIsInMxIiwiczIiLCJmb2xsb3dzIiwibWF0Y2hvdGhlcnMiLCJjIiwiYXNzaWduIiwib3ZlcnJpZGUiLCJfd2VpZ2h0IiwiZnJlZXplIiwiZXh0cmFjdEFyZ3NNYXAiLCJtYXRjaCIsImFyZ3NNYXAiLCJpS2V5IiwidmFsdWUiLCJSYW5rV29yZCIsImhhc0Fib3ZlIiwibHN0IiwiYm9yZGVyIiwiZXZlcnkiLCJvTWVtYmVyIiwidGFrZUZpcnN0TiIsIm4iLCJpSW5kZXgiLCJsYXN0UmFua2luZyIsInRha2VBYm92ZSIsImNhdGVnb3JpemVXb3JkV2l0aFJhbmtDdXRvZmYiLCJzV29yZEdyb3VwIiwic3BsaXRSdWxlcyIsInNlZW5JdCIsIlRvcF9OX1dvcmRDYXRlZ29yaXphdGlvbnMiLCJmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWRTZW50ZW5jZSIsIm9TZW50ZW5jZSIsIm9Xb3JkR3JvdXAiLCJmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWQiLCJhcnIiLCJjYXRlZ29yaXplQVdvcmQiLCJzZW50ZW5jZSIsIndvcmRzIiwiZGVlcEZyZWV6ZSIsImNsb25lRGVlcCIsImFuYWx5emVTdHJpbmciLCJzU3RyaW5nIiwiZmFjIiwidSIsImJyZWFrZG93blN0cmluZyIsIk1heFNwYWNlc1BlckNvbWJpbmVkV29yZCIsImFCcmVha0Rvd25TZW50ZW5jZSIsImNhdGVnb3JpemVkU2VudGVuY2UiLCJpc1ZhbGlkIiwiY2xvbmUiLCJjb3B5VmVjTWVtYmVycyIsImV4cGFuZE1hdGNoQXJyIiwiZGVlcCIsImxpbmUiLCJ1QnJlYWtEb3duTGluZSIsImFXb3JkR3JvdXAiLCJ3Z0luZGV4Iiwib1dvcmRWYXJpYW50IiwiaVdWSW5kZXgiLCJudmVjcyIsInZlY3MiLCJydmVjIiwiayIsIm5leHRCYXNlIiwibCIsInNsaWNlIiwiY29uY2F0IiwicmVpbmZvcmNlRGlzdFdlaWdodCIsImFSZWluZm9yY2VEaXN0V2VpZ2h0IiwiZXh0cmFjdENhdGVnb3J5TWFwIiwib1dvcmQiLCJDQVRfQ0FURUdPUlkiLCJwb3MiLCJyZWluRm9yY2VTZW50ZW5jZSIsIm9DYXRlZ29yeU1hcCIsIm9Qb3NpdGlvbiIsInJlaW5mb3JjZSIsImJvb3N0IiwiU2VudGVuY2UiLCJyZWluRm9yY2UiLCJhQ2F0ZWdvcml6ZWRBcnJheSIsImNtcFJhbmtpbmdQcm9kdWN0IiwicmFua2luZ1Byb2R1Y3QiLCJtYXRjaFJlZ0V4cCIsInNLZXkiLCJyZWciLCJvRXh0cmFjdGVkQ29udGV4dCIsInNvcnRCeVdlaWdodCIsIm9Db250ZXh0QSIsIm9Db250ZXh0QiIsInJhbmtpbmdBIiwicGFyc2VGbG9hdCIsInJhbmtpbmdCIiwid2VpZ2h0QSIsIndlaWdodEIiLCJhdWdtZW50Q29udGV4dDEiLCJpUnVsZSIsIm9yZXMiLCJiaW5kIiwiYXVnbWVudENvbnRleHQiLCJhUnVsZXMiLCJvcHRpb25zMSIsImFSZXMiLCJvcHRpb25zMiIsImluc2VydE9yZGVyZWQiLCJyZXN1bHQiLCJpSW5zZXJ0ZWRNZW1iZXIiLCJsaW1pdCIsInRha2VUb3BOIiwiaW5uZXJBcnIiLCJpQXJyIiwidG9wIiwic2hpZnQiLCJpbnB1dEZpbHRlclJ1bGVzIiwicm0iLCJnZXRSTU9uY2UiLCJnZXRSdWxlTWFwIiwiYXBwbHlSdWxlcyIsImJlc3ROIiwib0tleU9yZGVyIiwiYmVzdE5leHQiLCJvQ29udGV4dCIsImFwcGx5UnVsZXNQaWNrRmlyc3QiLCJkZWNpZGVPblJlUXVlcnkiXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7Ozs7Ozs7Ozs7Ozs7Ozs7QUFnQkE7O0FBQ0EsSUFBQUEsV0FBQUMsUUFBQSw2QkFBQSxDQUFBO0FBRUEsSUFBQUMsU0FBQUQsUUFBQSxpQkFBQSxDQUFBO0FBRUEsSUFBTUUsU0FBU0QsT0FBT0MsTUFBUCxDQUFjLGFBQWQsQ0FBZjtBQUVBLElBQUFDLFFBQUFILFFBQUEsT0FBQSxDQUFBO0FBQ0EsSUFBSUksWUFBWUQsTUFBTSxNQUFOLENBQWhCO0FBRUEsSUFBQUUsUUFBQUwsUUFBQSxnQkFBQSxDQUFBO0FBR0EsSUFBQU0sUUFBQU4sUUFBQSxTQUFBLENBQUE7QUFJQSxJQUFBTyxZQUFBUCxRQUFBLGFBQUEsQ0FBQTtBQUVBLElBQU1RLFlBQWlCQyxNQUF2QjtBQUVBLElBQU1DLFdBQVdQLE1BQU0sYUFBTixDQUFqQjtBQUNBLElBQU1RLFlBQVlSLE1BQU0sY0FBTixDQUFsQjtBQUNBLElBQU1TLFlBQVlULE1BQU0sY0FBTixDQUFsQjtBQUlBLElBQUFVLFlBQUFiLFFBQUEsYUFBQSxDQUFBO0FBQ0EsSUFBSWMsYUFBYUQsVUFBVUMsVUFBM0I7QUFFQSxTQUFBQyxRQUFBLENBQWtCQyxHQUFsQixFQUFnQ0MsR0FBaEMsRUFBNEM7QUFDMUMsUUFBSUMsTUFBTSxDQUFWO0FBQ0EsU0FBSSxJQUFJQyxJQUFJLENBQVosRUFBZUEsSUFBSUYsR0FBbkIsRUFBd0IsRUFBRUUsQ0FBMUIsRUFBNkI7QUFDM0JELGVBQVFGLElBQUlJLE1BQUosQ0FBV0QsQ0FBWCxNQUFrQixHQUFuQixHQUF5QixDQUF6QixHQUE2QixD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QTNCLENBQW1DLFVBQVVxRyxJQUFWLEVBQXNCO0FBQ3ZELFlBQUlvQyxXQUEwQyxFQUE5QztBQUNBRixjQUFNdkksT0FBTixDQUFjLFVBQVUwSSxRQUFWLEVBQW1DO0FBQy9DLGdCQUFJQSxTQUFTckMsSUFBVCxDQUFKLEVBQW9CO0FBQ2xCdk0seUJBQVMsMkJBQTJCdU0sSUFBcEM7QUFDQSxvQkFBSTlILE1BQU02SSxlQUFlc0IsUUFBZixFQUF5Qk4sWUFBWS9CLElBQVosS0FBcUIsRUFBOUMsQ0FBVjtBQUNBdk0seUJBQVNBLFNBQVMrQixPQUFULEdBQW9CLG1CQUFtQndLLElBQW5CLEdBQTBCLEtBQTFCLEdBQWtDM0gsS0FBS0MsU0FBTCxDQUFlSixHQUFmLEVBQW9CUSxTQUFwQixFQUErQixDQUEvQixDQUF0RCxHQUEwRixHQUFuRztBQUNBMEoseUJBQVN4SixJQUFULENBQWNWLE9BQU8sRUFBckI7QUFDRCxhQUxELE1BS087QUFDTDtBQUNBa0sseUJBQVN4SixJQUFULENBQWMsQ0FBQ3lKLFFBQUQsQ0FBZDtBQUNEO0FBQ0YsU0FWRDtBQVdBSCxnQkFBUVYsU0FBU1ksUUFBVCxDQUFSO0FBQ0QsS0FkRDtBQWVBLFdBQU9GLEtBQVA7QUFDRDtBQWxCRGpOLFFBQUFnTixVQUFBLEdBQUFBLFVBQUE7QUFxQkEsU0FBQUssbUJBQUEsQ0FBb0M1SCxPQUFwQyxFQUE0RDtBQUMxRCxRQUFJakQsSUFBSXdLLFdBQVd2SCxPQUFYLENBQVI7QUFDQSxXQUFPakQsS0FBS0EsRUFBRSxDQUFGLENBQVo7QUFDRDtBQUhEeEMsUUFBQXFOLG1CQUFBLEdBQUFBLG1CQUFBO0FBS0E7OztBQUdBLFNBQUFDLGVBQUEsQ0FBZ0M3SCxPQUFoQyxFQUF3RDtBQUN0RCxXQUFPLEVBQVA7QUFDRDtBQUZEekYsUUFBQXNOLGVBQUEsR0FBQUEsZUFBQSIsImZpbGUiOiJtYXRjaC9pbnB1dEZpbHRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuLyoqXG4gKiB0aGUgaW5wdXQgZmlsdGVyIHN0YWdlIHByZXByb2Nlc3NlcyBhIGN1cnJlbnQgY29udGV4dFxuICpcbiAqIEl0IGEpIGNvbWJpbmVzIG11bHRpLXNlZ21lbnQgYXJndW1lbnRzIGludG8gb25lIGNvbnRleHQgbWVtYmVyc1xuICogSXQgYikgYXR0ZW1wdHMgdG8gYXVnbWVudCB0aGUgY29udGV4dCBieSBhZGRpdGlvbmFsIHF1YWxpZmljYXRpb25zXG4gKiAgICAgICAgICAgKE1pZCB0ZXJtIGdlbmVyYXRpbmcgQWx0ZXJuYXRpdmVzLCBlLmcuXG4gKiAgICAgICAgICAgICAgICAgQ2xpZW50U2lkZVRhcmdldFJlc29sdXRpb24gLT4gdW5pdCB0ZXN0P1xuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHNvdXJjZSA/XG4gKiAgICAgICAgICAgKVxuICogIFNpbXBsZSBydWxlcyBsaWtlICBJbnRlbnRcbiAqXG4gKlxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuaW5wdXRGaWx0ZXJcbiAqIEBmaWxlIGlucHV0RmlsdGVyLnRzXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXG4gKi9cbi8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2xpYi9ub2RlLTQuZC50c1wiIC8+XG52YXIgZGlzdGFuY2UgPSByZXF1aXJlKFwiLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluXCIpO1xudmFyIExvZ2dlciA9IHJlcXVpcmUoXCIuLi91dGlscy9sb2dnZXJcIik7XG52YXIgbG9nZ2VyID0gTG9nZ2VyLmxvZ2dlcignaW5wdXRGaWx0ZXInKTtcbnZhciBkZWJ1ZyA9IHJlcXVpcmUoXCJkZWJ1Z1wiKTtcbnZhciBkZWJ1Z3BlcmYgPSBkZWJ1ZygncGVyZicpO1xudmFyIHV0aWxzID0gcmVxdWlyZShcIi4uL3V0aWxzL3V0aWxzXCIpO1xudmFyIEFsZ29sID0gcmVxdWlyZShcIi4vYWxnb2xcIik7XG52YXIgYnJlYWtkb3duID0gcmVxdWlyZShcIi4vYnJlYWtkb3duXCIpO1xudmFyIEFueU9iamVjdCA9IE9iamVjdDtcbnZhciBkZWJ1Z2xvZyA9IGRlYnVnKCdpbnB1dEZpbHRlcicpO1xudmFyIGRlYnVnbG9nViA9IGRlYnVnKCdpbnB1dFZGaWx0ZXInKTtcbnZhciBkZWJ1Z2xvZ00gPSBkZWJ1ZygnaW5wdXRNRmlsdGVyJyk7XG52YXIgbWF0Y2hkYXRhID0gcmVxdWlyZShcIi4vbWF0Y2hkYXRhXCIpO1xudmFyIG9Vbml0VGVzdHMgPSBtYXRjaGRhdGEub1VuaXRUZXN0cztcbmZ1bmN0aW9uIGNudENoYXJzKHN0ciwgbGVuKSB7XG4gICAgdmFyIGNudCA9IDA7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgICAgICBjbnQgKz0gKHN0ci5jaGFyQXQoaSkgPT09ICdYJykgPyAxIDogMDtcbiAgICB9XG4gICAgcmV0dXJuIGNudDtcbn1cbi8qKlxuICogQHBhcmFtIHNUZXh0IHtzdHJpbmd9IHRoZSB0ZXh0IHRvIG1hdGNoIHRvIE5hdlRhcmdldFJlc29sdXRpb25cbiAqIEBwYXJhbSBzVGV4dDIge3N0cmluZ30gdGhlIHF1ZXJ5IHRleHQsIGUuZy4gTmF2VGFyZ2V0XG4gKlxuICogQHJldHVybiB0aGUgZGlzdGFuY2UsIG5vdGUgdGhhdCBpcyBpcyAqbm90KiBzeW1tZXRyaWMhXG4gKi9cbmZ1bmN0aW9uIGNhbGNEaXN0YW5jZShzVGV4dDEsIHNUZXh0Mikge1xuICAgIC8vIGNvbnNvbGUubG9nKFwibGVuZ3RoMlwiICsgc1RleHQxICsgXCIgLSBcIiArIHNUZXh0MilcbiAgICB2YXIgczFsZW4gPSBzVGV4dDEubGVuZ3RoO1xuICAgIHZhciBzMmxlbiA9IHNUZXh0Mi5sZW5ndGg7XG4gICAgdmFyIG1pbiA9IE1hdGgubWluKHMxbGVuLCBzMmxlbik7XG4gICAgaWYgKE1hdGguYWJzKHMxbGVuIC0gczJsZW4pID4gTWF0aC5taW4oczFsZW4sIHMybGVuKSkge1xuICAgICAgICByZXR1cm4gMC4zO1xuICAgIH1cbiAgICB2YXIgZGlzdCA9IGRpc3RhbmNlLmphcm9XaW5rbGVyRGlzdGFuY2Uoc1RleHQxLCBzVGV4dDIpO1xuICAgIHZhciBjbnQxID0gY250Q2hhcnMoc1RleHQxLCBzMWxlbik7XG4gICAgdmFyIGNudDIgPSBjbnRDaGFycyhzVGV4dDIsIHMybGVuKTtcbiAgICBpZiAoY250MSAhPT0gY250Mikge1xuICAgICAgICBkaXN0ID0gZGlzdCAqIDAuNztcbiAgICB9XG4gICAgcmV0dXJuIGRpc3Q7XG4gICAgLypcbiAgICB2YXIgYTAgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEuc3Vic3RyaW5nKDAsIHNUZXh0Mi5sZW5ndGgpLCBzVGV4dDIpXG4gICAgaWYoZGVidWdsb2dWLmVuYWJsZWQpIHtcbiAgICAgIGRlYnVnbG9nVihcImRpc3RhbmNlXCIgKyBhMCArIFwic3RyaXBwZWQ+XCIgKyBzVGV4dDEuc3Vic3RyaW5nKDAsc1RleHQyLmxlbmd0aCkgKyBcIjw+XCIgKyBzVGV4dDIrIFwiPFwiKTtcbiAgICB9XG4gICAgaWYoYTAgKiA1MCA+IDE1ICogc1RleHQyLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gNDAwMDA7XG4gICAgfVxuICAgIHZhciBhID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLCBzVGV4dDIpXG4gICAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGFcbiAgICAqL1xufVxuZXhwb3J0cy5jYWxjRGlzdGFuY2UgPSBjYWxjRGlzdGFuY2U7XG4vKipcbiAqIEBwYXJhbSBzVGV4dCB7c3RyaW5nfSB0aGUgdGV4dCB0byBtYXRjaCB0byBOYXZUYXJnZXRSZXNvbHV0aW9uXG4gKiBAcGFyYW0gc1RleHQyIHtzdHJpbmd9IHRoZSBxdWVyeSB0ZXh0LCBlLmcuIE5hdlRhcmdldFxuICpcbiAqIEByZXR1cm4gdGhlIGRpc3RhbmNlLCBub3RlIHRoYXQgaXMgaXMgKm5vdCogc3ltbWV0cmljIVxuICovXG5mdW5jdGlvbiBjYWxjRGlzdGFuY2VMZXZlbihzVGV4dDEsIHNUZXh0Mikge1xuICAgIC8vIGNvbnNvbGUubG9nKFwibGVuZ3RoMlwiICsgc1RleHQxICsgXCIgLSBcIiArIHNUZXh0MilcbiAgICBpZiAoKChzVGV4dDEubGVuZ3RoIC0gc1RleHQyLmxlbmd0aCkgPiBBbGdvbC5jYWxjRGlzdC5sZW5ndGhEZWx0YTEpXG4gICAgICAgIHx8IChzVGV4dDIubGVuZ3RoID4gMS41ICogc1RleHQxLmxlbmd0aClcbiAgICAgICAgfHwgKHNUZXh0Mi5sZW5ndGggPCAoc1RleHQxLmxlbmd0aCAvIDIpKSkge1xuICAgICAgICByZXR1cm4gNTAwMDA7XG4gICAgfVxuICAgIHZhciBhMCA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCksIHNUZXh0Mik7XG4gICAgaWYgKGRlYnVnbG9nVi5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nVihcImRpc3RhbmNlXCIgKyBhMCArIFwic3RyaXBwZWQ+XCIgKyBzVGV4dDEuc3Vic3RyaW5nKDAsIHNUZXh0Mi5sZW5ndGgpICsgXCI8PlwiICsgc1RleHQyICsgXCI8XCIpO1xuICAgIH1cbiAgICBpZiAoYTAgKiA1MCA+IDE1ICogc1RleHQyLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gNDAwMDA7XG4gICAgfVxuICAgIHZhciBhID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLCBzVGV4dDIpO1xuICAgIHJldHVybiBhMCAqIDUwMCAvIHNUZXh0Mi5sZW5ndGggKyBhO1xufVxuZXhwb3J0cy5jYWxjRGlzdGFuY2VMZXZlbiA9IGNhbGNEaXN0YW5jZUxldmVuO1xudmFyIElGTWF0Y2ggPSByZXF1aXJlKFwiLi4vbWF0Y2gvaWZtYXRjaFwiKTtcbi8vY29uc3QgbGV2ZW5DdXRvZmYgPSBBbGdvbC5DdXRvZmZfTGV2ZW5TaHRlaW47XG5mdW5jdGlvbiBsZXZlblBlbmFsdHlPbGQoaSkge1xuICAgIC8vIDAtPiAxXG4gICAgLy8gMSAtPiAwLjFcbiAgICAvLyAxNTAgLT4gIDAuOFxuICAgIGlmIChpID09PSAwKSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgIH1cbiAgICAvLyByZXZlcnNlIG1heSBiZSBiZXR0ZXIgdGhhbiBsaW5lYXJcbiAgICByZXR1cm4gMSArIGkgKiAoMC44IC0gMSkgLyAxNTA7XG59XG5leHBvcnRzLmxldmVuUGVuYWx0eU9sZCA9IGxldmVuUGVuYWx0eU9sZDtcbmZ1bmN0aW9uIGxldmVuUGVuYWx0eShpKSB7XG4gICAgLy8gMSAtPiAxXG4gICAgLy8gY3V0T2ZmID0+IDAuOFxuICAgIHJldHVybiBpO1xuICAgIC8vcmV0dXJuICAgMSAtICAoMSAtIGkpICowLjIvQWxnb2wuQ3V0b2ZmX1dvcmRNYXRjaDtcbn1cbmV4cG9ydHMubGV2ZW5QZW5hbHR5ID0gbGV2ZW5QZW5hbHR5O1xuZnVuY3Rpb24gbm9uUHJpdmF0ZUtleXMob0EpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMob0EpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHJldHVybiBrZXlbMF0gIT09ICdfJztcbiAgICB9KTtcbn1cbmZ1bmN0aW9uIGNvdW50QWluQihvQSwgb0IsIGZuQ29tcGFyZSwgYUtleUlnbm9yZSkge1xuICAgIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gYUtleUlnbm9yZSA6XG4gICAgICAgIHR5cGVvZiBhS2V5SWdub3JlID09PSBcInN0cmluZ1wiID8gW2FLZXlJZ25vcmVdIDogW107XG4gICAgZm5Db21wYXJlID0gZm5Db21wYXJlIHx8IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH07XG4gICAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xuICAgIH0pLlxuICAgICAgICByZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9CLCBrZXkpKSB7XG4gICAgICAgICAgICBwcmV2ID0gcHJldiArIChmbkNvbXBhcmUob0Fba2V5XSwgb0Jba2V5XSwga2V5KSA/IDEgOiAwKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbn1cbmV4cG9ydHMuY291bnRBaW5CID0gY291bnRBaW5CO1xuZnVuY3Rpb24gc3B1cmlvdXNBbm90SW5CKG9BLCBvQiwgYUtleUlnbm9yZSkge1xuICAgIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gYUtleUlnbm9yZSA6XG4gICAgICAgIHR5cGVvZiBhS2V5SWdub3JlID09PSBcInN0cmluZ1wiID8gW2FLZXlJZ25vcmVdIDogW107XG4gICAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xuICAgIH0pLlxuICAgICAgICByZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xuICAgICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xuICAgICAgICAgICAgcHJldiA9IHByZXYgKyAxO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIDApO1xufVxuZXhwb3J0cy5zcHVyaW91c0Fub3RJbkIgPSBzcHVyaW91c0Fub3RJbkI7XG5mdW5jdGlvbiBsb3dlckNhc2Uobykge1xuICAgIGlmICh0eXBlb2YgbyA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICByZXR1cm4gby50b0xvd2VyQ2FzZSgpO1xuICAgIH1cbiAgICByZXR1cm4gbztcbn1cbmZ1bmN0aW9uIGNvbXBhcmVDb250ZXh0KG9BLCBvQiwgYUtleUlnbm9yZSkge1xuICAgIHZhciBlcXVhbCA9IGNvdW50QWluQihvQSwgb0IsIGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBsb3dlckNhc2UoYSkgPT09IGxvd2VyQ2FzZShiKTsgfSwgYUtleUlnbm9yZSk7XG4gICAgdmFyIGRpZmZlcmVudCA9IGNvdW50QWluQihvQSwgb0IsIGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBsb3dlckNhc2UoYSkgIT09IGxvd2VyQ2FzZShiKTsgfSwgYUtleUlnbm9yZSk7XG4gICAgdmFyIHNwdXJpb3VzTCA9IHNwdXJpb3VzQW5vdEluQihvQSwgb0IsIGFLZXlJZ25vcmUpO1xuICAgIHZhciBzcHVyaW91c1IgPSBzcHVyaW91c0Fub3RJbkIob0IsIG9BLCBhS2V5SWdub3JlKTtcbiAgICByZXR1cm4ge1xuICAgICAgICBlcXVhbDogZXF1YWwsXG4gICAgICAgIGRpZmZlcmVudDogZGlmZmVyZW50LFxuICAgICAgICBzcHVyaW91c0w6IHNwdXJpb3VzTCxcbiAgICAgICAgc3B1cmlvdXNSOiBzcHVyaW91c1JcbiAgICB9O1xufVxuZXhwb3J0cy5jb21wYXJlQ29udGV4dCA9IGNvbXBhcmVDb250ZXh0O1xuZnVuY3Rpb24gc29ydEJ5UmFuayhhLCBiKSB7XG4gICAgdmFyIHIgPSAtKChhLl9yYW5raW5nIHx8IDEuMCkgLSAoYi5fcmFua2luZyB8fCAxLjApKTtcbiAgICBpZiAocikge1xuICAgICAgICByZXR1cm4gcjtcbiAgICB9XG4gICAgaWYgKGEuY2F0ZWdvcnkgJiYgYi5jYXRlZ29yeSkge1xuICAgICAgICByID0gYS5jYXRlZ29yeS5sb2NhbGVDb21wYXJlKGIuY2F0ZWdvcnkpO1xuICAgICAgICBpZiAocikge1xuICAgICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKGEubWF0Y2hlZFN0cmluZyAmJiBiLm1hdGNoZWRTdHJpbmcpIHtcbiAgICAgICAgciA9IGEubWF0Y2hlZFN0cmluZy5sb2NhbGVDb21wYXJlKGIubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgIGlmIChyKSB7XG4gICAgICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gMDtcbn1cbmZ1bmN0aW9uIGNoZWNrT25lUnVsZShzdHJpbmcsIGxjU3RyaW5nLCBleGFjdCwgcmVzLCBvUnVsZSwgY250UmVjKSB7XG4gICAgaWYgKGRlYnVnbG9nVi5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nVignYXR0ZW1wdGluZyB0byBtYXRjaCBydWxlICcgKyBKU09OLnN0cmluZ2lmeShvUnVsZSkgKyBcIiB0byBzdHJpbmcgXFxcIlwiICsgc3RyaW5nICsgXCJcXFwiXCIpO1xuICAgIH1cbiAgICBzd2l0Y2ggKG9SdWxlLnR5cGUpIHtcbiAgICAgICAgY2FzZSAwIC8qIFdPUkQgKi86XG4gICAgICAgICAgICBpZiAoIW9SdWxlLmxvd2VyY2FzZXdvcmQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3J1bGUgd2l0aG91dCBhIGxvd2VyY2FzZSB2YXJpYW50JyArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDtcbiAgICAgICAgICAgIGlmIChleGFjdCAmJiBvUnVsZS53b3JkID09PSBzdHJpbmcgfHwgb1J1bGUubG93ZXJjYXNld29yZCA9PT0gbGNTdHJpbmcpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcIlxcbiFtYXRjaGVkIGV4YWN0IFwiICsgc3RyaW5nICsgXCI9XCIgKyBvUnVsZS5sb3dlcmNhc2V3b3JkICsgXCIgPT4gXCIgKyBvUnVsZS5tYXRjaGVkU3RyaW5nICsgXCIvXCIgKyBvUnVsZS5jYXRlZ29yeSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFleGFjdCAmJiAhb1J1bGUuZXhhY3RPbmx5KSB7XG4gICAgICAgICAgICAgICAgdmFyIGxldmVubWF0Y2ggPSBjYWxjRGlzdGFuY2Uob1J1bGUubG93ZXJjYXNld29yZCwgbGNTdHJpbmcpO1xuICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VcIiwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGxldmVubWF0Y2ggPCA1MCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VFeHBcIiwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYobGV2ZW5tYXRjaCA8IDQwMDAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYyxcImNhbGNEaXN0YW5jZUJlbG93NDBrXCIsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgLy9pZihvUnVsZS5sb3dlcmNhc2V3b3JkID09PSBcImNvc21vc1wiKSB7XG4gICAgICAgICAgICAgICAgLy8gIGNvbnNvbGUubG9nKFwiaGVyZSByYW5raW5nIFwiICsgbGV2ZW5tYXRjaCArIFwiIFwiICsgb1J1bGUubG93ZXJjYXNld29yZCArIFwiIFwiICsgbGNTdHJpbmcpO1xuICAgICAgICAgICAgICAgIC8vfVxuICAgICAgICAgICAgICAgIGlmIChsZXZlbm1hdGNoID49IEFsZ29sLkN1dG9mZl9Xb3JkTWF0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYywgXCJjYWxjRGlzdGFuY2VPa1wiLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlYyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiAob1J1bGUuX3JhbmtpbmcgfHwgMS4wKSAqIGxldmVuUGVuYWx0eShsZXZlbm1hdGNoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldmVubWF0Y2g6IGxldmVubWF0Y2hcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlYnVnbG9nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcIlxcbiFmdXp6eSBcIiArIChsZXZlbm1hdGNoKS50b0ZpeGVkKDMpICsgXCIgXCIgKyByZWMuX3JhbmtpbmcudG9GaXhlZCgzKSArIFwiICBcIiArIHN0cmluZyArIFwiPVwiICsgb1J1bGUubG93ZXJjYXNld29yZCArIFwiID0+IFwiICsgb1J1bGUubWF0Y2hlZFN0cmluZyArIFwiL1wiICsgb1J1bGUuY2F0ZWdvcnkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKHJlYyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMSAvKiBSRUdFWFAgKi86XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoXCIgaGVyZSByZWdleHBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBtID0gb1J1bGUucmVnZXhwLmV4ZWMoc3RyaW5nKTtcbiAgICAgICAgICAgICAgICBpZiAobSkge1xuICAgICAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IChvUnVsZS5tYXRjaEluZGV4ICE9PSB1bmRlZmluZWQgJiYgbVtvUnVsZS5tYXRjaEluZGV4XSkgfHwgc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInVua25vd24gdHlwZVwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUsIHVuZGVmaW5lZCwgMikpO1xuICAgIH1cbn1cbmV4cG9ydHMuY2hlY2tPbmVSdWxlID0gY2hlY2tPbmVSdWxlO1xuO1xuZnVuY3Rpb24gYWRkQ250UmVjKGNudFJlYywgbWVtYmVyLCBudW1iZXIpIHtcbiAgICBpZiAoKCFjbnRSZWMpIHx8IChudW1iZXIgPT09IDApKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY250UmVjW21lbWJlcl0gPSAoY250UmVjW21lbWJlcl0gfHwgMCkgKyBudW1iZXI7XG59XG5mdW5jdGlvbiBjYXRlZ29yaXplU3RyaW5nKHdvcmQsIGV4YWN0LCBvUnVsZXMsIGNudFJlYykge1xuICAgIC8vIHNpbXBseSBhcHBseSBhbGwgcnVsZXNcbiAgICBpZiAoZGVidWdsb2dNLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2dNKFwicnVsZXMgOiBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHZhciBsY1N0cmluZyA9IHdvcmQudG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgb1J1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgIGNoZWNrT25lUnVsZSh3b3JkLCBsY1N0cmluZywgZXhhY3QsIHJlcywgb1J1bGUsIGNudFJlYyk7XG4gICAgfSk7XG4gICAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZVN0cmluZyA9IGNhdGVnb3JpemVTdHJpbmc7XG5mdW5jdGlvbiBwb3N0RmlsdGVyKHJlcykge1xuICAgIHJlcy5zb3J0KHNvcnRCeVJhbmspO1xuICAgIHZhciBiZXN0UmFuayA9IDA7XG4gICAgLy9jb25zb2xlLmxvZyhcIlxcbnBpbHRlcmVkIFwiICsgSlNPTi5zdHJpbmdpZnkocmVzKSk7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCIgcHJlRmlsdGVyIDogXFxuXCIgKyByZXMubWFwKGZ1bmN0aW9uICh3b3JkKSB7XG4gICAgICAgICAgICByZXR1cm4gXCIgXCIgKyB3b3JkLl9yYW5raW5nICsgXCIgID0+IFxcXCJcIiArIHdvcmQuY2F0ZWdvcnkgKyBcIlxcXCIgXCIgKyB3b3JkLm1hdGNoZWRTdHJpbmcgKyBcIiBcXG5cIjtcbiAgICAgICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgfVxuICAgIHZhciByID0gcmVzLmZpbHRlcihmdW5jdGlvbiAocmVzeCwgaW5kZXgpIHtcbiAgICAgICAgaWYgKGluZGV4ID09PSAwKSB7XG4gICAgICAgICAgICBiZXN0UmFuayA9IHJlc3guX3Jhbmtpbmc7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyAxLTAuOSA9IDAuMVxuICAgICAgICAvLyAxLSAwLjkzID0gMC43XG4gICAgICAgIC8vIDEvN1xuICAgICAgICB2YXIgZGVsdGEgPSBiZXN0UmFuayAvIHJlc3guX3Jhbmtpbmc7XG4gICAgICAgIGlmICgocmVzeC5tYXRjaGVkU3RyaW5nID09PSByZXNbaW5kZXggLSAxXS5tYXRjaGVkU3RyaW5nKVxuICAgICAgICAgICAgJiYgKHJlc3guY2F0ZWdvcnkgPT09IHJlc1tpbmRleCAtIDFdLmNhdGVnb3J5KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJcXG4gZGVsdGEgZm9yIFwiICsgZGVsdGEgKyBcIiAgXCIgKyByZXN4Ll9yYW5raW5nKTtcbiAgICAgICAgaWYgKHJlc3gubGV2ZW5tYXRjaCAmJiAoZGVsdGEgPiAxLjAzKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiXFxuZmlsdGVyZWQgXCIgKyByLmxlbmd0aCArIFwiL1wiICsgcmVzLmxlbmd0aCArIEpTT04uc3RyaW5naWZ5KHIpKTtcbiAgICB9XG4gICAgcmV0dXJuIHI7XG59XG5leHBvcnRzLnBvc3RGaWx0ZXIgPSBwb3N0RmlsdGVyO1xuZnVuY3Rpb24gY2F0ZWdvcml6ZVN0cmluZzIod29yZCwgZXhhY3QsIHJ1bGVzLCBjbnRSZWMpIHtcbiAgICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXG4gICAgaWYgKGRlYnVnbG9nTS5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nTShcInJ1bGVzIDogXCIgKyBKU09OLnN0cmluZ2lmeShydWxlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHZhciBsY1N0cmluZyA9IHdvcmQudG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgaWYgKGV4YWN0KSB7XG4gICAgICAgIHZhciByID0gcnVsZXMud29yZE1hcFtsY1N0cmluZ107XG4gICAgICAgIGlmIChyKSB7XG4gICAgICAgICAgICByLnJ1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHdvcmQsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcnVsZXMubm9uV29yZFJ1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgICAgICBjaGVja09uZVJ1bGUod29yZCwgbGNTdHJpbmcsIGV4YWN0LCByZXMsIG9SdWxlLCBjbnRSZWMpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGRlYnVnbG9nKFwiY2F0ZWdvcml6ZSBub24gZXhhY3RcIiArIHdvcmQgKyBcIiB4eCAgXCIgKyBydWxlcy5hbGxSdWxlcy5sZW5ndGgpO1xuICAgICAgICByZXR1cm4gcG9zdEZpbHRlcihjYXRlZ29yaXplU3RyaW5nKHdvcmQsIGV4YWN0LCBydWxlcy5hbGxSdWxlcywgY250UmVjKSk7XG4gICAgfVxuICAgIHJlcy5zb3J0KHNvcnRCeVJhbmspO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmNhdGVnb3JpemVTdHJpbmcyID0gY2F0ZWdvcml6ZVN0cmluZzI7XG4vKipcbiAqXG4gKiBPcHRpb25zIG1heSBiZSB7XG4gKiBtYXRjaG90aGVycyA6IHRydWUsICA9PiBvbmx5IHJ1bGVzIHdoZXJlIGFsbCBvdGhlcnMgbWF0Y2ggYXJlIGNvbnNpZGVyZWRcbiAqIGF1Z21lbnQgOiB0cnVlLFxuICogb3ZlcnJpZGUgOiB0cnVlIH0gID0+XG4gKlxuICovXG5mdW5jdGlvbiBtYXRjaFdvcmQob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAoY29udGV4dFtvUnVsZS5rZXldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIHMxID0gY29udGV4dFtvUnVsZS5rZXldLnRvTG93ZXJDYXNlKCk7XG4gICAgdmFyIHMyID0gb1J1bGUud29yZC50b0xvd2VyQ2FzZSgpO1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsIG9SdWxlLmZvbGxvd3MsIG9SdWxlLmtleSk7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcbiAgICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkob3B0aW9ucykpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5tYXRjaG90aGVycyAmJiAoZGVsdGEuZGlmZmVyZW50ID4gMCkpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIGMgPSBjYWxjRGlzdGFuY2UoczIsIHMxKTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcIiBzMSA8PiBzMiBcIiArIHMxICsgXCI8PlwiICsgczIgKyBcIiAgPT46IFwiICsgYyk7XG4gICAgfVxuICAgIGlmIChjID4gMC44MCkge1xuICAgICAgICB2YXIgcmVzID0gQW55T2JqZWN0LmFzc2lnbih7fSwgb1J1bGUuZm9sbG93cyk7XG4gICAgICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcbiAgICAgICAgaWYgKG9wdGlvbnMub3ZlcnJpZGUpIHtcbiAgICAgICAgICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvUnVsZS5mb2xsb3dzKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBmb3JjZSBrZXkgcHJvcGVydHlcbiAgICAgICAgLy8gY29uc29sZS5sb2coJyBvYmplY3RjYXRlZ29yeScsIHJlc1snc3lzdGVtT2JqZWN0Q2F0ZWdvcnknXSk7XG4gICAgICAgIHJlc1tvUnVsZS5rZXldID0gb1J1bGUuZm9sbG93c1tvUnVsZS5rZXldIHx8IHJlc1tvUnVsZS5rZXldO1xuICAgICAgICByZXMuX3dlaWdodCA9IEFueU9iamVjdC5hc3NpZ24oe30sIHJlcy5fd2VpZ2h0KTtcbiAgICAgICAgcmVzLl93ZWlnaHRbb1J1bGUua2V5XSA9IGM7XG4gICAgICAgIE9iamVjdC5mcmVlemUocmVzKTtcbiAgICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgICAgIGRlYnVnbG9nKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xufVxuZXhwb3J0cy5tYXRjaFdvcmQgPSBtYXRjaFdvcmQ7XG5mdW5jdGlvbiBleHRyYWN0QXJnc01hcChtYXRjaCwgYXJnc01hcCkge1xuICAgIHZhciByZXMgPSB7fTtcbiAgICBpZiAoIWFyZ3NNYXApIHtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG4gICAgT2JqZWN0LmtleXMoYXJnc01hcCkuZm9yRWFjaChmdW5jdGlvbiAoaUtleSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBtYXRjaFtpS2V5XTtcbiAgICAgICAgdmFyIGtleSA9IGFyZ3NNYXBbaUtleV07XG4gICAgICAgIGlmICgodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKSAmJiB2YWx1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXNba2V5XSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZXh0cmFjdEFyZ3NNYXAgPSBleHRyYWN0QXJnc01hcDtcbmV4cG9ydHMuUmFua1dvcmQgPSB7XG4gICAgaGFzQWJvdmU6IGZ1bmN0aW9uIChsc3QsIGJvcmRlcikge1xuICAgICAgICByZXR1cm4gIWxzdC5ldmVyeShmdW5jdGlvbiAob01lbWJlcikge1xuICAgICAgICAgICAgcmV0dXJuIChvTWVtYmVyLl9yYW5raW5nIDwgYm9yZGVyKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICB0YWtlRmlyc3ROOiBmdW5jdGlvbiAobHN0LCBuKSB7XG4gICAgICAgIHJldHVybiBsc3QuZmlsdGVyKGZ1bmN0aW9uIChvTWVtYmVyLCBpSW5kZXgpIHtcbiAgICAgICAgICAgIHZhciBsYXN0UmFua2luZyA9IDEuMDtcbiAgICAgICAgICAgIGlmICgoaUluZGV4IDwgbikgfHwgb01lbWJlci5fcmFua2luZyA9PT0gbGFzdFJhbmtpbmcpIHtcbiAgICAgICAgICAgICAgICBsYXN0UmFua2luZyA9IG9NZW1iZXIuX3Jhbmtpbmc7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgdGFrZUFib3ZlOiBmdW5jdGlvbiAobHN0LCBib3JkZXIpIHtcbiAgICAgICAgcmV0dXJuIGxzdC5maWx0ZXIoZnVuY3Rpb24gKG9NZW1iZXIpIHtcbiAgICAgICAgICAgIHJldHVybiAob01lbWJlci5fcmFua2luZyA+PSBib3JkZXIpO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuLypcbnZhciBleGFjdExlbiA9IDA7XG52YXIgZnV6enlMZW4gPSAwO1xudmFyIGZ1enp5Q250ID0gMDtcbnZhciBleGFjdENudCA9IDA7XG52YXIgdG90YWxDbnQgPSAwO1xudmFyIHRvdGFsTGVuID0gMDtcbnZhciByZXRhaW5lZENudCA9IDA7XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNldENudCgpIHtcbiAgZXhhY3RMZW4gPSAwO1xuICBmdXp6eUxlbiA9IDA7XG4gIGZ1enp5Q250ID0gMDtcbiAgZXhhY3RDbnQgPSAwO1xuICB0b3RhbENudCA9IDA7XG4gIHRvdGFsTGVuID0gMDtcbiAgcmV0YWluZWRDbnQgPSAwO1xufVxuKi9cbmZ1bmN0aW9uIGNhdGVnb3JpemVXb3JkV2l0aFJhbmtDdXRvZmYoc1dvcmRHcm91cCwgc3BsaXRSdWxlcywgY250UmVjKSB7XG4gICAgdmFyIHNlZW5JdCA9IGNhdGVnb3JpemVTdHJpbmcyKHNXb3JkR3JvdXAsIHRydWUsIHNwbGl0UnVsZXMsIGNudFJlYyk7XG4gICAgLy90b3RhbENudCArPSAxO1xuICAgIC8vIGV4YWN0TGVuICs9IHNlZW5JdC5sZW5ndGg7XG4gICAgYWRkQ250UmVjKGNudFJlYywgJ2NudENhdEV4YWN0JywgMSk7XG4gICAgYWRkQ250UmVjKGNudFJlYywgJ2NudENhdEV4YWN0UmVzJywgc2Vlbkl0Lmxlbmd0aCk7XG4gICAgaWYgKGV4cG9ydHMuUmFua1dvcmQuaGFzQWJvdmUoc2Vlbkl0LCAwLjgpKSB7XG4gICAgICAgIGlmIChjbnRSZWMpIHtcbiAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsICdleGFjdFByaW9yVGFrZScsIHNlZW5JdC5sZW5ndGgpO1xuICAgICAgICB9XG4gICAgICAgIHNlZW5JdCA9IGV4cG9ydHMuUmFua1dvcmQudGFrZUFib3ZlKHNlZW5JdCwgMC44KTtcbiAgICAgICAgaWYgKGNudFJlYykge1xuICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYywgJ2V4YWN0QWZ0ZXJUYWtlJywgc2Vlbkl0Lmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHNlZW5JdCA9IGNhdGVnb3JpemVTdHJpbmcyKHNXb3JkR3JvdXAsIGZhbHNlLCBzcGxpdFJ1bGVzLCBjbnRSZWMpO1xuICAgICAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Tm9uRXhhY3QnLCAxKTtcbiAgICAgICAgYWRkQ250UmVjKGNudFJlYywgJ2NudE5vbkV4YWN0UmVzJywgc2Vlbkl0Lmxlbmd0aCk7XG4gICAgfVxuICAgIC8vIHRvdGFsTGVuICs9IHNlZW5JdC5sZW5ndGg7XG4gICAgc2Vlbkl0ID0gZXhwb3J0cy5SYW5rV29yZC50YWtlRmlyc3ROKHNlZW5JdCwgQWxnb2wuVG9wX05fV29yZENhdGVnb3JpemF0aW9ucyk7XG4gICAgLy8gcmV0YWluZWRDbnQgKz0gc2Vlbkl0Lmxlbmd0aDtcbiAgICByZXR1cm4gc2Vlbkl0O1xufVxuZXhwb3J0cy5jYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmID0gY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZjtcbi8qXG5leHBvcnQgZnVuY3Rpb24gZHVtcENudCgpIHtcbiAgY29uc29sZS5sb2coYFxuZXhhY3RMZW4gPSAke2V4YWN0TGVufTtcbmV4YWN0Q250ID0gJHtleGFjdENudH07XG5mdXp6eUxlbiA9ICR7ZnV6enlMZW59O1xuZnV6enlDbnQgPSAke2Z1enp5Q250fTtcbnRvdGFsQ250ID0gJHt0b3RhbENudH07XG50b3RhbExlbiA9ICR7dG90YWxMZW59O1xucmV0YWluZWRMZW4gPSAke3JldGFpbmVkQ250fTtcbiAgYCk7XG59XG4qL1xuZnVuY3Rpb24gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkU2VudGVuY2Uob1NlbnRlbmNlKSB7XG4gICAgcmV0dXJuIG9TZW50ZW5jZS5ldmVyeShmdW5jdGlvbiAob1dvcmRHcm91cCkge1xuICAgICAgICByZXR1cm4gKG9Xb3JkR3JvdXAubGVuZ3RoID4gMCk7XG4gICAgfSk7XG59XG5leHBvcnRzLmZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZFNlbnRlbmNlID0gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkU2VudGVuY2U7XG5mdW5jdGlvbiBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWQoYXJyKSB7XG4gICAgcmV0dXJuIGFyci5maWx0ZXIoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICByZXR1cm4gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkU2VudGVuY2Uob1NlbnRlbmNlKTtcbiAgICB9KTtcbn1cbmV4cG9ydHMuZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkID0gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkO1xuZnVuY3Rpb24gY2F0ZWdvcml6ZUFXb3JkKHNXb3JkR3JvdXAsIHJ1bGVzLCBzZW50ZW5jZSwgd29yZHMsIGNudFJlYykge1xuICAgIHZhciBzZWVuSXQgPSB3b3Jkc1tzV29yZEdyb3VwXTtcbiAgICBpZiAoc2Vlbkl0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgc2Vlbkl0ID0gY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZihzV29yZEdyb3VwLCBydWxlcywgY250UmVjKTtcbiAgICAgICAgdXRpbHMuZGVlcEZyZWV6ZShzZWVuSXQpO1xuICAgICAgICB3b3Jkc1tzV29yZEdyb3VwXSA9IHNlZW5JdDtcbiAgICB9XG4gICAgaWYgKCFzZWVuSXQgfHwgc2Vlbkl0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBsb2dnZXIoXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBcXFwiXCIgKyBzV29yZEdyb3VwICsgXCJcXFwiIGluIHNlbnRlbmNlIFxcXCJcIlxuICAgICAgICAgICAgKyBzZW50ZW5jZSArIFwiXFxcIlwiKTtcbiAgICAgICAgaWYgKHNXb3JkR3JvdXAuaW5kZXhPZihcIiBcIikgPD0gMCkge1xuICAgICAgICAgICAgZGVidWdsb2coXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBwcmltaXRpdmUgKCEpXCIgKyBzV29yZEdyb3VwKTtcbiAgICAgICAgfVxuICAgICAgICBkZWJ1Z2xvZyhcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIFwiICsgc1dvcmRHcm91cCk7XG4gICAgICAgIGlmICghc2Vlbkl0KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RpbmcgZW10cHkgbGlzdCwgbm90IHVuZGVmaW5lZCBmb3IgXFxcIlwiICsgc1dvcmRHcm91cCArIFwiXFxcIlwiKTtcbiAgICAgICAgfVxuICAgICAgICB3b3Jkc1tzV29yZEdyb3VwXSA9IFtdO1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHJldHVybiB1dGlscy5jbG9uZURlZXAoc2Vlbkl0KTtcbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZUFXb3JkID0gY2F0ZWdvcml6ZUFXb3JkO1xuLyoqXG4gKiBHaXZlbiBhICBzdHJpbmcsIGJyZWFrIGl0IGRvd24gaW50byBjb21wb25lbnRzLFxuICogW1snQScsICdCJ10sIFsnQSBCJ11dXG4gKlxuICogdGhlbiBjYXRlZ29yaXplV29yZHNcbiAqIHJldHVybmluZ1xuICpcbiAqIFsgW1sgeyBjYXRlZ29yeTogJ3N5c3RlbUlkJywgd29yZCA6ICdBJ30sXG4gKiAgICAgIHsgY2F0ZWdvcnk6ICdvdGhlcnRoaW5nJywgd29yZCA6ICdBJ31cbiAqICAgIF0sXG4gKiAgICAvLyByZXN1bHQgb2YgQlxuICogICAgWyB7IGNhdGVnb3J5OiAnc3lzdGVtSWQnLCB3b3JkIDogJ0InfSxcbiAqICAgICAgeyBjYXRlZ29yeTogJ290aGVydGhpbmcnLCB3b3JkIDogJ0EnfVxuICogICAgICB7IGNhdGVnb3J5OiAnYW5vdGhlcnRyeXAnLCB3b3JkIDogJ0InfVxuICogICAgXVxuICogICBdLFxuICogXV1dXG4gKlxuICpcbiAqXG4gKi9cbmZ1bmN0aW9uIGFuYWx5emVTdHJpbmcoc1N0cmluZywgcnVsZXMsIHdvcmRzKSB7XG4gICAgdmFyIGNudCA9IDA7XG4gICAgdmFyIGZhYyA9IDE7XG4gICAgdmFyIHUgPSBicmVha2Rvd24uYnJlYWtkb3duU3RyaW5nKHNTdHJpbmcsIEFsZ29sLk1heFNwYWNlc1BlckNvbWJpbmVkV29yZCk7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCJoZXJlIGJyZWFrZG93blwiICsgSlNPTi5zdHJpbmdpZnkodSkpO1xuICAgIH1cbiAgICAvL2NvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHUpKTtcbiAgICB3b3JkcyA9IHdvcmRzIHx8IHt9O1xuICAgIGRlYnVncGVyZigndGhpcyBtYW55IGtub3duIHdvcmRzOiAnICsgT2JqZWN0LmtleXMod29yZHMpLmxlbmd0aCk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIHZhciBjbnRSZWMgPSB7fTtcbiAgICB1LmZvckVhY2goZnVuY3Rpb24gKGFCcmVha0Rvd25TZW50ZW5jZSkge1xuICAgICAgICB2YXIgY2F0ZWdvcml6ZWRTZW50ZW5jZSA9IFtdO1xuICAgICAgICB2YXIgaXNWYWxpZCA9IGFCcmVha0Rvd25TZW50ZW5jZS5ldmVyeShmdW5jdGlvbiAoc1dvcmRHcm91cCwgaW5kZXgpIHtcbiAgICAgICAgICAgIHZhciBzZWVuSXQgPSBjYXRlZ29yaXplQVdvcmQoc1dvcmRHcm91cCwgcnVsZXMsIHNTdHJpbmcsIHdvcmRzLCBjbnRSZWMpO1xuICAgICAgICAgICAgaWYgKHNlZW5JdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRlZ29yaXplZFNlbnRlbmNlW2luZGV4XSA9IHNlZW5JdDtcbiAgICAgICAgICAgIGNudCA9IGNudCArIHNlZW5JdC5sZW5ndGg7XG4gICAgICAgICAgICBmYWMgPSBmYWMgKiBzZWVuSXQubGVuZ3RoO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoaXNWYWxpZCkge1xuICAgICAgICAgICAgcmVzLnB1c2goY2F0ZWdvcml6ZWRTZW50ZW5jZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBkZWJ1Z2xvZyhcIiBzZW50ZW5jZXMgXCIgKyB1Lmxlbmd0aCArIFwiIG1hdGNoZXMgXCIgKyBjbnQgKyBcIiBmYWM6IFwiICsgZmFjKTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCAmJiB1Lmxlbmd0aCkge1xuICAgICAgICBkZWJ1Z2xvZyhcImZpcnN0IG1hdGNoIFwiICsgSlNPTi5zdHJpbmdpZnkodSwgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIGRlYnVncGVyZihcIiBzZW50ZW5jZXMgXCIgKyB1Lmxlbmd0aCArIFwiIC8gXCIgKyByZXMubGVuZ3RoICsgXCIgbWF0Y2hlcyBcIiArIGNudCArIFwiIGZhYzogXCIgKyBmYWMgKyBcIiByZWMgOiBcIiArIEpTT04uc3RyaW5naWZ5KGNudFJlYywgdW5kZWZpbmVkLCAyKSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuYW5hbHl6ZVN0cmluZyA9IGFuYWx5emVTdHJpbmc7XG4vKlxuWyBbYSxiXSwgW2MsZF1dXG5cbjAwIGFcbjAxIGJcbjEwIGNcbjExIGRcbjEyIGNcbiovXG52YXIgY2xvbmUgPSB1dGlscy5jbG9uZURlZXA7XG5mdW5jdGlvbiBjb3B5VmVjTWVtYmVycyh1KSB7XG4gICAgdmFyIGkgPSAwO1xuICAgIGZvciAoaSA9IDA7IGkgPCB1Lmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHVbaV0gPSBjbG9uZSh1W2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIHU7XG59XG4vLyB3ZSBjYW4gcmVwbGljYXRlIHRoZSB0YWlsIG9yIHRoZSBoZWFkLFxuLy8gd2UgcmVwbGljYXRlIHRoZSB0YWlsIGFzIGl0IGlzIHNtYWxsZXIuXG4vLyBbYSxiLGMgXVxuZnVuY3Rpb24gZXhwYW5kTWF0Y2hBcnIoZGVlcCkge1xuICAgIHZhciBhID0gW107XG4gICAgdmFyIGxpbmUgPSBbXTtcbiAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gSlNPTi5zdHJpbmdpZnkoZGVlcCkgOiAnLScpO1xuICAgIGRlZXAuZm9yRWFjaChmdW5jdGlvbiAodUJyZWFrRG93bkxpbmUsIGlJbmRleCkge1xuICAgICAgICBsaW5lW2lJbmRleF0gPSBbXTtcbiAgICAgICAgdUJyZWFrRG93bkxpbmUuZm9yRWFjaChmdW5jdGlvbiAoYVdvcmRHcm91cCwgd2dJbmRleCkge1xuICAgICAgICAgICAgbGluZVtpSW5kZXhdW3dnSW5kZXhdID0gW107XG4gICAgICAgICAgICBhV29yZEdyb3VwLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkVmFyaWFudCwgaVdWSW5kZXgpIHtcbiAgICAgICAgICAgICAgICBsaW5lW2lJbmRleF1bd2dJbmRleF1baVdWSW5kZXhdID0gb1dvcmRWYXJpYW50O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyBKU09OLnN0cmluZ2lmeShsaW5lKSA6ICctJyk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIHZhciBudmVjcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZS5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgdmVjcyA9IFtbXV07XG4gICAgICAgIHZhciBudmVjcyA9IFtdO1xuICAgICAgICB2YXIgcnZlYyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBrID0gMDsgayA8IGxpbmVbaV0ubGVuZ3RoOyArK2spIHtcbiAgICAgICAgICAgIC8vdmVjcyBpcyB0aGUgdmVjdG9yIG9mIGFsbCBzbyBmYXIgc2VlbiB2YXJpYW50cyB1cCB0byBrIHdncy5cbiAgICAgICAgICAgIHZhciBuZXh0QmFzZSA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIgbCA9IDA7IGwgPCBsaW5lW2ldW2tdLmxlbmd0aDsgKytsKSB7XG4gICAgICAgICAgICAgICAgLy9kZWJ1Z2xvZyhcInZlY3Mgbm93XCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzKSk7XG4gICAgICAgICAgICAgICAgbnZlY3MgPSBbXTsgLy92ZWNzLnNsaWNlKCk7IC8vIGNvcHkgdGhlIHZlY1tpXSBiYXNlIHZlY3RvcjtcbiAgICAgICAgICAgICAgICAvL2RlYnVnbG9nKFwidmVjcyBjb3BpZWQgbm93XCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIHUgPSAwOyB1IDwgdmVjcy5sZW5ndGg7ICsrdSkge1xuICAgICAgICAgICAgICAgICAgICBudmVjc1t1XSA9IHZlY3NbdV0uc2xpY2UoKTsgLy9cbiAgICAgICAgICAgICAgICAgICAgbnZlY3NbdV0gPSBjb3B5VmVjTWVtYmVycyhudmVjc1t1XSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIGRlYnVnbG9nKFwiY29waWVkIHZlY3NbXCIrIHUrXCJdXCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzW3VdKSk7XG4gICAgICAgICAgICAgICAgICAgIG52ZWNzW3VdLnB1c2goY2xvbmUobGluZVtpXVtrXVtsXSkpOyAvLyBwdXNoIHRoZSBsdGggdmFyaWFudFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyAgIGRlYnVnbG9nKFwiIGF0ICAgICBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiBuZXh0YmFzZSA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpXG4gICAgICAgICAgICAgICAgLy8gICBkZWJ1Z2xvZyhcIiBhcHBlbmQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbnZlY3MgICAgPlwiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKVxuICAgICAgICAgICAgICAgIG5leHRCYXNlID0gbmV4dEJhc2UuY29uY2F0KG52ZWNzKTtcbiAgICAgICAgICAgIH0gLy9jb25zdHJ1XG4gICAgICAgICAgICAvLyAgZGVidWdsb2coXCJub3cgYXQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxuICAgICAgICAgICAgdmVjcyA9IG5leHRCYXNlO1xuICAgICAgICB9XG4gICAgICAgIGRlYnVnbG9nVihkZWJ1Z2xvZ1YuZW5hYmxlZCA/IChcIkFQUEVORElORyBUTyBSRVNcIiArIGkgKyBcIjpcIiArIGwgKyBcIiA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpIDogJy0nKTtcbiAgICAgICAgcmVzID0gcmVzLmNvbmNhdCh2ZWNzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZXhwYW5kTWF0Y2hBcnIgPSBleHBhbmRNYXRjaEFycjtcbi8qKlxuICogQ2FsY3VsYXRlIGEgd2VpZ2h0IGZhY3RvciBmb3IgYSBnaXZlbiBkaXN0YW5jZSBhbmRcbiAqIGNhdGVnb3J5XG4gKiBAcGFyYW0ge2ludGVnZXJ9IGRpc3QgZGlzdGFuY2UgaW4gd29yZHNcbiAqIEBwYXJhbSB7c3RyaW5nfSBjYXRlZ29yeSBjYXRlZ29yeSB0byB1c2VcbiAqIEByZXR1cm5zIHtudW1iZXJ9IGEgZGlzdGFuY2UgZmFjdG9yID49IDFcbiAqICAxLjAgZm9yIG5vIGVmZmVjdFxuICovXG5mdW5jdGlvbiByZWluZm9yY2VEaXN0V2VpZ2h0KGRpc3QsIGNhdGVnb3J5KSB7XG4gICAgdmFyIGFicyA9IE1hdGguYWJzKGRpc3QpO1xuICAgIHJldHVybiAxLjAgKyAoQWxnb2wuYVJlaW5mb3JjZURpc3RXZWlnaHRbYWJzXSB8fCAwKTtcbn1cbmV4cG9ydHMucmVpbmZvcmNlRGlzdFdlaWdodCA9IHJlaW5mb3JjZURpc3RXZWlnaHQ7XG4vKipcbiAqIEdpdmVuIGEgc2VudGVuY2UsIGV4dGFjdCBjYXRlZ29yaWVzXG4gKi9cbmZ1bmN0aW9uIGV4dHJhY3RDYXRlZ29yeU1hcChvU2VudGVuY2UpIHtcbiAgICB2YXIgcmVzID0ge307XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/ICgnZXh0cmFjdENhdGVnb3J5TWFwICcgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpKSA6ICctJyk7XG4gICAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpSW5kZXgpIHtcbiAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBJRk1hdGNoLkNBVF9DQVRFR09SWSkge1xuICAgICAgICAgICAgcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddID0gcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddIHx8IFtdO1xuICAgICAgICAgICAgcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddLnB1c2goeyBwb3M6IGlJbmRleCB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHV0aWxzLmRlZXBGcmVlemUocmVzKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5leHRyYWN0Q2F0ZWdvcnlNYXAgPSBleHRyYWN0Q2F0ZWdvcnlNYXA7XG5mdW5jdGlvbiByZWluRm9yY2VTZW50ZW5jZShvU2VudGVuY2UpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICB2YXIgb0NhdGVnb3J5TWFwID0gZXh0cmFjdENhdGVnb3J5TWFwKG9TZW50ZW5jZSk7XG4gICAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpSW5kZXgpIHtcbiAgICAgICAgdmFyIG0gPSBvQ2F0ZWdvcnlNYXBbb1dvcmQuY2F0ZWdvcnldIHx8IFtdO1xuICAgICAgICBtLmZvckVhY2goZnVuY3Rpb24gKG9Qb3NpdGlvbikge1xuICAgICAgICAgICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgICAgICAgICBvV29yZC5yZWluZm9yY2UgPSBvV29yZC5yZWluZm9yY2UgfHwgMTtcbiAgICAgICAgICAgIHZhciBib29zdCA9IHJlaW5mb3JjZURpc3RXZWlnaHQoaUluZGV4IC0gb1Bvc2l0aW9uLnBvcywgb1dvcmQuY2F0ZWdvcnkpO1xuICAgICAgICAgICAgb1dvcmQucmVpbmZvcmNlICo9IGJvb3N0O1xuICAgICAgICAgICAgb1dvcmQuX3JhbmtpbmcgKj0gYm9vc3Q7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaUluZGV4KSB7XG4gICAgICAgIGlmIChpSW5kZXggPiAwKSB7XG4gICAgICAgICAgICBpZiAob1NlbnRlbmNlW2lJbmRleCAtIDFdLmNhdGVnb3J5ID09PSBcIm1ldGFcIiAmJiAob1dvcmQuY2F0ZWdvcnkgPT09IG9TZW50ZW5jZVtpSW5kZXggLSAxXS5tYXRjaGVkU3RyaW5nKSkge1xuICAgICAgICAgICAgICAgIG9Xb3JkLnJlaW5mb3JjZSA9IG9Xb3JkLnJlaW5mb3JjZSB8fCAxO1xuICAgICAgICAgICAgICAgIHZhciBib29zdCA9IHJlaW5mb3JjZURpc3RXZWlnaHQoMSwgb1dvcmQuY2F0ZWdvcnkpO1xuICAgICAgICAgICAgICAgIG9Xb3JkLnJlaW5mb3JjZSAqPSBib29zdDtcbiAgICAgICAgICAgICAgICBvV29yZC5fcmFua2luZyAqPSBib29zdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBvU2VudGVuY2U7XG59XG5leHBvcnRzLnJlaW5Gb3JjZVNlbnRlbmNlID0gcmVpbkZvcmNlU2VudGVuY2U7XG52YXIgU2VudGVuY2UgPSByZXF1aXJlKFwiLi9zZW50ZW5jZVwiKTtcbmZ1bmN0aW9uIHJlaW5Gb3JjZShhQ2F0ZWdvcml6ZWRBcnJheSkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIGFDYXRlZ29yaXplZEFycmF5LmZvckVhY2goZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICByZWluRm9yY2VTZW50ZW5jZShvU2VudGVuY2UpO1xuICAgIH0pO1xuICAgIGFDYXRlZ29yaXplZEFycmF5LnNvcnQoU2VudGVuY2UuY21wUmFua2luZ1Byb2R1Y3QpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiYWZ0ZXIgcmVpbmZvcmNlXCIgKyBhQ2F0ZWdvcml6ZWRBcnJheS5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICAgIH1cbiAgICByZXR1cm4gYUNhdGVnb3JpemVkQXJyYXk7XG59XG5leHBvcnRzLnJlaW5Gb3JjZSA9IHJlaW5Gb3JjZTtcbi8vLyBiZWxvdyBtYXkgbm8gbG9uZ2VyIGJlIHVzZWRcbmZ1bmN0aW9uIG1hdGNoUmVnRXhwKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBzS2V5ID0gb1J1bGUua2V5O1xuICAgIHZhciBzMSA9IGNvbnRleHRbb1J1bGUua2V5XS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciByZWcgPSBvUnVsZS5yZWdleHA7XG4gICAgdmFyIG0gPSByZWcuZXhlYyhzMSk7XG4gICAgaWYgKGRlYnVnbG9nVi5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nVihcImFwcGx5aW5nIHJlZ2V4cDogXCIgKyBzMSArIFwiIFwiICsgSlNPTi5zdHJpbmdpZnkobSkpO1xuICAgIH1cbiAgICBpZiAoIW0pIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCwgb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KTtcbiAgICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2dWKEpTT04uc3RyaW5naWZ5KGRlbHRhKSk7XG4gICAgICAgIGRlYnVnbG9nVihKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgb0V4dHJhY3RlZENvbnRleHQgPSBleHRyYWN0QXJnc01hcChtLCBvUnVsZS5hcmdzTWFwKTtcbiAgICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2dWKFwiZXh0cmFjdGVkIGFyZ3MgXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZS5hcmdzTWFwKSk7XG4gICAgICAgIGRlYnVnbG9nVihcIm1hdGNoIFwiICsgSlNPTi5zdHJpbmdpZnkobSkpO1xuICAgICAgICBkZWJ1Z2xvZ1YoXCJleHRyYWN0ZWQgYXJncyBcIiArIEpTT04uc3RyaW5naWZ5KG9FeHRyYWN0ZWRDb250ZXh0KSk7XG4gICAgfVxuICAgIHZhciByZXMgPSBBbnlPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKTtcbiAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpO1xuICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcbiAgICBpZiAob0V4dHJhY3RlZENvbnRleHRbc0tleV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXNbc0tleV0gPSBvRXh0cmFjdGVkQ29udGV4dFtzS2V5XTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMub3ZlcnJpZGUpIHtcbiAgICAgICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xuICAgICAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpO1xuICAgIH1cbiAgICBPYmplY3QuZnJlZXplKHJlcyk7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/ICgnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSkgOiAnLScpO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLm1hdGNoUmVnRXhwID0gbWF0Y2hSZWdFeHA7XG5mdW5jdGlvbiBzb3J0QnlXZWlnaHQoc0tleSwgb0NvbnRleHRBLCBvQ29udGV4dEIpIHtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZ1YoJ3NvcnRpbmc6ICcgKyBzS2V5ICsgJ2ludm9rZWQgd2l0aFxcbiAxOicgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEEsIHVuZGVmaW5lZCwgMikgK1xuICAgICAgICAgICAgXCIgdnMgXFxuIDI6XCIgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEIsIHVuZGVmaW5lZCwgMikpO1xuICAgIH1cbiAgICB2YXIgcmFua2luZ0EgPSBwYXJzZUZsb2F0KG9Db250ZXh0QVtcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcbiAgICB2YXIgcmFua2luZ0IgPSBwYXJzZUZsb2F0KG9Db250ZXh0QltcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcbiAgICBpZiAocmFua2luZ0EgIT09IHJhbmtpbmdCKSB7XG4gICAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZyhcIiByYW5raW4gZGVsdGFcIiArIDEwMCAqIChyYW5raW5nQiAtIHJhbmtpbmdBKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIDEwMCAqIChyYW5raW5nQiAtIHJhbmtpbmdBKTtcbiAgICB9XG4gICAgdmFyIHdlaWdodEEgPSBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QVtcIl93ZWlnaHRcIl1bc0tleV0gfHwgMDtcbiAgICB2YXIgd2VpZ2h0QiA9IG9Db250ZXh0QltcIl93ZWlnaHRcIl0gJiYgb0NvbnRleHRCW1wiX3dlaWdodFwiXVtzS2V5XSB8fCAwO1xuICAgIHJldHVybiArKHdlaWdodEIgLSB3ZWlnaHRBKTtcbn1cbmV4cG9ydHMuc29ydEJ5V2VpZ2h0ID0gc29ydEJ5V2VpZ2h0O1xuLy8gV29yZCwgU3lub255bSwgUmVnZXhwIC8gRXh0cmFjdGlvblJ1bGVcbmZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBvUnVsZXMsIG9wdGlvbnMpIHtcbiAgICB2YXIgc0tleSA9IG9SdWxlc1swXS5rZXk7XG4gICAgLy8gY2hlY2sgdGhhdCBydWxlXG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgLy8gY2hlY2sgY29uc2lzdGVuY3lcbiAgICAgICAgb1J1bGVzLmV2ZXJ5KGZ1bmN0aW9uIChpUnVsZSkge1xuICAgICAgICAgICAgaWYgKGlSdWxlLmtleSAhPT0gc0tleSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkluaG9tb2dlbm91cyBrZXlzIGluIHJ1bGVzLCBleHBlY3RlZCBcIiArIHNLZXkgKyBcIiB3YXMgXCIgKyBKU09OLnN0cmluZ2lmeShpUnVsZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBsb29rIGZvciBydWxlcyB3aGljaCBtYXRjaFxuICAgIHZhciByZXMgPSBvUnVsZXMubWFwKGZ1bmN0aW9uIChvUnVsZSkge1xuICAgICAgICAvLyBpcyB0aGlzIHJ1bGUgYXBwbGljYWJsZVxuICAgICAgICBzd2l0Y2ggKG9SdWxlLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgMCAvKiBXT1JEICovOlxuICAgICAgICAgICAgICAgIHJldHVybiBtYXRjaFdvcmQob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgY2FzZSAxIC8qIFJFR0VYUCAqLzpcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2hSZWdFeHAob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSkuZmlsdGVyKGZ1bmN0aW9uIChvcmVzKSB7XG4gICAgICAgIHJldHVybiAhIW9yZXM7XG4gICAgfSkuc29ydChzb3J0QnlXZWlnaHQuYmluZCh0aGlzLCBzS2V5KSk7XG4gICAgLy9kZWJ1Z2xvZyhcImhhc3NvcnRlZFwiICsgSlNPTi5zdHJpbmdpZnkocmVzLHVuZGVmaW5lZCwyKSk7XG4gICAgcmV0dXJuIHJlcztcbiAgICAvLyBPYmplY3Qua2V5cygpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAvLyB9KTtcbn1cbmV4cG9ydHMuYXVnbWVudENvbnRleHQxID0gYXVnbWVudENvbnRleHQxO1xuZnVuY3Rpb24gYXVnbWVudENvbnRleHQoY29udGV4dCwgYVJ1bGVzKSB7XG4gICAgdmFyIG9wdGlvbnMxID0ge1xuICAgICAgICBtYXRjaG90aGVyczogdHJ1ZSxcbiAgICAgICAgb3ZlcnJpZGU6IGZhbHNlXG4gICAgfTtcbiAgICB2YXIgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMxKTtcbiAgICBpZiAoYVJlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdmFyIG9wdGlvbnMyID0ge1xuICAgICAgICAgICAgbWF0Y2hvdGhlcnM6IGZhbHNlLFxuICAgICAgICAgICAgb3ZlcnJpZGU6IHRydWVcbiAgICAgICAgfTtcbiAgICAgICAgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMyKTtcbiAgICB9XG4gICAgcmV0dXJuIGFSZXM7XG59XG5leHBvcnRzLmF1Z21lbnRDb250ZXh0ID0gYXVnbWVudENvbnRleHQ7XG5mdW5jdGlvbiBpbnNlcnRPcmRlcmVkKHJlc3VsdCwgaUluc2VydGVkTWVtYmVyLCBsaW1pdCkge1xuICAgIC8vIFRPRE86IHVzZSBzb21lIHdlaWdodFxuICAgIGlmIChyZXN1bHQubGVuZ3RoIDwgbGltaXQpIHtcbiAgICAgICAgcmVzdWx0LnB1c2goaUluc2VydGVkTWVtYmVyKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cbmV4cG9ydHMuaW5zZXJ0T3JkZXJlZCA9IGluc2VydE9yZGVyZWQ7XG5mdW5jdGlvbiB0YWtlVG9wTihhcnIpIHtcbiAgICB2YXIgdSA9IGFyci5maWx0ZXIoZnVuY3Rpb24gKGlubmVyQXJyKSB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwOyB9KTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgLy8gc2hpZnQgb3V0IHRoZSB0b3Agb25lc1xuICAgIHUgPSB1Lm1hcChmdW5jdGlvbiAoaUFycikge1xuICAgICAgICB2YXIgdG9wID0gaUFyci5zaGlmdCgpO1xuICAgICAgICByZXMgPSBpbnNlcnRPcmRlcmVkKHJlcywgdG9wLCA1KTtcbiAgICAgICAgcmV0dXJuIGlBcnI7XG4gICAgfSkuZmlsdGVyKGZ1bmN0aW9uIChpbm5lckFycikgeyByZXR1cm4gaW5uZXJBcnIubGVuZ3RoID4gMDsgfSk7XG4gICAgLy8gYXMgQXJyYXk8QXJyYXk8SUZNYXRjaC5jb250ZXh0Pj5cbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy50YWtlVG9wTiA9IHRha2VUb3BOO1xudmFyIGlucHV0RmlsdGVyUnVsZXMgPSByZXF1aXJlKFwiLi9pbnB1dEZpbHRlclJ1bGVzXCIpO1xudmFyIHJtO1xuZnVuY3Rpb24gZ2V0Uk1PbmNlKCkge1xuICAgIGlmICghcm0pIHtcbiAgICAgICAgcm0gPSBpbnB1dEZpbHRlclJ1bGVzLmdldFJ1bGVNYXAoKTtcbiAgICB9XG4gICAgcmV0dXJuIHJtO1xufVxuZnVuY3Rpb24gYXBwbHlSdWxlcyhjb250ZXh0KSB7XG4gICAgdmFyIGJlc3ROID0gW2NvbnRleHRdO1xuICAgIGlucHV0RmlsdGVyUnVsZXMub0tleU9yZGVyLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgICAgdmFyIGJlc3ROZXh0ID0gW107XG4gICAgICAgIGJlc3ROLmZvckVhY2goZnVuY3Rpb24gKG9Db250ZXh0KSB7XG4gICAgICAgICAgICBpZiAob0NvbnRleHRbc0tleV0pIHtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZygnKiogYXBwbHlpbmcgcnVsZXMgZm9yICcgKyBzS2V5KTtcbiAgICAgICAgICAgICAgICB2YXIgcmVzID0gYXVnbWVudENvbnRleHQob0NvbnRleHQsIGdldFJNT25jZSgpW3NLZXldIHx8IFtdKTtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKCcqKiByZXN1bHQgZm9yICcgKyBzS2V5ICsgJyA9ICcgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpIDogJy0nKTtcbiAgICAgICAgICAgICAgICBiZXN0TmV4dC5wdXNoKHJlcyB8fCBbXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBydWxlIG5vdCByZWxldmFudFxuICAgICAgICAgICAgICAgIGJlc3ROZXh0LnB1c2goW29Db250ZXh0XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBiZXN0TiA9IHRha2VUb3BOKGJlc3ROZXh0KTtcbiAgICB9KTtcbiAgICByZXR1cm4gYmVzdE47XG59XG5leHBvcnRzLmFwcGx5UnVsZXMgPSBhcHBseVJ1bGVzO1xuZnVuY3Rpb24gYXBwbHlSdWxlc1BpY2tGaXJzdChjb250ZXh0KSB7XG4gICAgdmFyIHIgPSBhcHBseVJ1bGVzKGNvbnRleHQpO1xuICAgIHJldHVybiByICYmIHJbMF07XG59XG5leHBvcnRzLmFwcGx5UnVsZXNQaWNrRmlyc3QgPSBhcHBseVJ1bGVzUGlja0ZpcnN0O1xuLyoqXG4gKiBEZWNpZGUgd2hldGhlciB0byByZXF1ZXJ5IGZvciBhIGNvbnRldFxuICovXG5mdW5jdGlvbiBkZWNpZGVPblJlUXVlcnkoY29udGV4dCkge1xuICAgIHJldHVybiBbXTtcbn1cbmV4cG9ydHMuZGVjaWRlT25SZVF1ZXJ5ID0gZGVjaWRlT25SZVF1ZXJ5O1xuIiwiLyoqXHJcbiAqIHRoZSBpbnB1dCBmaWx0ZXIgc3RhZ2UgcHJlcHJvY2Vzc2VzIGEgY3VycmVudCBjb250ZXh0XHJcbiAqXHJcbiAqIEl0IGEpIGNvbWJpbmVzIG11bHRpLXNlZ21lbnQgYXJndW1lbnRzIGludG8gb25lIGNvbnRleHQgbWVtYmVyc1xyXG4gKiBJdCBiKSBhdHRlbXB0cyB0byBhdWdtZW50IHRoZSBjb250ZXh0IGJ5IGFkZGl0aW9uYWwgcXVhbGlmaWNhdGlvbnNcclxuICogICAgICAgICAgIChNaWQgdGVybSBnZW5lcmF0aW5nIEFsdGVybmF0aXZlcywgZS5nLlxyXG4gKiAgICAgICAgICAgICAgICAgQ2xpZW50U2lkZVRhcmdldFJlc29sdXRpb24gLT4gdW5pdCB0ZXN0P1xyXG4gKiAgICAgICAgICAgICAgICAgQ2xpZW50U2lkZVRhcmdldFJlc29sdXRpb24gLT4gc291cmNlID9cclxuICogICAgICAgICAgIClcclxuICogIFNpbXBsZSBydWxlcyBsaWtlICBJbnRlbnRcclxuICpcclxuICpcclxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuaW5wdXRGaWx0ZXJcclxuICogQGZpbGUgaW5wdXRGaWx0ZXIudHNcclxuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxyXG4gKi9cclxuLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vbGliL25vZGUtNC5kLnRzXCIgLz5cclxuaW1wb3J0ICogYXMgZGlzdGFuY2UgZnJvbSAnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluJztcclxuXHJcbmltcG9ydCAqIGFzIExvZ2dlciBmcm9tICcuLi91dGlscy9sb2dnZXInXHJcblxyXG5jb25zdCBsb2dnZXIgPSBMb2dnZXIubG9nZ2VyKCdpbnB1dEZpbHRlcicpO1xyXG5cclxuaW1wb3J0ICogYXMgZGVidWcgZnJvbSAnZGVidWcnO1xyXG52YXIgZGVidWdwZXJmID0gZGVidWcoJ3BlcmYnKTtcclxuXHJcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gJy4uL3V0aWxzL3V0aWxzJztcclxuXHJcblxyXG5pbXBvcnQgKiBhcyBBbGdvbCBmcm9tICcuL2FsZ29sJztcclxuXHJcbmltcG9ydCAqIGFzIElNYXRjaCBmcm9tICcuL2lmbWF0Y2gnO1xyXG5cclxuaW1wb3J0ICogYXMgYnJlYWtkb3duIGZyb20gJy4vYnJlYWtkb3duJztcclxuXHJcbmNvbnN0IEFueU9iamVjdCA9IDxhbnk+T2JqZWN0O1xyXG5cclxuY29uc3QgZGVidWdsb2cgPSBkZWJ1ZygnaW5wdXRGaWx0ZXInKVxyXG5jb25zdCBkZWJ1Z2xvZ1YgPSBkZWJ1ZygnaW5wdXRWRmlsdGVyJylcclxuY29uc3QgZGVidWdsb2dNID0gZGVidWcoJ2lucHV0TUZpbHRlcicpXHJcblxyXG5cclxuXHJcbmltcG9ydCAqIGFzIG1hdGNoZGF0YSBmcm9tICcuL21hdGNoZGF0YSc7XHJcbnZhciBvVW5pdFRlc3RzID0gbWF0Y2hkYXRhLm9Vbml0VGVzdHNcclxuXHJcbmZ1bmN0aW9uIGNudENoYXJzKHN0ciA6IHN0cmluZywgbGVuIDogbnVtYmVyKSB7XHJcbiAgdmFyIGNudCA9IDA7XHJcbiAgZm9yKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XHJcbiAgICBjbnQgKz0gKHN0ci5jaGFyQXQoaSkgPT09ICdYJyk/IDEgOiAwO1xyXG4gIH1cclxuICByZXR1cm4gY250O1xyXG59XHJcblxyXG4vKipcclxuICogQHBhcmFtIHNUZXh0IHtzdHJpbmd9IHRoZSB0ZXh0IHRvIG1hdGNoIHRvIE5hdlRhcmdldFJlc29sdXRpb25cclxuICogQHBhcmFtIHNUZXh0MiB7c3RyaW5nfSB0aGUgcXVlcnkgdGV4dCwgZS5nLiBOYXZUYXJnZXRcclxuICpcclxuICogQHJldHVybiB0aGUgZGlzdGFuY2UsIG5vdGUgdGhhdCBpcyBpcyAqbm90KiBzeW1tZXRyaWMhXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY2FsY0Rpc3RhbmNlKHNUZXh0MTogc3RyaW5nLCBzVGV4dDI6IHN0cmluZyk6IG51bWJlciB7XHJcbiAgLy8gY29uc29sZS5sb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxyXG4gIHZhciBzMWxlbiA9IHNUZXh0MS5sZW5ndGg7XHJcbiAgdmFyIHMybGVuID0gc1RleHQyLmxlbmd0aDtcclxuICB2YXIgbWluID0gTWF0aC5taW4oczFsZW4sczJsZW4pO1xyXG4gIGlmKE1hdGguYWJzKHMxbGVuIC0gczJsZW4pID4gTWF0aC5taW4oczFsZW4sczJsZW4pKSB7XHJcbiAgICByZXR1cm4gMC4zO1xyXG4gIH1cclxuICB2YXIgZGlzdCA9IGRpc3RhbmNlLmphcm9XaW5rbGVyRGlzdGFuY2Uoc1RleHQxLHNUZXh0Mik7XHJcbiAgdmFyIGNudDEgPSBjbnRDaGFycyhzVGV4dDEsIHMxbGVuKTtcclxuICB2YXIgY250MiA9IGNudENoYXJzKHNUZXh0MiwgczJsZW4pO1xyXG4gIGlmKGNudDEgIT09IGNudDIpIHtcclxuICAgIGRpc3QgPSBkaXN0ICogMC43O1xyXG4gIH1cclxuICByZXR1cm4gZGlzdDtcclxuICAvKlxyXG4gIHZhciBhMCA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCksIHNUZXh0MilcclxuICBpZihkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xyXG4gICAgZGVidWdsb2dWKFwiZGlzdGFuY2VcIiArIGEwICsgXCJzdHJpcHBlZD5cIiArIHNUZXh0MS5zdWJzdHJpbmcoMCxzVGV4dDIubGVuZ3RoKSArIFwiPD5cIiArIHNUZXh0MisgXCI8XCIpO1xyXG4gIH1cclxuICBpZihhMCAqIDUwID4gMTUgKiBzVGV4dDIubGVuZ3RoKSB7XHJcbiAgICAgIHJldHVybiA0MDAwMDtcclxuICB9XHJcbiAgdmFyIGEgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEsIHNUZXh0MilcclxuICByZXR1cm4gYTAgKiA1MDAgLyBzVGV4dDIubGVuZ3RoICsgYVxyXG4gICovXHJcbn1cclxuXHJcblxyXG5cclxuLyoqXHJcbiAqIEBwYXJhbSBzVGV4dCB7c3RyaW5nfSB0aGUgdGV4dCB0byBtYXRjaCB0byBOYXZUYXJnZXRSZXNvbHV0aW9uXHJcbiAqIEBwYXJhbSBzVGV4dDIge3N0cmluZ30gdGhlIHF1ZXJ5IHRleHQsIGUuZy4gTmF2VGFyZ2V0XHJcbiAqXHJcbiAqIEByZXR1cm4gdGhlIGRpc3RhbmNlLCBub3RlIHRoYXQgaXMgaXMgKm5vdCogc3ltbWV0cmljIVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNEaXN0YW5jZUxldmVuKHNUZXh0MTogc3RyaW5nLCBzVGV4dDI6IHN0cmluZyk6IG51bWJlciB7XHJcbiAgLy8gY29uc29sZS5sb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxyXG4gICBpZigoKHNUZXh0MS5sZW5ndGggLSBzVGV4dDIubGVuZ3RoKSA+IEFsZ29sLmNhbGNEaXN0Lmxlbmd0aERlbHRhMSlcclxuICAgIHx8IChzVGV4dDIubGVuZ3RoID4gMS41ICogc1RleHQxLmxlbmd0aCApXHJcbiAgICB8fCAoc1RleHQyLmxlbmd0aCA8IChzVGV4dDEubGVuZ3RoLzIpKSApIHtcclxuICAgIHJldHVybiA1MDAwMDtcclxuICB9XHJcbiAgdmFyIGEwID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnN1YnN0cmluZygwLCBzVGV4dDIubGVuZ3RoKSwgc1RleHQyKVxyXG4gIGlmKGRlYnVnbG9nVi5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZ1YoXCJkaXN0YW5jZVwiICsgYTAgKyBcInN0cmlwcGVkPlwiICsgc1RleHQxLnN1YnN0cmluZygwLHNUZXh0Mi5sZW5ndGgpICsgXCI8PlwiICsgc1RleHQyKyBcIjxcIik7XHJcbiAgfVxyXG4gIGlmKGEwICogNTAgPiAxNSAqIHNUZXh0Mi5sZW5ndGgpIHtcclxuICAgICAgcmV0dXJuIDQwMDAwO1xyXG4gIH1cclxuICB2YXIgYSA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MSwgc1RleHQyKVxyXG4gIHJldHVybiBhMCAqIDUwMCAvIHNUZXh0Mi5sZW5ndGggKyBhXHJcbn1cclxuXHJcblxyXG5cclxuXHJcbmltcG9ydCAqIGFzIElGTWF0Y2ggZnJvbSAnLi4vbWF0Y2gvaWZtYXRjaCc7XHJcblxyXG50eXBlIElSdWxlID0gSUZNYXRjaC5JUnVsZVxyXG5cclxuXHJcbmludGVyZmFjZSBJTWF0Y2hPcHRpb25zIHtcclxuICBtYXRjaG90aGVycz86IGJvb2xlYW4sXHJcbiAgYXVnbWVudD86IGJvb2xlYW4sXHJcbiAgb3ZlcnJpZGU/OiBib29sZWFuXHJcbn1cclxuXHJcbmludGVyZmFjZSBJTWF0Y2hDb3VudCB7XHJcbiAgZXF1YWw6IG51bWJlclxyXG4gIGRpZmZlcmVudDogbnVtYmVyXHJcbiAgc3B1cmlvdXNSOiBudW1iZXJcclxuICBzcHVyaW91c0w6IG51bWJlclxyXG59XHJcblxyXG50eXBlIEVudW1SdWxlVHlwZSA9IElGTWF0Y2guRW51bVJ1bGVUeXBlXHJcblxyXG4vL2NvbnN0IGxldmVuQ3V0b2ZmID0gQWxnb2wuQ3V0b2ZmX0xldmVuU2h0ZWluO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBsZXZlblBlbmFsdHlPbGQoaTogbnVtYmVyKTogbnVtYmVyIHtcclxuICAvLyAwLT4gMVxyXG4gIC8vIDEgLT4gMC4xXHJcbiAgLy8gMTUwIC0+ICAwLjhcclxuICBpZiAoaSA9PT0gMCkge1xyXG4gICAgcmV0dXJuIDE7XHJcbiAgfVxyXG4gIC8vIHJldmVyc2UgbWF5IGJlIGJldHRlciB0aGFuIGxpbmVhclxyXG4gIHJldHVybiAxICsgaSAqICgwLjggLSAxKSAvIDE1MFxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbGV2ZW5QZW5hbHR5KGk6IG51bWJlcik6IG51bWJlciB7XHJcbiAgLy8gMSAtPiAxXHJcbiAgLy8gY3V0T2ZmID0+IDAuOFxyXG4gIHJldHVybiBpO1xyXG4gIC8vcmV0dXJuICAgMSAtICAoMSAtIGkpICowLjIvQWxnb2wuQ3V0b2ZmX1dvcmRNYXRjaDtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIG5vblByaXZhdGVLZXlzKG9BKSB7XHJcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG9BKS5maWx0ZXIoa2V5ID0+IHtcclxuICAgIHJldHVybiBrZXlbMF0gIT09ICdfJztcclxuICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNvdW50QWluQihvQSwgb0IsIGZuQ29tcGFyZSwgYUtleUlnbm9yZT8pOiBudW1iZXIge1xyXG4gIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gYUtleUlnbm9yZSA6XHJcbiAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xyXG4gIGZuQ29tcGFyZSA9IGZuQ29tcGFyZSB8fCBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9XHJcbiAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xyXG4gICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcclxuICB9KS5cclxuICAgIHJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XHJcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIChmbkNvbXBhcmUob0Fba2V5XSwgb0Jba2V5XSwga2V5KSA/IDEgOiAwKVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBwcmV2XHJcbiAgICB9LCAwKVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc3B1cmlvdXNBbm90SW5CKG9BLCBvQiwgYUtleUlnbm9yZT8pIHtcclxuICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxyXG4gICAgdHlwZW9mIGFLZXlJZ25vcmUgPT09IFwic3RyaW5nXCIgPyBbYUtleUlnbm9yZV0gOiBbXTtcclxuICByZXR1cm4gbm9uUHJpdmF0ZUtleXMob0EpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xyXG4gIH0pLlxyXG4gICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIDFcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldlxyXG4gICAgfSwgMClcclxufVxyXG5cclxuZnVuY3Rpb24gbG93ZXJDYXNlKG8pIHtcclxuICBpZiAodHlwZW9mIG8gPT09IFwic3RyaW5nXCIpIHtcclxuICAgIHJldHVybiBvLnRvTG93ZXJDYXNlKClcclxuICB9XHJcbiAgcmV0dXJuIG9cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmVDb250ZXh0KG9BLCBvQiwgYUtleUlnbm9yZT8pIHtcclxuICB2YXIgZXF1YWwgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpID09PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xyXG4gIHZhciBkaWZmZXJlbnQgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpICE9PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xyXG4gIHZhciBzcHVyaW91c0wgPSBzcHVyaW91c0Fub3RJbkIob0EsIG9CLCBhS2V5SWdub3JlKVxyXG4gIHZhciBzcHVyaW91c1IgPSBzcHVyaW91c0Fub3RJbkIob0IsIG9BLCBhS2V5SWdub3JlKVxyXG4gIHJldHVybiB7XHJcbiAgICBlcXVhbDogZXF1YWwsXHJcbiAgICBkaWZmZXJlbnQ6IGRpZmZlcmVudCxcclxuICAgIHNwdXJpb3VzTDogc3B1cmlvdXNMLFxyXG4gICAgc3B1cmlvdXNSOiBzcHVyaW91c1JcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNvcnRCeVJhbmsoYTogSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmcsIGI6IElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nKTogbnVtYmVyIHtcclxuICB2YXIgciA9IC0oKGEuX3JhbmtpbmcgfHwgMS4wKSAtIChiLl9yYW5raW5nIHx8IDEuMCkpO1xyXG4gIGlmIChyKSB7XHJcbiAgICByZXR1cm4gcjtcclxuICB9XHJcbiAgaWYgKGEuY2F0ZWdvcnkgJiYgYi5jYXRlZ29yeSkge1xyXG4gICAgciA9IGEuY2F0ZWdvcnkubG9jYWxlQ29tcGFyZShiLmNhdGVnb3J5KTtcclxuICAgIGlmIChyKSB7XHJcbiAgICAgIHJldHVybiByO1xyXG4gICAgfVxyXG4gIH1cclxuICBpZiAoYS5tYXRjaGVkU3RyaW5nICYmIGIubWF0Y2hlZFN0cmluZykge1xyXG4gICAgciA9IGEubWF0Y2hlZFN0cmluZy5sb2NhbGVDb21wYXJlKGIubWF0Y2hlZFN0cmluZyk7XHJcbiAgICBpZiAocikge1xyXG4gICAgICByZXR1cm4gcjtcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIDA7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tPbmVSdWxlKHN0cmluZzogc3RyaW5nLCBsY1N0cmluZyA6IHN0cmluZywgZXhhY3QgOiBib29sZWFuLFxyXG5yZXMgOiBBcnJheTxJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPixcclxub1J1bGUgOiBJTWF0Y2gubVJ1bGUsIGNudFJlYz8gOiBJQ250UmVjICkge1xyXG4gICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcclxuICAgICAgZGVidWdsb2dWKCdhdHRlbXB0aW5nIHRvIG1hdGNoIHJ1bGUgJyArIEpTT04uc3RyaW5naWZ5KG9SdWxlKSArIFwiIHRvIHN0cmluZyBcXFwiXCIgKyBzdHJpbmcgKyBcIlxcXCJcIik7XHJcbiAgICB9XHJcbiAgICBzd2l0Y2ggKG9SdWxlLnR5cGUpIHtcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5XT1JEOlxyXG4gICAgICAgIGlmKCFvUnVsZS5sb3dlcmNhc2V3b3JkKSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3J1bGUgd2l0aG91dCBhIGxvd2VyY2FzZSB2YXJpYW50JyArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKTtcclxuICAgICAgICAgfTtcclxuICAgICAgICBpZiAoZXhhY3QgJiYgb1J1bGUud29yZCA9PT0gc3RyaW5nIHx8IG9SdWxlLmxvd2VyY2FzZXdvcmQgPT09IGxjU3RyaW5nKSB7XHJcbiAgICAgICAgICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAgICAgICAgIGRlYnVnbG9nKFwiXFxuIW1hdGNoZWQgZXhhY3QgXCIgKyBzdHJpbmcgKyBcIj1cIiAgKyBvUnVsZS5sb3dlcmNhc2V3b3JkICArIFwiID0+IFwiICsgb1J1bGUubWF0Y2hlZFN0cmluZyArIFwiL1wiICsgb1J1bGUuY2F0ZWdvcnkpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmVzLnB1c2goe1xyXG4gICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcclxuICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxyXG4gICAgICAgICAgICBfcmFua2luZzogb1J1bGUuX3JhbmtpbmcgfHwgMS4wXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIWV4YWN0ICYmICFvUnVsZS5leGFjdE9ubHkpIHtcclxuICAgICAgICAgIHZhciBsZXZlbm1hdGNoID0gY2FsY0Rpc3RhbmNlKG9SdWxlLmxvd2VyY2FzZXdvcmQsIGxjU3RyaW5nKTtcclxuXHJcbi8qXHJcbiAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlXCIsIDEpO1xyXG4gICAgICAgICAgaWYobGV2ZW5tYXRjaCA8IDUwKSB7XHJcbiAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VFeHBcIiwgMSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZihsZXZlbm1hdGNoIDwgNDAwMDApIHtcclxuICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYyxcImNhbGNEaXN0YW5jZUJlbG93NDBrXCIsIDEpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgKi9cclxuICAgICAgICAgIC8vaWYob1J1bGUubG93ZXJjYXNld29yZCA9PT0gXCJjb3Ntb3NcIikge1xyXG4gICAgICAgICAgLy8gIGNvbnNvbGUubG9nKFwiaGVyZSByYW5raW5nIFwiICsgbGV2ZW5tYXRjaCArIFwiIFwiICsgb1J1bGUubG93ZXJjYXNld29yZCArIFwiIFwiICsgbGNTdHJpbmcpO1xyXG4gICAgICAgICAgLy99XHJcbiAgICAgICAgICBpZiAobGV2ZW5tYXRjaCA+PSBBbGdvbC5DdXRvZmZfV29yZE1hdGNoKSB7IC8vIGxldmVuQ3V0b2ZmKSB7XHJcbiAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VPa1wiLCAxKTtcclxuICAgICAgICAgICAgdmFyIHJlYyA9IHtcclxuICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcclxuICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBvUnVsZS5tYXRjaGVkU3RyaW5nLFxyXG4gICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgICBfcmFua2luZzogKG9SdWxlLl9yYW5raW5nIHx8IDEuMCkgKiBsZXZlblBlbmFsdHkobGV2ZW5tYXRjaCksXHJcbiAgICAgICAgICAgICAgbGV2ZW5tYXRjaDogbGV2ZW5tYXRjaFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBpZihkZWJ1Z2xvZykge1xyXG4gICAgICAgICAgICAgIGRlYnVnbG9nKFwiXFxuIWZ1enp5IFwiICsgKGxldmVubWF0Y2gpLnRvRml4ZWQoMykgKyBcIiBcIiArIHJlYy5fcmFua2luZy50b0ZpeGVkKDMpICsgXCIgIFwiICsgc3RyaW5nICsgXCI9XCIgICsgb1J1bGUubG93ZXJjYXNld29yZCAgKyBcIiA9PiBcIiArIG9SdWxlLm1hdGNoZWRTdHJpbmcgKyBcIi9cIiArIG9SdWxlLmNhdGVnb3J5KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXMucHVzaChyZWMpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5SRUdFWFA6IHtcclxuICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoXCIgaGVyZSByZWdleHBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKSlcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIG0gPSBvUnVsZS5yZWdleHAuZXhlYyhzdHJpbmcpXHJcbiAgICAgICAgaWYgKG0pIHtcclxuICAgICAgICAgIHJlcy5wdXNoKHtcclxuICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IChvUnVsZS5tYXRjaEluZGV4ICE9PSB1bmRlZmluZWQgJiYgbVtvUnVsZS5tYXRjaEluZGV4XSkgfHwgc3RyaW5nLFxyXG4gICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXHJcbiAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidW5rbm93biB0eXBlXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSlcclxuICAgIH1cclxufVxyXG5cclxuXHJcbmludGVyZmFjZSBJQ250UmVjIHtcclxuXHJcbn07XHJcblxyXG5mdW5jdGlvbiBhZGRDbnRSZWMoY250UmVjIDogSUNudFJlYywgbWVtYmVyIDogc3RyaW5nLCBudW1iZXIgOiBudW1iZXIpIHtcclxuICBpZigoIWNudFJlYykgfHwgKG51bWJlciA9PT0gMCkpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgY250UmVjW21lbWJlcl0gPSAoY250UmVjW21lbWJlcl0gfHwgMCkgKyBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjYXRlZ29yaXplU3RyaW5nKHdvcmQ6IHN0cmluZywgZXhhY3Q6IGJvb2xlYW4sIG9SdWxlczogQXJyYXk8SU1hdGNoLm1SdWxlPixcclxuIGNudFJlYz8gOiBJQ250UmVjKTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IHtcclxuICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXHJcbiAgaWYoZGVidWdsb2dNLmVuYWJsZWQgKSAge1xyXG4gICAgZGVidWdsb2dNKFwicnVsZXMgOiBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlcywgdW5kZWZpbmVkLCAyKSk7XHJcbiAgfVxyXG4gIHZhciBsY1N0cmluZyA9IHdvcmQudG9Mb3dlckNhc2UoKTtcclxuICB2YXIgcmVzOiBBcnJheTxJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiA9IFtdXHJcbiAgb1J1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XHJcbiAgICBjaGVja09uZVJ1bGUod29yZCxsY1N0cmluZyxleGFjdCxyZXMsb1J1bGUsY250UmVjKTtcclxuICB9KTtcclxuICByZXMuc29ydChzb3J0QnlSYW5rKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcG9zdEZpbHRlcihyZXMgOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4pIDogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IHtcclxuICByZXMuc29ydChzb3J0QnlSYW5rKTtcclxuICB2YXIgYmVzdFJhbmsgPSAwO1xyXG4gIC8vY29uc29sZS5sb2coXCJcXG5waWx0ZXJlZCBcIiArIEpTT04uc3RyaW5naWZ5KHJlcykpO1xyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nKFwiIHByZUZpbHRlciA6IFxcblwiICsgcmVzLm1hcChmdW5jdGlvbih3b3JkKSB7XHJcbiAgICAgIHJldHVybiBgICR7d29yZC5fcmFua2luZ30gID0+IFwiJHt3b3JkLmNhdGVnb3J5fVwiICR7d29yZC5tYXRjaGVkU3RyaW5nfSBcXG5gO1xyXG4gICAgfSkuam9pbihcIlxcblwiKSk7XHJcbiAgfVxyXG4gIHZhciByID0gcmVzLmZpbHRlcihmdW5jdGlvbihyZXN4LGluZGV4KSB7XHJcbiAgICBpZihpbmRleCA9PT0gMCkge1xyXG4gICAgICBiZXN0UmFuayA9IHJlc3guX3Jhbmtpbmc7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgLy8gMS0wLjkgPSAwLjFcclxuICAgIC8vIDEtIDAuOTMgPSAwLjdcclxuICAgIC8vIDEvN1xyXG4gICAgdmFyIGRlbHRhID0gYmVzdFJhbmsgLyByZXN4Ll9yYW5raW5nO1xyXG4gICAgaWYoKHJlc3gubWF0Y2hlZFN0cmluZyA9PT0gcmVzW2luZGV4LTFdLm1hdGNoZWRTdHJpbmcpXHJcbiAgICAgICYmIChyZXN4LmNhdGVnb3J5ID09PSByZXNbaW5kZXgtMV0uY2F0ZWdvcnkpKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIC8vY29uc29sZS5sb2coXCJcXG4gZGVsdGEgZm9yIFwiICsgZGVsdGEgKyBcIiAgXCIgKyByZXN4Ll9yYW5raW5nKTtcclxuICAgIGlmIChyZXN4LmxldmVubWF0Y2ggJiYgKGRlbHRhID4gMS4wMykpIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfSk7XHJcbiAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgICBkZWJ1Z2xvZyhgXFxuZmlsdGVyZWQgJHtyLmxlbmd0aH0vJHtyZXMubGVuZ3RofWAgKyBKU09OLnN0cmluZ2lmeShyKSk7XHJcbiAgfVxyXG4gIHJldHVybiByO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVN0cmluZzIod29yZDogc3RyaW5nLCBleGFjdDogYm9vbGVhbiwgIHJ1bGVzIDogSU1hdGNoLlNwbGl0UnVsZXNcclxuICAsIGNudFJlYz8gOklDbnRSZWMpOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4ge1xyXG4gIC8vIHNpbXBseSBhcHBseSBhbGwgcnVsZXNcclxuICBpZiAoZGVidWdsb2dNLmVuYWJsZWQgKSAge1xyXG4gICAgZGVidWdsb2dNKFwicnVsZXMgOiBcIiArIEpTT04uc3RyaW5naWZ5KHJ1bGVzLHVuZGVmaW5lZCwgMikpO1xyXG4gIH1cclxuICB2YXIgbGNTdHJpbmcgPSB3b3JkLnRvTG93ZXJDYXNlKCk7XHJcbiAgdmFyIHJlczogQXJyYXk8SU1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4gPSBbXTtcclxuICBpZiAoZXhhY3QpIHtcclxuICAgIHZhciByID0gcnVsZXMud29yZE1hcFtsY1N0cmluZ107XHJcbiAgICBpZiAocikge1xyXG4gICAgICByLnJ1bGVzLmZvckVhY2goZnVuY3Rpb24ob1J1bGUpIHtcclxuICAgICAgICByZXMucHVzaCh7XHJcbiAgICAgICAgICAgIHN0cmluZzogd29yZCxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcclxuICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxyXG4gICAgICAgICAgICBfcmFua2luZzogb1J1bGUuX3JhbmtpbmcgfHwgMS4wXHJcbiAgICAgICAgICB9KVxyXG4gICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcnVsZXMubm9uV29yZFJ1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XHJcbiAgICAgIGNoZWNrT25lUnVsZSh3b3JkLGxjU3RyaW5nLGV4YWN0LHJlcyxvUnVsZSxjbnRSZWMpO1xyXG4gICAgfSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIGRlYnVnbG9nKFwiY2F0ZWdvcml6ZSBub24gZXhhY3RcIiArIHdvcmQgKyBcIiB4eCAgXCIgKyBydWxlcy5hbGxSdWxlcy5sZW5ndGgpO1xyXG4gICAgcmV0dXJuIHBvc3RGaWx0ZXIoY2F0ZWdvcml6ZVN0cmluZyh3b3JkLCBleGFjdCwgcnVsZXMuYWxsUnVsZXMsIGNudFJlYykpO1xyXG4gIH1cclxuICByZXMuc29ydChzb3J0QnlSYW5rKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5cclxuXHJcbi8qKlxyXG4gKlxyXG4gKiBPcHRpb25zIG1heSBiZSB7XHJcbiAqIG1hdGNob3RoZXJzIDogdHJ1ZSwgID0+IG9ubHkgcnVsZXMgd2hlcmUgYWxsIG90aGVycyBtYXRjaCBhcmUgY29uc2lkZXJlZFxyXG4gKiBhdWdtZW50IDogdHJ1ZSxcclxuICogb3ZlcnJpZGUgOiB0cnVlIH0gID0+XHJcbiAqXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hXb3JkKG9SdWxlOiBJUnVsZSwgY29udGV4dDogSUZNYXRjaC5jb250ZXh0LCBvcHRpb25zPzogSU1hdGNoT3B0aW9ucykge1xyXG4gIGlmIChjb250ZXh0W29SdWxlLmtleV0gPT09IHVuZGVmaW5lZCkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICB9XHJcbiAgdmFyIHMxID0gY29udGV4dFtvUnVsZS5rZXldLnRvTG93ZXJDYXNlKClcclxuICB2YXIgczIgPSBvUnVsZS53b3JkLnRvTG93ZXJDYXNlKCk7XHJcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cclxuICB2YXIgZGVsdGEgPSBjb21wYXJlQ29udGV4dChjb250ZXh0LCBvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpXHJcbiAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcclxuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcclxuICB9XHJcbiAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkXHJcbiAgfVxyXG4gIHZhciBjOiBudW1iZXIgPSBjYWxjRGlzdGFuY2UoczIsIHMxKTtcclxuICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZyhcIiBzMSA8PiBzMiBcIiArIHMxICsgXCI8PlwiICsgczIgKyBcIiAgPT46IFwiICsgYyk7XHJcbiAgfVxyXG4gIGlmIChjID4gMC44MCkge1xyXG4gICAgdmFyIHJlcyA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpIGFzIGFueTtcclxuICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcclxuICAgIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XHJcbiAgICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvUnVsZS5mb2xsb3dzKTtcclxuICAgIH1cclxuICAgIC8vIGZvcmNlIGtleSBwcm9wZXJ0eVxyXG4gICAgLy8gY29uc29sZS5sb2coJyBvYmplY3RjYXRlZ29yeScsIHJlc1snc3lzdGVtT2JqZWN0Q2F0ZWdvcnknXSk7XHJcbiAgICByZXNbb1J1bGUua2V5XSA9IG9SdWxlLmZvbGxvd3Nbb1J1bGUua2V5XSB8fCByZXNbb1J1bGUua2V5XTtcclxuICAgIHJlcy5fd2VpZ2h0ID0gQW55T2JqZWN0LmFzc2lnbih7fSwgcmVzLl93ZWlnaHQpO1xyXG4gICAgcmVzLl93ZWlnaHRbb1J1bGUua2V5XSA9IGM7XHJcbiAgICBPYmplY3QuZnJlZXplKHJlcyk7XHJcbiAgICBpZiAoIGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgICAgZGVidWdsb2coJ0ZvdW5kIG9uZScgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlcztcclxuICB9XHJcbiAgcmV0dXJuIHVuZGVmaW5lZDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RBcmdzTWFwKG1hdGNoOiBBcnJheTxzdHJpbmc+LCBhcmdzTWFwOiB7IFtrZXk6IG51bWJlcl06IHN0cmluZyB9KTogSUZNYXRjaC5jb250ZXh0IHtcclxuICB2YXIgcmVzID0ge30gYXMgSUZNYXRjaC5jb250ZXh0O1xyXG4gIGlmICghYXJnc01hcCkge1xyXG4gICAgcmV0dXJuIHJlcztcclxuICB9XHJcbiAgT2JqZWN0LmtleXMoYXJnc01hcCkuZm9yRWFjaChmdW5jdGlvbiAoaUtleSkge1xyXG4gICAgdmFyIHZhbHVlID0gbWF0Y2hbaUtleV1cclxuICAgIHZhciBrZXkgPSBhcmdzTWFwW2lLZXldO1xyXG4gICAgaWYgKCh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpICYmIHZhbHVlLmxlbmd0aCA+IDApIHtcclxuICAgICAgcmVzW2tleV0gPSB2YWx1ZVxyXG4gICAgfVxyXG4gIH1cclxuICApO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBSYW5rV29yZCA9IHtcclxuICBoYXNBYm92ZTogZnVuY3Rpb24gKGxzdDogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+LCBib3JkZXI6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuICFsc3QuZXZlcnkoZnVuY3Rpb24gKG9NZW1iZXIpIHtcclxuICAgICAgcmV0dXJuIChvTWVtYmVyLl9yYW5raW5nIDwgYm9yZGVyKTtcclxuICAgIH0pO1xyXG4gIH0sXHJcblxyXG4gIHRha2VGaXJzdE46IGZ1bmN0aW9uIChsc3Q6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiwgbjogbnVtYmVyKTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IHtcclxuICAgIHJldHVybiBsc3QuZmlsdGVyKGZ1bmN0aW9uIChvTWVtYmVyLCBpSW5kZXgpIHtcclxuICAgICAgdmFyIGxhc3RSYW5raW5nID0gMS4wO1xyXG4gICAgICBpZiAoKGlJbmRleCA8IG4pIHx8IG9NZW1iZXIuX3JhbmtpbmcgPT09IGxhc3RSYW5raW5nKSB7XHJcbiAgICAgICAgbGFzdFJhbmtpbmcgPSBvTWVtYmVyLl9yYW5raW5nO1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH0pO1xyXG4gIH0sXHJcbiAgdGFrZUFib3ZlOiBmdW5jdGlvbiAobHN0OiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4sIGJvcmRlcjogbnVtYmVyKTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IHtcclxuICAgIHJldHVybiBsc3QuZmlsdGVyKGZ1bmN0aW9uIChvTWVtYmVyKSB7XHJcbiAgICAgIHJldHVybiAob01lbWJlci5fcmFua2luZyA+PSBib3JkZXIpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG59O1xyXG5cclxuLypcclxudmFyIGV4YWN0TGVuID0gMDtcclxudmFyIGZ1enp5TGVuID0gMDtcclxudmFyIGZ1enp5Q250ID0gMDtcclxudmFyIGV4YWN0Q250ID0gMDtcclxudmFyIHRvdGFsQ250ID0gMDtcclxudmFyIHRvdGFsTGVuID0gMDtcclxudmFyIHJldGFpbmVkQ250ID0gMDtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZXNldENudCgpIHtcclxuICBleGFjdExlbiA9IDA7XHJcbiAgZnV6enlMZW4gPSAwO1xyXG4gIGZ1enp5Q250ID0gMDtcclxuICBleGFjdENudCA9IDA7XHJcbiAgdG90YWxDbnQgPSAwO1xyXG4gIHRvdGFsTGVuID0gMDtcclxuICByZXRhaW5lZENudCA9IDA7XHJcbn1cclxuKi9cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmKHNXb3JkR3JvdXA6IHN0cmluZywgc3BsaXRSdWxlcyA6IElNYXRjaC5TcGxpdFJ1bGVzICwgY250UmVjPyA6IElDbnRSZWMgKTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IHtcclxuICB2YXIgc2Vlbkl0ID0gY2F0ZWdvcml6ZVN0cmluZzIoc1dvcmRHcm91cCwgdHJ1ZSwgc3BsaXRSdWxlcywgY250UmVjKTtcclxuICAvL3RvdGFsQ250ICs9IDE7XHJcbiAgLy8gZXhhY3RMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcclxuICBhZGRDbnRSZWMoY250UmVjLCAnY250Q2F0RXhhY3QnLCAxKTtcclxuICBhZGRDbnRSZWMoY250UmVjLCAnY250Q2F0RXhhY3RSZXMnLCBzZWVuSXQubGVuZ3RoKTtcclxuXHJcbiAgaWYgKFJhbmtXb3JkLmhhc0Fib3ZlKHNlZW5JdCwgMC44KSkge1xyXG4gICAgaWYoY250UmVjKSB7XHJcbiAgICAgIGFkZENudFJlYyhjbnRSZWMsICdleGFjdFByaW9yVGFrZScsIHNlZW5JdC5sZW5ndGgpXHJcbiAgICB9XHJcbiAgICBzZWVuSXQgPSBSYW5rV29yZC50YWtlQWJvdmUoc2Vlbkl0LCAwLjgpO1xyXG4gICAgaWYoY250UmVjKSB7XHJcbiAgICAgIGFkZENudFJlYyhjbnRSZWMsICdleGFjdEFmdGVyVGFrZScsIHNlZW5JdC5sZW5ndGgpXHJcbiAgICB9XHJcbiAgIC8vIGV4YWN0Q250ICs9IDE7XHJcbiAgfSBlbHNlIHtcclxuICAgIHNlZW5JdCA9IGNhdGVnb3JpemVTdHJpbmcyKHNXb3JkR3JvdXAsIGZhbHNlLCBzcGxpdFJ1bGVzLCBjbnRSZWMpO1xyXG4gICAgYWRkQ250UmVjKGNudFJlYywgJ2NudE5vbkV4YWN0JywgMSk7XHJcbiAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Tm9uRXhhY3RSZXMnLCBzZWVuSXQubGVuZ3RoKTtcclxuICAvLyAgZnV6enlMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcclxuICAvLyAgZnV6enlDbnQgKz0gMTtcclxuICB9XHJcbiAvLyB0b3RhbExlbiArPSBzZWVuSXQubGVuZ3RoO1xyXG4gIHNlZW5JdCA9IFJhbmtXb3JkLnRha2VGaXJzdE4oc2Vlbkl0LCBBbGdvbC5Ub3BfTl9Xb3JkQ2F0ZWdvcml6YXRpb25zKTtcclxuIC8vIHJldGFpbmVkQ250ICs9IHNlZW5JdC5sZW5ndGg7XHJcbiAgcmV0dXJuIHNlZW5JdDtcclxufVxyXG5cclxuLypcclxuZXhwb3J0IGZ1bmN0aW9uIGR1bXBDbnQoKSB7XHJcbiAgY29uc29sZS5sb2coYFxyXG5leGFjdExlbiA9ICR7ZXhhY3RMZW59O1xyXG5leGFjdENudCA9ICR7ZXhhY3RDbnR9O1xyXG5mdXp6eUxlbiA9ICR7ZnV6enlMZW59O1xyXG5mdXp6eUNudCA9ICR7ZnV6enlDbnR9O1xyXG50b3RhbENudCA9ICR7dG90YWxDbnR9O1xyXG50b3RhbExlbiA9ICR7dG90YWxMZW59O1xyXG5yZXRhaW5lZExlbiA9ICR7cmV0YWluZWRDbnR9O1xyXG4gIGApO1xyXG59XHJcbiovXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkU2VudGVuY2Uob1NlbnRlbmNlOiBJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdW10pOiBib29sZWFuIHtcclxuICByZXR1cm4gb1NlbnRlbmNlLmV2ZXJ5KGZ1bmN0aW9uIChvV29yZEdyb3VwKSB7XHJcbiAgICByZXR1cm4gKG9Xb3JkR3JvdXAubGVuZ3RoID4gMCk7XHJcbiAgfSk7XHJcbn1cclxuXHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZChhcnI6IElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11bXVtdKTogSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXVtdW10ge1xyXG4gIHJldHVybiBhcnIuZmlsdGVyKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcclxuICAgIHJldHVybiBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWRTZW50ZW5jZShvU2VudGVuY2UpO1xyXG4gIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZUFXb3JkKHNXb3JkR3JvdXA6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCBzZW50ZW5jZTogc3RyaW5nLCB3b3JkczogeyBba2V5OiBzdHJpbmddOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz59LFxyXG5jbnRSZWMgPyA6IElDbnRSZWMgKSA6IElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXSB7XHJcbiAgdmFyIHNlZW5JdCA9IHdvcmRzW3NXb3JkR3JvdXBdO1xyXG4gIGlmIChzZWVuSXQgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgc2Vlbkl0ID0gY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZihzV29yZEdyb3VwLCBydWxlcywgY250UmVjKTtcclxuICAgIHV0aWxzLmRlZXBGcmVlemUoc2Vlbkl0KTtcclxuICAgIHdvcmRzW3NXb3JkR3JvdXBdID0gc2Vlbkl0O1xyXG4gIH1cclxuICBpZiAoIXNlZW5JdCB8fCBzZWVuSXQubGVuZ3RoID09PSAwKSB7XHJcbiAgICBsb2dnZXIoXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBcXFwiXCIgKyBzV29yZEdyb3VwICsgXCJcXFwiIGluIHNlbnRlbmNlIFxcXCJcIlxyXG4gICAgICArIHNlbnRlbmNlICsgXCJcXFwiXCIpO1xyXG4gICAgaWYgKHNXb3JkR3JvdXAuaW5kZXhPZihcIiBcIikgPD0gMCkge1xyXG4gICAgICBkZWJ1Z2xvZyhcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIHByaW1pdGl2ZSAoISlcIiArIHNXb3JkR3JvdXApO1xyXG4gICAgfVxyXG4gICAgZGVidWdsb2coXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBcIiArIHNXb3JkR3JvdXApO1xyXG4gICAgaWYgKCFzZWVuSXQpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0aW5nIGVtdHB5IGxpc3QsIG5vdCB1bmRlZmluZWQgZm9yIFxcXCJcIiArIHNXb3JkR3JvdXAgKyBcIlxcXCJcIilcclxuICAgIH1cclxuICAgIHdvcmRzW3NXb3JkR3JvdXBdID0gW11cclxuICAgIHJldHVybiBbXTtcclxuICB9XHJcbiAgcmV0dXJuIHV0aWxzLmNsb25lRGVlcChzZWVuSXQpO1xyXG59XHJcblxyXG5cclxuLyoqXHJcbiAqIEdpdmVuIGEgIHN0cmluZywgYnJlYWsgaXQgZG93biBpbnRvIGNvbXBvbmVudHMsXHJcbiAqIFtbJ0EnLCAnQiddLCBbJ0EgQiddXVxyXG4gKlxyXG4gKiB0aGVuIGNhdGVnb3JpemVXb3Jkc1xyXG4gKiByZXR1cm5pbmdcclxuICpcclxuICogWyBbWyB7IGNhdGVnb3J5OiAnc3lzdGVtSWQnLCB3b3JkIDogJ0EnfSxcclxuICogICAgICB7IGNhdGVnb3J5OiAnb3RoZXJ0aGluZycsIHdvcmQgOiAnQSd9XHJcbiAqICAgIF0sXHJcbiAqICAgIC8vIHJlc3VsdCBvZiBCXHJcbiAqICAgIFsgeyBjYXRlZ29yeTogJ3N5c3RlbUlkJywgd29yZCA6ICdCJ30sXHJcbiAqICAgICAgeyBjYXRlZ29yeTogJ290aGVydGhpbmcnLCB3b3JkIDogJ0EnfVxyXG4gKiAgICAgIHsgY2F0ZWdvcnk6ICdhbm90aGVydHJ5cCcsIHdvcmQgOiAnQid9XHJcbiAqICAgIF1cclxuICogICBdLFxyXG4gKiBdXV1cclxuICpcclxuICpcclxuICpcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBhbmFseXplU3RyaW5nKHNTdHJpbmc6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLFxyXG4gIHdvcmRzPzogeyBba2V5OiBzdHJpbmddOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4gfSlcclxuICA6IFsgWyBJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11dIF1cclxuICAge1xyXG4gIHZhciBjbnQgPSAwO1xyXG4gIHZhciBmYWMgPSAxO1xyXG4gIHZhciB1ID0gYnJlYWtkb3duLmJyZWFrZG93blN0cmluZyhzU3RyaW5nLCBBbGdvbC5NYXhTcGFjZXNQZXJDb21iaW5lZFdvcmQpO1xyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nKFwiaGVyZSBicmVha2Rvd25cIiArIEpTT04uc3RyaW5naWZ5KHUpKTtcclxuICB9XHJcbiAgLy9jb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeSh1KSk7XHJcbiAgd29yZHMgPSB3b3JkcyB8fCB7fTtcclxuICBkZWJ1Z3BlcmYoJ3RoaXMgbWFueSBrbm93biB3b3JkczogJyArIE9iamVjdC5rZXlzKHdvcmRzKS5sZW5ndGgpO1xyXG4gIHZhciByZXMgPSBbXSBhcyBbWyBJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11dIF07XHJcbiAgdmFyIGNudFJlYyA9IHt9O1xyXG4gIHUuZm9yRWFjaChmdW5jdGlvbiAoYUJyZWFrRG93blNlbnRlbmNlKSB7XHJcbiAgICAgIHZhciBjYXRlZ29yaXplZFNlbnRlbmNlID0gW10gYXMgWyBJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW10gXTtcclxuICAgICAgdmFyIGlzVmFsaWQgPSBhQnJlYWtEb3duU2VudGVuY2UuZXZlcnkoZnVuY3Rpb24gKHNXb3JkR3JvdXA6IHN0cmluZywgaW5kZXggOiBudW1iZXIpIHtcclxuICAgICAgICB2YXIgc2Vlbkl0ID0gY2F0ZWdvcml6ZUFXb3JkKHNXb3JkR3JvdXAsIHJ1bGVzLCBzU3RyaW5nLCB3b3JkcywgY250UmVjKTtcclxuICAgICAgICBpZihzZWVuSXQubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhdGVnb3JpemVkU2VudGVuY2VbaW5kZXhdID0gc2Vlbkl0O1xyXG4gICAgICAgIGNudCA9IGNudCArIHNlZW5JdC5sZW5ndGg7XHJcbiAgICAgICAgZmFjID0gZmFjICogc2Vlbkl0Lmxlbmd0aDtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgfSk7XHJcbiAgICAgIGlmKGlzVmFsaWQpIHtcclxuICAgICAgICByZXMucHVzaChjYXRlZ29yaXplZFNlbnRlbmNlKTtcclxuICAgICAgfVxyXG4gIH0pO1xyXG4gIGRlYnVnbG9nKFwiIHNlbnRlbmNlcyBcIiArIHUubGVuZ3RoICsgXCIgbWF0Y2hlcyBcIiArIGNudCArIFwiIGZhYzogXCIgKyBmYWMpO1xyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQgJiYgdS5sZW5ndGgpIHtcclxuICAgIGRlYnVnbG9nKFwiZmlyc3QgbWF0Y2ggXCIrIEpTT04uc3RyaW5naWZ5KHUsdW5kZWZpbmVkLDIpKTtcclxuICB9XHJcbiAgZGVidWdwZXJmKFwiIHNlbnRlbmNlcyBcIiArIHUubGVuZ3RoICsgXCIgLyBcIiArIHJlcy5sZW5ndGggKyAgXCIgbWF0Y2hlcyBcIiArIGNudCArIFwiIGZhYzogXCIgKyBmYWMgKyBcIiByZWMgOiBcIiArIEpTT04uc3RyaW5naWZ5KGNudFJlYyx1bmRlZmluZWQsMikpO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbi8qXHJcblsgW2EsYl0sIFtjLGRdXVxyXG5cclxuMDAgYVxyXG4wMSBiXHJcbjEwIGNcclxuMTEgZFxyXG4xMiBjXHJcbiovXHJcblxyXG5cclxuY29uc3QgY2xvbmUgPSB1dGlscy5jbG9uZURlZXA7XHJcblxyXG5cclxuZnVuY3Rpb24gY29weVZlY01lbWJlcnModSkge1xyXG4gIHZhciBpID0gMDtcclxuICBmb3IoaSA9IDA7IGkgPCB1Lmxlbmd0aDsgKytpKSB7XHJcbiAgICB1W2ldID0gY2xvbmUodVtpXSk7XHJcbiAgfVxyXG4gIHJldHVybiB1O1xyXG59XHJcbi8vIHdlIGNhbiByZXBsaWNhdGUgdGhlIHRhaWwgb3IgdGhlIGhlYWQsXHJcbi8vIHdlIHJlcGxpY2F0ZSB0aGUgdGFpbCBhcyBpdCBpcyBzbWFsbGVyLlxyXG5cclxuLy8gW2EsYixjIF1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBleHBhbmRNYXRjaEFycihkZWVwOiBBcnJheTxBcnJheTxhbnk+Pik6IEFycmF5PEFycmF5PGFueT4+IHtcclxuICB2YXIgYSA9IFtdO1xyXG4gIHZhciBsaW5lID0gW107XHJcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IEpTT04uc3RyaW5naWZ5KGRlZXApIDogJy0nKTtcclxuICBkZWVwLmZvckVhY2goZnVuY3Rpb24gKHVCcmVha0Rvd25MaW5lLCBpSW5kZXg6IG51bWJlcikge1xyXG4gICAgbGluZVtpSW5kZXhdID0gW107XHJcbiAgICB1QnJlYWtEb3duTGluZS5mb3JFYWNoKGZ1bmN0aW9uIChhV29yZEdyb3VwLCB3Z0luZGV4OiBudW1iZXIpIHtcclxuICAgICAgbGluZVtpSW5kZXhdW3dnSW5kZXhdID0gW107XHJcbiAgICAgIGFXb3JkR3JvdXAuZm9yRWFjaChmdW5jdGlvbiAob1dvcmRWYXJpYW50LCBpV1ZJbmRleDogbnVtYmVyKSB7XHJcbiAgICAgICAgbGluZVtpSW5kZXhdW3dnSW5kZXhdW2lXVkluZGV4XSA9IG9Xb3JkVmFyaWFudDtcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9KVxyXG4gIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyBKU09OLnN0cmluZ2lmeShsaW5lKSA6ICctJyk7XHJcbiAgdmFyIHJlcyA9IFtdO1xyXG4gIHZhciBudmVjcyA9IFtdO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZS5sZW5ndGg7ICsraSkge1xyXG4gICAgdmFyIHZlY3MgPSBbW11dO1xyXG4gICAgdmFyIG52ZWNzID0gW107XHJcbiAgICB2YXIgcnZlYyA9IFtdO1xyXG4gICAgZm9yICh2YXIgayA9IDA7IGsgPCBsaW5lW2ldLmxlbmd0aDsgKytrKSB7IC8vIHdvcmRncm91cCBrXHJcbiAgICAgIC8vdmVjcyBpcyB0aGUgdmVjdG9yIG9mIGFsbCBzbyBmYXIgc2VlbiB2YXJpYW50cyB1cCB0byBrIHdncy5cclxuICAgICAgdmFyIG5leHRCYXNlID0gW107XHJcbiAgICAgIGZvciAodmFyIGwgPSAwOyBsIDwgbGluZVtpXVtrXS5sZW5ndGg7ICsrbCkgeyAvLyBmb3IgZWFjaCB2YXJpYW50XHJcbiAgICAgICAgLy9kZWJ1Z2xvZyhcInZlY3Mgbm93XCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzKSk7XHJcbiAgICAgICAgbnZlY3MgPSBbXTsgLy92ZWNzLnNsaWNlKCk7IC8vIGNvcHkgdGhlIHZlY1tpXSBiYXNlIHZlY3RvcjtcclxuICAgICAgICAvL2RlYnVnbG9nKFwidmVjcyBjb3BpZWQgbm93XCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpO1xyXG4gICAgICAgIGZvciAodmFyIHUgPSAwOyB1IDwgdmVjcy5sZW5ndGg7ICsrdSkge1xyXG4gICAgICAgICAgbnZlY3NbdV0gPSB2ZWNzW3VdLnNsaWNlKCk7IC8vXHJcbiAgICAgICAgICBudmVjc1t1XSA9IGNvcHlWZWNNZW1iZXJzKG52ZWNzW3VdKTtcclxuICAgICAgICAgIC8vIGRlYnVnbG9nKFwiY29waWVkIHZlY3NbXCIrIHUrXCJdXCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzW3VdKSk7XHJcbiAgICAgICAgICBudmVjc1t1XS5wdXNoKFxyXG4gICAgICAgICAgICBjbG9uZShsaW5lW2ldW2tdW2xdKSk7IC8vIHB1c2ggdGhlIGx0aCB2YXJpYW50XHJcbiAgICAgICAgICAvLyBkZWJ1Z2xvZyhcIm5vdyBudmVjcyBcIiArIG52ZWNzLmxlbmd0aCArIFwiIFwiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gICBkZWJ1Z2xvZyhcIiBhdCAgICAgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbmV4dGJhc2UgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxyXG4gICAgICAgIC8vICAgZGVidWdsb2coXCIgYXBwZW5kIFwiICsgayArIFwiOlwiICsgbCArIFwiIG52ZWNzICAgID5cIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSlcclxuICAgICAgICBuZXh0QmFzZSA9IG5leHRCYXNlLmNvbmNhdChudmVjcyk7XHJcbiAgICAgICAgLy8gICBkZWJ1Z2xvZyhcIiAgcmVzdWx0IFwiICsgayArIFwiOlwiICsgbCArIFwiIG52ZWNzICAgID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcclxuICAgICAgfSAvL2NvbnN0cnVcclxuICAgICAgLy8gIGRlYnVnbG9nKFwibm93IGF0IFwiICsgayArIFwiOlwiICsgbCArIFwiID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcclxuICAgICAgdmVjcyA9IG5leHRCYXNlO1xyXG4gICAgfVxyXG4gICAgZGVidWdsb2dWKGRlYnVnbG9nVi5lbmFibGVkID8gKFwiQVBQRU5ESU5HIFRPIFJFU1wiICsgaSArIFwiOlwiICsgbCArIFwiID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSkgOiAnLScpO1xyXG4gICAgcmVzID0gcmVzLmNvbmNhdCh2ZWNzKTtcclxuICB9XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuXHJcbi8qKlxyXG4gKiBDYWxjdWxhdGUgYSB3ZWlnaHQgZmFjdG9yIGZvciBhIGdpdmVuIGRpc3RhbmNlIGFuZFxyXG4gKiBjYXRlZ29yeVxyXG4gKiBAcGFyYW0ge2ludGVnZXJ9IGRpc3QgZGlzdGFuY2UgaW4gd29yZHNcclxuICogQHBhcmFtIHtzdHJpbmd9IGNhdGVnb3J5IGNhdGVnb3J5IHRvIHVzZVxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBhIGRpc3RhbmNlIGZhY3RvciA+PSAxXHJcbiAqICAxLjAgZm9yIG5vIGVmZmVjdFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlaW5mb3JjZURpc3RXZWlnaHQoZGlzdDogbnVtYmVyLCBjYXRlZ29yeTogc3RyaW5nKTogbnVtYmVyIHtcclxuICB2YXIgYWJzID0gTWF0aC5hYnMoZGlzdCk7XHJcbiAgcmV0dXJuIDEuMCArIChBbGdvbC5hUmVpbmZvcmNlRGlzdFdlaWdodFthYnNdIHx8IDApO1xyXG59XHJcblxyXG4vKipcclxuICogR2l2ZW4gYSBzZW50ZW5jZSwgZXh0YWN0IGNhdGVnb3JpZXNcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0Q2F0ZWdvcnlNYXAob1NlbnRlbmNlOiBBcnJheTxJRk1hdGNoLklXb3JkPik6IHsgW2tleTogc3RyaW5nXTogQXJyYXk8eyBwb3M6IG51bWJlciB9PiB9IHtcclxuICB2YXIgcmVzID0ge307XHJcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/ICgnZXh0cmFjdENhdGVnb3J5TWFwICcgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpKSA6ICctJyk7XHJcbiAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpSW5kZXgpIHtcclxuICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gSUZNYXRjaC5DQVRfQ0FURUdPUlkpIHtcclxuICAgICAgcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddID0gcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddIHx8IFtdO1xyXG4gICAgICByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10ucHVzaCh7IHBvczogaUluZGV4IH0pO1xyXG4gICAgfVxyXG4gIH0pO1xyXG4gIHV0aWxzLmRlZXBGcmVlemUocmVzKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVpbkZvcmNlU2VudGVuY2Uob1NlbnRlbmNlKSB7XHJcbiAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgdmFyIG9DYXRlZ29yeU1hcCA9IGV4dHJhY3RDYXRlZ29yeU1hcChvU2VudGVuY2UpO1xyXG4gIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaUluZGV4KSB7XHJcbiAgICB2YXIgbSA9IG9DYXRlZ29yeU1hcFtvV29yZC5jYXRlZ29yeV0gfHwgW107XHJcbiAgICBtLmZvckVhY2goZnVuY3Rpb24gKG9Qb3NpdGlvbjogeyBwb3M6IG51bWJlciB9KSB7XHJcbiAgICAgIFwidXNlIHN0cmljdFwiO1xyXG4gICAgICBvV29yZC5yZWluZm9yY2UgPSBvV29yZC5yZWluZm9yY2UgfHwgMTtcclxuICAgICAgdmFyIGJvb3N0ID0gcmVpbmZvcmNlRGlzdFdlaWdodChpSW5kZXggLSBvUG9zaXRpb24ucG9zLCBvV29yZC5jYXRlZ29yeSk7XHJcbiAgICAgIG9Xb3JkLnJlaW5mb3JjZSAqPSBib29zdDtcclxuICAgICAgb1dvcmQuX3JhbmtpbmcgKj0gYm9vc3Q7XHJcbiAgICB9KTtcclxuICB9KTtcclxuICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGlJbmRleCkge1xyXG4gICAgaWYgKGlJbmRleCA+IDAgKSB7XHJcbiAgICAgIGlmIChvU2VudGVuY2VbaUluZGV4LTFdLmNhdGVnb3J5ID09PSBcIm1ldGFcIiAgJiYgKG9Xb3JkLmNhdGVnb3J5ID09PSBvU2VudGVuY2VbaUluZGV4LTFdLm1hdGNoZWRTdHJpbmcpICkge1xyXG4gICAgICAgIG9Xb3JkLnJlaW5mb3JjZSA9IG9Xb3JkLnJlaW5mb3JjZSB8fCAxO1xyXG4gICAgICAgIHZhciBib29zdCA9IHJlaW5mb3JjZURpc3RXZWlnaHQoMSwgb1dvcmQuY2F0ZWdvcnkpO1xyXG4gICAgICAgIG9Xb3JkLnJlaW5mb3JjZSAqPSBib29zdDtcclxuICAgICAgICBvV29yZC5fcmFua2luZyAqPSBib29zdDtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0pO1xyXG4gIHJldHVybiBvU2VudGVuY2U7XHJcbn1cclxuXHJcblxyXG5pbXBvcnQgKiBhcyBTZW50ZW5jZSBmcm9tICcuL3NlbnRlbmNlJztcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWluRm9yY2UoYUNhdGVnb3JpemVkQXJyYXkpIHtcclxuICBcInVzZSBzdHJpY3RcIjtcclxuICBhQ2F0ZWdvcml6ZWRBcnJheS5mb3JFYWNoKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcclxuICAgIHJlaW5Gb3JjZVNlbnRlbmNlKG9TZW50ZW5jZSk7XHJcbiAgfSlcclxuICBhQ2F0ZWdvcml6ZWRBcnJheS5zb3J0KFNlbnRlbmNlLmNtcFJhbmtpbmdQcm9kdWN0KTtcclxuICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZyhcImFmdGVyIHJlaW5mb3JjZVwiICsgYUNhdGVnb3JpemVkQXJyYXkubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcclxuICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XHJcbiAgICB9KS5qb2luKFwiXFxuXCIpKTtcclxuICB9XHJcbiAgcmV0dXJuIGFDYXRlZ29yaXplZEFycmF5O1xyXG59XHJcblxyXG5cclxuLy8vIGJlbG93IG1heSBubyBsb25nZXIgYmUgdXNlZFxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVnRXhwKG9SdWxlOiBJUnVsZSwgY29udGV4dDogSUZNYXRjaC5jb250ZXh0LCBvcHRpb25zPzogSU1hdGNoT3B0aW9ucykge1xyXG4gIGlmIChjb250ZXh0W29SdWxlLmtleV0gPT09IHVuZGVmaW5lZCkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICB9XHJcbiAgdmFyIHNLZXkgPSBvUnVsZS5rZXk7XHJcbiAgdmFyIHMxID0gY29udGV4dFtvUnVsZS5rZXldLnRvTG93ZXJDYXNlKClcclxuICB2YXIgcmVnID0gb1J1bGUucmVnZXhwO1xyXG5cclxuICB2YXIgbSA9IHJlZy5leGVjKHMxKTtcclxuICBpZihkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xyXG4gICAgZGVidWdsb2dWKFwiYXBwbHlpbmcgcmVnZXhwOiBcIiArIHMxICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XHJcbiAgfVxyXG4gIGlmICghbSkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICB9XHJcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cclxuICB2YXIgZGVsdGEgPSBjb21wYXJlQ29udGV4dChjb250ZXh0LCBvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpXHJcbiAgaWYgKGRlYnVnbG9nVi5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZ1YoSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcclxuICAgIGRlYnVnbG9nVihKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XHJcbiAgfVxyXG4gIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gIH1cclxuICB2YXIgb0V4dHJhY3RlZENvbnRleHQgPSBleHRyYWN0QXJnc01hcChtLCBvUnVsZS5hcmdzTWFwKTtcclxuICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nVihcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUuYXJnc01hcCkpO1xyXG4gICAgZGVidWdsb2dWKFwibWF0Y2ggXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XHJcbiAgICBkZWJ1Z2xvZ1YoXCJleHRyYWN0ZWQgYXJncyBcIiArIEpTT04uc3RyaW5naWZ5KG9FeHRyYWN0ZWRDb250ZXh0KSk7XHJcbiAgfVxyXG4gIHZhciByZXMgPSBBbnlPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKSBhcyBhbnk7XHJcbiAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9FeHRyYWN0ZWRDb250ZXh0KTtcclxuICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgY29udGV4dCk7XHJcbiAgaWYgKG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldICE9PSB1bmRlZmluZWQpIHtcclxuICAgIHJlc1tzS2V5XSA9IG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldO1xyXG4gIH1cclxuICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xyXG4gICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xyXG4gICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9FeHRyYWN0ZWRDb250ZXh0KVxyXG4gIH1cclxuICBPYmplY3QuZnJlZXplKHJlcyk7XHJcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/ICgnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSkgOiAnLScpO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzb3J0QnlXZWlnaHQoc0tleTogc3RyaW5nLCBvQ29udGV4dEE6IElGTWF0Y2guY29udGV4dCwgb0NvbnRleHRCOiBJRk1hdGNoLmNvbnRleHQpOiBudW1iZXIge1xyXG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZ1YoJ3NvcnRpbmc6ICcgKyBzS2V5ICsgJ2ludm9rZWQgd2l0aFxcbiAxOicgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEEsIHVuZGVmaW5lZCwgMikgK1xyXG4gICAgXCIgdnMgXFxuIDI6XCIgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEIsIHVuZGVmaW5lZCwgMikpO1xyXG4gIH1cclxuICB2YXIgcmFua2luZ0E6IG51bWJlciA9IHBhcnNlRmxvYXQob0NvbnRleHRBW1wiX3JhbmtpbmdcIl0gfHwgXCIxXCIpO1xyXG4gIHZhciByYW5raW5nQjogbnVtYmVyID0gcGFyc2VGbG9hdChvQ29udGV4dEJbXCJfcmFua2luZ1wiXSB8fCBcIjFcIik7XHJcbiAgaWYgKHJhbmtpbmdBICE9PSByYW5raW5nQikge1xyXG4gICAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgICBkZWJ1Z2xvZyhcIiByYW5raW4gZGVsdGFcIiArIDEwMCAqIChyYW5raW5nQiAtIHJhbmtpbmdBKSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gMTAwICogKHJhbmtpbmdCIC0gcmFua2luZ0EpXHJcbiAgfVxyXG5cclxuICB2YXIgd2VpZ2h0QSA9IG9Db250ZXh0QVtcIl93ZWlnaHRcIl0gJiYgb0NvbnRleHRBW1wiX3dlaWdodFwiXVtzS2V5XSB8fCAwO1xyXG4gIHZhciB3ZWlnaHRCID0gb0NvbnRleHRCW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdW3NLZXldIHx8IDA7XHJcbiAgcmV0dXJuICsod2VpZ2h0QiAtIHdlaWdodEEpO1xyXG59XHJcblxyXG5cclxuLy8gV29yZCwgU3lub255bSwgUmVnZXhwIC8gRXh0cmFjdGlvblJ1bGVcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhdWdtZW50Q29udGV4dDEoY29udGV4dDogSUZNYXRjaC5jb250ZXh0LCBvUnVsZXM6IEFycmF5PElSdWxlPiwgb3B0aW9uczogSU1hdGNoT3B0aW9ucyk6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIHZhciBzS2V5ID0gb1J1bGVzWzBdLmtleTtcclxuICAvLyBjaGVjayB0aGF0IHJ1bGVcclxuICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgLy8gY2hlY2sgY29uc2lzdGVuY3lcclxuICAgIG9SdWxlcy5ldmVyeShmdW5jdGlvbiAoaVJ1bGUpIHtcclxuICAgICAgaWYgKGlSdWxlLmtleSAhPT0gc0tleSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkluaG9tb2dlbm91cyBrZXlzIGluIHJ1bGVzLCBleHBlY3RlZCBcIiArIHNLZXkgKyBcIiB3YXMgXCIgKyBKU09OLnN0cmluZ2lmeShpUnVsZSkpO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvLyBsb29rIGZvciBydWxlcyB3aGljaCBtYXRjaFxyXG4gIHZhciByZXMgPSBvUnVsZXMubWFwKGZ1bmN0aW9uIChvUnVsZSkge1xyXG4gICAgLy8gaXMgdGhpcyBydWxlIGFwcGxpY2FibGVcclxuICAgIHN3aXRjaCAob1J1bGUudHlwZSkge1xyXG4gICAgICBjYXNlIElGTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQ6XHJcbiAgICAgICAgcmV0dXJuIG1hdGNoV29yZChvUnVsZSwgY29udGV4dCwgb3B0aW9ucylcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5SRUdFWFA6XHJcbiAgICAgICAgcmV0dXJuIG1hdGNoUmVnRXhwKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKTtcclxuICAgICAgLy8gICBjYXNlIFwiRXh0cmFjdGlvblwiOlxyXG4gICAgICAvLyAgICAgcmV0dXJuIG1hdGNoRXh0cmFjdGlvbihvUnVsZSxjb250ZXh0KTtcclxuICAgIH1cclxuICAgIHJldHVybiB1bmRlZmluZWRcclxuICB9KS5maWx0ZXIoZnVuY3Rpb24gKG9yZXMpIHtcclxuICAgIHJldHVybiAhIW9yZXNcclxuICB9KS5zb3J0KFxyXG4gICAgc29ydEJ5V2VpZ2h0LmJpbmQodGhpcywgc0tleSlcclxuICAgICk7XHJcbiAgICAvL2RlYnVnbG9nKFwiaGFzc29ydGVkXCIgKyBKU09OLnN0cmluZ2lmeShyZXMsdW5kZWZpbmVkLDIpKTtcclxuICByZXR1cm4gcmVzO1xyXG4gIC8vIE9iamVjdC5rZXlzKCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xyXG4gIC8vIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXVnbWVudENvbnRleHQoY29udGV4dDogSUZNYXRjaC5jb250ZXh0LCBhUnVsZXM6IEFycmF5PElSdWxlPik6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG5cclxuICB2YXIgb3B0aW9uczE6IElNYXRjaE9wdGlvbnMgPSB7XHJcbiAgICBtYXRjaG90aGVyczogdHJ1ZSxcclxuICAgIG92ZXJyaWRlOiBmYWxzZVxyXG4gIH0gYXMgSU1hdGNoT3B0aW9ucztcclxuXHJcbiAgdmFyIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMSlcclxuXHJcbiAgaWYgKGFSZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICB2YXIgb3B0aW9uczI6IElNYXRjaE9wdGlvbnMgPSB7XHJcbiAgICAgIG1hdGNob3RoZXJzOiBmYWxzZSxcclxuICAgICAgb3ZlcnJpZGU6IHRydWVcclxuICAgIH0gYXMgSU1hdGNoT3B0aW9ucztcclxuICAgIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMik7XHJcbiAgfVxyXG4gIHJldHVybiBhUmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gaW5zZXJ0T3JkZXJlZChyZXN1bHQ6IEFycmF5PElGTWF0Y2guY29udGV4dD4sIGlJbnNlcnRlZE1lbWJlcjogSUZNYXRjaC5jb250ZXh0LCBsaW1pdDogbnVtYmVyKTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgLy8gVE9ETzogdXNlIHNvbWUgd2VpZ2h0XHJcbiAgaWYgKHJlc3VsdC5sZW5ndGggPCBsaW1pdCkge1xyXG4gICAgcmVzdWx0LnB1c2goaUluc2VydGVkTWVtYmVyKVxyXG4gIH1cclxuICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHRha2VUb3BOKGFycjogQXJyYXk8QXJyYXk8SUZNYXRjaC5jb250ZXh0Pj4pOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICB2YXIgdSA9IGFyci5maWx0ZXIoZnVuY3Rpb24gKGlubmVyQXJyKSB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwIH0pXHJcblxyXG4gIHZhciByZXMgPSBbXTtcclxuICAvLyBzaGlmdCBvdXQgdGhlIHRvcCBvbmVzXHJcbiAgdSA9IHUubWFwKGZ1bmN0aW9uIChpQXJyKSB7XHJcbiAgICB2YXIgdG9wID0gaUFyci5zaGlmdCgpO1xyXG4gICAgcmVzID0gaW5zZXJ0T3JkZXJlZChyZXMsIHRvcCwgNSlcclxuICAgIHJldHVybiBpQXJyXHJcbiAgfSkuZmlsdGVyKGZ1bmN0aW9uIChpbm5lckFycjogQXJyYXk8SUZNYXRjaC5jb250ZXh0Pik6IGJvb2xlYW4geyByZXR1cm4gaW5uZXJBcnIubGVuZ3RoID4gMCB9KTtcclxuICAvLyBhcyBBcnJheTxBcnJheTxJRk1hdGNoLmNvbnRleHQ+PlxyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmltcG9ydCAqIGFzIGlucHV0RmlsdGVyUnVsZXMgZnJvbSAnLi9pbnB1dEZpbHRlclJ1bGVzJztcclxuXHJcbnZhciBybTtcclxuXHJcbmZ1bmN0aW9uIGdldFJNT25jZSgpIHtcclxuICBpZiAoIXJtKSB7XHJcbiAgICBybSA9IGlucHV0RmlsdGVyUnVsZXMuZ2V0UnVsZU1hcCgpXHJcbiAgfVxyXG4gIHJldHVybiBybTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UnVsZXMoY29udGV4dDogSUZNYXRjaC5jb250ZXh0KTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgdmFyIGJlc3ROOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+ID0gW2NvbnRleHRdO1xyXG4gIGlucHV0RmlsdGVyUnVsZXMub0tleU9yZGVyLmZvckVhY2goZnVuY3Rpb24gKHNLZXk6IHN0cmluZykge1xyXG4gICAgdmFyIGJlc3ROZXh0OiBBcnJheTxBcnJheTxJRk1hdGNoLmNvbnRleHQ+PiA9IFtdO1xyXG4gICAgYmVzdE4uZm9yRWFjaChmdW5jdGlvbiAob0NvbnRleHQ6IElGTWF0Y2guY29udGV4dCkge1xyXG4gICAgICBpZiAob0NvbnRleHRbc0tleV0pIHtcclxuICAgICAgICBkZWJ1Z2xvZygnKiogYXBwbHlpbmcgcnVsZXMgZm9yICcgKyBzS2V5KVxyXG4gICAgICAgIHZhciByZXMgPSBhdWdtZW50Q29udGV4dChvQ29udGV4dCwgZ2V0Uk1PbmNlKClbc0tleV0gfHwgW10pXHJcbiAgICAgICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/ICgnKiogcmVzdWx0IGZvciAnICsgc0tleSArICcgPSAnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTogJy0nKTtcclxuICAgICAgICBiZXN0TmV4dC5wdXNoKHJlcyB8fCBbXSlcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBydWxlIG5vdCByZWxldmFudFxyXG4gICAgICAgIGJlc3ROZXh0LnB1c2goW29Db250ZXh0XSk7XHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgICBiZXN0TiA9IHRha2VUb3BOKGJlc3ROZXh0KTtcclxuICB9KTtcclxuICByZXR1cm4gYmVzdE5cclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhcHBseVJ1bGVzUGlja0ZpcnN0KGNvbnRleHQ6IElGTWF0Y2guY29udGV4dCk6IElGTWF0Y2guY29udGV4dCB7XHJcbiAgdmFyIHIgPSBhcHBseVJ1bGVzKGNvbnRleHQpO1xyXG4gIHJldHVybiByICYmIHJbMF07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZWNpZGUgd2hldGhlciB0byByZXF1ZXJ5IGZvciBhIGNvbnRldFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGRlY2lkZU9uUmVRdWVyeShjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQpOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICByZXR1cm4gW11cclxufVxyXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
