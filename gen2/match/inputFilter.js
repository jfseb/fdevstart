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

var distance = require("abot_stringdist");
var Logger = require("../utils/logger");
var logger = Logger.logger('inputFilter');
var debug = require("debug");
var debugperf = debug('perf');
var Utils = require("abot_utils");
var Algol = require("./algol");
var fdevsta_monmove_1 = require("fdevsta_monmove");
var AnyObject = Object;
var debuglog = debug('inputFilter');
var debuglogV = debug('inputVFilter');
var debuglogM = debug('inputMFilter');
function mockDebug(o) {
    debuglog = o;
    debuglogV = o;
    debuglogM = o;
}
exports.mockDebug = mockDebug;
var matchdata = require("./matchdata");
var oUnitTests = matchdata.oUnitTests;
/**
 * @param sText {string} the text to match to NavTargetResolution
 * @param sText2 {string} the query text, e.g. NavTarget
 *
 * @return the distance, note that is is *not* symmetric!
 */
function calcDistance(sText1, sText2) {
    return distance.calcDistanceAdjusted(sText1, sText2);
}
exports.calcDistance = calcDistance;
/**
 * @param sText {string} the text to match to NavTargetResolution
 * @param sText2 {string} the query text, e.g. NavTarget
 *
 * @return the distance, note that is is *not* symmetric!
 */
