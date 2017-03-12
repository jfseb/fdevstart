/**
 *
 * @module jfseb.fdevstart.analyze
 * @file analyze.ts
 * @copyright (c) 2016 Gerd Forstmann
 */
"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var InputFilter = require("./inputFilter");
var debug = require("debug");
var debuglog = debug('whatis');
var debuglogV = debug('whatVis');
var perflog = debug('perf');
function mockDebug(o) {
    debuglog = o;
    debuglogV = o;
    perflog = o;
}
exports.mockDebug = mockDebug;
var _ = require("lodash");
var Match = require("./match");
var Sentence = require("./sentence");
var Word = require("./word");
var Algol = require("./algol");
/*
export function cmpByResultThenRanking(a: IMatch.IWhatIsAnswer, b: IMatch.IWhatIsAnswer) {
  var cmp = a.result.localeCompare(b.result);
  if (cmp) {
    return cmp;
  }
  return -(a._ranking - b._ranking);
}
*/
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
function safeEqual(a, b) {
    var delta = a - b;
    if (Math.abs(delta) < Algol.RANKING_EPSILON) {
        return true;
    }
    return false;
}
exports.safeEqual = safeEqual;
function safeDelta(a, b) {
    var delta = a - b;
    if (Math.abs(delta) < Algol.RANKING_EPSILON) {
        return 0;
    }
    return delta;
}
exports.safeDelta = safeDelta;
function cmpByResultThenRankingTupel(aa, bb) {
    var cmp = localeCompareArrs(aa.result, bb.result);
    if (cmp) {
        return cmp;
    }
    return -safeDelta(aa._ranking, bb._ranking);
}
exports.cmpByResultThenRankingTupel = cmpByResultThenRankingTupel;
function cmpRecords(a, b) {
    // are records different?
    var keys = Object.keys(a).concat(Object.keys(b)).sort();
    var res = keys.reduce(function (prev, sKey) {
        if (prev) {
            return prev;
        }
        if (b[sKey] !== a[sKey]) {
            if (!b[sKey]) {
                return -1;
            }
            if (!a[sKey]) {
                return +1;
            }
            return a[sKey].localeCompare(b[sKey]);
        }
        return 0;
    }, 0);
    return res;
}
exports.cmpRecords = cmpRecords;
function cmpByRanking(a, b) {
    var cmp = -safeDelta(a._ranking, b._ranking);
    if (cmp) {
        return cmp;
    }
    cmp = a.result.localeCompare(b.result);
    if (cmp) {
        return cmp;
    }
    return cmpRecords(a.record, b.record);
}
exports.cmpByRanking = cmpByRanking;
function cmpByRankingTupel(a, b) {
    var cmp = -safeDelta(a._ranking, b._ranking);
    if (cmp) {
        return cmp;
    }
    cmp = localeCompareArrs(a.result, b.result);
    if (cmp) {
        return cmp;
    }
    return cmpRecords(a.record, b.record);
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
function filterDistinctResultAndSortTupel(res) {
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
exports.filterDistinctResultAndSortTupel = filterDistinctResultAndSortTupel;
function filterOnlyTopRanked(results) {
    var res = results.filter(function (result) {
        if (safeEqual(result._ranking, results[0]._ranking)) {
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
        if (safeEqual(result._ranking, results[0]._ranking)) {
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
/**
 * A ranking which is purely based on the numbers of matched entities,
 * disregarding exactness of match
 */
/*
export function calcRankingSimple(matched: number,
  mismatched: number, nouse: number,
  relevantCount: number): number {
  // 2 : 0
  // 1 : 0
  var factor = matched * Math.pow(1.5, matched) * Math.pow(1.5, matched);
  var factor2 = Math.pow(0.4, mismatched);
  var factor3 = Math.pow(0.4, nouse);
  return Math.pow(factor2 * factor * factor3, 1 / (mismatched + matched + nouse));
}
*/
function calcRankingHavingCategory(matched, hasCategory, mismatched, relevantCount, hasDomain) {
    var lenMatched = Object.keys(matched).length;
    var factor = Match.calcRankingProduct(matched);
    factor *= Math.pow(1.5, lenMatched);
    if (hasDomain) {
        factor *= 1.5;
    }
    var lenHasCategory = Object.keys(hasCategory).length;
    var factorH = Math.pow(1.1, lenHasCategory);
    var lenMisMatched = Object.keys(mismatched).length;
    var factor2 = Match.calcRankingProduct(mismatched);
    factor2 *= Math.pow(0.4, lenMisMatched);
    var divisor = lenMisMatched + lenHasCategory + lenMatched;
    divisor = divisor ? divisor : 1;
    return Math.pow(factor2 * factorH * factor, 1 / divisor);
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
/*
function makeSimplifiedSentencesCategorySet(aSentences: IMatch.IProcessedSentences,
  categorySet: { [key: string]: boolean }, track: { fl: number, lf: number }
): {
  domains: string[],
  oSentence: IMatch.ISentence,
  cntRelevantWords: number,
  rWords: IMatch.IWord[]
}[] {
  return aSentences.sentences.map(function (oSentence) {
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
*/
function makeSimplifiedSentencesCategorySet2(aSentences, categorySet, track) {
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
            if (oWord.category === "category") {
                if (categorySet[oWord.matchedString]) {
                    return true;
                }
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
function matchRecordsQuickMultipleCategories(pSentences, categories, records, domainCategoryFilter) {
    // if (debuglog.enabled) {
    //  debuglog(JSON.stringify(records, undefined, 2));
    // }
    if (domainCategoryFilter && !domainCategoryFilter.domains) {
        throw new Error("old categorysSEt ??");
    }
    Object.freeze(domainCategoryFilter);
    var categoryF = categories[0];
    debuglog(debuglog.enabled ? "matchRecordsQuickMultipleCategories (r=" + (records && records.length) + " s=" + (pSentences && pSentences.sentences && pSentences.sentences.length) + ")\n categories:" + (categories && categories.join("\n")) + " categorySet: " + (domainCategoryFilter && _typeof(domainCategoryFilter.categorySet) === "object" && Object.keys(domainCategoryFilter.categorySet).join("\n")) : "-");
    perflog("matchRecordsQuickMult ...(r=" + records.length + " s=" + pSentences.sentences.length + ")");
    //console.log('categories ' +  JSON.stringify(categories));
    //console.log('categroySet' +  JSON.stringify(categorySet));
    var relevantRecords = records;
    if (domainCategoryFilter && domainCategoryFilter.domains) {
        relevantRecords = records.filter(function (record) {
            return domainCategoryFilter.domains.indexOf(record._domain) >= 0;
        });
    } else {
        relevantRecords = relevantRecords.filter(function (record) {
            return !categories.every(function (cat) {
                return record[cat] === undefined || record[cat] === null;
            });
            //      }
            //     return (record[categoryF] !== undefined) && (record[categoryF] !== null);
        });
    }
    var res = [];
    debuglog("relevant records with first (r=" + relevantRecords.length + ")");
    perflog("relevant records with first nr:" + relevantRecords.length + " sentences " + pSentences.sentences.length);
    if (domainCategoryFilter) {
        // we are only interested in categories present in records for domains which contain the category
        // var categoryset = Model.calculateRelevantRecordCategories(theModel,category);
        //knowing the target
        perflog("got categoryset with " + Object.keys(domainCategoryFilter.categorySet).length);
        var obj = { fl: 0, lf: 0 };
        var aSimplifiedSentences = [];
        //  if (process.env.ABOT_BET1) {
        aSimplifiedSentences = makeSimplifiedSentencesCategorySet2(pSentences, domainCategoryFilter.categorySet, obj);
        //  } else {
        //    aSimplifiedSentences = makeSimplifiedSentencesCategorySet(pSentences, categorySet, obj) as any;
        //  }
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
    debuglog(debuglog.enabled ? "here simplified sentences " + aSimplifiedSentences.map(function (o) {
        return "\nDomain=" + o.domains.join("\n") + "\n" + Sentence.dumpNice(o.rWords);
    }).join("\n") : "-");
    //console.log("here recrods" + relevantRecords.map( (o,index) =>  " index = " + index + " " + JSON.stringify(o)).join("\n"));
    relevantRecords.forEach(function (record) {
        aSimplifiedSentences.forEach(function (aSentence) {
            // count matches in record which are *not* the category
            var imismatched = 0;
            var imatched = 0;
            var nouse = 0;
            var foundcat = 1;
            var missingcat = 0;
            var matched = {};
            var mismatched = {};
            var hasCategory = {};
            aSentence.rWords.forEach(function (oWord) {
                var cntRelevantWords = 0;
                if (record[oWord.category] !== undefined) {
                    if (oWord.matchedString === record[oWord.category]) {
                        ++imatched;
                    } else {
                        ++imismatched;
                    }
                } else {
                    if (oWord.category !== "category") {
                        nouse += 1;
                    } else {
                        if (!record[oWord.matchedString]) {
                            missingcat += 1;
                        } else {
                            foundcat += 1;
                        }
                    }
                }
                if (oWord.category && record[oWord.category] !== undefined) {
                    if (oWord.matchedString === record[oWord.category]) {
                        matched[oWord.category] = oWord;
                    } else {
                        mismatched[oWord.category] = oWord;
                    }
                } else if (Word.Word.isCategory(oWord) && record[oWord.matchedString]) {
                    hasCategory[oWord.matchedString] = 1;
                } else if (!Word.Word.isCategory(oWord)) {
                    // TODO better unmachted
                    mismatched[oWord.category] = oWord;
                }
            });
            var matchedDomain = 0;
            var cntRelevantWords = aSentence.rWords.length;
            if (aSentence.domains.length) {
                if (record._domain !== aSentence.domains[0]) {
                    imismatched = 3000;
                } else {
                    imatched += 1;
                    matchedDomain += 1;
                }
            }
            var matchedLen = Object.keys(matched).length + Object.keys(hasCategory).length;
            var mismatchedLen = Object.keys(mismatched).length;
            if (imismatched < 3000 && (matchedLen > mismatchedLen || matchedLen === mismatchedLen && matchedDomain > 0)) {
                /*
                  debuglog("adding " + extractResult(categories,record).join(";"));
                  debuglog("with ranking : " + calcRankingHavingCategory2(matched, hasCategory, mismatched, cntRelevantWords, matchedDomain));
                  debuglog(" created by " + Object.keys(matched).map(key => "key:" + key
                  + "\n" + JSON.stringify(matched[key])).join("\n")
                  + "\nhasCat " + JSON.stringify(hasCategory)
                  + "\nmismat " + JSON.stringify(mismatched)
                  + "\ncnTrel " + JSON.stringify(cntRelevantWords)
                  + "\nmatcedDomain " + JSON.stringify(matchedDomain)
                  + "\nhasCat " + Object.keys(hasCategory)
                  + "\nmismat " + Object.keys(mismatched)
                  + `\nmatched ${Object.keys(matched)} \nhascat ${Object.keys(hasCategory).join("; ")} \nmism: ${Object.keys(mismatched)} \n`
                  + "\nmatcedDomain " + JSON.stringify(matchedDomain)
                           );
                  */
                var rec = {
                    sentence: aSentence.oSentence,
                    record: record,
                    categories: categories,
                    result: extractResult(categories, record),
                    _ranking: calcRankingHavingCategory(matched, hasCategory, mismatched, cntRelevantWords, matchedDomain)
                };
                //console.log("here ranking" + rec._ranking)
                if (rec._ranking === null || !rec._ranking) {
                    rec._ranking = 0.9;
                }
                res.push(rec);
            }
        });
    });
    perflog("sort (a=" + res.length + ")");
    res.sort(cmpByResultThenRankingTupel);
    perflog("MRQMC filterRetain ...");
    var result1 = Object.assign({ tupelanswers: res }, pSentences);
    /*debuglog("NEWMAP" + res.map(o => "\nrank" + o._ranking + " =>"
                + o.result.join("\n")).join("\n")); */
    var result2 = filterDistinctResultAndSortTupel(result1);
    perflog("MRQMC matchRecordsQuick done: (r=" + relevantRecords.length + " s=" + pSentences.sentences.length + " a=" + res.length + ")");
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
    //debuglog(JSON.stringify(cats));
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
function processString(query, rules) {
    //  if (!process.env.ABOT_OLDMATCH) {
    return Erbase.processString(query, rules, rules.wordCache);
    //  }
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
function resolveCategories(categories, contextQueryString, theModel, domainCategoryFilter) {
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
        var res = ListAll.listAllTupelWithContext(categories, contextQueryString, rules, records, domainCategoryFilter);
        //* sort by sentence
        res.tupelanswers.forEach(function (o) {
            o._ranking = o._ranking * Sentence.rankingProduct(o.sentence);
        });
        res.tupelanswers.sort(cmpByRankingTupel);
        return res;
    }
}
exports.resolveCategories = resolveCategories;
function isIndiscriminateResult(results) {
    var cnt = results.reduce(function (prev, result) {
        if (safeEqual(result._ranking, results[0]._ranking)) {
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
        if (safeEqual(result._ranking, results[0]._ranking)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC93aGF0aXMudHMiLCJtYXRjaC93aGF0aXMuanMiXSwibmFtZXMiOlsiSW5wdXRGaWx0ZXIiLCJyZXF1aXJlIiwiZGVidWciLCJkZWJ1Z2xvZyIsImRlYnVnbG9nViIsInBlcmZsb2ciLCJtb2NrRGVidWciLCJvIiwiZXhwb3J0cyIsIl8iLCJNYXRjaCIsIlNlbnRlbmNlIiwiV29yZCIsIkFsZ29sIiwibG9jYWxlQ29tcGFyZUFycnMiLCJhYXJlc3VsdCIsImJicmVzdWx0IiwiY21wIiwiYmxlbiIsImxlbmd0aCIsImV2ZXJ5IiwiYSIsImluZGV4IiwibG9jYWxlQ29tcGFyZSIsInNhZmVFcXVhbCIsImIiLCJkZWx0YSIsIk1hdGgiLCJhYnMiLCJSQU5LSU5HX0VQU0lMT04iLCJzYWZlRGVsdGEiLCJjbXBCeVJlc3VsdFRoZW5SYW5raW5nVHVwZWwiLCJhYSIsImJiIiwicmVzdWx0IiwiX3JhbmtpbmciLCJjbXBSZWNvcmRzIiwia2V5cyIsIk9iamVjdCIsImNvbmNhdCIsInNvcnQiLCJyZXMiLCJyZWR1Y2UiLCJwcmV2Iiwic0tleSIsImNtcEJ5UmFua2luZyIsInJlY29yZCIsImNtcEJ5UmFua2luZ1R1cGVsIiwiZHVtcE5pY2UiLCJhbnN3ZXIiLCJzIiwicHVzaCIsImNhdGVnb3J5IiwiZm9yRWFjaCIsInNSZXF1aXJlcyIsImNoYXJBdCIsIm9TZW50ZW5jZSIsInNlbnRlbmNlIiwib1dvcmQiLCJzV29yZCIsInN0cmluZyIsIm1hdGNoZWRTdHJpbmciLCJkdW1wTmljZVR1cGVsIiwiY2F0ZWdvcmllcyIsImpvaW4iLCJkdW1wV2VpZ2h0c1RvcCIsInRvb2xtYXRjaGVzIiwib3B0aW9ucyIsIm9NYXRjaCIsInRvcCIsImZpbHRlckRpc3RpbmN0UmVzdWx0QW5kU29ydFR1cGVsIiwidHVwZWxhbnN3ZXJzIiwiZmlsdGVyIiwiaVJlcyIsImVuYWJsZWQiLCJKU09OIiwic3RyaW5naWZ5IiwiaXNFcXVhbCIsImFzc2lnbiIsImZpbHRlck9ubHlUb3BSYW5rZWQiLCJyZXN1bHRzIiwiRXJyb3IiLCJmaWx0ZXJPbmx5VG9wUmFua2VkVHVwZWwiLCJjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5IiwibWF0Y2hlZCIsImhhc0NhdGVnb3J5IiwibWlzbWF0Y2hlZCIsInJlbGV2YW50Q291bnQiLCJoYXNEb21haW4iLCJsZW5NYXRjaGVkIiwiZmFjdG9yIiwiY2FsY1JhbmtpbmdQcm9kdWN0IiwicG93IiwibGVuSGFzQ2F0ZWdvcnkiLCJmYWN0b3JIIiwibGVuTWlzTWF0Y2hlZCIsImZhY3RvcjIiLCJkaXZpc29yIiwibWFrZVNpbXBsaWZpZWRTZW50ZW5jZXNDYXRlZ29yeVNldDIiLCJhU2VudGVuY2VzIiwiY2F0ZWdvcnlTZXQiLCJ0cmFjayIsInNlbnRlbmNlcyIsIm1hcCIsImFEb21haW5zIiwicldvcmRzIiwiZmwiLCJsZiIsImRvbWFpbnMiLCJjbnRSZWxldmFudFdvcmRzIiwibWFrZVNpbXBsaWZpZWRTZW50ZW5jZXMiLCJpc0ZpbGxlciIsImV4dHJhY3RSZXN1bHQiLCJtYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcyIsInBTZW50ZW5jZXMiLCJyZWNvcmRzIiwiZG9tYWluQ2F0ZWdvcnlGaWx0ZXIiLCJmcmVlemUiLCJjYXRlZ29yeUYiLCJyZWxldmFudFJlY29yZHMiLCJpbmRleE9mIiwiX2RvbWFpbiIsImNhdCIsInVuZGVmaW5lZCIsIm9iaiIsImFTaW1wbGlmaWVkU2VudGVuY2VzIiwiYVNlbnRlbmNlIiwiaW1pc21hdGNoZWQiLCJpbWF0Y2hlZCIsIm5vdXNlIiwiZm91bmRjYXQiLCJtaXNzaW5nY2F0IiwiaXNDYXRlZ29yeSIsIm1hdGNoZWREb21haW4iLCJtYXRjaGVkTGVuIiwibWlzbWF0Y2hlZExlbiIsInJlYyIsInJlc3VsdDEiLCJyZXN1bHQyIiwiY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5Iiwid29yZCIsInRhcmdldGNhdGVnb3J5IiwicnVsZXMiLCJ3aG9sZXNlbnRlbmNlIiwiY2F0cyIsImNhdGVnb3JpemVBV29yZCIsImFuYWx5emVDYXRlZ29yeSIsImNhdGVnb3J5d29yZCIsInNwbGl0QXRDb21tYUFuZCIsInN0ciIsInIiLCJzcGxpdCIsInJ0cmltbWVkIiwiU3RyaW5nIiwidHJpbSIsImFuYWx5emVDYXRlZ29yeU11bHRPbmx5QW5kQ29tbWEiLCJjYXRlZ29yeWxpc3QiLCJyY2F0IiwiZmlsdGVyQWNjZXB0aW5nT25seSIsImlJbmRleCIsIkVyYmFzZSIsInByb2Nlc3NTdHJpbmciLCJxdWVyeSIsIndvcmRDYWNoZSIsImFuYWx5emVDb250ZXh0U3RyaW5nIiwiY29udGV4dFF1ZXJ5U3RyaW5nIiwiYVNlbnRlbmNlc1JlaW5mb3JjZWQiLCJzbGljZSIsIkN1dG9mZl9TZW50ZW5jZXMiLCJyYW5raW5nUHJvZHVjdCIsImNtcEJ5TnJDYXRlZ29yaWVzQW5kU2FtZURvbWFpbiIsImNudGEiLCJnZXREaXN0aW5jdENhdGVnb3JpZXNJblNlbnRlbmNlIiwiY250YiIsImFuYWx5emVDYXRlZ29yeU11bHQiLCJnV29yZHMiLCJyZXMyIiwiY21wUmFua2luZ1Byb2R1Y3QiLCJkdW1wTmljZUFyciIsInJlc2NhdCIsImFuYWx5emVPcGVyYXRvciIsIm9wd29yZCIsIkVyRXJyb3IiLCJMaXN0QWxsIiwicmVzb2x2ZUNhdGVnb3J5IiwiZXJyb3JzIiwibWFrZUVycm9yX0VNUFRZX0lOUFVUIiwidG9rZW5zIiwiYW5zd2VycyIsImxpc3RBbGxXaXRoQ29udGV4dCIsInJlc29sdmVDYXRlZ29yaWVzIiwidGhlTW9kZWwiLCJsaXN0QWxsVHVwZWxXaXRoQ29udGV4dCIsImlzSW5kaXNjcmltaW5hdGVSZXN1bHQiLCJjbnQiLCJkaXNjcmltaW5hdGluZyIsImlzSW5kaXNjcmltaW5hdGVSZXN1bHRUdXBlbCJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztBQ01BOzs7O0FERUEsSUFBQUEsY0FBQUMsUUFBQSxlQUFBLENBQUE7QUFFQSxJQUFBQyxRQUFBRCxRQUFBLE9BQUEsQ0FBQTtBQUVBLElBQUlFLFdB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RUFBZ0JTLFFBQWhCLEVBQXdCO0FBQ2pGLGdCQUFLQSxTQUFTRyxNQUFULENBQWdCLENBQWhCLE1BQXVCLEdBQXZCLElBQThCeUIsUUFBUSxDQUFSLEVBQVdqQixVQUFYLENBQXNCeUQsT0FBdEIsQ0FBOEJwRSxRQUE5QixJQUEwQyxDQUF6RSxJQUNFNEIsUUFBUSxDQUFSLEVBQVdsQyxNQUFYLENBQWtCTSxRQUFsQixNQUFnQzRCLFFBQVEsQ0FBUixFQUFXbEMsTUFBWCxDQUFrQk0sUUFBbEIsQ0FEdEMsRUFDb0U7QUFDbEVULHFCQUFLUSxJQUFMLENBQVVDLFFBQVY7QUFDRDtBQUNELG1CQUFPVCxJQUFQO0FBQ0QsU0FOb0IsRUFNbEIsRUFOa0IsQ0FBckI7QUFPQSxZQUFJd0osZUFBZWhMLE1BQW5CLEVBQTJCO0FBQ3pCLG1CQUFPLDJFQUEyRWdMLGVBQWVuSSxJQUFmLENBQW9CLEdBQXBCLENBQTNFLEdBQXNHLHdCQUE3RztBQUNEO0FBQ0QsZUFBTywrQ0FBUDtBQUNEO0FBQ0QsV0FBTzJELFNBQVA7QUFDRDtBQXJCRG5ILFFBQUE0TCwyQkFBQSxHQUFBQSwyQkFBQSIsImZpbGUiOiJtYXRjaC93aGF0aXMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5hbmFseXplXG4gKiBAZmlsZSBhbmFseXplLnRzXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXG4gKi9cblxuXG5pbXBvcnQgKiBhcyBJbnB1dEZpbHRlciBmcm9tICcuL2lucHV0RmlsdGVyJztcblxuaW1wb3J0ICogYXMgZGVidWcgZnJvbSAnZGVidWcnO1xuXG52YXIgZGVidWdsb2cgPSBkZWJ1Zygnd2hhdGlzJyk7XG52YXIgZGVidWdsb2dWID0gZGVidWcoJ3doYXRWaXMnKTtcbnZhciBwZXJmbG9nID0gZGVidWcoJ3BlcmYnKTtcblxuXG5leHBvcnQgZnVuY3Rpb24gbW9ja0RlYnVnKG8pIHtcbiAgZGVidWdsb2cgPSBvO1xuICBkZWJ1Z2xvZ1YgPSBvO1xuICBwZXJmbG9nID0gbztcbn1cblxuXG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuLi91dGlscy91dGlscyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5cbmltcG9ydCAqIGFzIElNYXRjaCBmcm9tICcuL2lmbWF0Y2gnO1xuXG5cbmltcG9ydCAqIGFzIE1hdGNoIGZyb20gJy4vbWF0Y2gnO1xuXG5cbmltcG9ydCAqIGFzIFRvb2xtYXRjaGVyIGZyb20gJy4vdG9vbG1hdGNoZXInO1xuXG5pbXBvcnQgKiBhcyBTZW50ZW5jZSBmcm9tICcuL3NlbnRlbmNlJztcblxuaW1wb3J0ICogYXMgV29yZCBmcm9tICcuL3dvcmQnO1xuXG5pbXBvcnQgKiBhcyBBbGdvbCBmcm9tICcuL2FsZ29sJztcblxuXG4vKlxuZXhwb3J0IGZ1bmN0aW9uIGNtcEJ5UmVzdWx0VGhlblJhbmtpbmcoYTogSU1hdGNoLklXaGF0SXNBbnN3ZXIsIGI6IElNYXRjaC5JV2hhdElzQW5zd2VyKSB7XG4gIHZhciBjbXAgPSBhLnJlc3VsdC5sb2NhbGVDb21wYXJlKGIucmVzdWx0KTtcbiAgaWYgKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cbiAgcmV0dXJuIC0oYS5fcmFua2luZyAtIGIuX3JhbmtpbmcpO1xufVxuKi9cblxuZnVuY3Rpb24gbG9jYWxlQ29tcGFyZUFycnMoYWFyZXN1bHQ6IHN0cmluZ1tdLCBiYnJlc3VsdDogc3RyaW5nW10pOiBudW1iZXIge1xuICB2YXIgY21wID0gMDtcbiAgdmFyIGJsZW4gPSBiYnJlc3VsdC5sZW5ndGg7XG4gIGFhcmVzdWx0LmV2ZXJ5KGZ1bmN0aW9uIChhLCBpbmRleCkge1xuICAgIGlmIChibGVuIDw9IGluZGV4KSB7XG4gICAgICBjbXAgPSAtMTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgY21wID0gYS5sb2NhbGVDb21wYXJlKGJicmVzdWx0W2luZGV4XSk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG4gIGlmIChjbXApIHtcbiAgICByZXR1cm4gY21wO1xuICB9XG4gIGlmIChibGVuID4gYWFyZXN1bHQubGVuZ3RoKSB7XG4gICAgY21wID0gKzE7XG4gIH1cbiAgcmV0dXJuIDA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzYWZlRXF1YWwoYSA6IG51bWJlciwgYiA6IG51bWJlcikgOiBib29sZWFuIHtcbiAgdmFyIGRlbHRhID0gYSAtIGIgO1xuICBpZihNYXRoLmFicyhkZWx0YSkgPCBBbGdvbC5SQU5LSU5HX0VQU0lMT04pIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzYWZlRGVsdGEoYSA6IG51bWJlciwgYiA6IG51bWJlcikgOiBudW1iZXIge1xuICB2YXIgZGVsdGEgPSBhIC0gYiA7XG4gIGlmKE1hdGguYWJzKGRlbHRhKSA8IEFsZ29sLlJBTktJTkdfRVBTSUxPTikge1xuICAgIHJldHVybiAwO1xuICB9XG4gIHJldHVybiBkZWx0YTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbChhYTogSU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlciwgYmI6IElNYXRjaC5JV2hhdElzVHVwZWxBbnN3ZXIpIHtcbiAgdmFyIGNtcCA9IGxvY2FsZUNvbXBhcmVBcnJzKGFhLnJlc3VsdCwgYmIucmVzdWx0KTtcbiAgaWYgKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cbiAgcmV0dXJuIC1zYWZlRGVsdGEoYWEuX3JhbmtpbmcsYmIuX3JhbmtpbmcpO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBjbXBSZWNvcmRzKGE6IElNYXRjaC5JUmVjb3JkLCBiOiBJTWF0Y2guSVJlY29yZCkgOiBudW1iZXIge1xuLy8gYXJlIHJlY29yZHMgZGlmZmVyZW50P1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGEpLmNvbmNhdChPYmplY3Qua2V5cyhiKSkuc29ydCgpO1xuICB2YXIgcmVzID0ga2V5cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHNLZXkpIHtcbiAgICBpZiAocHJldikge1xuICAgICAgcmV0dXJuIHByZXY7XG4gICAgfVxuICAgIGlmIChiW3NLZXldICE9PSBhW3NLZXldKSB7XG4gICAgICBpZiAoIWJbc0tleV0pIHtcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgfVxuICAgICAgaWYgKCFhW3NLZXldKSB7XG4gICAgICAgIHJldHVybiArMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhW3NLZXldLmxvY2FsZUNvbXBhcmUoYltzS2V5XSk7XG4gICAgfVxuICAgIHJldHVybiAwO1xuICB9LCAwKTtcbiAgcmV0dXJuIHJlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNtcEJ5UmFua2luZyhhOiBJTWF0Y2guSVdoYXRJc0Fuc3dlciwgYjogSU1hdGNoLklXaGF0SXNBbnN3ZXIpIDogbnVtYmVyIHtcbiAgdmFyIGNtcCA9IC0gc2FmZURlbHRhKGEuX3JhbmtpbmcsIGIuX3JhbmtpbmcpIGFzIG51bWJlcjtcbiAgaWYgKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cbiAgY21wID0gYS5yZXN1bHQubG9jYWxlQ29tcGFyZShiLnJlc3VsdCk7XG4gIGlmIChjbXApIHtcbiAgICByZXR1cm4gY21wO1xuICB9XG5cbiAgcmV0dXJuIGNtcFJlY29yZHMoYS5yZWNvcmQsYi5yZWNvcmQpO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBjbXBCeVJhbmtpbmdUdXBlbChhOiBJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyLCBiOiBJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyKSA6IG51bWJlciB7XG4gIHZhciBjbXAgPSAtIHNhZmVEZWx0YShhLl9yYW5raW5nLCBiLl9yYW5raW5nKTtcbiAgaWYgKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cbiAgY21wID0gbG9jYWxlQ29tcGFyZUFycnMoYS5yZXN1bHQsIGIucmVzdWx0KTtcbiAgaWYgKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cbiAgcmV0dXJuICBjbXBSZWNvcmRzKGEucmVjb3JkLGIucmVjb3JkKTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gZHVtcE5pY2UoYW5zd2VyOiBJTWF0Y2guSVdoYXRJc0Fuc3dlcikge1xuICB2YXIgcmVzdWx0ID0ge1xuICAgIHM6IFwiXCIsXG4gICAgcHVzaDogZnVuY3Rpb24gKHMpIHsgdGhpcy5zID0gdGhpcy5zICsgczsgfVxuICB9O1xuICB2YXIgcyA9XG4gICAgYCoqUmVzdWx0IGZvciBjYXRlZ29yeTogJHthbnN3ZXIuY2F0ZWdvcnl9IGlzICR7YW5zd2VyLnJlc3VsdH1cbiByYW5rOiAke2Fuc3dlci5fcmFua2luZ31cbmA7XG4gIHJlc3VsdC5wdXNoKHMpO1xuICBPYmplY3Qua2V5cyhhbnN3ZXIucmVjb3JkKS5mb3JFYWNoKGZ1bmN0aW9uIChzUmVxdWlyZXMsIGluZGV4KSB7XG4gICAgaWYgKHNSZXF1aXJlcy5jaGFyQXQoMCkgIT09ICdfJykge1xuICAgICAgcmVzdWx0LnB1c2goYHJlY29yZDogJHtzUmVxdWlyZXN9IC0+ICR7YW5zd2VyLnJlY29yZFtzUmVxdWlyZXNdfWApO1xuICAgIH1cbiAgICByZXN1bHQucHVzaCgnXFxuJyk7XG4gIH0pO1xuICB2YXIgb1NlbnRlbmNlID0gYW5zd2VyLnNlbnRlbmNlO1xuICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGluZGV4KSB7XG4gICAgdmFyIHNXb3JkID0gYFske2luZGV4fV0gOiAke29Xb3JkLmNhdGVnb3J5fSBcIiR7b1dvcmQuc3RyaW5nfVwiID0+IFwiJHtvV29yZC5tYXRjaGVkU3RyaW5nfVwiYFxuICAgIHJlc3VsdC5wdXNoKHNXb3JkICsgXCJcXG5cIik7XG4gIH0pXG4gIHJlc3VsdC5wdXNoKFwiLlxcblwiKTtcbiAgcmV0dXJuIHJlc3VsdC5zO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGR1bXBOaWNlVHVwZWwoYW5zd2VyOiBJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyKSB7XG4gIHZhciByZXN1bHQgPSB7XG4gICAgczogXCJcIixcbiAgICBwdXNoOiBmdW5jdGlvbiAocykgeyB0aGlzLnMgPSB0aGlzLnMgKyBzOyB9XG4gIH07XG4gIHZhciBzID1cbiAgICBgKipSZXN1bHQgZm9yIGNhdGVnb3JpZXM6ICR7YW5zd2VyLmNhdGVnb3JpZXMuam9pbihcIjtcIil9IGlzICR7YW5zd2VyLnJlc3VsdH1cbiByYW5rOiAke2Fuc3dlci5fcmFua2luZ31cbmA7XG4gIHJlc3VsdC5wdXNoKHMpO1xuICBPYmplY3Qua2V5cyhhbnN3ZXIucmVjb3JkKS5mb3JFYWNoKGZ1bmN0aW9uIChzUmVxdWlyZXMsIGluZGV4KSB7XG4gICAgaWYgKHNSZXF1aXJlcy5jaGFyQXQoMCkgIT09ICdfJykge1xuICAgICAgcmVzdWx0LnB1c2goYHJlY29yZDogJHtzUmVxdWlyZXN9IC0+ICR7YW5zd2VyLnJlY29yZFtzUmVxdWlyZXNdfWApO1xuICAgIH1cbiAgICByZXN1bHQucHVzaCgnXFxuJyk7XG4gIH0pO1xuICB2YXIgb1NlbnRlbmNlID0gYW5zd2VyLnNlbnRlbmNlO1xuICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGluZGV4KSB7XG4gICAgdmFyIHNXb3JkID0gYFske2luZGV4fV0gOiAke29Xb3JkLmNhdGVnb3J5fSBcIiR7b1dvcmQuc3RyaW5nfVwiID0+IFwiJHtvV29yZC5tYXRjaGVkU3RyaW5nfVwiYFxuICAgIHJlc3VsdC5wdXNoKHNXb3JkICsgXCJcXG5cIik7XG4gIH0pXG4gIHJlc3VsdC5wdXNoKFwiLlxcblwiKTtcbiAgcmV0dXJuIHJlc3VsdC5zO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBkdW1wV2VpZ2h0c1RvcCh0b29sbWF0Y2hlczogQXJyYXk8SU1hdGNoLklXaGF0SXNBbnN3ZXI+LCBvcHRpb25zOiBhbnkpIHtcbiAgdmFyIHMgPSAnJztcbiAgdG9vbG1hdGNoZXMuZm9yRWFjaChmdW5jdGlvbiAob01hdGNoLCBpbmRleCkge1xuICAgIGlmIChpbmRleCA8IG9wdGlvbnMudG9wKSB7XG4gICAgICBzID0gcyArIFwiV2hhdElzQW5zd2VyW1wiICsgaW5kZXggKyBcIl0uLi5cXG5cIjtcbiAgICAgIHMgPSBzICsgZHVtcE5pY2Uob01hdGNoKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlckRpc3RpbmN0UmVzdWx0QW5kU29ydFR1cGVsKHJlczogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNUdXBlbEFuc3dlcnMpOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc1R1cGVsQW5zd2VycyB7XG4gIHZhciByZXN1bHQgPSByZXMudHVwZWxhbnN3ZXJzLmZpbHRlcihmdW5jdGlvbiAoaVJlcywgaW5kZXgpIHtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgZGVidWdsb2coJyByZXRhaW4gdHVwZWwgJyArIGluZGV4ICsgJyAnICsgSlNPTi5zdHJpbmdpZnkoaVJlcykpO1xuICAgIH1cbiAgICBpZiAoXy5pc0VxdWFsKGlSZXMucmVzdWx0LCByZXMudHVwZWxhbnN3ZXJzW2luZGV4IC0gMV0gJiYgcmVzLnR1cGVsYW5zd2Vyc1tpbmRleCAtIDFdLnJlc3VsdCkpIHtcbiAgICAgIGRlYnVnbG9nKCdza2lwJyk7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0pO1xuICByZXN1bHQuc29ydChjbXBCeVJhbmtpbmdUdXBlbCk7XG4gIHJldHVybiBPYmplY3QuYXNzaWduKHJlcywgeyB0dXBlbGFuc3dlcnM6IHJlc3VsdCB9KTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyT25seVRvcFJhbmtlZChyZXN1bHRzOiBBcnJheTxJTWF0Y2guSVdoYXRJc0Fuc3dlcj4pOiBBcnJheTxJTWF0Y2guSVdoYXRJc0Fuc3dlcj4ge1xuICB2YXIgcmVzID0gcmVzdWx0cy5maWx0ZXIoZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgIGlmIChzYWZlRXF1YWwocmVzdWx0Ll9yYW5raW5nLCByZXN1bHRzWzBdLl9yYW5raW5nKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChyZXN1bHQuX3JhbmtpbmcgPj0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTGlzdCB0byBmaWx0ZXIgbXVzdCBiZSBvcmRlcmVkXCIpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuICByZXR1cm4gcmVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyT25seVRvcFJhbmtlZFR1cGVsKHJlc3VsdHM6IEFycmF5PElNYXRjaC5JV2hhdElzVHVwZWxBbnN3ZXI+KTogQXJyYXk8SU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlcj4ge1xuICB2YXIgcmVzID0gcmVzdWx0cy5maWx0ZXIoZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgIGlmICggc2FmZUVxdWFsKHJlc3VsdC5fcmFua2luZywgcmVzdWx0c1swXS5fcmFua2luZykpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAocmVzdWx0Ll9yYW5raW5nID49IHJlc3VsdHNbMF0uX3JhbmtpbmcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkxpc3QgdG8gZmlsdGVyIG11c3QgYmUgb3JkZXJlZFwiKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbiAgcmV0dXJuIHJlcztcbn1cblxuXG4vKipcbiAqIEEgcmFua2luZyB3aGljaCBpcyBwdXJlbHkgYmFzZWQgb24gdGhlIG51bWJlcnMgb2YgbWF0Y2hlZCBlbnRpdGllcyxcbiAqIGRpc3JlZ2FyZGluZyBleGFjdG5lc3Mgb2YgbWF0Y2hcbiAqL1xuLypcbmV4cG9ydCBmdW5jdGlvbiBjYWxjUmFua2luZ1NpbXBsZShtYXRjaGVkOiBudW1iZXIsXG4gIG1pc21hdGNoZWQ6IG51bWJlciwgbm91c2U6IG51bWJlcixcbiAgcmVsZXZhbnRDb3VudDogbnVtYmVyKTogbnVtYmVyIHtcbiAgLy8gMiA6IDBcbiAgLy8gMSA6IDBcbiAgdmFyIGZhY3RvciA9IG1hdGNoZWQgKiBNYXRoLnBvdygxLjUsIG1hdGNoZWQpICogTWF0aC5wb3coMS41LCBtYXRjaGVkKTtcbiAgdmFyIGZhY3RvcjIgPSBNYXRoLnBvdygwLjQsIG1pc21hdGNoZWQpO1xuICB2YXIgZmFjdG9yMyA9IE1hdGgucG93KDAuNCwgbm91c2UpO1xuICByZXR1cm4gTWF0aC5wb3coZmFjdG9yMiAqIGZhY3RvciAqIGZhY3RvcjMsIDEgLyAobWlzbWF0Y2hlZCArIG1hdGNoZWQgKyBub3VzZSkpO1xufVxuKi9cblxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkobWF0Y2hlZDogeyBba2V5OiBzdHJpbmddOiBJTWF0Y2guSVdvcmQgfSxcbiAgaGFzQ2F0ZWdvcnk6IHsgW2tleTogc3RyaW5nXTogbnVtYmVyIH0sXG4gIG1pc21hdGNoZWQ6IHsgW2tleTogc3RyaW5nXTogSU1hdGNoLklXb3JkIH0sIHJlbGV2YW50Q291bnQ6IG51bWJlciwgaGFzRG9tYWluIDogbnVtYmVyKTogbnVtYmVyIHtcblxuXG4gIHZhciBsZW5NYXRjaGVkID0gT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoO1xuICB2YXIgZmFjdG9yID0gTWF0Y2guY2FsY1JhbmtpbmdQcm9kdWN0KG1hdGNoZWQpO1xuICBmYWN0b3IgKj0gTWF0aC5wb3coMS41LCBsZW5NYXRjaGVkKTtcbiAgaWYoaGFzRG9tYWluKSB7XG4gICAgZmFjdG9yICo9IDEuNTtcbiAgfVxuICB2YXIgbGVuSGFzQ2F0ZWdvcnkgPSBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoO1xuICB2YXIgZmFjdG9ySCA9IE1hdGgucG93KDEuMSwgbGVuSGFzQ2F0ZWdvcnkpO1xuXG4gIHZhciBsZW5NaXNNYXRjaGVkID0gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoO1xuICB2YXIgZmFjdG9yMiA9IE1hdGNoLmNhbGNSYW5raW5nUHJvZHVjdChtaXNtYXRjaGVkKTtcbiAgZmFjdG9yMiAqPSBNYXRoLnBvdygwLjQsIGxlbk1pc01hdGNoZWQpO1xuICB2YXIgZGl2aXNvciA9ICAobGVuTWlzTWF0Y2hlZCArIGxlbkhhc0NhdGVnb3J5ICsgbGVuTWF0Y2hlZCk7XG4gIGRpdmlzb3IgPSBkaXZpc29yID8gZGl2aXNvciA6IDE7XG4gIHJldHVybiBNYXRoLnBvdyhmYWN0b3IyICogZmFjdG9ySCAqIGZhY3RvciwgMSAvIChkaXZpc29yKSk7XG59XG5cbi8qKlxuICogbGlzdCBhbGwgdG9wIGxldmVsIHJhbmtpbmdzXG4gKi9cbi8qXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hSZWNvcmRzSGF2aW5nQ29udGV4dChcbiAgcFNlbnRlbmNlczogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMsIGNhdGVnb3J5OiBzdHJpbmcsIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPixcbiAgY2F0ZWdvcnlTZXQ6IHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB9KVxuICA6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzQW5zd2VycyB7XG5cbiAgLy9kZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRzLCB1bmRlZmluZWQsIDIpKTtcbiAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQ6IElNYXRjaC5JUmVjb3JkKSB7XG4gICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnldICE9PSBudWxsKTtcbiAgfSk7XG4gIHZhciByZXMgPSBbXTtcbiAgZGVidWdsb2coXCJNYXRjaFJlY29yZHNIYXZpbmdDb250ZXh0IDogcmVsZXZhbnQgcmVjb3JkcyBucjpcIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGgpO1xuICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwic2VudGVuY2VzIGFyZSA6IFwiICsgSlNPTi5zdHJpbmdpZnkocFNlbnRlbmNlcywgdW5kZWZpbmVkLCAyKSkgOiBcIi1cIik7XG4gIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJjYXRlZ29yeSBcIiArIGNhdGVnb3J5ICsgXCIgYW5kIGNhdGVnb3J5c2V0IGlzOiBcIiArIEpTT04uc3RyaW5naWZ5KGNhdGVnb3J5U2V0LCB1bmRlZmluZWQsIDIpKSA6IFwiLVwiKTtcbiAgaWYgKHByb2Nlc3MuZW52LkFCT1RfRkFTVCAmJiBjYXRlZ29yeVNldCkge1xuICAgIC8vIHdlIGFyZSBvbmx5IGludGVyZXN0ZWQgaW4gY2F0ZWdvcmllcyBwcmVzZW50IGluIHJlY29yZHMgZm9yIGRvbWFpbnMgd2hpY2ggY29udGFpbiB0aGUgY2F0ZWdvcnlcbiAgICAvLyB2YXIgY2F0ZWdvcnlzZXQgPSBNb2RlbC5jYWxjdWxhdGVSZWxldmFudFJlY29yZENhdGVnb3JpZXModGhlTW9kZWwsY2F0ZWdvcnkpO1xuICAgIC8va25vd2luZyB0aGUgdGFyZ2V0XG4gICAgcGVyZmxvZyhcImdvdCBjYXRlZ29yeXNldCB3aXRoIFwiICsgT2JqZWN0LmtleXMoY2F0ZWdvcnlTZXQpLmxlbmd0aCk7XG4gICAgdmFyIGZsID0gMDtcbiAgICB2YXIgbGYgPSAwO1xuICAgIHZhciBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IHBTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICB2YXIgZldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgcmV0dXJuICFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpO1xuICAgICAgfSk7XG4gICAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgcmV0dXJuICEhY2F0ZWdvcnlTZXRbb1dvcmQuY2F0ZWdvcnldIHx8IFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKTtcbiAgICAgIH0pO1xuICAgICAgZmwgPSBmbCArIG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgICBsZiA9IGxmICsgcldvcmRzLmxlbmd0aDtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLCAvLyBub3QgYSBmaWxsZXIgIC8vIHRvIGJlIGNvbXBhdGlibGUgaXQgd291bGQgYmUgZldvcmRzXG4gICAgICAgIHJXb3JkczogcldvcmRzXG4gICAgICB9O1xuICAgIH0pO1xuICAgIE9iamVjdC5mcmVlemUoYVNpbXBsaWZpZWRTZW50ZW5jZXMpO1xuICAgIGRlYnVnbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyBmbCArIFwiLT5cIiArIGxmICsgXCIpXCIpO1xuICAgIHBlcmZsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIGZsICsgXCItPlwiICsgbGYgKyBcIilcIik7XG4gICAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgYVNpbXBsaWZpZWRTZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAoYVNlbnRlbmNlKSB7XG4gICAgICAgIHZhciBoYXNDYXRlZ29yeSA9IHt9O1xuICAgICAgICB2YXIgbWlzbWF0Y2hlZCA9IHt9O1xuICAgICAgICB2YXIgbWF0Y2hlZCA9IHt9O1xuICAgICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IGFTZW50ZW5jZS5jbnRSZWxldmFudFdvcmRzO1xuICAgICAgICBhU2VudGVuY2UucldvcmRzLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICYmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKSAmJiByZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgIGhhc0NhdGVnb3J5W29Xb3JkLm1hdGNoZWRTdHJpbmddID0gMTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgaWYgKChPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoKSA+IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aCkge1xuICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2Uub1NlbnRlbmNlLFxuICAgICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgICByZXN1bHQ6IHJlY29yZFtjYXRlZ29yeV0sXG4gICAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KTtcbiAgICBkZWJ1Z2xvZyhcImhlcmUgaW4gd2VpcmRcIik7XG4gIH0gZWxzZSB7XG4gICAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgcFNlbnRlbmNlcy5zZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAoYVNlbnRlbmNlKSB7XG4gICAgICAgIHZhciBoYXNDYXRlZ29yeSA9IHt9O1xuICAgICAgICB2YXIgbWlzbWF0Y2hlZCA9IHt9O1xuICAgICAgICB2YXIgbWF0Y2hlZCA9IHt9O1xuICAgICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IDA7XG4gICAgICAgIGFTZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgIGlmICghV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKSkge1xuICAgICAgICAgICAgY250UmVsZXZhbnRXb3JkcyA9IGNudFJlbGV2YW50V29yZHMgKyAxO1xuICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICYmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCkgJiYgcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICAgIGhhc0NhdGVnb3J5W29Xb3JkLm1hdGNoZWRTdHJpbmddID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoKE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aCArIE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5sZW5ndGgpID4gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoKSB7XG4gICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgc2VudGVuY2U6IGFTZW50ZW5jZSxcbiAgICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxuICAgICAgICAgICAgcmVzdWx0OiByZWNvcmRbY2F0ZWdvcnldLFxuICAgICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSk7XG4gIH1cbiAgcmVzLnNvcnQoY21wQnlSZXN1bHRUaGVuUmFua2luZyk7XG4gIGRlYnVnbG9nKFwiIGFmdGVyIHNvcnRcIiArIHJlcy5sZW5ndGgpO1xuICB2YXIgcmVzdWx0ID0gT2JqZWN0LmFzc2lnbih7fSwgcFNlbnRlbmNlcywgeyBhbnN3ZXJzOiByZXMgfSk7XG4gIHJldHVybiBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHQocmVzdWx0KTtcbn1cbiovXG5cbi8qXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hSZWNvcmRzKGFTZW50ZW5jZXM6IElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzLCBjYXRlZ29yeTogc3RyaW5nLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4pXG4gIDogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzIHtcbiAgLy8gaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgLy8gICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRzLCB1bmRlZmluZWQsIDIpKTtcbiAgLy8gfVxuICB2YXIgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZDogSU1hdGNoLklSZWNvcmQpIHtcbiAgICByZXR1cm4gKHJlY29yZFtjYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkgJiYgKHJlY29yZFtjYXRlZ29yeV0gIT09IG51bGwpO1xuICB9KTtcbiAgdmFyIHJlcyA9IFtdO1xuICBkZWJ1Z2xvZyhcInJlbGV2YW50IHJlY29yZHMgbnI6XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoKTtcbiAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgIGFTZW50ZW5jZXMuc2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fVxuICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gMDtcbiAgICAgIGFTZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICBpZiAoIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCkpIHtcbiAgICAgICAgICBjbnRSZWxldmFudFdvcmRzID0gY250UmVsZXZhbnRXb3JkcyArIDE7XG4gICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICYmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgaWYgKE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aCA+IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aCkge1xuICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgc2VudGVuY2U6IGFTZW50ZW5jZSxcbiAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgcmVzdWx0OiByZWNvcmRbY2F0ZWdvcnldLFxuICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZyhtYXRjaGVkLCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KVxuICB9KTtcbiAgcmVzLnNvcnQoY21wQnlSZXN1bHRUaGVuUmFua2luZyk7XG4gIHZhciByZXN1bHQgPSBPYmplY3QuYXNzaWduKHt9LCBhU2VudGVuY2VzLCB7IGFuc3dlcnM6IHJlcyB9KTtcbiAgcmV0dXJuIGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdChyZXN1bHQpO1xufVxuKi9cbi8qXG5mdW5jdGlvbiBtYWtlU2ltcGxpZmllZFNlbnRlbmNlc0NhdGVnb3J5U2V0KGFTZW50ZW5jZXM6IElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzLFxuICBjYXRlZ29yeVNldDogeyBba2V5OiBzdHJpbmddOiBib29sZWFuIH0sIHRyYWNrOiB7IGZsOiBudW1iZXIsIGxmOiBudW1iZXIgfVxuKToge1xuICBkb21haW5zOiBzdHJpbmdbXSxcbiAgb1NlbnRlbmNlOiBJTWF0Y2guSVNlbnRlbmNlLFxuICBjbnRSZWxldmFudFdvcmRzOiBudW1iZXIsXG4gIHJXb3JkczogSU1hdGNoLklXb3JkW11cbn1bXSB7XG4gIHJldHVybiBhU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgIHZhciBhRG9tYWlucyA9IFtdIGFzIHN0cmluZ1tdO1xuICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcImRvbWFpblwiKSB7XG4gICAgICAgIGFEb21haW5zLnB1c2gob1dvcmQubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJtZXRhXCIpIHtcbiAgICAgICAgLy8gZS5nLiBkb21haW4gWFhYXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAhIWNhdGVnb3J5U2V0W29Xb3JkLmNhdGVnb3J5XTtcbiAgICB9KTtcbiAgICB0cmFjay5mbCArPSBvU2VudGVuY2UubGVuZ3RoO1xuICAgIHRyYWNrLmxmICs9IHJXb3Jkcy5sZW5ndGg7XG4gICAgcmV0dXJuIHtcbiAgICAgIGRvbWFpbnM6IGFEb21haW5zLFxuICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLFxuICAgICAgcldvcmRzOiByV29yZHNcbiAgICB9O1xuICB9KTtcbn1cbiovXG5cbmZ1bmN0aW9uIG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzQ2F0ZWdvcnlTZXQyKGFTZW50ZW5jZXM6IElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzLFxuICBjYXRlZ29yeVNldDogeyBba2V5OiBzdHJpbmddOiBib29sZWFuIH0sIHRyYWNrOiB7IGZsOiBudW1iZXIsIGxmOiBudW1iZXIgfVxuKToge1xuICBkb21haW5zOiBzdHJpbmdbXSxcbiAgb1NlbnRlbmNlOiBJTWF0Y2guSVNlbnRlbmNlLFxuICBjbnRSZWxldmFudFdvcmRzOiBudW1iZXIsXG4gIHJXb3JkczogSU1hdGNoLklXb3JkW11cbn1bXSB7XG4gIHJldHVybiBhU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgIHZhciBhRG9tYWlucyA9IFtdIGFzIHN0cmluZ1tdO1xuICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcImRvbWFpblwiKSB7XG4gICAgICAgIGFEb21haW5zLnB1c2gob1dvcmQubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJtZXRhXCIpIHtcbiAgICAgICAgLy8gZS5nLiBkb21haW4gWFhYXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmKG9Xb3JkLmNhdGVnb3J5ID09PSBcImNhdGVnb3J5XCIpIHtcbiAgICAgICAgaWYoY2F0ZWdvcnlTZXRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuICEhY2F0ZWdvcnlTZXRbb1dvcmQuY2F0ZWdvcnldO1xuICAgIH0pO1xuICAgIHRyYWNrLmZsICs9IG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgdHJhY2subGYgKz0gcldvcmRzLmxlbmd0aDtcbiAgICByZXR1cm4ge1xuICAgICAgZG9tYWluczogYURvbWFpbnMsXG4gICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsXG4gICAgICByV29yZHM6IHJXb3Jkc1xuICAgIH07XG4gIH0pO1xufVxuXG5cbmZ1bmN0aW9uIG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzKGFTZW50ZW5jZXMgOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcywgIHRyYWNrOiB7IGZsOiBudW1iZXIsIGxmOiBudW1iZXIgfSk6IHtcbiAgZG9tYWluczogc3RyaW5nW10sXG4gIG9TZW50ZW5jZTogSU1hdGNoLklTZW50ZW5jZSxcbiAgY250UmVsZXZhbnRXb3JkczogbnVtYmVyLFxuICByV29yZHM6IElNYXRjaC5JV29yZFtdXG59W10ge1xuICByZXR1cm4gYVNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICB2YXIgZG9tYWlucyA9IFtdIGFzIHN0cmluZ1tdO1xuICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcImRvbWFpblwiKSB7XG4gICAgICAgIGRvbWFpbnMucHVzaChvV29yZC5tYXRjaGVkU3RyaW5nKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcIm1ldGFcIikge1xuICAgICAgICAvLyBlLmcuIGRvbWFpbiBYWFhcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuICFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpO1xuICAgIH0pO1xuICAgIHRyYWNrLmZsICs9IG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgdHJhY2subGYgKz0gcldvcmRzLmxlbmd0aDtcbiAgICByZXR1cm4ge1xuICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICBkb21haW5zOiBkb21haW5zLFxuICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCxcbiAgICAgIHJXb3JkczogcldvcmRzXG4gICAgfTtcbiAgfSk7XG59XG5cblxuZnVuY3Rpb24gZXh0cmFjdFJlc3VsdChjYXRlZ29yaWVzOiBzdHJpbmdbXSwgcmVjb3JkOiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9KTogc3RyaW5nW10ge1xuICByZXR1cm4gY2F0ZWdvcmllcy5tYXAoZnVuY3Rpb24gKGNhdGVnb3J5KSB7IHJldHVybiByZWNvcmRbY2F0ZWdvcnldIHx8IFwibi9hXCI7IH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hSZWNvcmRzUXVpY2tNdWx0aXBsZUNhdGVnb3JpZXMocFNlbnRlbmNlczogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMsIGNhdGVnb3JpZXM6IHN0cmluZ1tdLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sIGRvbWFpbkNhdGVnb3J5RmlsdGVyPzogSU1hdGNoLklEb21haW5DYXRlZ29yeUZpbHRlcilcbiAgOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc1R1cGVsQW5zd2VycyB7XG4gIC8vIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gIC8vICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRzLCB1bmRlZmluZWQsIDIpKTtcbiAgLy8gfVxuXG4gIGlmKGRvbWFpbkNhdGVnb3J5RmlsdGVyICYmICEgZG9tYWluQ2F0ZWdvcnlGaWx0ZXIuZG9tYWlucyApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJvbGQgY2F0ZWdvcnlzU0V0ID8/XCIpXG4gIH1cblxuICBPYmplY3QuZnJlZXplKGRvbWFpbkNhdGVnb3J5RmlsdGVyKTtcbiAgdmFyIGNhdGVnb3J5RiA9IGNhdGVnb3JpZXNbMF07XG5cbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcIm1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzIChyPVwiICsgKHJlY29yZHMgJiYgcmVjb3Jkcy5sZW5ndGgpXG4gICsgXCIgcz1cIiArIChwU2VudGVuY2VzICYmIHBTZW50ZW5jZXMuc2VudGVuY2VzICYmIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCkgKyBcIilcXG4gY2F0ZWdvcmllczpcIiArKGNhdGVnb3JpZXMgJiYgIGNhdGVnb3JpZXMuam9pbihcIlxcblwiKSkgKyBcIiBjYXRlZ29yeVNldDogXCJcbiAgKyAoIGRvbWFpbkNhdGVnb3J5RmlsdGVyICYmICh0eXBlb2YgZG9tYWluQ2F0ZWdvcnlGaWx0ZXIuY2F0ZWdvcnlTZXQgPT09IFwib2JqZWN0XCIpICYmIE9iamVjdC5rZXlzKGRvbWFpbkNhdGVnb3J5RmlsdGVyLmNhdGVnb3J5U2V0KS5qb2luKFwiXFxuXCIpKSkgIDogXCItXCIpO1xuICBwZXJmbG9nKFwibWF0Y2hSZWNvcmRzUXVpY2tNdWx0IC4uLihyPVwiICsgcmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIpXCIpO1xuXG4gIC8vY29uc29sZS5sb2coJ2NhdGVnb3JpZXMgJyArICBKU09OLnN0cmluZ2lmeShjYXRlZ29yaWVzKSk7XG5cbiAgLy9jb25zb2xlLmxvZygnY2F0ZWdyb3lTZXQnICsgIEpTT04uc3RyaW5naWZ5KGNhdGVnb3J5U2V0KSk7XG5cblxuICB2YXIgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3JkcztcblxuICBpZihkb21haW5DYXRlZ29yeUZpbHRlciAmJiBkb21haW5DYXRlZ29yeUZpbHRlci5kb21haW5zKSB7XG4gICAgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZDogSU1hdGNoLklSZWNvcmQpIHtcbiAgICAgIHJldHVybiAoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIuZG9tYWlucy5pbmRleE9mKChyZWNvcmQgYXMgYW55KS5fZG9tYWluKSA+PSAwKTtcbiAgICB9KTtcbiAgfVxuICBlbHNlIHtcbiAgICByZWxldmFudFJlY29yZHMgPSByZWxldmFudFJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQ6IElNYXRjaC5JUmVjb3JkKSB7XG4gICAgICByZXR1cm4gIWNhdGVnb3JpZXMuZXZlcnkoY2F0ID0+XG4gICAgICAgICAgICAocmVjb3JkW2NhdF0gPT09IHVuZGVmaW5lZCkgfHwgKHJlY29yZFtjYXRdID09PSBudWxsKVxuICAgICAgKTtcbiAgLy8gICAgICB9XG5cbiAvLyAgICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnlGXSAhPT0gdW5kZWZpbmVkKSAmJiAocmVjb3JkW2NhdGVnb3J5Rl0gIT09IG51bGwpO1xuICAgIH0pO1xuICB9XG4gIHZhciByZXMgPSBbXSBhcyBBcnJheTxJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyPjtcbiAgZGVidWdsb2coXCJyZWxldmFudCByZWNvcmRzIHdpdGggZmlyc3QgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIpXCIpO1xuICBwZXJmbG9nKFwicmVsZXZhbnQgcmVjb3JkcyB3aXRoIGZpcnN0IG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHNlbnRlbmNlcyBcIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCk7XG4gIGlmICgvKnByb2Nlc3MuZW52LkFCT1RfRkFTVCAmJiovIGRvbWFpbkNhdGVnb3J5RmlsdGVyKSB7XG4gICAgLy8gd2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbiBjYXRlZ29yaWVzIHByZXNlbnQgaW4gcmVjb3JkcyBmb3IgZG9tYWlucyB3aGljaCBjb250YWluIHRoZSBjYXRlZ29yeVxuICAgIC8vIHZhciBjYXRlZ29yeXNldCA9IE1vZGVsLmNhbGN1bGF0ZVJlbGV2YW50UmVjb3JkQ2F0ZWdvcmllcyh0aGVNb2RlbCxjYXRlZ29yeSk7XG4gICAgLy9rbm93aW5nIHRoZSB0YXJnZXRcbiAgICBwZXJmbG9nKFwiZ290IGNhdGVnb3J5c2V0IHdpdGggXCIgKyBPYmplY3Qua2V5cyhkb21haW5DYXRlZ29yeUZpbHRlci5jYXRlZ29yeVNldCkubGVuZ3RoKTtcbiAgICB2YXIgb2JqID0geyBmbDogMCwgbGY6IDAgfTtcbiAgICB2YXIgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBbXSBhcyB7XG4gICAgICBkb21haW5zOiBzdHJpbmdbXSxcbiAgICAgIG9TZW50ZW5jZTogSU1hdGNoLklTZW50ZW5jZSxcbiAgICAgIGNudFJlbGV2YW50V29yZHM6IG51bWJlcixcbiAgICAgIHJXb3JkczogSU1hdGNoLklXb3JkW11cbiAgICB9W107XG4gIC8vICBpZiAocHJvY2Vzcy5lbnYuQUJPVF9CRVQxKSB7XG4gICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXNDYXRlZ29yeVNldDIocFNlbnRlbmNlcywgZG9tYWluQ2F0ZWdvcnlGaWx0ZXIuY2F0ZWdvcnlTZXQsIG9iaikgYXMgYW55O1xuICAvLyAgfSBlbHNlIHtcbiAgLy8gICAgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBtYWtlU2ltcGxpZmllZFNlbnRlbmNlc0NhdGVnb3J5U2V0KHBTZW50ZW5jZXMsIGNhdGVnb3J5U2V0LCBvYmopIGFzIGFueTtcbiAgLy8gIH1cbiAgICBwZXJmbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyBvYmouZmwgKyBcIi0+XCIgKyBvYmoubGYgKyBcIilcIik7XG4gIH0gZWxzZSB7XG4gICAgZGVidWdsb2coXCJub3QgYWJvdF9mYXN0ICFcIik7XG4gICAgdmFyIHRyYWNrID0geyBmbDogMCAsIGxmIDogMH07XG4gICAgdmFyIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXMocFNlbnRlbmNlcyx0cmFjayk7XG4vKlxuICAgIHBTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgcmV0dXJuICFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpO1xuICAgICAgfSk7XG4gICAgICBmbCA9IGZsICsgb1NlbnRlbmNlLmxlbmd0aDtcbiAgICAgIGxmID0gbGYgKyByV29yZHMubGVuZ3RoO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsXG4gICAgICAgIHJXb3JkczogcldvcmRzXG4gICAgICB9O1xuICAgIH0pO1xuICAgICovXG4gICAgZGVidWdsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIHRyYWNrLmZsICsgXCItPlwiICsgdHJhY2subGYgKyBcIilcIik7XG4gICAgcGVyZmxvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgdHJhY2suZmwgKyBcIi0+XCIgKyB0cmFjay5sZiArIFwiKVwiKTtcbiAgfVxuXG4gIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJoZXJlIHNpbXBsaWZpZWQgc2VudGVuY2VzIFwiICtcbiAgYVNpbXBsaWZpZWRTZW50ZW5jZXMubWFwKG8gPT4gXCJcXG5Eb21haW49XCIgKyBvLmRvbWFpbnMuam9pbihcIlxcblwiKSArIFwiXFxuXCIgKyAgU2VudGVuY2UuZHVtcE5pY2Uoby5yV29yZHMpKS5qb2luKFwiXFxuXCIpKSA6IFwiLVwiKTtcblxuICAvL2NvbnNvbGUubG9nKFwiaGVyZSByZWNyb2RzXCIgKyByZWxldmFudFJlY29yZHMubWFwKCAobyxpbmRleCkgPT4gIFwiIGluZGV4ID0gXCIgKyBpbmRleCArIFwiIFwiICsgSlNPTi5zdHJpbmdpZnkobykpLmpvaW4oXCJcXG5cIikpO1xuICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgYVNpbXBsaWZpZWRTZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAoYVNlbnRlbmNlKSB7XG4gICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICB2YXIgaW1pc21hdGNoZWQgPSAwO1xuICAgICAgdmFyIGltYXRjaGVkID0gMDtcbiAgICAgIHZhciBub3VzZSA9IDA7XG4gICAgICB2YXIgZm91bmRjYXQgPSAxO1xuICAgICAgdmFyIG1pc3NpbmdjYXQgPSAwO1xuXG4gICAgICB2YXIgbWF0Y2hlZCA9IHt9O1xuICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fTtcbiAgICAgIHZhciBoYXNDYXRlZ29yeSA9IHt9O1xuXG4gICAgICBhU2VudGVuY2UucldvcmRzLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gMDtcbiAgICAgICAgaWYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICArK2ltYXRjaGVkO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICArK2ltaXNtYXRjaGVkO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgIT09IFwiY2F0ZWdvcnlcIikge1xuICAgICAgICAgICAgbm91c2UgKz0gMTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCFyZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgICAgbWlzc2luZ2NhdCArPSAxO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZm91bmRjYXQrPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgIG1hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKSAmJiByZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgIGhhc0NhdGVnb3J5W29Xb3JkLm1hdGNoZWRTdHJpbmddID0gMTtcbiAgICAgICAgfSBlbHNlIGlmKCFXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCkpIHtcbiAgICAgICAgICAgLy8gVE9ETyBiZXR0ZXIgdW5tYWNodGVkXG4gICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHZhciBtYXRjaGVkRG9tYWluID0gMDtcbiAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gYVNlbnRlbmNlLnJXb3Jkcy5sZW5ndGg7XG4gICAgICBpZiAoYVNlbnRlbmNlLmRvbWFpbnMubGVuZ3RoKSB7XG4gICAgICAgIGlmICgocmVjb3JkIGFzIGFueSkuX2RvbWFpbiAhPT0gYVNlbnRlbmNlLmRvbWFpbnNbMF0pIHtcbiAgICAgICAgICBpbWlzbWF0Y2hlZCA9IDMwMDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaW1hdGNoZWQgKz0gMTtcbiAgICAgICAgICBtYXRjaGVkRG9tYWluICs9IDE7XG4gICAgICAgICAgLy9jb25zb2xlLmxvZyhcIkdPVCBBIERPTUFJTiBISVRcIiArIG1hdGNoZWQgKyBcIiBcIiArIG1pc21hdGNoZWQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB2YXIgbWF0Y2hlZExlbiA9IE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aCArIE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5sZW5ndGg7XG4gICAgICB2YXIgbWlzbWF0Y2hlZExlbiA9IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aDtcbiAgICAgIGlmICgoaW1pc21hdGNoZWQgPCAzMDAwKVxuICAgICAgICAmJiAoKG1hdGNoZWRMZW4gPiBtaXNtYXRjaGVkTGVuKVxuICAgICAgICAgIHx8IChtYXRjaGVkTGVuID09PSBtaXNtYXRjaGVkTGVuICYmIG1hdGNoZWREb21haW4gPiAwKSlcbiAgICAgICkge1xuICAgICAgICAvKlxuICAgICAgICAgIGRlYnVnbG9nKFwiYWRkaW5nIFwiICsgZXh0cmFjdFJlc3VsdChjYXRlZ29yaWVzLHJlY29yZCkuam9pbihcIjtcIikpO1xuICAgICAgICAgIGRlYnVnbG9nKFwid2l0aCByYW5raW5nIDogXCIgKyBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5MihtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcywgbWF0Y2hlZERvbWFpbikpO1xuICAgICAgICAgIGRlYnVnbG9nKFwiIGNyZWF0ZWQgYnkgXCIgKyBPYmplY3Qua2V5cyhtYXRjaGVkKS5tYXAoa2V5ID0+IFwia2V5OlwiICsga2V5XG4gICAgICAgICAgKyBcIlxcblwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZFtrZXldKSkuam9pbihcIlxcblwiKVxuICAgICAgICAgICsgXCJcXG5oYXNDYXQgXCIgKyBKU09OLnN0cmluZ2lmeShoYXNDYXRlZ29yeSlcbiAgICAgICAgICArIFwiXFxubWlzbWF0IFwiICsgSlNPTi5zdHJpbmdpZnkobWlzbWF0Y2hlZClcbiAgICAgICAgICArIFwiXFxuY25UcmVsIFwiICsgSlNPTi5zdHJpbmdpZnkoY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgICArIFwiXFxubWF0Y2VkRG9tYWluIFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZERvbWFpbilcbiAgICAgICAgICArIFwiXFxuaGFzQ2F0IFwiICsgT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpXG4gICAgICAgICAgKyBcIlxcbm1pc21hdCBcIiArIE9iamVjdC5rZXlzKG1pc21hdGNoZWQpXG4gICAgICAgICAgKyBgXFxubWF0Y2hlZCAke09iamVjdC5rZXlzKG1hdGNoZWQpfSBcXG5oYXNjYXQgJHtPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkuam9pbihcIjsgXCIpfSBcXG5taXNtOiAke09iamVjdC5rZXlzKG1pc21hdGNoZWQpfSBcXG5gXG4gICAgICAgICAgKyBcIlxcbm1hdGNlZERvbWFpbiBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWREb21haW4pXG5cbiAgICAgICAgICApO1xuICAgICAgICAgICovXG5cbiAgICAgICAgdmFyIHJlYyA9IHtcbiAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLm9TZW50ZW5jZSxcbiAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICBjYXRlZ29yaWVzOiBjYXRlZ29yaWVzLFxuICAgICAgICAgIHJlc3VsdDogZXh0cmFjdFJlc3VsdChjYXRlZ29yaWVzLCByZWNvcmQpLFxuICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzLCBtYXRjaGVkRG9tYWluKVxuICAgICAgICB9O1xuICAgICAgICAvL2NvbnNvbGUubG9nKFwiaGVyZSByYW5raW5nXCIgKyByZWMuX3JhbmtpbmcpXG4gICAgICAgIGlmICgocmVjLl9yYW5raW5nID09PSBudWxsKSB8fCAhcmVjLl9yYW5raW5nKSB7XG4gICAgICAgICAgcmVjLl9yYW5raW5nID0gMC45O1xuICAgICAgICB9XG4gICAgICAgIHJlcy5wdXNoKHJlYyk7XG4gICAgICB9XG4gICAgfSlcbiAgfSk7XG4gIHBlcmZsb2coXCJzb3J0IChhPVwiICsgcmVzLmxlbmd0aCArIFwiKVwiKTtcbiAgcmVzLnNvcnQoY21wQnlSZXN1bHRUaGVuUmFua2luZ1R1cGVsKTtcbiAgcGVyZmxvZyhcIk1SUU1DIGZpbHRlclJldGFpbiAuLi5cIik7XG4gIHZhciByZXN1bHQxID0gT2JqZWN0LmFzc2lnbih7IHR1cGVsYW5zd2VyczogcmVzIH0sIHBTZW50ZW5jZXMpO1xuICAvKmRlYnVnbG9nKFwiTkVXTUFQXCIgKyByZXMubWFwKG8gPT4gXCJcXG5yYW5rXCIgKyBvLl9yYW5raW5nICsgXCIgPT5cIlxuICAgICAgICAgICAgICArIG8ucmVzdWx0LmpvaW4oXCJcXG5cIikpLmpvaW4oXCJcXG5cIikpOyAqL1xuICB2YXIgcmVzdWx0MiA9IGZpbHRlckRpc3RpbmN0UmVzdWx0QW5kU29ydFR1cGVsKHJlc3VsdDEpO1xuICBwZXJmbG9nKFwiTVJRTUMgbWF0Y2hSZWNvcmRzUXVpY2sgZG9uZTogKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGE9XCIgKyByZXMubGVuZ3RoICsgXCIpXCIpO1xuICByZXR1cm4gcmVzdWx0Mjtcbn1cblxuXG5mdW5jdGlvbiBjbGFzc2lmeVdvcmRXaXRoVGFyZ2V0Q2F0ZWdvcnkod29yZDogc3RyaW5nLCB0YXJnZXRjYXRlZ29yeTogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsXG4gIHdob2xlc2VudGVuY2U6IHN0cmluZyk6IHN0cmluZyB7XG4gIC8vY29uc29sZS5sb2coXCJjbGFzc2lmeSBcIiArIHdvcmQgKyBcIiBcIiAgKyB0YXJnZXRjYXRlZ29yeSk7XG4gIHZhciBjYXRzID0gSW5wdXRGaWx0ZXIuY2F0ZWdvcml6ZUFXb3JkKHdvcmQsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlLCB7fSk7XG4gIC8vIFRPRE8gcXVhbGlmeVxuICBjYXRzID0gY2F0cy5maWx0ZXIoZnVuY3Rpb24gKGNhdCkge1xuICAgIHJldHVybiBjYXQuY2F0ZWdvcnkgPT09IHRhcmdldGNhdGVnb3J5O1xuICB9KVxuICAvL2RlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGNhdHMpKTtcbiAgaWYgKGNhdHMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGNhdHNbMF0ubWF0Y2hlZFN0cmluZztcbiAgfVxufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBhbmFseXplQ2F0ZWdvcnkoY2F0ZWdvcnl3b3JkOiBzdHJpbmcsIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgd2hvbGVzZW50ZW5jZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGNsYXNzaWZ5V29yZFdpdGhUYXJnZXRDYXRlZ29yeShjYXRlZ29yeXdvcmQsICdjYXRlZ29yeScsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNwbGl0QXRDb21tYUFuZChzdHI6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgdmFyIHIgPSBzdHIuc3BsaXQoLyhcXGJhbmRcXGIpfFssXS8pO1xuICByID0gci5maWx0ZXIoZnVuY3Rpb24gKG8sIGluZGV4KSB7XG4gICAgaWYgKGluZGV4ICUgMiA+IDApIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0pO1xuICB2YXIgcnRyaW1tZWQgPSByLm1hcChmdW5jdGlvbiAobykge1xuICAgIHJldHVybiBuZXcgU3RyaW5nKG8pLnRyaW0oKTtcbiAgfSk7XG4gIHJldHVybiBydHJpbW1lZDtcbn1cbi8qKlxuICogQSBzaW1wbGUgaW1wbGVtZW50YXRpb24sIHNwbGl0dGluZyBhdCBhbmQgYW5kICxcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVDYXRlZ29yeU11bHRPbmx5QW5kQ29tbWEoY2F0ZWdvcnlsaXN0OiBzdHJpbmcsIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgd2hvbGVzZW50ZW5jZTogc3RyaW5nKTogc3RyaW5nW10ge1xuICB2YXIgcnRyaW1tZWQgPSBzcGxpdEF0Q29tbWFBbmQoY2F0ZWdvcnlsaXN0KTtcbiAgdmFyIHJjYXQgPSBydHJpbW1lZC5tYXAoZnVuY3Rpb24gKG8pIHtcbiAgICByZXR1cm4gYW5hbHl6ZUNhdGVnb3J5KG8sIHJ1bGVzLCB3aG9sZXNlbnRlbmNlKTtcbiAgfSk7XG4gIGlmIChyY2F0LmluZGV4T2YodW5kZWZpbmVkKSA+PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdcIicgKyBydHJpbW1lZFtyY2F0LmluZGV4T2YodW5kZWZpbmVkKV0gKyAnXCIgaXMgbm90IGEgY2F0ZWdvcnkhJyk7XG4gIH1cbiAgcmV0dXJuIHJjYXQ7XG59XG5cblxuXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyQWNjZXB0aW5nT25seShyZXM6IElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXVtdLCBjYXRlZ29yaWVzOiBzdHJpbmdbXSk6XG4gIElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXVtdIHtcbiAgcmV0dXJuIHJlcy5maWx0ZXIoZnVuY3Rpb24gKGFTZW50ZW5jZSwgaUluZGV4KSB7XG4gICAgcmV0dXJuIGFTZW50ZW5jZS5ldmVyeShmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgIHJldHVybiBjYXRlZ29yaWVzLmluZGV4T2Yob1dvcmQuY2F0ZWdvcnkpID49IDA7XG4gICAgfSk7XG4gIH0pXG59XG5cblxuaW1wb3J0ICogYXMgRXJiYXNlIGZyb20gJy4vZXJiYXNlJztcblxuXG5leHBvcnQgZnVuY3Rpb24gcHJvY2Vzc1N0cmluZyhxdWVyeTogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXNcbik6IElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzIHtcblxuLy8gIGlmICghcHJvY2Vzcy5lbnYuQUJPVF9PTERNQVRDSCkge1xuICAgIHJldHVybiBFcmJhc2UucHJvY2Vzc1N0cmluZyhxdWVyeSwgcnVsZXMsIHJ1bGVzLndvcmRDYWNoZSk7XG4vLyAgfVxuLypcbiAgdmFyIG1hdGNoZWQgPSBJbnB1dEZpbHRlci5hbmFseXplU3RyaW5nKHF1ZXJ5LCBydWxlcywgc1dvcmRzKTtcbiAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICBkZWJ1Z2xvZyhcIkFmdGVyIG1hdGNoZWQgXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkKSk7XG4gIH1cbiAgdmFyIGFTZW50ZW5jZXMgPSBJbnB1dEZpbHRlci5leHBhbmRNYXRjaEFycihtYXRjaGVkKTtcbiAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICBkZWJ1Z2xvZyhcImFmdGVyIGV4cGFuZFwiICsgYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgfSkuam9pbihcIlxcblwiKSk7XG4gIH1cbiAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gSW5wdXRGaWx0ZXIucmVpbkZvcmNlKGFTZW50ZW5jZXMpO1xuICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgIGRlYnVnbG9nKFwiYWZ0ZXIgcmVpbmZvcmNlXCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgfSkuam9pbihcIlxcblwiKSk7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBlcnJvcnM6IFtdLFxuICAgIHNlbnRlbmNlczogYVNlbnRlbmNlc1JlaW5mb3JjZWRcbiAgfSBhcyBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcztcbiovXG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVDb250ZXh0U3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMpOlxuICBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcyB7XG5cbiAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gcHJvY2Vzc1N0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKVxuICAvLyB3ZSBsaW1pdCBhbmFseXNpcyB0byBuIHNlbnRlbmNlc1xuICBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMgPSBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMuc2xpY2UoMCwgQWxnb2wuQ3V0b2ZmX1NlbnRlbmNlcyk7XG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgZGVidWdsb2coXCJhZnRlciByZWluZm9yY2UgYW5kIGN1dG9mZlwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLmxlbmd0aCArIFwiXFxuXCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICB9XG4gIHJldHVybiBhU2VudGVuY2VzUmVpbmZvcmNlZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNtcEJ5TnJDYXRlZ29yaWVzQW5kU2FtZURvbWFpbihhOiBJTWF0Y2guSVNlbnRlbmNlLCBiOiBJTWF0Y2guSVNlbnRlbmNlKTogbnVtYmVyIHtcbiAgLy9jb25zb2xlLmxvZyhcImNvbXBhcmUgYVwiICsgYSArIFwiIGNudGIgXCIgKyBiKTtcbiAgdmFyIGNudGEgPSBTZW50ZW5jZS5nZXREaXN0aW5jdENhdGVnb3JpZXNJblNlbnRlbmNlKGEpLmxlbmd0aDtcbiAgdmFyIGNudGIgPSBTZW50ZW5jZS5nZXREaXN0aW5jdENhdGVnb3JpZXNJblNlbnRlbmNlKGIpLmxlbmd0aDtcbiAgLypcbiAgICB2YXIgY250YSA9IGEucmVkdWNlKGZ1bmN0aW9uKHByZXYsIG9Xb3JkKSB7XG4gICAgICByZXR1cm4gcHJldiArICgob1dvcmQuY2F0ZWdvcnkgPT09IFwiY2F0ZWdvcnlcIik/IDEgOiAwKTtcbiAgICB9LDApO1xuICAgIHZhciBjbnRiID0gYi5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgb1dvcmQpIHtcbiAgICAgIHJldHVybiBwcmV2ICsgKChvV29yZC5jYXRlZ29yeSA9PT0gXCJjYXRlZ29yeVwiKT8gMSA6IDApO1xuICAgIH0sMCk7XG4gICAvLyBjb25zb2xlLmxvZyhcImNudCBhXCIgKyBjbnRhICsgXCIgY250YiBcIiArIGNudGIpO1xuICAgKi9cbiAgcmV0dXJuIGNudGIgLSBjbnRhO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZUNhdGVnb3J5TXVsdChjYXRlZ29yeWxpc3Q6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCB3aG9sZXNlbnRlbmNlOiBzdHJpbmcsIGdXb3JkczpcbiAgeyBba2V5OiBzdHJpbmddOiBJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW10gfSk6IHN0cmluZ1tdIHtcblxuXG5cblxuXG4gIHZhciByZXMgPSBhbmFseXplQ29udGV4dFN0cmluZyhjYXRlZ29yeWxpc3QsIHJ1bGVzKTtcbiAgLy8gIGRlYnVnbG9nKFwicmVzdWx0aW5nIGNhdGVnb3J5IHNlbnRlbmNlc1wiLCBKU09OLnN0cmluZ2lmeShyZXMpKTtcbiAgdmFyIHJlczIgPSBmaWx0ZXJBY2NlcHRpbmdPbmx5KHJlcy5zZW50ZW5jZXMsIFtcImNhdGVnb3J5XCIsIFwiZmlsbGVyXCJdKTtcbiAgLy8gIGNvbnNvbGUubG9nKFwiaGVyZSByZXMyXCIgKyBKU09OLnN0cmluZ2lmeShyZXMyKSApO1xuICAvLyAgY29uc29sZS5sb2coXCJoZXJlIHVuZGVmaW5lZCAhICsgXCIgKyByZXMyLmZpbHRlcihvID0+ICFvKS5sZW5ndGgpO1xuICByZXMyLnNvcnQoU2VudGVuY2UuY21wUmFua2luZ1Byb2R1Y3QpO1xuICBkZWJ1Z2xvZyhcInJlc3VsdGluZyBjYXRlZ29yeSBzZW50ZW5jZXM6IFxcblwiLCBkZWJ1Z2xvZy5lbmFibGVkID8gKFNlbnRlbmNlLmR1bXBOaWNlQXJyKHJlczIuc2xpY2UoMCwgMyksIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KSkgOiAnLScpO1xuICAvLyBUT0RPOiAgIHJlczIgPSBmaWx0ZXJBY2NlcHRpbmdPbmx5U2FtZURvbWFpbihyZXMyKTtcbiAgLy9kZWJ1Z2xvZyhcInJlc3VsdGluZyBjYXRlZ29yeSBzZW50ZW5jZXNcIiwgSlNPTi5zdHJpbmdpZnkocmVzMiwgdW5kZWZpbmVkLCAyKSk7XG4gIC8vIGV4cGVjdCBvbmx5IGNhdGVnb3JpZXNcbiAgLy8gd2UgY291bGQgcmFuayBub3cgYnkgY29tbW9uIGRvbWFpbnMgLCBidXQgZm9yIG5vdyB3ZSBvbmx5IHRha2UgdGhlIGZpcnN0IG9uZVxuICBpZiAoIXJlczIubGVuZ3RoKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICAvL3Jlcy5zb3J0KGNtcEJ5TnJDYXRlZ29yaWVzQW5kU2FtZURvbWFpbik7XG4gIHZhciByZXNjYXQgPSBTZW50ZW5jZS5nZXREaXN0aW5jdENhdGVnb3JpZXNJblNlbnRlbmNlKHJlczJbMF0pO1xuICByZXR1cm4gcmVzY2F0O1xuICAvLyBcIlwiIHJldHVybiByZXNbMF0uZmlsdGVyKClcbiAgLy8gcmV0dXJuIGNsYXNzaWZ5V29yZFdpdGhUYXJnZXRDYXRlZ29yeShjYXRlZ29yeWxpc3QsICdjYXRlZ29yeScsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVPcGVyYXRvcihvcHdvcmQ6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCB3aG9sZXNlbnRlbmNlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KG9wd29yZCwgJ29wZXJhdG9yJywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xufVxuXG5cbmltcG9ydCAqIGFzIEVyRXJyb3IgZnJvbSAnLi9lcmVycm9yJztcblxuaW1wb3J0ICogYXMgTGlzdEFsbCBmcm9tICcuL2xpc3RhbGwnO1xuLy8gY29uc3QgcmVzdWx0ID0gV2hhdElzLnJlc29sdmVDYXRlZ29yeShjYXQsIGExLmVudGl0eSxcbi8vICAgdGhlTW9kZWwubVJ1bGVzLCB0aGVNb2RlbC50b29scywgdGhlTW9kZWwucmVjb3Jkcyk7XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVDYXRlZ29yeShjYXRlZ29yeTogc3RyaW5nLCBjb250ZXh0UXVlcnlTdHJpbmc6IHN0cmluZyxcbiAgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4pOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnMge1xuICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB7IGVycm9yczogW0VyRXJyb3IubWFrZUVycm9yX0VNUFRZX0lOUFVUKCldLCB0b2tlbnM6IFtdLCBhbnN3ZXJzOiBbXSB9O1xuICB9IGVsc2Uge1xuICAgIC8qXG4gICAgICAgIHZhciBtYXRjaGVkID0gSW5wdXRGaWx0ZXIuYW5hbHl6ZVN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKTtcbiAgICAgICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImFmdGVyIG1hdGNoZWQgXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkKSk6ICctJyk7XG4gICAgICAgIHZhciBhU2VudGVuY2VzID0gSW5wdXRGaWx0ZXIuZXhwYW5kTWF0Y2hBcnIobWF0Y2hlZCk7XG4gICAgICAgIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgICBkZWJ1Z2xvZyhcImFmdGVyIGV4cGFuZFwiICsgYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgICAgICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgICB9ICovXG5cblxuICAgICAgICAgIC8vIHZhciBjYXRlZ29yeVNldCA9IE1vZGVsLmdldEFsbFJlY29yZENhdGVnb3JpZXNGb3JUYXJnZXRDYXRlZ29yeSh0aGVNb2RlbCwgY2F0LCB0cnVlKTtcblxuICAgIHZhciByZXMgPSBMaXN0QWxsLmxpc3RBbGxXaXRoQ29udGV4dChjYXRlZ29yeSwgY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcywgcmVjb3Jkcyk7XG4gICAgLy8qIHNvcnQgYnkgc2VudGVuY2VcbiAgICByZXMuYW5zd2Vycy5mb3JFYWNoKG8gPT4geyBvLl9yYW5raW5nID0gby5fcmFua2luZyAqICBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdCggby5zZW50ZW5jZSApOyB9KTtcbiAgICByZXMuYW5zd2Vycy5zb3J0KGNtcEJ5UmFua2luZyk7XG4gICAgcmV0dXJuIHJlcztcbi8qXG4gICAgLy8gPz8/IHZhciByZXMgPSBMaXN0QWxsLmxpc3RBbGxIYXZpbmdDb250ZXh0KGNhdGVnb3J5LCBjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzLCByZWNvcmRzKTtcblxuICAgIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IHByb2Nlc3NTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcyk7XG4gICAgLy9hU2VudGVuY2VzLm1hcChmdW5jdGlvbihvU2VudGVuY2UpIHsgcmV0dXJuIElucHV0RmlsdGVyLnJlaW5Gb3JjZShvU2VudGVuY2UpOyB9KTtcbiAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiYWZ0ZXIgcmVpbmZvcmNlXCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgIH0pLmpvaW4oXCJcXG5cIikpIDogJy0nKTtcbiAgICB2YXIgbWF0Y2hlZEFuc3dlcnMgPSBtYXRjaFJlY29yZHMoYVNlbnRlbmNlc1JlaW5mb3JjZWQsIGNhdGVnb3J5LCByZWNvcmRzKTsgLy9hVG9vbDogQXJyYXk8SU1hdGNoLklUb29sPik6IGFueSAvICogb2JqZWN0c3RyZWFtKiAvIHtcbiAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiIG1hdGNoZWRBbnN3ZXJzXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkQW5zd2VycywgdW5kZWZpbmVkLCAyKSkgOiAnLScpO1xuICAgIHJldHVybiBtYXRjaGVkQW5zd2VycztcbiovXG4gfVxufVxuXG4vKlxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVDYXRlZ29yeU9sZChjYXRlZ29yeTogc3RyaW5nLCBjb250ZXh0UXVlcnlTdHJpbmc6IHN0cmluZyxcbiAgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4pOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnMge1xuICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB7IGVycm9yczogW0VyRXJyb3IubWFrZUVycm9yX0VNUFRZX0lOUFVUKCldLCB0b2tlbnM6IFtdLCBhbnN3ZXJzOiBbXSB9O1xuICB9IGVsc2Uge1xuICAgIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IHByb2Nlc3NTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcyk7XG4gICAgLy9hU2VudGVuY2VzLm1hcChmdW5jdGlvbihvU2VudGVuY2UpIHsgcmV0dXJuIElucHV0RmlsdGVyLnJlaW5Gb3JjZShvU2VudGVuY2UpOyB9KTtcbiAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiYWZ0ZXIgcmVpbmZvcmNlXCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgIH0pLmpvaW4oXCJcXG5cIikpIDogJy0nKTtcbiAgICB2YXIgbWF0Y2hlZEFuc3dlcnMgPSBtYXRjaFJlY29yZHMoYVNlbnRlbmNlc1JlaW5mb3JjZWQsIGNhdGVnb3J5LCByZWNvcmRzKTsgLy9hVG9vbDogQXJyYXk8SU1hdGNoLklUb29sPik6IGFueSAvICogb2JqZWN0c3RyZWFtKiAvIHtcbiAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiIG1hdGNoZWRBbnN3ZXJzXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkQW5zd2VycywgdW5kZWZpbmVkLCAyKSkgOiAnLScpO1xuICAgIHJldHVybiBtYXRjaGVkQW5zd2VycztcbiAgfVxufVxuKi9cblxuaW1wb3J0ICogYXMgTW9kZWwgZnJvbSAnLi4vbW9kZWwvbW9kZWwnO1xuXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUNhdGVnb3JpZXMoY2F0ZWdvcmllczogc3RyaW5nW10sIGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLFxuICB0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMsIGRvbWFpbkNhdGVnb3J5RmlsdGVyIDogSU1hdGNoLklEb21haW5DYXRlZ29yeUZpbHRlcik6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzVHVwZWxBbnN3ZXJzIHtcbiAgdmFyIHJlY29yZHMgPSB0aGVNb2RlbC5yZWNvcmRzO1xuICB2YXIgcnVsZXMgPSB0aGVNb2RlbC5ydWxlcztcbiAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4ge1xuICAgICAgZXJyb3JzOiBbRXJFcnJvci5tYWtlRXJyb3JfRU1QVFlfSU5QVVQoKV0sXG4gICAgICB0dXBlbGFuc3dlcnM6IFtdLFxuICAgICAgdG9rZW5zOiBbXVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyB2YXIgY2F0ZWdvcnlTZXQgPSBNb2RlbC5nZXRBbGxSZWNvcmRDYXRlZ29yaWVzRm9yVGFyZ2V0Q2F0ZWdvcnkodGhlTW9kZWwsIGNhdCwgdHJ1ZSk7XG4gICAgdmFyIHJlcyA9IExpc3RBbGwubGlzdEFsbFR1cGVsV2l0aENvbnRleHQoY2F0ZWdvcmllcywgY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcywgcmVjb3JkcywgZG9tYWluQ2F0ZWdvcnlGaWx0ZXIpO1xuICAgIC8vKiBzb3J0IGJ5IHNlbnRlbmNlXG4gICAgcmVzLnR1cGVsYW5zd2Vycy5mb3JFYWNoKG8gPT4geyBvLl9yYW5raW5nID0gby5fcmFua2luZyAqICBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdCggby5zZW50ZW5jZSApOyB9KTtcbiAgICByZXMudHVwZWxhbnN3ZXJzLnNvcnQoY21wQnlSYW5raW5nVHVwZWwpO1xuICAgIHJldHVybiByZXM7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzSW5kaXNjcmltaW5hdGVSZXN1bHQocmVzdWx0czogQXJyYXk8SU1hdGNoLklXaGF0SXNBbnN3ZXI+KTogc3RyaW5nIHtcbiAgdmFyIGNudCA9IHJlc3VsdHMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCByZXN1bHQpIHtcbiAgICBpZiAoc2FmZUVxdWFsKHJlc3VsdC5fcmFua2luZyxyZXN1bHRzWzBdLl9yYW5raW5nKSkge1xuICAgICAgcmV0dXJuIHByZXYgKyAxO1xuICAgIH1cbiAgfSwgMCk7XG4gIGlmIChjbnQgPiAxKSB7XG4gICAgLy8gc2VhcmNoIGZvciBhIGRpc2NyaW1pbmF0aW5nIGNhdGVnb3J5IHZhbHVlXG4gICAgdmFyIGRpc2NyaW1pbmF0aW5nID0gT2JqZWN0LmtleXMocmVzdWx0c1swXS5yZWNvcmQpLnJlZHVjZShmdW5jdGlvbiAocHJldiwgY2F0ZWdvcnkpIHtcbiAgICAgIGlmICgoY2F0ZWdvcnkuY2hhckF0KDApICE9PSAnXycgJiYgY2F0ZWdvcnkgIT09IHJlc3VsdHNbMF0uY2F0ZWdvcnkpXG4gICAgICAgICYmIChyZXN1bHRzWzBdLnJlY29yZFtjYXRlZ29yeV0gIT09IHJlc3VsdHNbMV0ucmVjb3JkW2NhdGVnb3J5XSkpIHtcbiAgICAgICAgcHJldi5wdXNoKGNhdGVnb3J5KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIFtdKTtcbiAgICBpZiAoZGlzY3JpbWluYXRpbmcubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gXCJNYW55IGNvbXBhcmFibGUgcmVzdWx0cywgcGVyaGFwcyB5b3Ugd2FudCB0byBzcGVjaWZ5IGEgZGlzY3JpbWluYXRpbmcgXCIgKyBkaXNjcmltaW5hdGluZy5qb2luKCcsJyk7XG4gICAgfVxuICAgIHJldHVybiAnWW91ciBxdWVzdGlvbiBkb2VzIG5vdCBoYXZlIGEgc3BlY2lmaWMgYW5zd2VyJztcbiAgfVxuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdFR1cGVsKHJlc3VsdHM6IEFycmF5PElNYXRjaC5JV2hhdElzVHVwZWxBbnN3ZXI+KTogc3RyaW5nIHtcbiAgdmFyIGNudCA9IHJlc3VsdHMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCByZXN1bHQpIHtcbiAgICBpZiAoc2FmZUVxdWFsKHJlc3VsdC5fcmFua2luZyxyZXN1bHRzWzBdLl9yYW5raW5nKSkge1xuICAgICAgcmV0dXJuIHByZXYgKyAxO1xuICAgIH1cbiAgfSwgMCk7XG4gIGlmIChjbnQgPiAxKSB7XG4gICAgLy8gc2VhcmNoIGZvciBhIGRpc2NyaW1pbmF0aW5nIGNhdGVnb3J5IHZhbHVlXG4gICAgdmFyIGRpc2NyaW1pbmF0aW5nID0gT2JqZWN0LmtleXMocmVzdWx0c1swXS5yZWNvcmQpLnJlZHVjZShmdW5jdGlvbiAocHJldiwgY2F0ZWdvcnkpIHtcbiAgICAgIGlmICgoY2F0ZWdvcnkuY2hhckF0KDApICE9PSAnXycgJiYgcmVzdWx0c1swXS5jYXRlZ29yaWVzLmluZGV4T2YoY2F0ZWdvcnkpIDwgMClcbiAgICAgICAgJiYgKHJlc3VsdHNbMF0ucmVjb3JkW2NhdGVnb3J5XSAhPT0gcmVzdWx0c1sxXS5yZWNvcmRbY2F0ZWdvcnldKSkge1xuICAgICAgICBwcmV2LnB1c2goY2F0ZWdvcnkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgW10pO1xuICAgIGlmIChkaXNjcmltaW5hdGluZy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBcIk1hbnkgY29tcGFyYWJsZSByZXN1bHRzLCBwZXJoYXBzIHlvdSB3YW50IHRvIHNwZWNpZnkgYSBkaXNjcmltaW5hdGluZyBcIiArIGRpc2NyaW1pbmF0aW5nLmpvaW4oJywnKSArICcgb3IgdXNlIFwibGlzdCBhbGwgLi4uXCInO1xuICAgIH1cbiAgICByZXR1cm4gJ1lvdXIgcXVlc3Rpb24gZG9lcyBub3QgaGF2ZSBhIHNwZWNpZmljIGFuc3dlcic7XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbiIsIi8qKlxuICpcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmFuYWx5emVcbiAqIEBmaWxlIGFuYWx5emUudHNcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cbiAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgSW5wdXRGaWx0ZXIgPSByZXF1aXJlKFwiLi9pbnB1dEZpbHRlclwiKTtcbnZhciBkZWJ1ZyA9IHJlcXVpcmUoXCJkZWJ1Z1wiKTtcbnZhciBkZWJ1Z2xvZyA9IGRlYnVnKCd3aGF0aXMnKTtcbnZhciBkZWJ1Z2xvZ1YgPSBkZWJ1Zygnd2hhdFZpcycpO1xudmFyIHBlcmZsb2cgPSBkZWJ1ZygncGVyZicpO1xuZnVuY3Rpb24gbW9ja0RlYnVnKG8pIHtcbiAgICBkZWJ1Z2xvZyA9IG87XG4gICAgZGVidWdsb2dWID0gbztcbiAgICBwZXJmbG9nID0gbztcbn1cbmV4cG9ydHMubW9ja0RlYnVnID0gbW9ja0RlYnVnO1xudmFyIF8gPSByZXF1aXJlKFwibG9kYXNoXCIpO1xudmFyIE1hdGNoID0gcmVxdWlyZShcIi4vbWF0Y2hcIik7XG52YXIgU2VudGVuY2UgPSByZXF1aXJlKFwiLi9zZW50ZW5jZVwiKTtcbnZhciBXb3JkID0gcmVxdWlyZShcIi4vd29yZFwiKTtcbnZhciBBbGdvbCA9IHJlcXVpcmUoXCIuL2FsZ29sXCIpO1xuLypcbmV4cG9ydCBmdW5jdGlvbiBjbXBCeVJlc3VsdFRoZW5SYW5raW5nKGE6IElNYXRjaC5JV2hhdElzQW5zd2VyLCBiOiBJTWF0Y2guSVdoYXRJc0Fuc3dlcikge1xuICB2YXIgY21wID0gYS5yZXN1bHQubG9jYWxlQ29tcGFyZShiLnJlc3VsdCk7XG4gIGlmIChjbXApIHtcbiAgICByZXR1cm4gY21wO1xuICB9XG4gIHJldHVybiAtKGEuX3JhbmtpbmcgLSBiLl9yYW5raW5nKTtcbn1cbiovXG5mdW5jdGlvbiBsb2NhbGVDb21wYXJlQXJycyhhYXJlc3VsdCwgYmJyZXN1bHQpIHtcbiAgICB2YXIgY21wID0gMDtcbiAgICB2YXIgYmxlbiA9IGJicmVzdWx0Lmxlbmd0aDtcbiAgICBhYXJlc3VsdC5ldmVyeShmdW5jdGlvbiAoYSwgaW5kZXgpIHtcbiAgICAgICAgaWYgKGJsZW4gPD0gaW5kZXgpIHtcbiAgICAgICAgICAgIGNtcCA9IC0xO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGNtcCA9IGEubG9jYWxlQ29tcGFyZShiYnJlc3VsdFtpbmRleF0pO1xuICAgICAgICBpZiAoY21wKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgICByZXR1cm4gY21wO1xuICAgIH1cbiAgICBpZiAoYmxlbiA+IGFhcmVzdWx0Lmxlbmd0aCkge1xuICAgICAgICBjbXAgPSArMTtcbiAgICB9XG4gICAgcmV0dXJuIDA7XG59XG5mdW5jdGlvbiBzYWZlRXF1YWwoYSwgYikge1xuICAgIHZhciBkZWx0YSA9IGEgLSBiO1xuICAgIGlmIChNYXRoLmFicyhkZWx0YSkgPCBBbGdvbC5SQU5LSU5HX0VQU0lMT04pIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cbmV4cG9ydHMuc2FmZUVxdWFsID0gc2FmZUVxdWFsO1xuZnVuY3Rpb24gc2FmZURlbHRhKGEsIGIpIHtcbiAgICB2YXIgZGVsdGEgPSBhIC0gYjtcbiAgICBpZiAoTWF0aC5hYnMoZGVsdGEpIDwgQWxnb2wuUkFOS0lOR19FUFNJTE9OKSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICByZXR1cm4gZGVsdGE7XG59XG5leHBvcnRzLnNhZmVEZWx0YSA9IHNhZmVEZWx0YTtcbmZ1bmN0aW9uIGNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbChhYSwgYmIpIHtcbiAgICB2YXIgY21wID0gbG9jYWxlQ29tcGFyZUFycnMoYWEucmVzdWx0LCBiYi5yZXN1bHQpO1xuICAgIGlmIChjbXApIHtcbiAgICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG4gICAgcmV0dXJuIC1zYWZlRGVsdGEoYWEuX3JhbmtpbmcsIGJiLl9yYW5raW5nKTtcbn1cbmV4cG9ydHMuY21wQnlSZXN1bHRUaGVuUmFua2luZ1R1cGVsID0gY21wQnlSZXN1bHRUaGVuUmFua2luZ1R1cGVsO1xuZnVuY3Rpb24gY21wUmVjb3JkcyhhLCBiKSB7XG4gICAgLy8gYXJlIHJlY29yZHMgZGlmZmVyZW50P1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYSkuY29uY2F0KE9iamVjdC5rZXlzKGIpKS5zb3J0KCk7XG4gICAgdmFyIHJlcyA9IGtleXMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBzS2V5KSB7XG4gICAgICAgIGlmIChwcmV2KSB7XG4gICAgICAgICAgICByZXR1cm4gcHJldjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYltzS2V5XSAhPT0gYVtzS2V5XSkge1xuICAgICAgICAgICAgaWYgKCFiW3NLZXldKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFhW3NLZXldKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICsxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGFbc0tleV0ubG9jYWxlQ29tcGFyZShiW3NLZXldKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9LCAwKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5jbXBSZWNvcmRzID0gY21wUmVjb3JkcztcbmZ1bmN0aW9uIGNtcEJ5UmFua2luZyhhLCBiKSB7XG4gICAgdmFyIGNtcCA9IC1zYWZlRGVsdGEoYS5fcmFua2luZywgYi5fcmFua2luZyk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgICByZXR1cm4gY21wO1xuICAgIH1cbiAgICBjbXAgPSBhLnJlc3VsdC5sb2NhbGVDb21wYXJlKGIucmVzdWx0KTtcbiAgICBpZiAoY21wKSB7XG4gICAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuICAgIHJldHVybiBjbXBSZWNvcmRzKGEucmVjb3JkLCBiLnJlY29yZCk7XG59XG5leHBvcnRzLmNtcEJ5UmFua2luZyA9IGNtcEJ5UmFua2luZztcbmZ1bmN0aW9uIGNtcEJ5UmFua2luZ1R1cGVsKGEsIGIpIHtcbiAgICB2YXIgY21wID0gLXNhZmVEZWx0YShhLl9yYW5raW5nLCBiLl9yYW5raW5nKTtcbiAgICBpZiAoY21wKSB7XG4gICAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuICAgIGNtcCA9IGxvY2FsZUNvbXBhcmVBcnJzKGEucmVzdWx0LCBiLnJlc3VsdCk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgICByZXR1cm4gY21wO1xuICAgIH1cbiAgICByZXR1cm4gY21wUmVjb3JkcyhhLnJlY29yZCwgYi5yZWNvcmQpO1xufVxuZXhwb3J0cy5jbXBCeVJhbmtpbmdUdXBlbCA9IGNtcEJ5UmFua2luZ1R1cGVsO1xuZnVuY3Rpb24gZHVtcE5pY2UoYW5zd2VyKSB7XG4gICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgczogXCJcIixcbiAgICAgICAgcHVzaDogZnVuY3Rpb24gKHMpIHsgdGhpcy5zID0gdGhpcy5zICsgczsgfVxuICAgIH07XG4gICAgdmFyIHMgPSBcIioqUmVzdWx0IGZvciBjYXRlZ29yeTogXCIgKyBhbnN3ZXIuY2F0ZWdvcnkgKyBcIiBpcyBcIiArIGFuc3dlci5yZXN1bHQgKyBcIlxcbiByYW5rOiBcIiArIGFuc3dlci5fcmFua2luZyArIFwiXFxuXCI7XG4gICAgcmVzdWx0LnB1c2gocyk7XG4gICAgT2JqZWN0LmtleXMoYW5zd2VyLnJlY29yZCkuZm9yRWFjaChmdW5jdGlvbiAoc1JlcXVpcmVzLCBpbmRleCkge1xuICAgICAgICBpZiAoc1JlcXVpcmVzLmNoYXJBdCgwKSAhPT0gJ18nKSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaChcInJlY29yZDogXCIgKyBzUmVxdWlyZXMgKyBcIiAtPiBcIiArIGFuc3dlci5yZWNvcmRbc1JlcXVpcmVzXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0LnB1c2goJ1xcbicpO1xuICAgIH0pO1xuICAgIHZhciBvU2VudGVuY2UgPSBhbnN3ZXIuc2VudGVuY2U7XG4gICAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpbmRleCkge1xuICAgICAgICB2YXIgc1dvcmQgPSBcIltcIiArIGluZGV4ICsgXCJdIDogXCIgKyBvV29yZC5jYXRlZ29yeSArIFwiIFxcXCJcIiArIG9Xb3JkLnN0cmluZyArIFwiXFxcIiA9PiBcXFwiXCIgKyBvV29yZC5tYXRjaGVkU3RyaW5nICsgXCJcXFwiXCI7XG4gICAgICAgIHJlc3VsdC5wdXNoKHNXb3JkICsgXCJcXG5cIik7XG4gICAgfSk7XG4gICAgcmVzdWx0LnB1c2goXCIuXFxuXCIpO1xuICAgIHJldHVybiByZXN1bHQucztcbn1cbmV4cG9ydHMuZHVtcE5pY2UgPSBkdW1wTmljZTtcbmZ1bmN0aW9uIGR1bXBOaWNlVHVwZWwoYW5zd2VyKSB7XG4gICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgczogXCJcIixcbiAgICAgICAgcHVzaDogZnVuY3Rpb24gKHMpIHsgdGhpcy5zID0gdGhpcy5zICsgczsgfVxuICAgIH07XG4gICAgdmFyIHMgPSBcIioqUmVzdWx0IGZvciBjYXRlZ29yaWVzOiBcIiArIGFuc3dlci5jYXRlZ29yaWVzLmpvaW4oXCI7XCIpICsgXCIgaXMgXCIgKyBhbnN3ZXIucmVzdWx0ICsgXCJcXG4gcmFuazogXCIgKyBhbnN3ZXIuX3JhbmtpbmcgKyBcIlxcblwiO1xuICAgIHJlc3VsdC5wdXNoKHMpO1xuICAgIE9iamVjdC5rZXlzKGFuc3dlci5yZWNvcmQpLmZvckVhY2goZnVuY3Rpb24gKHNSZXF1aXJlcywgaW5kZXgpIHtcbiAgICAgICAgaWYgKHNSZXF1aXJlcy5jaGFyQXQoMCkgIT09ICdfJykge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2goXCJyZWNvcmQ6IFwiICsgc1JlcXVpcmVzICsgXCIgLT4gXCIgKyBhbnN3ZXIucmVjb3JkW3NSZXF1aXJlc10pO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdC5wdXNoKCdcXG4nKTtcbiAgICB9KTtcbiAgICB2YXIgb1NlbnRlbmNlID0gYW5zd2VyLnNlbnRlbmNlO1xuICAgIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaW5kZXgpIHtcbiAgICAgICAgdmFyIHNXb3JkID0gXCJbXCIgKyBpbmRleCArIFwiXSA6IFwiICsgb1dvcmQuY2F0ZWdvcnkgKyBcIiBcXFwiXCIgKyBvV29yZC5zdHJpbmcgKyBcIlxcXCIgPT4gXFxcIlwiICsgb1dvcmQubWF0Y2hlZFN0cmluZyArIFwiXFxcIlwiO1xuICAgICAgICByZXN1bHQucHVzaChzV29yZCArIFwiXFxuXCIpO1xuICAgIH0pO1xuICAgIHJlc3VsdC5wdXNoKFwiLlxcblwiKTtcbiAgICByZXR1cm4gcmVzdWx0LnM7XG59XG5leHBvcnRzLmR1bXBOaWNlVHVwZWwgPSBkdW1wTmljZVR1cGVsO1xuZnVuY3Rpb24gZHVtcFdlaWdodHNUb3AodG9vbG1hdGNoZXMsIG9wdGlvbnMpIHtcbiAgICB2YXIgcyA9ICcnO1xuICAgIHRvb2xtYXRjaGVzLmZvckVhY2goZnVuY3Rpb24gKG9NYXRjaCwgaW5kZXgpIHtcbiAgICAgICAgaWYgKGluZGV4IDwgb3B0aW9ucy50b3ApIHtcbiAgICAgICAgICAgIHMgPSBzICsgXCJXaGF0SXNBbnN3ZXJbXCIgKyBpbmRleCArIFwiXS4uLlxcblwiO1xuICAgICAgICAgICAgcyA9IHMgKyBkdW1wTmljZShvTWF0Y2gpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHM7XG59XG5leHBvcnRzLmR1bXBXZWlnaHRzVG9wID0gZHVtcFdlaWdodHNUb3A7XG5mdW5jdGlvbiBmaWx0ZXJEaXN0aW5jdFJlc3VsdEFuZFNvcnRUdXBlbChyZXMpIHtcbiAgICB2YXIgcmVzdWx0ID0gcmVzLnR1cGVsYW5zd2Vycy5maWx0ZXIoZnVuY3Rpb24gKGlSZXMsIGluZGV4KSB7XG4gICAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZygnIHJldGFpbiB0dXBlbCAnICsgaW5kZXggKyAnICcgKyBKU09OLnN0cmluZ2lmeShpUmVzKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKF8uaXNFcXVhbChpUmVzLnJlc3VsdCwgcmVzLnR1cGVsYW5zd2Vyc1tpbmRleCAtIDFdICYmIHJlcy50dXBlbGFuc3dlcnNbaW5kZXggLSAxXS5yZXN1bHQpKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZygnc2tpcCcpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIHJlc3VsdC5zb3J0KGNtcEJ5UmFua2luZ1R1cGVsKTtcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihyZXMsIHsgdHVwZWxhbnN3ZXJzOiByZXN1bHQgfSk7XG59XG5leHBvcnRzLmZpbHRlckRpc3RpbmN0UmVzdWx0QW5kU29ydFR1cGVsID0gZmlsdGVyRGlzdGluY3RSZXN1bHRBbmRTb3J0VHVwZWw7XG5mdW5jdGlvbiBmaWx0ZXJPbmx5VG9wUmFua2VkKHJlc3VsdHMpIHtcbiAgICB2YXIgcmVzID0gcmVzdWx0cy5maWx0ZXIoZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICBpZiAoc2FmZUVxdWFsKHJlc3VsdC5fcmFua2luZywgcmVzdWx0c1swXS5fcmFua2luZykpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQuX3JhbmtpbmcgPj0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTGlzdCB0byBmaWx0ZXIgbXVzdCBiZSBvcmRlcmVkXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5maWx0ZXJPbmx5VG9wUmFua2VkID0gZmlsdGVyT25seVRvcFJhbmtlZDtcbmZ1bmN0aW9uIGZpbHRlck9ubHlUb3BSYW5rZWRUdXBlbChyZXN1bHRzKSB7XG4gICAgdmFyIHJlcyA9IHJlc3VsdHMuZmlsdGVyKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgaWYgKHNhZmVFcXVhbChyZXN1bHQuX3JhbmtpbmcsIHJlc3VsdHNbMF0uX3JhbmtpbmcpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0Ll9yYW5raW5nID49IHJlc3VsdHNbMF0uX3JhbmtpbmcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkxpc3QgdG8gZmlsdGVyIG11c3QgYmUgb3JkZXJlZFwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZmlsdGVyT25seVRvcFJhbmtlZFR1cGVsID0gZmlsdGVyT25seVRvcFJhbmtlZFR1cGVsO1xuLyoqXG4gKiBBIHJhbmtpbmcgd2hpY2ggaXMgcHVyZWx5IGJhc2VkIG9uIHRoZSBudW1iZXJzIG9mIG1hdGNoZWQgZW50aXRpZXMsXG4gKiBkaXNyZWdhcmRpbmcgZXhhY3RuZXNzIG9mIG1hdGNoXG4gKi9cbi8qXG5leHBvcnQgZnVuY3Rpb24gY2FsY1JhbmtpbmdTaW1wbGUobWF0Y2hlZDogbnVtYmVyLFxuICBtaXNtYXRjaGVkOiBudW1iZXIsIG5vdXNlOiBudW1iZXIsXG4gIHJlbGV2YW50Q291bnQ6IG51bWJlcik6IG51bWJlciB7XG4gIC8vIDIgOiAwXG4gIC8vIDEgOiAwXG4gIHZhciBmYWN0b3IgPSBtYXRjaGVkICogTWF0aC5wb3coMS41LCBtYXRjaGVkKSAqIE1hdGgucG93KDEuNSwgbWF0Y2hlZCk7XG4gIHZhciBmYWN0b3IyID0gTWF0aC5wb3coMC40LCBtaXNtYXRjaGVkKTtcbiAgdmFyIGZhY3RvcjMgPSBNYXRoLnBvdygwLjQsIG5vdXNlKTtcbiAgcmV0dXJuIE1hdGgucG93KGZhY3RvcjIgKiBmYWN0b3IgKiBmYWN0b3IzLCAxIC8gKG1pc21hdGNoZWQgKyBtYXRjaGVkICsgbm91c2UpKTtcbn1cbiovXG5mdW5jdGlvbiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCByZWxldmFudENvdW50LCBoYXNEb21haW4pIHtcbiAgICB2YXIgbGVuTWF0Y2hlZCA9IE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aDtcbiAgICB2YXIgZmFjdG9yID0gTWF0Y2guY2FsY1JhbmtpbmdQcm9kdWN0KG1hdGNoZWQpO1xuICAgIGZhY3RvciAqPSBNYXRoLnBvdygxLjUsIGxlbk1hdGNoZWQpO1xuICAgIGlmIChoYXNEb21haW4pIHtcbiAgICAgICAgZmFjdG9yICo9IDEuNTtcbiAgICB9XG4gICAgdmFyIGxlbkhhc0NhdGVnb3J5ID0gT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aDtcbiAgICB2YXIgZmFjdG9ySCA9IE1hdGgucG93KDEuMSwgbGVuSGFzQ2F0ZWdvcnkpO1xuICAgIHZhciBsZW5NaXNNYXRjaGVkID0gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoO1xuICAgIHZhciBmYWN0b3IyID0gTWF0Y2guY2FsY1JhbmtpbmdQcm9kdWN0KG1pc21hdGNoZWQpO1xuICAgIGZhY3RvcjIgKj0gTWF0aC5wb3coMC40LCBsZW5NaXNNYXRjaGVkKTtcbiAgICB2YXIgZGl2aXNvciA9IChsZW5NaXNNYXRjaGVkICsgbGVuSGFzQ2F0ZWdvcnkgKyBsZW5NYXRjaGVkKTtcbiAgICBkaXZpc29yID0gZGl2aXNvciA/IGRpdmlzb3IgOiAxO1xuICAgIHJldHVybiBNYXRoLnBvdyhmYWN0b3IyICogZmFjdG9ySCAqIGZhY3RvciwgMSAvIChkaXZpc29yKSk7XG59XG5leHBvcnRzLmNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkgPSBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5O1xuLyoqXG4gKiBsaXN0IGFsbCB0b3AgbGV2ZWwgcmFua2luZ3NcbiAqL1xuLypcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFJlY29yZHNIYXZpbmdDb250ZXh0KFxuICBwU2VudGVuY2VzOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcywgY2F0ZWdvcnk6IHN0cmluZywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+LFxuICBjYXRlZ29yeVNldDogeyBba2V5OiBzdHJpbmddOiBib29sZWFuIH0pXG4gIDogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzIHtcblxuICAvL2RlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZHMsIHVuZGVmaW5lZCwgMikpO1xuICB2YXIgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZDogSU1hdGNoLklSZWNvcmQpIHtcbiAgICByZXR1cm4gKHJlY29yZFtjYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkgJiYgKHJlY29yZFtjYXRlZ29yeV0gIT09IG51bGwpO1xuICB9KTtcbiAgdmFyIHJlcyA9IFtdO1xuICBkZWJ1Z2xvZyhcIk1hdGNoUmVjb3Jkc0hhdmluZ0NvbnRleHQgOiByZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCk7XG4gIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJzZW50ZW5jZXMgYXJlIDogXCIgKyBKU09OLnN0cmluZ2lmeShwU2VudGVuY2VzLCB1bmRlZmluZWQsIDIpKSA6IFwiLVwiKTtcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImNhdGVnb3J5IFwiICsgY2F0ZWdvcnkgKyBcIiBhbmQgY2F0ZWdvcnlzZXQgaXM6IFwiICsgSlNPTi5zdHJpbmdpZnkoY2F0ZWdvcnlTZXQsIHVuZGVmaW5lZCwgMikpIDogXCItXCIpO1xuICBpZiAocHJvY2Vzcy5lbnYuQUJPVF9GQVNUICYmIGNhdGVnb3J5U2V0KSB7XG4gICAgLy8gd2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbiBjYXRlZ29yaWVzIHByZXNlbnQgaW4gcmVjb3JkcyBmb3IgZG9tYWlucyB3aGljaCBjb250YWluIHRoZSBjYXRlZ29yeVxuICAgIC8vIHZhciBjYXRlZ29yeXNldCA9IE1vZGVsLmNhbGN1bGF0ZVJlbGV2YW50UmVjb3JkQ2F0ZWdvcmllcyh0aGVNb2RlbCxjYXRlZ29yeSk7XG4gICAgLy9rbm93aW5nIHRoZSB0YXJnZXRcbiAgICBwZXJmbG9nKFwiZ290IGNhdGVnb3J5c2V0IHdpdGggXCIgKyBPYmplY3Qua2V5cyhjYXRlZ29yeVNldCkubGVuZ3RoKTtcbiAgICB2YXIgZmwgPSAwO1xuICAgIHZhciBsZiA9IDA7XG4gICAgdmFyIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gcFNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIHZhciBmV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICByZXR1cm4gIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCk7XG4gICAgICB9KTtcbiAgICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICByZXR1cm4gISFjYXRlZ29yeVNldFtvV29yZC5jYXRlZ29yeV0gfHwgV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpO1xuICAgICAgfSk7XG4gICAgICBmbCA9IGZsICsgb1NlbnRlbmNlLmxlbmd0aDtcbiAgICAgIGxmID0gbGYgKyByV29yZHMubGVuZ3RoO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsIC8vIG5vdCBhIGZpbGxlciAgLy8gdG8gYmUgY29tcGF0aWJsZSBpdCB3b3VsZCBiZSBmV29yZHNcbiAgICAgICAgcldvcmRzOiByV29yZHNcbiAgICAgIH07XG4gICAgfSk7XG4gICAgT2JqZWN0LmZyZWV6ZShhU2ltcGxpZmllZFNlbnRlbmNlcyk7XG4gICAgZGVidWdsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIGZsICsgXCItPlwiICsgbGYgKyBcIilcIik7XG4gICAgcGVyZmxvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgZmwgKyBcIi0+XCIgKyBsZiArIFwiKVwiKTtcbiAgICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICBhU2ltcGxpZmllZFNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgICAgdmFyIGhhc0NhdGVnb3J5ID0ge307XG4gICAgICAgIHZhciBtaXNtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gYVNlbnRlbmNlLmNudFJlbGV2YW50V29yZHM7XG4gICAgICAgIGFTZW50ZW5jZS5yV29yZHMuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgIG1hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpICYmIHJlY29yZFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgaGFzQ2F0ZWdvcnlbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSAxO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgICBpZiAoKE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aCArIE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5sZW5ndGgpID4gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoKSB7XG4gICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgc2VudGVuY2U6IGFTZW50ZW5jZS5vU2VudGVuY2UsXG4gICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICAgIHJlc3VsdDogcmVjb3JkW2NhdGVnb3J5XSxcbiAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0pO1xuICAgIGRlYnVnbG9nKFwiaGVyZSBpbiB3ZWlyZFwiKTtcbiAgfSBlbHNlIHtcbiAgICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICBwU2VudGVuY2VzLnNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgICAgdmFyIGhhc0NhdGVnb3J5ID0ge307XG4gICAgICAgIHZhciBtaXNtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gMDtcbiAgICAgICAgYVNlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgaWYgKCFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpKSB7XG4gICAgICAgICAgICBjbnRSZWxldmFudFdvcmRzID0gY250UmVsZXZhbnRXb3JkcyArIDE7XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKSAmJiByZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgICAgaGFzQ2F0ZWdvcnlbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICgoT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoICsgT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aCkgPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLFxuICAgICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgICByZXN1bHQ6IHJlY29yZFtjYXRlZ29yeV0sXG4gICAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KTtcbiAgfVxuICByZXMuc29ydChjbXBCeVJlc3VsdFRoZW5SYW5raW5nKTtcbiAgZGVidWdsb2coXCIgYWZ0ZXIgc29ydFwiICsgcmVzLmxlbmd0aCk7XG4gIHZhciByZXN1bHQgPSBPYmplY3QuYXNzaWduKHt9LCBwU2VudGVuY2VzLCB7IGFuc3dlcnM6IHJlcyB9KTtcbiAgcmV0dXJuIGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdChyZXN1bHQpO1xufVxuKi9cbi8qXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hSZWNvcmRzKGFTZW50ZW5jZXM6IElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzLCBjYXRlZ29yeTogc3RyaW5nLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4pXG4gIDogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzIHtcbiAgLy8gaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgLy8gICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRzLCB1bmRlZmluZWQsIDIpKTtcbiAgLy8gfVxuICB2YXIgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZDogSU1hdGNoLklSZWNvcmQpIHtcbiAgICByZXR1cm4gKHJlY29yZFtjYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkgJiYgKHJlY29yZFtjYXRlZ29yeV0gIT09IG51bGwpO1xuICB9KTtcbiAgdmFyIHJlcyA9IFtdO1xuICBkZWJ1Z2xvZyhcInJlbGV2YW50IHJlY29yZHMgbnI6XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoKTtcbiAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgIGFTZW50ZW5jZXMuc2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fVxuICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gMDtcbiAgICAgIGFTZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICBpZiAoIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCkpIHtcbiAgICAgICAgICBjbnRSZWxldmFudFdvcmRzID0gY250UmVsZXZhbnRXb3JkcyArIDE7XG4gICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICYmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgaWYgKE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aCA+IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aCkge1xuICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgc2VudGVuY2U6IGFTZW50ZW5jZSxcbiAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgcmVzdWx0OiByZWNvcmRbY2F0ZWdvcnldLFxuICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZyhtYXRjaGVkLCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KVxuICB9KTtcbiAgcmVzLnNvcnQoY21wQnlSZXN1bHRUaGVuUmFua2luZyk7XG4gIHZhciByZXN1bHQgPSBPYmplY3QuYXNzaWduKHt9LCBhU2VudGVuY2VzLCB7IGFuc3dlcnM6IHJlcyB9KTtcbiAgcmV0dXJuIGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdChyZXN1bHQpO1xufVxuKi9cbi8qXG5mdW5jdGlvbiBtYWtlU2ltcGxpZmllZFNlbnRlbmNlc0NhdGVnb3J5U2V0KGFTZW50ZW5jZXM6IElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzLFxuICBjYXRlZ29yeVNldDogeyBba2V5OiBzdHJpbmddOiBib29sZWFuIH0sIHRyYWNrOiB7IGZsOiBudW1iZXIsIGxmOiBudW1iZXIgfVxuKToge1xuICBkb21haW5zOiBzdHJpbmdbXSxcbiAgb1NlbnRlbmNlOiBJTWF0Y2guSVNlbnRlbmNlLFxuICBjbnRSZWxldmFudFdvcmRzOiBudW1iZXIsXG4gIHJXb3JkczogSU1hdGNoLklXb3JkW11cbn1bXSB7XG4gIHJldHVybiBhU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgIHZhciBhRG9tYWlucyA9IFtdIGFzIHN0cmluZ1tdO1xuICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcImRvbWFpblwiKSB7XG4gICAgICAgIGFEb21haW5zLnB1c2gob1dvcmQubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJtZXRhXCIpIHtcbiAgICAgICAgLy8gZS5nLiBkb21haW4gWFhYXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAhIWNhdGVnb3J5U2V0W29Xb3JkLmNhdGVnb3J5XTtcbiAgICB9KTtcbiAgICB0cmFjay5mbCArPSBvU2VudGVuY2UubGVuZ3RoO1xuICAgIHRyYWNrLmxmICs9IHJXb3Jkcy5sZW5ndGg7XG4gICAgcmV0dXJuIHtcbiAgICAgIGRvbWFpbnM6IGFEb21haW5zLFxuICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLFxuICAgICAgcldvcmRzOiByV29yZHNcbiAgICB9O1xuICB9KTtcbn1cbiovXG5mdW5jdGlvbiBtYWtlU2ltcGxpZmllZFNlbnRlbmNlc0NhdGVnb3J5U2V0MihhU2VudGVuY2VzLCBjYXRlZ29yeVNldCwgdHJhY2spIHtcbiAgICByZXR1cm4gYVNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgdmFyIGFEb21haW5zID0gW107XG4gICAgICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcImRvbWFpblwiKSB7XG4gICAgICAgICAgICAgICAgYURvbWFpbnMucHVzaChvV29yZC5tYXRjaGVkU3RyaW5nKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwibWV0YVwiKSB7XG4gICAgICAgICAgICAgICAgLy8gZS5nLiBkb21haW4gWFhYXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcImNhdGVnb3J5XCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2F0ZWdvcnlTZXRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICEhY2F0ZWdvcnlTZXRbb1dvcmQuY2F0ZWdvcnldO1xuICAgICAgICB9KTtcbiAgICAgICAgdHJhY2suZmwgKz0gb1NlbnRlbmNlLmxlbmd0aDtcbiAgICAgICAgdHJhY2subGYgKz0gcldvcmRzLmxlbmd0aDtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRvbWFpbnM6IGFEb21haW5zLFxuICAgICAgICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICAgICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLFxuICAgICAgICAgICAgcldvcmRzOiByV29yZHNcbiAgICAgICAgfTtcbiAgICB9KTtcbn1cbmZ1bmN0aW9uIG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzKGFTZW50ZW5jZXMsIHRyYWNrKSB7XG4gICAgcmV0dXJuIGFTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgIHZhciBkb21haW5zID0gW107XG4gICAgICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcImRvbWFpblwiKSB7XG4gICAgICAgICAgICAgICAgZG9tYWlucy5wdXNoKG9Xb3JkLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJtZXRhXCIpIHtcbiAgICAgICAgICAgICAgICAvLyBlLmcuIGRvbWFpbiBYWFhcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0cmFjay5mbCArPSBvU2VudGVuY2UubGVuZ3RoO1xuICAgICAgICB0cmFjay5sZiArPSByV29yZHMubGVuZ3RoO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICAgICAgICBkb21haW5zOiBkb21haW5zLFxuICAgICAgICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCxcbiAgICAgICAgICAgIHJXb3JkczogcldvcmRzXG4gICAgICAgIH07XG4gICAgfSk7XG59XG5mdW5jdGlvbiBleHRyYWN0UmVzdWx0KGNhdGVnb3JpZXMsIHJlY29yZCkge1xuICAgIHJldHVybiBjYXRlZ29yaWVzLm1hcChmdW5jdGlvbiAoY2F0ZWdvcnkpIHsgcmV0dXJuIHJlY29yZFtjYXRlZ29yeV0gfHwgXCJuL2FcIjsgfSk7XG59XG5mdW5jdGlvbiBtYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcyhwU2VudGVuY2VzLCBjYXRlZ29yaWVzLCByZWNvcmRzLCBkb21haW5DYXRlZ29yeUZpbHRlcikge1xuICAgIC8vIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgLy8gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZHMsIHVuZGVmaW5lZCwgMikpO1xuICAgIC8vIH1cbiAgICBpZiAoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIgJiYgIWRvbWFpbkNhdGVnb3J5RmlsdGVyLmRvbWFpbnMpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwib2xkIGNhdGVnb3J5c1NFdCA/P1wiKTtcbiAgICB9XG4gICAgT2JqZWN0LmZyZWV6ZShkb21haW5DYXRlZ29yeUZpbHRlcik7XG4gICAgdmFyIGNhdGVnb3J5RiA9IGNhdGVnb3JpZXNbMF07XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcIm1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzIChyPVwiICsgKHJlY29yZHMgJiYgcmVjb3Jkcy5sZW5ndGgpXG4gICAgICAgICsgXCIgcz1cIiArIChwU2VudGVuY2VzICYmIHBTZW50ZW5jZXMuc2VudGVuY2VzICYmIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCkgKyBcIilcXG4gY2F0ZWdvcmllczpcIiArIChjYXRlZ29yaWVzICYmIGNhdGVnb3JpZXMuam9pbihcIlxcblwiKSkgKyBcIiBjYXRlZ29yeVNldDogXCJcbiAgICAgICAgKyAoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIgJiYgKHR5cGVvZiBkb21haW5DYXRlZ29yeUZpbHRlci5jYXRlZ29yeVNldCA9PT0gXCJvYmplY3RcIikgJiYgT2JqZWN0LmtleXMoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIuY2F0ZWdvcnlTZXQpLmpvaW4oXCJcXG5cIikpKSA6IFwiLVwiKTtcbiAgICBwZXJmbG9nKFwibWF0Y2hSZWNvcmRzUXVpY2tNdWx0IC4uLihyPVwiICsgcmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIpXCIpO1xuICAgIC8vY29uc29sZS5sb2coJ2NhdGVnb3JpZXMgJyArICBKU09OLnN0cmluZ2lmeShjYXRlZ29yaWVzKSk7XG4gICAgLy9jb25zb2xlLmxvZygnY2F0ZWdyb3lTZXQnICsgIEpTT04uc3RyaW5naWZ5KGNhdGVnb3J5U2V0KSk7XG4gICAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHM7XG4gICAgaWYgKGRvbWFpbkNhdGVnb3J5RmlsdGVyICYmIGRvbWFpbkNhdGVnb3J5RmlsdGVyLmRvbWFpbnMpIHtcbiAgICAgICAgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICAgICAgcmV0dXJuIChkb21haW5DYXRlZ29yeUZpbHRlci5kb21haW5zLmluZGV4T2YocmVjb3JkLl9kb21haW4pID49IDApO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJlbGV2YW50UmVjb3JkcyA9IHJlbGV2YW50UmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICAgICAgcmV0dXJuICFjYXRlZ29yaWVzLmV2ZXJ5KGZ1bmN0aW9uIChjYXQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHJlY29yZFtjYXRdID09PSB1bmRlZmluZWQpIHx8IChyZWNvcmRbY2F0XSA9PT0gbnVsbCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIC8vICAgICAgfVxuICAgICAgICAgICAgLy8gICAgIHJldHVybiAocmVjb3JkW2NhdGVnb3J5Rl0gIT09IHVuZGVmaW5lZCkgJiYgKHJlY29yZFtjYXRlZ29yeUZdICE9PSBudWxsKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHZhciByZXMgPSBbXTtcbiAgICBkZWJ1Z2xvZyhcInJlbGV2YW50IHJlY29yZHMgd2l0aCBmaXJzdCAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIilcIik7XG4gICAgcGVyZmxvZyhcInJlbGV2YW50IHJlY29yZHMgd2l0aCBmaXJzdCBucjpcIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzZW50ZW5jZXMgXCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGgpO1xuICAgIGlmIChkb21haW5DYXRlZ29yeUZpbHRlcikge1xuICAgICAgICAvLyB3ZSBhcmUgb25seSBpbnRlcmVzdGVkIGluIGNhdGVnb3JpZXMgcHJlc2VudCBpbiByZWNvcmRzIGZvciBkb21haW5zIHdoaWNoIGNvbnRhaW4gdGhlIGNhdGVnb3J5XG4gICAgICAgIC8vIHZhciBjYXRlZ29yeXNldCA9IE1vZGVsLmNhbGN1bGF0ZVJlbGV2YW50UmVjb3JkQ2F0ZWdvcmllcyh0aGVNb2RlbCxjYXRlZ29yeSk7XG4gICAgICAgIC8va25vd2luZyB0aGUgdGFyZ2V0XG4gICAgICAgIHBlcmZsb2coXCJnb3QgY2F0ZWdvcnlzZXQgd2l0aCBcIiArIE9iamVjdC5rZXlzKGRvbWFpbkNhdGVnb3J5RmlsdGVyLmNhdGVnb3J5U2V0KS5sZW5ndGgpO1xuICAgICAgICB2YXIgb2JqID0geyBmbDogMCwgbGY6IDAgfTtcbiAgICAgICAgdmFyIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gW107XG4gICAgICAgIC8vICBpZiAocHJvY2Vzcy5lbnYuQUJPVF9CRVQxKSB7XG4gICAgICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXNDYXRlZ29yeVNldDIocFNlbnRlbmNlcywgZG9tYWluQ2F0ZWdvcnlGaWx0ZXIuY2F0ZWdvcnlTZXQsIG9iaik7XG4gICAgICAgIC8vICB9IGVsc2Uge1xuICAgICAgICAvLyAgICBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzQ2F0ZWdvcnlTZXQocFNlbnRlbmNlcywgY2F0ZWdvcnlTZXQsIG9iaikgYXMgYW55O1xuICAgICAgICAvLyAgfVxuICAgICAgICBwZXJmbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyBvYmouZmwgKyBcIi0+XCIgKyBvYmoubGYgKyBcIilcIik7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBkZWJ1Z2xvZyhcIm5vdCBhYm90X2Zhc3QgIVwiKTtcbiAgICAgICAgdmFyIHRyYWNrID0geyBmbDogMCwgbGY6IDAgfTtcbiAgICAgICAgdmFyIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXMocFNlbnRlbmNlcywgdHJhY2spO1xuICAgICAgICAvKlxuICAgICAgICAgICAgcFNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgICAgICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgZmwgPSBmbCArIG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgICAgICAgICAgIGxmID0gbGYgKyByV29yZHMubGVuZ3RoO1xuICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgICAgICAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgcldvcmRzOiByV29yZHNcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgKi9cbiAgICAgICAgZGVidWdsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIHRyYWNrLmZsICsgXCItPlwiICsgdHJhY2subGYgKyBcIilcIik7XG4gICAgICAgIHBlcmZsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIHRyYWNrLmZsICsgXCItPlwiICsgdHJhY2subGYgKyBcIilcIik7XG4gICAgfVxuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJoZXJlIHNpbXBsaWZpZWQgc2VudGVuY2VzIFwiICtcbiAgICAgICAgYVNpbXBsaWZpZWRTZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvKSB7IHJldHVybiBcIlxcbkRvbWFpbj1cIiArIG8uZG9tYWlucy5qb2luKFwiXFxuXCIpICsgXCJcXG5cIiArIFNlbnRlbmNlLmR1bXBOaWNlKG8ucldvcmRzKTsgfSkuam9pbihcIlxcblwiKSkgOiBcIi1cIik7XG4gICAgLy9jb25zb2xlLmxvZyhcImhlcmUgcmVjcm9kc1wiICsgcmVsZXZhbnRSZWNvcmRzLm1hcCggKG8saW5kZXgpID0+ICBcIiBpbmRleCA9IFwiICsgaW5kZXggKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KG8pKS5qb2luKFwiXFxuXCIpKTtcbiAgICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgICAgICAgdmFyIGltaXNtYXRjaGVkID0gMDtcbiAgICAgICAgICAgIHZhciBpbWF0Y2hlZCA9IDA7XG4gICAgICAgICAgICB2YXIgbm91c2UgPSAwO1xuICAgICAgICAgICAgdmFyIGZvdW5kY2F0ID0gMTtcbiAgICAgICAgICAgIHZhciBtaXNzaW5nY2F0ID0gMDtcbiAgICAgICAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICAgICAgICB2YXIgbWlzbWF0Y2hlZCA9IHt9O1xuICAgICAgICAgICAgdmFyIGhhc0NhdGVnb3J5ID0ge307XG4gICAgICAgICAgICBhU2VudGVuY2UucldvcmRzLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSAwO1xuICAgICAgICAgICAgICAgIGlmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICsraW1hdGNoZWQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICArK2ltaXNtYXRjaGVkO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgIT09IFwiY2F0ZWdvcnlcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm91c2UgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWlzc2luZ2NhdCArPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm91bmRjYXQgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKSAmJiByZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgICAgICAgICAgaGFzQ2F0ZWdvcnlbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmICghV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRPRE8gYmV0dGVyIHVubWFjaHRlZFxuICAgICAgICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdmFyIG1hdGNoZWREb21haW4gPSAwO1xuICAgICAgICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSBhU2VudGVuY2UucldvcmRzLmxlbmd0aDtcbiAgICAgICAgICAgIGlmIChhU2VudGVuY2UuZG9tYWlucy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVjb3JkLl9kb21haW4gIT09IGFTZW50ZW5jZS5kb21haW5zWzBdKSB7XG4gICAgICAgICAgICAgICAgICAgIGltaXNtYXRjaGVkID0gMzAwMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGltYXRjaGVkICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWREb21haW4gKz0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgbWF0Y2hlZExlbiA9IE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aCArIE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5sZW5ndGg7XG4gICAgICAgICAgICB2YXIgbWlzbWF0Y2hlZExlbiA9IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aDtcbiAgICAgICAgICAgIGlmICgoaW1pc21hdGNoZWQgPCAzMDAwKVxuICAgICAgICAgICAgICAgICYmICgobWF0Y2hlZExlbiA+IG1pc21hdGNoZWRMZW4pXG4gICAgICAgICAgICAgICAgICAgIHx8IChtYXRjaGVkTGVuID09PSBtaXNtYXRjaGVkTGVuICYmIG1hdGNoZWREb21haW4gPiAwKSkpIHtcbiAgICAgICAgICAgICAgICAvKlxuICAgICAgICAgICAgICAgICAgZGVidWdsb2coXCJhZGRpbmcgXCIgKyBleHRyYWN0UmVzdWx0KGNhdGVnb3JpZXMscmVjb3JkKS5qb2luKFwiO1wiKSk7XG4gICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcIndpdGggcmFua2luZyA6IFwiICsgY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeTIobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMsIG1hdGNoZWREb21haW4pKTtcbiAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKFwiIGNyZWF0ZWQgYnkgXCIgKyBPYmplY3Qua2V5cyhtYXRjaGVkKS5tYXAoa2V5ID0+IFwia2V5OlwiICsga2V5XG4gICAgICAgICAgICAgICAgICArIFwiXFxuXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkW2tleV0pKS5qb2luKFwiXFxuXCIpXG4gICAgICAgICAgICAgICAgICArIFwiXFxuaGFzQ2F0IFwiICsgSlNPTi5zdHJpbmdpZnkoaGFzQ2F0ZWdvcnkpXG4gICAgICAgICAgICAgICAgICArIFwiXFxubWlzbWF0IFwiICsgSlNPTi5zdHJpbmdpZnkobWlzbWF0Y2hlZClcbiAgICAgICAgICAgICAgICAgICsgXCJcXG5jblRyZWwgXCIgKyBKU09OLnN0cmluZ2lmeShjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICAgICAgICAgICAgKyBcIlxcbm1hdGNlZERvbWFpbiBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWREb21haW4pXG4gICAgICAgICAgICAgICAgICArIFwiXFxuaGFzQ2F0IFwiICsgT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpXG4gICAgICAgICAgICAgICAgICArIFwiXFxubWlzbWF0IFwiICsgT2JqZWN0LmtleXMobWlzbWF0Y2hlZClcbiAgICAgICAgICAgICAgICAgICsgYFxcbm1hdGNoZWQgJHtPYmplY3Qua2V5cyhtYXRjaGVkKX0gXFxuaGFzY2F0ICR7T2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmpvaW4oXCI7IFwiKX0gXFxubWlzbTogJHtPYmplY3Qua2V5cyhtaXNtYXRjaGVkKX0gXFxuYFxuICAgICAgICAgICAgICAgICAgKyBcIlxcbm1hdGNlZERvbWFpbiBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWREb21haW4pXG4gICAgICAgIFxuICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgdmFyIHJlYyA9IHtcbiAgICAgICAgICAgICAgICAgICAgc2VudGVuY2U6IGFTZW50ZW5jZS5vU2VudGVuY2UsXG4gICAgICAgICAgICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yaWVzOiBjYXRlZ29yaWVzLFxuICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IGV4dHJhY3RSZXN1bHQoY2F0ZWdvcmllcywgcmVjb3JkKSxcbiAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMsIG1hdGNoZWREb21haW4pXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiaGVyZSByYW5raW5nXCIgKyByZWMuX3JhbmtpbmcpXG4gICAgICAgICAgICAgICAgaWYgKChyZWMuX3JhbmtpbmcgPT09IG51bGwpIHx8ICFyZWMuX3JhbmtpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVjLl9yYW5raW5nID0gMC45O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXMucHVzaChyZWMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBwZXJmbG9nKFwic29ydCAoYT1cIiArIHJlcy5sZW5ndGggKyBcIilcIik7XG4gICAgcmVzLnNvcnQoY21wQnlSZXN1bHRUaGVuUmFua2luZ1R1cGVsKTtcbiAgICBwZXJmbG9nKFwiTVJRTUMgZmlsdGVyUmV0YWluIC4uLlwiKTtcbiAgICB2YXIgcmVzdWx0MSA9IE9iamVjdC5hc3NpZ24oeyB0dXBlbGFuc3dlcnM6IHJlcyB9LCBwU2VudGVuY2VzKTtcbiAgICAvKmRlYnVnbG9nKFwiTkVXTUFQXCIgKyByZXMubWFwKG8gPT4gXCJcXG5yYW5rXCIgKyBvLl9yYW5raW5nICsgXCIgPT5cIlxuICAgICAgICAgICAgICAgICsgby5yZXN1bHQuam9pbihcIlxcblwiKSkuam9pbihcIlxcblwiKSk7ICovXG4gICAgdmFyIHJlc3VsdDIgPSBmaWx0ZXJEaXN0aW5jdFJlc3VsdEFuZFNvcnRUdXBlbChyZXN1bHQxKTtcbiAgICBwZXJmbG9nKFwiTVJRTUMgbWF0Y2hSZWNvcmRzUXVpY2sgZG9uZTogKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGE9XCIgKyByZXMubGVuZ3RoICsgXCIpXCIpO1xuICAgIHJldHVybiByZXN1bHQyO1xufVxuZXhwb3J0cy5tYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcyA9IG1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzO1xuZnVuY3Rpb24gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KHdvcmQsIHRhcmdldGNhdGVnb3J5LCBydWxlcywgd2hvbGVzZW50ZW5jZSkge1xuICAgIC8vY29uc29sZS5sb2coXCJjbGFzc2lmeSBcIiArIHdvcmQgKyBcIiBcIiAgKyB0YXJnZXRjYXRlZ29yeSk7XG4gICAgdmFyIGNhdHMgPSBJbnB1dEZpbHRlci5jYXRlZ29yaXplQVdvcmQod29yZCwgcnVsZXMsIHdob2xlc2VudGVuY2UsIHt9KTtcbiAgICAvLyBUT0RPIHF1YWxpZnlcbiAgICBjYXRzID0gY2F0cy5maWx0ZXIoZnVuY3Rpb24gKGNhdCkge1xuICAgICAgICByZXR1cm4gY2F0LmNhdGVnb3J5ID09PSB0YXJnZXRjYXRlZ29yeTtcbiAgICB9KTtcbiAgICAvL2RlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGNhdHMpKTtcbiAgICBpZiAoY2F0cy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGNhdHNbMF0ubWF0Y2hlZFN0cmluZztcbiAgICB9XG59XG5mdW5jdGlvbiBhbmFseXplQ2F0ZWdvcnkoY2F0ZWdvcnl3b3JkLCBydWxlcywgd2hvbGVzZW50ZW5jZSkge1xuICAgIHJldHVybiBjbGFzc2lmeVdvcmRXaXRoVGFyZ2V0Q2F0ZWdvcnkoY2F0ZWdvcnl3b3JkLCAnY2F0ZWdvcnknLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG59XG5leHBvcnRzLmFuYWx5emVDYXRlZ29yeSA9IGFuYWx5emVDYXRlZ29yeTtcbmZ1bmN0aW9uIHNwbGl0QXRDb21tYUFuZChzdHIpIHtcbiAgICB2YXIgciA9IHN0ci5zcGxpdCgvKFxcYmFuZFxcYil8WyxdLyk7XG4gICAgciA9IHIuZmlsdGVyKGZ1bmN0aW9uIChvLCBpbmRleCkge1xuICAgICAgICBpZiAoaW5kZXggJSAyID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIHZhciBydHJpbW1lZCA9IHIubWFwKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgIHJldHVybiBuZXcgU3RyaW5nKG8pLnRyaW0oKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcnRyaW1tZWQ7XG59XG5leHBvcnRzLnNwbGl0QXRDb21tYUFuZCA9IHNwbGl0QXRDb21tYUFuZDtcbi8qKlxuICogQSBzaW1wbGUgaW1wbGVtZW50YXRpb24sIHNwbGl0dGluZyBhdCBhbmQgYW5kICxcbiAqL1xuZnVuY3Rpb24gYW5hbHl6ZUNhdGVnb3J5TXVsdE9ubHlBbmRDb21tYShjYXRlZ29yeWxpc3QsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlKSB7XG4gICAgdmFyIHJ0cmltbWVkID0gc3BsaXRBdENvbW1hQW5kKGNhdGVnb3J5bGlzdCk7XG4gICAgdmFyIHJjYXQgPSBydHJpbW1lZC5tYXAoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgcmV0dXJuIGFuYWx5emVDYXRlZ29yeShvLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG4gICAgfSk7XG4gICAgaWYgKHJjYXQuaW5kZXhPZih1bmRlZmluZWQpID49IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdcIicgKyBydHJpbW1lZFtyY2F0LmluZGV4T2YodW5kZWZpbmVkKV0gKyAnXCIgaXMgbm90IGEgY2F0ZWdvcnkhJyk7XG4gICAgfVxuICAgIHJldHVybiByY2F0O1xufVxuZXhwb3J0cy5hbmFseXplQ2F0ZWdvcnlNdWx0T25seUFuZENvbW1hID0gYW5hbHl6ZUNhdGVnb3J5TXVsdE9ubHlBbmRDb21tYTtcbmZ1bmN0aW9uIGZpbHRlckFjY2VwdGluZ09ubHkocmVzLCBjYXRlZ29yaWVzKSB7XG4gICAgcmV0dXJuIHJlcy5maWx0ZXIoZnVuY3Rpb24gKGFTZW50ZW5jZSwgaUluZGV4KSB7XG4gICAgICAgIHJldHVybiBhU2VudGVuY2UuZXZlcnkoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgICByZXR1cm4gY2F0ZWdvcmllcy5pbmRleE9mKG9Xb3JkLmNhdGVnb3J5KSA+PSAwO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn1cbmV4cG9ydHMuZmlsdGVyQWNjZXB0aW5nT25seSA9IGZpbHRlckFjY2VwdGluZ09ubHk7XG52YXIgRXJiYXNlID0gcmVxdWlyZShcIi4vZXJiYXNlXCIpO1xuZnVuY3Rpb24gcHJvY2Vzc1N0cmluZyhxdWVyeSwgcnVsZXMpIHtcbiAgICAvLyAgaWYgKCFwcm9jZXNzLmVudi5BQk9UX09MRE1BVENIKSB7XG4gICAgcmV0dXJuIEVyYmFzZS5wcm9jZXNzU3RyaW5nKHF1ZXJ5LCBydWxlcywgcnVsZXMud29yZENhY2hlKTtcbiAgICAvLyAgfVxuICAgIC8qXG4gICAgICB2YXIgbWF0Y2hlZCA9IElucHV0RmlsdGVyLmFuYWx5emVTdHJpbmcocXVlcnksIHJ1bGVzLCBzV29yZHMpO1xuICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCJBZnRlciBtYXRjaGVkIFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZCkpO1xuICAgICAgfVxuICAgICAgdmFyIGFTZW50ZW5jZXMgPSBJbnB1dEZpbHRlci5leHBhbmRNYXRjaEFycihtYXRjaGVkKTtcbiAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiYWZ0ZXIgZXhwYW5kXCIgKyBhU2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICAgICAgfVxuICAgICAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gSW5wdXRGaWx0ZXIucmVpbkZvcmNlKGFTZW50ZW5jZXMpO1xuICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCJhZnRlciByZWluZm9yY2VcIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZXJyb3JzOiBbXSxcbiAgICAgICAgc2VudGVuY2VzOiBhU2VudGVuY2VzUmVpbmZvcmNlZFxuICAgICAgfSBhcyBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcztcbiAgICAqL1xufVxuZXhwb3J0cy5wcm9jZXNzU3RyaW5nID0gcHJvY2Vzc1N0cmluZztcbmZ1bmN0aW9uIGFuYWx5emVDb250ZXh0U3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMpIHtcbiAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBwcm9jZXNzU3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMpO1xuICAgIC8vIHdlIGxpbWl0IGFuYWx5c2lzIHRvIG4gc2VudGVuY2VzXG4gICAgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzID0gYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLnNsaWNlKDAsIEFsZ29sLkN1dG9mZl9TZW50ZW5jZXMpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiYWZ0ZXIgcmVpbmZvcmNlIGFuZCBjdXRvZmZcIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5sZW5ndGggKyBcIlxcblwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICAgICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgfVxuICAgIHJldHVybiBhU2VudGVuY2VzUmVpbmZvcmNlZDtcbn1cbmV4cG9ydHMuYW5hbHl6ZUNvbnRleHRTdHJpbmcgPSBhbmFseXplQ29udGV4dFN0cmluZztcbmZ1bmN0aW9uIGNtcEJ5TnJDYXRlZ29yaWVzQW5kU2FtZURvbWFpbihhLCBiKSB7XG4gICAgLy9jb25zb2xlLmxvZyhcImNvbXBhcmUgYVwiICsgYSArIFwiIGNudGIgXCIgKyBiKTtcbiAgICB2YXIgY250YSA9IFNlbnRlbmNlLmdldERpc3RpbmN0Q2F0ZWdvcmllc0luU2VudGVuY2UoYSkubGVuZ3RoO1xuICAgIHZhciBjbnRiID0gU2VudGVuY2UuZ2V0RGlzdGluY3RDYXRlZ29yaWVzSW5TZW50ZW5jZShiKS5sZW5ndGg7XG4gICAgLypcbiAgICAgIHZhciBjbnRhID0gYS5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgb1dvcmQpIHtcbiAgICAgICAgcmV0dXJuIHByZXYgKyAoKG9Xb3JkLmNhdGVnb3J5ID09PSBcImNhdGVnb3J5XCIpPyAxIDogMCk7XG4gICAgICB9LDApO1xuICAgICAgdmFyIGNudGIgPSBiLnJlZHVjZShmdW5jdGlvbihwcmV2LCBvV29yZCkge1xuICAgICAgICByZXR1cm4gcHJldiArICgob1dvcmQuY2F0ZWdvcnkgPT09IFwiY2F0ZWdvcnlcIik/IDEgOiAwKTtcbiAgICAgIH0sMCk7XG4gICAgIC8vIGNvbnNvbGUubG9nKFwiY250IGFcIiArIGNudGEgKyBcIiBjbnRiIFwiICsgY250Yik7XG4gICAgICovXG4gICAgcmV0dXJuIGNudGIgLSBjbnRhO1xufVxuZXhwb3J0cy5jbXBCeU5yQ2F0ZWdvcmllc0FuZFNhbWVEb21haW4gPSBjbXBCeU5yQ2F0ZWdvcmllc0FuZFNhbWVEb21haW47XG5mdW5jdGlvbiBhbmFseXplQ2F0ZWdvcnlNdWx0KGNhdGVnb3J5bGlzdCwgcnVsZXMsIHdob2xlc2VudGVuY2UsIGdXb3Jkcykge1xuICAgIHZhciByZXMgPSBhbmFseXplQ29udGV4dFN0cmluZyhjYXRlZ29yeWxpc3QsIHJ1bGVzKTtcbiAgICAvLyAgZGVidWdsb2coXCJyZXN1bHRpbmcgY2F0ZWdvcnkgc2VudGVuY2VzXCIsIEpTT04uc3RyaW5naWZ5KHJlcykpO1xuICAgIHZhciByZXMyID0gZmlsdGVyQWNjZXB0aW5nT25seShyZXMuc2VudGVuY2VzLCBbXCJjYXRlZ29yeVwiLCBcImZpbGxlclwiXSk7XG4gICAgLy8gIGNvbnNvbGUubG9nKFwiaGVyZSByZXMyXCIgKyBKU09OLnN0cmluZ2lmeShyZXMyKSApO1xuICAgIC8vICBjb25zb2xlLmxvZyhcImhlcmUgdW5kZWZpbmVkICEgKyBcIiArIHJlczIuZmlsdGVyKG8gPT4gIW8pLmxlbmd0aCk7XG4gICAgcmVzMi5zb3J0KFNlbnRlbmNlLmNtcFJhbmtpbmdQcm9kdWN0KTtcbiAgICBkZWJ1Z2xvZyhcInJlc3VsdGluZyBjYXRlZ29yeSBzZW50ZW5jZXM6IFxcblwiLCBkZWJ1Z2xvZy5lbmFibGVkID8gKFNlbnRlbmNlLmR1bXBOaWNlQXJyKHJlczIuc2xpY2UoMCwgMyksIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KSkgOiAnLScpO1xuICAgIC8vIFRPRE86ICAgcmVzMiA9IGZpbHRlckFjY2VwdGluZ09ubHlTYW1lRG9tYWluKHJlczIpO1xuICAgIC8vZGVidWdsb2coXCJyZXN1bHRpbmcgY2F0ZWdvcnkgc2VudGVuY2VzXCIsIEpTT04uc3RyaW5naWZ5KHJlczIsIHVuZGVmaW5lZCwgMikpO1xuICAgIC8vIGV4cGVjdCBvbmx5IGNhdGVnb3JpZXNcbiAgICAvLyB3ZSBjb3VsZCByYW5rIG5vdyBieSBjb21tb24gZG9tYWlucyAsIGJ1dCBmb3Igbm93IHdlIG9ubHkgdGFrZSB0aGUgZmlyc3Qgb25lXG4gICAgaWYgKCFyZXMyLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICAvL3Jlcy5zb3J0KGNtcEJ5TnJDYXRlZ29yaWVzQW5kU2FtZURvbWFpbik7XG4gICAgdmFyIHJlc2NhdCA9IFNlbnRlbmNlLmdldERpc3RpbmN0Q2F0ZWdvcmllc0luU2VudGVuY2UocmVzMlswXSk7XG4gICAgcmV0dXJuIHJlc2NhdDtcbiAgICAvLyBcIlwiIHJldHVybiByZXNbMF0uZmlsdGVyKClcbiAgICAvLyByZXR1cm4gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KGNhdGVnb3J5bGlzdCwgJ2NhdGVnb3J5JywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xufVxuZXhwb3J0cy5hbmFseXplQ2F0ZWdvcnlNdWx0ID0gYW5hbHl6ZUNhdGVnb3J5TXVsdDtcbmZ1bmN0aW9uIGFuYWx5emVPcGVyYXRvcihvcHdvcmQsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlKSB7XG4gICAgcmV0dXJuIGNsYXNzaWZ5V29yZFdpdGhUYXJnZXRDYXRlZ29yeShvcHdvcmQsICdvcGVyYXRvcicsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlKTtcbn1cbmV4cG9ydHMuYW5hbHl6ZU9wZXJhdG9yID0gYW5hbHl6ZU9wZXJhdG9yO1xudmFyIEVyRXJyb3IgPSByZXF1aXJlKFwiLi9lcmVycm9yXCIpO1xudmFyIExpc3RBbGwgPSByZXF1aXJlKFwiLi9saXN0YWxsXCIpO1xuLy8gY29uc3QgcmVzdWx0ID0gV2hhdElzLnJlc29sdmVDYXRlZ29yeShjYXQsIGExLmVudGl0eSxcbi8vICAgdGhlTW9kZWwubVJ1bGVzLCB0aGVNb2RlbC50b29scywgdGhlTW9kZWwucmVjb3Jkcyk7XG5mdW5jdGlvbiByZXNvbHZlQ2F0ZWdvcnkoY2F0ZWdvcnksIGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMsIHJlY29yZHMpIHtcbiAgICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4geyBlcnJvcnM6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSwgdG9rZW5zOiBbXSwgYW5zd2VyczogW10gfTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIC8qXG4gICAgICAgICAgICB2YXIgbWF0Y2hlZCA9IElucHV0RmlsdGVyLmFuYWx5emVTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcyk7XG4gICAgICAgICAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiYWZ0ZXIgbWF0Y2hlZCBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWQpKTogJy0nKTtcbiAgICAgICAgICAgIHZhciBhU2VudGVuY2VzID0gSW5wdXRGaWx0ZXIuZXhwYW5kTWF0Y2hBcnIobWF0Y2hlZCk7XG4gICAgICAgICAgICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgICAgIGRlYnVnbG9nKFwiYWZ0ZXIgZXhwYW5kXCIgKyBhU2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgICAgICAgICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICAgICAgICAgIH0gKi9cbiAgICAgICAgLy8gdmFyIGNhdGVnb3J5U2V0ID0gTW9kZWwuZ2V0QWxsUmVjb3JkQ2F0ZWdvcmllc0ZvclRhcmdldENhdGVnb3J5KHRoZU1vZGVsLCBjYXQsIHRydWUpO1xuICAgICAgICB2YXIgcmVzID0gTGlzdEFsbC5saXN0QWxsV2l0aENvbnRleHQoY2F0ZWdvcnksIGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMsIHJlY29yZHMpO1xuICAgICAgICAvLyogc29ydCBieSBzZW50ZW5jZVxuICAgICAgICByZXMuYW5zd2Vycy5mb3JFYWNoKGZ1bmN0aW9uIChvKSB7IG8uX3JhbmtpbmcgPSBvLl9yYW5raW5nICogU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qoby5zZW50ZW5jZSk7IH0pO1xuICAgICAgICByZXMuYW5zd2Vycy5zb3J0KGNtcEJ5UmFua2luZyk7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxufVxuZXhwb3J0cy5yZXNvbHZlQ2F0ZWdvcnkgPSByZXNvbHZlQ2F0ZWdvcnk7XG5mdW5jdGlvbiByZXNvbHZlQ2F0ZWdvcmllcyhjYXRlZ29yaWVzLCBjb250ZXh0UXVlcnlTdHJpbmcsIHRoZU1vZGVsLCBkb21haW5DYXRlZ29yeUZpbHRlcikge1xuICAgIHZhciByZWNvcmRzID0gdGhlTW9kZWwucmVjb3JkcztcbiAgICB2YXIgcnVsZXMgPSB0aGVNb2RlbC5ydWxlcztcbiAgICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZXJyb3JzOiBbRXJFcnJvci5tYWtlRXJyb3JfRU1QVFlfSU5QVVQoKV0sXG4gICAgICAgICAgICB0dXBlbGFuc3dlcnM6IFtdLFxuICAgICAgICAgICAgdG9rZW5zOiBbXVxuICAgICAgICB9O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgLy8gdmFyIGNhdGVnb3J5U2V0ID0gTW9kZWwuZ2V0QWxsUmVjb3JkQ2F0ZWdvcmllc0ZvclRhcmdldENhdGVnb3J5KHRoZU1vZGVsLCBjYXQsIHRydWUpO1xuICAgICAgICB2YXIgcmVzID0gTGlzdEFsbC5saXN0QWxsVHVwZWxXaXRoQ29udGV4dChjYXRlZ29yaWVzLCBjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzLCByZWNvcmRzLCBkb21haW5DYXRlZ29yeUZpbHRlcik7XG4gICAgICAgIC8vKiBzb3J0IGJ5IHNlbnRlbmNlXG4gICAgICAgIHJlcy50dXBlbGFuc3dlcnMuZm9yRWFjaChmdW5jdGlvbiAobykgeyBvLl9yYW5raW5nID0gby5fcmFua2luZyAqIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG8uc2VudGVuY2UpOyB9KTtcbiAgICAgICAgcmVzLnR1cGVsYW5zd2Vycy5zb3J0KGNtcEJ5UmFua2luZ1R1cGVsKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG59XG5leHBvcnRzLnJlc29sdmVDYXRlZ29yaWVzID0gcmVzb2x2ZUNhdGVnb3JpZXM7XG5mdW5jdGlvbiBpc0luZGlzY3JpbWluYXRlUmVzdWx0KHJlc3VsdHMpIHtcbiAgICB2YXIgY250ID0gcmVzdWx0cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHJlc3VsdCkge1xuICAgICAgICBpZiAoc2FmZUVxdWFsKHJlc3VsdC5fcmFua2luZywgcmVzdWx0c1swXS5fcmFua2luZykpIHtcbiAgICAgICAgICAgIHJldHVybiBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgIH0sIDApO1xuICAgIGlmIChjbnQgPiAxKSB7XG4gICAgICAgIC8vIHNlYXJjaCBmb3IgYSBkaXNjcmltaW5hdGluZyBjYXRlZ29yeSB2YWx1ZVxuICAgICAgICB2YXIgZGlzY3JpbWluYXRpbmcgPSBPYmplY3Qua2V5cyhyZXN1bHRzWzBdLnJlY29yZCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBjYXRlZ29yeSkge1xuICAgICAgICAgICAgaWYgKChjYXRlZ29yeS5jaGFyQXQoMCkgIT09ICdfJyAmJiBjYXRlZ29yeSAhPT0gcmVzdWx0c1swXS5jYXRlZ29yeSlcbiAgICAgICAgICAgICAgICAmJiAocmVzdWx0c1swXS5yZWNvcmRbY2F0ZWdvcnldICE9PSByZXN1bHRzWzFdLnJlY29yZFtjYXRlZ29yeV0pKSB7XG4gICAgICAgICAgICAgICAgcHJldi5wdXNoKGNhdGVnb3J5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwcmV2O1xuICAgICAgICB9LCBbXSk7XG4gICAgICAgIGlmIChkaXNjcmltaW5hdGluZy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBcIk1hbnkgY29tcGFyYWJsZSByZXN1bHRzLCBwZXJoYXBzIHlvdSB3YW50IHRvIHNwZWNpZnkgYSBkaXNjcmltaW5hdGluZyBcIiArIGRpc2NyaW1pbmF0aW5nLmpvaW4oJywnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJ1lvdXIgcXVlc3Rpb24gZG9lcyBub3QgaGF2ZSBhIHNwZWNpZmljIGFuc3dlcic7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5leHBvcnRzLmlzSW5kaXNjcmltaW5hdGVSZXN1bHQgPSBpc0luZGlzY3JpbWluYXRlUmVzdWx0O1xuZnVuY3Rpb24gaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdFR1cGVsKHJlc3VsdHMpIHtcbiAgICB2YXIgY250ID0gcmVzdWx0cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHJlc3VsdCkge1xuICAgICAgICBpZiAoc2FmZUVxdWFsKHJlc3VsdC5fcmFua2luZywgcmVzdWx0c1swXS5fcmFua2luZykpIHtcbiAgICAgICAgICAgIHJldHVybiBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgIH0sIDApO1xuICAgIGlmIChjbnQgPiAxKSB7XG4gICAgICAgIC8vIHNlYXJjaCBmb3IgYSBkaXNjcmltaW5hdGluZyBjYXRlZ29yeSB2YWx1ZVxuICAgICAgICB2YXIgZGlzY3JpbWluYXRpbmcgPSBPYmplY3Qua2V5cyhyZXN1bHRzWzBdLnJlY29yZCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBjYXRlZ29yeSkge1xuICAgICAgICAgICAgaWYgKChjYXRlZ29yeS5jaGFyQXQoMCkgIT09ICdfJyAmJiByZXN1bHRzWzBdLmNhdGVnb3JpZXMuaW5kZXhPZihjYXRlZ29yeSkgPCAwKVxuICAgICAgICAgICAgICAgICYmIChyZXN1bHRzWzBdLnJlY29yZFtjYXRlZ29yeV0gIT09IHJlc3VsdHNbMV0ucmVjb3JkW2NhdGVnb3J5XSkpIHtcbiAgICAgICAgICAgICAgICBwcmV2LnB1c2goY2F0ZWdvcnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgICAgIH0sIFtdKTtcbiAgICAgICAgaWYgKGRpc2NyaW1pbmF0aW5nLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiTWFueSBjb21wYXJhYmxlIHJlc3VsdHMsIHBlcmhhcHMgeW91IHdhbnQgdG8gc3BlY2lmeSBhIGRpc2NyaW1pbmF0aW5nIFwiICsgZGlzY3JpbWluYXRpbmcuam9pbignLCcpICsgJyBvciB1c2UgXCJsaXN0IGFsbCAuLi5cIic7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICdZb3VyIHF1ZXN0aW9uIGRvZXMgbm90IGhhdmUgYSBzcGVjaWZpYyBhbnN3ZXInO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xufVxuZXhwb3J0cy5pc0luZGlzY3JpbWluYXRlUmVzdWx0VHVwZWwgPSBpc0luZGlzY3JpbWluYXRlUmVzdWx0VHVwZWw7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
