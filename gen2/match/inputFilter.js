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
function checkOneRuleWithOffset(string, lcString, exact, res, oRule, cntRec) {
    if (debuglogV.enabled) {
        debuglogV('attempting to match rule ' + JSON.stringify(oRule) + " to string \"" + string + "\"");
    }
    switch (oRule.type) {
        case 0 /* WORD */:
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
        case 1 /* REGEXP */:
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
function categorizeAWordWithOffsets(sWordGroup, rules, sentence, words, cntRec) {
    var seenIt = words[sWordGroup];
    if (seenIt === undefined) {
        seenIt = categorizeWordWithOffsetWithRankCutoff(sWordGroup, rules, cntRec);
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
exports.categorizeAWordWithOffsets = categorizeAWordWithOffsets;
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
//export function decideOnReQuery(context: IFMatch.context): Array<IFMatch.context> {
//  return []
//}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1hdGNoL2lucHV0RmlsdGVyLmpzIiwiLi4vc3JjL21hdGNoL2lucHV0RmlsdGVyLnRzIl0sIm5hbWVzIjpbImRpc3RhbmNlIiwicmVxdWlyZSIsIkxvZ2dlciIsImxvZ2dlciIsImRlYnVnIiwiZGVidWdwZXJmIiwidXRpbHMiLCJBbGdvbCIsImJyZWFrZG93biIsIkFueU9iamVjdCIsIk9iamVjdCIsImRlYnVnbG9nIiwiZGVidWdsb2dWIiwiZGVidWdsb2dNIiwibW9ja0RlYnVnIiwibyIsImV4cG9ydHMiLCJtYXRjaGRhdGEiLCJvVW5pdFRlc3RzIiwiY2FsY0Rpc3RhbmNlIiwic1RleHQxIiwic1RleHQyIiwiY2FsY0Rpc3RhbmNlQWRqdXN0ZWQiLCJJRk1hdGNoIiwibGV2ZW5QZW5hbHR5IiwiaSIsIm5vblByaXZhdGVLZXlzIiwib0EiLCJrZXlzIiwiZmlsdGVyIiwia2V5IiwiY291bnRBaW5CIiwib0IiLCJmbkNvbXBhcmUiLCJhS2V5SWdub3JlIiwiQXJyYXkiLCJpc0FycmF5IiwiaW5kZXhPZiIsInJlZHVjZSIsInByZXYiLCJwcm90b3R5cGUiLCJoYXNPd25Qcm9wZXJ0eSIsImNhbGwiLCJzcHVyaW91c0Fub3RJbkIiLCJsb3dlckNhc2UiLCJ0b0xvd2VyQ2FzZSIsImNvbXBhcmVDb250ZXh0IiwiZXF1YWwiLCJhIiwiYiIsImRpZmZlcmVudCIsInNwdXJpb3VzTCIsInNwdXJpb3VzUiIsInNvcnRCeVJhbmsiLCJyIiwiX3JhbmtpbmciLCJjYXRlZ29yeSIsImxvY2FsZUNvbXBhcmUiLCJtYXRjaGVkU3RyaW5nIiwiY2hlY2tPbmVSdWxlIiwic3RyaW5nIiwibGNTdHJpbmciLCJleGFjdCIsInJlcyIsIm9SdWxlIiwiY250UmVjIiwiZW5hYmxlZCIsIkpTT04iLCJzdHJpbmdpZnkiLCJ0eXBlIiwibG93ZXJjYXNld29yZCIsIkVycm9yIiwidW5kZWZpbmVkIiwid29yZCIsInB1c2giLCJleGFjdE9ubHkiLCJsZXZlbm1hdGNoIiwiQ3V0b2ZmX1dvcmRNYXRjaCIsImFkZENudFJlYyIsInJlYyIsInRvRml4ZWQiLCJtIiwicmVnZXhwIiwiZXhlYyIsIm1hdGNoSW5kZXgiLCJjaGVja09uZVJ1bGVXaXRoT2Zmc2V0IiwicnVsZSIsIm1lbWJlciIsIm51bWJlciIsImNhdGVnb3JpemVTdHJpbmciLCJvUnVsZXMiLCJmb3JFYWNoIiwic29ydCIsImNhdGVnb3JpemVTaW5nbGVXb3JkV2l0aE9mZnNldCIsImxjd29yZCIsImxlbmd0aCIsInBvc3RGaWx0ZXIiLCJiZXN0UmFuayIsIm1hcCIsImluZGV4Iiwiam9pbiIsInJlc3giLCJkZWx0YSIsInBvc3RGaWx0ZXJXaXRoT2Zmc2V0IiwicmFuZ2UiLCJjYXRlZ29yaXplU3RyaW5nMiIsInJ1bGVzIiwid29yZE1hcCIsIm5vbldvcmRSdWxlcyIsImFsbFJ1bGVzIiwiY2F0ZWdvcml6ZVdvcmRJbnRlcm5hbFdpdGhPZmZzZXRzIiwicnIiLCJtYXRjaFdvcmQiLCJjb250ZXh0Iiwib3B0aW9ucyIsInMxIiwiczIiLCJmb2xsb3dzIiwibWF0Y2hvdGhlcnMiLCJjIiwiYXNzaWduIiwib3ZlcnJpZGUiLCJfd2VpZ2h0IiwiZnJlZXplIiwiZXh0cmFjdEFyZ3NNYXAiLCJtYXRjaCIsImFyZ3NNYXAiLCJpS2V5IiwidmFsdWUiLCJSYW5rV29yZCIsImhhc0Fib3ZlIiwibHN0IiwiYm9yZGVyIiwiZXZlcnkiLCJvTWVtYmVyIiwidGFrZUZpcnN0TiIsIm4iLCJsYXN0UmFua2luZyIsImNudFJhbmdlZCIsImlJbmRleCIsImlzUmFuZ2VkIiwidGFrZUFib3ZlIiwiY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZiIsInNXb3JkR3JvdXAiLCJzcGxpdFJ1bGVzIiwic2Vlbkl0IiwiVG9wX05fV29yZENhdGVnb3JpemF0aW9ucyIsImNhdGVnb3JpemVXb3JkV2l0aE9mZnNldFdpdGhSYW5rQ3V0b2ZmIiwic1dvcmRHcm91cExDIiwib2JqIiwiY2F0ZWdvcml6ZVdvcmRXaXRoT2Zmc2V0V2l0aFJhbmtDdXRvZmZTaW5nbGUiLCJjYXRlZ29yaXplQVdvcmQiLCJzZW50ZW5jZSIsIndvcmRzIiwiZGVlcEZyZWV6ZSIsImNsb25lRGVlcCIsImFuYWx5emVTdHJpbmciLCJzU3RyaW5nIiwiY250IiwiZmFjIiwidSIsImJyZWFrZG93blN0cmluZyIsIk1heFNwYWNlc1BlckNvbWJpbmVkV29yZCIsImFCcmVha0Rvd25TZW50ZW5jZSIsImNhdGVnb3JpemVkU2VudGVuY2UiLCJpc1ZhbGlkIiwiY2F0ZWdvcml6ZUFXb3JkV2l0aE9mZnNldHMiLCJjbG9uZSIsImNvcHlWZWNNZW1iZXJzIiwiZXhwYW5kTWF0Y2hBcnIiLCJkZWVwIiwibGluZSIsInVCcmVha0Rvd25MaW5lIiwiYVdvcmRHcm91cCIsIndnSW5kZXgiLCJvV29yZFZhcmlhbnQiLCJpV1ZJbmRleCIsIm52ZWNzIiwidmVjcyIsInJ2ZWMiLCJrIiwibmV4dEJhc2UiLCJsIiwic2xpY2UiLCJjb25jYXQiLCJyZWluZm9yY2VEaXN0V2VpZ2h0IiwiZGlzdCIsImFicyIsIk1hdGgiLCJhUmVpbmZvcmNlRGlzdFdlaWdodCIsImV4dHJhY3RDYXRlZ29yeU1hcCIsIm9TZW50ZW5jZSIsIm9Xb3JkIiwiQ0FUX0NBVEVHT1JZIiwicG9zIiwicmVpbkZvcmNlU2VudGVuY2UiLCJvQ2F0ZWdvcnlNYXAiLCJvUG9zaXRpb24iLCJyZWluZm9yY2UiLCJib29zdCIsIlNlbnRlbmNlIiwicmVpbkZvcmNlIiwiYUNhdGVnb3JpemVkQXJyYXkiLCJjbXBSYW5raW5nUHJvZHVjdCIsInJhbmtpbmdQcm9kdWN0IiwibWF0Y2hSZWdFeHAiLCJzS2V5IiwicmVnIiwib0V4dHJhY3RlZENvbnRleHQiLCJzb3J0QnlXZWlnaHQiLCJvQ29udGV4dEEiLCJvQ29udGV4dEIiLCJyYW5raW5nQSIsInBhcnNlRmxvYXQiLCJyYW5raW5nQiIsIndlaWdodEEiLCJ3ZWlnaHRCIiwiYXVnbWVudENvbnRleHQxIiwiaVJ1bGUiLCJvcmVzIiwiYmluZCIsImF1Z21lbnRDb250ZXh0IiwiYVJ1bGVzIiwib3B0aW9uczEiLCJhUmVzIiwib3B0aW9uczIiLCJpbnNlcnRPcmRlcmVkIiwicmVzdWx0IiwiaUluc2VydGVkTWVtYmVyIiwibGltaXQiLCJ0YWtlVG9wTiIsImFyciIsImlubmVyQXJyIiwiaUFyciIsInRvcCIsInNoaWZ0IiwiaW5wdXRGaWx0ZXJSdWxlcyIsInJtIiwiZ2V0Uk1PbmNlIiwiZ2V0UnVsZU1hcCIsImFwcGx5UnVsZXMiLCJiZXN0TiIsIm9LZXlPcmRlciIsImJlc3ROZXh0Iiwib0NvbnRleHQiLCJhcHBseVJ1bGVzUGlja0ZpcnN0Il0sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOzs7Ozs7Ozs7Ozs7Ozs7O0FBZ0JBOztBQUNBLElBQUFBLFdBQUFDLFFBQUEsNkJBQUEsQ0FBQTtBQUVBLElBQUFDLFNBQUFELFFBQUEsaUJBQUEsQ0FBQTtBQUVBLElBQU1FLFNBQVNELE9BQU9DLE1BQVAsQ0FBYyxhQUFkLENBQWY7QUFFQSxJQUFBQyxRQUFBSCxRQUFBLE9BQUEsQ0FBQTtBQUNBLElBQUlJLFlBQVlELE1BQU0sTUFBTixDQUFoQjtBQUVBLElBQUFFLFFBQUFMLFFBQUEsZ0JBQUEsQ0FBQTtBQUdBLElBQUFNLFFBQUFOLFFBQUEsU0FBQSxDQUFBO0FBSUEsSUFBQU8sWUFBQVAsUUFBQSxhQUFBLENBQUE7QUFFQSxJQUFNUSxZQUFpQkMsTUFBdkI7QUFFQSxJQUFJQyxXQUFXUCxNQUFNLGFBQU4sQ0FBZjtBQUNBLElBQUlRLFlBQVlSLE1BQU0sY0FBTixDQUFoQjtBQUNBLElBQUlTLFlBQVlULE1BQU0sY0FBTixDQUFoQjtBQUVBLFNBQUFVLFNBQUEsQ0FBMEJDLENBQTFCLEVBQTJCO0FBQ3pCSixlQUFXSSxDQUFYO0FBQ0FILGdCQUFZRyxDQUFaO0FBQ0FGLGdCQUFZRSxDQUFaO0FBQ0Q7QUFKREMsUUFBQUYsU0FBQSxHQUFBQSxTQUFBO0FBT0EsSUFBQUcsWUFBQWhCLFFBQUEsYUFBQSxDQUFBO0FBQ0EsSUFBSWlCLGFBQWFELFVBQVVDLFVBQTNCO0FBSUE7Ozs7OztBQU1BLFNBQUFDLFlB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VXlKLFFBQVYsRUFBbUM7QUFDL0MsZ0JBQUlBLFNBQVN0QyxJQUFULENBQUosRUFBb0I7QUFDbEJuTSx5QkFBUywyQkFBMkJtTSxJQUFwQztBQUNBLG9CQUFJL0ksTUFBTThKLGVBQWV1QixRQUFmLEVBQXlCTixZQUFZaEMsSUFBWixLQUFxQixFQUE5QyxDQUFWO0FBQ0FuTSx5QkFBU0EsU0FBU3VELE9BQVQsR0FBb0IsbUJBQW1CNEksSUFBbkIsR0FBMEIsS0FBMUIsR0FBa0MzSSxLQUFLQyxTQUFMLENBQWVMLEdBQWYsRUFBb0JTLFNBQXBCLEVBQStCLENBQS9CLENBQXRELEdBQTBGLEdBQW5HO0FBQ0EySyx5QkFBU3pLLElBQVQsQ0FBY1gsT0FBTyxFQUFyQjtBQUNELGFBTEQsTUFLTztBQUNMO0FBQ0FvTCx5QkFBU3pLLElBQVQsQ0FBYyxDQUFDMEssUUFBRCxDQUFkO0FBQ0Q7QUFDRixTQVZEO0FBV0FILGdCQUFRWCxTQUFTYSxRQUFULENBQVI7QUFDRCxLQWREO0FBZUEsV0FBT0YsS0FBUDtBQUNEO0FBbEJEak8sUUFBQWdPLFVBQUEsR0FBQUEsVUFBQTtBQXFCQSxTQUFBSyxtQkFBQSxDQUFvQ3BJLE9BQXBDLEVBQTREO0FBQzFELFFBQUkzRCxJQUFJMEwsV0FBVy9ILE9BQVgsQ0FBUjtBQUNBLFdBQU8zRCxLQUFLQSxFQUFFLENBQUYsQ0FBWjtBQUNEO0FBSER0QyxRQUFBcU8sbUJBQUEsR0FBQUEsbUJBQUE7QUFLQTs7O0FBR0E7QUFDQTtBQUNBIiwiZmlsZSI6Im1hdGNoL2lucHV0RmlsdGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XG4vKipcbiAqIHRoZSBpbnB1dCBmaWx0ZXIgc3RhZ2UgcHJlcHJvY2Vzc2VzIGEgY3VycmVudCBjb250ZXh0XG4gKlxuICogSXQgYSkgY29tYmluZXMgbXVsdGktc2VnbWVudCBhcmd1bWVudHMgaW50byBvbmUgY29udGV4dCBtZW1iZXJzXG4gKiBJdCBiKSBhdHRlbXB0cyB0byBhdWdtZW50IHRoZSBjb250ZXh0IGJ5IGFkZGl0aW9uYWwgcXVhbGlmaWNhdGlvbnNcbiAqICAgICAgICAgICAoTWlkIHRlcm0gZ2VuZXJhdGluZyBBbHRlcm5hdGl2ZXMsIGUuZy5cbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiB1bml0IHRlc3Q/XG4gKiAgICAgICAgICAgICAgICAgQ2xpZW50U2lkZVRhcmdldFJlc29sdXRpb24gLT4gc291cmNlID9cbiAqICAgICAgICAgICApXG4gKiAgU2ltcGxlIHJ1bGVzIGxpa2UgIEludGVudFxuICpcbiAqXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5pbnB1dEZpbHRlclxuICogQGZpbGUgaW5wdXRGaWx0ZXIudHNcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cbiAqL1xuLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vbGliL25vZGUtNC5kLnRzXCIgLz5cbnZhciBkaXN0YW5jZSA9IHJlcXVpcmUoXCIuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW5cIik7XG52YXIgTG9nZ2VyID0gcmVxdWlyZShcIi4uL3V0aWxzL2xvZ2dlclwiKTtcbnZhciBsb2dnZXIgPSBMb2dnZXIubG9nZ2VyKCdpbnB1dEZpbHRlcicpO1xudmFyIGRlYnVnID0gcmVxdWlyZShcImRlYnVnXCIpO1xudmFyIGRlYnVncGVyZiA9IGRlYnVnKCdwZXJmJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKFwiLi4vdXRpbHMvdXRpbHNcIik7XG52YXIgQWxnb2wgPSByZXF1aXJlKFwiLi9hbGdvbFwiKTtcbnZhciBicmVha2Rvd24gPSByZXF1aXJlKFwiLi9icmVha2Rvd25cIik7XG52YXIgQW55T2JqZWN0ID0gT2JqZWN0O1xudmFyIGRlYnVnbG9nID0gZGVidWcoJ2lucHV0RmlsdGVyJyk7XG52YXIgZGVidWdsb2dWID0gZGVidWcoJ2lucHV0VkZpbHRlcicpO1xudmFyIGRlYnVnbG9nTSA9IGRlYnVnKCdpbnB1dE1GaWx0ZXInKTtcbmZ1bmN0aW9uIG1vY2tEZWJ1ZyhvKSB7XG4gICAgZGVidWdsb2cgPSBvO1xuICAgIGRlYnVnbG9nViA9IG87XG4gICAgZGVidWdsb2dNID0gbztcbn1cbmV4cG9ydHMubW9ja0RlYnVnID0gbW9ja0RlYnVnO1xudmFyIG1hdGNoZGF0YSA9IHJlcXVpcmUoXCIuL21hdGNoZGF0YVwiKTtcbnZhciBvVW5pdFRlc3RzID0gbWF0Y2hkYXRhLm9Vbml0VGVzdHM7XG4vKipcbiAqIEBwYXJhbSBzVGV4dCB7c3RyaW5nfSB0aGUgdGV4dCB0byBtYXRjaCB0byBOYXZUYXJnZXRSZXNvbHV0aW9uXG4gKiBAcGFyYW0gc1RleHQyIHtzdHJpbmd9IHRoZSBxdWVyeSB0ZXh0LCBlLmcuIE5hdlRhcmdldFxuICpcbiAqIEByZXR1cm4gdGhlIGRpc3RhbmNlLCBub3RlIHRoYXQgaXMgaXMgKm5vdCogc3ltbWV0cmljIVxuICovXG5mdW5jdGlvbiBjYWxjRGlzdGFuY2Uoc1RleHQxLCBzVGV4dDIpIHtcbiAgICByZXR1cm4gZGlzdGFuY2UuY2FsY0Rpc3RhbmNlQWRqdXN0ZWQoc1RleHQxLCBzVGV4dDIpO1xufVxuZXhwb3J0cy5jYWxjRGlzdGFuY2UgPSBjYWxjRGlzdGFuY2U7XG4vKipcbiAqIEBwYXJhbSBzVGV4dCB7c3RyaW5nfSB0aGUgdGV4dCB0byBtYXRjaCB0byBOYXZUYXJnZXRSZXNvbHV0aW9uXG4gKiBAcGFyYW0gc1RleHQyIHtzdHJpbmd9IHRoZSBxdWVyeSB0ZXh0LCBlLmcuIE5hdlRhcmdldFxuICpcbiAqIEByZXR1cm4gdGhlIGRpc3RhbmNlLCBub3RlIHRoYXQgaXMgaXMgKm5vdCogc3ltbWV0cmljIVxuICovXG4vKlxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNEaXN0YW5jZUxldmVuWFhYKHNUZXh0MTogc3RyaW5nLCBzVGV4dDI6IHN0cmluZyk6IG51bWJlciB7XG4gIC8vIGNvbnNvbGUubG9nKFwibGVuZ3RoMlwiICsgc1RleHQxICsgXCIgLSBcIiArIHNUZXh0MilcbiAgIGlmKCgoc1RleHQxLmxlbmd0aCAtIHNUZXh0Mi5sZW5ndGgpID4gQWxnb2wuY2FsY0Rpc3QubGVuZ3RoRGVsdGExKVxuICAgIHx8IChzVGV4dDIubGVuZ3RoID4gMS41ICogc1RleHQxLmxlbmd0aCApXG4gICAgfHwgKHNUZXh0Mi5sZW5ndGggPCAoc1RleHQxLmxlbmd0aC8yKSkgKSB7XG4gICAgcmV0dXJuIDUwMDAwO1xuICB9XG4gIHZhciBhMCA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCksIHNUZXh0MilcbiAgaWYoZGVidWdsb2dWLmVuYWJsZWQpIHtcbiAgICBkZWJ1Z2xvZ1YoXCJkaXN0YW5jZVwiICsgYTAgKyBcInN0cmlwcGVkPlwiICsgc1RleHQxLnN1YnN0cmluZygwLHNUZXh0Mi5sZW5ndGgpICsgXCI8PlwiICsgc1RleHQyKyBcIjxcIik7XG4gIH1cbiAgaWYoYTAgKiA1MCA+IDE1ICogc1RleHQyLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIDQwMDAwO1xuICB9XG4gIHZhciBhID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLCBzVGV4dDIpXG4gIHJldHVybiBhMCAqIDUwMCAvIHNUZXh0Mi5sZW5ndGggKyBhXG59XG4qL1xudmFyIElGTWF0Y2ggPSByZXF1aXJlKFwiLi4vbWF0Y2gvaWZtYXRjaFwiKTtcbi8vY29uc3QgbGV2ZW5DdXRvZmYgPSBBbGdvbC5DdXRvZmZfTGV2ZW5TaHRlaW47XG4vKlxuZXhwb3J0IGZ1bmN0aW9uIGxldmVuUGVuYWx0eU9sZChpOiBudW1iZXIpOiBudW1iZXIge1xuICAvLyAwLT4gMVxuICAvLyAxIC0+IDAuMVxuICAvLyAxNTAgLT4gIDAuOFxuICBpZiAoaSA9PT0gMCkge1xuICAgIHJldHVybiAxO1xuICB9XG4gIC8vIHJldmVyc2UgbWF5IGJlIGJldHRlciB0aGFuIGxpbmVhclxuICByZXR1cm4gMSArIGkgKiAoMC44IC0gMSkgLyAxNTBcbn1cbiovXG5mdW5jdGlvbiBsZXZlblBlbmFsdHkoaSkge1xuICAgIC8vIDEgLT4gMVxuICAgIC8vIGN1dE9mZiA9PiAwLjhcbiAgICByZXR1cm4gaTtcbiAgICAvL3JldHVybiAgIDEgLSAgKDEgLSBpKSAqMC4yL0FsZ29sLkN1dG9mZl9Xb3JkTWF0Y2g7XG59XG5leHBvcnRzLmxldmVuUGVuYWx0eSA9IGxldmVuUGVuYWx0eTtcbmZ1bmN0aW9uIG5vblByaXZhdGVLZXlzKG9BKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4ga2V5WzBdICE9PSAnXyc7XG4gICAgfSk7XG59XG5mdW5jdGlvbiBjb3VudEFpbkIob0EsIG9CLCBmbkNvbXBhcmUsIGFLZXlJZ25vcmUpIHtcbiAgICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxuICAgICAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xuICAgIGZuQ29tcGFyZSA9IGZuQ29tcGFyZSB8fCBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcbiAgICB9KS5cbiAgICAgICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xuICAgICAgICAgICAgcHJldiA9IHByZXYgKyAoZm5Db21wYXJlKG9BW2tleV0sIG9CW2tleV0sIGtleSkgPyAxIDogMCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG59XG5leHBvcnRzLmNvdW50QWluQiA9IGNvdW50QWluQjtcbmZ1bmN0aW9uIHNwdXJpb3VzQW5vdEluQihvQSwgb0IsIGFLZXlJZ25vcmUpIHtcbiAgICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxuICAgICAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xuICAgIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcbiAgICB9KS5cbiAgICAgICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbn1cbmV4cG9ydHMuc3B1cmlvdXNBbm90SW5CID0gc3B1cmlvdXNBbm90SW5CO1xuZnVuY3Rpb24gbG93ZXJDYXNlKG8pIHtcbiAgICBpZiAodHlwZW9mIG8gPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgcmV0dXJuIG8udG9Mb3dlckNhc2UoKTtcbiAgICB9XG4gICAgcmV0dXJuIG87XG59XG5mdW5jdGlvbiBjb21wYXJlQ29udGV4dChvQSwgb0IsIGFLZXlJZ25vcmUpIHtcbiAgICB2YXIgZXF1YWwgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpID09PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xuICAgIHZhciBkaWZmZXJlbnQgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpICE9PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xuICAgIHZhciBzcHVyaW91c0wgPSBzcHVyaW91c0Fub3RJbkIob0EsIG9CLCBhS2V5SWdub3JlKTtcbiAgICB2YXIgc3B1cmlvdXNSID0gc3B1cmlvdXNBbm90SW5CKG9CLCBvQSwgYUtleUlnbm9yZSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZXF1YWw6IGVxdWFsLFxuICAgICAgICBkaWZmZXJlbnQ6IGRpZmZlcmVudCxcbiAgICAgICAgc3B1cmlvdXNMOiBzcHVyaW91c0wsXG4gICAgICAgIHNwdXJpb3VzUjogc3B1cmlvdXNSXG4gICAgfTtcbn1cbmV4cG9ydHMuY29tcGFyZUNvbnRleHQgPSBjb21wYXJlQ29udGV4dDtcbmZ1bmN0aW9uIHNvcnRCeVJhbmsoYSwgYikge1xuICAgIHZhciByID0gLSgoYS5fcmFua2luZyB8fCAxLjApIC0gKGIuX3JhbmtpbmcgfHwgMS4wKSk7XG4gICAgaWYgKHIpIHtcbiAgICAgICAgcmV0dXJuIHI7XG4gICAgfVxuICAgIGlmIChhLmNhdGVnb3J5ICYmIGIuY2F0ZWdvcnkpIHtcbiAgICAgICAgciA9IGEuY2F0ZWdvcnkubG9jYWxlQ29tcGFyZShiLmNhdGVnb3J5KTtcbiAgICAgICAgaWYgKHIpIHtcbiAgICAgICAgICAgIHJldHVybiByO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChhLm1hdGNoZWRTdHJpbmcgJiYgYi5tYXRjaGVkU3RyaW5nKSB7XG4gICAgICAgIHIgPSBhLm1hdGNoZWRTdHJpbmcubG9jYWxlQ29tcGFyZShiLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICBpZiAocikge1xuICAgICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIDA7XG59XG5mdW5jdGlvbiBjaGVja09uZVJ1bGUoc3RyaW5nLCBsY1N0cmluZywgZXhhY3QsIHJlcywgb1J1bGUsIGNudFJlYykge1xuICAgIGlmIChkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZ1YoJ2F0dGVtcHRpbmcgdG8gbWF0Y2ggcnVsZSAnICsgSlNPTi5zdHJpbmdpZnkob1J1bGUpICsgXCIgdG8gc3RyaW5nIFxcXCJcIiArIHN0cmluZyArIFwiXFxcIlwiKTtcbiAgICB9XG4gICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XG4gICAgICAgIGNhc2UgMCAvKiBXT1JEICovOlxuICAgICAgICAgICAgaWYgKCFvUnVsZS5sb3dlcmNhc2V3b3JkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdydWxlIHdpdGhvdXQgYSBsb3dlcmNhc2UgdmFyaWFudCcgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICA7XG4gICAgICAgICAgICBpZiAoZXhhY3QgJiYgb1J1bGUud29yZCA9PT0gc3RyaW5nIHx8IG9SdWxlLmxvd2VyY2FzZXdvcmQgPT09IGxjU3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVidWdsb2coXCJcXG4hbWF0Y2hlZCBleGFjdCBcIiArIHN0cmluZyArIFwiPVwiICsgb1J1bGUubG93ZXJjYXNld29yZCArIFwiID0+IFwiICsgb1J1bGUubWF0Y2hlZFN0cmluZyArIFwiL1wiICsgb1J1bGUuY2F0ZWdvcnkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBvUnVsZS5tYXRjaGVkU3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghZXhhY3QgJiYgIW9SdWxlLmV4YWN0T25seSkge1xuICAgICAgICAgICAgICAgIHZhciBsZXZlbm1hdGNoID0gY2FsY0Rpc3RhbmNlKG9SdWxlLmxvd2VyY2FzZXdvcmQsIGxjU3RyaW5nKTtcbiAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlXCIsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICBpZihsZXZlbm1hdGNoIDwgNTApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlRXhwXCIsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGxldmVubWF0Y2ggPCA0MDAwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VCZWxvdzQwa1wiLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIC8vaWYob1J1bGUubG93ZXJjYXNld29yZCA9PT0gXCJjb3Ntb3NcIikge1xuICAgICAgICAgICAgICAgIC8vICBjb25zb2xlLmxvZyhcImhlcmUgcmFua2luZyBcIiArIGxldmVubWF0Y2ggKyBcIiBcIiArIG9SdWxlLmxvd2VyY2FzZXdvcmQgKyBcIiBcIiArIGxjU3RyaW5nKTtcbiAgICAgICAgICAgICAgICAvL31cbiAgICAgICAgICAgICAgICBpZiAobGV2ZW5tYXRjaCA+PSBBbGdvbC5DdXRvZmZfV29yZE1hdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsIFwiY2FsY0Rpc3RhbmNlT2tcIiwgMSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZWMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgICAgICBfcmFua2luZzogKG9SdWxlLl9yYW5raW5nIHx8IDEuMCkgKiBsZXZlblBlbmFsdHkobGV2ZW5tYXRjaCksXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXZlbm1hdGNoOiBsZXZlbm1hdGNoXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIGlmIChkZWJ1Z2xvZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVidWdsb2coXCJcXG4hZnV6enkgXCIgKyAobGV2ZW5tYXRjaCkudG9GaXhlZCgzKSArIFwiIFwiICsgcmVjLl9yYW5raW5nLnRvRml4ZWQoMykgKyBcIiAgXCIgKyBzdHJpbmcgKyBcIj1cIiArIG9SdWxlLmxvd2VyY2FzZXdvcmQgKyBcIiA9PiBcIiArIG9SdWxlLm1hdGNoZWRTdHJpbmcgKyBcIi9cIiArIG9SdWxlLmNhdGVnb3J5KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXMucHVzaChyZWMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDEgLyogUkVHRVhQICovOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KFwiIGhlcmUgcmVnZXhwXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgbSA9IG9SdWxlLnJlZ2V4cC5leGVjKHN0cmluZyk7XG4gICAgICAgICAgICAgICAgaWYgKG0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiAob1J1bGUubWF0Y2hJbmRleCAhPT0gdW5kZWZpbmVkICYmIG1bb1J1bGUubWF0Y2hJbmRleF0pIHx8IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmtub3duIHR5cGVcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG59XG5leHBvcnRzLmNoZWNrT25lUnVsZSA9IGNoZWNrT25lUnVsZTtcbmZ1bmN0aW9uIGNoZWNrT25lUnVsZVdpdGhPZmZzZXQoc3RyaW5nLCBsY1N0cmluZywgZXhhY3QsIHJlcywgb1J1bGUsIGNudFJlYykge1xuICAgIGlmIChkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZ1YoJ2F0dGVtcHRpbmcgdG8gbWF0Y2ggcnVsZSAnICsgSlNPTi5zdHJpbmdpZnkob1J1bGUpICsgXCIgdG8gc3RyaW5nIFxcXCJcIiArIHN0cmluZyArIFwiXFxcIlwiKTtcbiAgICB9XG4gICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XG4gICAgICAgIGNhc2UgMCAvKiBXT1JEICovOlxuICAgICAgICAgICAgaWYgKCFvUnVsZS5sb3dlcmNhc2V3b3JkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdydWxlIHdpdGhvdXQgYSBsb3dlcmNhc2UgdmFyaWFudCcgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICA7XG4gICAgICAgICAgICBpZiAoZXhhY3QgJiYgKG9SdWxlLndvcmQgPT09IHN0cmluZyB8fCBvUnVsZS5sb3dlcmNhc2V3b3JkID09PSBsY1N0cmluZykpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcIlxcbiFtYXRjaGVkIGV4YWN0IFwiICsgc3RyaW5nICsgXCI9XCIgKyBvUnVsZS5sb3dlcmNhc2V3b3JkICsgXCIgPT4gXCIgKyBvUnVsZS5tYXRjaGVkU3RyaW5nICsgXCIvXCIgKyBvUnVsZS5jYXRlZ29yeSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgcnVsZTogb1J1bGUsXG4gICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghZXhhY3QgJiYgIW9SdWxlLmV4YWN0T25seSkge1xuICAgICAgICAgICAgICAgIHZhciBsZXZlbm1hdGNoID0gY2FsY0Rpc3RhbmNlKG9SdWxlLmxvd2VyY2FzZXdvcmQsIGxjU3RyaW5nKTtcbiAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlXCIsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICBpZihsZXZlbm1hdGNoIDwgNTApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlRXhwXCIsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGxldmVubWF0Y2ggPCA0MDAwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VCZWxvdzQwa1wiLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIC8vaWYob1J1bGUubG93ZXJjYXNld29yZCA9PT0gXCJjb3Ntb3NcIikge1xuICAgICAgICAgICAgICAgIC8vICBjb25zb2xlLmxvZyhcImhlcmUgcmFua2luZyBcIiArIGxldmVubWF0Y2ggKyBcIiBcIiArIG9SdWxlLmxvd2VyY2FzZXdvcmQgKyBcIiBcIiArIGxjU3RyaW5nKTtcbiAgICAgICAgICAgICAgICAvL31cbiAgICAgICAgICAgICAgICBpZiAobGV2ZW5tYXRjaCA+PSBBbGdvbC5DdXRvZmZfV29yZE1hdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJmb3VuZCByZWNcIik7XG4gICAgICAgICAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsIFwiY2FsY0Rpc3RhbmNlT2tcIiwgMSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZWMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bGU6IG9SdWxlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiAob1J1bGUuX3JhbmtpbmcgfHwgMS4wKSAqIGxldmVuUGVuYWx0eShsZXZlbm1hdGNoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldmVubWF0Y2g6IGxldmVubWF0Y2hcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlYnVnbG9nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcIlxcbiFDT1JPOiBmdXp6eSBcIiArIChsZXZlbm1hdGNoKS50b0ZpeGVkKDMpICsgXCIgXCIgKyByZWMuX3JhbmtpbmcudG9GaXhlZCgzKSArIFwiICBcXFwiXCIgKyBzdHJpbmcgKyBcIlxcXCI9XCIgKyBvUnVsZS5sb3dlcmNhc2V3b3JkICsgXCIgPT4gXCIgKyBvUnVsZS5tYXRjaGVkU3RyaW5nICsgXCIvXCIgKyBvUnVsZS5jYXRlZ29yeSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmVzLnB1c2gocmVjKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAxIC8qIFJFR0VYUCAqLzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShcIiBoZXJlIHJlZ2V4cFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUsIHVuZGVmaW5lZCwgMikpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIG0gPSBvUnVsZS5yZWdleHAuZXhlYyhzdHJpbmcpO1xuICAgICAgICAgICAgICAgIGlmIChtKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcnVsZTogb1J1bGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiAob1J1bGUubWF0Y2hJbmRleCAhPT0gdW5kZWZpbmVkICYmIG1bb1J1bGUubWF0Y2hJbmRleF0pIHx8IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmtub3duIHR5cGVcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG59XG5leHBvcnRzLmNoZWNrT25lUnVsZVdpdGhPZmZzZXQgPSBjaGVja09uZVJ1bGVXaXRoT2Zmc2V0O1xuO1xuZnVuY3Rpb24gYWRkQ250UmVjKGNudFJlYywgbWVtYmVyLCBudW1iZXIpIHtcbiAgICBpZiAoKCFjbnRSZWMpIHx8IChudW1iZXIgPT09IDApKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY250UmVjW21lbWJlcl0gPSAoY250UmVjW21lbWJlcl0gfHwgMCkgKyBudW1iZXI7XG59XG5mdW5jdGlvbiBjYXRlZ29yaXplU3RyaW5nKHdvcmQsIGV4YWN0LCBvUnVsZXMsIGNudFJlYykge1xuICAgIC8vIHNpbXBseSBhcHBseSBhbGwgcnVsZXNcbiAgICBpZiAoZGVidWdsb2dNLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2dNKFwicnVsZXMgOiBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHZhciBsY1N0cmluZyA9IHdvcmQudG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgb1J1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgIGNoZWNrT25lUnVsZSh3b3JkLCBsY1N0cmluZywgZXhhY3QsIHJlcywgb1J1bGUsIGNudFJlYyk7XG4gICAgfSk7XG4gICAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZVN0cmluZyA9IGNhdGVnb3JpemVTdHJpbmc7XG5mdW5jdGlvbiBjYXRlZ29yaXplU2luZ2xlV29yZFdpdGhPZmZzZXQod29yZCwgbGN3b3JkLCBleGFjdCwgb1J1bGVzLCBjbnRSZWMpIHtcbiAgICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXG4gICAgaWYgKGRlYnVnbG9nTS5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nTShcInJ1bGVzIDogXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZXMsIHVuZGVmaW5lZCwgMikpO1xuICAgIH1cbiAgICB2YXIgcmVzID0gW107XG4gICAgb1J1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgIGNoZWNrT25lUnVsZVdpdGhPZmZzZXQod29yZCwgbGN3b3JkLCBleGFjdCwgcmVzLCBvUnVsZSwgY250UmVjKTtcbiAgICB9KTtcbiAgICBkZWJ1Z2xvZyhcIkNTV1dPOiBnb3QgcmVzdWx0cyBmb3IgXCIgKyBsY3dvcmQgKyBcIiAgXCIgKyByZXMubGVuZ3RoKTtcbiAgICByZXMuc29ydChzb3J0QnlSYW5rKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5jYXRlZ29yaXplU2luZ2xlV29yZFdpdGhPZmZzZXQgPSBjYXRlZ29yaXplU2luZ2xlV29yZFdpdGhPZmZzZXQ7XG5mdW5jdGlvbiBwb3N0RmlsdGVyKHJlcykge1xuICAgIHJlcy5zb3J0KHNvcnRCeVJhbmspO1xuICAgIHZhciBiZXN0UmFuayA9IDA7XG4gICAgLy9jb25zb2xlLmxvZyhcIlxcbnBpbHRlcmVkIFwiICsgSlNPTi5zdHJpbmdpZnkocmVzKSk7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCJwcmVGaWx0ZXIgOiBcXG5cIiArIHJlcy5tYXAoZnVuY3Rpb24gKHdvcmQsIGluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4gaW5kZXggKyBcIiBcIiArIHdvcmQuX3JhbmtpbmcgKyBcIiAgPT4gXFxcIlwiICsgd29yZC5jYXRlZ29yeSArIFwiXFxcIiBcIiArIHdvcmQubWF0Y2hlZFN0cmluZztcbiAgICAgICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgfVxuICAgIHZhciByID0gcmVzLmZpbHRlcihmdW5jdGlvbiAocmVzeCwgaW5kZXgpIHtcbiAgICAgICAgaWYgKGluZGV4ID09PSAwKSB7XG4gICAgICAgICAgICBiZXN0UmFuayA9IHJlc3guX3Jhbmtpbmc7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyAxLTAuOSA9IDAuMVxuICAgICAgICAvLyAxLSAwLjkzID0gMC43XG4gICAgICAgIC8vIDEvN1xuICAgICAgICB2YXIgZGVsdGEgPSBiZXN0UmFuayAvIHJlc3guX3Jhbmtpbmc7XG4gICAgICAgIGlmICgocmVzeC5tYXRjaGVkU3RyaW5nID09PSByZXNbaW5kZXggLSAxXS5tYXRjaGVkU3RyaW5nKVxuICAgICAgICAgICAgJiYgKHJlc3guY2F0ZWdvcnkgPT09IHJlc1tpbmRleCAtIDFdLmNhdGVnb3J5KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJcXG4gZGVsdGEgZm9yIFwiICsgZGVsdGEgKyBcIiAgXCIgKyByZXN4Ll9yYW5raW5nKTtcbiAgICAgICAgaWYgKHJlc3gubGV2ZW5tYXRjaCAmJiAoZGVsdGEgPiAxLjAzKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiXFxuZmlsdGVyZWQgXCIgKyByLmxlbmd0aCArIFwiL1wiICsgcmVzLmxlbmd0aCArIEpTT04uc3RyaW5naWZ5KHIpKTtcbiAgICB9XG4gICAgcmV0dXJuIHI7XG59XG5leHBvcnRzLnBvc3RGaWx0ZXIgPSBwb3N0RmlsdGVyO1xuZnVuY3Rpb24gcG9zdEZpbHRlcldpdGhPZmZzZXQocmVzKSB7XG4gICAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XG4gICAgdmFyIGJlc3RSYW5rID0gMDtcbiAgICAvL2NvbnNvbGUubG9nKFwiXFxucGlsdGVyZWQgXCIgKyBKU09OLnN0cmluZ2lmeShyZXMpKTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcIiBwcmVGaWx0ZXIgOiBcXG5cIiArIHJlcy5tYXAoZnVuY3Rpb24gKHdvcmQpIHtcbiAgICAgICAgICAgIHJldHVybiBcIiBcIiArIHdvcmQuX3JhbmtpbmcgKyBcIiAgPT4gXFxcIlwiICsgd29yZC5jYXRlZ29yeSArIFwiXFxcIiBcIiArIHdvcmQubWF0Y2hlZFN0cmluZyArIFwiIFwiO1xuICAgICAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgICB9XG4gICAgdmFyIHIgPSByZXMuZmlsdGVyKGZ1bmN0aW9uIChyZXN4LCBpbmRleCkge1xuICAgICAgICBpZiAoaW5kZXggPT09IDApIHtcbiAgICAgICAgICAgIGJlc3RSYW5rID0gcmVzeC5fcmFua2luZztcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vIDEtMC45ID0gMC4xXG4gICAgICAgIC8vIDEtIDAuOTMgPSAwLjdcbiAgICAgICAgLy8gMS83XG4gICAgICAgIHZhciBkZWx0YSA9IGJlc3RSYW5rIC8gcmVzeC5fcmFua2luZztcbiAgICAgICAgaWYgKCEocmVzeC5ydWxlICYmIHJlc3gucnVsZS5yYW5nZSlcbiAgICAgICAgICAgICYmICEocmVzW2luZGV4IC0gMV0ucnVsZSAmJiByZXNbaW5kZXggLSAxXS5ydWxlLnJhbmdlKVxuICAgICAgICAgICAgJiYgKHJlc3gubWF0Y2hlZFN0cmluZyA9PT0gcmVzW2luZGV4IC0gMV0ubWF0Y2hlZFN0cmluZylcbiAgICAgICAgICAgICYmIChyZXN4LmNhdGVnb3J5ID09PSByZXNbaW5kZXggLSAxXS5jYXRlZ29yeSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICAvL2NvbnNvbGUubG9nKFwiXFxuIGRlbHRhIGZvciBcIiArIGRlbHRhICsgXCIgIFwiICsgcmVzeC5fcmFua2luZyk7XG4gICAgICAgIGlmIChyZXN4LmxldmVubWF0Y2ggJiYgKGRlbHRhID4gMS4wMykpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcIlxcbmZpbHRlcmVkIFwiICsgci5sZW5ndGggKyBcIi9cIiArIHJlcy5sZW5ndGggKyBKU09OLnN0cmluZ2lmeShyKSk7XG4gICAgfVxuICAgIHJldHVybiByO1xufVxuZXhwb3J0cy5wb3N0RmlsdGVyV2l0aE9mZnNldCA9IHBvc3RGaWx0ZXJXaXRoT2Zmc2V0O1xuZnVuY3Rpb24gY2F0ZWdvcml6ZVN0cmluZzIod29yZCwgZXhhY3QsIHJ1bGVzLCBjbnRSZWMpIHtcbiAgICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXG4gICAgaWYgKGRlYnVnbG9nTS5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nTShcInJ1bGVzIDogXCIgKyBKU09OLnN0cmluZ2lmeShydWxlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHZhciBsY1N0cmluZyA9IHdvcmQudG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgaWYgKGV4YWN0KSB7XG4gICAgICAgIHZhciByID0gcnVsZXMud29yZE1hcFtsY1N0cmluZ107XG4gICAgICAgIGlmIChyKSB7XG4gICAgICAgICAgICByLnJ1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHdvcmQsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcnVsZXMubm9uV29yZFJ1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgICAgICBjaGVja09uZVJ1bGUod29yZCwgbGNTdHJpbmcsIGV4YWN0LCByZXMsIG9SdWxlLCBjbnRSZWMpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBkZWJ1Z2xvZyhcImNhdGVnb3JpemUgbm9uIGV4YWN0XCIgKyB3b3JkICsgXCIgeHggIFwiICsgcnVsZXMuYWxsUnVsZXMubGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIHBvc3RGaWx0ZXIoY2F0ZWdvcml6ZVN0cmluZyh3b3JkLCBleGFjdCwgcnVsZXMuYWxsUnVsZXMsIGNudFJlYykpO1xuICAgIH1cbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZVN0cmluZzIgPSBjYXRlZ29yaXplU3RyaW5nMjtcbmZ1bmN0aW9uIGNhdGVnb3JpemVXb3JkSW50ZXJuYWxXaXRoT2Zmc2V0cyh3b3JkLCBsY3dvcmQsIGV4YWN0LCBydWxlcywgY250UmVjKSB7XG4gICAgZGVidWdsb2dNKFwiY2F0ZWdvcml6ZSBcIiArIGxjd29yZCArIFwiIHdpdGggb2Zmc2V0ISEhISEhISEhISEhISEhISFcIiArIGV4YWN0KTtcbiAgICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXG4gICAgaWYgKGRlYnVnbG9nTS5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nTShcInJ1bGVzIDogXCIgKyBKU09OLnN0cmluZ2lmeShydWxlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHZhciByZXMgPSBbXTtcbiAgICBpZiAoZXhhY3QpIHtcbiAgICAgICAgdmFyIHIgPSBydWxlcy53b3JkTWFwW2xjd29yZF07XG4gICAgICAgIGlmIChyKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZ00oXCIgLi4uLnB1c2hpbmcgbiBydWxlcyBleGFjdCBmb3IgXCIgKyBsY3dvcmQgKyBcIjpcIiArIHIucnVsZXMubGVuZ3RoKTtcbiAgICAgICAgICAgIGRlYnVnbG9nTShyLnJ1bGVzLm1hcChmdW5jdGlvbiAociwgaW5kZXgpIHsgcmV0dXJuICcnICsgaW5kZXggKyAnICcgKyBKU09OLnN0cmluZ2lmeShyKTsgfSkuam9pbihcIlxcblwiKSk7XG4gICAgICAgICAgICByLnJ1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHdvcmQsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgcnVsZTogb1J1bGUsXG4gICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJ1bGVzLm5vbldvcmRSdWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChvUnVsZSkge1xuICAgICAgICAgICAgY2hlY2tPbmVSdWxlV2l0aE9mZnNldCh3b3JkLCBsY3dvcmQsIGV4YWN0LCByZXMsIG9SdWxlLCBjbnRSZWMpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmVzID0gcG9zdEZpbHRlcldpdGhPZmZzZXQocmVzKTtcbiAgICAgICAgZGVidWdsb2coXCJoZXJlIHJlc3VsdHMgZm9yXCIgKyB3b3JkICsgXCIgcmVzIFwiICsgcmVzLmxlbmd0aCk7XG4gICAgICAgIGRlYnVnbG9nTShcImhlcmUgcmVzdWx0cyBmb3JcIiArIHdvcmQgKyBcIiByZXMgXCIgKyByZXMubGVuZ3RoKTtcbiAgICAgICAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBkZWJ1Z2xvZyhcImNhdGVnb3JpemUgbm9uIGV4YWN0XCIgKyB3b3JkICsgXCIgeHggIFwiICsgcnVsZXMuYWxsUnVsZXMubGVuZ3RoKTtcbiAgICAgICAgdmFyIHJyID0gY2F0ZWdvcml6ZVNpbmdsZVdvcmRXaXRoT2Zmc2V0KHdvcmQsIGxjd29yZCwgZXhhY3QsIHJ1bGVzLmFsbFJ1bGVzLCBjbnRSZWMpO1xuICAgICAgICAvL2RlYnVsb2dNKFwiZnV6enkgcmVzIFwiICsgSlNPTi5zdHJpbmdpZnkocnIpKTtcbiAgICAgICAgcmV0dXJuIHBvc3RGaWx0ZXJXaXRoT2Zmc2V0KHJyKTtcbiAgICB9XG59XG5leHBvcnRzLmNhdGVnb3JpemVXb3JkSW50ZXJuYWxXaXRoT2Zmc2V0cyA9IGNhdGVnb3JpemVXb3JkSW50ZXJuYWxXaXRoT2Zmc2V0cztcbi8qKlxuICpcbiAqIE9wdGlvbnMgbWF5IGJlIHtcbiAqIG1hdGNob3RoZXJzIDogdHJ1ZSwgID0+IG9ubHkgcnVsZXMgd2hlcmUgYWxsIG90aGVycyBtYXRjaCBhcmUgY29uc2lkZXJlZFxuICogYXVnbWVudCA6IHRydWUsXG4gKiBvdmVycmlkZSA6IHRydWUgfSAgPT5cbiAqXG4gKi9cbmZ1bmN0aW9uIG1hdGNoV29yZChvUnVsZSwgY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChjb250ZXh0W29SdWxlLmtleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgczIgPSBvUnVsZS53b3JkLnRvTG93ZXJDYXNlKCk7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCwgb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xuICAgICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgYyA9IGNhbGNEaXN0YW5jZShzMiwgczEpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiIHMxIDw+IHMyIFwiICsgczEgKyBcIjw+XCIgKyBzMiArIFwiICA9PjogXCIgKyBjKTtcbiAgICB9XG4gICAgaWYgKGMgPiAwLjgwKSB7XG4gICAgICAgIHZhciByZXMgPSBBbnlPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKTtcbiAgICAgICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIGNvbnRleHQpO1xuICAgICAgICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xuICAgICAgICAgICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGZvcmNlIGtleSBwcm9wZXJ0eVxuICAgICAgICAvLyBjb25zb2xlLmxvZygnIG9iamVjdGNhdGVnb3J5JywgcmVzWydzeXN0ZW1PYmplY3RDYXRlZ29yeSddKTtcbiAgICAgICAgcmVzW29SdWxlLmtleV0gPSBvUnVsZS5mb2xsb3dzW29SdWxlLmtleV0gfHwgcmVzW29SdWxlLmtleV07XG4gICAgICAgIHJlcy5fd2VpZ2h0ID0gQW55T2JqZWN0LmFzc2lnbih7fSwgcmVzLl93ZWlnaHQpO1xuICAgICAgICByZXMuX3dlaWdodFtvUnVsZS5rZXldID0gYztcbiAgICAgICAgT2JqZWN0LmZyZWV6ZShyZXMpO1xuICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgZGVidWdsb2coJ0ZvdW5kIG9uZScgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5leHBvcnRzLm1hdGNoV29yZCA9IG1hdGNoV29yZDtcbmZ1bmN0aW9uIGV4dHJhY3RBcmdzTWFwKG1hdGNoLCBhcmdzTWFwKSB7XG4gICAgdmFyIHJlcyA9IHt9O1xuICAgIGlmICghYXJnc01hcCkge1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cbiAgICBPYmplY3Qua2V5cyhhcmdzTWFwKS5mb3JFYWNoKGZ1bmN0aW9uIChpS2V5KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IG1hdGNoW2lLZXldO1xuICAgICAgICB2YXIga2V5ID0gYXJnc01hcFtpS2V5XTtcbiAgICAgICAgaWYgKCh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpICYmIHZhbHVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJlc1trZXldID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5leHRyYWN0QXJnc01hcCA9IGV4dHJhY3RBcmdzTWFwO1xuZXhwb3J0cy5SYW5rV29yZCA9IHtcbiAgICBoYXNBYm92ZTogZnVuY3Rpb24gKGxzdCwgYm9yZGVyKSB7XG4gICAgICAgIHJldHVybiAhbHN0LmV2ZXJ5KGZ1bmN0aW9uIChvTWVtYmVyKSB7XG4gICAgICAgICAgICByZXR1cm4gKG9NZW1iZXIuX3JhbmtpbmcgPCBib3JkZXIpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIHRha2VGaXJzdE46IGZ1bmN0aW9uIChsc3QsIG4pIHtcbiAgICAgICAgdmFyIGxhc3RSYW5raW5nID0gMS4wO1xuICAgICAgICB2YXIgY250UmFuZ2VkID0gMDtcbiAgICAgICAgcmV0dXJuIGxzdC5maWx0ZXIoZnVuY3Rpb24gKG9NZW1iZXIsIGlJbmRleCkge1xuICAgICAgICAgICAgdmFyIGlzUmFuZ2VkID0gISEob01lbWJlcltcInJ1bGVcIl0gJiYgb01lbWJlcltcInJ1bGVcIl0ucmFuZ2UpO1xuICAgICAgICAgICAgaWYgKGlzUmFuZ2VkKSB7XG4gICAgICAgICAgICAgICAgY250UmFuZ2VkICs9IDE7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoKChpSW5kZXggLSBjbnRSYW5nZWQpIDwgbikgfHwgKG9NZW1iZXIuX3JhbmtpbmcgPT09IGxhc3RSYW5raW5nKSkge1xuICAgICAgICAgICAgICAgIGxhc3RSYW5raW5nID0gb01lbWJlci5fcmFua2luZztcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICB0YWtlQWJvdmU6IGZ1bmN0aW9uIChsc3QsIGJvcmRlcikge1xuICAgICAgICByZXR1cm4gbHN0LmZpbHRlcihmdW5jdGlvbiAob01lbWJlcikge1xuICAgICAgICAgICAgcmV0dXJuIChvTWVtYmVyLl9yYW5raW5nID49IGJvcmRlcik7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG4vKlxudmFyIGV4YWN0TGVuID0gMDtcbnZhciBmdXp6eUxlbiA9IDA7XG52YXIgZnV6enlDbnQgPSAwO1xudmFyIGV4YWN0Q250ID0gMDtcbnZhciB0b3RhbENudCA9IDA7XG52YXIgdG90YWxMZW4gPSAwO1xudmFyIHJldGFpbmVkQ250ID0gMDtcblxuZXhwb3J0IGZ1bmN0aW9uIHJlc2V0Q250KCkge1xuICBleGFjdExlbiA9IDA7XG4gIGZ1enp5TGVuID0gMDtcbiAgZnV6enlDbnQgPSAwO1xuICBleGFjdENudCA9IDA7XG4gIHRvdGFsQ250ID0gMDtcbiAgdG90YWxMZW4gPSAwO1xuICByZXRhaW5lZENudCA9IDA7XG59XG4qL1xuZnVuY3Rpb24gY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZihzV29yZEdyb3VwLCBzcGxpdFJ1bGVzLCBjbnRSZWMpIHtcbiAgICB2YXIgc2Vlbkl0ID0gY2F0ZWdvcml6ZVN0cmluZzIoc1dvcmRHcm91cCwgdHJ1ZSwgc3BsaXRSdWxlcywgY250UmVjKTtcbiAgICAvL3RvdGFsQ250ICs9IDE7XG4gICAgLy8gZXhhY3RMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcbiAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Q2F0RXhhY3QnLCAxKTtcbiAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Q2F0RXhhY3RSZXMnLCBzZWVuSXQubGVuZ3RoKTtcbiAgICBpZiAoZXhwb3J0cy5SYW5rV29yZC5oYXNBYm92ZShzZWVuSXQsIDAuOCkpIHtcbiAgICAgICAgaWYgKGNudFJlYykge1xuICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYywgJ2V4YWN0UHJpb3JUYWtlJywgc2Vlbkl0Lmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgICAgc2Vlbkl0ID0gZXhwb3J0cy5SYW5rV29yZC50YWtlQWJvdmUoc2Vlbkl0LCAwLjgpO1xuICAgICAgICBpZiAoY250UmVjKSB7XG4gICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLCAnZXhhY3RBZnRlclRha2UnLCBzZWVuSXQubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc2Vlbkl0ID0gY2F0ZWdvcml6ZVN0cmluZzIoc1dvcmRHcm91cCwgZmFsc2UsIHNwbGl0UnVsZXMsIGNudFJlYyk7XG4gICAgICAgIGFkZENudFJlYyhjbnRSZWMsICdjbnROb25FeGFjdCcsIDEpO1xuICAgICAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Tm9uRXhhY3RSZXMnLCBzZWVuSXQubGVuZ3RoKTtcbiAgICB9XG4gICAgLy8gdG90YWxMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcbiAgICBzZWVuSXQgPSBleHBvcnRzLlJhbmtXb3JkLnRha2VGaXJzdE4oc2Vlbkl0LCBBbGdvbC5Ub3BfTl9Xb3JkQ2F0ZWdvcml6YXRpb25zKTtcbiAgICAvLyByZXRhaW5lZENudCArPSBzZWVuSXQubGVuZ3RoO1xuICAgIHJldHVybiBzZWVuSXQ7XG59XG5leHBvcnRzLmNhdGVnb3JpemVXb3JkV2l0aFJhbmtDdXRvZmYgPSBjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmO1xuLyogaWYgd2UgaGF2ZSBhICBcIlJ1biBsaWtlIHRoZSBXaW5kXCJcbiAgYW4gYSB1c2VyIHR5cGUgZnVuIGxpa2UgIGEgUmluZCAsIGFuZCBSaW5kIGlzIGFuIGV4YWN0IG1hdGNoLFxuICB3ZSB3aWxsIG5vdCBzdGFydCBsb29raW5nIGZvciB0aGUgbG9uZyBzZW50ZW5jZVxuXG4gIHRoaXMgaXMgdG8gYmUgZml4ZWQgYnkgXCJzcHJlYWRpbmdcIiB0aGUgcmFuZ2UgaW5kaWNhdGlvbiBhY2Nyb3NzIHZlcnkgc2ltaWxhciB3b3JkcyBpbiB0aGUgdmluY2luaXR5IG9mIHRoZVxuICB0YXJnZXQgd29yZHNcbiovXG5mdW5jdGlvbiBjYXRlZ29yaXplV29yZFdpdGhPZmZzZXRXaXRoUmFua0N1dG9mZihzV29yZEdyb3VwLCBzcGxpdFJ1bGVzLCBjbnRSZWMpIHtcbiAgICB2YXIgc1dvcmRHcm91cExDID0gc1dvcmRHcm91cC50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciBzZWVuSXQgPSBjYXRlZ29yaXplV29yZEludGVybmFsV2l0aE9mZnNldHMoc1dvcmRHcm91cCwgc1dvcmRHcm91cExDLCB0cnVlLCBzcGxpdFJ1bGVzLCBjbnRSZWMpO1xuICAgIC8vY29uc29sZS5sb2coXCJTRUVOSVRcIiArIEpTT04uc3RyaW5naWZ5KHNlZW5JdCkpO1xuICAgIC8vdG90YWxDbnQgKz0gMTtcbiAgICAvLyBleGFjdExlbiArPSBzZWVuSXQubGVuZ3RoO1xuICAgIC8vY29uc29sZS5sb2coXCJmaXJzdCBydW4gZXhhY3QgXCIgKyBKU09OLnN0cmluZ2lmeShzZWVuSXQpKTtcbiAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Q2F0RXhhY3QnLCAxKTtcbiAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Q2F0RXhhY3RSZXMnLCBzZWVuSXQubGVuZ3RoKTtcbiAgICBpZiAoZXhwb3J0cy5SYW5rV29yZC5oYXNBYm92ZShzZWVuSXQsIDAuOCkpIHtcbiAgICAgICAgaWYgKGNudFJlYykge1xuICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYywgJ2V4YWN0UHJpb3JUYWtlJywgc2Vlbkl0Lmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgICAgc2Vlbkl0ID0gZXhwb3J0cy5SYW5rV29yZC50YWtlQWJvdmUoc2Vlbkl0LCAwLjgpO1xuICAgICAgICBpZiAoY250UmVjKSB7XG4gICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLCAnZXhhY3RBZnRlclRha2UnLCBzZWVuSXQubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc2Vlbkl0ID0gY2F0ZWdvcml6ZVdvcmRJbnRlcm5hbFdpdGhPZmZzZXRzKHNXb3JkR3JvdXAsIHNXb3JkR3JvdXBMQywgZmFsc2UsIHNwbGl0UnVsZXMsIGNudFJlYyk7XG4gICAgICAgIGFkZENudFJlYyhjbnRSZWMsICdjbnROb25FeGFjdCcsIDEpO1xuICAgICAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Tm9uRXhhY3RSZXMnLCBzZWVuSXQubGVuZ3RoKTtcbiAgICB9XG4gICAgLy8gdG90YWxMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcbiAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKHNlZW5JdC5sZW5ndGggKyBcIiB3aXRoIFwiICsgc2Vlbkl0LnJlZHVjZShmdW5jdGlvbiAocHJldiwgb2JqKSB7IHJldHVybiBwcmV2ICsgKG9iai5ydWxlLnJhbmdlID8gMSA6IDApOyB9LCAwKSArIFwiIHJhbmdlZCAhXCIpIDogJy0nKTtcbiAgICAvLyAgdmFyIGNudFJhbmdlZCA9IHNlZW5JdC5yZWR1Y2UoIChwcmV2LG9iaikgPT4gcHJldiArIChvYmoucnVsZS5yYW5nZSA/IDEgOiAwKSwwKTtcbiAgICAvLyAgY29uc29sZS5sb2coYCoqKioqKioqKioqICR7c2Vlbkl0Lmxlbmd0aH0gd2l0aCAke2NudFJhbmdlZH0gcmFuZ2VkICFgKTtcbiAgICBzZWVuSXQgPSBleHBvcnRzLlJhbmtXb3JkLnRha2VGaXJzdE4oc2Vlbkl0LCBBbGdvbC5Ub3BfTl9Xb3JkQ2F0ZWdvcml6YXRpb25zKTtcbiAgICAvLyByZXRhaW5lZENudCArPSBzZWVuSXQubGVuZ3RoO1xuICAgIC8vY29uc29sZS5sb2coXCJmaW5hbCByZXMgb2YgY2F0ZWdvcml6ZVdvcmRXaXRoT2Zmc2V0V2l0aFJhbmtDdXRvZmZcIiArIEpTT04uc3RyaW5naWZ5KHNlZW5JdCkpO1xuICAgIHJldHVybiBzZWVuSXQ7XG59XG5leHBvcnRzLmNhdGVnb3JpemVXb3JkV2l0aE9mZnNldFdpdGhSYW5rQ3V0b2ZmID0gY2F0ZWdvcml6ZVdvcmRXaXRoT2Zmc2V0V2l0aFJhbmtDdXRvZmY7XG5mdW5jdGlvbiBjYXRlZ29yaXplV29yZFdpdGhPZmZzZXRXaXRoUmFua0N1dG9mZlNpbmdsZSh3b3JkLCBydWxlKSB7XG4gICAgdmFyIGxjd29yZCA9IHdvcmQudG9Mb3dlckNhc2UoKTtcbiAgICBpZiAobGN3b3JkID09PSBydWxlLmxvd2VyY2FzZXdvcmQpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN0cmluZzogd29yZCxcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IHJ1bGUubWF0Y2hlZFN0cmluZyxcbiAgICAgICAgICAgIGNhdGVnb3J5OiBydWxlLmNhdGVnb3J5LFxuICAgICAgICAgICAgcnVsZTogcnVsZSxcbiAgICAgICAgICAgIF9yYW5raW5nOiBydWxlLl9yYW5raW5nIHx8IDEuMFxuICAgICAgICB9O1xuICAgIH1cbiAgICB2YXIgcmVzID0gW107XG4gICAgY2hlY2tPbmVSdWxlV2l0aE9mZnNldCh3b3JkLCBsY3dvcmQsIGZhbHNlLCByZXMsIHJ1bGUpO1xuICAgIGRlYnVnbG9nKFwiY2F0V1dPV1JDUyBcIiArIGxjd29yZCk7XG4gICAgaWYgKHJlcy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHJlc1swXTtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZVdvcmRXaXRoT2Zmc2V0V2l0aFJhbmtDdXRvZmZTaW5nbGUgPSBjYXRlZ29yaXplV29yZFdpdGhPZmZzZXRXaXRoUmFua0N1dG9mZlNpbmdsZTtcbi8qXG5leHBvcnQgZnVuY3Rpb24gZHVtcENudCgpIHtcbiAgY29uc29sZS5sb2coYFxuZXhhY3RMZW4gPSAke2V4YWN0TGVufTtcbmV4YWN0Q250ID0gJHtleGFjdENudH07XG5mdXp6eUxlbiA9ICR7ZnV6enlMZW59O1xuZnV6enlDbnQgPSAke2Z1enp5Q250fTtcbnRvdGFsQ250ID0gJHt0b3RhbENudH07XG50b3RhbExlbiA9ICR7dG90YWxMZW59O1xucmV0YWluZWRMZW4gPSAke3JldGFpbmVkQ250fTtcbiAgYCk7XG59XG4qL1xuLypcbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWRTZW50ZW5jZShvU2VudGVuY2U6IElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11bXSk6IGJvb2xlYW4ge1xuICByZXR1cm4gb1NlbnRlbmNlLmV2ZXJ5KGZ1bmN0aW9uIChvV29yZEdyb3VwKSB7XG4gICAgcmV0dXJuIChvV29yZEdyb3VwLmxlbmd0aCA+IDApO1xuICB9KTtcbn1cblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWQoYXJyOiBJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdW11bXSk6IElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11bXVtdIHtcbiAgcmV0dXJuIGFyci5maWx0ZXIoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgIHJldHVybiBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWRTZW50ZW5jZShvU2VudGVuY2UpO1xuICB9KTtcbn1cbiovXG5mdW5jdGlvbiBjYXRlZ29yaXplQVdvcmQoc1dvcmRHcm91cCwgcnVsZXMsIHNlbnRlbmNlLCB3b3JkcywgY250UmVjKSB7XG4gICAgdmFyIHNlZW5JdCA9IHdvcmRzW3NXb3JkR3JvdXBdO1xuICAgIGlmIChzZWVuSXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBzZWVuSXQgPSBjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmKHNXb3JkR3JvdXAsIHJ1bGVzLCBjbnRSZWMpO1xuICAgICAgICB1dGlscy5kZWVwRnJlZXplKHNlZW5JdCk7XG4gICAgICAgIHdvcmRzW3NXb3JkR3JvdXBdID0gc2Vlbkl0O1xuICAgIH1cbiAgICBpZiAoIXNlZW5JdCB8fCBzZWVuSXQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGxvZ2dlcihcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIFxcXCJcIiArIHNXb3JkR3JvdXAgKyBcIlxcXCIgaW4gc2VudGVuY2UgXFxcIlwiXG4gICAgICAgICAgICArIHNlbnRlbmNlICsgXCJcXFwiXCIpO1xuICAgICAgICBpZiAoc1dvcmRHcm91cC5pbmRleE9mKFwiIFwiKSA8PSAwKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZyhcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIHByaW1pdGl2ZSAoISlcIiArIHNXb3JkR3JvdXApO1xuICAgICAgICB9XG4gICAgICAgIGRlYnVnbG9nKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgXCIgKyBzV29yZEdyb3VwKTtcbiAgICAgICAgaWYgKCFzZWVuSXQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGluZyBlbXRweSBsaXN0LCBub3QgdW5kZWZpbmVkIGZvciBcXFwiXCIgKyBzV29yZEdyb3VwICsgXCJcXFwiXCIpO1xuICAgICAgICB9XG4gICAgICAgIHdvcmRzW3NXb3JkR3JvdXBdID0gW107XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgcmV0dXJuIHV0aWxzLmNsb25lRGVlcChzZWVuSXQpO1xufVxuZXhwb3J0cy5jYXRlZ29yaXplQVdvcmQgPSBjYXRlZ29yaXplQVdvcmQ7XG4vKipcbiAqIEdpdmVuIGEgIHN0cmluZywgYnJlYWsgaXQgZG93biBpbnRvIGNvbXBvbmVudHMsXG4gKiBbWydBJywgJ0InXSwgWydBIEInXV1cbiAqXG4gKiB0aGVuIGNhdGVnb3JpemVXb3Jkc1xuICogcmV0dXJuaW5nXG4gKlxuICogWyBbWyB7IGNhdGVnb3J5OiAnc3lzdGVtSWQnLCB3b3JkIDogJ0EnfSxcbiAqICAgICAgeyBjYXRlZ29yeTogJ290aGVydGhpbmcnLCB3b3JkIDogJ0EnfVxuICogICAgXSxcbiAqICAgIC8vIHJlc3VsdCBvZiBCXG4gKiAgICBbIHsgY2F0ZWdvcnk6ICdzeXN0ZW1JZCcsIHdvcmQgOiAnQid9LFxuICogICAgICB7IGNhdGVnb3J5OiAnb3RoZXJ0aGluZycsIHdvcmQgOiAnQSd9XG4gKiAgICAgIHsgY2F0ZWdvcnk6ICdhbm90aGVydHJ5cCcsIHdvcmQgOiAnQid9XG4gKiAgICBdXG4gKiAgIF0sXG4gKiBdXV1cbiAqXG4gKlxuICpcbiAqL1xuZnVuY3Rpb24gYW5hbHl6ZVN0cmluZyhzU3RyaW5nLCBydWxlcywgd29yZHMpIHtcbiAgICB2YXIgY250ID0gMDtcbiAgICB2YXIgZmFjID0gMTtcbiAgICB2YXIgdSA9IGJyZWFrZG93bi5icmVha2Rvd25TdHJpbmcoc1N0cmluZywgQWxnb2wuTWF4U3BhY2VzUGVyQ29tYmluZWRXb3JkKTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcImhlcmUgYnJlYWtkb3duXCIgKyBKU09OLnN0cmluZ2lmeSh1KSk7XG4gICAgfVxuICAgIC8vY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkodSkpO1xuICAgIHdvcmRzID0gd29yZHMgfHwge307XG4gICAgZGVidWdwZXJmKCd0aGlzIG1hbnkga25vd24gd29yZHM6ICcgKyBPYmplY3Qua2V5cyh3b3JkcykubGVuZ3RoKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgdmFyIGNudFJlYyA9IHt9O1xuICAgIHUuZm9yRWFjaChmdW5jdGlvbiAoYUJyZWFrRG93blNlbnRlbmNlKSB7XG4gICAgICAgIHZhciBjYXRlZ29yaXplZFNlbnRlbmNlID0gW107XG4gICAgICAgIHZhciBpc1ZhbGlkID0gYUJyZWFrRG93blNlbnRlbmNlLmV2ZXJ5KGZ1bmN0aW9uIChzV29yZEdyb3VwLCBpbmRleCkge1xuICAgICAgICAgICAgdmFyIHNlZW5JdCA9IGNhdGVnb3JpemVBV29yZChzV29yZEdyb3VwLCBydWxlcywgc1N0cmluZywgd29yZHMsIGNudFJlYyk7XG4gICAgICAgICAgICBpZiAoc2Vlbkl0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGVnb3JpemVkU2VudGVuY2VbaW5kZXhdID0gc2Vlbkl0O1xuICAgICAgICAgICAgY250ID0gY250ICsgc2Vlbkl0Lmxlbmd0aDtcbiAgICAgICAgICAgIGZhYyA9IGZhYyAqIHNlZW5JdC5sZW5ndGg7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChpc1ZhbGlkKSB7XG4gICAgICAgICAgICByZXMucHVzaChjYXRlZ29yaXplZFNlbnRlbmNlKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGRlYnVnbG9nKFwiIHNlbnRlbmNlcyBcIiArIHUubGVuZ3RoICsgXCIgbWF0Y2hlcyBcIiArIGNudCArIFwiIGZhYzogXCIgKyBmYWMpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkICYmIHUubGVuZ3RoKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiZmlyc3QgbWF0Y2ggXCIgKyBKU09OLnN0cmluZ2lmeSh1LCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgZGVidWdwZXJmKFwiIHNlbnRlbmNlcyBcIiArIHUubGVuZ3RoICsgXCIgLyBcIiArIHJlcy5sZW5ndGggKyBcIiBtYXRjaGVzIFwiICsgY250ICsgXCIgZmFjOiBcIiArIGZhYyArIFwiIHJlYyA6IFwiICsgSlNPTi5zdHJpbmdpZnkoY250UmVjLCB1bmRlZmluZWQsIDIpKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5hbmFseXplU3RyaW5nID0gYW5hbHl6ZVN0cmluZztcbmZ1bmN0aW9uIGNhdGVnb3JpemVBV29yZFdpdGhPZmZzZXRzKHNXb3JkR3JvdXAsIHJ1bGVzLCBzZW50ZW5jZSwgd29yZHMsIGNudFJlYykge1xuICAgIHZhciBzZWVuSXQgPSB3b3Jkc1tzV29yZEdyb3VwXTtcbiAgICBpZiAoc2Vlbkl0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgc2Vlbkl0ID0gY2F0ZWdvcml6ZVdvcmRXaXRoT2Zmc2V0V2l0aFJhbmtDdXRvZmYoc1dvcmRHcm91cCwgcnVsZXMsIGNudFJlYyk7XG4gICAgICAgIHV0aWxzLmRlZXBGcmVlemUoc2Vlbkl0KTtcbiAgICAgICAgd29yZHNbc1dvcmRHcm91cF0gPSBzZWVuSXQ7XG4gICAgfVxuICAgIGlmICghc2Vlbkl0IHx8IHNlZW5JdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgbG9nZ2VyKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgXFxcIlwiICsgc1dvcmRHcm91cCArIFwiXFxcIiBpbiBzZW50ZW5jZSBcXFwiXCJcbiAgICAgICAgICAgICsgc2VudGVuY2UgKyBcIlxcXCJcIik7XG4gICAgICAgIGlmIChzV29yZEdyb3VwLmluZGV4T2YoXCIgXCIpIDw9IDApIHtcbiAgICAgICAgICAgIGRlYnVnbG9nKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgcHJpbWl0aXZlICghKVwiICsgc1dvcmRHcm91cCk7XG4gICAgICAgIH1cbiAgICAgICAgZGVidWdsb2coXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBcIiArIHNXb3JkR3JvdXApO1xuICAgICAgICBpZiAoIXNlZW5JdCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0aW5nIGVtdHB5IGxpc3QsIG5vdCB1bmRlZmluZWQgZm9yIFxcXCJcIiArIHNXb3JkR3JvdXAgKyBcIlxcXCJcIik7XG4gICAgICAgIH1cbiAgICAgICAgd29yZHNbc1dvcmRHcm91cF0gPSBbXTtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICByZXR1cm4gdXRpbHMuY2xvbmVEZWVwKHNlZW5JdCk7XG59XG5leHBvcnRzLmNhdGVnb3JpemVBV29yZFdpdGhPZmZzZXRzID0gY2F0ZWdvcml6ZUFXb3JkV2l0aE9mZnNldHM7XG4vKlxuWyBbYSxiXSwgW2MsZF1dXG5cbjAwIGFcbjAxIGJcbjEwIGNcbjExIGRcbjEyIGNcbiovXG52YXIgY2xvbmUgPSB1dGlscy5jbG9uZURlZXA7XG5mdW5jdGlvbiBjb3B5VmVjTWVtYmVycyh1KSB7XG4gICAgdmFyIGkgPSAwO1xuICAgIGZvciAoaSA9IDA7IGkgPCB1Lmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHVbaV0gPSBjbG9uZSh1W2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIHU7XG59XG4vLyB3ZSBjYW4gcmVwbGljYXRlIHRoZSB0YWlsIG9yIHRoZSBoZWFkLFxuLy8gd2UgcmVwbGljYXRlIHRoZSB0YWlsIGFzIGl0IGlzIHNtYWxsZXIuXG4vLyBbYSxiLGMgXVxuZnVuY3Rpb24gZXhwYW5kTWF0Y2hBcnIoZGVlcCkge1xuICAgIHZhciBhID0gW107XG4gICAgdmFyIGxpbmUgPSBbXTtcbiAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gSlNPTi5zdHJpbmdpZnkoZGVlcCkgOiAnLScpO1xuICAgIGRlZXAuZm9yRWFjaChmdW5jdGlvbiAodUJyZWFrRG93bkxpbmUsIGlJbmRleCkge1xuICAgICAgICBsaW5lW2lJbmRleF0gPSBbXTtcbiAgICAgICAgdUJyZWFrRG93bkxpbmUuZm9yRWFjaChmdW5jdGlvbiAoYVdvcmRHcm91cCwgd2dJbmRleCkge1xuICAgICAgICAgICAgbGluZVtpSW5kZXhdW3dnSW5kZXhdID0gW107XG4gICAgICAgICAgICBhV29yZEdyb3VwLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkVmFyaWFudCwgaVdWSW5kZXgpIHtcbiAgICAgICAgICAgICAgICBsaW5lW2lJbmRleF1bd2dJbmRleF1baVdWSW5kZXhdID0gb1dvcmRWYXJpYW50O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyBKU09OLnN0cmluZ2lmeShsaW5lKSA6ICctJyk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIHZhciBudmVjcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZS5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgdmVjcyA9IFtbXV07XG4gICAgICAgIHZhciBudmVjcyA9IFtdO1xuICAgICAgICB2YXIgcnZlYyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBrID0gMDsgayA8IGxpbmVbaV0ubGVuZ3RoOyArK2spIHtcbiAgICAgICAgICAgIC8vdmVjcyBpcyB0aGUgdmVjdG9yIG9mIGFsbCBzbyBmYXIgc2VlbiB2YXJpYW50cyB1cCB0byBrIHdncy5cbiAgICAgICAgICAgIHZhciBuZXh0QmFzZSA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIgbCA9IDA7IGwgPCBsaW5lW2ldW2tdLmxlbmd0aDsgKytsKSB7XG4gICAgICAgICAgICAgICAgLy9kZWJ1Z2xvZyhcInZlY3Mgbm93XCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzKSk7XG4gICAgICAgICAgICAgICAgbnZlY3MgPSBbXTsgLy92ZWNzLnNsaWNlKCk7IC8vIGNvcHkgdGhlIHZlY1tpXSBiYXNlIHZlY3RvcjtcbiAgICAgICAgICAgICAgICAvL2RlYnVnbG9nKFwidmVjcyBjb3BpZWQgbm93XCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIHUgPSAwOyB1IDwgdmVjcy5sZW5ndGg7ICsrdSkge1xuICAgICAgICAgICAgICAgICAgICBudmVjc1t1XSA9IHZlY3NbdV0uc2xpY2UoKTsgLy9cbiAgICAgICAgICAgICAgICAgICAgbnZlY3NbdV0gPSBjb3B5VmVjTWVtYmVycyhudmVjc1t1XSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIGRlYnVnbG9nKFwiY29waWVkIHZlY3NbXCIrIHUrXCJdXCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzW3VdKSk7XG4gICAgICAgICAgICAgICAgICAgIG52ZWNzW3VdLnB1c2goY2xvbmUobGluZVtpXVtrXVtsXSkpOyAvLyBwdXNoIHRoZSBsdGggdmFyaWFudFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyAgIGRlYnVnbG9nKFwiIGF0ICAgICBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiBuZXh0YmFzZSA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpXG4gICAgICAgICAgICAgICAgLy8gICBkZWJ1Z2xvZyhcIiBhcHBlbmQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbnZlY3MgICAgPlwiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKVxuICAgICAgICAgICAgICAgIG5leHRCYXNlID0gbmV4dEJhc2UuY29uY2F0KG52ZWNzKTtcbiAgICAgICAgICAgIH0gLy9jb25zdHJ1XG4gICAgICAgICAgICAvLyAgZGVidWdsb2coXCJub3cgYXQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxuICAgICAgICAgICAgdmVjcyA9IG5leHRCYXNlO1xuICAgICAgICB9XG4gICAgICAgIGRlYnVnbG9nVihkZWJ1Z2xvZ1YuZW5hYmxlZCA/IChcIkFQUEVORElORyBUTyBSRVNcIiArIGkgKyBcIjpcIiArIGwgKyBcIiA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpIDogJy0nKTtcbiAgICAgICAgcmVzID0gcmVzLmNvbmNhdCh2ZWNzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZXhwYW5kTWF0Y2hBcnIgPSBleHBhbmRNYXRjaEFycjtcbi8qKlxuICogQ2FsY3VsYXRlIGEgd2VpZ2h0IGZhY3RvciBmb3IgYSBnaXZlbiBkaXN0YW5jZSBhbmRcbiAqIGNhdGVnb3J5XG4gKiBAcGFyYW0ge2ludGVnZXJ9IGRpc3QgZGlzdGFuY2UgaW4gd29yZHNcbiAqIEBwYXJhbSB7c3RyaW5nfSBjYXRlZ29yeSBjYXRlZ29yeSB0byB1c2VcbiAqIEByZXR1cm5zIHtudW1iZXJ9IGEgZGlzdGFuY2UgZmFjdG9yID49IDFcbiAqICAxLjAgZm9yIG5vIGVmZmVjdFxuICovXG5mdW5jdGlvbiByZWluZm9yY2VEaXN0V2VpZ2h0KGRpc3QsIGNhdGVnb3J5KSB7XG4gICAgdmFyIGFicyA9IE1hdGguYWJzKGRpc3QpO1xuICAgIHJldHVybiAxLjAgKyAoQWxnb2wuYVJlaW5mb3JjZURpc3RXZWlnaHRbYWJzXSB8fCAwKTtcbn1cbmV4cG9ydHMucmVpbmZvcmNlRGlzdFdlaWdodCA9IHJlaW5mb3JjZURpc3RXZWlnaHQ7XG4vKipcbiAqIEdpdmVuIGEgc2VudGVuY2UsIGV4dGFjdCBjYXRlZ29yaWVzXG4gKi9cbmZ1bmN0aW9uIGV4dHJhY3RDYXRlZ29yeU1hcChvU2VudGVuY2UpIHtcbiAgICB2YXIgcmVzID0ge307XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/ICgnZXh0cmFjdENhdGVnb3J5TWFwICcgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpKSA6ICctJyk7XG4gICAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpSW5kZXgpIHtcbiAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBJRk1hdGNoLkNBVF9DQVRFR09SWSkge1xuICAgICAgICAgICAgcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddID0gcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddIHx8IFtdO1xuICAgICAgICAgICAgcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddLnB1c2goeyBwb3M6IGlJbmRleCB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHV0aWxzLmRlZXBGcmVlemUocmVzKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5leHRyYWN0Q2F0ZWdvcnlNYXAgPSBleHRyYWN0Q2F0ZWdvcnlNYXA7XG5mdW5jdGlvbiByZWluRm9yY2VTZW50ZW5jZShvU2VudGVuY2UpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICB2YXIgb0NhdGVnb3J5TWFwID0gZXh0cmFjdENhdGVnb3J5TWFwKG9TZW50ZW5jZSk7XG4gICAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpSW5kZXgpIHtcbiAgICAgICAgdmFyIG0gPSBvQ2F0ZWdvcnlNYXBbb1dvcmQuY2F0ZWdvcnldIHx8IFtdO1xuICAgICAgICBtLmZvckVhY2goZnVuY3Rpb24gKG9Qb3NpdGlvbikge1xuICAgICAgICAgICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgICAgICAgICBvV29yZC5yZWluZm9yY2UgPSBvV29yZC5yZWluZm9yY2UgfHwgMTtcbiAgICAgICAgICAgIHZhciBib29zdCA9IHJlaW5mb3JjZURpc3RXZWlnaHQoaUluZGV4IC0gb1Bvc2l0aW9uLnBvcywgb1dvcmQuY2F0ZWdvcnkpO1xuICAgICAgICAgICAgb1dvcmQucmVpbmZvcmNlICo9IGJvb3N0O1xuICAgICAgICAgICAgb1dvcmQuX3JhbmtpbmcgKj0gYm9vc3Q7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaUluZGV4KSB7XG4gICAgICAgIGlmIChpSW5kZXggPiAwKSB7XG4gICAgICAgICAgICBpZiAob1NlbnRlbmNlW2lJbmRleCAtIDFdLmNhdGVnb3J5ID09PSBcIm1ldGFcIiAmJiAob1dvcmQuY2F0ZWdvcnkgPT09IG9TZW50ZW5jZVtpSW5kZXggLSAxXS5tYXRjaGVkU3RyaW5nKSkge1xuICAgICAgICAgICAgICAgIG9Xb3JkLnJlaW5mb3JjZSA9IG9Xb3JkLnJlaW5mb3JjZSB8fCAxO1xuICAgICAgICAgICAgICAgIHZhciBib29zdCA9IHJlaW5mb3JjZURpc3RXZWlnaHQoMSwgb1dvcmQuY2F0ZWdvcnkpO1xuICAgICAgICAgICAgICAgIG9Xb3JkLnJlaW5mb3JjZSAqPSBib29zdDtcbiAgICAgICAgICAgICAgICBvV29yZC5fcmFua2luZyAqPSBib29zdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBvU2VudGVuY2U7XG59XG5leHBvcnRzLnJlaW5Gb3JjZVNlbnRlbmNlID0gcmVpbkZvcmNlU2VudGVuY2U7XG52YXIgU2VudGVuY2UgPSByZXF1aXJlKFwiLi9zZW50ZW5jZVwiKTtcbmZ1bmN0aW9uIHJlaW5Gb3JjZShhQ2F0ZWdvcml6ZWRBcnJheSkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIGFDYXRlZ29yaXplZEFycmF5LmZvckVhY2goZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICByZWluRm9yY2VTZW50ZW5jZShvU2VudGVuY2UpO1xuICAgIH0pO1xuICAgIGFDYXRlZ29yaXplZEFycmF5LnNvcnQoU2VudGVuY2UuY21wUmFua2luZ1Byb2R1Y3QpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiYWZ0ZXIgcmVpbmZvcmNlXCIgKyBhQ2F0ZWdvcml6ZWRBcnJheS5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICAgIH1cbiAgICByZXR1cm4gYUNhdGVnb3JpemVkQXJyYXk7XG59XG5leHBvcnRzLnJlaW5Gb3JjZSA9IHJlaW5Gb3JjZTtcbi8vLyBiZWxvdyBtYXkgbm8gbG9uZ2VyIGJlIHVzZWRcbmZ1bmN0aW9uIG1hdGNoUmVnRXhwKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBzS2V5ID0gb1J1bGUua2V5O1xuICAgIHZhciBzMSA9IGNvbnRleHRbb1J1bGUua2V5XS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciByZWcgPSBvUnVsZS5yZWdleHA7XG4gICAgdmFyIG0gPSByZWcuZXhlYyhzMSk7XG4gICAgaWYgKGRlYnVnbG9nVi5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nVihcImFwcGx5aW5nIHJlZ2V4cDogXCIgKyBzMSArIFwiIFwiICsgSlNPTi5zdHJpbmdpZnkobSkpO1xuICAgIH1cbiAgICBpZiAoIW0pIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCwgb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KTtcbiAgICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2dWKEpTT04uc3RyaW5naWZ5KGRlbHRhKSk7XG4gICAgICAgIGRlYnVnbG9nVihKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgb0V4dHJhY3RlZENvbnRleHQgPSBleHRyYWN0QXJnc01hcChtLCBvUnVsZS5hcmdzTWFwKTtcbiAgICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2dWKFwiZXh0cmFjdGVkIGFyZ3MgXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZS5hcmdzTWFwKSk7XG4gICAgICAgIGRlYnVnbG9nVihcIm1hdGNoIFwiICsgSlNPTi5zdHJpbmdpZnkobSkpO1xuICAgICAgICBkZWJ1Z2xvZ1YoXCJleHRyYWN0ZWQgYXJncyBcIiArIEpTT04uc3RyaW5naWZ5KG9FeHRyYWN0ZWRDb250ZXh0KSk7XG4gICAgfVxuICAgIHZhciByZXMgPSBBbnlPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKTtcbiAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpO1xuICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcbiAgICBpZiAob0V4dHJhY3RlZENvbnRleHRbc0tleV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXNbc0tleV0gPSBvRXh0cmFjdGVkQ29udGV4dFtzS2V5XTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMub3ZlcnJpZGUpIHtcbiAgICAgICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xuICAgICAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpO1xuICAgIH1cbiAgICBPYmplY3QuZnJlZXplKHJlcyk7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/ICgnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSkgOiAnLScpO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLm1hdGNoUmVnRXhwID0gbWF0Y2hSZWdFeHA7XG5mdW5jdGlvbiBzb3J0QnlXZWlnaHQoc0tleSwgb0NvbnRleHRBLCBvQ29udGV4dEIpIHtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZ1YoJ3NvcnRpbmc6ICcgKyBzS2V5ICsgJ2ludm9rZWQgd2l0aFxcbiAxOicgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEEsIHVuZGVmaW5lZCwgMikgK1xuICAgICAgICAgICAgXCIgdnMgXFxuIDI6XCIgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEIsIHVuZGVmaW5lZCwgMikpO1xuICAgIH1cbiAgICB2YXIgcmFua2luZ0EgPSBwYXJzZUZsb2F0KG9Db250ZXh0QVtcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcbiAgICB2YXIgcmFua2luZ0IgPSBwYXJzZUZsb2F0KG9Db250ZXh0QltcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcbiAgICBpZiAocmFua2luZ0EgIT09IHJhbmtpbmdCKSB7XG4gICAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZyhcIiByYW5raW4gZGVsdGFcIiArIDEwMCAqIChyYW5raW5nQiAtIHJhbmtpbmdBKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIDEwMCAqIChyYW5raW5nQiAtIHJhbmtpbmdBKTtcbiAgICB9XG4gICAgdmFyIHdlaWdodEEgPSBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QVtcIl93ZWlnaHRcIl1bc0tleV0gfHwgMDtcbiAgICB2YXIgd2VpZ2h0QiA9IG9Db250ZXh0QltcIl93ZWlnaHRcIl0gJiYgb0NvbnRleHRCW1wiX3dlaWdodFwiXVtzS2V5XSB8fCAwO1xuICAgIHJldHVybiArKHdlaWdodEIgLSB3ZWlnaHRBKTtcbn1cbmV4cG9ydHMuc29ydEJ5V2VpZ2h0ID0gc29ydEJ5V2VpZ2h0O1xuLy8gV29yZCwgU3lub255bSwgUmVnZXhwIC8gRXh0cmFjdGlvblJ1bGVcbmZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBvUnVsZXMsIG9wdGlvbnMpIHtcbiAgICB2YXIgc0tleSA9IG9SdWxlc1swXS5rZXk7XG4gICAgLy8gY2hlY2sgdGhhdCBydWxlXG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgLy8gY2hlY2sgY29uc2lzdGVuY3lcbiAgICAgICAgb1J1bGVzLmV2ZXJ5KGZ1bmN0aW9uIChpUnVsZSkge1xuICAgICAgICAgICAgaWYgKGlSdWxlLmtleSAhPT0gc0tleSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkluaG9tb2dlbm91cyBrZXlzIGluIHJ1bGVzLCBleHBlY3RlZCBcIiArIHNLZXkgKyBcIiB3YXMgXCIgKyBKU09OLnN0cmluZ2lmeShpUnVsZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBsb29rIGZvciBydWxlcyB3aGljaCBtYXRjaFxuICAgIHZhciByZXMgPSBvUnVsZXMubWFwKGZ1bmN0aW9uIChvUnVsZSkge1xuICAgICAgICAvLyBpcyB0aGlzIHJ1bGUgYXBwbGljYWJsZVxuICAgICAgICBzd2l0Y2ggKG9SdWxlLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgMCAvKiBXT1JEICovOlxuICAgICAgICAgICAgICAgIHJldHVybiBtYXRjaFdvcmQob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgY2FzZSAxIC8qIFJFR0VYUCAqLzpcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2hSZWdFeHAob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSkuZmlsdGVyKGZ1bmN0aW9uIChvcmVzKSB7XG4gICAgICAgIHJldHVybiAhIW9yZXM7XG4gICAgfSkuc29ydChzb3J0QnlXZWlnaHQuYmluZCh0aGlzLCBzS2V5KSk7XG4gICAgLy9kZWJ1Z2xvZyhcImhhc3NvcnRlZFwiICsgSlNPTi5zdHJpbmdpZnkocmVzLHVuZGVmaW5lZCwyKSk7XG4gICAgcmV0dXJuIHJlcztcbiAgICAvLyBPYmplY3Qua2V5cygpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAvLyB9KTtcbn1cbmV4cG9ydHMuYXVnbWVudENvbnRleHQxID0gYXVnbWVudENvbnRleHQxO1xuZnVuY3Rpb24gYXVnbWVudENvbnRleHQoY29udGV4dCwgYVJ1bGVzKSB7XG4gICAgdmFyIG9wdGlvbnMxID0ge1xuICAgICAgICBtYXRjaG90aGVyczogdHJ1ZSxcbiAgICAgICAgb3ZlcnJpZGU6IGZhbHNlXG4gICAgfTtcbiAgICB2YXIgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMxKTtcbiAgICBpZiAoYVJlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdmFyIG9wdGlvbnMyID0ge1xuICAgICAgICAgICAgbWF0Y2hvdGhlcnM6IGZhbHNlLFxuICAgICAgICAgICAgb3ZlcnJpZGU6IHRydWVcbiAgICAgICAgfTtcbiAgICAgICAgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMyKTtcbiAgICB9XG4gICAgcmV0dXJuIGFSZXM7XG59XG5leHBvcnRzLmF1Z21lbnRDb250ZXh0ID0gYXVnbWVudENvbnRleHQ7XG5mdW5jdGlvbiBpbnNlcnRPcmRlcmVkKHJlc3VsdCwgaUluc2VydGVkTWVtYmVyLCBsaW1pdCkge1xuICAgIC8vIFRPRE86IHVzZSBzb21lIHdlaWdodFxuICAgIGlmIChyZXN1bHQubGVuZ3RoIDwgbGltaXQpIHtcbiAgICAgICAgcmVzdWx0LnB1c2goaUluc2VydGVkTWVtYmVyKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cbmV4cG9ydHMuaW5zZXJ0T3JkZXJlZCA9IGluc2VydE9yZGVyZWQ7XG5mdW5jdGlvbiB0YWtlVG9wTihhcnIpIHtcbiAgICB2YXIgdSA9IGFyci5maWx0ZXIoZnVuY3Rpb24gKGlubmVyQXJyKSB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwOyB9KTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgLy8gc2hpZnQgb3V0IHRoZSB0b3Agb25lc1xuICAgIHUgPSB1Lm1hcChmdW5jdGlvbiAoaUFycikge1xuICAgICAgICB2YXIgdG9wID0gaUFyci5zaGlmdCgpO1xuICAgICAgICByZXMgPSBpbnNlcnRPcmRlcmVkKHJlcywgdG9wLCA1KTtcbiAgICAgICAgcmV0dXJuIGlBcnI7XG4gICAgfSkuZmlsdGVyKGZ1bmN0aW9uIChpbm5lckFycikgeyByZXR1cm4gaW5uZXJBcnIubGVuZ3RoID4gMDsgfSk7XG4gICAgLy8gYXMgQXJyYXk8QXJyYXk8SUZNYXRjaC5jb250ZXh0Pj5cbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy50YWtlVG9wTiA9IHRha2VUb3BOO1xudmFyIGlucHV0RmlsdGVyUnVsZXMgPSByZXF1aXJlKFwiLi9pbnB1dEZpbHRlclJ1bGVzXCIpO1xudmFyIHJtO1xuZnVuY3Rpb24gZ2V0Uk1PbmNlKCkge1xuICAgIGlmICghcm0pIHtcbiAgICAgICAgcm0gPSBpbnB1dEZpbHRlclJ1bGVzLmdldFJ1bGVNYXAoKTtcbiAgICB9XG4gICAgcmV0dXJuIHJtO1xufVxuZnVuY3Rpb24gYXBwbHlSdWxlcyhjb250ZXh0KSB7XG4gICAgdmFyIGJlc3ROID0gW2NvbnRleHRdO1xuICAgIGlucHV0RmlsdGVyUnVsZXMub0tleU9yZGVyLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgICAgdmFyIGJlc3ROZXh0ID0gW107XG4gICAgICAgIGJlc3ROLmZvckVhY2goZnVuY3Rpb24gKG9Db250ZXh0KSB7XG4gICAgICAgICAgICBpZiAob0NvbnRleHRbc0tleV0pIHtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZygnKiogYXBwbHlpbmcgcnVsZXMgZm9yICcgKyBzS2V5KTtcbiAgICAgICAgICAgICAgICB2YXIgcmVzID0gYXVnbWVudENvbnRleHQob0NvbnRleHQsIGdldFJNT25jZSgpW3NLZXldIHx8IFtdKTtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKCcqKiByZXN1bHQgZm9yICcgKyBzS2V5ICsgJyA9ICcgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpIDogJy0nKTtcbiAgICAgICAgICAgICAgICBiZXN0TmV4dC5wdXNoKHJlcyB8fCBbXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBydWxlIG5vdCByZWxldmFudFxuICAgICAgICAgICAgICAgIGJlc3ROZXh0LnB1c2goW29Db250ZXh0XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBiZXN0TiA9IHRha2VUb3BOKGJlc3ROZXh0KTtcbiAgICB9KTtcbiAgICByZXR1cm4gYmVzdE47XG59XG5leHBvcnRzLmFwcGx5UnVsZXMgPSBhcHBseVJ1bGVzO1xuZnVuY3Rpb24gYXBwbHlSdWxlc1BpY2tGaXJzdChjb250ZXh0KSB7XG4gICAgdmFyIHIgPSBhcHBseVJ1bGVzKGNvbnRleHQpO1xuICAgIHJldHVybiByICYmIHJbMF07XG59XG5leHBvcnRzLmFwcGx5UnVsZXNQaWNrRmlyc3QgPSBhcHBseVJ1bGVzUGlja0ZpcnN0O1xuLyoqXG4gKiBEZWNpZGUgd2hldGhlciB0byByZXF1ZXJ5IGZvciBhIGNvbnRldFxuICovXG4vL2V4cG9ydCBmdW5jdGlvbiBkZWNpZGVPblJlUXVlcnkoY29udGV4dDogSUZNYXRjaC5jb250ZXh0KTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XG4vLyAgcmV0dXJuIFtdXG4vL31cbiIsIi8qKlxyXG4gKiB0aGUgaW5wdXQgZmlsdGVyIHN0YWdlIHByZXByb2Nlc3NlcyBhIGN1cnJlbnQgY29udGV4dFxyXG4gKlxyXG4gKiBJdCBhKSBjb21iaW5lcyBtdWx0aS1zZWdtZW50IGFyZ3VtZW50cyBpbnRvIG9uZSBjb250ZXh0IG1lbWJlcnNcclxuICogSXQgYikgYXR0ZW1wdHMgdG8gYXVnbWVudCB0aGUgY29udGV4dCBieSBhZGRpdGlvbmFsIHF1YWxpZmljYXRpb25zXHJcbiAqICAgICAgICAgICAoTWlkIHRlcm0gZ2VuZXJhdGluZyBBbHRlcm5hdGl2ZXMsIGUuZy5cclxuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHVuaXQgdGVzdD9cclxuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHNvdXJjZSA/XHJcbiAqICAgICAgICAgICApXHJcbiAqICBTaW1wbGUgcnVsZXMgbGlrZSAgSW50ZW50XHJcbiAqXHJcbiAqXHJcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmlucHV0RmlsdGVyXHJcbiAqIEBmaWxlIGlucHV0RmlsdGVyLnRzXHJcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cclxuICovXHJcbi8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2xpYi9ub2RlLTQuZC50c1wiIC8+XHJcbmltcG9ydCAqIGFzIGRpc3RhbmNlIGZyb20gJy4uL3V0aWxzL2RhbWVyYXVMZXZlbnNodGVpbic7XHJcblxyXG5pbXBvcnQgKiBhcyBMb2dnZXIgZnJvbSAnLi4vdXRpbHMvbG9nZ2VyJ1xyXG5cclxuY29uc3QgbG9nZ2VyID0gTG9nZ2VyLmxvZ2dlcignaW5wdXRGaWx0ZXInKTtcclxuXHJcbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcclxudmFyIGRlYnVncGVyZiA9IGRlYnVnKCdwZXJmJyk7XHJcblxyXG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuLi91dGlscy91dGlscyc7XHJcblxyXG5cclxuaW1wb3J0ICogYXMgQWxnb2wgZnJvbSAnLi9hbGdvbCc7XHJcblxyXG5pbXBvcnQgKiBhcyBJTWF0Y2ggZnJvbSAnLi9pZm1hdGNoJztcclxuXHJcbmltcG9ydCAqIGFzIGJyZWFrZG93biBmcm9tICcuL2JyZWFrZG93bic7XHJcblxyXG5jb25zdCBBbnlPYmplY3QgPSA8YW55Pk9iamVjdDtcclxuXHJcbnZhciBkZWJ1Z2xvZyA9IGRlYnVnKCdpbnB1dEZpbHRlcicpXHJcbnZhciBkZWJ1Z2xvZ1YgPSBkZWJ1ZygnaW5wdXRWRmlsdGVyJylcclxudmFyIGRlYnVnbG9nTSA9IGRlYnVnKCdpbnB1dE1GaWx0ZXInKVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG1vY2tEZWJ1ZyhvKSB7XHJcbiAgZGVidWdsb2cgPSBvO1xyXG4gIGRlYnVnbG9nViA9IG87XHJcbiAgZGVidWdsb2dNID0gbztcclxufVxyXG5cclxuXHJcbmltcG9ydCAqIGFzIG1hdGNoZGF0YSBmcm9tICcuL21hdGNoZGF0YSc7XHJcbnZhciBvVW5pdFRlc3RzID0gbWF0Y2hkYXRhLm9Vbml0VGVzdHNcclxuXHJcblxyXG5cclxuLyoqXHJcbiAqIEBwYXJhbSBzVGV4dCB7c3RyaW5nfSB0aGUgdGV4dCB0byBtYXRjaCB0byBOYXZUYXJnZXRSZXNvbHV0aW9uXHJcbiAqIEBwYXJhbSBzVGV4dDIge3N0cmluZ30gdGhlIHF1ZXJ5IHRleHQsIGUuZy4gTmF2VGFyZ2V0XHJcbiAqXHJcbiAqIEByZXR1cm4gdGhlIGRpc3RhbmNlLCBub3RlIHRoYXQgaXMgaXMgKm5vdCogc3ltbWV0cmljIVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNEaXN0YW5jZShzVGV4dDE6IHN0cmluZywgc1RleHQyOiBzdHJpbmcpOiBudW1iZXIge1xyXG4gIHJldHVybiBkaXN0YW5jZS5jYWxjRGlzdGFuY2VBZGp1c3RlZChzVGV4dDEsc1RleHQyKTtcclxufVxyXG5cclxuXHJcblxyXG4vKipcclxuICogQHBhcmFtIHNUZXh0IHtzdHJpbmd9IHRoZSB0ZXh0IHRvIG1hdGNoIHRvIE5hdlRhcmdldFJlc29sdXRpb25cclxuICogQHBhcmFtIHNUZXh0MiB7c3RyaW5nfSB0aGUgcXVlcnkgdGV4dCwgZS5nLiBOYXZUYXJnZXRcclxuICpcclxuICogQHJldHVybiB0aGUgZGlzdGFuY2UsIG5vdGUgdGhhdCBpcyBpcyAqbm90KiBzeW1tZXRyaWMhXHJcbiAqL1xyXG4vKlxyXG5leHBvcnQgZnVuY3Rpb24gY2FsY0Rpc3RhbmNlTGV2ZW5YWFgoc1RleHQxOiBzdHJpbmcsIHNUZXh0Mjogc3RyaW5nKTogbnVtYmVyIHtcclxuICAvLyBjb25zb2xlLmxvZyhcImxlbmd0aDJcIiArIHNUZXh0MSArIFwiIC0gXCIgKyBzVGV4dDIpXHJcbiAgIGlmKCgoc1RleHQxLmxlbmd0aCAtIHNUZXh0Mi5sZW5ndGgpID4gQWxnb2wuY2FsY0Rpc3QubGVuZ3RoRGVsdGExKVxyXG4gICAgfHwgKHNUZXh0Mi5sZW5ndGggPiAxLjUgKiBzVGV4dDEubGVuZ3RoIClcclxuICAgIHx8IChzVGV4dDIubGVuZ3RoIDwgKHNUZXh0MS5sZW5ndGgvMikpICkge1xyXG4gICAgcmV0dXJuIDUwMDAwO1xyXG4gIH1cclxuICB2YXIgYTAgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEuc3Vic3RyaW5nKDAsIHNUZXh0Mi5sZW5ndGgpLCBzVGV4dDIpXHJcbiAgaWYoZGVidWdsb2dWLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nVihcImRpc3RhbmNlXCIgKyBhMCArIFwic3RyaXBwZWQ+XCIgKyBzVGV4dDEuc3Vic3RyaW5nKDAsc1RleHQyLmxlbmd0aCkgKyBcIjw+XCIgKyBzVGV4dDIrIFwiPFwiKTtcclxuICB9XHJcbiAgaWYoYTAgKiA1MCA+IDE1ICogc1RleHQyLmxlbmd0aCkge1xyXG4gICAgICByZXR1cm4gNDAwMDA7XHJcbiAgfVxyXG4gIHZhciBhID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLCBzVGV4dDIpXHJcbiAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGFcclxufVxyXG4qL1xyXG5cclxuXHJcblxyXG5pbXBvcnQgKiBhcyBJRk1hdGNoIGZyb20gJy4uL21hdGNoL2lmbWF0Y2gnO1xyXG5cclxudHlwZSBJUnVsZSA9IElGTWF0Y2guSVJ1bGVcclxuXHJcblxyXG5pbnRlcmZhY2UgSU1hdGNoT3B0aW9ucyB7XHJcbiAgbWF0Y2hvdGhlcnM/OiBib29sZWFuLFxyXG4gIGF1Z21lbnQ/OiBib29sZWFuLFxyXG4gIG92ZXJyaWRlPzogYm9vbGVhblxyXG59XHJcblxyXG5pbnRlcmZhY2UgSU1hdGNoQ291bnQge1xyXG4gIGVxdWFsOiBudW1iZXJcclxuICBkaWZmZXJlbnQ6IG51bWJlclxyXG4gIHNwdXJpb3VzUjogbnVtYmVyXHJcbiAgc3B1cmlvdXNMOiBudW1iZXJcclxufVxyXG5cclxudHlwZSBFbnVtUnVsZVR5cGUgPSBJRk1hdGNoLkVudW1SdWxlVHlwZVxyXG5cclxuLy9jb25zdCBsZXZlbkN1dG9mZiA9IEFsZ29sLkN1dG9mZl9MZXZlblNodGVpbjtcclxuXHJcbi8qXHJcbmV4cG9ydCBmdW5jdGlvbiBsZXZlblBlbmFsdHlPbGQoaTogbnVtYmVyKTogbnVtYmVyIHtcclxuICAvLyAwLT4gMVxyXG4gIC8vIDEgLT4gMC4xXHJcbiAgLy8gMTUwIC0+ICAwLjhcclxuICBpZiAoaSA9PT0gMCkge1xyXG4gICAgcmV0dXJuIDE7XHJcbiAgfVxyXG4gIC8vIHJldmVyc2UgbWF5IGJlIGJldHRlciB0aGFuIGxpbmVhclxyXG4gIHJldHVybiAxICsgaSAqICgwLjggLSAxKSAvIDE1MFxyXG59XHJcbiovXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbGV2ZW5QZW5hbHR5KGk6IG51bWJlcik6IG51bWJlciB7XHJcbiAgLy8gMSAtPiAxXHJcbiAgLy8gY3V0T2ZmID0+IDAuOFxyXG4gIHJldHVybiBpO1xyXG4gIC8vcmV0dXJuICAgMSAtICAoMSAtIGkpICowLjIvQWxnb2wuQ3V0b2ZmX1dvcmRNYXRjaDtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIG5vblByaXZhdGVLZXlzKG9BKSB7XHJcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG9BKS5maWx0ZXIoa2V5ID0+IHtcclxuICAgIHJldHVybiBrZXlbMF0gIT09ICdfJztcclxuICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNvdW50QWluQihvQSwgb0IsIGZuQ29tcGFyZSwgYUtleUlnbm9yZT8pOiBudW1iZXIge1xyXG4gIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gYUtleUlnbm9yZSA6XHJcbiAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xyXG4gIGZuQ29tcGFyZSA9IGZuQ29tcGFyZSB8fCBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9XHJcbiAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xyXG4gICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcclxuICB9KS5cclxuICAgIHJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XHJcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIChmbkNvbXBhcmUob0Fba2V5XSwgb0Jba2V5XSwga2V5KSA/IDEgOiAwKVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBwcmV2XHJcbiAgICB9LCAwKVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc3B1cmlvdXNBbm90SW5CKG9BLCBvQiwgYUtleUlnbm9yZT8pIHtcclxuICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxyXG4gICAgdHlwZW9mIGFLZXlJZ25vcmUgPT09IFwic3RyaW5nXCIgPyBbYUtleUlnbm9yZV0gOiBbXTtcclxuICByZXR1cm4gbm9uUHJpdmF0ZUtleXMob0EpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xyXG4gIH0pLlxyXG4gICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIDFcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldlxyXG4gICAgfSwgMClcclxufVxyXG5cclxuZnVuY3Rpb24gbG93ZXJDYXNlKG8pIHtcclxuICBpZiAodHlwZW9mIG8gPT09IFwic3RyaW5nXCIpIHtcclxuICAgIHJldHVybiBvLnRvTG93ZXJDYXNlKClcclxuICB9XHJcbiAgcmV0dXJuIG9cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmVDb250ZXh0KG9BLCBvQiwgYUtleUlnbm9yZT8pIHtcclxuICB2YXIgZXF1YWwgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpID09PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xyXG4gIHZhciBkaWZmZXJlbnQgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpICE9PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xyXG4gIHZhciBzcHVyaW91c0wgPSBzcHVyaW91c0Fub3RJbkIob0EsIG9CLCBhS2V5SWdub3JlKVxyXG4gIHZhciBzcHVyaW91c1IgPSBzcHVyaW91c0Fub3RJbkIob0IsIG9BLCBhS2V5SWdub3JlKVxyXG4gIHJldHVybiB7XHJcbiAgICBlcXVhbDogZXF1YWwsXHJcbiAgICBkaWZmZXJlbnQ6IGRpZmZlcmVudCxcclxuICAgIHNwdXJpb3VzTDogc3B1cmlvdXNMLFxyXG4gICAgc3B1cmlvdXNSOiBzcHVyaW91c1JcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNvcnRCeVJhbmsoYTogSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmcsIGI6IElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nKTogbnVtYmVyIHtcclxuICB2YXIgciA9IC0oKGEuX3JhbmtpbmcgfHwgMS4wKSAtIChiLl9yYW5raW5nIHx8IDEuMCkpO1xyXG4gIGlmIChyKSB7XHJcbiAgICByZXR1cm4gcjtcclxuICB9XHJcbiAgaWYgKGEuY2F0ZWdvcnkgJiYgYi5jYXRlZ29yeSkge1xyXG4gICAgciA9IGEuY2F0ZWdvcnkubG9jYWxlQ29tcGFyZShiLmNhdGVnb3J5KTtcclxuICAgIGlmIChyKSB7XHJcbiAgICAgIHJldHVybiByO1xyXG4gICAgfVxyXG4gIH1cclxuICBpZiAoYS5tYXRjaGVkU3RyaW5nICYmIGIubWF0Y2hlZFN0cmluZykge1xyXG4gICAgciA9IGEubWF0Y2hlZFN0cmluZy5sb2NhbGVDb21wYXJlKGIubWF0Y2hlZFN0cmluZyk7XHJcbiAgICBpZiAocikge1xyXG4gICAgICByZXR1cm4gcjtcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIDA7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tPbmVSdWxlKHN0cmluZzogc3RyaW5nLCBsY1N0cmluZyA6IHN0cmluZywgZXhhY3QgOiBib29sZWFuLFxyXG5yZXMgOiBBcnJheTxJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPixcclxub1J1bGUgOiBJTWF0Y2gubVJ1bGUsIGNudFJlYz8gOiBJQ250UmVjICkge1xyXG4gICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcclxuICAgICAgZGVidWdsb2dWKCdhdHRlbXB0aW5nIHRvIG1hdGNoIHJ1bGUgJyArIEpTT04uc3RyaW5naWZ5KG9SdWxlKSArIFwiIHRvIHN0cmluZyBcXFwiXCIgKyBzdHJpbmcgKyBcIlxcXCJcIik7XHJcbiAgICB9XHJcbiAgICBzd2l0Y2ggKG9SdWxlLnR5cGUpIHtcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5XT1JEOlxyXG4gICAgICAgIGlmKCFvUnVsZS5sb3dlcmNhc2V3b3JkKSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3J1bGUgd2l0aG91dCBhIGxvd2VyY2FzZSB2YXJpYW50JyArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKTtcclxuICAgICAgICAgfTtcclxuICAgICAgICBpZiAoZXhhY3QgJiYgb1J1bGUud29yZCA9PT0gc3RyaW5nIHx8IG9SdWxlLmxvd2VyY2FzZXdvcmQgPT09IGxjU3RyaW5nKSB7XHJcbiAgICAgICAgICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAgICAgICAgIGRlYnVnbG9nKFwiXFxuIW1hdGNoZWQgZXhhY3QgXCIgKyBzdHJpbmcgKyBcIj1cIiAgKyBvUnVsZS5sb3dlcmNhc2V3b3JkICArIFwiID0+IFwiICsgb1J1bGUubWF0Y2hlZFN0cmluZyArIFwiL1wiICsgb1J1bGUuY2F0ZWdvcnkpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmVzLnB1c2goe1xyXG4gICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcclxuICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxyXG4gICAgICAgICAgICBfcmFua2luZzogb1J1bGUuX3JhbmtpbmcgfHwgMS4wXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIWV4YWN0ICYmICFvUnVsZS5leGFjdE9ubHkpIHtcclxuICAgICAgICAgIHZhciBsZXZlbm1hdGNoID0gY2FsY0Rpc3RhbmNlKG9SdWxlLmxvd2VyY2FzZXdvcmQsIGxjU3RyaW5nKTtcclxuXHJcbi8qXHJcbiAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlXCIsIDEpO1xyXG4gICAgICAgICAgaWYobGV2ZW5tYXRjaCA8IDUwKSB7XHJcbiAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VFeHBcIiwgMSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZihsZXZlbm1hdGNoIDwgNDAwMDApIHtcclxuICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYyxcImNhbGNEaXN0YW5jZUJlbG93NDBrXCIsIDEpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgKi9cclxuICAgICAgICAgIC8vaWYob1J1bGUubG93ZXJjYXNld29yZCA9PT0gXCJjb3Ntb3NcIikge1xyXG4gICAgICAgICAgLy8gIGNvbnNvbGUubG9nKFwiaGVyZSByYW5raW5nIFwiICsgbGV2ZW5tYXRjaCArIFwiIFwiICsgb1J1bGUubG93ZXJjYXNld29yZCArIFwiIFwiICsgbGNTdHJpbmcpO1xyXG4gICAgICAgICAgLy99XHJcbiAgICAgICAgICBpZiAobGV2ZW5tYXRjaCA+PSBBbGdvbC5DdXRvZmZfV29yZE1hdGNoKSB7IC8vIGxldmVuQ3V0b2ZmKSB7XHJcbiAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VPa1wiLCAxKTtcclxuICAgICAgICAgICAgdmFyIHJlYyA9IHtcclxuICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcclxuICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBvUnVsZS5tYXRjaGVkU3RyaW5nLFxyXG4gICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgICBfcmFua2luZzogKG9SdWxlLl9yYW5raW5nIHx8IDEuMCkgKiBsZXZlblBlbmFsdHkobGV2ZW5tYXRjaCksXHJcbiAgICAgICAgICAgICAgbGV2ZW5tYXRjaDogbGV2ZW5tYXRjaFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBpZihkZWJ1Z2xvZykge1xyXG4gICAgICAgICAgICAgIGRlYnVnbG9nKFwiXFxuIWZ1enp5IFwiICsgKGxldmVubWF0Y2gpLnRvRml4ZWQoMykgKyBcIiBcIiArIHJlYy5fcmFua2luZy50b0ZpeGVkKDMpICsgXCIgIFwiICsgc3RyaW5nICsgXCI9XCIgICsgb1J1bGUubG93ZXJjYXNld29yZCAgKyBcIiA9PiBcIiArIG9SdWxlLm1hdGNoZWRTdHJpbmcgKyBcIi9cIiArIG9SdWxlLmNhdGVnb3J5KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXMucHVzaChyZWMpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5SRUdFWFA6IHtcclxuICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoXCIgaGVyZSByZWdleHBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKSlcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIG0gPSBvUnVsZS5yZWdleHAuZXhlYyhzdHJpbmcpXHJcbiAgICAgICAgaWYgKG0pIHtcclxuICAgICAgICAgIHJlcy5wdXNoKHtcclxuICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IChvUnVsZS5tYXRjaEluZGV4ICE9PSB1bmRlZmluZWQgJiYgbVtvUnVsZS5tYXRjaEluZGV4XSkgfHwgc3RyaW5nLFxyXG4gICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXHJcbiAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidW5rbm93biB0eXBlXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSlcclxuICAgIH1cclxufVxyXG5cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tPbmVSdWxlV2l0aE9mZnNldChzdHJpbmc6IHN0cmluZywgbGNTdHJpbmcgOiBzdHJpbmcsIGV4YWN0IDogYm9vbGVhbixcclxucmVzIDogQXJyYXk8SU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1JhbmdlZD4sXHJcbm9SdWxlIDogSU1hdGNoLm1SdWxlLCBjbnRSZWM/IDogSUNudFJlYyApIHtcclxuICAgaWYgKGRlYnVnbG9nVi5lbmFibGVkKSB7XHJcbiAgICAgIGRlYnVnbG9nVignYXR0ZW1wdGluZyB0byBtYXRjaCBydWxlICcgKyBKU09OLnN0cmluZ2lmeShvUnVsZSkgKyBcIiB0byBzdHJpbmcgXFxcIlwiICsgc3RyaW5nICsgXCJcXFwiXCIpO1xyXG4gICAgfVxyXG4gICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuV09SRDpcclxuICAgICAgICBpZighb1J1bGUubG93ZXJjYXNld29yZCkge1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdydWxlIHdpdGhvdXQgYSBsb3dlcmNhc2UgdmFyaWFudCcgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSk7XHJcbiAgICAgICAgIH07XHJcbiAgICAgICAgaWYgKGV4YWN0ICYmIChvUnVsZS53b3JkID09PSBzdHJpbmcgfHwgb1J1bGUubG93ZXJjYXNld29yZCA9PT0gbGNTdHJpbmcpKSB7XHJcbiAgICAgICAgICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAgICAgICAgIGRlYnVnbG9nKFwiXFxuIW1hdGNoZWQgZXhhY3QgXCIgKyBzdHJpbmcgKyBcIj1cIiAgKyBvUnVsZS5sb3dlcmNhc2V3b3JkICArIFwiID0+IFwiICsgb1J1bGUubWF0Y2hlZFN0cmluZyArIFwiL1wiICsgb1J1bGUuY2F0ZWdvcnkpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmVzLnB1c2goe1xyXG4gICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcclxuICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxyXG4gICAgICAgICAgICBydWxlOiBvUnVsZSxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCFleGFjdCAmJiAhb1J1bGUuZXhhY3RPbmx5KSB7XHJcbiAgICAgICAgICB2YXIgbGV2ZW5tYXRjaCA9IGNhbGNEaXN0YW5jZShvUnVsZS5sb3dlcmNhc2V3b3JkLCBsY1N0cmluZyk7XHJcblxyXG4vKlxyXG4gICAgICAgICAgYWRkQ250UmVjKGNudFJlYyxcImNhbGNEaXN0YW5jZVwiLCAxKTtcclxuICAgICAgICAgIGlmKGxldmVubWF0Y2ggPCA1MCkge1xyXG4gICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlRXhwXCIsIDEpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYobGV2ZW5tYXRjaCA8IDQwMDAwKSB7XHJcbiAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VCZWxvdzQwa1wiLCAxKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgICovXHJcbiAgICAgICAgICAvL2lmKG9SdWxlLmxvd2VyY2FzZXdvcmQgPT09IFwiY29zbW9zXCIpIHtcclxuICAgICAgICAgIC8vICBjb25zb2xlLmxvZyhcImhlcmUgcmFua2luZyBcIiArIGxldmVubWF0Y2ggKyBcIiBcIiArIG9SdWxlLmxvd2VyY2FzZXdvcmQgKyBcIiBcIiArIGxjU3RyaW5nKTtcclxuICAgICAgICAgIC8vfVxyXG4gICAgICAgICAgaWYgKGxldmVubWF0Y2ggPj0gQWxnb2wuQ3V0b2ZmX1dvcmRNYXRjaCkgeyAvLyBsZXZlbkN1dG9mZikge1xyXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiZm91bmQgcmVjXCIpO1xyXG4gICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlT2tcIiwgMSk7XHJcbiAgICAgICAgICAgIHZhciByZWMgPSB7XHJcbiAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgICAgICAgICAgICAgcnVsZSA6IG9SdWxlLFxyXG4gICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXHJcbiAgICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxyXG4gICAgICAgICAgICAgIF9yYW5raW5nOiAob1J1bGUuX3JhbmtpbmcgfHwgMS4wKSAqIGxldmVuUGVuYWx0eShsZXZlbm1hdGNoKSxcclxuICAgICAgICAgICAgICBsZXZlbm1hdGNoOiBsZXZlbm1hdGNoXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGlmKGRlYnVnbG9nKSB7XHJcbiAgICAgICAgICAgICAgZGVidWdsb2coXCJcXG4hQ09STzogZnV6enkgXCIgKyAobGV2ZW5tYXRjaCkudG9GaXhlZCgzKSArIFwiIFwiICsgcmVjLl9yYW5raW5nLnRvRml4ZWQoMykgKyBcIiAgXFxcIlwiICsgc3RyaW5nICsgXCJcXFwiPVwiICArIG9SdWxlLmxvd2VyY2FzZXdvcmQgICsgXCIgPT4gXCIgKyBvUnVsZS5tYXRjaGVkU3RyaW5nICsgXCIvXCIgKyBvUnVsZS5jYXRlZ29yeSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmVzLnB1c2gocmVjKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuUkVHRVhQOiB7XHJcbiAgICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KFwiIGhlcmUgcmVnZXhwXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSkpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBtID0gb1J1bGUucmVnZXhwLmV4ZWMoc3RyaW5nKVxyXG4gICAgICAgIGlmIChtKSB7XHJcbiAgICAgICAgICByZXMucHVzaCh7XHJcbiAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxyXG4gICAgICAgICAgICBydWxlOiBvUnVsZSxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogKG9SdWxlLm1hdGNoSW5kZXggIT09IHVuZGVmaW5lZCAmJiBtW29SdWxlLm1hdGNoSW5kZXhdKSB8fCBzdHJpbmcsXHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmtub3duIHR5cGVcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKVxyXG4gICAgfVxyXG59XHJcblxyXG5cclxuXHJcblxyXG5pbnRlcmZhY2UgSUNudFJlYyB7XHJcblxyXG59O1xyXG5cclxuZnVuY3Rpb24gYWRkQ250UmVjKGNudFJlYyA6IElDbnRSZWMsIG1lbWJlciA6IHN0cmluZywgbnVtYmVyIDogbnVtYmVyKSB7XHJcbiAgaWYoKCFjbnRSZWMpIHx8IChudW1iZXIgPT09IDApKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIGNudFJlY1ttZW1iZXJdID0gKGNudFJlY1ttZW1iZXJdIHx8IDApICsgbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVN0cmluZyh3b3JkOiBzdHJpbmcsIGV4YWN0OiBib29sZWFuLCBvUnVsZXM6IEFycmF5PElNYXRjaC5tUnVsZT4sXHJcbiBjbnRSZWM/IDogSUNudFJlYyk6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiB7XHJcbiAgLy8gc2ltcGx5IGFwcGx5IGFsbCBydWxlc1xyXG4gIGlmKGRlYnVnbG9nTS5lbmFibGVkICkgIHtcclxuICAgIGRlYnVnbG9nTShcInJ1bGVzIDogXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZXMsIHVuZGVmaW5lZCwgMikpO1xyXG4gIH1cclxuICB2YXIgbGNTdHJpbmcgPSB3b3JkLnRvTG93ZXJDYXNlKCk7XHJcbiAgdmFyIHJlczogQXJyYXk8SU1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4gPSBbXVxyXG4gIG9SdWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChvUnVsZSkge1xyXG4gICAgY2hlY2tPbmVSdWxlKHdvcmQsbGNTdHJpbmcsZXhhY3QscmVzLG9SdWxlLGNudFJlYyk7XHJcbiAgfSk7XHJcbiAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVNpbmdsZVdvcmRXaXRoT2Zmc2V0KHdvcmQ6IHN0cmluZywgbGN3b3JkIDogc3RyaW5nLCBleGFjdDogYm9vbGVhbiwgb1J1bGVzOiBBcnJheTxJTWF0Y2gubVJ1bGU+LFxyXG4gY250UmVjPyA6IElDbnRSZWMpOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1JhbmdlZD4ge1xyXG4gIC8vIHNpbXBseSBhcHBseSBhbGwgcnVsZXNcclxuICBpZihkZWJ1Z2xvZ00uZW5hYmxlZCApICB7XHJcbiAgICBkZWJ1Z2xvZ00oXCJydWxlcyA6IFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGVzLCB1bmRlZmluZWQsIDIpKTtcclxuICB9XHJcbiAgdmFyIHJlczogQXJyYXk8SU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1JhbmdlZD4gPSBbXVxyXG4gIG9SdWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChvUnVsZSkge1xyXG4gICAgY2hlY2tPbmVSdWxlV2l0aE9mZnNldCh3b3JkLGxjd29yZCxleGFjdCxyZXMsb1J1bGUsY250UmVjKTtcclxuICB9KTtcclxuICBkZWJ1Z2xvZyhgQ1NXV086IGdvdCByZXN1bHRzIGZvciAke2xjd29yZH0gICR7cmVzLmxlbmd0aH1gKTtcclxuICByZXMuc29ydChzb3J0QnlSYW5rKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHBvc3RGaWx0ZXIocmVzIDogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+KSA6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiB7XHJcbiAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XHJcbiAgdmFyIGJlc3RSYW5rID0gMDtcclxuICAvL2NvbnNvbGUubG9nKFwiXFxucGlsdGVyZWQgXCIgKyBKU09OLnN0cmluZ2lmeShyZXMpKTtcclxuICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZyhcInByZUZpbHRlciA6IFxcblwiICsgcmVzLm1hcChmdW5jdGlvbih3b3JkLGluZGV4KSB7XHJcbiAgICAgIHJldHVybiBgJHtpbmRleH0gJHt3b3JkLl9yYW5raW5nfSAgPT4gXCIke3dvcmQuY2F0ZWdvcnl9XCIgJHt3b3JkLm1hdGNoZWRTdHJpbmd9YDtcclxuICAgIH0pLmpvaW4oXCJcXG5cIikpO1xyXG4gIH1cclxuICB2YXIgciA9IHJlcy5maWx0ZXIoZnVuY3Rpb24ocmVzeCxpbmRleCkge1xyXG4gICAgaWYoaW5kZXggPT09IDApIHtcclxuICAgICAgYmVzdFJhbmsgPSByZXN4Ll9yYW5raW5nO1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICAgIC8vIDEtMC45ID0gMC4xXHJcbiAgICAvLyAxLSAwLjkzID0gMC43XHJcbiAgICAvLyAxLzdcclxuICAgIHZhciBkZWx0YSA9IGJlc3RSYW5rIC8gcmVzeC5fcmFua2luZztcclxuICAgIGlmKChyZXN4Lm1hdGNoZWRTdHJpbmcgPT09IHJlc1tpbmRleC0xXS5tYXRjaGVkU3RyaW5nKVxyXG4gICAgICAmJiAocmVzeC5jYXRlZ29yeSA9PT0gcmVzW2luZGV4LTFdLmNhdGVnb3J5KSkge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICAvL2NvbnNvbGUubG9nKFwiXFxuIGRlbHRhIGZvciBcIiArIGRlbHRhICsgXCIgIFwiICsgcmVzeC5fcmFua2luZyk7XHJcbiAgICBpZiAocmVzeC5sZXZlbm1hdGNoICYmIChkZWx0YSA+IDEuMDMpKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH0pO1xyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgICAgZGVidWdsb2coYFxcbmZpbHRlcmVkICR7ci5sZW5ndGh9LyR7cmVzLmxlbmd0aH1gICsgSlNPTi5zdHJpbmdpZnkocikpO1xyXG4gIH1cclxuICByZXR1cm4gcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHBvc3RGaWx0ZXJXaXRoT2Zmc2V0KHJlcyA6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nUmFuZ2VkPikgOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1JhbmdlZD4ge1xyXG4gIHJlcy5zb3J0KHNvcnRCeVJhbmspO1xyXG4gIHZhciBiZXN0UmFuayA9IDA7XHJcbiAgLy9jb25zb2xlLmxvZyhcIlxcbnBpbHRlcmVkIFwiICsgSlNPTi5zdHJpbmdpZnkocmVzKSk7XHJcbiAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgZGVidWdsb2coXCIgcHJlRmlsdGVyIDogXFxuXCIgKyByZXMubWFwKGZ1bmN0aW9uKHdvcmQpIHtcclxuICAgICAgcmV0dXJuIGAgJHt3b3JkLl9yYW5raW5nfSAgPT4gXCIke3dvcmQuY2F0ZWdvcnl9XCIgJHt3b3JkLm1hdGNoZWRTdHJpbmd9IGA7XHJcbiAgICB9KS5qb2luKFwiXFxuXCIpKTtcclxuICB9XHJcbiAgdmFyIHIgPSByZXMuZmlsdGVyKGZ1bmN0aW9uKHJlc3gsaW5kZXgpIHtcclxuICAgIGlmKGluZGV4ID09PSAwKSB7XHJcbiAgICAgIGJlc3RSYW5rID0gcmVzeC5fcmFua2luZztcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICAvLyAxLTAuOSA9IDAuMVxyXG4gICAgLy8gMS0gMC45MyA9IDAuN1xyXG4gICAgLy8gMS83XHJcbiAgICB2YXIgZGVsdGEgPSBiZXN0UmFuayAvIHJlc3guX3Jhbmtpbmc7XHJcbiAgICBpZihcclxuICAgICAgICAhKHJlc3gucnVsZSAmJiByZXN4LnJ1bGUucmFuZ2UpXHJcbiAgICAgJiYgIShyZXNbaW5kZXgtMV0ucnVsZSAmJiByZXNbaW5kZXgtMV0ucnVsZS5yYW5nZSlcclxuICAgICAmJiAocmVzeC5tYXRjaGVkU3RyaW5nID09PSByZXNbaW5kZXgtMV0ubWF0Y2hlZFN0cmluZylcclxuICAgICAmJiAocmVzeC5jYXRlZ29yeSA9PT0gcmVzW2luZGV4LTFdLmNhdGVnb3J5KSkge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICAvL2NvbnNvbGUubG9nKFwiXFxuIGRlbHRhIGZvciBcIiArIGRlbHRhICsgXCIgIFwiICsgcmVzeC5fcmFua2luZyk7XHJcbiAgICBpZiAocmVzeC5sZXZlbm1hdGNoICYmIChkZWx0YSA+IDEuMDMpKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH0pO1xyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgICAgZGVidWdsb2coYFxcbmZpbHRlcmVkICR7ci5sZW5ndGh9LyR7cmVzLmxlbmd0aH1gICsgSlNPTi5zdHJpbmdpZnkocikpO1xyXG4gIH1cclxuICByZXR1cm4gcjtcclxufVxyXG5cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVN0cmluZzIod29yZDogc3RyaW5nLCBleGFjdDogYm9vbGVhbiwgIHJ1bGVzIDogSU1hdGNoLlNwbGl0UnVsZXNcclxuICAsIGNudFJlYz8gOklDbnRSZWMpOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4ge1xyXG4gIC8vIHNpbXBseSBhcHBseSBhbGwgcnVsZXNcclxuICBpZiAoZGVidWdsb2dNLmVuYWJsZWQgKSAge1xyXG4gICAgZGVidWdsb2dNKFwicnVsZXMgOiBcIiArIEpTT04uc3RyaW5naWZ5KHJ1bGVzLHVuZGVmaW5lZCwgMikpO1xyXG4gIH1cclxuICB2YXIgbGNTdHJpbmcgPSB3b3JkLnRvTG93ZXJDYXNlKCk7XHJcbiAgdmFyIHJlczogQXJyYXk8SU1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4gPSBbXTtcclxuICBpZiAoZXhhY3QpIHtcclxuICAgIHZhciByID0gcnVsZXMud29yZE1hcFtsY1N0cmluZ107XHJcbiAgICBpZiAocikge1xyXG4gICAgICByLnJ1bGVzLmZvckVhY2goZnVuY3Rpb24ob1J1bGUpIHtcclxuICAgICAgICByZXMucHVzaCh7XHJcbiAgICAgICAgICAgIHN0cmluZzogd29yZCxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcclxuICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxyXG4gICAgICAgICAgICBfcmFua2luZzogb1J1bGUuX3JhbmtpbmcgfHwgMS4wXHJcbiAgICAgICAgICB9KVxyXG4gICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcnVsZXMubm9uV29yZFJ1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XHJcbiAgICAgIGNoZWNrT25lUnVsZSh3b3JkLGxjU3RyaW5nLGV4YWN0LHJlcyxvUnVsZSxjbnRSZWMpO1xyXG4gICAgfSk7XHJcbiAgICByZXMuc29ydChzb3J0QnlSYW5rKTtcclxuICAgIHJldHVybiByZXM7XHJcbiAgfSBlbHNlIHtcclxuICAgIGRlYnVnbG9nKFwiY2F0ZWdvcml6ZSBub24gZXhhY3RcIiArIHdvcmQgKyBcIiB4eCAgXCIgKyBydWxlcy5hbGxSdWxlcy5sZW5ndGgpO1xyXG4gICAgcmV0dXJuIHBvc3RGaWx0ZXIoY2F0ZWdvcml6ZVN0cmluZyh3b3JkLCBleGFjdCwgcnVsZXMuYWxsUnVsZXMsIGNudFJlYykpO1xyXG4gIH1cclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjYXRlZ29yaXplV29yZEludGVybmFsV2l0aE9mZnNldHMod29yZDogc3RyaW5nLCBsY3dvcmQgOiBzdHJpbmcsIGV4YWN0OiBib29sZWFuLCAgcnVsZXMgOiBJTWF0Y2guU3BsaXRSdWxlc1xyXG4gICwgY250UmVjPyA6SUNudFJlYyk6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nUmFuZ2VkPiB7XHJcblxyXG4gIGRlYnVnbG9nTShcImNhdGVnb3JpemUgXCIgKyBsY3dvcmQgKyBcIiB3aXRoIG9mZnNldCEhISEhISEhISEhISEhISEhXCIgKyBleGFjdClcclxuICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXHJcbiAgaWYgKGRlYnVnbG9nTS5lbmFibGVkICkgIHtcclxuICAgIGRlYnVnbG9nTShcInJ1bGVzIDogXCIgKyBKU09OLnN0cmluZ2lmeShydWxlcyx1bmRlZmluZWQsIDIpKTtcclxuICB9XHJcbiAgdmFyIHJlczogQXJyYXk8SU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1JhbmdlZD4gPSBbXTtcclxuICBpZiAoZXhhY3QpIHtcclxuICAgIHZhciByID0gcnVsZXMud29yZE1hcFtsY3dvcmRdO1xyXG4gICAgaWYgKHIpIHtcclxuICAgICAgZGVidWdsb2dNKGAgLi4uLnB1c2hpbmcgbiBydWxlcyBleGFjdCBmb3IgJHtsY3dvcmR9OmAgKyByLnJ1bGVzLmxlbmd0aCk7XHJcbiAgICAgIGRlYnVnbG9nTShyLnJ1bGVzLm1hcCgocixpbmRleCk9PiAnJyArIGluZGV4ICsgJyAnICsgSlNPTi5zdHJpbmdpZnkocikpLmpvaW4oXCJcXG5cIikpO1xyXG4gICAgICByLnJ1bGVzLmZvckVhY2goZnVuY3Rpb24ob1J1bGUpIHtcclxuICAgICAgICByZXMucHVzaCh7XHJcbiAgICAgICAgICAgIHN0cmluZzogd29yZCxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcclxuICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxyXG4gICAgICAgICAgICBydWxlOiBvUnVsZSxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxyXG4gICAgICAgICAgfSlcclxuICAgICB9KTtcclxuICAgIH1cclxuICAgIHJ1bGVzLm5vbldvcmRSdWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChvUnVsZSkge1xyXG4gICAgICBjaGVja09uZVJ1bGVXaXRoT2Zmc2V0KHdvcmQsbGN3b3JkLCBleGFjdCxyZXMsb1J1bGUsY250UmVjKTtcclxuICAgIH0pO1xyXG4gICAgcmVzID0gcG9zdEZpbHRlcldpdGhPZmZzZXQocmVzKTtcclxuICAgIGRlYnVnbG9nKFwiaGVyZSByZXN1bHRzIGZvclwiICsgd29yZCArIFwiIHJlcyBcIiArIHJlcy5sZW5ndGgpO1xyXG4gICAgZGVidWdsb2dNKFwiaGVyZSByZXN1bHRzIGZvclwiICsgd29yZCArIFwiIHJlcyBcIiArIHJlcy5sZW5ndGgpO1xyXG4gICAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XHJcbiAgICByZXR1cm4gcmVzO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBkZWJ1Z2xvZyhcImNhdGVnb3JpemUgbm9uIGV4YWN0XCIgKyB3b3JkICsgXCIgeHggIFwiICsgcnVsZXMuYWxsUnVsZXMubGVuZ3RoKTtcclxuICAgIHZhciByciA9IGNhdGVnb3JpemVTaW5nbGVXb3JkV2l0aE9mZnNldCh3b3JkLGxjd29yZCwgZXhhY3QsIHJ1bGVzLmFsbFJ1bGVzLCBjbnRSZWMpO1xyXG4gICAgLy9kZWJ1bG9nTShcImZ1enp5IHJlcyBcIiArIEpTT04uc3RyaW5naWZ5KHJyKSk7XHJcbiAgICByZXR1cm4gcG9zdEZpbHRlcldpdGhPZmZzZXQocnIpO1xyXG4gIH1cclxufVxyXG5cclxuXHJcblxyXG4vKipcclxuICpcclxuICogT3B0aW9ucyBtYXkgYmUge1xyXG4gKiBtYXRjaG90aGVycyA6IHRydWUsICA9PiBvbmx5IHJ1bGVzIHdoZXJlIGFsbCBvdGhlcnMgbWF0Y2ggYXJlIGNvbnNpZGVyZWRcclxuICogYXVnbWVudCA6IHRydWUsXHJcbiAqIG92ZXJyaWRlIDogdHJ1ZSB9ICA9PlxyXG4gKlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoV29yZChvUnVsZTogSVJ1bGUsIGNvbnRleHQ6IElGTWF0Y2guY29udGV4dCwgb3B0aW9ucz86IElNYXRjaE9wdGlvbnMpIHtcclxuICBpZiAoY29udGV4dFtvUnVsZS5rZXldID09PSB1bmRlZmluZWQpIHtcclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgfVxyXG4gIHZhciBzMSA9IGNvbnRleHRbb1J1bGUua2V5XS50b0xvd2VyQ2FzZSgpXHJcbiAgdmFyIHMyID0gb1J1bGUud29yZC50b0xvd2VyQ2FzZSgpO1xyXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XHJcbiAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCwgb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KVxyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlbHRhKSk7XHJcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XHJcbiAgfVxyXG4gIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gIH1cclxuICB2YXIgYzogbnVtYmVyID0gY2FsY0Rpc3RhbmNlKHMyLCBzMSk7XHJcbiAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgZGVidWdsb2coXCIgczEgPD4gczIgXCIgKyBzMSArIFwiPD5cIiArIHMyICsgXCIgID0+OiBcIiArIGMpO1xyXG4gIH1cclxuICBpZiAoYyA+IDAuODApIHtcclxuICAgIHZhciByZXMgPSBBbnlPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKSBhcyBhbnk7XHJcbiAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgY29udGV4dCk7XHJcbiAgICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xyXG4gICAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb1J1bGUuZm9sbG93cyk7XHJcbiAgICB9XHJcbiAgICAvLyBmb3JjZSBrZXkgcHJvcGVydHlcclxuICAgIC8vIGNvbnNvbGUubG9nKCcgb2JqZWN0Y2F0ZWdvcnknLCByZXNbJ3N5c3RlbU9iamVjdENhdGVnb3J5J10pO1xyXG4gICAgcmVzW29SdWxlLmtleV0gPSBvUnVsZS5mb2xsb3dzW29SdWxlLmtleV0gfHwgcmVzW29SdWxlLmtleV07XHJcbiAgICByZXMuX3dlaWdodCA9IEFueU9iamVjdC5hc3NpZ24oe30sIHJlcy5fd2VpZ2h0KTtcclxuICAgIHJlcy5fd2VpZ2h0W29SdWxlLmtleV0gPSBjO1xyXG4gICAgT2JqZWN0LmZyZWV6ZShyZXMpO1xyXG4gICAgaWYgKCBkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAgIGRlYnVnbG9nKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcclxuICAgIH1cclxuICAgIHJldHVybiByZXM7XHJcbiAgfVxyXG4gIHJldHVybiB1bmRlZmluZWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0QXJnc01hcChtYXRjaDogQXJyYXk8c3RyaW5nPiwgYXJnc01hcDogeyBba2V5OiBudW1iZXJdOiBzdHJpbmcgfSk6IElGTWF0Y2guY29udGV4dCB7XHJcbiAgdmFyIHJlcyA9IHt9IGFzIElGTWF0Y2guY29udGV4dDtcclxuICBpZiAoIWFyZ3NNYXApIHtcclxuICAgIHJldHVybiByZXM7XHJcbiAgfVxyXG4gIE9iamVjdC5rZXlzKGFyZ3NNYXApLmZvckVhY2goZnVuY3Rpb24gKGlLZXkpIHtcclxuICAgIHZhciB2YWx1ZSA9IG1hdGNoW2lLZXldXHJcbiAgICB2YXIga2V5ID0gYXJnc01hcFtpS2V5XTtcclxuICAgIGlmICgodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKSAmJiB2YWx1ZS5sZW5ndGggPiAwKSB7XHJcbiAgICAgIHJlc1trZXldID0gdmFsdWVcclxuICAgIH1cclxuICB9XHJcbiAgKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgUmFua1dvcmQgPSB7XHJcbiAgaGFzQWJvdmU6IGZ1bmN0aW9uIChsc3Q6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiwgYm9yZGVyOiBudW1iZXIpOiBib29sZWFuIHtcclxuICAgIHJldHVybiAhbHN0LmV2ZXJ5KGZ1bmN0aW9uIChvTWVtYmVyKSB7XHJcbiAgICAgIHJldHVybiAob01lbWJlci5fcmFua2luZyA8IGJvcmRlcik7XHJcbiAgICB9KTtcclxuICB9LFxyXG5cclxuICB0YWtlRmlyc3ROOiBmdW5jdGlvbjxUIGV4dGVuZHMgSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IChsc3Q6IEFycmF5PFQ+LCBuOiBudW1iZXIpOiBBcnJheTxUPiB7XHJcbiAgICB2YXIgbGFzdFJhbmtpbmcgPSAxLjA7XHJcbiAgICB2YXIgY250UmFuZ2VkID0gMDtcclxuICAgIHJldHVybiBsc3QuZmlsdGVyKGZ1bmN0aW9uIChvTWVtYmVyLCBpSW5kZXgpIHtcclxuICAgIHZhciBpc1JhbmdlZCA9ICEhKG9NZW1iZXJbXCJydWxlXCJdICYmIG9NZW1iZXJbXCJydWxlXCJdLnJhbmdlKTtcclxuICAgIGlmKGlzUmFuZ2VkKSB7XHJcbiAgICAgIGNudFJhbmdlZCArPSAxO1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICAgIGlmICgoKGlJbmRleCAtIGNudFJhbmdlZCkgPCBuKSB8fCAob01lbWJlci5fcmFua2luZyA9PT0gbGFzdFJhbmtpbmcpKSAge1xyXG4gICAgICAgIGxhc3RSYW5raW5nID0gb01lbWJlci5fcmFua2luZztcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9KTtcclxuICB9LFxyXG4gIHRha2VBYm92ZSA6IGZ1bmN0aW9uPFQgZXh0ZW5kcyBJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4gKGxzdDogQXJyYXk8VD4sIGJvcmRlcjogbnVtYmVyKTogQXJyYXk8VD4ge1xyXG4gICAgcmV0dXJuIGxzdC5maWx0ZXIoZnVuY3Rpb24gKG9NZW1iZXIpIHtcclxuICAgICAgcmV0dXJuIChvTWVtYmVyLl9yYW5raW5nID49IGJvcmRlcik7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG59O1xyXG5cclxuLypcclxudmFyIGV4YWN0TGVuID0gMDtcclxudmFyIGZ1enp5TGVuID0gMDtcclxudmFyIGZ1enp5Q250ID0gMDtcclxudmFyIGV4YWN0Q250ID0gMDtcclxudmFyIHRvdGFsQ250ID0gMDtcclxudmFyIHRvdGFsTGVuID0gMDtcclxudmFyIHJldGFpbmVkQ250ID0gMDtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZXNldENudCgpIHtcclxuICBleGFjdExlbiA9IDA7XHJcbiAgZnV6enlMZW4gPSAwO1xyXG4gIGZ1enp5Q250ID0gMDtcclxuICBleGFjdENudCA9IDA7XHJcbiAgdG90YWxDbnQgPSAwO1xyXG4gIHRvdGFsTGVuID0gMDtcclxuICByZXRhaW5lZENudCA9IDA7XHJcbn1cclxuKi9cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmKHNXb3JkR3JvdXA6IHN0cmluZywgc3BsaXRSdWxlcyA6IElNYXRjaC5TcGxpdFJ1bGVzICwgY250UmVjPyA6IElDbnRSZWMgKTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IHtcclxuICB2YXIgc2Vlbkl0ID0gY2F0ZWdvcml6ZVN0cmluZzIoc1dvcmRHcm91cCwgdHJ1ZSwgc3BsaXRSdWxlcywgY250UmVjKTtcclxuICAvL3RvdGFsQ250ICs9IDE7XHJcbiAgLy8gZXhhY3RMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcclxuICBhZGRDbnRSZWMoY250UmVjLCAnY250Q2F0RXhhY3QnLCAxKTtcclxuICBhZGRDbnRSZWMoY250UmVjLCAnY250Q2F0RXhhY3RSZXMnLCBzZWVuSXQubGVuZ3RoKTtcclxuXHJcbiAgaWYgKFJhbmtXb3JkLmhhc0Fib3ZlKHNlZW5JdCwgMC44KSkge1xyXG4gICAgaWYoY250UmVjKSB7XHJcbiAgICAgIGFkZENudFJlYyhjbnRSZWMsICdleGFjdFByaW9yVGFrZScsIHNlZW5JdC5sZW5ndGgpXHJcbiAgICB9XHJcbiAgICBzZWVuSXQgPSBSYW5rV29yZC50YWtlQWJvdmUoc2Vlbkl0LCAwLjgpO1xyXG4gICAgaWYoY250UmVjKSB7XHJcbiAgICAgIGFkZENudFJlYyhjbnRSZWMsICdleGFjdEFmdGVyVGFrZScsIHNlZW5JdC5sZW5ndGgpXHJcbiAgICB9XHJcbiAgIC8vIGV4YWN0Q250ICs9IDE7XHJcbiAgfSBlbHNlIHtcclxuICAgIHNlZW5JdCA9IGNhdGVnb3JpemVTdHJpbmcyKHNXb3JkR3JvdXAsIGZhbHNlLCBzcGxpdFJ1bGVzLCBjbnRSZWMpO1xyXG4gICAgYWRkQ250UmVjKGNudFJlYywgJ2NudE5vbkV4YWN0JywgMSk7XHJcbiAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Tm9uRXhhY3RSZXMnLCBzZWVuSXQubGVuZ3RoKTtcclxuICAvLyAgZnV6enlMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcclxuICAvLyAgZnV6enlDbnQgKz0gMTtcclxuICB9XHJcbiAvLyB0b3RhbExlbiArPSBzZWVuSXQubGVuZ3RoO1xyXG4gIHNlZW5JdCA9IFJhbmtXb3JkLnRha2VGaXJzdE4oc2Vlbkl0LCBBbGdvbC5Ub3BfTl9Xb3JkQ2F0ZWdvcml6YXRpb25zKTtcclxuIC8vIHJldGFpbmVkQ250ICs9IHNlZW5JdC5sZW5ndGg7XHJcbiAgcmV0dXJuIHNlZW5JdDtcclxufVxyXG5cclxuLyogaWYgd2UgaGF2ZSBhICBcIlJ1biBsaWtlIHRoZSBXaW5kXCJcclxuICBhbiBhIHVzZXIgdHlwZSBmdW4gbGlrZSAgYSBSaW5kICwgYW5kIFJpbmQgaXMgYW4gZXhhY3QgbWF0Y2gsXHJcbiAgd2Ugd2lsbCBub3Qgc3RhcnQgbG9va2luZyBmb3IgdGhlIGxvbmcgc2VudGVuY2VcclxuXHJcbiAgdGhpcyBpcyB0byBiZSBmaXhlZCBieSBcInNwcmVhZGluZ1wiIHRoZSByYW5nZSBpbmRpY2F0aW9uIGFjY3Jvc3MgdmVyeSBzaW1pbGFyIHdvcmRzIGluIHRoZSB2aW5jaW5pdHkgb2YgdGhlXHJcbiAgdGFyZ2V0IHdvcmRzXHJcbiovXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVdvcmRXaXRoT2Zmc2V0V2l0aFJhbmtDdXRvZmYoc1dvcmRHcm91cDogc3RyaW5nLCBzcGxpdFJ1bGVzIDogSU1hdGNoLlNwbGl0UnVsZXMsIGNudFJlYz8gOiBJQ250UmVjICk6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nUmFuZ2VkPiB7XHJcbiAgdmFyIHNXb3JkR3JvdXBMQyA9IHNXb3JkR3JvdXAudG9Mb3dlckNhc2UoKTtcclxuICB2YXIgc2Vlbkl0ID0gY2F0ZWdvcml6ZVdvcmRJbnRlcm5hbFdpdGhPZmZzZXRzKHNXb3JkR3JvdXAsIHNXb3JkR3JvdXBMQywgdHJ1ZSwgc3BsaXRSdWxlcywgY250UmVjKTtcclxuICAvL2NvbnNvbGUubG9nKFwiU0VFTklUXCIgKyBKU09OLnN0cmluZ2lmeShzZWVuSXQpKTtcclxuICAvL3RvdGFsQ250ICs9IDE7XHJcbiAgLy8gZXhhY3RMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcclxuICAvL2NvbnNvbGUubG9nKFwiZmlyc3QgcnVuIGV4YWN0IFwiICsgSlNPTi5zdHJpbmdpZnkoc2Vlbkl0KSk7XHJcbiAgYWRkQ250UmVjKGNudFJlYywgJ2NudENhdEV4YWN0JywgMSk7XHJcbiAgYWRkQ250UmVjKGNudFJlYywgJ2NudENhdEV4YWN0UmVzJywgc2Vlbkl0Lmxlbmd0aCk7XHJcblxyXG4gIGlmIChSYW5rV29yZC5oYXNBYm92ZShzZWVuSXQsIDAuOCkpIHtcclxuICAgIGlmKGNudFJlYykge1xyXG4gICAgICBhZGRDbnRSZWMoY250UmVjLCAnZXhhY3RQcmlvclRha2UnLCBzZWVuSXQubGVuZ3RoKVxyXG4gICAgfVxyXG4gICAgc2Vlbkl0ID0gUmFua1dvcmQudGFrZUFib3ZlKHNlZW5JdCwgMC44KTtcclxuICAgIGlmKGNudFJlYykge1xyXG4gICAgICBhZGRDbnRSZWMoY250UmVjLCAnZXhhY3RBZnRlclRha2UnLCBzZWVuSXQubGVuZ3RoKVxyXG4gICAgfVxyXG4gICAvLyBleGFjdENudCArPSAxO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBzZWVuSXQgPSBjYXRlZ29yaXplV29yZEludGVybmFsV2l0aE9mZnNldHMoc1dvcmRHcm91cCwgc1dvcmRHcm91cExDLCBmYWxzZSwgc3BsaXRSdWxlcywgY250UmVjKTtcclxuICAgIGFkZENudFJlYyhjbnRSZWMsICdjbnROb25FeGFjdCcsIDEpO1xyXG4gICAgYWRkQ250UmVjKGNudFJlYywgJ2NudE5vbkV4YWN0UmVzJywgc2Vlbkl0Lmxlbmd0aCk7XHJcbiAgLy8gIGZ1enp5TGVuICs9IHNlZW5JdC5sZW5ndGg7XHJcbiAgLy8gIGZ1enp5Q250ICs9IDE7XHJcbiAgfVxyXG4gIC8vIHRvdGFsTGVuICs9IHNlZW5JdC5sZW5ndGg7XHJcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZD8gKCBgJHtzZWVuSXQubGVuZ3RofSB3aXRoICR7c2Vlbkl0LnJlZHVjZSggKHByZXYsb2JqKSA9PiBwcmV2ICsgKG9iai5ydWxlLnJhbmdlID8gMSA6IDApLDApfSByYW5nZWQgIWApOiAnLScpO1xyXG4vLyAgdmFyIGNudFJhbmdlZCA9IHNlZW5JdC5yZWR1Y2UoIChwcmV2LG9iaikgPT4gcHJldiArIChvYmoucnVsZS5yYW5nZSA/IDEgOiAwKSwwKTtcclxuLy8gIGNvbnNvbGUubG9nKGAqKioqKioqKioqKiAke3NlZW5JdC5sZW5ndGh9IHdpdGggJHtjbnRSYW5nZWR9IHJhbmdlZCAhYCk7XHJcblxyXG4gIHNlZW5JdCA9IFJhbmtXb3JkLnRha2VGaXJzdE4oc2Vlbkl0LCBBbGdvbC5Ub3BfTl9Xb3JkQ2F0ZWdvcml6YXRpb25zKTtcclxuIC8vIHJldGFpbmVkQ250ICs9IHNlZW5JdC5sZW5ndGg7XHJcbiAgLy9jb25zb2xlLmxvZyhcImZpbmFsIHJlcyBvZiBjYXRlZ29yaXplV29yZFdpdGhPZmZzZXRXaXRoUmFua0N1dG9mZlwiICsgSlNPTi5zdHJpbmdpZnkoc2Vlbkl0KSk7XHJcblxyXG4gIHJldHVybiBzZWVuSXQ7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVdvcmRXaXRoT2Zmc2V0V2l0aFJhbmtDdXRvZmZTaW5nbGUod29yZDogc3RyaW5nLCBydWxlOiBJTWF0Y2gubVJ1bGUpOiBJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1JhbmdlZCB7XHJcbiAgdmFyIGxjd29yZCA9IHdvcmQudG9Mb3dlckNhc2UoKTtcclxuXHJcbiAgaWYobGN3b3JkID09PSBydWxlLmxvd2VyY2FzZXdvcmQpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHN0cmluZzogd29yZCxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogcnVsZS5tYXRjaGVkU3RyaW5nLFxyXG4gICAgICAgICAgICBjYXRlZ29yeTogcnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgcnVsZTogcnVsZSxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IHJ1bGUuX3JhbmtpbmcgfHwgMS4wXHJcbiAgICAgICAgICB9O1xyXG4gIH1cclxuXHJcbiAgdmFyIHJlczogQXJyYXk8SU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1JhbmdlZD4gPSBbXVxyXG4gIGNoZWNrT25lUnVsZVdpdGhPZmZzZXQod29yZCxsY3dvcmQsZmFsc2UscmVzLHJ1bGUpO1xyXG4gIGRlYnVnbG9nKFwiY2F0V1dPV1JDUyBcIiArIGxjd29yZCk7XHJcbiAgaWYocmVzLmxlbmd0aCkge1xyXG4gICAgcmV0dXJuIHJlc1swXTtcclxuICB9XHJcbiAgcmV0dXJuIHVuZGVmaW5lZDtcclxufVxyXG5cclxuXHJcblxyXG4vKlxyXG5leHBvcnQgZnVuY3Rpb24gZHVtcENudCgpIHtcclxuICBjb25zb2xlLmxvZyhgXHJcbmV4YWN0TGVuID0gJHtleGFjdExlbn07XHJcbmV4YWN0Q250ID0gJHtleGFjdENudH07XHJcbmZ1enp5TGVuID0gJHtmdXp6eUxlbn07XHJcbmZ1enp5Q250ID0gJHtmdXp6eUNudH07XHJcbnRvdGFsQ250ID0gJHt0b3RhbENudH07XHJcbnRvdGFsTGVuID0gJHt0b3RhbExlbn07XHJcbnJldGFpbmVkTGVuID0gJHtyZXRhaW5lZENudH07XHJcbiAgYCk7XHJcbn1cclxuKi9cclxuXHJcbi8qXHJcbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWRTZW50ZW5jZShvU2VudGVuY2U6IElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11bXSk6IGJvb2xlYW4ge1xyXG4gIHJldHVybiBvU2VudGVuY2UuZXZlcnkoZnVuY3Rpb24gKG9Xb3JkR3JvdXApIHtcclxuICAgIHJldHVybiAob1dvcmRHcm91cC5sZW5ndGggPiAwKTtcclxuICB9KTtcclxufVxyXG5cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkKGFycjogSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXVtdW10pOiBJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdW11bXSB7XHJcbiAgcmV0dXJuIGFyci5maWx0ZXIoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xyXG4gICAgcmV0dXJuIGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZFNlbnRlbmNlKG9TZW50ZW5jZSk7XHJcbiAgfSk7XHJcbn1cclxuKi9cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjYXRlZ29yaXplQVdvcmQoc1dvcmRHcm91cDogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHNlbnRlbmNlOiBzdHJpbmcsIHdvcmRzOiB7IFtrZXk6IHN0cmluZ106IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPn0sXHJcbmNudFJlYyA/IDogSUNudFJlYyApIDogSU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdIHtcclxuICB2YXIgc2Vlbkl0ID0gd29yZHNbc1dvcmRHcm91cF07XHJcbiAgaWYgKHNlZW5JdCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICBzZWVuSXQgPSBjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmKHNXb3JkR3JvdXAsIHJ1bGVzLCBjbnRSZWMpO1xyXG4gICAgdXRpbHMuZGVlcEZyZWV6ZShzZWVuSXQpO1xyXG4gICAgd29yZHNbc1dvcmRHcm91cF0gPSBzZWVuSXQ7XHJcbiAgfVxyXG4gIGlmICghc2Vlbkl0IHx8IHNlZW5JdC5sZW5ndGggPT09IDApIHtcclxuICAgIGxvZ2dlcihcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIFxcXCJcIiArIHNXb3JkR3JvdXAgKyBcIlxcXCIgaW4gc2VudGVuY2UgXFxcIlwiXHJcbiAgICAgICsgc2VudGVuY2UgKyBcIlxcXCJcIik7XHJcbiAgICBpZiAoc1dvcmRHcm91cC5pbmRleE9mKFwiIFwiKSA8PSAwKSB7XHJcbiAgICAgIGRlYnVnbG9nKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgcHJpbWl0aXZlICghKVwiICsgc1dvcmRHcm91cCk7XHJcbiAgICB9XHJcbiAgICBkZWJ1Z2xvZyhcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIFwiICsgc1dvcmRHcm91cCk7XHJcbiAgICBpZiAoIXNlZW5JdCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RpbmcgZW10cHkgbGlzdCwgbm90IHVuZGVmaW5lZCBmb3IgXFxcIlwiICsgc1dvcmRHcm91cCArIFwiXFxcIlwiKVxyXG4gICAgfVxyXG4gICAgd29yZHNbc1dvcmRHcm91cF0gPSBbXVxyXG4gICAgcmV0dXJuIFtdO1xyXG4gIH1cclxuICByZXR1cm4gdXRpbHMuY2xvbmVEZWVwKHNlZW5JdCk7XHJcbn1cclxuXHJcblxyXG4vKipcclxuICogR2l2ZW4gYSAgc3RyaW5nLCBicmVhayBpdCBkb3duIGludG8gY29tcG9uZW50cyxcclxuICogW1snQScsICdCJ10sIFsnQSBCJ11dXHJcbiAqXHJcbiAqIHRoZW4gY2F0ZWdvcml6ZVdvcmRzXHJcbiAqIHJldHVybmluZ1xyXG4gKlxyXG4gKiBbIFtbIHsgY2F0ZWdvcnk6ICdzeXN0ZW1JZCcsIHdvcmQgOiAnQSd9LFxyXG4gKiAgICAgIHsgY2F0ZWdvcnk6ICdvdGhlcnRoaW5nJywgd29yZCA6ICdBJ31cclxuICogICAgXSxcclxuICogICAgLy8gcmVzdWx0IG9mIEJcclxuICogICAgWyB7IGNhdGVnb3J5OiAnc3lzdGVtSWQnLCB3b3JkIDogJ0InfSxcclxuICogICAgICB7IGNhdGVnb3J5OiAnb3RoZXJ0aGluZycsIHdvcmQgOiAnQSd9XHJcbiAqICAgICAgeyBjYXRlZ29yeTogJ2Fub3RoZXJ0cnlwJywgd29yZCA6ICdCJ31cclxuICogICAgXVxyXG4gKiAgIF0sXHJcbiAqIF1dXVxyXG4gKlxyXG4gKlxyXG4gKlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVTdHJpbmcoc1N0cmluZzogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsXHJcbiAgd29yZHM/OiB7IFtrZXk6IHN0cmluZ106IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiB9KVxyXG4gIDogWyBbIElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXV0gXVxyXG4gICB7XHJcbiAgdmFyIGNudCA9IDA7XHJcbiAgdmFyIGZhYyA9IDE7XHJcbiAgdmFyIHUgPSBicmVha2Rvd24uYnJlYWtkb3duU3RyaW5nKHNTdHJpbmcsIEFsZ29sLk1heFNwYWNlc1BlckNvbWJpbmVkV29yZCk7XHJcbiAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgZGVidWdsb2coXCJoZXJlIGJyZWFrZG93blwiICsgSlNPTi5zdHJpbmdpZnkodSkpO1xyXG4gIH1cclxuICAvL2NvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHUpKTtcclxuICB3b3JkcyA9IHdvcmRzIHx8IHt9O1xyXG4gIGRlYnVncGVyZigndGhpcyBtYW55IGtub3duIHdvcmRzOiAnICsgT2JqZWN0LmtleXMod29yZHMpLmxlbmd0aCk7XHJcbiAgdmFyIHJlcyA9IFtdIGFzIFtbIElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXV0gXTtcclxuICB2YXIgY250UmVjID0ge307XHJcbiAgdS5mb3JFYWNoKGZ1bmN0aW9uIChhQnJlYWtEb3duU2VudGVuY2UpIHtcclxuICAgICAgdmFyIGNhdGVnb3JpemVkU2VudGVuY2UgPSBbXSBhcyBbIElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXSBdO1xyXG4gICAgICB2YXIgaXNWYWxpZCA9IGFCcmVha0Rvd25TZW50ZW5jZS5ldmVyeShmdW5jdGlvbiAoc1dvcmRHcm91cDogc3RyaW5nLCBpbmRleCA6IG51bWJlcikge1xyXG4gICAgICAgIHZhciBzZWVuSXQgPSBjYXRlZ29yaXplQVdvcmQoc1dvcmRHcm91cCwgcnVsZXMsIHNTdHJpbmcsIHdvcmRzLCBjbnRSZWMpO1xyXG4gICAgICAgIGlmKHNlZW5JdC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2F0ZWdvcml6ZWRTZW50ZW5jZVtpbmRleF0gPSBzZWVuSXQ7XHJcbiAgICAgICAgY250ID0gY250ICsgc2Vlbkl0Lmxlbmd0aDtcclxuICAgICAgICBmYWMgPSBmYWMgKiBzZWVuSXQubGVuZ3RoO1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICB9KTtcclxuICAgICAgaWYoaXNWYWxpZCkge1xyXG4gICAgICAgIHJlcy5wdXNoKGNhdGVnb3JpemVkU2VudGVuY2UpO1xyXG4gICAgICB9XHJcbiAgfSk7XHJcbiAgZGVidWdsb2coXCIgc2VudGVuY2VzIFwiICsgdS5sZW5ndGggKyBcIiBtYXRjaGVzIFwiICsgY250ICsgXCIgZmFjOiBcIiArIGZhYyk7XHJcbiAgaWYoZGVidWdsb2cuZW5hYmxlZCAmJiB1Lmxlbmd0aCkge1xyXG4gICAgZGVidWdsb2coXCJmaXJzdCBtYXRjaCBcIisgSlNPTi5zdHJpbmdpZnkodSx1bmRlZmluZWQsMikpO1xyXG4gIH1cclxuICBkZWJ1Z3BlcmYoXCIgc2VudGVuY2VzIFwiICsgdS5sZW5ndGggKyBcIiAvIFwiICsgcmVzLmxlbmd0aCArICBcIiBtYXRjaGVzIFwiICsgY250ICsgXCIgZmFjOiBcIiArIGZhYyArIFwiIHJlYyA6IFwiICsgSlNPTi5zdHJpbmdpZnkoY250UmVjLHVuZGVmaW5lZCwyKSk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjYXRlZ29yaXplQVdvcmRXaXRoT2Zmc2V0cyhzV29yZEdyb3VwOiBzdHJpbmcsIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgc2VudGVuY2U6IHN0cmluZywgd29yZHM6IHsgW2tleTogc3RyaW5nXTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+fSxcclxuY250UmVjID8gOiBJQ250UmVjICkgOiBJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nUmFuZ2VkW10ge1xyXG4gIHZhciBzZWVuSXQgPSB3b3Jkc1tzV29yZEdyb3VwXTtcclxuICBpZiAoc2Vlbkl0ID09PSB1bmRlZmluZWQpIHtcclxuICAgIHNlZW5JdCA9IGNhdGVnb3JpemVXb3JkV2l0aE9mZnNldFdpdGhSYW5rQ3V0b2ZmKHNXb3JkR3JvdXAsIHJ1bGVzLCBjbnRSZWMpO1xyXG4gICAgdXRpbHMuZGVlcEZyZWV6ZShzZWVuSXQpO1xyXG4gICAgd29yZHNbc1dvcmRHcm91cF0gPSBzZWVuSXQ7XHJcbiAgfVxyXG4gIGlmICghc2Vlbkl0IHx8IHNlZW5JdC5sZW5ndGggPT09IDApIHtcclxuICAgIGxvZ2dlcihcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIFxcXCJcIiArIHNXb3JkR3JvdXAgKyBcIlxcXCIgaW4gc2VudGVuY2UgXFxcIlwiXHJcbiAgICAgICsgc2VudGVuY2UgKyBcIlxcXCJcIik7XHJcbiAgICBpZiAoc1dvcmRHcm91cC5pbmRleE9mKFwiIFwiKSA8PSAwKSB7XHJcbiAgICAgIGRlYnVnbG9nKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgcHJpbWl0aXZlICghKVwiICsgc1dvcmRHcm91cCk7XHJcbiAgICB9XHJcbiAgICBkZWJ1Z2xvZyhcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIFwiICsgc1dvcmRHcm91cCk7XHJcbiAgICBpZiAoIXNlZW5JdCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RpbmcgZW10cHkgbGlzdCwgbm90IHVuZGVmaW5lZCBmb3IgXFxcIlwiICsgc1dvcmRHcm91cCArIFwiXFxcIlwiKVxyXG4gICAgfVxyXG4gICAgd29yZHNbc1dvcmRHcm91cF0gPSBbXVxyXG4gICAgcmV0dXJuIFtdO1xyXG4gIH1cclxuICByZXR1cm4gdXRpbHMuY2xvbmVEZWVwKHNlZW5JdCk7XHJcbn1cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuLypcclxuWyBbYSxiXSwgW2MsZF1dXHJcblxyXG4wMCBhXHJcbjAxIGJcclxuMTAgY1xyXG4xMSBkXHJcbjEyIGNcclxuKi9cclxuXHJcblxyXG5jb25zdCBjbG9uZSA9IHV0aWxzLmNsb25lRGVlcDtcclxuXHJcblxyXG5mdW5jdGlvbiBjb3B5VmVjTWVtYmVycyh1KSB7XHJcbiAgdmFyIGkgPSAwO1xyXG4gIGZvcihpID0gMDsgaSA8IHUubGVuZ3RoOyArK2kpIHtcclxuICAgIHVbaV0gPSBjbG9uZSh1W2ldKTtcclxuICB9XHJcbiAgcmV0dXJuIHU7XHJcbn1cclxuLy8gd2UgY2FuIHJlcGxpY2F0ZSB0aGUgdGFpbCBvciB0aGUgaGVhZCxcclxuLy8gd2UgcmVwbGljYXRlIHRoZSB0YWlsIGFzIGl0IGlzIHNtYWxsZXIuXHJcblxyXG4vLyBbYSxiLGMgXVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGV4cGFuZE1hdGNoQXJyKGRlZXA6IEFycmF5PEFycmF5PGFueT4+KTogQXJyYXk8QXJyYXk8YW55Pj4ge1xyXG4gIHZhciBhID0gW107XHJcbiAgdmFyIGxpbmUgPSBbXTtcclxuICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gSlNPTi5zdHJpbmdpZnkoZGVlcCkgOiAnLScpO1xyXG4gIGRlZXAuZm9yRWFjaChmdW5jdGlvbiAodUJyZWFrRG93bkxpbmUsIGlJbmRleDogbnVtYmVyKSB7XHJcbiAgICBsaW5lW2lJbmRleF0gPSBbXTtcclxuICAgIHVCcmVha0Rvd25MaW5lLmZvckVhY2goZnVuY3Rpb24gKGFXb3JkR3JvdXAsIHdnSW5kZXg6IG51bWJlcikge1xyXG4gICAgICBsaW5lW2lJbmRleF1bd2dJbmRleF0gPSBbXTtcclxuICAgICAgYVdvcmRHcm91cC5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZFZhcmlhbnQsIGlXVkluZGV4OiBudW1iZXIpIHtcclxuICAgICAgICBsaW5lW2lJbmRleF1bd2dJbmRleF1baVdWSW5kZXhdID0gb1dvcmRWYXJpYW50O1xyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gIH0pXHJcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IEpTT04uc3RyaW5naWZ5KGxpbmUpIDogJy0nKTtcclxuICB2YXIgcmVzID0gW107XHJcbiAgdmFyIG52ZWNzID0gW107XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lLmxlbmd0aDsgKytpKSB7XHJcbiAgICB2YXIgdmVjcyA9IFtbXV07XHJcbiAgICB2YXIgbnZlY3MgPSBbXTtcclxuICAgIHZhciBydmVjID0gW107XHJcbiAgICBmb3IgKHZhciBrID0gMDsgayA8IGxpbmVbaV0ubGVuZ3RoOyArK2spIHsgLy8gd29yZGdyb3VwIGtcclxuICAgICAgLy92ZWNzIGlzIHRoZSB2ZWN0b3Igb2YgYWxsIHNvIGZhciBzZWVuIHZhcmlhbnRzIHVwIHRvIGsgd2dzLlxyXG4gICAgICB2YXIgbmV4dEJhc2UgPSBbXTtcclxuICAgICAgZm9yICh2YXIgbCA9IDA7IGwgPCBsaW5lW2ldW2tdLmxlbmd0aDsgKytsKSB7IC8vIGZvciBlYWNoIHZhcmlhbnRcclxuICAgICAgICAvL2RlYnVnbG9nKFwidmVjcyBub3dcIiArIEpTT04uc3RyaW5naWZ5KHZlY3MpKTtcclxuICAgICAgICBudmVjcyA9IFtdOyAvL3ZlY3Muc2xpY2UoKTsgLy8gY29weSB0aGUgdmVjW2ldIGJhc2UgdmVjdG9yO1xyXG4gICAgICAgIC8vZGVidWdsb2coXCJ2ZWNzIGNvcGllZCBub3dcIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSk7XHJcbiAgICAgICAgZm9yICh2YXIgdSA9IDA7IHUgPCB2ZWNzLmxlbmd0aDsgKyt1KSB7XHJcbiAgICAgICAgICBudmVjc1t1XSA9IHZlY3NbdV0uc2xpY2UoKTsgLy9cclxuICAgICAgICAgIG52ZWNzW3VdID0gY29weVZlY01lbWJlcnMobnZlY3NbdV0pO1xyXG4gICAgICAgICAgLy8gZGVidWdsb2coXCJjb3BpZWQgdmVjc1tcIisgdStcIl1cIiArIEpTT04uc3RyaW5naWZ5KHZlY3NbdV0pKTtcclxuICAgICAgICAgIG52ZWNzW3VdLnB1c2goXHJcbiAgICAgICAgICAgIGNsb25lKGxpbmVbaV1ba11bbF0pKTsgLy8gcHVzaCB0aGUgbHRoIHZhcmlhbnRcclxuICAgICAgICAgIC8vIGRlYnVnbG9nKFwibm93IG52ZWNzIFwiICsgbnZlY3MubGVuZ3RoICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyAgIGRlYnVnbG9nKFwiIGF0ICAgICBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiBuZXh0YmFzZSA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpXHJcbiAgICAgICAgLy8gICBkZWJ1Z2xvZyhcIiBhcHBlbmQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbnZlY3MgICAgPlwiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKVxyXG4gICAgICAgIG5leHRCYXNlID0gbmV4dEJhc2UuY29uY2F0KG52ZWNzKTtcclxuICAgICAgICAvLyAgIGRlYnVnbG9nKFwiICByZXN1bHQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbnZlY3MgICAgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxyXG4gICAgICB9IC8vY29uc3RydVxyXG4gICAgICAvLyAgZGVidWdsb2coXCJub3cgYXQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxyXG4gICAgICB2ZWNzID0gbmV4dEJhc2U7XHJcbiAgICB9XHJcbiAgICBkZWJ1Z2xvZ1YoZGVidWdsb2dWLmVuYWJsZWQgPyAoXCJBUFBFTkRJTkcgVE8gUkVTXCIgKyBpICsgXCI6XCIgKyBsICsgXCIgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKSA6ICctJyk7XHJcbiAgICByZXMgPSByZXMuY29uY2F0KHZlY3MpO1xyXG4gIH1cclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5cclxuLyoqXHJcbiAqIENhbGN1bGF0ZSBhIHdlaWdodCBmYWN0b3IgZm9yIGEgZ2l2ZW4gZGlzdGFuY2UgYW5kXHJcbiAqIGNhdGVnb3J5XHJcbiAqIEBwYXJhbSB7aW50ZWdlcn0gZGlzdCBkaXN0YW5jZSBpbiB3b3Jkc1xyXG4gKiBAcGFyYW0ge3N0cmluZ30gY2F0ZWdvcnkgY2F0ZWdvcnkgdG8gdXNlXHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IGEgZGlzdGFuY2UgZmFjdG9yID49IDFcclxuICogIDEuMCBmb3Igbm8gZWZmZWN0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcmVpbmZvcmNlRGlzdFdlaWdodChkaXN0OiBudW1iZXIsIGNhdGVnb3J5OiBzdHJpbmcpOiBudW1iZXIge1xyXG4gIHZhciBhYnMgPSBNYXRoLmFicyhkaXN0KTtcclxuICByZXR1cm4gMS4wICsgKEFsZ29sLmFSZWluZm9yY2VEaXN0V2VpZ2h0W2Fic10gfHwgMCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHaXZlbiBhIHNlbnRlbmNlLCBleHRhY3QgY2F0ZWdvcmllc1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RDYXRlZ29yeU1hcChvU2VudGVuY2U6IEFycmF5PElGTWF0Y2guSVdvcmQ+KTogeyBba2V5OiBzdHJpbmddOiBBcnJheTx7IHBvczogbnVtYmVyIH0+IH0ge1xyXG4gIHZhciByZXMgPSB7fTtcclxuICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKCdleHRyYWN0Q2F0ZWdvcnlNYXAgJyArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSkpIDogJy0nKTtcclxuICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGlJbmRleCkge1xyXG4gICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBJRk1hdGNoLkNBVF9DQVRFR09SWSkge1xyXG4gICAgICByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10gfHwgW107XHJcbiAgICAgIHJlc1tvV29yZC5tYXRjaGVkU3RyaW5nXS5wdXNoKHsgcG9zOiBpSW5kZXggfSk7XHJcbiAgICB9XHJcbiAgfSk7XHJcbiAgdXRpbHMuZGVlcEZyZWV6ZShyZXMpO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWluRm9yY2VTZW50ZW5jZShvU2VudGVuY2UpIHtcclxuICBcInVzZSBzdHJpY3RcIjtcclxuICB2YXIgb0NhdGVnb3J5TWFwID0gZXh0cmFjdENhdGVnb3J5TWFwKG9TZW50ZW5jZSk7XHJcbiAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpSW5kZXgpIHtcclxuICAgIHZhciBtID0gb0NhdGVnb3J5TWFwW29Xb3JkLmNhdGVnb3J5XSB8fCBbXTtcclxuICAgIG0uZm9yRWFjaChmdW5jdGlvbiAob1Bvc2l0aW9uOiB7IHBvczogbnVtYmVyIH0pIHtcclxuICAgICAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgICAgIG9Xb3JkLnJlaW5mb3JjZSA9IG9Xb3JkLnJlaW5mb3JjZSB8fCAxO1xyXG4gICAgICB2YXIgYm9vc3QgPSByZWluZm9yY2VEaXN0V2VpZ2h0KGlJbmRleCAtIG9Qb3NpdGlvbi5wb3MsIG9Xb3JkLmNhdGVnb3J5KTtcclxuICAgICAgb1dvcmQucmVpbmZvcmNlICo9IGJvb3N0O1xyXG4gICAgICBvV29yZC5fcmFua2luZyAqPSBib29zdDtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG4gIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaUluZGV4KSB7XHJcbiAgICBpZiAoaUluZGV4ID4gMCApIHtcclxuICAgICAgaWYgKG9TZW50ZW5jZVtpSW5kZXgtMV0uY2F0ZWdvcnkgPT09IFwibWV0YVwiICAmJiAob1dvcmQuY2F0ZWdvcnkgPT09IG9TZW50ZW5jZVtpSW5kZXgtMV0ubWF0Y2hlZFN0cmluZykgKSB7XHJcbiAgICAgICAgb1dvcmQucmVpbmZvcmNlID0gb1dvcmQucmVpbmZvcmNlIHx8IDE7XHJcbiAgICAgICAgdmFyIGJvb3N0ID0gcmVpbmZvcmNlRGlzdFdlaWdodCgxLCBvV29yZC5jYXRlZ29yeSk7XHJcbiAgICAgICAgb1dvcmQucmVpbmZvcmNlICo9IGJvb3N0O1xyXG4gICAgICAgIG9Xb3JkLl9yYW5raW5nICo9IGJvb3N0O1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSk7XHJcbiAgcmV0dXJuIG9TZW50ZW5jZTtcclxufVxyXG5cclxuXHJcbmltcG9ydCAqIGFzIFNlbnRlbmNlIGZyb20gJy4vc2VudGVuY2UnO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlaW5Gb3JjZShhQ2F0ZWdvcml6ZWRBcnJheSkge1xyXG4gIFwidXNlIHN0cmljdFwiO1xyXG4gIGFDYXRlZ29yaXplZEFycmF5LmZvckVhY2goZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xyXG4gICAgcmVpbkZvcmNlU2VudGVuY2Uob1NlbnRlbmNlKTtcclxuICB9KVxyXG4gIGFDYXRlZ29yaXplZEFycmF5LnNvcnQoU2VudGVuY2UuY21wUmFua2luZ1Byb2R1Y3QpO1xyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nKFwiYWZ0ZXIgcmVpbmZvcmNlXCIgKyBhQ2F0ZWdvcml6ZWRBcnJheS5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xyXG4gICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcclxuICAgIH0pLmpvaW4oXCJcXG5cIikpO1xyXG4gIH1cclxuICByZXR1cm4gYUNhdGVnb3JpemVkQXJyYXk7XHJcbn1cclxuXHJcblxyXG4vLy8gYmVsb3cgbWF5IG5vIGxvbmdlciBiZSB1c2VkXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hSZWdFeHAob1J1bGU6IElSdWxlLCBjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQsIG9wdGlvbnM/OiBJTWF0Y2hPcHRpb25zKSB7XHJcbiAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICB2YXIgc0tleSA9IG9SdWxlLmtleTtcclxuICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKVxyXG4gIHZhciByZWcgPSBvUnVsZS5yZWdleHA7XHJcblxyXG4gIHZhciBtID0gcmVnLmV4ZWMoczEpO1xyXG4gIGlmKGRlYnVnbG9nVi5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZ1YoXCJhcHBseWluZyByZWdleHA6IFwiICsgczEgKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KG0pKTtcclxuICB9XHJcbiAgaWYgKCFtKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxyXG4gIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsIG9SdWxlLmZvbGxvd3MsIG9SdWxlLmtleSlcclxuICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nVihKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xyXG4gICAgZGVidWdsb2dWKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcclxuICB9XHJcbiAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkXHJcbiAgfVxyXG4gIHZhciBvRXh0cmFjdGVkQ29udGV4dCA9IGV4dHJhY3RBcmdzTWFwKG0sIG9SdWxlLmFyZ3NNYXApO1xyXG4gIGlmIChkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xyXG4gICAgZGVidWdsb2dWKFwiZXh0cmFjdGVkIGFyZ3MgXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZS5hcmdzTWFwKSk7XHJcbiAgICBkZWJ1Z2xvZ1YoXCJtYXRjaCBcIiArIEpTT04uc3RyaW5naWZ5KG0pKTtcclxuICAgIGRlYnVnbG9nVihcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob0V4dHJhY3RlZENvbnRleHQpKTtcclxuICB9XHJcbiAgdmFyIHJlcyA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpIGFzIGFueTtcclxuICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpO1xyXG4gIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcclxuICBpZiAob0V4dHJhY3RlZENvbnRleHRbc0tleV0gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgcmVzW3NLZXldID0gb0V4dHJhY3RlZENvbnRleHRbc0tleV07XHJcbiAgfVxyXG4gIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XHJcbiAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb1J1bGUuZm9sbG93cyk7XHJcbiAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpXHJcbiAgfVxyXG4gIE9iamVjdC5mcmVlemUocmVzKTtcclxuICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKSA6ICctJyk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNvcnRCeVdlaWdodChzS2V5OiBzdHJpbmcsIG9Db250ZXh0QTogSUZNYXRjaC5jb250ZXh0LCBvQ29udGV4dEI6IElGTWF0Y2guY29udGV4dCk6IG51bWJlciB7XHJcbiAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nVignc29ydGluZzogJyArIHNLZXkgKyAnaW52b2tlZCB3aXRoXFxuIDE6JyArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QSwgdW5kZWZpbmVkLCAyKSArXHJcbiAgICBcIiB2cyBcXG4gMjpcIiArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QiwgdW5kZWZpbmVkLCAyKSk7XHJcbiAgfVxyXG4gIHZhciByYW5raW5nQTogbnVtYmVyID0gcGFyc2VGbG9hdChvQ29udGV4dEFbXCJfcmFua2luZ1wiXSB8fCBcIjFcIik7XHJcbiAgdmFyIHJhbmtpbmdCOiBudW1iZXIgPSBwYXJzZUZsb2F0KG9Db250ZXh0QltcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcclxuICBpZiAocmFua2luZ0EgIT09IHJhbmtpbmdCKSB7XHJcbiAgICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAgIGRlYnVnbG9nKFwiIHJhbmtpbiBkZWx0YVwiICsgMTAwICogKHJhbmtpbmdCIC0gcmFua2luZ0EpKTtcclxuICAgIH1cclxuICAgIHJldHVybiAxMDAgKiAocmFua2luZ0IgLSByYW5raW5nQSlcclxuICB9XHJcblxyXG4gIHZhciB3ZWlnaHRBID0gb0NvbnRleHRBW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdW3NLZXldIHx8IDA7XHJcbiAgdmFyIHdlaWdodEIgPSBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QltcIl93ZWlnaHRcIl1bc0tleV0gfHwgMDtcclxuICByZXR1cm4gKyh3ZWlnaHRCIC0gd2VpZ2h0QSk7XHJcbn1cclxuXHJcblxyXG4vLyBXb3JkLCBTeW5vbnltLCBSZWdleHAgLyBFeHRyYWN0aW9uUnVsZVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0MShjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQsIG9SdWxlczogQXJyYXk8SVJ1bGU+LCBvcHRpb25zOiBJTWF0Y2hPcHRpb25zKTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgdmFyIHNLZXkgPSBvUnVsZXNbMF0ua2V5O1xyXG4gIC8vIGNoZWNrIHRoYXQgcnVsZVxyXG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAvLyBjaGVjayBjb25zaXN0ZW5jeVxyXG4gICAgb1J1bGVzLmV2ZXJ5KGZ1bmN0aW9uIChpUnVsZSkge1xyXG4gICAgICBpZiAoaVJ1bGUua2V5ICE9PSBzS2V5KSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW5ob21vZ2Vub3VzIGtleXMgaW4gcnVsZXMsIGV4cGVjdGVkIFwiICsgc0tleSArIFwiIHdhcyBcIiArIEpTT04uc3RyaW5naWZ5KGlSdWxlKSk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vIGxvb2sgZm9yIHJ1bGVzIHdoaWNoIG1hdGNoXHJcbiAgdmFyIHJlcyA9IG9SdWxlcy5tYXAoZnVuY3Rpb24gKG9SdWxlKSB7XHJcbiAgICAvLyBpcyB0aGlzIHJ1bGUgYXBwbGljYWJsZVxyXG4gICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuV09SRDpcclxuICAgICAgICByZXR1cm4gbWF0Y2hXb3JkKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKVxyXG4gICAgICBjYXNlIElGTWF0Y2guRW51bVJ1bGVUeXBlLlJFR0VYUDpcclxuICAgICAgICByZXR1cm4gbWF0Y2hSZWdFeHAob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xyXG4gICAgICAvLyAgIGNhc2UgXCJFeHRyYWN0aW9uXCI6XHJcbiAgICAgIC8vICAgICByZXR1cm4gbWF0Y2hFeHRyYWN0aW9uKG9SdWxlLGNvbnRleHQpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gIH0pLmZpbHRlcihmdW5jdGlvbiAob3Jlcykge1xyXG4gICAgcmV0dXJuICEhb3Jlc1xyXG4gIH0pLnNvcnQoXHJcbiAgICBzb3J0QnlXZWlnaHQuYmluZCh0aGlzLCBzS2V5KVxyXG4gICAgKTtcclxuICAgIC8vZGVidWdsb2coXCJoYXNzb3J0ZWRcIiArIEpTT04uc3RyaW5naWZ5KHJlcyx1bmRlZmluZWQsMikpO1xyXG4gIHJldHVybiByZXM7XHJcbiAgLy8gT2JqZWN0LmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XHJcbiAgLy8gfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhdWdtZW50Q29udGV4dChjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQsIGFSdWxlczogQXJyYXk8SVJ1bGU+KTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcblxyXG4gIHZhciBvcHRpb25zMTogSU1hdGNoT3B0aW9ucyA9IHtcclxuICAgIG1hdGNob3RoZXJzOiB0cnVlLFxyXG4gICAgb3ZlcnJpZGU6IGZhbHNlXHJcbiAgfSBhcyBJTWF0Y2hPcHRpb25zO1xyXG5cclxuICB2YXIgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMxKVxyXG5cclxuICBpZiAoYVJlcy5sZW5ndGggPT09IDApIHtcclxuICAgIHZhciBvcHRpb25zMjogSU1hdGNoT3B0aW9ucyA9IHtcclxuICAgICAgbWF0Y2hvdGhlcnM6IGZhbHNlLFxyXG4gICAgICBvdmVycmlkZTogdHJ1ZVxyXG4gICAgfSBhcyBJTWF0Y2hPcHRpb25zO1xyXG4gICAgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMyKTtcclxuICB9XHJcbiAgcmV0dXJuIGFSZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBpbnNlcnRPcmRlcmVkKHJlc3VsdDogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiwgaUluc2VydGVkTWVtYmVyOiBJRk1hdGNoLmNvbnRleHQsIGxpbWl0OiBudW1iZXIpOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICAvLyBUT0RPOiB1c2Ugc29tZSB3ZWlnaHRcclxuICBpZiAocmVzdWx0Lmxlbmd0aCA8IGxpbWl0KSB7XHJcbiAgICByZXN1bHQucHVzaChpSW5zZXJ0ZWRNZW1iZXIpXHJcbiAgfVxyXG4gIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdGFrZVRvcE4oYXJyOiBBcnJheTxBcnJheTxJRk1hdGNoLmNvbnRleHQ+Pik6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIHZhciB1ID0gYXJyLmZpbHRlcihmdW5jdGlvbiAoaW5uZXJBcnIpIHsgcmV0dXJuIGlubmVyQXJyLmxlbmd0aCA+IDAgfSlcclxuXHJcbiAgdmFyIHJlcyA9IFtdO1xyXG4gIC8vIHNoaWZ0IG91dCB0aGUgdG9wIG9uZXNcclxuICB1ID0gdS5tYXAoZnVuY3Rpb24gKGlBcnIpIHtcclxuICAgIHZhciB0b3AgPSBpQXJyLnNoaWZ0KCk7XHJcbiAgICByZXMgPSBpbnNlcnRPcmRlcmVkKHJlcywgdG9wLCA1KVxyXG4gICAgcmV0dXJuIGlBcnJcclxuICB9KS5maWx0ZXIoZnVuY3Rpb24gKGlubmVyQXJyOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+KTogYm9vbGVhbiB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwIH0pO1xyXG4gIC8vIGFzIEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuaW1wb3J0ICogYXMgaW5wdXRGaWx0ZXJSdWxlcyBmcm9tICcuL2lucHV0RmlsdGVyUnVsZXMnO1xyXG5cclxudmFyIHJtO1xyXG5cclxuZnVuY3Rpb24gZ2V0Uk1PbmNlKCkge1xyXG4gIGlmICghcm0pIHtcclxuICAgIHJtID0gaW5wdXRGaWx0ZXJSdWxlcy5nZXRSdWxlTWFwKClcclxuICB9XHJcbiAgcmV0dXJuIHJtO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlSdWxlcyhjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQpOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICB2YXIgYmVzdE46IEFycmF5PElGTWF0Y2guY29udGV4dD4gPSBbY29udGV4dF07XHJcbiAgaW5wdXRGaWx0ZXJSdWxlcy5vS2V5T3JkZXIuZm9yRWFjaChmdW5jdGlvbiAoc0tleTogc3RyaW5nKSB7XHJcbiAgICB2YXIgYmVzdE5leHQ6IEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+ID0gW107XHJcbiAgICBiZXN0Ti5mb3JFYWNoKGZ1bmN0aW9uIChvQ29udGV4dDogSUZNYXRjaC5jb250ZXh0KSB7XHJcbiAgICAgIGlmIChvQ29udGV4dFtzS2V5XSkge1xyXG4gICAgICAgIGRlYnVnbG9nKCcqKiBhcHBseWluZyBydWxlcyBmb3IgJyArIHNLZXkpXHJcbiAgICAgICAgdmFyIHJlcyA9IGF1Z21lbnRDb250ZXh0KG9Db250ZXh0LCBnZXRSTU9uY2UoKVtzS2V5XSB8fCBbXSlcclxuICAgICAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKCcqKiByZXN1bHQgZm9yICcgKyBzS2V5ICsgJyA9ICcgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpOiAnLScpO1xyXG4gICAgICAgIGJlc3ROZXh0LnB1c2gocmVzIHx8IFtdKVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIHJ1bGUgbm90IHJlbGV2YW50XHJcbiAgICAgICAgYmVzdE5leHQucHVzaChbb0NvbnRleHRdKTtcclxuICAgICAgfVxyXG4gICAgfSlcclxuICAgIGJlc3ROID0gdGFrZVRvcE4oYmVzdE5leHQpO1xyXG4gIH0pO1xyXG4gIHJldHVybiBiZXN0TlxyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UnVsZXNQaWNrRmlyc3QoY29udGV4dDogSUZNYXRjaC5jb250ZXh0KTogSUZNYXRjaC5jb250ZXh0IHtcclxuICB2YXIgciA9IGFwcGx5UnVsZXMoY29udGV4dCk7XHJcbiAgcmV0dXJuIHIgJiYgclswXTtcclxufVxyXG5cclxuLyoqXHJcbiAqIERlY2lkZSB3aGV0aGVyIHRvIHJlcXVlcnkgZm9yIGEgY29udGV0XHJcbiAqL1xyXG4vL2V4cG9ydCBmdW5jdGlvbiBkZWNpZGVPblJlUXVlcnkoY29udGV4dDogSUZNYXRjaC5jb250ZXh0KTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbi8vICByZXR1cm4gW11cclxuLy99XHJcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
