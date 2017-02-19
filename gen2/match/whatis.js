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
/*
export function matchRecordsHavingContext(
  pSentences: IMatch.IProcessedSentences, category: string, records: Array<IMatch.IRecord>,
  categorySet: { [key: string]: boolean })
  : IMatch.IProcessedWhatIsAnswers {

  //debuglog(JSON.stringify(records, undefined, 2));
  var relevantRecords = records.filter(function (record: IMatch.IRecord) {
    return (record[category] !== undefined) && (record[category] !== null);
  });
  var res = [];
  debuglog("MatchRecordsHavingContext : relevant records nr:" + relevantRecords.length);
  debuglog(debuglog.enabled ? ("sentences are : " + JSON.stringify(pSentences, undefined, 2)) : "-");
  debuglog(debuglog.enabled ? ("category " + category + " and categoryset is: " + JSON.stringify(categorySet, undefined, 2)) : "-");
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
        cntRelevantWords: rWords.length, // not a filler  // to be compatible it would be fWords
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
        );
        if ((Object.keys(matched).length + Object.keys(hasCategory).length) > Object.keys(mismatched).length) {
          res.push({
            sentence: aSentence.oSentence,
            record: record,
            category: category,
            result: record[category],
            _ranking: calcRankingHavingCategory(matched, hasCategory, mismatched, cntRelevantWords)
          });
        }
      })
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
      })
    });
  }
  res.sort(cmpByResultThenRanking);
  debuglog(" after sort" + res.length);
  var result = Object.assign({}, pSentences, { answers: res });
  return filterRetainTopRankedResult(result);
}
*/
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
    /*
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
      } as IMatch.IProcessedSentences;
    */
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC93aGF0aXMudHMiLCJtYXRjaC93aGF0aXMuanMiXSwibmFtZXMiOlsiSW5wdXRGaWx0ZXIiLCJyZXF1aXJlIiwiZGVidWciLCJkZWJ1Z2xvZyIsImRlYnVnbG9nViIsInBlcmZsb2ciLCJfIiwiU2VudGVuY2UiLCJXb3JkIiwiQWxnb2wiLCJjbXBCeVJlc3VsdFRoZW5SYW5raW5nIiwiYSIsImIiLCJjbXAiLCJyZXN1bHQiLCJsb2NhbGVDb21wYXJlIiwiX3JhbmtpbmciLCJleHBvcnRzIiwibG9jYWxlQ29tcGFyZUFycnMiLCJhYXJlc3VsdCIsImJicmVzdWx0IiwiYmxlbiIsImxlbmd0aCIsImV2ZXJ5IiwiaW5kZXgiLCJjbXBCeVJlc3VsdFRoZW5SYW5raW5nVHVwZWwiLCJhYSIsImJiIiwiY21wQnlSYW5raW5nIiwia2V5cyIsIk9iamVjdCIsInJlY29yZCIsImNvbmNhdCIsInNvcnQiLCJyZXMiLCJyZWR1Y2UiLCJwcmV2Iiwic0tleSIsImNtcEJ5UmFua2luZ1R1cGVsIiwiZHVtcE5pY2UiLCJhbnN3ZXIiLCJzIiwicHVzaCIsImNhdGVnb3J5IiwiZm9yRWFjaCIsInNSZXF1aXJlcyIsImNoYXJBdCIsIm9TZW50ZW5jZSIsInNlbnRlbmNlIiwib1dvcmQiLCJzV29yZCIsInN0cmluZyIsIm1hdGNoZWRTdHJpbmciLCJkdW1wTmljZVR1cGVsIiwiY2F0ZWdvcmllcyIsImpvaW4iLCJkdW1wV2VpZ2h0c1RvcCIsInRvb2xtYXRjaGVzIiwib3B0aW9ucyIsIm9NYXRjaCIsInRvcCIsImZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdCIsImFuc3dlcnMiLCJmaWx0ZXIiLCJpUmVzIiwiZW5hYmxlZCIsIkpTT04iLCJzdHJpbmdpZnkiLCJhc3NpZ24iLCJmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHRUdXBlbCIsInR1cGVsYW5zd2VycyIsImlzRXF1YWwiLCJNYXRjaCIsImNhbGNSYW5raW5nIiwibWF0Y2hlZCIsIm1pc21hdGNoZWQiLCJyZWxldmFudENvdW50IiwibGVuTWF0Y2hlZCIsImZhY3RvciIsImNhbGNSYW5raW5nUHJvZHVjdCIsIk1hdGgiLCJwb3ciLCJsZW5NaXNNYXRjaGVkIiwiZmFjdG9yMiIsImNhbGNSYW5raW5nU2ltcGxlIiwibm91c2UiLCJmYWN0b3IzIiwiY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeSIsImhhc0NhdGVnb3J5IiwibGVuSGFzQ2F0ZWdvcnkiLCJmYWN0b3JIIiwibWF0Y2hSZWNvcmRzVHVwZWxIYXZpbmdDb250ZXh0IiwicFNlbnRlbmNlcyIsInJlY29yZHMiLCJjYXRlZ29yeVNldCIsImNhdGVnb3J5RiIsInJlbGV2YW50UmVjb3JkcyIsInVuZGVmaW5lZCIsInByb2Nlc3MiLCJlbnYiLCJBQk9UX0ZBU1QiLCJmbCIsImxmIiwiYVNpbXBsaWZpZWRTZW50ZW5jZXMiLCJzZW50ZW5jZXMiLCJtYXAiLCJmV29yZHMiLCJpc0ZpbGxlciIsInJXb3JkcyIsImlzQ2F0ZWdvcnkiLCJjbnRSZWxldmFudFdvcmRzIiwiZnJlZXplIiwiYVNlbnRlbmNlIiwiZXh0cmFjdFJlc3VsdCIsInJlc3VsdDEiLCJtYXRjaFJlY29yZHMiLCJhU2VudGVuY2VzIiwibWFrZVNpbXBsaWZpZWRTZW50ZW5jZXNDYXRlZ29yeVNldCIsInRyYWNrIiwiYURvbWFpbnMiLCJkb21haW5zIiwibWFrZVNpbXBsaWZpZWRTZW50ZW5jZXMiLCJtYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcyIsIm9iaiIsIm1pc3NpbmdjYXQiLCJfZG9tYWluIiwicmVjIiwicmVzdWx0MiIsImNsYXNzaWZ5V29yZFdpdGhUYXJnZXRDYXRlZ29yeSIsIndvcmQiLCJ0YXJnZXRjYXRlZ29yeSIsInJ1bGVzIiwid2hvbGVzZW50ZW5jZSIsImNhdHMiLCJjYXRlZ29yaXplQVdvcmQiLCJjYXQiLCJhbmFseXplQ2F0ZWdvcnkiLCJjYXRlZ29yeXdvcmQiLCJzcGxpdEF0Q29tbWFBbmQiLCJzdHIiLCJyIiwic3BsaXQiLCJvIiwicnRyaW1tZWQiLCJTdHJpbmciLCJ0cmltIiwiYW5hbHl6ZUNhdGVnb3J5TXVsdE9ubHlBbmRDb21tYSIsImNhdGVnb3J5bGlzdCIsInJjYXQiLCJpbmRleE9mIiwiRXJyb3IiLCJmaWx0ZXJBY2NlcHRpbmdPbmx5IiwiaUluZGV4IiwiRXJiYXNlIiwic1dvcmRzIiwicmVzZXRDYWNoZSIsInByb2Nlc3NTdHJpbmciLCJxdWVyeSIsIkFCT1RfT0xETUFUQ0giLCJ3b3JkQ2FjaGUiLCJhbmFseXplQ29udGV4dFN0cmluZyIsImNvbnRleHRRdWVyeVN0cmluZyIsImFTZW50ZW5jZXNSZWluZm9yY2VkIiwic2xpY2UiLCJDdXRvZmZfU2VudGVuY2VzIiwicmFua2luZ1Byb2R1Y3QiLCJjbXBCeU5yQ2F0ZWdvcmllc0FuZFNhbWVEb21haW4iLCJjbnRhIiwiZ2V0RGlzdGluY3RDYXRlZ29yaWVzSW5TZW50ZW5jZSIsImNudGIiLCJhbmFseXplQ2F0ZWdvcnlNdWx0IiwiZ1dvcmRzIiwicmVzMiIsImNtcFJhbmtpbmdQcm9kdWN0IiwiZHVtcE5pY2VBcnIiLCJyZXNjYXQiLCJhbmFseXplT3BlcmF0b3IiLCJvcHdvcmQiLCJFckVycm9yIiwiTGlzdEFsbCIsInJlc29sdmVDYXRlZ29yeSIsImVycm9ycyIsIm1ha2VFcnJvcl9FTVBUWV9JTlBVVCIsInRva2VucyIsImxpc3RBbGxXaXRoQ29udGV4dCIsInJlc29sdmVDYXRlZ29yaWVzIiwidGhlTW9kZWwiLCJsaXN0QWxsVHVwZWxXaXRoQ29udGV4dCIsImZpbHRlck9ubHlUb3BSYW5rZWQiLCJyZXN1bHRzIiwiZmlsdGVyT25seVRvcFJhbmtlZFR1cGVsIiwiaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdCIsImNudCIsImRpc2NyaW1pbmF0aW5nIiwiaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdFR1cGVsIl0sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0FDTUE7O0FERUEsSUFBQUEsY0FBQUMsUUFBQSxlQUFBLENBQUE7QUFFQSxJQUFBQyxRQUFBRCxRQUFBLE9BQUEsQ0FBQTtB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O0FBQ0EsWUFBSUMsaUJBQWlCbkssT0FBT0QsSUFBUCxDQUFZZ0ssUUFBUSxDQUFSLEVBQVc5SixNQUF2QixFQUErQkksTUFBL0IsQ0FBc0MsVUFBVUMsSUFBVixFQUFnQk8sUUFBaEIsRUFBd0I7QUFDakYsZ0JBQUtBLFNBQVNHLE1BQVQsQ0FBZ0IsQ0FBaEIsTUFBdUIsR0FBdkIsSUFBOEIrSSxRQUFRLENBQVIsRUFBV3ZJLFVBQVgsQ0FBc0IrRixPQUF0QixDQUE4QjFHLFFBQTlCLElBQTBDLENBQXpFLElBQ0VrSixRQUFRLENBQVIsRUFBVzlKLE1BQVgsQ0FBa0JZLFFBQWxCLE1BQWdDa0osUUFBUSxDQUFSLEVBQVc5SixNQUFYLENBQWtCWSxRQUFsQixDQUR0QyxFQUNvRTtBQUNsRVAscUJBQUtNLElBQUwsQ0FBVUMsUUFBVjtBQUNEO0FBQ0QsbUJBQU9QLElBQVA7QUFDRCxTQU5vQixFQU1sQixFQU5rQixDQUFyQjtBQU9BLFlBQUk2SixlQUFlM0ssTUFBbkIsRUFBMkI7QUFDekIsbUJBQU8sMkVBQTJFMkssZUFBZTFJLElBQWYsQ0FBb0IsR0FBcEIsQ0FBM0UsR0FBc0csd0JBQTdHO0FBQ0Q7QUFDRCxlQUFPLCtDQUFQO0FBQ0Q7QUFDRCxXQUFPMEMsU0FBUDtBQUNEO0FBckJEaEYsUUFBQWlMLDJCQUFBLEdBQUFBLDJCQUFBIiwiZmlsZSI6Im1hdGNoL3doYXRpcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICpcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmFuYWx5emVcbiAqIEBmaWxlIGFuYWx5emUudHNcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cbiAqL1xuXG5cbmltcG9ydCAqIGFzIElucHV0RmlsdGVyIGZyb20gJy4vaW5wdXRGaWx0ZXInO1xuXG5pbXBvcnQgKiBhcyBkZWJ1ZyBmcm9tICdkZWJ1Zyc7XG5cbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ3doYXRpcycpO1xuY29uc3QgZGVidWdsb2dWID0gZGVidWcoJ3doYXRWaXMnKTtcbmNvbnN0IHBlcmZsb2cgPSBkZWJ1ZygncGVyZicpO1xuXG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuLi91dGlscy91dGlscyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5cbmltcG9ydCAqIGFzIElNYXRjaCBmcm9tICcuL2lmbWF0Y2gnO1xuXG5pbXBvcnQgKiBhcyBUb29sbWF0Y2hlciBmcm9tICcuL3Rvb2xtYXRjaGVyJztcblxuaW1wb3J0ICogYXMgU2VudGVuY2UgZnJvbSAnLi9zZW50ZW5jZSc7XG5cbmltcG9ydCAqIGFzIFdvcmQgZnJvbSAnLi93b3JkJztcblxuaW1wb3J0ICogYXMgQWxnb2wgZnJvbSAnLi9hbGdvbCc7XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGNtcEJ5UmVzdWx0VGhlblJhbmtpbmcoYTogSU1hdGNoLklXaGF0SXNBbnN3ZXIsIGI6IElNYXRjaC5JV2hhdElzQW5zd2VyKSB7XG4gIHZhciBjbXAgPSBhLnJlc3VsdC5sb2NhbGVDb21wYXJlKGIucmVzdWx0KTtcbiAgaWYgKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cbiAgcmV0dXJuIC0oYS5fcmFua2luZyAtIGIuX3JhbmtpbmcpO1xufVxuXG5mdW5jdGlvbiBsb2NhbGVDb21wYXJlQXJycyhhYXJlc3VsdDogc3RyaW5nW10sIGJicmVzdWx0OiBzdHJpbmdbXSk6IG51bWJlciB7XG4gIHZhciBjbXAgPSAwO1xuICB2YXIgYmxlbiA9IGJicmVzdWx0Lmxlbmd0aDtcbiAgYWFyZXN1bHQuZXZlcnkoZnVuY3Rpb24gKGEsIGluZGV4KSB7XG4gICAgaWYgKGJsZW4gPD0gaW5kZXgpIHtcbiAgICAgIGNtcCA9IC0xO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBjbXAgPSBhLmxvY2FsZUNvbXBhcmUoYmJyZXN1bHRbaW5kZXhdKTtcbiAgICBpZiAoY21wKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9KTtcbiAgaWYgKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cbiAgaWYgKGJsZW4gPiBhYXJlc3VsdC5sZW5ndGgpIHtcbiAgICBjbXAgPSArMTtcbiAgfVxuICByZXR1cm4gMDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbChhYTogSU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlciwgYmI6IElNYXRjaC5JV2hhdElzVHVwZWxBbnN3ZXIpIHtcbiAgdmFyIGNtcCA9IGxvY2FsZUNvbXBhcmVBcnJzKGFhLnJlc3VsdCwgYmIucmVzdWx0KTtcbiAgaWYgKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cbiAgcmV0dXJuIC0oYWEuX3JhbmtpbmcgLSBiYi5fcmFua2luZyk7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGNtcEJ5UmFua2luZyhhOiBJTWF0Y2guSVdoYXRJc0Fuc3dlciwgYjogSU1hdGNoLklXaGF0SXNBbnN3ZXIpIHtcbiAgdmFyIGNtcCA9IC0oYS5fcmFua2luZyAtIGIuX3JhbmtpbmcpO1xuICBpZiAoY21wKSB7XG4gICAgcmV0dXJuIGNtcDtcbiAgfVxuICBjbXAgPSBhLnJlc3VsdC5sb2NhbGVDb21wYXJlKGIucmVzdWx0KTtcbiAgaWYgKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cblxuICAvLyBhcmUgcmVjb3JkcyBkaWZmZXJlbnQ/XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYS5yZWNvcmQpLmNvbmNhdChPYmplY3Qua2V5cyhiLnJlY29yZCkpLnNvcnQoKTtcbiAgdmFyIHJlcyA9IGtleXMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBzS2V5KSB7XG4gICAgaWYgKHByZXYpIHtcbiAgICAgIHJldHVybiBwcmV2O1xuICAgIH1cbiAgICBpZiAoYi5yZWNvcmRbc0tleV0gIT09IGEucmVjb3JkW3NLZXldKSB7XG4gICAgICBpZiAoIWIucmVjb3JkW3NLZXldKSB7XG4gICAgICAgIHJldHVybiAtMTtcbiAgICAgIH1cbiAgICAgIGlmICghYS5yZWNvcmRbc0tleV0pIHtcbiAgICAgICAgcmV0dXJuICsxO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGEucmVjb3JkW3NLZXldLmxvY2FsZUNvbXBhcmUoYi5yZWNvcmRbc0tleV0pO1xuICAgIH1cbiAgICByZXR1cm4gMDtcbiAgfSwgMCk7XG4gIHJldHVybiByZXM7XG59XG5cblxuXG5leHBvcnQgZnVuY3Rpb24gY21wQnlSYW5raW5nVHVwZWwoYTogSU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlciwgYjogSU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlcikge1xuICB2YXIgY21wID0gLShhLl9yYW5raW5nIC0gYi5fcmFua2luZyk7XG4gIGlmIChjbXApIHtcbiAgICByZXR1cm4gY21wO1xuICB9XG4gIGNtcCA9IGxvY2FsZUNvbXBhcmVBcnJzKGEucmVzdWx0LCBiLnJlc3VsdCk7XG4gIGlmIChjbXApIHtcbiAgICByZXR1cm4gY21wO1xuICB9XG4gIC8vIGFyZSByZWNvcmRzIGRpZmZlcmVudD9cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhLnJlY29yZCkuY29uY2F0KE9iamVjdC5rZXlzKGIucmVjb3JkKSkuc29ydCgpO1xuICB2YXIgcmVzID0ga2V5cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHNLZXkpIHtcbiAgICBpZiAocHJldikge1xuICAgICAgcmV0dXJuIHByZXY7XG4gICAgfVxuICAgIGlmIChiLnJlY29yZFtzS2V5XSAhPT0gYS5yZWNvcmRbc0tleV0pIHtcbiAgICAgIGlmICghYi5yZWNvcmRbc0tleV0pIHtcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgfVxuICAgICAgaWYgKCFhLnJlY29yZFtzS2V5XSkge1xuICAgICAgICByZXR1cm4gKzE7XG4gICAgICB9XG4gICAgICByZXR1cm4gYS5yZWNvcmRbc0tleV0ubG9jYWxlQ29tcGFyZShiLnJlY29yZFtzS2V5XSk7XG4gICAgfVxuICAgIHJldHVybiAwO1xuICB9LCAwKTtcbiAgcmV0dXJuIHJlcztcbn1cblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBkdW1wTmljZShhbnN3ZXI6IElNYXRjaC5JV2hhdElzQW5zd2VyKSB7XG4gIHZhciByZXN1bHQgPSB7XG4gICAgczogXCJcIixcbiAgICBwdXNoOiBmdW5jdGlvbiAocykgeyB0aGlzLnMgPSB0aGlzLnMgKyBzOyB9XG4gIH07XG4gIHZhciBzID1cbiAgICBgKipSZXN1bHQgZm9yIGNhdGVnb3J5OiAke2Fuc3dlci5jYXRlZ29yeX0gaXMgJHthbnN3ZXIucmVzdWx0fVxuIHJhbms6ICR7YW5zd2VyLl9yYW5raW5nfVxuYDtcbiAgcmVzdWx0LnB1c2gocyk7XG4gIE9iamVjdC5rZXlzKGFuc3dlci5yZWNvcmQpLmZvckVhY2goZnVuY3Rpb24gKHNSZXF1aXJlcywgaW5kZXgpIHtcbiAgICBpZiAoc1JlcXVpcmVzLmNoYXJBdCgwKSAhPT0gJ18nKSB7XG4gICAgICByZXN1bHQucHVzaChgcmVjb3JkOiAke3NSZXF1aXJlc30gLT4gJHthbnN3ZXIucmVjb3JkW3NSZXF1aXJlc119YCk7XG4gICAgfVxuICAgIHJlc3VsdC5wdXNoKCdcXG4nKTtcbiAgfSk7XG4gIHZhciBvU2VudGVuY2UgPSBhbnN3ZXIuc2VudGVuY2U7XG4gIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaW5kZXgpIHtcbiAgICB2YXIgc1dvcmQgPSBgWyR7aW5kZXh9XSA6ICR7b1dvcmQuY2F0ZWdvcnl9IFwiJHtvV29yZC5zdHJpbmd9XCIgPT4gXCIke29Xb3JkLm1hdGNoZWRTdHJpbmd9XCJgXG4gICAgcmVzdWx0LnB1c2goc1dvcmQgKyBcIlxcblwiKTtcbiAgfSlcbiAgcmVzdWx0LnB1c2goXCIuXFxuXCIpO1xuICByZXR1cm4gcmVzdWx0LnM7XG59XG5leHBvcnQgZnVuY3Rpb24gZHVtcE5pY2VUdXBlbChhbnN3ZXI6IElNYXRjaC5JV2hhdElzVHVwZWxBbnN3ZXIpIHtcbiAgdmFyIHJlc3VsdCA9IHtcbiAgICBzOiBcIlwiLFxuICAgIHB1c2g6IGZ1bmN0aW9uIChzKSB7IHRoaXMucyA9IHRoaXMucyArIHM7IH1cbiAgfTtcbiAgdmFyIHMgPVxuICAgIGAqKlJlc3VsdCBmb3IgY2F0ZWdvcmllczogJHthbnN3ZXIuY2F0ZWdvcmllcy5qb2luKFwiO1wiKX0gaXMgJHthbnN3ZXIucmVzdWx0fVxuIHJhbms6ICR7YW5zd2VyLl9yYW5raW5nfVxuYDtcbiAgcmVzdWx0LnB1c2gocyk7XG4gIE9iamVjdC5rZXlzKGFuc3dlci5yZWNvcmQpLmZvckVhY2goZnVuY3Rpb24gKHNSZXF1aXJlcywgaW5kZXgpIHtcbiAgICBpZiAoc1JlcXVpcmVzLmNoYXJBdCgwKSAhPT0gJ18nKSB7XG4gICAgICByZXN1bHQucHVzaChgcmVjb3JkOiAke3NSZXF1aXJlc30gLT4gJHthbnN3ZXIucmVjb3JkW3NSZXF1aXJlc119YCk7XG4gICAgfVxuICAgIHJlc3VsdC5wdXNoKCdcXG4nKTtcbiAgfSk7XG4gIHZhciBvU2VudGVuY2UgPSBhbnN3ZXIuc2VudGVuY2U7XG4gIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaW5kZXgpIHtcbiAgICB2YXIgc1dvcmQgPSBgWyR7aW5kZXh9XSA6ICR7b1dvcmQuY2F0ZWdvcnl9IFwiJHtvV29yZC5zdHJpbmd9XCIgPT4gXCIke29Xb3JkLm1hdGNoZWRTdHJpbmd9XCJgXG4gICAgcmVzdWx0LnB1c2goc1dvcmQgKyBcIlxcblwiKTtcbiAgfSlcbiAgcmVzdWx0LnB1c2goXCIuXFxuXCIpO1xuICByZXR1cm4gcmVzdWx0LnM7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGR1bXBXZWlnaHRzVG9wKHRvb2xtYXRjaGVzOiBBcnJheTxJTWF0Y2guSVdoYXRJc0Fuc3dlcj4sIG9wdGlvbnM6IGFueSkge1xuICB2YXIgcyA9ICcnO1xuICB0b29sbWF0Y2hlcy5mb3JFYWNoKGZ1bmN0aW9uIChvTWF0Y2gsIGluZGV4KSB7XG4gICAgaWYgKGluZGV4IDwgb3B0aW9ucy50b3ApIHtcbiAgICAgIHMgPSBzICsgXCJXaGF0SXNBbnN3ZXJbXCIgKyBpbmRleCArIFwiXS4uLlxcblwiO1xuICAgICAgcyA9IHMgKyBkdW1wTmljZShvTWF0Y2gpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0KHJlczogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzKTogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzIHtcbiAgdmFyIHJlc3VsdCA9IHJlcy5hbnN3ZXJzLmZpbHRlcihmdW5jdGlvbiAoaVJlcywgaW5kZXgpIHtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgZGVidWdsb2coJ3JldGFpbiB0b3BSYW5rZWQ6ICcgKyBpbmRleCArICcgJyArIEpTT04uc3RyaW5naWZ5KGlSZXMpKTtcbiAgICB9XG4gICAgaWYgKGlSZXMucmVzdWx0ID09PSAocmVzLmFuc3dlcnNbaW5kZXggLSAxXSAmJiByZXMuYW5zd2Vyc1tpbmRleCAtIDFdLnJlc3VsdCkpIHtcbiAgICAgIGRlYnVnbG9nKCdza2lwJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9KTtcbiAgcmVzdWx0LnNvcnQoY21wQnlSYW5raW5nKTtcbiAgdmFyIGEgPSBPYmplY3QuYXNzaWduKHsgYW5zd2VyczogcmVzdWx0IH0sIHJlcywgeyBhbnN3ZXJzOiByZXN1bHQgfSk7XG4gIGEuYW5zd2VycyA9IHJlc3VsdDtcbiAgcmV0dXJuIGE7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHRUdXBlbChyZXM6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzVHVwZWxBbnN3ZXJzKTogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNUdXBlbEFuc3dlcnMge1xuICB2YXIgcmVzdWx0ID0gcmVzLnR1cGVsYW5zd2Vycy5maWx0ZXIoZnVuY3Rpb24gKGlSZXMsIGluZGV4KSB7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgIGRlYnVnbG9nKCcgcmV0YWluIHR1cGVsICcgKyBpbmRleCArICcgJyArIEpTT04uc3RyaW5naWZ5KGlSZXMpKTtcbiAgICB9XG4gICAgaWYgKF8uaXNFcXVhbChpUmVzLnJlc3VsdCwgcmVzLnR1cGVsYW5zd2Vyc1tpbmRleCAtIDFdICYmIHJlcy50dXBlbGFuc3dlcnNbaW5kZXggLSAxXS5yZXN1bHQpKSB7XG4gICAgICBkZWJ1Z2xvZygnc2tpcCcpO1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9KTtcbiAgcmVzdWx0LnNvcnQoY21wQnlSYW5raW5nVHVwZWwpO1xuICByZXR1cm4gT2JqZWN0LmFzc2lnbihyZXMsIHsgdHVwZWxhbnN3ZXJzOiByZXN1bHQgfSk7XG59XG5cblxuaW1wb3J0ICogYXMgTWF0Y2ggZnJvbSAnLi9tYXRjaCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBjYWxjUmFua2luZyhtYXRjaGVkOiB7IFtrZXk6IHN0cmluZ106IElNYXRjaC5JV29yZCB9LFxuICBtaXNtYXRjaGVkOiB7IFtrZXk6IHN0cmluZ106IElNYXRjaC5JV29yZCB9LCByZWxldmFudENvdW50OiBudW1iZXIpOiBudW1iZXIge1xuXG4gIHZhciBsZW5NYXRjaGVkID0gT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoO1xuICB2YXIgZmFjdG9yID0gTWF0Y2guY2FsY1JhbmtpbmdQcm9kdWN0KG1hdGNoZWQpO1xuICBmYWN0b3IgKj0gTWF0aC5wb3coMS41LCBsZW5NYXRjaGVkKTtcblxuICB2YXIgbGVuTWlzTWF0Y2hlZCA9IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aDtcbiAgdmFyIGZhY3RvcjIgPSBNYXRjaC5jYWxjUmFua2luZ1Byb2R1Y3QobWlzbWF0Y2hlZCk7XG4gIGZhY3RvcjIgKj0gTWF0aC5wb3coMC40LCBsZW5NaXNNYXRjaGVkKTtcblxuICByZXR1cm4gTWF0aC5wb3coZmFjdG9yMiAqIGZhY3RvciwgMSAvIChsZW5NaXNNYXRjaGVkICsgbGVuTWF0Y2hlZCkpO1xufVxuXG4vKipcbiAqIEEgcmFua2luZyB3aGljaCBpcyBwdXJlbHkgYmFzZWQgb24gdGhlIG51bWJlcnMgb2YgbWF0Y2hlZCBlbnRpdGllcyxcbiAqIGRpc3JlZ2FyZGluZyBleGFjdG5lc3Mgb2YgbWF0Y2hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhbGNSYW5raW5nU2ltcGxlKG1hdGNoZWQ6IG51bWJlcixcbiAgbWlzbWF0Y2hlZDogbnVtYmVyLCBub3VzZTogbnVtYmVyLFxuICByZWxldmFudENvdW50OiBudW1iZXIpOiBudW1iZXIge1xuICAvLyAyIDogMFxuICAvLyAxIDogMFxuICB2YXIgZmFjdG9yID0gbWF0Y2hlZCAqIE1hdGgucG93KDEuNSwgbWF0Y2hlZCkgKiBNYXRoLnBvdygxLjUsIG1hdGNoZWQpO1xuICB2YXIgZmFjdG9yMiA9IE1hdGgucG93KDAuNCwgbWlzbWF0Y2hlZCk7XG4gIHZhciBmYWN0b3IzID0gTWF0aC5wb3coMC40LCBub3VzZSk7XG4gIHJldHVybiBNYXRoLnBvdyhmYWN0b3IyICogZmFjdG9yICogZmFjdG9yMywgMSAvIChtaXNtYXRjaGVkICsgbWF0Y2hlZCArIG5vdXNlKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQ6IHsgW2tleTogc3RyaW5nXTogSU1hdGNoLklXb3JkIH0sXG4gIGhhc0NhdGVnb3J5OiB7IFtrZXk6IHN0cmluZ106IG51bWJlciB9LFxuICBtaXNtYXRjaGVkOiB7IFtrZXk6IHN0cmluZ106IElNYXRjaC5JV29yZCB9LCByZWxldmFudENvdW50OiBudW1iZXIpOiBudW1iZXIge1xuXG5cbiAgdmFyIGxlbk1hdGNoZWQgPSBPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGg7XG4gIHZhciBmYWN0b3IgPSBNYXRjaC5jYWxjUmFua2luZ1Byb2R1Y3QobWF0Y2hlZCk7XG4gIGZhY3RvciAqPSBNYXRoLnBvdygxLjUsIGxlbk1hdGNoZWQpO1xuXG4gIHZhciBsZW5IYXNDYXRlZ29yeSA9IE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5sZW5ndGg7XG4gIHZhciBmYWN0b3JIID0gTWF0aC5wb3coMS4xLCBsZW5IYXNDYXRlZ29yeSk7XG5cbiAgdmFyIGxlbk1pc01hdGNoZWQgPSBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGg7XG4gIHZhciBmYWN0b3IyID0gTWF0Y2guY2FsY1JhbmtpbmdQcm9kdWN0KG1pc21hdGNoZWQpO1xuICBmYWN0b3IyICo9IE1hdGgucG93KDAuNCwgbGVuTWlzTWF0Y2hlZCk7XG5cbiAgcmV0dXJuIE1hdGgucG93KGZhY3RvcjIgKiBmYWN0b3JIICogZmFjdG9yLCAxIC8gKGxlbk1pc01hdGNoZWQgKyBsZW5IYXNDYXRlZ29yeSArIGxlbk1hdGNoZWQpKTtcbn1cblxuLyoqXG4gKiBsaXN0IGFsbCB0b3AgbGV2ZWwgcmFua2luZ3NcbiAqL1xuLypcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFJlY29yZHNIYXZpbmdDb250ZXh0KFxuICBwU2VudGVuY2VzOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcywgY2F0ZWdvcnk6IHN0cmluZywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+LFxuICBjYXRlZ29yeVNldDogeyBba2V5OiBzdHJpbmddOiBib29sZWFuIH0pXG4gIDogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzIHtcblxuICAvL2RlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZHMsIHVuZGVmaW5lZCwgMikpO1xuICB2YXIgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZDogSU1hdGNoLklSZWNvcmQpIHtcbiAgICByZXR1cm4gKHJlY29yZFtjYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkgJiYgKHJlY29yZFtjYXRlZ29yeV0gIT09IG51bGwpO1xuICB9KTtcbiAgdmFyIHJlcyA9IFtdO1xuICBkZWJ1Z2xvZyhcIk1hdGNoUmVjb3Jkc0hhdmluZ0NvbnRleHQgOiByZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCk7XG4gIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJzZW50ZW5jZXMgYXJlIDogXCIgKyBKU09OLnN0cmluZ2lmeShwU2VudGVuY2VzLCB1bmRlZmluZWQsIDIpKSA6IFwiLVwiKTtcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImNhdGVnb3J5IFwiICsgY2F0ZWdvcnkgKyBcIiBhbmQgY2F0ZWdvcnlzZXQgaXM6IFwiICsgSlNPTi5zdHJpbmdpZnkoY2F0ZWdvcnlTZXQsIHVuZGVmaW5lZCwgMikpIDogXCItXCIpO1xuICBpZiAocHJvY2Vzcy5lbnYuQUJPVF9GQVNUICYmIGNhdGVnb3J5U2V0KSB7XG4gICAgLy8gd2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbiBjYXRlZ29yaWVzIHByZXNlbnQgaW4gcmVjb3JkcyBmb3IgZG9tYWlucyB3aGljaCBjb250YWluIHRoZSBjYXRlZ29yeVxuICAgIC8vIHZhciBjYXRlZ29yeXNldCA9IE1vZGVsLmNhbGN1bGF0ZVJlbGV2YW50UmVjb3JkQ2F0ZWdvcmllcyh0aGVNb2RlbCxjYXRlZ29yeSk7XG4gICAgLy9rbm93aW5nIHRoZSB0YXJnZXRcbiAgICBwZXJmbG9nKFwiZ290IGNhdGVnb3J5c2V0IHdpdGggXCIgKyBPYmplY3Qua2V5cyhjYXRlZ29yeVNldCkubGVuZ3RoKTtcbiAgICB2YXIgZmwgPSAwO1xuICAgIHZhciBsZiA9IDA7XG4gICAgdmFyIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gcFNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIHZhciBmV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICByZXR1cm4gIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCk7XG4gICAgICB9KTtcbiAgICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICByZXR1cm4gISFjYXRlZ29yeVNldFtvV29yZC5jYXRlZ29yeV0gfHwgV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpO1xuICAgICAgfSk7XG4gICAgICBmbCA9IGZsICsgb1NlbnRlbmNlLmxlbmd0aDtcbiAgICAgIGxmID0gbGYgKyByV29yZHMubGVuZ3RoO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsIC8vIG5vdCBhIGZpbGxlciAgLy8gdG8gYmUgY29tcGF0aWJsZSBpdCB3b3VsZCBiZSBmV29yZHNcbiAgICAgICAgcldvcmRzOiByV29yZHNcbiAgICAgIH07XG4gICAgfSk7XG4gICAgT2JqZWN0LmZyZWV6ZShhU2ltcGxpZmllZFNlbnRlbmNlcyk7XG4gICAgZGVidWdsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIGZsICsgXCItPlwiICsgbGYgKyBcIilcIik7XG4gICAgcGVyZmxvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgZmwgKyBcIi0+XCIgKyBsZiArIFwiKVwiKTtcbiAgICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICBhU2ltcGxpZmllZFNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgICAgdmFyIGhhc0NhdGVnb3J5ID0ge307XG4gICAgICAgIHZhciBtaXNtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gYVNlbnRlbmNlLmNudFJlbGV2YW50V29yZHM7XG4gICAgICAgIGFTZW50ZW5jZS5yV29yZHMuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgIG1hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpICYmIHJlY29yZFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgaGFzQ2F0ZWdvcnlbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSAxO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgICBpZiAoKE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aCArIE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5sZW5ndGgpID4gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoKSB7XG4gICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgc2VudGVuY2U6IGFTZW50ZW5jZS5vU2VudGVuY2UsXG4gICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICAgIHJlc3VsdDogcmVjb3JkW2NhdGVnb3J5XSxcbiAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0pO1xuICAgIGRlYnVnbG9nKFwiaGVyZSBpbiB3ZWlyZFwiKTtcbiAgfSBlbHNlIHtcbiAgICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICBwU2VudGVuY2VzLnNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgICAgdmFyIGhhc0NhdGVnb3J5ID0ge307XG4gICAgICAgIHZhciBtaXNtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gMDtcbiAgICAgICAgYVNlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgaWYgKCFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpKSB7XG4gICAgICAgICAgICBjbnRSZWxldmFudFdvcmRzID0gY250UmVsZXZhbnRXb3JkcyArIDE7XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKSAmJiByZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgICAgaGFzQ2F0ZWdvcnlbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICgoT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoICsgT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aCkgPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLFxuICAgICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgICByZXN1bHQ6IHJlY29yZFtjYXRlZ29yeV0sXG4gICAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KTtcbiAgfVxuICByZXMuc29ydChjbXBCeVJlc3VsdFRoZW5SYW5raW5nKTtcbiAgZGVidWdsb2coXCIgYWZ0ZXIgc29ydFwiICsgcmVzLmxlbmd0aCk7XG4gIHZhciByZXN1bHQgPSBPYmplY3QuYXNzaWduKHt9LCBwU2VudGVuY2VzLCB7IGFuc3dlcnM6IHJlcyB9KTtcbiAgcmV0dXJuIGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdChyZXN1bHQpO1xufVxuKi9cblxuLyoqXG4gKiBsaXN0IGFsbCB0b3AgbGV2ZWwgcmFua2luZ3NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVjb3Jkc1R1cGVsSGF2aW5nQ29udGV4dChcbiAgcFNlbnRlbmNlczogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMsIGNhdGVnb3JpZXM6IHN0cmluZ1tdLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sXG4gIGNhdGVnb3J5U2V0OiB7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfSlcbiAgOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc1R1cGVsQW5zd2VycyB7XG4gIC8vIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZHMsIHVuZGVmaW5lZCwgMikpO1xuICB2YXIgY2F0ZWdvcnlGID0gY2F0ZWdvcmllc1swXTtcbiAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQ6IElNYXRjaC5JUmVjb3JkKSB7XG4gICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnlGXSAhPT0gdW5kZWZpbmVkKSAmJiAocmVjb3JkW2NhdGVnb3J5Rl0gIT09IG51bGwpO1xuICB9KTtcbiAgdmFyIHJlcyA9IFtdIGFzIElNYXRjaC5JV2hhdElzVHVwZWxBbnN3ZXJbXTtcbiAgZGVidWdsb2coXCJyZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCk7XG4gIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJzZW50ZW5jZXMgYXJlIDogXCIgKyBKU09OLnN0cmluZ2lmeShwU2VudGVuY2VzLCB1bmRlZmluZWQsIDIpKSA6IFwiLVwiKTtcbiAgaWYgKHByb2Nlc3MuZW52LkFCT1RfRkFTVCAmJiBjYXRlZ29yeVNldCkge1xuICAgIC8vIHdlIGFyZSBvbmx5IGludGVyZXN0ZWQgaW4gY2F0ZWdvcmllcyBwcmVzZW50IGluIHJlY29yZHMgZm9yIGRvbWFpbnMgd2hpY2ggY29udGFpbiB0aGUgY2F0ZWdvcnlcbiAgICAvLyB2YXIgY2F0ZWdvcnlzZXQgPSBNb2RlbC5jYWxjdWxhdGVSZWxldmFudFJlY29yZENhdGVnb3JpZXModGhlTW9kZWwsY2F0ZWdvcnkpO1xuICAgIC8va25vd2luZyB0aGUgdGFyZ2V0XG4gICAgcGVyZmxvZyhcImdvdCBjYXRlZ29yeXNldCB3aXRoIFwiICsgT2JqZWN0LmtleXMoY2F0ZWdvcnlTZXQpLmxlbmd0aCk7XG4gICAgdmFyIGZsID0gMDtcbiAgICB2YXIgbGYgPSAwO1xuICAgIHZhciBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IHBTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICB2YXIgZldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgcmV0dXJuICFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpO1xuICAgICAgfSk7XG4gICAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgcmV0dXJuICEhY2F0ZWdvcnlTZXRbb1dvcmQuY2F0ZWdvcnldIHx8IFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKTtcbiAgICAgIH0pO1xuICAgICAgZmwgPSBmbCArIG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgICBsZiA9IGxmICsgcldvcmRzLmxlbmd0aDtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLCAvLyBub3QgYSBmaWxsZXIgIC8vIHRvIGJlIGNvbXBhdGlibGUgaXQgd291bGQgYmUgZldvcmRzXG4gICAgICAgIHJXb3JkczogcldvcmRzXG4gICAgICB9O1xuICAgIH0pO1xuICAgIE9iamVjdC5mcmVlemUoYVNpbXBsaWZpZWRTZW50ZW5jZXMpO1xuICAgIHBlcmZsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIGZsICsgXCItPlwiICsgbGYgKyBcIilcIik7XG4gICAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgYVNpbXBsaWZpZWRTZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAoYVNlbnRlbmNlKSB7XG4gICAgICAgIHZhciBoYXNDYXRlZ29yeSA9IHt9O1xuICAgICAgICB2YXIgbWlzbWF0Y2hlZCA9IHt9O1xuICAgICAgICB2YXIgbWF0Y2hlZCA9IHt9O1xuICAgICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IGFTZW50ZW5jZS5jbnRSZWxldmFudFdvcmRzO1xuICAgICAgICBhU2VudGVuY2UucldvcmRzLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICYmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKSAmJiByZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgIGhhc0NhdGVnb3J5W29Xb3JkLm1hdGNoZWRTdHJpbmddID0gMTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgaWYgKChPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoKSA+IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aCkge1xuICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2Uub1NlbnRlbmNlLFxuICAgICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgICBjYXRlZ29yaWVzOiBjYXRlZ29yaWVzLFxuICAgICAgICAgICAgcmVzdWx0OiBleHRyYWN0UmVzdWx0KGNhdGVnb3JpZXMsIHJlY29yZCksXG4gICAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICBwU2VudGVuY2VzLnNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgICAgdmFyIGhhc0NhdGVnb3J5ID0ge307XG4gICAgICAgIHZhciBtaXNtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gMDtcbiAgICAgICAgYVNlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgaWYgKCFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpKSB7XG4gICAgICAgICAgICBjbnRSZWxldmFudFdvcmRzID0gY250UmVsZXZhbnRXb3JkcyArIDE7XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKSAmJiByZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgICAgaGFzQ2F0ZWdvcnlbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICgoT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoICsgT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aCkgPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLFxuICAgICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgICBjYXRlZ29yaWVzOiBjYXRlZ29yaWVzLFxuICAgICAgICAgICAgcmVzdWx0OiBleHRyYWN0UmVzdWx0KGNhdGVnb3JpZXMsIHJlY29yZCksXG4gICAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KTtcbiAgfVxuICByZXMuc29ydChjbXBCeVJlc3VsdFRoZW5SYW5raW5nVHVwZWwpO1xuICB2YXIgcmVzdWx0MSA9IE9iamVjdC5hc3NpZ24oeyB0dXBlbGFuc3dlcnM6IHJlcyB9LCBwU2VudGVuY2VzKTtcbiAgcmV0dXJuIGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdFR1cGVsKHJlc3VsdDEpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hSZWNvcmRzKGFTZW50ZW5jZXM6IElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzLCBjYXRlZ29yeTogc3RyaW5nLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4pXG4gIDogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzIHtcbiAgLy8gaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgLy8gICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRzLCB1bmRlZmluZWQsIDIpKTtcbiAgLy8gfVxuICB2YXIgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZDogSU1hdGNoLklSZWNvcmQpIHtcbiAgICByZXR1cm4gKHJlY29yZFtjYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkgJiYgKHJlY29yZFtjYXRlZ29yeV0gIT09IG51bGwpO1xuICB9KTtcbiAgdmFyIHJlcyA9IFtdO1xuICBkZWJ1Z2xvZyhcInJlbGV2YW50IHJlY29yZHMgbnI6XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoKTtcbiAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgIGFTZW50ZW5jZXMuc2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fVxuICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gMDtcbiAgICAgIGFTZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICBpZiAoIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCkpIHtcbiAgICAgICAgICBjbnRSZWxldmFudFdvcmRzID0gY250UmVsZXZhbnRXb3JkcyArIDE7XG4gICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICYmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgaWYgKE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aCA+IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aCkge1xuICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgc2VudGVuY2U6IGFTZW50ZW5jZSxcbiAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgcmVzdWx0OiByZWNvcmRbY2F0ZWdvcnldLFxuICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZyhtYXRjaGVkLCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KVxuICB9KTtcbiAgcmVzLnNvcnQoY21wQnlSZXN1bHRUaGVuUmFua2luZyk7XG4gIHZhciByZXN1bHQgPSBPYmplY3QuYXNzaWduKHt9LCBhU2VudGVuY2VzLCB7IGFuc3dlcnM6IHJlcyB9KTtcbiAgcmV0dXJuIGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdChyZXN1bHQpO1xufVxuXG5cblxuZnVuY3Rpb24gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXNDYXRlZ29yeVNldChhU2VudGVuY2VzOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcyxcbiAgY2F0ZWdvcnlTZXQ6IHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB9LCB0cmFjazogeyBmbDogbnVtYmVyLCBsZjogbnVtYmVyIH1cbik6IHtcbiAgZG9tYWluczogc3RyaW5nW10sXG4gIG9TZW50ZW5jZTogSU1hdGNoLklTZW50ZW5jZSxcbiAgY250UmVsZXZhbnRXb3JkczogbnVtYmVyLFxuICByV29yZHM6IElNYXRjaC5JV29yZFtdXG59W10ge1xuICByZXR1cm4gYVNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICB2YXIgYURvbWFpbnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJkb21haW5cIikge1xuICAgICAgICBhRG9tYWlucy5wdXNoKG9Xb3JkLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwibWV0YVwiKSB7XG4gICAgICAgIC8vIGUuZy4gZG9tYWluIFhYWFxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gISFjYXRlZ29yeVNldFtvV29yZC5jYXRlZ29yeV07XG4gICAgfSk7XG4gICAgdHJhY2suZmwgKz0gb1NlbnRlbmNlLmxlbmd0aDtcbiAgICB0cmFjay5sZiArPSByV29yZHMubGVuZ3RoO1xuICAgIHJldHVybiB7XG4gICAgICBkb21haW5zOiBhRG9tYWlucyxcbiAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCxcbiAgICAgIHJXb3JkczogcldvcmRzXG4gICAgfTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzKGFTZW50ZW5jZXMgOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcywgIHRyYWNrOiB7IGZsOiBudW1iZXIsIGxmOiBudW1iZXIgfSk6IHtcbiAgZG9tYWluczogc3RyaW5nW10sXG4gIG9TZW50ZW5jZTogSU1hdGNoLklTZW50ZW5jZSxcbiAgY250UmVsZXZhbnRXb3JkczogbnVtYmVyLFxuICByV29yZHM6IElNYXRjaC5JV29yZFtdXG59W10ge1xuICByZXR1cm4gYVNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICB2YXIgZG9tYWlucyA9IFtdIGFzIHN0cmluZ1tdO1xuICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcImRvbWFpblwiKSB7XG4gICAgICAgIGRvbWFpbnMucHVzaChvV29yZC5tYXRjaGVkU3RyaW5nKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcIm1ldGFcIikge1xuICAgICAgICAvLyBlLmcuIGRvbWFpbiBYWFhcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuICFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpO1xuICAgIH0pO1xuICAgIHRyYWNrLmZsICs9IG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgdHJhY2subGYgKz0gcldvcmRzLmxlbmd0aDtcbiAgICByZXR1cm4ge1xuICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICBkb21haW5zOiBkb21haW5zLFxuICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCxcbiAgICAgIHJXb3JkczogcldvcmRzXG4gICAgfTtcbiAgfSk7XG59XG5cblxuZnVuY3Rpb24gZXh0cmFjdFJlc3VsdChjYXRlZ29yaWVzOiBzdHJpbmdbXSwgcmVjb3JkOiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9KTogc3RyaW5nW10ge1xuICByZXR1cm4gY2F0ZWdvcmllcy5tYXAoZnVuY3Rpb24gKGNhdGVnb3J5KSB7IHJldHVybiByZWNvcmRbY2F0ZWdvcnldIHx8IFwibi9hXCI7IH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hSZWNvcmRzUXVpY2tNdWx0aXBsZUNhdGVnb3JpZXMocFNlbnRlbmNlczogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMsIGNhdGVnb3JpZXM6IHN0cmluZ1tdLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sIGNhdGVnb3J5U2V0PzogeyBba2V5OiBzdHJpbmddOiBib29sZWFuIH0pXG4gIDogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNUdXBlbEFuc3dlcnMge1xuICAvLyBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAvLyAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gIC8vIH1cbiAgT2JqZWN0LmZyZWV6ZShjYXRlZ29yeVNldCk7XG4gIHZhciBjYXRlZ29yeUYgPSBjYXRlZ29yaWVzWzBdO1xuICBkZWJ1Z2xvZyhcIm1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzIChyPVwiICsgcmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIpXFxuIGNhdGVnb3JpZXM6XCIgKyBjYXRlZ29yaWVzLmpvaW4oXCJcXG5cIikpO1xuICBwZXJmbG9nKFwibWF0Y2hSZWNvcmRzUXVpY2tNdWx0IC4uLihyPVwiICsgcmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIpXCIpO1xuICB2YXIgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZDogSU1hdGNoLklSZWNvcmQpIHtcbiAgICByZXR1cm4gKHJlY29yZFtjYXRlZ29yeUZdICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnlGXSAhPT0gbnVsbCk7XG4gIH0pO1xuICB2YXIgcmVzID0gW10gYXMgQXJyYXk8SU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlcj47XG4gIGRlYnVnbG9nKFwicmVsZXZhbnQgcmVjb3JkcyB3aXRoIGZpcnN0IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiKVwiKTtcbiAgcGVyZmxvZyhcInJlbGV2YW50IHJlY29yZHMgd2l0aCBmaXJzdCBucjpcIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzZW50ZW5jZXMgXCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGgpO1xuICBpZiAocHJvY2Vzcy5lbnYuQUJPVF9GQVNUICYmIGNhdGVnb3J5U2V0KSB7XG4gICAgLy8gd2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbiBjYXRlZ29yaWVzIHByZXNlbnQgaW4gcmVjb3JkcyBmb3IgZG9tYWlucyB3aGljaCBjb250YWluIHRoZSBjYXRlZ29yeVxuICAgIC8vIHZhciBjYXRlZ29yeXNldCA9IE1vZGVsLmNhbGN1bGF0ZVJlbGV2YW50UmVjb3JkQ2F0ZWdvcmllcyh0aGVNb2RlbCxjYXRlZ29yeSk7XG4gICAgLy9rbm93aW5nIHRoZSB0YXJnZXRcbiAgICBwZXJmbG9nKFwiZ290IGNhdGVnb3J5c2V0IHdpdGggXCIgKyBPYmplY3Qua2V5cyhjYXRlZ29yeVNldCkubGVuZ3RoKTtcbiAgICB2YXIgb2JqID0geyBmbDogMCwgbGY6IDAgfTtcbiAgICB2YXIgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBtYWtlU2ltcGxpZmllZFNlbnRlbmNlc0NhdGVnb3J5U2V0KHBTZW50ZW5jZXMsIGNhdGVnb3J5U2V0LG9iaik7XG4gICAgcGVyZmxvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgb2JqLmZsICsgXCItPlwiICsgb2JqLmxmICsgXCIpXCIpO1xuICB9IGVsc2Uge1xuICAgIGRlYnVnbG9nKFwibm90IGFib3RfZmFzdCAhXCIpO1xuICAgIHZhciB0cmFjayA9IHsgZmw6IDAgLCBsZiA6IDB9O1xuICAgIHZhciBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzKHBTZW50ZW5jZXMsdHJhY2spO1xuLypcbiAgICBwU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICAgIH0pO1xuICAgICAgZmwgPSBmbCArIG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgICBsZiA9IGxmICsgcldvcmRzLmxlbmd0aDtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLFxuICAgICAgICByV29yZHM6IHJXb3Jkc1xuICAgICAgfTtcbiAgICB9KTtcbiAgICAqL1xuICAgIGRlYnVnbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyB0cmFjay5mbCArIFwiLT5cIiArIHRyYWNrLmxmICsgXCIpXCIpO1xuICAgIHBlcmZsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIHRyYWNrLmZsICsgXCItPlwiICsgdHJhY2subGYgKyBcIilcIik7XG4gIH1cblxuICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgYVNpbXBsaWZpZWRTZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAoYVNlbnRlbmNlKSB7XG4gICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICB2YXIgbWlzbWF0Y2hlZCA9IDA7XG4gICAgICB2YXIgbWF0Y2hlZCA9IDA7XG4gICAgICB2YXIgbm91c2UgPSAwO1xuICAgICAgdmFyIG1pc3NpbmdjYXQgPSAwO1xuICAgICAgYVNlbnRlbmNlLnJXb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICBpZiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICsrbWF0Y2hlZDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgKyttaXNtYXRjaGVkO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgIT09IFwiY2F0ZWdvcnlcIikge1xuICAgICAgICAgICAgbm91c2UgKz0gMTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCFyZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgICAgbWlzc2luZ2NhdCArPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBpZiAoYVNlbnRlbmNlLmRvbWFpbnMubGVuZ3RoKSB7XG4gICAgICAgIGlmICgocmVjb3JkIGFzIGFueSkuX2RvbWFpbiAhPT0gYVNlbnRlbmNlLmRvbWFpbnNbMF0pIHtcbiAgICAgICAgICBtaXNtYXRjaGVkID0gMzAwMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBtYXRjaGVkICs9IDE7XG4gICAgICAgICAgLy9jb25zb2xlLmxvZyhcIkdPVCBBIERPTUFJTiBISVRcIiArIG1hdGNoZWQgKyBcIiBcIiArIG1pc21hdGNoZWQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBpZihtYXRjaGVkID4gMCB8fCBtaXNtYXRjaGVkID4gMCApIHtcbiAgICAgIC8vICAgY29uc29sZS5sb2coXCIgbVwiICsgbWF0Y2hlZCArIFwiIG1pc21hdGNoZWRcIiArIG1pc21hdGNoZWQpO1xuICAgICAgLy8gfVxuICAgICAgLy9jb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhU2VudGVuY2Uub1NlbnRlbmNlKSk7XG4gICAgICBpZiAobWF0Y2hlZCA+IG1pc21hdGNoZWQpIHtcbiAgICAgICAgdmFyIHJlYyA9IHtcbiAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLm9TZW50ZW5jZSxcbiAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICBjYXRlZ29yaWVzOiBjYXRlZ29yaWVzLFxuICAgICAgICAgIHJlc3VsdDogZXh0cmFjdFJlc3VsdChjYXRlZ29yaWVzLCByZWNvcmQpLFxuICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ1NpbXBsZShtYXRjaGVkLCBtaXNtYXRjaGVkLCAobm91c2UgKyBtaXNzaW5nY2F0KSwgYVNlbnRlbmNlLmNudFJlbGV2YW50V29yZHMpXG4gICAgICAgIH1cbiAgICAgICAgLyogICBpZihyZWNvcmRbXCJhcHBJZFwiXSA9PT1cIkYxNTY2XCIpIHtcbiAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImhlcmUgRjE1NjZcIiArIEpTT04uc3RyaW5naWZ5KHJlYykpO1xuICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaGVyZSBtYXRjaGVkXCIgKyBtYXRjaGVkICsgXCIgbWlzbWF0Y2hlZFwiICsgbWlzbWF0Y2hlZCArIFwiIG5vdXNlIFwiICsgKG5vdXNlICsgbWlzc2luZ2NhdCkpO1xuICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaGVyZSBjbnRSZWxldmFudCA6XCIgKyBhU2VudGVuY2UuY250UmVsZXZhbnRXb3Jkcyk7XG4gICAgICAgICAgIH1cbiAgICAgICAgICAgaWYocmVjb3JkW1wiYXBwSWRcIl0gPT09XCJGMDczMUFcIikge1xuICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaGVyZSBGMDczMUFcIiArIEpTT04uc3RyaW5naWZ5KHJlYykpO1xuICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaGVyZSBtYXRjaGVkXCIgKyBtYXRjaGVkICsgXCIgbWlzbWF0Y2hlZFwiICsgbWlzbWF0Y2hlZCArIFwiIG5vdXNlIFwiICsgKG5vdXNlICsgbWlzc2luZ2NhdCkpO1xuICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaGVyZSBjbnRSZWxldmFudCA6XCIgKyBhU2VudGVuY2UuY250UmVsZXZhbnRXb3Jkcyk7XG4gICAgICAgICAgIH1cbiAgICAgICAgICAgKi9cbiAgICAgICAgcmVzLnB1c2gocmVjKTtcbiAgICAgIH1cbiAgICB9KVxuICB9KTtcbiAgcGVyZmxvZyhcInNvcnQgKGE9XCIgKyByZXMubGVuZ3RoICsgXCIpXCIpO1xuICByZXMuc29ydChjbXBCeVJlc3VsdFRoZW5SYW5raW5nVHVwZWwpO1xuICBwZXJmbG9nKFwiZmlsdGVyUmV0YWluIC4uLlwiKTtcbiAgdmFyIHJlc3VsdDEgPSBPYmplY3QuYXNzaWduKHsgdHVwZWxhbnN3ZXJzOiByZXMgfSwgcFNlbnRlbmNlcylcbiAgdmFyIHJlc3VsdDIgPSBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHRUdXBlbChyZXN1bHQxKTtcbiAgcGVyZmxvZyhcIm1hdGNoUmVjb3Jkc1F1aWNrIGRvbmU6IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBhPVwiICsgcmVzLmxlbmd0aCArIFwiKVwiKTtcbiAgcmV0dXJuIHJlc3VsdDI7XG59XG5cblxuZnVuY3Rpb24gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KHdvcmQ6IHN0cmluZywgdGFyZ2V0Y2F0ZWdvcnk6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLFxuICB3aG9sZXNlbnRlbmNlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAvL2NvbnNvbGUubG9nKFwiY2xhc3NpZnkgXCIgKyB3b3JkICsgXCIgXCIgICsgdGFyZ2V0Y2F0ZWdvcnkpO1xuICB2YXIgY2F0cyA9IElucHV0RmlsdGVyLmNhdGVnb3JpemVBV29yZCh3b3JkLCBydWxlcywgd2hvbGVzZW50ZW5jZSwge30pO1xuICAvLyBUT0RPIHF1YWxpZnlcbiAgY2F0cyA9IGNhdHMuZmlsdGVyKGZ1bmN0aW9uIChjYXQpIHtcbiAgICByZXR1cm4gY2F0LmNhdGVnb3J5ID09PSB0YXJnZXRjYXRlZ29yeTtcbiAgfSlcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoY2F0cykpO1xuICBpZiAoY2F0cy5sZW5ndGgpIHtcbiAgICByZXR1cm4gY2F0c1swXS5tYXRjaGVkU3RyaW5nO1xuICB9XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVDYXRlZ29yeShjYXRlZ29yeXdvcmQ6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCB3aG9sZXNlbnRlbmNlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KGNhdGVnb3J5d29yZCwgJ2NhdGVnb3J5JywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3BsaXRBdENvbW1hQW5kKHN0cjogc3RyaW5nKTogc3RyaW5nW10ge1xuICB2YXIgciA9IHN0ci5zcGxpdCgvKFxcYmFuZFxcYil8WyxdLyk7XG4gIHIgPSByLmZpbHRlcihmdW5jdGlvbiAobywgaW5kZXgpIHtcbiAgICBpZiAoaW5kZXggJSAyID4gMCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG4gIHZhciBydHJpbW1lZCA9IHIubWFwKGZ1bmN0aW9uIChvKSB7XG4gICAgcmV0dXJuIG5ldyBTdHJpbmcobykudHJpbSgpO1xuICB9KTtcbiAgcmV0dXJuIHJ0cmltbWVkO1xufVxuLyoqXG4gKiBBIHNpbXBsZSBpbXBsZW1lbnRhdGlvbiwgc3BsaXR0aW5nIGF0IGFuZCBhbmQgLFxuICovXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZUNhdGVnb3J5TXVsdE9ubHlBbmRDb21tYShjYXRlZ29yeWxpc3Q6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCB3aG9sZXNlbnRlbmNlOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIHZhciBydHJpbW1lZCA9IHNwbGl0QXRDb21tYUFuZChjYXRlZ29yeWxpc3QpO1xuICB2YXIgcmNhdCA9IHJ0cmltbWVkLm1hcChmdW5jdGlvbiAobykge1xuICAgIHJldHVybiBhbmFseXplQ2F0ZWdvcnkobywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xuICB9KTtcbiAgaWYgKHJjYXQuaW5kZXhPZih1bmRlZmluZWQpID49IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1wiJyArIHJ0cmltbWVkW3JjYXQuaW5kZXhPZih1bmRlZmluZWQpXSArICdcIiBpcyBub3QgYSBjYXRlZ29yeSEnKTtcbiAgfVxuICByZXR1cm4gcmNhdDtcbn1cblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJBY2NlcHRpbmdPbmx5KHJlczogSU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdW10sIGNhdGVnb3JpZXM6IHN0cmluZ1tdKTpcbiAgSU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdW10ge1xuICByZXR1cm4gcmVzLmZpbHRlcihmdW5jdGlvbiAoYVNlbnRlbmNlLCBpSW5kZXgpIHtcbiAgICByZXR1cm4gYVNlbnRlbmNlLmV2ZXJ5KGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgcmV0dXJuIGNhdGVnb3JpZXMuaW5kZXhPZihvV29yZC5jYXRlZ29yeSkgPj0gMDtcbiAgICB9KTtcbiAgfSlcbn1cblxuXG5pbXBvcnQgKiBhcyBFcmJhc2UgZnJvbSAnLi9lcmJhc2UnO1xuXG52YXIgc1dvcmRzID0ge307XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNldENhY2hlKCk6IHZvaWQge1xuICBzV29yZHMgPSB7fTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByb2Nlc3NTdHJpbmcocXVlcnk6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzXG4pOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcyB7XG5cbiAgaWYgKCFwcm9jZXNzLmVudi5BQk9UX09MRE1BVENIKSB7XG4gICAgcmV0dXJuIEVyYmFzZS5wcm9jZXNzU3RyaW5nKHF1ZXJ5LCBydWxlcywgcnVsZXMud29yZENhY2hlKTtcbiAgfVxuLypcbiAgdmFyIG1hdGNoZWQgPSBJbnB1dEZpbHRlci5hbmFseXplU3RyaW5nKHF1ZXJ5LCBydWxlcywgc1dvcmRzKTtcbiAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICBkZWJ1Z2xvZyhcIkFmdGVyIG1hdGNoZWQgXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkKSk7XG4gIH1cbiAgdmFyIGFTZW50ZW5jZXMgPSBJbnB1dEZpbHRlci5leHBhbmRNYXRjaEFycihtYXRjaGVkKTtcbiAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICBkZWJ1Z2xvZyhcImFmdGVyIGV4cGFuZFwiICsgYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgfSkuam9pbihcIlxcblwiKSk7XG4gIH1cbiAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gSW5wdXRGaWx0ZXIucmVpbkZvcmNlKGFTZW50ZW5jZXMpO1xuICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgIGRlYnVnbG9nKFwiYWZ0ZXIgcmVpbmZvcmNlXCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgfSkuam9pbihcIlxcblwiKSk7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBlcnJvcnM6IFtdLFxuICAgIHNlbnRlbmNlczogYVNlbnRlbmNlc1JlaW5mb3JjZWRcbiAgfSBhcyBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcztcbiovXG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVDb250ZXh0U3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMpOlxuICBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcyB7XG5cbiAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gcHJvY2Vzc1N0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKVxuICAvLyB3ZSBsaW1pdCBhbmFseXNpcyB0byBuIHNlbnRlbmNlc1xuICBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMgPSBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMuc2xpY2UoMCwgQWxnb2wuQ3V0b2ZmX1NlbnRlbmNlcyk7XG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgZGVidWdsb2coXCJhZnRlciByZWluZm9yY2UgYW5kIGN1dG9mZlwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLmxlbmd0aCArIFwiXFxuXCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICB9XG4gIHJldHVybiBhU2VudGVuY2VzUmVpbmZvcmNlZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNtcEJ5TnJDYXRlZ29yaWVzQW5kU2FtZURvbWFpbihhOiBJTWF0Y2guSVNlbnRlbmNlLCBiOiBJTWF0Y2guSVNlbnRlbmNlKTogbnVtYmVyIHtcbiAgLy9jb25zb2xlLmxvZyhcImNvbXBhcmUgYVwiICsgYSArIFwiIGNudGIgXCIgKyBiKTtcbiAgdmFyIGNudGEgPSBTZW50ZW5jZS5nZXREaXN0aW5jdENhdGVnb3JpZXNJblNlbnRlbmNlKGEpLmxlbmd0aDtcbiAgdmFyIGNudGIgPSBTZW50ZW5jZS5nZXREaXN0aW5jdENhdGVnb3JpZXNJblNlbnRlbmNlKGIpLmxlbmd0aDtcbiAgLypcbiAgICB2YXIgY250YSA9IGEucmVkdWNlKGZ1bmN0aW9uKHByZXYsIG9Xb3JkKSB7XG4gICAgICByZXR1cm4gcHJldiArICgob1dvcmQuY2F0ZWdvcnkgPT09IFwiY2F0ZWdvcnlcIik/IDEgOiAwKTtcbiAgICB9LDApO1xuICAgIHZhciBjbnRiID0gYi5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgb1dvcmQpIHtcbiAgICAgIHJldHVybiBwcmV2ICsgKChvV29yZC5jYXRlZ29yeSA9PT0gXCJjYXRlZ29yeVwiKT8gMSA6IDApO1xuICAgIH0sMCk7XG4gICAvLyBjb25zb2xlLmxvZyhcImNudCBhXCIgKyBjbnRhICsgXCIgY250YiBcIiArIGNudGIpO1xuICAgKi9cbiAgcmV0dXJuIGNudGIgLSBjbnRhO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZUNhdGVnb3J5TXVsdChjYXRlZ29yeWxpc3Q6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCB3aG9sZXNlbnRlbmNlOiBzdHJpbmcsIGdXb3JkczpcbiAgeyBba2V5OiBzdHJpbmddOiBJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW10gfSk6IHN0cmluZ1tdIHtcbiAgdmFyIHJlcyA9IGFuYWx5emVDb250ZXh0U3RyaW5nKGNhdGVnb3J5bGlzdCwgcnVsZXMpO1xuICAvLyAgZGVidWdsb2coXCJyZXN1bHRpbmcgY2F0ZWdvcnkgc2VudGVuY2VzXCIsIEpTT04uc3RyaW5naWZ5KHJlcykpO1xuICB2YXIgcmVzMiA9IGZpbHRlckFjY2VwdGluZ09ubHkocmVzLnNlbnRlbmNlcywgW1wiY2F0ZWdvcnlcIiwgXCJmaWxsZXJcIl0pO1xuICAvLyAgY29uc29sZS5sb2coXCJoZXJlIHJlczJcIiArIEpTT04uc3RyaW5naWZ5KHJlczIpICk7XG4gIC8vICBjb25zb2xlLmxvZyhcImhlcmUgdW5kZWZpbmVkICEgKyBcIiArIHJlczIuZmlsdGVyKG8gPT4gIW8pLmxlbmd0aCk7XG4gIHJlczIuc29ydChTZW50ZW5jZS5jbXBSYW5raW5nUHJvZHVjdCk7XG4gIGRlYnVnbG9nKFwicmVzdWx0aW5nIGNhdGVnb3J5IHNlbnRlbmNlczogXFxuXCIsIGRlYnVnbG9nLmVuYWJsZWQgPyAoU2VudGVuY2UuZHVtcE5pY2VBcnIocmVzMi5zbGljZSgwLCAzKSwgU2VudGVuY2UucmFua2luZ1Byb2R1Y3QpKSA6ICctJyk7XG4gIC8vIFRPRE86ICAgcmVzMiA9IGZpbHRlckFjY2VwdGluZ09ubHlTYW1lRG9tYWluKHJlczIpO1xuICAvL2RlYnVnbG9nKFwicmVzdWx0aW5nIGNhdGVnb3J5IHNlbnRlbmNlc1wiLCBKU09OLnN0cmluZ2lmeShyZXMyLCB1bmRlZmluZWQsIDIpKTtcbiAgLy8gZXhwZWN0IG9ubHkgY2F0ZWdvcmllc1xuICAvLyB3ZSBjb3VsZCByYW5rIG5vdyBieSBjb21tb24gZG9tYWlucyAsIGJ1dCBmb3Igbm93IHdlIG9ubHkgdGFrZSB0aGUgZmlyc3Qgb25lXG4gIGlmICghcmVzMi5sZW5ndGgpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIC8vcmVzLnNvcnQoY21wQnlOckNhdGVnb3JpZXNBbmRTYW1lRG9tYWluKTtcbiAgdmFyIHJlc2NhdCA9IFNlbnRlbmNlLmdldERpc3RpbmN0Q2F0ZWdvcmllc0luU2VudGVuY2UocmVzMlswXSk7XG4gIHJldHVybiByZXNjYXQ7XG4gIC8vIFwiXCIgcmV0dXJuIHJlc1swXS5maWx0ZXIoKVxuICAvLyByZXR1cm4gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KGNhdGVnb3J5bGlzdCwgJ2NhdGVnb3J5JywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZU9wZXJhdG9yKG9wd29yZDogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHdob2xlc2VudGVuY2U6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBjbGFzc2lmeVdvcmRXaXRoVGFyZ2V0Q2F0ZWdvcnkob3B3b3JkLCAnb3BlcmF0b3InLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG59XG5cblxuaW1wb3J0ICogYXMgRXJFcnJvciBmcm9tICcuL2VyZXJyb3InO1xuXG5pbXBvcnQgKiBhcyBMaXN0QWxsIGZyb20gJy4vbGlzdGFsbCc7XG4vLyBjb25zdCByZXN1bHQgPSBXaGF0SXMucmVzb2x2ZUNhdGVnb3J5KGNhdCwgYTEuZW50aXR5LFxuLy8gICB0aGVNb2RlbC5tUnVsZXMsIHRoZU1vZGVsLnRvb2xzLCB0aGVNb2RlbC5yZWNvcmRzKTtcblxuXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUNhdGVnb3J5KGNhdGVnb3J5OiBzdHJpbmcsIGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLFxuICBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPik6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzQW5zd2VycyB7XG4gIGlmIChjb250ZXh0UXVlcnlTdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHsgZXJyb3JzOiBbRXJFcnJvci5tYWtlRXJyb3JfRU1QVFlfSU5QVVQoKV0sIHRva2VuczogW10sIGFuc3dlcnM6IFtdIH07XG4gIH0gZWxzZSB7XG4gICAgLypcbiAgICAgICAgdmFyIG1hdGNoZWQgPSBJbnB1dEZpbHRlci5hbmFseXplU3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMpO1xuICAgICAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiYWZ0ZXIgbWF0Y2hlZCBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWQpKTogJy0nKTtcbiAgICAgICAgdmFyIGFTZW50ZW5jZXMgPSBJbnB1dEZpbHRlci5leHBhbmRNYXRjaEFycihtYXRjaGVkKTtcbiAgICAgICAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgIGRlYnVnbG9nKFwiYWZ0ZXIgZXhwYW5kXCIgKyBhU2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICAgICAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgICAgIH0gKi9cblxuXG4gICAgICAgICAgLy8gdmFyIGNhdGVnb3J5U2V0ID0gTW9kZWwuZ2V0QWxsUmVjb3JkQ2F0ZWdvcmllc0ZvclRhcmdldENhdGVnb3J5KHRoZU1vZGVsLCBjYXQsIHRydWUpO1xuXG4gICAgdmFyIHJlcyA9IExpc3RBbGwubGlzdEFsbFdpdGhDb250ZXh0KGNhdGVnb3J5LCBjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzLCByZWNvcmRzKTtcbiAgICAvLyogc29ydCBieSBzZW50ZW5jZVxuICAgIHJlcy5hbnN3ZXJzLmZvckVhY2gobyA9PiB7IG8uX3JhbmtpbmcgPSBvLl9yYW5raW5nICogIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KCBvLnNlbnRlbmNlICk7IH0pO1xuICAgIHJlcy5hbnN3ZXJzLnNvcnQoY21wQnlSYW5raW5nKTtcbiAgICByZXR1cm4gcmVzO1xuLypcbiAgICAvLyA/Pz8gdmFyIHJlcyA9IExpc3RBbGwubGlzdEFsbEhhdmluZ0NvbnRleHQoY2F0ZWdvcnksIGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMsIHJlY29yZHMpO1xuXG4gICAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gcHJvY2Vzc1N0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKTtcbiAgICAvL2FTZW50ZW5jZXMubWFwKGZ1bmN0aW9uKG9TZW50ZW5jZSkgeyByZXR1cm4gSW5wdXRGaWx0ZXIucmVpbkZvcmNlKG9TZW50ZW5jZSk7IH0pO1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJhZnRlciByZWluZm9yY2VcIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgfSkuam9pbihcIlxcblwiKSkgOiAnLScpO1xuICAgIHZhciBtYXRjaGVkQW5zd2VycyA9IG1hdGNoUmVjb3JkcyhhU2VudGVuY2VzUmVpbmZvcmNlZCwgY2F0ZWdvcnksIHJlY29yZHMpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8gKiBvYmplY3RzdHJlYW0qIC8ge1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCIgbWF0Y2hlZEFuc3dlcnNcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRBbnN3ZXJzLCB1bmRlZmluZWQsIDIpKSA6ICctJyk7XG4gICAgcmV0dXJuIG1hdGNoZWRBbnN3ZXJzO1xuKi9cbiB9XG59XG5cbi8qXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUNhdGVnb3J5T2xkKGNhdGVnb3J5OiBzdHJpbmcsIGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLFxuICBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPik6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzQW5zd2VycyB7XG4gIGlmIChjb250ZXh0UXVlcnlTdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHsgZXJyb3JzOiBbRXJFcnJvci5tYWtlRXJyb3JfRU1QVFlfSU5QVVQoKV0sIHRva2VuczogW10sIGFuc3dlcnM6IFtdIH07XG4gIH0gZWxzZSB7XG4gICAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gcHJvY2Vzc1N0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKTtcbiAgICAvL2FTZW50ZW5jZXMubWFwKGZ1bmN0aW9uKG9TZW50ZW5jZSkgeyByZXR1cm4gSW5wdXRGaWx0ZXIucmVpbkZvcmNlKG9TZW50ZW5jZSk7IH0pO1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJhZnRlciByZWluZm9yY2VcIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgfSkuam9pbihcIlxcblwiKSkgOiAnLScpO1xuICAgIHZhciBtYXRjaGVkQW5zd2VycyA9IG1hdGNoUmVjb3JkcyhhU2VudGVuY2VzUmVpbmZvcmNlZCwgY2F0ZWdvcnksIHJlY29yZHMpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8gKiBvYmplY3RzdHJlYW0qIC8ge1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCIgbWF0Y2hlZEFuc3dlcnNcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRBbnN3ZXJzLCB1bmRlZmluZWQsIDIpKSA6ICctJyk7XG4gICAgcmV0dXJuIG1hdGNoZWRBbnN3ZXJzO1xuICB9XG59XG4qL1xuXG5pbXBvcnQgKiBhcyBNb2RlbCBmcm9tICcuLi9tb2RlbC9tb2RlbCc7XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlQ2F0ZWdvcmllcyhjYXRlZ29yaWVzOiBzdHJpbmdbXSwgY29udGV4dFF1ZXJ5U3RyaW5nOiBzdHJpbmcsXG4gIHRoZU1vZGVsOiBJTWF0Y2guSU1vZGVscyk6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzVHVwZWxBbnN3ZXJzIHtcbiAgdmFyIHJlY29yZHMgPSB0aGVNb2RlbC5yZWNvcmRzO1xuICB2YXIgcnVsZXMgPSB0aGVNb2RlbC5ydWxlcztcbiAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4ge1xuICAgICAgZXJyb3JzOiBbRXJFcnJvci5tYWtlRXJyb3JfRU1QVFlfSU5QVVQoKV0sXG4gICAgICB0dXBlbGFuc3dlcnM6IFtdLFxuICAgICAgdG9rZW5zOiBbXVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyB2YXIgY2F0ZWdvcnlTZXQgPSBNb2RlbC5nZXRBbGxSZWNvcmRDYXRlZ29yaWVzRm9yVGFyZ2V0Q2F0ZWdvcnkodGhlTW9kZWwsIGNhdCwgdHJ1ZSk7XG4gICAgdmFyIHJlcyA9IExpc3RBbGwubGlzdEFsbFR1cGVsV2l0aENvbnRleHQoY2F0ZWdvcmllcywgY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcywgcmVjb3Jkcyk7XG4gICAgLy8qIHNvcnQgYnkgc2VudGVuY2VcbiAgICByZXMudHVwZWxhbnN3ZXJzLmZvckVhY2gobyA9PiB7IG8uX3JhbmtpbmcgPSBvLl9yYW5raW5nICogIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KCBvLnNlbnRlbmNlICk7IH0pO1xuICAgIHJlcy50dXBlbGFuc3dlcnMuc29ydChjbXBCeVJhbmtpbmdUdXBlbCk7XG4gICAgcmV0dXJuIHJlcztcbiAgfVxufVxuXG4vKlxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVDYXRlZ29yaWVzT2xkKGNhdGVnb3JpZXM6IHN0cmluZ1tdLCBjb250ZXh0UXVlcnlTdHJpbmc6IHN0cmluZyxcbiAgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzKTogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNUdXBlbEFuc3dlcnMge1xuICB2YXIgcmVjb3JkcyA9IHRoZU1vZGVsLnJlY29yZHM7XG4gIHZhciBydWxlcyA9IHRoZU1vZGVsLnJ1bGVzO1xuICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcnM6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSxcbiAgICAgIHR1cGVsYW5zd2VyczogW10sXG4gICAgICB0b2tlbnM6IFtdXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IHByb2Nlc3NTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCB0aGVNb2RlbC5ydWxlcyk7XG4gICAgLy9hU2VudGVuY2VzLm1hcChmdW5jdGlvbihvU2VudGVuY2UpIHsgcmV0dXJuIElucHV0RmlsdGVyLnJlaW5Gb3JjZShvU2VudGVuY2UpOyB9KTtcbiAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiYWZ0ZXIgcmVpbmZvcmNlXCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgIH0pLmpvaW4oXCJcXG5cIikpIDogJy0nKTtcbiAgICAvL3ZhciBtYXRjaGVkQW5zd2VycyA9IG1hdGNoUmVjb3Jkc1F1aWNrKGFTZW50ZW5jZXMsIGNhdGVnb3J5LCByZWNvcmRzKTsgLy9hVG9vbDogQXJyYXk8SU1hdGNoLklUb29sPik6IGFueSAvICogb2JqZWN0c3RyZWFtKiAvIHtcbiAgICB2YXIgY2F0ZWdvcnlTZXQgPSB7fTtcbiAgICBjYXRlZ29yaWVzLmZvckVhY2goZnVuY3Rpb24gKGNhdGVnb3J5KSB7XG4gICAgICBjYXRlZ29yeVNldFtjYXRlZ29yeV0gPSB0cnVlO1xuICAgICAgdmFyIGNhdGVnb3J5U2V0TG9jYWwgPSBNb2RlbC5nZXRBbGxSZWNvcmRDYXRlZ29yaWVzRm9yVGFyZ2V0Q2F0ZWdvcnkodGhlTW9kZWwsIGNhdGVnb3J5LCB0cnVlKTtcbiAgICAgIE9iamVjdC5hc3NpZ24oY2F0ZWdvcnlTZXQsIGNhdGVnb3J5U2V0TG9jYWwpO1xuICAgIH0pO1xuXG4gICAgdmFyIG1hdGNoZWRBbnN3ZXJzID0gbWF0Y2hSZWNvcmRzUXVpY2tNdWx0aXBsZUNhdGVnb3JpZXMoYVNlbnRlbmNlc1JlaW5mb3JjZWQsIGNhdGVnb3JpZXMsIHJlY29yZHMsIGNhdGVnb3J5U2V0KTsgLy9hVG9vbDogQXJyYXk8SU1hdGNoLklUb29sPik6IGFueSAvICogb2JqZWN0c3RyZWFtICogLyB7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgIGRlYnVnbG9nKFwiIG1hdGNoZWQgQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMsIHVuZGVmaW5lZCwgMikpO1xuICAgIH1cbiAgICBwZXJmbG9nKFwiZmlsdGVyaW5nIHRvcFJhbmtlZCAoYT1cIiArIG1hdGNoZWRBbnN3ZXJzLnR1cGVsYW5zd2Vycy5sZW5ndGggKyBcIikuLi5cIik7XG4gICAgdmFyIG1hdGNoZWRGaWx0ZXJlZCA9IE9iamVjdC5hc3NpZ24oe30sIG1hdGNoZWRBbnN3ZXJzKTtcbiAgICBtYXRjaGVkRmlsdGVyZWQudHVwZWxhbnN3ZXJzID0gZmlsdGVyT25seVRvcFJhbmtlZFR1cGVsKG1hdGNoZWRBbnN3ZXJzLnR1cGVsYW5zd2Vycyk7XG5cbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgZGVidWdsb2coXCIgbWF0Y2hlZCB0b3AtcmFua2VkIEFuc3dlcnNcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRGaWx0ZXJlZCwgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHBlcmZsb2coXCJ0b3RhbFdoYXRpc1dpdGhDb250ZXh0IChhPVwiICsgbWF0Y2hlZEZpbHRlcmVkLnR1cGVsYW5zd2Vycy5sZW5ndGggKyBcIilcIik7XG4gICAgcmV0dXJuIG1hdGNoZWRGaWx0ZXJlZDsgLy8gPz8/IEFuc3dlcnM7XG4gIH1cbn1cbiovXG5cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJPbmx5VG9wUmFua2VkKHJlc3VsdHM6IEFycmF5PElNYXRjaC5JV2hhdElzQW5zd2VyPik6IEFycmF5PElNYXRjaC5JV2hhdElzQW5zd2VyPiB7XG4gIHZhciByZXMgPSByZXN1bHRzLmZpbHRlcihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgaWYgKHJlc3VsdC5fcmFua2luZyA9PT0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChyZXN1bHQuX3JhbmtpbmcgPj0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTGlzdCB0byBmaWx0ZXIgbXVzdCBiZSBvcmRlcmVkXCIpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuICByZXR1cm4gcmVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyT25seVRvcFJhbmtlZFR1cGVsKHJlc3VsdHM6IEFycmF5PElNYXRjaC5JV2hhdElzVHVwZWxBbnN3ZXI+KTogQXJyYXk8SU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlcj4ge1xuICB2YXIgcmVzID0gcmVzdWx0cy5maWx0ZXIoZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgIGlmIChyZXN1bHQuX3JhbmtpbmcgPT09IHJlc3VsdHNbMF0uX3JhbmtpbmcpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAocmVzdWx0Ll9yYW5raW5nID49IHJlc3VsdHNbMF0uX3JhbmtpbmcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkxpc3QgdG8gZmlsdGVyIG11c3QgYmUgb3JkZXJlZFwiKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbiAgcmV0dXJuIHJlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzSW5kaXNjcmltaW5hdGVSZXN1bHQocmVzdWx0czogQXJyYXk8SU1hdGNoLklXaGF0SXNBbnN3ZXI+KTogc3RyaW5nIHtcbiAgdmFyIGNudCA9IHJlc3VsdHMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCByZXN1bHQpIHtcbiAgICBpZiAocmVzdWx0Ll9yYW5raW5nID09PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICByZXR1cm4gcHJldiArIDE7XG4gICAgfVxuICB9LCAwKTtcbiAgaWYgKGNudCA+IDEpIHtcbiAgICAvLyBzZWFyY2ggZm9yIGEgZGlzY3JpbWluYXRpbmcgY2F0ZWdvcnkgdmFsdWVcbiAgICB2YXIgZGlzY3JpbWluYXRpbmcgPSBPYmplY3Qua2V5cyhyZXN1bHRzWzBdLnJlY29yZCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBjYXRlZ29yeSkge1xuICAgICAgaWYgKChjYXRlZ29yeS5jaGFyQXQoMCkgIT09ICdfJyAmJiBjYXRlZ29yeSAhPT0gcmVzdWx0c1swXS5jYXRlZ29yeSlcbiAgICAgICAgJiYgKHJlc3VsdHNbMF0ucmVjb3JkW2NhdGVnb3J5XSAhPT0gcmVzdWx0c1sxXS5yZWNvcmRbY2F0ZWdvcnldKSkge1xuICAgICAgICBwcmV2LnB1c2goY2F0ZWdvcnkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgW10pO1xuICAgIGlmIChkaXNjcmltaW5hdGluZy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBcIk1hbnkgY29tcGFyYWJsZSByZXN1bHRzLCBwZXJoYXBzIHlvdSB3YW50IHRvIHNwZWNpZnkgYSBkaXNjcmltaW5hdGluZyBcIiArIGRpc2NyaW1pbmF0aW5nLmpvaW4oJywnKTtcbiAgICB9XG4gICAgcmV0dXJuICdZb3VyIHF1ZXN0aW9uIGRvZXMgbm90IGhhdmUgYSBzcGVjaWZpYyBhbnN3ZXInO1xuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0luZGlzY3JpbWluYXRlUmVzdWx0VHVwZWwocmVzdWx0czogQXJyYXk8SU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlcj4pOiBzdHJpbmcge1xuICB2YXIgY250ID0gcmVzdWx0cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHJlc3VsdCkge1xuICAgIGlmIChyZXN1bHQuX3JhbmtpbmcgPT09IHJlc3VsdHNbMF0uX3JhbmtpbmcpIHtcbiAgICAgIHJldHVybiBwcmV2ICsgMTtcbiAgICB9XG4gIH0sIDApO1xuICBpZiAoY250ID4gMSkge1xuICAgIC8vIHNlYXJjaCBmb3IgYSBkaXNjcmltaW5hdGluZyBjYXRlZ29yeSB2YWx1ZVxuICAgIHZhciBkaXNjcmltaW5hdGluZyA9IE9iamVjdC5rZXlzKHJlc3VsdHNbMF0ucmVjb3JkKS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGNhdGVnb3J5KSB7XG4gICAgICBpZiAoKGNhdGVnb3J5LmNoYXJBdCgwKSAhPT0gJ18nICYmIHJlc3VsdHNbMF0uY2F0ZWdvcmllcy5pbmRleE9mKGNhdGVnb3J5KSA8IDApXG4gICAgICAgICYmIChyZXN1bHRzWzBdLnJlY29yZFtjYXRlZ29yeV0gIT09IHJlc3VsdHNbMV0ucmVjb3JkW2NhdGVnb3J5XSkpIHtcbiAgICAgICAgcHJldi5wdXNoKGNhdGVnb3J5KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIFtdKTtcbiAgICBpZiAoZGlzY3JpbWluYXRpbmcubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gXCJNYW55IGNvbXBhcmFibGUgcmVzdWx0cywgcGVyaGFwcyB5b3Ugd2FudCB0byBzcGVjaWZ5IGEgZGlzY3JpbWluYXRpbmcgXCIgKyBkaXNjcmltaW5hdGluZy5qb2luKCcsJykgKyAnIG9yIHVzZSBcImxpc3QgYWxsIC4uLlwiJztcbiAgICB9XG4gICAgcmV0dXJuICdZb3VyIHF1ZXN0aW9uIGRvZXMgbm90IGhhdmUgYSBzcGVjaWZpYyBhbnN3ZXInO1xuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG4iLCIvKipcbiAqXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5hbmFseXplXG4gKiBAZmlsZSBhbmFseXplLnRzXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXG4gKi9cblwidXNlIHN0cmljdFwiO1xudmFyIElucHV0RmlsdGVyID0gcmVxdWlyZShcIi4vaW5wdXRGaWx0ZXJcIik7XG52YXIgZGVidWcgPSByZXF1aXJlKFwiZGVidWdcIik7XG52YXIgZGVidWdsb2cgPSBkZWJ1Zygnd2hhdGlzJyk7XG52YXIgZGVidWdsb2dWID0gZGVidWcoJ3doYXRWaXMnKTtcbnZhciBwZXJmbG9nID0gZGVidWcoJ3BlcmYnKTtcbnZhciBfID0gcmVxdWlyZShcImxvZGFzaFwiKTtcbnZhciBTZW50ZW5jZSA9IHJlcXVpcmUoXCIuL3NlbnRlbmNlXCIpO1xudmFyIFdvcmQgPSByZXF1aXJlKFwiLi93b3JkXCIpO1xudmFyIEFsZ29sID0gcmVxdWlyZShcIi4vYWxnb2xcIik7XG5mdW5jdGlvbiBjbXBCeVJlc3VsdFRoZW5SYW5raW5nKGEsIGIpIHtcbiAgICB2YXIgY21wID0gYS5yZXN1bHQubG9jYWxlQ29tcGFyZShiLnJlc3VsdCk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgICByZXR1cm4gY21wO1xuICAgIH1cbiAgICByZXR1cm4gLShhLl9yYW5raW5nIC0gYi5fcmFua2luZyk7XG59XG5leHBvcnRzLmNtcEJ5UmVzdWx0VGhlblJhbmtpbmcgPSBjbXBCeVJlc3VsdFRoZW5SYW5raW5nO1xuZnVuY3Rpb24gbG9jYWxlQ29tcGFyZUFycnMoYWFyZXN1bHQsIGJicmVzdWx0KSB7XG4gICAgdmFyIGNtcCA9IDA7XG4gICAgdmFyIGJsZW4gPSBiYnJlc3VsdC5sZW5ndGg7XG4gICAgYWFyZXN1bHQuZXZlcnkoZnVuY3Rpb24gKGEsIGluZGV4KSB7XG4gICAgICAgIGlmIChibGVuIDw9IGluZGV4KSB7XG4gICAgICAgICAgICBjbXAgPSAtMTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBjbXAgPSBhLmxvY2FsZUNvbXBhcmUoYmJyZXN1bHRbaW5kZXhdKTtcbiAgICAgICAgaWYgKGNtcCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIGlmIChjbXApIHtcbiAgICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG4gICAgaWYgKGJsZW4gPiBhYXJlc3VsdC5sZW5ndGgpIHtcbiAgICAgICAgY21wID0gKzE7XG4gICAgfVxuICAgIHJldHVybiAwO1xufVxuZnVuY3Rpb24gY21wQnlSZXN1bHRUaGVuUmFua2luZ1R1cGVsKGFhLCBiYikge1xuICAgIHZhciBjbXAgPSBsb2NhbGVDb21wYXJlQXJycyhhYS5yZXN1bHQsIGJiLnJlc3VsdCk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgICByZXR1cm4gY21wO1xuICAgIH1cbiAgICByZXR1cm4gLShhYS5fcmFua2luZyAtIGJiLl9yYW5raW5nKTtcbn1cbmV4cG9ydHMuY21wQnlSZXN1bHRUaGVuUmFua2luZ1R1cGVsID0gY21wQnlSZXN1bHRUaGVuUmFua2luZ1R1cGVsO1xuZnVuY3Rpb24gY21wQnlSYW5raW5nKGEsIGIpIHtcbiAgICB2YXIgY21wID0gLShhLl9yYW5raW5nIC0gYi5fcmFua2luZyk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgICByZXR1cm4gY21wO1xuICAgIH1cbiAgICBjbXAgPSBhLnJlc3VsdC5sb2NhbGVDb21wYXJlKGIucmVzdWx0KTtcbiAgICBpZiAoY21wKSB7XG4gICAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuICAgIC8vIGFyZSByZWNvcmRzIGRpZmZlcmVudD9cbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGEucmVjb3JkKS5jb25jYXQoT2JqZWN0LmtleXMoYi5yZWNvcmQpKS5zb3J0KCk7XG4gICAgdmFyIHJlcyA9IGtleXMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBzS2V5KSB7XG4gICAgICAgIGlmIChwcmV2KSB7XG4gICAgICAgICAgICByZXR1cm4gcHJldjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYi5yZWNvcmRbc0tleV0gIT09IGEucmVjb3JkW3NLZXldKSB7XG4gICAgICAgICAgICBpZiAoIWIucmVjb3JkW3NLZXldKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFhLnJlY29yZFtzS2V5XSkge1xuICAgICAgICAgICAgICAgIHJldHVybiArMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBhLnJlY29yZFtzS2V5XS5sb2NhbGVDb21wYXJlKGIucmVjb3JkW3NLZXldKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9LCAwKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5jbXBCeVJhbmtpbmcgPSBjbXBCeVJhbmtpbmc7XG5mdW5jdGlvbiBjbXBCeVJhbmtpbmdUdXBlbChhLCBiKSB7XG4gICAgdmFyIGNtcCA9IC0oYS5fcmFua2luZyAtIGIuX3JhbmtpbmcpO1xuICAgIGlmIChjbXApIHtcbiAgICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG4gICAgY21wID0gbG9jYWxlQ29tcGFyZUFycnMoYS5yZXN1bHQsIGIucmVzdWx0KTtcbiAgICBpZiAoY21wKSB7XG4gICAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuICAgIC8vIGFyZSByZWNvcmRzIGRpZmZlcmVudD9cbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGEucmVjb3JkKS5jb25jYXQoT2JqZWN0LmtleXMoYi5yZWNvcmQpKS5zb3J0KCk7XG4gICAgdmFyIHJlcyA9IGtleXMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBzS2V5KSB7XG4gICAgICAgIGlmIChwcmV2KSB7XG4gICAgICAgICAgICByZXR1cm4gcHJldjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYi5yZWNvcmRbc0tleV0gIT09IGEucmVjb3JkW3NLZXldKSB7XG4gICAgICAgICAgICBpZiAoIWIucmVjb3JkW3NLZXldKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFhLnJlY29yZFtzS2V5XSkge1xuICAgICAgICAgICAgICAgIHJldHVybiArMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBhLnJlY29yZFtzS2V5XS5sb2NhbGVDb21wYXJlKGIucmVjb3JkW3NLZXldKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9LCAwKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5jbXBCeVJhbmtpbmdUdXBlbCA9IGNtcEJ5UmFua2luZ1R1cGVsO1xuZnVuY3Rpb24gZHVtcE5pY2UoYW5zd2VyKSB7XG4gICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgczogXCJcIixcbiAgICAgICAgcHVzaDogZnVuY3Rpb24gKHMpIHsgdGhpcy5zID0gdGhpcy5zICsgczsgfVxuICAgIH07XG4gICAgdmFyIHMgPSBcIioqUmVzdWx0IGZvciBjYXRlZ29yeTogXCIgKyBhbnN3ZXIuY2F0ZWdvcnkgKyBcIiBpcyBcIiArIGFuc3dlci5yZXN1bHQgKyBcIlxcbiByYW5rOiBcIiArIGFuc3dlci5fcmFua2luZyArIFwiXFxuXCI7XG4gICAgcmVzdWx0LnB1c2gocyk7XG4gICAgT2JqZWN0LmtleXMoYW5zd2VyLnJlY29yZCkuZm9yRWFjaChmdW5jdGlvbiAoc1JlcXVpcmVzLCBpbmRleCkge1xuICAgICAgICBpZiAoc1JlcXVpcmVzLmNoYXJBdCgwKSAhPT0gJ18nKSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaChcInJlY29yZDogXCIgKyBzUmVxdWlyZXMgKyBcIiAtPiBcIiArIGFuc3dlci5yZWNvcmRbc1JlcXVpcmVzXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0LnB1c2goJ1xcbicpO1xuICAgIH0pO1xuICAgIHZhciBvU2VudGVuY2UgPSBhbnN3ZXIuc2VudGVuY2U7XG4gICAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpbmRleCkge1xuICAgICAgICB2YXIgc1dvcmQgPSBcIltcIiArIGluZGV4ICsgXCJdIDogXCIgKyBvV29yZC5jYXRlZ29yeSArIFwiIFxcXCJcIiArIG9Xb3JkLnN0cmluZyArIFwiXFxcIiA9PiBcXFwiXCIgKyBvV29yZC5tYXRjaGVkU3RyaW5nICsgXCJcXFwiXCI7XG4gICAgICAgIHJlc3VsdC5wdXNoKHNXb3JkICsgXCJcXG5cIik7XG4gICAgfSk7XG4gICAgcmVzdWx0LnB1c2goXCIuXFxuXCIpO1xuICAgIHJldHVybiByZXN1bHQucztcbn1cbmV4cG9ydHMuZHVtcE5pY2UgPSBkdW1wTmljZTtcbmZ1bmN0aW9uIGR1bXBOaWNlVHVwZWwoYW5zd2VyKSB7XG4gICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgczogXCJcIixcbiAgICAgICAgcHVzaDogZnVuY3Rpb24gKHMpIHsgdGhpcy5zID0gdGhpcy5zICsgczsgfVxuICAgIH07XG4gICAgdmFyIHMgPSBcIioqUmVzdWx0IGZvciBjYXRlZ29yaWVzOiBcIiArIGFuc3dlci5jYXRlZ29yaWVzLmpvaW4oXCI7XCIpICsgXCIgaXMgXCIgKyBhbnN3ZXIucmVzdWx0ICsgXCJcXG4gcmFuazogXCIgKyBhbnN3ZXIuX3JhbmtpbmcgKyBcIlxcblwiO1xuICAgIHJlc3VsdC5wdXNoKHMpO1xuICAgIE9iamVjdC5rZXlzKGFuc3dlci5yZWNvcmQpLmZvckVhY2goZnVuY3Rpb24gKHNSZXF1aXJlcywgaW5kZXgpIHtcbiAgICAgICAgaWYgKHNSZXF1aXJlcy5jaGFyQXQoMCkgIT09ICdfJykge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2goXCJyZWNvcmQ6IFwiICsgc1JlcXVpcmVzICsgXCIgLT4gXCIgKyBhbnN3ZXIucmVjb3JkW3NSZXF1aXJlc10pO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdC5wdXNoKCdcXG4nKTtcbiAgICB9KTtcbiAgICB2YXIgb1NlbnRlbmNlID0gYW5zd2VyLnNlbnRlbmNlO1xuICAgIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaW5kZXgpIHtcbiAgICAgICAgdmFyIHNXb3JkID0gXCJbXCIgKyBpbmRleCArIFwiXSA6IFwiICsgb1dvcmQuY2F0ZWdvcnkgKyBcIiBcXFwiXCIgKyBvV29yZC5zdHJpbmcgKyBcIlxcXCIgPT4gXFxcIlwiICsgb1dvcmQubWF0Y2hlZFN0cmluZyArIFwiXFxcIlwiO1xuICAgICAgICByZXN1bHQucHVzaChzV29yZCArIFwiXFxuXCIpO1xuICAgIH0pO1xuICAgIHJlc3VsdC5wdXNoKFwiLlxcblwiKTtcbiAgICByZXR1cm4gcmVzdWx0LnM7XG59XG5leHBvcnRzLmR1bXBOaWNlVHVwZWwgPSBkdW1wTmljZVR1cGVsO1xuZnVuY3Rpb24gZHVtcFdlaWdodHNUb3AodG9vbG1hdGNoZXMsIG9wdGlvbnMpIHtcbiAgICB2YXIgcyA9ICcnO1xuICAgIHRvb2xtYXRjaGVzLmZvckVhY2goZnVuY3Rpb24gKG9NYXRjaCwgaW5kZXgpIHtcbiAgICAgICAgaWYgKGluZGV4IDwgb3B0aW9ucy50b3ApIHtcbiAgICAgICAgICAgIHMgPSBzICsgXCJXaGF0SXNBbnN3ZXJbXCIgKyBpbmRleCArIFwiXS4uLlxcblwiO1xuICAgICAgICAgICAgcyA9IHMgKyBkdW1wTmljZShvTWF0Y2gpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHM7XG59XG5leHBvcnRzLmR1bXBXZWlnaHRzVG9wID0gZHVtcFdlaWdodHNUb3A7XG5mdW5jdGlvbiBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHQocmVzKSB7XG4gICAgdmFyIHJlc3VsdCA9IHJlcy5hbnN3ZXJzLmZpbHRlcihmdW5jdGlvbiAoaVJlcywgaW5kZXgpIHtcbiAgICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgICAgIGRlYnVnbG9nKCdyZXRhaW4gdG9wUmFua2VkOiAnICsgaW5kZXggKyAnICcgKyBKU09OLnN0cmluZ2lmeShpUmVzKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlSZXMucmVzdWx0ID09PSAocmVzLmFuc3dlcnNbaW5kZXggLSAxXSAmJiByZXMuYW5zd2Vyc1tpbmRleCAtIDFdLnJlc3VsdCkpIHtcbiAgICAgICAgICAgIGRlYnVnbG9nKCdza2lwJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gICAgcmVzdWx0LnNvcnQoY21wQnlSYW5raW5nKTtcbiAgICB2YXIgYSA9IE9iamVjdC5hc3NpZ24oeyBhbnN3ZXJzOiByZXN1bHQgfSwgcmVzLCB7IGFuc3dlcnM6IHJlc3VsdCB9KTtcbiAgICBhLmFuc3dlcnMgPSByZXN1bHQ7XG4gICAgcmV0dXJuIGE7XG59XG5leHBvcnRzLmZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdCA9IGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdDtcbmZ1bmN0aW9uIGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdFR1cGVsKHJlcykge1xuICAgIHZhciByZXN1bHQgPSByZXMudHVwZWxhbnN3ZXJzLmZpbHRlcihmdW5jdGlvbiAoaVJlcywgaW5kZXgpIHtcbiAgICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgICAgIGRlYnVnbG9nKCcgcmV0YWluIHR1cGVsICcgKyBpbmRleCArICcgJyArIEpTT04uc3RyaW5naWZ5KGlSZXMpKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoXy5pc0VxdWFsKGlSZXMucmVzdWx0LCByZXMudHVwZWxhbnN3ZXJzW2luZGV4IC0gMV0gJiYgcmVzLnR1cGVsYW5zd2Vyc1tpbmRleCAtIDFdLnJlc3VsdCkpIHtcbiAgICAgICAgICAgIGRlYnVnbG9nKCdza2lwJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gICAgcmVzdWx0LnNvcnQoY21wQnlSYW5raW5nVHVwZWwpO1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHJlcywgeyB0dXBlbGFuc3dlcnM6IHJlc3VsdCB9KTtcbn1cbmV4cG9ydHMuZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0VHVwZWwgPSBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHRUdXBlbDtcbnZhciBNYXRjaCA9IHJlcXVpcmUoXCIuL21hdGNoXCIpO1xuZnVuY3Rpb24gY2FsY1JhbmtpbmcobWF0Y2hlZCwgbWlzbWF0Y2hlZCwgcmVsZXZhbnRDb3VudCkge1xuICAgIHZhciBsZW5NYXRjaGVkID0gT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoO1xuICAgIHZhciBmYWN0b3IgPSBNYXRjaC5jYWxjUmFua2luZ1Byb2R1Y3QobWF0Y2hlZCk7XG4gICAgZmFjdG9yICo9IE1hdGgucG93KDEuNSwgbGVuTWF0Y2hlZCk7XG4gICAgdmFyIGxlbk1pc01hdGNoZWQgPSBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGg7XG4gICAgdmFyIGZhY3RvcjIgPSBNYXRjaC5jYWxjUmFua2luZ1Byb2R1Y3QobWlzbWF0Y2hlZCk7XG4gICAgZmFjdG9yMiAqPSBNYXRoLnBvdygwLjQsIGxlbk1pc01hdGNoZWQpO1xuICAgIHJldHVybiBNYXRoLnBvdyhmYWN0b3IyICogZmFjdG9yLCAxIC8gKGxlbk1pc01hdGNoZWQgKyBsZW5NYXRjaGVkKSk7XG59XG5leHBvcnRzLmNhbGNSYW5raW5nID0gY2FsY1Jhbmtpbmc7XG4vKipcbiAqIEEgcmFua2luZyB3aGljaCBpcyBwdXJlbHkgYmFzZWQgb24gdGhlIG51bWJlcnMgb2YgbWF0Y2hlZCBlbnRpdGllcyxcbiAqIGRpc3JlZ2FyZGluZyBleGFjdG5lc3Mgb2YgbWF0Y2hcbiAqL1xuZnVuY3Rpb24gY2FsY1JhbmtpbmdTaW1wbGUobWF0Y2hlZCwgbWlzbWF0Y2hlZCwgbm91c2UsIHJlbGV2YW50Q291bnQpIHtcbiAgICAvLyAyIDogMFxuICAgIC8vIDEgOiAwXG4gICAgdmFyIGZhY3RvciA9IG1hdGNoZWQgKiBNYXRoLnBvdygxLjUsIG1hdGNoZWQpICogTWF0aC5wb3coMS41LCBtYXRjaGVkKTtcbiAgICB2YXIgZmFjdG9yMiA9IE1hdGgucG93KDAuNCwgbWlzbWF0Y2hlZCk7XG4gICAgdmFyIGZhY3RvcjMgPSBNYXRoLnBvdygwLjQsIG5vdXNlKTtcbiAgICByZXR1cm4gTWF0aC5wb3coZmFjdG9yMiAqIGZhY3RvciAqIGZhY3RvcjMsIDEgLyAobWlzbWF0Y2hlZCArIG1hdGNoZWQgKyBub3VzZSkpO1xufVxuZXhwb3J0cy5jYWxjUmFua2luZ1NpbXBsZSA9IGNhbGNSYW5raW5nU2ltcGxlO1xuZnVuY3Rpb24gY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgcmVsZXZhbnRDb3VudCkge1xuICAgIHZhciBsZW5NYXRjaGVkID0gT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoO1xuICAgIHZhciBmYWN0b3IgPSBNYXRjaC5jYWxjUmFua2luZ1Byb2R1Y3QobWF0Y2hlZCk7XG4gICAgZmFjdG9yICo9IE1hdGgucG93KDEuNSwgbGVuTWF0Y2hlZCk7XG4gICAgdmFyIGxlbkhhc0NhdGVnb3J5ID0gT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aDtcbiAgICB2YXIgZmFjdG9ySCA9IE1hdGgucG93KDEuMSwgbGVuSGFzQ2F0ZWdvcnkpO1xuICAgIHZhciBsZW5NaXNNYXRjaGVkID0gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoO1xuICAgIHZhciBmYWN0b3IyID0gTWF0Y2guY2FsY1JhbmtpbmdQcm9kdWN0KG1pc21hdGNoZWQpO1xuICAgIGZhY3RvcjIgKj0gTWF0aC5wb3coMC40LCBsZW5NaXNNYXRjaGVkKTtcbiAgICByZXR1cm4gTWF0aC5wb3coZmFjdG9yMiAqIGZhY3RvckggKiBmYWN0b3IsIDEgLyAobGVuTWlzTWF0Y2hlZCArIGxlbkhhc0NhdGVnb3J5ICsgbGVuTWF0Y2hlZCkpO1xufVxuZXhwb3J0cy5jYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5ID0gY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeTtcbi8qKlxuICogbGlzdCBhbGwgdG9wIGxldmVsIHJhbmtpbmdzXG4gKi9cbi8qXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hSZWNvcmRzSGF2aW5nQ29udGV4dChcbiAgcFNlbnRlbmNlczogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMsIGNhdGVnb3J5OiBzdHJpbmcsIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPixcbiAgY2F0ZWdvcnlTZXQ6IHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB9KVxuICA6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzQW5zd2VycyB7XG5cbiAgLy9kZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRzLCB1bmRlZmluZWQsIDIpKTtcbiAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQ6IElNYXRjaC5JUmVjb3JkKSB7XG4gICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnldICE9PSBudWxsKTtcbiAgfSk7XG4gIHZhciByZXMgPSBbXTtcbiAgZGVidWdsb2coXCJNYXRjaFJlY29yZHNIYXZpbmdDb250ZXh0IDogcmVsZXZhbnQgcmVjb3JkcyBucjpcIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGgpO1xuICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwic2VudGVuY2VzIGFyZSA6IFwiICsgSlNPTi5zdHJpbmdpZnkocFNlbnRlbmNlcywgdW5kZWZpbmVkLCAyKSkgOiBcIi1cIik7XG4gIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJjYXRlZ29yeSBcIiArIGNhdGVnb3J5ICsgXCIgYW5kIGNhdGVnb3J5c2V0IGlzOiBcIiArIEpTT04uc3RyaW5naWZ5KGNhdGVnb3J5U2V0LCB1bmRlZmluZWQsIDIpKSA6IFwiLVwiKTtcbiAgaWYgKHByb2Nlc3MuZW52LkFCT1RfRkFTVCAmJiBjYXRlZ29yeVNldCkge1xuICAgIC8vIHdlIGFyZSBvbmx5IGludGVyZXN0ZWQgaW4gY2F0ZWdvcmllcyBwcmVzZW50IGluIHJlY29yZHMgZm9yIGRvbWFpbnMgd2hpY2ggY29udGFpbiB0aGUgY2F0ZWdvcnlcbiAgICAvLyB2YXIgY2F0ZWdvcnlzZXQgPSBNb2RlbC5jYWxjdWxhdGVSZWxldmFudFJlY29yZENhdGVnb3JpZXModGhlTW9kZWwsY2F0ZWdvcnkpO1xuICAgIC8va25vd2luZyB0aGUgdGFyZ2V0XG4gICAgcGVyZmxvZyhcImdvdCBjYXRlZ29yeXNldCB3aXRoIFwiICsgT2JqZWN0LmtleXMoY2F0ZWdvcnlTZXQpLmxlbmd0aCk7XG4gICAgdmFyIGZsID0gMDtcbiAgICB2YXIgbGYgPSAwO1xuICAgIHZhciBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IHBTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICB2YXIgZldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgcmV0dXJuICFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpO1xuICAgICAgfSk7XG4gICAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgcmV0dXJuICEhY2F0ZWdvcnlTZXRbb1dvcmQuY2F0ZWdvcnldIHx8IFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKTtcbiAgICAgIH0pO1xuICAgICAgZmwgPSBmbCArIG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgICBsZiA9IGxmICsgcldvcmRzLmxlbmd0aDtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLCAvLyBub3QgYSBmaWxsZXIgIC8vIHRvIGJlIGNvbXBhdGlibGUgaXQgd291bGQgYmUgZldvcmRzXG4gICAgICAgIHJXb3JkczogcldvcmRzXG4gICAgICB9O1xuICAgIH0pO1xuICAgIE9iamVjdC5mcmVlemUoYVNpbXBsaWZpZWRTZW50ZW5jZXMpO1xuICAgIGRlYnVnbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyBmbCArIFwiLT5cIiArIGxmICsgXCIpXCIpO1xuICAgIHBlcmZsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIGZsICsgXCItPlwiICsgbGYgKyBcIilcIik7XG4gICAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgYVNpbXBsaWZpZWRTZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAoYVNlbnRlbmNlKSB7XG4gICAgICAgIHZhciBoYXNDYXRlZ29yeSA9IHt9O1xuICAgICAgICB2YXIgbWlzbWF0Y2hlZCA9IHt9O1xuICAgICAgICB2YXIgbWF0Y2hlZCA9IHt9O1xuICAgICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IGFTZW50ZW5jZS5jbnRSZWxldmFudFdvcmRzO1xuICAgICAgICBhU2VudGVuY2UucldvcmRzLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICYmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKSAmJiByZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgIGhhc0NhdGVnb3J5W29Xb3JkLm1hdGNoZWRTdHJpbmddID0gMTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgaWYgKChPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoKSA+IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aCkge1xuICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2Uub1NlbnRlbmNlLFxuICAgICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgICByZXN1bHQ6IHJlY29yZFtjYXRlZ29yeV0sXG4gICAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KTtcbiAgICBkZWJ1Z2xvZyhcImhlcmUgaW4gd2VpcmRcIik7XG4gIH0gZWxzZSB7XG4gICAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgcFNlbnRlbmNlcy5zZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAoYVNlbnRlbmNlKSB7XG4gICAgICAgIHZhciBoYXNDYXRlZ29yeSA9IHt9O1xuICAgICAgICB2YXIgbWlzbWF0Y2hlZCA9IHt9O1xuICAgICAgICB2YXIgbWF0Y2hlZCA9IHt9O1xuICAgICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IDA7XG4gICAgICAgIGFTZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgIGlmICghV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKSkge1xuICAgICAgICAgICAgY250UmVsZXZhbnRXb3JkcyA9IGNudFJlbGV2YW50V29yZHMgKyAxO1xuICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICYmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCkgJiYgcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICAgIGhhc0NhdGVnb3J5W29Xb3JkLm1hdGNoZWRTdHJpbmddID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoKE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aCArIE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5sZW5ndGgpID4gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoKSB7XG4gICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgc2VudGVuY2U6IGFTZW50ZW5jZSxcbiAgICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxuICAgICAgICAgICAgcmVzdWx0OiByZWNvcmRbY2F0ZWdvcnldLFxuICAgICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSk7XG4gIH1cbiAgcmVzLnNvcnQoY21wQnlSZXN1bHRUaGVuUmFua2luZyk7XG4gIGRlYnVnbG9nKFwiIGFmdGVyIHNvcnRcIiArIHJlcy5sZW5ndGgpO1xuICB2YXIgcmVzdWx0ID0gT2JqZWN0LmFzc2lnbih7fSwgcFNlbnRlbmNlcywgeyBhbnN3ZXJzOiByZXMgfSk7XG4gIHJldHVybiBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHQocmVzdWx0KTtcbn1cbiovXG4vKipcbiAqIGxpc3QgYWxsIHRvcCBsZXZlbCByYW5raW5nc1xuICovXG5mdW5jdGlvbiBtYXRjaFJlY29yZHNUdXBlbEhhdmluZ0NvbnRleHQocFNlbnRlbmNlcywgY2F0ZWdvcmllcywgcmVjb3JkcywgY2F0ZWdvcnlTZXQpIHtcbiAgICAvLyBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRzLCB1bmRlZmluZWQsIDIpKTtcbiAgICB2YXIgY2F0ZWdvcnlGID0gY2F0ZWdvcmllc1swXTtcbiAgICB2YXIgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICByZXR1cm4gKHJlY29yZFtjYXRlZ29yeUZdICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnlGXSAhPT0gbnVsbCk7XG4gICAgfSk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIGRlYnVnbG9nKFwicmVsZXZhbnQgcmVjb3JkcyBucjpcIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGgpO1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJzZW50ZW5jZXMgYXJlIDogXCIgKyBKU09OLnN0cmluZ2lmeShwU2VudGVuY2VzLCB1bmRlZmluZWQsIDIpKSA6IFwiLVwiKTtcbiAgICBpZiAocHJvY2Vzcy5lbnYuQUJPVF9GQVNUICYmIGNhdGVnb3J5U2V0KSB7XG4gICAgICAgIC8vIHdlIGFyZSBvbmx5IGludGVyZXN0ZWQgaW4gY2F0ZWdvcmllcyBwcmVzZW50IGluIHJlY29yZHMgZm9yIGRvbWFpbnMgd2hpY2ggY29udGFpbiB0aGUgY2F0ZWdvcnlcbiAgICAgICAgLy8gdmFyIGNhdGVnb3J5c2V0ID0gTW9kZWwuY2FsY3VsYXRlUmVsZXZhbnRSZWNvcmRDYXRlZ29yaWVzKHRoZU1vZGVsLGNhdGVnb3J5KTtcbiAgICAgICAgLy9rbm93aW5nIHRoZSB0YXJnZXRcbiAgICAgICAgcGVyZmxvZyhcImdvdCBjYXRlZ29yeXNldCB3aXRoIFwiICsgT2JqZWN0LmtleXMoY2F0ZWdvcnlTZXQpLmxlbmd0aCk7XG4gICAgICAgIHZhciBmbCA9IDA7XG4gICAgICAgIHZhciBsZiA9IDA7XG4gICAgICAgIHZhciBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IHBTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgICB2YXIgZldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAhIWNhdGVnb3J5U2V0W29Xb3JkLmNhdGVnb3J5XSB8fCBXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGZsID0gZmwgKyBvU2VudGVuY2UubGVuZ3RoO1xuICAgICAgICAgICAgbGYgPSBsZiArIHJXb3Jkcy5sZW5ndGg7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgICAgICAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgcldvcmRzOiByV29yZHNcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgICAgICBPYmplY3QuZnJlZXplKGFTaW1wbGlmaWVkU2VudGVuY2VzKTtcbiAgICAgICAgcGVyZmxvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgZmwgKyBcIi0+XCIgKyBsZiArIFwiKVwiKTtcbiAgICAgICAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgICAgICAgYVNpbXBsaWZpZWRTZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAoYVNlbnRlbmNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIGhhc0NhdGVnb3J5ID0ge307XG4gICAgICAgICAgICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fTtcbiAgICAgICAgICAgICAgICB2YXIgbWF0Y2hlZCA9IHt9O1xuICAgICAgICAgICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gYVNlbnRlbmNlLmNudFJlbGV2YW50V29yZHM7XG4gICAgICAgICAgICAgICAgYVNlbnRlbmNlLnJXb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpICYmIHJlY29yZFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaGFzQ2F0ZWdvcnlbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKChPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoKSA+IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLm9TZW50ZW5jZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcmllczogY2F0ZWdvcmllcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDogZXh0cmFjdFJlc3VsdChjYXRlZ29yaWVzLCByZWNvcmQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgICAgICAgIHBTZW50ZW5jZXMuc2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgICAgICAgICAgIHZhciBoYXNDYXRlZ29yeSA9IHt9O1xuICAgICAgICAgICAgICAgIHZhciBtaXNtYXRjaGVkID0ge307XG4gICAgICAgICAgICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgICAgICAgICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IDA7XG4gICAgICAgICAgICAgICAgYVNlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY250UmVsZXZhbnRXb3JkcyA9IGNudFJlbGV2YW50V29yZHMgKyAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICYmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpICYmIHJlY29yZFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc0NhdGVnb3J5W29Xb3JkLm1hdGNoZWRTdHJpbmddID0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmICgoT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoICsgT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aCkgPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VudGVuY2U6IGFTZW50ZW5jZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcmllczogY2F0ZWdvcmllcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDogZXh0cmFjdFJlc3VsdChjYXRlZ29yaWVzLCByZWNvcmQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmVzLnNvcnQoY21wQnlSZXN1bHRUaGVuUmFua2luZ1R1cGVsKTtcbiAgICB2YXIgcmVzdWx0MSA9IE9iamVjdC5hc3NpZ24oeyB0dXBlbGFuc3dlcnM6IHJlcyB9LCBwU2VudGVuY2VzKTtcbiAgICByZXR1cm4gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0VHVwZWwocmVzdWx0MSk7XG59XG5leHBvcnRzLm1hdGNoUmVjb3Jkc1R1cGVsSGF2aW5nQ29udGV4dCA9IG1hdGNoUmVjb3Jkc1R1cGVsSGF2aW5nQ29udGV4dDtcbmZ1bmN0aW9uIG1hdGNoUmVjb3JkcyhhU2VudGVuY2VzLCBjYXRlZ29yeSwgcmVjb3Jkcykge1xuICAgIC8vIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgLy8gICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRzLCB1bmRlZmluZWQsIDIpKTtcbiAgICAvLyB9XG4gICAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnldICE9PSBudWxsKTtcbiAgICB9KTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgZGVidWdsb2coXCJyZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCk7XG4gICAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICBhU2VudGVuY2VzLnNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgICAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgICAgICAgIHZhciBtaXNtYXRjaGVkID0ge307XG4gICAgICAgICAgICB2YXIgbWF0Y2hlZCA9IHt9O1xuICAgICAgICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSAwO1xuICAgICAgICAgICAgYVNlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNudFJlbGV2YW50V29yZHMgPSBjbnRSZWxldmFudFdvcmRzICsgMTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICYmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoID4gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLFxuICAgICAgICAgICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IHJlY29yZFtjYXRlZ29yeV0sXG4gICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZyhtYXRjaGVkLCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICByZXMuc29ydChjbXBCeVJlc3VsdFRoZW5SYW5raW5nKTtcbiAgICB2YXIgcmVzdWx0ID0gT2JqZWN0LmFzc2lnbih7fSwgYVNlbnRlbmNlcywgeyBhbnN3ZXJzOiByZXMgfSk7XG4gICAgcmV0dXJuIGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdChyZXN1bHQpO1xufVxuZXhwb3J0cy5tYXRjaFJlY29yZHMgPSBtYXRjaFJlY29yZHM7XG5mdW5jdGlvbiBtYWtlU2ltcGxpZmllZFNlbnRlbmNlc0NhdGVnb3J5U2V0KGFTZW50ZW5jZXMsIGNhdGVnb3J5U2V0LCB0cmFjaykge1xuICAgIHJldHVybiBhU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICB2YXIgYURvbWFpbnMgPSBbXTtcbiAgICAgICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwiZG9tYWluXCIpIHtcbiAgICAgICAgICAgICAgICBhRG9tYWlucy5wdXNoKG9Xb3JkLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJtZXRhXCIpIHtcbiAgICAgICAgICAgICAgICAvLyBlLmcuIGRvbWFpbiBYWFhcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gISFjYXRlZ29yeVNldFtvV29yZC5jYXRlZ29yeV07XG4gICAgICAgIH0pO1xuICAgICAgICB0cmFjay5mbCArPSBvU2VudGVuY2UubGVuZ3RoO1xuICAgICAgICB0cmFjay5sZiArPSByV29yZHMubGVuZ3RoO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZG9tYWluczogYURvbWFpbnMsXG4gICAgICAgICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsXG4gICAgICAgICAgICByV29yZHM6IHJXb3Jkc1xuICAgICAgICB9O1xuICAgIH0pO1xufVxuZnVuY3Rpb24gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXMoYVNlbnRlbmNlcywgdHJhY2spIHtcbiAgICByZXR1cm4gYVNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgdmFyIGRvbWFpbnMgPSBbXTtcbiAgICAgICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwiZG9tYWluXCIpIHtcbiAgICAgICAgICAgICAgICBkb21haW5zLnB1c2gob1dvcmQubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcIm1ldGFcIikge1xuICAgICAgICAgICAgICAgIC8vIGUuZy4gZG9tYWluIFhYWFxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRyYWNrLmZsICs9IG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgICAgIHRyYWNrLmxmICs9IHJXb3Jkcy5sZW5ndGg7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgICAgIGRvbWFpbnM6IGRvbWFpbnMsXG4gICAgICAgICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLFxuICAgICAgICAgICAgcldvcmRzOiByV29yZHNcbiAgICAgICAgfTtcbiAgICB9KTtcbn1cbmZ1bmN0aW9uIGV4dHJhY3RSZXN1bHQoY2F0ZWdvcmllcywgcmVjb3JkKSB7XG4gICAgcmV0dXJuIGNhdGVnb3JpZXMubWFwKGZ1bmN0aW9uIChjYXRlZ29yeSkgeyByZXR1cm4gcmVjb3JkW2NhdGVnb3J5XSB8fCBcIm4vYVwiOyB9KTtcbn1cbmZ1bmN0aW9uIG1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzKHBTZW50ZW5jZXMsIGNhdGVnb3JpZXMsIHJlY29yZHMsIGNhdGVnb3J5U2V0KSB7XG4gICAgLy8gaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAvLyAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgLy8gfVxuICAgIE9iamVjdC5mcmVlemUoY2F0ZWdvcnlTZXQpO1xuICAgIHZhciBjYXRlZ29yeUYgPSBjYXRlZ29yaWVzWzBdO1xuICAgIGRlYnVnbG9nKFwibWF0Y2hSZWNvcmRzUXVpY2tNdWx0aXBsZUNhdGVnb3JpZXMgKHI9XCIgKyByZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIilcXG4gY2F0ZWdvcmllczpcIiArIGNhdGVnb3JpZXMuam9pbihcIlxcblwiKSk7XG4gICAgcGVyZmxvZyhcIm1hdGNoUmVjb3Jkc1F1aWNrTXVsdCAuLi4ocj1cIiArIHJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiKVwiKTtcbiAgICB2YXIgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICByZXR1cm4gKHJlY29yZFtjYXRlZ29yeUZdICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnlGXSAhPT0gbnVsbCk7XG4gICAgfSk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIGRlYnVnbG9nKFwicmVsZXZhbnQgcmVjb3JkcyB3aXRoIGZpcnN0IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiKVwiKTtcbiAgICBwZXJmbG9nKFwicmVsZXZhbnQgcmVjb3JkcyB3aXRoIGZpcnN0IG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHNlbnRlbmNlcyBcIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCk7XG4gICAgaWYgKHByb2Nlc3MuZW52LkFCT1RfRkFTVCAmJiBjYXRlZ29yeVNldCkge1xuICAgICAgICAvLyB3ZSBhcmUgb25seSBpbnRlcmVzdGVkIGluIGNhdGVnb3JpZXMgcHJlc2VudCBpbiByZWNvcmRzIGZvciBkb21haW5zIHdoaWNoIGNvbnRhaW4gdGhlIGNhdGVnb3J5XG4gICAgICAgIC8vIHZhciBjYXRlZ29yeXNldCA9IE1vZGVsLmNhbGN1bGF0ZVJlbGV2YW50UmVjb3JkQ2F0ZWdvcmllcyh0aGVNb2RlbCxjYXRlZ29yeSk7XG4gICAgICAgIC8va25vd2luZyB0aGUgdGFyZ2V0XG4gICAgICAgIHBlcmZsb2coXCJnb3QgY2F0ZWdvcnlzZXQgd2l0aCBcIiArIE9iamVjdC5rZXlzKGNhdGVnb3J5U2V0KS5sZW5ndGgpO1xuICAgICAgICB2YXIgb2JqID0geyBmbDogMCwgbGY6IDAgfTtcbiAgICAgICAgdmFyIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXNDYXRlZ29yeVNldChwU2VudGVuY2VzLCBjYXRlZ29yeVNldCwgb2JqKTtcbiAgICAgICAgcGVyZmxvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgb2JqLmZsICsgXCItPlwiICsgb2JqLmxmICsgXCIpXCIpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgZGVidWdsb2coXCJub3QgYWJvdF9mYXN0ICFcIik7XG4gICAgICAgIHZhciB0cmFjayA9IHsgZmw6IDAsIGxmOiAwIH07XG4gICAgICAgIHZhciBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzKHBTZW50ZW5jZXMsIHRyYWNrKTtcbiAgICAgICAgLypcbiAgICAgICAgICAgIHBTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIGZsID0gZmwgKyBvU2VudGVuY2UubGVuZ3RoO1xuICAgICAgICAgICAgICBsZiA9IGxmICsgcldvcmRzLmxlbmd0aDtcbiAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgICAgICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgIHJXb3JkczogcldvcmRzXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICovXG4gICAgICAgIGRlYnVnbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyB0cmFjay5mbCArIFwiLT5cIiArIHRyYWNrLmxmICsgXCIpXCIpO1xuICAgICAgICBwZXJmbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyB0cmFjay5mbCArIFwiLT5cIiArIHRyYWNrLmxmICsgXCIpXCIpO1xuICAgIH1cbiAgICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgICAgICAgdmFyIG1pc21hdGNoZWQgPSAwO1xuICAgICAgICAgICAgdmFyIG1hdGNoZWQgPSAwO1xuICAgICAgICAgICAgdmFyIG5vdXNlID0gMDtcbiAgICAgICAgICAgIHZhciBtaXNzaW5nY2F0ID0gMDtcbiAgICAgICAgICAgIGFTZW50ZW5jZS5yV29yZHMuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICArK21hdGNoZWQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICArK21pc21hdGNoZWQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAhPT0gXCJjYXRlZ29yeVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub3VzZSArPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaXNzaW5nY2F0ICs9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChhU2VudGVuY2UuZG9tYWlucy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVjb3JkLl9kb21haW4gIT09IGFTZW50ZW5jZS5kb21haW5zWzBdKSB7XG4gICAgICAgICAgICAgICAgICAgIG1pc21hdGNoZWQgPSAzMDAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZCArPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGlmKG1hdGNoZWQgPiAwIHx8IG1pc21hdGNoZWQgPiAwICkge1xuICAgICAgICAgICAgLy8gICBjb25zb2xlLmxvZyhcIiBtXCIgKyBtYXRjaGVkICsgXCIgbWlzbWF0Y2hlZFwiICsgbWlzbWF0Y2hlZCk7XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGFTZW50ZW5jZS5vU2VudGVuY2UpKTtcbiAgICAgICAgICAgIGlmIChtYXRjaGVkID4gbWlzbWF0Y2hlZCkge1xuICAgICAgICAgICAgICAgIHZhciByZWMgPSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2Uub1NlbnRlbmNlLFxuICAgICAgICAgICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcmllczogY2F0ZWdvcmllcyxcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiBleHRyYWN0UmVzdWx0KGNhdGVnb3JpZXMsIHJlY29yZCksXG4gICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ1NpbXBsZShtYXRjaGVkLCBtaXNtYXRjaGVkLCAobm91c2UgKyBtaXNzaW5nY2F0KSwgYVNlbnRlbmNlLmNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAvKiAgIGlmKHJlY29yZFtcImFwcElkXCJdID09PVwiRjE1NjZcIikge1xuICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJoZXJlIEYxNTY2XCIgKyBKU09OLnN0cmluZ2lmeShyZWMpKTtcbiAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaGVyZSBtYXRjaGVkXCIgKyBtYXRjaGVkICsgXCIgbWlzbWF0Y2hlZFwiICsgbWlzbWF0Y2hlZCArIFwiIG5vdXNlIFwiICsgKG5vdXNlICsgbWlzc2luZ2NhdCkpO1xuICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJoZXJlIGNudFJlbGV2YW50IDpcIiArIGFTZW50ZW5jZS5jbnRSZWxldmFudFdvcmRzKTtcbiAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgaWYocmVjb3JkW1wiYXBwSWRcIl0gPT09XCJGMDczMUFcIikge1xuICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJoZXJlIEYwNzMxQVwiICsgSlNPTi5zdHJpbmdpZnkocmVjKSk7XG4gICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImhlcmUgbWF0Y2hlZFwiICsgbWF0Y2hlZCArIFwiIG1pc21hdGNoZWRcIiArIG1pc21hdGNoZWQgKyBcIiBub3VzZSBcIiArIChub3VzZSArIG1pc3NpbmdjYXQpKTtcbiAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaGVyZSBjbnRSZWxldmFudCA6XCIgKyBhU2VudGVuY2UuY250UmVsZXZhbnRXb3Jkcyk7XG4gICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgcmVzLnB1c2gocmVjKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcGVyZmxvZyhcInNvcnQgKGE9XCIgKyByZXMubGVuZ3RoICsgXCIpXCIpO1xuICAgIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbCk7XG4gICAgcGVyZmxvZyhcImZpbHRlclJldGFpbiAuLi5cIik7XG4gICAgdmFyIHJlc3VsdDEgPSBPYmplY3QuYXNzaWduKHsgdHVwZWxhbnN3ZXJzOiByZXMgfSwgcFNlbnRlbmNlcyk7XG4gICAgdmFyIHJlc3VsdDIgPSBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHRUdXBlbChyZXN1bHQxKTtcbiAgICBwZXJmbG9nKFwibWF0Y2hSZWNvcmRzUXVpY2sgZG9uZTogKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGE9XCIgKyByZXMubGVuZ3RoICsgXCIpXCIpO1xuICAgIHJldHVybiByZXN1bHQyO1xufVxuZXhwb3J0cy5tYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcyA9IG1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzO1xuZnVuY3Rpb24gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KHdvcmQsIHRhcmdldGNhdGVnb3J5LCBydWxlcywgd2hvbGVzZW50ZW5jZSkge1xuICAgIC8vY29uc29sZS5sb2coXCJjbGFzc2lmeSBcIiArIHdvcmQgKyBcIiBcIiAgKyB0YXJnZXRjYXRlZ29yeSk7XG4gICAgdmFyIGNhdHMgPSBJbnB1dEZpbHRlci5jYXRlZ29yaXplQVdvcmQod29yZCwgcnVsZXMsIHdob2xlc2VudGVuY2UsIHt9KTtcbiAgICAvLyBUT0RPIHF1YWxpZnlcbiAgICBjYXRzID0gY2F0cy5maWx0ZXIoZnVuY3Rpb24gKGNhdCkge1xuICAgICAgICByZXR1cm4gY2F0LmNhdGVnb3J5ID09PSB0YXJnZXRjYXRlZ29yeTtcbiAgICB9KTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShjYXRzKSk7XG4gICAgaWYgKGNhdHMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBjYXRzWzBdLm1hdGNoZWRTdHJpbmc7XG4gICAgfVxufVxuZnVuY3Rpb24gYW5hbHl6ZUNhdGVnb3J5KGNhdGVnb3J5d29yZCwgcnVsZXMsIHdob2xlc2VudGVuY2UpIHtcbiAgICByZXR1cm4gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KGNhdGVnb3J5d29yZCwgJ2NhdGVnb3J5JywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xufVxuZXhwb3J0cy5hbmFseXplQ2F0ZWdvcnkgPSBhbmFseXplQ2F0ZWdvcnk7XG5mdW5jdGlvbiBzcGxpdEF0Q29tbWFBbmQoc3RyKSB7XG4gICAgdmFyIHIgPSBzdHIuc3BsaXQoLyhcXGJhbmRcXGIpfFssXS8pO1xuICAgIHIgPSByLmZpbHRlcihmdW5jdGlvbiAobywgaW5kZXgpIHtcbiAgICAgICAgaWYgKGluZGV4ICUgMiA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICB2YXIgcnRyaW1tZWQgPSByLm1hcChmdW5jdGlvbiAobykge1xuICAgICAgICByZXR1cm4gbmV3IFN0cmluZyhvKS50cmltKCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJ0cmltbWVkO1xufVxuZXhwb3J0cy5zcGxpdEF0Q29tbWFBbmQgPSBzcGxpdEF0Q29tbWFBbmQ7XG4vKipcbiAqIEEgc2ltcGxlIGltcGxlbWVudGF0aW9uLCBzcGxpdHRpbmcgYXQgYW5kIGFuZCAsXG4gKi9cbmZ1bmN0aW9uIGFuYWx5emVDYXRlZ29yeU11bHRPbmx5QW5kQ29tbWEoY2F0ZWdvcnlsaXN0LCBydWxlcywgd2hvbGVzZW50ZW5jZSkge1xuICAgIHZhciBydHJpbW1lZCA9IHNwbGl0QXRDb21tYUFuZChjYXRlZ29yeWxpc3QpO1xuICAgIHZhciByY2F0ID0gcnRyaW1tZWQubWFwKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgIHJldHVybiBhbmFseXplQ2F0ZWdvcnkobywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xuICAgIH0pO1xuICAgIGlmIChyY2F0LmluZGV4T2YodW5kZWZpbmVkKSA+PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignXCInICsgcnRyaW1tZWRbcmNhdC5pbmRleE9mKHVuZGVmaW5lZCldICsgJ1wiIGlzIG5vdCBhIGNhdGVnb3J5IScpO1xuICAgIH1cbiAgICByZXR1cm4gcmNhdDtcbn1cbmV4cG9ydHMuYW5hbHl6ZUNhdGVnb3J5TXVsdE9ubHlBbmRDb21tYSA9IGFuYWx5emVDYXRlZ29yeU11bHRPbmx5QW5kQ29tbWE7XG5mdW5jdGlvbiBmaWx0ZXJBY2NlcHRpbmdPbmx5KHJlcywgY2F0ZWdvcmllcykge1xuICAgIHJldHVybiByZXMuZmlsdGVyKGZ1bmN0aW9uIChhU2VudGVuY2UsIGlJbmRleCkge1xuICAgICAgICByZXR1cm4gYVNlbnRlbmNlLmV2ZXJ5KGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhdGVnb3JpZXMuaW5kZXhPZihvV29yZC5jYXRlZ29yeSkgPj0gMDtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5leHBvcnRzLmZpbHRlckFjY2VwdGluZ09ubHkgPSBmaWx0ZXJBY2NlcHRpbmdPbmx5O1xudmFyIEVyYmFzZSA9IHJlcXVpcmUoXCIuL2VyYmFzZVwiKTtcbnZhciBzV29yZHMgPSB7fTtcbmZ1bmN0aW9uIHJlc2V0Q2FjaGUoKSB7XG4gICAgc1dvcmRzID0ge307XG59XG5leHBvcnRzLnJlc2V0Q2FjaGUgPSByZXNldENhY2hlO1xuZnVuY3Rpb24gcHJvY2Vzc1N0cmluZyhxdWVyeSwgcnVsZXMpIHtcbiAgICBpZiAoIXByb2Nlc3MuZW52LkFCT1RfT0xETUFUQ0gpIHtcbiAgICAgICAgcmV0dXJuIEVyYmFzZS5wcm9jZXNzU3RyaW5nKHF1ZXJ5LCBydWxlcywgcnVsZXMud29yZENhY2hlKTtcbiAgICB9XG4gICAgLypcbiAgICAgIHZhciBtYXRjaGVkID0gSW5wdXRGaWx0ZXIuYW5hbHl6ZVN0cmluZyhxdWVyeSwgcnVsZXMsIHNXb3Jkcyk7XG4gICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcIkFmdGVyIG1hdGNoZWQgXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkKSk7XG4gICAgICB9XG4gICAgICB2YXIgYVNlbnRlbmNlcyA9IElucHV0RmlsdGVyLmV4cGFuZE1hdGNoQXJyKG1hdGNoZWQpO1xuICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCJhZnRlciBleHBhbmRcIiArIGFTZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICAgICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgICB9XG4gICAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBJbnB1dEZpbHRlci5yZWluRm9yY2UoYVNlbnRlbmNlcyk7XG4gICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcImFmdGVyIHJlaW5mb3JjZVwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICAgICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICBlcnJvcnM6IFtdLFxuICAgICAgICBzZW50ZW5jZXM6IGFTZW50ZW5jZXNSZWluZm9yY2VkXG4gICAgICB9IGFzIElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzO1xuICAgICovXG59XG5leHBvcnRzLnByb2Nlc3NTdHJpbmcgPSBwcm9jZXNzU3RyaW5nO1xuZnVuY3Rpb24gYW5hbHl6ZUNvbnRleHRTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcykge1xuICAgIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IHByb2Nlc3NTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcyk7XG4gICAgLy8gd2UgbGltaXQgYW5hbHlzaXMgdG8gbiBzZW50ZW5jZXNcbiAgICBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMgPSBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMuc2xpY2UoMCwgQWxnb2wuQ3V0b2ZmX1NlbnRlbmNlcyk7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCJhZnRlciByZWluZm9yY2UgYW5kIGN1dG9mZlwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLmxlbmd0aCArIFwiXFxuXCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgICAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgICB9XG4gICAgcmV0dXJuIGFTZW50ZW5jZXNSZWluZm9yY2VkO1xufVxuZXhwb3J0cy5hbmFseXplQ29udGV4dFN0cmluZyA9IGFuYWx5emVDb250ZXh0U3RyaW5nO1xuZnVuY3Rpb24gY21wQnlOckNhdGVnb3JpZXNBbmRTYW1lRG9tYWluKGEsIGIpIHtcbiAgICAvL2NvbnNvbGUubG9nKFwiY29tcGFyZSBhXCIgKyBhICsgXCIgY250YiBcIiArIGIpO1xuICAgIHZhciBjbnRhID0gU2VudGVuY2UuZ2V0RGlzdGluY3RDYXRlZ29yaWVzSW5TZW50ZW5jZShhKS5sZW5ndGg7XG4gICAgdmFyIGNudGIgPSBTZW50ZW5jZS5nZXREaXN0aW5jdENhdGVnb3JpZXNJblNlbnRlbmNlKGIpLmxlbmd0aDtcbiAgICAvKlxuICAgICAgdmFyIGNudGEgPSBhLnJlZHVjZShmdW5jdGlvbihwcmV2LCBvV29yZCkge1xuICAgICAgICByZXR1cm4gcHJldiArICgob1dvcmQuY2F0ZWdvcnkgPT09IFwiY2F0ZWdvcnlcIik/IDEgOiAwKTtcbiAgICAgIH0sMCk7XG4gICAgICB2YXIgY250YiA9IGIucmVkdWNlKGZ1bmN0aW9uKHByZXYsIG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiBwcmV2ICsgKChvV29yZC5jYXRlZ29yeSA9PT0gXCJjYXRlZ29yeVwiKT8gMSA6IDApO1xuICAgICAgfSwwKTtcbiAgICAgLy8gY29uc29sZS5sb2coXCJjbnQgYVwiICsgY250YSArIFwiIGNudGIgXCIgKyBjbnRiKTtcbiAgICAgKi9cbiAgICByZXR1cm4gY250YiAtIGNudGE7XG59XG5leHBvcnRzLmNtcEJ5TnJDYXRlZ29yaWVzQW5kU2FtZURvbWFpbiA9IGNtcEJ5TnJDYXRlZ29yaWVzQW5kU2FtZURvbWFpbjtcbmZ1bmN0aW9uIGFuYWx5emVDYXRlZ29yeU11bHQoY2F0ZWdvcnlsaXN0LCBydWxlcywgd2hvbGVzZW50ZW5jZSwgZ1dvcmRzKSB7XG4gICAgdmFyIHJlcyA9IGFuYWx5emVDb250ZXh0U3RyaW5nKGNhdGVnb3J5bGlzdCwgcnVsZXMpO1xuICAgIC8vICBkZWJ1Z2xvZyhcInJlc3VsdGluZyBjYXRlZ29yeSBzZW50ZW5jZXNcIiwgSlNPTi5zdHJpbmdpZnkocmVzKSk7XG4gICAgdmFyIHJlczIgPSBmaWx0ZXJBY2NlcHRpbmdPbmx5KHJlcy5zZW50ZW5jZXMsIFtcImNhdGVnb3J5XCIsIFwiZmlsbGVyXCJdKTtcbiAgICAvLyAgY29uc29sZS5sb2coXCJoZXJlIHJlczJcIiArIEpTT04uc3RyaW5naWZ5KHJlczIpICk7XG4gICAgLy8gIGNvbnNvbGUubG9nKFwiaGVyZSB1bmRlZmluZWQgISArIFwiICsgcmVzMi5maWx0ZXIobyA9PiAhbykubGVuZ3RoKTtcbiAgICByZXMyLnNvcnQoU2VudGVuY2UuY21wUmFua2luZ1Byb2R1Y3QpO1xuICAgIGRlYnVnbG9nKFwicmVzdWx0aW5nIGNhdGVnb3J5IHNlbnRlbmNlczogXFxuXCIsIGRlYnVnbG9nLmVuYWJsZWQgPyAoU2VudGVuY2UuZHVtcE5pY2VBcnIocmVzMi5zbGljZSgwLCAzKSwgU2VudGVuY2UucmFua2luZ1Byb2R1Y3QpKSA6ICctJyk7XG4gICAgLy8gVE9ETzogICByZXMyID0gZmlsdGVyQWNjZXB0aW5nT25seVNhbWVEb21haW4ocmVzMik7XG4gICAgLy9kZWJ1Z2xvZyhcInJlc3VsdGluZyBjYXRlZ29yeSBzZW50ZW5jZXNcIiwgSlNPTi5zdHJpbmdpZnkocmVzMiwgdW5kZWZpbmVkLCAyKSk7XG4gICAgLy8gZXhwZWN0IG9ubHkgY2F0ZWdvcmllc1xuICAgIC8vIHdlIGNvdWxkIHJhbmsgbm93IGJ5IGNvbW1vbiBkb21haW5zICwgYnV0IGZvciBub3cgd2Ugb25seSB0YWtlIHRoZSBmaXJzdCBvbmVcbiAgICBpZiAoIXJlczIubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIC8vcmVzLnNvcnQoY21wQnlOckNhdGVnb3JpZXNBbmRTYW1lRG9tYWluKTtcbiAgICB2YXIgcmVzY2F0ID0gU2VudGVuY2UuZ2V0RGlzdGluY3RDYXRlZ29yaWVzSW5TZW50ZW5jZShyZXMyWzBdKTtcbiAgICByZXR1cm4gcmVzY2F0O1xuICAgIC8vIFwiXCIgcmV0dXJuIHJlc1swXS5maWx0ZXIoKVxuICAgIC8vIHJldHVybiBjbGFzc2lmeVdvcmRXaXRoVGFyZ2V0Q2F0ZWdvcnkoY2F0ZWdvcnlsaXN0LCAnY2F0ZWdvcnknLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG59XG5leHBvcnRzLmFuYWx5emVDYXRlZ29yeU11bHQgPSBhbmFseXplQ2F0ZWdvcnlNdWx0O1xuZnVuY3Rpb24gYW5hbHl6ZU9wZXJhdG9yKG9wd29yZCwgcnVsZXMsIHdob2xlc2VudGVuY2UpIHtcbiAgICByZXR1cm4gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KG9wd29yZCwgJ29wZXJhdG9yJywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xufVxuZXhwb3J0cy5hbmFseXplT3BlcmF0b3IgPSBhbmFseXplT3BlcmF0b3I7XG52YXIgRXJFcnJvciA9IHJlcXVpcmUoXCIuL2VyZXJyb3JcIik7XG52YXIgTGlzdEFsbCA9IHJlcXVpcmUoXCIuL2xpc3RhbGxcIik7XG4vLyBjb25zdCByZXN1bHQgPSBXaGF0SXMucmVzb2x2ZUNhdGVnb3J5KGNhdCwgYTEuZW50aXR5LFxuLy8gICB0aGVNb2RlbC5tUnVsZXMsIHRoZU1vZGVsLnRvb2xzLCB0aGVNb2RlbC5yZWNvcmRzKTtcbmZ1bmN0aW9uIHJlc29sdmVDYXRlZ29yeShjYXRlZ29yeSwgY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcywgcmVjb3Jkcykge1xuICAgIGlmIChjb250ZXh0UXVlcnlTdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB7IGVycm9yczogW0VyRXJyb3IubWFrZUVycm9yX0VNUFRZX0lOUFVUKCldLCB0b2tlbnM6IFtdLCBhbnN3ZXJzOiBbXSB9O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgLypcbiAgICAgICAgICAgIHZhciBtYXRjaGVkID0gSW5wdXRGaWx0ZXIuYW5hbHl6ZVN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKTtcbiAgICAgICAgICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJhZnRlciBtYXRjaGVkIFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZCkpOiAnLScpO1xuICAgICAgICAgICAgdmFyIGFTZW50ZW5jZXMgPSBJbnB1dEZpbHRlci5leHBhbmRNYXRjaEFycihtYXRjaGVkKTtcbiAgICAgICAgICAgIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgZGVidWdsb2coXCJhZnRlciBleHBhbmRcIiArIGFTZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICAgICAgICAgICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgICAgICAgfSAqL1xuICAgICAgICAvLyB2YXIgY2F0ZWdvcnlTZXQgPSBNb2RlbC5nZXRBbGxSZWNvcmRDYXRlZ29yaWVzRm9yVGFyZ2V0Q2F0ZWdvcnkodGhlTW9kZWwsIGNhdCwgdHJ1ZSk7XG4gICAgICAgIHZhciByZXMgPSBMaXN0QWxsLmxpc3RBbGxXaXRoQ29udGV4dChjYXRlZ29yeSwgY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcywgcmVjb3Jkcyk7XG4gICAgICAgIC8vKiBzb3J0IGJ5IHNlbnRlbmNlXG4gICAgICAgIHJlcy5hbnN3ZXJzLmZvckVhY2goZnVuY3Rpb24gKG8pIHsgby5fcmFua2luZyA9IG8uX3JhbmtpbmcgKiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvLnNlbnRlbmNlKTsgfSk7XG4gICAgICAgIHJlcy5hbnN3ZXJzLnNvcnQoY21wQnlSYW5raW5nKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG59XG5leHBvcnRzLnJlc29sdmVDYXRlZ29yeSA9IHJlc29sdmVDYXRlZ29yeTtcbmZ1bmN0aW9uIHJlc29sdmVDYXRlZ29yaWVzKGNhdGVnb3JpZXMsIGNvbnRleHRRdWVyeVN0cmluZywgdGhlTW9kZWwpIHtcbiAgICB2YXIgcmVjb3JkcyA9IHRoZU1vZGVsLnJlY29yZHM7XG4gICAgdmFyIHJ1bGVzID0gdGhlTW9kZWwucnVsZXM7XG4gICAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGVycm9yczogW0VyRXJyb3IubWFrZUVycm9yX0VNUFRZX0lOUFVUKCldLFxuICAgICAgICAgICAgdHVwZWxhbnN3ZXJzOiBbXSxcbiAgICAgICAgICAgIHRva2VuczogW11cbiAgICAgICAgfTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIC8vIHZhciBjYXRlZ29yeVNldCA9IE1vZGVsLmdldEFsbFJlY29yZENhdGVnb3JpZXNGb3JUYXJnZXRDYXRlZ29yeSh0aGVNb2RlbCwgY2F0LCB0cnVlKTtcbiAgICAgICAgdmFyIHJlcyA9IExpc3RBbGwubGlzdEFsbFR1cGVsV2l0aENvbnRleHQoY2F0ZWdvcmllcywgY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcywgcmVjb3Jkcyk7XG4gICAgICAgIC8vKiBzb3J0IGJ5IHNlbnRlbmNlXG4gICAgICAgIHJlcy50dXBlbGFuc3dlcnMuZm9yRWFjaChmdW5jdGlvbiAobykgeyBvLl9yYW5raW5nID0gby5fcmFua2luZyAqIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG8uc2VudGVuY2UpOyB9KTtcbiAgICAgICAgcmVzLnR1cGVsYW5zd2Vycy5zb3J0KGNtcEJ5UmFua2luZ1R1cGVsKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG59XG5leHBvcnRzLnJlc29sdmVDYXRlZ29yaWVzID0gcmVzb2x2ZUNhdGVnb3JpZXM7XG4vKlxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVDYXRlZ29yaWVzT2xkKGNhdGVnb3JpZXM6IHN0cmluZ1tdLCBjb250ZXh0UXVlcnlTdHJpbmc6IHN0cmluZyxcbiAgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzKTogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNUdXBlbEFuc3dlcnMge1xuICB2YXIgcmVjb3JkcyA9IHRoZU1vZGVsLnJlY29yZHM7XG4gIHZhciBydWxlcyA9IHRoZU1vZGVsLnJ1bGVzO1xuICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcnM6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSxcbiAgICAgIHR1cGVsYW5zd2VyczogW10sXG4gICAgICB0b2tlbnM6IFtdXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IHByb2Nlc3NTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCB0aGVNb2RlbC5ydWxlcyk7XG4gICAgLy9hU2VudGVuY2VzLm1hcChmdW5jdGlvbihvU2VudGVuY2UpIHsgcmV0dXJuIElucHV0RmlsdGVyLnJlaW5Gb3JjZShvU2VudGVuY2UpOyB9KTtcbiAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiYWZ0ZXIgcmVpbmZvcmNlXCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgIH0pLmpvaW4oXCJcXG5cIikpIDogJy0nKTtcbiAgICAvL3ZhciBtYXRjaGVkQW5zd2VycyA9IG1hdGNoUmVjb3Jkc1F1aWNrKGFTZW50ZW5jZXMsIGNhdGVnb3J5LCByZWNvcmRzKTsgLy9hVG9vbDogQXJyYXk8SU1hdGNoLklUb29sPik6IGFueSAvICogb2JqZWN0c3RyZWFtKiAvIHtcbiAgICB2YXIgY2F0ZWdvcnlTZXQgPSB7fTtcbiAgICBjYXRlZ29yaWVzLmZvckVhY2goZnVuY3Rpb24gKGNhdGVnb3J5KSB7XG4gICAgICBjYXRlZ29yeVNldFtjYXRlZ29yeV0gPSB0cnVlO1xuICAgICAgdmFyIGNhdGVnb3J5U2V0TG9jYWwgPSBNb2RlbC5nZXRBbGxSZWNvcmRDYXRlZ29yaWVzRm9yVGFyZ2V0Q2F0ZWdvcnkodGhlTW9kZWwsIGNhdGVnb3J5LCB0cnVlKTtcbiAgICAgIE9iamVjdC5hc3NpZ24oY2F0ZWdvcnlTZXQsIGNhdGVnb3J5U2V0TG9jYWwpO1xuICAgIH0pO1xuXG4gICAgdmFyIG1hdGNoZWRBbnN3ZXJzID0gbWF0Y2hSZWNvcmRzUXVpY2tNdWx0aXBsZUNhdGVnb3JpZXMoYVNlbnRlbmNlc1JlaW5mb3JjZWQsIGNhdGVnb3JpZXMsIHJlY29yZHMsIGNhdGVnb3J5U2V0KTsgLy9hVG9vbDogQXJyYXk8SU1hdGNoLklUb29sPik6IGFueSAvICogb2JqZWN0c3RyZWFtICogLyB7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgIGRlYnVnbG9nKFwiIG1hdGNoZWQgQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMsIHVuZGVmaW5lZCwgMikpO1xuICAgIH1cbiAgICBwZXJmbG9nKFwiZmlsdGVyaW5nIHRvcFJhbmtlZCAoYT1cIiArIG1hdGNoZWRBbnN3ZXJzLnR1cGVsYW5zd2Vycy5sZW5ndGggKyBcIikuLi5cIik7XG4gICAgdmFyIG1hdGNoZWRGaWx0ZXJlZCA9IE9iamVjdC5hc3NpZ24oe30sIG1hdGNoZWRBbnN3ZXJzKTtcbiAgICBtYXRjaGVkRmlsdGVyZWQudHVwZWxhbnN3ZXJzID0gZmlsdGVyT25seVRvcFJhbmtlZFR1cGVsKG1hdGNoZWRBbnN3ZXJzLnR1cGVsYW5zd2Vycyk7XG5cbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgZGVidWdsb2coXCIgbWF0Y2hlZCB0b3AtcmFua2VkIEFuc3dlcnNcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRGaWx0ZXJlZCwgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHBlcmZsb2coXCJ0b3RhbFdoYXRpc1dpdGhDb250ZXh0IChhPVwiICsgbWF0Y2hlZEZpbHRlcmVkLnR1cGVsYW5zd2Vycy5sZW5ndGggKyBcIilcIik7XG4gICAgcmV0dXJuIG1hdGNoZWRGaWx0ZXJlZDsgLy8gPz8/IEFuc3dlcnM7XG4gIH1cbn1cbiovXG5mdW5jdGlvbiBmaWx0ZXJPbmx5VG9wUmFua2VkKHJlc3VsdHMpIHtcbiAgICB2YXIgcmVzID0gcmVzdWx0cy5maWx0ZXIoZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICBpZiAocmVzdWx0Ll9yYW5raW5nID09PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0Ll9yYW5raW5nID49IHJlc3VsdHNbMF0uX3JhbmtpbmcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkxpc3QgdG8gZmlsdGVyIG11c3QgYmUgb3JkZXJlZFwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZmlsdGVyT25seVRvcFJhbmtlZCA9IGZpbHRlck9ubHlUb3BSYW5rZWQ7XG5mdW5jdGlvbiBmaWx0ZXJPbmx5VG9wUmFua2VkVHVwZWwocmVzdWx0cykge1xuICAgIHZhciByZXMgPSByZXN1bHRzLmZpbHRlcihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgIGlmIChyZXN1bHQuX3JhbmtpbmcgPT09IHJlc3VsdHNbMF0uX3JhbmtpbmcpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQuX3JhbmtpbmcgPj0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTGlzdCB0byBmaWx0ZXIgbXVzdCBiZSBvcmRlcmVkXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5maWx0ZXJPbmx5VG9wUmFua2VkVHVwZWwgPSBmaWx0ZXJPbmx5VG9wUmFua2VkVHVwZWw7XG5mdW5jdGlvbiBpc0luZGlzY3JpbWluYXRlUmVzdWx0KHJlc3VsdHMpIHtcbiAgICB2YXIgY250ID0gcmVzdWx0cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHJlc3VsdCkge1xuICAgICAgICBpZiAocmVzdWx0Ll9yYW5raW5nID09PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICB9LCAwKTtcbiAgICBpZiAoY250ID4gMSkge1xuICAgICAgICAvLyBzZWFyY2ggZm9yIGEgZGlzY3JpbWluYXRpbmcgY2F0ZWdvcnkgdmFsdWVcbiAgICAgICAgdmFyIGRpc2NyaW1pbmF0aW5nID0gT2JqZWN0LmtleXMocmVzdWx0c1swXS5yZWNvcmQpLnJlZHVjZShmdW5jdGlvbiAocHJldiwgY2F0ZWdvcnkpIHtcbiAgICAgICAgICAgIGlmICgoY2F0ZWdvcnkuY2hhckF0KDApICE9PSAnXycgJiYgY2F0ZWdvcnkgIT09IHJlc3VsdHNbMF0uY2F0ZWdvcnkpXG4gICAgICAgICAgICAgICAgJiYgKHJlc3VsdHNbMF0ucmVjb3JkW2NhdGVnb3J5XSAhPT0gcmVzdWx0c1sxXS5yZWNvcmRbY2F0ZWdvcnldKSkge1xuICAgICAgICAgICAgICAgIHByZXYucHVzaChjYXRlZ29yeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcHJldjtcbiAgICAgICAgfSwgW10pO1xuICAgICAgICBpZiAoZGlzY3JpbWluYXRpbmcubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJNYW55IGNvbXBhcmFibGUgcmVzdWx0cywgcGVyaGFwcyB5b3Ugd2FudCB0byBzcGVjaWZ5IGEgZGlzY3JpbWluYXRpbmcgXCIgKyBkaXNjcmltaW5hdGluZy5qb2luKCcsJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICdZb3VyIHF1ZXN0aW9uIGRvZXMgbm90IGhhdmUgYSBzcGVjaWZpYyBhbnN3ZXInO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xufVxuZXhwb3J0cy5pc0luZGlzY3JpbWluYXRlUmVzdWx0ID0gaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdDtcbmZ1bmN0aW9uIGlzSW5kaXNjcmltaW5hdGVSZXN1bHRUdXBlbChyZXN1bHRzKSB7XG4gICAgdmFyIGNudCA9IHJlc3VsdHMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCByZXN1bHQpIHtcbiAgICAgICAgaWYgKHJlc3VsdC5fcmFua2luZyA9PT0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgICAgICAgcmV0dXJuIHByZXYgKyAxO1xuICAgICAgICB9XG4gICAgfSwgMCk7XG4gICAgaWYgKGNudCA+IDEpIHtcbiAgICAgICAgLy8gc2VhcmNoIGZvciBhIGRpc2NyaW1pbmF0aW5nIGNhdGVnb3J5IHZhbHVlXG4gICAgICAgIHZhciBkaXNjcmltaW5hdGluZyA9IE9iamVjdC5rZXlzKHJlc3VsdHNbMF0ucmVjb3JkKS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGNhdGVnb3J5KSB7XG4gICAgICAgICAgICBpZiAoKGNhdGVnb3J5LmNoYXJBdCgwKSAhPT0gJ18nICYmIHJlc3VsdHNbMF0uY2F0ZWdvcmllcy5pbmRleE9mKGNhdGVnb3J5KSA8IDApXG4gICAgICAgICAgICAgICAgJiYgKHJlc3VsdHNbMF0ucmVjb3JkW2NhdGVnb3J5XSAhPT0gcmVzdWx0c1sxXS5yZWNvcmRbY2F0ZWdvcnldKSkge1xuICAgICAgICAgICAgICAgIHByZXYucHVzaChjYXRlZ29yeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcHJldjtcbiAgICAgICAgfSwgW10pO1xuICAgICAgICBpZiAoZGlzY3JpbWluYXRpbmcubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJNYW55IGNvbXBhcmFibGUgcmVzdWx0cywgcGVyaGFwcyB5b3Ugd2FudCB0byBzcGVjaWZ5IGEgZGlzY3JpbWluYXRpbmcgXCIgKyBkaXNjcmltaW5hdGluZy5qb2luKCcsJykgKyAnIG9yIHVzZSBcImxpc3QgYWxsIC4uLlwiJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJ1lvdXIgcXVlc3Rpb24gZG9lcyBub3QgaGF2ZSBhIHNwZWNpZmljIGFuc3dlcic7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5leHBvcnRzLmlzSW5kaXNjcmltaW5hdGVSZXN1bHRUdXBlbCA9IGlzSW5kaXNjcmltaW5hdGVSZXN1bHRUdXBlbDtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
