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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1hdGNoL2lucHV0RmlsdGVyLmpzIiwiLi4vc3JjL21hdGNoL2lucHV0RmlsdGVyLnRzIl0sIm5hbWVzIjpbImRpc3RhbmNlIiwicmVxdWlyZSIsIkxvZ2dlciIsImxvZ2dlciIsImRlYnVnIiwiZGVidWdwZXJmIiwidXRpbHMiLCJBbGdvbCIsImJyZWFrZG93biIsIkFueU9iamVjdCIsIk9iamVjdCIsImRlYnVnbG9nIiwibWF0Y2hkYXRhIiwib1VuaXRUZXN0cyIsImNhbGNEaXN0YW5jZSIsInNUZXh0MSIsInNUZXh0MiIsImxlbmd0aCIsImEwIiwibGV2ZW5zaHRlaW4iLCJzdWJzdHJpbmciLCJhIiwiSUZNYXRjaCIsImxldmVuQ3V0b2ZmIiwiQ3V0b2ZmX0xldmVuU2h0ZWluIiwibGV2ZW5QZW5hbHR5IiwiaSIsImV4cG9ydHMiLCJub25Qcml2YXRlS2V5cyIsIm9BIiwia2V5cyIsImZpbHRlciIsImtleSIsImNvdW50QWluQiIsIm9CIiwiZm5Db21wYXJlIiwiYUtleUlnbm9yZSIsIkFycmF5IiwiaXNBcnJheSIsImluZGV4T2YiLCJyZWR1Y2UiLCJwcmV2IiwicHJvdG90eXBlIiwiaGFzT3duUHJvcGVydHkiLCJjYWxsIiwic3B1cmlvdXNBbm90SW5CIiwibG93ZXJDYXNlIiwibyIsInRvTG93ZXJDYXNlIiwiY29tcGFyZUNvbnRleHQiLCJlcXVhbCIsImIiLCJkaWZmZXJlbnQiLCJzcHVyaW91c0wiLCJzcHVyaW91c1IiLCJzb3J0QnlSYW5rIiwiciIsIl9yYW5raW5nIiwiY2F0ZWdvcnkiLCJsb2NhbGVDb21wYXJlIiwibWF0Y2hlZFN0cmluZyIsImNhdGVnb3JpemVTdHJpbmciLCJzdHJpbmciLCJleGFjdCIsIm9SdWxlcyIsImVuYWJsZWQiLCJKU09OIiwic3RyaW5naWZ5IiwibGNTdHJpbmciLCJyZXMiLCJmb3JFYWNoIiwib1J1bGUiLCJ0eXBlIiwibG93ZXJjYXNld29yZCIsIkVycm9yIiwidW5kZWZpbmVkIiwid29yZCIsInB1c2giLCJleGFjdE9ubHkiLCJsZXZlbm1hdGNoIiwibSIsInJlZ2V4cCIsImV4ZWMiLCJtYXRjaEluZGV4Iiwic29ydCIsIm1hdGNoV29yZCIsImNvbnRleHQiLCJvcHRpb25zIiwiczEiLCJzMiIsImRlbHRhIiwiZm9sbG93cyIsIm1hdGNob3RoZXJzIiwiYyIsImFzc2lnbiIsIm92ZXJyaWRlIiwiX3dlaWdodCIsImZyZWV6ZSIsImV4dHJhY3RBcmdzTWFwIiwibWF0Y2giLCJhcmdzTWFwIiwiaUtleSIsInZhbHVlIiwiUmFua1dvcmQiLCJoYXNBYm92ZSIsImxzdCIsImJvcmRlciIsImV2ZXJ5Iiwib01lbWJlciIsInRha2VGaXJzdE4iLCJuIiwiaUluZGV4IiwibGFzdFJhbmtpbmciLCJ0YWtlQWJvdmUiLCJjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmIiwic1dvcmRHcm91cCIsImFSdWxlcyIsInNlZW5JdCIsIlRvcF9OX1dvcmRDYXRlZ29yaXphdGlvbnMiLCJmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWRTZW50ZW5jZSIsIm9TZW50ZW5jZSIsIm9Xb3JkR3JvdXAiLCJmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWQiLCJhcnIiLCJjYXRlZ29yaXplQVdvcmQiLCJzU3RyaW5nIiwid29yZHMiLCJkZWVwRnJlZXplIiwiY2xvbmVEZWVwIiwiYW5hbHl6ZVN0cmluZyIsImNudCIsImZhYyIsInUiLCJicmVha2Rvd25TdHJpbmciLCJNYXhTcGFjZXNQZXJDb21iaW5lZFdvcmQiLCJtYXAiLCJhQXJyIiwiY2xvbmUiLCJleHBhbmRNYXRjaEFyciIsImRlZXAiLCJsaW5lIiwidUJyZWFrRG93bkxpbmUiLCJhV29yZEdyb3VwIiwid2dJbmRleCIsIm9Xb3JkVmFyaWFudCIsImlXVkluZGV4IiwibnZlY3MiLCJ2ZWNzIiwicnZlYyIsImsiLCJuZXh0QmFzZSIsImwiLCJzbGljZSIsImNvbmNhdCIsInJlaW5mb3JjZURpc3RXZWlnaHQiLCJkaXN0IiwiYWJzIiwiTWF0aCIsImFSZWluZm9yY2VEaXN0V2VpZ2h0IiwiZXh0cmFjdENhdGVnb3J5TWFwIiwib1dvcmQiLCJDQVRfQ0FURUdPUlkiLCJwb3MiLCJyZWluRm9yY2VTZW50ZW5jZSIsIm9DYXRlZ29yeU1hcCIsIm9Qb3NpdGlvbiIsInJlaW5mb3JjZSIsImJvb3N0IiwiU2VudGVuY2UiLCJyZWluRm9yY2UiLCJhQ2F0ZWdvcml6ZWRBcnJheSIsImNtcFJhbmtpbmdQcm9kdWN0IiwicmFua2luZ1Byb2R1Y3QiLCJqb2luIiwibWF0Y2hSZWdFeHAiLCJzS2V5IiwicmVnIiwib0V4dHJhY3RlZENvbnRleHQiLCJzb3J0QnlXZWlnaHQiLCJvQ29udGV4dEEiLCJvQ29udGV4dEIiLCJyYW5raW5nQSIsInBhcnNlRmxvYXQiLCJyYW5raW5nQiIsIndlaWdodEEiLCJ3ZWlnaHRCIiwiYXVnbWVudENvbnRleHQxIiwiaVJ1bGUiLCJvcmVzIiwiYmluZCIsImF1Z21lbnRDb250ZXh0Iiwib3B0aW9uczEiLCJhUmVzIiwib3B0aW9uczIiLCJpbnNlcnRPcmRlcmVkIiwicmVzdWx0IiwiaUluc2VydGVkTWVtYmVyIiwibGltaXQiLCJ0YWtlVG9wTiIsImlubmVyQXJyIiwiaUFyciIsInRvcCIsInNoaWZ0IiwiaW5wdXRGaWx0ZXJSdWxlcyIsInJtIiwiZ2V0Uk1PbmNlIiwiZ2V0UnVsZU1hcCIsImFwcGx5UnVsZXMiLCJiZXN0TiIsIm9LZXlPcmRlciIsImJlc3ROZXh0Iiwib0NvbnRleHQiLCJhcHBseVJ1bGVzUGlja0ZpcnN0IiwiZGVjaWRlT25SZVF1ZXJ5Il0sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOzs7Ozs7Ozs7Ozs7Ozs7O0FBZ0JBOztBQUNBLElBQVlBLFdBQVFDLFFBQU0sNkJBQU4sQ0FBcEI7QUFFQSxJQUFZQyxTQUFNRCxRQUFNLGlCQUFOLENBQWxCO0FBRUEsSUFBTUUsU0FBU0QsT0FBT0MsTUFBUCxDQUFjLGFBQWQsQ0FBZjtBQUVBLElBQVlDLFFBQUtILFFBQU0sT0FBTixDQUFqQjtBQUNBLElBQUlJLFlBQVlELE1BQU0sTUFBTixDQUFoQjtBQUVB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QUNBLG9CQUFJMUcsTUFBTXlILGVBQWVxQixRQUFmLEVBQXlCTixZQUFZOUIsSUFBWixLQUFxQixFQUE5QyxDQUFWO0FBQ0FwSyx5QkFBUyxtQkFBbUJvSyxJQUFuQixHQUEwQixLQUExQixHQUFrQzdHLEtBQUtDLFNBQUwsQ0FBZUUsR0FBZixFQUFvQk0sU0FBcEIsRUFBK0IsQ0FBL0IsQ0FBM0M7QUFDQXVJLHlCQUFTckksSUFBVCxDQUFjUixPQUFPLEVBQXJCO0FBQ0QsYUFMRCxNQUtPO0FBQ0w7QUFDQTZJLHlCQUFTckksSUFBVCxDQUFjLENBQUNzSSxRQUFELENBQWQ7QUFDRDtBQUNGLFNBVkQ7QUFXQUgsZ0JBQVFWLFNBQVNZLFFBQVQsQ0FBUjtBQUNELEtBZEQ7QUFlQSxXQUFPRixLQUFQO0FBQ0Q7QUFsQmVyTCxRQUFBb0wsVUFBQSxHQUFVQSxVQUFWO0FBcUJoQixTQUFBSyxtQkFBQSxDQUFvQzlILE9BQXBDLEVBQTREO0FBQzFELFFBQUk5QixJQUFJdUosV0FBV3pILE9BQVgsQ0FBUjtBQUNBLFdBQU85QixLQUFLQSxFQUFFLENBQUYsQ0FBWjtBQUNEO0FBSGU3QixRQUFBeUwsbUJBQUEsR0FBbUJBLG1CQUFuQjtBQUtoQjs7O0FBR0EsU0FBQUMsZUFBQSxDQUFnQy9ILE9BQWhDLEVBQXdEO0FBQ3RELFdBQU8sRUFBUDtBQUNEO0FBRmUzRCxRQUFBMEwsZUFBQSxHQUFlQSxlQUFmIiwiZmlsZSI6Im1hdGNoL2lucHV0RmlsdGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XG4vKipcbiAqIHRoZSBpbnB1dCBmaWx0ZXIgc3RhZ2UgcHJlcHJvY2Vzc2VzIGEgY3VycmVudCBjb250ZXh0XG4gKlxuICogSXQgYSkgY29tYmluZXMgbXVsdGktc2VnbWVudCBhcmd1bWVudHMgaW50byBvbmUgY29udGV4dCBtZW1iZXJzXG4gKiBJdCBiKSBhdHRlbXB0cyB0byBhdWdtZW50IHRoZSBjb250ZXh0IGJ5IGFkZGl0aW9uYWwgcXVhbGlmaWNhdGlvbnNcbiAqICAgICAgICAgICAoTWlkIHRlcm0gZ2VuZXJhdGluZyBBbHRlcm5hdGl2ZXMsIGUuZy5cbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiB1bml0IHRlc3Q/XG4gKiAgICAgICAgICAgICAgICAgQ2xpZW50U2lkZVRhcmdldFJlc29sdXRpb24gLT4gc291cmNlID9cbiAqICAgICAgICAgICApXG4gKiAgU2ltcGxlIHJ1bGVzIGxpa2UgIEludGVudFxuICpcbiAqXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5pbnB1dEZpbHRlclxuICogQGZpbGUgaW5wdXRGaWx0ZXIudHNcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cbiAqL1xuLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2xpYi9ub2RlLTQuZC50c1wiIC8+XG52YXIgZGlzdGFuY2UgPSByZXF1aXJlKCcuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4nKTtcbnZhciBMb2dnZXIgPSByZXF1aXJlKCcuLi91dGlscy9sb2dnZXInKTtcbnZhciBsb2dnZXIgPSBMb2dnZXIubG9nZ2VyKCdpbnB1dEZpbHRlcicpO1xudmFyIGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKTtcbnZhciBkZWJ1Z3BlcmYgPSBkZWJ1ZygncGVyZicpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMvdXRpbHMnKTtcbnZhciBBbGdvbCA9IHJlcXVpcmUoJy4vYWxnb2wnKTtcbnZhciBicmVha2Rvd24gPSByZXF1aXJlKCcuL2JyZWFrZG93bicpO1xudmFyIEFueU9iamVjdCA9IE9iamVjdDtcbnZhciBkZWJ1Z2xvZyA9IGRlYnVnKCdpbnB1dEZpbHRlcicpO1xudmFyIG1hdGNoZGF0YSA9IHJlcXVpcmUoJy4vbWF0Y2hkYXRhJyk7XG52YXIgb1VuaXRUZXN0cyA9IG1hdGNoZGF0YS5vVW5pdFRlc3RzO1xuLyoqXG4gKiBAcGFyYW0gc1RleHQge3N0cmluZ30gdGhlIHRleHQgdG8gbWF0Y2ggdG8gTmF2VGFyZ2V0UmVzb2x1dGlvblxuICogQHBhcmFtIHNUZXh0MiB7c3RyaW5nfSB0aGUgcXVlcnkgdGV4dCwgZS5nLiBOYXZUYXJnZXRcbiAqXG4gKiBAcmV0dXJuIHRoZSBkaXN0YW5jZSwgbm90ZSB0aGF0IGlzIGlzICpub3QqIHN5bW1ldHJpYyFcbiAqL1xuZnVuY3Rpb24gY2FsY0Rpc3RhbmNlKHNUZXh0MSwgc1RleHQyKSB7XG4gICAgLy8gY29uc29sZS5sb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxuICAgIGlmICgoKHNUZXh0MS5sZW5ndGggLSBzVGV4dDIubGVuZ3RoKSA+IDgpXG4gICAgICAgIHx8IChzVGV4dDIubGVuZ3RoID4gMS41ICogc1RleHQxLmxlbmd0aClcbiAgICAgICAgfHwgKHNUZXh0Mi5sZW5ndGggPCAoc1RleHQxLmxlbmd0aCAvIDIpKSkge1xuICAgICAgICByZXR1cm4gNTAwMDA7XG4gICAgfVxuICAgIHZhciBhMCA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCksIHNUZXh0Mik7XG4gICAgaWYgKGEwICogNTAgPiAxNSAqIHNUZXh0Mi5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIDUwMDAwO1xuICAgIH1cbiAgICB2YXIgYSA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MSwgc1RleHQyKTtcbiAgICByZXR1cm4gYTAgKiA1MDAgLyBzVGV4dDIubGVuZ3RoICsgYTtcbn1cbnZhciBJRk1hdGNoID0gcmVxdWlyZSgnLi4vbWF0Y2gvaWZtYXRjaCcpO1xudmFyIGxldmVuQ3V0b2ZmID0gQWxnb2wuQ3V0b2ZmX0xldmVuU2h0ZWluO1xuZnVuY3Rpb24gbGV2ZW5QZW5hbHR5KGkpIHtcbiAgICAvLyAwLT4gMVxuICAgIC8vIDEgLT4gMC4xXG4gICAgLy8gMTUwIC0+ICAwLjhcbiAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgICByZXR1cm4gMTtcbiAgICB9XG4gICAgLy8gcmV2ZXJzZSBtYXkgYmUgYmV0dGVyIHRoYW4gbGluZWFyXG4gICAgcmV0dXJuIDEgKyBpICogKDAuOCAtIDEpIC8gMTUwO1xufVxuZXhwb3J0cy5sZXZlblBlbmFsdHkgPSBsZXZlblBlbmFsdHk7XG5mdW5jdGlvbiBub25Qcml2YXRlS2V5cyhvQSkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhvQSkuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIGtleVswXSAhPT0gJ18nO1xuICAgIH0pO1xufVxuZnVuY3Rpb24gY291bnRBaW5CKG9BLCBvQiwgZm5Db21wYXJlLCBhS2V5SWdub3JlKSB7XG4gICAgYUtleUlnbm9yZSA9IEFycmF5LmlzQXJyYXkoYUtleUlnbm9yZSkgPyBhS2V5SWdub3JlIDpcbiAgICAgICAgdHlwZW9mIGFLZXlJZ25vcmUgPT09IFwic3RyaW5nXCIgPyBbYUtleUlnbm9yZV0gOiBbXTtcbiAgICBmbkNvbXBhcmUgPSBmbkNvbXBhcmUgfHwgZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICByZXR1cm4gbm9uUHJpdmF0ZUtleXMob0EpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHJldHVybiBhS2V5SWdub3JlLmluZGV4T2Yoa2V5KSA8IDA7XG4gICAgfSkuXG4gICAgICAgIHJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgKGZuQ29tcGFyZShvQVtrZXldLCBvQltrZXldLCBrZXkpID8gMSA6IDApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIDApO1xufVxuZXhwb3J0cy5jb3VudEFpbkIgPSBjb3VudEFpbkI7XG5mdW5jdGlvbiBzcHVyaW91c0Fub3RJbkIob0EsIG9CLCBhS2V5SWdub3JlKSB7XG4gICAgYUtleUlnbm9yZSA9IEFycmF5LmlzQXJyYXkoYUtleUlnbm9yZSkgPyBhS2V5SWdub3JlIDpcbiAgICAgICAgdHlwZW9mIGFLZXlJZ25vcmUgPT09IFwic3RyaW5nXCIgPyBbYUtleUlnbm9yZV0gOiBbXTtcbiAgICByZXR1cm4gbm9uUHJpdmF0ZUtleXMob0EpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHJldHVybiBhS2V5SWdub3JlLmluZGV4T2Yoa2V5KSA8IDA7XG4gICAgfSkuXG4gICAgICAgIHJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XG4gICAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9CLCBrZXkpKSB7XG4gICAgICAgICAgICBwcmV2ID0gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG59XG5leHBvcnRzLnNwdXJpb3VzQW5vdEluQiA9IHNwdXJpb3VzQW5vdEluQjtcbmZ1bmN0aW9uIGxvd2VyQ2FzZShvKSB7XG4gICAgaWYgKHR5cGVvZiBvID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIHJldHVybiBvLnRvTG93ZXJDYXNlKCk7XG4gICAgfVxuICAgIHJldHVybiBvO1xufVxuZnVuY3Rpb24gY29tcGFyZUNvbnRleHQob0EsIG9CLCBhS2V5SWdub3JlKSB7XG4gICAgdmFyIGVxdWFsID0gY291bnRBaW5CKG9BLCBvQiwgZnVuY3Rpb24gKGEsIGIpIHsgcmV0dXJuIGxvd2VyQ2FzZShhKSA9PT0gbG93ZXJDYXNlKGIpOyB9LCBhS2V5SWdub3JlKTtcbiAgICB2YXIgZGlmZmVyZW50ID0gY291bnRBaW5CKG9BLCBvQiwgZnVuY3Rpb24gKGEsIGIpIHsgcmV0dXJuIGxvd2VyQ2FzZShhKSAhPT0gbG93ZXJDYXNlKGIpOyB9LCBhS2V5SWdub3JlKTtcbiAgICB2YXIgc3B1cmlvdXNMID0gc3B1cmlvdXNBbm90SW5CKG9BLCBvQiwgYUtleUlnbm9yZSk7XG4gICAgdmFyIHNwdXJpb3VzUiA9IHNwdXJpb3VzQW5vdEluQihvQiwgb0EsIGFLZXlJZ25vcmUpO1xuICAgIHJldHVybiB7XG4gICAgICAgIGVxdWFsOiBlcXVhbCxcbiAgICAgICAgZGlmZmVyZW50OiBkaWZmZXJlbnQsXG4gICAgICAgIHNwdXJpb3VzTDogc3B1cmlvdXNMLFxuICAgICAgICBzcHVyaW91c1I6IHNwdXJpb3VzUlxuICAgIH07XG59XG5leHBvcnRzLmNvbXBhcmVDb250ZXh0ID0gY29tcGFyZUNvbnRleHQ7XG5mdW5jdGlvbiBzb3J0QnlSYW5rKGEsIGIpIHtcbiAgICB2YXIgciA9IC0oKGEuX3JhbmtpbmcgfHwgMS4wKSAtIChiLl9yYW5raW5nIHx8IDEuMCkpO1xuICAgIGlmIChyKSB7XG4gICAgICAgIHJldHVybiByO1xuICAgIH1cbiAgICBpZiAoYS5jYXRlZ29yeSAmJiBiLmNhdGVnb3J5KSB7XG4gICAgICAgIHIgPSBhLmNhdGVnb3J5LmxvY2FsZUNvbXBhcmUoYi5jYXRlZ29yeSk7XG4gICAgICAgIGlmIChyKSB7XG4gICAgICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoYS5tYXRjaGVkU3RyaW5nICYmIGIubWF0Y2hlZFN0cmluZykge1xuICAgICAgICByID0gYS5tYXRjaGVkU3RyaW5nLmxvY2FsZUNvbXBhcmUoYi5tYXRjaGVkU3RyaW5nKTtcbiAgICAgICAgaWYgKHIpIHtcbiAgICAgICAgICAgIHJldHVybiByO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAwO1xufVxuZnVuY3Rpb24gY2F0ZWdvcml6ZVN0cmluZyhzdHJpbmcsIGV4YWN0LCBvUnVsZXMpIHtcbiAgICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCJydWxlcyA6IFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGVzKSk7XG4gICAgfVxuICAgIHZhciBsY1N0cmluZyA9IHN0cmluZy50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBvUnVsZXMuZm9yRWFjaChmdW5jdGlvbiAob1J1bGUpIHtcbiAgICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgICAgIGRlYnVnbG9nKCdhdHRlbXB0aW5nIHRvIG1hdGNoIHJ1bGUgJyArIEpTT04uc3RyaW5naWZ5KG9SdWxlKSArIFwiIHRvIHN0cmluZyBcXFwiXCIgKyBzdHJpbmcgKyBcIlxcXCJcIik7XG4gICAgICAgIH1cbiAgICAgICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlIDAgLyogV09SRCAqLzpcbiAgICAgICAgICAgICAgICBpZiAoIW9SdWxlLmxvd2VyY2FzZXdvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdydWxlIHdpdGhvdXQgYSBsb3dlcmNhc2UgdmFyaWFudCcgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIDtcbiAgICAgICAgICAgICAgICBpZiAoZXhhY3QgJiYgb1J1bGUud29yZCA9PT0gc3RyaW5nIHx8IG9SdWxlLmxvd2VyY2FzZXdvcmQgPT09IGxjU3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghZXhhY3QgJiYgIW9SdWxlLmV4YWN0T25seSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGV2ZW5tYXRjaCA9IGNhbGNEaXN0YW5jZShvUnVsZS5sb3dlcmNhc2V3b3JkLCBsY1N0cmluZyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsZXZlbm1hdGNoIDwgbGV2ZW5DdXRvZmYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBvUnVsZS53b3JkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfcmFua2luZzogKG9SdWxlLl9yYW5raW5nIHx8IDEuMCkgKiBsZXZlblBlbmFsdHkobGV2ZW5tYXRjaCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV2ZW5tYXRjaDogbGV2ZW5tYXRjaFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDEgLyogUkVHRVhQICovOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KFwiIGhlcmUgcmVnZXhwXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHZhciBtID0gb1J1bGUucmVnZXhwLmV4ZWMoc3RyaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiAob1J1bGUubWF0Y2hJbmRleCAhPT0gdW5kZWZpbmVkICYmIG1bb1J1bGUubWF0Y2hJbmRleF0pIHx8IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInVua25vd24gdHlwZVwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZVN0cmluZyA9IGNhdGVnb3JpemVTdHJpbmc7XG4vKipcbiAqXG4gKiBPcHRpb25zIG1heSBiZSB7XG4gKiBtYXRjaG90aGVycyA6IHRydWUsICA9PiBvbmx5IHJ1bGVzIHdoZXJlIGFsbCBvdGhlcnMgbWF0Y2ggYXJlIGNvbnNpZGVyZWRcbiAqIGF1Z21lbnQgOiB0cnVlLFxuICogb3ZlcnJpZGUgOiB0cnVlIH0gID0+XG4gKlxuICovXG5mdW5jdGlvbiBtYXRjaFdvcmQob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAoY29udGV4dFtvUnVsZS5rZXldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIHMxID0gY29udGV4dFtvUnVsZS5rZXldLnRvTG93ZXJDYXNlKCk7XG4gICAgdmFyIHMyID0gb1J1bGUud29yZC50b0xvd2VyQ2FzZSgpO1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsIG9SdWxlLmZvbGxvd3MsIG9SdWxlLmtleSk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XG4gICAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBjID0gY2FsY0Rpc3RhbmNlKHMyLCBzMSk7XG4gICAgZGVidWdsb2coXCIgczEgPD4gczIgXCIgKyBzMSArIFwiPD5cIiArIHMyICsgXCIgID0+OiBcIiArIGMpO1xuICAgIGlmIChjIDwgMTUwKSB7XG4gICAgICAgIHZhciByZXMgPSBBbnlPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKTtcbiAgICAgICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIGNvbnRleHQpO1xuICAgICAgICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xuICAgICAgICAgICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGZvcmNlIGtleSBwcm9wZXJ0eVxuICAgICAgICAvLyBjb25zb2xlLmxvZygnIG9iamVjdGNhdGVnb3J5JywgcmVzWydzeXN0ZW1PYmplY3RDYXRlZ29yeSddKTtcbiAgICAgICAgcmVzW29SdWxlLmtleV0gPSBvUnVsZS5mb2xsb3dzW29SdWxlLmtleV0gfHwgcmVzW29SdWxlLmtleV07XG4gICAgICAgIHJlcy5fd2VpZ2h0ID0gQW55T2JqZWN0LmFzc2lnbih7fSwgcmVzLl93ZWlnaHQpO1xuICAgICAgICByZXMuX3dlaWdodFtvUnVsZS5rZXldID0gYztcbiAgICAgICAgT2JqZWN0LmZyZWV6ZShyZXMpO1xuICAgICAgICBkZWJ1Z2xvZygnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5leHBvcnRzLm1hdGNoV29yZCA9IG1hdGNoV29yZDtcbmZ1bmN0aW9uIGV4dHJhY3RBcmdzTWFwKG1hdGNoLCBhcmdzTWFwKSB7XG4gICAgdmFyIHJlcyA9IHt9O1xuICAgIGlmICghYXJnc01hcCkge1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cbiAgICBPYmplY3Qua2V5cyhhcmdzTWFwKS5mb3JFYWNoKGZ1bmN0aW9uIChpS2V5KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IG1hdGNoW2lLZXldO1xuICAgICAgICB2YXIga2V5ID0gYXJnc01hcFtpS2V5XTtcbiAgICAgICAgaWYgKCh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpICYmIHZhbHVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJlc1trZXldID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5leHRyYWN0QXJnc01hcCA9IGV4dHJhY3RBcmdzTWFwO1xuZXhwb3J0cy5SYW5rV29yZCA9IHtcbiAgICBoYXNBYm92ZTogZnVuY3Rpb24gKGxzdCwgYm9yZGVyKSB7XG4gICAgICAgIHJldHVybiAhbHN0LmV2ZXJ5KGZ1bmN0aW9uIChvTWVtYmVyKSB7XG4gICAgICAgICAgICByZXR1cm4gKG9NZW1iZXIuX3JhbmtpbmcgPCBib3JkZXIpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIHRha2VGaXJzdE46IGZ1bmN0aW9uIChsc3QsIG4pIHtcbiAgICAgICAgcmV0dXJuIGxzdC5maWx0ZXIoZnVuY3Rpb24gKG9NZW1iZXIsIGlJbmRleCkge1xuICAgICAgICAgICAgdmFyIGxhc3RSYW5raW5nID0gMS4wO1xuICAgICAgICAgICAgaWYgKChpSW5kZXggPCBuKSB8fCBvTWVtYmVyLl9yYW5raW5nID09PSBsYXN0UmFua2luZykge1xuICAgICAgICAgICAgICAgIGxhc3RSYW5raW5nID0gb01lbWJlci5fcmFua2luZztcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICB0YWtlQWJvdmU6IGZ1bmN0aW9uIChsc3QsIGJvcmRlcikge1xuICAgICAgICByZXR1cm4gbHN0LmZpbHRlcihmdW5jdGlvbiAob01lbWJlcikge1xuICAgICAgICAgICAgcmV0dXJuIChvTWVtYmVyLl9yYW5raW5nID49IGJvcmRlcik7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG4vKlxudmFyIGV4YWN0TGVuID0gMDtcbnZhciBmdXp6eUxlbiA9IDA7XG52YXIgZnV6enlDbnQgPSAwO1xudmFyIGV4YWN0Q250ID0gMDtcbnZhciB0b3RhbENudCA9IDA7XG52YXIgdG90YWxMZW4gPSAwO1xudmFyIHJldGFpbmVkQ250ID0gMDtcblxuZXhwb3J0IGZ1bmN0aW9uIHJlc2V0Q250KCkge1xuICBleGFjdExlbiA9IDA7XG4gIGZ1enp5TGVuID0gMDtcbiAgZnV6enlDbnQgPSAwO1xuICBleGFjdENudCA9IDA7XG4gIHRvdGFsQ250ID0gMDtcbiAgdG90YWxMZW4gPSAwO1xuICByZXRhaW5lZENudCA9IDA7XG59XG4qL1xuZnVuY3Rpb24gY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZihzV29yZEdyb3VwLCBhUnVsZXMpIHtcbiAgICB2YXIgc2Vlbkl0ID0gY2F0ZWdvcml6ZVN0cmluZyhzV29yZEdyb3VwLCB0cnVlLCBhUnVsZXMpO1xuICAgIC8vdG90YWxDbnQgKz0gMTtcbiAgICAvLyBleGFjdExlbiArPSBzZWVuSXQubGVuZ3RoO1xuICAgIGlmIChleHBvcnRzLlJhbmtXb3JkLmhhc0Fib3ZlKHNlZW5JdCwgMC44KSkge1xuICAgICAgICBzZWVuSXQgPSBleHBvcnRzLlJhbmtXb3JkLnRha2VBYm92ZShzZWVuSXQsIDAuOCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBzZWVuSXQgPSBjYXRlZ29yaXplU3RyaW5nKHNXb3JkR3JvdXAsIGZhbHNlLCBhUnVsZXMpO1xuICAgIH1cbiAgICAvLyB0b3RhbExlbiArPSBzZWVuSXQubGVuZ3RoO1xuICAgIHNlZW5JdCA9IGV4cG9ydHMuUmFua1dvcmQudGFrZUZpcnN0TihzZWVuSXQsIEFsZ29sLlRvcF9OX1dvcmRDYXRlZ29yaXphdGlvbnMpO1xuICAgIC8vIHJldGFpbmVkQ250ICs9IHNlZW5JdC5sZW5ndGg7XG4gICAgcmV0dXJuIHNlZW5JdDtcbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZiA9IGNhdGVnb3JpemVXb3JkV2l0aFJhbmtDdXRvZmY7XG4vKlxuZXhwb3J0IGZ1bmN0aW9uIGR1bXBDbnQoKSB7XG4gIGNvbnNvbGUubG9nKGBcbmV4YWN0TGVuID0gJHtleGFjdExlbn07XG5leGFjdENudCA9ICR7ZXhhY3RDbnR9O1xuZnV6enlMZW4gPSAke2Z1enp5TGVufTtcbmZ1enp5Q250ID0gJHtmdXp6eUNudH07XG50b3RhbENudCA9ICR7dG90YWxDbnR9O1xudG90YWxMZW4gPSAke3RvdGFsTGVufTtcbnJldGFpbmVkTGVuID0gJHtyZXRhaW5lZENudH07XG4gIGApO1xufVxuKi9cbmZ1bmN0aW9uIGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZFNlbnRlbmNlKG9TZW50ZW5jZSkge1xuICAgIHJldHVybiBvU2VudGVuY2UuZXZlcnkoZnVuY3Rpb24gKG9Xb3JkR3JvdXApIHtcbiAgICAgICAgcmV0dXJuIChvV29yZEdyb3VwLmxlbmd0aCA+IDApO1xuICAgIH0pO1xufVxuZXhwb3J0cy5maWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWRTZW50ZW5jZSA9IGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZFNlbnRlbmNlO1xuZnVuY3Rpb24gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkKGFycikge1xuICAgIHJldHVybiBhcnIuZmlsdGVyKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgcmV0dXJuIGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZFNlbnRlbmNlKG9TZW50ZW5jZSk7XG4gICAgfSk7XG59XG5leHBvcnRzLmZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZCA9IGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZDtcbmZ1bmN0aW9uIGNhdGVnb3JpemVBV29yZChzV29yZEdyb3VwLCBhUnVsZXMsIHNTdHJpbmcsIHdvcmRzKSB7XG4gICAgdmFyIHNlZW5JdCA9IHdvcmRzW3NXb3JkR3JvdXBdO1xuICAgIGlmIChzZWVuSXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBzZWVuSXQgPSBjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmKHNXb3JkR3JvdXAsIGFSdWxlcyk7XG4gICAgICAgIHV0aWxzLmRlZXBGcmVlemUoc2Vlbkl0KTtcbiAgICAgICAgaWYgKHNlZW5JdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB3b3Jkc1tzV29yZEdyb3VwXSA9IHNlZW5JdDtcbiAgICAgICAgfVxuICAgICAgICB3b3Jkc1tzV29yZEdyb3VwXSA9IHNlZW5JdDtcbiAgICB9XG4gICAgaWYgKCFzZWVuSXQgfHwgc2Vlbkl0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBsb2dnZXIoXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBcXFwiXCIgKyBzV29yZEdyb3VwICsgXCJcXFwiIGluIHNlbnRlbmNlIFxcXCJcIlxuICAgICAgICAgICAgKyBzU3RyaW5nICsgXCJcXFwiXCIpO1xuICAgICAgICBpZiAoc1dvcmRHcm91cC5pbmRleE9mKFwiIFwiKSA8PSAwKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZyhcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIHByaW1pdGl2ZSAoISlcIiArIHNXb3JkR3JvdXApO1xuICAgICAgICB9XG4gICAgICAgIGRlYnVnbG9nKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgXCIgKyBzV29yZEdyb3VwKTtcbiAgICAgICAgaWYgKCFzZWVuSXQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGluZyBlbXRweSBsaXN0LCBub3QgdW5kZWZpbmVkIGZvciBcXFwiXCIgKyBzV29yZEdyb3VwICsgXCJcXFwiXCIpO1xuICAgICAgICB9XG4gICAgICAgIHdvcmRzW3NXb3JkR3JvdXBdID0gW107XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgcmV0dXJuIHV0aWxzLmNsb25lRGVlcChzZWVuSXQpO1xufVxuZXhwb3J0cy5jYXRlZ29yaXplQVdvcmQgPSBjYXRlZ29yaXplQVdvcmQ7XG4vKipcbiAqIEdpdmVuIGEgIHN0cmluZywgYnJlYWsgaXQgZG93biBpbnRvIGNvbXBvbmVudHMsXG4gKiBbWydBJywgJ0InXSwgWydBIEInXV1cbiAqXG4gKiB0aGVuIGNhdGVnb3JpemVXb3Jkc1xuICogcmV0dXJuaW5nXG4gKlxuICogWyBbWyB7IGNhdGVnb3J5OiAnc3lzdGVtSWQnLCB3b3JkIDogJ0EnfSxcbiAqICAgICAgeyBjYXRlZ29yeTogJ290aGVydGhpbmcnLCB3b3JkIDogJ0EnfVxuICogICAgXSxcbiAqICAgIC8vIHJlc3VsdCBvZiBCXG4gKiAgICBbIHsgY2F0ZWdvcnk6ICdzeXN0ZW1JZCcsIHdvcmQgOiAnQid9LFxuICogICAgICB7IGNhdGVnb3J5OiAnb3RoZXJ0aGluZycsIHdvcmQgOiAnQSd9XG4gKiAgICAgIHsgY2F0ZWdvcnk6ICdhbm90aGVydHJ5cCcsIHdvcmQgOiAnQid9XG4gKiAgICBdXG4gKiAgIF0sXG4gKiBdXV1cbiAqXG4gKlxuICpcbiAqL1xuZnVuY3Rpb24gYW5hbHl6ZVN0cmluZyhzU3RyaW5nLCBhUnVsZXMsIHdvcmRzKSB7XG4gICAgdmFyIGNudCA9IDA7XG4gICAgdmFyIGZhYyA9IDE7XG4gICAgdmFyIHUgPSBicmVha2Rvd24uYnJlYWtkb3duU3RyaW5nKHNTdHJpbmcsIEFsZ29sLk1heFNwYWNlc1BlckNvbWJpbmVkV29yZCk7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCJoZXJlIGJyZWFrZG93blwiICsgSlNPTi5zdHJpbmdpZnkodSkpO1xuICAgIH1cbiAgICB3b3JkcyA9IHdvcmRzIHx8IHt9O1xuICAgIGRlYnVncGVyZigndGhpcyBtYW55IGtub3duIHdvcmRzJyArIE9iamVjdC5rZXlzKHdvcmRzKS5sZW5ndGgpO1xuICAgIHZhciByZXMgPSB1Lm1hcChmdW5jdGlvbiAoYUFycikge1xuICAgICAgICByZXR1cm4gYUFyci5tYXAoZnVuY3Rpb24gKHNXb3JkR3JvdXApIHtcbiAgICAgICAgICAgIHZhciBzZWVuSXQgPSBjYXRlZ29yaXplQVdvcmQoc1dvcmRHcm91cCwgYVJ1bGVzLCBzU3RyaW5nLCB3b3Jkcyk7XG4gICAgICAgICAgICBjbnQgPSBjbnQgKyBzZWVuSXQubGVuZ3RoO1xuICAgICAgICAgICAgZmFjID0gZmFjICogc2Vlbkl0Lmxlbmd0aDtcbiAgICAgICAgICAgIHJldHVybiBzZWVuSXQ7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJlcyA9IGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZChyZXMpO1xuICAgIGRlYnVnbG9nKFwiIHNlbnRlbmNlcyBcIiArIHUubGVuZ3RoICsgXCIgbWF0Y2hlcyBcIiArIGNudCArIFwiIGZhYzogXCIgKyBmYWMpO1xuICAgIGRlYnVncGVyZihcIiBzZW50ZW5jZXMgXCIgKyB1Lmxlbmd0aCArIFwiIG1hdGNoZXMgXCIgKyBjbnQgKyBcIiBmYWM6IFwiICsgZmFjKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5hbmFseXplU3RyaW5nID0gYW5hbHl6ZVN0cmluZztcbi8qXG5bIFthLGJdLCBbYyxkXV1cblxuMDAgYVxuMDEgYlxuMTAgY1xuMTEgZFxuMTIgY1xuKi9cbnZhciBjbG9uZSA9IHV0aWxzLmNsb25lRGVlcDtcbi8vIHdlIGNhbiByZXBsaWNhdGUgdGhlIHRhaWwgb3IgdGhlIGhlYWQsXG4vLyB3ZSByZXBsaWNhdGUgdGhlIHRhaWwgYXMgaXQgaXMgc21hbGxlci5cbi8vIFthLGIsYyBdXG5mdW5jdGlvbiBleHBhbmRNYXRjaEFycihkZWVwKSB7XG4gICAgdmFyIGEgPSBbXTtcbiAgICB2YXIgbGluZSA9IFtdO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlZXApKTtcbiAgICBkZWVwLmZvckVhY2goZnVuY3Rpb24gKHVCcmVha0Rvd25MaW5lLCBpSW5kZXgpIHtcbiAgICAgICAgbGluZVtpSW5kZXhdID0gW107XG4gICAgICAgIHVCcmVha0Rvd25MaW5lLmZvckVhY2goZnVuY3Rpb24gKGFXb3JkR3JvdXAsIHdnSW5kZXgpIHtcbiAgICAgICAgICAgIGxpbmVbaUluZGV4XVt3Z0luZGV4XSA9IFtdO1xuICAgICAgICAgICAgYVdvcmRHcm91cC5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZFZhcmlhbnQsIGlXVkluZGV4KSB7XG4gICAgICAgICAgICAgICAgbGluZVtpSW5kZXhdW3dnSW5kZXhdW2lXVkluZGV4XSA9IG9Xb3JkVmFyaWFudDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShsaW5lKSk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIHZhciBudmVjcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZS5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgdmVjcyA9IFtbXV07XG4gICAgICAgIHZhciBudmVjcyA9IFtdO1xuICAgICAgICB2YXIgcnZlYyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBrID0gMDsgayA8IGxpbmVbaV0ubGVuZ3RoOyArK2spIHtcbiAgICAgICAgICAgIC8vdmVjcyBpcyB0aGUgdmVjdG9yIG9mIGFsbCBzbyBmYXIgc2VlbiB2YXJpYW50cyB1cCB0byBrIHdncy5cbiAgICAgICAgICAgIHZhciBuZXh0QmFzZSA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIgbCA9IDA7IGwgPCBsaW5lW2ldW2tdLmxlbmd0aDsgKytsKSB7XG4gICAgICAgICAgICAgICAgLy9kZWJ1Z2xvZyhcInZlY3Mgbm93XCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzKSk7XG4gICAgICAgICAgICAgICAgbnZlY3MgPSBbXTsgLy92ZWNzLnNsaWNlKCk7IC8vIGNvcHkgdGhlIHZlY1tpXSBiYXNlIHZlY3RvcjtcbiAgICAgICAgICAgICAgICAvL2RlYnVnbG9nKFwidmVjcyBjb3BpZWQgbm93XCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIHUgPSAwOyB1IDwgdmVjcy5sZW5ndGg7ICsrdSkge1xuICAgICAgICAgICAgICAgICAgICBudmVjc1t1XSA9IHZlY3NbdV0uc2xpY2UoKTsgLy9cbiAgICAgICAgICAgICAgICAgICAgLy8gZGVidWdsb2coXCJjb3BpZWQgdmVjc1tcIisgdStcIl1cIiArIEpTT04uc3RyaW5naWZ5KHZlY3NbdV0pKTtcbiAgICAgICAgICAgICAgICAgICAgbnZlY3NbdV0ucHVzaChjbG9uZShsaW5lW2ldW2tdW2xdKSk7IC8vIHB1c2ggdGhlIGx0aCB2YXJpYW50XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vICAgZGVidWdsb2coXCIgYXQgICAgIFwiICsgayArIFwiOlwiICsgbCArIFwiIG5leHRiYXNlID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcbiAgICAgICAgICAgICAgICAvLyAgIGRlYnVnbG9nKFwiIGFwcGVuZCBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiBudmVjcyAgICA+XCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpXG4gICAgICAgICAgICAgICAgbmV4dEJhc2UgPSBuZXh0QmFzZS5jb25jYXQobnZlY3MpO1xuICAgICAgICAgICAgfSAvL2NvbnN0cnVcbiAgICAgICAgICAgIC8vICBkZWJ1Z2xvZyhcIm5vdyBhdCBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpXG4gICAgICAgICAgICB2ZWNzID0gbmV4dEJhc2U7XG4gICAgICAgIH1cbiAgICAgICAgZGVidWdsb2coXCJBUFBFTkRJTkcgVE8gUkVTXCIgKyBpICsgXCI6XCIgKyBsICsgXCIgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKTtcbiAgICAgICAgcmVzID0gcmVzLmNvbmNhdCh2ZWNzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZXhwYW5kTWF0Y2hBcnIgPSBleHBhbmRNYXRjaEFycjtcbi8qKlxuICogQ2FsY3VsYXRlIGEgd2VpZ2h0IGZhY3RvciBmb3IgYSBnaXZlbiBkaXN0YW5jZSBhbmRcbiAqIGNhdGVnb3J5XG4gKiBAcGFyYW0ge2ludGVnZXJ9IGRpc3QgZGlzdGFuY2UgaW4gd29yZHNcbiAqIEBwYXJhbSB7c3RyaW5nfSBjYXRlZ29yeSBjYXRlZ29yeSB0byB1c2VcbiAqIEByZXR1cm5zIHtudW1iZXJ9IGEgZGlzdGFuY2UgZmFjdG9yID49IDFcbiAqICAxLjAgZm9yIG5vIGVmZmVjdFxuICovXG5mdW5jdGlvbiByZWluZm9yY2VEaXN0V2VpZ2h0KGRpc3QsIGNhdGVnb3J5KSB7XG4gICAgdmFyIGFicyA9IE1hdGguYWJzKGRpc3QpO1xuICAgIHJldHVybiAxLjAgKyAoQWxnb2wuYVJlaW5mb3JjZURpc3RXZWlnaHRbYWJzXSB8fCAwKTtcbn1cbmV4cG9ydHMucmVpbmZvcmNlRGlzdFdlaWdodCA9IHJlaW5mb3JjZURpc3RXZWlnaHQ7XG4vKipcbiAqIEdpdmVuIGEgc2VudGVuY2UsIGV4dGFjdCBjYXRlZ29yaWVzXG4gKi9cbmZ1bmN0aW9uIGV4dHJhY3RDYXRlZ29yeU1hcChvU2VudGVuY2UpIHtcbiAgICB2YXIgcmVzID0ge307XG4gICAgZGVidWdsb2coJ2V4dHJhY3RDYXRlZ29yeU1hcCAnICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKSk7XG4gICAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpSW5kZXgpIHtcbiAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBJRk1hdGNoLkNBVF9DQVRFR09SWSkge1xuICAgICAgICAgICAgcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddID0gcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddIHx8IFtdO1xuICAgICAgICAgICAgcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddLnB1c2goeyBwb3M6IGlJbmRleCB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHV0aWxzLmRlZXBGcmVlemUocmVzKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5leHRyYWN0Q2F0ZWdvcnlNYXAgPSBleHRyYWN0Q2F0ZWdvcnlNYXA7XG5mdW5jdGlvbiByZWluRm9yY2VTZW50ZW5jZShvU2VudGVuY2UpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICB2YXIgb0NhdGVnb3J5TWFwID0gZXh0cmFjdENhdGVnb3J5TWFwKG9TZW50ZW5jZSk7XG4gICAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpSW5kZXgpIHtcbiAgICAgICAgdmFyIG0gPSBvQ2F0ZWdvcnlNYXBbb1dvcmQuY2F0ZWdvcnldIHx8IFtdO1xuICAgICAgICBtLmZvckVhY2goZnVuY3Rpb24gKG9Qb3NpdGlvbikge1xuICAgICAgICAgICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgICAgICAgICBvV29yZC5yZWluZm9yY2UgPSBvV29yZC5yZWluZm9yY2UgfHwgMTtcbiAgICAgICAgICAgIHZhciBib29zdCA9IHJlaW5mb3JjZURpc3RXZWlnaHQoaUluZGV4IC0gb1Bvc2l0aW9uLnBvcywgb1dvcmQuY2F0ZWdvcnkpO1xuICAgICAgICAgICAgb1dvcmQucmVpbmZvcmNlICo9IGJvb3N0O1xuICAgICAgICAgICAgb1dvcmQuX3JhbmtpbmcgKj0gYm9vc3Q7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiBvU2VudGVuY2U7XG59XG5leHBvcnRzLnJlaW5Gb3JjZVNlbnRlbmNlID0gcmVpbkZvcmNlU2VudGVuY2U7XG52YXIgU2VudGVuY2UgPSByZXF1aXJlKCcuL3NlbnRlbmNlJyk7XG5mdW5jdGlvbiByZWluRm9yY2UoYUNhdGVnb3JpemVkQXJyYXkpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICBhQ2F0ZWdvcml6ZWRBcnJheS5mb3JFYWNoKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgcmVpbkZvcmNlU2VudGVuY2Uob1NlbnRlbmNlKTtcbiAgICB9KTtcbiAgICBhQ2F0ZWdvcml6ZWRBcnJheS5zb3J0KFNlbnRlbmNlLmNtcFJhbmtpbmdQcm9kdWN0KTtcbiAgICBkZWJ1Z2xvZyhcImFmdGVyIHJlaW5mb3JjZVwiICsgYUNhdGVnb3JpemVkQXJyYXkubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgcmV0dXJuIGFDYXRlZ29yaXplZEFycmF5O1xufVxuZXhwb3J0cy5yZWluRm9yY2UgPSByZWluRm9yY2U7XG4vLy8gYmVsb3cgbWF5IG5vIGxvbmdlciBiZSB1c2VkXG5mdW5jdGlvbiBtYXRjaFJlZ0V4cChvUnVsZSwgY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChjb250ZXh0W29SdWxlLmtleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgc0tleSA9IG9SdWxlLmtleTtcbiAgICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgcmVnID0gb1J1bGUucmVnZXhwO1xuICAgIHZhciBtID0gcmVnLmV4ZWMoczEpO1xuICAgIGRlYnVnbG9nKFwiYXBwbHlpbmcgcmVnZXhwOiBcIiArIHMxICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XG4gICAgaWYgKCFtKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsIG9SdWxlLmZvbGxvd3MsIG9SdWxlLmtleSk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XG4gICAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBvRXh0cmFjdGVkQ29udGV4dCA9IGV4dHJhY3RBcmdzTWFwKG0sIG9SdWxlLmFyZ3NNYXApO1xuICAgIGRlYnVnbG9nKFwiZXh0cmFjdGVkIGFyZ3MgXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZS5hcmdzTWFwKSk7XG4gICAgZGVidWdsb2coXCJtYXRjaCBcIiArIEpTT04uc3RyaW5naWZ5KG0pKTtcbiAgICBkZWJ1Z2xvZyhcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob0V4dHJhY3RlZENvbnRleHQpKTtcbiAgICB2YXIgcmVzID0gQW55T2JqZWN0LmFzc2lnbih7fSwgb1J1bGUuZm9sbG93cyk7XG4gICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9FeHRyYWN0ZWRDb250ZXh0KTtcbiAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgY29udGV4dCk7XG4gICAgaWYgKG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVzW3NLZXldID0gb0V4dHJhY3RlZENvbnRleHRbc0tleV07XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XG4gICAgICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvUnVsZS5mb2xsb3dzKTtcbiAgICAgICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9FeHRyYWN0ZWRDb250ZXh0KTtcbiAgICB9XG4gICAgT2JqZWN0LmZyZWV6ZShyZXMpO1xuICAgIGRlYnVnbG9nKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5tYXRjaFJlZ0V4cCA9IG1hdGNoUmVnRXhwO1xuZnVuY3Rpb24gc29ydEJ5V2VpZ2h0KHNLZXksIG9Db250ZXh0QSwgb0NvbnRleHRCKSB7XG4gICAgZGVidWdsb2coJ3NvcnRpbmc6ICcgKyBzS2V5ICsgJ2ludm9rZWQgd2l0aFxcbiAxOicgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEEsIHVuZGVmaW5lZCwgMikgK1xuICAgICAgICBcIiB2cyBcXG4gMjpcIiArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QiwgdW5kZWZpbmVkLCAyKSk7XG4gICAgdmFyIHJhbmtpbmdBID0gcGFyc2VGbG9hdChvQ29udGV4dEFbXCJfcmFua2luZ1wiXSB8fCBcIjFcIik7XG4gICAgdmFyIHJhbmtpbmdCID0gcGFyc2VGbG9hdChvQ29udGV4dEJbXCJfcmFua2luZ1wiXSB8fCBcIjFcIik7XG4gICAgaWYgKHJhbmtpbmdBICE9PSByYW5raW5nQikge1xuICAgICAgICBkZWJ1Z2xvZyhcIiByYW5raW4gZGVsdGFcIiArIDEwMCAqIChyYW5raW5nQiAtIHJhbmtpbmdBKSk7XG4gICAgICAgIHJldHVybiAxMDAgKiAocmFua2luZ0IgLSByYW5raW5nQSk7XG4gICAgfVxuICAgIHZhciB3ZWlnaHRBID0gb0NvbnRleHRBW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdW3NLZXldIHx8IDA7XG4gICAgdmFyIHdlaWdodEIgPSBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QltcIl93ZWlnaHRcIl1bc0tleV0gfHwgMDtcbiAgICByZXR1cm4gKyh3ZWlnaHRBIC0gd2VpZ2h0Qik7XG59XG5leHBvcnRzLnNvcnRCeVdlaWdodCA9IHNvcnRCeVdlaWdodDtcbi8vIFdvcmQsIFN5bm9ueW0sIFJlZ2V4cCAvIEV4dHJhY3Rpb25SdWxlXG5mdW5jdGlvbiBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgb1J1bGVzLCBvcHRpb25zKSB7XG4gICAgdmFyIHNLZXkgPSBvUnVsZXNbMF0ua2V5O1xuICAgIC8vIGNoZWNrIHRoYXQgcnVsZVxuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIC8vIGNoZWNrIGNvbnNpc3RlbmN5XG4gICAgICAgIG9SdWxlcy5ldmVyeShmdW5jdGlvbiAoaVJ1bGUpIHtcbiAgICAgICAgICAgIGlmIChpUnVsZS5rZXkgIT09IHNLZXkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbmhvbW9nZW5vdXMga2V5cyBpbiBydWxlcywgZXhwZWN0ZWQgXCIgKyBzS2V5ICsgXCIgd2FzIFwiICsgSlNPTi5zdHJpbmdpZnkoaVJ1bGUpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8gbG9vayBmb3IgcnVsZXMgd2hpY2ggbWF0Y2hcbiAgICB2YXIgcmVzID0gb1J1bGVzLm1hcChmdW5jdGlvbiAob1J1bGUpIHtcbiAgICAgICAgLy8gaXMgdGhpcyBydWxlIGFwcGxpY2FibGVcbiAgICAgICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlIDAgLyogV09SRCAqLzpcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2hXb3JkKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKTtcbiAgICAgICAgICAgIGNhc2UgMSAvKiBSRUdFWFAgKi86XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hdGNoUmVnRXhwKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0pLmZpbHRlcihmdW5jdGlvbiAob3Jlcykge1xuICAgICAgICByZXR1cm4gISFvcmVzO1xuICAgIH0pLnNvcnQoc29ydEJ5V2VpZ2h0LmJpbmQodGhpcywgc0tleSkpO1xuICAgIHJldHVybiByZXM7XG4gICAgLy8gT2JqZWN0LmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgLy8gfSk7XG59XG5leHBvcnRzLmF1Z21lbnRDb250ZXh0MSA9IGF1Z21lbnRDb250ZXh0MTtcbmZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0KGNvbnRleHQsIGFSdWxlcykge1xuICAgIHZhciBvcHRpb25zMSA9IHtcbiAgICAgICAgbWF0Y2hvdGhlcnM6IHRydWUsXG4gICAgICAgIG92ZXJyaWRlOiBmYWxzZVxuICAgIH07XG4gICAgdmFyIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMSk7XG4gICAgaWYgKGFSZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHZhciBvcHRpb25zMiA9IHtcbiAgICAgICAgICAgIG1hdGNob3RoZXJzOiBmYWxzZSxcbiAgICAgICAgICAgIG92ZXJyaWRlOiB0cnVlXG4gICAgICAgIH07XG4gICAgICAgIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMik7XG4gICAgfVxuICAgIHJldHVybiBhUmVzO1xufVxuZXhwb3J0cy5hdWdtZW50Q29udGV4dCA9IGF1Z21lbnRDb250ZXh0O1xuZnVuY3Rpb24gaW5zZXJ0T3JkZXJlZChyZXN1bHQsIGlJbnNlcnRlZE1lbWJlciwgbGltaXQpIHtcbiAgICAvLyBUT0RPOiB1c2Ugc29tZSB3ZWlnaHRcbiAgICBpZiAocmVzdWx0Lmxlbmd0aCA8IGxpbWl0KSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKGlJbnNlcnRlZE1lbWJlcik7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5leHBvcnRzLmluc2VydE9yZGVyZWQgPSBpbnNlcnRPcmRlcmVkO1xuZnVuY3Rpb24gdGFrZVRvcE4oYXJyKSB7XG4gICAgdmFyIHUgPSBhcnIuZmlsdGVyKGZ1bmN0aW9uIChpbm5lckFycikgeyByZXR1cm4gaW5uZXJBcnIubGVuZ3RoID4gMDsgfSk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIC8vIHNoaWZ0IG91dCB0aGUgdG9wIG9uZXNcbiAgICB1ID0gdS5tYXAoZnVuY3Rpb24gKGlBcnIpIHtcbiAgICAgICAgdmFyIHRvcCA9IGlBcnIuc2hpZnQoKTtcbiAgICAgICAgcmVzID0gaW5zZXJ0T3JkZXJlZChyZXMsIHRvcCwgNSk7XG4gICAgICAgIHJldHVybiBpQXJyO1xuICAgIH0pLmZpbHRlcihmdW5jdGlvbiAoaW5uZXJBcnIpIHsgcmV0dXJuIGlubmVyQXJyLmxlbmd0aCA+IDA7IH0pO1xuICAgIC8vIGFzIEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMudGFrZVRvcE4gPSB0YWtlVG9wTjtcbnZhciBpbnB1dEZpbHRlclJ1bGVzID0gcmVxdWlyZSgnLi9pbnB1dEZpbHRlclJ1bGVzJyk7XG52YXIgcm07XG5mdW5jdGlvbiBnZXRSTU9uY2UoKSB7XG4gICAgaWYgKCFybSkge1xuICAgICAgICBybSA9IGlucHV0RmlsdGVyUnVsZXMuZ2V0UnVsZU1hcCgpO1xuICAgIH1cbiAgICByZXR1cm4gcm07XG59XG5mdW5jdGlvbiBhcHBseVJ1bGVzKGNvbnRleHQpIHtcbiAgICB2YXIgYmVzdE4gPSBbY29udGV4dF07XG4gICAgaW5wdXRGaWx0ZXJSdWxlcy5vS2V5T3JkZXIuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xuICAgICAgICB2YXIgYmVzdE5leHQgPSBbXTtcbiAgICAgICAgYmVzdE4uZm9yRWFjaChmdW5jdGlvbiAob0NvbnRleHQpIHtcbiAgICAgICAgICAgIGlmIChvQ29udGV4dFtzS2V5XSkge1xuICAgICAgICAgICAgICAgIGRlYnVnbG9nKCcqKiBhcHBseWluZyBydWxlcyBmb3IgJyArIHNLZXkpO1xuICAgICAgICAgICAgICAgIHZhciByZXMgPSBhdWdtZW50Q29udGV4dChvQ29udGV4dCwgZ2V0Uk1PbmNlKClbc0tleV0gfHwgW10pO1xuICAgICAgICAgICAgICAgIGRlYnVnbG9nKCcqKiByZXN1bHQgZm9yICcgKyBzS2V5ICsgJyA9ICcgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgICAgICAgICAgIGJlc3ROZXh0LnB1c2gocmVzIHx8IFtdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIHJ1bGUgbm90IHJlbGV2YW50XG4gICAgICAgICAgICAgICAgYmVzdE5leHQucHVzaChbb0NvbnRleHRdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGJlc3ROID0gdGFrZVRvcE4oYmVzdE5leHQpO1xuICAgIH0pO1xuICAgIHJldHVybiBiZXN0Tjtcbn1cbmV4cG9ydHMuYXBwbHlSdWxlcyA9IGFwcGx5UnVsZXM7XG5mdW5jdGlvbiBhcHBseVJ1bGVzUGlja0ZpcnN0KGNvbnRleHQpIHtcbiAgICB2YXIgciA9IGFwcGx5UnVsZXMoY29udGV4dCk7XG4gICAgcmV0dXJuIHIgJiYgclswXTtcbn1cbmV4cG9ydHMuYXBwbHlSdWxlc1BpY2tGaXJzdCA9IGFwcGx5UnVsZXNQaWNrRmlyc3Q7XG4vKipcbiAqIERlY2lkZSB3aGV0aGVyIHRvIHJlcXVlcnkgZm9yIGEgY29udGV0XG4gKi9cbmZ1bmN0aW9uIGRlY2lkZU9uUmVRdWVyeShjb250ZXh0KSB7XG4gICAgcmV0dXJuIFtdO1xufVxuZXhwb3J0cy5kZWNpZGVPblJlUXVlcnkgPSBkZWNpZGVPblJlUXVlcnk7XG4iLCIvKipcclxuICogdGhlIGlucHV0IGZpbHRlciBzdGFnZSBwcmVwcm9jZXNzZXMgYSBjdXJyZW50IGNvbnRleHRcclxuICpcclxuICogSXQgYSkgY29tYmluZXMgbXVsdGktc2VnbWVudCBhcmd1bWVudHMgaW50byBvbmUgY29udGV4dCBtZW1iZXJzXHJcbiAqIEl0IGIpIGF0dGVtcHRzIHRvIGF1Z21lbnQgdGhlIGNvbnRleHQgYnkgYWRkaXRpb25hbCBxdWFsaWZpY2F0aW9uc1xyXG4gKiAgICAgICAgICAgKE1pZCB0ZXJtIGdlbmVyYXRpbmcgQWx0ZXJuYXRpdmVzLCBlLmcuXHJcbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiB1bml0IHRlc3Q/XHJcbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiBzb3VyY2UgP1xyXG4gKiAgICAgICAgICAgKVxyXG4gKiAgU2ltcGxlIHJ1bGVzIGxpa2UgIEludGVudFxyXG4gKlxyXG4gKlxyXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5pbnB1dEZpbHRlclxyXG4gKiBAZmlsZSBpbnB1dEZpbHRlci50c1xyXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXHJcbiAqL1xyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vbGliL25vZGUtNC5kLnRzXCIgLz5cclxuaW1wb3J0ICogYXMgZGlzdGFuY2UgZnJvbSAnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluJztcclxuXHJcbmltcG9ydCAqIGFzIExvZ2dlciBmcm9tICcuLi91dGlscy9sb2dnZXInXHJcblxyXG5jb25zdCBsb2dnZXIgPSBMb2dnZXIubG9nZ2VyKCdpbnB1dEZpbHRlcicpO1xyXG5cclxuaW1wb3J0ICogYXMgZGVidWcgZnJvbSAnZGVidWcnO1xyXG52YXIgZGVidWdwZXJmID0gZGVidWcoJ3BlcmYnKTtcclxuXHJcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gJy4uL3V0aWxzL3V0aWxzJztcclxuXHJcblxyXG5pbXBvcnQgKiBhcyBBbGdvbCBmcm9tICcuL2FsZ29sJztcclxuXHJcbmltcG9ydCAqIGFzIElNYXRjaCBmcm9tICcuL2lmbWF0Y2gnO1xyXG5cclxuaW1wb3J0ICogYXMgYnJlYWtkb3duIGZyb20gJy4vYnJlYWtkb3duJztcclxuXHJcbmNvbnN0IEFueU9iamVjdCA9IDxhbnk+T2JqZWN0O1xyXG5cclxuY29uc3QgZGVidWdsb2cgPSBkZWJ1ZygnaW5wdXRGaWx0ZXInKVxyXG5cclxuaW1wb3J0ICogYXMgbWF0Y2hkYXRhIGZyb20gJy4vbWF0Y2hkYXRhJztcclxudmFyIG9Vbml0VGVzdHMgPSBtYXRjaGRhdGEub1VuaXRUZXN0c1xyXG5cclxuLyoqXHJcbiAqIEBwYXJhbSBzVGV4dCB7c3RyaW5nfSB0aGUgdGV4dCB0byBtYXRjaCB0byBOYXZUYXJnZXRSZXNvbHV0aW9uXHJcbiAqIEBwYXJhbSBzVGV4dDIge3N0cmluZ30gdGhlIHF1ZXJ5IHRleHQsIGUuZy4gTmF2VGFyZ2V0XHJcbiAqXHJcbiAqIEByZXR1cm4gdGhlIGRpc3RhbmNlLCBub3RlIHRoYXQgaXMgaXMgKm5vdCogc3ltbWV0cmljIVxyXG4gKi9cclxuZnVuY3Rpb24gY2FsY0Rpc3RhbmNlKHNUZXh0MTogc3RyaW5nLCBzVGV4dDI6IHN0cmluZyk6IG51bWJlciB7XHJcbiAgLy8gY29uc29sZS5sb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxyXG4gICBpZigoKHNUZXh0MS5sZW5ndGggLSBzVGV4dDIubGVuZ3RoKSA+IDgpXHJcbiAgICB8fCAoc1RleHQyLmxlbmd0aCA+IDEuNSAqIHNUZXh0MS5sZW5ndGggKVxyXG4gICAgfHwgKHNUZXh0Mi5sZW5ndGggPCAoc1RleHQxLmxlbmd0aC8yKSkgKSB7XHJcbiAgICByZXR1cm4gNTAwMDA7XHJcbiAgfVxyXG4gIHZhciBhMCA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCksIHNUZXh0MilcclxuICBpZihhMCAqIDUwID4gMTUgKiBzVGV4dDIubGVuZ3RoKSB7XHJcbiAgICAgIHJldHVybiA1MDAwMDtcclxuICB9XHJcbiAgdmFyIGEgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEsIHNUZXh0MilcclxuICByZXR1cm4gYTAgKiA1MDAgLyBzVGV4dDIubGVuZ3RoICsgYVxyXG59XHJcblxyXG5pbXBvcnQgKiBhcyBJRk1hdGNoIGZyb20gJy4uL21hdGNoL2lmbWF0Y2gnO1xyXG5cclxudHlwZSBJUnVsZSA9IElGTWF0Y2guSVJ1bGVcclxuXHJcblxyXG5pbnRlcmZhY2UgSU1hdGNoT3B0aW9ucyB7XHJcbiAgbWF0Y2hvdGhlcnM/OiBib29sZWFuLFxyXG4gIGF1Z21lbnQ/OiBib29sZWFuLFxyXG4gIG92ZXJyaWRlPzogYm9vbGVhblxyXG59XHJcblxyXG5pbnRlcmZhY2UgSU1hdGNoQ291bnQge1xyXG4gIGVxdWFsOiBudW1iZXJcclxuICBkaWZmZXJlbnQ6IG51bWJlclxyXG4gIHNwdXJpb3VzUjogbnVtYmVyXHJcbiAgc3B1cmlvdXNMOiBudW1iZXJcclxufVxyXG5cclxudHlwZSBFbnVtUnVsZVR5cGUgPSBJRk1hdGNoLkVudW1SdWxlVHlwZVxyXG5cclxuY29uc3QgbGV2ZW5DdXRvZmYgPSBBbGdvbC5DdXRvZmZfTGV2ZW5TaHRlaW47XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbGV2ZW5QZW5hbHR5KGk6IG51bWJlcik6IG51bWJlciB7XHJcbiAgLy8gMC0+IDFcclxuICAvLyAxIC0+IDAuMVxyXG4gIC8vIDE1MCAtPiAgMC44XHJcbiAgaWYgKGkgPT09IDApIHtcclxuICAgIHJldHVybiAxO1xyXG4gIH1cclxuICAvLyByZXZlcnNlIG1heSBiZSBiZXR0ZXIgdGhhbiBsaW5lYXJcclxuICByZXR1cm4gMSArIGkgKiAoMC44IC0gMSkgLyAxNTBcclxufVxyXG5cclxuZnVuY3Rpb24gbm9uUHJpdmF0ZUtleXMob0EpIHtcclxuICByZXR1cm4gT2JqZWN0LmtleXMob0EpLmZpbHRlcihrZXkgPT4ge1xyXG4gICAgcmV0dXJuIGtleVswXSAhPT0gJ18nO1xyXG4gIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY291bnRBaW5CKG9BLCBvQiwgZm5Db21wYXJlLCBhS2V5SWdub3JlPyk6IG51bWJlciB7XHJcbiAgYUtleUlnbm9yZSA9IEFycmF5LmlzQXJyYXkoYUtleUlnbm9yZSkgPyBhS2V5SWdub3JlIDpcclxuICAgIHR5cGVvZiBhS2V5SWdub3JlID09PSBcInN0cmluZ1wiID8gW2FLZXlJZ25vcmVdIDogW107XHJcbiAgZm5Db21wYXJlID0gZm5Db21wYXJlIHx8IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH1cclxuICByZXR1cm4gbm9uUHJpdmF0ZUtleXMob0EpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xyXG4gIH0pLlxyXG4gICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xyXG4gICAgICAgIHByZXYgPSBwcmV2ICsgKGZuQ29tcGFyZShvQVtrZXldLCBvQltrZXldLCBrZXkpID8gMSA6IDApXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHByZXZcclxuICAgIH0sIDApXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzcHVyaW91c0Fub3RJbkIob0EsIG9CLCBhS2V5SWdub3JlPykge1xyXG4gIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gYUtleUlnbm9yZSA6XHJcbiAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xyXG4gIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcclxuICAgIHJldHVybiBhS2V5SWdub3JlLmluZGV4T2Yoa2V5KSA8IDA7XHJcbiAgfSkuXHJcbiAgICByZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xyXG4gICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xyXG4gICAgICAgIHByZXYgPSBwcmV2ICsgMVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBwcmV2XHJcbiAgICB9LCAwKVxyXG59XHJcblxyXG5mdW5jdGlvbiBsb3dlckNhc2Uobykge1xyXG4gIGlmICh0eXBlb2YgbyA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgcmV0dXJuIG8udG9Mb3dlckNhc2UoKVxyXG4gIH1cclxuICByZXR1cm4gb1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY29tcGFyZUNvbnRleHQob0EsIG9CLCBhS2V5SWdub3JlPykge1xyXG4gIHZhciBlcXVhbCA9IGNvdW50QWluQihvQSwgb0IsIGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBsb3dlckNhc2UoYSkgPT09IGxvd2VyQ2FzZShiKTsgfSwgYUtleUlnbm9yZSk7XHJcbiAgdmFyIGRpZmZlcmVudCA9IGNvdW50QWluQihvQSwgb0IsIGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBsb3dlckNhc2UoYSkgIT09IGxvd2VyQ2FzZShiKTsgfSwgYUtleUlnbm9yZSk7XHJcbiAgdmFyIHNwdXJpb3VzTCA9IHNwdXJpb3VzQW5vdEluQihvQSwgb0IsIGFLZXlJZ25vcmUpXHJcbiAgdmFyIHNwdXJpb3VzUiA9IHNwdXJpb3VzQW5vdEluQihvQiwgb0EsIGFLZXlJZ25vcmUpXHJcbiAgcmV0dXJuIHtcclxuICAgIGVxdWFsOiBlcXVhbCxcclxuICAgIGRpZmZlcmVudDogZGlmZmVyZW50LFxyXG4gICAgc3B1cmlvdXNMOiBzcHVyaW91c0wsXHJcbiAgICBzcHVyaW91c1I6IHNwdXJpb3VzUlxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gc29ydEJ5UmFuayhhOiBJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZywgYjogSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmcpOiBudW1iZXIge1xyXG4gIHZhciByID0gLSgoYS5fcmFua2luZyB8fCAxLjApIC0gKGIuX3JhbmtpbmcgfHwgMS4wKSk7XHJcbiAgaWYgKHIpIHtcclxuICAgIHJldHVybiByO1xyXG4gIH1cclxuICBpZiAoYS5jYXRlZ29yeSAmJiBiLmNhdGVnb3J5KSB7XHJcbiAgICByID0gYS5jYXRlZ29yeS5sb2NhbGVDb21wYXJlKGIuY2F0ZWdvcnkpO1xyXG4gICAgaWYgKHIpIHtcclxuICAgICAgcmV0dXJuIHI7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGlmIChhLm1hdGNoZWRTdHJpbmcgJiYgYi5tYXRjaGVkU3RyaW5nKSB7XHJcbiAgICByID0gYS5tYXRjaGVkU3RyaW5nLmxvY2FsZUNvbXBhcmUoYi5tYXRjaGVkU3RyaW5nKTtcclxuICAgIGlmIChyKSB7XHJcbiAgICAgIHJldHVybiByO1xyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gMDtcclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjYXRlZ29yaXplU3RyaW5nKHN0cmluZzogc3RyaW5nLCBleGFjdDogYm9vbGVhbiwgb1J1bGVzOiBBcnJheTxJTWF0Y2gubVJ1bGU+KTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IHtcclxuICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXHJcbiAgaWYoZGVidWdsb2cuZW5hYmxlZCApICB7XHJcbiAgICBkZWJ1Z2xvZyhcInJ1bGVzIDogXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZXMpKTtcclxuICB9XHJcbiAgdmFyIGxjU3RyaW5nID0gc3RyaW5nLnRvTG93ZXJDYXNlKCk7XHJcbiAgdmFyIHJlczogQXJyYXk8SU1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4gPSBbXVxyXG4gIG9SdWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChvUnVsZSkge1xyXG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgICAgZGVidWdsb2coJ2F0dGVtcHRpbmcgdG8gbWF0Y2ggcnVsZSAnICsgSlNPTi5zdHJpbmdpZnkob1J1bGUpICsgXCIgdG8gc3RyaW5nIFxcXCJcIiArIHN0cmluZyArIFwiXFxcIlwiKTtcclxuICAgIH1cclxuICAgIHN3aXRjaCAob1J1bGUudHlwZSkge1xyXG4gICAgICBjYXNlIElGTWF0Y2guRW51bVJ1bGVUeXBlLldPUkQ6XHJcbiAgICAgICAgaWYoIW9SdWxlLmxvd2VyY2FzZXdvcmQpIHtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncnVsZSB3aXRob3V0IGEgbG93ZXJjYXNlIHZhcmlhbnQnICsgSlNPTi5zdHJpbmdpZnkob1J1bGUsIHVuZGVmaW5lZCwgMikpO1xyXG4gICAgICAgICB9O1xyXG4gICAgICAgIGlmIChleGFjdCAmJiBvUnVsZS53b3JkID09PSBzdHJpbmcgfHwgb1J1bGUubG93ZXJjYXNld29yZCA9PT0gbGNTdHJpbmcpIHtcclxuICAgICAgICAgIHJlcy5wdXNoKHtcclxuICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCFleGFjdCAmJiAhb1J1bGUuZXhhY3RPbmx5KSB7XHJcbiAgICAgICAgICB2YXIgbGV2ZW5tYXRjaCA9IGNhbGNEaXN0YW5jZShvUnVsZS5sb3dlcmNhc2V3b3JkLCBsY1N0cmluZylcclxuICAgICAgICAgIGlmIChsZXZlbm1hdGNoIDwgbGV2ZW5DdXRvZmYpIHtcclxuICAgICAgICAgICAgcmVzLnB1c2goe1xyXG4gICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxyXG4gICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLndvcmQsXHJcbiAgICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxyXG4gICAgICAgICAgICAgIF9yYW5raW5nOiAob1J1bGUuX3JhbmtpbmcgfHwgMS4wKSAqIGxldmVuUGVuYWx0eShsZXZlbm1hdGNoKSxcclxuICAgICAgICAgICAgICBsZXZlbm1hdGNoOiBsZXZlbm1hdGNoXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIElGTWF0Y2guRW51bVJ1bGVUeXBlLlJFR0VYUDoge1xyXG4gICAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAgICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShcIiBoZXJlIHJlZ2V4cFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUsIHVuZGVmaW5lZCwgMikpKVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgbSA9IG9SdWxlLnJlZ2V4cC5leGVjKHN0cmluZylcclxuICAgICAgICBpZiAobSkge1xyXG4gICAgICAgICAgcmVzLnB1c2goe1xyXG4gICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogKG9SdWxlLm1hdGNoSW5kZXggIT09IHVuZGVmaW5lZCAmJiBtW29SdWxlLm1hdGNoSW5kZXhdKSB8fCBzdHJpbmcsXHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmtub3duIHR5cGVcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKVxyXG4gICAgfVxyXG4gIH0pO1xyXG4gIHJlcy5zb3J0KHNvcnRCeVJhbmspO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuLyoqXHJcbiAqXHJcbiAqIE9wdGlvbnMgbWF5IGJlIHtcclxuICogbWF0Y2hvdGhlcnMgOiB0cnVlLCAgPT4gb25seSBydWxlcyB3aGVyZSBhbGwgb3RoZXJzIG1hdGNoIGFyZSBjb25zaWRlcmVkXHJcbiAqIGF1Z21lbnQgOiB0cnVlLFxyXG4gKiBvdmVycmlkZSA6IHRydWUgfSAgPT5cclxuICpcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFdvcmQob1J1bGU6IElSdWxlLCBjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQsIG9wdGlvbnM/OiBJTWF0Y2hPcHRpb25zKSB7XHJcbiAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKVxyXG4gIHZhciBzMiA9IG9SdWxlLndvcmQudG9Mb3dlckNhc2UoKTtcclxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxyXG4gIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsIG9SdWxlLmZvbGxvd3MsIG9SdWxlLmtleSlcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xyXG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcclxuICBpZiAob3B0aW9ucy5tYXRjaG90aGVycyAmJiAoZGVsdGEuZGlmZmVyZW50ID4gMCkpIHtcclxuICAgIHJldHVybiB1bmRlZmluZWRcclxuICB9XHJcbiAgdmFyIGM6IG51bWJlciA9IGNhbGNEaXN0YW5jZShzMiwgczEpO1xyXG4gIGRlYnVnbG9nKFwiIHMxIDw+IHMyIFwiICsgczEgKyBcIjw+XCIgKyBzMiArIFwiICA9PjogXCIgKyBjKTtcclxuICBpZiAoYyA8IDE1MCkge1xyXG4gICAgdmFyIHJlcyA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpIGFzIGFueTtcclxuICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcclxuICAgIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XHJcbiAgICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvUnVsZS5mb2xsb3dzKTtcclxuICAgIH1cclxuICAgIC8vIGZvcmNlIGtleSBwcm9wZXJ0eVxyXG4gICAgLy8gY29uc29sZS5sb2coJyBvYmplY3RjYXRlZ29yeScsIHJlc1snc3lzdGVtT2JqZWN0Q2F0ZWdvcnknXSk7XHJcbiAgICByZXNbb1J1bGUua2V5XSA9IG9SdWxlLmZvbGxvd3Nbb1J1bGUua2V5XSB8fCByZXNbb1J1bGUua2V5XTtcclxuICAgIHJlcy5fd2VpZ2h0ID0gQW55T2JqZWN0LmFzc2lnbih7fSwgcmVzLl93ZWlnaHQpO1xyXG4gICAgcmVzLl93ZWlnaHRbb1J1bGUua2V5XSA9IGM7XHJcbiAgICBPYmplY3QuZnJlZXplKHJlcyk7XHJcbiAgICBkZWJ1Z2xvZygnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSk7XHJcbiAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuICByZXR1cm4gdW5kZWZpbmVkO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEFyZ3NNYXAobWF0Y2g6IEFycmF5PHN0cmluZz4sIGFyZ3NNYXA6IHsgW2tleTogbnVtYmVyXTogc3RyaW5nIH0pOiBJRk1hdGNoLmNvbnRleHQge1xyXG4gIHZhciByZXMgPSB7fSBhcyBJRk1hdGNoLmNvbnRleHQ7XHJcbiAgaWYgKCFhcmdzTWFwKSB7XHJcbiAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuICBPYmplY3Qua2V5cyhhcmdzTWFwKS5mb3JFYWNoKGZ1bmN0aW9uIChpS2V5KSB7XHJcbiAgICB2YXIgdmFsdWUgPSBtYXRjaFtpS2V5XVxyXG4gICAgdmFyIGtleSA9IGFyZ3NNYXBbaUtleV07XHJcbiAgICBpZiAoKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikgJiYgdmFsdWUubGVuZ3RoID4gMCkge1xyXG4gICAgICByZXNba2V5XSA9IHZhbHVlXHJcbiAgICB9XHJcbiAgfVxyXG4gICk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IFJhbmtXb3JkID0ge1xyXG4gIGhhc0Fib3ZlOiBmdW5jdGlvbiAobHN0OiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4sIGJvcmRlcjogbnVtYmVyKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gIWxzdC5ldmVyeShmdW5jdGlvbiAob01lbWJlcikge1xyXG4gICAgICByZXR1cm4gKG9NZW1iZXIuX3JhbmtpbmcgPCBib3JkZXIpO1xyXG4gICAgfSk7XHJcbiAgfSxcclxuXHJcbiAgdGFrZUZpcnN0TjogZnVuY3Rpb24gKGxzdDogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+LCBuOiBudW1iZXIpOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4ge1xyXG4gICAgcmV0dXJuIGxzdC5maWx0ZXIoZnVuY3Rpb24gKG9NZW1iZXIsIGlJbmRleCkge1xyXG4gICAgICB2YXIgbGFzdFJhbmtpbmcgPSAxLjA7XHJcbiAgICAgIGlmICgoaUluZGV4IDwgbikgfHwgb01lbWJlci5fcmFua2luZyA9PT0gbGFzdFJhbmtpbmcpIHtcclxuICAgICAgICBsYXN0UmFua2luZyA9IG9NZW1iZXIuX3Jhbmtpbmc7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfSk7XHJcbiAgfSxcclxuICB0YWtlQWJvdmU6IGZ1bmN0aW9uIChsc3Q6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiwgYm9yZGVyOiBudW1iZXIpOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4ge1xyXG4gICAgcmV0dXJuIGxzdC5maWx0ZXIoZnVuY3Rpb24gKG9NZW1iZXIpIHtcclxuICAgICAgcmV0dXJuIChvTWVtYmVyLl9yYW5raW5nID49IGJvcmRlcik7XHJcbiAgICB9KTtcclxuICB9XHJcbn07XHJcblxyXG4vKlxyXG52YXIgZXhhY3RMZW4gPSAwO1xyXG52YXIgZnV6enlMZW4gPSAwO1xyXG52YXIgZnV6enlDbnQgPSAwO1xyXG52YXIgZXhhY3RDbnQgPSAwO1xyXG52YXIgdG90YWxDbnQgPSAwO1xyXG52YXIgdG90YWxMZW4gPSAwO1xyXG52YXIgcmV0YWluZWRDbnQgPSAwO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlc2V0Q250KCkge1xyXG4gIGV4YWN0TGVuID0gMDtcclxuICBmdXp6eUxlbiA9IDA7XHJcbiAgZnV6enlDbnQgPSAwO1xyXG4gIGV4YWN0Q250ID0gMDtcclxuICB0b3RhbENudCA9IDA7XHJcbiAgdG90YWxMZW4gPSAwO1xyXG4gIHJldGFpbmVkQ250ID0gMDtcclxufVxyXG4qL1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNhdGVnb3JpemVXb3JkV2l0aFJhbmtDdXRvZmYoc1dvcmRHcm91cDogc3RyaW5nLCBhUnVsZXM6IEFycmF5PElGTWF0Y2gubVJ1bGU+KTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IHtcclxuICB2YXIgc2Vlbkl0ID0gY2F0ZWdvcml6ZVN0cmluZyhzV29yZEdyb3VwLCB0cnVlLCBhUnVsZXMpO1xyXG4gIC8vdG90YWxDbnQgKz0gMTtcclxuIC8vIGV4YWN0TGVuICs9IHNlZW5JdC5sZW5ndGg7XHJcbiAgaWYgKFJhbmtXb3JkLmhhc0Fib3ZlKHNlZW5JdCwgMC44KSkge1xyXG4gICAgc2Vlbkl0ID0gUmFua1dvcmQudGFrZUFib3ZlKHNlZW5JdCwgMC44KTtcclxuICAgLy8gZXhhY3RDbnQgKz0gMTtcclxuICB9IGVsc2Uge1xyXG4gICAgc2Vlbkl0ID0gY2F0ZWdvcml6ZVN0cmluZyhzV29yZEdyb3VwLCBmYWxzZSwgYVJ1bGVzKTtcclxuICAvLyAgZnV6enlMZW4gKz0gc2Vlbkl0Lmxlbmd0aDtcclxuICAvLyAgZnV6enlDbnQgKz0gMTtcclxuICB9XHJcbiAvLyB0b3RhbExlbiArPSBzZWVuSXQubGVuZ3RoO1xyXG4gIHNlZW5JdCA9IFJhbmtXb3JkLnRha2VGaXJzdE4oc2Vlbkl0LCBBbGdvbC5Ub3BfTl9Xb3JkQ2F0ZWdvcml6YXRpb25zKTtcclxuIC8vIHJldGFpbmVkQ250ICs9IHNlZW5JdC5sZW5ndGg7XHJcbiAgcmV0dXJuIHNlZW5JdDtcclxufVxyXG5cclxuLypcclxuZXhwb3J0IGZ1bmN0aW9uIGR1bXBDbnQoKSB7XHJcbiAgY29uc29sZS5sb2coYFxyXG5leGFjdExlbiA9ICR7ZXhhY3RMZW59O1xyXG5leGFjdENudCA9ICR7ZXhhY3RDbnR9O1xyXG5mdXp6eUxlbiA9ICR7ZnV6enlMZW59O1xyXG5mdXp6eUNudCA9ICR7ZnV6enlDbnR9O1xyXG50b3RhbENudCA9ICR7dG90YWxDbnR9O1xyXG50b3RhbExlbiA9ICR7dG90YWxMZW59O1xyXG5yZXRhaW5lZExlbiA9ICR7cmV0YWluZWRDbnR9O1xyXG4gIGApO1xyXG59XHJcbiovXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkU2VudGVuY2Uob1NlbnRlbmNlOiBJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdW10pOiBib29sZWFuIHtcclxuICByZXR1cm4gb1NlbnRlbmNlLmV2ZXJ5KGZ1bmN0aW9uIChvV29yZEdyb3VwKSB7XHJcbiAgICByZXR1cm4gKG9Xb3JkR3JvdXAubGVuZ3RoID4gMCk7XHJcbiAgfSk7XHJcbn1cclxuXHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZChhcnI6IElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11bXVtdKTogSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXVtdW10ge1xyXG4gIHJldHVybiBhcnIuZmlsdGVyKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcclxuICAgIHJldHVybiBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWRTZW50ZW5jZShvU2VudGVuY2UpO1xyXG4gIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZUFXb3JkKHNXb3JkR3JvdXA6IHN0cmluZywgYVJ1bGVzOiBBcnJheTxJTWF0Y2gubVJ1bGU+LCBzU3RyaW5nOiBzdHJpbmcsIHdvcmRzOiB7IFtrZXk6IHN0cmluZ106IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiB9KSB7XHJcbiAgdmFyIHNlZW5JdCA9IHdvcmRzW3NXb3JkR3JvdXBdO1xyXG4gIGlmIChzZWVuSXQgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgc2Vlbkl0ID0gY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZihzV29yZEdyb3VwLCBhUnVsZXMpO1xyXG4gICAgdXRpbHMuZGVlcEZyZWV6ZShzZWVuSXQpO1xyXG4gICAgaWYgKHNlZW5JdCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHdvcmRzW3NXb3JkR3JvdXBdID0gc2Vlbkl0O1xyXG4gICAgfVxyXG4gICAgd29yZHNbc1dvcmRHcm91cF0gPSBzZWVuSXQ7XHJcbiAgfVxyXG4gIGlmICghc2Vlbkl0IHx8IHNlZW5JdC5sZW5ndGggPT09IDApIHtcclxuICAgIGxvZ2dlcihcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIFxcXCJcIiArIHNXb3JkR3JvdXAgKyBcIlxcXCIgaW4gc2VudGVuY2UgXFxcIlwiXHJcbiAgICAgICsgc1N0cmluZyArIFwiXFxcIlwiKTtcclxuICAgIGlmIChzV29yZEdyb3VwLmluZGV4T2YoXCIgXCIpIDw9IDApIHtcclxuICAgICAgZGVidWdsb2coXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBwcmltaXRpdmUgKCEpXCIgKyBzV29yZEdyb3VwKTtcclxuICAgIH1cclxuICAgIGRlYnVnbG9nKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgXCIgKyBzV29yZEdyb3VwKTtcclxuICAgIGlmICghc2Vlbkl0KSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGluZyBlbXRweSBsaXN0LCBub3QgdW5kZWZpbmVkIGZvciBcXFwiXCIgKyBzV29yZEdyb3VwICsgXCJcXFwiXCIpXHJcbiAgICB9XHJcbiAgICB3b3Jkc1tzV29yZEdyb3VwXSA9IFtdXHJcbiAgICByZXR1cm4gW107XHJcbiAgfVxyXG4gIHJldHVybiB1dGlscy5jbG9uZURlZXAoc2Vlbkl0KTtcclxufVxyXG5cclxuXHJcbi8qKlxyXG4gKiBHaXZlbiBhICBzdHJpbmcsIGJyZWFrIGl0IGRvd24gaW50byBjb21wb25lbnRzLFxyXG4gKiBbWydBJywgJ0InXSwgWydBIEInXV1cclxuICpcclxuICogdGhlbiBjYXRlZ29yaXplV29yZHNcclxuICogcmV0dXJuaW5nXHJcbiAqXHJcbiAqIFsgW1sgeyBjYXRlZ29yeTogJ3N5c3RlbUlkJywgd29yZCA6ICdBJ30sXHJcbiAqICAgICAgeyBjYXRlZ29yeTogJ290aGVydGhpbmcnLCB3b3JkIDogJ0EnfVxyXG4gKiAgICBdLFxyXG4gKiAgICAvLyByZXN1bHQgb2YgQlxyXG4gKiAgICBbIHsgY2F0ZWdvcnk6ICdzeXN0ZW1JZCcsIHdvcmQgOiAnQid9LFxyXG4gKiAgICAgIHsgY2F0ZWdvcnk6ICdvdGhlcnRoaW5nJywgd29yZCA6ICdBJ31cclxuICogICAgICB7IGNhdGVnb3J5OiAnYW5vdGhlcnRyeXAnLCB3b3JkIDogJ0InfVxyXG4gKiAgICBdXHJcbiAqICAgXSxcclxuICogXV1dXHJcbiAqXHJcbiAqXHJcbiAqXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZVN0cmluZyhzU3RyaW5nOiBzdHJpbmcsIGFSdWxlczogQXJyYXk8SU1hdGNoLm1SdWxlPixcclxuICB3b3Jkcz86IHsgW2tleTogc3RyaW5nXTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IH0pIHtcclxuICB2YXIgY250ID0gMDtcclxuICB2YXIgZmFjID0gMTtcclxuICB2YXIgdSA9IGJyZWFrZG93bi5icmVha2Rvd25TdHJpbmcoc1N0cmluZywgQWxnb2wuTWF4U3BhY2VzUGVyQ29tYmluZWRXb3JkKTtcclxuICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZyhcImhlcmUgYnJlYWtkb3duXCIgKyBKU09OLnN0cmluZ2lmeSh1KSk7XHJcbiAgfVxyXG4gIHdvcmRzID0gd29yZHMgfHwge307XHJcbiAgZGVidWdwZXJmKCd0aGlzIG1hbnkga25vd24gd29yZHMnICsgT2JqZWN0LmtleXMod29yZHMpLmxlbmd0aCk7XHJcbiAgdmFyIHJlcyA9IHUubWFwKGZ1bmN0aW9uIChhQXJyKSB7XHJcbiAgICByZXR1cm4gYUFyci5tYXAoZnVuY3Rpb24gKHNXb3JkR3JvdXA6IHN0cmluZykge1xyXG4gICAgICB2YXIgc2Vlbkl0ID0gY2F0ZWdvcml6ZUFXb3JkKHNXb3JkR3JvdXAsIGFSdWxlcywgc1N0cmluZywgd29yZHMpO1xyXG4gICAgICBjbnQgPSBjbnQgKyBzZWVuSXQubGVuZ3RoO1xyXG4gICAgICBmYWMgPSBmYWMgKiBzZWVuSXQubGVuZ3RoO1xyXG4gICAgICByZXR1cm4gc2Vlbkl0O1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcbiAgcmVzID0gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkKHJlcyk7XHJcbiAgZGVidWdsb2coXCIgc2VudGVuY2VzIFwiICsgdS5sZW5ndGggKyBcIiBtYXRjaGVzIFwiICsgY250ICsgXCIgZmFjOiBcIiArIGZhYyk7XHJcbiAgZGVidWdwZXJmKFwiIHNlbnRlbmNlcyBcIiArIHUubGVuZ3RoICsgXCIgbWF0Y2hlcyBcIiArIGNudCArIFwiIGZhYzogXCIgKyBmYWMpO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbi8qXHJcblsgW2EsYl0sIFtjLGRdXVxyXG5cclxuMDAgYVxyXG4wMSBiXHJcbjEwIGNcclxuMTEgZFxyXG4xMiBjXHJcbiovXHJcblxyXG5cclxuY29uc3QgY2xvbmUgPSB1dGlscy5jbG9uZURlZXA7XHJcblxyXG4vLyB3ZSBjYW4gcmVwbGljYXRlIHRoZSB0YWlsIG9yIHRoZSBoZWFkLFxyXG4vLyB3ZSByZXBsaWNhdGUgdGhlIHRhaWwgYXMgaXQgaXMgc21hbGxlci5cclxuXHJcbi8vIFthLGIsYyBdXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZXhwYW5kTWF0Y2hBcnIoZGVlcDogQXJyYXk8QXJyYXk8YW55Pj4pOiBBcnJheTxBcnJheTxhbnk+PiB7XHJcbiAgdmFyIGEgPSBbXTtcclxuICB2YXIgbGluZSA9IFtdO1xyXG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlZXApKTtcclxuICBkZWVwLmZvckVhY2goZnVuY3Rpb24gKHVCcmVha0Rvd25MaW5lLCBpSW5kZXg6IG51bWJlcikge1xyXG4gICAgbGluZVtpSW5kZXhdID0gW107XHJcbiAgICB1QnJlYWtEb3duTGluZS5mb3JFYWNoKGZ1bmN0aW9uIChhV29yZEdyb3VwLCB3Z0luZGV4OiBudW1iZXIpIHtcclxuICAgICAgbGluZVtpSW5kZXhdW3dnSW5kZXhdID0gW107XHJcbiAgICAgIGFXb3JkR3JvdXAuZm9yRWFjaChmdW5jdGlvbiAob1dvcmRWYXJpYW50LCBpV1ZJbmRleDogbnVtYmVyKSB7XHJcbiAgICAgICAgbGluZVtpSW5kZXhdW3dnSW5kZXhdW2lXVkluZGV4XSA9IG9Xb3JkVmFyaWFudDtcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9KVxyXG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGxpbmUpKTtcclxuICB2YXIgcmVzID0gW107XHJcbiAgdmFyIG52ZWNzID0gW107XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lLmxlbmd0aDsgKytpKSB7XHJcbiAgICB2YXIgdmVjcyA9IFtbXV07XHJcbiAgICB2YXIgbnZlY3MgPSBbXTtcclxuICAgIHZhciBydmVjID0gW107XHJcbiAgICBmb3IgKHZhciBrID0gMDsgayA8IGxpbmVbaV0ubGVuZ3RoOyArK2spIHsgLy8gd29yZGdyb3VwIGtcclxuICAgICAgLy92ZWNzIGlzIHRoZSB2ZWN0b3Igb2YgYWxsIHNvIGZhciBzZWVuIHZhcmlhbnRzIHVwIHRvIGsgd2dzLlxyXG4gICAgICB2YXIgbmV4dEJhc2UgPSBbXTtcclxuICAgICAgZm9yICh2YXIgbCA9IDA7IGwgPCBsaW5lW2ldW2tdLmxlbmd0aDsgKytsKSB7IC8vIGZvciBlYWNoIHZhcmlhbnRcclxuICAgICAgICAvL2RlYnVnbG9nKFwidmVjcyBub3dcIiArIEpTT04uc3RyaW5naWZ5KHZlY3MpKTtcclxuICAgICAgICBudmVjcyA9IFtdOyAvL3ZlY3Muc2xpY2UoKTsgLy8gY29weSB0aGUgdmVjW2ldIGJhc2UgdmVjdG9yO1xyXG4gICAgICAgIC8vZGVidWdsb2coXCJ2ZWNzIGNvcGllZCBub3dcIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSk7XHJcbiAgICAgICAgZm9yICh2YXIgdSA9IDA7IHUgPCB2ZWNzLmxlbmd0aDsgKyt1KSB7XHJcbiAgICAgICAgICBudmVjc1t1XSA9IHZlY3NbdV0uc2xpY2UoKTsgLy9cclxuICAgICAgICAgIC8vIGRlYnVnbG9nKFwiY29waWVkIHZlY3NbXCIrIHUrXCJdXCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzW3VdKSk7XHJcbiAgICAgICAgICBudmVjc1t1XS5wdXNoKFxyXG4gICAgICAgICAgICBjbG9uZShsaW5lW2ldW2tdW2xdKSk7IC8vIHB1c2ggdGhlIGx0aCB2YXJpYW50XHJcbiAgICAgICAgICAvLyBkZWJ1Z2xvZyhcIm5vdyBudmVjcyBcIiArIG52ZWNzLmxlbmd0aCArIFwiIFwiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gICBkZWJ1Z2xvZyhcIiBhdCAgICAgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbmV4dGJhc2UgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxyXG4gICAgICAgIC8vICAgZGVidWdsb2coXCIgYXBwZW5kIFwiICsgayArIFwiOlwiICsgbCArIFwiIG52ZWNzICAgID5cIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSlcclxuICAgICAgICBuZXh0QmFzZSA9IG5leHRCYXNlLmNvbmNhdChudmVjcyk7XHJcbiAgICAgICAgLy8gICBkZWJ1Z2xvZyhcIiAgcmVzdWx0IFwiICsgayArIFwiOlwiICsgbCArIFwiIG52ZWNzICAgID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcclxuICAgICAgfSAvL2NvbnN0cnVcclxuICAgICAgLy8gIGRlYnVnbG9nKFwibm93IGF0IFwiICsgayArIFwiOlwiICsgbCArIFwiID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcclxuICAgICAgdmVjcyA9IG5leHRCYXNlO1xyXG4gICAgfVxyXG4gICAgZGVidWdsb2coXCJBUFBFTkRJTkcgVE8gUkVTXCIgKyBpICsgXCI6XCIgKyBsICsgXCIgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxyXG4gICAgcmVzID0gcmVzLmNvbmNhdCh2ZWNzKTtcclxuICB9XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuXHJcbi8qKlxyXG4gKiBDYWxjdWxhdGUgYSB3ZWlnaHQgZmFjdG9yIGZvciBhIGdpdmVuIGRpc3RhbmNlIGFuZFxyXG4gKiBjYXRlZ29yeVxyXG4gKiBAcGFyYW0ge2ludGVnZXJ9IGRpc3QgZGlzdGFuY2UgaW4gd29yZHNcclxuICogQHBhcmFtIHtzdHJpbmd9IGNhdGVnb3J5IGNhdGVnb3J5IHRvIHVzZVxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBhIGRpc3RhbmNlIGZhY3RvciA+PSAxXHJcbiAqICAxLjAgZm9yIG5vIGVmZmVjdFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlaW5mb3JjZURpc3RXZWlnaHQoZGlzdDogbnVtYmVyLCBjYXRlZ29yeTogc3RyaW5nKTogbnVtYmVyIHtcclxuICB2YXIgYWJzID0gTWF0aC5hYnMoZGlzdCk7XHJcbiAgcmV0dXJuIDEuMCArIChBbGdvbC5hUmVpbmZvcmNlRGlzdFdlaWdodFthYnNdIHx8IDApO1xyXG59XHJcblxyXG4vKipcclxuICogR2l2ZW4gYSBzZW50ZW5jZSwgZXh0YWN0IGNhdGVnb3JpZXNcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0Q2F0ZWdvcnlNYXAob1NlbnRlbmNlOiBBcnJheTxJRk1hdGNoLklXb3JkPik6IHsgW2tleTogc3RyaW5nXTogQXJyYXk8eyBwb3M6IG51bWJlciB9PiB9IHtcclxuICB2YXIgcmVzID0ge307XHJcbiAgZGVidWdsb2coJ2V4dHJhY3RDYXRlZ29yeU1hcCAnICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKSk7XHJcbiAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpSW5kZXgpIHtcclxuICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gSUZNYXRjaC5DQVRfQ0FURUdPUlkpIHtcclxuICAgICAgcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddID0gcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddIHx8IFtdO1xyXG4gICAgICByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10ucHVzaCh7IHBvczogaUluZGV4IH0pO1xyXG4gICAgfVxyXG4gIH0pO1xyXG4gIHV0aWxzLmRlZXBGcmVlemUocmVzKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVpbkZvcmNlU2VudGVuY2Uob1NlbnRlbmNlKSB7XHJcbiAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgdmFyIG9DYXRlZ29yeU1hcCA9IGV4dHJhY3RDYXRlZ29yeU1hcChvU2VudGVuY2UpO1xyXG4gIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaUluZGV4KSB7XHJcbiAgICB2YXIgbSA9IG9DYXRlZ29yeU1hcFtvV29yZC5jYXRlZ29yeV0gfHwgW107XHJcbiAgICBtLmZvckVhY2goZnVuY3Rpb24gKG9Qb3NpdGlvbjogeyBwb3M6IG51bWJlciB9KSB7XHJcbiAgICAgIFwidXNlIHN0cmljdFwiO1xyXG4gICAgICBvV29yZC5yZWluZm9yY2UgPSBvV29yZC5yZWluZm9yY2UgfHwgMTtcclxuICAgICAgdmFyIGJvb3N0ID0gcmVpbmZvcmNlRGlzdFdlaWdodChpSW5kZXggLSBvUG9zaXRpb24ucG9zLCBvV29yZC5jYXRlZ29yeSk7XHJcbiAgICAgIG9Xb3JkLnJlaW5mb3JjZSAqPSBib29zdDtcclxuICAgICAgb1dvcmQuX3JhbmtpbmcgKj0gYm9vc3Q7XHJcbiAgICB9KTtcclxuICB9KTtcclxuICByZXR1cm4gb1NlbnRlbmNlO1xyXG59XHJcblxyXG5cclxuaW1wb3J0ICogYXMgU2VudGVuY2UgZnJvbSAnLi9zZW50ZW5jZSc7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVpbkZvcmNlKGFDYXRlZ29yaXplZEFycmF5KSB7XHJcbiAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgYUNhdGVnb3JpemVkQXJyYXkuZm9yRWFjaChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XHJcbiAgICByZWluRm9yY2VTZW50ZW5jZShvU2VudGVuY2UpO1xyXG4gIH0pXHJcbiAgYUNhdGVnb3JpemVkQXJyYXkuc29ydChTZW50ZW5jZS5jbXBSYW5raW5nUHJvZHVjdCk7XHJcbiAgZGVidWdsb2coXCJhZnRlciByZWluZm9yY2VcIiArIGFDYXRlZ29yaXplZEFycmF5Lm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XHJcbiAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcclxuICB9KS5qb2luKFwiXFxuXCIpKTtcclxuICByZXR1cm4gYUNhdGVnb3JpemVkQXJyYXk7XHJcbn1cclxuXHJcblxyXG4vLy8gYmVsb3cgbWF5IG5vIGxvbmdlciBiZSB1c2VkXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hSZWdFeHAob1J1bGU6IElSdWxlLCBjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQsIG9wdGlvbnM/OiBJTWF0Y2hPcHRpb25zKSB7XHJcbiAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICB2YXIgc0tleSA9IG9SdWxlLmtleTtcclxuICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKVxyXG4gIHZhciByZWcgPSBvUnVsZS5yZWdleHA7XHJcblxyXG4gIHZhciBtID0gcmVnLmV4ZWMoczEpO1xyXG4gIGRlYnVnbG9nKFwiYXBwbHlpbmcgcmVnZXhwOiBcIiArIHMxICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XHJcbiAgaWYgKCFtKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxyXG4gIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsIG9SdWxlLmZvbGxvd3MsIG9SdWxlLmtleSlcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xyXG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcclxuICBpZiAob3B0aW9ucy5tYXRjaG90aGVycyAmJiAoZGVsdGEuZGlmZmVyZW50ID4gMCkpIHtcclxuICAgIHJldHVybiB1bmRlZmluZWRcclxuICB9XHJcbiAgdmFyIG9FeHRyYWN0ZWRDb250ZXh0ID0gZXh0cmFjdEFyZ3NNYXAobSwgb1J1bGUuYXJnc01hcCk7XHJcbiAgZGVidWdsb2coXCJleHRyYWN0ZWQgYXJncyBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLmFyZ3NNYXApKTtcclxuICBkZWJ1Z2xvZyhcIm1hdGNoIFwiICsgSlNPTi5zdHJpbmdpZnkobSkpO1xyXG5cclxuICBkZWJ1Z2xvZyhcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob0V4dHJhY3RlZENvbnRleHQpKTtcclxuICB2YXIgcmVzID0gQW55T2JqZWN0LmFzc2lnbih7fSwgb1J1bGUuZm9sbG93cykgYXMgYW55O1xyXG4gIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvRXh0cmFjdGVkQ29udGV4dCk7XHJcbiAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIGNvbnRleHQpO1xyXG4gIGlmIChvRXh0cmFjdGVkQ29udGV4dFtzS2V5XSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICByZXNbc0tleV0gPSBvRXh0cmFjdGVkQ29udGV4dFtzS2V5XTtcclxuICB9XHJcbiAgaWYgKG9wdGlvbnMub3ZlcnJpZGUpIHtcclxuICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvUnVsZS5mb2xsb3dzKTtcclxuICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvRXh0cmFjdGVkQ29udGV4dClcclxuICB9XHJcbiAgT2JqZWN0LmZyZWV6ZShyZXMpO1xyXG4gIGRlYnVnbG9nKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc29ydEJ5V2VpZ2h0KHNLZXk6IHN0cmluZywgb0NvbnRleHRBOiBJRk1hdGNoLmNvbnRleHQsIG9Db250ZXh0QjogSUZNYXRjaC5jb250ZXh0KTogbnVtYmVyIHtcclxuICBkZWJ1Z2xvZygnc29ydGluZzogJyArIHNLZXkgKyAnaW52b2tlZCB3aXRoXFxuIDE6JyArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QSwgdW5kZWZpbmVkLCAyKSArXHJcbiAgICBcIiB2cyBcXG4gMjpcIiArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QiwgdW5kZWZpbmVkLCAyKSk7XHJcbiAgdmFyIHJhbmtpbmdBOiBudW1iZXIgPSBwYXJzZUZsb2F0KG9Db250ZXh0QVtcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcclxuICB2YXIgcmFua2luZ0I6IG51bWJlciA9IHBhcnNlRmxvYXQob0NvbnRleHRCW1wiX3JhbmtpbmdcIl0gfHwgXCIxXCIpO1xyXG4gIGlmIChyYW5raW5nQSAhPT0gcmFua2luZ0IpIHtcclxuICAgIGRlYnVnbG9nKFwiIHJhbmtpbiBkZWx0YVwiICsgMTAwICogKHJhbmtpbmdCIC0gcmFua2luZ0EpKTtcclxuICAgIHJldHVybiAxMDAgKiAocmFua2luZ0IgLSByYW5raW5nQSlcclxuICB9XHJcblxyXG4gIHZhciB3ZWlnaHRBID0gb0NvbnRleHRBW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdW3NLZXldIHx8IDA7XHJcbiAgdmFyIHdlaWdodEIgPSBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QltcIl93ZWlnaHRcIl1bc0tleV0gfHwgMDtcclxuICByZXR1cm4gKyh3ZWlnaHRBIC0gd2VpZ2h0Qik7XHJcbn1cclxuXHJcblxyXG4vLyBXb3JkLCBTeW5vbnltLCBSZWdleHAgLyBFeHRyYWN0aW9uUnVsZVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0MShjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQsIG9SdWxlczogQXJyYXk8SVJ1bGU+LCBvcHRpb25zOiBJTWF0Y2hPcHRpb25zKTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgdmFyIHNLZXkgPSBvUnVsZXNbMF0ua2V5O1xyXG4gIC8vIGNoZWNrIHRoYXQgcnVsZVxyXG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAvLyBjaGVjayBjb25zaXN0ZW5jeVxyXG4gICAgb1J1bGVzLmV2ZXJ5KGZ1bmN0aW9uIChpUnVsZSkge1xyXG4gICAgICBpZiAoaVJ1bGUua2V5ICE9PSBzS2V5KSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW5ob21vZ2Vub3VzIGtleXMgaW4gcnVsZXMsIGV4cGVjdGVkIFwiICsgc0tleSArIFwiIHdhcyBcIiArIEpTT04uc3RyaW5naWZ5KGlSdWxlKSk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vIGxvb2sgZm9yIHJ1bGVzIHdoaWNoIG1hdGNoXHJcbiAgdmFyIHJlcyA9IG9SdWxlcy5tYXAoZnVuY3Rpb24gKG9SdWxlKSB7XHJcbiAgICAvLyBpcyB0aGlzIHJ1bGUgYXBwbGljYWJsZVxyXG4gICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuV09SRDpcclxuICAgICAgICByZXR1cm4gbWF0Y2hXb3JkKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKVxyXG4gICAgICBjYXNlIElGTWF0Y2guRW51bVJ1bGVUeXBlLlJFR0VYUDpcclxuICAgICAgICByZXR1cm4gbWF0Y2hSZWdFeHAob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xyXG4gICAgICAvLyAgIGNhc2UgXCJFeHRyYWN0aW9uXCI6XHJcbiAgICAgIC8vICAgICByZXR1cm4gbWF0Y2hFeHRyYWN0aW9uKG9SdWxlLGNvbnRleHQpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gIH0pLmZpbHRlcihmdW5jdGlvbiAob3Jlcykge1xyXG4gICAgcmV0dXJuICEhb3Jlc1xyXG4gIH0pLnNvcnQoXHJcbiAgICBzb3J0QnlXZWlnaHQuYmluZCh0aGlzLCBzS2V5KVxyXG4gICAgKTtcclxuICByZXR1cm4gcmVzO1xyXG4gIC8vIE9iamVjdC5rZXlzKCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xyXG4gIC8vIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXVnbWVudENvbnRleHQoY29udGV4dDogSUZNYXRjaC5jb250ZXh0LCBhUnVsZXM6IEFycmF5PElSdWxlPik6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG5cclxuICB2YXIgb3B0aW9uczE6IElNYXRjaE9wdGlvbnMgPSB7XHJcbiAgICBtYXRjaG90aGVyczogdHJ1ZSxcclxuICAgIG92ZXJyaWRlOiBmYWxzZVxyXG4gIH0gYXMgSU1hdGNoT3B0aW9ucztcclxuXHJcbiAgdmFyIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMSlcclxuXHJcbiAgaWYgKGFSZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICB2YXIgb3B0aW9uczI6IElNYXRjaE9wdGlvbnMgPSB7XHJcbiAgICAgIG1hdGNob3RoZXJzOiBmYWxzZSxcclxuICAgICAgb3ZlcnJpZGU6IHRydWVcclxuICAgIH0gYXMgSU1hdGNoT3B0aW9ucztcclxuICAgIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMik7XHJcbiAgfVxyXG4gIHJldHVybiBhUmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gaW5zZXJ0T3JkZXJlZChyZXN1bHQ6IEFycmF5PElGTWF0Y2guY29udGV4dD4sIGlJbnNlcnRlZE1lbWJlcjogSUZNYXRjaC5jb250ZXh0LCBsaW1pdDogbnVtYmVyKTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgLy8gVE9ETzogdXNlIHNvbWUgd2VpZ2h0XHJcbiAgaWYgKHJlc3VsdC5sZW5ndGggPCBsaW1pdCkge1xyXG4gICAgcmVzdWx0LnB1c2goaUluc2VydGVkTWVtYmVyKVxyXG4gIH1cclxuICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHRha2VUb3BOKGFycjogQXJyYXk8QXJyYXk8SUZNYXRjaC5jb250ZXh0Pj4pOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICB2YXIgdSA9IGFyci5maWx0ZXIoZnVuY3Rpb24gKGlubmVyQXJyKSB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwIH0pXHJcblxyXG4gIHZhciByZXMgPSBbXTtcclxuICAvLyBzaGlmdCBvdXQgdGhlIHRvcCBvbmVzXHJcbiAgdSA9IHUubWFwKGZ1bmN0aW9uIChpQXJyKSB7XHJcbiAgICB2YXIgdG9wID0gaUFyci5zaGlmdCgpO1xyXG4gICAgcmVzID0gaW5zZXJ0T3JkZXJlZChyZXMsIHRvcCwgNSlcclxuICAgIHJldHVybiBpQXJyXHJcbiAgfSkuZmlsdGVyKGZ1bmN0aW9uIChpbm5lckFycjogQXJyYXk8SUZNYXRjaC5jb250ZXh0Pik6IGJvb2xlYW4geyByZXR1cm4gaW5uZXJBcnIubGVuZ3RoID4gMCB9KTtcclxuICAvLyBhcyBBcnJheTxBcnJheTxJRk1hdGNoLmNvbnRleHQ+PlxyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmltcG9ydCAqIGFzIGlucHV0RmlsdGVyUnVsZXMgZnJvbSAnLi9pbnB1dEZpbHRlclJ1bGVzJztcclxuXHJcbnZhciBybTtcclxuXHJcbmZ1bmN0aW9uIGdldFJNT25jZSgpIHtcclxuICBpZiAoIXJtKSB7XHJcbiAgICBybSA9IGlucHV0RmlsdGVyUnVsZXMuZ2V0UnVsZU1hcCgpXHJcbiAgfVxyXG4gIHJldHVybiBybTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UnVsZXMoY29udGV4dDogSUZNYXRjaC5jb250ZXh0KTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgdmFyIGJlc3ROOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+ID0gW2NvbnRleHRdO1xyXG4gIGlucHV0RmlsdGVyUnVsZXMub0tleU9yZGVyLmZvckVhY2goZnVuY3Rpb24gKHNLZXk6IHN0cmluZykge1xyXG4gICAgdmFyIGJlc3ROZXh0OiBBcnJheTxBcnJheTxJRk1hdGNoLmNvbnRleHQ+PiA9IFtdO1xyXG4gICAgYmVzdE4uZm9yRWFjaChmdW5jdGlvbiAob0NvbnRleHQ6IElGTWF0Y2guY29udGV4dCkge1xyXG4gICAgICBpZiAob0NvbnRleHRbc0tleV0pIHtcclxuICAgICAgICBkZWJ1Z2xvZygnKiogYXBwbHlpbmcgcnVsZXMgZm9yICcgKyBzS2V5KVxyXG4gICAgICAgIHZhciByZXMgPSBhdWdtZW50Q29udGV4dChvQ29udGV4dCwgZ2V0Uk1PbmNlKClbc0tleV0gfHwgW10pXHJcbiAgICAgICAgZGVidWdsb2coJyoqIHJlc3VsdCBmb3IgJyArIHNLZXkgKyAnID0gJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSlcclxuICAgICAgICBiZXN0TmV4dC5wdXNoKHJlcyB8fCBbXSlcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBydWxlIG5vdCByZWxldmFudFxyXG4gICAgICAgIGJlc3ROZXh0LnB1c2goW29Db250ZXh0XSk7XHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgICBiZXN0TiA9IHRha2VUb3BOKGJlc3ROZXh0KTtcclxuICB9KTtcclxuICByZXR1cm4gYmVzdE5cclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhcHBseVJ1bGVzUGlja0ZpcnN0KGNvbnRleHQ6IElGTWF0Y2guY29udGV4dCk6IElGTWF0Y2guY29udGV4dCB7XHJcbiAgdmFyIHIgPSBhcHBseVJ1bGVzKGNvbnRleHQpO1xyXG4gIHJldHVybiByICYmIHJbMF07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZWNpZGUgd2hldGhlciB0byByZXF1ZXJ5IGZvciBhIGNvbnRldFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGRlY2lkZU9uUmVRdWVyeShjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQpOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICByZXR1cm4gW11cclxufVxyXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
