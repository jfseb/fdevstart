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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1hdGNoL2lucHV0RmlsdGVyLmpzIiwiLi4vc3JjL21hdGNoL2lucHV0RmlsdGVyLnRzIl0sIm5hbWVzIjpbImRpc3RhbmNlIiwicmVxdWlyZSIsIkxvZ2dlciIsImxvZ2dlciIsImRlYnVnIiwiZGVidWdwZXJmIiwidXRpbHMiLCJBbGdvbCIsImJyZWFrZG93biIsIkFueU9iamVjdCIsIk9iamVjdCIsImRlYnVnbG9nIiwiZGVidWdsb2dWIiwiZGVidWdsb2dNIiwibW9ja0RlYnVnIiwibyIsImV4cG9ydHMiLCJtYXRjaGRhdGEiLCJvVW5pdFRlc3RzIiwiY2FsY0Rpc3RhbmNlIiwic1RleHQxIiwic1RleHQyIiwiY2FsY0Rpc3RhbmNlQWRqdXN0ZWQiLCJJRk1hdGNoIiwibGV2ZW5QZW5hbHR5T2xkIiwiaSIsImxldmVuUGVuYWx0eSIsIm5vblByaXZhdGVLZXlzIiwib0EiLCJrZXlzIiwiZmlsdGVyIiwia2V5IiwiY291bnRBaW5CIiwib0IiLCJmbkNvbXBhcmUiLCJhS2V5SWdub3JlIiwiQXJyYXkiLCJpc0FycmF5IiwiaW5kZXhPZiIsInJlZHVjZSIsInByZXYiLCJwcm90b3R5cGUiLCJoYXNPd25Qcm9wZXJ0eSIsImNhbGwiLCJzcHVyaW91c0Fub3RJbkIiLCJsb3dlckNhc2UiLCJ0b0xvd2VyQ2FzZSIsImNvbXBhcmVDb250ZXh0IiwiZXF1YWwiLCJhIiwiYiIsImRpZmZlcmVudCIsInNwdXJpb3VzTCIsInNwdXJpb3VzUiIsInNvcnRCeVJhbmsiLCJyIiwiX3JhbmtpbmciLCJjYXRlZ29yeSIsImxvY2FsZUNvbXBhcmUiLCJtYXRjaGVkU3RyaW5nIiwiY2hlY2tPbmVSdWxlIiwic3RyaW5nIiwibGNTdHJpbmciLCJleGFjdCIsInJlcyIsIm9SdWxlIiwiY250UmVjIiwiZW5hYmxlZCIsIkpTT04iLCJzdHJpbmdpZnkiLCJ0eXBlIiwibG93ZXJjYXNld29yZCIsIkVycm9yIiwidW5kZWZpbmVkIiwid29yZCIsInB1c2giLCJleGFjdE9ubHkiLCJsZXZlbm1hdGNoIiwiQ3V0b2ZmX1dvcmRNYXRjaCIsImFkZENudFJlYyIsInJlYyIsInRvRml4ZWQiLCJtIiwicmVnZXhwIiwiZXhlYyIsIm1hdGNoSW5kZXgiLCJjaGVja09uZVJ1bGVXaXRoT2Zmc2V0IiwicnVsZSIsIm1lbWJlciIsIm51bWJlciIsImNhdGVnb3JpemVTdHJpbmciLCJvUnVsZXMiLCJmb3JFYWNoIiwic29ydCIsImNhdGVnb3JpemVTaW5nbGVXb3JkV2l0aE9mZnNldCIsImxjd29yZCIsImxlbmd0aCIsInBvc3RGaWx0ZXIiLCJiZXN0UmFuayIsIm1hcCIsImluZGV4Iiwiam9pbiIsInJlc3giLCJkZWx0YSIsInBvc3RGaWx0ZXJXaXRoT2Zmc2V0IiwicmFuZ2UiLCJjYXRlZ29yaXplU3RyaW5nMiIsInJ1bGVzIiwid29yZE1hcCIsIm5vbldvcmRSdWxlcyIsImFsbFJ1bGVzIiwiY2F0ZWdvcml6ZVdvcmRJbnRlcm5hbFdpdGhPZmZzZXRzIiwicnIiLCJtYXRjaFdvcmQiLCJjb250ZXh0Iiwib3B0aW9ucyIsInMxIiwiczIiLCJmb2xsb3dzIiwibWF0Y2hvdGhlcnMiLCJjIiwiYXNzaWduIiwib3ZlcnJpZGUiLCJfd2VpZ2h0IiwiZnJlZXplIiwiZXh0cmFjdEFyZ3NNYXAiLCJtYXRjaCIsImFyZ3NNYXAiLCJpS2V5IiwidmFsdWUiLCJSYW5rV29yZCIsImhhc0Fib3ZlIiwibHN0IiwiYm9yZGVyIiwiZXZlcnkiLCJvTWVtYmVyIiwidGFrZUZpcnN0TiIsIm4iLCJsYXN0UmFua2luZyIsImNudFJhbmdlZCIsImlJbmRleCIsImlzUmFuZ2VkIiwidGFrZUFib3ZlIiwiY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZiIsInNXb3JkR3JvdXAiLCJzcGxpdFJ1bGVzIiwic2Vlbkl0IiwiVG9wX05fV29yZENhdGVnb3JpemF0aW9ucyIsImNhdGVnb3JpemVXb3JkV2l0aE9mZnNldFdpdGhSYW5rQ3V0b2ZmIiwic1dvcmRHcm91cExDIiwib2JqIiwiY2F0ZWdvcml6ZVdvcmRXaXRoT2Zmc2V0V2l0aFJhbmtDdXRvZmZTaW5nbGUiLCJjYXRlZ29yaXplQVdvcmQiLCJzZW50ZW5jZSIsIndvcmRzIiwiZGVlcEZyZWV6ZSIsImNsb25lRGVlcCIsImFuYWx5emVTdHJpbmciLCJzU3RyaW5nIiwiY250IiwiZmFjIiwidSIsImJyZWFrZG93blN0cmluZyIsIk1heFNwYWNlc1BlckNvbWJpbmVkV29yZCIsImFCcmVha0Rvd25TZW50ZW5jZSIsImNhdGVnb3JpemVkU2VudGVuY2UiLCJpc1ZhbGlkIiwiY2F0ZWdvcml6ZUFXb3JkV2l0aE9mZnNldHMiLCJjbG9uZSIsImNvcHlWZWNNZW1iZXJzIiwiZXhwYW5kTWF0Y2hBcnIiLCJkZWVwIiwibGluZSIsInVCcmVha0Rvd25MaW5lIiwiYVdvcmRHcm91cCIsIndnSW5kZXgiLCJvV29yZFZhcmlhbnQiLCJpV1ZJbmRleCIsIm52ZWNzIiwidmVjcyIsInJ2ZWMiLCJrIiwibmV4dEJhc2UiLCJsIiwic2xpY2UiLCJjb25jYXQiLCJyZWluZm9yY2VEaXN0V2VpZ2h0IiwiZGlzdCIsImFicyIsIk1hdGgiLCJhUmVpbmZvcmNlRGlzdFdlaWdodCIsImV4dHJhY3RDYXRlZ29yeU1hcCIsIm9TZW50ZW5jZSIsIm9Xb3JkIiwiQ0FUX0NBVEVHT1JZIiwicG9zIiwicmVpbkZvcmNlU2VudGVuY2UiLCJvQ2F0ZWdvcnlNYXAiLCJvUG9zaXRpb24iLCJyZWluZm9yY2UiLCJib29zdCIsIlNlbnRlbmNlIiwicmVpbkZvcmNlIiwiYUNhdGVnb3JpemVkQXJyYXkiLCJjbXBSYW5raW5nUHJvZHVjdCIsInJhbmtpbmdQcm9kdWN0IiwibWF0Y2hSZWdFeHAiLCJzS2V5IiwicmVnIiwib0V4dHJhY3RlZENvbnRleHQiLCJzb3J0QnlXZWlnaHQiLCJvQ29udGV4dEEiLCJvQ29udGV4dEIiLCJyYW5raW5nQSIsInBhcnNlRmxvYXQiLCJyYW5raW5nQiIsIndlaWdodEEiLCJ3ZWlnaHRCIiwiYXVnbWVudENvbnRleHQxIiwiaVJ1bGUiLCJvcmVzIiwiYmluZCIsImF1Z21lbnRDb250ZXh0IiwiYVJ1bGVzIiwib3B0aW9uczEiLCJhUmVzIiwib3B0aW9uczIiLCJpbnNlcnRPcmRlcmVkIiwicmVzdWx0IiwiaUluc2VydGVkTWVtYmVyIiwibGltaXQiLCJ0YWtlVG9wTiIsImFyciIsImlubmVyQXJyIiwiaUFyciIsInRvcCIsInNoaWZ0IiwiaW5wdXRGaWx0ZXJSdWxlcyIsInJtIiwiZ2V0Uk1PbmNlIiwiZ2V0UnVsZU1hcCIsImFwcGx5UnVsZXMiLCJiZXN0TiIsIm9LZXlPcmRlciIsImJlc3ROZXh0Iiwib0NvbnRleHQiLCJhcHBseVJ1bGVzUGlja0ZpcnN0Il0sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOzs7Ozs7Ozs7Ozs7Ozs7O0FBZ0JBOztBQUNBLElBQUFBLFdBQUFDLFFBQUEsNkJBQUEsQ0FBQTtBQUVBLElBQUFDLFNBQUFELFFBQUEsaUJBQUEsQ0FBQTtBQUVBLElBQU1FLFNBQVNELE9BQU9DLE1BQVAsQ0FBYyxhQUFkLENBQWY7QUFFQSxJQUFBQyxRQUFBSCxRQUFBLE9BQUEsQ0FBQTtBQUNBLElBQUlJLFlBQVlELE1BQU0sTUFBTixDQUFoQjtBQUVBLElBQUFFLFFBQUFMLFFBQUEsZ0JBQUEsQ0FBQTtBQUdBLElBQUFNLFFBQUFOLFFBQUEsU0FBQSxDQUFBO0FBSUEsSUFBQU8sWUFBQVAsUUFBQSxhQUFBLENBQUE7QUFFQSxJQUFNUSxZQUFpQkMsTUFBdkI7QUFFQSxJQUFJQyxXQUFXUCxNQUFNLGFBQU4sQ0FBZjtBQUNBLElBQUlRLFlBQVlSLE1BQU0sY0FBTixDQUFoQjtBQUNBLElBQUlTLFlBQVlULE1BQU0sY0FBTixDQUFoQjtBQUVBLFNBQUFVLFNBQUEsQ0FBMEJDLENBQTFCLEVBQTJCO0FBQ3pCSixlQUFXSSxDQUFYO0FBQ0FILGdCQUFZRyxDQUFaO0FBQ0FGLGdCQUFZRSxDQUFaO0FBQ0Q7QUFKREMsUUFBQUYsU0FBQSxHQUFBQSxTQUFBO0FBT0EsSUFBQUcsWUFBQWhCLFFBQUEsYUFBQSxDQUFBO0FBQ0EsSUFBSWlCLGFBQWFELFVBQVVDLFVBQTNCO0FBSUE7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LyoqXG4gKiB0aGUgaW5wdXQgZmlsdGVyIHN0YWdlIHByZXByb2Nlc3NlcyBhIGN1cnJlbnQgY29udGV4dFxuICpcbiAqIEl0IGEpIGNvbWJpbmVzIG11bHRpLXNlZ21lbnQgYXJndW1lbnRzIGludG8gb25lIGNvbnRleHQgbWVtYmVyc1xuICogSXQgYikgYXR0ZW1wdHMgdG8gYXVnbWVudCB0aGUgY29udGV4dCBieSBhZGRpdGlvbmFsIHF1YWxpZmljYXRpb25zXG4gKiAgICAgICAgICAgKE1pZCB0ZXJtIGdlbmVyYXRpbmcgQWx0ZXJuYXRpdmVzLCBlLmcuXG4gKiAgICAgICAgICAgICAgICAgQ2xpZW50U2lkZVRhcmdldFJlc29sdXRpb24gLT4gdW5pdCB0ZXN0P1xuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHNvdXJjZSA/XG4gKiAgICAgICAgICAgKVxuICogIFNpbXBsZSBydWxlcyBsaWtlICBJbnRlbnRcbiAqXG4gKlxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuaW5wdXRGaWx0ZXJcbiAqIEBmaWxlIGlucHV0RmlsdGVyLnRzXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXG4gKi9cbi8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2xpYi9ub2RlLTQuZC50c1wiIC8+XG52YXIgZGlzdGFuY2UgPSByZXF1aXJlKFwiLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluXCIpO1xudmFyIExvZ2dlciA9IHJlcXVpcmUoXCIuLi91dGlscy9sb2dnZXJcIik7XG52YXIgbG9nZ2VyID0gTG9nZ2VyLmxvZ2dlcignaW5wdXRGaWx0ZXInKTtcbnZhciBkZWJ1ZyA9IHJlcXVpcmUoXCJkZWJ1Z1wiKTtcbnZhciBkZWJ1Z3BlcmYgPSBkZWJ1ZygncGVyZicpO1xudmFyIHV0aWxzID0gcmVxdWlyZShcIi4uL3V0aWxzL3V0aWxzXCIpO1xudmFyIEFsZ29sID0gcmVxdWlyZShcIi4vYWxnb2xcIik7XG52YXIgYnJlYWtkb3duID0gcmVxdWlyZShcIi4vYnJlYWtkb3duXCIpO1xudmFyIEFueU9iamVjdCA9IE9iamVjdDtcbnZhciBkZWJ1Z2xvZyA9IGRlYnVnKCdpbnB1dEZpbHRlcicpO1xudmFyIGRlYnVnbG9nViA9IGRlYnVnKCdpbnB1dFZGaWx0ZXInKTtcbnZhciBkZWJ1Z2xvZ00gPSBkZWJ1ZygnaW5wdXRNRmlsdGVyJyk7XG5mdW5jdGlvbiBtb2NrRGVidWcobykge1xuICAgIGRlYnVnbG9nID0gbztcbiAgICBkZWJ1Z2xvZ1YgPSBvO1xuICAgIGRlYnVnbG9nTSA9IG87XG59XG5leHBvcnRzLm1vY2tEZWJ1ZyA9IG1vY2tEZWJ1ZztcbnZhciBtYXRjaGRhdGEgPSByZXF1aXJlKFwiLi9tYXRjaGRhdGFcIik7XG52YXIgb1VuaXRUZXN0cyA9IG1hdGNoZGF0YS5vVW5pdFRlc3RzO1xuLyoqXG4gKiBAcGFyYW0gc1RleHQge3N0cmluZ30gdGhlIHRleHQgdG8gbWF0Y2ggdG8gTmF2VGFyZ2V0UmVzb2x1dGlvblxuICogQHBhcmFtIHNUZXh0MiB7c3RyaW5nfSB0aGUgcXVlcnkgdGV4dCwgZS5nLiBOYXZUYXJnZXRcbiAqXG4gKiBAcmV0dXJuIHRoZSBkaXN0YW5jZSwgbm90ZSB0aGF0IGlzIGlzICpub3QqIHN5bW1ldHJpYyFcbiAqL1xuZnVuY3Rpb24gY2FsY0Rpc3RhbmNlKHNUZXh0MSwgc1RleHQyKSB7XG4gICAgcmV0dXJuIGRpc3RhbmNlLmNhbGNEaXN0YW5jZUFkanVzdGVkKHNUZXh0MSwgc1RleHQyKTtcbn1cbmV4cG9ydHMuY2FsY0Rpc3RhbmNlID0gY2FsY0Rpc3RhbmNlO1xuLyoqXG4gKiBAcGFyYW0gc1RleHQge3N0cmluZ30gdGhlIHRleHQgdG8gbWF0Y2ggdG8gTmF2VGFyZ2V0UmVzb2x1dGlvblxuICogQHBhcmFtIHNUZXh0MiB7c3RyaW5nfSB0aGUgcXVlcnkgdGV4dCwgZS5nLiBOYXZUYXJnZXRcbiAqXG4gKiBAcmV0dXJuIHRoZSBkaXN0YW5jZSwgbm90ZSB0aGF0IGlzIGlzICpub3QqIHN5bW1ldHJpYyFcbiAqL1xuLypcbmV4cG9ydCBmdW5jdGlvbiBjYWxjRGlzdGFuY2VMZXZlblhYWChzVGV4dDE6IHN0cmluZywgc1RleHQyOiBzdHJpbmcpOiBudW1iZXIge1xuICAvLyBjb25zb2xlLmxvZyhcImxlbmd0aDJcIiArIHNUZXh0MSArIFwiIC0gXCIgKyBzVGV4dDIpXG4gICBpZigoKHNUZXh0MS5sZW5ndGggLSBzVGV4dDIubGVuZ3RoKSA+IEFsZ29sLmNhbGNEaXN0Lmxlbmd0aERlbHRhMSlcbiAgICB8fCAoc1RleHQyLmxlbmd0aCA+IDEuNSAqIHNUZXh0MS5sZW5ndGggKVxuICAgIHx8IChzVGV4dDIubGVuZ3RoIDwgKHNUZXh0MS5sZW5ndGgvMikpICkge1xuICAgIHJldHVybiA1MDAwMDtcbiAgfVxuICB2YXIgYTAgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEuc3Vic3RyaW5nKDAsIHNUZXh0Mi5sZW5ndGgpLCBzVGV4dDIpXG4gIGlmKGRlYnVnbG9nVi5lbmFibGVkKSB7XG4gICAgZGVidWdsb2dWKFwiZGlzdGFuY2VcIiArIGEwICsgXCJzdHJpcHBlZD5cIiArIHNUZXh0MS5zdWJzdHJpbmcoMCxzVGV4dDIubGVuZ3RoKSArIFwiPD5cIiArIHNUZXh0MisgXCI8XCIpO1xuICB9XG4gIGlmKGEwICogNTAgPiAxNSAqIHNUZXh0Mi5sZW5ndGgpIHtcbiAgICAgIHJldHVybiA0MDAwMDtcbiAgfVxuICB2YXIgYSA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MSwgc1RleHQyKVxuICByZXR1cm4gYTAgKiA1MDAgLyBzVGV4dDIubGVuZ3RoICsgYVxufVxuKi9cbnZhciBJRk1hdGNoID0gcmVxdWlyZShcIi4uL21hdGNoL2lmbWF0Y2hcIik7XG4vL2NvbnN0IGxldmVuQ3V0b2ZmID0gQWxnb2wuQ3V0b2ZmX0xldmVuU2h0ZWluO1xuZnVuY3Rpb24gbGV2ZW5QZW5hbHR5T2xkKGkpIHtcbiAgICAvLyAwLT4gMVxuICAgIC8vIDEgLT4gMC4xXG4gICAgLy8gMTUwIC0+ICAwLjhcbiAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgICByZXR1cm4gMTtcbiAgICB9XG4gICAgLy8gcmV2ZXJzZSBtYXkgYmUgYmV0dGVyIHRoYW4gbGluZWFyXG4gICAgcmV0dXJuIDEgKyBpICogKDAuOCAtIDEpIC8gMTUwO1xufVxuZXhwb3J0cy5sZXZlblBlbmFsdHlPbGQgPSBsZXZlblBlbmFsdHlPbGQ7XG5mdW5jdGlvbiBsZXZlblBlbmFsdHkoaSkge1xuICAgIC8vIDEgLT4gMVxuICAgIC8vIGN1dE9mZiA9PiAwLjhcbiAgICByZXR1cm4gaTtcbiAgICAvL3JldHVybiAgIDEgLSAgKDEgLSBpKSAqMC4yL0FsZ29sLkN1dG9mZl9Xb3JkTWF0Y2g7XG59XG5leHBvcnRzLmxldmVuUGVuYWx0eSA9IGxldmVuUGVuYWx0eTtcbmZ1bmN0aW9uIG5vblByaXZhdGVLZXlzKG9BKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4ga2V5WzBdICE9PSAnXyc7XG4gICAgfSk7XG59XG5mdW5jdGlvbiBjb3VudEFpbkIob0EsIG9CLCBmbkNvbXBhcmUsIGFLZXlJZ25vcmUpIHtcbiAgICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxuICAgICAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xuICAgIGZuQ29tcGFyZSA9IGZuQ29tcGFyZSB8fCBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcbiAgICB9KS5cbiAgICAgICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xuICAgICAgICAgICAgcHJldiA9IHByZXYgKyAoZm5Db21wYXJlKG9BW2tleV0sIG9CW2tleV0sIGtleSkgPyAxIDogMCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG59XG5leHBvcnRzLmNvdW50QWluQiA9IGNvdW50QWluQjtcbmZ1bmN0aW9uIHNwdXJpb3VzQW5vdEluQihvQSwgb0IsIGFLZXlJZ25vcmUpIHtcbiAgICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxuICAgICAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xuICAgIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcbiAgICB9KS5cbiAgICAgICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbn1cbmV4cG9ydHMuc3B1cmlvdXNBbm90SW5CID0gc3B1cmlvdXNBbm90SW5CO1xuZnVuY3Rpb24gbG93ZXJDYXNlKG8pIHtcbiAgICBpZiAodHlwZW9mIG8gPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgcmV0dXJuIG8udG9Mb3dlckNhc2UoKTtcbiAgICB9XG4gICAgcmV0dXJuIG87XG59XG5mdW5jdGlvbiBjb21wYXJlQ29udGV4dChvQSwgb0IsIGFLZXlJZ25vcmUpIHtcbiAgICB2YXIgZXF1YWwgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpID09PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xuICAgIHZhciBkaWZmZXJlbnQgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpICE9PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xuICAgIHZhciBzcHVyaW91c0wgPSBzcHVyaW91c0Fub3RJbkIob0EsIG9CLCBhS2V5SWdub3JlKTtcbiAgICB2YXIgc3B1cmlvdXNSID0gc3B1cmlvdXNBbm90SW5CKG9CLCBvQSwgYUtleUlnbm9yZSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZXF1YWw6IGVxdWFsLFxuICAgICAgICBkaWZmZXJlbnQ6IGRpZmZlcmVudCxcbiAgICAgICAgc3B1cmlvdXNMOiBzcHVyaW91c0wsXG4gICAgICAgIHNwdXJpb3VzUjogc3B1cmlvdXNSXG4gICAgfTtcbn1cbmV4cG9ydHMuY29tcGFyZUNvbnRleHQgPSBjb21wYXJlQ29udGV4dDtcbmZ1bmN0aW9uIHNvcnRCeVJhbmsoYSwgYikge1xuICAgIHZhciByID0gLSgoYS5fcmFua2luZyB8fCAxLjApIC0gKGIuX3JhbmtpbmcgfHwgMS4wKSk7XG4gICAgaWYgKHIpIHtcbiAgICAgICAgcmV0dXJuIHI7XG4gICAgfVxuICAgIGlmIChhLmNhdGVnb3J5ICYmIGIuY2F0ZWdvcnkpIHtcbiAgICAgICAgciA9IGEuY2F0ZWdvcnkubG9jYWxlQ29tcGFyZShiLmNhdGVnb3J5KTtcbiAgICAgICAgaWYgKHIpIHtcbiAgICAgICAgICAgIHJldHVybiByO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChhLm1hdGNoZWRTdHJpbmcgJiYgYi5tYXRjaGVkU3RyaW5nKSB7XG4gICAgICAgIHIgPSBhLm1hdGNoZWRTdHJpbmcubG9jYWxlQ29tcGFyZShiLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICBpZiAocikge1xuICAgICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIDA7XG59XG5mdW5jdGlvbiBjaGVja09uZVJ1bGUoc3RyaW5nLCBsY1N0cmluZywgZXhhY3QsIHJlcywgb1J1bGUsIGNudFJlYykge1xuICAgIGlmIChkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZ1YoJ2F0dGVtcHRpbmcgdG8gbWF0Y2ggcnVsZSAnICsgSlNPTi5zdHJpbmdpZnkob1J1bGUpICsgXCIgdG8gc3RyaW5nIFxcXCJcIiArIHN0cmluZyArIFwiXFxcIlwiKTtcbiAgICB9XG4gICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XG4gICAgICAgIGNhc2UgMCAvKiBXT1JEICovOlxuICAgICAgICAgICAgaWYgKCFvUnVsZS5sb3dlcmNhc2V3b3JkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdydWxlIHdpdGhvdXQgYSBsb3dlcmNhc2UgdmFyaWFudCcgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICA7XG4gICAgICAgICAgICBpZiAoZXhhY3QgJiYgb1J1bGUud29yZCA9PT0gc3RyaW5nIHx8IG9SdWxlLmxvd2VyY2FzZXdvcmQgPT09IGxjU3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVidWdsb2coXCJcXG4hbWF0Y2hlZCBleGFjdCBcIiArIHN0cmluZyArIFwiPVwiICsgb1J1bGUubG93ZXJjYXNld29yZCArIFwiID0+IFwiICsgb1J1bGUubWF0Y2hlZFN0cmluZyArIFwiL1wiICsgb1J1bGUuY2F0ZWdvcnkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBvUnVsZS5tYXRjaGVkU3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghZXhhY3QgJiYgIW9SdWxlLmV4YWN0T25seSkge1xuICAgICAgICAgICAgICAgIHZhciBsZXZlbm1hdGNoID0gY2FsY0Rpc3RhbmNlKG9SdWxlLmxvd2VyY2FzZXdvcmQsIGxjU3RyaW5nKTtcbiAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlXCIsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICBpZihsZXZlbm1hdGNoIDwgNTApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlRXhwXCIsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGxldmVubWF0Y2ggPCA0MDAwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VCZWxvdzQwa1wiLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIC8vaWYob1J1bGUubG93ZXJjYXNld29yZCA9PT0gXCJjb3Ntb3NcIikge1xuICAgICAgICAgICAgICAgIC8vICBjb25zb2xlLmxvZyhcImhlcmUgcmFua2luZyBcIiArIGxldmVubWF0Y2ggKyBcIiBcIiArIG9SdWxlLmxvd2VyY2FzZXdvcmQgKyBcIiBcIiArIGxjU3RyaW5nKTtcbiAgICAgICAgICAgICAgICAvL31cbiAgICAgICAgICAgICAgICBpZiAobGV2ZW5tYXRjaCA+PSBBbGdvbC5DdXRvZmZfV29yZE1hdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsIFwiY2FsY0Rpc3RhbmNlT2tcIiwgMSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZWMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgICAgICBfcmFua2luZzogKG9SdWxlLl9yYW5raW5nIHx8IDEuMCkgKiBsZXZlblBlbmFsdHkobGV2ZW5tYXRjaCksXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXZlbm1hdGNoOiBsZXZlbm1hdGNoXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIGlmIChkZWJ1Z2xvZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVidWdsb2coXCJcXG4hZnV6enkgXCIgKyAobGV2ZW5tYXRjaCkudG9GaXhlZCgzKSArIFwiIFwiICsgcmVjLl9yYW5raW5nLnRvRml4ZWQoMykgKyBcIiAgXCIgKyBzdHJpbmcgKyBcIj1cIiArIG9SdWxlLmxvd2VyY2FzZXdvcmQgKyBcIiA9PiBcIiArIG9SdWxlLm1hdGNoZWRTdHJpbmcgKyBcIi9cIiArIG9SdWxlLmNhdGVnb3J5KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXMucHVzaChyZWMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDEgLyogUkVHRVhQICovOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KFwiIGhlcmUgcmVnZXhwXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgbSA9IG9SdWxlLnJlZ2V4cC5leGVjKHN0cmluZyk7XG4gICAgICAgICAgICAgICAgaWYgKG0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiAob1J1bGUubWF0Y2hJbmRleCAhPT0gdW5kZWZpbmVkICYmIG1bb1J1bGUubWF0Y2hJbmRleF0pIHx8IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmtub3duIHR5cGVcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG59XG5leHBvcnRzLmNoZWNrT25lUnVsZSA9IGNoZWNrT25lUnVsZTtcbmZ1bmN0aW9uIGNoZWNrT25lUnVsZVdpdGhPZmZzZXQoc3RyaW5nLCBsY1N0cmluZywgZXhhY3QsIHJlcywgb1J1bGUsIGNudFJlYykge1xuICAgIGlmIChkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZ1YoJ2F0dGVtcHRpbmcgdG8gbWF0Y2ggcnVsZSAnICsgSlNPTi5zdHJpbmdpZnkob1J1bGUpICsgXCIgdG8gc3RyaW5nIFxcXCJcIiArIHN0cmluZyArIFwiXFxcIlwiKTtcbiAgICB9XG4gICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XG4gICAgICAgIGNhc2UgMCAvKiBXT1JEICovOlxuICAgICAgICAgICAgaWYgKCFvUnVsZS5sb3dlcmNhc2V3b3JkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdydWxlIHdpdGhvdXQgYSBsb3dlcmNhc2UgdmFyaWFudCcgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICA7XG4gICAgICAgICAgICBpZiAoZXhhY3QgJiYgKG9SdWxlLndvcmQgPT09IHN0cmluZyB8fCBvUnVsZS5sb3dlcmNhc2V3b3JkID09PSBsY1N0cmluZykpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcIlxcbiFtYXRjaGVkIGV4YWN0IFwiICsgc3RyaW5nICsgXCI9XCIgKyBvUnVsZS5sb3dlcmNhc2V3b3JkICsgXCIgPT4gXCIgKyBvUnVsZS5tYXRjaGVkU3RyaW5nICsgXCIvXCIgKyBvUnVsZS5jYXRlZ29yeSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgcnVsZTogb1J1bGUsXG4gICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghZXhhY3QgJiYgIW9SdWxlLmV4YWN0T25seSkge1xuICAgICAgICAgICAgICAgIHZhciBsZXZlbm1hdGNoID0gY2FsY0Rpc3RhbmNlKG9SdWxlLmxvd2VyY2FzZXdvcmQsIGxjU3RyaW5nKTtcbiAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlXCIsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICBpZihsZXZlbm1hdGNoIDwgNTApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlRXhwXCIsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGxldmVubWF0Y2ggPCA0MDAwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VCZWxvdzQwa1wiLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIC8vaWYob1J1bGUubG93ZXJjYXNld29yZCA9PT0gXCJjb3Ntb3NcIikge1xuICAgICAgICAgICAgICAgIC8vICBjb25zb2xlLmxvZyhcImhlcmUgcmFua2luZyBcIiArIGxldmVubWF0Y2ggKyBcIiBcIiArIG9SdWxlLmxvd2VyY2FzZXdvcmQgKyBcIiBcIiArIGxjU3RyaW5nKTtcbiAgICAgICAgICAgICAgICAvL31cbiAgICAgICAgICAgICAgICBpZiAobGV2ZW5tYXRjaCA+PSBBbGdvbC5DdXRvZmZfV29yZE1hdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJmb3VuZCByZWNcIik7XG4gICAgICAgICAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsIFwiY2FsY0Rpc3RhbmNlT2tcIiwgMSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZWMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bGU6IG9SdWxlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiAob1J1bGUuX3JhbmtpbmcgfHwgMS4wKSAqIGxldmVuUGVuYWx0eShsZXZlbm1hdGNoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldmVubWF0Y2g6IGxldmVubWF0Y2hcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlYnVnbG9nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcIlxcbiFDT1JPOiBmdXp6eSBcIiArIChsZXZlbm1hdGNoKS50b0ZpeGVkKDMpICsgXCIgXCIgKyByZWMuX3JhbmtpbmcudG9GaXhlZCgzKSArIFwiICBcXFwiXCIgKyBzdHJpbmcgKyBcIlxcXCI9XCIgKyBvUnVsZS5sb3dlcmNhc2V3b3JkICsgXCIgPT4gXCIgKyBvUnVsZS5tYXRjaGVkU3RyaW5nICsgXCIvXCIgKyBvUnVsZS5jYXRlZ29yeSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmVzLnB1c2gocmVjKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAxIC8qIFJFR0VYUCAqLzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShcIiBoZXJlIHJlZ2V4cFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUsIHVuZGVmaW5lZCwgMikpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIG0gPSBvUnVsZS5yZWdleHAuZXhlYyhzdHJpbmcpO1xuICAgICAgICAgICAgICAgIGlmIChtKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcnVsZTogb1J1bGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiAob1J1bGUubWF0Y2hJbmRleCAhPT0gdW5kZWZpbmVkICYmIG1bb1J1bGUubWF0Y2hJbmRleF0pIHx8IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmtub3duIHR5cGVcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG59XG5leHBvcnRzLmNoZWNrT25lUnVsZVdpdGhPZmZzZXQgPSBjaGVja09uZVJ1bGVXaXRoT2Zmc2V0O1xuO1xuZnVuY3Rpb24gYWRkQ250UmVjKGNudFJlYywgbWVtYmVyLCBudW1iZXIpIHtcbiAgICBpZiAoKCFjbnRSZWMpIHx8IChudW1iZXIgPT09IDApKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY250UmVjW21lbWJlcl0gPSAoY250UmVjW21lbWJlcl0gfHwgMCkgKyBudW1iZXI7XG59XG5mdW5jdGlvbiBjYXRlZ29yaXplU3RyaW5nKHdvcmQsIGV4YWN0LCBvUnVsZXMsIGNudFJlYykge1xuICAgIC8vIHNpbXBseSBhcHBseSBhbGwgcnVsZXNcbiAgICBpZiAoZGVidWdsb2dNLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2dNKFwicnVsZXMgOiBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHZhciBsY1N0cmluZyA9IHdvcmQudG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgb1J1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgIGNoZWNrT25lUnVsZSh3b3JkLCBsY1N0cmluZywgZXhhY3QsIHJlcywgb1J1bGUsIGNudFJlYyk7XG4gICAgfSk7XG4gICAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZVN0cmluZyA9IGNhdGVnb3JpemVTdHJpbmc7XG5mdW5jdGlvbiBjYXRlZ29yaXplU2luZ2xlV29yZFdpdGhPZmZzZXQod29yZCwgbGN3b3JkLCBleGFjdCwgb1J1bGVzLCBjbnRSZWMpIHtcbiAgICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXG4gICAgaWYgKGRlYnVnbG9nTS5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nTShcInJ1bGVzIDogXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZXMsIHVuZGVmaW5lZCwgMikpO1xuICAgIH1cbiAgICB2YXIgcmVzID0gW107XG4gICAgb1J1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgIGNoZWNrT25lUnVsZVdpdGhPZmZzZXQod29yZCwgbGN3b3JkLCBleGFjdCwgcmVzLCBvUnVsZSwgY250UmVjKTtcbiAgICB9KTtcbiAgICBkZWJ1Z2xvZyhcIkNTV1dPOiBnb3QgcmVzdWx0cyBmb3IgXCIgKyBsY3dvcmQgKyBcIiAgXCIgKyByZXMubGVuZ3RoKTtcbiAgICByZXMuc29ydChzb3J0QnlSYW5rKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5jYXRlZ29yaXplU2luZ2xlV29yZFdpdGhPZmZzZXQgPSBjYXRlZ29yaXplU2luZ2xlV29yZFdpdGhPZmZzZXQ7XG5mdW5jdGlvbiBwb3N0RmlsdGVyKHJlcykge1xuICAgIHJlcy5zb3J0KHNvcnRCeVJhbmspO1xuICAgIHZhciBiZXN0UmFuayA9IDA7XG4gICAgLy9jb25zb2xlLmxvZyhcIlxcbnBpbHRlcmVkIFwiICsgSlNPTi5zdHJpbmdpZnkocmVzKSk7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCJwcmVGaWx0ZXIgOiBcXG5cIiArIHJlcy5tYXAoZnVuY3Rpb24gKHdvcmQsIGluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4gaW5kZXggKyBcIiBcIiArIHdvcmQuX3JhbmtpbmcgKyBcIiAgPT4gXFxcIlwiICsgd29yZC5jYXRlZ29yeSArIFwiXFxcIiBcIiArIHdvcmQubWF0Y2hlZFN0cmluZztcbiAgICAgICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgfVxuICAgIHZhciByID0gcmVzLmZpbHRlcihmdW5jdGlvbiAocmVzeCwgaW5kZXgpIHtcbiAgICAgICAgaWYgKGluZGV4ID09PSAwKSB7XG4gICAgICAgICAgICBiZXN0UmFuayA9IHJlc3guX3Jhbmtpbmc7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyAxLTAuOSA9IDAuMVxuICAgICAgICAvLyAxLSAwLjkzID0gMC43XG4gICAgICAgIC8vIDEvN1xuICAgICAgICB2YXIgZGVsdGEgPSBiZXN0UmFuayAvIHJlc3guX3Jhbmtpbmc7XG4gICAgICAgIGlmICgocmVzeC5tYXRjaGVkU3RyaW5nID09PSByZXNbaW5kZXggLSAxXS5tYXRjaGVkU3RyaW5nKVxuICAgICAgICAgICAgJiYgKHJlc3guY2F0ZWdvcnkgPT09IHJlc1tpbmRleCAtIDFdLmNhdGVnb3J5KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJcXG4gZGVsdGEgZm9yIFwiICsgZGVsdGEgKyBcIiAgXCIgKyByZXN4Ll9yYW5raW5nKTtcbiAgICAgICAgaWYgKHJlc3gubGV2ZW5tYXRjaCAmJiAoZGVsdGEgPiAxLjAzKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiXFxuZmlsdGVyZWQgXCIgKyByLmxlbmd0aCArIFwiL1wiICsgcmVzLmxlbmd0aCArIEpTT04uc3RyaW5naWZ5KHIpKTtcbiAgICB9XG4gICAgcmV0dXJuIHI7XG59XG5leHBvcnRzLnBvc3RGaWx0ZXIgPSBwb3N0RmlsdGVyO1xuZnVuY3Rpb24gcG9zdEZpbHRlcldpdGhPZmZzZXQocmVzKSB7XG4gICAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XG4gICAgdmFyIGJlc3RSYW5rID0gMDtcbiAgICAvL2NvbnNvbGUubG9nKFwiXFxucGlsdGVyZWQgXCIgKyBKU09OLnN0cmluZ2lmeShyZXMpKTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcIiBwcmVGaWx0ZXIgOiBcXG5cIiArIHJlcy5tYXAoZnVuY3Rpb24gKHdvcmQpIHtcbiAgICAgICAgICAgIHJldHVybiBcIiBcIiArIHdvcmQuX3JhbmtpbmcgKyBcIiAgPT4gXFxcIlwiICsgd29yZC5jYXRlZ29yeSArIFwiXFxcIiBcIiArIHdvcmQubWF0Y2hlZFN0cmluZyArIFwiIFwiO1xuICAgICAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgICB9XG4gICAgdmFyIHIgPSByZXMuZmlsdGVyKGZ1bmN0aW9uIChyZXN4LCBpbmRleCkge1xuICAgICAgICBpZiAoaW5kZXggPT09IDApIHtcbiAgICAgICAgICAgIGJlc3RSYW5rID0gcmVzeC5fcmFua2luZztcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vIDEtMC45ID0gMC4xXG4gICAgICAgIC8vIDEtIDAuOTMgPSAwLjdcbiAgICAgICAgLy8gMS83XG4gICAgICAgIHZhciBkZWx0YSA9IGJlc3RSYW5rIC8gcmVzeC5fcmFua2luZztcbiAgICAgICAgaWYgKCEocmVzeC5ydWxlICYmIHJlc3gucnVsZS5yYW5nZSlcbiAgICAgICAgICAgICYmICEocmVzW2luZGV4IC0gMV0ucnVsZSAmJiByZXNbaW5kZXggLSAxXS5ydWxlLnJhbmdlKVxuICAgICAgICAgICAgJiYgKHJlc3gubWF0Y2hlZFN0cmluZyA9PT0gcmVzW2luZGV4IC0gMV0ubWF0Y2hlZFN0cmluZylcbiAgICAgICAgICAgICYmIChyZXN4LmNhdGVnb3J5ID09PSByZXNbaW5kZXggLSAxXS5jYXRlZ29yeSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICAvL2NvbnNvbGUubG9nKFwiXFxuIGRlbHRhIGZvciBcIiArIGRlbHRhICsgXCIgIFwiICsgcmVzeC5fcmFua2luZyk7XG4gICAgICAgIGlmIChyZXN4LmxldmVubWF0Y2ggJiYgKGRlbHRhID4gMS4wMykpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcIlxcbmZpbHRlcmVkIFwiICsgci5sZW5ndGggKyBcIi9cIiArIHJlcy5sZW5ndGggKyBKU09OLnN0cmluZ2lmeShyKSk7XG4gICAgfVxuICAgIHJldHVybiByO1xufVxuZXhwb3J0cy5wb3N0RmlsdGVyV2l0aE9mZnNldCA9IHBvc3RGaWx0ZXJXaXRoT2Zmc2V0O1xuZnVuY3Rpb24gY2F0ZWdvcml6ZVN0cmluZzIod29yZCwgZXhhY3QsIHJ1bGVzLCBjbnRSZWMpIHtcbiAgICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXG4gICAgaWYgKGRlYnVnbG9nTS5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nTShcInJ1bGVzIDogXCIgKyBKU09OLnN0cmluZ2lmeShydWxlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHZhciBsY1N0cmluZyA9IHdvcmQudG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgaWYgKGV4YWN0KSB7XG4gICAgICAgIHZhciByID0gcnVsZXMud29yZE1hcFtsY1N0cmluZ107XG4gICAgICAgIGlmIChyKSB7XG4gICAgICAgICAgICByLnJ1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHdvcmQsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcnVsZXMubm9uV29yZFJ1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgICAgICBjaGVja09uZVJ1bGUod29yZCwgbGNTdHJpbmcsIGV4YWN0LCByZXMsIG9SdWxlLCBjbnRSZWMpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBkZWJ1Z2xvZyhcImNhdGVnb3JpemUgbm9uIGV4YWN0XCIgKyB3b3JkICsgXCIgeHggIFwiICsgcnVsZXMuYWxsUnVsZXMubGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIHBvc3RGaWx0ZXIoY2F0ZWdvcml6ZVN0cmluZyh3b3JkLCBleGFjdCwgcnVsZXMuYWxsUnVsZXMsIGNudFJlYykpO1xuICAgIH1cbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZVN0cmluZzIgPSBjYXRlZ29yaXplU3RyaW5nMjtcbmZ1bmN0aW9uIGNhdGVnb3JpemVXb3JkSW50ZXJuYWxXaXRoT2Zmc2V0cyh3b3JkLCBsY3dvcmQsIGV4YWN0LCBydWxlcywgY250UmVjKSB7XG4gICAgZGVidWdsb2dNKFwiY2F0ZWdvcml6ZSBcIiArIGxjd29yZCArIFwiIHdpdGggb2Zmc2V0ISEhISEhISEhISEhISEhISFcIiArIGV4YWN0KTtcbiAgICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXG4gICAgaWYgKGRlYnVnbG9nTS5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nTShcInJ1bGVzIDogXCIgKyBKU09OLnN0cmluZ2lmeShydWxlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHZhciByZXMgPSBbXTtcbiAgICBpZiAoZXhhY3QpIHtcbiAgICAgICAgdmFyIHIgPSBydWxlcy53b3JkTWFwW2xjd29yZF07XG4gICAgICAgIGlmIChyKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZ00oXCIgLi4uLnB1c2hpbmcgbiBydWxlcyBleGFjdCBmb3IgXCIgKyBsY3dvcmQgKyBcIjpcIiArIHIucnVsZXMubGVuZ3RoKTtcbiAgICAgICAgICAgIGRlYnVnbG9nTShyLnJ1bGVzLm1hcChmdW5jdGlvbiAociwgaW5kZXgpIHsgcmV0dXJuICcnICsgaW5kZXggKyAnICcgKyBKU09OLnN0cmluZ2lmeShyKTsgfSkuam9pbihcIlxcblwiKSk7XG4gICAgICAgICAgICByLnJ1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHdvcmQsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgcnVsZTogb1J1bGUsXG4gICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJ1bGVzLm5vbldvcmRSdWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChvUnVsZSkge1xuICAgICAgICAgICAgY2hlY2tPbmVSdWxlV2l0aE9mZnNldCh3b3JkLCBsY3dvcmQsIGV4YWN0LCByZXMsIG9SdWxlLCBjbnRSZWMpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmVzID0gcG9zdEZpbHRlcldpdGhPZmZzZXQocmVzKTtcbiAgICAgICAgZGVidWdsb2coXCJoZXJlIHJlc3VsdHMgZm9yXCIgKyB3b3JkICsgXCIgcmVzIFwiICsgcmVzLmxlbmd0aCk7XG4gICAgICAgIGRlYnVnbG9nTShcImhlcmUgcmVzdWx0cyBmb3JcIiArIHdvcmQgKyBcIiByZXMgXCIgKyByZXMubGVuZ3RoKTtcbiAgICAgICAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBkZWJ1Z2xvZyhcImNhdGVnb3JpemUgbm9uIGV4YWN0XCIgKyB3b3JkICsgXCIgeHggIFwiICsgcnVsZXMuYWxsUnVsZXMubGVuZ3RoKTtcbiAgICAgICAgdmFyIHJyID0gY2F0ZWdvcml6ZVNpbmdsZVdvcmRXaXRoT2Zmc2V0KHdvcmQsIGxjd29yZCwgZXhhY3QsIHJ1bGVzLmFsbFJ1bGVzLCBjbnRSZWMpO1xuICAgICAgICAvL2RlYnVsb2dNKFwiZnV6enkgcmVzIFwiICsgSlNPTi5zdHJpbmdpZnkocnIpKTtcbiAgICAgICAgcmV0dXJuIHBvc3RGaWx0ZXJXaXRoT2Zmc2V0KHJyKTtcbiAgICB9XG59XG5leHBvcnRzLmNhdGVnb3JpemVXb3JkSW50ZXJuYWxXaXRoT2Zmc2V0cyA9IGNhdGVnb3JpemVXb3JkSW50ZXJuYWxXaXRoT2Zmc2V0cztcbi8qKlxuICpcbiAqIE9wdGlvbnMgbWF5IGJlIHtcbiAqIG1hdGNob3RoZXJzIDogdHJ1ZSwgID0+IG9ubHkgcnVsZXMgd2hlcmUgYWxsIG90aGVycyBtYXRjaCBhcmUgY29uc2lkZXJlZFxuICogYXVnbWVudCA6IHRydWUsXG4gKiBvdmVycmlkZSA6IHRydWUgfSAgPT5cbiAqXG4gKi9cbmZ1bmN0aW9uIG1hdGNoV29yZChvUnVsZSwgY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChjb250ZXh0W29SdWxlLmtleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgczIgPSBvUnVsZS53b3JkLnRvTG93ZXJDYXNlKCk7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCwgb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xuICAgICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgYyA9IGNhbGNEaXN0YW5jZShzMiwgczEpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiIHMxIDw+IHMyIFwiICsgczEgKyBcIjw+XCIgKyBzMiArIFwiICA9PjogXCIgKyBjKTtcbiAgICB9XG4gICAgaWYgKGMgPiAwLjgwKSB7XG4gICAgICAgIHZhciByZXMgPSBBbnlPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKTtcbiAgICAgICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIGNvbnRleHQpO1xuICAgICAgICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xuICAgICAgICAgICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGZvcmNlIGtleSBwcm9wZXJ0eVxuICAgICAgICAvLyBjb25zb2xlLmxvZygnIG9iamVjdGNhdGVnb3J5JywgcmVzWydzeXN0ZW1PYmplY3RDYXRlZ29yeSddKTtcbiAgICAgICAgcmVzW29SdWxlLmtleV0gPSBvUnVsZS5mb2xsb3dzW29SdWxlLmtleV0gfHwgcmVzW29SdWxlLmtleV07XG4gICAgICAgIHJlcy5fd2VpZ2h0ID0gQW55T2JqZWN0LmFzc2lnbih7fSwgcmVzLl93ZWlnaHQpO1xuICAgICAgICByZXMuX3dlaWdodFtvUnVsZS5rZXldID0gYztcbiAgICAgICAgT2JqZWN0LmZyZWV6ZShyZXMpO1xuICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgZGVidWdsb2coJ0ZvdW5kIG9uZScgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5leHBvcnRzLm1hdGNoV29yZCA9IG1hdGNoV29yZDtcbmZ1bmN0aW9uIGV4dHJhY3RBcmdzTWFwKG1hdGNoLCBhcmdzTWFwKSB7XG4gICAgdmFyIHJlcyA9IHt9O1xuICAgIGlmICghYXJnc01hcCkge1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cbiAgICBPYmplY3Qua2V5cyhhcmdzTWFwKS5mb3JFYWNoKGZ1bmN0aW9uIChpS2V5KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IG1hdGNoW2lLZXldO1xuICAgICAgICB2YXIga2V5ID0gYXJnc01hcFtpS2V5XTtcbiAgICAgICAgaWYgKCh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpICYmIHZhbHVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJlc1trZXldID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5leHRyYWN0QXJnc01hcCA9IGV4dHJhY3RBcmdzTWFwO1xuZXhwb3J0cy5SYW5rV29yZCA9IHtcbiAgICBoYXNBYm92ZTogZnVuY3Rpb24gKGxzdCwgYm9yZGVyKSB7XG4gICAgICAgIHJldHVybiAhbHN0LmV2ZXJ5KGZ1bmN0aW9uIChvTWVtYmVyKSB7XG4gICAgICAgICAgICByZXR1cm4gKG9NZW1iZXIuX3JhbmtpbmcgPCBib3JkZXIpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIHRha2VGaXJzdE46IGZ1bmN0aW9uIChsc3QsIG4pIHtcbiAgICAgICAgdmFyIGxhc3RSYW5raW5nID0gMS4wO1xuICAgICAgICB2YXIgY250UmFuZ2VkID0gMDtcbiAgICAgICAgcmV0dXJuIGxzdC5maWx0ZXIoZnVuY3Rpb24gKG9NZW1iZXIsIGlJbmRleCkge1xuICAgICAgICAgICAgdmFyIGlzUmFuZ2VkID0gISEob01lbWJlcltcInJ1bGVcIl0gJiYgb01lbWJlcltcInJ1bGVcIl0ucmFuZ2UpO1xuICAgICAgICAgICAgaWYgKGlzUmFuZ2VkKSB7XG4gICAgICAgICAgICAgICAgY250UmFuZ2VkICs9IDE7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoKChpSW5kZXggLSBjbnRSYW5nZWQpIDwgbikgfHwgKG9NZW1iZXIuX3JhbmtpbmcgPT09IGxhc3RSYW5raW5nKSkge1xuICAgICAgICAgICAgICAgIGxhc3RSYW5raW5nID0gb01lbWJlci5fcmFua2luZztcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICB0YWtlQWJvdmU6IGZ1bmN0aW9uIChsc3QsIGJvcmRlcikge1xuICAgICAgICByZXR1cm4gbHN0LmZpbHRlcihmdW5jdGlvbiAob01lbWJlcikge1xuICAgICAgICAgICAgcmV0dXJuIChvTWVtYmVyLl9yYW5raW5nID49IGJvcmRlcik7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG4vKlxudmFyIGV4YWN0TGVuID0gMDtcbnZhciBmdXp6eUxlbiA9IDA7XG52YXIgZnV6enlDbnQgPSAwO1xudmFyIGV4YWN0Q250ID0gMDtcbnZhciB0b3RhbENudCA9IDA7XG52YXIgdG90YWxMZW4gPSAwO1xudmFyIHJldGFpbmVkQ250ID0gMDtcblxuZXhwb3J0IGZ1bmN0aW9uIHJlc2V0Q250KCkge1xuICBleGFjdExlbiA9IDA7XG4gIGZ1enp5TGVuID0gMDtcbiAgZnV6enlDbnQgPSAwO1xuICBleGFjdENudCA9IDA7XG4gIHRvdGFsQ250ID0gMDtcbiAgdG90YWxMZW4gPSAwO1xuICByZXRhaW5lZENudCA9IDA7XG59XG4qL1xuZnVuY3Rpb24gY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZihzV29yZEdyb3VwLCBzcGxpdFJ1bGVzLCBjbnRSZWMpIHtcbiAgICB2YXIgc2Vlbkl0ID0gY2F0ZWdvcml6ZVN0cmluZzIoc1dvcmRHcm91cCwgdHJ1ZSwgc3BsaXRSdWxlcywgY250UmVjKTtcbiAgICAvL3RvdGFsQ250ICs9IDE7XG4gICAgLy8gZXhhY3RMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcbiAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Q2F0RXhhY3QnLCAxKTtcbiAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Q2F0RXhhY3RSZXMnLCBzZWVuSXQubGVuZ3RoKTtcbiAgICBpZiAoZXhwb3J0cy5SYW5rV29yZC5oYXNBYm92ZShzZWVuSXQsIDAuOCkpIHtcbiAgICAgICAgaWYgKGNudFJlYykge1xuICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYywgJ2V4YWN0UHJpb3JUYWtlJywgc2Vlbkl0Lmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgICAgc2Vlbkl0ID0gZXhwb3J0cy5SYW5rV29yZC50YWtlQWJvdmUoc2Vlbkl0LCAwLjgpO1xuICAgICAgICBpZiAoY250UmVjKSB7XG4gICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLCAnZXhhY3RBZnRlclRha2UnLCBzZWVuSXQubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc2Vlbkl0ID0gY2F0ZWdvcml6ZVN0cmluZzIoc1dvcmRHcm91cCwgZmFsc2UsIHNwbGl0UnVsZXMsIGNudFJlYyk7XG4gICAgICAgIGFkZENudFJlYyhjbnRSZWMsICdjbnROb25FeGFjdCcsIDEpO1xuICAgICAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Tm9uRXhhY3RSZXMnLCBzZWVuSXQubGVuZ3RoKTtcbiAgICB9XG4gICAgLy8gdG90YWxMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcbiAgICBzZWVuSXQgPSBleHBvcnRzLlJhbmtXb3JkLnRha2VGaXJzdE4oc2Vlbkl0LCBBbGdvbC5Ub3BfTl9Xb3JkQ2F0ZWdvcml6YXRpb25zKTtcbiAgICAvLyByZXRhaW5lZENudCArPSBzZWVuSXQubGVuZ3RoO1xuICAgIHJldHVybiBzZWVuSXQ7XG59XG5leHBvcnRzLmNhdGVnb3JpemVXb3JkV2l0aFJhbmtDdXRvZmYgPSBjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmO1xuLyogaWYgd2UgaGF2ZSBhICBcIlJ1biBsaWtlIHRoZSBXaW5kXCJcbiAgYW4gYSB1c2VyIHR5cGUgZnVuIGxpa2UgIGEgUmluZCAsIGFuZCBSaW5kIGlzIGFuIGV4YWN0IG1hdGNoLFxuICB3ZSB3aWxsIG5vdCBzdGFydCBsb29raW5nIGZvciB0aGUgbG9uZyBzZW50ZW5jZVxuXG4gIHRoaXMgaXMgdG8gYmUgZml4ZWQgYnkgXCJzcHJlYWRpbmdcIiB0aGUgcmFuZ2UgaW5kaWNhdGlvbiBhY2Nyb3NzIHZlcnkgc2ltaWxhciB3b3JkcyBpbiB0aGUgdmluY2luaXR5IG9mIHRoZVxuICB0YXJnZXQgd29yZHNcbiovXG5mdW5jdGlvbiBjYXRlZ29yaXplV29yZFdpdGhPZmZzZXRXaXRoUmFua0N1dG9mZihzV29yZEdyb3VwLCBzcGxpdFJ1bGVzLCBjbnRSZWMpIHtcbiAgICB2YXIgc1dvcmRHcm91cExDID0gc1dvcmRHcm91cC50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciBzZWVuSXQgPSBjYXRlZ29yaXplV29yZEludGVybmFsV2l0aE9mZnNldHMoc1dvcmRHcm91cCwgc1dvcmRHcm91cExDLCB0cnVlLCBzcGxpdFJ1bGVzLCBjbnRSZWMpO1xuICAgIC8vY29uc29sZS5sb2coXCJTRUVOSVRcIiArIEpTT04uc3RyaW5naWZ5KHNlZW5JdCkpO1xuICAgIC8vdG90YWxDbnQgKz0gMTtcbiAgICAvLyBleGFjdExlbiArPSBzZWVuSXQubGVuZ3RoO1xuICAgIC8vY29uc29sZS5sb2coXCJmaXJzdCBydW4gZXhhY3QgXCIgKyBKU09OLnN0cmluZ2lmeShzZWVuSXQpKTtcbiAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Q2F0RXhhY3QnLCAxKTtcbiAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Q2F0RXhhY3RSZXMnLCBzZWVuSXQubGVuZ3RoKTtcbiAgICBpZiAoZXhwb3J0cy5SYW5rV29yZC5oYXNBYm92ZShzZWVuSXQsIDAuOCkpIHtcbiAgICAgICAgaWYgKGNudFJlYykge1xuICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYywgJ2V4YWN0UHJpb3JUYWtlJywgc2Vlbkl0Lmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgICAgc2Vlbkl0ID0gZXhwb3J0cy5SYW5rV29yZC50YWtlQWJvdmUoc2Vlbkl0LCAwLjgpO1xuICAgICAgICBpZiAoY250UmVjKSB7XG4gICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLCAnZXhhY3RBZnRlclRha2UnLCBzZWVuSXQubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc2Vlbkl0ID0gY2F0ZWdvcml6ZVdvcmRJbnRlcm5hbFdpdGhPZmZzZXRzKHNXb3JkR3JvdXAsIHNXb3JkR3JvdXBMQywgZmFsc2UsIHNwbGl0UnVsZXMsIGNudFJlYyk7XG4gICAgICAgIGFkZENudFJlYyhjbnRSZWMsICdjbnROb25FeGFjdCcsIDEpO1xuICAgICAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Tm9uRXhhY3RSZXMnLCBzZWVuSXQubGVuZ3RoKTtcbiAgICB9XG4gICAgLy8gdG90YWxMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcbiAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKHNlZW5JdC5sZW5ndGggKyBcIiB3aXRoIFwiICsgc2Vlbkl0LnJlZHVjZShmdW5jdGlvbiAocHJldiwgb2JqKSB7IHJldHVybiBwcmV2ICsgKG9iai5ydWxlLnJhbmdlID8gMSA6IDApOyB9LCAwKSArIFwiIHJhbmdlZCAhXCIpIDogJy0nKTtcbiAgICAvLyAgdmFyIGNudFJhbmdlZCA9IHNlZW5JdC5yZWR1Y2UoIChwcmV2LG9iaikgPT4gcHJldiArIChvYmoucnVsZS5yYW5nZSA/IDEgOiAwKSwwKTtcbiAgICAvLyAgY29uc29sZS5sb2coYCoqKioqKioqKioqICR7c2Vlbkl0Lmxlbmd0aH0gd2l0aCAke2NudFJhbmdlZH0gcmFuZ2VkICFgKTtcbiAgICBzZWVuSXQgPSBleHBvcnRzLlJhbmtXb3JkLnRha2VGaXJzdE4oc2Vlbkl0LCBBbGdvbC5Ub3BfTl9Xb3JkQ2F0ZWdvcml6YXRpb25zKTtcbiAgICAvLyByZXRhaW5lZENudCArPSBzZWVuSXQubGVuZ3RoO1xuICAgIC8vY29uc29sZS5sb2coXCJmaW5hbCByZXMgb2YgY2F0ZWdvcml6ZVdvcmRXaXRoT2Zmc2V0V2l0aFJhbmtDdXRvZmZcIiArIEpTT04uc3RyaW5naWZ5KHNlZW5JdCkpO1xuICAgIHJldHVybiBzZWVuSXQ7XG59XG5leHBvcnRzLmNhdGVnb3JpemVXb3JkV2l0aE9mZnNldFdpdGhSYW5rQ3V0b2ZmID0gY2F0ZWdvcml6ZVdvcmRXaXRoT2Zmc2V0V2l0aFJhbmtDdXRvZmY7XG5mdW5jdGlvbiBjYXRlZ29yaXplV29yZFdpdGhPZmZzZXRXaXRoUmFua0N1dG9mZlNpbmdsZSh3b3JkLCBydWxlKSB7XG4gICAgdmFyIGxjd29yZCA9IHdvcmQudG9Mb3dlckNhc2UoKTtcbiAgICBpZiAobGN3b3JkID09PSBydWxlLmxvd2VyY2FzZXdvcmQpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN0cmluZzogd29yZCxcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IHJ1bGUubWF0Y2hlZFN0cmluZyxcbiAgICAgICAgICAgIGNhdGVnb3J5OiBydWxlLmNhdGVnb3J5LFxuICAgICAgICAgICAgcnVsZTogcnVsZSxcbiAgICAgICAgICAgIF9yYW5raW5nOiBydWxlLl9yYW5raW5nIHx8IDEuMFxuICAgICAgICB9O1xuICAgIH1cbiAgICB2YXIgcmVzID0gW107XG4gICAgY2hlY2tPbmVSdWxlV2l0aE9mZnNldCh3b3JkLCBsY3dvcmQsIGZhbHNlLCByZXMsIHJ1bGUpO1xuICAgIGRlYnVnbG9nKFwiY2F0V1dPV1JDUyBcIiArIGxjd29yZCk7XG4gICAgaWYgKHJlcy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHJlc1swXTtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZVdvcmRXaXRoT2Zmc2V0V2l0aFJhbmtDdXRvZmZTaW5nbGUgPSBjYXRlZ29yaXplV29yZFdpdGhPZmZzZXRXaXRoUmFua0N1dG9mZlNpbmdsZTtcbi8qXG5leHBvcnQgZnVuY3Rpb24gZHVtcENudCgpIHtcbiAgY29uc29sZS5sb2coYFxuZXhhY3RMZW4gPSAke2V4YWN0TGVufTtcbmV4YWN0Q250ID0gJHtleGFjdENudH07XG5mdXp6eUxlbiA9ICR7ZnV6enlMZW59O1xuZnV6enlDbnQgPSAke2Z1enp5Q250fTtcbnRvdGFsQ250ID0gJHt0b3RhbENudH07XG50b3RhbExlbiA9ICR7dG90YWxMZW59O1xucmV0YWluZWRMZW4gPSAke3JldGFpbmVkQ250fTtcbiAgYCk7XG59XG4qL1xuLypcbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWRTZW50ZW5jZShvU2VudGVuY2U6IElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11bXSk6IGJvb2xlYW4ge1xuICByZXR1cm4gb1NlbnRlbmNlLmV2ZXJ5KGZ1bmN0aW9uIChvV29yZEdyb3VwKSB7XG4gICAgcmV0dXJuIChvV29yZEdyb3VwLmxlbmd0aCA+IDApO1xuICB9KTtcbn1cblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWQoYXJyOiBJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdW11bXSk6IElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11bXVtdIHtcbiAgcmV0dXJuIGFyci5maWx0ZXIoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgIHJldHVybiBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWRTZW50ZW5jZShvU2VudGVuY2UpO1xuICB9KTtcbn1cbiovXG5mdW5jdGlvbiBjYXRlZ29yaXplQVdvcmQoc1dvcmRHcm91cCwgcnVsZXMsIHNlbnRlbmNlLCB3b3JkcywgY250UmVjKSB7XG4gICAgdmFyIHNlZW5JdCA9IHdvcmRzW3NXb3JkR3JvdXBdO1xuICAgIGlmIChzZWVuSXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBzZWVuSXQgPSBjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmKHNXb3JkR3JvdXAsIHJ1bGVzLCBjbnRSZWMpO1xuICAgICAgICB1dGlscy5kZWVwRnJlZXplKHNlZW5JdCk7XG4gICAgICAgIHdvcmRzW3NXb3JkR3JvdXBdID0gc2Vlbkl0O1xuICAgIH1cbiAgICBpZiAoIXNlZW5JdCB8fCBzZWVuSXQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGxvZ2dlcihcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIFxcXCJcIiArIHNXb3JkR3JvdXAgKyBcIlxcXCIgaW4gc2VudGVuY2UgXFxcIlwiXG4gICAgICAgICAgICArIHNlbnRlbmNlICsgXCJcXFwiXCIpO1xuICAgICAgICBpZiAoc1dvcmRHcm91cC5pbmRleE9mKFwiIFwiKSA8PSAwKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZyhcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIHByaW1pdGl2ZSAoISlcIiArIHNXb3JkR3JvdXApO1xuICAgICAgICB9XG4gICAgICAgIGRlYnVnbG9nKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgXCIgKyBzV29yZEdyb3VwKTtcbiAgICAgICAgaWYgKCFzZWVuSXQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGluZyBlbXRweSBsaXN0LCBub3QgdW5kZWZpbmVkIGZvciBcXFwiXCIgKyBzV29yZEdyb3VwICsgXCJcXFwiXCIpO1xuICAgICAgICB9XG4gICAgICAgIHdvcmRzW3NXb3JkR3JvdXBdID0gW107XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgcmV0dXJuIHV0aWxzLmNsb25lRGVlcChzZWVuSXQpO1xufVxuZXhwb3J0cy5jYXRlZ29yaXplQVdvcmQgPSBjYXRlZ29yaXplQVdvcmQ7XG4vKipcbiAqIEdpdmVuIGEgIHN0cmluZywgYnJlYWsgaXQgZG93biBpbnRvIGNvbXBvbmVudHMsXG4gKiBbWydBJywgJ0InXSwgWydBIEInXV1cbiAqXG4gKiB0aGVuIGNhdGVnb3JpemVXb3Jkc1xuICogcmV0dXJuaW5nXG4gKlxuICogWyBbWyB7IGNhdGVnb3J5OiAnc3lzdGVtSWQnLCB3b3JkIDogJ0EnfSxcbiAqICAgICAgeyBjYXRlZ29yeTogJ290aGVydGhpbmcnLCB3b3JkIDogJ0EnfVxuICogICAgXSxcbiAqICAgIC8vIHJlc3VsdCBvZiBCXG4gKiAgICBbIHsgY2F0ZWdvcnk6ICdzeXN0ZW1JZCcsIHdvcmQgOiAnQid9LFxuICogICAgICB7IGNhdGVnb3J5OiAnb3RoZXJ0aGluZycsIHdvcmQgOiAnQSd9XG4gKiAgICAgIHsgY2F0ZWdvcnk6ICdhbm90aGVydHJ5cCcsIHdvcmQgOiAnQid9XG4gKiAgICBdXG4gKiAgIF0sXG4gKiBdXV1cbiAqXG4gKlxuICpcbiAqL1xuZnVuY3Rpb24gYW5hbHl6ZVN0cmluZyhzU3RyaW5nLCBydWxlcywgd29yZHMpIHtcbiAgICB2YXIgY250ID0gMDtcbiAgICB2YXIgZmFjID0gMTtcbiAgICB2YXIgdSA9IGJyZWFrZG93bi5icmVha2Rvd25TdHJpbmcoc1N0cmluZywgQWxnb2wuTWF4U3BhY2VzUGVyQ29tYmluZWRXb3JkKTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcImhlcmUgYnJlYWtkb3duXCIgKyBKU09OLnN0cmluZ2lmeSh1KSk7XG4gICAgfVxuICAgIC8vY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkodSkpO1xuICAgIHdvcmRzID0gd29yZHMgfHwge307XG4gICAgZGVidWdwZXJmKCd0aGlzIG1hbnkga25vd24gd29yZHM6ICcgKyBPYmplY3Qua2V5cyh3b3JkcykubGVuZ3RoKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgdmFyIGNudFJlYyA9IHt9O1xuICAgIHUuZm9yRWFjaChmdW5jdGlvbiAoYUJyZWFrRG93blNlbnRlbmNlKSB7XG4gICAgICAgIHZhciBjYXRlZ29yaXplZFNlbnRlbmNlID0gW107XG4gICAgICAgIHZhciBpc1ZhbGlkID0gYUJyZWFrRG93blNlbnRlbmNlLmV2ZXJ5KGZ1bmN0aW9uIChzV29yZEdyb3VwLCBpbmRleCkge1xuICAgICAgICAgICAgdmFyIHNlZW5JdCA9IGNhdGVnb3JpemVBV29yZChzV29yZEdyb3VwLCBydWxlcywgc1N0cmluZywgd29yZHMsIGNudFJlYyk7XG4gICAgICAgICAgICBpZiAoc2Vlbkl0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGVnb3JpemVkU2VudGVuY2VbaW5kZXhdID0gc2Vlbkl0O1xuICAgICAgICAgICAgY250ID0gY250ICsgc2Vlbkl0Lmxlbmd0aDtcbiAgICAgICAgICAgIGZhYyA9IGZhYyAqIHNlZW5JdC5sZW5ndGg7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChpc1ZhbGlkKSB7XG4gICAgICAgICAgICByZXMucHVzaChjYXRlZ29yaXplZFNlbnRlbmNlKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGRlYnVnbG9nKFwiIHNlbnRlbmNlcyBcIiArIHUubGVuZ3RoICsgXCIgbWF0Y2hlcyBcIiArIGNudCArIFwiIGZhYzogXCIgKyBmYWMpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkICYmIHUubGVuZ3RoKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiZmlyc3QgbWF0Y2ggXCIgKyBKU09OLnN0cmluZ2lmeSh1LCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgZGVidWdwZXJmKFwiIHNlbnRlbmNlcyBcIiArIHUubGVuZ3RoICsgXCIgLyBcIiArIHJlcy5sZW5ndGggKyBcIiBtYXRjaGVzIFwiICsgY250ICsgXCIgZmFjOiBcIiArIGZhYyArIFwiIHJlYyA6IFwiICsgSlNPTi5zdHJpbmdpZnkoY250UmVjLCB1bmRlZmluZWQsIDIpKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5hbmFseXplU3RyaW5nID0gYW5hbHl6ZVN0cmluZztcbmZ1bmN0aW9uIGNhdGVnb3JpemVBV29yZFdpdGhPZmZzZXRzKHNXb3JkR3JvdXAsIHJ1bGVzLCBzZW50ZW5jZSwgd29yZHMsIGNudFJlYykge1xuICAgIHZhciBzZWVuSXQgPSB3b3Jkc1tzV29yZEdyb3VwXTtcbiAgICBpZiAoc2Vlbkl0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgc2Vlbkl0ID0gY2F0ZWdvcml6ZVdvcmRXaXRoT2Zmc2V0V2l0aFJhbmtDdXRvZmYoc1dvcmRHcm91cCwgcnVsZXMsIGNudFJlYyk7XG4gICAgICAgIHV0aWxzLmRlZXBGcmVlemUoc2Vlbkl0KTtcbiAgICAgICAgd29yZHNbc1dvcmRHcm91cF0gPSBzZWVuSXQ7XG4gICAgfVxuICAgIGlmICghc2Vlbkl0IHx8IHNlZW5JdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgbG9nZ2VyKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgXFxcIlwiICsgc1dvcmRHcm91cCArIFwiXFxcIiBpbiBzZW50ZW5jZSBcXFwiXCJcbiAgICAgICAgICAgICsgc2VudGVuY2UgKyBcIlxcXCJcIik7XG4gICAgICAgIGlmIChzV29yZEdyb3VwLmluZGV4T2YoXCIgXCIpIDw9IDApIHtcbiAgICAgICAgICAgIGRlYnVnbG9nKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgcHJpbWl0aXZlICghKVwiICsgc1dvcmRHcm91cCk7XG4gICAgICAgIH1cbiAgICAgICAgZGVidWdsb2coXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBcIiArIHNXb3JkR3JvdXApO1xuICAgICAgICBpZiAoIXNlZW5JdCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0aW5nIGVtdHB5IGxpc3QsIG5vdCB1bmRlZmluZWQgZm9yIFxcXCJcIiArIHNXb3JkR3JvdXAgKyBcIlxcXCJcIik7XG4gICAgICAgIH1cbiAgICAgICAgd29yZHNbc1dvcmRHcm91cF0gPSBbXTtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICByZXR1cm4gdXRpbHMuY2xvbmVEZWVwKHNlZW5JdCk7XG59XG5leHBvcnRzLmNhdGVnb3JpemVBV29yZFdpdGhPZmZzZXRzID0gY2F0ZWdvcml6ZUFXb3JkV2l0aE9mZnNldHM7XG4vKlxuWyBbYSxiXSwgW2MsZF1dXG5cbjAwIGFcbjAxIGJcbjEwIGNcbjExIGRcbjEyIGNcbiovXG52YXIgY2xvbmUgPSB1dGlscy5jbG9uZURlZXA7XG5mdW5jdGlvbiBjb3B5VmVjTWVtYmVycyh1KSB7XG4gICAgdmFyIGkgPSAwO1xuICAgIGZvciAoaSA9IDA7IGkgPCB1Lmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHVbaV0gPSBjbG9uZSh1W2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIHU7XG59XG4vLyB3ZSBjYW4gcmVwbGljYXRlIHRoZSB0YWlsIG9yIHRoZSBoZWFkLFxuLy8gd2UgcmVwbGljYXRlIHRoZSB0YWlsIGFzIGl0IGlzIHNtYWxsZXIuXG4vLyBbYSxiLGMgXVxuZnVuY3Rpb24gZXhwYW5kTWF0Y2hBcnIoZGVlcCkge1xuICAgIHZhciBhID0gW107XG4gICAgdmFyIGxpbmUgPSBbXTtcbiAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gSlNPTi5zdHJpbmdpZnkoZGVlcCkgOiAnLScpO1xuICAgIGRlZXAuZm9yRWFjaChmdW5jdGlvbiAodUJyZWFrRG93bkxpbmUsIGlJbmRleCkge1xuICAgICAgICBsaW5lW2lJbmRleF0gPSBbXTtcbiAgICAgICAgdUJyZWFrRG93bkxpbmUuZm9yRWFjaChmdW5jdGlvbiAoYVdvcmRHcm91cCwgd2dJbmRleCkge1xuICAgICAgICAgICAgbGluZVtpSW5kZXhdW3dnSW5kZXhdID0gW107XG4gICAgICAgICAgICBhV29yZEdyb3VwLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkVmFyaWFudCwgaVdWSW5kZXgpIHtcbiAgICAgICAgICAgICAgICBsaW5lW2lJbmRleF1bd2dJbmRleF1baVdWSW5kZXhdID0gb1dvcmRWYXJpYW50O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyBKU09OLnN0cmluZ2lmeShsaW5lKSA6ICctJyk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIHZhciBudmVjcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZS5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgdmVjcyA9IFtbXV07XG4gICAgICAgIHZhciBudmVjcyA9IFtdO1xuICAgICAgICB2YXIgcnZlYyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBrID0gMDsgayA8IGxpbmVbaV0ubGVuZ3RoOyArK2spIHtcbiAgICAgICAgICAgIC8vdmVjcyBpcyB0aGUgdmVjdG9yIG9mIGFsbCBzbyBmYXIgc2VlbiB2YXJpYW50cyB1cCB0byBrIHdncy5cbiAgICAgICAgICAgIHZhciBuZXh0QmFzZSA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIgbCA9IDA7IGwgPCBsaW5lW2ldW2tdLmxlbmd0aDsgKytsKSB7XG4gICAgICAgICAgICAgICAgLy9kZWJ1Z2xvZyhcInZlY3Mgbm93XCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzKSk7XG4gICAgICAgICAgICAgICAgbnZlY3MgPSBbXTsgLy92ZWNzLnNsaWNlKCk7IC8vIGNvcHkgdGhlIHZlY1tpXSBiYXNlIHZlY3RvcjtcbiAgICAgICAgICAgICAgICAvL2RlYnVnbG9nKFwidmVjcyBjb3BpZWQgbm93XCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIHUgPSAwOyB1IDwgdmVjcy5sZW5ndGg7ICsrdSkge1xuICAgICAgICAgICAgICAgICAgICBudmVjc1t1XSA9IHZlY3NbdV0uc2xpY2UoKTsgLy9cbiAgICAgICAgICAgICAgICAgICAgbnZlY3NbdV0gPSBjb3B5VmVjTWVtYmVycyhudmVjc1t1XSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIGRlYnVnbG9nKFwiY29waWVkIHZlY3NbXCIrIHUrXCJdXCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzW3VdKSk7XG4gICAgICAgICAgICAgICAgICAgIG52ZWNzW3VdLnB1c2goY2xvbmUobGluZVtpXVtrXVtsXSkpOyAvLyBwdXNoIHRoZSBsdGggdmFyaWFudFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyAgIGRlYnVnbG9nKFwiIGF0ICAgICBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiBuZXh0YmFzZSA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpXG4gICAgICAgICAgICAgICAgLy8gICBkZWJ1Z2xvZyhcIiBhcHBlbmQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbnZlY3MgICAgPlwiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKVxuICAgICAgICAgICAgICAgIG5leHRCYXNlID0gbmV4dEJhc2UuY29uY2F0KG52ZWNzKTtcbiAgICAgICAgICAgIH0gLy9jb25zdHJ1XG4gICAgICAgICAgICAvLyAgZGVidWdsb2coXCJub3cgYXQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxuICAgICAgICAgICAgdmVjcyA9IG5leHRCYXNlO1xuICAgICAgICB9XG4gICAgICAgIGRlYnVnbG9nVihkZWJ1Z2xvZ1YuZW5hYmxlZCA/IChcIkFQUEVORElORyBUTyBSRVNcIiArIGkgKyBcIjpcIiArIGwgKyBcIiA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpIDogJy0nKTtcbiAgICAgICAgcmVzID0gcmVzLmNvbmNhdCh2ZWNzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZXhwYW5kTWF0Y2hBcnIgPSBleHBhbmRNYXRjaEFycjtcbi8qKlxuICogQ2FsY3VsYXRlIGEgd2VpZ2h0IGZhY3RvciBmb3IgYSBnaXZlbiBkaXN0YW5jZSBhbmRcbiAqIGNhdGVnb3J5XG4gKiBAcGFyYW0ge2ludGVnZXJ9IGRpc3QgZGlzdGFuY2UgaW4gd29yZHNcbiAqIEBwYXJhbSB7c3RyaW5nfSBjYXRlZ29yeSBjYXRlZ29yeSB0byB1c2VcbiAqIEByZXR1cm5zIHtudW1iZXJ9IGEgZGlzdGFuY2UgZmFjdG9yID49IDFcbiAqICAxLjAgZm9yIG5vIGVmZmVjdFxuICovXG5mdW5jdGlvbiByZWluZm9yY2VEaXN0V2VpZ2h0KGRpc3QsIGNhdGVnb3J5KSB7XG4gICAgdmFyIGFicyA9IE1hdGguYWJzKGRpc3QpO1xuICAgIHJldHVybiAxLjAgKyAoQWxnb2wuYVJlaW5mb3JjZURpc3RXZWlnaHRbYWJzXSB8fCAwKTtcbn1cbmV4cG9ydHMucmVpbmZvcmNlRGlzdFdlaWdodCA9IHJlaW5mb3JjZURpc3RXZWlnaHQ7XG4vKipcbiAqIEdpdmVuIGEgc2VudGVuY2UsIGV4dGFjdCBjYXRlZ29yaWVzXG4gKi9cbmZ1bmN0aW9uIGV4dHJhY3RDYXRlZ29yeU1hcChvU2VudGVuY2UpIHtcbiAgICB2YXIgcmVzID0ge307XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/ICgnZXh0cmFjdENhdGVnb3J5TWFwICcgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpKSA6ICctJyk7XG4gICAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpSW5kZXgpIHtcbiAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBJRk1hdGNoLkNBVF9DQVRFR09SWSkge1xuICAgICAgICAgICAgcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddID0gcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddIHx8IFtdO1xuICAgICAgICAgICAgcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddLnB1c2goeyBwb3M6IGlJbmRleCB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHV0aWxzLmRlZXBGcmVlemUocmVzKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5leHRyYWN0Q2F0ZWdvcnlNYXAgPSBleHRyYWN0Q2F0ZWdvcnlNYXA7XG5mdW5jdGlvbiByZWluRm9yY2VTZW50ZW5jZShvU2VudGVuY2UpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICB2YXIgb0NhdGVnb3J5TWFwID0gZXh0cmFjdENhdGVnb3J5TWFwKG9TZW50ZW5jZSk7XG4gICAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpSW5kZXgpIHtcbiAgICAgICAgdmFyIG0gPSBvQ2F0ZWdvcnlNYXBbb1dvcmQuY2F0ZWdvcnldIHx8IFtdO1xuICAgICAgICBtLmZvckVhY2goZnVuY3Rpb24gKG9Qb3NpdGlvbikge1xuICAgICAgICAgICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgICAgICAgICBvV29yZC5yZWluZm9yY2UgPSBvV29yZC5yZWluZm9yY2UgfHwgMTtcbiAgICAgICAgICAgIHZhciBib29zdCA9IHJlaW5mb3JjZURpc3RXZWlnaHQoaUluZGV4IC0gb1Bvc2l0aW9uLnBvcywgb1dvcmQuY2F0ZWdvcnkpO1xuICAgICAgICAgICAgb1dvcmQucmVpbmZvcmNlICo9IGJvb3N0O1xuICAgICAgICAgICAgb1dvcmQuX3JhbmtpbmcgKj0gYm9vc3Q7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaUluZGV4KSB7XG4gICAgICAgIGlmIChpSW5kZXggPiAwKSB7XG4gICAgICAgICAgICBpZiAob1NlbnRlbmNlW2lJbmRleCAtIDFdLmNhdGVnb3J5ID09PSBcIm1ldGFcIiAmJiAob1dvcmQuY2F0ZWdvcnkgPT09IG9TZW50ZW5jZVtpSW5kZXggLSAxXS5tYXRjaGVkU3RyaW5nKSkge1xuICAgICAgICAgICAgICAgIG9Xb3JkLnJlaW5mb3JjZSA9IG9Xb3JkLnJlaW5mb3JjZSB8fCAxO1xuICAgICAgICAgICAgICAgIHZhciBib29zdCA9IHJlaW5mb3JjZURpc3RXZWlnaHQoMSwgb1dvcmQuY2F0ZWdvcnkpO1xuICAgICAgICAgICAgICAgIG9Xb3JkLnJlaW5mb3JjZSAqPSBib29zdDtcbiAgICAgICAgICAgICAgICBvV29yZC5fcmFua2luZyAqPSBib29zdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBvU2VudGVuY2U7XG59XG5leHBvcnRzLnJlaW5Gb3JjZVNlbnRlbmNlID0gcmVpbkZvcmNlU2VudGVuY2U7XG52YXIgU2VudGVuY2UgPSByZXF1aXJlKFwiLi9zZW50ZW5jZVwiKTtcbmZ1bmN0aW9uIHJlaW5Gb3JjZShhQ2F0ZWdvcml6ZWRBcnJheSkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIGFDYXRlZ29yaXplZEFycmF5LmZvckVhY2goZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICByZWluRm9yY2VTZW50ZW5jZShvU2VudGVuY2UpO1xuICAgIH0pO1xuICAgIGFDYXRlZ29yaXplZEFycmF5LnNvcnQoU2VudGVuY2UuY21wUmFua2luZ1Byb2R1Y3QpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiYWZ0ZXIgcmVpbmZvcmNlXCIgKyBhQ2F0ZWdvcml6ZWRBcnJheS5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICAgIH1cbiAgICByZXR1cm4gYUNhdGVnb3JpemVkQXJyYXk7XG59XG5leHBvcnRzLnJlaW5Gb3JjZSA9IHJlaW5Gb3JjZTtcbi8vLyBiZWxvdyBtYXkgbm8gbG9uZ2VyIGJlIHVzZWRcbmZ1bmN0aW9uIG1hdGNoUmVnRXhwKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBzS2V5ID0gb1J1bGUua2V5O1xuICAgIHZhciBzMSA9IGNvbnRleHRbb1J1bGUua2V5XS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciByZWcgPSBvUnVsZS5yZWdleHA7XG4gICAgdmFyIG0gPSByZWcuZXhlYyhzMSk7XG4gICAgaWYgKGRlYnVnbG9nVi5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nVihcImFwcGx5aW5nIHJlZ2V4cDogXCIgKyBzMSArIFwiIFwiICsgSlNPTi5zdHJpbmdpZnkobSkpO1xuICAgIH1cbiAgICBpZiAoIW0pIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCwgb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KTtcbiAgICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2dWKEpTT04uc3RyaW5naWZ5KGRlbHRhKSk7XG4gICAgICAgIGRlYnVnbG9nVihKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgb0V4dHJhY3RlZENvbnRleHQgPSBleHRyYWN0QXJnc01hcChtLCBvUnVsZS5hcmdzTWFwKTtcbiAgICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2dWKFwiZXh0cmFjdGVkIGFyZ3MgXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZS5hcmdzTWFwKSk7XG4gICAgICAgIGRlYnVnbG9nVihcIm1hdGNoIFwiICsgSlNPTi5zdHJpbmdpZnkobSkpO1xuICAgICAgICBkZWJ1Z2xvZ1YoXCJleHRyYWN0ZWQgYXJncyBcIiArIEpTT04uc3RyaW5naWZ5KG9FeHRyYWN0ZWRDb250ZXh0KSk7XG4gICAgfVxuICAgIHZhciByZXMgPSBBbnlPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKTtcbiAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpO1xuICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcbiAgICBpZiAob0V4dHJhY3RlZENvbnRleHRbc0tleV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXNbc0tleV0gPSBvRXh0cmFjdGVkQ29udGV4dFtzS2V5XTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMub3ZlcnJpZGUpIHtcbiAgICAgICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xuICAgICAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpO1xuICAgIH1cbiAgICBPYmplY3QuZnJlZXplKHJlcyk7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/ICgnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSkgOiAnLScpO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLm1hdGNoUmVnRXhwID0gbWF0Y2hSZWdFeHA7XG5mdW5jdGlvbiBzb3J0QnlXZWlnaHQoc0tleSwgb0NvbnRleHRBLCBvQ29udGV4dEIpIHtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZ1YoJ3NvcnRpbmc6ICcgKyBzS2V5ICsgJ2ludm9rZWQgd2l0aFxcbiAxOicgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEEsIHVuZGVmaW5lZCwgMikgK1xuICAgICAgICAgICAgXCIgdnMgXFxuIDI6XCIgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEIsIHVuZGVmaW5lZCwgMikpO1xuICAgIH1cbiAgICB2YXIgcmFua2luZ0EgPSBwYXJzZUZsb2F0KG9Db250ZXh0QVtcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcbiAgICB2YXIgcmFua2luZ0IgPSBwYXJzZUZsb2F0KG9Db250ZXh0QltcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcbiAgICBpZiAocmFua2luZ0EgIT09IHJhbmtpbmdCKSB7XG4gICAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZyhcIiByYW5raW4gZGVsdGFcIiArIDEwMCAqIChyYW5raW5nQiAtIHJhbmtpbmdBKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIDEwMCAqIChyYW5raW5nQiAtIHJhbmtpbmdBKTtcbiAgICB9XG4gICAgdmFyIHdlaWdodEEgPSBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QVtcIl93ZWlnaHRcIl1bc0tleV0gfHwgMDtcbiAgICB2YXIgd2VpZ2h0QiA9IG9Db250ZXh0QltcIl93ZWlnaHRcIl0gJiYgb0NvbnRleHRCW1wiX3dlaWdodFwiXVtzS2V5XSB8fCAwO1xuICAgIHJldHVybiArKHdlaWdodEIgLSB3ZWlnaHRBKTtcbn1cbmV4cG9ydHMuc29ydEJ5V2VpZ2h0ID0gc29ydEJ5V2VpZ2h0O1xuLy8gV29yZCwgU3lub255bSwgUmVnZXhwIC8gRXh0cmFjdGlvblJ1bGVcbmZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBvUnVsZXMsIG9wdGlvbnMpIHtcbiAgICB2YXIgc0tleSA9IG9SdWxlc1swXS5rZXk7XG4gICAgLy8gY2hlY2sgdGhhdCBydWxlXG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgLy8gY2hlY2sgY29uc2lzdGVuY3lcbiAgICAgICAgb1J1bGVzLmV2ZXJ5KGZ1bmN0aW9uIChpUnVsZSkge1xuICAgICAgICAgICAgaWYgKGlSdWxlLmtleSAhPT0gc0tleSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkluaG9tb2dlbm91cyBrZXlzIGluIHJ1bGVzLCBleHBlY3RlZCBcIiArIHNLZXkgKyBcIiB3YXMgXCIgKyBKU09OLnN0cmluZ2lmeShpUnVsZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBsb29rIGZvciBydWxlcyB3aGljaCBtYXRjaFxuICAgIHZhciByZXMgPSBvUnVsZXMubWFwKGZ1bmN0aW9uIChvUnVsZSkge1xuICAgICAgICAvLyBpcyB0aGlzIHJ1bGUgYXBwbGljYWJsZVxuICAgICAgICBzd2l0Y2ggKG9SdWxlLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgMCAvKiBXT1JEICovOlxuICAgICAgICAgICAgICAgIHJldHVybiBtYXRjaFdvcmQob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgY2FzZSAxIC8qIFJFR0VYUCAqLzpcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2hSZWdFeHAob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSkuZmlsdGVyKGZ1bmN0aW9uIChvcmVzKSB7XG4gICAgICAgIHJldHVybiAhIW9yZXM7XG4gICAgfSkuc29ydChzb3J0QnlXZWlnaHQuYmluZCh0aGlzLCBzS2V5KSk7XG4gICAgLy9kZWJ1Z2xvZyhcImhhc3NvcnRlZFwiICsgSlNPTi5zdHJpbmdpZnkocmVzLHVuZGVmaW5lZCwyKSk7XG4gICAgcmV0dXJuIHJlcztcbiAgICAvLyBPYmplY3Qua2V5cygpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAvLyB9KTtcbn1cbmV4cG9ydHMuYXVnbWVudENvbnRleHQxID0gYXVnbWVudENvbnRleHQxO1xuZnVuY3Rpb24gYXVnbWVudENvbnRleHQoY29udGV4dCwgYVJ1bGVzKSB7XG4gICAgdmFyIG9wdGlvbnMxID0ge1xuICAgICAgICBtYXRjaG90aGVyczogdHJ1ZSxcbiAgICAgICAgb3ZlcnJpZGU6IGZhbHNlXG4gICAgfTtcbiAgICB2YXIgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMxKTtcbiAgICBpZiAoYVJlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdmFyIG9wdGlvbnMyID0ge1xuICAgICAgICAgICAgbWF0Y2hvdGhlcnM6IGZhbHNlLFxuICAgICAgICAgICAgb3ZlcnJpZGU6IHRydWVcbiAgICAgICAgfTtcbiAgICAgICAgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMyKTtcbiAgICB9XG4gICAgcmV0dXJuIGFSZXM7XG59XG5leHBvcnRzLmF1Z21lbnRDb250ZXh0ID0gYXVnbWVudENvbnRleHQ7XG5mdW5jdGlvbiBpbnNlcnRPcmRlcmVkKHJlc3VsdCwgaUluc2VydGVkTWVtYmVyLCBsaW1pdCkge1xuICAgIC8vIFRPRE86IHVzZSBzb21lIHdlaWdodFxuICAgIGlmIChyZXN1bHQubGVuZ3RoIDwgbGltaXQpIHtcbiAgICAgICAgcmVzdWx0LnB1c2goaUluc2VydGVkTWVtYmVyKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cbmV4cG9ydHMuaW5zZXJ0T3JkZXJlZCA9IGluc2VydE9yZGVyZWQ7XG5mdW5jdGlvbiB0YWtlVG9wTihhcnIpIHtcbiAgICB2YXIgdSA9IGFyci5maWx0ZXIoZnVuY3Rpb24gKGlubmVyQXJyKSB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwOyB9KTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgLy8gc2hpZnQgb3V0IHRoZSB0b3Agb25lc1xuICAgIHUgPSB1Lm1hcChmdW5jdGlvbiAoaUFycikge1xuICAgICAgICB2YXIgdG9wID0gaUFyci5zaGlmdCgpO1xuICAgICAgICByZXMgPSBpbnNlcnRPcmRlcmVkKHJlcywgdG9wLCA1KTtcbiAgICAgICAgcmV0dXJuIGlBcnI7XG4gICAgfSkuZmlsdGVyKGZ1bmN0aW9uIChpbm5lckFycikgeyByZXR1cm4gaW5uZXJBcnIubGVuZ3RoID4gMDsgfSk7XG4gICAgLy8gYXMgQXJyYXk8QXJyYXk8SUZNYXRjaC5jb250ZXh0Pj5cbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy50YWtlVG9wTiA9IHRha2VUb3BOO1xudmFyIGlucHV0RmlsdGVyUnVsZXMgPSByZXF1aXJlKFwiLi9pbnB1dEZpbHRlclJ1bGVzXCIpO1xudmFyIHJtO1xuZnVuY3Rpb24gZ2V0Uk1PbmNlKCkge1xuICAgIGlmICghcm0pIHtcbiAgICAgICAgcm0gPSBpbnB1dEZpbHRlclJ1bGVzLmdldFJ1bGVNYXAoKTtcbiAgICB9XG4gICAgcmV0dXJuIHJtO1xufVxuZnVuY3Rpb24gYXBwbHlSdWxlcyhjb250ZXh0KSB7XG4gICAgdmFyIGJlc3ROID0gW2NvbnRleHRdO1xuICAgIGlucHV0RmlsdGVyUnVsZXMub0tleU9yZGVyLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgICAgdmFyIGJlc3ROZXh0ID0gW107XG4gICAgICAgIGJlc3ROLmZvckVhY2goZnVuY3Rpb24gKG9Db250ZXh0KSB7XG4gICAgICAgICAgICBpZiAob0NvbnRleHRbc0tleV0pIHtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZygnKiogYXBwbHlpbmcgcnVsZXMgZm9yICcgKyBzS2V5KTtcbiAgICAgICAgICAgICAgICB2YXIgcmVzID0gYXVnbWVudENvbnRleHQob0NvbnRleHQsIGdldFJNT25jZSgpW3NLZXldIHx8IFtdKTtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKCcqKiByZXN1bHQgZm9yICcgKyBzS2V5ICsgJyA9ICcgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpIDogJy0nKTtcbiAgICAgICAgICAgICAgICBiZXN0TmV4dC5wdXNoKHJlcyB8fCBbXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBydWxlIG5vdCByZWxldmFudFxuICAgICAgICAgICAgICAgIGJlc3ROZXh0LnB1c2goW29Db250ZXh0XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBiZXN0TiA9IHRha2VUb3BOKGJlc3ROZXh0KTtcbiAgICB9KTtcbiAgICByZXR1cm4gYmVzdE47XG59XG5leHBvcnRzLmFwcGx5UnVsZXMgPSBhcHBseVJ1bGVzO1xuZnVuY3Rpb24gYXBwbHlSdWxlc1BpY2tGaXJzdChjb250ZXh0KSB7XG4gICAgdmFyIHIgPSBhcHBseVJ1bGVzKGNvbnRleHQpO1xuICAgIHJldHVybiByICYmIHJbMF07XG59XG5leHBvcnRzLmFwcGx5UnVsZXNQaWNrRmlyc3QgPSBhcHBseVJ1bGVzUGlja0ZpcnN0O1xuLyoqXG4gKiBEZWNpZGUgd2hldGhlciB0byByZXF1ZXJ5IGZvciBhIGNvbnRldFxuICovXG4vL2V4cG9ydCBmdW5jdGlvbiBkZWNpZGVPblJlUXVlcnkoY29udGV4dDogSUZNYXRjaC5jb250ZXh0KTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XG4vLyAgcmV0dXJuIFtdXG4vL31cbiIsIi8qKlxyXG4gKiB0aGUgaW5wdXQgZmlsdGVyIHN0YWdlIHByZXByb2Nlc3NlcyBhIGN1cnJlbnQgY29udGV4dFxyXG4gKlxyXG4gKiBJdCBhKSBjb21iaW5lcyBtdWx0aS1zZWdtZW50IGFyZ3VtZW50cyBpbnRvIG9uZSBjb250ZXh0IG1lbWJlcnNcclxuICogSXQgYikgYXR0ZW1wdHMgdG8gYXVnbWVudCB0aGUgY29udGV4dCBieSBhZGRpdGlvbmFsIHF1YWxpZmljYXRpb25zXHJcbiAqICAgICAgICAgICAoTWlkIHRlcm0gZ2VuZXJhdGluZyBBbHRlcm5hdGl2ZXMsIGUuZy5cclxuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHVuaXQgdGVzdD9cclxuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHNvdXJjZSA/XHJcbiAqICAgICAgICAgICApXHJcbiAqICBTaW1wbGUgcnVsZXMgbGlrZSAgSW50ZW50XHJcbiAqXHJcbiAqXHJcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmlucHV0RmlsdGVyXHJcbiAqIEBmaWxlIGlucHV0RmlsdGVyLnRzXHJcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cclxuICovXHJcbi8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2xpYi9ub2RlLTQuZC50c1wiIC8+XHJcbmltcG9ydCAqIGFzIGRpc3RhbmNlIGZyb20gJy4uL3V0aWxzL2RhbWVyYXVMZXZlbnNodGVpbic7XHJcblxyXG5pbXBvcnQgKiBhcyBMb2dnZXIgZnJvbSAnLi4vdXRpbHMvbG9nZ2VyJ1xyXG5cclxuY29uc3QgbG9nZ2VyID0gTG9nZ2VyLmxvZ2dlcignaW5wdXRGaWx0ZXInKTtcclxuXHJcbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcclxudmFyIGRlYnVncGVyZiA9IGRlYnVnKCdwZXJmJyk7XHJcblxyXG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuLi91dGlscy91dGlscyc7XHJcblxyXG5cclxuaW1wb3J0ICogYXMgQWxnb2wgZnJvbSAnLi9hbGdvbCc7XHJcblxyXG5pbXBvcnQgKiBhcyBJTWF0Y2ggZnJvbSAnLi9pZm1hdGNoJztcclxuXHJcbmltcG9ydCAqIGFzIGJyZWFrZG93biBmcm9tICcuL2JyZWFrZG93bic7XHJcblxyXG5jb25zdCBBbnlPYmplY3QgPSA8YW55Pk9iamVjdDtcclxuXHJcbnZhciBkZWJ1Z2xvZyA9IGRlYnVnKCdpbnB1dEZpbHRlcicpXHJcbnZhciBkZWJ1Z2xvZ1YgPSBkZWJ1ZygnaW5wdXRWRmlsdGVyJylcclxudmFyIGRlYnVnbG9nTSA9IGRlYnVnKCdpbnB1dE1GaWx0ZXInKVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG1vY2tEZWJ1ZyhvKSB7XHJcbiAgZGVidWdsb2cgPSBvO1xyXG4gIGRlYnVnbG9nViA9IG87XHJcbiAgZGVidWdsb2dNID0gbztcclxufVxyXG5cclxuXHJcbmltcG9ydCAqIGFzIG1hdGNoZGF0YSBmcm9tICcuL21hdGNoZGF0YSc7XHJcbnZhciBvVW5pdFRlc3RzID0gbWF0Y2hkYXRhLm9Vbml0VGVzdHNcclxuXHJcblxyXG5cclxuLyoqXHJcbiAqIEBwYXJhbSBzVGV4dCB7c3RyaW5nfSB0aGUgdGV4dCB0byBtYXRjaCB0byBOYXZUYXJnZXRSZXNvbHV0aW9uXHJcbiAqIEBwYXJhbSBzVGV4dDIge3N0cmluZ30gdGhlIHF1ZXJ5IHRleHQsIGUuZy4gTmF2VGFyZ2V0XHJcbiAqXHJcbiAqIEByZXR1cm4gdGhlIGRpc3RhbmNlLCBub3RlIHRoYXQgaXMgaXMgKm5vdCogc3ltbWV0cmljIVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNEaXN0YW5jZShzVGV4dDE6IHN0cmluZywgc1RleHQyOiBzdHJpbmcpOiBudW1iZXIge1xyXG4gIHJldHVybiBkaXN0YW5jZS5jYWxjRGlzdGFuY2VBZGp1c3RlZChzVGV4dDEsc1RleHQyKTtcclxufVxyXG5cclxuXHJcblxyXG4vKipcclxuICogQHBhcmFtIHNUZXh0IHtzdHJpbmd9IHRoZSB0ZXh0IHRvIG1hdGNoIHRvIE5hdlRhcmdldFJlc29sdXRpb25cclxuICogQHBhcmFtIHNUZXh0MiB7c3RyaW5nfSB0aGUgcXVlcnkgdGV4dCwgZS5nLiBOYXZUYXJnZXRcclxuICpcclxuICogQHJldHVybiB0aGUgZGlzdGFuY2UsIG5vdGUgdGhhdCBpcyBpcyAqbm90KiBzeW1tZXRyaWMhXHJcbiAqL1xyXG4vKlxyXG5leHBvcnQgZnVuY3Rpb24gY2FsY0Rpc3RhbmNlTGV2ZW5YWFgoc1RleHQxOiBzdHJpbmcsIHNUZXh0Mjogc3RyaW5nKTogbnVtYmVyIHtcclxuICAvLyBjb25zb2xlLmxvZyhcImxlbmd0aDJcIiArIHNUZXh0MSArIFwiIC0gXCIgKyBzVGV4dDIpXHJcbiAgIGlmKCgoc1RleHQxLmxlbmd0aCAtIHNUZXh0Mi5sZW5ndGgpID4gQWxnb2wuY2FsY0Rpc3QubGVuZ3RoRGVsdGExKVxyXG4gICAgfHwgKHNUZXh0Mi5sZW5ndGggPiAxLjUgKiBzVGV4dDEubGVuZ3RoIClcclxuICAgIHx8IChzVGV4dDIubGVuZ3RoIDwgKHNUZXh0MS5sZW5ndGgvMikpICkge1xyXG4gICAgcmV0dXJuIDUwMDAwO1xyXG4gIH1cclxuICB2YXIgYTAgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEuc3Vic3RyaW5nKDAsIHNUZXh0Mi5sZW5ndGgpLCBzVGV4dDIpXHJcbiAgaWYoZGVidWdsb2dWLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nVihcImRpc3RhbmNlXCIgKyBhMCArIFwic3RyaXBwZWQ+XCIgKyBzVGV4dDEuc3Vic3RyaW5nKDAsc1RleHQyLmxlbmd0aCkgKyBcIjw+XCIgKyBzVGV4dDIrIFwiPFwiKTtcclxuICB9XHJcbiAgaWYoYTAgKiA1MCA+IDE1ICogc1RleHQyLmxlbmd0aCkge1xyXG4gICAgICByZXR1cm4gNDAwMDA7XHJcbiAgfVxyXG4gIHZhciBhID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLCBzVGV4dDIpXHJcbiAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGFcclxufVxyXG4qL1xyXG5cclxuXHJcblxyXG5pbXBvcnQgKiBhcyBJRk1hdGNoIGZyb20gJy4uL21hdGNoL2lmbWF0Y2gnO1xyXG5cclxudHlwZSBJUnVsZSA9IElGTWF0Y2guSVJ1bGVcclxuXHJcblxyXG5pbnRlcmZhY2UgSU1hdGNoT3B0aW9ucyB7XHJcbiAgbWF0Y2hvdGhlcnM/OiBib29sZWFuLFxyXG4gIGF1Z21lbnQ/OiBib29sZWFuLFxyXG4gIG92ZXJyaWRlPzogYm9vbGVhblxyXG59XHJcblxyXG5pbnRlcmZhY2UgSU1hdGNoQ291bnQge1xyXG4gIGVxdWFsOiBudW1iZXJcclxuICBkaWZmZXJlbnQ6IG51bWJlclxyXG4gIHNwdXJpb3VzUjogbnVtYmVyXHJcbiAgc3B1cmlvdXNMOiBudW1iZXJcclxufVxyXG5cclxudHlwZSBFbnVtUnVsZVR5cGUgPSBJRk1hdGNoLkVudW1SdWxlVHlwZVxyXG5cclxuLy9jb25zdCBsZXZlbkN1dG9mZiA9IEFsZ29sLkN1dG9mZl9MZXZlblNodGVpbjtcclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbGV2ZW5QZW5hbHR5T2xkKGk6IG51bWJlcik6IG51bWJlciB7XHJcbiAgLy8gMC0+IDFcclxuICAvLyAxIC0+IDAuMVxyXG4gIC8vIDE1MCAtPiAgMC44XHJcbiAgaWYgKGkgPT09IDApIHtcclxuICAgIHJldHVybiAxO1xyXG4gIH1cclxuICAvLyByZXZlcnNlIG1heSBiZSBiZXR0ZXIgdGhhbiBsaW5lYXJcclxuICByZXR1cm4gMSArIGkgKiAoMC44IC0gMSkgLyAxNTBcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGxldmVuUGVuYWx0eShpOiBudW1iZXIpOiBudW1iZXIge1xyXG4gIC8vIDEgLT4gMVxyXG4gIC8vIGN1dE9mZiA9PiAwLjhcclxuICByZXR1cm4gaTtcclxuICAvL3JldHVybiAgIDEgLSAgKDEgLSBpKSAqMC4yL0FsZ29sLkN1dG9mZl9Xb3JkTWF0Y2g7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBub25Qcml2YXRlS2V5cyhvQSkge1xyXG4gIHJldHVybiBPYmplY3Qua2V5cyhvQSkuZmlsdGVyKGtleSA9PiB7XHJcbiAgICByZXR1cm4ga2V5WzBdICE9PSAnXyc7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjb3VudEFpbkIob0EsIG9CLCBmbkNvbXBhcmUsIGFLZXlJZ25vcmU/KTogbnVtYmVyIHtcclxuICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxyXG4gICAgdHlwZW9mIGFLZXlJZ25vcmUgPT09IFwic3RyaW5nXCIgPyBbYUtleUlnbm9yZV0gOiBbXTtcclxuICBmbkNvbXBhcmUgPSBmbkNvbXBhcmUgfHwgZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfVxyXG4gIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcclxuICAgIHJldHVybiBhS2V5SWdub3JlLmluZGV4T2Yoa2V5KSA8IDA7XHJcbiAgfSkuXHJcbiAgICByZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xyXG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9CLCBrZXkpKSB7XHJcbiAgICAgICAgcHJldiA9IHByZXYgKyAoZm5Db21wYXJlKG9BW2tleV0sIG9CW2tleV0sIGtleSkgPyAxIDogMClcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldlxyXG4gICAgfSwgMClcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNwdXJpb3VzQW5vdEluQihvQSwgb0IsIGFLZXlJZ25vcmU/KSB7XHJcbiAgYUtleUlnbm9yZSA9IEFycmF5LmlzQXJyYXkoYUtleUlnbm9yZSkgPyBhS2V5SWdub3JlIDpcclxuICAgIHR5cGVvZiBhS2V5SWdub3JlID09PSBcInN0cmluZ1wiID8gW2FLZXlJZ25vcmVdIDogW107XHJcbiAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xyXG4gICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcclxuICB9KS5cclxuICAgIHJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XHJcbiAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9CLCBrZXkpKSB7XHJcbiAgICAgICAgcHJldiA9IHByZXYgKyAxXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHByZXZcclxuICAgIH0sIDApXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvd2VyQ2FzZShvKSB7XHJcbiAgaWYgKHR5cGVvZiBvID09PSBcInN0cmluZ1wiKSB7XHJcbiAgICByZXR1cm4gby50b0xvd2VyQ2FzZSgpXHJcbiAgfVxyXG4gIHJldHVybiBvXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjb21wYXJlQ29udGV4dChvQSwgb0IsIGFLZXlJZ25vcmU/KSB7XHJcbiAgdmFyIGVxdWFsID0gY291bnRBaW5CKG9BLCBvQiwgZnVuY3Rpb24gKGEsIGIpIHsgcmV0dXJuIGxvd2VyQ2FzZShhKSA9PT0gbG93ZXJDYXNlKGIpOyB9LCBhS2V5SWdub3JlKTtcclxuICB2YXIgZGlmZmVyZW50ID0gY291bnRBaW5CKG9BLCBvQiwgZnVuY3Rpb24gKGEsIGIpIHsgcmV0dXJuIGxvd2VyQ2FzZShhKSAhPT0gbG93ZXJDYXNlKGIpOyB9LCBhS2V5SWdub3JlKTtcclxuICB2YXIgc3B1cmlvdXNMID0gc3B1cmlvdXNBbm90SW5CKG9BLCBvQiwgYUtleUlnbm9yZSlcclxuICB2YXIgc3B1cmlvdXNSID0gc3B1cmlvdXNBbm90SW5CKG9CLCBvQSwgYUtleUlnbm9yZSlcclxuICByZXR1cm4ge1xyXG4gICAgZXF1YWw6IGVxdWFsLFxyXG4gICAgZGlmZmVyZW50OiBkaWZmZXJlbnQsXHJcbiAgICBzcHVyaW91c0w6IHNwdXJpb3VzTCxcclxuICAgIHNwdXJpb3VzUjogc3B1cmlvdXNSXHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBzb3J0QnlSYW5rKGE6IElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nLCBiOiBJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZyk6IG51bWJlciB7XHJcbiAgdmFyIHIgPSAtKChhLl9yYW5raW5nIHx8IDEuMCkgLSAoYi5fcmFua2luZyB8fCAxLjApKTtcclxuICBpZiAocikge1xyXG4gICAgcmV0dXJuIHI7XHJcbiAgfVxyXG4gIGlmIChhLmNhdGVnb3J5ICYmIGIuY2F0ZWdvcnkpIHtcclxuICAgIHIgPSBhLmNhdGVnb3J5LmxvY2FsZUNvbXBhcmUoYi5jYXRlZ29yeSk7XHJcbiAgICBpZiAocikge1xyXG4gICAgICByZXR1cm4gcjtcclxuICAgIH1cclxuICB9XHJcbiAgaWYgKGEubWF0Y2hlZFN0cmluZyAmJiBiLm1hdGNoZWRTdHJpbmcpIHtcclxuICAgIHIgPSBhLm1hdGNoZWRTdHJpbmcubG9jYWxlQ29tcGFyZShiLm1hdGNoZWRTdHJpbmcpO1xyXG4gICAgaWYgKHIpIHtcclxuICAgICAgcmV0dXJuIHI7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiAwO1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrT25lUnVsZShzdHJpbmc6IHN0cmluZywgbGNTdHJpbmcgOiBzdHJpbmcsIGV4YWN0IDogYm9vbGVhbixcclxucmVzIDogQXJyYXk8SU1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4sXHJcbm9SdWxlIDogSU1hdGNoLm1SdWxlLCBjbnRSZWM/IDogSUNudFJlYyApIHtcclxuICAgaWYgKGRlYnVnbG9nVi5lbmFibGVkKSB7XHJcbiAgICAgIGRlYnVnbG9nVignYXR0ZW1wdGluZyB0byBtYXRjaCBydWxlICcgKyBKU09OLnN0cmluZ2lmeShvUnVsZSkgKyBcIiB0byBzdHJpbmcgXFxcIlwiICsgc3RyaW5nICsgXCJcXFwiXCIpO1xyXG4gICAgfVxyXG4gICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuV09SRDpcclxuICAgICAgICBpZighb1J1bGUubG93ZXJjYXNld29yZCkge1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdydWxlIHdpdGhvdXQgYSBsb3dlcmNhc2UgdmFyaWFudCcgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSk7XHJcbiAgICAgICAgIH07XHJcbiAgICAgICAgaWYgKGV4YWN0ICYmIG9SdWxlLndvcmQgPT09IHN0cmluZyB8fCBvUnVsZS5sb3dlcmNhc2V3b3JkID09PSBsY1N0cmluZykge1xyXG4gICAgICAgICAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgICAgICAgICBkZWJ1Z2xvZyhcIlxcbiFtYXRjaGVkIGV4YWN0IFwiICsgc3RyaW5nICsgXCI9XCIgICsgb1J1bGUubG93ZXJjYXNld29yZCAgKyBcIiA9PiBcIiArIG9SdWxlLm1hdGNoZWRTdHJpbmcgKyBcIi9cIiArIG9SdWxlLmNhdGVnb3J5KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJlcy5wdXNoKHtcclxuICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCFleGFjdCAmJiAhb1J1bGUuZXhhY3RPbmx5KSB7XHJcbiAgICAgICAgICB2YXIgbGV2ZW5tYXRjaCA9IGNhbGNEaXN0YW5jZShvUnVsZS5sb3dlcmNhc2V3b3JkLCBsY1N0cmluZyk7XHJcblxyXG4vKlxyXG4gICAgICAgICAgYWRkQ250UmVjKGNudFJlYyxcImNhbGNEaXN0YW5jZVwiLCAxKTtcclxuICAgICAgICAgIGlmKGxldmVubWF0Y2ggPCA1MCkge1xyXG4gICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlRXhwXCIsIDEpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYobGV2ZW5tYXRjaCA8IDQwMDAwKSB7XHJcbiAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VCZWxvdzQwa1wiLCAxKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgICovXHJcbiAgICAgICAgICAvL2lmKG9SdWxlLmxvd2VyY2FzZXdvcmQgPT09IFwiY29zbW9zXCIpIHtcclxuICAgICAgICAgIC8vICBjb25zb2xlLmxvZyhcImhlcmUgcmFua2luZyBcIiArIGxldmVubWF0Y2ggKyBcIiBcIiArIG9SdWxlLmxvd2VyY2FzZXdvcmQgKyBcIiBcIiArIGxjU3RyaW5nKTtcclxuICAgICAgICAgIC8vfVxyXG4gICAgICAgICAgaWYgKGxldmVubWF0Y2ggPj0gQWxnb2wuQ3V0b2ZmX1dvcmRNYXRjaCkgeyAvLyBsZXZlbkN1dG9mZikge1xyXG4gICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlT2tcIiwgMSk7XHJcbiAgICAgICAgICAgIHZhciByZWMgPSB7XHJcbiAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcclxuICAgICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXHJcbiAgICAgICAgICAgICAgX3Jhbmtpbmc6IChvUnVsZS5fcmFua2luZyB8fCAxLjApICogbGV2ZW5QZW5hbHR5KGxldmVubWF0Y2gpLFxyXG4gICAgICAgICAgICAgIGxldmVubWF0Y2g6IGxldmVubWF0Y2hcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgaWYoZGVidWdsb2cpIHtcclxuICAgICAgICAgICAgICBkZWJ1Z2xvZyhcIlxcbiFmdXp6eSBcIiArIChsZXZlbm1hdGNoKS50b0ZpeGVkKDMpICsgXCIgXCIgKyByZWMuX3JhbmtpbmcudG9GaXhlZCgzKSArIFwiICBcIiArIHN0cmluZyArIFwiPVwiICArIG9SdWxlLmxvd2VyY2FzZXdvcmQgICsgXCIgPT4gXCIgKyBvUnVsZS5tYXRjaGVkU3RyaW5nICsgXCIvXCIgKyBvUnVsZS5jYXRlZ29yeSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmVzLnB1c2gocmVjKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuUkVHRVhQOiB7XHJcbiAgICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KFwiIGhlcmUgcmVnZXhwXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSkpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBtID0gb1J1bGUucmVnZXhwLmV4ZWMoc3RyaW5nKVxyXG4gICAgICAgIGlmIChtKSB7XHJcbiAgICAgICAgICByZXMucHVzaCh7XHJcbiAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxyXG4gICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiAob1J1bGUubWF0Y2hJbmRleCAhPT0gdW5kZWZpbmVkICYmIG1bb1J1bGUubWF0Y2hJbmRleF0pIHx8IHN0cmluZyxcclxuICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxyXG4gICAgICAgICAgICBfcmFua2luZzogb1J1bGUuX3JhbmtpbmcgfHwgMS4wXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBkZWZhdWx0OlxyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInVua25vd24gdHlwZVwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUsIHVuZGVmaW5lZCwgMikpXHJcbiAgICB9XHJcbn1cclxuXHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrT25lUnVsZVdpdGhPZmZzZXQoc3RyaW5nOiBzdHJpbmcsIGxjU3RyaW5nIDogc3RyaW5nLCBleGFjdCA6IGJvb2xlYW4sXHJcbnJlcyA6IEFycmF5PElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdSYW5nZWQ+LFxyXG5vUnVsZSA6IElNYXRjaC5tUnVsZSwgY250UmVjPyA6IElDbnRSZWMgKSB7XHJcbiAgIGlmIChkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xyXG4gICAgICBkZWJ1Z2xvZ1YoJ2F0dGVtcHRpbmcgdG8gbWF0Y2ggcnVsZSAnICsgSlNPTi5zdHJpbmdpZnkob1J1bGUpICsgXCIgdG8gc3RyaW5nIFxcXCJcIiArIHN0cmluZyArIFwiXFxcIlwiKTtcclxuICAgIH1cclxuICAgIHN3aXRjaCAob1J1bGUudHlwZSkge1xyXG4gICAgICBjYXNlIElGTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQ6XHJcbiAgICAgICAgaWYoIW9SdWxlLmxvd2VyY2FzZXdvcmQpIHtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncnVsZSB3aXRob3V0IGEgbG93ZXJjYXNlIHZhcmlhbnQnICsgSlNPTi5zdHJpbmdpZnkob1J1bGUsIHVuZGVmaW5lZCwgMikpO1xyXG4gICAgICAgICB9O1xyXG4gICAgICAgIGlmIChleGFjdCAmJiAob1J1bGUud29yZCA9PT0gc3RyaW5nIHx8IG9SdWxlLmxvd2VyY2FzZXdvcmQgPT09IGxjU3RyaW5nKSkge1xyXG4gICAgICAgICAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgICAgICAgICBkZWJ1Z2xvZyhcIlxcbiFtYXRjaGVkIGV4YWN0IFwiICsgc3RyaW5nICsgXCI9XCIgICsgb1J1bGUubG93ZXJjYXNld29yZCAgKyBcIiA9PiBcIiArIG9SdWxlLm1hdGNoZWRTdHJpbmcgKyBcIi9cIiArIG9SdWxlLmNhdGVnb3J5KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJlcy5wdXNoKHtcclxuICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgcnVsZTogb1J1bGUsXHJcbiAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghZXhhY3QgJiYgIW9SdWxlLmV4YWN0T25seSkge1xyXG4gICAgICAgICAgdmFyIGxldmVubWF0Y2ggPSBjYWxjRGlzdGFuY2Uob1J1bGUubG93ZXJjYXNld29yZCwgbGNTdHJpbmcpO1xyXG5cclxuLypcclxuICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VcIiwgMSk7XHJcbiAgICAgICAgICBpZihsZXZlbm1hdGNoIDwgNTApIHtcclxuICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYyxcImNhbGNEaXN0YW5jZUV4cFwiLCAxKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmKGxldmVubWF0Y2ggPCA0MDAwMCkge1xyXG4gICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlQmVsb3c0MGtcIiwgMSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICAqL1xyXG4gICAgICAgICAgLy9pZihvUnVsZS5sb3dlcmNhc2V3b3JkID09PSBcImNvc21vc1wiKSB7XHJcbiAgICAgICAgICAvLyAgY29uc29sZS5sb2coXCJoZXJlIHJhbmtpbmcgXCIgKyBsZXZlbm1hdGNoICsgXCIgXCIgKyBvUnVsZS5sb3dlcmNhc2V3b3JkICsgXCIgXCIgKyBsY1N0cmluZyk7XHJcbiAgICAgICAgICAvL31cclxuICAgICAgICAgIGlmIChsZXZlbm1hdGNoID49IEFsZ29sLkN1dG9mZl9Xb3JkTWF0Y2gpIHsgLy8gbGV2ZW5DdXRvZmYpIHtcclxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcImZvdW5kIHJlY1wiKTtcclxuICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYyxcImNhbGNEaXN0YW5jZU9rXCIsIDEpO1xyXG4gICAgICAgICAgICB2YXIgcmVjID0ge1xyXG4gICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxyXG4gICAgICAgICAgICAgIHJ1bGUgOiBvUnVsZSxcclxuICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBvUnVsZS5tYXRjaGVkU3RyaW5nLFxyXG4gICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgICBfcmFua2luZzogKG9SdWxlLl9yYW5raW5nIHx8IDEuMCkgKiBsZXZlblBlbmFsdHkobGV2ZW5tYXRjaCksXHJcbiAgICAgICAgICAgICAgbGV2ZW5tYXRjaDogbGV2ZW5tYXRjaFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBpZihkZWJ1Z2xvZykge1xyXG4gICAgICAgICAgICAgIGRlYnVnbG9nKFwiXFxuIUNPUk86IGZ1enp5IFwiICsgKGxldmVubWF0Y2gpLnRvRml4ZWQoMykgKyBcIiBcIiArIHJlYy5fcmFua2luZy50b0ZpeGVkKDMpICsgXCIgIFxcXCJcIiArIHN0cmluZyArIFwiXFxcIj1cIiAgKyBvUnVsZS5sb3dlcmNhc2V3b3JkICArIFwiID0+IFwiICsgb1J1bGUubWF0Y2hlZFN0cmluZyArIFwiL1wiICsgb1J1bGUuY2F0ZWdvcnkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJlcy5wdXNoKHJlYyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIElGTWF0Y2guRW51bVJ1bGVUeXBlLlJFR0VYUDoge1xyXG4gICAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAgICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShcIiBoZXJlIHJlZ2V4cFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUsIHVuZGVmaW5lZCwgMikpKVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgbSA9IG9SdWxlLnJlZ2V4cC5leGVjKHN0cmluZylcclxuICAgICAgICBpZiAobSkge1xyXG4gICAgICAgICAgcmVzLnB1c2goe1xyXG4gICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcclxuICAgICAgICAgICAgcnVsZTogb1J1bGUsXHJcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IChvUnVsZS5tYXRjaEluZGV4ICE9PSB1bmRlZmluZWQgJiYgbVtvUnVsZS5tYXRjaEluZGV4XSkgfHwgc3RyaW5nLFxyXG4gICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXHJcbiAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidW5rbm93biB0eXBlXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSlcclxuICAgIH1cclxufVxyXG5cclxuXHJcblxyXG5cclxuaW50ZXJmYWNlIElDbnRSZWMge1xyXG5cclxufTtcclxuXHJcbmZ1bmN0aW9uIGFkZENudFJlYyhjbnRSZWMgOiBJQ250UmVjLCBtZW1iZXIgOiBzdHJpbmcsIG51bWJlciA6IG51bWJlcikge1xyXG4gIGlmKCghY250UmVjKSB8fCAobnVtYmVyID09PSAwKSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICBjbnRSZWNbbWVtYmVyXSA9IChjbnRSZWNbbWVtYmVyXSB8fCAwKSArIG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNhdGVnb3JpemVTdHJpbmcod29yZDogc3RyaW5nLCBleGFjdDogYm9vbGVhbiwgb1J1bGVzOiBBcnJheTxJTWF0Y2gubVJ1bGU+LFxyXG4gY250UmVjPyA6IElDbnRSZWMpOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4ge1xyXG4gIC8vIHNpbXBseSBhcHBseSBhbGwgcnVsZXNcclxuICBpZihkZWJ1Z2xvZ00uZW5hYmxlZCApICB7XHJcbiAgICBkZWJ1Z2xvZ00oXCJydWxlcyA6IFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGVzLCB1bmRlZmluZWQsIDIpKTtcclxuICB9XHJcbiAgdmFyIGxjU3RyaW5nID0gd29yZC50b0xvd2VyQ2FzZSgpO1xyXG4gIHZhciByZXM6IEFycmF5PElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+ID0gW11cclxuICBvUnVsZXMuZm9yRWFjaChmdW5jdGlvbiAob1J1bGUpIHtcclxuICAgIGNoZWNrT25lUnVsZSh3b3JkLGxjU3RyaW5nLGV4YWN0LHJlcyxvUnVsZSxjbnRSZWMpO1xyXG4gIH0pO1xyXG4gIHJlcy5zb3J0KHNvcnRCeVJhbmspO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNhdGVnb3JpemVTaW5nbGVXb3JkV2l0aE9mZnNldCh3b3JkOiBzdHJpbmcsIGxjd29yZCA6IHN0cmluZywgZXhhY3Q6IGJvb2xlYW4sIG9SdWxlczogQXJyYXk8SU1hdGNoLm1SdWxlPixcclxuIGNudFJlYz8gOiBJQ250UmVjKTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdSYW5nZWQ+IHtcclxuICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXHJcbiAgaWYoZGVidWdsb2dNLmVuYWJsZWQgKSAge1xyXG4gICAgZGVidWdsb2dNKFwicnVsZXMgOiBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlcywgdW5kZWZpbmVkLCAyKSk7XHJcbiAgfVxyXG4gIHZhciByZXM6IEFycmF5PElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdSYW5nZWQ+ID0gW11cclxuICBvUnVsZXMuZm9yRWFjaChmdW5jdGlvbiAob1J1bGUpIHtcclxuICAgIGNoZWNrT25lUnVsZVdpdGhPZmZzZXQod29yZCxsY3dvcmQsZXhhY3QscmVzLG9SdWxlLGNudFJlYyk7XHJcbiAgfSk7XHJcbiAgZGVidWdsb2coYENTV1dPOiBnb3QgcmVzdWx0cyBmb3IgJHtsY3dvcmR9ICAke3Jlcy5sZW5ndGh9YCk7XHJcbiAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBwb3N0RmlsdGVyKHJlcyA6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPikgOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4ge1xyXG4gIHJlcy5zb3J0KHNvcnRCeVJhbmspO1xyXG4gIHZhciBiZXN0UmFuayA9IDA7XHJcbiAgLy9jb25zb2xlLmxvZyhcIlxcbnBpbHRlcmVkIFwiICsgSlNPTi5zdHJpbmdpZnkocmVzKSk7XHJcbiAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgZGVidWdsb2coXCJwcmVGaWx0ZXIgOiBcXG5cIiArIHJlcy5tYXAoZnVuY3Rpb24od29yZCxpbmRleCkge1xyXG4gICAgICByZXR1cm4gYCR7aW5kZXh9ICR7d29yZC5fcmFua2luZ30gID0+IFwiJHt3b3JkLmNhdGVnb3J5fVwiICR7d29yZC5tYXRjaGVkU3RyaW5nfWA7XHJcbiAgICB9KS5qb2luKFwiXFxuXCIpKTtcclxuICB9XHJcbiAgdmFyIHIgPSByZXMuZmlsdGVyKGZ1bmN0aW9uKHJlc3gsaW5kZXgpIHtcclxuICAgIGlmKGluZGV4ID09PSAwKSB7XHJcbiAgICAgIGJlc3RSYW5rID0gcmVzeC5fcmFua2luZztcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICAvLyAxLTAuOSA9IDAuMVxyXG4gICAgLy8gMS0gMC45MyA9IDAuN1xyXG4gICAgLy8gMS83XHJcbiAgICB2YXIgZGVsdGEgPSBiZXN0UmFuayAvIHJlc3guX3Jhbmtpbmc7XHJcbiAgICBpZigocmVzeC5tYXRjaGVkU3RyaW5nID09PSByZXNbaW5kZXgtMV0ubWF0Y2hlZFN0cmluZylcclxuICAgICAgJiYgKHJlc3guY2F0ZWdvcnkgPT09IHJlc1tpbmRleC0xXS5jYXRlZ29yeSkpIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gICAgLy9jb25zb2xlLmxvZyhcIlxcbiBkZWx0YSBmb3IgXCIgKyBkZWx0YSArIFwiICBcIiArIHJlc3guX3JhbmtpbmcpO1xyXG4gICAgaWYgKHJlc3gubGV2ZW5tYXRjaCAmJiAoZGVsdGEgPiAxLjAzKSkge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9KTtcclxuICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAgIGRlYnVnbG9nKGBcXG5maWx0ZXJlZCAke3IubGVuZ3RofS8ke3Jlcy5sZW5ndGh9YCArIEpTT04uc3RyaW5naWZ5KHIpKTtcclxuICB9XHJcbiAgcmV0dXJuIHI7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBwb3N0RmlsdGVyV2l0aE9mZnNldChyZXMgOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1JhbmdlZD4pIDogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdSYW5nZWQ+IHtcclxuICByZXMuc29ydChzb3J0QnlSYW5rKTtcclxuICB2YXIgYmVzdFJhbmsgPSAwO1xyXG4gIC8vY29uc29sZS5sb2coXCJcXG5waWx0ZXJlZCBcIiArIEpTT04uc3RyaW5naWZ5KHJlcykpO1xyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nKFwiIHByZUZpbHRlciA6IFxcblwiICsgcmVzLm1hcChmdW5jdGlvbih3b3JkKSB7XHJcbiAgICAgIHJldHVybiBgICR7d29yZC5fcmFua2luZ30gID0+IFwiJHt3b3JkLmNhdGVnb3J5fVwiICR7d29yZC5tYXRjaGVkU3RyaW5nfSBgO1xyXG4gICAgfSkuam9pbihcIlxcblwiKSk7XHJcbiAgfVxyXG4gIHZhciByID0gcmVzLmZpbHRlcihmdW5jdGlvbihyZXN4LGluZGV4KSB7XHJcbiAgICBpZihpbmRleCA9PT0gMCkge1xyXG4gICAgICBiZXN0UmFuayA9IHJlc3guX3Jhbmtpbmc7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgLy8gMS0wLjkgPSAwLjFcclxuICAgIC8vIDEtIDAuOTMgPSAwLjdcclxuICAgIC8vIDEvN1xyXG4gICAgdmFyIGRlbHRhID0gYmVzdFJhbmsgLyByZXN4Ll9yYW5raW5nO1xyXG4gICAgaWYoXHJcbiAgICAgICAgIShyZXN4LnJ1bGUgJiYgcmVzeC5ydWxlLnJhbmdlKVxyXG4gICAgICYmICEocmVzW2luZGV4LTFdLnJ1bGUgJiYgcmVzW2luZGV4LTFdLnJ1bGUucmFuZ2UpXHJcbiAgICAgJiYgKHJlc3gubWF0Y2hlZFN0cmluZyA9PT0gcmVzW2luZGV4LTFdLm1hdGNoZWRTdHJpbmcpXHJcbiAgICAgJiYgKHJlc3guY2F0ZWdvcnkgPT09IHJlc1tpbmRleC0xXS5jYXRlZ29yeSkpIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gICAgLy9jb25zb2xlLmxvZyhcIlxcbiBkZWx0YSBmb3IgXCIgKyBkZWx0YSArIFwiICBcIiArIHJlc3guX3JhbmtpbmcpO1xyXG4gICAgaWYgKHJlc3gubGV2ZW5tYXRjaCAmJiAoZGVsdGEgPiAxLjAzKSkge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9KTtcclxuICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAgIGRlYnVnbG9nKGBcXG5maWx0ZXJlZCAke3IubGVuZ3RofS8ke3Jlcy5sZW5ndGh9YCArIEpTT04uc3RyaW5naWZ5KHIpKTtcclxuICB9XHJcbiAgcmV0dXJuIHI7XHJcbn1cclxuXHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNhdGVnb3JpemVTdHJpbmcyKHdvcmQ6IHN0cmluZywgZXhhY3Q6IGJvb2xlYW4sICBydWxlcyA6IElNYXRjaC5TcGxpdFJ1bGVzXHJcbiAgLCBjbnRSZWM/IDpJQ250UmVjKTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IHtcclxuICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXHJcbiAgaWYgKGRlYnVnbG9nTS5lbmFibGVkICkgIHtcclxuICAgIGRlYnVnbG9nTShcInJ1bGVzIDogXCIgKyBKU09OLnN0cmluZ2lmeShydWxlcyx1bmRlZmluZWQsIDIpKTtcclxuICB9XHJcbiAgdmFyIGxjU3RyaW5nID0gd29yZC50b0xvd2VyQ2FzZSgpO1xyXG4gIHZhciByZXM6IEFycmF5PElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+ID0gW107XHJcbiAgaWYgKGV4YWN0KSB7XHJcbiAgICB2YXIgciA9IHJ1bGVzLndvcmRNYXBbbGNTdHJpbmddO1xyXG4gICAgaWYgKHIpIHtcclxuICAgICAgci5ydWxlcy5mb3JFYWNoKGZ1bmN0aW9uKG9SdWxlKSB7XHJcbiAgICAgICAgcmVzLnB1c2goe1xyXG4gICAgICAgICAgICBzdHJpbmc6IHdvcmQsXHJcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxyXG4gICAgICAgICAgfSlcclxuICAgICB9KTtcclxuICAgIH1cclxuICAgIHJ1bGVzLm5vbldvcmRSdWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChvUnVsZSkge1xyXG4gICAgICBjaGVja09uZVJ1bGUod29yZCxsY1N0cmluZyxleGFjdCxyZXMsb1J1bGUsY250UmVjKTtcclxuICAgIH0pO1xyXG4gICAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XHJcbiAgICByZXR1cm4gcmVzO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBkZWJ1Z2xvZyhcImNhdGVnb3JpemUgbm9uIGV4YWN0XCIgKyB3b3JkICsgXCIgeHggIFwiICsgcnVsZXMuYWxsUnVsZXMubGVuZ3RoKTtcclxuICAgIHJldHVybiBwb3N0RmlsdGVyKGNhdGVnb3JpemVTdHJpbmcod29yZCwgZXhhY3QsIHJ1bGVzLmFsbFJ1bGVzLCBjbnRSZWMpKTtcclxuICB9XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVdvcmRJbnRlcm5hbFdpdGhPZmZzZXRzKHdvcmQ6IHN0cmluZywgbGN3b3JkIDogc3RyaW5nLCBleGFjdDogYm9vbGVhbiwgIHJ1bGVzIDogSU1hdGNoLlNwbGl0UnVsZXNcclxuICAsIGNudFJlYz8gOklDbnRSZWMpOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1JhbmdlZD4ge1xyXG5cclxuICBkZWJ1Z2xvZ00oXCJjYXRlZ29yaXplIFwiICsgbGN3b3JkICsgXCIgd2l0aCBvZmZzZXQhISEhISEhISEhISEhISEhIVwiICsgZXhhY3QpXHJcbiAgLy8gc2ltcGx5IGFwcGx5IGFsbCBydWxlc1xyXG4gIGlmIChkZWJ1Z2xvZ00uZW5hYmxlZCApICB7XHJcbiAgICBkZWJ1Z2xvZ00oXCJydWxlcyA6IFwiICsgSlNPTi5zdHJpbmdpZnkocnVsZXMsdW5kZWZpbmVkLCAyKSk7XHJcbiAgfVxyXG4gIHZhciByZXM6IEFycmF5PElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdSYW5nZWQ+ID0gW107XHJcbiAgaWYgKGV4YWN0KSB7XHJcbiAgICB2YXIgciA9IHJ1bGVzLndvcmRNYXBbbGN3b3JkXTtcclxuICAgIGlmIChyKSB7XHJcbiAgICAgIGRlYnVnbG9nTShgIC4uLi5wdXNoaW5nIG4gcnVsZXMgZXhhY3QgZm9yICR7bGN3b3JkfTpgICsgci5ydWxlcy5sZW5ndGgpO1xyXG4gICAgICBkZWJ1Z2xvZ00oci5ydWxlcy5tYXAoKHIsaW5kZXgpPT4gJycgKyBpbmRleCArICcgJyArIEpTT04uc3RyaW5naWZ5KHIpKS5qb2luKFwiXFxuXCIpKTtcclxuICAgICAgci5ydWxlcy5mb3JFYWNoKGZ1bmN0aW9uKG9SdWxlKSB7XHJcbiAgICAgICAgcmVzLnB1c2goe1xyXG4gICAgICAgICAgICBzdHJpbmc6IHdvcmQsXHJcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgcnVsZTogb1J1bGUsXHJcbiAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcclxuICAgICAgICAgIH0pXHJcbiAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBydWxlcy5ub25Xb3JkUnVsZXMuZm9yRWFjaChmdW5jdGlvbiAob1J1bGUpIHtcclxuICAgICAgY2hlY2tPbmVSdWxlV2l0aE9mZnNldCh3b3JkLGxjd29yZCwgZXhhY3QscmVzLG9SdWxlLGNudFJlYyk7XHJcbiAgICB9KTtcclxuICAgIHJlcyA9IHBvc3RGaWx0ZXJXaXRoT2Zmc2V0KHJlcyk7XHJcbiAgICBkZWJ1Z2xvZyhcImhlcmUgcmVzdWx0cyBmb3JcIiArIHdvcmQgKyBcIiByZXMgXCIgKyByZXMubGVuZ3RoKTtcclxuICAgIGRlYnVnbG9nTShcImhlcmUgcmVzdWx0cyBmb3JcIiArIHdvcmQgKyBcIiByZXMgXCIgKyByZXMubGVuZ3RoKTtcclxuICAgIHJlcy5zb3J0KHNvcnRCeVJhbmspO1xyXG4gICAgcmV0dXJuIHJlcztcclxuICB9IGVsc2Uge1xyXG4gICAgZGVidWdsb2coXCJjYXRlZ29yaXplIG5vbiBleGFjdFwiICsgd29yZCArIFwiIHh4ICBcIiArIHJ1bGVzLmFsbFJ1bGVzLmxlbmd0aCk7XHJcbiAgICB2YXIgcnIgPSBjYXRlZ29yaXplU2luZ2xlV29yZFdpdGhPZmZzZXQod29yZCxsY3dvcmQsIGV4YWN0LCBydWxlcy5hbGxSdWxlcywgY250UmVjKTtcclxuICAgIC8vZGVidWxvZ00oXCJmdXp6eSByZXMgXCIgKyBKU09OLnN0cmluZ2lmeShycikpO1xyXG4gICAgcmV0dXJuIHBvc3RGaWx0ZXJXaXRoT2Zmc2V0KHJyKTtcclxuICB9XHJcbn1cclxuXHJcblxyXG5cclxuLyoqXHJcbiAqXHJcbiAqIE9wdGlvbnMgbWF5IGJlIHtcclxuICogbWF0Y2hvdGhlcnMgOiB0cnVlLCAgPT4gb25seSBydWxlcyB3aGVyZSBhbGwgb3RoZXJzIG1hdGNoIGFyZSBjb25zaWRlcmVkXHJcbiAqIGF1Z21lbnQgOiB0cnVlLFxyXG4gKiBvdmVycmlkZSA6IHRydWUgfSAgPT5cclxuICpcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFdvcmQob1J1bGU6IElSdWxlLCBjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQsIG9wdGlvbnM/OiBJTWF0Y2hPcHRpb25zKSB7XHJcbiAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKVxyXG4gIHZhciBzMiA9IG9SdWxlLndvcmQudG9Mb3dlckNhc2UoKTtcclxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxyXG4gIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsIG9SdWxlLmZvbGxvd3MsIG9SdWxlLmtleSlcclxuICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xyXG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkob3B0aW9ucykpO1xyXG4gIH1cclxuICBpZiAob3B0aW9ucy5tYXRjaG90aGVycyAmJiAoZGVsdGEuZGlmZmVyZW50ID4gMCkpIHtcclxuICAgIHJldHVybiB1bmRlZmluZWRcclxuICB9XHJcbiAgdmFyIGM6IG51bWJlciA9IGNhbGNEaXN0YW5jZShzMiwgczEpO1xyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nKFwiIHMxIDw+IHMyIFwiICsgczEgKyBcIjw+XCIgKyBzMiArIFwiICA9PjogXCIgKyBjKTtcclxuICB9XHJcbiAgaWYgKGMgPiAwLjgwKSB7XHJcbiAgICB2YXIgcmVzID0gQW55T2JqZWN0LmFzc2lnbih7fSwgb1J1bGUuZm9sbG93cykgYXMgYW55O1xyXG4gICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIGNvbnRleHQpO1xyXG4gICAgaWYgKG9wdGlvbnMub3ZlcnJpZGUpIHtcclxuICAgICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xyXG4gICAgfVxyXG4gICAgLy8gZm9yY2Uga2V5IHByb3BlcnR5XHJcbiAgICAvLyBjb25zb2xlLmxvZygnIG9iamVjdGNhdGVnb3J5JywgcmVzWydzeXN0ZW1PYmplY3RDYXRlZ29yeSddKTtcclxuICAgIHJlc1tvUnVsZS5rZXldID0gb1J1bGUuZm9sbG93c1tvUnVsZS5rZXldIHx8IHJlc1tvUnVsZS5rZXldO1xyXG4gICAgcmVzLl93ZWlnaHQgPSBBbnlPYmplY3QuYXNzaWduKHt9LCByZXMuX3dlaWdodCk7XHJcbiAgICByZXMuX3dlaWdodFtvUnVsZS5rZXldID0gYztcclxuICAgIE9iamVjdC5mcmVlemUocmVzKTtcclxuICAgIGlmICggZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgICBkZWJ1Z2xvZygnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuICByZXR1cm4gdW5kZWZpbmVkO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEFyZ3NNYXAobWF0Y2g6IEFycmF5PHN0cmluZz4sIGFyZ3NNYXA6IHsgW2tleTogbnVtYmVyXTogc3RyaW5nIH0pOiBJRk1hdGNoLmNvbnRleHQge1xyXG4gIHZhciByZXMgPSB7fSBhcyBJRk1hdGNoLmNvbnRleHQ7XHJcbiAgaWYgKCFhcmdzTWFwKSB7XHJcbiAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuICBPYmplY3Qua2V5cyhhcmdzTWFwKS5mb3JFYWNoKGZ1bmN0aW9uIChpS2V5KSB7XHJcbiAgICB2YXIgdmFsdWUgPSBtYXRjaFtpS2V5XVxyXG4gICAgdmFyIGtleSA9IGFyZ3NNYXBbaUtleV07XHJcbiAgICBpZiAoKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikgJiYgdmFsdWUubGVuZ3RoID4gMCkge1xyXG4gICAgICByZXNba2V5XSA9IHZhbHVlXHJcbiAgICB9XHJcbiAgfVxyXG4gICk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IFJhbmtXb3JkID0ge1xyXG4gIGhhc0Fib3ZlOiBmdW5jdGlvbiAobHN0OiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4sIGJvcmRlcjogbnVtYmVyKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gIWxzdC5ldmVyeShmdW5jdGlvbiAob01lbWJlcikge1xyXG4gICAgICByZXR1cm4gKG9NZW1iZXIuX3JhbmtpbmcgPCBib3JkZXIpO1xyXG4gICAgfSk7XHJcbiAgfSxcclxuXHJcbiAgdGFrZUZpcnN0TjogZnVuY3Rpb248VCBleHRlbmRzIElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiAobHN0OiBBcnJheTxUPiwgbjogbnVtYmVyKTogQXJyYXk8VD4ge1xyXG4gICAgdmFyIGxhc3RSYW5raW5nID0gMS4wO1xyXG4gICAgdmFyIGNudFJhbmdlZCA9IDA7XHJcbiAgICByZXR1cm4gbHN0LmZpbHRlcihmdW5jdGlvbiAob01lbWJlciwgaUluZGV4KSB7XHJcbiAgICB2YXIgaXNSYW5nZWQgPSAhIShvTWVtYmVyW1wicnVsZVwiXSAmJiBvTWVtYmVyW1wicnVsZVwiXS5yYW5nZSk7XHJcbiAgICBpZihpc1JhbmdlZCkge1xyXG4gICAgICBjbnRSYW5nZWQgKz0gMTtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICBpZiAoKChpSW5kZXggLSBjbnRSYW5nZWQpIDwgbikgfHwgKG9NZW1iZXIuX3JhbmtpbmcgPT09IGxhc3RSYW5raW5nKSkgIHtcclxuICAgICAgICBsYXN0UmFua2luZyA9IG9NZW1iZXIuX3Jhbmtpbmc7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfSk7XHJcbiAgfSxcclxuICB0YWtlQWJvdmUgOiBmdW5jdGlvbjxUIGV4dGVuZHMgSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IChsc3Q6IEFycmF5PFQ+LCBib3JkZXI6IG51bWJlcik6IEFycmF5PFQ+IHtcclxuICAgIHJldHVybiBsc3QuZmlsdGVyKGZ1bmN0aW9uIChvTWVtYmVyKSB7XHJcbiAgICAgIHJldHVybiAob01lbWJlci5fcmFua2luZyA+PSBib3JkZXIpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxufTtcclxuXHJcbi8qXHJcbnZhciBleGFjdExlbiA9IDA7XHJcbnZhciBmdXp6eUxlbiA9IDA7XHJcbnZhciBmdXp6eUNudCA9IDA7XHJcbnZhciBleGFjdENudCA9IDA7XHJcbnZhciB0b3RhbENudCA9IDA7XHJcbnZhciB0b3RhbExlbiA9IDA7XHJcbnZhciByZXRhaW5lZENudCA9IDA7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVzZXRDbnQoKSB7XHJcbiAgZXhhY3RMZW4gPSAwO1xyXG4gIGZ1enp5TGVuID0gMDtcclxuICBmdXp6eUNudCA9IDA7XHJcbiAgZXhhY3RDbnQgPSAwO1xyXG4gIHRvdGFsQ250ID0gMDtcclxuICB0b3RhbExlbiA9IDA7XHJcbiAgcmV0YWluZWRDbnQgPSAwO1xyXG59XHJcbiovXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZihzV29yZEdyb3VwOiBzdHJpbmcsIHNwbGl0UnVsZXMgOiBJTWF0Y2guU3BsaXRSdWxlcyAsIGNudFJlYz8gOiBJQ250UmVjICk6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiB7XHJcbiAgdmFyIHNlZW5JdCA9IGNhdGVnb3JpemVTdHJpbmcyKHNXb3JkR3JvdXAsIHRydWUsIHNwbGl0UnVsZXMsIGNudFJlYyk7XHJcbiAgLy90b3RhbENudCArPSAxO1xyXG4gIC8vIGV4YWN0TGVuICs9IHNlZW5JdC5sZW5ndGg7XHJcbiAgYWRkQ250UmVjKGNudFJlYywgJ2NudENhdEV4YWN0JywgMSk7XHJcbiAgYWRkQ250UmVjKGNudFJlYywgJ2NudENhdEV4YWN0UmVzJywgc2Vlbkl0Lmxlbmd0aCk7XHJcblxyXG4gIGlmIChSYW5rV29yZC5oYXNBYm92ZShzZWVuSXQsIDAuOCkpIHtcclxuICAgIGlmKGNudFJlYykge1xyXG4gICAgICBhZGRDbnRSZWMoY250UmVjLCAnZXhhY3RQcmlvclRha2UnLCBzZWVuSXQubGVuZ3RoKVxyXG4gICAgfVxyXG4gICAgc2Vlbkl0ID0gUmFua1dvcmQudGFrZUFib3ZlKHNlZW5JdCwgMC44KTtcclxuICAgIGlmKGNudFJlYykge1xyXG4gICAgICBhZGRDbnRSZWMoY250UmVjLCAnZXhhY3RBZnRlclRha2UnLCBzZWVuSXQubGVuZ3RoKVxyXG4gICAgfVxyXG4gICAvLyBleGFjdENudCArPSAxO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBzZWVuSXQgPSBjYXRlZ29yaXplU3RyaW5nMihzV29yZEdyb3VwLCBmYWxzZSwgc3BsaXRSdWxlcywgY250UmVjKTtcclxuICAgIGFkZENudFJlYyhjbnRSZWMsICdjbnROb25FeGFjdCcsIDEpO1xyXG4gICAgYWRkQ250UmVjKGNudFJlYywgJ2NudE5vbkV4YWN0UmVzJywgc2Vlbkl0Lmxlbmd0aCk7XHJcbiAgLy8gIGZ1enp5TGVuICs9IHNlZW5JdC5sZW5ndGg7XHJcbiAgLy8gIGZ1enp5Q250ICs9IDE7XHJcbiAgfVxyXG4gLy8gdG90YWxMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcclxuICBzZWVuSXQgPSBSYW5rV29yZC50YWtlRmlyc3ROKHNlZW5JdCwgQWxnb2wuVG9wX05fV29yZENhdGVnb3JpemF0aW9ucyk7XHJcbiAvLyByZXRhaW5lZENudCArPSBzZWVuSXQubGVuZ3RoO1xyXG4gIHJldHVybiBzZWVuSXQ7XHJcbn1cclxuXHJcbi8qIGlmIHdlIGhhdmUgYSAgXCJSdW4gbGlrZSB0aGUgV2luZFwiXHJcbiAgYW4gYSB1c2VyIHR5cGUgZnVuIGxpa2UgIGEgUmluZCAsIGFuZCBSaW5kIGlzIGFuIGV4YWN0IG1hdGNoLFxyXG4gIHdlIHdpbGwgbm90IHN0YXJ0IGxvb2tpbmcgZm9yIHRoZSBsb25nIHNlbnRlbmNlXHJcblxyXG4gIHRoaXMgaXMgdG8gYmUgZml4ZWQgYnkgXCJzcHJlYWRpbmdcIiB0aGUgcmFuZ2UgaW5kaWNhdGlvbiBhY2Nyb3NzIHZlcnkgc2ltaWxhciB3b3JkcyBpbiB0aGUgdmluY2luaXR5IG9mIHRoZVxyXG4gIHRhcmdldCB3b3Jkc1xyXG4qL1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNhdGVnb3JpemVXb3JkV2l0aE9mZnNldFdpdGhSYW5rQ3V0b2ZmKHNXb3JkR3JvdXA6IHN0cmluZywgc3BsaXRSdWxlcyA6IElNYXRjaC5TcGxpdFJ1bGVzLCBjbnRSZWM/IDogSUNudFJlYyApOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1JhbmdlZD4ge1xyXG4gIHZhciBzV29yZEdyb3VwTEMgPSBzV29yZEdyb3VwLnRvTG93ZXJDYXNlKCk7XHJcbiAgdmFyIHNlZW5JdCA9IGNhdGVnb3JpemVXb3JkSW50ZXJuYWxXaXRoT2Zmc2V0cyhzV29yZEdyb3VwLCBzV29yZEdyb3VwTEMsIHRydWUsIHNwbGl0UnVsZXMsIGNudFJlYyk7XHJcbiAgLy9jb25zb2xlLmxvZyhcIlNFRU5JVFwiICsgSlNPTi5zdHJpbmdpZnkoc2Vlbkl0KSk7XHJcbiAgLy90b3RhbENudCArPSAxO1xyXG4gIC8vIGV4YWN0TGVuICs9IHNlZW5JdC5sZW5ndGg7XHJcbiAgLy9jb25zb2xlLmxvZyhcImZpcnN0IHJ1biBleGFjdCBcIiArIEpTT04uc3RyaW5naWZ5KHNlZW5JdCkpO1xyXG4gIGFkZENudFJlYyhjbnRSZWMsICdjbnRDYXRFeGFjdCcsIDEpO1xyXG4gIGFkZENudFJlYyhjbnRSZWMsICdjbnRDYXRFeGFjdFJlcycsIHNlZW5JdC5sZW5ndGgpO1xyXG5cclxuICBpZiAoUmFua1dvcmQuaGFzQWJvdmUoc2Vlbkl0LCAwLjgpKSB7XHJcbiAgICBpZihjbnRSZWMpIHtcclxuICAgICAgYWRkQ250UmVjKGNudFJlYywgJ2V4YWN0UHJpb3JUYWtlJywgc2Vlbkl0Lmxlbmd0aClcclxuICAgIH1cclxuICAgIHNlZW5JdCA9IFJhbmtXb3JkLnRha2VBYm92ZShzZWVuSXQsIDAuOCk7XHJcbiAgICBpZihjbnRSZWMpIHtcclxuICAgICAgYWRkQ250UmVjKGNudFJlYywgJ2V4YWN0QWZ0ZXJUYWtlJywgc2Vlbkl0Lmxlbmd0aClcclxuICAgIH1cclxuICAgLy8gZXhhY3RDbnQgKz0gMTtcclxuICB9IGVsc2Uge1xyXG4gICAgc2Vlbkl0ID0gY2F0ZWdvcml6ZVdvcmRJbnRlcm5hbFdpdGhPZmZzZXRzKHNXb3JkR3JvdXAsIHNXb3JkR3JvdXBMQywgZmFsc2UsIHNwbGl0UnVsZXMsIGNudFJlYyk7XHJcbiAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Tm9uRXhhY3QnLCAxKTtcclxuICAgIGFkZENudFJlYyhjbnRSZWMsICdjbnROb25FeGFjdFJlcycsIHNlZW5JdC5sZW5ndGgpO1xyXG4gIC8vICBmdXp6eUxlbiArPSBzZWVuSXQubGVuZ3RoO1xyXG4gIC8vICBmdXp6eUNudCArPSAxO1xyXG4gIH1cclxuICAvLyB0b3RhbExlbiArPSBzZWVuSXQubGVuZ3RoO1xyXG4gIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQ/ICggYCR7c2Vlbkl0Lmxlbmd0aH0gd2l0aCAke3NlZW5JdC5yZWR1Y2UoIChwcmV2LG9iaikgPT4gcHJldiArIChvYmoucnVsZS5yYW5nZSA/IDEgOiAwKSwwKX0gcmFuZ2VkICFgKTogJy0nKTtcclxuLy8gIHZhciBjbnRSYW5nZWQgPSBzZWVuSXQucmVkdWNlKCAocHJldixvYmopID0+IHByZXYgKyAob2JqLnJ1bGUucmFuZ2UgPyAxIDogMCksMCk7XHJcbi8vICBjb25zb2xlLmxvZyhgKioqKioqKioqKiogJHtzZWVuSXQubGVuZ3RofSB3aXRoICR7Y250UmFuZ2VkfSByYW5nZWQgIWApO1xyXG5cclxuICBzZWVuSXQgPSBSYW5rV29yZC50YWtlRmlyc3ROKHNlZW5JdCwgQWxnb2wuVG9wX05fV29yZENhdGVnb3JpemF0aW9ucyk7XHJcbiAvLyByZXRhaW5lZENudCArPSBzZWVuSXQubGVuZ3RoO1xyXG4gIC8vY29uc29sZS5sb2coXCJmaW5hbCByZXMgb2YgY2F0ZWdvcml6ZVdvcmRXaXRoT2Zmc2V0V2l0aFJhbmtDdXRvZmZcIiArIEpTT04uc3RyaW5naWZ5KHNlZW5JdCkpO1xyXG5cclxuICByZXR1cm4gc2Vlbkl0O1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNhdGVnb3JpemVXb3JkV2l0aE9mZnNldFdpdGhSYW5rQ3V0b2ZmU2luZ2xlKHdvcmQ6IHN0cmluZywgcnVsZTogSU1hdGNoLm1SdWxlKTogSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdSYW5nZWQge1xyXG4gIHZhciBsY3dvcmQgPSB3b3JkLnRvTG93ZXJDYXNlKCk7XHJcblxyXG4gIGlmKGxjd29yZCA9PT0gcnVsZS5sb3dlcmNhc2V3b3JkKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzdHJpbmc6IHdvcmQsXHJcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IHJ1bGUubWF0Y2hlZFN0cmluZyxcclxuICAgICAgICAgICAgY2F0ZWdvcnk6IHJ1bGUuY2F0ZWdvcnksXHJcbiAgICAgICAgICAgIHJ1bGU6IHJ1bGUsXHJcbiAgICAgICAgICAgIF9yYW5raW5nOiBydWxlLl9yYW5raW5nIHx8IDEuMFxyXG4gICAgICAgICAgfTtcclxuICB9XHJcblxyXG4gIHZhciByZXM6IEFycmF5PElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdSYW5nZWQ+ID0gW11cclxuICBjaGVja09uZVJ1bGVXaXRoT2Zmc2V0KHdvcmQsbGN3b3JkLGZhbHNlLHJlcyxydWxlKTtcclxuICBkZWJ1Z2xvZyhcImNhdFdXT1dSQ1MgXCIgKyBsY3dvcmQpO1xyXG4gIGlmKHJlcy5sZW5ndGgpIHtcclxuICAgIHJldHVybiByZXNbMF07XHJcbiAgfVxyXG4gIHJldHVybiB1bmRlZmluZWQ7XHJcbn1cclxuXHJcblxyXG5cclxuLypcclxuZXhwb3J0IGZ1bmN0aW9uIGR1bXBDbnQoKSB7XHJcbiAgY29uc29sZS5sb2coYFxyXG5leGFjdExlbiA9ICR7ZXhhY3RMZW59O1xyXG5leGFjdENudCA9ICR7ZXhhY3RDbnR9O1xyXG5mdXp6eUxlbiA9ICR7ZnV6enlMZW59O1xyXG5mdXp6eUNudCA9ICR7ZnV6enlDbnR9O1xyXG50b3RhbENudCA9ICR7dG90YWxDbnR9O1xyXG50b3RhbExlbiA9ICR7dG90YWxMZW59O1xyXG5yZXRhaW5lZExlbiA9ICR7cmV0YWluZWRDbnR9O1xyXG4gIGApO1xyXG59XHJcbiovXHJcblxyXG4vKlxyXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkU2VudGVuY2Uob1NlbnRlbmNlOiBJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdW10pOiBib29sZWFuIHtcclxuICByZXR1cm4gb1NlbnRlbmNlLmV2ZXJ5KGZ1bmN0aW9uIChvV29yZEdyb3VwKSB7XHJcbiAgICByZXR1cm4gKG9Xb3JkR3JvdXAubGVuZ3RoID4gMCk7XHJcbiAgfSk7XHJcbn1cclxuXHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZChhcnI6IElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11bXVtdKTogSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXVtdW10ge1xyXG4gIHJldHVybiBhcnIuZmlsdGVyKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcclxuICAgIHJldHVybiBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWRTZW50ZW5jZShvU2VudGVuY2UpO1xyXG4gIH0pO1xyXG59XHJcbiovXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZUFXb3JkKHNXb3JkR3JvdXA6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCBzZW50ZW5jZTogc3RyaW5nLCB3b3JkczogeyBba2V5OiBzdHJpbmddOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz59LFxyXG5jbnRSZWMgPyA6IElDbnRSZWMgKSA6IElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXSB7XHJcbiAgdmFyIHNlZW5JdCA9IHdvcmRzW3NXb3JkR3JvdXBdO1xyXG4gIGlmIChzZWVuSXQgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgc2Vlbkl0ID0gY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZihzV29yZEdyb3VwLCBydWxlcywgY250UmVjKTtcclxuICAgIHV0aWxzLmRlZXBGcmVlemUoc2Vlbkl0KTtcclxuICAgIHdvcmRzW3NXb3JkR3JvdXBdID0gc2Vlbkl0O1xyXG4gIH1cclxuICBpZiAoIXNlZW5JdCB8fCBzZWVuSXQubGVuZ3RoID09PSAwKSB7XHJcbiAgICBsb2dnZXIoXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBcXFwiXCIgKyBzV29yZEdyb3VwICsgXCJcXFwiIGluIHNlbnRlbmNlIFxcXCJcIlxyXG4gICAgICArIHNlbnRlbmNlICsgXCJcXFwiXCIpO1xyXG4gICAgaWYgKHNXb3JkR3JvdXAuaW5kZXhPZihcIiBcIikgPD0gMCkge1xyXG4gICAgICBkZWJ1Z2xvZyhcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIHByaW1pdGl2ZSAoISlcIiArIHNXb3JkR3JvdXApO1xyXG4gICAgfVxyXG4gICAgZGVidWdsb2coXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBcIiArIHNXb3JkR3JvdXApO1xyXG4gICAgaWYgKCFzZWVuSXQpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0aW5nIGVtdHB5IGxpc3QsIG5vdCB1bmRlZmluZWQgZm9yIFxcXCJcIiArIHNXb3JkR3JvdXAgKyBcIlxcXCJcIilcclxuICAgIH1cclxuICAgIHdvcmRzW3NXb3JkR3JvdXBdID0gW11cclxuICAgIHJldHVybiBbXTtcclxuICB9XHJcbiAgcmV0dXJuIHV0aWxzLmNsb25lRGVlcChzZWVuSXQpO1xyXG59XHJcblxyXG5cclxuLyoqXHJcbiAqIEdpdmVuIGEgIHN0cmluZywgYnJlYWsgaXQgZG93biBpbnRvIGNvbXBvbmVudHMsXHJcbiAqIFtbJ0EnLCAnQiddLCBbJ0EgQiddXVxyXG4gKlxyXG4gKiB0aGVuIGNhdGVnb3JpemVXb3Jkc1xyXG4gKiByZXR1cm5pbmdcclxuICpcclxuICogWyBbWyB7IGNhdGVnb3J5OiAnc3lzdGVtSWQnLCB3b3JkIDogJ0EnfSxcclxuICogICAgICB7IGNhdGVnb3J5OiAnb3RoZXJ0aGluZycsIHdvcmQgOiAnQSd9XHJcbiAqICAgIF0sXHJcbiAqICAgIC8vIHJlc3VsdCBvZiBCXHJcbiAqICAgIFsgeyBjYXRlZ29yeTogJ3N5c3RlbUlkJywgd29yZCA6ICdCJ30sXHJcbiAqICAgICAgeyBjYXRlZ29yeTogJ290aGVydGhpbmcnLCB3b3JkIDogJ0EnfVxyXG4gKiAgICAgIHsgY2F0ZWdvcnk6ICdhbm90aGVydHJ5cCcsIHdvcmQgOiAnQid9XHJcbiAqICAgIF1cclxuICogICBdLFxyXG4gKiBdXV1cclxuICpcclxuICpcclxuICpcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBhbmFseXplU3RyaW5nKHNTdHJpbmc6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLFxyXG4gIHdvcmRzPzogeyBba2V5OiBzdHJpbmddOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4gfSlcclxuICA6IFsgWyBJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11dIF1cclxuICAge1xyXG4gIHZhciBjbnQgPSAwO1xyXG4gIHZhciBmYWMgPSAxO1xyXG4gIHZhciB1ID0gYnJlYWtkb3duLmJyZWFrZG93blN0cmluZyhzU3RyaW5nLCBBbGdvbC5NYXhTcGFjZXNQZXJDb21iaW5lZFdvcmQpO1xyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nKFwiaGVyZSBicmVha2Rvd25cIiArIEpTT04uc3RyaW5naWZ5KHUpKTtcclxuICB9XHJcbiAgLy9jb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeSh1KSk7XHJcbiAgd29yZHMgPSB3b3JkcyB8fCB7fTtcclxuICBkZWJ1Z3BlcmYoJ3RoaXMgbWFueSBrbm93biB3b3JkczogJyArIE9iamVjdC5rZXlzKHdvcmRzKS5sZW5ndGgpO1xyXG4gIHZhciByZXMgPSBbXSBhcyBbWyBJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11dIF07XHJcbiAgdmFyIGNudFJlYyA9IHt9O1xyXG4gIHUuZm9yRWFjaChmdW5jdGlvbiAoYUJyZWFrRG93blNlbnRlbmNlKSB7XHJcbiAgICAgIHZhciBjYXRlZ29yaXplZFNlbnRlbmNlID0gW10gYXMgWyBJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW10gXTtcclxuICAgICAgdmFyIGlzVmFsaWQgPSBhQnJlYWtEb3duU2VudGVuY2UuZXZlcnkoZnVuY3Rpb24gKHNXb3JkR3JvdXA6IHN0cmluZywgaW5kZXggOiBudW1iZXIpIHtcclxuICAgICAgICB2YXIgc2Vlbkl0ID0gY2F0ZWdvcml6ZUFXb3JkKHNXb3JkR3JvdXAsIHJ1bGVzLCBzU3RyaW5nLCB3b3JkcywgY250UmVjKTtcclxuICAgICAgICBpZihzZWVuSXQubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhdGVnb3JpemVkU2VudGVuY2VbaW5kZXhdID0gc2Vlbkl0O1xyXG4gICAgICAgIGNudCA9IGNudCArIHNlZW5JdC5sZW5ndGg7XHJcbiAgICAgICAgZmFjID0gZmFjICogc2Vlbkl0Lmxlbmd0aDtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgfSk7XHJcbiAgICAgIGlmKGlzVmFsaWQpIHtcclxuICAgICAgICByZXMucHVzaChjYXRlZ29yaXplZFNlbnRlbmNlKTtcclxuICAgICAgfVxyXG4gIH0pO1xyXG4gIGRlYnVnbG9nKFwiIHNlbnRlbmNlcyBcIiArIHUubGVuZ3RoICsgXCIgbWF0Y2hlcyBcIiArIGNudCArIFwiIGZhYzogXCIgKyBmYWMpO1xyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQgJiYgdS5sZW5ndGgpIHtcclxuICAgIGRlYnVnbG9nKFwiZmlyc3QgbWF0Y2ggXCIrIEpTT04uc3RyaW5naWZ5KHUsdW5kZWZpbmVkLDIpKTtcclxuICB9XHJcbiAgZGVidWdwZXJmKFwiIHNlbnRlbmNlcyBcIiArIHUubGVuZ3RoICsgXCIgLyBcIiArIHJlcy5sZW5ndGggKyAgXCIgbWF0Y2hlcyBcIiArIGNudCArIFwiIGZhYzogXCIgKyBmYWMgKyBcIiByZWMgOiBcIiArIEpTT04uc3RyaW5naWZ5KGNudFJlYyx1bmRlZmluZWQsMikpO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZUFXb3JkV2l0aE9mZnNldHMoc1dvcmRHcm91cDogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHNlbnRlbmNlOiBzdHJpbmcsIHdvcmRzOiB7IFtrZXk6IHN0cmluZ106IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPn0sXHJcbmNudFJlYyA/IDogSUNudFJlYyApIDogSU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1JhbmdlZFtdIHtcclxuICB2YXIgc2Vlbkl0ID0gd29yZHNbc1dvcmRHcm91cF07XHJcbiAgaWYgKHNlZW5JdCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICBzZWVuSXQgPSBjYXRlZ29yaXplV29yZFdpdGhPZmZzZXRXaXRoUmFua0N1dG9mZihzV29yZEdyb3VwLCBydWxlcywgY250UmVjKTtcclxuICAgIHV0aWxzLmRlZXBGcmVlemUoc2Vlbkl0KTtcclxuICAgIHdvcmRzW3NXb3JkR3JvdXBdID0gc2Vlbkl0O1xyXG4gIH1cclxuICBpZiAoIXNlZW5JdCB8fCBzZWVuSXQubGVuZ3RoID09PSAwKSB7XHJcbiAgICBsb2dnZXIoXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBcXFwiXCIgKyBzV29yZEdyb3VwICsgXCJcXFwiIGluIHNlbnRlbmNlIFxcXCJcIlxyXG4gICAgICArIHNlbnRlbmNlICsgXCJcXFwiXCIpO1xyXG4gICAgaWYgKHNXb3JkR3JvdXAuaW5kZXhPZihcIiBcIikgPD0gMCkge1xyXG4gICAgICBkZWJ1Z2xvZyhcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIHByaW1pdGl2ZSAoISlcIiArIHNXb3JkR3JvdXApO1xyXG4gICAgfVxyXG4gICAgZGVidWdsb2coXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBcIiArIHNXb3JkR3JvdXApO1xyXG4gICAgaWYgKCFzZWVuSXQpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0aW5nIGVtdHB5IGxpc3QsIG5vdCB1bmRlZmluZWQgZm9yIFxcXCJcIiArIHNXb3JkR3JvdXAgKyBcIlxcXCJcIilcclxuICAgIH1cclxuICAgIHdvcmRzW3NXb3JkR3JvdXBdID0gW11cclxuICAgIHJldHVybiBbXTtcclxuICB9XHJcbiAgcmV0dXJuIHV0aWxzLmNsb25lRGVlcChzZWVuSXQpO1xyXG59XHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcbi8qXHJcblsgW2EsYl0sIFtjLGRdXVxyXG5cclxuMDAgYVxyXG4wMSBiXHJcbjEwIGNcclxuMTEgZFxyXG4xMiBjXHJcbiovXHJcblxyXG5cclxuY29uc3QgY2xvbmUgPSB1dGlscy5jbG9uZURlZXA7XHJcblxyXG5cclxuZnVuY3Rpb24gY29weVZlY01lbWJlcnModSkge1xyXG4gIHZhciBpID0gMDtcclxuICBmb3IoaSA9IDA7IGkgPCB1Lmxlbmd0aDsgKytpKSB7XHJcbiAgICB1W2ldID0gY2xvbmUodVtpXSk7XHJcbiAgfVxyXG4gIHJldHVybiB1O1xyXG59XHJcbi8vIHdlIGNhbiByZXBsaWNhdGUgdGhlIHRhaWwgb3IgdGhlIGhlYWQsXHJcbi8vIHdlIHJlcGxpY2F0ZSB0aGUgdGFpbCBhcyBpdCBpcyBzbWFsbGVyLlxyXG5cclxuLy8gW2EsYixjIF1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBleHBhbmRNYXRjaEFycihkZWVwOiBBcnJheTxBcnJheTxhbnk+Pik6IEFycmF5PEFycmF5PGFueT4+IHtcclxuICB2YXIgYSA9IFtdO1xyXG4gIHZhciBsaW5lID0gW107XHJcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IEpTT04uc3RyaW5naWZ5KGRlZXApIDogJy0nKTtcclxuICBkZWVwLmZvckVhY2goZnVuY3Rpb24gKHVCcmVha0Rvd25MaW5lLCBpSW5kZXg6IG51bWJlcikge1xyXG4gICAgbGluZVtpSW5kZXhdID0gW107XHJcbiAgICB1QnJlYWtEb3duTGluZS5mb3JFYWNoKGZ1bmN0aW9uIChhV29yZEdyb3VwLCB3Z0luZGV4OiBudW1iZXIpIHtcclxuICAgICAgbGluZVtpSW5kZXhdW3dnSW5kZXhdID0gW107XHJcbiAgICAgIGFXb3JkR3JvdXAuZm9yRWFjaChmdW5jdGlvbiAob1dvcmRWYXJpYW50LCBpV1ZJbmRleDogbnVtYmVyKSB7XHJcbiAgICAgICAgbGluZVtpSW5kZXhdW3dnSW5kZXhdW2lXVkluZGV4XSA9IG9Xb3JkVmFyaWFudDtcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9KVxyXG4gIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyBKU09OLnN0cmluZ2lmeShsaW5lKSA6ICctJyk7XHJcbiAgdmFyIHJlcyA9IFtdO1xyXG4gIHZhciBudmVjcyA9IFtdO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZS5sZW5ndGg7ICsraSkge1xyXG4gICAgdmFyIHZlY3MgPSBbW11dO1xyXG4gICAgdmFyIG52ZWNzID0gW107XHJcbiAgICB2YXIgcnZlYyA9IFtdO1xyXG4gICAgZm9yICh2YXIgayA9IDA7IGsgPCBsaW5lW2ldLmxlbmd0aDsgKytrKSB7IC8vIHdvcmRncm91cCBrXHJcbiAgICAgIC8vdmVjcyBpcyB0aGUgdmVjdG9yIG9mIGFsbCBzbyBmYXIgc2VlbiB2YXJpYW50cyB1cCB0byBrIHdncy5cclxuICAgICAgdmFyIG5leHRCYXNlID0gW107XHJcbiAgICAgIGZvciAodmFyIGwgPSAwOyBsIDwgbGluZVtpXVtrXS5sZW5ndGg7ICsrbCkgeyAvLyBmb3IgZWFjaCB2YXJpYW50XHJcbiAgICAgICAgLy9kZWJ1Z2xvZyhcInZlY3Mgbm93XCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzKSk7XHJcbiAgICAgICAgbnZlY3MgPSBbXTsgLy92ZWNzLnNsaWNlKCk7IC8vIGNvcHkgdGhlIHZlY1tpXSBiYXNlIHZlY3RvcjtcclxuICAgICAgICAvL2RlYnVnbG9nKFwidmVjcyBjb3BpZWQgbm93XCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpO1xyXG4gICAgICAgIGZvciAodmFyIHUgPSAwOyB1IDwgdmVjcy5sZW5ndGg7ICsrdSkge1xyXG4gICAgICAgICAgbnZlY3NbdV0gPSB2ZWNzW3VdLnNsaWNlKCk7IC8vXHJcbiAgICAgICAgICBudmVjc1t1XSA9IGNvcHlWZWNNZW1iZXJzKG52ZWNzW3VdKTtcclxuICAgICAgICAgIC8vIGRlYnVnbG9nKFwiY29waWVkIHZlY3NbXCIrIHUrXCJdXCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzW3VdKSk7XHJcbiAgICAgICAgICBudmVjc1t1XS5wdXNoKFxyXG4gICAgICAgICAgICBjbG9uZShsaW5lW2ldW2tdW2xdKSk7IC8vIHB1c2ggdGhlIGx0aCB2YXJpYW50XHJcbiAgICAgICAgICAvLyBkZWJ1Z2xvZyhcIm5vdyBudmVjcyBcIiArIG52ZWNzLmxlbmd0aCArIFwiIFwiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gICBkZWJ1Z2xvZyhcIiBhdCAgICAgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbmV4dGJhc2UgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxyXG4gICAgICAgIC8vICAgZGVidWdsb2coXCIgYXBwZW5kIFwiICsgayArIFwiOlwiICsgbCArIFwiIG52ZWNzICAgID5cIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSlcclxuICAgICAgICBuZXh0QmFzZSA9IG5leHRCYXNlLmNvbmNhdChudmVjcyk7XHJcbiAgICAgICAgLy8gICBkZWJ1Z2xvZyhcIiAgcmVzdWx0IFwiICsgayArIFwiOlwiICsgbCArIFwiIG52ZWNzICAgID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcclxuICAgICAgfSAvL2NvbnN0cnVcclxuICAgICAgLy8gIGRlYnVnbG9nKFwibm93IGF0IFwiICsgayArIFwiOlwiICsgbCArIFwiID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcclxuICAgICAgdmVjcyA9IG5leHRCYXNlO1xyXG4gICAgfVxyXG4gICAgZGVidWdsb2dWKGRlYnVnbG9nVi5lbmFibGVkID8gKFwiQVBQRU5ESU5HIFRPIFJFU1wiICsgaSArIFwiOlwiICsgbCArIFwiID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSkgOiAnLScpO1xyXG4gICAgcmVzID0gcmVzLmNvbmNhdCh2ZWNzKTtcclxuICB9XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuXHJcbi8qKlxyXG4gKiBDYWxjdWxhdGUgYSB3ZWlnaHQgZmFjdG9yIGZvciBhIGdpdmVuIGRpc3RhbmNlIGFuZFxyXG4gKiBjYXRlZ29yeVxyXG4gKiBAcGFyYW0ge2ludGVnZXJ9IGRpc3QgZGlzdGFuY2UgaW4gd29yZHNcclxuICogQHBhcmFtIHtzdHJpbmd9IGNhdGVnb3J5IGNhdGVnb3J5IHRvIHVzZVxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBhIGRpc3RhbmNlIGZhY3RvciA+PSAxXHJcbiAqICAxLjAgZm9yIG5vIGVmZmVjdFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlaW5mb3JjZURpc3RXZWlnaHQoZGlzdDogbnVtYmVyLCBjYXRlZ29yeTogc3RyaW5nKTogbnVtYmVyIHtcclxuICB2YXIgYWJzID0gTWF0aC5hYnMoZGlzdCk7XHJcbiAgcmV0dXJuIDEuMCArIChBbGdvbC5hUmVpbmZvcmNlRGlzdFdlaWdodFthYnNdIHx8IDApO1xyXG59XHJcblxyXG4vKipcclxuICogR2l2ZW4gYSBzZW50ZW5jZSwgZXh0YWN0IGNhdGVnb3JpZXNcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0Q2F0ZWdvcnlNYXAob1NlbnRlbmNlOiBBcnJheTxJRk1hdGNoLklXb3JkPik6IHsgW2tleTogc3RyaW5nXTogQXJyYXk8eyBwb3M6IG51bWJlciB9PiB9IHtcclxuICB2YXIgcmVzID0ge307XHJcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/ICgnZXh0cmFjdENhdGVnb3J5TWFwICcgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpKSA6ICctJyk7XHJcbiAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpSW5kZXgpIHtcclxuICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gSUZNYXRjaC5DQVRfQ0FURUdPUlkpIHtcclxuICAgICAgcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddID0gcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddIHx8IFtdO1xyXG4gICAgICByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10ucHVzaCh7IHBvczogaUluZGV4IH0pO1xyXG4gICAgfVxyXG4gIH0pO1xyXG4gIHV0aWxzLmRlZXBGcmVlemUocmVzKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVpbkZvcmNlU2VudGVuY2Uob1NlbnRlbmNlKSB7XHJcbiAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgdmFyIG9DYXRlZ29yeU1hcCA9IGV4dHJhY3RDYXRlZ29yeU1hcChvU2VudGVuY2UpO1xyXG4gIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaUluZGV4KSB7XHJcbiAgICB2YXIgbSA9IG9DYXRlZ29yeU1hcFtvV29yZC5jYXRlZ29yeV0gfHwgW107XHJcbiAgICBtLmZvckVhY2goZnVuY3Rpb24gKG9Qb3NpdGlvbjogeyBwb3M6IG51bWJlciB9KSB7XHJcbiAgICAgIFwidXNlIHN0cmljdFwiO1xyXG4gICAgICBvV29yZC5yZWluZm9yY2UgPSBvV29yZC5yZWluZm9yY2UgfHwgMTtcclxuICAgICAgdmFyIGJvb3N0ID0gcmVpbmZvcmNlRGlzdFdlaWdodChpSW5kZXggLSBvUG9zaXRpb24ucG9zLCBvV29yZC5jYXRlZ29yeSk7XHJcbiAgICAgIG9Xb3JkLnJlaW5mb3JjZSAqPSBib29zdDtcclxuICAgICAgb1dvcmQuX3JhbmtpbmcgKj0gYm9vc3Q7XHJcbiAgICB9KTtcclxuICB9KTtcclxuICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGlJbmRleCkge1xyXG4gICAgaWYgKGlJbmRleCA+IDAgKSB7XHJcbiAgICAgIGlmIChvU2VudGVuY2VbaUluZGV4LTFdLmNhdGVnb3J5ID09PSBcIm1ldGFcIiAgJiYgKG9Xb3JkLmNhdGVnb3J5ID09PSBvU2VudGVuY2VbaUluZGV4LTFdLm1hdGNoZWRTdHJpbmcpICkge1xyXG4gICAgICAgIG9Xb3JkLnJlaW5mb3JjZSA9IG9Xb3JkLnJlaW5mb3JjZSB8fCAxO1xyXG4gICAgICAgIHZhciBib29zdCA9IHJlaW5mb3JjZURpc3RXZWlnaHQoMSwgb1dvcmQuY2F0ZWdvcnkpO1xyXG4gICAgICAgIG9Xb3JkLnJlaW5mb3JjZSAqPSBib29zdDtcclxuICAgICAgICBvV29yZC5fcmFua2luZyAqPSBib29zdDtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0pO1xyXG4gIHJldHVybiBvU2VudGVuY2U7XHJcbn1cclxuXHJcblxyXG5pbXBvcnQgKiBhcyBTZW50ZW5jZSBmcm9tICcuL3NlbnRlbmNlJztcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWluRm9yY2UoYUNhdGVnb3JpemVkQXJyYXkpIHtcclxuICBcInVzZSBzdHJpY3RcIjtcclxuICBhQ2F0ZWdvcml6ZWRBcnJheS5mb3JFYWNoKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcclxuICAgIHJlaW5Gb3JjZVNlbnRlbmNlKG9TZW50ZW5jZSk7XHJcbiAgfSlcclxuICBhQ2F0ZWdvcml6ZWRBcnJheS5zb3J0KFNlbnRlbmNlLmNtcFJhbmtpbmdQcm9kdWN0KTtcclxuICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZyhcImFmdGVyIHJlaW5mb3JjZVwiICsgYUNhdGVnb3JpemVkQXJyYXkubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcclxuICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XHJcbiAgICB9KS5qb2luKFwiXFxuXCIpKTtcclxuICB9XHJcbiAgcmV0dXJuIGFDYXRlZ29yaXplZEFycmF5O1xyXG59XHJcblxyXG5cclxuLy8vIGJlbG93IG1heSBubyBsb25nZXIgYmUgdXNlZFxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVnRXhwKG9SdWxlOiBJUnVsZSwgY29udGV4dDogSUZNYXRjaC5jb250ZXh0LCBvcHRpb25zPzogSU1hdGNoT3B0aW9ucykge1xyXG4gIGlmIChjb250ZXh0W29SdWxlLmtleV0gPT09IHVuZGVmaW5lZCkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICB9XHJcbiAgdmFyIHNLZXkgPSBvUnVsZS5rZXk7XHJcbiAgdmFyIHMxID0gY29udGV4dFtvUnVsZS5rZXldLnRvTG93ZXJDYXNlKClcclxuICB2YXIgcmVnID0gb1J1bGUucmVnZXhwO1xyXG5cclxuICB2YXIgbSA9IHJlZy5leGVjKHMxKTtcclxuICBpZihkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xyXG4gICAgZGVidWdsb2dWKFwiYXBwbHlpbmcgcmVnZXhwOiBcIiArIHMxICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XHJcbiAgfVxyXG4gIGlmICghbSkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICB9XHJcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cclxuICB2YXIgZGVsdGEgPSBjb21wYXJlQ29udGV4dChjb250ZXh0LCBvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpXHJcbiAgaWYgKGRlYnVnbG9nVi5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZ1YoSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcclxuICAgIGRlYnVnbG9nVihKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XHJcbiAgfVxyXG4gIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gIH1cclxuICB2YXIgb0V4dHJhY3RlZENvbnRleHQgPSBleHRyYWN0QXJnc01hcChtLCBvUnVsZS5hcmdzTWFwKTtcclxuICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nVihcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUuYXJnc01hcCkpO1xyXG4gICAgZGVidWdsb2dWKFwibWF0Y2ggXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XHJcbiAgICBkZWJ1Z2xvZ1YoXCJleHRyYWN0ZWQgYXJncyBcIiArIEpTT04uc3RyaW5naWZ5KG9FeHRyYWN0ZWRDb250ZXh0KSk7XHJcbiAgfVxyXG4gIHZhciByZXMgPSBBbnlPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKSBhcyBhbnk7XHJcbiAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9FeHRyYWN0ZWRDb250ZXh0KTtcclxuICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgY29udGV4dCk7XHJcbiAgaWYgKG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldICE9PSB1bmRlZmluZWQpIHtcclxuICAgIHJlc1tzS2V5XSA9IG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldO1xyXG4gIH1cclxuICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xyXG4gICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xyXG4gICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9FeHRyYWN0ZWRDb250ZXh0KVxyXG4gIH1cclxuICBPYmplY3QuZnJlZXplKHJlcyk7XHJcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/ICgnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSkgOiAnLScpO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzb3J0QnlXZWlnaHQoc0tleTogc3RyaW5nLCBvQ29udGV4dEE6IElGTWF0Y2guY29udGV4dCwgb0NvbnRleHRCOiBJRk1hdGNoLmNvbnRleHQpOiBudW1iZXIge1xyXG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZ1YoJ3NvcnRpbmc6ICcgKyBzS2V5ICsgJ2ludm9rZWQgd2l0aFxcbiAxOicgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEEsIHVuZGVmaW5lZCwgMikgK1xyXG4gICAgXCIgdnMgXFxuIDI6XCIgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEIsIHVuZGVmaW5lZCwgMikpO1xyXG4gIH1cclxuICB2YXIgcmFua2luZ0E6IG51bWJlciA9IHBhcnNlRmxvYXQob0NvbnRleHRBW1wiX3JhbmtpbmdcIl0gfHwgXCIxXCIpO1xyXG4gIHZhciByYW5raW5nQjogbnVtYmVyID0gcGFyc2VGbG9hdChvQ29udGV4dEJbXCJfcmFua2luZ1wiXSB8fCBcIjFcIik7XHJcbiAgaWYgKHJhbmtpbmdBICE9PSByYW5raW5nQikge1xyXG4gICAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgICBkZWJ1Z2xvZyhcIiByYW5raW4gZGVsdGFcIiArIDEwMCAqIChyYW5raW5nQiAtIHJhbmtpbmdBKSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gMTAwICogKHJhbmtpbmdCIC0gcmFua2luZ0EpXHJcbiAgfVxyXG5cclxuICB2YXIgd2VpZ2h0QSA9IG9Db250ZXh0QVtcIl93ZWlnaHRcIl0gJiYgb0NvbnRleHRBW1wiX3dlaWdodFwiXVtzS2V5XSB8fCAwO1xyXG4gIHZhciB3ZWlnaHRCID0gb0NvbnRleHRCW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdW3NLZXldIHx8IDA7XHJcbiAgcmV0dXJuICsod2VpZ2h0QiAtIHdlaWdodEEpO1xyXG59XHJcblxyXG5cclxuLy8gV29yZCwgU3lub255bSwgUmVnZXhwIC8gRXh0cmFjdGlvblJ1bGVcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhdWdtZW50Q29udGV4dDEoY29udGV4dDogSUZNYXRjaC5jb250ZXh0LCBvUnVsZXM6IEFycmF5PElSdWxlPiwgb3B0aW9uczogSU1hdGNoT3B0aW9ucyk6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIHZhciBzS2V5ID0gb1J1bGVzWzBdLmtleTtcclxuICAvLyBjaGVjayB0aGF0IHJ1bGVcclxuICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgLy8gY2hlY2sgY29uc2lzdGVuY3lcclxuICAgIG9SdWxlcy5ldmVyeShmdW5jdGlvbiAoaVJ1bGUpIHtcclxuICAgICAgaWYgKGlSdWxlLmtleSAhPT0gc0tleSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkluaG9tb2dlbm91cyBrZXlzIGluIHJ1bGVzLCBleHBlY3RlZCBcIiArIHNLZXkgKyBcIiB3YXMgXCIgKyBKU09OLnN0cmluZ2lmeShpUnVsZSkpO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvLyBsb29rIGZvciBydWxlcyB3aGljaCBtYXRjaFxyXG4gIHZhciByZXMgPSBvUnVsZXMubWFwKGZ1bmN0aW9uIChvUnVsZSkge1xyXG4gICAgLy8gaXMgdGhpcyBydWxlIGFwcGxpY2FibGVcclxuICAgIHN3aXRjaCAob1J1bGUudHlwZSkge1xyXG4gICAgICBjYXNlIElGTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQ6XHJcbiAgICAgICAgcmV0dXJuIG1hdGNoV29yZChvUnVsZSwgY29udGV4dCwgb3B0aW9ucylcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5SRUdFWFA6XHJcbiAgICAgICAgcmV0dXJuIG1hdGNoUmVnRXhwKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKTtcclxuICAgICAgLy8gICBjYXNlIFwiRXh0cmFjdGlvblwiOlxyXG4gICAgICAvLyAgICAgcmV0dXJuIG1hdGNoRXh0cmFjdGlvbihvUnVsZSxjb250ZXh0KTtcclxuICAgIH1cclxuICAgIHJldHVybiB1bmRlZmluZWRcclxuICB9KS5maWx0ZXIoZnVuY3Rpb24gKG9yZXMpIHtcclxuICAgIHJldHVybiAhIW9yZXNcclxuICB9KS5zb3J0KFxyXG4gICAgc29ydEJ5V2VpZ2h0LmJpbmQodGhpcywgc0tleSlcclxuICAgICk7XHJcbiAgICAvL2RlYnVnbG9nKFwiaGFzc29ydGVkXCIgKyBKU09OLnN0cmluZ2lmeShyZXMsdW5kZWZpbmVkLDIpKTtcclxuICByZXR1cm4gcmVzO1xyXG4gIC8vIE9iamVjdC5rZXlzKCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xyXG4gIC8vIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXVnbWVudENvbnRleHQoY29udGV4dDogSUZNYXRjaC5jb250ZXh0LCBhUnVsZXM6IEFycmF5PElSdWxlPik6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG5cclxuICB2YXIgb3B0aW9uczE6IElNYXRjaE9wdGlvbnMgPSB7XHJcbiAgICBtYXRjaG90aGVyczogdHJ1ZSxcclxuICAgIG92ZXJyaWRlOiBmYWxzZVxyXG4gIH0gYXMgSU1hdGNoT3B0aW9ucztcclxuXHJcbiAgdmFyIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMSlcclxuXHJcbiAgaWYgKGFSZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICB2YXIgb3B0aW9uczI6IElNYXRjaE9wdGlvbnMgPSB7XHJcbiAgICAgIG1hdGNob3RoZXJzOiBmYWxzZSxcclxuICAgICAgb3ZlcnJpZGU6IHRydWVcclxuICAgIH0gYXMgSU1hdGNoT3B0aW9ucztcclxuICAgIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMik7XHJcbiAgfVxyXG4gIHJldHVybiBhUmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gaW5zZXJ0T3JkZXJlZChyZXN1bHQ6IEFycmF5PElGTWF0Y2guY29udGV4dD4sIGlJbnNlcnRlZE1lbWJlcjogSUZNYXRjaC5jb250ZXh0LCBsaW1pdDogbnVtYmVyKTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgLy8gVE9ETzogdXNlIHNvbWUgd2VpZ2h0XHJcbiAgaWYgKHJlc3VsdC5sZW5ndGggPCBsaW1pdCkge1xyXG4gICAgcmVzdWx0LnB1c2goaUluc2VydGVkTWVtYmVyKVxyXG4gIH1cclxuICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHRha2VUb3BOKGFycjogQXJyYXk8QXJyYXk8SUZNYXRjaC5jb250ZXh0Pj4pOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICB2YXIgdSA9IGFyci5maWx0ZXIoZnVuY3Rpb24gKGlubmVyQXJyKSB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwIH0pXHJcblxyXG4gIHZhciByZXMgPSBbXTtcclxuICAvLyBzaGlmdCBvdXQgdGhlIHRvcCBvbmVzXHJcbiAgdSA9IHUubWFwKGZ1bmN0aW9uIChpQXJyKSB7XHJcbiAgICB2YXIgdG9wID0gaUFyci5zaGlmdCgpO1xyXG4gICAgcmVzID0gaW5zZXJ0T3JkZXJlZChyZXMsIHRvcCwgNSlcclxuICAgIHJldHVybiBpQXJyXHJcbiAgfSkuZmlsdGVyKGZ1bmN0aW9uIChpbm5lckFycjogQXJyYXk8SUZNYXRjaC5jb250ZXh0Pik6IGJvb2xlYW4geyByZXR1cm4gaW5uZXJBcnIubGVuZ3RoID4gMCB9KTtcclxuICAvLyBhcyBBcnJheTxBcnJheTxJRk1hdGNoLmNvbnRleHQ+PlxyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmltcG9ydCAqIGFzIGlucHV0RmlsdGVyUnVsZXMgZnJvbSAnLi9pbnB1dEZpbHRlclJ1bGVzJztcclxuXHJcbnZhciBybTtcclxuXHJcbmZ1bmN0aW9uIGdldFJNT25jZSgpIHtcclxuICBpZiAoIXJtKSB7XHJcbiAgICBybSA9IGlucHV0RmlsdGVyUnVsZXMuZ2V0UnVsZU1hcCgpXHJcbiAgfVxyXG4gIHJldHVybiBybTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UnVsZXMoY29udGV4dDogSUZNYXRjaC5jb250ZXh0KTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgdmFyIGJlc3ROOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+ID0gW2NvbnRleHRdO1xyXG4gIGlucHV0RmlsdGVyUnVsZXMub0tleU9yZGVyLmZvckVhY2goZnVuY3Rpb24gKHNLZXk6IHN0cmluZykge1xyXG4gICAgdmFyIGJlc3ROZXh0OiBBcnJheTxBcnJheTxJRk1hdGNoLmNvbnRleHQ+PiA9IFtdO1xyXG4gICAgYmVzdE4uZm9yRWFjaChmdW5jdGlvbiAob0NvbnRleHQ6IElGTWF0Y2guY29udGV4dCkge1xyXG4gICAgICBpZiAob0NvbnRleHRbc0tleV0pIHtcclxuICAgICAgICBkZWJ1Z2xvZygnKiogYXBwbHlpbmcgcnVsZXMgZm9yICcgKyBzS2V5KVxyXG4gICAgICAgIHZhciByZXMgPSBhdWdtZW50Q29udGV4dChvQ29udGV4dCwgZ2V0Uk1PbmNlKClbc0tleV0gfHwgW10pXHJcbiAgICAgICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/ICgnKiogcmVzdWx0IGZvciAnICsgc0tleSArICcgPSAnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTogJy0nKTtcclxuICAgICAgICBiZXN0TmV4dC5wdXNoKHJlcyB8fCBbXSlcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBydWxlIG5vdCByZWxldmFudFxyXG4gICAgICAgIGJlc3ROZXh0LnB1c2goW29Db250ZXh0XSk7XHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgICBiZXN0TiA9IHRha2VUb3BOKGJlc3ROZXh0KTtcclxuICB9KTtcclxuICByZXR1cm4gYmVzdE5cclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhcHBseVJ1bGVzUGlja0ZpcnN0KGNvbnRleHQ6IElGTWF0Y2guY29udGV4dCk6IElGTWF0Y2guY29udGV4dCB7XHJcbiAgdmFyIHIgPSBhcHBseVJ1bGVzKGNvbnRleHQpO1xyXG4gIHJldHVybiByICYmIHJbMF07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZWNpZGUgd2hldGhlciB0byByZXF1ZXJ5IGZvciBhIGNvbnRldFxyXG4gKi9cclxuLy9leHBvcnQgZnVuY3Rpb24gZGVjaWRlT25SZVF1ZXJ5KGNvbnRleHQ6IElGTWF0Y2guY29udGV4dCk6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4vLyAgcmV0dXJuIFtdXHJcbi8vfVxyXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