/*
export function calcDistanceLevenXXX(sText1: string, sText2: string): number {
  // console.log("length2" + sText1 + " - " + sText2)
   if(((sText1.length - sText2.length) > Algol.calcDist.lengthDelta1)
    || (sText2.length > 1.5 * sText1.length )
    || (sText2.length < (sText1.length/2)) ) {
    return 50000;
  }
  var a0 = distance.levenshtein(sText1.substring(0, sText2.length), sText2)
  if(debuglogV.enabled) {
    debuglogV("distance" + a0 + "stripped>" + sText1.substring(0,sText2.length) + "<>" + sText2+ "<");
  }
  if(a0 * 50 > 15 * sText2.length) {
      return 40000;
  }
  var a = distance.levenshtein(sText1, sText2)
  return a0 * 500 / sText2.length + a
}
*/
var IFMatch = require("../match/ifmatch");
//const levenCutoff = Algol.Cutoff_LevenShtein;
/*
export function levenPenaltyOld(i: number): number {
  // 0-> 1
  // 1 -> 0.1
  // 150 ->  0.8
  if (i === 0) {
    return 1;
  }
  // reverse may be better than linear
  return 1 + i * (0.8 - 1) / 150
}
*/
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
        case IFMatch.EnumRuleType.WORD:
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
        case IFMatch.EnumRuleType.REGEXP:
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
function checkOneRuleWithOffset(string, lcString, exact, res, oRule, cntRec) {
    if (debuglogV.enabled) {
        debuglogV('attempting to match rule ' + JSON.stringify(oRule) + " to string \"" + string + "\"");
    }
    switch (oRule.type) {
        case IFMatch.EnumRuleType.WORD:
            if (!oRule.lowercaseword) {
                throw new Error('rule without a lowercase variant' + JSON.stringify(oRule, undefined, 2));
            }
            ;
            if (exact && (oRule.word === string || oRule.lowercaseword === lcString)) {
                if (debuglog.enabled) {
                    debuglog("\n!matched exact " + string + "=" + oRule.lowercaseword + " => " + oRule.matchedString + "/" + oRule.category);
                }
                res.push({
                    string: string,
                    matchedString: oRule.matchedString,
                    category: oRule.category,
                    rule: oRule,
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
                    //console.log("found rec");
                    addCntRec(cntRec, "calcDistanceOk", 1);
                    var rec = {
                        string: string,
                        rule: oRule,
                        matchedString: oRule.matchedString,
                        category: oRule.category,
                        _ranking: (oRule._ranking || 1.0) * levenPenalty(levenmatch),
                        levenmatch: levenmatch
                    };
                    if (debuglog) {
                        debuglog("\n!CORO: fuzzy " + levenmatch.toFixed(3) + " " + rec._ranking.toFixed(3) + "  \"" + string + "\"=" + oRule.lowercaseword + " => " + oRule.matchedString + "/" + oRule.category);
                    }
                    res.push(rec);
                }
            }
            break;
        case IFMatch.EnumRuleType.REGEXP:
            {
                if (debuglog.enabled) {
                    debuglog(JSON.stringify(" here regexp" + JSON.stringify(oRule, undefined, 2)));
                }
                var m = oRule.regexp.exec(string);
                if (m) {
                    res.push({
                        string: string,
                        rule: oRule,
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
exports.checkOneRuleWithOffset = checkOneRuleWithOffset;
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
function categorizeSingleWordWithOffset(word, lcword, exact, oRules, cntRec) {
    // simply apply all rules
    if (debuglogM.enabled) {
        debuglogM("rules : " + JSON.stringify(oRules, undefined, 2));
    }
    var res = [];
    oRules.forEach(function (oRule) {
        checkOneRuleWithOffset(word, lcword, exact, res, oRule, cntRec);
    });
    debuglog("CSWWO: got results for " + lcword + "  " + res.length);
    res.sort(sortByRank);
    return res;
}
exports.categorizeSingleWordWithOffset = categorizeSingleWordWithOffset;
function postFilter(res) {
    res.sort(sortByRank);
    var bestRank = 0;
    //console.log("\npiltered " + JSON.stringify(res));
    if (debuglog.enabled) {
        debuglog("preFilter : \n" + res.map(function (word, index) {
            return index + " " + word._ranking + "  => \"" + word.category + "\" " + word.matchedString;
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
function postFilterWithOffset(res) {
    res.sort(sortByRank);
    var bestRank = 0;
    //console.log("\npiltered " + JSON.stringify(res));
    if (debuglog.enabled) {
        debuglog(" preFilter : \n" + res.map(function (word) {
            return " " + word._ranking + "  => \"" + word.category + "\" " + word.matchedString + " ";
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
        if (!(resx.rule && resx.rule.range) && !(res[index - 1].rule && res[index - 1].rule.range) && resx.matchedString === res[index - 1].matchedString && resx.category === res[index - 1].category) {
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
exports.postFilterWithOffset = postFilterWithOffset;
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
        res.sort(sortByRank);
        return res;
    } else {
        debuglog("categorize non exact" + word + " xx  " + rules.allRules.length);
        return postFilter(categorizeString(word, exact, rules.allRules, cntRec));
    }
}
exports.categorizeString2 = categorizeString2;
function categorizeWordInternalWithOffsets(word, lcword, exact, rules, cntRec) {
    debuglogM("categorize " + lcword + " with offset!!!!!!!!!!!!!!!!!" + exact);
    // simply apply all rules
    if (debuglogM.enabled) {
        debuglogM("rules : " + JSON.stringify(rules, undefined, 2));
    }
    var res = [];
    if (exact) {
        var r = rules.wordMap[lcword];
        if (r) {
            debuglogM(" ....pushing n rules exact for " + lcword + ":" + r.rules.length);
            debuglogM(r.rules.map(function (r, index) {
                return '' + index + ' ' + JSON.stringify(r);
            }).join("\n"));
            r.rules.forEach(function (oRule) {
                res.push({
                    string: word,
                    matchedString: oRule.matchedString,
                    category: oRule.category,
                    rule: oRule,
                    _ranking: oRule._ranking || 1.0
                });
            });
        }
        rules.nonWordRules.forEach(function (oRule) {
            checkOneRuleWithOffset(word, lcword, exact, res, oRule, cntRec);
        });
        res = postFilterWithOffset(res);
        debuglog("here results for" + word + " res " + res.length);
        debuglogM("here results for" + word + " res " + res.length);
        res.sort(sortByRank);
        return res;
    } else {
        debuglog("categorize non exact" + word + " xx  " + rules.allRules.length);
        var rr = categorizeSingleWordWithOffset(word, lcword, exact, rules.allRules, cntRec);
        //debulogM("fuzzy res " + JSON.stringify(rr));
        return postFilterWithOffset(rr);
    }
}
exports.categorizeWordInternalWithOffsets = categorizeWordInternalWithOffsets;
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
        var lastRanking = 1.0;
        var cntRanged = 0;
        return lst.filter(function (oMember, iIndex) {
            var isRanged = !!(oMember["rule"] && oMember["rule"].range);
            if (isRanged) {
                cntRanged += 1;
                return true;
            }
            if (iIndex - cntRanged < n || oMember._ranking === lastRanking) {
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
/* if we have a  "Run like the Wind"
  an a user type fun like  a Rind , and Rind is an exact match,
  we will not start looking for the long sentence

  this is to be fixed by "spreading" the range indication accross very similar words in the vincinity of the
  target words
*/
function categorizeWordWithOffsetWithRankCutoff(sWordGroup, splitRules, cntRec) {
    var sWordGroupLC = sWordGroup.toLowerCase();
    var seenIt = categorizeWordInternalWithOffsets(sWordGroup, sWordGroupLC, true, splitRules, cntRec);
    //console.log("SEENIT" + JSON.stringify(seenIt));
    //totalCnt += 1;
    // exactLen += seenIt.length;
    //console.log("first run exact " + JSON.stringify(seenIt));
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
        seenIt = categorizeWordInternalWithOffsets(sWordGroup, sWordGroupLC, false, splitRules, cntRec);
        addCntRec(cntRec, 'cntNonExact', 1);
        addCntRec(cntRec, 'cntNonExactRes', seenIt.length);
    }
    // totalLen += seenIt.length;
    debuglog(debuglog.enabled ? seenIt.length + " with " + seenIt.reduce(function (prev, obj) {
        return prev + (obj.rule.range ? 1 : 0);
    }, 0) + " ranged !" : '-');
    //  var cntRanged = seenIt.reduce( (prev,obj) => prev + (obj.rule.range ? 1 : 0),0);
    //  console.log(`*********** ${seenIt.length} with ${cntRanged} ranged !`);
    seenIt = exports.RankWord.takeFirstN(seenIt, Algol.Top_N_WordCategorizations);
    // retainedCnt += seenIt.length;
    //console.log("final res of categorizeWordWithOffsetWithRankCutoff" + JSON.stringify(seenIt));
    return seenIt;
}
exports.categorizeWordWithOffsetWithRankCutoff = categorizeWordWithOffsetWithRankCutoff;
function categorizeWordWithOffsetWithRankCutoffSingle(word, rule) {
    var lcword = word.toLowerCase();
    if (lcword === rule.lowercaseword) {
        return {
            string: word,
            matchedString: rule.matchedString,
            category: rule.category,
            rule: rule,
            _ranking: rule._ranking || 1.0
        };
    }
    var res = [];
    checkOneRuleWithOffset(word, lcword, false, res, rule);
    debuglog("catWWOWRCS " + lcword);
    if (res.length) {
        return res[0];
    }
    return undefined;
}
exports.categorizeWordWithOffsetWithRankCutoffSingle = categorizeWordWithOffsetWithRankCutoffSingle;
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
/*
export function filterRemovingUncategorizedSentence(oSentence: IFMatch.ICategorizedString[][]): boolean {
  return oSentence.every(function (oWordGroup) {
    return (oWordGroup.length > 0);
  });
}



export function filterRemovingUncategorized(arr: IFMatch.ICategorizedString[][][]): IFMatch.ICategorizedString[][][] {
  return arr.filter(function (oSentence) {
    return filterRemovingUncategorizedSentence(oSentence);
  });
}
*/
function categorizeAWord(sWordGroup, rules, sentence, words, cntRec) {
    var seenIt = words[sWordGroup];
    if (seenIt === undefined) {
        seenIt = categorizeWordWithRankCutoff(sWordGroup, rules, cntRec);
        Utils.deepFreeze(seenIt);
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
    return Utils.cloneDeep(seenIt);
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
    var u = fdevsta_monmove_1.BreakDown.breakdownString(sString, Algol.MaxSpacesPerCombinedWord);
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
function categorizeAWordWithOffsets(sWordGroup, rules, sentence, words, cntRec) {
    var seenIt = words[sWordGroup];
    if (seenIt === undefined) {
        seenIt = categorizeWordWithOffsetWithRankCutoff(sWordGroup, rules, cntRec);
        Utils.deepFreeze(seenIt);
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
    return Utils.cloneDeep(seenIt);
}
exports.categorizeAWordWithOffsets = categorizeAWordWithOffsets;
/*
[ [a,b], [c,d]]

00 a
01 b
10 c
11 d
12 c
*/
var clone = Utils.cloneDeep;
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
    Utils.deepFreeze(res);
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
            case IFMatch.EnumRuleType.WORD:
                return matchWord(oRule, context, options);
            case IFMatch.EnumRuleType.REGEXP:
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
//export function decideOnReQuery(context: IFMatch.context): Array<IFMatch.context> {
//  return []
//}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1hdGNoL2lucHV0RmlsdGVyLmpzIiwiLi4vc3JjL21hdGNoL2lucHV0RmlsdGVyLnRzIl0sIm5hbWVzIjpbImRpc3RhbmNlIiwicmVxdWlyZSIsIkxvZ2dlciIsImxvZ2dlciIsImRlYnVnIiwiZGVidWdwZXJmIiwiVXRpbHMiLCJBbGdvbCIsImZkZXZzdGFfbW9ubW92ZV8xIiwiQW55T2JqZWN0IiwiT2JqZWN0IiwiZGVidWdsb2ciLCJkZWJ1Z2xvZ1YiLCJkZWJ1Z2xvZ00iLCJtb2NrRGVidWciLCJvIiwiZXhwb3J0cyIsIm1hdGNoZGF0YSIsIm9Vbml0VGVzdHMiLCJjYWxjRGlzdGFuY2UiLCJzVGV4dDEiLCJzVGV4dDIiLCJjYWxjRGlzdGFuY2VBZGp1c3RlZCIsIklGTWF0Y2giLCJsZXZlblBlbmFsdHkiLCJpIiwibm9uUHJpdmF0ZUtleXMiLCJvQSIsImtleXMiLCJmaWx0ZXIiLCJrZXkiLCJjb3VudEFpbkIiLCJvQiIsImZuQ29tcGFyZSIsImFLZXlJZ25vcmUiLCJBcnJheSIsImlzQXJyYXkiLCJpbmRleE9mIiwicmVkdWNlIiwicHJldiIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiY2FsbCIsInNwdXJpb3VzQW5vdEluQiIsImxvd2VyQ2FzZSIsInRvTG93ZXJDYXNlIiwiY29tcGFyZUNvbnRleHQiLCJlcXVhbCIsImEiLCJiIiwiZGlmZmVyZW50Iiwic3B1cmlvdXNMIiwic3B1cmlvdXNSIiwic29ydEJ5UmFuayIsInIiLCJfcmFua2luZyIsImNhdGVnb3J5IiwibG9jYWxlQ29tcGFyZSIsIm1hdGNoZWRTdHJpbmciLCJjaGVja09uZVJ1bGUiLCJzdHJpbmciLCJsY1N0cmluZyIsImV4YWN0IiwicmVzIiwib1J1bGUiLCJjbnRSZWMiLCJlbmFibGVkIiwiSlNPTiIsInN0cmluZ2lmeSIsInR5cGUiLCJFbnVtUnVsZVR5cGUiLCJXT1JEIiwibG93ZXJjYXNld29yZCIsIkVycm9yIiwidW5kZWZpbmVkIiwid29yZCIsInB1c2giLCJleGFjdE9ubHkiLCJsZXZlbm1hdGNoIiwiQ3V0b2ZmX1dvcmRNYXRjaCIsImFkZENudFJlYyIsInJlYyIsInRvRml4ZWQiLCJSRUdFWFAiLCJtIiwicmVnZXhwIiwiZXhlYyIsIm1hdGNoSW5kZXgiLCJjaGVja09uZVJ1bGVXaXRoT2Zmc2V0IiwicnVsZSIsIm1lbWJlciIsIm51bWJlciIsImNhdGVnb3JpemVTdHJpbmciLCJvUnVsZXMiLCJmb3JFYWNoIiwic29ydCIsImNhdGVnb3JpemVTaW5nbGVXb3JkV2l0aE9mZnNldCIsImxjd29yZCIsImxlbmd0aCIsInBvc3RGaWx0ZXIiLCJiZXN0UmFuayIsIm1hcCIsImluZGV4Iiwiam9pbiIsInJlc3giLCJkZWx0YSIsInBvc3RGaWx0ZXJXaXRoT2Zmc2V0IiwicmFuZ2UiLCJjYXRlZ29yaXplU3RyaW5nMiIsInJ1bGVzIiwid29yZE1hcCIsIm5vbldvcmRSdWxlcyIsImFsbFJ1bGVzIiwiY2F0ZWdvcml6ZVdvcmRJbnRlcm5hbFdpdGhPZmZzZXRzIiwicnIiLCJtYXRjaFdvcmQiLCJjb250ZXh0Iiwib3B0aW9ucyIsInMxIiwiczIiLCJmb2xsb3dzIiwibWF0Y2hvdGhlcnMiLCJjIiwiYXNzaWduIiwib3ZlcnJpZGUiLCJfd2VpZ2h0IiwiZnJlZXplIiwiZXh0cmFjdEFyZ3NNYXAiLCJtYXRjaCIsImFyZ3NNYXAiLCJpS2V5IiwidmFsdWUiLCJSYW5rV29yZCIsImhhc0Fib3ZlIiwibHN0IiwiYm9yZGVyIiwiZXZlcnkiLCJvTWVtYmVyIiwidGFrZUZpcnN0TiIsIm4iLCJsYXN0UmFua2luZyIsImNudFJhbmdlZCIsImlJbmRleCIsImlzUmFuZ2VkIiwidGFrZUFib3ZlIiwiY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZiIsInNXb3JkR3JvdXAiLCJzcGxpdFJ1bGVzIiwic2Vlbkl0IiwiVG9wX05fV29yZENhdGVnb3JpemF0aW9ucyIsImNhdGVnb3JpemVXb3JkV2l0aE9mZnNldFdpdGhSYW5rQ3V0b2ZmIiwic1dvcmRHcm91cExDIiwib2JqIiwiY2F0ZWdvcml6ZVdvcmRXaXRoT2Zmc2V0V2l0aFJhbmtDdXRvZmZTaW5nbGUiLCJjYXRlZ29yaXplQVdvcmQiLCJzZW50ZW5jZSIsIndvcmRzIiwiZGVlcEZyZWV6ZSIsImNsb25lRGVlcCIsImFuYWx5emVTdHJpbmciLCJzU3RyaW5nIiwiY250IiwiZmFjIiwidSIsIkJyZWFrRG93biIsImJyZWFrZG93blN0cmluZyIsIk1heFNwYWNlc1BlckNvbWJpbmVkV29yZCIsImFCcmVha0Rvd25TZW50ZW5jZSIsImNhdGVnb3JpemVkU2VudGVuY2UiLCJpc1ZhbGlkIiwiY2F0ZWdvcml6ZUFXb3JkV2l0aE9mZnNldHMiLCJjbG9uZSIsImNvcHlWZWNNZW1iZXJzIiwiZXhwYW5kTWF0Y2hBcnIiLCJkZWVwIiwibGluZSIsInVCcmVha0Rvd25MaW5lIiwiYVdvcmRHcm91cCIsIndnSW5kZXgiLCJvV29yZFZhcmlhbnQiLCJpV1ZJbmRleCIsIm52ZWNzIiwidmVjcyIsInJ2ZWMiLCJrIiwibmV4dEJhc2UiLCJsIiwic2xpY2UiLCJjb25jYXQiLCJyZWluZm9yY2VEaXN0V2VpZ2h0IiwiZGlzdCIsImFicyIsIk1hdGgiLCJhUmVpbmZvcmNlRGlzdFdlaWdodCIsImV4dHJhY3RDYXRlZ29yeU1hcCIsIm9TZW50ZW5jZSIsIm9Xb3JkIiwiQ0FUX0NBVEVHT1JZIiwicG9zIiwicmVpbkZvcmNlU2VudGVuY2UiLCJvQ2F0ZWdvcnlNYXAiLCJvUG9zaXRpb24iLCJyZWluZm9yY2UiLCJib29zdCIsIlNlbnRlbmNlIiwicmVpbkZvcmNlIiwiYUNhdGVnb3JpemVkQXJyYXkiLCJjbXBSYW5raW5nUHJvZHVjdCIsInJhbmtpbmdQcm9kdWN0IiwibWF0Y2hSZWdFeHAiLCJzS2V5IiwicmVnIiwib0V4dHJhY3RlZENvbnRleHQiLCJzb3J0QnlXZWlnaHQiLCJvQ29udGV4dEEiLCJvQ29udGV4dEIiLCJyYW5raW5nQSIsInBhcnNlRmxvYXQiLCJyYW5raW5nQiIsIndlaWdodEEiLCJ3ZWlnaHRCIiwiYXVnbWVudENvbnRleHQxIiwiaVJ1bGUiLCJvcmVzIiwiYmluZCIsImF1Z21lbnRDb250ZXh0IiwiYVJ1bGVzIiwib3B0aW9uczEiLCJhUmVzIiwib3B0aW9uczIiLCJpbnNlcnRPcmRlcmVkIiwicmVzdWx0IiwiaUluc2VydGVkTWVtYmVyIiwibGltaXQiLCJ0YWtlVG9wTiIsImFyciIsImlubmVyQXJyIiwiaUFyciIsInRvcCIsInNoaWZ0IiwiaW5wdXRGaWx0ZXJSdWxlcyIsInJtIiwiZ2V0Uk1PbmNlIiwiZ2V0UnVsZU1hcCIsImFwcGx5UnVsZXMiLCJiZXN0TiIsIm9LZXlPcmRlciIsImJlc3ROZXh0Iiwib0NvbnRleHQiLCJhcHBseVJ1bGVzUGlja0ZpcnN0Il0sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOzs7Ozs7Ozs7Ozs7Ozs7O0FBZ0JBOztBQUNBLElBQUFBLFdBQUFDLFFBQUEsaUJBQUEsQ0FBQTtBQUVBLElBQUFDLFNBQUFELFFBQUEsaUJBQUEsQ0FBQTtBQUVBLElBQU1FLFNBQVNELE9BQU9DLE1BQVAsQ0FBYyxhQUFkLENBQWY7QUFFQSxJQUFBQyxRQUFBSCxRQUFBLE9BQUEsQ0FBQTtBQUNBLElBQUlJLFlBQVlELE1BQU0sTUFBTixDQUFoQjtBQUVBLElBQUFFLFFBQUFMLFFBQUEsWUFBQSxDQUFBO0FBR0EsSUFBQU0sUUFBQU4sUUFBQSxTQUFBLENBQUE7QUFJQSxJQUFBTyxvQkFBQVAsUUFBQSxpQkFBQSxDQUFBO0FBRUEsSUFBTVEsWUFBaUJDLE1BQXZCO0FBRUEsSUFBSUMsV0FBV1AsTUFBTSxhQUFOLENBQWY7QUFDQSxJQUFJUSxZQUFZUixNQUFNLGNBQU4sQ0FBaEI7QUFDQSxJQUFJUyxZQUFZVCxNQUFNLGNBQU4sQ0FBaEI7QUFFQSxTQUFBVSxTQUFBLENBQTBCQyxDQUExQixFQUEyQjtBQUN6QkosZUFBV0ksQ0FBWDtBQUNBSCxnQkFBWUcsQ0FBWjtBQUNBRixnQkFBWUUsQ0FBWjtBQUNEO0FBSkRDLFFBQUFGLFNBQUEsR0FBQUEsU0FBQTtBQU9BLElBQUFHLFlBQUFoQixRQUFBLGFBQUEsQ0FBQTtB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QixFQUFtRDtBQUNqRCxRQUFJaUksUUFBZ0MsQ0FBQ2pJLE9BQUQsQ0FBcEM7QUFDQTRILHFCQUFpQk0sU0FBakIsQ0FBMkJ4SixPQUEzQixDQUFtQyxVQUFVb0gsSUFBVixFQUFzQjtBQUN2RCxZQUFJcUMsV0FBMEMsRUFBOUM7QUFDQUYsY0FBTXZKLE9BQU4sQ0FBYyxVQUFVMEosUUFBVixFQUFtQztBQUMvQyxnQkFBSUEsU0FBU3RDLElBQVQsQ0FBSixFQUFvQjtBQUNsQnZNLHlCQUFTLDJCQUEyQnVNLElBQXBDO0FBQ0Esb0JBQUluSixNQUFNa0ssZUFBZXVCLFFBQWYsRUFBeUJOLFlBQVloQyxJQUFaLEtBQXFCLEVBQTlDLENBQVY7QUFDQXZNLHlCQUFTQSxTQUFTdUQsT0FBVCxHQUFvQixtQkFBbUJnSixJQUFuQixHQUEwQixLQUExQixHQUFrQy9JLEtBQUtDLFNBQUwsQ0FBZUwsR0FBZixFQUFvQlcsU0FBcEIsRUFBK0IsQ0FBL0IsQ0FBdEQsR0FBMEYsR0FBbkc7QUFDQTZLLHlCQUFTM0ssSUFBVCxDQUFjYixPQUFPLEVBQXJCO0FBQ0QsYUFMRCxNQUtPO0FBQ0w7QUFDQXdMLHlCQUFTM0ssSUFBVCxDQUFjLENBQUM0SyxRQUFELENBQWQ7QUFDRDtBQUNGLFNBVkQ7QUFXQUgsZ0JBQVFYLFNBQVNhLFFBQVQsQ0FBUjtBQUNELEtBZEQ7QUFlQSxXQUFPRixLQUFQO0FBQ0Q7QUFsQkRyTyxRQUFBb08sVUFBQSxHQUFBQSxVQUFBO0FBcUJBLFNBQUFLLG1CQUFBLENBQW9DckksT0FBcEMsRUFBNEQ7QUFDMUQsUUFBSTlELElBQUk4TCxXQUFXaEksT0FBWCxDQUFSO0FBQ0EsV0FBTzlELEtBQUtBLEVBQUUsQ0FBRixDQUFaO0FBQ0Q7QUFIRHRDLFFBQUF5TyxtQkFBQSxHQUFBQSxtQkFBQTtBQUtBOzs7QUFHQTtBQUNBO0FBQ0EiLCJmaWxlIjoibWF0Y2gvaW5wdXRGaWx0ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcbi8qKlxuICogdGhlIGlucHV0IGZpbHRlciBzdGFnZSBwcmVwcm9jZXNzZXMgYSBjdXJyZW50IGNvbnRleHRcbiAqXG4gKiBJdCBhKSBjb21iaW5lcyBtdWx0aS1zZWdtZW50IGFyZ3VtZW50cyBpbnRvIG9uZSBjb250ZXh0IG1lbWJlcnNcbiAqIEl0IGIpIGF0dGVtcHRzIHRvIGF1Z21lbnQgdGhlIGNvbnRleHQgYnkgYWRkaXRpb25hbCBxdWFsaWZpY2F0aW9uc1xuICogICAgICAgICAgIChNaWQgdGVybSBnZW5lcmF0aW5nIEFsdGVybmF0aXZlcywgZS5nLlxuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHVuaXQgdGVzdD9cbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiBzb3VyY2UgP1xuICogICAgICAgICAgIClcbiAqICBTaW1wbGUgcnVsZXMgbGlrZSAgSW50ZW50XG4gKlxuICpcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmlucHV0RmlsdGVyXG4gKiBAZmlsZSBpbnB1dEZpbHRlci50c1xuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxuICovXG4vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9saWIvbm9kZS00LmQudHNcIiAvPlxudmFyIGRpc3RhbmNlID0gcmVxdWlyZShcImFib3Rfc3RyaW5nZGlzdFwiKTtcbnZhciBMb2dnZXIgPSByZXF1aXJlKFwiLi4vdXRpbHMvbG9nZ2VyXCIpO1xudmFyIGxvZ2dlciA9IExvZ2dlci5sb2dnZXIoJ2lucHV0RmlsdGVyJyk7XG52YXIgZGVidWcgPSByZXF1aXJlKFwiZGVidWdcIik7XG52YXIgZGVidWdwZXJmID0gZGVidWcoJ3BlcmYnKTtcbnZhciBVdGlscyA9IHJlcXVpcmUoXCJhYm90X3V0aWxzXCIpO1xudmFyIEFsZ29sID0gcmVxdWlyZShcIi4vYWxnb2xcIik7XG52YXIgZmRldnN0YV9tb25tb3ZlXzEgPSByZXF1aXJlKFwiZmRldnN0YV9tb25tb3ZlXCIpO1xudmFyIEFueU9iamVjdCA9IE9iamVjdDtcbnZhciBkZWJ1Z2xvZyA9IGRlYnVnKCdpbnB1dEZpbHRlcicpO1xudmFyIGRlYnVnbG9nViA9IGRlYnVnKCdpbnB1dFZGaWx0ZXInKTtcbnZhciBkZWJ1Z2xvZ00gPSBkZWJ1ZygnaW5wdXRNRmlsdGVyJyk7XG5mdW5jdGlvbiBtb2NrRGVidWcobykge1xuICAgIGRlYnVnbG9nID0gbztcbiAgICBkZWJ1Z2xvZ1YgPSBvO1xuICAgIGRlYnVnbG9nTSA9IG87XG59XG5leHBvcnRzLm1vY2tEZWJ1ZyA9IG1vY2tEZWJ1ZztcbnZhciBtYXRjaGRhdGEgPSByZXF1aXJlKFwiLi9tYXRjaGRhdGFcIik7XG52YXIgb1VuaXRUZXN0cyA9IG1hdGNoZGF0YS5vVW5pdFRlc3RzO1xuLyoqXG4gKiBAcGFyYW0gc1RleHQge3N0cmluZ30gdGhlIHRleHQgdG8gbWF0Y2ggdG8gTmF2VGFyZ2V0UmVzb2x1dGlvblxuICogQHBhcmFtIHNUZXh0MiB7c3RyaW5nfSB0aGUgcXVlcnkgdGV4dCwgZS5nLiBOYXZUYXJnZXRcbiAqXG4gKiBAcmV0dXJuIHRoZSBkaXN0YW5jZSwgbm90ZSB0aGF0IGlzIGlzICpub3QqIHN5bW1ldHJpYyFcbiAqL1xuZnVuY3Rpb24gY2FsY0Rpc3RhbmNlKHNUZXh0MSwgc1RleHQyKSB7XG4gICAgcmV0dXJuIGRpc3RhbmNlLmNhbGNEaXN0YW5jZUFkanVzdGVkKHNUZXh0MSwgc1RleHQyKTtcbn1cbmV4cG9ydHMuY2FsY0Rpc3RhbmNlID0gY2FsY0Rpc3RhbmNlO1xuLyoqXG4gKiBAcGFyYW0gc1RleHQge3N0cmluZ30gdGhlIHRleHQgdG8gbWF0Y2ggdG8gTmF2VGFyZ2V0UmVzb2x1dGlvblxuICogQHBhcmFtIHNUZXh0MiB7c3RyaW5nfSB0aGUgcXVlcnkgdGV4dCwgZS5nLiBOYXZUYXJnZXRcbiAqXG4gKiBAcmV0dXJuIHRoZSBkaXN0YW5jZSwgbm90ZSB0aGF0IGlzIGlzICpub3QqIHN5bW1ldHJpYyFcbiAqL1xuLypcbmV4cG9ydCBmdW5jdGlvbiBjYWxjRGlzdGFuY2VMZXZlblhYWChzVGV4dDE6IHN0cmluZywgc1RleHQyOiBzdHJpbmcpOiBudW1iZXIge1xuICAvLyBjb25zb2xlLmxvZyhcImxlbmd0aDJcIiArIHNUZXh0MSArIFwiIC0gXCIgKyBzVGV4dDIpXG4gICBpZigoKHNUZXh0MS5sZW5ndGggLSBzVGV4dDIubGVuZ3RoKSA+IEFsZ29sLmNhbGNEaXN0Lmxlbmd0aERlbHRhMSlcbiAgICB8fCAoc1RleHQyLmxlbmd0aCA+IDEuNSAqIHNUZXh0MS5sZW5ndGggKVxuICAgIHx8IChzVGV4dDIubGVuZ3RoIDwgKHNUZXh0MS5sZW5ndGgvMikpICkge1xuICAgIHJldHVybiA1MDAwMDtcbiAgfVxuICB2YXIgYTAgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEuc3Vic3RyaW5nKDAsIHNUZXh0Mi5sZW5ndGgpLCBzVGV4dDIpXG4gIGlmKGRlYnVnbG9nVi5lbmFibGVkKSB7XG4gICAgZGVidWdsb2dWKFwiZGlzdGFuY2VcIiArIGEwICsgXCJzdHJpcHBlZD5cIiArIHNUZXh0MS5zdWJzdHJpbmcoMCxzVGV4dDIubGVuZ3RoKSArIFwiPD5cIiArIHNUZXh0MisgXCI8XCIpO1xuICB9XG4gIGlmKGEwICogNTAgPiAxNSAqIHNUZXh0Mi5sZW5ndGgpIHtcbiAgICAgIHJldHVybiA0MDAwMDtcbiAgfVxuICB2YXIgYSA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MSwgc1RleHQyKVxuICByZXR1cm4gYTAgKiA1MDAgLyBzVGV4dDIubGVuZ3RoICsgYVxufVxuKi9cbnZhciBJRk1hdGNoID0gcmVxdWlyZShcIi4uL21hdGNoL2lmbWF0Y2hcIik7XG4vL2NvbnN0IGxldmVuQ3V0b2ZmID0gQWxnb2wuQ3V0b2ZmX0xldmVuU2h0ZWluO1xuLypcbmV4cG9ydCBmdW5jdGlvbiBsZXZlblBlbmFsdHlPbGQoaTogbnVtYmVyKTogbnVtYmVyIHtcbiAgLy8gMC0+IDFcbiAgLy8gMSAtPiAwLjFcbiAgLy8gMTUwIC0+ICAwLjhcbiAgaWYgKGkgPT09IDApIHtcbiAgICByZXR1cm4gMTtcbiAgfVxuICAvLyByZXZlcnNlIG1heSBiZSBiZXR0ZXIgdGhhbiBsaW5lYXJcbiAgcmV0dXJuIDEgKyBpICogKDAuOCAtIDEpIC8gMTUwXG59XG4qL1xuZnVuY3Rpb24gbGV2ZW5QZW5hbHR5KGkpIHtcbiAgICAvLyAxIC0+IDFcbiAgICAvLyBjdXRPZmYgPT4gMC44XG4gICAgcmV0dXJuIGk7XG4gICAgLy9yZXR1cm4gICAxIC0gICgxIC0gaSkgKjAuMi9BbGdvbC5DdXRvZmZfV29yZE1hdGNoO1xufVxuZXhwb3J0cy5sZXZlblBlbmFsdHkgPSBsZXZlblBlbmFsdHk7XG5mdW5jdGlvbiBub25Qcml2YXRlS2V5cyhvQSkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhvQSkuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIGtleVswXSAhPT0gJ18nO1xuICAgIH0pO1xufVxuZnVuY3Rpb24gY291bnRBaW5CKG9BLCBvQiwgZm5Db21wYXJlLCBhS2V5SWdub3JlKSB7XG4gICAgYUtleUlnbm9yZSA9IEFycmF5LmlzQXJyYXkoYUtleUlnbm9yZSkgPyBhS2V5SWdub3JlIDpcbiAgICAgICAgdHlwZW9mIGFLZXlJZ25vcmUgPT09IFwic3RyaW5nXCIgPyBbYUtleUlnbm9yZV0gOiBbXTtcbiAgICBmbkNvbXBhcmUgPSBmbkNvbXBhcmUgfHwgZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICByZXR1cm4gbm9uUHJpdmF0ZUtleXMob0EpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHJldHVybiBhS2V5SWdub3JlLmluZGV4T2Yoa2V5KSA8IDA7XG4gICAgfSkuXG4gICAgICAgIHJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgKGZuQ29tcGFyZShvQVtrZXldLCBvQltrZXldLCBrZXkpID8gMSA6IDApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIDApO1xufVxuZXhwb3J0cy5jb3VudEFpbkIgPSBjb3VudEFpbkI7XG5mdW5jdGlvbiBzcHVyaW91c0Fub3RJbkIob0EsIG9CLCBhS2V5SWdub3JlKSB7XG4gICAgYUtleUlnbm9yZSA9IEFycmF5LmlzQXJyYXkoYUtleUlnbm9yZSkgPyBhS2V5SWdub3JlIDpcbiAgICAgICAgdHlwZW9mIGFLZXlJZ25vcmUgPT09IFwic3RyaW5nXCIgPyBbYUtleUlnbm9yZV0gOiBbXTtcbiAgICByZXR1cm4gbm9uUHJpdmF0ZUtleXMob0EpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHJldHVybiBhS2V5SWdub3JlLmluZGV4T2Yoa2V5KSA8IDA7XG4gICAgfSkuXG4gICAgICAgIHJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XG4gICAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9CLCBrZXkpKSB7XG4gICAgICAgICAgICBwcmV2ID0gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG59XG5leHBvcnRzLnNwdXJpb3VzQW5vdEluQiA9IHNwdXJpb3VzQW5vdEluQjtcbmZ1bmN0aW9uIGxvd2VyQ2FzZShvKSB7XG4gICAgaWYgKHR5cGVvZiBvID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIHJldHVybiBvLnRvTG93ZXJDYXNlKCk7XG4gICAgfVxuICAgIHJldHVybiBvO1xufVxuZnVuY3Rpb24gY29tcGFyZUNvbnRleHQob0EsIG9CLCBhS2V5SWdub3JlKSB7XG4gICAgdmFyIGVxdWFsID0gY291bnRBaW5CKG9BLCBvQiwgZnVuY3Rpb24gKGEsIGIpIHsgcmV0dXJuIGxvd2VyQ2FzZShhKSA9PT0gbG93ZXJDYXNlKGIpOyB9LCBhS2V5SWdub3JlKTtcbiAgICB2YXIgZGlmZmVyZW50ID0gY291bnRBaW5CKG9BLCBvQiwgZnVuY3Rpb24gKGEsIGIpIHsgcmV0dXJuIGxvd2VyQ2FzZShhKSAhPT0gbG93ZXJDYXNlKGIpOyB9LCBhS2V5SWdub3JlKTtcbiAgICB2YXIgc3B1cmlvdXNMID0gc3B1cmlvdXNBbm90SW5CKG9BLCBvQiwgYUtleUlnbm9yZSk7XG4gICAgdmFyIHNwdXJpb3VzUiA9IHNwdXJpb3VzQW5vdEluQihvQiwgb0EsIGFLZXlJZ25vcmUpO1xuICAgIHJldHVybiB7XG4gICAgICAgIGVxdWFsOiBlcXVhbCxcbiAgICAgICAgZGlmZmVyZW50OiBkaWZmZXJlbnQsXG4gICAgICAgIHNwdXJpb3VzTDogc3B1cmlvdXNMLFxuICAgICAgICBzcHVyaW91c1I6IHNwdXJpb3VzUlxuICAgIH07XG59XG5leHBvcnRzLmNvbXBhcmVDb250ZXh0ID0gY29tcGFyZUNvbnRleHQ7XG5mdW5jdGlvbiBzb3J0QnlSYW5rKGEsIGIpIHtcbiAgICB2YXIgciA9IC0oKGEuX3JhbmtpbmcgfHwgMS4wKSAtIChiLl9yYW5raW5nIHx8IDEuMCkpO1xuICAgIGlmIChyKSB7XG4gICAgICAgIHJldHVybiByO1xuICAgIH1cbiAgICBpZiAoYS5jYXRlZ29yeSAmJiBiLmNhdGVnb3J5KSB7XG4gICAgICAgIHIgPSBhLmNhdGVnb3J5LmxvY2FsZUNvbXBhcmUoYi5jYXRlZ29yeSk7XG4gICAgICAgIGlmIChyKSB7XG4gICAgICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoYS5tYXRjaGVkU3RyaW5nICYmIGIubWF0Y2hlZFN0cmluZykge1xuICAgICAgICByID0gYS5tYXRjaGVkU3RyaW5nLmxvY2FsZUNvbXBhcmUoYi5tYXRjaGVkU3RyaW5nKTtcbiAgICAgICAgaWYgKHIpIHtcbiAgICAgICAgICAgIHJldHVybiByO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAwO1xufVxuZnVuY3Rpb24gY2hlY2tPbmVSdWxlKHN0cmluZywgbGNTdHJpbmcsIGV4YWN0LCByZXMsIG9SdWxlLCBjbnRSZWMpIHtcbiAgICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2dWKCdhdHRlbXB0aW5nIHRvIG1hdGNoIHJ1bGUgJyArIEpTT04uc3RyaW5naWZ5KG9SdWxlKSArIFwiIHRvIHN0cmluZyBcXFwiXCIgKyBzdHJpbmcgKyBcIlxcXCJcIik7XG4gICAgfVxuICAgIHN3aXRjaCAob1J1bGUudHlwZSkge1xuICAgICAgICBjYXNlIElGTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQ6XG4gICAgICAgICAgICBpZiAoIW9SdWxlLmxvd2VyY2FzZXdvcmQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3J1bGUgd2l0aG91dCBhIGxvd2VyY2FzZSB2YXJpYW50JyArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIDtcbiAgICAgICAgICAgIGlmIChleGFjdCAmJiBvUnVsZS53b3JkID09PSBzdHJpbmcgfHwgb1J1bGUubG93ZXJjYXNld29yZCA9PT0gbGNTdHJpbmcpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcIlxcbiFtYXRjaGVkIGV4YWN0IFwiICsgc3RyaW5nICsgXCI9XCIgKyBvUnVsZS5sb3dlcmNhc2V3b3JkICsgXCIgPT4gXCIgKyBvUnVsZS5tYXRjaGVkU3RyaW5nICsgXCIvXCIgKyBvUnVsZS5jYXRlZ29yeSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFleGFjdCAmJiAhb1J1bGUuZXhhY3RPbmx5KSB7XG4gICAgICAgICAgICAgICAgdmFyIGxldmVubWF0Y2ggPSBjYWxjRGlzdGFuY2Uob1J1bGUubG93ZXJjYXNld29yZCwgbGNTdHJpbmcpO1xuICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VcIiwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGxldmVubWF0Y2ggPCA1MCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VFeHBcIiwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYobGV2ZW5tYXRjaCA8IDQwMDAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYyxcImNhbGNEaXN0YW5jZUJlbG93NDBrXCIsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgLy9pZihvUnVsZS5sb3dlcmNhc2V3b3JkID09PSBcImNvc21vc1wiKSB7XG4gICAgICAgICAgICAgICAgLy8gIGNvbnNvbGUubG9nKFwiaGVyZSByYW5raW5nIFwiICsgbGV2ZW5tYXRjaCArIFwiIFwiICsgb1J1bGUubG93ZXJjYXNld29yZCArIFwiIFwiICsgbGNTdHJpbmcpO1xuICAgICAgICAgICAgICAgIC8vfVxuICAgICAgICAgICAgICAgIGlmIChsZXZlbm1hdGNoID49IEFsZ29sLkN1dG9mZl9Xb3JkTWF0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYywgXCJjYWxjRGlzdGFuY2VPa1wiLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlYyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiAob1J1bGUuX3JhbmtpbmcgfHwgMS4wKSAqIGxldmVuUGVuYWx0eShsZXZlbm1hdGNoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldmVubWF0Y2g6IGxldmVubWF0Y2hcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlYnVnbG9nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcIlxcbiFmdXp6eSBcIiArIChsZXZlbm1hdGNoKS50b0ZpeGVkKDMpICsgXCIgXCIgKyByZWMuX3JhbmtpbmcudG9GaXhlZCgzKSArIFwiICBcIiArIHN0cmluZyArIFwiPVwiICsgb1J1bGUubG93ZXJjYXNld29yZCArIFwiID0+IFwiICsgb1J1bGUubWF0Y2hlZFN0cmluZyArIFwiL1wiICsgb1J1bGUuY2F0ZWdvcnkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKHJlYyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuUkVHRVhQOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KFwiIGhlcmUgcmVnZXhwXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgbSA9IG9SdWxlLnJlZ2V4cC5leGVjKHN0cmluZyk7XG4gICAgICAgICAgICAgICAgaWYgKG0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiAob1J1bGUubWF0Y2hJbmRleCAhPT0gdW5kZWZpbmVkICYmIG1bb1J1bGUubWF0Y2hJbmRleF0pIHx8IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmtub3duIHR5cGVcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG59XG5leHBvcnRzLmNoZWNrT25lUnVsZSA9IGNoZWNrT25lUnVsZTtcbmZ1bmN0aW9uIGNoZWNrT25lUnVsZVdpdGhPZmZzZXQoc3RyaW5nLCBsY1N0cmluZywgZXhhY3QsIHJlcywgb1J1bGUsIGNudFJlYykge1xuICAgIGlmIChkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZ1YoJ2F0dGVtcHRpbmcgdG8gbWF0Y2ggcnVsZSAnICsgSlNPTi5zdHJpbmdpZnkob1J1bGUpICsgXCIgdG8gc3RyaW5nIFxcXCJcIiArIHN0cmluZyArIFwiXFxcIlwiKTtcbiAgICB9XG4gICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XG4gICAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuV09SRDpcbiAgICAgICAgICAgIGlmICghb1J1bGUubG93ZXJjYXNld29yZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncnVsZSB3aXRob3V0IGEgbG93ZXJjYXNlIHZhcmlhbnQnICsgSlNPTi5zdHJpbmdpZnkob1J1bGUsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgO1xuICAgICAgICAgICAgaWYgKGV4YWN0ICYmIChvUnVsZS53b3JkID09PSBzdHJpbmcgfHwgb1J1bGUubG93ZXJjYXNld29yZCA9PT0gbGNTdHJpbmcpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVidWdsb2coXCJcXG4hbWF0Y2hlZCBleGFjdCBcIiArIHN0cmluZyArIFwiPVwiICsgb1J1bGUubG93ZXJjYXNld29yZCArIFwiID0+IFwiICsgb1J1bGUubWF0Y2hlZFN0cmluZyArIFwiL1wiICsgb1J1bGUuY2F0ZWdvcnkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBvUnVsZS5tYXRjaGVkU3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgIHJ1bGU6IG9SdWxlLFxuICAgICAgICAgICAgICAgICAgICBfcmFua2luZzogb1J1bGUuX3JhbmtpbmcgfHwgMS4wXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWV4YWN0ICYmICFvUnVsZS5leGFjdE9ubHkpIHtcbiAgICAgICAgICAgICAgICB2YXIgbGV2ZW5tYXRjaCA9IGNhbGNEaXN0YW5jZShvUnVsZS5sb3dlcmNhc2V3b3JkLCBsY1N0cmluZyk7XG4gICAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYyxcImNhbGNEaXN0YW5jZVwiLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYobGV2ZW5tYXRjaCA8IDUwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYyxcImNhbGNEaXN0YW5jZUV4cFwiLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBpZihsZXZlbm1hdGNoIDwgNDAwMDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlQmVsb3c0MGtcIiwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICAvL2lmKG9SdWxlLmxvd2VyY2FzZXdvcmQgPT09IFwiY29zbW9zXCIpIHtcbiAgICAgICAgICAgICAgICAvLyAgY29uc29sZS5sb2coXCJoZXJlIHJhbmtpbmcgXCIgKyBsZXZlbm1hdGNoICsgXCIgXCIgKyBvUnVsZS5sb3dlcmNhc2V3b3JkICsgXCIgXCIgKyBsY1N0cmluZyk7XG4gICAgICAgICAgICAgICAgLy99XG4gICAgICAgICAgICAgICAgaWYgKGxldmVubWF0Y2ggPj0gQWxnb2wuQ3V0b2ZmX1dvcmRNYXRjaCkge1xuICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiZm91bmQgcmVjXCIpO1xuICAgICAgICAgICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLCBcImNhbGNEaXN0YW5jZU9rXCIsIDEpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVjID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBydWxlOiBvUnVsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgICAgICBfcmFua2luZzogKG9SdWxlLl9yYW5raW5nIHx8IDEuMCkgKiBsZXZlblBlbmFsdHkobGV2ZW5tYXRjaCksXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXZlbm1hdGNoOiBsZXZlbm1hdGNoXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIGlmIChkZWJ1Z2xvZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVidWdsb2coXCJcXG4hQ09STzogZnV6enkgXCIgKyAobGV2ZW5tYXRjaCkudG9GaXhlZCgzKSArIFwiIFwiICsgcmVjLl9yYW5raW5nLnRvRml4ZWQoMykgKyBcIiAgXFxcIlwiICsgc3RyaW5nICsgXCJcXFwiPVwiICsgb1J1bGUubG93ZXJjYXNld29yZCArIFwiID0+IFwiICsgb1J1bGUubWF0Y2hlZFN0cmluZyArIFwiL1wiICsgb1J1bGUuY2F0ZWdvcnkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKHJlYyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuUkVHRVhQOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KFwiIGhlcmUgcmVnZXhwXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgbSA9IG9SdWxlLnJlZ2V4cC5leGVjKHN0cmluZyk7XG4gICAgICAgICAgICAgICAgaWYgKG0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBydWxlOiBvUnVsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IChvUnVsZS5tYXRjaEluZGV4ICE9PSB1bmRlZmluZWQgJiYgbVtvUnVsZS5tYXRjaEluZGV4XSkgfHwgc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInVua25vd24gdHlwZVwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUsIHVuZGVmaW5lZCwgMikpO1xuICAgIH1cbn1cbmV4cG9ydHMuY2hlY2tPbmVSdWxlV2l0aE9mZnNldCA9IGNoZWNrT25lUnVsZVdpdGhPZmZzZXQ7XG47XG5mdW5jdGlvbiBhZGRDbnRSZWMoY250UmVjLCBtZW1iZXIsIG51bWJlcikge1xuICAgIGlmICgoIWNudFJlYykgfHwgKG51bWJlciA9PT0gMCkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjbnRSZWNbbWVtYmVyXSA9IChjbnRSZWNbbWVtYmVyXSB8fCAwKSArIG51bWJlcjtcbn1cbmZ1bmN0aW9uIGNhdGVnb3JpemVTdHJpbmcod29yZCwgZXhhY3QsIG9SdWxlcywgY250UmVjKSB7XG4gICAgLy8gc2ltcGx5IGFwcGx5IGFsbCBydWxlc1xuICAgIGlmIChkZWJ1Z2xvZ00uZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZ00oXCJydWxlcyA6IFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgdmFyIGxjU3RyaW5nID0gd29yZC50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBvUnVsZXMuZm9yRWFjaChmdW5jdGlvbiAob1J1bGUpIHtcbiAgICAgICAgY2hlY2tPbmVSdWxlKHdvcmQsIGxjU3RyaW5nLCBleGFjdCwgcmVzLCBvUnVsZSwgY250UmVjKTtcbiAgICB9KTtcbiAgICByZXMuc29ydChzb3J0QnlSYW5rKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5jYXRlZ29yaXplU3RyaW5nID0gY2F0ZWdvcml6ZVN0cmluZztcbmZ1bmN0aW9uIGNhdGVnb3JpemVTaW5nbGVXb3JkV2l0aE9mZnNldCh3b3JkLCBsY3dvcmQsIGV4YWN0LCBvUnVsZXMsIGNudFJlYykge1xuICAgIC8vIHNpbXBseSBhcHBseSBhbGwgcnVsZXNcbiAgICBpZiAoZGVidWdsb2dNLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2dNKFwicnVsZXMgOiBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHZhciByZXMgPSBbXTtcbiAgICBvUnVsZXMuZm9yRWFjaChmdW5jdGlvbiAob1J1bGUpIHtcbiAgICAgICAgY2hlY2tPbmVSdWxlV2l0aE9mZnNldCh3b3JkLCBsY3dvcmQsIGV4YWN0LCByZXMsIG9SdWxlLCBjbnRSZWMpO1xuICAgIH0pO1xuICAgIGRlYnVnbG9nKFwiQ1NXV086IGdvdCByZXN1bHRzIGZvciBcIiArIGxjd29yZCArIFwiICBcIiArIHJlcy5sZW5ndGgpO1xuICAgIHJlcy5zb3J0KHNvcnRCeVJhbmspO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmNhdGVnb3JpemVTaW5nbGVXb3JkV2l0aE9mZnNldCA9IGNhdGVnb3JpemVTaW5nbGVXb3JkV2l0aE9mZnNldDtcbmZ1bmN0aW9uIHBvc3RGaWx0ZXIocmVzKSB7XG4gICAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XG4gICAgdmFyIGJlc3RSYW5rID0gMDtcbiAgICAvL2NvbnNvbGUubG9nKFwiXFxucGlsdGVyZWQgXCIgKyBKU09OLnN0cmluZ2lmeShyZXMpKTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcInByZUZpbHRlciA6IFxcblwiICsgcmVzLm1hcChmdW5jdGlvbiAod29yZCwgaW5kZXgpIHtcbiAgICAgICAgICAgIHJldHVybiBpbmRleCArIFwiIFwiICsgd29yZC5fcmFua2luZyArIFwiICA9PiBcXFwiXCIgKyB3b3JkLmNhdGVnb3J5ICsgXCJcXFwiIFwiICsgd29yZC5tYXRjaGVkU3RyaW5nO1xuICAgICAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgICB9XG4gICAgdmFyIHIgPSByZXMuZmlsdGVyKGZ1bmN0aW9uIChyZXN4LCBpbmRleCkge1xuICAgICAgICBpZiAoaW5kZXggPT09IDApIHtcbiAgICAgICAgICAgIGJlc3RSYW5rID0gcmVzeC5fcmFua2luZztcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vIDEtMC45ID0gMC4xXG4gICAgICAgIC8vIDEtIDAuOTMgPSAwLjdcbiAgICAgICAgLy8gMS83XG4gICAgICAgIHZhciBkZWx0YSA9IGJlc3RSYW5rIC8gcmVzeC5fcmFua2luZztcbiAgICAgICAgaWYgKChyZXN4Lm1hdGNoZWRTdHJpbmcgPT09IHJlc1tpbmRleCAtIDFdLm1hdGNoZWRTdHJpbmcpXG4gICAgICAgICAgICAmJiAocmVzeC5jYXRlZ29yeSA9PT0gcmVzW2luZGV4IC0gMV0uY2F0ZWdvcnkpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIlxcbiBkZWx0YSBmb3IgXCIgKyBkZWx0YSArIFwiICBcIiArIHJlc3guX3JhbmtpbmcpO1xuICAgICAgICBpZiAocmVzeC5sZXZlbm1hdGNoICYmIChkZWx0YSA+IDEuMDMpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCJcXG5maWx0ZXJlZCBcIiArIHIubGVuZ3RoICsgXCIvXCIgKyByZXMubGVuZ3RoICsgSlNPTi5zdHJpbmdpZnkocikpO1xuICAgIH1cbiAgICByZXR1cm4gcjtcbn1cbmV4cG9ydHMucG9zdEZpbHRlciA9IHBvc3RGaWx0ZXI7XG5mdW5jdGlvbiBwb3N0RmlsdGVyV2l0aE9mZnNldChyZXMpIHtcbiAgICByZXMuc29ydChzb3J0QnlSYW5rKTtcbiAgICB2YXIgYmVzdFJhbmsgPSAwO1xuICAgIC8vY29uc29sZS5sb2coXCJcXG5waWx0ZXJlZCBcIiArIEpTT04uc3RyaW5naWZ5KHJlcykpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiIHByZUZpbHRlciA6IFxcblwiICsgcmVzLm1hcChmdW5jdGlvbiAod29yZCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiIFwiICsgd29yZC5fcmFua2luZyArIFwiICA9PiBcXFwiXCIgKyB3b3JkLmNhdGVnb3J5ICsgXCJcXFwiIFwiICsgd29yZC5tYXRjaGVkU3RyaW5nICsgXCIgXCI7XG4gICAgICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICAgIH1cbiAgICB2YXIgciA9IHJlcy5maWx0ZXIoZnVuY3Rpb24gKHJlc3gsIGluZGV4KSB7XG4gICAgICAgIGlmIChpbmRleCA9PT0gMCkge1xuICAgICAgICAgICAgYmVzdFJhbmsgPSByZXN4Ll9yYW5raW5nO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgLy8gMS0wLjkgPSAwLjFcbiAgICAgICAgLy8gMS0gMC45MyA9IDAuN1xuICAgICAgICAvLyAxLzdcbiAgICAgICAgdmFyIGRlbHRhID0gYmVzdFJhbmsgLyByZXN4Ll9yYW5raW5nO1xuICAgICAgICBpZiAoIShyZXN4LnJ1bGUgJiYgcmVzeC5ydWxlLnJhbmdlKVxuICAgICAgICAgICAgJiYgIShyZXNbaW5kZXggLSAxXS5ydWxlICYmIHJlc1tpbmRleCAtIDFdLnJ1bGUucmFuZ2UpXG4gICAgICAgICAgICAmJiAocmVzeC5tYXRjaGVkU3RyaW5nID09PSByZXNbaW5kZXggLSAxXS5tYXRjaGVkU3RyaW5nKVxuICAgICAgICAgICAgJiYgKHJlc3guY2F0ZWdvcnkgPT09IHJlc1tpbmRleCAtIDFdLmNhdGVnb3J5KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJcXG4gZGVsdGEgZm9yIFwiICsgZGVsdGEgKyBcIiAgXCIgKyByZXN4Ll9yYW5raW5nKTtcbiAgICAgICAgaWYgKHJlc3gubGV2ZW5tYXRjaCAmJiAoZGVsdGEgPiAxLjAzKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiXFxuZmlsdGVyZWQgXCIgKyByLmxlbmd0aCArIFwiL1wiICsgcmVzLmxlbmd0aCArIEpTT04uc3RyaW5naWZ5KHIpKTtcbiAgICB9XG4gICAgcmV0dXJuIHI7XG59XG5leHBvcnRzLnBvc3RGaWx0ZXJXaXRoT2Zmc2V0ID0gcG9zdEZpbHRlcldpdGhPZmZzZXQ7XG5mdW5jdGlvbiBjYXRlZ29yaXplU3RyaW5nMih3b3JkLCBleGFjdCwgcnVsZXMsIGNudFJlYykge1xuICAgIC8vIHNpbXBseSBhcHBseSBhbGwgcnVsZXNcbiAgICBpZiAoZGVidWdsb2dNLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2dNKFwicnVsZXMgOiBcIiArIEpTT04uc3RyaW5naWZ5KHJ1bGVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgdmFyIGxjU3RyaW5nID0gd29yZC50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBpZiAoZXhhY3QpIHtcbiAgICAgICAgdmFyIHIgPSBydWxlcy53b3JkTWFwW2xjU3RyaW5nXTtcbiAgICAgICAgaWYgKHIpIHtcbiAgICAgICAgICAgIHIucnVsZXMuZm9yRWFjaChmdW5jdGlvbiAob1J1bGUpIHtcbiAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIHN0cmluZzogd29yZCxcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICBfcmFua2luZzogb1J1bGUuX3JhbmtpbmcgfHwgMS4wXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBydWxlcy5ub25Xb3JkUnVsZXMuZm9yRWFjaChmdW5jdGlvbiAob1J1bGUpIHtcbiAgICAgICAgICAgIGNoZWNrT25lUnVsZSh3b3JkLCBsY1N0cmluZywgZXhhY3QsIHJlcywgb1J1bGUsIGNudFJlYyk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXMuc29ydChzb3J0QnlSYW5rKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGRlYnVnbG9nKFwiY2F0ZWdvcml6ZSBub24gZXhhY3RcIiArIHdvcmQgKyBcIiB4eCAgXCIgKyBydWxlcy5hbGxSdWxlcy5sZW5ndGgpO1xuICAgICAgICByZXR1cm4gcG9zdEZpbHRlcihjYXRlZ29yaXplU3RyaW5nKHdvcmQsIGV4YWN0LCBydWxlcy5hbGxSdWxlcywgY250UmVjKSk7XG4gICAgfVxufVxuZXhwb3J0cy5jYXRlZ29yaXplU3RyaW5nMiA9IGNhdGVnb3JpemVTdHJpbmcyO1xuZnVuY3Rpb24gY2F0ZWdvcml6ZVdvcmRJbnRlcm5hbFdpdGhPZmZzZXRzKHdvcmQsIGxjd29yZCwgZXhhY3QsIHJ1bGVzLCBjbnRSZWMpIHtcbiAgICBkZWJ1Z2xvZ00oXCJjYXRlZ29yaXplIFwiICsgbGN3b3JkICsgXCIgd2l0aCBvZmZzZXQhISEhISEhISEhISEhISEhIVwiICsgZXhhY3QpO1xuICAgIC8vIHNpbXBseSBhcHBseSBhbGwgcnVsZXNcbiAgICBpZiAoZGVidWdsb2dNLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2dNKFwicnVsZXMgOiBcIiArIEpTT04uc3RyaW5naWZ5KHJ1bGVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIGlmIChleGFjdCkge1xuICAgICAgICB2YXIgciA9IHJ1bGVzLndvcmRNYXBbbGN3b3JkXTtcbiAgICAgICAgaWYgKHIpIHtcbiAgICAgICAgICAgIGRlYnVnbG9nTShcIiAuLi4ucHVzaGluZyBuIHJ1bGVzIGV4YWN0IGZvciBcIiArIGxjd29yZCArIFwiOlwiICsgci5ydWxlcy5sZW5ndGgpO1xuICAgICAgICAgICAgZGVidWdsb2dNKHIucnVsZXMubWFwKGZ1bmN0aW9uIChyLCBpbmRleCkgeyByZXR1cm4gJycgKyBpbmRleCArICcgJyArIEpTT04uc3RyaW5naWZ5KHIpOyB9KS5qb2luKFwiXFxuXCIpKTtcbiAgICAgICAgICAgIHIucnVsZXMuZm9yRWFjaChmdW5jdGlvbiAob1J1bGUpIHtcbiAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIHN0cmluZzogd29yZCxcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICBydWxlOiBvUnVsZSxcbiAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcnVsZXMubm9uV29yZFJ1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgICAgICBjaGVja09uZVJ1bGVXaXRoT2Zmc2V0KHdvcmQsIGxjd29yZCwgZXhhY3QsIHJlcywgb1J1bGUsIGNudFJlYyk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXMgPSBwb3N0RmlsdGVyV2l0aE9mZnNldChyZXMpO1xuICAgICAgICBkZWJ1Z2xvZyhcImhlcmUgcmVzdWx0cyBmb3JcIiArIHdvcmQgKyBcIiByZXMgXCIgKyByZXMubGVuZ3RoKTtcbiAgICAgICAgZGVidWdsb2dNKFwiaGVyZSByZXN1bHRzIGZvclwiICsgd29yZCArIFwiIHJlcyBcIiArIHJlcy5sZW5ndGgpO1xuICAgICAgICByZXMuc29ydChzb3J0QnlSYW5rKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGRlYnVnbG9nKFwiY2F0ZWdvcml6ZSBub24gZXhhY3RcIiArIHdvcmQgKyBcIiB4eCAgXCIgKyBydWxlcy5hbGxSdWxlcy5sZW5ndGgpO1xuICAgICAgICB2YXIgcnIgPSBjYXRlZ29yaXplU2luZ2xlV29yZFdpdGhPZmZzZXQod29yZCwgbGN3b3JkLCBleGFjdCwgcnVsZXMuYWxsUnVsZXMsIGNudFJlYyk7XG4gICAgICAgIC8vZGVidWxvZ00oXCJmdXp6eSByZXMgXCIgKyBKU09OLnN0cmluZ2lmeShycikpO1xuICAgICAgICByZXR1cm4gcG9zdEZpbHRlcldpdGhPZmZzZXQocnIpO1xuICAgIH1cbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZVdvcmRJbnRlcm5hbFdpdGhPZmZzZXRzID0gY2F0ZWdvcml6ZVdvcmRJbnRlcm5hbFdpdGhPZmZzZXRzO1xuLyoqXG4gKlxuICogT3B0aW9ucyBtYXkgYmUge1xuICogbWF0Y2hvdGhlcnMgOiB0cnVlLCAgPT4gb25seSBydWxlcyB3aGVyZSBhbGwgb3RoZXJzIG1hdGNoIGFyZSBjb25zaWRlcmVkXG4gKiBhdWdtZW50IDogdHJ1ZSxcbiAqIG92ZXJyaWRlIDogdHJ1ZSB9ICA9PlxuICpcbiAqL1xuZnVuY3Rpb24gbWF0Y2hXb3JkKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBzMSA9IGNvbnRleHRbb1J1bGUua2V5XS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciBzMiA9IG9SdWxlLndvcmQudG9Mb3dlckNhc2UoKTtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB2YXIgZGVsdGEgPSBjb21wYXJlQ29udGV4dChjb250ZXh0LCBvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlbHRhKSk7XG4gICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBjID0gY2FsY0Rpc3RhbmNlKHMyLCBzMSk7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCIgczEgPD4gczIgXCIgKyBzMSArIFwiPD5cIiArIHMyICsgXCIgID0+OiBcIiArIGMpO1xuICAgIH1cbiAgICBpZiAoYyA+IDAuODApIHtcbiAgICAgICAgdmFyIHJlcyA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpO1xuICAgICAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgY29udGV4dCk7XG4gICAgICAgIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XG4gICAgICAgICAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb1J1bGUuZm9sbG93cyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZm9yY2Uga2V5IHByb3BlcnR5XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCcgb2JqZWN0Y2F0ZWdvcnknLCByZXNbJ3N5c3RlbU9iamVjdENhdGVnb3J5J10pO1xuICAgICAgICByZXNbb1J1bGUua2V5XSA9IG9SdWxlLmZvbGxvd3Nbb1J1bGUua2V5XSB8fCByZXNbb1J1bGUua2V5XTtcbiAgICAgICAgcmVzLl93ZWlnaHQgPSBBbnlPYmplY3QuYXNzaWduKHt9LCByZXMuX3dlaWdodCk7XG4gICAgICAgIHJlcy5fd2VpZ2h0W29SdWxlLmtleV0gPSBjO1xuICAgICAgICBPYmplY3QuZnJlZXplKHJlcyk7XG4gICAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZygnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbmV4cG9ydHMubWF0Y2hXb3JkID0gbWF0Y2hXb3JkO1xuZnVuY3Rpb24gZXh0cmFjdEFyZ3NNYXAobWF0Y2gsIGFyZ3NNYXApIHtcbiAgICB2YXIgcmVzID0ge307XG4gICAgaWYgKCFhcmdzTWFwKSB7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIE9iamVjdC5rZXlzKGFyZ3NNYXApLmZvckVhY2goZnVuY3Rpb24gKGlLZXkpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gbWF0Y2hbaUtleV07XG4gICAgICAgIHZhciBrZXkgPSBhcmdzTWFwW2lLZXldO1xuICAgICAgICBpZiAoKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikgJiYgdmFsdWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmVzW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmV4dHJhY3RBcmdzTWFwID0gZXh0cmFjdEFyZ3NNYXA7XG5leHBvcnRzLlJhbmtXb3JkID0ge1xuICAgIGhhc0Fib3ZlOiBmdW5jdGlvbiAobHN0LCBib3JkZXIpIHtcbiAgICAgICAgcmV0dXJuICFsc3QuZXZlcnkoZnVuY3Rpb24gKG9NZW1iZXIpIHtcbiAgICAgICAgICAgIHJldHVybiAob01lbWJlci5fcmFua2luZyA8IGJvcmRlcik7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgdGFrZUZpcnN0TjogZnVuY3Rpb24gKGxzdCwgbikge1xuICAgICAgICB2YXIgbGFzdFJhbmtpbmcgPSAxLjA7XG4gICAgICAgIHZhciBjbnRSYW5nZWQgPSAwO1xuICAgICAgICByZXR1cm4gbHN0LmZpbHRlcihmdW5jdGlvbiAob01lbWJlciwgaUluZGV4KSB7XG4gICAgICAgICAgICB2YXIgaXNSYW5nZWQgPSAhIShvTWVtYmVyW1wicnVsZVwiXSAmJiBvTWVtYmVyW1wicnVsZVwiXS5yYW5nZSk7XG4gICAgICAgICAgICBpZiAoaXNSYW5nZWQpIHtcbiAgICAgICAgICAgICAgICBjbnRSYW5nZWQgKz0gMTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgoKGlJbmRleCAtIGNudFJhbmdlZCkgPCBuKSB8fCAob01lbWJlci5fcmFua2luZyA9PT0gbGFzdFJhbmtpbmcpKSB7XG4gICAgICAgICAgICAgICAgbGFzdFJhbmtpbmcgPSBvTWVtYmVyLl9yYW5raW5nO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIHRha2VBYm92ZTogZnVuY3Rpb24gKGxzdCwgYm9yZGVyKSB7XG4gICAgICAgIHJldHVybiBsc3QuZmlsdGVyKGZ1bmN0aW9uIChvTWVtYmVyKSB7XG4gICAgICAgICAgICByZXR1cm4gKG9NZW1iZXIuX3JhbmtpbmcgPj0gYm9yZGVyKTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcbi8qXG52YXIgZXhhY3RMZW4gPSAwO1xudmFyIGZ1enp5TGVuID0gMDtcbnZhciBmdXp6eUNudCA9IDA7XG52YXIgZXhhY3RDbnQgPSAwO1xudmFyIHRvdGFsQ250ID0gMDtcbnZhciB0b3RhbExlbiA9IDA7XG52YXIgcmV0YWluZWRDbnQgPSAwO1xuXG5leHBvcnQgZnVuY3Rpb24gcmVzZXRDbnQoKSB7XG4gIGV4YWN0TGVuID0gMDtcbiAgZnV6enlMZW4gPSAwO1xuICBmdXp6eUNudCA9IDA7XG4gIGV4YWN0Q250ID0gMDtcbiAgdG90YWxDbnQgPSAwO1xuICB0b3RhbExlbiA9IDA7XG4gIHJldGFpbmVkQ250ID0gMDtcbn1cbiovXG5mdW5jdGlvbiBjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmKHNXb3JkR3JvdXAsIHNwbGl0UnVsZXMsIGNudFJlYykge1xuICAgIHZhciBzZWVuSXQgPSBjYXRlZ29yaXplU3RyaW5nMihzV29yZEdyb3VwLCB0cnVlLCBzcGxpdFJ1bGVzLCBjbnRSZWMpO1xuICAgIC8vdG90YWxDbnQgKz0gMTtcbiAgICAvLyBleGFjdExlbiArPSBzZWVuSXQubGVuZ3RoO1xuICAgIGFkZENudFJlYyhjbnRSZWMsICdjbnRDYXRFeGFjdCcsIDEpO1xuICAgIGFkZENudFJlYyhjbnRSZWMsICdjbnRDYXRFeGFjdFJlcycsIHNlZW5JdC5sZW5ndGgpO1xuICAgIGlmIChleHBvcnRzLlJhbmtXb3JkLmhhc0Fib3ZlKHNlZW5JdCwgMC44KSkge1xuICAgICAgICBpZiAoY250UmVjKSB7XG4gICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLCAnZXhhY3RQcmlvclRha2UnLCBzZWVuSXQubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgICAgICBzZWVuSXQgPSBleHBvcnRzLlJhbmtXb3JkLnRha2VBYm92ZShzZWVuSXQsIDAuOCk7XG4gICAgICAgIGlmIChjbnRSZWMpIHtcbiAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsICdleGFjdEFmdGVyVGFrZScsIHNlZW5JdC5sZW5ndGgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBzZWVuSXQgPSBjYXRlZ29yaXplU3RyaW5nMihzV29yZEdyb3VwLCBmYWxzZSwgc3BsaXRSdWxlcywgY250UmVjKTtcbiAgICAgICAgYWRkQ250UmVjKGNudFJlYywgJ2NudE5vbkV4YWN0JywgMSk7XG4gICAgICAgIGFkZENudFJlYyhjbnRSZWMsICdjbnROb25FeGFjdFJlcycsIHNlZW5JdC5sZW5ndGgpO1xuICAgIH1cbiAgICAvLyB0b3RhbExlbiArPSBzZWVuSXQubGVuZ3RoO1xuICAgIHNlZW5JdCA9IGV4cG9ydHMuUmFua1dvcmQudGFrZUZpcnN0TihzZWVuSXQsIEFsZ29sLlRvcF9OX1dvcmRDYXRlZ29yaXphdGlvbnMpO1xuICAgIC8vIHJldGFpbmVkQ250ICs9IHNlZW5JdC5sZW5ndGg7XG4gICAgcmV0dXJuIHNlZW5JdDtcbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZiA9IGNhdGVnb3JpemVXb3JkV2l0aFJhbmtDdXRvZmY7XG4vKiBpZiB3ZSBoYXZlIGEgIFwiUnVuIGxpa2UgdGhlIFdpbmRcIlxuICBhbiBhIHVzZXIgdHlwZSBmdW4gbGlrZSAgYSBSaW5kICwgYW5kIFJpbmQgaXMgYW4gZXhhY3QgbWF0Y2gsXG4gIHdlIHdpbGwgbm90IHN0YXJ0IGxvb2tpbmcgZm9yIHRoZSBsb25nIHNlbnRlbmNlXG5cbiAgdGhpcyBpcyB0byBiZSBmaXhlZCBieSBcInNwcmVhZGluZ1wiIHRoZSByYW5nZSBpbmRpY2F0aW9uIGFjY3Jvc3MgdmVyeSBzaW1pbGFyIHdvcmRzIGluIHRoZSB2aW5jaW5pdHkgb2YgdGhlXG4gIHRhcmdldCB3b3Jkc1xuKi9cbmZ1bmN0aW9uIGNhdGVnb3JpemVXb3JkV2l0aE9mZnNldFdpdGhSYW5rQ3V0b2ZmKHNXb3JkR3JvdXAsIHNwbGl0UnVsZXMsIGNudFJlYykge1xuICAgIHZhciBzV29yZEdyb3VwTEMgPSBzV29yZEdyb3VwLnRvTG93ZXJDYXNlKCk7XG4gICAgdmFyIHNlZW5JdCA9IGNhdGVnb3JpemVXb3JkSW50ZXJuYWxXaXRoT2Zmc2V0cyhzV29yZEdyb3VwLCBzV29yZEdyb3VwTEMsIHRydWUsIHNwbGl0UnVsZXMsIGNudFJlYyk7XG4gICAgLy9jb25zb2xlLmxvZyhcIlNFRU5JVFwiICsgSlNPTi5zdHJpbmdpZnkoc2Vlbkl0KSk7XG4gICAgLy90b3RhbENudCArPSAxO1xuICAgIC8vIGV4YWN0TGVuICs9IHNlZW5JdC5sZW5ndGg7XG4gICAgLy9jb25zb2xlLmxvZyhcImZpcnN0IHJ1biBleGFjdCBcIiArIEpTT04uc3RyaW5naWZ5KHNlZW5JdCkpO1xuICAgIGFkZENudFJlYyhjbnRSZWMsICdjbnRDYXRFeGFjdCcsIDEpO1xuICAgIGFkZENudFJlYyhjbnRSZWMsICdjbnRDYXRFeGFjdFJlcycsIHNlZW5JdC5sZW5ndGgpO1xuICAgIGlmIChleHBvcnRzLlJhbmtXb3JkLmhhc0Fib3ZlKHNlZW5JdCwgMC44KSkge1xuICAgICAgICBpZiAoY250UmVjKSB7XG4gICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLCAnZXhhY3RQcmlvclRha2UnLCBzZWVuSXQubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgICAgICBzZWVuSXQgPSBleHBvcnRzLlJhbmtXb3JkLnRha2VBYm92ZShzZWVuSXQsIDAuOCk7XG4gICAgICAgIGlmIChjbnRSZWMpIHtcbiAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsICdleGFjdEFmdGVyVGFrZScsIHNlZW5JdC5sZW5ndGgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBzZWVuSXQgPSBjYXRlZ29yaXplV29yZEludGVybmFsV2l0aE9mZnNldHMoc1dvcmRHcm91cCwgc1dvcmRHcm91cExDLCBmYWxzZSwgc3BsaXRSdWxlcywgY250UmVjKTtcbiAgICAgICAgYWRkQ250UmVjKGNudFJlYywgJ2NudE5vbkV4YWN0JywgMSk7XG4gICAgICAgIGFkZENudFJlYyhjbnRSZWMsICdjbnROb25FeGFjdFJlcycsIHNlZW5JdC5sZW5ndGgpO1xuICAgIH1cbiAgICAvLyB0b3RhbExlbiArPSBzZWVuSXQubGVuZ3RoO1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoc2Vlbkl0Lmxlbmd0aCArIFwiIHdpdGggXCIgKyBzZWVuSXQucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBvYmopIHsgcmV0dXJuIHByZXYgKyAob2JqLnJ1bGUucmFuZ2UgPyAxIDogMCk7IH0sIDApICsgXCIgcmFuZ2VkICFcIikgOiAnLScpO1xuICAgIC8vICB2YXIgY250UmFuZ2VkID0gc2Vlbkl0LnJlZHVjZSggKHByZXYsb2JqKSA9PiBwcmV2ICsgKG9iai5ydWxlLnJhbmdlID8gMSA6IDApLDApO1xuICAgIC8vICBjb25zb2xlLmxvZyhgKioqKioqKioqKiogJHtzZWVuSXQubGVuZ3RofSB3aXRoICR7Y250UmFuZ2VkfSByYW5nZWQgIWApO1xuICAgIHNlZW5JdCA9IGV4cG9ydHMuUmFua1dvcmQudGFrZUZpcnN0TihzZWVuSXQsIEFsZ29sLlRvcF9OX1dvcmRDYXRlZ29yaXphdGlvbnMpO1xuICAgIC8vIHJldGFpbmVkQ250ICs9IHNlZW5JdC5sZW5ndGg7XG4gICAgLy9jb25zb2xlLmxvZyhcImZpbmFsIHJlcyBvZiBjYXRlZ29yaXplV29yZFdpdGhPZmZzZXRXaXRoUmFua0N1dG9mZlwiICsgSlNPTi5zdHJpbmdpZnkoc2Vlbkl0KSk7XG4gICAgcmV0dXJuIHNlZW5JdDtcbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZVdvcmRXaXRoT2Zmc2V0V2l0aFJhbmtDdXRvZmYgPSBjYXRlZ29yaXplV29yZFdpdGhPZmZzZXRXaXRoUmFua0N1dG9mZjtcbmZ1bmN0aW9uIGNhdGVnb3JpemVXb3JkV2l0aE9mZnNldFdpdGhSYW5rQ3V0b2ZmU2luZ2xlKHdvcmQsIHJ1bGUpIHtcbiAgICB2YXIgbGN3b3JkID0gd29yZC50b0xvd2VyQ2FzZSgpO1xuICAgIGlmIChsY3dvcmQgPT09IHJ1bGUubG93ZXJjYXNld29yZCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3RyaW5nOiB3b3JkLFxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogcnVsZS5tYXRjaGVkU3RyaW5nLFxuICAgICAgICAgICAgY2F0ZWdvcnk6IHJ1bGUuY2F0ZWdvcnksXG4gICAgICAgICAgICBydWxlOiBydWxlLFxuICAgICAgICAgICAgX3Jhbmtpbmc6IHJ1bGUuX3JhbmtpbmcgfHwgMS4wXG4gICAgICAgIH07XG4gICAgfVxuICAgIHZhciByZXMgPSBbXTtcbiAgICBjaGVja09uZVJ1bGVXaXRoT2Zmc2V0KHdvcmQsIGxjd29yZCwgZmFsc2UsIHJlcywgcnVsZSk7XG4gICAgZGVidWdsb2coXCJjYXRXV09XUkNTIFwiICsgbGN3b3JkKTtcbiAgICBpZiAocmVzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gcmVzWzBdO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xufVxuZXhwb3J0cy5jYXRlZ29yaXplV29yZFdpdGhPZmZzZXRXaXRoUmFua0N1dG9mZlNpbmdsZSA9IGNhdGVnb3JpemVXb3JkV2l0aE9mZnNldFdpdGhSYW5rQ3V0b2ZmU2luZ2xlO1xuLypcbmV4cG9ydCBmdW5jdGlvbiBkdW1wQ250KCkge1xuICBjb25zb2xlLmxvZyhgXG5leGFjdExlbiA9ICR7ZXhhY3RMZW59O1xuZXhhY3RDbnQgPSAke2V4YWN0Q250fTtcbmZ1enp5TGVuID0gJHtmdXp6eUxlbn07XG5mdXp6eUNudCA9ICR7ZnV6enlDbnR9O1xudG90YWxDbnQgPSAke3RvdGFsQ250fTtcbnRvdGFsTGVuID0gJHt0b3RhbExlbn07XG5yZXRhaW5lZExlbiA9ICR7cmV0YWluZWRDbnR9O1xuICBgKTtcbn1cbiovXG4vKlxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZFNlbnRlbmNlKG9TZW50ZW5jZTogSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXVtdKTogYm9vbGVhbiB7XG4gIHJldHVybiBvU2VudGVuY2UuZXZlcnkoZnVuY3Rpb24gKG9Xb3JkR3JvdXApIHtcbiAgICByZXR1cm4gKG9Xb3JkR3JvdXAubGVuZ3RoID4gMCk7XG4gIH0pO1xufVxuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZChhcnI6IElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11bXVtdKTogSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXVtdW10ge1xuICByZXR1cm4gYXJyLmZpbHRlcihmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgcmV0dXJuIGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZFNlbnRlbmNlKG9TZW50ZW5jZSk7XG4gIH0pO1xufVxuKi9cbmZ1bmN0aW9uIGNhdGVnb3JpemVBV29yZChzV29yZEdyb3VwLCBydWxlcywgc2VudGVuY2UsIHdvcmRzLCBjbnRSZWMpIHtcbiAgICB2YXIgc2Vlbkl0ID0gd29yZHNbc1dvcmRHcm91cF07XG4gICAgaWYgKHNlZW5JdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHNlZW5JdCA9IGNhdGVnb3JpemVXb3JkV2l0aFJhbmtDdXRvZmYoc1dvcmRHcm91cCwgcnVsZXMsIGNudFJlYyk7XG4gICAgICAgIFV0aWxzLmRlZXBGcmVlemUoc2Vlbkl0KTtcbiAgICAgICAgd29yZHNbc1dvcmRHcm91cF0gPSBzZWVuSXQ7XG4gICAgfVxuICAgIGlmICghc2Vlbkl0IHx8IHNlZW5JdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgbG9nZ2VyKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgXFxcIlwiICsgc1dvcmRHcm91cCArIFwiXFxcIiBpbiBzZW50ZW5jZSBcXFwiXCJcbiAgICAgICAgICAgICsgc2VudGVuY2UgKyBcIlxcXCJcIik7XG4gICAgICAgIGlmIChzV29yZEdyb3VwLmluZGV4T2YoXCIgXCIpIDw9IDApIHtcbiAgICAgICAgICAgIGRlYnVnbG9nKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgcHJpbWl0aXZlICghKVwiICsgc1dvcmRHcm91cCk7XG4gICAgICAgIH1cbiAgICAgICAgZGVidWdsb2coXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBcIiArIHNXb3JkR3JvdXApO1xuICAgICAgICBpZiAoIXNlZW5JdCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0aW5nIGVtdHB5IGxpc3QsIG5vdCB1bmRlZmluZWQgZm9yIFxcXCJcIiArIHNXb3JkR3JvdXAgKyBcIlxcXCJcIik7XG4gICAgICAgIH1cbiAgICAgICAgd29yZHNbc1dvcmRHcm91cF0gPSBbXTtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICByZXR1cm4gVXRpbHMuY2xvbmVEZWVwKHNlZW5JdCk7XG59XG5leHBvcnRzLmNhdGVnb3JpemVBV29yZCA9IGNhdGVnb3JpemVBV29yZDtcbi8qKlxuICogR2l2ZW4gYSAgc3RyaW5nLCBicmVhayBpdCBkb3duIGludG8gY29tcG9uZW50cyxcbiAqIFtbJ0EnLCAnQiddLCBbJ0EgQiddXVxuICpcbiAqIHRoZW4gY2F0ZWdvcml6ZVdvcmRzXG4gKiByZXR1cm5pbmdcbiAqXG4gKiBbIFtbIHsgY2F0ZWdvcnk6ICdzeXN0ZW1JZCcsIHdvcmQgOiAnQSd9LFxuICogICAgICB7IGNhdGVnb3J5OiAnb3RoZXJ0aGluZycsIHdvcmQgOiAnQSd9XG4gKiAgICBdLFxuICogICAgLy8gcmVzdWx0IG9mIEJcbiAqICAgIFsgeyBjYXRlZ29yeTogJ3N5c3RlbUlkJywgd29yZCA6ICdCJ30sXG4gKiAgICAgIHsgY2F0ZWdvcnk6ICdvdGhlcnRoaW5nJywgd29yZCA6ICdBJ31cbiAqICAgICAgeyBjYXRlZ29yeTogJ2Fub3RoZXJ0cnlwJywgd29yZCA6ICdCJ31cbiAqICAgIF1cbiAqICAgXSxcbiAqIF1dXVxuICpcbiAqXG4gKlxuICovXG5mdW5jdGlvbiBhbmFseXplU3RyaW5nKHNTdHJpbmcsIHJ1bGVzLCB3b3Jkcykge1xuICAgIHZhciBjbnQgPSAwO1xuICAgIHZhciBmYWMgPSAxO1xuICAgIHZhciB1ID0gZmRldnN0YV9tb25tb3ZlXzEuQnJlYWtEb3duLmJyZWFrZG93blN0cmluZyhzU3RyaW5nLCBBbGdvbC5NYXhTcGFjZXNQZXJDb21iaW5lZFdvcmQpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiaGVyZSBicmVha2Rvd25cIiArIEpTT04uc3RyaW5naWZ5KHUpKTtcbiAgICB9XG4gICAgLy9jb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeSh1KSk7XG4gICAgd29yZHMgPSB3b3JkcyB8fCB7fTtcbiAgICBkZWJ1Z3BlcmYoJ3RoaXMgbWFueSBrbm93biB3b3JkczogJyArIE9iamVjdC5rZXlzKHdvcmRzKS5sZW5ndGgpO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICB2YXIgY250UmVjID0ge307XG4gICAgdS5mb3JFYWNoKGZ1bmN0aW9uIChhQnJlYWtEb3duU2VudGVuY2UpIHtcbiAgICAgICAgdmFyIGNhdGVnb3JpemVkU2VudGVuY2UgPSBbXTtcbiAgICAgICAgdmFyIGlzVmFsaWQgPSBhQnJlYWtEb3duU2VudGVuY2UuZXZlcnkoZnVuY3Rpb24gKHNXb3JkR3JvdXAsIGluZGV4KSB7XG4gICAgICAgICAgICB2YXIgc2Vlbkl0ID0gY2F0ZWdvcml6ZUFXb3JkKHNXb3JkR3JvdXAsIHJ1bGVzLCBzU3RyaW5nLCB3b3JkcywgY250UmVjKTtcbiAgICAgICAgICAgIGlmIChzZWVuSXQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0ZWdvcml6ZWRTZW50ZW5jZVtpbmRleF0gPSBzZWVuSXQ7XG4gICAgICAgICAgICBjbnQgPSBjbnQgKyBzZWVuSXQubGVuZ3RoO1xuICAgICAgICAgICAgZmFjID0gZmFjICogc2Vlbkl0Lmxlbmd0aDtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGlzVmFsaWQpIHtcbiAgICAgICAgICAgIHJlcy5wdXNoKGNhdGVnb3JpemVkU2VudGVuY2UpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgZGVidWdsb2coXCIgc2VudGVuY2VzIFwiICsgdS5sZW5ndGggKyBcIiBtYXRjaGVzIFwiICsgY250ICsgXCIgZmFjOiBcIiArIGZhYyk7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQgJiYgdS5sZW5ndGgpIHtcbiAgICAgICAgZGVidWdsb2coXCJmaXJzdCBtYXRjaCBcIiArIEpTT04uc3RyaW5naWZ5KHUsIHVuZGVmaW5lZCwgMikpO1xuICAgIH1cbiAgICBkZWJ1Z3BlcmYoXCIgc2VudGVuY2VzIFwiICsgdS5sZW5ndGggKyBcIiAvIFwiICsgcmVzLmxlbmd0aCArIFwiIG1hdGNoZXMgXCIgKyBjbnQgKyBcIiBmYWM6IFwiICsgZmFjICsgXCIgcmVjIDogXCIgKyBKU09OLnN0cmluZ2lmeShjbnRSZWMsIHVuZGVmaW5lZCwgMikpO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmFuYWx5emVTdHJpbmcgPSBhbmFseXplU3RyaW5nO1xuZnVuY3Rpb24gY2F0ZWdvcml6ZUFXb3JkV2l0aE9mZnNldHMoc1dvcmRHcm91cCwgcnVsZXMsIHNlbnRlbmNlLCB3b3JkcywgY250UmVjKSB7XG4gICAgdmFyIHNlZW5JdCA9IHdvcmRzW3NXb3JkR3JvdXBdO1xuICAgIGlmIChzZWVuSXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBzZWVuSXQgPSBjYXRlZ29yaXplV29yZFdpdGhPZmZzZXRXaXRoUmFua0N1dG9mZihzV29yZEdyb3VwLCBydWxlcywgY250UmVjKTtcbiAgICAgICAgVXRpbHMuZGVlcEZyZWV6ZShzZWVuSXQpO1xuICAgICAgICB3b3Jkc1tzV29yZEdyb3VwXSA9IHNlZW5JdDtcbiAgICB9XG4gICAgaWYgKCFzZWVuSXQgfHwgc2Vlbkl0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBsb2dnZXIoXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBcXFwiXCIgKyBzV29yZEdyb3VwICsgXCJcXFwiIGluIHNlbnRlbmNlIFxcXCJcIlxuICAgICAgICAgICAgKyBzZW50ZW5jZSArIFwiXFxcIlwiKTtcbiAgICAgICAgaWYgKHNXb3JkR3JvdXAuaW5kZXhPZihcIiBcIikgPD0gMCkge1xuICAgICAgICAgICAgZGVidWdsb2coXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBwcmltaXRpdmUgKCEpXCIgKyBzV29yZEdyb3VwKTtcbiAgICAgICAgfVxuICAgICAgICBkZWJ1Z2xvZyhcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIFwiICsgc1dvcmRHcm91cCk7XG4gICAgICAgIGlmICghc2Vlbkl0KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RpbmcgZW10cHkgbGlzdCwgbm90IHVuZGVmaW5lZCBmb3IgXFxcIlwiICsgc1dvcmRHcm91cCArIFwiXFxcIlwiKTtcbiAgICAgICAgfVxuICAgICAgICB3b3Jkc1tzV29yZEdyb3VwXSA9IFtdO1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHJldHVybiBVdGlscy5jbG9uZURlZXAoc2Vlbkl0KTtcbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZUFXb3JkV2l0aE9mZnNldHMgPSBjYXRlZ29yaXplQVdvcmRXaXRoT2Zmc2V0cztcbi8qXG5bIFthLGJdLCBbYyxkXV1cblxuMDAgYVxuMDEgYlxuMTAgY1xuMTEgZFxuMTIgY1xuKi9cbnZhciBjbG9uZSA9IFV0aWxzLmNsb25lRGVlcDtcbmZ1bmN0aW9uIGNvcHlWZWNNZW1iZXJzKHUpIHtcbiAgICB2YXIgaSA9IDA7XG4gICAgZm9yIChpID0gMDsgaSA8IHUubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdVtpXSA9IGNsb25lKHVbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gdTtcbn1cbi8vIHdlIGNhbiByZXBsaWNhdGUgdGhlIHRhaWwgb3IgdGhlIGhlYWQsXG4vLyB3ZSByZXBsaWNhdGUgdGhlIHRhaWwgYXMgaXQgaXMgc21hbGxlci5cbi8vIFthLGIsYyBdXG5mdW5jdGlvbiBleHBhbmRNYXRjaEFycihkZWVwKSB7XG4gICAgdmFyIGEgPSBbXTtcbiAgICB2YXIgbGluZSA9IFtdO1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyBKU09OLnN0cmluZ2lmeShkZWVwKSA6ICctJyk7XG4gICAgZGVlcC5mb3JFYWNoKGZ1bmN0aW9uICh1QnJlYWtEb3duTGluZSwgaUluZGV4KSB7XG4gICAgICAgIGxpbmVbaUluZGV4XSA9IFtdO1xuICAgICAgICB1QnJlYWtEb3duTGluZS5mb3JFYWNoKGZ1bmN0aW9uIChhV29yZEdyb3VwLCB3Z0luZGV4KSB7XG4gICAgICAgICAgICBsaW5lW2lJbmRleF1bd2dJbmRleF0gPSBbXTtcbiAgICAgICAgICAgIGFXb3JkR3JvdXAuZm9yRWFjaChmdW5jdGlvbiAob1dvcmRWYXJpYW50LCBpV1ZJbmRleCkge1xuICAgICAgICAgICAgICAgIGxpbmVbaUluZGV4XVt3Z0luZGV4XVtpV1ZJbmRleF0gPSBvV29yZFZhcmlhbnQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IEpTT04uc3RyaW5naWZ5KGxpbmUpIDogJy0nKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgdmFyIG52ZWNzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciB2ZWNzID0gW1tdXTtcbiAgICAgICAgdmFyIG52ZWNzID0gW107XG4gICAgICAgIHZhciBydmVjID0gW107XG4gICAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgbGluZVtpXS5sZW5ndGg7ICsraykge1xuICAgICAgICAgICAgLy92ZWNzIGlzIHRoZSB2ZWN0b3Igb2YgYWxsIHNvIGZhciBzZWVuIHZhcmlhbnRzIHVwIHRvIGsgd2dzLlxuICAgICAgICAgICAgdmFyIG5leHRCYXNlID0gW107XG4gICAgICAgICAgICBmb3IgKHZhciBsID0gMDsgbCA8IGxpbmVbaV1ba10ubGVuZ3RoOyArK2wpIHtcbiAgICAgICAgICAgICAgICAvL2RlYnVnbG9nKFwidmVjcyBub3dcIiArIEpTT04uc3RyaW5naWZ5KHZlY3MpKTtcbiAgICAgICAgICAgICAgICBudmVjcyA9IFtdOyAvL3ZlY3Muc2xpY2UoKTsgLy8gY29weSB0aGUgdmVjW2ldIGJhc2UgdmVjdG9yO1xuICAgICAgICAgICAgICAgIC8vZGVidWdsb2coXCJ2ZWNzIGNvcGllZCBub3dcIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgdSA9IDA7IHUgPCB2ZWNzLmxlbmd0aDsgKyt1KSB7XG4gICAgICAgICAgICAgICAgICAgIG52ZWNzW3VdID0gdmVjc1t1XS5zbGljZSgpOyAvL1xuICAgICAgICAgICAgICAgICAgICBudmVjc1t1XSA9IGNvcHlWZWNNZW1iZXJzKG52ZWNzW3VdKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gZGVidWdsb2coXCJjb3BpZWQgdmVjc1tcIisgdStcIl1cIiArIEpTT04uc3RyaW5naWZ5KHZlY3NbdV0pKTtcbiAgICAgICAgICAgICAgICAgICAgbnZlY3NbdV0ucHVzaChjbG9uZShsaW5lW2ldW2tdW2xdKSk7IC8vIHB1c2ggdGhlIGx0aCB2YXJpYW50XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vICAgZGVidWdsb2coXCIgYXQgICAgIFwiICsgayArIFwiOlwiICsgbCArIFwiIG5leHRiYXNlID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcbiAgICAgICAgICAgICAgICAvLyAgIGRlYnVnbG9nKFwiIGFwcGVuZCBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiBudmVjcyAgICA+XCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpXG4gICAgICAgICAgICAgICAgbmV4dEJhc2UgPSBuZXh0QmFzZS5jb25jYXQobnZlY3MpO1xuICAgICAgICAgICAgfSAvL2NvbnN0cnVcbiAgICAgICAgICAgIC8vICBkZWJ1Z2xvZyhcIm5vdyBhdCBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpXG4gICAgICAgICAgICB2ZWNzID0gbmV4dEJhc2U7XG4gICAgICAgIH1cbiAgICAgICAgZGVidWdsb2dWKGRlYnVnbG9nVi5lbmFibGVkID8gKFwiQVBQRU5ESU5HIFRPIFJFU1wiICsgaSArIFwiOlwiICsgbCArIFwiID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSkgOiAnLScpO1xuICAgICAgICByZXMgPSByZXMuY29uY2F0KHZlY3MpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5leHBhbmRNYXRjaEFyciA9IGV4cGFuZE1hdGNoQXJyO1xuLyoqXG4gKiBDYWxjdWxhdGUgYSB3ZWlnaHQgZmFjdG9yIGZvciBhIGdpdmVuIGRpc3RhbmNlIGFuZFxuICogY2F0ZWdvcnlcbiAqIEBwYXJhbSB7aW50ZWdlcn0gZGlzdCBkaXN0YW5jZSBpbiB3b3Jkc1xuICogQHBhcmFtIHtzdHJpbmd9IGNhdGVnb3J5IGNhdGVnb3J5IHRvIHVzZVxuICogQHJldHVybnMge251bWJlcn0gYSBkaXN0YW5jZSBmYWN0b3IgPj0gMVxuICogIDEuMCBmb3Igbm8gZWZmZWN0XG4gKi9cbmZ1bmN0aW9uIHJlaW5mb3JjZURpc3RXZWlnaHQoZGlzdCwgY2F0ZWdvcnkpIHtcbiAgICB2YXIgYWJzID0gTWF0aC5hYnMoZGlzdCk7XG4gICAgcmV0dXJuIDEuMCArIChBbGdvbC5hUmVpbmZvcmNlRGlzdFdlaWdodFthYnNdIHx8IDApO1xufVxuZXhwb3J0cy5yZWluZm9yY2VEaXN0V2VpZ2h0ID0gcmVpbmZvcmNlRGlzdFdlaWdodDtcbi8qKlxuICogR2l2ZW4gYSBzZW50ZW5jZSwgZXh0YWN0IGNhdGVnb3JpZXNcbiAqL1xuZnVuY3Rpb24gZXh0cmFjdENhdGVnb3J5TWFwKG9TZW50ZW5jZSkge1xuICAgIHZhciByZXMgPSB7fTtcbiAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKCdleHRyYWN0Q2F0ZWdvcnlNYXAgJyArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSkpIDogJy0nKTtcbiAgICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGlJbmRleCkge1xuICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IElGTWF0Y2guQ0FUX0NBVEVHT1JZKSB7XG4gICAgICAgICAgICByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10gfHwgW107XG4gICAgICAgICAgICByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10ucHVzaCh7IHBvczogaUluZGV4IH0pO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgVXRpbHMuZGVlcEZyZWV6ZShyZXMpO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmV4dHJhY3RDYXRlZ29yeU1hcCA9IGV4dHJhY3RDYXRlZ29yeU1hcDtcbmZ1bmN0aW9uIHJlaW5Gb3JjZVNlbnRlbmNlKG9TZW50ZW5jZSkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciBvQ2F0ZWdvcnlNYXAgPSBleHRyYWN0Q2F0ZWdvcnlNYXAob1NlbnRlbmNlKTtcbiAgICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGlJbmRleCkge1xuICAgICAgICB2YXIgbSA9IG9DYXRlZ29yeU1hcFtvV29yZC5jYXRlZ29yeV0gfHwgW107XG4gICAgICAgIG0uZm9yRWFjaChmdW5jdGlvbiAob1Bvc2l0aW9uKSB7XG4gICAgICAgICAgICBcInVzZSBzdHJpY3RcIjtcbiAgICAgICAgICAgIG9Xb3JkLnJlaW5mb3JjZSA9IG9Xb3JkLnJlaW5mb3JjZSB8fCAxO1xuICAgICAgICAgICAgdmFyIGJvb3N0ID0gcmVpbmZvcmNlRGlzdFdlaWdodChpSW5kZXggLSBvUG9zaXRpb24ucG9zLCBvV29yZC5jYXRlZ29yeSk7XG4gICAgICAgICAgICBvV29yZC5yZWluZm9yY2UgKj0gYm9vc3Q7XG4gICAgICAgICAgICBvV29yZC5fcmFua2luZyAqPSBib29zdDtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpSW5kZXgpIHtcbiAgICAgICAgaWYgKGlJbmRleCA+IDApIHtcbiAgICAgICAgICAgIGlmIChvU2VudGVuY2VbaUluZGV4IC0gMV0uY2F0ZWdvcnkgPT09IFwibWV0YVwiICYmIChvV29yZC5jYXRlZ29yeSA9PT0gb1NlbnRlbmNlW2lJbmRleCAtIDFdLm1hdGNoZWRTdHJpbmcpKSB7XG4gICAgICAgICAgICAgICAgb1dvcmQucmVpbmZvcmNlID0gb1dvcmQucmVpbmZvcmNlIHx8IDE7XG4gICAgICAgICAgICAgICAgdmFyIGJvb3N0ID0gcmVpbmZvcmNlRGlzdFdlaWdodCgxLCBvV29yZC5jYXRlZ29yeSk7XG4gICAgICAgICAgICAgICAgb1dvcmQucmVpbmZvcmNlICo9IGJvb3N0O1xuICAgICAgICAgICAgICAgIG9Xb3JkLl9yYW5raW5nICo9IGJvb3N0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG9TZW50ZW5jZTtcbn1cbmV4cG9ydHMucmVpbkZvcmNlU2VudGVuY2UgPSByZWluRm9yY2VTZW50ZW5jZTtcbnZhciBTZW50ZW5jZSA9IHJlcXVpcmUoXCIuL3NlbnRlbmNlXCIpO1xuZnVuY3Rpb24gcmVpbkZvcmNlKGFDYXRlZ29yaXplZEFycmF5KSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgYUNhdGVnb3JpemVkQXJyYXkuZm9yRWFjaChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgIHJlaW5Gb3JjZVNlbnRlbmNlKG9TZW50ZW5jZSk7XG4gICAgfSk7XG4gICAgYUNhdGVnb3JpemVkQXJyYXkuc29ydChTZW50ZW5jZS5jbXBSYW5raW5nUHJvZHVjdCk7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCJhZnRlciByZWluZm9yY2VcIiArIGFDYXRlZ29yaXplZEFycmF5Lm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICAgICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgfVxuICAgIHJldHVybiBhQ2F0ZWdvcml6ZWRBcnJheTtcbn1cbmV4cG9ydHMucmVpbkZvcmNlID0gcmVpbkZvcmNlO1xuLy8vIGJlbG93IG1heSBubyBsb25nZXIgYmUgdXNlZFxuZnVuY3Rpb24gbWF0Y2hSZWdFeHAob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAoY29udGV4dFtvUnVsZS5rZXldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIHNLZXkgPSBvUnVsZS5rZXk7XG4gICAgdmFyIHMxID0gY29udGV4dFtvUnVsZS5rZXldLnRvTG93ZXJDYXNlKCk7XG4gICAgdmFyIHJlZyA9IG9SdWxlLnJlZ2V4cDtcbiAgICB2YXIgbSA9IHJlZy5leGVjKHMxKTtcbiAgICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2dWKFwiYXBwbHlpbmcgcmVnZXhwOiBcIiArIHMxICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XG4gICAgfVxuICAgIGlmICghbSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB2YXIgZGVsdGEgPSBjb21wYXJlQ29udGV4dChjb250ZXh0LCBvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpO1xuICAgIGlmIChkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZ1YoSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcbiAgICAgICAgZGVidWdsb2dWKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBvRXh0cmFjdGVkQ29udGV4dCA9IGV4dHJhY3RBcmdzTWFwKG0sIG9SdWxlLmFyZ3NNYXApO1xuICAgIGlmIChkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZ1YoXCJleHRyYWN0ZWQgYXJncyBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLmFyZ3NNYXApKTtcbiAgICAgICAgZGVidWdsb2dWKFwibWF0Y2ggXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XG4gICAgICAgIGRlYnVnbG9nVihcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob0V4dHJhY3RlZENvbnRleHQpKTtcbiAgICB9XG4gICAgdmFyIHJlcyA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpO1xuICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvRXh0cmFjdGVkQ29udGV4dCk7XG4gICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIGNvbnRleHQpO1xuICAgIGlmIChvRXh0cmFjdGVkQ29udGV4dFtzS2V5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlc1tzS2V5XSA9IG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xuICAgICAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb1J1bGUuZm9sbG93cyk7XG4gICAgICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvRXh0cmFjdGVkQ29udGV4dCk7XG4gICAgfVxuICAgIE9iamVjdC5mcmVlemUocmVzKTtcbiAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKSA6ICctJyk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMubWF0Y2hSZWdFeHAgPSBtYXRjaFJlZ0V4cDtcbmZ1bmN0aW9uIHNvcnRCeVdlaWdodChzS2V5LCBvQ29udGV4dEEsIG9Db250ZXh0Qikge1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nVignc29ydGluZzogJyArIHNLZXkgKyAnaW52b2tlZCB3aXRoXFxuIDE6JyArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QSwgdW5kZWZpbmVkLCAyKSArXG4gICAgICAgICAgICBcIiB2cyBcXG4gMjpcIiArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QiwgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHZhciByYW5raW5nQSA9IHBhcnNlRmxvYXQob0NvbnRleHRBW1wiX3JhbmtpbmdcIl0gfHwgXCIxXCIpO1xuICAgIHZhciByYW5raW5nQiA9IHBhcnNlRmxvYXQob0NvbnRleHRCW1wiX3JhbmtpbmdcIl0gfHwgXCIxXCIpO1xuICAgIGlmIChyYW5raW5nQSAhPT0gcmFua2luZ0IpIHtcbiAgICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgICAgIGRlYnVnbG9nKFwiIHJhbmtpbiBkZWx0YVwiICsgMTAwICogKHJhbmtpbmdCIC0gcmFua2luZ0EpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMTAwICogKHJhbmtpbmdCIC0gcmFua2luZ0EpO1xuICAgIH1cbiAgICB2YXIgd2VpZ2h0QSA9IG9Db250ZXh0QVtcIl93ZWlnaHRcIl0gJiYgb0NvbnRleHRBW1wiX3dlaWdodFwiXVtzS2V5XSB8fCAwO1xuICAgIHZhciB3ZWlnaHRCID0gb0NvbnRleHRCW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdW3NLZXldIHx8IDA7XG4gICAgcmV0dXJuICsod2VpZ2h0QiAtIHdlaWdodEEpO1xufVxuZXhwb3J0cy5zb3J0QnlXZWlnaHQgPSBzb3J0QnlXZWlnaHQ7XG4vLyBXb3JkLCBTeW5vbnltLCBSZWdleHAgLyBFeHRyYWN0aW9uUnVsZVxuZnVuY3Rpb24gYXVnbWVudENvbnRleHQxKGNvbnRleHQsIG9SdWxlcywgb3B0aW9ucykge1xuICAgIHZhciBzS2V5ID0gb1J1bGVzWzBdLmtleTtcbiAgICAvLyBjaGVjayB0aGF0IHJ1bGVcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAvLyBjaGVjayBjb25zaXN0ZW5jeVxuICAgICAgICBvUnVsZXMuZXZlcnkoZnVuY3Rpb24gKGlSdWxlKSB7XG4gICAgICAgICAgICBpZiAoaVJ1bGUua2V5ICE9PSBzS2V5KSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW5ob21vZ2Vub3VzIGtleXMgaW4gcnVsZXMsIGV4cGVjdGVkIFwiICsgc0tleSArIFwiIHdhcyBcIiArIEpTT04uc3RyaW5naWZ5KGlSdWxlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIC8vIGxvb2sgZm9yIHJ1bGVzIHdoaWNoIG1hdGNoXG4gICAgdmFyIHJlcyA9IG9SdWxlcy5tYXAoZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgIC8vIGlzIHRoaXMgcnVsZSBhcHBsaWNhYmxlXG4gICAgICAgIHN3aXRjaCAob1J1bGUudHlwZSkge1xuICAgICAgICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5XT1JEOlxuICAgICAgICAgICAgICAgIHJldHVybiBtYXRjaFdvcmQob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5SRUdFWFA6XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hdGNoUmVnRXhwKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0pLmZpbHRlcihmdW5jdGlvbiAob3Jlcykge1xuICAgICAgICByZXR1cm4gISFvcmVzO1xuICAgIH0pLnNvcnQoc29ydEJ5V2VpZ2h0LmJpbmQodGhpcywgc0tleSkpO1xuICAgIC8vZGVidWdsb2coXCJoYXNzb3J0ZWRcIiArIEpTT04uc3RyaW5naWZ5KHJlcyx1bmRlZmluZWQsMikpO1xuICAgIHJldHVybiByZXM7XG4gICAgLy8gT2JqZWN0LmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgLy8gfSk7XG59XG5leHBvcnRzLmF1Z21lbnRDb250ZXh0MSA9IGF1Z21lbnRDb250ZXh0MTtcbmZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0KGNvbnRleHQsIGFSdWxlcykge1xuICAgIHZhciBvcHRpb25zMSA9IHtcbiAgICAgICAgbWF0Y2hvdGhlcnM6IHRydWUsXG4gICAgICAgIG92ZXJyaWRlOiBmYWxzZVxuICAgIH07XG4gICAgdmFyIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMSk7XG4gICAgaWYgKGFSZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHZhciBvcHRpb25zMiA9IHtcbiAgICAgICAgICAgIG1hdGNob3RoZXJzOiBmYWxzZSxcbiAgICAgICAgICAgIG92ZXJyaWRlOiB0cnVlXG4gICAgICAgIH07XG4gICAgICAgIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMik7XG4gICAgfVxuICAgIHJldHVybiBhUmVzO1xufVxuZXhwb3J0cy5hdWdtZW50Q29udGV4dCA9IGF1Z21lbnRDb250ZXh0O1xuZnVuY3Rpb24gaW5zZXJ0T3JkZXJlZChyZXN1bHQsIGlJbnNlcnRlZE1lbWJlciwgbGltaXQpIHtcbiAgICAvLyBUT0RPOiB1c2Ugc29tZSB3ZWlnaHRcbiAgICBpZiAocmVzdWx0Lmxlbmd0aCA8IGxpbWl0KSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKGlJbnNlcnRlZE1lbWJlcik7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5leHBvcnRzLmluc2VydE9yZGVyZWQgPSBpbnNlcnRPcmRlcmVkO1xuZnVuY3Rpb24gdGFrZVRvcE4oYXJyKSB7XG4gICAgdmFyIHUgPSBhcnIuZmlsdGVyKGZ1bmN0aW9uIChpbm5lckFycikgeyByZXR1cm4gaW5uZXJBcnIubGVuZ3RoID4gMDsgfSk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIC8vIHNoaWZ0IG91dCB0aGUgdG9wIG9uZXNcbiAgICB1ID0gdS5tYXAoZnVuY3Rpb24gKGlBcnIpIHtcbiAgICAgICAgdmFyIHRvcCA9IGlBcnIuc2hpZnQoKTtcbiAgICAgICAgcmVzID0gaW5zZXJ0T3JkZXJlZChyZXMsIHRvcCwgNSk7XG4gICAgICAgIHJldHVybiBpQXJyO1xuICAgIH0pLmZpbHRlcihmdW5jdGlvbiAoaW5uZXJBcnIpIHsgcmV0dXJuIGlubmVyQXJyLmxlbmd0aCA+IDA7IH0pO1xuICAgIC8vIGFzIEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMudGFrZVRvcE4gPSB0YWtlVG9wTjtcbnZhciBpbnB1dEZpbHRlclJ1bGVzID0gcmVxdWlyZShcIi4vaW5wdXRGaWx0ZXJSdWxlc1wiKTtcbnZhciBybTtcbmZ1bmN0aW9uIGdldFJNT25jZSgpIHtcbiAgICBpZiAoIXJtKSB7XG4gICAgICAgIHJtID0gaW5wdXRGaWx0ZXJSdWxlcy5nZXRSdWxlTWFwKCk7XG4gICAgfVxuICAgIHJldHVybiBybTtcbn1cbmZ1bmN0aW9uIGFwcGx5UnVsZXMoY29udGV4dCkge1xuICAgIHZhciBiZXN0TiA9IFtjb250ZXh0XTtcbiAgICBpbnB1dEZpbHRlclJ1bGVzLm9LZXlPcmRlci5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgICAgIHZhciBiZXN0TmV4dCA9IFtdO1xuICAgICAgICBiZXN0Ti5mb3JFYWNoKGZ1bmN0aW9uIChvQ29udGV4dCkge1xuICAgICAgICAgICAgaWYgKG9Db250ZXh0W3NLZXldKSB7XG4gICAgICAgICAgICAgICAgZGVidWdsb2coJyoqIGFwcGx5aW5nIHJ1bGVzIGZvciAnICsgc0tleSk7XG4gICAgICAgICAgICAgICAgdmFyIHJlcyA9IGF1Z21lbnRDb250ZXh0KG9Db250ZXh0LCBnZXRSTU9uY2UoKVtzS2V5XSB8fCBbXSk7XG4gICAgICAgICAgICAgICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/ICgnKiogcmVzdWx0IGZvciAnICsgc0tleSArICcgPSAnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKSA6ICctJyk7XG4gICAgICAgICAgICAgICAgYmVzdE5leHQucHVzaChyZXMgfHwgW10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gcnVsZSBub3QgcmVsZXZhbnRcbiAgICAgICAgICAgICAgICBiZXN0TmV4dC5wdXNoKFtvQ29udGV4dF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgYmVzdE4gPSB0YWtlVG9wTihiZXN0TmV4dCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGJlc3ROO1xufVxuZXhwb3J0cy5hcHBseVJ1bGVzID0gYXBwbHlSdWxlcztcbmZ1bmN0aW9uIGFwcGx5UnVsZXNQaWNrRmlyc3QoY29udGV4dCkge1xuICAgIHZhciByID0gYXBwbHlSdWxlcyhjb250ZXh0KTtcbiAgICByZXR1cm4gciAmJiByWzBdO1xufVxuZXhwb3J0cy5hcHBseVJ1bGVzUGlja0ZpcnN0ID0gYXBwbHlSdWxlc1BpY2tGaXJzdDtcbi8qKlxuICogRGVjaWRlIHdoZXRoZXIgdG8gcmVxdWVyeSBmb3IgYSBjb250ZXRcbiAqL1xuLy9leHBvcnQgZnVuY3Rpb24gZGVjaWRlT25SZVF1ZXJ5KGNvbnRleHQ6IElGTWF0Y2guY29udGV4dCk6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xuLy8gIHJldHVybiBbXVxuLy99XG4iLCIvKipcclxuICogdGhlIGlucHV0IGZpbHRlciBzdGFnZSBwcmVwcm9jZXNzZXMgYSBjdXJyZW50IGNvbnRleHRcclxuICpcclxuICogSXQgYSkgY29tYmluZXMgbXVsdGktc2VnbWVudCBhcmd1bWVudHMgaW50byBvbmUgY29udGV4dCBtZW1iZXJzXHJcbiAqIEl0IGIpIGF0dGVtcHRzIHRvIGF1Z21lbnQgdGhlIGNvbnRleHQgYnkgYWRkaXRpb25hbCBxdWFsaWZpY2F0aW9uc1xyXG4gKiAgICAgICAgICAgKE1pZCB0ZXJtIGdlbmVyYXRpbmcgQWx0ZXJuYXRpdmVzLCBlLmcuXHJcbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiB1bml0IHRlc3Q/XHJcbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiBzb3VyY2UgP1xyXG4gKiAgICAgICAgICAgKVxyXG4gKiAgU2ltcGxlIHJ1bGVzIGxpa2UgIEludGVudFxyXG4gKlxyXG4gKlxyXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5pbnB1dEZpbHRlclxyXG4gKiBAZmlsZSBpbnB1dEZpbHRlci50c1xyXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXHJcbiAqL1xyXG4vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9saWIvbm9kZS00LmQudHNcIiAvPlxyXG5pbXBvcnQgKiBhcyBkaXN0YW5jZSBmcm9tICdhYm90X3N0cmluZ2Rpc3QnO1xyXG5cclxuaW1wb3J0ICogYXMgTG9nZ2VyIGZyb20gJy4uL3V0aWxzL2xvZ2dlcidcclxuXHJcbmNvbnN0IGxvZ2dlciA9IExvZ2dlci5sb2dnZXIoJ2lucHV0RmlsdGVyJyk7XHJcblxyXG5pbXBvcnQgKiBhcyBkZWJ1ZyBmcm9tICdkZWJ1Zyc7XHJcbnZhciBkZWJ1Z3BlcmYgPSBkZWJ1ZygncGVyZicpO1xyXG5cclxuaW1wb3J0ICogYXMgVXRpbHMgZnJvbSAnYWJvdF91dGlscyc7XHJcblxyXG5cclxuaW1wb3J0ICogYXMgQWxnb2wgZnJvbSAnLi9hbGdvbCc7XHJcblxyXG5pbXBvcnQgKiBhcyBJTWF0Y2ggZnJvbSAnLi9pZm1hdGNoJztcclxuXHJcbmltcG9ydCB7IEJyZWFrRG93biBhcyBicmVha2Rvd259IGZyb20gJ2ZkZXZzdGFfbW9ubW92ZSc7XHJcblxyXG5jb25zdCBBbnlPYmplY3QgPSA8YW55Pk9iamVjdDtcclxuXHJcbnZhciBkZWJ1Z2xvZyA9IGRlYnVnKCdpbnB1dEZpbHRlcicpXHJcbnZhciBkZWJ1Z2xvZ1YgPSBkZWJ1ZygnaW5wdXRWRmlsdGVyJylcclxudmFyIGRlYnVnbG9nTSA9IGRlYnVnKCdpbnB1dE1GaWx0ZXInKVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG1vY2tEZWJ1ZyhvKSB7XHJcbiAgZGVidWdsb2cgPSBvO1xyXG4gIGRlYnVnbG9nViA9IG87XHJcbiAgZGVidWdsb2dNID0gbztcclxufVxyXG5cclxuXHJcbmltcG9ydCAqIGFzIG1hdGNoZGF0YSBmcm9tICcuL21hdGNoZGF0YSc7XHJcbnZhciBvVW5pdFRlc3RzID0gbWF0Y2hkYXRhLm9Vbml0VGVzdHNcclxuXHJcblxyXG5cclxuLyoqXHJcbiAqIEBwYXJhbSBzVGV4dCB7c3RyaW5nfSB0aGUgdGV4dCB0byBtYXRjaCB0byBOYXZUYXJnZXRSZXNvbHV0aW9uXHJcbiAqIEBwYXJhbSBzVGV4dDIge3N0cmluZ30gdGhlIHF1ZXJ5IHRleHQsIGUuZy4gTmF2VGFyZ2V0XHJcbiAqXHJcbiAqIEByZXR1cm4gdGhlIGRpc3RhbmNlLCBub3RlIHRoYXQgaXMgaXMgKm5vdCogc3ltbWV0cmljIVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNEaXN0YW5jZShzVGV4dDE6IHN0cmluZywgc1RleHQyOiBzdHJpbmcpOiBudW1iZXIge1xyXG4gIHJldHVybiBkaXN0YW5jZS5jYWxjRGlzdGFuY2VBZGp1c3RlZChzVGV4dDEsc1RleHQyKTtcclxufVxyXG5cclxuXHJcblxyXG4vKipcclxuICogQHBhcmFtIHNUZXh0IHtzdHJpbmd9IHRoZSB0ZXh0IHRvIG1hdGNoIHRvIE5hdlRhcmdldFJlc29sdXRpb25cclxuICogQHBhcmFtIHNUZXh0MiB7c3RyaW5nfSB0aGUgcXVlcnkgdGV4dCwgZS5nLiBOYXZUYXJnZXRcclxuICpcclxuICogQHJldHVybiB0aGUgZGlzdGFuY2UsIG5vdGUgdGhhdCBpcyBpcyAqbm90KiBzeW1tZXRyaWMhXHJcbiAqL1xyXG4vKlxyXG5leHBvcnQgZnVuY3Rpb24gY2FsY0Rpc3RhbmNlTGV2ZW5YWFgoc1RleHQxOiBzdHJpbmcsIHNUZXh0Mjogc3RyaW5nKTogbnVtYmVyIHtcclxuICAvLyBjb25zb2xlLmxvZyhcImxlbmd0aDJcIiArIHNUZXh0MSArIFwiIC0gXCIgKyBzVGV4dDIpXHJcbiAgIGlmKCgoc1RleHQxLmxlbmd0aCAtIHNUZXh0Mi5sZW5ndGgpID4gQWxnb2wuY2FsY0Rpc3QubGVuZ3RoRGVsdGExKVxyXG4gICAgfHwgKHNUZXh0Mi5sZW5ndGggPiAxLjUgKiBzVGV4dDEubGVuZ3RoIClcclxuICAgIHx8IChzVGV4dDIubGVuZ3RoIDwgKHNUZXh0MS5sZW5ndGgvMikpICkge1xyXG4gICAgcmV0dXJuIDUwMDAwO1xyXG4gIH1cclxuICB2YXIgYTAgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEuc3Vic3RyaW5nKDAsIHNUZXh0Mi5sZW5ndGgpLCBzVGV4dDIpXHJcbiAgaWYoZGVidWdsb2dWLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nVihcImRpc3RhbmNlXCIgKyBhMCArIFwic3RyaXBwZWQ+XCIgKyBzVGV4dDEuc3Vic3RyaW5nKDAsc1RleHQyLmxlbmd0aCkgKyBcIjw+XCIgKyBzVGV4dDIrIFwiPFwiKTtcclxuICB9XHJcbiAgaWYoYTAgKiA1MCA+IDE1ICogc1RleHQyLmxlbmd0aCkge1xyXG4gICAgICByZXR1cm4gNDAwMDA7XHJcbiAgfVxyXG4gIHZhciBhID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLCBzVGV4dDIpXHJcbiAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGFcclxufVxyXG4qL1xyXG5cclxuXHJcblxyXG5pbXBvcnQgKiBhcyBJRk1hdGNoIGZyb20gJy4uL21hdGNoL2lmbWF0Y2gnO1xyXG5cclxudHlwZSBJUnVsZSA9IElGTWF0Y2guSVJ1bGVcclxuXHJcblxyXG5pbnRlcmZhY2UgSU1hdGNoT3B0aW9ucyB7XHJcbiAgbWF0Y2hvdGhlcnM/OiBib29sZWFuLFxyXG4gIGF1Z21lbnQ/OiBib29sZWFuLFxyXG4gIG92ZXJyaWRlPzogYm9vbGVhblxyXG59XHJcblxyXG5pbnRlcmZhY2UgSU1hdGNoQ291bnQge1xyXG4gIGVxdWFsOiBudW1iZXJcclxuICBkaWZmZXJlbnQ6IG51bWJlclxyXG4gIHNwdXJpb3VzUjogbnVtYmVyXHJcbiAgc3B1cmlvdXNMOiBudW1iZXJcclxufVxyXG5cclxudHlwZSBFbnVtUnVsZVR5cGUgPSBJRk1hdGNoLkVudW1SdWxlVHlwZVxyXG5cclxuLy9jb25zdCBsZXZlbkN1dG9mZiA9IEFsZ29sLkN1dG9mZl9MZXZlblNodGVpbjtcclxuXHJcbi8qXHJcbmV4cG9ydCBmdW5jdGlvbiBsZXZlblBlbmFsdHlPbGQoaTogbnVtYmVyKTogbnVtYmVyIHtcclxuICAvLyAwLT4gMVxyXG4gIC8vIDEgLT4gMC4xXHJcbiAgLy8gMTUwIC0+ICAwLjhcclxuICBpZiAoaSA9PT0gMCkge1xyXG4gICAgcmV0dXJuIDE7XHJcbiAgfVxyXG4gIC8vIHJldmVyc2UgbWF5IGJlIGJldHRlciB0aGFuIGxpbmVhclxyXG4gIHJldHVybiAxICsgaSAqICgwLjggLSAxKSAvIDE1MFxyXG59XHJcbiovXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbGV2ZW5QZW5hbHR5KGk6IG51bWJlcik6IG51bWJlciB7XHJcbiAgLy8gMSAtPiAxXHJcbiAgLy8gY3V0T2ZmID0+IDAuOFxyXG4gIHJldHVybiBpO1xyXG4gIC8vcmV0dXJuICAgMSAtICAoMSAtIGkpICowLjIvQWxnb2wuQ3V0b2ZmX1dvcmRNYXRjaDtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIG5vblByaXZhdGVLZXlzKG9BKSB7XHJcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG9BKS5maWx0ZXIoa2V5ID0+IHtcclxuICAgIHJldHVybiBrZXlbMF0gIT09ICdfJztcclxuICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNvdW50QWluQihvQSwgb0IsIGZuQ29tcGFyZSwgYUtleUlnbm9yZT8pOiBudW1iZXIge1xyXG4gIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gYUtleUlnbm9yZSA6XHJcbiAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xyXG4gIGZuQ29tcGFyZSA9IGZuQ29tcGFyZSB8fCBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9XHJcbiAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xyXG4gICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcclxuICB9KS5cclxuICAgIHJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XHJcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIChmbkNvbXBhcmUob0Fba2V5XSwgb0Jba2V5XSwga2V5KSA/IDEgOiAwKVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBwcmV2XHJcbiAgICB9LCAwKVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc3B1cmlvdXNBbm90SW5CKG9BLCBvQiwgYUtleUlnbm9yZT8pIHtcclxuICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxyXG4gICAgdHlwZW9mIGFLZXlJZ25vcmUgPT09IFwic3RyaW5nXCIgPyBbYUtleUlnbm9yZV0gOiBbXTtcclxuICByZXR1cm4gbm9uUHJpdmF0ZUtleXMob0EpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xyXG4gIH0pLlxyXG4gICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIDFcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldlxyXG4gICAgfSwgMClcclxufVxyXG5cclxuZnVuY3Rpb24gbG93ZXJDYXNlKG8pIHtcclxuICBpZiAodHlwZW9mIG8gPT09IFwic3RyaW5nXCIpIHtcclxuICAgIHJldHVybiBvLnRvTG93ZXJDYXNlKClcclxuICB9XHJcbiAgcmV0dXJuIG9cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmVDb250ZXh0KG9BLCBvQiwgYUtleUlnbm9yZT8pIHtcclxuICB2YXIgZXF1YWwgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpID09PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xyXG4gIHZhciBkaWZmZXJlbnQgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpICE9PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xyXG4gIHZhciBzcHVyaW91c0wgPSBzcHVyaW91c0Fub3RJbkIob0EsIG9CLCBhS2V5SWdub3JlKVxyXG4gIHZhciBzcHVyaW91c1IgPSBzcHVyaW91c0Fub3RJbkIob0IsIG9BLCBhS2V5SWdub3JlKVxyXG4gIHJldHVybiB7XHJcbiAgICBlcXVhbDogZXF1YWwsXHJcbiAgICBkaWZmZXJlbnQ6IGRpZmZlcmVudCxcclxuICAgIHNwdXJpb3VzTDogc3B1cmlvdXNMLFxyXG4gICAgc3B1cmlvdXNSOiBzcHVyaW91c1JcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNvcnRCeVJhbmsoYTogSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmcsIGI6IElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nKTogbnVtYmVyIHtcclxuICB2YXIgciA9IC0oKGEuX3JhbmtpbmcgfHwgMS4wKSAtIChiLl9yYW5raW5nIHx8IDEuMCkpO1xyXG4gIGlmIChyKSB7XHJcbiAgICByZXR1cm4gcjtcclxuICB9XHJcbiAgaWYgKGEuY2F0ZWdvcnkgJiYgYi5jYXRlZ29yeSkge1xyXG4gICAgciA9IGEuY2F0ZWdvcnkubG9jYWxlQ29tcGFyZShiLmNhdGVnb3J5KTtcclxuICAgIGlmIChyKSB7XHJcbiAgICAgIHJldHVybiByO1xyXG4gICAgfVxyXG4gIH1cclxuICBpZiAoYS5tYXRjaGVkU3RyaW5nICYmIGIubWF0Y2hlZFN0cmluZykge1xyXG4gICAgciA9IGEubWF0Y2hlZFN0cmluZy5sb2NhbGVDb21wYXJlKGIubWF0Y2hlZFN0cmluZyk7XHJcbiAgICBpZiAocikge1xyXG4gICAgICByZXR1cm4gcjtcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIDA7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tPbmVSdWxlKHN0cmluZzogc3RyaW5nLCBsY1N0cmluZyA6IHN0cmluZywgZXhhY3QgOiBib29sZWFuLFxyXG5yZXMgOiBBcnJheTxJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPixcclxub1J1bGUgOiBJTWF0Y2gubVJ1bGUsIGNudFJlYz8gOiBJQ250UmVjICkge1xyXG4gICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcclxuICAgICAgZGVidWdsb2dWKCdhdHRlbXB0aW5nIHRvIG1hdGNoIHJ1bGUgJyArIEpTT04uc3RyaW5naWZ5KG9SdWxlKSArIFwiIHRvIHN0cmluZyBcXFwiXCIgKyBzdHJpbmcgKyBcIlxcXCJcIik7XHJcbiAgICB9XHJcbiAgICBzd2l0Y2ggKG9SdWxlLnR5cGUpIHtcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5XT1JEOlxyXG4gICAgICAgIGlmKCFvUnVsZS5sb3dlcmNhc2V3b3JkKSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3J1bGUgd2l0aG91dCBhIGxvd2VyY2FzZSB2YXJpYW50JyArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKTtcclxuICAgICAgICAgfTtcclxuICAgICAgICBpZiAoZXhhY3QgJiYgb1J1bGUud29yZCA9PT0gc3RyaW5nIHx8IG9SdWxlLmxvd2VyY2FzZXdvcmQgPT09IGxjU3RyaW5nKSB7XHJcbiAgICAgICAgICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAgICAgICAgIGRlYnVnbG9nKFwiXFxuIW1hdGNoZWQgZXhhY3QgXCIgKyBzdHJpbmcgKyBcIj1cIiAgKyBvUnVsZS5sb3dlcmNhc2V3b3JkICArIFwiID0+IFwiICsgb1J1bGUubWF0Y2hlZFN0cmluZyArIFwiL1wiICsgb1J1bGUuY2F0ZWdvcnkpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmVzLnB1c2goe1xyXG4gICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcclxuICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxyXG4gICAgICAgICAgICBfcmFua2luZzogb1J1bGUuX3JhbmtpbmcgfHwgMS4wXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIWV4YWN0ICYmICFvUnVsZS5leGFjdE9ubHkpIHtcclxuICAgICAgICAgIHZhciBsZXZlbm1hdGNoID0gY2FsY0Rpc3RhbmNlKG9SdWxlLmxvd2VyY2FzZXdvcmQsIGxjU3RyaW5nKTtcclxuXHJcbi8qXHJcbiAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlXCIsIDEpO1xyXG4gICAgICAgICAgaWYobGV2ZW5tYXRjaCA8IDUwKSB7XHJcbiAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VFeHBcIiwgMSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZihsZXZlbm1hdGNoIDwgNDAwMDApIHtcclxuICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYyxcImNhbGNEaXN0YW5jZUJlbG93NDBrXCIsIDEpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgKi9cclxuICAgICAgICAgIC8vaWYob1J1bGUubG93ZXJjYXNld29yZCA9PT0gXCJjb3Ntb3NcIikge1xyXG4gICAgICAgICAgLy8gIGNvbnNvbGUubG9nKFwiaGVyZSByYW5raW5nIFwiICsgbGV2ZW5tYXRjaCArIFwiIFwiICsgb1J1bGUubG93ZXJjYXNld29yZCArIFwiIFwiICsgbGNTdHJpbmcpO1xyXG4gICAgICAgICAgLy99XHJcbiAgICAgICAgICBpZiAobGV2ZW5tYXRjaCA+PSBBbGdvbC5DdXRvZmZfV29yZE1hdGNoKSB7IC8vIGxldmVuQ3V0b2ZmKSB7XHJcbiAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VPa1wiLCAxKTtcclxuICAgICAgICAgICAgdmFyIHJlYyA9IHtcclxuICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcclxuICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBvUnVsZS5tYXRjaGVkU3RyaW5nLFxyXG4gICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgICBfcmFua2luZzogKG9SdWxlLl9yYW5raW5nIHx8IDEuMCkgKiBsZXZlblBlbmFsdHkobGV2ZW5tYXRjaCksXHJcbiAgICAgICAgICAgICAgbGV2ZW5tYXRjaDogbGV2ZW5tYXRjaFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBpZihkZWJ1Z2xvZykge1xyXG4gICAgICAgICAgICAgIGRlYnVnbG9nKFwiXFxuIWZ1enp5IFwiICsgKGxldmVubWF0Y2gpLnRvRml4ZWQoMykgKyBcIiBcIiArIHJlYy5fcmFua2luZy50b0ZpeGVkKDMpICsgXCIgIFwiICsgc3RyaW5nICsgXCI9XCIgICsgb1J1bGUubG93ZXJjYXNld29yZCAgKyBcIiA9PiBcIiArIG9SdWxlLm1hdGNoZWRTdHJpbmcgKyBcIi9cIiArIG9SdWxlLmNhdGVnb3J5KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXMucHVzaChyZWMpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5SRUdFWFA6IHtcclxuICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoXCIgaGVyZSByZWdleHBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKSlcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIG0gPSBvUnVsZS5yZWdleHAuZXhlYyhzdHJpbmcpXHJcbiAgICAgICAgaWYgKG0pIHtcclxuICAgICAgICAgIHJlcy5wdXNoKHtcclxuICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IChvUnVsZS5tYXRjaEluZGV4ICE9PSB1bmRlZmluZWQgJiYgbVtvUnVsZS5tYXRjaEluZGV4XSkgfHwgc3RyaW5nLFxyXG4gICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXHJcbiAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidW5rbm93biB0eXBlXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSlcclxuICAgIH1cclxufVxyXG5cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tPbmVSdWxlV2l0aE9mZnNldChzdHJpbmc6IHN0cmluZywgbGNTdHJpbmcgOiBzdHJpbmcsIGV4YWN0IDogYm9vbGVhbixcclxucmVzIDogQXJyYXk8SU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1JhbmdlZD4sXHJcbm9SdWxlIDogSU1hdGNoLm1SdWxlLCBjbnRSZWM/IDogSUNudFJlYyApIHtcclxuICAgaWYgKGRlYnVnbG9nVi5lbmFibGVkKSB7XHJcbiAgICAgIGRlYnVnbG9nVignYXR0ZW1wdGluZyB0byBtYXRjaCBydWxlICcgKyBKU09OLnN0cmluZ2lmeShvUnVsZSkgKyBcIiB0byBzdHJpbmcgXFxcIlwiICsgc3RyaW5nICsgXCJcXFwiXCIpO1xyXG4gICAgfVxyXG4gICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuV09SRDpcclxuICAgICAgICBpZighb1J1bGUubG93ZXJjYXNld29yZCkge1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdydWxlIHdpdGhvdXQgYSBsb3dlcmNhc2UgdmFyaWFudCcgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSk7XHJcbiAgICAgICAgIH07XHJcbiAgICAgICAgaWYgKGV4YWN0ICYmIChvUnVsZS53b3JkID09PSBzdHJpbmcgfHwgb1J1bGUubG93ZXJjYXNld29yZCA9PT0gbGNTdHJpbmcpKSB7XHJcbiAgICAgICAgICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAgICAgICAgIGRlYnVnbG9nKFwiXFxuIW1hdGNoZWQgZXhhY3QgXCIgKyBzdHJpbmcgKyBcIj1cIiAgKyBvUnVsZS5sb3dlcmNhc2V3b3JkICArIFwiID0+IFwiICsgb1J1bGUubWF0Y2hlZFN0cmluZyArIFwiL1wiICsgb1J1bGUuY2F0ZWdvcnkpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmVzLnB1c2goe1xyXG4gICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcclxuICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxyXG4gICAgICAgICAgICBydWxlOiBvUnVsZSxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCFleGFjdCAmJiAhb1J1bGUuZXhhY3RPbmx5KSB7XHJcbiAgICAgICAgICB2YXIgbGV2ZW5tYXRjaCA9IGNhbGNEaXN0YW5jZShvUnVsZS5sb3dlcmNhc2V3b3JkLCBsY1N0cmluZyk7XHJcblxyXG4vKlxyXG4gICAgICAgICAgYWRkQ250UmVjKGNudFJlYyxcImNhbGNEaXN0YW5jZVwiLCAxKTtcclxuICAgICAgICAgIGlmKGxldmVubWF0Y2ggPCA1MCkge1xyXG4gICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlRXhwXCIsIDEpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYobGV2ZW5tYXRjaCA8IDQwMDAwKSB7XHJcbiAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VCZWxvdzQwa1wiLCAxKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgICovXHJcbiAgICAgICAgICAvL2lmKG9SdWxlLmxvd2VyY2FzZXdvcmQgPT09IFwiY29zbW9zXCIpIHtcclxuICAgICAgICAgIC8vICBjb25zb2xlLmxvZyhcImhlcmUgcmFua2luZyBcIiArIGxldmVubWF0Y2ggKyBcIiBcIiArIG9SdWxlLmxvd2VyY2FzZXdvcmQgKyBcIiBcIiArIGxjU3RyaW5nKTtcclxuICAgICAgICAgIC8vfVxyXG4gICAgICAgICAgaWYgKGxldmVubWF0Y2ggPj0gQWxnb2wuQ3V0b2ZmX1dvcmRNYXRjaCkgeyAvLyBsZXZlbkN1dG9mZikge1xyXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiZm91bmQgcmVjXCIpO1xyXG4gICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlT2tcIiwgMSk7XHJcbiAgICAgICAgICAgIHZhciByZWMgPSB7XHJcbiAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgICAgICAgICAgICAgcnVsZSA6IG9SdWxlLFxyXG4gICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXHJcbiAgICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxyXG4gICAgICAgICAgICAgIF9yYW5raW5nOiAob1J1bGUuX3JhbmtpbmcgfHwgMS4wKSAqIGxldmVuUGVuYWx0eShsZXZlbm1hdGNoKSxcclxuICAgICAgICAgICAgICBsZXZlbm1hdGNoOiBsZXZlbm1hdGNoXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGlmKGRlYnVnbG9nKSB7XHJcbiAgICAgICAgICAgICAgZGVidWdsb2coXCJcXG4hQ09STzogZnV6enkgXCIgKyAobGV2ZW5tYXRjaCkudG9GaXhlZCgzKSArIFwiIFwiICsgcmVjLl9yYW5raW5nLnRvRml4ZWQoMykgKyBcIiAgXFxcIlwiICsgc3RyaW5nICsgXCJcXFwiPVwiICArIG9SdWxlLmxvd2VyY2FzZXdvcmQgICsgXCIgPT4gXCIgKyBvUnVsZS5tYXRjaGVkU3RyaW5nICsgXCIvXCIgKyBvUnVsZS5jYXRlZ29yeSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmVzLnB1c2gocmVjKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuUkVHRVhQOiB7XHJcbiAgICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KFwiIGhlcmUgcmVnZXhwXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSkpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBtID0gb1J1bGUucmVnZXhwLmV4ZWMoc3RyaW5nKVxyXG4gICAgICAgIGlmIChtKSB7XHJcbiAgICAgICAgICByZXMucHVzaCh7XHJcbiAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxyXG4gICAgICAgICAgICBydWxlOiBvUnVsZSxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogKG9SdWxlLm1hdGNoSW5kZXggIT09IHVuZGVmaW5lZCAmJiBtW29SdWxlLm1hdGNoSW5kZXhdKSB8fCBzdHJpbmcsXHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmtub3duIHR5cGVcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKVxyXG4gICAgfVxyXG59XHJcblxyXG5cclxuXHJcblxyXG5pbnRlcmZhY2UgSUNudFJlYyB7XHJcblxyXG59O1xyXG5cclxuZnVuY3Rpb24gYWRkQ250UmVjKGNudFJlYyA6IElDbnRSZWMsIG1lbWJlciA6IHN0cmluZywgbnVtYmVyIDogbnVtYmVyKSB7XHJcbiAgaWYoKCFjbnRSZWMpIHx8IChudW1iZXIgPT09IDApKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIGNudFJlY1ttZW1iZXJdID0gKGNudFJlY1ttZW1iZXJdIHx8IDApICsgbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVN0cmluZyh3b3JkOiBzdHJpbmcsIGV4YWN0OiBib29sZWFuLCBvUnVsZXM6IEFycmF5PElNYXRjaC5tUnVsZT4sXHJcbiBjbnRSZWM/IDogSUNudFJlYyk6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiB7XHJcbiAgLy8gc2ltcGx5IGFwcGx5IGFsbCBydWxlc1xyXG4gIGlmKGRlYnVnbG9nTS5lbmFibGVkICkgIHtcclxuICAgIGRlYnVnbG9nTShcInJ1bGVzIDogXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZXMsIHVuZGVmaW5lZCwgMikpO1xyXG4gIH1cclxuICB2YXIgbGNTdHJpbmcgPSB3b3JkLnRvTG93ZXJDYXNlKCk7XHJcbiAgdmFyIHJlczogQXJyYXk8SU1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4gPSBbXVxyXG4gIG9SdWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChvUnVsZSkge1xyXG4gICAgY2hlY2tPbmVSdWxlKHdvcmQsbGNTdHJpbmcsZXhhY3QscmVzLG9SdWxlLGNudFJlYyk7XHJcbiAgfSk7XHJcbiAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVNpbmdsZVdvcmRXaXRoT2Zmc2V0KHdvcmQ6IHN0cmluZywgbGN3b3JkIDogc3RyaW5nLCBleGFjdDogYm9vbGVhbiwgb1J1bGVzOiBBcnJheTxJTWF0Y2gubVJ1bGU+LFxyXG4gY250UmVjPyA6IElDbnRSZWMpOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1JhbmdlZD4ge1xyXG4gIC8vIHNpbXBseSBhcHBseSBhbGwgcnVsZXNcclxuICBpZihkZWJ1Z2xvZ00uZW5hYmxlZCApICB7XHJcbiAgICBkZWJ1Z2xvZ00oXCJydWxlcyA6IFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGVzLCB1bmRlZmluZWQsIDIpKTtcclxuICB9XHJcbiAgdmFyIHJlczogQXJyYXk8SU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1JhbmdlZD4gPSBbXVxyXG4gIG9SdWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChvUnVsZSkge1xyXG4gICAgY2hlY2tPbmVSdWxlV2l0aE9mZnNldCh3b3JkLGxjd29yZCxleGFjdCxyZXMsb1J1bGUsY250UmVjKTtcclxuICB9KTtcclxuICBkZWJ1Z2xvZyhgQ1NXV086IGdvdCByZXN1bHRzIGZvciAke2xjd29yZH0gICR7cmVzLmxlbmd0aH1gKTtcclxuICByZXMuc29ydChzb3J0QnlSYW5rKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHBvc3RGaWx0ZXIocmVzIDogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+KSA6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiB7XHJcbiAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XHJcbiAgdmFyIGJlc3RSYW5rID0gMDtcclxuICAvL2NvbnNvbGUubG9nKFwiXFxucGlsdGVyZWQgXCIgKyBKU09OLnN0cmluZ2lmeShyZXMpKTtcclxuICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZyhcInByZUZpbHRlciA6IFxcblwiICsgcmVzLm1hcChmdW5jdGlvbih3b3JkLGluZGV4KSB7XHJcbiAgICAgIHJldHVybiBgJHtpbmRleH0gJHt3b3JkLl9yYW5raW5nfSAgPT4gXCIke3dvcmQuY2F0ZWdvcnl9XCIgJHt3b3JkLm1hdGNoZWRTdHJpbmd9YDtcclxuICAgIH0pLmpvaW4oXCJcXG5cIikpO1xyXG4gIH1cclxuICB2YXIgciA9IHJlcy5maWx0ZXIoZnVuY3Rpb24ocmVzeCxpbmRleCkge1xyXG4gICAgaWYoaW5kZXggPT09IDApIHtcclxuICAgICAgYmVzdFJhbmsgPSByZXN4Ll9yYW5raW5nO1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICAgIC8vIDEtMC45ID0gMC4xXHJcbiAgICAvLyAxLSAwLjkzID0gMC43XHJcbiAgICAvLyAxLzdcclxuICAgIHZhciBkZWx0YSA9IGJlc3RSYW5rIC8gcmVzeC5fcmFua2luZztcclxuICAgIGlmKChyZXN4Lm1hdGNoZWRTdHJpbmcgPT09IHJlc1tpbmRleC0xXS5tYXRjaGVkU3RyaW5nKVxyXG4gICAgICAmJiAocmVzeC5jYXRlZ29yeSA9PT0gcmVzW2luZGV4LTFdLmNhdGVnb3J5KSkge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICAvL2NvbnNvbGUubG9nKFwiXFxuIGRlbHRhIGZvciBcIiArIGRlbHRhICsgXCIgIFwiICsgcmVzeC5fcmFua2luZyk7XHJcbiAgICBpZiAocmVzeC5sZXZlbm1hdGNoICYmIChkZWx0YSA+IDEuMDMpKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH0pO1xyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgICAgZGVidWdsb2coYFxcbmZpbHRlcmVkICR7ci5sZW5ndGh9LyR7cmVzLmxlbmd0aH1gICsgSlNPTi5zdHJpbmdpZnkocikpO1xyXG4gIH1cclxuICByZXR1cm4gcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHBvc3RGaWx0ZXJXaXRoT2Zmc2V0KHJlcyA6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nUmFuZ2VkPikgOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1JhbmdlZD4ge1xyXG4gIHJlcy5zb3J0KHNvcnRCeVJhbmspO1xyXG4gIHZhciBiZXN0UmFuayA9IDA7XHJcbiAgLy9jb25zb2xlLmxvZyhcIlxcbnBpbHRlcmVkIFwiICsgSlNPTi5zdHJpbmdpZnkocmVzKSk7XHJcbiAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgZGVidWdsb2coXCIgcHJlRmlsdGVyIDogXFxuXCIgKyByZXMubWFwKGZ1bmN0aW9uKHdvcmQpIHtcclxuICAgICAgcmV0dXJuIGAgJHt3b3JkLl9yYW5raW5nfSAgPT4gXCIke3dvcmQuY2F0ZWdvcnl9XCIgJHt3b3JkLm1hdGNoZWRTdHJpbmd9IGA7XHJcbiAgICB9KS5qb2luKFwiXFxuXCIpKTtcclxuICB9XHJcbiAgdmFyIHIgPSByZXMuZmlsdGVyKGZ1bmN0aW9uKHJlc3gsaW5kZXgpIHtcclxuICAgIGlmKGluZGV4ID09PSAwKSB7XHJcbiAgICAgIGJlc3RSYW5rID0gcmVzeC5fcmFua2luZztcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICAvLyAxLTAuOSA9IDAuMVxyXG4gICAgLy8gMS0gMC45MyA9IDAuN1xyXG4gICAgLy8gMS83XHJcbiAgICB2YXIgZGVsdGEgPSBiZXN0UmFuayAvIHJlc3guX3Jhbmtpbmc7XHJcbiAgICBpZihcclxuICAgICAgICAhKHJlc3gucnVsZSAmJiByZXN4LnJ1bGUucmFuZ2UpXHJcbiAgICAgJiYgIShyZXNbaW5kZXgtMV0ucnVsZSAmJiByZXNbaW5kZXgtMV0ucnVsZS5yYW5nZSlcclxuICAgICAmJiAocmVzeC5tYXRjaGVkU3RyaW5nID09PSByZXNbaW5kZXgtMV0ubWF0Y2hlZFN0cmluZylcclxuICAgICAmJiAocmVzeC5jYXRlZ29yeSA9PT0gcmVzW2luZGV4LTFdLmNhdGVnb3J5KSkge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICAvL2NvbnNvbGUubG9nKFwiXFxuIGRlbHRhIGZvciBcIiArIGRlbHRhICsgXCIgIFwiICsgcmVzeC5fcmFua2luZyk7XHJcbiAgICBpZiAocmVzeC5sZXZlbm1hdGNoICYmIChkZWx0YSA+IDEuMDMpKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH0pO1xyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgICAgZGVidWdsb2coYFxcbmZpbHRlcmVkICR7ci5sZW5ndGh9LyR7cmVzLmxlbmd0aH1gICsgSlNPTi5zdHJpbmdpZnkocikpO1xyXG4gIH1cclxuICByZXR1cm4gcjtcclxufVxyXG5cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVN0cmluZzIod29yZDogc3RyaW5nLCBleGFjdDogYm9vbGVhbiwgIHJ1bGVzIDogSU1hdGNoLlNwbGl0UnVsZXNcclxuICAsIGNudFJlYz8gOklDbnRSZWMpOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4ge1xyXG4gIC8vIHNpbXBseSBhcHBseSBhbGwgcnVsZXNcclxuICBpZiAoZGVidWdsb2dNLmVuYWJsZWQgKSAge1xyXG4gICAgZGVidWdsb2dNKFwicnVsZXMgOiBcIiArIEpTT04uc3RyaW5naWZ5KHJ1bGVzLHVuZGVmaW5lZCwgMikpO1xyXG4gIH1cclxuICB2YXIgbGNTdHJpbmcgPSB3b3JkLnRvTG93ZXJDYXNlKCk7XHJcbiAgdmFyIHJlczogQXJyYXk8SU1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4gPSBbXTtcclxuICBpZiAoZXhhY3QpIHtcclxuICAgIHZhciByID0gcnVsZXMud29yZE1hcFtsY1N0cmluZ107XHJcbiAgICBpZiAocikge1xyXG4gICAgICByLnJ1bGVzLmZvckVhY2goZnVuY3Rpb24ob1J1bGUpIHtcclxuICAgICAgICByZXMucHVzaCh7XHJcbiAgICAgICAgICAgIHN0cmluZzogd29yZCxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcclxuICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxyXG4gICAgICAgICAgICBfcmFua2luZzogb1J1bGUuX3JhbmtpbmcgfHwgMS4wXHJcbiAgICAgICAgICB9KVxyXG4gICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcnVsZXMubm9uV29yZFJ1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XHJcbiAgICAgIGNoZWNrT25lUnVsZSh3b3JkLGxjU3RyaW5nLGV4YWN0LHJlcyxvUnVsZSxjbnRSZWMpO1xyXG4gICAgfSk7XHJcbiAgICByZXMuc29ydChzb3J0QnlSYW5rKTtcclxuICAgIHJldHVybiByZXM7XHJcbiAgfSBlbHNlIHtcclxuICAgIGRlYnVnbG9nKFwiY2F0ZWdvcml6ZSBub24gZXhhY3RcIiArIHdvcmQgKyBcIiB4eCAgXCIgKyBydWxlcy5hbGxSdWxlcy5sZW5ndGgpO1xyXG4gICAgcmV0dXJuIHBvc3RGaWx0ZXIoY2F0ZWdvcml6ZVN0cmluZyh3b3JkLCBleGFjdCwgcnVsZXMuYWxsUnVsZXMsIGNudFJlYykpO1xyXG4gIH1cclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjYXRlZ29yaXplV29yZEludGVybmFsV2l0aE9mZnNldHMod29yZDogc3RyaW5nLCBsY3dvcmQgOiBzdHJpbmcsIGV4YWN0OiBib29sZWFuLCAgcnVsZXMgOiBJTWF0Y2guU3BsaXRSdWxlc1xyXG4gICwgY250UmVjPyA6SUNudFJlYyk6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nUmFuZ2VkPiB7XHJcblxyXG4gIGRlYnVnbG9nTShcImNhdGVnb3JpemUgXCIgKyBsY3dvcmQgKyBcIiB3aXRoIG9mZnNldCEhISEhISEhISEhISEhISEhXCIgKyBleGFjdClcclxuICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXHJcbiAgaWYgKGRlYnVnbG9nTS5lbmFibGVkICkgIHtcclxuICAgIGRlYnVnbG9nTShcInJ1bGVzIDogXCIgKyBKU09OLnN0cmluZ2lmeShydWxlcyx1bmRlZmluZWQsIDIpKTtcclxuICB9XHJcbiAgdmFyIHJlczogQXJyYXk8SU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1JhbmdlZD4gPSBbXTtcclxuICBpZiAoZXhhY3QpIHtcclxuICAgIHZhciByID0gcnVsZXMud29yZE1hcFtsY3dvcmRdO1xyXG4gICAgaWYgKHIpIHtcclxuICAgICAgZGVidWdsb2dNKGAgLi4uLnB1c2hpbmcgbiBydWxlcyBleGFjdCBmb3IgJHtsY3dvcmR9OmAgKyByLnJ1bGVzLmxlbmd0aCk7XHJcbiAgICAgIGRlYnVnbG9nTShyLnJ1bGVzLm1hcCgocixpbmRleCk9PiAnJyArIGluZGV4ICsgJyAnICsgSlNPTi5zdHJpbmdpZnkocikpLmpvaW4oXCJcXG5cIikpO1xyXG4gICAgICByLnJ1bGVzLmZvckVhY2goZnVuY3Rpb24ob1J1bGUpIHtcclxuICAgICAgICByZXMucHVzaCh7XHJcbiAgICAgICAgICAgIHN0cmluZzogd29yZCxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcclxuICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxyXG4gICAgICAgICAgICBydWxlOiBvUnVsZSxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxyXG4gICAgICAgICAgfSlcclxuICAgICB9KTtcclxuICAgIH1cclxuICAgIHJ1bGVzLm5vbldvcmRSdWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChvUnVsZSkge1xyXG4gICAgICBjaGVja09uZVJ1bGVXaXRoT2Zmc2V0KHdvcmQsbGN3b3JkLCBleGFjdCxyZXMsb1J1bGUsY250UmVjKTtcclxuICAgIH0pO1xyXG4gICAgcmVzID0gcG9zdEZpbHRlcldpdGhPZmZzZXQocmVzKTtcclxuICAgIGRlYnVnbG9nKFwiaGVyZSByZXN1bHRzIGZvclwiICsgd29yZCArIFwiIHJlcyBcIiArIHJlcy5sZW5ndGgpO1xyXG4gICAgZGVidWdsb2dNKFwiaGVyZSByZXN1bHRzIGZvclwiICsgd29yZCArIFwiIHJlcyBcIiArIHJlcy5sZW5ndGgpO1xyXG4gICAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XHJcbiAgICByZXR1cm4gcmVzO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBkZWJ1Z2xvZyhcImNhdGVnb3JpemUgbm9uIGV4YWN0XCIgKyB3b3JkICsgXCIgeHggIFwiICsgcnVsZXMuYWxsUnVsZXMubGVuZ3RoKTtcclxuICAgIHZhciByciA9IGNhdGVnb3JpemVTaW5nbGVXb3JkV2l0aE9mZnNldCh3b3JkLGxjd29yZCwgZXhhY3QsIHJ1bGVzLmFsbFJ1bGVzLCBjbnRSZWMpO1xyXG4gICAgLy9kZWJ1bG9nTShcImZ1enp5IHJlcyBcIiArIEpTT04uc3RyaW5naWZ5KHJyKSk7XHJcbiAgICByZXR1cm4gcG9zdEZpbHRlcldpdGhPZmZzZXQocnIpO1xyXG4gIH1cclxufVxyXG5cclxuXHJcblxyXG4vKipcclxuICpcclxuICogT3B0aW9ucyBtYXkgYmUge1xyXG4gKiBtYXRjaG90aGVycyA6IHRydWUsICA9PiBvbmx5IHJ1bGVzIHdoZXJlIGFsbCBvdGhlcnMgbWF0Y2ggYXJlIGNvbnNpZGVyZWRcclxuICogYXVnbWVudCA6IHRydWUsXHJcbiAqIG92ZXJyaWRlIDogdHJ1ZSB9ICA9PlxyXG4gKlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoV29yZChvUnVsZTogSVJ1bGUsIGNvbnRleHQ6IElGTWF0Y2guY29udGV4dCwgb3B0aW9ucz86IElNYXRjaE9wdGlvbnMpIHtcclxuICBpZiAoY29udGV4dFtvUnVsZS5rZXldID09PSB1bmRlZmluZWQpIHtcclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgfVxyXG4gIHZhciBzMSA9IGNvbnRleHRbb1J1bGUua2V5XS50b0xvd2VyQ2FzZSgpXHJcbiAgdmFyIHMyID0gb1J1bGUud29yZC50b0xvd2VyQ2FzZSgpO1xyXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XHJcbiAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCwgb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KVxyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlbHRhKSk7XHJcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XHJcbiAgfVxyXG4gIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gIH1cclxuICB2YXIgYzogbnVtYmVyID0gY2FsY0Rpc3RhbmNlKHMyLCBzMSk7XHJcbiAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgZGVidWdsb2coXCIgczEgPD4gczIgXCIgKyBzMSArIFwiPD5cIiArIHMyICsgXCIgID0+OiBcIiArIGMpO1xyXG4gIH1cclxuICBpZiAoYyA+IDAuODApIHtcclxuICAgIHZhciByZXMgPSBBbnlPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKSBhcyBhbnk7XHJcbiAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgY29udGV4dCk7XHJcbiAgICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xyXG4gICAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb1J1bGUuZm9sbG93cyk7XHJcbiAgICB9XHJcbiAgICAvLyBmb3JjZSBrZXkgcHJvcGVydHlcclxuICAgIC8vIGNvbnNvbGUubG9nKCcgb2JqZWN0Y2F0ZWdvcnknLCByZXNbJ3N5c3RlbU9iamVjdENhdGVnb3J5J10pO1xyXG4gICAgcmVzW29SdWxlLmtleV0gPSBvUnVsZS5mb2xsb3dzW29SdWxlLmtleV0gfHwgcmVzW29SdWxlLmtleV07XHJcbiAgICByZXMuX3dlaWdodCA9IEFueU9iamVjdC5hc3NpZ24oe30sIHJlcy5fd2VpZ2h0KTtcclxuICAgIHJlcy5fd2VpZ2h0W29SdWxlLmtleV0gPSBjO1xyXG4gICAgT2JqZWN0LmZyZWV6ZShyZXMpO1xyXG4gICAgaWYgKCBkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAgIGRlYnVnbG9nKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcclxuICAgIH1cclxuICAgIHJldHVybiByZXM7XHJcbiAgfVxyXG4gIHJldHVybiB1bmRlZmluZWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0QXJnc01hcChtYXRjaDogQXJyYXk8c3RyaW5nPiwgYXJnc01hcDogeyBba2V5OiBudW1iZXJdOiBzdHJpbmcgfSk6IElGTWF0Y2guY29udGV4dCB7XHJcbiAgdmFyIHJlcyA9IHt9IGFzIElGTWF0Y2guY29udGV4dDtcclxuICBpZiAoIWFyZ3NNYXApIHtcclxuICAgIHJldHVybiByZXM7XHJcbiAgfVxyXG4gIE9iamVjdC5rZXlzKGFyZ3NNYXApLmZvckVhY2goZnVuY3Rpb24gKGlLZXkpIHtcclxuICAgIHZhciB2YWx1ZSA9IG1hdGNoW2lLZXldXHJcbiAgICB2YXIga2V5ID0gYXJnc01hcFtpS2V5XTtcclxuICAgIGlmICgodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKSAmJiB2YWx1ZS5sZW5ndGggPiAwKSB7XHJcbiAgICAgIHJlc1trZXldID0gdmFsdWVcclxuICAgIH1cclxuICB9XHJcbiAgKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgUmFua1dvcmQgPSB7XHJcbiAgaGFzQWJvdmU6IGZ1bmN0aW9uIChsc3Q6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiwgYm9yZGVyOiBudW1iZXIpOiBib29sZWFuIHtcclxuICAgIHJldHVybiAhbHN0LmV2ZXJ5KGZ1bmN0aW9uIChvTWVtYmVyKSB7XHJcbiAgICAgIHJldHVybiAob01lbWJlci5fcmFua2luZyA8IGJvcmRlcik7XHJcbiAgICB9KTtcclxuICB9LFxyXG5cclxuICB0YWtlRmlyc3ROOiBmdW5jdGlvbjxUIGV4dGVuZHMgSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IChsc3Q6IEFycmF5PFQ+LCBuOiBudW1iZXIpOiBBcnJheTxUPiB7XHJcbiAgICB2YXIgbGFzdFJhbmtpbmcgPSAxLjA7XHJcbiAgICB2YXIgY250UmFuZ2VkID0gMDtcclxuICAgIHJldHVybiBsc3QuZmlsdGVyKGZ1bmN0aW9uIChvTWVtYmVyLCBpSW5kZXgpIHtcclxuICAgIHZhciBpc1JhbmdlZCA9ICEhKG9NZW1iZXJbXCJydWxlXCJdICYmIG9NZW1iZXJbXCJydWxlXCJdLnJhbmdlKTtcclxuICAgIGlmKGlzUmFuZ2VkKSB7XHJcbiAgICAgIGNudFJhbmdlZCArPSAxO1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICAgIGlmICgoKGlJbmRleCAtIGNudFJhbmdlZCkgPCBuKSB8fCAob01lbWJlci5fcmFua2luZyA9PT0gbGFzdFJhbmtpbmcpKSAge1xyXG4gICAgICAgIGxhc3RSYW5raW5nID0gb01lbWJlci5fcmFua2luZztcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9KTtcclxuICB9LFxyXG4gIHRha2VBYm92ZSA6IGZ1bmN0aW9uPFQgZXh0ZW5kcyBJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4gKGxzdDogQXJyYXk8VD4sIGJvcmRlcjogbnVtYmVyKTogQXJyYXk8VD4ge1xyXG4gICAgcmV0dXJuIGxzdC5maWx0ZXIoZnVuY3Rpb24gKG9NZW1iZXIpIHtcclxuICAgICAgcmV0dXJuIChvTWVtYmVyLl9yYW5raW5nID49IGJvcmRlcik7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG59O1xyXG5cclxuLypcclxudmFyIGV4YWN0TGVuID0gMDtcclxudmFyIGZ1enp5TGVuID0gMDtcclxudmFyIGZ1enp5Q250ID0gMDtcclxudmFyIGV4YWN0Q250ID0gMDtcclxudmFyIHRvdGFsQ250ID0gMDtcclxudmFyIHRvdGFsTGVuID0gMDtcclxudmFyIHJldGFpbmVkQ250ID0gMDtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZXNldENudCgpIHtcclxuICBleGFjdExlbiA9IDA7XHJcbiAgZnV6enlMZW4gPSAwO1xyXG4gIGZ1enp5Q250ID0gMDtcclxuICBleGFjdENudCA9IDA7XHJcbiAgdG90YWxDbnQgPSAwO1xyXG4gIHRvdGFsTGVuID0gMDtcclxuICByZXRhaW5lZENudCA9IDA7XHJcbn1cclxuKi9cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmKHNXb3JkR3JvdXA6IHN0cmluZywgc3BsaXRSdWxlcyA6IElNYXRjaC5TcGxpdFJ1bGVzICwgY250UmVjPyA6IElDbnRSZWMgKTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IHtcclxuICB2YXIgc2Vlbkl0ID0gY2F0ZWdvcml6ZVN0cmluZzIoc1dvcmRHcm91cCwgdHJ1ZSwgc3BsaXRSdWxlcywgY250UmVjKTtcclxuICAvL3RvdGFsQ250ICs9IDE7XHJcbiAgLy8gZXhhY3RMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcclxuICBhZGRDbnRSZWMoY250UmVjLCAnY250Q2F0RXhhY3QnLCAxKTtcclxuICBhZGRDbnRSZWMoY250UmVjLCAnY250Q2F0RXhhY3RSZXMnLCBzZWVuSXQubGVuZ3RoKTtcclxuXHJcbiAgaWYgKFJhbmtXb3JkLmhhc0Fib3ZlKHNlZW5JdCwgMC44KSkge1xyXG4gICAgaWYoY250UmVjKSB7XHJcbiAgICAgIGFkZENudFJlYyhjbnRSZWMsICdleGFjdFByaW9yVGFrZScsIHNlZW5JdC5sZW5ndGgpXHJcbiAgICB9XHJcbiAgICBzZWVuSXQgPSBSYW5rV29yZC50YWtlQWJvdmUoc2Vlbkl0LCAwLjgpO1xyXG4gICAgaWYoY250UmVjKSB7XHJcbiAgICAgIGFkZENudFJlYyhjbnRSZWMsICdleGFjdEFmdGVyVGFrZScsIHNlZW5JdC5sZW5ndGgpXHJcbiAgICB9XHJcbiAgIC8vIGV4YWN0Q250ICs9IDE7XHJcbiAgfSBlbHNlIHtcclxuICAgIHNlZW5JdCA9IGNhdGVnb3JpemVTdHJpbmcyKHNXb3JkR3JvdXAsIGZhbHNlLCBzcGxpdFJ1bGVzLCBjbnRSZWMpO1xyXG4gICAgYWRkQ250UmVjKGNudFJlYywgJ2NudE5vbkV4YWN0JywgMSk7XHJcbiAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Tm9uRXhhY3RSZXMnLCBzZWVuSXQubGVuZ3RoKTtcclxuICAvLyAgZnV6enlMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcclxuICAvLyAgZnV6enlDbnQgKz0gMTtcclxuICB9XHJcbiAvLyB0b3RhbExlbiArPSBzZWVuSXQubGVuZ3RoO1xyXG4gIHNlZW5JdCA9IFJhbmtXb3JkLnRha2VGaXJzdE4oc2Vlbkl0LCBBbGdvbC5Ub3BfTl9Xb3JkQ2F0ZWdvcml6YXRpb25zKTtcclxuIC8vIHJldGFpbmVkQ250ICs9IHNlZW5JdC5sZW5ndGg7XHJcbiAgcmV0dXJuIHNlZW5JdDtcclxufVxyXG5cclxuLyogaWYgd2UgaGF2ZSBhICBcIlJ1biBsaWtlIHRoZSBXaW5kXCJcclxuICBhbiBhIHVzZXIgdHlwZSBmdW4gbGlrZSAgYSBSaW5kICwgYW5kIFJpbmQgaXMgYW4gZXhhY3QgbWF0Y2gsXHJcbiAgd2Ugd2lsbCBub3Qgc3RhcnQgbG9va2luZyBmb3IgdGhlIGxvbmcgc2VudGVuY2VcclxuXHJcbiAgdGhpcyBpcyB0byBiZSBmaXhlZCBieSBcInNwcmVhZGluZ1wiIHRoZSByYW5nZSBpbmRpY2F0aW9uIGFjY3Jvc3MgdmVyeSBzaW1pbGFyIHdvcmRzIGluIHRoZSB2aW5jaW5pdHkgb2YgdGhlXHJcbiAgdGFyZ2V0IHdvcmRzXHJcbiovXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVdvcmRXaXRoT2Zmc2V0V2l0aFJhbmtDdXRvZmYoc1dvcmRHcm91cDogc3RyaW5nLCBzcGxpdFJ1bGVzIDogSU1hdGNoLlNwbGl0UnVsZXMsIGNudFJlYz8gOiBJQ250UmVjICk6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nUmFuZ2VkPiB7XHJcbiAgdmFyIHNXb3JkR3JvdXBMQyA9IHNXb3JkR3JvdXAudG9Mb3dlckNhc2UoKTtcclxuICB2YXIgc2Vlbkl0ID0gY2F0ZWdvcml6ZVdvcmRJbnRlcm5hbFdpdGhPZmZzZXRzKHNXb3JkR3JvdXAsIHNXb3JkR3JvdXBMQywgdHJ1ZSwgc3BsaXRSdWxlcywgY250UmVjKTtcclxuICAvL2NvbnNvbGUubG9nKFwiU0VFTklUXCIgKyBKU09OLnN0cmluZ2lmeShzZWVuSXQpKTtcclxuICAvL3RvdGFsQ250ICs9IDE7XHJcbiAgLy8gZXhhY3RMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcclxuICAvL2NvbnNvbGUubG9nKFwiZmlyc3QgcnVuIGV4YWN0IFwiICsgSlNPTi5zdHJpbmdpZnkoc2Vlbkl0KSk7XHJcbiAgYWRkQ250UmVjKGNudFJlYywgJ2NudENhdEV4YWN0JywgMSk7XHJcbiAgYWRkQ250UmVjKGNudFJlYywgJ2NudENhdEV4YWN0UmVzJywgc2Vlbkl0Lmxlbmd0aCk7XHJcblxyXG4gIGlmIChSYW5rV29yZC5oYXNBYm92ZShzZWVuSXQsIDAuOCkpIHtcclxuICAgIGlmKGNudFJlYykge1xyXG4gICAgICBhZGRDbnRSZWMoY250UmVjLCAnZXhhY3RQcmlvclRha2UnLCBzZWVuSXQubGVuZ3RoKVxyXG4gICAgfVxyXG4gICAgc2Vlbkl0ID0gUmFua1dvcmQudGFrZUFib3ZlKHNlZW5JdCwgMC44KTtcclxuICAgIGlmKGNudFJlYykge1xyXG4gICAgICBhZGRDbnRSZWMoY250UmVjLCAnZXhhY3RBZnRlclRha2UnLCBzZWVuSXQubGVuZ3RoKVxyXG4gICAgfVxyXG4gICAvLyBleGFjdENudCArPSAxO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBzZWVuSXQgPSBjYXRlZ29yaXplV29yZEludGVybmFsV2l0aE9mZnNldHMoc1dvcmRHcm91cCwgc1dvcmRHcm91cExDLCBmYWxzZSwgc3BsaXRSdWxlcywgY250UmVjKTtcclxuICAgIGFkZENudFJlYyhjbnRSZWMsICdjbnROb25FeGFjdCcsIDEpO1xyXG4gICAgYWRkQ250UmVjKGNudFJlYywgJ2NudE5vbkV4YWN0UmVzJywgc2Vlbkl0Lmxlbmd0aCk7XHJcbiAgLy8gIGZ1enp5TGVuICs9IHNlZW5JdC5sZW5ndGg7XHJcbiAgLy8gIGZ1enp5Q250ICs9IDE7XHJcbiAgfVxyXG4gIC8vIHRvdGFsTGVuICs9IHNlZW5JdC5sZW5ndGg7XHJcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZD8gKCBgJHtzZWVuSXQubGVuZ3RofSB3aXRoICR7c2Vlbkl0LnJlZHVjZSggKHByZXYsb2JqKSA9PiBwcmV2ICsgKG9iai5ydWxlLnJhbmdlID8gMSA6IDApLDApfSByYW5nZWQgIWApOiAnLScpO1xyXG4vLyAgdmFyIGNudFJhbmdlZCA9IHNlZW5JdC5yZWR1Y2UoIChwcmV2LG9iaikgPT4gcHJldiArIChvYmoucnVsZS5yYW5nZSA/IDEgOiAwKSwwKTtcclxuLy8gIGNvbnNvbGUubG9nKGAqKioqKioqKioqKiAke3NlZW5JdC5sZW5ndGh9IHdpdGggJHtjbnRSYW5nZWR9IHJhbmdlZCAhYCk7XHJcblxyXG4gIHNlZW5JdCA9IFJhbmtXb3JkLnRha2VGaXJzdE4oc2Vlbkl0LCBBbGdvbC5Ub3BfTl9Xb3JkQ2F0ZWdvcml6YXRpb25zKTtcclxuIC8vIHJldGFpbmVkQ250ICs9IHNlZW5JdC5sZW5ndGg7XHJcbiAgLy9jb25zb2xlLmxvZyhcImZpbmFsIHJlcyBvZiBjYXRlZ29yaXplV29yZFdpdGhPZmZzZXRXaXRoUmFua0N1dG9mZlwiICsgSlNPTi5zdHJpbmdpZnkoc2Vlbkl0KSk7XHJcblxyXG4gIHJldHVybiBzZWVuSXQ7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVdvcmRXaXRoT2Zmc2V0V2l0aFJhbmtDdXRvZmZTaW5nbGUod29yZDogc3RyaW5nLCBydWxlOiBJTWF0Y2gubVJ1bGUpOiBJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1JhbmdlZCB7XHJcbiAgdmFyIGxjd29yZCA9IHdvcmQudG9Mb3dlckNhc2UoKTtcclxuXHJcbiAgaWYobGN3b3JkID09PSBydWxlLmxvd2VyY2FzZXdvcmQpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHN0cmluZzogd29yZCxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogcnVsZS5tYXRjaGVkU3RyaW5nLFxyXG4gICAgICAgICAgICBjYXRlZ29yeTogcnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgcnVsZTogcnVsZSxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IHJ1bGUuX3JhbmtpbmcgfHwgMS4wXHJcbiAgICAgICAgICB9O1xyXG4gIH1cclxuXHJcbiAgdmFyIHJlczogQXJyYXk8SU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1JhbmdlZD4gPSBbXVxyXG4gIGNoZWNrT25lUnVsZVdpdGhPZmZzZXQod29yZCxsY3dvcmQsZmFsc2UscmVzLHJ1bGUpO1xyXG4gIGRlYnVnbG9nKFwiY2F0V1dPV1JDUyBcIiArIGxjd29yZCk7XHJcbiAgaWYocmVzLmxlbmd0aCkge1xyXG4gICAgcmV0dXJuIHJlc1swXTtcclxuICB9XHJcbiAgcmV0dXJuIHVuZGVmaW5lZDtcclxufVxyXG5cclxuXHJcblxyXG4vKlxyXG5leHBvcnQgZnVuY3Rpb24gZHVtcENudCgpIHtcclxuICBjb25zb2xlLmxvZyhgXHJcbmV4YWN0TGVuID0gJHtleGFjdExlbn07XHJcbmV4YWN0Q250ID0gJHtleGFjdENudH07XHJcbmZ1enp5TGVuID0gJHtmdXp6eUxlbn07XHJcbmZ1enp5Q250ID0gJHtmdXp6eUNudH07XHJcbnRvdGFsQ250ID0gJHt0b3RhbENudH07XHJcbnRvdGFsTGVuID0gJHt0b3RhbExlbn07XHJcbnJldGFpbmVkTGVuID0gJHtyZXRhaW5lZENudH07XHJcbiAgYCk7XHJcbn1cclxuKi9cclxuXHJcbi8qXHJcbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWRTZW50ZW5jZShvU2VudGVuY2U6IElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11bXSk6IGJvb2xlYW4ge1xyXG4gIHJldHVybiBvU2VudGVuY2UuZXZlcnkoZnVuY3Rpb24gKG9Xb3JkR3JvdXApIHtcclxuICAgIHJldHVybiAob1dvcmRHcm91cC5sZW5ndGggPiAwKTtcclxuICB9KTtcclxufVxyXG5cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkKGFycjogSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXVtdW10pOiBJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdW11bXSB7XHJcbiAgcmV0dXJuIGFyci5maWx0ZXIoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xyXG4gICAgcmV0dXJuIGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZFNlbnRlbmNlKG9TZW50ZW5jZSk7XHJcbiAgfSk7XHJcbn1cclxuKi9cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjYXRlZ29yaXplQVdvcmQoc1dvcmRHcm91cDogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHNlbnRlbmNlOiBzdHJpbmcsIHdvcmRzOiB7IFtrZXk6IHN0cmluZ106IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPn0sXHJcbmNudFJlYyA/IDogSUNudFJlYyApIDogSU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdIHtcclxuICB2YXIgc2Vlbkl0ID0gd29yZHNbc1dvcmRHcm91cF07XHJcbiAgaWYgKHNlZW5JdCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICBzZWVuSXQgPSBjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmKHNXb3JkR3JvdXAsIHJ1bGVzLCBjbnRSZWMpO1xyXG4gICAgVXRpbHMuZGVlcEZyZWV6ZShzZWVuSXQpO1xyXG4gICAgd29yZHNbc1dvcmRHcm91cF0gPSBzZWVuSXQ7XHJcbiAgfVxyXG4gIGlmICghc2Vlbkl0IHx8IHNlZW5JdC5sZW5ndGggPT09IDApIHtcclxuICAgIGxvZ2dlcihcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIFxcXCJcIiArIHNXb3JkR3JvdXAgKyBcIlxcXCIgaW4gc2VudGVuY2UgXFxcIlwiXHJcbiAgICAgICsgc2VudGVuY2UgKyBcIlxcXCJcIik7XHJcbiAgICBpZiAoc1dvcmRHcm91cC5pbmRleE9mKFwiIFwiKSA8PSAwKSB7XHJcbiAgICAgIGRlYnVnbG9nKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgcHJpbWl0aXZlICghKVwiICsgc1dvcmRHcm91cCk7XHJcbiAgICB9XHJcbiAgICBkZWJ1Z2xvZyhcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIFwiICsgc1dvcmRHcm91cCk7XHJcbiAgICBpZiAoIXNlZW5JdCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RpbmcgZW10cHkgbGlzdCwgbm90IHVuZGVmaW5lZCBmb3IgXFxcIlwiICsgc1dvcmRHcm91cCArIFwiXFxcIlwiKVxyXG4gICAgfVxyXG4gICAgd29yZHNbc1dvcmRHcm91cF0gPSBbXVxyXG4gICAgcmV0dXJuIFtdO1xyXG4gIH1cclxuICByZXR1cm4gVXRpbHMuY2xvbmVEZWVwKHNlZW5JdCk7XHJcbn1cclxuXHJcblxyXG4vKipcclxuICogR2l2ZW4gYSAgc3RyaW5nLCBicmVhayBpdCBkb3duIGludG8gY29tcG9uZW50cyxcclxuICogW1snQScsICdCJ10sIFsnQSBCJ11dXHJcbiAqXHJcbiAqIHRoZW4gY2F0ZWdvcml6ZVdvcmRzXHJcbiAqIHJldHVybmluZ1xyXG4gKlxyXG4gKiBbIFtbIHsgY2F0ZWdvcnk6ICdzeXN0ZW1JZCcsIHdvcmQgOiAnQSd9LFxyXG4gKiAgICAgIHsgY2F0ZWdvcnk6ICdvdGhlcnRoaW5nJywgd29yZCA6ICdBJ31cclxuICogICAgXSxcclxuICogICAgLy8gcmVzdWx0IG9mIEJcclxuICogICAgWyB7IGNhdGVnb3J5OiAnc3lzdGVtSWQnLCB3b3JkIDogJ0InfSxcclxuICogICAgICB7IGNhdGVnb3J5OiAnb3RoZXJ0aGluZycsIHdvcmQgOiAnQSd9XHJcbiAqICAgICAgeyBjYXRlZ29yeTogJ2Fub3RoZXJ0cnlwJywgd29yZCA6ICdCJ31cclxuICogICAgXVxyXG4gKiAgIF0sXHJcbiAqIF1dXVxyXG4gKlxyXG4gKlxyXG4gKlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVTdHJpbmcoc1N0cmluZzogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsXHJcbiAgd29yZHM/OiB7IFtrZXk6IHN0cmluZ106IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiB9KVxyXG4gIDogWyBbIElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXV0gXVxyXG4gICB7XHJcbiAgdmFyIGNudCA9IDA7XHJcbiAgdmFyIGZhYyA9IDE7XHJcbiAgdmFyIHUgPSBicmVha2Rvd24uYnJlYWtkb3duU3RyaW5nKHNTdHJpbmcsIEFsZ29sLk1heFNwYWNlc1BlckNvbWJpbmVkV29yZCk7XHJcbiAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgZGVidWdsb2coXCJoZXJlIGJyZWFrZG93blwiICsgSlNPTi5zdHJpbmdpZnkodSkpO1xyXG4gIH1cclxuICAvL2NvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHUpKTtcclxuICB3b3JkcyA9IHdvcmRzIHx8IHt9O1xyXG4gIGRlYnVncGVyZigndGhpcyBtYW55IGtub3duIHdvcmRzOiAnICsgT2JqZWN0LmtleXMod29yZHMpLmxlbmd0aCk7XHJcbiAgdmFyIHJlcyA9IFtdIGFzIFtbIElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXV0gXTtcclxuICB2YXIgY250UmVjID0ge307XHJcbiAgdS5mb3JFYWNoKGZ1bmN0aW9uIChhQnJlYWtEb3duU2VudGVuY2UpIHtcclxuICAgICAgdmFyIGNhdGVnb3JpemVkU2VudGVuY2UgPSBbXSBhcyBbIElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXSBdO1xyXG4gICAgICB2YXIgaXNWYWxpZCA9IGFCcmVha0Rvd25TZW50ZW5jZS5ldmVyeShmdW5jdGlvbiAoc1dvcmRHcm91cDogc3RyaW5nLCBpbmRleCA6IG51bWJlcikge1xyXG4gICAgICAgIHZhciBzZWVuSXQgPSBjYXRlZ29yaXplQVdvcmQoc1dvcmRHcm91cCwgcnVsZXMsIHNTdHJpbmcsIHdvcmRzLCBjbnRSZWMpO1xyXG4gICAgICAgIGlmKHNlZW5JdC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2F0ZWdvcml6ZWRTZW50ZW5jZVtpbmRleF0gPSBzZWVuSXQ7XHJcbiAgICAgICAgY250ID0gY250ICsgc2Vlbkl0Lmxlbmd0aDtcclxuICAgICAgICBmYWMgPSBmYWMgKiBzZWVuSXQubGVuZ3RoO1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICB9KTtcclxuICAgICAgaWYoaXNWYWxpZCkge1xyXG4gICAgICAgIHJlcy5wdXNoKGNhdGVnb3JpemVkU2VudGVuY2UpO1xyXG4gICAgICB9XHJcbiAgfSk7XHJcbiAgZGVidWdsb2coXCIgc2VudGVuY2VzIFwiICsgdS5sZW5ndGggKyBcIiBtYXRjaGVzIFwiICsgY250ICsgXCIgZmFjOiBcIiArIGZhYyk7XHJcbiAgaWYoZGVidWdsb2cuZW5hYmxlZCAmJiB1Lmxlbmd0aCkge1xyXG4gICAgZGVidWdsb2coXCJmaXJzdCBtYXRjaCBcIisgSlNPTi5zdHJpbmdpZnkodSx1bmRlZmluZWQsMikpO1xyXG4gIH1cclxuICBkZWJ1Z3BlcmYoXCIgc2VudGVuY2VzIFwiICsgdS5sZW5ndGggKyBcIiAvIFwiICsgcmVzLmxlbmd0aCArICBcIiBtYXRjaGVzIFwiICsgY250ICsgXCIgZmFjOiBcIiArIGZhYyArIFwiIHJlYyA6IFwiICsgSlNPTi5zdHJpbmdpZnkoY250UmVjLHVuZGVmaW5lZCwyKSk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjYXRlZ29yaXplQVdvcmRXaXRoT2Zmc2V0cyhzV29yZEdyb3VwOiBzdHJpbmcsIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgc2VudGVuY2U6IHN0cmluZywgd29yZHM6IHsgW2tleTogc3RyaW5nXTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+fSxcclxuY250UmVjID8gOiBJQ250UmVjICkgOiBJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nUmFuZ2VkW10ge1xyXG4gIHZhciBzZWVuSXQgPSB3b3Jkc1tzV29yZEdyb3VwXTtcclxuICBpZiAoc2Vlbkl0ID09PSB1bmRlZmluZWQpIHtcclxuICAgIHNlZW5JdCA9IGNhdGVnb3JpemVXb3JkV2l0aE9mZnNldFdpdGhSYW5rQ3V0b2ZmKHNXb3JkR3JvdXAsIHJ1bGVzLCBjbnRSZWMpO1xyXG4gICAgVXRpbHMuZGVlcEZyZWV6ZShzZWVuSXQpO1xyXG4gICAgd29yZHNbc1dvcmRHcm91cF0gPSBzZWVuSXQ7XHJcbiAgfVxyXG4gIGlmICghc2Vlbkl0IHx8IHNlZW5JdC5sZW5ndGggPT09IDApIHtcclxuICAgIGxvZ2dlcihcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIFxcXCJcIiArIHNXb3JkR3JvdXAgKyBcIlxcXCIgaW4gc2VudGVuY2UgXFxcIlwiXHJcbiAgICAgICsgc2VudGVuY2UgKyBcIlxcXCJcIik7XHJcbiAgICBpZiAoc1dvcmRHcm91cC5pbmRleE9mKFwiIFwiKSA8PSAwKSB7XHJcbiAgICAgIGRlYnVnbG9nKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgcHJpbWl0aXZlICghKVwiICsgc1dvcmRHcm91cCk7XHJcbiAgICB9XHJcbiAgICBkZWJ1Z2xvZyhcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIFwiICsgc1dvcmRHcm91cCk7XHJcbiAgICBpZiAoIXNlZW5JdCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RpbmcgZW10cHkgbGlzdCwgbm90IHVuZGVmaW5lZCBmb3IgXFxcIlwiICsgc1dvcmRHcm91cCArIFwiXFxcIlwiKVxyXG4gICAgfVxyXG4gICAgd29yZHNbc1dvcmRHcm91cF0gPSBbXVxyXG4gICAgcmV0dXJuIFtdO1xyXG4gIH1cclxuICByZXR1cm4gVXRpbHMuY2xvbmVEZWVwKHNlZW5JdCk7XHJcbn1cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuLypcclxuWyBbYSxiXSwgW2MsZF1dXHJcblxyXG4wMCBhXHJcbjAxIGJcclxuMTAgY1xyXG4xMSBkXHJcbjEyIGNcclxuKi9cclxuXHJcblxyXG5jb25zdCBjbG9uZSA9IFV0aWxzLmNsb25lRGVlcDtcclxuXHJcblxyXG5mdW5jdGlvbiBjb3B5VmVjTWVtYmVycyh1KSB7XHJcbiAgdmFyIGkgPSAwO1xyXG4gIGZvcihpID0gMDsgaSA8IHUubGVuZ3RoOyArK2kpIHtcclxuICAgIHVbaV0gPSBjbG9uZSh1W2ldKTtcclxuICB9XHJcbiAgcmV0dXJuIHU7XHJcbn1cclxuLy8gd2UgY2FuIHJlcGxpY2F0ZSB0aGUgdGFpbCBvciB0aGUgaGVhZCxcclxuLy8gd2UgcmVwbGljYXRlIHRoZSB0YWlsIGFzIGl0IGlzIHNtYWxsZXIuXHJcblxyXG4vLyBbYSxiLGMgXVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGV4cGFuZE1hdGNoQXJyKGRlZXA6IEFycmF5PEFycmF5PGFueT4+KTogQXJyYXk8QXJyYXk8YW55Pj4ge1xyXG4gIHZhciBhID0gW107XHJcbiAgdmFyIGxpbmUgPSBbXTtcclxuICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gSlNPTi5zdHJpbmdpZnkoZGVlcCkgOiAnLScpO1xyXG4gIGRlZXAuZm9yRWFjaChmdW5jdGlvbiAodUJyZWFrRG93bkxpbmUsIGlJbmRleDogbnVtYmVyKSB7XHJcbiAgICBsaW5lW2lJbmRleF0gPSBbXTtcclxuICAgIHVCcmVha0Rvd25MaW5lLmZvckVhY2goZnVuY3Rpb24gKGFXb3JkR3JvdXAsIHdnSW5kZXg6IG51bWJlcikge1xyXG4gICAgICBsaW5lW2lJbmRleF1bd2dJbmRleF0gPSBbXTtcclxuICAgICAgYVdvcmRHcm91cC5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZFZhcmlhbnQsIGlXVkluZGV4OiBudW1iZXIpIHtcclxuICAgICAgICBsaW5lW2lJbmRleF1bd2dJbmRleF1baVdWSW5kZXhdID0gb1dvcmRWYXJpYW50O1xyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gIH0pXHJcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IEpTT04uc3RyaW5naWZ5KGxpbmUpIDogJy0nKTtcclxuICB2YXIgcmVzID0gW107XHJcbiAgdmFyIG52ZWNzID0gW107XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lLmxlbmd0aDsgKytpKSB7XHJcbiAgICB2YXIgdmVjcyA9IFtbXV07XHJcbiAgICB2YXIgbnZlY3MgPSBbXTtcclxuICAgIHZhciBydmVjID0gW107XHJcbiAgICBmb3IgKHZhciBrID0gMDsgayA8IGxpbmVbaV0ubGVuZ3RoOyArK2spIHsgLy8gd29yZGdyb3VwIGtcclxuICAgICAgLy92ZWNzIGlzIHRoZSB2ZWN0b3Igb2YgYWxsIHNvIGZhciBzZWVuIHZhcmlhbnRzIHVwIHRvIGsgd2dzLlxyXG4gICAgICB2YXIgbmV4dEJhc2UgPSBbXTtcclxuICAgICAgZm9yICh2YXIgbCA9IDA7IGwgPCBsaW5lW2ldW2tdLmxlbmd0aDsgKytsKSB7IC8vIGZvciBlYWNoIHZhcmlhbnRcclxuICAgICAgICAvL2RlYnVnbG9nKFwidmVjcyBub3dcIiArIEpTT04uc3RyaW5naWZ5KHZlY3MpKTtcclxuICAgICAgICBudmVjcyA9IFtdOyAvL3ZlY3Muc2xpY2UoKTsgLy8gY29weSB0aGUgdmVjW2ldIGJhc2UgdmVjdG9yO1xyXG4gICAgICAgIC8vZGVidWdsb2coXCJ2ZWNzIGNvcGllZCBub3dcIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSk7XHJcbiAgICAgICAgZm9yICh2YXIgdSA9IDA7IHUgPCB2ZWNzLmxlbmd0aDsgKyt1KSB7XHJcbiAgICAgICAgICBudmVjc1t1XSA9IHZlY3NbdV0uc2xpY2UoKTsgLy9cclxuICAgICAgICAgIG52ZWNzW3VdID0gY29weVZlY01lbWJlcnMobnZlY3NbdV0pO1xyXG4gICAgICAgICAgLy8gZGVidWdsb2coXCJjb3BpZWQgdmVjc1tcIisgdStcIl1cIiArIEpTT04uc3RyaW5naWZ5KHZlY3NbdV0pKTtcclxuICAgICAgICAgIG52ZWNzW3VdLnB1c2goXHJcbiAgICAgICAgICAgIGNsb25lKGxpbmVbaV1ba11bbF0pKTsgLy8gcHVzaCB0aGUgbHRoIHZhcmlhbnRcclxuICAgICAgICAgIC8vIGRlYnVnbG9nKFwibm93IG52ZWNzIFwiICsgbnZlY3MubGVuZ3RoICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyAgIGRlYnVnbG9nKFwiIGF0ICAgICBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiBuZXh0YmFzZSA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpXHJcbiAgICAgICAgLy8gICBkZWJ1Z2xvZyhcIiBhcHBlbmQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbnZlY3MgICAgPlwiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKVxyXG4gICAgICAgIG5leHRCYXNlID0gbmV4dEJhc2UuY29uY2F0KG52ZWNzKTtcclxuICAgICAgICAvLyAgIGRlYnVnbG9nKFwiICByZXN1bHQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbnZlY3MgICAgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxyXG4gICAgICB9IC8vY29uc3RydVxyXG4gICAgICAvLyAgZGVidWdsb2coXCJub3cgYXQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxyXG4gICAgICB2ZWNzID0gbmV4dEJhc2U7XHJcbiAgICB9XHJcbiAgICBkZWJ1Z2xvZ1YoZGVidWdsb2dWLmVuYWJsZWQgPyAoXCJBUFBFTkRJTkcgVE8gUkVTXCIgKyBpICsgXCI6XCIgKyBsICsgXCIgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKSA6ICctJyk7XHJcbiAgICByZXMgPSByZXMuY29uY2F0KHZlY3MpO1xyXG4gIH1cclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5cclxuLyoqXHJcbiAqIENhbGN1bGF0ZSBhIHdlaWdodCBmYWN0b3IgZm9yIGEgZ2l2ZW4gZGlzdGFuY2UgYW5kXHJcbiAqIGNhdGVnb3J5XHJcbiAqIEBwYXJhbSB7aW50ZWdlcn0gZGlzdCBkaXN0YW5jZSBpbiB3b3Jkc1xyXG4gKiBAcGFyYW0ge3N0cmluZ30gY2F0ZWdvcnkgY2F0ZWdvcnkgdG8gdXNlXHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IGEgZGlzdGFuY2UgZmFjdG9yID49IDFcclxuICogIDEuMCBmb3Igbm8gZWZmZWN0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcmVpbmZvcmNlRGlzdFdlaWdodChkaXN0OiBudW1iZXIsIGNhdGVnb3J5OiBzdHJpbmcpOiBudW1iZXIge1xyXG4gIHZhciBhYnMgPSBNYXRoLmFicyhkaXN0KTtcclxuICByZXR1cm4gMS4wICsgKEFsZ29sLmFSZWluZm9yY2VEaXN0V2VpZ2h0W2Fic10gfHwgMCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHaXZlbiBhIHNlbnRlbmNlLCBleHRhY3QgY2F0ZWdvcmllc1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RDYXRlZ29yeU1hcChvU2VudGVuY2U6IEFycmF5PElGTWF0Y2guSVdvcmQ+KTogeyBba2V5OiBzdHJpbmddOiBBcnJheTx7IHBvczogbnVtYmVyIH0+IH0ge1xyXG4gIHZhciByZXMgPSB7fTtcclxuICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKCdleHRyYWN0Q2F0ZWdvcnlNYXAgJyArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSkpIDogJy0nKTtcclxuICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGlJbmRleCkge1xyXG4gICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBJRk1hdGNoLkNBVF9DQVRFR09SWSkge1xyXG4gICAgICByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10gfHwgW107XHJcbiAgICAgIHJlc1tvV29yZC5tYXRjaGVkU3RyaW5nXS5wdXNoKHsgcG9zOiBpSW5kZXggfSk7XHJcbiAgICB9XHJcbiAgfSk7XHJcbiAgVXRpbHMuZGVlcEZyZWV6ZShyZXMpO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWluRm9yY2VTZW50ZW5jZShvU2VudGVuY2UpIHtcclxuICBcInVzZSBzdHJpY3RcIjtcclxuICB2YXIgb0NhdGVnb3J5TWFwID0gZXh0cmFjdENhdGVnb3J5TWFwKG9TZW50ZW5jZSk7XHJcbiAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpSW5kZXgpIHtcclxuICAgIHZhciBtID0gb0NhdGVnb3J5TWFwW29Xb3JkLmNhdGVnb3J5XSB8fCBbXTtcclxuICAgIG0uZm9yRWFjaChmdW5jdGlvbiAob1Bvc2l0aW9uOiB7IHBvczogbnVtYmVyIH0pIHtcclxuICAgICAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgICAgIG9Xb3JkLnJlaW5mb3JjZSA9IG9Xb3JkLnJlaW5mb3JjZSB8fCAxO1xyXG4gICAgICB2YXIgYm9vc3QgPSByZWluZm9yY2VEaXN0V2VpZ2h0KGlJbmRleCAtIG9Qb3NpdGlvbi5wb3MsIG9Xb3JkLmNhdGVnb3J5KTtcclxuICAgICAgb1dvcmQucmVpbmZvcmNlICo9IGJvb3N0O1xyXG4gICAgICBvV29yZC5fcmFua2luZyAqPSBib29zdDtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG4gIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaUluZGV4KSB7XHJcbiAgICBpZiAoaUluZGV4ID4gMCApIHtcclxuICAgICAgaWYgKG9TZW50ZW5jZVtpSW5kZXgtMV0uY2F0ZWdvcnkgPT09IFwibWV0YVwiICAmJiAob1dvcmQuY2F0ZWdvcnkgPT09IG9TZW50ZW5jZVtpSW5kZXgtMV0ubWF0Y2hlZFN0cmluZykgKSB7XHJcbiAgICAgICAgb1dvcmQucmVpbmZvcmNlID0gb1dvcmQucmVpbmZvcmNlIHx8IDE7XHJcbiAgICAgICAgdmFyIGJvb3N0ID0gcmVpbmZvcmNlRGlzdFdlaWdodCgxLCBvV29yZC5jYXRlZ29yeSk7XHJcbiAgICAgICAgb1dvcmQucmVpbmZvcmNlICo9IGJvb3N0O1xyXG4gICAgICAgIG9Xb3JkLl9yYW5raW5nICo9IGJvb3N0O1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSk7XHJcbiAgcmV0dXJuIG9TZW50ZW5jZTtcclxufVxyXG5cclxuXHJcbmltcG9ydCAqIGFzIFNlbnRlbmNlIGZyb20gJy4vc2VudGVuY2UnO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlaW5Gb3JjZShhQ2F0ZWdvcml6ZWRBcnJheSkge1xyXG4gIFwidXNlIHN0cmljdFwiO1xyXG4gIGFDYXRlZ29yaXplZEFycmF5LmZvckVhY2goZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xyXG4gICAgcmVpbkZvcmNlU2VudGVuY2Uob1NlbnRlbmNlKTtcclxuICB9KVxyXG4gIGFDYXRlZ29yaXplZEFycmF5LnNvcnQoU2VudGVuY2UuY21wUmFua2luZ1Byb2R1Y3QpO1xyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nKFwiYWZ0ZXIgcmVpbmZvcmNlXCIgKyBhQ2F0ZWdvcml6ZWRBcnJheS5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xyXG4gICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcclxuICAgIH0pLmpvaW4oXCJcXG5cIikpO1xyXG4gIH1cclxuICByZXR1cm4gYUNhdGVnb3JpemVkQXJyYXk7XHJcbn1cclxuXHJcblxyXG4vLy8gYmVsb3cgbWF5IG5vIGxvbmdlciBiZSB1c2VkXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hSZWdFeHAob1J1bGU6IElSdWxlLCBjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQsIG9wdGlvbnM/OiBJTWF0Y2hPcHRpb25zKSB7XHJcbiAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICB2YXIgc0tleSA9IG9SdWxlLmtleTtcclxuICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKVxyXG4gIHZhciByZWcgPSBvUnVsZS5yZWdleHA7XHJcblxyXG4gIHZhciBtID0gcmVnLmV4ZWMoczEpO1xyXG4gIGlmKGRlYnVnbG9nVi5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZ1YoXCJhcHBseWluZyByZWdleHA6IFwiICsgczEgKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KG0pKTtcclxuICB9XHJcbiAgaWYgKCFtKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxyXG4gIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsIG9SdWxlLmZvbGxvd3MsIG9SdWxlLmtleSlcclxuICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nVihKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xyXG4gICAgZGVidWdsb2dWKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcclxuICB9XHJcbiAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkXHJcbiAgfVxyXG4gIHZhciBvRXh0cmFjdGVkQ29udGV4dCA9IGV4dHJhY3RBcmdzTWFwKG0sIG9SdWxlLmFyZ3NNYXApO1xyXG4gIGlmIChkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xyXG4gICAgZGVidWdsb2dWKFwiZXh0cmFjdGVkIGFyZ3MgXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZS5hcmdzTWFwKSk7XHJcbiAgICBkZWJ1Z2xvZ1YoXCJtYXRjaCBcIiArIEpTT04uc3RyaW5naWZ5KG0pKTtcclxuICAgIGRlYnVnbG9nVihcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob0V4dHJhY3RlZENvbnRleHQpKTtcclxuICB9XHJcbiAgdmFyIHJlcyA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpIGFzIGFueTtcclxuICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpO1xyXG4gIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcclxuICBpZiAob0V4dHJhY3RlZENvbnRleHRbc0tleV0gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgcmVzW3NLZXldID0gb0V4dHJhY3RlZENvbnRleHRbc0tleV07XHJcbiAgfVxyXG4gIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XHJcbiAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb1J1bGUuZm9sbG93cyk7XHJcbiAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpXHJcbiAgfVxyXG4gIE9iamVjdC5mcmVlemUocmVzKTtcclxuICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKSA6ICctJyk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNvcnRCeVdlaWdodChzS2V5OiBzdHJpbmcsIG9Db250ZXh0QTogSUZNYXRjaC5jb250ZXh0LCBvQ29udGV4dEI6IElGTWF0Y2guY29udGV4dCk6IG51bWJlciB7XHJcbiAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nVignc29ydGluZzogJyArIHNLZXkgKyAnaW52b2tlZCB3aXRoXFxuIDE6JyArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QSwgdW5kZWZpbmVkLCAyKSArXHJcbiAgICBcIiB2cyBcXG4gMjpcIiArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QiwgdW5kZWZpbmVkLCAyKSk7XHJcbiAgfVxyXG4gIHZhciByYW5raW5nQTogbnVtYmVyID0gcGFyc2VGbG9hdChvQ29udGV4dEFbXCJfcmFua2luZ1wiXSB8fCBcIjFcIik7XHJcbiAgdmFyIHJhbmtpbmdCOiBudW1iZXIgPSBwYXJzZUZsb2F0KG9Db250ZXh0QltcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcclxuICBpZiAocmFua2luZ0EgIT09IHJhbmtpbmdCKSB7XHJcbiAgICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAgIGRlYnVnbG9nKFwiIHJhbmtpbiBkZWx0YVwiICsgMTAwICogKHJhbmtpbmdCIC0gcmFua2luZ0EpKTtcclxuICAgIH1cclxuICAgIHJldHVybiAxMDAgKiAocmFua2luZ0IgLSByYW5raW5nQSlcclxuICB9XHJcblxyXG4gIHZhciB3ZWlnaHRBID0gb0NvbnRleHRBW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdW3NLZXldIHx8IDA7XHJcbiAgdmFyIHdlaWdodEIgPSBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QltcIl93ZWlnaHRcIl1bc0tleV0gfHwgMDtcclxuICByZXR1cm4gKyh3ZWlnaHRCIC0gd2VpZ2h0QSk7XHJcbn1cclxuXHJcblxyXG4vLyBXb3JkLCBTeW5vbnltLCBSZWdleHAgLyBFeHRyYWN0aW9uUnVsZVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0MShjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQsIG9SdWxlczogQXJyYXk8SVJ1bGU+LCBvcHRpb25zOiBJTWF0Y2hPcHRpb25zKTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgdmFyIHNLZXkgPSBvUnVsZXNbMF0ua2V5O1xyXG4gIC8vIGNoZWNrIHRoYXQgcnVsZVxyXG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAvLyBjaGVjayBjb25zaXN0ZW5jeVxyXG4gICAgb1J1bGVzLmV2ZXJ5KGZ1bmN0aW9uIChpUnVsZSkge1xyXG4gICAgICBpZiAoaVJ1bGUua2V5ICE9PSBzS2V5KSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW5ob21vZ2Vub3VzIGtleXMgaW4gcnVsZXMsIGV4cGVjdGVkIFwiICsgc0tleSArIFwiIHdhcyBcIiArIEpTT04uc3RyaW5naWZ5KGlSdWxlKSk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vIGxvb2sgZm9yIHJ1bGVzIHdoaWNoIG1hdGNoXHJcbiAgdmFyIHJlcyA9IG9SdWxlcy5tYXAoZnVuY3Rpb24gKG9SdWxlKSB7XHJcbiAgICAvLyBpcyB0aGlzIHJ1bGUgYXBwbGljYWJsZVxyXG4gICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuV09SRDpcclxuICAgICAgICByZXR1cm4gbWF0Y2hXb3JkKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKVxyXG4gICAgICBjYXNlIElGTWF0Y2guRW51bVJ1bGVUeXBlLlJFR0VYUDpcclxuICAgICAgICByZXR1cm4gbWF0Y2hSZWdFeHAob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xyXG4gICAgICAvLyAgIGNhc2UgXCJFeHRyYWN0aW9uXCI6XHJcbiAgICAgIC8vICAgICByZXR1cm4gbWF0Y2hFeHRyYWN0aW9uKG9SdWxlLGNvbnRleHQpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gIH0pLmZpbHRlcihmdW5jdGlvbiAob3Jlcykge1xyXG4gICAgcmV0dXJuICEhb3Jlc1xyXG4gIH0pLnNvcnQoXHJcbiAgICBzb3J0QnlXZWlnaHQuYmluZCh0aGlzLCBzS2V5KVxyXG4gICAgKTtcclxuICAgIC8vZGVidWdsb2coXCJoYXNzb3J0ZWRcIiArIEpTT04uc3RyaW5naWZ5KHJlcyx1bmRlZmluZWQsMikpO1xyXG4gIHJldHVybiByZXM7XHJcbiAgLy8gT2JqZWN0LmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XHJcbiAgLy8gfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhdWdtZW50Q29udGV4dChjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQsIGFSdWxlczogQXJyYXk8SVJ1bGU+KTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcblxyXG4gIHZhciBvcHRpb25zMTogSU1hdGNoT3B0aW9ucyA9IHtcclxuICAgIG1hdGNob3RoZXJzOiB0cnVlLFxyXG4gICAgb3ZlcnJpZGU6IGZhbHNlXHJcbiAgfSBhcyBJTWF0Y2hPcHRpb25zO1xyXG5cclxuICB2YXIgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMxKVxyXG5cclxuICBpZiAoYVJlcy5sZW5ndGggPT09IDApIHtcclxuICAgIHZhciBvcHRpb25zMjogSU1hdGNoT3B0aW9ucyA9IHtcclxuICAgICAgbWF0Y2hvdGhlcnM6IGZhbHNlLFxyXG4gICAgICBvdmVycmlkZTogdHJ1ZVxyXG4gICAgfSBhcyBJTWF0Y2hPcHRpb25zO1xyXG4gICAgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMyKTtcclxuICB9XHJcbiAgcmV0dXJuIGFSZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBpbnNlcnRPcmRlcmVkKHJlc3VsdDogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiwgaUluc2VydGVkTWVtYmVyOiBJRk1hdGNoLmNvbnRleHQsIGxpbWl0OiBudW1iZXIpOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICAvLyBUT0RPOiB1c2Ugc29tZSB3ZWlnaHRcclxuICBpZiAocmVzdWx0Lmxlbmd0aCA8IGxpbWl0KSB7XHJcbiAgICByZXN1bHQucHVzaChpSW5zZXJ0ZWRNZW1iZXIpXHJcbiAgfVxyXG4gIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdGFrZVRvcE4oYXJyOiBBcnJheTxBcnJheTxJRk1hdGNoLmNvbnRleHQ+Pik6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIHZhciB1ID0gYXJyLmZpbHRlcihmdW5jdGlvbiAoaW5uZXJBcnIpIHsgcmV0dXJuIGlubmVyQXJyLmxlbmd0aCA+IDAgfSlcclxuXHJcbiAgdmFyIHJlcyA9IFtdO1xyXG4gIC8vIHNoaWZ0IG91dCB0aGUgdG9wIG9uZXNcclxuICB1ID0gdS5tYXAoZnVuY3Rpb24gKGlBcnIpIHtcclxuICAgIHZhciB0b3AgPSBpQXJyLnNoaWZ0KCk7XHJcbiAgICByZXMgPSBpbnNlcnRPcmRlcmVkKHJlcywgdG9wLCA1KVxyXG4gICAgcmV0dXJuIGlBcnJcclxuICB9KS5maWx0ZXIoZnVuY3Rpb24gKGlubmVyQXJyOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+KTogYm9vbGVhbiB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwIH0pO1xyXG4gIC8vIGFzIEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuaW1wb3J0ICogYXMgaW5wdXRGaWx0ZXJSdWxlcyBmcm9tICcuL2lucHV0RmlsdGVyUnVsZXMnO1xyXG5cclxudmFyIHJtO1xyXG5cclxuZnVuY3Rpb24gZ2V0Uk1PbmNlKCkge1xyXG4gIGlmICghcm0pIHtcclxuICAgIHJtID0gaW5wdXRGaWx0ZXJSdWxlcy5nZXRSdWxlTWFwKClcclxuICB9XHJcbiAgcmV0dXJuIHJtO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlSdWxlcyhjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQpOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICB2YXIgYmVzdE46IEFycmF5PElGTWF0Y2guY29udGV4dD4gPSBbY29udGV4dF07XHJcbiAgaW5wdXRGaWx0ZXJSdWxlcy5vS2V5T3JkZXIuZm9yRWFjaChmdW5jdGlvbiAoc0tleTogc3RyaW5nKSB7XHJcbiAgICB2YXIgYmVzdE5leHQ6IEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+ID0gW107XHJcbiAgICBiZXN0Ti5mb3JFYWNoKGZ1bmN0aW9uIChvQ29udGV4dDogSUZNYXRjaC5jb250ZXh0KSB7XHJcbiAgICAgIGlmIChvQ29udGV4dFtzS2V5XSkge1xyXG4gICAgICAgIGRlYnVnbG9nKCcqKiBhcHBseWluZyBydWxlcyBmb3IgJyArIHNLZXkpXHJcbiAgICAgICAgdmFyIHJlcyA9IGF1Z21lbnRDb250ZXh0KG9Db250ZXh0LCBnZXRSTU9uY2UoKVtzS2V5XSB8fCBbXSlcclxuICAgICAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKCcqKiByZXN1bHQgZm9yICcgKyBzS2V5ICsgJyA9ICcgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpOiAnLScpO1xyXG4gICAgICAgIGJlc3ROZXh0LnB1c2gocmVzIHx8IFtdKVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIHJ1bGUgbm90IHJlbGV2YW50XHJcbiAgICAgICAgYmVzdE5leHQucHVzaChbb0NvbnRleHRdKTtcclxuICAgICAgfVxyXG4gICAgfSlcclxuICAgIGJlc3ROID0gdGFrZVRvcE4oYmVzdE5leHQpO1xyXG4gIH0pO1xyXG4gIHJldHVybiBiZXN0TlxyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UnVsZXNQaWNrRmlyc3QoY29udGV4dDogSUZNYXRjaC5jb250ZXh0KTogSUZNYXRjaC5jb250ZXh0IHtcclxuICB2YXIgciA9IGFwcGx5UnVsZXMoY29udGV4dCk7XHJcbiAgcmV0dXJuIHIgJiYgclswXTtcclxufVxyXG5cclxuLyoqXHJcbiAqIERlY2lkZSB3aGV0aGVyIHRvIHJlcXVlcnkgZm9yIGEgY29udGV0XHJcbiAqL1xyXG4vL2V4cG9ydCBmdW5jdGlvbiBkZWNpZGVPblJlUXVlcnkoY29udGV4dDogSUZNYXRjaC5jb250ZXh0KTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbi8vICByZXR1cm4gW11cclxuLy99XHJcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
