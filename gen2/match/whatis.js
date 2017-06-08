"use strict";
/**
 *
 * @module jfseb.fdevstart.analyze
 * @file analyze.ts
 * @copyright (c) 2016 Gerd Forstmann
 */

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", { value: true });
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
                    //console.log("GOT A DOMAIN HIT" + matched + " " + mismatched);
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
        /*
            // ??? var res = ListAll.listAllHavingContext(category, contextQueryString, rules, records);
        
            var aSentencesReinforced = processString(contextQueryString, rules);
            //aSentences.map(function(oSentence) { return InputFilter.reinForce(oSentence); });
            debuglog(debuglog.enabled ? ("after reinforce" + aSentencesReinforced.sentences.map(function (oSentence) {
              return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
            }).join("\n")) : '-');
            var matchedAnswers = matchRecords(aSentencesReinforced, category, records); //aTool: Array<IMatch.ITool>): any / * objectstream* / {
            debuglog(debuglog.enabled ? (" matchedAnswers" + JSON.stringify(matchedAnswers, undefined, 2)) : '-');
            return matchedAnswers;
        */
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1hdGNoL3doYXRpcy5qcyIsIi4uL3NyYy9tYXRjaC93aGF0aXMudHMiXSwibmFtZXMiOlsiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJleHBvcnRzIiwidmFsdWUiLCJhYm90X2VyYmFzZV8xIiwicmVxdWlyZSIsImRlYnVnIiwiZGVidWdsb2ciLCJkZWJ1Z2xvZ1YiLCJwZXJmbG9nIiwiYWJvdF9lcmJhc2VfMiIsImFib3RfZXJiYXNlXzMiLCJtb2NrRGVidWciLCJvIiwiXyIsIk1hdGNoIiwiYWJvdF9lcmJhc2VfNCIsImFib3RfZXJiYXNlXzUiLCJBbGdvbCIsImxvY2FsZUNvbXBhcmVBcnJzIiwiYWFyZXN1bHQiLCJiYnJlc3VsdCIsImNtcCIsImJsZW4iLCJsZW5ndGgiLCJldmVyeSIsImEiLCJpbmRleCIsImxvY2FsZUNvbXBhcmUiLCJzYWZlRXF1YWwiLCJiIiwiZGVsdGEiLCJNYXRoIiwiYWJzIiwiUkFOS0lOR19FUFNJTE9OIiwic2FmZURlbHRhIiwiY21wQnlSZXN1bHRUaGVuUmFua2luZ1R1cGVsIiwiYWEiLCJiYiIsInJlc3VsdCIsIl9yYW5raW5nIiwiY21wUmVjb3JkcyIsImtleXMiLCJjb25jYXQiLCJzb3J0IiwicmVzIiwicmVkdWNlIiwicHJldiIsInNLZXkiLCJjbXBCeVJhbmtpbmciLCJyZWNvcmQiLCJjbXBCeVJhbmtpbmdUdXBlbCIsImR1bXBOaWNlIiwiYW5zd2VyIiwicyIsInB1c2giLCJjYXRlZ29yeSIsImZvckVhY2giLCJzUmVxdWlyZXMiLCJjaGFyQXQiLCJvU2VudGVuY2UiLCJzZW50ZW5jZSIsIm9Xb3JkIiwic1dvcmQiLCJzdHJpbmciLCJtYXRjaGVkU3RyaW5nIiwiZHVtcE5pY2VUdXBlbCIsImNhdGVnb3JpZXMiLCJqb2luIiwiZHVtcFdlaWdodHNUb3AiLCJ0b29sbWF0Y2hlcyIsIm9wdGlvbnMiLCJvTWF0Y2giLCJ0b3AiLCJmaWx0ZXJEaXN0aW5jdFJlc3VsdEFuZFNvcnRUdXBlbCIsInR1cGVsYW5zd2VycyIsImZpbHRlciIsImlSZXMiLCJlbmFibGVkIiwiSlNPTiIsInN0cmluZ2lmeSIsImlzRXF1YWwiLCJhc3NpZ24iLCJmaWx0ZXJPbmx5VG9wUmFua2VkIiwicmVzdWx0cyIsIkVycm9yIiwiZmlsdGVyT25seVRvcFJhbmtlZFR1cGVsIiwiY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeSIsIm1hdGNoZWQiLCJoYXNDYXRlZ29yeSIsIm1pc21hdGNoZWQiLCJyZWxldmFudENvdW50IiwiaGFzRG9tYWluIiwibGVuTWF0Y2hlZCIsImZhY3RvciIsImNhbGNSYW5raW5nUHJvZHVjdCIsInBvdyIsImxlbkhhc0NhdGVnb3J5IiwiZmFjdG9ySCIsImxlbk1pc01hdGNoZWQiLCJmYWN0b3IyIiwiZGl2aXNvciIsIm1ha2VTaW1wbGlmaWVkU2VudGVuY2VzQ2F0ZWdvcnlTZXQyIiwiYVNlbnRlbmNlcyIsImNhdGVnb3J5U2V0IiwidHJhY2siLCJzZW50ZW5jZXMiLCJtYXAiLCJhRG9tYWlucyIsInJXb3JkcyIsImZsIiwibGYiLCJkb21haW5zIiwiY250UmVsZXZhbnRXb3JkcyIsIm1ha2VTaW1wbGlmaWVkU2VudGVuY2VzIiwiV29yZCIsImlzRmlsbGVyIiwiZXh0cmFjdFJlc3VsdCIsIm1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzIiwicFNlbnRlbmNlcyIsInJlY29yZHMiLCJkb21haW5DYXRlZ29yeUZpbHRlciIsImZyZWV6ZSIsImNhdGVnb3J5RiIsInJlbGV2YW50UmVjb3JkcyIsImluZGV4T2YiLCJfZG9tYWluIiwiY2F0IiwidW5kZWZpbmVkIiwib2JqIiwiYVNpbXBsaWZpZWRTZW50ZW5jZXMiLCJTZW50ZW5jZSIsImFTZW50ZW5jZSIsImltaXNtYXRjaGVkIiwiaW1hdGNoZWQiLCJub3VzZSIsImZvdW5kY2F0IiwibWlzc2luZ2NhdCIsImlzQ2F0ZWdvcnkiLCJtYXRjaGVkRG9tYWluIiwibWF0Y2hlZExlbiIsIm1pc21hdGNoZWRMZW4iLCJyZWMiLCJyZXN1bHQxIiwicmVzdWx0MiIsImNsYXNzaWZ5V29yZFdpdGhUYXJnZXRDYXRlZ29yeSIsIndvcmQiLCJ0YXJnZXRjYXRlZ29yeSIsInJ1bGVzIiwid2hvbGVzZW50ZW5jZSIsImNhdHMiLCJJbnB1dEZpbHRlciIsImNhdGVnb3JpemVBV29yZCIsImFuYWx5emVDYXRlZ29yeSIsImNhdGVnb3J5d29yZCIsInNwbGl0QXRDb21tYUFuZCIsInN0ciIsInIiLCJzcGxpdCIsInJ0cmltbWVkIiwiU3RyaW5nIiwidHJpbSIsImFuYWx5emVDYXRlZ29yeU11bHRPbmx5QW5kQ29tbWEiLCJjYXRlZ29yeWxpc3QiLCJyY2F0IiwiZmlsdGVyQWNjZXB0aW5nT25seSIsImlJbmRleCIsInByb2Nlc3NTdHJpbmciLCJxdWVyeSIsIkVyQmFzZSIsIndvcmRDYWNoZSIsImFuYWx5emVDb250ZXh0U3RyaW5nIiwiY29udGV4dFF1ZXJ5U3RyaW5nIiwiYVNlbnRlbmNlc1JlaW5mb3JjZWQiLCJzbGljZSIsIkN1dG9mZl9TZW50ZW5jZXMiLCJyYW5raW5nUHJvZHVjdCIsImNtcEJ5TnJDYXRlZ29yaWVzQW5kU2FtZURvbWFpbiIsImNudGEiLCJnZXREaXN0aW5jdENhdGVnb3JpZXNJblNlbnRlbmNlIiwiY250YiIsImFuYWx5emVDYXRlZ29yeU11bHQiLCJnV29yZHMiLCJyZXMyIiwiY21wUmFua2luZ1Byb2R1Y3QiLCJkdW1wTmljZUFyciIsInJlc2NhdCIsImFuYWx5emVPcGVyYXRvciIsIm9wd29yZCIsIkxpc3RBbGwiLCJyZXNvbHZlQ2F0ZWdvcnkiLCJlcnJvcnMiLCJFckVycm9yIiwibWFrZUVycm9yX0VNUFRZX0lOUFVUIiwidG9rZW5zIiwiYW5zd2VycyIsImxpc3RBbGxXaXRoQ29udGV4dCIsInJlc29sdmVDYXRlZ29yaWVzIiwidGhlTW9kZWwiLCJsaXN0QWxsVHVwZWxXaXRoQ29udGV4dCIsImlzSW5kaXNjcmltaW5hdGVSZXN1bHQiLCJjbnQiLCJkaXNjcmltaW5hdGluZyIsImlzSW5kaXNjcmltaW5hdGVSZXN1bHRUdXBlbCJdLCJt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ckMsQ0FBSixFQUFvRDtBQUNsRCxtQkFBT08sT0FBTyxDQUFkO0FBQ0Q7QUFDRixLQUpTLEVBSVAsQ0FKTyxDQUFWO0FBS0EsUUFBSTBKLE1BQU0sQ0FBVixFQUFhO0FBQ1g7QUFDQSxZQUFJQyxpQkFBaUIxTSxPQUFPMEMsSUFBUCxDQUFZMEMsUUFBUSxDQUFSLEVBQVdsQyxNQUF2QixFQUErQkosTUFBL0IsQ0FBc0MsVUFBVUMsSUFBVixFQUFnQlMsUUFBaEIsRUFBd0I7QUFDakYsZ0JBQUtBLFNBQVNHLE1BQVQsQ0FBZ0IsQ0FBaEIsTUFBdUIsR0FBdkIsSUFBOEJ5QixRQUFRLENBQVIsRUFBV2pCLFVBQVgsQ0FBc0IwRCxPQUF0QixDQUE4QnJFLFFBQTlCLElBQTBDLENBQXpFLElBQ0U0QixRQUFRLENBQVIsRUFBV2xDLE1BQVgsQ0FBa0JNLFFBQWxCLE1BQWdDNEIsUUFBUSxDQUFSLEVBQVdsQyxNQUFYLENBQWtCTSxRQUFsQixDQUR0QyxFQUNvRTtBQUNsRVQscUJBQUtRLElBQUwsQ0FBVUMsUUFBVjtBQUNEO0FBQ0QsbUJBQU9ULElBQVA7QUFDRCxTQU5vQixFQU1sQixFQU5rQixDQUFyQjtBQU9BLFlBQUkySixlQUFlbEwsTUFBbkIsRUFBMkI7QUFDekIsbUJBQU8sMkVBQTJFa0wsZUFBZXRJLElBQWYsQ0FBb0IsR0FBcEIsQ0FBM0UsR0FBc0csd0JBQTdHO0FBQ0Q7QUFDRCxlQUFPLCtDQUFQO0FBQ0Q7QUFDRCxXQUFPNEQsU0FBUDtBQUNEO0FBckJEOUgsUUFBQXlNLDJCQUFBLEdBQUFBLDJCQUFBIiwiZmlsZSI6Im1hdGNoL3doYXRpcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuLyoqXG4gKlxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuYW5hbHl6ZVxuICogQGZpbGUgYW5hbHl6ZS50c1xuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5jb25zdCBhYm90X2VyYmFzZV8xID0gcmVxdWlyZShcImFib3RfZXJiYXNlXCIpO1xuY29uc3QgZGVidWcgPSByZXF1aXJlKFwiZGVidWdcIik7XG52YXIgZGVidWdsb2cgPSBkZWJ1Zygnd2hhdGlzJyk7XG52YXIgZGVidWdsb2dWID0gZGVidWcoJ3doYXRWaXMnKTtcbnZhciBwZXJmbG9nID0gZGVidWcoJ3BlcmYnKTtcbmNvbnN0IGFib3RfZXJiYXNlXzIgPSByZXF1aXJlKFwiYWJvdF9lcmJhc2VcIik7XG5jb25zdCBhYm90X2VyYmFzZV8zID0gcmVxdWlyZShcImFib3RfZXJiYXNlXCIpO1xuZnVuY3Rpb24gbW9ja0RlYnVnKG8pIHtcbiAgICBkZWJ1Z2xvZyA9IG87XG4gICAgZGVidWdsb2dWID0gbztcbiAgICBwZXJmbG9nID0gbztcbn1cbmV4cG9ydHMubW9ja0RlYnVnID0gbW9ja0RlYnVnO1xuY29uc3QgXyA9IHJlcXVpcmUoXCJsb2Rhc2hcIik7XG5jb25zdCBNYXRjaCA9IHJlcXVpcmUoXCIuL21hdGNoXCIpO1xuY29uc3QgYWJvdF9lcmJhc2VfNCA9IHJlcXVpcmUoXCJhYm90X2VyYmFzZVwiKTtcbmNvbnN0IGFib3RfZXJiYXNlXzUgPSByZXF1aXJlKFwiYWJvdF9lcmJhc2VcIik7XG5jb25zdCBBbGdvbCA9IHJlcXVpcmUoXCIuL2FsZ29sXCIpO1xuLypcbmV4cG9ydCBmdW5jdGlvbiBjbXBCeVJlc3VsdFRoZW5SYW5raW5nKGE6IElNYXRjaC5JV2hhdElzQW5zd2VyLCBiOiBJTWF0Y2guSVdoYXRJc0Fuc3dlcikge1xuICB2YXIgY21wID0gYS5yZXN1bHQubG9jYWxlQ29tcGFyZShiLnJlc3VsdCk7XG4gIGlmIChjbXApIHtcbiAgICByZXR1cm4gY21wO1xuICB9XG4gIHJldHVybiAtKGEuX3JhbmtpbmcgLSBiLl9yYW5raW5nKTtcbn1cbiovXG5mdW5jdGlvbiBsb2NhbGVDb21wYXJlQXJycyhhYXJlc3VsdCwgYmJyZXN1bHQpIHtcbiAgICB2YXIgY21wID0gMDtcbiAgICB2YXIgYmxlbiA9IGJicmVzdWx0Lmxlbmd0aDtcbiAgICBhYXJlc3VsdC5ldmVyeShmdW5jdGlvbiAoYSwgaW5kZXgpIHtcbiAgICAgICAgaWYgKGJsZW4gPD0gaW5kZXgpIHtcbiAgICAgICAgICAgIGNtcCA9IC0xO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGNtcCA9IGEubG9jYWxlQ29tcGFyZShiYnJlc3VsdFtpbmRleF0pO1xuICAgICAgICBpZiAoY21wKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgICByZXR1cm4gY21wO1xuICAgIH1cbiAgICBpZiAoYmxlbiA+IGFhcmVzdWx0Lmxlbmd0aCkge1xuICAgICAgICBjbXAgPSArMTtcbiAgICB9XG4gICAgcmV0dXJuIDA7XG59XG5mdW5jdGlvbiBzYWZlRXF1YWwoYSwgYikge1xuICAgIHZhciBkZWx0YSA9IGEgLSBiO1xuICAgIGlmIChNYXRoLmFicyhkZWx0YSkgPCBBbGdvbC5SQU5LSU5HX0VQU0lMT04pIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cbmV4cG9ydHMuc2FmZUVxdWFsID0gc2FmZUVxdWFsO1xuZnVuY3Rpb24gc2FmZURlbHRhKGEsIGIpIHtcbiAgICB2YXIgZGVsdGEgPSBhIC0gYjtcbiAgICBpZiAoTWF0aC5hYnMoZGVsdGEpIDwgQWxnb2wuUkFOS0lOR19FUFNJTE9OKSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICByZXR1cm4gZGVsdGE7XG59XG5leHBvcnRzLnNhZmVEZWx0YSA9IHNhZmVEZWx0YTtcbmZ1bmN0aW9uIGNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbChhYSwgYmIpIHtcbiAgICB2YXIgY21wID0gbG9jYWxlQ29tcGFyZUFycnMoYWEucmVzdWx0LCBiYi5yZXN1bHQpO1xuICAgIGlmIChjbXApIHtcbiAgICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG4gICAgcmV0dXJuIC1zYWZlRGVsdGEoYWEuX3JhbmtpbmcsIGJiLl9yYW5raW5nKTtcbn1cbmV4cG9ydHMuY21wQnlSZXN1bHRUaGVuUmFua2luZ1R1cGVsID0gY21wQnlSZXN1bHRUaGVuUmFua2luZ1R1cGVsO1xuZnVuY3Rpb24gY21wUmVjb3JkcyhhLCBiKSB7XG4gICAgLy8gYXJlIHJlY29yZHMgZGlmZmVyZW50P1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYSkuY29uY2F0KE9iamVjdC5rZXlzKGIpKS5zb3J0KCk7XG4gICAgdmFyIHJlcyA9IGtleXMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBzS2V5KSB7XG4gICAgICAgIGlmIChwcmV2KSB7XG4gICAgICAgICAgICByZXR1cm4gcHJldjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYltzS2V5XSAhPT0gYVtzS2V5XSkge1xuICAgICAgICAgICAgaWYgKCFiW3NLZXldKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFhW3NLZXldKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICsxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGFbc0tleV0ubG9jYWxlQ29tcGFyZShiW3NLZXldKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9LCAwKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5jbXBSZWNvcmRzID0gY21wUmVjb3JkcztcbmZ1bmN0aW9uIGNtcEJ5UmFua2luZyhhLCBiKSB7XG4gICAgdmFyIGNtcCA9IC1zYWZlRGVsdGEoYS5fcmFua2luZywgYi5fcmFua2luZyk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgICByZXR1cm4gY21wO1xuICAgIH1cbiAgICBjbXAgPSBhLnJlc3VsdC5sb2NhbGVDb21wYXJlKGIucmVzdWx0KTtcbiAgICBpZiAoY21wKSB7XG4gICAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuICAgIHJldHVybiBjbXBSZWNvcmRzKGEucmVjb3JkLCBiLnJlY29yZCk7XG59XG5leHBvcnRzLmNtcEJ5UmFua2luZyA9IGNtcEJ5UmFua2luZztcbmZ1bmN0aW9uIGNtcEJ5UmFua2luZ1R1cGVsKGEsIGIpIHtcbiAgICB2YXIgY21wID0gLXNhZmVEZWx0YShhLl9yYW5raW5nLCBiLl9yYW5raW5nKTtcbiAgICBpZiAoY21wKSB7XG4gICAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuICAgIGNtcCA9IGxvY2FsZUNvbXBhcmVBcnJzKGEucmVzdWx0LCBiLnJlc3VsdCk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgICByZXR1cm4gY21wO1xuICAgIH1cbiAgICByZXR1cm4gY21wUmVjb3JkcyhhLnJlY29yZCwgYi5yZWNvcmQpO1xufVxuZXhwb3J0cy5jbXBCeVJhbmtpbmdUdXBlbCA9IGNtcEJ5UmFua2luZ1R1cGVsO1xuZnVuY3Rpb24gZHVtcE5pY2UoYW5zd2VyKSB7XG4gICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgczogXCJcIixcbiAgICAgICAgcHVzaDogZnVuY3Rpb24gKHMpIHsgdGhpcy5zID0gdGhpcy5zICsgczsgfVxuICAgIH07XG4gICAgdmFyIHMgPSBgKipSZXN1bHQgZm9yIGNhdGVnb3J5OiAke2Fuc3dlci5jYXRlZ29yeX0gaXMgJHthbnN3ZXIucmVzdWx0fVxuIHJhbms6ICR7YW5zd2VyLl9yYW5raW5nfVxuYDtcbiAgICByZXN1bHQucHVzaChzKTtcbiAgICBPYmplY3Qua2V5cyhhbnN3ZXIucmVjb3JkKS5mb3JFYWNoKGZ1bmN0aW9uIChzUmVxdWlyZXMsIGluZGV4KSB7XG4gICAgICAgIGlmIChzUmVxdWlyZXMuY2hhckF0KDApICE9PSAnXycpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKGByZWNvcmQ6ICR7c1JlcXVpcmVzfSAtPiAke2Fuc3dlci5yZWNvcmRbc1JlcXVpcmVzXX1gKTtcbiAgICAgICAgfVxuICAgICAgICByZXN1bHQucHVzaCgnXFxuJyk7XG4gICAgfSk7XG4gICAgdmFyIG9TZW50ZW5jZSA9IGFuc3dlci5zZW50ZW5jZTtcbiAgICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGluZGV4KSB7XG4gICAgICAgIHZhciBzV29yZCA9IGBbJHtpbmRleH1dIDogJHtvV29yZC5jYXRlZ29yeX0gXCIke29Xb3JkLnN0cmluZ31cIiA9PiBcIiR7b1dvcmQubWF0Y2hlZFN0cmluZ31cImA7XG4gICAgICAgIHJlc3VsdC5wdXNoKHNXb3JkICsgXCJcXG5cIik7XG4gICAgfSk7XG4gICAgcmVzdWx0LnB1c2goXCIuXFxuXCIpO1xuICAgIHJldHVybiByZXN1bHQucztcbn1cbmV4cG9ydHMuZHVtcE5pY2UgPSBkdW1wTmljZTtcbmZ1bmN0aW9uIGR1bXBOaWNlVHVwZWwoYW5zd2VyKSB7XG4gICAgdmFyIHJlc3VsdCA9IHtcbiAgICAgICAgczogXCJcIixcbiAgICAgICAgcHVzaDogZnVuY3Rpb24gKHMpIHsgdGhpcy5zID0gdGhpcy5zICsgczsgfVxuICAgIH07XG4gICAgdmFyIHMgPSBgKipSZXN1bHQgZm9yIGNhdGVnb3JpZXM6ICR7YW5zd2VyLmNhdGVnb3JpZXMuam9pbihcIjtcIil9IGlzICR7YW5zd2VyLnJlc3VsdH1cbiByYW5rOiAke2Fuc3dlci5fcmFua2luZ31cbmA7XG4gICAgcmVzdWx0LnB1c2gocyk7XG4gICAgT2JqZWN0LmtleXMoYW5zd2VyLnJlY29yZCkuZm9yRWFjaChmdW5jdGlvbiAoc1JlcXVpcmVzLCBpbmRleCkge1xuICAgICAgICBpZiAoc1JlcXVpcmVzLmNoYXJBdCgwKSAhPT0gJ18nKSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaChgcmVjb3JkOiAke3NSZXF1aXJlc30gLT4gJHthbnN3ZXIucmVjb3JkW3NSZXF1aXJlc119YCk7XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0LnB1c2goJ1xcbicpO1xuICAgIH0pO1xuICAgIHZhciBvU2VudGVuY2UgPSBhbnN3ZXIuc2VudGVuY2U7XG4gICAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpbmRleCkge1xuICAgICAgICB2YXIgc1dvcmQgPSBgWyR7aW5kZXh9XSA6ICR7b1dvcmQuY2F0ZWdvcnl9IFwiJHtvV29yZC5zdHJpbmd9XCIgPT4gXCIke29Xb3JkLm1hdGNoZWRTdHJpbmd9XCJgO1xuICAgICAgICByZXN1bHQucHVzaChzV29yZCArIFwiXFxuXCIpO1xuICAgIH0pO1xuICAgIHJlc3VsdC5wdXNoKFwiLlxcblwiKTtcbiAgICByZXR1cm4gcmVzdWx0LnM7XG59XG5leHBvcnRzLmR1bXBOaWNlVHVwZWwgPSBkdW1wTmljZVR1cGVsO1xuZnVuY3Rpb24gZHVtcFdlaWdodHNUb3AodG9vbG1hdGNoZXMsIG9wdGlvbnMpIHtcbiAgICB2YXIgcyA9ICcnO1xuICAgIHRvb2xtYXRjaGVzLmZvckVhY2goZnVuY3Rpb24gKG9NYXRjaCwgaW5kZXgpIHtcbiAgICAgICAgaWYgKGluZGV4IDwgb3B0aW9ucy50b3ApIHtcbiAgICAgICAgICAgIHMgPSBzICsgXCJXaGF0SXNBbnN3ZXJbXCIgKyBpbmRleCArIFwiXS4uLlxcblwiO1xuICAgICAgICAgICAgcyA9IHMgKyBkdW1wTmljZShvTWF0Y2gpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHM7XG59XG5leHBvcnRzLmR1bXBXZWlnaHRzVG9wID0gZHVtcFdlaWdodHNUb3A7XG5mdW5jdGlvbiBmaWx0ZXJEaXN0aW5jdFJlc3VsdEFuZFNvcnRUdXBlbChyZXMpIHtcbiAgICB2YXIgcmVzdWx0ID0gcmVzLnR1cGVsYW5zd2Vycy5maWx0ZXIoZnVuY3Rpb24gKGlSZXMsIGluZGV4KSB7XG4gICAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZygnIHJldGFpbiB0dXBlbCAnICsgaW5kZXggKyAnICcgKyBKU09OLnN0cmluZ2lmeShpUmVzKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKF8uaXNFcXVhbChpUmVzLnJlc3VsdCwgcmVzLnR1cGVsYW5zd2Vyc1tpbmRleCAtIDFdICYmIHJlcy50dXBlbGFuc3dlcnNbaW5kZXggLSAxXS5yZXN1bHQpKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZygnc2tpcCcpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIHJlc3VsdC5zb3J0KGNtcEJ5UmFua2luZ1R1cGVsKTtcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihyZXMsIHsgdHVwZWxhbnN3ZXJzOiByZXN1bHQgfSk7XG59XG5leHBvcnRzLmZpbHRlckRpc3RpbmN0UmVzdWx0QW5kU29ydFR1cGVsID0gZmlsdGVyRGlzdGluY3RSZXN1bHRBbmRTb3J0VHVwZWw7XG5mdW5jdGlvbiBmaWx0ZXJPbmx5VG9wUmFua2VkKHJlc3VsdHMpIHtcbiAgICB2YXIgcmVzID0gcmVzdWx0cy5maWx0ZXIoZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICBpZiAoc2FmZUVxdWFsKHJlc3VsdC5fcmFua2luZywgcmVzdWx0c1swXS5fcmFua2luZykpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQuX3JhbmtpbmcgPj0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTGlzdCB0byBmaWx0ZXIgbXVzdCBiZSBvcmRlcmVkXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5maWx0ZXJPbmx5VG9wUmFua2VkID0gZmlsdGVyT25seVRvcFJhbmtlZDtcbmZ1bmN0aW9uIGZpbHRlck9ubHlUb3BSYW5rZWRUdXBlbChyZXN1bHRzKSB7XG4gICAgdmFyIHJlcyA9IHJlc3VsdHMuZmlsdGVyKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgaWYgKHNhZmVFcXVhbChyZXN1bHQuX3JhbmtpbmcsIHJlc3VsdHNbMF0uX3JhbmtpbmcpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0Ll9yYW5raW5nID49IHJlc3VsdHNbMF0uX3JhbmtpbmcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkxpc3QgdG8gZmlsdGVyIG11c3QgYmUgb3JkZXJlZFwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZmlsdGVyT25seVRvcFJhbmtlZFR1cGVsID0gZmlsdGVyT25seVRvcFJhbmtlZFR1cGVsO1xuLyoqXG4gKiBBIHJhbmtpbmcgd2hpY2ggaXMgcHVyZWx5IGJhc2VkIG9uIHRoZSBudW1iZXJzIG9mIG1hdGNoZWQgZW50aXRpZXMsXG4gKiBkaXNyZWdhcmRpbmcgZXhhY3RuZXNzIG9mIG1hdGNoXG4gKi9cbi8qXG5leHBvcnQgZnVuY3Rpb24gY2FsY1JhbmtpbmdTaW1wbGUobWF0Y2hlZDogbnVtYmVyLFxuICBtaXNtYXRjaGVkOiBudW1iZXIsIG5vdXNlOiBudW1iZXIsXG4gIHJlbGV2YW50Q291bnQ6IG51bWJlcik6IG51bWJlciB7XG4gIC8vIDIgOiAwXG4gIC8vIDEgOiAwXG4gIHZhciBmYWN0b3IgPSBtYXRjaGVkICogTWF0aC5wb3coMS41LCBtYXRjaGVkKSAqIE1hdGgucG93KDEuNSwgbWF0Y2hlZCk7XG4gIHZhciBmYWN0b3IyID0gTWF0aC5wb3coMC40LCBtaXNtYXRjaGVkKTtcbiAgdmFyIGZhY3RvcjMgPSBNYXRoLnBvdygwLjQsIG5vdXNlKTtcbiAgcmV0dXJuIE1hdGgucG93KGZhY3RvcjIgKiBmYWN0b3IgKiBmYWN0b3IzLCAxIC8gKG1pc21hdGNoZWQgKyBtYXRjaGVkICsgbm91c2UpKTtcbn1cbiovXG5mdW5jdGlvbiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCByZWxldmFudENvdW50LCBoYXNEb21haW4pIHtcbiAgICB2YXIgbGVuTWF0Y2hlZCA9IE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aDtcbiAgICB2YXIgZmFjdG9yID0gTWF0Y2guY2FsY1JhbmtpbmdQcm9kdWN0KG1hdGNoZWQpO1xuICAgIGZhY3RvciAqPSBNYXRoLnBvdygxLjUsIGxlbk1hdGNoZWQpO1xuICAgIGlmIChoYXNEb21haW4pIHtcbiAgICAgICAgZmFjdG9yICo9IDEuNTtcbiAgICB9XG4gICAgdmFyIGxlbkhhc0NhdGVnb3J5ID0gT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aDtcbiAgICB2YXIgZmFjdG9ySCA9IE1hdGgucG93KDEuMSwgbGVuSGFzQ2F0ZWdvcnkpO1xuICAgIHZhciBsZW5NaXNNYXRjaGVkID0gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoO1xuICAgIHZhciBmYWN0b3IyID0gTWF0Y2guY2FsY1JhbmtpbmdQcm9kdWN0KG1pc21hdGNoZWQpO1xuICAgIGZhY3RvcjIgKj0gTWF0aC5wb3coMC40LCBsZW5NaXNNYXRjaGVkKTtcbiAgICB2YXIgZGl2aXNvciA9IChsZW5NaXNNYXRjaGVkICsgbGVuSGFzQ2F0ZWdvcnkgKyBsZW5NYXRjaGVkKTtcbiAgICBkaXZpc29yID0gZGl2aXNvciA/IGRpdmlzb3IgOiAxO1xuICAgIHJldHVybiBNYXRoLnBvdyhmYWN0b3IyICogZmFjdG9ySCAqIGZhY3RvciwgMSAvIChkaXZpc29yKSk7XG59XG5leHBvcnRzLmNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkgPSBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5O1xuLyoqXG4gKiBsaXN0IGFsbCB0b3AgbGV2ZWwgcmFua2luZ3NcbiAqL1xuLypcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFJlY29yZHNIYXZpbmdDb250ZXh0KFxuICBwU2VudGVuY2VzOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcywgY2F0ZWdvcnk6IHN0cmluZywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+LFxuICBjYXRlZ29yeVNldDogeyBba2V5OiBzdHJpbmddOiBib29sZWFuIH0pXG4gIDogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzIHtcblxyXG4gIC8vZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gIHZhciByZWxldmFudFJlY29yZHMgPSByZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAocmVjb3JkOiBJTWF0Y2guSVJlY29yZCkge1xuICAgIHJldHVybiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSAmJiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gbnVsbCk7XG4gIH0pO1xuICB2YXIgcmVzID0gW107XG4gIGRlYnVnbG9nKFwiTWF0Y2hSZWNvcmRzSGF2aW5nQ29udGV4dCA6IHJlbGV2YW50IHJlY29yZHMgbnI6XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoKTtcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcInNlbnRlbmNlcyBhcmUgOiBcIiArIEpTT04uc3RyaW5naWZ5KHBTZW50ZW5jZXMsIHVuZGVmaW5lZCwgMikpIDogXCItXCIpO1xuICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiY2F0ZWdvcnkgXCIgKyBjYXRlZ29yeSArIFwiIGFuZCBjYXRlZ29yeXNldCBpczogXCIgKyBKU09OLnN0cmluZ2lmeShjYXRlZ29yeVNldCwgdW5kZWZpbmVkLCAyKSkgOiBcIi1cIik7XG4gIGlmIChwcm9jZXNzLmVudi5BQk9UX0ZBU1QgJiYgY2F0ZWdvcnlTZXQpIHtcbiAgICAvLyB3ZSBhcmUgb25seSBpbnRlcmVzdGVkIGluIGNhdGVnb3JpZXMgcHJlc2VudCBpbiByZWNvcmRzIGZvciBkb21haW5zIHdoaWNoIGNvbnRhaW4gdGhlIGNhdGVnb3J5XG4gICAgLy8gdmFyIGNhdGVnb3J5c2V0ID0gTW9kZWwuY2FsY3VsYXRlUmVsZXZhbnRSZWNvcmRDYXRlZ29yaWVzKHRoZU1vZGVsLGNhdGVnb3J5KTtcbiAgICAvL2tub3dpbmcgdGhlIHRhcmdldFxuICAgIHBlcmZsb2coXCJnb3QgY2F0ZWdvcnlzZXQgd2l0aCBcIiArIE9iamVjdC5rZXlzKGNhdGVnb3J5U2V0KS5sZW5ndGgpO1xuICAgIHZhciBmbCA9IDA7XG4gICAgdmFyIGxmID0gMDtcbiAgICB2YXIgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBwU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgdmFyIGZXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICAgIH0pO1xuICAgICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiAhIWNhdGVnb3J5U2V0W29Xb3JkLmNhdGVnb3J5XSB8fCBXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCk7XG4gICAgICB9KTtcbiAgICAgIGZsID0gZmwgKyBvU2VudGVuY2UubGVuZ3RoO1xuICAgICAgbGYgPSBsZiArIHJXb3Jkcy5sZW5ndGg7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCwgLy8gbm90IGEgZmlsbGVyICAvLyB0byBiZSBjb21wYXRpYmxlIGl0IHdvdWxkIGJlIGZXb3Jkc1xuICAgICAgICByV29yZHM6IHJXb3Jkc1xuICAgICAgfTtcbiAgICB9KTtcbiAgICBPYmplY3QuZnJlZXplKGFTaW1wbGlmaWVkU2VudGVuY2VzKTtcbiAgICBkZWJ1Z2xvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgZmwgKyBcIi0+XCIgKyBsZiArIFwiKVwiKTtcbiAgICBwZXJmbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyBmbCArIFwiLT5cIiArIGxmICsgXCIpXCIpO1xuICAgIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgICB2YXIgaGFzQ2F0ZWdvcnkgPSB7fTtcbiAgICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSBhU2VudGVuY2UuY250UmVsZXZhbnRXb3JkcztcbiAgICAgICAgYVNlbnRlbmNlLnJXb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCkgJiYgcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICBoYXNDYXRlZ29yeVtvV29yZC5tYXRjaGVkU3RyaW5nXSA9IDE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIGlmICgoT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoICsgT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aCkgPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLm9TZW50ZW5jZSxcbiAgICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxuICAgICAgICAgICAgcmVzdWx0OiByZWNvcmRbY2F0ZWdvcnldLFxuICAgICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSk7XG4gICAgZGVidWdsb2coXCJoZXJlIGluIHdlaXJkXCIpO1xuICB9IGVsc2Uge1xuICAgIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgIHBTZW50ZW5jZXMuc2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgICB2YXIgaGFzQ2F0ZWdvcnkgPSB7fTtcbiAgICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSAwO1xuICAgICAgICBhU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICBpZiAoIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCkpIHtcbiAgICAgICAgICAgIGNudFJlbGV2YW50V29yZHMgPSBjbnRSZWxldmFudFdvcmRzICsgMTtcbiAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICAgIG1hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpICYmIHJlY29yZFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgICBoYXNDYXRlZ29yeVtvV29yZC5tYXRjaGVkU3RyaW5nXSA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKChPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoKSA+IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aCkge1xuICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2UsXG4gICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICAgIHJlc3VsdDogcmVjb3JkW2NhdGVnb3J5XSxcbiAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0pO1xuICB9XG4gIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmcpO1xuICBkZWJ1Z2xvZyhcIiBhZnRlciBzb3J0XCIgKyByZXMubGVuZ3RoKTtcbiAgdmFyIHJlc3VsdCA9IE9iamVjdC5hc3NpZ24oe30sIHBTZW50ZW5jZXMsIHsgYW5zd2VyczogcmVzIH0pO1xuICByZXR1cm4gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0KHJlc3VsdCk7XG59XG4qL1xuLypcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFJlY29yZHMoYVNlbnRlbmNlczogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMsIGNhdGVnb3J5OiBzdHJpbmcsIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPilcbiAgOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnMge1xuICAvLyBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAvLyAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZHMsIHVuZGVmaW5lZCwgMikpO1xuICAvLyB9XG4gIHZhciByZWxldmFudFJlY29yZHMgPSByZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAocmVjb3JkOiBJTWF0Y2guSVJlY29yZCkge1xuICAgIHJldHVybiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSAmJiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gbnVsbCk7XG4gIH0pO1xuICB2YXIgcmVzID0gW107XG4gIGRlYnVnbG9nKFwicmVsZXZhbnQgcmVjb3JkcyBucjpcIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGgpO1xuICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgYVNlbnRlbmNlcy5zZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAoYVNlbnRlbmNlKSB7XG4gICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICB2YXIgbWlzbWF0Y2hlZCA9IHt9XG4gICAgICB2YXIgbWF0Y2hlZCA9IHt9O1xuICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSAwO1xuICAgICAgYVNlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIGlmICghV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKSkge1xuICAgICAgICAgIGNudFJlbGV2YW50V29yZHMgPSBjbnRSZWxldmFudFdvcmRzICsgMTtcbiAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgIG1hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBpZiAoT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoID4gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoKSB7XG4gICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLFxuICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICByZXN1bHQ6IHJlY29yZFtjYXRlZ29yeV0sXG4gICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nKG1hdGNoZWQsIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pXG4gIH0pO1xuICByZXMuc29ydChjbXBCeVJlc3VsdFRoZW5SYW5raW5nKTtcbiAgdmFyIHJlc3VsdCA9IE9iamVjdC5hc3NpZ24oe30sIGFTZW50ZW5jZXMsIHsgYW5zd2VyczogcmVzIH0pO1xuICByZXR1cm4gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0KHJlc3VsdCk7XG59XG4qL1xuLypcbmZ1bmN0aW9uIG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzQ2F0ZWdvcnlTZXQoYVNlbnRlbmNlczogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMsXG4gIGNhdGVnb3J5U2V0OiB7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfSwgdHJhY2s6IHsgZmw6IG51bWJlciwgbGY6IG51bWJlciB9XG4pOiB7XG4gIGRvbWFpbnM6IHN0cmluZ1tdLFxuICBvU2VudGVuY2U6IElNYXRjaC5JU2VudGVuY2UsXG4gIGNudFJlbGV2YW50V29yZHM6IG51bWJlcixcbiAgcldvcmRzOiBJTWF0Y2guSVdvcmRbXVxufVtdIHtcbiAgcmV0dXJuIGFTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgdmFyIGFEb21haW5zID0gW10gYXMgc3RyaW5nW107XG4gICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwiZG9tYWluXCIpIHtcbiAgICAgICAgYURvbWFpbnMucHVzaChvV29yZC5tYXRjaGVkU3RyaW5nKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcIm1ldGFcIikge1xuICAgICAgICAvLyBlLmcuIGRvbWFpbiBYWFhcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuICEhY2F0ZWdvcnlTZXRbb1dvcmQuY2F0ZWdvcnldO1xuICAgIH0pO1xuICAgIHRyYWNrLmZsICs9IG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgdHJhY2subGYgKz0gcldvcmRzLmxlbmd0aDtcbiAgICByZXR1cm4ge1xuICAgICAgZG9tYWluczogYURvbWFpbnMsXG4gICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsXG4gICAgICByV29yZHM6IHJXb3Jkc1xuICAgIH07XG4gIH0pO1xufVxuKi9cbmZ1bmN0aW9uIG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzQ2F0ZWdvcnlTZXQyKGFTZW50ZW5jZXMsIGNhdGVnb3J5U2V0LCB0cmFjaykge1xuICAgIHJldHVybiBhU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICB2YXIgYURvbWFpbnMgPSBbXTtcbiAgICAgICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwiZG9tYWluXCIpIHtcbiAgICAgICAgICAgICAgICBhRG9tYWlucy5wdXNoKG9Xb3JkLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJtZXRhXCIpIHtcbiAgICAgICAgICAgICAgICAvLyBlLmcuIGRvbWFpbiBYWFhcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwiY2F0ZWdvcnlcIikge1xuICAgICAgICAgICAgICAgIGlmIChjYXRlZ29yeVNldFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gISFjYXRlZ29yeVNldFtvV29yZC5jYXRlZ29yeV07XG4gICAgICAgIH0pO1xuICAgICAgICB0cmFjay5mbCArPSBvU2VudGVuY2UubGVuZ3RoO1xuICAgICAgICB0cmFjay5sZiArPSByV29yZHMubGVuZ3RoO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZG9tYWluczogYURvbWFpbnMsXG4gICAgICAgICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsXG4gICAgICAgICAgICByV29yZHM6IHJXb3Jkc1xuICAgICAgICB9O1xuICAgIH0pO1xufVxuZnVuY3Rpb24gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXMoYVNlbnRlbmNlcywgdHJhY2spIHtcbiAgICByZXR1cm4gYVNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgdmFyIGRvbWFpbnMgPSBbXTtcbiAgICAgICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwiZG9tYWluXCIpIHtcbiAgICAgICAgICAgICAgICBkb21haW5zLnB1c2gob1dvcmQubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcIm1ldGFcIikge1xuICAgICAgICAgICAgICAgIC8vIGUuZy4gZG9tYWluIFhYWFxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAhYWJvdF9lcmJhc2VfNS5Xb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpO1xuICAgICAgICB9KTtcbiAgICAgICAgdHJhY2suZmwgKz0gb1NlbnRlbmNlLmxlbmd0aDtcbiAgICAgICAgdHJhY2subGYgKz0gcldvcmRzLmxlbmd0aDtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgICAgICAgZG9tYWluczogZG9tYWlucyxcbiAgICAgICAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsXG4gICAgICAgICAgICByV29yZHM6IHJXb3Jkc1xuICAgICAgICB9O1xuICAgIH0pO1xufVxuZnVuY3Rpb24gZXh0cmFjdFJlc3VsdChjYXRlZ29yaWVzLCByZWNvcmQpIHtcbiAgICByZXR1cm4gY2F0ZWdvcmllcy5tYXAoZnVuY3Rpb24gKGNhdGVnb3J5KSB7IHJldHVybiByZWNvcmRbY2F0ZWdvcnldIHx8IFwibi9hXCI7IH0pO1xufVxuZnVuY3Rpb24gbWF0Y2hSZWNvcmRzUXVpY2tNdWx0aXBsZUNhdGVnb3JpZXMocFNlbnRlbmNlcywgY2F0ZWdvcmllcywgcmVjb3JkcywgZG9tYWluQ2F0ZWdvcnlGaWx0ZXIpIHtcbiAgICAvLyBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgIC8vICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRzLCB1bmRlZmluZWQsIDIpKTtcbiAgICAvLyB9XG4gICAgaWYgKGRvbWFpbkNhdGVnb3J5RmlsdGVyICYmICFkb21haW5DYXRlZ29yeUZpbHRlci5kb21haW5zKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIm9sZCBjYXRlZ29yeXNTRXQgPz9cIik7XG4gICAgfVxuICAgIE9iamVjdC5mcmVlemUoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIpO1xuICAgIHZhciBjYXRlZ29yeUYgPSBjYXRlZ29yaWVzWzBdO1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJtYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcyAocj1cIiArIChyZWNvcmRzICYmIHJlY29yZHMubGVuZ3RoKVxuICAgICAgICArIFwiIHM9XCIgKyAocFNlbnRlbmNlcyAmJiBwU2VudGVuY2VzLnNlbnRlbmNlcyAmJiBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGgpICsgXCIpXFxuIGNhdGVnb3JpZXM6XCIgKyAoY2F0ZWdvcmllcyAmJiBjYXRlZ29yaWVzLmpvaW4oXCJcXG5cIikpICsgXCIgY2F0ZWdvcnlTZXQ6IFwiXG4gICAgICAgICsgKGRvbWFpbkNhdGVnb3J5RmlsdGVyICYmICh0eXBlb2YgZG9tYWluQ2F0ZWdvcnlGaWx0ZXIuY2F0ZWdvcnlTZXQgPT09IFwib2JqZWN0XCIpICYmIE9iamVjdC5rZXlzKGRvbWFpbkNhdGVnb3J5RmlsdGVyLmNhdGVnb3J5U2V0KS5qb2luKFwiXFxuXCIpKSkgOiBcIi1cIik7XG4gICAgcGVyZmxvZyhcIm1hdGNoUmVjb3Jkc1F1aWNrTXVsdCAuLi4ocj1cIiArIHJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiKVwiKTtcbiAgICAvL2NvbnNvbGUubG9nKCdjYXRlZ29yaWVzICcgKyAgSlNPTi5zdHJpbmdpZnkoY2F0ZWdvcmllcykpO1xuICAgIC8vY29uc29sZS5sb2coJ2NhdGVncm95U2V0JyArICBKU09OLnN0cmluZ2lmeShjYXRlZ29yeVNldCkpO1xuICAgIHZhciByZWxldmFudFJlY29yZHMgPSByZWNvcmRzO1xuICAgIGlmIChkb21haW5DYXRlZ29yeUZpbHRlciAmJiBkb21haW5DYXRlZ29yeUZpbHRlci5kb21haW5zKSB7XG4gICAgICAgIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgICAgIHJldHVybiAoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIuZG9tYWlucy5pbmRleE9mKHJlY29yZC5fZG9tYWluKSA+PSAwKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZWxldmFudFJlY29yZHMgPSByZWxldmFudFJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgICAgIHJldHVybiAhY2F0ZWdvcmllcy5ldmVyeShjYXQgPT4gKHJlY29yZFtjYXRdID09PSB1bmRlZmluZWQpIHx8IChyZWNvcmRbY2F0XSA9PT0gbnVsbCkpO1xuICAgICAgICAgICAgLy8gICAgICB9XG4gICAgICAgICAgICAvLyAgICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnlGXSAhPT0gdW5kZWZpbmVkKSAmJiAocmVjb3JkW2NhdGVnb3J5Rl0gIT09IG51bGwpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIGRlYnVnbG9nKFwicmVsZXZhbnQgcmVjb3JkcyB3aXRoIGZpcnN0IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiKVwiKTtcbiAgICBwZXJmbG9nKFwicmVsZXZhbnQgcmVjb3JkcyB3aXRoIGZpcnN0IG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHNlbnRlbmNlcyBcIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCk7XG4gICAgaWYgKGRvbWFpbkNhdGVnb3J5RmlsdGVyKSB7XG4gICAgICAgIC8vIHdlIGFyZSBvbmx5IGludGVyZXN0ZWQgaW4gY2F0ZWdvcmllcyBwcmVzZW50IGluIHJlY29yZHMgZm9yIGRvbWFpbnMgd2hpY2ggY29udGFpbiB0aGUgY2F0ZWdvcnlcbiAgICAgICAgLy8gdmFyIGNhdGVnb3J5c2V0ID0gTW9kZWwuY2FsY3VsYXRlUmVsZXZhbnRSZWNvcmRDYXRlZ29yaWVzKHRoZU1vZGVsLGNhdGVnb3J5KTtcbiAgICAgICAgLy9rbm93aW5nIHRoZSB0YXJnZXRcbiAgICAgICAgcGVyZmxvZyhcImdvdCBjYXRlZ29yeXNldCB3aXRoIFwiICsgT2JqZWN0LmtleXMoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIuY2F0ZWdvcnlTZXQpLmxlbmd0aCk7XG4gICAgICAgIHZhciBvYmogPSB7IGZsOiAwLCBsZjogMCB9O1xuICAgICAgICB2YXIgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBbXTtcbiAgICAgICAgLy8gIGlmIChwcm9jZXNzLmVudi5BQk9UX0JFVDEpIHtcbiAgICAgICAgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBtYWtlU2ltcGxpZmllZFNlbnRlbmNlc0NhdGVnb3J5U2V0MihwU2VudGVuY2VzLCBkb21haW5DYXRlZ29yeUZpbHRlci5jYXRlZ29yeVNldCwgb2JqKTtcbiAgICAgICAgLy8gIH0gZWxzZSB7XG4gICAgICAgIC8vICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXNDYXRlZ29yeVNldChwU2VudGVuY2VzLCBjYXRlZ29yeVNldCwgb2JqKSBhcyBhbnk7XG4gICAgICAgIC8vICB9XG4gICAgICAgIHBlcmZsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIG9iai5mbCArIFwiLT5cIiArIG9iai5sZiArIFwiKVwiKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGRlYnVnbG9nKFwibm90IGFib3RfZmFzdCAhXCIpO1xuICAgICAgICB2YXIgdHJhY2sgPSB7IGZsOiAwLCBsZjogMCB9O1xuICAgICAgICB2YXIgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBtYWtlU2ltcGxpZmllZFNlbnRlbmNlcyhwU2VudGVuY2VzLCB0cmFjayk7XG4gICAgICAgIC8qXG4gICAgICAgICAgICBwU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICAgICAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBmbCA9IGZsICsgb1NlbnRlbmNlLmxlbmd0aDtcbiAgICAgICAgICAgICAgbGYgPSBsZiArIHJXb3Jkcy5sZW5ndGg7XG4gICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICAgICAgICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICByV29yZHM6IHJXb3Jkc1xuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAqL1xuICAgICAgICBkZWJ1Z2xvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgdHJhY2suZmwgKyBcIi0+XCIgKyB0cmFjay5sZiArIFwiKVwiKTtcbiAgICAgICAgcGVyZmxvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgdHJhY2suZmwgKyBcIi0+XCIgKyB0cmFjay5sZiArIFwiKVwiKTtcbiAgICB9XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImhlcmUgc2ltcGxpZmllZCBzZW50ZW5jZXMgXCIgK1xuICAgICAgICBhU2ltcGxpZmllZFNlbnRlbmNlcy5tYXAobyA9PiBcIlxcbkRvbWFpbj1cIiArIG8uZG9tYWlucy5qb2luKFwiXFxuXCIpICsgXCJcXG5cIiArIGFib3RfZXJiYXNlXzQuU2VudGVuY2UuZHVtcE5pY2Uoby5yV29yZHMpKS5qb2luKFwiXFxuXCIpKSA6IFwiLVwiKTtcbiAgICAvL2NvbnNvbGUubG9nKFwiaGVyZSByZWNyb2RzXCIgKyByZWxldmFudFJlY29yZHMubWFwKCAobyxpbmRleCkgPT4gIFwiIGluZGV4ID0gXCIgKyBpbmRleCArIFwiIFwiICsgSlNPTi5zdHJpbmdpZnkobykpLmpvaW4oXCJcXG5cIikpO1xuICAgIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgYVNpbXBsaWZpZWRTZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAoYVNlbnRlbmNlKSB7XG4gICAgICAgICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICAgICAgICB2YXIgaW1pc21hdGNoZWQgPSAwO1xuICAgICAgICAgICAgdmFyIGltYXRjaGVkID0gMDtcbiAgICAgICAgICAgIHZhciBub3VzZSA9IDA7XG4gICAgICAgICAgICB2YXIgZm91bmRjYXQgPSAxO1xuICAgICAgICAgICAgdmFyIG1pc3NpbmdjYXQgPSAwO1xuICAgICAgICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgICAgICAgIHZhciBtaXNtYXRjaGVkID0ge307XG4gICAgICAgICAgICB2YXIgaGFzQ2F0ZWdvcnkgPSB7fTtcbiAgICAgICAgICAgIGFTZW50ZW5jZS5yV29yZHMuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICAgICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IDA7XG4gICAgICAgICAgICAgICAgaWYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgKytpbWF0Y2hlZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICsraW1pc21hdGNoZWQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAhPT0gXCJjYXRlZ29yeVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub3VzZSArPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaXNzaW5nY2F0ICs9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3VuZGNhdCArPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoYWJvdF9lcmJhc2VfNS5Xb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCkgJiYgcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhc0NhdGVnb3J5W29Xb3JkLm1hdGNoZWRTdHJpbmddID0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoIWFib3RfZXJiYXNlXzUuV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRPRE8gYmV0dGVyIHVubWFjaHRlZFxuICAgICAgICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdmFyIG1hdGNoZWREb21haW4gPSAwO1xuICAgICAgICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSBhU2VudGVuY2UucldvcmRzLmxlbmd0aDtcbiAgICAgICAgICAgIGlmIChhU2VudGVuY2UuZG9tYWlucy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVjb3JkLl9kb21haW4gIT09IGFTZW50ZW5jZS5kb21haW5zWzBdKSB7XG4gICAgICAgICAgICAgICAgICAgIGltaXNtYXRjaGVkID0gMzAwMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGltYXRjaGVkICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWREb21haW4gKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIkdPVCBBIERPTUFJTiBISVRcIiArIG1hdGNoZWQgKyBcIiBcIiArIG1pc21hdGNoZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBtYXRjaGVkTGVuID0gT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoICsgT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aDtcbiAgICAgICAgICAgIHZhciBtaXNtYXRjaGVkTGVuID0gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoO1xuICAgICAgICAgICAgaWYgKChpbWlzbWF0Y2hlZCA8IDMwMDApXG4gICAgICAgICAgICAgICAgJiYgKChtYXRjaGVkTGVuID4gbWlzbWF0Y2hlZExlbilcbiAgICAgICAgICAgICAgICAgICAgfHwgKG1hdGNoZWRMZW4gPT09IG1pc21hdGNoZWRMZW4gJiYgbWF0Y2hlZERvbWFpbiA+IDApKSkge1xuICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcImFkZGluZyBcIiArIGV4dHJhY3RSZXN1bHQoY2F0ZWdvcmllcyxyZWNvcmQpLmpvaW4oXCI7XCIpKTtcbiAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKFwid2l0aCByYW5raW5nIDogXCIgKyBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5MihtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcywgbWF0Y2hlZERvbWFpbikpO1xuICAgICAgICAgICAgICAgICAgZGVidWdsb2coXCIgY3JlYXRlZCBieSBcIiArIE9iamVjdC5rZXlzKG1hdGNoZWQpLm1hcChrZXkgPT4gXCJrZXk6XCIgKyBrZXlcbiAgICAgICAgICAgICAgICAgICsgXCJcXG5cIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRba2V5XSkpLmpvaW4oXCJcXG5cIilcbiAgICAgICAgICAgICAgICAgICsgXCJcXG5oYXNDYXQgXCIgKyBKU09OLnN0cmluZ2lmeShoYXNDYXRlZ29yeSlcbiAgICAgICAgICAgICAgICAgICsgXCJcXG5taXNtYXQgXCIgKyBKU09OLnN0cmluZ2lmeShtaXNtYXRjaGVkKVxuICAgICAgICAgICAgICAgICAgKyBcIlxcbmNuVHJlbCBcIiArIEpTT04uc3RyaW5naWZ5KGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgICAgICAgICArIFwiXFxubWF0Y2VkRG9tYWluIFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZERvbWFpbilcbiAgICAgICAgICAgICAgICAgICsgXCJcXG5oYXNDYXQgXCIgKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSlcbiAgICAgICAgICAgICAgICAgICsgXCJcXG5taXNtYXQgXCIgKyBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKVxuICAgICAgICAgICAgICAgICAgKyBgXFxubWF0Y2hlZCAke09iamVjdC5rZXlzKG1hdGNoZWQpfSBcXG5oYXNjYXQgJHtPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkuam9pbihcIjsgXCIpfSBcXG5taXNtOiAke09iamVjdC5rZXlzKG1pc21hdGNoZWQpfSBcXG5gXG4gICAgICAgICAgICAgICAgICArIFwiXFxubWF0Y2VkRG9tYWluIFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZERvbWFpbilcbiAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHZhciByZWMgPSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2Uub1NlbnRlbmNlLFxuICAgICAgICAgICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcmllczogY2F0ZWdvcmllcyxcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiBleHRyYWN0UmVzdWx0KGNhdGVnb3JpZXMsIHJlY29yZCksXG4gICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzLCBtYXRjaGVkRG9tYWluKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcImhlcmUgcmFua2luZ1wiICsgcmVjLl9yYW5raW5nKVxuICAgICAgICAgICAgICAgIGlmICgocmVjLl9yYW5raW5nID09PSBudWxsKSB8fCAhcmVjLl9yYW5raW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlYy5fcmFua2luZyA9IDAuOTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzLnB1c2gocmVjKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcGVyZmxvZyhcInNvcnQgKGE9XCIgKyByZXMubGVuZ3RoICsgXCIpXCIpO1xuICAgIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbCk7XG4gICAgcGVyZmxvZyhcIk1SUU1DIGZpbHRlclJldGFpbiAuLi5cIik7XG4gICAgdmFyIHJlc3VsdDEgPSBPYmplY3QuYXNzaWduKHsgdHVwZWxhbnN3ZXJzOiByZXMgfSwgcFNlbnRlbmNlcyk7XG4gICAgLypkZWJ1Z2xvZyhcIk5FV01BUFwiICsgcmVzLm1hcChvID0+IFwiXFxucmFua1wiICsgby5fcmFua2luZyArIFwiID0+XCJcbiAgICAgICAgICAgICAgICArIG8ucmVzdWx0LmpvaW4oXCJcXG5cIikpLmpvaW4oXCJcXG5cIikpOyAqL1xuICAgIHZhciByZXN1bHQyID0gZmlsdGVyRGlzdGluY3RSZXN1bHRBbmRTb3J0VHVwZWwocmVzdWx0MSk7XG4gICAgcGVyZmxvZyhcIk1SUU1DIG1hdGNoUmVjb3Jkc1F1aWNrIGRvbmU6IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBhPVwiICsgcmVzLmxlbmd0aCArIFwiKVwiKTtcbiAgICByZXR1cm4gcmVzdWx0Mjtcbn1cbmV4cG9ydHMubWF0Y2hSZWNvcmRzUXVpY2tNdWx0aXBsZUNhdGVnb3JpZXMgPSBtYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcztcbmZ1bmN0aW9uIGNsYXNzaWZ5V29yZFdpdGhUYXJnZXRDYXRlZ29yeSh3b3JkLCB0YXJnZXRjYXRlZ29yeSwgcnVsZXMsIHdob2xlc2VudGVuY2UpIHtcbiAgICAvL2NvbnNvbGUubG9nKFwiY2xhc3NpZnkgXCIgKyB3b3JkICsgXCIgXCIgICsgdGFyZ2V0Y2F0ZWdvcnkpO1xuICAgIHZhciBjYXRzID0gYWJvdF9lcmJhc2VfMS5JbnB1dEZpbHRlci5jYXRlZ29yaXplQVdvcmQod29yZCwgcnVsZXMsIHdob2xlc2VudGVuY2UsIHt9KTtcbiAgICAvLyBUT0RPIHF1YWxpZnlcbiAgICBjYXRzID0gY2F0cy5maWx0ZXIoZnVuY3Rpb24gKGNhdCkge1xuICAgICAgICByZXR1cm4gY2F0LmNhdGVnb3J5ID09PSB0YXJnZXRjYXRlZ29yeTtcbiAgICB9KTtcbiAgICAvL2RlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGNhdHMpKTtcbiAgICBpZiAoY2F0cy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGNhdHNbMF0ubWF0Y2hlZFN0cmluZztcbiAgICB9XG59XG5mdW5jdGlvbiBhbmFseXplQ2F0ZWdvcnkoY2F0ZWdvcnl3b3JkLCBydWxlcywgd2hvbGVzZW50ZW5jZSkge1xuICAgIHJldHVybiBjbGFzc2lmeVdvcmRXaXRoVGFyZ2V0Q2F0ZWdvcnkoY2F0ZWdvcnl3b3JkLCAnY2F0ZWdvcnknLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG59XG5leHBvcnRzLmFuYWx5emVDYXRlZ29yeSA9IGFuYWx5emVDYXRlZ29yeTtcbmZ1bmN0aW9uIHNwbGl0QXRDb21tYUFuZChzdHIpIHtcbiAgICB2YXIgciA9IHN0ci5zcGxpdCgvKFxcYmFuZFxcYil8WyxdLyk7XG4gICAgciA9IHIuZmlsdGVyKGZ1bmN0aW9uIChvLCBpbmRleCkge1xuICAgICAgICBpZiAoaW5kZXggJSAyID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIHZhciBydHJpbW1lZCA9IHIubWFwKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgIHJldHVybiBuZXcgU3RyaW5nKG8pLnRyaW0oKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcnRyaW1tZWQ7XG59XG5leHBvcnRzLnNwbGl0QXRDb21tYUFuZCA9IHNwbGl0QXRDb21tYUFuZDtcbi8qKlxuICogQSBzaW1wbGUgaW1wbGVtZW50YXRpb24sIHNwbGl0dGluZyBhdCBhbmQgYW5kICxcbiAqL1xuZnVuY3Rpb24gYW5hbHl6ZUNhdGVnb3J5TXVsdE9ubHlBbmRDb21tYShjYXRlZ29yeWxpc3QsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlKSB7XG4gICAgdmFyIHJ0cmltbWVkID0gc3BsaXRBdENvbW1hQW5kKGNhdGVnb3J5bGlzdCk7XG4gICAgdmFyIHJjYXQgPSBydHJpbW1lZC5tYXAoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgcmV0dXJuIGFuYWx5emVDYXRlZ29yeShvLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG4gICAgfSk7XG4gICAgaWYgKHJjYXQuaW5kZXhPZih1bmRlZmluZWQpID49IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdcIicgKyBydHJpbW1lZFtyY2F0LmluZGV4T2YodW5kZWZpbmVkKV0gKyAnXCIgaXMgbm90IGEgY2F0ZWdvcnkhJyk7XG4gICAgfVxuICAgIHJldHVybiByY2F0O1xufVxuZXhwb3J0cy5hbmFseXplQ2F0ZWdvcnlNdWx0T25seUFuZENvbW1hID0gYW5hbHl6ZUNhdGVnb3J5TXVsdE9ubHlBbmRDb21tYTtcbmZ1bmN0aW9uIGZpbHRlckFjY2VwdGluZ09ubHkocmVzLCBjYXRlZ29yaWVzKSB7XG4gICAgcmV0dXJuIHJlcy5maWx0ZXIoZnVuY3Rpb24gKGFTZW50ZW5jZSwgaUluZGV4KSB7XG4gICAgICAgIHJldHVybiBhU2VudGVuY2UuZXZlcnkoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgICByZXR1cm4gY2F0ZWdvcmllcy5pbmRleE9mKG9Xb3JkLmNhdGVnb3J5KSA+PSAwO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn1cbmV4cG9ydHMuZmlsdGVyQWNjZXB0aW5nT25seSA9IGZpbHRlckFjY2VwdGluZ09ubHk7XG5mdW5jdGlvbiBwcm9jZXNzU3RyaW5nKHF1ZXJ5LCBydWxlcykge1xuICAgIC8vICBpZiAoIXByb2Nlc3MuZW52LkFCT1RfT0xETUFUQ0gpIHtcbiAgICByZXR1cm4gYWJvdF9lcmJhc2VfMy5FckJhc2UucHJvY2Vzc1N0cmluZyhxdWVyeSwgcnVsZXMsIHJ1bGVzLndvcmRDYWNoZSk7XG4gICAgLy8gIH1cbiAgICAvKlxuICAgICAgdmFyIG1hdGNoZWQgPSBJbnB1dEZpbHRlci5hbmFseXplU3RyaW5nKHF1ZXJ5LCBydWxlcywgc1dvcmRzKTtcbiAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiQWZ0ZXIgbWF0Y2hlZCBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWQpKTtcbiAgICAgIH1cbiAgICAgIHZhciBhU2VudGVuY2VzID0gSW5wdXRGaWx0ZXIuZXhwYW5kTWF0Y2hBcnIobWF0Y2hlZCk7XG4gICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcImFmdGVyIGV4cGFuZFwiICsgYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgICAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgICAgIH1cbiAgICAgIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IElucHV0RmlsdGVyLnJlaW5Gb3JjZShhU2VudGVuY2VzKTtcbiAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiYWZ0ZXIgcmVpbmZvcmNlXCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgICAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGVycm9yczogW10sXG4gICAgICAgIHNlbnRlbmNlczogYVNlbnRlbmNlc1JlaW5mb3JjZWRcbiAgICAgIH0gYXMgSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXM7XG4gICAgKi9cbn1cbmV4cG9ydHMucHJvY2Vzc1N0cmluZyA9IHByb2Nlc3NTdHJpbmc7XG5mdW5jdGlvbiBhbmFseXplQ29udGV4dFN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKSB7XG4gICAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gcHJvY2Vzc1N0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKTtcbiAgICAvLyB3ZSBsaW1pdCBhbmFseXNpcyB0byBuIHNlbnRlbmNlc1xuICAgIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcyA9IGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5zbGljZSgwLCBBbGdvbC5DdXRvZmZfU2VudGVuY2VzKTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcImFmdGVyIHJlaW5mb3JjZSBhbmQgY3V0b2ZmXCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubGVuZ3RoICsgXCJcXG5cIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICAgICAgcmV0dXJuIGFib3RfZXJiYXNlXzQuU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICAgICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgfVxuICAgIHJldHVybiBhU2VudGVuY2VzUmVpbmZvcmNlZDtcbn1cbmV4cG9ydHMuYW5hbHl6ZUNvbnRleHRTdHJpbmcgPSBhbmFseXplQ29udGV4dFN0cmluZztcbmZ1bmN0aW9uIGNtcEJ5TnJDYXRlZ29yaWVzQW5kU2FtZURvbWFpbihhLCBiKSB7XG4gICAgLy9jb25zb2xlLmxvZyhcImNvbXBhcmUgYVwiICsgYSArIFwiIGNudGIgXCIgKyBiKTtcbiAgICB2YXIgY250YSA9IGFib3RfZXJiYXNlXzQuU2VudGVuY2UuZ2V0RGlzdGluY3RDYXRlZ29yaWVzSW5TZW50ZW5jZShhKS5sZW5ndGg7XG4gICAgdmFyIGNudGIgPSBhYm90X2VyYmFzZV80LlNlbnRlbmNlLmdldERpc3RpbmN0Q2F0ZWdvcmllc0luU2VudGVuY2UoYikubGVuZ3RoO1xuICAgIC8qXG4gICAgICB2YXIgY250YSA9IGEucmVkdWNlKGZ1bmN0aW9uKHByZXYsIG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiBwcmV2ICsgKChvV29yZC5jYXRlZ29yeSA9PT0gXCJjYXRlZ29yeVwiKT8gMSA6IDApO1xuICAgICAgfSwwKTtcbiAgICAgIHZhciBjbnRiID0gYi5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgb1dvcmQpIHtcbiAgICAgICAgcmV0dXJuIHByZXYgKyAoKG9Xb3JkLmNhdGVnb3J5ID09PSBcImNhdGVnb3J5XCIpPyAxIDogMCk7XG4gICAgICB9LDApO1xuICAgICAvLyBjb25zb2xlLmxvZyhcImNudCBhXCIgKyBjbnRhICsgXCIgY250YiBcIiArIGNudGIpO1xuICAgICAqL1xuICAgIHJldHVybiBjbnRiIC0gY250YTtcbn1cbmV4cG9ydHMuY21wQnlOckNhdGVnb3JpZXNBbmRTYW1lRG9tYWluID0gY21wQnlOckNhdGVnb3JpZXNBbmRTYW1lRG9tYWluO1xuZnVuY3Rpb24gYW5hbHl6ZUNhdGVnb3J5TXVsdChjYXRlZ29yeWxpc3QsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlLCBnV29yZHMpIHtcbiAgICB2YXIgcmVzID0gYW5hbHl6ZUNvbnRleHRTdHJpbmcoY2F0ZWdvcnlsaXN0LCBydWxlcyk7XG4gICAgLy8gIGRlYnVnbG9nKFwicmVzdWx0aW5nIGNhdGVnb3J5IHNlbnRlbmNlc1wiLCBKU09OLnN0cmluZ2lmeShyZXMpKTtcbiAgICB2YXIgcmVzMiA9IGZpbHRlckFjY2VwdGluZ09ubHkocmVzLnNlbnRlbmNlcywgW1wiY2F0ZWdvcnlcIiwgXCJmaWxsZXJcIl0pO1xuICAgIC8vICBjb25zb2xlLmxvZyhcImhlcmUgcmVzMlwiICsgSlNPTi5zdHJpbmdpZnkocmVzMikgKTtcbiAgICAvLyAgY29uc29sZS5sb2coXCJoZXJlIHVuZGVmaW5lZCAhICsgXCIgKyByZXMyLmZpbHRlcihvID0+ICFvKS5sZW5ndGgpO1xuICAgIHJlczIuc29ydChhYm90X2VyYmFzZV80LlNlbnRlbmNlLmNtcFJhbmtpbmdQcm9kdWN0KTtcbiAgICBkZWJ1Z2xvZyhcInJlc3VsdGluZyBjYXRlZ29yeSBzZW50ZW5jZXM6IFxcblwiLCBkZWJ1Z2xvZy5lbmFibGVkID8gKGFib3RfZXJiYXNlXzQuU2VudGVuY2UuZHVtcE5pY2VBcnIocmVzMi5zbGljZSgwLCAzKSwgYWJvdF9lcmJhc2VfNC5TZW50ZW5jZS5yYW5raW5nUHJvZHVjdCkpIDogJy0nKTtcbiAgICAvLyBUT0RPOiAgIHJlczIgPSBmaWx0ZXJBY2NlcHRpbmdPbmx5U2FtZURvbWFpbihyZXMyKTtcbiAgICAvL2RlYnVnbG9nKFwicmVzdWx0aW5nIGNhdGVnb3J5IHNlbnRlbmNlc1wiLCBKU09OLnN0cmluZ2lmeShyZXMyLCB1bmRlZmluZWQsIDIpKTtcbiAgICAvLyBleHBlY3Qgb25seSBjYXRlZ29yaWVzXG4gICAgLy8gd2UgY291bGQgcmFuayBub3cgYnkgY29tbW9uIGRvbWFpbnMgLCBidXQgZm9yIG5vdyB3ZSBvbmx5IHRha2UgdGhlIGZpcnN0IG9uZVxuICAgIGlmICghcmVzMi5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgLy9yZXMuc29ydChjbXBCeU5yQ2F0ZWdvcmllc0FuZFNhbWVEb21haW4pO1xuICAgIHZhciByZXNjYXQgPSBhYm90X2VyYmFzZV80LlNlbnRlbmNlLmdldERpc3RpbmN0Q2F0ZWdvcmllc0luU2VudGVuY2UocmVzMlswXSk7XG4gICAgcmV0dXJuIHJlc2NhdDtcbiAgICAvLyBcIlwiIHJldHVybiByZXNbMF0uZmlsdGVyKClcbiAgICAvLyByZXR1cm4gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KGNhdGVnb3J5bGlzdCwgJ2NhdGVnb3J5JywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xufVxuZXhwb3J0cy5hbmFseXplQ2F0ZWdvcnlNdWx0ID0gYW5hbHl6ZUNhdGVnb3J5TXVsdDtcbmZ1bmN0aW9uIGFuYWx5emVPcGVyYXRvcihvcHdvcmQsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlKSB7XG4gICAgcmV0dXJuIGNsYXNzaWZ5V29yZFdpdGhUYXJnZXRDYXRlZ29yeShvcHdvcmQsICdvcGVyYXRvcicsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlKTtcbn1cbmV4cG9ydHMuYW5hbHl6ZU9wZXJhdG9yID0gYW5hbHl6ZU9wZXJhdG9yO1xuY29uc3QgTGlzdEFsbCA9IHJlcXVpcmUoXCIuL2xpc3RhbGxcIik7XG4vLyBjb25zdCByZXN1bHQgPSBXaGF0SXMucmVzb2x2ZUNhdGVnb3J5KGNhdCwgYTEuZW50aXR5LFxuLy8gICB0aGVNb2RlbC5tUnVsZXMsIHRoZU1vZGVsLnRvb2xzLCB0aGVNb2RlbC5yZWNvcmRzKTtcbmZ1bmN0aW9uIHJlc29sdmVDYXRlZ29yeShjYXRlZ29yeSwgY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcywgcmVjb3Jkcykge1xuICAgIGlmIChjb250ZXh0UXVlcnlTdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB7IGVycm9yczogW2Fib3RfZXJiYXNlXzIuRXJFcnJvci5tYWtlRXJyb3JfRU1QVFlfSU5QVVQoKV0sIHRva2VuczogW10sIGFuc3dlcnM6IFtdIH07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICAvKlxuICAgICAgICAgICAgdmFyIG1hdGNoZWQgPSBJbnB1dEZpbHRlci5hbmFseXplU3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMpO1xuICAgICAgICAgICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImFmdGVyIG1hdGNoZWQgXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkKSk6ICctJyk7XG4gICAgICAgICAgICB2YXIgYVNlbnRlbmNlcyA9IElucHV0RmlsdGVyLmV4cGFuZE1hdGNoQXJyKG1hdGNoZWQpO1xuICAgICAgICAgICAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgICBkZWJ1Z2xvZyhcImFmdGVyIGV4cGFuZFwiICsgYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgICAgICAgICAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgICAgICAgICB9ICovXG4gICAgICAgIC8vIHZhciBjYXRlZ29yeVNldCA9IE1vZGVsLmdldEFsbFJlY29yZENhdGVnb3JpZXNGb3JUYXJnZXRDYXRlZ29yeSh0aGVNb2RlbCwgY2F0LCB0cnVlKTtcbiAgICAgICAgdmFyIHJlcyA9IExpc3RBbGwubGlzdEFsbFdpdGhDb250ZXh0KGNhdGVnb3J5LCBjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzLCByZWNvcmRzKTtcbiAgICAgICAgLy8qIHNvcnQgYnkgc2VudGVuY2VcbiAgICAgICAgcmVzLmFuc3dlcnMuZm9yRWFjaChvID0+IHsgby5fcmFua2luZyA9IG8uX3JhbmtpbmcgKiBhYm90X2VyYmFzZV80LlNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG8uc2VudGVuY2UpOyB9KTtcbiAgICAgICAgcmVzLmFuc3dlcnMuc29ydChjbXBCeVJhbmtpbmcpO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICAvKlxuICAgICAgICAgICAgLy8gPz8/IHZhciByZXMgPSBMaXN0QWxsLmxpc3RBbGxIYXZpbmdDb250ZXh0KGNhdGVnb3J5LCBjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzLCByZWNvcmRzKTtcbiAgICAgICAgXHJcbiAgICAgICAgICAgIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IHByb2Nlc3NTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcyk7XG4gICAgICAgICAgICAvL2FTZW50ZW5jZXMubWFwKGZ1bmN0aW9uKG9TZW50ZW5jZSkgeyByZXR1cm4gSW5wdXRGaWx0ZXIucmVpbkZvcmNlKG9TZW50ZW5jZSk7IH0pO1xuICAgICAgICAgICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImFmdGVyIHJlaW5mb3JjZVwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgICAgICAgICAgfSkuam9pbihcIlxcblwiKSkgOiAnLScpO1xuICAgICAgICAgICAgdmFyIG1hdGNoZWRBbnN3ZXJzID0gbWF0Y2hSZWNvcmRzKGFTZW50ZW5jZXNSZWluZm9yY2VkLCBjYXRlZ29yeSwgcmVjb3Jkcyk7IC8vYVRvb2w6IEFycmF5PElNYXRjaC5JVG9vbD4pOiBhbnkgLyAqIG9iamVjdHN0cmVhbSogLyB7XG4gICAgICAgICAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiIG1hdGNoZWRBbnN3ZXJzXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkQW5zd2VycywgdW5kZWZpbmVkLCAyKSkgOiAnLScpO1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoZWRBbnN3ZXJzO1xuICAgICAgICAqL1xuICAgIH1cbn1cbmV4cG9ydHMucmVzb2x2ZUNhdGVnb3J5ID0gcmVzb2x2ZUNhdGVnb3J5O1xuLypcbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlQ2F0ZWdvcnlPbGQoY2F0ZWdvcnk6IHN0cmluZywgY29udGV4dFF1ZXJ5U3RyaW5nOiBzdHJpbmcsXG4gIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+KTogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzIHtcbiAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4geyBlcnJvcnM6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSwgdG9rZW5zOiBbXSwgYW5zd2VyczogW10gfTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBwcm9jZXNzU3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMpO1xuICAgIC8vYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24ob1NlbnRlbmNlKSB7IHJldHVybiBJbnB1dEZpbHRlci5yZWluRm9yY2Uob1NlbnRlbmNlKTsgfSk7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImFmdGVyIHJlaW5mb3JjZVwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICB9KS5qb2luKFwiXFxuXCIpKSA6ICctJyk7XG4gICAgdmFyIG1hdGNoZWRBbnN3ZXJzID0gbWF0Y2hSZWNvcmRzKGFTZW50ZW5jZXNSZWluZm9yY2VkLCBjYXRlZ29yeSwgcmVjb3Jkcyk7IC8vYVRvb2w6IEFycmF5PElNYXRjaC5JVG9vbD4pOiBhbnkgLyAqIG9iamVjdHN0cmVhbSogLyB7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcIiBtYXRjaGVkQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMsIHVuZGVmaW5lZCwgMikpIDogJy0nKTtcbiAgICByZXR1cm4gbWF0Y2hlZEFuc3dlcnM7XG4gIH1cbn1cbiovXG5mdW5jdGlvbiByZXNvbHZlQ2F0ZWdvcmllcyhjYXRlZ29yaWVzLCBjb250ZXh0UXVlcnlTdHJpbmcsIHRoZU1vZGVsLCBkb21haW5DYXRlZ29yeUZpbHRlcikge1xuICAgIHZhciByZWNvcmRzID0gdGhlTW9kZWwucmVjb3JkcztcbiAgICB2YXIgcnVsZXMgPSB0aGVNb2RlbC5ydWxlcztcbiAgICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZXJyb3JzOiBbYWJvdF9lcmJhc2VfMi5FckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSxcbiAgICAgICAgICAgIHR1cGVsYW5zd2VyczogW10sXG4gICAgICAgICAgICB0b2tlbnM6IFtdXG4gICAgICAgIH07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICAvLyB2YXIgY2F0ZWdvcnlTZXQgPSBNb2RlbC5nZXRBbGxSZWNvcmRDYXRlZ29yaWVzRm9yVGFyZ2V0Q2F0ZWdvcnkodGhlTW9kZWwsIGNhdCwgdHJ1ZSk7XG4gICAgICAgIHZhciByZXMgPSBMaXN0QWxsLmxpc3RBbGxUdXBlbFdpdGhDb250ZXh0KGNhdGVnb3JpZXMsIGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMsIHJlY29yZHMsIGRvbWFpbkNhdGVnb3J5RmlsdGVyKTtcbiAgICAgICAgLy8qIHNvcnQgYnkgc2VudGVuY2VcbiAgICAgICAgcmVzLnR1cGVsYW5zd2Vycy5mb3JFYWNoKG8gPT4geyBvLl9yYW5raW5nID0gby5fcmFua2luZyAqIGFib3RfZXJiYXNlXzQuU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qoby5zZW50ZW5jZSk7IH0pO1xuICAgICAgICByZXMudHVwZWxhbnN3ZXJzLnNvcnQoY21wQnlSYW5raW5nVHVwZWwpO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cbn1cbmV4cG9ydHMucmVzb2x2ZUNhdGVnb3JpZXMgPSByZXNvbHZlQ2F0ZWdvcmllcztcbmZ1bmN0aW9uIGlzSW5kaXNjcmltaW5hdGVSZXN1bHQocmVzdWx0cykge1xuICAgIHZhciBjbnQgPSByZXN1bHRzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgcmVzdWx0KSB7XG4gICAgICAgIGlmIChzYWZlRXF1YWwocmVzdWx0Ll9yYW5raW5nLCByZXN1bHRzWzBdLl9yYW5raW5nKSkge1xuICAgICAgICAgICAgcmV0dXJuIHByZXYgKyAxO1xuICAgICAgICB9XG4gICAgfSwgMCk7XG4gICAgaWYgKGNudCA+IDEpIHtcbiAgICAgICAgLy8gc2VhcmNoIGZvciBhIGRpc2NyaW1pbmF0aW5nIGNhdGVnb3J5IHZhbHVlXG4gICAgICAgIHZhciBkaXNjcmltaW5hdGluZyA9IE9iamVjdC5rZXlzKHJlc3VsdHNbMF0ucmVjb3JkKS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGNhdGVnb3J5KSB7XG4gICAgICAgICAgICBpZiAoKGNhdGVnb3J5LmNoYXJBdCgwKSAhPT0gJ18nICYmIGNhdGVnb3J5ICE9PSByZXN1bHRzWzBdLmNhdGVnb3J5KVxuICAgICAgICAgICAgICAgICYmIChyZXN1bHRzWzBdLnJlY29yZFtjYXRlZ29yeV0gIT09IHJlc3VsdHNbMV0ucmVjb3JkW2NhdGVnb3J5XSkpIHtcbiAgICAgICAgICAgICAgICBwcmV2LnB1c2goY2F0ZWdvcnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgICAgIH0sIFtdKTtcbiAgICAgICAgaWYgKGRpc2NyaW1pbmF0aW5nLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiTWFueSBjb21wYXJhYmxlIHJlc3VsdHMsIHBlcmhhcHMgeW91IHdhbnQgdG8gc3BlY2lmeSBhIGRpc2NyaW1pbmF0aW5nIFwiICsgZGlzY3JpbWluYXRpbmcuam9pbignLCcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnWW91ciBxdWVzdGlvbiBkb2VzIG5vdCBoYXZlIGEgc3BlY2lmaWMgYW5zd2VyJztcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbmV4cG9ydHMuaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdCA9IGlzSW5kaXNjcmltaW5hdGVSZXN1bHQ7XG5mdW5jdGlvbiBpc0luZGlzY3JpbWluYXRlUmVzdWx0VHVwZWwocmVzdWx0cykge1xuICAgIHZhciBjbnQgPSByZXN1bHRzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgcmVzdWx0KSB7XG4gICAgICAgIGlmIChzYWZlRXF1YWwocmVzdWx0Ll9yYW5raW5nLCByZXN1bHRzWzBdLl9yYW5raW5nKSkge1xuICAgICAgICAgICAgcmV0dXJuIHByZXYgKyAxO1xuICAgICAgICB9XG4gICAgfSwgMCk7XG4gICAgaWYgKGNudCA+IDEpIHtcbiAgICAgICAgLy8gc2VhcmNoIGZvciBhIGRpc2NyaW1pbmF0aW5nIGNhdGVnb3J5IHZhbHVlXG4gICAgICAgIHZhciBkaXNjcmltaW5hdGluZyA9IE9iamVjdC5rZXlzKHJlc3VsdHNbMF0ucmVjb3JkKS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGNhdGVnb3J5KSB7XG4gICAgICAgICAgICBpZiAoKGNhdGVnb3J5LmNoYXJBdCgwKSAhPT0gJ18nICYmIHJlc3VsdHNbMF0uY2F0ZWdvcmllcy5pbmRleE9mKGNhdGVnb3J5KSA8IDApXG4gICAgICAgICAgICAgICAgJiYgKHJlc3VsdHNbMF0ucmVjb3JkW2NhdGVnb3J5XSAhPT0gcmVzdWx0c1sxXS5yZWNvcmRbY2F0ZWdvcnldKSkge1xuICAgICAgICAgICAgICAgIHByZXYucHVzaChjYXRlZ29yeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcHJldjtcbiAgICAgICAgfSwgW10pO1xuICAgICAgICBpZiAoZGlzY3JpbWluYXRpbmcubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJNYW55IGNvbXBhcmFibGUgcmVzdWx0cywgcGVyaGFwcyB5b3Ugd2FudCB0byBzcGVjaWZ5IGEgZGlzY3JpbWluYXRpbmcgXCIgKyBkaXNjcmltaW5hdGluZy5qb2luKCcsJykgKyAnIG9yIHVzZSBcImxpc3QgYWxsIC4uLlwiJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJ1lvdXIgcXVlc3Rpb24gZG9lcyBub3QgaGF2ZSBhIHNwZWNpZmljIGFuc3dlcic7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5leHBvcnRzLmlzSW5kaXNjcmltaW5hdGVSZXN1bHRUdXBlbCA9IGlzSW5kaXNjcmltaW5hdGVSZXN1bHRUdXBlbDtcbiIsIi8qKlxuICpcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmFuYWx5emVcbiAqIEBmaWxlIGFuYWx5emUudHNcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cbiAqL1xuXG5cbmltcG9ydCB7IElucHV0RmlsdGVyIGFzIElucHV0RmlsdGVyfSBmcm9tICdhYm90X2VyYmFzZSc7XG5cbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcblxudmFyIGRlYnVnbG9nID0gZGVidWcoJ3doYXRpcycpO1xudmFyIGRlYnVnbG9nViA9IGRlYnVnKCd3aGF0VmlzJyk7XG52YXIgcGVyZmxvZyA9IGRlYnVnKCdwZXJmJyk7XG5cblxuaW1wb3J0IHsgRXJFcnJvciBhcyBFckVycm9yfSBmcm9tICdhYm90X2VyYmFzZSc7XG5cbmltcG9ydCB7IEVyQmFzZSBhcyBFckJhc2V9IGZyb20gJ2Fib3RfZXJiYXNlJztcblxuXG5leHBvcnQgZnVuY3Rpb24gbW9ja0RlYnVnKG8pIHtcbiAgZGVidWdsb2cgPSBvO1xuICBkZWJ1Z2xvZ1YgPSBvO1xuICBwZXJmbG9nID0gbztcbn1cblxuXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5cbmltcG9ydCAqIGFzIElNYXRjaCBmcm9tICcuL2lmbWF0Y2gnO1xuXG5pbXBvcnQgKiBhcyBNYXRjaCBmcm9tICcuL21hdGNoJztcblxuaW1wb3J0ICogYXMgVG9vbG1hdGNoZXIgZnJvbSAnLi90b29sbWF0Y2hlcic7XG5cbmltcG9ydCB7IFNlbnRlbmNlIGFzIFNlbnRlbmNlfSBmcm9tICdhYm90X2VyYmFzZSc7XG5cbmltcG9ydCB7IFdvcmQgYXMgV29yZH0gIGZyb20gJ2Fib3RfZXJiYXNlJztcblxuaW1wb3J0ICogYXMgQWxnb2wgZnJvbSAnLi9hbGdvbCc7XG5cbmltcG9ydCB7TW9kZWwgYXMgTW9kZWx9ICBmcm9tICdmZGV2c3RhX21vbm1vdmUnO1xuXG5cblxuLypcbmV4cG9ydCBmdW5jdGlvbiBjbXBCeVJlc3VsdFRoZW5SYW5raW5nKGE6IElNYXRjaC5JV2hhdElzQW5zd2VyLCBiOiBJTWF0Y2guSVdoYXRJc0Fuc3dlcikge1xuICB2YXIgY21wID0gYS5yZXN1bHQubG9jYWxlQ29tcGFyZShiLnJlc3VsdCk7XG4gIGlmIChjbXApIHtcbiAgICByZXR1cm4gY21wO1xuICB9XG4gIHJldHVybiAtKGEuX3JhbmtpbmcgLSBiLl9yYW5raW5nKTtcbn1cbiovXG5cbmZ1bmN0aW9uIGxvY2FsZUNvbXBhcmVBcnJzKGFhcmVzdWx0OiBzdHJpbmdbXSwgYmJyZXN1bHQ6IHN0cmluZ1tdKTogbnVtYmVyIHtcbiAgdmFyIGNtcCA9IDA7XG4gIHZhciBibGVuID0gYmJyZXN1bHQubGVuZ3RoO1xuICBhYXJlc3VsdC5ldmVyeShmdW5jdGlvbiAoYSwgaW5kZXgpIHtcbiAgICBpZiAoYmxlbiA8PSBpbmRleCkge1xuICAgICAgY21wID0gLTE7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGNtcCA9IGEubG9jYWxlQ29tcGFyZShiYnJlc3VsdFtpbmRleF0pO1xuICAgIGlmIChjbXApIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0pO1xuICBpZiAoY21wKSB7XG4gICAgcmV0dXJuIGNtcDtcbiAgfVxuICBpZiAoYmxlbiA+IGFhcmVzdWx0Lmxlbmd0aCkge1xuICAgIGNtcCA9ICsxO1xuICB9XG4gIHJldHVybiAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2FmZUVxdWFsKGEgOiBudW1iZXIsIGIgOiBudW1iZXIpIDogYm9vbGVhbiB7XG4gIHZhciBkZWx0YSA9IGEgLSBiIDtcbiAgaWYoTWF0aC5hYnMoZGVsdGEpIDwgQWxnb2wuUkFOS0lOR19FUFNJTE9OKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2FmZURlbHRhKGEgOiBudW1iZXIsIGIgOiBudW1iZXIpIDogbnVtYmVyIHtcbiAgdmFyIGRlbHRhID0gYSAtIGIgO1xuICBpZihNYXRoLmFicyhkZWx0YSkgPCBBbGdvbC5SQU5LSU5HX0VQU0lMT04pIHtcbiAgICByZXR1cm4gMDtcbiAgfVxuICByZXR1cm4gZGVsdGE7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjbXBCeVJlc3VsdFRoZW5SYW5raW5nVHVwZWwoYWE6IElNYXRjaC5JV2hhdElzVHVwZWxBbnN3ZXIsIGJiOiBJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyKSB7XG4gIHZhciBjbXAgPSBsb2NhbGVDb21wYXJlQXJycyhhYS5yZXN1bHQsIGJiLnJlc3VsdCk7XG4gIGlmIChjbXApIHtcbiAgICByZXR1cm4gY21wO1xuICB9XG4gIHJldHVybiAtc2FmZURlbHRhKGFhLl9yYW5raW5nLGJiLl9yYW5raW5nKTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gY21wUmVjb3JkcyhhOiBJTWF0Y2guSVJlY29yZCwgYjogSU1hdGNoLklSZWNvcmQpIDogbnVtYmVyIHtcbi8vIGFyZSByZWNvcmRzIGRpZmZlcmVudD9cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhKS5jb25jYXQoT2JqZWN0LmtleXMoYikpLnNvcnQoKTtcbiAgdmFyIHJlcyA9IGtleXMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBzS2V5KSB7XG4gICAgaWYgKHByZXYpIHtcbiAgICAgIHJldHVybiBwcmV2O1xuICAgIH1cbiAgICBpZiAoYltzS2V5XSAhPT0gYVtzS2V5XSkge1xuICAgICAgaWYgKCFiW3NLZXldKSB7XG4gICAgICAgIHJldHVybiAtMTtcbiAgICAgIH1cbiAgICAgIGlmICghYVtzS2V5XSkge1xuICAgICAgICByZXR1cm4gKzE7XG4gICAgICB9XG4gICAgICByZXR1cm4gYVtzS2V5XS5sb2NhbGVDb21wYXJlKGJbc0tleV0pO1xuICAgIH1cbiAgICByZXR1cm4gMDtcbiAgfSwgMCk7XG4gIHJldHVybiByZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjbXBCeVJhbmtpbmcoYTogSU1hdGNoLklXaGF0SXNBbnN3ZXIsIGI6IElNYXRjaC5JV2hhdElzQW5zd2VyKSA6IG51bWJlciB7XG4gIHZhciBjbXAgPSAtIHNhZmVEZWx0YShhLl9yYW5raW5nLCBiLl9yYW5raW5nKSBhcyBudW1iZXI7XG4gIGlmIChjbXApIHtcbiAgICByZXR1cm4gY21wO1xuICB9XG4gIGNtcCA9IGEucmVzdWx0LmxvY2FsZUNvbXBhcmUoYi5yZXN1bHQpO1xuICBpZiAoY21wKSB7XG4gICAgcmV0dXJuIGNtcDtcbiAgfVxuXG4gIHJldHVybiBjbXBSZWNvcmRzKGEucmVjb3JkLGIucmVjb3JkKTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gY21wQnlSYW5raW5nVHVwZWwoYTogSU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlciwgYjogSU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlcikgOiBudW1iZXIge1xuICB2YXIgY21wID0gLSBzYWZlRGVsdGEoYS5fcmFua2luZywgYi5fcmFua2luZyk7XG4gIGlmIChjbXApIHtcbiAgICByZXR1cm4gY21wO1xuICB9XG4gIGNtcCA9IGxvY2FsZUNvbXBhcmVBcnJzKGEucmVzdWx0LCBiLnJlc3VsdCk7XG4gIGlmIChjbXApIHtcbiAgICByZXR1cm4gY21wO1xuICB9XG4gIHJldHVybiAgY21wUmVjb3JkcyhhLnJlY29yZCxiLnJlY29yZCk7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGR1bXBOaWNlKGFuc3dlcjogSU1hdGNoLklXaGF0SXNBbnN3ZXIpIHtcbiAgdmFyIHJlc3VsdCA9IHtcbiAgICBzOiBcIlwiLFxuICAgIHB1c2g6IGZ1bmN0aW9uIChzKSB7IHRoaXMucyA9IHRoaXMucyArIHM7IH1cbiAgfTtcbiAgdmFyIHMgPVxuICAgIGAqKlJlc3VsdCBmb3IgY2F0ZWdvcnk6ICR7YW5zd2VyLmNhdGVnb3J5fSBpcyAke2Fuc3dlci5yZXN1bHR9XG4gcmFuazogJHthbnN3ZXIuX3Jhbmtpbmd9XG5gO1xuICByZXN1bHQucHVzaChzKTtcbiAgT2JqZWN0LmtleXMoYW5zd2VyLnJlY29yZCkuZm9yRWFjaChmdW5jdGlvbiAoc1JlcXVpcmVzLCBpbmRleCkge1xuICAgIGlmIChzUmVxdWlyZXMuY2hhckF0KDApICE9PSAnXycpIHtcbiAgICAgIHJlc3VsdC5wdXNoKGByZWNvcmQ6ICR7c1JlcXVpcmVzfSAtPiAke2Fuc3dlci5yZWNvcmRbc1JlcXVpcmVzXX1gKTtcbiAgICB9XG4gICAgcmVzdWx0LnB1c2goJ1xcbicpO1xuICB9KTtcbiAgdmFyIG9TZW50ZW5jZSA9IGFuc3dlci5zZW50ZW5jZTtcbiAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpbmRleCkge1xuICAgIHZhciBzV29yZCA9IGBbJHtpbmRleH1dIDogJHtvV29yZC5jYXRlZ29yeX0gXCIke29Xb3JkLnN0cmluZ31cIiA9PiBcIiR7b1dvcmQubWF0Y2hlZFN0cmluZ31cImBcbiAgICByZXN1bHQucHVzaChzV29yZCArIFwiXFxuXCIpO1xuICB9KVxuICByZXN1bHQucHVzaChcIi5cXG5cIik7XG4gIHJldHVybiByZXN1bHQucztcbn1cbmV4cG9ydCBmdW5jdGlvbiBkdW1wTmljZVR1cGVsKGFuc3dlcjogSU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlcikge1xuICB2YXIgcmVzdWx0ID0ge1xuICAgIHM6IFwiXCIsXG4gICAgcHVzaDogZnVuY3Rpb24gKHMpIHsgdGhpcy5zID0gdGhpcy5zICsgczsgfVxuICB9O1xuICB2YXIgcyA9XG4gICAgYCoqUmVzdWx0IGZvciBjYXRlZ29yaWVzOiAke2Fuc3dlci5jYXRlZ29yaWVzLmpvaW4oXCI7XCIpfSBpcyAke2Fuc3dlci5yZXN1bHR9XG4gcmFuazogJHthbnN3ZXIuX3Jhbmtpbmd9XG5gO1xuICByZXN1bHQucHVzaChzKTtcbiAgT2JqZWN0LmtleXMoYW5zd2VyLnJlY29yZCkuZm9yRWFjaChmdW5jdGlvbiAoc1JlcXVpcmVzLCBpbmRleCkge1xuICAgIGlmIChzUmVxdWlyZXMuY2hhckF0KDApICE9PSAnXycpIHtcbiAgICAgIHJlc3VsdC5wdXNoKGByZWNvcmQ6ICR7c1JlcXVpcmVzfSAtPiAke2Fuc3dlci5yZWNvcmRbc1JlcXVpcmVzXX1gKTtcbiAgICB9XG4gICAgcmVzdWx0LnB1c2goJ1xcbicpO1xuICB9KTtcbiAgdmFyIG9TZW50ZW5jZSA9IGFuc3dlci5zZW50ZW5jZTtcbiAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpbmRleCkge1xuICAgIHZhciBzV29yZCA9IGBbJHtpbmRleH1dIDogJHtvV29yZC5jYXRlZ29yeX0gXCIke29Xb3JkLnN0cmluZ31cIiA9PiBcIiR7b1dvcmQubWF0Y2hlZFN0cmluZ31cImBcbiAgICByZXN1bHQucHVzaChzV29yZCArIFwiXFxuXCIpO1xuICB9KVxuICByZXN1bHQucHVzaChcIi5cXG5cIik7XG4gIHJldHVybiByZXN1bHQucztcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gZHVtcFdlaWdodHNUb3AodG9vbG1hdGNoZXM6IEFycmF5PElNYXRjaC5JV2hhdElzQW5zd2VyPiwgb3B0aW9uczogYW55KSB7XG4gIHZhciBzID0gJyc7XG4gIHRvb2xtYXRjaGVzLmZvckVhY2goZnVuY3Rpb24gKG9NYXRjaCwgaW5kZXgpIHtcbiAgICBpZiAoaW5kZXggPCBvcHRpb25zLnRvcCkge1xuICAgICAgcyA9IHMgKyBcIldoYXRJc0Fuc3dlcltcIiArIGluZGV4ICsgXCJdLi4uXFxuXCI7XG4gICAgICBzID0gcyArIGR1bXBOaWNlKG9NYXRjaCk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJEaXN0aW5jdFJlc3VsdEFuZFNvcnRUdXBlbChyZXM6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzVHVwZWxBbnN3ZXJzKTogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNUdXBlbEFuc3dlcnMge1xuICB2YXIgcmVzdWx0ID0gcmVzLnR1cGVsYW5zd2Vycy5maWx0ZXIoZnVuY3Rpb24gKGlSZXMsIGluZGV4KSB7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgIGRlYnVnbG9nKCcgcmV0YWluIHR1cGVsICcgKyBpbmRleCArICcgJyArIEpTT04uc3RyaW5naWZ5KGlSZXMpKTtcbiAgICB9XG4gICAgaWYgKF8uaXNFcXVhbChpUmVzLnJlc3VsdCwgcmVzLnR1cGVsYW5zd2Vyc1tpbmRleCAtIDFdICYmIHJlcy50dXBlbGFuc3dlcnNbaW5kZXggLSAxXS5yZXN1bHQpKSB7XG4gICAgICBkZWJ1Z2xvZygnc2tpcCcpO1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9KTtcbiAgcmVzdWx0LnNvcnQoY21wQnlSYW5raW5nVHVwZWwpO1xuICByZXR1cm4gT2JqZWN0LmFzc2lnbihyZXMsIHsgdHVwZWxhbnN3ZXJzOiByZXN1bHQgfSk7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlck9ubHlUb3BSYW5rZWQocmVzdWx0czogQXJyYXk8SU1hdGNoLklXaGF0SXNBbnN3ZXI+KTogQXJyYXk8SU1hdGNoLklXaGF0SXNBbnN3ZXI+IHtcbiAgdmFyIHJlcyA9IHJlc3VsdHMuZmlsdGVyKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICBpZiAoc2FmZUVxdWFsKHJlc3VsdC5fcmFua2luZywgcmVzdWx0c1swXS5fcmFua2luZykpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAocmVzdWx0Ll9yYW5raW5nID49IHJlc3VsdHNbMF0uX3JhbmtpbmcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkxpc3QgdG8gZmlsdGVyIG11c3QgYmUgb3JkZXJlZFwiKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbiAgcmV0dXJuIHJlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlck9ubHlUb3BSYW5rZWRUdXBlbChyZXN1bHRzOiBBcnJheTxJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyPik6IEFycmF5PElNYXRjaC5JV2hhdElzVHVwZWxBbnN3ZXI+IHtcbiAgdmFyIHJlcyA9IHJlc3VsdHMuZmlsdGVyKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICBpZiAoIHNhZmVFcXVhbChyZXN1bHQuX3JhbmtpbmcsIHJlc3VsdHNbMF0uX3JhbmtpbmcpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHJlc3VsdC5fcmFua2luZyA+PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJMaXN0IHRvIGZpbHRlciBtdXN0IGJlIG9yZGVyZWRcIik7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG4gIHJldHVybiByZXM7XG59XG5cblxuLyoqXG4gKiBBIHJhbmtpbmcgd2hpY2ggaXMgcHVyZWx5IGJhc2VkIG9uIHRoZSBudW1iZXJzIG9mIG1hdGNoZWQgZW50aXRpZXMsXG4gKiBkaXNyZWdhcmRpbmcgZXhhY3RuZXNzIG9mIG1hdGNoXG4gKi9cbi8qXG5leHBvcnQgZnVuY3Rpb24gY2FsY1JhbmtpbmdTaW1wbGUobWF0Y2hlZDogbnVtYmVyLFxuICBtaXNtYXRjaGVkOiBudW1iZXIsIG5vdXNlOiBudW1iZXIsXG4gIHJlbGV2YW50Q291bnQ6IG51bWJlcik6IG51bWJlciB7XG4gIC8vIDIgOiAwXG4gIC8vIDEgOiAwXG4gIHZhciBmYWN0b3IgPSBtYXRjaGVkICogTWF0aC5wb3coMS41LCBtYXRjaGVkKSAqIE1hdGgucG93KDEuNSwgbWF0Y2hlZCk7XG4gIHZhciBmYWN0b3IyID0gTWF0aC5wb3coMC40LCBtaXNtYXRjaGVkKTtcbiAgdmFyIGZhY3RvcjMgPSBNYXRoLnBvdygwLjQsIG5vdXNlKTtcbiAgcmV0dXJuIE1hdGgucG93KGZhY3RvcjIgKiBmYWN0b3IgKiBmYWN0b3IzLCAxIC8gKG1pc21hdGNoZWQgKyBtYXRjaGVkICsgbm91c2UpKTtcbn1cbiovXG5cbmV4cG9ydCBmdW5jdGlvbiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQ6IHsgW2tleTogc3RyaW5nXTogSU1hdGNoLklXb3JkIH0sXG4gIGhhc0NhdGVnb3J5OiB7IFtrZXk6IHN0cmluZ106IG51bWJlciB9LFxuICBtaXNtYXRjaGVkOiB7IFtrZXk6IHN0cmluZ106IElNYXRjaC5JV29yZCB9LCByZWxldmFudENvdW50OiBudW1iZXIsIGhhc0RvbWFpbiA6IG51bWJlcik6IG51bWJlciB7XG5cblxuICB2YXIgbGVuTWF0Y2hlZCA9IE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aDtcbiAgdmFyIGZhY3RvciA9IE1hdGNoLmNhbGNSYW5raW5nUHJvZHVjdChtYXRjaGVkKTtcbiAgZmFjdG9yICo9IE1hdGgucG93KDEuNSwgbGVuTWF0Y2hlZCk7XG4gIGlmKGhhc0RvbWFpbikge1xuICAgIGZhY3RvciAqPSAxLjU7XG4gIH1cbiAgdmFyIGxlbkhhc0NhdGVnb3J5ID0gT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aDtcbiAgdmFyIGZhY3RvckggPSBNYXRoLnBvdygxLjEsIGxlbkhhc0NhdGVnb3J5KTtcblxuICB2YXIgbGVuTWlzTWF0Y2hlZCA9IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aDtcbiAgdmFyIGZhY3RvcjIgPSBNYXRjaC5jYWxjUmFua2luZ1Byb2R1Y3QobWlzbWF0Y2hlZCk7XG4gIGZhY3RvcjIgKj0gTWF0aC5wb3coMC40LCBsZW5NaXNNYXRjaGVkKTtcbiAgdmFyIGRpdmlzb3IgPSAgKGxlbk1pc01hdGNoZWQgKyBsZW5IYXNDYXRlZ29yeSArIGxlbk1hdGNoZWQpO1xuICBkaXZpc29yID0gZGl2aXNvciA/IGRpdmlzb3IgOiAxO1xuICByZXR1cm4gTWF0aC5wb3coZmFjdG9yMiAqIGZhY3RvckggKiBmYWN0b3IsIDEgLyAoZGl2aXNvcikpO1xufVxuXG4vKipcbiAqIGxpc3QgYWxsIHRvcCBsZXZlbCByYW5raW5nc1xuICovXG4vKlxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVjb3Jkc0hhdmluZ0NvbnRleHQoXG4gIHBTZW50ZW5jZXM6IElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzLCBjYXRlZ29yeTogc3RyaW5nLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sXG4gIGNhdGVnb3J5U2V0OiB7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfSlcbiAgOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnMge1xuXG4gIC8vZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gIHZhciByZWxldmFudFJlY29yZHMgPSByZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAocmVjb3JkOiBJTWF0Y2guSVJlY29yZCkge1xuICAgIHJldHVybiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSAmJiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gbnVsbCk7XG4gIH0pO1xuICB2YXIgcmVzID0gW107XG4gIGRlYnVnbG9nKFwiTWF0Y2hSZWNvcmRzSGF2aW5nQ29udGV4dCA6IHJlbGV2YW50IHJlY29yZHMgbnI6XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoKTtcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcInNlbnRlbmNlcyBhcmUgOiBcIiArIEpTT04uc3RyaW5naWZ5KHBTZW50ZW5jZXMsIHVuZGVmaW5lZCwgMikpIDogXCItXCIpO1xuICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiY2F0ZWdvcnkgXCIgKyBjYXRlZ29yeSArIFwiIGFuZCBjYXRlZ29yeXNldCBpczogXCIgKyBKU09OLnN0cmluZ2lmeShjYXRlZ29yeVNldCwgdW5kZWZpbmVkLCAyKSkgOiBcIi1cIik7XG4gIGlmIChwcm9jZXNzLmVudi5BQk9UX0ZBU1QgJiYgY2F0ZWdvcnlTZXQpIHtcbiAgICAvLyB3ZSBhcmUgb25seSBpbnRlcmVzdGVkIGluIGNhdGVnb3JpZXMgcHJlc2VudCBpbiByZWNvcmRzIGZvciBkb21haW5zIHdoaWNoIGNvbnRhaW4gdGhlIGNhdGVnb3J5XG4gICAgLy8gdmFyIGNhdGVnb3J5c2V0ID0gTW9kZWwuY2FsY3VsYXRlUmVsZXZhbnRSZWNvcmRDYXRlZ29yaWVzKHRoZU1vZGVsLGNhdGVnb3J5KTtcbiAgICAvL2tub3dpbmcgdGhlIHRhcmdldFxuICAgIHBlcmZsb2coXCJnb3QgY2F0ZWdvcnlzZXQgd2l0aCBcIiArIE9iamVjdC5rZXlzKGNhdGVnb3J5U2V0KS5sZW5ndGgpO1xuICAgIHZhciBmbCA9IDA7XG4gICAgdmFyIGxmID0gMDtcbiAgICB2YXIgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBwU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgdmFyIGZXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICAgIH0pO1xuICAgICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiAhIWNhdGVnb3J5U2V0W29Xb3JkLmNhdGVnb3J5XSB8fCBXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCk7XG4gICAgICB9KTtcbiAgICAgIGZsID0gZmwgKyBvU2VudGVuY2UubGVuZ3RoO1xuICAgICAgbGYgPSBsZiArIHJXb3Jkcy5sZW5ndGg7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCwgLy8gbm90IGEgZmlsbGVyICAvLyB0byBiZSBjb21wYXRpYmxlIGl0IHdvdWxkIGJlIGZXb3Jkc1xuICAgICAgICByV29yZHM6IHJXb3Jkc1xuICAgICAgfTtcbiAgICB9KTtcbiAgICBPYmplY3QuZnJlZXplKGFTaW1wbGlmaWVkU2VudGVuY2VzKTtcbiAgICBkZWJ1Z2xvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgZmwgKyBcIi0+XCIgKyBsZiArIFwiKVwiKTtcbiAgICBwZXJmbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyBmbCArIFwiLT5cIiArIGxmICsgXCIpXCIpO1xuICAgIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgICB2YXIgaGFzQ2F0ZWdvcnkgPSB7fTtcbiAgICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSBhU2VudGVuY2UuY250UmVsZXZhbnRXb3JkcztcbiAgICAgICAgYVNlbnRlbmNlLnJXb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCkgJiYgcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICBoYXNDYXRlZ29yeVtvV29yZC5tYXRjaGVkU3RyaW5nXSA9IDE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIGlmICgoT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoICsgT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aCkgPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLm9TZW50ZW5jZSxcbiAgICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxuICAgICAgICAgICAgcmVzdWx0OiByZWNvcmRbY2F0ZWdvcnldLFxuICAgICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSk7XG4gICAgZGVidWdsb2coXCJoZXJlIGluIHdlaXJkXCIpO1xuICB9IGVsc2Uge1xuICAgIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgIHBTZW50ZW5jZXMuc2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgICB2YXIgaGFzQ2F0ZWdvcnkgPSB7fTtcbiAgICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSAwO1xuICAgICAgICBhU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICBpZiAoIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCkpIHtcbiAgICAgICAgICAgIGNudFJlbGV2YW50V29yZHMgPSBjbnRSZWxldmFudFdvcmRzICsgMTtcbiAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICAgIG1hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpICYmIHJlY29yZFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgICBoYXNDYXRlZ29yeVtvV29yZC5tYXRjaGVkU3RyaW5nXSA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKChPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoKSA+IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aCkge1xuICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2UsXG4gICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICAgIHJlc3VsdDogcmVjb3JkW2NhdGVnb3J5XSxcbiAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0pO1xuICB9XG4gIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmcpO1xuICBkZWJ1Z2xvZyhcIiBhZnRlciBzb3J0XCIgKyByZXMubGVuZ3RoKTtcbiAgdmFyIHJlc3VsdCA9IE9iamVjdC5hc3NpZ24oe30sIHBTZW50ZW5jZXMsIHsgYW5zd2VyczogcmVzIH0pO1xuICByZXR1cm4gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0KHJlc3VsdCk7XG59XG4qL1xuXG4vKlxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVjb3JkcyhhU2VudGVuY2VzOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcywgY2F0ZWdvcnk6IHN0cmluZywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+KVxuICA6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzQW5zd2VycyB7XG4gIC8vIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gIC8vICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gIC8vIH1cbiAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQ6IElNYXRjaC5JUmVjb3JkKSB7XG4gICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnldICE9PSBudWxsKTtcbiAgfSk7XG4gIHZhciByZXMgPSBbXTtcbiAgZGVidWdsb2coXCJyZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCk7XG4gIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICBhU2VudGVuY2VzLnNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgIHZhciBtaXNtYXRjaGVkID0ge31cbiAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IDA7XG4gICAgICBhU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgaWYgKCFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpKSB7XG4gICAgICAgICAgY250UmVsZXZhbnRXb3JkcyA9IGNudFJlbGV2YW50V29yZHMgKyAxO1xuICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGlmIChPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2UsXG4gICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxuICAgICAgICAgIHJlc3VsdDogcmVjb3JkW2NhdGVnb3J5XSxcbiAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmcobWF0Y2hlZCwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSlcbiAgfSk7XG4gIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmcpO1xuICB2YXIgcmVzdWx0ID0gT2JqZWN0LmFzc2lnbih7fSwgYVNlbnRlbmNlcywgeyBhbnN3ZXJzOiByZXMgfSk7XG4gIHJldHVybiBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHQocmVzdWx0KTtcbn1cbiovXG4vKlxuZnVuY3Rpb24gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXNDYXRlZ29yeVNldChhU2VudGVuY2VzOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcyxcbiAgY2F0ZWdvcnlTZXQ6IHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB9LCB0cmFjazogeyBmbDogbnVtYmVyLCBsZjogbnVtYmVyIH1cbik6IHtcbiAgZG9tYWluczogc3RyaW5nW10sXG4gIG9TZW50ZW5jZTogSU1hdGNoLklTZW50ZW5jZSxcbiAgY250UmVsZXZhbnRXb3JkczogbnVtYmVyLFxuICByV29yZHM6IElNYXRjaC5JV29yZFtdXG59W10ge1xuICByZXR1cm4gYVNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICB2YXIgYURvbWFpbnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJkb21haW5cIikge1xuICAgICAgICBhRG9tYWlucy5wdXNoKG9Xb3JkLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwibWV0YVwiKSB7XG4gICAgICAgIC8vIGUuZy4gZG9tYWluIFhYWFxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gISFjYXRlZ29yeVNldFtvV29yZC5jYXRlZ29yeV07XG4gICAgfSk7XG4gICAgdHJhY2suZmwgKz0gb1NlbnRlbmNlLmxlbmd0aDtcbiAgICB0cmFjay5sZiArPSByV29yZHMubGVuZ3RoO1xuICAgIHJldHVybiB7XG4gICAgICBkb21haW5zOiBhRG9tYWlucyxcbiAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCxcbiAgICAgIHJXb3JkczogcldvcmRzXG4gICAgfTtcbiAgfSk7XG59XG4qL1xuXG5mdW5jdGlvbiBtYWtlU2ltcGxpZmllZFNlbnRlbmNlc0NhdGVnb3J5U2V0MihhU2VudGVuY2VzOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcyxcbiAgY2F0ZWdvcnlTZXQ6IHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB9LCB0cmFjazogeyBmbDogbnVtYmVyLCBsZjogbnVtYmVyIH1cbik6IHtcbiAgZG9tYWluczogc3RyaW5nW10sXG4gIG9TZW50ZW5jZTogSU1hdGNoLklTZW50ZW5jZSxcbiAgY250UmVsZXZhbnRXb3JkczogbnVtYmVyLFxuICByV29yZHM6IElNYXRjaC5JV29yZFtdXG59W10ge1xuICByZXR1cm4gYVNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICB2YXIgYURvbWFpbnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJkb21haW5cIikge1xuICAgICAgICBhRG9tYWlucy5wdXNoKG9Xb3JkLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwibWV0YVwiKSB7XG4gICAgICAgIC8vIGUuZy4gZG9tYWluIFhYWFxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZihvV29yZC5jYXRlZ29yeSA9PT0gXCJjYXRlZ29yeVwiKSB7XG4gICAgICAgIGlmKGNhdGVnb3J5U2V0W29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiAhIWNhdGVnb3J5U2V0W29Xb3JkLmNhdGVnb3J5XTtcbiAgICB9KTtcbiAgICB0cmFjay5mbCArPSBvU2VudGVuY2UubGVuZ3RoO1xuICAgIHRyYWNrLmxmICs9IHJXb3Jkcy5sZW5ndGg7XG4gICAgcmV0dXJuIHtcbiAgICAgIGRvbWFpbnM6IGFEb21haW5zLFxuICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLFxuICAgICAgcldvcmRzOiByV29yZHNcbiAgICB9O1xuICB9KTtcbn1cblxuXG5mdW5jdGlvbiBtYWtlU2ltcGxpZmllZFNlbnRlbmNlcyhhU2VudGVuY2VzIDogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMsICB0cmFjazogeyBmbDogbnVtYmVyLCBsZjogbnVtYmVyIH0pOiB7XG4gIGRvbWFpbnM6IHN0cmluZ1tdLFxuICBvU2VudGVuY2U6IElNYXRjaC5JU2VudGVuY2UsXG4gIGNudFJlbGV2YW50V29yZHM6IG51bWJlcixcbiAgcldvcmRzOiBJTWF0Y2guSVdvcmRbXVxufVtdIHtcbiAgcmV0dXJuIGFTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgdmFyIGRvbWFpbnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJkb21haW5cIikge1xuICAgICAgICBkb21haW5zLnB1c2gob1dvcmQubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJtZXRhXCIpIHtcbiAgICAgICAgLy8gZS5nLiBkb21haW4gWFhYXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICB9KTtcbiAgICB0cmFjay5mbCArPSBvU2VudGVuY2UubGVuZ3RoO1xuICAgIHRyYWNrLmxmICs9IHJXb3Jkcy5sZW5ndGg7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgZG9tYWluczogZG9tYWlucyxcbiAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsXG4gICAgICByV29yZHM6IHJXb3Jkc1xuICAgIH07XG4gIH0pO1xufVxuXG5cbmZ1bmN0aW9uIGV4dHJhY3RSZXN1bHQoY2F0ZWdvcmllczogc3RyaW5nW10sIHJlY29yZDogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfSk6IHN0cmluZ1tdIHtcbiAgcmV0dXJuIGNhdGVnb3JpZXMubWFwKGZ1bmN0aW9uIChjYXRlZ29yeSkgeyByZXR1cm4gcmVjb3JkW2NhdGVnb3J5XSB8fCBcIm4vYVwiOyB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzKHBTZW50ZW5jZXM6IElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzLCBjYXRlZ29yaWVzOiBzdHJpbmdbXSwgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+LCBkb21haW5DYXRlZ29yeUZpbHRlcj86IElNYXRjaC5JRG9tYWluQ2F0ZWdvcnlGaWx0ZXIpXG4gIDogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNUdXBlbEFuc3dlcnMge1xuICAvLyBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAvLyAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gIC8vIH1cblxuICBpZihkb21haW5DYXRlZ29yeUZpbHRlciAmJiAhIGRvbWFpbkNhdGVnb3J5RmlsdGVyLmRvbWFpbnMgKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwib2xkIGNhdGVnb3J5c1NFdCA/P1wiKVxuICB9XG5cbiAgT2JqZWN0LmZyZWV6ZShkb21haW5DYXRlZ29yeUZpbHRlcik7XG4gIHZhciBjYXRlZ29yeUYgPSBjYXRlZ29yaWVzWzBdO1xuXG4gIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJtYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcyAocj1cIiArIChyZWNvcmRzICYmIHJlY29yZHMubGVuZ3RoKVxuICArIFwiIHM9XCIgKyAocFNlbnRlbmNlcyAmJiBwU2VudGVuY2VzLnNlbnRlbmNlcyAmJiBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGgpICsgXCIpXFxuIGNhdGVnb3JpZXM6XCIgKyhjYXRlZ29yaWVzICYmICBjYXRlZ29yaWVzLmpvaW4oXCJcXG5cIikpICsgXCIgY2F0ZWdvcnlTZXQ6IFwiXG4gICsgKCBkb21haW5DYXRlZ29yeUZpbHRlciAmJiAodHlwZW9mIGRvbWFpbkNhdGVnb3J5RmlsdGVyLmNhdGVnb3J5U2V0ID09PSBcIm9iamVjdFwiKSAmJiBPYmplY3Qua2V5cyhkb21haW5DYXRlZ29yeUZpbHRlci5jYXRlZ29yeVNldCkuam9pbihcIlxcblwiKSkpICA6IFwiLVwiKTtcbiAgcGVyZmxvZyhcIm1hdGNoUmVjb3Jkc1F1aWNrTXVsdCAuLi4ocj1cIiArIHJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiKVwiKTtcblxuICAvL2NvbnNvbGUubG9nKCdjYXRlZ29yaWVzICcgKyAgSlNPTi5zdHJpbmdpZnkoY2F0ZWdvcmllcykpO1xuXG4gIC8vY29uc29sZS5sb2coJ2NhdGVncm95U2V0JyArICBKU09OLnN0cmluZ2lmeShjYXRlZ29yeVNldCkpO1xuXG5cbiAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHM7XG5cbiAgaWYoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIgJiYgZG9tYWluQ2F0ZWdvcnlGaWx0ZXIuZG9tYWlucykge1xuICAgIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQ6IElNYXRjaC5JUmVjb3JkKSB7XG4gICAgICByZXR1cm4gKGRvbWFpbkNhdGVnb3J5RmlsdGVyLmRvbWFpbnMuaW5kZXhPZigocmVjb3JkIGFzIGFueSkuX2RvbWFpbikgPj0gMCk7XG4gICAgfSk7XG4gIH1cbiAgZWxzZSB7XG4gICAgcmVsZXZhbnRSZWNvcmRzID0gcmVsZXZhbnRSZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAocmVjb3JkOiBJTWF0Y2guSVJlY29yZCkge1xuICAgICAgcmV0dXJuICFjYXRlZ29yaWVzLmV2ZXJ5KGNhdCA9PlxuICAgICAgICAgICAgKHJlY29yZFtjYXRdID09PSB1bmRlZmluZWQpIHx8IChyZWNvcmRbY2F0XSA9PT0gbnVsbClcbiAgICAgICk7XG4gIC8vICAgICAgfVxuXG4gLy8gICAgIHJldHVybiAocmVjb3JkW2NhdGVnb3J5Rl0gIT09IHVuZGVmaW5lZCkgJiYgKHJlY29yZFtjYXRlZ29yeUZdICE9PSBudWxsKTtcbiAgICB9KTtcbiAgfVxuICB2YXIgcmVzID0gW10gYXMgQXJyYXk8SU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlcj47XG4gIGRlYnVnbG9nKFwicmVsZXZhbnQgcmVjb3JkcyB3aXRoIGZpcnN0IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiKVwiKTtcbiAgcGVyZmxvZyhcInJlbGV2YW50IHJlY29yZHMgd2l0aCBmaXJzdCBucjpcIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzZW50ZW5jZXMgXCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGgpO1xuICBpZiAoLypwcm9jZXNzLmVudi5BQk9UX0ZBU1QgJiYqLyBkb21haW5DYXRlZ29yeUZpbHRlcikge1xuICAgIC8vIHdlIGFyZSBvbmx5IGludGVyZXN0ZWQgaW4gY2F0ZWdvcmllcyBwcmVzZW50IGluIHJlY29yZHMgZm9yIGRvbWFpbnMgd2hpY2ggY29udGFpbiB0aGUgY2F0ZWdvcnlcbiAgICAvLyB2YXIgY2F0ZWdvcnlzZXQgPSBNb2RlbC5jYWxjdWxhdGVSZWxldmFudFJlY29yZENhdGVnb3JpZXModGhlTW9kZWwsY2F0ZWdvcnkpO1xuICAgIC8va25vd2luZyB0aGUgdGFyZ2V0XG4gICAgcGVyZmxvZyhcImdvdCBjYXRlZ29yeXNldCB3aXRoIFwiICsgT2JqZWN0LmtleXMoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIuY2F0ZWdvcnlTZXQpLmxlbmd0aCk7XG4gICAgdmFyIG9iaiA9IHsgZmw6IDAsIGxmOiAwIH07XG4gICAgdmFyIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gW10gYXMge1xuICAgICAgZG9tYWluczogc3RyaW5nW10sXG4gICAgICBvU2VudGVuY2U6IElNYXRjaC5JU2VudGVuY2UsXG4gICAgICBjbnRSZWxldmFudFdvcmRzOiBudW1iZXIsXG4gICAgICByV29yZHM6IElNYXRjaC5JV29yZFtdXG4gICAgfVtdO1xuICAvLyAgaWYgKHByb2Nlc3MuZW52LkFCT1RfQkVUMSkge1xuICAgICBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzQ2F0ZWdvcnlTZXQyKHBTZW50ZW5jZXMsIGRvbWFpbkNhdGVnb3J5RmlsdGVyLmNhdGVnb3J5U2V0LCBvYmopIGFzIGFueTtcbiAgLy8gIH0gZWxzZSB7XG4gIC8vICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXNDYXRlZ29yeVNldChwU2VudGVuY2VzLCBjYXRlZ29yeVNldCwgb2JqKSBhcyBhbnk7XG4gIC8vICB9XG4gICAgcGVyZmxvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgb2JqLmZsICsgXCItPlwiICsgb2JqLmxmICsgXCIpXCIpO1xuICB9IGVsc2Uge1xuICAgIGRlYnVnbG9nKFwibm90IGFib3RfZmFzdCAhXCIpO1xuICAgIHZhciB0cmFjayA9IHsgZmw6IDAgLCBsZiA6IDB9O1xuICAgIHZhciBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzKHBTZW50ZW5jZXMsdHJhY2spO1xuLypcbiAgICBwU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICAgIH0pO1xuICAgICAgZmwgPSBmbCArIG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgICBsZiA9IGxmICsgcldvcmRzLmxlbmd0aDtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLFxuICAgICAgICByV29yZHM6IHJXb3Jkc1xuICAgICAgfTtcbiAgICB9KTtcbiAgICAqL1xuICAgIGRlYnVnbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyB0cmFjay5mbCArIFwiLT5cIiArIHRyYWNrLmxmICsgXCIpXCIpO1xuICAgIHBlcmZsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIHRyYWNrLmZsICsgXCItPlwiICsgdHJhY2subGYgKyBcIilcIik7XG4gIH1cblxuICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiaGVyZSBzaW1wbGlmaWVkIHNlbnRlbmNlcyBcIiArXG4gIGFTaW1wbGlmaWVkU2VudGVuY2VzLm1hcChvID0+IFwiXFxuRG9tYWluPVwiICsgby5kb21haW5zLmpvaW4oXCJcXG5cIikgKyBcIlxcblwiICsgIFNlbnRlbmNlLmR1bXBOaWNlKG8ucldvcmRzKSkuam9pbihcIlxcblwiKSkgOiBcIi1cIik7XG5cbiAgLy9jb25zb2xlLmxvZyhcImhlcmUgcmVjcm9kc1wiICsgcmVsZXZhbnRSZWNvcmRzLm1hcCggKG8saW5kZXgpID0+ICBcIiBpbmRleCA9IFwiICsgaW5kZXggKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KG8pKS5qb2luKFwiXFxuXCIpKTtcbiAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgdmFyIGltaXNtYXRjaGVkID0gMDtcbiAgICAgIHZhciBpbWF0Y2hlZCA9IDA7XG4gICAgICB2YXIgbm91c2UgPSAwO1xuICAgICAgdmFyIGZvdW5kY2F0ID0gMTtcbiAgICAgIHZhciBtaXNzaW5nY2F0ID0gMDtcblxuICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgIHZhciBtaXNtYXRjaGVkID0ge307XG4gICAgICB2YXIgaGFzQ2F0ZWdvcnkgPSB7fTtcblxuICAgICAgYVNlbnRlbmNlLnJXb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IDA7XG4gICAgICAgIGlmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgKytpbWF0Y2hlZDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgKytpbWlzbWF0Y2hlZDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICE9PSBcImNhdGVnb3J5XCIpIHtcbiAgICAgICAgICAgIG5vdXNlICs9IDE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICghcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICAgIG1pc3NpbmdjYXQgKz0gMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGZvdW5kY2F0Kz0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICYmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCkgJiYgcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICBoYXNDYXRlZ29yeVtvV29yZC5tYXRjaGVkU3RyaW5nXSA9IDE7XG4gICAgICAgIH0gZWxzZSBpZighV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpKSB7XG4gICAgICAgICAgIC8vIFRPRE8gYmV0dGVyIHVubWFjaHRlZFxuICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB2YXIgbWF0Y2hlZERvbWFpbiA9IDA7XG4gICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IGFTZW50ZW5jZS5yV29yZHMubGVuZ3RoO1xuICAgICAgaWYgKGFTZW50ZW5jZS5kb21haW5zLmxlbmd0aCkge1xuICAgICAgICBpZiAoKHJlY29yZCBhcyBhbnkpLl9kb21haW4gIT09IGFTZW50ZW5jZS5kb21haW5zWzBdKSB7XG4gICAgICAgICAgaW1pc21hdGNoZWQgPSAzMDAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGltYXRjaGVkICs9IDE7XG4gICAgICAgICAgbWF0Y2hlZERvbWFpbiArPSAxO1xuICAgICAgICAgIC8vY29uc29sZS5sb2coXCJHT1QgQSBET01BSU4gSElUXCIgKyBtYXRjaGVkICsgXCIgXCIgKyBtaXNtYXRjaGVkKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdmFyIG1hdGNoZWRMZW4gPSBPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoO1xuICAgICAgdmFyIG1pc21hdGNoZWRMZW4gPSBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGg7XG4gICAgICBpZiAoKGltaXNtYXRjaGVkIDwgMzAwMClcbiAgICAgICAgJiYgKChtYXRjaGVkTGVuID4gbWlzbWF0Y2hlZExlbilcbiAgICAgICAgICB8fCAobWF0Y2hlZExlbiA9PT0gbWlzbWF0Y2hlZExlbiAmJiBtYXRjaGVkRG9tYWluID4gMCkpXG4gICAgICApIHtcbiAgICAgICAgLypcbiAgICAgICAgICBkZWJ1Z2xvZyhcImFkZGluZyBcIiArIGV4dHJhY3RSZXN1bHQoY2F0ZWdvcmllcyxyZWNvcmQpLmpvaW4oXCI7XCIpKTtcbiAgICAgICAgICBkZWJ1Z2xvZyhcIndpdGggcmFua2luZyA6IFwiICsgY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeTIobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMsIG1hdGNoZWREb21haW4pKTtcbiAgICAgICAgICBkZWJ1Z2xvZyhcIiBjcmVhdGVkIGJ5IFwiICsgT2JqZWN0LmtleXMobWF0Y2hlZCkubWFwKGtleSA9PiBcImtleTpcIiArIGtleVxuICAgICAgICAgICsgXCJcXG5cIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRba2V5XSkpLmpvaW4oXCJcXG5cIilcbiAgICAgICAgICArIFwiXFxuaGFzQ2F0IFwiICsgSlNPTi5zdHJpbmdpZnkoaGFzQ2F0ZWdvcnkpXG4gICAgICAgICAgKyBcIlxcbm1pc21hdCBcIiArIEpTT04uc3RyaW5naWZ5KG1pc21hdGNoZWQpXG4gICAgICAgICAgKyBcIlxcbmNuVHJlbCBcIiArIEpTT04uc3RyaW5naWZ5KGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgKyBcIlxcbm1hdGNlZERvbWFpbiBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWREb21haW4pXG4gICAgICAgICAgKyBcIlxcbmhhc0NhdCBcIiArIE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KVxuICAgICAgICAgICsgXCJcXG5taXNtYXQgXCIgKyBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKVxuICAgICAgICAgICsgYFxcbm1hdGNoZWQgJHtPYmplY3Qua2V5cyhtYXRjaGVkKX0gXFxuaGFzY2F0ICR7T2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmpvaW4oXCI7IFwiKX0gXFxubWlzbTogJHtPYmplY3Qua2V5cyhtaXNtYXRjaGVkKX0gXFxuYFxuICAgICAgICAgICsgXCJcXG5tYXRjZWREb21haW4gXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkRG9tYWluKVxuXG4gICAgICAgICAgKTtcbiAgICAgICAgICAqL1xuXG4gICAgICAgIHZhciByZWMgPSB7XG4gICAgICAgICAgc2VudGVuY2U6IGFTZW50ZW5jZS5vU2VudGVuY2UsXG4gICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgY2F0ZWdvcmllczogY2F0ZWdvcmllcyxcbiAgICAgICAgICByZXN1bHQ6IGV4dHJhY3RSZXN1bHQoY2F0ZWdvcmllcywgcmVjb3JkKSxcbiAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcywgbWF0Y2hlZERvbWFpbilcbiAgICAgICAgfTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImhlcmUgcmFua2luZ1wiICsgcmVjLl9yYW5raW5nKVxuICAgICAgICBpZiAoKHJlYy5fcmFua2luZyA9PT0gbnVsbCkgfHwgIXJlYy5fcmFua2luZykge1xuICAgICAgICAgIHJlYy5fcmFua2luZyA9IDAuOTtcbiAgICAgICAgfVxuICAgICAgICByZXMucHVzaChyZWMpO1xuICAgICAgfVxuICAgIH0pXG4gIH0pO1xuICBwZXJmbG9nKFwic29ydCAoYT1cIiArIHJlcy5sZW5ndGggKyBcIilcIik7XG4gIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbCk7XG4gIHBlcmZsb2coXCJNUlFNQyBmaWx0ZXJSZXRhaW4gLi4uXCIpO1xuICB2YXIgcmVzdWx0MSA9IE9iamVjdC5hc3NpZ24oeyB0dXBlbGFuc3dlcnM6IHJlcyB9LCBwU2VudGVuY2VzKTtcbiAgLypkZWJ1Z2xvZyhcIk5FV01BUFwiICsgcmVzLm1hcChvID0+IFwiXFxucmFua1wiICsgby5fcmFua2luZyArIFwiID0+XCJcbiAgICAgICAgICAgICAgKyBvLnJlc3VsdC5qb2luKFwiXFxuXCIpKS5qb2luKFwiXFxuXCIpKTsgKi9cbiAgdmFyIHJlc3VsdDIgPSBmaWx0ZXJEaXN0aW5jdFJlc3VsdEFuZFNvcnRUdXBlbChyZXN1bHQxKTtcbiAgcGVyZmxvZyhcIk1SUU1DIG1hdGNoUmVjb3Jkc1F1aWNrIGRvbmU6IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBhPVwiICsgcmVzLmxlbmd0aCArIFwiKVwiKTtcbiAgcmV0dXJuIHJlc3VsdDI7XG59XG5cblxuZnVuY3Rpb24gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KHdvcmQ6IHN0cmluZywgdGFyZ2V0Y2F0ZWdvcnk6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLFxuICB3aG9sZXNlbnRlbmNlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAvL2NvbnNvbGUubG9nKFwiY2xhc3NpZnkgXCIgKyB3b3JkICsgXCIgXCIgICsgdGFyZ2V0Y2F0ZWdvcnkpO1xuICB2YXIgY2F0cyA9IElucHV0RmlsdGVyLmNhdGVnb3JpemVBV29yZCh3b3JkLCBydWxlcywgd2hvbGVzZW50ZW5jZSwge30pO1xuICAvLyBUT0RPIHF1YWxpZnlcbiAgY2F0cyA9IGNhdHMuZmlsdGVyKGZ1bmN0aW9uIChjYXQpIHtcbiAgICByZXR1cm4gY2F0LmNhdGVnb3J5ID09PSB0YXJnZXRjYXRlZ29yeTtcbiAgfSlcbiAgLy9kZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShjYXRzKSk7XG4gIGlmIChjYXRzLmxlbmd0aCkge1xuICAgIHJldHVybiBjYXRzWzBdLm1hdGNoZWRTdHJpbmc7XG4gIH1cbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZUNhdGVnb3J5KGNhdGVnb3J5d29yZDogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHdob2xlc2VudGVuY2U6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBjbGFzc2lmeVdvcmRXaXRoVGFyZ2V0Q2F0ZWdvcnkoY2F0ZWdvcnl3b3JkLCAnY2F0ZWdvcnknLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzcGxpdEF0Q29tbWFBbmQoc3RyOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIHZhciByID0gc3RyLnNwbGl0KC8oXFxiYW5kXFxiKXxbLF0vKTtcbiAgciA9IHIuZmlsdGVyKGZ1bmN0aW9uIChvLCBpbmRleCkge1xuICAgIGlmIChpbmRleCAlIDIgPiAwKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9KTtcbiAgdmFyIHJ0cmltbWVkID0gci5tYXAoZnVuY3Rpb24gKG8pIHtcbiAgICByZXR1cm4gbmV3IFN0cmluZyhvKS50cmltKCk7XG4gIH0pO1xuICByZXR1cm4gcnRyaW1tZWQ7XG59XG4vKipcbiAqIEEgc2ltcGxlIGltcGxlbWVudGF0aW9uLCBzcGxpdHRpbmcgYXQgYW5kIGFuZCAsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhbmFseXplQ2F0ZWdvcnlNdWx0T25seUFuZENvbW1hKGNhdGVnb3J5bGlzdDogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHdob2xlc2VudGVuY2U6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgdmFyIHJ0cmltbWVkID0gc3BsaXRBdENvbW1hQW5kKGNhdGVnb3J5bGlzdCk7XG4gIHZhciByY2F0ID0gcnRyaW1tZWQubWFwKGZ1bmN0aW9uIChvKSB7XG4gICAgcmV0dXJuIGFuYWx5emVDYXRlZ29yeShvLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG4gIH0pO1xuICBpZiAocmNhdC5pbmRleE9mKHVuZGVmaW5lZCkgPj0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignXCInICsgcnRyaW1tZWRbcmNhdC5pbmRleE9mKHVuZGVmaW5lZCldICsgJ1wiIGlzIG5vdCBhIGNhdGVnb3J5IScpO1xuICB9XG4gIHJldHVybiByY2F0O1xufVxuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlckFjY2VwdGluZ09ubHkocmVzOiBJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11bXSwgY2F0ZWdvcmllczogc3RyaW5nW10pOlxuICBJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11bXSB7XG4gIHJldHVybiByZXMuZmlsdGVyKGZ1bmN0aW9uIChhU2VudGVuY2UsIGlJbmRleCkge1xuICAgIHJldHVybiBhU2VudGVuY2UuZXZlcnkoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICByZXR1cm4gY2F0ZWdvcmllcy5pbmRleE9mKG9Xb3JkLmNhdGVnb3J5KSA+PSAwO1xuICAgIH0pO1xuICB9KVxufVxuXG5cblxuXG5leHBvcnQgZnVuY3Rpb24gcHJvY2Vzc1N0cmluZyhxdWVyeTogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXNcbik6IElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzIHtcblxuLy8gIGlmICghcHJvY2Vzcy5lbnYuQUJPVF9PTERNQVRDSCkge1xuICAgIHJldHVybiBFckJhc2UucHJvY2Vzc1N0cmluZyhxdWVyeSwgcnVsZXMsIHJ1bGVzLndvcmRDYWNoZSk7XG4vLyAgfVxuLypcbiAgdmFyIG1hdGNoZWQgPSBJbnB1dEZpbHRlci5hbmFseXplU3RyaW5nKHF1ZXJ5LCBydWxlcywgc1dvcmRzKTtcbiAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICBkZWJ1Z2xvZyhcIkFmdGVyIG1hdGNoZWQgXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkKSk7XG4gIH1cbiAgdmFyIGFTZW50ZW5jZXMgPSBJbnB1dEZpbHRlci5leHBhbmRNYXRjaEFycihtYXRjaGVkKTtcbiAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICBkZWJ1Z2xvZyhcImFmdGVyIGV4cGFuZFwiICsgYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgfSkuam9pbihcIlxcblwiKSk7XG4gIH1cbiAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gSW5wdXRGaWx0ZXIucmVpbkZvcmNlKGFTZW50ZW5jZXMpO1xuICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgIGRlYnVnbG9nKFwiYWZ0ZXIgcmVpbmZvcmNlXCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgfSkuam9pbihcIlxcblwiKSk7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBlcnJvcnM6IFtdLFxuICAgIHNlbnRlbmNlczogYVNlbnRlbmNlc1JlaW5mb3JjZWRcbiAgfSBhcyBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcztcbiovXG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVDb250ZXh0U3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMpOlxuICBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcyB7XG5cbiAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gcHJvY2Vzc1N0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKVxuICAvLyB3ZSBsaW1pdCBhbmFseXNpcyB0byBuIHNlbnRlbmNlc1xuICBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMgPSBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMuc2xpY2UoMCwgQWxnb2wuQ3V0b2ZmX1NlbnRlbmNlcyk7XG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgZGVidWdsb2coXCJhZnRlciByZWluZm9yY2UgYW5kIGN1dG9mZlwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLmxlbmd0aCArIFwiXFxuXCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICB9XG4gIHJldHVybiBhU2VudGVuY2VzUmVpbmZvcmNlZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNtcEJ5TnJDYXRlZ29yaWVzQW5kU2FtZURvbWFpbihhOiBJTWF0Y2guSVNlbnRlbmNlLCBiOiBJTWF0Y2guSVNlbnRlbmNlKTogbnVtYmVyIHtcbiAgLy9jb25zb2xlLmxvZyhcImNvbXBhcmUgYVwiICsgYSArIFwiIGNudGIgXCIgKyBiKTtcbiAgdmFyIGNudGEgPSBTZW50ZW5jZS5nZXREaXN0aW5jdENhdGVnb3JpZXNJblNlbnRlbmNlKGEpLmxlbmd0aDtcbiAgdmFyIGNudGIgPSBTZW50ZW5jZS5nZXREaXN0aW5jdENhdGVnb3JpZXNJblNlbnRlbmNlKGIpLmxlbmd0aDtcbiAgLypcbiAgICB2YXIgY250YSA9IGEucmVkdWNlKGZ1bmN0aW9uKHByZXYsIG9Xb3JkKSB7XG4gICAgICByZXR1cm4gcHJldiArICgob1dvcmQuY2F0ZWdvcnkgPT09IFwiY2F0ZWdvcnlcIik/IDEgOiAwKTtcbiAgICB9LDApO1xuICAgIHZhciBjbnRiID0gYi5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgb1dvcmQpIHtcbiAgICAgIHJldHVybiBwcmV2ICsgKChvV29yZC5jYXRlZ29yeSA9PT0gXCJjYXRlZ29yeVwiKT8gMSA6IDApO1xuICAgIH0sMCk7XG4gICAvLyBjb25zb2xlLmxvZyhcImNudCBhXCIgKyBjbnRhICsgXCIgY250YiBcIiArIGNudGIpO1xuICAgKi9cbiAgcmV0dXJuIGNudGIgLSBjbnRhO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZUNhdGVnb3J5TXVsdChjYXRlZ29yeWxpc3Q6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCB3aG9sZXNlbnRlbmNlOiBzdHJpbmcsIGdXb3JkczpcbiAgeyBba2V5OiBzdHJpbmddOiBJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW10gfSk6IHN0cmluZ1tdIHtcblxuXG5cblxuXG4gIHZhciByZXMgPSBhbmFseXplQ29udGV4dFN0cmluZyhjYXRlZ29yeWxpc3QsIHJ1bGVzKTtcbiAgLy8gIGRlYnVnbG9nKFwicmVzdWx0aW5nIGNhdGVnb3J5IHNlbnRlbmNlc1wiLCBKU09OLnN0cmluZ2lmeShyZXMpKTtcbiAgdmFyIHJlczIgPSBmaWx0ZXJBY2NlcHRpbmdPbmx5KHJlcy5zZW50ZW5jZXMsIFtcImNhdGVnb3J5XCIsIFwiZmlsbGVyXCJdKTtcbiAgLy8gIGNvbnNvbGUubG9nKFwiaGVyZSByZXMyXCIgKyBKU09OLnN0cmluZ2lmeShyZXMyKSApO1xuICAvLyAgY29uc29sZS5sb2coXCJoZXJlIHVuZGVmaW5lZCAhICsgXCIgKyByZXMyLmZpbHRlcihvID0+ICFvKS5sZW5ndGgpO1xuICByZXMyLnNvcnQoU2VudGVuY2UuY21wUmFua2luZ1Byb2R1Y3QpO1xuICBkZWJ1Z2xvZyhcInJlc3VsdGluZyBjYXRlZ29yeSBzZW50ZW5jZXM6IFxcblwiLCBkZWJ1Z2xvZy5lbmFibGVkID8gKFNlbnRlbmNlLmR1bXBOaWNlQXJyKHJlczIuc2xpY2UoMCwgMyksIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KSkgOiAnLScpO1xuICAvLyBUT0RPOiAgIHJlczIgPSBmaWx0ZXJBY2NlcHRpbmdPbmx5U2FtZURvbWFpbihyZXMyKTtcbiAgLy9kZWJ1Z2xvZyhcInJlc3VsdGluZyBjYXRlZ29yeSBzZW50ZW5jZXNcIiwgSlNPTi5zdHJpbmdpZnkocmVzMiwgdW5kZWZpbmVkLCAyKSk7XG4gIC8vIGV4cGVjdCBvbmx5IGNhdGVnb3JpZXNcbiAgLy8gd2UgY291bGQgcmFuayBub3cgYnkgY29tbW9uIGRvbWFpbnMgLCBidXQgZm9yIG5vdyB3ZSBvbmx5IHRha2UgdGhlIGZpcnN0IG9uZVxuICBpZiAoIXJlczIubGVuZ3RoKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICAvL3Jlcy5zb3J0KGNtcEJ5TnJDYXRlZ29yaWVzQW5kU2FtZURvbWFpbik7XG4gIHZhciByZXNjYXQgPSBTZW50ZW5jZS5nZXREaXN0aW5jdENhdGVnb3JpZXNJblNlbnRlbmNlKHJlczJbMF0pO1xuICByZXR1cm4gcmVzY2F0O1xuICAvLyBcIlwiIHJldHVybiByZXNbMF0uZmlsdGVyKClcbiAgLy8gcmV0dXJuIGNsYXNzaWZ5V29yZFdpdGhUYXJnZXRDYXRlZ29yeShjYXRlZ29yeWxpc3QsICdjYXRlZ29yeScsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVPcGVyYXRvcihvcHdvcmQ6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCB3aG9sZXNlbnRlbmNlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KG9wd29yZCwgJ29wZXJhdG9yJywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xufVxuXG5cbmltcG9ydCAqIGFzIExpc3RBbGwgZnJvbSAnLi9saXN0YWxsJztcbi8vIGNvbnN0IHJlc3VsdCA9IFdoYXRJcy5yZXNvbHZlQ2F0ZWdvcnkoY2F0LCBhMS5lbnRpdHksXG4vLyAgIHRoZU1vZGVsLm1SdWxlcywgdGhlTW9kZWwudG9vbHMsIHRoZU1vZGVsLnJlY29yZHMpO1xuXG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlQ2F0ZWdvcnkoY2F0ZWdvcnk6IHN0cmluZywgY29udGV4dFF1ZXJ5U3RyaW5nOiBzdHJpbmcsXG4gIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+KTogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzIHtcbiAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4geyBlcnJvcnM6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSwgdG9rZW5zOiBbXSwgYW5zd2VyczogW10gfTtcbiAgfSBlbHNlIHtcbiAgICAvKlxuICAgICAgICB2YXIgbWF0Y2hlZCA9IElucHV0RmlsdGVyLmFuYWx5emVTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcyk7XG4gICAgICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJhZnRlciBtYXRjaGVkIFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZCkpOiAnLScpO1xuICAgICAgICB2YXIgYVNlbnRlbmNlcyA9IElucHV0RmlsdGVyLmV4cGFuZE1hdGNoQXJyKG1hdGNoZWQpO1xuICAgICAgICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgZGVidWdsb2coXCJhZnRlciBleHBhbmRcIiArIGFTZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgICAgICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICAgICAgfSAqL1xuXG5cbiAgICAgICAgICAvLyB2YXIgY2F0ZWdvcnlTZXQgPSBNb2RlbC5nZXRBbGxSZWNvcmRDYXRlZ29yaWVzRm9yVGFyZ2V0Q2F0ZWdvcnkodGhlTW9kZWwsIGNhdCwgdHJ1ZSk7XG5cbiAgICB2YXIgcmVzID0gTGlzdEFsbC5saXN0QWxsV2l0aENvbnRleHQoY2F0ZWdvcnksIGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMsIHJlY29yZHMpO1xuICAgIC8vKiBzb3J0IGJ5IHNlbnRlbmNlXG4gICAgcmVzLmFuc3dlcnMuZm9yRWFjaChvID0+IHsgby5fcmFua2luZyA9IG8uX3JhbmtpbmcgKiAgU2VudGVuY2UucmFua2luZ1Byb2R1Y3QoIG8uc2VudGVuY2UgKTsgfSk7XG4gICAgcmVzLmFuc3dlcnMuc29ydChjbXBCeVJhbmtpbmcpO1xuICAgIHJldHVybiByZXM7XG4vKlxuICAgIC8vID8/PyB2YXIgcmVzID0gTGlzdEFsbC5saXN0QWxsSGF2aW5nQ29udGV4dChjYXRlZ29yeSwgY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcywgcmVjb3Jkcyk7XG5cbiAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBwcm9jZXNzU3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMpO1xuICAgIC8vYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24ob1NlbnRlbmNlKSB7IHJldHVybiBJbnB1dEZpbHRlci5yZWluRm9yY2Uob1NlbnRlbmNlKTsgfSk7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImFmdGVyIHJlaW5mb3JjZVwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICB9KS5qb2luKFwiXFxuXCIpKSA6ICctJyk7XG4gICAgdmFyIG1hdGNoZWRBbnN3ZXJzID0gbWF0Y2hSZWNvcmRzKGFTZW50ZW5jZXNSZWluZm9yY2VkLCBjYXRlZ29yeSwgcmVjb3Jkcyk7IC8vYVRvb2w6IEFycmF5PElNYXRjaC5JVG9vbD4pOiBhbnkgLyAqIG9iamVjdHN0cmVhbSogLyB7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcIiBtYXRjaGVkQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMsIHVuZGVmaW5lZCwgMikpIDogJy0nKTtcbiAgICByZXR1cm4gbWF0Y2hlZEFuc3dlcnM7XG4qL1xuIH1cbn1cblxuLypcbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlQ2F0ZWdvcnlPbGQoY2F0ZWdvcnk6IHN0cmluZywgY29udGV4dFF1ZXJ5U3RyaW5nOiBzdHJpbmcsXG4gIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+KTogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzIHtcbiAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4geyBlcnJvcnM6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSwgdG9rZW5zOiBbXSwgYW5zd2VyczogW10gfTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBwcm9jZXNzU3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMpO1xuICAgIC8vYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24ob1NlbnRlbmNlKSB7IHJldHVybiBJbnB1dEZpbHRlci5yZWluRm9yY2Uob1NlbnRlbmNlKTsgfSk7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImFmdGVyIHJlaW5mb3JjZVwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICB9KS5qb2luKFwiXFxuXCIpKSA6ICctJyk7XG4gICAgdmFyIG1hdGNoZWRBbnN3ZXJzID0gbWF0Y2hSZWNvcmRzKGFTZW50ZW5jZXNSZWluZm9yY2VkLCBjYXRlZ29yeSwgcmVjb3Jkcyk7IC8vYVRvb2w6IEFycmF5PElNYXRjaC5JVG9vbD4pOiBhbnkgLyAqIG9iamVjdHN0cmVhbSogLyB7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcIiBtYXRjaGVkQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMsIHVuZGVmaW5lZCwgMikpIDogJy0nKTtcbiAgICByZXR1cm4gbWF0Y2hlZEFuc3dlcnM7XG4gIH1cbn1cbiovXG5cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVDYXRlZ29yaWVzKGNhdGVnb3JpZXM6IHN0cmluZ1tdLCBjb250ZXh0UXVlcnlTdHJpbmc6IHN0cmluZyxcbiAgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzLCBkb21haW5DYXRlZ29yeUZpbHRlciA6IElNYXRjaC5JRG9tYWluQ2F0ZWdvcnlGaWx0ZXIpOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc1R1cGVsQW5zd2VycyB7XG4gIHZhciByZWNvcmRzID0gdGhlTW9kZWwucmVjb3JkcztcbiAgdmFyIHJ1bGVzID0gdGhlTW9kZWwucnVsZXM7XG4gIGlmIChjb250ZXh0UXVlcnlTdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczogW0VyRXJyb3IubWFrZUVycm9yX0VNUFRZX0lOUFVUKCldLFxuICAgICAgdHVwZWxhbnN3ZXJzOiBbXSxcbiAgICAgIHRva2VuczogW11cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gdmFyIGNhdGVnb3J5U2V0ID0gTW9kZWwuZ2V0QWxsUmVjb3JkQ2F0ZWdvcmllc0ZvclRhcmdldENhdGVnb3J5KHRoZU1vZGVsLCBjYXQsIHRydWUpO1xuICAgIHZhciByZXMgPSBMaXN0QWxsLmxpc3RBbGxUdXBlbFdpdGhDb250ZXh0KGNhdGVnb3JpZXMsIGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMsIHJlY29yZHMsIGRvbWFpbkNhdGVnb3J5RmlsdGVyKTtcbiAgICAvLyogc29ydCBieSBzZW50ZW5jZVxuICAgIHJlcy50dXBlbGFuc3dlcnMuZm9yRWFjaChvID0+IHsgby5fcmFua2luZyA9IG8uX3JhbmtpbmcgKiAgU2VudGVuY2UucmFua2luZ1Byb2R1Y3QoIG8uc2VudGVuY2UgKTsgfSk7XG4gICAgcmVzLnR1cGVsYW5zd2Vycy5zb3J0KGNtcEJ5UmFua2luZ1R1cGVsKTtcbiAgICByZXR1cm4gcmVzO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0luZGlzY3JpbWluYXRlUmVzdWx0KHJlc3VsdHM6IEFycmF5PElNYXRjaC5JV2hhdElzQW5zd2VyPik6IHN0cmluZyB7XG4gIHZhciBjbnQgPSByZXN1bHRzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgcmVzdWx0KSB7XG4gICAgaWYgKHNhZmVFcXVhbChyZXN1bHQuX3JhbmtpbmcscmVzdWx0c1swXS5fcmFua2luZykpIHtcbiAgICAgIHJldHVybiBwcmV2ICsgMTtcbiAgICB9XG4gIH0sIDApO1xuICBpZiAoY250ID4gMSkge1xuICAgIC8vIHNlYXJjaCBmb3IgYSBkaXNjcmltaW5hdGluZyBjYXRlZ29yeSB2YWx1ZVxuICAgIHZhciBkaXNjcmltaW5hdGluZyA9IE9iamVjdC5rZXlzKHJlc3VsdHNbMF0ucmVjb3JkKS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGNhdGVnb3J5KSB7XG4gICAgICBpZiAoKGNhdGVnb3J5LmNoYXJBdCgwKSAhPT0gJ18nICYmIGNhdGVnb3J5ICE9PSByZXN1bHRzWzBdLmNhdGVnb3J5KVxuICAgICAgICAmJiAocmVzdWx0c1swXS5yZWNvcmRbY2F0ZWdvcnldICE9PSByZXN1bHRzWzFdLnJlY29yZFtjYXRlZ29yeV0pKSB7XG4gICAgICAgIHByZXYucHVzaChjYXRlZ29yeSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJldjtcbiAgICB9LCBbXSk7XG4gICAgaWYgKGRpc2NyaW1pbmF0aW5nLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIFwiTWFueSBjb21wYXJhYmxlIHJlc3VsdHMsIHBlcmhhcHMgeW91IHdhbnQgdG8gc3BlY2lmeSBhIGRpc2NyaW1pbmF0aW5nIFwiICsgZGlzY3JpbWluYXRpbmcuam9pbignLCcpO1xuICAgIH1cbiAgICByZXR1cm4gJ1lvdXIgcXVlc3Rpb24gZG9lcyBub3QgaGF2ZSBhIHNwZWNpZmljIGFuc3dlcic7XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzSW5kaXNjcmltaW5hdGVSZXN1bHRUdXBlbChyZXN1bHRzOiBBcnJheTxJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyPik6IHN0cmluZyB7XG4gIHZhciBjbnQgPSByZXN1bHRzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgcmVzdWx0KSB7XG4gICAgaWYgKHNhZmVFcXVhbChyZXN1bHQuX3JhbmtpbmcscmVzdWx0c1swXS5fcmFua2luZykpIHtcbiAgICAgIHJldHVybiBwcmV2ICsgMTtcbiAgICB9XG4gIH0sIDApO1xuICBpZiAoY250ID4gMSkge1xuICAgIC8vIHNlYXJjaCBmb3IgYSBkaXNjcmltaW5hdGluZyBjYXRlZ29yeSB2YWx1ZVxuICAgIHZhciBkaXNjcmltaW5hdGluZyA9IE9iamVjdC5rZXlzKHJlc3VsdHNbMF0ucmVjb3JkKS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGNhdGVnb3J5KSB7XG4gICAgICBpZiAoKGNhdGVnb3J5LmNoYXJBdCgwKSAhPT0gJ18nICYmIHJlc3VsdHNbMF0uY2F0ZWdvcmllcy5pbmRleE9mKGNhdGVnb3J5KSA8IDApXG4gICAgICAgICYmIChyZXN1bHRzWzBdLnJlY29yZFtjYXRlZ29yeV0gIT09IHJlc3VsdHNbMV0ucmVjb3JkW2NhdGVnb3J5XSkpIHtcbiAgICAgICAgcHJldi5wdXNoKGNhdGVnb3J5KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIFtdKTtcbiAgICBpZiAoZGlzY3JpbWluYXRpbmcubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gXCJNYW55IGNvbXBhcmFibGUgcmVzdWx0cywgcGVyaGFwcyB5b3Ugd2FudCB0byBzcGVjaWZ5IGEgZGlzY3JpbWluYXRpbmcgXCIgKyBkaXNjcmltaW5hdGluZy5qb2luKCcsJykgKyAnIG9yIHVzZSBcImxpc3QgYWxsIC4uLlwiJztcbiAgICB9XG4gICAgcmV0dXJuICdZb3VyIHF1ZXN0aW9uIGRvZXMgbm90IGhhdmUgYSBzcGVjaWZpYyBhbnN3ZXInO1xuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
