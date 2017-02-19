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
var Match = require("./match");
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
/*
export function calcRanking(matched: { [key: string]: IMatch.IWord },
  mismatched: { [key: string]: IMatch.IWord }, relevantCount: number): number {

  var lenMatched = Object.keys(matched).length;
  var factor = Match.calcRankingProduct(matched);
  factor *= Math.pow(1.5, lenMatched);

  var lenMisMatched = Object.keys(mismatched).length;
  var factor2 = Match.calcRankingProduct(mismatched);
  factor2 *= Math.pow(0.4, lenMisMatched);

  return Math.pow(factor2 * factor, 1 / (lenMisMatched + lenMatched));
}
*/
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
/*
export function matchRecords(aSentences: IMatch.IProcessedSentences, category: string, records: Array<IMatch.IRecord>)
  : IMatch.IProcessedWhatIsAnswers {
  // if (debuglog.enabled) {
  //   debuglog(JSON.stringify(records, undefined, 2));
  // }
  var relevantRecords = records.filter(function (record: IMatch.IRecord) {
    return (record[category] !== undefined) && (record[category] !== null);
  });
  var res = [];
  debuglog("relevant records nr:" + relevantRecords.length);
  relevantRecords.forEach(function (record) {
    aSentences.sentences.forEach(function (aSentence) {
      // count matches in record which are *not* the category
      var mismatched = {}
      var matched = {};
      var cntRelevantWords = 0;
      aSentence.forEach(function (oWord) {
        if (!Word.Word.isFiller(oWord)) {
          cntRelevantWords = cntRelevantWords + 1;
          if (oWord.category && (record[oWord.category] !== undefined)) {
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
    })
  });
  res.sort(cmpByResultThenRanking);
  var result = Object.assign({}, aSentences, { answers: res });
  return filterRetainTopRankedResult(result);
}
*/
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC93aGF0aXMudHMiLCJtYXRjaC93aGF0aXMuanMiXSwibmFtZXMiOlsiSW5wdXRGaWx0ZXIiLCJyZXF1aXJlIiwiZGVidWciLCJkZWJ1Z2xvZyIsImRlYnVnbG9nViIsInBlcmZsb2ciLCJfIiwiTWF0Y2giLCJTZW50ZW5jZSIsIldvcmQiLCJBbGdvbCIsImNtcEJ5UmVzdWx0VGhlblJhbmtpbmciLCJhIiwiYiIsImNtcCIsInJlc3VsdCIsImxvY2FsZUNvbXBhcmUiLCJfcmFua2luZyIsImV4cG9ydHMiLCJsb2NhbGVDb21wYXJlQXJycyIsImFhcmVzdWx0IiwiYmJyZXN1bHQiLCJibGVuIiwibGVuZ3RoIiwiZXZlcnkiLCJpbmRleCIsImNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbCIsImFhIiwiYmIiLCJjbXBCeVJhbmtpbmciLCJrZXlzIiwiT2JqZWN0IiwicmVjb3JkIiwiY29uY2F0Iiwic29ydCIsInJlcyIsInJlZHVjZSIsInByZXYiLCJzS2V5IiwiY21wQnlSYW5raW5nVHVwZWwiLCJkdW1wTmljZSIsImFuc3dlciIsInMiLCJwdXNoIiwiY2F0ZWdvcnkiLCJmb3JFYWNoIiwic1JlcXVpcmVzIiwiY2hhckF0Iiwib1NlbnRlbmNlIiwic2VudGVuY2UiLCJvV29yZCIsInNXb3JkIiwic3RyaW5nIiwibWF0Y2hlZFN0cmluZyIsImR1bXBOaWNlVHVwZWwiLCJjYXRlZ29yaWVzIiwiam9pbiIsImR1bXBXZWlnaHRzVG9wIiwidG9vbG1hdGNoZXMiLCJvcHRpb25zIiwib01hdGNoIiwidG9wIiwiZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0IiwiYW5zd2VycyIsImZpbHRlciIsImlSZXMiLCJlbmFibGVkIiwiSlNPTiIsInN0cmluZ2lmeSIsImFzc2lnbiIsImZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdFR1cGVsIiwidHVwZWxhbnN3ZXJzIiwiaXNFcXVhbCIsImNhbGNSYW5raW5nU2ltcGxlIiwibWF0Y2hlZCIsIm1pc21hdGNoZWQiLCJub3VzZSIsInJlbGV2YW50Q291bnQiLCJmYWN0b3IiLCJNYXRoIiwicG93IiwiZmFjdG9yMiIsImZhY3RvcjMiLCJjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5IiwiaGFzQ2F0ZWdvcnkiLCJsZW5NYXRjaGVkIiwiY2FsY1JhbmtpbmdQcm9kdWN0IiwibGVuSGFzQ2F0ZWdvcnkiLCJmYWN0b3JIIiwibGVuTWlzTWF0Y2hlZCIsIm1hdGNoUmVjb3Jkc1R1cGVsSGF2aW5nQ29udGV4dCIsInBTZW50ZW5jZXMiLCJyZWNvcmRzIiwiY2F0ZWdvcnlTZXQiLCJjYXRlZ29yeUYiLCJyZWxldmFudFJlY29yZHMiLCJ1bmRlZmluZWQiLCJwcm9jZXNzIiwiZW52IiwiQUJPVF9GQVNUIiwiZmwiLCJsZiIsImFTaW1wbGlmaWVkU2VudGVuY2VzIiwic2VudGVuY2VzIiwibWFwIiwiZldvcmRzIiwiaXNGaWxsZXIiLCJyV29yZHMiLCJpc0NhdGVnb3J5IiwiY250UmVsZXZhbnRXb3JkcyIsImZyZWV6ZSIsImFTZW50ZW5jZSIsImV4dHJhY3RSZXN1bHQiLCJyZXN1bHQxIiwibWFrZVNpbXBsaWZpZWRTZW50ZW5jZXNDYXRlZ29yeVNldCIsImFTZW50ZW5jZXMiLCJ0cmFjayIsImFEb21haW5zIiwiZG9tYWlucyIsIm1ha2VTaW1wbGlmaWVkU2VudGVuY2VzIiwibWF0Y2hSZWNvcmRzUXVpY2tNdWx0aXBsZUNhdGVnb3JpZXMiLCJvYmoiLCJtaXNzaW5nY2F0IiwiX2RvbWFpbiIsInJlYyIsInJlc3VsdDIiLCJjbGFzc2lmeVdvcmRXaXRoVGFyZ2V0Q2F0ZWdvcnkiLCJ3b3JkIiwidGFyZ2V0Y2F0ZWdvcnkiLCJydWxlcyIsIndob2xlc2VudGVuY2UiLCJjYXRzIiwiY2F0ZWdvcml6ZUFXb3JkIiwiY2F0IiwiYW5hbHl6ZUNhdGVnb3J5IiwiY2F0ZWdvcnl3b3JkIiwic3BsaXRBdENvbW1hQW5kIiwic3RyIiwiciIsInNwbGl0IiwibyIsInJ0cmltbWVkIiwiU3RyaW5nIiwidHJpbSIsImFuYWx5emVDYXRlZ29yeU11bHRPbmx5QW5kQ29tbWEiLCJjYXRlZ29yeWxpc3QiLCJyY2F0IiwiaW5kZXhPZiIsIkVycm9yIiwiZmlsdGVyQWNjZXB0aW5nT25seSIsImlJbmRleCIsIkVyYmFzZSIsInNXb3JkcyIsInJlc2V0Q2FjaGUiLCJwcm9jZXNzU3RyaW5nIiwicXVlcnkiLCJBQk9UX09MRE1BVENIIiwid29yZENhY2hlIiwiYW5hbHl6ZUNvbnRleHRTdHJpbmciLCJjb250ZXh0UXVlcnlTdHJpbmciLCJhU2VudGVuY2VzUmVpbmZvcmNlZCIsInNsaWNlIiwiQ3V0b2ZmX1NlbnRlbmNlcyIsInJhbmtpbmdQcm9kdWN0IiwiY21wQnlOckNhdGVnb3JpZXNBbmRTYW1lRG9tYWluIiwiY250YSIsImdldERpc3RpbmN0Q2F0ZWdvcmllc0luU2VudGVuY2UiLCJjbnRiIiwiYW5hbHl6ZUNhdGVnb3J5TXVsdCIsImdXb3JkcyIsInJlczIiLCJjbXBSYW5raW5nUHJvZHVjdCIsImR1bXBOaWNlQXJyIiwicmVzY2F0IiwiYW5hbHl6ZU9wZXJhdG9yIiwib3B3b3JkIiwiRXJFcnJvciIsIkxpc3RBbGwiLCJyZXNvbHZlQ2F0ZWdvcnkiLCJlcnJvcnMiLCJtYWtlRXJyb3JfRU1QVFlfSU5QVVQiLCJ0b2tlbnMiLCJsaXN0QWxsV2l0aENvbnRleHQiLCJyZXNvbHZlQ2F0ZWdvcmllcyIsInRoZU1vZGVsIiwibGlzdEFsbFR1cGVsV2l0aENvbnRleHQiLCJmaWx0ZXJPbmx5VG9wUmFua2VkIiwicmVzdWx0cyIsImZpbHRlck9ubHlUb3BSYW5rZWRUdXBlbCIsImlzSW5kaXNjcmltaW5hdGVSZXN1bHQiLCJjbnQiLCJkaXNjcmltaW5hdGluZyIsImlzSW5kaXNjcmltaW5hdGVSZXN1bHRUdXBlbCJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztBQ01BOztBREVBLElBQUFBLGNBQUFDLFFBQUEsZUFBQSxDQUFBO0FBRUEsSUFBQUMsUUFBQUQsUUFBQSxPQUFBLENBQUE7QUFFQSxJQUFNRSxXQUFXRCxNQUFNLFFBQU4sQ0FB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SixNQUFNLENBQVYsRUFBYTtBQUNYO0FBQ0EsWUFBSUMsaUJBQWlCaEssT0FBT0QsSUFBUCxDQUFZNkosUUFBUSxDQUFSLEVBQVczSixNQUF2QixFQUErQkksTUFBL0IsQ0FBc0MsVUFBVUMsSUFBVixFQUFnQk8sUUFBaEIsRUFBd0I7QUFDakYsZ0JBQUtBLFNBQVNHLE1BQVQsQ0FBZ0IsQ0FBaEIsTUFBdUIsR0FBdkIsSUFBOEI0SSxRQUFRLENBQVIsRUFBV3BJLFVBQVgsQ0FBc0I0RixPQUF0QixDQUE4QnZHLFFBQTlCLElBQTBDLENBQXpFLElBQ0UrSSxRQUFRLENBQVIsRUFBVzNKLE1BQVgsQ0FBa0JZLFFBQWxCLE1BQWdDK0ksUUFBUSxDQUFSLEVBQVczSixNQUFYLENBQWtCWSxRQUFsQixDQUR0QyxFQUNvRTtBQUNsRVAscUJBQUtNLElBQUwsQ0FBVUMsUUFBVjtBQUNEO0FBQ0QsbUJBQU9QLElBQVA7QUFDRCxTQU5vQixFQU1sQixFQU5rQixDQUFyQjtBQU9BLFlBQUkwSixlQUFleEssTUFBbkIsRUFBMkI7QUFDekIsbUJBQU8sMkVBQTJFd0ssZUFBZXZJLElBQWYsQ0FBb0IsR0FBcEIsQ0FBM0UsR0FBc0csd0JBQTdHO0FBQ0Q7QUFDRCxlQUFPLCtDQUFQO0FBQ0Q7QUFDRCxXQUFPd0MsU0FBUDtBQUNEO0FBckJEOUUsUUFBQThLLDJCQUFBLEdBQUFBLDJCQUFBIiwiZmlsZSI6Im1hdGNoL3doYXRpcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICpcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmFuYWx5emVcbiAqIEBmaWxlIGFuYWx5emUudHNcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cbiAqL1xuXG5cbmltcG9ydCAqIGFzIElucHV0RmlsdGVyIGZyb20gJy4vaW5wdXRGaWx0ZXInO1xuXG5pbXBvcnQgKiBhcyBkZWJ1ZyBmcm9tICdkZWJ1Zyc7XG5cbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ3doYXRpcycpO1xuY29uc3QgZGVidWdsb2dWID0gZGVidWcoJ3doYXRWaXMnKTtcbmNvbnN0IHBlcmZsb2cgPSBkZWJ1ZygncGVyZicpO1xuXG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuLi91dGlscy91dGlscyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5cbmltcG9ydCAqIGFzIElNYXRjaCBmcm9tICcuL2lmbWF0Y2gnO1xuXG5cbmltcG9ydCAqIGFzIE1hdGNoIGZyb20gJy4vbWF0Y2gnO1xuXG5cbmltcG9ydCAqIGFzIFRvb2xtYXRjaGVyIGZyb20gJy4vdG9vbG1hdGNoZXInO1xuXG5pbXBvcnQgKiBhcyBTZW50ZW5jZSBmcm9tICcuL3NlbnRlbmNlJztcblxuaW1wb3J0ICogYXMgV29yZCBmcm9tICcuL3dvcmQnO1xuXG5pbXBvcnQgKiBhcyBBbGdvbCBmcm9tICcuL2FsZ29sJztcblxuXG5leHBvcnQgZnVuY3Rpb24gY21wQnlSZXN1bHRUaGVuUmFua2luZyhhOiBJTWF0Y2guSVdoYXRJc0Fuc3dlciwgYjogSU1hdGNoLklXaGF0SXNBbnN3ZXIpIHtcbiAgdmFyIGNtcCA9IGEucmVzdWx0LmxvY2FsZUNvbXBhcmUoYi5yZXN1bHQpO1xuICBpZiAoY21wKSB7XG4gICAgcmV0dXJuIGNtcDtcbiAgfVxuICByZXR1cm4gLShhLl9yYW5raW5nIC0gYi5fcmFua2luZyk7XG59XG5cbmZ1bmN0aW9uIGxvY2FsZUNvbXBhcmVBcnJzKGFhcmVzdWx0OiBzdHJpbmdbXSwgYmJyZXN1bHQ6IHN0cmluZ1tdKTogbnVtYmVyIHtcbiAgdmFyIGNtcCA9IDA7XG4gIHZhciBibGVuID0gYmJyZXN1bHQubGVuZ3RoO1xuICBhYXJlc3VsdC5ldmVyeShmdW5jdGlvbiAoYSwgaW5kZXgpIHtcbiAgICBpZiAoYmxlbiA8PSBpbmRleCkge1xuICAgICAgY21wID0gLTE7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGNtcCA9IGEubG9jYWxlQ29tcGFyZShiYnJlc3VsdFtpbmRleF0pO1xuICAgIGlmIChjbXApIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0pO1xuICBpZiAoY21wKSB7XG4gICAgcmV0dXJuIGNtcDtcbiAgfVxuICBpZiAoYmxlbiA+IGFhcmVzdWx0Lmxlbmd0aCkge1xuICAgIGNtcCA9ICsxO1xuICB9XG4gIHJldHVybiAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY21wQnlSZXN1bHRUaGVuUmFua2luZ1R1cGVsKGFhOiBJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyLCBiYjogSU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlcikge1xuICB2YXIgY21wID0gbG9jYWxlQ29tcGFyZUFycnMoYWEucmVzdWx0LCBiYi5yZXN1bHQpO1xuICBpZiAoY21wKSB7XG4gICAgcmV0dXJuIGNtcDtcbiAgfVxuICByZXR1cm4gLShhYS5fcmFua2luZyAtIGJiLl9yYW5raW5nKTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gY21wQnlSYW5raW5nKGE6IElNYXRjaC5JV2hhdElzQW5zd2VyLCBiOiBJTWF0Y2guSVdoYXRJc0Fuc3dlcikge1xuICB2YXIgY21wID0gLShhLl9yYW5raW5nIC0gYi5fcmFua2luZyk7XG4gIGlmIChjbXApIHtcbiAgICByZXR1cm4gY21wO1xuICB9XG4gIGNtcCA9IGEucmVzdWx0LmxvY2FsZUNvbXBhcmUoYi5yZXN1bHQpO1xuICBpZiAoY21wKSB7XG4gICAgcmV0dXJuIGNtcDtcbiAgfVxuXG4gIC8vIGFyZSByZWNvcmRzIGRpZmZlcmVudD9cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhLnJlY29yZCkuY29uY2F0KE9iamVjdC5rZXlzKGIucmVjb3JkKSkuc29ydCgpO1xuICB2YXIgcmVzID0ga2V5cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHNLZXkpIHtcbiAgICBpZiAocHJldikge1xuICAgICAgcmV0dXJuIHByZXY7XG4gICAgfVxuICAgIGlmIChiLnJlY29yZFtzS2V5XSAhPT0gYS5yZWNvcmRbc0tleV0pIHtcbiAgICAgIGlmICghYi5yZWNvcmRbc0tleV0pIHtcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgfVxuICAgICAgaWYgKCFhLnJlY29yZFtzS2V5XSkge1xuICAgICAgICByZXR1cm4gKzE7XG4gICAgICB9XG4gICAgICByZXR1cm4gYS5yZWNvcmRbc0tleV0ubG9jYWxlQ29tcGFyZShiLnJlY29yZFtzS2V5XSk7XG4gICAgfVxuICAgIHJldHVybiAwO1xuICB9LCAwKTtcbiAgcmV0dXJuIHJlcztcbn1cblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBjbXBCeVJhbmtpbmdUdXBlbChhOiBJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyLCBiOiBJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyKSB7XG4gIHZhciBjbXAgPSAtKGEuX3JhbmtpbmcgLSBiLl9yYW5raW5nKTtcbiAgaWYgKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cbiAgY21wID0gbG9jYWxlQ29tcGFyZUFycnMoYS5yZXN1bHQsIGIucmVzdWx0KTtcbiAgaWYgKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cbiAgLy8gYXJlIHJlY29yZHMgZGlmZmVyZW50P1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGEucmVjb3JkKS5jb25jYXQoT2JqZWN0LmtleXMoYi5yZWNvcmQpKS5zb3J0KCk7XG4gIHZhciByZXMgPSBrZXlzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgc0tleSkge1xuICAgIGlmIChwcmV2KSB7XG4gICAgICByZXR1cm4gcHJldjtcbiAgICB9XG4gICAgaWYgKGIucmVjb3JkW3NLZXldICE9PSBhLnJlY29yZFtzS2V5XSkge1xuICAgICAgaWYgKCFiLnJlY29yZFtzS2V5XSkge1xuICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgICBpZiAoIWEucmVjb3JkW3NLZXldKSB7XG4gICAgICAgIHJldHVybiArMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhLnJlY29yZFtzS2V5XS5sb2NhbGVDb21wYXJlKGIucmVjb3JkW3NLZXldKTtcbiAgICB9XG4gICAgcmV0dXJuIDA7XG4gIH0sIDApO1xuICByZXR1cm4gcmVzO1xufVxuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGR1bXBOaWNlKGFuc3dlcjogSU1hdGNoLklXaGF0SXNBbnN3ZXIpIHtcbiAgdmFyIHJlc3VsdCA9IHtcbiAgICBzOiBcIlwiLFxuICAgIHB1c2g6IGZ1bmN0aW9uIChzKSB7IHRoaXMucyA9IHRoaXMucyArIHM7IH1cbiAgfTtcbiAgdmFyIHMgPVxuICAgIGAqKlJlc3VsdCBmb3IgY2F0ZWdvcnk6ICR7YW5zd2VyLmNhdGVnb3J5fSBpcyAke2Fuc3dlci5yZXN1bHR9XG4gcmFuazogJHthbnN3ZXIuX3Jhbmtpbmd9XG5gO1xuICByZXN1bHQucHVzaChzKTtcbiAgT2JqZWN0LmtleXMoYW5zd2VyLnJlY29yZCkuZm9yRWFjaChmdW5jdGlvbiAoc1JlcXVpcmVzLCBpbmRleCkge1xuICAgIGlmIChzUmVxdWlyZXMuY2hhckF0KDApICE9PSAnXycpIHtcbiAgICAgIHJlc3VsdC5wdXNoKGByZWNvcmQ6ICR7c1JlcXVpcmVzfSAtPiAke2Fuc3dlci5yZWNvcmRbc1JlcXVpcmVzXX1gKTtcbiAgICB9XG4gICAgcmVzdWx0LnB1c2goJ1xcbicpO1xuICB9KTtcbiAgdmFyIG9TZW50ZW5jZSA9IGFuc3dlci5zZW50ZW5jZTtcbiAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpbmRleCkge1xuICAgIHZhciBzV29yZCA9IGBbJHtpbmRleH1dIDogJHtvV29yZC5jYXRlZ29yeX0gXCIke29Xb3JkLnN0cmluZ31cIiA9PiBcIiR7b1dvcmQubWF0Y2hlZFN0cmluZ31cImBcbiAgICByZXN1bHQucHVzaChzV29yZCArIFwiXFxuXCIpO1xuICB9KVxuICByZXN1bHQucHVzaChcIi5cXG5cIik7XG4gIHJldHVybiByZXN1bHQucztcbn1cbmV4cG9ydCBmdW5jdGlvbiBkdW1wTmljZVR1cGVsKGFuc3dlcjogSU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlcikge1xuICB2YXIgcmVzdWx0ID0ge1xuICAgIHM6IFwiXCIsXG4gICAgcHVzaDogZnVuY3Rpb24gKHMpIHsgdGhpcy5zID0gdGhpcy5zICsgczsgfVxuICB9O1xuICB2YXIgcyA9XG4gICAgYCoqUmVzdWx0IGZvciBjYXRlZ29yaWVzOiAke2Fuc3dlci5jYXRlZ29yaWVzLmpvaW4oXCI7XCIpfSBpcyAke2Fuc3dlci5yZXN1bHR9XG4gcmFuazogJHthbnN3ZXIuX3Jhbmtpbmd9XG5gO1xuICByZXN1bHQucHVzaChzKTtcbiAgT2JqZWN0LmtleXMoYW5zd2VyLnJlY29yZCkuZm9yRWFjaChmdW5jdGlvbiAoc1JlcXVpcmVzLCBpbmRleCkge1xuICAgIGlmIChzUmVxdWlyZXMuY2hhckF0KDApICE9PSAnXycpIHtcbiAgICAgIHJlc3VsdC5wdXNoKGByZWNvcmQ6ICR7c1JlcXVpcmVzfSAtPiAke2Fuc3dlci5yZWNvcmRbc1JlcXVpcmVzXX1gKTtcbiAgICB9XG4gICAgcmVzdWx0LnB1c2goJ1xcbicpO1xuICB9KTtcbiAgdmFyIG9TZW50ZW5jZSA9IGFuc3dlci5zZW50ZW5jZTtcbiAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpbmRleCkge1xuICAgIHZhciBzV29yZCA9IGBbJHtpbmRleH1dIDogJHtvV29yZC5jYXRlZ29yeX0gXCIke29Xb3JkLnN0cmluZ31cIiA9PiBcIiR7b1dvcmQubWF0Y2hlZFN0cmluZ31cImBcbiAgICByZXN1bHQucHVzaChzV29yZCArIFwiXFxuXCIpO1xuICB9KVxuICByZXN1bHQucHVzaChcIi5cXG5cIik7XG4gIHJldHVybiByZXN1bHQucztcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gZHVtcFdlaWdodHNUb3AodG9vbG1hdGNoZXM6IEFycmF5PElNYXRjaC5JV2hhdElzQW5zd2VyPiwgb3B0aW9uczogYW55KSB7XG4gIHZhciBzID0gJyc7XG4gIHRvb2xtYXRjaGVzLmZvckVhY2goZnVuY3Rpb24gKG9NYXRjaCwgaW5kZXgpIHtcbiAgICBpZiAoaW5kZXggPCBvcHRpb25zLnRvcCkge1xuICAgICAgcyA9IHMgKyBcIldoYXRJc0Fuc3dlcltcIiArIGluZGV4ICsgXCJdLi4uXFxuXCI7XG4gICAgICBzID0gcyArIGR1bXBOaWNlKG9NYXRjaCk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHQocmVzOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnMpOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnMge1xuICB2YXIgcmVzdWx0ID0gcmVzLmFuc3dlcnMuZmlsdGVyKGZ1bmN0aW9uIChpUmVzLCBpbmRleCkge1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICBkZWJ1Z2xvZygncmV0YWluIHRvcFJhbmtlZDogJyArIGluZGV4ICsgJyAnICsgSlNPTi5zdHJpbmdpZnkoaVJlcykpO1xuICAgIH1cbiAgICBpZiAoaVJlcy5yZXN1bHQgPT09IChyZXMuYW5zd2Vyc1tpbmRleCAtIDFdICYmIHJlcy5hbnN3ZXJzW2luZGV4IC0gMV0ucmVzdWx0KSkge1xuICAgICAgZGVidWdsb2coJ3NraXAnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0pO1xuICByZXN1bHQuc29ydChjbXBCeVJhbmtpbmcpO1xuICB2YXIgYSA9IE9iamVjdC5hc3NpZ24oeyBhbnN3ZXJzOiByZXN1bHQgfSwgcmVzLCB7IGFuc3dlcnM6IHJlc3VsdCB9KTtcbiAgYS5hbnN3ZXJzID0gcmVzdWx0O1xuICByZXR1cm4gYTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdFR1cGVsKHJlczogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNUdXBlbEFuc3dlcnMpOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc1R1cGVsQW5zd2VycyB7XG4gIHZhciByZXN1bHQgPSByZXMudHVwZWxhbnN3ZXJzLmZpbHRlcihmdW5jdGlvbiAoaVJlcywgaW5kZXgpIHtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgZGVidWdsb2coJyByZXRhaW4gdHVwZWwgJyArIGluZGV4ICsgJyAnICsgSlNPTi5zdHJpbmdpZnkoaVJlcykpO1xuICAgIH1cbiAgICBpZiAoXy5pc0VxdWFsKGlSZXMucmVzdWx0LCByZXMudHVwZWxhbnN3ZXJzW2luZGV4IC0gMV0gJiYgcmVzLnR1cGVsYW5zd2Vyc1tpbmRleCAtIDFdLnJlc3VsdCkpIHtcbiAgICAgIGRlYnVnbG9nKCdza2lwJyk7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0pO1xuICByZXN1bHQuc29ydChjbXBCeVJhbmtpbmdUdXBlbCk7XG4gIHJldHVybiBPYmplY3QuYXNzaWduKHJlcywgeyB0dXBlbGFuc3dlcnM6IHJlc3VsdCB9KTtcbn1cblxuXG4vKlxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNSYW5raW5nKG1hdGNoZWQ6IHsgW2tleTogc3RyaW5nXTogSU1hdGNoLklXb3JkIH0sXG4gIG1pc21hdGNoZWQ6IHsgW2tleTogc3RyaW5nXTogSU1hdGNoLklXb3JkIH0sIHJlbGV2YW50Q291bnQ6IG51bWJlcik6IG51bWJlciB7XG5cbiAgdmFyIGxlbk1hdGNoZWQgPSBPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGg7XG4gIHZhciBmYWN0b3IgPSBNYXRjaC5jYWxjUmFua2luZ1Byb2R1Y3QobWF0Y2hlZCk7XG4gIGZhY3RvciAqPSBNYXRoLnBvdygxLjUsIGxlbk1hdGNoZWQpO1xuXG4gIHZhciBsZW5NaXNNYXRjaGVkID0gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoO1xuICB2YXIgZmFjdG9yMiA9IE1hdGNoLmNhbGNSYW5raW5nUHJvZHVjdChtaXNtYXRjaGVkKTtcbiAgZmFjdG9yMiAqPSBNYXRoLnBvdygwLjQsIGxlbk1pc01hdGNoZWQpO1xuXG4gIHJldHVybiBNYXRoLnBvdyhmYWN0b3IyICogZmFjdG9yLCAxIC8gKGxlbk1pc01hdGNoZWQgKyBsZW5NYXRjaGVkKSk7XG59XG4qL1xuXG4vKipcbiAqIEEgcmFua2luZyB3aGljaCBpcyBwdXJlbHkgYmFzZWQgb24gdGhlIG51bWJlcnMgb2YgbWF0Y2hlZCBlbnRpdGllcyxcbiAqIGRpc3JlZ2FyZGluZyBleGFjdG5lc3Mgb2YgbWF0Y2hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhbGNSYW5raW5nU2ltcGxlKG1hdGNoZWQ6IG51bWJlcixcbiAgbWlzbWF0Y2hlZDogbnVtYmVyLCBub3VzZTogbnVtYmVyLFxuICByZWxldmFudENvdW50OiBudW1iZXIpOiBudW1iZXIge1xuICAvLyAyIDogMFxuICAvLyAxIDogMFxuICB2YXIgZmFjdG9yID0gbWF0Y2hlZCAqIE1hdGgucG93KDEuNSwgbWF0Y2hlZCkgKiBNYXRoLnBvdygxLjUsIG1hdGNoZWQpO1xuICB2YXIgZmFjdG9yMiA9IE1hdGgucG93KDAuNCwgbWlzbWF0Y2hlZCk7XG4gIHZhciBmYWN0b3IzID0gTWF0aC5wb3coMC40LCBub3VzZSk7XG4gIHJldHVybiBNYXRoLnBvdyhmYWN0b3IyICogZmFjdG9yICogZmFjdG9yMywgMSAvIChtaXNtYXRjaGVkICsgbWF0Y2hlZCArIG5vdXNlKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQ6IHsgW2tleTogc3RyaW5nXTogSU1hdGNoLklXb3JkIH0sXG4gIGhhc0NhdGVnb3J5OiB7IFtrZXk6IHN0cmluZ106IG51bWJlciB9LFxuICBtaXNtYXRjaGVkOiB7IFtrZXk6IHN0cmluZ106IElNYXRjaC5JV29yZCB9LCByZWxldmFudENvdW50OiBudW1iZXIpOiBudW1iZXIge1xuXG5cbiAgdmFyIGxlbk1hdGNoZWQgPSBPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGg7XG4gIHZhciBmYWN0b3IgPSBNYXRjaC5jYWxjUmFua2luZ1Byb2R1Y3QobWF0Y2hlZCk7XG4gIGZhY3RvciAqPSBNYXRoLnBvdygxLjUsIGxlbk1hdGNoZWQpO1xuXG4gIHZhciBsZW5IYXNDYXRlZ29yeSA9IE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5sZW5ndGg7XG4gIHZhciBmYWN0b3JIID0gTWF0aC5wb3coMS4xLCBsZW5IYXNDYXRlZ29yeSk7XG5cbiAgdmFyIGxlbk1pc01hdGNoZWQgPSBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGg7XG4gIHZhciBmYWN0b3IyID0gTWF0Y2guY2FsY1JhbmtpbmdQcm9kdWN0KG1pc21hdGNoZWQpO1xuICBmYWN0b3IyICo9IE1hdGgucG93KDAuNCwgbGVuTWlzTWF0Y2hlZCk7XG5cbiAgcmV0dXJuIE1hdGgucG93KGZhY3RvcjIgKiBmYWN0b3JIICogZmFjdG9yLCAxIC8gKGxlbk1pc01hdGNoZWQgKyBsZW5IYXNDYXRlZ29yeSArIGxlbk1hdGNoZWQpKTtcbn1cblxuLyoqXG4gKiBsaXN0IGFsbCB0b3AgbGV2ZWwgcmFua2luZ3NcbiAqL1xuLypcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFJlY29yZHNIYXZpbmdDb250ZXh0KFxuICBwU2VudGVuY2VzOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcywgY2F0ZWdvcnk6IHN0cmluZywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+LFxuICBjYXRlZ29yeVNldDogeyBba2V5OiBzdHJpbmddOiBib29sZWFuIH0pXG4gIDogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzIHtcblxuICAvL2RlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZHMsIHVuZGVmaW5lZCwgMikpO1xuICB2YXIgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZDogSU1hdGNoLklSZWNvcmQpIHtcbiAgICByZXR1cm4gKHJlY29yZFtjYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkgJiYgKHJlY29yZFtjYXRlZ29yeV0gIT09IG51bGwpO1xuICB9KTtcbiAgdmFyIHJlcyA9IFtdO1xuICBkZWJ1Z2xvZyhcIk1hdGNoUmVjb3Jkc0hhdmluZ0NvbnRleHQgOiByZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCk7XG4gIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJzZW50ZW5jZXMgYXJlIDogXCIgKyBKU09OLnN0cmluZ2lmeShwU2VudGVuY2VzLCB1bmRlZmluZWQsIDIpKSA6IFwiLVwiKTtcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImNhdGVnb3J5IFwiICsgY2F0ZWdvcnkgKyBcIiBhbmQgY2F0ZWdvcnlzZXQgaXM6IFwiICsgSlNPTi5zdHJpbmdpZnkoY2F0ZWdvcnlTZXQsIHVuZGVmaW5lZCwgMikpIDogXCItXCIpO1xuICBpZiAocHJvY2Vzcy5lbnYuQUJPVF9GQVNUICYmIGNhdGVnb3J5U2V0KSB7XG4gICAgLy8gd2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbiBjYXRlZ29yaWVzIHByZXNlbnQgaW4gcmVjb3JkcyBmb3IgZG9tYWlucyB3aGljaCBjb250YWluIHRoZSBjYXRlZ29yeVxuICAgIC8vIHZhciBjYXRlZ29yeXNldCA9IE1vZGVsLmNhbGN1bGF0ZVJlbGV2YW50UmVjb3JkQ2F0ZWdvcmllcyh0aGVNb2RlbCxjYXRlZ29yeSk7XG4gICAgLy9rbm93aW5nIHRoZSB0YXJnZXRcbiAgICBwZXJmbG9nKFwiZ290IGNhdGVnb3J5c2V0IHdpdGggXCIgKyBPYmplY3Qua2V5cyhjYXRlZ29yeVNldCkubGVuZ3RoKTtcbiAgICB2YXIgZmwgPSAwO1xuICAgIHZhciBsZiA9IDA7XG4gICAgdmFyIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gcFNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIHZhciBmV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICByZXR1cm4gIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCk7XG4gICAgICB9KTtcbiAgICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICByZXR1cm4gISFjYXRlZ29yeVNldFtvV29yZC5jYXRlZ29yeV0gfHwgV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpO1xuICAgICAgfSk7XG4gICAgICBmbCA9IGZsICsgb1NlbnRlbmNlLmxlbmd0aDtcbiAgICAgIGxmID0gbGYgKyByV29yZHMubGVuZ3RoO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsIC8vIG5vdCBhIGZpbGxlciAgLy8gdG8gYmUgY29tcGF0aWJsZSBpdCB3b3VsZCBiZSBmV29yZHNcbiAgICAgICAgcldvcmRzOiByV29yZHNcbiAgICAgIH07XG4gICAgfSk7XG4gICAgT2JqZWN0LmZyZWV6ZShhU2ltcGxpZmllZFNlbnRlbmNlcyk7XG4gICAgZGVidWdsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIGZsICsgXCItPlwiICsgbGYgKyBcIilcIik7XG4gICAgcGVyZmxvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgZmwgKyBcIi0+XCIgKyBsZiArIFwiKVwiKTtcbiAgICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICBhU2ltcGxpZmllZFNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgICAgdmFyIGhhc0NhdGVnb3J5ID0ge307XG4gICAgICAgIHZhciBtaXNtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gYVNlbnRlbmNlLmNudFJlbGV2YW50V29yZHM7XG4gICAgICAgIGFTZW50ZW5jZS5yV29yZHMuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgIG1hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpICYmIHJlY29yZFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgaGFzQ2F0ZWdvcnlbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSAxO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgICBpZiAoKE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aCArIE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5sZW5ndGgpID4gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoKSB7XG4gICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgc2VudGVuY2U6IGFTZW50ZW5jZS5vU2VudGVuY2UsXG4gICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICAgIHJlc3VsdDogcmVjb3JkW2NhdGVnb3J5XSxcbiAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0pO1xuICAgIGRlYnVnbG9nKFwiaGVyZSBpbiB3ZWlyZFwiKTtcbiAgfSBlbHNlIHtcbiAgICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICBwU2VudGVuY2VzLnNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgICAgdmFyIGhhc0NhdGVnb3J5ID0ge307XG4gICAgICAgIHZhciBtaXNtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gMDtcbiAgICAgICAgYVNlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgaWYgKCFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpKSB7XG4gICAgICAgICAgICBjbnRSZWxldmFudFdvcmRzID0gY250UmVsZXZhbnRXb3JkcyArIDE7XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKSAmJiByZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgICAgaGFzQ2F0ZWdvcnlbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICgoT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoICsgT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aCkgPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLFxuICAgICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgICByZXN1bHQ6IHJlY29yZFtjYXRlZ29yeV0sXG4gICAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KTtcbiAgfVxuICByZXMuc29ydChjbXBCeVJlc3VsdFRoZW5SYW5raW5nKTtcbiAgZGVidWdsb2coXCIgYWZ0ZXIgc29ydFwiICsgcmVzLmxlbmd0aCk7XG4gIHZhciByZXN1bHQgPSBPYmplY3QuYXNzaWduKHt9LCBwU2VudGVuY2VzLCB7IGFuc3dlcnM6IHJlcyB9KTtcbiAgcmV0dXJuIGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdChyZXN1bHQpO1xufVxuKi9cblxuLyoqXG4gKiBsaXN0IGFsbCB0b3AgbGV2ZWwgcmFua2luZ3NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVjb3Jkc1R1cGVsSGF2aW5nQ29udGV4dChcbiAgcFNlbnRlbmNlczogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMsIGNhdGVnb3JpZXM6IHN0cmluZ1tdLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sXG4gIGNhdGVnb3J5U2V0OiB7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfSlcbiAgOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc1R1cGVsQW5zd2VycyB7XG4gIC8vIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZHMsIHVuZGVmaW5lZCwgMikpO1xuICB2YXIgY2F0ZWdvcnlGID0gY2F0ZWdvcmllc1swXTtcbiAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQ6IElNYXRjaC5JUmVjb3JkKSB7XG4gICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnlGXSAhPT0gdW5kZWZpbmVkKSAmJiAocmVjb3JkW2NhdGVnb3J5Rl0gIT09IG51bGwpO1xuICB9KTtcbiAgdmFyIHJlcyA9IFtdIGFzIElNYXRjaC5JV2hhdElzVHVwZWxBbnN3ZXJbXTtcbiAgZGVidWdsb2coXCJyZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCk7XG4gIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJzZW50ZW5jZXMgYXJlIDogXCIgKyBKU09OLnN0cmluZ2lmeShwU2VudGVuY2VzLCB1bmRlZmluZWQsIDIpKSA6IFwiLVwiKTtcbiAgaWYgKHByb2Nlc3MuZW52LkFCT1RfRkFTVCAmJiBjYXRlZ29yeVNldCkge1xuICAgIC8vIHdlIGFyZSBvbmx5IGludGVyZXN0ZWQgaW4gY2F0ZWdvcmllcyBwcmVzZW50IGluIHJlY29yZHMgZm9yIGRvbWFpbnMgd2hpY2ggY29udGFpbiB0aGUgY2F0ZWdvcnlcbiAgICAvLyB2YXIgY2F0ZWdvcnlzZXQgPSBNb2RlbC5jYWxjdWxhdGVSZWxldmFudFJlY29yZENhdGVnb3JpZXModGhlTW9kZWwsY2F0ZWdvcnkpO1xuICAgIC8va25vd2luZyB0aGUgdGFyZ2V0XG4gICAgcGVyZmxvZyhcImdvdCBjYXRlZ29yeXNldCB3aXRoIFwiICsgT2JqZWN0LmtleXMoY2F0ZWdvcnlTZXQpLmxlbmd0aCk7XG4gICAgdmFyIGZsID0gMDtcbiAgICB2YXIgbGYgPSAwO1xuICAgIHZhciBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IHBTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICB2YXIgZldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgcmV0dXJuICFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpO1xuICAgICAgfSk7XG4gICAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgcmV0dXJuICEhY2F0ZWdvcnlTZXRbb1dvcmQuY2F0ZWdvcnldIHx8IFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKTtcbiAgICAgIH0pO1xuICAgICAgZmwgPSBmbCArIG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgICBsZiA9IGxmICsgcldvcmRzLmxlbmd0aDtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLCAvLyBub3QgYSBmaWxsZXIgIC8vIHRvIGJlIGNvbXBhdGlibGUgaXQgd291bGQgYmUgZldvcmRzXG4gICAgICAgIHJXb3JkczogcldvcmRzXG4gICAgICB9O1xuICAgIH0pO1xuICAgIE9iamVjdC5mcmVlemUoYVNpbXBsaWZpZWRTZW50ZW5jZXMpO1xuICAgIHBlcmZsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIGZsICsgXCItPlwiICsgbGYgKyBcIilcIik7XG4gICAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgYVNpbXBsaWZpZWRTZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAoYVNlbnRlbmNlKSB7XG4gICAgICAgIHZhciBoYXNDYXRlZ29yeSA9IHt9O1xuICAgICAgICB2YXIgbWlzbWF0Y2hlZCA9IHt9O1xuICAgICAgICB2YXIgbWF0Y2hlZCA9IHt9O1xuICAgICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IGFTZW50ZW5jZS5jbnRSZWxldmFudFdvcmRzO1xuICAgICAgICBhU2VudGVuY2UucldvcmRzLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICYmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKSAmJiByZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgIGhhc0NhdGVnb3J5W29Xb3JkLm1hdGNoZWRTdHJpbmddID0gMTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgaWYgKChPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoKSA+IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aCkge1xuICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2Uub1NlbnRlbmNlLFxuICAgICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgICBjYXRlZ29yaWVzOiBjYXRlZ29yaWVzLFxuICAgICAgICAgICAgcmVzdWx0OiBleHRyYWN0UmVzdWx0KGNhdGVnb3JpZXMsIHJlY29yZCksXG4gICAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICBwU2VudGVuY2VzLnNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgICAgdmFyIGhhc0NhdGVnb3J5ID0ge307XG4gICAgICAgIHZhciBtaXNtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gMDtcbiAgICAgICAgYVNlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgaWYgKCFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpKSB7XG4gICAgICAgICAgICBjbnRSZWxldmFudFdvcmRzID0gY250UmVsZXZhbnRXb3JkcyArIDE7XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKSAmJiByZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgICAgaGFzQ2F0ZWdvcnlbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICgoT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoICsgT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aCkgPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLFxuICAgICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgICBjYXRlZ29yaWVzOiBjYXRlZ29yaWVzLFxuICAgICAgICAgICAgcmVzdWx0OiBleHRyYWN0UmVzdWx0KGNhdGVnb3JpZXMsIHJlY29yZCksXG4gICAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KTtcbiAgfVxuICByZXMuc29ydChjbXBCeVJlc3VsdFRoZW5SYW5raW5nVHVwZWwpO1xuICB2YXIgcmVzdWx0MSA9IE9iamVjdC5hc3NpZ24oeyB0dXBlbGFuc3dlcnM6IHJlcyB9LCBwU2VudGVuY2VzKTtcbiAgcmV0dXJuIGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdFR1cGVsKHJlc3VsdDEpO1xufVxuXG4vKlxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVjb3JkcyhhU2VudGVuY2VzOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcywgY2F0ZWdvcnk6IHN0cmluZywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+KVxuICA6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzQW5zd2VycyB7XG4gIC8vIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gIC8vICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gIC8vIH1cbiAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQ6IElNYXRjaC5JUmVjb3JkKSB7XG4gICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnldICE9PSBudWxsKTtcbiAgfSk7XG4gIHZhciByZXMgPSBbXTtcbiAgZGVidWdsb2coXCJyZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCk7XG4gIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICBhU2VudGVuY2VzLnNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgIHZhciBtaXNtYXRjaGVkID0ge31cbiAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IDA7XG4gICAgICBhU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgaWYgKCFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpKSB7XG4gICAgICAgICAgY250UmVsZXZhbnRXb3JkcyA9IGNudFJlbGV2YW50V29yZHMgKyAxO1xuICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGlmIChPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2UsXG4gICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxuICAgICAgICAgIHJlc3VsdDogcmVjb3JkW2NhdGVnb3J5XSxcbiAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmcobWF0Y2hlZCwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSlcbiAgfSk7XG4gIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmcpO1xuICB2YXIgcmVzdWx0ID0gT2JqZWN0LmFzc2lnbih7fSwgYVNlbnRlbmNlcywgeyBhbnN3ZXJzOiByZXMgfSk7XG4gIHJldHVybiBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHQocmVzdWx0KTtcbn1cbiovXG5cbmZ1bmN0aW9uIG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzQ2F0ZWdvcnlTZXQoYVNlbnRlbmNlczogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMsXG4gIGNhdGVnb3J5U2V0OiB7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfSwgdHJhY2s6IHsgZmw6IG51bWJlciwgbGY6IG51bWJlciB9XG4pOiB7XG4gIGRvbWFpbnM6IHN0cmluZ1tdLFxuICBvU2VudGVuY2U6IElNYXRjaC5JU2VudGVuY2UsXG4gIGNudFJlbGV2YW50V29yZHM6IG51bWJlcixcbiAgcldvcmRzOiBJTWF0Y2guSVdvcmRbXVxufVtdIHtcbiAgcmV0dXJuIGFTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgdmFyIGFEb21haW5zID0gW10gYXMgc3RyaW5nW107XG4gICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwiZG9tYWluXCIpIHtcbiAgICAgICAgYURvbWFpbnMucHVzaChvV29yZC5tYXRjaGVkU3RyaW5nKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcIm1ldGFcIikge1xuICAgICAgICAvLyBlLmcuIGRvbWFpbiBYWFhcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuICEhY2F0ZWdvcnlTZXRbb1dvcmQuY2F0ZWdvcnldO1xuICAgIH0pO1xuICAgIHRyYWNrLmZsICs9IG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgdHJhY2subGYgKz0gcldvcmRzLmxlbmd0aDtcbiAgICByZXR1cm4ge1xuICAgICAgZG9tYWluczogYURvbWFpbnMsXG4gICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsXG4gICAgICByV29yZHM6IHJXb3Jkc1xuICAgIH07XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBtYWtlU2ltcGxpZmllZFNlbnRlbmNlcyhhU2VudGVuY2VzIDogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMsICB0cmFjazogeyBmbDogbnVtYmVyLCBsZjogbnVtYmVyIH0pOiB7XG4gIGRvbWFpbnM6IHN0cmluZ1tdLFxuICBvU2VudGVuY2U6IElNYXRjaC5JU2VudGVuY2UsXG4gIGNudFJlbGV2YW50V29yZHM6IG51bWJlcixcbiAgcldvcmRzOiBJTWF0Y2guSVdvcmRbXVxufVtdIHtcbiAgcmV0dXJuIGFTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgdmFyIGRvbWFpbnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJkb21haW5cIikge1xuICAgICAgICBkb21haW5zLnB1c2gob1dvcmQubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJtZXRhXCIpIHtcbiAgICAgICAgLy8gZS5nLiBkb21haW4gWFhYXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICB9KTtcbiAgICB0cmFjay5mbCArPSBvU2VudGVuY2UubGVuZ3RoO1xuICAgIHRyYWNrLmxmICs9IHJXb3Jkcy5sZW5ndGg7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgZG9tYWluczogZG9tYWlucyxcbiAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsXG4gICAgICByV29yZHM6IHJXb3Jkc1xuICAgIH07XG4gIH0pO1xufVxuXG5cbmZ1bmN0aW9uIGV4dHJhY3RSZXN1bHQoY2F0ZWdvcmllczogc3RyaW5nW10sIHJlY29yZDogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfSk6IHN0cmluZ1tdIHtcbiAgcmV0dXJuIGNhdGVnb3JpZXMubWFwKGZ1bmN0aW9uIChjYXRlZ29yeSkgeyByZXR1cm4gcmVjb3JkW2NhdGVnb3J5XSB8fCBcIm4vYVwiOyB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzKHBTZW50ZW5jZXM6IElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzLCBjYXRlZ29yaWVzOiBzdHJpbmdbXSwgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+LCBjYXRlZ29yeVNldD86IHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB9KVxuICA6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzVHVwZWxBbnN3ZXJzIHtcbiAgLy8gaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgLy8gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZHMsIHVuZGVmaW5lZCwgMikpO1xuICAvLyB9XG4gIE9iamVjdC5mcmVlemUoY2F0ZWdvcnlTZXQpO1xuICB2YXIgY2F0ZWdvcnlGID0gY2F0ZWdvcmllc1swXTtcbiAgZGVidWdsb2coXCJtYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcyAocj1cIiArIHJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiKVxcbiBjYXRlZ29yaWVzOlwiICsgY2F0ZWdvcmllcy5qb2luKFwiXFxuXCIpKTtcbiAgcGVyZmxvZyhcIm1hdGNoUmVjb3Jkc1F1aWNrTXVsdCAuLi4ocj1cIiArIHJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiKVwiKTtcbiAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQ6IElNYXRjaC5JUmVjb3JkKSB7XG4gICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnlGXSAhPT0gdW5kZWZpbmVkKSAmJiAocmVjb3JkW2NhdGVnb3J5Rl0gIT09IG51bGwpO1xuICB9KTtcbiAgdmFyIHJlcyA9IFtdIGFzIEFycmF5PElNYXRjaC5JV2hhdElzVHVwZWxBbnN3ZXI+O1xuICBkZWJ1Z2xvZyhcInJlbGV2YW50IHJlY29yZHMgd2l0aCBmaXJzdCAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIilcIik7XG4gIHBlcmZsb2coXCJyZWxldmFudCByZWNvcmRzIHdpdGggZmlyc3QgbnI6XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgc2VudGVuY2VzIFwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoKTtcbiAgaWYgKHByb2Nlc3MuZW52LkFCT1RfRkFTVCAmJiBjYXRlZ29yeVNldCkge1xuICAgIC8vIHdlIGFyZSBvbmx5IGludGVyZXN0ZWQgaW4gY2F0ZWdvcmllcyBwcmVzZW50IGluIHJlY29yZHMgZm9yIGRvbWFpbnMgd2hpY2ggY29udGFpbiB0aGUgY2F0ZWdvcnlcbiAgICAvLyB2YXIgY2F0ZWdvcnlzZXQgPSBNb2RlbC5jYWxjdWxhdGVSZWxldmFudFJlY29yZENhdGVnb3JpZXModGhlTW9kZWwsY2F0ZWdvcnkpO1xuICAgIC8va25vd2luZyB0aGUgdGFyZ2V0XG4gICAgcGVyZmxvZyhcImdvdCBjYXRlZ29yeXNldCB3aXRoIFwiICsgT2JqZWN0LmtleXMoY2F0ZWdvcnlTZXQpLmxlbmd0aCk7XG4gICAgdmFyIG9iaiA9IHsgZmw6IDAsIGxmOiAwIH07XG4gICAgdmFyIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXNDYXRlZ29yeVNldChwU2VudGVuY2VzLCBjYXRlZ29yeVNldCwgb2JqKTtcbiAgICBwZXJmbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyBvYmouZmwgKyBcIi0+XCIgKyBvYmoubGYgKyBcIilcIik7XG4gIH0gZWxzZSB7XG4gICAgZGVidWdsb2coXCJub3QgYWJvdF9mYXN0ICFcIik7XG4gICAgdmFyIHRyYWNrID0geyBmbDogMCAsIGxmIDogMH07XG4gICAgdmFyIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXMocFNlbnRlbmNlcyx0cmFjayk7XG4vKlxuICAgIHBTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgcmV0dXJuICFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpO1xuICAgICAgfSk7XG4gICAgICBmbCA9IGZsICsgb1NlbnRlbmNlLmxlbmd0aDtcbiAgICAgIGxmID0gbGYgKyByV29yZHMubGVuZ3RoO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsXG4gICAgICAgIHJXb3JkczogcldvcmRzXG4gICAgICB9O1xuICAgIH0pO1xuICAgICovXG4gICAgZGVidWdsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIHRyYWNrLmZsICsgXCItPlwiICsgdHJhY2subGYgKyBcIilcIik7XG4gICAgcGVyZmxvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgdHJhY2suZmwgKyBcIi0+XCIgKyB0cmFjay5sZiArIFwiKVwiKTtcbiAgfVxuXG4gIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICBhU2ltcGxpZmllZFNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgIHZhciBtaXNtYXRjaGVkID0gMDtcbiAgICAgIHZhciBtYXRjaGVkID0gMDtcbiAgICAgIHZhciBub3VzZSA9IDA7XG4gICAgICB2YXIgbWlzc2luZ2NhdCA9IDA7XG4gICAgICBhU2VudGVuY2UucldvcmRzLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIGlmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgKyttYXRjaGVkO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICArK21pc21hdGNoZWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAhPT0gXCJjYXRlZ29yeVwiKSB7XG4gICAgICAgICAgICBub3VzZSArPSAxO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoIXJlY29yZFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgICBtaXNzaW5nY2F0ICs9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGlmIChhU2VudGVuY2UuZG9tYWlucy5sZW5ndGgpIHtcbiAgICAgICAgaWYgKChyZWNvcmQgYXMgYW55KS5fZG9tYWluICE9PSBhU2VudGVuY2UuZG9tYWluc1swXSkge1xuICAgICAgICAgIG1pc21hdGNoZWQgPSAzMDAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG1hdGNoZWQgKz0gMTtcbiAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiR09UIEEgRE9NQUlOIEhJVFwiICsgbWF0Y2hlZCArIFwiIFwiICsgbWlzbWF0Y2hlZCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIGlmKG1hdGNoZWQgPiAwIHx8IG1pc21hdGNoZWQgPiAwICkge1xuICAgICAgLy8gICBjb25zb2xlLmxvZyhcIiBtXCIgKyBtYXRjaGVkICsgXCIgbWlzbWF0Y2hlZFwiICsgbWlzbWF0Y2hlZCk7XG4gICAgICAvLyB9XG4gICAgICAvL2NvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGFTZW50ZW5jZS5vU2VudGVuY2UpKTtcbiAgICAgIGlmIChtYXRjaGVkID4gbWlzbWF0Y2hlZCkge1xuICAgICAgICB2YXIgcmVjID0ge1xuICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2Uub1NlbnRlbmNlLFxuICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgIGNhdGVnb3JpZXM6IGNhdGVnb3JpZXMsXG4gICAgICAgICAgcmVzdWx0OiBleHRyYWN0UmVzdWx0KGNhdGVnb3JpZXMsIHJlY29yZCksXG4gICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nU2ltcGxlKG1hdGNoZWQsIG1pc21hdGNoZWQsIChub3VzZSArIG1pc3NpbmdjYXQpLCBhU2VudGVuY2UuY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgfVxuICAgICAgICAvKiAgIGlmKHJlY29yZFtcImFwcElkXCJdID09PVwiRjE1NjZcIikge1xuICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaGVyZSBGMTU2NlwiICsgSlNPTi5zdHJpbmdpZnkocmVjKSk7XG4gICAgICAgICAgICAgY29uc29sZS5sb2coXCJoZXJlIG1hdGNoZWRcIiArIG1hdGNoZWQgKyBcIiBtaXNtYXRjaGVkXCIgKyBtaXNtYXRjaGVkICsgXCIgbm91c2UgXCIgKyAobm91c2UgKyBtaXNzaW5nY2F0KSk7XG4gICAgICAgICAgICAgY29uc29sZS5sb2coXCJoZXJlIGNudFJlbGV2YW50IDpcIiArIGFTZW50ZW5jZS5jbnRSZWxldmFudFdvcmRzKTtcbiAgICAgICAgICAgfVxuICAgICAgICAgICBpZihyZWNvcmRbXCJhcHBJZFwiXSA9PT1cIkYwNzMxQVwiKSB7XG4gICAgICAgICAgICAgY29uc29sZS5sb2coXCJoZXJlIEYwNzMxQVwiICsgSlNPTi5zdHJpbmdpZnkocmVjKSk7XG4gICAgICAgICAgICAgY29uc29sZS5sb2coXCJoZXJlIG1hdGNoZWRcIiArIG1hdGNoZWQgKyBcIiBtaXNtYXRjaGVkXCIgKyBtaXNtYXRjaGVkICsgXCIgbm91c2UgXCIgKyAobm91c2UgKyBtaXNzaW5nY2F0KSk7XG4gICAgICAgICAgICAgY29uc29sZS5sb2coXCJoZXJlIGNudFJlbGV2YW50IDpcIiArIGFTZW50ZW5jZS5jbnRSZWxldmFudFdvcmRzKTtcbiAgICAgICAgICAgfVxuICAgICAgICAgICAqL1xuICAgICAgICByZXMucHVzaChyZWMpO1xuICAgICAgfVxuICAgIH0pXG4gIH0pO1xuICBwZXJmbG9nKFwic29ydCAoYT1cIiArIHJlcy5sZW5ndGggKyBcIilcIik7XG4gIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbCk7XG4gIHBlcmZsb2coXCJmaWx0ZXJSZXRhaW4gLi4uXCIpO1xuICB2YXIgcmVzdWx0MSA9IE9iamVjdC5hc3NpZ24oeyB0dXBlbGFuc3dlcnM6IHJlcyB9LCBwU2VudGVuY2VzKVxuICB2YXIgcmVzdWx0MiA9IGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdFR1cGVsKHJlc3VsdDEpO1xuICBwZXJmbG9nKFwibWF0Y2hSZWNvcmRzUXVpY2sgZG9uZTogKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGE9XCIgKyByZXMubGVuZ3RoICsgXCIpXCIpO1xuICByZXR1cm4gcmVzdWx0Mjtcbn1cblxuXG5mdW5jdGlvbiBjbGFzc2lmeVdvcmRXaXRoVGFyZ2V0Q2F0ZWdvcnkod29yZDogc3RyaW5nLCB0YXJnZXRjYXRlZ29yeTogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsXG4gIHdob2xlc2VudGVuY2U6IHN0cmluZyk6IHN0cmluZyB7XG4gIC8vY29uc29sZS5sb2coXCJjbGFzc2lmeSBcIiArIHdvcmQgKyBcIiBcIiAgKyB0YXJnZXRjYXRlZ29yeSk7XG4gIHZhciBjYXRzID0gSW5wdXRGaWx0ZXIuY2F0ZWdvcml6ZUFXb3JkKHdvcmQsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlLCB7fSk7XG4gIC8vIFRPRE8gcXVhbGlmeVxuICBjYXRzID0gY2F0cy5maWx0ZXIoZnVuY3Rpb24gKGNhdCkge1xuICAgIHJldHVybiBjYXQuY2F0ZWdvcnkgPT09IHRhcmdldGNhdGVnb3J5O1xuICB9KVxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShjYXRzKSk7XG4gIGlmIChjYXRzLmxlbmd0aCkge1xuICAgIHJldHVybiBjYXRzWzBdLm1hdGNoZWRTdHJpbmc7XG4gIH1cbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZUNhdGVnb3J5KGNhdGVnb3J5d29yZDogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHdob2xlc2VudGVuY2U6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBjbGFzc2lmeVdvcmRXaXRoVGFyZ2V0Q2F0ZWdvcnkoY2F0ZWdvcnl3b3JkLCAnY2F0ZWdvcnknLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzcGxpdEF0Q29tbWFBbmQoc3RyOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIHZhciByID0gc3RyLnNwbGl0KC8oXFxiYW5kXFxiKXxbLF0vKTtcbiAgciA9IHIuZmlsdGVyKGZ1bmN0aW9uIChvLCBpbmRleCkge1xuICAgIGlmIChpbmRleCAlIDIgPiAwKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9KTtcbiAgdmFyIHJ0cmltbWVkID0gci5tYXAoZnVuY3Rpb24gKG8pIHtcbiAgICByZXR1cm4gbmV3IFN0cmluZyhvKS50cmltKCk7XG4gIH0pO1xuICByZXR1cm4gcnRyaW1tZWQ7XG59XG4vKipcbiAqIEEgc2ltcGxlIGltcGxlbWVudGF0aW9uLCBzcGxpdHRpbmcgYXQgYW5kIGFuZCAsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhbmFseXplQ2F0ZWdvcnlNdWx0T25seUFuZENvbW1hKGNhdGVnb3J5bGlzdDogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHdob2xlc2VudGVuY2U6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgdmFyIHJ0cmltbWVkID0gc3BsaXRBdENvbW1hQW5kKGNhdGVnb3J5bGlzdCk7XG4gIHZhciByY2F0ID0gcnRyaW1tZWQubWFwKGZ1bmN0aW9uIChvKSB7XG4gICAgcmV0dXJuIGFuYWx5emVDYXRlZ29yeShvLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG4gIH0pO1xuICBpZiAocmNhdC5pbmRleE9mKHVuZGVmaW5lZCkgPj0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignXCInICsgcnRyaW1tZWRbcmNhdC5pbmRleE9mKHVuZGVmaW5lZCldICsgJ1wiIGlzIG5vdCBhIGNhdGVnb3J5IScpO1xuICB9XG4gIHJldHVybiByY2F0O1xufVxuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlckFjY2VwdGluZ09ubHkocmVzOiBJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11bXSwgY2F0ZWdvcmllczogc3RyaW5nW10pOlxuICBJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11bXSB7XG4gIHJldHVybiByZXMuZmlsdGVyKGZ1bmN0aW9uIChhU2VudGVuY2UsIGlJbmRleCkge1xuICAgIHJldHVybiBhU2VudGVuY2UuZXZlcnkoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICByZXR1cm4gY2F0ZWdvcmllcy5pbmRleE9mKG9Xb3JkLmNhdGVnb3J5KSA+PSAwO1xuICAgIH0pO1xuICB9KVxufVxuXG5cbmltcG9ydCAqIGFzIEVyYmFzZSBmcm9tICcuL2VyYmFzZSc7XG5cbnZhciBzV29yZHMgPSB7fTtcblxuZXhwb3J0IGZ1bmN0aW9uIHJlc2V0Q2FjaGUoKTogdm9pZCB7XG4gIHNXb3JkcyA9IHt9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJvY2Vzc1N0cmluZyhxdWVyeTogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXNcbik6IElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzIHtcblxuICBpZiAoIXByb2Nlc3MuZW52LkFCT1RfT0xETUFUQ0gpIHtcbiAgICByZXR1cm4gRXJiYXNlLnByb2Nlc3NTdHJpbmcocXVlcnksIHJ1bGVzLCBydWxlcy53b3JkQ2FjaGUpO1xuICB9XG4vKlxuICB2YXIgbWF0Y2hlZCA9IElucHV0RmlsdGVyLmFuYWx5emVTdHJpbmcocXVlcnksIHJ1bGVzLCBzV29yZHMpO1xuICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgIGRlYnVnbG9nKFwiQWZ0ZXIgbWF0Y2hlZCBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWQpKTtcbiAgfVxuICB2YXIgYVNlbnRlbmNlcyA9IElucHV0RmlsdGVyLmV4cGFuZE1hdGNoQXJyKG1hdGNoZWQpO1xuICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgIGRlYnVnbG9nKFwiYWZ0ZXIgZXhwYW5kXCIgKyBhU2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgfVxuICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBJbnB1dEZpbHRlci5yZWluRm9yY2UoYVNlbnRlbmNlcyk7XG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgZGVidWdsb2coXCJhZnRlciByZWluZm9yY2VcIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgfVxuICByZXR1cm4ge1xuICAgIGVycm9yczogW10sXG4gICAgc2VudGVuY2VzOiBhU2VudGVuY2VzUmVpbmZvcmNlZFxuICB9IGFzIElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzO1xuKi9cbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZUNvbnRleHRTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nOiBzdHJpbmcsIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcyk6XG4gIElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzIHtcblxuICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBwcm9jZXNzU3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMpXG4gIC8vIHdlIGxpbWl0IGFuYWx5c2lzIHRvIG4gc2VudGVuY2VzXG4gIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcyA9IGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5zbGljZSgwLCBBbGdvbC5DdXRvZmZfU2VudGVuY2VzKTtcbiAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICBkZWJ1Z2xvZyhcImFmdGVyIHJlaW5mb3JjZSBhbmQgY3V0b2ZmXCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubGVuZ3RoICsgXCJcXG5cIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgfSkuam9pbihcIlxcblwiKSk7XG4gIH1cbiAgcmV0dXJuIGFTZW50ZW5jZXNSZWluZm9yY2VkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY21wQnlOckNhdGVnb3JpZXNBbmRTYW1lRG9tYWluKGE6IElNYXRjaC5JU2VudGVuY2UsIGI6IElNYXRjaC5JU2VudGVuY2UpOiBudW1iZXIge1xuICAvL2NvbnNvbGUubG9nKFwiY29tcGFyZSBhXCIgKyBhICsgXCIgY250YiBcIiArIGIpO1xuICB2YXIgY250YSA9IFNlbnRlbmNlLmdldERpc3RpbmN0Q2F0ZWdvcmllc0luU2VudGVuY2UoYSkubGVuZ3RoO1xuICB2YXIgY250YiA9IFNlbnRlbmNlLmdldERpc3RpbmN0Q2F0ZWdvcmllc0luU2VudGVuY2UoYikubGVuZ3RoO1xuICAvKlxuICAgIHZhciBjbnRhID0gYS5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgb1dvcmQpIHtcbiAgICAgIHJldHVybiBwcmV2ICsgKChvV29yZC5jYXRlZ29yeSA9PT0gXCJjYXRlZ29yeVwiKT8gMSA6IDApO1xuICAgIH0sMCk7XG4gICAgdmFyIGNudGIgPSBiLnJlZHVjZShmdW5jdGlvbihwcmV2LCBvV29yZCkge1xuICAgICAgcmV0dXJuIHByZXYgKyAoKG9Xb3JkLmNhdGVnb3J5ID09PSBcImNhdGVnb3J5XCIpPyAxIDogMCk7XG4gICAgfSwwKTtcbiAgIC8vIGNvbnNvbGUubG9nKFwiY250IGFcIiArIGNudGEgKyBcIiBjbnRiIFwiICsgY250Yik7XG4gICAqL1xuICByZXR1cm4gY250YiAtIGNudGE7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhbmFseXplQ2F0ZWdvcnlNdWx0KGNhdGVnb3J5bGlzdDogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHdob2xlc2VudGVuY2U6IHN0cmluZywgZ1dvcmRzOlxuICB7IFtrZXk6IHN0cmluZ106IElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXSB9KTogc3RyaW5nW10ge1xuICB2YXIgcmVzID0gYW5hbHl6ZUNvbnRleHRTdHJpbmcoY2F0ZWdvcnlsaXN0LCBydWxlcyk7XG4gIC8vICBkZWJ1Z2xvZyhcInJlc3VsdGluZyBjYXRlZ29yeSBzZW50ZW5jZXNcIiwgSlNPTi5zdHJpbmdpZnkocmVzKSk7XG4gIHZhciByZXMyID0gZmlsdGVyQWNjZXB0aW5nT25seShyZXMuc2VudGVuY2VzLCBbXCJjYXRlZ29yeVwiLCBcImZpbGxlclwiXSk7XG4gIC8vICBjb25zb2xlLmxvZyhcImhlcmUgcmVzMlwiICsgSlNPTi5zdHJpbmdpZnkocmVzMikgKTtcbiAgLy8gIGNvbnNvbGUubG9nKFwiaGVyZSB1bmRlZmluZWQgISArIFwiICsgcmVzMi5maWx0ZXIobyA9PiAhbykubGVuZ3RoKTtcbiAgcmVzMi5zb3J0KFNlbnRlbmNlLmNtcFJhbmtpbmdQcm9kdWN0KTtcbiAgZGVidWdsb2coXCJyZXN1bHRpbmcgY2F0ZWdvcnkgc2VudGVuY2VzOiBcXG5cIiwgZGVidWdsb2cuZW5hYmxlZCA/IChTZW50ZW5jZS5kdW1wTmljZUFycihyZXMyLnNsaWNlKDAsIDMpLCBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdCkpIDogJy0nKTtcbiAgLy8gVE9ETzogICByZXMyID0gZmlsdGVyQWNjZXB0aW5nT25seVNhbWVEb21haW4ocmVzMik7XG4gIC8vZGVidWdsb2coXCJyZXN1bHRpbmcgY2F0ZWdvcnkgc2VudGVuY2VzXCIsIEpTT04uc3RyaW5naWZ5KHJlczIsIHVuZGVmaW5lZCwgMikpO1xuICAvLyBleHBlY3Qgb25seSBjYXRlZ29yaWVzXG4gIC8vIHdlIGNvdWxkIHJhbmsgbm93IGJ5IGNvbW1vbiBkb21haW5zICwgYnV0IGZvciBub3cgd2Ugb25seSB0YWtlIHRoZSBmaXJzdCBvbmVcbiAgaWYgKCFyZXMyLmxlbmd0aCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgLy9yZXMuc29ydChjbXBCeU5yQ2F0ZWdvcmllc0FuZFNhbWVEb21haW4pO1xuICB2YXIgcmVzY2F0ID0gU2VudGVuY2UuZ2V0RGlzdGluY3RDYXRlZ29yaWVzSW5TZW50ZW5jZShyZXMyWzBdKTtcbiAgcmV0dXJuIHJlc2NhdDtcbiAgLy8gXCJcIiByZXR1cm4gcmVzWzBdLmZpbHRlcigpXG4gIC8vIHJldHVybiBjbGFzc2lmeVdvcmRXaXRoVGFyZ2V0Q2F0ZWdvcnkoY2F0ZWdvcnlsaXN0LCAnY2F0ZWdvcnknLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhbmFseXplT3BlcmF0b3Iob3B3b3JkOiBzdHJpbmcsIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgd2hvbGVzZW50ZW5jZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGNsYXNzaWZ5V29yZFdpdGhUYXJnZXRDYXRlZ29yeShvcHdvcmQsICdvcGVyYXRvcicsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlKTtcbn1cblxuXG5pbXBvcnQgKiBhcyBFckVycm9yIGZyb20gJy4vZXJlcnJvcic7XG5cbmltcG9ydCAqIGFzIExpc3RBbGwgZnJvbSAnLi9saXN0YWxsJztcbi8vIGNvbnN0IHJlc3VsdCA9IFdoYXRJcy5yZXNvbHZlQ2F0ZWdvcnkoY2F0LCBhMS5lbnRpdHksXG4vLyAgIHRoZU1vZGVsLm1SdWxlcywgdGhlTW9kZWwudG9vbHMsIHRoZU1vZGVsLnJlY29yZHMpO1xuXG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlQ2F0ZWdvcnkoY2F0ZWdvcnk6IHN0cmluZywgY29udGV4dFF1ZXJ5U3RyaW5nOiBzdHJpbmcsXG4gIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+KTogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzIHtcbiAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4geyBlcnJvcnM6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSwgdG9rZW5zOiBbXSwgYW5zd2VyczogW10gfTtcbiAgfSBlbHNlIHtcbiAgICAvKlxuICAgICAgICB2YXIgbWF0Y2hlZCA9IElucHV0RmlsdGVyLmFuYWx5emVTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcyk7XG4gICAgICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJhZnRlciBtYXRjaGVkIFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZCkpOiAnLScpO1xuICAgICAgICB2YXIgYVNlbnRlbmNlcyA9IElucHV0RmlsdGVyLmV4cGFuZE1hdGNoQXJyKG1hdGNoZWQpO1xuICAgICAgICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgZGVidWdsb2coXCJhZnRlciBleHBhbmRcIiArIGFTZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgICAgICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICAgICAgfSAqL1xuXG5cbiAgICAgICAgICAvLyB2YXIgY2F0ZWdvcnlTZXQgPSBNb2RlbC5nZXRBbGxSZWNvcmRDYXRlZ29yaWVzRm9yVGFyZ2V0Q2F0ZWdvcnkodGhlTW9kZWwsIGNhdCwgdHJ1ZSk7XG5cbiAgICB2YXIgcmVzID0gTGlzdEFsbC5saXN0QWxsV2l0aENvbnRleHQoY2F0ZWdvcnksIGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMsIHJlY29yZHMpO1xuICAgIC8vKiBzb3J0IGJ5IHNlbnRlbmNlXG4gICAgcmVzLmFuc3dlcnMuZm9yRWFjaChvID0+IHsgby5fcmFua2luZyA9IG8uX3JhbmtpbmcgKiAgU2VudGVuY2UucmFua2luZ1Byb2R1Y3QoIG8uc2VudGVuY2UgKTsgfSk7XG4gICAgcmVzLmFuc3dlcnMuc29ydChjbXBCeVJhbmtpbmcpO1xuICAgIHJldHVybiByZXM7XG4vKlxuICAgIC8vID8/PyB2YXIgcmVzID0gTGlzdEFsbC5saXN0QWxsSGF2aW5nQ29udGV4dChjYXRlZ29yeSwgY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcywgcmVjb3Jkcyk7XG5cbiAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBwcm9jZXNzU3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMpO1xuICAgIC8vYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24ob1NlbnRlbmNlKSB7IHJldHVybiBJbnB1dEZpbHRlci5yZWluRm9yY2Uob1NlbnRlbmNlKTsgfSk7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImFmdGVyIHJlaW5mb3JjZVwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICB9KS5qb2luKFwiXFxuXCIpKSA6ICctJyk7XG4gICAgdmFyIG1hdGNoZWRBbnN3ZXJzID0gbWF0Y2hSZWNvcmRzKGFTZW50ZW5jZXNSZWluZm9yY2VkLCBjYXRlZ29yeSwgcmVjb3Jkcyk7IC8vYVRvb2w6IEFycmF5PElNYXRjaC5JVG9vbD4pOiBhbnkgLyAqIG9iamVjdHN0cmVhbSogLyB7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcIiBtYXRjaGVkQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMsIHVuZGVmaW5lZCwgMikpIDogJy0nKTtcbiAgICByZXR1cm4gbWF0Y2hlZEFuc3dlcnM7XG4qL1xuIH1cbn1cblxuLypcbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlQ2F0ZWdvcnlPbGQoY2F0ZWdvcnk6IHN0cmluZywgY29udGV4dFF1ZXJ5U3RyaW5nOiBzdHJpbmcsXG4gIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+KTogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzIHtcbiAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4geyBlcnJvcnM6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSwgdG9rZW5zOiBbXSwgYW5zd2VyczogW10gfTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBwcm9jZXNzU3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMpO1xuICAgIC8vYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24ob1NlbnRlbmNlKSB7IHJldHVybiBJbnB1dEZpbHRlci5yZWluRm9yY2Uob1NlbnRlbmNlKTsgfSk7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImFmdGVyIHJlaW5mb3JjZVwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICB9KS5qb2luKFwiXFxuXCIpKSA6ICctJyk7XG4gICAgdmFyIG1hdGNoZWRBbnN3ZXJzID0gbWF0Y2hSZWNvcmRzKGFTZW50ZW5jZXNSZWluZm9yY2VkLCBjYXRlZ29yeSwgcmVjb3Jkcyk7IC8vYVRvb2w6IEFycmF5PElNYXRjaC5JVG9vbD4pOiBhbnkgLyAqIG9iamVjdHN0cmVhbSogLyB7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcIiBtYXRjaGVkQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMsIHVuZGVmaW5lZCwgMikpIDogJy0nKTtcbiAgICByZXR1cm4gbWF0Y2hlZEFuc3dlcnM7XG4gIH1cbn1cbiovXG5cbmltcG9ydCAqIGFzIE1vZGVsIGZyb20gJy4uL21vZGVsL21vZGVsJztcblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVDYXRlZ29yaWVzKGNhdGVnb3JpZXM6IHN0cmluZ1tdLCBjb250ZXh0UXVlcnlTdHJpbmc6IHN0cmluZyxcbiAgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzKTogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNUdXBlbEFuc3dlcnMge1xuICB2YXIgcmVjb3JkcyA9IHRoZU1vZGVsLnJlY29yZHM7XG4gIHZhciBydWxlcyA9IHRoZU1vZGVsLnJ1bGVzO1xuICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcnM6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSxcbiAgICAgIHR1cGVsYW5zd2VyczogW10sXG4gICAgICB0b2tlbnM6IFtdXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIHZhciBjYXRlZ29yeVNldCA9IE1vZGVsLmdldEFsbFJlY29yZENhdGVnb3JpZXNGb3JUYXJnZXRDYXRlZ29yeSh0aGVNb2RlbCwgY2F0LCB0cnVlKTtcbiAgICB2YXIgcmVzID0gTGlzdEFsbC5saXN0QWxsVHVwZWxXaXRoQ29udGV4dChjYXRlZ29yaWVzLCBjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzLCByZWNvcmRzKTtcbiAgICAvLyogc29ydCBieSBzZW50ZW5jZVxuICAgIHJlcy50dXBlbGFuc3dlcnMuZm9yRWFjaChvID0+IHsgby5fcmFua2luZyA9IG8uX3JhbmtpbmcgKiAgU2VudGVuY2UucmFua2luZ1Byb2R1Y3QoIG8uc2VudGVuY2UgKTsgfSk7XG4gICAgcmVzLnR1cGVsYW5zd2Vycy5zb3J0KGNtcEJ5UmFua2luZ1R1cGVsKTtcbiAgICByZXR1cm4gcmVzO1xuICB9XG59XG5cbi8qXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUNhdGVnb3JpZXNPbGQoY2F0ZWdvcmllczogc3RyaW5nW10sIGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLFxuICB0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMpOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc1R1cGVsQW5zd2VycyB7XG4gIHZhciByZWNvcmRzID0gdGhlTW9kZWwucmVjb3JkcztcbiAgdmFyIHJ1bGVzID0gdGhlTW9kZWwucnVsZXM7XG4gIGlmIChjb250ZXh0UXVlcnlTdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczogW0VyRXJyb3IubWFrZUVycm9yX0VNUFRZX0lOUFVUKCldLFxuICAgICAgdHVwZWxhbnN3ZXJzOiBbXSxcbiAgICAgIHRva2VuczogW11cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gcHJvY2Vzc1N0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHRoZU1vZGVsLnJ1bGVzKTtcbiAgICAvL2FTZW50ZW5jZXMubWFwKGZ1bmN0aW9uKG9TZW50ZW5jZSkgeyByZXR1cm4gSW5wdXRGaWx0ZXIucmVpbkZvcmNlKG9TZW50ZW5jZSk7IH0pO1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJhZnRlciByZWluZm9yY2VcIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgfSkuam9pbihcIlxcblwiKSkgOiAnLScpO1xuICAgIC8vdmFyIG1hdGNoZWRBbnN3ZXJzID0gbWF0Y2hSZWNvcmRzUXVpY2soYVNlbnRlbmNlcywgY2F0ZWdvcnksIHJlY29yZHMpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8gKiBvYmplY3RzdHJlYW0qIC8ge1xuICAgIHZhciBjYXRlZ29yeVNldCA9IHt9O1xuICAgIGNhdGVnb3JpZXMuZm9yRWFjaChmdW5jdGlvbiAoY2F0ZWdvcnkpIHtcbiAgICAgIGNhdGVnb3J5U2V0W2NhdGVnb3J5XSA9IHRydWU7XG4gICAgICB2YXIgY2F0ZWdvcnlTZXRMb2NhbCA9IE1vZGVsLmdldEFsbFJlY29yZENhdGVnb3JpZXNGb3JUYXJnZXRDYXRlZ29yeSh0aGVNb2RlbCwgY2F0ZWdvcnksIHRydWUpO1xuICAgICAgT2JqZWN0LmFzc2lnbihjYXRlZ29yeVNldCwgY2F0ZWdvcnlTZXRMb2NhbCk7XG4gICAgfSk7XG5cbiAgICB2YXIgbWF0Y2hlZEFuc3dlcnMgPSBtYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcyhhU2VudGVuY2VzUmVpbmZvcmNlZCwgY2F0ZWdvcmllcywgcmVjb3JkcywgY2F0ZWdvcnlTZXQpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8gKiBvYmplY3RzdHJlYW0gKiAvIHtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgZGVidWdsb2coXCIgbWF0Y2hlZCBBbnN3ZXJzXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkQW5zd2VycywgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHBlcmZsb2coXCJmaWx0ZXJpbmcgdG9wUmFua2VkIChhPVwiICsgbWF0Y2hlZEFuc3dlcnMudHVwZWxhbnN3ZXJzLmxlbmd0aCArIFwiKS4uLlwiKTtcbiAgICB2YXIgbWF0Y2hlZEZpbHRlcmVkID0gT2JqZWN0LmFzc2lnbih7fSwgbWF0Y2hlZEFuc3dlcnMpO1xuICAgIG1hdGNoZWRGaWx0ZXJlZC50dXBlbGFuc3dlcnMgPSBmaWx0ZXJPbmx5VG9wUmFua2VkVHVwZWwobWF0Y2hlZEFuc3dlcnMudHVwZWxhbnN3ZXJzKTtcblxuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICBkZWJ1Z2xvZyhcIiBtYXRjaGVkIHRvcC1yYW5rZWQgQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEZpbHRlcmVkLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgcGVyZmxvZyhcInRvdGFsV2hhdGlzV2l0aENvbnRleHQgKGE9XCIgKyBtYXRjaGVkRmlsdGVyZWQudHVwZWxhbnN3ZXJzLmxlbmd0aCArIFwiKVwiKTtcbiAgICByZXR1cm4gbWF0Y2hlZEZpbHRlcmVkOyAvLyA/Pz8gQW5zd2VycztcbiAgfVxufVxuKi9cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlck9ubHlUb3BSYW5rZWQocmVzdWx0czogQXJyYXk8SU1hdGNoLklXaGF0SXNBbnN3ZXI+KTogQXJyYXk8SU1hdGNoLklXaGF0SXNBbnN3ZXI+IHtcbiAgdmFyIHJlcyA9IHJlc3VsdHMuZmlsdGVyKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICBpZiAocmVzdWx0Ll9yYW5raW5nID09PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHJlc3VsdC5fcmFua2luZyA+PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJMaXN0IHRvIGZpbHRlciBtdXN0IGJlIG9yZGVyZWRcIik7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG4gIHJldHVybiByZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJPbmx5VG9wUmFua2VkVHVwZWwocmVzdWx0czogQXJyYXk8SU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlcj4pOiBBcnJheTxJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyPiB7XG4gIHZhciByZXMgPSByZXN1bHRzLmZpbHRlcihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgaWYgKHJlc3VsdC5fcmFua2luZyA9PT0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChyZXN1bHQuX3JhbmtpbmcgPj0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTGlzdCB0byBmaWx0ZXIgbXVzdCBiZSBvcmRlcmVkXCIpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuICByZXR1cm4gcmVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdChyZXN1bHRzOiBBcnJheTxJTWF0Y2guSVdoYXRJc0Fuc3dlcj4pOiBzdHJpbmcge1xuICB2YXIgY250ID0gcmVzdWx0cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHJlc3VsdCkge1xuICAgIGlmIChyZXN1bHQuX3JhbmtpbmcgPT09IHJlc3VsdHNbMF0uX3JhbmtpbmcpIHtcbiAgICAgIHJldHVybiBwcmV2ICsgMTtcbiAgICB9XG4gIH0sIDApO1xuICBpZiAoY250ID4gMSkge1xuICAgIC8vIHNlYXJjaCBmb3IgYSBkaXNjcmltaW5hdGluZyBjYXRlZ29yeSB2YWx1ZVxuICAgIHZhciBkaXNjcmltaW5hdGluZyA9IE9iamVjdC5rZXlzKHJlc3VsdHNbMF0ucmVjb3JkKS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGNhdGVnb3J5KSB7XG4gICAgICBpZiAoKGNhdGVnb3J5LmNoYXJBdCgwKSAhPT0gJ18nICYmIGNhdGVnb3J5ICE9PSByZXN1bHRzWzBdLmNhdGVnb3J5KVxuICAgICAgICAmJiAocmVzdWx0c1swXS5yZWNvcmRbY2F0ZWdvcnldICE9PSByZXN1bHRzWzFdLnJlY29yZFtjYXRlZ29yeV0pKSB7XG4gICAgICAgIHByZXYucHVzaChjYXRlZ29yeSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJldjtcbiAgICB9LCBbXSk7XG4gICAgaWYgKGRpc2NyaW1pbmF0aW5nLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIFwiTWFueSBjb21wYXJhYmxlIHJlc3VsdHMsIHBlcmhhcHMgeW91IHdhbnQgdG8gc3BlY2lmeSBhIGRpc2NyaW1pbmF0aW5nIFwiICsgZGlzY3JpbWluYXRpbmcuam9pbignLCcpO1xuICAgIH1cbiAgICByZXR1cm4gJ1lvdXIgcXVlc3Rpb24gZG9lcyBub3QgaGF2ZSBhIHNwZWNpZmljIGFuc3dlcic7XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzSW5kaXNjcmltaW5hdGVSZXN1bHRUdXBlbChyZXN1bHRzOiBBcnJheTxJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyPik6IHN0cmluZyB7XG4gIHZhciBjbnQgPSByZXN1bHRzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgcmVzdWx0KSB7XG4gICAgaWYgKHJlc3VsdC5fcmFua2luZyA9PT0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgcmV0dXJuIHByZXYgKyAxO1xuICAgIH1cbiAgfSwgMCk7XG4gIGlmIChjbnQgPiAxKSB7XG4gICAgLy8gc2VhcmNoIGZvciBhIGRpc2NyaW1pbmF0aW5nIGNhdGVnb3J5IHZhbHVlXG4gICAgdmFyIGRpc2NyaW1pbmF0aW5nID0gT2JqZWN0LmtleXMocmVzdWx0c1swXS5yZWNvcmQpLnJlZHVjZShmdW5jdGlvbiAocHJldiwgY2F0ZWdvcnkpIHtcbiAgICAgIGlmICgoY2F0ZWdvcnkuY2hhckF0KDApICE9PSAnXycgJiYgcmVzdWx0c1swXS5jYXRlZ29yaWVzLmluZGV4T2YoY2F0ZWdvcnkpIDwgMClcbiAgICAgICAgJiYgKHJlc3VsdHNbMF0ucmVjb3JkW2NhdGVnb3J5XSAhPT0gcmVzdWx0c1sxXS5yZWNvcmRbY2F0ZWdvcnldKSkge1xuICAgICAgICBwcmV2LnB1c2goY2F0ZWdvcnkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgW10pO1xuICAgIGlmIChkaXNjcmltaW5hdGluZy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBcIk1hbnkgY29tcGFyYWJsZSByZXN1bHRzLCBwZXJoYXBzIHlvdSB3YW50IHRvIHNwZWNpZnkgYSBkaXNjcmltaW5hdGluZyBcIiArIGRpc2NyaW1pbmF0aW5nLmpvaW4oJywnKSArICcgb3IgdXNlIFwibGlzdCBhbGwgLi4uXCInO1xuICAgIH1cbiAgICByZXR1cm4gJ1lvdXIgcXVlc3Rpb24gZG9lcyBub3QgaGF2ZSBhIHNwZWNpZmljIGFuc3dlcic7XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbiIsIi8qKlxuICpcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmFuYWx5emVcbiAqIEBmaWxlIGFuYWx5emUudHNcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cbiAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgSW5wdXRGaWx0ZXIgPSByZXF1aXJlKFwiLi9pbnB1dEZpbHRlclwiKTtcbnZhciBkZWJ1ZyA9IHJlcXVpcmUoXCJkZWJ1Z1wiKTtcbnZhciBkZWJ1Z2xvZyA9IGRlYnVnKCd3aGF0aXMnKTtcbnZhciBkZWJ1Z2xvZ1YgPSBkZWJ1Zygnd2hhdFZpcycpO1xudmFyIHBlcmZsb2cgPSBkZWJ1ZygncGVyZicpO1xudmFyIF8gPSByZXF1aXJlKFwibG9kYXNoXCIpO1xudmFyIE1hdGNoID0gcmVxdWlyZShcIi4vbWF0Y2hcIik7XG52YXIgU2VudGVuY2UgPSByZXF1aXJlKFwiLi9zZW50ZW5jZVwiKTtcbnZhciBXb3JkID0gcmVxdWlyZShcIi4vd29yZFwiKTtcbnZhciBBbGdvbCA9IHJlcXVpcmUoXCIuL2FsZ29sXCIpO1xuZnVuY3Rpb24gY21wQnlSZXN1bHRUaGVuUmFua2luZyhhLCBiKSB7XG4gICAgdmFyIGNtcCA9IGEucmVzdWx0LmxvY2FsZUNvbXBhcmUoYi5yZXN1bHQpO1xuICAgIGlmIChjbXApIHtcbiAgICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG4gICAgcmV0dXJuIC0oYS5fcmFua2luZyAtIGIuX3JhbmtpbmcpO1xufVxuZXhwb3J0cy5jbXBCeVJlc3VsdFRoZW5SYW5raW5nID0gY21wQnlSZXN1bHRUaGVuUmFua2luZztcbmZ1bmN0aW9uIGxvY2FsZUNvbXBhcmVBcnJzKGFhcmVzdWx0LCBiYnJlc3VsdCkge1xuICAgIHZhciBjbXAgPSAwO1xuICAgIHZhciBibGVuID0gYmJyZXN1bHQubGVuZ3RoO1xuICAgIGFhcmVzdWx0LmV2ZXJ5KGZ1bmN0aW9uIChhLCBpbmRleCkge1xuICAgICAgICBpZiAoYmxlbiA8PSBpbmRleCkge1xuICAgICAgICAgICAgY21wID0gLTE7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgY21wID0gYS5sb2NhbGVDb21wYXJlKGJicmVzdWx0W2luZGV4XSk7XG4gICAgICAgIGlmIChjbXApIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICBpZiAoY21wKSB7XG4gICAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuICAgIGlmIChibGVuID4gYWFyZXN1bHQubGVuZ3RoKSB7XG4gICAgICAgIGNtcCA9ICsxO1xuICAgIH1cbiAgICByZXR1cm4gMDtcbn1cbmZ1bmN0aW9uIGNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbChhYSwgYmIpIHtcbiAgICB2YXIgY21wID0gbG9jYWxlQ29tcGFyZUFycnMoYWEucmVzdWx0LCBiYi5yZXN1bHQpO1xuICAgIGlmIChjbXApIHtcbiAgICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG4gICAgcmV0dXJuIC0oYWEuX3JhbmtpbmcgLSBiYi5fcmFua2luZyk7XG59XG5leHBvcnRzLmNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbCA9IGNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbDtcbmZ1bmN0aW9uIGNtcEJ5UmFua2luZyhhLCBiKSB7XG4gICAgdmFyIGNtcCA9IC0oYS5fcmFua2luZyAtIGIuX3JhbmtpbmcpO1xuICAgIGlmIChjbXApIHtcbiAgICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG4gICAgY21wID0gYS5yZXN1bHQubG9jYWxlQ29tcGFyZShiLnJlc3VsdCk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgICByZXR1cm4gY21wO1xuICAgIH1cbiAgICAvLyBhcmUgcmVjb3JkcyBkaWZmZXJlbnQ/XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhLnJlY29yZCkuY29uY2F0KE9iamVjdC5rZXlzKGIucmVjb3JkKSkuc29ydCgpO1xuICAgIHZhciByZXMgPSBrZXlzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgc0tleSkge1xuICAgICAgICBpZiAocHJldikge1xuICAgICAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGIucmVjb3JkW3NLZXldICE9PSBhLnJlY29yZFtzS2V5XSkge1xuICAgICAgICAgICAgaWYgKCFiLnJlY29yZFtzS2V5XSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghYS5yZWNvcmRbc0tleV0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKzE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYS5yZWNvcmRbc0tleV0ubG9jYWxlQ29tcGFyZShiLnJlY29yZFtzS2V5XSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfSwgMCk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuY21wQnlSYW5raW5nID0gY21wQnlSYW5raW5nO1xuZnVuY3Rpb24gY21wQnlSYW5raW5nVHVwZWwoYSwgYikge1xuICAgIHZhciBjbXAgPSAtKGEuX3JhbmtpbmcgLSBiLl9yYW5raW5nKTtcbiAgICBpZiAoY21wKSB7XG4gICAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuICAgIGNtcCA9IGxvY2FsZUNvbXBhcmVBcnJzKGEucmVzdWx0LCBiLnJlc3VsdCk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgICByZXR1cm4gY21wO1xuICAgIH1cbiAgICAvLyBhcmUgcmVjb3JkcyBkaWZmZXJlbnQ/XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhLnJlY29yZCkuY29uY2F0KE9iamVjdC5rZXlzKGIucmVjb3JkKSkuc29ydCgpO1xuICAgIHZhciByZXMgPSBrZXlzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgc0tleSkge1xuICAgICAgICBpZiAocHJldikge1xuICAgICAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGIucmVjb3JkW3NLZXldICE9PSBhLnJlY29yZFtzS2V5XSkge1xuICAgICAgICAgICAgaWYgKCFiLnJlY29yZFtzS2V5XSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghYS5yZWNvcmRbc0tleV0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKzE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYS5yZWNvcmRbc0tleV0ubG9jYWxlQ29tcGFyZShiLnJlY29yZFtzS2V5XSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfSwgMCk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuY21wQnlSYW5raW5nVHVwZWwgPSBjbXBCeVJhbmtpbmdUdXBlbDtcbmZ1bmN0aW9uIGR1bXBOaWNlKGFuc3dlcikge1xuICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgIHM6IFwiXCIsXG4gICAgICAgIHB1c2g6IGZ1bmN0aW9uIChzKSB7IHRoaXMucyA9IHRoaXMucyArIHM7IH1cbiAgICB9O1xuICAgIHZhciBzID0gXCIqKlJlc3VsdCBmb3IgY2F0ZWdvcnk6IFwiICsgYW5zd2VyLmNhdGVnb3J5ICsgXCIgaXMgXCIgKyBhbnN3ZXIucmVzdWx0ICsgXCJcXG4gcmFuazogXCIgKyBhbnN3ZXIuX3JhbmtpbmcgKyBcIlxcblwiO1xuICAgIHJlc3VsdC5wdXNoKHMpO1xuICAgIE9iamVjdC5rZXlzKGFuc3dlci5yZWNvcmQpLmZvckVhY2goZnVuY3Rpb24gKHNSZXF1aXJlcywgaW5kZXgpIHtcbiAgICAgICAgaWYgKHNSZXF1aXJlcy5jaGFyQXQoMCkgIT09ICdfJykge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2goXCJyZWNvcmQ6IFwiICsgc1JlcXVpcmVzICsgXCIgLT4gXCIgKyBhbnN3ZXIucmVjb3JkW3NSZXF1aXJlc10pO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdC5wdXNoKCdcXG4nKTtcbiAgICB9KTtcbiAgICB2YXIgb1NlbnRlbmNlID0gYW5zd2VyLnNlbnRlbmNlO1xuICAgIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaW5kZXgpIHtcbiAgICAgICAgdmFyIHNXb3JkID0gXCJbXCIgKyBpbmRleCArIFwiXSA6IFwiICsgb1dvcmQuY2F0ZWdvcnkgKyBcIiBcXFwiXCIgKyBvV29yZC5zdHJpbmcgKyBcIlxcXCIgPT4gXFxcIlwiICsgb1dvcmQubWF0Y2hlZFN0cmluZyArIFwiXFxcIlwiO1xuICAgICAgICByZXN1bHQucHVzaChzV29yZCArIFwiXFxuXCIpO1xuICAgIH0pO1xuICAgIHJlc3VsdC5wdXNoKFwiLlxcblwiKTtcbiAgICByZXR1cm4gcmVzdWx0LnM7XG59XG5leHBvcnRzLmR1bXBOaWNlID0gZHVtcE5pY2U7XG5mdW5jdGlvbiBkdW1wTmljZVR1cGVsKGFuc3dlcikge1xuICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgIHM6IFwiXCIsXG4gICAgICAgIHB1c2g6IGZ1bmN0aW9uIChzKSB7IHRoaXMucyA9IHRoaXMucyArIHM7IH1cbiAgICB9O1xuICAgIHZhciBzID0gXCIqKlJlc3VsdCBmb3IgY2F0ZWdvcmllczogXCIgKyBhbnN3ZXIuY2F0ZWdvcmllcy5qb2luKFwiO1wiKSArIFwiIGlzIFwiICsgYW5zd2VyLnJlc3VsdCArIFwiXFxuIHJhbms6IFwiICsgYW5zd2VyLl9yYW5raW5nICsgXCJcXG5cIjtcbiAgICByZXN1bHQucHVzaChzKTtcbiAgICBPYmplY3Qua2V5cyhhbnN3ZXIucmVjb3JkKS5mb3JFYWNoKGZ1bmN0aW9uIChzUmVxdWlyZXMsIGluZGV4KSB7XG4gICAgICAgIGlmIChzUmVxdWlyZXMuY2hhckF0KDApICE9PSAnXycpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwicmVjb3JkOiBcIiArIHNSZXF1aXJlcyArIFwiIC0+IFwiICsgYW5zd2VyLnJlY29yZFtzUmVxdWlyZXNdKTtcbiAgICAgICAgfVxuICAgICAgICByZXN1bHQucHVzaCgnXFxuJyk7XG4gICAgfSk7XG4gICAgdmFyIG9TZW50ZW5jZSA9IGFuc3dlci5zZW50ZW5jZTtcbiAgICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGluZGV4KSB7XG4gICAgICAgIHZhciBzV29yZCA9IFwiW1wiICsgaW5kZXggKyBcIl0gOiBcIiArIG9Xb3JkLmNhdGVnb3J5ICsgXCIgXFxcIlwiICsgb1dvcmQuc3RyaW5nICsgXCJcXFwiID0+IFxcXCJcIiArIG9Xb3JkLm1hdGNoZWRTdHJpbmcgKyBcIlxcXCJcIjtcbiAgICAgICAgcmVzdWx0LnB1c2goc1dvcmQgKyBcIlxcblwiKTtcbiAgICB9KTtcbiAgICByZXN1bHQucHVzaChcIi5cXG5cIik7XG4gICAgcmV0dXJuIHJlc3VsdC5zO1xufVxuZXhwb3J0cy5kdW1wTmljZVR1cGVsID0gZHVtcE5pY2VUdXBlbDtcbmZ1bmN0aW9uIGR1bXBXZWlnaHRzVG9wKHRvb2xtYXRjaGVzLCBvcHRpb25zKSB7XG4gICAgdmFyIHMgPSAnJztcbiAgICB0b29sbWF0Y2hlcy5mb3JFYWNoKGZ1bmN0aW9uIChvTWF0Y2gsIGluZGV4KSB7XG4gICAgICAgIGlmIChpbmRleCA8IG9wdGlvbnMudG9wKSB7XG4gICAgICAgICAgICBzID0gcyArIFwiV2hhdElzQW5zd2VyW1wiICsgaW5kZXggKyBcIl0uLi5cXG5cIjtcbiAgICAgICAgICAgIHMgPSBzICsgZHVtcE5pY2Uob01hdGNoKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBzO1xufVxuZXhwb3J0cy5kdW1wV2VpZ2h0c1RvcCA9IGR1bXBXZWlnaHRzVG9wO1xuZnVuY3Rpb24gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0KHJlcykge1xuICAgIHZhciByZXN1bHQgPSByZXMuYW5zd2Vycy5maWx0ZXIoZnVuY3Rpb24gKGlSZXMsIGluZGV4KSB7XG4gICAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZygncmV0YWluIHRvcFJhbmtlZDogJyArIGluZGV4ICsgJyAnICsgSlNPTi5zdHJpbmdpZnkoaVJlcykpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpUmVzLnJlc3VsdCA9PT0gKHJlcy5hbnN3ZXJzW2luZGV4IC0gMV0gJiYgcmVzLmFuc3dlcnNbaW5kZXggLSAxXS5yZXN1bHQpKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZygnc2tpcCcpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIHJlc3VsdC5zb3J0KGNtcEJ5UmFua2luZyk7XG4gICAgdmFyIGEgPSBPYmplY3QuYXNzaWduKHsgYW5zd2VyczogcmVzdWx0IH0sIHJlcywgeyBhbnN3ZXJzOiByZXN1bHQgfSk7XG4gICAgYS5hbnN3ZXJzID0gcmVzdWx0O1xuICAgIHJldHVybiBhO1xufVxuZXhwb3J0cy5maWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHQgPSBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHQ7XG5mdW5jdGlvbiBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHRUdXBlbChyZXMpIHtcbiAgICB2YXIgcmVzdWx0ID0gcmVzLnR1cGVsYW5zd2Vycy5maWx0ZXIoZnVuY3Rpb24gKGlSZXMsIGluZGV4KSB7XG4gICAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZygnIHJldGFpbiB0dXBlbCAnICsgaW5kZXggKyAnICcgKyBKU09OLnN0cmluZ2lmeShpUmVzKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKF8uaXNFcXVhbChpUmVzLnJlc3VsdCwgcmVzLnR1cGVsYW5zd2Vyc1tpbmRleCAtIDFdICYmIHJlcy50dXBlbGFuc3dlcnNbaW5kZXggLSAxXS5yZXN1bHQpKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZygnc2tpcCcpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIHJlc3VsdC5zb3J0KGNtcEJ5UmFua2luZ1R1cGVsKTtcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihyZXMsIHsgdHVwZWxhbnN3ZXJzOiByZXN1bHQgfSk7XG59XG5leHBvcnRzLmZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdFR1cGVsID0gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0VHVwZWw7XG4vKlxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNSYW5raW5nKG1hdGNoZWQ6IHsgW2tleTogc3RyaW5nXTogSU1hdGNoLklXb3JkIH0sXG4gIG1pc21hdGNoZWQ6IHsgW2tleTogc3RyaW5nXTogSU1hdGNoLklXb3JkIH0sIHJlbGV2YW50Q291bnQ6IG51bWJlcik6IG51bWJlciB7XG5cbiAgdmFyIGxlbk1hdGNoZWQgPSBPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGg7XG4gIHZhciBmYWN0b3IgPSBNYXRjaC5jYWxjUmFua2luZ1Byb2R1Y3QobWF0Y2hlZCk7XG4gIGZhY3RvciAqPSBNYXRoLnBvdygxLjUsIGxlbk1hdGNoZWQpO1xuXG4gIHZhciBsZW5NaXNNYXRjaGVkID0gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoO1xuICB2YXIgZmFjdG9yMiA9IE1hdGNoLmNhbGNSYW5raW5nUHJvZHVjdChtaXNtYXRjaGVkKTtcbiAgZmFjdG9yMiAqPSBNYXRoLnBvdygwLjQsIGxlbk1pc01hdGNoZWQpO1xuXG4gIHJldHVybiBNYXRoLnBvdyhmYWN0b3IyICogZmFjdG9yLCAxIC8gKGxlbk1pc01hdGNoZWQgKyBsZW5NYXRjaGVkKSk7XG59XG4qL1xuLyoqXG4gKiBBIHJhbmtpbmcgd2hpY2ggaXMgcHVyZWx5IGJhc2VkIG9uIHRoZSBudW1iZXJzIG9mIG1hdGNoZWQgZW50aXRpZXMsXG4gKiBkaXNyZWdhcmRpbmcgZXhhY3RuZXNzIG9mIG1hdGNoXG4gKi9cbmZ1bmN0aW9uIGNhbGNSYW5raW5nU2ltcGxlKG1hdGNoZWQsIG1pc21hdGNoZWQsIG5vdXNlLCByZWxldmFudENvdW50KSB7XG4gICAgLy8gMiA6IDBcbiAgICAvLyAxIDogMFxuICAgIHZhciBmYWN0b3IgPSBtYXRjaGVkICogTWF0aC5wb3coMS41LCBtYXRjaGVkKSAqIE1hdGgucG93KDEuNSwgbWF0Y2hlZCk7XG4gICAgdmFyIGZhY3RvcjIgPSBNYXRoLnBvdygwLjQsIG1pc21hdGNoZWQpO1xuICAgIHZhciBmYWN0b3IzID0gTWF0aC5wb3coMC40LCBub3VzZSk7XG4gICAgcmV0dXJuIE1hdGgucG93KGZhY3RvcjIgKiBmYWN0b3IgKiBmYWN0b3IzLCAxIC8gKG1pc21hdGNoZWQgKyBtYXRjaGVkICsgbm91c2UpKTtcbn1cbmV4cG9ydHMuY2FsY1JhbmtpbmdTaW1wbGUgPSBjYWxjUmFua2luZ1NpbXBsZTtcbmZ1bmN0aW9uIGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIHJlbGV2YW50Q291bnQpIHtcbiAgICB2YXIgbGVuTWF0Y2hlZCA9IE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aDtcbiAgICB2YXIgZmFjdG9yID0gTWF0Y2guY2FsY1JhbmtpbmdQcm9kdWN0KG1hdGNoZWQpO1xuICAgIGZhY3RvciAqPSBNYXRoLnBvdygxLjUsIGxlbk1hdGNoZWQpO1xuICAgIHZhciBsZW5IYXNDYXRlZ29yeSA9IE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5sZW5ndGg7XG4gICAgdmFyIGZhY3RvckggPSBNYXRoLnBvdygxLjEsIGxlbkhhc0NhdGVnb3J5KTtcbiAgICB2YXIgbGVuTWlzTWF0Y2hlZCA9IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aDtcbiAgICB2YXIgZmFjdG9yMiA9IE1hdGNoLmNhbGNSYW5raW5nUHJvZHVjdChtaXNtYXRjaGVkKTtcbiAgICBmYWN0b3IyICo9IE1hdGgucG93KDAuNCwgbGVuTWlzTWF0Y2hlZCk7XG4gICAgcmV0dXJuIE1hdGgucG93KGZhY3RvcjIgKiBmYWN0b3JIICogZmFjdG9yLCAxIC8gKGxlbk1pc01hdGNoZWQgKyBsZW5IYXNDYXRlZ29yeSArIGxlbk1hdGNoZWQpKTtcbn1cbmV4cG9ydHMuY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeSA9IGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnk7XG4vKipcbiAqIGxpc3QgYWxsIHRvcCBsZXZlbCByYW5raW5nc1xuICovXG4vKlxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVjb3Jkc0hhdmluZ0NvbnRleHQoXG4gIHBTZW50ZW5jZXM6IElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzLCBjYXRlZ29yeTogc3RyaW5nLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sXG4gIGNhdGVnb3J5U2V0OiB7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfSlcbiAgOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnMge1xuXG4gIC8vZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gIHZhciByZWxldmFudFJlY29yZHMgPSByZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAocmVjb3JkOiBJTWF0Y2guSVJlY29yZCkge1xuICAgIHJldHVybiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSAmJiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gbnVsbCk7XG4gIH0pO1xuICB2YXIgcmVzID0gW107XG4gIGRlYnVnbG9nKFwiTWF0Y2hSZWNvcmRzSGF2aW5nQ29udGV4dCA6IHJlbGV2YW50IHJlY29yZHMgbnI6XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoKTtcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcInNlbnRlbmNlcyBhcmUgOiBcIiArIEpTT04uc3RyaW5naWZ5KHBTZW50ZW5jZXMsIHVuZGVmaW5lZCwgMikpIDogXCItXCIpO1xuICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiY2F0ZWdvcnkgXCIgKyBjYXRlZ29yeSArIFwiIGFuZCBjYXRlZ29yeXNldCBpczogXCIgKyBKU09OLnN0cmluZ2lmeShjYXRlZ29yeVNldCwgdW5kZWZpbmVkLCAyKSkgOiBcIi1cIik7XG4gIGlmIChwcm9jZXNzLmVudi5BQk9UX0ZBU1QgJiYgY2F0ZWdvcnlTZXQpIHtcbiAgICAvLyB3ZSBhcmUgb25seSBpbnRlcmVzdGVkIGluIGNhdGVnb3JpZXMgcHJlc2VudCBpbiByZWNvcmRzIGZvciBkb21haW5zIHdoaWNoIGNvbnRhaW4gdGhlIGNhdGVnb3J5XG4gICAgLy8gdmFyIGNhdGVnb3J5c2V0ID0gTW9kZWwuY2FsY3VsYXRlUmVsZXZhbnRSZWNvcmRDYXRlZ29yaWVzKHRoZU1vZGVsLGNhdGVnb3J5KTtcbiAgICAvL2tub3dpbmcgdGhlIHRhcmdldFxuICAgIHBlcmZsb2coXCJnb3QgY2F0ZWdvcnlzZXQgd2l0aCBcIiArIE9iamVjdC5rZXlzKGNhdGVnb3J5U2V0KS5sZW5ndGgpO1xuICAgIHZhciBmbCA9IDA7XG4gICAgdmFyIGxmID0gMDtcbiAgICB2YXIgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBwU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgdmFyIGZXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICAgIH0pO1xuICAgICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiAhIWNhdGVnb3J5U2V0W29Xb3JkLmNhdGVnb3J5XSB8fCBXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCk7XG4gICAgICB9KTtcbiAgICAgIGZsID0gZmwgKyBvU2VudGVuY2UubGVuZ3RoO1xuICAgICAgbGYgPSBsZiArIHJXb3Jkcy5sZW5ndGg7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCwgLy8gbm90IGEgZmlsbGVyICAvLyB0byBiZSBjb21wYXRpYmxlIGl0IHdvdWxkIGJlIGZXb3Jkc1xuICAgICAgICByV29yZHM6IHJXb3Jkc1xuICAgICAgfTtcbiAgICB9KTtcbiAgICBPYmplY3QuZnJlZXplKGFTaW1wbGlmaWVkU2VudGVuY2VzKTtcbiAgICBkZWJ1Z2xvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgZmwgKyBcIi0+XCIgKyBsZiArIFwiKVwiKTtcbiAgICBwZXJmbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyBmbCArIFwiLT5cIiArIGxmICsgXCIpXCIpO1xuICAgIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgICB2YXIgaGFzQ2F0ZWdvcnkgPSB7fTtcbiAgICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSBhU2VudGVuY2UuY250UmVsZXZhbnRXb3JkcztcbiAgICAgICAgYVNlbnRlbmNlLnJXb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCkgJiYgcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICBoYXNDYXRlZ29yeVtvV29yZC5tYXRjaGVkU3RyaW5nXSA9IDE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIGlmICgoT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoICsgT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aCkgPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLm9TZW50ZW5jZSxcbiAgICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxuICAgICAgICAgICAgcmVzdWx0OiByZWNvcmRbY2F0ZWdvcnldLFxuICAgICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSk7XG4gICAgZGVidWdsb2coXCJoZXJlIGluIHdlaXJkXCIpO1xuICB9IGVsc2Uge1xuICAgIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgIHBTZW50ZW5jZXMuc2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgICB2YXIgaGFzQ2F0ZWdvcnkgPSB7fTtcbiAgICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSAwO1xuICAgICAgICBhU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICBpZiAoIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCkpIHtcbiAgICAgICAgICAgIGNudFJlbGV2YW50V29yZHMgPSBjbnRSZWxldmFudFdvcmRzICsgMTtcbiAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICAgIG1hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpICYmIHJlY29yZFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgICBoYXNDYXRlZ29yeVtvV29yZC5tYXRjaGVkU3RyaW5nXSA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKChPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoKSA+IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aCkge1xuICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2UsXG4gICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICAgIHJlc3VsdDogcmVjb3JkW2NhdGVnb3J5XSxcbiAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0pO1xuICB9XG4gIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmcpO1xuICBkZWJ1Z2xvZyhcIiBhZnRlciBzb3J0XCIgKyByZXMubGVuZ3RoKTtcbiAgdmFyIHJlc3VsdCA9IE9iamVjdC5hc3NpZ24oe30sIHBTZW50ZW5jZXMsIHsgYW5zd2VyczogcmVzIH0pO1xuICByZXR1cm4gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0KHJlc3VsdCk7XG59XG4qL1xuLyoqXG4gKiBsaXN0IGFsbCB0b3AgbGV2ZWwgcmFua2luZ3NcbiAqL1xuZnVuY3Rpb24gbWF0Y2hSZWNvcmRzVHVwZWxIYXZpbmdDb250ZXh0KHBTZW50ZW5jZXMsIGNhdGVnb3JpZXMsIHJlY29yZHMsIGNhdGVnb3J5U2V0KSB7XG4gICAgLy8gZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgdmFyIGNhdGVnb3J5RiA9IGNhdGVnb3JpZXNbMF07XG4gICAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnlGXSAhPT0gdW5kZWZpbmVkKSAmJiAocmVjb3JkW2NhdGVnb3J5Rl0gIT09IG51bGwpO1xuICAgIH0pO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBkZWJ1Z2xvZyhcInJlbGV2YW50IHJlY29yZHMgbnI6XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoKTtcbiAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwic2VudGVuY2VzIGFyZSA6IFwiICsgSlNPTi5zdHJpbmdpZnkocFNlbnRlbmNlcywgdW5kZWZpbmVkLCAyKSkgOiBcIi1cIik7XG4gICAgaWYgKHByb2Nlc3MuZW52LkFCT1RfRkFTVCAmJiBjYXRlZ29yeVNldCkge1xuICAgICAgICAvLyB3ZSBhcmUgb25seSBpbnRlcmVzdGVkIGluIGNhdGVnb3JpZXMgcHJlc2VudCBpbiByZWNvcmRzIGZvciBkb21haW5zIHdoaWNoIGNvbnRhaW4gdGhlIGNhdGVnb3J5XG4gICAgICAgIC8vIHZhciBjYXRlZ29yeXNldCA9IE1vZGVsLmNhbGN1bGF0ZVJlbGV2YW50UmVjb3JkQ2F0ZWdvcmllcyh0aGVNb2RlbCxjYXRlZ29yeSk7XG4gICAgICAgIC8va25vd2luZyB0aGUgdGFyZ2V0XG4gICAgICAgIHBlcmZsb2coXCJnb3QgY2F0ZWdvcnlzZXQgd2l0aCBcIiArIE9iamVjdC5rZXlzKGNhdGVnb3J5U2V0KS5sZW5ndGgpO1xuICAgICAgICB2YXIgZmwgPSAwO1xuICAgICAgICB2YXIgbGYgPSAwO1xuICAgICAgICB2YXIgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBwU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICAgICAgdmFyIGZXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gISFjYXRlZ29yeVNldFtvV29yZC5jYXRlZ29yeV0gfHwgV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBmbCA9IGZsICsgb1NlbnRlbmNlLmxlbmd0aDtcbiAgICAgICAgICAgIGxmID0gbGYgKyByV29yZHMubGVuZ3RoO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgICAgICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgIHJXb3JkczogcldvcmRzXG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICAgICAgT2JqZWN0LmZyZWV6ZShhU2ltcGxpZmllZFNlbnRlbmNlcyk7XG4gICAgICAgIHBlcmZsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIGZsICsgXCItPlwiICsgbGYgKyBcIilcIik7XG4gICAgICAgIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgICAgICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgICAgICAgICAgIHZhciBoYXNDYXRlZ29yeSA9IHt9O1xuICAgICAgICAgICAgICAgIHZhciBtaXNtYXRjaGVkID0ge307XG4gICAgICAgICAgICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgICAgICAgICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IGFTZW50ZW5jZS5jbnRSZWxldmFudFdvcmRzO1xuICAgICAgICAgICAgICAgIGFTZW50ZW5jZS5yV29yZHMuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICYmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKSAmJiByZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhc0NhdGVnb3J5W29Xb3JkLm1hdGNoZWRTdHJpbmddID0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmICgoT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoICsgT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aCkgPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VudGVuY2U6IGFTZW50ZW5jZS5vU2VudGVuY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3JpZXM6IGNhdGVnb3JpZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IGV4dHJhY3RSZXN1bHQoY2F0ZWdvcmllcywgcmVjb3JkKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICAgICAgICBwU2VudGVuY2VzLnNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgaGFzQ2F0ZWdvcnkgPSB7fTtcbiAgICAgICAgICAgICAgICB2YXIgbWlzbWF0Y2hlZCA9IHt9O1xuICAgICAgICAgICAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICAgICAgICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSAwO1xuICAgICAgICAgICAgICAgIGFTZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNudFJlbGV2YW50V29yZHMgPSBjbnRSZWxldmFudFdvcmRzICsgMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKSAmJiByZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNDYXRlZ29yeVtvV29yZC5tYXRjaGVkU3RyaW5nXSA9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAoKE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aCArIE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5sZW5ndGgpID4gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3JpZXM6IGNhdGVnb3JpZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IGV4dHJhY3RSZXN1bHQoY2F0ZWdvcmllcywgcmVjb3JkKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbCk7XG4gICAgdmFyIHJlc3VsdDEgPSBPYmplY3QuYXNzaWduKHsgdHVwZWxhbnN3ZXJzOiByZXMgfSwgcFNlbnRlbmNlcyk7XG4gICAgcmV0dXJuIGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdFR1cGVsKHJlc3VsdDEpO1xufVxuZXhwb3J0cy5tYXRjaFJlY29yZHNUdXBlbEhhdmluZ0NvbnRleHQgPSBtYXRjaFJlY29yZHNUdXBlbEhhdmluZ0NvbnRleHQ7XG4vKlxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVjb3JkcyhhU2VudGVuY2VzOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcywgY2F0ZWdvcnk6IHN0cmluZywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+KVxuICA6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzQW5zd2VycyB7XG4gIC8vIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gIC8vICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gIC8vIH1cbiAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQ6IElNYXRjaC5JUmVjb3JkKSB7XG4gICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnldICE9PSBudWxsKTtcbiAgfSk7XG4gIHZhciByZXMgPSBbXTtcbiAgZGVidWdsb2coXCJyZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCk7XG4gIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICBhU2VudGVuY2VzLnNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgIHZhciBtaXNtYXRjaGVkID0ge31cbiAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IDA7XG4gICAgICBhU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgaWYgKCFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpKSB7XG4gICAgICAgICAgY250UmVsZXZhbnRXb3JkcyA9IGNudFJlbGV2YW50V29yZHMgKyAxO1xuICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGlmIChPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2UsXG4gICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxuICAgICAgICAgIHJlc3VsdDogcmVjb3JkW2NhdGVnb3J5XSxcbiAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmcobWF0Y2hlZCwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSlcbiAgfSk7XG4gIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmcpO1xuICB2YXIgcmVzdWx0ID0gT2JqZWN0LmFzc2lnbih7fSwgYVNlbnRlbmNlcywgeyBhbnN3ZXJzOiByZXMgfSk7XG4gIHJldHVybiBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHQocmVzdWx0KTtcbn1cbiovXG5mdW5jdGlvbiBtYWtlU2ltcGxpZmllZFNlbnRlbmNlc0NhdGVnb3J5U2V0KGFTZW50ZW5jZXMsIGNhdGVnb3J5U2V0LCB0cmFjaykge1xuICAgIHJldHVybiBhU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICB2YXIgYURvbWFpbnMgPSBbXTtcbiAgICAgICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwiZG9tYWluXCIpIHtcbiAgICAgICAgICAgICAgICBhRG9tYWlucy5wdXNoKG9Xb3JkLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJtZXRhXCIpIHtcbiAgICAgICAgICAgICAgICAvLyBlLmcuIGRvbWFpbiBYWFhcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gISFjYXRlZ29yeVNldFtvV29yZC5jYXRlZ29yeV07XG4gICAgICAgIH0pO1xuICAgICAgICB0cmFjay5mbCArPSBvU2VudGVuY2UubGVuZ3RoO1xuICAgICAgICB0cmFjay5sZiArPSByV29yZHMubGVuZ3RoO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZG9tYWluczogYURvbWFpbnMsXG4gICAgICAgICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsXG4gICAgICAgICAgICByV29yZHM6IHJXb3Jkc1xuICAgICAgICB9O1xuICAgIH0pO1xufVxuZnVuY3Rpb24gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXMoYVNlbnRlbmNlcywgdHJhY2spIHtcbiAgICByZXR1cm4gYVNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgdmFyIGRvbWFpbnMgPSBbXTtcbiAgICAgICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwiZG9tYWluXCIpIHtcbiAgICAgICAgICAgICAgICBkb21haW5zLnB1c2gob1dvcmQubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcIm1ldGFcIikge1xuICAgICAgICAgICAgICAgIC8vIGUuZy4gZG9tYWluIFhYWFxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRyYWNrLmZsICs9IG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgICAgIHRyYWNrLmxmICs9IHJXb3Jkcy5sZW5ndGg7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgICAgIGRvbWFpbnM6IGRvbWFpbnMsXG4gICAgICAgICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLFxuICAgICAgICAgICAgcldvcmRzOiByV29yZHNcbiAgICAgICAgfTtcbiAgICB9KTtcbn1cbmZ1bmN0aW9uIGV4dHJhY3RSZXN1bHQoY2F0ZWdvcmllcywgcmVjb3JkKSB7XG4gICAgcmV0dXJuIGNhdGVnb3JpZXMubWFwKGZ1bmN0aW9uIChjYXRlZ29yeSkgeyByZXR1cm4gcmVjb3JkW2NhdGVnb3J5XSB8fCBcIm4vYVwiOyB9KTtcbn1cbmZ1bmN0aW9uIG1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzKHBTZW50ZW5jZXMsIGNhdGVnb3JpZXMsIHJlY29yZHMsIGNhdGVnb3J5U2V0KSB7XG4gICAgLy8gaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAvLyAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgLy8gfVxuICAgIE9iamVjdC5mcmVlemUoY2F0ZWdvcnlTZXQpO1xuICAgIHZhciBjYXRlZ29yeUYgPSBjYXRlZ29yaWVzWzBdO1xuICAgIGRlYnVnbG9nKFwibWF0Y2hSZWNvcmRzUXVpY2tNdWx0aXBsZUNhdGVnb3JpZXMgKHI9XCIgKyByZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIilcXG4gY2F0ZWdvcmllczpcIiArIGNhdGVnb3JpZXMuam9pbihcIlxcblwiKSk7XG4gICAgcGVyZmxvZyhcIm1hdGNoUmVjb3Jkc1F1aWNrTXVsdCAuLi4ocj1cIiArIHJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiKVwiKTtcbiAgICB2YXIgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICByZXR1cm4gKHJlY29yZFtjYXRlZ29yeUZdICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnlGXSAhPT0gbnVsbCk7XG4gICAgfSk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIGRlYnVnbG9nKFwicmVsZXZhbnQgcmVjb3JkcyB3aXRoIGZpcnN0IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiKVwiKTtcbiAgICBwZXJmbG9nKFwicmVsZXZhbnQgcmVjb3JkcyB3aXRoIGZpcnN0IG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHNlbnRlbmNlcyBcIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCk7XG4gICAgaWYgKHByb2Nlc3MuZW52LkFCT1RfRkFTVCAmJiBjYXRlZ29yeVNldCkge1xuICAgICAgICAvLyB3ZSBhcmUgb25seSBpbnRlcmVzdGVkIGluIGNhdGVnb3JpZXMgcHJlc2VudCBpbiByZWNvcmRzIGZvciBkb21haW5zIHdoaWNoIGNvbnRhaW4gdGhlIGNhdGVnb3J5XG4gICAgICAgIC8vIHZhciBjYXRlZ29yeXNldCA9IE1vZGVsLmNhbGN1bGF0ZVJlbGV2YW50UmVjb3JkQ2F0ZWdvcmllcyh0aGVNb2RlbCxjYXRlZ29yeSk7XG4gICAgICAgIC8va25vd2luZyB0aGUgdGFyZ2V0XG4gICAgICAgIHBlcmZsb2coXCJnb3QgY2F0ZWdvcnlzZXQgd2l0aCBcIiArIE9iamVjdC5rZXlzKGNhdGVnb3J5U2V0KS5sZW5ndGgpO1xuICAgICAgICB2YXIgb2JqID0geyBmbDogMCwgbGY6IDAgfTtcbiAgICAgICAgdmFyIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXNDYXRlZ29yeVNldChwU2VudGVuY2VzLCBjYXRlZ29yeVNldCwgb2JqKTtcbiAgICAgICAgcGVyZmxvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgb2JqLmZsICsgXCItPlwiICsgb2JqLmxmICsgXCIpXCIpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgZGVidWdsb2coXCJub3QgYWJvdF9mYXN0ICFcIik7XG4gICAgICAgIHZhciB0cmFjayA9IHsgZmw6IDAsIGxmOiAwIH07XG4gICAgICAgIHZhciBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzKHBTZW50ZW5jZXMsIHRyYWNrKTtcbiAgICAgICAgLypcbiAgICAgICAgICAgIHBTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIGZsID0gZmwgKyBvU2VudGVuY2UubGVuZ3RoO1xuICAgICAgICAgICAgICBsZiA9IGxmICsgcldvcmRzLmxlbmd0aDtcbiAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgICAgICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgIHJXb3JkczogcldvcmRzXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICovXG4gICAgICAgIGRlYnVnbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyB0cmFjay5mbCArIFwiLT5cIiArIHRyYWNrLmxmICsgXCIpXCIpO1xuICAgICAgICBwZXJmbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyB0cmFjay5mbCArIFwiLT5cIiArIHRyYWNrLmxmICsgXCIpXCIpO1xuICAgIH1cbiAgICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgICAgICAgdmFyIG1pc21hdGNoZWQgPSAwO1xuICAgICAgICAgICAgdmFyIG1hdGNoZWQgPSAwO1xuICAgICAgICAgICAgdmFyIG5vdXNlID0gMDtcbiAgICAgICAgICAgIHZhciBtaXNzaW5nY2F0ID0gMDtcbiAgICAgICAgICAgIGFTZW50ZW5jZS5yV29yZHMuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICArK21hdGNoZWQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICArK21pc21hdGNoZWQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAhPT0gXCJjYXRlZ29yeVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub3VzZSArPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaXNzaW5nY2F0ICs9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChhU2VudGVuY2UuZG9tYWlucy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVjb3JkLl9kb21haW4gIT09IGFTZW50ZW5jZS5kb21haW5zWzBdKSB7XG4gICAgICAgICAgICAgICAgICAgIG1pc21hdGNoZWQgPSAzMDAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZCArPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGlmKG1hdGNoZWQgPiAwIHx8IG1pc21hdGNoZWQgPiAwICkge1xuICAgICAgICAgICAgLy8gICBjb25zb2xlLmxvZyhcIiBtXCIgKyBtYXRjaGVkICsgXCIgbWlzbWF0Y2hlZFwiICsgbWlzbWF0Y2hlZCk7XG4gICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGFTZW50ZW5jZS5vU2VudGVuY2UpKTtcbiAgICAgICAgICAgIGlmIChtYXRjaGVkID4gbWlzbWF0Y2hlZCkge1xuICAgICAgICAgICAgICAgIHZhciByZWMgPSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2Uub1NlbnRlbmNlLFxuICAgICAgICAgICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcmllczogY2F0ZWdvcmllcyxcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiBleHRyYWN0UmVzdWx0KGNhdGVnb3JpZXMsIHJlY29yZCksXG4gICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ1NpbXBsZShtYXRjaGVkLCBtaXNtYXRjaGVkLCAobm91c2UgKyBtaXNzaW5nY2F0KSwgYVNlbnRlbmNlLmNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAvKiAgIGlmKHJlY29yZFtcImFwcElkXCJdID09PVwiRjE1NjZcIikge1xuICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJoZXJlIEYxNTY2XCIgKyBKU09OLnN0cmluZ2lmeShyZWMpKTtcbiAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaGVyZSBtYXRjaGVkXCIgKyBtYXRjaGVkICsgXCIgbWlzbWF0Y2hlZFwiICsgbWlzbWF0Y2hlZCArIFwiIG5vdXNlIFwiICsgKG5vdXNlICsgbWlzc2luZ2NhdCkpO1xuICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJoZXJlIGNudFJlbGV2YW50IDpcIiArIGFTZW50ZW5jZS5jbnRSZWxldmFudFdvcmRzKTtcbiAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgaWYocmVjb3JkW1wiYXBwSWRcIl0gPT09XCJGMDczMUFcIikge1xuICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJoZXJlIEYwNzMxQVwiICsgSlNPTi5zdHJpbmdpZnkocmVjKSk7XG4gICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImhlcmUgbWF0Y2hlZFwiICsgbWF0Y2hlZCArIFwiIG1pc21hdGNoZWRcIiArIG1pc21hdGNoZWQgKyBcIiBub3VzZSBcIiArIChub3VzZSArIG1pc3NpbmdjYXQpKTtcbiAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiaGVyZSBjbnRSZWxldmFudCA6XCIgKyBhU2VudGVuY2UuY250UmVsZXZhbnRXb3Jkcyk7XG4gICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgcmVzLnB1c2gocmVjKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcGVyZmxvZyhcInNvcnQgKGE9XCIgKyByZXMubGVuZ3RoICsgXCIpXCIpO1xuICAgIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbCk7XG4gICAgcGVyZmxvZyhcImZpbHRlclJldGFpbiAuLi5cIik7XG4gICAgdmFyIHJlc3VsdDEgPSBPYmplY3QuYXNzaWduKHsgdHVwZWxhbnN3ZXJzOiByZXMgfSwgcFNlbnRlbmNlcyk7XG4gICAgdmFyIHJlc3VsdDIgPSBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHRUdXBlbChyZXN1bHQxKTtcbiAgICBwZXJmbG9nKFwibWF0Y2hSZWNvcmRzUXVpY2sgZG9uZTogKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGE9XCIgKyByZXMubGVuZ3RoICsgXCIpXCIpO1xuICAgIHJldHVybiByZXN1bHQyO1xufVxuZXhwb3J0cy5tYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcyA9IG1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzO1xuZnVuY3Rpb24gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KHdvcmQsIHRhcmdldGNhdGVnb3J5LCBydWxlcywgd2hvbGVzZW50ZW5jZSkge1xuICAgIC8vY29uc29sZS5sb2coXCJjbGFzc2lmeSBcIiArIHdvcmQgKyBcIiBcIiAgKyB0YXJnZXRjYXRlZ29yeSk7XG4gICAgdmFyIGNhdHMgPSBJbnB1dEZpbHRlci5jYXRlZ29yaXplQVdvcmQod29yZCwgcnVsZXMsIHdob2xlc2VudGVuY2UsIHt9KTtcbiAgICAvLyBUT0RPIHF1YWxpZnlcbiAgICBjYXRzID0gY2F0cy5maWx0ZXIoZnVuY3Rpb24gKGNhdCkge1xuICAgICAgICByZXR1cm4gY2F0LmNhdGVnb3J5ID09PSB0YXJnZXRjYXRlZ29yeTtcbiAgICB9KTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShjYXRzKSk7XG4gICAgaWYgKGNhdHMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBjYXRzWzBdLm1hdGNoZWRTdHJpbmc7XG4gICAgfVxufVxuZnVuY3Rpb24gYW5hbHl6ZUNhdGVnb3J5KGNhdGVnb3J5d29yZCwgcnVsZXMsIHdob2xlc2VudGVuY2UpIHtcbiAgICByZXR1cm4gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KGNhdGVnb3J5d29yZCwgJ2NhdGVnb3J5JywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xufVxuZXhwb3J0cy5hbmFseXplQ2F0ZWdvcnkgPSBhbmFseXplQ2F0ZWdvcnk7XG5mdW5jdGlvbiBzcGxpdEF0Q29tbWFBbmQoc3RyKSB7XG4gICAgdmFyIHIgPSBzdHIuc3BsaXQoLyhcXGJhbmRcXGIpfFssXS8pO1xuICAgIHIgPSByLmZpbHRlcihmdW5jdGlvbiAobywgaW5kZXgpIHtcbiAgICAgICAgaWYgKGluZGV4ICUgMiA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICB2YXIgcnRyaW1tZWQgPSByLm1hcChmdW5jdGlvbiAobykge1xuICAgICAgICByZXR1cm4gbmV3IFN0cmluZyhvKS50cmltKCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJ0cmltbWVkO1xufVxuZXhwb3J0cy5zcGxpdEF0Q29tbWFBbmQgPSBzcGxpdEF0Q29tbWFBbmQ7XG4vKipcbiAqIEEgc2ltcGxlIGltcGxlbWVudGF0aW9uLCBzcGxpdHRpbmcgYXQgYW5kIGFuZCAsXG4gKi9cbmZ1bmN0aW9uIGFuYWx5emVDYXRlZ29yeU11bHRPbmx5QW5kQ29tbWEoY2F0ZWdvcnlsaXN0LCBydWxlcywgd2hvbGVzZW50ZW5jZSkge1xuICAgIHZhciBydHJpbW1lZCA9IHNwbGl0QXRDb21tYUFuZChjYXRlZ29yeWxpc3QpO1xuICAgIHZhciByY2F0ID0gcnRyaW1tZWQubWFwKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgIHJldHVybiBhbmFseXplQ2F0ZWdvcnkobywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xuICAgIH0pO1xuICAgIGlmIChyY2F0LmluZGV4T2YodW5kZWZpbmVkKSA+PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignXCInICsgcnRyaW1tZWRbcmNhdC5pbmRleE9mKHVuZGVmaW5lZCldICsgJ1wiIGlzIG5vdCBhIGNhdGVnb3J5IScpO1xuICAgIH1cbiAgICByZXR1cm4gcmNhdDtcbn1cbmV4cG9ydHMuYW5hbHl6ZUNhdGVnb3J5TXVsdE9ubHlBbmRDb21tYSA9IGFuYWx5emVDYXRlZ29yeU11bHRPbmx5QW5kQ29tbWE7XG5mdW5jdGlvbiBmaWx0ZXJBY2NlcHRpbmdPbmx5KHJlcywgY2F0ZWdvcmllcykge1xuICAgIHJldHVybiByZXMuZmlsdGVyKGZ1bmN0aW9uIChhU2VudGVuY2UsIGlJbmRleCkge1xuICAgICAgICByZXR1cm4gYVNlbnRlbmNlLmV2ZXJ5KGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhdGVnb3JpZXMuaW5kZXhPZihvV29yZC5jYXRlZ29yeSkgPj0gMDtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5leHBvcnRzLmZpbHRlckFjY2VwdGluZ09ubHkgPSBmaWx0ZXJBY2NlcHRpbmdPbmx5O1xudmFyIEVyYmFzZSA9IHJlcXVpcmUoXCIuL2VyYmFzZVwiKTtcbnZhciBzV29yZHMgPSB7fTtcbmZ1bmN0aW9uIHJlc2V0Q2FjaGUoKSB7XG4gICAgc1dvcmRzID0ge307XG59XG5leHBvcnRzLnJlc2V0Q2FjaGUgPSByZXNldENhY2hlO1xuZnVuY3Rpb24gcHJvY2Vzc1N0cmluZyhxdWVyeSwgcnVsZXMpIHtcbiAgICBpZiAoIXByb2Nlc3MuZW52LkFCT1RfT0xETUFUQ0gpIHtcbiAgICAgICAgcmV0dXJuIEVyYmFzZS5wcm9jZXNzU3RyaW5nKHF1ZXJ5LCBydWxlcywgcnVsZXMud29yZENhY2hlKTtcbiAgICB9XG4gICAgLypcbiAgICAgIHZhciBtYXRjaGVkID0gSW5wdXRGaWx0ZXIuYW5hbHl6ZVN0cmluZyhxdWVyeSwgcnVsZXMsIHNXb3Jkcyk7XG4gICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcIkFmdGVyIG1hdGNoZWQgXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkKSk7XG4gICAgICB9XG4gICAgICB2YXIgYVNlbnRlbmNlcyA9IElucHV0RmlsdGVyLmV4cGFuZE1hdGNoQXJyKG1hdGNoZWQpO1xuICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCJhZnRlciBleHBhbmRcIiArIGFTZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICAgICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgICB9XG4gICAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBJbnB1dEZpbHRlci5yZWluRm9yY2UoYVNlbnRlbmNlcyk7XG4gICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcImFmdGVyIHJlaW5mb3JjZVwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICAgICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICBlcnJvcnM6IFtdLFxuICAgICAgICBzZW50ZW5jZXM6IGFTZW50ZW5jZXNSZWluZm9yY2VkXG4gICAgICB9IGFzIElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzO1xuICAgICovXG59XG5leHBvcnRzLnByb2Nlc3NTdHJpbmcgPSBwcm9jZXNzU3RyaW5nO1xuZnVuY3Rpb24gYW5hbHl6ZUNvbnRleHRTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcykge1xuICAgIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IHByb2Nlc3NTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcyk7XG4gICAgLy8gd2UgbGltaXQgYW5hbHlzaXMgdG8gbiBzZW50ZW5jZXNcbiAgICBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMgPSBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMuc2xpY2UoMCwgQWxnb2wuQ3V0b2ZmX1NlbnRlbmNlcyk7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCJhZnRlciByZWluZm9yY2UgYW5kIGN1dG9mZlwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLmxlbmd0aCArIFwiXFxuXCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgICAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgICB9XG4gICAgcmV0dXJuIGFTZW50ZW5jZXNSZWluZm9yY2VkO1xufVxuZXhwb3J0cy5hbmFseXplQ29udGV4dFN0cmluZyA9IGFuYWx5emVDb250ZXh0U3RyaW5nO1xuZnVuY3Rpb24gY21wQnlOckNhdGVnb3JpZXNBbmRTYW1lRG9tYWluKGEsIGIpIHtcbiAgICAvL2NvbnNvbGUubG9nKFwiY29tcGFyZSBhXCIgKyBhICsgXCIgY250YiBcIiArIGIpO1xuICAgIHZhciBjbnRhID0gU2VudGVuY2UuZ2V0RGlzdGluY3RDYXRlZ29yaWVzSW5TZW50ZW5jZShhKS5sZW5ndGg7XG4gICAgdmFyIGNudGIgPSBTZW50ZW5jZS5nZXREaXN0aW5jdENhdGVnb3JpZXNJblNlbnRlbmNlKGIpLmxlbmd0aDtcbiAgICAvKlxuICAgICAgdmFyIGNudGEgPSBhLnJlZHVjZShmdW5jdGlvbihwcmV2LCBvV29yZCkge1xuICAgICAgICByZXR1cm4gcHJldiArICgob1dvcmQuY2F0ZWdvcnkgPT09IFwiY2F0ZWdvcnlcIik/IDEgOiAwKTtcbiAgICAgIH0sMCk7XG4gICAgICB2YXIgY250YiA9IGIucmVkdWNlKGZ1bmN0aW9uKHByZXYsIG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiBwcmV2ICsgKChvV29yZC5jYXRlZ29yeSA9PT0gXCJjYXRlZ29yeVwiKT8gMSA6IDApO1xuICAgICAgfSwwKTtcbiAgICAgLy8gY29uc29sZS5sb2coXCJjbnQgYVwiICsgY250YSArIFwiIGNudGIgXCIgKyBjbnRiKTtcbiAgICAgKi9cbiAgICByZXR1cm4gY250YiAtIGNudGE7XG59XG5leHBvcnRzLmNtcEJ5TnJDYXRlZ29yaWVzQW5kU2FtZURvbWFpbiA9IGNtcEJ5TnJDYXRlZ29yaWVzQW5kU2FtZURvbWFpbjtcbmZ1bmN0aW9uIGFuYWx5emVDYXRlZ29yeU11bHQoY2F0ZWdvcnlsaXN0LCBydWxlcywgd2hvbGVzZW50ZW5jZSwgZ1dvcmRzKSB7XG4gICAgdmFyIHJlcyA9IGFuYWx5emVDb250ZXh0U3RyaW5nKGNhdGVnb3J5bGlzdCwgcnVsZXMpO1xuICAgIC8vICBkZWJ1Z2xvZyhcInJlc3VsdGluZyBjYXRlZ29yeSBzZW50ZW5jZXNcIiwgSlNPTi5zdHJpbmdpZnkocmVzKSk7XG4gICAgdmFyIHJlczIgPSBmaWx0ZXJBY2NlcHRpbmdPbmx5KHJlcy5zZW50ZW5jZXMsIFtcImNhdGVnb3J5XCIsIFwiZmlsbGVyXCJdKTtcbiAgICAvLyAgY29uc29sZS5sb2coXCJoZXJlIHJlczJcIiArIEpTT04uc3RyaW5naWZ5KHJlczIpICk7XG4gICAgLy8gIGNvbnNvbGUubG9nKFwiaGVyZSB1bmRlZmluZWQgISArIFwiICsgcmVzMi5maWx0ZXIobyA9PiAhbykubGVuZ3RoKTtcbiAgICByZXMyLnNvcnQoU2VudGVuY2UuY21wUmFua2luZ1Byb2R1Y3QpO1xuICAgIGRlYnVnbG9nKFwicmVzdWx0aW5nIGNhdGVnb3J5IHNlbnRlbmNlczogXFxuXCIsIGRlYnVnbG9nLmVuYWJsZWQgPyAoU2VudGVuY2UuZHVtcE5pY2VBcnIocmVzMi5zbGljZSgwLCAzKSwgU2VudGVuY2UucmFua2luZ1Byb2R1Y3QpKSA6ICctJyk7XG4gICAgLy8gVE9ETzogICByZXMyID0gZmlsdGVyQWNjZXB0aW5nT25seVNhbWVEb21haW4ocmVzMik7XG4gICAgLy9kZWJ1Z2xvZyhcInJlc3VsdGluZyBjYXRlZ29yeSBzZW50ZW5jZXNcIiwgSlNPTi5zdHJpbmdpZnkocmVzMiwgdW5kZWZpbmVkLCAyKSk7XG4gICAgLy8gZXhwZWN0IG9ubHkgY2F0ZWdvcmllc1xuICAgIC8vIHdlIGNvdWxkIHJhbmsgbm93IGJ5IGNvbW1vbiBkb21haW5zICwgYnV0IGZvciBub3cgd2Ugb25seSB0YWtlIHRoZSBmaXJzdCBvbmVcbiAgICBpZiAoIXJlczIubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIC8vcmVzLnNvcnQoY21wQnlOckNhdGVnb3JpZXNBbmRTYW1lRG9tYWluKTtcbiAgICB2YXIgcmVzY2F0ID0gU2VudGVuY2UuZ2V0RGlzdGluY3RDYXRlZ29yaWVzSW5TZW50ZW5jZShyZXMyWzBdKTtcbiAgICByZXR1cm4gcmVzY2F0O1xuICAgIC8vIFwiXCIgcmV0dXJuIHJlc1swXS5maWx0ZXIoKVxuICAgIC8vIHJldHVybiBjbGFzc2lmeVdvcmRXaXRoVGFyZ2V0Q2F0ZWdvcnkoY2F0ZWdvcnlsaXN0LCAnY2F0ZWdvcnknLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG59XG5leHBvcnRzLmFuYWx5emVDYXRlZ29yeU11bHQgPSBhbmFseXplQ2F0ZWdvcnlNdWx0O1xuZnVuY3Rpb24gYW5hbHl6ZU9wZXJhdG9yKG9wd29yZCwgcnVsZXMsIHdob2xlc2VudGVuY2UpIHtcbiAgICByZXR1cm4gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KG9wd29yZCwgJ29wZXJhdG9yJywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xufVxuZXhwb3J0cy5hbmFseXplT3BlcmF0b3IgPSBhbmFseXplT3BlcmF0b3I7XG52YXIgRXJFcnJvciA9IHJlcXVpcmUoXCIuL2VyZXJyb3JcIik7XG52YXIgTGlzdEFsbCA9IHJlcXVpcmUoXCIuL2xpc3RhbGxcIik7XG4vLyBjb25zdCByZXN1bHQgPSBXaGF0SXMucmVzb2x2ZUNhdGVnb3J5KGNhdCwgYTEuZW50aXR5LFxuLy8gICB0aGVNb2RlbC5tUnVsZXMsIHRoZU1vZGVsLnRvb2xzLCB0aGVNb2RlbC5yZWNvcmRzKTtcbmZ1bmN0aW9uIHJlc29sdmVDYXRlZ29yeShjYXRlZ29yeSwgY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcywgcmVjb3Jkcykge1xuICAgIGlmIChjb250ZXh0UXVlcnlTdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB7IGVycm9yczogW0VyRXJyb3IubWFrZUVycm9yX0VNUFRZX0lOUFVUKCldLCB0b2tlbnM6IFtdLCBhbnN3ZXJzOiBbXSB9O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgLypcbiAgICAgICAgICAgIHZhciBtYXRjaGVkID0gSW5wdXRGaWx0ZXIuYW5hbHl6ZVN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKTtcbiAgICAgICAgICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJhZnRlciBtYXRjaGVkIFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZCkpOiAnLScpO1xuICAgICAgICAgICAgdmFyIGFTZW50ZW5jZXMgPSBJbnB1dEZpbHRlci5leHBhbmRNYXRjaEFycihtYXRjaGVkKTtcbiAgICAgICAgICAgIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgZGVidWdsb2coXCJhZnRlciBleHBhbmRcIiArIGFTZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICAgICAgICAgICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgICAgICAgfSAqL1xuICAgICAgICAvLyB2YXIgY2F0ZWdvcnlTZXQgPSBNb2RlbC5nZXRBbGxSZWNvcmRDYXRlZ29yaWVzRm9yVGFyZ2V0Q2F0ZWdvcnkodGhlTW9kZWwsIGNhdCwgdHJ1ZSk7XG4gICAgICAgIHZhciByZXMgPSBMaXN0QWxsLmxpc3RBbGxXaXRoQ29udGV4dChjYXRlZ29yeSwgY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcywgcmVjb3Jkcyk7XG4gICAgICAgIC8vKiBzb3J0IGJ5IHNlbnRlbmNlXG4gICAgICAgIHJlcy5hbnN3ZXJzLmZvckVhY2goZnVuY3Rpb24gKG8pIHsgby5fcmFua2luZyA9IG8uX3JhbmtpbmcgKiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvLnNlbnRlbmNlKTsgfSk7XG4gICAgICAgIHJlcy5hbnN3ZXJzLnNvcnQoY21wQnlSYW5raW5nKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG59XG5leHBvcnRzLnJlc29sdmVDYXRlZ29yeSA9IHJlc29sdmVDYXRlZ29yeTtcbmZ1bmN0aW9uIHJlc29sdmVDYXRlZ29yaWVzKGNhdGVnb3JpZXMsIGNvbnRleHRRdWVyeVN0cmluZywgdGhlTW9kZWwpIHtcbiAgICB2YXIgcmVjb3JkcyA9IHRoZU1vZGVsLnJlY29yZHM7XG4gICAgdmFyIHJ1bGVzID0gdGhlTW9kZWwucnVsZXM7XG4gICAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGVycm9yczogW0VyRXJyb3IubWFrZUVycm9yX0VNUFRZX0lOUFVUKCldLFxuICAgICAgICAgICAgdHVwZWxhbnN3ZXJzOiBbXSxcbiAgICAgICAgICAgIHRva2VuczogW11cbiAgICAgICAgfTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIC8vIHZhciBjYXRlZ29yeVNldCA9IE1vZGVsLmdldEFsbFJlY29yZENhdGVnb3JpZXNGb3JUYXJnZXRDYXRlZ29yeSh0aGVNb2RlbCwgY2F0LCB0cnVlKTtcbiAgICAgICAgdmFyIHJlcyA9IExpc3RBbGwubGlzdEFsbFR1cGVsV2l0aENvbnRleHQoY2F0ZWdvcmllcywgY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcywgcmVjb3Jkcyk7XG4gICAgICAgIC8vKiBzb3J0IGJ5IHNlbnRlbmNlXG4gICAgICAgIHJlcy50dXBlbGFuc3dlcnMuZm9yRWFjaChmdW5jdGlvbiAobykgeyBvLl9yYW5raW5nID0gby5fcmFua2luZyAqIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG8uc2VudGVuY2UpOyB9KTtcbiAgICAgICAgcmVzLnR1cGVsYW5zd2Vycy5zb3J0KGNtcEJ5UmFua2luZ1R1cGVsKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG59XG5leHBvcnRzLnJlc29sdmVDYXRlZ29yaWVzID0gcmVzb2x2ZUNhdGVnb3JpZXM7XG4vKlxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVDYXRlZ29yaWVzT2xkKGNhdGVnb3JpZXM6IHN0cmluZ1tdLCBjb250ZXh0UXVlcnlTdHJpbmc6IHN0cmluZyxcbiAgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzKTogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNUdXBlbEFuc3dlcnMge1xuICB2YXIgcmVjb3JkcyA9IHRoZU1vZGVsLnJlY29yZHM7XG4gIHZhciBydWxlcyA9IHRoZU1vZGVsLnJ1bGVzO1xuICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcnM6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSxcbiAgICAgIHR1cGVsYW5zd2VyczogW10sXG4gICAgICB0b2tlbnM6IFtdXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IHByb2Nlc3NTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCB0aGVNb2RlbC5ydWxlcyk7XG4gICAgLy9hU2VudGVuY2VzLm1hcChmdW5jdGlvbihvU2VudGVuY2UpIHsgcmV0dXJuIElucHV0RmlsdGVyLnJlaW5Gb3JjZShvU2VudGVuY2UpOyB9KTtcbiAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiYWZ0ZXIgcmVpbmZvcmNlXCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgIH0pLmpvaW4oXCJcXG5cIikpIDogJy0nKTtcbiAgICAvL3ZhciBtYXRjaGVkQW5zd2VycyA9IG1hdGNoUmVjb3Jkc1F1aWNrKGFTZW50ZW5jZXMsIGNhdGVnb3J5LCByZWNvcmRzKTsgLy9hVG9vbDogQXJyYXk8SU1hdGNoLklUb29sPik6IGFueSAvICogb2JqZWN0c3RyZWFtKiAvIHtcbiAgICB2YXIgY2F0ZWdvcnlTZXQgPSB7fTtcbiAgICBjYXRlZ29yaWVzLmZvckVhY2goZnVuY3Rpb24gKGNhdGVnb3J5KSB7XG4gICAgICBjYXRlZ29yeVNldFtjYXRlZ29yeV0gPSB0cnVlO1xuICAgICAgdmFyIGNhdGVnb3J5U2V0TG9jYWwgPSBNb2RlbC5nZXRBbGxSZWNvcmRDYXRlZ29yaWVzRm9yVGFyZ2V0Q2F0ZWdvcnkodGhlTW9kZWwsIGNhdGVnb3J5LCB0cnVlKTtcbiAgICAgIE9iamVjdC5hc3NpZ24oY2F0ZWdvcnlTZXQsIGNhdGVnb3J5U2V0TG9jYWwpO1xuICAgIH0pO1xuXG4gICAgdmFyIG1hdGNoZWRBbnN3ZXJzID0gbWF0Y2hSZWNvcmRzUXVpY2tNdWx0aXBsZUNhdGVnb3JpZXMoYVNlbnRlbmNlc1JlaW5mb3JjZWQsIGNhdGVnb3JpZXMsIHJlY29yZHMsIGNhdGVnb3J5U2V0KTsgLy9hVG9vbDogQXJyYXk8SU1hdGNoLklUb29sPik6IGFueSAvICogb2JqZWN0c3RyZWFtICogLyB7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgIGRlYnVnbG9nKFwiIG1hdGNoZWQgQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMsIHVuZGVmaW5lZCwgMikpO1xuICAgIH1cbiAgICBwZXJmbG9nKFwiZmlsdGVyaW5nIHRvcFJhbmtlZCAoYT1cIiArIG1hdGNoZWRBbnN3ZXJzLnR1cGVsYW5zd2Vycy5sZW5ndGggKyBcIikuLi5cIik7XG4gICAgdmFyIG1hdGNoZWRGaWx0ZXJlZCA9IE9iamVjdC5hc3NpZ24oe30sIG1hdGNoZWRBbnN3ZXJzKTtcbiAgICBtYXRjaGVkRmlsdGVyZWQudHVwZWxhbnN3ZXJzID0gZmlsdGVyT25seVRvcFJhbmtlZFR1cGVsKG1hdGNoZWRBbnN3ZXJzLnR1cGVsYW5zd2Vycyk7XG5cbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgZGVidWdsb2coXCIgbWF0Y2hlZCB0b3AtcmFua2VkIEFuc3dlcnNcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRGaWx0ZXJlZCwgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHBlcmZsb2coXCJ0b3RhbFdoYXRpc1dpdGhDb250ZXh0IChhPVwiICsgbWF0Y2hlZEZpbHRlcmVkLnR1cGVsYW5zd2Vycy5sZW5ndGggKyBcIilcIik7XG4gICAgcmV0dXJuIG1hdGNoZWRGaWx0ZXJlZDsgLy8gPz8/IEFuc3dlcnM7XG4gIH1cbn1cbiovXG5mdW5jdGlvbiBmaWx0ZXJPbmx5VG9wUmFua2VkKHJlc3VsdHMpIHtcbiAgICB2YXIgcmVzID0gcmVzdWx0cy5maWx0ZXIoZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICBpZiAocmVzdWx0Ll9yYW5raW5nID09PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0Ll9yYW5raW5nID49IHJlc3VsdHNbMF0uX3JhbmtpbmcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkxpc3QgdG8gZmlsdGVyIG11c3QgYmUgb3JkZXJlZFwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZmlsdGVyT25seVRvcFJhbmtlZCA9IGZpbHRlck9ubHlUb3BSYW5rZWQ7XG5mdW5jdGlvbiBmaWx0ZXJPbmx5VG9wUmFua2VkVHVwZWwocmVzdWx0cykge1xuICAgIHZhciByZXMgPSByZXN1bHRzLmZpbHRlcihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgIGlmIChyZXN1bHQuX3JhbmtpbmcgPT09IHJlc3VsdHNbMF0uX3JhbmtpbmcpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQuX3JhbmtpbmcgPj0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTGlzdCB0byBmaWx0ZXIgbXVzdCBiZSBvcmRlcmVkXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5maWx0ZXJPbmx5VG9wUmFua2VkVHVwZWwgPSBmaWx0ZXJPbmx5VG9wUmFua2VkVHVwZWw7XG5mdW5jdGlvbiBpc0luZGlzY3JpbWluYXRlUmVzdWx0KHJlc3VsdHMpIHtcbiAgICB2YXIgY250ID0gcmVzdWx0cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHJlc3VsdCkge1xuICAgICAgICBpZiAocmVzdWx0Ll9yYW5raW5nID09PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICB9LCAwKTtcbiAgICBpZiAoY250ID4gMSkge1xuICAgICAgICAvLyBzZWFyY2ggZm9yIGEgZGlzY3JpbWluYXRpbmcgY2F0ZWdvcnkgdmFsdWVcbiAgICAgICAgdmFyIGRpc2NyaW1pbmF0aW5nID0gT2JqZWN0LmtleXMocmVzdWx0c1swXS5yZWNvcmQpLnJlZHVjZShmdW5jdGlvbiAocHJldiwgY2F0ZWdvcnkpIHtcbiAgICAgICAgICAgIGlmICgoY2F0ZWdvcnkuY2hhckF0KDApICE9PSAnXycgJiYgY2F0ZWdvcnkgIT09IHJlc3VsdHNbMF0uY2F0ZWdvcnkpXG4gICAgICAgICAgICAgICAgJiYgKHJlc3VsdHNbMF0ucmVjb3JkW2NhdGVnb3J5XSAhPT0gcmVzdWx0c1sxXS5yZWNvcmRbY2F0ZWdvcnldKSkge1xuICAgICAgICAgICAgICAgIHByZXYucHVzaChjYXRlZ29yeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcHJldjtcbiAgICAgICAgfSwgW10pO1xuICAgICAgICBpZiAoZGlzY3JpbWluYXRpbmcubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJNYW55IGNvbXBhcmFibGUgcmVzdWx0cywgcGVyaGFwcyB5b3Ugd2FudCB0byBzcGVjaWZ5IGEgZGlzY3JpbWluYXRpbmcgXCIgKyBkaXNjcmltaW5hdGluZy5qb2luKCcsJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICdZb3VyIHF1ZXN0aW9uIGRvZXMgbm90IGhhdmUgYSBzcGVjaWZpYyBhbnN3ZXInO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xufVxuZXhwb3J0cy5pc0luZGlzY3JpbWluYXRlUmVzdWx0ID0gaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdDtcbmZ1bmN0aW9uIGlzSW5kaXNjcmltaW5hdGVSZXN1bHRUdXBlbChyZXN1bHRzKSB7XG4gICAgdmFyIGNudCA9IHJlc3VsdHMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCByZXN1bHQpIHtcbiAgICAgICAgaWYgKHJlc3VsdC5fcmFua2luZyA9PT0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgICAgICAgcmV0dXJuIHByZXYgKyAxO1xuICAgICAgICB9XG4gICAgfSwgMCk7XG4gICAgaWYgKGNudCA+IDEpIHtcbiAgICAgICAgLy8gc2VhcmNoIGZvciBhIGRpc2NyaW1pbmF0aW5nIGNhdGVnb3J5IHZhbHVlXG4gICAgICAgIHZhciBkaXNjcmltaW5hdGluZyA9IE9iamVjdC5rZXlzKHJlc3VsdHNbMF0ucmVjb3JkKS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGNhdGVnb3J5KSB7XG4gICAgICAgICAgICBpZiAoKGNhdGVnb3J5LmNoYXJBdCgwKSAhPT0gJ18nICYmIHJlc3VsdHNbMF0uY2F0ZWdvcmllcy5pbmRleE9mKGNhdGVnb3J5KSA8IDApXG4gICAgICAgICAgICAgICAgJiYgKHJlc3VsdHNbMF0ucmVjb3JkW2NhdGVnb3J5XSAhPT0gcmVzdWx0c1sxXS5yZWNvcmRbY2F0ZWdvcnldKSkge1xuICAgICAgICAgICAgICAgIHByZXYucHVzaChjYXRlZ29yeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcHJldjtcbiAgICAgICAgfSwgW10pO1xuICAgICAgICBpZiAoZGlzY3JpbWluYXRpbmcubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJNYW55IGNvbXBhcmFibGUgcmVzdWx0cywgcGVyaGFwcyB5b3Ugd2FudCB0byBzcGVjaWZ5IGEgZGlzY3JpbWluYXRpbmcgXCIgKyBkaXNjcmltaW5hdGluZy5qb2luKCcsJykgKyAnIG9yIHVzZSBcImxpc3QgYWxsIC4uLlwiJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJ1lvdXIgcXVlc3Rpb24gZG9lcyBub3QgaGF2ZSBhIHNwZWNpZmljIGFuc3dlcic7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5leHBvcnRzLmlzSW5kaXNjcmltaW5hdGVSZXN1bHRUdXBlbCA9IGlzSW5kaXNjcmltaW5hdGVSZXN1bHRUdXBlbDtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
