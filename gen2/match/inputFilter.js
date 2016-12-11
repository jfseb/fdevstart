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
            var seenIt = words[sWordGroup];
            if (seenIt === undefined) {
                seenIt = categorizeWordWithRankCutoff(sWordGroup, aRules);
                if (seenIt === undefined) words[sWordGroup] = seenIt;
            }
            cnt = cnt + seenIt.length;
            fac = fac * seenIt.length;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1hdGNoL2lucHV0RmlsdGVyLmpzIiwiLi4vc3JjL21hdGNoL2lucHV0RmlsdGVyLnRzIl0sIm5hbWVzIjpbImRpc3RhbmNlIiwicmVxdWlyZSIsIkxvZ2dlciIsImxvZ2dlciIsImRlYnVnIiwidXRpbHMiLCJBbGdvbCIsImJyZWFrZG93biIsIkFueU9iamVjdCIsIk9iamVjdCIsImRlYnVnbG9nIiwibWF0Y2hkYXRhIiwib1VuaXRUZXN0cyIsImNhbGNEaXN0YW5jZSIsInNUZXh0MSIsInNUZXh0MiIsImEwIiwibGV2ZW5zaHRlaW4iLCJzdWJzdHJpbmciLCJsZW5ndGgiLCJhIiwidG9Mb3dlckNhc2UiLCJJRk1hdGNoIiwibGV2ZW5DdXRvZmYiLCJDdXRvZmZfTGV2ZW5TaHRlaW4iLCJsZXZlblBlbmFsdHkiLCJpIiwiZXhwb3J0cyIsIm5vblByaXZhdGVLZXlzIiwib0EiLCJrZXlzIiwiZmlsdGVyIiwia2V5IiwiY291bnRBaW5CIiwib0IiLCJmbkNvbXBhcmUiLCJhS2V5SWdub3JlIiwiQXJyYXkiLCJpc0FycmF5IiwiaW5kZXhPZiIsInJlZHVjZSIsInByZXYiLCJwcm90b3R5cGUiLCJoYXNPd25Qcm9wZXJ0eSIsImNhbGwiLCJzcHVyaW91c0Fub3RJbkIiLCJsb3dlckNhc2UiLCJvIiwiY29tcGFyZUNvbnRleHQiLCJlcXVhbCIsImIiLCJkaWZmZXJlbnQiLCJzcHVyaW91c0wiLCJzcHVyaW91c1IiLCJzb3J0QnlSYW5rIiwiciIsIl9yYW5raW5nIiwiY2F0ZWdvcnkiLCJsb2NhbGVDb21wYXJlIiwibWF0Y2hlZFN0cmluZyIsImNhdGVnb3JpemVTdHJpbmciLCJzdHJpbmciLCJleGFjdCIsIm9SdWxlcyIsIkpTT04iLCJzdHJpbmdpZnkiLCJyZXMiLCJmb3JFYWNoIiwib1J1bGUiLCJ0eXBlIiwid29yZCIsInB1c2giLCJsZXZlbm1hdGNoIiwidW5kZWZpbmVkIiwibSIsInJlZ2V4cCIsImV4ZWMiLCJtYXRjaEluZGV4IiwiRXJyb3IiLCJzb3J0IiwibWF0Y2hXb3JkIiwiY29udGV4dCIsIm9wdGlvbnMiLCJzMSIsInMyIiwiZGVsdGEiLCJmb2xsb3dzIiwibWF0Y2hvdGhlcnMiLCJjIiwiYXNzaWduIiwib3ZlcnJpZGUiLCJfd2VpZ2h0IiwiZnJlZXplIiwiZXh0cmFjdEFyZ3NNYXAiLCJtYXRjaCIsImFyZ3NNYXAiLCJpS2V5IiwidmFsdWUiLCJSYW5rV29yZCIsImhhc0Fib3ZlIiwibHN0IiwiYm9yZGVyIiwiZXZlcnkiLCJvTWVtYmVyIiwidGFrZUZpcnN0TiIsIm4iLCJpSW5kZXgiLCJsYXN0UmFua2luZyIsInRha2VBYm92ZSIsImNhdGVnb3JpemVXb3JkV2l0aFJhbmtDdXRvZmYiLCJzV29yZEdyb3VwIiwiYVJ1bGVzIiwic2Vlbkl0IiwiVG9wX05fV29yZENhdGVnb3JpemF0aW9ucyIsImZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZFNlbnRlbmNlIiwib1NlbnRlbmNlIiwib1dvcmRHcm91cCIsImZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZCIsImFyciIsImFuYWx5emVTdHJpbmciLCJzU3RyaW5nIiwiY250IiwiZmFjIiwidSIsImJyZWFrZG93blN0cmluZyIsIndvcmRzIiwibWFwIiwiYUFyciIsImNsb25lIiwiY2xvbmVEZWVwIiwiZXhwYW5kTWF0Y2hBcnIiLCJkZWVwIiwibGluZSIsInVCcmVha0Rvd25MaW5lIiwiYVdvcmRHcm91cCIsIndnSW5kZXgiLCJvV29yZFZhcmlhbnQiLCJpV1ZJbmRleCIsIm52ZWNzIiwidmVjcyIsInJ2ZWMiLCJrIiwibmV4dEJhc2UiLCJsIiwic2xpY2UiLCJjb25jYXQiLCJyZWluZm9yY2VEaXN0V2VpZ2h0IiwiZGlzdCIsImFicyIsIk1hdGgiLCJhUmVpbmZvcmNlRGlzdFdlaWdodCIsImV4dHJhY3RDYXRlZ29yeU1hcCIsIm9Xb3JkIiwiQ0FUX0NBVEVHT1JZIiwicG9zIiwiZGVlcEZyZWV6ZSIsInJlaW5Gb3JjZVNlbnRlbmNlIiwib0NhdGVnb3J5TWFwIiwib1Bvc2l0aW9uIiwicmVpbmZvcmNlIiwiYm9vc3QiLCJTZW50ZW5jZSIsInJlaW5Gb3JjZSIsImFDYXRlZ29yaXplZEFycmF5IiwiY21wUmFua2luZ1Byb2R1Y3QiLCJyYW5raW5nUHJvZHVjdCIsImpvaW4iLCJtYXRjaFJlZ0V4cCIsInNLZXkiLCJyZWciLCJvRXh0cmFjdGVkQ29udGV4dCIsInNvcnRCeVdlaWdodCIsIm9Db250ZXh0QSIsIm9Db250ZXh0QiIsInJhbmtpbmdBIiwicGFyc2VGbG9hdCIsInJhbmtpbmdCIiwid2VpZ2h0QSIsIndlaWdodEIiLCJhdWdtZW50Q29udGV4dDEiLCJlbmFibGVkIiwiaVJ1bGUiLCJvcmVzIiwiYmluZCIsImF1Z21lbnRDb250ZXh0Iiwib3B0aW9uczEiLCJhUmVzIiwib3B0aW9uczIiLCJpbnNlcnRPcmRlcmVkIiwicmVzdWx0IiwiaUluc2VydGVkTWVtYmVyIiwibGltaXQiLCJ0YWtlVG9wTiIsImlubmVyQXJyIiwiaUFyciIsInRvcCIsInNoaWZ0IiwiaW5wdXRGaWx0ZXJSdWxlcyIsInJtIiwiZ2V0Uk1PbmNlIiwiZ2V0UnVsZU1hcCIsImFwcGx5UnVsZXMiLCJiZXN0TiIsIm9LZXlPcmRlciIsImJlc3ROZXh0Iiwib0NvbnRleHQiLCJhcHBseVJ1bGVzUGlja0ZpcnN0IiwiZGVjaWRlT25SZVF1ZXJ5Il0sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBOzs7Ozs7Ozs7Ozs7Ozs7O0FBZ0JBOztBQUNBLElBQVlBLFdBQVFDLFFBQU0sNkJBQU4sQ0FBcEI7QUFHQSxJQUFZQyxTQUFNRCxRQUFNLGlCQUFOLENBQWxCO0FBRUEsSUFBTUUsU0FBU0QsT0FBT0MsTUFBUCxDQUFjLGFBQWQsQ0FBZjtBQUVBLElBQVlDLFFBQUtILFFBQU0sT0FBTixDQUFqQjtBQUVBLElBQVlJLFFBQUtKLFFBQU0sZ0JBQU4sQ0FBakI7QUFHQSxJQUFZSyxRQUFLTCxRQUFNLFNBQU4sQ0FBakI7QUFJQSxJQUFZTSxZQUFTTixRQUFNLGFBQU4sQ0FBckI7QUFFQSxJQUFNTyxZQUFpQkMsTUFBdkI7QUFFQSxJQUFN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RCxRQUFJMUIsSUFBSWtKLFdBQVd4SCxPQUFYLENBQVI7QUFDQSxXQUFPMUIsS0FBS0EsRUFBRSxDQUFGLENBQVo7QUFDRDtBQUhlNUIsUUFBQW1MLG1CQUFBLEdBQW1CQSxtQkFBbkI7QUFLaEI7OztBQUdBLFNBQUFDLGVBQUEsQ0FBZ0M5SCxPQUFoQyxFQUF3RDtBQUN0RCxXQUFPLEVBQVA7QUFDRDtBQUZldEQsUUFBQW9MLGVBQUEsR0FBZUEsZUFBZiIsImZpbGUiOiJtYXRjaC9pbnB1dEZpbHRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuLyoqXG4gKiB0aGUgaW5wdXQgZmlsdGVyIHN0YWdlIHByZXByb2Nlc3NlcyBhIGN1cnJlbnQgY29udGV4dFxuICpcbiAqIEl0IGEpIGNvbWJpbmVzIG11bHRpLXNlZ21lbnQgYXJndW1lbnRzIGludG8gb25lIGNvbnRleHQgbWVtYmVyc1xuICogSXQgYikgYXR0ZW1wdHMgdG8gYXVnbWVudCB0aGUgY29udGV4dCBieSBhZGRpdGlvbmFsIHF1YWxpZmljYXRpb25zXG4gKiAgICAgICAgICAgKE1pZCB0ZXJtIGdlbmVyYXRpbmcgQWx0ZXJuYXRpdmVzLCBlLmcuXG4gKiAgICAgICAgICAgICAgICAgQ2xpZW50U2lkZVRhcmdldFJlc29sdXRpb24gLT4gdW5pdCB0ZXN0P1xuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHNvdXJjZSA/XG4gKiAgICAgICAgICAgKVxuICogIFNpbXBsZSBydWxlcyBsaWtlICBJbnRlbnRcbiAqXG4gKlxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuaW5wdXRGaWx0ZXJcbiAqIEBmaWxlIGlucHV0RmlsdGVyLnRzXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXG4gKi9cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9saWIvbm9kZS00LmQudHNcIiAvPlxudmFyIGRpc3RhbmNlID0gcmVxdWlyZSgnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluJyk7XG52YXIgTG9nZ2VyID0gcmVxdWlyZSgnLi4vdXRpbHMvbG9nZ2VyJyk7XG52YXIgbG9nZ2VyID0gTG9nZ2VyLmxvZ2dlcignaW5wdXRGaWx0ZXInKTtcbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscy91dGlscycpO1xudmFyIEFsZ29sID0gcmVxdWlyZSgnLi9hbGdvbCcpO1xudmFyIGJyZWFrZG93biA9IHJlcXVpcmUoJy4vYnJlYWtkb3duJyk7XG52YXIgQW55T2JqZWN0ID0gT2JqZWN0O1xudmFyIGRlYnVnbG9nID0gZGVidWcoJ2lucHV0RmlsdGVyJyk7XG52YXIgbWF0Y2hkYXRhID0gcmVxdWlyZSgnLi9tYXRjaGRhdGEnKTtcbnZhciBvVW5pdFRlc3RzID0gbWF0Y2hkYXRhLm9Vbml0VGVzdHM7XG4vKipcbiAqIEBwYXJhbSBzVGV4dCB7c3RyaW5nfSB0aGUgdGV4dCB0byBtYXRjaCB0byBOYXZUYXJnZXRSZXNvbHV0aW9uXG4gKiBAcGFyYW0gc1RleHQyIHtzdHJpbmd9IHRoZSBxdWVyeSB0ZXh0LCBlLmcuIE5hdlRhcmdldFxuICpcbiAqIEByZXR1cm4gdGhlIGRpc3RhbmNlLCBub3RlIHRoYXQgaXMgaXMgKm5vdCogc3ltbWV0cmljIVxuICovXG5mdW5jdGlvbiBjYWxjRGlzdGFuY2Uoc1RleHQxLCBzVGV4dDIpIHtcbiAgICAvLyBjb25zb2xlLmxvZyhcImxlbmd0aDJcIiArIHNUZXh0MSArIFwiIC0gXCIgKyBzVGV4dDIpXG4gICAgdmFyIGEwID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnN1YnN0cmluZygwLCBzVGV4dDIubGVuZ3RoKSwgc1RleHQyKTtcbiAgICB2YXIgYSA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS50b0xvd2VyQ2FzZSgpLCBzVGV4dDIpO1xuICAgIHJldHVybiBhMCAqIDUwMCAvIHNUZXh0Mi5sZW5ndGggKyBhO1xufVxudmFyIElGTWF0Y2ggPSByZXF1aXJlKCcuLi9tYXRjaC9pZm1hdGNoJyk7XG52YXIgbGV2ZW5DdXRvZmYgPSBBbGdvbC5DdXRvZmZfTGV2ZW5TaHRlaW47XG5mdW5jdGlvbiBsZXZlblBlbmFsdHkoaSkge1xuICAgIC8vIDAtPiAxXG4gICAgLy8gMSAtPiAwLjFcbiAgICAvLyAxNTAgLT4gIDAuOFxuICAgIGlmIChpID09PSAwKSB7XG4gICAgICAgIHJldHVybiAxO1xuICAgIH1cbiAgICAvLyByZXZlcnNlIG1heSBiZSBiZXR0ZXIgdGhhbiBsaW5lYXJcbiAgICByZXR1cm4gMSArIGkgKiAoMC44IC0gMSkgLyAxNTA7XG59XG5leHBvcnRzLmxldmVuUGVuYWx0eSA9IGxldmVuUGVuYWx0eTtcbmZ1bmN0aW9uIG5vblByaXZhdGVLZXlzKG9BKSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4ga2V5WzBdICE9PSAnXyc7XG4gICAgfSk7XG59XG5mdW5jdGlvbiBjb3VudEFpbkIob0EsIG9CLCBmbkNvbXBhcmUsIGFLZXlJZ25vcmUpIHtcbiAgICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxuICAgICAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xuICAgIGZuQ29tcGFyZSA9IGZuQ29tcGFyZSB8fCBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcbiAgICB9KS5cbiAgICAgICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xuICAgICAgICAgICAgcHJldiA9IHByZXYgKyAoZm5Db21wYXJlKG9BW2tleV0sIG9CW2tleV0sIGtleSkgPyAxIDogMCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG59XG5leHBvcnRzLmNvdW50QWluQiA9IGNvdW50QWluQjtcbmZ1bmN0aW9uIHNwdXJpb3VzQW5vdEluQihvQSwgb0IsIGFLZXlJZ25vcmUpIHtcbiAgICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxuICAgICAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xuICAgIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcbiAgICB9KS5cbiAgICAgICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbn1cbmV4cG9ydHMuc3B1cmlvdXNBbm90SW5CID0gc3B1cmlvdXNBbm90SW5CO1xuZnVuY3Rpb24gbG93ZXJDYXNlKG8pIHtcbiAgICBpZiAodHlwZW9mIG8gPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgcmV0dXJuIG8udG9Mb3dlckNhc2UoKTtcbiAgICB9XG4gICAgcmV0dXJuIG87XG59XG5mdW5jdGlvbiBjb21wYXJlQ29udGV4dChvQSwgb0IsIGFLZXlJZ25vcmUpIHtcbiAgICB2YXIgZXF1YWwgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpID09PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xuICAgIHZhciBkaWZmZXJlbnQgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpICE9PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xuICAgIHZhciBzcHVyaW91c0wgPSBzcHVyaW91c0Fub3RJbkIob0EsIG9CLCBhS2V5SWdub3JlKTtcbiAgICB2YXIgc3B1cmlvdXNSID0gc3B1cmlvdXNBbm90SW5CKG9CLCBvQSwgYUtleUlnbm9yZSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZXF1YWw6IGVxdWFsLFxuICAgICAgICBkaWZmZXJlbnQ6IGRpZmZlcmVudCxcbiAgICAgICAgc3B1cmlvdXNMOiBzcHVyaW91c0wsXG4gICAgICAgIHNwdXJpb3VzUjogc3B1cmlvdXNSXG4gICAgfTtcbn1cbmV4cG9ydHMuY29tcGFyZUNvbnRleHQgPSBjb21wYXJlQ29udGV4dDtcbmZ1bmN0aW9uIHNvcnRCeVJhbmsoYSwgYikge1xuICAgIHZhciByID0gLSgoYS5fcmFua2luZyB8fCAxLjApIC0gKGIuX3JhbmtpbmcgfHwgMS4wKSk7XG4gICAgaWYgKHIpIHtcbiAgICAgICAgcmV0dXJuIHI7XG4gICAgfVxuICAgIGlmIChhLmNhdGVnb3J5ICYmIGIuY2F0ZWdvcnkpIHtcbiAgICAgICAgciA9IGEuY2F0ZWdvcnkubG9jYWxlQ29tcGFyZShiLmNhdGVnb3J5KTtcbiAgICAgICAgaWYgKHIpIHtcbiAgICAgICAgICAgIHJldHVybiByO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmIChhLm1hdGNoZWRTdHJpbmcgJiYgYi5tYXRjaGVkU3RyaW5nKSB7XG4gICAgICAgIHIgPSBhLm1hdGNoZWRTdHJpbmcubG9jYWxlQ29tcGFyZShiLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICBpZiAocikge1xuICAgICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIDA7XG59XG5mdW5jdGlvbiBjYXRlZ29yaXplU3RyaW5nKHN0cmluZywgZXhhY3QsIG9SdWxlcykge1xuICAgIC8vIHNpbXBseSBhcHBseSBhbGwgcnVsZXNcbiAgICBkZWJ1ZyhcInJ1bGVzIDogXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZXMpKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgb1J1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XG4gICAgICAgIGRlYnVnbG9nKCdhdHRlbXB0aW5nIHRvIG1hdGNoIHJ1bGUgJyArIEpTT04uc3RyaW5naWZ5KG9SdWxlKSArIFwiIHRvIHN0cmluZyBcXFwiXCIgKyBzdHJpbmcgKyBcIlxcXCJcIik7XG4gICAgICAgIHN3aXRjaCAob1J1bGUudHlwZSkge1xuICAgICAgICAgICAgY2FzZSAwIC8qIFdPUkQgKi86XG4gICAgICAgICAgICAgICAgaWYgKGV4YWN0ICYmIG9SdWxlLndvcmQgPT09IHN0cmluZykge1xuICAgICAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgICAgICBfcmFua2luZzogb1J1bGUuX3JhbmtpbmcgfHwgMS4wXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIWV4YWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsZXZlbm1hdGNoID0gY2FsY0Rpc3RhbmNlKG9SdWxlLndvcmQsIHN0cmluZyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsZXZlbm1hdGNoIDwgbGV2ZW5DdXRvZmYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBvUnVsZS53b3JkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfcmFua2luZzogKG9SdWxlLl9yYW5raW5nIHx8IDEuMCkgKiBsZXZlblBlbmFsdHkobGV2ZW5tYXRjaCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV2ZW5tYXRjaDogbGV2ZW5tYXRjaFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDEgLyogUkVHRVhQICovOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoXCIgaGVyZSByZWdleHBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLCB1bmRlZmluZWQsIDIpKSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBtID0gb1J1bGUucmVnZXhwLmV4ZWMoc3RyaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiAob1J1bGUubWF0Y2hJbmRleCAhPT0gdW5kZWZpbmVkICYmIG1bb1J1bGUubWF0Y2hJbmRleF0pIHx8IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IG9SdWxlLl9yYW5raW5nIHx8IDEuMFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInVua25vd24gdHlwZVwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmVzLnNvcnQoc29ydEJ5UmFuayk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuY2F0ZWdvcml6ZVN0cmluZyA9IGNhdGVnb3JpemVTdHJpbmc7XG4vKipcbiAqXG4gKiBPcHRpb25zIG1heSBiZSB7XG4gKiBtYXRjaG90aGVycyA6IHRydWUsICA9PiBvbmx5IHJ1bGVzIHdoZXJlIGFsbCBvdGhlcnMgbWF0Y2ggYXJlIGNvbnNpZGVyZWRcbiAqIGF1Z21lbnQgOiB0cnVlLFxuICogb3ZlcnJpZGUgOiB0cnVlIH0gID0+XG4gKlxuICovXG5mdW5jdGlvbiBtYXRjaFdvcmQob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAoY29udGV4dFtvUnVsZS5rZXldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIHMxID0gY29udGV4dFtvUnVsZS5rZXldLnRvTG93ZXJDYXNlKCk7XG4gICAgdmFyIHMyID0gb1J1bGUud29yZC50b0xvd2VyQ2FzZSgpO1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsIG9SdWxlLmZvbGxvd3MsIG9SdWxlLmtleSk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XG4gICAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBjID0gY2FsY0Rpc3RhbmNlKHMyLCBzMSk7XG4gICAgZGVidWdsb2coXCIgczEgPD4gczIgXCIgKyBzMSArIFwiPD5cIiArIHMyICsgXCIgID0+OiBcIiArIGMpO1xuICAgIGlmIChjIDwgMTUwKSB7XG4gICAgICAgIHZhciByZXMgPSBBbnlPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKTtcbiAgICAgICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIGNvbnRleHQpO1xuICAgICAgICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xuICAgICAgICAgICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGZvcmNlIGtleSBwcm9wZXJ0eVxuICAgICAgICAvLyBjb25zb2xlLmxvZygnIG9iamVjdGNhdGVnb3J5JywgcmVzWydzeXN0ZW1PYmplY3RDYXRlZ29yeSddKTtcbiAgICAgICAgcmVzW29SdWxlLmtleV0gPSBvUnVsZS5mb2xsb3dzW29SdWxlLmtleV0gfHwgcmVzW29SdWxlLmtleV07XG4gICAgICAgIHJlcy5fd2VpZ2h0ID0gQW55T2JqZWN0LmFzc2lnbih7fSwgcmVzLl93ZWlnaHQpO1xuICAgICAgICByZXMuX3dlaWdodFtvUnVsZS5rZXldID0gYztcbiAgICAgICAgT2JqZWN0LmZyZWV6ZShyZXMpO1xuICAgICAgICBkZWJ1Z2xvZygnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5leHBvcnRzLm1hdGNoV29yZCA9IG1hdGNoV29yZDtcbmZ1bmN0aW9uIGV4dHJhY3RBcmdzTWFwKG1hdGNoLCBhcmdzTWFwKSB7XG4gICAgdmFyIHJlcyA9IHt9O1xuICAgIGlmICghYXJnc01hcCkge1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cbiAgICBPYmplY3Qua2V5cyhhcmdzTWFwKS5mb3JFYWNoKGZ1bmN0aW9uIChpS2V5KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IG1hdGNoW2lLZXldO1xuICAgICAgICB2YXIga2V5ID0gYXJnc01hcFtpS2V5XTtcbiAgICAgICAgaWYgKCh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpICYmIHZhbHVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJlc1trZXldID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5leHRyYWN0QXJnc01hcCA9IGV4dHJhY3RBcmdzTWFwO1xuZXhwb3J0cy5SYW5rV29yZCA9IHtcbiAgICBoYXNBYm92ZTogZnVuY3Rpb24gKGxzdCwgYm9yZGVyKSB7XG4gICAgICAgIHJldHVybiAhbHN0LmV2ZXJ5KGZ1bmN0aW9uIChvTWVtYmVyKSB7XG4gICAgICAgICAgICByZXR1cm4gKG9NZW1iZXIuX3JhbmtpbmcgPCBib3JkZXIpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIHRha2VGaXJzdE46IGZ1bmN0aW9uIChsc3QsIG4pIHtcbiAgICAgICAgcmV0dXJuIGxzdC5maWx0ZXIoZnVuY3Rpb24gKG9NZW1iZXIsIGlJbmRleCkge1xuICAgICAgICAgICAgdmFyIGxhc3RSYW5raW5nID0gMS4wO1xuICAgICAgICAgICAgaWYgKChpSW5kZXggPCBuKSB8fCBvTWVtYmVyLl9yYW5raW5nID09PSBsYXN0UmFua2luZykge1xuICAgICAgICAgICAgICAgIGxhc3RSYW5raW5nID0gb01lbWJlci5fcmFua2luZztcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICB0YWtlQWJvdmU6IGZ1bmN0aW9uIChsc3QsIGJvcmRlcikge1xuICAgICAgICByZXR1cm4gbHN0LmZpbHRlcihmdW5jdGlvbiAob01lbWJlcikge1xuICAgICAgICAgICAgcmV0dXJuIChvTWVtYmVyLl9yYW5raW5nID49IGJvcmRlcik7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5mdW5jdGlvbiBjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmKHNXb3JkR3JvdXAsIGFSdWxlcykge1xuICAgIHZhciBzZWVuSXQgPSBjYXRlZ29yaXplU3RyaW5nKHNXb3JkR3JvdXAsIHRydWUsIGFSdWxlcyk7XG4gICAgaWYgKGV4cG9ydHMuUmFua1dvcmQuaGFzQWJvdmUoc2Vlbkl0LCAwLjgpKSB7XG4gICAgICAgIHNlZW5JdCA9IGV4cG9ydHMuUmFua1dvcmQudGFrZUFib3ZlKHNlZW5JdCwgMC44KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHNlZW5JdCA9IGNhdGVnb3JpemVTdHJpbmcoc1dvcmRHcm91cCwgZmFsc2UsIGFSdWxlcyk7XG4gICAgfVxuICAgIHNlZW5JdCA9IGV4cG9ydHMuUmFua1dvcmQudGFrZUZpcnN0TihzZWVuSXQsIEFsZ29sLlRvcF9OX1dvcmRDYXRlZ29yaXphdGlvbnMpO1xuICAgIHJldHVybiBzZWVuSXQ7XG59XG5leHBvcnRzLmNhdGVnb3JpemVXb3JkV2l0aFJhbmtDdXRvZmYgPSBjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmO1xuZnVuY3Rpb24gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkU2VudGVuY2Uob1NlbnRlbmNlKSB7XG4gICAgcmV0dXJuIG9TZW50ZW5jZS5ldmVyeShmdW5jdGlvbiAob1dvcmRHcm91cCkge1xuICAgICAgICByZXR1cm4gKG9Xb3JkR3JvdXAubGVuZ3RoID4gMCk7XG4gICAgfSk7XG59XG5leHBvcnRzLmZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZFNlbnRlbmNlID0gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkU2VudGVuY2U7XG5mdW5jdGlvbiBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWQoYXJyKSB7XG4gICAgcmV0dXJuIGFyci5maWx0ZXIoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICByZXR1cm4gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkU2VudGVuY2Uob1NlbnRlbmNlKTtcbiAgICB9KTtcbn1cbmV4cG9ydHMuZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkID0gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkO1xuLyoqXG4gKiBHaXZlbiBhICBzdHJpbmcsIGJyZWFrIGl0IGRvd24gaW50byBjb21wb25lbnRzLFxuICogW1snQScsICdCJ10sIFsnQSBCJ11dXG4gKlxuICogdGhlbiBjYXRlZ29yaXplV29yZHNcbiAqIHJldHVybmluZ1xuICpcbiAqIFsgW1sgeyBjYXRlZ29yeTogJ3N5c3RlbUlkJywgd29yZCA6ICdBJ30sXG4gKiAgICAgIHsgY2F0ZWdvcnk6ICdvdGhlcnRoaW5nJywgd29yZCA6ICdBJ31cbiAqICAgIF0sXG4gKiAgICAvLyByZXN1bHQgb2YgQlxuICogICAgWyB7IGNhdGVnb3J5OiAnc3lzdGVtSWQnLCB3b3JkIDogJ0InfSxcbiAqICAgICAgeyBjYXRlZ29yeTogJ290aGVydGhpbmcnLCB3b3JkIDogJ0EnfVxuICogICAgICB7IGNhdGVnb3J5OiAnYW5vdGhlcnRyeXAnLCB3b3JkIDogJ0InfVxuICogICAgXVxuICogICBdLFxuICogXV1dXG4gKlxuICpcbiAqXG4gKi9cbmZ1bmN0aW9uIGFuYWx5emVTdHJpbmcoc1N0cmluZywgYVJ1bGVzKSB7XG4gICAgdmFyIGNudCA9IDA7XG4gICAgdmFyIGZhYyA9IDE7XG4gICAgdmFyIHUgPSBicmVha2Rvd24uYnJlYWtkb3duU3RyaW5nKHNTdHJpbmcpO1xuICAgIGRlYnVnbG9nKFwiaGVyZSBicmVha2Rvd25cIiArIEpTT04uc3RyaW5naWZ5KHUpKTtcbiAgICB2YXIgd29yZHMgPSB7fTtcbiAgICB2YXIgcmVzID0gdS5tYXAoZnVuY3Rpb24gKGFBcnIpIHtcbiAgICAgICAgcmV0dXJuIGFBcnIubWFwKGZ1bmN0aW9uIChzV29yZEdyb3VwKSB7XG4gICAgICAgICAgICB2YXIgc2Vlbkl0ID0gd29yZHNbc1dvcmRHcm91cF07XG4gICAgICAgICAgICBpZiAoc2Vlbkl0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBzZWVuSXQgPSBjYXRlZ29yaXplV29yZFdpdGhSYW5rQ3V0b2ZmKHNXb3JkR3JvdXAsIGFSdWxlcyk7XG4gICAgICAgICAgICAgICAgaWYgKHNlZW5JdCA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgICAgICB3b3Jkc1tzV29yZEdyb3VwXSA9IHNlZW5JdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNudCA9IGNudCArIHNlZW5JdC5sZW5ndGg7XG4gICAgICAgICAgICBmYWMgPSBmYWMgKiBzZWVuSXQubGVuZ3RoO1xuICAgICAgICAgICAgaWYgKCFzZWVuSXQgfHwgc2Vlbkl0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGxvZ2dlcihcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIFxcXCJcIiArIHNXb3JkR3JvdXAgKyBcIlxcXCIgaW4gc2VudGVuY2UgXFxcIlwiXG4gICAgICAgICAgICAgICAgICAgICsgc1N0cmluZyArIFwiXFxcIlwiKTtcbiAgICAgICAgICAgICAgICBpZiAoc1dvcmRHcm91cC5pbmRleE9mKFwiIFwiKSA8PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgcHJpbWl0aXZlICghKVwiICsgc1dvcmRHcm91cCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGRlYnVnbG9nKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgXCIgKyBzV29yZEdyb3VwKTtcbiAgICAgICAgICAgICAgICBpZiAoIXNlZW5JdCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJFeHBlY3RpbmcgZW10cHkgbGlzdCwgbm90IHVuZGVmaW5lZCBmb3IgXFxcIlwiICsgc1dvcmRHcm91cCArIFwiXFxcIlwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHNlZW5JdDtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmVzID0gZmlsdGVyUmVtb3ZpbmdVbmNhdGVnb3JpemVkKHJlcyk7XG4gICAgZGVidWdsb2coXCIgc2VudGVuY2VzIFwiICsgdS5sZW5ndGggKyBcIiBtYXRjaGVzIFwiICsgY250ICsgXCIgZmFjOiBcIiArIGZhYyk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuYW5hbHl6ZVN0cmluZyA9IGFuYWx5emVTdHJpbmc7XG4vKlxuWyBbYSxiXSwgW2MsZF1dXG5cbjAwIGFcbjAxIGJcbjEwIGNcbjExIGRcbjEyIGNcbiovXG52YXIgY2xvbmUgPSB1dGlscy5jbG9uZURlZXA7XG4vLyB3ZSBjYW4gcmVwbGljYXRlIHRoZSB0YWlsIG9yIHRoZSBoZWFkLFxuLy8gd2UgcmVwbGljYXRlIHRoZSB0YWlsIGFzIGl0IGlzIHNtYWxsZXIuXG4vLyBbYSxiLGMgXVxuZnVuY3Rpb24gZXhwYW5kTWF0Y2hBcnIoZGVlcCkge1xuICAgIHZhciBhID0gW107XG4gICAgdmFyIGxpbmUgPSBbXTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWVwKSk7XG4gICAgZGVlcC5mb3JFYWNoKGZ1bmN0aW9uICh1QnJlYWtEb3duTGluZSwgaUluZGV4KSB7XG4gICAgICAgIGxpbmVbaUluZGV4XSA9IFtdO1xuICAgICAgICB1QnJlYWtEb3duTGluZS5mb3JFYWNoKGZ1bmN0aW9uIChhV29yZEdyb3VwLCB3Z0luZGV4KSB7XG4gICAgICAgICAgICBsaW5lW2lJbmRleF1bd2dJbmRleF0gPSBbXTtcbiAgICAgICAgICAgIGFXb3JkR3JvdXAuZm9yRWFjaChmdW5jdGlvbiAob1dvcmRWYXJpYW50LCBpV1ZJbmRleCkge1xuICAgICAgICAgICAgICAgIGxpbmVbaUluZGV4XVt3Z0luZGV4XVtpV1ZJbmRleF0gPSBvV29yZFZhcmlhbnQ7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkobGluZSkpO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICB2YXIgbnZlY3MgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpbmUubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIHZlY3MgPSBbW11dO1xuICAgICAgICB2YXIgbnZlY3MgPSBbXTtcbiAgICAgICAgdmFyIHJ2ZWMgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCBsaW5lW2ldLmxlbmd0aDsgKytrKSB7XG4gICAgICAgICAgICAvL3ZlY3MgaXMgdGhlIHZlY3RvciBvZiBhbGwgc28gZmFyIHNlZW4gdmFyaWFudHMgdXAgdG8gayB3Z3MuXG4gICAgICAgICAgICB2YXIgbmV4dEJhc2UgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGwgPSAwOyBsIDwgbGluZVtpXVtrXS5sZW5ndGg7ICsrbCkge1xuICAgICAgICAgICAgICAgIC8vZGVidWdsb2coXCJ2ZWNzIG5vd1wiICsgSlNPTi5zdHJpbmdpZnkodmVjcykpO1xuICAgICAgICAgICAgICAgIG52ZWNzID0gW107IC8vdmVjcy5zbGljZSgpOyAvLyBjb3B5IHRoZSB2ZWNbaV0gYmFzZSB2ZWN0b3I7XG4gICAgICAgICAgICAgICAgLy9kZWJ1Z2xvZyhcInZlY3MgY29waWVkIG5vd1wiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciB1ID0gMDsgdSA8IHZlY3MubGVuZ3RoOyArK3UpIHtcbiAgICAgICAgICAgICAgICAgICAgbnZlY3NbdV0gPSB2ZWNzW3VdLnNsaWNlKCk7IC8vXG4gICAgICAgICAgICAgICAgICAgIC8vIGRlYnVnbG9nKFwiY29waWVkIHZlY3NbXCIrIHUrXCJdXCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzW3VdKSk7XG4gICAgICAgICAgICAgICAgICAgIG52ZWNzW3VdLnB1c2goY2xvbmUobGluZVtpXVtrXVtsXSkpOyAvLyBwdXNoIHRoZSBsdGggdmFyaWFudFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyAgIGRlYnVnbG9nKFwiIGF0ICAgICBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiBuZXh0YmFzZSA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpXG4gICAgICAgICAgICAgICAgLy8gICBkZWJ1Z2xvZyhcIiBhcHBlbmQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgbnZlY3MgICAgPlwiICsgSlNPTi5zdHJpbmdpZnkobnZlY3MpKVxuICAgICAgICAgICAgICAgIG5leHRCYXNlID0gbmV4dEJhc2UuY29uY2F0KG52ZWNzKTtcbiAgICAgICAgICAgIH0gLy9jb25zdHJ1XG4gICAgICAgICAgICAvLyAgZGVidWdsb2coXCJub3cgYXQgXCIgKyBrICsgXCI6XCIgKyBsICsgXCIgPlwiICsgSlNPTi5zdHJpbmdpZnkobmV4dEJhc2UpKVxuICAgICAgICAgICAgdmVjcyA9IG5leHRCYXNlO1xuICAgICAgICB9XG4gICAgICAgIGRlYnVnbG9nKFwiQVBQRU5ESU5HIFRPIFJFU1wiICsgaSArIFwiOlwiICsgbCArIFwiID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSk7XG4gICAgICAgIHJlcyA9IHJlcy5jb25jYXQodmVjcyk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmV4cGFuZE1hdGNoQXJyID0gZXhwYW5kTWF0Y2hBcnI7XG4vKipcbiAqIENhbGN1bGF0ZSBhIHdlaWdodCBmYWN0b3IgZm9yIGEgZ2l2ZW4gZGlzdGFuY2UgYW5kXG4gKiBjYXRlZ29yeVxuICogQHBhcmFtIHtpbnRlZ2VyfSBkaXN0IGRpc3RhbmNlIGluIHdvcmRzXG4gKiBAcGFyYW0ge3N0cmluZ30gY2F0ZWdvcnkgY2F0ZWdvcnkgdG8gdXNlXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBhIGRpc3RhbmNlIGZhY3RvciA+PSAxXG4gKiAgMS4wIGZvciBubyBlZmZlY3RcbiAqL1xuZnVuY3Rpb24gcmVpbmZvcmNlRGlzdFdlaWdodChkaXN0LCBjYXRlZ29yeSkge1xuICAgIHZhciBhYnMgPSBNYXRoLmFicyhkaXN0KTtcbiAgICByZXR1cm4gMS4wICsgKEFsZ29sLmFSZWluZm9yY2VEaXN0V2VpZ2h0W2Fic10gfHwgMCk7XG59XG5leHBvcnRzLnJlaW5mb3JjZURpc3RXZWlnaHQgPSByZWluZm9yY2VEaXN0V2VpZ2h0O1xuLyoqXG4gKiBHaXZlbiBhIHNlbnRlbmNlLCBleHRhY3QgY2F0ZWdvcmllc1xuICovXG5mdW5jdGlvbiBleHRyYWN0Q2F0ZWdvcnlNYXAob1NlbnRlbmNlKSB7XG4gICAgdmFyIHJlcyA9IHt9O1xuICAgIGRlYnVnbG9nKCdleHRyYWN0Q2F0ZWdvcnlNYXAgJyArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSkpO1xuICAgIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaUluZGV4KSB7XG4gICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gSUZNYXRjaC5DQVRfQ0FURUdPUlkpIHtcbiAgICAgICAgICAgIHJlc1tvV29yZC5tYXRjaGVkU3RyaW5nXSA9IHJlc1tvV29yZC5tYXRjaGVkU3RyaW5nXSB8fCBbXTtcbiAgICAgICAgICAgIHJlc1tvV29yZC5tYXRjaGVkU3RyaW5nXS5wdXNoKHsgcG9zOiBpSW5kZXggfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICB1dGlscy5kZWVwRnJlZXplKHJlcyk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZXh0cmFjdENhdGVnb3J5TWFwID0gZXh0cmFjdENhdGVnb3J5TWFwO1xuZnVuY3Rpb24gcmVpbkZvcmNlU2VudGVuY2Uob1NlbnRlbmNlKSB7XG4gICAgdmFyIG9DYXRlZ29yeU1hcCA9IGV4dHJhY3RDYXRlZ29yeU1hcChvU2VudGVuY2UpO1xuICAgIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaUluZGV4KSB7XG4gICAgICAgIHZhciBtID0gb0NhdGVnb3J5TWFwW29Xb3JkLmNhdGVnb3J5XSB8fCBbXTtcbiAgICAgICAgbS5mb3JFYWNoKGZ1bmN0aW9uIChvUG9zaXRpb24pIHtcbiAgICAgICAgICAgIG9Xb3JkLnJlaW5mb3JjZSA9IG9Xb3JkLnJlaW5mb3JjZSB8fCAxO1xuICAgICAgICAgICAgdmFyIGJvb3N0ID0gcmVpbmZvcmNlRGlzdFdlaWdodChpSW5kZXggLSBvUG9zaXRpb24ucG9zLCBvV29yZC5jYXRlZ29yeSk7XG4gICAgICAgICAgICBvV29yZC5yZWluZm9yY2UgKj0gYm9vc3Q7XG4gICAgICAgICAgICBvV29yZC5fcmFua2luZyAqPSBib29zdDtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIG9TZW50ZW5jZTtcbn1cbmV4cG9ydHMucmVpbkZvcmNlU2VudGVuY2UgPSByZWluRm9yY2VTZW50ZW5jZTtcbnZhciBTZW50ZW5jZSA9IHJlcXVpcmUoJy4vc2VudGVuY2UnKTtcbmZ1bmN0aW9uIHJlaW5Gb3JjZShhQ2F0ZWdvcml6ZWRBcnJheSkge1xuICAgIGFDYXRlZ29yaXplZEFycmF5LmZvckVhY2goZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICByZWluRm9yY2VTZW50ZW5jZShvU2VudGVuY2UpO1xuICAgIH0pO1xuICAgIGFDYXRlZ29yaXplZEFycmF5LnNvcnQoU2VudGVuY2UuY21wUmFua2luZ1Byb2R1Y3QpO1xuICAgIGRlYnVnbG9nKFwiYWZ0ZXIgcmVpbmZvcmNlXCIgKyBhQ2F0ZWdvcml6ZWRBcnJheS5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgICByZXR1cm4gYUNhdGVnb3JpemVkQXJyYXk7XG59XG5leHBvcnRzLnJlaW5Gb3JjZSA9IHJlaW5Gb3JjZTtcbi8vLyBiZWxvdyBtYXkgbm8gbG9uZ2VyIGJlIHVzZWRcbmZ1bmN0aW9uIG1hdGNoUmVnRXhwKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBzS2V5ID0gb1J1bGUua2V5O1xuICAgIHZhciBzMSA9IGNvbnRleHRbb1J1bGUua2V5XS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciByZWcgPSBvUnVsZS5yZWdleHA7XG4gICAgdmFyIG0gPSByZWcuZXhlYyhzMSk7XG4gICAgZGVidWdsb2coXCJhcHBseWluZyByZWdleHA6IFwiICsgczEgKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KG0pKTtcbiAgICBpZiAoIW0pIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCwgb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcbiAgICBpZiAob3B0aW9ucy5tYXRjaG90aGVycyAmJiAoZGVsdGEuZGlmZmVyZW50ID4gMCkpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIG9FeHRyYWN0ZWRDb250ZXh0ID0gZXh0cmFjdEFyZ3NNYXAobSwgb1J1bGUuYXJnc01hcCk7XG4gICAgZGVidWdsb2coXCJleHRyYWN0ZWQgYXJncyBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLmFyZ3NNYXApKTtcbiAgICBkZWJ1Z2xvZyhcIm1hdGNoIFwiICsgSlNPTi5zdHJpbmdpZnkobSkpO1xuICAgIGRlYnVnbG9nKFwiZXh0cmFjdGVkIGFyZ3MgXCIgKyBKU09OLnN0cmluZ2lmeShvRXh0cmFjdGVkQ29udGV4dCkpO1xuICAgIHZhciByZXMgPSBBbnlPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKTtcbiAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpO1xuICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcbiAgICBpZiAob0V4dHJhY3RlZENvbnRleHRbc0tleV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXNbc0tleV0gPSBvRXh0cmFjdGVkQ29udGV4dFtzS2V5XTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMub3ZlcnJpZGUpIHtcbiAgICAgICAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xuICAgICAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpO1xuICAgIH1cbiAgICBPYmplY3QuZnJlZXplKHJlcyk7XG4gICAgZGVidWdsb2coJ0ZvdW5kIG9uZScgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLm1hdGNoUmVnRXhwID0gbWF0Y2hSZWdFeHA7XG5mdW5jdGlvbiBzb3J0QnlXZWlnaHQoc0tleSwgb0NvbnRleHRBLCBvQ29udGV4dEIpIHtcbiAgICBkZWJ1Z2xvZygnc29ydGluZzogJyArIHNLZXkgKyAnaW52b2tlZCB3aXRoXFxuIDE6JyArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QSwgdW5kZWZpbmVkLCAyKSArXG4gICAgICAgIFwiIHZzIFxcbiAyOlwiICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHRCLCB1bmRlZmluZWQsIDIpKTtcbiAgICB2YXIgcmFua2luZ0EgPSBwYXJzZUZsb2F0KG9Db250ZXh0QVtcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcbiAgICB2YXIgcmFua2luZ0IgPSBwYXJzZUZsb2F0KG9Db250ZXh0QltcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcbiAgICBpZiAocmFua2luZ0EgIT09IHJhbmtpbmdCKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiIHJhbmtpbiBkZWx0YVwiICsgMTAwICogKHJhbmtpbmdCIC0gcmFua2luZ0EpKTtcbiAgICAgICAgcmV0dXJuIDEwMCAqIChyYW5raW5nQiAtIHJhbmtpbmdBKTtcbiAgICB9XG4gICAgdmFyIHdlaWdodEEgPSBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QVtcIl93ZWlnaHRcIl1bc0tleV0gfHwgMDtcbiAgICB2YXIgd2VpZ2h0QiA9IG9Db250ZXh0QltcIl93ZWlnaHRcIl0gJiYgb0NvbnRleHRCW1wiX3dlaWdodFwiXVtzS2V5XSB8fCAwO1xuICAgIHJldHVybiArKHdlaWdodEEgLSB3ZWlnaHRCKTtcbn1cbmV4cG9ydHMuc29ydEJ5V2VpZ2h0ID0gc29ydEJ5V2VpZ2h0O1xuLy8gV29yZCwgU3lub255bSwgUmVnZXhwIC8gRXh0cmFjdGlvblJ1bGVcbmZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBvUnVsZXMsIG9wdGlvbnMpIHtcbiAgICB2YXIgc0tleSA9IG9SdWxlc1swXS5rZXk7XG4gICAgLy8gY2hlY2sgdGhhdCBydWxlXG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgLy8gY2hlY2sgY29uc2lzdGVuY3lcbiAgICAgICAgb1J1bGVzLmV2ZXJ5KGZ1bmN0aW9uIChpUnVsZSkge1xuICAgICAgICAgICAgaWYgKGlSdWxlLmtleSAhPT0gc0tleSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkluaG9tb2dlbm91cyBrZXlzIGluIHJ1bGVzLCBleHBlY3RlZCBcIiArIHNLZXkgKyBcIiB3YXMgXCIgKyBKU09OLnN0cmluZ2lmeShpUnVsZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBsb29rIGZvciBydWxlcyB3aGljaCBtYXRjaFxuICAgIHZhciByZXMgPSBvUnVsZXMubWFwKGZ1bmN0aW9uIChvUnVsZSkge1xuICAgICAgICAvLyBpcyB0aGlzIHJ1bGUgYXBwbGljYWJsZVxuICAgICAgICBzd2l0Y2ggKG9SdWxlLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgMCAvKiBXT1JEICovOlxuICAgICAgICAgICAgICAgIHJldHVybiBtYXRjaFdvcmQob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgY2FzZSAxIC8qIFJFR0VYUCAqLzpcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2hSZWdFeHAob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSkuZmlsdGVyKGZ1bmN0aW9uIChvcmVzKSB7XG4gICAgICAgIHJldHVybiAhIW9yZXM7XG4gICAgfSkuc29ydChzb3J0QnlXZWlnaHQuYmluZCh0aGlzLCBzS2V5KSk7XG4gICAgcmV0dXJuIHJlcztcbiAgICAvLyBPYmplY3Qua2V5cygpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAvLyB9KTtcbn1cbmV4cG9ydHMuYXVnbWVudENvbnRleHQxID0gYXVnbWVudENvbnRleHQxO1xuZnVuY3Rpb24gYXVnbWVudENvbnRleHQoY29udGV4dCwgYVJ1bGVzKSB7XG4gICAgdmFyIG9wdGlvbnMxID0ge1xuICAgICAgICBtYXRjaG90aGVyczogdHJ1ZSxcbiAgICAgICAgb3ZlcnJpZGU6IGZhbHNlXG4gICAgfTtcbiAgICB2YXIgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMxKTtcbiAgICBpZiAoYVJlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdmFyIG9wdGlvbnMyID0ge1xuICAgICAgICAgICAgbWF0Y2hvdGhlcnM6IGZhbHNlLFxuICAgICAgICAgICAgb3ZlcnJpZGU6IHRydWVcbiAgICAgICAgfTtcbiAgICAgICAgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMyKTtcbiAgICB9XG4gICAgcmV0dXJuIGFSZXM7XG59XG5leHBvcnRzLmF1Z21lbnRDb250ZXh0ID0gYXVnbWVudENvbnRleHQ7XG5mdW5jdGlvbiBpbnNlcnRPcmRlcmVkKHJlc3VsdCwgaUluc2VydGVkTWVtYmVyLCBsaW1pdCkge1xuICAgIC8vIFRPRE86IHVzZSBzb21lIHdlaWdodFxuICAgIGlmIChyZXN1bHQubGVuZ3RoIDwgbGltaXQpIHtcbiAgICAgICAgcmVzdWx0LnB1c2goaUluc2VydGVkTWVtYmVyKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cbmV4cG9ydHMuaW5zZXJ0T3JkZXJlZCA9IGluc2VydE9yZGVyZWQ7XG5mdW5jdGlvbiB0YWtlVG9wTihhcnIpIHtcbiAgICB2YXIgdSA9IGFyci5maWx0ZXIoZnVuY3Rpb24gKGlubmVyQXJyKSB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwOyB9KTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgLy8gc2hpZnQgb3V0IHRoZSB0b3Agb25lc1xuICAgIHUgPSB1Lm1hcChmdW5jdGlvbiAoaUFycikge1xuICAgICAgICB2YXIgdG9wID0gaUFyci5zaGlmdCgpO1xuICAgICAgICByZXMgPSBpbnNlcnRPcmRlcmVkKHJlcywgdG9wLCA1KTtcbiAgICAgICAgcmV0dXJuIGlBcnI7XG4gICAgfSkuZmlsdGVyKGZ1bmN0aW9uIChpbm5lckFycikgeyByZXR1cm4gaW5uZXJBcnIubGVuZ3RoID4gMDsgfSk7XG4gICAgLy8gYXMgQXJyYXk8QXJyYXk8SUZNYXRjaC5jb250ZXh0Pj5cbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy50YWtlVG9wTiA9IHRha2VUb3BOO1xudmFyIGlucHV0RmlsdGVyUnVsZXMgPSByZXF1aXJlKCcuL2lucHV0RmlsdGVyUnVsZXMnKTtcbnZhciBybTtcbmZ1bmN0aW9uIGdldFJNT25jZSgpIHtcbiAgICBpZiAoIXJtKSB7XG4gICAgICAgIHJtID0gaW5wdXRGaWx0ZXJSdWxlcy5nZXRSdWxlTWFwKCk7XG4gICAgfVxuICAgIHJldHVybiBybTtcbn1cbmZ1bmN0aW9uIGFwcGx5UnVsZXMoY29udGV4dCkge1xuICAgIHZhciBiZXN0TiA9IFtjb250ZXh0XTtcbiAgICBpbnB1dEZpbHRlclJ1bGVzLm9LZXlPcmRlci5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgICAgIHZhciBiZXN0TmV4dCA9IFtdO1xuICAgICAgICBiZXN0Ti5mb3JFYWNoKGZ1bmN0aW9uIChvQ29udGV4dCkge1xuICAgICAgICAgICAgaWYgKG9Db250ZXh0W3NLZXldKSB7XG4gICAgICAgICAgICAgICAgZGVidWdsb2coJyoqIGFwcGx5aW5nIHJ1bGVzIGZvciAnICsgc0tleSk7XG4gICAgICAgICAgICAgICAgdmFyIHJlcyA9IGF1Z21lbnRDb250ZXh0KG9Db250ZXh0LCBnZXRSTU9uY2UoKVtzS2V5XSB8fCBbXSk7XG4gICAgICAgICAgICAgICAgZGVidWdsb2coJyoqIHJlc3VsdCBmb3IgJyArIHNLZXkgKyAnID0gJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgICAgICAgICAgYmVzdE5leHQucHVzaChyZXMgfHwgW10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gcnVsZSBub3QgcmVsZXZhbnRcbiAgICAgICAgICAgICAgICBiZXN0TmV4dC5wdXNoKFtvQ29udGV4dF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgYmVzdE4gPSB0YWtlVG9wTihiZXN0TmV4dCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGJlc3ROO1xufVxuZXhwb3J0cy5hcHBseVJ1bGVzID0gYXBwbHlSdWxlcztcbmZ1bmN0aW9uIGFwcGx5UnVsZXNQaWNrRmlyc3QoY29udGV4dCkge1xuICAgIHZhciByID0gYXBwbHlSdWxlcyhjb250ZXh0KTtcbiAgICByZXR1cm4gciAmJiByWzBdO1xufVxuZXhwb3J0cy5hcHBseVJ1bGVzUGlja0ZpcnN0ID0gYXBwbHlSdWxlc1BpY2tGaXJzdDtcbi8qKlxuICogRGVjaWRlIHdoZXRoZXIgdG8gcmVxdWVyeSBmb3IgYSBjb250ZXRcbiAqL1xuZnVuY3Rpb24gZGVjaWRlT25SZVF1ZXJ5KGNvbnRleHQpIHtcbiAgICByZXR1cm4gW107XG59XG5leHBvcnRzLmRlY2lkZU9uUmVRdWVyeSA9IGRlY2lkZU9uUmVRdWVyeTtcbiIsIi8qKlxyXG4gKiB0aGUgaW5wdXQgZmlsdGVyIHN0YWdlIHByZXByb2Nlc3NlcyBhIGN1cnJlbnQgY29udGV4dFxyXG4gKlxyXG4gKiBJdCBhKSBjb21iaW5lcyBtdWx0aS1zZWdtZW50IGFyZ3VtZW50cyBpbnRvIG9uZSBjb250ZXh0IG1lbWJlcnNcclxuICogSXQgYikgYXR0ZW1wdHMgdG8gYXVnbWVudCB0aGUgY29udGV4dCBieSBhZGRpdGlvbmFsIHF1YWxpZmljYXRpb25zXHJcbiAqICAgICAgICAgICAoTWlkIHRlcm0gZ2VuZXJhdGluZyBBbHRlcm5hdGl2ZXMsIGUuZy5cclxuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHVuaXQgdGVzdD9cclxuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHNvdXJjZSA/XHJcbiAqICAgICAgICAgICApXHJcbiAqICBTaW1wbGUgcnVsZXMgbGlrZSAgSW50ZW50XHJcbiAqXHJcbiAqXHJcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmlucHV0RmlsdGVyXHJcbiAqIEBmaWxlIGlucHV0RmlsdGVyLnRzXHJcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cclxuICovXHJcbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9saWIvbm9kZS00LmQudHNcIiAvPlxyXG5pbXBvcnQgKiBhcyBkaXN0YW5jZSBmcm9tICcuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4nO1xyXG5cclxuXHJcbmltcG9ydCAqIGFzIExvZ2dlciBmcm9tICcuLi91dGlscy9sb2dnZXInXHJcblxyXG5jb25zdCBsb2dnZXIgPSBMb2dnZXIubG9nZ2VyKCdpbnB1dEZpbHRlcicpO1xyXG5cclxuaW1wb3J0ICogYXMgZGVidWcgZnJvbSAnZGVidWcnO1xyXG5cclxuaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAnLi4vdXRpbHMvdXRpbHMnO1xyXG5cclxuXHJcbmltcG9ydCAqIGFzIEFsZ29sIGZyb20gJy4vYWxnb2wnO1xyXG5cclxuaW1wb3J0ICogYXMgSU1hdGNoIGZyb20gJy4vaWZtYXRjaCc7XHJcblxyXG5pbXBvcnQgKiBhcyBicmVha2Rvd24gZnJvbSAnLi9icmVha2Rvd24nO1xyXG5cclxuY29uc3QgQW55T2JqZWN0ID0gPGFueT5PYmplY3Q7XHJcblxyXG5jb25zdCBkZWJ1Z2xvZyA9IGRlYnVnKCdpbnB1dEZpbHRlcicpXHJcblxyXG5pbXBvcnQgKiBhcyBtYXRjaGRhdGEgZnJvbSAnLi9tYXRjaGRhdGEnO1xyXG52YXIgb1VuaXRUZXN0cyA9IG1hdGNoZGF0YS5vVW5pdFRlc3RzXHJcblxyXG4vKipcclxuICogQHBhcmFtIHNUZXh0IHtzdHJpbmd9IHRoZSB0ZXh0IHRvIG1hdGNoIHRvIE5hdlRhcmdldFJlc29sdXRpb25cclxuICogQHBhcmFtIHNUZXh0MiB7c3RyaW5nfSB0aGUgcXVlcnkgdGV4dCwgZS5nLiBOYXZUYXJnZXRcclxuICpcclxuICogQHJldHVybiB0aGUgZGlzdGFuY2UsIG5vdGUgdGhhdCBpcyBpcyAqbm90KiBzeW1tZXRyaWMhXHJcbiAqL1xyXG5mdW5jdGlvbiBjYWxjRGlzdGFuY2Uoc1RleHQxOiBzdHJpbmcsIHNUZXh0Mjogc3RyaW5nKTogbnVtYmVyIHtcclxuICAvLyBjb25zb2xlLmxvZyhcImxlbmd0aDJcIiArIHNUZXh0MSArIFwiIC0gXCIgKyBzVGV4dDIpXHJcbiAgdmFyIGEwID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnN1YnN0cmluZygwLCBzVGV4dDIubGVuZ3RoKSwgc1RleHQyKVxyXG4gIHZhciBhID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnRvTG93ZXJDYXNlKCksIHNUZXh0MilcclxuICByZXR1cm4gYTAgKiA1MDAgLyBzVGV4dDIubGVuZ3RoICsgYVxyXG59XHJcblxyXG5pbXBvcnQgKiBhcyBJRk1hdGNoIGZyb20gJy4uL21hdGNoL2lmbWF0Y2gnO1xyXG5cclxudHlwZSBJUnVsZSA9IElGTWF0Y2guSVJ1bGVcclxuXHJcblxyXG5pbnRlcmZhY2UgSU1hdGNoT3B0aW9ucyB7XHJcbiAgbWF0Y2hvdGhlcnM/OiBib29sZWFuLFxyXG4gIGF1Z21lbnQ/OiBib29sZWFuLFxyXG4gIG92ZXJyaWRlPzogYm9vbGVhblxyXG59XHJcblxyXG5pbnRlcmZhY2UgSU1hdGNoQ291bnQge1xyXG4gIGVxdWFsOiBudW1iZXJcclxuICBkaWZmZXJlbnQ6IG51bWJlclxyXG4gIHNwdXJpb3VzUjogbnVtYmVyXHJcbiAgc3B1cmlvdXNMOiBudW1iZXJcclxufVxyXG5cclxudHlwZSBFbnVtUnVsZVR5cGUgPSBJRk1hdGNoLkVudW1SdWxlVHlwZVxyXG5cclxuY29uc3QgbGV2ZW5DdXRvZmYgPSBBbGdvbC5DdXRvZmZfTGV2ZW5TaHRlaW47XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbGV2ZW5QZW5hbHR5KGk6IG51bWJlcik6IG51bWJlciB7XHJcbiAgLy8gMC0+IDFcclxuICAvLyAxIC0+IDAuMVxyXG4gIC8vIDE1MCAtPiAgMC44XHJcbiAgaWYgKGkgPT09IDApIHtcclxuICAgIHJldHVybiAxO1xyXG4gIH1cclxuICAvLyByZXZlcnNlIG1heSBiZSBiZXR0ZXIgdGhhbiBsaW5lYXJcclxuICByZXR1cm4gMSArIGkgKiAoMC44IC0gMSkgLyAxNTBcclxufVxyXG5cclxuZnVuY3Rpb24gbm9uUHJpdmF0ZUtleXMob0EpIHtcclxuICByZXR1cm4gT2JqZWN0LmtleXMob0EpLmZpbHRlcihrZXkgPT4ge1xyXG4gICAgcmV0dXJuIGtleVswXSAhPT0gJ18nO1xyXG4gIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY291bnRBaW5CKG9BLCBvQiwgZm5Db21wYXJlLCBhS2V5SWdub3JlPyk6IG51bWJlciB7XHJcbiAgYUtleUlnbm9yZSA9IEFycmF5LmlzQXJyYXkoYUtleUlnbm9yZSkgPyBhS2V5SWdub3JlIDpcclxuICAgIHR5cGVvZiBhS2V5SWdub3JlID09PSBcInN0cmluZ1wiID8gW2FLZXlJZ25vcmVdIDogW107XHJcbiAgZm5Db21wYXJlID0gZm5Db21wYXJlIHx8IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH1cclxuICByZXR1cm4gbm9uUHJpdmF0ZUtleXMob0EpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xyXG4gIH0pLlxyXG4gICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xyXG4gICAgICAgIHByZXYgPSBwcmV2ICsgKGZuQ29tcGFyZShvQVtrZXldLCBvQltrZXldLCBrZXkpID8gMSA6IDApXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHByZXZcclxuICAgIH0sIDApXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzcHVyaW91c0Fub3RJbkIob0EsIG9CLCBhS2V5SWdub3JlPykge1xyXG4gIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gYUtleUlnbm9yZSA6XHJcbiAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xyXG4gIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcclxuICAgIHJldHVybiBhS2V5SWdub3JlLmluZGV4T2Yoa2V5KSA8IDA7XHJcbiAgfSkuXHJcbiAgICByZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xyXG4gICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xyXG4gICAgICAgIHByZXYgPSBwcmV2ICsgMVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBwcmV2XHJcbiAgICB9LCAwKVxyXG59XHJcblxyXG5mdW5jdGlvbiBsb3dlckNhc2Uobykge1xyXG4gIGlmICh0eXBlb2YgbyA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgcmV0dXJuIG8udG9Mb3dlckNhc2UoKVxyXG4gIH1cclxuICByZXR1cm4gb1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY29tcGFyZUNvbnRleHQob0EsIG9CLCBhS2V5SWdub3JlPykge1xyXG4gIHZhciBlcXVhbCA9IGNvdW50QWluQihvQSwgb0IsIGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBsb3dlckNhc2UoYSkgPT09IGxvd2VyQ2FzZShiKTsgfSwgYUtleUlnbm9yZSk7XHJcbiAgdmFyIGRpZmZlcmVudCA9IGNvdW50QWluQihvQSwgb0IsIGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBsb3dlckNhc2UoYSkgIT09IGxvd2VyQ2FzZShiKTsgfSwgYUtleUlnbm9yZSk7XHJcbiAgdmFyIHNwdXJpb3VzTCA9IHNwdXJpb3VzQW5vdEluQihvQSwgb0IsIGFLZXlJZ25vcmUpXHJcbiAgdmFyIHNwdXJpb3VzUiA9IHNwdXJpb3VzQW5vdEluQihvQiwgb0EsIGFLZXlJZ25vcmUpXHJcbiAgcmV0dXJuIHtcclxuICAgIGVxdWFsOiBlcXVhbCxcclxuICAgIGRpZmZlcmVudDogZGlmZmVyZW50LFxyXG4gICAgc3B1cmlvdXNMOiBzcHVyaW91c0wsXHJcbiAgICBzcHVyaW91c1I6IHNwdXJpb3VzUlxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gc29ydEJ5UmFuayhhOiBJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZywgYjogSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmcpOiBudW1iZXIge1xyXG4gIHZhciByID0tKChhLl9yYW5raW5nIHx8IDEuMCkgLSAoYi5fcmFua2luZyB8fCAxLjApKTtcclxuICBpZihyKSB7XHJcbiAgICByZXR1cm4gcjtcclxuICB9XHJcbiAgaWYoYS5jYXRlZ29yeSAmJiBiLmNhdGVnb3J5KSB7XHJcbiAgICByID0gYS5jYXRlZ29yeS5sb2NhbGVDb21wYXJlKGIuY2F0ZWdvcnkpO1xyXG4gICAgaWYgKHIpIHtcclxuICAgICAgcmV0dXJuIHI7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGlmKGEubWF0Y2hlZFN0cmluZyAmJiBiLm1hdGNoZWRTdHJpbmcpIHtcclxuICAgIHIgPSBhLm1hdGNoZWRTdHJpbmcubG9jYWxlQ29tcGFyZShiLm1hdGNoZWRTdHJpbmcpO1xyXG4gICAgaWYgKHIpIHtcclxuICAgICAgcmV0dXJuIHI7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiAwO1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNhdGVnb3JpemVTdHJpbmcoc3RyaW5nOiBzdHJpbmcsIGV4YWN0OiBib29sZWFuLCBvUnVsZXM6IEFycmF5PElNYXRjaC5tUnVsZT4pOiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4ge1xyXG4gIC8vIHNpbXBseSBhcHBseSBhbGwgcnVsZXNcclxuICBkZWJ1ZyhcInJ1bGVzIDogXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZXMpKTtcclxuICB2YXIgcmVzOiBBcnJheTxJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiA9IFtdXHJcbiAgb1J1bGVzLmZvckVhY2goZnVuY3Rpb24gKG9SdWxlKSB7XHJcbiAgICBkZWJ1Z2xvZygnYXR0ZW1wdGluZyB0byBtYXRjaCBydWxlICcgKyBKU09OLnN0cmluZ2lmeShvUnVsZSkgKyBcIiB0byBzdHJpbmcgXFxcIlwiICsgc3RyaW5nICsgXCJcXFwiXCIpO1xyXG4gICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuV09SRDpcclxuICAgICAgICBpZiAoZXhhY3QgJiYgb1J1bGUud29yZCA9PT0gc3RyaW5nKSB7XHJcbiAgICAgICAgICByZXMucHVzaCh7XHJcbiAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxyXG4gICAgICAgICAgICBtYXRjaGVkU3RyaW5nOiBvUnVsZS5tYXRjaGVkU3RyaW5nLFxyXG4gICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXHJcbiAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghZXhhY3QpIHtcclxuICAgICAgICAgIHZhciBsZXZlbm1hdGNoID0gY2FsY0Rpc3RhbmNlKG9SdWxlLndvcmQsIHN0cmluZylcclxuICAgICAgICAgIGlmIChsZXZlbm1hdGNoIDwgbGV2ZW5DdXRvZmYpIHtcclxuICAgICAgICAgICAgcmVzLnB1c2goe1xyXG4gICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxyXG4gICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLndvcmQsXHJcbiAgICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxyXG4gICAgICAgICAgICAgIF9yYW5raW5nOiAob1J1bGUuX3JhbmtpbmcgfHwgMS4wKSAqIGxldmVuUGVuYWx0eShsZXZlbm1hdGNoKSxcclxuICAgICAgICAgICAgICBsZXZlbm1hdGNoOiBsZXZlbm1hdGNoXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIElGTWF0Y2guRW51bVJ1bGVUeXBlLlJFR0VYUDoge1xyXG4gICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KFwiIGhlcmUgcmVnZXhwXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSkpXHJcbiAgICAgICAgdmFyIG0gPSBvUnVsZS5yZWdleHAuZXhlYyhzdHJpbmcpXHJcbiAgICAgICAgaWYgKG0pIHtcclxuICAgICAgICAgIHJlcy5wdXNoKHtcclxuICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IChvUnVsZS5tYXRjaEluZGV4ICE9PSB1bmRlZmluZWQgJiYgbVtvUnVsZS5tYXRjaEluZGV4XSkgfHwgc3RyaW5nLFxyXG4gICAgICAgICAgICBjYXRlZ29yeTogb1J1bGUuY2F0ZWdvcnksXHJcbiAgICAgICAgICAgIF9yYW5raW5nOiBvUnVsZS5fcmFua2luZyB8fCAxLjBcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidW5rbm93biB0eXBlXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSlcclxuICAgIH1cclxuICB9KTtcclxuICByZXMuc29ydChzb3J0QnlSYW5rKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcbi8qKlxyXG4gKlxyXG4gKiBPcHRpb25zIG1heSBiZSB7XHJcbiAqIG1hdGNob3RoZXJzIDogdHJ1ZSwgID0+IG9ubHkgcnVsZXMgd2hlcmUgYWxsIG90aGVycyBtYXRjaCBhcmUgY29uc2lkZXJlZFxyXG4gKiBhdWdtZW50IDogdHJ1ZSxcclxuICogb3ZlcnJpZGUgOiB0cnVlIH0gID0+XHJcbiAqXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hXb3JkKG9SdWxlOiBJUnVsZSwgY29udGV4dDogSUZNYXRjaC5jb250ZXh0LCBvcHRpb25zPzogSU1hdGNoT3B0aW9ucykge1xyXG4gIGlmIChjb250ZXh0W29SdWxlLmtleV0gPT09IHVuZGVmaW5lZCkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICB9XHJcbiAgdmFyIHMxID0gY29udGV4dFtvUnVsZS5rZXldLnRvTG93ZXJDYXNlKClcclxuICB2YXIgczIgPSBvUnVsZS53b3JkLnRvTG93ZXJDYXNlKCk7XHJcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cclxuICB2YXIgZGVsdGEgPSBjb21wYXJlQ29udGV4dChjb250ZXh0LCBvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpXHJcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XHJcbiAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkXHJcbiAgfVxyXG4gIHZhciBjOiBudW1iZXIgPSBjYWxjRGlzdGFuY2UoczIsIHMxKTtcclxuICBkZWJ1Z2xvZyhcIiBzMSA8PiBzMiBcIiArIHMxICsgXCI8PlwiICsgczIgKyBcIiAgPT46IFwiICsgYyk7XHJcbiAgaWYgKGMgPCAxNTApIHtcclxuICAgIHZhciByZXMgPSBBbnlPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKSBhcyBhbnk7XHJcbiAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgY29udGV4dCk7XHJcbiAgICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xyXG4gICAgICByZXMgPSBBbnlPYmplY3QuYXNzaWduKHJlcywgb1J1bGUuZm9sbG93cyk7XHJcbiAgICB9XHJcbiAgICAvLyBmb3JjZSBrZXkgcHJvcGVydHlcclxuICAgIC8vIGNvbnNvbGUubG9nKCcgb2JqZWN0Y2F0ZWdvcnknLCByZXNbJ3N5c3RlbU9iamVjdENhdGVnb3J5J10pO1xyXG4gICAgcmVzW29SdWxlLmtleV0gPSBvUnVsZS5mb2xsb3dzW29SdWxlLmtleV0gfHwgcmVzW29SdWxlLmtleV07XHJcbiAgICByZXMuX3dlaWdodCA9IEFueU9iamVjdC5hc3NpZ24oe30sIHJlcy5fd2VpZ2h0KTtcclxuICAgIHJlcy5fd2VpZ2h0W29SdWxlLmtleV0gPSBjO1xyXG4gICAgT2JqZWN0LmZyZWV6ZShyZXMpO1xyXG4gICAgZGVidWdsb2coJ0ZvdW5kIG9uZScgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xyXG4gICAgcmV0dXJuIHJlcztcclxuICB9XHJcbiAgcmV0dXJuIHVuZGVmaW5lZDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RBcmdzTWFwKG1hdGNoOiBBcnJheTxzdHJpbmc+LCBhcmdzTWFwOiB7IFtrZXk6IG51bWJlcl06IHN0cmluZyB9KTogSUZNYXRjaC5jb250ZXh0IHtcclxuICB2YXIgcmVzID0ge30gYXMgSUZNYXRjaC5jb250ZXh0O1xyXG4gIGlmICghYXJnc01hcCkge1xyXG4gICAgcmV0dXJuIHJlcztcclxuICB9XHJcbiAgT2JqZWN0LmtleXMoYXJnc01hcCkuZm9yRWFjaChmdW5jdGlvbiAoaUtleSkge1xyXG4gICAgdmFyIHZhbHVlID0gbWF0Y2hbaUtleV1cclxuICAgIHZhciBrZXkgPSBhcmdzTWFwW2lLZXldO1xyXG4gICAgaWYgKCh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpICYmIHZhbHVlLmxlbmd0aCA+IDApIHtcclxuICAgICAgcmVzW2tleV0gPSB2YWx1ZVxyXG4gICAgfVxyXG4gIH1cclxuICApO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBSYW5rV29yZCA9IHtcclxuICBoYXNBYm92ZTogZnVuY3Rpb24gKGxzdDogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+LCBib3JkZXI6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuICFsc3QuZXZlcnkoZnVuY3Rpb24gKG9NZW1iZXIpIHtcclxuICAgICAgcmV0dXJuIChvTWVtYmVyLl9yYW5raW5nIDwgYm9yZGVyKTtcclxuICAgIH0pO1xyXG4gIH0sXHJcblxyXG4gIHRha2VGaXJzdE46IGZ1bmN0aW9uIChsc3Q6IEFycmF5PElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nPiwgbjogbnVtYmVyKTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IHtcclxuICAgIHJldHVybiBsc3QuZmlsdGVyKGZ1bmN0aW9uIChvTWVtYmVyLCBpSW5kZXgpIHtcclxuICAgICAgdmFyIGxhc3RSYW5raW5nID0gMS4wO1xyXG4gICAgICBpZiAoKGlJbmRleCA8IG4pIHx8IG9NZW1iZXIuX3JhbmtpbmcgPT09IGxhc3RSYW5raW5nKSB7XHJcbiAgICAgICAgbGFzdFJhbmtpbmcgPSBvTWVtYmVyLl9yYW5raW5nO1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH0pO1xyXG4gIH0sXHJcbiAgdGFrZUFib3ZlOiBmdW5jdGlvbiAobHN0OiBBcnJheTxJRk1hdGNoLklDYXRlZ29yaXplZFN0cmluZz4sIGJvcmRlcjogbnVtYmVyKTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IHtcclxuICAgIHJldHVybiBsc3QuZmlsdGVyKGZ1bmN0aW9uIChvTWVtYmVyKSB7XHJcbiAgICAgIHJldHVybiAob01lbWJlci5fcmFua2luZyA+PSBib3JkZXIpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG59O1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNhdGVnb3JpemVXb3JkV2l0aFJhbmtDdXRvZmYoc1dvcmRHcm91cDogc3RyaW5nLCBhUnVsZXM6IEFycmF5PElGTWF0Y2gubVJ1bGU+KTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IHtcclxuICB2YXIgc2Vlbkl0ID0gY2F0ZWdvcml6ZVN0cmluZyhzV29yZEdyb3VwLCB0cnVlLCBhUnVsZXMpO1xyXG4gIGlmIChSYW5rV29yZC5oYXNBYm92ZShzZWVuSXQsIDAuOCkpIHtcclxuICAgIHNlZW5JdCA9IFJhbmtXb3JkLnRha2VBYm92ZShzZWVuSXQsIDAuOCk7XHJcbiAgfSBlbHNlIHtcclxuICAgIHNlZW5JdCA9IGNhdGVnb3JpemVTdHJpbmcoc1dvcmRHcm91cCwgZmFsc2UsIGFSdWxlcyk7XHJcbiAgfVxyXG4gIHNlZW5JdCA9IFJhbmtXb3JkLnRha2VGaXJzdE4oc2Vlbkl0LCBBbGdvbC5Ub3BfTl9Xb3JkQ2F0ZWdvcml6YXRpb25zKTtcclxuICByZXR1cm4gc2Vlbkl0O1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZFNlbnRlbmNlKG9TZW50ZW5jZSA6IElGTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11bXSkgOiBib29sZWFuIHtcclxuICByZXR1cm4gb1NlbnRlbmNlLmV2ZXJ5KGZ1bmN0aW9uKG9Xb3JkR3JvdXApIHtcclxuICAgICAgcmV0dXJuIChvV29yZEdyb3VwLmxlbmd0aCA+IDApO1xyXG4gIH0pO1xyXG59XHJcblxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWQoYXJyIDogSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXVtdW10pIDogSUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXVtdW10ge1xyXG4gIHJldHVybiBhcnIuZmlsdGVyKGZ1bmN0aW9uKG9TZW50ZW5jZSkge1xyXG4gICAgcmV0dXJuIGZpbHRlclJlbW92aW5nVW5jYXRlZ29yaXplZFNlbnRlbmNlKG9TZW50ZW5jZSk7XHJcbiAgIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogR2l2ZW4gYSAgc3RyaW5nLCBicmVhayBpdCBkb3duIGludG8gY29tcG9uZW50cyxcclxuICogW1snQScsICdCJ10sIFsnQSBCJ11dXHJcbiAqXHJcbiAqIHRoZW4gY2F0ZWdvcml6ZVdvcmRzXHJcbiAqIHJldHVybmluZ1xyXG4gKlxyXG4gKiBbIFtbIHsgY2F0ZWdvcnk6ICdzeXN0ZW1JZCcsIHdvcmQgOiAnQSd9LFxyXG4gKiAgICAgIHsgY2F0ZWdvcnk6ICdvdGhlcnRoaW5nJywgd29yZCA6ICdBJ31cclxuICogICAgXSxcclxuICogICAgLy8gcmVzdWx0IG9mIEJcclxuICogICAgWyB7IGNhdGVnb3J5OiAnc3lzdGVtSWQnLCB3b3JkIDogJ0InfSxcclxuICogICAgICB7IGNhdGVnb3J5OiAnb3RoZXJ0aGluZycsIHdvcmQgOiAnQSd9XHJcbiAqICAgICAgeyBjYXRlZ29yeTogJ2Fub3RoZXJ0cnlwJywgd29yZCA6ICdCJ31cclxuICogICAgXVxyXG4gKiAgIF0sXHJcbiAqIF1dXVxyXG4gKlxyXG4gKlxyXG4gKlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVTdHJpbmcoc1N0cmluZzogc3RyaW5nLCBhUnVsZXM6IEFycmF5PElNYXRjaC5tUnVsZT4pIHtcclxuICB2YXIgY250ID0gMDtcclxuICB2YXIgZmFjID0gMTtcclxuICB2YXIgdSA9IGJyZWFrZG93bi5icmVha2Rvd25TdHJpbmcoc1N0cmluZyk7XHJcbiAgZGVidWdsb2coXCJoZXJlIGJyZWFrZG93blwiICsgSlNPTi5zdHJpbmdpZnkodSkpO1xyXG4gIHZhciB3b3JkcyA9IHt9IGFzIHsgW2tleTogc3RyaW5nXTogQXJyYXk8SUZNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+IH07XHJcbiAgdmFyIHJlcyA9IHUubWFwKGZ1bmN0aW9uIChhQXJyKSB7XHJcbiAgICByZXR1cm4gYUFyci5tYXAoZnVuY3Rpb24gKHNXb3JkR3JvdXA6IHN0cmluZykge1xyXG4gICAgICB2YXIgc2Vlbkl0ID0gd29yZHNbc1dvcmRHcm91cF07XHJcbiAgICAgIGlmIChzZWVuSXQgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHNlZW5JdCA9IGNhdGVnb3JpemVXb3JkV2l0aFJhbmtDdXRvZmYoc1dvcmRHcm91cCwgYVJ1bGVzKTtcclxuICAgICAgICBpZihzZWVuSXQgPT09IHVuZGVmaW5lZClcclxuICAgICAgICB3b3Jkc1tzV29yZEdyb3VwXSA9IHNlZW5JdDtcclxuICAgICAgfVxyXG4gICAgICBjbnQgPSBjbnQgKyBzZWVuSXQubGVuZ3RoO1xyXG4gICAgICBmYWMgPSBmYWMgKiBzZWVuSXQubGVuZ3RoO1xyXG4gICAgICBpZiAoIXNlZW5JdCB8fCBzZWVuSXQubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgbG9nZ2VyKFwiKioqV0FSTklORzogRGlkIG5vdCBmaW5kIGFueSBjYXRlZ29yaXphdGlvbiBmb3IgXFxcIlwiICsgc1dvcmRHcm91cCArIFwiXFxcIiBpbiBzZW50ZW5jZSBcXFwiXCJcclxuICAgICAgICArIHNTdHJpbmcgKyBcIlxcXCJcIik7XHJcbiAgICAgICAgaWYoc1dvcmRHcm91cC5pbmRleE9mKFwiIFwiKSA8PSAwKSB7XHJcbiAgICAgICAgICBkZWJ1Z2xvZyhcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIHByaW1pdGl2ZSAoISlcIiArIHNXb3JkR3JvdXApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBkZWJ1Z2xvZyhcIioqKldBUk5JTkc6IERpZCBub3QgZmluZCBhbnkgY2F0ZWdvcml6YXRpb24gZm9yIFwiICsgc1dvcmRHcm91cCk7XHJcbiAgICAgICAgaWYoIXNlZW5JdCkge1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0aW5nIGVtdHB5IGxpc3QsIG5vdCB1bmRlZmluZWQgZm9yIFxcXCJcIiArIHNXb3JkR3JvdXAgKyBcIlxcXCJcIilcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFtdO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBzZWVuSXQ7XHJcbiAgICB9KTtcclxuICB9KTtcclxuICByZXMgPSBmaWx0ZXJSZW1vdmluZ1VuY2F0ZWdvcml6ZWQocmVzKTtcclxuICBkZWJ1Z2xvZyhcIiBzZW50ZW5jZXMgXCIgKyB1Lmxlbmd0aCArIFwiIG1hdGNoZXMgXCIgKyBjbnQgKyBcIiBmYWM6IFwiICsgZmFjKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG4vKlxyXG5bIFthLGJdLCBbYyxkXV1cclxuXHJcbjAwIGFcclxuMDEgYlxyXG4xMCBjXHJcbjExIGRcclxuMTIgY1xyXG4qL1xyXG5cclxuXHJcbmNvbnN0IGNsb25lID0gdXRpbHMuY2xvbmVEZWVwO1xyXG5cclxuLy8gd2UgY2FuIHJlcGxpY2F0ZSB0aGUgdGFpbCBvciB0aGUgaGVhZCxcclxuLy8gd2UgcmVwbGljYXRlIHRoZSB0YWlsIGFzIGl0IGlzIHNtYWxsZXIuXHJcblxyXG4vLyBbYSxiLGMgXVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGV4cGFuZE1hdGNoQXJyKGRlZXA6IEFycmF5PEFycmF5PGFueT4+KTogQXJyYXk8QXJyYXk8YW55Pj4ge1xyXG4gIHZhciBhID0gW107XHJcbiAgdmFyIGxpbmUgPSBbXTtcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWVwKSk7XHJcbiAgZGVlcC5mb3JFYWNoKGZ1bmN0aW9uICh1QnJlYWtEb3duTGluZSwgaUluZGV4OiBudW1iZXIpIHtcclxuICAgIGxpbmVbaUluZGV4XSA9IFtdO1xyXG4gICAgdUJyZWFrRG93bkxpbmUuZm9yRWFjaChmdW5jdGlvbiAoYVdvcmRHcm91cCwgd2dJbmRleDogbnVtYmVyKSB7XHJcbiAgICAgIGxpbmVbaUluZGV4XVt3Z0luZGV4XSA9IFtdO1xyXG4gICAgICBhV29yZEdyb3VwLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkVmFyaWFudCwgaVdWSW5kZXg6IG51bWJlcikge1xyXG4gICAgICAgIGxpbmVbaUluZGV4XVt3Z0luZGV4XVtpV1ZJbmRleF0gPSBvV29yZFZhcmlhbnQ7XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfSlcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShsaW5lKSk7XHJcbiAgdmFyIHJlcyA9IFtdO1xyXG4gIHZhciBudmVjcyA9IFtdO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZS5sZW5ndGg7ICsraSkge1xyXG4gICAgdmFyIHZlY3MgPSBbW11dO1xyXG4gICAgdmFyIG52ZWNzID0gW107XHJcbiAgICB2YXIgcnZlYyA9IFtdO1xyXG4gICAgZm9yICh2YXIgayA9IDA7IGsgPCBsaW5lW2ldLmxlbmd0aDsgKytrKSB7IC8vIHdvcmRncm91cCBrXHJcbiAgICAgIC8vdmVjcyBpcyB0aGUgdmVjdG9yIG9mIGFsbCBzbyBmYXIgc2VlbiB2YXJpYW50cyB1cCB0byBrIHdncy5cclxuICAgICAgdmFyIG5leHRCYXNlID0gW107XHJcbiAgICAgIGZvciAodmFyIGwgPSAwOyBsIDwgbGluZVtpXVtrXS5sZW5ndGg7ICsrbCkgeyAvLyBmb3IgZWFjaCB2YXJpYW50XHJcbiAgICAgICAgLy9kZWJ1Z2xvZyhcInZlY3Mgbm93XCIgKyBKU09OLnN0cmluZ2lmeSh2ZWNzKSk7XHJcbiAgICAgICAgbnZlY3MgPSBbXTsgLy92ZWNzLnNsaWNlKCk7IC8vIGNvcHkgdGhlIHZlY1tpXSBiYXNlIHZlY3RvcjtcclxuICAgICAgICAvL2RlYnVnbG9nKFwidmVjcyBjb3BpZWQgbm93XCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpO1xyXG4gICAgICAgIGZvciAodmFyIHUgPSAwOyB1IDwgdmVjcy5sZW5ndGg7ICsrdSkge1xyXG4gICAgICAgICAgbnZlY3NbdV0gPSB2ZWNzW3VdLnNsaWNlKCk7IC8vXHJcbiAgICAgICAgICAvLyBkZWJ1Z2xvZyhcImNvcGllZCB2ZWNzW1wiKyB1K1wiXVwiICsgSlNPTi5zdHJpbmdpZnkodmVjc1t1XSkpO1xyXG4gICAgICAgICAgbnZlY3NbdV0ucHVzaChcclxuICAgICAgICAgICAgY2xvbmUobGluZVtpXVtrXVtsXSkpOyAvLyBwdXNoIHRoZSBsdGggdmFyaWFudFxyXG4gICAgICAgICAgLy8gZGVidWdsb2coXCJub3cgbnZlY3MgXCIgKyBudmVjcy5sZW5ndGggKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KG52ZWNzKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vICAgZGVidWdsb2coXCIgYXQgICAgIFwiICsgayArIFwiOlwiICsgbCArIFwiIG5leHRiYXNlID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcclxuICAgICAgICAvLyAgIGRlYnVnbG9nKFwiIGFwcGVuZCBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiBudmVjcyAgICA+XCIgKyBKU09OLnN0cmluZ2lmeShudmVjcykpXHJcbiAgICAgICAgbmV4dEJhc2UgPSBuZXh0QmFzZS5jb25jYXQobnZlY3MpO1xyXG4gICAgICAgIC8vICAgZGVidWdsb2coXCIgIHJlc3VsdCBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiBudmVjcyAgICA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpXHJcbiAgICAgIH0gLy9jb25zdHJ1XHJcbiAgICAgIC8vICBkZWJ1Z2xvZyhcIm5vdyBhdCBcIiArIGsgKyBcIjpcIiArIGwgKyBcIiA+XCIgKyBKU09OLnN0cmluZ2lmeShuZXh0QmFzZSkpXHJcbiAgICAgIHZlY3MgPSBuZXh0QmFzZTtcclxuICAgIH1cclxuICAgIGRlYnVnbG9nKFwiQVBQRU5ESU5HIFRPIFJFU1wiICsgaSArIFwiOlwiICsgbCArIFwiID5cIiArIEpTT04uc3RyaW5naWZ5KG5leHRCYXNlKSlcclxuICAgIHJlcyA9IHJlcy5jb25jYXQodmVjcyk7XHJcbiAgfVxyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcblxyXG4vKipcclxuICogQ2FsY3VsYXRlIGEgd2VpZ2h0IGZhY3RvciBmb3IgYSBnaXZlbiBkaXN0YW5jZSBhbmRcclxuICogY2F0ZWdvcnlcclxuICogQHBhcmFtIHtpbnRlZ2VyfSBkaXN0IGRpc3RhbmNlIGluIHdvcmRzXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBjYXRlZ29yeSBjYXRlZ29yeSB0byB1c2VcclxuICogQHJldHVybnMge251bWJlcn0gYSBkaXN0YW5jZSBmYWN0b3IgPj0gMVxyXG4gKiAgMS4wIGZvciBubyBlZmZlY3RcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiByZWluZm9yY2VEaXN0V2VpZ2h0KGRpc3Q6IG51bWJlciwgY2F0ZWdvcnk6IHN0cmluZyk6IG51bWJlciB7XHJcbiAgdmFyIGFicyA9IE1hdGguYWJzKGRpc3QpO1xyXG4gIHJldHVybiAxLjAgKyAoQWxnb2wuYVJlaW5mb3JjZURpc3RXZWlnaHRbYWJzXSB8fCAwKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdpdmVuIGEgc2VudGVuY2UsIGV4dGFjdCBjYXRlZ29yaWVzXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdENhdGVnb3J5TWFwKG9TZW50ZW5jZTogQXJyYXk8SUZNYXRjaC5JV29yZD4pOiB7IFtrZXk6IHN0cmluZ106IEFycmF5PHsgcG9zOiBudW1iZXIgfT4gfSB7XHJcbiAgdmFyIHJlcyA9IHt9O1xyXG4gIGRlYnVnbG9nKCdleHRyYWN0Q2F0ZWdvcnlNYXAgJyArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSkpO1xyXG4gIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaUluZGV4KSB7XHJcbiAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IElGTWF0Y2guQ0FUX0NBVEVHT1JZKSB7XHJcbiAgICAgIHJlc1tvV29yZC5tYXRjaGVkU3RyaW5nXSA9IHJlc1tvV29yZC5tYXRjaGVkU3RyaW5nXSB8fCBbXTtcclxuICAgICAgcmVzW29Xb3JkLm1hdGNoZWRTdHJpbmddLnB1c2goeyBwb3M6IGlJbmRleCB9KTtcclxuICAgIH1cclxuICB9KTtcclxuICB1dGlscy5kZWVwRnJlZXplKHJlcyk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlaW5Gb3JjZVNlbnRlbmNlKG9TZW50ZW5jZSkge1xyXG4gIHZhciBvQ2F0ZWdvcnlNYXAgPSBleHRyYWN0Q2F0ZWdvcnlNYXAob1NlbnRlbmNlKTtcclxuICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGlJbmRleCkge1xyXG4gICAgdmFyIG0gPSBvQ2F0ZWdvcnlNYXBbb1dvcmQuY2F0ZWdvcnldIHx8IFtdO1xyXG4gICAgbS5mb3JFYWNoKGZ1bmN0aW9uIChvUG9zaXRpb246IHsgcG9zOiBudW1iZXIgfSkge1xyXG4gICAgICBvV29yZC5yZWluZm9yY2UgPSBvV29yZC5yZWluZm9yY2UgfHwgMTtcclxuICAgICAgdmFyIGJvb3N0ID0gcmVpbmZvcmNlRGlzdFdlaWdodChpSW5kZXggLSBvUG9zaXRpb24ucG9zLCBvV29yZC5jYXRlZ29yeSk7XHJcbiAgICAgIG9Xb3JkLnJlaW5mb3JjZSAqPSBib29zdDtcclxuICAgICAgb1dvcmQuX3JhbmtpbmcgKj0gYm9vc3Q7XHJcbiAgICB9KTtcclxuICB9KTtcclxuICByZXR1cm4gb1NlbnRlbmNlO1xyXG59XHJcblxyXG5cclxuaW1wb3J0ICogYXMgU2VudGVuY2UgZnJvbSAnLi9zZW50ZW5jZSc7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gcmVpbkZvcmNlKGFDYXRlZ29yaXplZEFycmF5KSB7XHJcbiAgYUNhdGVnb3JpemVkQXJyYXkuZm9yRWFjaChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XHJcbiAgICByZWluRm9yY2VTZW50ZW5jZShvU2VudGVuY2UpO1xyXG4gIH0pXHJcbiAgYUNhdGVnb3JpemVkQXJyYXkuc29ydChTZW50ZW5jZS5jbXBSYW5raW5nUHJvZHVjdCk7XHJcbiAgZGVidWdsb2coXCJhZnRlciByZWluZm9yY2VcIiArIGFDYXRlZ29yaXplZEFycmF5Lm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XHJcbiAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcclxuICB9KS5qb2luKFwiXFxuXCIpKTtcclxuICByZXR1cm4gYUNhdGVnb3JpemVkQXJyYXk7XHJcbn1cclxuXHJcblxyXG4vLy8gYmVsb3cgbWF5IG5vIGxvbmdlciBiZSB1c2VkXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hSZWdFeHAob1J1bGU6IElSdWxlLCBjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQsIG9wdGlvbnM/OiBJTWF0Y2hPcHRpb25zKSB7XHJcbiAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICB2YXIgc0tleSA9IG9SdWxlLmtleTtcclxuICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKVxyXG4gIHZhciByZWcgPSBvUnVsZS5yZWdleHA7XHJcblxyXG4gIHZhciBtID0gcmVnLmV4ZWMoczEpO1xyXG4gIGRlYnVnbG9nKFwiYXBwbHlpbmcgcmVnZXhwOiBcIiArIHMxICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XHJcbiAgaWYgKCFtKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxyXG4gIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsIG9SdWxlLmZvbGxvd3MsIG9SdWxlLmtleSlcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xyXG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcclxuICBpZiAob3B0aW9ucy5tYXRjaG90aGVycyAmJiAoZGVsdGEuZGlmZmVyZW50ID4gMCkpIHtcclxuICAgIHJldHVybiB1bmRlZmluZWRcclxuICB9XHJcbiAgdmFyIG9FeHRyYWN0ZWRDb250ZXh0ID0gZXh0cmFjdEFyZ3NNYXAobSwgb1J1bGUuYXJnc01hcCk7XHJcbiAgZGVidWdsb2coXCJleHRyYWN0ZWQgYXJncyBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLmFyZ3NNYXApKTtcclxuICBkZWJ1Z2xvZyhcIm1hdGNoIFwiICsgSlNPTi5zdHJpbmdpZnkobSkpO1xyXG5cclxuICBkZWJ1Z2xvZyhcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob0V4dHJhY3RlZENvbnRleHQpKTtcclxuICB2YXIgcmVzID0gQW55T2JqZWN0LmFzc2lnbih7fSwgb1J1bGUuZm9sbG93cykgYXMgYW55O1xyXG4gIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvRXh0cmFjdGVkQ29udGV4dCk7XHJcbiAgcmVzID0gQW55T2JqZWN0LmFzc2lnbihyZXMsIGNvbnRleHQpO1xyXG4gIGlmIChvRXh0cmFjdGVkQ29udGV4dFtzS2V5XSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICByZXNbc0tleV0gPSBvRXh0cmFjdGVkQ29udGV4dFtzS2V5XTtcclxuICB9XHJcbiAgaWYgKG9wdGlvbnMub3ZlcnJpZGUpIHtcclxuICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvUnVsZS5mb2xsb3dzKTtcclxuICAgIHJlcyA9IEFueU9iamVjdC5hc3NpZ24ocmVzLCBvRXh0cmFjdGVkQ29udGV4dClcclxuICB9XHJcbiAgT2JqZWN0LmZyZWV6ZShyZXMpO1xyXG4gIGRlYnVnbG9nKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc29ydEJ5V2VpZ2h0KHNLZXk6IHN0cmluZywgb0NvbnRleHRBOiBJRk1hdGNoLmNvbnRleHQsIG9Db250ZXh0QjogSUZNYXRjaC5jb250ZXh0KTogbnVtYmVyIHtcclxuICBkZWJ1Z2xvZygnc29ydGluZzogJyArIHNLZXkgKyAnaW52b2tlZCB3aXRoXFxuIDE6JyArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QSwgdW5kZWZpbmVkLCAyKSArXHJcbiAgICBcIiB2cyBcXG4gMjpcIiArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QiwgdW5kZWZpbmVkLCAyKSk7XHJcbiAgdmFyIHJhbmtpbmdBOiBudW1iZXIgPSBwYXJzZUZsb2F0KG9Db250ZXh0QVtcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcclxuICB2YXIgcmFua2luZ0I6IG51bWJlciA9IHBhcnNlRmxvYXQob0NvbnRleHRCW1wiX3JhbmtpbmdcIl0gfHwgXCIxXCIpO1xyXG4gIGlmIChyYW5raW5nQSAhPT0gcmFua2luZ0IpIHtcclxuICAgIGRlYnVnbG9nKFwiIHJhbmtpbiBkZWx0YVwiICsgMTAwICogKHJhbmtpbmdCIC0gcmFua2luZ0EpKTtcclxuICAgIHJldHVybiAxMDAgKiAocmFua2luZ0IgLSByYW5raW5nQSlcclxuICB9XHJcblxyXG4gIHZhciB3ZWlnaHRBID0gb0NvbnRleHRBW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdW3NLZXldIHx8IDA7XHJcbiAgdmFyIHdlaWdodEIgPSBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QltcIl93ZWlnaHRcIl1bc0tleV0gfHwgMDtcclxuICByZXR1cm4gKyh3ZWlnaHRBIC0gd2VpZ2h0Qik7XHJcbn1cclxuXHJcblxyXG4vLyBXb3JkLCBTeW5vbnltLCBSZWdleHAgLyBFeHRyYWN0aW9uUnVsZVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0MShjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQsIG9SdWxlczogQXJyYXk8SVJ1bGU+LCBvcHRpb25zOiBJTWF0Y2hPcHRpb25zKTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgdmFyIHNLZXkgPSBvUnVsZXNbMF0ua2V5O1xyXG4gIC8vIGNoZWNrIHRoYXQgcnVsZVxyXG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAvLyBjaGVjayBjb25zaXN0ZW5jeVxyXG4gICAgb1J1bGVzLmV2ZXJ5KGZ1bmN0aW9uIChpUnVsZSkge1xyXG4gICAgICBpZiAoaVJ1bGUua2V5ICE9PSBzS2V5KSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW5ob21vZ2Vub3VzIGtleXMgaW4gcnVsZXMsIGV4cGVjdGVkIFwiICsgc0tleSArIFwiIHdhcyBcIiArIEpTT04uc3RyaW5naWZ5KGlSdWxlKSk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vIGxvb2sgZm9yIHJ1bGVzIHdoaWNoIG1hdGNoXHJcbiAgdmFyIHJlcyA9IG9SdWxlcy5tYXAoZnVuY3Rpb24gKG9SdWxlKSB7XHJcbiAgICAvLyBpcyB0aGlzIHJ1bGUgYXBwbGljYWJsZVxyXG4gICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuV09SRDpcclxuICAgICAgICByZXR1cm4gbWF0Y2hXb3JkKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKVxyXG4gICAgICBjYXNlIElGTWF0Y2guRW51bVJ1bGVUeXBlLlJFR0VYUDpcclxuICAgICAgICByZXR1cm4gbWF0Y2hSZWdFeHAob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xyXG4gICAgICAvLyAgIGNhc2UgXCJFeHRyYWN0aW9uXCI6XHJcbiAgICAgIC8vICAgICByZXR1cm4gbWF0Y2hFeHRyYWN0aW9uKG9SdWxlLGNvbnRleHQpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gIH0pLmZpbHRlcihmdW5jdGlvbiAob3Jlcykge1xyXG4gICAgcmV0dXJuICEhb3Jlc1xyXG4gIH0pLnNvcnQoXHJcbiAgICBzb3J0QnlXZWlnaHQuYmluZCh0aGlzLCBzS2V5KVxyXG4gICAgKTtcclxuICByZXR1cm4gcmVzO1xyXG4gIC8vIE9iamVjdC5rZXlzKCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xyXG4gIC8vIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXVnbWVudENvbnRleHQoY29udGV4dDogSUZNYXRjaC5jb250ZXh0LCBhUnVsZXM6IEFycmF5PElSdWxlPik6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG5cclxuICB2YXIgb3B0aW9uczE6IElNYXRjaE9wdGlvbnMgPSB7XHJcbiAgICBtYXRjaG90aGVyczogdHJ1ZSxcclxuICAgIG92ZXJyaWRlOiBmYWxzZVxyXG4gIH0gYXMgSU1hdGNoT3B0aW9ucztcclxuXHJcbiAgdmFyIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMSlcclxuXHJcbiAgaWYgKGFSZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICB2YXIgb3B0aW9uczI6IElNYXRjaE9wdGlvbnMgPSB7XHJcbiAgICAgIG1hdGNob3RoZXJzOiBmYWxzZSxcclxuICAgICAgb3ZlcnJpZGU6IHRydWVcclxuICAgIH0gYXMgSU1hdGNoT3B0aW9ucztcclxuICAgIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMik7XHJcbiAgfVxyXG4gIHJldHVybiBhUmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gaW5zZXJ0T3JkZXJlZChyZXN1bHQ6IEFycmF5PElGTWF0Y2guY29udGV4dD4sIGlJbnNlcnRlZE1lbWJlcjogSUZNYXRjaC5jb250ZXh0LCBsaW1pdDogbnVtYmVyKTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgLy8gVE9ETzogdXNlIHNvbWUgd2VpZ2h0XHJcbiAgaWYgKHJlc3VsdC5sZW5ndGggPCBsaW1pdCkge1xyXG4gICAgcmVzdWx0LnB1c2goaUluc2VydGVkTWVtYmVyKVxyXG4gIH1cclxuICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHRha2VUb3BOKGFycjogQXJyYXk8QXJyYXk8SUZNYXRjaC5jb250ZXh0Pj4pOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICB2YXIgdSA9IGFyci5maWx0ZXIoZnVuY3Rpb24gKGlubmVyQXJyKSB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwIH0pXHJcblxyXG4gIHZhciByZXMgPSBbXTtcclxuICAvLyBzaGlmdCBvdXQgdGhlIHRvcCBvbmVzXHJcbiAgdSA9IHUubWFwKGZ1bmN0aW9uIChpQXJyKSB7XHJcbiAgICB2YXIgdG9wID0gaUFyci5zaGlmdCgpO1xyXG4gICAgcmVzID0gaW5zZXJ0T3JkZXJlZChyZXMsIHRvcCwgNSlcclxuICAgIHJldHVybiBpQXJyXHJcbiAgfSkuZmlsdGVyKGZ1bmN0aW9uIChpbm5lckFycjogQXJyYXk8SUZNYXRjaC5jb250ZXh0Pik6IGJvb2xlYW4geyByZXR1cm4gaW5uZXJBcnIubGVuZ3RoID4gMCB9KTtcclxuICAvLyBhcyBBcnJheTxBcnJheTxJRk1hdGNoLmNvbnRleHQ+PlxyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmltcG9ydCAqIGFzIGlucHV0RmlsdGVyUnVsZXMgZnJvbSAnLi9pbnB1dEZpbHRlclJ1bGVzJztcclxuXHJcbnZhciBybTtcclxuXHJcbmZ1bmN0aW9uIGdldFJNT25jZSgpIHtcclxuICBpZiAoIXJtKSB7XHJcbiAgICBybSA9IGlucHV0RmlsdGVyUnVsZXMuZ2V0UnVsZU1hcCgpXHJcbiAgfVxyXG4gIHJldHVybiBybTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UnVsZXMoY29udGV4dDogSUZNYXRjaC5jb250ZXh0KTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgdmFyIGJlc3ROOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+ID0gW2NvbnRleHRdO1xyXG4gIGlucHV0RmlsdGVyUnVsZXMub0tleU9yZGVyLmZvckVhY2goZnVuY3Rpb24gKHNLZXk6IHN0cmluZykge1xyXG4gICAgdmFyIGJlc3ROZXh0OiBBcnJheTxBcnJheTxJRk1hdGNoLmNvbnRleHQ+PiA9IFtdO1xyXG4gICAgYmVzdE4uZm9yRWFjaChmdW5jdGlvbiAob0NvbnRleHQ6IElGTWF0Y2guY29udGV4dCkge1xyXG4gICAgICBpZiAob0NvbnRleHRbc0tleV0pIHtcclxuICAgICAgICBkZWJ1Z2xvZygnKiogYXBwbHlpbmcgcnVsZXMgZm9yICcgKyBzS2V5KVxyXG4gICAgICAgIHZhciByZXMgPSBhdWdtZW50Q29udGV4dChvQ29udGV4dCwgZ2V0Uk1PbmNlKClbc0tleV0gfHwgW10pXHJcbiAgICAgICAgZGVidWdsb2coJyoqIHJlc3VsdCBmb3IgJyArIHNLZXkgKyAnID0gJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSlcclxuICAgICAgICBiZXN0TmV4dC5wdXNoKHJlcyB8fCBbXSlcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBydWxlIG5vdCByZWxldmFudFxyXG4gICAgICAgIGJlc3ROZXh0LnB1c2goW29Db250ZXh0XSk7XHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgICBiZXN0TiA9IHRha2VUb3BOKGJlc3ROZXh0KTtcclxuICB9KTtcclxuICByZXR1cm4gYmVzdE5cclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhcHBseVJ1bGVzUGlja0ZpcnN0KGNvbnRleHQ6IElGTWF0Y2guY29udGV4dCk6IElGTWF0Y2guY29udGV4dCB7XHJcbiAgdmFyIHIgPSBhcHBseVJ1bGVzKGNvbnRleHQpO1xyXG4gIHJldHVybiByICYmIHJbMF07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZWNpZGUgd2hldGhlciB0byByZXF1ZXJ5IGZvciBhIGNvbnRldFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGRlY2lkZU9uUmVRdWVyeShjb250ZXh0OiBJRk1hdGNoLmNvbnRleHQpOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICByZXR1cm4gW11cclxufVxyXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
