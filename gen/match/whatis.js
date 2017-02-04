/**
 *
 * @module jfseb.fdevstart.analyze
 * @file analyze.ts
 * @copyright (c) 2016 Gerd Forstmann
 */
"use strict";
var InputFilter = require("./inputFilter");
var debug = require("debug");
var debuglog = debug('whatis');
var debuglogV = debug('whatVis');
var perflog = debug('perf');
var Sentence = require("./sentence");
var Word = require("./word");
var Algol = require("./algol");
function cmpByResultThenRanking(a, b) {
    var cmp = a.result.localeCompare(b.result);
    if (cmp) {
        return cmp;
    }
    return -(a._ranking - b._ranking);
}
exports.cmpByResultThenRanking = cmpByResultThenRanking;
function localeCompareArrs(aaresult, bbresult) {
    var cmp = 0;
    var blen = bbresult.length;
    aaresult.every(function (a, index) {
        if (blen <= index) {
            cmp = -1;
            return false;
        }
        cmp = a.localeCompare(bbresult[index]);
        if (cmp) {
            return false;
        }
        return true;
    });
    if (cmp) {
        return cmp;
    }
    if (blen > aaresult.length) {
        cmp = +1;
    }
    return 0;
}
function cmpByResultThenRankingTupel(aa, bb) {
    var cmp = localeCompareArrs(aa.result, bb.result);
    if (cmp) {
        return cmp;
    }
    return -(aa._ranking - bb._ranking);
}
exports.cmpByResultThenRankingTupel = cmpByResultThenRankingTupel;
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
function cmpByRankingTupel(a, b) {
    var cmp = -(a._ranking - b._ranking);
    if (cmp) {
        return cmp;
    }
    cmp = localeCompareArrs(a.result, b.result);
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
exports.cmpByRankingTupel = cmpByRankingTupel;
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
function dumpNiceTupel(answer) {
    var result = {
        s: "",
        push: function (s) { this.s = this.s + s; }
    };
    var s = "**Result for categories: " + answer.categories.join(";") + " is " + answer.result + "\n rank: " + answer._ranking + "\n";
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
exports.dumpNiceTupel = dumpNiceTupel;
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
            debuglog('retain topRanked: ' + index + ' ' + JSON.stringify(iRes));
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
function filterRetainTopRankedResultTupel(res) {
    var result = res.filter(function (iRes, index) {
        if (debuglog.enabled) {
            debuglog(' retain tupel ' + index + ' ' + JSON.stringify(iRes));
        }
        if (iRes.result === (res[index - 1] && res[index - 1].result)) {
            debuglog('skip');
            return false;
        }
        return true;
    });
    result.sort(cmpByRankingTupel);
    return result;
}
exports.filterRetainTopRankedResultTupel = filterRetainTopRankedResultTupel;
var Match = require("./match");
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
function calcRankingSimple(matched, mismatched, nouse, relevantCount) {
    // 2 : 0
    // 1 : 0
    var factor = matched * Math.pow(1.5, matched) * Math.pow(1.5, matched);
    var factor2 = Math.pow(0.4, mismatched);
    var factor3 = Math.pow(0.4, nouse);
    return Math.pow(factor2 * factor * factor3, 1 / (mismatched + matched + nouse));
}
exports.calcRankingSimple = calcRankingSimple;
function calcRankingHavingCategory(matched, hasCategory, mismatched, relevantCount) {
    var lenMatched = Object.keys(matched).length;
    var factor = Match.calcRankingProduct(matched);
    factor *= Math.pow(1.5, lenMatched);
    var lenHasCategory = Object.keys(hasCategory).length;
    var factorH = Math.pow(1.1, lenHasCategory);
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
    //debuglog(JSON.stringify(records, undefined, 2));
    var relevantRecords = records.filter(function (record) {
        return (record[category] !== undefined) && (record[category] !== null);
    });
    var res = [];
    debuglog("MatchRecordsHavingContext : relevant records nr:" + relevantRecords.length);
    debuglog(debuglog.enabled ? ("sentences are : " + JSON.stringify(aSentences, undefined, 2)) : "-");
    debuglog(debuglog.enabled ? ("category " + category + " and categoryset is: " + JSON.stringify(categorySet, undefined, 2)) : "-");
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
        debuglog("post simplify (r=" + relevantRecords.length + " s=" + aSentences.length + " fl " + fl + "->" + lf + ")");
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
        debuglog("here in weird");
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
    debuglog(" after sort" + res.length);
    res = filterRetainTopRankedResult(res);
    return res;
}
exports.matchRecordsHavingContext = matchRecordsHavingContext;
/**
 * list all top level rankings
 */
function matchRecordsTupelHavingContext(aSentences, categories, records, categorySet) {
    // debuglog(JSON.stringify(records, undefined, 2));
    var categoryF = categories[0];
    var relevantRecords = records.filter(function (record) {
        return (record[categoryF] !== undefined) && (record[categoryF] !== null);
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
                        categories: categories,
                        result: extractResult(categories, record),
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
                        categories: categories,
                        result: extractResult(categories, record),
                        _ranking: calcRankingHavingCategory(matched, hasCategory, mismatched, cntRelevantWords)
                    });
                }
            });
        });
    }
    res.sort(cmpByResultThenRankingTupel);
    res = filterRetainTopRankedResultTupel(res);
    return res;
}
exports.matchRecordsTupelHavingContext = matchRecordsTupelHavingContext;
function matchRecords(aSentences, category, records) {
    // if (debuglog.enabled) {
    //   debuglog(JSON.stringify(records, undefined, 2));
    // }
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
    //if (debuglog.enabled) {
    //  debuglog(JSON.stringify(records, undefined, 2));
    //}
    Object.freeze(categorySet);
    perflog("matchRecordsQuick ...(r=" + records.length + " s=" + aSentences.length + ")");
    var relevantRecords = records.filter(function (record) {
        return (record[category] !== undefined) && (record[category] !== null);
    });
    var res = [];
    debuglog("matchRecordsQuick: relevant records (r=" + relevantRecords.length + ") sentences " + aSentences.length);
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
            var nouse = 0;
            var missingcat = 0;
            aSentence.rWords.forEach(function (oWord) {
                if (record[oWord.category] !== undefined) {
                    if (oWord.matchedString === record[oWord.category]) {
                        ++matched;
                    }
                    else {
                        ++mismatched;
                    }
                }
                else {
                    if (oWord.category !== "category") {
                        nouse += 1;
                    }
                    else {
                        if (!record[oWord.matchedString]) {
                            missingcat += 1;
                        }
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
                    _ranking: calcRankingSimple(matched, mismatched, (nouse + missingcat), aSentence.cntRelevantWords)
                });
            }
        });
    });
    perflog("sort (a=" + res.length + ")");
    res.sort(cmpByResultThenRanking);
    perflog("filterRetain ...");
    res = filterRetainTopRankedResult(res);
    debuglog("matchRecordsQuick done: (r=" + relevantRecords.length + " s=" + aSentences.length + " a=" + res.length + ")");
    perflog("matchRecordsQuick done: (r=" + relevantRecords.length + " s=" + aSentences.length + " a=" + res.length + ")");
    return res;
}
exports.matchRecordsQuick = matchRecordsQuick;
function extractResult(categories, record) {
    return categories.map(function (category) { return record[category] || "n/a"; });
}
function matchRecordsQuickMultipleCategories(aSentences, categories, records, categorySet) {
    // if (debuglog.enabled) {
    //  debuglog(JSON.stringify(records, undefined, 2));
    // }
    Object.freeze(categorySet);
    var categoryF = categories[0];
    debuglog("matchRecordsQuickMultipleCategories (r=" + records.length + " s=" + aSentences.length + ")\n categories:" + categories.join("\n"));
    perflog("matchRecordsQuickMult ...(r=" + records.length + " s=" + aSentences.length + ")");
    var relevantRecords = records.filter(function (record) {
        return (record[categoryF] !== undefined) && (record[categoryF] !== null);
    });
    var res = [];
    debuglog("relevant records with first (r=" + relevantRecords.length + ")");
    perflog("relevant records with first nr:" + relevantRecords.length + " sentences " + aSentences.length);
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
        debuglog("not abot_fast !");
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
        debuglog("post simplify (r=" + relevantRecords.length + " s=" + aSentences.length + " fl " + fl + "->" + lf + ")");
        perflog("post simplify (r=" + relevantRecords.length + " s=" + aSentences.length + " fl " + fl + "->" + lf + ")");
    }
    relevantRecords.forEach(function (record) {
        aSimplifiedSentences.forEach(function (aSentence) {
            // count matches in record which are *not* the category
            var mismatched = 0;
            var matched = 0;
            var nouse = 0;
            var missingcat = 0;
            aSentence.rWords.forEach(function (oWord) {
                if (record[oWord.category] !== undefined) {
                    if (oWord.matchedString === record[oWord.category]) {
                        ++matched;
                    }
                    else {
                        ++mismatched;
                    }
                }
                else {
                    if (oWord.category !== "category") {
                        nouse += 1;
                    }
                    else {
                        if (!record[oWord.matchedString]) {
                            missingcat += 1;
                        }
                    }
                }
            });
            // if(matched > 0 || mismatched > 0 ) {
            //   console.log(" m" + matched + " mismatched" + mismatched);
            // }
            //console.log(JSON.stringify(aSentence.oSentence));
            if (matched > mismatched) {
                var rec = {
                    sentence: aSentence.oSentence,
                    record: record,
                    categories: categories,
                    result: extractResult(categories, record),
                    _ranking: calcRankingSimple(matched, mismatched, (nouse + missingcat), aSentence.cntRelevantWords)
                };
                /*   if(record["appId"] ==="F1566") {
                     console.log("here F1566" + JSON.stringify(rec));
                     console.log("here matched" + matched + " mismatched" + mismatched + " nouse " + (nouse + missingcat));
                     console.log("here cntRelevant :" + aSentence.cntRelevantWords);
                   }
                   if(record["appId"] ==="F0731A") {
                     console.log("here F0731A" + JSON.stringify(rec));
                     console.log("here matched" + matched + " mismatched" + mismatched + " nouse " + (nouse + missingcat));
                     console.log("here cntRelevant :" + aSentence.cntRelevantWords);
                   }
                   */
                res.push(rec);
            }
        });
    });
    perflog("sort (a=" + res.length + ")");
    res.sort(cmpByResultThenRankingTupel);
    perflog("filterRetain ...");
    res = filterRetainTopRankedResultTupel(res);
    perflog("matchRecordsQuick done: (r=" + relevantRecords.length + " s=" + aSentences.length + " a=" + res.length + ")");
    return res;
}
exports.matchRecordsQuickMultipleCategories = matchRecordsQuickMultipleCategories;
function classifyWordWithTargetCategory(word, targetcategory, rules, wholesentence) {
    //console.log("classify " + word + " "  + targetcategory);
    var cats = InputFilter.categorizeAWord(word, rules, wholesentence, {});
    // TODO qualify
    cats = cats.filter(function (cat) {
        return cat.category === targetcategory;
    });
    debuglog(JSON.stringify(cats));
    if (cats.length) {
        return cats[0].matchedString;
    }
}
function analyzeCategory(categoryword, rules, wholesentence) {
    return classifyWordWithTargetCategory(categoryword, 'category', rules, wholesentence);
}
exports.analyzeCategory = analyzeCategory;
function splitAtCommaAnd(str) {
    var r = str.split(/(\band\b)|[,]/);
    r = r.filter(function (o, index) {
        if (index % 2 > 0) {
            return false;
        }
        return true;
    });
    var rtrimmed = r.map(function (o) {
        return new String(o).trim();
    });
    return rtrimmed;
}
exports.splitAtCommaAnd = splitAtCommaAnd;
/**
 * A simple implementation, splitting at and and ,
 */
