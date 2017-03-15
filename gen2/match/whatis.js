/**
 *
 * @module jfseb.fdevstart.analyze
 * @file analyze.ts
 * @copyright (c) 2016 Gerd Forstmann
 */
"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var abot_erbase_1 = require("abot_erbase");
var debug = require("debug");
var debuglog = debug('whatis');
var debuglogV = debug('whatVis');
var perflog = debug('perf');
var abot_erbase_2 = require("abot_erbase");
var abot_erbase_3 = require("abot_erbase");
function mockDebug(o) {
    debuglog = o;
    debuglogV = o;
    perflog = o;
}
exports.mockDebug = mockDebug;
var _ = require("lodash");
var Match = require("./match");
var abot_erbase_4 = require("abot_erbase");
var abot_erbase_5 = require("abot_erbase");
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
            return !abot_erbase_5.Word.Word.isFiller(oWord);
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
        return "\nDomain=" + o.domains.join("\n") + "\n" + abot_erbase_4.Sentence.dumpNice(o.rWords);
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
                } else if (abot_erbase_5.Word.Word.isCategory(oWord) && record[oWord.matchedString]) {
                    hasCategory[oWord.matchedString] = 1;
                } else if (!abot_erbase_5.Word.Word.isCategory(oWord)) {
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
    var cats = abot_erbase_1.InputFilter.categorizeAWord(word, rules, wholesentence, {});
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
function processString(query, rules) {
    //  if (!process.env.ABOT_OLDMATCH) {
    return abot_erbase_3.ErBase.processString(query, rules, rules.wordCache);
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
            return abot_erbase_4.Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
        }).join("\n"));
    }
    return aSentencesReinforced;
}
exports.analyzeContextString = analyzeContextString;
function cmpByNrCategoriesAndSameDomain(a, b) {
    //console.log("compare a" + a + " cntb " + b);
    var cnta = abot_erbase_4.Sentence.getDistinctCategoriesInSentence(a).length;
    var cntb = abot_erbase_4.Sentence.getDistinctCategoriesInSentence(b).length;
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
    res2.sort(abot_erbase_4.Sentence.cmpRankingProduct);
    debuglog("resulting category sentences: \n", debuglog.enabled ? abot_erbase_4.Sentence.dumpNiceArr(res2.slice(0, 3), abot_erbase_4.Sentence.rankingProduct) : '-');
    // TODO:   res2 = filterAcceptingOnlySameDomain(res2);
    //debuglog("resulting category sentences", JSON.stringify(res2, undefined, 2));
    // expect only categories
    // we could rank now by common domains , but for now we only take the first one
    if (!res2.length) {
        return undefined;
    }
    //res.sort(cmpByNrCategoriesAndSameDomain);
    var rescat = abot_erbase_4.Sentence.getDistinctCategoriesInSentence(res2[0]);
    return rescat;
    // "" return res[0].filter()
    // return classifyWordWithTargetCategory(categorylist, 'category', rules, wholesentence);
}
exports.analyzeCategoryMult = analyzeCategoryMult;
function analyzeOperator(opword, rules, wholesentence) {
    return classifyWordWithTargetCategory(opword, 'operator', rules, wholesentence);
}
exports.analyzeOperator = analyzeOperator;
var ListAll = require("./listall");
// const result = WhatIs.resolveCategory(cat, a1.entity,
//   theModel.mRules, theModel.tools, theModel.records);
function resolveCategory(category, contextQueryString, rules, records) {
    if (contextQueryString.length === 0) {
        return { errors: [abot_erbase_2.ErError.makeError_EMPTY_INPUT()], tokens: [], answers: [] };
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
            o._ranking = o._ranking * abot_erbase_4.Sentence.rankingProduct(o.sentence);
        });
        res.answers.sort(cmpByRanking);
        return res;
    }
}
exports.resolveCategory = resolveCategory;
/*
export function resolveCategoryOld(category: string, contextQueryString: string,
  rules: IMatch.SplitRules, records: Array<IMatch.IRecord>): IMatch.IProcessedWhatIsAnswers {
  if (contextQueryString.length === 0) {
    return { errors: [ErError.makeError_EMPTY_INPUT()], tokens: [], answers: [] };
  } else {
    var aSentencesReinforced = processString(contextQueryString, rules);
    //aSentences.map(function(oSentence) { return InputFilter.reinForce(oSentence); });
    debuglog(debuglog.enabled ? ("after reinforce" + aSentencesReinforced.sentences.map(function (oSentence) {
      return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
    }).join("\n")) : '-');
    var matchedAnswers = matchRecords(aSentencesReinforced, category, records); //aTool: Array<IMatch.ITool>): any / * objectstream* / {
    debuglog(debuglog.enabled ? (" matchedAnswers" + JSON.stringify(matchedAnswers, undefined, 2)) : '-');
    return matchedAnswers;
  }
}
*/
function resolveCategories(categories, contextQueryString, theModel, domainCategoryFilter) {
    var records = theModel.records;
    var rules = theModel.rules;
    if (contextQueryString.length === 0) {
        return {
            errors: [abot_erbase_2.ErError.makeError_EMPTY_INPUT()],
            tupelanswers: [],
            tokens: []
        };
    } else {
        // var categorySet = Model.getAllRecordCategoriesForTargetCategory(theModel, cat, true);
        var res = ListAll.listAllTupelWithContext(categories, contextQueryString, rules, records, domainCategoryFilter);
        //* sort by sentence
        res.tupelanswers.forEach(function (o) {
            o._ranking = o._ranking * abot_erbase_4.Sentence.rankingProduct(o.sentence);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC93aGF0aXMudHMiLCJtYXRjaC93aGF0aXMuanMiXSwibmFtZXMiOlsiYWJvdF9lcmJhc2VfMSIsInJlcXVpcmUiLCJkZWJ1ZyIsImRlYnVnbG9nIiwiZGVidWdsb2dWIiwicGVyZmxvZyIsImFib3RfZXJiYXNlXzIiLCJhYm90X2VyYmFzZV8zIiwibW9ja0RlYnVnIiwibyIsImV4cG9ydHMiLCJfIiwiTWF0Y2giLCJhYm90X2VyYmFzZV80IiwiYWJvdF9lcmJhc2VfNSIsIkFsZ29sIiwibG9jYWxlQ29tcGFyZUFycnMiLCJhYXJlc3VsdCIsImJicmVzdWx0IiwiY21wIiwiYmxlbiIsImxlbmd0aCIsImV2ZXJ5IiwiYSIsImluZGV4IiwibG9jYWxlQ29tcGFyZSIsInNhZmVFcXVhbCIsImIiLCJkZWx0YSIsIk1hdGgiLCJhYnMiLCJSQU5LSU5HX0VQU0lMT04iLCJzYWZlRGVsdGEiLCJjbXBCeVJlc3VsdFRoZW5SYW5raW5nVHVwZWwiLCJhYSIsImJiIiwicmVzdWx0IiwiX3JhbmtpbmciLCJjbXBSZWNvcmRzIiwia2V5cyIsIk9iamVjdCIsImNvbmNhdCIsInNvcnQiLCJyZXMiLCJyZWR1Y2UiLCJwcmV2Iiwic0tleSIsImNtcEJ5UmFua2luZyIsInJlY29yZCIsImNtcEJ5UmFua2luZ1R1cGVsIiwiZHVtcE5pY2UiLCJhbnN3ZXIiLCJzIiwicHVzaCIsImNhdGVnb3J5IiwiZm9yRWFjaCIsInNSZXF1aXJlcyIsImNoYXJBdCIsIm9TZW50ZW5jZSIsInNlbnRlbmNlIiwib1dvcmQiLCJzV29yZCIsInN0cmluZyIsIm1hdGNoZWRTdHJpbmciLCJkdW1wTmljZVR1cGVsIiwiY2F0ZWdvcmllcyIsImpvaW4iLCJkdW1wV2VpZ2h0c1RvcCIsInRvb2xtYXRjaGVzIiwib3B0aW9ucyIsIm9NYXRjaCIsInRvcCIsImZpbHRlckRpc3RpbmN0UmVzdWx0QW5kU29ydFR1cGVsIiwidHVwZWxhbnN3ZXJzIiwiZmlsdGVyIiwiaVJlcyIsImVuYWJsZWQiLCJKU09OIiwic3RyaW5naWZ5IiwiaXNFcXVhbCIsImFzc2lnbiIsImZpbHRlck9ubHlUb3BSYW5rZWQiLCJyZXN1bHRzIiwiRXJyb3IiLCJmaWx0ZXJPbmx5VG9wUmFua2VkVHVwZWwiLCJjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5IiwibWF0Y2hlZCIsImhhc0NhdGVnb3J5IiwibWlzbWF0Y2hlZCIsInJlbGV2YW50Q291bnQiLCJoYXNEb21haW4iLCJsZW5NYXRjaGVkIiwiZmFjdG9yIiwiY2FsY1JhbmtpbmdQcm9kdWN0IiwicG93IiwibGVuSGFzQ2F0ZWdvcnkiLCJmYWN0b3JIIiwibGVuTWlzTWF0Y2hlZCIsImZhY3RvcjIiLCJkaXZpc29yIiwibWFrZVNpbXBsaWZpZWRTZW50ZW5jZXNDYXRlZ29yeVNldDIiLCJhU2VudGVuY2VzIiwiY2F0ZWdvcnlTZXQiLCJ0cmFjayIsInNlbnRlbmNlcyIsIm1hcCIsImFEb21haW5zIiwicldvcmRzIiwiZmwiLCJsZiIsImRvbWFpbnMiLCJjbnRSZWxldmFudFdvcmRzIiwibWFrZVNpbXBsaWZpZWRTZW50ZW5jZXMiLCJXb3JkIiwiaXNGaWxsZXIiLCJleHRyYWN0UmVzdWx0IiwibWF0Y2hSZWNvcmRzUXVpY2tNdWx0aXBsZUNhdGVnb3JpZXMiLCJwU2VudGVuY2VzIiwicmVjb3JkcyIsImRvbWFpbkNhdGVnb3J5RmlsdGVyIiwiZnJlZXplIiwiY2F0ZWdvcnlGIiwicmVsZXZhbnRSZWNvcmRzIiwiaW5kZXhPZiIsIl9kb21haW4iLCJjYXQiLCJ1bmRlZmluZWQiLCJvYmoiLCJhU2ltcGxpZmllZFNlbnRlbmNlcyIsIlNlbnRlbmNlIiwiYVNlbnRlbmNlIiwiaW1pc21hdGNoZWQiLCJpbWF0Y2hlZCIsIm5vdXNlIiwiZm91bmRjYXQiLCJtaXNzaW5nY2F0IiwiaXNDYXRlZ29yeSIsIm1hdGNoZWREb21haW4iLCJtYXRjaGVkTGVuIiwibWlzbWF0Y2hlZExlbiIsInJlYyIsInJlc3VsdDEiLCJyZXN1bHQyIiwiY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5Iiwid29yZCIsInRhcmdldGNhdGVnb3J5IiwicnVsZXMiLCJ3aG9sZXNlbnRlbmNlIiwiY2F0cyIsIklucHV0RmlsdGVyIiwiY2F0ZWdvcml6ZUFXb3JkIiwiYW5hbHl6ZUNhdGVnb3J5IiwiY2F0ZWdvcnl3b3JkIiwic3BsaXRBdENvbW1hQW5kIiwic3RyIiwiciIsInNwbGl0IiwicnRyaW1tZWQiLCJTdHJpbmciLCJ0cmltIiwiYW5hbHl6ZUNhdGVnb3J5TXVsdE9ubHlBbmRDb21tYSIsImNhdGVnb3J5bGlzdCIsInJjYXQiLCJmaWx0ZXJBY2NlcHRpbmdPbmx5IiwiaUluZGV4IiwicHJvY2Vzc1N0cmluZyIsInF1ZXJ5IiwiRXJCYXNlIiwid29yZENhY2hlIiwiYW5hbHl6ZUNvbnRleHRTdHJpbmciLCJjb250ZXh0UXVlcnlTdHJpbmciLCJhU2VudGVuY2VzUmVpbmZvcmNlZCIsInNsaWNlIiwiQ3V0b2ZmX1NlbnRlbmNlcyIsInJhbmtpbmdQcm9kdWN0IiwiY21wQnlOckNhdGVnb3JpZXNBbmRTYW1lRG9tYWluIiwiY250YSIsImdldERpc3RpbmN0Q2F0ZWdvcmllc0luU2VudGVuY2UiLCJjbnRiIiwiYW5hbHl6ZUNhdGVnb3J5TXVsdCIsImdXb3JkcyIsInJlczIiLCJjbXBSYW5raW5nUHJvZHVjdCIsImR1bXBOaWNlQXJyIiwicmVzY2F0IiwiYW5hbHl6ZU9wZXJhdG9yIiwib3B3b3JkIiwiTGlzdEFsbCIsInJlc29sdmVDYXRlZ29yeSIsImVycm9ycyIsIkVyRXJyb3IiLCJtYWtlRXJyb3JfRU1QVFlfSU5QVVQiLCJ0b2tlbnMiLCJhbnN3ZXJzIiwibGlzdEFsbFdpdGhDb250ZXh0IiwicmVzb2x2ZUNhdGVnb3JpZXMiLCJ0aGVNb2RlbCIsImxpc3RBbGxUdXBlbFdpdGhDb250ZXh0IiwiaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdCIsImNudCIsImRpc2NyaW1pbmF0aW5nIiwiaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdFR1cGVsIl0sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0FDTUE7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UUFBSXFILE1BQU1ySCxRQUFRdEMsTUFBUixDQUFlLFVBQVVDLElBQVYsRUFBZ0JULE1BQWhCLEVBQXNCO0FBQzdDLFlBQUlWLFVBQVVVLE9BQU9DLFFBQWpCLEVBQTBCNkMsUUFBUSxDQUFSLEVBQVc3QyxRQUFyQyxDQUFKLEVBQW9EO0FBQ2xELG1CQUFPUSxPQUFPLENBQWQ7QUFDRDtBQUNGLEtBSlMsRUFJUCxDQUpPLENBQVY7QUFLQSxRQUFJMEosTUFBTSxDQUFWLEVBQWE7QUFDWDtBQUNBLFlBQUlDLGlCQUFpQmhLLE9BQU9ELElBQVAsQ0FBWTJDLFFBQVEsQ0FBUixFQUFXbEMsTUFBdkIsRUFBK0JKLE1BQS9CLENBQXNDLFVBQVVDLElBQVYsRUFBZ0JTLFFBQWhCLEVBQXdCO0FBQ2pGLGdCQUFLQSxTQUFTRyxNQUFULENBQWdCLENBQWhCLE1BQXVCLEdBQXZCLElBQThCeUIsUUFBUSxDQUFSLEVBQVdqQixVQUFYLENBQXNCMEQsT0FBdEIsQ0FBOEJyRSxRQUE5QixJQUEwQyxDQUF6RSxJQUNFNEIsUUFBUSxDQUFSLEVBQVdsQyxNQUFYLENBQWtCTSxRQUFsQixNQUFnQzRCLFFBQVEsQ0FBUixFQUFXbEMsTUFBWCxDQUFrQk0sUUFBbEIsQ0FEdEMsRUFDb0U7QUFDbEVULHFCQUFLUSxJQUFMLENBQVVDLFFBQVY7QUFDRDtBQUNELG1CQUFPVCxJQUFQO0FBQ0QsU0FOb0IsRUFNbEIsRUFOa0IsQ0FBckI7QUFPQSxZQUFJMkosZUFBZW5MLE1BQW5CLEVBQTJCO0FBQ3pCLG1CQUFPLDJFQUEyRW1MLGVBQWV0SSxJQUFmLENBQW9CLEdBQXBCLENBQTNFLEdBQXNHLHdCQUE3RztBQUNEO0FBQ0QsZUFBTywrQ0FBUDtBQUNEO0FBQ0QsV0FBTzRELFNBQVA7QUFDRDtBQXJCRHBILFFBQUErTCwyQkFBQSxHQUFBQSwyQkFBQSIsImZpbGUiOiJtYXRjaC93aGF0aXMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5hbmFseXplXG4gKiBAZmlsZSBhbmFseXplLnRzXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXG4gKi9cblxuXG5pbXBvcnQgeyBJbnB1dEZpbHRlciBhcyBJbnB1dEZpbHRlcn0gZnJvbSAnYWJvdF9lcmJhc2UnO1xuXG5pbXBvcnQgKiBhcyBkZWJ1ZyBmcm9tICdkZWJ1Zyc7XG5cbnZhciBkZWJ1Z2xvZyA9IGRlYnVnKCd3aGF0aXMnKTtcbnZhciBkZWJ1Z2xvZ1YgPSBkZWJ1Zygnd2hhdFZpcycpO1xudmFyIHBlcmZsb2cgPSBkZWJ1ZygncGVyZicpO1xuXG5cbmltcG9ydCB7IEVyRXJyb3IgYXMgRXJFcnJvcn0gZnJvbSAnYWJvdF9lcmJhc2UnO1xuXG5pbXBvcnQgeyBFckJhc2UgYXMgRXJCYXNlfSBmcm9tICdhYm90X2VyYmFzZSc7XG5cblxuZXhwb3J0IGZ1bmN0aW9uIG1vY2tEZWJ1ZyhvKSB7XG4gIGRlYnVnbG9nID0gbztcbiAgZGVidWdsb2dWID0gbztcbiAgcGVyZmxvZyA9IG87XG59XG5cblxuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuXG5pbXBvcnQgKiBhcyBJTWF0Y2ggZnJvbSAnLi9pZm1hdGNoJztcblxuaW1wb3J0ICogYXMgTWF0Y2ggZnJvbSAnLi9tYXRjaCc7XG5cbmltcG9ydCAqIGFzIFRvb2xtYXRjaGVyIGZyb20gJy4vdG9vbG1hdGNoZXInO1xuXG5pbXBvcnQgeyBTZW50ZW5jZSBhcyBTZW50ZW5jZX0gZnJvbSAnYWJvdF9lcmJhc2UnO1xuXG5pbXBvcnQgeyBXb3JkIGFzIFdvcmR9ICBmcm9tICdhYm90X2VyYmFzZSc7XG5cbmltcG9ydCAqIGFzIEFsZ29sIGZyb20gJy4vYWxnb2wnO1xuXG5pbXBvcnQge01vZGVsIGFzIE1vZGVsfSAgZnJvbSAnZmRldnN0YV9tb25tb3ZlJztcblxuXG5cbi8qXG5leHBvcnQgZnVuY3Rpb24gY21wQnlSZXN1bHRUaGVuUmFua2luZyhhOiBJTWF0Y2guSVdoYXRJc0Fuc3dlciwgYjogSU1hdGNoLklXaGF0SXNBbnN3ZXIpIHtcbiAgdmFyIGNtcCA9IGEucmVzdWx0LmxvY2FsZUNvbXBhcmUoYi5yZXN1bHQpO1xuICBpZiAoY21wKSB7XG4gICAgcmV0dXJuIGNtcDtcbiAgfVxuICByZXR1cm4gLShhLl9yYW5raW5nIC0gYi5fcmFua2luZyk7XG59XG4qL1xuXG5mdW5jdGlvbiBsb2NhbGVDb21wYXJlQXJycyhhYXJlc3VsdDogc3RyaW5nW10sIGJicmVzdWx0OiBzdHJpbmdbXSk6IG51bWJlciB7XG4gIHZhciBjbXAgPSAwO1xuICB2YXIgYmxlbiA9IGJicmVzdWx0Lmxlbmd0aDtcbiAgYWFyZXN1bHQuZXZlcnkoZnVuY3Rpb24gKGEsIGluZGV4KSB7XG4gICAgaWYgKGJsZW4gPD0gaW5kZXgpIHtcbiAgICAgIGNtcCA9IC0xO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBjbXAgPSBhLmxvY2FsZUNvbXBhcmUoYmJyZXN1bHRbaW5kZXhdKTtcbiAgICBpZiAoY21wKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9KTtcbiAgaWYgKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cbiAgaWYgKGJsZW4gPiBhYXJlc3VsdC5sZW5ndGgpIHtcbiAgICBjbXAgPSArMTtcbiAgfVxuICByZXR1cm4gMDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNhZmVFcXVhbChhIDogbnVtYmVyLCBiIDogbnVtYmVyKSA6IGJvb2xlYW4ge1xuICB2YXIgZGVsdGEgPSBhIC0gYiA7XG4gIGlmKE1hdGguYWJzKGRlbHRhKSA8IEFsZ29sLlJBTktJTkdfRVBTSUxPTikge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNhZmVEZWx0YShhIDogbnVtYmVyLCBiIDogbnVtYmVyKSA6IG51bWJlciB7XG4gIHZhciBkZWx0YSA9IGEgLSBiIDtcbiAgaWYoTWF0aC5hYnMoZGVsdGEpIDwgQWxnb2wuUkFOS0lOR19FUFNJTE9OKSB7XG4gICAgcmV0dXJuIDA7XG4gIH1cbiAgcmV0dXJuIGRlbHRhO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY21wQnlSZXN1bHRUaGVuUmFua2luZ1R1cGVsKGFhOiBJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyLCBiYjogSU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlcikge1xuICB2YXIgY21wID0gbG9jYWxlQ29tcGFyZUFycnMoYWEucmVzdWx0LCBiYi5yZXN1bHQpO1xuICBpZiAoY21wKSB7XG4gICAgcmV0dXJuIGNtcDtcbiAgfVxuICByZXR1cm4gLXNhZmVEZWx0YShhYS5fcmFua2luZyxiYi5fcmFua2luZyk7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGNtcFJlY29yZHMoYTogSU1hdGNoLklSZWNvcmQsIGI6IElNYXRjaC5JUmVjb3JkKSA6IG51bWJlciB7XG4vLyBhcmUgcmVjb3JkcyBkaWZmZXJlbnQ/XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYSkuY29uY2F0KE9iamVjdC5rZXlzKGIpKS5zb3J0KCk7XG4gIHZhciByZXMgPSBrZXlzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgc0tleSkge1xuICAgIGlmIChwcmV2KSB7XG4gICAgICByZXR1cm4gcHJldjtcbiAgICB9XG4gICAgaWYgKGJbc0tleV0gIT09IGFbc0tleV0pIHtcbiAgICAgIGlmICghYltzS2V5XSkge1xuICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgICBpZiAoIWFbc0tleV0pIHtcbiAgICAgICAgcmV0dXJuICsxO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGFbc0tleV0ubG9jYWxlQ29tcGFyZShiW3NLZXldKTtcbiAgICB9XG4gICAgcmV0dXJuIDA7XG4gIH0sIDApO1xuICByZXR1cm4gcmVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY21wQnlSYW5raW5nKGE6IElNYXRjaC5JV2hhdElzQW5zd2VyLCBiOiBJTWF0Y2guSVdoYXRJc0Fuc3dlcikgOiBudW1iZXIge1xuICB2YXIgY21wID0gLSBzYWZlRGVsdGEoYS5fcmFua2luZywgYi5fcmFua2luZykgYXMgbnVtYmVyO1xuICBpZiAoY21wKSB7XG4gICAgcmV0dXJuIGNtcDtcbiAgfVxuICBjbXAgPSBhLnJlc3VsdC5sb2NhbGVDb21wYXJlKGIucmVzdWx0KTtcbiAgaWYgKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cblxuICByZXR1cm4gY21wUmVjb3JkcyhhLnJlY29yZCxiLnJlY29yZCk7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGNtcEJ5UmFua2luZ1R1cGVsKGE6IElNYXRjaC5JV2hhdElzVHVwZWxBbnN3ZXIsIGI6IElNYXRjaC5JV2hhdElzVHVwZWxBbnN3ZXIpIDogbnVtYmVyIHtcbiAgdmFyIGNtcCA9IC0gc2FmZURlbHRhKGEuX3JhbmtpbmcsIGIuX3JhbmtpbmcpO1xuICBpZiAoY21wKSB7XG4gICAgcmV0dXJuIGNtcDtcbiAgfVxuICBjbXAgPSBsb2NhbGVDb21wYXJlQXJycyhhLnJlc3VsdCwgYi5yZXN1bHQpO1xuICBpZiAoY21wKSB7XG4gICAgcmV0dXJuIGNtcDtcbiAgfVxuICByZXR1cm4gIGNtcFJlY29yZHMoYS5yZWNvcmQsYi5yZWNvcmQpO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBkdW1wTmljZShhbnN3ZXI6IElNYXRjaC5JV2hhdElzQW5zd2VyKSB7XG4gIHZhciByZXN1bHQgPSB7XG4gICAgczogXCJcIixcbiAgICBwdXNoOiBmdW5jdGlvbiAocykgeyB0aGlzLnMgPSB0aGlzLnMgKyBzOyB9XG4gIH07XG4gIHZhciBzID1cbiAgICBgKipSZXN1bHQgZm9yIGNhdGVnb3J5OiAke2Fuc3dlci5jYXRlZ29yeX0gaXMgJHthbnN3ZXIucmVzdWx0fVxuIHJhbms6ICR7YW5zd2VyLl9yYW5raW5nfVxuYDtcbiAgcmVzdWx0LnB1c2gocyk7XG4gIE9iamVjdC5rZXlzKGFuc3dlci5yZWNvcmQpLmZvckVhY2goZnVuY3Rpb24gKHNSZXF1aXJlcywgaW5kZXgpIHtcbiAgICBpZiAoc1JlcXVpcmVzLmNoYXJBdCgwKSAhPT0gJ18nKSB7XG4gICAgICByZXN1bHQucHVzaChgcmVjb3JkOiAke3NSZXF1aXJlc30gLT4gJHthbnN3ZXIucmVjb3JkW3NSZXF1aXJlc119YCk7XG4gICAgfVxuICAgIHJlc3VsdC5wdXNoKCdcXG4nKTtcbiAgfSk7XG4gIHZhciBvU2VudGVuY2UgPSBhbnN3ZXIuc2VudGVuY2U7XG4gIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaW5kZXgpIHtcbiAgICB2YXIgc1dvcmQgPSBgWyR7aW5kZXh9XSA6ICR7b1dvcmQuY2F0ZWdvcnl9IFwiJHtvV29yZC5zdHJpbmd9XCIgPT4gXCIke29Xb3JkLm1hdGNoZWRTdHJpbmd9XCJgXG4gICAgcmVzdWx0LnB1c2goc1dvcmQgKyBcIlxcblwiKTtcbiAgfSlcbiAgcmVzdWx0LnB1c2goXCIuXFxuXCIpO1xuICByZXR1cm4gcmVzdWx0LnM7XG59XG5leHBvcnQgZnVuY3Rpb24gZHVtcE5pY2VUdXBlbChhbnN3ZXI6IElNYXRjaC5JV2hhdElzVHVwZWxBbnN3ZXIpIHtcbiAgdmFyIHJlc3VsdCA9IHtcbiAgICBzOiBcIlwiLFxuICAgIHB1c2g6IGZ1bmN0aW9uIChzKSB7IHRoaXMucyA9IHRoaXMucyArIHM7IH1cbiAgfTtcbiAgdmFyIHMgPVxuICAgIGAqKlJlc3VsdCBmb3IgY2F0ZWdvcmllczogJHthbnN3ZXIuY2F0ZWdvcmllcy5qb2luKFwiO1wiKX0gaXMgJHthbnN3ZXIucmVzdWx0fVxuIHJhbms6ICR7YW5zd2VyLl9yYW5raW5nfVxuYDtcbiAgcmVzdWx0LnB1c2gocyk7XG4gIE9iamVjdC5rZXlzKGFuc3dlci5yZWNvcmQpLmZvckVhY2goZnVuY3Rpb24gKHNSZXF1aXJlcywgaW5kZXgpIHtcbiAgICBpZiAoc1JlcXVpcmVzLmNoYXJBdCgwKSAhPT0gJ18nKSB7XG4gICAgICByZXN1bHQucHVzaChgcmVjb3JkOiAke3NSZXF1aXJlc30gLT4gJHthbnN3ZXIucmVjb3JkW3NSZXF1aXJlc119YCk7XG4gICAgfVxuICAgIHJlc3VsdC5wdXNoKCdcXG4nKTtcbiAgfSk7XG4gIHZhciBvU2VudGVuY2UgPSBhbnN3ZXIuc2VudGVuY2U7XG4gIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaW5kZXgpIHtcbiAgICB2YXIgc1dvcmQgPSBgWyR7aW5kZXh9XSA6ICR7b1dvcmQuY2F0ZWdvcnl9IFwiJHtvV29yZC5zdHJpbmd9XCIgPT4gXCIke29Xb3JkLm1hdGNoZWRTdHJpbmd9XCJgXG4gICAgcmVzdWx0LnB1c2goc1dvcmQgKyBcIlxcblwiKTtcbiAgfSlcbiAgcmVzdWx0LnB1c2goXCIuXFxuXCIpO1xuICByZXR1cm4gcmVzdWx0LnM7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGR1bXBXZWlnaHRzVG9wKHRvb2xtYXRjaGVzOiBBcnJheTxJTWF0Y2guSVdoYXRJc0Fuc3dlcj4sIG9wdGlvbnM6IGFueSkge1xuICB2YXIgcyA9ICcnO1xuICB0b29sbWF0Y2hlcy5mb3JFYWNoKGZ1bmN0aW9uIChvTWF0Y2gsIGluZGV4KSB7XG4gICAgaWYgKGluZGV4IDwgb3B0aW9ucy50b3ApIHtcbiAgICAgIHMgPSBzICsgXCJXaGF0SXNBbnN3ZXJbXCIgKyBpbmRleCArIFwiXS4uLlxcblwiO1xuICAgICAgcyA9IHMgKyBkdW1wTmljZShvTWF0Y2gpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyRGlzdGluY3RSZXN1bHRBbmRTb3J0VHVwZWwocmVzOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc1R1cGVsQW5zd2Vycyk6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzVHVwZWxBbnN3ZXJzIHtcbiAgdmFyIHJlc3VsdCA9IHJlcy50dXBlbGFuc3dlcnMuZmlsdGVyKGZ1bmN0aW9uIChpUmVzLCBpbmRleCkge1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICBkZWJ1Z2xvZygnIHJldGFpbiB0dXBlbCAnICsgaW5kZXggKyAnICcgKyBKU09OLnN0cmluZ2lmeShpUmVzKSk7XG4gICAgfVxuICAgIGlmIChfLmlzRXF1YWwoaVJlcy5yZXN1bHQsIHJlcy50dXBlbGFuc3dlcnNbaW5kZXggLSAxXSAmJiByZXMudHVwZWxhbnN3ZXJzW2luZGV4IC0gMV0ucmVzdWx0KSkge1xuICAgICAgZGVidWdsb2coJ3NraXAnKTtcbiAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG4gIHJlc3VsdC5zb3J0KGNtcEJ5UmFua2luZ1R1cGVsKTtcbiAgcmV0dXJuIE9iamVjdC5hc3NpZ24ocmVzLCB7IHR1cGVsYW5zd2VyczogcmVzdWx0IH0pO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJPbmx5VG9wUmFua2VkKHJlc3VsdHM6IEFycmF5PElNYXRjaC5JV2hhdElzQW5zd2VyPik6IEFycmF5PElNYXRjaC5JV2hhdElzQW5zd2VyPiB7XG4gIHZhciByZXMgPSByZXN1bHRzLmZpbHRlcihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgaWYgKHNhZmVFcXVhbChyZXN1bHQuX3JhbmtpbmcsIHJlc3VsdHNbMF0uX3JhbmtpbmcpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHJlc3VsdC5fcmFua2luZyA+PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJMaXN0IHRvIGZpbHRlciBtdXN0IGJlIG9yZGVyZWRcIik7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG4gIHJldHVybiByZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJPbmx5VG9wUmFua2VkVHVwZWwocmVzdWx0czogQXJyYXk8SU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlcj4pOiBBcnJheTxJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyPiB7XG4gIHZhciByZXMgPSByZXN1bHRzLmZpbHRlcihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgaWYgKCBzYWZlRXF1YWwocmVzdWx0Ll9yYW5raW5nLCByZXN1bHRzWzBdLl9yYW5raW5nKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChyZXN1bHQuX3JhbmtpbmcgPj0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTGlzdCB0byBmaWx0ZXIgbXVzdCBiZSBvcmRlcmVkXCIpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuICByZXR1cm4gcmVzO1xufVxuXG5cbi8qKlxuICogQSByYW5raW5nIHdoaWNoIGlzIHB1cmVseSBiYXNlZCBvbiB0aGUgbnVtYmVycyBvZiBtYXRjaGVkIGVudGl0aWVzLFxuICogZGlzcmVnYXJkaW5nIGV4YWN0bmVzcyBvZiBtYXRjaFxuICovXG4vKlxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNSYW5raW5nU2ltcGxlKG1hdGNoZWQ6IG51bWJlcixcbiAgbWlzbWF0Y2hlZDogbnVtYmVyLCBub3VzZTogbnVtYmVyLFxuICByZWxldmFudENvdW50OiBudW1iZXIpOiBudW1iZXIge1xuICAvLyAyIDogMFxuICAvLyAxIDogMFxuICB2YXIgZmFjdG9yID0gbWF0Y2hlZCAqIE1hdGgucG93KDEuNSwgbWF0Y2hlZCkgKiBNYXRoLnBvdygxLjUsIG1hdGNoZWQpO1xuICB2YXIgZmFjdG9yMiA9IE1hdGgucG93KDAuNCwgbWlzbWF0Y2hlZCk7XG4gIHZhciBmYWN0b3IzID0gTWF0aC5wb3coMC40LCBub3VzZSk7XG4gIHJldHVybiBNYXRoLnBvdyhmYWN0b3IyICogZmFjdG9yICogZmFjdG9yMywgMSAvIChtaXNtYXRjaGVkICsgbWF0Y2hlZCArIG5vdXNlKSk7XG59XG4qL1xuXG5leHBvcnQgZnVuY3Rpb24gY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkOiB7IFtrZXk6IHN0cmluZ106IElNYXRjaC5JV29yZCB9LFxuICBoYXNDYXRlZ29yeTogeyBba2V5OiBzdHJpbmddOiBudW1iZXIgfSxcbiAgbWlzbWF0Y2hlZDogeyBba2V5OiBzdHJpbmddOiBJTWF0Y2guSVdvcmQgfSwgcmVsZXZhbnRDb3VudDogbnVtYmVyLCBoYXNEb21haW4gOiBudW1iZXIpOiBudW1iZXIge1xuXG5cbiAgdmFyIGxlbk1hdGNoZWQgPSBPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGg7XG4gIHZhciBmYWN0b3IgPSBNYXRjaC5jYWxjUmFua2luZ1Byb2R1Y3QobWF0Y2hlZCk7XG4gIGZhY3RvciAqPSBNYXRoLnBvdygxLjUsIGxlbk1hdGNoZWQpO1xuICBpZihoYXNEb21haW4pIHtcbiAgICBmYWN0b3IgKj0gMS41O1xuICB9XG4gIHZhciBsZW5IYXNDYXRlZ29yeSA9IE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5sZW5ndGg7XG4gIHZhciBmYWN0b3JIID0gTWF0aC5wb3coMS4xLCBsZW5IYXNDYXRlZ29yeSk7XG5cbiAgdmFyIGxlbk1pc01hdGNoZWQgPSBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGg7XG4gIHZhciBmYWN0b3IyID0gTWF0Y2guY2FsY1JhbmtpbmdQcm9kdWN0KG1pc21hdGNoZWQpO1xuICBmYWN0b3IyICo9IE1hdGgucG93KDAuNCwgbGVuTWlzTWF0Y2hlZCk7XG4gIHZhciBkaXZpc29yID0gIChsZW5NaXNNYXRjaGVkICsgbGVuSGFzQ2F0ZWdvcnkgKyBsZW5NYXRjaGVkKTtcbiAgZGl2aXNvciA9IGRpdmlzb3IgPyBkaXZpc29yIDogMTtcbiAgcmV0dXJuIE1hdGgucG93KGZhY3RvcjIgKiBmYWN0b3JIICogZmFjdG9yLCAxIC8gKGRpdmlzb3IpKTtcbn1cblxuLyoqXG4gKiBsaXN0IGFsbCB0b3AgbGV2ZWwgcmFua2luZ3NcbiAqL1xuLypcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFJlY29yZHNIYXZpbmdDb250ZXh0KFxuICBwU2VudGVuY2VzOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcywgY2F0ZWdvcnk6IHN0cmluZywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+LFxuICBjYXRlZ29yeVNldDogeyBba2V5OiBzdHJpbmddOiBib29sZWFuIH0pXG4gIDogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzIHtcblxuICAvL2RlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZHMsIHVuZGVmaW5lZCwgMikpO1xuICB2YXIgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZDogSU1hdGNoLklSZWNvcmQpIHtcbiAgICByZXR1cm4gKHJlY29yZFtjYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkgJiYgKHJlY29yZFtjYXRlZ29yeV0gIT09IG51bGwpO1xuICB9KTtcbiAgdmFyIHJlcyA9IFtdO1xuICBkZWJ1Z2xvZyhcIk1hdGNoUmVjb3Jkc0hhdmluZ0NvbnRleHQgOiByZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCk7XG4gIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJzZW50ZW5jZXMgYXJlIDogXCIgKyBKU09OLnN0cmluZ2lmeShwU2VudGVuY2VzLCB1bmRlZmluZWQsIDIpKSA6IFwiLVwiKTtcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImNhdGVnb3J5IFwiICsgY2F0ZWdvcnkgKyBcIiBhbmQgY2F0ZWdvcnlzZXQgaXM6IFwiICsgSlNPTi5zdHJpbmdpZnkoY2F0ZWdvcnlTZXQsIHVuZGVmaW5lZCwgMikpIDogXCItXCIpO1xuICBpZiAocHJvY2Vzcy5lbnYuQUJPVF9GQVNUICYmIGNhdGVnb3J5U2V0KSB7XG4gICAgLy8gd2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbiBjYXRlZ29yaWVzIHByZXNlbnQgaW4gcmVjb3JkcyBmb3IgZG9tYWlucyB3aGljaCBjb250YWluIHRoZSBjYXRlZ29yeVxuICAgIC8vIHZhciBjYXRlZ29yeXNldCA9IE1vZGVsLmNhbGN1bGF0ZVJlbGV2YW50UmVjb3JkQ2F0ZWdvcmllcyh0aGVNb2RlbCxjYXRlZ29yeSk7XG4gICAgLy9rbm93aW5nIHRoZSB0YXJnZXRcbiAgICBwZXJmbG9nKFwiZ290IGNhdGVnb3J5c2V0IHdpdGggXCIgKyBPYmplY3Qua2V5cyhjYXRlZ29yeVNldCkubGVuZ3RoKTtcbiAgICB2YXIgZmwgPSAwO1xuICAgIHZhciBsZiA9IDA7XG4gICAgdmFyIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gcFNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIHZhciBmV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICByZXR1cm4gIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCk7XG4gICAgICB9KTtcbiAgICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICByZXR1cm4gISFjYXRlZ29yeVNldFtvV29yZC5jYXRlZ29yeV0gfHwgV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpO1xuICAgICAgfSk7XG4gICAgICBmbCA9IGZsICsgb1NlbnRlbmNlLmxlbmd0aDtcbiAgICAgIGxmID0gbGYgKyByV29yZHMubGVuZ3RoO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsIC8vIG5vdCBhIGZpbGxlciAgLy8gdG8gYmUgY29tcGF0aWJsZSBpdCB3b3VsZCBiZSBmV29yZHNcbiAgICAgICAgcldvcmRzOiByV29yZHNcbiAgICAgIH07XG4gICAgfSk7XG4gICAgT2JqZWN0LmZyZWV6ZShhU2ltcGxpZmllZFNlbnRlbmNlcyk7XG4gICAgZGVidWdsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIGZsICsgXCItPlwiICsgbGYgKyBcIilcIik7XG4gICAgcGVyZmxvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgZmwgKyBcIi0+XCIgKyBsZiArIFwiKVwiKTtcbiAgICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICBhU2ltcGxpZmllZFNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgICAgdmFyIGhhc0NhdGVnb3J5ID0ge307XG4gICAgICAgIHZhciBtaXNtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gYVNlbnRlbmNlLmNudFJlbGV2YW50V29yZHM7XG4gICAgICAgIGFTZW50ZW5jZS5yV29yZHMuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgIG1hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpICYmIHJlY29yZFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgaGFzQ2F0ZWdvcnlbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSAxO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgICBpZiAoKE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aCArIE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5sZW5ndGgpID4gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoKSB7XG4gICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgc2VudGVuY2U6IGFTZW50ZW5jZS5vU2VudGVuY2UsXG4gICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICAgIHJlc3VsdDogcmVjb3JkW2NhdGVnb3J5XSxcbiAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0pO1xuICAgIGRlYnVnbG9nKFwiaGVyZSBpbiB3ZWlyZFwiKTtcbiAgfSBlbHNlIHtcbiAgICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICBwU2VudGVuY2VzLnNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgICAgdmFyIGhhc0NhdGVnb3J5ID0ge307XG4gICAgICAgIHZhciBtaXNtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gMDtcbiAgICAgICAgYVNlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgaWYgKCFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpKSB7XG4gICAgICAgICAgICBjbnRSZWxldmFudFdvcmRzID0gY250UmVsZXZhbnRXb3JkcyArIDE7XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKSAmJiByZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgICAgaGFzQ2F0ZWdvcnlbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICgoT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoICsgT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aCkgPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLFxuICAgICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgICByZXN1bHQ6IHJlY29yZFtjYXRlZ29yeV0sXG4gICAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KTtcbiAgfVxuICByZXMuc29ydChjbXBCeVJlc3VsdFRoZW5SYW5raW5nKTtcbiAgZGVidWdsb2coXCIgYWZ0ZXIgc29ydFwiICsgcmVzLmxlbmd0aCk7XG4gIHZhciByZXN1bHQgPSBPYmplY3QuYXNzaWduKHt9LCBwU2VudGVuY2VzLCB7IGFuc3dlcnM6IHJlcyB9KTtcbiAgcmV0dXJuIGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdChyZXN1bHQpO1xufVxuKi9cblxuLypcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFJlY29yZHMoYVNlbnRlbmNlczogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMsIGNhdGVnb3J5OiBzdHJpbmcsIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPilcbiAgOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnMge1xuICAvLyBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAvLyAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZHMsIHVuZGVmaW5lZCwgMikpO1xuICAvLyB9XG4gIHZhciByZWxldmFudFJlY29yZHMgPSByZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAocmVjb3JkOiBJTWF0Y2guSVJlY29yZCkge1xuICAgIHJldHVybiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSAmJiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gbnVsbCk7XG4gIH0pO1xuICB2YXIgcmVzID0gW107XG4gIGRlYnVnbG9nKFwicmVsZXZhbnQgcmVjb3JkcyBucjpcIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGgpO1xuICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgYVNlbnRlbmNlcy5zZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAoYVNlbnRlbmNlKSB7XG4gICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICB2YXIgbWlzbWF0Y2hlZCA9IHt9XG4gICAgICB2YXIgbWF0Y2hlZCA9IHt9O1xuICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSAwO1xuICAgICAgYVNlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIGlmICghV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKSkge1xuICAgICAgICAgIGNudFJlbGV2YW50V29yZHMgPSBjbnRSZWxldmFudFdvcmRzICsgMTtcbiAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgIG1hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBpZiAoT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoID4gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoKSB7XG4gICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLFxuICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICByZXN1bHQ6IHJlY29yZFtjYXRlZ29yeV0sXG4gICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nKG1hdGNoZWQsIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pXG4gIH0pO1xuICByZXMuc29ydChjbXBCeVJlc3VsdFRoZW5SYW5raW5nKTtcbiAgdmFyIHJlc3VsdCA9IE9iamVjdC5hc3NpZ24oe30sIGFTZW50ZW5jZXMsIHsgYW5zd2VyczogcmVzIH0pO1xuICByZXR1cm4gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0KHJlc3VsdCk7XG59XG4qL1xuLypcbmZ1bmN0aW9uIG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzQ2F0ZWdvcnlTZXQoYVNlbnRlbmNlczogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMsXG4gIGNhdGVnb3J5U2V0OiB7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfSwgdHJhY2s6IHsgZmw6IG51bWJlciwgbGY6IG51bWJlciB9XG4pOiB7XG4gIGRvbWFpbnM6IHN0cmluZ1tdLFxuICBvU2VudGVuY2U6IElNYXRjaC5JU2VudGVuY2UsXG4gIGNudFJlbGV2YW50V29yZHM6IG51bWJlcixcbiAgcldvcmRzOiBJTWF0Y2guSVdvcmRbXVxufVtdIHtcbiAgcmV0dXJuIGFTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgdmFyIGFEb21haW5zID0gW10gYXMgc3RyaW5nW107XG4gICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwiZG9tYWluXCIpIHtcbiAgICAgICAgYURvbWFpbnMucHVzaChvV29yZC5tYXRjaGVkU3RyaW5nKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcIm1ldGFcIikge1xuICAgICAgICAvLyBlLmcuIGRvbWFpbiBYWFhcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuICEhY2F0ZWdvcnlTZXRbb1dvcmQuY2F0ZWdvcnldO1xuICAgIH0pO1xuICAgIHRyYWNrLmZsICs9IG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgdHJhY2subGYgKz0gcldvcmRzLmxlbmd0aDtcbiAgICByZXR1cm4ge1xuICAgICAgZG9tYWluczogYURvbWFpbnMsXG4gICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsXG4gICAgICByV29yZHM6IHJXb3Jkc1xuICAgIH07XG4gIH0pO1xufVxuKi9cblxuZnVuY3Rpb24gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXNDYXRlZ29yeVNldDIoYVNlbnRlbmNlczogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMsXG4gIGNhdGVnb3J5U2V0OiB7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfSwgdHJhY2s6IHsgZmw6IG51bWJlciwgbGY6IG51bWJlciB9XG4pOiB7XG4gIGRvbWFpbnM6IHN0cmluZ1tdLFxuICBvU2VudGVuY2U6IElNYXRjaC5JU2VudGVuY2UsXG4gIGNudFJlbGV2YW50V29yZHM6IG51bWJlcixcbiAgcldvcmRzOiBJTWF0Y2guSVdvcmRbXVxufVtdIHtcbiAgcmV0dXJuIGFTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgdmFyIGFEb21haW5zID0gW10gYXMgc3RyaW5nW107XG4gICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwiZG9tYWluXCIpIHtcbiAgICAgICAgYURvbWFpbnMucHVzaChvV29yZC5tYXRjaGVkU3RyaW5nKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcIm1ldGFcIikge1xuICAgICAgICAvLyBlLmcuIGRvbWFpbiBYWFhcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYob1dvcmQuY2F0ZWdvcnkgPT09IFwiY2F0ZWdvcnlcIikge1xuICAgICAgICBpZihjYXRlZ29yeVNldFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gISFjYXRlZ29yeVNldFtvV29yZC5jYXRlZ29yeV07XG4gICAgfSk7XG4gICAgdHJhY2suZmwgKz0gb1NlbnRlbmNlLmxlbmd0aDtcbiAgICB0cmFjay5sZiArPSByV29yZHMubGVuZ3RoO1xuICAgIHJldHVybiB7XG4gICAgICBkb21haW5zOiBhRG9tYWlucyxcbiAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCxcbiAgICAgIHJXb3JkczogcldvcmRzXG4gICAgfTtcbiAgfSk7XG59XG5cblxuZnVuY3Rpb24gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXMoYVNlbnRlbmNlcyA6IElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzLCAgdHJhY2s6IHsgZmw6IG51bWJlciwgbGY6IG51bWJlciB9KToge1xuICBkb21haW5zOiBzdHJpbmdbXSxcbiAgb1NlbnRlbmNlOiBJTWF0Y2guSVNlbnRlbmNlLFxuICBjbnRSZWxldmFudFdvcmRzOiBudW1iZXIsXG4gIHJXb3JkczogSU1hdGNoLklXb3JkW11cbn1bXSB7XG4gIHJldHVybiBhU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgIHZhciBkb21haW5zID0gW10gYXMgc3RyaW5nW107XG4gICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwiZG9tYWluXCIpIHtcbiAgICAgICAgZG9tYWlucy5wdXNoKG9Xb3JkLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwibWV0YVwiKSB7XG4gICAgICAgIC8vIGUuZy4gZG9tYWluIFhYWFxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCk7XG4gICAgfSk7XG4gICAgdHJhY2suZmwgKz0gb1NlbnRlbmNlLmxlbmd0aDtcbiAgICB0cmFjay5sZiArPSByV29yZHMubGVuZ3RoO1xuICAgIHJldHVybiB7XG4gICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgIGRvbWFpbnM6IGRvbWFpbnMsXG4gICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLFxuICAgICAgcldvcmRzOiByV29yZHNcbiAgICB9O1xuICB9KTtcbn1cblxuXG5mdW5jdGlvbiBleHRyYWN0UmVzdWx0KGNhdGVnb3JpZXM6IHN0cmluZ1tdLCByZWNvcmQ6IHsgW2tleTogc3RyaW5nXTogc3RyaW5nIH0pOiBzdHJpbmdbXSB7XG4gIHJldHVybiBjYXRlZ29yaWVzLm1hcChmdW5jdGlvbiAoY2F0ZWdvcnkpIHsgcmV0dXJuIHJlY29yZFtjYXRlZ29yeV0gfHwgXCJuL2FcIjsgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcyhwU2VudGVuY2VzOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcywgY2F0ZWdvcmllczogc3RyaW5nW10sIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPiwgZG9tYWluQ2F0ZWdvcnlGaWx0ZXI/OiBJTWF0Y2guSURvbWFpbkNhdGVnb3J5RmlsdGVyKVxuICA6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzVHVwZWxBbnN3ZXJzIHtcbiAgLy8gaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgLy8gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZHMsIHVuZGVmaW5lZCwgMikpO1xuICAvLyB9XG5cbiAgaWYoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIgJiYgISBkb21haW5DYXRlZ29yeUZpbHRlci5kb21haW5zICkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIm9sZCBjYXRlZ29yeXNTRXQgPz9cIilcbiAgfVxuXG4gIE9iamVjdC5mcmVlemUoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIpO1xuICB2YXIgY2F0ZWdvcnlGID0gY2F0ZWdvcmllc1swXTtcblxuICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwibWF0Y2hSZWNvcmRzUXVpY2tNdWx0aXBsZUNhdGVnb3JpZXMgKHI9XCIgKyAocmVjb3JkcyAmJiByZWNvcmRzLmxlbmd0aClcbiAgKyBcIiBzPVwiICsgKHBTZW50ZW5jZXMgJiYgcFNlbnRlbmNlcy5zZW50ZW5jZXMgJiYgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoKSArIFwiKVxcbiBjYXRlZ29yaWVzOlwiICsoY2F0ZWdvcmllcyAmJiAgY2F0ZWdvcmllcy5qb2luKFwiXFxuXCIpKSArIFwiIGNhdGVnb3J5U2V0OiBcIlxuICArICggZG9tYWluQ2F0ZWdvcnlGaWx0ZXIgJiYgKHR5cGVvZiBkb21haW5DYXRlZ29yeUZpbHRlci5jYXRlZ29yeVNldCA9PT0gXCJvYmplY3RcIikgJiYgT2JqZWN0LmtleXMoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIuY2F0ZWdvcnlTZXQpLmpvaW4oXCJcXG5cIikpKSAgOiBcIi1cIik7XG4gIHBlcmZsb2coXCJtYXRjaFJlY29yZHNRdWlja011bHQgLi4uKHI9XCIgKyByZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIilcIik7XG5cbiAgLy9jb25zb2xlLmxvZygnY2F0ZWdvcmllcyAnICsgIEpTT04uc3RyaW5naWZ5KGNhdGVnb3JpZXMpKTtcblxuICAvL2NvbnNvbGUubG9nKCdjYXRlZ3JveVNldCcgKyAgSlNPTi5zdHJpbmdpZnkoY2F0ZWdvcnlTZXQpKTtcblxuXG4gIHZhciByZWxldmFudFJlY29yZHMgPSByZWNvcmRzO1xuXG4gIGlmKGRvbWFpbkNhdGVnb3J5RmlsdGVyICYmIGRvbWFpbkNhdGVnb3J5RmlsdGVyLmRvbWFpbnMpIHtcbiAgICByZWxldmFudFJlY29yZHMgPSByZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAocmVjb3JkOiBJTWF0Y2guSVJlY29yZCkge1xuICAgICAgcmV0dXJuIChkb21haW5DYXRlZ29yeUZpbHRlci5kb21haW5zLmluZGV4T2YoKHJlY29yZCBhcyBhbnkpLl9kb21haW4pID49IDApO1xuICAgIH0pO1xuICB9XG4gIGVsc2Uge1xuICAgIHJlbGV2YW50UmVjb3JkcyA9IHJlbGV2YW50UmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZDogSU1hdGNoLklSZWNvcmQpIHtcbiAgICAgIHJldHVybiAhY2F0ZWdvcmllcy5ldmVyeShjYXQgPT5cbiAgICAgICAgICAgIChyZWNvcmRbY2F0XSA9PT0gdW5kZWZpbmVkKSB8fCAocmVjb3JkW2NhdF0gPT09IG51bGwpXG4gICAgICApO1xuICAvLyAgICAgIH1cblxuIC8vICAgICByZXR1cm4gKHJlY29yZFtjYXRlZ29yeUZdICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnlGXSAhPT0gbnVsbCk7XG4gICAgfSk7XG4gIH1cbiAgdmFyIHJlcyA9IFtdIGFzIEFycmF5PElNYXRjaC5JV2hhdElzVHVwZWxBbnN3ZXI+O1xuICBkZWJ1Z2xvZyhcInJlbGV2YW50IHJlY29yZHMgd2l0aCBmaXJzdCAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIilcIik7XG4gIHBlcmZsb2coXCJyZWxldmFudCByZWNvcmRzIHdpdGggZmlyc3QgbnI6XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgc2VudGVuY2VzIFwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoKTtcbiAgaWYgKC8qcHJvY2Vzcy5lbnYuQUJPVF9GQVNUICYmKi8gZG9tYWluQ2F0ZWdvcnlGaWx0ZXIpIHtcbiAgICAvLyB3ZSBhcmUgb25seSBpbnRlcmVzdGVkIGluIGNhdGVnb3JpZXMgcHJlc2VudCBpbiByZWNvcmRzIGZvciBkb21haW5zIHdoaWNoIGNvbnRhaW4gdGhlIGNhdGVnb3J5XG4gICAgLy8gdmFyIGNhdGVnb3J5c2V0ID0gTW9kZWwuY2FsY3VsYXRlUmVsZXZhbnRSZWNvcmRDYXRlZ29yaWVzKHRoZU1vZGVsLGNhdGVnb3J5KTtcbiAgICAvL2tub3dpbmcgdGhlIHRhcmdldFxuICAgIHBlcmZsb2coXCJnb3QgY2F0ZWdvcnlzZXQgd2l0aCBcIiArIE9iamVjdC5rZXlzKGRvbWFpbkNhdGVnb3J5RmlsdGVyLmNhdGVnb3J5U2V0KS5sZW5ndGgpO1xuICAgIHZhciBvYmogPSB7IGZsOiAwLCBsZjogMCB9O1xuICAgIHZhciBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IFtdIGFzIHtcbiAgICAgIGRvbWFpbnM6IHN0cmluZ1tdLFxuICAgICAgb1NlbnRlbmNlOiBJTWF0Y2guSVNlbnRlbmNlLFxuICAgICAgY250UmVsZXZhbnRXb3JkczogbnVtYmVyLFxuICAgICAgcldvcmRzOiBJTWF0Y2guSVdvcmRbXVxuICAgIH1bXTtcbiAgLy8gIGlmIChwcm9jZXNzLmVudi5BQk9UX0JFVDEpIHtcbiAgICAgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBtYWtlU2ltcGxpZmllZFNlbnRlbmNlc0NhdGVnb3J5U2V0MihwU2VudGVuY2VzLCBkb21haW5DYXRlZ29yeUZpbHRlci5jYXRlZ29yeVNldCwgb2JqKSBhcyBhbnk7XG4gIC8vICB9IGVsc2Uge1xuICAvLyAgICBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzQ2F0ZWdvcnlTZXQocFNlbnRlbmNlcywgY2F0ZWdvcnlTZXQsIG9iaikgYXMgYW55O1xuICAvLyAgfVxuICAgIHBlcmZsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIG9iai5mbCArIFwiLT5cIiArIG9iai5sZiArIFwiKVwiKTtcbiAgfSBlbHNlIHtcbiAgICBkZWJ1Z2xvZyhcIm5vdCBhYm90X2Zhc3QgIVwiKTtcbiAgICB2YXIgdHJhY2sgPSB7IGZsOiAwICwgbGYgOiAwfTtcbiAgICB2YXIgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBtYWtlU2ltcGxpZmllZFNlbnRlbmNlcyhwU2VudGVuY2VzLHRyYWNrKTtcbi8qXG4gICAgcFNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICByZXR1cm4gIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCk7XG4gICAgICB9KTtcbiAgICAgIGZsID0gZmwgKyBvU2VudGVuY2UubGVuZ3RoO1xuICAgICAgbGYgPSBsZiArIHJXb3Jkcy5sZW5ndGg7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCxcbiAgICAgICAgcldvcmRzOiByV29yZHNcbiAgICAgIH07XG4gICAgfSk7XG4gICAgKi9cbiAgICBkZWJ1Z2xvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgdHJhY2suZmwgKyBcIi0+XCIgKyB0cmFjay5sZiArIFwiKVwiKTtcbiAgICBwZXJmbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyB0cmFjay5mbCArIFwiLT5cIiArIHRyYWNrLmxmICsgXCIpXCIpO1xuICB9XG5cbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImhlcmUgc2ltcGxpZmllZCBzZW50ZW5jZXMgXCIgK1xuICBhU2ltcGxpZmllZFNlbnRlbmNlcy5tYXAobyA9PiBcIlxcbkRvbWFpbj1cIiArIG8uZG9tYWlucy5qb2luKFwiXFxuXCIpICsgXCJcXG5cIiArICBTZW50ZW5jZS5kdW1wTmljZShvLnJXb3JkcykpLmpvaW4oXCJcXG5cIikpIDogXCItXCIpO1xuXG4gIC8vY29uc29sZS5sb2coXCJoZXJlIHJlY3JvZHNcIiArIHJlbGV2YW50UmVjb3Jkcy5tYXAoIChvLGluZGV4KSA9PiAgXCIgaW5kZXggPSBcIiArIGluZGV4ICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShvKSkuam9pbihcIlxcblwiKSk7XG4gIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICBhU2ltcGxpZmllZFNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgIHZhciBpbWlzbWF0Y2hlZCA9IDA7XG4gICAgICB2YXIgaW1hdGNoZWQgPSAwO1xuICAgICAgdmFyIG5vdXNlID0gMDtcbiAgICAgIHZhciBmb3VuZGNhdCA9IDE7XG4gICAgICB2YXIgbWlzc2luZ2NhdCA9IDA7XG5cbiAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICB2YXIgbWlzbWF0Y2hlZCA9IHt9O1xuICAgICAgdmFyIGhhc0NhdGVnb3J5ID0ge307XG5cbiAgICAgIGFTZW50ZW5jZS5yV29yZHMuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSAwO1xuICAgICAgICBpZiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICsraW1hdGNoZWQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICsraW1pc21hdGNoZWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAhPT0gXCJjYXRlZ29yeVwiKSB7XG4gICAgICAgICAgICBub3VzZSArPSAxO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoIXJlY29yZFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgICBtaXNzaW5nY2F0ICs9IDE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBmb3VuZGNhdCs9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpICYmIHJlY29yZFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgaGFzQ2F0ZWdvcnlbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSAxO1xuICAgICAgICB9IGVsc2UgaWYoIVdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKSkge1xuICAgICAgICAgICAvLyBUT0RPIGJldHRlciB1bm1hY2h0ZWRcbiAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgdmFyIG1hdGNoZWREb21haW4gPSAwO1xuICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSBhU2VudGVuY2UucldvcmRzLmxlbmd0aDtcbiAgICAgIGlmIChhU2VudGVuY2UuZG9tYWlucy5sZW5ndGgpIHtcbiAgICAgICAgaWYgKChyZWNvcmQgYXMgYW55KS5fZG9tYWluICE9PSBhU2VudGVuY2UuZG9tYWluc1swXSkge1xuICAgICAgICAgIGltaXNtYXRjaGVkID0gMzAwMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpbWF0Y2hlZCArPSAxO1xuICAgICAgICAgIG1hdGNoZWREb21haW4gKz0gMTtcbiAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiR09UIEEgRE9NQUlOIEhJVFwiICsgbWF0Y2hlZCArIFwiIFwiICsgbWlzbWF0Y2hlZCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHZhciBtYXRjaGVkTGVuID0gT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoICsgT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aDtcbiAgICAgIHZhciBtaXNtYXRjaGVkTGVuID0gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoO1xuICAgICAgaWYgKChpbWlzbWF0Y2hlZCA8IDMwMDApXG4gICAgICAgICYmICgobWF0Y2hlZExlbiA+IG1pc21hdGNoZWRMZW4pXG4gICAgICAgICAgfHwgKG1hdGNoZWRMZW4gPT09IG1pc21hdGNoZWRMZW4gJiYgbWF0Y2hlZERvbWFpbiA+IDApKVxuICAgICAgKSB7XG4gICAgICAgIC8qXG4gICAgICAgICAgZGVidWdsb2coXCJhZGRpbmcgXCIgKyBleHRyYWN0UmVzdWx0KGNhdGVnb3JpZXMscmVjb3JkKS5qb2luKFwiO1wiKSk7XG4gICAgICAgICAgZGVidWdsb2coXCJ3aXRoIHJhbmtpbmcgOiBcIiArIGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkyKG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzLCBtYXRjaGVkRG9tYWluKSk7XG4gICAgICAgICAgZGVidWdsb2coXCIgY3JlYXRlZCBieSBcIiArIE9iamVjdC5rZXlzKG1hdGNoZWQpLm1hcChrZXkgPT4gXCJrZXk6XCIgKyBrZXlcbiAgICAgICAgICArIFwiXFxuXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkW2tleV0pKS5qb2luKFwiXFxuXCIpXG4gICAgICAgICAgKyBcIlxcbmhhc0NhdCBcIiArIEpTT04uc3RyaW5naWZ5KGhhc0NhdGVnb3J5KVxuICAgICAgICAgICsgXCJcXG5taXNtYXQgXCIgKyBKU09OLnN0cmluZ2lmeShtaXNtYXRjaGVkKVxuICAgICAgICAgICsgXCJcXG5jblRyZWwgXCIgKyBKU09OLnN0cmluZ2lmeShjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICAgICsgXCJcXG5tYXRjZWREb21haW4gXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkRG9tYWluKVxuICAgICAgICAgICsgXCJcXG5oYXNDYXQgXCIgKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSlcbiAgICAgICAgICArIFwiXFxubWlzbWF0IFwiICsgT2JqZWN0LmtleXMobWlzbWF0Y2hlZClcbiAgICAgICAgICArIGBcXG5tYXRjaGVkICR7T2JqZWN0LmtleXMobWF0Y2hlZCl9IFxcbmhhc2NhdCAke09iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5qb2luKFwiOyBcIil9IFxcbm1pc206ICR7T2JqZWN0LmtleXMobWlzbWF0Y2hlZCl9IFxcbmBcbiAgICAgICAgICArIFwiXFxubWF0Y2VkRG9tYWluIFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZERvbWFpbilcblxuICAgICAgICAgICk7XG4gICAgICAgICAgKi9cblxuICAgICAgICB2YXIgcmVjID0ge1xuICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2Uub1NlbnRlbmNlLFxuICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgIGNhdGVnb3JpZXM6IGNhdGVnb3JpZXMsXG4gICAgICAgICAgcmVzdWx0OiBleHRyYWN0UmVzdWx0KGNhdGVnb3JpZXMsIHJlY29yZCksXG4gICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMsIG1hdGNoZWREb21haW4pXG4gICAgICAgIH07XG4gICAgICAgIC8vY29uc29sZS5sb2coXCJoZXJlIHJhbmtpbmdcIiArIHJlYy5fcmFua2luZylcbiAgICAgICAgaWYgKChyZWMuX3JhbmtpbmcgPT09IG51bGwpIHx8ICFyZWMuX3JhbmtpbmcpIHtcbiAgICAgICAgICByZWMuX3JhbmtpbmcgPSAwLjk7XG4gICAgICAgIH1cbiAgICAgICAgcmVzLnB1c2gocmVjKTtcbiAgICAgIH1cbiAgICB9KVxuICB9KTtcbiAgcGVyZmxvZyhcInNvcnQgKGE9XCIgKyByZXMubGVuZ3RoICsgXCIpXCIpO1xuICByZXMuc29ydChjbXBCeVJlc3VsdFRoZW5SYW5raW5nVHVwZWwpO1xuICBwZXJmbG9nKFwiTVJRTUMgZmlsdGVyUmV0YWluIC4uLlwiKTtcbiAgdmFyIHJlc3VsdDEgPSBPYmplY3QuYXNzaWduKHsgdHVwZWxhbnN3ZXJzOiByZXMgfSwgcFNlbnRlbmNlcyk7XG4gIC8qZGVidWdsb2coXCJORVdNQVBcIiArIHJlcy5tYXAobyA9PiBcIlxcbnJhbmtcIiArIG8uX3JhbmtpbmcgKyBcIiA9PlwiXG4gICAgICAgICAgICAgICsgby5yZXN1bHQuam9pbihcIlxcblwiKSkuam9pbihcIlxcblwiKSk7ICovXG4gIHZhciByZXN1bHQyID0gZmlsdGVyRGlzdGluY3RSZXN1bHRBbmRTb3J0VHVwZWwocmVzdWx0MSk7XG4gIHBlcmZsb2coXCJNUlFNQyBtYXRjaFJlY29yZHNRdWljayBkb25lOiAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgYT1cIiArIHJlcy5sZW5ndGggKyBcIilcIik7XG4gIHJldHVybiByZXN1bHQyO1xufVxuXG5cbmZ1bmN0aW9uIGNsYXNzaWZ5V29yZFdpdGhUYXJnZXRDYXRlZ29yeSh3b3JkOiBzdHJpbmcsIHRhcmdldGNhdGVnb3J5OiBzdHJpbmcsIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcyxcbiAgd2hvbGVzZW50ZW5jZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgLy9jb25zb2xlLmxvZyhcImNsYXNzaWZ5IFwiICsgd29yZCArIFwiIFwiICArIHRhcmdldGNhdGVnb3J5KTtcbiAgdmFyIGNhdHMgPSBJbnB1dEZpbHRlci5jYXRlZ29yaXplQVdvcmQod29yZCwgcnVsZXMsIHdob2xlc2VudGVuY2UsIHt9KTtcbiAgLy8gVE9ETyBxdWFsaWZ5XG4gIGNhdHMgPSBjYXRzLmZpbHRlcihmdW5jdGlvbiAoY2F0KSB7XG4gICAgcmV0dXJuIGNhdC5jYXRlZ29yeSA9PT0gdGFyZ2V0Y2F0ZWdvcnk7XG4gIH0pXG4gIC8vZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoY2F0cykpO1xuICBpZiAoY2F0cy5sZW5ndGgpIHtcbiAgICByZXR1cm4gY2F0c1swXS5tYXRjaGVkU3RyaW5nO1xuICB9XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVDYXRlZ29yeShjYXRlZ29yeXdvcmQ6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCB3aG9sZXNlbnRlbmNlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KGNhdGVnb3J5d29yZCwgJ2NhdGVnb3J5JywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3BsaXRBdENvbW1hQW5kKHN0cjogc3RyaW5nKTogc3RyaW5nW10ge1xuICB2YXIgciA9IHN0ci5zcGxpdCgvKFxcYmFuZFxcYil8WyxdLyk7XG4gIHIgPSByLmZpbHRlcihmdW5jdGlvbiAobywgaW5kZXgpIHtcbiAgICBpZiAoaW5kZXggJSAyID4gMCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG4gIHZhciBydHJpbW1lZCA9IHIubWFwKGZ1bmN0aW9uIChvKSB7XG4gICAgcmV0dXJuIG5ldyBTdHJpbmcobykudHJpbSgpO1xuICB9KTtcbiAgcmV0dXJuIHJ0cmltbWVkO1xufVxuLyoqXG4gKiBBIHNpbXBsZSBpbXBsZW1lbnRhdGlvbiwgc3BsaXR0aW5nIGF0IGFuZCBhbmQgLFxuICovXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZUNhdGVnb3J5TXVsdE9ubHlBbmRDb21tYShjYXRlZ29yeWxpc3Q6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCB3aG9sZXNlbnRlbmNlOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIHZhciBydHJpbW1lZCA9IHNwbGl0QXRDb21tYUFuZChjYXRlZ29yeWxpc3QpO1xuICB2YXIgcmNhdCA9IHJ0cmltbWVkLm1hcChmdW5jdGlvbiAobykge1xuICAgIHJldHVybiBhbmFseXplQ2F0ZWdvcnkobywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xuICB9KTtcbiAgaWYgKHJjYXQuaW5kZXhPZih1bmRlZmluZWQpID49IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1wiJyArIHJ0cmltbWVkW3JjYXQuaW5kZXhPZih1bmRlZmluZWQpXSArICdcIiBpcyBub3QgYSBjYXRlZ29yeSEnKTtcbiAgfVxuICByZXR1cm4gcmNhdDtcbn1cblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJBY2NlcHRpbmdPbmx5KHJlczogSU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdW10sIGNhdGVnb3JpZXM6IHN0cmluZ1tdKTpcbiAgSU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdW10ge1xuICByZXR1cm4gcmVzLmZpbHRlcihmdW5jdGlvbiAoYVNlbnRlbmNlLCBpSW5kZXgpIHtcbiAgICByZXR1cm4gYVNlbnRlbmNlLmV2ZXJ5KGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgcmV0dXJuIGNhdGVnb3JpZXMuaW5kZXhPZihvV29yZC5jYXRlZ29yeSkgPj0gMDtcbiAgICB9KTtcbiAgfSlcbn1cblxuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIHByb2Nlc3NTdHJpbmcocXVlcnk6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzXG4pOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcyB7XG5cbi8vICBpZiAoIXByb2Nlc3MuZW52LkFCT1RfT0xETUFUQ0gpIHtcbiAgICByZXR1cm4gRXJCYXNlLnByb2Nlc3NTdHJpbmcocXVlcnksIHJ1bGVzLCBydWxlcy53b3JkQ2FjaGUpO1xuLy8gIH1cbi8qXG4gIHZhciBtYXRjaGVkID0gSW5wdXRGaWx0ZXIuYW5hbHl6ZVN0cmluZyhxdWVyeSwgcnVsZXMsIHNXb3Jkcyk7XG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgZGVidWdsb2coXCJBZnRlciBtYXRjaGVkIFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZCkpO1xuICB9XG4gIHZhciBhU2VudGVuY2VzID0gSW5wdXRGaWx0ZXIuZXhwYW5kTWF0Y2hBcnIobWF0Y2hlZCk7XG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgZGVidWdsb2coXCJhZnRlciBleHBhbmRcIiArIGFTZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICB9XG4gIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IElucHV0RmlsdGVyLnJlaW5Gb3JjZShhU2VudGVuY2VzKTtcbiAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICBkZWJ1Z2xvZyhcImFmdGVyIHJlaW5mb3JjZVwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICB9XG4gIHJldHVybiB7XG4gICAgZXJyb3JzOiBbXSxcbiAgICBzZW50ZW5jZXM6IGFTZW50ZW5jZXNSZWluZm9yY2VkXG4gIH0gYXMgSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXM7XG4qL1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBhbmFseXplQ29udGV4dFN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmc6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzKTpcbiAgSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMge1xuXG4gIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IHByb2Nlc3NTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcylcbiAgLy8gd2UgbGltaXQgYW5hbHlzaXMgdG8gbiBzZW50ZW5jZXNcbiAgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzID0gYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLnNsaWNlKDAsIEFsZ29sLkN1dG9mZl9TZW50ZW5jZXMpO1xuICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgIGRlYnVnbG9nKFwiYWZ0ZXIgcmVpbmZvcmNlIGFuZCBjdXRvZmZcIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5sZW5ndGggKyBcIlxcblwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgfVxuICByZXR1cm4gYVNlbnRlbmNlc1JlaW5mb3JjZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjbXBCeU5yQ2F0ZWdvcmllc0FuZFNhbWVEb21haW4oYTogSU1hdGNoLklTZW50ZW5jZSwgYjogSU1hdGNoLklTZW50ZW5jZSk6IG51bWJlciB7XG4gIC8vY29uc29sZS5sb2coXCJjb21wYXJlIGFcIiArIGEgKyBcIiBjbnRiIFwiICsgYik7XG4gIHZhciBjbnRhID0gU2VudGVuY2UuZ2V0RGlzdGluY3RDYXRlZ29yaWVzSW5TZW50ZW5jZShhKS5sZW5ndGg7XG4gIHZhciBjbnRiID0gU2VudGVuY2UuZ2V0RGlzdGluY3RDYXRlZ29yaWVzSW5TZW50ZW5jZShiKS5sZW5ndGg7XG4gIC8qXG4gICAgdmFyIGNudGEgPSBhLnJlZHVjZShmdW5jdGlvbihwcmV2LCBvV29yZCkge1xuICAgICAgcmV0dXJuIHByZXYgKyAoKG9Xb3JkLmNhdGVnb3J5ID09PSBcImNhdGVnb3J5XCIpPyAxIDogMCk7XG4gICAgfSwwKTtcbiAgICB2YXIgY250YiA9IGIucmVkdWNlKGZ1bmN0aW9uKHByZXYsIG9Xb3JkKSB7XG4gICAgICByZXR1cm4gcHJldiArICgob1dvcmQuY2F0ZWdvcnkgPT09IFwiY2F0ZWdvcnlcIik/IDEgOiAwKTtcbiAgICB9LDApO1xuICAgLy8gY29uc29sZS5sb2coXCJjbnQgYVwiICsgY250YSArIFwiIGNudGIgXCIgKyBjbnRiKTtcbiAgICovXG4gIHJldHVybiBjbnRiIC0gY250YTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVDYXRlZ29yeU11bHQoY2F0ZWdvcnlsaXN0OiBzdHJpbmcsIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgd2hvbGVzZW50ZW5jZTogc3RyaW5nLCBnV29yZHM6XG4gIHsgW2tleTogc3RyaW5nXTogSU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdIH0pOiBzdHJpbmdbXSB7XG5cblxuXG5cblxuICB2YXIgcmVzID0gYW5hbHl6ZUNvbnRleHRTdHJpbmcoY2F0ZWdvcnlsaXN0LCBydWxlcyk7XG4gIC8vICBkZWJ1Z2xvZyhcInJlc3VsdGluZyBjYXRlZ29yeSBzZW50ZW5jZXNcIiwgSlNPTi5zdHJpbmdpZnkocmVzKSk7XG4gIHZhciByZXMyID0gZmlsdGVyQWNjZXB0aW5nT25seShyZXMuc2VudGVuY2VzLCBbXCJjYXRlZ29yeVwiLCBcImZpbGxlclwiXSk7XG4gIC8vICBjb25zb2xlLmxvZyhcImhlcmUgcmVzMlwiICsgSlNPTi5zdHJpbmdpZnkocmVzMikgKTtcbiAgLy8gIGNvbnNvbGUubG9nKFwiaGVyZSB1bmRlZmluZWQgISArIFwiICsgcmVzMi5maWx0ZXIobyA9PiAhbykubGVuZ3RoKTtcbiAgcmVzMi5zb3J0KFNlbnRlbmNlLmNtcFJhbmtpbmdQcm9kdWN0KTtcbiAgZGVidWdsb2coXCJyZXN1bHRpbmcgY2F0ZWdvcnkgc2VudGVuY2VzOiBcXG5cIiwgZGVidWdsb2cuZW5hYmxlZCA/IChTZW50ZW5jZS5kdW1wTmljZUFycihyZXMyLnNsaWNlKDAsIDMpLCBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdCkpIDogJy0nKTtcbiAgLy8gVE9ETzogICByZXMyID0gZmlsdGVyQWNjZXB0aW5nT25seVNhbWVEb21haW4ocmVzMik7XG4gIC8vZGVidWdsb2coXCJyZXN1bHRpbmcgY2F0ZWdvcnkgc2VudGVuY2VzXCIsIEpTT04uc3RyaW5naWZ5KHJlczIsIHVuZGVmaW5lZCwgMikpO1xuICAvLyBleHBlY3Qgb25seSBjYXRlZ29yaWVzXG4gIC8vIHdlIGNvdWxkIHJhbmsgbm93IGJ5IGNvbW1vbiBkb21haW5zICwgYnV0IGZvciBub3cgd2Ugb25seSB0YWtlIHRoZSBmaXJzdCBvbmVcbiAgaWYgKCFyZXMyLmxlbmd0aCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgLy9yZXMuc29ydChjbXBCeU5yQ2F0ZWdvcmllc0FuZFNhbWVEb21haW4pO1xuICB2YXIgcmVzY2F0ID0gU2VudGVuY2UuZ2V0RGlzdGluY3RDYXRlZ29yaWVzSW5TZW50ZW5jZShyZXMyWzBdKTtcbiAgcmV0dXJuIHJlc2NhdDtcbiAgLy8gXCJcIiByZXR1cm4gcmVzWzBdLmZpbHRlcigpXG4gIC8vIHJldHVybiBjbGFzc2lmeVdvcmRXaXRoVGFyZ2V0Q2F0ZWdvcnkoY2F0ZWdvcnlsaXN0LCAnY2F0ZWdvcnknLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhbmFseXplT3BlcmF0b3Iob3B3b3JkOiBzdHJpbmcsIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgd2hvbGVzZW50ZW5jZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGNsYXNzaWZ5V29yZFdpdGhUYXJnZXRDYXRlZ29yeShvcHdvcmQsICdvcGVyYXRvcicsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlKTtcbn1cblxuXG5pbXBvcnQgKiBhcyBMaXN0QWxsIGZyb20gJy4vbGlzdGFsbCc7XG4vLyBjb25zdCByZXN1bHQgPSBXaGF0SXMucmVzb2x2ZUNhdGVnb3J5KGNhdCwgYTEuZW50aXR5LFxuLy8gICB0aGVNb2RlbC5tUnVsZXMsIHRoZU1vZGVsLnRvb2xzLCB0aGVNb2RlbC5yZWNvcmRzKTtcblxuXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUNhdGVnb3J5KGNhdGVnb3J5OiBzdHJpbmcsIGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLFxuICBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPik6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzQW5zd2VycyB7XG4gIGlmIChjb250ZXh0UXVlcnlTdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHsgZXJyb3JzOiBbRXJFcnJvci5tYWtlRXJyb3JfRU1QVFlfSU5QVVQoKV0sIHRva2VuczogW10sIGFuc3dlcnM6IFtdIH07XG4gIH0gZWxzZSB7XG4gICAgLypcbiAgICAgICAgdmFyIG1hdGNoZWQgPSBJbnB1dEZpbHRlci5hbmFseXplU3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMpO1xuICAgICAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiYWZ0ZXIgbWF0Y2hlZCBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWQpKTogJy0nKTtcbiAgICAgICAgdmFyIGFTZW50ZW5jZXMgPSBJbnB1dEZpbHRlci5leHBhbmRNYXRjaEFycihtYXRjaGVkKTtcbiAgICAgICAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgIGRlYnVnbG9nKFwiYWZ0ZXIgZXhwYW5kXCIgKyBhU2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICAgICAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgICAgIH0gKi9cblxuXG4gICAgICAgICAgLy8gdmFyIGNhdGVnb3J5U2V0ID0gTW9kZWwuZ2V0QWxsUmVjb3JkQ2F0ZWdvcmllc0ZvclRhcmdldENhdGVnb3J5KHRoZU1vZGVsLCBjYXQsIHRydWUpO1xuXG4gICAgdmFyIHJlcyA9IExpc3RBbGwubGlzdEFsbFdpdGhDb250ZXh0KGNhdGVnb3J5LCBjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzLCByZWNvcmRzKTtcbiAgICAvLyogc29ydCBieSBzZW50ZW5jZVxuICAgIHJlcy5hbnN3ZXJzLmZvckVhY2gobyA9PiB7IG8uX3JhbmtpbmcgPSBvLl9yYW5raW5nICogIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KCBvLnNlbnRlbmNlICk7IH0pO1xuICAgIHJlcy5hbnN3ZXJzLnNvcnQoY21wQnlSYW5raW5nKTtcbiAgICByZXR1cm4gcmVzO1xuLypcbiAgICAvLyA/Pz8gdmFyIHJlcyA9IExpc3RBbGwubGlzdEFsbEhhdmluZ0NvbnRleHQoY2F0ZWdvcnksIGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMsIHJlY29yZHMpO1xuXG4gICAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gcHJvY2Vzc1N0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKTtcbiAgICAvL2FTZW50ZW5jZXMubWFwKGZ1bmN0aW9uKG9TZW50ZW5jZSkgeyByZXR1cm4gSW5wdXRGaWx0ZXIucmVpbkZvcmNlKG9TZW50ZW5jZSk7IH0pO1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJhZnRlciByZWluZm9yY2VcIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgfSkuam9pbihcIlxcblwiKSkgOiAnLScpO1xuICAgIHZhciBtYXRjaGVkQW5zd2VycyA9IG1hdGNoUmVjb3JkcyhhU2VudGVuY2VzUmVpbmZvcmNlZCwgY2F0ZWdvcnksIHJlY29yZHMpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8gKiBvYmplY3RzdHJlYW0qIC8ge1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCIgbWF0Y2hlZEFuc3dlcnNcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRBbnN3ZXJzLCB1bmRlZmluZWQsIDIpKSA6ICctJyk7XG4gICAgcmV0dXJuIG1hdGNoZWRBbnN3ZXJzO1xuKi9cbiB9XG59XG5cbi8qXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUNhdGVnb3J5T2xkKGNhdGVnb3J5OiBzdHJpbmcsIGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLFxuICBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPik6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzQW5zd2VycyB7XG4gIGlmIChjb250ZXh0UXVlcnlTdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHsgZXJyb3JzOiBbRXJFcnJvci5tYWtlRXJyb3JfRU1QVFlfSU5QVVQoKV0sIHRva2VuczogW10sIGFuc3dlcnM6IFtdIH07XG4gIH0gZWxzZSB7XG4gICAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gcHJvY2Vzc1N0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKTtcbiAgICAvL2FTZW50ZW5jZXMubWFwKGZ1bmN0aW9uKG9TZW50ZW5jZSkgeyByZXR1cm4gSW5wdXRGaWx0ZXIucmVpbkZvcmNlKG9TZW50ZW5jZSk7IH0pO1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJhZnRlciByZWluZm9yY2VcIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgfSkuam9pbihcIlxcblwiKSkgOiAnLScpO1xuICAgIHZhciBtYXRjaGVkQW5zd2VycyA9IG1hdGNoUmVjb3JkcyhhU2VudGVuY2VzUmVpbmZvcmNlZCwgY2F0ZWdvcnksIHJlY29yZHMpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8gKiBvYmplY3RzdHJlYW0qIC8ge1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCIgbWF0Y2hlZEFuc3dlcnNcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRBbnN3ZXJzLCB1bmRlZmluZWQsIDIpKSA6ICctJyk7XG4gICAgcmV0dXJuIG1hdGNoZWRBbnN3ZXJzO1xuICB9XG59XG4qL1xuXG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlQ2F0ZWdvcmllcyhjYXRlZ29yaWVzOiBzdHJpbmdbXSwgY29udGV4dFF1ZXJ5U3RyaW5nOiBzdHJpbmcsXG4gIHRoZU1vZGVsOiBJTWF0Y2guSU1vZGVscywgZG9tYWluQ2F0ZWdvcnlGaWx0ZXIgOiBJTWF0Y2guSURvbWFpbkNhdGVnb3J5RmlsdGVyKTogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNUdXBlbEFuc3dlcnMge1xuICB2YXIgcmVjb3JkcyA9IHRoZU1vZGVsLnJlY29yZHM7XG4gIHZhciBydWxlcyA9IHRoZU1vZGVsLnJ1bGVzO1xuICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcnM6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSxcbiAgICAgIHR1cGVsYW5zd2VyczogW10sXG4gICAgICB0b2tlbnM6IFtdXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIHZhciBjYXRlZ29yeVNldCA9IE1vZGVsLmdldEFsbFJlY29yZENhdGVnb3JpZXNGb3JUYXJnZXRDYXRlZ29yeSh0aGVNb2RlbCwgY2F0LCB0cnVlKTtcbiAgICB2YXIgcmVzID0gTGlzdEFsbC5saXN0QWxsVHVwZWxXaXRoQ29udGV4dChjYXRlZ29yaWVzLCBjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzLCByZWNvcmRzLCBkb21haW5DYXRlZ29yeUZpbHRlcik7XG4gICAgLy8qIHNvcnQgYnkgc2VudGVuY2VcbiAgICByZXMudHVwZWxhbnN3ZXJzLmZvckVhY2gobyA9PiB7IG8uX3JhbmtpbmcgPSBvLl9yYW5raW5nICogIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KCBvLnNlbnRlbmNlICk7IH0pO1xuICAgIHJlcy50dXBlbGFuc3dlcnMuc29ydChjbXBCeVJhbmtpbmdUdXBlbCk7XG4gICAgcmV0dXJuIHJlcztcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdChyZXN1bHRzOiBBcnJheTxJTWF0Y2guSVdoYXRJc0Fuc3dlcj4pOiBzdHJpbmcge1xuICB2YXIgY250ID0gcmVzdWx0cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHJlc3VsdCkge1xuICAgIGlmIChzYWZlRXF1YWwocmVzdWx0Ll9yYW5raW5nLHJlc3VsdHNbMF0uX3JhbmtpbmcpKSB7XG4gICAgICByZXR1cm4gcHJldiArIDE7XG4gICAgfVxuICB9LCAwKTtcbiAgaWYgKGNudCA+IDEpIHtcbiAgICAvLyBzZWFyY2ggZm9yIGEgZGlzY3JpbWluYXRpbmcgY2F0ZWdvcnkgdmFsdWVcbiAgICB2YXIgZGlzY3JpbWluYXRpbmcgPSBPYmplY3Qua2V5cyhyZXN1bHRzWzBdLnJlY29yZCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBjYXRlZ29yeSkge1xuICAgICAgaWYgKChjYXRlZ29yeS5jaGFyQXQoMCkgIT09ICdfJyAmJiBjYXRlZ29yeSAhPT0gcmVzdWx0c1swXS5jYXRlZ29yeSlcbiAgICAgICAgJiYgKHJlc3VsdHNbMF0ucmVjb3JkW2NhdGVnb3J5XSAhPT0gcmVzdWx0c1sxXS5yZWNvcmRbY2F0ZWdvcnldKSkge1xuICAgICAgICBwcmV2LnB1c2goY2F0ZWdvcnkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgW10pO1xuICAgIGlmIChkaXNjcmltaW5hdGluZy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBcIk1hbnkgY29tcGFyYWJsZSByZXN1bHRzLCBwZXJoYXBzIHlvdSB3YW50IHRvIHNwZWNpZnkgYSBkaXNjcmltaW5hdGluZyBcIiArIGRpc2NyaW1pbmF0aW5nLmpvaW4oJywnKTtcbiAgICB9XG4gICAgcmV0dXJuICdZb3VyIHF1ZXN0aW9uIGRvZXMgbm90IGhhdmUgYSBzcGVjaWZpYyBhbnN3ZXInO1xuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0luZGlzY3JpbWluYXRlUmVzdWx0VHVwZWwocmVzdWx0czogQXJyYXk8SU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlcj4pOiBzdHJpbmcge1xuICB2YXIgY250ID0gcmVzdWx0cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHJlc3VsdCkge1xuICAgIGlmIChzYWZlRXF1YWwocmVzdWx0Ll9yYW5raW5nLHJlc3VsdHNbMF0uX3JhbmtpbmcpKSB7XG4gICAgICByZXR1cm4gcHJldiArIDE7XG4gICAgfVxuICB9LCAwKTtcbiAgaWYgKGNudCA+IDEpIHtcbiAgICAvLyBzZWFyY2ggZm9yIGEgZGlzY3JpbWluYXRpbmcgY2F0ZWdvcnkgdmFsdWVcbiAgICB2YXIgZGlzY3JpbWluYXRpbmcgPSBPYmplY3Qua2V5cyhyZXN1bHRzWzBdLnJlY29yZCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBjYXRlZ29yeSkge1xuICAgICAgaWYgKChjYXRlZ29yeS5jaGFyQXQoMCkgIT09ICdfJyAmJiByZXN1bHRzWzBdLmNhdGVnb3JpZXMuaW5kZXhPZihjYXRlZ29yeSkgPCAwKVxuICAgICAgICAmJiAocmVzdWx0c1swXS5yZWNvcmRbY2F0ZWdvcnldICE9PSByZXN1bHRzWzFdLnJlY29yZFtjYXRlZ29yeV0pKSB7XG4gICAgICAgIHByZXYucHVzaChjYXRlZ29yeSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJldjtcbiAgICB9LCBbXSk7XG4gICAgaWYgKGRpc2NyaW1pbmF0aW5nLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIFwiTWFueSBjb21wYXJhYmxlIHJlc3VsdHMsIHBlcmhhcHMgeW91IHdhbnQgdG8gc3BlY2lmeSBhIGRpc2NyaW1pbmF0aW5nIFwiICsgZGlzY3JpbWluYXRpbmcuam9pbignLCcpICsgJyBvciB1c2UgXCJsaXN0IGFsbCAuLi5cIic7XG4gICAgfVxuICAgIHJldHVybiAnWW91ciBxdWVzdGlvbiBkb2VzIG5vdCBoYXZlIGEgc3BlY2lmaWMgYW5zd2VyJztcbiAgfVxuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuIiwiLyoqXG4gKlxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuYW5hbHl6ZVxuICogQGZpbGUgYW5hbHl6ZS50c1xuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxuICovXG5cInVzZSBzdHJpY3RcIjtcbnZhciBhYm90X2VyYmFzZV8xID0gcmVxdWlyZShcImFib3RfZXJiYXNlXCIpO1xudmFyIGRlYnVnID0gcmVxdWlyZShcImRlYnVnXCIpO1xudmFyIGRlYnVnbG9nID0gZGVidWcoJ3doYXRpcycpO1xudmFyIGRlYnVnbG9nViA9IGRlYnVnKCd3aGF0VmlzJyk7XG52YXIgcGVyZmxvZyA9IGRlYnVnKCdwZXJmJyk7XG52YXIgYWJvdF9lcmJhc2VfMiA9IHJlcXVpcmUoXCJhYm90X2VyYmFzZVwiKTtcbnZhciBhYm90X2VyYmFzZV8zID0gcmVxdWlyZShcImFib3RfZXJiYXNlXCIpO1xuZnVuY3Rpb24gbW9ja0RlYnVnKG8pIHtcbiAgICBkZWJ1Z2xvZyA9IG87XG4gICAgZGVidWdsb2dWID0gbztcbiAgICBwZXJmbG9nID0gbztcbn1cbmV4cG9ydHMubW9ja0RlYnVnID0gbW9ja0RlYnVnO1xudmFyIF8gPSByZXF1aXJlKFwibG9kYXNoXCIpO1xudmFyIE1hdGNoID0gcmVxdWlyZShcIi4vbWF0Y2hcIik7XG52YXIgYWJvdF9lcmJhc2VfNCA9IHJlcXVpcmUoXCJhYm90X2VyYmFzZVwiKTtcbnZhciBhYm90X2VyYmFzZV81ID0gcmVxdWlyZShcImFib3RfZXJiYXNlXCIpO1xudmFyIEFsZ29sID0gcmVxdWlyZShcIi4vYWxnb2xcIik7XG4vKlxuZXhwb3J0IGZ1bmN0aW9uIGNtcEJ5UmVzdWx0VGhlblJhbmtpbmcoYTogSU1hdGNoLklXaGF0SXNBbnN3ZXIsIGI6IElNYXRjaC5JV2hhdElzQW5zd2VyKSB7XG4gIHZhciBjbXAgPSBhLnJlc3VsdC5sb2NhbGVDb21wYXJlKGIucmVzdWx0KTtcbiAgaWYgKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cbiAgcmV0dXJuIC0oYS5fcmFua2luZyAtIGIuX3JhbmtpbmcpO1xufVxuKi9cbmZ1bmN0aW9uIGxvY2FsZUNvbXBhcmVBcnJzKGFhcmVzdWx0LCBiYnJlc3VsdCkge1xuICAgIHZhciBjbXAgPSAwO1xuICAgIHZhciBibGVuID0gYmJyZXN1bHQubGVuZ3RoO1xuICAgIGFhcmVzdWx0LmV2ZXJ5KGZ1bmN0aW9uIChhLCBpbmRleCkge1xuICAgICAgICBpZiAoYmxlbiA8PSBpbmRleCkge1xuICAgICAgICAgICAgY21wID0gLTE7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgY21wID0gYS5sb2NhbGVDb21wYXJlKGJicmVzdWx0W2luZGV4XSk7XG4gICAgICAgIGlmIChjbXApIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICBpZiAoY21wKSB7XG4gICAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuICAgIGlmIChibGVuID4gYWFyZXN1bHQubGVuZ3RoKSB7XG4gICAgICAgIGNtcCA9ICsxO1xuICAgIH1cbiAgICByZXR1cm4gMDtcbn1cbmZ1bmN0aW9uIHNhZmVFcXVhbChhLCBiKSB7XG4gICAgdmFyIGRlbHRhID0gYSAtIGI7XG4gICAgaWYgKE1hdGguYWJzKGRlbHRhKSA8IEFsZ29sLlJBTktJTkdfRVBTSUxPTikge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuZXhwb3J0cy5zYWZlRXF1YWwgPSBzYWZlRXF1YWw7XG5mdW5jdGlvbiBzYWZlRGVsdGEoYSwgYikge1xuICAgIHZhciBkZWx0YSA9IGEgLSBiO1xuICAgIGlmIChNYXRoLmFicyhkZWx0YSkgPCBBbGdvbC5SQU5LSU5HX0VQU0lMT04pIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIHJldHVybiBkZWx0YTtcbn1cbmV4cG9ydHMuc2FmZURlbHRhID0gc2FmZURlbHRhO1xuZnVuY3Rpb24gY21wQnlSZXN1bHRUaGVuUmFua2luZ1R1cGVsKGFhLCBiYikge1xuICAgIHZhciBjbXAgPSBsb2NhbGVDb21wYXJlQXJycyhhYS5yZXN1bHQsIGJiLnJlc3VsdCk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgICByZXR1cm4gY21wO1xuICAgIH1cbiAgICByZXR1cm4gLXNhZmVEZWx0YShhYS5fcmFua2luZywgYmIuX3JhbmtpbmcpO1xufVxuZXhwb3J0cy5jbXBCeVJlc3VsdFRoZW5SYW5raW5nVHVwZWwgPSBjbXBCeVJlc3VsdFRoZW5SYW5raW5nVHVwZWw7XG5mdW5jdGlvbiBjbXBSZWNvcmRzKGEsIGIpIHtcbiAgICAvLyBhcmUgcmVjb3JkcyBkaWZmZXJlbnQ/XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhKS5jb25jYXQoT2JqZWN0LmtleXMoYikpLnNvcnQoKTtcbiAgICB2YXIgcmVzID0ga2V5cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHNLZXkpIHtcbiAgICAgICAgaWYgKHByZXYpIHtcbiAgICAgICAgICAgIHJldHVybiBwcmV2O1xuICAgICAgICB9XG4gICAgICAgIGlmIChiW3NLZXldICE9PSBhW3NLZXldKSB7XG4gICAgICAgICAgICBpZiAoIWJbc0tleV0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWFbc0tleV0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKzE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYVtzS2V5XS5sb2NhbGVDb21wYXJlKGJbc0tleV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH0sIDApO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmNtcFJlY29yZHMgPSBjbXBSZWNvcmRzO1xuZnVuY3Rpb24gY21wQnlSYW5raW5nKGEsIGIpIHtcbiAgICB2YXIgY21wID0gLXNhZmVEZWx0YShhLl9yYW5raW5nLCBiLl9yYW5raW5nKTtcbiAgICBpZiAoY21wKSB7XG4gICAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuICAgIGNtcCA9IGEucmVzdWx0LmxvY2FsZUNvbXBhcmUoYi5yZXN1bHQpO1xuICAgIGlmIChjbXApIHtcbiAgICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG4gICAgcmV0dXJuIGNtcFJlY29yZHMoYS5yZWNvcmQsIGIucmVjb3JkKTtcbn1cbmV4cG9ydHMuY21wQnlSYW5raW5nID0gY21wQnlSYW5raW5nO1xuZnVuY3Rpb24gY21wQnlSYW5raW5nVHVwZWwoYSwgYikge1xuICAgIHZhciBjbXAgPSAtc2FmZURlbHRhKGEuX3JhbmtpbmcsIGIuX3JhbmtpbmcpO1xuICAgIGlmIChjbXApIHtcbiAgICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG4gICAgY21wID0gbG9jYWxlQ29tcGFyZUFycnMoYS5yZXN1bHQsIGIucmVzdWx0KTtcbiAgICBpZiAoY21wKSB7XG4gICAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuICAgIHJldHVybiBjbXBSZWNvcmRzKGEucmVjb3JkLCBiLnJlY29yZCk7XG59XG5leHBvcnRzLmNtcEJ5UmFua2luZ1R1cGVsID0gY21wQnlSYW5raW5nVHVwZWw7XG5mdW5jdGlvbiBkdW1wTmljZShhbnN3ZXIpIHtcbiAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICBzOiBcIlwiLFxuICAgICAgICBwdXNoOiBmdW5jdGlvbiAocykgeyB0aGlzLnMgPSB0aGlzLnMgKyBzOyB9XG4gICAgfTtcbiAgICB2YXIgcyA9IFwiKipSZXN1bHQgZm9yIGNhdGVnb3J5OiBcIiArIGFuc3dlci5jYXRlZ29yeSArIFwiIGlzIFwiICsgYW5zd2VyLnJlc3VsdCArIFwiXFxuIHJhbms6IFwiICsgYW5zd2VyLl9yYW5raW5nICsgXCJcXG5cIjtcbiAgICByZXN1bHQucHVzaChzKTtcbiAgICBPYmplY3Qua2V5cyhhbnN3ZXIucmVjb3JkKS5mb3JFYWNoKGZ1bmN0aW9uIChzUmVxdWlyZXMsIGluZGV4KSB7XG4gICAgICAgIGlmIChzUmVxdWlyZXMuY2hhckF0KDApICE9PSAnXycpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwicmVjb3JkOiBcIiArIHNSZXF1aXJlcyArIFwiIC0+IFwiICsgYW5zd2VyLnJlY29yZFtzUmVxdWlyZXNdKTtcbiAgICAgICAgfVxuICAgICAgICByZXN1bHQucHVzaCgnXFxuJyk7XG4gICAgfSk7XG4gICAgdmFyIG9TZW50ZW5jZSA9IGFuc3dlci5zZW50ZW5jZTtcbiAgICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGluZGV4KSB7XG4gICAgICAgIHZhciBzV29yZCA9IFwiW1wiICsgaW5kZXggKyBcIl0gOiBcIiArIG9Xb3JkLmNhdGVnb3J5ICsgXCIgXFxcIlwiICsgb1dvcmQuc3RyaW5nICsgXCJcXFwiID0+IFxcXCJcIiArIG9Xb3JkLm1hdGNoZWRTdHJpbmcgKyBcIlxcXCJcIjtcbiAgICAgICAgcmVzdWx0LnB1c2goc1dvcmQgKyBcIlxcblwiKTtcbiAgICB9KTtcbiAgICByZXN1bHQucHVzaChcIi5cXG5cIik7XG4gICAgcmV0dXJuIHJlc3VsdC5zO1xufVxuZXhwb3J0cy5kdW1wTmljZSA9IGR1bXBOaWNlO1xuZnVuY3Rpb24gZHVtcE5pY2VUdXBlbChhbnN3ZXIpIHtcbiAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICBzOiBcIlwiLFxuICAgICAgICBwdXNoOiBmdW5jdGlvbiAocykgeyB0aGlzLnMgPSB0aGlzLnMgKyBzOyB9XG4gICAgfTtcbiAgICB2YXIgcyA9IFwiKipSZXN1bHQgZm9yIGNhdGVnb3JpZXM6IFwiICsgYW5zd2VyLmNhdGVnb3JpZXMuam9pbihcIjtcIikgKyBcIiBpcyBcIiArIGFuc3dlci5yZXN1bHQgKyBcIlxcbiByYW5rOiBcIiArIGFuc3dlci5fcmFua2luZyArIFwiXFxuXCI7XG4gICAgcmVzdWx0LnB1c2gocyk7XG4gICAgT2JqZWN0LmtleXMoYW5zd2VyLnJlY29yZCkuZm9yRWFjaChmdW5jdGlvbiAoc1JlcXVpcmVzLCBpbmRleCkge1xuICAgICAgICBpZiAoc1JlcXVpcmVzLmNoYXJBdCgwKSAhPT0gJ18nKSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaChcInJlY29yZDogXCIgKyBzUmVxdWlyZXMgKyBcIiAtPiBcIiArIGFuc3dlci5yZWNvcmRbc1JlcXVpcmVzXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0LnB1c2goJ1xcbicpO1xuICAgIH0pO1xuICAgIHZhciBvU2VudGVuY2UgPSBhbnN3ZXIuc2VudGVuY2U7XG4gICAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpbmRleCkge1xuICAgICAgICB2YXIgc1dvcmQgPSBcIltcIiArIGluZGV4ICsgXCJdIDogXCIgKyBvV29yZC5jYXRlZ29yeSArIFwiIFxcXCJcIiArIG9Xb3JkLnN0cmluZyArIFwiXFxcIiA9PiBcXFwiXCIgKyBvV29yZC5tYXRjaGVkU3RyaW5nICsgXCJcXFwiXCI7XG4gICAgICAgIHJlc3VsdC5wdXNoKHNXb3JkICsgXCJcXG5cIik7XG4gICAgfSk7XG4gICAgcmVzdWx0LnB1c2goXCIuXFxuXCIpO1xuICAgIHJldHVybiByZXN1bHQucztcbn1cbmV4cG9ydHMuZHVtcE5pY2VUdXBlbCA9IGR1bXBOaWNlVHVwZWw7XG5mdW5jdGlvbiBkdW1wV2VpZ2h0c1RvcCh0b29sbWF0Y2hlcywgb3B0aW9ucykge1xuICAgIHZhciBzID0gJyc7XG4gICAgdG9vbG1hdGNoZXMuZm9yRWFjaChmdW5jdGlvbiAob01hdGNoLCBpbmRleCkge1xuICAgICAgICBpZiAoaW5kZXggPCBvcHRpb25zLnRvcCkge1xuICAgICAgICAgICAgcyA9IHMgKyBcIldoYXRJc0Fuc3dlcltcIiArIGluZGV4ICsgXCJdLi4uXFxuXCI7XG4gICAgICAgICAgICBzID0gcyArIGR1bXBOaWNlKG9NYXRjaCk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcztcbn1cbmV4cG9ydHMuZHVtcFdlaWdodHNUb3AgPSBkdW1wV2VpZ2h0c1RvcDtcbmZ1bmN0aW9uIGZpbHRlckRpc3RpbmN0UmVzdWx0QW5kU29ydFR1cGVsKHJlcykge1xuICAgIHZhciByZXN1bHQgPSByZXMudHVwZWxhbnN3ZXJzLmZpbHRlcihmdW5jdGlvbiAoaVJlcywgaW5kZXgpIHtcbiAgICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgICAgIGRlYnVnbG9nKCcgcmV0YWluIHR1cGVsICcgKyBpbmRleCArICcgJyArIEpTT04uc3RyaW5naWZ5KGlSZXMpKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoXy5pc0VxdWFsKGlSZXMucmVzdWx0LCByZXMudHVwZWxhbnN3ZXJzW2luZGV4IC0gMV0gJiYgcmVzLnR1cGVsYW5zd2Vyc1tpbmRleCAtIDFdLnJlc3VsdCkpIHtcbiAgICAgICAgICAgIGRlYnVnbG9nKCdza2lwJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gICAgcmVzdWx0LnNvcnQoY21wQnlSYW5raW5nVHVwZWwpO1xuICAgIHJldHVybiBPYmplY3QuYXNzaWduKHJlcywgeyB0dXBlbGFuc3dlcnM6IHJlc3VsdCB9KTtcbn1cbmV4cG9ydHMuZmlsdGVyRGlzdGluY3RSZXN1bHRBbmRTb3J0VHVwZWwgPSBmaWx0ZXJEaXN0aW5jdFJlc3VsdEFuZFNvcnRUdXBlbDtcbmZ1bmN0aW9uIGZpbHRlck9ubHlUb3BSYW5rZWQocmVzdWx0cykge1xuICAgIHZhciByZXMgPSByZXN1bHRzLmZpbHRlcihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgIGlmIChzYWZlRXF1YWwocmVzdWx0Ll9yYW5raW5nLCByZXN1bHRzWzBdLl9yYW5raW5nKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdC5fcmFua2luZyA+PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJMaXN0IHRvIGZpbHRlciBtdXN0IGJlIG9yZGVyZWRcIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmZpbHRlck9ubHlUb3BSYW5rZWQgPSBmaWx0ZXJPbmx5VG9wUmFua2VkO1xuZnVuY3Rpb24gZmlsdGVyT25seVRvcFJhbmtlZFR1cGVsKHJlc3VsdHMpIHtcbiAgICB2YXIgcmVzID0gcmVzdWx0cy5maWx0ZXIoZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICBpZiAoc2FmZUVxdWFsKHJlc3VsdC5fcmFua2luZywgcmVzdWx0c1swXS5fcmFua2luZykpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQuX3JhbmtpbmcgPj0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTGlzdCB0byBmaWx0ZXIgbXVzdCBiZSBvcmRlcmVkXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5maWx0ZXJPbmx5VG9wUmFua2VkVHVwZWwgPSBmaWx0ZXJPbmx5VG9wUmFua2VkVHVwZWw7XG4vKipcbiAqIEEgcmFua2luZyB3aGljaCBpcyBwdXJlbHkgYmFzZWQgb24gdGhlIG51bWJlcnMgb2YgbWF0Y2hlZCBlbnRpdGllcyxcbiAqIGRpc3JlZ2FyZGluZyBleGFjdG5lc3Mgb2YgbWF0Y2hcbiAqL1xuLypcbmV4cG9ydCBmdW5jdGlvbiBjYWxjUmFua2luZ1NpbXBsZShtYXRjaGVkOiBudW1iZXIsXG4gIG1pc21hdGNoZWQ6IG51bWJlciwgbm91c2U6IG51bWJlcixcbiAgcmVsZXZhbnRDb3VudDogbnVtYmVyKTogbnVtYmVyIHtcbiAgLy8gMiA6IDBcbiAgLy8gMSA6IDBcbiAgdmFyIGZhY3RvciA9IG1hdGNoZWQgKiBNYXRoLnBvdygxLjUsIG1hdGNoZWQpICogTWF0aC5wb3coMS41LCBtYXRjaGVkKTtcbiAgdmFyIGZhY3RvcjIgPSBNYXRoLnBvdygwLjQsIG1pc21hdGNoZWQpO1xuICB2YXIgZmFjdG9yMyA9IE1hdGgucG93KDAuNCwgbm91c2UpO1xuICByZXR1cm4gTWF0aC5wb3coZmFjdG9yMiAqIGZhY3RvciAqIGZhY3RvcjMsIDEgLyAobWlzbWF0Y2hlZCArIG1hdGNoZWQgKyBub3VzZSkpO1xufVxuKi9cbmZ1bmN0aW9uIGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIHJlbGV2YW50Q291bnQsIGhhc0RvbWFpbikge1xuICAgIHZhciBsZW5NYXRjaGVkID0gT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoO1xuICAgIHZhciBmYWN0b3IgPSBNYXRjaC5jYWxjUmFua2luZ1Byb2R1Y3QobWF0Y2hlZCk7XG4gICAgZmFjdG9yICo9IE1hdGgucG93KDEuNSwgbGVuTWF0Y2hlZCk7XG4gICAgaWYgKGhhc0RvbWFpbikge1xuICAgICAgICBmYWN0b3IgKj0gMS41O1xuICAgIH1cbiAgICB2YXIgbGVuSGFzQ2F0ZWdvcnkgPSBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoO1xuICAgIHZhciBmYWN0b3JIID0gTWF0aC5wb3coMS4xLCBsZW5IYXNDYXRlZ29yeSk7XG4gICAgdmFyIGxlbk1pc01hdGNoZWQgPSBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGg7XG4gICAgdmFyIGZhY3RvcjIgPSBNYXRjaC5jYWxjUmFua2luZ1Byb2R1Y3QobWlzbWF0Y2hlZCk7XG4gICAgZmFjdG9yMiAqPSBNYXRoLnBvdygwLjQsIGxlbk1pc01hdGNoZWQpO1xuICAgIHZhciBkaXZpc29yID0gKGxlbk1pc01hdGNoZWQgKyBsZW5IYXNDYXRlZ29yeSArIGxlbk1hdGNoZWQpO1xuICAgIGRpdmlzb3IgPSBkaXZpc29yID8gZGl2aXNvciA6IDE7XG4gICAgcmV0dXJuIE1hdGgucG93KGZhY3RvcjIgKiBmYWN0b3JIICogZmFjdG9yLCAxIC8gKGRpdmlzb3IpKTtcbn1cbmV4cG9ydHMuY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeSA9IGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnk7XG4vKipcbiAqIGxpc3QgYWxsIHRvcCBsZXZlbCByYW5raW5nc1xuICovXG4vKlxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVjb3Jkc0hhdmluZ0NvbnRleHQoXG4gIHBTZW50ZW5jZXM6IElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzLCBjYXRlZ29yeTogc3RyaW5nLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sXG4gIGNhdGVnb3J5U2V0OiB7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfSlcbiAgOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnMge1xuXG4gIC8vZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gIHZhciByZWxldmFudFJlY29yZHMgPSByZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAocmVjb3JkOiBJTWF0Y2guSVJlY29yZCkge1xuICAgIHJldHVybiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSAmJiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gbnVsbCk7XG4gIH0pO1xuICB2YXIgcmVzID0gW107XG4gIGRlYnVnbG9nKFwiTWF0Y2hSZWNvcmRzSGF2aW5nQ29udGV4dCA6IHJlbGV2YW50IHJlY29yZHMgbnI6XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoKTtcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcInNlbnRlbmNlcyBhcmUgOiBcIiArIEpTT04uc3RyaW5naWZ5KHBTZW50ZW5jZXMsIHVuZGVmaW5lZCwgMikpIDogXCItXCIpO1xuICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiY2F0ZWdvcnkgXCIgKyBjYXRlZ29yeSArIFwiIGFuZCBjYXRlZ29yeXNldCBpczogXCIgKyBKU09OLnN0cmluZ2lmeShjYXRlZ29yeVNldCwgdW5kZWZpbmVkLCAyKSkgOiBcIi1cIik7XG4gIGlmIChwcm9jZXNzLmVudi5BQk9UX0ZBU1QgJiYgY2F0ZWdvcnlTZXQpIHtcbiAgICAvLyB3ZSBhcmUgb25seSBpbnRlcmVzdGVkIGluIGNhdGVnb3JpZXMgcHJlc2VudCBpbiByZWNvcmRzIGZvciBkb21haW5zIHdoaWNoIGNvbnRhaW4gdGhlIGNhdGVnb3J5XG4gICAgLy8gdmFyIGNhdGVnb3J5c2V0ID0gTW9kZWwuY2FsY3VsYXRlUmVsZXZhbnRSZWNvcmRDYXRlZ29yaWVzKHRoZU1vZGVsLGNhdGVnb3J5KTtcbiAgICAvL2tub3dpbmcgdGhlIHRhcmdldFxuICAgIHBlcmZsb2coXCJnb3QgY2F0ZWdvcnlzZXQgd2l0aCBcIiArIE9iamVjdC5rZXlzKGNhdGVnb3J5U2V0KS5sZW5ndGgpO1xuICAgIHZhciBmbCA9IDA7XG4gICAgdmFyIGxmID0gMDtcbiAgICB2YXIgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBwU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgdmFyIGZXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICAgIH0pO1xuICAgICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiAhIWNhdGVnb3J5U2V0W29Xb3JkLmNhdGVnb3J5XSB8fCBXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCk7XG4gICAgICB9KTtcbiAgICAgIGZsID0gZmwgKyBvU2VudGVuY2UubGVuZ3RoO1xuICAgICAgbGYgPSBsZiArIHJXb3Jkcy5sZW5ndGg7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCwgLy8gbm90IGEgZmlsbGVyICAvLyB0byBiZSBjb21wYXRpYmxlIGl0IHdvdWxkIGJlIGZXb3Jkc1xuICAgICAgICByV29yZHM6IHJXb3Jkc1xuICAgICAgfTtcbiAgICB9KTtcbiAgICBPYmplY3QuZnJlZXplKGFTaW1wbGlmaWVkU2VudGVuY2VzKTtcbiAgICBkZWJ1Z2xvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgZmwgKyBcIi0+XCIgKyBsZiArIFwiKVwiKTtcbiAgICBwZXJmbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyBmbCArIFwiLT5cIiArIGxmICsgXCIpXCIpO1xuICAgIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgICB2YXIgaGFzQ2F0ZWdvcnkgPSB7fTtcbiAgICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSBhU2VudGVuY2UuY250UmVsZXZhbnRXb3JkcztcbiAgICAgICAgYVNlbnRlbmNlLnJXb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCkgJiYgcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICBoYXNDYXRlZ29yeVtvV29yZC5tYXRjaGVkU3RyaW5nXSA9IDE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIGlmICgoT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoICsgT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aCkgPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLm9TZW50ZW5jZSxcbiAgICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxuICAgICAgICAgICAgcmVzdWx0OiByZWNvcmRbY2F0ZWdvcnldLFxuICAgICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSk7XG4gICAgZGVidWdsb2coXCJoZXJlIGluIHdlaXJkXCIpO1xuICB9IGVsc2Uge1xuICAgIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgIHBTZW50ZW5jZXMuc2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgICB2YXIgaGFzQ2F0ZWdvcnkgPSB7fTtcbiAgICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSAwO1xuICAgICAgICBhU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICBpZiAoIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCkpIHtcbiAgICAgICAgICAgIGNudFJlbGV2YW50V29yZHMgPSBjbnRSZWxldmFudFdvcmRzICsgMTtcbiAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICAgIG1hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpICYmIHJlY29yZFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgICBoYXNDYXRlZ29yeVtvV29yZC5tYXRjaGVkU3RyaW5nXSA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKChPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoKSA+IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aCkge1xuICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2UsXG4gICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICAgIHJlc3VsdDogcmVjb3JkW2NhdGVnb3J5XSxcbiAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0pO1xuICB9XG4gIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmcpO1xuICBkZWJ1Z2xvZyhcIiBhZnRlciBzb3J0XCIgKyByZXMubGVuZ3RoKTtcbiAgdmFyIHJlc3VsdCA9IE9iamVjdC5hc3NpZ24oe30sIHBTZW50ZW5jZXMsIHsgYW5zd2VyczogcmVzIH0pO1xuICByZXR1cm4gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0KHJlc3VsdCk7XG59XG4qL1xuLypcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFJlY29yZHMoYVNlbnRlbmNlczogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMsIGNhdGVnb3J5OiBzdHJpbmcsIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPilcbiAgOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnMge1xuICAvLyBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAvLyAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZHMsIHVuZGVmaW5lZCwgMikpO1xuICAvLyB9XG4gIHZhciByZWxldmFudFJlY29yZHMgPSByZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAocmVjb3JkOiBJTWF0Y2guSVJlY29yZCkge1xuICAgIHJldHVybiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSAmJiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gbnVsbCk7XG4gIH0pO1xuICB2YXIgcmVzID0gW107XG4gIGRlYnVnbG9nKFwicmVsZXZhbnQgcmVjb3JkcyBucjpcIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGgpO1xuICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgYVNlbnRlbmNlcy5zZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAoYVNlbnRlbmNlKSB7XG4gICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICB2YXIgbWlzbWF0Y2hlZCA9IHt9XG4gICAgICB2YXIgbWF0Y2hlZCA9IHt9O1xuICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSAwO1xuICAgICAgYVNlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIGlmICghV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKSkge1xuICAgICAgICAgIGNudFJlbGV2YW50V29yZHMgPSBjbnRSZWxldmFudFdvcmRzICsgMTtcbiAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgIG1hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBpZiAoT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoID4gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoKSB7XG4gICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLFxuICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICByZXN1bHQ6IHJlY29yZFtjYXRlZ29yeV0sXG4gICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nKG1hdGNoZWQsIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pXG4gIH0pO1xuICByZXMuc29ydChjbXBCeVJlc3VsdFRoZW5SYW5raW5nKTtcbiAgdmFyIHJlc3VsdCA9IE9iamVjdC5hc3NpZ24oe30sIGFTZW50ZW5jZXMsIHsgYW5zd2VyczogcmVzIH0pO1xuICByZXR1cm4gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0KHJlc3VsdCk7XG59XG4qL1xuLypcbmZ1bmN0aW9uIG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzQ2F0ZWdvcnlTZXQoYVNlbnRlbmNlczogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMsXG4gIGNhdGVnb3J5U2V0OiB7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfSwgdHJhY2s6IHsgZmw6IG51bWJlciwgbGY6IG51bWJlciB9XG4pOiB7XG4gIGRvbWFpbnM6IHN0cmluZ1tdLFxuICBvU2VudGVuY2U6IElNYXRjaC5JU2VudGVuY2UsXG4gIGNudFJlbGV2YW50V29yZHM6IG51bWJlcixcbiAgcldvcmRzOiBJTWF0Y2guSVdvcmRbXVxufVtdIHtcbiAgcmV0dXJuIGFTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgdmFyIGFEb21haW5zID0gW10gYXMgc3RyaW5nW107XG4gICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwiZG9tYWluXCIpIHtcbiAgICAgICAgYURvbWFpbnMucHVzaChvV29yZC5tYXRjaGVkU3RyaW5nKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcIm1ldGFcIikge1xuICAgICAgICAvLyBlLmcuIGRvbWFpbiBYWFhcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuICEhY2F0ZWdvcnlTZXRbb1dvcmQuY2F0ZWdvcnldO1xuICAgIH0pO1xuICAgIHRyYWNrLmZsICs9IG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgdHJhY2subGYgKz0gcldvcmRzLmxlbmd0aDtcbiAgICByZXR1cm4ge1xuICAgICAgZG9tYWluczogYURvbWFpbnMsXG4gICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsXG4gICAgICByV29yZHM6IHJXb3Jkc1xuICAgIH07XG4gIH0pO1xufVxuKi9cbmZ1bmN0aW9uIG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzQ2F0ZWdvcnlTZXQyKGFTZW50ZW5jZXMsIGNhdGVnb3J5U2V0LCB0cmFjaykge1xuICAgIHJldHVybiBhU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICB2YXIgYURvbWFpbnMgPSBbXTtcbiAgICAgICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwiZG9tYWluXCIpIHtcbiAgICAgICAgICAgICAgICBhRG9tYWlucy5wdXNoKG9Xb3JkLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJtZXRhXCIpIHtcbiAgICAgICAgICAgICAgICAvLyBlLmcuIGRvbWFpbiBYWFhcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwiY2F0ZWdvcnlcIikge1xuICAgICAgICAgICAgICAgIGlmIChjYXRlZ29yeVNldFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gISFjYXRlZ29yeVNldFtvV29yZC5jYXRlZ29yeV07XG4gICAgICAgIH0pO1xuICAgICAgICB0cmFjay5mbCArPSBvU2VudGVuY2UubGVuZ3RoO1xuICAgICAgICB0cmFjay5sZiArPSByV29yZHMubGVuZ3RoO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZG9tYWluczogYURvbWFpbnMsXG4gICAgICAgICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsXG4gICAgICAgICAgICByV29yZHM6IHJXb3Jkc1xuICAgICAgICB9O1xuICAgIH0pO1xufVxuZnVuY3Rpb24gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXMoYVNlbnRlbmNlcywgdHJhY2spIHtcbiAgICByZXR1cm4gYVNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgdmFyIGRvbWFpbnMgPSBbXTtcbiAgICAgICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwiZG9tYWluXCIpIHtcbiAgICAgICAgICAgICAgICBkb21haW5zLnB1c2gob1dvcmQubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcIm1ldGFcIikge1xuICAgICAgICAgICAgICAgIC8vIGUuZy4gZG9tYWluIFhYWFxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAhYWJvdF9lcmJhc2VfNS5Xb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpO1xuICAgICAgICB9KTtcbiAgICAgICAgdHJhY2suZmwgKz0gb1NlbnRlbmNlLmxlbmd0aDtcbiAgICAgICAgdHJhY2subGYgKz0gcldvcmRzLmxlbmd0aDtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgICAgICAgZG9tYWluczogZG9tYWlucyxcbiAgICAgICAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsXG4gICAgICAgICAgICByV29yZHM6IHJXb3Jkc1xuICAgICAgICB9O1xuICAgIH0pO1xufVxuZnVuY3Rpb24gZXh0cmFjdFJlc3VsdChjYXRlZ29yaWVzLCByZWNvcmQpIHtcbiAgICByZXR1cm4gY2F0ZWdvcmllcy5tYXAoZnVuY3Rpb24gKGNhdGVnb3J5KSB7IHJldHVybiByZWNvcmRbY2F0ZWdvcnldIHx8IFwibi9hXCI7IH0pO1xufVxuZnVuY3Rpb24gbWF0Y2hSZWNvcmRzUXVpY2tNdWx0aXBsZUNhdGVnb3JpZXMocFNlbnRlbmNlcywgY2F0ZWdvcmllcywgcmVjb3JkcywgZG9tYWluQ2F0ZWdvcnlGaWx0ZXIpIHtcbiAgICAvLyBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgIC8vICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRzLCB1bmRlZmluZWQsIDIpKTtcbiAgICAvLyB9XG4gICAgaWYgKGRvbWFpbkNhdGVnb3J5RmlsdGVyICYmICFkb21haW5DYXRlZ29yeUZpbHRlci5kb21haW5zKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIm9sZCBjYXRlZ29yeXNTRXQgPz9cIik7XG4gICAgfVxuICAgIE9iamVjdC5mcmVlemUoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIpO1xuICAgIHZhciBjYXRlZ29yeUYgPSBjYXRlZ29yaWVzWzBdO1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJtYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcyAocj1cIiArIChyZWNvcmRzICYmIHJlY29yZHMubGVuZ3RoKVxuICAgICAgICArIFwiIHM9XCIgKyAocFNlbnRlbmNlcyAmJiBwU2VudGVuY2VzLnNlbnRlbmNlcyAmJiBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGgpICsgXCIpXFxuIGNhdGVnb3JpZXM6XCIgKyAoY2F0ZWdvcmllcyAmJiBjYXRlZ29yaWVzLmpvaW4oXCJcXG5cIikpICsgXCIgY2F0ZWdvcnlTZXQ6IFwiXG4gICAgICAgICsgKGRvbWFpbkNhdGVnb3J5RmlsdGVyICYmICh0eXBlb2YgZG9tYWluQ2F0ZWdvcnlGaWx0ZXIuY2F0ZWdvcnlTZXQgPT09IFwib2JqZWN0XCIpICYmIE9iamVjdC5rZXlzKGRvbWFpbkNhdGVnb3J5RmlsdGVyLmNhdGVnb3J5U2V0KS5qb2luKFwiXFxuXCIpKSkgOiBcIi1cIik7XG4gICAgcGVyZmxvZyhcIm1hdGNoUmVjb3Jkc1F1aWNrTXVsdCAuLi4ocj1cIiArIHJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiKVwiKTtcbiAgICAvL2NvbnNvbGUubG9nKCdjYXRlZ29yaWVzICcgKyAgSlNPTi5zdHJpbmdpZnkoY2F0ZWdvcmllcykpO1xuICAgIC8vY29uc29sZS5sb2coJ2NhdGVncm95U2V0JyArICBKU09OLnN0cmluZ2lmeShjYXRlZ29yeVNldCkpO1xuICAgIHZhciByZWxldmFudFJlY29yZHMgPSByZWNvcmRzO1xuICAgIGlmIChkb21haW5DYXRlZ29yeUZpbHRlciAmJiBkb21haW5DYXRlZ29yeUZpbHRlci5kb21haW5zKSB7XG4gICAgICAgIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgICAgIHJldHVybiAoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIuZG9tYWlucy5pbmRleE9mKHJlY29yZC5fZG9tYWluKSA+PSAwKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZWxldmFudFJlY29yZHMgPSByZWxldmFudFJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgICAgIHJldHVybiAhY2F0ZWdvcmllcy5ldmVyeShmdW5jdGlvbiAoY2F0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChyZWNvcmRbY2F0XSA9PT0gdW5kZWZpbmVkKSB8fCAocmVjb3JkW2NhdF0gPT09IG51bGwpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvLyAgICAgIH1cbiAgICAgICAgICAgIC8vICAgICByZXR1cm4gKHJlY29yZFtjYXRlZ29yeUZdICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnlGXSAhPT0gbnVsbCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICB2YXIgcmVzID0gW107XG4gICAgZGVidWdsb2coXCJyZWxldmFudCByZWNvcmRzIHdpdGggZmlyc3QgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIpXCIpO1xuICAgIHBlcmZsb2coXCJyZWxldmFudCByZWNvcmRzIHdpdGggZmlyc3QgbnI6XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgc2VudGVuY2VzIFwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoKTtcbiAgICBpZiAoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIpIHtcbiAgICAgICAgLy8gd2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbiBjYXRlZ29yaWVzIHByZXNlbnQgaW4gcmVjb3JkcyBmb3IgZG9tYWlucyB3aGljaCBjb250YWluIHRoZSBjYXRlZ29yeVxuICAgICAgICAvLyB2YXIgY2F0ZWdvcnlzZXQgPSBNb2RlbC5jYWxjdWxhdGVSZWxldmFudFJlY29yZENhdGVnb3JpZXModGhlTW9kZWwsY2F0ZWdvcnkpO1xuICAgICAgICAvL2tub3dpbmcgdGhlIHRhcmdldFxuICAgICAgICBwZXJmbG9nKFwiZ290IGNhdGVnb3J5c2V0IHdpdGggXCIgKyBPYmplY3Qua2V5cyhkb21haW5DYXRlZ29yeUZpbHRlci5jYXRlZ29yeVNldCkubGVuZ3RoKTtcbiAgICAgICAgdmFyIG9iaiA9IHsgZmw6IDAsIGxmOiAwIH07XG4gICAgICAgIHZhciBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IFtdO1xuICAgICAgICAvLyAgaWYgKHByb2Nlc3MuZW52LkFCT1RfQkVUMSkge1xuICAgICAgICBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzQ2F0ZWdvcnlTZXQyKHBTZW50ZW5jZXMsIGRvbWFpbkNhdGVnb3J5RmlsdGVyLmNhdGVnb3J5U2V0LCBvYmopO1xuICAgICAgICAvLyAgfSBlbHNlIHtcbiAgICAgICAgLy8gICAgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBtYWtlU2ltcGxpZmllZFNlbnRlbmNlc0NhdGVnb3J5U2V0KHBTZW50ZW5jZXMsIGNhdGVnb3J5U2V0LCBvYmopIGFzIGFueTtcbiAgICAgICAgLy8gIH1cbiAgICAgICAgcGVyZmxvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgb2JqLmZsICsgXCItPlwiICsgb2JqLmxmICsgXCIpXCIpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgZGVidWdsb2coXCJub3QgYWJvdF9mYXN0ICFcIik7XG4gICAgICAgIHZhciB0cmFjayA9IHsgZmw6IDAsIGxmOiAwIH07XG4gICAgICAgIHZhciBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzKHBTZW50ZW5jZXMsIHRyYWNrKTtcbiAgICAgICAgLypcbiAgICAgICAgICAgIHBTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIGZsID0gZmwgKyBvU2VudGVuY2UubGVuZ3RoO1xuICAgICAgICAgICAgICBsZiA9IGxmICsgcldvcmRzLmxlbmd0aDtcbiAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgICAgICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgIHJXb3JkczogcldvcmRzXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICovXG4gICAgICAgIGRlYnVnbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyB0cmFjay5mbCArIFwiLT5cIiArIHRyYWNrLmxmICsgXCIpXCIpO1xuICAgICAgICBwZXJmbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyB0cmFjay5mbCArIFwiLT5cIiArIHRyYWNrLmxmICsgXCIpXCIpO1xuICAgIH1cbiAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiaGVyZSBzaW1wbGlmaWVkIHNlbnRlbmNlcyBcIiArXG4gICAgICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzLm1hcChmdW5jdGlvbiAobykgeyByZXR1cm4gXCJcXG5Eb21haW49XCIgKyBvLmRvbWFpbnMuam9pbihcIlxcblwiKSArIFwiXFxuXCIgKyBhYm90X2VyYmFzZV80LlNlbnRlbmNlLmR1bXBOaWNlKG8ucldvcmRzKTsgfSkuam9pbihcIlxcblwiKSkgOiBcIi1cIik7XG4gICAgLy9jb25zb2xlLmxvZyhcImhlcmUgcmVjcm9kc1wiICsgcmVsZXZhbnRSZWNvcmRzLm1hcCggKG8saW5kZXgpID0+ICBcIiBpbmRleCA9IFwiICsgaW5kZXggKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KG8pKS5qb2luKFwiXFxuXCIpKTtcbiAgICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgICAgICAgdmFyIGltaXNtYXRjaGVkID0gMDtcbiAgICAgICAgICAgIHZhciBpbWF0Y2hlZCA9IDA7XG4gICAgICAgICAgICB2YXIgbm91c2UgPSAwO1xuICAgICAgICAgICAgdmFyIGZvdW5kY2F0ID0gMTtcbiAgICAgICAgICAgIHZhciBtaXNzaW5nY2F0ID0gMDtcbiAgICAgICAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICAgICAgICB2YXIgbWlzbWF0Y2hlZCA9IHt9O1xuICAgICAgICAgICAgdmFyIGhhc0NhdGVnb3J5ID0ge307XG4gICAgICAgICAgICBhU2VudGVuY2UucldvcmRzLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSAwO1xuICAgICAgICAgICAgICAgIGlmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICsraW1hdGNoZWQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICArK2ltaXNtYXRjaGVkO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgIT09IFwiY2F0ZWdvcnlcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm91c2UgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWlzc2luZ2NhdCArPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm91bmRjYXQgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGFib3RfZXJiYXNlXzUuV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpICYmIHJlY29yZFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgICAgICAgICBoYXNDYXRlZ29yeVtvV29yZC5tYXRjaGVkU3RyaW5nXSA9IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKCFhYm90X2VyYmFzZV81LldvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUT0RPIGJldHRlciB1bm1hY2h0ZWRcbiAgICAgICAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciBtYXRjaGVkRG9tYWluID0gMDtcbiAgICAgICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gYVNlbnRlbmNlLnJXb3Jkcy5sZW5ndGg7XG4gICAgICAgICAgICBpZiAoYVNlbnRlbmNlLmRvbWFpbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlY29yZC5fZG9tYWluICE9PSBhU2VudGVuY2UuZG9tYWluc1swXSkge1xuICAgICAgICAgICAgICAgICAgICBpbWlzbWF0Y2hlZCA9IDMwMDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpbWF0Y2hlZCArPSAxO1xuICAgICAgICAgICAgICAgICAgICBtYXRjaGVkRG9tYWluICs9IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIG1hdGNoZWRMZW4gPSBPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoO1xuICAgICAgICAgICAgdmFyIG1pc21hdGNoZWRMZW4gPSBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGg7XG4gICAgICAgICAgICBpZiAoKGltaXNtYXRjaGVkIDwgMzAwMClcbiAgICAgICAgICAgICAgICAmJiAoKG1hdGNoZWRMZW4gPiBtaXNtYXRjaGVkTGVuKVxuICAgICAgICAgICAgICAgICAgICB8fCAobWF0Y2hlZExlbiA9PT0gbWlzbWF0Y2hlZExlbiAmJiBtYXRjaGVkRG9tYWluID4gMCkpKSB7XG4gICAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKFwiYWRkaW5nIFwiICsgZXh0cmFjdFJlc3VsdChjYXRlZ29yaWVzLHJlY29yZCkuam9pbihcIjtcIikpO1xuICAgICAgICAgICAgICAgICAgZGVidWdsb2coXCJ3aXRoIHJhbmtpbmcgOiBcIiArIGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkyKG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzLCBtYXRjaGVkRG9tYWluKSk7XG4gICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcIiBjcmVhdGVkIGJ5IFwiICsgT2JqZWN0LmtleXMobWF0Y2hlZCkubWFwKGtleSA9PiBcImtleTpcIiArIGtleVxuICAgICAgICAgICAgICAgICAgKyBcIlxcblwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZFtrZXldKSkuam9pbihcIlxcblwiKVxuICAgICAgICAgICAgICAgICAgKyBcIlxcbmhhc0NhdCBcIiArIEpTT04uc3RyaW5naWZ5KGhhc0NhdGVnb3J5KVxuICAgICAgICAgICAgICAgICAgKyBcIlxcbm1pc21hdCBcIiArIEpTT04uc3RyaW5naWZ5KG1pc21hdGNoZWQpXG4gICAgICAgICAgICAgICAgICArIFwiXFxuY25UcmVsIFwiICsgSlNPTi5zdHJpbmdpZnkoY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgICAgICAgICAgICsgXCJcXG5tYXRjZWREb21haW4gXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkRG9tYWluKVxuICAgICAgICAgICAgICAgICAgKyBcIlxcbmhhc0NhdCBcIiArIE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KVxuICAgICAgICAgICAgICAgICAgKyBcIlxcbm1pc21hdCBcIiArIE9iamVjdC5rZXlzKG1pc21hdGNoZWQpXG4gICAgICAgICAgICAgICAgICArIGBcXG5tYXRjaGVkICR7T2JqZWN0LmtleXMobWF0Y2hlZCl9IFxcbmhhc2NhdCAke09iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5qb2luKFwiOyBcIil9IFxcbm1pc206ICR7T2JqZWN0LmtleXMobWlzbWF0Y2hlZCl9IFxcbmBcbiAgICAgICAgICAgICAgICAgICsgXCJcXG5tYXRjZWREb21haW4gXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkRG9tYWluKVxuICAgICAgICBcbiAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHZhciByZWMgPSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2Uub1NlbnRlbmNlLFxuICAgICAgICAgICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcmllczogY2F0ZWdvcmllcyxcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiBleHRyYWN0UmVzdWx0KGNhdGVnb3JpZXMsIHJlY29yZCksXG4gICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzLCBtYXRjaGVkRG9tYWluKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcImhlcmUgcmFua2luZ1wiICsgcmVjLl9yYW5raW5nKVxuICAgICAgICAgICAgICAgIGlmICgocmVjLl9yYW5raW5nID09PSBudWxsKSB8fCAhcmVjLl9yYW5raW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlYy5fcmFua2luZyA9IDAuOTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzLnB1c2gocmVjKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcGVyZmxvZyhcInNvcnQgKGE9XCIgKyByZXMubGVuZ3RoICsgXCIpXCIpO1xuICAgIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbCk7XG4gICAgcGVyZmxvZyhcIk1SUU1DIGZpbHRlclJldGFpbiAuLi5cIik7XG4gICAgdmFyIHJlc3VsdDEgPSBPYmplY3QuYXNzaWduKHsgdHVwZWxhbnN3ZXJzOiByZXMgfSwgcFNlbnRlbmNlcyk7XG4gICAgLypkZWJ1Z2xvZyhcIk5FV01BUFwiICsgcmVzLm1hcChvID0+IFwiXFxucmFua1wiICsgby5fcmFua2luZyArIFwiID0+XCJcbiAgICAgICAgICAgICAgICArIG8ucmVzdWx0LmpvaW4oXCJcXG5cIikpLmpvaW4oXCJcXG5cIikpOyAqL1xuICAgIHZhciByZXN1bHQyID0gZmlsdGVyRGlzdGluY3RSZXN1bHRBbmRTb3J0VHVwZWwocmVzdWx0MSk7XG4gICAgcGVyZmxvZyhcIk1SUU1DIG1hdGNoUmVjb3Jkc1F1aWNrIGRvbmU6IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBhPVwiICsgcmVzLmxlbmd0aCArIFwiKVwiKTtcbiAgICByZXR1cm4gcmVzdWx0Mjtcbn1cbmV4cG9ydHMubWF0Y2hSZWNvcmRzUXVpY2tNdWx0aXBsZUNhdGVnb3JpZXMgPSBtYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcztcbmZ1bmN0aW9uIGNsYXNzaWZ5V29yZFdpdGhUYXJnZXRDYXRlZ29yeSh3b3JkLCB0YXJnZXRjYXRlZ29yeSwgcnVsZXMsIHdob2xlc2VudGVuY2UpIHtcbiAgICAvL2NvbnNvbGUubG9nKFwiY2xhc3NpZnkgXCIgKyB3b3JkICsgXCIgXCIgICsgdGFyZ2V0Y2F0ZWdvcnkpO1xuICAgIHZhciBjYXRzID0gYWJvdF9lcmJhc2VfMS5JbnB1dEZpbHRlci5jYXRlZ29yaXplQVdvcmQod29yZCwgcnVsZXMsIHdob2xlc2VudGVuY2UsIHt9KTtcbiAgICAvLyBUT0RPIHF1YWxpZnlcbiAgICBjYXRzID0gY2F0cy5maWx0ZXIoZnVuY3Rpb24gKGNhdCkge1xuICAgICAgICByZXR1cm4gY2F0LmNhdGVnb3J5ID09PSB0YXJnZXRjYXRlZ29yeTtcbiAgICB9KTtcbiAgICAvL2RlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGNhdHMpKTtcbiAgICBpZiAoY2F0cy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGNhdHNbMF0ubWF0Y2hlZFN0cmluZztcbiAgICB9XG59XG5mdW5jdGlvbiBhbmFseXplQ2F0ZWdvcnkoY2F0ZWdvcnl3b3JkLCBydWxlcywgd2hvbGVzZW50ZW5jZSkge1xuICAgIHJldHVybiBjbGFzc2lmeVdvcmRXaXRoVGFyZ2V0Q2F0ZWdvcnkoY2F0ZWdvcnl3b3JkLCAnY2F0ZWdvcnknLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG59XG5leHBvcnRzLmFuYWx5emVDYXRlZ29yeSA9IGFuYWx5emVDYXRlZ29yeTtcbmZ1bmN0aW9uIHNwbGl0QXRDb21tYUFuZChzdHIpIHtcbiAgICB2YXIgciA9IHN0ci5zcGxpdCgvKFxcYmFuZFxcYil8WyxdLyk7XG4gICAgciA9IHIuZmlsdGVyKGZ1bmN0aW9uIChvLCBpbmRleCkge1xuICAgICAgICBpZiAoaW5kZXggJSAyID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIHZhciBydHJpbW1lZCA9IHIubWFwKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgIHJldHVybiBuZXcgU3RyaW5nKG8pLnRyaW0oKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcnRyaW1tZWQ7XG59XG5leHBvcnRzLnNwbGl0QXRDb21tYUFuZCA9IHNwbGl0QXRDb21tYUFuZDtcbi8qKlxuICogQSBzaW1wbGUgaW1wbGVtZW50YXRpb24sIHNwbGl0dGluZyBhdCBhbmQgYW5kICxcbiAqL1xuZnVuY3Rpb24gYW5hbHl6ZUNhdGVnb3J5TXVsdE9ubHlBbmRDb21tYShjYXRlZ29yeWxpc3QsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlKSB7XG4gICAgdmFyIHJ0cmltbWVkID0gc3BsaXRBdENvbW1hQW5kKGNhdGVnb3J5bGlzdCk7XG4gICAgdmFyIHJjYXQgPSBydHJpbW1lZC5tYXAoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgcmV0dXJuIGFuYWx5emVDYXRlZ29yeShvLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG4gICAgfSk7XG4gICAgaWYgKHJjYXQuaW5kZXhPZih1bmRlZmluZWQpID49IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdcIicgKyBydHJpbW1lZFtyY2F0LmluZGV4T2YodW5kZWZpbmVkKV0gKyAnXCIgaXMgbm90IGEgY2F0ZWdvcnkhJyk7XG4gICAgfVxuICAgIHJldHVybiByY2F0O1xufVxuZXhwb3J0cy5hbmFseXplQ2F0ZWdvcnlNdWx0T25seUFuZENvbW1hID0gYW5hbHl6ZUNhdGVnb3J5TXVsdE9ubHlBbmRDb21tYTtcbmZ1bmN0aW9uIGZpbHRlckFjY2VwdGluZ09ubHkocmVzLCBjYXRlZ29yaWVzKSB7XG4gICAgcmV0dXJuIHJlcy5maWx0ZXIoZnVuY3Rpb24gKGFTZW50ZW5jZSwgaUluZGV4KSB7XG4gICAgICAgIHJldHVybiBhU2VudGVuY2UuZXZlcnkoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgICByZXR1cm4gY2F0ZWdvcmllcy5pbmRleE9mKG9Xb3JkLmNhdGVnb3J5KSA+PSAwO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn1cbmV4cG9ydHMuZmlsdGVyQWNjZXB0aW5nT25seSA9IGZpbHRlckFjY2VwdGluZ09ubHk7XG5mdW5jdGlvbiBwcm9jZXNzU3RyaW5nKHF1ZXJ5LCBydWxlcykge1xuICAgIC8vICBpZiAoIXByb2Nlc3MuZW52LkFCT1RfT0xETUFUQ0gpIHtcbiAgICByZXR1cm4gYWJvdF9lcmJhc2VfMy5FckJhc2UucHJvY2Vzc1N0cmluZyhxdWVyeSwgcnVsZXMsIHJ1bGVzLndvcmRDYWNoZSk7XG4gICAgLy8gIH1cbiAgICAvKlxuICAgICAgdmFyIG1hdGNoZWQgPSBJbnB1dEZpbHRlci5hbmFseXplU3RyaW5nKHF1ZXJ5LCBydWxlcywgc1dvcmRzKTtcbiAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiQWZ0ZXIgbWF0Y2hlZCBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWQpKTtcbiAgICAgIH1cbiAgICAgIHZhciBhU2VudGVuY2VzID0gSW5wdXRGaWx0ZXIuZXhwYW5kTWF0Y2hBcnIobWF0Y2hlZCk7XG4gICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcImFmdGVyIGV4cGFuZFwiICsgYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgICAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgICAgIH1cbiAgICAgIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IElucHV0RmlsdGVyLnJlaW5Gb3JjZShhU2VudGVuY2VzKTtcbiAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiYWZ0ZXIgcmVpbmZvcmNlXCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgICAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGVycm9yczogW10sXG4gICAgICAgIHNlbnRlbmNlczogYVNlbnRlbmNlc1JlaW5mb3JjZWRcbiAgICAgIH0gYXMgSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXM7XG4gICAgKi9cbn1cbmV4cG9ydHMucHJvY2Vzc1N0cmluZyA9IHByb2Nlc3NTdHJpbmc7XG5mdW5jdGlvbiBhbmFseXplQ29udGV4dFN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKSB7XG4gICAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gcHJvY2Vzc1N0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKTtcbiAgICAvLyB3ZSBsaW1pdCBhbmFseXNpcyB0byBuIHNlbnRlbmNlc1xuICAgIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcyA9IGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5zbGljZSgwLCBBbGdvbC5DdXRvZmZfU2VudGVuY2VzKTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcImFmdGVyIHJlaW5mb3JjZSBhbmQgY3V0b2ZmXCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubGVuZ3RoICsgXCJcXG5cIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICAgICAgcmV0dXJuIGFib3RfZXJiYXNlXzQuU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICAgICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgfVxuICAgIHJldHVybiBhU2VudGVuY2VzUmVpbmZvcmNlZDtcbn1cbmV4cG9ydHMuYW5hbHl6ZUNvbnRleHRTdHJpbmcgPSBhbmFseXplQ29udGV4dFN0cmluZztcbmZ1bmN0aW9uIGNtcEJ5TnJDYXRlZ29yaWVzQW5kU2FtZURvbWFpbihhLCBiKSB7XG4gICAgLy9jb25zb2xlLmxvZyhcImNvbXBhcmUgYVwiICsgYSArIFwiIGNudGIgXCIgKyBiKTtcbiAgICB2YXIgY250YSA9IGFib3RfZXJiYXNlXzQuU2VudGVuY2UuZ2V0RGlzdGluY3RDYXRlZ29yaWVzSW5TZW50ZW5jZShhKS5sZW5ndGg7XG4gICAgdmFyIGNudGIgPSBhYm90X2VyYmFzZV80LlNlbnRlbmNlLmdldERpc3RpbmN0Q2F0ZWdvcmllc0luU2VudGVuY2UoYikubGVuZ3RoO1xuICAgIC8qXG4gICAgICB2YXIgY250YSA9IGEucmVkdWNlKGZ1bmN0aW9uKHByZXYsIG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiBwcmV2ICsgKChvV29yZC5jYXRlZ29yeSA9PT0gXCJjYXRlZ29yeVwiKT8gMSA6IDApO1xuICAgICAgfSwwKTtcbiAgICAgIHZhciBjbnRiID0gYi5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgb1dvcmQpIHtcbiAgICAgICAgcmV0dXJuIHByZXYgKyAoKG9Xb3JkLmNhdGVnb3J5ID09PSBcImNhdGVnb3J5XCIpPyAxIDogMCk7XG4gICAgICB9LDApO1xuICAgICAvLyBjb25zb2xlLmxvZyhcImNudCBhXCIgKyBjbnRhICsgXCIgY250YiBcIiArIGNudGIpO1xuICAgICAqL1xuICAgIHJldHVybiBjbnRiIC0gY250YTtcbn1cbmV4cG9ydHMuY21wQnlOckNhdGVnb3JpZXNBbmRTYW1lRG9tYWluID0gY21wQnlOckNhdGVnb3JpZXNBbmRTYW1lRG9tYWluO1xuZnVuY3Rpb24gYW5hbHl6ZUNhdGVnb3J5TXVsdChjYXRlZ29yeWxpc3QsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlLCBnV29yZHMpIHtcbiAgICB2YXIgcmVzID0gYW5hbHl6ZUNvbnRleHRTdHJpbmcoY2F0ZWdvcnlsaXN0LCBydWxlcyk7XG4gICAgLy8gIGRlYnVnbG9nKFwicmVzdWx0aW5nIGNhdGVnb3J5IHNlbnRlbmNlc1wiLCBKU09OLnN0cmluZ2lmeShyZXMpKTtcbiAgICB2YXIgcmVzMiA9IGZpbHRlckFjY2VwdGluZ09ubHkocmVzLnNlbnRlbmNlcywgW1wiY2F0ZWdvcnlcIiwgXCJmaWxsZXJcIl0pO1xuICAgIC8vICBjb25zb2xlLmxvZyhcImhlcmUgcmVzMlwiICsgSlNPTi5zdHJpbmdpZnkocmVzMikgKTtcbiAgICAvLyAgY29uc29sZS5sb2coXCJoZXJlIHVuZGVmaW5lZCAhICsgXCIgKyByZXMyLmZpbHRlcihvID0+ICFvKS5sZW5ndGgpO1xuICAgIHJlczIuc29ydChhYm90X2VyYmFzZV80LlNlbnRlbmNlLmNtcFJhbmtpbmdQcm9kdWN0KTtcbiAgICBkZWJ1Z2xvZyhcInJlc3VsdGluZyBjYXRlZ29yeSBzZW50ZW5jZXM6IFxcblwiLCBkZWJ1Z2xvZy5lbmFibGVkID8gKGFib3RfZXJiYXNlXzQuU2VudGVuY2UuZHVtcE5pY2VBcnIocmVzMi5zbGljZSgwLCAzKSwgYWJvdF9lcmJhc2VfNC5TZW50ZW5jZS5yYW5raW5nUHJvZHVjdCkpIDogJy0nKTtcbiAgICAvLyBUT0RPOiAgIHJlczIgPSBmaWx0ZXJBY2NlcHRpbmdPbmx5U2FtZURvbWFpbihyZXMyKTtcbiAgICAvL2RlYnVnbG9nKFwicmVzdWx0aW5nIGNhdGVnb3J5IHNlbnRlbmNlc1wiLCBKU09OLnN0cmluZ2lmeShyZXMyLCB1bmRlZmluZWQsIDIpKTtcbiAgICAvLyBleHBlY3Qgb25seSBjYXRlZ29yaWVzXG4gICAgLy8gd2UgY291bGQgcmFuayBub3cgYnkgY29tbW9uIGRvbWFpbnMgLCBidXQgZm9yIG5vdyB3ZSBvbmx5IHRha2UgdGhlIGZpcnN0IG9uZVxuICAgIGlmICghcmVzMi5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgLy9yZXMuc29ydChjbXBCeU5yQ2F0ZWdvcmllc0FuZFNhbWVEb21haW4pO1xuICAgIHZhciByZXNjYXQgPSBhYm90X2VyYmFzZV80LlNlbnRlbmNlLmdldERpc3RpbmN0Q2F0ZWdvcmllc0luU2VudGVuY2UocmVzMlswXSk7XG4gICAgcmV0dXJuIHJlc2NhdDtcbiAgICAvLyBcIlwiIHJldHVybiByZXNbMF0uZmlsdGVyKClcbiAgICAvLyByZXR1cm4gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KGNhdGVnb3J5bGlzdCwgJ2NhdGVnb3J5JywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xufVxuZXhwb3J0cy5hbmFseXplQ2F0ZWdvcnlNdWx0ID0gYW5hbHl6ZUNhdGVnb3J5TXVsdDtcbmZ1bmN0aW9uIGFuYWx5emVPcGVyYXRvcihvcHdvcmQsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlKSB7XG4gICAgcmV0dXJuIGNsYXNzaWZ5V29yZFdpdGhUYXJnZXRDYXRlZ29yeShvcHdvcmQsICdvcGVyYXRvcicsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlKTtcbn1cbmV4cG9ydHMuYW5hbHl6ZU9wZXJhdG9yID0gYW5hbHl6ZU9wZXJhdG9yO1xudmFyIExpc3RBbGwgPSByZXF1aXJlKFwiLi9saXN0YWxsXCIpO1xuLy8gY29uc3QgcmVzdWx0ID0gV2hhdElzLnJlc29sdmVDYXRlZ29yeShjYXQsIGExLmVudGl0eSxcbi8vICAgdGhlTW9kZWwubVJ1bGVzLCB0aGVNb2RlbC50b29scywgdGhlTW9kZWwucmVjb3Jkcyk7XG5mdW5jdGlvbiByZXNvbHZlQ2F0ZWdvcnkoY2F0ZWdvcnksIGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMsIHJlY29yZHMpIHtcbiAgICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4geyBlcnJvcnM6IFthYm90X2VyYmFzZV8yLkVyRXJyb3IubWFrZUVycm9yX0VNUFRZX0lOUFVUKCldLCB0b2tlbnM6IFtdLCBhbnN3ZXJzOiBbXSB9O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgLypcbiAgICAgICAgICAgIHZhciBtYXRjaGVkID0gSW5wdXRGaWx0ZXIuYW5hbHl6ZVN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKTtcbiAgICAgICAgICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJhZnRlciBtYXRjaGVkIFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZCkpOiAnLScpO1xuICAgICAgICAgICAgdmFyIGFTZW50ZW5jZXMgPSBJbnB1dEZpbHRlci5leHBhbmRNYXRjaEFycihtYXRjaGVkKTtcbiAgICAgICAgICAgIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgZGVidWdsb2coXCJhZnRlciBleHBhbmRcIiArIGFTZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICAgICAgICAgICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgICAgICAgfSAqL1xuICAgICAgICAvLyB2YXIgY2F0ZWdvcnlTZXQgPSBNb2RlbC5nZXRBbGxSZWNvcmRDYXRlZ29yaWVzRm9yVGFyZ2V0Q2F0ZWdvcnkodGhlTW9kZWwsIGNhdCwgdHJ1ZSk7XG4gICAgICAgIHZhciByZXMgPSBMaXN0QWxsLmxpc3RBbGxXaXRoQ29udGV4dChjYXRlZ29yeSwgY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcywgcmVjb3Jkcyk7XG4gICAgICAgIC8vKiBzb3J0IGJ5IHNlbnRlbmNlXG4gICAgICAgIHJlcy5hbnN3ZXJzLmZvckVhY2goZnVuY3Rpb24gKG8pIHsgby5fcmFua2luZyA9IG8uX3JhbmtpbmcgKiBhYm90X2VyYmFzZV80LlNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG8uc2VudGVuY2UpOyB9KTtcbiAgICAgICAgcmVzLmFuc3dlcnMuc29ydChjbXBCeVJhbmtpbmcpO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cbn1cbmV4cG9ydHMucmVzb2x2ZUNhdGVnb3J5ID0gcmVzb2x2ZUNhdGVnb3J5O1xuLypcbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlQ2F0ZWdvcnlPbGQoY2F0ZWdvcnk6IHN0cmluZywgY29udGV4dFF1ZXJ5U3RyaW5nOiBzdHJpbmcsXG4gIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+KTogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzIHtcbiAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4geyBlcnJvcnM6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSwgdG9rZW5zOiBbXSwgYW5zd2VyczogW10gfTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBwcm9jZXNzU3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMpO1xuICAgIC8vYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24ob1NlbnRlbmNlKSB7IHJldHVybiBJbnB1dEZpbHRlci5yZWluRm9yY2Uob1NlbnRlbmNlKTsgfSk7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImFmdGVyIHJlaW5mb3JjZVwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICB9KS5qb2luKFwiXFxuXCIpKSA6ICctJyk7XG4gICAgdmFyIG1hdGNoZWRBbnN3ZXJzID0gbWF0Y2hSZWNvcmRzKGFTZW50ZW5jZXNSZWluZm9yY2VkLCBjYXRlZ29yeSwgcmVjb3Jkcyk7IC8vYVRvb2w6IEFycmF5PElNYXRjaC5JVG9vbD4pOiBhbnkgLyAqIG9iamVjdHN0cmVhbSogLyB7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcIiBtYXRjaGVkQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMsIHVuZGVmaW5lZCwgMikpIDogJy0nKTtcbiAgICByZXR1cm4gbWF0Y2hlZEFuc3dlcnM7XG4gIH1cbn1cbiovXG5mdW5jdGlvbiByZXNvbHZlQ2F0ZWdvcmllcyhjYXRlZ29yaWVzLCBjb250ZXh0UXVlcnlTdHJpbmcsIHRoZU1vZGVsLCBkb21haW5DYXRlZ29yeUZpbHRlcikge1xuICAgIHZhciByZWNvcmRzID0gdGhlTW9kZWwucmVjb3JkcztcbiAgICB2YXIgcnVsZXMgPSB0aGVNb2RlbC5ydWxlcztcbiAgICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZXJyb3JzOiBbYWJvdF9lcmJhc2VfMi5FckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSxcbiAgICAgICAgICAgIHR1cGVsYW5zd2VyczogW10sXG4gICAgICAgICAgICB0b2tlbnM6IFtdXG4gICAgICAgIH07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICAvLyB2YXIgY2F0ZWdvcnlTZXQgPSBNb2RlbC5nZXRBbGxSZWNvcmRDYXRlZ29yaWVzRm9yVGFyZ2V0Q2F0ZWdvcnkodGhlTW9kZWwsIGNhdCwgdHJ1ZSk7XG4gICAgICAgIHZhciByZXMgPSBMaXN0QWxsLmxpc3RBbGxUdXBlbFdpdGhDb250ZXh0KGNhdGVnb3JpZXMsIGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMsIHJlY29yZHMsIGRvbWFpbkNhdGVnb3J5RmlsdGVyKTtcbiAgICAgICAgLy8qIHNvcnQgYnkgc2VudGVuY2VcbiAgICAgICAgcmVzLnR1cGVsYW5zd2Vycy5mb3JFYWNoKGZ1bmN0aW9uIChvKSB7IG8uX3JhbmtpbmcgPSBvLl9yYW5raW5nICogYWJvdF9lcmJhc2VfNC5TZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvLnNlbnRlbmNlKTsgfSk7XG4gICAgICAgIHJlcy50dXBlbGFuc3dlcnMuc29ydChjbXBCeVJhbmtpbmdUdXBlbCk7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxufVxuZXhwb3J0cy5yZXNvbHZlQ2F0ZWdvcmllcyA9IHJlc29sdmVDYXRlZ29yaWVzO1xuZnVuY3Rpb24gaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdChyZXN1bHRzKSB7XG4gICAgdmFyIGNudCA9IHJlc3VsdHMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCByZXN1bHQpIHtcbiAgICAgICAgaWYgKHNhZmVFcXVhbChyZXN1bHQuX3JhbmtpbmcsIHJlc3VsdHNbMF0uX3JhbmtpbmcpKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICB9LCAwKTtcbiAgICBpZiAoY250ID4gMSkge1xuICAgICAgICAvLyBzZWFyY2ggZm9yIGEgZGlzY3JpbWluYXRpbmcgY2F0ZWdvcnkgdmFsdWVcbiAgICAgICAgdmFyIGRpc2NyaW1pbmF0aW5nID0gT2JqZWN0LmtleXMocmVzdWx0c1swXS5yZWNvcmQpLnJlZHVjZShmdW5jdGlvbiAocHJldiwgY2F0ZWdvcnkpIHtcbiAgICAgICAgICAgIGlmICgoY2F0ZWdvcnkuY2hhckF0KDApICE9PSAnXycgJiYgY2F0ZWdvcnkgIT09IHJlc3VsdHNbMF0uY2F0ZWdvcnkpXG4gICAgICAgICAgICAgICAgJiYgKHJlc3VsdHNbMF0ucmVjb3JkW2NhdGVnb3J5XSAhPT0gcmVzdWx0c1sxXS5yZWNvcmRbY2F0ZWdvcnldKSkge1xuICAgICAgICAgICAgICAgIHByZXYucHVzaChjYXRlZ29yeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcHJldjtcbiAgICAgICAgfSwgW10pO1xuICAgICAgICBpZiAoZGlzY3JpbWluYXRpbmcubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJNYW55IGNvbXBhcmFibGUgcmVzdWx0cywgcGVyaGFwcyB5b3Ugd2FudCB0byBzcGVjaWZ5IGEgZGlzY3JpbWluYXRpbmcgXCIgKyBkaXNjcmltaW5hdGluZy5qb2luKCcsJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICdZb3VyIHF1ZXN0aW9uIGRvZXMgbm90IGhhdmUgYSBzcGVjaWZpYyBhbnN3ZXInO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xufVxuZXhwb3J0cy5pc0luZGlzY3JpbWluYXRlUmVzdWx0ID0gaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdDtcbmZ1bmN0aW9uIGlzSW5kaXNjcmltaW5hdGVSZXN1bHRUdXBlbChyZXN1bHRzKSB7XG4gICAgdmFyIGNudCA9IHJlc3VsdHMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCByZXN1bHQpIHtcbiAgICAgICAgaWYgKHNhZmVFcXVhbChyZXN1bHQuX3JhbmtpbmcsIHJlc3VsdHNbMF0uX3JhbmtpbmcpKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICB9LCAwKTtcbiAgICBpZiAoY250ID4gMSkge1xuICAgICAgICAvLyBzZWFyY2ggZm9yIGEgZGlzY3JpbWluYXRpbmcgY2F0ZWdvcnkgdmFsdWVcbiAgICAgICAgdmFyIGRpc2NyaW1pbmF0aW5nID0gT2JqZWN0LmtleXMocmVzdWx0c1swXS5yZWNvcmQpLnJlZHVjZShmdW5jdGlvbiAocHJldiwgY2F0ZWdvcnkpIHtcbiAgICAgICAgICAgIGlmICgoY2F0ZWdvcnkuY2hhckF0KDApICE9PSAnXycgJiYgcmVzdWx0c1swXS5jYXRlZ29yaWVzLmluZGV4T2YoY2F0ZWdvcnkpIDwgMClcbiAgICAgICAgICAgICAgICAmJiAocmVzdWx0c1swXS5yZWNvcmRbY2F0ZWdvcnldICE9PSByZXN1bHRzWzFdLnJlY29yZFtjYXRlZ29yeV0pKSB7XG4gICAgICAgICAgICAgICAgcHJldi5wdXNoKGNhdGVnb3J5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwcmV2O1xuICAgICAgICB9LCBbXSk7XG4gICAgICAgIGlmIChkaXNjcmltaW5hdGluZy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBcIk1hbnkgY29tcGFyYWJsZSByZXN1bHRzLCBwZXJoYXBzIHlvdSB3YW50IHRvIHNwZWNpZnkgYSBkaXNjcmltaW5hdGluZyBcIiArIGRpc2NyaW1pbmF0aW5nLmpvaW4oJywnKSArICcgb3IgdXNlIFwibGlzdCBhbGwgLi4uXCInO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnWW91ciBxdWVzdGlvbiBkb2VzIG5vdCBoYXZlIGEgc3BlY2lmaWMgYW5zd2VyJztcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbmV4cG9ydHMuaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdFR1cGVsID0gaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdFR1cGVsO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
