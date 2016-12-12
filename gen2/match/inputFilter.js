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
    var a0 = distance.levenshtein(sText1.substring(0, sText2.length), sText2);
    var a = distance.levenshtein(sText1.toLowerCase(), sText2);
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
    debug("rules : " + JSON.stringify(oRules));
    var res = [];
    oRules.forEach(function (oRule) {
        debuglog('attempting to match rule ' + JSON.stringify(oRule) + " to string \"" + string + "\"");
        switch (oRule.type) {
            case 0 /* WORD */:
                if (exact && oRule.word === string) {
                    res.push({
                        string: string,
                        matchedString: oRule.matchedString,
                        category: oRule.category,
                        _ranking: oRule._ranking || 1.0
                    });
                }
                if (!exact) {
                    var levenmatch = calcDistance(oRule.word, string);
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
                    debuglog(JSON.stringify(" here regexp" + JSON.stringify(oRule, undefined, 2)));
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
function categorizeWordWithRankCutoff(sWordGroup, aRules) {
    var seenIt = categorizeString(sWordGroup, true, aRules);
    if (exports.RankWord.hasAbove(seenIt, 0.8)) {
        seenIt = exports.RankWord.takeAbove(seenIt, 0.8);
    } else {
        seenIt = categorizeString(sWordGroup, false, aRules);
    }
    seenIt = exports.RankWord.takeFirstN(seenIt, Algol.Top_N_WordCategorizations);
    return seenIt;
}
exports.categorizeWordWithRankCutoff = categorizeWordWithRankCutoff;
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
        if (seenIt === undefined) words[sWordGroup] = seenIt;
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
        return [];
    }
    return seenIt;
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
function analyzeString(sString, aRules) {
    var cnt = 0;
    var fac = 1;
    var u = breakdown.breakdownString(sString);
    debuglog("here breakdown" + JSON.stringify(u));
    var words = {};
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
    var oCategoryMap = extractCategoryMap(oSentence);
    oSentence.forEach(function (oWord, iIndex) {
        var m = oCategoryMap[oWord.category] || [];
        m.forEach(function (oPosition) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1hdGNoL2lucHV0RmlsdGVyLmpzIiwiLi4vc3JjL21hdGNoL2lucHV0RmlsdGVyLnRzIl0sIm5hbWVzIjpbImRpc3RhbmNlIiwicmVxdWlyZSIsIkxvZ2dlciIsImxvZ2dlciIsImRlYnVnIiwidXRpbHMiLCJBbGdvbCIsImJyZWFrZG93biIsIkFueU9iamVjdCIsIk9iamVjdCIsImRlYnVnbG9nIiwibWF0Y2hkYXRhIiwib1VuaXRUZXN0cyIsImNhbGNEaXN0YW5jZSIsInNUZXh0MSIsInNUZXh0MiIsImEwIiwibGV2ZW5zaHRlaW4iLCJzdWJzdHJpbmciLCJsZW5ndGgiLCJhIiwidG9Mb3dlckNhc2UiLCJJRk1hdGNoIiwibGV2ZW5DdXRvZmYiLCJDdXRvZmZfTGV2ZW5TaHRlaW4iLCJsZXZlblBlbmFsdHkiLCJpIiwiZXhwb3J0cyIsIm5vblByaXZhdGVLZXlzIiwib0EiLCJrZXlzIiwiZmlsdGVyIiwia2V5IiwiY291bnRBaW5CIiwib0IiLCJmbkNvbXBhcmUiLCJhS2V5SWdub3JlIiwiQXJyYXkiLCJpc0FycmF5IiwiaW5kZXhPZiIsInJlZHVjZSIsInByZXYiLCJwcm90b3R5cGUiLCJoYXNPd25Qcm9wZXJ0eSIsImNhbGwiLCJzcHVyaW91c0Fub3RJbkIiLCJsb3dlckNhc2UiLCJvIiwiY29tcGFyZUNvbnRleHQiLCJlcXVhbCIsImIiLCJkaWZmZXJlbnQiLCJzcHVyaW91c0wiLCJzcHVyaW91c1IiLCJzb3J0QnlSYW5rIiwiciIsIl9yYW5raW5nIiwiY2F0ZWdvcnkiLCJsb2NhbGVDb21wYXJlIiwibWF0Y2hlZFN0cmluZyIsImNhdGVnb3JpemVTdHJpbmciLCJzdHJpbmciLCJleGFjdCIsIm9SdWxlcyIsIkpTT04iLCJzdHJpbmdpZnkiLCJyZXMiLCJmb3JFYWNoIiwib1J1bGUiLCJ0eXBlIiwid29yZCIsInB1c2giLCJsZXZlbm1hdGNoIiwidW5kZWZpbmVkIiwibSIsInJlZ2V4cCIsImV4ZWMiLCJtYXRjaEluZGV4IiwiRXJyb3IiLCJzb3J0IiwibWF0Y2hXb3JkIiwiY29udGV4dCIsIm9wdGlvbnMiLCJzMSIsInMyIiwiZGVsdGEiLCJmb2xsb3dzIiwibWF0Y2hvdGhlcnMiLCJjIiwiYXNzaWduIiwib3ZlcnJpZGUiLCJfd2VpZ2h0IiwiZnJlZXplIiwiZXh0cmFjdEFyZ3NNYXAiLCJtYXRjaCIsImFyZ3NNYXAiLCJpS2V5IiwidmFsdWUiLCJSYW5rV29yZCIsImhhc0Fib3ZlIiwibHN0IiwiYm9yZGVyIiwiZXZlcnkiLCJvTWVtYmVyIiwidGFrZUZpcnN0TiIsIm4iLCJpSW5kZXgiLCJsYXN0UmFua2luZyIsInRha2VBYm92ZSIsImNhdGVnb3JpemVXb3JkV2l0aFJhbmtDdXRvZmYiLCJzV29yZEdyb3VwIiwiYVJ1bGVzIiwic2Vlbkl0IiwiVG9wX05fV29yZENhdGVnb3JpemF0aW9ucyIsImZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZFNlbnRlbmNlIiwib1NlbnRlbmNlIiwib1dvcmRHcm91cCIsImZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZCIsImFyciIsImNhdGVnb3JpemVBV29yZCIsInNTdHJpbmciLCJ3b3JkcyIsImFuYWx5emVTdHJpbmciLCJjbnQiLCJmYWMiLCJ1IiwiYnJlYWtkb3duU3RyaW5nIiwibWFwIiwiYUFyciIsImNsb25lIiwiY2xvbmVEZWVwIiwiZXhwYW5kTWF0Y2hBcnIiLCJkZWVwIiwibGluZSIsInVCcmVha0Rvd25MaW5lIiwiYVdvcmRHcm91cCIsIndnSW5kZXgiLCJvV29yZFZhcmlhbnQiLCJpV1ZJbmRleCIsIm52ZWNzIiwidmVjcyIsInJ2ZWMiLCJrIiwibmV4dEJhc2UiLCJsIiwic2xpY2UiLCJjb25jYXQiLCJyZWluZm9yY2VEaXN0V2VpZ2h0IiwiZGlzdCIsImFicyIsIk1hdGgiLCJhUmVpbmZvcmNlRGlzdFdlaWdodCIsImV4dHJhY3RDYXRlZ29yeU1hcCIsIm9Xb3JkIiwiQ0FUX0NBVEVHT1JZIiwicG9zIiwiZGVlcEZyZWV6ZSIsInJlaW5Gb3JjZVNlbnRlbmNlIiwib0NhdGVnb3J5TWFwIiwib1Bvc2l0aW9uIiwicmVpbmZvcmNlIiwiYm9vc3QiLCJTZW50ZW5jZSIsInJlaW5Gb3JjZSIsImFDYXRlZ29yaXplZEFycmF5IiwiY21wUmFua2luZ1Byb2R1Y3QiLCJyYW5raW5nUHJvZHVjdCIsImpvaW4iLCJtYXRjaFJlZ0V4cCIsInNLZXkiLCJyZWciLCJvRXh0cmFjdGVkQ29udGV4dCIsInNvcnRCeVdlaWdodCIsIm9Db250ZXh0QSIsIm9Db250ZXh0QiIsInJhbmtpbmdBIiwicGFyc2VGbG9hdCIsInJhbmtpbmdCIiwid2VpZ2h0QSIsIndlaWdodEIiLCJhdWdtZW50Q29udGV4dDEiLCJlbmFibGVkIiwiaVJ1bGUiLCJvcmVzIiwiYmluZCIsImF1Z21lbnRDb250ZXh0Iiwib3B0aW9uczEiLCJhUmVzIiwib3B0aW9uczIiLCJpbnNlcnRPcmRlcmVkIiwicmVzdWx0IiwiaUluc2VydGVkTWVtYmVyIiwibGltaXQiLCJ0YWtlVG9wTiIsImlubmVyQXJyIiwiaUFyciIsInRvcCIsInNoaWZ0IiwiaW5wdXRGaWx0ZXJSdWxlcyIsInJtIiwiZ2V0Uk1PbmNlIiwiZ2V0UnVsZU1hcCIsImFwcGx5UnVsZXMiLCJiZXN0TiIsIm9LZXlPcmRlciIsImJlc3ROZXh0Iiwib0NvbnRleHQiLCJhcHBseVJ1bGVzUGlja0ZpcnN0IiwiZGVjaWRlT25SZVF1ZXJ5Il0sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOzs7Ozs7Ozs7Ozs7Ozs7O0FBZ0JBOztBQUNBLElBQVlBLFdBQVFDLFFBQU0sNkJBQU4sQ0FBcEI7QUFHQSxJQUFZQyxTQUFNRCxRQUFNLGlCQUFOLENBQWxCO0FBRUEsSUFBTUUsU0FBU0QsT0FBT0MsTUFBUCxDQUFjLGFBQWQsQ0FBZjtBQUVBLElBQVlDLFFBQUtILFFBQU0sT0FBTixDQUFqQjtBQUVBLElBQVlJLFFBQUtKLFFBQU0sZ0JBQU4sQ0FBakI7QUFHQSxJQUFZSyxRQUFLTCxRQUFNLFNBQU4sQ0FBakI7QUFJQSxJQUFZTSxZQUFTTixRQUFNLGFBQU4sQ0FBckI7QUFFQSxJQUFNTyxZQUFp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RCxhQUxELE1BS087QUFDTDtBQUNBMkkseUJBQVN0SSxJQUFULENBQWMsQ0FBQ3VJLFFBQUQsQ0FBZDtBQUNEO0FBQ0YsU0FWRDtBQVdBSCxnQkFBUVYsU0FBU1ksUUFBVCxDQUFSO0FBQ0QsS0FkRDtBQWVBLFdBQU9GLEtBQVA7QUFDRDtBQWxCZWhMLFFBQUErSyxVQUFBLEdBQVVBLFVBQVY7QUFxQmhCLFNBQUFLLG1CQUFBLENBQW9DOUgsT0FBcEMsRUFBNEQ7QUFDMUQsUUFBSTFCLElBQUltSixXQUFXekgsT0FBWCxDQUFSO0FBQ0EsV0FBTzFCLEtBQUtBLEVBQUUsQ0FBRixDQUFaO0FBQ0Q7QUFIZTVCLFFBQUFvTCxtQkFBQSxHQUFtQkEsbUJBQW5CO0FBS2hCOzs7QUFHQSxTQUFBQyxlQUFBLENBQWdDL0gsT0FBaEMsRUFBd0Q7QUFDdEQsV0FBTyxFQUFQO0FBQ0Q7QUFGZXRELFFBQUFxTCxlQUFBLEdBQWVBLGVBQWYiLCJmaWxlIjoibWF0Y2gvaW5wdXRGaWx0ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcbi8qKlxuICogdGhlIGlucHV0IGZpbHRlciBzdGFnZSBwcmVwcm9jZXNzZXMgYSBjdXJyZW50IGNvbnRleHRcbiAqXG4gKiBJdCBhKSBjb21iaW5lcyBtdWx0aS1zZWdtZW50IGFyZ3VtZW50cyBpbnRvIG9uZSBjb250ZXh0IG1lbWJlcnNcbiAqIEl0IGIpIGF0dGVtcHRzIHRvIGF1Z21lbnQgdGhlIGNvbnRleHQgYnkgYWRkaXRpb25hbCBxdWFsaWZpY2F0aW9uc1xuICogICAgICAgICAgIChNaWQgdGVybSBnZW5lcmF0aW5nIEFsdGVybmF0aXZlcywgZS5nLlxuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHVuaXQgdGVzdD9cbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiBzb3VyY2UgP1xuICogICAgICAgICAgIClcbiAqICBTaW1wbGUgcnVsZXMgbGlrZSAgSW50ZW50XG4gKlxuICpcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmlucHV0RmlsdGVyXG4gKiBAZmlsZSBpbnB1dEZpbHRlci50c1xuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxuICovXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vbGliL25vZGUtNC5kLnRzXCIgLz5cbnZhciBkaXN0YW5jZSA9IHJlcXVpcmUoJy4uL3V0aWxzL2RhbWVyYXVMZXZlbnNodGVpbicpO1xudmFyIExvZ2dlciA9IHJlcXVpcmUoJy4uL3V0aWxzL2xvZ2dlcicpO1xudmFyIGxvZ2dlciA9IExvZ2dlci5sb2dnZXIoJ2lucHV0RmlsdGVyJyk7XG52YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMvdXRpbHMnKTtcbnZhciBBbGdvbCA9IHJlcXVpcmUoJy4vYWxnb2wnKTtcbnZhciBicmVha2Rvd24gPSByZXF1aXJlKCcuL2JyZWFrZG93bicpO1xudmFyIEFueU9iamVjdCA9IE9iamVjdDtcbnZhciBkZWJ1Z2xvZyA9IGRlYnVnKCdpbnB1dEZpbHRlcicpO1xudmFyIG1hdGNoZGF0YSA9IHJlcXVpcmUoJy4vbWF0Y2hkYXRhJyk7XG52YXIgb1VuaXRUZXN0cyA9IG1hdGNoZGF0YS5vVW5pdFRlc3RzO1xuLyoqXG4gKiBAcGFyYW0gc1RleHQge3N0cmluZ30gdGhlIHRleHQgdG8gbWF0Y2ggdG8gTmF2VGFyZ2V0UmVzb2x1dGlvblxuICogQHBhcmFtIHNUZXh0MiB7c3RyaW5nfSB0aGUgcXVlcnkgdGV4dCwgZS5nLiBOYXZUYXJnZXRcbiAqXG4gKiBAcmV0dXJuIHRoZSBkaXN0YW5jZSwgbm90ZSB0aGF0IGlzIGlzICpub3QqIHN5bW1ldHJpYyFcbiAqL1xuZnVuY3Rpb24gY2FsY0Rpc3RhbmNlKHNUZXh0MSwgc1RleHQyKSB7XG4gICAgLy8gY29uc29sZS5sb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxuICAgIHZhciBhMCA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCksIHNUZXh0Mik7XG4gICAgdmFyIGEgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEudG9Mb3dlckNhc2UoKSwgc1RleHQyKTtcbiAgICByZXR1cm4gYTAgKiA1MDAgLyBzVGV4dDIubGVuZ3RoICsgYTtcbn1cbnZhciBJRk1hdGNoID0gcmVxdWlyZSgnLi4vbWF0Y2gvaWZtYXRjaCcpO1xudmFyIGxldmVuQ3V0b2ZmID0gQWxnb2wuQ3V0b2ZmX0xldmVuU2h0ZWluO1xuZnVuY3Rpb24gbGV2ZW5QZW5hbHR5KGkpIHtcbiAgICAvLyAwLT4gMVxuICAgIC8vIDEgLT4gMC4xXG4gICAgLy8gMTUwIC0+ICAwLjhcbiAgICBpZiAoaSA9PT0gMCkge1xuICAgICAgICByZXR1cm4gMTtcbiAgICB9XG4gICAgLy8gcmV2ZXJzZSBtYXkgYmUgYmV0dGVyIHRoYW4gbGluZWFyXG4gICAgcmV0dXJuIDEgKyBpICogKDAuOCAtIDEpIC8gMTUwO1xufVxuZXhwb3J0cy5sZXZlblBlbmFsdHkgPSBsZXZlblBlbmFsdHk7XG5mdW5jdGlvbiBub25Qcml2YXRlS2V5cyhvQSkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhvQSkuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIGtleVswXSAhPT0gJ18nO1xuICAgIH0pO1xufVxuZnVuY3Rpb24gY291bnRBaW5CKG9BLCBvQiwgZm5Db21wYXJlLCBhS2V5SWdub3JlKSB7XG4gICAgYUtleUlnbm9yZSA9IEFycmF5LmlzQXJyYXkoYUtleUlnbm9yZSkgPyBhS2V5SWdub3JlIDpcbiAgICAgICAgdHlwZW9mIGFLZXlJZ25vcmUgPT09IFwic3RyaW5nXCIgPyBbYUtleUlnbm9yZV0gOiBbXTtcbiAgICBmbkNvbXBhcmUgPSBmbkNvbXBhcmUgfHwgZnVuY3Rpb24gKCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICByZXR1cm4gbm9uUHJpdmF0ZUtleXMob0EpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHJldHVybiBhS2V5SWdub3JlLmluZGV4T2Yoa2V5KSA8IDA7XG4gICAgfSkuXG4gICAgICAgIHJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgKGZuQ29tcGFyZShvQVtrZXldLCBvQltrZXldLCBrZXkpID8gMSA6IDApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIDApO1xufVxuZXhwb3J0cy5jb3VudEFpbkIgPSBjb3VudEFpbkI7XG5mdW5jdGlvbiBzcHVyaW91c0Fub3RJbkIob0EsIG9CLCBhS2V5SWdub3JlKSB7XG4gICAgYUtleUlnbm9yZSA9IEFycmF5LmlzQXJyYXkoYUtleUlnbm9yZSkgPyBhS2V5SWdub3JlIDpcbiAgICAgICAgdHlwZW9mIGFLZXlJZ25vcmUgPT09IFwic3RyaW5nXCIgPyBbYUtleUlnbm9yZV0gOiBbXTtcbiAgICByZXR1cm4gbm9uUHJpdmF0ZUtleXMob0EpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHJldHVybiBhS2V5SWdub3JlLmluZGV4T2Yoa2V5KSA8IDA7XG4gICAgfSkuXG4gICAgICAgIHJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XG4gICAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9CLCBrZXkpKSB7XG4gICAgICAgICAgICBwcmV2ID0gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG59XG5leHBvcnRzLnNwdXJpb3VzQW5vdEluQiA9IHNwdXJpb3VzQW5vdEluQjtcbmZ1bmN0aW9uIGxvd2VyQ2FzZShvKSB7XG4gICAgaWYgKHR5cGVvZiBvID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIHJldHVybiBvLnRvTG93ZXJDYXNlKCk7XG4gICAgfVxuICAgIHJldHVybiBvO1xufVxuZnVuY3Rpb24gY29tcGFyZUNvbnRleHQob0EsIG9CLCBhS2V5SWdub3JlKSB7XG4gICAgdmFyIGVxdWFsID0gY291bnRBaW5CKG9BLCBvQiwgZnVuY3Rpb24gKGEsIGIpIHsgcmV0dXJuIGxvd2VyQ2FzZShhKSA9PT0gbG93ZXJDYXNlKGIpOyB9LCBhS2V5SWdub3JlKTtcbiAgICB2YXIgZGlmZmVyZW50ID0gY291bnRBaW5CKG9BLCBvQiwgZnVuY3Rpb24gKGEsIGIpIHsgcmV0dXJuIGxvd2VyQ2FzZShhKSAhPT0gbG93ZXJDYXNlKGIpOyB9LCBhS2V5SWdub3JlKTtcbiAgICB2YXIgc3B1cmlvdXNMID0gc3B1cmlvdXNBbm90SW5CKG9BLCBvQiwgYUtleUlnbm9yZSk7XG4gICAgdmFyIHNwdXJpb3VzUiA9IHNwdXJpb3VzQW5vdEluQihvQiwgb0EsIGFLZXlJZ25vcmUpO1xuICAgIHJldHVybiB7XG4gICAgICAgIGVxdWFsOiBlcXVhbCxcbiAgICAgICAgZGlmZmVyZW50OiBkaWZmZXJlbnQsXG4gICAgICAgIHNwdXJpb3VzTDogc3B1cmlvdXNMLFxuICAgICAgICBzcHVyaW91c1I6IHNwdXJpb3VzUlxuICAgIH07XG59XG5leHBvcnRzLmNvbXBhcmVDb250ZXh0ID0gY29tcGFyZUNvbnRleHQ7XG5mdW5jdGlvbiBzb3J0QnlSYW5rKGEsIGIpIHtcbiAgICB2YXIgciA9IC0oKGEuX3JhbmtpbmcgfHwgMS4wKSAtIChiLl9yYW5raW5nIHx8IDEuMCkpO1xuICAgIGlmIChyKSB7XG4gICAgICAgIHJldHVybiByO1xuICAgIH1cbiAgICBpZiAoYS5jYXRlZ29yeSAmJiBiLmNhdGVnb3J5KSB7XG4gICAgICAgIHIgPSBhLmNhdGVnb3J5LmxvY2FsZUNvbXBhcmUoYi5jYXRlZ29yeSk7XG4gICAgICAgIGlmIChyKSB7XG4gICAgICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoYS5tYXRjaGVkU3RyaW5nICYmIGIubWF0Y2hlZFN0cmluZykge1xuICAgICAgICByID0gYS5tYXRjaGVkU3RyaW5nLmxvY2FsZUNvbXBhcmUoYi5tYXRjaGVkU3RyaW5nKTtcbiAgICAgICAgaWYgKHIpIHtcbiAgICAgICAgICAgIHJldHVybiByO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiAwO1xufVxuZnVuY3Rpb24gY2F0ZWdvcml6ZVN0cmluZyhzdHJpbmcsIGV4YWN0LCBvUnVsZXMpIHtcbiAgICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXG4gICAgZGVidWcoXCJydWxlcyA6IFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGVzKSk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIG9SdWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChvUnVsZSkge1xuICAgICAgICBkZWJ1Z2xvZygnYXR0ZW1wdGluZyB0byBtYXRjaCBydWxlICcgKyBKU09OLnN0cmluZ2lmeShvUnVsZSkgKyBcIiB0byBzdHJpbmcgXFxcIlwiICsgc3RyaW5nICsgXCJcXFwiXCIpO1xuICAgICAgICBzd2l0Y2ggKG9SdWxlLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgMCAvKiBXT1JEICovOlxuICAgICAgICAgICAgICAgIGlmIChleGFjdCAmJiBvUnVsZS53b3JkID09PSBzdHJpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBvUnVsZS5tYXRjaGVkU3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFleGFjdCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGV2ZW5tYXRjaCA9IGNhbGNEaXN0YW5jZShvUnVsZS53b3JkLCBzdHJpbmcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobGV2ZW5tYXRjaCA8IGxldmVuQ3V0b2ZmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUud29yZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IChvUnVsZS5fcmFua2luZyB8fCAxLjApICogbGV2ZW5QZW5hbHR5KGxldmVubWF0Y2gpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldmVubWF0Y2g6IGxldmVubWF0Y2hcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAxIC8qIFJFR0VYUCAqLzpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KFwiIGhlcmUgcmVnZXhwXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSkpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbSA9IG9SdWxlLnJlZ2V4cC5leGVjKHN0cmluZyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogKG9SdWxlLm1hdGNoSW5kZXggIT09IHVuZGVmaW5lZCAmJiBtW29SdWxlLm1hdGNoSW5kZXhdKSB8fCBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmtub3duIHR5cGVcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJlcy5zb3J0KHNvcnRCeVJhbmspO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmNhdGVnb3JpemVTdHJpbmcgPSBjYXRlZ29yaXplU3RyaW5nO1xuLyoqXG4gKlxuICogT3B0aW9ucyBtYXkgYmUge1xuICogbWF0Y2hvdGhlcnMgOiB0cnVlLCAgPT4gb25seSBydWxlcyB3aGVyZSBhbGwgb3RoZXJzIG1hdGNoIGFyZSBjb25zaWRlcmVkXG4gKiBhdWdtZW50IDogdHJ1ZSxcbiAqIG92ZXJyaWRlIDogdHJ1ZSB9ICA9PlxuICpcbiAqL1xuZnVuY3Rpb24gbWF0Y2hXb3JkKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBzMSA9IGNvbnRleHRbb1J1bGUua2V5XS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciBzMiA9IG9SdWxlLndvcmQudG9Mb3dlckNhc2UoKTtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB2YXIgZGVsdGEgPSBjb21wYXJlQ29udGV4dChjb250ZXh0LCBvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlbHRhKSk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkob3B0aW9ucykpO1xuICAgIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgYyA9IGNhbGNEaXN0YW5jZShzMiwgczEpO1xuICAgIGRlYnVnbG9nKFwiIHMxIDw+IHMyIFwiICsgczEgKyBcIjw+XCIgKyBzMiArIFwiICA9PjogXCIgKyBjKTtcbiAgICBpZiAoYyA8IDE1MCkge1xuICAgICAgICB2YXIgcmVzID0gQW55T2JqZWN0LmFzc2lnbih7fSwgb1J1bGUuZm9sbG93cyk7XG4gICAgICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcbiAgICAgICAgaWYgKG9wdGlvbnMub3ZlcnJpZGUpIHtcbiAgICAgICAgICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvUnVsZS5mb2xsb3dzKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBmb3JjZSBrZXkgcHJvcGVydHlcbiAgICAgICAgLy8gY29uc29sZS5sb2coJyBvYmplY3RjYXRlZ29yeScsIHJlc1snc3lzdGVtT2JqZWN0Q2F0ZWdvcnknXSk7XG4gICAgICAgIHJlc1tvUnVsZS5rZXldID0gb1J1bGUuZm9sbG93c1tvUnVsZS5rZXldIHx8IHJlc1tvUnVsZS5rZXldO1xuICAgICAgICByZXMuX3dlaWdodCA9IEFueU9iamVjdC5hc3NpZ24oe30sIHJlcy5fd2VpZ2h0KTtcbiAgICAgICAgcmVzLl93ZWlnaHRbb1J1bGUua2V5XSA9IGM7XG4gICAgICAgIE9iamVjdC5mcmVlemUocmVzKTtcbiAgICAgICAgZGVidWdsb2coJ0ZvdW5kIG9uZScgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xufVxuZXhwb3J0cy5tYXRjaFdvcmQgPSBtYXRjaFdvcmQ7XG5mdW5jdGlvbiBleHRyYWN0QXJnc01hcChtYXRjaCwgYXJnc01hcCkge1xuICAgIHZhciByZXMgPSB7fTtcbiAgICBpZiAoIWFyZ3NNYXApIHtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG4gICAgT2JqZWN0LmtleXMoYXJnc01hcCkuZm9yRWFjaChmdW5jdGlvbiAoaUtleSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBtYXRjaFtpS2V5XTtcbiAgICAgICAgdmFyIGtleSA9IGFyZ3NNYXBbaUtleV07XG4gICAgICAgIGlmICgodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKSAmJiB2YWx1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXNba2V5XSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZXh0cmFjdEFyZ3NNYXAgPSBleHRyYWN0QXJnc01hcDtcbmV4cG9ydHMuUmFua1dvcmQgPSB7XG4gICAgaGFzQWJvdmU6IGZ1bmN0aW9uIChsc3QsIGJvcmRlcikge1xuICAgICAgICByZXR1cm4gIWxzdC5ldmVyeShmdW5jdGlvbiAob01lbWJlcikge1xuICAgICAgICAgICAgcmV0dXJuIChvTWVtYmVyLl9yYW5raW5nIDwgYm9yZGVyKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICB0YWtlRmlyc3ROOiBmdW5jdGlvbiAobHN0LCBuKSB7XG4gICAgICAgIHJldHVybiBsc3QuZmlsdGVyKGZ1bmN0aW9uIChvTWVtYmVyLCBpSW5kZXgpIHtcbiAgICAgICAgICAgIHZhciBsYXN0UmFua2luZyA9IDEuMDtcbiAgICAgICAgICAgIGlmICgoaUluZGV4IDwgbikgfHwgb01lbWJlci5fcmFua2luZyA9PT0gbGFzdFJhbmtpbmcpIHtcbiAgICAgICAgICAgICAgICBsYXN0UmFua2luZyA9IG9NZW1iZXIuX3Jhbmtpbmc7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgdGFrZUFib3ZlOiBmdW5jdGlvbiAobHN0LCBib3JkZXIpIHtcbiAgICAgICAgcmV0dXJuIGxzdC5maWx0ZXIoZnVuY3Rpb24gKG9NZW1iZXIpIHtcbiAgICAgICAgICAgIHJldHVybiAob01lbWJlci5fcmFua2luZyA+PSBib3JkZXIpO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuZnVuY3Rpb24gY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZihzV29yZEdyb3VwLCBhUnVsZXMpIHtcbiAgICB2YXIgc2Vlbkl0ID0gY2F0ZWdvcml6ZVN0cmluZyhzV29yZEdyb3VwLCB0cnVlLCBhUnVsZXMpO1xuICAgIGlmIChleHBvcnRzLlJhbmtXb3JkLmhhc0Fib3ZlKHNlZW5JdCwgMC44KSkge1xuICAgICAgICBzZWVuSXQgPSBleHBvcnRzLlJhbmtXb3JkLnRha2VBYm92ZShzZWVuSXQsIDAuOCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBzZWVuSXQgPSBjYXRlZ29yaXplU3RyaW5nKHNXb3JkR3JvdXAsIGZhbHNlLCBhUnVsZXMpO1xuICAgIH1cbiAgICBzZWVuSXQgPSBleHBvcnRzLlJhbmtXb3JkLnRha2VGaXJzdE4oc2Vlbkl0LCBBbGdvbC5Ub3BfTl9Xb3JkQ2F0ZWdvcml6YXRpb25zKTtcbiAgICByZXR1cm4gc2Vlbkl0O1xufVxuZXhwb3J0cy5jYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmID0gY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZjtcbmZ1bmN0aW9uIGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZFNlbnRlbmNlKG9TZW50ZW5jZSkge1xuICAgIHJldHVybiBvU2VudGVuY2UuZXZlcnkoZnVuY3Rpb24gKG9Xb3JkR3JvdXApIHtcbiAgICAgICAgcmV0dXJuIChvV29yZEdyb3VwLmxlbmd0aCA+IDApO1xuICAgIH0pO1xufVxuZXhwb3J0cy5maWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWRTZW50ZW5jZSA9IGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZFNlbnRlbmNlO1xuZnVuY3Rpb24gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkKGFycikge1xuICAgIHJldHVybiBhcnIuZmlsdGVyKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgcmV0dXJuIGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZFNlbnRlbmNlKG9TZW50ZW5jZSk7XG4gICAgfSk7XG59XG5leHBvcnRzLmZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZCA9IGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZDtcbmZ1bmN0aW9uIGNhdGVnb3JpemVBV29yZChzV29yZEdyb3VwLCBhUnVsZXMsIHNTdHJpbmcsIHdvcmRzKSB7XG4gICAgdmFyIHNlZW5JdCA9IHdvcmRzW3NXb3JkR3JvdXBdO1xuICAgIGlmIChzZWVuSXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBzZWVuSXQgPSBjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmKHNXb3JkR3JvdXAsIGFSdWxlcyk7XG4gICAgICAgIGlmIChzZWVuSXQgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHdvcmRzW3NXb3JkR3JvdXBdID0gc2Vlbkl0O1xuICAgIH1cbiAgICBpZiAoIXNlZW5JdCB8fCBzZWVuSXQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGxvZ2dlcihcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIFxcXCJcIiArIHNXb3JkR3JvdXAgKyBcIlxcXCIgaW4gc2VudGVuY2UgXFxcIlwiXG4gICAgICAgICAgICArIHNTdHJpbmcgKyBcIlxcXCJcIik7XG4gICAgICAgIGlmIChzV29yZEdyb3VwLmluZGV4T2YoXCIgXCIpIDw9IDApIHtcbiAgICAgICAgICAgIGRlYnVnbG9nKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgcHJpbWl0aXZlICghKVwiICsgc1dvcmRHcm91cCk7XG4gICAgICAgIH1cbiAgICAgICAgZGVidWdsb2coXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBcIiArIHNXb3JkR3JvdXApO1xuICAgICAgICBpZiAoIXNlZW5JdCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0aW5nIGVtdHB5IGxpc3QsIG5vdCB1bmRlZmluZWQgZm9yIFxcXCJcIiArIHNXb3JkR3JvdXAgKyBcIlxcXCJcIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICByZXR1cm4gc2Vlbkl0O1xufVxuZXhwb3J0cy5jYXRlZ29yaXplQVdvcmQgPSBjYXRlZ29yaXplQVdvcmQ7XG4vKipcbiAqIEdpdmVuIGEgIHN0cmluZywgYnJlYWsgaXQgZG93biBpbnRvIGNvbXBvbmVudHMsXG4gKiBbWydBJywgJ0InXSwgWydBIEInXV1cbiAqXG4gKiB0aGVuIGNhdGVnb3JpemVXb3Jkc1xuICogcmV0dXJuaW5nXG4gKlxuICogWyBbWyB7IGNhdGVnb3J5OiAnc3lzdGVtSWQnLCB3b3JkIDogJ0EnfSxcbiAqICAgICAgeyBjYXRlZ29yeTogJ290aGVydGhpbmcnLCB3b3JkIDogJ0EnfVxuICogICAgXSxcbiAqICAgIC8vIHJlc3VsdCBvZiBCXG4gKiAgICBbIHsgY2F0ZWdvcnk6ICdzeXN0ZW1JZCcsIHdvcmQgOiAnQid9LFxuICogICAgICB7IGNhdGVnb3J5OiAnb3RoZXJ0aGluZycsIHdvcmQgOiAnQSd9XG4gKiAgICAgIHsgY2F0ZWdvcnk6ICdhbm90aGVydHJ5cCcsIHdvcmQgOiAnQid9XG4gKiAgICBdXG4gKiAgIF0sXG4gKiBdXV1cbiAqXG4gKlxuICpcbiAqL1xuZnVuY3Rpb24gYW5hbHl6ZVN0cmluZyhzU3RyaW5nLCBhUnVsZXMpIHtcbiAgICB2YXIgY250ID0gMDtcbiAgICB2YXIgZmFjID0gMTtcbiAgICB2YXIgdSA9IGJyZWFrZG93bi5icmVha2Rvd25TdHJpbmcoc1N0cmluZyk7XG4gICAgZGVidWdsb2coXCJoZXJlIGJyZWFrZG93blwiICsgSlNPTi5zdHJpbmdpZnkodSkpO1xuICAgIHZhciB3b3JkcyA9IHt9O1xuICAgIHZhciByZXMgPSB1Lm1hcChmdW5jdGlvbiAoYUFycikge1xuICAgICAgICByZXR1cm4gYUFyci5tYXAoZnVuY3Rpb24gKHNXb3JkR3JvdXApIHtcbiAgICAgICAgICAgIHZhciBzZWVuSXQgPSBjYXRlZ29yaXplQVdvcmQoc1dvcmRHcm91cCwgYVJ1bGVzLCBzU3RyaW5nLCB3b3Jkcyk7XG4gICAgICAgICAgICBjbnQgPSBjbnQgKyBzZWVuSXQubGVuZ3RoO1xuICAgICAgICAgICAgZmFjID0gZmFjICogc2Vlbkl0Lmxlbmd0aDtcbiAgICAgICAgICAgIHJldHVybiBzZWVuSXQ7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJlcyA9IGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZChyZXMpO1xuICAgIGRlYnVnbG9nKFwiIHNlbnRlbmNlcyBcIiArIHUubGVuZ3RoICsgXCIgbWF0Y2hlcyBcIiArIGNudCArIFwiIGZhYzogXCIgKyBmYWMpO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmFuYWx5emVTdHJpbmcgPSBhbmFseXplU3RyaW5nO1xuLypcblsgW2EsYl0sIFtjLGRdXVxuXG4wMCBhXG4wMSBiXG4xMCBjXG4xMSBkXG4xMiBjXG4qL1xudmFyIGNsb25lID0gdXRpbHMuY2xvbmVEZWVwO1xuLy8gd2UgY2FuIHJlcGxpY2F0ZSB0aGUgdGFpbCBvciB0aGUgaGVhZCxcbi8vIHdlIHJlcGxpY2F0ZSB0aGUgdGFpbCBhcyBpdCBpcyBzbWFsbGVyLlxuLy8gW2EsYixjIF1cbmZ1bmN0aW9uIGV4cGFuZE1hdGNoQXJyKGRlZXApIHtcbiAgICB2YXIgYSA9IFtdO1xuICAgIHZhciBsaW5lID0gW107XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZGVlcCkpO1xuICAgIGRlZXAuZm9yRWFjaChmdW5jdGlvbiAodUJyZWFrRG93bkxpbmUsIGlJbmRleCkge1xuICAgICAgICBsaW5lW2lJbmRleF0gPSBbXTtcbiAgICAgICAgdUJyZWFrRG93bkxpbmUuZm9yRWFjaChmdW5jdGlvbiAoYVdvcmRHcm91cCwgd2dJbmRleCkge1xuICAgICAgICAgICAgbGluZVtpSW5kZXhdW3dnSW5kZXhdID0gW107XG4gICAgICAgICAgICBhV29yZEdyb3VwLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkVmFyaWFudCwgaVdWSW5kZXgpIHtcbiAgICAgICAgICAgICAgICBsaW5lW2lJbmRleF1bd2dJbmRleF1baVdWSW5kZXhdID0gb1dvcmRWYXJpYW50O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGxpbmUpKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgdmFyIG52ZWNzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciB2ZWNzID0gW1tdXTtcbiAgICAgICAgdmFyIG52ZWNzID0gW107XG4gICAgICAgIHZhciBydmVjID0gW107XG4gICAgICAgIGZvciAodmFyIGsgPSAwOyBrIDwgbGluZVtpXS5sZW5ndGg7ICsraykge1xuICAgICAgICAgICAgLy92ZWNzIGlzIHRoZSB2ZWN0b3Igb2YgYWxsIHNvIGZhciBzZWVuIHZhcmlhbnRzIHVwIHRvIGsgd2dzLlxuICAgICAgICAgICAgdmFyIG5leHRCYXNlID0gW107XG4gICAgICAgICAgICBmb3IgKHZhciBsID0gMDsgbCA8IGxpbmVbaV1ba10ubGVuZ3RoOyArK2wpIHtcbiAgICAgICAgICAgICAgICAvL2RlYnVnbG9nKFwidmVjcyBub3dcIiArIEpTT04uc3RyaW5naWZ5KHZlY3MpKTtcbiAgICAgICAgICAgICAgICBudmVjcyA9IFtdOyAvL3ZlY3Muc2xpY2UoKTsgLy8gY29weSB0aGUgdmVjW2ldIGJhc2UgdmVjdG9yO1xuICAgICAgICAgICAgICAgIC8vZGVidWdsb2coXCJ2ZWNzIGNvcGllZCBub3dcIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgdSA9IDA7IHUgPCB2ZWNzLmxlbmd0aDsgKyt1KSB7XG4gICAgICAgICAgICAgICAgICAgIG52ZWNzW3VdID0gdmVjc1t1XS5zbGljZSgpOyAvL1xuICAgICAgICAgICAgICAgICAgICAvLyBkZWJ1Z2xvZyhcImNvcGllZCB2ZWNzW1wiKyB1K1wiXVwiICsgSlNPTi5zdHJpbmdpZnkodmVjc1t1XSkpO1xuICAgICAgICAgICAgICAgICAgICBudmVjc1t1XS5wdXNoKGNsb25lKGxpbmVbaV1ba11bbF0pKTsgLy8gcHVzaCB0aGUgbHRoIHZhcmlhbnRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gICBkZWJ1Z2xvZyhcIiBhdCAgICAgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbmV4dGJhc2UgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxuICAgICAgICAgICAgICAgIC8vICAgZGVidWdsb2coXCIgYXBwZW5kIFwiICsgayArIFwiOlwiICsgbCArIFwiIG52ZWNzICAgID5cIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSlcbiAgICAgICAgICAgICAgICBuZXh0QmFzZSA9IG5leHRCYXNlLmNvbmNhdChudmVjcyk7XG4gICAgICAgICAgICB9IC8vY29uc3RydVxuICAgICAgICAgICAgLy8gIGRlYnVnbG9nKFwibm93IGF0IFwiICsgayArIFwiOlwiICsgbCArIFwiID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcbiAgICAgICAgICAgIHZlY3MgPSBuZXh0QmFzZTtcbiAgICAgICAgfVxuICAgICAgICBkZWJ1Z2xvZyhcIkFQUEVORElORyBUTyBSRVNcIiArIGkgKyBcIjpcIiArIGwgKyBcIiA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpO1xuICAgICAgICByZXMgPSByZXMuY29uY2F0KHZlY3MpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5leHBhbmRNYXRjaEFyciA9IGV4cGFuZE1hdGNoQXJyO1xuLyoqXG4gKiBDYWxjdWxhdGUgYSB3ZWlnaHQgZmFjdG9yIGZvciBhIGdpdmVuIGRpc3RhbmNlIGFuZFxuICogY2F0ZWdvcnlcbiAqIEBwYXJhbSB7aW50ZWdlcn0gZGlzdCBkaXN0YW5jZSBpbiB3b3Jkc1xuICogQHBhcmFtIHtzdHJpbmd9IGNhdGVnb3J5IGNhdGVnb3J5IHRvIHVzZVxuICogQHJldHVybnMge251bWJlcn0gYSBkaXN0YW5jZSBmYWN0b3IgPj0gMVxuICogIDEuMCBmb3Igbm8gZWZmZWN0XG4gKi9cbmZ1bmN0aW9uIHJlaW5mb3JjZURpc3RXZWlnaHQoZGlzdCwgY2F0ZWdvcnkpIHtcbiAgICB2YXIgYWJzID0gTWF0aC5hYnMoZGlzdCk7XG4gICAgcmV0dXJuIDEuMCArIChBbGdvbC5hUmVpbmZvcmNlRGlzdFdlaWdodFthYnNdIHx8IDApO1xufVxuZXhwb3J0cy5yZWluZm9yY2VEaXN0V2VpZ2h0ID0gcmVpbmZvcmNlRGlzdFdlaWdodDtcbi8qKlxuICogR2l2ZW4gYSBzZW50ZW5jZSwgZXh0YWN0IGNhdGVnb3JpZXNcbiAqL1xuZnVuY3Rpb24gZXh0cmFjdENhdGVnb3J5TWFwKG9TZW50ZW5jZSkge1xuICAgIHZhciByZXMgPSB7fTtcbiAgICBkZWJ1Z2xvZygnZXh0cmFjdENhdGVnb3J5TWFwICcgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpKTtcbiAgICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGlJbmRleCkge1xuICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IElGTWF0Y2guQ0FUX0NBVEVHT1JZKSB7XG4gICAgICAgICAgICByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10gfHwgW107XG4gICAgICAgICAgICByZXNbb1dvcmQubWF0Y2hlZFN0cmluZ10ucHVzaCh7IHBvczogaUluZGV4IH0pO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgdXRpbHMuZGVlcEZyZWV6ZShyZXMpO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmV4dHJhY3RDYXRlZ29yeU1hcCA9IGV4dHJhY3RDYXRlZ29yeU1hcDtcbmZ1bmN0aW9uIHJlaW5Gb3JjZVNlbnRlbmNlKG9TZW50ZW5jZSkge1xuICAgIHZhciBvQ2F0ZWdvcnlNYXAgPSBleHRyYWN0Q2F0ZWdvcnlNYXAob1NlbnRlbmNlKTtcbiAgICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGlJbmRleCkge1xuICAgICAgICB2YXIgbSA9IG9DYXRlZ29yeU1hcFtvV29yZC5jYXRlZ29yeV0gfHwgW107XG4gICAgICAgIG0uZm9yRWFjaChmdW5jdGlvbiAob1Bvc2l0aW9uKSB7XG4gICAgICAgICAgICBvV29yZC5yZWluZm9yY2UgPSBvV29yZC5yZWluZm9yY2UgfHwgMTtcbiAgICAgICAgICAgIHZhciBib29zdCA9IHJlaW5mb3JjZURpc3RXZWlnaHQoaUluZGV4IC0gb1Bvc2l0aW9uLnBvcywgb1dvcmQuY2F0ZWdvcnkpO1xuICAgICAgICAgICAgb1dvcmQucmVpbmZvcmNlICo9IGJvb3N0O1xuICAgICAgICAgICAgb1dvcmQuX3JhbmtpbmcgKj0gYm9vc3Q7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiBvU2VudGVuY2U7XG59XG5leHBvcnRzLnJlaW5Gb3JjZVNlbnRlbmNlID0gcmVpbkZvcmNlU2VudGVuY2U7XG52YXIgU2VudGVuY2UgPSByZXF1aXJlKCcuL3NlbnRlbmNlJyk7XG5mdW5jdGlvbiByZWluRm9yY2UoYUNhdGVnb3JpemVkQXJyYXkpIHtcbiAgICBhQ2F0ZWdvcml6ZWRBcnJheS5mb3JFYWNoKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgcmVpbkZvcmNlU2VudGVuY2Uob1NlbnRlbmNlKTtcbiAgICB9KTtcbiAgICBhQ2F0ZWdvcml6ZWRBcnJheS5zb3J0KFNlbnRlbmNlLmNtcFJhbmtpbmdQcm9kdWN0KTtcbiAgICBkZWJ1Z2xvZyhcImFmdGVyIHJlaW5mb3JjZVwiICsgYUNhdGVnb3JpemVkQXJyYXkubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgcmV0dXJuIGFDYXRlZ29yaXplZEFycmF5O1xufVxuZXhwb3J0cy5yZWluRm9yY2UgPSByZWluRm9yY2U7XG4vLy8gYmVsb3cgbWF5IG5vIGxvbmdlciBiZSB1c2VkXG5mdW5jdGlvbiBtYXRjaFJlZ0V4cChvUnVsZSwgY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChjb250ZXh0W29SdWxlLmtleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgc0tleSA9IG9SdWxlLmtleTtcbiAgICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgcmVnID0gb1J1bGUucmVnZXhwO1xuICAgIHZhciBtID0gcmVnLmV4ZWMoczEpO1xuICAgIGRlYnVnbG9nKFwiYXBwbHlpbmcgcmVnZXhwOiBcIiArIHMxICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XG4gICAgaWYgKCFtKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsIG9SdWxlLmZvbGxvd3MsIG9SdWxlLmtleSk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XG4gICAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBvRXh0cmFjdGVkQ29udGV4dCA9IGV4dHJhY3RBcmdzTWFwKG0sIG9SdWxlLmFyZ3NNYXApO1xuICAgIGRlYnVnbG9nKFwiZXh0cmFjdGVkIGFyZ3MgXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZS5hcmdzTWFwKSk7XG4gICAgZGVidWdsb2coXCJtYXRjaCBcIiArIEpTT04uc3RyaW5naWZ5KG0pKTtcbiAgICBkZWJ1Z2xvZyhcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob0V4dHJhY3RlZENvbnRleHQpKTtcbiAgICB2YXIgcmVzID0gQW55T2JqZWN0LmFzc2lnbih7fSwgb1J1bGUuZm9sbG93cyk7XG4gICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9FeHRyYWN0ZWRDb250ZXh0KTtcbiAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgY29udGV4dCk7XG4gICAgaWYgKG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVzW3NLZXldID0gb0V4dHJhY3RlZENvbnRleHRbc0tleV07XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XG4gICAgICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvUnVsZS5mb2xsb3dzKTtcbiAgICAgICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9FeHRyYWN0ZWRDb250ZXh0KTtcbiAgICB9XG4gICAgT2JqZWN0LmZyZWV6ZShyZXMpO1xuICAgIGRlYnVnbG9nKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5tYXRjaFJlZ0V4cCA9IG1hdGNoUmVnRXhwO1xuZnVuY3Rpb24gc29ydEJ5V2VpZ2h0KHNLZXksIG9Db250ZXh0QSwgb0NvbnRleHRCKSB7XG4gICAgZGVidWdsb2coJ3NvcnRpbmc6ICcgKyBzS2V5ICsgJ2ludm9rZWQgd2l0aFxcbiAxOicgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEEsIHVuZGVmaW5lZCwgMikgK1xuICAgICAgICBcIiB2cyBcXG4gMjpcIiArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QiwgdW5kZWZpbmVkLCAyKSk7XG4gICAgdmFyIHJhbmtpbmdBID0gcGFyc2VGbG9hdChvQ29udGV4dEFbXCJfcmFua2luZ1wiXSB8fCBcIjFcIik7XG4gICAgdmFyIHJhbmtpbmdCID0gcGFyc2VGbG9hdChvQ29udGV4dEJbXCJfcmFua2luZ1wiXSB8fCBcIjFcIik7XG4gICAgaWYgKHJhbmtpbmdBICE9PSByYW5raW5nQikge1xuICAgICAgICBkZWJ1Z2xvZyhcIiByYW5raW4gZGVsdGFcIiArIDEwMCAqIChyYW5raW5nQiAtIHJhbmtpbmdBKSk7XG4gICAgICAgIHJldHVybiAxMDAgKiAocmFua2luZ0IgLSByYW5raW5nQSk7XG4gICAgfVxuICAgIHZhciB3ZWlnaHRBID0gb0NvbnRleHRBW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdW3NLZXldIHx8IDA7XG4gICAgdmFyIHdlaWdodEIgPSBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QltcIl93ZWlnaHRcIl1bc0tleV0gfHwgMDtcbiAgICByZXR1cm4gKyh3ZWlnaHRBIC0gd2VpZ2h0Qik7XG59XG5leHBvcnRzLnNvcnRCeVdlaWdodCA9IHNvcnRCeVdlaWdodDtcbi8vIFdvcmQsIFN5bm9ueW0sIFJlZ2V4cCAvIEV4dHJhY3Rpb25SdWxlXG5mdW5jdGlvbiBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgb1J1bGVzLCBvcHRpb25zKSB7XG4gICAgdmFyIHNLZXkgPSBvUnVsZXNbMF0ua2V5O1xuICAgIC8vIGNoZWNrIHRoYXQgcnVsZVxuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIC8vIGNoZWNrIGNvbnNpc3RlbmN5XG4gICAgICAgIG9SdWxlcy5ldmVyeShmdW5jdGlvbiAoaVJ1bGUpIHtcbiAgICAgICAgICAgIGlmIChpUnVsZS5rZXkgIT09IHNLZXkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbmhvbW9nZW5vdXMga2V5cyBpbiBydWxlcywgZXhwZWN0ZWQgXCIgKyBzS2V5ICsgXCIgd2FzIFwiICsgSlNPTi5zdHJpbmdpZnkoaVJ1bGUpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8gbG9vayBmb3IgcnVsZXMgd2hpY2ggbWF0Y2hcbiAgICB2YXIgcmVzID0gb1J1bGVzLm1hcChmdW5jdGlvbiAob1J1bGUpIHtcbiAgICAgICAgLy8gaXMgdGhpcyBydWxlIGFwcGxpY2FibGVcbiAgICAgICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlIDAgLyogV09SRCAqLzpcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2hXb3JkKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKTtcbiAgICAgICAgICAgIGNhc2UgMSAvKiBSRUdFWFAgKi86XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hdGNoUmVnRXhwKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0pLmZpbHRlcihmdW5jdGlvbiAob3Jlcykge1xuICAgICAgICByZXR1cm4gISFvcmVzO1xuICAgIH0pLnNvcnQoc29ydEJ5V2VpZ2h0LmJpbmQodGhpcywgc0tleSkpO1xuICAgIHJldHVybiByZXM7XG4gICAgLy8gT2JqZWN0LmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgLy8gfSk7XG59XG5leHBvcnRzLmF1Z21lbnRDb250ZXh0MSA9IGF1Z21lbnRDb250ZXh0MTtcbmZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0KGNvbnRleHQsIGFSdWxlcykge1xuICAgIHZhciBvcHRpb25zMSA9IHtcbiAgICAgICAgbWF0Y2hvdGhlcnM6IHRydWUsXG4gICAgICAgIG92ZXJyaWRlOiBmYWxzZVxuICAgIH07XG4gICAgdmFyIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMSk7XG4gICAgaWYgKGFSZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHZhciBvcHRpb25zMiA9IHtcbiAgICAgICAgICAgIG1hdGNob3RoZXJzOiBmYWxzZSxcbiAgICAgICAgICAgIG92ZXJyaWRlOiB0cnVlXG4gICAgICAgIH07XG4gICAgICAgIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMik7XG4gICAgfVxuICAgIHJldHVybiBhUmVzO1xufVxuZXhwb3J0cy5hdWdtZW50Q29udGV4dCA9IGF1Z21lbnRDb250ZXh0O1xuZnVuY3Rpb24gaW5zZXJ0T3JkZXJlZChyZXN1bHQsIGlJbnNlcnRlZE1lbWJlciwgbGltaXQpIHtcbiAgICAvLyBUT0RPOiB1c2Ugc29tZSB3ZWlnaHRcbiAgICBpZiAocmVzdWx0Lmxlbmd0aCA8IGxpbWl0KSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKGlJbnNlcnRlZE1lbWJlcik7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5leHBvcnRzLmluc2VydE9yZGVyZWQgPSBpbnNlcnRPcmRlcmVkO1xuZnVuY3Rpb24gdGFrZVRvcE4oYXJyKSB7XG4gICAgdmFyIHUgPSBhcnIuZmlsdGVyKGZ1bmN0aW9uIChpbm5lckFycikgeyByZXR1cm4gaW5uZXJBcnIubGVuZ3RoID4gMDsgfSk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIC8vIHNoaWZ0IG91dCB0aGUgdG9wIG9uZXNcbiAgICB1ID0gdS5tYXAoZnVuY3Rpb24gKGlBcnIpIHtcbiAgICAgICAgdmFyIHRvcCA9IGlBcnIuc2hpZnQoKTtcbiAgICAgICAgcmVzID0gaW5zZXJ0T3JkZXJlZChyZXMsIHRvcCwgNSk7XG4gICAgICAgIHJldHVybiBpQXJyO1xuICAgIH0pLmZpbHRlcihmdW5jdGlvbiAoaW5uZXJBcnIpIHsgcmV0dXJuIGlubmVyQXJyLmxlbmd0aCA+IDA7IH0pO1xuICAgIC8vIGFzIEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMudGFrZVRvcE4gPSB0YWtlVG9wTjtcbnZhciBpbnB1dEZpbHRlclJ1bGVzID0gcmVxdWlyZSgnLi9pbnB1dEZpbHRlclJ1bGVzJyk7XG52YXIgcm07XG5mdW5jdGlvbiBnZXRSTU9uY2UoKSB7XG4gICAgaWYgKCFybSkge1xuICAgICAgICBybSA9IGlucHV0RmlsdGVyUnVsZXMuZ2V0UnVsZU1hcCgpO1xuICAgIH1cbiAgICByZXR1cm4gcm07XG59XG5mdW5jdGlvbiBhcHBseVJ1bGVzKGNvbnRleHQpIHtcbiAgICB2YXIgYmVzdE4gPSBbY29udGV4dF07XG4gICAgaW5wdXRGaWx0ZXJSdWxlcy5vS2V5T3JkZXIuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xuICAgICAgICB2YXIgYmVzdE5leHQgPSBbXTtcbiAgICAgICAgYmVzdE4uZm9yRWFjaChmdW5jdGlvbiAob0NvbnRleHQpIHtcbiAgICAgICAgICAgIGlmIChvQ29udGV4dFtzS2V5XSkge1xuICAgICAgICAgICAgICAgIGRlYnVnbG9nKCcqKiBhcHBseWluZyBydWxlcyBmb3IgJyArIHNLZXkpO1xuICAgICAgICAgICAgICAgIHZhciByZXMgPSBhdWdtZW50Q29udGV4dChvQ29udGV4dCwgZ2V0Uk1PbmNlKClbc0tleV0gfHwgW10pO1xuICAgICAgICAgICAgICAgIGRlYnVnbG9nKCcqKiByZXN1bHQgZm9yICcgKyBzS2V5ICsgJyA9ICcgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgICAgICAgICAgIGJlc3ROZXh0LnB1c2gocmVzIHx8IFtdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIHJ1bGUgbm90IHJlbGV2YW50XG4gICAgICAgICAgICAgICAgYmVzdE5leHQucHVzaChbb0NvbnRleHRdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGJlc3ROID0gdGFrZVRvcE4oYmVzdE5leHQpO1xuICAgIH0pO1xuICAgIHJldHVybiBiZXN0Tjtcbn1cbmV4cG9ydHMuYXBwbHlSdWxlcyA9IGFwcGx5UnVsZXM7XG5mdW5jdGlvbiBhcHBseVJ1bGVzUGlja0ZpcnN0KGNvbnRleHQpIHtcbiAgICB2YXIgciA9IGFwcGx5UnVsZXMoY29udGV4dCk7XG4gICAgcmV0dXJuIHIgJiYgclswXTtcbn1cbmV4cG9ydHMuYXBwbHlSdWxlc1BpY2tGaXJzdCA9IGFwcGx5UnVsZXNQaWNrRmlyc3Q7XG4vKipcbiAqIERlY2lkZSB3aGV0aGVyIHRvIHJlcXVlcnkgZm9yIGEgY29udGV0XG4gKi9cbmZ1bmN0aW9uIGRlY2lkZU9uUmVRdWVyeShjb250ZXh0KSB7XG4gICAgcmV0dXJuIFtdO1xufVxuZXhwb3J0cy5kZWNpZGVPblJlUXVlcnkgPSBkZWNpZGVPblJlUXVlcnk7XG4iLCIvKipcclxuICogdGhlIGlucHV0IGZpbHRlciBzdGFnZSBwcmVwcm9jZXNzZXMgYSBjdXJyZW50IGNvbnRleHRcclxuICpcclxuICogSXQgYSkgY29tYmluZXMgbXVsdGktc2VnbWVudCBhcmd1bWVudHMgaW50byBvbmUgY29udGV4dCBtZW1iZXJzXHJcbiAqIEl0IGIpIGF0dGVtcHRzIHRvIGF1Z21lbnQgdGhlIGNvbnRleHQgYnkgYWRkaXRpb25hbCBxdWFsaWZpY2F0aW9uc1xyXG4gKiAgICAgICAgICAgKE1pZCB0ZXJtIGdlbmVyYXRpbmcgQWx0ZXJuYXRpdmVzLCBlLmcuXHJcbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiB1bml0IHRlc3Q/XHJcbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiBzb3VyY2UgP1xyXG4gKiAgICAgICAgICAgKVxyXG4gKiAgU2ltcGxlIHJ1bGVzIGxpa2UgIEludGVudFxyXG4gKlxyXG4gKlxyXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5pbnB1dEZpbHRlclxyXG4gKiBAZmlsZSBpbnB1dEZpbHRlci50c1xyXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXHJcbiAqL1xyXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vbGliL25vZGUtNC5kLnRzXCIgLz5cclxuaW1wb3J0ICogYXMgZGlzdGFuY2UgZnJvbSAnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluJztcclxuXHJcblxyXG5pbXBvcnQgKiBhcyBMb2dnZXIgZnJvbSAnLi4vdXRpbHMvbG9nZ2VyJ1xyXG5cclxuY29uc3QgbG9nZ2VyID0gTG9nZ2VyLmxvZ2dlcignaW5wdXRGaWx0ZXInKTtcclxuXHJcbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcclxuXHJcbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gJy4uL3V0aWxzL3V0aWxzJztcclxuXHJcblxyXG5pbXBvcnQgKiBhcyBBbGdvbCBmcm9tICcuL2FsZ29sJztcclxuXHJcbmltcG9ydCAqIGFzIElNYXRjaCBmcm9tICcuL2lmbWF0Y2gnO1xyXG5cclxuaW1wb3J0ICogYXMgYnJlYWtkb3duIGZyb20gJy4vYnJlYWtkb3duJztcclxuXHJcbmNvbnN0IEFueU9iamVjdCA9IDxhbnk+T2JqZWN0O1xyXG5cclxuY29uc3QgZGVidWdsb2cgPSBkZWJ1ZygnaW5wdXRGaWx0ZXInKVxyXG5cclxuaW1wb3J0ICogYXMgbWF0Y2hkYXRhIGZyb20gJy4vbWF0Y2hkYXRhJztcclxudmFyIG9Vbml0VGVzdHMgPSBtYXRjaGRhdGEub1VuaXRUZXN0c1xyXG5cclxuLyoqXHJcbiAqIEBwYXJhbSBzVGV4dCB7c3RyaW5nfSB0aGUgdGV4dCB0byBtYXRjaCB0byBOYXZUYXJnZXRSZXNvbHV0aW9uXHJcbiAqIEBwYXJhbSBzVGV4dDIge3N0cmluZ30gdGhlIHF1ZXJ5IHRleHQsIGUuZy4gTmF2VGFyZ2V0XHJcbiAqXHJcbiAqIEByZXR1cm4gdGhlIGRpc3RhbmNlLCBub3RlIHRoYXQgaXMgaXMgKm5vdCogc3ltbWV0cmljIVxyXG4gKi9cclxuZnVuY3Rpb24gY2FsY0Rpc3RhbmNlKHNUZXh0MTogc3RyaW5nLCBzVGV4dDI6IHN0cmluZyk6IG51bWJlciB7XHJcbiAgLy8gY29uc29sZS5sb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxyXG4gIHZhciBhMCA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCksIHNUZXh0MilcclxuICB2YXIgYSA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS50b0xvd2VyQ2FzZSgpLCBzVGV4dDIpXHJcbiAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGFcclxufVxyXG5cclxuaW1wb3J0ICogYXMgSUZNYXRjaCBmcm9tICcuLi9tYXRjaC9pZm1hdGNoJztcclxuXHJcbnR5cGUgSVJ1bGUgPSBJRk1hdGNoLklSdWxlXHJcblxyXG5cclxuaW50ZXJmYWNlIElNYXRjaE9wdGlvbnMge1xyXG4gIG1hdGNob3RoZXJzPzogYm9vbGVhbixcclxuICBhdWdtZW50PzogYm9vbGVhbixcclxuICBvdmVycmlkZT86IGJvb2xlYW5cclxufVxyXG5cclxuaW50ZXJmYWNlIElNYXRjaENvdW50IHtcclxuICBlcXVhbDogbnVtYmVyXHJcbiAgZGlmZmVyZW50OiBudW1iZXJcclxuICBzcHVyaW91c1I6IG51bWJlclxyXG4gIHNwdXJpb3VzTDogbnVtYmVyXHJcbn1cclxuXHJcbnR5cGUgRW51bVJ1bGVUeXBlID0gSUZNYXRjaC5FbnVtUnVsZVR5cGVcclxuXHJcbmNvbnN0IGxldmVuQ3V0b2ZmID0gQWxnb2wuQ3V0b2ZmX0xldmVuU2h0ZWluO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGxldmVuUGVuYWx0eShpOiBudW1iZXIpOiBudW1iZXIge1xyXG4gIC8vIDAtPiAxXHJcbiAgLy8gMSAtPiAwLjFcclxuICAvLyAxNTAgLT4gIDAuOFxyXG4gIGlmIChpID09PSAwKSB7XHJcbiAgICByZXR1cm4gMTtcclxuICB9XHJcbiAgLy8gcmV2ZXJzZSBtYXkgYmUgYmV0dGVyIHRoYW4gbGluZWFyXHJcbiAgcmV0dXJuIDEgKyBpICogKDAuOCAtIDEpIC8gMTUwXHJcbn1cclxuXHJcbmZ1bmN0aW9uIG5vblByaXZhdGVLZXlzKG9BKSB7XHJcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG9BKS5maWx0ZXIoa2V5ID0+IHtcclxuICAgIHJldHVybiBrZXlbMF0gIT09ICdfJztcclxuICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNvdW50QWluQihvQSwgb0IsIGZuQ29tcGFyZSwgYUtleUlnbm9yZT8pOiBudW1iZXIge1xyXG4gIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gYUtleUlnbm9yZSA6XHJcbiAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xyXG4gIGZuQ29tcGFyZSA9IGZuQ29tcGFyZSB8fCBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9XHJcbiAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xyXG4gICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcclxuICB9KS5cclxuICAgIHJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XHJcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIChmbkNvbXBhcmUob0Fba2V5XSwgb0Jba2V5XSwga2V5KSA/IDEgOiAwKVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBwcmV2XHJcbiAgICB9LCAwKVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc3B1cmlvdXNBbm90SW5CKG9BLCBvQiwgYUtleUlnbm9yZT8pIHtcclxuICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxyXG4gICAgdHlwZW9mIGFLZXlJZ25vcmUgPT09IFwic3RyaW5nXCIgPyBbYUtleUlnbm9yZV0gOiBbXTtcclxuICByZXR1cm4gbm9uUHJpdmF0ZUtleXMob0EpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xyXG4gIH0pLlxyXG4gICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIDFcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldlxyXG4gICAgfSwgMClcclxufVxyXG5cclxuZnVuY3Rpb24gbG93ZXJDYXNlKG8pIHtcclxuICBpZiAodHlwZW9mIG8gPT09IFwic3RyaW5nXCIpIHtcclxuICAgIHJldHVybiBvLnRvTG93ZXJDYXNlKClcclxuICB9XHJcbiAgcmV0dXJuIG9cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmVDb250ZXh0KG9BLCBvQiwgYUtleUlnbm9yZT8pIHtcclxuICB2YXIgZXF1YWwgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpID09PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xyXG4gIHZhciBkaWZmZXJlbnQgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpICE9PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xyXG4gIHZhciBzcHVyaW91c0wgPSBzcHVyaW91c0Fub3RJbkIob0EsIG9CLCBhS2V5SWdub3JlKVxyXG4gIHZhciBzcHVyaW91c1IgPSBzcHVyaW91c0Fub3RJbkIob0IsIG9BLCBhS2V5SWdub3JlKVxyXG4gIHJldHVybiB7XHJcbiAgICBlcXVhbDogZXF1YWwsXHJcbiAgICBkaWZmZXJlbnQ6IGRpZmZlcmVudCxcclxuICAgIHNwdXJpb3VzTDogc3B1cmlvdXNMLFxyXG4gICAgc3B1cmlvdXNSOiBzcHVyaW91c1JcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNvcnRCeVJhbmsoYTogSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmcsIGI6IElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nKTogbnVtYmVyIHtcclxuICB2YXIgciA9IC0oKGEuX3JhbmtpbmcgfHwgMS4wKSAtIChiLl9yYW5raW5nIHx8IDEuMCkpO1xyXG4gIGlmIChyKSB7XHJcbiAgICByZXR1cm4gcjtcclxuICB9XHJcbiAgaWYgKGEuY2F0ZWdvcnkgJiYgYi5jYXRlZ29yeSkge1xyXG4gICAgciA9IGEuY2F0ZWdvcnkubG9jYWxlQ29tcGFyZShiLmNhdGVnb3J5KTtcclxuICAgIGlmIChyKSB7XHJcbiAgICAgIHJldHVybiByO1xyXG4gICAgfVxyXG4gIH1cclxuICBpZiAoYS5tYXRjaGVkU3RyaW5nICYmIGIubWF0Y2hlZFN0cmluZykge1xyXG4gICAgciA9IGEubWF0Y2hlZFN0cmluZy5sb2NhbGVDb21wYXJlKGIubWF0Y2hlZFN0cmluZyk7XHJcbiAgICBpZiAocikge1xyXG4gICAgICByZXR1cm4gcjtcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIDA7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVN0cmluZyhzdHJpbmc6IHN0cmluZywgZXhhY3Q6IGJvb2xlYW4sIG9SdWxlczogQXJyYXk8SU1hdGNoLm1SdWxlPik6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiB7XHJcbiAgLy8gc2ltcGx5IGFwcGx5IGFsbCBydWxlc1xyXG4gIGRlYnVnKFwicnVsZXMgOiBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlcykpO1xyXG4gIHZhciByZXM6IEFycmF5PElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+ID0gW11cclxuICBvUnVsZXMuZm9yRWFjaChmdW5jdGlvbiAob1J1bGUpIHtcclxuICAgIGRlYnVnbG9nKCdhdHRlbXB0aW5nIHRvIG1hdGNoIHJ1bGUgJyArIEpTT04uc3RyaW5naWZ5KG9SdWxlKSArIFwiIHRvIHN0cmluZyBcXFwiXCIgKyBzdHJpbmcgKyBcIlxcXCJcIik7XHJcbiAgICBzd2l0Y2ggKG9SdWxlLnR5cGUpIHtcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5XT1JEOlxyXG4gICAgICAgIGlmIChleGFjdCAmJiBvUnVsZS53b3JkID09PSBzdHJpbmcpIHtcclxuICAgICAgICAgIHJlcy5wdXNoKHtcclxuICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCFleGFjdCkge1xyXG4gICAgICAgICAgdmFyIGxldmVubWF0Y2ggPSBjYWxjRGlzdGFuY2Uob1J1bGUud29yZCwgc3RyaW5nKVxyXG4gICAgICAgICAgaWYgKGxldmVubWF0Y2ggPCBsZXZlbkN1dG9mZikge1xyXG4gICAgICAgICAgICByZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUud29yZCxcclxuICAgICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXHJcbiAgICAgICAgICAgICAgX3Jhbmtpbmc6IChvUnVsZS5fcmFua2luZyB8fCAxLjApICogbGV2ZW5QZW5hbHR5KGxldmVubWF0Y2gpLFxyXG4gICAgICAgICAgICAgIGxldmVubWF0Y2g6IGxldmVubWF0Y2hcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuUkVHRVhQOiB7XHJcbiAgICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoXCIgaGVyZSByZWdleHBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKSlcclxuICAgICAgICB2YXIgbSA9IG9SdWxlLnJlZ2V4cC5leGVjKHN0cmluZylcclxuICAgICAgICBpZiAobSkge1xyXG4gICAgICAgICAgcmVzLnB1c2goe1xyXG4gICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcclxuICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogKG9SdWxlLm1hdGNoSW5kZXggIT09IHVuZGVmaW5lZCAmJiBtW29SdWxlLm1hdGNoSW5kZXhdKSB8fCBzdHJpbmcsXHJcbiAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmtub3duIHR5cGVcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKVxyXG4gICAgfVxyXG4gIH0pO1xyXG4gIHJlcy5zb3J0KHNvcnRCeVJhbmspO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuLyoqXHJcbiAqXHJcbiAqIE9wdGlvbnMgbWF5IGJlIHtcclxuICogbWF0Y2hvdGhlcnMgOiB0cnVlLCAgPT4gb25seSBydWxlcyB3aGVyZSBhbGwgb3RoZXJzIG1hdGNoIGFyZSBjb25zaWRlcmVkXHJcbiAqIGF1Z21lbnQgOiB0cnVlLFxyXG4gKiBvdmVycmlkZSA6IHRydWUgfSAgPT5cclxuICpcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFdvcmQob1J1bGU6IElSdWxlLCBjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQsIG9wdGlvbnM/OiBJTWF0Y2hPcHRpb25zKSB7XHJcbiAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKVxyXG4gIHZhciBzMiA9IG9SdWxlLndvcmQudG9Mb3dlckNhc2UoKTtcclxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxyXG4gIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsIG9SdWxlLmZvbGxvd3MsIG9SdWxlLmtleSlcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xyXG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcclxuICBpZiAob3B0aW9ucy5tYXRjaG90aGVycyAmJiAoZGVsdGEuZGlmZmVyZW50ID4gMCkpIHtcclxuICAgIHJldHVybiB1bmRlZmluZWRcclxuICB9XHJcbiAgdmFyIGM6IG51bWJlciA9IGNhbGNEaXN0YW5jZShzMiwgczEpO1xyXG4gIGRlYnVnbG9nKFwiIHMxIDw+IHMyIFwiICsgczEgKyBcIjw+XCIgKyBzMiArIFwiICA9PjogXCIgKyBjKTtcclxuICBpZiAoYyA8IDE1MCkge1xyXG4gICAgdmFyIHJlcyA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpIGFzIGFueTtcclxuICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcclxuICAgIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XHJcbiAgICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvUnVsZS5mb2xsb3dzKTtcclxuICAgIH1cclxuICAgIC8vIGZvcmNlIGtleSBwcm9wZXJ0eVxyXG4gICAgLy8gY29uc29sZS5sb2coJyBvYmplY3RjYXRlZ29yeScsIHJlc1snc3lzdGVtT2JqZWN0Q2F0ZWdvcnknXSk7XHJcbiAgICByZXNbb1J1bGUua2V5XSA9IG9SdWxlLmZvbGxvd3Nbb1J1bGUua2V5XSB8fCByZXNbb1J1bGUua2V5XTtcclxuICAgIHJlcy5fd2VpZ2h0ID0gQW55T2JqZWN0LmFzc2lnbih7fSwgcmVzLl93ZWlnaHQpO1xyXG4gICAgcmVzLl93ZWlnaHRbb1J1bGUua2V5XSA9IGM7XHJcbiAgICBPYmplY3QuZnJlZXplKHJlcyk7XHJcbiAgICBkZWJ1Z2xvZygnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSk7XHJcbiAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuICByZXR1cm4gdW5kZWZpbmVkO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEFyZ3NNYXAobWF0Y2g6IEFycmF5PHN0cmluZz4sIGFyZ3NNYXA6IHsgW2tleTogbnVtYmVyXTogc3RyaW5nIH0pOiBJRk1hdGNoLmNvbnRleHQge1xyXG4gIHZhciByZXMgPSB7fSBhcyBJRk1hdGNoLmNvbnRleHQ7XHJcbiAgaWYgKCFhcmdzTWFwKSB7XHJcbiAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuICBPYmplY3Qua2V5cyhhcmdzTWFwKS5mb3JFYWNoKGZ1bmN0aW9uIChpS2V5KSB7XHJcbiAgICB2YXIgdmFsdWUgPSBtYXRjaFtpS2V5XVxyXG4gICAgdmFyIGtleSA9IGFyZ3NNYXBbaUtleV07XHJcbiAgICBpZiAoKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikgJiYgdmFsdWUubGVuZ3RoID4gMCkge1xyXG4gICAgICByZXNba2V5XSA9IHZhbHVlXHJcbiAgICB9XHJcbiAgfVxyXG4gICk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IFJhbmtXb3JkID0ge1xyXG4gIGhhc0Fib3ZlOiBmdW5jdGlvbiAobHN0OiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4sIGJvcmRlcjogbnVtYmVyKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gIWxzdC5ldmVyeShmdW5jdGlvbiAob01lbWJlcikge1xyXG4gICAgICByZXR1cm4gKG9NZW1iZXIuX3JhbmtpbmcgPCBib3JkZXIpO1xyXG4gICAgfSk7XHJcbiAgfSxcclxuXHJcbiAgdGFrZUZpcnN0TjogZnVuY3Rpb24gKGxzdDogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+LCBuOiBudW1iZXIpOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4ge1xyXG4gICAgcmV0dXJuIGxzdC5maWx0ZXIoZnVuY3Rpb24gKG9NZW1iZXIsIGlJbmRleCkge1xyXG4gICAgICB2YXIgbGFzdFJhbmtpbmcgPSAxLjA7XHJcbiAgICAgIGlmICgoaUluZGV4IDwgbikgfHwgb01lbWJlci5fcmFua2luZyA9PT0gbGFzdFJhbmtpbmcpIHtcclxuICAgICAgICBsYXN0UmFua2luZyA9IG9NZW1iZXIuX3Jhbmtpbmc7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfSk7XHJcbiAgfSxcclxuICB0YWtlQWJvdmU6IGZ1bmN0aW9uIChsc3Q6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiwgYm9yZGVyOiBudW1iZXIpOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4ge1xyXG4gICAgcmV0dXJuIGxzdC5maWx0ZXIoZnVuY3Rpb24gKG9NZW1iZXIpIHtcclxuICAgICAgcmV0dXJuIChvTWVtYmVyLl9yYW5raW5nID49IGJvcmRlcik7XHJcbiAgICB9KTtcclxuICB9XHJcbn07XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZihzV29yZEdyb3VwOiBzdHJpbmcsIGFSdWxlczogQXJyYXk8SUZNYXRjaC5tUnVsZT4pOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4ge1xyXG4gIHZhciBzZWVuSXQgPSBjYXRlZ29yaXplU3RyaW5nKHNXb3JkR3JvdXAsIHRydWUsIGFSdWxlcyk7XHJcbiAgaWYgKFJhbmtXb3JkLmhhc0Fib3ZlKHNlZW5JdCwgMC44KSkge1xyXG4gICAgc2Vlbkl0ID0gUmFua1dvcmQudGFrZUFib3ZlKHNlZW5JdCwgMC44KTtcclxuICB9IGVsc2Uge1xyXG4gICAgc2Vlbkl0ID0gY2F0ZWdvcml6ZVN0cmluZyhzV29yZEdyb3VwLCBmYWxzZSwgYVJ1bGVzKTtcclxuICB9XHJcbiAgc2Vlbkl0ID0gUmFua1dvcmQudGFrZUZpcnN0TihzZWVuSXQsIEFsZ29sLlRvcF9OX1dvcmRDYXRlZ29yaXphdGlvbnMpO1xyXG4gIHJldHVybiBzZWVuSXQ7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkU2VudGVuY2Uob1NlbnRlbmNlOiBJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdW10pOiBib29sZWFuIHtcclxuICByZXR1cm4gb1NlbnRlbmNlLmV2ZXJ5KGZ1bmN0aW9uIChvV29yZEdyb3VwKSB7XHJcbiAgICByZXR1cm4gKG9Xb3JkR3JvdXAubGVuZ3RoID4gMCk7XHJcbiAgfSk7XHJcbn1cclxuXHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZChhcnI6IElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11bXVtdKTogSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXVtdW10ge1xyXG4gIHJldHVybiBhcnIuZmlsdGVyKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcclxuICAgIHJldHVybiBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWRTZW50ZW5jZShvU2VudGVuY2UpO1xyXG4gIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZUFXb3JkKHNXb3JkR3JvdXA6IHN0cmluZywgYVJ1bGVzOiBBcnJheTxJTWF0Y2gubVJ1bGU+LCBzU3RyaW5nOiBzdHJpbmcsIHdvcmRzOiB7IFtrZXk6IHN0cmluZ106IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiB9KSB7XHJcbiAgdmFyIHNlZW5JdCA9IHdvcmRzW3NXb3JkR3JvdXBdO1xyXG4gIGlmIChzZWVuSXQgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgc2Vlbkl0ID0gY2F0ZWdvcml6ZVdvcmRXaXRoUmFua0N1dG9mZihzV29yZEdyb3VwLCBhUnVsZXMpO1xyXG4gICAgaWYgKHNlZW5JdCA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICB3b3Jkc1tzV29yZEdyb3VwXSA9IHNlZW5JdDtcclxuICB9XHJcbiAgaWYgKCFzZWVuSXQgfHwgc2Vlbkl0Lmxlbmd0aCA9PT0gMCkge1xyXG4gICAgbG9nZ2VyKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgXFxcIlwiICsgc1dvcmRHcm91cCArIFwiXFxcIiBpbiBzZW50ZW5jZSBcXFwiXCJcclxuICAgICAgKyBzU3RyaW5nICsgXCJcXFwiXCIpO1xyXG4gICAgaWYgKHNXb3JkR3JvdXAuaW5kZXhPZihcIiBcIikgPD0gMCkge1xyXG4gICAgICBkZWJ1Z2xvZyhcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIHByaW1pdGl2ZSAoISlcIiArIHNXb3JkR3JvdXApO1xyXG4gICAgfVxyXG4gICAgZGVidWdsb2coXCIqKipXQVJOSU5HOiBEaWQgbm90IGZpbmQgYW55IGNhdGVnb3JpemF0aW9uIGZvciBcIiArIHNXb3JkR3JvdXApO1xyXG4gICAgaWYgKCFzZWVuSXQpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0aW5nIGVtdHB5IGxpc3QsIG5vdCB1bmRlZmluZWQgZm9yIFxcXCJcIiArIHNXb3JkR3JvdXAgKyBcIlxcXCJcIilcclxuICAgIH1cclxuICAgIHJldHVybiBbXTtcclxuICB9XHJcbiAgcmV0dXJuIHNlZW5JdDtcclxufVxyXG5cclxuXHJcbi8qKlxyXG4gKiBHaXZlbiBhICBzdHJpbmcsIGJyZWFrIGl0IGRvd24gaW50byBjb21wb25lbnRzLFxyXG4gKiBbWydBJywgJ0InXSwgWydBIEInXV1cclxuICpcclxuICogdGhlbiBjYXRlZ29yaXplV29yZHNcclxuICogcmV0dXJuaW5nXHJcbiAqXHJcbiAqIFsgW1sgeyBjYXRlZ29yeTogJ3N5c3RlbUlkJywgd29yZCA6ICdBJ30sXHJcbiAqICAgICAgeyBjYXRlZ29yeTogJ290aGVydGhpbmcnLCB3b3JkIDogJ0EnfVxyXG4gKiAgICBdLFxyXG4gKiAgICAvLyByZXN1bHQgb2YgQlxyXG4gKiAgICBbIHsgY2F0ZWdvcnk6ICdzeXN0ZW1JZCcsIHdvcmQgOiAnQid9LFxyXG4gKiAgICAgIHsgY2F0ZWdvcnk6ICdvdGhlcnRoaW5nJywgd29yZCA6ICdBJ31cclxuICogICAgICB7IGNhdGVnb3J5OiAnYW5vdGhlcnRyeXAnLCB3b3JkIDogJ0InfVxyXG4gKiAgICBdXHJcbiAqICAgXSxcclxuICogXV1dXHJcbiAqXHJcbiAqXHJcbiAqXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZVN0cmluZyhzU3RyaW5nOiBzdHJpbmcsIGFSdWxlczogQXJyYXk8SU1hdGNoLm1SdWxlPikge1xyXG4gIHZhciBjbnQgPSAwO1xyXG4gIHZhciBmYWMgPSAxO1xyXG4gIHZhciB1ID0gYnJlYWtkb3duLmJyZWFrZG93blN0cmluZyhzU3RyaW5nKTtcclxuICBkZWJ1Z2xvZyhcImhlcmUgYnJlYWtkb3duXCIgKyBKU09OLnN0cmluZ2lmeSh1KSk7XHJcbiAgdmFyIHdvcmRzID0ge30gYXMgeyBba2V5OiBzdHJpbmddOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4gfTtcclxuICB2YXIgcmVzID0gdS5tYXAoZnVuY3Rpb24gKGFBcnIpIHtcclxuICAgIHJldHVybiBhQXJyLm1hcChmdW5jdGlvbiAoc1dvcmRHcm91cDogc3RyaW5nKSB7XHJcbiAgICAgIHZhciBzZWVuSXQgPSBjYXRlZ29yaXplQVdvcmQoc1dvcmRHcm91cCwgYVJ1bGVzLCBzU3RyaW5nLCB3b3Jkcyk7XHJcbiAgICAgIGNudCA9IGNudCArIHNlZW5JdC5sZW5ndGg7XHJcbiAgICAgIGZhYyA9IGZhYyAqIHNlZW5JdC5sZW5ndGg7XHJcbiAgICAgIHJldHVybiBzZWVuSXQ7XHJcbiAgICB9KTtcclxuICB9KTtcclxuICByZXMgPSBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWQocmVzKTtcclxuICBkZWJ1Z2xvZyhcIiBzZW50ZW5jZXMgXCIgKyB1Lmxlbmd0aCArIFwiIG1hdGNoZXMgXCIgKyBjbnQgKyBcIiBmYWM6IFwiICsgZmFjKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG4vKlxyXG5bIFthLGJdLCBbYyxkXV1cclxuXHJcbjAwIGFcclxuMDEgYlxyXG4xMCBjXHJcbjExIGRcclxuMTIgY1xyXG4qL1xyXG5cclxuXHJcbmNvbnN0IGNsb25lID0gdXRpbHMuY2xvbmVEZWVwO1xyXG5cclxuLy8gd2UgY2FuIHJlcGxpY2F0ZSB0aGUgdGFpbCBvciB0aGUgaGVhZCxcclxuLy8gd2UgcmVwbGljYXRlIHRoZSB0YWlsIGFzIGl0IGlzIHNtYWxsZXIuXHJcblxyXG4vLyBbYSxiLGMgXVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGV4cGFuZE1hdGNoQXJyKGRlZXA6IEFycmF5PEFycmF5PGFueT4+KTogQXJyYXk8QXJyYXk8YW55Pj4ge1xyXG4gIHZhciBhID0gW107XHJcbiAgdmFyIGxpbmUgPSBbXTtcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWVwKSk7XHJcbiAgZGVlcC5mb3JFYWNoKGZ1bmN0aW9uICh1QnJlYWtEb3duTGluZSwgaUluZGV4OiBudW1iZXIpIHtcclxuICAgIGxpbmVbaUluZGV4XSA9IFtdO1xyXG4gICAgdUJyZWFrRG93bkxpbmUuZm9yRWFjaChmdW5jdGlvbiAoYVdvcmRHcm91cCwgd2dJbmRleDogbnVtYmVyKSB7XHJcbiAgICAgIGxpbmVbaUluZGV4XVt3Z0luZGV4XSA9IFtdO1xyXG4gICAgICBhV29yZEdyb3VwLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkVmFyaWFudCwgaVdWSW5kZXg6IG51bWJlcikge1xyXG4gICAgICAgIGxpbmVbaUluZGV4XVt3Z0luZGV4XVtpV1ZJbmRleF0gPSBvV29yZFZhcmlhbnQ7XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfSlcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShsaW5lKSk7XHJcbiAgdmFyIHJlcyA9IFtdO1xyXG4gIHZhciBudmVjcyA9IFtdO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZS5sZW5ndGg7ICsraSkge1xyXG4gICAgdmFyIHZlY3MgPSBbW11dO1xyXG4gICAgdmFyIG52ZWNzID0gW107XHJcbiAgICB2YXIgcnZlYyA9IFtdO1xyXG4gICAgZm9yICh2YXIgayA9IDA7IGsgPCBsaW5lW2ldLmxlbmd0aDsgKytrKSB7IC8vIHdvcmRncm91cCBrXHJcbiAgICAgIC8vdmVjcyBpcyB0aGUgdmVjdG9yIG9mIGFsbCBzbyBmYXIgc2VlbiB2YXJpYW50cyB1cCB0byBrIHdncy5cclxuICAgICAgdmFyIG5leHRCYXNlID0gW107XHJcbiAgICAgIGZvciAodmFyIGwgPSAwOyBsIDwgbGluZVtpXVtrXS5sZW5ndGg7ICsrbCkgeyAvLyBmb3IgZWFjaCB2YXJpYW50XHJcbiAgICAgICAgLy9kZWJ1Z2xvZyhcInZlY3Mgbm93XCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzKSk7XHJcbiAgICAgICAgbnZlY3MgPSBbXTsgLy92ZWNzLnNsaWNlKCk7IC8vIGNvcHkgdGhlIHZlY1tpXSBiYXNlIHZlY3RvcjtcclxuICAgICAgICAvL2RlYnVnbG9nKFwidmVjcyBjb3BpZWQgbm93XCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpO1xyXG4gICAgICAgIGZvciAodmFyIHUgPSAwOyB1IDwgdmVjcy5sZW5ndGg7ICsrdSkge1xyXG4gICAgICAgICAgbnZlY3NbdV0gPSB2ZWNzW3VdLnNsaWNlKCk7IC8vXHJcbiAgICAgICAgICAvLyBkZWJ1Z2xvZyhcImNvcGllZCB2ZWNzW1wiKyB1K1wiXVwiICsgSlNPTi5zdHJpbmdpZnkodmVjc1t1XSkpO1xyXG4gICAgICAgICAgbnZlY3NbdV0ucHVzaChcclxuICAgICAgICAgICAgY2xvbmUobGluZVtpXVtrXVtsXSkpOyAvLyBwdXNoIHRoZSBsdGggdmFyaWFudFxyXG4gICAgICAgICAgLy8gZGVidWdsb2coXCJub3cgbnZlY3MgXCIgKyBudmVjcy5sZW5ndGggKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vICAgZGVidWdsb2coXCIgYXQgICAgIFwiICsgayArIFwiOlwiICsgbCArIFwiIG5leHRiYXNlID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcclxuICAgICAgICAvLyAgIGRlYnVnbG9nKFwiIGFwcGVuZCBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiBudmVjcyAgICA+XCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpXHJcbiAgICAgICAgbmV4dEJhc2UgPSBuZXh0QmFzZS5jb25jYXQobnZlY3MpO1xyXG4gICAgICAgIC8vICAgZGVidWdsb2coXCIgIHJlc3VsdCBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiBudmVjcyAgICA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpXHJcbiAgICAgIH0gLy9jb25zdHJ1XHJcbiAgICAgIC8vICBkZWJ1Z2xvZyhcIm5vdyBhdCBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpXHJcbiAgICAgIHZlY3MgPSBuZXh0QmFzZTtcclxuICAgIH1cclxuICAgIGRlYnVnbG9nKFwiQVBQRU5ESU5HIFRPIFJFU1wiICsgaSArIFwiOlwiICsgbCArIFwiID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcclxuICAgIHJlcyA9IHJlcy5jb25jYXQodmVjcyk7XHJcbiAgfVxyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcblxyXG4vKipcclxuICogQ2FsY3VsYXRlIGEgd2VpZ2h0IGZhY3RvciBmb3IgYSBnaXZlbiBkaXN0YW5jZSBhbmRcclxuICogY2F0ZWdvcnlcclxuICogQHBhcmFtIHtpbnRlZ2VyfSBkaXN0IGRpc3RhbmNlIGluIHdvcmRzXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBjYXRlZ29yeSBjYXRlZ29yeSB0byB1c2VcclxuICogQHJldHVybnMge251bWJlcn0gYSBkaXN0YW5jZSBmYWN0b3IgPj0gMVxyXG4gKiAgMS4wIGZvciBubyBlZmZlY3RcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiByZWluZm9yY2VEaXN0V2VpZ2h0KGRpc3Q6IG51bWJlciwgY2F0ZWdvcnk6IHN0cmluZyk6IG51bWJlciB7XHJcbiAgdmFyIGFicyA9IE1hdGguYWJzKGRpc3QpO1xyXG4gIHJldHVybiAxLjAgKyAoQWxnb2wuYVJlaW5mb3JjZURpc3RXZWlnaHRbYWJzXSB8fCAwKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdpdmVuIGEgc2VudGVuY2UsIGV4dGFjdCBjYXRlZ29yaWVzXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdENhdGVnb3J5TWFwKG9TZW50ZW5jZTogQXJyYXk8SUZNYXRjaC5JV29yZD4pOiB7IFtrZXk6IHN0cmluZ106IEFycmF5PHsgcG9zOiBudW1iZXIgfT4gfSB7XHJcbiAgdmFyIHJlcyA9IHt9O1xyXG4gIGRlYnVnbG9nKCdleHRyYWN0Q2F0ZWdvcnlNYXAgJyArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSkpO1xyXG4gIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaUluZGV4KSB7XHJcbiAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IElGTWF0Y2guQ0FUX0NBVEVHT1JZKSB7XHJcbiAgICAgIHJlc1tvV29yZC5tYXRjaGVkU3RyaW5nXSA9IHJlc1tvV29yZC5tYXRjaGVkU3RyaW5nXSB8fCBbXTtcclxuICAgICAgcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddLnB1c2goeyBwb3M6IGlJbmRleCB9KTtcclxuICAgIH1cclxuICB9KTtcclxuICB1dGlscy5kZWVwRnJlZXplKHJlcyk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlaW5Gb3JjZVNlbnRlbmNlKG9TZW50ZW5jZSkge1xyXG4gIHZhciBvQ2F0ZWdvcnlNYXAgPSBleHRyYWN0Q2F0ZWdvcnlNYXAob1NlbnRlbmNlKTtcclxuICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGlJbmRleCkge1xyXG4gICAgdmFyIG0gPSBvQ2F0ZWdvcnlNYXBbb1dvcmQuY2F0ZWdvcnldIHx8IFtdO1xyXG4gICAgbS5mb3JFYWNoKGZ1bmN0aW9uIChvUG9zaXRpb246IHsgcG9zOiBudW1iZXIgfSkge1xyXG4gICAgICBvV29yZC5yZWluZm9yY2UgPSBvV29yZC5yZWluZm9yY2UgfHwgMTtcclxuICAgICAgdmFyIGJvb3N0ID0gcmVpbmZvcmNlRGlzdFdlaWdodChpSW5kZXggLSBvUG9zaXRpb24ucG9zLCBvV29yZC5jYXRlZ29yeSk7XHJcbiAgICAgIG9Xb3JkLnJlaW5mb3JjZSAqPSBib29zdDtcclxuICAgICAgb1dvcmQuX3JhbmtpbmcgKj0gYm9vc3Q7XHJcbiAgICB9KTtcclxuICB9KTtcclxuICByZXR1cm4gb1NlbnRlbmNlO1xyXG59XHJcblxyXG5cclxuaW1wb3J0ICogYXMgU2VudGVuY2UgZnJvbSAnLi9zZW50ZW5jZSc7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVpbkZvcmNlKGFDYXRlZ29yaXplZEFycmF5KSB7XHJcbiAgYUNhdGVnb3JpemVkQXJyYXkuZm9yRWFjaChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XHJcbiAgICByZWluRm9yY2VTZW50ZW5jZShvU2VudGVuY2UpO1xyXG4gIH0pXHJcbiAgYUNhdGVnb3JpemVkQXJyYXkuc29ydChTZW50ZW5jZS5jbXBSYW5raW5nUHJvZHVjdCk7XHJcbiAgZGVidWdsb2coXCJhZnRlciByZWluZm9yY2VcIiArIGFDYXRlZ29yaXplZEFycmF5Lm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XHJcbiAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcclxuICB9KS5qb2luKFwiXFxuXCIpKTtcclxuICByZXR1cm4gYUNhdGVnb3JpemVkQXJyYXk7XHJcbn1cclxuXHJcblxyXG4vLy8gYmVsb3cgbWF5IG5vIGxvbmdlciBiZSB1c2VkXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hSZWdFeHAob1J1bGU6IElSdWxlLCBjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQsIG9wdGlvbnM/OiBJTWF0Y2hPcHRpb25zKSB7XHJcbiAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICB2YXIgc0tleSA9IG9SdWxlLmtleTtcclxuICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKVxyXG4gIHZhciByZWcgPSBvUnVsZS5yZWdleHA7XHJcblxyXG4gIHZhciBtID0gcmVnLmV4ZWMoczEpO1xyXG4gIGRlYnVnbG9nKFwiYXBwbHlpbmcgcmVnZXhwOiBcIiArIHMxICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XHJcbiAgaWYgKCFtKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxyXG4gIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsIG9SdWxlLmZvbGxvd3MsIG9SdWxlLmtleSlcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xyXG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcclxuICBpZiAob3B0aW9ucy5tYXRjaG90aGVycyAmJiAoZGVsdGEuZGlmZmVyZW50ID4gMCkpIHtcclxuICAgIHJldHVybiB1bmRlZmluZWRcclxuICB9XHJcbiAgdmFyIG9FeHRyYWN0ZWRDb250ZXh0ID0gZXh0cmFjdEFyZ3NNYXAobSwgb1J1bGUuYXJnc01hcCk7XHJcbiAgZGVidWdsb2coXCJleHRyYWN0ZWQgYXJncyBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLmFyZ3NNYXApKTtcclxuICBkZWJ1Z2xvZyhcIm1hdGNoIFwiICsgSlNPTi5zdHJpbmdpZnkobSkpO1xyXG5cclxuICBkZWJ1Z2xvZyhcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob0V4dHJhY3RlZENvbnRleHQpKTtcclxuICB2YXIgcmVzID0gQW55T2JqZWN0LmFzc2lnbih7fSwgb1J1bGUuZm9sbG93cykgYXMgYW55O1xyXG4gIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvRXh0cmFjdGVkQ29udGV4dCk7XHJcbiAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIGNvbnRleHQpO1xyXG4gIGlmIChvRXh0cmFjdGVkQ29udGV4dFtzS2V5XSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICByZXNbc0tleV0gPSBvRXh0cmFjdGVkQ29udGV4dFtzS2V5XTtcclxuICB9XHJcbiAgaWYgKG9wdGlvbnMub3ZlcnJpZGUpIHtcclxuICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvUnVsZS5mb2xsb3dzKTtcclxuICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvRXh0cmFjdGVkQ29udGV4dClcclxuICB9XHJcbiAgT2JqZWN0LmZyZWV6ZShyZXMpO1xyXG4gIGRlYnVnbG9nKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc29ydEJ5V2VpZ2h0KHNLZXk6IHN0cmluZywgb0NvbnRleHRBOiBJRk1hdGNoLmNvbnRleHQsIG9Db250ZXh0QjogSUZNYXRjaC5jb250ZXh0KTogbnVtYmVyIHtcclxuICBkZWJ1Z2xvZygnc29ydGluZzogJyArIHNLZXkgKyAnaW52b2tlZCB3aXRoXFxuIDE6JyArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QSwgdW5kZWZpbmVkLCAyKSArXHJcbiAgICBcIiB2cyBcXG4gMjpcIiArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QiwgdW5kZWZpbmVkLCAyKSk7XHJcbiAgdmFyIHJhbmtpbmdBOiBudW1iZXIgPSBwYXJzZUZsb2F0KG9Db250ZXh0QVtcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcclxuICB2YXIgcmFua2luZ0I6IG51bWJlciA9IHBhcnNlRmxvYXQob0NvbnRleHRCW1wiX3JhbmtpbmdcIl0gfHwgXCIxXCIpO1xyXG4gIGlmIChyYW5raW5nQSAhPT0gcmFua2luZ0IpIHtcclxuICAgIGRlYnVnbG9nKFwiIHJhbmtpbiBkZWx0YVwiICsgMTAwICogKHJhbmtpbmdCIC0gcmFua2luZ0EpKTtcclxuICAgIHJldHVybiAxMDAgKiAocmFua2luZ0IgLSByYW5raW5nQSlcclxuICB9XHJcblxyXG4gIHZhciB3ZWlnaHRBID0gb0NvbnRleHRBW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdW3NLZXldIHx8IDA7XHJcbiAgdmFyIHdlaWdodEIgPSBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QltcIl93ZWlnaHRcIl1bc0tleV0gfHwgMDtcclxuICByZXR1cm4gKyh3ZWlnaHRBIC0gd2VpZ2h0Qik7XHJcbn1cclxuXHJcblxyXG4vLyBXb3JkLCBTeW5vbnltLCBSZWdleHAgLyBFeHRyYWN0aW9uUnVsZVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0MShjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQsIG9SdWxlczogQXJyYXk8SVJ1bGU+LCBvcHRpb25zOiBJTWF0Y2hPcHRpb25zKTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgdmFyIHNLZXkgPSBvUnVsZXNbMF0ua2V5O1xyXG4gIC8vIGNoZWNrIHRoYXQgcnVsZVxyXG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAvLyBjaGVjayBjb25zaXN0ZW5jeVxyXG4gICAgb1J1bGVzLmV2ZXJ5KGZ1bmN0aW9uIChpUnVsZSkge1xyXG4gICAgICBpZiAoaVJ1bGUua2V5ICE9PSBzS2V5KSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW5ob21vZ2Vub3VzIGtleXMgaW4gcnVsZXMsIGV4cGVjdGVkIFwiICsgc0tleSArIFwiIHdhcyBcIiArIEpTT04uc3RyaW5naWZ5KGlSdWxlKSk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vIGxvb2sgZm9yIHJ1bGVzIHdoaWNoIG1hdGNoXHJcbiAgdmFyIHJlcyA9IG9SdWxlcy5tYXAoZnVuY3Rpb24gKG9SdWxlKSB7XHJcbiAgICAvLyBpcyB0aGlzIHJ1bGUgYXBwbGljYWJsZVxyXG4gICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuV09SRDpcclxuICAgICAgICByZXR1cm4gbWF0Y2hXb3JkKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKVxyXG4gICAgICBjYXNlIElGTWF0Y2guRW51bVJ1bGVUeXBlLlJFR0VYUDpcclxuICAgICAgICByZXR1cm4gbWF0Y2hSZWdFeHAob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xyXG4gICAgICAvLyAgIGNhc2UgXCJFeHRyYWN0aW9uXCI6XHJcbiAgICAgIC8vICAgICByZXR1cm4gbWF0Y2hFeHRyYWN0aW9uKG9SdWxlLGNvbnRleHQpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gIH0pLmZpbHRlcihmdW5jdGlvbiAob3Jlcykge1xyXG4gICAgcmV0dXJuICEhb3Jlc1xyXG4gIH0pLnNvcnQoXHJcbiAgICBzb3J0QnlXZWlnaHQuYmluZCh0aGlzLCBzS2V5KVxyXG4gICAgKTtcclxuICByZXR1cm4gcmVzO1xyXG4gIC8vIE9iamVjdC5rZXlzKCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xyXG4gIC8vIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXVnbWVudENvbnRleHQoY29udGV4dDogSUZNYXRjaC5jb250ZXh0LCBhUnVsZXM6IEFycmF5PElSdWxlPik6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG5cclxuICB2YXIgb3B0aW9uczE6IElNYXRjaE9wdGlvbnMgPSB7XHJcbiAgICBtYXRjaG90aGVyczogdHJ1ZSxcclxuICAgIG92ZXJyaWRlOiBmYWxzZVxyXG4gIH0gYXMgSU1hdGNoT3B0aW9ucztcclxuXHJcbiAgdmFyIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMSlcclxuXHJcbiAgaWYgKGFSZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICB2YXIgb3B0aW9uczI6IElNYXRjaE9wdGlvbnMgPSB7XHJcbiAgICAgIG1hdGNob3RoZXJzOiBmYWxzZSxcclxuICAgICAgb3ZlcnJpZGU6IHRydWVcclxuICAgIH0gYXMgSU1hdGNoT3B0aW9ucztcclxuICAgIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMik7XHJcbiAgfVxyXG4gIHJldHVybiBhUmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gaW5zZXJ0T3JkZXJlZChyZXN1bHQ6IEFycmF5PElGTWF0Y2guY29udGV4dD4sIGlJbnNlcnRlZE1lbWJlcjogSUZNYXRjaC5jb250ZXh0LCBsaW1pdDogbnVtYmVyKTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgLy8gVE9ETzogdXNlIHNvbWUgd2VpZ2h0XHJcbiAgaWYgKHJlc3VsdC5sZW5ndGggPCBsaW1pdCkge1xyXG4gICAgcmVzdWx0LnB1c2goaUluc2VydGVkTWVtYmVyKVxyXG4gIH1cclxuICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHRha2VUb3BOKGFycjogQXJyYXk8QXJyYXk8SUZNYXRjaC5jb250ZXh0Pj4pOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICB2YXIgdSA9IGFyci5maWx0ZXIoZnVuY3Rpb24gKGlubmVyQXJyKSB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwIH0pXHJcblxyXG4gIHZhciByZXMgPSBbXTtcclxuICAvLyBzaGlmdCBvdXQgdGhlIHRvcCBvbmVzXHJcbiAgdSA9IHUubWFwKGZ1bmN0aW9uIChpQXJyKSB7XHJcbiAgICB2YXIgdG9wID0gaUFyci5zaGlmdCgpO1xyXG4gICAgcmVzID0gaW5zZXJ0T3JkZXJlZChyZXMsIHRvcCwgNSlcclxuICAgIHJldHVybiBpQXJyXHJcbiAgfSkuZmlsdGVyKGZ1bmN0aW9uIChpbm5lckFycjogQXJyYXk8SUZNYXRjaC5jb250ZXh0Pik6IGJvb2xlYW4geyByZXR1cm4gaW5uZXJBcnIubGVuZ3RoID4gMCB9KTtcclxuICAvLyBhcyBBcnJheTxBcnJheTxJRk1hdGNoLmNvbnRleHQ+PlxyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmltcG9ydCAqIGFzIGlucHV0RmlsdGVyUnVsZXMgZnJvbSAnLi9pbnB1dEZpbHRlclJ1bGVzJztcclxuXHJcbnZhciBybTtcclxuXHJcbmZ1bmN0aW9uIGdldFJNT25jZSgpIHtcclxuICBpZiAoIXJtKSB7XHJcbiAgICBybSA9IGlucHV0RmlsdGVyUnVsZXMuZ2V0UnVsZU1hcCgpXHJcbiAgfVxyXG4gIHJldHVybiBybTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UnVsZXMoY29udGV4dDogSUZNYXRjaC5jb250ZXh0KTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgdmFyIGJlc3ROOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+ID0gW2NvbnRleHRdO1xyXG4gIGlucHV0RmlsdGVyUnVsZXMub0tleU9yZGVyLmZvckVhY2goZnVuY3Rpb24gKHNLZXk6IHN0cmluZykge1xyXG4gICAgdmFyIGJlc3ROZXh0OiBBcnJheTxBcnJheTxJRk1hdGNoLmNvbnRleHQ+PiA9IFtdO1xyXG4gICAgYmVzdE4uZm9yRWFjaChmdW5jdGlvbiAob0NvbnRleHQ6IElGTWF0Y2guY29udGV4dCkge1xyXG4gICAgICBpZiAob0NvbnRleHRbc0tleV0pIHtcclxuICAgICAgICBkZWJ1Z2xvZygnKiogYXBwbHlpbmcgcnVsZXMgZm9yICcgKyBzS2V5KVxyXG4gICAgICAgIHZhciByZXMgPSBhdWdtZW50Q29udGV4dChvQ29udGV4dCwgZ2V0Uk1PbmNlKClbc0tleV0gfHwgW10pXHJcbiAgICAgICAgZGVidWdsb2coJyoqIHJlc3VsdCBmb3IgJyArIHNLZXkgKyAnID0gJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSlcclxuICAgICAgICBiZXN0TmV4dC5wdXNoKHJlcyB8fCBbXSlcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBydWxlIG5vdCByZWxldmFudFxyXG4gICAgICAgIGJlc3ROZXh0LnB1c2goW29Db250ZXh0XSk7XHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgICBiZXN0TiA9IHRha2VUb3BOKGJlc3ROZXh0KTtcclxuICB9KTtcclxuICByZXR1cm4gYmVzdE5cclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhcHBseVJ1bGVzUGlja0ZpcnN0KGNvbnRleHQ6IElGTWF0Y2guY29udGV4dCk6IElGTWF0Y2guY29udGV4dCB7XHJcbiAgdmFyIHIgPSBhcHBseVJ1bGVzKGNvbnRleHQpO1xyXG4gIHJldHVybiByICYmIHJbMF07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZWNpZGUgd2hldGhlciB0byByZXF1ZXJ5IGZvciBhIGNvbnRldFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGRlY2lkZU9uUmVRdWVyeShjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQpOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICByZXR1cm4gW11cclxufVxyXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
