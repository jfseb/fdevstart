/**
 *
 * @module jfseb.fdevstart.analyze
 * @file analyze.ts
 * @copyright (c) 2016 Gerd Forstmann
 */
"use strict";
var InputFilter = require('./inputFilter');
var debug = require('debug');
var debuglog = debug('whatis');
var perflog = debug('perf');
var Sentence = require('./sentence');
var Word = require('./word');
function cmpByResultThenRanking(a, b) {
    var cmp = a.result.localeCompare(b.result);
    if (cmp) {
        return cmp;
    }
    return -(a._ranking - b._ranking);
}
exports.cmpByResultThenRanking = cmpByResultThenRanking;
function cmpByRanking(a, b) {
    var cmp = -(a._ranking - b._ranking);
    if (cmp) {
        return cmp;
    }
    cmp = a.result.localeCompare(b.result);
    if (cmp) {
        return cmp;
    }
    // are records different?
    var keys = Object.keys(a.record).concat(Object.keys(b.record)).sort();
    var res = keys.reduce(function (prev, sKey) {
        if (prev) {
            return prev;
        }
        if (b.record[sKey] !== a.record[sKey]) {
            if (!b.record[sKey]) {
                return -1;
            }
            if (!a.record[sKey]) {
                return +1;
            }
            return a.record[sKey].localeCompare(b.record[sKey]);
        }
        return 0;
    }, 0);
    return res;
}
exports.cmpByRanking = cmpByRanking;
function dumpNice(answer) {
    var result = {
        s: "",
        push: function (s) { this.s = this.s + s; }
    };
    var s = "**Result for category: " + answer.category + " is " + answer.result + "\n rank: " + answer._ranking + "\n";
    result.push(s);
    Object.keys(answer.record).forEach(function (sRequires, index) {
        if (sRequires.charAt(0) !== '_') {
            result.push("record: " + sRequires + " -> " + answer.record[sRequires]);
        }
        result.push('\n');
    });
    var oSentence = answer.sentence;
    oSentence.forEach(function (oWord, index) {
        var sWord = "[" + index + "] : " + oWord.category + " \"" + oWord.string + "\" => \"" + oWord.matchedString + "\"";
        result.push(sWord + "\n");
    });
    result.push(".\n");
    return result.s;
}
exports.dumpNice = dumpNice;
function dumpWeightsTop(toolmatches, options) {
    var s = '';
    toolmatches.forEach(function (oMatch, index) {
        if (index < options.top) {
            s = s + "WhatIsAnswer[" + index + "]...\n";
            s = s + dumpNice(oMatch);
        }
    });
    return s;
}
exports.dumpWeightsTop = dumpWeightsTop;
function filterRetainTopRankedResult(res) {
    var result = res.filter(function (iRes, index) {
        if (debuglog.enabled) {
            debuglog(index + ' ' + JSON.stringify(iRes));
        }
        if (iRes.result === (res[index - 1] && res[index - 1].result)) {
            debuglog('skip');
            return false;
        }
        return true;
    });
    result.sort(cmpByRanking);
    return result;
}
exports.filterRetainTopRankedResult = filterRetainTopRankedResult;
var Match = require('./match');
function calcRanking(matched, mismatched, relevantCount) {
    var lenMatched = Object.keys(matched).length;
    var factor = Match.calcRankingProduct(matched);
    factor *= Math.pow(1.5, lenMatched);
    var lenMisMatched = Object.keys(mismatched).length;
    var factor2 = Match.calcRankingProduct(mismatched);
    factor2 *= Math.pow(0.4, lenMisMatched);
    return Math.pow(factor2 * factor, 1 / (lenMisMatched + lenMatched));
}
exports.calcRanking = calcRanking;
function calcRankingSimple(matched, mismatched, relevantCount) {
    var factor = Math.pow(1.5, matched);
    var factor2 = Math.pow(0.4, mismatched);
    return Math.pow(factor2 * factor, 1 / (mismatched + matched));
}
exports.calcRankingSimple = calcRankingSimple;
function calcRankingHavingCategory(matched, hasCategory, mismatched, relevantCount) {
    var lenMatched = Object.keys(matched).length;
    var factor = Match.calcRankingProduct(matched);
    factor *= Math.pow(1.5, lenMatched);
    var lenHasCategory = Object.keys(hasCategory).length;
    var factorH = Math.pow(1.2, lenHasCategory);
    var lenMisMatched = Object.keys(mismatched).length;
    var factor2 = Match.calcRankingProduct(mismatched);
    factor2 *= Math.pow(0.4, lenMisMatched);
    return Math.pow(factor2 * factorH * factor, 1 / (lenMisMatched + lenHasCategory + lenMatched));
}
exports.calcRankingHavingCategory = calcRankingHavingCategory;
/**
 * list all top level rankings
 */