function analyzeCategoryMult2(categorylist, rules, wholesentence) {
    var rtrimmed = splitAtCommaAnd(categorylist);
    var rcat = rtrimmed.map(function (o) {
        return analyzeCategory(o, rules, wholesentence);
    });
    if (rcat.indexOf(undefined) >= 0) {
        throw new Error('"' + rtrimmed[rcat.indexOf(undefined)] + '" is not a category!');
    }
    return rcat;
}
exports.analyzeCategoryMult2 = analyzeCategoryMult2;
function filterAcceptingOnly(res, categories) {
    return res.filter(function (aSentence, iIndex) {
        return aSentence.every(function (oWord) {
            return categories.indexOf(oWord.category) >= 0;
        });
    });
}
exports.filterAcceptingOnly = filterAcceptingOnly;
var sWords = {};
function analyzeContextString(contextQueryString, rules) {
    var matched = InputFilter.analyzeString(contextQueryString, rules, sWords);
    if (debuglog.enabled) {
        debuglog("After matched " + JSON.stringify(matched));
    }
    var aSentences = InputFilter.expandMatchArr(matched);
    if (debuglog.enabled) {
        debuglog("after expand" + aSentences.map(function (oSentence) {
            return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
        }).join("\n"));
    }
    var aSentencesReinforced = InputFilter.reinForce(aSentences);
    if (debuglog.enabled) {
        debuglog("after reinforce" + aSentencesReinforced.map(function (oSentence) {
            return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
        }).join("\n"));
    }
    // we limit analysis to n sentences
    aSentencesReinforced = aSentencesReinforced.slice(0, Algol.Cutoff_Sentences);
    if (debuglog.enabled) {
        debuglog("after reinforce and cutoff" + aSentencesReinforced.length + "\n" + aSentencesReinforced.map(function (oSentence) {
            return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
        }).join("\n"));
    }
    return aSentencesReinforced;
}
exports.analyzeContextString = analyzeContextString;
function cmpByNrCategoriesAndSameDomain(a, b) {
    //console.log("compare a" + a + " cntb " + b);
    var cnta = Sentence.getDistinctCategoriesInSentence(a).length;
    var cntb = Sentence.getDistinctCategoriesInSentence(b).length;
    /*
      var cnta = a.reduce(function(prev, oWord) {
        return prev + ((oWord.category === "category")? 1 : 0);
      },0);
      var cntb = b.reduce(function(prev, oWord) {
        return prev + ((oWord.category === "category")? 1 : 0);
      },0);
     // console.log("cnt a" + cnta + " cntb " + cntb);
     */
    return cntb - cnta;
}
exports.cmpByNrCategoriesAndSameDomain = cmpByNrCategoriesAndSameDomain;
function analyzeCategoryMult(categorylist, rules, wholesentence, gWords) {
    var res = analyzeContextString(categorylist, rules);
    //  debuglog("resulting category sentences", JSON.stringify(res));
    var res2 = filterAcceptingOnly(res, ["category", "filler"]);
    res2.sort(Sentence.cmpRankingProduct);
    debuglog("resulting category sentences: \n", debuglog.enabled ? (Sentence.dumpNiceArr(res2.slice(0, 3), Sentence.rankingProduct)) : '-');
    // TODO:   res2 = filterAcceptingOnlySameDomain(res2);
    //debuglog("resulting category sentences", JSON.stringify(res2, undefined, 2));
    // expect only categories
    // we could rank now by common domains , but for now we only take the first one
    if (!res.length) {
        return undefined;
    }
    //res.sort(cmpByNrCategoriesAndSameDomain);
    var rescat = Sentence.getDistinctCategoriesInSentence(res2[0]);
    return rescat;
    // "" return res[0].filter()
    // return classifyWordWithTargetCategory(categorylist, 'category', rules, wholesentence);
}
exports.analyzeCategoryMult = analyzeCategoryMult;
function analyzeOperator(opword, rules, wholesentence) {
    return classifyWordWithTargetCategory(opword, 'operator', rules, wholesentence);
}
exports.analyzeOperator = analyzeOperator;
// const result = WhatIs.resolveCategory(cat, a1.entity,
//   theModel.mRules, theModel.tools, theModel.records);
function resolveCategory(category, contextQueryString, rules, records) {
    if (contextQueryString.length === 0) {
        return [];
    }
    else {
        var matched = InputFilter.analyzeString(contextQueryString, rules);
        debuglog(debuglog.enabled ? ("after matched " + JSON.stringify(matched)) : '-');
        var aSentences = InputFilter.expandMatchArr(matched);
        if (debuglog.enabled) {
            debuglog("after expand" + aSentences.map(function (oSentence) {
                return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
            }).join("\n"));
        }
        var aSentencesReinforced = InputFilter.reinForce(aSentences);
        //aSentences.map(function(oSentence) { return InputFilter.reinForce(oSentence); });
        debuglog(debuglog.enabled ? ("after reinforce" + aSentencesReinforced.map(function (oSentence) {
            return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
        }).join("\n")) : '-');
        var matchedAnswers = matchRecords(aSentences, category, records); //aTool: Array<IMatch.ITool>): any /* objectstream*/ {
        debuglog(debuglog.enabled ? (" matchedAnswers" + JSON.stringify(matchedAnswers, undefined, 2)) : '-');
        return matchedAnswers;
    }
}
exports.resolveCategory = resolveCategory;
var Model = require("../model/model");
function resolveCategories(categories, contextQueryString, theModel) {
    var records = theModel.records;
    var rules = theModel.rules;
    if (contextQueryString.length === 0) {
        return [];
    }
    else {
        var matched = InputFilter.analyzeString(contextQueryString, rules);
        debuglog(debuglog.enabled ? ("after matched " + JSON.stringify(matched)) : '-');
        var aSentences = InputFilter.expandMatchArr(matched);
        if (debuglog.enabled) {
            debuglog(debuglog.enabled ? ("after expand" + aSentences.map(function (oSentence) {
                return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
            }).join("\n")) : '-');
        }
        var aSentencesReinforced = InputFilter.reinForce(aSentences);
        //aSentences.map(function(oSentence) { return InputFilter.reinForce(oSentence); });
        debuglog(debuglog.enabled ? ("after reinforce" + aSentencesReinforced.map(function (oSentence) {
            return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
        }).join("\n")) : '-');
        //var matchedAnswers = matchRecordsQuick(aSentences, category, records); //aTool: Array<IMatch.ITool>): any /* objectstream*/ {
        var categorySet = {};
        categories.forEach(function (category) {
            categorySet[category] = true;
            var categorySetLocal = Model.getAllRecordCategoriesForTargetCategory(theModel, category, true);
            Object.assign(categorySet, categorySetLocal);
        });
        var matchedAnswers = matchRecordsQuickMultipleCategories(aSentencesReinforced, categories, records, categorySet); //aTool: Array<IMatch.ITool>): any /* objectstream*/ {
        if (debuglog.enabled) {
            debuglog(" matched Answers" + JSON.stringify(matchedAnswers, undefined, 2));
        }
        perflog("filtering topRanked (a=" + matchedAnswers.length + ")...");
        var matchedFiltered = filterOnlyTopRankedTupel(matchedAnswers);
        if (debuglog.enabled) {
            debuglog(" matched top-ranked Answers" + JSON.stringify(matchedFiltered, undefined, 2));
        }
        perflog("totalWhatisWithContext (a=" + matchedFiltered.length + ")");
        return matchedFiltered; // ??? Answers;
    }
}
exports.resolveCategories = resolveCategories;
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
function filterOnlyTopRankedTupel(results) {
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
exports.filterOnlyTopRankedTupel = filterOnlyTopRankedTupel;
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
function isIndiscriminateResultTupel(results) {
    var cnt = results.reduce(function (prev, result) {
        if (result._ranking === results[0]._ranking) {
            return prev + 1;
        }
    }, 0);
    if (cnt > 1) {
        // search for a discriminating category value
        var discriminating = Object.keys(results[0].record).reduce(function (prev, category) {
            if ((category.charAt(0) !== '_' && results[0].categories.indexOf(category) < 0)
                && (results[0].record[category] !== results[1].record[category])) {
                prev.push(category);
            }
            return prev;
        }, []);
        if (discriminating.length) {
            return "Many comparable results, perhaps you want to specify a discriminating " + discriminating.join(',') + ' or use "list all ..."';
        }
        return 'Your question does not have a specific answer';
    }
    return undefined;
}
exports.isIndiscriminateResultTupel = isIndiscriminateResultTupel;

//# sourceMappingURL=whatis.js.map
