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
var _ = require("lodash");
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
function cmpByRankingAscending(a, b) {
    var cmp = a._ranking - b._ranking;
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
exports.cmpByRankingAscending = cmpByRankingAscending;
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
        push: function push(s) {
            this.s = this.s + s;
        }
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
        push: function push(s) {
            this.s = this.s + s;
        }
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
    var result = res.answers.filter(function (iRes, index) {
        if (debuglog.enabled) {
            debuglog('retain topRanked: ' + index + ' ' + JSON.stringify(iRes));
        }
        if (iRes.result === (res.answers[index - 1] && res.answers[index - 1].result)) {
            debuglog('skip');
            return false;
        }
        return true;
    });
    result.sort(cmpByRanking);
    var a = Object.assign({ answers: result }, res, { answers: result });
    a.answers = result;
    return a;
}
exports.filterRetainTopRankedResult = filterRetainTopRankedResult;
function filterRetainTopRankedResultTupel(res) {
    var result = res.tupelanswers.filter(function (iRes, index) {
        if (debuglog.enabled) {
            debuglog(' retain tupel ' + index + ' ' + JSON.stringify(iRes));
        }
        if (_.isEqual(iRes.result, res.tupelanswers[index - 1] && res.tupelanswers[index - 1].result)) {
            debuglog('skip');
            return false;
        }
        return true;
    });
    result.sort(cmpByRankingTupel);
    return Object.assign(res, { tupelanswers: result });
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
/**
 * A ranking which is purely based on the numbers of matched entities,
 * disregarding exactness of match
 */
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
function matchRecordsHavingContext(pSentences, category, records, categorySet) {
    //debuglog(JSON.stringify(records, undefined, 2));
    var relevantRecords = records.filter(function (record) {
        return record[category] !== undefined && record[category] !== null;
    });
    var res = [];
    debuglog("MatchRecordsHavingContext : relevant records nr:" + relevantRecords.length);
    debuglog(debuglog.enabled ? "sentences are : " + JSON.stringify(pSentences, undefined, 2) : "-");
    debuglog(debuglog.enabled ? "category " + category + " and categoryset is: " + JSON.stringify(categorySet, undefined, 2) : "-");
    if (process.env.ABOT_FAST && categorySet) {
        // we are only interested in categories present in records for domains which contain the category
        // var categoryset = Model.calculateRelevantRecordCategories(theModel,category);
        //knowing the target
        perflog("got categoryset with " + Object.keys(categorySet).length);
        var fl = 0;
        var lf = 0;
        var aSimplifiedSentences = pSentences.sentences.map(function (oSentence) {
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
        debuglog("post simplify (r=" + relevantRecords.length + " s=" + pSentences.sentences.length + " fl " + fl + "->" + lf + ")");
        perflog("post simplify (r=" + relevantRecords.length + " s=" + pSentences.sentences.length + " fl " + fl + "->" + lf + ")");
        relevantRecords.forEach(function (record) {
            // count matches in record which are *not* the category
            aSimplifiedSentences.forEach(function (aSentence) {
                var hasCategory = {};
                var mismatched = {};
                var matched = {};
                var cntRelevantWords = aSentence.cntRelevantWords;
                aSentence.rWords.forEach(function (oWord) {
                    if (oWord.category && record[oWord.category] !== undefined) {
                        if (oWord.matchedString === record[oWord.category]) {
                            matched[oWord.category] = oWord;
                        } else {
                            mismatched[oWord.category] = oWord;
                        }
                    } else if (Word.Word.isCategory(oWord) && record[oWord.matchedString]) {
                        hasCategory[oWord.matchedString] = 1;
                    }
                });
                if (Object.keys(matched).length + Object.keys(hasCategory).length > Object.keys(mismatched).length) {
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
    } else {
        relevantRecords.forEach(function (record) {
            // count matches in record which are *not* the category
            pSentences.sentences.forEach(function (aSentence) {
                var hasCategory = {};
                var mismatched = {};
                var matched = {};
                var cntRelevantWords = 0;
                aSentence.forEach(function (oWord) {
                    if (!Word.Word.isFiller(oWord)) {
                        cntRelevantWords = cntRelevantWords + 1;
                        if (oWord.category && record[oWord.category] !== undefined) {
                            if (oWord.matchedString === record[oWord.category]) {
                                matched[oWord.category] = oWord;
                            } else {
                                mismatched[oWord.category] = oWord;
                            }
                        } else if (Word.Word.isCategory(oWord) && record[oWord.matchedString]) {
                            hasCategory[oWord.matchedString] = 1;
                        }
                    }
                });
                if (Object.keys(matched).length + Object.keys(hasCategory).length > Object.keys(mismatched).length) {
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
    var result = Object.assign({}, pSentences, { answers: res });
    return filterRetainTopRankedResult(result);
}
exports.matchRecordsHavingContext = matchRecordsHavingContext;
/**
 * list all top level rankings
 */
function matchRecordsTupelHavingContext(pSentences, categories, records, categorySet) {
    // debuglog(JSON.stringify(records, undefined, 2));
    var categoryF = categories[0];
    var relevantRecords = records.filter(function (record) {
        return record[categoryF] !== undefined && record[categoryF] !== null;
    });
    var res = [];
    debuglog("relevant records nr:" + relevantRecords.length);
    debuglog(debuglog.enabled ? "sentences are : " + JSON.stringify(pSentences, undefined, 2) : "-");
    if (process.env.ABOT_FAST && categorySet) {
        // we are only interested in categories present in records for domains which contain the category
        // var categoryset = Model.calculateRelevantRecordCategories(theModel,category);
        //knowing the target
        perflog("got categoryset with " + Object.keys(categorySet).length);
        var fl = 0;
        var lf = 0;
        var aSimplifiedSentences = pSentences.sentences.map(function (oSentence) {
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
        perflog("post simplify (r=" + relevantRecords.length + " s=" + pSentences.sentences.length + " fl " + fl + "->" + lf + ")");
        relevantRecords.forEach(function (record) {
            // count matches in record which are *not* the category
            aSimplifiedSentences.forEach(function (aSentence) {
                var hasCategory = {};
                var mismatched = {};
                var matched = {};
                var cntRelevantWords = aSentence.cntRelevantWords;
                aSentence.rWords.forEach(function (oWord) {
                    if (oWord.category && record[oWord.category] !== undefined) {
                        if (oWord.matchedString === record[oWord.category]) {
                            matched[oWord.category] = oWord;
                        } else {
                            mismatched[oWord.category] = oWord;
                        }
                    } else if (Word.Word.isCategory(oWord) && record[oWord.matchedString]) {
                        hasCategory[oWord.matchedString] = 1;
                    }
                });
                if (Object.keys(matched).length + Object.keys(hasCategory).length > Object.keys(mismatched).length) {
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
    } else {
        relevantRecords.forEach(function (record) {
            // count matches in record which are *not* the category
            pSentences.sentences.forEach(function (aSentence) {
                var hasCategory = {};
                var mismatched = {};
                var matched = {};
                var cntRelevantWords = 0;
                aSentence.forEach(function (oWord) {
                    if (!Word.Word.isFiller(oWord)) {
                        cntRelevantWords = cntRelevantWords + 1;
                        if (oWord.category && record[oWord.category] !== undefined) {
                            if (oWord.matchedString === record[oWord.category]) {
                                matched[oWord.category] = oWord;
                            } else {
                                mismatched[oWord.category] = oWord;
                            }
                        } else if (Word.Word.isCategory(oWord) && record[oWord.matchedString]) {
                            hasCategory[oWord.matchedString] = 1;
                        }
                    }
                });
                if (Object.keys(matched).length + Object.keys(hasCategory).length > Object.keys(mismatched).length) {
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
    var result1 = Object.assign({ tupelanswers: res }, pSentences);
    return filterRetainTopRankedResultTupel(result1);
}
exports.matchRecordsTupelHavingContext = matchRecordsTupelHavingContext;
function matchRecords(aSentences, category, records) {
    // if (debuglog.enabled) {
    //   debuglog(JSON.stringify(records, undefined, 2));
    // }
    var relevantRecords = records.filter(function (record) {
        return record[category] !== undefined && record[category] !== null;
    });
    var res = [];
    debuglog("relevant records nr:" + relevantRecords.length);
    relevantRecords.forEach(function (record) {
        aSentences.sentences.forEach(function (aSentence) {
            // count matches in record which are *not* the category
            var mismatched = {};
            var matched = {};
            var cntRelevantWords = 0;
            aSentence.forEach(function (oWord) {
                if (!Word.Word.isFiller(oWord)) {
                    cntRelevantWords = cntRelevantWords + 1;
                    if (oWord.category && record[oWord.category] !== undefined) {
                        if (oWord.matchedString === record[oWord.category]) {
                            matched[oWord.category] = oWord;
                        } else {
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
    var result = Object.assign({}, aSentences, { answers: res });
    return filterRetainTopRankedResult(result);
}
exports.matchRecords = matchRecords;
function makeSimplifiedSentencesCategorySet(aSentences, categorySet, track) {
    return aSentences.sentences.map(function (oSentence) {
        var aDomains = [];
        var rWords = oSentence.filter(function (oWord) {
            if (oWord.category === "domain") {
                aDomains.push(oWord.matchedString);
                return false;
            }
            if (oWord.category === "meta") {
                // e.g. domain XXX
                return false;
            }
            return !!categorySet[oWord.category];
        });
        track.fl += oSentence.length;
        track.lf += rWords.length;
        return {
            domains: aDomains,
            oSentence: oSentence,
            cntRelevantWords: rWords.length,
            rWords: rWords
        };
    });
}
function makeSimplifiedSentences(aSentences, track) {
    return aSentences.sentences.map(function (oSentence) {
        var domains = [];
        var rWords = oSentence.filter(function (oWord) {
            if (oWord.category === "domain") {
                domains.push(oWord.matchedString);
                return false;
            }
            if (oWord.category === "meta") {
                // e.g. domain XXX
                return false;
            }
            return !Word.Word.isFiller(oWord);
        });
        track.fl += oSentence.length;
        track.lf += rWords.length;
        return {
            oSentence: oSentence,
            domains: domains,
            cntRelevantWords: rWords.length,
            rWords: rWords
        };
    });
}
function matchRecordsQuick(aSentences, category, records, categorySet) {
    //if (debuglog.enabled) {
    //  debuglog(JSON.stringify(records, undefined, 2));
    //}
    Object.freeze(categorySet);
    perflog("matchRecordsQuick ...(r=" + records.length + " s=" + aSentences.sentences.length + ") with category : \"" + category + '\"');
    var relevantRecords = records.filter(function (record) {
        return record[category] !== undefined && record[category] !== null;
    });
    var res = [];
    debuglog("matchRecordsQuick: relevant records (r=" + relevantRecords.length + ") sentences " + aSentences.sentences.length);
    perflog("relevant records nr:" + relevantRecords.length + " sentences " + aSentences.sentences.length);
    if (process.env.ABOT_FAST && categorySet) {
        // we are only interested in categories present in records for domains which contain the category
        // var categoryset = Model.calculateRelevantRecordCategories(theModel,category);
        //knowing the target
        perflog("got categoryset with " + Object.keys(categorySet).length);
        var obj = {
            fl: 0,
            lf: 0
        };
        var aSimplifiedSentences = makeSimplifiedSentencesCategorySet(aSentences, categorySet, obj);
        /*aSentences.sentences.map(function (oSentence) {
          var aDomains = [] as string[];
          var rWords = oSentence.filter(function (oWord) {
            if (oWord.category === "domain") {
              aDomains.push(oWord.matchedString);
              return false;
            }
            if (oWord.category === "meta") {
              // e.g. domain XXX
              return false;
            }
            return !!categorySet[oWord.category];
          });
          fl = fl + oSentence.length;
          lf = lf + rWords.length;
          return {
            domains: aDomains,
            oSentence: oSentence,
            cntRelevantWords: rWords.length,
            rWords: rWords
          };
        });
        */
        perflog("post simplify (r=" + relevantRecords.length + " s=" + aSentences.sentences.length + " fl " + obj.fl + "->" + obj.lf + ")");
    } else {
        var track = {
            fl: 0,
            lf: 0
        };
        var domains = [];
        var aSimplifiedSentences = makeSimplifiedSentences(aSentences, track);
        /*
        .sentences.map(function (oSentence) {
          console.log("here sentence" + Sentence.dumpNice(oSentence));
          var rWords = oSentence.filter(function (oWord) {
            if (oWord.category === "domain") {
              console.log("GOT A DOMAIN!" + oWord.matchedString);
              domains.push(oWord.matchedString);
              return false;
            }
            if (oWord.category === "meta") {
              // e.g. domain XXX
              return false;
            }
            return !Word.Word.isFiller(oWord);
          });
          fl = fl + oSentence.length;
          lf = lf + rWords.length;
          return {
            oSentence: oSentence,
            domains: domains,
            cntRelevantWords: rWords.length,
            rWords: rWords
          };
        });
        */
        perflog("post simplify (r=" + relevantRecords.length + " s=" + aSentences.sentences.length + " fl " + track.fl + "->" + track.lf + ")");
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
                    } else {
                        ++mismatched;
                    }
                } else {
                    if (oWord.category !== "category") {
                        nouse += 1;
                    } else {
                        if (!record[oWord.matchedString]) {
                            missingcat += 1;
                        }
                    }
                }
            });
            if (aSentence.domains.length) {
                if (record._domain !== aSentence.domains[0]) {
                    mismatched = 3000;
                } else {
                    matched += 1;
                }
            }
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
                    _ranking: calcRankingSimple(matched, mismatched, nouse + missingcat, aSentence.cntRelevantWords)
                });
            }
        });
    });
    perflog("sort (a=" + res.length + ")");
    res.sort(cmpByResultThenRanking);
    perflog("filterRetain ...");
    var result2 = Object.assign({ answers: res }, aSentences);
    var result = filterRetainTopRankedResult(result2);
    debuglog("matchRecordsQuick done: (r=" + relevantRecords.length + " s=" + aSentences.sentences.length + " a=" + result.answers.length + ")");
    perflog("matchRecordsQuick done: (r=" + relevantRecords.length + " s=" + aSentences.sentences.length + " a=" + result.answers.length + ")");
    return result;
}
exports.matchRecordsQuick = matchRecordsQuick;
function extractResult(categories, record) {
    return categories.map(function (category) {
        return record[category] || "n/a";
    });
}
function matchRecordsQuickMultipleCategories(pSentences, categories, records, categorySet) {
    // if (debuglog.enabled) {
    //  debuglog(JSON.stringify(records, undefined, 2));
    // }
    Object.freeze(categorySet);
    var categoryF = categories[0];
    debuglog("matchRecordsQuickMultipleCategories (r=" + records.length + " s=" + pSentences.sentences.length + ")\n categories:" + categories.join("\n"));
    perflog("matchRecordsQuickMult ...(r=" + records.length + " s=" + pSentences.sentences.length + ")");
    var relevantRecords = records.filter(function (record) {
        return record[categoryF] !== undefined && record[categoryF] !== null;
    });
    var res = [];
    debuglog("relevant records with first (r=" + relevantRecords.length + ")");
    perflog("relevant records with first nr:" + relevantRecords.length + " sentences " + pSentences.sentences.length);
    if (process.env.ABOT_FAST && categorySet) {
        // we are only interested in categories present in records for domains which contain the category
        // var categoryset = Model.calculateRelevantRecordCategories(theModel,category);
        //knowing the target
        perflog("got categoryset with " + Object.keys(categorySet).length);
        var obj = { fl: 0, lf: 0 };
        var aSimplifiedSentences = makeSimplifiedSentencesCategorySet(pSentences, categorySet, obj);
        perflog("post simplify (r=" + relevantRecords.length + " s=" + pSentences.sentences.length + " fl " + obj.fl + "->" + obj.lf + ")");
    } else {
        debuglog("not abot_fast !");
        var track = { fl: 0, lf: 0 };
        var aSimplifiedSentences = makeSimplifiedSentences(pSentences, track);
        /*
            pSentences.sentences.map(function (oSentence) {
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
            */
        debuglog("post simplify (r=" + relevantRecords.length + " s=" + pSentences.sentences.length + " fl " + track.fl + "->" + track.lf + ")");
        perflog("post simplify (r=" + relevantRecords.length + " s=" + pSentences.sentences.length + " fl " + track.fl + "->" + track.lf + ")");
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
                    } else {
                        ++mismatched;
                    }
                } else {
                    if (oWord.category !== "category") {
                        nouse += 1;
                    } else {
                        if (!record[oWord.matchedString]) {
                            missingcat += 1;
                        }
                    }
                }
            });
            if (aSentence.domains.length) {
                if (record._domain !== aSentence.domains[0]) {
                    mismatched = 3000;
                } else {
                    matched += 1;
                }
            }
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
                    _ranking: calcRankingSimple(matched, mismatched, nouse + missingcat, aSentence.cntRelevantWords)
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
    var result1 = Object.assign({ tupelanswers: res }, pSentences);
    var result2 = filterRetainTopRankedResultTupel(result1);
    perflog("matchRecordsQuick done: (r=" + relevantRecords.length + " s=" + pSentences.sentences.length + " a=" + res.length + ")");
    return result2;
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
function analyzeCategoryMultOnlyAndComma(categorylist, rules, wholesentence) {
    var rtrimmed = splitAtCommaAnd(categorylist);
    var rcat = rtrimmed.map(function (o) {
        return analyzeCategory(o, rules, wholesentence);
    });
    if (rcat.indexOf(undefined) >= 0) {
        throw new Error('"' + rtrimmed[rcat.indexOf(undefined)] + '" is not a category!');
    }
    return rcat;
}
exports.analyzeCategoryMultOnlyAndComma = analyzeCategoryMultOnlyAndComma;
function filterAcceptingOnly(res, categories) {
    return res.filter(function (aSentence, iIndex) {
        return aSentence.every(function (oWord) {
            return categories.indexOf(oWord.category) >= 0;
        });
    });
}
exports.filterAcceptingOnly = filterAcceptingOnly;
var Erbase = require("./erbase");
var sWords = {};
function resetCache() {
    sWords = {};
}
exports.resetCache = resetCache;
function processString(query, rules) {
    if (!process.env.ABOT_OLDMATCH) {
        return Erbase.processString(query, rules, rules.wordCache);
    }
    var matched = InputFilter.analyzeString(query, rules, sWords);
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
    return {
        errors: [],
        sentences: aSentencesReinforced
    };
}
exports.processString = processString;
function analyzeContextString(contextQueryString, rules) {
    var aSentencesReinforced = processString(contextQueryString, rules);
    // we limit analysis to n sentences
    aSentencesReinforced.sentences = aSentencesReinforced.sentences.slice(0, Algol.Cutoff_Sentences);
    if (debuglog.enabled) {
        debuglog("after reinforce and cutoff" + aSentencesReinforced.sentences.length + "\n" + aSentencesReinforced.sentences.map(function (oSentence) {
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
    var res2 = filterAcceptingOnly(res.sentences, ["category", "filler"]);
    //  console.log("here res2" + JSON.stringify(res2) );
    //  console.log("here undefined ! + " + res2.filter(o => !o).length);
    res2.sort(Sentence.cmpRankingProduct);
    debuglog("resulting category sentences: \n", debuglog.enabled ? Sentence.dumpNiceArr(res2.slice(0, 3), Sentence.rankingProduct) : '-');
    // TODO:   res2 = filterAcceptingOnlySameDomain(res2);
    //debuglog("resulting category sentences", JSON.stringify(res2, undefined, 2));
    // expect only categories
    // we could rank now by common domains , but for now we only take the first one
    if (!res2.length) {
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
var ErError = require("./ererror");
var ListAll = require("./listall");
// const result = WhatIs.resolveCategory(cat, a1.entity,
//   theModel.mRules, theModel.tools, theModel.records);
function resolveCategory(category, contextQueryString, rules, records) {
    if (contextQueryString.length === 0) {
        return { errors: [ErError.makeError_EMPTY_INPUT()], tokens: [], answers: [] };
    } else {
        /*
            var matched = InputFilter.analyzeString(contextQueryString, rules);
            debuglog(debuglog.enabled ? ("after matched " + JSON.stringify(matched)): '-');
            var aSentences = InputFilter.expandMatchArr(matched);
            if(debuglog.enabled) {
              debuglog("after expand" + aSentences.map(function (oSentence) {
                return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
              }).join("\n"));
          } */
        // var categorySet = Model.getAllRecordCategoriesForTargetCategory(theModel, cat, true);
        var res = ListAll.listAllWithContext(category, contextQueryString, rules, records);
        //* sort by sentence
        res.answers.forEach(function (o) {
            o._ranking = o._ranking * Sentence.rankingProduct(o.sentence);
        });
        res.answers.sort(cmpByRanking);
        return res;
    }
}
exports.resolveCategory = resolveCategory;
function resolveCategories(categories, contextQueryString, theModel) {
    var records = theModel.records;
    var rules = theModel.rules;
    if (contextQueryString.length === 0) {
        return {
            errors: [ErError.makeError_EMPTY_INPUT()],
            tupelanswers: [],
            tokens: []
        };
    } else {
        // var categorySet = Model.getAllRecordCategoriesForTargetCategory(theModel, cat, true);
        var res = ListAll.listAllTupelWithContext(categories, contextQueryString, rules, records);
        //* sort by sentence
        res.tupelanswers.forEach(function (o) {
            o._ranking = o._ranking * Sentence.rankingProduct(o.sentence);
        });
        res.tupelanswers.sort(cmpByRankingTupel);
        return res;
    }
}
exports.resolveCategories = resolveCategories;
/*
export function resolveCategoriesOld(categories: string[], contextQueryString: string,
  theModel: IMatch.IModels): IMatch.IProcessedWhatIsTupelAnswers {
  var records = theModel.records;
  var rules = theModel.rules;
  if (contextQueryString.length === 0) {
    return {
      errors: [ErError.makeError_EMPTY_INPUT()],
      tupelanswers: [],
      tokens: []
    }
  } else {
    var aSentencesReinforced = processString(contextQueryString, theModel.rules);
    //aSentences.map(function(oSentence) { return InputFilter.reinForce(oSentence); });
    debuglog(debuglog.enabled ? ("after reinforce" + aSentencesReinforced.sentences.map(function (oSentence) {
      return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
    }).join("\n")) : '-');
    //var matchedAnswers = matchRecordsQuick(aSentences, category, records); //aTool: Array<IMatch.ITool>): any / * objectstream* / {
    var categorySet = {};
    categories.forEach(function (category) {
      categorySet[category] = true;
      var categorySetLocal = Model.getAllRecordCategoriesForTargetCategory(theModel, category, true);
      Object.assign(categorySet, categorySetLocal);
    });

    var matchedAnswers = matchRecordsQuickMultipleCategories(aSentencesReinforced, categories, records, categorySet); //aTool: Array<IMatch.ITool>): any / * objectstream * / {
    if (debuglog.enabled) {
      debuglog(" matched Answers" + JSON.stringify(matchedAnswers, undefined, 2));
    }
    perflog("filtering topRanked (a=" + matchedAnswers.tupelanswers.length + ")...");
    var matchedFiltered = Object.assign({}, matchedAnswers);
    matchedFiltered.tupelanswers = filterOnlyTopRankedTupel(matchedAnswers.tupelanswers);

    if (debuglog.enabled) {
      debuglog(" matched top-ranked Answers" + JSON.stringify(matchedFiltered, undefined, 2));
    }
    perflog("totalWhatisWithContext (a=" + matchedFiltered.tupelanswers.length + ")");
    return matchedFiltered; // ??? Answers;
  }
}
*/
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
            if (category.charAt(0) !== '_' && category !== results[0].category && results[0].record[category] !== results[1].record[category]) {
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
            if (category.charAt(0) !== '_' && results[0].categories.indexOf(category) < 0 && results[0].record[category] !== results[1].record[category]) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC93aGF0aXMudHMiLCJtYXRjaC93aGF0aXMuanMiXSwibmFtZXMiOlsiSW5wdXRGaWx0ZXIiLCJyZXF1aXJlIiwiZGVidWciLCJkZWJ1Z2xvZyIsImRlYnVnbG9nViIsInBlcmZsb2ciLCJfIiwiU2VudGVuY2UiLCJXb3JkIiwiQWxnb2wiLCJjbXBCeVJlc3VsdFRoZW5SYW5raW5nIiwiYSIsImIiLCJjbXAiLCJyZXN1bHQiLCJsb2NhbGVDb21wYXJlIiwiX3JhbmtpbmciLCJleHBvcnRzIiwibG9jYWxlQ29tcGFyZUFycnMiLCJhYXJlc3VsdCIsImJicmVzdWx0IiwiYmxlbiIsImxlbmd0aCIsImV2ZXJ5IiwiaW5kZXgiLCJjbXBCeVJlc3VsdFRoZW5SYW5raW5nVHVwZWwiLCJhYSIsImJiIiwiY21wQnlSYW5raW5nQXNjZW5kaW5nIiwia2V5cyIsIk9iamVjdCIsInJlY29yZCIsImNvbmNhdCIsInNvcnQiLCJyZXMiLCJyZWR1Y2UiLCJwcmV2Iiwic0tleSIsImNtcEJ5UmFua2luZyIsImNtcEJ5UmFua2luZ1R1cGVsIiwiZHVtcE5pY2UiLCJhbnN3ZXIiLCJzIiwicHVzaCIsImNhdGVnb3J5IiwiZm9yRWFjaCIsInNSZXF1aXJlcyIsImNoYXJBdCIsIm9TZW50ZW5jZSIsInNlbnRlbmNlIiwib1dvcmQiLCJzV29yZCIsInN0cmluZyIsIm1hdGNoZWRTdHJpbmciLCJkdW1wTmljZVR1cGVsIiwiY2F0ZWdvcmllcyIsImpvaW4iLCJkdW1wV2VpZ2h0c1RvcCIsInRvb2xtYXRjaGVzIiwib3B0aW9ucyIsIm9NYXRjaCIsInRvcCIsImZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdCIsImFuc3dlcnMiLCJmaWx0ZXIiLCJpUmVzIiwiZW5hYmxlZCIsIkpTT04iLCJzdHJpbmdpZnkiLCJhc3NpZ24iLCJmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHRUdXBlbCIsInR1cGVsYW5zd2VycyIsImlzRXF1YWwiLCJNYXRjaCIsImNhbGNSYW5raW5nIiwibWF0Y2hlZCIsIm1pc21hdGNoZWQiLCJyZWxldmFudENvdW50IiwibGVuTWF0Y2hlZCIsImZhY3RvciIsImNhbGNSYW5raW5nUHJvZHVjdCIsIk1hdGgiLCJwb3ciLCJsZW5NaXNNYXRjaGVkIiwiZmFjdG9yMiIsImNhbGNSYW5raW5nU2ltcGxlIiwibm91c2UiLCJmYWN0b3IzIiwiY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeSIsImhhc0NhdGVnb3J5IiwibGVuSGFzQ2F0ZWdvcnkiLCJmYWN0b3JIIiwibWF0Y2hSZWNvcmRzSGF2aW5nQ29udGV4dCIsInBTZW50ZW5jZXMiLCJyZWNvcmRzIiwiY2F0ZWdvcnlTZXQiLCJyZWxldmFudFJlY29yZHMiLCJ1bmRlZmluZWQiLCJwcm9jZXNzIiwiZW52IiwiQUJPVF9GQVNUIiwiZmwiLCJsZiIsImFTaW1wbGlmaWVkU2VudGVuY2VzIiwic2VudGVuY2VzIiwibWFwIiwiZldvcmRzIiwiaXNGaWxsZXIiLCJyV29yZHMiLCJpc0NhdGVnb3J5IiwiY250UmVsZXZhbnRXb3JkcyIsImZyZWV6ZSIsImFTZW50ZW5jZSIsIm1hdGNoUmVjb3Jkc1R1cGVsSGF2aW5nQ29udGV4dCIsImNhdGVnb3J5RiIsImV4dHJhY3RSZXN1bHQiLCJyZXN1bHQxIiwibWF0Y2hSZWNvcmRzIiwiYVNlbnRlbmNlcyIsIm1ha2VTaW1wbGlmaWVkU2VudGVuY2VzQ2F0ZWdvcnlTZXQiLCJ0cmFjayIsImFEb21haW5zIiwiZG9tYWlucyIsIm1ha2VTaW1wbGlmaWVkU2VudGVuY2VzIiwibWF0Y2hSZWNvcmRzUXVpY2siLCJvYmoiLCJtaXNzaW5nY2F0IiwiX2RvbWFpbiIsInJlc3VsdDIiLCJtYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcyIsInJlYyIsImNsYXNzaWZ5V29yZFdpdGhUYXJnZXRDYXRlZ29yeSIsIndvcmQiLCJ0YXJnZXRjYXRlZ29yeSIsInJ1bGVzIiwid2hvbGVzZW50ZW5jZSIsImNhdHMiLCJjYXRlZ29yaXplQVdvcmQiLCJjYXQiLCJhbmFseXplQ2F0ZWdvcnkiLCJjYXRlZ29yeXdvcmQiLCJzcGxpdEF0Q29tbWFBbmQiLCJzdHIiLCJyIiwic3BsaXQiLCJvIiwicnRyaW1tZWQiLCJTdHJpbmciLCJ0cmltIiwiYW5hbHl6ZUNhdGVnb3J5TXVsdE9ubHlBbmRDb21tYSIsImNhdGVnb3J5bGlzdCIsInJjYXQiLCJpbmRleE9mIiwiRXJyb3IiLCJmaWx0ZXJBY2NlcHRpbmdPbmx5IiwiaUluZGV4IiwiRXJiYXNlIiwic1dvcmRzIiwicmVzZXRDYWNoZSIsInByb2Nlc3NTdHJpbmciLCJxdWVyeSIsIkFCT1RfT0xETUFUQ0giLCJ3b3JkQ2FjaGUiLCJhbmFseXplU3RyaW5nIiwiZXhwYW5kTWF0Y2hBcnIiLCJyYW5raW5nUHJvZHVjdCIsImFTZW50ZW5jZXNSZWluZm9yY2VkIiwicmVpbkZvcmNlIiwiZXJyb3JzIiwiYW5hbHl6ZUNvbnRleHRTdHJpbmciLCJjb250ZXh0UXVlcnlTdHJpbmciLCJzbGljZSIsIkN1dG9mZl9TZW50ZW5jZXMiLCJjbXBCeU5yQ2F0ZWdvcmllc0FuZFNhbWVEb21haW4iLCJjbnRhIiwiZ2V0RGlzdGluY3RDYXRlZ29yaWVzSW5TZW50ZW5jZSIsImNudGIiLCJhbmFseXplQ2F0ZWdvcnlNdWx0IiwiZ1dvcmRzIiwicmVzMiIsImNtcFJhbmtpbmdQcm9kdWN0IiwiZHVtcE5pY2VBcnIiLCJyZXNjYXQiLCJhbmFseXplT3BlcmF0b3IiLCJvcHdvcmQiLCJFckVycm9yIiwiTGlzdEFsbCIsInJlc29sdmVDYXRlZ29yeSIsIm1ha2VFcnJvcl9FTVBUWV9JTlBVVCIsInRva2VucyIsImxpc3RBbGxXaXRoQ29udGV4dCIsInJlc29sdmVDYXRlZ29yaWVzIiwidGhlTW9kZWwiLCJsaXN0QWxsVHVwZWxXaXRoQ29udGV4dCIsImZpbHRlck9ubHlUb3BSYW5rZWQiLCJyZXN1bHRzIiwiZmlsdGVyT25seVRvcFJhbmtlZFR1cGVsIiwiaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdCIsImNudCIsImRpc2NyaW1pbmF0aW5nIiwiaXNJbmRp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c0csd0JBQTdHO0FBQ0Q7QUFDRCxlQUFPLCtDQUFQO0FBQ0Q7QUFDRCxXQUFPeUMsU0FBUDtBQUNEO0FBckJEaEYsUUFBQXVMLDJCQUFBLEdBQUFBLDJCQUFBIiwiZmlsZSI6Im1hdGNoL3doYXRpcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICpcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmFuYWx5emVcbiAqIEBmaWxlIGFuYWx5emUudHNcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cbiAqL1xuXG5cbmltcG9ydCAqIGFzIElucHV0RmlsdGVyIGZyb20gJy4vaW5wdXRGaWx0ZXInO1xuXG5pbXBvcnQgKiBhcyBkZWJ1ZyBmcm9tICdkZWJ1Zyc7XG5cbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ3doYXRpcycpO1xuY29uc3QgZGVidWdsb2dWID0gZGVidWcoJ3doYXRWaXMnKTtcbmNvbnN0IHBlcmZsb2cgPSBkZWJ1ZygncGVyZicpO1xuXG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuLi91dGlscy91dGlscyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5cbmltcG9ydCAqIGFzIElNYXRjaCBmcm9tICcuL2lmbWF0Y2gnO1xuXG5pbXBvcnQgKiBhcyBUb29sbWF0Y2hlciBmcm9tICcuL3Rvb2xtYXRjaGVyJztcblxuaW1wb3J0ICogYXMgU2VudGVuY2UgZnJvbSAnLi9zZW50ZW5jZSc7XG5cbmltcG9ydCAqIGFzIFdvcmQgZnJvbSAnLi93b3JkJztcblxuaW1wb3J0ICogYXMgQWxnb2wgZnJvbSAnLi9hbGdvbCc7XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGNtcEJ5UmVzdWx0VGhlblJhbmtpbmcoYTogSU1hdGNoLklXaGF0SXNBbnN3ZXIsIGI6IElNYXRjaC5JV2hhdElzQW5zd2VyKSB7XG4gIHZhciBjbXAgPSBhLnJlc3VsdC5sb2NhbGVDb21wYXJlKGIucmVzdWx0KTtcbiAgaWYgKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cbiAgcmV0dXJuIC0oYS5fcmFua2luZyAtIGIuX3JhbmtpbmcpO1xufVxuXG5mdW5jdGlvbiBsb2NhbGVDb21wYXJlQXJycyhhYXJlc3VsdDogc3RyaW5nW10sIGJicmVzdWx0OiBzdHJpbmdbXSk6IG51bWJlciB7XG4gIHZhciBjbXAgPSAwO1xuICB2YXIgYmxlbiA9IGJicmVzdWx0Lmxlbmd0aDtcbiAgYWFyZXN1bHQuZXZlcnkoZnVuY3Rpb24gKGEsIGluZGV4KSB7XG4gICAgaWYgKGJsZW4gPD0gaW5kZXgpIHtcbiAgICAgIGNtcCA9IC0xO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBjbXAgPSBhLmxvY2FsZUNvbXBhcmUoYmJyZXN1bHRbaW5kZXhdKTtcbiAgICBpZiAoY21wKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9KTtcbiAgaWYgKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cbiAgaWYgKGJsZW4gPiBhYXJlc3VsdC5sZW5ndGgpIHtcbiAgICBjbXAgPSArMTtcbiAgfVxuICByZXR1cm4gMDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbChhYTogSU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlciwgYmI6IElNYXRjaC5JV2hhdElzVHVwZWxBbnN3ZXIpIHtcbiAgdmFyIGNtcCA9IGxvY2FsZUNvbXBhcmVBcnJzKGFhLnJlc3VsdCwgYmIucmVzdWx0KTtcbiAgaWYgKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cbiAgcmV0dXJuIC0oYWEuX3JhbmtpbmcgLSBiYi5fcmFua2luZyk7XG59XG5cblxuXG5leHBvcnQgZnVuY3Rpb24gY21wQnlSYW5raW5nQXNjZW5kaW5nKGE6IElNYXRjaC5JV2hhdElzQW5zd2VyLCBiOiBJTWF0Y2guSVdoYXRJc0Fuc3dlcikge1xuICB2YXIgY21wID0gKGEuX3JhbmtpbmcgLSBiLl9yYW5raW5nKTtcbiAgaWYgKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cbiAgY21wID0gYS5yZXN1bHQubG9jYWxlQ29tcGFyZShiLnJlc3VsdCk7XG4gIGlmIChjbXApIHtcbiAgICByZXR1cm4gY21wO1xuICB9XG5cbiAgLy8gYXJlIHJlY29yZHMgZGlmZmVyZW50P1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGEucmVjb3JkKS5jb25jYXQoT2JqZWN0LmtleXMoYi5yZWNvcmQpKS5zb3J0KCk7XG4gIHZhciByZXMgPSBrZXlzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgc0tleSkge1xuICAgIGlmIChwcmV2KSB7XG4gICAgICByZXR1cm4gcHJldjtcbiAgICB9XG4gICAgaWYgKGIucmVjb3JkW3NLZXldICE9PSBhLnJlY29yZFtzS2V5XSkge1xuICAgICAgaWYgKCFiLnJlY29yZFtzS2V5XSkge1xuICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgICBpZiAoIWEucmVjb3JkW3NLZXldKSB7XG4gICAgICAgIHJldHVybiArMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhLnJlY29yZFtzS2V5XS5sb2NhbGVDb21wYXJlKGIucmVjb3JkW3NLZXldKTtcbiAgICB9XG4gICAgcmV0dXJuIDA7XG4gIH0sIDApO1xuICByZXR1cm4gcmVzO1xufVxuXG5cblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBjbXBCeVJhbmtpbmcoYTogSU1hdGNoLklXaGF0SXNBbnN3ZXIsIGI6IElNYXRjaC5JV2hhdElzQW5zd2VyKSB7XG4gIHZhciBjbXAgPSAtKGEuX3JhbmtpbmcgLSBiLl9yYW5raW5nKTtcbiAgaWYgKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cbiAgY21wID0gYS5yZXN1bHQubG9jYWxlQ29tcGFyZShiLnJlc3VsdCk7XG4gIGlmIChjbXApIHtcbiAgICByZXR1cm4gY21wO1xuICB9XG5cbiAgLy8gYXJlIHJlY29yZHMgZGlmZmVyZW50P1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGEucmVjb3JkKS5jb25jYXQoT2JqZWN0LmtleXMoYi5yZWNvcmQpKS5zb3J0KCk7XG4gIHZhciByZXMgPSBrZXlzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgc0tleSkge1xuICAgIGlmIChwcmV2KSB7XG4gICAgICByZXR1cm4gcHJldjtcbiAgICB9XG4gICAgaWYgKGIucmVjb3JkW3NLZXldICE9PSBhLnJlY29yZFtzS2V5XSkge1xuICAgICAgaWYgKCFiLnJlY29yZFtzS2V5XSkge1xuICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgICBpZiAoIWEucmVjb3JkW3NLZXldKSB7XG4gICAgICAgIHJldHVybiArMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhLnJlY29yZFtzS2V5XS5sb2NhbGVDb21wYXJlKGIucmVjb3JkW3NLZXldKTtcbiAgICB9XG4gICAgcmV0dXJuIDA7XG4gIH0sIDApO1xuICByZXR1cm4gcmVzO1xufVxuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGNtcEJ5UmFua2luZ1R1cGVsKGE6IElNYXRjaC5JV2hhdElzVHVwZWxBbnN3ZXIsIGI6IElNYXRjaC5JV2hhdElzVHVwZWxBbnN3ZXIpIHtcbiAgdmFyIGNtcCA9IC0oYS5fcmFua2luZyAtIGIuX3JhbmtpbmcpO1xuICBpZiAoY21wKSB7XG4gICAgcmV0dXJuIGNtcDtcbiAgfVxuICBjbXAgPSBsb2NhbGVDb21wYXJlQXJycyhhLnJlc3VsdCwgYi5yZXN1bHQpO1xuICBpZiAoY21wKSB7XG4gICAgcmV0dXJuIGNtcDtcbiAgfVxuICAvLyBhcmUgcmVjb3JkcyBkaWZmZXJlbnQ/XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYS5yZWNvcmQpLmNvbmNhdChPYmplY3Qua2V5cyhiLnJlY29yZCkpLnNvcnQoKTtcbiAgdmFyIHJlcyA9IGtleXMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBzS2V5KSB7XG4gICAgaWYgKHByZXYpIHtcbiAgICAgIHJldHVybiBwcmV2O1xuICAgIH1cbiAgICBpZiAoYi5yZWNvcmRbc0tleV0gIT09IGEucmVjb3JkW3NLZXldKSB7XG4gICAgICBpZiAoIWIucmVjb3JkW3NLZXldKSB7XG4gICAgICAgIHJldHVybiAtMTtcbiAgICAgIH1cbiAgICAgIGlmICghYS5yZWNvcmRbc0tleV0pIHtcbiAgICAgICAgcmV0dXJuICsxO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGEucmVjb3JkW3NLZXldLmxvY2FsZUNvbXBhcmUoYi5yZWNvcmRbc0tleV0pO1xuICAgIH1cbiAgICByZXR1cm4gMDtcbiAgfSwgMCk7XG4gIHJldHVybiByZXM7XG59XG5cblxuXG5leHBvcnQgZnVuY3Rpb24gZHVtcE5pY2UoYW5zd2VyOiBJTWF0Y2guSVdoYXRJc0Fuc3dlcikge1xuICB2YXIgcmVzdWx0ID0ge1xuICAgIHM6IFwiXCIsXG4gICAgcHVzaDogZnVuY3Rpb24gKHMpIHsgdGhpcy5zID0gdGhpcy5zICsgczsgfVxuICB9O1xuICB2YXIgcyA9XG4gICAgYCoqUmVzdWx0IGZvciBjYXRlZ29yeTogJHthbnN3ZXIuY2F0ZWdvcnl9IGlzICR7YW5zd2VyLnJlc3VsdH1cbiByYW5rOiAke2Fuc3dlci5fcmFua2luZ31cbmA7XG4gIHJlc3VsdC5wdXNoKHMpO1xuICBPYmplY3Qua2V5cyhhbnN3ZXIucmVjb3JkKS5mb3JFYWNoKGZ1bmN0aW9uIChzUmVxdWlyZXMsIGluZGV4KSB7XG4gICAgaWYgKHNSZXF1aXJlcy5jaGFyQXQoMCkgIT09ICdfJykge1xuICAgICAgcmVzdWx0LnB1c2goYHJlY29yZDogJHtzUmVxdWlyZXN9IC0+ICR7YW5zd2VyLnJlY29yZFtzUmVxdWlyZXNdfWApO1xuICAgIH1cbiAgICByZXN1bHQucHVzaCgnXFxuJyk7XG4gIH0pO1xuICB2YXIgb1NlbnRlbmNlID0gYW5zd2VyLnNlbnRlbmNlO1xuICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGluZGV4KSB7XG4gICAgdmFyIHNXb3JkID0gYFske2luZGV4fV0gOiAke29Xb3JkLmNhdGVnb3J5fSBcIiR7b1dvcmQuc3RyaW5nfVwiID0+IFwiJHtvV29yZC5tYXRjaGVkU3RyaW5nfVwiYFxuICAgIHJlc3VsdC5wdXNoKHNXb3JkICsgXCJcXG5cIik7XG4gIH0pXG4gIHJlc3VsdC5wdXNoKFwiLlxcblwiKTtcbiAgcmV0dXJuIHJlc3VsdC5zO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGR1bXBOaWNlVHVwZWwoYW5zd2VyOiBJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyKSB7XG4gIHZhciByZXN1bHQgPSB7XG4gICAgczogXCJcIixcbiAgICBwdXNoOiBmdW5jdGlvbiAocykgeyB0aGlzLnMgPSB0aGlzLnMgKyBzOyB9XG4gIH07XG4gIHZhciBzID1cbiAgICBgKipSZXN1bHQgZm9yIGNhdGVnb3JpZXM6ICR7YW5zd2VyLmNhdGVnb3JpZXMuam9pbihcIjtcIil9IGlzICR7YW5zd2VyLnJlc3VsdH1cbiByYW5rOiAke2Fuc3dlci5fcmFua2luZ31cbmA7XG4gIHJlc3VsdC5wdXNoKHMpO1xuICBPYmplY3Qua2V5cyhhbnN3ZXIucmVjb3JkKS5mb3JFYWNoKGZ1bmN0aW9uIChzUmVxdWlyZXMsIGluZGV4KSB7XG4gICAgaWYgKHNSZXF1aXJlcy5jaGFyQXQoMCkgIT09ICdfJykge1xuICAgICAgcmVzdWx0LnB1c2goYHJlY29yZDogJHtzUmVxdWlyZXN9IC0+ICR7YW5zd2VyLnJlY29yZFtzUmVxdWlyZXNdfWApO1xuICAgIH1cbiAgICByZXN1bHQucHVzaCgnXFxuJyk7XG4gIH0pO1xuICB2YXIgb1NlbnRlbmNlID0gYW5zd2VyLnNlbnRlbmNlO1xuICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGluZGV4KSB7XG4gICAgdmFyIHNXb3JkID0gYFske2luZGV4fV0gOiAke29Xb3JkLmNhdGVnb3J5fSBcIiR7b1dvcmQuc3RyaW5nfVwiID0+IFwiJHtvV29yZC5tYXRjaGVkU3RyaW5nfVwiYFxuICAgIHJlc3VsdC5wdXNoKHNXb3JkICsgXCJcXG5cIik7XG4gIH0pXG4gIHJlc3VsdC5wdXNoKFwiLlxcblwiKTtcbiAgcmV0dXJuIHJlc3VsdC5zO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBkdW1wV2VpZ2h0c1RvcCh0b29sbWF0Y2hlczogQXJyYXk8SU1hdGNoLklXaGF0SXNBbnN3ZXI+LCBvcHRpb25zOiBhbnkpIHtcbiAgdmFyIHMgPSAnJztcbiAgdG9vbG1hdGNoZXMuZm9yRWFjaChmdW5jdGlvbiAob01hdGNoLCBpbmRleCkge1xuICAgIGlmIChpbmRleCA8IG9wdGlvbnMudG9wKSB7XG4gICAgICBzID0gcyArIFwiV2hhdElzQW5zd2VyW1wiICsgaW5kZXggKyBcIl0uLi5cXG5cIjtcbiAgICAgIHMgPSBzICsgZHVtcE5pY2Uob01hdGNoKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdChyZXM6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzQW5zd2Vycyk6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzQW5zd2VycyB7XG4gIHZhciByZXN1bHQgPSByZXMuYW5zd2Vycy5maWx0ZXIoZnVuY3Rpb24gKGlSZXMsIGluZGV4KSB7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgIGRlYnVnbG9nKCdyZXRhaW4gdG9wUmFua2VkOiAnICsgaW5kZXggKyAnICcgKyBKU09OLnN0cmluZ2lmeShpUmVzKSk7XG4gICAgfVxuICAgIGlmIChpUmVzLnJlc3VsdCA9PT0gKHJlcy5hbnN3ZXJzW2luZGV4IC0gMV0gJiYgcmVzLmFuc3dlcnNbaW5kZXggLSAxXS5yZXN1bHQpKSB7XG4gICAgICBkZWJ1Z2xvZygnc2tpcCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG4gIHJlc3VsdC5zb3J0KGNtcEJ5UmFua2luZyk7XG4gIHZhciBhID0gT2JqZWN0LmFzc2lnbih7IGFuc3dlcnM6IHJlc3VsdCB9LCByZXMsIHsgYW5zd2VyczogcmVzdWx0IH0pO1xuICBhLmFuc3dlcnMgPSByZXN1bHQ7XG4gIHJldHVybiBhO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0VHVwZWwocmVzOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc1R1cGVsQW5zd2Vycyk6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzVHVwZWxBbnN3ZXJzIHtcbiAgdmFyIHJlc3VsdCA9IHJlcy50dXBlbGFuc3dlcnMuZmlsdGVyKGZ1bmN0aW9uIChpUmVzLCBpbmRleCkge1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICBkZWJ1Z2xvZygnIHJldGFpbiB0dXBlbCAnICsgaW5kZXggKyAnICcgKyBKU09OLnN0cmluZ2lmeShpUmVzKSk7XG4gICAgfVxuICAgIGlmIChfLmlzRXF1YWwoaVJlcy5yZXN1bHQsIHJlcy50dXBlbGFuc3dlcnNbaW5kZXggLSAxXSAmJiByZXMudHVwZWxhbnN3ZXJzW2luZGV4IC0gMV0ucmVzdWx0KSkge1xuICAgICAgZGVidWdsb2coJ3NraXAnKTtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG4gIHJlc3VsdC5zb3J0KGNtcEJ5UmFua2luZ1R1cGVsKTtcbiAgcmV0dXJuIE9iamVjdC5hc3NpZ24ocmVzLCB7IHR1cGVsYW5zd2VyczogcmVzdWx0IH0pO1xufVxuXG5cbmltcG9ydCAqIGFzIE1hdGNoIGZyb20gJy4vbWF0Y2gnO1xuXG5leHBvcnQgZnVuY3Rpb24gY2FsY1JhbmtpbmcobWF0Y2hlZDogeyBba2V5OiBzdHJpbmddOiBJTWF0Y2guSVdvcmQgfSxcbiAgbWlzbWF0Y2hlZDogeyBba2V5OiBzdHJpbmddOiBJTWF0Y2guSVdvcmQgfSwgcmVsZXZhbnRDb3VudDogbnVtYmVyKTogbnVtYmVyIHtcblxuICB2YXIgbGVuTWF0Y2hlZCA9IE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aDtcbiAgdmFyIGZhY3RvciA9IE1hdGNoLmNhbGNSYW5raW5nUHJvZHVjdChtYXRjaGVkKTtcbiAgZmFjdG9yICo9IE1hdGgucG93KDEuNSwgbGVuTWF0Y2hlZCk7XG5cbiAgdmFyIGxlbk1pc01hdGNoZWQgPSBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGg7XG4gIHZhciBmYWN0b3IyID0gTWF0Y2guY2FsY1JhbmtpbmdQcm9kdWN0KG1pc21hdGNoZWQpO1xuICBmYWN0b3IyICo9IE1hdGgucG93KDAuNCwgbGVuTWlzTWF0Y2hlZCk7XG5cbiAgcmV0dXJuIE1hdGgucG93KGZhY3RvcjIgKiBmYWN0b3IsIDEgLyAobGVuTWlzTWF0Y2hlZCArIGxlbk1hdGNoZWQpKTtcbn1cblxuLyoqXG4gKiBBIHJhbmtpbmcgd2hpY2ggaXMgcHVyZWx5IGJhc2VkIG9uIHRoZSBudW1iZXJzIG9mIG1hdGNoZWQgZW50aXRpZXMsXG4gKiBkaXNyZWdhcmRpbmcgZXhhY3RuZXNzIG9mIG1hdGNoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYWxjUmFua2luZ1NpbXBsZShtYXRjaGVkOiBudW1iZXIsXG4gIG1pc21hdGNoZWQ6IG51bWJlciwgbm91c2U6IG51bWJlcixcbiAgcmVsZXZhbnRDb3VudDogbnVtYmVyKTogbnVtYmVyIHtcbiAgLy8gMiA6IDBcbiAgLy8gMSA6IDBcbiAgdmFyIGZhY3RvciA9IG1hdGNoZWQgKiBNYXRoLnBvdygxLjUsIG1hdGNoZWQpICogTWF0aC5wb3coMS41LCBtYXRjaGVkKTtcbiAgdmFyIGZhY3RvcjIgPSBNYXRoLnBvdygwLjQsIG1pc21hdGNoZWQpO1xuICB2YXIgZmFjdG9yMyA9IE1hdGgucG93KDAuNCwgbm91c2UpO1xuICByZXR1cm4gTWF0aC5wb3coZmFjdG9yMiAqIGZhY3RvciAqIGZhY3RvcjMsIDEgLyAobWlzbWF0Y2hlZCArIG1hdGNoZWQgKyBub3VzZSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkOiB7IFtrZXk6IHN0cmluZ106IElNYXRjaC5JV29yZCB9LFxuICBoYXNDYXRlZ29yeTogeyBba2V5OiBzdHJpbmddOiBudW1iZXIgfSxcbiAgbWlzbWF0Y2hlZDogeyBba2V5OiBzdHJpbmddOiBJTWF0Y2guSVdvcmQgfSwgcmVsZXZhbnRDb3VudDogbnVtYmVyKTogbnVtYmVyIHtcblxuXG4gIHZhciBsZW5NYXRjaGVkID0gT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoO1xuICB2YXIgZmFjdG9yID0gTWF0Y2guY2FsY1JhbmtpbmdQcm9kdWN0KG1hdGNoZWQpO1xuICBmYWN0b3IgKj0gTWF0aC5wb3coMS41LCBsZW5NYXRjaGVkKTtcblxuICB2YXIgbGVuSGFzQ2F0ZWdvcnkgPSBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoO1xuICB2YXIgZmFjdG9ySCA9IE1hdGgucG93KDEuMSwgbGVuSGFzQ2F0ZWdvcnkpO1xuXG4gIHZhciBsZW5NaXNNYXRjaGVkID0gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoO1xuICB2YXIgZmFjdG9yMiA9IE1hdGNoLmNhbGNSYW5raW5nUHJvZHVjdChtaXNtYXRjaGVkKTtcbiAgZmFjdG9yMiAqPSBNYXRoLnBvdygwLjQsIGxlbk1pc01hdGNoZWQpO1xuXG4gIHJldHVybiBNYXRoLnBvdyhmYWN0b3IyICogZmFjdG9ySCAqIGZhY3RvciwgMSAvIChsZW5NaXNNYXRjaGVkICsgbGVuSGFzQ2F0ZWdvcnkgKyBsZW5NYXRjaGVkKSk7XG59XG5cbi8qKlxuICogbGlzdCBhbGwgdG9wIGxldmVsIHJhbmtpbmdzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFJlY29yZHNIYXZpbmdDb250ZXh0KFxuICBwU2VudGVuY2VzOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcywgY2F0ZWdvcnk6IHN0cmluZywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+LFxuICBjYXRlZ29yeVNldDogeyBba2V5OiBzdHJpbmddOiBib29sZWFuIH0pXG4gIDogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzIHtcblxuICAvL2RlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZHMsIHVuZGVmaW5lZCwgMikpO1xuICB2YXIgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZDogSU1hdGNoLklSZWNvcmQpIHtcbiAgICByZXR1cm4gKHJlY29yZFtjYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkgJiYgKHJlY29yZFtjYXRlZ29yeV0gIT09IG51bGwpO1xuICB9KTtcbiAgdmFyIHJlcyA9IFtdO1xuICBkZWJ1Z2xvZyhcIk1hdGNoUmVjb3Jkc0hhdmluZ0NvbnRleHQgOiByZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCk7XG4gIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJzZW50ZW5jZXMgYXJlIDogXCIgKyBKU09OLnN0cmluZ2lmeShwU2VudGVuY2VzLCB1bmRlZmluZWQsIDIpKSA6IFwiLVwiKTtcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImNhdGVnb3J5IFwiICsgY2F0ZWdvcnkgKyBcIiBhbmQgY2F0ZWdvcnlzZXQgaXM6IFwiICsgSlNPTi5zdHJpbmdpZnkoY2F0ZWdvcnlTZXQsIHVuZGVmaW5lZCwgMikpIDogXCItXCIpO1xuICBpZiAocHJvY2Vzcy5lbnYuQUJPVF9GQVNUICYmIGNhdGVnb3J5U2V0KSB7XG4gICAgLy8gd2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbiBjYXRlZ29yaWVzIHByZXNlbnQgaW4gcmVjb3JkcyBmb3IgZG9tYWlucyB3aGljaCBjb250YWluIHRoZSBjYXRlZ29yeVxuICAgIC8vIHZhciBjYXRlZ29yeXNldCA9IE1vZGVsLmNhbGN1bGF0ZVJlbGV2YW50UmVjb3JkQ2F0ZWdvcmllcyh0aGVNb2RlbCxjYXRlZ29yeSk7XG4gICAgLy9rbm93aW5nIHRoZSB0YXJnZXRcbiAgICBwZXJmbG9nKFwiZ290IGNhdGVnb3J5c2V0IHdpdGggXCIgKyBPYmplY3Qua2V5cyhjYXRlZ29yeVNldCkubGVuZ3RoKTtcbiAgICB2YXIgZmwgPSAwO1xuICAgIHZhciBsZiA9IDA7XG4gICAgdmFyIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gcFNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIHZhciBmV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICByZXR1cm4gIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCk7XG4gICAgICB9KTtcbiAgICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICByZXR1cm4gISFjYXRlZ29yeVNldFtvV29yZC5jYXRlZ29yeV0gfHwgV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpO1xuICAgICAgfSk7XG4gICAgICBmbCA9IGZsICsgb1NlbnRlbmNlLmxlbmd0aDtcbiAgICAgIGxmID0gbGYgKyByV29yZHMubGVuZ3RoO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsIC8vIG5vdCBhIGZpbGxlciAgLy8gdG8gYmUgY29tcGF0aWJsZSBpdCB3b3VsZCBiZSBmV29yZHNcbiAgICAgICAgcldvcmRzOiByV29yZHNcbiAgICAgIH07XG4gICAgfSk7XG4gICAgT2JqZWN0LmZyZWV6ZShhU2ltcGxpZmllZFNlbnRlbmNlcyk7XG4gICAgZGVidWdsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIGZsICsgXCItPlwiICsgbGYgKyBcIilcIik7XG4gICAgcGVyZmxvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgZmwgKyBcIi0+XCIgKyBsZiArIFwiKVwiKTtcbiAgICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICBhU2ltcGxpZmllZFNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgICAgdmFyIGhhc0NhdGVnb3J5ID0ge307XG4gICAgICAgIHZhciBtaXNtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gYVNlbnRlbmNlLmNudFJlbGV2YW50V29yZHM7XG4gICAgICAgIGFTZW50ZW5jZS5yV29yZHMuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgIG1hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpICYmIHJlY29yZFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgaGFzQ2F0ZWdvcnlbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSAxO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgICBpZiAoKE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aCArIE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5sZW5ndGgpID4gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoKSB7XG4gICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgc2VudGVuY2U6IGFTZW50ZW5jZS5vU2VudGVuY2UsXG4gICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICAgIHJlc3VsdDogcmVjb3JkW2NhdGVnb3J5XSxcbiAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0pO1xuICAgIGRlYnVnbG9nKFwiaGVyZSBpbiB3ZWlyZFwiKTtcbiAgfSBlbHNlIHtcbiAgICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICBwU2VudGVuY2VzLnNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgICAgdmFyIGhhc0NhdGVnb3J5ID0ge307XG4gICAgICAgIHZhciBtaXNtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gMDtcbiAgICAgICAgYVNlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgaWYgKCFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpKSB7XG4gICAgICAgICAgICBjbnRSZWxldmFudFdvcmRzID0gY250UmVsZXZhbnRXb3JkcyArIDE7XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKSAmJiByZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgICAgaGFzQ2F0ZWdvcnlbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICgoT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoICsgT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aCkgPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLFxuICAgICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgICByZXN1bHQ6IHJlY29yZFtjYXRlZ29yeV0sXG4gICAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KTtcbiAgfVxuICByZXMuc29ydChjbXBCeVJlc3VsdFRoZW5SYW5raW5nKTtcbiAgZGVidWdsb2coXCIgYWZ0ZXIgc29ydFwiICsgcmVzLmxlbmd0aCk7XG4gIHZhciByZXN1bHQgPSBPYmplY3QuYXNzaWduKHt9LCBwU2VudGVuY2VzLCB7IGFuc3dlcnM6IHJlcyB9KTtcbiAgcmV0dXJuIGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdChyZXN1bHQpO1xufVxuXG5cbi8qKlxuICogbGlzdCBhbGwgdG9wIGxldmVsIHJhbmtpbmdzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFJlY29yZHNUdXBlbEhhdmluZ0NvbnRleHQoXG4gIHBTZW50ZW5jZXM6IElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzLCBjYXRlZ29yaWVzOiBzdHJpbmdbXSwgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+LFxuICBjYXRlZ29yeVNldDogeyBba2V5OiBzdHJpbmddOiBib29sZWFuIH0pXG4gIDogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNUdXBlbEFuc3dlcnMge1xuICAvLyBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRzLCB1bmRlZmluZWQsIDIpKTtcbiAgdmFyIGNhdGVnb3J5RiA9IGNhdGVnb3JpZXNbMF07XG4gIHZhciByZWxldmFudFJlY29yZHMgPSByZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAocmVjb3JkOiBJTWF0Y2guSVJlY29yZCkge1xuICAgIHJldHVybiAocmVjb3JkW2NhdGVnb3J5Rl0gIT09IHVuZGVmaW5lZCkgJiYgKHJlY29yZFtjYXRlZ29yeUZdICE9PSBudWxsKTtcbiAgfSk7XG4gIHZhciByZXMgPSBbXSBhcyBJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyW107XG4gIGRlYnVnbG9nKFwicmVsZXZhbnQgcmVjb3JkcyBucjpcIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGgpO1xuICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwic2VudGVuY2VzIGFyZSA6IFwiICsgSlNPTi5zdHJpbmdpZnkocFNlbnRlbmNlcywgdW5kZWZpbmVkLCAyKSkgOiBcIi1cIik7XG4gIGlmIChwcm9jZXNzLmVudi5BQk9UX0ZBU1QgJiYgY2F0ZWdvcnlTZXQpIHtcbiAgICAvLyB3ZSBhcmUgb25seSBpbnRlcmVzdGVkIGluIGNhdGVnb3JpZXMgcHJlc2VudCBpbiByZWNvcmRzIGZvciBkb21haW5zIHdoaWNoIGNvbnRhaW4gdGhlIGNhdGVnb3J5XG4gICAgLy8gdmFyIGNhdGVnb3J5c2V0ID0gTW9kZWwuY2FsY3VsYXRlUmVsZXZhbnRSZWNvcmRDYXRlZ29yaWVzKHRoZU1vZGVsLGNhdGVnb3J5KTtcbiAgICAvL2tub3dpbmcgdGhlIHRhcmdldFxuICAgIHBlcmZsb2coXCJnb3QgY2F0ZWdvcnlzZXQgd2l0aCBcIiArIE9iamVjdC5rZXlzKGNhdGVnb3J5U2V0KS5sZW5ndGgpO1xuICAgIHZhciBmbCA9IDA7XG4gICAgdmFyIGxmID0gMDtcbiAgICB2YXIgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBwU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgdmFyIGZXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICAgIH0pO1xuICAgICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiAhIWNhdGVnb3J5U2V0W29Xb3JkLmNhdGVnb3J5XSB8fCBXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCk7XG4gICAgICB9KTtcbiAgICAgIGZsID0gZmwgKyBvU2VudGVuY2UubGVuZ3RoO1xuICAgICAgbGYgPSBsZiArIHJXb3Jkcy5sZW5ndGg7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCwgLy8gbm90IGEgZmlsbGVyICAvLyB0byBiZSBjb21wYXRpYmxlIGl0IHdvdWxkIGJlIGZXb3Jkc1xuICAgICAgICByV29yZHM6IHJXb3Jkc1xuICAgICAgfTtcbiAgICB9KTtcbiAgICBPYmplY3QuZnJlZXplKGFTaW1wbGlmaWVkU2VudGVuY2VzKTtcbiAgICBwZXJmbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyBmbCArIFwiLT5cIiArIGxmICsgXCIpXCIpO1xuICAgIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgICB2YXIgaGFzQ2F0ZWdvcnkgPSB7fTtcbiAgICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSBhU2VudGVuY2UuY250UmVsZXZhbnRXb3JkcztcbiAgICAgICAgYVNlbnRlbmNlLnJXb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCkgJiYgcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICBoYXNDYXRlZ29yeVtvV29yZC5tYXRjaGVkU3RyaW5nXSA9IDE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIGlmICgoT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoICsgT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aCkgPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLm9TZW50ZW5jZSxcbiAgICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgICAgY2F0ZWdvcmllczogY2F0ZWdvcmllcyxcbiAgICAgICAgICAgIHJlc3VsdDogZXh0cmFjdFJlc3VsdChjYXRlZ29yaWVzLCByZWNvcmQpLFxuICAgICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgcFNlbnRlbmNlcy5zZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAoYVNlbnRlbmNlKSB7XG4gICAgICAgIHZhciBoYXNDYXRlZ29yeSA9IHt9O1xuICAgICAgICB2YXIgbWlzbWF0Y2hlZCA9IHt9O1xuICAgICAgICB2YXIgbWF0Y2hlZCA9IHt9O1xuICAgICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IDA7XG4gICAgICAgIGFTZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgIGlmICghV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKSkge1xuICAgICAgICAgICAgY250UmVsZXZhbnRXb3JkcyA9IGNudFJlbGV2YW50V29yZHMgKyAxO1xuICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICYmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCkgJiYgcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICAgIGhhc0NhdGVnb3J5W29Xb3JkLm1hdGNoZWRTdHJpbmddID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoKE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aCArIE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5sZW5ndGgpID4gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoKSB7XG4gICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgc2VudGVuY2U6IGFTZW50ZW5jZSxcbiAgICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgICAgY2F0ZWdvcmllczogY2F0ZWdvcmllcyxcbiAgICAgICAgICAgIHJlc3VsdDogZXh0cmFjdFJlc3VsdChjYXRlZ29yaWVzLCByZWNvcmQpLFxuICAgICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSk7XG4gIH1cbiAgcmVzLnNvcnQoY21wQnlSZXN1bHRUaGVuUmFua2luZ1R1cGVsKTtcbiAgdmFyIHJlc3VsdDEgPSBPYmplY3QuYXNzaWduKHsgdHVwZWxhbnN3ZXJzOiByZXMgfSwgcFNlbnRlbmNlcyk7XG4gIHJldHVybiBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHRUdXBlbChyZXN1bHQxKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVjb3JkcyhhU2VudGVuY2VzOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcywgY2F0ZWdvcnk6IHN0cmluZywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+KVxuICA6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzQW5zd2VycyB7XG4gIC8vIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gIC8vICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gIC8vIH1cbiAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQ6IElNYXRjaC5JUmVjb3JkKSB7XG4gICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnldICE9PSBudWxsKTtcbiAgfSk7XG4gIHZhciByZXMgPSBbXTtcbiAgZGVidWdsb2coXCJyZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCk7XG4gIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICBhU2VudGVuY2VzLnNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgIHZhciBtaXNtYXRjaGVkID0ge31cbiAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IDA7XG4gICAgICBhU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgaWYgKCFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpKSB7XG4gICAgICAgICAgY250UmVsZXZhbnRXb3JkcyA9IGNudFJlbGV2YW50V29yZHMgKyAxO1xuICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGlmIChPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2UsXG4gICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxuICAgICAgICAgIHJlc3VsdDogcmVjb3JkW2NhdGVnb3J5XSxcbiAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmcobWF0Y2hlZCwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSlcbiAgfSk7XG4gIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmcpO1xuICB2YXIgcmVzdWx0ID0gT2JqZWN0LmFzc2lnbih7fSwgYVNlbnRlbmNlcywgeyBhbnN3ZXJzOiByZXMgfSk7XG4gIHJldHVybiBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHQocmVzdWx0KTtcbn1cblxuXG5cbmZ1bmN0aW9uIG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzQ2F0ZWdvcnlTZXQoYVNlbnRlbmNlczogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMsXG4gIGNhdGVnb3J5U2V0OiB7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfSwgdHJhY2s6IHsgZmw6IG51bWJlciwgbGY6IG51bWJlciB9XG4pOiB7XG4gIGRvbWFpbnM6IHN0cmluZ1tdLFxuICBvU2VudGVuY2U6IElNYXRjaC5JU2VudGVuY2UsXG4gIGNudFJlbGV2YW50V29yZHM6IG51bWJlcixcbiAgcldvcmRzOiBJTWF0Y2guSVdvcmRbXVxufVtdIHtcbiAgcmV0dXJuIGFTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgdmFyIGFEb21haW5zID0gW10gYXMgc3RyaW5nW107XG4gICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwiZG9tYWluXCIpIHtcbiAgICAgICAgYURvbWFpbnMucHVzaChvV29yZC5tYXRjaGVkU3RyaW5nKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcIm1ldGFcIikge1xuICAgICAgICAvLyBlLmcuIGRvbWFpbiBYWFhcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuICEhY2F0ZWdvcnlTZXRbb1dvcmQuY2F0ZWdvcnldO1xuICAgIH0pO1xuICAgIHRyYWNrLmZsICs9IG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgdHJhY2subGYgKz0gcldvcmRzLmxlbmd0aDtcbiAgICByZXR1cm4ge1xuICAgICAgZG9tYWluczogYURvbWFpbnMsXG4gICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsXG4gICAgICByV29yZHM6IHJXb3Jkc1xuICAgIH07XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBtYWtlU2ltcGxpZmllZFNlbnRlbmNlcyhhU2VudGVuY2VzIDogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMsICB0cmFjazogeyBmbDogbnVtYmVyLCBsZjogbnVtYmVyIH0pOiB7XG4gIGRvbWFpbnM6IHN0cmluZ1tdLFxuICBvU2VudGVuY2U6IElNYXRjaC5JU2VudGVuY2UsXG4gIGNudFJlbGV2YW50V29yZHM6IG51bWJlcixcbiAgcldvcmRzOiBJTWF0Y2guSVdvcmRbXVxufVtdIHtcbiAgcmV0dXJuIGFTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgdmFyIGRvbWFpbnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJkb21haW5cIikge1xuICAgICAgICBkb21haW5zLnB1c2gob1dvcmQubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJtZXRhXCIpIHtcbiAgICAgICAgLy8gZS5nLiBkb21haW4gWFhYXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICB9KTtcbiAgICB0cmFjay5mbCArPSBvU2VudGVuY2UubGVuZ3RoO1xuICAgIHRyYWNrLmxmICs9IHJXb3Jkcy5sZW5ndGg7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgZG9tYWluczogZG9tYWlucyxcbiAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsXG4gICAgICByV29yZHM6IHJXb3Jkc1xuICAgIH07XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hSZWNvcmRzUXVpY2soYVNlbnRlbmNlczogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMsIGNhdGVnb3J5OiBzdHJpbmcsIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPiwgY2F0ZWdvcnlTZXQ/OiB7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfSlcbiAgOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnMge1xuICAvL2lmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gIC8vICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRzLCB1bmRlZmluZWQsIDIpKTtcbiAgLy99XG4gIE9iamVjdC5mcmVlemUoY2F0ZWdvcnlTZXQpO1xuICBwZXJmbG9nKFwibWF0Y2hSZWNvcmRzUXVpY2sgLi4uKHI9XCIgKyByZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBhU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIikgd2l0aCBjYXRlZ29yeSA6IFxcXCJcIiArIGNhdGVnb3J5ICsgJ1xcXCInKTtcbiAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQ6IElNYXRjaC5JUmVjb3JkKSB7XG4gICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnldICE9PSBudWxsKTtcbiAgfSk7XG4gIHZhciByZXMgPSBbXTtcbiAgZGVidWdsb2coXCJtYXRjaFJlY29yZHNRdWljazogcmVsZXZhbnQgcmVjb3JkcyAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIikgc2VudGVuY2VzIFwiICsgYVNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoKTtcbiAgcGVyZmxvZyhcInJlbGV2YW50IHJlY29yZHMgbnI6XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgc2VudGVuY2VzIFwiICsgYVNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoKTtcbiAgaWYgKHByb2Nlc3MuZW52LkFCT1RfRkFTVCAmJiBjYXRlZ29yeVNldCkge1xuICAgIC8vIHdlIGFyZSBvbmx5IGludGVyZXN0ZWQgaW4gY2F0ZWdvcmllcyBwcmVzZW50IGluIHJlY29yZHMgZm9yIGRvbWFpbnMgd2hpY2ggY29udGFpbiB0aGUgY2F0ZWdvcnlcbiAgICAvLyB2YXIgY2F0ZWdvcnlzZXQgPSBNb2RlbC5jYWxjdWxhdGVSZWxldmFudFJlY29yZENhdGVnb3JpZXModGhlTW9kZWwsY2F0ZWdvcnkpO1xuICAgIC8va25vd2luZyB0aGUgdGFyZ2V0XG4gICAgcGVyZmxvZyhcImdvdCBjYXRlZ29yeXNldCB3aXRoIFwiICsgT2JqZWN0LmtleXMoY2F0ZWdvcnlTZXQpLmxlbmd0aCk7XG4gICAgdmFyIG9iaiA9IHtcbiAgICAgIGZsOiAwLFxuICAgICAgbGY6IDBcbiAgICB9O1xuICAgIHZhciBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzQ2F0ZWdvcnlTZXQoYVNlbnRlbmNlcyxjYXRlZ29yeVNldCwgb2JqKTtcbiAgICAvKmFTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICB2YXIgYURvbWFpbnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwiZG9tYWluXCIpIHtcbiAgICAgICAgICBhRG9tYWlucy5wdXNoKG9Xb3JkLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwibWV0YVwiKSB7XG4gICAgICAgICAgLy8gZS5nLiBkb21haW4gWFhYXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAhIWNhdGVnb3J5U2V0W29Xb3JkLmNhdGVnb3J5XTtcbiAgICAgIH0pO1xuICAgICAgZmwgPSBmbCArIG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgICBsZiA9IGxmICsgcldvcmRzLmxlbmd0aDtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGRvbWFpbnM6IGFEb21haW5zLFxuICAgICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCxcbiAgICAgICAgcldvcmRzOiByV29yZHNcbiAgICAgIH07XG4gICAgfSk7XG4gICAgKi9cbiAgICBwZXJmbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgYVNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyBvYmouZmwgKyBcIi0+XCIgKyBvYmoubGYgKyBcIilcIik7XG4gIH0gZWxzZSB7XG4gICAgdmFyIHRyYWNrID0ge1xuICAgICAgZmwgOiAwLFxuICAgICAgbGYgOiAwXG4gICAgfTtcbiAgICB2YXIgZG9tYWlucyA9IFtdIGFzIHN0cmluZ1tdO1xuICAgIHZhciBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzKGFTZW50ZW5jZXMsdHJhY2spO1xuICAgIC8qXG4gICAgLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgY29uc29sZS5sb2coXCJoZXJlIHNlbnRlbmNlXCIgKyBTZW50ZW5jZS5kdW1wTmljZShvU2VudGVuY2UpKTtcbiAgICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwiZG9tYWluXCIpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkdPVCBBIERPTUFJTiFcIiArIG9Xb3JkLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICAgIGRvbWFpbnMucHVzaChvV29yZC5tYXRjaGVkU3RyaW5nKTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcIm1ldGFcIikge1xuICAgICAgICAgIC8vIGUuZy4gZG9tYWluIFhYWFxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCk7XG4gICAgICB9KTtcbiAgICAgIGZsID0gZmwgKyBvU2VudGVuY2UubGVuZ3RoO1xuICAgICAgbGYgPSBsZiArIHJXb3Jkcy5sZW5ndGg7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgZG9tYWluczogZG9tYWlucyxcbiAgICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCxcbiAgICAgICAgcldvcmRzOiByV29yZHNcbiAgICAgIH07XG4gICAgfSk7XG4gICAgKi9cbiAgICBwZXJmbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgYVNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyB0cmFjay5mbCArIFwiLT5cIiArIHRyYWNrLmxmICsgXCIpXCIpO1xuICB9XG5cbiAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgdmFyIG1pc21hdGNoZWQgPSAwO1xuICAgICAgdmFyIG1hdGNoZWQgPSAwO1xuICAgICAgdmFyIG5vdXNlID0gMDtcbiAgICAgIHZhciBtaXNzaW5nY2F0ID0gMDtcbiAgICAgIGFTZW50ZW5jZS5yV29yZHMuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgaWYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICArK21hdGNoZWQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICsrbWlzbWF0Y2hlZDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICE9PSBcImNhdGVnb3J5XCIpIHtcbiAgICAgICAgICAgIG5vdXNlICs9IDE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICghcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICAgIG1pc3NpbmdjYXQgKz0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgaWYgKGFTZW50ZW5jZS5kb21haW5zLmxlbmd0aCkge1xuICAgICAgICBpZiAoKHJlY29yZCBhcyBhbnkpLl9kb21haW4gIT09IGFTZW50ZW5jZS5kb21haW5zWzBdKSB7XG4gICAgICAgICAgbWlzbWF0Y2hlZCA9IDMwMDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbWF0Y2hlZCArPSAxO1xuICAgICAgICAgIC8vY29uc29sZS5sb2coXCJHT1QgQSBET01BSU4gSElUXCIgKyBtYXRjaGVkICsgXCIgXCIgKyBtaXNtYXRjaGVkKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gaWYobWF0Y2hlZCA+IDAgfHwgbWlzbWF0Y2hlZCA+IDAgKSB7XG4gICAgICAvLyAgIGNvbnNvbGUubG9nKFwiIG1cIiArIG1hdGNoZWQgKyBcIiBtaXNtYXRjaGVkXCIgKyBtaXNtYXRjaGVkKTtcbiAgICAgIC8vIH1cbiAgICAgIC8vY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYVNlbnRlbmNlLm9TZW50ZW5jZSkpO1xuICAgICAgaWYgKG1hdGNoZWQgPiBtaXNtYXRjaGVkKSB7XG4gICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLm9TZW50ZW5jZSxcbiAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgcmVzdWx0OiByZWNvcmRbY2F0ZWdvcnldLFxuICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ1NpbXBsZShtYXRjaGVkLCBtaXNtYXRjaGVkLCAobm91c2UgKyBtaXNzaW5nY2F0KSwgYVNlbnRlbmNlLmNudFJlbGV2YW50V29yZHMpXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pXG4gIH0pO1xuICBwZXJmbG9nKFwic29ydCAoYT1cIiArIHJlcy5sZW5ndGggKyBcIilcIik7XG4gIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmcpO1xuICBwZXJmbG9nKFwiZmlsdGVyUmV0YWluIC4uLlwiKTtcbiAgdmFyIHJlc3VsdDIgPSBPYmplY3QuYXNzaWduKHsgYW5zd2VyczogcmVzIH0sIGFTZW50ZW5jZXMpO1xuICB2YXIgcmVzdWx0ID0gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0KHJlc3VsdDIpO1xuXG4gIGRlYnVnbG9nKFwibWF0Y2hSZWNvcmRzUXVpY2sgZG9uZTogKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIGFTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGE9XCIgKyByZXN1bHQuYW5zd2Vycy5sZW5ndGggKyBcIilcIik7XG4gIHBlcmZsb2coXCJtYXRjaFJlY29yZHNRdWljayBkb25lOiAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgYVNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgYT1cIiArIHJlc3VsdC5hbnN3ZXJzLmxlbmd0aCArIFwiKVwiKTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gZXh0cmFjdFJlc3VsdChjYXRlZ29yaWVzOiBzdHJpbmdbXSwgcmVjb3JkOiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9KTogc3RyaW5nW10ge1xuICByZXR1cm4gY2F0ZWdvcmllcy5tYXAoZnVuY3Rpb24gKGNhdGVnb3J5KSB7IHJldHVybiByZWNvcmRbY2F0ZWdvcnldIHx8IFwibi9hXCI7IH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hSZWNvcmRzUXVpY2tNdWx0aXBsZUNhdGVnb3JpZXMocFNlbnRlbmNlczogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMsIGNhdGVnb3JpZXM6IHN0cmluZ1tdLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sIGNhdGVnb3J5U2V0PzogeyBba2V5OiBzdHJpbmddOiBib29sZWFuIH0pXG4gIDogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNUdXBlbEFuc3dlcnMge1xuICAvLyBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAvLyAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gIC8vIH1cbiAgT2JqZWN0LmZyZWV6ZShjYXRlZ29yeVNldCk7XG4gIHZhciBjYXRlZ29yeUYgPSBjYXRlZ29yaWVzWzBdO1xuICBkZWJ1Z2xvZyhcIm1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzIChyPVwiICsgcmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIpXFxuIGNhdGVnb3JpZXM6XCIgKyBjYXRlZ29yaWVzLmpvaW4oXCJcXG5cIikpO1xuICBwZXJmbG9nKFwibWF0Y2hSZWNvcmRzUXVpY2tNdWx0IC4uLihyPVwiICsgcmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIpXCIpO1xuICB2YXIgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZDogSU1hdGNoLklSZWNvcmQpIHtcbiAgICByZXR1cm4gKHJlY29yZFtjYXRlZ29yeUZdICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnlGXSAhPT0gbnVsbCk7XG4gIH0pO1xuICB2YXIgcmVzID0gW10gYXMgQXJyYXk8SU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlcj47XG4gIGRlYnVnbG9nKFwicmVsZXZhbnQgcmVjb3JkcyB3aXRoIGZpcnN0IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiKVwiKTtcbiAgcGVyZmxvZyhcInJlbGV2YW50IHJlY29yZHMgd2l0aCBmaXJzdCBucjpcIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzZW50ZW5jZXMgXCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGgpO1xuICBpZiAocHJvY2Vzcy5lbnYuQUJPVF9GQVNUICYmIGNhdGVnb3J5U2V0KSB7XG4gICAgLy8gd2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbiBjYXRlZ29yaWVzIHByZXNlbnQgaW4gcmVjb3JkcyBmb3IgZG9tYWlucyB3aGljaCBjb250YWluIHRoZSBjYXRlZ29yeVxuICAgIC8vIHZhciBjYXRlZ29yeXNldCA9IE1vZGVsLmNhbGN1bGF0ZVJlbGV2YW50UmVjb3JkQ2F0ZWdvcmllcyh0aGVNb2RlbCxjYXRlZ29yeSk7XG4gICAgLy9rbm93aW5nIHRoZSB0YXJnZXRcbiAgICBwZXJmbG9nKFwiZ290IGNhdGVnb3J5c2V0IHdpdGggXCIgKyBPYmplY3Qua2V5cyhjYXRlZ29yeVNldCkubGVuZ3RoKTtcbiAgICB2YXIgb2JqID0geyBmbDogMCwgbGY6IDAgfTtcbiAgICB2YXIgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBtYWtlU2ltcGxpZmllZFNlbnRlbmNlc0NhdGVnb3J5U2V0KHBTZW50ZW5jZXMsIGNhdGVnb3J5U2V0LG9iaik7XG4gICAgcGVyZmxvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgb2JqLmZsICsgXCItPlwiICsgb2JqLmxmICsgXCIpXCIpO1xuICB9IGVsc2Uge1xuICAgIGRlYnVnbG9nKFwibm90IGFib3RfZmFzdCAhXCIpO1xuICAgIHZhciB0cmFjayA9IHsgZmw6IDAgLCBsZiA6IDB9O1xuICAgIHZhciBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzKHBTZW50ZW5jZXMsdHJhY2spO1xuLypcbiAgICBwU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICAgIH0pO1xuICAgICAgZmwgPSBmbCArIG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgICBsZiA9IGxmICsgcldvcmRzLmxlbmd0aDtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLFxuICAgICAgICByV29yZHM6IHJXb3Jkc1xuICAgICAgfTtcbiAgICB9KTtcbiAgICAqL1xuICAgIGRlYnVnbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyB0cmFjay5mbCArIFwiLT5cIiArIHRyYWNrLmxmICsgXCIpXCIpO1xuICAgIHBlcmZsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIHRyYWNrLmZsICsgXCItPlwiICsgdHJhY2subGYgKyBcIilcIik7XG4gIH1cblxuICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgYVNpbXBsaWZpZWRTZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAoYVNlbnRlbmNlKSB7XG4gICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICB2YXIgbWlzbWF0Y2hlZCA9IDA7XG4gICAgICB2YXIgbWF0Y2hlZCA9IDA7XG4gICAgICB2YXIgbm91c2UgPSAwO1xuICAgICAgdmFyIG1pc3NpbmdjYXQgPSAwO1xuICAgICAgYVNlbnRlbmNlLnJXb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICBpZiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICsrbWF0Y2hlZDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgKyttaXNtYXRjaGVkO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgIT09IFwiY2F0ZWdvcnlcIikge1xuICAgICAgICAgICAgbm91c2UgKz0gMTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCFyZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgICAgbWlzc2luZ2NhdCArPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBpZiAoYVNlbnRlbmNlLmRvbWFpbnMubGVuZ3RoKSB7XG4gICAgICAgIGlmICgocmVjb3JkIGFzIGFueSkuX2RvbWFpbiAhPT0gYVNlbnRlbmNlLmRvbWFpbnNbMF0pIHtcbiAgICAgICAgICBtaXNtYXRjaGVkID0gMzAwMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBtYXRjaGVkICs9IDE7XG4gICAgICAgICAgLy9jb25zb2xlLmxvZyhcIkdPVCBBIERPTUFJTiBISVRcIiArIG1hdGNoZWQgKyBcIiBcIiArIG1pc21hdGNoZWQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBpZihtYXRjaGVkID4gMCB8fCBtaXNtYXRjaGVkID4gMCApIHtcbiAgICAgIC8vICAgY29uc29sZS5sb2coXCIgbVwiICsgbWF0Y2hlZCArIFwiIG1pc21hdGNoZWRcIiArIG1pc21hdGNoZWQpO1xuICAgICAgLy8gfVxuICAgICAgLy9jb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhU2VudGVuY2Uub1NlbnRlbmNlKSk7XG4gICAgICBpZiAobWF0Y2hlZCA+IG1pc21hdGNoZWQpIHtcbiAgICAgICAgdmFyIHJlYyA9IHtcbiAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLm9TZW50ZW5jZSxcbiAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICBjYXRlZ29yaWVzOiBjYXRlZ29yaWVzLFxuICAgICAgICAgIHJlc3VsdDogZXh0cmFjdFJlc3VsdChjYXRlZ29yaWVzLCByZWNvcmQpLFxuICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ1NpbXBsZShtYXRjaGVkLCBtaXNtYXRjaGVkLCAobm91c2UgKyBtaXNzaW5nY2F0KSwgYVNlbnRlbmNlLmNudFJlbGV2YW50V29yZHMpXG4gICAgICAgIH1cbiAgICAgICAgLyogICBpZihyZWNvcmRbXCJhcHBJZFwiXSA9PT1cIkYxNTY2XCIpIHtcbiAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImhlcmUgRjE1NjZcIiArIEpTT04uc3RyaW5naWZ5KHJlYykpO1xuICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaGVyZSBtYXRjaGVkXCIgKyBtYXRjaGVkICsgXCIgbWlzbWF0Y2hlZFwiICsgbWlzbWF0Y2hlZCArIFwiIG5vdXNlIFwiICsgKG5vdXNlICsgbWlzc2luZ2NhdCkpO1xuICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaGVyZSBjbnRSZWxldmFudCA6XCIgKyBhU2VudGVuY2UuY250UmVsZXZhbnRXb3Jkcyk7XG4gICAgICAgICAgIH1cbiAgICAgICAgICAgaWYocmVjb3JkW1wiYXBwSWRcIl0gPT09XCJGMDczMUFcIikge1xuICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaGVyZSBGMDczMUFcIiArIEpTT04uc3RyaW5naWZ5KHJlYykpO1xuICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaGVyZSBtYXRjaGVkXCIgKyBtYXRjaGVkICsgXCIgbWlzbWF0Y2hlZFwiICsgbWlzbWF0Y2hlZCArIFwiIG5vdXNlIFwiICsgKG5vdXNlICsgbWlzc2luZ2NhdCkpO1xuICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaGVyZSBjbnRSZWxldmFudCA6XCIgKyBhU2VudGVuY2UuY250UmVsZXZhbnRXb3Jkcyk7XG4gICAgICAgICAgIH1cbiAgICAgICAgICAgKi9cbiAgICAgICAgcmVzLnB1c2gocmVjKTtcbiAgICAgIH1cbiAgICB9KVxuICB9KTtcbiAgcGVyZmxvZyhcInNvcnQgKGE9XCIgKyByZXMubGVuZ3RoICsgXCIpXCIpO1xuICByZXMuc29ydChjbXBCeVJlc3VsdFRoZW5SYW5raW5nVHVwZWwpO1xuICBwZXJmbG9nKFwiZmlsdGVyUmV0YWluIC4uLlwiKTtcbiAgdmFyIHJlc3VsdDEgPSBPYmplY3QuYXNzaWduKHsgdHVwZWxhbnN3ZXJzOiByZXMgfSwgcFNlbnRlbmNlcylcbiAgdmFyIHJlc3VsdDIgPSBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHRUdXBlbChyZXN1bHQxKTtcbiAgcGVyZmxvZyhcIm1hdGNoUmVjb3Jkc1F1aWNrIGRvbmU6IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBhPVwiICsgcmVzLmxlbmd0aCArIFwiKVwiKTtcbiAgcmV0dXJuIHJlc3VsdDI7XG59XG5cblxuZnVuY3Rpb24gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KHdvcmQ6IHN0cmluZywgdGFyZ2V0Y2F0ZWdvcnk6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLFxuICB3aG9sZXNlbnRlbmNlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAvL2NvbnNvbGUubG9nKFwiY2xhc3NpZnkgXCIgKyB3b3JkICsgXCIgXCIgICsgdGFyZ2V0Y2F0ZWdvcnkpO1xuICB2YXIgY2F0cyA9IElucHV0RmlsdGVyLmNhdGVnb3JpemVBV29yZCh3b3JkLCBydWxlcywgd2hvbGVzZW50ZW5jZSwge30pO1xuICAvLyBUT0RPIHF1YWxpZnlcbiAgY2F0cyA9IGNhdHMuZmlsdGVyKGZ1bmN0aW9uIChjYXQpIHtcbiAgICByZXR1cm4gY2F0LmNhdGVnb3J5ID09PSB0YXJnZXRjYXRlZ29yeTtcbiAgfSlcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoY2F0cykpO1xuICBpZiAoY2F0cy5sZW5ndGgpIHtcbiAgICByZXR1cm4gY2F0c1swXS5tYXRjaGVkU3RyaW5nO1xuICB9XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVDYXRlZ29yeShjYXRlZ29yeXdvcmQ6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCB3aG9sZXNlbnRlbmNlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KGNhdGVnb3J5d29yZCwgJ2NhdGVnb3J5JywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3BsaXRBdENvbW1hQW5kKHN0cjogc3RyaW5nKTogc3RyaW5nW10ge1xuICB2YXIgciA9IHN0ci5zcGxpdCgvKFxcYmFuZFxcYil8WyxdLyk7XG4gIHIgPSByLmZpbHRlcihmdW5jdGlvbiAobywgaW5kZXgpIHtcbiAgICBpZiAoaW5kZXggJSAyID4gMCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG4gIHZhciBydHJpbW1lZCA9IHIubWFwKGZ1bmN0aW9uIChvKSB7XG4gICAgcmV0dXJuIG5ldyBTdHJpbmcobykudHJpbSgpO1xuICB9KTtcbiAgcmV0dXJuIHJ0cmltbWVkO1xufVxuLyoqXG4gKiBBIHNpbXBsZSBpbXBsZW1lbnRhdGlvbiwgc3BsaXR0aW5nIGF0IGFuZCBhbmQgLFxuICovXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZUNhdGVnb3J5TXVsdE9ubHlBbmRDb21tYShjYXRlZ29yeWxpc3Q6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCB3aG9sZXNlbnRlbmNlOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIHZhciBydHJpbW1lZCA9IHNwbGl0QXRDb21tYUFuZChjYXRlZ29yeWxpc3QpO1xuICB2YXIgcmNhdCA9IHJ0cmltbWVkLm1hcChmdW5jdGlvbiAobykge1xuICAgIHJldHVybiBhbmFseXplQ2F0ZWdvcnkobywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xuICB9KTtcbiAgaWYgKHJjYXQuaW5kZXhPZih1bmRlZmluZWQpID49IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1wiJyArIHJ0cmltbWVkW3JjYXQuaW5kZXhPZih1bmRlZmluZWQpXSArICdcIiBpcyBub3QgYSBjYXRlZ29yeSEnKTtcbiAgfVxuICByZXR1cm4gcmNhdDtcbn1cblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJBY2NlcHRpbmdPbmx5KHJlczogSU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdW10sIGNhdGVnb3JpZXM6IHN0cmluZ1tdKTpcbiAgSU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdW10ge1xuICByZXR1cm4gcmVzLmZpbHRlcihmdW5jdGlvbiAoYVNlbnRlbmNlLCBpSW5kZXgpIHtcbiAgICByZXR1cm4gYVNlbnRlbmNlLmV2ZXJ5KGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgcmV0dXJuIGNhdGVnb3JpZXMuaW5kZXhPZihvV29yZC5jYXRlZ29yeSkgPj0gMDtcbiAgICB9KTtcbiAgfSlcbn1cblxuXG5pbXBvcnQgKiBhcyBFcmJhc2UgZnJvbSAnLi9lcmJhc2UnO1xuXG52YXIgc1dvcmRzID0ge307XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNldENhY2hlKCk6IHZvaWQge1xuICBzV29yZHMgPSB7fTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByb2Nlc3NTdHJpbmcocXVlcnk6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzXG4pOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcyB7XG5cbiAgaWYgKCFwcm9jZXNzLmVudi5BQk9UX09MRE1BVENIKSB7XG4gICAgcmV0dXJuIEVyYmFzZS5wcm9jZXNzU3RyaW5nKHF1ZXJ5LCBydWxlcywgcnVsZXMud29yZENhY2hlKTtcbiAgfVxuXG4gIHZhciBtYXRjaGVkID0gSW5wdXRGaWx0ZXIuYW5hbHl6ZVN0cmluZyhxdWVyeSwgcnVsZXMsIHNXb3Jkcyk7XG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgZGVidWdsb2coXCJBZnRlciBtYXRjaGVkIFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZCkpO1xuICB9XG4gIHZhciBhU2VudGVuY2VzID0gSW5wdXRGaWx0ZXIuZXhwYW5kTWF0Y2hBcnIobWF0Y2hlZCk7XG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgZGVidWdsb2coXCJhZnRlciBleHBhbmRcIiArIGFTZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICB9XG4gIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IElucHV0RmlsdGVyLnJlaW5Gb3JjZShhU2VudGVuY2VzKTtcbiAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICBkZWJ1Z2xvZyhcImFmdGVyIHJlaW5mb3JjZVwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICB9XG4gIHJldHVybiB7XG4gICAgZXJyb3JzOiBbXSxcbiAgICBzZW50ZW5jZXM6IGFTZW50ZW5jZXNSZWluZm9yY2VkXG4gIH0gYXMgSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXM7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVDb250ZXh0U3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMpOlxuICBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcyB7XG5cbiAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gcHJvY2Vzc1N0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKVxuICAvLyB3ZSBsaW1pdCBhbmFseXNpcyB0byBuIHNlbnRlbmNlc1xuICBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMgPSBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMuc2xpY2UoMCwgQWxnb2wuQ3V0b2ZmX1NlbnRlbmNlcyk7XG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgZGVidWdsb2coXCJhZnRlciByZWluZm9yY2UgYW5kIGN1dG9mZlwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLmxlbmd0aCArIFwiXFxuXCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICB9XG4gIHJldHVybiBhU2VudGVuY2VzUmVpbmZvcmNlZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNtcEJ5TnJDYXRlZ29yaWVzQW5kU2FtZURvbWFpbihhOiBJTWF0Y2guSVNlbnRlbmNlLCBiOiBJTWF0Y2guSVNlbnRlbmNlKTogbnVtYmVyIHtcbiAgLy9jb25zb2xlLmxvZyhcImNvbXBhcmUgYVwiICsgYSArIFwiIGNudGIgXCIgKyBiKTtcbiAgdmFyIGNudGEgPSBTZW50ZW5jZS5nZXREaXN0aW5jdENhdGVnb3JpZXNJblNlbnRlbmNlKGEpLmxlbmd0aDtcbiAgdmFyIGNudGIgPSBTZW50ZW5jZS5nZXREaXN0aW5jdENhdGVnb3JpZXNJblNlbnRlbmNlKGIpLmxlbmd0aDtcbiAgLypcbiAgICB2YXIgY250YSA9IGEucmVkdWNlKGZ1bmN0aW9uKHByZXYsIG9Xb3JkKSB7XG4gICAgICByZXR1cm4gcHJldiArICgob1dvcmQuY2F0ZWdvcnkgPT09IFwiY2F0ZWdvcnlcIik/IDEgOiAwKTtcbiAgICB9LDApO1xuICAgIHZhciBjbnRiID0gYi5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgb1dvcmQpIHtcbiAgICAgIHJldHVybiBwcmV2ICsgKChvV29yZC5jYXRlZ29yeSA9PT0gXCJjYXRlZ29yeVwiKT8gMSA6IDApO1xuICAgIH0sMCk7XG4gICAvLyBjb25zb2xlLmxvZyhcImNudCBhXCIgKyBjbnRhICsgXCIgY250YiBcIiArIGNudGIpO1xuICAgKi9cbiAgcmV0dXJuIGNudGIgLSBjbnRhO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZUNhdGVnb3J5TXVsdChjYXRlZ29yeWxpc3Q6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCB3aG9sZXNlbnRlbmNlOiBzdHJpbmcsIGdXb3JkczpcbiAgeyBba2V5OiBzdHJpbmddOiBJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW10gfSk6IHN0cmluZ1tdIHtcbiAgdmFyIHJlcyA9IGFuYWx5emVDb250ZXh0U3RyaW5nKGNhdGVnb3J5bGlzdCwgcnVsZXMpO1xuICAvLyAgZGVidWdsb2coXCJyZXN1bHRpbmcgY2F0ZWdvcnkgc2VudGVuY2VzXCIsIEpTT04uc3RyaW5naWZ5KHJlcykpO1xuICB2YXIgcmVzMiA9IGZpbHRlckFjY2VwdGluZ09ubHkocmVzLnNlbnRlbmNlcywgW1wiY2F0ZWdvcnlcIiwgXCJmaWxsZXJcIl0pO1xuICAvLyAgY29uc29sZS5sb2coXCJoZXJlIHJlczJcIiArIEpTT04uc3RyaW5naWZ5KHJlczIpICk7XG4gIC8vICBjb25zb2xlLmxvZyhcImhlcmUgdW5kZWZpbmVkICEgKyBcIiArIHJlczIuZmlsdGVyKG8gPT4gIW8pLmxlbmd0aCk7XG4gIHJlczIuc29ydChTZW50ZW5jZS5jbXBSYW5raW5nUHJvZHVjdCk7XG4gIGRlYnVnbG9nKFwicmVzdWx0aW5nIGNhdGVnb3J5IHNlbnRlbmNlczogXFxuXCIsIGRlYnVnbG9nLmVuYWJsZWQgPyAoU2VudGVuY2UuZHVtcE5pY2VBcnIocmVzMi5zbGljZSgwLCAzKSwgU2VudGVuY2UucmFua2luZ1Byb2R1Y3QpKSA6ICctJyk7XG4gIC8vIFRPRE86ICAgcmVzMiA9IGZpbHRlckFjY2VwdGluZ09ubHlTYW1lRG9tYWluKHJlczIpO1xuICAvL2RlYnVnbG9nKFwicmVzdWx0aW5nIGNhdGVnb3J5IHNlbnRlbmNlc1wiLCBKU09OLnN0cmluZ2lmeShyZXMyLCB1bmRlZmluZWQsIDIpKTtcbiAgLy8gZXhwZWN0IG9ubHkgY2F0ZWdvcmllc1xuICAvLyB3ZSBjb3VsZCByYW5rIG5vdyBieSBjb21tb24gZG9tYWlucyAsIGJ1dCBmb3Igbm93IHdlIG9ubHkgdGFrZSB0aGUgZmlyc3Qgb25lXG4gIGlmICghcmVzMi5sZW5ndGgpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIC8vcmVzLnNvcnQoY21wQnlOckNhdGVnb3JpZXNBbmRTYW1lRG9tYWluKTtcbiAgdmFyIHJlc2NhdCA9IFNlbnRlbmNlLmdldERpc3RpbmN0Q2F0ZWdvcmllc0luU2VudGVuY2UocmVzMlswXSk7XG4gIHJldHVybiByZXNjYXQ7XG4gIC8vIFwiXCIgcmV0dXJuIHJlc1swXS5maWx0ZXIoKVxuICAvLyByZXR1cm4gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KGNhdGVnb3J5bGlzdCwgJ2NhdGVnb3J5JywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZU9wZXJhdG9yKG9wd29yZDogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHdob2xlc2VudGVuY2U6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBjbGFzc2lmeVdvcmRXaXRoVGFyZ2V0Q2F0ZWdvcnkob3B3b3JkLCAnb3BlcmF0b3InLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG59XG5cblxuaW1wb3J0ICogYXMgRXJFcnJvciBmcm9tICcuL2VyZXJyb3InO1xuXG5pbXBvcnQgKiBhcyBMaXN0QWxsIGZyb20gJy4vbGlzdGFsbCc7XG4vLyBjb25zdCByZXN1bHQgPSBXaGF0SXMucmVzb2x2ZUNhdGVnb3J5KGNhdCwgYTEuZW50aXR5LFxuLy8gICB0aGVNb2RlbC5tUnVsZXMsIHRoZU1vZGVsLnRvb2xzLCB0aGVNb2RlbC5yZWNvcmRzKTtcblxuXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUNhdGVnb3J5KGNhdGVnb3J5OiBzdHJpbmcsIGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLFxuICBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPik6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzQW5zd2VycyB7XG4gIGlmIChjb250ZXh0UXVlcnlTdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHsgZXJyb3JzOiBbRXJFcnJvci5tYWtlRXJyb3JfRU1QVFlfSU5QVVQoKV0sIHRva2VuczogW10sIGFuc3dlcnM6IFtdIH07XG4gIH0gZWxzZSB7XG4gICAgLypcbiAgICAgICAgdmFyIG1hdGNoZWQgPSBJbnB1dEZpbHRlci5hbmFseXplU3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMpO1xuICAgICAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiYWZ0ZXIgbWF0Y2hlZCBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWQpKTogJy0nKTtcbiAgICAgICAgdmFyIGFTZW50ZW5jZXMgPSBJbnB1dEZpbHRlci5leHBhbmRNYXRjaEFycihtYXRjaGVkKTtcbiAgICAgICAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgIGRlYnVnbG9nKFwiYWZ0ZXIgZXhwYW5kXCIgKyBhU2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICAgICAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgICAgIH0gKi9cblxuXG4gICAgICAgICAgLy8gdmFyIGNhdGVnb3J5U2V0ID0gTW9kZWwuZ2V0QWxsUmVjb3JkQ2F0ZWdvcmllc0ZvclRhcmdldENhdGVnb3J5KHRoZU1vZGVsLCBjYXQsIHRydWUpO1xuXG4gICAgdmFyIHJlcyA9IExpc3RBbGwubGlzdEFsbFdpdGhDb250ZXh0KGNhdGVnb3J5LCBjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzLCByZWNvcmRzKTtcbiAgICAvLyogc29ydCBieSBzZW50ZW5jZVxuICAgIHJlcy5hbnN3ZXJzLmZvckVhY2gobyA9PiB7IG8uX3JhbmtpbmcgPSBvLl9yYW5raW5nICogIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KCBvLnNlbnRlbmNlICk7IH0pO1xuICAgIHJlcy5hbnN3ZXJzLnNvcnQoY21wQnlSYW5raW5nKTtcbiAgICByZXR1cm4gcmVzO1xuLypcbiAgICAvLyA/Pz8gdmFyIHJlcyA9IExpc3RBbGwubGlzdEFsbEhhdmluZ0NvbnRleHQoY2F0ZWdvcnksIGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMsIHJlY29yZHMpO1xuXG4gICAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gcHJvY2Vzc1N0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKTtcbiAgICAvL2FTZW50ZW5jZXMubWFwKGZ1bmN0aW9uKG9TZW50ZW5jZSkgeyByZXR1cm4gSW5wdXRGaWx0ZXIucmVpbkZvcmNlKG9TZW50ZW5jZSk7IH0pO1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJhZnRlciByZWluZm9yY2VcIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgfSkuam9pbihcIlxcblwiKSkgOiAnLScpO1xuICAgIHZhciBtYXRjaGVkQW5zd2VycyA9IG1hdGNoUmVjb3JkcyhhU2VudGVuY2VzUmVpbmZvcmNlZCwgY2F0ZWdvcnksIHJlY29yZHMpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8gKiBvYmplY3RzdHJlYW0qIC8ge1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCIgbWF0Y2hlZEFuc3dlcnNcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRBbnN3ZXJzLCB1bmRlZmluZWQsIDIpKSA6ICctJyk7XG4gICAgcmV0dXJuIG1hdGNoZWRBbnN3ZXJzO1xuKi9cbiB9XG59XG5cbi8qXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUNhdGVnb3J5T2xkKGNhdGVnb3J5OiBzdHJpbmcsIGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLFxuICBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPik6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzQW5zd2VycyB7XG4gIGlmIChjb250ZXh0UXVlcnlTdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHsgZXJyb3JzOiBbRXJFcnJvci5tYWtlRXJyb3JfRU1QVFlfSU5QVVQoKV0sIHRva2VuczogW10sIGFuc3dlcnM6IFtdIH07XG4gIH0gZWxzZSB7XG4gICAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gcHJvY2Vzc1N0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKTtcbiAgICAvL2FTZW50ZW5jZXMubWFwKGZ1bmN0aW9uKG9TZW50ZW5jZSkgeyByZXR1cm4gSW5wdXRGaWx0ZXIucmVpbkZvcmNlKG9TZW50ZW5jZSk7IH0pO1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJhZnRlciByZWluZm9yY2VcIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgfSkuam9pbihcIlxcblwiKSkgOiAnLScpO1xuICAgIHZhciBtYXRjaGVkQW5zd2VycyA9IG1hdGNoUmVjb3JkcyhhU2VudGVuY2VzUmVpbmZvcmNlZCwgY2F0ZWdvcnksIHJlY29yZHMpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8gKiBvYmplY3RzdHJlYW0qIC8ge1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCIgbWF0Y2hlZEFuc3dlcnNcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRBbnN3ZXJzLCB1bmRlZmluZWQsIDIpKSA6ICctJyk7XG4gICAgcmV0dXJuIG1hdGNoZWRBbnN3ZXJzO1xuICB9XG59XG4qL1xuXG5pbXBvcnQgKiBhcyBNb2RlbCBmcm9tICcuLi9tb2RlbC9tb2RlbCc7XG5cblxuXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUNhdGVnb3JpZXMoY2F0ZWdvcmllczogc3RyaW5nW10sIGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLFxuICB0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMpOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc1R1cGVsQW5zd2VycyB7XG4gIHZhciByZWNvcmRzID0gdGhlTW9kZWwucmVjb3JkcztcbiAgdmFyIHJ1bGVzID0gdGhlTW9kZWwucnVsZXM7XG4gIGlmIChjb250ZXh0UXVlcnlTdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczogW0VyRXJyb3IubWFrZUVycm9yX0VNUFRZX0lOUFVUKCldLFxuICAgICAgdHVwZWxhbnN3ZXJzOiBbXSxcbiAgICAgIHRva2VuczogW11cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gdmFyIGNhdGVnb3J5U2V0ID0gTW9kZWwuZ2V0QWxsUmVjb3JkQ2F0ZWdvcmllc0ZvclRhcmdldENhdGVnb3J5KHRoZU1vZGVsLCBjYXQsIHRydWUpO1xuICAgIHZhciByZXMgPSBMaXN0QWxsLmxpc3RBbGxUdXBlbFdpdGhDb250ZXh0KGNhdGVnb3JpZXMsIGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMsIHJlY29yZHMpO1xuICAgIC8vKiBzb3J0IGJ5IHNlbnRlbmNlXG4gICAgcmVzLnR1cGVsYW5zd2Vycy5mb3JFYWNoKG8gPT4geyBvLl9yYW5raW5nID0gby5fcmFua2luZyAqICBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdCggby5zZW50ZW5jZSApOyB9KTtcbiAgICByZXMudHVwZWxhbnN3ZXJzLnNvcnQoY21wQnlSYW5raW5nVHVwZWwpO1xuICAgIHJldHVybiByZXM7XG4gIH1cbn1cblxuLypcbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlQ2F0ZWdvcmllc09sZChjYXRlZ29yaWVzOiBzdHJpbmdbXSwgY29udGV4dFF1ZXJ5U3RyaW5nOiBzdHJpbmcsXG4gIHRoZU1vZGVsOiBJTWF0Y2guSU1vZGVscyk6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzVHVwZWxBbnN3ZXJzIHtcbiAgdmFyIHJlY29yZHMgPSB0aGVNb2RlbC5yZWNvcmRzO1xuICB2YXIgcnVsZXMgPSB0aGVNb2RlbC5ydWxlcztcbiAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4ge1xuICAgICAgZXJyb3JzOiBbRXJFcnJvci5tYWtlRXJyb3JfRU1QVFlfSU5QVVQoKV0sXG4gICAgICB0dXBlbGFuc3dlcnM6IFtdLFxuICAgICAgdG9rZW5zOiBbXVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBwcm9jZXNzU3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgdGhlTW9kZWwucnVsZXMpO1xuICAgIC8vYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24ob1NlbnRlbmNlKSB7IHJldHVybiBJbnB1dEZpbHRlci5yZWluRm9yY2Uob1NlbnRlbmNlKTsgfSk7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImFmdGVyIHJlaW5mb3JjZVwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICB9KS5qb2luKFwiXFxuXCIpKSA6ICctJyk7XG4gICAgLy92YXIgbWF0Y2hlZEFuc3dlcnMgPSBtYXRjaFJlY29yZHNRdWljayhhU2VudGVuY2VzLCBjYXRlZ29yeSwgcmVjb3Jkcyk7IC8vYVRvb2w6IEFycmF5PElNYXRjaC5JVG9vbD4pOiBhbnkgLyAqIG9iamVjdHN0cmVhbSogLyB7XG4gICAgdmFyIGNhdGVnb3J5U2V0ID0ge307XG4gICAgY2F0ZWdvcmllcy5mb3JFYWNoKGZ1bmN0aW9uIChjYXRlZ29yeSkge1xuICAgICAgY2F0ZWdvcnlTZXRbY2F0ZWdvcnldID0gdHJ1ZTtcbiAgICAgIHZhciBjYXRlZ29yeVNldExvY2FsID0gTW9kZWwuZ2V0QWxsUmVjb3JkQ2F0ZWdvcmllc0ZvclRhcmdldENhdGVnb3J5KHRoZU1vZGVsLCBjYXRlZ29yeSwgdHJ1ZSk7XG4gICAgICBPYmplY3QuYXNzaWduKGNhdGVnb3J5U2V0LCBjYXRlZ29yeVNldExvY2FsKTtcbiAgICB9KTtcblxuICAgIHZhciBtYXRjaGVkQW5zd2VycyA9IG1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzKGFTZW50ZW5jZXNSZWluZm9yY2VkLCBjYXRlZ29yaWVzLCByZWNvcmRzLCBjYXRlZ29yeVNldCk7IC8vYVRvb2w6IEFycmF5PElNYXRjaC5JVG9vbD4pOiBhbnkgLyAqIG9iamVjdHN0cmVhbSAqIC8ge1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICBkZWJ1Z2xvZyhcIiBtYXRjaGVkIEFuc3dlcnNcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRBbnN3ZXJzLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgcGVyZmxvZyhcImZpbHRlcmluZyB0b3BSYW5rZWQgKGE9XCIgKyBtYXRjaGVkQW5zd2Vycy50dXBlbGFuc3dlcnMubGVuZ3RoICsgXCIpLi4uXCIpO1xuICAgIHZhciBtYXRjaGVkRmlsdGVyZWQgPSBPYmplY3QuYXNzaWduKHt9LCBtYXRjaGVkQW5zd2Vycyk7XG4gICAgbWF0Y2hlZEZpbHRlcmVkLnR1cGVsYW5zd2VycyA9IGZpbHRlck9ubHlUb3BSYW5rZWRUdXBlbChtYXRjaGVkQW5zd2Vycy50dXBlbGFuc3dlcnMpO1xuXG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgIGRlYnVnbG9nKFwiIG1hdGNoZWQgdG9wLXJhbmtlZCBBbnN3ZXJzXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkRmlsdGVyZWQsIHVuZGVmaW5lZCwgMikpO1xuICAgIH1cbiAgICBwZXJmbG9nKFwidG90YWxXaGF0aXNXaXRoQ29udGV4dCAoYT1cIiArIG1hdGNoZWRGaWx0ZXJlZC50dXBlbGFuc3dlcnMubGVuZ3RoICsgXCIpXCIpO1xuICAgIHJldHVybiBtYXRjaGVkRmlsdGVyZWQ7IC8vID8/PyBBbnN3ZXJzO1xuICB9XG59XG4qL1xuXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyT25seVRvcFJhbmtlZChyZXN1bHRzOiBBcnJheTxJTWF0Y2guSVdoYXRJc0Fuc3dlcj4pOiBBcnJheTxJTWF0Y2guSVdoYXRJc0Fuc3dlcj4ge1xuICB2YXIgcmVzID0gcmVzdWx0cy5maWx0ZXIoZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgIGlmIChyZXN1bHQuX3JhbmtpbmcgPT09IHJlc3VsdHNbMF0uX3JhbmtpbmcpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAocmVzdWx0Ll9yYW5raW5nID49IHJlc3VsdHNbMF0uX3JhbmtpbmcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkxpc3QgdG8gZmlsdGVyIG11c3QgYmUgb3JkZXJlZFwiKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbiAgcmV0dXJuIHJlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlck9ubHlUb3BSYW5rZWRUdXBlbChyZXN1bHRzOiBBcnJheTxJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyPik6IEFycmF5PElNYXRjaC5JV2hhdElzVHVwZWxBbnN3ZXI+IHtcbiAgdmFyIHJlcyA9IHJlc3VsdHMuZmlsdGVyKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICBpZiAocmVzdWx0Ll9yYW5raW5nID09PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHJlc3VsdC5fcmFua2luZyA+PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJMaXN0IHRvIGZpbHRlciBtdXN0IGJlIG9yZGVyZWRcIik7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG4gIHJldHVybiByZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0luZGlzY3JpbWluYXRlUmVzdWx0KHJlc3VsdHM6IEFycmF5PElNYXRjaC5JV2hhdElzQW5zd2VyPik6IHN0cmluZyB7XG4gIHZhciBjbnQgPSByZXN1bHRzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgcmVzdWx0KSB7XG4gICAgaWYgKHJlc3VsdC5fcmFua2luZyA9PT0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgcmV0dXJuIHByZXYgKyAxO1xuICAgIH1cbiAgfSwgMCk7XG4gIGlmIChjbnQgPiAxKSB7XG4gICAgLy8gc2VhcmNoIGZvciBhIGRpc2NyaW1pbmF0aW5nIGNhdGVnb3J5IHZhbHVlXG4gICAgdmFyIGRpc2NyaW1pbmF0aW5nID0gT2JqZWN0LmtleXMocmVzdWx0c1swXS5yZWNvcmQpLnJlZHVjZShmdW5jdGlvbiAocHJldiwgY2F0ZWdvcnkpIHtcbiAgICAgIGlmICgoY2F0ZWdvcnkuY2hhckF0KDApICE9PSAnXycgJiYgY2F0ZWdvcnkgIT09IHJlc3VsdHNbMF0uY2F0ZWdvcnkpXG4gICAgICAgICYmIChyZXN1bHRzWzBdLnJlY29yZFtjYXRlZ29yeV0gIT09IHJlc3VsdHNbMV0ucmVjb3JkW2NhdGVnb3J5XSkpIHtcbiAgICAgICAgcHJldi5wdXNoKGNhdGVnb3J5KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIFtdKTtcbiAgICBpZiAoZGlzY3JpbWluYXRpbmcubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gXCJNYW55IGNvbXBhcmFibGUgcmVzdWx0cywgcGVyaGFwcyB5b3Ugd2FudCB0byBzcGVjaWZ5IGEgZGlzY3JpbWluYXRpbmcgXCIgKyBkaXNjcmltaW5hdGluZy5qb2luKCcsJyk7XG4gICAgfVxuICAgIHJldHVybiAnWW91ciBxdWVzdGlvbiBkb2VzIG5vdCBoYXZlIGEgc3BlY2lmaWMgYW5zd2VyJztcbiAgfVxuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdFR1cGVsKHJlc3VsdHM6IEFycmF5PElNYXRjaC5JV2hhdElzVHVwZWxBbnN3ZXI+KTogc3RyaW5nIHtcbiAgdmFyIGNudCA9IHJlc3VsdHMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCByZXN1bHQpIHtcbiAgICBpZiAocmVzdWx0Ll9yYW5raW5nID09PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICByZXR1cm4gcHJldiArIDE7XG4gICAgfVxuICB9LCAwKTtcbiAgaWYgKGNudCA+IDEpIHtcbiAgICAvLyBzZWFyY2ggZm9yIGEgZGlzY3JpbWluYXRpbmcgY2F0ZWdvcnkgdmFsdWVcbiAgICB2YXIgZGlzY3JpbWluYXRpbmcgPSBPYmplY3Qua2V5cyhyZXN1bHRzWzBdLnJlY29yZCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBjYXRlZ29yeSkge1xuICAgICAgaWYgKChjYXRlZ29yeS5jaGFyQXQoMCkgIT09ICdfJyAmJiByZXN1bHRzWzBdLmNhdGVnb3JpZXMuaW5kZXhPZihjYXRlZ29yeSkgPCAwKVxuICAgICAgICAmJiAocmVzdWx0c1swXS5yZWNvcmRbY2F0ZWdvcnldICE9PSByZXN1bHRzWzFdLnJlY29yZFtjYXRlZ29yeV0pKSB7XG4gICAgICAgIHByZXYucHVzaChjYXRlZ29yeSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJldjtcbiAgICB9LCBbXSk7XG4gICAgaWYgKGRpc2NyaW1pbmF0aW5nLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIFwiTWFueSBjb21wYXJhYmxlIHJlc3VsdHMsIHBlcmhhcHMgeW91IHdhbnQgdG8gc3BlY2lmeSBhIGRpc2NyaW1pbmF0aW5nIFwiICsgZGlzY3JpbWluYXRpbmcuam9pbignLCcpICsgJyBvciB1c2UgXCJsaXN0IGFsbCAuLi5cIic7XG4gICAgfVxuICAgIHJldHVybiAnWW91ciBxdWVzdGlvbiBkb2VzIG5vdCBoYXZlIGEgc3BlY2lmaWMgYW5zd2VyJztcbiAgfVxuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuIiwiLyoqXG4gKlxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuYW5hbHl6ZVxuICogQGZpbGUgYW5hbHl6ZS50c1xuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxuICovXG5cInVzZSBzdHJpY3RcIjtcbnZhciBJbnB1dEZpbHRlciA9IHJlcXVpcmUoXCIuL2lucHV0RmlsdGVyXCIpO1xudmFyIGRlYnVnID0gcmVxdWlyZShcImRlYnVnXCIpO1xudmFyIGRlYnVnbG9nID0gZGVidWcoJ3doYXRpcycpO1xudmFyIGRlYnVnbG9nViA9IGRlYnVnKCd3aGF0VmlzJyk7XG52YXIgcGVyZmxvZyA9IGRlYnVnKCdwZXJmJyk7XG52YXIgXyA9IHJlcXVpcmUoXCJsb2Rhc2hcIik7XG52YXIgU2VudGVuY2UgPSByZXF1aXJlKFwiLi9zZW50ZW5jZVwiKTtcbnZhciBXb3JkID0gcmVxdWlyZShcIi4vd29yZFwiKTtcbnZhciBBbGdvbCA9IHJlcXVpcmUoXCIuL2FsZ29sXCIpO1xuZnVuY3Rpb24gY21wQnlSZXN1bHRUaGVuUmFua2luZyhhLCBiKSB7XG4gICAgdmFyIGNtcCA9IGEucmVzdWx0LmxvY2FsZUNvbXBhcmUoYi5yZXN1bHQpO1xuICAgIGlmIChjbXApIHtcbiAgICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG4gICAgcmV0dXJuIC0oYS5fcmFua2luZyAtIGIuX3JhbmtpbmcpO1xufVxuZXhwb3J0cy5jbXBCeVJlc3VsdFRoZW5SYW5raW5nID0gY21wQnlSZXN1bHRUaGVuUmFua2luZztcbmZ1bmN0aW9uIGxvY2FsZUNvbXBhcmVBcnJzKGFhcmVzdWx0LCBiYnJlc3VsdCkge1xuICAgIHZhciBjbXAgPSAwO1xuICAgIHZhciBibGVuID0gYmJyZXN1bHQubGVuZ3RoO1xuICAgIGFhcmVzdWx0LmV2ZXJ5KGZ1bmN0aW9uIChhLCBpbmRleCkge1xuICAgICAgICBpZiAoYmxlbiA8PSBpbmRleCkge1xuICAgICAgICAgICAgY21wID0gLTE7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgY21wID0gYS5sb2NhbGVDb21wYXJlKGJicmVzdWx0W2luZGV4XSk7XG4gICAgICAgIGlmIChjbXApIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICBpZiAoY21wKSB7XG4gICAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuICAgIGlmIChibGVuID4gYWFyZXN1bHQubGVuZ3RoKSB7XG4gICAgICAgIGNtcCA9ICsxO1xuICAgIH1cbiAgICByZXR1cm4gMDtcbn1cbmZ1bmN0aW9uIGNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbChhYSwgYmIpIHtcbiAgICB2YXIgY21wID0gbG9jYWxlQ29tcGFyZUFycnMoYWEucmVzdWx0LCBiYi5yZXN1bHQpO1xuICAgIGlmIChjbXApIHtcbiAgICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG4gICAgcmV0dXJuIC0oYWEuX3JhbmtpbmcgLSBiYi5fcmFua2luZyk7XG59XG5leHBvcnRzLmNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbCA9IGNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbDtcbmZ1bmN0aW9uIGNtcEJ5UmFua2luZ0FzY2VuZGluZyhhLCBiKSB7XG4gICAgdmFyIGNtcCA9IChhLl9yYW5raW5nIC0gYi5fcmFua2luZyk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgICByZXR1cm4gY21wO1xuICAgIH1cbiAgICBjbXAgPSBhLnJlc3VsdC5sb2NhbGVDb21wYXJlKGIucmVzdWx0KTtcbiAgICBpZiAoY21wKSB7XG4gICAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuICAgIC8vIGFyZSByZWNvcmRzIGRpZmZlcmVudD9cbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGEucmVjb3JkKS5jb25jYXQoT2JqZWN0LmtleXMoYi5yZWNvcmQpKS5zb3J0KCk7XG4gICAgdmFyIHJlcyA9IGtleXMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBzS2V5KSB7XG4gICAgICAgIGlmIChwcmV2KSB7XG4gICAgICAgICAgICByZXR1cm4gcHJldjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYi5yZWNvcmRbc0tleV0gIT09IGEucmVjb3JkW3NLZXldKSB7XG4gICAgICAgICAgICBpZiAoIWIucmVjb3JkW3NLZXldKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFhLnJlY29yZFtzS2V5XSkge1xuICAgICAgICAgICAgICAgIHJldHVybiArMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBhLnJlY29yZFtzS2V5XS5sb2NhbGVDb21wYXJlKGIucmVjb3JkW3NLZXldKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9LCAwKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5jbXBCeVJhbmtpbmdBc2NlbmRpbmcgPSBjbXBCeVJhbmtpbmdBc2NlbmRpbmc7XG5mdW5jdGlvbiBjbXBCeVJhbmtpbmcoYSwgYikge1xuICAgIHZhciBjbXAgPSAtKGEuX3JhbmtpbmcgLSBiLl9yYW5raW5nKTtcbiAgICBpZiAoY21wKSB7XG4gICAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuICAgIGNtcCA9IGEucmVzdWx0LmxvY2FsZUNvbXBhcmUoYi5yZXN1bHQpO1xuICAgIGlmIChjbXApIHtcbiAgICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG4gICAgLy8gYXJlIHJlY29yZHMgZGlmZmVyZW50P1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYS5yZWNvcmQpLmNvbmNhdChPYmplY3Qua2V5cyhiLnJlY29yZCkpLnNvcnQoKTtcbiAgICB2YXIgcmVzID0ga2V5cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHNLZXkpIHtcbiAgICAgICAgaWYgKHByZXYpIHtcbiAgICAgICAgICAgIHJldHVybiBwcmV2O1xuICAgICAgICB9XG4gICAgICAgIGlmIChiLnJlY29yZFtzS2V5XSAhPT0gYS5yZWNvcmRbc0tleV0pIHtcbiAgICAgICAgICAgIGlmICghYi5yZWNvcmRbc0tleV0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWEucmVjb3JkW3NLZXldKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICsxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGEucmVjb3JkW3NLZXldLmxvY2FsZUNvbXBhcmUoYi5yZWNvcmRbc0tleV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH0sIDApO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmNtcEJ5UmFua2luZyA9IGNtcEJ5UmFua2luZztcbmZ1bmN0aW9uIGNtcEJ5UmFua2luZ1R1cGVsKGEsIGIpIHtcbiAgICB2YXIgY21wID0gLShhLl9yYW5raW5nIC0gYi5fcmFua2luZyk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgICByZXR1cm4gY21wO1xuICAgIH1cbiAgICBjbXAgPSBsb2NhbGVDb21wYXJlQXJycyhhLnJlc3VsdCwgYi5yZXN1bHQpO1xuICAgIGlmIChjbXApIHtcbiAgICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG4gICAgLy8gYXJlIHJlY29yZHMgZGlmZmVyZW50P1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYS5yZWNvcmQpLmNvbmNhdChPYmplY3Qua2V5cyhiLnJlY29yZCkpLnNvcnQoKTtcbiAgICB2YXIgcmVzID0ga2V5cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHNLZXkpIHtcbiAgICAgICAgaWYgKHByZXYpIHtcbiAgICAgICAgICAgIHJldHVybiBwcmV2O1xuICAgICAgICB9XG4gICAgICAgIGlmIChiLnJlY29yZFtzS2V5XSAhPT0gYS5yZWNvcmRbc0tleV0pIHtcbiAgICAgICAgICAgIGlmICghYi5yZWNvcmRbc0tleV0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWEucmVjb3JkW3NLZXldKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICsxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGEucmVjb3JkW3NLZXldLmxvY2FsZUNvbXBhcmUoYi5yZWNvcmRbc0tleV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH0sIDApO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmNtcEJ5UmFua2luZ1R1cGVsID0gY21wQnlSYW5raW5nVHVwZWw7XG5mdW5jdGlvbiBkdW1wTmljZShhbnN3ZXIpIHtcbiAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICBzOiBcIlwiLFxuICAgICAgICBwdXNoOiBmdW5jdGlvbiAocykgeyB0aGlzLnMgPSB0aGlzLnMgKyBzOyB9XG4gICAgfTtcbiAgICB2YXIgcyA9IFwiKipSZXN1bHQgZm9yIGNhdGVnb3J5OiBcIiArIGFuc3dlci5jYXRlZ29yeSArIFwiIGlzIFwiICsgYW5zd2VyLnJlc3VsdCArIFwiXFxuIHJhbms6IFwiICsgYW5zd2VyLl9yYW5raW5nICsgXCJcXG5cIjtcbiAgICByZXN1bHQucHVzaChzKTtcbiAgICBPYmplY3Qua2V5cyhhbnN3ZXIucmVjb3JkKS5mb3JFYWNoKGZ1bmN0aW9uIChzUmVxdWlyZXMsIGluZGV4KSB7XG4gICAgICAgIGlmIChzUmVxdWlyZXMuY2hhckF0KDApICE9PSAnXycpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwicmVjb3JkOiBcIiArIHNSZXF1aXJlcyArIFwiIC0+IFwiICsgYW5zd2VyLnJlY29yZFtzUmVxdWlyZXNdKTtcbiAgICAgICAgfVxuICAgICAgICByZXN1bHQucHVzaCgnXFxuJyk7XG4gICAgfSk7XG4gICAgdmFyIG9TZW50ZW5jZSA9IGFuc3dlci5zZW50ZW5jZTtcbiAgICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGluZGV4KSB7XG4gICAgICAgIHZhciBzV29yZCA9IFwiW1wiICsgaW5kZXggKyBcIl0gOiBcIiArIG9Xb3JkLmNhdGVnb3J5ICsgXCIgXFxcIlwiICsgb1dvcmQuc3RyaW5nICsgXCJcXFwiID0+IFxcXCJcIiArIG9Xb3JkLm1hdGNoZWRTdHJpbmcgKyBcIlxcXCJcIjtcbiAgICAgICAgcmVzdWx0LnB1c2goc1dvcmQgKyBcIlxcblwiKTtcbiAgICB9KTtcbiAgICByZXN1bHQucHVzaChcIi5cXG5cIik7XG4gICAgcmV0dXJuIHJlc3VsdC5zO1xufVxuZXhwb3J0cy5kdW1wTmljZSA9IGR1bXBOaWNlO1xuZnVuY3Rpb24gZHVtcE5pY2VUdXBlbChhbnN3ZXIpIHtcbiAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICBzOiBcIlwiLFxuICAgICAgICBwdXNoOiBmdW5jdGlvbiAocykgeyB0aGlzLnMgPSB0aGlzLnMgKyBzOyB9XG4gICAgfTtcbiAgICB2YXIgcyA9IFwiKipSZXN1bHQgZm9yIGNhdGVnb3JpZXM6IFwiICsgYW5zd2VyLmNhdGVnb3JpZXMuam9pbihcIjtcIikgKyBcIiBpcyBcIiArIGFuc3dlci5yZXN1bHQgKyBcIlxcbiByYW5rOiBcIiArIGFuc3dlci5fcmFua2luZyArIFwiXFxuXCI7XG4gICAgcmVzdWx0LnB1c2gocyk7XG4gICAgT2JqZWN0LmtleXMoYW5zd2VyLnJlY29yZCkuZm9yRWFjaChmdW5jdGlvbiAoc1JlcXVpcmVzLCBpbmRleCkge1xuICAgICAgICBpZiAoc1JlcXVpcmVzLmNoYXJBdCgwKSAhPT0gJ18nKSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaChcInJlY29yZDogXCIgKyBzUmVxdWlyZXMgKyBcIiAtPiBcIiArIGFuc3dlci5yZWNvcmRbc1JlcXVpcmVzXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0LnB1c2goJ1xcbicpO1xuICAgIH0pO1xuICAgIHZhciBvU2VudGVuY2UgPSBhbnN3ZXIuc2VudGVuY2U7XG4gICAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpbmRleCkge1xuICAgICAgICB2YXIgc1dvcmQgPSBcIltcIiArIGluZGV4ICsgXCJdIDogXCIgKyBvV29yZC5jYXRlZ29yeSArIFwiIFxcXCJcIiArIG9Xb3JkLnN0cmluZyArIFwiXFxcIiA9PiBcXFwiXCIgKyBvV29yZC5tYXRjaGVkU3RyaW5nICsgXCJcXFwiXCI7XG4gICAgICAgIHJlc3VsdC5wdXNoKHNXb3JkICsgXCJcXG5cIik7XG4gICAgfSk7XG4gICAgcmVzdWx0LnB1c2goXCIuXFxuXCIpO1xuICAgIHJldHVybiByZXN1bHQucztcbn1cbmV4cG9ydHMuZHVtcE5pY2VUdXBlbCA9IGR1bXBOaWNlVHVwZWw7XG5mdW5jdGlvbiBkdW1wV2VpZ2h0c1RvcCh0b29sbWF0Y2hlcywgb3B0aW9ucykge1xuICAgIHZhciBzID0gJyc7XG4gICAgdG9vbG1hdGNoZXMuZm9yRWFjaChmdW5jdGlvbiAob01hdGNoLCBpbmRleCkge1xuICAgICAgICBpZiAoaW5kZXggPCBvcHRpb25zLnRvcCkge1xuICAgICAgICAgICAgcyA9IHMgKyBcIldoYXRJc0Fuc3dlcltcIiArIGluZGV4ICsgXCJdLi4uXFxuXCI7XG4gICAgICAgICAgICBzID0gcyArIGR1bXBOaWNlKG9NYXRjaCk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcztcbn1cbmV4cG9ydHMuZHVtcFdlaWdodHNUb3AgPSBkdW1wV2VpZ2h0c1RvcDtcbmZ1bmN0aW9uIGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdChyZXMpIHtcbiAgICB2YXIgcmVzdWx0ID0gcmVzLmFuc3dlcnMuZmlsdGVyKGZ1bmN0aW9uIChpUmVzLCBpbmRleCkge1xuICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgZGVidWdsb2coJ3JldGFpbiB0b3BSYW5rZWQ6ICcgKyBpbmRleCArICcgJyArIEpTT04uc3RyaW5naWZ5KGlSZXMpKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaVJlcy5yZXN1bHQgPT09IChyZXMuYW5zd2Vyc1tpbmRleCAtIDFdICYmIHJlcy5hbnN3ZXJzW2luZGV4IC0gMV0ucmVzdWx0KSkge1xuICAgICAgICAgICAgZGVidWdsb2coJ3NraXAnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICByZXN1bHQuc29ydChjbXBCeVJhbmtpbmcpO1xuICAgIHZhciBhID0gT2JqZWN0LmFzc2lnbih7IGFuc3dlcnM6IHJlc3VsdCB9LCByZXMsIHsgYW5zd2VyczogcmVzdWx0IH0pO1xuICAgIGEuYW5zd2VycyA9IHJlc3VsdDtcbiAgICByZXR1cm4gYTtcbn1cbmV4cG9ydHMuZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0ID0gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0O1xuZnVuY3Rpb24gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0VHVwZWwocmVzKSB7XG4gICAgdmFyIHJlc3VsdCA9IHJlcy50dXBlbGFuc3dlcnMuZmlsdGVyKGZ1bmN0aW9uIChpUmVzLCBpbmRleCkge1xuICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgZGVidWdsb2coJyByZXRhaW4gdHVwZWwgJyArIGluZGV4ICsgJyAnICsgSlNPTi5zdHJpbmdpZnkoaVJlcykpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChfLmlzRXF1YWwoaVJlcy5yZXN1bHQsIHJlcy50dXBlbGFuc3dlcnNbaW5kZXggLSAxXSAmJiByZXMudHVwZWxhbnN3ZXJzW2luZGV4IC0gMV0ucmVzdWx0KSkge1xuICAgICAgICAgICAgZGVidWdsb2coJ3NraXAnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICByZXN1bHQuc29ydChjbXBCeVJhbmtpbmdUdXBlbCk7XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24ocmVzLCB7IHR1cGVsYW5zd2VyczogcmVzdWx0IH0pO1xufVxuZXhwb3J0cy5maWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHRUdXBlbCA9IGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdFR1cGVsO1xudmFyIE1hdGNoID0gcmVxdWlyZShcIi4vbWF0Y2hcIik7XG5mdW5jdGlvbiBjYWxjUmFua2luZyhtYXRjaGVkLCBtaXNtYXRjaGVkLCByZWxldmFudENvdW50KSB7XG4gICAgdmFyIGxlbk1hdGNoZWQgPSBPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGg7XG4gICAgdmFyIGZhY3RvciA9IE1hdGNoLmNhbGNSYW5raW5nUHJvZHVjdChtYXRjaGVkKTtcbiAgICBmYWN0b3IgKj0gTWF0aC5wb3coMS41LCBsZW5NYXRjaGVkKTtcbiAgICB2YXIgbGVuTWlzTWF0Y2hlZCA9IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aDtcbiAgICB2YXIgZmFjdG9yMiA9IE1hdGNoLmNhbGNSYW5raW5nUHJvZHVjdChtaXNtYXRjaGVkKTtcbiAgICBmYWN0b3IyICo9IE1hdGgucG93KDAuNCwgbGVuTWlzTWF0Y2hlZCk7XG4gICAgcmV0dXJuIE1hdGgucG93KGZhY3RvcjIgKiBmYWN0b3IsIDEgLyAobGVuTWlzTWF0Y2hlZCArIGxlbk1hdGNoZWQpKTtcbn1cbmV4cG9ydHMuY2FsY1JhbmtpbmcgPSBjYWxjUmFua2luZztcbi8qKlxuICogQSByYW5raW5nIHdoaWNoIGlzIHB1cmVseSBiYXNlZCBvbiB0aGUgbnVtYmVycyBvZiBtYXRjaGVkIGVudGl0aWVzLFxuICogZGlzcmVnYXJkaW5nIGV4YWN0bmVzcyBvZiBtYXRjaFxuICovXG5mdW5jdGlvbiBjYWxjUmFua2luZ1NpbXBsZShtYXRjaGVkLCBtaXNtYXRjaGVkLCBub3VzZSwgcmVsZXZhbnRDb3VudCkge1xuICAgIC8vIDIgOiAwXG4gICAgLy8gMSA6IDBcbiAgICB2YXIgZmFjdG9yID0gbWF0Y2hlZCAqIE1hdGgucG93KDEuNSwgbWF0Y2hlZCkgKiBNYXRoLnBvdygxLjUsIG1hdGNoZWQpO1xuICAgIHZhciBmYWN0b3IyID0gTWF0aC5wb3coMC40LCBtaXNtYXRjaGVkKTtcbiAgICB2YXIgZmFjdG9yMyA9IE1hdGgucG93KDAuNCwgbm91c2UpO1xuICAgIHJldHVybiBNYXRoLnBvdyhmYWN0b3IyICogZmFjdG9yICogZmFjdG9yMywgMSAvIChtaXNtYXRjaGVkICsgbWF0Y2hlZCArIG5vdXNlKSk7XG59XG5leHBvcnRzLmNhbGNSYW5raW5nU2ltcGxlID0gY2FsY1JhbmtpbmdTaW1wbGU7XG5mdW5jdGlvbiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCByZWxldmFudENvdW50KSB7XG4gICAgdmFyIGxlbk1hdGNoZWQgPSBPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGg7XG4gICAgdmFyIGZhY3RvciA9IE1hdGNoLmNhbGNSYW5raW5nUHJvZHVjdChtYXRjaGVkKTtcbiAgICBmYWN0b3IgKj0gTWF0aC5wb3coMS41LCBsZW5NYXRjaGVkKTtcbiAgICB2YXIgbGVuSGFzQ2F0ZWdvcnkgPSBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoO1xuICAgIHZhciBmYWN0b3JIID0gTWF0aC5wb3coMS4xLCBsZW5IYXNDYXRlZ29yeSk7XG4gICAgdmFyIGxlbk1pc01hdGNoZWQgPSBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGg7XG4gICAgdmFyIGZhY3RvcjIgPSBNYXRjaC5jYWxjUmFua2luZ1Byb2R1Y3QobWlzbWF0Y2hlZCk7XG4gICAgZmFjdG9yMiAqPSBNYXRoLnBvdygwLjQsIGxlbk1pc01hdGNoZWQpO1xuICAgIHJldHVybiBNYXRoLnBvdyhmYWN0b3IyICogZmFjdG9ySCAqIGZhY3RvciwgMSAvIChsZW5NaXNNYXRjaGVkICsgbGVuSGFzQ2F0ZWdvcnkgKyBsZW5NYXRjaGVkKSk7XG59XG5leHBvcnRzLmNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkgPSBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5O1xuLyoqXG4gKiBsaXN0IGFsbCB0b3AgbGV2ZWwgcmFua2luZ3NcbiAqL1xuZnVuY3Rpb24gbWF0Y2hSZWNvcmRzSGF2aW5nQ29udGV4dChwU2VudGVuY2VzLCBjYXRlZ29yeSwgcmVjb3JkcywgY2F0ZWdvcnlTZXQpIHtcbiAgICAvL2RlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZHMsIHVuZGVmaW5lZCwgMikpO1xuICAgIHZhciByZWxldmFudFJlY29yZHMgPSByZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgIHJldHVybiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSAmJiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gbnVsbCk7XG4gICAgfSk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIGRlYnVnbG9nKFwiTWF0Y2hSZWNvcmRzSGF2aW5nQ29udGV4dCA6IHJlbGV2YW50IHJlY29yZHMgbnI6XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoKTtcbiAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwic2VudGVuY2VzIGFyZSA6IFwiICsgSlNPTi5zdHJpbmdpZnkocFNlbnRlbmNlcywgdW5kZWZpbmVkLCAyKSkgOiBcIi1cIik7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImNhdGVnb3J5IFwiICsgY2F0ZWdvcnkgKyBcIiBhbmQgY2F0ZWdvcnlzZXQgaXM6IFwiICsgSlNPTi5zdHJpbmdpZnkoY2F0ZWdvcnlTZXQsIHVuZGVmaW5lZCwgMikpIDogXCItXCIpO1xuICAgIGlmIChwcm9jZXNzLmVudi5BQk9UX0ZBU1QgJiYgY2F0ZWdvcnlTZXQpIHtcbiAgICAgICAgLy8gd2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbiBjYXRlZ29yaWVzIHByZXNlbnQgaW4gcmVjb3JkcyBmb3IgZG9tYWlucyB3aGljaCBjb250YWluIHRoZSBjYXRlZ29yeVxuICAgICAgICAvLyB2YXIgY2F0ZWdvcnlzZXQgPSBNb2RlbC5jYWxjdWxhdGVSZWxldmFudFJlY29yZENhdGVnb3JpZXModGhlTW9kZWwsY2F0ZWdvcnkpO1xuICAgICAgICAvL2tub3dpbmcgdGhlIHRhcmdldFxuICAgICAgICBwZXJmbG9nKFwiZ290IGNhdGVnb3J5c2V0IHdpdGggXCIgKyBPYmplY3Qua2V5cyhjYXRlZ29yeVNldCkubGVuZ3RoKTtcbiAgICAgICAgdmFyIGZsID0gMDtcbiAgICAgICAgdmFyIGxmID0gMDtcbiAgICAgICAgdmFyIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gcFNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgICAgIHZhciBmV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICEhY2F0ZWdvcnlTZXRbb1dvcmQuY2F0ZWdvcnldIHx8IFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZmwgPSBmbCArIG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgICAgICAgICBsZiA9IGxmICsgcldvcmRzLmxlbmd0aDtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICAgICAgICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICByV29yZHM6IHJXb3Jkc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICAgIE9iamVjdC5mcmVlemUoYVNpbXBsaWZpZWRTZW50ZW5jZXMpO1xuICAgICAgICBkZWJ1Z2xvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgZmwgKyBcIi0+XCIgKyBsZiArIFwiKVwiKTtcbiAgICAgICAgcGVyZmxvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgZmwgKyBcIi0+XCIgKyBsZiArIFwiKVwiKTtcbiAgICAgICAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgICAgICAgYVNpbXBsaWZpZWRTZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAoYVNlbnRlbmNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGhhc0NhdGVnb3J5ID0ge307XG4gICAgICAgICAgICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fTtcbiAgICAgICAgICAgICAgICB2YXIgbWF0Y2hlZCA9IHt9O1xuICAgICAgICAgICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gYVNlbnRlbmNlLmNudFJlbGV2YW50V29yZHM7XG4gICAgICAgICAgICAgICAgYVNlbnRlbmNlLnJXb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpICYmIHJlY29yZFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFzQ2F0ZWdvcnlbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKChPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoKSA+IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLm9TZW50ZW5jZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiByZWNvcmRbY2F0ZWdvcnldLFxuICAgICAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgZGVidWdsb2coXCJoZXJlIGluIHdlaXJkXCIpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgICAgICAgcFNlbnRlbmNlcy5zZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAoYVNlbnRlbmNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGhhc0NhdGVnb3J5ID0ge307XG4gICAgICAgICAgICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fTtcbiAgICAgICAgICAgICAgICB2YXIgbWF0Y2hlZCA9IHt9O1xuICAgICAgICAgICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gMDtcbiAgICAgICAgICAgICAgICBhU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbnRSZWxldmFudFdvcmRzID0gY250UmVsZXZhbnRXb3JkcyArIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCkgJiYgcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzQ2F0ZWdvcnlbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKChPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoKSA+IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IHJlY29yZFtjYXRlZ29yeV0sXG4gICAgICAgICAgICAgICAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXMuc29ydChjbXBCeVJlc3VsdFRoZW5SYW5raW5nKTtcbiAgICBkZWJ1Z2xvZyhcIiBhZnRlciBzb3J0XCIgKyByZXMubGVuZ3RoKTtcbiAgICB2YXIgcmVzdWx0ID0gT2JqZWN0LmFzc2lnbih7fSwgcFNlbnRlbmNlcywgeyBhbnN3ZXJzOiByZXMgfSk7XG4gICAgcmV0dXJuIGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdChyZXN1bHQpO1xufVxuZXhwb3J0cy5tYXRjaFJlY29yZHNIYXZpbmdDb250ZXh0ID0gbWF0Y2hSZWNvcmRzSGF2aW5nQ29udGV4dDtcbi8qKlxuICogbGlzdCBhbGwgdG9wIGxldmVsIHJhbmtpbmdzXG4gKi9cbmZ1bmN0aW9uIG1hdGNoUmVjb3Jkc1R1cGVsSGF2aW5nQ29udGV4dChwU2VudGVuY2VzLCBjYXRlZ29yaWVzLCByZWNvcmRzLCBjYXRlZ29yeVNldCkge1xuICAgIC8vIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZHMsIHVuZGVmaW5lZCwgMikpO1xuICAgIHZhciBjYXRlZ29yeUYgPSBjYXRlZ29yaWVzWzBdO1xuICAgIHZhciByZWxldmFudFJlY29yZHMgPSByZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgIHJldHVybiAocmVjb3JkW2NhdGVnb3J5Rl0gIT09IHVuZGVmaW5lZCkgJiYgKHJlY29yZFtjYXRlZ29yeUZdICE9PSBudWxsKTtcbiAgICB9KTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgZGVidWdsb2coXCJyZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCk7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcInNlbnRlbmNlcyBhcmUgOiBcIiArIEpTT04uc3RyaW5naWZ5KHBTZW50ZW5jZXMsIHVuZGVmaW5lZCwgMikpIDogXCItXCIpO1xuICAgIGlmIChwcm9jZXNzLmVudi5BQk9UX0ZBU1QgJiYgY2F0ZWdvcnlTZXQpIHtcbiAgICAgICAgLy8gd2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbiBjYXRlZ29yaWVzIHByZXNlbnQgaW4gcmVjb3JkcyBmb3IgZG9tYWlucyB3aGljaCBjb250YWluIHRoZSBjYXRlZ29yeVxuICAgICAgICAvLyB2YXIgY2F0ZWdvcnlzZXQgPSBNb2RlbC5jYWxjdWxhdGVSZWxldmFudFJlY29yZENhdGVnb3JpZXModGhlTW9kZWwsY2F0ZWdvcnkpO1xuICAgICAgICAvL2tub3dpbmcgdGhlIHRhcmdldFxuICAgICAgICBwZXJmbG9nKFwiZ290IGNhdGVnb3J5c2V0IHdpdGggXCIgKyBPYmplY3Qua2V5cyhjYXRlZ29yeVNldCkubGVuZ3RoKTtcbiAgICAgICAgdmFyIGZsID0gMDtcbiAgICAgICAgdmFyIGxmID0gMDtcbiAgICAgICAgdmFyIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gcFNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgICAgIHZhciBmV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICEhY2F0ZWdvcnlTZXRbb1dvcmQuY2F0ZWdvcnldIHx8IFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZmwgPSBmbCArIG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgICAgICAgICBsZiA9IGxmICsgcldvcmRzLmxlbmd0aDtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICAgICAgICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICByV29yZHM6IHJXb3Jkc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICAgIE9iamVjdC5mcmVlemUoYVNpbXBsaWZpZWRTZW50ZW5jZXMpO1xuICAgICAgICBwZXJmbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyBmbCArIFwiLT5cIiArIGxmICsgXCIpXCIpO1xuICAgICAgICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICAgICAgICBhU2ltcGxpZmllZFNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgaGFzQ2F0ZWdvcnkgPSB7fTtcbiAgICAgICAgICAgICAgICB2YXIgbWlzbWF0Y2hlZCA9IHt9O1xuICAgICAgICAgICAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICAgICAgICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSBhU2VudGVuY2UuY250UmVsZXZhbnRXb3JkcztcbiAgICAgICAgICAgICAgICBhU2VudGVuY2UucldvcmRzLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCkgJiYgcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYXNDYXRlZ29yeVtvV29yZC5tYXRjaGVkU3RyaW5nXSA9IDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAoKE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aCArIE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5sZW5ndGgpID4gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2Uub1NlbnRlbmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yaWVzOiBjYXRlZ29yaWVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiBleHRyYWN0UmVzdWx0KGNhdGVnb3JpZXMsIHJlY29yZCksXG4gICAgICAgICAgICAgICAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgICAgICAgcFNlbnRlbmNlcy5zZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAoYVNlbnRlbmNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGhhc0NhdGVnb3J5ID0ge307XG4gICAgICAgICAgICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fTtcbiAgICAgICAgICAgICAgICB2YXIgbWF0Y2hlZCA9IHt9O1xuICAgICAgICAgICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gMDtcbiAgICAgICAgICAgICAgICBhU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbnRSZWxldmFudFdvcmRzID0gY250UmVsZXZhbnRXb3JkcyArIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCkgJiYgcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzQ2F0ZWdvcnlbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKChPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoKSA+IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yaWVzOiBjYXRlZ29yaWVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiBleHRyYWN0UmVzdWx0KGNhdGVnb3JpZXMsIHJlY29yZCksXG4gICAgICAgICAgICAgICAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXMuc29ydChjbXBCeVJlc3VsdFRoZW5SYW5raW5nVHVwZWwpO1xuICAgIHZhciByZXN1bHQxID0gT2JqZWN0LmFzc2lnbih7IHR1cGVsYW5zd2VyczogcmVzIH0sIHBTZW50ZW5jZXMpO1xuICAgIHJldHVybiBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHRUdXBlbChyZXN1bHQxKTtcbn1cbmV4cG9ydHMubWF0Y2hSZWNvcmRzVHVwZWxIYXZpbmdDb250ZXh0ID0gbWF0Y2hSZWNvcmRzVHVwZWxIYXZpbmdDb250ZXh0O1xuZnVuY3Rpb24gbWF0Y2hSZWNvcmRzKGFTZW50ZW5jZXMsIGNhdGVnb3J5LCByZWNvcmRzKSB7XG4gICAgLy8gaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAvLyAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZHMsIHVuZGVmaW5lZCwgMikpO1xuICAgIC8vIH1cbiAgICB2YXIgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICByZXR1cm4gKHJlY29yZFtjYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkgJiYgKHJlY29yZFtjYXRlZ29yeV0gIT09IG51bGwpO1xuICAgIH0pO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBkZWJ1Z2xvZyhcInJlbGV2YW50IHJlY29yZHMgbnI6XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoKTtcbiAgICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgIGFTZW50ZW5jZXMuc2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fTtcbiAgICAgICAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICAgICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IDA7XG4gICAgICAgICAgICBhU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY250UmVsZXZhbnRXb3JkcyA9IGNudFJlbGV2YW50V29yZHMgKyAxO1xuICAgICAgICAgICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2UsXG4gICAgICAgICAgICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDogcmVjb3JkW2NhdGVnb3J5XSxcbiAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nKG1hdGNoZWQsIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmcpO1xuICAgIHZhciByZXN1bHQgPSBPYmplY3QuYXNzaWduKHt9LCBhU2VudGVuY2VzLCB7IGFuc3dlcnM6IHJlcyB9KTtcbiAgICByZXR1cm4gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0KHJlc3VsdCk7XG59XG5leHBvcnRzLm1hdGNoUmVjb3JkcyA9IG1hdGNoUmVjb3JkcztcbmZ1bmN0aW9uIG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzQ2F0ZWdvcnlTZXQoYVNlbnRlbmNlcywgY2F0ZWdvcnlTZXQsIHRyYWNrKSB7XG4gICAgcmV0dXJuIGFTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgIHZhciBhRG9tYWlucyA9IFtdO1xuICAgICAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJkb21haW5cIikge1xuICAgICAgICAgICAgICAgIGFEb21haW5zLnB1c2gob1dvcmQubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcIm1ldGFcIikge1xuICAgICAgICAgICAgICAgIC8vIGUuZy4gZG9tYWluIFhYWFxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAhIWNhdGVnb3J5U2V0W29Xb3JkLmNhdGVnb3J5XTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRyYWNrLmZsICs9IG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgICAgIHRyYWNrLmxmICs9IHJXb3Jkcy5sZW5ndGg7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkb21haW5zOiBhRG9tYWlucyxcbiAgICAgICAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCxcbiAgICAgICAgICAgIHJXb3JkczogcldvcmRzXG4gICAgICAgIH07XG4gICAgfSk7XG59XG5mdW5jdGlvbiBtYWtlU2ltcGxpZmllZFNlbnRlbmNlcyhhU2VudGVuY2VzLCB0cmFjaykge1xuICAgIHJldHVybiBhU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICB2YXIgZG9tYWlucyA9IFtdO1xuICAgICAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJkb21haW5cIikge1xuICAgICAgICAgICAgICAgIGRvbWFpbnMucHVzaChvV29yZC5tYXRjaGVkU3RyaW5nKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwibWV0YVwiKSB7XG4gICAgICAgICAgICAgICAgLy8gZS5nLiBkb21haW4gWFhYXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpO1xuICAgICAgICB9KTtcbiAgICAgICAgdHJhY2suZmwgKz0gb1NlbnRlbmNlLmxlbmd0aDtcbiAgICAgICAgdHJhY2subGYgKz0gcldvcmRzLmxlbmd0aDtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgICAgICAgZG9tYWluczogZG9tYWlucyxcbiAgICAgICAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsXG4gICAgICAgICAgICByV29yZHM6IHJXb3Jkc1xuICAgICAgICB9O1xuICAgIH0pO1xufVxuZnVuY3Rpb24gbWF0Y2hSZWNvcmRzUXVpY2soYVNlbnRlbmNlcywgY2F0ZWdvcnksIHJlY29yZHMsIGNhdGVnb3J5U2V0KSB7XG4gICAgLy9pZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgIC8vICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRzLCB1bmRlZmluZWQsIDIpKTtcbiAgICAvL31cbiAgICBPYmplY3QuZnJlZXplKGNhdGVnb3J5U2V0KTtcbiAgICBwZXJmbG9nKFwibWF0Y2hSZWNvcmRzUXVpY2sgLi4uKHI9XCIgKyByZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBhU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIikgd2l0aCBjYXRlZ29yeSA6IFxcXCJcIiArIGNhdGVnb3J5ICsgJ1xcXCInKTtcbiAgICB2YXIgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICByZXR1cm4gKHJlY29yZFtjYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkgJiYgKHJlY29yZFtjYXRlZ29yeV0gIT09IG51bGwpO1xuICAgIH0pO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBkZWJ1Z2xvZyhcIm1hdGNoUmVjb3Jkc1F1aWNrOiByZWxldmFudCByZWNvcmRzIChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiKSBzZW50ZW5jZXMgXCIgKyBhU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGgpO1xuICAgIHBlcmZsb2coXCJyZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHNlbnRlbmNlcyBcIiArIGFTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCk7XG4gICAgaWYgKHByb2Nlc3MuZW52LkFCT1RfRkFTVCAmJiBjYXRlZ29yeVNldCkge1xuICAgICAgICAvLyB3ZSBhcmUgb25seSBpbnRlcmVzdGVkIGluIGNhdGVnb3JpZXMgcHJlc2VudCBpbiByZWNvcmRzIGZvciBkb21haW5zIHdoaWNoIGNvbnRhaW4gdGhlIGNhdGVnb3J5XG4gICAgICAgIC8vIHZhciBjYXRlZ29yeXNldCA9IE1vZGVsLmNhbGN1bGF0ZVJlbGV2YW50UmVjb3JkQ2F0ZWdvcmllcyh0aGVNb2RlbCxjYXRlZ29yeSk7XG4gICAgICAgIC8va25vd2luZyB0aGUgdGFyZ2V0XG4gICAgICAgIHBlcmZsb2coXCJnb3QgY2F0ZWdvcnlzZXQgd2l0aCBcIiArIE9iamVjdC5rZXlzKGNhdGVnb3J5U2V0KS5sZW5ndGgpO1xuICAgICAgICB2YXIgb2JqID0ge1xuICAgICAgICAgICAgZmw6IDAsXG4gICAgICAgICAgICBsZjogMFxuICAgICAgICB9O1xuICAgICAgICB2YXIgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBtYWtlU2ltcGxpZmllZFNlbnRlbmNlc0NhdGVnb3J5U2V0KGFTZW50ZW5jZXMsIGNhdGVnb3J5U2V0LCBvYmopO1xuICAgICAgICAvKmFTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgdmFyIGFEb21haW5zID0gW10gYXMgc3RyaW5nW107XG4gICAgICAgICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwiZG9tYWluXCIpIHtcbiAgICAgICAgICAgICAgYURvbWFpbnMucHVzaChvV29yZC5tYXRjaGVkU3RyaW5nKTtcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcIm1ldGFcIikge1xuICAgICAgICAgICAgICAvLyBlLmcuIGRvbWFpbiBYWFhcbiAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICEhY2F0ZWdvcnlTZXRbb1dvcmQuY2F0ZWdvcnldO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGZsID0gZmwgKyBvU2VudGVuY2UubGVuZ3RoO1xuICAgICAgICAgIGxmID0gbGYgKyByV29yZHMubGVuZ3RoO1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkb21haW5zOiBhRG9tYWlucyxcbiAgICAgICAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCxcbiAgICAgICAgICAgIHJXb3JkczogcldvcmRzXG4gICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICAgICovXG4gICAgICAgIHBlcmZsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBhU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIG9iai5mbCArIFwiLT5cIiArIG9iai5sZiArIFwiKVwiKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHZhciB0cmFjayA9IHtcbiAgICAgICAgICAgIGZsOiAwLFxuICAgICAgICAgICAgbGY6IDBcbiAgICAgICAgfTtcbiAgICAgICAgdmFyIGRvbWFpbnMgPSBbXTtcbiAgICAgICAgdmFyIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXMoYVNlbnRlbmNlcywgdHJhY2spO1xuICAgICAgICAvKlxuICAgICAgICAuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJoZXJlIHNlbnRlbmNlXCIgKyBTZW50ZW5jZS5kdW1wTmljZShvU2VudGVuY2UpKTtcbiAgICAgICAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJkb21haW5cIikge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkdPVCBBIERPTUFJTiFcIiArIG9Xb3JkLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICAgICAgICBkb21haW5zLnB1c2gob1dvcmQubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJtZXRhXCIpIHtcbiAgICAgICAgICAgICAgLy8gZS5nLiBkb21haW4gWFhYXG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBmbCA9IGZsICsgb1NlbnRlbmNlLmxlbmd0aDtcbiAgICAgICAgICBsZiA9IGxmICsgcldvcmRzLmxlbmd0aDtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICAgICAgICBkb21haW5zOiBkb21haW5zLFxuICAgICAgICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCxcbiAgICAgICAgICAgIHJXb3JkczogcldvcmRzXG4gICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICAgICovXG4gICAgICAgIHBlcmZsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBhU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIHRyYWNrLmZsICsgXCItPlwiICsgdHJhY2subGYgKyBcIilcIik7XG4gICAgfVxuICAgIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgYVNpbXBsaWZpZWRTZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAoYVNlbnRlbmNlKSB7XG4gICAgICAgICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICAgICAgICB2YXIgbWlzbWF0Y2hlZCA9IDA7XG4gICAgICAgICAgICB2YXIgbWF0Y2hlZCA9IDA7XG4gICAgICAgICAgICB2YXIgbm91c2UgPSAwO1xuICAgICAgICAgICAgdmFyIG1pc3NpbmdjYXQgPSAwO1xuICAgICAgICAgICAgYVNlbnRlbmNlLnJXb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgICAgIGlmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICsrbWF0Y2hlZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICsrbWlzbWF0Y2hlZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICE9PSBcImNhdGVnb3J5XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vdXNlICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXJlY29yZFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pc3NpbmdjYXQgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKGFTZW50ZW5jZS5kb21haW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmIChyZWNvcmQuX2RvbWFpbiAhPT0gYVNlbnRlbmNlLmRvbWFpbnNbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgbWlzbWF0Y2hlZCA9IDMwMDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBtYXRjaGVkICs9IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gaWYobWF0Y2hlZCA+IDAgfHwgbWlzbWF0Y2hlZCA+IDAgKSB7XG4gICAgICAgICAgICAvLyAgIGNvbnNvbGUubG9nKFwiIG1cIiArIG1hdGNoZWQgKyBcIiBtaXNtYXRjaGVkXCIgKyBtaXNtYXRjaGVkKTtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYVNlbnRlbmNlLm9TZW50ZW5jZSkpO1xuICAgICAgICAgICAgaWYgKG1hdGNoZWQgPiBtaXNtYXRjaGVkKSB7XG4gICAgICAgICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLm9TZW50ZW5jZSxcbiAgICAgICAgICAgICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiByZWNvcmRbY2F0ZWdvcnldLFxuICAgICAgICAgICAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmdTaW1wbGUobWF0Y2hlZCwgbWlzbWF0Y2hlZCwgKG5vdXNlICsgbWlzc2luZ2NhdCksIGFTZW50ZW5jZS5jbnRSZWxldmFudFdvcmRzKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBwZXJmbG9nKFwic29ydCAoYT1cIiArIHJlcy5sZW5ndGggKyBcIilcIik7XG4gICAgcmVzLnNvcnQoY21wQnlSZXN1bHRUaGVuUmFua2luZyk7XG4gICAgcGVyZmxvZyhcImZpbHRlclJldGFpbiAuLi5cIik7XG4gICAgdmFyIHJlc3VsdDIgPSBPYmplY3QuYXNzaWduKHsgYW5zd2VyczogcmVzIH0sIGFTZW50ZW5jZXMpO1xuICAgIHZhciByZXN1bHQgPSBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHQocmVzdWx0Mik7XG4gICAgZGVidWdsb2coXCJtYXRjaFJlY29yZHNRdWljayBkb25lOiAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgYVNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgYT1cIiArIHJlc3VsdC5hbnN3ZXJzLmxlbmd0aCArIFwiKVwiKTtcbiAgICBwZXJmbG9nKFwibWF0Y2hSZWNvcmRzUXVpY2sgZG9uZTogKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIGFTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGE9XCIgKyByZXN1bHQuYW5zd2Vycy5sZW5ndGggKyBcIilcIik7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cbmV4cG9ydHMubWF0Y2hSZWNvcmRzUXVpY2sgPSBtYXRjaFJlY29yZHNRdWljaztcbmZ1bmN0aW9uIGV4dHJhY3RSZXN1bHQoY2F0ZWdvcmllcywgcmVjb3JkKSB7XG4gICAgcmV0dXJuIGNhdGVnb3JpZXMubWFwKGZ1bmN0aW9uIChjYXRlZ29yeSkgeyByZXR1cm4gcmVjb3JkW2NhdGVnb3J5XSB8fCBcIm4vYVwiOyB9KTtcbn1cbmZ1bmN0aW9uIG1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzKHBTZW50ZW5jZXMsIGNhdGVnb3JpZXMsIHJlY29yZHMsIGNhdGVnb3J5U2V0KSB7XG4gICAgLy8gaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAvLyAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgLy8gfVxuICAgIE9iamVjdC5mcmVlemUoY2F0ZWdvcnlTZXQpO1xuICAgIHZhciBjYXRlZ29yeUYgPSBjYXRlZ29yaWVzWzBdO1xuICAgIGRlYnVnbG9nKFwibWF0Y2hSZWNvcmRzUXVpY2tNdWx0aXBsZUNhdGVnb3JpZXMgKHI9XCIgKyByZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIilcXG4gY2F0ZWdvcmllczpcIiArIGNhdGVnb3JpZXMuam9pbihcIlxcblwiKSk7XG4gICAgcGVyZmxvZyhcIm1hdGNoUmVjb3Jkc1F1aWNrTXVsdCAuLi4ocj1cIiArIHJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiKVwiKTtcbiAgICB2YXIgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICByZXR1cm4gKHJlY29yZFtjYXRlZ29yeUZdICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnlGXSAhPT0gbnVsbCk7XG4gICAgfSk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIGRlYnVnbG9nKFwicmVsZXZhbnQgcmVjb3JkcyB3aXRoIGZpcnN0IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiKVwiKTtcbiAgICBwZXJmbG9nKFwicmVsZXZhbnQgcmVjb3JkcyB3aXRoIGZpcnN0IG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHNlbnRlbmNlcyBcIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCk7XG4gICAgaWYgKHByb2Nlc3MuZW52LkFCT1RfRkFTVCAmJiBjYXRlZ29yeVNldCkge1xuICAgICAgICAvLyB3ZSBhcmUgb25seSBpbnRlcmVzdGVkIGluIGNhdGVnb3JpZXMgcHJlc2VudCBpbiByZWNvcmRzIGZvciBkb21haW5zIHdoaWNoIGNvbnRhaW4gdGhlIGNhdGVnb3J5XG4gICAgICAgIC8vIHZhciBjYXRlZ29yeXNldCA9IE1vZGVsLmNhbGN1bGF0ZVJlbGV2YW50UmVjb3JkQ2F0ZWdvcmllcyh0aGVNb2RlbCxjYXRlZ29yeSk7XG4gICAgICAgIC8va25vd2luZyB0aGUgdGFyZ2V0XG4gICAgICAgIHBlcmZsb2coXCJnb3QgY2F0ZWdvcnlzZXQgd2l0aCBcIiArIE9iamVjdC5rZXlzKGNhdGVnb3J5U2V0KS5sZW5ndGgpO1xuICAgICAgICB2YXIgb2JqID0geyBmbDogMCwgbGY6IDAgfTtcbiAgICAgICAgdmFyIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXNDYXRlZ29yeVNldChwU2VudGVuY2VzLCBjYXRlZ29yeVNldCwgb2JqKTtcbiAgICAgICAgcGVyZmxvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgb2JqLmZsICsgXCItPlwiICsgb2JqLmxmICsgXCIpXCIpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgZGVidWdsb2coXCJub3QgYWJvdF9mYXN0ICFcIik7XG4gICAgICAgIHZhciB0cmFjayA9IHsgZmw6IDAsIGxmOiAwIH07XG4gICAgICAgIHZhciBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzKHBTZW50ZW5jZXMsIHRyYWNrKTtcbiAgICAgICAgLypcbiAgICAgICAgICAgIHBTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIGZsID0gZmwgKyBvU2VudGVuY2UubGVuZ3RoO1xuICAgICAgICAgICAgICBsZiA9IGxmICsgcldvcmRzLmxlbmd0aDtcbiAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgICAgICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgIHJXb3JkczogcldvcmRzXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICovXG4gICAgICAgIGRlYnVnbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyB0cmFjay5mbCArIFwiLT5cIiArIHRyYWNrLmxmICsgXCIpXCIpO1xuICAgICAgICBwZXJmbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyB0cmFjay5mbCArIFwiLT5cIiArIHRyYWNrLmxmICsgXCIpXCIpO1xuICAgIH1cbiAgICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgICAgICAgdmFyIG1pc21hdGNoZWQgPSAwO1xuICAgICAgICAgICAgdmFyIG1hdGNoZWQgPSAwO1xuICAgICAgICAgICAgdmFyIG5vdXNlID0gMDtcbiAgICAgICAgICAgIHZhciBtaXNzaW5nY2F0ID0gMDtcbiAgICAgICAgICAgIGFTZW50ZW5jZS5yV29yZHMuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICArK21hdGNoZWQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICArK21pc21hdGNoZWQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAhPT0gXCJjYXRlZ29yeVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub3VzZSArPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaXNzaW5nY2F0ICs9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChhU2VudGVuY2UuZG9tYWlucy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVjb3JkLl9kb21haW4gIT09IGFTZW50ZW5jZS5kb21haW5zWzBdKSB7XG4gICAgICAgICAgICAgICAgICAgIG1pc21hdGNoZWQgPSAzMDAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZCArPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGlmKG1hdGNoZWQgPiAwIHx8IG1pc21hdGNoZWQgPiAwICkge1xuICAgICAgICAgICAgLy8gICBjb25zb2xlLmxvZyhcIiBtXCIgKyBtYXRjaGVkICsgXCIgbWlzbWF0Y2hlZFwiICsgbWlzbWF0Y2hlZCk7XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGFTZW50ZW5jZS5vU2VudGVuY2UpKTtcbiAgICAgICAgICAgIGlmIChtYXRjaGVkID4gbWlzbWF0Y2hlZCkge1xuICAgICAgICAgICAgICAgIHZhciByZWMgPSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2Uub1NlbnRlbmNlLFxuICAgICAgICAgICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcmllczogY2F0ZWdvcmllcyxcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiBleHRyYWN0UmVzdWx0KGNhdGVnb3JpZXMsIHJlY29yZCksXG4gICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ1NpbXBsZShtYXRjaGVkLCBtaXNtYXRjaGVkLCAobm91c2UgKyBtaXNzaW5nY2F0KSwgYVNlbnRlbmNlLmNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAvKiAgIGlmKHJlY29yZFtcImFwcElkXCJdID09PVwiRjE1NjZcIikge1xuICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJoZXJlIEYxNTY2XCIgKyBKU09OLnN0cmluZ2lmeShyZWMpKTtcbiAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaGVyZSBtYXRjaGVkXCIgKyBtYXRjaGVkICsgXCIgbWlzbWF0Y2hlZFwiICsgbWlzbWF0Y2hlZCArIFwiIG5vdXNlIFwiICsgKG5vdXNlICsgbWlzc2luZ2NhdCkpO1xuICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJoZXJlIGNudFJlbGV2YW50IDpcIiArIGFTZW50ZW5jZS5jbnRSZWxldmFudFdvcmRzKTtcbiAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgaWYocmVjb3JkW1wiYXBwSWRcIl0gPT09XCJGMDczMUFcIikge1xuICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJoZXJlIEYwNzMxQVwiICsgSlNPTi5zdHJpbmdpZnkocmVjKSk7XG4gICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImhlcmUgbWF0Y2hlZFwiICsgbWF0Y2hlZCArIFwiIG1pc21hdGNoZWRcIiArIG1pc21hdGNoZWQgKyBcIiBub3VzZSBcIiArIChub3VzZSArIG1pc3NpbmdjYXQpKTtcbiAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaGVyZSBjbnRSZWxldmFudCA6XCIgKyBhU2VudGVuY2UuY250UmVsZXZhbnRXb3Jkcyk7XG4gICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgcmVzLnB1c2gocmVjKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcGVyZmxvZyhcInNvcnQgKGE9XCIgKyByZXMubGVuZ3RoICsgXCIpXCIpO1xuICAgIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbCk7XG4gICAgcGVyZmxvZyhcImZpbHRlclJldGFpbiAuLi5cIik7XG4gICAgdmFyIHJlc3VsdDEgPSBPYmplY3QuYXNzaWduKHsgdHVwZWxhbnN3ZXJzOiByZXMgfSwgcFNlbnRlbmNlcyk7XG4gICAgdmFyIHJlc3VsdDIgPSBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHRUdXBlbChyZXN1bHQxKTtcbiAgICBwZXJmbG9nKFwibWF0Y2hSZWNvcmRzUXVpY2sgZG9uZTogKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGE9XCIgKyByZXMubGVuZ3RoICsgXCIpXCIpO1xuICAgIHJldHVybiByZXN1bHQyO1xufVxuZXhwb3J0cy5tYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcyA9IG1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzO1xuZnVuY3Rpb24gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KHdvcmQsIHRhcmdldGNhdGVnb3J5LCBydWxlcywgd2hvbGVzZW50ZW5jZSkge1xuICAgIC8vY29uc29sZS5sb2coXCJjbGFzc2lmeSBcIiArIHdvcmQgKyBcIiBcIiAgKyB0YXJnZXRjYXRlZ29yeSk7XG4gICAgdmFyIGNhdHMgPSBJbnB1dEZpbHRlci5jYXRlZ29yaXplQVdvcmQod29yZCwgcnVsZXMsIHdob2xlc2VudGVuY2UsIHt9KTtcbiAgICAvLyBUT0RPIHF1YWxpZnlcbiAgICBjYXRzID0gY2F0cy5maWx0ZXIoZnVuY3Rpb24gKGNhdCkge1xuICAgICAgICByZXR1cm4gY2F0LmNhdGVnb3J5ID09PSB0YXJnZXRjYXRlZ29yeTtcbiAgICB9KTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShjYXRzKSk7XG4gICAgaWYgKGNhdHMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBjYXRzWzBdLm1hdGNoZWRTdHJpbmc7XG4gICAgfVxufVxuZnVuY3Rpb24gYW5hbHl6ZUNhdGVnb3J5KGNhdGVnb3J5d29yZCwgcnVsZXMsIHdob2xlc2VudGVuY2UpIHtcbiAgICByZXR1cm4gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KGNhdGVnb3J5d29yZCwgJ2NhdGVnb3J5JywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xufVxuZXhwb3J0cy5hbmFseXplQ2F0ZWdvcnkgPSBhbmFseXplQ2F0ZWdvcnk7XG5mdW5jdGlvbiBzcGxpdEF0Q29tbWFBbmQoc3RyKSB7XG4gICAgdmFyIHIgPSBzdHIuc3BsaXQoLyhcXGJhbmRcXGIpfFssXS8pO1xuICAgIHIgPSByLmZpbHRlcihmdW5jdGlvbiAobywgaW5kZXgpIHtcbiAgICAgICAgaWYgKGluZGV4ICUgMiA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICB2YXIgcnRyaW1tZWQgPSByLm1hcChmdW5jdGlvbiAobykge1xuICAgICAgICByZXR1cm4gbmV3IFN0cmluZyhvKS50cmltKCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJ0cmltbWVkO1xufVxuZXhwb3J0cy5zcGxpdEF0Q29tbWFBbmQgPSBzcGxpdEF0Q29tbWFBbmQ7XG4vKipcbiAqIEEgc2ltcGxlIGltcGxlbWVudGF0aW9uLCBzcGxpdHRpbmcgYXQgYW5kIGFuZCAsXG4gKi9cbmZ1bmN0aW9uIGFuYWx5emVDYXRlZ29yeU11bHRPbmx5QW5kQ29tbWEoY2F0ZWdvcnlsaXN0LCBydWxlcywgd2hvbGVzZW50ZW5jZSkge1xuICAgIHZhciBydHJpbW1lZCA9IHNwbGl0QXRDb21tYUFuZChjYXRlZ29yeWxpc3QpO1xuICAgIHZhciByY2F0ID0gcnRyaW1tZWQubWFwKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgIHJldHVybiBhbmFseXplQ2F0ZWdvcnkobywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xuICAgIH0pO1xuICAgIGlmIChyY2F0LmluZGV4T2YodW5kZWZpbmVkKSA+PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignXCInICsgcnRyaW1tZWRbcmNhdC5pbmRleE9mKHVuZGVmaW5lZCldICsgJ1wiIGlzIG5vdCBhIGNhdGVnb3J5IScpO1xuICAgIH1cbiAgICByZXR1cm4gcmNhdDtcbn1cbmV4cG9ydHMuYW5hbHl6ZUNhdGVnb3J5TXVsdE9ubHlBbmRDb21tYSA9IGFuYWx5emVDYXRlZ29yeU11bHRPbmx5QW5kQ29tbWE7XG5mdW5jdGlvbiBmaWx0ZXJBY2NlcHRpbmdPbmx5KHJlcywgY2F0ZWdvcmllcykge1xuICAgIHJldHVybiByZXMuZmlsdGVyKGZ1bmN0aW9uIChhU2VudGVuY2UsIGlJbmRleCkge1xuICAgICAgICByZXR1cm4gYVNlbnRlbmNlLmV2ZXJ5KGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhdGVnb3JpZXMuaW5kZXhPZihvV29yZC5jYXRlZ29yeSkgPj0gMDtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5leHBvcnRzLmZpbHRlckFjY2VwdGluZ09ubHkgPSBmaWx0ZXJBY2NlcHRpbmdPbmx5O1xudmFyIEVyYmFzZSA9IHJlcXVpcmUoXCIuL2VyYmFzZVwiKTtcbnZhciBzV29yZHMgPSB7fTtcbmZ1bmN0aW9uIHJlc2V0Q2FjaGUoKSB7XG4gICAgc1dvcmRzID0ge307XG59XG5leHBvcnRzLnJlc2V0Q2FjaGUgPSByZXNldENhY2hlO1xuZnVuY3Rpb24gcHJvY2Vzc1N0cmluZyhxdWVyeSwgcnVsZXMpIHtcbiAgICBpZiAoIXByb2Nlc3MuZW52LkFCT1RfT0xETUFUQ0gpIHtcbiAgICAgICAgcmV0dXJuIEVyYmFzZS5wcm9jZXNzU3RyaW5nKHF1ZXJ5LCBydWxlcywgcnVsZXMud29yZENhY2hlKTtcbiAgICB9XG4gICAgdmFyIG1hdGNoZWQgPSBJbnB1dEZpbHRlci5hbmFseXplU3RyaW5nKHF1ZXJ5LCBydWxlcywgc1dvcmRzKTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcIkFmdGVyIG1hdGNoZWQgXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkKSk7XG4gICAgfVxuICAgIHZhciBhU2VudGVuY2VzID0gSW5wdXRGaWx0ZXIuZXhwYW5kTWF0Y2hBcnIobWF0Y2hlZCk7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCJhZnRlciBleHBhbmRcIiArIGFTZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgICAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgICB9XG4gICAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gSW5wdXRGaWx0ZXIucmVpbkZvcmNlKGFTZW50ZW5jZXMpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiYWZ0ZXIgcmVpbmZvcmNlXCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICBlcnJvcnM6IFtdLFxuICAgICAgICBzZW50ZW5jZXM6IGFTZW50ZW5jZXNSZWluZm9yY2VkXG4gICAgfTtcbn1cbmV4cG9ydHMucHJvY2Vzc1N0cmluZyA9IHByb2Nlc3NTdHJpbmc7XG5mdW5jdGlvbiBhbmFseXplQ29udGV4dFN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKSB7XG4gICAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gcHJvY2Vzc1N0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKTtcbiAgICAvLyB3ZSBsaW1pdCBhbmFseXNpcyB0byBuIHNlbnRlbmNlc1xuICAgIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcyA9IGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5zbGljZSgwLCBBbGdvbC5DdXRvZmZfU2VudGVuY2VzKTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcImFmdGVyIHJlaW5mb3JjZSBhbmQgY3V0b2ZmXCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubGVuZ3RoICsgXCJcXG5cIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICAgIH1cbiAgICByZXR1cm4gYVNlbnRlbmNlc1JlaW5mb3JjZWQ7XG59XG5leHBvcnRzLmFuYWx5emVDb250ZXh0U3RyaW5nID0gYW5hbHl6ZUNvbnRleHRTdHJpbmc7XG5mdW5jdGlvbiBjbXBCeU5yQ2F0ZWdvcmllc0FuZFNhbWVEb21haW4oYSwgYikge1xuICAgIC8vY29uc29sZS5sb2coXCJjb21wYXJlIGFcIiArIGEgKyBcIiBjbnRiIFwiICsgYik7XG4gICAgdmFyIGNudGEgPSBTZW50ZW5jZS5nZXREaXN0aW5jdENhdGVnb3JpZXNJblNlbnRlbmNlKGEpLmxlbmd0aDtcbiAgICB2YXIgY250YiA9IFNlbnRlbmNlLmdldERpc3RpbmN0Q2F0ZWdvcmllc0luU2VudGVuY2UoYikubGVuZ3RoO1xuICAgIC8qXG4gICAgICB2YXIgY250YSA9IGEucmVkdWNlKGZ1bmN0aW9uKHByZXYsIG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiBwcmV2ICsgKChvV29yZC5jYXRlZ29yeSA9PT0gXCJjYXRlZ29yeVwiKT8gMSA6IDApO1xuICAgICAgfSwwKTtcbiAgICAgIHZhciBjbnRiID0gYi5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgb1dvcmQpIHtcbiAgICAgICAgcmV0dXJuIHByZXYgKyAoKG9Xb3JkLmNhdGVnb3J5ID09PSBcImNhdGVnb3J5XCIpPyAxIDogMCk7XG4gICAgICB9LDApO1xuICAgICAvLyBjb25zb2xlLmxvZyhcImNudCBhXCIgKyBjbnRhICsgXCIgY250YiBcIiArIGNudGIpO1xuICAgICAqL1xuICAgIHJldHVybiBjbnRiIC0gY250YTtcbn1cbmV4cG9ydHMuY21wQnlOckNhdGVnb3JpZXNBbmRTYW1lRG9tYWluID0gY21wQnlOckNhdGVnb3JpZXNBbmRTYW1lRG9tYWluO1xuZnVuY3Rpb24gYW5hbHl6ZUNhdGVnb3J5TXVsdChjYXRlZ29yeWxpc3QsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlLCBnV29yZHMpIHtcbiAgICB2YXIgcmVzID0gYW5hbHl6ZUNvbnRleHRTdHJpbmcoY2F0ZWdvcnlsaXN0LCBydWxlcyk7XG4gICAgLy8gIGRlYnVnbG9nKFwicmVzdWx0aW5nIGNhdGVnb3J5IHNlbnRlbmNlc1wiLCBKU09OLnN0cmluZ2lmeShyZXMpKTtcbiAgICB2YXIgcmVzMiA9IGZpbHRlckFjY2VwdGluZ09ubHkocmVzLnNlbnRlbmNlcywgW1wiY2F0ZWdvcnlcIiwgXCJmaWxsZXJcIl0pO1xuICAgIC8vICBjb25zb2xlLmxvZyhcImhlcmUgcmVzMlwiICsgSlNPTi5zdHJpbmdpZnkocmVzMikgKTtcbiAgICAvLyAgY29uc29sZS5sb2coXCJoZXJlIHVuZGVmaW5lZCAhICsgXCIgKyByZXMyLmZpbHRlcihvID0+ICFvKS5sZW5ndGgpO1xuICAgIHJlczIuc29ydChTZW50ZW5jZS5jbXBSYW5raW5nUHJvZHVjdCk7XG4gICAgZGVidWdsb2coXCJyZXN1bHRpbmcgY2F0ZWdvcnkgc2VudGVuY2VzOiBcXG5cIiwgZGVidWdsb2cuZW5hYmxlZCA/IChTZW50ZW5jZS5kdW1wTmljZUFycihyZXMyLnNsaWNlKDAsIDMpLCBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdCkpIDogJy0nKTtcbiAgICAvLyBUT0RPOiAgIHJlczIgPSBmaWx0ZXJBY2NlcHRpbmdPbmx5U2FtZURvbWFpbihyZXMyKTtcbiAgICAvL2RlYnVnbG9nKFwicmVzdWx0aW5nIGNhdGVnb3J5IHNlbnRlbmNlc1wiLCBKU09OLnN0cmluZ2lmeShyZXMyLCB1bmRlZmluZWQsIDIpKTtcbiAgICAvLyBleHBlY3Qgb25seSBjYXRlZ29yaWVzXG4gICAgLy8gd2UgY291bGQgcmFuayBub3cgYnkgY29tbW9uIGRvbWFpbnMgLCBidXQgZm9yIG5vdyB3ZSBvbmx5IHRha2UgdGhlIGZpcnN0IG9uZVxuICAgIGlmICghcmVzMi5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgLy9yZXMuc29ydChjbXBCeU5yQ2F0ZWdvcmllc0FuZFNhbWVEb21haW4pO1xuICAgIHZhciByZXNjYXQgPSBTZW50ZW5jZS5nZXREaXN0aW5jdENhdGVnb3JpZXNJblNlbnRlbmNlKHJlczJbMF0pO1xuICAgIHJldHVybiByZXNjYXQ7XG4gICAgLy8gXCJcIiByZXR1cm4gcmVzWzBdLmZpbHRlcigpXG4gICAgLy8gcmV0dXJuIGNsYXNzaWZ5V29yZFdpdGhUYXJnZXRDYXRlZ29yeShjYXRlZ29yeWxpc3QsICdjYXRlZ29yeScsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlKTtcbn1cbmV4cG9ydHMuYW5hbHl6ZUNhdGVnb3J5TXVsdCA9IGFuYWx5emVDYXRlZ29yeU11bHQ7XG5mdW5jdGlvbiBhbmFseXplT3BlcmF0b3Iob3B3b3JkLCBydWxlcywgd2hvbGVzZW50ZW5jZSkge1xuICAgIHJldHVybiBjbGFzc2lmeVdvcmRXaXRoVGFyZ2V0Q2F0ZWdvcnkob3B3b3JkLCAnb3BlcmF0b3InLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG59XG5leHBvcnRzLmFuYWx5emVPcGVyYXRvciA9IGFuYWx5emVPcGVyYXRvcjtcbnZhciBFckVycm9yID0gcmVxdWlyZShcIi4vZXJlcnJvclwiKTtcbnZhciBMaXN0QWxsID0gcmVxdWlyZShcIi4vbGlzdGFsbFwiKTtcbi8vIGNvbnN0IHJlc3VsdCA9IFdoYXRJcy5yZXNvbHZlQ2F0ZWdvcnkoY2F0LCBhMS5lbnRpdHksXG4vLyAgIHRoZU1vZGVsLm1SdWxlcywgdGhlTW9kZWwudG9vbHMsIHRoZU1vZGVsLnJlY29yZHMpO1xuZnVuY3Rpb24gcmVzb2x2ZUNhdGVnb3J5KGNhdGVnb3J5LCBjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzLCByZWNvcmRzKSB7XG4gICAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHsgZXJyb3JzOiBbRXJFcnJvci5tYWtlRXJyb3JfRU1QVFlfSU5QVVQoKV0sIHRva2VuczogW10sIGFuc3dlcnM6IFtdIH07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICAvKlxuICAgICAgICAgICAgdmFyIG1hdGNoZWQgPSBJbnB1dEZpbHRlci5hbmFseXplU3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMpO1xuICAgICAgICAgICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImFmdGVyIG1hdGNoZWQgXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkKSk6ICctJyk7XG4gICAgICAgICAgICB2YXIgYVNlbnRlbmNlcyA9IElucHV0RmlsdGVyLmV4cGFuZE1hdGNoQXJyKG1hdGNoZWQpO1xuICAgICAgICAgICAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgICBkZWJ1Z2xvZyhcImFmdGVyIGV4cGFuZFwiICsgYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgICAgICAgICAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgICAgICAgICB9ICovXG4gICAgICAgIC8vIHZhciBjYXRlZ29yeVNldCA9IE1vZGVsLmdldEFsbFJlY29yZENhdGVnb3JpZXNGb3JUYXJnZXRDYXRlZ29yeSh0aGVNb2RlbCwgY2F0LCB0cnVlKTtcbiAgICAgICAgdmFyIHJlcyA9IExpc3RBbGwubGlzdEFsbFdpdGhDb250ZXh0KGNhdGVnb3J5LCBjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzLCByZWNvcmRzKTtcbiAgICAgICAgLy8qIHNvcnQgYnkgc2VudGVuY2VcbiAgICAgICAgcmVzLmFuc3dlcnMuZm9yRWFjaChmdW5jdGlvbiAobykgeyBvLl9yYW5raW5nID0gby5fcmFua2luZyAqIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG8uc2VudGVuY2UpOyB9KTtcbiAgICAgICAgcmVzLmFuc3dlcnMuc29ydChjbXBCeVJhbmtpbmcpO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cbn1cbmV4cG9ydHMucmVzb2x2ZUNhdGVnb3J5ID0gcmVzb2x2ZUNhdGVnb3J5O1xuZnVuY3Rpb24gcmVzb2x2ZUNhdGVnb3JpZXMoY2F0ZWdvcmllcywgY29udGV4dFF1ZXJ5U3RyaW5nLCB0aGVNb2RlbCkge1xuICAgIHZhciByZWNvcmRzID0gdGhlTW9kZWwucmVjb3JkcztcbiAgICB2YXIgcnVsZXMgPSB0aGVNb2RlbC5ydWxlcztcbiAgICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZXJyb3JzOiBbRXJFcnJvci5tYWtlRXJyb3JfRU1QVFlfSU5QVVQoKV0sXG4gICAgICAgICAgICB0dXBlbGFuc3dlcnM6IFtdLFxuICAgICAgICAgICAgdG9rZW5zOiBbXVxuICAgICAgICB9O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgLy8gdmFyIGNhdGVnb3J5U2V0ID0gTW9kZWwuZ2V0QWxsUmVjb3JkQ2F0ZWdvcmllc0ZvclRhcmdldENhdGVnb3J5KHRoZU1vZGVsLCBjYXQsIHRydWUpO1xuICAgICAgICB2YXIgcmVzID0gTGlzdEFsbC5saXN0QWxsVHVwZWxXaXRoQ29udGV4dChjYXRlZ29yaWVzLCBjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzLCByZWNvcmRzKTtcbiAgICAgICAgLy8qIHNvcnQgYnkgc2VudGVuY2VcbiAgICAgICAgcmVzLnR1cGVsYW5zd2Vycy5mb3JFYWNoKGZ1bmN0aW9uIChvKSB7IG8uX3JhbmtpbmcgPSBvLl9yYW5raW5nICogU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qoby5zZW50ZW5jZSk7IH0pO1xuICAgICAgICByZXMudHVwZWxhbnN3ZXJzLnNvcnQoY21wQnlSYW5raW5nVHVwZWwpO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cbn1cbmV4cG9ydHMucmVzb2x2ZUNhdGVnb3JpZXMgPSByZXNvbHZlQ2F0ZWdvcmllcztcbi8qXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUNhdGVnb3JpZXNPbGQoY2F0ZWdvcmllczogc3RyaW5nW10sIGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLFxuICB0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMpOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc1R1cGVsQW5zd2VycyB7XG4gIHZhciByZWNvcmRzID0gdGhlTW9kZWwucmVjb3JkcztcbiAgdmFyIHJ1bGVzID0gdGhlTW9kZWwucnVsZXM7XG4gIGlmIChjb250ZXh0UXVlcnlTdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczogW0VyRXJyb3IubWFrZUVycm9yX0VNUFRZX0lOUFVUKCldLFxuICAgICAgdHVwZWxhbnN3ZXJzOiBbXSxcbiAgICAgIHRva2VuczogW11cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gcHJvY2Vzc1N0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHRoZU1vZGVsLnJ1bGVzKTtcbiAgICAvL2FTZW50ZW5jZXMubWFwKGZ1bmN0aW9uKG9TZW50ZW5jZSkgeyByZXR1cm4gSW5wdXRGaWx0ZXIucmVpbkZvcmNlKG9TZW50ZW5jZSk7IH0pO1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJhZnRlciByZWluZm9yY2VcIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgfSkuam9pbihcIlxcblwiKSkgOiAnLScpO1xuICAgIC8vdmFyIG1hdGNoZWRBbnN3ZXJzID0gbWF0Y2hSZWNvcmRzUXVpY2soYVNlbnRlbmNlcywgY2F0ZWdvcnksIHJlY29yZHMpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8gKiBvYmplY3RzdHJlYW0qIC8ge1xuICAgIHZhciBjYXRlZ29yeVNldCA9IHt9O1xuICAgIGNhdGVnb3JpZXMuZm9yRWFjaChmdW5jdGlvbiAoY2F0ZWdvcnkpIHtcbiAgICAgIGNhdGVnb3J5U2V0W2NhdGVnb3J5XSA9IHRydWU7XG4gICAgICB2YXIgY2F0ZWdvcnlTZXRMb2NhbCA9IE1vZGVsLmdldEFsbFJlY29yZENhdGVnb3JpZXNGb3JUYXJnZXRDYXRlZ29yeSh0aGVNb2RlbCwgY2F0ZWdvcnksIHRydWUpO1xuICAgICAgT2JqZWN0LmFzc2lnbihjYXRlZ29yeVNldCwgY2F0ZWdvcnlTZXRMb2NhbCk7XG4gICAgfSk7XG5cbiAgICB2YXIgbWF0Y2hlZEFuc3dlcnMgPSBtYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcyhhU2VudGVuY2VzUmVpbmZvcmNlZCwgY2F0ZWdvcmllcywgcmVjb3JkcywgY2F0ZWdvcnlTZXQpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8gKiBvYmplY3RzdHJlYW0gKiAvIHtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgZGVidWdsb2coXCIgbWF0Y2hlZCBBbnN3ZXJzXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkQW5zd2VycywgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHBlcmZsb2coXCJmaWx0ZXJpbmcgdG9wUmFua2VkIChhPVwiICsgbWF0Y2hlZEFuc3dlcnMudHVwZWxhbnN3ZXJzLmxlbmd0aCArIFwiKS4uLlwiKTtcbiAgICB2YXIgbWF0Y2hlZEZpbHRlcmVkID0gT2JqZWN0LmFzc2lnbih7fSwgbWF0Y2hlZEFuc3dlcnMpO1xuICAgIG1hdGNoZWRGaWx0ZXJlZC50dXBlbGFuc3dlcnMgPSBmaWx0ZXJPbmx5VG9wUmFua2VkVHVwZWwobWF0Y2hlZEFuc3dlcnMudHVwZWxhbnN3ZXJzKTtcblxuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICBkZWJ1Z2xvZyhcIiBtYXRjaGVkIHRvcC1yYW5rZWQgQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEZpbHRlcmVkLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgcGVyZmxvZyhcInRvdGFsV2hhdGlzV2l0aENvbnRleHQgKGE9XCIgKyBtYXRjaGVkRmlsdGVyZWQudHVwZWxhbnN3ZXJzLmxlbmd0aCArIFwiKVwiKTtcbiAgICByZXR1cm4gbWF0Y2hlZEZpbHRlcmVkOyAvLyA/Pz8gQW5zd2VycztcbiAgfVxufVxuKi9cbmZ1bmN0aW9uIGZpbHRlck9ubHlUb3BSYW5rZWQocmVzdWx0cykge1xuICAgIHZhciByZXMgPSByZXN1bHRzLmZpbHRlcihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgIGlmIChyZXN1bHQuX3JhbmtpbmcgPT09IHJlc3VsdHNbMF0uX3JhbmtpbmcpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQuX3JhbmtpbmcgPj0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTGlzdCB0byBmaWx0ZXIgbXVzdCBiZSBvcmRlcmVkXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5maWx0ZXJPbmx5VG9wUmFua2VkID0gZmlsdGVyT25seVRvcFJhbmtlZDtcbmZ1bmN0aW9uIGZpbHRlck9ubHlUb3BSYW5rZWRUdXBlbChyZXN1bHRzKSB7XG4gICAgdmFyIHJlcyA9IHJlc3VsdHMuZmlsdGVyKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgaWYgKHJlc3VsdC5fcmFua2luZyA9PT0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdC5fcmFua2luZyA+PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJMaXN0IHRvIGZpbHRlciBtdXN0IGJlIG9yZGVyZWRcIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmZpbHRlck9ubHlUb3BSYW5rZWRUdXBlbCA9IGZpbHRlck9ubHlUb3BSYW5rZWRUdXBlbDtcbmZ1bmN0aW9uIGlzSW5kaXNjcmltaW5hdGVSZXN1bHQocmVzdWx0cykge1xuICAgIHZhciBjbnQgPSByZXN1bHRzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgcmVzdWx0KSB7XG4gICAgICAgIGlmIChyZXN1bHQuX3JhbmtpbmcgPT09IHJlc3VsdHNbMF0uX3JhbmtpbmcpIHtcbiAgICAgICAgICAgIHJldHVybiBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgIH0sIDApO1xuICAgIGlmIChjbnQgPiAxKSB7XG4gICAgICAgIC8vIHNlYXJjaCBmb3IgYSBkaXNjcmltaW5hdGluZyBjYXRlZ29yeSB2YWx1ZVxuICAgICAgICB2YXIgZGlzY3JpbWluYXRpbmcgPSBPYmplY3Qua2V5cyhyZXN1bHRzWzBdLnJlY29yZCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBjYXRlZ29yeSkge1xuICAgICAgICAgICAgaWYgKChjYXRlZ29yeS5jaGFyQXQoMCkgIT09ICdfJyAmJiBjYXRlZ29yeSAhPT0gcmVzdWx0c1swXS5jYXRlZ29yeSlcbiAgICAgICAgICAgICAgICAmJiAocmVzdWx0c1swXS5yZWNvcmRbY2F0ZWdvcnldICE9PSByZXN1bHRzWzFdLnJlY29yZFtjYXRlZ29yeV0pKSB7XG4gICAgICAgICAgICAgICAgcHJldi5wdXNoKGNhdGVnb3J5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwcmV2O1xuICAgICAgICB9LCBbXSk7XG4gICAgICAgIGlmIChkaXNjcmltaW5hdGluZy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBcIk1hbnkgY29tcGFyYWJsZSByZXN1bHRzLCBwZXJoYXBzIHlvdSB3YW50IHRvIHNwZWNpZnkgYSBkaXNjcmltaW5hdGluZyBcIiArIGRpc2NyaW1pbmF0aW5nLmpvaW4oJywnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJ1lvdXIgcXVlc3Rpb24gZG9lcyBub3QgaGF2ZSBhIHNwZWNpZmljIGFuc3dlcic7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5leHBvcnRzLmlzSW5kaXNjcmltaW5hdGVSZXN1bHQgPSBpc0luZGlzY3JpbWluYXRlUmVzdWx0O1xuZnVuY3Rpb24gaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdFR1cGVsKHJlc3VsdHMpIHtcbiAgICB2YXIgY250ID0gcmVzdWx0cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHJlc3VsdCkge1xuICAgICAgICBpZiAocmVzdWx0Ll9yYW5raW5nID09PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICB9LCAwKTtcbiAgICBpZiAoY250ID4gMSkge1xuICAgICAgICAvLyBzZWFyY2ggZm9yIGEgZGlzY3JpbWluYXRpbmcgY2F0ZWdvcnkgdmFsdWVcbiAgICAgICAgdmFyIGRpc2NyaW1pbmF0aW5nID0gT2JqZWN0LmtleXMocmVzdWx0c1swXS5yZWNvcmQpLnJlZHVjZShmdW5jdGlvbiAocHJldiwgY2F0ZWdvcnkpIHtcbiAgICAgICAgICAgIGlmICgoY2F0ZWdvcnkuY2hhckF0KDApICE9PSAnXycgJiYgcmVzdWx0c1swXS5jYXRlZ29yaWVzLmluZGV4T2YoY2F0ZWdvcnkpIDwgMClcbiAgICAgICAgICAgICAgICAmJiAocmVzdWx0c1swXS5yZWNvcmRbY2F0ZWdvcnldICE9PSByZXN1bHRzWzFdLnJlY29yZFtjYXRlZ29yeV0pKSB7XG4gICAgICAgICAgICAgICAgcHJldi5wdXNoKGNhdGVnb3J5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwcmV2O1xuICAgICAgICB9LCBbXSk7XG4gICAgICAgIGlmIChkaXNjcmltaW5hdGluZy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBcIk1hbnkgY29tcGFyYWJsZSByZXN1bHRzLCBwZXJoYXBzIHlvdSB3YW50IHRvIHNwZWNpZnkgYSBkaXNjcmltaW5hdGluZyBcIiArIGRpc2NyaW1pbmF0aW5nLmpvaW4oJywnKSArICcgb3IgdXNlIFwibGlzdCBhbGwgLi4uXCInO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnWW91ciBxdWVzdGlvbiBkb2VzIG5vdCBoYXZlIGEgc3BlY2lmaWMgYW5zd2VyJztcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbmV4cG9ydHMuaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdFR1cGVsID0gaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdFR1cGVsO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
