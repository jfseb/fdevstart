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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC93aGF0aXMudHMiLCJtYXRjaC93aGF0aXMuanMiXSwibmFtZXMiOlsiSW5wdXRGaWx0ZXIiLCJyZXF1aXJlIiwiZGVidWciLCJkZWJ1Z2xvZyIsImRlYnVnbG9nViIsInBlcmZsb2ciLCJtb2NrRGVidWciLCJvIiwiZXhwb3J0cyIsIl8iLCJNYXRjaCIsIlNlbnRlbmNlIiwiV29yZCIsIkFsZ29sIiwibG9jYWxlQ29tcGFyZUFycnMiLCJhYXJlc3VsdCIsImJicmVzdWx0IiwiY21wIiwiYmxlbiIsImxlbmd0aCIsImV2ZXJ5IiwiYSIsImluZGV4IiwibG9jYWxlQ29tcGFyZSIsInNhZmVFcXVhbCIsImIiLCJkZWx0YSIsIk1hdGgiLCJhYnMiLCJSQU5LSU5HX0VQU0lMT04iLCJzYWZlRGVsdGEiLCJjbXBCeVJlc3VsdFRoZW5SYW5raW5nVHVwZWwiLCJhYSIsImJiIiwicmVzdWx0IiwiX3JhbmtpbmciLCJjbXBSZWNvcmRzIiwia2V5cyIsIk9iamVjdCIsImNvbmNhdCIsInNvcnQiLCJyZXMiLCJyZWR1Y2UiLCJwcmV2Iiwic0tleSIsImNtcEJ5UmFua2luZyIsInJlY29yZCIsImNtcEJ5UmFua2luZ1R1cGVsIiwiZHVtcE5pY2UiLCJhbnN3ZXIiLCJzIiwicHVzaCIsImNhdGVnb3J5IiwiZm9yRWFjaCIsInNSZXF1aXJlcyIsImNoYXJBdCIsIm9TZW50ZW5jZSIsInNlbnRlbmNlIiwib1dvcmQiLCJzV29yZCIsInN0cmluZyIsIm1hdGNoZWRTdHJpbmciLCJkdW1wTmljZVR1cGVsIiwiY2F0ZWdvcmllcyIsImpvaW4iLCJkdW1wV2VpZ2h0c1RvcCIsInRvb2xtYXRjaGVzIiwib3B0aW9ucyIsIm9NYXRjaCIsInRvcCIsImZpbHRlckRpc3RpbmN0UmVzdWx0QW5kU29ydFR1cGVsIiwidHVwZWxhbnN3ZXJzIiwiZmlsdGVyIiwiaVJlcyIsImVuYWJsZWQiLCJKU09OIiwic3RyaW5naWZ5IiwiaXNFcXVhbCIsImFzc2lnbiIsImZpbHRlck9ubHlUb3BSYW5rZWQiLCJyZXN1bHRzIiwiRXJyb3IiLCJmaWx0ZXJPbmx5VG9wUmFua2VkVHVwZWwiLCJjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5IiwibWF0Y2hlZCIsImhhc0NhdGVnb3J5IiwibWlzbWF0Y2hlZCIsInJlbGV2YW50Q291bnQiLCJoYXNEb21haW4iLCJsZW5NYXRjaGVkIiwiZmFjdG9yIiwiY2FsY1JhbmtpbmdQcm9kdWN0IiwicG93IiwibGVuSGFzQ2F0ZWdvcnkiLCJmYWN0b3JIIiwibGVuTWlzTWF0Y2hlZCIsImZhY3RvcjIiLCJkaXZpc29yIiwibWFrZVNpbXBsaWZpZWRTZW50ZW5jZXNDYXRlZ29yeVNldDIiLCJhU2VudGVuY2VzIiwiY2F0ZWdvcnlTZXQiLCJ0cmFjayIsInNlbnRlbmNlcyIsIm1hcCIsImFEb21haW5zIiwicldvcmRzIiwiZmwiLCJsZiIsImRvbWFpbnMiLCJjbnRSZWxldmFudFdvcmRzIiwibWFrZVNpbXBsaWZpZWRTZW50ZW5jZXMiLCJpc0ZpbGxlciIsImV4dHJhY3RSZXN1bHQiLCJtYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcyIsInBTZW50ZW5jZXMiLCJyZWNvcmRzIiwiZG9tYWluQ2F0ZWdvcnlGaWx0ZXIiLCJmcmVlemUiLCJjYXRlZ29yeUYiLCJyZWxldmFudFJlY29yZHMiLCJpbmRleE9mIiwiX2RvbWFpbiIsImNhdCIsInVuZGVmaW5lZCIsIm9iaiIsImFTaW1wbGlmaWVkU2VudGVuY2VzIiwiYVNlbnRlbmNlIiwiaW1pc21hdGNoZWQiLCJpbWF0Y2hlZCIsIm5vdXNlIiwiZm91bmRjYXQiLCJtaXNzaW5nY2F0IiwiaXNDYXRlZ29yeSIsIm1hdGNoZWREb21haW4iLCJtYXRjaGVkTGVuIiwibWlzbWF0Y2hlZExlbiIsInJlYyIsInJlc3VsdDEiLCJyZXN1bHQyIiwiY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5Iiwid29yZCIsInRhcmdldGNhdGVnb3J5IiwicnVsZXMiLCJ3aG9sZXNlbnRlbmNlIiwiY2F0cyIsImNhdGVnb3JpemVBV29yZCIsImFuYWx5emVDYXRlZ29yeSIsImNhdGVnb3J5d29yZCIsInNwbGl0QXRDb21tYUFuZCIsInN0ciIsInIiLCJzcGxpdCIsInJ0cmltbWVkIiwiU3RyaW5nIiwidHJpbSIsImFuYWx5emVDYXRlZ29yeU11bHRPbmx5QW5kQ29tbWEiLCJjYXRlZ29yeWxpc3QiLCJyY2F0IiwiZmlsdGVyQWNjZXB0aW5nT25seSIsImlJbmRleCIsIkVyYmFzZSIsInByb2Nlc3NTdHJpbmciLCJxdWVyeSIsIndvcmRDYWNoZSIsImFuYWx5emVDb250ZXh0U3RyaW5nIiwiY29udGV4dFF1ZXJ5U3RyaW5nIiwiYVNlbnRlbmNlc1JlaW5mb3JjZWQiLCJzbGljZSIsIkN1dG9mZl9TZW50ZW5jZXMiLCJyYW5raW5nUHJvZHVjdCIsImNtcEJ5TnJDYXRlZ29yaWVzQW5kU2FtZURvbWFpbiIsImNudGEiLCJnZXREaXN0aW5jdENhdGVnb3JpZXNJblNlbnRlbmNlIiwiY250YiIsImFuYWx5emVDYXRlZ29yeU11bHQiLCJnV29yZHMiLCJyZXMyIiwiY21wUmFua2luZ1Byb2R1Y3QiLCJkdW1wTmljZUFyciIsInJlc2NhdCIsImFuYWx5emVPcGVyYXRvciIsIm9wd29yZCIsIkVyRXJyb3IiLCJMaXN0QWxsIiwicmVzb2x2ZUNhdGVnb3J5IiwiZXJyb3JzIiwibWFrZUVycm9yX0VNUFRZX0lOUFVUIiwidG9rZW5zIiwiYW5zd2VycyIsImxpc3RBbGxXaXRoQ29udGV4dCIsInJlc29sdmVDYXRlZ29yaWVzIiwidGhlTW9kZWwiLCJsaXN0QWxsVHVwZWxXaXRoQ29udGV4dCIsImlzSW5kaXNjcmltaW5hdGVSZXN1bHQiLCJjbnQiLCJkaXNjcmltaW5hdGluZyIsImlzSW5kaXNjcmltaW5hdGVSZXN1bHRUdXBlbCJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztBQ01BOzs7O0FERUEsSUFBQUEsY0FBQUMsUUFBQSxlQUFBLENBQUE7QUFFQSxJQUFBQyxRQUFBRCxRQUFBLE9BQUEsQ0FBQTtBQUVBLElBQUlFLFdB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QUEvQixDQUFzQyxVQUFVQyxJQUFWLEVBQWdCUyxRQUFoQixFQUF3QjtBQUNqRixnQkFBS0EsU0FBU0csTUFBVCxDQUFnQixDQUFoQixNQUF1QixHQUF2QixJQUE4QnlCLFFBQVEsQ0FBUixFQUFXakIsVUFBWCxDQUFzQnlELE9BQXRCLENBQThCcEUsUUFBOUIsSUFBMEMsQ0FBekUsSUFDRTRCLFFBQVEsQ0FBUixFQUFXbEMsTUFBWCxDQUFrQk0sUUFBbEIsTUFBZ0M0QixRQUFRLENBQVIsRUFBV2xDLE1BQVgsQ0FBa0JNLFFBQWxCLENBRHRDLEVBQ29FO0FBQ2xFVCxxQkFBS1EsSUFBTCxDQUFVQyxRQUFWO0FBQ0Q7QUFDRCxtQkFBT1QsSUFBUDtBQUNELFNBTm9CLEVBTWxCLEVBTmtCLENBQXJCO0FBT0EsWUFBSXdKLGVBQWVoTCxNQUFuQixFQUEyQjtBQUN6QixtQkFBTywyRUFBMkVnTCxlQUFlbkksSUFBZixDQUFvQixHQUFwQixDQUEzRSxHQUFzRyx3QkFBN0c7QUFDRDtBQUNELGVBQU8sK0NBQVA7QUFDRDtBQUNELFdBQU8yRCxTQUFQO0FBQ0Q7QUFyQkRuSCxRQUFBNEwsMkJBQUEsR0FBQUEsMkJBQUEiLCJmaWxlIjoibWF0Y2gvd2hhdGlzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKlxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuYW5hbHl6ZVxuICogQGZpbGUgYW5hbHl6ZS50c1xuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxuICovXG5cblxuaW1wb3J0ICogYXMgSW5wdXRGaWx0ZXIgZnJvbSAnLi9pbnB1dEZpbHRlcic7XG5cbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcblxudmFyIGRlYnVnbG9nID0gZGVidWcoJ3doYXRpcycpO1xudmFyIGRlYnVnbG9nViA9IGRlYnVnKCd3aGF0VmlzJyk7XG52YXIgcGVyZmxvZyA9IGRlYnVnKCdwZXJmJyk7XG5cblxuZXhwb3J0IGZ1bmN0aW9uIG1vY2tEZWJ1ZyhvKSB7XG4gIGRlYnVnbG9nID0gbztcbiAgZGVidWdsb2dWID0gbztcbiAgcGVyZmxvZyA9IG87XG59XG5cblxuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuXG5pbXBvcnQgKiBhcyBJTWF0Y2ggZnJvbSAnLi9pZm1hdGNoJztcblxuXG5pbXBvcnQgKiBhcyBNYXRjaCBmcm9tICcuL21hdGNoJztcblxuXG5pbXBvcnQgKiBhcyBUb29sbWF0Y2hlciBmcm9tICcuL3Rvb2xtYXRjaGVyJztcblxuaW1wb3J0ICogYXMgU2VudGVuY2UgZnJvbSAnLi9zZW50ZW5jZSc7XG5cbmltcG9ydCAqIGFzIFdvcmQgZnJvbSAnLi93b3JkJztcblxuaW1wb3J0ICogYXMgQWxnb2wgZnJvbSAnLi9hbGdvbCc7XG5cbmltcG9ydCB7TW9kZWwgYXMgTW9kZWx9ICBmcm9tICdmZGV2c3RhX21vbm1vdmUnO1xuXG5cblxuLypcbmV4cG9ydCBmdW5jdGlvbiBjbXBCeVJlc3VsdFRoZW5SYW5raW5nKGE6IElNYXRjaC5JV2hhdElzQW5zd2VyLCBiOiBJTWF0Y2guSVdoYXRJc0Fuc3dlcikge1xuICB2YXIgY21wID0gYS5yZXN1bHQubG9jYWxlQ29tcGFyZShiLnJlc3VsdCk7XG4gIGlmIChjbXApIHtcbiAgICByZXR1cm4gY21wO1xuICB9XG4gIHJldHVybiAtKGEuX3JhbmtpbmcgLSBiLl9yYW5raW5nKTtcbn1cbiovXG5cbmZ1bmN0aW9uIGxvY2FsZUNvbXBhcmVBcnJzKGFhcmVzdWx0OiBzdHJpbmdbXSwgYmJyZXN1bHQ6IHN0cmluZ1tdKTogbnVtYmVyIHtcbiAgdmFyIGNtcCA9IDA7XG4gIHZhciBibGVuID0gYmJyZXN1bHQubGVuZ3RoO1xuICBhYXJlc3VsdC5ldmVyeShmdW5jdGlvbiAoYSwgaW5kZXgpIHtcbiAgICBpZiAoYmxlbiA8PSBpbmRleCkge1xuICAgICAgY21wID0gLTE7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGNtcCA9IGEubG9jYWxlQ29tcGFyZShiYnJlc3VsdFtpbmRleF0pO1xuICAgIGlmIChjbXApIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0pO1xuICBpZiAoY21wKSB7XG4gICAgcmV0dXJuIGNtcDtcbiAgfVxuICBpZiAoYmxlbiA+IGFhcmVzdWx0Lmxlbmd0aCkge1xuICAgIGNtcCA9ICsxO1xuICB9XG4gIHJldHVybiAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2FmZUVxdWFsKGEgOiBudW1iZXIsIGIgOiBudW1iZXIpIDogYm9vbGVhbiB7XG4gIHZhciBkZWx0YSA9IGEgLSBiIDtcbiAgaWYoTWF0aC5hYnMoZGVsdGEpIDwgQWxnb2wuUkFOS0lOR19FUFNJTE9OKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2FmZURlbHRhKGEgOiBudW1iZXIsIGIgOiBudW1iZXIpIDogbnVtYmVyIHtcbiAgdmFyIGRlbHRhID0gYSAtIGIgO1xuICBpZihNYXRoLmFicyhkZWx0YSkgPCBBbGdvbC5SQU5LSU5HX0VQU0lMT04pIHtcbiAgICByZXR1cm4gMDtcbiAgfVxuICByZXR1cm4gZGVsdGE7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjbXBCeVJlc3VsdFRoZW5SYW5raW5nVHVwZWwoYWE6IElNYXRjaC5JV2hhdElzVHVwZWxBbnN3ZXIsIGJiOiBJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyKSB7XG4gIHZhciBjbXAgPSBsb2NhbGVDb21wYXJlQXJycyhhYS5yZXN1bHQsIGJiLnJlc3VsdCk7XG4gIGlmIChjbXApIHtcbiAgICByZXR1cm4gY21wO1xuICB9XG4gIHJldHVybiAtc2FmZURlbHRhKGFhLl9yYW5raW5nLGJiLl9yYW5raW5nKTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gY21wUmVjb3JkcyhhOiBJTWF0Y2guSVJlY29yZCwgYjogSU1hdGNoLklSZWNvcmQpIDogbnVtYmVyIHtcbi8vIGFyZSByZWNvcmRzIGRpZmZlcmVudD9cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhKS5jb25jYXQoT2JqZWN0LmtleXMoYikpLnNvcnQoKTtcbiAgdmFyIHJlcyA9IGtleXMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBzS2V5KSB7XG4gICAgaWYgKHByZXYpIHtcbiAgICAgIHJldHVybiBwcmV2O1xuICAgIH1cbiAgICBpZiAoYltzS2V5XSAhPT0gYVtzS2V5XSkge1xuICAgICAgaWYgKCFiW3NLZXldKSB7XG4gICAgICAgIHJldHVybiAtMTtcbiAgICAgIH1cbiAgICAgIGlmICghYVtzS2V5XSkge1xuICAgICAgICByZXR1cm4gKzE7XG4gICAgICB9XG4gICAgICByZXR1cm4gYVtzS2V5XS5sb2NhbGVDb21wYXJlKGJbc0tleV0pO1xuICAgIH1cbiAgICByZXR1cm4gMDtcbiAgfSwgMCk7XG4gIHJldHVybiByZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjbXBCeVJhbmtpbmcoYTogSU1hdGNoLklXaGF0SXNBbnN3ZXIsIGI6IElNYXRjaC5JV2hhdElzQW5zd2VyKSA6IG51bWJlciB7XG4gIHZhciBjbXAgPSAtIHNhZmVEZWx0YShhLl9yYW5raW5nLCBiLl9yYW5raW5nKSBhcyBudW1iZXI7XG4gIGlmIChjbXApIHtcbiAgICByZXR1cm4gY21wO1xuICB9XG4gIGNtcCA9IGEucmVzdWx0LmxvY2FsZUNvbXBhcmUoYi5yZXN1bHQpO1xuICBpZiAoY21wKSB7XG4gICAgcmV0dXJuIGNtcDtcbiAgfVxuXG4gIHJldHVybiBjbXBSZWNvcmRzKGEucmVjb3JkLGIucmVjb3JkKTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gY21wQnlSYW5raW5nVHVwZWwoYTogSU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlciwgYjogSU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlcikgOiBudW1iZXIge1xuICB2YXIgY21wID0gLSBzYWZlRGVsdGEoYS5fcmFua2luZywgYi5fcmFua2luZyk7XG4gIGlmIChjbXApIHtcbiAgICByZXR1cm4gY21wO1xuICB9XG4gIGNtcCA9IGxvY2FsZUNvbXBhcmVBcnJzKGEucmVzdWx0LCBiLnJlc3VsdCk7XG4gIGlmIChjbXApIHtcbiAgICByZXR1cm4gY21wO1xuICB9XG4gIHJldHVybiAgY21wUmVjb3JkcyhhLnJlY29yZCxiLnJlY29yZCk7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGR1bXBOaWNlKGFuc3dlcjogSU1hdGNoLklXaGF0SXNBbnN3ZXIpIHtcbiAgdmFyIHJlc3VsdCA9IHtcbiAgICBzOiBcIlwiLFxuICAgIHB1c2g6IGZ1bmN0aW9uIChzKSB7IHRoaXMucyA9IHRoaXMucyArIHM7IH1cbiAgfTtcbiAgdmFyIHMgPVxuICAgIGAqKlJlc3VsdCBmb3IgY2F0ZWdvcnk6ICR7YW5zd2VyLmNhdGVnb3J5fSBpcyAke2Fuc3dlci5yZXN1bHR9XG4gcmFuazogJHthbnN3ZXIuX3Jhbmtpbmd9XG5gO1xuICByZXN1bHQucHVzaChzKTtcbiAgT2JqZWN0LmtleXMoYW5zd2VyLnJlY29yZCkuZm9yRWFjaChmdW5jdGlvbiAoc1JlcXVpcmVzLCBpbmRleCkge1xuICAgIGlmIChzUmVxdWlyZXMuY2hhckF0KDApICE9PSAnXycpIHtcbiAgICAgIHJlc3VsdC5wdXNoKGByZWNvcmQ6ICR7c1JlcXVpcmVzfSAtPiAke2Fuc3dlci5yZWNvcmRbc1JlcXVpcmVzXX1gKTtcbiAgICB9XG4gICAgcmVzdWx0LnB1c2goJ1xcbicpO1xuICB9KTtcbiAgdmFyIG9TZW50ZW5jZSA9IGFuc3dlci5zZW50ZW5jZTtcbiAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpbmRleCkge1xuICAgIHZhciBzV29yZCA9IGBbJHtpbmRleH1dIDogJHtvV29yZC5jYXRlZ29yeX0gXCIke29Xb3JkLnN0cmluZ31cIiA9PiBcIiR7b1dvcmQubWF0Y2hlZFN0cmluZ31cImBcbiAgICByZXN1bHQucHVzaChzV29yZCArIFwiXFxuXCIpO1xuICB9KVxuICByZXN1bHQucHVzaChcIi5cXG5cIik7XG4gIHJldHVybiByZXN1bHQucztcbn1cbmV4cG9ydCBmdW5jdGlvbiBkdW1wTmljZVR1cGVsKGFuc3dlcjogSU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlcikge1xuICB2YXIgcmVzdWx0ID0ge1xuICAgIHM6IFwiXCIsXG4gICAgcHVzaDogZnVuY3Rpb24gKHMpIHsgdGhpcy5zID0gdGhpcy5zICsgczsgfVxuICB9O1xuICB2YXIgcyA9XG4gICAgYCoqUmVzdWx0IGZvciBjYXRlZ29yaWVzOiAke2Fuc3dlci5jYXRlZ29yaWVzLmpvaW4oXCI7XCIpfSBpcyAke2Fuc3dlci5yZXN1bHR9XG4gcmFuazogJHthbnN3ZXIuX3Jhbmtpbmd9XG5gO1xuICByZXN1bHQucHVzaChzKTtcbiAgT2JqZWN0LmtleXMoYW5zd2VyLnJlY29yZCkuZm9yRWFjaChmdW5jdGlvbiAoc1JlcXVpcmVzLCBpbmRleCkge1xuICAgIGlmIChzUmVxdWlyZXMuY2hhckF0KDApICE9PSAnXycpIHtcbiAgICAgIHJlc3VsdC5wdXNoKGByZWNvcmQ6ICR7c1JlcXVpcmVzfSAtPiAke2Fuc3dlci5yZWNvcmRbc1JlcXVpcmVzXX1gKTtcbiAgICB9XG4gICAgcmVzdWx0LnB1c2goJ1xcbicpO1xuICB9KTtcbiAgdmFyIG9TZW50ZW5jZSA9IGFuc3dlci5zZW50ZW5jZTtcbiAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpbmRleCkge1xuICAgIHZhciBzV29yZCA9IGBbJHtpbmRleH1dIDogJHtvV29yZC5jYXRlZ29yeX0gXCIke29Xb3JkLnN0cmluZ31cIiA9PiBcIiR7b1dvcmQubWF0Y2hlZFN0cmluZ31cImBcbiAgICByZXN1bHQucHVzaChzV29yZCArIFwiXFxuXCIpO1xuICB9KVxuICByZXN1bHQucHVzaChcIi5cXG5cIik7XG4gIHJldHVybiByZXN1bHQucztcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gZHVtcFdlaWdodHNUb3AodG9vbG1hdGNoZXM6IEFycmF5PElNYXRjaC5JV2hhdElzQW5zd2VyPiwgb3B0aW9uczogYW55KSB7XG4gIHZhciBzID0gJyc7XG4gIHRvb2xtYXRjaGVzLmZvckVhY2goZnVuY3Rpb24gKG9NYXRjaCwgaW5kZXgpIHtcbiAgICBpZiAoaW5kZXggPCBvcHRpb25zLnRvcCkge1xuICAgICAgcyA9IHMgKyBcIldoYXRJc0Fuc3dlcltcIiArIGluZGV4ICsgXCJdLi4uXFxuXCI7XG4gICAgICBzID0gcyArIGR1bXBOaWNlKG9NYXRjaCk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJEaXN0aW5jdFJlc3VsdEFuZFNvcnRUdXBlbChyZXM6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzVHVwZWxBbnN3ZXJzKTogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNUdXBlbEFuc3dlcnMge1xuICB2YXIgcmVzdWx0ID0gcmVzLnR1cGVsYW5zd2Vycy5maWx0ZXIoZnVuY3Rpb24gKGlSZXMsIGluZGV4KSB7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgIGRlYnVnbG9nKCcgcmV0YWluIHR1cGVsICcgKyBpbmRleCArICcgJyArIEpTT04uc3RyaW5naWZ5KGlSZXMpKTtcbiAgICB9XG4gICAgaWYgKF8uaXNFcXVhbChpUmVzLnJlc3VsdCwgcmVzLnR1cGVsYW5zd2Vyc1tpbmRleCAtIDFdICYmIHJlcy50dXBlbGFuc3dlcnNbaW5kZXggLSAxXS5yZXN1bHQpKSB7XG4gICAgICBkZWJ1Z2xvZygnc2tpcCcpO1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9KTtcbiAgcmVzdWx0LnNvcnQoY21wQnlSYW5raW5nVHVwZWwpO1xuICByZXR1cm4gT2JqZWN0LmFzc2lnbihyZXMsIHsgdHVwZWxhbnN3ZXJzOiByZXN1bHQgfSk7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlck9ubHlUb3BSYW5rZWQocmVzdWx0czogQXJyYXk8SU1hdGNoLklXaGF0SXNBbnN3ZXI+KTogQXJyYXk8SU1hdGNoLklXaGF0SXNBbnN3ZXI+IHtcbiAgdmFyIHJlcyA9IHJlc3VsdHMuZmlsdGVyKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICBpZiAoc2FmZUVxdWFsKHJlc3VsdC5fcmFua2luZywgcmVzdWx0c1swXS5fcmFua2luZykpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAocmVzdWx0Ll9yYW5raW5nID49IHJlc3VsdHNbMF0uX3JhbmtpbmcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkxpc3QgdG8gZmlsdGVyIG11c3QgYmUgb3JkZXJlZFwiKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbiAgcmV0dXJuIHJlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlck9ubHlUb3BSYW5rZWRUdXBlbChyZXN1bHRzOiBBcnJheTxJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyPik6IEFycmF5PElNYXRjaC5JV2hhdElzVHVwZWxBbnN3ZXI+IHtcbiAgdmFyIHJlcyA9IHJlc3VsdHMuZmlsdGVyKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICBpZiAoIHNhZmVFcXVhbChyZXN1bHQuX3JhbmtpbmcsIHJlc3VsdHNbMF0uX3JhbmtpbmcpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHJlc3VsdC5fcmFua2luZyA+PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJMaXN0IHRvIGZpbHRlciBtdXN0IGJlIG9yZGVyZWRcIik7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG4gIHJldHVybiByZXM7XG59XG5cblxuLyoqXG4gKiBBIHJhbmtpbmcgd2hpY2ggaXMgcHVyZWx5IGJhc2VkIG9uIHRoZSBudW1iZXJzIG9mIG1hdGNoZWQgZW50aXRpZXMsXG4gKiBkaXNyZWdhcmRpbmcgZXhhY3RuZXNzIG9mIG1hdGNoXG4gKi9cbi8qXG5leHBvcnQgZnVuY3Rpb24gY2FsY1JhbmtpbmdTaW1wbGUobWF0Y2hlZDogbnVtYmVyLFxuICBtaXNtYXRjaGVkOiBudW1iZXIsIG5vdXNlOiBudW1iZXIsXG4gIHJlbGV2YW50Q291bnQ6IG51bWJlcik6IG51bWJlciB7XG4gIC8vIDIgOiAwXG4gIC8vIDEgOiAwXG4gIHZhciBmYWN0b3IgPSBtYXRjaGVkICogTWF0aC5wb3coMS41LCBtYXRjaGVkKSAqIE1hdGgucG93KDEuNSwgbWF0Y2hlZCk7XG4gIHZhciBmYWN0b3IyID0gTWF0aC5wb3coMC40LCBtaXNtYXRjaGVkKTtcbiAgdmFyIGZhY3RvcjMgPSBNYXRoLnBvdygwLjQsIG5vdXNlKTtcbiAgcmV0dXJuIE1hdGgucG93KGZhY3RvcjIgKiBmYWN0b3IgKiBmYWN0b3IzLCAxIC8gKG1pc21hdGNoZWQgKyBtYXRjaGVkICsgbm91c2UpKTtcbn1cbiovXG5cbmV4cG9ydCBmdW5jdGlvbiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQ6IHsgW2tleTogc3RyaW5nXTogSU1hdGNoLklXb3JkIH0sXG4gIGhhc0NhdGVnb3J5OiB7IFtrZXk6IHN0cmluZ106IG51bWJlciB9LFxuICBtaXNtYXRjaGVkOiB7IFtrZXk6IHN0cmluZ106IElNYXRjaC5JV29yZCB9LCByZWxldmFudENvdW50OiBudW1iZXIsIGhhc0RvbWFpbiA6IG51bWJlcik6IG51bWJlciB7XG5cblxuICB2YXIgbGVuTWF0Y2hlZCA9IE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aDtcbiAgdmFyIGZhY3RvciA9IE1hdGNoLmNhbGNSYW5raW5nUHJvZHVjdChtYXRjaGVkKTtcbiAgZmFjdG9yICo9IE1hdGgucG93KDEuNSwgbGVuTWF0Y2hlZCk7XG4gIGlmKGhhc0RvbWFpbikge1xuICAgIGZhY3RvciAqPSAxLjU7XG4gIH1cbiAgdmFyIGxlbkhhc0NhdGVnb3J5ID0gT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aDtcbiAgdmFyIGZhY3RvckggPSBNYXRoLnBvdygxLjEsIGxlbkhhc0NhdGVnb3J5KTtcblxuICB2YXIgbGVuTWlzTWF0Y2hlZCA9IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aDtcbiAgdmFyIGZhY3RvcjIgPSBNYXRjaC5jYWxjUmFua2luZ1Byb2R1Y3QobWlzbWF0Y2hlZCk7XG4gIGZhY3RvcjIgKj0gTWF0aC5wb3coMC40LCBsZW5NaXNNYXRjaGVkKTtcbiAgdmFyIGRpdmlzb3IgPSAgKGxlbk1pc01hdGNoZWQgKyBsZW5IYXNDYXRlZ29yeSArIGxlbk1hdGNoZWQpO1xuICBkaXZpc29yID0gZGl2aXNvciA/IGRpdmlzb3IgOiAxO1xuICByZXR1cm4gTWF0aC5wb3coZmFjdG9yMiAqIGZhY3RvckggKiBmYWN0b3IsIDEgLyAoZGl2aXNvcikpO1xufVxuXG4vKipcbiAqIGxpc3QgYWxsIHRvcCBsZXZlbCByYW5raW5nc1xuICovXG4vKlxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVjb3Jkc0hhdmluZ0NvbnRleHQoXG4gIHBTZW50ZW5jZXM6IElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzLCBjYXRlZ29yeTogc3RyaW5nLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sXG4gIGNhdGVnb3J5U2V0OiB7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfSlcbiAgOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnMge1xuXG4gIC8vZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gIHZhciByZWxldmFudFJlY29yZHMgPSByZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAocmVjb3JkOiBJTWF0Y2guSVJlY29yZCkge1xuICAgIHJldHVybiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSAmJiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gbnVsbCk7XG4gIH0pO1xuICB2YXIgcmVzID0gW107XG4gIGRlYnVnbG9nKFwiTWF0Y2hSZWNvcmRzSGF2aW5nQ29udGV4dCA6IHJlbGV2YW50IHJlY29yZHMgbnI6XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoKTtcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcInNlbnRlbmNlcyBhcmUgOiBcIiArIEpTT04uc3RyaW5naWZ5KHBTZW50ZW5jZXMsIHVuZGVmaW5lZCwgMikpIDogXCItXCIpO1xuICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiY2F0ZWdvcnkgXCIgKyBjYXRlZ29yeSArIFwiIGFuZCBjYXRlZ29yeXNldCBpczogXCIgKyBKU09OLnN0cmluZ2lmeShjYXRlZ29yeVNldCwgdW5kZWZpbmVkLCAyKSkgOiBcIi1cIik7XG4gIGlmIChwcm9jZXNzLmVudi5BQk9UX0ZBU1QgJiYgY2F0ZWdvcnlTZXQpIHtcbiAgICAvLyB3ZSBhcmUgb25seSBpbnRlcmVzdGVkIGluIGNhdGVnb3JpZXMgcHJlc2VudCBpbiByZWNvcmRzIGZvciBkb21haW5zIHdoaWNoIGNvbnRhaW4gdGhlIGNhdGVnb3J5XG4gICAgLy8gdmFyIGNhdGVnb3J5c2V0ID0gTW9kZWwuY2FsY3VsYXRlUmVsZXZhbnRSZWNvcmRDYXRlZ29yaWVzKHRoZU1vZGVsLGNhdGVnb3J5KTtcbiAgICAvL2tub3dpbmcgdGhlIHRhcmdldFxuICAgIHBlcmZsb2coXCJnb3QgY2F0ZWdvcnlzZXQgd2l0aCBcIiArIE9iamVjdC5rZXlzKGNhdGVnb3J5U2V0KS5sZW5ndGgpO1xuICAgIHZhciBmbCA9IDA7XG4gICAgdmFyIGxmID0gMDtcbiAgICB2YXIgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBwU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgdmFyIGZXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICAgIH0pO1xuICAgICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiAhIWNhdGVnb3J5U2V0W29Xb3JkLmNhdGVnb3J5XSB8fCBXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCk7XG4gICAgICB9KTtcbiAgICAgIGZsID0gZmwgKyBvU2VudGVuY2UubGVuZ3RoO1xuICAgICAgbGYgPSBsZiArIHJXb3Jkcy5sZW5ndGg7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCwgLy8gbm90IGEgZmlsbGVyICAvLyB0byBiZSBjb21wYXRpYmxlIGl0IHdvdWxkIGJlIGZXb3Jkc1xuICAgICAgICByV29yZHM6IHJXb3Jkc1xuICAgICAgfTtcbiAgICB9KTtcbiAgICBPYmplY3QuZnJlZXplKGFTaW1wbGlmaWVkU2VudGVuY2VzKTtcbiAgICBkZWJ1Z2xvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgZmwgKyBcIi0+XCIgKyBsZiArIFwiKVwiKTtcbiAgICBwZXJmbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyBmbCArIFwiLT5cIiArIGxmICsgXCIpXCIpO1xuICAgIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgICB2YXIgaGFzQ2F0ZWdvcnkgPSB7fTtcbiAgICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSBhU2VudGVuY2UuY250UmVsZXZhbnRXb3JkcztcbiAgICAgICAgYVNlbnRlbmNlLnJXb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCkgJiYgcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICBoYXNDYXRlZ29yeVtvV29yZC5tYXRjaGVkU3RyaW5nXSA9IDE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIGlmICgoT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoICsgT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aCkgPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLm9TZW50ZW5jZSxcbiAgICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxuICAgICAgICAgICAgcmVzdWx0OiByZWNvcmRbY2F0ZWdvcnldLFxuICAgICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSk7XG4gICAgZGVidWdsb2coXCJoZXJlIGluIHdlaXJkXCIpO1xuICB9IGVsc2Uge1xuICAgIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgIHBTZW50ZW5jZXMuc2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgICB2YXIgaGFzQ2F0ZWdvcnkgPSB7fTtcbiAgICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSAwO1xuICAgICAgICBhU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICBpZiAoIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCkpIHtcbiAgICAgICAgICAgIGNudFJlbGV2YW50V29yZHMgPSBjbnRSZWxldmFudFdvcmRzICsgMTtcbiAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICAgIG1hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpICYmIHJlY29yZFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgICBoYXNDYXRlZ29yeVtvV29yZC5tYXRjaGVkU3RyaW5nXSA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKChPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoKSA+IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aCkge1xuICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2UsXG4gICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICAgIHJlc3VsdDogcmVjb3JkW2NhdGVnb3J5XSxcbiAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0pO1xuICB9XG4gIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmcpO1xuICBkZWJ1Z2xvZyhcIiBhZnRlciBzb3J0XCIgKyByZXMubGVuZ3RoKTtcbiAgdmFyIHJlc3VsdCA9IE9iamVjdC5hc3NpZ24oe30sIHBTZW50ZW5jZXMsIHsgYW5zd2VyczogcmVzIH0pO1xuICByZXR1cm4gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0KHJlc3VsdCk7XG59XG4qL1xuXG4vKlxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVjb3JkcyhhU2VudGVuY2VzOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcywgY2F0ZWdvcnk6IHN0cmluZywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+KVxuICA6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzQW5zd2VycyB7XG4gIC8vIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gIC8vICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gIC8vIH1cbiAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQ6IElNYXRjaC5JUmVjb3JkKSB7XG4gICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnldICE9PSBudWxsKTtcbiAgfSk7XG4gIHZhciByZXMgPSBbXTtcbiAgZGVidWdsb2coXCJyZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCk7XG4gIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICBhU2VudGVuY2VzLnNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgIHZhciBtaXNtYXRjaGVkID0ge31cbiAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IDA7XG4gICAgICBhU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgaWYgKCFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpKSB7XG4gICAgICAgICAgY250UmVsZXZhbnRXb3JkcyA9IGNudFJlbGV2YW50V29yZHMgKyAxO1xuICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGlmIChPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2UsXG4gICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxuICAgICAgICAgIHJlc3VsdDogcmVjb3JkW2NhdGVnb3J5XSxcbiAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmcobWF0Y2hlZCwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSlcbiAgfSk7XG4gIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmcpO1xuICB2YXIgcmVzdWx0ID0gT2JqZWN0LmFzc2lnbih7fSwgYVNlbnRlbmNlcywgeyBhbnN3ZXJzOiByZXMgfSk7XG4gIHJldHVybiBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHQocmVzdWx0KTtcbn1cbiovXG4vKlxuZnVuY3Rpb24gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXNDYXRlZ29yeVNldChhU2VudGVuY2VzOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcyxcbiAgY2F0ZWdvcnlTZXQ6IHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB9LCB0cmFjazogeyBmbDogbnVtYmVyLCBsZjogbnVtYmVyIH1cbik6IHtcbiAgZG9tYWluczogc3RyaW5nW10sXG4gIG9TZW50ZW5jZTogSU1hdGNoLklTZW50ZW5jZSxcbiAgY250UmVsZXZhbnRXb3JkczogbnVtYmVyLFxuICByV29yZHM6IElNYXRjaC5JV29yZFtdXG59W10ge1xuICByZXR1cm4gYVNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICB2YXIgYURvbWFpbnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJkb21haW5cIikge1xuICAgICAgICBhRG9tYWlucy5wdXNoKG9Xb3JkLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwibWV0YVwiKSB7XG4gICAgICAgIC8vIGUuZy4gZG9tYWluIFhYWFxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gISFjYXRlZ29yeVNldFtvV29yZC5jYXRlZ29yeV07XG4gICAgfSk7XG4gICAgdHJhY2suZmwgKz0gb1NlbnRlbmNlLmxlbmd0aDtcbiAgICB0cmFjay5sZiArPSByV29yZHMubGVuZ3RoO1xuICAgIHJldHVybiB7XG4gICAgICBkb21haW5zOiBhRG9tYWlucyxcbiAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCxcbiAgICAgIHJXb3JkczogcldvcmRzXG4gICAgfTtcbiAgfSk7XG59XG4qL1xuXG5mdW5jdGlvbiBtYWtlU2ltcGxpZmllZFNlbnRlbmNlc0NhdGVnb3J5U2V0MihhU2VudGVuY2VzOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcyxcbiAgY2F0ZWdvcnlTZXQ6IHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB9LCB0cmFjazogeyBmbDogbnVtYmVyLCBsZjogbnVtYmVyIH1cbik6IHtcbiAgZG9tYWluczogc3RyaW5nW10sXG4gIG9TZW50ZW5jZTogSU1hdGNoLklTZW50ZW5jZSxcbiAgY250UmVsZXZhbnRXb3JkczogbnVtYmVyLFxuICByV29yZHM6IElNYXRjaC5JV29yZFtdXG59W10ge1xuICByZXR1cm4gYVNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICB2YXIgYURvbWFpbnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJkb21haW5cIikge1xuICAgICAgICBhRG9tYWlucy5wdXNoKG9Xb3JkLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwibWV0YVwiKSB7XG4gICAgICAgIC8vIGUuZy4gZG9tYWluIFhYWFxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZihvV29yZC5jYXRlZ29yeSA9PT0gXCJjYXRlZ29yeVwiKSB7XG4gICAgICAgIGlmKGNhdGVnb3J5U2V0W29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiAhIWNhdGVnb3J5U2V0W29Xb3JkLmNhdGVnb3J5XTtcbiAgICB9KTtcbiAgICB0cmFjay5mbCArPSBvU2VudGVuY2UubGVuZ3RoO1xuICAgIHRyYWNrLmxmICs9IHJXb3Jkcy5sZW5ndGg7XG4gICAgcmV0dXJuIHtcbiAgICAgIGRvbWFpbnM6IGFEb21haW5zLFxuICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLFxuICAgICAgcldvcmRzOiByV29yZHNcbiAgICB9O1xuICB9KTtcbn1cblxuXG5mdW5jdGlvbiBtYWtlU2ltcGxpZmllZFNlbnRlbmNlcyhhU2VudGVuY2VzIDogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMsICB0cmFjazogeyBmbDogbnVtYmVyLCBsZjogbnVtYmVyIH0pOiB7XG4gIGRvbWFpbnM6IHN0cmluZ1tdLFxuICBvU2VudGVuY2U6IElNYXRjaC5JU2VudGVuY2UsXG4gIGNudFJlbGV2YW50V29yZHM6IG51bWJlcixcbiAgcldvcmRzOiBJTWF0Y2guSVdvcmRbXVxufVtdIHtcbiAgcmV0dXJuIGFTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgdmFyIGRvbWFpbnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJkb21haW5cIikge1xuICAgICAgICBkb21haW5zLnB1c2gob1dvcmQubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJtZXRhXCIpIHtcbiAgICAgICAgLy8gZS5nLiBkb21haW4gWFhYXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICB9KTtcbiAgICB0cmFjay5mbCArPSBvU2VudGVuY2UubGVuZ3RoO1xuICAgIHRyYWNrLmxmICs9IHJXb3Jkcy5sZW5ndGg7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgZG9tYWluczogZG9tYWlucyxcbiAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsXG4gICAgICByV29yZHM6IHJXb3Jkc1xuICAgIH07XG4gIH0pO1xufVxuXG5cbmZ1bmN0aW9uIGV4dHJhY3RSZXN1bHQoY2F0ZWdvcmllczogc3RyaW5nW10sIHJlY29yZDogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfSk6IHN0cmluZ1tdIHtcbiAgcmV0dXJuIGNhdGVnb3JpZXMubWFwKGZ1bmN0aW9uIChjYXRlZ29yeSkgeyByZXR1cm4gcmVjb3JkW2NhdGVnb3J5XSB8fCBcIm4vYVwiOyB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzKHBTZW50ZW5jZXM6IElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzLCBjYXRlZ29yaWVzOiBzdHJpbmdbXSwgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+LCBkb21haW5DYXRlZ29yeUZpbHRlcj86IElNYXRjaC5JRG9tYWluQ2F0ZWdvcnlGaWx0ZXIpXG4gIDogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNUdXBlbEFuc3dlcnMge1xuICAvLyBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAvLyAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gIC8vIH1cblxuICBpZihkb21haW5DYXRlZ29yeUZpbHRlciAmJiAhIGRvbWFpbkNhdGVnb3J5RmlsdGVyLmRvbWFpbnMgKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwib2xkIGNhdGVnb3J5c1NFdCA/P1wiKVxuICB9XG5cbiAgT2JqZWN0LmZyZWV6ZShkb21haW5DYXRlZ29yeUZpbHRlcik7XG4gIHZhciBjYXRlZ29yeUYgPSBjYXRlZ29yaWVzWzBdO1xuXG4gIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJtYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcyAocj1cIiArIChyZWNvcmRzICYmIHJlY29yZHMubGVuZ3RoKVxuICArIFwiIHM9XCIgKyAocFNlbnRlbmNlcyAmJiBwU2VudGVuY2VzLnNlbnRlbmNlcyAmJiBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGgpICsgXCIpXFxuIGNhdGVnb3JpZXM6XCIgKyhjYXRlZ29yaWVzICYmICBjYXRlZ29yaWVzLmpvaW4oXCJcXG5cIikpICsgXCIgY2F0ZWdvcnlTZXQ6IFwiXG4gICsgKCBkb21haW5DYXRlZ29yeUZpbHRlciAmJiAodHlwZW9mIGRvbWFpbkNhdGVnb3J5RmlsdGVyLmNhdGVnb3J5U2V0ID09PSBcIm9iamVjdFwiKSAmJiBPYmplY3Qua2V5cyhkb21haW5DYXRlZ29yeUZpbHRlci5jYXRlZ29yeVNldCkuam9pbihcIlxcblwiKSkpICA6IFwiLVwiKTtcbiAgcGVyZmxvZyhcIm1hdGNoUmVjb3Jkc1F1aWNrTXVsdCAuLi4ocj1cIiArIHJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiKVwiKTtcblxuICAvL2NvbnNvbGUubG9nKCdjYXRlZ29yaWVzICcgKyAgSlNPTi5zdHJpbmdpZnkoY2F0ZWdvcmllcykpO1xuXG4gIC8vY29uc29sZS5sb2coJ2NhdGVncm95U2V0JyArICBKU09OLnN0cmluZ2lmeShjYXRlZ29yeVNldCkpO1xuXG5cbiAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHM7XG5cbiAgaWYoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIgJiYgZG9tYWluQ2F0ZWdvcnlGaWx0ZXIuZG9tYWlucykge1xuICAgIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQ6IElNYXRjaC5JUmVjb3JkKSB7XG4gICAgICByZXR1cm4gKGRvbWFpbkNhdGVnb3J5RmlsdGVyLmRvbWFpbnMuaW5kZXhPZigocmVjb3JkIGFzIGFueSkuX2RvbWFpbikgPj0gMCk7XG4gICAgfSk7XG4gIH1cbiAgZWxzZSB7XG4gICAgcmVsZXZhbnRSZWNvcmRzID0gcmVsZXZhbnRSZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAocmVjb3JkOiBJTWF0Y2guSVJlY29yZCkge1xuICAgICAgcmV0dXJuICFjYXRlZ29yaWVzLmV2ZXJ5KGNhdCA9PlxuICAgICAgICAgICAgKHJlY29yZFtjYXRdID09PSB1bmRlZmluZWQpIHx8IChyZWNvcmRbY2F0XSA9PT0gbnVsbClcbiAgICAgICk7XG4gIC8vICAgICAgfVxuXG4gLy8gICAgIHJldHVybiAocmVjb3JkW2NhdGVnb3J5Rl0gIT09IHVuZGVmaW5lZCkgJiYgKHJlY29yZFtjYXRlZ29yeUZdICE9PSBudWxsKTtcbiAgICB9KTtcbiAgfVxuICB2YXIgcmVzID0gW10gYXMgQXJyYXk8SU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlcj47XG4gIGRlYnVnbG9nKFwicmVsZXZhbnQgcmVjb3JkcyB3aXRoIGZpcnN0IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiKVwiKTtcbiAgcGVyZmxvZyhcInJlbGV2YW50IHJlY29yZHMgd2l0aCBmaXJzdCBucjpcIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzZW50ZW5jZXMgXCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGgpO1xuICBpZiAoLypwcm9jZXNzLmVudi5BQk9UX0ZBU1QgJiYqLyBkb21haW5DYXRlZ29yeUZpbHRlcikge1xuICAgIC8vIHdlIGFyZSBvbmx5IGludGVyZXN0ZWQgaW4gY2F0ZWdvcmllcyBwcmVzZW50IGluIHJlY29yZHMgZm9yIGRvbWFpbnMgd2hpY2ggY29udGFpbiB0aGUgY2F0ZWdvcnlcbiAgICAvLyB2YXIgY2F0ZWdvcnlzZXQgPSBNb2RlbC5jYWxjdWxhdGVSZWxldmFudFJlY29yZENhdGVnb3JpZXModGhlTW9kZWwsY2F0ZWdvcnkpO1xuICAgIC8va25vd2luZyB0aGUgdGFyZ2V0XG4gICAgcGVyZmxvZyhcImdvdCBjYXRlZ29yeXNldCB3aXRoIFwiICsgT2JqZWN0LmtleXMoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIuY2F0ZWdvcnlTZXQpLmxlbmd0aCk7XG4gICAgdmFyIG9iaiA9IHsgZmw6IDAsIGxmOiAwIH07XG4gICAgdmFyIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gW10gYXMge1xuICAgICAgZG9tYWluczogc3RyaW5nW10sXG4gICAgICBvU2VudGVuY2U6IElNYXRjaC5JU2VudGVuY2UsXG4gICAgICBjbnRSZWxldmFudFdvcmRzOiBudW1iZXIsXG4gICAgICByV29yZHM6IElNYXRjaC5JV29yZFtdXG4gICAgfVtdO1xuICAvLyAgaWYgKHByb2Nlc3MuZW52LkFCT1RfQkVUMSkge1xuICAgICBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzQ2F0ZWdvcnlTZXQyKHBTZW50ZW5jZXMsIGRvbWFpbkNhdGVnb3J5RmlsdGVyLmNhdGVnb3J5U2V0LCBvYmopIGFzIGFueTtcbiAgLy8gIH0gZWxzZSB7XG4gIC8vICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXNDYXRlZ29yeVNldChwU2VudGVuY2VzLCBjYXRlZ29yeVNldCwgb2JqKSBhcyBhbnk7XG4gIC8vICB9XG4gICAgcGVyZmxvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgb2JqLmZsICsgXCItPlwiICsgb2JqLmxmICsgXCIpXCIpO1xuICB9IGVsc2Uge1xuICAgIGRlYnVnbG9nKFwibm90IGFib3RfZmFzdCAhXCIpO1xuICAgIHZhciB0cmFjayA9IHsgZmw6IDAgLCBsZiA6IDB9O1xuICAgIHZhciBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzKHBTZW50ZW5jZXMsdHJhY2spO1xuLypcbiAgICBwU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICAgIH0pO1xuICAgICAgZmwgPSBmbCArIG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgICBsZiA9IGxmICsgcldvcmRzLmxlbmd0aDtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLFxuICAgICAgICByV29yZHM6IHJXb3Jkc1xuICAgICAgfTtcbiAgICB9KTtcbiAgICAqL1xuICAgIGRlYnVnbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyB0cmFjay5mbCArIFwiLT5cIiArIHRyYWNrLmxmICsgXCIpXCIpO1xuICAgIHBlcmZsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIHRyYWNrLmZsICsgXCItPlwiICsgdHJhY2subGYgKyBcIilcIik7XG4gIH1cblxuICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiaGVyZSBzaW1wbGlmaWVkIHNlbnRlbmNlcyBcIiArXG4gIGFTaW1wbGlmaWVkU2VudGVuY2VzLm1hcChvID0+IFwiXFxuRG9tYWluPVwiICsgby5kb21haW5zLmpvaW4oXCJcXG5cIikgKyBcIlxcblwiICsgIFNlbnRlbmNlLmR1bXBOaWNlKG8ucldvcmRzKSkuam9pbihcIlxcblwiKSkgOiBcIi1cIik7XG5cbiAgLy9jb25zb2xlLmxvZyhcImhlcmUgcmVjcm9kc1wiICsgcmVsZXZhbnRSZWNvcmRzLm1hcCggKG8saW5kZXgpID0+ICBcIiBpbmRleCA9IFwiICsgaW5kZXggKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KG8pKS5qb2luKFwiXFxuXCIpKTtcbiAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgdmFyIGltaXNtYXRjaGVkID0gMDtcbiAgICAgIHZhciBpbWF0Y2hlZCA9IDA7XG4gICAgICB2YXIgbm91c2UgPSAwO1xuICAgICAgdmFyIGZvdW5kY2F0ID0gMTtcbiAgICAgIHZhciBtaXNzaW5nY2F0ID0gMDtcblxuICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgIHZhciBtaXNtYXRjaGVkID0ge307XG4gICAgICB2YXIgaGFzQ2F0ZWdvcnkgPSB7fTtcblxuICAgICAgYVNlbnRlbmNlLnJXb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IDA7XG4gICAgICAgIGlmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgKytpbWF0Y2hlZDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgKytpbWlzbWF0Y2hlZDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICE9PSBcImNhdGVnb3J5XCIpIHtcbiAgICAgICAgICAgIG5vdXNlICs9IDE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICghcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICAgIG1pc3NpbmdjYXQgKz0gMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGZvdW5kY2F0Kz0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICYmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCkgJiYgcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICBoYXNDYXRlZ29yeVtvV29yZC5tYXRjaGVkU3RyaW5nXSA9IDE7XG4gICAgICAgIH0gZWxzZSBpZighV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpKSB7XG4gICAgICAgICAgIC8vIFRPRE8gYmV0dGVyIHVubWFjaHRlZFxuICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB2YXIgbWF0Y2hlZERvbWFpbiA9IDA7XG4gICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IGFTZW50ZW5jZS5yV29yZHMubGVuZ3RoO1xuICAgICAgaWYgKGFTZW50ZW5jZS5kb21haW5zLmxlbmd0aCkge1xuICAgICAgICBpZiAoKHJlY29yZCBhcyBhbnkpLl9kb21haW4gIT09IGFTZW50ZW5jZS5kb21haW5zWzBdKSB7XG4gICAgICAgICAgaW1pc21hdGNoZWQgPSAzMDAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGltYXRjaGVkICs9IDE7XG4gICAgICAgICAgbWF0Y2hlZERvbWFpbiArPSAxO1xuICAgICAgICAgIC8vY29uc29sZS5sb2coXCJHT1QgQSBET01BSU4gSElUXCIgKyBtYXRjaGVkICsgXCIgXCIgKyBtaXNtYXRjaGVkKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdmFyIG1hdGNoZWRMZW4gPSBPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoO1xuICAgICAgdmFyIG1pc21hdGNoZWRMZW4gPSBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGg7XG4gICAgICBpZiAoKGltaXNtYXRjaGVkIDwgMzAwMClcbiAgICAgICAgJiYgKChtYXRjaGVkTGVuID4gbWlzbWF0Y2hlZExlbilcbiAgICAgICAgICB8fCAobWF0Y2hlZExlbiA9PT0gbWlzbWF0Y2hlZExlbiAmJiBtYXRjaGVkRG9tYWluID4gMCkpXG4gICAgICApIHtcbiAgICAgICAgLypcbiAgICAgICAgICBkZWJ1Z2xvZyhcImFkZGluZyBcIiArIGV4dHJhY3RSZXN1bHQoY2F0ZWdvcmllcyxyZWNvcmQpLmpvaW4oXCI7XCIpKTtcbiAgICAgICAgICBkZWJ1Z2xvZyhcIndpdGggcmFua2luZyA6IFwiICsgY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeTIobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMsIG1hdGNoZWREb21haW4pKTtcbiAgICAgICAgICBkZWJ1Z2xvZyhcIiBjcmVhdGVkIGJ5IFwiICsgT2JqZWN0LmtleXMobWF0Y2hlZCkubWFwKGtleSA9PiBcImtleTpcIiArIGtleVxuICAgICAgICAgICsgXCJcXG5cIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRba2V5XSkpLmpvaW4oXCJcXG5cIilcbiAgICAgICAgICArIFwiXFxuaGFzQ2F0IFwiICsgSlNPTi5zdHJpbmdpZnkoaGFzQ2F0ZWdvcnkpXG4gICAgICAgICAgKyBcIlxcbm1pc21hdCBcIiArIEpTT04uc3RyaW5naWZ5KG1pc21hdGNoZWQpXG4gICAgICAgICAgKyBcIlxcbmNuVHJlbCBcIiArIEpTT04uc3RyaW5naWZ5KGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgKyBcIlxcbm1hdGNlZERvbWFpbiBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWREb21haW4pXG4gICAgICAgICAgKyBcIlxcbmhhc0NhdCBcIiArIE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KVxuICAgICAgICAgICsgXCJcXG5taXNtYXQgXCIgKyBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKVxuICAgICAgICAgICsgYFxcbm1hdGNoZWQgJHtPYmplY3Qua2V5cyhtYXRjaGVkKX0gXFxuaGFzY2F0ICR7T2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmpvaW4oXCI7IFwiKX0gXFxubWlzbTogJHtPYmplY3Qua2V5cyhtaXNtYXRjaGVkKX0gXFxuYFxuICAgICAgICAgICsgXCJcXG5tYXRjZWREb21haW4gXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkRG9tYWluKVxuXG4gICAgICAgICAgKTtcbiAgICAgICAgICAqL1xuXG4gICAgICAgIHZhciByZWMgPSB7XG4gICAgICAgICAgc2VudGVuY2U6IGFTZW50ZW5jZS5vU2VudGVuY2UsXG4gICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgY2F0ZWdvcmllczogY2F0ZWdvcmllcyxcbiAgICAgICAgICByZXN1bHQ6IGV4dHJhY3RSZXN1bHQoY2F0ZWdvcmllcywgcmVjb3JkKSxcbiAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcywgbWF0Y2hlZERvbWFpbilcbiAgICAgICAgfTtcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcImhlcmUgcmFua2luZ1wiICsgcmVjLl9yYW5raW5nKVxuICAgICAgICBpZiAoKHJlYy5fcmFua2luZyA9PT0gbnVsbCkgfHwgIXJlYy5fcmFua2luZykge1xuICAgICAgICAgIHJlYy5fcmFua2luZyA9IDAuOTtcbiAgICAgICAgfVxuICAgICAgICByZXMucHVzaChyZWMpO1xuICAgICAgfVxuICAgIH0pXG4gIH0pO1xuICBwZXJmbG9nKFwic29ydCAoYT1cIiArIHJlcy5sZW5ndGggKyBcIilcIik7XG4gIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbCk7XG4gIHBlcmZsb2coXCJNUlFNQyBmaWx0ZXJSZXRhaW4gLi4uXCIpO1xuICB2YXIgcmVzdWx0MSA9IE9iamVjdC5hc3NpZ24oeyB0dXBlbGFuc3dlcnM6IHJlcyB9LCBwU2VudGVuY2VzKTtcbiAgLypkZWJ1Z2xvZyhcIk5FV01BUFwiICsgcmVzLm1hcChvID0+IFwiXFxucmFua1wiICsgby5fcmFua2luZyArIFwiID0+XCJcbiAgICAgICAgICAgICAgKyBvLnJlc3VsdC5qb2luKFwiXFxuXCIpKS5qb2luKFwiXFxuXCIpKTsgKi9cbiAgdmFyIHJlc3VsdDIgPSBmaWx0ZXJEaXN0aW5jdFJlc3VsdEFuZFNvcnRUdXBlbChyZXN1bHQxKTtcbiAgcGVyZmxvZyhcIk1SUU1DIG1hdGNoUmVjb3Jkc1F1aWNrIGRvbmU6IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBhPVwiICsgcmVzLmxlbmd0aCArIFwiKVwiKTtcbiAgcmV0dXJuIHJlc3VsdDI7XG59XG5cblxuZnVuY3Rpb24gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KHdvcmQ6IHN0cmluZywgdGFyZ2V0Y2F0ZWdvcnk6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLFxuICB3aG9sZXNlbnRlbmNlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAvL2NvbnNvbGUubG9nKFwiY2xhc3NpZnkgXCIgKyB3b3JkICsgXCIgXCIgICsgdGFyZ2V0Y2F0ZWdvcnkpO1xuICB2YXIgY2F0cyA9IElucHV0RmlsdGVyLmNhdGVnb3JpemVBV29yZCh3b3JkLCBydWxlcywgd2hvbGVzZW50ZW5jZSwge30pO1xuICAvLyBUT0RPIHF1YWxpZnlcbiAgY2F0cyA9IGNhdHMuZmlsdGVyKGZ1bmN0aW9uIChjYXQpIHtcbiAgICByZXR1cm4gY2F0LmNhdGVnb3J5ID09PSB0YXJnZXRjYXRlZ29yeTtcbiAgfSlcbiAgLy9kZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShjYXRzKSk7XG4gIGlmIChjYXRzLmxlbmd0aCkge1xuICAgIHJldHVybiBjYXRzWzBdLm1hdGNoZWRTdHJpbmc7XG4gIH1cbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZUNhdGVnb3J5KGNhdGVnb3J5d29yZDogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHdob2xlc2VudGVuY2U6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBjbGFzc2lmeVdvcmRXaXRoVGFyZ2V0Q2F0ZWdvcnkoY2F0ZWdvcnl3b3JkLCAnY2F0ZWdvcnknLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzcGxpdEF0Q29tbWFBbmQoc3RyOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIHZhciByID0gc3RyLnNwbGl0KC8oXFxiYW5kXFxiKXxbLF0vKTtcbiAgciA9IHIuZmlsdGVyKGZ1bmN0aW9uIChvLCBpbmRleCkge1xuICAgIGlmIChpbmRleCAlIDIgPiAwKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9KTtcbiAgdmFyIHJ0cmltbWVkID0gci5tYXAoZnVuY3Rpb24gKG8pIHtcbiAgICByZXR1cm4gbmV3IFN0cmluZyhvKS50cmltKCk7XG4gIH0pO1xuICByZXR1cm4gcnRyaW1tZWQ7XG59XG4vKipcbiAqIEEgc2ltcGxlIGltcGxlbWVudGF0aW9uLCBzcGxpdHRpbmcgYXQgYW5kIGFuZCAsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhbmFseXplQ2F0ZWdvcnlNdWx0T25seUFuZENvbW1hKGNhdGVnb3J5bGlzdDogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHdob2xlc2VudGVuY2U6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgdmFyIHJ0cmltbWVkID0gc3BsaXRBdENvbW1hQW5kKGNhdGVnb3J5bGlzdCk7XG4gIHZhciByY2F0ID0gcnRyaW1tZWQubWFwKGZ1bmN0aW9uIChvKSB7XG4gICAgcmV0dXJuIGFuYWx5emVDYXRlZ29yeShvLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG4gIH0pO1xuICBpZiAocmNhdC5pbmRleE9mKHVuZGVmaW5lZCkgPj0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignXCInICsgcnRyaW1tZWRbcmNhdC5pbmRleE9mKHVuZGVmaW5lZCldICsgJ1wiIGlzIG5vdCBhIGNhdGVnb3J5IScpO1xuICB9XG4gIHJldHVybiByY2F0O1xufVxuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlckFjY2VwdGluZ09ubHkocmVzOiBJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11bXSwgY2F0ZWdvcmllczogc3RyaW5nW10pOlxuICBJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11bXSB7XG4gIHJldHVybiByZXMuZmlsdGVyKGZ1bmN0aW9uIChhU2VudGVuY2UsIGlJbmRleCkge1xuICAgIHJldHVybiBhU2VudGVuY2UuZXZlcnkoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICByZXR1cm4gY2F0ZWdvcmllcy5pbmRleE9mKG9Xb3JkLmNhdGVnb3J5KSA+PSAwO1xuICAgIH0pO1xuICB9KVxufVxuXG5cbmltcG9ydCAqIGFzIEVyYmFzZSBmcm9tICcuL2VyYmFzZSc7XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHByb2Nlc3NTdHJpbmcocXVlcnk6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzXG4pOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcyB7XG5cbi8vICBpZiAoIXByb2Nlc3MuZW52LkFCT1RfT0xETUFUQ0gpIHtcbiAgICByZXR1cm4gRXJiYXNlLnByb2Nlc3NTdHJpbmcocXVlcnksIHJ1bGVzLCBydWxlcy53b3JkQ2FjaGUpO1xuLy8gIH1cbi8qXG4gIHZhciBtYXRjaGVkID0gSW5wdXRGaWx0ZXIuYW5hbHl6ZVN0cmluZyhxdWVyeSwgcnVsZXMsIHNXb3Jkcyk7XG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgZGVidWdsb2coXCJBZnRlciBtYXRjaGVkIFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZCkpO1xuICB9XG4gIHZhciBhU2VudGVuY2VzID0gSW5wdXRGaWx0ZXIuZXhwYW5kTWF0Y2hBcnIobWF0Y2hlZCk7XG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgZGVidWdsb2coXCJhZnRlciBleHBhbmRcIiArIGFTZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICB9XG4gIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IElucHV0RmlsdGVyLnJlaW5Gb3JjZShhU2VudGVuY2VzKTtcbiAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICBkZWJ1Z2xvZyhcImFmdGVyIHJlaW5mb3JjZVwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICB9XG4gIHJldHVybiB7XG4gICAgZXJyb3JzOiBbXSxcbiAgICBzZW50ZW5jZXM6IGFTZW50ZW5jZXNSZWluZm9yY2VkXG4gIH0gYXMgSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXM7XG4qL1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBhbmFseXplQ29udGV4dFN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmc6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzKTpcbiAgSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMge1xuXG4gIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IHByb2Nlc3NTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcylcbiAgLy8gd2UgbGltaXQgYW5hbHlzaXMgdG8gbiBzZW50ZW5jZXNcbiAgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzID0gYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLnNsaWNlKDAsIEFsZ29sLkN1dG9mZl9TZW50ZW5jZXMpO1xuICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgIGRlYnVnbG9nKFwiYWZ0ZXIgcmVpbmZvcmNlIGFuZCBjdXRvZmZcIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5sZW5ndGggKyBcIlxcblwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgfVxuICByZXR1cm4gYVNlbnRlbmNlc1JlaW5mb3JjZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjbXBCeU5yQ2F0ZWdvcmllc0FuZFNhbWVEb21haW4oYTogSU1hdGNoLklTZW50ZW5jZSwgYjogSU1hdGNoLklTZW50ZW5jZSk6IG51bWJlciB7XG4gIC8vY29uc29sZS5sb2coXCJjb21wYXJlIGFcIiArIGEgKyBcIiBjbnRiIFwiICsgYik7XG4gIHZhciBjbnRhID0gU2VudGVuY2UuZ2V0RGlzdGluY3RDYXRlZ29yaWVzSW5TZW50ZW5jZShhKS5sZW5ndGg7XG4gIHZhciBjbnRiID0gU2VudGVuY2UuZ2V0RGlzdGluY3RDYXRlZ29yaWVzSW5TZW50ZW5jZShiKS5sZW5ndGg7XG4gIC8qXG4gICAgdmFyIGNudGEgPSBhLnJlZHVjZShmdW5jdGlvbihwcmV2LCBvV29yZCkge1xuICAgICAgcmV0dXJuIHByZXYgKyAoKG9Xb3JkLmNhdGVnb3J5ID09PSBcImNhdGVnb3J5XCIpPyAxIDogMCk7XG4gICAgfSwwKTtcbiAgICB2YXIgY250YiA9IGIucmVkdWNlKGZ1bmN0aW9uKHByZXYsIG9Xb3JkKSB7XG4gICAgICByZXR1cm4gcHJldiArICgob1dvcmQuY2F0ZWdvcnkgPT09IFwiY2F0ZWdvcnlcIik/IDEgOiAwKTtcbiAgICB9LDApO1xuICAgLy8gY29uc29sZS5sb2coXCJjbnQgYVwiICsgY250YSArIFwiIGNudGIgXCIgKyBjbnRiKTtcbiAgICovXG4gIHJldHVybiBjbnRiIC0gY250YTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVDYXRlZ29yeU11bHQoY2F0ZWdvcnlsaXN0OiBzdHJpbmcsIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgd2hvbGVzZW50ZW5jZTogc3RyaW5nLCBnV29yZHM6XG4gIHsgW2tleTogc3RyaW5nXTogSU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdIH0pOiBzdHJpbmdbXSB7XG5cblxuXG5cblxuICB2YXIgcmVzID0gYW5hbHl6ZUNvbnRleHRTdHJpbmcoY2F0ZWdvcnlsaXN0LCBydWxlcyk7XG4gIC8vICBkZWJ1Z2xvZyhcInJlc3VsdGluZyBjYXRlZ29yeSBzZW50ZW5jZXNcIiwgSlNPTi5zdHJpbmdpZnkocmVzKSk7XG4gIHZhciByZXMyID0gZmlsdGVyQWNjZXB0aW5nT25seShyZXMuc2VudGVuY2VzLCBbXCJjYXRlZ29yeVwiLCBcImZpbGxlclwiXSk7XG4gIC8vICBjb25zb2xlLmxvZyhcImhlcmUgcmVzMlwiICsgSlNPTi5zdHJpbmdpZnkocmVzMikgKTtcbiAgLy8gIGNvbnNvbGUubG9nKFwiaGVyZSB1bmRlZmluZWQgISArIFwiICsgcmVzMi5maWx0ZXIobyA9PiAhbykubGVuZ3RoKTtcbiAgcmVzMi5zb3J0KFNlbnRlbmNlLmNtcFJhbmtpbmdQcm9kdWN0KTtcbiAgZGVidWdsb2coXCJyZXN1bHRpbmcgY2F0ZWdvcnkgc2VudGVuY2VzOiBcXG5cIiwgZGVidWdsb2cuZW5hYmxlZCA/IChTZW50ZW5jZS5kdW1wTmljZUFycihyZXMyLnNsaWNlKDAsIDMpLCBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdCkpIDogJy0nKTtcbiAgLy8gVE9ETzogICByZXMyID0gZmlsdGVyQWNjZXB0aW5nT25seVNhbWVEb21haW4ocmVzMik7XG4gIC8vZGVidWdsb2coXCJyZXN1bHRpbmcgY2F0ZWdvcnkgc2VudGVuY2VzXCIsIEpTT04uc3RyaW5naWZ5KHJlczIsIHVuZGVmaW5lZCwgMikpO1xuICAvLyBleHBlY3Qgb25seSBjYXRlZ29yaWVzXG4gIC8vIHdlIGNvdWxkIHJhbmsgbm93IGJ5IGNvbW1vbiBkb21haW5zICwgYnV0IGZvciBub3cgd2Ugb25seSB0YWtlIHRoZSBmaXJzdCBvbmVcbiAgaWYgKCFyZXMyLmxlbmd0aCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgLy9yZXMuc29ydChjbXBCeU5yQ2F0ZWdvcmllc0FuZFNhbWVEb21haW4pO1xuICB2YXIgcmVzY2F0ID0gU2VudGVuY2UuZ2V0RGlzdGluY3RDYXRlZ29yaWVzSW5TZW50ZW5jZShyZXMyWzBdKTtcbiAgcmV0dXJuIHJlc2NhdDtcbiAgLy8gXCJcIiByZXR1cm4gcmVzWzBdLmZpbHRlcigpXG4gIC8vIHJldHVybiBjbGFzc2lmeVdvcmRXaXRoVGFyZ2V0Q2F0ZWdvcnkoY2F0ZWdvcnlsaXN0LCAnY2F0ZWdvcnknLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhbmFseXplT3BlcmF0b3Iob3B3b3JkOiBzdHJpbmcsIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgd2hvbGVzZW50ZW5jZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGNsYXNzaWZ5V29yZFdpdGhUYXJnZXRDYXRlZ29yeShvcHdvcmQsICdvcGVyYXRvcicsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlKTtcbn1cblxuXG5pbXBvcnQgKiBhcyBFckVycm9yIGZyb20gJy4vZXJlcnJvcic7XG5cbmltcG9ydCAqIGFzIExpc3RBbGwgZnJvbSAnLi9saXN0YWxsJztcbi8vIGNvbnN0IHJlc3VsdCA9IFdoYXRJcy5yZXNvbHZlQ2F0ZWdvcnkoY2F0LCBhMS5lbnRpdHksXG4vLyAgIHRoZU1vZGVsLm1SdWxlcywgdGhlTW9kZWwudG9vbHMsIHRoZU1vZGVsLnJlY29yZHMpO1xuXG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlQ2F0ZWdvcnkoY2F0ZWdvcnk6IHN0cmluZywgY29udGV4dFF1ZXJ5U3RyaW5nOiBzdHJpbmcsXG4gIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+KTogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzIHtcbiAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4geyBlcnJvcnM6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSwgdG9rZW5zOiBbXSwgYW5zd2VyczogW10gfTtcbiAgfSBlbHNlIHtcbiAgICAvKlxuICAgICAgICB2YXIgbWF0Y2hlZCA9IElucHV0RmlsdGVyLmFuYWx5emVTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcyk7XG4gICAgICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJhZnRlciBtYXRjaGVkIFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZCkpOiAnLScpO1xuICAgICAgICB2YXIgYVNlbnRlbmNlcyA9IElucHV0RmlsdGVyLmV4cGFuZE1hdGNoQXJyKG1hdGNoZWQpO1xuICAgICAgICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgZGVidWdsb2coXCJhZnRlciBleHBhbmRcIiArIGFTZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgICAgICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICAgICAgfSAqL1xuXG5cbiAgICAgICAgICAvLyB2YXIgY2F0ZWdvcnlTZXQgPSBNb2RlbC5nZXRBbGxSZWNvcmRDYXRlZ29yaWVzRm9yVGFyZ2V0Q2F0ZWdvcnkodGhlTW9kZWwsIGNhdCwgdHJ1ZSk7XG5cbiAgICB2YXIgcmVzID0gTGlzdEFsbC5saXN0QWxsV2l0aENvbnRleHQoY2F0ZWdvcnksIGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMsIHJlY29yZHMpO1xuICAgIC8vKiBzb3J0IGJ5IHNlbnRlbmNlXG4gICAgcmVzLmFuc3dlcnMuZm9yRWFjaChvID0+IHsgby5fcmFua2luZyA9IG8uX3JhbmtpbmcgKiAgU2VudGVuY2UucmFua2luZ1Byb2R1Y3QoIG8uc2VudGVuY2UgKTsgfSk7XG4gICAgcmVzLmFuc3dlcnMuc29ydChjbXBCeVJhbmtpbmcpO1xuICAgIHJldHVybiByZXM7XG4vKlxuICAgIC8vID8/PyB2YXIgcmVzID0gTGlzdEFsbC5saXN0QWxsSGF2aW5nQ29udGV4dChjYXRlZ29yeSwgY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcywgcmVjb3Jkcyk7XG5cbiAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBwcm9jZXNzU3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMpO1xuICAgIC8vYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24ob1NlbnRlbmNlKSB7IHJldHVybiBJbnB1dEZpbHRlci5yZWluRm9yY2Uob1NlbnRlbmNlKTsgfSk7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImFmdGVyIHJlaW5mb3JjZVwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICB9KS5qb2luKFwiXFxuXCIpKSA6ICctJyk7XG4gICAgdmFyIG1hdGNoZWRBbnN3ZXJzID0gbWF0Y2hSZWNvcmRzKGFTZW50ZW5jZXNSZWluZm9yY2VkLCBjYXRlZ29yeSwgcmVjb3Jkcyk7IC8vYVRvb2w6IEFycmF5PElNYXRjaC5JVG9vbD4pOiBhbnkgLyAqIG9iamVjdHN0cmVhbSogLyB7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcIiBtYXRjaGVkQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMsIHVuZGVmaW5lZCwgMikpIDogJy0nKTtcbiAgICByZXR1cm4gbWF0Y2hlZEFuc3dlcnM7XG4qL1xuIH1cbn1cblxuLypcbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlQ2F0ZWdvcnlPbGQoY2F0ZWdvcnk6IHN0cmluZywgY29udGV4dFF1ZXJ5U3RyaW5nOiBzdHJpbmcsXG4gIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+KTogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzIHtcbiAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4geyBlcnJvcnM6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSwgdG9rZW5zOiBbXSwgYW5zd2VyczogW10gfTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBwcm9jZXNzU3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMpO1xuICAgIC8vYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24ob1NlbnRlbmNlKSB7IHJldHVybiBJbnB1dEZpbHRlci5yZWluRm9yY2Uob1NlbnRlbmNlKTsgfSk7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImFmdGVyIHJlaW5mb3JjZVwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICB9KS5qb2luKFwiXFxuXCIpKSA6ICctJyk7XG4gICAgdmFyIG1hdGNoZWRBbnN3ZXJzID0gbWF0Y2hSZWNvcmRzKGFTZW50ZW5jZXNSZWluZm9yY2VkLCBjYXRlZ29yeSwgcmVjb3Jkcyk7IC8vYVRvb2w6IEFycmF5PElNYXRjaC5JVG9vbD4pOiBhbnkgLyAqIG9iamVjdHN0cmVhbSogLyB7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcIiBtYXRjaGVkQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMsIHVuZGVmaW5lZCwgMikpIDogJy0nKTtcbiAgICByZXR1cm4gbWF0Y2hlZEFuc3dlcnM7XG4gIH1cbn1cbiovXG5cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVDYXRlZ29yaWVzKGNhdGVnb3JpZXM6IHN0cmluZ1tdLCBjb250ZXh0UXVlcnlTdHJpbmc6IHN0cmluZyxcbiAgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzLCBkb21haW5DYXRlZ29yeUZpbHRlciA6IElNYXRjaC5JRG9tYWluQ2F0ZWdvcnlGaWx0ZXIpOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc1R1cGVsQW5zd2VycyB7XG4gIHZhciByZWNvcmRzID0gdGhlTW9kZWwucmVjb3JkcztcbiAgdmFyIHJ1bGVzID0gdGhlTW9kZWwucnVsZXM7XG4gIGlmIChjb250ZXh0UXVlcnlTdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczogW0VyRXJyb3IubWFrZUVycm9yX0VNUFRZX0lOUFVUKCldLFxuICAgICAgdHVwZWxhbnN3ZXJzOiBbXSxcbiAgICAgIHRva2VuczogW11cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gdmFyIGNhdGVnb3J5U2V0ID0gTW9kZWwuZ2V0QWxsUmVjb3JkQ2F0ZWdvcmllc0ZvclRhcmdldENhdGVnb3J5KHRoZU1vZGVsLCBjYXQsIHRydWUpO1xuICAgIHZhciByZXMgPSBMaXN0QWxsLmxpc3RBbGxUdXBlbFdpdGhDb250ZXh0KGNhdGVnb3JpZXMsIGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMsIHJlY29yZHMsIGRvbWFpbkNhdGVnb3J5RmlsdGVyKTtcbiAgICAvLyogc29ydCBieSBzZW50ZW5jZVxuICAgIHJlcy50dXBlbGFuc3dlcnMuZm9yRWFjaChvID0+IHsgby5fcmFua2luZyA9IG8uX3JhbmtpbmcgKiAgU2VudGVuY2UucmFua2luZ1Byb2R1Y3QoIG8uc2VudGVuY2UgKTsgfSk7XG4gICAgcmVzLnR1cGVsYW5zd2Vycy5zb3J0KGNtcEJ5UmFua2luZ1R1cGVsKTtcbiAgICByZXR1cm4gcmVzO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0luZGlzY3JpbWluYXRlUmVzdWx0KHJlc3VsdHM6IEFycmF5PElNYXRjaC5JV2hhdElzQW5zd2VyPik6IHN0cmluZyB7XG4gIHZhciBjbnQgPSByZXN1bHRzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgcmVzdWx0KSB7XG4gICAgaWYgKHNhZmVFcXVhbChyZXN1bHQuX3JhbmtpbmcscmVzdWx0c1swXS5fcmFua2luZykpIHtcbiAgICAgIHJldHVybiBwcmV2ICsgMTtcbiAgICB9XG4gIH0sIDApO1xuICBpZiAoY250ID4gMSkge1xuICAgIC8vIHNlYXJjaCBmb3IgYSBkaXNjcmltaW5hdGluZyBjYXRlZ29yeSB2YWx1ZVxuICAgIHZhciBkaXNjcmltaW5hdGluZyA9IE9iamVjdC5rZXlzKHJlc3VsdHNbMF0ucmVjb3JkKS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGNhdGVnb3J5KSB7XG4gICAgICBpZiAoKGNhdGVnb3J5LmNoYXJBdCgwKSAhPT0gJ18nICYmIGNhdGVnb3J5ICE9PSByZXN1bHRzWzBdLmNhdGVnb3J5KVxuICAgICAgICAmJiAocmVzdWx0c1swXS5yZWNvcmRbY2F0ZWdvcnldICE9PSByZXN1bHRzWzFdLnJlY29yZFtjYXRlZ29yeV0pKSB7XG4gICAgICAgIHByZXYucHVzaChjYXRlZ29yeSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJldjtcbiAgICB9LCBbXSk7XG4gICAgaWYgKGRpc2NyaW1pbmF0aW5nLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIFwiTWFueSBjb21wYXJhYmxlIHJlc3VsdHMsIHBlcmhhcHMgeW91IHdhbnQgdG8gc3BlY2lmeSBhIGRpc2NyaW1pbmF0aW5nIFwiICsgZGlzY3JpbWluYXRpbmcuam9pbignLCcpO1xuICAgIH1cbiAgICByZXR1cm4gJ1lvdXIgcXVlc3Rpb24gZG9lcyBub3QgaGF2ZSBhIHNwZWNpZmljIGFuc3dlcic7XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzSW5kaXNjcmltaW5hdGVSZXN1bHRUdXBlbChyZXN1bHRzOiBBcnJheTxJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyPik6IHN0cmluZyB7XG4gIHZhciBjbnQgPSByZXN1bHRzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgcmVzdWx0KSB7XG4gICAgaWYgKHNhZmVFcXVhbChyZXN1bHQuX3JhbmtpbmcscmVzdWx0c1swXS5fcmFua2luZykpIHtcbiAgICAgIHJldHVybiBwcmV2ICsgMTtcbiAgICB9XG4gIH0sIDApO1xuICBpZiAoY250ID4gMSkge1xuICAgIC8vIHNlYXJjaCBmb3IgYSBkaXNjcmltaW5hdGluZyBjYXRlZ29yeSB2YWx1ZVxuICAgIHZhciBkaXNjcmltaW5hdGluZyA9IE9iamVjdC5rZXlzKHJlc3VsdHNbMF0ucmVjb3JkKS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGNhdGVnb3J5KSB7XG4gICAgICBpZiAoKGNhdGVnb3J5LmNoYXJBdCgwKSAhPT0gJ18nICYmIHJlc3VsdHNbMF0uY2F0ZWdvcmllcy5pbmRleE9mKGNhdGVnb3J5KSA8IDApXG4gICAgICAgICYmIChyZXN1bHRzWzBdLnJlY29yZFtjYXRlZ29yeV0gIT09IHJlc3VsdHNbMV0ucmVjb3JkW2NhdGVnb3J5XSkpIHtcbiAgICAgICAgcHJldi5wdXNoKGNhdGVnb3J5KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIFtdKTtcbiAgICBpZiAoZGlzY3JpbWluYXRpbmcubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gXCJNYW55IGNvbXBhcmFibGUgcmVzdWx0cywgcGVyaGFwcyB5b3Ugd2FudCB0byBzcGVjaWZ5IGEgZGlzY3JpbWluYXRpbmcgXCIgKyBkaXNjcmltaW5hdGluZy5qb2luKCcsJykgKyAnIG9yIHVzZSBcImxpc3QgYWxsIC4uLlwiJztcbiAgICB9XG4gICAgcmV0dXJuICdZb3VyIHF1ZXN0aW9uIGRvZXMgbm90IGhhdmUgYSBzcGVjaWZpYyBhbnN3ZXInO1xuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG4iLCIvKipcbiAqXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5hbmFseXplXG4gKiBAZmlsZSBhbmFseXplLnRzXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXG4gKi9cblwidXNlIHN0cmljdFwiO1xudmFyIElucHV0RmlsdGVyID0gcmVxdWlyZShcIi4vaW5wdXRGaWx0ZXJcIik7XG52YXIgZGVidWcgPSByZXF1aXJlKFwiZGVidWdcIik7XG52YXIgZGVidWdsb2cgPSBkZWJ1Zygnd2hhdGlzJyk7XG52YXIgZGVidWdsb2dWID0gZGVidWcoJ3doYXRWaXMnKTtcbnZhciBwZXJmbG9nID0gZGVidWcoJ3BlcmYnKTtcbmZ1bmN0aW9uIG1vY2tEZWJ1ZyhvKSB7XG4gICAgZGVidWdsb2cgPSBvO1xuICAgIGRlYnVnbG9nViA9IG87XG4gICAgcGVyZmxvZyA9IG87XG59XG5leHBvcnRzLm1vY2tEZWJ1ZyA9IG1vY2tEZWJ1ZztcbnZhciBfID0gcmVxdWlyZShcImxvZGFzaFwiKTtcbnZhciBNYXRjaCA9IHJlcXVpcmUoXCIuL21hdGNoXCIpO1xudmFyIFNlbnRlbmNlID0gcmVxdWlyZShcIi4vc2VudGVuY2VcIik7XG52YXIgV29yZCA9IHJlcXVpcmUoXCIuL3dvcmRcIik7XG52YXIgQWxnb2wgPSByZXF1aXJlKFwiLi9hbGdvbFwiKTtcbi8qXG5leHBvcnQgZnVuY3Rpb24gY21wQnlSZXN1bHRUaGVuUmFua2luZyhhOiBJTWF0Y2guSVdoYXRJc0Fuc3dlciwgYjogSU1hdGNoLklXaGF0SXNBbnN3ZXIpIHtcbiAgdmFyIGNtcCA9IGEucmVzdWx0LmxvY2FsZUNvbXBhcmUoYi5yZXN1bHQpO1xuICBpZiAoY21wKSB7XG4gICAgcmV0dXJuIGNtcDtcbiAgfVxuICByZXR1cm4gLShhLl9yYW5raW5nIC0gYi5fcmFua2luZyk7XG59XG4qL1xuZnVuY3Rpb24gbG9jYWxlQ29tcGFyZUFycnMoYWFyZXN1bHQsIGJicmVzdWx0KSB7XG4gICAgdmFyIGNtcCA9IDA7XG4gICAgdmFyIGJsZW4gPSBiYnJlc3VsdC5sZW5ndGg7XG4gICAgYWFyZXN1bHQuZXZlcnkoZnVuY3Rpb24gKGEsIGluZGV4KSB7XG4gICAgICAgIGlmIChibGVuIDw9IGluZGV4KSB7XG4gICAgICAgICAgICBjbXAgPSAtMTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBjbXAgPSBhLmxvY2FsZUNvbXBhcmUoYmJyZXN1bHRbaW5kZXhdKTtcbiAgICAgICAgaWYgKGNtcCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIGlmIChjbXApIHtcbiAgICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG4gICAgaWYgKGJsZW4gPiBhYXJlc3VsdC5sZW5ndGgpIHtcbiAgICAgICAgY21wID0gKzE7XG4gICAgfVxuICAgIHJldHVybiAwO1xufVxuZnVuY3Rpb24gc2FmZUVxdWFsKGEsIGIpIHtcbiAgICB2YXIgZGVsdGEgPSBhIC0gYjtcbiAgICBpZiAoTWF0aC5hYnMoZGVsdGEpIDwgQWxnb2wuUkFOS0lOR19FUFNJTE9OKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5leHBvcnRzLnNhZmVFcXVhbCA9IHNhZmVFcXVhbDtcbmZ1bmN0aW9uIHNhZmVEZWx0YShhLCBiKSB7XG4gICAgdmFyIGRlbHRhID0gYSAtIGI7XG4gICAgaWYgKE1hdGguYWJzKGRlbHRhKSA8IEFsZ29sLlJBTktJTkdfRVBTSUxPTikge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgcmV0dXJuIGRlbHRhO1xufVxuZXhwb3J0cy5zYWZlRGVsdGEgPSBzYWZlRGVsdGE7XG5mdW5jdGlvbiBjbXBCeVJlc3VsdFRoZW5SYW5raW5nVHVwZWwoYWEsIGJiKSB7XG4gICAgdmFyIGNtcCA9IGxvY2FsZUNvbXBhcmVBcnJzKGFhLnJlc3VsdCwgYmIucmVzdWx0KTtcbiAgICBpZiAoY21wKSB7XG4gICAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuICAgIHJldHVybiAtc2FmZURlbHRhKGFhLl9yYW5raW5nLCBiYi5fcmFua2luZyk7XG59XG5leHBvcnRzLmNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbCA9IGNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbDtcbmZ1bmN0aW9uIGNtcFJlY29yZHMoYSwgYikge1xuICAgIC8vIGFyZSByZWNvcmRzIGRpZmZlcmVudD9cbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGEpLmNvbmNhdChPYmplY3Qua2V5cyhiKSkuc29ydCgpO1xuICAgIHZhciByZXMgPSBrZXlzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgc0tleSkge1xuICAgICAgICBpZiAocHJldikge1xuICAgICAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGJbc0tleV0gIT09IGFbc0tleV0pIHtcbiAgICAgICAgICAgIGlmICghYltzS2V5XSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghYVtzS2V5XSkge1xuICAgICAgICAgICAgICAgIHJldHVybiArMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBhW3NLZXldLmxvY2FsZUNvbXBhcmUoYltzS2V5XSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfSwgMCk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuY21wUmVjb3JkcyA9IGNtcFJlY29yZHM7XG5mdW5jdGlvbiBjbXBCeVJhbmtpbmcoYSwgYikge1xuICAgIHZhciBjbXAgPSAtc2FmZURlbHRhKGEuX3JhbmtpbmcsIGIuX3JhbmtpbmcpO1xuICAgIGlmIChjbXApIHtcbiAgICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG4gICAgY21wID0gYS5yZXN1bHQubG9jYWxlQ29tcGFyZShiLnJlc3VsdCk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgICByZXR1cm4gY21wO1xuICAgIH1cbiAgICByZXR1cm4gY21wUmVjb3JkcyhhLnJlY29yZCwgYi5yZWNvcmQpO1xufVxuZXhwb3J0cy5jbXBCeVJhbmtpbmcgPSBjbXBCeVJhbmtpbmc7XG5mdW5jdGlvbiBjbXBCeVJhbmtpbmdUdXBlbChhLCBiKSB7XG4gICAgdmFyIGNtcCA9IC1zYWZlRGVsdGEoYS5fcmFua2luZywgYi5fcmFua2luZyk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgICByZXR1cm4gY21wO1xuICAgIH1cbiAgICBjbXAgPSBsb2NhbGVDb21wYXJlQXJycyhhLnJlc3VsdCwgYi5yZXN1bHQpO1xuICAgIGlmIChjbXApIHtcbiAgICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG4gICAgcmV0dXJuIGNtcFJlY29yZHMoYS5yZWNvcmQsIGIucmVjb3JkKTtcbn1cbmV4cG9ydHMuY21wQnlSYW5raW5nVHVwZWwgPSBjbXBCeVJhbmtpbmdUdXBlbDtcbmZ1bmN0aW9uIGR1bXBOaWNlKGFuc3dlcikge1xuICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgIHM6IFwiXCIsXG4gICAgICAgIHB1c2g6IGZ1bmN0aW9uIChzKSB7IHRoaXMucyA9IHRoaXMucyArIHM7IH1cbiAgICB9O1xuICAgIHZhciBzID0gXCIqKlJlc3VsdCBmb3IgY2F0ZWdvcnk6IFwiICsgYW5zd2VyLmNhdGVnb3J5ICsgXCIgaXMgXCIgKyBhbnN3ZXIucmVzdWx0ICsgXCJcXG4gcmFuazogXCIgKyBhbnN3ZXIuX3JhbmtpbmcgKyBcIlxcblwiO1xuICAgIHJlc3VsdC5wdXNoKHMpO1xuICAgIE9iamVjdC5rZXlzKGFuc3dlci5yZWNvcmQpLmZvckVhY2goZnVuY3Rpb24gKHNSZXF1aXJlcywgaW5kZXgpIHtcbiAgICAgICAgaWYgKHNSZXF1aXJlcy5jaGFyQXQoMCkgIT09ICdfJykge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2goXCJyZWNvcmQ6IFwiICsgc1JlcXVpcmVzICsgXCIgLT4gXCIgKyBhbnN3ZXIucmVjb3JkW3NSZXF1aXJlc10pO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdC5wdXNoKCdcXG4nKTtcbiAgICB9KTtcbiAgICB2YXIgb1NlbnRlbmNlID0gYW5zd2VyLnNlbnRlbmNlO1xuICAgIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaW5kZXgpIHtcbiAgICAgICAgdmFyIHNXb3JkID0gXCJbXCIgKyBpbmRleCArIFwiXSA6IFwiICsgb1dvcmQuY2F0ZWdvcnkgKyBcIiBcXFwiXCIgKyBvV29yZC5zdHJpbmcgKyBcIlxcXCIgPT4gXFxcIlwiICsgb1dvcmQubWF0Y2hlZFN0cmluZyArIFwiXFxcIlwiO1xuICAgICAgICByZXN1bHQucHVzaChzV29yZCArIFwiXFxuXCIpO1xuICAgIH0pO1xuICAgIHJlc3VsdC5wdXNoKFwiLlxcblwiKTtcbiAgICByZXR1cm4gcmVzdWx0LnM7XG59XG5leHBvcnRzLmR1bXBOaWNlID0gZHVtcE5pY2U7XG5mdW5jdGlvbiBkdW1wTmljZVR1cGVsKGFuc3dlcikge1xuICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgIHM6IFwiXCIsXG4gICAgICAgIHB1c2g6IGZ1bmN0aW9uIChzKSB7IHRoaXMucyA9IHRoaXMucyArIHM7IH1cbiAgICB9O1xuICAgIHZhciBzID0gXCIqKlJlc3VsdCBmb3IgY2F0ZWdvcmllczogXCIgKyBhbnN3ZXIuY2F0ZWdvcmllcy5qb2luKFwiO1wiKSArIFwiIGlzIFwiICsgYW5zd2VyLnJlc3VsdCArIFwiXFxuIHJhbms6IFwiICsgYW5zd2VyLl9yYW5raW5nICsgXCJcXG5cIjtcbiAgICByZXN1bHQucHVzaChzKTtcbiAgICBPYmplY3Qua2V5cyhhbnN3ZXIucmVjb3JkKS5mb3JFYWNoKGZ1bmN0aW9uIChzUmVxdWlyZXMsIGluZGV4KSB7XG4gICAgICAgIGlmIChzUmVxdWlyZXMuY2hhckF0KDApICE9PSAnXycpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwicmVjb3JkOiBcIiArIHNSZXF1aXJlcyArIFwiIC0+IFwiICsgYW5zd2VyLnJlY29yZFtzUmVxdWlyZXNdKTtcbiAgICAgICAgfVxuICAgICAgICByZXN1bHQucHVzaCgnXFxuJyk7XG4gICAgfSk7XG4gICAgdmFyIG9TZW50ZW5jZSA9IGFuc3dlci5zZW50ZW5jZTtcbiAgICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGluZGV4KSB7XG4gICAgICAgIHZhciBzV29yZCA9IFwiW1wiICsgaW5kZXggKyBcIl0gOiBcIiArIG9Xb3JkLmNhdGVnb3J5ICsgXCIgXFxcIlwiICsgb1dvcmQuc3RyaW5nICsgXCJcXFwiID0+IFxcXCJcIiArIG9Xb3JkLm1hdGNoZWRTdHJpbmcgKyBcIlxcXCJcIjtcbiAgICAgICAgcmVzdWx0LnB1c2goc1dvcmQgKyBcIlxcblwiKTtcbiAgICB9KTtcbiAgICByZXN1bHQucHVzaChcIi5cXG5cIik7XG4gICAgcmV0dXJuIHJlc3VsdC5zO1xufVxuZXhwb3J0cy5kdW1wTmljZVR1cGVsID0gZHVtcE5pY2VUdXBlbDtcbmZ1bmN0aW9uIGR1bXBXZWlnaHRzVG9wKHRvb2xtYXRjaGVzLCBvcHRpb25zKSB7XG4gICAgdmFyIHMgPSAnJztcbiAgICB0b29sbWF0Y2hlcy5mb3JFYWNoKGZ1bmN0aW9uIChvTWF0Y2gsIGluZGV4KSB7XG4gICAgICAgIGlmIChpbmRleCA8IG9wdGlvbnMudG9wKSB7XG4gICAgICAgICAgICBzID0gcyArIFwiV2hhdElzQW5zd2VyW1wiICsgaW5kZXggKyBcIl0uLi5cXG5cIjtcbiAgICAgICAgICAgIHMgPSBzICsgZHVtcE5pY2Uob01hdGNoKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBzO1xufVxuZXhwb3J0cy5kdW1wV2VpZ2h0c1RvcCA9IGR1bXBXZWlnaHRzVG9wO1xuZnVuY3Rpb24gZmlsdGVyRGlzdGluY3RSZXN1bHRBbmRTb3J0VHVwZWwocmVzKSB7XG4gICAgdmFyIHJlc3VsdCA9IHJlcy50dXBlbGFuc3dlcnMuZmlsdGVyKGZ1bmN0aW9uIChpUmVzLCBpbmRleCkge1xuICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgZGVidWdsb2coJyByZXRhaW4gdHVwZWwgJyArIGluZGV4ICsgJyAnICsgSlNPTi5zdHJpbmdpZnkoaVJlcykpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChfLmlzRXF1YWwoaVJlcy5yZXN1bHQsIHJlcy50dXBlbGFuc3dlcnNbaW5kZXggLSAxXSAmJiByZXMudHVwZWxhbnN3ZXJzW2luZGV4IC0gMV0ucmVzdWx0KSkge1xuICAgICAgICAgICAgZGVidWdsb2coJ3NraXAnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICByZXN1bHQuc29ydChjbXBCeVJhbmtpbmdUdXBlbCk7XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24ocmVzLCB7IHR1cGVsYW5zd2VyczogcmVzdWx0IH0pO1xufVxuZXhwb3J0cy5maWx0ZXJEaXN0aW5jdFJlc3VsdEFuZFNvcnRUdXBlbCA9IGZpbHRlckRpc3RpbmN0UmVzdWx0QW5kU29ydFR1cGVsO1xuZnVuY3Rpb24gZmlsdGVyT25seVRvcFJhbmtlZChyZXN1bHRzKSB7XG4gICAgdmFyIHJlcyA9IHJlc3VsdHMuZmlsdGVyKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgaWYgKHNhZmVFcXVhbChyZXN1bHQuX3JhbmtpbmcsIHJlc3VsdHNbMF0uX3JhbmtpbmcpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0Ll9yYW5raW5nID49IHJlc3VsdHNbMF0uX3JhbmtpbmcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkxpc3QgdG8gZmlsdGVyIG11c3QgYmUgb3JkZXJlZFwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZmlsdGVyT25seVRvcFJhbmtlZCA9IGZpbHRlck9ubHlUb3BSYW5rZWQ7XG5mdW5jdGlvbiBmaWx0ZXJPbmx5VG9wUmFua2VkVHVwZWwocmVzdWx0cykge1xuICAgIHZhciByZXMgPSByZXN1bHRzLmZpbHRlcihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgIGlmIChzYWZlRXF1YWwocmVzdWx0Ll9yYW5raW5nLCByZXN1bHRzWzBdLl9yYW5raW5nKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdC5fcmFua2luZyA+PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJMaXN0IHRvIGZpbHRlciBtdXN0IGJlIG9yZGVyZWRcIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmZpbHRlck9ubHlUb3BSYW5rZWRUdXBlbCA9IGZpbHRlck9ubHlUb3BSYW5rZWRUdXBlbDtcbi8qKlxuICogQSByYW5raW5nIHdoaWNoIGlzIHB1cmVseSBiYXNlZCBvbiB0aGUgbnVtYmVycyBvZiBtYXRjaGVkIGVudGl0aWVzLFxuICogZGlzcmVnYXJkaW5nIGV4YWN0bmVzcyBvZiBtYXRjaFxuICovXG4vKlxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNSYW5raW5nU2ltcGxlKG1hdGNoZWQ6IG51bWJlcixcbiAgbWlzbWF0Y2hlZDogbnVtYmVyLCBub3VzZTogbnVtYmVyLFxuICByZWxldmFudENvdW50OiBudW1iZXIpOiBudW1iZXIge1xuICAvLyAyIDogMFxuICAvLyAxIDogMFxuICB2YXIgZmFjdG9yID0gbWF0Y2hlZCAqIE1hdGgucG93KDEuNSwgbWF0Y2hlZCkgKiBNYXRoLnBvdygxLjUsIG1hdGNoZWQpO1xuICB2YXIgZmFjdG9yMiA9IE1hdGgucG93KDAuNCwgbWlzbWF0Y2hlZCk7XG4gIHZhciBmYWN0b3IzID0gTWF0aC5wb3coMC40LCBub3VzZSk7XG4gIHJldHVybiBNYXRoLnBvdyhmYWN0b3IyICogZmFjdG9yICogZmFjdG9yMywgMSAvIChtaXNtYXRjaGVkICsgbWF0Y2hlZCArIG5vdXNlKSk7XG59XG4qL1xuZnVuY3Rpb24gY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgcmVsZXZhbnRDb3VudCwgaGFzRG9tYWluKSB7XG4gICAgdmFyIGxlbk1hdGNoZWQgPSBPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGg7XG4gICAgdmFyIGZhY3RvciA9IE1hdGNoLmNhbGNSYW5raW5nUHJvZHVjdChtYXRjaGVkKTtcbiAgICBmYWN0b3IgKj0gTWF0aC5wb3coMS41LCBsZW5NYXRjaGVkKTtcbiAgICBpZiAoaGFzRG9tYWluKSB7XG4gICAgICAgIGZhY3RvciAqPSAxLjU7XG4gICAgfVxuICAgIHZhciBsZW5IYXNDYXRlZ29yeSA9IE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5sZW5ndGg7XG4gICAgdmFyIGZhY3RvckggPSBNYXRoLnBvdygxLjEsIGxlbkhhc0NhdGVnb3J5KTtcbiAgICB2YXIgbGVuTWlzTWF0Y2hlZCA9IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aDtcbiAgICB2YXIgZmFjdG9yMiA9IE1hdGNoLmNhbGNSYW5raW5nUHJvZHVjdChtaXNtYXRjaGVkKTtcbiAgICBmYWN0b3IyICo9IE1hdGgucG93KDAuNCwgbGVuTWlzTWF0Y2hlZCk7XG4gICAgdmFyIGRpdmlzb3IgPSAobGVuTWlzTWF0Y2hlZCArIGxlbkhhc0NhdGVnb3J5ICsgbGVuTWF0Y2hlZCk7XG4gICAgZGl2aXNvciA9IGRpdmlzb3IgPyBkaXZpc29yIDogMTtcbiAgICByZXR1cm4gTWF0aC5wb3coZmFjdG9yMiAqIGZhY3RvckggKiBmYWN0b3IsIDEgLyAoZGl2aXNvcikpO1xufVxuZXhwb3J0cy5jYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5ID0gY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeTtcbi8qKlxuICogbGlzdCBhbGwgdG9wIGxldmVsIHJhbmtpbmdzXG4gKi9cbi8qXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hSZWNvcmRzSGF2aW5nQ29udGV4dChcbiAgcFNlbnRlbmNlczogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMsIGNhdGVnb3J5OiBzdHJpbmcsIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPixcbiAgY2F0ZWdvcnlTZXQ6IHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB9KVxuICA6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzQW5zd2VycyB7XG5cbiAgLy9kZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRzLCB1bmRlZmluZWQsIDIpKTtcbiAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQ6IElNYXRjaC5JUmVjb3JkKSB7XG4gICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnldICE9PSBudWxsKTtcbiAgfSk7XG4gIHZhciByZXMgPSBbXTtcbiAgZGVidWdsb2coXCJNYXRjaFJlY29yZHNIYXZpbmdDb250ZXh0IDogcmVsZXZhbnQgcmVjb3JkcyBucjpcIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGgpO1xuICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwic2VudGVuY2VzIGFyZSA6IFwiICsgSlNPTi5zdHJpbmdpZnkocFNlbnRlbmNlcywgdW5kZWZpbmVkLCAyKSkgOiBcIi1cIik7XG4gIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJjYXRlZ29yeSBcIiArIGNhdGVnb3J5ICsgXCIgYW5kIGNhdGVnb3J5c2V0IGlzOiBcIiArIEpTT04uc3RyaW5naWZ5KGNhdGVnb3J5U2V0LCB1bmRlZmluZWQsIDIpKSA6IFwiLVwiKTtcbiAgaWYgKHByb2Nlc3MuZW52LkFCT1RfRkFTVCAmJiBjYXRlZ29yeVNldCkge1xuICAgIC8vIHdlIGFyZSBvbmx5IGludGVyZXN0ZWQgaW4gY2F0ZWdvcmllcyBwcmVzZW50IGluIHJlY29yZHMgZm9yIGRvbWFpbnMgd2hpY2ggY29udGFpbiB0aGUgY2F0ZWdvcnlcbiAgICAvLyB2YXIgY2F0ZWdvcnlzZXQgPSBNb2RlbC5jYWxjdWxhdGVSZWxldmFudFJlY29yZENhdGVnb3JpZXModGhlTW9kZWwsY2F0ZWdvcnkpO1xuICAgIC8va25vd2luZyB0aGUgdGFyZ2V0XG4gICAgcGVyZmxvZyhcImdvdCBjYXRlZ29yeXNldCB3aXRoIFwiICsgT2JqZWN0LmtleXMoY2F0ZWdvcnlTZXQpLmxlbmd0aCk7XG4gICAgdmFyIGZsID0gMDtcbiAgICB2YXIgbGYgPSAwO1xuICAgIHZhciBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IHBTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICB2YXIgZldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgcmV0dXJuICFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpO1xuICAgICAgfSk7XG4gICAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgcmV0dXJuICEhY2F0ZWdvcnlTZXRbb1dvcmQuY2F0ZWdvcnldIHx8IFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKTtcbiAgICAgIH0pO1xuICAgICAgZmwgPSBmbCArIG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgICBsZiA9IGxmICsgcldvcmRzLmxlbmd0aDtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLCAvLyBub3QgYSBmaWxsZXIgIC8vIHRvIGJlIGNvbXBhdGlibGUgaXQgd291bGQgYmUgZldvcmRzXG4gICAgICAgIHJXb3JkczogcldvcmRzXG4gICAgICB9O1xuICAgIH0pO1xuICAgIE9iamVjdC5mcmVlemUoYVNpbXBsaWZpZWRTZW50ZW5jZXMpO1xuICAgIGRlYnVnbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyBmbCArIFwiLT5cIiArIGxmICsgXCIpXCIpO1xuICAgIHBlcmZsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIGZsICsgXCItPlwiICsgbGYgKyBcIilcIik7XG4gICAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgYVNpbXBsaWZpZWRTZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAoYVNlbnRlbmNlKSB7XG4gICAgICAgIHZhciBoYXNDYXRlZ29yeSA9IHt9O1xuICAgICAgICB2YXIgbWlzbWF0Y2hlZCA9IHt9O1xuICAgICAgICB2YXIgbWF0Y2hlZCA9IHt9O1xuICAgICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IGFTZW50ZW5jZS5jbnRSZWxldmFudFdvcmRzO1xuICAgICAgICBhU2VudGVuY2UucldvcmRzLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICYmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYgKFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKSAmJiByZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgIGhhc0NhdGVnb3J5W29Xb3JkLm1hdGNoZWRTdHJpbmddID0gMTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgaWYgKChPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoKSA+IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aCkge1xuICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2Uub1NlbnRlbmNlLFxuICAgICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgICByZXN1bHQ6IHJlY29yZFtjYXRlZ29yeV0sXG4gICAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KTtcbiAgICBkZWJ1Z2xvZyhcImhlcmUgaW4gd2VpcmRcIik7XG4gIH0gZWxzZSB7XG4gICAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgcFNlbnRlbmNlcy5zZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAoYVNlbnRlbmNlKSB7XG4gICAgICAgIHZhciBoYXNDYXRlZ29yeSA9IHt9O1xuICAgICAgICB2YXIgbWlzbWF0Y2hlZCA9IHt9O1xuICAgICAgICB2YXIgbWF0Y2hlZCA9IHt9O1xuICAgICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IDA7XG4gICAgICAgIGFTZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgIGlmICghV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKSkge1xuICAgICAgICAgICAgY250UmVsZXZhbnRXb3JkcyA9IGNudFJlbGV2YW50V29yZHMgKyAxO1xuICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICYmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCkgJiYgcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICAgIGhhc0NhdGVnb3J5W29Xb3JkLm1hdGNoZWRTdHJpbmddID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoKE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aCArIE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5sZW5ndGgpID4gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoKSB7XG4gICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgc2VudGVuY2U6IGFTZW50ZW5jZSxcbiAgICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxuICAgICAgICAgICAgcmVzdWx0OiByZWNvcmRbY2F0ZWdvcnldLFxuICAgICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSk7XG4gIH1cbiAgcmVzLnNvcnQoY21wQnlSZXN1bHRUaGVuUmFua2luZyk7XG4gIGRlYnVnbG9nKFwiIGFmdGVyIHNvcnRcIiArIHJlcy5sZW5ndGgpO1xuICB2YXIgcmVzdWx0ID0gT2JqZWN0LmFzc2lnbih7fSwgcFNlbnRlbmNlcywgeyBhbnN3ZXJzOiByZXMgfSk7XG4gIHJldHVybiBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHQocmVzdWx0KTtcbn1cbiovXG4vKlxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVjb3JkcyhhU2VudGVuY2VzOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcywgY2F0ZWdvcnk6IHN0cmluZywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+KVxuICA6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzQW5zd2VycyB7XG4gIC8vIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gIC8vICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gIC8vIH1cbiAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQ6IElNYXRjaC5JUmVjb3JkKSB7XG4gICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnldICE9PSBudWxsKTtcbiAgfSk7XG4gIHZhciByZXMgPSBbXTtcbiAgZGVidWdsb2coXCJyZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCk7XG4gIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICBhU2VudGVuY2VzLnNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgIHZhciBtaXNtYXRjaGVkID0ge31cbiAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IDA7XG4gICAgICBhU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgaWYgKCFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpKSB7XG4gICAgICAgICAgY250UmVsZXZhbnRXb3JkcyA9IGNudFJlbGV2YW50V29yZHMgKyAxO1xuICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGlmIChPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2UsXG4gICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxuICAgICAgICAgIHJlc3VsdDogcmVjb3JkW2NhdGVnb3J5XSxcbiAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmcobWF0Y2hlZCwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSlcbiAgfSk7XG4gIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmcpO1xuICB2YXIgcmVzdWx0ID0gT2JqZWN0LmFzc2lnbih7fSwgYVNlbnRlbmNlcywgeyBhbnN3ZXJzOiByZXMgfSk7XG4gIHJldHVybiBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHQocmVzdWx0KTtcbn1cbiovXG4vKlxuZnVuY3Rpb24gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXNDYXRlZ29yeVNldChhU2VudGVuY2VzOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcyxcbiAgY2F0ZWdvcnlTZXQ6IHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB9LCB0cmFjazogeyBmbDogbnVtYmVyLCBsZjogbnVtYmVyIH1cbik6IHtcbiAgZG9tYWluczogc3RyaW5nW10sXG4gIG9TZW50ZW5jZTogSU1hdGNoLklTZW50ZW5jZSxcbiAgY250UmVsZXZhbnRXb3JkczogbnVtYmVyLFxuICByV29yZHM6IElNYXRjaC5JV29yZFtdXG59W10ge1xuICByZXR1cm4gYVNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICB2YXIgYURvbWFpbnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJkb21haW5cIikge1xuICAgICAgICBhRG9tYWlucy5wdXNoKG9Xb3JkLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwibWV0YVwiKSB7XG4gICAgICAgIC8vIGUuZy4gZG9tYWluIFhYWFxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gISFjYXRlZ29yeVNldFtvV29yZC5jYXRlZ29yeV07XG4gICAgfSk7XG4gICAgdHJhY2suZmwgKz0gb1NlbnRlbmNlLmxlbmd0aDtcbiAgICB0cmFjay5sZiArPSByV29yZHMubGVuZ3RoO1xuICAgIHJldHVybiB7XG4gICAgICBkb21haW5zOiBhRG9tYWlucyxcbiAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCxcbiAgICAgIHJXb3JkczogcldvcmRzXG4gICAgfTtcbiAgfSk7XG59XG4qL1xuZnVuY3Rpb24gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXNDYXRlZ29yeVNldDIoYVNlbnRlbmNlcywgY2F0ZWdvcnlTZXQsIHRyYWNrKSB7XG4gICAgcmV0dXJuIGFTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgIHZhciBhRG9tYWlucyA9IFtdO1xuICAgICAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJkb21haW5cIikge1xuICAgICAgICAgICAgICAgIGFEb21haW5zLnB1c2gob1dvcmQubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcIm1ldGFcIikge1xuICAgICAgICAgICAgICAgIC8vIGUuZy4gZG9tYWluIFhYWFxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJjYXRlZ29yeVwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNhdGVnb3J5U2V0W29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAhIWNhdGVnb3J5U2V0W29Xb3JkLmNhdGVnb3J5XTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRyYWNrLmZsICs9IG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgICAgIHRyYWNrLmxmICs9IHJXb3Jkcy5sZW5ndGg7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkb21haW5zOiBhRG9tYWlucyxcbiAgICAgICAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCxcbiAgICAgICAgICAgIHJXb3JkczogcldvcmRzXG4gICAgICAgIH07XG4gICAgfSk7XG59XG5mdW5jdGlvbiBtYWtlU2ltcGxpZmllZFNlbnRlbmNlcyhhU2VudGVuY2VzLCB0cmFjaykge1xuICAgIHJldHVybiBhU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICB2YXIgZG9tYWlucyA9IFtdO1xuICAgICAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJkb21haW5cIikge1xuICAgICAgICAgICAgICAgIGRvbWFpbnMucHVzaChvV29yZC5tYXRjaGVkU3RyaW5nKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwibWV0YVwiKSB7XG4gICAgICAgICAgICAgICAgLy8gZS5nLiBkb21haW4gWFhYXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpO1xuICAgICAgICB9KTtcbiAgICAgICAgdHJhY2suZmwgKz0gb1NlbnRlbmNlLmxlbmd0aDtcbiAgICAgICAgdHJhY2subGYgKz0gcldvcmRzLmxlbmd0aDtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgICAgICAgZG9tYWluczogZG9tYWlucyxcbiAgICAgICAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsXG4gICAgICAgICAgICByV29yZHM6IHJXb3Jkc1xuICAgICAgICB9O1xuICAgIH0pO1xufVxuZnVuY3Rpb24gZXh0cmFjdFJlc3VsdChjYXRlZ29yaWVzLCByZWNvcmQpIHtcbiAgICByZXR1cm4gY2F0ZWdvcmllcy5tYXAoZnVuY3Rpb24gKGNhdGVnb3J5KSB7IHJldHVybiByZWNvcmRbY2F0ZWdvcnldIHx8IFwibi9hXCI7IH0pO1xufVxuZnVuY3Rpb24gbWF0Y2hSZWNvcmRzUXVpY2tNdWx0aXBsZUNhdGVnb3JpZXMocFNlbnRlbmNlcywgY2F0ZWdvcmllcywgcmVjb3JkcywgZG9tYWluQ2F0ZWdvcnlGaWx0ZXIpIHtcbiAgICAvLyBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgIC8vICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRzLCB1bmRlZmluZWQsIDIpKTtcbiAgICAvLyB9XG4gICAgaWYgKGRvbWFpbkNhdGVnb3J5RmlsdGVyICYmICFkb21haW5DYXRlZ29yeUZpbHRlci5kb21haW5zKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIm9sZCBjYXRlZ29yeXNTRXQgPz9cIik7XG4gICAgfVxuICAgIE9iamVjdC5mcmVlemUoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIpO1xuICAgIHZhciBjYXRlZ29yeUYgPSBjYXRlZ29yaWVzWzBdO1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJtYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcyAocj1cIiArIChyZWNvcmRzICYmIHJlY29yZHMubGVuZ3RoKVxuICAgICAgICArIFwiIHM9XCIgKyAocFNlbnRlbmNlcyAmJiBwU2VudGVuY2VzLnNlbnRlbmNlcyAmJiBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGgpICsgXCIpXFxuIGNhdGVnb3JpZXM6XCIgKyAoY2F0ZWdvcmllcyAmJiBjYXRlZ29yaWVzLmpvaW4oXCJcXG5cIikpICsgXCIgY2F0ZWdvcnlTZXQ6IFwiXG4gICAgICAgICsgKGRvbWFpbkNhdGVnb3J5RmlsdGVyICYmICh0eXBlb2YgZG9tYWluQ2F0ZWdvcnlGaWx0ZXIuY2F0ZWdvcnlTZXQgPT09IFwib2JqZWN0XCIpICYmIE9iamVjdC5rZXlzKGRvbWFpbkNhdGVnb3J5RmlsdGVyLmNhdGVnb3J5U2V0KS5qb2luKFwiXFxuXCIpKSkgOiBcIi1cIik7XG4gICAgcGVyZmxvZyhcIm1hdGNoUmVjb3Jkc1F1aWNrTXVsdCAuLi4ocj1cIiArIHJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiKVwiKTtcbiAgICAvL2NvbnNvbGUubG9nKCdjYXRlZ29yaWVzICcgKyAgSlNPTi5zdHJpbmdpZnkoY2F0ZWdvcmllcykpO1xuICAgIC8vY29uc29sZS5sb2coJ2NhdGVncm95U2V0JyArICBKU09OLnN0cmluZ2lmeShjYXRlZ29yeVNldCkpO1xuICAgIHZhciByZWxldmFudFJlY29yZHMgPSByZWNvcmRzO1xuICAgIGlmIChkb21haW5DYXRlZ29yeUZpbHRlciAmJiBkb21haW5DYXRlZ29yeUZpbHRlci5kb21haW5zKSB7XG4gICAgICAgIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgICAgIHJldHVybiAoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIuZG9tYWlucy5pbmRleE9mKHJlY29yZC5fZG9tYWluKSA+PSAwKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZWxldmFudFJlY29yZHMgPSByZWxldmFudFJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgICAgIHJldHVybiAhY2F0ZWdvcmllcy5ldmVyeShmdW5jdGlvbiAoY2F0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChyZWNvcmRbY2F0XSA9PT0gdW5kZWZpbmVkKSB8fCAocmVjb3JkW2NhdF0gPT09IG51bGwpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvLyAgICAgIH1cbiAgICAgICAgICAgIC8vICAgICByZXR1cm4gKHJlY29yZFtjYXRlZ29yeUZdICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnlGXSAhPT0gbnVsbCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICB2YXIgcmVzID0gW107XG4gICAgZGVidWdsb2coXCJyZWxldmFudCByZWNvcmRzIHdpdGggZmlyc3QgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIpXCIpO1xuICAgIHBlcmZsb2coXCJyZWxldmFudCByZWNvcmRzIHdpdGggZmlyc3QgbnI6XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgc2VudGVuY2VzIFwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoKTtcbiAgICBpZiAoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIpIHtcbiAgICAgICAgLy8gd2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbiBjYXRlZ29yaWVzIHByZXNlbnQgaW4gcmVjb3JkcyBmb3IgZG9tYWlucyB3aGljaCBjb250YWluIHRoZSBjYXRlZ29yeVxuICAgICAgICAvLyB2YXIgY2F0ZWdvcnlzZXQgPSBNb2RlbC5jYWxjdWxhdGVSZWxldmFudFJlY29yZENhdGVnb3JpZXModGhlTW9kZWwsY2F0ZWdvcnkpO1xuICAgICAgICAvL2tub3dpbmcgdGhlIHRhcmdldFxuICAgICAgICBwZXJmbG9nKFwiZ290IGNhdGVnb3J5c2V0IHdpdGggXCIgKyBPYmplY3Qua2V5cyhkb21haW5DYXRlZ29yeUZpbHRlci5jYXRlZ29yeVNldCkubGVuZ3RoKTtcbiAgICAgICAgdmFyIG9iaiA9IHsgZmw6IDAsIGxmOiAwIH07XG4gICAgICAgIHZhciBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IFtdO1xuICAgICAgICAvLyAgaWYgKHByb2Nlc3MuZW52LkFCT1RfQkVUMSkge1xuICAgICAgICBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzQ2F0ZWdvcnlTZXQyKHBTZW50ZW5jZXMsIGRvbWFpbkNhdGVnb3J5RmlsdGVyLmNhdGVnb3J5U2V0LCBvYmopO1xuICAgICAgICAvLyAgfSBlbHNlIHtcbiAgICAgICAgLy8gICAgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBtYWtlU2ltcGxpZmllZFNlbnRlbmNlc0NhdGVnb3J5U2V0KHBTZW50ZW5jZXMsIGNhdGVnb3J5U2V0LCBvYmopIGFzIGFueTtcbiAgICAgICAgLy8gIH1cbiAgICAgICAgcGVyZmxvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgb2JqLmZsICsgXCItPlwiICsgb2JqLmxmICsgXCIpXCIpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgZGVidWdsb2coXCJub3QgYWJvdF9mYXN0ICFcIik7XG4gICAgICAgIHZhciB0cmFjayA9IHsgZmw6IDAsIGxmOiAwIH07XG4gICAgICAgIHZhciBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzKHBTZW50ZW5jZXMsIHRyYWNrKTtcbiAgICAgICAgLypcbiAgICAgICAgICAgIHBTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIGZsID0gZmwgKyBvU2VudGVuY2UubGVuZ3RoO1xuICAgICAgICAgICAgICBsZiA9IGxmICsgcldvcmRzLmxlbmd0aDtcbiAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgICAgICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgIHJXb3JkczogcldvcmRzXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICovXG4gICAgICAgIGRlYnVnbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyB0cmFjay5mbCArIFwiLT5cIiArIHRyYWNrLmxmICsgXCIpXCIpO1xuICAgICAgICBwZXJmbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyB0cmFjay5mbCArIFwiLT5cIiArIHRyYWNrLmxmICsgXCIpXCIpO1xuICAgIH1cbiAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiaGVyZSBzaW1wbGlmaWVkIHNlbnRlbmNlcyBcIiArXG4gICAgICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzLm1hcChmdW5jdGlvbiAobykgeyByZXR1cm4gXCJcXG5Eb21haW49XCIgKyBvLmRvbWFpbnMuam9pbihcIlxcblwiKSArIFwiXFxuXCIgKyBTZW50ZW5jZS5kdW1wTmljZShvLnJXb3Jkcyk7IH0pLmpvaW4oXCJcXG5cIikpIDogXCItXCIpO1xuICAgIC8vY29uc29sZS5sb2coXCJoZXJlIHJlY3JvZHNcIiArIHJlbGV2YW50UmVjb3Jkcy5tYXAoIChvLGluZGV4KSA9PiAgXCIgaW5kZXggPSBcIiArIGluZGV4ICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShvKSkuam9pbihcIlxcblwiKSk7XG4gICAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICBhU2ltcGxpZmllZFNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgICAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgICAgICAgIHZhciBpbWlzbWF0Y2hlZCA9IDA7XG4gICAgICAgICAgICB2YXIgaW1hdGNoZWQgPSAwO1xuICAgICAgICAgICAgdmFyIG5vdXNlID0gMDtcbiAgICAgICAgICAgIHZhciBmb3VuZGNhdCA9IDE7XG4gICAgICAgICAgICB2YXIgbWlzc2luZ2NhdCA9IDA7XG4gICAgICAgICAgICB2YXIgbWF0Y2hlZCA9IHt9O1xuICAgICAgICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fTtcbiAgICAgICAgICAgIHZhciBoYXNDYXRlZ29yeSA9IHt9O1xuICAgICAgICAgICAgYVNlbnRlbmNlLnJXb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gMDtcbiAgICAgICAgICAgICAgICBpZiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICArK2ltYXRjaGVkO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgKytpbWlzbWF0Y2hlZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICE9PSBcImNhdGVnb3J5XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vdXNlICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXJlY29yZFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pc3NpbmdjYXQgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kY2F0ICs9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICYmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCkgJiYgcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhc0NhdGVnb3J5W29Xb3JkLm1hdGNoZWRTdHJpbmddID0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoIVdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUT0RPIGJldHRlciB1bm1hY2h0ZWRcbiAgICAgICAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciBtYXRjaGVkRG9tYWluID0gMDtcbiAgICAgICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gYVNlbnRlbmNlLnJXb3Jkcy5sZW5ndGg7XG4gICAgICAgICAgICBpZiAoYVNlbnRlbmNlLmRvbWFpbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlY29yZC5fZG9tYWluICE9PSBhU2VudGVuY2UuZG9tYWluc1swXSkge1xuICAgICAgICAgICAgICAgICAgICBpbWlzbWF0Y2hlZCA9IDMwMDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpbWF0Y2hlZCArPSAxO1xuICAgICAgICAgICAgICAgICAgICBtYXRjaGVkRG9tYWluICs9IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIG1hdGNoZWRMZW4gPSBPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoO1xuICAgICAgICAgICAgdmFyIG1pc21hdGNoZWRMZW4gPSBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGg7XG4gICAgICAgICAgICBpZiAoKGltaXNtYXRjaGVkIDwgMzAwMClcbiAgICAgICAgICAgICAgICAmJiAoKG1hdGNoZWRMZW4gPiBtaXNtYXRjaGVkTGVuKVxuICAgICAgICAgICAgICAgICAgICB8fCAobWF0Y2hlZExlbiA9PT0gbWlzbWF0Y2hlZExlbiAmJiBtYXRjaGVkRG9tYWluID4gMCkpKSB7XG4gICAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKFwiYWRkaW5nIFwiICsgZXh0cmFjdFJlc3VsdChjYXRlZ29yaWVzLHJlY29yZCkuam9pbihcIjtcIikpO1xuICAgICAgICAgICAgICAgICAgZGVidWdsb2coXCJ3aXRoIHJhbmtpbmcgOiBcIiArIGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkyKG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzLCBtYXRjaGVkRG9tYWluKSk7XG4gICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcIiBjcmVhdGVkIGJ5IFwiICsgT2JqZWN0LmtleXMobWF0Y2hlZCkubWFwKGtleSA9PiBcImtleTpcIiArIGtleVxuICAgICAgICAgICAgICAgICAgKyBcIlxcblwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZFtrZXldKSkuam9pbihcIlxcblwiKVxuICAgICAgICAgICAgICAgICAgKyBcIlxcbmhhc0NhdCBcIiArIEpTT04uc3RyaW5naWZ5KGhhc0NhdGVnb3J5KVxuICAgICAgICAgICAgICAgICAgKyBcIlxcbm1pc21hdCBcIiArIEpTT04uc3RyaW5naWZ5KG1pc21hdGNoZWQpXG4gICAgICAgICAgICAgICAgICArIFwiXFxuY25UcmVsIFwiICsgSlNPTi5zdHJpbmdpZnkoY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgICAgICAgICAgICsgXCJcXG5tYXRjZWREb21haW4gXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkRG9tYWluKVxuICAgICAgICAgICAgICAgICAgKyBcIlxcbmhhc0NhdCBcIiArIE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KVxuICAgICAgICAgICAgICAgICAgKyBcIlxcbm1pc21hdCBcIiArIE9iamVjdC5rZXlzKG1pc21hdGNoZWQpXG4gICAgICAgICAgICAgICAgICArIGBcXG5tYXRjaGVkICR7T2JqZWN0LmtleXMobWF0Y2hlZCl9IFxcbmhhc2NhdCAke09iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5qb2luKFwiOyBcIil9IFxcbm1pc206ICR7T2JqZWN0LmtleXMobWlzbWF0Y2hlZCl9IFxcbmBcbiAgICAgICAgICAgICAgICAgICsgXCJcXG5tYXRjZWREb21haW4gXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkRG9tYWluKVxuICAgICAgICBcbiAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIHZhciByZWMgPSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2Uub1NlbnRlbmNlLFxuICAgICAgICAgICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcmllczogY2F0ZWdvcmllcyxcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiBleHRyYWN0UmVzdWx0KGNhdGVnb3JpZXMsIHJlY29yZCksXG4gICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzLCBtYXRjaGVkRG9tYWluKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcImhlcmUgcmFua2luZ1wiICsgcmVjLl9yYW5raW5nKVxuICAgICAgICAgICAgICAgIGlmICgocmVjLl9yYW5raW5nID09PSBudWxsKSB8fCAhcmVjLl9yYW5raW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlYy5fcmFua2luZyA9IDAuOTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzLnB1c2gocmVjKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcGVyZmxvZyhcInNvcnQgKGE9XCIgKyByZXMubGVuZ3RoICsgXCIpXCIpO1xuICAgIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbCk7XG4gICAgcGVyZmxvZyhcIk1SUU1DIGZpbHRlclJldGFpbiAuLi5cIik7XG4gICAgdmFyIHJlc3VsdDEgPSBPYmplY3QuYXNzaWduKHsgdHVwZWxhbnN3ZXJzOiByZXMgfSwgcFNlbnRlbmNlcyk7XG4gICAgLypkZWJ1Z2xvZyhcIk5FV01BUFwiICsgcmVzLm1hcChvID0+IFwiXFxucmFua1wiICsgby5fcmFua2luZyArIFwiID0+XCJcbiAgICAgICAgICAgICAgICArIG8ucmVzdWx0LmpvaW4oXCJcXG5cIikpLmpvaW4oXCJcXG5cIikpOyAqL1xuICAgIHZhciByZXN1bHQyID0gZmlsdGVyRGlzdGluY3RSZXN1bHRBbmRTb3J0VHVwZWwocmVzdWx0MSk7XG4gICAgcGVyZmxvZyhcIk1SUU1DIG1hdGNoUmVjb3Jkc1F1aWNrIGRvbmU6IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBhPVwiICsgcmVzLmxlbmd0aCArIFwiKVwiKTtcbiAgICByZXR1cm4gcmVzdWx0Mjtcbn1cbmV4cG9ydHMubWF0Y2hSZWNvcmRzUXVpY2tNdWx0aXBsZUNhdGVnb3JpZXMgPSBtYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcztcbmZ1bmN0aW9uIGNsYXNzaWZ5V29yZFdpdGhUYXJnZXRDYXRlZ29yeSh3b3JkLCB0YXJnZXRjYXRlZ29yeSwgcnVsZXMsIHdob2xlc2VudGVuY2UpIHtcbiAgICAvL2NvbnNvbGUubG9nKFwiY2xhc3NpZnkgXCIgKyB3b3JkICsgXCIgXCIgICsgdGFyZ2V0Y2F0ZWdvcnkpO1xuICAgIHZhciBjYXRzID0gSW5wdXRGaWx0ZXIuY2F0ZWdvcml6ZUFXb3JkKHdvcmQsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlLCB7fSk7XG4gICAgLy8gVE9ETyBxdWFsaWZ5XG4gICAgY2F0cyA9IGNhdHMuZmlsdGVyKGZ1bmN0aW9uIChjYXQpIHtcbiAgICAgICAgcmV0dXJuIGNhdC5jYXRlZ29yeSA9PT0gdGFyZ2V0Y2F0ZWdvcnk7XG4gICAgfSk7XG4gICAgLy9kZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShjYXRzKSk7XG4gICAgaWYgKGNhdHMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBjYXRzWzBdLm1hdGNoZWRTdHJpbmc7XG4gICAgfVxufVxuZnVuY3Rpb24gYW5hbHl6ZUNhdGVnb3J5KGNhdGVnb3J5d29yZCwgcnVsZXMsIHdob2xlc2VudGVuY2UpIHtcbiAgICByZXR1cm4gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KGNhdGVnb3J5d29yZCwgJ2NhdGVnb3J5JywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xufVxuZXhwb3J0cy5hbmFseXplQ2F0ZWdvcnkgPSBhbmFseXplQ2F0ZWdvcnk7XG5mdW5jdGlvbiBzcGxpdEF0Q29tbWFBbmQoc3RyKSB7XG4gICAgdmFyIHIgPSBzdHIuc3BsaXQoLyhcXGJhbmRcXGIpfFssXS8pO1xuICAgIHIgPSByLmZpbHRlcihmdW5jdGlvbiAobywgaW5kZXgpIHtcbiAgICAgICAgaWYgKGluZGV4ICUgMiA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICB2YXIgcnRyaW1tZWQgPSByLm1hcChmdW5jdGlvbiAobykge1xuICAgICAgICByZXR1cm4gbmV3IFN0cmluZyhvKS50cmltKCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJ0cmltbWVkO1xufVxuZXhwb3J0cy5zcGxpdEF0Q29tbWFBbmQgPSBzcGxpdEF0Q29tbWFBbmQ7XG4vKipcbiAqIEEgc2ltcGxlIGltcGxlbWVudGF0aW9uLCBzcGxpdHRpbmcgYXQgYW5kIGFuZCAsXG4gKi9cbmZ1bmN0aW9uIGFuYWx5emVDYXRlZ29yeU11bHRPbmx5QW5kQ29tbWEoY2F0ZWdvcnlsaXN0LCBydWxlcywgd2hvbGVzZW50ZW5jZSkge1xuICAgIHZhciBydHJpbW1lZCA9IHNwbGl0QXRDb21tYUFuZChjYXRlZ29yeWxpc3QpO1xuICAgIHZhciByY2F0ID0gcnRyaW1tZWQubWFwKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgIHJldHVybiBhbmFseXplQ2F0ZWdvcnkobywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xuICAgIH0pO1xuICAgIGlmIChyY2F0LmluZGV4T2YodW5kZWZpbmVkKSA+PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignXCInICsgcnRyaW1tZWRbcmNhdC5pbmRleE9mKHVuZGVmaW5lZCldICsgJ1wiIGlzIG5vdCBhIGNhdGVnb3J5IScpO1xuICAgIH1cbiAgICByZXR1cm4gcmNhdDtcbn1cbmV4cG9ydHMuYW5hbHl6ZUNhdGVnb3J5TXVsdE9ubHlBbmRDb21tYSA9IGFuYWx5emVDYXRlZ29yeU11bHRPbmx5QW5kQ29tbWE7XG5mdW5jdGlvbiBmaWx0ZXJBY2NlcHRpbmdPbmx5KHJlcywgY2F0ZWdvcmllcykge1xuICAgIHJldHVybiByZXMuZmlsdGVyKGZ1bmN0aW9uIChhU2VudGVuY2UsIGlJbmRleCkge1xuICAgICAgICByZXR1cm4gYVNlbnRlbmNlLmV2ZXJ5KGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhdGVnb3JpZXMuaW5kZXhPZihvV29yZC5jYXRlZ29yeSkgPj0gMDtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5leHBvcnRzLmZpbHRlckFjY2VwdGluZ09ubHkgPSBmaWx0ZXJBY2NlcHRpbmdPbmx5O1xudmFyIEVyYmFzZSA9IHJlcXVpcmUoXCIuL2VyYmFzZVwiKTtcbmZ1bmN0aW9uIHByb2Nlc3NTdHJpbmcocXVlcnksIHJ1bGVzKSB7XG4gICAgLy8gIGlmICghcHJvY2Vzcy5lbnYuQUJPVF9PTERNQVRDSCkge1xuICAgIHJldHVybiBFcmJhc2UucHJvY2Vzc1N0cmluZyhxdWVyeSwgcnVsZXMsIHJ1bGVzLndvcmRDYWNoZSk7XG4gICAgLy8gIH1cbiAgICAvKlxuICAgICAgdmFyIG1hdGNoZWQgPSBJbnB1dEZpbHRlci5hbmFseXplU3RyaW5nKHF1ZXJ5LCBydWxlcywgc1dvcmRzKTtcbiAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiQWZ0ZXIgbWF0Y2hlZCBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWQpKTtcbiAgICAgIH1cbiAgICAgIHZhciBhU2VudGVuY2VzID0gSW5wdXRGaWx0ZXIuZXhwYW5kTWF0Y2hBcnIobWF0Y2hlZCk7XG4gICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcImFmdGVyIGV4cGFuZFwiICsgYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgICAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgICAgIH1cbiAgICAgIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IElucHV0RmlsdGVyLnJlaW5Gb3JjZShhU2VudGVuY2VzKTtcbiAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiYWZ0ZXIgcmVpbmZvcmNlXCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgICAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGVycm9yczogW10sXG4gICAgICAgIHNlbnRlbmNlczogYVNlbnRlbmNlc1JlaW5mb3JjZWRcbiAgICAgIH0gYXMgSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXM7XG4gICAgKi9cbn1cbmV4cG9ydHMucHJvY2Vzc1N0cmluZyA9IHByb2Nlc3NTdHJpbmc7XG5mdW5jdGlvbiBhbmFseXplQ29udGV4dFN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKSB7XG4gICAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gcHJvY2Vzc1N0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKTtcbiAgICAvLyB3ZSBsaW1pdCBhbmFseXNpcyB0byBuIHNlbnRlbmNlc1xuICAgIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcyA9IGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5zbGljZSgwLCBBbGdvbC5DdXRvZmZfU2VudGVuY2VzKTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcImFmdGVyIHJlaW5mb3JjZSBhbmQgY3V0b2ZmXCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubGVuZ3RoICsgXCJcXG5cIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICAgIH1cbiAgICByZXR1cm4gYVNlbnRlbmNlc1JlaW5mb3JjZWQ7XG59XG5leHBvcnRzLmFuYWx5emVDb250ZXh0U3RyaW5nID0gYW5hbHl6ZUNvbnRleHRTdHJpbmc7XG5mdW5jdGlvbiBjbXBCeU5yQ2F0ZWdvcmllc0FuZFNhbWVEb21haW4oYSwgYikge1xuICAgIC8vY29uc29sZS5sb2coXCJjb21wYXJlIGFcIiArIGEgKyBcIiBjbnRiIFwiICsgYik7XG4gICAgdmFyIGNudGEgPSBTZW50ZW5jZS5nZXREaXN0aW5jdENhdGVnb3JpZXNJblNlbnRlbmNlKGEpLmxlbmd0aDtcbiAgICB2YXIgY250YiA9IFNlbnRlbmNlLmdldERpc3RpbmN0Q2F0ZWdvcmllc0luU2VudGVuY2UoYikubGVuZ3RoO1xuICAgIC8qXG4gICAgICB2YXIgY250YSA9IGEucmVkdWNlKGZ1bmN0aW9uKHByZXYsIG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiBwcmV2ICsgKChvV29yZC5jYXRlZ29yeSA9PT0gXCJjYXRlZ29yeVwiKT8gMSA6IDApO1xuICAgICAgfSwwKTtcbiAgICAgIHZhciBjbnRiID0gYi5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgb1dvcmQpIHtcbiAgICAgICAgcmV0dXJuIHByZXYgKyAoKG9Xb3JkLmNhdGVnb3J5ID09PSBcImNhdGVnb3J5XCIpPyAxIDogMCk7XG4gICAgICB9LDApO1xuICAgICAvLyBjb25zb2xlLmxvZyhcImNudCBhXCIgKyBjbnRhICsgXCIgY250YiBcIiArIGNudGIpO1xuICAgICAqL1xuICAgIHJldHVybiBjbnRiIC0gY250YTtcbn1cbmV4cG9ydHMuY21wQnlOckNhdGVnb3JpZXNBbmRTYW1lRG9tYWluID0gY21wQnlOckNhdGVnb3JpZXNBbmRTYW1lRG9tYWluO1xuZnVuY3Rpb24gYW5hbHl6ZUNhdGVnb3J5TXVsdChjYXRlZ29yeWxpc3QsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlLCBnV29yZHMpIHtcbiAgICB2YXIgcmVzID0gYW5hbHl6ZUNvbnRleHRTdHJpbmcoY2F0ZWdvcnlsaXN0LCBydWxlcyk7XG4gICAgLy8gIGRlYnVnbG9nKFwicmVzdWx0aW5nIGNhdGVnb3J5IHNlbnRlbmNlc1wiLCBKU09OLnN0cmluZ2lmeShyZXMpKTtcbiAgICB2YXIgcmVzMiA9IGZpbHRlckFjY2VwdGluZ09ubHkocmVzLnNlbnRlbmNlcywgW1wiY2F0ZWdvcnlcIiwgXCJmaWxsZXJcIl0pO1xuICAgIC8vICBjb25zb2xlLmxvZyhcImhlcmUgcmVzMlwiICsgSlNPTi5zdHJpbmdpZnkocmVzMikgKTtcbiAgICAvLyAgY29uc29sZS5sb2coXCJoZXJlIHVuZGVmaW5lZCAhICsgXCIgKyByZXMyLmZpbHRlcihvID0+ICFvKS5sZW5ndGgpO1xuICAgIHJlczIuc29ydChTZW50ZW5jZS5jbXBSYW5raW5nUHJvZHVjdCk7XG4gICAgZGVidWdsb2coXCJyZXN1bHRpbmcgY2F0ZWdvcnkgc2VudGVuY2VzOiBcXG5cIiwgZGVidWdsb2cuZW5hYmxlZCA/IChTZW50ZW5jZS5kdW1wTmljZUFycihyZXMyLnNsaWNlKDAsIDMpLCBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdCkpIDogJy0nKTtcbiAgICAvLyBUT0RPOiAgIHJlczIgPSBmaWx0ZXJBY2NlcHRpbmdPbmx5U2FtZURvbWFpbihyZXMyKTtcbiAgICAvL2RlYnVnbG9nKFwicmVzdWx0aW5nIGNhdGVnb3J5IHNlbnRlbmNlc1wiLCBKU09OLnN0cmluZ2lmeShyZXMyLCB1bmRlZmluZWQsIDIpKTtcbiAgICAvLyBleHBlY3Qgb25seSBjYXRlZ29yaWVzXG4gICAgLy8gd2UgY291bGQgcmFuayBub3cgYnkgY29tbW9uIGRvbWFpbnMgLCBidXQgZm9yIG5vdyB3ZSBvbmx5IHRha2UgdGhlIGZpcnN0IG9uZVxuICAgIGlmICghcmVzMi5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgLy9yZXMuc29ydChjbXBCeU5yQ2F0ZWdvcmllc0FuZFNhbWVEb21haW4pO1xuICAgIHZhciByZXNjYXQgPSBTZW50ZW5jZS5nZXREaXN0aW5jdENhdGVnb3JpZXNJblNlbnRlbmNlKHJlczJbMF0pO1xuICAgIHJldHVybiByZXNjYXQ7XG4gICAgLy8gXCJcIiByZXR1cm4gcmVzWzBdLmZpbHRlcigpXG4gICAgLy8gcmV0dXJuIGNsYXNzaWZ5V29yZFdpdGhUYXJnZXRDYXRlZ29yeShjYXRlZ29yeWxpc3QsICdjYXRlZ29yeScsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlKTtcbn1cbmV4cG9ydHMuYW5hbHl6ZUNhdGVnb3J5TXVsdCA9IGFuYWx5emVDYXRlZ29yeU11bHQ7XG5mdW5jdGlvbiBhbmFseXplT3BlcmF0b3Iob3B3b3JkLCBydWxlcywgd2hvbGVzZW50ZW5jZSkge1xuICAgIHJldHVybiBjbGFzc2lmeVdvcmRXaXRoVGFyZ2V0Q2F0ZWdvcnkob3B3b3JkLCAnb3BlcmF0b3InLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG59XG5leHBvcnRzLmFuYWx5emVPcGVyYXRvciA9IGFuYWx5emVPcGVyYXRvcjtcbnZhciBFckVycm9yID0gcmVxdWlyZShcIi4vZXJlcnJvclwiKTtcbnZhciBMaXN0QWxsID0gcmVxdWlyZShcIi4vbGlzdGFsbFwiKTtcbi8vIGNvbnN0IHJlc3VsdCA9IFdoYXRJcy5yZXNvbHZlQ2F0ZWdvcnkoY2F0LCBhMS5lbnRpdHksXG4vLyAgIHRoZU1vZGVsLm1SdWxlcywgdGhlTW9kZWwudG9vbHMsIHRoZU1vZGVsLnJlY29yZHMpO1xuZnVuY3Rpb24gcmVzb2x2ZUNhdGVnb3J5KGNhdGVnb3J5LCBjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzLCByZWNvcmRzKSB7XG4gICAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHsgZXJyb3JzOiBbRXJFcnJvci5tYWtlRXJyb3JfRU1QVFlfSU5QVVQoKV0sIHRva2VuczogW10sIGFuc3dlcnM6IFtdIH07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICAvKlxuICAgICAgICAgICAgdmFyIG1hdGNoZWQgPSBJbnB1dEZpbHRlci5hbmFseXplU3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMpO1xuICAgICAgICAgICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImFmdGVyIG1hdGNoZWQgXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkKSk6ICctJyk7XG4gICAgICAgICAgICB2YXIgYVNlbnRlbmNlcyA9IElucHV0RmlsdGVyLmV4cGFuZE1hdGNoQXJyKG1hdGNoZWQpO1xuICAgICAgICAgICAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgICBkZWJ1Z2xvZyhcImFmdGVyIGV4cGFuZFwiICsgYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgICAgICAgICAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgICAgICAgICB9ICovXG4gICAgICAgIC8vIHZhciBjYXRlZ29yeVNldCA9IE1vZGVsLmdldEFsbFJlY29yZENhdGVnb3JpZXNGb3JUYXJnZXRDYXRlZ29yeSh0aGVNb2RlbCwgY2F0LCB0cnVlKTtcbiAgICAgICAgdmFyIHJlcyA9IExpc3RBbGwubGlzdEFsbFdpdGhDb250ZXh0KGNhdGVnb3J5LCBjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzLCByZWNvcmRzKTtcbiAgICAgICAgLy8qIHNvcnQgYnkgc2VudGVuY2VcbiAgICAgICAgcmVzLmFuc3dlcnMuZm9yRWFjaChmdW5jdGlvbiAobykgeyBvLl9yYW5raW5nID0gby5fcmFua2luZyAqIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG8uc2VudGVuY2UpOyB9KTtcbiAgICAgICAgcmVzLmFuc3dlcnMuc29ydChjbXBCeVJhbmtpbmcpO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cbn1cbmV4cG9ydHMucmVzb2x2ZUNhdGVnb3J5ID0gcmVzb2x2ZUNhdGVnb3J5O1xuLypcbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlQ2F0ZWdvcnlPbGQoY2F0ZWdvcnk6IHN0cmluZywgY29udGV4dFF1ZXJ5U3RyaW5nOiBzdHJpbmcsXG4gIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+KTogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzIHtcbiAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4geyBlcnJvcnM6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSwgdG9rZW5zOiBbXSwgYW5zd2VyczogW10gfTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBwcm9jZXNzU3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMpO1xuICAgIC8vYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24ob1NlbnRlbmNlKSB7IHJldHVybiBJbnB1dEZpbHRlci5yZWluRm9yY2Uob1NlbnRlbmNlKTsgfSk7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImFmdGVyIHJlaW5mb3JjZVwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICB9KS5qb2luKFwiXFxuXCIpKSA6ICctJyk7XG4gICAgdmFyIG1hdGNoZWRBbnN3ZXJzID0gbWF0Y2hSZWNvcmRzKGFTZW50ZW5jZXNSZWluZm9yY2VkLCBjYXRlZ29yeSwgcmVjb3Jkcyk7IC8vYVRvb2w6IEFycmF5PElNYXRjaC5JVG9vbD4pOiBhbnkgLyAqIG9iamVjdHN0cmVhbSogLyB7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcIiBtYXRjaGVkQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMsIHVuZGVmaW5lZCwgMikpIDogJy0nKTtcbiAgICByZXR1cm4gbWF0Y2hlZEFuc3dlcnM7XG4gIH1cbn1cbiovXG5mdW5jdGlvbiByZXNvbHZlQ2F0ZWdvcmllcyhjYXRlZ29yaWVzLCBjb250ZXh0UXVlcnlTdHJpbmcsIHRoZU1vZGVsLCBkb21haW5DYXRlZ29yeUZpbHRlcikge1xuICAgIHZhciByZWNvcmRzID0gdGhlTW9kZWwucmVjb3JkcztcbiAgICB2YXIgcnVsZXMgPSB0aGVNb2RlbC5ydWxlcztcbiAgICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZXJyb3JzOiBbRXJFcnJvci5tYWtlRXJyb3JfRU1QVFlfSU5QVVQoKV0sXG4gICAgICAgICAgICB0dXBlbGFuc3dlcnM6IFtdLFxuICAgICAgICAgICAgdG9rZW5zOiBbXVxuICAgICAgICB9O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgLy8gdmFyIGNhdGVnb3J5U2V0ID0gTW9kZWwuZ2V0QWxsUmVjb3JkQ2F0ZWdvcmllc0ZvclRhcmdldENhdGVnb3J5KHRoZU1vZGVsLCBjYXQsIHRydWUpO1xuICAgICAgICB2YXIgcmVzID0gTGlzdEFsbC5saXN0QWxsVHVwZWxXaXRoQ29udGV4dChjYXRlZ29yaWVzLCBjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzLCByZWNvcmRzLCBkb21haW5DYXRlZ29yeUZpbHRlcik7XG4gICAgICAgIC8vKiBzb3J0IGJ5IHNlbnRlbmNlXG4gICAgICAgIHJlcy50dXBlbGFuc3dlcnMuZm9yRWFjaChmdW5jdGlvbiAobykgeyBvLl9yYW5raW5nID0gby5fcmFua2luZyAqIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG8uc2VudGVuY2UpOyB9KTtcbiAgICAgICAgcmVzLnR1cGVsYW5zd2Vycy5zb3J0KGNtcEJ5UmFua2luZ1R1cGVsKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG59XG5leHBvcnRzLnJlc29sdmVDYXRlZ29yaWVzID0gcmVzb2x2ZUNhdGVnb3JpZXM7XG5mdW5jdGlvbiBpc0luZGlzY3JpbWluYXRlUmVzdWx0KHJlc3VsdHMpIHtcbiAgICB2YXIgY250ID0gcmVzdWx0cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHJlc3VsdCkge1xuICAgICAgICBpZiAoc2FmZUVxdWFsKHJlc3VsdC5fcmFua2luZywgcmVzdWx0c1swXS5fcmFua2luZykpIHtcbiAgICAgICAgICAgIHJldHVybiBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgIH0sIDApO1xuICAgIGlmIChjbnQgPiAxKSB7XG4gICAgICAgIC8vIHNlYXJjaCBmb3IgYSBkaXNjcmltaW5hdGluZyBjYXRlZ29yeSB2YWx1ZVxuICAgICAgICB2YXIgZGlzY3JpbWluYXRpbmcgPSBPYmplY3Qua2V5cyhyZXN1bHRzWzBdLnJlY29yZCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBjYXRlZ29yeSkge1xuICAgICAgICAgICAgaWYgKChjYXRlZ29yeS5jaGFyQXQoMCkgIT09ICdfJyAmJiBjYXRlZ29yeSAhPT0gcmVzdWx0c1swXS5jYXRlZ29yeSlcbiAgICAgICAgICAgICAgICAmJiAocmVzdWx0c1swXS5yZWNvcmRbY2F0ZWdvcnldICE9PSByZXN1bHRzWzFdLnJlY29yZFtjYXRlZ29yeV0pKSB7XG4gICAgICAgICAgICAgICAgcHJldi5wdXNoKGNhdGVnb3J5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwcmV2O1xuICAgICAgICB9LCBbXSk7XG4gICAgICAgIGlmIChkaXNjcmltaW5hdGluZy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBcIk1hbnkgY29tcGFyYWJsZSByZXN1bHRzLCBwZXJoYXBzIHlvdSB3YW50IHRvIHNwZWNpZnkgYSBkaXNjcmltaW5hdGluZyBcIiArIGRpc2NyaW1pbmF0aW5nLmpvaW4oJywnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJ1lvdXIgcXVlc3Rpb24gZG9lcyBub3QgaGF2ZSBhIHNwZWNpZmljIGFuc3dlcic7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5leHBvcnRzLmlzSW5kaXNjcmltaW5hdGVSZXN1bHQgPSBpc0luZGlzY3JpbWluYXRlUmVzdWx0O1xuZnVuY3Rpb24gaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdFR1cGVsKHJlc3VsdHMpIHtcbiAgICB2YXIgY250ID0gcmVzdWx0cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHJlc3VsdCkge1xuICAgICAgICBpZiAoc2FmZUVxdWFsKHJlc3VsdC5fcmFua2luZywgcmVzdWx0c1swXS5fcmFua2luZykpIHtcbiAgICAgICAgICAgIHJldHVybiBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgIH0sIDApO1xuICAgIGlmIChjbnQgPiAxKSB7XG4gICAgICAgIC8vIHNlYXJjaCBmb3IgYSBkaXNjcmltaW5hdGluZyBjYXRlZ29yeSB2YWx1ZVxuICAgICAgICB2YXIgZGlzY3JpbWluYXRpbmcgPSBPYmplY3Qua2V5cyhyZXN1bHRzWzBdLnJlY29yZCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBjYXRlZ29yeSkge1xuICAgICAgICAgICAgaWYgKChjYXRlZ29yeS5jaGFyQXQoMCkgIT09ICdfJyAmJiByZXN1bHRzWzBdLmNhdGVnb3JpZXMuaW5kZXhPZihjYXRlZ29yeSkgPCAwKVxuICAgICAgICAgICAgICAgICYmIChyZXN1bHRzWzBdLnJlY29yZFtjYXRlZ29yeV0gIT09IHJlc3VsdHNbMV0ucmVjb3JkW2NhdGVnb3J5XSkpIHtcbiAgICAgICAgICAgICAgICBwcmV2LnB1c2goY2F0ZWdvcnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgICAgIH0sIFtdKTtcbiAgICAgICAgaWYgKGRpc2NyaW1pbmF0aW5nLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiTWFueSBjb21wYXJhYmxlIHJlc3VsdHMsIHBlcmhhcHMgeW91IHdhbnQgdG8gc3BlY2lmeSBhIGRpc2NyaW1pbmF0aW5nIFwiICsgZGlzY3JpbWluYXRpbmcuam9pbignLCcpICsgJyBvciB1c2UgXCJsaXN0IGFsbCAuLi5cIic7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICdZb3VyIHF1ZXN0aW9uIGRvZXMgbm90IGhhdmUgYSBzcGVjaWZpYyBhbnN3ZXInO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xufVxuZXhwb3J0cy5pc0luZGlzY3JpbWluYXRlUmVzdWx0VHVwZWwgPSBpc0luZGlzY3JpbWluYXRlUmVzdWx0VHVwZWw7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
