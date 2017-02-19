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
function cmpByRanking(a, b) {
    var cmp = -safeDelta(a._ranking, b._ranking);
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
    var cmp = -safeDelta(a._ranking, b._ranking);
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
/**
 * list all top level rankings
 */
function matchRecordsTupelHavingContext(pSentences, categories, records, categorySet) {
    return matchRecordsQuickMultipleCategories(pSentences, categories, records, categorySet);
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
            /*if (process.env.ABOT_BET2) {
              */
            var matchedLen = Object.keys(matched).length + Object.keys(hasCategory).length;
            var mismatchedLen = Object.keys(mismatched).length;
            /*       if(record.TransactionCode) {
                     debuglog(' here tcode : ' + record.TransactionCode);
                   }
                               if(record.TransactionCode === 'S_ALR_87012394') {
                debuglog("TEHONE adding " + extractResult(categories,record).join(";"));
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
                   }
            */
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
            /*} else {
            // if(matched > 0 || mismatched > 0 ) {
            //   console.log(" m" + matched + " mismatched" + mismatched);
            // }
            //console.log(JSON.stringify(aSentence.oSentence));
              if (imatched > imismatched) {
                var rec = {
                  sentence: aSentence.oSentence,
                  record: record,
                  categories: categories,
                  result: extractResult(categories, record),
                  _ranking: calcRankingSimple(imatched, imismatched, (nouse + missingcat), aSentence.cntRelevantWords)
                };
                res.push(rec);
              }
             }
             */
        });
    });
    perflog("sort (a=" + res.length + ")");
    res.sort(cmpByResultThenRankingTupel);
    perflog("MRQMC filterRetain ...");
    var result1 = Object.assign({ tupelanswers: res }, pSentences);
    /*debuglog("NEWMAP" + res.map(o => "\nrank" + o._ranking + " =>"
                + o.result.join("\n")).join("\n")); */
    var result2 = filterRetainTopRankedResultTupel(result1);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC93aGF0aXMudHMiLCJtYXRjaC93aGF0aXMuanMiXSwibmFtZXMiOlsiSW5wdXRGaWx0ZXIiLCJyZXF1aXJlIiwiZGVidWciLCJkZWJ1Z2xvZyIsImRlYnVnbG9nViIsInBlcmZsb2ciLCJtb2NrRGVidWciLCJvIiwiZXhwb3J0cyIsIl8iLCJNYXRjaCIsIlNlbnRlbmNlIiwiV29yZCIsIkFsZ29sIiwiY21wQnlSZXN1bHRUaGVuUmFua2luZyIsImEiLCJiIiwiY21wIiwicmVzdWx0IiwibG9jYWxlQ29tcGFyZSIsIl9yYW5raW5nIiwibG9jYWxlQ29tcGFyZUFycnMiLCJhYXJlc3VsdCIsImJicmVzdWx0IiwiYmxlbiIsImxlbmd0aCIsImV2ZXJ5IiwiaW5kZXgiLCJzYWZlRXF1YWwiLCJkZWx0YSIsIk1hdGgiLCJhYnMiLCJSQU5LSU5HX0VQU0lMT04iLCJzYWZlRGVsdGEiLCJjbXBCeVJlc3VsdFRoZW5SYW5raW5nVHVwZWwiLCJhYSIsImJiIiwiY21wQnlSYW5raW5nIiwia2V5cyIsIk9iamVjdCIsInJlY29yZCIsImNvbmNhdCIsInNvcnQiLCJyZXMiLCJyZWR1Y2UiLCJwcmV2Iiwic0tleSIsImNtcEJ5UmFua2luZ1R1cGVsIiwiZHVtcE5pY2UiLCJhbnN3ZXIiLCJzIiwicHVzaCIsImNhdGVnb3J5IiwiZm9yRWFjaCIsInNSZXF1aXJlcyIsImNoYXJBdCIsIm9TZW50ZW5jZSIsInNlbnRlbmNlIiwib1dvcmQiLCJzV29yZCIsInN0cmluZyIsIm1hdGNoZWRTdHJpbmciLCJkdW1wTmljZVR1cGVsIiwiY2F0ZWdvcmllcyIsImpvaW4iLCJkdW1wV2VpZ2h0c1RvcCIsInRvb2xtYXRjaGVzIiwib3B0aW9ucyIsIm9NYXRjaCIsInRvcCIsImZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdCIsImFuc3dlcnMiLCJmaWx0ZXIiLCJpUmVzIiwiZW5hYmxlZCIsIkpTT04iLCJzdHJpbmdpZnkiLCJhc3NpZ24iLCJmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHRUdXBlbCIsInR1cGVsYW5zd2VycyIsImlzRXF1YWwiLCJjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5IiwibWF0Y2hlZCIsImhhc0NhdGVnb3J5IiwibWlzbWF0Y2hlZCIsInJlbGV2YW50Q291bnQiLCJoYXNEb21haW4iLCJsZW5NYXRjaGVkIiwiZmFjdG9yIiwiY2FsY1JhbmtpbmdQcm9kdWN0IiwicG93IiwibGVuSGFzQ2F0ZWdvcnkiLCJmYWN0b3JIIiwibGVuTWlzTWF0Y2hlZCIsImZhY3RvcjIiLCJkaXZpc29yIiwibWF0Y2hSZWNvcmRzVHVwZWxIYXZpbmdDb250ZXh0IiwicFNlbnRlbmNlcyIsInJlY29yZHMiLCJjYXRlZ29yeVNldCIsIm1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzIiwibWFrZVNpbXBsaWZpZWRTZW50ZW5jZXNDYXRlZ29yeVNldDIiLCJhU2VudGVuY2VzIiwidHJhY2siLCJzZW50ZW5jZXMiLCJtYXAiLCJhRG9tYWlucyIsInJXb3JkcyIsImZsIiwibGYiLCJkb21haW5zIiwiY250UmVsZXZhbnRXb3JkcyIsIm1ha2VTaW1wbGlmaWVkU2VudGVuY2VzIiwiaXNGaWxsZXIiLCJleHRyYWN0UmVzdWx0IiwiZG9tYWluQ2F0ZWdvcnlGaWx0ZXIiLCJFcnJvciIsImZyZWV6ZSIsImNhdGVnb3J5RiIsInJlbGV2YW50UmVjb3JkcyIsImluZGV4T2YiLCJfZG9tYWluIiwiY2F0IiwidW5kZWZpbmVkIiwib2JqIiwiYVNpbXBsaWZpZWRTZW50ZW5jZXMiLCJhU2VudGVuY2UiLCJpbWlzbWF0Y2hlZCIsImltYXRjaGVkIiwibm91c2UiLCJmb3VuZGNhdCIsIm1pc3NpbmdjYXQiLCJpc0NhdGVnb3J5IiwibWF0Y2hlZERvbWFpbiIsIm1hdGNoZWRMZW4iLCJtaXNtYXRjaGVkTGVuIiwicmVjIiwicmVzdWx0MSIsInJlc3VsdDIiLCJjbGFzc2lmeVdvcmRXaXRoVGFyZ2V0Q2F0ZWdvcnkiLCJ3b3JkIiwidGFyZ2V0Y2F0ZWdvcnkiLCJydWxlcyIsIndob2xlc2VudGVuY2UiLCJjYXRzIiwiY2F0ZWdvcml6ZUFXb3JkIiwiYW5hbHl6ZUNhdGVnb3J5IiwiY2F0ZWdvcnl3b3JkIiwic3BsaXRBdENvbW1hQW5kIiwic3RyIiwiciIsInNwbGl0IiwicnRyaW1tZWQiLCJTdHJpbmciLCJ0cmltIiwiYW5hbHl6ZUNhdGVnb3J5TXVsdE9ubHlBbmRDb21tYSIsImNhdGVnb3J5bGlzdCIsInJjYXQiLCJmaWx0ZXJBY2NlcHRpbmdPbmx5IiwiaUluZGV4IiwiRXJiYXNlIiwicHJvY2Vzc1N0cmluZyIsInF1ZXJ5Iiwid29yZENhY2hlIiwiYW5hbHl6ZUNvbnRleHRTdHJpbmciLCJjb250ZXh0UXVlcnlTdHJpbmciLCJhU2VudGVuY2VzUmVpbmZvcmNlZCIsInNsaWNlIiwiQ3V0b2ZmX1NlbnRlbmNlcyIsInJhbmtpbmdQcm9kdWN0IiwiY21wQnlOckNhdGVnb3JpZXNBbmRTYW1lRG9tYWluIiwiY250YSIsImdldERpc3RpbmN0Q2F0ZWdvcmllc0luU2VudGVuY2UiLCJjbnRiIiwiYW5hbHl6ZUNhdGVnb3J5TXVsdCIsImdXb3JkcyIsInJlczIiLCJjbXBSYW5raW5nUHJvZHVjdCIsImR1bXBOaWNlQXJyIiwicmVzY2F0IiwiYW5hbHl6ZU9wZXJhdG9yIiwib3B3b3JkIiwiRXJFcnJvciIsIkxpc3RBbGwiLCJyZXNvbHZlQ2F0ZWdvcnkiLCJlcnJvcnMiLCJtYWtlRXJyb3JfRU1QVFlfSU5QVVQiLCJ0b2tlbnMiLCJsaXN0QWxsV2l0aENvbnRleHQiLCJyZXNvbHZlQ2F0ZWdvcmllcyIsInRoZU1vZGVsIiwibGlzdEFsbFR1cGVsV2l0aENvbnRleHQiLCJmaWx0ZXJPbmx5VG9wUmFua2VkIiwicmVzdWx0cyIsImZpbHRlck9ubHlUb3BSYW5rZWRUdXBlbCIsImlzSW5kaXNjcmltaW5hdGVSZXN1bHQiLCJjbnQiLCJkaXNjcmltaW5hdGluZyIsImlzSW5kaXNjcmltaW5hdGVSZXN1bHRUdXBlbCJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztBQ01BOzs7O0FE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Q0FBUixFQUFXbEksVUFBWCxDQUFzQnlELE9BQXRCLENBQThCcEUsUUFBOUIsSUFBMEMsQ0FBekUsSUFDRTZJLFFBQVEsQ0FBUixFQUFXekosTUFBWCxDQUFrQlksUUFBbEIsTUFBZ0M2SSxRQUFRLENBQVIsRUFBV3pKLE1BQVgsQ0FBa0JZLFFBQWxCLENBRHRDLEVBQ29FO0FBQ2xFUCxxQkFBS00sSUFBTCxDQUFVQyxRQUFWO0FBQ0Q7QUFDRCxtQkFBT1AsSUFBUDtBQUNELFNBTm9CLEVBTWxCLEVBTmtCLENBQXJCO0FBT0EsWUFBSXdKLGVBQWU1SyxNQUFuQixFQUEyQjtBQUN6QixtQkFBTywyRUFBMkU0SyxlQUFlckksSUFBZixDQUFvQixHQUFwQixDQUEzRSxHQUFzRyx3QkFBN0c7QUFDRDtBQUNELGVBQU8sK0NBQVA7QUFDRDtBQUNELFdBQU8yRCxTQUFQO0FBQ0Q7QUFyQkRuSCxRQUFBOEwsMkJBQUEsR0FBQUEsMkJBQUEiLCJmaWxlIjoibWF0Y2gvd2hhdGlzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKlxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuYW5hbHl6ZVxuICogQGZpbGUgYW5hbHl6ZS50c1xuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxuICovXG5cblxuaW1wb3J0ICogYXMgSW5wdXRGaWx0ZXIgZnJvbSAnLi9pbnB1dEZpbHRlcic7XG5cbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcblxudmFyIGRlYnVnbG9nID0gZGVidWcoJ3doYXRpcycpO1xudmFyIGRlYnVnbG9nViA9IGRlYnVnKCd3aGF0VmlzJyk7XG52YXIgcGVyZmxvZyA9IGRlYnVnKCdwZXJmJyk7XG5cblxuZXhwb3J0IGZ1bmN0aW9uIG1vY2tEZWJ1ZyhvKSB7XG4gIGRlYnVnbG9nID0gbztcbiAgZGVidWdsb2dWID0gbztcbiAgcGVyZmxvZyA9IG87XG59XG5cblxuaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAnLi4vdXRpbHMvdXRpbHMnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuXG5pbXBvcnQgKiBhcyBJTWF0Y2ggZnJvbSAnLi9pZm1hdGNoJztcblxuXG5pbXBvcnQgKiBhcyBNYXRjaCBmcm9tICcuL21hdGNoJztcblxuXG5pbXBvcnQgKiBhcyBUb29sbWF0Y2hlciBmcm9tICcuL3Rvb2xtYXRjaGVyJztcblxuaW1wb3J0ICogYXMgU2VudGVuY2UgZnJvbSAnLi9zZW50ZW5jZSc7XG5cbmltcG9ydCAqIGFzIFdvcmQgZnJvbSAnLi93b3JkJztcblxuaW1wb3J0ICogYXMgQWxnb2wgZnJvbSAnLi9hbGdvbCc7XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGNtcEJ5UmVzdWx0VGhlblJhbmtpbmcoYTogSU1hdGNoLklXaGF0SXNBbnN3ZXIsIGI6IElNYXRjaC5JV2hhdElzQW5zd2VyKSB7XG4gIHZhciBjbXAgPSBhLnJlc3VsdC5sb2NhbGVDb21wYXJlKGIucmVzdWx0KTtcbiAgaWYgKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cbiAgcmV0dXJuIC0oYS5fcmFua2luZyAtIGIuX3JhbmtpbmcpO1xufVxuXG5mdW5jdGlvbiBsb2NhbGVDb21wYXJlQXJycyhhYXJlc3VsdDogc3RyaW5nW10sIGJicmVzdWx0OiBzdHJpbmdbXSk6IG51bWJlciB7XG4gIHZhciBjbXAgPSAwO1xuICB2YXIgYmxlbiA9IGJicmVzdWx0Lmxlbmd0aDtcbiAgYWFyZXN1bHQuZXZlcnkoZnVuY3Rpb24gKGEsIGluZGV4KSB7XG4gICAgaWYgKGJsZW4gPD0gaW5kZXgpIHtcbiAgICAgIGNtcCA9IC0xO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBjbXAgPSBhLmxvY2FsZUNvbXBhcmUoYmJyZXN1bHRbaW5kZXhdKTtcbiAgICBpZiAoY21wKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9KTtcbiAgaWYgKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cbiAgaWYgKGJsZW4gPiBhYXJlc3VsdC5sZW5ndGgpIHtcbiAgICBjbXAgPSArMTtcbiAgfVxuICByZXR1cm4gMDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNhZmVFcXVhbChhIDogbnVtYmVyLCBiIDogbnVtYmVyKSA6IGJvb2xlYW4ge1xuICB2YXIgZGVsdGEgPSBhIC0gYiA7XG4gIGlmKE1hdGguYWJzKGRlbHRhKSA8IEFsZ29sLlJBTktJTkdfRVBTSUxPTikge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNhZmVEZWx0YShhIDogbnVtYmVyLCBiIDogbnVtYmVyKSA6IG51bWJlciB7XG4gIHZhciBkZWx0YSA9IGEgLSBiIDtcbiAgaWYoTWF0aC5hYnMoZGVsdGEpIDwgQWxnb2wuUkFOS0lOR19FUFNJTE9OKSB7XG4gICAgcmV0dXJuIDA7XG4gIH1cbiAgcmV0dXJuIGRlbHRhO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY21wQnlSZXN1bHRUaGVuUmFua2luZ1R1cGVsKGFhOiBJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyLCBiYjogSU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlcikge1xuICB2YXIgY21wID0gbG9jYWxlQ29tcGFyZUFycnMoYWEucmVzdWx0LCBiYi5yZXN1bHQpO1xuICBpZiAoY21wKSB7XG4gICAgcmV0dXJuIGNtcDtcbiAgfVxuICByZXR1cm4gLXNhZmVEZWx0YShhYS5fcmFua2luZyxiYi5fcmFua2luZyk7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGNtcEJ5UmFua2luZyhhOiBJTWF0Y2guSVdoYXRJc0Fuc3dlciwgYjogSU1hdGNoLklXaGF0SXNBbnN3ZXIpIHtcbiAgdmFyIGNtcCA9IC0gc2FmZURlbHRhKGEuX3JhbmtpbmcsIGIuX3JhbmtpbmcpIGFzIG51bWJlcjtcbiAgaWYgKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cbiAgY21wID0gYS5yZXN1bHQubG9jYWxlQ29tcGFyZShiLnJlc3VsdCk7XG4gIGlmIChjbXApIHtcbiAgICByZXR1cm4gY21wO1xuICB9XG5cbiAgLy8gYXJlIHJlY29yZHMgZGlmZmVyZW50P1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGEucmVjb3JkKS5jb25jYXQoT2JqZWN0LmtleXMoYi5yZWNvcmQpKS5zb3J0KCk7XG4gIHZhciByZXMgPSBrZXlzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgc0tleSkge1xuICAgIGlmIChwcmV2KSB7XG4gICAgICByZXR1cm4gcHJldjtcbiAgICB9XG4gICAgaWYgKGIucmVjb3JkW3NLZXldICE9PSBhLnJlY29yZFtzS2V5XSkge1xuICAgICAgaWYgKCFiLnJlY29yZFtzS2V5XSkge1xuICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgICBpZiAoIWEucmVjb3JkW3NLZXldKSB7XG4gICAgICAgIHJldHVybiArMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhLnJlY29yZFtzS2V5XS5sb2NhbGVDb21wYXJlKGIucmVjb3JkW3NLZXldKTtcbiAgICB9XG4gICAgcmV0dXJuIDA7XG4gIH0sIDApO1xuICByZXR1cm4gcmVzO1xufVxuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGNtcEJ5UmFua2luZ1R1cGVsKGE6IElNYXRjaC5JV2hhdElzVHVwZWxBbnN3ZXIsIGI6IElNYXRjaC5JV2hhdElzVHVwZWxBbnN3ZXIpIHtcbiAgdmFyIGNtcCA9IC0gc2FmZURlbHRhKGEuX3JhbmtpbmcsIGIuX3JhbmtpbmcpO1xuICBpZiAoY21wKSB7XG4gICAgcmV0dXJuIGNtcDtcbiAgfVxuICBjbXAgPSBsb2NhbGVDb21wYXJlQXJycyhhLnJlc3VsdCwgYi5yZXN1bHQpO1xuICBpZiAoY21wKSB7XG4gICAgcmV0dXJuIGNtcDtcbiAgfVxuICAvLyBhcmUgcmVjb3JkcyBkaWZmZXJlbnQ/XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYS5yZWNvcmQpLmNvbmNhdChPYmplY3Qua2V5cyhiLnJlY29yZCkpLnNvcnQoKTtcbiAgdmFyIHJlcyA9IGtleXMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBzS2V5KSB7XG4gICAgaWYgKHByZXYpIHtcbiAgICAgIHJldHVybiBwcmV2O1xuICAgIH1cbiAgICBpZiAoYi5yZWNvcmRbc0tleV0gIT09IGEucmVjb3JkW3NLZXldKSB7XG4gICAgICBpZiAoIWIucmVjb3JkW3NLZXldKSB7XG4gICAgICAgIHJldHVybiAtMTtcbiAgICAgIH1cbiAgICAgIGlmICghYS5yZWNvcmRbc0tleV0pIHtcbiAgICAgICAgcmV0dXJuICsxO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGEucmVjb3JkW3NLZXldLmxvY2FsZUNvbXBhcmUoYi5yZWNvcmRbc0tleV0pO1xuICAgIH1cbiAgICByZXR1cm4gMDtcbiAgfSwgMCk7XG4gIHJldHVybiByZXM7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGR1bXBOaWNlKGFuc3dlcjogSU1hdGNoLklXaGF0SXNBbnN3ZXIpIHtcbiAgdmFyIHJlc3VsdCA9IHtcbiAgICBzOiBcIlwiLFxuICAgIHB1c2g6IGZ1bmN0aW9uIChzKSB7IHRoaXMucyA9IHRoaXMucyArIHM7IH1cbiAgfTtcbiAgdmFyIHMgPVxuICAgIGAqKlJlc3VsdCBmb3IgY2F0ZWdvcnk6ICR7YW5zd2VyLmNhdGVnb3J5fSBpcyAke2Fuc3dlci5yZXN1bHR9XG4gcmFuazogJHthbnN3ZXIuX3Jhbmtpbmd9XG5gO1xuICByZXN1bHQucHVzaChzKTtcbiAgT2JqZWN0LmtleXMoYW5zd2VyLnJlY29yZCkuZm9yRWFjaChmdW5jdGlvbiAoc1JlcXVpcmVzLCBpbmRleCkge1xuICAgIGlmIChzUmVxdWlyZXMuY2hhckF0KDApICE9PSAnXycpIHtcbiAgICAgIHJlc3VsdC5wdXNoKGByZWNvcmQ6ICR7c1JlcXVpcmVzfSAtPiAke2Fuc3dlci5yZWNvcmRbc1JlcXVpcmVzXX1gKTtcbiAgICB9XG4gICAgcmVzdWx0LnB1c2goJ1xcbicpO1xuICB9KTtcbiAgdmFyIG9TZW50ZW5jZSA9IGFuc3dlci5zZW50ZW5jZTtcbiAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpbmRleCkge1xuICAgIHZhciBzV29yZCA9IGBbJHtpbmRleH1dIDogJHtvV29yZC5jYXRlZ29yeX0gXCIke29Xb3JkLnN0cmluZ31cIiA9PiBcIiR7b1dvcmQubWF0Y2hlZFN0cmluZ31cImBcbiAgICByZXN1bHQucHVzaChzV29yZCArIFwiXFxuXCIpO1xuICB9KVxuICByZXN1bHQucHVzaChcIi5cXG5cIik7XG4gIHJldHVybiByZXN1bHQucztcbn1cbmV4cG9ydCBmdW5jdGlvbiBkdW1wTmljZVR1cGVsKGFuc3dlcjogSU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlcikge1xuICB2YXIgcmVzdWx0ID0ge1xuICAgIHM6IFwiXCIsXG4gICAgcHVzaDogZnVuY3Rpb24gKHMpIHsgdGhpcy5zID0gdGhpcy5zICsgczsgfVxuICB9O1xuICB2YXIgcyA9XG4gICAgYCoqUmVzdWx0IGZvciBjYXRlZ29yaWVzOiAke2Fuc3dlci5jYXRlZ29yaWVzLmpvaW4oXCI7XCIpfSBpcyAke2Fuc3dlci5yZXN1bHR9XG4gcmFuazogJHthbnN3ZXIuX3Jhbmtpbmd9XG5gO1xuICByZXN1bHQucHVzaChzKTtcbiAgT2JqZWN0LmtleXMoYW5zd2VyLnJlY29yZCkuZm9yRWFjaChmdW5jdGlvbiAoc1JlcXVpcmVzLCBpbmRleCkge1xuICAgIGlmIChzUmVxdWlyZXMuY2hhckF0KDApICE9PSAnXycpIHtcbiAgICAgIHJlc3VsdC5wdXNoKGByZWNvcmQ6ICR7c1JlcXVpcmVzfSAtPiAke2Fuc3dlci5yZWNvcmRbc1JlcXVpcmVzXX1gKTtcbiAgICB9XG4gICAgcmVzdWx0LnB1c2goJ1xcbicpO1xuICB9KTtcbiAgdmFyIG9TZW50ZW5jZSA9IGFuc3dlci5zZW50ZW5jZTtcbiAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpbmRleCkge1xuICAgIHZhciBzV29yZCA9IGBbJHtpbmRleH1dIDogJHtvV29yZC5jYXRlZ29yeX0gXCIke29Xb3JkLnN0cmluZ31cIiA9PiBcIiR7b1dvcmQubWF0Y2hlZFN0cmluZ31cImBcbiAgICByZXN1bHQucHVzaChzV29yZCArIFwiXFxuXCIpO1xuICB9KVxuICByZXN1bHQucHVzaChcIi5cXG5cIik7XG4gIHJldHVybiByZXN1bHQucztcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gZHVtcFdlaWdodHNUb3AodG9vbG1hdGNoZXM6IEFycmF5PElNYXRjaC5JV2hhdElzQW5zd2VyPiwgb3B0aW9uczogYW55KSB7XG4gIHZhciBzID0gJyc7XG4gIHRvb2xtYXRjaGVzLmZvckVhY2goZnVuY3Rpb24gKG9NYXRjaCwgaW5kZXgpIHtcbiAgICBpZiAoaW5kZXggPCBvcHRpb25zLnRvcCkge1xuICAgICAgcyA9IHMgKyBcIldoYXRJc0Fuc3dlcltcIiArIGluZGV4ICsgXCJdLi4uXFxuXCI7XG4gICAgICBzID0gcyArIGR1bXBOaWNlKG9NYXRjaCk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHQocmVzOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnMpOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnMge1xuICB2YXIgcmVzdWx0ID0gcmVzLmFuc3dlcnMuZmlsdGVyKGZ1bmN0aW9uIChpUmVzLCBpbmRleCkge1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICBkZWJ1Z2xvZygncmV0YWluIHRvcFJhbmtlZDogJyArIGluZGV4ICsgJyAnICsgSlNPTi5zdHJpbmdpZnkoaVJlcykpO1xuICAgIH1cbiAgICBpZiAoaVJlcy5yZXN1bHQgPT09IChyZXMuYW5zd2Vyc1tpbmRleCAtIDFdICYmIHJlcy5hbnN3ZXJzW2luZGV4IC0gMV0ucmVzdWx0KSkge1xuICAgICAgZGVidWdsb2coJ3NraXAnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0pO1xuICByZXN1bHQuc29ydChjbXBCeVJhbmtpbmcpO1xuICB2YXIgYSA9IE9iamVjdC5hc3NpZ24oeyBhbnN3ZXJzOiByZXN1bHQgfSwgcmVzLCB7IGFuc3dlcnM6IHJlc3VsdCB9KTtcbiAgYS5hbnN3ZXJzID0gcmVzdWx0O1xuICByZXR1cm4gYTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdFR1cGVsKHJlczogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNUdXBlbEFuc3dlcnMpOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc1R1cGVsQW5zd2VycyB7XG4gIHZhciByZXN1bHQgPSByZXMudHVwZWxhbnN3ZXJzLmZpbHRlcihmdW5jdGlvbiAoaVJlcywgaW5kZXgpIHtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgZGVidWdsb2coJyByZXRhaW4gdHVwZWwgJyArIGluZGV4ICsgJyAnICsgSlNPTi5zdHJpbmdpZnkoaVJlcykpO1xuICAgIH1cbiAgICBpZiAoXy5pc0VxdWFsKGlSZXMucmVzdWx0LCByZXMudHVwZWxhbnN3ZXJzW2luZGV4IC0gMV0gJiYgcmVzLnR1cGVsYW5zd2Vyc1tpbmRleCAtIDFdLnJlc3VsdCkpIHtcbiAgICAgIGRlYnVnbG9nKCdza2lwJyk7XG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0pO1xuICByZXN1bHQuc29ydChjbXBCeVJhbmtpbmdUdXBlbCk7XG4gIHJldHVybiBPYmplY3QuYXNzaWduKHJlcywgeyB0dXBlbGFuc3dlcnM6IHJlc3VsdCB9KTtcbn1cblxuLyoqXG4gKiBBIHJhbmtpbmcgd2hpY2ggaXMgcHVyZWx5IGJhc2VkIG9uIHRoZSBudW1iZXJzIG9mIG1hdGNoZWQgZW50aXRpZXMsXG4gKiBkaXNyZWdhcmRpbmcgZXhhY3RuZXNzIG9mIG1hdGNoXG4gKi9cbi8qXG5leHBvcnQgZnVuY3Rpb24gY2FsY1JhbmtpbmdTaW1wbGUobWF0Y2hlZDogbnVtYmVyLFxuICBtaXNtYXRjaGVkOiBudW1iZXIsIG5vdXNlOiBudW1iZXIsXG4gIHJlbGV2YW50Q291bnQ6IG51bWJlcik6IG51bWJlciB7XG4gIC8vIDIgOiAwXG4gIC8vIDEgOiAwXG4gIHZhciBmYWN0b3IgPSBtYXRjaGVkICogTWF0aC5wb3coMS41LCBtYXRjaGVkKSAqIE1hdGgucG93KDEuNSwgbWF0Y2hlZCk7XG4gIHZhciBmYWN0b3IyID0gTWF0aC5wb3coMC40LCBtaXNtYXRjaGVkKTtcbiAgdmFyIGZhY3RvcjMgPSBNYXRoLnBvdygwLjQsIG5vdXNlKTtcbiAgcmV0dXJuIE1hdGgucG93KGZhY3RvcjIgKiBmYWN0b3IgKiBmYWN0b3IzLCAxIC8gKG1pc21hdGNoZWQgKyBtYXRjaGVkICsgbm91c2UpKTtcbn1cbiovXG5cbmV4cG9ydCBmdW5jdGlvbiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQ6IHsgW2tleTogc3RyaW5nXTogSU1hdGNoLklXb3JkIH0sXG4gIGhhc0NhdGVnb3J5OiB7IFtrZXk6IHN0cmluZ106IG51bWJlciB9LFxuICBtaXNtYXRjaGVkOiB7IFtrZXk6IHN0cmluZ106IElNYXRjaC5JV29yZCB9LCByZWxldmFudENvdW50OiBudW1iZXIsIGhhc0RvbWFpbiA6IG51bWJlcik6IG51bWJlciB7XG5cblxuICB2YXIgbGVuTWF0Y2hlZCA9IE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aDtcbiAgdmFyIGZhY3RvciA9IE1hdGNoLmNhbGNSYW5raW5nUHJvZHVjdChtYXRjaGVkKTtcbiAgZmFjdG9yICo9IE1hdGgucG93KDEuNSwgbGVuTWF0Y2hlZCk7XG4gIGlmKGhhc0RvbWFpbikge1xuICAgIGZhY3RvciAqPSAxLjU7XG4gIH1cbiAgdmFyIGxlbkhhc0NhdGVnb3J5ID0gT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aDtcbiAgdmFyIGZhY3RvckggPSBNYXRoLnBvdygxLjEsIGxlbkhhc0NhdGVnb3J5KTtcblxuICB2YXIgbGVuTWlzTWF0Y2hlZCA9IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aDtcbiAgdmFyIGZhY3RvcjIgPSBNYXRjaC5jYWxjUmFua2luZ1Byb2R1Y3QobWlzbWF0Y2hlZCk7XG4gIGZhY3RvcjIgKj0gTWF0aC5wb3coMC40LCBsZW5NaXNNYXRjaGVkKTtcbiAgdmFyIGRpdmlzb3IgPSAgKGxlbk1pc01hdGNoZWQgKyBsZW5IYXNDYXRlZ29yeSArIGxlbk1hdGNoZWQpO1xuICBkaXZpc29yID0gZGl2aXNvciA/IGRpdmlzb3IgOiAxO1xuICByZXR1cm4gTWF0aC5wb3coZmFjdG9yMiAqIGZhY3RvckggKiBmYWN0b3IsIDEgLyAoZGl2aXNvcikpO1xufVxuXG4vKipcbiAqIGxpc3QgYWxsIHRvcCBsZXZlbCByYW5raW5nc1xuICovXG4vKlxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVjb3Jkc0hhdmluZ0NvbnRleHQoXG4gIHBTZW50ZW5jZXM6IElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzLCBjYXRlZ29yeTogc3RyaW5nLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sXG4gIGNhdGVnb3J5U2V0OiB7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfSlcbiAgOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnMge1xuXG4gIC8vZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gIHZhciByZWxldmFudFJlY29yZHMgPSByZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAocmVjb3JkOiBJTWF0Y2guSVJlY29yZCkge1xuICAgIHJldHVybiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSAmJiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gbnVsbCk7XG4gIH0pO1xuICB2YXIgcmVzID0gW107XG4gIGRlYnVnbG9nKFwiTWF0Y2hSZWNvcmRzSGF2aW5nQ29udGV4dCA6IHJlbGV2YW50IHJlY29yZHMgbnI6XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoKTtcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcInNlbnRlbmNlcyBhcmUgOiBcIiArIEpTT04uc3RyaW5naWZ5KHBTZW50ZW5jZXMsIHVuZGVmaW5lZCwgMikpIDogXCItXCIpO1xuICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiY2F0ZWdvcnkgXCIgKyBjYXRlZ29yeSArIFwiIGFuZCBjYXRlZ29yeXNldCBpczogXCIgKyBKU09OLnN0cmluZ2lmeShjYXRlZ29yeVNldCwgdW5kZWZpbmVkLCAyKSkgOiBcIi1cIik7XG4gIGlmIChwcm9jZXNzLmVudi5BQk9UX0ZBU1QgJiYgY2F0ZWdvcnlTZXQpIHtcbiAgICAvLyB3ZSBhcmUgb25seSBpbnRlcmVzdGVkIGluIGNhdGVnb3JpZXMgcHJlc2VudCBpbiByZWNvcmRzIGZvciBkb21haW5zIHdoaWNoIGNvbnRhaW4gdGhlIGNhdGVnb3J5XG4gICAgLy8gdmFyIGNhdGVnb3J5c2V0ID0gTW9kZWwuY2FsY3VsYXRlUmVsZXZhbnRSZWNvcmRDYXRlZ29yaWVzKHRoZU1vZGVsLGNhdGVnb3J5KTtcbiAgICAvL2tub3dpbmcgdGhlIHRhcmdldFxuICAgIHBlcmZsb2coXCJnb3QgY2F0ZWdvcnlzZXQgd2l0aCBcIiArIE9iamVjdC5rZXlzKGNhdGVnb3J5U2V0KS5sZW5ndGgpO1xuICAgIHZhciBmbCA9IDA7XG4gICAgdmFyIGxmID0gMDtcbiAgICB2YXIgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBwU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgdmFyIGZXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICAgIH0pO1xuICAgICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiAhIWNhdGVnb3J5U2V0W29Xb3JkLmNhdGVnb3J5XSB8fCBXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCk7XG4gICAgICB9KTtcbiAgICAgIGZsID0gZmwgKyBvU2VudGVuY2UubGVuZ3RoO1xuICAgICAgbGYgPSBsZiArIHJXb3Jkcy5sZW5ndGg7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCwgLy8gbm90IGEgZmlsbGVyICAvLyB0byBiZSBjb21wYXRpYmxlIGl0IHdvdWxkIGJlIGZXb3Jkc1xuICAgICAgICByV29yZHM6IHJXb3Jkc1xuICAgICAgfTtcbiAgICB9KTtcbiAgICBPYmplY3QuZnJlZXplKGFTaW1wbGlmaWVkU2VudGVuY2VzKTtcbiAgICBkZWJ1Z2xvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgZmwgKyBcIi0+XCIgKyBsZiArIFwiKVwiKTtcbiAgICBwZXJmbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyBmbCArIFwiLT5cIiArIGxmICsgXCIpXCIpO1xuICAgIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgICB2YXIgaGFzQ2F0ZWdvcnkgPSB7fTtcbiAgICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSBhU2VudGVuY2UuY250UmVsZXZhbnRXb3JkcztcbiAgICAgICAgYVNlbnRlbmNlLnJXb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCkgJiYgcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICBoYXNDYXRlZ29yeVtvV29yZC5tYXRjaGVkU3RyaW5nXSA9IDE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIGlmICgoT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoICsgT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aCkgPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLm9TZW50ZW5jZSxcbiAgICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxuICAgICAgICAgICAgcmVzdWx0OiByZWNvcmRbY2F0ZWdvcnldLFxuICAgICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSk7XG4gICAgZGVidWdsb2coXCJoZXJlIGluIHdlaXJkXCIpO1xuICB9IGVsc2Uge1xuICAgIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgIHBTZW50ZW5jZXMuc2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgICB2YXIgaGFzQ2F0ZWdvcnkgPSB7fTtcbiAgICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSAwO1xuICAgICAgICBhU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICBpZiAoIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCkpIHtcbiAgICAgICAgICAgIGNudFJlbGV2YW50V29yZHMgPSBjbnRSZWxldmFudFdvcmRzICsgMTtcbiAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICAgIG1hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpICYmIHJlY29yZFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgICBoYXNDYXRlZ29yeVtvV29yZC5tYXRjaGVkU3RyaW5nXSA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKChPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoKSA+IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aCkge1xuICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2UsXG4gICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICAgIHJlc3VsdDogcmVjb3JkW2NhdGVnb3J5XSxcbiAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0pO1xuICB9XG4gIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmcpO1xuICBkZWJ1Z2xvZyhcIiBhZnRlciBzb3J0XCIgKyByZXMubGVuZ3RoKTtcbiAgdmFyIHJlc3VsdCA9IE9iamVjdC5hc3NpZ24oe30sIHBTZW50ZW5jZXMsIHsgYW5zd2VyczogcmVzIH0pO1xuICByZXR1cm4gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0KHJlc3VsdCk7XG59XG4qL1xuXG4vKipcbiAqIGxpc3QgYWxsIHRvcCBsZXZlbCByYW5raW5nc1xuICovXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hSZWNvcmRzVHVwZWxIYXZpbmdDb250ZXh0KFxuICBwU2VudGVuY2VzOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcywgY2F0ZWdvcmllczogc3RyaW5nW10sIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPixcbiAgY2F0ZWdvcnlTZXQ6IElNYXRjaC5JRG9tYWluQ2F0ZWdvcnlGaWx0ZXIpXG4gIDogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNUdXBlbEFuc3dlcnMge1xuICAgIHJldHVybiBtYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcyhwU2VudGVuY2VzLCBjYXRlZ29yaWVzLCByZWNvcmRzLCBjYXRlZ29yeVNldCk7XG59XG5cbi8qXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hSZWNvcmRzKGFTZW50ZW5jZXM6IElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzLCBjYXRlZ29yeTogc3RyaW5nLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4pXG4gIDogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzIHtcbiAgLy8gaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgLy8gICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRzLCB1bmRlZmluZWQsIDIpKTtcbiAgLy8gfVxuICB2YXIgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZDogSU1hdGNoLklSZWNvcmQpIHtcbiAgICByZXR1cm4gKHJlY29yZFtjYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkgJiYgKHJlY29yZFtjYXRlZ29yeV0gIT09IG51bGwpO1xuICB9KTtcbiAgdmFyIHJlcyA9IFtdO1xuICBkZWJ1Z2xvZyhcInJlbGV2YW50IHJlY29yZHMgbnI6XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoKTtcbiAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgIGFTZW50ZW5jZXMuc2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fVxuICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gMDtcbiAgICAgIGFTZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICBpZiAoIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCkpIHtcbiAgICAgICAgICBjbnRSZWxldmFudFdvcmRzID0gY250UmVsZXZhbnRXb3JkcyArIDE7XG4gICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICYmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgaWYgKE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aCA+IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aCkge1xuICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgc2VudGVuY2U6IGFTZW50ZW5jZSxcbiAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgcmVzdWx0OiByZWNvcmRbY2F0ZWdvcnldLFxuICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZyhtYXRjaGVkLCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KVxuICB9KTtcbiAgcmVzLnNvcnQoY21wQnlSZXN1bHRUaGVuUmFua2luZyk7XG4gIHZhciByZXN1bHQgPSBPYmplY3QuYXNzaWduKHt9LCBhU2VudGVuY2VzLCB7IGFuc3dlcnM6IHJlcyB9KTtcbiAgcmV0dXJuIGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdChyZXN1bHQpO1xufVxuKi9cbi8qXG5mdW5jdGlvbiBtYWtlU2ltcGxpZmllZFNlbnRlbmNlc0NhdGVnb3J5U2V0KGFTZW50ZW5jZXM6IElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzLFxuICBjYXRlZ29yeVNldDogeyBba2V5OiBzdHJpbmddOiBib29sZWFuIH0sIHRyYWNrOiB7IGZsOiBudW1iZXIsIGxmOiBudW1iZXIgfVxuKToge1xuICBkb21haW5zOiBzdHJpbmdbXSxcbiAgb1NlbnRlbmNlOiBJTWF0Y2guSVNlbnRlbmNlLFxuICBjbnRSZWxldmFudFdvcmRzOiBudW1iZXIsXG4gIHJXb3JkczogSU1hdGNoLklXb3JkW11cbn1bXSB7XG4gIHJldHVybiBhU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgIHZhciBhRG9tYWlucyA9IFtdIGFzIHN0cmluZ1tdO1xuICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcImRvbWFpblwiKSB7XG4gICAgICAgIGFEb21haW5zLnB1c2gob1dvcmQubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJtZXRhXCIpIHtcbiAgICAgICAgLy8gZS5nLiBkb21haW4gWFhYXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAhIWNhdGVnb3J5U2V0W29Xb3JkLmNhdGVnb3J5XTtcbiAgICB9KTtcbiAgICB0cmFjay5mbCArPSBvU2VudGVuY2UubGVuZ3RoO1xuICAgIHRyYWNrLmxmICs9IHJXb3Jkcy5sZW5ndGg7XG4gICAgcmV0dXJuIHtcbiAgICAgIGRvbWFpbnM6IGFEb21haW5zLFxuICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLFxuICAgICAgcldvcmRzOiByV29yZHNcbiAgICB9O1xuICB9KTtcbn1cbiovXG5cbmZ1bmN0aW9uIG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzQ2F0ZWdvcnlTZXQyKGFTZW50ZW5jZXM6IElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzLFxuICBjYXRlZ29yeVNldDogeyBba2V5OiBzdHJpbmddOiBib29sZWFuIH0sIHRyYWNrOiB7IGZsOiBudW1iZXIsIGxmOiBudW1iZXIgfVxuKToge1xuICBkb21haW5zOiBzdHJpbmdbXSxcbiAgb1NlbnRlbmNlOiBJTWF0Y2guSVNlbnRlbmNlLFxuICBjbnRSZWxldmFudFdvcmRzOiBudW1iZXIsXG4gIHJXb3JkczogSU1hdGNoLklXb3JkW11cbn1bXSB7XG4gIHJldHVybiBhU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgIHZhciBhRG9tYWlucyA9IFtdIGFzIHN0cmluZ1tdO1xuICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcImRvbWFpblwiKSB7XG4gICAgICAgIGFEb21haW5zLnB1c2gob1dvcmQubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJtZXRhXCIpIHtcbiAgICAgICAgLy8gZS5nLiBkb21haW4gWFhYXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmKG9Xb3JkLmNhdGVnb3J5ID09PSBcImNhdGVnb3J5XCIpIHtcbiAgICAgICAgaWYoY2F0ZWdvcnlTZXRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuICEhY2F0ZWdvcnlTZXRbb1dvcmQuY2F0ZWdvcnldO1xuICAgIH0pO1xuICAgIHRyYWNrLmZsICs9IG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgdHJhY2subGYgKz0gcldvcmRzLmxlbmd0aDtcbiAgICByZXR1cm4ge1xuICAgICAgZG9tYWluczogYURvbWFpbnMsXG4gICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsXG4gICAgICByV29yZHM6IHJXb3Jkc1xuICAgIH07XG4gIH0pO1xufVxuXG5cbmZ1bmN0aW9uIG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzKGFTZW50ZW5jZXMgOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcywgIHRyYWNrOiB7IGZsOiBudW1iZXIsIGxmOiBudW1iZXIgfSk6IHtcbiAgZG9tYWluczogc3RyaW5nW10sXG4gIG9TZW50ZW5jZTogSU1hdGNoLklTZW50ZW5jZSxcbiAgY250UmVsZXZhbnRXb3JkczogbnVtYmVyLFxuICByV29yZHM6IElNYXRjaC5JV29yZFtdXG59W10ge1xuICByZXR1cm4gYVNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICB2YXIgZG9tYWlucyA9IFtdIGFzIHN0cmluZ1tdO1xuICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcImRvbWFpblwiKSB7XG4gICAgICAgIGRvbWFpbnMucHVzaChvV29yZC5tYXRjaGVkU3RyaW5nKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcIm1ldGFcIikge1xuICAgICAgICAvLyBlLmcuIGRvbWFpbiBYWFhcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuICFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpO1xuICAgIH0pO1xuICAgIHRyYWNrLmZsICs9IG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgdHJhY2subGYgKz0gcldvcmRzLmxlbmd0aDtcbiAgICByZXR1cm4ge1xuICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICBkb21haW5zOiBkb21haW5zLFxuICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCxcbiAgICAgIHJXb3JkczogcldvcmRzXG4gICAgfTtcbiAgfSk7XG59XG5cblxuZnVuY3Rpb24gZXh0cmFjdFJlc3VsdChjYXRlZ29yaWVzOiBzdHJpbmdbXSwgcmVjb3JkOiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9KTogc3RyaW5nW10ge1xuICByZXR1cm4gY2F0ZWdvcmllcy5tYXAoZnVuY3Rpb24gKGNhdGVnb3J5KSB7IHJldHVybiByZWNvcmRbY2F0ZWdvcnldIHx8IFwibi9hXCI7IH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hSZWNvcmRzUXVpY2tNdWx0aXBsZUNhdGVnb3JpZXMocFNlbnRlbmNlczogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMsIGNhdGVnb3JpZXM6IHN0cmluZ1tdLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sIGRvbWFpbkNhdGVnb3J5RmlsdGVyPzogSU1hdGNoLklEb21haW5DYXRlZ29yeUZpbHRlcilcbiAgOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc1R1cGVsQW5zd2VycyB7XG4gIC8vIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gIC8vICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRzLCB1bmRlZmluZWQsIDIpKTtcbiAgLy8gfVxuXG4gIGlmKGRvbWFpbkNhdGVnb3J5RmlsdGVyICYmICEgZG9tYWluQ2F0ZWdvcnlGaWx0ZXIuZG9tYWlucyApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJvbGQgY2F0ZWdvcnlzU0V0ID8/XCIpXG4gIH1cblxuICBPYmplY3QuZnJlZXplKGRvbWFpbkNhdGVnb3J5RmlsdGVyKTtcbiAgdmFyIGNhdGVnb3J5RiA9IGNhdGVnb3JpZXNbMF07XG5cbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcIm1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzIChyPVwiICsgKHJlY29yZHMgJiYgcmVjb3Jkcy5sZW5ndGgpXG4gICsgXCIgcz1cIiArIChwU2VudGVuY2VzICYmIHBTZW50ZW5jZXMuc2VudGVuY2VzICYmIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCkgKyBcIilcXG4gY2F0ZWdvcmllczpcIiArKGNhdGVnb3JpZXMgJiYgIGNhdGVnb3JpZXMuam9pbihcIlxcblwiKSkgKyBcIiBjYXRlZ29yeVNldDogXCJcbiAgKyAoIGRvbWFpbkNhdGVnb3J5RmlsdGVyICYmICh0eXBlb2YgZG9tYWluQ2F0ZWdvcnlGaWx0ZXIuY2F0ZWdvcnlTZXQgPT09IFwib2JqZWN0XCIpICYmIE9iamVjdC5rZXlzKGRvbWFpbkNhdGVnb3J5RmlsdGVyLmNhdGVnb3J5U2V0KS5qb2luKFwiXFxuXCIpKSkgIDogXCItXCIpO1xuICBwZXJmbG9nKFwibWF0Y2hSZWNvcmRzUXVpY2tNdWx0IC4uLihyPVwiICsgcmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIpXCIpO1xuXG4gIC8vY29uc29sZS5sb2coJ2NhdGVnb3JpZXMgJyArICBKU09OLnN0cmluZ2lmeShjYXRlZ29yaWVzKSk7XG5cbiAgLy9jb25zb2xlLmxvZygnY2F0ZWdyb3lTZXQnICsgIEpTT04uc3RyaW5naWZ5KGNhdGVnb3J5U2V0KSk7XG5cblxuICB2YXIgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3JkcztcblxuICBpZihkb21haW5DYXRlZ29yeUZpbHRlciAmJiBkb21haW5DYXRlZ29yeUZpbHRlci5kb21haW5zKSB7XG4gICAgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZDogSU1hdGNoLklSZWNvcmQpIHtcbiAgICAgIHJldHVybiAoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIuZG9tYWlucy5pbmRleE9mKChyZWNvcmQgYXMgYW55KS5fZG9tYWluKSA+PSAwKTtcbiAgICB9KTtcbiAgfVxuICBlbHNlIHtcbiAgICByZWxldmFudFJlY29yZHMgPSByZWxldmFudFJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQ6IElNYXRjaC5JUmVjb3JkKSB7XG4gICAgICByZXR1cm4gIWNhdGVnb3JpZXMuZXZlcnkoY2F0ID0+XG4gICAgICAgICAgICAocmVjb3JkW2NhdF0gPT09IHVuZGVmaW5lZCkgfHwgKHJlY29yZFtjYXRdID09PSBudWxsKVxuICAgICAgKTtcbiAgLy8gICAgICB9XG5cbiAvLyAgICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnlGXSAhPT0gdW5kZWZpbmVkKSAmJiAocmVjb3JkW2NhdGVnb3J5Rl0gIT09IG51bGwpO1xuICAgIH0pO1xuICB9XG4gIHZhciByZXMgPSBbXSBhcyBBcnJheTxJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyPjtcbiAgZGVidWdsb2coXCJyZWxldmFudCByZWNvcmRzIHdpdGggZmlyc3QgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIpXCIpO1xuICBwZXJmbG9nKFwicmVsZXZhbnQgcmVjb3JkcyB3aXRoIGZpcnN0IG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHNlbnRlbmNlcyBcIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCk7XG4gIGlmICgvKnByb2Nlc3MuZW52LkFCT1RfRkFTVCAmJiovIGRvbWFpbkNhdGVnb3J5RmlsdGVyKSB7XG4gICAgLy8gd2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbiBjYXRlZ29yaWVzIHByZXNlbnQgaW4gcmVjb3JkcyBmb3IgZG9tYWlucyB3aGljaCBjb250YWluIHRoZSBjYXRlZ29yeVxuICAgIC8vIHZhciBjYXRlZ29yeXNldCA9IE1vZGVsLmNhbGN1bGF0ZVJlbGV2YW50UmVjb3JkQ2F0ZWdvcmllcyh0aGVNb2RlbCxjYXRlZ29yeSk7XG4gICAgLy9rbm93aW5nIHRoZSB0YXJnZXRcbiAgICBwZXJmbG9nKFwiZ290IGNhdGVnb3J5c2V0IHdpdGggXCIgKyBPYmplY3Qua2V5cyhkb21haW5DYXRlZ29yeUZpbHRlci5jYXRlZ29yeVNldCkubGVuZ3RoKTtcbiAgICB2YXIgb2JqID0geyBmbDogMCwgbGY6IDAgfTtcbiAgICB2YXIgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBbXSBhcyB7XG4gIGRvbWFpbnM6IHN0cmluZ1tdLFxuICBvU2VudGVuY2U6IElNYXRjaC5JU2VudGVuY2UsXG4gIGNudFJlbGV2YW50V29yZHM6IG51bWJlcixcbiAgcldvcmRzOiBJTWF0Y2guSVdvcmRbXVxufVtdO1xuICAvLyAgaWYgKHByb2Nlc3MuZW52LkFCT1RfQkVUMSkge1xuICAgICBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzQ2F0ZWdvcnlTZXQyKHBTZW50ZW5jZXMsIGRvbWFpbkNhdGVnb3J5RmlsdGVyLmNhdGVnb3J5U2V0LCBvYmopIGFzIGFueTtcbiAgLy8gIH0gZWxzZSB7XG4gIC8vICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXNDYXRlZ29yeVNldChwU2VudGVuY2VzLCBjYXRlZ29yeVNldCwgb2JqKSBhcyBhbnk7XG4gIC8vICB9XG4gICAgcGVyZmxvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgb2JqLmZsICsgXCItPlwiICsgb2JqLmxmICsgXCIpXCIpO1xuICB9IGVsc2Uge1xuICAgIGRlYnVnbG9nKFwibm90IGFib3RfZmFzdCAhXCIpO1xuICAgIHZhciB0cmFjayA9IHsgZmw6IDAgLCBsZiA6IDB9O1xuICAgIHZhciBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzKHBTZW50ZW5jZXMsdHJhY2spO1xuLypcbiAgICBwU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICAgIH0pO1xuICAgICAgZmwgPSBmbCArIG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgICBsZiA9IGxmICsgcldvcmRzLmxlbmd0aDtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLFxuICAgICAgICByV29yZHM6IHJXb3Jkc1xuICAgICAgfTtcbiAgICB9KTtcbiAgICAqL1xuICAgIGRlYnVnbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyB0cmFjay5mbCArIFwiLT5cIiArIHRyYWNrLmxmICsgXCIpXCIpO1xuICAgIHBlcmZsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIHRyYWNrLmZsICsgXCItPlwiICsgdHJhY2subGYgKyBcIilcIik7XG4gIH1cblxuICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiaGVyZSBzaW1wbGlmaWVkIHNlbnRlbmNlcyBcIiArXG4gIGFTaW1wbGlmaWVkU2VudGVuY2VzLm1hcChvID0+IFwiXFxuRG9tYWluPVwiICsgby5kb21haW5zLmpvaW4oXCJcXG5cIikgKyBcIlxcblwiICsgIFNlbnRlbmNlLmR1bXBOaWNlKG8ucldvcmRzKSkuam9pbihcIlxcblwiKSkgOiBcIi1cIik7XG5cbiAgLy9jb25zb2xlLmxvZyhcImhlcmUgcmVjcm9kc1wiICsgcmVsZXZhbnRSZWNvcmRzLm1hcCggKG8saW5kZXgpID0+ICBcIiBpbmRleCA9IFwiICsgaW5kZXggKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KG8pKS5qb2luKFwiXFxuXCIpKTtcbiAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgdmFyIGltaXNtYXRjaGVkID0gMDtcbiAgICAgIHZhciBpbWF0Y2hlZCA9IDA7XG4gICAgICB2YXIgbm91c2UgPSAwO1xuICAgICAgdmFyIGZvdW5kY2F0ID0gMTtcbiAgICAgIHZhciBtaXNzaW5nY2F0ID0gMDtcblxuICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgIHZhciBtaXNtYXRjaGVkID0ge307XG4gICAgICB2YXIgaGFzQ2F0ZWdvcnkgPSB7fTtcblxuICAgICAgYVNlbnRlbmNlLnJXb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IDA7XG4gICAgICAgIGlmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgKytpbWF0Y2hlZDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgKytpbWlzbWF0Y2hlZDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICE9PSBcImNhdGVnb3J5XCIpIHtcbiAgICAgICAgICAgIG5vdXNlICs9IDE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICghcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICAgIG1pc3NpbmdjYXQgKz0gMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGZvdW5kY2F0Kz0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICYmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCkgJiYgcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICBoYXNDYXRlZ29yeVtvV29yZC5tYXRjaGVkU3RyaW5nXSA9IDE7XG4gICAgICAgIH0gZWxzZSBpZighV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpKSB7XG4gICAgICAgICAgIC8vIFRPRE8gYmV0dGVyIHVubWFjaHRlZFxuICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB2YXIgbWF0Y2hlZERvbWFpbiA9IDA7XG4gICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IGFTZW50ZW5jZS5yV29yZHMubGVuZ3RoO1xuICAgICAgaWYgKGFTZW50ZW5jZS5kb21haW5zLmxlbmd0aCkge1xuICAgICAgICBpZiAoKHJlY29yZCBhcyBhbnkpLl9kb21haW4gIT09IGFTZW50ZW5jZS5kb21haW5zWzBdKSB7XG4gICAgICAgICAgaW1pc21hdGNoZWQgPSAzMDAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGltYXRjaGVkICs9IDE7XG4gICAgICAgICAgbWF0Y2hlZERvbWFpbiArPSAxO1xuICAgICAgICAgIC8vY29uc29sZS5sb2coXCJHT1QgQSBET01BSU4gSElUXCIgKyBtYXRjaGVkICsgXCIgXCIgKyBtaXNtYXRjaGVkKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvKmlmIChwcm9jZXNzLmVudi5BQk9UX0JFVDIpIHtcbiAgICAgICAgKi9cbiAgICAgICAgdmFyIG1hdGNoZWRMZW4gPSBPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoO1xuICAgICAgICB2YXIgbWlzbWF0Y2hlZExlbiA9IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aDtcbiAvKiAgICAgICBpZihyZWNvcmQuVHJhbnNhY3Rpb25Db2RlKSB7XG4gICAgICAgICAgZGVidWdsb2coJyBoZXJlIHRjb2RlIDogJyArIHJlY29yZC5UcmFuc2FjdGlvbkNvZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYocmVjb3JkLlRyYW5zYWN0aW9uQ29kZSA9PT0gJ1NfQUxSXzg3MDEyMzk0Jykge1xuICAgICBkZWJ1Z2xvZyhcIlRFSE9ORSBhZGRpbmcgXCIgKyBleHRyYWN0UmVzdWx0KGNhdGVnb3JpZXMscmVjb3JkKS5qb2luKFwiO1wiKSk7XG4gICAgICAgICAgICBkZWJ1Z2xvZyhcIndpdGggcmFua2luZyA6IFwiICsgY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeTIobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMsIG1hdGNoZWREb21haW4pKTtcbiAgICAgICAgICAgIGRlYnVnbG9nKFwiIGNyZWF0ZWQgYnkgXCIgKyBPYmplY3Qua2V5cyhtYXRjaGVkKS5tYXAoa2V5ID0+IFwia2V5OlwiICsga2V5XG4gICAgICAgICAgICArIFwiXFxuXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkW2tleV0pKS5qb2luKFwiXFxuXCIpXG4gICAgICAgICAgICArIFwiXFxuaGFzQ2F0IFwiICsgSlNPTi5zdHJpbmdpZnkoaGFzQ2F0ZWdvcnkpXG4gICAgICAgICAgICArIFwiXFxubWlzbWF0IFwiICsgSlNPTi5zdHJpbmdpZnkobWlzbWF0Y2hlZClcbiAgICAgICAgICAgICsgXCJcXG5jblRyZWwgXCIgKyBKU09OLnN0cmluZ2lmeShjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICAgICAgKyBcIlxcbm1hdGNlZERvbWFpbiBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWREb21haW4pXG4gICAgICAgICAgICArIFwiXFxuaGFzQ2F0IFwiICsgT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpXG4gICAgICAgICAgICArIFwiXFxubWlzbWF0IFwiICsgT2JqZWN0LmtleXMobWlzbWF0Y2hlZClcbiAgICAgICAgICAgICsgYFxcbm1hdGNoZWQgJHtPYmplY3Qua2V5cyhtYXRjaGVkKX0gXFxuaGFzY2F0ICR7T2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmpvaW4oXCI7IFwiKX0gXFxubWlzbTogJHtPYmplY3Qua2V5cyhtaXNtYXRjaGVkKX0gXFxuYFxuICAgICAgICAgICAgKyBcIlxcbm1hdGNlZERvbWFpbiBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWREb21haW4pXG5cbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiovXG5cblxuICAgICAgICBpZiAoKGltaXNtYXRjaGVkIDwgMzAwMClcbiAgICAgICAgICAmJiAoKG1hdGNoZWRMZW4gPiBtaXNtYXRjaGVkTGVuIClcbiAgICAgICAgICAgICB8fCAobWF0Y2hlZExlbiA9PT0gbWlzbWF0Y2hlZExlbiAmJiBtYXRjaGVkRG9tYWluID4gMCkpXG4gICAgICAgICkge1xuICAgICAgICAgIC8qXG4gICAgICAgICAgICBkZWJ1Z2xvZyhcImFkZGluZyBcIiArIGV4dHJhY3RSZXN1bHQoY2F0ZWdvcmllcyxyZWNvcmQpLmpvaW4oXCI7XCIpKTtcbiAgICAgICAgICAgIGRlYnVnbG9nKFwid2l0aCByYW5raW5nIDogXCIgKyBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5MihtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcywgbWF0Y2hlZERvbWFpbikpO1xuICAgICAgICAgICAgZGVidWdsb2coXCIgY3JlYXRlZCBieSBcIiArIE9iamVjdC5rZXlzKG1hdGNoZWQpLm1hcChrZXkgPT4gXCJrZXk6XCIgKyBrZXlcbiAgICAgICAgICAgICsgXCJcXG5cIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRba2V5XSkpLmpvaW4oXCJcXG5cIilcbiAgICAgICAgICAgICsgXCJcXG5oYXNDYXQgXCIgKyBKU09OLnN0cmluZ2lmeShoYXNDYXRlZ29yeSlcbiAgICAgICAgICAgICsgXCJcXG5taXNtYXQgXCIgKyBKU09OLnN0cmluZ2lmeShtaXNtYXRjaGVkKVxuICAgICAgICAgICAgKyBcIlxcbmNuVHJlbCBcIiArIEpTT04uc3RyaW5naWZ5KGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgICArIFwiXFxubWF0Y2VkRG9tYWluIFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZERvbWFpbilcbiAgICAgICAgICAgICsgXCJcXG5oYXNDYXQgXCIgKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSlcbiAgICAgICAgICAgICsgXCJcXG5taXNtYXQgXCIgKyBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKVxuICAgICAgICAgICAgKyBgXFxubWF0Y2hlZCAke09iamVjdC5rZXlzKG1hdGNoZWQpfSBcXG5oYXNjYXQgJHtPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkuam9pbihcIjsgXCIpfSBcXG5taXNtOiAke09iamVjdC5rZXlzKG1pc21hdGNoZWQpfSBcXG5gXG4gICAgICAgICAgICArIFwiXFxubWF0Y2VkRG9tYWluIFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZERvbWFpbilcblxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICovXG5cbiAgICAgICAgICAgIHZhciByZWMgPSB7XG4gICAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2Uub1NlbnRlbmNlLFxuICAgICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgICAgY2F0ZWdvcmllczogY2F0ZWdvcmllcyxcbiAgICAgICAgICAgICAgcmVzdWx0OiBleHRyYWN0UmVzdWx0KGNhdGVnb3JpZXMsIHJlY29yZCksXG4gICAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzLCBtYXRjaGVkRG9tYWluKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJoZXJlIHJhbmtpbmdcIiArIHJlYy5fcmFua2luZylcbiAgICAgICAgICAgIGlmICgocmVjLl9yYW5raW5nID09PSBudWxsKSB8fCAhcmVjLl9yYW5raW5nKSB7XG4gICAgICAgICAgICAgIHJlYy5fcmFua2luZyA9IDAuOTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlcy5wdXNoKHJlYyk7XG4gICAgICAgICAgfVxuICAgICAgLyp9IGVsc2Uge1xuICAgICAgLy8gaWYobWF0Y2hlZCA+IDAgfHwgbWlzbWF0Y2hlZCA+IDAgKSB7XG4gICAgICAvLyAgIGNvbnNvbGUubG9nKFwiIG1cIiArIG1hdGNoZWQgKyBcIiBtaXNtYXRjaGVkXCIgKyBtaXNtYXRjaGVkKTtcbiAgICAgIC8vIH1cbiAgICAgIC8vY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYVNlbnRlbmNlLm9TZW50ZW5jZSkpO1xuICAgICAgICBpZiAoaW1hdGNoZWQgPiBpbWlzbWF0Y2hlZCkge1xuICAgICAgICAgIHZhciByZWMgPSB7XG4gICAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLm9TZW50ZW5jZSxcbiAgICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgICAgY2F0ZWdvcmllczogY2F0ZWdvcmllcyxcbiAgICAgICAgICAgIHJlc3VsdDogZXh0cmFjdFJlc3VsdChjYXRlZ29yaWVzLCByZWNvcmQpLFxuICAgICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nU2ltcGxlKGltYXRjaGVkLCBpbWlzbWF0Y2hlZCwgKG5vdXNlICsgbWlzc2luZ2NhdCksIGFTZW50ZW5jZS5jbnRSZWxldmFudFdvcmRzKVxuICAgICAgICAgIH07XG4gICAgICAgICAgcmVzLnB1c2gocmVjKTtcbiAgICAgICAgfVxuICAgICAgIH1cbiAgICAgICAqL1xuICAgIH0pXG4gIH0pO1xuICBwZXJmbG9nKFwic29ydCAoYT1cIiArIHJlcy5sZW5ndGggKyBcIilcIik7XG4gIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbCk7XG4gIHBlcmZsb2coXCJNUlFNQyBmaWx0ZXJSZXRhaW4gLi4uXCIpO1xuICB2YXIgcmVzdWx0MSA9IE9iamVjdC5hc3NpZ24oeyB0dXBlbGFuc3dlcnM6IHJlcyB9LCBwU2VudGVuY2VzKTtcbiAgLypkZWJ1Z2xvZyhcIk5FV01BUFwiICsgcmVzLm1hcChvID0+IFwiXFxucmFua1wiICsgby5fcmFua2luZyArIFwiID0+XCJcbiAgICAgICAgICAgICAgKyBvLnJlc3VsdC5qb2luKFwiXFxuXCIpKS5qb2luKFwiXFxuXCIpKTsgKi9cbiAgdmFyIHJlc3VsdDIgPSBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHRUdXBlbChyZXN1bHQxKTtcbiAgcGVyZmxvZyhcIk1SUU1DIG1hdGNoUmVjb3Jkc1F1aWNrIGRvbmU6IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBhPVwiICsgcmVzLmxlbmd0aCArIFwiKVwiKTtcbiAgcmV0dXJuIHJlc3VsdDI7XG59XG5cblxuZnVuY3Rpb24gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KHdvcmQ6IHN0cmluZywgdGFyZ2V0Y2F0ZWdvcnk6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLFxuICB3aG9sZXNlbnRlbmNlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAvL2NvbnNvbGUubG9nKFwiY2xhc3NpZnkgXCIgKyB3b3JkICsgXCIgXCIgICsgdGFyZ2V0Y2F0ZWdvcnkpO1xuICB2YXIgY2F0cyA9IElucHV0RmlsdGVyLmNhdGVnb3JpemVBV29yZCh3b3JkLCBydWxlcywgd2hvbGVzZW50ZW5jZSwge30pO1xuICAvLyBUT0RPIHF1YWxpZnlcbiAgY2F0cyA9IGNhdHMuZmlsdGVyKGZ1bmN0aW9uIChjYXQpIHtcbiAgICByZXR1cm4gY2F0LmNhdGVnb3J5ID09PSB0YXJnZXRjYXRlZ29yeTtcbiAgfSlcbiAgLy9kZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShjYXRzKSk7XG4gIGlmIChjYXRzLmxlbmd0aCkge1xuICAgIHJldHVybiBjYXRzWzBdLm1hdGNoZWRTdHJpbmc7XG4gIH1cbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZUNhdGVnb3J5KGNhdGVnb3J5d29yZDogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHdob2xlc2VudGVuY2U6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBjbGFzc2lmeVdvcmRXaXRoVGFyZ2V0Q2F0ZWdvcnkoY2F0ZWdvcnl3b3JkLCAnY2F0ZWdvcnknLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzcGxpdEF0Q29tbWFBbmQoc3RyOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIHZhciByID0gc3RyLnNwbGl0KC8oXFxiYW5kXFxiKXxbLF0vKTtcbiAgciA9IHIuZmlsdGVyKGZ1bmN0aW9uIChvLCBpbmRleCkge1xuICAgIGlmIChpbmRleCAlIDIgPiAwKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9KTtcbiAgdmFyIHJ0cmltbWVkID0gci5tYXAoZnVuY3Rpb24gKG8pIHtcbiAgICByZXR1cm4gbmV3IFN0cmluZyhvKS50cmltKCk7XG4gIH0pO1xuICByZXR1cm4gcnRyaW1tZWQ7XG59XG4vKipcbiAqIEEgc2ltcGxlIGltcGxlbWVudGF0aW9uLCBzcGxpdHRpbmcgYXQgYW5kIGFuZCAsXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhbmFseXplQ2F0ZWdvcnlNdWx0T25seUFuZENvbW1hKGNhdGVnb3J5bGlzdDogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHdob2xlc2VudGVuY2U6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgdmFyIHJ0cmltbWVkID0gc3BsaXRBdENvbW1hQW5kKGNhdGVnb3J5bGlzdCk7XG4gIHZhciByY2F0ID0gcnRyaW1tZWQubWFwKGZ1bmN0aW9uIChvKSB7XG4gICAgcmV0dXJuIGFuYWx5emVDYXRlZ29yeShvLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG4gIH0pO1xuICBpZiAocmNhdC5pbmRleE9mKHVuZGVmaW5lZCkgPj0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignXCInICsgcnRyaW1tZWRbcmNhdC5pbmRleE9mKHVuZGVmaW5lZCldICsgJ1wiIGlzIG5vdCBhIGNhdGVnb3J5IScpO1xuICB9XG4gIHJldHVybiByY2F0O1xufVxuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlckFjY2VwdGluZ09ubHkocmVzOiBJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11bXSwgY2F0ZWdvcmllczogc3RyaW5nW10pOlxuICBJTWF0Y2guSUNhdGVnb3JpemVkU3RyaW5nW11bXSB7XG4gIHJldHVybiByZXMuZmlsdGVyKGZ1bmN0aW9uIChhU2VudGVuY2UsIGlJbmRleCkge1xuICAgIHJldHVybiBhU2VudGVuY2UuZXZlcnkoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICByZXR1cm4gY2F0ZWdvcmllcy5pbmRleE9mKG9Xb3JkLmNhdGVnb3J5KSA+PSAwO1xuICAgIH0pO1xuICB9KVxufVxuXG5cbmltcG9ydCAqIGFzIEVyYmFzZSBmcm9tICcuL2VyYmFzZSc7XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHByb2Nlc3NTdHJpbmcocXVlcnk6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzXG4pOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcyB7XG5cbi8vICBpZiAoIXByb2Nlc3MuZW52LkFCT1RfT0xETUFUQ0gpIHtcbiAgICByZXR1cm4gRXJiYXNlLnByb2Nlc3NTdHJpbmcocXVlcnksIHJ1bGVzLCBydWxlcy53b3JkQ2FjaGUpO1xuLy8gIH1cbi8qXG4gIHZhciBtYXRjaGVkID0gSW5wdXRGaWx0ZXIuYW5hbHl6ZVN0cmluZyhxdWVyeSwgcnVsZXMsIHNXb3Jkcyk7XG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgZGVidWdsb2coXCJBZnRlciBtYXRjaGVkIFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZCkpO1xuICB9XG4gIHZhciBhU2VudGVuY2VzID0gSW5wdXRGaWx0ZXIuZXhwYW5kTWF0Y2hBcnIobWF0Y2hlZCk7XG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgZGVidWdsb2coXCJhZnRlciBleHBhbmRcIiArIGFTZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICB9XG4gIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IElucHV0RmlsdGVyLnJlaW5Gb3JjZShhU2VudGVuY2VzKTtcbiAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICBkZWJ1Z2xvZyhcImFmdGVyIHJlaW5mb3JjZVwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICB9XG4gIHJldHVybiB7XG4gICAgZXJyb3JzOiBbXSxcbiAgICBzZW50ZW5jZXM6IGFTZW50ZW5jZXNSZWluZm9yY2VkXG4gIH0gYXMgSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXM7XG4qL1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBhbmFseXplQ29udGV4dFN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmc6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzKTpcbiAgSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMge1xuXG4gIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IHByb2Nlc3NTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcylcbiAgLy8gd2UgbGltaXQgYW5hbHlzaXMgdG8gbiBzZW50ZW5jZXNcbiAgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzID0gYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLnNsaWNlKDAsIEFsZ29sLkN1dG9mZl9TZW50ZW5jZXMpO1xuICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgIGRlYnVnbG9nKFwiYWZ0ZXIgcmVpbmZvcmNlIGFuZCBjdXRvZmZcIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5sZW5ndGggKyBcIlxcblwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgfVxuICByZXR1cm4gYVNlbnRlbmNlc1JlaW5mb3JjZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjbXBCeU5yQ2F0ZWdvcmllc0FuZFNhbWVEb21haW4oYTogSU1hdGNoLklTZW50ZW5jZSwgYjogSU1hdGNoLklTZW50ZW5jZSk6IG51bWJlciB7XG4gIC8vY29uc29sZS5sb2coXCJjb21wYXJlIGFcIiArIGEgKyBcIiBjbnRiIFwiICsgYik7XG4gIHZhciBjbnRhID0gU2VudGVuY2UuZ2V0RGlzdGluY3RDYXRlZ29yaWVzSW5TZW50ZW5jZShhKS5sZW5ndGg7XG4gIHZhciBjbnRiID0gU2VudGVuY2UuZ2V0RGlzdGluY3RDYXRlZ29yaWVzSW5TZW50ZW5jZShiKS5sZW5ndGg7XG4gIC8qXG4gICAgdmFyIGNudGEgPSBhLnJlZHVjZShmdW5jdGlvbihwcmV2LCBvV29yZCkge1xuICAgICAgcmV0dXJuIHByZXYgKyAoKG9Xb3JkLmNhdGVnb3J5ID09PSBcImNhdGVnb3J5XCIpPyAxIDogMCk7XG4gICAgfSwwKTtcbiAgICB2YXIgY250YiA9IGIucmVkdWNlKGZ1bmN0aW9uKHByZXYsIG9Xb3JkKSB7XG4gICAgICByZXR1cm4gcHJldiArICgob1dvcmQuY2F0ZWdvcnkgPT09IFwiY2F0ZWdvcnlcIik/IDEgOiAwKTtcbiAgICB9LDApO1xuICAgLy8gY29uc29sZS5sb2coXCJjbnQgYVwiICsgY250YSArIFwiIGNudGIgXCIgKyBjbnRiKTtcbiAgICovXG4gIHJldHVybiBjbnRiIC0gY250YTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVDYXRlZ29yeU11bHQoY2F0ZWdvcnlsaXN0OiBzdHJpbmcsIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgd2hvbGVzZW50ZW5jZTogc3RyaW5nLCBnV29yZHM6XG4gIHsgW2tleTogc3RyaW5nXTogSU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdIH0pOiBzdHJpbmdbXSB7XG5cblxuXG5cblxuICB2YXIgcmVzID0gYW5hbHl6ZUNvbnRleHRTdHJpbmcoY2F0ZWdvcnlsaXN0LCBydWxlcyk7XG4gIC8vICBkZWJ1Z2xvZyhcInJlc3VsdGluZyBjYXRlZ29yeSBzZW50ZW5jZXNcIiwgSlNPTi5zdHJpbmdpZnkocmVzKSk7XG4gIHZhciByZXMyID0gZmlsdGVyQWNjZXB0aW5nT25seShyZXMuc2VudGVuY2VzLCBbXCJjYXRlZ29yeVwiLCBcImZpbGxlclwiXSk7XG4gIC8vICBjb25zb2xlLmxvZyhcImhlcmUgcmVzMlwiICsgSlNPTi5zdHJpbmdpZnkocmVzMikgKTtcbiAgLy8gIGNvbnNvbGUubG9nKFwiaGVyZSB1bmRlZmluZWQgISArIFwiICsgcmVzMi5maWx0ZXIobyA9PiAhbykubGVuZ3RoKTtcbiAgcmVzMi5zb3J0KFNlbnRlbmNlLmNtcFJhbmtpbmdQcm9kdWN0KTtcbiAgZGVidWdsb2coXCJyZXN1bHRpbmcgY2F0ZWdvcnkgc2VudGVuY2VzOiBcXG5cIiwgZGVidWdsb2cuZW5hYmxlZCA/IChTZW50ZW5jZS5kdW1wTmljZUFycihyZXMyLnNsaWNlKDAsIDMpLCBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdCkpIDogJy0nKTtcbiAgLy8gVE9ETzogICByZXMyID0gZmlsdGVyQWNjZXB0aW5nT25seVNhbWVEb21haW4ocmVzMik7XG4gIC8vZGVidWdsb2coXCJyZXN1bHRpbmcgY2F0ZWdvcnkgc2VudGVuY2VzXCIsIEpTT04uc3RyaW5naWZ5KHJlczIsIHVuZGVmaW5lZCwgMikpO1xuICAvLyBleHBlY3Qgb25seSBjYXRlZ29yaWVzXG4gIC8vIHdlIGNvdWxkIHJhbmsgbm93IGJ5IGNvbW1vbiBkb21haW5zICwgYnV0IGZvciBub3cgd2Ugb25seSB0YWtlIHRoZSBmaXJzdCBvbmVcbiAgaWYgKCFyZXMyLmxlbmd0aCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgLy9yZXMuc29ydChjbXBCeU5yQ2F0ZWdvcmllc0FuZFNhbWVEb21haW4pO1xuICB2YXIgcmVzY2F0ID0gU2VudGVuY2UuZ2V0RGlzdGluY3RDYXRlZ29yaWVzSW5TZW50ZW5jZShyZXMyWzBdKTtcbiAgcmV0dXJuIHJlc2NhdDtcbiAgLy8gXCJcIiByZXR1cm4gcmVzWzBdLmZpbHRlcigpXG4gIC8vIHJldHVybiBjbGFzc2lmeVdvcmRXaXRoVGFyZ2V0Q2F0ZWdvcnkoY2F0ZWdvcnlsaXN0LCAnY2F0ZWdvcnknLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhbmFseXplT3BlcmF0b3Iob3B3b3JkOiBzdHJpbmcsIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgd2hvbGVzZW50ZW5jZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGNsYXNzaWZ5V29yZFdpdGhUYXJnZXRDYXRlZ29yeShvcHdvcmQsICdvcGVyYXRvcicsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlKTtcbn1cblxuXG5pbXBvcnQgKiBhcyBFckVycm9yIGZyb20gJy4vZXJlcnJvcic7XG5cbmltcG9ydCAqIGFzIExpc3RBbGwgZnJvbSAnLi9saXN0YWxsJztcbi8vIGNvbnN0IHJlc3VsdCA9IFdoYXRJcy5yZXNvbHZlQ2F0ZWdvcnkoY2F0LCBhMS5lbnRpdHksXG4vLyAgIHRoZU1vZGVsLm1SdWxlcywgdGhlTW9kZWwudG9vbHMsIHRoZU1vZGVsLnJlY29yZHMpO1xuXG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlQ2F0ZWdvcnkoY2F0ZWdvcnk6IHN0cmluZywgY29udGV4dFF1ZXJ5U3RyaW5nOiBzdHJpbmcsXG4gIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+KTogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzIHtcbiAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4geyBlcnJvcnM6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSwgdG9rZW5zOiBbXSwgYW5zd2VyczogW10gfTtcbiAgfSBlbHNlIHtcbiAgICAvKlxuICAgICAgICB2YXIgbWF0Y2hlZCA9IElucHV0RmlsdGVyLmFuYWx5emVTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcyk7XG4gICAgICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJhZnRlciBtYXRjaGVkIFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZCkpOiAnLScpO1xuICAgICAgICB2YXIgYVNlbnRlbmNlcyA9IElucHV0RmlsdGVyLmV4cGFuZE1hdGNoQXJyKG1hdGNoZWQpO1xuICAgICAgICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgZGVidWdsb2coXCJhZnRlciBleHBhbmRcIiArIGFTZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgICAgICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICAgICAgfSAqL1xuXG5cbiAgICAgICAgICAvLyB2YXIgY2F0ZWdvcnlTZXQgPSBNb2RlbC5nZXRBbGxSZWNvcmRDYXRlZ29yaWVzRm9yVGFyZ2V0Q2F0ZWdvcnkodGhlTW9kZWwsIGNhdCwgdHJ1ZSk7XG5cbiAgICB2YXIgcmVzID0gTGlzdEFsbC5saXN0QWxsV2l0aENvbnRleHQoY2F0ZWdvcnksIGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMsIHJlY29yZHMpO1xuICAgIC8vKiBzb3J0IGJ5IHNlbnRlbmNlXG4gICAgcmVzLmFuc3dlcnMuZm9yRWFjaChvID0+IHsgby5fcmFua2luZyA9IG8uX3JhbmtpbmcgKiAgU2VudGVuY2UucmFua2luZ1Byb2R1Y3QoIG8uc2VudGVuY2UgKTsgfSk7XG4gICAgcmVzLmFuc3dlcnMuc29ydChjbXBCeVJhbmtpbmcpO1xuICAgIHJldHVybiByZXM7XG4vKlxuICAgIC8vID8/PyB2YXIgcmVzID0gTGlzdEFsbC5saXN0QWxsSGF2aW5nQ29udGV4dChjYXRlZ29yeSwgY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcywgcmVjb3Jkcyk7XG5cbiAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBwcm9jZXNzU3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMpO1xuICAgIC8vYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24ob1NlbnRlbmNlKSB7IHJldHVybiBJbnB1dEZpbHRlci5yZWluRm9yY2Uob1NlbnRlbmNlKTsgfSk7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImFmdGVyIHJlaW5mb3JjZVwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICB9KS5qb2luKFwiXFxuXCIpKSA6ICctJyk7XG4gICAgdmFyIG1hdGNoZWRBbnN3ZXJzID0gbWF0Y2hSZWNvcmRzKGFTZW50ZW5jZXNSZWluZm9yY2VkLCBjYXRlZ29yeSwgcmVjb3Jkcyk7IC8vYVRvb2w6IEFycmF5PElNYXRjaC5JVG9vbD4pOiBhbnkgLyAqIG9iamVjdHN0cmVhbSogLyB7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcIiBtYXRjaGVkQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMsIHVuZGVmaW5lZCwgMikpIDogJy0nKTtcbiAgICByZXR1cm4gbWF0Y2hlZEFuc3dlcnM7XG4qL1xuIH1cbn1cblxuLypcbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlQ2F0ZWdvcnlPbGQoY2F0ZWdvcnk6IHN0cmluZywgY29udGV4dFF1ZXJ5U3RyaW5nOiBzdHJpbmcsXG4gIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+KTogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzIHtcbiAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4geyBlcnJvcnM6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSwgdG9rZW5zOiBbXSwgYW5zd2VyczogW10gfTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBwcm9jZXNzU3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMpO1xuICAgIC8vYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24ob1NlbnRlbmNlKSB7IHJldHVybiBJbnB1dEZpbHRlci5yZWluRm9yY2Uob1NlbnRlbmNlKTsgfSk7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImFmdGVyIHJlaW5mb3JjZVwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICB9KS5qb2luKFwiXFxuXCIpKSA6ICctJyk7XG4gICAgdmFyIG1hdGNoZWRBbnN3ZXJzID0gbWF0Y2hSZWNvcmRzKGFTZW50ZW5jZXNSZWluZm9yY2VkLCBjYXRlZ29yeSwgcmVjb3Jkcyk7IC8vYVRvb2w6IEFycmF5PElNYXRjaC5JVG9vbD4pOiBhbnkgLyAqIG9iamVjdHN0cmVhbSogLyB7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcIiBtYXRjaGVkQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMsIHVuZGVmaW5lZCwgMikpIDogJy0nKTtcbiAgICByZXR1cm4gbWF0Y2hlZEFuc3dlcnM7XG4gIH1cbn1cbiovXG5cbmltcG9ydCAqIGFzIE1vZGVsIGZyb20gJy4uL21vZGVsL21vZGVsJztcblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVDYXRlZ29yaWVzKGNhdGVnb3JpZXM6IHN0cmluZ1tdLCBjb250ZXh0UXVlcnlTdHJpbmc6IHN0cmluZyxcbiAgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzLCBkb21haW5DYXRlZ29yeUZpbHRlciA6IElNYXRjaC5JRG9tYWluQ2F0ZWdvcnlGaWx0ZXIpOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc1R1cGVsQW5zd2VycyB7XG4gIHZhciByZWNvcmRzID0gdGhlTW9kZWwucmVjb3JkcztcbiAgdmFyIHJ1bGVzID0gdGhlTW9kZWwucnVsZXM7XG4gIGlmIChjb250ZXh0UXVlcnlTdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczogW0VyRXJyb3IubWFrZUVycm9yX0VNUFRZX0lOUFVUKCldLFxuICAgICAgdHVwZWxhbnN3ZXJzOiBbXSxcbiAgICAgIHRva2VuczogW11cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gdmFyIGNhdGVnb3J5U2V0ID0gTW9kZWwuZ2V0QWxsUmVjb3JkQ2F0ZWdvcmllc0ZvclRhcmdldENhdGVnb3J5KHRoZU1vZGVsLCBjYXQsIHRydWUpO1xuICAgIHZhciByZXMgPSBMaXN0QWxsLmxpc3RBbGxUdXBlbFdpdGhDb250ZXh0KGNhdGVnb3JpZXMsIGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMsIHJlY29yZHMsIGRvbWFpbkNhdGVnb3J5RmlsdGVyKTtcbiAgICAvLyogc29ydCBieSBzZW50ZW5jZVxuICAgIHJlcy50dXBlbGFuc3dlcnMuZm9yRWFjaChvID0+IHsgby5fcmFua2luZyA9IG8uX3JhbmtpbmcgKiAgU2VudGVuY2UucmFua2luZ1Byb2R1Y3QoIG8uc2VudGVuY2UgKTsgfSk7XG4gICAgcmVzLnR1cGVsYW5zd2Vycy5zb3J0KGNtcEJ5UmFua2luZ1R1cGVsKTtcbiAgICByZXR1cm4gcmVzO1xuICB9XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlck9ubHlUb3BSYW5rZWQocmVzdWx0czogQXJyYXk8SU1hdGNoLklXaGF0SXNBbnN3ZXI+KTogQXJyYXk8SU1hdGNoLklXaGF0SXNBbnN3ZXI+IHtcbiAgdmFyIHJlcyA9IHJlc3VsdHMuZmlsdGVyKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICBpZiAoc2FmZUVxdWFsKHJlc3VsdC5fcmFua2luZywgcmVzdWx0c1swXS5fcmFua2luZykpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAocmVzdWx0Ll9yYW5raW5nID49IHJlc3VsdHNbMF0uX3JhbmtpbmcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkxpc3QgdG8gZmlsdGVyIG11c3QgYmUgb3JkZXJlZFwiKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbiAgcmV0dXJuIHJlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlck9ubHlUb3BSYW5rZWRUdXBlbChyZXN1bHRzOiBBcnJheTxJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyPik6IEFycmF5PElNYXRjaC5JV2hhdElzVHVwZWxBbnN3ZXI+IHtcbiAgdmFyIHJlcyA9IHJlc3VsdHMuZmlsdGVyKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICBpZiAoIHNhZmVFcXVhbChyZXN1bHQuX3JhbmtpbmcsIHJlc3VsdHNbMF0uX3JhbmtpbmcpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHJlc3VsdC5fcmFua2luZyA+PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJMaXN0IHRvIGZpbHRlciBtdXN0IGJlIG9yZGVyZWRcIik7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG4gIHJldHVybiByZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0luZGlzY3JpbWluYXRlUmVzdWx0KHJlc3VsdHM6IEFycmF5PElNYXRjaC5JV2hhdElzQW5zd2VyPik6IHN0cmluZyB7XG4gIHZhciBjbnQgPSByZXN1bHRzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgcmVzdWx0KSB7XG4gICAgaWYgKHNhZmVFcXVhbChyZXN1bHQuX3JhbmtpbmcscmVzdWx0c1swXS5fcmFua2luZykpIHtcbiAgICAgIHJldHVybiBwcmV2ICsgMTtcbiAgICB9XG4gIH0sIDApO1xuICBpZiAoY250ID4gMSkge1xuICAgIC8vIHNlYXJjaCBmb3IgYSBkaXNjcmltaW5hdGluZyBjYXRlZ29yeSB2YWx1ZVxuICAgIHZhciBkaXNjcmltaW5hdGluZyA9IE9iamVjdC5rZXlzKHJlc3VsdHNbMF0ucmVjb3JkKS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGNhdGVnb3J5KSB7XG4gICAgICBpZiAoKGNhdGVnb3J5LmNoYXJBdCgwKSAhPT0gJ18nICYmIGNhdGVnb3J5ICE9PSByZXN1bHRzWzBdLmNhdGVnb3J5KVxuICAgICAgICAmJiAocmVzdWx0c1swXS5yZWNvcmRbY2F0ZWdvcnldICE9PSByZXN1bHRzWzFdLnJlY29yZFtjYXRlZ29yeV0pKSB7XG4gICAgICAgIHByZXYucHVzaChjYXRlZ29yeSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJldjtcbiAgICB9LCBbXSk7XG4gICAgaWYgKGRpc2NyaW1pbmF0aW5nLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIFwiTWFueSBjb21wYXJhYmxlIHJlc3VsdHMsIHBlcmhhcHMgeW91IHdhbnQgdG8gc3BlY2lmeSBhIGRpc2NyaW1pbmF0aW5nIFwiICsgZGlzY3JpbWluYXRpbmcuam9pbignLCcpO1xuICAgIH1cbiAgICByZXR1cm4gJ1lvdXIgcXVlc3Rpb24gZG9lcyBub3QgaGF2ZSBhIHNwZWNpZmljIGFuc3dlcic7XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzSW5kaXNjcmltaW5hdGVSZXN1bHRUdXBlbChyZXN1bHRzOiBBcnJheTxJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyPik6IHN0cmluZyB7XG4gIHZhciBjbnQgPSByZXN1bHRzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgcmVzdWx0KSB7XG4gICAgaWYgKHNhZmVFcXVhbChyZXN1bHQuX3JhbmtpbmcscmVzdWx0c1swXS5fcmFua2luZykpIHtcbiAgICAgIHJldHVybiBwcmV2ICsgMTtcbiAgICB9XG4gIH0sIDApO1xuICBpZiAoY250ID4gMSkge1xuICAgIC8vIHNlYXJjaCBmb3IgYSBkaXNjcmltaW5hdGluZyBjYXRlZ29yeSB2YWx1ZVxuICAgIHZhciBkaXNjcmltaW5hdGluZyA9IE9iamVjdC5rZXlzKHJlc3VsdHNbMF0ucmVjb3JkKS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGNhdGVnb3J5KSB7XG4gICAgICBpZiAoKGNhdGVnb3J5LmNoYXJBdCgwKSAhPT0gJ18nICYmIHJlc3VsdHNbMF0uY2F0ZWdvcmllcy5pbmRleE9mKGNhdGVnb3J5KSA8IDApXG4gICAgICAgICYmIChyZXN1bHRzWzBdLnJlY29yZFtjYXRlZ29yeV0gIT09IHJlc3VsdHNbMV0ucmVjb3JkW2NhdGVnb3J5XSkpIHtcbiAgICAgICAgcHJldi5wdXNoKGNhdGVnb3J5KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIFtdKTtcbiAgICBpZiAoZGlzY3JpbWluYXRpbmcubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gXCJNYW55IGNvbXBhcmFibGUgcmVzdWx0cywgcGVyaGFwcyB5b3Ugd2FudCB0byBzcGVjaWZ5IGEgZGlzY3JpbWluYXRpbmcgXCIgKyBkaXNjcmltaW5hdGluZy5qb2luKCcsJykgKyAnIG9yIHVzZSBcImxpc3QgYWxsIC4uLlwiJztcbiAgICB9XG4gICAgcmV0dXJuICdZb3VyIHF1ZXN0aW9uIGRvZXMgbm90IGhhdmUgYSBzcGVjaWZpYyBhbnN3ZXInO1xuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG4iLCIvKipcbiAqXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5hbmFseXplXG4gKiBAZmlsZSBhbmFseXplLnRzXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXG4gKi9cblwidXNlIHN0cmljdFwiO1xudmFyIElucHV0RmlsdGVyID0gcmVxdWlyZShcIi4vaW5wdXRGaWx0ZXJcIik7XG52YXIgZGVidWcgPSByZXF1aXJlKFwiZGVidWdcIik7XG52YXIgZGVidWdsb2cgPSBkZWJ1Zygnd2hhdGlzJyk7XG52YXIgZGVidWdsb2dWID0gZGVidWcoJ3doYXRWaXMnKTtcbnZhciBwZXJmbG9nID0gZGVidWcoJ3BlcmYnKTtcbmZ1bmN0aW9uIG1vY2tEZWJ1ZyhvKSB7XG4gICAgZGVidWdsb2cgPSBvO1xuICAgIGRlYnVnbG9nViA9IG87XG4gICAgcGVyZmxvZyA9IG87XG59XG5leHBvcnRzLm1vY2tEZWJ1ZyA9IG1vY2tEZWJ1ZztcbnZhciBfID0gcmVxdWlyZShcImxvZGFzaFwiKTtcbnZhciBNYXRjaCA9IHJlcXVpcmUoXCIuL21hdGNoXCIpO1xudmFyIFNlbnRlbmNlID0gcmVxdWlyZShcIi4vc2VudGVuY2VcIik7XG52YXIgV29yZCA9IHJlcXVpcmUoXCIuL3dvcmRcIik7XG52YXIgQWxnb2wgPSByZXF1aXJlKFwiLi9hbGdvbFwiKTtcbmZ1bmN0aW9uIGNtcEJ5UmVzdWx0VGhlblJhbmtpbmcoYSwgYikge1xuICAgIHZhciBjbXAgPSBhLnJlc3VsdC5sb2NhbGVDb21wYXJlKGIucmVzdWx0KTtcbiAgICBpZiAoY21wKSB7XG4gICAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuICAgIHJldHVybiAtKGEuX3JhbmtpbmcgLSBiLl9yYW5raW5nKTtcbn1cbmV4cG9ydHMuY21wQnlSZXN1bHRUaGVuUmFua2luZyA9IGNtcEJ5UmVzdWx0VGhlblJhbmtpbmc7XG5mdW5jdGlvbiBsb2NhbGVDb21wYXJlQXJycyhhYXJlc3VsdCwgYmJyZXN1bHQpIHtcbiAgICB2YXIgY21wID0gMDtcbiAgICB2YXIgYmxlbiA9IGJicmVzdWx0Lmxlbmd0aDtcbiAgICBhYXJlc3VsdC5ldmVyeShmdW5jdGlvbiAoYSwgaW5kZXgpIHtcbiAgICAgICAgaWYgKGJsZW4gPD0gaW5kZXgpIHtcbiAgICAgICAgICAgIGNtcCA9IC0xO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGNtcCA9IGEubG9jYWxlQ29tcGFyZShiYnJlc3VsdFtpbmRleF0pO1xuICAgICAgICBpZiAoY21wKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgICByZXR1cm4gY21wO1xuICAgIH1cbiAgICBpZiAoYmxlbiA+IGFhcmVzdWx0Lmxlbmd0aCkge1xuICAgICAgICBjbXAgPSArMTtcbiAgICB9XG4gICAgcmV0dXJuIDA7XG59XG5mdW5jdGlvbiBzYWZlRXF1YWwoYSwgYikge1xuICAgIHZhciBkZWx0YSA9IGEgLSBiO1xuICAgIGlmIChNYXRoLmFicyhkZWx0YSkgPCBBbGdvbC5SQU5LSU5HX0VQU0lMT04pIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cbmV4cG9ydHMuc2FmZUVxdWFsID0gc2FmZUVxdWFsO1xuZnVuY3Rpb24gc2FmZURlbHRhKGEsIGIpIHtcbiAgICB2YXIgZGVsdGEgPSBhIC0gYjtcbiAgICBpZiAoTWF0aC5hYnMoZGVsdGEpIDwgQWxnb2wuUkFOS0lOR19FUFNJTE9OKSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICByZXR1cm4gZGVsdGE7XG59XG5leHBvcnRzLnNhZmVEZWx0YSA9IHNhZmVEZWx0YTtcbmZ1bmN0aW9uIGNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbChhYSwgYmIpIHtcbiAgICB2YXIgY21wID0gbG9jYWxlQ29tcGFyZUFycnMoYWEucmVzdWx0LCBiYi5yZXN1bHQpO1xuICAgIGlmIChjbXApIHtcbiAgICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG4gICAgcmV0dXJuIC1zYWZlRGVsdGEoYWEuX3JhbmtpbmcsIGJiLl9yYW5raW5nKTtcbn1cbmV4cG9ydHMuY21wQnlSZXN1bHRUaGVuUmFua2luZ1R1cGVsID0gY21wQnlSZXN1bHRUaGVuUmFua2luZ1R1cGVsO1xuZnVuY3Rpb24gY21wQnlSYW5raW5nKGEsIGIpIHtcbiAgICB2YXIgY21wID0gLXNhZmVEZWx0YShhLl9yYW5raW5nLCBiLl9yYW5raW5nKTtcbiAgICBpZiAoY21wKSB7XG4gICAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuICAgIGNtcCA9IGEucmVzdWx0LmxvY2FsZUNvbXBhcmUoYi5yZXN1bHQpO1xuICAgIGlmIChjbXApIHtcbiAgICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG4gICAgLy8gYXJlIHJlY29yZHMgZGlmZmVyZW50P1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYS5yZWNvcmQpLmNvbmNhdChPYmplY3Qua2V5cyhiLnJlY29yZCkpLnNvcnQoKTtcbiAgICB2YXIgcmVzID0ga2V5cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHNLZXkpIHtcbiAgICAgICAgaWYgKHByZXYpIHtcbiAgICAgICAgICAgIHJldHVybiBwcmV2O1xuICAgICAgICB9XG4gICAgICAgIGlmIChiLnJlY29yZFtzS2V5XSAhPT0gYS5yZWNvcmRbc0tleV0pIHtcbiAgICAgICAgICAgIGlmICghYi5yZWNvcmRbc0tleV0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWEucmVjb3JkW3NLZXldKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICsxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGEucmVjb3JkW3NLZXldLmxvY2FsZUNvbXBhcmUoYi5yZWNvcmRbc0tleV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH0sIDApO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmNtcEJ5UmFua2luZyA9IGNtcEJ5UmFua2luZztcbmZ1bmN0aW9uIGNtcEJ5UmFua2luZ1R1cGVsKGEsIGIpIHtcbiAgICB2YXIgY21wID0gLXNhZmVEZWx0YShhLl9yYW5raW5nLCBiLl9yYW5raW5nKTtcbiAgICBpZiAoY21wKSB7XG4gICAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuICAgIGNtcCA9IGxvY2FsZUNvbXBhcmVBcnJzKGEucmVzdWx0LCBiLnJlc3VsdCk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgICByZXR1cm4gY21wO1xuICAgIH1cbiAgICAvLyBhcmUgcmVjb3JkcyBkaWZmZXJlbnQ/XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhLnJlY29yZCkuY29uY2F0KE9iamVjdC5rZXlzKGIucmVjb3JkKSkuc29ydCgpO1xuICAgIHZhciByZXMgPSBrZXlzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgc0tleSkge1xuICAgICAgICBpZiAocHJldikge1xuICAgICAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGIucmVjb3JkW3NLZXldICE9PSBhLnJlY29yZFtzS2V5XSkge1xuICAgICAgICAgICAgaWYgKCFiLnJlY29yZFtzS2V5XSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghYS5yZWNvcmRbc0tleV0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKzE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYS5yZWNvcmRbc0tleV0ubG9jYWxlQ29tcGFyZShiLnJlY29yZFtzS2V5XSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfSwgMCk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuY21wQnlSYW5raW5nVHVwZWwgPSBjbXBCeVJhbmtpbmdUdXBlbDtcbmZ1bmN0aW9uIGR1bXBOaWNlKGFuc3dlcikge1xuICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgIHM6IFwiXCIsXG4gICAgICAgIHB1c2g6IGZ1bmN0aW9uIChzKSB7IHRoaXMucyA9IHRoaXMucyArIHM7IH1cbiAgICB9O1xuICAgIHZhciBzID0gXCIqKlJlc3VsdCBmb3IgY2F0ZWdvcnk6IFwiICsgYW5zd2VyLmNhdGVnb3J5ICsgXCIgaXMgXCIgKyBhbnN3ZXIucmVzdWx0ICsgXCJcXG4gcmFuazogXCIgKyBhbnN3ZXIuX3JhbmtpbmcgKyBcIlxcblwiO1xuICAgIHJlc3VsdC5wdXNoKHMpO1xuICAgIE9iamVjdC5rZXlzKGFuc3dlci5yZWNvcmQpLmZvckVhY2goZnVuY3Rpb24gKHNSZXF1aXJlcywgaW5kZXgpIHtcbiAgICAgICAgaWYgKHNSZXF1aXJlcy5jaGFyQXQoMCkgIT09ICdfJykge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2goXCJyZWNvcmQ6IFwiICsgc1JlcXVpcmVzICsgXCIgLT4gXCIgKyBhbnN3ZXIucmVjb3JkW3NSZXF1aXJlc10pO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdC5wdXNoKCdcXG4nKTtcbiAgICB9KTtcbiAgICB2YXIgb1NlbnRlbmNlID0gYW5zd2VyLnNlbnRlbmNlO1xuICAgIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaW5kZXgpIHtcbiAgICAgICAgdmFyIHNXb3JkID0gXCJbXCIgKyBpbmRleCArIFwiXSA6IFwiICsgb1dvcmQuY2F0ZWdvcnkgKyBcIiBcXFwiXCIgKyBvV29yZC5zdHJpbmcgKyBcIlxcXCIgPT4gXFxcIlwiICsgb1dvcmQubWF0Y2hlZFN0cmluZyArIFwiXFxcIlwiO1xuICAgICAgICByZXN1bHQucHVzaChzV29yZCArIFwiXFxuXCIpO1xuICAgIH0pO1xuICAgIHJlc3VsdC5wdXNoKFwiLlxcblwiKTtcbiAgICByZXR1cm4gcmVzdWx0LnM7XG59XG5leHBvcnRzLmR1bXBOaWNlID0gZHVtcE5pY2U7XG5mdW5jdGlvbiBkdW1wTmljZVR1cGVsKGFuc3dlcikge1xuICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgIHM6IFwiXCIsXG4gICAgICAgIHB1c2g6IGZ1bmN0aW9uIChzKSB7IHRoaXMucyA9IHRoaXMucyArIHM7IH1cbiAgICB9O1xuICAgIHZhciBzID0gXCIqKlJlc3VsdCBmb3IgY2F0ZWdvcmllczogXCIgKyBhbnN3ZXIuY2F0ZWdvcmllcy5qb2luKFwiO1wiKSArIFwiIGlzIFwiICsgYW5zd2VyLnJlc3VsdCArIFwiXFxuIHJhbms6IFwiICsgYW5zd2VyLl9yYW5raW5nICsgXCJcXG5cIjtcbiAgICByZXN1bHQucHVzaChzKTtcbiAgICBPYmplY3Qua2V5cyhhbnN3ZXIucmVjb3JkKS5mb3JFYWNoKGZ1bmN0aW9uIChzUmVxdWlyZXMsIGluZGV4KSB7XG4gICAgICAgIGlmIChzUmVxdWlyZXMuY2hhckF0KDApICE9PSAnXycpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwicmVjb3JkOiBcIiArIHNSZXF1aXJlcyArIFwiIC0+IFwiICsgYW5zd2VyLnJlY29yZFtzUmVxdWlyZXNdKTtcbiAgICAgICAgfVxuICAgICAgICByZXN1bHQucHVzaCgnXFxuJyk7XG4gICAgfSk7XG4gICAgdmFyIG9TZW50ZW5jZSA9IGFuc3dlci5zZW50ZW5jZTtcbiAgICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGluZGV4KSB7XG4gICAgICAgIHZhciBzV29yZCA9IFwiW1wiICsgaW5kZXggKyBcIl0gOiBcIiArIG9Xb3JkLmNhdGVnb3J5ICsgXCIgXFxcIlwiICsgb1dvcmQuc3RyaW5nICsgXCJcXFwiID0+IFxcXCJcIiArIG9Xb3JkLm1hdGNoZWRTdHJpbmcgKyBcIlxcXCJcIjtcbiAgICAgICAgcmVzdWx0LnB1c2goc1dvcmQgKyBcIlxcblwiKTtcbiAgICB9KTtcbiAgICByZXN1bHQucHVzaChcIi5cXG5cIik7XG4gICAgcmV0dXJuIHJlc3VsdC5zO1xufVxuZXhwb3J0cy5kdW1wTmljZVR1cGVsID0gZHVtcE5pY2VUdXBlbDtcbmZ1bmN0aW9uIGR1bXBXZWlnaHRzVG9wKHRvb2xtYXRjaGVzLCBvcHRpb25zKSB7XG4gICAgdmFyIHMgPSAnJztcbiAgICB0b29sbWF0Y2hlcy5mb3JFYWNoKGZ1bmN0aW9uIChvTWF0Y2gsIGluZGV4KSB7XG4gICAgICAgIGlmIChpbmRleCA8IG9wdGlvbnMudG9wKSB7XG4gICAgICAgICAgICBzID0gcyArIFwiV2hhdElzQW5zd2VyW1wiICsgaW5kZXggKyBcIl0uLi5cXG5cIjtcbiAgICAgICAgICAgIHMgPSBzICsgZHVtcE5pY2Uob01hdGNoKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBzO1xufVxuZXhwb3J0cy5kdW1wV2VpZ2h0c1RvcCA9IGR1bXBXZWlnaHRzVG9wO1xuZnVuY3Rpb24gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0KHJlcykge1xuICAgIHZhciByZXN1bHQgPSByZXMuYW5zd2Vycy5maWx0ZXIoZnVuY3Rpb24gKGlSZXMsIGluZGV4KSB7XG4gICAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZygncmV0YWluIHRvcFJhbmtlZDogJyArIGluZGV4ICsgJyAnICsgSlNPTi5zdHJpbmdpZnkoaVJlcykpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpUmVzLnJlc3VsdCA9PT0gKHJlcy5hbnN3ZXJzW2luZGV4IC0gMV0gJiYgcmVzLmFuc3dlcnNbaW5kZXggLSAxXS5yZXN1bHQpKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZygnc2tpcCcpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIHJlc3VsdC5zb3J0KGNtcEJ5UmFua2luZyk7XG4gICAgdmFyIGEgPSBPYmplY3QuYXNzaWduKHsgYW5zd2VyczogcmVzdWx0IH0sIHJlcywgeyBhbnN3ZXJzOiByZXN1bHQgfSk7XG4gICAgYS5hbnN3ZXJzID0gcmVzdWx0O1xuICAgIHJldHVybiBhO1xufVxuZXhwb3J0cy5maWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHQgPSBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHQ7XG5mdW5jdGlvbiBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHRUdXBlbChyZXMpIHtcbiAgICB2YXIgcmVzdWx0ID0gcmVzLnR1cGVsYW5zd2Vycy5maWx0ZXIoZnVuY3Rpb24gKGlSZXMsIGluZGV4KSB7XG4gICAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZygnIHJldGFpbiB0dXBlbCAnICsgaW5kZXggKyAnICcgKyBKU09OLnN0cmluZ2lmeShpUmVzKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKF8uaXNFcXVhbChpUmVzLnJlc3VsdCwgcmVzLnR1cGVsYW5zd2Vyc1tpbmRleCAtIDFdICYmIHJlcy50dXBlbGFuc3dlcnNbaW5kZXggLSAxXS5yZXN1bHQpKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZygnc2tpcCcpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIHJlc3VsdC5zb3J0KGNtcEJ5UmFua2luZ1R1cGVsKTtcbiAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihyZXMsIHsgdHVwZWxhbnN3ZXJzOiByZXN1bHQgfSk7XG59XG5leHBvcnRzLmZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdFR1cGVsID0gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0VHVwZWw7XG4vKipcbiAqIEEgcmFua2luZyB3aGljaCBpcyBwdXJlbHkgYmFzZWQgb24gdGhlIG51bWJlcnMgb2YgbWF0Y2hlZCBlbnRpdGllcyxcbiAqIGRpc3JlZ2FyZGluZyBleGFjdG5lc3Mgb2YgbWF0Y2hcbiAqL1xuLypcbmV4cG9ydCBmdW5jdGlvbiBjYWxjUmFua2luZ1NpbXBsZShtYXRjaGVkOiBudW1iZXIsXG4gIG1pc21hdGNoZWQ6IG51bWJlciwgbm91c2U6IG51bWJlcixcbiAgcmVsZXZhbnRDb3VudDogbnVtYmVyKTogbnVtYmVyIHtcbiAgLy8gMiA6IDBcbiAgLy8gMSA6IDBcbiAgdmFyIGZhY3RvciA9IG1hdGNoZWQgKiBNYXRoLnBvdygxLjUsIG1hdGNoZWQpICogTWF0aC5wb3coMS41LCBtYXRjaGVkKTtcbiAgdmFyIGZhY3RvcjIgPSBNYXRoLnBvdygwLjQsIG1pc21hdGNoZWQpO1xuICB2YXIgZmFjdG9yMyA9IE1hdGgucG93KDAuNCwgbm91c2UpO1xuICByZXR1cm4gTWF0aC5wb3coZmFjdG9yMiAqIGZhY3RvciAqIGZhY3RvcjMsIDEgLyAobWlzbWF0Y2hlZCArIG1hdGNoZWQgKyBub3VzZSkpO1xufVxuKi9cbmZ1bmN0aW9uIGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIHJlbGV2YW50Q291bnQsIGhhc0RvbWFpbikge1xuICAgIHZhciBsZW5NYXRjaGVkID0gT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoO1xuICAgIHZhciBmYWN0b3IgPSBNYXRjaC5jYWxjUmFua2luZ1Byb2R1Y3QobWF0Y2hlZCk7XG4gICAgZmFjdG9yICo9IE1hdGgucG93KDEuNSwgbGVuTWF0Y2hlZCk7XG4gICAgaWYgKGhhc0RvbWFpbikge1xuICAgICAgICBmYWN0b3IgKj0gMS41O1xuICAgIH1cbiAgICB2YXIgbGVuSGFzQ2F0ZWdvcnkgPSBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoO1xuICAgIHZhciBmYWN0b3JIID0gTWF0aC5wb3coMS4xLCBsZW5IYXNDYXRlZ29yeSk7XG4gICAgdmFyIGxlbk1pc01hdGNoZWQgPSBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGg7XG4gICAgdmFyIGZhY3RvcjIgPSBNYXRjaC5jYWxjUmFua2luZ1Byb2R1Y3QobWlzbWF0Y2hlZCk7XG4gICAgZmFjdG9yMiAqPSBNYXRoLnBvdygwLjQsIGxlbk1pc01hdGNoZWQpO1xuICAgIHZhciBkaXZpc29yID0gKGxlbk1pc01hdGNoZWQgKyBsZW5IYXNDYXRlZ29yeSArIGxlbk1hdGNoZWQpO1xuICAgIGRpdmlzb3IgPSBkaXZpc29yID8gZGl2aXNvciA6IDE7XG4gICAgcmV0dXJuIE1hdGgucG93KGZhY3RvcjIgKiBmYWN0b3JIICogZmFjdG9yLCAxIC8gKGRpdmlzb3IpKTtcbn1cbmV4cG9ydHMuY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeSA9IGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnk7XG4vKipcbiAqIGxpc3QgYWxsIHRvcCBsZXZlbCByYW5raW5nc1xuICovXG4vKlxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVjb3Jkc0hhdmluZ0NvbnRleHQoXG4gIHBTZW50ZW5jZXM6IElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzLCBjYXRlZ29yeTogc3RyaW5nLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sXG4gIGNhdGVnb3J5U2V0OiB7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfSlcbiAgOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnMge1xuXG4gIC8vZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gIHZhciByZWxldmFudFJlY29yZHMgPSByZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAocmVjb3JkOiBJTWF0Y2guSVJlY29yZCkge1xuICAgIHJldHVybiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSAmJiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gbnVsbCk7XG4gIH0pO1xuICB2YXIgcmVzID0gW107XG4gIGRlYnVnbG9nKFwiTWF0Y2hSZWNvcmRzSGF2aW5nQ29udGV4dCA6IHJlbGV2YW50IHJlY29yZHMgbnI6XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoKTtcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcInNlbnRlbmNlcyBhcmUgOiBcIiArIEpTT04uc3RyaW5naWZ5KHBTZW50ZW5jZXMsIHVuZGVmaW5lZCwgMikpIDogXCItXCIpO1xuICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiY2F0ZWdvcnkgXCIgKyBjYXRlZ29yeSArIFwiIGFuZCBjYXRlZ29yeXNldCBpczogXCIgKyBKU09OLnN0cmluZ2lmeShjYXRlZ29yeVNldCwgdW5kZWZpbmVkLCAyKSkgOiBcIi1cIik7XG4gIGlmIChwcm9jZXNzLmVudi5BQk9UX0ZBU1QgJiYgY2F0ZWdvcnlTZXQpIHtcbiAgICAvLyB3ZSBhcmUgb25seSBpbnRlcmVzdGVkIGluIGNhdGVnb3JpZXMgcHJlc2VudCBpbiByZWNvcmRzIGZvciBkb21haW5zIHdoaWNoIGNvbnRhaW4gdGhlIGNhdGVnb3J5XG4gICAgLy8gdmFyIGNhdGVnb3J5c2V0ID0gTW9kZWwuY2FsY3VsYXRlUmVsZXZhbnRSZWNvcmRDYXRlZ29yaWVzKHRoZU1vZGVsLGNhdGVnb3J5KTtcbiAgICAvL2tub3dpbmcgdGhlIHRhcmdldFxuICAgIHBlcmZsb2coXCJnb3QgY2F0ZWdvcnlzZXQgd2l0aCBcIiArIE9iamVjdC5rZXlzKGNhdGVnb3J5U2V0KS5sZW5ndGgpO1xuICAgIHZhciBmbCA9IDA7XG4gICAgdmFyIGxmID0gMDtcbiAgICB2YXIgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBwU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgdmFyIGZXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICAgIH0pO1xuICAgICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiAhIWNhdGVnb3J5U2V0W29Xb3JkLmNhdGVnb3J5XSB8fCBXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCk7XG4gICAgICB9KTtcbiAgICAgIGZsID0gZmwgKyBvU2VudGVuY2UubGVuZ3RoO1xuICAgICAgbGYgPSBsZiArIHJXb3Jkcy5sZW5ndGg7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCwgLy8gbm90IGEgZmlsbGVyICAvLyB0byBiZSBjb21wYXRpYmxlIGl0IHdvdWxkIGJlIGZXb3Jkc1xuICAgICAgICByV29yZHM6IHJXb3Jkc1xuICAgICAgfTtcbiAgICB9KTtcbiAgICBPYmplY3QuZnJlZXplKGFTaW1wbGlmaWVkU2VudGVuY2VzKTtcbiAgICBkZWJ1Z2xvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgZmwgKyBcIi0+XCIgKyBsZiArIFwiKVwiKTtcbiAgICBwZXJmbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyBmbCArIFwiLT5cIiArIGxmICsgXCIpXCIpO1xuICAgIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgICB2YXIgaGFzQ2F0ZWdvcnkgPSB7fTtcbiAgICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSBhU2VudGVuY2UuY250UmVsZXZhbnRXb3JkcztcbiAgICAgICAgYVNlbnRlbmNlLnJXb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCkgJiYgcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICBoYXNDYXRlZ29yeVtvV29yZC5tYXRjaGVkU3RyaW5nXSA9IDE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICAgIGlmICgoT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoICsgT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aCkgPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLm9TZW50ZW5jZSxcbiAgICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxuICAgICAgICAgICAgcmVzdWx0OiByZWNvcmRbY2F0ZWdvcnldLFxuICAgICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSk7XG4gICAgZGVidWdsb2coXCJoZXJlIGluIHdlaXJkXCIpO1xuICB9IGVsc2Uge1xuICAgIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgIHBTZW50ZW5jZXMuc2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgICB2YXIgaGFzQ2F0ZWdvcnkgPSB7fTtcbiAgICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSAwO1xuICAgICAgICBhU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICBpZiAoIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCkpIHtcbiAgICAgICAgICAgIGNudFJlbGV2YW50V29yZHMgPSBjbnRSZWxldmFudFdvcmRzICsgMTtcbiAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICAgIG1hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpICYmIHJlY29yZFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgICBoYXNDYXRlZ29yeVtvV29yZC5tYXRjaGVkU3RyaW5nXSA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKChPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoKSA+IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aCkge1xuICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2UsXG4gICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICAgIHJlc3VsdDogcmVjb3JkW2NhdGVnb3J5XSxcbiAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0pO1xuICB9XG4gIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmcpO1xuICBkZWJ1Z2xvZyhcIiBhZnRlciBzb3J0XCIgKyByZXMubGVuZ3RoKTtcbiAgdmFyIHJlc3VsdCA9IE9iamVjdC5hc3NpZ24oe30sIHBTZW50ZW5jZXMsIHsgYW5zd2VyczogcmVzIH0pO1xuICByZXR1cm4gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0KHJlc3VsdCk7XG59XG4qL1xuLyoqXG4gKiBsaXN0IGFsbCB0b3AgbGV2ZWwgcmFua2luZ3NcbiAqL1xuZnVuY3Rpb24gbWF0Y2hSZWNvcmRzVHVwZWxIYXZpbmdDb250ZXh0KHBTZW50ZW5jZXMsIGNhdGVnb3JpZXMsIHJlY29yZHMsIGNhdGVnb3J5U2V0KSB7XG4gICAgcmV0dXJuIG1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzKHBTZW50ZW5jZXMsIGNhdGVnb3JpZXMsIHJlY29yZHMsIGNhdGVnb3J5U2V0KTtcbn1cbmV4cG9ydHMubWF0Y2hSZWNvcmRzVHVwZWxIYXZpbmdDb250ZXh0ID0gbWF0Y2hSZWNvcmRzVHVwZWxIYXZpbmdDb250ZXh0O1xuLypcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFJlY29yZHMoYVNlbnRlbmNlczogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMsIGNhdGVnb3J5OiBzdHJpbmcsIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPilcbiAgOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnMge1xuICAvLyBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAvLyAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZHMsIHVuZGVmaW5lZCwgMikpO1xuICAvLyB9XG4gIHZhciByZWxldmFudFJlY29yZHMgPSByZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAocmVjb3JkOiBJTWF0Y2guSVJlY29yZCkge1xuICAgIHJldHVybiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSAmJiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gbnVsbCk7XG4gIH0pO1xuICB2YXIgcmVzID0gW107XG4gIGRlYnVnbG9nKFwicmVsZXZhbnQgcmVjb3JkcyBucjpcIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGgpO1xuICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgYVNlbnRlbmNlcy5zZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAoYVNlbnRlbmNlKSB7XG4gICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICB2YXIgbWlzbWF0Y2hlZCA9IHt9XG4gICAgICB2YXIgbWF0Y2hlZCA9IHt9O1xuICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSAwO1xuICAgICAgYVNlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIGlmICghV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKSkge1xuICAgICAgICAgIGNudFJlbGV2YW50V29yZHMgPSBjbnRSZWxldmFudFdvcmRzICsgMTtcbiAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgIG1hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBpZiAoT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoID4gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoKSB7XG4gICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLFxuICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICByZXN1bHQ6IHJlY29yZFtjYXRlZ29yeV0sXG4gICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nKG1hdGNoZWQsIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pXG4gIH0pO1xuICByZXMuc29ydChjbXBCeVJlc3VsdFRoZW5SYW5raW5nKTtcbiAgdmFyIHJlc3VsdCA9IE9iamVjdC5hc3NpZ24oe30sIGFTZW50ZW5jZXMsIHsgYW5zd2VyczogcmVzIH0pO1xuICByZXR1cm4gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0KHJlc3VsdCk7XG59XG4qL1xuLypcbmZ1bmN0aW9uIG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzQ2F0ZWdvcnlTZXQoYVNlbnRlbmNlczogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMsXG4gIGNhdGVnb3J5U2V0OiB7IFtrZXk6IHN0cmluZ106IGJvb2xlYW4gfSwgdHJhY2s6IHsgZmw6IG51bWJlciwgbGY6IG51bWJlciB9XG4pOiB7XG4gIGRvbWFpbnM6IHN0cmluZ1tdLFxuICBvU2VudGVuY2U6IElNYXRjaC5JU2VudGVuY2UsXG4gIGNudFJlbGV2YW50V29yZHM6IG51bWJlcixcbiAgcldvcmRzOiBJTWF0Y2guSVdvcmRbXVxufVtdIHtcbiAgcmV0dXJuIGFTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgdmFyIGFEb21haW5zID0gW10gYXMgc3RyaW5nW107XG4gICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwiZG9tYWluXCIpIHtcbiAgICAgICAgYURvbWFpbnMucHVzaChvV29yZC5tYXRjaGVkU3RyaW5nKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcIm1ldGFcIikge1xuICAgICAgICAvLyBlLmcuIGRvbWFpbiBYWFhcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuICEhY2F0ZWdvcnlTZXRbb1dvcmQuY2F0ZWdvcnldO1xuICAgIH0pO1xuICAgIHRyYWNrLmZsICs9IG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgdHJhY2subGYgKz0gcldvcmRzLmxlbmd0aDtcbiAgICByZXR1cm4ge1xuICAgICAgZG9tYWluczogYURvbWFpbnMsXG4gICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsXG4gICAgICByV29yZHM6IHJXb3Jkc1xuICAgIH07XG4gIH0pO1xufVxuKi9cbmZ1bmN0aW9uIG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzQ2F0ZWdvcnlTZXQyKGFTZW50ZW5jZXMsIGNhdGVnb3J5U2V0LCB0cmFjaykge1xuICAgIHJldHVybiBhU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICB2YXIgYURvbWFpbnMgPSBbXTtcbiAgICAgICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwiZG9tYWluXCIpIHtcbiAgICAgICAgICAgICAgICBhRG9tYWlucy5wdXNoKG9Xb3JkLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJtZXRhXCIpIHtcbiAgICAgICAgICAgICAgICAvLyBlLmcuIGRvbWFpbiBYWFhcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwiY2F0ZWdvcnlcIikge1xuICAgICAgICAgICAgICAgIGlmIChjYXRlZ29yeVNldFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gISFjYXRlZ29yeVNldFtvV29yZC5jYXRlZ29yeV07XG4gICAgICAgIH0pO1xuICAgICAgICB0cmFjay5mbCArPSBvU2VudGVuY2UubGVuZ3RoO1xuICAgICAgICB0cmFjay5sZiArPSByV29yZHMubGVuZ3RoO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZG9tYWluczogYURvbWFpbnMsXG4gICAgICAgICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsXG4gICAgICAgICAgICByV29yZHM6IHJXb3Jkc1xuICAgICAgICB9O1xuICAgIH0pO1xufVxuZnVuY3Rpb24gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXMoYVNlbnRlbmNlcywgdHJhY2spIHtcbiAgICByZXR1cm4gYVNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgdmFyIGRvbWFpbnMgPSBbXTtcbiAgICAgICAgdmFyIHJXb3JkcyA9IG9TZW50ZW5jZS5maWx0ZXIoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwiZG9tYWluXCIpIHtcbiAgICAgICAgICAgICAgICBkb21haW5zLnB1c2gob1dvcmQubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcIm1ldGFcIikge1xuICAgICAgICAgICAgICAgIC8vIGUuZy4gZG9tYWluIFhYWFxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRyYWNrLmZsICs9IG9TZW50ZW5jZS5sZW5ndGg7XG4gICAgICAgIHRyYWNrLmxmICs9IHJXb3Jkcy5sZW5ndGg7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgICAgIGRvbWFpbnM6IGRvbWFpbnMsXG4gICAgICAgICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLFxuICAgICAgICAgICAgcldvcmRzOiByV29yZHNcbiAgICAgICAgfTtcbiAgICB9KTtcbn1cbmZ1bmN0aW9uIGV4dHJhY3RSZXN1bHQoY2F0ZWdvcmllcywgcmVjb3JkKSB7XG4gICAgcmV0dXJuIGNhdGVnb3JpZXMubWFwKGZ1bmN0aW9uIChjYXRlZ29yeSkgeyByZXR1cm4gcmVjb3JkW2NhdGVnb3J5XSB8fCBcIm4vYVwiOyB9KTtcbn1cbmZ1bmN0aW9uIG1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzKHBTZW50ZW5jZXMsIGNhdGVnb3JpZXMsIHJlY29yZHMsIGRvbWFpbkNhdGVnb3J5RmlsdGVyKSB7XG4gICAgLy8gaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAvLyAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgLy8gfVxuICAgIGlmIChkb21haW5DYXRlZ29yeUZpbHRlciAmJiAhZG9tYWluQ2F0ZWdvcnlGaWx0ZXIuZG9tYWlucykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJvbGQgY2F0ZWdvcnlzU0V0ID8/XCIpO1xuICAgIH1cbiAgICBPYmplY3QuZnJlZXplKGRvbWFpbkNhdGVnb3J5RmlsdGVyKTtcbiAgICB2YXIgY2F0ZWdvcnlGID0gY2F0ZWdvcmllc1swXTtcbiAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwibWF0Y2hSZWNvcmRzUXVpY2tNdWx0aXBsZUNhdGVnb3JpZXMgKHI9XCIgKyAocmVjb3JkcyAmJiByZWNvcmRzLmxlbmd0aClcbiAgICAgICAgKyBcIiBzPVwiICsgKHBTZW50ZW5jZXMgJiYgcFNlbnRlbmNlcy5zZW50ZW5jZXMgJiYgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoKSArIFwiKVxcbiBjYXRlZ29yaWVzOlwiICsgKGNhdGVnb3JpZXMgJiYgY2F0ZWdvcmllcy5qb2luKFwiXFxuXCIpKSArIFwiIGNhdGVnb3J5U2V0OiBcIlxuICAgICAgICArIChkb21haW5DYXRlZ29yeUZpbHRlciAmJiAodHlwZW9mIGRvbWFpbkNhdGVnb3J5RmlsdGVyLmNhdGVnb3J5U2V0ID09PSBcIm9iamVjdFwiKSAmJiBPYmplY3Qua2V5cyhkb21haW5DYXRlZ29yeUZpbHRlci5jYXRlZ29yeVNldCkuam9pbihcIlxcblwiKSkpIDogXCItXCIpO1xuICAgIHBlcmZsb2coXCJtYXRjaFJlY29yZHNRdWlja011bHQgLi4uKHI9XCIgKyByZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIilcIik7XG4gICAgLy9jb25zb2xlLmxvZygnY2F0ZWdvcmllcyAnICsgIEpTT04uc3RyaW5naWZ5KGNhdGVnb3JpZXMpKTtcbiAgICAvL2NvbnNvbGUubG9nKCdjYXRlZ3JveVNldCcgKyAgSlNPTi5zdHJpbmdpZnkoY2F0ZWdvcnlTZXQpKTtcbiAgICB2YXIgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3JkcztcbiAgICBpZiAoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIgJiYgZG9tYWluQ2F0ZWdvcnlGaWx0ZXIuZG9tYWlucykge1xuICAgICAgICByZWxldmFudFJlY29yZHMgPSByZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgICAgICByZXR1cm4gKGRvbWFpbkNhdGVnb3J5RmlsdGVyLmRvbWFpbnMuaW5kZXhPZihyZWNvcmQuX2RvbWFpbikgPj0gMCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcmVsZXZhbnRSZWNvcmRzID0gcmVsZXZhbnRSZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgICAgICByZXR1cm4gIWNhdGVnb3JpZXMuZXZlcnkoZnVuY3Rpb24gKGNhdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAocmVjb3JkW2NhdF0gPT09IHVuZGVmaW5lZCkgfHwgKHJlY29yZFtjYXRdID09PSBudWxsKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gICAgICB9XG4gICAgICAgICAgICAvLyAgICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnlGXSAhPT0gdW5kZWZpbmVkKSAmJiAocmVjb3JkW2NhdGVnb3J5Rl0gIT09IG51bGwpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIGRlYnVnbG9nKFwicmVsZXZhbnQgcmVjb3JkcyB3aXRoIGZpcnN0IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiKVwiKTtcbiAgICBwZXJmbG9nKFwicmVsZXZhbnQgcmVjb3JkcyB3aXRoIGZpcnN0IG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHNlbnRlbmNlcyBcIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCk7XG4gICAgaWYgKGRvbWFpbkNhdGVnb3J5RmlsdGVyKSB7XG4gICAgICAgIC8vIHdlIGFyZSBvbmx5IGludGVyZXN0ZWQgaW4gY2F0ZWdvcmllcyBwcmVzZW50IGluIHJlY29yZHMgZm9yIGRvbWFpbnMgd2hpY2ggY29udGFpbiB0aGUgY2F0ZWdvcnlcbiAgICAgICAgLy8gdmFyIGNhdGVnb3J5c2V0ID0gTW9kZWwuY2FsY3VsYXRlUmVsZXZhbnRSZWNvcmRDYXRlZ29yaWVzKHRoZU1vZGVsLGNhdGVnb3J5KTtcbiAgICAgICAgLy9rbm93aW5nIHRoZSB0YXJnZXRcbiAgICAgICAgcGVyZmxvZyhcImdvdCBjYXRlZ29yeXNldCB3aXRoIFwiICsgT2JqZWN0LmtleXMoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIuY2F0ZWdvcnlTZXQpLmxlbmd0aCk7XG4gICAgICAgIHZhciBvYmogPSB7IGZsOiAwLCBsZjogMCB9O1xuICAgICAgICB2YXIgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBbXTtcbiAgICAgICAgLy8gIGlmIChwcm9jZXNzLmVudi5BQk9UX0JFVDEpIHtcbiAgICAgICAgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBtYWtlU2ltcGxpZmllZFNlbnRlbmNlc0NhdGVnb3J5U2V0MihwU2VudGVuY2VzLCBkb21haW5DYXRlZ29yeUZpbHRlci5jYXRlZ29yeVNldCwgb2JqKTtcbiAgICAgICAgLy8gIH0gZWxzZSB7XG4gICAgICAgIC8vICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXNDYXRlZ29yeVNldChwU2VudGVuY2VzLCBjYXRlZ29yeVNldCwgb2JqKSBhcyBhbnk7XG4gICAgICAgIC8vICB9XG4gICAgICAgIHBlcmZsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIG9iai5mbCArIFwiLT5cIiArIG9iai5sZiArIFwiKVwiKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGRlYnVnbG9nKFwibm90IGFib3RfZmFzdCAhXCIpO1xuICAgICAgICB2YXIgdHJhY2sgPSB7IGZsOiAwLCBsZjogMCB9O1xuICAgICAgICB2YXIgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBtYWtlU2ltcGxpZmllZFNlbnRlbmNlcyhwU2VudGVuY2VzLCB0cmFjayk7XG4gICAgICAgIC8qXG4gICAgICAgICAgICBwU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICAgICAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICBmbCA9IGZsICsgb1NlbnRlbmNlLmxlbmd0aDtcbiAgICAgICAgICAgICAgbGYgPSBsZiArIHJXb3Jkcy5sZW5ndGg7XG4gICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICAgICAgICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICByV29yZHM6IHJXb3Jkc1xuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAqL1xuICAgICAgICBkZWJ1Z2xvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgdHJhY2suZmwgKyBcIi0+XCIgKyB0cmFjay5sZiArIFwiKVwiKTtcbiAgICAgICAgcGVyZmxvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgdHJhY2suZmwgKyBcIi0+XCIgKyB0cmFjay5sZiArIFwiKVwiKTtcbiAgICB9XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImhlcmUgc2ltcGxpZmllZCBzZW50ZW5jZXMgXCIgK1xuICAgICAgICBhU2ltcGxpZmllZFNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG8pIHsgcmV0dXJuIFwiXFxuRG9tYWluPVwiICsgby5kb21haW5zLmpvaW4oXCJcXG5cIikgKyBcIlxcblwiICsgU2VudGVuY2UuZHVtcE5pY2Uoby5yV29yZHMpOyB9KS5qb2luKFwiXFxuXCIpKSA6IFwiLVwiKTtcbiAgICAvL2NvbnNvbGUubG9nKFwiaGVyZSByZWNyb2RzXCIgKyByZWxldmFudFJlY29yZHMubWFwKCAobyxpbmRleCkgPT4gIFwiIGluZGV4ID0gXCIgKyBpbmRleCArIFwiIFwiICsgSlNPTi5zdHJpbmdpZnkobykpLmpvaW4oXCJcXG5cIikpO1xuICAgIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgYVNpbXBsaWZpZWRTZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAoYVNlbnRlbmNlKSB7XG4gICAgICAgICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICAgICAgICB2YXIgaW1pc21hdGNoZWQgPSAwO1xuICAgICAgICAgICAgdmFyIGltYXRjaGVkID0gMDtcbiAgICAgICAgICAgIHZhciBub3VzZSA9IDA7XG4gICAgICAgICAgICB2YXIgZm91bmRjYXQgPSAxO1xuICAgICAgICAgICAgdmFyIG1pc3NpbmdjYXQgPSAwO1xuICAgICAgICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgICAgICAgIHZhciBtaXNtYXRjaGVkID0ge307XG4gICAgICAgICAgICB2YXIgaGFzQ2F0ZWdvcnkgPSB7fTtcbiAgICAgICAgICAgIGFTZW50ZW5jZS5yV29yZHMuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICAgICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IDA7XG4gICAgICAgICAgICAgICAgaWYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgKytpbWF0Y2hlZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICsraW1pc21hdGNoZWQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAhPT0gXCJjYXRlZ29yeVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub3VzZSArPSAxO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFyZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaXNzaW5nY2F0ICs9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3VuZGNhdCArPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpICYmIHJlY29yZFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgICAgICAgICBoYXNDYXRlZ29yeVtvV29yZC5tYXRjaGVkU3RyaW5nXSA9IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKCFXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVE9ETyBiZXR0ZXIgdW5tYWNodGVkXG4gICAgICAgICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB2YXIgbWF0Y2hlZERvbWFpbiA9IDA7XG4gICAgICAgICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IGFTZW50ZW5jZS5yV29yZHMubGVuZ3RoO1xuICAgICAgICAgICAgaWYgKGFTZW50ZW5jZS5kb21haW5zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGlmIChyZWNvcmQuX2RvbWFpbiAhPT0gYVNlbnRlbmNlLmRvbWFpbnNbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgaW1pc21hdGNoZWQgPSAzMDAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaW1hdGNoZWQgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZERvbWFpbiArPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8qaWYgKHByb2Nlc3MuZW52LkFCT1RfQkVUMikge1xuICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdmFyIG1hdGNoZWRMZW4gPSBPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoO1xuICAgICAgICAgICAgdmFyIG1pc21hdGNoZWRMZW4gPSBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGg7XG4gICAgICAgICAgICAvKiAgICAgICBpZihyZWNvcmQuVHJhbnNhY3Rpb25Db2RlKSB7XG4gICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZygnIGhlcmUgdGNvZGUgOiAnICsgcmVjb3JkLlRyYW5zYWN0aW9uQ29kZSk7XG4gICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICBpZihyZWNvcmQuVHJhbnNhY3Rpb25Db2RlID09PSAnU19BTFJfODcwMTIzOTQnKSB7XG4gICAgICAgICAgICAgICAgZGVidWdsb2coXCJURUhPTkUgYWRkaW5nIFwiICsgZXh0cmFjdFJlc3VsdChjYXRlZ29yaWVzLHJlY29yZCkuam9pbihcIjtcIikpO1xuICAgICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcIndpdGggcmFua2luZyA6IFwiICsgY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeTIobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMsIG1hdGNoZWREb21haW4pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgZGVidWdsb2coXCIgY3JlYXRlZCBieSBcIiArIE9iamVjdC5rZXlzKG1hdGNoZWQpLm1hcChrZXkgPT4gXCJrZXk6XCIgKyBrZXlcbiAgICAgICAgICAgICAgICAgICAgICAgKyBcIlxcblwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZFtrZXldKSkuam9pbihcIlxcblwiKVxuICAgICAgICAgICAgICAgICAgICAgICArIFwiXFxuaGFzQ2F0IFwiICsgSlNPTi5zdHJpbmdpZnkoaGFzQ2F0ZWdvcnkpXG4gICAgICAgICAgICAgICAgICAgICAgICsgXCJcXG5taXNtYXQgXCIgKyBKU09OLnN0cmluZ2lmeShtaXNtYXRjaGVkKVxuICAgICAgICAgICAgICAgICAgICAgICArIFwiXFxuY25UcmVsIFwiICsgSlNPTi5zdHJpbmdpZnkoY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgICAgICAgICAgICAgICAgKyBcIlxcbm1hdGNlZERvbWFpbiBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWREb21haW4pXG4gICAgICAgICAgICAgICAgICAgICAgICsgXCJcXG5oYXNDYXQgXCIgKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSlcbiAgICAgICAgICAgICAgICAgICAgICAgKyBcIlxcbm1pc21hdCBcIiArIE9iamVjdC5rZXlzKG1pc21hdGNoZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICsgYFxcbm1hdGNoZWQgJHtPYmplY3Qua2V5cyhtYXRjaGVkKX0gXFxuaGFzY2F0ICR7T2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmpvaW4oXCI7IFwiKX0gXFxubWlzbTogJHtPYmplY3Qua2V5cyhtaXNtYXRjaGVkKX0gXFxuYFxuICAgICAgICAgICAgICAgICAgICAgICArIFwiXFxubWF0Y2VkRG9tYWluIFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZERvbWFpbilcbiAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAqL1xuICAgICAgICAgICAgaWYgKChpbWlzbWF0Y2hlZCA8IDMwMDApXG4gICAgICAgICAgICAgICAgJiYgKChtYXRjaGVkTGVuID4gbWlzbWF0Y2hlZExlbilcbiAgICAgICAgICAgICAgICAgICAgfHwgKG1hdGNoZWRMZW4gPT09IG1pc21hdGNoZWRMZW4gJiYgbWF0Y2hlZERvbWFpbiA+IDApKSkge1xuICAgICAgICAgICAgICAgIC8qXG4gICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcImFkZGluZyBcIiArIGV4dHJhY3RSZXN1bHQoY2F0ZWdvcmllcyxyZWNvcmQpLmpvaW4oXCI7XCIpKTtcbiAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKFwid2l0aCByYW5raW5nIDogXCIgKyBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5MihtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcywgbWF0Y2hlZERvbWFpbikpO1xuICAgICAgICAgICAgICAgICAgZGVidWdsb2coXCIgY3JlYXRlZCBieSBcIiArIE9iamVjdC5rZXlzKG1hdGNoZWQpLm1hcChrZXkgPT4gXCJrZXk6XCIgKyBrZXlcbiAgICAgICAgICAgICAgICAgICsgXCJcXG5cIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRba2V5XSkpLmpvaW4oXCJcXG5cIilcbiAgICAgICAgICAgICAgICAgICsgXCJcXG5oYXNDYXQgXCIgKyBKU09OLnN0cmluZ2lmeShoYXNDYXRlZ29yeSlcbiAgICAgICAgICAgICAgICAgICsgXCJcXG5taXNtYXQgXCIgKyBKU09OLnN0cmluZ2lmeShtaXNtYXRjaGVkKVxuICAgICAgICAgICAgICAgICAgKyBcIlxcbmNuVHJlbCBcIiArIEpTT04uc3RyaW5naWZ5KGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgICAgICAgICArIFwiXFxubWF0Y2VkRG9tYWluIFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZERvbWFpbilcbiAgICAgICAgICAgICAgICAgICsgXCJcXG5oYXNDYXQgXCIgKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSlcbiAgICAgICAgICAgICAgICAgICsgXCJcXG5taXNtYXQgXCIgKyBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKVxuICAgICAgICAgICAgICAgICAgKyBgXFxubWF0Y2hlZCAke09iamVjdC5rZXlzKG1hdGNoZWQpfSBcXG5oYXNjYXQgJHtPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkuam9pbihcIjsgXCIpfSBcXG5taXNtOiAke09iamVjdC5rZXlzKG1pc21hdGNoZWQpfSBcXG5gXG4gICAgICAgICAgICAgICAgICArIFwiXFxubWF0Y2VkRG9tYWluIFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZERvbWFpbilcbiAgICAgIFxuICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgdmFyIHJlYyA9IHtcbiAgICAgICAgICAgICAgICAgICAgc2VudGVuY2U6IGFTZW50ZW5jZS5vU2VudGVuY2UsXG4gICAgICAgICAgICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yaWVzOiBjYXRlZ29yaWVzLFxuICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IGV4dHJhY3RSZXN1bHQoY2F0ZWdvcmllcywgcmVjb3JkKSxcbiAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMsIG1hdGNoZWREb21haW4pXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiaGVyZSByYW5raW5nXCIgKyByZWMuX3JhbmtpbmcpXG4gICAgICAgICAgICAgICAgaWYgKChyZWMuX3JhbmtpbmcgPT09IG51bGwpIHx8ICFyZWMuX3JhbmtpbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVjLl9yYW5raW5nID0gMC45O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXMucHVzaChyZWMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLyp9IGVsc2Uge1xuICAgICAgICAgICAgLy8gaWYobWF0Y2hlZCA+IDAgfHwgbWlzbWF0Y2hlZCA+IDAgKSB7XG4gICAgICAgICAgICAvLyAgIGNvbnNvbGUubG9nKFwiIG1cIiArIG1hdGNoZWQgKyBcIiBtaXNtYXRjaGVkXCIgKyBtaXNtYXRjaGVkKTtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYVNlbnRlbmNlLm9TZW50ZW5jZSkpO1xuICAgICAgICAgICAgICBpZiAoaW1hdGNoZWQgPiBpbWlzbWF0Y2hlZCkge1xuICAgICAgICAgICAgICAgIHZhciByZWMgPSB7XG4gICAgICAgICAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLm9TZW50ZW5jZSxcbiAgICAgICAgICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgICAgICAgICAgY2F0ZWdvcmllczogY2F0ZWdvcmllcyxcbiAgICAgICAgICAgICAgICAgIHJlc3VsdDogZXh0cmFjdFJlc3VsdChjYXRlZ29yaWVzLCByZWNvcmQpLFxuICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nU2ltcGxlKGltYXRjaGVkLCBpbWlzbWF0Y2hlZCwgKG5vdXNlICsgbWlzc2luZ2NhdCksIGFTZW50ZW5jZS5jbnRSZWxldmFudFdvcmRzKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmVzLnB1c2gocmVjKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAqL1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBwZXJmbG9nKFwic29ydCAoYT1cIiArIHJlcy5sZW5ndGggKyBcIilcIik7XG4gICAgcmVzLnNvcnQoY21wQnlSZXN1bHRUaGVuUmFua2luZ1R1cGVsKTtcbiAgICBwZXJmbG9nKFwiTVJRTUMgZmlsdGVyUmV0YWluIC4uLlwiKTtcbiAgICB2YXIgcmVzdWx0MSA9IE9iamVjdC5hc3NpZ24oeyB0dXBlbGFuc3dlcnM6IHJlcyB9LCBwU2VudGVuY2VzKTtcbiAgICAvKmRlYnVnbG9nKFwiTkVXTUFQXCIgKyByZXMubWFwKG8gPT4gXCJcXG5yYW5rXCIgKyBvLl9yYW5raW5nICsgXCIgPT5cIlxuICAgICAgICAgICAgICAgICsgby5yZXN1bHQuam9pbihcIlxcblwiKSkuam9pbihcIlxcblwiKSk7ICovXG4gICAgdmFyIHJlc3VsdDIgPSBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHRUdXBlbChyZXN1bHQxKTtcbiAgICBwZXJmbG9nKFwiTVJRTUMgbWF0Y2hSZWNvcmRzUXVpY2sgZG9uZTogKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGE9XCIgKyByZXMubGVuZ3RoICsgXCIpXCIpO1xuICAgIHJldHVybiByZXN1bHQyO1xufVxuZXhwb3J0cy5tYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcyA9IG1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzO1xuZnVuY3Rpb24gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KHdvcmQsIHRhcmdldGNhdGVnb3J5LCBydWxlcywgd2hvbGVzZW50ZW5jZSkge1xuICAgIC8vY29uc29sZS5sb2coXCJjbGFzc2lmeSBcIiArIHdvcmQgKyBcIiBcIiAgKyB0YXJnZXRjYXRlZ29yeSk7XG4gICAgdmFyIGNhdHMgPSBJbnB1dEZpbHRlci5jYXRlZ29yaXplQVdvcmQod29yZCwgcnVsZXMsIHdob2xlc2VudGVuY2UsIHt9KTtcbiAgICAvLyBUT0RPIHF1YWxpZnlcbiAgICBjYXRzID0gY2F0cy5maWx0ZXIoZnVuY3Rpb24gKGNhdCkge1xuICAgICAgICByZXR1cm4gY2F0LmNhdGVnb3J5ID09PSB0YXJnZXRjYXRlZ29yeTtcbiAgICB9KTtcbiAgICAvL2RlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGNhdHMpKTtcbiAgICBpZiAoY2F0cy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGNhdHNbMF0ubWF0Y2hlZFN0cmluZztcbiAgICB9XG59XG5mdW5jdGlvbiBhbmFseXplQ2F0ZWdvcnkoY2F0ZWdvcnl3b3JkLCBydWxlcywgd2hvbGVzZW50ZW5jZSkge1xuICAgIHJldHVybiBjbGFzc2lmeVdvcmRXaXRoVGFyZ2V0Q2F0ZWdvcnkoY2F0ZWdvcnl3b3JkLCAnY2F0ZWdvcnknLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG59XG5leHBvcnRzLmFuYWx5emVDYXRlZ29yeSA9IGFuYWx5emVDYXRlZ29yeTtcbmZ1bmN0aW9uIHNwbGl0QXRDb21tYUFuZChzdHIpIHtcbiAgICB2YXIgciA9IHN0ci5zcGxpdCgvKFxcYmFuZFxcYil8WyxdLyk7XG4gICAgciA9IHIuZmlsdGVyKGZ1bmN0aW9uIChvLCBpbmRleCkge1xuICAgICAgICBpZiAoaW5kZXggJSAyID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIHZhciBydHJpbW1lZCA9IHIubWFwKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgIHJldHVybiBuZXcgU3RyaW5nKG8pLnRyaW0oKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcnRyaW1tZWQ7XG59XG5leHBvcnRzLnNwbGl0QXRDb21tYUFuZCA9IHNwbGl0QXRDb21tYUFuZDtcbi8qKlxuICogQSBzaW1wbGUgaW1wbGVtZW50YXRpb24sIHNwbGl0dGluZyBhdCBhbmQgYW5kICxcbiAqL1xuZnVuY3Rpb24gYW5hbHl6ZUNhdGVnb3J5TXVsdE9ubHlBbmRDb21tYShjYXRlZ29yeWxpc3QsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlKSB7XG4gICAgdmFyIHJ0cmltbWVkID0gc3BsaXRBdENvbW1hQW5kKGNhdGVnb3J5bGlzdCk7XG4gICAgdmFyIHJjYXQgPSBydHJpbW1lZC5tYXAoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgcmV0dXJuIGFuYWx5emVDYXRlZ29yeShvLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG4gICAgfSk7XG4gICAgaWYgKHJjYXQuaW5kZXhPZih1bmRlZmluZWQpID49IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdcIicgKyBydHJpbW1lZFtyY2F0LmluZGV4T2YodW5kZWZpbmVkKV0gKyAnXCIgaXMgbm90IGEgY2F0ZWdvcnkhJyk7XG4gICAgfVxuICAgIHJldHVybiByY2F0O1xufVxuZXhwb3J0cy5hbmFseXplQ2F0ZWdvcnlNdWx0T25seUFuZENvbW1hID0gYW5hbHl6ZUNhdGVnb3J5TXVsdE9ubHlBbmRDb21tYTtcbmZ1bmN0aW9uIGZpbHRlckFjY2VwdGluZ09ubHkocmVzLCBjYXRlZ29yaWVzKSB7XG4gICAgcmV0dXJuIHJlcy5maWx0ZXIoZnVuY3Rpb24gKGFTZW50ZW5jZSwgaUluZGV4KSB7XG4gICAgICAgIHJldHVybiBhU2VudGVuY2UuZXZlcnkoZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgICByZXR1cm4gY2F0ZWdvcmllcy5pbmRleE9mKG9Xb3JkLmNhdGVnb3J5KSA+PSAwO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn1cbmV4cG9ydHMuZmlsdGVyQWNjZXB0aW5nT25seSA9IGZpbHRlckFjY2VwdGluZ09ubHk7XG52YXIgRXJiYXNlID0gcmVxdWlyZShcIi4vZXJiYXNlXCIpO1xuZnVuY3Rpb24gcHJvY2Vzc1N0cmluZyhxdWVyeSwgcnVsZXMpIHtcbiAgICAvLyAgaWYgKCFwcm9jZXNzLmVudi5BQk9UX09MRE1BVENIKSB7XG4gICAgcmV0dXJuIEVyYmFzZS5wcm9jZXNzU3RyaW5nKHF1ZXJ5LCBydWxlcywgcnVsZXMud29yZENhY2hlKTtcbiAgICAvLyAgfVxuICAgIC8qXG4gICAgICB2YXIgbWF0Y2hlZCA9IElucHV0RmlsdGVyLmFuYWx5emVTdHJpbmcocXVlcnksIHJ1bGVzLCBzV29yZHMpO1xuICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCJBZnRlciBtYXRjaGVkIFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZCkpO1xuICAgICAgfVxuICAgICAgdmFyIGFTZW50ZW5jZXMgPSBJbnB1dEZpbHRlci5leHBhbmRNYXRjaEFycihtYXRjaGVkKTtcbiAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiYWZ0ZXIgZXhwYW5kXCIgKyBhU2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICAgICAgfVxuICAgICAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gSW5wdXRGaWx0ZXIucmVpbkZvcmNlKGFTZW50ZW5jZXMpO1xuICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCJhZnRlciByZWluZm9yY2VcIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZXJyb3JzOiBbXSxcbiAgICAgICAgc2VudGVuY2VzOiBhU2VudGVuY2VzUmVpbmZvcmNlZFxuICAgICAgfSBhcyBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcztcbiAgICAqL1xufVxuZXhwb3J0cy5wcm9jZXNzU3RyaW5nID0gcHJvY2Vzc1N0cmluZztcbmZ1bmN0aW9uIGFuYWx5emVDb250ZXh0U3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMpIHtcbiAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBwcm9jZXNzU3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMpO1xuICAgIC8vIHdlIGxpbWl0IGFuYWx5c2lzIHRvIG4gc2VudGVuY2VzXG4gICAgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzID0gYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLnNsaWNlKDAsIEFsZ29sLkN1dG9mZl9TZW50ZW5jZXMpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiYWZ0ZXIgcmVpbmZvcmNlIGFuZCBjdXRvZmZcIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5sZW5ndGggKyBcIlxcblwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICAgICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgfVxuICAgIHJldHVybiBhU2VudGVuY2VzUmVpbmZvcmNlZDtcbn1cbmV4cG9ydHMuYW5hbHl6ZUNvbnRleHRTdHJpbmcgPSBhbmFseXplQ29udGV4dFN0cmluZztcbmZ1bmN0aW9uIGNtcEJ5TnJDYXRlZ29yaWVzQW5kU2FtZURvbWFpbihhLCBiKSB7XG4gICAgLy9jb25zb2xlLmxvZyhcImNvbXBhcmUgYVwiICsgYSArIFwiIGNudGIgXCIgKyBiKTtcbiAgICB2YXIgY250YSA9IFNlbnRlbmNlLmdldERpc3RpbmN0Q2F0ZWdvcmllc0luU2VudGVuY2UoYSkubGVuZ3RoO1xuICAgIHZhciBjbnRiID0gU2VudGVuY2UuZ2V0RGlzdGluY3RDYXRlZ29yaWVzSW5TZW50ZW5jZShiKS5sZW5ndGg7XG4gICAgLypcbiAgICAgIHZhciBjbnRhID0gYS5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgb1dvcmQpIHtcbiAgICAgICAgcmV0dXJuIHByZXYgKyAoKG9Xb3JkLmNhdGVnb3J5ID09PSBcImNhdGVnb3J5XCIpPyAxIDogMCk7XG4gICAgICB9LDApO1xuICAgICAgdmFyIGNudGIgPSBiLnJlZHVjZShmdW5jdGlvbihwcmV2LCBvV29yZCkge1xuICAgICAgICByZXR1cm4gcHJldiArICgob1dvcmQuY2F0ZWdvcnkgPT09IFwiY2F0ZWdvcnlcIik/IDEgOiAwKTtcbiAgICAgIH0sMCk7XG4gICAgIC8vIGNvbnNvbGUubG9nKFwiY250IGFcIiArIGNudGEgKyBcIiBjbnRiIFwiICsgY250Yik7XG4gICAgICovXG4gICAgcmV0dXJuIGNudGIgLSBjbnRhO1xufVxuZXhwb3J0cy5jbXBCeU5yQ2F0ZWdvcmllc0FuZFNhbWVEb21haW4gPSBjbXBCeU5yQ2F0ZWdvcmllc0FuZFNhbWVEb21haW47XG5mdW5jdGlvbiBhbmFseXplQ2F0ZWdvcnlNdWx0KGNhdGVnb3J5bGlzdCwgcnVsZXMsIHdob2xlc2VudGVuY2UsIGdXb3Jkcykge1xuICAgIHZhciByZXMgPSBhbmFseXplQ29udGV4dFN0cmluZyhjYXRlZ29yeWxpc3QsIHJ1bGVzKTtcbiAgICAvLyAgZGVidWdsb2coXCJyZXN1bHRpbmcgY2F0ZWdvcnkgc2VudGVuY2VzXCIsIEpTT04uc3RyaW5naWZ5KHJlcykpO1xuICAgIHZhciByZXMyID0gZmlsdGVyQWNjZXB0aW5nT25seShyZXMuc2VudGVuY2VzLCBbXCJjYXRlZ29yeVwiLCBcImZpbGxlclwiXSk7XG4gICAgLy8gIGNvbnNvbGUubG9nKFwiaGVyZSByZXMyXCIgKyBKU09OLnN0cmluZ2lmeShyZXMyKSApO1xuICAgIC8vICBjb25zb2xlLmxvZyhcImhlcmUgdW5kZWZpbmVkICEgKyBcIiArIHJlczIuZmlsdGVyKG8gPT4gIW8pLmxlbmd0aCk7XG4gICAgcmVzMi5zb3J0KFNlbnRlbmNlLmNtcFJhbmtpbmdQcm9kdWN0KTtcbiAgICBkZWJ1Z2xvZyhcInJlc3VsdGluZyBjYXRlZ29yeSBzZW50ZW5jZXM6IFxcblwiLCBkZWJ1Z2xvZy5lbmFibGVkID8gKFNlbnRlbmNlLmR1bXBOaWNlQXJyKHJlczIuc2xpY2UoMCwgMyksIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KSkgOiAnLScpO1xuICAgIC8vIFRPRE86ICAgcmVzMiA9IGZpbHRlckFjY2VwdGluZ09ubHlTYW1lRG9tYWluKHJlczIpO1xuICAgIC8vZGVidWdsb2coXCJyZXN1bHRpbmcgY2F0ZWdvcnkgc2VudGVuY2VzXCIsIEpTT04uc3RyaW5naWZ5KHJlczIsIHVuZGVmaW5lZCwgMikpO1xuICAgIC8vIGV4cGVjdCBvbmx5IGNhdGVnb3JpZXNcbiAgICAvLyB3ZSBjb3VsZCByYW5rIG5vdyBieSBjb21tb24gZG9tYWlucyAsIGJ1dCBmb3Igbm93IHdlIG9ubHkgdGFrZSB0aGUgZmlyc3Qgb25lXG4gICAgaWYgKCFyZXMyLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICAvL3Jlcy5zb3J0KGNtcEJ5TnJDYXRlZ29yaWVzQW5kU2FtZURvbWFpbik7XG4gICAgdmFyIHJlc2NhdCA9IFNlbnRlbmNlLmdldERpc3RpbmN0Q2F0ZWdvcmllc0luU2VudGVuY2UocmVzMlswXSk7XG4gICAgcmV0dXJuIHJlc2NhdDtcbiAgICAvLyBcIlwiIHJldHVybiByZXNbMF0uZmlsdGVyKClcbiAgICAvLyByZXR1cm4gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KGNhdGVnb3J5bGlzdCwgJ2NhdGVnb3J5JywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xufVxuZXhwb3J0cy5hbmFseXplQ2F0ZWdvcnlNdWx0ID0gYW5hbHl6ZUNhdGVnb3J5TXVsdDtcbmZ1bmN0aW9uIGFuYWx5emVPcGVyYXRvcihvcHdvcmQsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlKSB7XG4gICAgcmV0dXJuIGNsYXNzaWZ5V29yZFdpdGhUYXJnZXRDYXRlZ29yeShvcHdvcmQsICdvcGVyYXRvcicsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlKTtcbn1cbmV4cG9ydHMuYW5hbHl6ZU9wZXJhdG9yID0gYW5hbHl6ZU9wZXJhdG9yO1xudmFyIEVyRXJyb3IgPSByZXF1aXJlKFwiLi9lcmVycm9yXCIpO1xudmFyIExpc3RBbGwgPSByZXF1aXJlKFwiLi9saXN0YWxsXCIpO1xuLy8gY29uc3QgcmVzdWx0ID0gV2hhdElzLnJlc29sdmVDYXRlZ29yeShjYXQsIGExLmVudGl0eSxcbi8vICAgdGhlTW9kZWwubVJ1bGVzLCB0aGVNb2RlbC50b29scywgdGhlTW9kZWwucmVjb3Jkcyk7XG5mdW5jdGlvbiByZXNvbHZlQ2F0ZWdvcnkoY2F0ZWdvcnksIGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMsIHJlY29yZHMpIHtcbiAgICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4geyBlcnJvcnM6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSwgdG9rZW5zOiBbXSwgYW5zd2VyczogW10gfTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIC8qXG4gICAgICAgICAgICB2YXIgbWF0Y2hlZCA9IElucHV0RmlsdGVyLmFuYWx5emVTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcyk7XG4gICAgICAgICAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiYWZ0ZXIgbWF0Y2hlZCBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWQpKTogJy0nKTtcbiAgICAgICAgICAgIHZhciBhU2VudGVuY2VzID0gSW5wdXRGaWx0ZXIuZXhwYW5kTWF0Y2hBcnIobWF0Y2hlZCk7XG4gICAgICAgICAgICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgICAgIGRlYnVnbG9nKFwiYWZ0ZXIgZXhwYW5kXCIgKyBhU2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgICAgICAgICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICAgICAgICAgIH0gKi9cbiAgICAgICAgLy8gdmFyIGNhdGVnb3J5U2V0ID0gTW9kZWwuZ2V0QWxsUmVjb3JkQ2F0ZWdvcmllc0ZvclRhcmdldENhdGVnb3J5KHRoZU1vZGVsLCBjYXQsIHRydWUpO1xuICAgICAgICB2YXIgcmVzID0gTGlzdEFsbC5saXN0QWxsV2l0aENvbnRleHQoY2F0ZWdvcnksIGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMsIHJlY29yZHMpO1xuICAgICAgICAvLyogc29ydCBieSBzZW50ZW5jZVxuICAgICAgICByZXMuYW5zd2Vycy5mb3JFYWNoKGZ1bmN0aW9uIChvKSB7IG8uX3JhbmtpbmcgPSBvLl9yYW5raW5nICogU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qoby5zZW50ZW5jZSk7IH0pO1xuICAgICAgICByZXMuYW5zd2Vycy5zb3J0KGNtcEJ5UmFua2luZyk7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxufVxuZXhwb3J0cy5yZXNvbHZlQ2F0ZWdvcnkgPSByZXNvbHZlQ2F0ZWdvcnk7XG5mdW5jdGlvbiByZXNvbHZlQ2F0ZWdvcmllcyhjYXRlZ29yaWVzLCBjb250ZXh0UXVlcnlTdHJpbmcsIHRoZU1vZGVsLCBkb21haW5DYXRlZ29yeUZpbHRlcikge1xuICAgIHZhciByZWNvcmRzID0gdGhlTW9kZWwucmVjb3JkcztcbiAgICB2YXIgcnVsZXMgPSB0aGVNb2RlbC5ydWxlcztcbiAgICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZXJyb3JzOiBbRXJFcnJvci5tYWtlRXJyb3JfRU1QVFlfSU5QVVQoKV0sXG4gICAgICAgICAgICB0dXBlbGFuc3dlcnM6IFtdLFxuICAgICAgICAgICAgdG9rZW5zOiBbXVxuICAgICAgICB9O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgLy8gdmFyIGNhdGVnb3J5U2V0ID0gTW9kZWwuZ2V0QWxsUmVjb3JkQ2F0ZWdvcmllc0ZvclRhcmdldENhdGVnb3J5KHRoZU1vZGVsLCBjYXQsIHRydWUpO1xuICAgICAgICB2YXIgcmVzID0gTGlzdEFsbC5saXN0QWxsVHVwZWxXaXRoQ29udGV4dChjYXRlZ29yaWVzLCBjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzLCByZWNvcmRzLCBkb21haW5DYXRlZ29yeUZpbHRlcik7XG4gICAgICAgIC8vKiBzb3J0IGJ5IHNlbnRlbmNlXG4gICAgICAgIHJlcy50dXBlbGFuc3dlcnMuZm9yRWFjaChmdW5jdGlvbiAobykgeyBvLl9yYW5raW5nID0gby5fcmFua2luZyAqIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG8uc2VudGVuY2UpOyB9KTtcbiAgICAgICAgcmVzLnR1cGVsYW5zd2Vycy5zb3J0KGNtcEJ5UmFua2luZ1R1cGVsKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG59XG5leHBvcnRzLnJlc29sdmVDYXRlZ29yaWVzID0gcmVzb2x2ZUNhdGVnb3JpZXM7XG5mdW5jdGlvbiBmaWx0ZXJPbmx5VG9wUmFua2VkKHJlc3VsdHMpIHtcbiAgICB2YXIgcmVzID0gcmVzdWx0cy5maWx0ZXIoZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICBpZiAoc2FmZUVxdWFsKHJlc3VsdC5fcmFua2luZywgcmVzdWx0c1swXS5fcmFua2luZykpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQuX3JhbmtpbmcgPj0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTGlzdCB0byBmaWx0ZXIgbXVzdCBiZSBvcmRlcmVkXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5maWx0ZXJPbmx5VG9wUmFua2VkID0gZmlsdGVyT25seVRvcFJhbmtlZDtcbmZ1bmN0aW9uIGZpbHRlck9ubHlUb3BSYW5rZWRUdXBlbChyZXN1bHRzKSB7XG4gICAgdmFyIHJlcyA9IHJlc3VsdHMuZmlsdGVyKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgaWYgKHNhZmVFcXVhbChyZXN1bHQuX3JhbmtpbmcsIHJlc3VsdHNbMF0uX3JhbmtpbmcpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0Ll9yYW5raW5nID49IHJlc3VsdHNbMF0uX3JhbmtpbmcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkxpc3QgdG8gZmlsdGVyIG11c3QgYmUgb3JkZXJlZFwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZmlsdGVyT25seVRvcFJhbmtlZFR1cGVsID0gZmlsdGVyT25seVRvcFJhbmtlZFR1cGVsO1xuZnVuY3Rpb24gaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdChyZXN1bHRzKSB7XG4gICAgdmFyIGNudCA9IHJlc3VsdHMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCByZXN1bHQpIHtcbiAgICAgICAgaWYgKHNhZmVFcXVhbChyZXN1bHQuX3JhbmtpbmcsIHJlc3VsdHNbMF0uX3JhbmtpbmcpKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICB9LCAwKTtcbiAgICBpZiAoY250ID4gMSkge1xuICAgICAgICAvLyBzZWFyY2ggZm9yIGEgZGlzY3JpbWluYXRpbmcgY2F0ZWdvcnkgdmFsdWVcbiAgICAgICAgdmFyIGRpc2NyaW1pbmF0aW5nID0gT2JqZWN0LmtleXMocmVzdWx0c1swXS5yZWNvcmQpLnJlZHVjZShmdW5jdGlvbiAocHJldiwgY2F0ZWdvcnkpIHtcbiAgICAgICAgICAgIGlmICgoY2F0ZWdvcnkuY2hhckF0KDApICE9PSAnXycgJiYgY2F0ZWdvcnkgIT09IHJlc3VsdHNbMF0uY2F0ZWdvcnkpXG4gICAgICAgICAgICAgICAgJiYgKHJlc3VsdHNbMF0ucmVjb3JkW2NhdGVnb3J5XSAhPT0gcmVzdWx0c1sxXS5yZWNvcmRbY2F0ZWdvcnldKSkge1xuICAgICAgICAgICAgICAgIHByZXYucHVzaChjYXRlZ29yeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcHJldjtcbiAgICAgICAgfSwgW10pO1xuICAgICAgICBpZiAoZGlzY3JpbWluYXRpbmcubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJNYW55IGNvbXBhcmFibGUgcmVzdWx0cywgcGVyaGFwcyB5b3Ugd2FudCB0byBzcGVjaWZ5IGEgZGlzY3JpbWluYXRpbmcgXCIgKyBkaXNjcmltaW5hdGluZy5qb2luKCcsJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICdZb3VyIHF1ZXN0aW9uIGRvZXMgbm90IGhhdmUgYSBzcGVjaWZpYyBhbnN3ZXInO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xufVxuZXhwb3J0cy5pc0luZGlzY3JpbWluYXRlUmVzdWx0ID0gaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdDtcbmZ1bmN0aW9uIGlzSW5kaXNjcmltaW5hdGVSZXN1bHRUdXBlbChyZXN1bHRzKSB7XG4gICAgdmFyIGNudCA9IHJlc3VsdHMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCByZXN1bHQpIHtcbiAgICAgICAgaWYgKHNhZmVFcXVhbChyZXN1bHQuX3JhbmtpbmcsIHJlc3VsdHNbMF0uX3JhbmtpbmcpKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICB9LCAwKTtcbiAgICBpZiAoY250ID4gMSkge1xuICAgICAgICAvLyBzZWFyY2ggZm9yIGEgZGlzY3JpbWluYXRpbmcgY2F0ZWdvcnkgdmFsdWVcbiAgICAgICAgdmFyIGRpc2NyaW1pbmF0aW5nID0gT2JqZWN0LmtleXMocmVzdWx0c1swXS5yZWNvcmQpLnJlZHVjZShmdW5jdGlvbiAocHJldiwgY2F0ZWdvcnkpIHtcbiAgICAgICAgICAgIGlmICgoY2F0ZWdvcnkuY2hhckF0KDApICE9PSAnXycgJiYgcmVzdWx0c1swXS5jYXRlZ29yaWVzLmluZGV4T2YoY2F0ZWdvcnkpIDwgMClcbiAgICAgICAgICAgICAgICAmJiAocmVzdWx0c1swXS5yZWNvcmRbY2F0ZWdvcnldICE9PSByZXN1bHRzWzFdLnJlY29yZFtjYXRlZ29yeV0pKSB7XG4gICAgICAgICAgICAgICAgcHJldi5wdXNoKGNhdGVnb3J5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwcmV2O1xuICAgICAgICB9LCBbXSk7XG4gICAgICAgIGlmIChkaXNjcmltaW5hdGluZy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBcIk1hbnkgY29tcGFyYWJsZSByZXN1bHRzLCBwZXJoYXBzIHlvdSB3YW50IHRvIHNwZWNpZnkgYSBkaXNjcmltaW5hdGluZyBcIiArIGRpc2NyaW1pbmF0aW5nLmpvaW4oJywnKSArICcgb3IgdXNlIFwibGlzdCBhbGwgLi4uXCInO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnWW91ciBxdWVzdGlvbiBkb2VzIG5vdCBoYXZlIGEgc3BlY2lmaWMgYW5zd2VyJztcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbmV4cG9ydHMuaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdFR1cGVsID0gaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdFR1cGVsO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
