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
function calcDistanceLevenXXX(sText1, sText2) {
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
exports.calcDistanceLevenXXX = calcDistanceLevenXXX;
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
function decideOnReQuery(context) {
    return [];
}
exports.decideOnReQuery = decideOnReQuery;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1hdGNoL2lucHV0RmlsdGVyLmpzIiwiLi4vc3JjL21hdGNoL2lucHV0RmlsdGVyLnRzIl0sIm5hbWVzIjpbImRpc3RhbmNlIiwicmVxdWlyZSIsIkxvZ2dlciIsImxvZ2dlciIsImRlYnVnIiwiZGVidWdwZXJmIiwidXRpbHMiLCJBbGdvbCIsImJyZWFrZG93biIsIkFueU9iamVjdCIsIk9iamVjdCIsImRlYnVnbG9nIiwiZGVidWdsb2dWIiwiZGVidWdsb2dNIiwibWF0Y2hkYXRhIiwib1VuaXRUZXN0cyIsImNhbGNEaXN0YW5jZSIsInNUZXh0MSIsInNUZXh0MiIsImNhbGNEaXN0YW5jZUFkanVzdGVkIiwiZXhwb3J0cyIsImNhbGNEaXN0YW5jZUxldmVuWFhYIiwibGVuZ3RoIiwiY2FsY0Rpc3QiLCJsZW5ndGhEZWx0YTEiLCJhMCIsImxldmVuc2h0ZWluIiwic3Vic3RyaW5nIiwiZW5hYmxlZCIsImEiLCJJRk1hdGNoIiwibGV2ZW5QZW5hbHR5T2xkIiwiaSIsImxldmVuUGVuYWx0eSIsIm5vblByaXZhdGVLZXlzIiwib0EiLCJrZXlzIiwiZmlsdGVyIiwia2V5IiwiY291bnRBaW5CIiwib0IiLCJmbkNvbXBhcmUiLCJhS2V5SWdub3JlIiwiQXJyYXkiLCJpc0FycmF5IiwiaW5kZXhPZiIsInJlZHVjZSIsInByZXYiLCJwcm90b3R5cGUiLCJoYXNPd25Qcm9wZXJ0eSIsImNhbGwiLCJzcHVyaW91c0Fub3RJbkIiLCJsb3dlckNhc2UiLCJvIiwidG9Mb3dlckNhc2UiLCJjb21wYXJlQ29udGV4dCIsImVxdWFsIiwiYiIsImRpZmZlcmVudCIsInNwdXJpb3VzTCIsInNwdXJpb3VzUiIsInNvcnRCeVJhbmsiLCJyIiwiX3JhbmtpbmciLCJjYXRlZ29yeSIsImxvY2FsZUNvbXBhcmUiLCJtYXRjaGVkU3RyaW5nIiwiY2hlY2tPbmVSdWxlIiwic3RyaW5nIiwibGNTdHJpbmciLCJleGFjdCIsInJlcyIsIm9SdWxlIiwiY250UmVjIiwiSlNPTiIsInN0cmluZ2lmeSIsInR5cGUiLCJsb3dlcmNhc2V3b3JkIiwiRXJyb3IiLCJ1bmRlZmluZWQiLCJ3b3JkIiwicHVzaCIsImV4YWN0T25seSIsImxldmVubWF0Y2giLCJDdXRvZmZfV29yZE1hdGNoIiwiYWRkQ250UmVjIiwicmVjIiwidG9GaXhlZCIsIm0iLCJyZWdleHAiLCJleGVjIiwibWF0Y2hJbmRleCIsImNoZWNrT25lUnVsZVdpdGhPZmZzZXQiLCJydWxlIiwibWVtYmVyIiwibnVtYmVyIiwiY2F0ZWdvcml6ZVN0cmluZyIsIm9SdWxlcyIsImZvckVhY2giLCJzb3J0IiwiY2F0ZWdvcml6ZVNpbmdsZVdvcmRXaXRoT2Zmc2V0IiwibGN3b3JkIiwicG9zdEZpbHRlciIsImJlc3RSYW5rIiwibWFwIiwiaW5kZXgiLCJqb2luIiwicmVzeCIsImRlbHRhIiwicG9zdEZpbHRlcldpdGhPZmZzZXQiLCJyYW5nZSIsImNhdGVnb3JpemVTdHJpbmcyIiwicnVsZXMiLCJ3b3JkTWFwIiwibm9uV29yZFJ1bGVzIiwiYWxsUnVsZXMiLCJjYXRlZ29yaXplV29yZEludGVybmFsV2l0aE9mZnNldHMiLCJyciIsIm1hdGNoV29yZCIsImNvbnRleHQiLCJvcHRpb25zIiwiczEiLCJzMiIsImZvbGxvd3MiLCJtYXRjaG90aGVycyIsImMiLCJhc3NpZ24iLCJvdmVycmlkZSIsIl93ZWlnaHQiLCJmcmVlemUiLCJleHRyYWN0QXJnc01hcCIsIm1hdGNoIiwiYXJnc01hcCIsImlLZXkiLCJ2YWx1ZSIsIlJhbmtXb3JkIiwiaGFzQWJvdmUiLCJsc3QiLCJib3JkZXIiLCJldmVyeSIsIm9NZW1iZXIiLCJ0YWtlRmlyc3ROIiwibiIsImxhc3RSYW5raW5nIiwiY250UmFuZ2VkIiwiaUluZGV4IiwiaXNSYW5nZWQiLCJ0YWtlQWJvdmUiLCJjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmIiwic1dvcmRHcm91cCIsInNwbGl0UnVsZXMiLCJzZWVuSXQiLCJUb3BfTl9Xb3JkQ2F0ZWdvcml6YXRpb25zIiwiY2F0ZWdvcml6ZVdvcmRXaXRoT2Zmc2V0V2l0aFJhbmtDdXRvZmYiLCJzV29yZEdyb3VwTEMiLCJvYmoiLCJjYXRlZ29yaXplV29yZFdpdGhPZmZzZXRXaXRoUmFua0N1dG9mZlNpbmdsZSIsImZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZFNlbnRlbmNlIiwib1NlbnRlbmNlIiwib1dvcmRHcm91cCIsImZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZCIsImFyciIsImNhdGVnb3JpemVBV29yZCIsInNlbnRlbmNlIiwid29yZHMiLCJkZWVwRnJlZXplIiwiY2xvbmVEZWVwIiwiYW5hbHl6ZVN0cmluZyIsInNTdHJpbmciLCJjbnQiLCJmYWMiLCJ1IiwiYnJlYWtkb3duU3RyaW5nIiwiTWF4U3BhY2VzUGVyQ29tYmluZWRXb3JkIiwiYUJyZWFrRG93blNlbnRlbmNlIiwiY2F0ZWdvcml6ZWRTZW50ZW5jZSIsImlzVmFsaWQiLCJjYXRlZ29yaXplQVdvcmRXaXRoT2Zmc2V0cyIsImNsb25lIiwiY29weVZlY01lbWJlcnMiLCJleHBhbmRNYXRjaEFyciIsImRlZXAiLCJsaW5lIiwidUJyZWFrRG93bkxpbmUiLCJhV29yZEdyb3VwIiwid2dJbmRleCIsIm9Xb3JkVmFyaWFudCIsImlXVkluZGV4IiwibnZlY3MiLCJ2ZWNzIiwicnZlYyIsImsiLCJuZXh0QmFzZSIsImwiLCJzbGljZSIsImNvbmNhdCIsInJlaW5mb3JjZURpc3RXZWlnaHQiLCJkaXN0IiwiYWJzIiwiTWF0aCIsImFSZWluZm9yY2VEaXN0V2VpZ2h0IiwiZXh0cmFjdENhdGVnb3J5TWFwIiwib1dvcmQiLCJDQVRfQ0FURUdPUlkiLCJwb3MiLCJyZWluRm9yY2VTZW50ZW5jZSIsIm9DYXRlZ29yeU1hcCIsIm9Qb3NpdGlvbiIsInJlaW5mb3JjZSIsImJvb3N0IiwiU2VudGVuY2UiLCJyZWluRm9yY2UiLCJhQ2F0ZWdvcml6ZWRBcnJheSIsImNtcFJhbmtpbmdQcm9kdWN0IiwicmFua2luZ1Byb2R1Y3QiLCJtYXRjaFJlZ0V4cCIsInNLZXkiLCJyZWciLCJvRXh0cmFjdGVkQ29udGV4dCIsInNvcnRCeVdlaWdodCIsIm9Db250ZXh0QSIsIm9Db250ZXh0QiIsInJhbmtpbmdBIiwicGFyc2VGbG9hdCIsInJhbmtpbmdCIiwid2VpZ2h0QSIsIndlaWdodEIiLCJhdWdtZW50Q29udGV4dDEiLCJpUnVsZSIsIm9yZXMiLCJiaW5kIiwiYXVnbWVudENvbnRleHQiLCJhUnVsZXMiLCJvcHRpb25zMSIsImFSZXMiLCJvcHRpb25zMiIsImluc2VydE9yZGVyZWQiLCJyZXN1bHQiLCJpSW5zZXJ0ZWRNZW1iZXIiLCJsaW1pdCIsInRha2VUb3BOIiwiaW5uZXJBcnIiLCJpQXJyIiwidG9wIiwic2hpZnQiLCJpbnB1dEZpbHRlclJ1bGVzIiwicm0iLCJnZXRSTU9uY2UiLCJnZXRSdWxlTWFwIiwiYXBwbHlSdWxlcyIsImJlc3ROIiwib0tleU9yZGVyIiwiYmVzdE5leHQiLCJvQ29udGV4dCIsImFwcGx5UnVsZXNQaWNrRmlyc3QiLCJkZWNpZGVPblJlUXVlcnkiXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7Ozs7Ozs7Ozs7Ozs7Ozs7QUFnQkE7O0FBQ0EsSUFBQUEsV0FBQUMsUUFBQSw2QkFBQSxDQUFBO0FBRUEsSUFBQUMsU0FBQUQsUUFBQSxpQkFBQSxDQUFBO0FBRUEsSUFBTUUsU0FBU0QsT0FBT0MsTUFBUCxDQUFjLGFBQWQsQ0FBZjtBQUVBLElBQUFDLFFBQUFILFFBQUEsT0FBQSxDQUFBO0FBQ0EsSUFBSUksWUFBWUQsTUFBTSxNQUFOLENBQWhCO0FBRUEsSUFBQUUsUUFBQUwsUUFBQSxnQkFBQSxDQUFBO0FBR0EsSUFBQU0sUUFBQU4sUUFBQSxTQUFBLENBQUE7QUFJQSxJQUFBTyxZQUFBUCxRQUFBLGFBQUEsQ0FBQTtBQUVBLElBQU1RLFlBQWlCQyxNQUF2QjtBQUVBLElBQU1DLFdBQVdQLE1BQU0sYUFBTixDQUFqQjtBQUNBLElBQU1RLFlBQVlSLE1BQU0sY0FBTixDQUFsQjtBQUNBLElBQU1TLFlBQVlULE1BQU0sY0FBTixDQUFsQjtBQUlBLElBQUFVLFlBQUFiLFFBQUEs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V0FBV2xJLE9BQVgsQ0FBUjtBQUNBLFdBQU96RCxLQUFLQSxFQUFFLENBQUYsQ0FBWjtBQUNEO0FBSEQxQyxRQUFBME8sbUJBQUEsR0FBQUEsbUJBQUE7QUFLQTs7O0FBR0EsU0FBQUMsZUFBQSxDQUFnQ3hJLE9BQWhDLEVBQXdEO0FBQ3RELFdBQU8sRUFBUDtBQUNEO0FBRkRuRyxRQUFBMk8sZUFBQSxHQUFBQSxlQUFBIiwiZmlsZSI6Im1hdGNoL2lucHV0RmlsdGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XG4vKipcbiAqIHRoZSBpbnB1dCBmaWx0ZXIgc3RhZ2UgcHJlcHJvY2Vzc2VzIGEgY3VycmVudCBjb250ZXh0XG4gKlxuICogSXQgYSkgY29tYmluZXMgbXVsdGktc2VnbWVudCBhcmd1bWVudHMgaW50byBvbmUgY29udGV4dCBtZW1iZXJzXG4gKiBJdCBiKSBhdHRlbXB0cyB0byBhdWdtZW50IHRoZSBjb250ZXh0IGJ5IGFkZGl0aW9uYWwgcXVhbGlmaWNhdGlvbnNcbiAqICAgICAgICAgICAoTWlkIHRlcm0gZ2VuZXJhdGluZyBBbHRlcm5hdGl2ZXMsIGUuZy5cbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiB1bml0IHRlc3Q/XG4gKiAgICAgICAgICAgICAgICAgQ2xpZW50U2lkZVRhcmdldFJlc29sdXRpb24gLT4gc291cmNlID9cbiAqICAgICAgICAgICApXG4gKiAgU2ltcGxlIHJ1bGVzIGxpa2UgIEludGVudFxuICpcbiAqXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5pbnB1dEZpbHRlclxuICogQGZpbGUgaW5wdXRGaWx0ZXIudHNcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cbiAqL1xuLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vbGliL25vZGUtNC5kLnRzXCIgLz5cbnZhciBkaXN0YW5jZSA9IHJlcXVpcmUoXCIuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW5cIik7XG52YXIgTG9nZ2VyID0gcmVxdWlyZShcIi4uL3V0aWxzL2xvZ2dlclwiKTtcbnZhciBsb2dnZXIgPSBMb2dnZXIubG9nZ2VyKCdpbnB1dEZpbHRlcicpO1xudmFyIGRlYnVnID0gcmVxdWlyZShcImRlYnVnXCIpO1xudmFyIGRlYnVncGVyZiA9IGRlYnVnKCdwZXJmJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKFwiLi4vdXRpbHMvdXRpbHNcIik7XG52YXIgQWxnb2wgPSByZXF1aXJlKFwiLi9hbGdvbFwiKTtcbnZhciBicmVha2Rvd24gPSByZXF1aXJlKFwiLi9icmVha2Rvd25cIik7XG52YXIgQW55T2JqZWN0ID0gT2JqZWN0O1xudmFyIGRlYnVnbG9nID0gZGVidWcoJ2lucHV0RmlsdGVyJyk7XG52YXIgZGVidWdsb2dWID0gZGVidWcoJ2lucHV0VkZpbHRlcicpO1xudmFyIGRlYnVnbG9nTSA9IGRlYnVnKCdpbnB1dE1GaWx0ZXInKTtcbnZhciBtYXRjaGRhdGEgPSByZXF1aXJlKFwiLi9tYXRjaGRhdGFcIik7XG52YXIgb1VuaXRUZXN0cyA9IG1hdGNoZGF0YS5vVW5pdFRlc3RzO1xuLyoqXG4gKiBAcGFyYW0gc1RleHQge3N0cmluZ30gdGhlIHRleHQgdG8gbWF0Y2ggdG8gTmF2VGFyZ2V0UmVzb2x1dGlvblxuICogQHBhcmFtIHNUZXh0MiB7c3RyaW5nfSB0aGUgcXVlcnkgdGV4dCwgZS5nLiBOYXZUYXJnZXRcbiAqXG4gKiBAcmV0dXJuIHRoZSBkaXN0YW5jZSwgbm90ZSB0aGF0IGlzIGlzICpub3QqIHN5bW1ldHJpYyFcbiAqL1xuZnVuY3Rpb24gY2FsY0Rpc3RhbmNlKHNUZXh0MSwgc1RleHQyKSB7XG4gICAgcmV0dXJuIGRpc3RhbmNlLmNhbGNEaXN0YW5jZUFkanVzdGVkKHNUZXh0MSwgc1RleHQyKTtcbn1cbmV4cG9ydHMuY2FsY0Rpc3RhbmNlID0gY2FsY0Rpc3RhbmNlO1xuLyoqXG4gKiBAcGFyYW0gc1RleHQge3N0cmluZ30gdGhlIHRleHQgdG8gbWF0Y2ggdG8gTmF2VGFyZ2V0UmVzb2x1dGlvblxuICogQHBhcmFtIHNUZXh0MiB7c3RyaW5nfSB0aGUgcXVlcnkgdGV4dCwgZS5nLiBOYXZUYXJnZXRcbiAqXG4gKiBAcmV0dXJuIHRoZSBkaXN0YW5jZSwgbm90ZSB0aGF0IGlzIGlzICpub3QqIHN5bW1ldHJpYyFcbiAqL1xuZnVuY3Rpb24gY2FsY0Rpc3RhbmNlTGV2ZW5YWFgoc1RleHQxLCBzVGV4dDIpIHtcbiAgICAvLyBjb25zb2xlLmxvZyhcImxlbmd0aDJcIiArIHNUZXh0MSArIFwiIC0gXCIgKyBzVGV4dDIpXG4gICAgaWYgKCgoc1RleHQxLmxlbmd0aCAtIHNUZXh0Mi5sZW5ndGgpID4gQWxnb2wuY2FsY0Rpc3QubGVuZ3RoRGVsdGExKVxuICAgICAgICB8fCAoc1RleHQyLmxlbmd0aCA+IDEuNSAqIHNUZXh0MS5sZW5ndGgpXG4gICAgICAgIHx8IChzVGV4dDIubGVuZ3RoIDwgKHNUZXh0MS5sZW5ndGggLyAyKSkpIHtcbiAgICAgICAgcmV0dXJuIDUwMDAwO1xuICAgIH1cbiAgICB2YXIgYTAgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEuc3Vic3RyaW5nKDAsIHNUZXh0Mi5sZW5ndGgpLCBzVGV4dDIpO1xuICAgIGlmIChkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZ1YoXCJkaXN0YW5jZVwiICsgYTAgKyBcInN0cmlwcGVkPlwiICsgc1RleHQxLnN1YnN0cmluZygwLCBzVGV4dDIubGVuZ3RoKSArIFwiPD5cIiArIHNUZXh0MiArIFwiPFwiKTtcbiAgICB9XG4gICAgaWYgKGEwICogNTAgPiAxNSAqIHNUZXh0Mi5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIDQwMDAwO1xuICAgIH1cbiAgICB2YXIgYSA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MSwgc1RleHQyKTtcbiAgICByZXR1cm4gYTAgKiA1MDAgLyBzVGV4dDIubGVuZ3RoICsgYTtcbn1cbmV4cG9ydHMuY2FsY0Rpc3RhbmNlTGV2ZW5YWFggPSBjYWxjRGlzdGFuY2VMZXZlblhYWDtcbnZhciBJRk1hdGNoID0gcmVxdWlyZShcIi4uL21hdGNoL2lmbWF0Y2hcIik7XG4vL2NvbnN0IGxldmVuQ3V0b2ZmID0gQWxnb2wuQ3V0b2ZmX0xldmVuU2h0ZWluO1xuZnVuY3Rpb24gbGV2ZW5QZW5hbHR5T2xkKGkpIHtcbiAgICAvLyAwLT4gMVxuICAgIC8vIDEgLT4gMC4xXG4gICAgLy8gMTUwIC0+ICAwLjhcbiAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgICByZXR1cm4gMTtcbiAgICB9XG4gICAgLy8gcmV2ZXJzZSBtYXkgYmUgYmV0dGVyIHRoYW4gbGluZWFyXG4gICAgcmV0dXJuIDEgKyBpICogKDAuOCAtIDEpIC8gMTUwO1xufVxuZXhwb3J0cy5sZXZlblBlbmFsdHlPbGQgPSBsZXZlblBlbmFsdHlPbGQ7XG5mdW5jdGlvbiBsZXZlblBlbmFsdHkoaSkge1xuICAgIC8vIDEgLT4gMVxuICAgIC8vIGN1dE9mZiA9PiAwLjhcbiAgICByZXR1cm4gaTtcbiAgICAvL3JldHVybiAgIDEgLSAgKDEgLSBpKSAqMC4yL0FsZ29sLkN1dG9mZl9Xb3JkTWF0Y2g7XG59XG5leHBvcnRzLmxldmVuUGVuYWx0eSA9IGxldmVuUGVuYWx0eTtcbmZ1bmN0aW9uIG5vblByaXZhdGVLZXlzKG9BKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4ga2V5WzBdICE9PSAnXyc7XG4gICAgfSk7XG59XG5mdW5jdGlvbiBjb3VudEFpbkIob0EsIG9CLCBmbkNvbXBhcmUsIGFLZXlJZ25vcmUpIHtcbiAgICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxuICAgICAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xuICAgIGZuQ29tcGFyZSA9IGZuQ29tcGFyZSB8fCBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcbiAgICB9KS5cbiAgICAgICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xuICAgICAgICAgICAgcHJldiA9IHByZXYgKyAoZm5Db21wYXJlKG9BW2tleV0sIG9CW2tleV0sIGtleSkgPyAxIDogMCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG59XG5leHBvcnRzLmNvdW50QWluQiA9IGNvdW50QWluQjtcbmZ1bmN0aW9uIHNwdXJpb3VzQW5vdEluQihvQSwgb0IsIGFLZXlJZ25vcmUpIHtcbiAgICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxuICAgICAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xuICAgIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcbiAgICB9KS5cbiAgICAgICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbn1cbmV4cG9ydHMuc3B1cmlvdXNBbm90SW5CID0gc3B1cmlvdXNBbm90SW5CO1xuZnVuY3Rpb24gbG93ZXJDYXNlKG8pIHtcbiAgICBpZiAodHlwZW9mIG8gPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgcmV0dXJuIG8udG9Mb3dlckNhc2UoKTtcbiAgICB9XG4gICAgcmV0dXJuIG87XG59XG5mdW5jdGlvbiBjb21wYXJlQ29udGV4dChvQSwgb0IsIGFLZXlJZ25vcmUpIHtcbiAgICB2YXIgZXF1YWwgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpID09PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xuICAgIHZhciBkaWZmZXJlbnQgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpICE9PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xuICAgIHZhciBzcHVyaW91c0wgPSBzcHVyaW91c0Fub3RJbkIob0EsIG9CLCBhS2V5SWdub3JlKTtcbiAgICB2YXIgc3B1cmlvdXNSID0gc3B1cmlvdXNBbm90SW5CKG9CLCBvQSwgYUtleUlnbm9yZSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZXF1YWw6IGVxdWFsLFxuICAgICAgICBkaWZmZXJlbnQ6IGRpZmZlcmVudCxcbiAgICAgICAgc3B1cmlvdXNMOiBzcHVyaW91c0wsXG4gICAgICAgIHNwdXJpb3VzUjogc3B1cmlvdXNSXG4gICAgfTtcbn1cbmV4cG9ydHMuY29tcGFyZUNvbnRleHQgPSBjb21wYXJlQ29udGV4dDtcbmZ1bmN0aW9uIHNvcnRCeVJhbmsoYSwgYikge1xuICAgIHZhciByID0gLSgoYS5fcmFua2luZyB8fCAxLjApIC0gKGIuX3JhbmtpbmcgfHwgMS4wKSk7XG4gICAgaWYgKHIpIHtcbiAgICAgICAgcmV0dXJuIHI7XG4gICAgfVxuICAgIGlmIChhLmNhdGVnb3J5ICYmIGIuY2F0ZWdvcnkpIHtcbiAgICAgICAgciA9IGEuY2F0ZWdvcnkubG9jYWxlQ29tcGFyZShiLmNhdGVnb3J5KTtcbiAgICAgICAgaWYgKHIpIHtcbiAgICAgICAgICAgIHJldHVybiByO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChhLm1hdGNoZWRTdHJpbmcgJiYgYi5tYXRjaGVkU3RyaW5nKSB7XG4gICAgICAgIHIgPSBhLm1hdGNoZWRTdHJpbmcubG9jYWxlQ29tcGFyZShiLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICBpZiAocikge1xuICAgICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIDA7XG59XG5mdW5jdGlvbiBjaGVja09uZVJ1bGUoc3RyaW5nLCBsY1N0cmluZywgZXhhY3QsIHJlcywgb1J1bGUsIGNudFJlYykge1xuICAgIGlmIChkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZ1YoJ2F0dGVtcHRpbmcgdG8gbWF0Y2ggcnVsZSAnICsgSlNPTi5zdHJpbmdpZnkob1J1bGUpICsgXCIgdG8gc3RyaW5nIFxcXCJcIiArIHN0cmluZyArIFwiXFxcIlwiKTtcbiAgICB9XG4gICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XG4gICAgICAgIGNhc2UgMCAvKiBXT1JEICovOlxuICAgICAgICAgICAgaWYgKCFvUnVsZS5sb3dlcmNhc2V3b3JkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdydWxlIHdpdGhvdXQgYSBsb3dlcmNhc2UgdmFyaWFudCcgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICA7XG4gICAgICAgICAgICBpZiAoZXhhY3QgJiYgb1J1bGUud29yZCA9PT0gc3RyaW5nIHx8IG9SdWxlLmxvd2VyY2FzZXdvcmQgPT09IGxjU3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVidWdsb2coXCJcXG4hbWF0Y2hlZCBleGFjdCBcIiArIHN0cmluZyArIFwiPVwiICsgb1J1bGUubG93ZXJjYXNld29yZCArIFwiID0+IFwiICsgb1J1bGUubWF0Y2hlZFN0cmluZyArIFwiL1wiICsgb1J1bGUuY2F0ZWdvcnkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBvUnVsZS5tYXRjaGVkU3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghZXhhY3QgJiYgIW9SdWxlLmV4YWN0T25seSkge1xuICAgICAgICAgICAgICAgIHZhciBsZXZlbm1hdGNoID0gY2FsY0Rpc3RhbmNlKG9SdWxlLmxvd2VyY2FzZXdvcmQsIGxjU3RyaW5nKTtcbiAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlXCIsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICBpZihsZXZlbm1hdGNoIDwgNTApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlRXhwXCIsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGxldmVubWF0Y2ggPCA0MDAwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VCZWxvdzQwa1wiLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIC8vaWYob1J1bGUubG93ZXJjYXNld29yZCA9PT0gXCJjb3Ntb3NcIikge1xuICAgICAgICAgICAgICAgIC8vICBjb25zb2xlLmxvZyhcImhlcmUgcmFua2luZyBcIiArIGxldmVubWF0Y2ggKyBcIiBcIiArIG9SdWxlLmxvd2VyY2FzZXdvcmQgKyBcIiBcIiArIGxjU3RyaW5nKTtcbiAgICAgICAgICAgICAgICAvL31cbiAgICAgICAgICAgICAgICBpZiAobGV2ZW5tYXRjaCA+PSBBbGdvbC5DdXRvZmZfV29yZE1hdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsIFwiY2FsY0Rpc3RhbmNlT2tcIiwgMSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZWMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgICAgICBfcmFua2luZzogKG9SdWxlLl9yYW5raW5nIHx8IDEuMCkgKiBsZXZlblBlbmFsdHkobGV2ZW5tYXRjaCksXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXZlbm1hdGNoOiBsZXZlbm1hdGNoXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIGlmIChkZWJ1Z2xvZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVidWdsb2coXCJcXG4hZnV6enkgXCIgKyAobGV2ZW5tYXRjaCkudG9GaXhlZCgzKSArIFwiIFwiICsgcmVjLl9yYW5raW5nLnRvRml4ZWQoMykgKyBcIiAgXCIgKyBzdHJpbmcgKyBcIj1cIiArIG9SdWxlLmxvd2VyY2FzZXdvcmQgKyBcIiA9PiBcIiArIG9SdWxlLm1hdGNoZWRTdHJpbmcgKyBcIi9cIiArIG9SdWxlLmNhdGVnb3J5KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXMucHVzaChyZWMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDEgLyogUkVHRVhQICovOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KFwiIGhlcmUgcmVnZXhwXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgbSA9IG9SdWxlLnJlZ2V4cC5leGVjKHN0cmluZyk7XG4gICAgICAgICAgICAgICAgaWYgKG0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiAob1J1bGUubWF0Y2hJbmRleCAhPT0gdW5kZWZpbmVkICYmIG1bb1J1bGUubWF0Y2hJbmRleF0pIHx8IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmtub3duIHR5cGVcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG59XG5leHBvcnRzLmNoZWNrT25lUnVsZSA9IGNoZWNrT25lUnVsZTtcbmZ1bmN0aW9uIGNoZWNrT25lUnVsZVdpdGhPZmZzZXQoc3RyaW5nLCBsY1N0cmluZywgZXhhY3QsIHJlcywgb1J1bGUsIGNudFJlYykge1xuICAgIGlmIChkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZ1YoJ2F0dGVtcHRpbmcgdG8gbWF0Y2ggcnVsZSAnICsgSlNPTi5zdHJpbmdpZnkob1J1bGUpICsgXCIgdG8gc3RyaW5nIFxcXCJcIiArIHN0cmluZyArIFwiXFxcIlwiKTtcbiAgICB9XG4gICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XG4gICAgICAgIGNhc2UgMCAvKiBXT1JEICovOlxuICAgICAgICAgICAgaWYgKCFvUnVsZS5sb3dlcmNhc2V3b3JkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdydWxlIHdpdGhvdXQgYSBsb3dlcmNhc2UgdmFyaWFudCcgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICA7XG4gICAgICAgICAgICBpZiAoZXhhY3QgJiYgKG9SdWxlLndvcmQgPT09IHN0cmluZyB8fCBvUnVsZS5sb3dlcmNhc2V3b3JkID09PSBsY1N0cmluZykpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcIlxcbiFtYXRjaGVkIGV4YWN0IFwiICsgc3RyaW5nICsgXCI9XCIgKyBvUnVsZS5sb3dlcmNhc2V3b3JkICsgXCIgPT4gXCIgKyBvUnVsZS5tYXRjaGVkU3RyaW5nICsgXCIvXCIgKyBvUnVsZS5jYXRlZ29yeSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgcnVsZTogb1J1bGUsXG4gICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghZXhhY3QgJiYgIW9SdWxlLmV4YWN0T25seSkge1xuICAgICAgICAgICAgICAgIHZhciBsZXZlbm1hdGNoID0gY2FsY0Rpc3RhbmNlKG9SdWxlLmxvd2VyY2FzZXdvcmQsIGxjU3RyaW5nKTtcbiAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlXCIsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICBpZihsZXZlbm1hdGNoIDwgNTApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlRXhwXCIsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGxldmVubWF0Y2ggPCA0MDAwMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VCZWxvdzQwa1wiLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIC8vaWYob1J1bGUubG93ZXJjYXNld29yZCA9PT0gXCJjb3Ntb3NcIikge1xuICAgICAgICAgICAgICAgIC8vICBjb25zb2xlLmxvZyhcImhlcmUgcmFua2luZyBcIiArIGxldmVubWF0Y2ggKyBcIiBcIiArIG9SdWxlLmxvd2VyY2FzZXdvcmQgKyBcIiBcIiArIGxjU3RyaW5nKTtcbiAgICAgICAgICAgICAgICAvL31cbiAgICAgICAgICAgICAgICBpZiAobGV2ZW5tYXRjaCA+PSBBbGdvbC5DdXRvZmZfV29yZE1hdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJmb3VuZCByZWNcIik7XG4gICAgICAgICAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsIFwiY2FsY0Rpc3RhbmNlT2tcIiwgMSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZWMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bGU6IG9SdWxlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiAob1J1bGUuX3JhbmtpbmcgfHwgMS4wKSAqIGxldmVuUGVuYWx0eShsZXZlbm1hdGNoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldmVubWF0Y2g6IGxldmVubWF0Y2hcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlYnVnbG9nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcIlxcbiFDT1JPOiBmdXp6eSBcIiArIChsZXZlbm1hdGNoKS50b0ZpeGVkKDMpICsgXCIgXCIgKyByZWMuX3JhbmtpbmcudG9GaXhlZCgzKSArIFwiICBcXFwiXCIgKyBzdHJpbmcgKyBcIlxcXCI9XCIgKyBvUnVsZS5sb3dlcmNhc2V3b3JkICsgXCIgPT4gXCIgKyBvUnVsZS5tYXRjaGVkU3RyaW5nICsgXCIvXCIgKyBvUnVsZS5jYXRlZ29yeSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmVzLnB1c2gocmVjKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAxIC8qIFJFR0VYUCAqLzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShcIiBoZXJlIHJlZ2V4cFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUsIHVuZGVmaW5lZCwgMikpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIG0gPSBvUnVsZS5yZWdleHAuZXhlYyhzdHJpbmcpO1xuICAgICAgICAgICAgICAgIGlmIChtKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcnVsZTogb1J1bGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiAob1J1bGUubWF0Y2hJbmRleCAhPT0gdW5kZWZpbmVkICYmIG1bb1J1bGUubWF0Y2hJbmRleF0pIHx8IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmtub3duIHR5cGVcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG59XG5leHBvcnRzLmNoZWNrT25lUnVsZVdpdGhPZmZzZXQgPSBjaGVja09uZVJ1bGVXaXRoT2Zmc2V0O1xuO1xuZnVuY3Rpb24gYWRkQ250UmVjKGNudFJlYywgbWVtYmVyLCBudW1iZXIpIHtcbiAgICBpZiAoKCFjbnRSZWMpIHx8IChudW1iZXIgPT09IDApKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY250UmVjW21lbWJlcl0gPSAoY250UmVjW21lbWJlcl0gfHwgMCkgKyBudW1iZXI7XG59XG5mdW5jdGlvbiBjYXRlZ29yaXplU3RyaW5nKHdvcmQsIGV4YWN0LCBvUnVsZXMsIGNudFJlYykge1xuICAgIC8vIHNpbXBseSBhcHBseSBhbGwgcnVsZXNcbiAgICBpZiAoZGVidWdsb2dNLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2dNKFwicnVsZXMgOiBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHZhciBsY1N0cmluZyA9IHdvcmQudG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgb1J1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgIGNoZWNrT25lUnVsZSh3b3JkLCBsY1N0cmluZywgZXhhY3QsIHJlcywgb1J1bGUsIGNudFJlYyk7XG4gICAgfSk7XG4gICAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZVN0cmluZyA9IGNhdGVnb3JpemVTdHJpbmc7XG5mdW5jdGlvbiBjYXRlZ29yaXplU2luZ2xlV29yZFdpdGhPZmZzZXQod29yZCwgbGN3b3JkLCBleGFjdCwgb1J1bGVzLCBjbnRSZWMpIHtcbiAgICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXG4gICAgaWYgKGRlYnVnbG9nTS5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nTShcInJ1bGVzIDogXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZXMsIHVuZGVmaW5lZCwgMikpO1xuICAgIH1cbiAgICB2YXIgcmVzID0gW107XG4gICAgb1J1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgIGNoZWNrT25lUnVsZVdpdGhPZmZzZXQod29yZCwgbGN3b3JkLCBleGFjdCwgcmVzLCBvUnVsZSwgY250UmVjKTtcbiAgICB9KTtcbiAgICBkZWJ1Z2xvZyhcIkNTV1dPOiBnb3QgcmVzdWx0cyBmb3IgXCIgKyBsY3dvcmQgKyBcIiAgXCIgKyByZXMubGVuZ3RoKTtcbiAgICByZXMuc29ydChzb3J0QnlSYW5rKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5jYXRlZ29yaXplU2luZ2xlV29yZFdpdGhPZmZzZXQgPSBjYXRlZ29yaXplU2luZ2xlV29yZFdpdGhPZmZzZXQ7XG5mdW5jdGlvbiBwb3N0RmlsdGVyKHJlcykge1xuICAgIHJlcy5zb3J0KHNvcnRCeVJhbmspO1xuICAgIHZhciBiZXN0UmFuayA9IDA7XG4gICAgLy9jb25zb2xlLmxvZyhcIlxcbnBpbHRlcmVkIFwiICsgSlNPTi5zdHJpbmdpZnkocmVzKSk7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCJwcmVGaWx0ZXIgOiBcXG5cIiArIHJlcy5tYXAoZnVuY3Rpb24gKHdvcmQsIGluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4gaW5kZXggKyBcIiBcIiArIHdvcmQuX3JhbmtpbmcgKyBcIiAgPT4gXFxcIlwiICsgd29yZC5jYXRlZ29yeSArIFwiXFxcIiBcIiArIHdvcmQubWF0Y2hlZFN0cmluZztcbiAgICAgICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgfVxuICAgIHZhciByID0gcmVzLmZpbHRlcihmdW5jdGlvbiAocmVzeCwgaW5kZXgpIHtcbiAgICAgICAgaWYgKGluZGV4ID09PSAwKSB7XG4gICAgICAgICAgICBiZXN0UmFuayA9IHJlc3guX3Jhbmtpbmc7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyAxLTAuOSA9IDAuMVxuICAgICAgICAvLyAxLSAwLjkzID0gMC43XG4gICAgICAgIC8vIDEvN1xuICAgICAgICB2YXIgZGVsdGEgPSBiZXN0UmFuayAvIHJlc3guX3Jhbmtpbmc7XG4gICAgICAgIGlmICgocmVzeC5tYXRjaGVkU3RyaW5nID09PSByZXNbaW5kZXggLSAxXS5tYXRjaGVkU3RyaW5nKVxuICAgICAgICAgICAgJiYgKHJlc3guY2F0ZWdvcnkgPT09IHJlc1tpbmRleCAtIDFdLmNhdGVnb3J5KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJcXG4gZGVsdGEgZm9yIFwiICsgZGVsdGEgKyBcIiAgXCIgKyByZXN4Ll9yYW5raW5nKTtcbiAgICAgICAgaWYgKHJlc3gubGV2ZW5tYXRjaCAmJiAoZGVsdGEgPiAxLjAzKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiXFxuZmlsdGVyZWQgXCIgKyByLmxlbmd0aCArIFwiL1wiICsgcmVzLmxlbmd0aCArIEpTT04uc3RyaW5naWZ5KHIpKTtcbiAgICB9XG4gICAgcmV0dXJuIHI7XG59XG5leHBvcnRzLnBvc3RGaWx0ZXIgPSBwb3N0RmlsdGVyO1xuZnVuY3Rpb24gcG9zdEZpbHRlcldpdGhPZmZzZXQocmVzKSB7XG4gICAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XG4gICAgdmFyIGJlc3RSYW5rID0gMDtcbiAgICAvL2NvbnNvbGUubG9nKFwiXFxucGlsdGVyZWQgXCIgKyBKU09OLnN0cmluZ2lmeShyZXMpKTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcIiBwcmVGaWx0ZXIgOiBcXG5cIiArIHJlcy5tYXAoZnVuY3Rpb24gKHdvcmQpIHtcbiAgICAgICAgICAgIHJldHVybiBcIiBcIiArIHdvcmQuX3JhbmtpbmcgKyBcIiAgPT4gXFxcIlwiICsgd29yZC5jYXRlZ29yeSArIFwiXFxcIiBcIiArIHdvcmQubWF0Y2hlZFN0cmluZyArIFwiIFwiO1xuICAgICAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgICB9XG4gICAgdmFyIHIgPSByZXMuZmlsdGVyKGZ1bmN0aW9uIChyZXN4LCBpbmRleCkge1xuICAgICAgICBpZiAoaW5kZXggPT09IDApIHtcbiAgICAgICAgICAgIGJlc3RSYW5rID0gcmVzeC5fcmFua2luZztcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vIDEtMC45ID0gMC4xXG4gICAgICAgIC8vIDEtIDAuOTMgPSAwLjdcbiAgICAgICAgLy8gMS83XG4gICAgICAgIHZhciBkZWx0YSA9IGJlc3RSYW5rIC8gcmVzeC5fcmFua2luZztcbiAgICAgICAgaWYgKCEocmVzeC5ydWxlICYmIHJlc3gucnVsZS5yYW5nZSlcbiAgICAgICAgICAgICYmICEocmVzW2luZGV4IC0gMV0ucnVsZSAmJiByZXNbaW5kZXggLSAxXS5ydWxlLnJhbmdlKVxuICAgICAgICAgICAgJiYgKHJlc3gubWF0Y2hlZFN0cmluZyA9PT0gcmVzW2luZGV4IC0gMV0ubWF0Y2hlZFN0cmluZylcbiAgICAgICAgICAgICYmIChyZXN4LmNhdGVnb3J5ID09PSByZXNbaW5kZXggLSAxXS5jYXRlZ29yeSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICAvL2NvbnNvbGUubG9nKFwiXFxuIGRlbHRhIGZvciBcIiArIGRlbHRhICsgXCIgIFwiICsgcmVzeC5fcmFua2luZyk7XG4gICAgICAgIGlmIChyZXN4LmxldmVubWF0Y2ggJiYgKGRlbHRhID4gMS4wMykpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcIlxcbmZpbHRlcmVkIFwiICsgci5sZW5ndGggKyBcIi9cIiArIHJlcy5sZW5ndGggKyBKU09OLnN0cmluZ2lmeShyKSk7XG4gICAgfVxuICAgIHJldHVybiByO1xufVxuZXhwb3J0cy5wb3N0RmlsdGVyV2l0aE9mZnNldCA9IHBvc3RGaWx0ZXJXaXRoT2Zmc2V0O1xuZnVuY3Rpb24gY2F0ZWdvcml6ZVN0cmluZzIod29yZCwgZXhhY3QsIHJ1bGVzLCBjbnRSZWMpIHtcbiAgICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXG4gICAgaWYgKGRlYnVnbG9nTS5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nTShcInJ1bGVzIDogXCIgKyBKU09OLnN0cmluZ2lmeShydWxlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHZhciBsY1N0cmluZyA9IHdvcmQudG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgaWYgKGV4YWN0KSB7XG4gICAgICAgIHZhciByID0gcnVsZXMud29yZE1hcFtsY1N0cmluZ107XG4gICAgICAgIGlmIChyKSB7XG4gICAgICAgICAgICByLnJ1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHdvcmQsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcnVsZXMubm9uV29yZFJ1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgICAgICBjaGVja09uZVJ1bGUod29yZCwgbGNTdHJpbmcsIGV4YWN0LCByZXMsIG9SdWxlLCBjbnRSZWMpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBkZWJ1Z2xvZyhcImNhdGVnb3JpemUgbm9uIGV4YWN0XCIgKyB3b3JkICsgXCIgeHggIFwiICsgcnVsZXMuYWxsUnVsZXMubGVuZ3RoKTtcbiAgICAgICAgcmV0dXJuIHBvc3RGaWx0ZXIoY2F0ZWdvcml6ZVN0cmluZyh3b3JkLCBleGFjdCwgcnVsZXMuYWxsUnVsZXMsIGNudFJlYykpO1xuICAgIH1cbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZVN0cmluZzIgPSBjYXRlZ29yaXplU3RyaW5nMjtcbmZ1bmN0aW9uIGNhdGVnb3JpemVXb3JkSW50ZXJuYWxXaXRoT2Zmc2V0cyh3b3JkLCBsY3dvcmQsIGV4YWN0LCBydWxlcywgY250UmVjKSB7XG4gICAgZGVidWdsb2dNKFwiY2F0ZWdvcml6ZSBcIiArIGxjd29yZCArIFwiIHdpdGggb2Zmc2V0ISEhISEhISEhISEhISEhISFcIiArIGV4YWN0KTtcbiAgICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXG4gICAgaWYgKGRlYnVnbG9nTS5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nTShcInJ1bGVzIDogXCIgKyBKU09OLnN0cmluZ2lmeShydWxlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHZhciByZXMgPSBbXTtcbiAgICBpZiAoZXhhY3QpIHtcbiAgICAgICAgdmFyIHIgPSBydWxlcy53b3JkTWFwW2xjd29yZF07XG4gICAgICAgIGlmIChyKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZ00oXCIgLi4uLnB1c2hpbmcgbiBydWxlcyBleGFjdCBmb3IgXCIgKyBsY3dvcmQgKyBcIjpcIiArIHIucnVsZXMubGVuZ3RoKTtcbiAgICAgICAgICAgIGRlYnVnbG9nTShyLnJ1bGVzLm1hcChmdW5jdGlvbiAociwgaW5kZXgpIHsgcmV0dXJuICcnICsgaW5kZXggKyAnICcgKyBKU09OLnN0cmluZ2lmeShyKTsgfSkuam9pbihcIlxcblwiKSk7XG4gICAgICAgICAgICByLnJ1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHdvcmQsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgcnVsZTogb1J1bGUsXG4gICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJ1bGVzLm5vbldvcmRSdWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChvUnVsZSkge1xuICAgICAgICAgICAgY2hlY2tPbmVSdWxlV2l0aE9mZnNldCh3b3JkLCBsY3dvcmQsIGV4YWN0LCByZXMsIG9SdWxlLCBjbnRSZWMpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmVzID0gcG9zdEZpbHRlcldpdGhPZmZzZXQocmVzKTtcbiAgICAgICAgZGVidWdsb2coXCJoZXJlIHJlc3VsdHMgZm9yXCIgKyB3b3JkICsgXCIgcmVzIFwiICsgcmVzLmxlbmd0aCk7XG4gICAgICAgIGRlYnVnbG9nTShcImhlcmUgcmVzdWx0cyBmb3JcIiArIHdvcmQgKyBcIiByZXMgXCIgKyByZXMubGVuZ3RoKTtcbiAgICAgICAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBkZWJ1Z2xvZyhcImNhdGVnb3JpemUgbm9uIGV4YWN0XCIgKyB3b3JkICsgXCIgeHggIFwiICsgcnVsZXMuYWxsUnVsZXMubGVuZ3RoKTtcbiAgICAgICAgdmFyIHJyID0gY2F0ZWdvcml6ZVNpbmdsZVdvcmRXaXRoT2Zmc2V0KHdvcmQsIGxjd29yZCwgZXhhY3QsIHJ1bGVzLmFsbFJ1bGVzLCBjbnRSZWMpO1xuICAgICAgICAvL2RlYnVsb2dNKFwiZnV6enkgcmVzIFwiICsgSlNPTi5zdHJpbmdpZnkocnIpKTtcbiAgICAgICAgcmV0dXJuIHBvc3RGaWx0ZXJXaXRoT2Zmc2V0KHJyKTtcbiAgICB9XG59XG5leHBvcnRzLmNhdGVnb3JpemVXb3JkSW50ZXJuYWxXaXRoT2Zmc2V0cyA9IGNhdGVnb3JpemVXb3JkSW50ZXJuYWxXaXRoT2Zmc2V0cztcbi8qKlxuICpcbiAqIE9wdGlvbnMgbWF5IGJlIHtcbiAqIG1hdGNob3RoZXJzIDogdHJ1ZSwgID0+IG9ubHkgcnVsZXMgd2hlcmUgYWxsIG90aGVycyBtYXRjaCBhcmUgY29uc2lkZXJlZFxuICogYXVnbWVudCA6IHRydWUsXG4gKiBvdmVycmlkZSA6IHRydWUgfSAgPT5cbiAqXG4gKi9cbmZ1bmN0aW9uIG1hdGNoV29yZChvUnVsZSwgY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChjb250ZXh0W29SdWxlLmtleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgczIgPSBvUnVsZS53b3JkLnRvTG93ZXJDYXNlKCk7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCwgb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xuICAgICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgYyA9IGNhbGNEaXN0YW5jZShzMiwgczEpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiIHMxIDw+IHMyIFwiICsgczEgKyBcIjw+XCIgKyBzMiArIFwiICA9PjogXCIgKyBjKTtcbiAgICB9XG4gICAgaWYgKGMgPiAwLjgwKSB7XG4gICAgICAgIHZhciByZXMgPSBBbnlPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKTtcbiAgICAgICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIGNvbnRleHQpO1xuICAgICAgICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xuICAgICAgICAgICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGZvcmNlIGtleSBwcm9wZXJ0eVxuICAgICAgICAvLyBjb25zb2xlLmxvZygnIG9iamVjdGNhdGVnb3J5JywgcmVzWydzeXN0ZW1PYmplY3RDYXRlZ29yeSddKTtcbiAgICAgICAgcmVzW29SdWxlLmtleV0gPSBvUnVsZS5mb2xsb3dzW29SdWxlLmtleV0gfHwgcmVzW29SdWxlLmtleV07XG4gICAgICAgIHJlcy5fd2VpZ2h0ID0gQW55T2JqZWN0LmFzc2lnbih7fSwgcmVzLl93ZWlnaHQpO1xuICAgICAgICByZXMuX3dlaWdodFtvUnVsZS5rZXldID0gYztcbiAgICAgICAgT2JqZWN0LmZyZWV6ZShyZXMpO1xuICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgZGVidWdsb2coJ0ZvdW5kIG9uZScgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5leHBvcnRzLm1hdGNoV29yZCA9IG1hdGNoV29yZDtcbmZ1bmN0aW9uIGV4dHJhY3RBcmdzTWFwKG1hdGNoLCBhcmdzTWFwKSB7XG4gICAgdmFyIHJlcyA9IHt9O1xuICAgIGlmICghYXJnc01hcCkge1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cbiAgICBPYmplY3Qua2V5cyhhcmdzTWFwKS5mb3JFYWNoKGZ1bmN0aW9uIChpS2V5KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IG1hdGNoW2lLZXldO1xuICAgICAgICB2YXIga2V5ID0gYXJnc01hcFtpS2V5XTtcbiAgICAgICAgaWYgKCh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpICYmIHZhbHVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJlc1trZXldID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5leHRyYWN0QXJnc01hcCA9IGV4dHJhY3RBcmdzTWFwO1xuZXhwb3J0cy5SYW5rV29yZCA9IHtcbiAgICBoYXNBYm92ZTogZnVuY3Rpb24gKGxzdCwgYm9yZGVyKSB7XG4gICAgICAgIHJldHVybiAhbHN0LmV2ZXJ5KGZ1bmN0aW9uIChvTWVtYmVyKSB7XG4gICAgICAgICAgICByZXR1cm4gKG9NZW1iZXIuX3JhbmtpbmcgPCBib3JkZXIpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIHRha2VGaXJzdE46IGZ1bmN0aW9uIChsc3QsIG4pIHtcbiAgICAgICAgdmFyIGxhc3RSYW5raW5nID0gMS4wO1xuICAgICAgICB2YXIgY250UmFuZ2VkID0gMDtcbiAgICAgICAgcmV0dXJuIGxzdC5maWx0ZXIoZnVuY3Rpb24gKG9NZW1iZXIsIGlJbmRleCkge1xuICAgICAgICAgICAgdmFyIGlzUmFuZ2VkID0gISEob01lbWJlcltcInJ1bGVcIl0gJiYgb01lbWJlcltcInJ1bGVcIl0ucmFuZ2UpO1xuICAgICAgICAgICAgaWYgKGlzUmFuZ2VkKSB7XG4gICAgICAgICAgICAgICAgY250UmFuZ2VkICs9IDE7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoKChpSW5kZXggLSBjbnRSYW5nZWQpIDwgbikgfHwgKG9NZW1iZXIuX3JhbmtpbmcgPT09IGxhc3RSYW5raW5nKSkge1xuICAgICAgICAgICAgICAgIGxhc3RSYW5raW5nID0gb01lbWJlci5fcmFua2luZztcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICB0YWtlQWJvdmU6IGZ1bmN0aW9uIChsc3QsIGJvcmRlcikge1xuICAgICAgICByZXR1cm4gbHN0LmZpbHRlcihmdW5jdGlvbiAob01lbWJlcikge1xuICAgICAgICAgICAgcmV0dXJuIChvTWVtYmVyLl9yYW5raW5nID49IGJvcmRlcik7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG4vKlxudmFyIGV4YWN0TGVuID0gMDtcbnZhciBmdXp6eUxlbiA9IDA7XG52YXIgZnV6enlDbnQgPSAwO1xudmFyIGV4YWN0Q250ID0gMDtcbnZhciB0b3RhbENudCA9IDA7XG52YXIgdG90YWxMZW4gPSAwO1xudmFyIHJldGFpbmVkQ250ID0gMDtcblxuZXhwb3J0IGZ1bmN0aW9uIHJlc2V0Q250KCkge1xuICBleGFjdExlbiA9IDA7XG4gIGZ1enp5TGVuID0gMDtcbiAgZnV6enlDbnQgPSAwO1xuICBleGFjdENudCA9IDA7XG4gIHRvdGFsQ250ID0gMDtcbiAgdG90YWxMZW4gPSAwO1xuICByZXRhaW5lZENudCA9IDA7XG59XG4qL1xuZnVuY3Rpb24gY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZihzV29yZEdyb3VwLCBzcGxpdFJ1bGVzLCBjbnRSZWMpIHtcbiAgICB2YXIgc2Vlbkl0ID0gY2F0ZWdvcml6ZVN0cmluZzIoc1dvcmRHcm91cCwgdHJ1ZSwgc3BsaXRSdWxlcywgY250UmVjKTtcbiAgICAvL3RvdGFsQ250ICs9IDE7XG4gICAgLy8gZXhhY3RMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcbiAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Q2F0RXhhY3QnLCAxKTtcbiAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Q2F0RXhhY3RSZXMnLCBzZWVuSXQubGVuZ3RoKTtcbiAgICBpZiAoZXhwb3J0cy5SYW5rV29yZC5oYXNBYm92ZShzZWVuSXQsIDAuOCkpIHtcbiAgICAgICAgaWYgKGNudFJlYykge1xuICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYywgJ2V4YWN0UHJpb3JUYWtlJywgc2Vlbkl0Lmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgICAgc2Vlbkl0ID0gZXhwb3J0cy5SYW5rV29yZC50YWtlQWJvdmUoc2Vlbkl0LCAwLjgpO1xuICAgICAgICBpZiAoY250UmVjKSB7XG4gICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLCAnZXhhY3RBZnRlclRha2UnLCBzZWVuSXQubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc2Vlbkl0ID0gY2F0ZWdvcml6ZVN0cmluZzIoc1dvcmRHcm91cCwgZmFsc2UsIHNwbGl0UnVsZXMsIGNudFJlYyk7XG4gICAgICAgIGFkZENudFJlYyhjbnRSZWMsICdjbnROb25FeGFjdCcsIDEpO1xuICAgICAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Tm9uRXhhY3RSZXMnLCBzZWVuSXQubGVuZ3RoKTtcbiAgICB9XG4gICAgLy8gdG90YWxMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcbiAgICBzZWVuSXQgPSBleHBvcnRzLlJhbmtXb3JkLnRha2VGaXJzdE4oc2Vlbkl0LCBBbGdvbC5Ub3BfTl9Xb3JkQ2F0ZWdvcml6YXRpb25zKTtcbiAgICAvLyByZXRhaW5lZENudCArPSBzZWVuSXQubGVuZ3RoO1xuICAgIHJldHVybiBzZWVuSXQ7XG59XG5leHBvcnRzLmNhdGVnb3JpemVXb3JkV2l0aFJhbmtDdXRvZmYgPSBjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmO1xuLyogaWYgd2UgaGF2ZSBhICBcIlJ1biBsaWtlIHRoZSBXaW5kXCJcbiAgYW4gYSB1c2VyIHR5cGUgZnVuIGxpa2UgIGEgUmluZCAsIGFuZCBSaW5kIGlzIGFuIGV4YWN0IG1hdGNoLFxuICB3ZSB3aWxsIG5vdCBzdGFydCBsb29raW5nIGZvciB0aGUgbG9uZyBzZW50ZW5jZVxuXG4gIHRoaXMgaXMgdG8gYmUgZml4ZWQgYnkgXCJzcHJlYWRpbmdcIiB0aGUgcmFuZ2UgaW5kaWNhdGlvbiBhY2Nyb3NzIHZlcnkgc2ltaWxhciB3b3JkcyBpbiB0aGUgdmluY2luaXR5IG9mIHRoZVxuICB0YXJnZXQgd29yZHNcbiovXG5mdW5jdGlvbiBjYXRlZ29yaXplV29yZFdpdGhPZmZzZXRXaXRoUmFua0N1dG9mZihzV29yZEdyb3VwLCBzcGxpdFJ1bGVzLCBjbnRSZWMpIHtcbiAgICB2YXIgc1dvcmRHcm91cExDID0gc1dvcmRHcm91cC50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciBzZWVuSXQgPSBjYXRlZ29yaXplV29yZEludGVybmFsV2l0aE9mZnNldHMoc1dvcmRHcm91cCwgc1dvcmRHcm91cExDLCB0cnVlLCBzcGxpdFJ1bGVzLCBjbnRSZWMpO1xuICAgIC8vY29uc29sZS5sb2coXCJTRUVOSVRcIiArIEpTT04uc3RyaW5naWZ5KHNlZW5JdCkpO1xuICAgIC8vdG90YWxDbnQgKz0gMTtcbiAgICAvLyBleGFjdExlbiArPSBzZWVuSXQubGVuZ3RoO1xuICAgIC8vY29uc29sZS5sb2coXCJmaXJzdCBydW4gZXhhY3QgXCIgKyBKU09OLnN0cmluZ2lmeShzZWVuSXQpKTtcbiAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Q2F0RXhhY3QnLCAxKTtcbiAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Q2F0RXhhY3RSZXMnLCBzZWVuSXQubGVuZ3RoKTtcbiAgICBpZiAoZXhwb3J0cy5SYW5rV29yZC5oYXNBYm92ZShzZWVuSXQsIDAuOCkpIHtcbiAgICAgICAgaWYgKGNudFJlYykge1xuICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYywgJ2V4YWN0UHJpb3JUYWtlJywgc2Vlbkl0Lmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgICAgc2Vlbkl0ID0gZXhwb3J0cy5SYW5rV29yZC50YWtlQWJvdmUoc2Vlbkl0LCAwLjgpO1xuICAgICAgICBpZiAoY250UmVjKSB7XG4gICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLCAnZXhhY3RBZnRlclRha2UnLCBzZWVuSXQubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgc2Vlbkl0ID0gY2F0ZWdvcml6ZVdvcmRJbnRlcm5hbFdpdGhPZmZzZXRzKHNXb3JkR3JvdXAsIHNXb3JkR3JvdXBMQywgZmFsc2UsIHNwbGl0UnVsZXMsIGNudFJlYyk7XG4gICAgICAgIGFkZENudFJlYyhjbnRSZWMsICdjbnROb25FeGFjdCcsIDEpO1xuICAgICAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Tm9uRXhhY3RSZXMnLCBzZWVuSXQubGVuZ3RoKTtcbiAgICB9XG4gICAgLy8gdG90YWxMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcbiAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKHNlZW5JdC5sZW5ndGggKyBcIiB3aXRoIFwiICsgc2Vlbkl0LnJlZHVjZShmdW5jdGlvbiAocHJldiwgb2JqKSB7IHJldHVybiBwcmV2ICsgKG9iai5ydWxlLnJhbmdlID8gMSA6IDApOyB9LCAwKSArIFwiIHJhbmdlZCAhXCIpIDogJy0nKTtcbiAgICAvLyAgdmFyIGNudFJhbmdlZCA9IHNlZW5JdC5yZWR1Y2UoIChwcmV2LG9iaikgPT4gcHJldiArIChvYmoucnVsZS5yYW5nZSA/IDEgOiAwKSwwKTtcbiAgICAvLyAgY29uc29sZS5sb2coYCoqKioqKioqKioqICR7c2Vlbkl0Lmxlbmd0aH0gd2l0aCAke2NudFJhbmdlZH0gcmFuZ2VkICFgKTtcbiAgICBzZWVuSXQgPSBleHBvcnRzLlJhbmtXb3JkLnRha2VGaXJzdE4oc2Vlbkl0LCBBbGdvbC5Ub3BfTl9Xb3JkQ2F0ZWdvcml6YXRpb25zKTtcbiAgICAvLyByZXRhaW5lZENudCArPSBzZWVuSXQubGVuZ3RoO1xuICAgIC8vY29uc29sZS5sb2coXCJmaW5hbCByZXMgb2YgY2F0ZWdvcml6ZVdvcmRXaXRoT2Zmc2V0V2l0aFJhbmtDdXRvZmZcIiArIEpTT04uc3RyaW5naWZ5KHNlZW5JdCkpO1xuICAgIHJldHVybiBzZWVuSXQ7XG59XG5leHBvcnRzLmNhdGVnb3JpemVXb3JkV2l0aE9mZnNldFdpdGhSYW5rQ3V0b2ZmID0gY2F0ZWdvcml6ZVdvcmRXaXRoT2Zmc2V0V2l0aFJhbmtDdXRvZmY7XG5mdW5jdGlvbiBjYXRlZ29yaXplV29yZFdpdGhPZmZzZXRXaXRoUmFua0N1dG9mZlNpbmdsZSh3b3JkLCBydWxlKSB7XG4gICAgdmFyIGxjd29yZCA9IHdvcmQudG9Mb3dlckNhc2UoKTtcbiAgICBpZiAobGN3b3JkID09PSBydWxlLmxvd2VyY2FzZXdvcmQpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN0cmluZzogd29yZCxcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IHJ1bGUubWF0Y2hlZFN0cmluZyxcbiAgICAgICAgICAgIGNhdGVnb3J5OiBydWxlLmNhdGVnb3J5LFxuICAgICAgICAgICAgcnVsZTogcnVsZSxcbiAgICAgICAgICAgIF9yYW5raW5nOiBydWxlLl9yYW5raW5nIHx8IDEuMFxuICAgICAgICB9O1xuICAgIH1cbiAgICB2YXIgcmVzID0gW107XG4gICAgY2hlY2tPbmVSdWxlV2l0aE9mZnNldCh3b3JkLCBsY3dvcmQsIGZhbHNlLCByZXMsIHJ1bGUpO1xuICAgIGRlYnVnbG9nKFwiY2F0V1dPV1JDUyBcIiArIGxjd29yZCk7XG4gICAgaWYgKHJlcy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHJlc1swXTtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZVdvcmRXaXRoT2Zmc2V0V2l0aFJhbmtDdXRvZmZTaW5nbGUgPSBjYXRlZ29yaXplV29yZFdpdGhPZmZzZXRXaXRoUmFua0N1dG9mZlNpbmdsZTtcbi8qXG5leHBvcnQgZnVuY3Rpb24gZHVtcENudCgpIHtcbiAgY29uc29sZS5sb2coYFxuZXhhY3RMZW4gPSAke2V4YWN0TGVufTtcbmV4YWN0Q250ID0gJHtleGFjdENudH07XG5mdXp6eUxlbiA9ICR7ZnV6enlMZW59O1xuZnV6enlDbnQgPSAke2Z1enp5Q250fTtcbnRvdGFsQ250ID0gJHt0b3RhbENudH07XG50b3RhbExlbiA9ICR7dG90YWxMZW59O1xucmV0YWluZWRMZW4gPSAke3JldGFpbmVkQ250fTtcbiAgYCk7XG59XG4qL1xuZnVuY3Rpb24gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkU2VudGVuY2Uob1NlbnRlbmNlKSB7XG4gICAgcmV0dXJuIG9TZW50ZW5jZS5ldmVyeShmdW5jdGlvbiAob1dvcmRHcm91cCkge1xuICAgICAgICByZXR1cm4gKG9Xb3JkR3JvdXAubGVuZ3RoID4gMCk7XG4gICAgfSk7XG59XG5leHBvcnRzLmZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZFNlbnRlbmNlID0gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkU2VudGVuY2U7XG5mdW5jdGlvbiBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWQoYXJyKSB7XG4gICAgcmV0dXJuIGFyci5maWx0ZXIoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICByZXR1cm4gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkU2VudGVuY2Uob1NlbnRlbmNlKTtcbiAgICB9KTtcbn1cbmV4cG9ydHMuZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkID0gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkO1xuZnVuY3Rpb24gY2F0ZWdvcml6ZUFXb3JkKHNXb3JkR3JvdXAsIHJ1bGVzLCBzZW50ZW5jZSwgd29yZHMsIGNudFJlYykge1xuICAgIHZhciBzZWVuSXQgPSB3b3Jkc1tzV29yZEdyb3VwXTtcbiAgICBpZiAoc2Vlbkl0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgc2Vlbkl0ID0gY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZihzV29yZEdyb3VwLCBydWxlcywgY250UmVjKTtcbiAgICAgICAgdXRpbHMuZGVlcEZyZWV6ZShzZWVuSXQpO1xuICAgICAgICB3b3Jkc1tzV29yZEdyb3VwXSA9IHNlZW5JdDtcbiAgICB9XG4gICAgaWYgKCFzZWVuSXQgfHwgc2Vlbkl0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBsb2dnZXIoXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBcXFwiXCIgKyBzV29yZEdyb3VwICsgXCJcXFwiIGluIHNlbnRlbmNlIFxcXCJcIlxuICAgICAgICAgICAgKyBzZW50ZW5jZSArIFwiXFxcIlwiKTtcbiAgICAgICAgaWYgKHNXb3JkR3JvdXAuaW5kZXhPZihcIiBcIikgPD0gMCkge1xuICAgICAgICAgICAgZGVidWdsb2coXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBwcmltaXRpdmUgKCEpXCIgKyBzV29yZEdyb3VwKTtcbiAgICAgICAgfVxuICAgICAgICBkZWJ1Z2xvZyhcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIFwiICsgc1dvcmRHcm91cCk7XG4gICAgICAgIGlmICghc2Vlbkl0KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RpbmcgZW10cHkgbGlzdCwgbm90IHVuZGVmaW5lZCBmb3IgXFxcIlwiICsgc1dvcmRHcm91cCArIFwiXFxcIlwiKTtcbiAgICAgICAgfVxuICAgICAgICB3b3Jkc1tzV29yZEdyb3VwXSA9IFtdO1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHJldHVybiB1dGlscy5jbG9uZURlZXAoc2Vlbkl0KTtcbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZUFXb3JkID0gY2F0ZWdvcml6ZUFXb3JkO1xuLyoqXG4gKiBHaXZlbiBhICBzdHJpbmcsIGJyZWFrIGl0IGRvd24gaW50byBjb21wb25lbnRzLFxuICogW1snQScsICdCJ10sIFsnQSBCJ11dXG4gKlxuICogdGhlbiBjYXRlZ29yaXplV29yZHNcbiAqIHJldHVybmluZ1xuICpcbiAqIFsgW1sgeyBjYXRlZ29yeTogJ3N5c3RlbUlkJywgd29yZCA6ICdBJ30sXG4gKiAgICAgIHsgY2F0ZWdvcnk6ICdvdGhlcnRoaW5nJywgd29yZCA6ICdBJ31cbiAqICAgIF0sXG4gKiAgICAvLyByZXN1bHQgb2YgQlxuICogICAgWyB7IGNhdGVnb3J5OiAnc3lzdGVtSWQnLCB3b3JkIDogJ0InfSxcbiAqICAgICAgeyBjYXRlZ29yeTogJ290aGVydGhpbmcnLCB3b3JkIDogJ0EnfVxuICogICAgICB7IGNhdGVnb3J5OiAnYW5vdGhlcnRyeXAnLCB3b3JkIDogJ0InfVxuICogICAgXVxuICogICBdLFxuICogXV1dXG4gKlxuICpcbiAqXG4gKi9cbmZ1bmN0aW9uIGFuYWx5emVTdHJpbmcoc1N0cmluZywgcnVsZXMsIHdvcmRzKSB7XG4gICAgdmFyIGNudCA9IDA7XG4gICAgdmFyIGZhYyA9IDE7XG4gICAgdmFyIHUgPSBicmVha2Rvd24uYnJlYWtkb3duU3RyaW5nKHNTdHJpbmcsIEFsZ29sLk1heFNwYWNlc1BlckNvbWJpbmVkV29yZCk7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCJoZXJlIGJyZWFrZG93blwiICsgSlNPTi5zdHJpbmdpZnkodSkpO1xuICAgIH1cbiAgICAvL2NvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHUpKTtcbiAgICB3b3JkcyA9IHdvcmRzIHx8IHt9O1xuICAgIGRlYnVncGVyZigndGhpcyBtYW55IGtub3duIHdvcmRzOiAnICsgT2JqZWN0LmtleXMod29yZHMpLmxlbmd0aCk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIHZhciBjbnRSZWMgPSB7fTtcbiAgICB1LmZvckVhY2goZnVuY3Rpb24gKGFCcmVha0Rvd25TZW50ZW5jZSkge1xuICAgICAgICB2YXIgY2F0ZWdvcml6ZWRTZW50ZW5jZSA9IFtdO1xuICAgICAgICB2YXIgaXNWYWxpZCA9IGFCcmVha0Rvd25TZW50ZW5jZS5ldmVyeShmdW5jdGlvbiAoc1dvcmRHcm91cCwgaW5kZXgpIHtcbiAgICAgICAgICAgIHZhciBzZWVuSXQgPSBjYXRlZ29yaXplQVdvcmQoc1dvcmRHcm91cCwgcnVsZXMsIHNTdHJpbmcsIHdvcmRzLCBjbnRSZWMpO1xuICAgICAgICAgICAgaWYgKHNlZW5JdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXRlZ29yaXplZFNlbnRlbmNlW2luZGV4XSA9IHNlZW5JdDtcbiAgICAgICAgICAgIGNudCA9IGNudCArIHNlZW5JdC5sZW5ndGg7XG4gICAgICAgICAgICBmYWMgPSBmYWMgKiBzZWVuSXQubGVuZ3RoO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoaXNWYWxpZCkge1xuICAgICAgICAgICAgcmVzLnB1c2goY2F0ZWdvcml6ZWRTZW50ZW5jZSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBkZWJ1Z2xvZyhcIiBzZW50ZW5jZXMgXCIgKyB1Lmxlbmd0aCArIFwiIG1hdGNoZXMgXCIgKyBjbnQgKyBcIiBmYWM6IFwiICsgZmFjKTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCAmJiB1Lmxlbmd0aCkge1xuICAgICAgICBkZWJ1Z2xvZyhcImZpcnN0IG1hdGNoIFwiICsgSlNPTi5zdHJpbmdpZnkodSwgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIGRlYnVncGVyZihcIiBzZW50ZW5jZXMgXCIgKyB1Lmxlbmd0aCArIFwiIC8gXCIgKyByZXMubGVuZ3RoICsgXCIgbWF0Y2hlcyBcIiArIGNudCArIFwiIGZhYzogXCIgKyBmYWMgKyBcIiByZWMgOiBcIiArIEpTT04uc3RyaW5naWZ5KGNudFJlYywgdW5kZWZpbmVkLCAyKSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuYW5hbHl6ZVN0cmluZyA9IGFuYWx5emVTdHJpbmc7XG5mdW5jdGlvbiBjYXRlZ29yaXplQVdvcmRXaXRoT2Zmc2V0cyhzV29yZEdyb3VwLCBydWxlcywgc2VudGVuY2UsIHdvcmRzLCBjbnRSZWMpIHtcbiAgICB2YXIgc2Vlbkl0ID0gd29yZHNbc1dvcmRHcm91cF07XG4gICAgaWYgKHNlZW5JdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHNlZW5JdCA9IGNhdGVnb3JpemVXb3JkV2l0aE9mZnNldFdpdGhSYW5rQ3V0b2ZmKHNXb3JkR3JvdXAsIHJ1bGVzLCBjbnRSZWMpO1xuICAgICAgICB1dGlscy5kZWVwRnJlZXplKHNlZW5JdCk7XG4gICAgICAgIHdvcmRzW3NXb3JkR3JvdXBdID0gc2Vlbkl0O1xuICAgIH1cbiAgICBpZiAoIXNlZW5JdCB8fCBzZWVuSXQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGxvZ2dlcihcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIFxcXCJcIiArIHNXb3JkR3JvdXAgKyBcIlxcXCIgaW4gc2VudGVuY2UgXFxcIlwiXG4gICAgICAgICAgICArIHNlbnRlbmNlICsgXCJcXFwiXCIpO1xuICAgICAgICBpZiAoc1dvcmRHcm91cC5pbmRleE9mKFwiIFwiKSA8PSAwKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZyhcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIHByaW1pdGl2ZSAoISlcIiArIHNXb3JkR3JvdXApO1xuICAgICAgICB9XG4gICAgICAgIGRlYnVnbG9nKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgXCIgKyBzV29yZEdyb3VwKTtcbiAgICAgICAgaWYgKCFzZWVuSXQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGluZyBlbXRweSBsaXN0LCBub3QgdW5kZWZpbmVkIGZvciBcXFwiXCIgKyBzV29yZEdyb3VwICsgXCJcXFwiXCIpO1xuICAgICAgICB9XG4gICAgICAgIHdvcmRzW3NXb3JkR3JvdXBdID0gW107XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgcmV0dXJuIHV0aWxzLmNsb25lRGVlcChzZWVuSXQpO1xufVxuZXhwb3J0cy5jYXRlZ29yaXplQVdvcmRXaXRoT2Zmc2V0cyA9IGNhdGVnb3JpemVBV29yZFdpdGhPZmZzZXRzO1xuLypcblsgW2EsYl0sIFtjLGRdXVxuXG4wMCBhXG4wMSBiXG4xMCBjXG4xMSBkXG4xMiBjXG4qL1xudmFyIGNsb25lID0gdXRpbHMuY2xvbmVEZWVwO1xuZnVuY3Rpb24gY29weVZlY01lbWJlcnModSkge1xuICAgIHZhciBpID0gMDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgdS5sZW5ndGg7ICsraSkge1xuICAgICAgICB1W2ldID0gY2xvbmUodVtpXSk7XG4gICAgfVxuICAgIHJldHVybiB1O1xufVxuLy8gd2UgY2FuIHJlcGxpY2F0ZSB0aGUgdGFpbCBvciB0aGUgaGVhZCxcbi8vIHdlIHJlcGxpY2F0ZSB0aGUgdGFpbCBhcyBpdCBpcyBzbWFsbGVyLlxuLy8gW2EsYixjIF1cbmZ1bmN0aW9uIGV4cGFuZE1hdGNoQXJyKGRlZXApIHtcbiAgICB2YXIgYSA9IFtdO1xuICAgIHZhciBsaW5lID0gW107XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IEpTT04uc3RyaW5naWZ5KGRlZXApIDogJy0nKTtcbiAgICBkZWVwLmZvckVhY2goZnVuY3Rpb24gKHVCcmVha0Rvd25MaW5lLCBpSW5kZXgpIHtcbiAgICAgICAgbGluZVtpSW5kZXhdID0gW107XG4gICAgICAgIHVCcmVha0Rvd25MaW5lLmZvckVhY2goZnVuY3Rpb24gKGFXb3JkR3JvdXAsIHdnSW5kZXgpIHtcbiAgICAgICAgICAgIGxpbmVbaUluZGV4XVt3Z0luZGV4XSA9IFtdO1xuICAgICAgICAgICAgYVdvcmRHcm91cC5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZFZhcmlhbnQsIGlXVkluZGV4KSB7XG4gICAgICAgICAgICAgICAgbGluZVtpSW5kZXhdW3dnSW5kZXhdW2lXVkluZGV4XSA9IG9Xb3JkVmFyaWFudDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gSlNPTi5zdHJpbmdpZnkobGluZSkgOiAnLScpO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICB2YXIgbnZlY3MgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpbmUubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIHZlY3MgPSBbW11dO1xuICAgICAgICB2YXIgbnZlY3MgPSBbXTtcbiAgICAgICAgdmFyIHJ2ZWMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCBsaW5lW2ldLmxlbmd0aDsgKytrKSB7XG4gICAgICAgICAgICAvL3ZlY3MgaXMgdGhlIHZlY3RvciBvZiBhbGwgc28gZmFyIHNlZW4gdmFyaWFudHMgdXAgdG8gayB3Z3MuXG4gICAgICAgICAgICB2YXIgbmV4dEJhc2UgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGwgPSAwOyBsIDwgbGluZVtpXVtrXS5sZW5ndGg7ICsrbCkge1xuICAgICAgICAgICAgICAgIC8vZGVidWdsb2coXCJ2ZWNzIG5vd1wiICsgSlNPTi5zdHJpbmdpZnkodmVjcykpO1xuICAgICAgICAgICAgICAgIG52ZWNzID0gW107IC8vdmVjcy5zbGljZSgpOyAvLyBjb3B5IHRoZSB2ZWNbaV0gYmFzZSB2ZWN0b3I7XG4gICAgICAgICAgICAgICAgLy9kZWJ1Z2xvZyhcInZlY3MgY29waWVkIG5vd1wiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciB1ID0gMDsgdSA8IHZlY3MubGVuZ3RoOyArK3UpIHtcbiAgICAgICAgICAgICAgICAgICAgbnZlY3NbdV0gPSB2ZWNzW3VdLnNsaWNlKCk7IC8vXG4gICAgICAgICAgICAgICAgICAgIG52ZWNzW3VdID0gY29weVZlY01lbWJlcnMobnZlY3NbdV0pO1xuICAgICAgICAgICAgICAgICAgICAvLyBkZWJ1Z2xvZyhcImNvcGllZCB2ZWNzW1wiKyB1K1wiXVwiICsgSlNPTi5zdHJpbmdpZnkodmVjc1t1XSkpO1xuICAgICAgICAgICAgICAgICAgICBudmVjc1t1XS5wdXNoKGNsb25lKGxpbmVbaV1ba11bbF0pKTsgLy8gcHVzaCB0aGUgbHRoIHZhcmlhbnRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gICBkZWJ1Z2xvZyhcIiBhdCAgICAgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbmV4dGJhc2UgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxuICAgICAgICAgICAgICAgIC8vICAgZGVidWdsb2coXCIgYXBwZW5kIFwiICsgayArIFwiOlwiICsgbCArIFwiIG52ZWNzICAgID5cIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSlcbiAgICAgICAgICAgICAgICBuZXh0QmFzZSA9IG5leHRCYXNlLmNvbmNhdChudmVjcyk7XG4gICAgICAgICAgICB9IC8vY29uc3RydVxuICAgICAgICAgICAgLy8gIGRlYnVnbG9nKFwibm93IGF0IFwiICsgayArIFwiOlwiICsgbCArIFwiID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcbiAgICAgICAgICAgIHZlY3MgPSBuZXh0QmFzZTtcbiAgICAgICAgfVxuICAgICAgICBkZWJ1Z2xvZ1YoZGVidWdsb2dWLmVuYWJsZWQgPyAoXCJBUFBFTkRJTkcgVE8gUkVTXCIgKyBpICsgXCI6XCIgKyBsICsgXCIgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKSA6ICctJyk7XG4gICAgICAgIHJlcyA9IHJlcy5jb25jYXQodmVjcyk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmV4cGFuZE1hdGNoQXJyID0gZXhwYW5kTWF0Y2hBcnI7XG4vKipcbiAqIENhbGN1bGF0ZSBhIHdlaWdodCBmYWN0b3IgZm9yIGEgZ2l2ZW4gZGlzdGFuY2UgYW5kXG4gKiBjYXRlZ29yeVxuICogQHBhcmFtIHtpbnRlZ2VyfSBkaXN0IGRpc3RhbmNlIGluIHdvcmRzXG4gKiBAcGFyYW0ge3N0cmluZ30gY2F0ZWdvcnkgY2F0ZWdvcnkgdG8gdXNlXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBhIGRpc3RhbmNlIGZhY3RvciA+PSAxXG4gKiAgMS4wIGZvciBubyBlZmZlY3RcbiAqL1xuZnVuY3Rpb24gcmVpbmZvcmNlRGlzdFdlaWdodChkaXN0LCBjYXRlZ29yeSkge1xuICAgIHZhciBhYnMgPSBNYXRoLmFicyhkaXN0KTtcbiAgICByZXR1cm4gMS4wICsgKEFsZ29sLmFSZWluZm9yY2VEaXN0V2VpZ2h0W2Fic10gfHwgMCk7XG59XG5leHBvcnRzLnJlaW5mb3JjZURpc3RXZWlnaHQgPSByZWluZm9yY2VEaXN0V2VpZ2h0O1xuLyoqXG4gKiBHaXZlbiBhIHNlbnRlbmNlLCBleHRhY3QgY2F0ZWdvcmllc1xuICovXG5mdW5jdGlvbiBleHRyYWN0Q2F0ZWdvcnlNYXAob1NlbnRlbmNlKSB7XG4gICAgdmFyIHJlcyA9IHt9O1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoJ2V4dHJhY3RDYXRlZ29yeU1hcCAnICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKSkgOiAnLScpO1xuICAgIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaUluZGV4KSB7XG4gICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gSUZNYXRjaC5DQVRfQ0FURUdPUlkpIHtcbiAgICAgICAgICAgIHJlc1tvV29yZC5tYXRjaGVkU3RyaW5nXSA9IHJlc1tvV29yZC5tYXRjaGVkU3RyaW5nXSB8fCBbXTtcbiAgICAgICAgICAgIHJlc1tvV29yZC5tYXRjaGVkU3RyaW5nXS5wdXNoKHsgcG9zOiBpSW5kZXggfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICB1dGlscy5kZWVwRnJlZXplKHJlcyk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZXh0cmFjdENhdGVnb3J5TWFwID0gZXh0cmFjdENhdGVnb3J5TWFwO1xuZnVuY3Rpb24gcmVpbkZvcmNlU2VudGVuY2Uob1NlbnRlbmNlKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgdmFyIG9DYXRlZ29yeU1hcCA9IGV4dHJhY3RDYXRlZ29yeU1hcChvU2VudGVuY2UpO1xuICAgIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaUluZGV4KSB7XG4gICAgICAgIHZhciBtID0gb0NhdGVnb3J5TWFwW29Xb3JkLmNhdGVnb3J5XSB8fCBbXTtcbiAgICAgICAgbS5mb3JFYWNoKGZ1bmN0aW9uIChvUG9zaXRpb24pIHtcbiAgICAgICAgICAgIFwidXNlIHN0cmljdFwiO1xuICAgICAgICAgICAgb1dvcmQucmVpbmZvcmNlID0gb1dvcmQucmVpbmZvcmNlIHx8IDE7XG4gICAgICAgICAgICB2YXIgYm9vc3QgPSByZWluZm9yY2VEaXN0V2VpZ2h0KGlJbmRleCAtIG9Qb3NpdGlvbi5wb3MsIG9Xb3JkLmNhdGVnb3J5KTtcbiAgICAgICAgICAgIG9Xb3JkLnJlaW5mb3JjZSAqPSBib29zdDtcbiAgICAgICAgICAgIG9Xb3JkLl9yYW5raW5nICo9IGJvb3N0O1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGlJbmRleCkge1xuICAgICAgICBpZiAoaUluZGV4ID4gMCkge1xuICAgICAgICAgICAgaWYgKG9TZW50ZW5jZVtpSW5kZXggLSAxXS5jYXRlZ29yeSA9PT0gXCJtZXRhXCIgJiYgKG9Xb3JkLmNhdGVnb3J5ID09PSBvU2VudGVuY2VbaUluZGV4IC0gMV0ubWF0Y2hlZFN0cmluZykpIHtcbiAgICAgICAgICAgICAgICBvV29yZC5yZWluZm9yY2UgPSBvV29yZC5yZWluZm9yY2UgfHwgMTtcbiAgICAgICAgICAgICAgICB2YXIgYm9vc3QgPSByZWluZm9yY2VEaXN0V2VpZ2h0KDEsIG9Xb3JkLmNhdGVnb3J5KTtcbiAgICAgICAgICAgICAgICBvV29yZC5yZWluZm9yY2UgKj0gYm9vc3Q7XG4gICAgICAgICAgICAgICAgb1dvcmQuX3JhbmtpbmcgKj0gYm9vc3Q7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gb1NlbnRlbmNlO1xufVxuZXhwb3J0cy5yZWluRm9yY2VTZW50ZW5jZSA9IHJlaW5Gb3JjZVNlbnRlbmNlO1xudmFyIFNlbnRlbmNlID0gcmVxdWlyZShcIi4vc2VudGVuY2VcIik7XG5mdW5jdGlvbiByZWluRm9yY2UoYUNhdGVnb3JpemVkQXJyYXkpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICBhQ2F0ZWdvcml6ZWRBcnJheS5mb3JFYWNoKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgcmVpbkZvcmNlU2VudGVuY2Uob1NlbnRlbmNlKTtcbiAgICB9KTtcbiAgICBhQ2F0ZWdvcml6ZWRBcnJheS5zb3J0KFNlbnRlbmNlLmNtcFJhbmtpbmdQcm9kdWN0KTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcImFmdGVyIHJlaW5mb3JjZVwiICsgYUNhdGVnb3JpemVkQXJyYXkubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgICAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgICB9XG4gICAgcmV0dXJuIGFDYXRlZ29yaXplZEFycmF5O1xufVxuZXhwb3J0cy5yZWluRm9yY2UgPSByZWluRm9yY2U7XG4vLy8gYmVsb3cgbWF5IG5vIGxvbmdlciBiZSB1c2VkXG5mdW5jdGlvbiBtYXRjaFJlZ0V4cChvUnVsZSwgY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChjb250ZXh0W29SdWxlLmtleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgc0tleSA9IG9SdWxlLmtleTtcbiAgICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgcmVnID0gb1J1bGUucmVnZXhwO1xuICAgIHZhciBtID0gcmVnLmV4ZWMoczEpO1xuICAgIGlmIChkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZ1YoXCJhcHBseWluZyByZWdleHA6IFwiICsgczEgKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KG0pKTtcbiAgICB9XG4gICAgaWYgKCFtKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsIG9SdWxlLmZvbGxvd3MsIG9SdWxlLmtleSk7XG4gICAgaWYgKGRlYnVnbG9nVi5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nVihKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xuICAgICAgICBkZWJ1Z2xvZ1YoSlNPTi5zdHJpbmdpZnkob3B0aW9ucykpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5tYXRjaG90aGVycyAmJiAoZGVsdGEuZGlmZmVyZW50ID4gMCkpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIG9FeHRyYWN0ZWRDb250ZXh0ID0gZXh0cmFjdEFyZ3NNYXAobSwgb1J1bGUuYXJnc01hcCk7XG4gICAgaWYgKGRlYnVnbG9nVi5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nVihcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUuYXJnc01hcCkpO1xuICAgICAgICBkZWJ1Z2xvZ1YoXCJtYXRjaCBcIiArIEpTT04uc3RyaW5naWZ5KG0pKTtcbiAgICAgICAgZGVidWdsb2dWKFwiZXh0cmFjdGVkIGFyZ3MgXCIgKyBKU09OLnN0cmluZ2lmeShvRXh0cmFjdGVkQ29udGV4dCkpO1xuICAgIH1cbiAgICB2YXIgcmVzID0gQW55T2JqZWN0LmFzc2lnbih7fSwgb1J1bGUuZm9sbG93cyk7XG4gICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9FeHRyYWN0ZWRDb250ZXh0KTtcbiAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgY29udGV4dCk7XG4gICAgaWYgKG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVzW3NLZXldID0gb0V4dHJhY3RlZENvbnRleHRbc0tleV07XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XG4gICAgICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvUnVsZS5mb2xsb3dzKTtcbiAgICAgICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9FeHRyYWN0ZWRDb250ZXh0KTtcbiAgICB9XG4gICAgT2JqZWN0LmZyZWV6ZShyZXMpO1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoJ0ZvdW5kIG9uZScgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpIDogJy0nKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5tYXRjaFJlZ0V4cCA9IG1hdGNoUmVnRXhwO1xuZnVuY3Rpb24gc29ydEJ5V2VpZ2h0KHNLZXksIG9Db250ZXh0QSwgb0NvbnRleHRCKSB7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2dWKCdzb3J0aW5nOiAnICsgc0tleSArICdpbnZva2VkIHdpdGhcXG4gMTonICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHRBLCB1bmRlZmluZWQsIDIpICtcbiAgICAgICAgICAgIFwiIHZzIFxcbiAyOlwiICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHRCLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgdmFyIHJhbmtpbmdBID0gcGFyc2VGbG9hdChvQ29udGV4dEFbXCJfcmFua2luZ1wiXSB8fCBcIjFcIik7XG4gICAgdmFyIHJhbmtpbmdCID0gcGFyc2VGbG9hdChvQ29udGV4dEJbXCJfcmFua2luZ1wiXSB8fCBcIjFcIik7XG4gICAgaWYgKHJhbmtpbmdBICE9PSByYW5raW5nQikge1xuICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgZGVidWdsb2coXCIgcmFua2luIGRlbHRhXCIgKyAxMDAgKiAocmFua2luZ0IgLSByYW5raW5nQSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAxMDAgKiAocmFua2luZ0IgLSByYW5raW5nQSk7XG4gICAgfVxuICAgIHZhciB3ZWlnaHRBID0gb0NvbnRleHRBW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdW3NLZXldIHx8IDA7XG4gICAgdmFyIHdlaWdodEIgPSBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QltcIl93ZWlnaHRcIl1bc0tleV0gfHwgMDtcbiAgICByZXR1cm4gKyh3ZWlnaHRCIC0gd2VpZ2h0QSk7XG59XG5leHBvcnRzLnNvcnRCeVdlaWdodCA9IHNvcnRCeVdlaWdodDtcbi8vIFdvcmQsIFN5bm9ueW0sIFJlZ2V4cCAvIEV4dHJhY3Rpb25SdWxlXG5mdW5jdGlvbiBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgb1J1bGVzLCBvcHRpb25zKSB7XG4gICAgdmFyIHNLZXkgPSBvUnVsZXNbMF0ua2V5O1xuICAgIC8vIGNoZWNrIHRoYXQgcnVsZVxuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIC8vIGNoZWNrIGNvbnNpc3RlbmN5XG4gICAgICAgIG9SdWxlcy5ldmVyeShmdW5jdGlvbiAoaVJ1bGUpIHtcbiAgICAgICAgICAgIGlmIChpUnVsZS5rZXkgIT09IHNLZXkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbmhvbW9nZW5vdXMga2V5cyBpbiBydWxlcywgZXhwZWN0ZWQgXCIgKyBzS2V5ICsgXCIgd2FzIFwiICsgSlNPTi5zdHJpbmdpZnkoaVJ1bGUpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8gbG9vayBmb3IgcnVsZXMgd2hpY2ggbWF0Y2hcbiAgICB2YXIgcmVzID0gb1J1bGVzLm1hcChmdW5jdGlvbiAob1J1bGUpIHtcbiAgICAgICAgLy8gaXMgdGhpcyBydWxlIGFwcGxpY2FibGVcbiAgICAgICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlIDAgLyogV09SRCAqLzpcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2hXb3JkKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKTtcbiAgICAgICAgICAgIGNhc2UgMSAvKiBSRUdFWFAgKi86XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hdGNoUmVnRXhwKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0pLmZpbHRlcihmdW5jdGlvbiAob3Jlcykge1xuICAgICAgICByZXR1cm4gISFvcmVzO1xuICAgIH0pLnNvcnQoc29ydEJ5V2VpZ2h0LmJpbmQodGhpcywgc0tleSkpO1xuICAgIC8vZGVidWdsb2coXCJoYXNzb3J0ZWRcIiArIEpTT04uc3RyaW5naWZ5KHJlcyx1bmRlZmluZWQsMikpO1xuICAgIHJldHVybiByZXM7XG4gICAgLy8gT2JqZWN0LmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgLy8gfSk7XG59XG5leHBvcnRzLmF1Z21lbnRDb250ZXh0MSA9IGF1Z21lbnRDb250ZXh0MTtcbmZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0KGNvbnRleHQsIGFSdWxlcykge1xuICAgIHZhciBvcHRpb25zMSA9IHtcbiAgICAgICAgbWF0Y2hvdGhlcnM6IHRydWUsXG4gICAgICAgIG92ZXJyaWRlOiBmYWxzZVxuICAgIH07XG4gICAgdmFyIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMSk7XG4gICAgaWYgKGFSZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHZhciBvcHRpb25zMiA9IHtcbiAgICAgICAgICAgIG1hdGNob3RoZXJzOiBmYWxzZSxcbiAgICAgICAgICAgIG92ZXJyaWRlOiB0cnVlXG4gICAgICAgIH07XG4gICAgICAgIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMik7XG4gICAgfVxuICAgIHJldHVybiBhUmVzO1xufVxuZXhwb3J0cy5hdWdtZW50Q29udGV4dCA9IGF1Z21lbnRDb250ZXh0O1xuZnVuY3Rpb24gaW5zZXJ0T3JkZXJlZChyZXN1bHQsIGlJbnNlcnRlZE1lbWJlciwgbGltaXQpIHtcbiAgICAvLyBUT0RPOiB1c2Ugc29tZSB3ZWlnaHRcbiAgICBpZiAocmVzdWx0Lmxlbmd0aCA8IGxpbWl0KSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKGlJbnNlcnRlZE1lbWJlcik7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5leHBvcnRzLmluc2VydE9yZGVyZWQgPSBpbnNlcnRPcmRlcmVkO1xuZnVuY3Rpb24gdGFrZVRvcE4oYXJyKSB7XG4gICAgdmFyIHUgPSBhcnIuZmlsdGVyKGZ1bmN0aW9uIChpbm5lckFycikgeyByZXR1cm4gaW5uZXJBcnIubGVuZ3RoID4gMDsgfSk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIC8vIHNoaWZ0IG91dCB0aGUgdG9wIG9uZXNcbiAgICB1ID0gdS5tYXAoZnVuY3Rpb24gKGlBcnIpIHtcbiAgICAgICAgdmFyIHRvcCA9IGlBcnIuc2hpZnQoKTtcbiAgICAgICAgcmVzID0gaW5zZXJ0T3JkZXJlZChyZXMsIHRvcCwgNSk7XG4gICAgICAgIHJldHVybiBpQXJyO1xuICAgIH0pLmZpbHRlcihmdW5jdGlvbiAoaW5uZXJBcnIpIHsgcmV0dXJuIGlubmVyQXJyLmxlbmd0aCA+IDA7IH0pO1xuICAgIC8vIGFzIEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMudGFrZVRvcE4gPSB0YWtlVG9wTjtcbnZhciBpbnB1dEZpbHRlclJ1bGVzID0gcmVxdWlyZShcIi4vaW5wdXRGaWx0ZXJSdWxlc1wiKTtcbnZhciBybTtcbmZ1bmN0aW9uIGdldFJNT25jZSgpIHtcbiAgICBpZiAoIXJtKSB7XG4gICAgICAgIHJtID0gaW5wdXRGaWx0ZXJSdWxlcy5nZXRSdWxlTWFwKCk7XG4gICAgfVxuICAgIHJldHVybiBybTtcbn1cbmZ1bmN0aW9uIGFwcGx5UnVsZXMoY29udGV4dCkge1xuICAgIHZhciBiZXN0TiA9IFtjb250ZXh0XTtcbiAgICBpbnB1dEZpbHRlclJ1bGVzLm9LZXlPcmRlci5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgICAgIHZhciBiZXN0TmV4dCA9IFtdO1xuICAgICAgICBiZXN0Ti5mb3JFYWNoKGZ1bmN0aW9uIChvQ29udGV4dCkge1xuICAgICAgICAgICAgaWYgKG9Db250ZXh0W3NLZXldKSB7XG4gICAgICAgICAgICAgICAgZGVidWdsb2coJyoqIGFwcGx5aW5nIHJ1bGVzIGZvciAnICsgc0tleSk7XG4gICAgICAgICAgICAgICAgdmFyIHJlcyA9IGF1Z21lbnRDb250ZXh0KG9Db250ZXh0LCBnZXRSTU9uY2UoKVtzS2V5XSB8fCBbXSk7XG4gICAgICAgICAgICAgICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/ICgnKiogcmVzdWx0IGZvciAnICsgc0tleSArICcgPSAnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKSA6ICctJyk7XG4gICAgICAgICAgICAgICAgYmVzdE5leHQucHVzaChyZXMgfHwgW10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gcnVsZSBub3QgcmVsZXZhbnRcbiAgICAgICAgICAgICAgICBiZXN0TmV4dC5wdXNoKFtvQ29udGV4dF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgYmVzdE4gPSB0YWtlVG9wTihiZXN0TmV4dCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGJlc3ROO1xufVxuZXhwb3J0cy5hcHBseVJ1bGVzID0gYXBwbHlSdWxlcztcbmZ1bmN0aW9uIGFwcGx5UnVsZXNQaWNrRmlyc3QoY29udGV4dCkge1xuICAgIHZhciByID0gYXBwbHlSdWxlcyhjb250ZXh0KTtcbiAgICByZXR1cm4gciAmJiByWzBdO1xufVxuZXhwb3J0cy5hcHBseVJ1bGVzUGlja0ZpcnN0ID0gYXBwbHlSdWxlc1BpY2tGaXJzdDtcbi8qKlxuICogRGVjaWRlIHdoZXRoZXIgdG8gcmVxdWVyeSBmb3IgYSBjb250ZXRcbiAqL1xuZnVuY3Rpb24gZGVjaWRlT25SZVF1ZXJ5KGNvbnRleHQpIHtcbiAgICByZXR1cm4gW107XG59XG5leHBvcnRzLmRlY2lkZU9uUmVRdWVyeSA9IGRlY2lkZU9uUmVRdWVyeTtcbiIsIi8qKlxyXG4gKiB0aGUgaW5wdXQgZmlsdGVyIHN0YWdlIHByZXByb2Nlc3NlcyBhIGN1cnJlbnQgY29udGV4dFxyXG4gKlxyXG4gKiBJdCBhKSBjb21iaW5lcyBtdWx0aS1zZWdtZW50IGFyZ3VtZW50cyBpbnRvIG9uZSBjb250ZXh0IG1lbWJlcnNcclxuICogSXQgYikgYXR0ZW1wdHMgdG8gYXVnbWVudCB0aGUgY29udGV4dCBieSBhZGRpdGlvbmFsIHF1YWxpZmljYXRpb25zXHJcbiAqICAgICAgICAgICAoTWlkIHRlcm0gZ2VuZXJhdGluZyBBbHRlcm5hdGl2ZXMsIGUuZy5cclxuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHVuaXQgdGVzdD9cclxuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHNvdXJjZSA/XHJcbiAqICAgICAgICAgICApXHJcbiAqICBTaW1wbGUgcnVsZXMgbGlrZSAgSW50ZW50XHJcbiAqXHJcbiAqXHJcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmlucHV0RmlsdGVyXHJcbiAqIEBmaWxlIGlucHV0RmlsdGVyLnRzXHJcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cclxuICovXHJcbi8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2xpYi9ub2RlLTQuZC50c1wiIC8+XHJcbmltcG9ydCAqIGFzIGRpc3RhbmNlIGZyb20gJy4uL3V0aWxzL2RhbWVyYXVMZXZlbnNodGVpbic7XHJcblxyXG5pbXBvcnQgKiBhcyBMb2dnZXIgZnJvbSAnLi4vdXRpbHMvbG9nZ2VyJ1xyXG5cclxuY29uc3QgbG9nZ2VyID0gTG9nZ2VyLmxvZ2dlcignaW5wdXRGaWx0ZXInKTtcclxuXHJcbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcclxudmFyIGRlYnVncGVyZiA9IGRlYnVnKCdwZXJmJyk7XHJcblxyXG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuLi91dGlscy91dGlscyc7XHJcblxyXG5cclxuaW1wb3J0ICogYXMgQWxnb2wgZnJvbSAnLi9hbGdvbCc7XHJcblxyXG5pbXBvcnQgKiBhcyBJTWF0Y2ggZnJvbSAnLi9pZm1hdGNoJztcclxuXHJcbmltcG9ydCAqIGFzIGJyZWFrZG93biBmcm9tICcuL2JyZWFrZG93bic7XHJcblxyXG5jb25zdCBBbnlPYmplY3QgPSA8YW55Pk9iamVjdDtcclxuXHJcbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ2lucHV0RmlsdGVyJylcclxuY29uc3QgZGVidWdsb2dWID0gZGVidWcoJ2lucHV0VkZpbHRlcicpXHJcbmNvbnN0IGRlYnVnbG9nTSA9IGRlYnVnKCdpbnB1dE1GaWx0ZXInKVxyXG5cclxuXHJcblxyXG5pbXBvcnQgKiBhcyBtYXRjaGRhdGEgZnJvbSAnLi9tYXRjaGRhdGEnO1xyXG52YXIgb1VuaXRUZXN0cyA9IG1hdGNoZGF0YS5vVW5pdFRlc3RzXHJcblxyXG5cclxuXHJcbi8qKlxyXG4gKiBAcGFyYW0gc1RleHQge3N0cmluZ30gdGhlIHRleHQgdG8gbWF0Y2ggdG8gTmF2VGFyZ2V0UmVzb2x1dGlvblxyXG4gKiBAcGFyYW0gc1RleHQyIHtzdHJpbmd9IHRoZSBxdWVyeSB0ZXh0LCBlLmcuIE5hdlRhcmdldFxyXG4gKlxyXG4gKiBAcmV0dXJuIHRoZSBkaXN0YW5jZSwgbm90ZSB0aGF0IGlzIGlzICpub3QqIHN5bW1ldHJpYyFcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjYWxjRGlzdGFuY2Uoc1RleHQxOiBzdHJpbmcsIHNUZXh0Mjogc3RyaW5nKTogbnVtYmVyIHtcclxuICByZXR1cm4gZGlzdGFuY2UuY2FsY0Rpc3RhbmNlQWRqdXN0ZWQoc1RleHQxLHNUZXh0Mik7XHJcbn1cclxuXHJcblxyXG5cclxuLyoqXHJcbiAqIEBwYXJhbSBzVGV4dCB7c3RyaW5nfSB0aGUgdGV4dCB0byBtYXRjaCB0byBOYXZUYXJnZXRSZXNvbHV0aW9uXHJcbiAqIEBwYXJhbSBzVGV4dDIge3N0cmluZ30gdGhlIHF1ZXJ5IHRleHQsIGUuZy4gTmF2VGFyZ2V0XHJcbiAqXHJcbiAqIEByZXR1cm4gdGhlIGRpc3RhbmNlLCBub3RlIHRoYXQgaXMgaXMgKm5vdCogc3ltbWV0cmljIVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNEaXN0YW5jZUxldmVuWFhYKHNUZXh0MTogc3RyaW5nLCBzVGV4dDI6IHN0cmluZyk6IG51bWJlciB7XHJcbiAgLy8gY29uc29sZS5sb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxyXG4gICBpZigoKHNUZXh0MS5sZW5ndGggLSBzVGV4dDIubGVuZ3RoKSA+IEFsZ29sLmNhbGNEaXN0Lmxlbmd0aERlbHRhMSlcclxuICAgIHx8IChzVGV4dDIubGVuZ3RoID4gMS41ICogc1RleHQxLmxlbmd0aCApXHJcbiAgICB8fCAoc1RleHQyLmxlbmd0aCA8IChzVGV4dDEubGVuZ3RoLzIpKSApIHtcclxuICAgIHJldHVybiA1MDAwMDtcclxuICB9XHJcbiAgdmFyIGEwID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnN1YnN0cmluZygwLCBzVGV4dDIubGVuZ3RoKSwgc1RleHQyKVxyXG4gIGlmKGRlYnVnbG9nVi5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZ1YoXCJkaXN0YW5jZVwiICsgYTAgKyBcInN0cmlwcGVkPlwiICsgc1RleHQxLnN1YnN0cmluZygwLHNUZXh0Mi5sZW5ndGgpICsgXCI8PlwiICsgc1RleHQyKyBcIjxcIik7XHJcbiAgfVxyXG4gIGlmKGEwICogNTAgPiAxNSAqIHNUZXh0Mi5sZW5ndGgpIHtcclxuICAgICAgcmV0dXJuIDQwMDAwO1xyXG4gIH1cclxuICB2YXIgYSA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MSwgc1RleHQyKVxyXG4gIHJldHVybiBhMCAqIDUwMCAvIHNUZXh0Mi5sZW5ndGggKyBhXHJcbn1cclxuXHJcblxyXG5cclxuXHJcbmltcG9ydCAqIGFzIElGTWF0Y2ggZnJvbSAnLi4vbWF0Y2gvaWZtYXRjaCc7XHJcblxyXG50eXBlIElSdWxlID0gSUZNYXRjaC5JUnVsZVxyXG5cclxuXHJcbmludGVyZmFjZSBJTWF0Y2hPcHRpb25zIHtcclxuICBtYXRjaG90aGVycz86IGJvb2xlYW4sXHJcbiAgYXVnbWVudD86IGJvb2xlYW4sXHJcbiAgb3ZlcnJpZGU/OiBib29sZWFuXHJcbn1cclxuXHJcbmludGVyZmFjZSBJTWF0Y2hDb3VudCB7XHJcbiAgZXF1YWw6IG51bWJlclxyXG4gIGRpZmZlcmVudDogbnVtYmVyXHJcbiAgc3B1cmlvdXNSOiBudW1iZXJcclxuICBzcHVyaW91c0w6IG51bWJlclxyXG59XHJcblxyXG50eXBlIEVudW1SdWxlVHlwZSA9IElGTWF0Y2guRW51bVJ1bGVUeXBlXHJcblxyXG4vL2NvbnN0IGxldmVuQ3V0b2ZmID0gQWxnb2wuQ3V0b2ZmX0xldmVuU2h0ZWluO1xyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBsZXZlblBlbmFsdHlPbGQoaTogbnVtYmVyKTogbnVtYmVyIHtcclxuICAvLyAwLT4gMVxyXG4gIC8vIDEgLT4gMC4xXHJcbiAgLy8gMTUwIC0+ICAwLjhcclxuICBpZiAoaSA9PT0gMCkge1xyXG4gICAgcmV0dXJuIDE7XHJcbiAgfVxyXG4gIC8vIHJldmVyc2UgbWF5IGJlIGJldHRlciB0aGFuIGxpbmVhclxyXG4gIHJldHVybiAxICsgaSAqICgwLjggLSAxKSAvIDE1MFxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbGV2ZW5QZW5hbHR5KGk6IG51bWJlcik6IG51bWJlciB7XHJcbiAgLy8gMSAtPiAxXHJcbiAgLy8gY3V0T2ZmID0+IDAuOFxyXG4gIHJldHVybiBpO1xyXG4gIC8vcmV0dXJuICAgMSAtICAoMSAtIGkpICowLjIvQWxnb2wuQ3V0b2ZmX1dvcmRNYXRjaDtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIG5vblByaXZhdGVLZXlzKG9BKSB7XHJcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG9BKS5maWx0ZXIoa2V5ID0+IHtcclxuICAgIHJldHVybiBrZXlbMF0gIT09ICdfJztcclxuICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNvdW50QWluQihvQSwgb0IsIGZuQ29tcGFyZSwgYUtleUlnbm9yZT8pOiBudW1iZXIge1xyXG4gIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gYUtleUlnbm9yZSA6XHJcbiAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xyXG4gIGZuQ29tcGFyZSA9IGZuQ29tcGFyZSB8fCBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9XHJcbiAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xyXG4gICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcclxuICB9KS5cclxuICAgIHJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XHJcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIChmbkNvbXBhcmUob0Fba2V5XSwgb0Jba2V5XSwga2V5KSA/IDEgOiAwKVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBwcmV2XHJcbiAgICB9LCAwKVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc3B1cmlvdXNBbm90SW5CKG9BLCBvQiwgYUtleUlnbm9yZT8pIHtcclxuICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxyXG4gICAgdHlwZW9mIGFLZXlJZ25vcmUgPT09IFwic3RyaW5nXCIgPyBbYUtleUlnbm9yZV0gOiBbXTtcclxuICByZXR1cm4gbm9uUHJpdmF0ZUtleXMob0EpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xyXG4gIH0pLlxyXG4gICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIDFcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldlxyXG4gICAgfSwgMClcclxufVxyXG5cclxuZnVuY3Rpb24gbG93ZXJDYXNlKG8pIHtcclxuICBpZiAodHlwZW9mIG8gPT09IFwic3RyaW5nXCIpIHtcclxuICAgIHJldHVybiBvLnRvTG93ZXJDYXNlKClcclxuICB9XHJcbiAgcmV0dXJuIG9cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmVDb250ZXh0KG9BLCBvQiwgYUtleUlnbm9yZT8pIHtcclxuICB2YXIgZXF1YWwgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpID09PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xyXG4gIHZhciBkaWZmZXJlbnQgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpICE9PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xyXG4gIHZhciBzcHVyaW91c0wgPSBzcHVyaW91c0Fub3RJbkIob0EsIG9CLCBhS2V5SWdub3JlKVxyXG4gIHZhciBzcHVyaW91c1IgPSBzcHVyaW91c0Fub3RJbkIob0IsIG9BLCBhS2V5SWdub3JlKVxyXG4gIHJldHVybiB7XHJcbiAgICBlcXVhbDogZXF1YWwsXHJcbiAgICBkaWZmZXJlbnQ6IGRpZmZlcmVudCxcclxuICAgIHNwdXJpb3VzTDogc3B1cmlvdXNMLFxyXG4gICAgc3B1cmlvdXNSOiBzcHVyaW91c1JcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNvcnRCeVJhbmsoYTogSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmcsIGI6IElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nKTogbnVtYmVyIHtcclxuICB2YXIgciA9IC0oKGEuX3JhbmtpbmcgfHwgMS4wKSAtIChiLl9yYW5raW5nIHx8IDEuMCkpO1xyXG4gIGlmIChyKSB7XHJcbiAgICByZXR1cm4gcjtcclxuICB9XHJcbiAgaWYgKGEuY2F0ZWdvcnkgJiYgYi5jYXRlZ29yeSkge1xyXG4gICAgciA9IGEuY2F0ZWdvcnkubG9jYWxlQ29tcGFyZShiLmNhdGVnb3J5KTtcclxuICAgIGlmIChyKSB7XHJcbiAgICAgIHJldHVybiByO1xyXG4gICAgfVxyXG4gIH1cclxuICBpZiAoYS5tYXRjaGVkU3RyaW5nICYmIGIubWF0Y2hlZFN0cmluZykge1xyXG4gICAgciA9IGEubWF0Y2hlZFN0cmluZy5sb2NhbGVDb21wYXJlKGIubWF0Y2hlZFN0cmluZyk7XHJcbiAgICBpZiAocikge1xyXG4gICAgICByZXR1cm4gcjtcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIDA7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tPbmVSdWxlKHN0cmluZzogc3RyaW5nLCBsY1N0cmluZyA6IHN0cmluZywgZXhhY3QgOiBib29sZWFuLFxyXG5yZXMgOiBBcnJheTxJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPixcclxub1J1bGUgOiBJTWF0Y2gubVJ1bGUsIGNudFJlYz8gOiBJQ250UmVjICkge1xyXG4gICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcclxuICAgICAgZGVidWdsb2dWKCdhdHRlbXB0aW5nIHRvIG1hdGNoIHJ1bGUgJyArIEpTT04uc3RyaW5naWZ5KG9SdWxlKSArIFwiIHRvIHN0cmluZyBcXFwiXCIgKyBzdHJpbmcgKyBcIlxcXCJcIik7XHJcbiAgICB9XHJcbiAgICBzd2l0Y2ggKG9SdWxlLnR5cGUpIHtcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5XT1JEOlxyXG4gICAgICAgIGlmKCFvUnVsZS5sb3dlcmNhc2V3b3JkKSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3J1bGUgd2l0aG91dCBhIGxvd2VyY2FzZSB2YXJpYW50JyArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKTtcclxuICAgICAgICAgfTtcclxuICAgICAgICBpZiAoZXhhY3QgJiYgb1J1bGUud29yZCA9PT0gc3RyaW5nIHx8IG9SdWxlLmxvd2VyY2FzZXdvcmQgPT09IGxjU3RyaW5nKSB7XHJcbiAgICAgICAgICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAgICAgICAgIGRlYnVnbG9nKFwiXFxuIW1hdGNoZWQgZXhhY3QgXCIgKyBzdHJpbmcgKyBcIj1cIiAgKyBvUnVsZS5sb3dlcmNhc2V3b3JkICArIFwiID0+IFwiICsgb1J1bGUubWF0Y2hlZFN0cmluZyArIFwiL1wiICsgb1J1bGUuY2F0ZWdvcnkpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmVzLnB1c2goe1xyXG4gICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcclxuICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxyXG4gICAgICAgICAgICBfcmFua2luZzogb1J1bGUuX3JhbmtpbmcgfHwgMS4wXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIWV4YWN0ICYmICFvUnVsZS5leGFjdE9ubHkpIHtcclxuICAgICAgICAgIHZhciBsZXZlbm1hdGNoID0gY2FsY0Rpc3RhbmNlKG9SdWxlLmxvd2VyY2FzZXdvcmQsIGxjU3RyaW5nKTtcclxuXHJcbi8qXHJcbiAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlXCIsIDEpO1xyXG4gICAgICAgICAgaWYobGV2ZW5tYXRjaCA8IDUwKSB7XHJcbiAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VFeHBcIiwgMSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZihsZXZlbm1hdGNoIDwgNDAwMDApIHtcclxuICAgICAgICAgICAgYWRkQ250UmVjKGNudFJlYyxcImNhbGNEaXN0YW5jZUJlbG93NDBrXCIsIDEpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgKi9cclxuICAgICAgICAgIC8vaWYob1J1bGUubG93ZXJjYXNld29yZCA9PT0gXCJjb3Ntb3NcIikge1xyXG4gICAgICAgICAgLy8gIGNvbnNvbGUubG9nKFwiaGVyZSByYW5raW5nIFwiICsgbGV2ZW5tYXRjaCArIFwiIFwiICsgb1J1bGUubG93ZXJjYXNld29yZCArIFwiIFwiICsgbGNTdHJpbmcpO1xyXG4gICAgICAgICAgLy99XHJcbiAgICAgICAgICBpZiAobGV2ZW5tYXRjaCA+PSBBbGdvbC5DdXRvZmZfV29yZE1hdGNoKSB7IC8vIGxldmVuQ3V0b2ZmKSB7XHJcbiAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VPa1wiLCAxKTtcclxuICAgICAgICAgICAgdmFyIHJlYyA9IHtcclxuICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcclxuICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBvUnVsZS5tYXRjaGVkU3RyaW5nLFxyXG4gICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgICBfcmFua2luZzogKG9SdWxlLl9yYW5raW5nIHx8IDEuMCkgKiBsZXZlblBlbmFsdHkobGV2ZW5tYXRjaCksXHJcbiAgICAgICAgICAgICAgbGV2ZW5tYXRjaDogbGV2ZW5tYXRjaFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBpZihkZWJ1Z2xvZykge1xyXG4gICAgICAgICAgICAgIGRlYnVnbG9nKFwiXFxuIWZ1enp5IFwiICsgKGxldmVubWF0Y2gpLnRvRml4ZWQoMykgKyBcIiBcIiArIHJlYy5fcmFua2luZy50b0ZpeGVkKDMpICsgXCIgIFwiICsgc3RyaW5nICsgXCI9XCIgICsgb1J1bGUubG93ZXJjYXNld29yZCAgKyBcIiA9PiBcIiArIG9SdWxlLm1hdGNoZWRTdHJpbmcgKyBcIi9cIiArIG9SdWxlLmNhdGVnb3J5KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXMucHVzaChyZWMpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5SRUdFWFA6IHtcclxuICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoXCIgaGVyZSByZWdleHBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKSlcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIG0gPSBvUnVsZS5yZWdleHAuZXhlYyhzdHJpbmcpXHJcbiAgICAgICAgaWYgKG0pIHtcclxuICAgICAgICAgIHJlcy5wdXNoKHtcclxuICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IChvUnVsZS5tYXRjaEluZGV4ICE9PSB1bmRlZmluZWQgJiYgbVtvUnVsZS5tYXRjaEluZGV4XSkgfHwgc3RyaW5nLFxyXG4gICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXHJcbiAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidW5rbm93biB0eXBlXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSlcclxuICAgIH1cclxufVxyXG5cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tPbmVSdWxlV2l0aE9mZnNldChzdHJpbmc6IHN0cmluZywgbGNTdHJpbmcgOiBzdHJpbmcsIGV4YWN0IDogYm9vbGVhbixcclxucmVzIDogQXJyYXk8SU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1JhbmdlZD4sXHJcbm9SdWxlIDogSU1hdGNoLm1SdWxlLCBjbnRSZWM/IDogSUNudFJlYyApIHtcclxuICAgaWYgKGRlYnVnbG9nVi5lbmFibGVkKSB7XHJcbiAgICAgIGRlYnVnbG9nVignYXR0ZW1wdGluZyB0byBtYXRjaCBydWxlICcgKyBKU09OLnN0cmluZ2lmeShvUnVsZSkgKyBcIiB0byBzdHJpbmcgXFxcIlwiICsgc3RyaW5nICsgXCJcXFwiXCIpO1xyXG4gICAgfVxyXG4gICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuV09SRDpcclxuICAgICAgICBpZighb1J1bGUubG93ZXJjYXNld29yZCkge1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdydWxlIHdpdGhvdXQgYSBsb3dlcmNhc2UgdmFyaWFudCcgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSk7XHJcbiAgICAgICAgIH07XHJcbiAgICAgICAgaWYgKGV4YWN0ICYmIChvUnVsZS53b3JkID09PSBzdHJpbmcgfHwgb1J1bGUubG93ZXJjYXNld29yZCA9PT0gbGNTdHJpbmcpKSB7XHJcbiAgICAgICAgICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAgICAgICAgIGRlYnVnbG9nKFwiXFxuIW1hdGNoZWQgZXhhY3QgXCIgKyBzdHJpbmcgKyBcIj1cIiAgKyBvUnVsZS5sb3dlcmNhc2V3b3JkICArIFwiID0+IFwiICsgb1J1bGUubWF0Y2hlZFN0cmluZyArIFwiL1wiICsgb1J1bGUuY2F0ZWdvcnkpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmVzLnB1c2goe1xyXG4gICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcclxuICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxyXG4gICAgICAgICAgICBydWxlOiBvUnVsZSxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCFleGFjdCAmJiAhb1J1bGUuZXhhY3RPbmx5KSB7XHJcbiAgICAgICAgICB2YXIgbGV2ZW5tYXRjaCA9IGNhbGNEaXN0YW5jZShvUnVsZS5sb3dlcmNhc2V3b3JkLCBsY1N0cmluZyk7XHJcblxyXG4vKlxyXG4gICAgICAgICAgYWRkQ250UmVjKGNudFJlYyxcImNhbGNEaXN0YW5jZVwiLCAxKTtcclxuICAgICAgICAgIGlmKGxldmVubWF0Y2ggPCA1MCkge1xyXG4gICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlRXhwXCIsIDEpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYobGV2ZW5tYXRjaCA8IDQwMDAwKSB7XHJcbiAgICAgICAgICAgIGFkZENudFJlYyhjbnRSZWMsXCJjYWxjRGlzdGFuY2VCZWxvdzQwa1wiLCAxKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgICovXHJcbiAgICAgICAgICAvL2lmKG9SdWxlLmxvd2VyY2FzZXdvcmQgPT09IFwiY29zbW9zXCIpIHtcclxuICAgICAgICAgIC8vICBjb25zb2xlLmxvZyhcImhlcmUgcmFua2luZyBcIiArIGxldmVubWF0Y2ggKyBcIiBcIiArIG9SdWxlLmxvd2VyY2FzZXdvcmQgKyBcIiBcIiArIGxjU3RyaW5nKTtcclxuICAgICAgICAgIC8vfVxyXG4gICAgICAgICAgaWYgKGxldmVubWF0Y2ggPj0gQWxnb2wuQ3V0b2ZmX1dvcmRNYXRjaCkgeyAvLyBsZXZlbkN1dG9mZikge1xyXG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiZm91bmQgcmVjXCIpO1xyXG4gICAgICAgICAgICBhZGRDbnRSZWMoY250UmVjLFwiY2FsY0Rpc3RhbmNlT2tcIiwgMSk7XHJcbiAgICAgICAgICAgIHZhciByZWMgPSB7XHJcbiAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgICAgICAgICAgICAgcnVsZSA6IG9SdWxlLFxyXG4gICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXHJcbiAgICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxyXG4gICAgICAgICAgICAgIF9yYW5raW5nOiAob1J1bGUuX3JhbmtpbmcgfHwgMS4wKSAqIGxldmVuUGVuYWx0eShsZXZlbm1hdGNoKSxcclxuICAgICAgICAgICAgICBsZXZlbm1hdGNoOiBsZXZlbm1hdGNoXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGlmKGRlYnVnbG9nKSB7XHJcbiAgICAgICAgICAgICAgZGVidWdsb2coXCJcXG4hQ09STzogZnV6enkgXCIgKyAobGV2ZW5tYXRjaCkudG9GaXhlZCgzKSArIFwiIFwiICsgcmVjLl9yYW5raW5nLnRvRml4ZWQoMykgKyBcIiAgXFxcIlwiICsgc3RyaW5nICsgXCJcXFwiPVwiICArIG9SdWxlLmxvd2VyY2FzZXdvcmQgICsgXCIgPT4gXCIgKyBvUnVsZS5tYXRjaGVkU3RyaW5nICsgXCIvXCIgKyBvUnVsZS5jYXRlZ29yeSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmVzLnB1c2gocmVjKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuUkVHRVhQOiB7XHJcbiAgICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KFwiIGhlcmUgcmVnZXhwXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSkpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBtID0gb1J1bGUucmVnZXhwLmV4ZWMoc3RyaW5nKVxyXG4gICAgICAgIGlmIChtKSB7XHJcbiAgICAgICAgICByZXMucHVzaCh7XHJcbiAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxyXG4gICAgICAgICAgICBydWxlOiBvUnVsZSxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogKG9SdWxlLm1hdGNoSW5kZXggIT09IHVuZGVmaW5lZCAmJiBtW29SdWxlLm1hdGNoSW5kZXhdKSB8fCBzdHJpbmcsXHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmtub3duIHR5cGVcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKVxyXG4gICAgfVxyXG59XHJcblxyXG5cclxuXHJcblxyXG5pbnRlcmZhY2UgSUNudFJlYyB7XHJcblxyXG59O1xyXG5cclxuZnVuY3Rpb24gYWRkQ250UmVjKGNudFJlYyA6IElDbnRSZWMsIG1lbWJlciA6IHN0cmluZywgbnVtYmVyIDogbnVtYmVyKSB7XHJcbiAgaWYoKCFjbnRSZWMpIHx8IChudW1iZXIgPT09IDApKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG4gIGNudFJlY1ttZW1iZXJdID0gKGNudFJlY1ttZW1iZXJdIHx8IDApICsgbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVN0cmluZyh3b3JkOiBzdHJpbmcsIGV4YWN0OiBib29sZWFuLCBvUnVsZXM6IEFycmF5PElNYXRjaC5tUnVsZT4sXHJcbiBjbnRSZWM/IDogSUNudFJlYyk6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiB7XHJcbiAgLy8gc2ltcGx5IGFwcGx5IGFsbCBydWxlc1xyXG4gIGlmKGRlYnVnbG9nTS5lbmFibGVkICkgIHtcclxuICAgIGRlYnVnbG9nTShcInJ1bGVzIDogXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZXMsIHVuZGVmaW5lZCwgMikpO1xyXG4gIH1cclxuICB2YXIgbGNTdHJpbmcgPSB3b3JkLnRvTG93ZXJDYXNlKCk7XHJcbiAgdmFyIHJlczogQXJyYXk8SU1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4gPSBbXVxyXG4gIG9SdWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChvUnVsZSkge1xyXG4gICAgY2hlY2tPbmVSdWxlKHdvcmQsbGNTdHJpbmcsZXhhY3QscmVzLG9SdWxlLGNudFJlYyk7XHJcbiAgfSk7XHJcbiAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVNpbmdsZVdvcmRXaXRoT2Zmc2V0KHdvcmQ6IHN0cmluZywgbGN3b3JkIDogc3RyaW5nLCBleGFjdDogYm9vbGVhbiwgb1J1bGVzOiBBcnJheTxJTWF0Y2gubVJ1bGU+LFxyXG4gY250UmVjPyA6IElDbnRSZWMpOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1JhbmdlZD4ge1xyXG4gIC8vIHNpbXBseSBhcHBseSBhbGwgcnVsZXNcclxuICBpZihkZWJ1Z2xvZ00uZW5hYmxlZCApICB7XHJcbiAgICBkZWJ1Z2xvZ00oXCJydWxlcyA6IFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGVzLCB1bmRlZmluZWQsIDIpKTtcclxuICB9XHJcbiAgdmFyIHJlczogQXJyYXk8SU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1JhbmdlZD4gPSBbXVxyXG4gIG9SdWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChvUnVsZSkge1xyXG4gICAgY2hlY2tPbmVSdWxlV2l0aE9mZnNldCh3b3JkLGxjd29yZCxleGFjdCxyZXMsb1J1bGUsY250UmVjKTtcclxuICB9KTtcclxuICBkZWJ1Z2xvZyhgQ1NXV086IGdvdCByZXN1bHRzIGZvciAke2xjd29yZH0gICR7cmVzLmxlbmd0aH1gKTtcclxuICByZXMuc29ydChzb3J0QnlSYW5rKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHBvc3RGaWx0ZXIocmVzIDogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+KSA6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiB7XHJcbiAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XHJcbiAgdmFyIGJlc3RSYW5rID0gMDtcclxuICAvL2NvbnNvbGUubG9nKFwiXFxucGlsdGVyZWQgXCIgKyBKU09OLnN0cmluZ2lmeShyZXMpKTtcclxuICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZyhcInByZUZpbHRlciA6IFxcblwiICsgcmVzLm1hcChmdW5jdGlvbih3b3JkLGluZGV4KSB7XHJcbiAgICAgIHJldHVybiBgJHtpbmRleH0gJHt3b3JkLl9yYW5raW5nfSAgPT4gXCIke3dvcmQuY2F0ZWdvcnl9XCIgJHt3b3JkLm1hdGNoZWRTdHJpbmd9YDtcclxuICAgIH0pLmpvaW4oXCJcXG5cIikpO1xyXG4gIH1cclxuICB2YXIgciA9IHJlcy5maWx0ZXIoZnVuY3Rpb24ocmVzeCxpbmRleCkge1xyXG4gICAgaWYoaW5kZXggPT09IDApIHtcclxuICAgICAgYmVzdFJhbmsgPSByZXN4Ll9yYW5raW5nO1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICAgIC8vIDEtMC45ID0gMC4xXHJcbiAgICAvLyAxLSAwLjkzID0gMC43XHJcbiAgICAvLyAxLzdcclxuICAgIHZhciBkZWx0YSA9IGJlc3RSYW5rIC8gcmVzeC5fcmFua2luZztcclxuICAgIGlmKChyZXN4Lm1hdGNoZWRTdHJpbmcgPT09IHJlc1tpbmRleC0xXS5tYXRjaGVkU3RyaW5nKVxyXG4gICAgICAmJiAocmVzeC5jYXRlZ29yeSA9PT0gcmVzW2luZGV4LTFdLmNhdGVnb3J5KSkge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICAvL2NvbnNvbGUubG9nKFwiXFxuIGRlbHRhIGZvciBcIiArIGRlbHRhICsgXCIgIFwiICsgcmVzeC5fcmFua2luZyk7XHJcbiAgICBpZiAocmVzeC5sZXZlbm1hdGNoICYmIChkZWx0YSA+IDEuMDMpKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH0pO1xyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgICAgZGVidWdsb2coYFxcbmZpbHRlcmVkICR7ci5sZW5ndGh9LyR7cmVzLmxlbmd0aH1gICsgSlNPTi5zdHJpbmdpZnkocikpO1xyXG4gIH1cclxuICByZXR1cm4gcjtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHBvc3RGaWx0ZXJXaXRoT2Zmc2V0KHJlcyA6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nUmFuZ2VkPikgOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1JhbmdlZD4ge1xyXG4gIHJlcy5zb3J0KHNvcnRCeVJhbmspO1xyXG4gIHZhciBiZXN0UmFuayA9IDA7XHJcbiAgLy9jb25zb2xlLmxvZyhcIlxcbnBpbHRlcmVkIFwiICsgSlNPTi5zdHJpbmdpZnkocmVzKSk7XHJcbiAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgZGVidWdsb2coXCIgcHJlRmlsdGVyIDogXFxuXCIgKyByZXMubWFwKGZ1bmN0aW9uKHdvcmQpIHtcclxuICAgICAgcmV0dXJuIGAgJHt3b3JkLl9yYW5raW5nfSAgPT4gXCIke3dvcmQuY2F0ZWdvcnl9XCIgJHt3b3JkLm1hdGNoZWRTdHJpbmd9IGA7XHJcbiAgICB9KS5qb2luKFwiXFxuXCIpKTtcclxuICB9XHJcbiAgdmFyIHIgPSByZXMuZmlsdGVyKGZ1bmN0aW9uKHJlc3gsaW5kZXgpIHtcclxuICAgIGlmKGluZGV4ID09PSAwKSB7XHJcbiAgICAgIGJlc3RSYW5rID0gcmVzeC5fcmFua2luZztcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICAvLyAxLTAuOSA9IDAuMVxyXG4gICAgLy8gMS0gMC45MyA9IDAuN1xyXG4gICAgLy8gMS83XHJcbiAgICB2YXIgZGVsdGEgPSBiZXN0UmFuayAvIHJlc3guX3Jhbmtpbmc7XHJcbiAgICBpZihcclxuICAgICAgICAhKHJlc3gucnVsZSAmJiByZXN4LnJ1bGUucmFuZ2UpXHJcbiAgICAgJiYgIShyZXNbaW5kZXgtMV0ucnVsZSAmJiByZXNbaW5kZXgtMV0ucnVsZS5yYW5nZSlcclxuICAgICAmJiAocmVzeC5tYXRjaGVkU3RyaW5nID09PSByZXNbaW5kZXgtMV0ubWF0Y2hlZFN0cmluZylcclxuICAgICAmJiAocmVzeC5jYXRlZ29yeSA9PT0gcmVzW2luZGV4LTFdLmNhdGVnb3J5KSkge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICAvL2NvbnNvbGUubG9nKFwiXFxuIGRlbHRhIGZvciBcIiArIGRlbHRhICsgXCIgIFwiICsgcmVzeC5fcmFua2luZyk7XHJcbiAgICBpZiAocmVzeC5sZXZlbm1hdGNoICYmIChkZWx0YSA+IDEuMDMpKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH0pO1xyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgICAgZGVidWdsb2coYFxcbmZpbHRlcmVkICR7ci5sZW5ndGh9LyR7cmVzLmxlbmd0aH1gICsgSlNPTi5zdHJpbmdpZnkocikpO1xyXG4gIH1cclxuICByZXR1cm4gcjtcclxufVxyXG5cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVN0cmluZzIod29yZDogc3RyaW5nLCBleGFjdDogYm9vbGVhbiwgIHJ1bGVzIDogSU1hdGNoLlNwbGl0UnVsZXNcclxuICAsIGNudFJlYz8gOklDbnRSZWMpOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4ge1xyXG4gIC8vIHNpbXBseSBhcHBseSBhbGwgcnVsZXNcclxuICBpZiAoZGVidWdsb2dNLmVuYWJsZWQgKSAge1xyXG4gICAgZGVidWdsb2dNKFwicnVsZXMgOiBcIiArIEpTT04uc3RyaW5naWZ5KHJ1bGVzLHVuZGVmaW5lZCwgMikpO1xyXG4gIH1cclxuICB2YXIgbGNTdHJpbmcgPSB3b3JkLnRvTG93ZXJDYXNlKCk7XHJcbiAgdmFyIHJlczogQXJyYXk8SU1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4gPSBbXTtcclxuICBpZiAoZXhhY3QpIHtcclxuICAgIHZhciByID0gcnVsZXMud29yZE1hcFtsY1N0cmluZ107XHJcbiAgICBpZiAocikge1xyXG4gICAgICByLnJ1bGVzLmZvckVhY2goZnVuY3Rpb24ob1J1bGUpIHtcclxuICAgICAgICByZXMucHVzaCh7XHJcbiAgICAgICAgICAgIHN0cmluZzogd29yZCxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcclxuICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxyXG4gICAgICAgICAgICBfcmFua2luZzogb1J1bGUuX3JhbmtpbmcgfHwgMS4wXHJcbiAgICAgICAgICB9KVxyXG4gICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcnVsZXMubm9uV29yZFJ1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XHJcbiAgICAgIGNoZWNrT25lUnVsZSh3b3JkLGxjU3RyaW5nLGV4YWN0LHJlcyxvUnVsZSxjbnRSZWMpO1xyXG4gICAgfSk7XHJcbiAgICByZXMuc29ydChzb3J0QnlSYW5rKTtcclxuICAgIHJldHVybiByZXM7XHJcbiAgfSBlbHNlIHtcclxuICAgIGRlYnVnbG9nKFwiY2F0ZWdvcml6ZSBub24gZXhhY3RcIiArIHdvcmQgKyBcIiB4eCAgXCIgKyBydWxlcy5hbGxSdWxlcy5sZW5ndGgpO1xyXG4gICAgcmV0dXJuIHBvc3RGaWx0ZXIoY2F0ZWdvcml6ZVN0cmluZyh3b3JkLCBleGFjdCwgcnVsZXMuYWxsUnVsZXMsIGNudFJlYykpO1xyXG4gIH1cclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjYXRlZ29yaXplV29yZEludGVybmFsV2l0aE9mZnNldHMod29yZDogc3RyaW5nLCBsY3dvcmQgOiBzdHJpbmcsIGV4YWN0OiBib29sZWFuLCAgcnVsZXMgOiBJTWF0Y2guU3BsaXRSdWxlc1xyXG4gICwgY250UmVjPyA6SUNudFJlYyk6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nUmFuZ2VkPiB7XHJcblxyXG4gIGRlYnVnbG9nTShcImNhdGVnb3JpemUgXCIgKyBsY3dvcmQgKyBcIiB3aXRoIG9mZnNldCEhISEhISEhISEhISEhISEhXCIgKyBleGFjdClcclxuICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXHJcbiAgaWYgKGRlYnVnbG9nTS5lbmFibGVkICkgIHtcclxuICAgIGRlYnVnbG9nTShcInJ1bGVzIDogXCIgKyBKU09OLnN0cmluZ2lmeShydWxlcyx1bmRlZmluZWQsIDIpKTtcclxuICB9XHJcbiAgdmFyIHJlczogQXJyYXk8SU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1JhbmdlZD4gPSBbXTtcclxuICBpZiAoZXhhY3QpIHtcclxuICAgIHZhciByID0gcnVsZXMud29yZE1hcFtsY3dvcmRdO1xyXG4gICAgaWYgKHIpIHtcclxuICAgICAgZGVidWdsb2dNKGAgLi4uLnB1c2hpbmcgbiBydWxlcyBleGFjdCBmb3IgJHtsY3dvcmR9OmAgKyByLnJ1bGVzLmxlbmd0aCk7XHJcbiAgICAgIGRlYnVnbG9nTShyLnJ1bGVzLm1hcCgocixpbmRleCk9PiAnJyArIGluZGV4ICsgJyAnICsgSlNPTi5zdHJpbmdpZnkocikpLmpvaW4oXCJcXG5cIikpO1xyXG4gICAgICByLnJ1bGVzLmZvckVhY2goZnVuY3Rpb24ob1J1bGUpIHtcclxuICAgICAgICByZXMucHVzaCh7XHJcbiAgICAgICAgICAgIHN0cmluZzogd29yZCxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcclxuICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxyXG4gICAgICAgICAgICBydWxlOiBvUnVsZSxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxyXG4gICAgICAgICAgfSlcclxuICAgICB9KTtcclxuICAgIH1cclxuICAgIHJ1bGVzLm5vbldvcmRSdWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChvUnVsZSkge1xyXG4gICAgICBjaGVja09uZVJ1bGVXaXRoT2Zmc2V0KHdvcmQsbGN3b3JkLCBleGFjdCxyZXMsb1J1bGUsY250UmVjKTtcclxuICAgIH0pO1xyXG4gICAgcmVzID0gcG9zdEZpbHRlcldpdGhPZmZzZXQocmVzKTtcclxuICAgIGRlYnVnbG9nKFwiaGVyZSByZXN1bHRzIGZvclwiICsgd29yZCArIFwiIHJlcyBcIiArIHJlcy5sZW5ndGgpO1xyXG4gICAgZGVidWdsb2dNKFwiaGVyZSByZXN1bHRzIGZvclwiICsgd29yZCArIFwiIHJlcyBcIiArIHJlcy5sZW5ndGgpO1xyXG4gICAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XHJcbiAgICByZXR1cm4gcmVzO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBkZWJ1Z2xvZyhcImNhdGVnb3JpemUgbm9uIGV4YWN0XCIgKyB3b3JkICsgXCIgeHggIFwiICsgcnVsZXMuYWxsUnVsZXMubGVuZ3RoKTtcclxuICAgIHZhciByciA9IGNhdGVnb3JpemVTaW5nbGVXb3JkV2l0aE9mZnNldCh3b3JkLGxjd29yZCwgZXhhY3QsIHJ1bGVzLmFsbFJ1bGVzLCBjbnRSZWMpO1xyXG4gICAgLy9kZWJ1bG9nTShcImZ1enp5IHJlcyBcIiArIEpTT04uc3RyaW5naWZ5KHJyKSk7XHJcbiAgICByZXR1cm4gcG9zdEZpbHRlcldpdGhPZmZzZXQocnIpO1xyXG4gIH1cclxufVxyXG5cclxuXHJcblxyXG4vKipcclxuICpcclxuICogT3B0aW9ucyBtYXkgYmUge1xyXG4gKiBtYXRjaG90aGVycyA6IHRydWUsICA9PiBvbmx5IHJ1bGVzIHdoZXJlIGFsbCBvdGhlcnMgbWF0Y2ggYXJlIGNvbnNpZGVyZWRcclxuICogYXVnbWVudCA6IHRydWUsXHJcbiAqIG92ZXJyaWRlIDogdHJ1ZSB9ICA9PlxyXG4gKlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoV29yZChvUnVsZTogSVJ1bGUsIGNvbnRleHQ6IElGTWF0Y2guY29udGV4dCwgb3B0aW9ucz86IElNYXRjaE9wdGlvbnMpIHtcclxuICBpZiAoY29udGV4dFtvUnVsZS5rZXldID09PSB1bmRlZmluZWQpIHtcclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgfVxyXG4gIHZhciBzMSA9IGNvbnRleHRbb1J1bGUua2V5XS50b0xvd2VyQ2FzZSgpXHJcbiAgdmFyIHMyID0gb1J1bGUud29yZC50b0xvd2VyQ2FzZSgpO1xyXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XHJcbiAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCwgb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KVxyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlbHRhKSk7XHJcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XHJcbiAgfVxyXG4gIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gIH1cclxuICB2YXIgYzogbnVtYmVyID0gY2FsY0Rpc3RhbmNlKHMyLCBzMSk7XHJcbiAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgZGVidWdsb2coXCIgczEgPD4gczIgXCIgKyBzMSArIFwiPD5cIiArIHMyICsgXCIgID0+OiBcIiArIGMpO1xyXG4gIH1cclxuICBpZiAoYyA+IDAuODApIHtcclxuICAgIHZhciByZXMgPSBBbnlPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKSBhcyBhbnk7XHJcbiAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgY29udGV4dCk7XHJcbiAgICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xyXG4gICAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb1J1bGUuZm9sbG93cyk7XHJcbiAgICB9XHJcbiAgICAvLyBmb3JjZSBrZXkgcHJvcGVydHlcclxuICAgIC8vIGNvbnNvbGUubG9nKCcgb2JqZWN0Y2F0ZWdvcnknLCByZXNbJ3N5c3RlbU9iamVjdENhdGVnb3J5J10pO1xyXG4gICAgcmVzW29SdWxlLmtleV0gPSBvUnVsZS5mb2xsb3dzW29SdWxlLmtleV0gfHwgcmVzW29SdWxlLmtleV07XHJcbiAgICByZXMuX3dlaWdodCA9IEFueU9iamVjdC5hc3NpZ24oe30sIHJlcy5fd2VpZ2h0KTtcclxuICAgIHJlcy5fd2VpZ2h0W29SdWxlLmtleV0gPSBjO1xyXG4gICAgT2JqZWN0LmZyZWV6ZShyZXMpO1xyXG4gICAgaWYgKCBkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAgIGRlYnVnbG9nKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcclxuICAgIH1cclxuICAgIHJldHVybiByZXM7XHJcbiAgfVxyXG4gIHJldHVybiB1bmRlZmluZWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0QXJnc01hcChtYXRjaDogQXJyYXk8c3RyaW5nPiwgYXJnc01hcDogeyBba2V5OiBudW1iZXJdOiBzdHJpbmcgfSk6IElGTWF0Y2guY29udGV4dCB7XHJcbiAgdmFyIHJlcyA9IHt9IGFzIElGTWF0Y2guY29udGV4dDtcclxuICBpZiAoIWFyZ3NNYXApIHtcclxuICAgIHJldHVybiByZXM7XHJcbiAgfVxyXG4gIE9iamVjdC5rZXlzKGFyZ3NNYXApLmZvckVhY2goZnVuY3Rpb24gKGlLZXkpIHtcclxuICAgIHZhciB2YWx1ZSA9IG1hdGNoW2lLZXldXHJcbiAgICB2YXIga2V5ID0gYXJnc01hcFtpS2V5XTtcclxuICAgIGlmICgodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKSAmJiB2YWx1ZS5sZW5ndGggPiAwKSB7XHJcbiAgICAgIHJlc1trZXldID0gdmFsdWVcclxuICAgIH1cclxuICB9XHJcbiAgKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgUmFua1dvcmQgPSB7XHJcbiAgaGFzQWJvdmU6IGZ1bmN0aW9uIChsc3Q6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiwgYm9yZGVyOiBudW1iZXIpOiBib29sZWFuIHtcclxuICAgIHJldHVybiAhbHN0LmV2ZXJ5KGZ1bmN0aW9uIChvTWVtYmVyKSB7XHJcbiAgICAgIHJldHVybiAob01lbWJlci5fcmFua2luZyA8IGJvcmRlcik7XHJcbiAgICB9KTtcclxuICB9LFxyXG5cclxuICB0YWtlRmlyc3ROOiBmdW5jdGlvbjxUIGV4dGVuZHMgSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IChsc3Q6IEFycmF5PFQ+LCBuOiBudW1iZXIpOiBBcnJheTxUPiB7XHJcbiAgICB2YXIgbGFzdFJhbmtpbmcgPSAxLjA7XHJcbiAgICB2YXIgY250UmFuZ2VkID0gMDtcclxuICAgIHJldHVybiBsc3QuZmlsdGVyKGZ1bmN0aW9uIChvTWVtYmVyLCBpSW5kZXgpIHtcclxuICAgIHZhciBpc1JhbmdlZCA9ICEhKG9NZW1iZXJbXCJydWxlXCJdICYmIG9NZW1iZXJbXCJydWxlXCJdLnJhbmdlKTtcclxuICAgIGlmKGlzUmFuZ2VkKSB7XHJcbiAgICAgIGNudFJhbmdlZCArPSAxO1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICAgIGlmICgoKGlJbmRleCAtIGNudFJhbmdlZCkgPCBuKSB8fCAob01lbWJlci5fcmFua2luZyA9PT0gbGFzdFJhbmtpbmcpKSAge1xyXG4gICAgICAgIGxhc3RSYW5raW5nID0gb01lbWJlci5fcmFua2luZztcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9KTtcclxuICB9LFxyXG4gIHRha2VBYm92ZSA6IGZ1bmN0aW9uPFQgZXh0ZW5kcyBJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4gKGxzdDogQXJyYXk8VD4sIGJvcmRlcjogbnVtYmVyKTogQXJyYXk8VD4ge1xyXG4gICAgcmV0dXJuIGxzdC5maWx0ZXIoZnVuY3Rpb24gKG9NZW1iZXIpIHtcclxuICAgICAgcmV0dXJuIChvTWVtYmVyLl9yYW5raW5nID49IGJvcmRlcik7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG59O1xyXG5cclxuLypcclxudmFyIGV4YWN0TGVuID0gMDtcclxudmFyIGZ1enp5TGVuID0gMDtcclxudmFyIGZ1enp5Q250ID0gMDtcclxudmFyIGV4YWN0Q250ID0gMDtcclxudmFyIHRvdGFsQ250ID0gMDtcclxudmFyIHRvdGFsTGVuID0gMDtcclxudmFyIHJldGFpbmVkQ250ID0gMDtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZXNldENudCgpIHtcclxuICBleGFjdExlbiA9IDA7XHJcbiAgZnV6enlMZW4gPSAwO1xyXG4gIGZ1enp5Q250ID0gMDtcclxuICBleGFjdENudCA9IDA7XHJcbiAgdG90YWxDbnQgPSAwO1xyXG4gIHRvdGFsTGVuID0gMDtcclxuICByZXRhaW5lZENudCA9IDA7XHJcbn1cclxuKi9cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmKHNXb3JkR3JvdXA6IHN0cmluZywgc3BsaXRSdWxlcyA6IElNYXRjaC5TcGxpdFJ1bGVzICwgY250UmVjPyA6IElDbnRSZWMgKTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IHtcclxuICB2YXIgc2Vlbkl0ID0gY2F0ZWdvcml6ZVN0cmluZzIoc1dvcmRHcm91cCwgdHJ1ZSwgc3BsaXRSdWxlcywgY250UmVjKTtcclxuICAvL3RvdGFsQ250ICs9IDE7XHJcbiAgLy8gZXhhY3RMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcclxuICBhZGRDbnRSZWMoY250UmVjLCAnY250Q2F0RXhhY3QnLCAxKTtcclxuICBhZGRDbnRSZWMoY250UmVjLCAnY250Q2F0RXhhY3RSZXMnLCBzZWVuSXQubGVuZ3RoKTtcclxuXHJcbiAgaWYgKFJhbmtXb3JkLmhhc0Fib3ZlKHNlZW5JdCwgMC44KSkge1xyXG4gICAgaWYoY250UmVjKSB7XHJcbiAgICAgIGFkZENudFJlYyhjbnRSZWMsICdleGFjdFByaW9yVGFrZScsIHNlZW5JdC5sZW5ndGgpXHJcbiAgICB9XHJcbiAgICBzZWVuSXQgPSBSYW5rV29yZC50YWtlQWJvdmUoc2Vlbkl0LCAwLjgpO1xyXG4gICAgaWYoY250UmVjKSB7XHJcbiAgICAgIGFkZENudFJlYyhjbnRSZWMsICdleGFjdEFmdGVyVGFrZScsIHNlZW5JdC5sZW5ndGgpXHJcbiAgICB9XHJcbiAgIC8vIGV4YWN0Q250ICs9IDE7XHJcbiAgfSBlbHNlIHtcclxuICAgIHNlZW5JdCA9IGNhdGVnb3JpemVTdHJpbmcyKHNXb3JkR3JvdXAsIGZhbHNlLCBzcGxpdFJ1bGVzLCBjbnRSZWMpO1xyXG4gICAgYWRkQ250UmVjKGNudFJlYywgJ2NudE5vbkV4YWN0JywgMSk7XHJcbiAgICBhZGRDbnRSZWMoY250UmVjLCAnY250Tm9uRXhhY3RSZXMnLCBzZWVuSXQubGVuZ3RoKTtcclxuICAvLyAgZnV6enlMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcclxuICAvLyAgZnV6enlDbnQgKz0gMTtcclxuICB9XHJcbiAvLyB0b3RhbExlbiArPSBzZWVuSXQubGVuZ3RoO1xyXG4gIHNlZW5JdCA9IFJhbmtXb3JkLnRha2VGaXJzdE4oc2Vlbkl0LCBBbGdvbC5Ub3BfTl9Xb3JkQ2F0ZWdvcml6YXRpb25zKTtcclxuIC8vIHJldGFpbmVkQ250ICs9IHNlZW5JdC5sZW5ndGg7XHJcbiAgcmV0dXJuIHNlZW5JdDtcclxufVxyXG5cclxuLyogaWYgd2UgaGF2ZSBhICBcIlJ1biBsaWtlIHRoZSBXaW5kXCJcclxuICBhbiBhIHVzZXIgdHlwZSBmdW4gbGlrZSAgYSBSaW5kICwgYW5kIFJpbmQgaXMgYW4gZXhhY3QgbWF0Y2gsXHJcbiAgd2Ugd2lsbCBub3Qgc3RhcnQgbG9va2luZyBmb3IgdGhlIGxvbmcgc2VudGVuY2VcclxuXHJcbiAgdGhpcyBpcyB0byBiZSBmaXhlZCBieSBcInNwcmVhZGluZ1wiIHRoZSByYW5nZSBpbmRpY2F0aW9uIGFjY3Jvc3MgdmVyeSBzaW1pbGFyIHdvcmRzIGluIHRoZSB2aW5jaW5pdHkgb2YgdGhlXHJcbiAgdGFyZ2V0IHdvcmRzXHJcbiovXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVdvcmRXaXRoT2Zmc2V0V2l0aFJhbmtDdXRvZmYoc1dvcmRHcm91cDogc3RyaW5nLCBzcGxpdFJ1bGVzIDogSU1hdGNoLlNwbGl0UnVsZXMsIGNudFJlYz8gOiBJQ250UmVjICk6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nUmFuZ2VkPiB7XHJcbiAgdmFyIHNXb3JkR3JvdXBMQyA9IHNXb3JkR3JvdXAudG9Mb3dlckNhc2UoKTtcclxuICB2YXIgc2Vlbkl0ID0gY2F0ZWdvcml6ZVdvcmRJbnRlcm5hbFdpdGhPZmZzZXRzKHNXb3JkR3JvdXAsIHNXb3JkR3JvdXBMQywgdHJ1ZSwgc3BsaXRSdWxlcywgY250UmVjKTtcclxuICAvL2NvbnNvbGUubG9nKFwiU0VFTklUXCIgKyBKU09OLnN0cmluZ2lmeShzZWVuSXQpKTtcclxuICAvL3RvdGFsQ250ICs9IDE7XHJcbiAgLy8gZXhhY3RMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcclxuICAvL2NvbnNvbGUubG9nKFwiZmlyc3QgcnVuIGV4YWN0IFwiICsgSlNPTi5zdHJpbmdpZnkoc2Vlbkl0KSk7XHJcbiAgYWRkQ250UmVjKGNudFJlYywgJ2NudENhdEV4YWN0JywgMSk7XHJcbiAgYWRkQ250UmVjKGNudFJlYywgJ2NudENhdEV4YWN0UmVzJywgc2Vlbkl0Lmxlbmd0aCk7XHJcblxyXG4gIGlmIChSYW5rV29yZC5oYXNBYm92ZShzZWVuSXQsIDAuOCkpIHtcclxuICAgIGlmKGNudFJlYykge1xyXG4gICAgICBhZGRDbnRSZWMoY250UmVjLCAnZXhhY3RQcmlvclRha2UnLCBzZWVuSXQubGVuZ3RoKVxyXG4gICAgfVxyXG4gICAgc2Vlbkl0ID0gUmFua1dvcmQudGFrZUFib3ZlKHNlZW5JdCwgMC44KTtcclxuICAgIGlmKGNudFJlYykge1xyXG4gICAgICBhZGRDbnRSZWMoY250UmVjLCAnZXhhY3RBZnRlclRha2UnLCBzZWVuSXQubGVuZ3RoKVxyXG4gICAgfVxyXG4gICAvLyBleGFjdENudCArPSAxO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBzZWVuSXQgPSBjYXRlZ29yaXplV29yZEludGVybmFsV2l0aE9mZnNldHMoc1dvcmRHcm91cCwgc1dvcmRHcm91cExDLCBmYWxzZSwgc3BsaXRSdWxlcywgY250UmVjKTtcclxuICAgIGFkZENudFJlYyhjbnRSZWMsICdjbnROb25FeGFjdCcsIDEpO1xyXG4gICAgYWRkQ250UmVjKGNudFJlYywgJ2NudE5vbkV4YWN0UmVzJywgc2Vlbkl0Lmxlbmd0aCk7XHJcbiAgLy8gIGZ1enp5TGVuICs9IHNlZW5JdC5sZW5ndGg7XHJcbiAgLy8gIGZ1enp5Q250ICs9IDE7XHJcbiAgfVxyXG4gIC8vIHRvdGFsTGVuICs9IHNlZW5JdC5sZW5ndGg7XHJcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZD8gKCBgJHtzZWVuSXQubGVuZ3RofSB3aXRoICR7c2Vlbkl0LnJlZHVjZSggKHByZXYsb2JqKSA9PiBwcmV2ICsgKG9iai5ydWxlLnJhbmdlID8gMSA6IDApLDApfSByYW5nZWQgIWApOiAnLScpO1xyXG4vLyAgdmFyIGNudFJhbmdlZCA9IHNlZW5JdC5yZWR1Y2UoIChwcmV2LG9iaikgPT4gcHJldiArIChvYmoucnVsZS5yYW5nZSA/IDEgOiAwKSwwKTtcclxuLy8gIGNvbnNvbGUubG9nKGAqKioqKioqKioqKiAke3NlZW5JdC5sZW5ndGh9IHdpdGggJHtjbnRSYW5nZWR9IHJhbmdlZCAhYCk7XHJcblxyXG4gIHNlZW5JdCA9IFJhbmtXb3JkLnRha2VGaXJzdE4oc2Vlbkl0LCBBbGdvbC5Ub3BfTl9Xb3JkQ2F0ZWdvcml6YXRpb25zKTtcclxuIC8vIHJldGFpbmVkQ250ICs9IHNlZW5JdC5sZW5ndGg7XHJcbiAgLy9jb25zb2xlLmxvZyhcImZpbmFsIHJlcyBvZiBjYXRlZ29yaXplV29yZFdpdGhPZmZzZXRXaXRoUmFua0N1dG9mZlwiICsgSlNPTi5zdHJpbmdpZnkoc2Vlbkl0KSk7XHJcblxyXG4gIHJldHVybiBzZWVuSXQ7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVdvcmRXaXRoT2Zmc2V0V2l0aFJhbmtDdXRvZmZTaW5nbGUod29yZDogc3RyaW5nLCBydWxlOiBJTWF0Y2gubVJ1bGUpOiBJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1JhbmdlZCB7XHJcbiAgdmFyIGxjd29yZCA9IHdvcmQudG9Mb3dlckNhc2UoKTtcclxuXHJcbiAgaWYobGN3b3JkID09PSBydWxlLmxvd2VyY2FzZXdvcmQpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHN0cmluZzogd29yZCxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogcnVsZS5tYXRjaGVkU3RyaW5nLFxyXG4gICAgICAgICAgICBjYXRlZ29yeTogcnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgcnVsZTogcnVsZSxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IHJ1bGUuX3JhbmtpbmcgfHwgMS4wXHJcbiAgICAgICAgICB9O1xyXG4gIH1cclxuXHJcbiAgdmFyIHJlczogQXJyYXk8SU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1JhbmdlZD4gPSBbXVxyXG4gIGNoZWNrT25lUnVsZVdpdGhPZmZzZXQod29yZCxsY3dvcmQsZmFsc2UscmVzLHJ1bGUpO1xyXG4gIGRlYnVnbG9nKFwiY2F0V1dPV1JDUyBcIiArIGxjd29yZCk7XHJcbiAgaWYocmVzLmxlbmd0aCkge1xyXG4gICAgcmV0dXJuIHJlc1swXTtcclxuICB9XHJcbiAgcmV0dXJuIHVuZGVmaW5lZDtcclxufVxyXG5cclxuXHJcblxyXG4vKlxyXG5leHBvcnQgZnVuY3Rpb24gZHVtcENudCgpIHtcclxuICBjb25zb2xlLmxvZyhgXHJcbmV4YWN0TGVuID0gJHtleGFjdExlbn07XHJcbmV4YWN0Q250ID0gJHtleGFjdENudH07XHJcbmZ1enp5TGVuID0gJHtmdXp6eUxlbn07XHJcbmZ1enp5Q250ID0gJHtmdXp6eUNudH07XHJcbnRvdGFsQ250ID0gJHt0b3RhbENudH07XHJcbnRvdGFsTGVuID0gJHt0b3RhbExlbn07XHJcbnJldGFpbmVkTGVuID0gJHtyZXRhaW5lZENudH07XHJcbiAgYCk7XHJcbn1cclxuKi9cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWRTZW50ZW5jZShvU2VudGVuY2U6IElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11bXSk6IGJvb2xlYW4ge1xyXG4gIHJldHVybiBvU2VudGVuY2UuZXZlcnkoZnVuY3Rpb24gKG9Xb3JkR3JvdXApIHtcclxuICAgIHJldHVybiAob1dvcmRHcm91cC5sZW5ndGggPiAwKTtcclxuICB9KTtcclxufVxyXG5cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkKGFycjogSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXVtdW10pOiBJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdW11bXSB7XHJcbiAgcmV0dXJuIGFyci5maWx0ZXIoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xyXG4gICAgcmV0dXJuIGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZFNlbnRlbmNlKG9TZW50ZW5jZSk7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjYXRlZ29yaXplQVdvcmQoc1dvcmRHcm91cDogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHNlbnRlbmNlOiBzdHJpbmcsIHdvcmRzOiB7IFtrZXk6IHN0cmluZ106IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPn0sXHJcbmNudFJlYyA/IDogSUNudFJlYyApIDogSU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdIHtcclxuICB2YXIgc2Vlbkl0ID0gd29yZHNbc1dvcmRHcm91cF07XHJcbiAgaWYgKHNlZW5JdCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICBzZWVuSXQgPSBjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmKHNXb3JkR3JvdXAsIHJ1bGVzLCBjbnRSZWMpO1xyXG4gICAgdXRpbHMuZGVlcEZyZWV6ZShzZWVuSXQpO1xyXG4gICAgd29yZHNbc1dvcmRHcm91cF0gPSBzZWVuSXQ7XHJcbiAgfVxyXG4gIGlmICghc2Vlbkl0IHx8IHNlZW5JdC5sZW5ndGggPT09IDApIHtcclxuICAgIGxvZ2dlcihcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIFxcXCJcIiArIHNXb3JkR3JvdXAgKyBcIlxcXCIgaW4gc2VudGVuY2UgXFxcIlwiXHJcbiAgICAgICsgc2VudGVuY2UgKyBcIlxcXCJcIik7XHJcbiAgICBpZiAoc1dvcmRHcm91cC5pbmRleE9mKFwiIFwiKSA8PSAwKSB7XHJcbiAgICAgIGRlYnVnbG9nKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgcHJpbWl0aXZlICghKVwiICsgc1dvcmRHcm91cCk7XHJcbiAgICB9XHJcbiAgICBkZWJ1Z2xvZyhcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIFwiICsgc1dvcmRHcm91cCk7XHJcbiAgICBpZiAoIXNlZW5JdCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RpbmcgZW10cHkgbGlzdCwgbm90IHVuZGVmaW5lZCBmb3IgXFxcIlwiICsgc1dvcmRHcm91cCArIFwiXFxcIlwiKVxyXG4gICAgfVxyXG4gICAgd29yZHNbc1dvcmRHcm91cF0gPSBbXVxyXG4gICAgcmV0dXJuIFtdO1xyXG4gIH1cclxuICByZXR1cm4gdXRpbHMuY2xvbmVEZWVwKHNlZW5JdCk7XHJcbn1cclxuXHJcblxyXG4vKipcclxuICogR2l2ZW4gYSAgc3RyaW5nLCBicmVhayBpdCBkb3duIGludG8gY29tcG9uZW50cyxcclxuICogW1snQScsICdCJ10sIFsnQSBCJ11dXHJcbiAqXHJcbiAqIHRoZW4gY2F0ZWdvcml6ZVdvcmRzXHJcbiAqIHJldHVybmluZ1xyXG4gKlxyXG4gKiBbIFtbIHsgY2F0ZWdvcnk6ICdzeXN0ZW1JZCcsIHdvcmQgOiAnQSd9LFxyXG4gKiAgICAgIHsgY2F0ZWdvcnk6ICdvdGhlcnRoaW5nJywgd29yZCA6ICdBJ31cclxuICogICAgXSxcclxuICogICAgLy8gcmVzdWx0IG9mIEJcclxuICogICAgWyB7IGNhdGVnb3J5OiAnc3lzdGVtSWQnLCB3b3JkIDogJ0InfSxcclxuICogICAgICB7IGNhdGVnb3J5OiAnb3RoZXJ0aGluZycsIHdvcmQgOiAnQSd9XHJcbiAqICAgICAgeyBjYXRlZ29yeTogJ2Fub3RoZXJ0cnlwJywgd29yZCA6ICdCJ31cclxuICogICAgXVxyXG4gKiAgIF0sXHJcbiAqIF1dXVxyXG4gKlxyXG4gKlxyXG4gKlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVTdHJpbmcoc1N0cmluZzogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsXHJcbiAgd29yZHM/OiB7IFtrZXk6IHN0cmluZ106IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiB9KVxyXG4gIDogWyBbIElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXV0gXVxyXG4gICB7XHJcbiAgdmFyIGNudCA9IDA7XHJcbiAgdmFyIGZhYyA9IDE7XHJcbiAgdmFyIHUgPSBicmVha2Rvd24uYnJlYWtkb3duU3RyaW5nKHNTdHJpbmcsIEFsZ29sLk1heFNwYWNlc1BlckNvbWJpbmVkV29yZCk7XHJcbiAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgZGVidWdsb2coXCJoZXJlIGJyZWFrZG93blwiICsgSlNPTi5zdHJpbmdpZnkodSkpO1xyXG4gIH1cclxuICAvL2NvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHUpKTtcclxuICB3b3JkcyA9IHdvcmRzIHx8IHt9O1xyXG4gIGRlYnVncGVyZigndGhpcyBtYW55IGtub3duIHdvcmRzOiAnICsgT2JqZWN0LmtleXMod29yZHMpLmxlbmd0aCk7XHJcbiAgdmFyIHJlcyA9IFtdIGFzIFtbIElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXV0gXTtcclxuICB2YXIgY250UmVjID0ge307XHJcbiAgdS5mb3JFYWNoKGZ1bmN0aW9uIChhQnJlYWtEb3duU2VudGVuY2UpIHtcclxuICAgICAgdmFyIGNhdGVnb3JpemVkU2VudGVuY2UgPSBbXSBhcyBbIElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXSBdO1xyXG4gICAgICB2YXIgaXNWYWxpZCA9IGFCcmVha0Rvd25TZW50ZW5jZS5ldmVyeShmdW5jdGlvbiAoc1dvcmRHcm91cDogc3RyaW5nLCBpbmRleCA6IG51bWJlcikge1xyXG4gICAgICAgIHZhciBzZWVuSXQgPSBjYXRlZ29yaXplQVdvcmQoc1dvcmRHcm91cCwgcnVsZXMsIHNTdHJpbmcsIHdvcmRzLCBjbnRSZWMpO1xyXG4gICAgICAgIGlmKHNlZW5JdC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2F0ZWdvcml6ZWRTZW50ZW5jZVtpbmRleF0gPSBzZWVuSXQ7XHJcbiAgICAgICAgY250ID0gY250ICsgc2Vlbkl0Lmxlbmd0aDtcclxuICAgICAgICBmYWMgPSBmYWMgKiBzZWVuSXQubGVuZ3RoO1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICB9KTtcclxuICAgICAgaWYoaXNWYWxpZCkge1xyXG4gICAgICAgIHJlcy5wdXNoKGNhdGVnb3JpemVkU2VudGVuY2UpO1xyXG4gICAgICB9XHJcbiAgfSk7XHJcbiAgZGVidWdsb2coXCIgc2VudGVuY2VzIFwiICsgdS5sZW5ndGggKyBcIiBtYXRjaGVzIFwiICsgY250ICsgXCIgZmFjOiBcIiArIGZhYyk7XHJcbiAgaWYoZGVidWdsb2cuZW5hYmxlZCAmJiB1Lmxlbmd0aCkge1xyXG4gICAgZGVidWdsb2coXCJmaXJzdCBtYXRjaCBcIisgSlNPTi5zdHJpbmdpZnkodSx1bmRlZmluZWQsMikpO1xyXG4gIH1cclxuICBkZWJ1Z3BlcmYoXCIgc2VudGVuY2VzIFwiICsgdS5sZW5ndGggKyBcIiAvIFwiICsgcmVzLmxlbmd0aCArICBcIiBtYXRjaGVzIFwiICsgY250ICsgXCIgZmFjOiBcIiArIGZhYyArIFwiIHJlYyA6IFwiICsgSlNPTi5zdHJpbmdpZnkoY250UmVjLHVuZGVmaW5lZCwyKSk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjYXRlZ29yaXplQVdvcmRXaXRoT2Zmc2V0cyhzV29yZEdyb3VwOiBzdHJpbmcsIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgc2VudGVuY2U6IHN0cmluZywgd29yZHM6IHsgW2tleTogc3RyaW5nXTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+fSxcclxuY250UmVjID8gOiBJQ250UmVjICkgOiBJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nUmFuZ2VkW10ge1xyXG4gIHZhciBzZWVuSXQgPSB3b3Jkc1tzV29yZEdyb3VwXTtcclxuICBpZiAoc2Vlbkl0ID09PSB1bmRlZmluZWQpIHtcclxuICAgIHNlZW5JdCA9IGNhdGVnb3JpemVXb3JkV2l0aE9mZnNldFdpdGhSYW5rQ3V0b2ZmKHNXb3JkR3JvdXAsIHJ1bGVzLCBjbnRSZWMpO1xyXG4gICAgdXRpbHMuZGVlcEZyZWV6ZShzZWVuSXQpO1xyXG4gICAgd29yZHNbc1dvcmRHcm91cF0gPSBzZWVuSXQ7XHJcbiAgfVxyXG4gIGlmICghc2Vlbkl0IHx8IHNlZW5JdC5sZW5ndGggPT09IDApIHtcclxuICAgIGxvZ2dlcihcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIFxcXCJcIiArIHNXb3JkR3JvdXAgKyBcIlxcXCIgaW4gc2VudGVuY2UgXFxcIlwiXHJcbiAgICAgICsgc2VudGVuY2UgKyBcIlxcXCJcIik7XHJcbiAgICBpZiAoc1dvcmRHcm91cC5pbmRleE9mKFwiIFwiKSA8PSAwKSB7XHJcbiAgICAgIGRlYnVnbG9nKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgcHJpbWl0aXZlICghKVwiICsgc1dvcmRHcm91cCk7XHJcbiAgICB9XHJcbiAgICBkZWJ1Z2xvZyhcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIFwiICsgc1dvcmRHcm91cCk7XHJcbiAgICBpZiAoIXNlZW5JdCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RpbmcgZW10cHkgbGlzdCwgbm90IHVuZGVmaW5lZCBmb3IgXFxcIlwiICsgc1dvcmRHcm91cCArIFwiXFxcIlwiKVxyXG4gICAgfVxyXG4gICAgd29yZHNbc1dvcmRHcm91cF0gPSBbXVxyXG4gICAgcmV0dXJuIFtdO1xyXG4gIH1cclxuICByZXR1cm4gdXRpbHMuY2xvbmVEZWVwKHNlZW5JdCk7XHJcbn1cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuLypcclxuWyBbYSxiXSwgW2MsZF1dXHJcblxyXG4wMCBhXHJcbjAxIGJcclxuMTAgY1xyXG4xMSBkXHJcbjEyIGNcclxuKi9cclxuXHJcblxyXG5jb25zdCBjbG9uZSA9IHV0aWxzLmNsb25lRGVlcDtcclxuXHJcblxyXG5mdW5jdGlvbiBjb3B5VmVjTWVtYmVycyh1KSB7XHJcbiAgdmFyIGkgPSAwO1xyXG4gIGZvcihpID0gMDsgaSA8IHUubGVuZ3RoOyArK2kpIHtcclxuICAgIHVbaV0gPSBjbG9uZSh1W2ldKTtcclxuICB9XHJcbiAgcmV0dXJuIHU7XHJcbn1cclxuLy8gd2UgY2FuIHJlcGxpY2F0ZSB0aGUgdGFpbCBvciB0aGUgaGVhZCxcclxuLy8gd2UgcmVwbGljYXRlIHRoZSB0YWlsIGFzIGl0IGlzIHNtYWxsZXIuXHJcblxyXG4vLyBbYSxiLGMgXVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGV4cGFuZE1hdGNoQXJyKGRlZXA6IEFycmF5PEFycmF5PGFueT4+KTogQXJyYXk8QXJyYXk8YW55Pj4ge1xyXG4gIHZhciBhID0gW107XHJcbiAgdmFyIGxpbmUgPSBbXTtcclxuICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gSlNPTi5zdHJpbmdpZnkoZGVlcCkgOiAnLScpO1xyXG4gIGRlZXAuZm9yRWFjaChmdW5jdGlvbiAodUJyZWFrRG93bkxpbmUsIGlJbmRleDogbnVtYmVyKSB7XHJcbiAgICBsaW5lW2lJbmRleF0gPSBbXTtcclxuICAgIHVCcmVha0Rvd25MaW5lLmZvckVhY2goZnVuY3Rpb24gKGFXb3JkR3JvdXAsIHdnSW5kZXg6IG51bWJlcikge1xyXG4gICAgICBsaW5lW2lJbmRleF1bd2dJbmRleF0gPSBbXTtcclxuICAgICAgYVdvcmRHcm91cC5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZFZhcmlhbnQsIGlXVkluZGV4OiBudW1iZXIpIHtcclxuICAgICAgICBsaW5lW2lJbmRleF1bd2dJbmRleF1baVdWSW5kZXhdID0gb1dvcmRWYXJpYW50O1xyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gIH0pXHJcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IEpTT04uc3RyaW5naWZ5KGxpbmUpIDogJy0nKTtcclxuICB2YXIgcmVzID0gW107XHJcbiAgdmFyIG52ZWNzID0gW107XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lLmxlbmd0aDsgKytpKSB7XHJcbiAgICB2YXIgdmVjcyA9IFtbXV07XHJcbiAgICB2YXIgbnZlY3MgPSBbXTtcclxuICAgIHZhciBydmVjID0gW107XHJcbiAgICBmb3IgKHZhciBrID0gMDsgayA8IGxpbmVbaV0ubGVuZ3RoOyArK2spIHsgLy8gd29yZGdyb3VwIGtcclxuICAgICAgLy92ZWNzIGlzIHRoZSB2ZWN0b3Igb2YgYWxsIHNvIGZhciBzZWVuIHZhcmlhbnRzIHVwIHRvIGsgd2dzLlxyXG4gICAgICB2YXIgbmV4dEJhc2UgPSBbXTtcclxuICAgICAgZm9yICh2YXIgbCA9IDA7IGwgPCBsaW5lW2ldW2tdLmxlbmd0aDsgKytsKSB7IC8vIGZvciBlYWNoIHZhcmlhbnRcclxuICAgICAgICAvL2RlYnVnbG9nKFwidmVjcyBub3dcIiArIEpTT04uc3RyaW5naWZ5KHZlY3MpKTtcclxuICAgICAgICBudmVjcyA9IFtdOyAvL3ZlY3Muc2xpY2UoKTsgLy8gY29weSB0aGUgdmVjW2ldIGJhc2UgdmVjdG9yO1xyXG4gICAgICAgIC8vZGVidWdsb2coXCJ2ZWNzIGNvcGllZCBub3dcIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSk7XHJcbiAgICAgICAgZm9yICh2YXIgdSA9IDA7IHUgPCB2ZWNzLmxlbmd0aDsgKyt1KSB7XHJcbiAgICAgICAgICBudmVjc1t1XSA9IHZlY3NbdV0uc2xpY2UoKTsgLy9cclxuICAgICAgICAgIG52ZWNzW3VdID0gY29weVZlY01lbWJlcnMobnZlY3NbdV0pO1xyXG4gICAgICAgICAgLy8gZGVidWdsb2coXCJjb3BpZWQgdmVjc1tcIisgdStcIl1cIiArIEpTT04uc3RyaW5naWZ5KHZlY3NbdV0pKTtcclxuICAgICAgICAgIG52ZWNzW3VdLnB1c2goXHJcbiAgICAgICAgICAgIGNsb25lKGxpbmVbaV1ba11bbF0pKTsgLy8gcHVzaCB0aGUgbHRoIHZhcmlhbnRcclxuICAgICAgICAgIC8vIGRlYnVnbG9nKFwibm93IG52ZWNzIFwiICsgbnZlY3MubGVuZ3RoICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyAgIGRlYnVnbG9nKFwiIGF0ICAgICBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiBuZXh0YmFzZSA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpXHJcbiAgICAgICAgLy8gICBkZWJ1Z2xvZyhcIiBhcHBlbmQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbnZlY3MgICAgPlwiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKVxyXG4gICAgICAgIG5leHRCYXNlID0gbmV4dEJhc2UuY29uY2F0KG52ZWNzKTtcclxuICAgICAgICAvLyAgIGRlYnVnbG9nKFwiICByZXN1bHQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbnZlY3MgICAgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxyXG4gICAgICB9IC8vY29uc3RydVxyXG4gICAgICAvLyAgZGVidWdsb2coXCJub3cgYXQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxyXG4gICAgICB2ZWNzID0gbmV4dEJhc2U7XHJcbiAgICB9XHJcbiAgICBkZWJ1Z2xvZ1YoZGVidWdsb2dWLmVuYWJsZWQgPyAoXCJBUFBFTkRJTkcgVE8gUkVTXCIgKyBpICsgXCI6XCIgKyBsICsgXCIgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKSA6ICctJyk7XHJcbiAgICByZXMgPSByZXMuY29uY2F0KHZlY3MpO1xyXG4gIH1cclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5cclxuLyoqXHJcbiAqIENhbGN1bGF0ZSBhIHdlaWdodCBmYWN0b3IgZm9yIGEgZ2l2ZW4gZGlzdGFuY2UgYW5kXHJcbiAqIGNhdGVnb3J5XHJcbiAqIEBwYXJhbSB7aW50ZWdlcn0gZGlzdCBkaXN0YW5jZSBpbiB3b3Jkc1xyXG4gKiBAcGFyYW0ge3N0cmluZ30gY2F0ZWdvcnkgY2F0ZWdvcnkgdG8gdXNlXHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IGEgZGlzdGFuY2UgZmFjdG9yID49IDFcclxuICogIDEuMCBmb3Igbm8gZWZmZWN0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcmVpbmZvcmNlRGlzdFdlaWdodChkaXN0OiBudW1iZXIsIGNhdGVnb3J5OiBzdHJpbmcpOiBudW1iZXIge1xyXG4gIHZhciBhYnMgPSBNYXRoLmFicyhkaXN0KTtcclxuICByZXR1cm4gMS4wICsgKEFsZ29sLmFSZWluZm9yY2VEaXN0V2VpZ2h0W2Fic10gfHwgMCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHaXZlbiBhIHNlbnRlbmNlLCBleHRhY3QgY2F0ZWdvcmllc1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RDYXRlZ29yeU1hcChvU2VudGVuY2U6IEFycmF5PElGTWF0Y2guSVdvcmQ+KTogeyBba2V5OiBzdHJpbmddOiBBcnJheTx7IHBvczogbnVtYmVyIH0+IH0ge1xyXG4gIHZhciByZXMgPSB7fTtcclxuICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKCdleHRyYWN0Q2F0ZWdvcnlNYXAgJyArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSkpIDogJy0nKTtcclxuICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGlJbmRleCkge1xyXG4gICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBJRk1hdGNoLkNBVF9DQVRFR09SWSkge1xyXG4gICAgICByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10gfHwgW107XHJcbiAgICAgIHJlc1tvV29yZC5tYXRjaGVkU3RyaW5nXS5wdXNoKHsgcG9zOiBpSW5kZXggfSk7XHJcbiAgICB9XHJcbiAgfSk7XHJcbiAgdXRpbHMuZGVlcEZyZWV6ZShyZXMpO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWluRm9yY2VTZW50ZW5jZShvU2VudGVuY2UpIHtcclxuICBcInVzZSBzdHJpY3RcIjtcclxuICB2YXIgb0NhdGVnb3J5TWFwID0gZXh0cmFjdENhdGVnb3J5TWFwKG9TZW50ZW5jZSk7XHJcbiAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpSW5kZXgpIHtcclxuICAgIHZhciBtID0gb0NhdGVnb3J5TWFwW29Xb3JkLmNhdGVnb3J5XSB8fCBbXTtcclxuICAgIG0uZm9yRWFjaChmdW5jdGlvbiAob1Bvc2l0aW9uOiB7IHBvczogbnVtYmVyIH0pIHtcclxuICAgICAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgICAgIG9Xb3JkLnJlaW5mb3JjZSA9IG9Xb3JkLnJlaW5mb3JjZSB8fCAxO1xyXG4gICAgICB2YXIgYm9vc3QgPSByZWluZm9yY2VEaXN0V2VpZ2h0KGlJbmRleCAtIG9Qb3NpdGlvbi5wb3MsIG9Xb3JkLmNhdGVnb3J5KTtcclxuICAgICAgb1dvcmQucmVpbmZvcmNlICo9IGJvb3N0O1xyXG4gICAgICBvV29yZC5fcmFua2luZyAqPSBib29zdDtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG4gIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaUluZGV4KSB7XHJcbiAgICBpZiAoaUluZGV4ID4gMCApIHtcclxuICAgICAgaWYgKG9TZW50ZW5jZVtpSW5kZXgtMV0uY2F0ZWdvcnkgPT09IFwibWV0YVwiICAmJiAob1dvcmQuY2F0ZWdvcnkgPT09IG9TZW50ZW5jZVtpSW5kZXgtMV0ubWF0Y2hlZFN0cmluZykgKSB7XHJcbiAgICAgICAgb1dvcmQucmVpbmZvcmNlID0gb1dvcmQucmVpbmZvcmNlIHx8IDE7XHJcbiAgICAgICAgdmFyIGJvb3N0ID0gcmVpbmZvcmNlRGlzdFdlaWdodCgxLCBvV29yZC5jYXRlZ29yeSk7XHJcbiAgICAgICAgb1dvcmQucmVpbmZvcmNlICo9IGJvb3N0O1xyXG4gICAgICAgIG9Xb3JkLl9yYW5raW5nICo9IGJvb3N0O1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSk7XHJcbiAgcmV0dXJuIG9TZW50ZW5jZTtcclxufVxyXG5cclxuXHJcbmltcG9ydCAqIGFzIFNlbnRlbmNlIGZyb20gJy4vc2VudGVuY2UnO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlaW5Gb3JjZShhQ2F0ZWdvcml6ZWRBcnJheSkge1xyXG4gIFwidXNlIHN0cmljdFwiO1xyXG4gIGFDYXRlZ29yaXplZEFycmF5LmZvckVhY2goZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xyXG4gICAgcmVpbkZvcmNlU2VudGVuY2Uob1NlbnRlbmNlKTtcclxuICB9KVxyXG4gIGFDYXRlZ29yaXplZEFycmF5LnNvcnQoU2VudGVuY2UuY21wUmFua2luZ1Byb2R1Y3QpO1xyXG4gIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nKFwiYWZ0ZXIgcmVpbmZvcmNlXCIgKyBhQ2F0ZWdvcml6ZWRBcnJheS5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xyXG4gICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcclxuICAgIH0pLmpvaW4oXCJcXG5cIikpO1xyXG4gIH1cclxuICByZXR1cm4gYUNhdGVnb3JpemVkQXJyYXk7XHJcbn1cclxuXHJcblxyXG4vLy8gYmVsb3cgbWF5IG5vIGxvbmdlciBiZSB1c2VkXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hSZWdFeHAob1J1bGU6IElSdWxlLCBjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQsIG9wdGlvbnM/OiBJTWF0Y2hPcHRpb25zKSB7XHJcbiAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICB2YXIgc0tleSA9IG9SdWxlLmtleTtcclxuICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKVxyXG4gIHZhciByZWcgPSBvUnVsZS5yZWdleHA7XHJcblxyXG4gIHZhciBtID0gcmVnLmV4ZWMoczEpO1xyXG4gIGlmKGRlYnVnbG9nVi5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZ1YoXCJhcHBseWluZyByZWdleHA6IFwiICsgczEgKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KG0pKTtcclxuICB9XHJcbiAgaWYgKCFtKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxyXG4gIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsIG9SdWxlLmZvbGxvd3MsIG9SdWxlLmtleSlcclxuICBpZiAoZGVidWdsb2dWLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nVihKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xyXG4gICAgZGVidWdsb2dWKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcclxuICB9XHJcbiAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkXHJcbiAgfVxyXG4gIHZhciBvRXh0cmFjdGVkQ29udGV4dCA9IGV4dHJhY3RBcmdzTWFwKG0sIG9SdWxlLmFyZ3NNYXApO1xyXG4gIGlmIChkZWJ1Z2xvZ1YuZW5hYmxlZCkge1xyXG4gICAgZGVidWdsb2dWKFwiZXh0cmFjdGVkIGFyZ3MgXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZS5hcmdzTWFwKSk7XHJcbiAgICBkZWJ1Z2xvZ1YoXCJtYXRjaCBcIiArIEpTT04uc3RyaW5naWZ5KG0pKTtcclxuICAgIGRlYnVnbG9nVihcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob0V4dHJhY3RlZENvbnRleHQpKTtcclxuICB9XHJcbiAgdmFyIHJlcyA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpIGFzIGFueTtcclxuICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpO1xyXG4gIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcclxuICBpZiAob0V4dHJhY3RlZENvbnRleHRbc0tleV0gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgcmVzW3NLZXldID0gb0V4dHJhY3RlZENvbnRleHRbc0tleV07XHJcbiAgfVxyXG4gIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XHJcbiAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb1J1bGUuZm9sbG93cyk7XHJcbiAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpXHJcbiAgfVxyXG4gIE9iamVjdC5mcmVlemUocmVzKTtcclxuICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKSA6ICctJyk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNvcnRCeVdlaWdodChzS2V5OiBzdHJpbmcsIG9Db250ZXh0QTogSUZNYXRjaC5jb250ZXh0LCBvQ29udGV4dEI6IElGTWF0Y2guY29udGV4dCk6IG51bWJlciB7XHJcbiAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIGRlYnVnbG9nVignc29ydGluZzogJyArIHNLZXkgKyAnaW52b2tlZCB3aXRoXFxuIDE6JyArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QSwgdW5kZWZpbmVkLCAyKSArXHJcbiAgICBcIiB2cyBcXG4gMjpcIiArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QiwgdW5kZWZpbmVkLCAyKSk7XHJcbiAgfVxyXG4gIHZhciByYW5raW5nQTogbnVtYmVyID0gcGFyc2VGbG9hdChvQ29udGV4dEFbXCJfcmFua2luZ1wiXSB8fCBcIjFcIik7XHJcbiAgdmFyIHJhbmtpbmdCOiBudW1iZXIgPSBwYXJzZUZsb2F0KG9Db250ZXh0QltcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcclxuICBpZiAocmFua2luZ0EgIT09IHJhbmtpbmdCKSB7XHJcbiAgICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAgIGRlYnVnbG9nKFwiIHJhbmtpbiBkZWx0YVwiICsgMTAwICogKHJhbmtpbmdCIC0gcmFua2luZ0EpKTtcclxuICAgIH1cclxuICAgIHJldHVybiAxMDAgKiAocmFua2luZ0IgLSByYW5raW5nQSlcclxuICB9XHJcblxyXG4gIHZhciB3ZWlnaHRBID0gb0NvbnRleHRBW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdW3NLZXldIHx8IDA7XHJcbiAgdmFyIHdlaWdodEIgPSBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QltcIl93ZWlnaHRcIl1bc0tleV0gfHwgMDtcclxuICByZXR1cm4gKyh3ZWlnaHRCIC0gd2VpZ2h0QSk7XHJcbn1cclxuXHJcblxyXG4vLyBXb3JkLCBTeW5vbnltLCBSZWdleHAgLyBFeHRyYWN0aW9uUnVsZVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0MShjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQsIG9SdWxlczogQXJyYXk8SVJ1bGU+LCBvcHRpb25zOiBJTWF0Y2hPcHRpb25zKTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgdmFyIHNLZXkgPSBvUnVsZXNbMF0ua2V5O1xyXG4gIC8vIGNoZWNrIHRoYXQgcnVsZVxyXG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAvLyBjaGVjayBjb25zaXN0ZW5jeVxyXG4gICAgb1J1bGVzLmV2ZXJ5KGZ1bmN0aW9uIChpUnVsZSkge1xyXG4gICAgICBpZiAoaVJ1bGUua2V5ICE9PSBzS2V5KSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW5ob21vZ2Vub3VzIGtleXMgaW4gcnVsZXMsIGV4cGVjdGVkIFwiICsgc0tleSArIFwiIHdhcyBcIiArIEpTT04uc3RyaW5naWZ5KGlSdWxlKSk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vIGxvb2sgZm9yIHJ1bGVzIHdoaWNoIG1hdGNoXHJcbiAgdmFyIHJlcyA9IG9SdWxlcy5tYXAoZnVuY3Rpb24gKG9SdWxlKSB7XHJcbiAgICAvLyBpcyB0aGlzIHJ1bGUgYXBwbGljYWJsZVxyXG4gICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuV09SRDpcclxuICAgICAgICByZXR1cm4gbWF0Y2hXb3JkKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKVxyXG4gICAgICBjYXNlIElGTWF0Y2guRW51bVJ1bGVUeXBlLlJFR0VYUDpcclxuICAgICAgICByZXR1cm4gbWF0Y2hSZWdFeHAob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xyXG4gICAgICAvLyAgIGNhc2UgXCJFeHRyYWN0aW9uXCI6XHJcbiAgICAgIC8vICAgICByZXR1cm4gbWF0Y2hFeHRyYWN0aW9uKG9SdWxlLGNvbnRleHQpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gIH0pLmZpbHRlcihmdW5jdGlvbiAob3Jlcykge1xyXG4gICAgcmV0dXJuICEhb3Jlc1xyXG4gIH0pLnNvcnQoXHJcbiAgICBzb3J0QnlXZWlnaHQuYmluZCh0aGlzLCBzS2V5KVxyXG4gICAgKTtcclxuICAgIC8vZGVidWdsb2coXCJoYXNzb3J0ZWRcIiArIEpTT04uc3RyaW5naWZ5KHJlcyx1bmRlZmluZWQsMikpO1xyXG4gIHJldHVybiByZXM7XHJcbiAgLy8gT2JqZWN0LmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XHJcbiAgLy8gfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhdWdtZW50Q29udGV4dChjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQsIGFSdWxlczogQXJyYXk8SVJ1bGU+KTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcblxyXG4gIHZhciBvcHRpb25zMTogSU1hdGNoT3B0aW9ucyA9IHtcclxuICAgIG1hdGNob3RoZXJzOiB0cnVlLFxyXG4gICAgb3ZlcnJpZGU6IGZhbHNlXHJcbiAgfSBhcyBJTWF0Y2hPcHRpb25zO1xyXG5cclxuICB2YXIgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMxKVxyXG5cclxuICBpZiAoYVJlcy5sZW5ndGggPT09IDApIHtcclxuICAgIHZhciBvcHRpb25zMjogSU1hdGNoT3B0aW9ucyA9IHtcclxuICAgICAgbWF0Y2hvdGhlcnM6IGZhbHNlLFxyXG4gICAgICBvdmVycmlkZTogdHJ1ZVxyXG4gICAgfSBhcyBJTWF0Y2hPcHRpb25zO1xyXG4gICAgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMyKTtcclxuICB9XHJcbiAgcmV0dXJuIGFSZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBpbnNlcnRPcmRlcmVkKHJlc3VsdDogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiwgaUluc2VydGVkTWVtYmVyOiBJRk1hdGNoLmNvbnRleHQsIGxpbWl0OiBudW1iZXIpOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICAvLyBUT0RPOiB1c2Ugc29tZSB3ZWlnaHRcclxuICBpZiAocmVzdWx0Lmxlbmd0aCA8IGxpbWl0KSB7XHJcbiAgICByZXN1bHQucHVzaChpSW5zZXJ0ZWRNZW1iZXIpXHJcbiAgfVxyXG4gIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdGFrZVRvcE4oYXJyOiBBcnJheTxBcnJheTxJRk1hdGNoLmNvbnRleHQ+Pik6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIHZhciB1ID0gYXJyLmZpbHRlcihmdW5jdGlvbiAoaW5uZXJBcnIpIHsgcmV0dXJuIGlubmVyQXJyLmxlbmd0aCA+IDAgfSlcclxuXHJcbiAgdmFyIHJlcyA9IFtdO1xyXG4gIC8vIHNoaWZ0IG91dCB0aGUgdG9wIG9uZXNcclxuICB1ID0gdS5tYXAoZnVuY3Rpb24gKGlBcnIpIHtcclxuICAgIHZhciB0b3AgPSBpQXJyLnNoaWZ0KCk7XHJcbiAgICByZXMgPSBpbnNlcnRPcmRlcmVkKHJlcywgdG9wLCA1KVxyXG4gICAgcmV0dXJuIGlBcnJcclxuICB9KS5maWx0ZXIoZnVuY3Rpb24gKGlubmVyQXJyOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+KTogYm9vbGVhbiB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwIH0pO1xyXG4gIC8vIGFzIEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuaW1wb3J0ICogYXMgaW5wdXRGaWx0ZXJSdWxlcyBmcm9tICcuL2lucHV0RmlsdGVyUnVsZXMnO1xyXG5cclxudmFyIHJtO1xyXG5cclxuZnVuY3Rpb24gZ2V0Uk1PbmNlKCkge1xyXG4gIGlmICghcm0pIHtcclxuICAgIHJtID0gaW5wdXRGaWx0ZXJSdWxlcy5nZXRSdWxlTWFwKClcclxuICB9XHJcbiAgcmV0dXJuIHJtO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlSdWxlcyhjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQpOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICB2YXIgYmVzdE46IEFycmF5PElGTWF0Y2guY29udGV4dD4gPSBbY29udGV4dF07XHJcbiAgaW5wdXRGaWx0ZXJSdWxlcy5vS2V5T3JkZXIuZm9yRWFjaChmdW5jdGlvbiAoc0tleTogc3RyaW5nKSB7XHJcbiAgICB2YXIgYmVzdE5leHQ6IEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+ID0gW107XHJcbiAgICBiZXN0Ti5mb3JFYWNoKGZ1bmN0aW9uIChvQ29udGV4dDogSUZNYXRjaC5jb250ZXh0KSB7XHJcbiAgICAgIGlmIChvQ29udGV4dFtzS2V5XSkge1xyXG4gICAgICAgIGRlYnVnbG9nKCcqKiBhcHBseWluZyBydWxlcyBmb3IgJyArIHNLZXkpXHJcbiAgICAgICAgdmFyIHJlcyA9IGF1Z21lbnRDb250ZXh0KG9Db250ZXh0LCBnZXRSTU9uY2UoKVtzS2V5XSB8fCBbXSlcclxuICAgICAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKCcqKiByZXN1bHQgZm9yICcgKyBzS2V5ICsgJyA9ICcgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpOiAnLScpO1xyXG4gICAgICAgIGJlc3ROZXh0LnB1c2gocmVzIHx8IFtdKVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIHJ1bGUgbm90IHJlbGV2YW50XHJcbiAgICAgICAgYmVzdE5leHQucHVzaChbb0NvbnRleHRdKTtcclxuICAgICAgfVxyXG4gICAgfSlcclxuICAgIGJlc3ROID0gdGFrZVRvcE4oYmVzdE5leHQpO1xyXG4gIH0pO1xyXG4gIHJldHVybiBiZXN0TlxyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UnVsZXNQaWNrRmlyc3QoY29udGV4dDogSUZNYXRjaC5jb250ZXh0KTogSUZNYXRjaC5jb250ZXh0IHtcclxuICB2YXIgciA9IGFwcGx5UnVsZXMoY29udGV4dCk7XHJcbiAgcmV0dXJuIHIgJiYgclswXTtcclxufVxyXG5cclxuLyoqXHJcbiAqIERlY2lkZSB3aGV0aGVyIHRvIHJlcXVlcnkgZm9yIGEgY29udGV0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZGVjaWRlT25SZVF1ZXJ5KGNvbnRleHQ6IElGTWF0Y2guY29udGV4dCk6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIHJldHVybiBbXVxyXG59XHJcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