function matchRecordsHavingContext(aSentences, category, records, categorySet) {
    debuglog(JSON.stringify(records, undefined, 2));
    var relevantRecords = records.filter(function (record) {
        return (record[category] !== undefined) && (record[category] !== null);
    });
    var res = [];
    debuglog("relevant records nr:" + relevantRecords.length);
    debuglog(debuglog.enabled ? ("sentences are : " + JSON.stringify(aSentences, undefined, 2)) : "-");
    if (process.env.ABOT_FAST && categorySet) {
        // we are only interested in categories present in records for domains which contain the category
        // var categoryset = Model.calculateRelevantRecordCategories(theModel,category);
        //knowing the target
        perflog("got categoryset with " + Object.keys(categorySet).length);
        var fl = 0;
        var lf = 0;
        var aSimplifiedSentences = aSentences.map(function (oSentence) {
            var fWords = oSentence.filter(function (oWord) {
                return !Word.Word.isFiller(oWord);
            });
            var rWords = oSentence.filter(function (oWord) {
                return !!categorySet[oWord.category] || Word.Word.isCategory(oWord);
            });
            fl = fl + oSentence.length;
            lf = lf + rWords.length;
            return {
                oSentence: oSentence,
                cntRelevantWords: rWords.length,
                rWords: rWords
            };
        });
        Object.freeze(aSimplifiedSentences);
        perflog("post simplify (r=" + relevantRecords.length + " s=" + aSentences.length + " fl " + fl + "->" + lf + ")");
        relevantRecords.forEach(function (record) {
            // count matches in record which are *not* the category
            aSimplifiedSentences.forEach(function (aSentence) {
                var hasCategory = {};
                var mismatched = {};
                var matched = {};
                var cntRelevantWords = aSentence.cntRelevantWords;
                aSentence.rWords.forEach(function (oWord) {
                    if (oWord.category && (record[oWord.category] !== undefined)) {
                        if (oWord.matchedString === record[oWord.category]) {
                            matched[oWord.category] = oWord;
                        }
                        else {
                            mismatched[oWord.category] = oWord;
                        }
                    }
                    else if (Word.Word.isCategory(oWord) && record[oWord.matchedString]) {
                        hasCategory[oWord.matchedString] = 1;
                    }
                });
                if ((Object.keys(matched).length + Object.keys(hasCategory).length) > Object.keys(mismatched).length) {
                    res.push({
                        sentence: aSentence.oSentence,
                        record: record,
                        category: category,
                        result: record[category],
                        _ranking: calcRankingHavingCategory(matched, hasCategory, mismatched, cntRelevantWords)
                    });
                }
            });
        });
    }
    else {
        relevantRecords.forEach(function (record) {
            // count matches in record which are *not* the category
            aSentences.forEach(function (aSentence) {
                var hasCategory = {};
                var mismatched = {};
                var matched = {};
                var cntRelevantWords = 0;
                aSentence.forEach(function (oWord) {
                    if (!Word.Word.isFiller(oWord)) {
                        cntRelevantWords = cntRelevantWords + 1;
                        if (oWord.category && (record[oWord.category] !== undefined)) {
                            if (oWord.matchedString === record[oWord.category]) {
                                matched[oWord.category] = oWord;
                            }
                            else {
                                mismatched[oWord.category] = oWord;
                            }
                        }
                        else if (Word.Word.isCategory(oWord) && record[oWord.matchedString]) {
                            hasCategory[oWord.matchedString] = 1;
                        }
                    }
                });
                if ((Object.keys(matched).length + Object.keys(hasCategory).length) > Object.keys(mismatched).length) {
                    res.push({
                        sentence: aSentence,
                        record: record,
                        category: category,
                        result: record[category],
                        _ranking: calcRankingHavingCategory(matched, hasCategory, mismatched, cntRelevantWords)
                    });
                }
            });
        });
    }
    res.sort(cmpByResultThenRanking);
    res = filterRetainTopRankedResult(res);
    return res;
}
exports.matchRecordsHavingContext = matchRecordsHavingContext;
function matchRecords(aSentences, category, records) {
    if (debuglog.enabled) {
        debuglog(JSON.stringify(records, undefined, 2));
    }
    var relevantRecords = records.filter(function (record) {
        return (record[category] !== undefined) && (record[category] !== null);
    });
    var res = [];
    debuglog("relevant records nr:" + relevantRecords.length);
    relevantRecords.forEach(function (record) {
        aSentences.forEach(function (aSentence) {
            // count matches in record which are *not* the category
            var mismatched = {};
            var matched = {};
            var cntRelevantWords = 0;
            aSentence.forEach(function (oWord) {
                if (!Word.Word.isFiller(oWord)) {
                    cntRelevantWords = cntRelevantWords + 1;
                    if (oWord.category && (record[oWord.category] !== undefined)) {
                        if (oWord.matchedString === record[oWord.category]) {
                            matched[oWord.category] = oWord;
                        }
                        else {
                            mismatched[oWord.category] = oWord;
                        }
                    }
                }
            });
            if (Object.keys(matched).length > Object.keys(mismatched).length) {
                res.push({
                    sentence: aSentence,
                    record: record,
                    category: category,
                    result: record[category],
                    _ranking: calcRanking(matched, mismatched, cntRelevantWords)
                });
            }
        });
    });
    res.sort(cmpByResultThenRanking);
    res = filterRetainTopRankedResult(res);
    return res;
}
exports.matchRecords = matchRecords;
function matchRecordsQuick(aSentences, category, records, categorySet) {
    if (debuglog.enabled) {
        debuglog(JSON.stringify(records, undefined, 2));
    }
    Object.freeze(categorySet);
    perflog("matchRecordsQuick ...(r=" + records.length + " s=" + aSentences.length + ")");
    var relevantRecords = records.filter(function (record) {
        return (record[category] !== undefined) && (record[category] !== null);
    });
    var res = [];
    debuglog("relevant records (r=" + relevantRecords.length + ")");
    perflog("relevant records nr:" + relevantRecords.length + " sentences " + aSentences.length);
    if (process.env.ABOT_FAST && categorySet) {
        // we are only interested in categories present in records for domains which contain the category
        // var categoryset = Model.calculateRelevantRecordCategories(theModel,category);
        //knowing the target
        perflog("got categoryset with " + Object.keys(categorySet).length);
        var fl = 0;
        var lf = 0;
        var aSimplifiedSentences = aSentences.map(function (oSentence) {
            var rWords = oSentence.filter(function (oWord) {
                return !!categorySet[oWord.category];
            });
            fl = fl + oSentence.length;
            lf = lf + rWords.length;
            return {
                oSentence: oSentence,
                cntRelevantWords: rWords.length,
                rWords: rWords
            };
        });
        perflog("post simplify (r=" + relevantRecords.length + " s=" + aSentences.length + " fl " + fl + "->" + lf + ")");
    }
    else {
        var fl = 0;
        var lf = 0;
        var aSimplifiedSentences = aSentences.map(function (oSentence) {
            var rWords = oSentence.filter(function (oWord) {
                return !Word.Word.isFiller(oWord);
            });
            fl = fl + oSentence.length;
            lf = lf + rWords.length;
            return {
                oSentence: oSentence,
                cntRelevantWords: rWords.length,
                rWords: rWords
            };
        });
        perflog("post simplify (r=" + relevantRecords.length + " s=" + aSentences.length + " fl " + fl + "->" + lf + ")");
    }
    relevantRecords.forEach(function (record) {
        aSimplifiedSentences.forEach(function (aSentence) {
            // count matches in record which are *not* the category
            var mismatched = 0;
            var matched = 0;
            aSentence.rWords.forEach(function (oWord) {
                if (record[oWord.category] !== undefined) {
                    if (oWord.matchedString === record[oWord.category]) {
                        ++matched;
                    }
                    else {
                        ++mismatched;
                    }
                }
            });
            // if(matched > 0 || mismatched > 0 ) {
            //   console.log(" m" + matched + " mismatched" + mismatched);
            // }
            //console.log(JSON.stringify(aSentence.oSentence));
            if (matched > mismatched) {
                res.push({
                    sentence: aSentence.oSentence,
                    record: record,
                    category: category,
                    result: record[category],
                    _ranking: calcRankingSimple(matched, mismatched, aSentence.cntRelevantWords)
                });
            }
        });
    });
    perflog("sort (a=" + res.length + ")");
    res.sort(cmpByResultThenRanking);
    perflog("filterRetain ...");
    res = filterRetainTopRankedResult(res);
    perflog("matchRecordsQuick done: (r=" + relevantRecords.length + " s=" + aSentences.length + " a=" + res.length + ")");
    return res;
}
exports.matchRecordsQuick = matchRecordsQuick;
function analyzeCategory(categoryword, rules, wholesentence) {
    var cats = InputFilter.categorizeAWord(categoryword, rules, wholesentence, {});
    // TODO qualify
    cats = cats.filter(function (cat) {
        return cat.category === 'category';
    });
    debuglog(JSON.stringify(cats));
    if (cats.length) {
        return cats[0].matchedString;
    }
}
exports.analyzeCategory = analyzeCategory;
// const result = WhatIs.resolveCategory(cat, a1.entity,
//   theModel.mRules, theModel.tools, theModel.records);
function resolveCategory(category, contextQueryString, rules, records) {
    if (contextQueryString.length === 0) {
        return [];
    }
    else {
        var matched = InputFilter.analyzeString(contextQueryString, rules);
        debuglog("after matched " + JSON.stringify(matched));
        var aSentences = InputFilter.expandMatchArr(matched);
        debuglog("after expand" + aSentences.map(function (oSentence) {
            return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
        }).join("\n"));
        var aSentencesReinforced = InputFilter.reinForce(aSentences);
        //aSentences.map(function(oSentence) { return InputFilter.reinForce(oSentence); });
        debuglog("after reinforce" + aSentencesReinforced.map(function (oSentence) {
            return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
        }).join("\n"));
        var matchedAnswers = matchRecords(aSentences, category, records); //aTool: Array<IMatch.ITool>): any /* objectstream*/ {
        debuglog(" matchedAnswers" + JSON.stringify(matchedAnswers, undefined, 2));
        return matchedAnswers;
    }
}
exports.resolveCategory = resolveCategory;
function filterOnlyTopRanked(results) {
    var res = results.filter(function (result) {
        if (result._ranking === results[0]._ranking) {
            return true;
        }
        if (result._ranking >= results[0]._ranking) {
            throw new Error("List to filter must be ordered");
        }
        return false;
    });
    return res;
}
exports.filterOnlyTopRanked = filterOnlyTopRanked;
function isIndiscriminateResult(results) {
    var cnt = results.reduce(function (prev, result) {
        if (result._ranking === results[0]._ranking) {
            return prev + 1;
        }
    }, 0);
    if (cnt > 1) {
        // search for a discriminating category value
        var discriminating = Object.keys(results[0].record).reduce(function (prev, category) {
            if ((category.charAt(0) !== '_' && category !== results[0].category)
                && (results[0].record[category] !== results[1].record[category])) {
                prev.push(category);
            }
            return prev;
        }, []);
        if (discriminating.length) {
            return "Many comparable results, perhaps you want to specify a discriminating " + discriminating.join(',');
        }
        return 'Your question does not have a specific answer';
    }
    return undefined;
}
exports.isIndiscriminateResult = isIndiscriminateResult;

//# sourceMappingURL=whatis.js.map
