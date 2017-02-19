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
    }
    /* else*/{
        relevantRecords = relevantRecords.filter(function (record) {
            return record[categoryF] !== undefined && record[categoryF] !== null;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC93aGF0aXMudHMiLCJtYXRjaC93aGF0aXMuanMiXSwibmFtZXMiOlsiSW5wdXRGaWx0ZXIiLCJyZXF1aXJlIiwiZGVidWciLCJkZWJ1Z2xvZyIsImRlYnVnbG9nViIsInBlcmZsb2ciLCJtb2NrRGVidWciLCJvIiwiZXhwb3J0cyIsIl8iLCJNYXRjaCIsIlNlbnRlbmNlIiwiV29yZCIsIkFsZ29sIiwiY21wQnlSZXN1bHRUaGVuUmFua2luZyIsImEiLCJiIiwiY21wIiwicmVzdWx0IiwibG9jYWxlQ29tcGFyZSIsIl9yYW5raW5nIiwibG9jYWxlQ29tcGFyZUFycnMiLCJhYXJlc3VsdCIsImJicmVzdWx0IiwiYmxlbiIsImxlbmd0aCIsImV2ZXJ5IiwiaW5kZXgiLCJzYWZlRXF1YWwiLCJkZWx0YSIsIk1hdGgiLCJhYnMiLCJSQU5LSU5HX0VQU0lMT04iLCJzYWZlRGVsdGEiLCJjbXBCeVJlc3VsdFRoZW5SYW5raW5nVHVwZWwiLCJhYSIsImJiIiwiY21wQnlSYW5raW5nIiwia2V5cyIsIk9iamVjdCIsInJlY29yZCIsImNvbmNhdCIsInNvcnQiLCJyZXMiLCJyZWR1Y2UiLCJwcmV2Iiwic0tleSIsImNtcEJ5UmFua2luZ1R1cGVsIiwiZHVtcE5pY2UiLCJhbnN3ZXIiLCJzIiwicHVzaCIsImNhdGVnb3J5IiwiZm9yRWFjaCIsInNSZXF1aXJlcyIsImNoYXJBdCIsIm9TZW50ZW5jZSIsInNlbnRlbmNlIiwib1dvcmQiLCJzV29yZCIsInN0cmluZyIsIm1hdGNoZWRTdHJpbmciLCJkdW1wTmljZVR1cGVsIiwiY2F0ZWdvcmllcyIsImpvaW4iLCJkdW1wV2VpZ2h0c1RvcCIsInRvb2xtYXRjaGVzIiwib3B0aW9ucyIsIm9NYXRjaCIsInRvcCIsImZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdCIsImFuc3dlcnMiLCJmaWx0ZXIiLCJpUmVzIiwiZW5hYmxlZCIsIkpTT04iLCJzdHJpbmdpZnkiLCJhc3NpZ24iLCJmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHRUdXBlbCIsInR1cGVsYW5zd2VycyIsImlzRXF1YWwiLCJjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5IiwibWF0Y2hlZCIsImhhc0NhdGVnb3J5IiwibWlzbWF0Y2hlZCIsInJlbGV2YW50Q291bnQiLCJoYXNEb21haW4iLCJsZW5NYXRjaGVkIiwiZmFjdG9yIiwiY2FsY1JhbmtpbmdQcm9kdWN0IiwicG93IiwibGVuSGFzQ2F0ZWdvcnkiLCJmYWN0b3JIIiwibGVuTWlzTWF0Y2hlZCIsImZhY3RvcjIiLCJkaXZpc29yIiwibWF0Y2hSZWNvcmRzVHVwZWxIYXZpbmdDb250ZXh0IiwicFNlbnRlbmNlcyIsInJlY29yZHMiLCJjYXRlZ29yeVNldCIsIm1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzIiwibWFrZVNpbXBsaWZpZWRTZW50ZW5jZXNDYXRlZ29yeVNldDIiLCJhU2VudGVuY2VzIiwidHJhY2siLCJzZW50ZW5jZXMiLCJtYXAiLCJhRG9tYWlucyIsInJXb3JkcyIsImZsIiwibGYiLCJkb21haW5zIiwiY250UmVsZXZhbnRXb3JkcyIsIm1ha2VTaW1wbGlmaWVkU2VudGVuY2VzIiwiaXNGaWxsZXIiLCJleHRyYWN0UmVzdWx0IiwiZG9tYWluQ2F0ZWdvcnlGaWx0ZXIiLCJFcnJvciIsImZyZWV6ZSIsImNhdGVnb3J5RiIsInJlbGV2YW50UmVjb3JkcyIsImluZGV4T2YiLCJfZG9tYWluIiwidW5kZWZpbmVkIiwib2JqIiwiYVNpbXBsaWZpZWRTZW50ZW5jZXMiLCJhU2VudGVuY2UiLCJpbWlzbWF0Y2hlZCIsImltYXRjaGVkIiwibm91c2UiLCJmb3VuZGNhdCIsIm1pc3NpbmdjYXQiLCJpc0NhdGVnb3J5IiwibWF0Y2hlZERvbWFpbiIsIm1hdGNoZWRMZW4iLCJtaXNtYXRjaGVkTGVuIiwicmVjIiwicmVzdWx0MSIsInJlc3VsdDIiLCJjbGFzc2lmeVdvcmRXaXRoVGFyZ2V0Q2F0ZWdvcnkiLCJ3b3JkIiwidGFyZ2V0Y2F0ZWdvcnkiLCJydWxlcyIsIndob2xlc2VudGVuY2UiLCJjYXRzIiwiY2F0ZWdvcml6ZUFXb3JkIiwiY2F0IiwiYW5hbHl6ZUNhdGVnb3J5IiwiY2F0ZWdvcnl3b3JkIiwic3BsaXRBdENvbW1hQW5kIiwic3RyIiwiciIsInNwbGl0IiwicnRyaW1tZWQiLCJTdHJpbmciLCJ0cmltIiwiYW5hbHl6ZUNhdGVnb3J5TXVsdE9ubHlBbmRDb21tYSIsImNhdGVnb3J5bGlzdCIsInJjYXQiLCJmaWx0ZXJBY2NlcHRpbmdPbmx5IiwiaUluZGV4IiwiRXJiYXNlIiwicHJvY2Vzc1N0cmluZyIsInF1ZXJ5Iiwid29yZENhY2hlIiwiYW5hbHl6ZUNvbnRleHRTdHJpbmciLCJjb250ZXh0UXVlcnlTdHJpbmciLCJhU2VudGVuY2VzUmVpbmZvcmNlZCIsInNsaWNlIiwiQ3V0b2ZmX1NlbnRlbmNlcyIsInJhbmtpbmdQcm9kdWN0IiwiY21wQnlOckNhdGVnb3JpZXNBbmRTYW1lRG9tYWluIiwiY250YSIsImdldERpc3RpbmN0Q2F0ZWdvcmllc0luU2VudGVuY2UiLCJjbnRiIiwiYW5hbHl6ZUNhdGVnb3J5TXVsdCIsImdXb3JkcyIsInJlczIiLCJjbXBSYW5raW5nUHJvZHVjdCIsImR1bXBOaWNlQXJyIiwicmVzY2F0IiwiYW5hbHl6ZU9wZXJhdG9yIiwib3B3b3JkIiwiRXJFcnJvciIsIkxpc3RBbGwiLCJyZXNvbHZlQ2F0ZWdvcnkiLCJlcnJvcnMiLCJtYWtlRXJyb3JfRU1QVFlfSU5QVVQiLCJ0b2tlbnMiLCJsaXN0QWxsV2l0aENvbnRleHQiLCJyZXNvbHZlQ2F0ZWdvcmllcyIsInRoZU1vZGVsIiwibGlzdEFsbFR1cGVsV2l0aENvbnRleHQiLCJmaWx0ZXJPbmx5VG9wUmFua2VkIiwicmVzdWx0cyIsImZpbHRlck9ubHlUb3BSYW5rZWRUdXBlbCIsImlzSW5kaXNjcmltaW5hdGVSZXN1bHQiLCJjbnQiLCJkaXNjcmltaW5hdGluZyIsImlzSW5kaXNjcmltaW5hdGVSZXN1bHRUdXBlbCJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztBQ01BOzs7O0FE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QVd6SixNQUFYLENBQWtCWSxRQUFsQixDQUR0QyxFQUNvRTtBQUNsRVAscUJBQUtNLElBQUwsQ0FBVUMsUUFBVjtBQUNEO0FBQ0QsbUJBQU9QLElBQVA7QUFDRCxTQU5vQixFQU1sQixFQU5rQixDQUFyQjtBQU9BLFlBQUl3SixlQUFlNUssTUFBbkIsRUFBMkI7QUFDekIsbUJBQU8sMkVBQTJFNEssZUFBZXJJLElBQWYsQ0FBb0IsR0FBcEIsQ0FBM0UsR0FBc0csd0JBQTdHO0FBQ0Q7QUFDRCxlQUFPLCtDQUFQO0FBQ0Q7QUFDRCxXQUFPMEQsU0FBUDtBQUNEO0FBckJEbEgsUUFBQThMLDJCQUFBLEdBQUFBLDJCQUFBIiwiZmlsZSI6Im1hdGNoL3doYXRpcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICpcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmFuYWx5emVcbiAqIEBmaWxlIGFuYWx5emUudHNcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cbiAqL1xuXG5cbmltcG9ydCAqIGFzIElucHV0RmlsdGVyIGZyb20gJy4vaW5wdXRGaWx0ZXInO1xuXG5pbXBvcnQgKiBhcyBkZWJ1ZyBmcm9tICdkZWJ1Zyc7XG5cbnZhciBkZWJ1Z2xvZyA9IGRlYnVnKCd3aGF0aXMnKTtcbnZhciBkZWJ1Z2xvZ1YgPSBkZWJ1Zygnd2hhdFZpcycpO1xudmFyIHBlcmZsb2cgPSBkZWJ1ZygncGVyZicpO1xuXG5cbmV4cG9ydCBmdW5jdGlvbiBtb2NrRGVidWcobykge1xuICBkZWJ1Z2xvZyA9IG87XG4gIGRlYnVnbG9nViA9IG87XG4gIHBlcmZsb2cgPSBvO1xufVxuXG5cbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gJy4uL3V0aWxzL3V0aWxzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcblxuaW1wb3J0ICogYXMgSU1hdGNoIGZyb20gJy4vaWZtYXRjaCc7XG5cblxuaW1wb3J0ICogYXMgTWF0Y2ggZnJvbSAnLi9tYXRjaCc7XG5cblxuaW1wb3J0ICogYXMgVG9vbG1hdGNoZXIgZnJvbSAnLi90b29sbWF0Y2hlcic7XG5cbmltcG9ydCAqIGFzIFNlbnRlbmNlIGZyb20gJy4vc2VudGVuY2UnO1xuXG5pbXBvcnQgKiBhcyBXb3JkIGZyb20gJy4vd29yZCc7XG5cbmltcG9ydCAqIGFzIEFsZ29sIGZyb20gJy4vYWxnb2wnO1xuXG5cbmV4cG9ydCBmdW5jdGlvbiBjbXBCeVJlc3VsdFRoZW5SYW5raW5nKGE6IElNYXRjaC5JV2hhdElzQW5zd2VyLCBiOiBJTWF0Y2guSVdoYXRJc0Fuc3dlcikge1xuICB2YXIgY21wID0gYS5yZXN1bHQubG9jYWxlQ29tcGFyZShiLnJlc3VsdCk7XG4gIGlmIChjbXApIHtcbiAgICByZXR1cm4gY21wO1xuICB9XG4gIHJldHVybiAtKGEuX3JhbmtpbmcgLSBiLl9yYW5raW5nKTtcbn1cblxuZnVuY3Rpb24gbG9jYWxlQ29tcGFyZUFycnMoYWFyZXN1bHQ6IHN0cmluZ1tdLCBiYnJlc3VsdDogc3RyaW5nW10pOiBudW1iZXIge1xuICB2YXIgY21wID0gMDtcbiAgdmFyIGJsZW4gPSBiYnJlc3VsdC5sZW5ndGg7XG4gIGFhcmVzdWx0LmV2ZXJ5KGZ1bmN0aW9uIChhLCBpbmRleCkge1xuICAgIGlmIChibGVuIDw9IGluZGV4KSB7XG4gICAgICBjbXAgPSAtMTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgY21wID0gYS5sb2NhbGVDb21wYXJlKGJicmVzdWx0W2luZGV4XSk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG4gIGlmIChjbXApIHtcbiAgICByZXR1cm4gY21wO1xuICB9XG4gIGlmIChibGVuID4gYWFyZXN1bHQubGVuZ3RoKSB7XG4gICAgY21wID0gKzE7XG4gIH1cbiAgcmV0dXJuIDA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzYWZlRXF1YWwoYSA6IG51bWJlciwgYiA6IG51bWJlcikgOiBib29sZWFuIHtcbiAgdmFyIGRlbHRhID0gYSAtIGIgO1xuICBpZihNYXRoLmFicyhkZWx0YSkgPCBBbGdvbC5SQU5LSU5HX0VQU0lMT04pIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzYWZlRGVsdGEoYSA6IG51bWJlciwgYiA6IG51bWJlcikgOiBudW1iZXIge1xuICB2YXIgZGVsdGEgPSBhIC0gYiA7XG4gIGlmKE1hdGguYWJzKGRlbHRhKSA8IEFsZ29sLlJBTktJTkdfRVBTSUxPTikge1xuICAgIHJldHVybiAwO1xuICB9XG4gIHJldHVybiBkZWx0YTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbChhYTogSU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlciwgYmI6IElNYXRjaC5JV2hhdElzVHVwZWxBbnN3ZXIpIHtcbiAgdmFyIGNtcCA9IGxvY2FsZUNvbXBhcmVBcnJzKGFhLnJlc3VsdCwgYmIucmVzdWx0KTtcbiAgaWYgKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cbiAgcmV0dXJuIC1zYWZlRGVsdGEoYWEuX3JhbmtpbmcsYmIuX3JhbmtpbmcpO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBjbXBCeVJhbmtpbmcoYTogSU1hdGNoLklXaGF0SXNBbnN3ZXIsIGI6IElNYXRjaC5JV2hhdElzQW5zd2VyKSB7XG4gIHZhciBjbXAgPSAtIHNhZmVEZWx0YShhLl9yYW5raW5nLCBiLl9yYW5raW5nKSBhcyBudW1iZXI7XG4gIGlmIChjbXApIHtcbiAgICByZXR1cm4gY21wO1xuICB9XG4gIGNtcCA9IGEucmVzdWx0LmxvY2FsZUNvbXBhcmUoYi5yZXN1bHQpO1xuICBpZiAoY21wKSB7XG4gICAgcmV0dXJuIGNtcDtcbiAgfVxuXG4gIC8vIGFyZSByZWNvcmRzIGRpZmZlcmVudD9cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhLnJlY29yZCkuY29uY2F0KE9iamVjdC5rZXlzKGIucmVjb3JkKSkuc29ydCgpO1xuICB2YXIgcmVzID0ga2V5cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHNLZXkpIHtcbiAgICBpZiAocHJldikge1xuICAgICAgcmV0dXJuIHByZXY7XG4gICAgfVxuICAgIGlmIChiLnJlY29yZFtzS2V5XSAhPT0gYS5yZWNvcmRbc0tleV0pIHtcbiAgICAgIGlmICghYi5yZWNvcmRbc0tleV0pIHtcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgfVxuICAgICAgaWYgKCFhLnJlY29yZFtzS2V5XSkge1xuICAgICAgICByZXR1cm4gKzE7XG4gICAgICB9XG4gICAgICByZXR1cm4gYS5yZWNvcmRbc0tleV0ubG9jYWxlQ29tcGFyZShiLnJlY29yZFtzS2V5XSk7XG4gICAgfVxuICAgIHJldHVybiAwO1xuICB9LCAwKTtcbiAgcmV0dXJuIHJlcztcbn1cblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBjbXBCeVJhbmtpbmdUdXBlbChhOiBJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyLCBiOiBJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyKSB7XG4gIHZhciBjbXAgPSAtIHNhZmVEZWx0YShhLl9yYW5raW5nLCBiLl9yYW5raW5nKTtcbiAgaWYgKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cbiAgY21wID0gbG9jYWxlQ29tcGFyZUFycnMoYS5yZXN1bHQsIGIucmVzdWx0KTtcbiAgaWYgKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cbiAgLy8gYXJlIHJlY29yZHMgZGlmZmVyZW50P1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGEucmVjb3JkKS5jb25jYXQoT2JqZWN0LmtleXMoYi5yZWNvcmQpKS5zb3J0KCk7XG4gIHZhciByZXMgPSBrZXlzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgc0tleSkge1xuICAgIGlmIChwcmV2KSB7XG4gICAgICByZXR1cm4gcHJldjtcbiAgICB9XG4gICAgaWYgKGIucmVjb3JkW3NLZXldICE9PSBhLnJlY29yZFtzS2V5XSkge1xuICAgICAgaWYgKCFiLnJlY29yZFtzS2V5XSkge1xuICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgICBpZiAoIWEucmVjb3JkW3NLZXldKSB7XG4gICAgICAgIHJldHVybiArMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhLnJlY29yZFtzS2V5XS5sb2NhbGVDb21wYXJlKGIucmVjb3JkW3NLZXldKTtcbiAgICB9XG4gICAgcmV0dXJuIDA7XG4gIH0sIDApO1xuICByZXR1cm4gcmVzO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBkdW1wTmljZShhbnN3ZXI6IElNYXRjaC5JV2hhdElzQW5zd2VyKSB7XG4gIHZhciByZXN1bHQgPSB7XG4gICAgczogXCJcIixcbiAgICBwdXNoOiBmdW5jdGlvbiAocykgeyB0aGlzLnMgPSB0aGlzLnMgKyBzOyB9XG4gIH07XG4gIHZhciBzID1cbiAgICBgKipSZXN1bHQgZm9yIGNhdGVnb3J5OiAke2Fuc3dlci5jYXRlZ29yeX0gaXMgJHthbnN3ZXIucmVzdWx0fVxuIHJhbms6ICR7YW5zd2VyLl9yYW5raW5nfVxuYDtcbiAgcmVzdWx0LnB1c2gocyk7XG4gIE9iamVjdC5rZXlzKGFuc3dlci5yZWNvcmQpLmZvckVhY2goZnVuY3Rpb24gKHNSZXF1aXJlcywgaW5kZXgpIHtcbiAgICBpZiAoc1JlcXVpcmVzLmNoYXJBdCgwKSAhPT0gJ18nKSB7XG4gICAgICByZXN1bHQucHVzaChgcmVjb3JkOiAke3NSZXF1aXJlc30gLT4gJHthbnN3ZXIucmVjb3JkW3NSZXF1aXJlc119YCk7XG4gICAgfVxuICAgIHJlc3VsdC5wdXNoKCdcXG4nKTtcbiAgfSk7XG4gIHZhciBvU2VudGVuY2UgPSBhbnN3ZXIuc2VudGVuY2U7XG4gIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaW5kZXgpIHtcbiAgICB2YXIgc1dvcmQgPSBgWyR7aW5kZXh9XSA6ICR7b1dvcmQuY2F0ZWdvcnl9IFwiJHtvV29yZC5zdHJpbmd9XCIgPT4gXCIke29Xb3JkLm1hdGNoZWRTdHJpbmd9XCJgXG4gICAgcmVzdWx0LnB1c2goc1dvcmQgKyBcIlxcblwiKTtcbiAgfSlcbiAgcmVzdWx0LnB1c2goXCIuXFxuXCIpO1xuICByZXR1cm4gcmVzdWx0LnM7XG59XG5leHBvcnQgZnVuY3Rpb24gZHVtcE5pY2VUdXBlbChhbnN3ZXI6IElNYXRjaC5JV2hhdElzVHVwZWxBbnN3ZXIpIHtcbiAgdmFyIHJlc3VsdCA9IHtcbiAgICBzOiBcIlwiLFxuICAgIHB1c2g6IGZ1bmN0aW9uIChzKSB7IHRoaXMucyA9IHRoaXMucyArIHM7IH1cbiAgfTtcbiAgdmFyIHMgPVxuICAgIGAqKlJlc3VsdCBmb3IgY2F0ZWdvcmllczogJHthbnN3ZXIuY2F0ZWdvcmllcy5qb2luKFwiO1wiKX0gaXMgJHthbnN3ZXIucmVzdWx0fVxuIHJhbms6ICR7YW5zd2VyLl9yYW5raW5nfVxuYDtcbiAgcmVzdWx0LnB1c2gocyk7XG4gIE9iamVjdC5rZXlzKGFuc3dlci5yZWNvcmQpLmZvckVhY2goZnVuY3Rpb24gKHNSZXF1aXJlcywgaW5kZXgpIHtcbiAgICBpZiAoc1JlcXVpcmVzLmNoYXJBdCgwKSAhPT0gJ18nKSB7XG4gICAgICByZXN1bHQucHVzaChgcmVjb3JkOiAke3NSZXF1aXJlc30gLT4gJHthbnN3ZXIucmVjb3JkW3NSZXF1aXJlc119YCk7XG4gICAgfVxuICAgIHJlc3VsdC5wdXNoKCdcXG4nKTtcbiAgfSk7XG4gIHZhciBvU2VudGVuY2UgPSBhbnN3ZXIuc2VudGVuY2U7XG4gIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaW5kZXgpIHtcbiAgICB2YXIgc1dvcmQgPSBgWyR7aW5kZXh9XSA6ICR7b1dvcmQuY2F0ZWdvcnl9IFwiJHtvV29yZC5zdHJpbmd9XCIgPT4gXCIke29Xb3JkLm1hdGNoZWRTdHJpbmd9XCJgXG4gICAgcmVzdWx0LnB1c2goc1dvcmQgKyBcIlxcblwiKTtcbiAgfSlcbiAgcmVzdWx0LnB1c2goXCIuXFxuXCIpO1xuICByZXR1cm4gcmVzdWx0LnM7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGR1bXBXZWlnaHRzVG9wKHRvb2xtYXRjaGVzOiBBcnJheTxJTWF0Y2guSVdoYXRJc0Fuc3dlcj4sIG9wdGlvbnM6IGFueSkge1xuICB2YXIgcyA9ICcnO1xuICB0b29sbWF0Y2hlcy5mb3JFYWNoKGZ1bmN0aW9uIChvTWF0Y2gsIGluZGV4KSB7XG4gICAgaWYgKGluZGV4IDwgb3B0aW9ucy50b3ApIHtcbiAgICAgIHMgPSBzICsgXCJXaGF0SXNBbnN3ZXJbXCIgKyBpbmRleCArIFwiXS4uLlxcblwiO1xuICAgICAgcyA9IHMgKyBkdW1wTmljZShvTWF0Y2gpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0KHJlczogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzKTogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzIHtcbiAgdmFyIHJlc3VsdCA9IHJlcy5hbnN3ZXJzLmZpbHRlcihmdW5jdGlvbiAoaVJlcywgaW5kZXgpIHtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgZGVidWdsb2coJ3JldGFpbiB0b3BSYW5rZWQ6ICcgKyBpbmRleCArICcgJyArIEpTT04uc3RyaW5naWZ5KGlSZXMpKTtcbiAgICB9XG4gICAgaWYgKGlSZXMucmVzdWx0ID09PSAocmVzLmFuc3dlcnNbaW5kZXggLSAxXSAmJiByZXMuYW5zd2Vyc1tpbmRleCAtIDFdLnJlc3VsdCkpIHtcbiAgICAgIGRlYnVnbG9nKCdza2lwJyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9KTtcbiAgcmVzdWx0LnNvcnQoY21wQnlSYW5raW5nKTtcbiAgdmFyIGEgPSBPYmplY3QuYXNzaWduKHsgYW5zd2VyczogcmVzdWx0IH0sIHJlcywgeyBhbnN3ZXJzOiByZXN1bHQgfSk7XG4gIGEuYW5zd2VycyA9IHJlc3VsdDtcbiAgcmV0dXJuIGE7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHRUdXBlbChyZXM6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzVHVwZWxBbnN3ZXJzKTogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNUdXBlbEFuc3dlcnMge1xuICB2YXIgcmVzdWx0ID0gcmVzLnR1cGVsYW5zd2Vycy5maWx0ZXIoZnVuY3Rpb24gKGlSZXMsIGluZGV4KSB7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgIGRlYnVnbG9nKCcgcmV0YWluIHR1cGVsICcgKyBpbmRleCArICcgJyArIEpTT04uc3RyaW5naWZ5KGlSZXMpKTtcbiAgICB9XG4gICAgaWYgKF8uaXNFcXVhbChpUmVzLnJlc3VsdCwgcmVzLnR1cGVsYW5zd2Vyc1tpbmRleCAtIDFdICYmIHJlcy50dXBlbGFuc3dlcnNbaW5kZXggLSAxXS5yZXN1bHQpKSB7XG4gICAgICBkZWJ1Z2xvZygnc2tpcCcpO1xuICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9KTtcbiAgcmVzdWx0LnNvcnQoY21wQnlSYW5raW5nVHVwZWwpO1xuICByZXR1cm4gT2JqZWN0LmFzc2lnbihyZXMsIHsgdHVwZWxhbnN3ZXJzOiByZXN1bHQgfSk7XG59XG5cbi8qKlxuICogQSByYW5raW5nIHdoaWNoIGlzIHB1cmVseSBiYXNlZCBvbiB0aGUgbnVtYmVycyBvZiBtYXRjaGVkIGVudGl0aWVzLFxuICogZGlzcmVnYXJkaW5nIGV4YWN0bmVzcyBvZiBtYXRjaFxuICovXG4vKlxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNSYW5raW5nU2ltcGxlKG1hdGNoZWQ6IG51bWJlcixcbiAgbWlzbWF0Y2hlZDogbnVtYmVyLCBub3VzZTogbnVtYmVyLFxuICByZWxldmFudENvdW50OiBudW1iZXIpOiBudW1iZXIge1xuICAvLyAyIDogMFxuICAvLyAxIDogMFxuICB2YXIgZmFjdG9yID0gbWF0Y2hlZCAqIE1hdGgucG93KDEuNSwgbWF0Y2hlZCkgKiBNYXRoLnBvdygxLjUsIG1hdGNoZWQpO1xuICB2YXIgZmFjdG9yMiA9IE1hdGgucG93KDAuNCwgbWlzbWF0Y2hlZCk7XG4gIHZhciBmYWN0b3IzID0gTWF0aC5wb3coMC40LCBub3VzZSk7XG4gIHJldHVybiBNYXRoLnBvdyhmYWN0b3IyICogZmFjdG9yICogZmFjdG9yMywgMSAvIChtaXNtYXRjaGVkICsgbWF0Y2hlZCArIG5vdXNlKSk7XG59XG4qL1xuXG5leHBvcnQgZnVuY3Rpb24gY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkOiB7IFtrZXk6IHN0cmluZ106IElNYXRjaC5JV29yZCB9LFxuICBoYXNDYXRlZ29yeTogeyBba2V5OiBzdHJpbmddOiBudW1iZXIgfSxcbiAgbWlzbWF0Y2hlZDogeyBba2V5OiBzdHJpbmddOiBJTWF0Y2guSVdvcmQgfSwgcmVsZXZhbnRDb3VudDogbnVtYmVyLCBoYXNEb21haW4gOiBudW1iZXIpOiBudW1iZXIge1xuXG5cbiAgdmFyIGxlbk1hdGNoZWQgPSBPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGg7XG4gIHZhciBmYWN0b3IgPSBNYXRjaC5jYWxjUmFua2luZ1Byb2R1Y3QobWF0Y2hlZCk7XG4gIGZhY3RvciAqPSBNYXRoLnBvdygxLjUsIGxlbk1hdGNoZWQpO1xuICBpZihoYXNEb21haW4pIHtcbiAgICBmYWN0b3IgKj0gMS41O1xuICB9XG4gIHZhciBsZW5IYXNDYXRlZ29yeSA9IE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5sZW5ndGg7XG4gIHZhciBmYWN0b3JIID0gTWF0aC5wb3coMS4xLCBsZW5IYXNDYXRlZ29yeSk7XG5cbiAgdmFyIGxlbk1pc01hdGNoZWQgPSBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGg7XG4gIHZhciBmYWN0b3IyID0gTWF0Y2guY2FsY1JhbmtpbmdQcm9kdWN0KG1pc21hdGNoZWQpO1xuICBmYWN0b3IyICo9IE1hdGgucG93KDAuNCwgbGVuTWlzTWF0Y2hlZCk7XG4gIHZhciBkaXZpc29yID0gIChsZW5NaXNNYXRjaGVkICsgbGVuSGFzQ2F0ZWdvcnkgKyBsZW5NYXRjaGVkKTtcbiAgZGl2aXNvciA9IGRpdmlzb3IgPyBkaXZpc29yIDogMTtcbiAgcmV0dXJuIE1hdGgucG93KGZhY3RvcjIgKiBmYWN0b3JIICogZmFjdG9yLCAxIC8gKGRpdmlzb3IpKTtcbn1cblxuLyoqXG4gKiBsaXN0IGFsbCB0b3AgbGV2ZWwgcmFua2luZ3NcbiAqL1xuLypcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFJlY29yZHNIYXZpbmdDb250ZXh0KFxuICBwU2VudGVuY2VzOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcywgY2F0ZWdvcnk6IHN0cmluZywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+LFxuICBjYXRlZ29yeVNldDogeyBba2V5OiBzdHJpbmddOiBib29sZWFuIH0pXG4gIDogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzIHtcblxuICAvL2RlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZHMsIHVuZGVmaW5lZCwgMikpO1xuICB2YXIgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZDogSU1hdGNoLklSZWNvcmQpIHtcbiAgICByZXR1cm4gKHJlY29yZFtjYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkgJiYgKHJlY29yZFtjYXRlZ29yeV0gIT09IG51bGwpO1xuICB9KTtcbiAgdmFyIHJlcyA9IFtdO1xuICBkZWJ1Z2xvZyhcIk1hdGNoUmVjb3Jkc0hhdmluZ0NvbnRleHQgOiByZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCk7XG4gIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJzZW50ZW5jZXMgYXJlIDogXCIgKyBKU09OLnN0cmluZ2lmeShwU2VudGVuY2VzLCB1bmRlZmluZWQsIDIpKSA6IFwiLVwiKTtcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImNhdGVnb3J5IFwiICsgY2F0ZWdvcnkgKyBcIiBhbmQgY2F0ZWdvcnlzZXQgaXM6IFwiICsgSlNPTi5zdHJpbmdpZnkoY2F0ZWdvcnlTZXQsIHVuZGVmaW5lZCwgMikpIDogXCItXCIpO1xuICBpZiAocHJvY2Vzcy5lbnYuQUJPVF9GQVNUICYmIGNhdGVnb3J5U2V0KSB7XG4gICAgLy8gd2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbiBjYXRlZ29yaWVzIHByZXNlbnQgaW4gcmVjb3JkcyBmb3IgZG9tYWlucyB3aGljaCBjb250YWluIHRoZSBjYXRlZ29yeVxuICAgIC8vIHZhciBjYXRlZ29yeXNldCA9IE1vZGVsLmNhbGN1bGF0ZVJlbGV2YW50UmVjb3JkQ2F0ZWdvcmllcyh0aGVNb2RlbCxjYXRlZ29yeSk7XG4gICAgLy9rbm93aW5nIHRoZSB0YXJnZXRcbiAgICBwZXJmbG9nKFwiZ290IGNhdGVnb3J5c2V0IHdpdGggXCIgKyBPYmplY3Qua2V5cyhjYXRlZ29yeVNldCkubGVuZ3RoKTtcbiAgICB2YXIgZmwgPSAwO1xuICAgIHZhciBsZiA9IDA7XG4gICAgdmFyIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gcFNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIHZhciBmV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICByZXR1cm4gIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCk7XG4gICAgICB9KTtcbiAgICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICByZXR1cm4gISFjYXRlZ29yeVNldFtvV29yZC5jYXRlZ29yeV0gfHwgV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpO1xuICAgICAgfSk7XG4gICAgICBmbCA9IGZsICsgb1NlbnRlbmNlLmxlbmd0aDtcbiAgICAgIGxmID0gbGYgKyByV29yZHMubGVuZ3RoO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsIC8vIG5vdCBhIGZpbGxlciAgLy8gdG8gYmUgY29tcGF0aWJsZSBpdCB3b3VsZCBiZSBmV29yZHNcbiAgICAgICAgcldvcmRzOiByV29yZHNcbiAgICAgIH07XG4gICAgfSk7XG4gICAgT2JqZWN0LmZyZWV6ZShhU2ltcGxpZmllZFNlbnRlbmNlcyk7XG4gICAgZGVidWdsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIGZsICsgXCItPlwiICsgbGYgKyBcIilcIik7XG4gICAgcGVyZmxvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgZmwgKyBcIi0+XCIgKyBsZiArIFwiKVwiKTtcbiAgICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICBhU2ltcGxpZmllZFNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgICAgdmFyIGhhc0NhdGVnb3J5ID0ge307XG4gICAgICAgIHZhciBtaXNtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gYVNlbnRlbmNlLmNudFJlbGV2YW50V29yZHM7XG4gICAgICAgIGFTZW50ZW5jZS5yV29yZHMuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgIG1hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpICYmIHJlY29yZFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgaGFzQ2F0ZWdvcnlbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSAxO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgICBpZiAoKE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aCArIE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5sZW5ndGgpID4gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoKSB7XG4gICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgc2VudGVuY2U6IGFTZW50ZW5jZS5vU2VudGVuY2UsXG4gICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICAgIHJlc3VsdDogcmVjb3JkW2NhdGVnb3J5XSxcbiAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0pO1xuICAgIGRlYnVnbG9nKFwiaGVyZSBpbiB3ZWlyZFwiKTtcbiAgfSBlbHNlIHtcbiAgICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICBwU2VudGVuY2VzLnNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgICAgdmFyIGhhc0NhdGVnb3J5ID0ge307XG4gICAgICAgIHZhciBtaXNtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gMDtcbiAgICAgICAgYVNlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgaWYgKCFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpKSB7XG4gICAgICAgICAgICBjbnRSZWxldmFudFdvcmRzID0gY250UmVsZXZhbnRXb3JkcyArIDE7XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKSAmJiByZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgICAgaGFzQ2F0ZWdvcnlbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICgoT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoICsgT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aCkgPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLFxuICAgICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgICByZXN1bHQ6IHJlY29yZFtjYXRlZ29yeV0sXG4gICAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KTtcbiAgfVxuICByZXMuc29ydChjbXBCeVJlc3VsdFRoZW5SYW5raW5nKTtcbiAgZGVidWdsb2coXCIgYWZ0ZXIgc29ydFwiICsgcmVzLmxlbmd0aCk7XG4gIHZhciByZXN1bHQgPSBPYmplY3QuYXNzaWduKHt9LCBwU2VudGVuY2VzLCB7IGFuc3dlcnM6IHJlcyB9KTtcbiAgcmV0dXJuIGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdChyZXN1bHQpO1xufVxuKi9cblxuLyoqXG4gKiBsaXN0IGFsbCB0b3AgbGV2ZWwgcmFua2luZ3NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVjb3Jkc1R1cGVsSGF2aW5nQ29udGV4dChcbiAgcFNlbnRlbmNlczogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMsIGNhdGVnb3JpZXM6IHN0cmluZ1tdLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sXG4gIGNhdGVnb3J5U2V0OiBJTWF0Y2guSURvbWFpbkNhdGVnb3J5RmlsdGVyKVxuICA6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzVHVwZWxBbnN3ZXJzIHtcbiAgICByZXR1cm4gbWF0Y2hSZWNvcmRzUXVpY2tNdWx0aXBsZUNhdGVnb3JpZXMocFNlbnRlbmNlcywgY2F0ZWdvcmllcywgcmVjb3JkcywgY2F0ZWdvcnlTZXQpO1xufVxuXG4vKlxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVjb3JkcyhhU2VudGVuY2VzOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcywgY2F0ZWdvcnk6IHN0cmluZywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+KVxuICA6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzQW5zd2VycyB7XG4gIC8vIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gIC8vICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gIC8vIH1cbiAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQ6IElNYXRjaC5JUmVjb3JkKSB7XG4gICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnldICE9PSBudWxsKTtcbiAgfSk7XG4gIHZhciByZXMgPSBbXTtcbiAgZGVidWdsb2coXCJyZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCk7XG4gIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICBhU2VudGVuY2VzLnNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgIHZhciBtaXNtYXRjaGVkID0ge31cbiAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IDA7XG4gICAgICBhU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgaWYgKCFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpKSB7XG4gICAgICAgICAgY250UmVsZXZhbnRXb3JkcyA9IGNudFJlbGV2YW50V29yZHMgKyAxO1xuICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGlmIChPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2UsXG4gICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxuICAgICAgICAgIHJlc3VsdDogcmVjb3JkW2NhdGVnb3J5XSxcbiAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmcobWF0Y2hlZCwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSlcbiAgfSk7XG4gIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmcpO1xuICB2YXIgcmVzdWx0ID0gT2JqZWN0LmFzc2lnbih7fSwgYVNlbnRlbmNlcywgeyBhbnN3ZXJzOiByZXMgfSk7XG4gIHJldHVybiBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHQocmVzdWx0KTtcbn1cbiovXG4vKlxuZnVuY3Rpb24gbWFrZVNpbXBsaWZpZWRTZW50ZW5jZXNDYXRlZ29yeVNldChhU2VudGVuY2VzOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcyxcbiAgY2F0ZWdvcnlTZXQ6IHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB9LCB0cmFjazogeyBmbDogbnVtYmVyLCBsZjogbnVtYmVyIH1cbik6IHtcbiAgZG9tYWluczogc3RyaW5nW10sXG4gIG9TZW50ZW5jZTogSU1hdGNoLklTZW50ZW5jZSxcbiAgY250UmVsZXZhbnRXb3JkczogbnVtYmVyLFxuICByV29yZHM6IElNYXRjaC5JV29yZFtdXG59W10ge1xuICByZXR1cm4gYVNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICB2YXIgYURvbWFpbnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJkb21haW5cIikge1xuICAgICAgICBhRG9tYWlucy5wdXNoKG9Xb3JkLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwibWV0YVwiKSB7XG4gICAgICAgIC8vIGUuZy4gZG9tYWluIFhYWFxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gISFjYXRlZ29yeVNldFtvV29yZC5jYXRlZ29yeV07XG4gICAgfSk7XG4gICAgdHJhY2suZmwgKz0gb1NlbnRlbmNlLmxlbmd0aDtcbiAgICB0cmFjay5sZiArPSByV29yZHMubGVuZ3RoO1xuICAgIHJldHVybiB7XG4gICAgICBkb21haW5zOiBhRG9tYWlucyxcbiAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCxcbiAgICAgIHJXb3JkczogcldvcmRzXG4gICAgfTtcbiAgfSk7XG59XG4qL1xuXG5mdW5jdGlvbiBtYWtlU2ltcGxpZmllZFNlbnRlbmNlc0NhdGVnb3J5U2V0MihhU2VudGVuY2VzOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcyxcbiAgY2F0ZWdvcnlTZXQ6IHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB9LCB0cmFjazogeyBmbDogbnVtYmVyLCBsZjogbnVtYmVyIH1cbik6IHtcbiAgZG9tYWluczogc3RyaW5nW10sXG4gIG9TZW50ZW5jZTogSU1hdGNoLklTZW50ZW5jZSxcbiAgY250UmVsZXZhbnRXb3JkczogbnVtYmVyLFxuICByV29yZHM6IElNYXRjaC5JV29yZFtdXG59W10ge1xuICByZXR1cm4gYVNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICB2YXIgYURvbWFpbnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJkb21haW5cIikge1xuICAgICAgICBhRG9tYWlucy5wdXNoKG9Xb3JkLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwibWV0YVwiKSB7XG4gICAgICAgIC8vIGUuZy4gZG9tYWluIFhYWFxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZihvV29yZC5jYXRlZ29yeSA9PT0gXCJjYXRlZ29yeVwiKSB7XG4gICAgICAgIGlmKGNhdGVnb3J5U2V0W29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiAhIWNhdGVnb3J5U2V0W29Xb3JkLmNhdGVnb3J5XTtcbiAgICB9KTtcbiAgICB0cmFjay5mbCArPSBvU2VudGVuY2UubGVuZ3RoO1xuICAgIHRyYWNrLmxmICs9IHJXb3Jkcy5sZW5ndGg7XG4gICAgcmV0dXJuIHtcbiAgICAgIGRvbWFpbnM6IGFEb21haW5zLFxuICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLFxuICAgICAgcldvcmRzOiByV29yZHNcbiAgICB9O1xuICB9KTtcbn1cblxuXG5mdW5jdGlvbiBtYWtlU2ltcGxpZmllZFNlbnRlbmNlcyhhU2VudGVuY2VzIDogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMsICB0cmFjazogeyBmbDogbnVtYmVyLCBsZjogbnVtYmVyIH0pOiB7XG4gIGRvbWFpbnM6IHN0cmluZ1tdLFxuICBvU2VudGVuY2U6IElNYXRjaC5JU2VudGVuY2UsXG4gIGNudFJlbGV2YW50V29yZHM6IG51bWJlcixcbiAgcldvcmRzOiBJTWF0Y2guSVdvcmRbXVxufVtdIHtcbiAgcmV0dXJuIGFTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgdmFyIGRvbWFpbnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJkb21haW5cIikge1xuICAgICAgICBkb21haW5zLnB1c2gob1dvcmQubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJtZXRhXCIpIHtcbiAgICAgICAgLy8gZS5nLiBkb21haW4gWFhYXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICB9KTtcbiAgICB0cmFjay5mbCArPSBvU2VudGVuY2UubGVuZ3RoO1xuICAgIHRyYWNrLmxmICs9IHJXb3Jkcy5sZW5ndGg7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgZG9tYWluczogZG9tYWlucyxcbiAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsXG4gICAgICByV29yZHM6IHJXb3Jkc1xuICAgIH07XG4gIH0pO1xufVxuXG5cbmZ1bmN0aW9uIGV4dHJhY3RSZXN1bHQoY2F0ZWdvcmllczogc3RyaW5nW10sIHJlY29yZDogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfSk6IHN0cmluZ1tdIHtcbiAgcmV0dXJuIGNhdGVnb3JpZXMubWFwKGZ1bmN0aW9uIChjYXRlZ29yeSkgeyByZXR1cm4gcmVjb3JkW2NhdGVnb3J5XSB8fCBcIm4vYVwiOyB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzKHBTZW50ZW5jZXM6IElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzLCBjYXRlZ29yaWVzOiBzdHJpbmdbXSwgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+LCBkb21haW5DYXRlZ29yeUZpbHRlcj86IElNYXRjaC5JRG9tYWluQ2F0ZWdvcnlGaWx0ZXIpXG4gIDogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNUdXBlbEFuc3dlcnMge1xuICAvLyBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAvLyAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gIC8vIH1cblxuICBpZihkb21haW5DYXRlZ29yeUZpbHRlciAmJiAhIGRvbWFpbkNhdGVnb3J5RmlsdGVyLmRvbWFpbnMgKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwib2xkIGNhdGVnb3J5c1NFdCA/P1wiKVxuICB9XG5cbiAgT2JqZWN0LmZyZWV6ZShkb21haW5DYXRlZ29yeUZpbHRlcik7XG4gIHZhciBjYXRlZ29yeUYgPSBjYXRlZ29yaWVzWzBdO1xuXG4gIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJtYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcyAocj1cIiArIChyZWNvcmRzICYmIHJlY29yZHMubGVuZ3RoKVxuICArIFwiIHM9XCIgKyAocFNlbnRlbmNlcyAmJiBwU2VudGVuY2VzLnNlbnRlbmNlcyAmJiBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGgpICsgXCIpXFxuIGNhdGVnb3JpZXM6XCIgKyhjYXRlZ29yaWVzICYmICBjYXRlZ29yaWVzLmpvaW4oXCJcXG5cIikpICsgXCIgY2F0ZWdvcnlTZXQ6IFwiXG4gICsgKCBkb21haW5DYXRlZ29yeUZpbHRlciAmJiAodHlwZW9mIGRvbWFpbkNhdGVnb3J5RmlsdGVyLmNhdGVnb3J5U2V0ID09PSBcIm9iamVjdFwiKSAmJiBPYmplY3Qua2V5cyhkb21haW5DYXRlZ29yeUZpbHRlci5jYXRlZ29yeVNldCkuam9pbihcIlxcblwiKSkpICA6IFwiLVwiKTtcbiAgcGVyZmxvZyhcIm1hdGNoUmVjb3Jkc1F1aWNrTXVsdCAuLi4ocj1cIiArIHJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiKVwiKTtcblxuICAvL2NvbnNvbGUubG9nKCdjYXRlZ29yaWVzICcgKyAgSlNPTi5zdHJpbmdpZnkoY2F0ZWdvcmllcykpO1xuXG4gIC8vY29uc29sZS5sb2coJ2NhdGVncm95U2V0JyArICBKU09OLnN0cmluZ2lmeShjYXRlZ29yeVNldCkpO1xuXG5cbiAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHM7XG5cbiAgaWYoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIgJiYgZG9tYWluQ2F0ZWdvcnlGaWx0ZXIuZG9tYWlucykge1xuICAgIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQ6IElNYXRjaC5JUmVjb3JkKSB7XG4gICAgICByZXR1cm4gKGRvbWFpbkNhdGVnb3J5RmlsdGVyLmRvbWFpbnMuaW5kZXhPZigocmVjb3JkIGFzIGFueSkuX2RvbWFpbikgPj0gMCk7XG4gICAgfSk7XG4gIH1cbiAgLyogZWxzZSovIHtcbiAgICByZWxldmFudFJlY29yZHM9IHJlbGV2YW50UmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZDogSU1hdGNoLklSZWNvcmQpIHtcbiAgICAgIHJldHVybiAocmVjb3JkW2NhdGVnb3J5Rl0gIT09IHVuZGVmaW5lZCkgJiYgKHJlY29yZFtjYXRlZ29yeUZdICE9PSBudWxsKTtcbiAgICB9KTtcbiAgfVxuICB2YXIgcmVzID0gW10gYXMgQXJyYXk8SU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlcj47XG4gIGRlYnVnbG9nKFwicmVsZXZhbnQgcmVjb3JkcyB3aXRoIGZpcnN0IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiKVwiKTtcbiAgcGVyZmxvZyhcInJlbGV2YW50IHJlY29yZHMgd2l0aCBmaXJzdCBucjpcIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzZW50ZW5jZXMgXCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGgpO1xuICBpZiAoLypwcm9jZXNzLmVudi5BQk9UX0ZBU1QgJiYqLyBkb21haW5DYXRlZ29yeUZpbHRlcikge1xuICAgIC8vIHdlIGFyZSBvbmx5IGludGVyZXN0ZWQgaW4gY2F0ZWdvcmllcyBwcmVzZW50IGluIHJlY29yZHMgZm9yIGRvbWFpbnMgd2hpY2ggY29udGFpbiB0aGUgY2F0ZWdvcnlcbiAgICAvLyB2YXIgY2F0ZWdvcnlzZXQgPSBNb2RlbC5jYWxjdWxhdGVSZWxldmFudFJlY29yZENhdGVnb3JpZXModGhlTW9kZWwsY2F0ZWdvcnkpO1xuICAgIC8va25vd2luZyB0aGUgdGFyZ2V0XG4gICAgcGVyZmxvZyhcImdvdCBjYXRlZ29yeXNldCB3aXRoIFwiICsgT2JqZWN0LmtleXMoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIuY2F0ZWdvcnlTZXQpLmxlbmd0aCk7XG4gICAgdmFyIG9iaiA9IHsgZmw6IDAsIGxmOiAwIH07XG4gICAgdmFyIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gW10gYXMge1xuICBkb21haW5zOiBzdHJpbmdbXSxcbiAgb1NlbnRlbmNlOiBJTWF0Y2guSVNlbnRlbmNlLFxuICBjbnRSZWxldmFudFdvcmRzOiBudW1iZXIsXG4gIHJXb3JkczogSU1hdGNoLklXb3JkW11cbn1bXTtcbiAgLy8gIGlmIChwcm9jZXNzLmVudi5BQk9UX0JFVDEpIHtcbiAgICAgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBtYWtlU2ltcGxpZmllZFNlbnRlbmNlc0NhdGVnb3J5U2V0MihwU2VudGVuY2VzLCBkb21haW5DYXRlZ29yeUZpbHRlci5jYXRlZ29yeVNldCwgb2JqKSBhcyBhbnk7XG4gIC8vICB9IGVsc2Uge1xuICAvLyAgICBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzQ2F0ZWdvcnlTZXQocFNlbnRlbmNlcywgY2F0ZWdvcnlTZXQsIG9iaikgYXMgYW55O1xuICAvLyAgfVxuICAgIHBlcmZsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIG9iai5mbCArIFwiLT5cIiArIG9iai5sZiArIFwiKVwiKTtcbiAgfSBlbHNlIHtcbiAgICBkZWJ1Z2xvZyhcIm5vdCBhYm90X2Zhc3QgIVwiKTtcbiAgICB2YXIgdHJhY2sgPSB7IGZsOiAwICwgbGYgOiAwfTtcbiAgICB2YXIgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBtYWtlU2ltcGxpZmllZFNlbnRlbmNlcyhwU2VudGVuY2VzLHRyYWNrKTtcbi8qXG4gICAgcFNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICByZXR1cm4gIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCk7XG4gICAgICB9KTtcbiAgICAgIGZsID0gZmwgKyBvU2VudGVuY2UubGVuZ3RoO1xuICAgICAgbGYgPSBsZiArIHJXb3Jkcy5sZW5ndGg7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCxcbiAgICAgICAgcldvcmRzOiByV29yZHNcbiAgICAgIH07XG4gICAgfSk7XG4gICAgKi9cbiAgICBkZWJ1Z2xvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgdHJhY2suZmwgKyBcIi0+XCIgKyB0cmFjay5sZiArIFwiKVwiKTtcbiAgICBwZXJmbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyB0cmFjay5mbCArIFwiLT5cIiArIHRyYWNrLmxmICsgXCIpXCIpO1xuICB9XG5cbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImhlcmUgc2ltcGxpZmllZCBzZW50ZW5jZXMgXCIgK1xuICBhU2ltcGxpZmllZFNlbnRlbmNlcy5tYXAobyA9PiBcIlxcbkRvbWFpbj1cIiArIG8uZG9tYWlucy5qb2luKFwiXFxuXCIpICsgXCJcXG5cIiArICBTZW50ZW5jZS5kdW1wTmljZShvLnJXb3JkcykpLmpvaW4oXCJcXG5cIikpIDogXCItXCIpO1xuXG4gIC8vY29uc29sZS5sb2coXCJoZXJlIHJlY3JvZHNcIiArIHJlbGV2YW50UmVjb3Jkcy5tYXAoIChvLGluZGV4KSA9PiAgXCIgaW5kZXggPSBcIiArIGluZGV4ICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShvKSkuam9pbihcIlxcblwiKSk7XG4gIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICBhU2ltcGxpZmllZFNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgIHZhciBpbWlzbWF0Y2hlZCA9IDA7XG4gICAgICB2YXIgaW1hdGNoZWQgPSAwO1xuICAgICAgdmFyIG5vdXNlID0gMDtcbiAgICAgIHZhciBmb3VuZGNhdCA9IDE7XG4gICAgICB2YXIgbWlzc2luZ2NhdCA9IDA7XG5cbiAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICB2YXIgbWlzbWF0Y2hlZCA9IHt9O1xuICAgICAgdmFyIGhhc0NhdGVnb3J5ID0ge307XG5cbiAgICAgIGFTZW50ZW5jZS5yV29yZHMuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSAwO1xuICAgICAgICBpZiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICsraW1hdGNoZWQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICsraW1pc21hdGNoZWQ7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAhPT0gXCJjYXRlZ29yeVwiKSB7XG4gICAgICAgICAgICBub3VzZSArPSAxO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoIXJlY29yZFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgICBtaXNzaW5nY2F0ICs9IDE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBmb3VuZGNhdCs9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpICYmIHJlY29yZFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgaGFzQ2F0ZWdvcnlbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSAxO1xuICAgICAgICB9IGVsc2UgaWYoIVdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKSkge1xuICAgICAgICAgICAvLyBUT0RPIGJldHRlciB1bm1hY2h0ZWRcbiAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgdmFyIG1hdGNoZWREb21haW4gPSAwO1xuICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSBhU2VudGVuY2UucldvcmRzLmxlbmd0aDtcbiAgICAgIGlmIChhU2VudGVuY2UuZG9tYWlucy5sZW5ndGgpIHtcbiAgICAgICAgaWYgKChyZWNvcmQgYXMgYW55KS5fZG9tYWluICE9PSBhU2VudGVuY2UuZG9tYWluc1swXSkge1xuICAgICAgICAgIGltaXNtYXRjaGVkID0gMzAwMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpbWF0Y2hlZCArPSAxO1xuICAgICAgICAgIG1hdGNoZWREb21haW4gKz0gMTtcbiAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiR09UIEEgRE9NQUlOIEhJVFwiICsgbWF0Y2hlZCArIFwiIFwiICsgbWlzbWF0Y2hlZCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLyppZiAocHJvY2Vzcy5lbnYuQUJPVF9CRVQyKSB7XG4gICAgICAgICovXG4gICAgICAgIHZhciBtYXRjaGVkTGVuID0gT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoICsgT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aDtcbiAgICAgICAgdmFyIG1pc21hdGNoZWRMZW4gPSBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGg7XG4gLyogICAgICAgaWYocmVjb3JkLlRyYW5zYWN0aW9uQ29kZSkge1xuICAgICAgICAgIGRlYnVnbG9nKCcgaGVyZSB0Y29kZSA6ICcgKyByZWNvcmQuVHJhbnNhY3Rpb25Db2RlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmKHJlY29yZC5UcmFuc2FjdGlvbkNvZGUgPT09ICdTX0FMUl84NzAxMjM5NCcpIHtcbiAgICAgZGVidWdsb2coXCJURUhPTkUgYWRkaW5nIFwiICsgZXh0cmFjdFJlc3VsdChjYXRlZ29yaWVzLHJlY29yZCkuam9pbihcIjtcIikpO1xuICAgICAgICAgICAgZGVidWdsb2coXCJ3aXRoIHJhbmtpbmcgOiBcIiArIGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkyKG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzLCBtYXRjaGVkRG9tYWluKSk7XG4gICAgICAgICAgICBkZWJ1Z2xvZyhcIiBjcmVhdGVkIGJ5IFwiICsgT2JqZWN0LmtleXMobWF0Y2hlZCkubWFwKGtleSA9PiBcImtleTpcIiArIGtleVxuICAgICAgICAgICAgKyBcIlxcblwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZFtrZXldKSkuam9pbihcIlxcblwiKVxuICAgICAgICAgICAgKyBcIlxcbmhhc0NhdCBcIiArIEpTT04uc3RyaW5naWZ5KGhhc0NhdGVnb3J5KVxuICAgICAgICAgICAgKyBcIlxcbm1pc21hdCBcIiArIEpTT04uc3RyaW5naWZ5KG1pc21hdGNoZWQpXG4gICAgICAgICAgICArIFwiXFxuY25UcmVsIFwiICsgSlNPTi5zdHJpbmdpZnkoY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgICAgICsgXCJcXG5tYXRjZWREb21haW4gXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkRG9tYWluKVxuICAgICAgICAgICAgKyBcIlxcbmhhc0NhdCBcIiArIE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KVxuICAgICAgICAgICAgKyBcIlxcbm1pc21hdCBcIiArIE9iamVjdC5rZXlzKG1pc21hdGNoZWQpXG4gICAgICAgICAgICArIGBcXG5tYXRjaGVkICR7T2JqZWN0LmtleXMobWF0Y2hlZCl9IFxcbmhhc2NhdCAke09iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5qb2luKFwiOyBcIil9IFxcbm1pc206ICR7T2JqZWN0LmtleXMobWlzbWF0Y2hlZCl9IFxcbmBcbiAgICAgICAgICAgICsgXCJcXG5tYXRjZWREb21haW4gXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkRG9tYWluKVxuXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4qL1xuXG5cbiAgICAgICAgaWYgKChpbWlzbWF0Y2hlZCA8IDMwMDApXG4gICAgICAgICAgJiYgKChtYXRjaGVkTGVuID4gbWlzbWF0Y2hlZExlbiApXG4gICAgICAgICAgICAgfHwgKG1hdGNoZWRMZW4gPT09IG1pc21hdGNoZWRMZW4gJiYgbWF0Y2hlZERvbWFpbiA+IDApKVxuICAgICAgICApIHtcbiAgICAgICAgICAvKlxuICAgICAgICAgICAgZGVidWdsb2coXCJhZGRpbmcgXCIgKyBleHRyYWN0UmVzdWx0KGNhdGVnb3JpZXMscmVjb3JkKS5qb2luKFwiO1wiKSk7XG4gICAgICAgICAgICBkZWJ1Z2xvZyhcIndpdGggcmFua2luZyA6IFwiICsgY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeTIobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMsIG1hdGNoZWREb21haW4pKTtcbiAgICAgICAgICAgIGRlYnVnbG9nKFwiIGNyZWF0ZWQgYnkgXCIgKyBPYmplY3Qua2V5cyhtYXRjaGVkKS5tYXAoa2V5ID0+IFwia2V5OlwiICsga2V5XG4gICAgICAgICAgICArIFwiXFxuXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkW2tleV0pKS5qb2luKFwiXFxuXCIpXG4gICAgICAgICAgICArIFwiXFxuaGFzQ2F0IFwiICsgSlNPTi5zdHJpbmdpZnkoaGFzQ2F0ZWdvcnkpXG4gICAgICAgICAgICArIFwiXFxubWlzbWF0IFwiICsgSlNPTi5zdHJpbmdpZnkobWlzbWF0Y2hlZClcbiAgICAgICAgICAgICsgXCJcXG5jblRyZWwgXCIgKyBKU09OLnN0cmluZ2lmeShjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICAgICAgKyBcIlxcbm1hdGNlZERvbWFpbiBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWREb21haW4pXG4gICAgICAgICAgICArIFwiXFxuaGFzQ2F0IFwiICsgT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpXG4gICAgICAgICAgICArIFwiXFxubWlzbWF0IFwiICsgT2JqZWN0LmtleXMobWlzbWF0Y2hlZClcbiAgICAgICAgICAgICsgYFxcbm1hdGNoZWQgJHtPYmplY3Qua2V5cyhtYXRjaGVkKX0gXFxuaGFzY2F0ICR7T2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmpvaW4oXCI7IFwiKX0gXFxubWlzbTogJHtPYmplY3Qua2V5cyhtaXNtYXRjaGVkKX0gXFxuYFxuICAgICAgICAgICAgKyBcIlxcbm1hdGNlZERvbWFpbiBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWREb21haW4pXG5cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAqL1xuXG4gICAgICAgICAgICB2YXIgcmVjID0ge1xuICAgICAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLm9TZW50ZW5jZSxcbiAgICAgICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgICAgIGNhdGVnb3JpZXM6IGNhdGVnb3JpZXMsXG4gICAgICAgICAgICAgIHJlc3VsdDogZXh0cmFjdFJlc3VsdChjYXRlZ29yaWVzLCByZWNvcmQpLFxuICAgICAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcywgbWF0Y2hlZERvbWFpbilcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiaGVyZSByYW5raW5nXCIgKyByZWMuX3JhbmtpbmcpXG4gICAgICAgICAgICBpZiAoKHJlYy5fcmFua2luZyA9PT0gbnVsbCkgfHwgIXJlYy5fcmFua2luZykge1xuICAgICAgICAgICAgICByZWMuX3JhbmtpbmcgPSAwLjk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXMucHVzaChyZWMpO1xuICAgICAgICAgIH1cbiAgICAgIC8qfSBlbHNlIHtcbiAgICAgIC8vIGlmKG1hdGNoZWQgPiAwIHx8IG1pc21hdGNoZWQgPiAwICkge1xuICAgICAgLy8gICBjb25zb2xlLmxvZyhcIiBtXCIgKyBtYXRjaGVkICsgXCIgbWlzbWF0Y2hlZFwiICsgbWlzbWF0Y2hlZCk7XG4gICAgICAvLyB9XG4gICAgICAvL2NvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGFTZW50ZW5jZS5vU2VudGVuY2UpKTtcbiAgICAgICAgaWYgKGltYXRjaGVkID4gaW1pc21hdGNoZWQpIHtcbiAgICAgICAgICB2YXIgcmVjID0ge1xuICAgICAgICAgICAgc2VudGVuY2U6IGFTZW50ZW5jZS5vU2VudGVuY2UsXG4gICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgIGNhdGVnb3JpZXM6IGNhdGVnb3JpZXMsXG4gICAgICAgICAgICByZXN1bHQ6IGV4dHJhY3RSZXN1bHQoY2F0ZWdvcmllcywgcmVjb3JkKSxcbiAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ1NpbXBsZShpbWF0Y2hlZCwgaW1pc21hdGNoZWQsIChub3VzZSArIG1pc3NpbmdjYXQpLCBhU2VudGVuY2UuY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgICB9O1xuICAgICAgICAgIHJlcy5wdXNoKHJlYyk7XG4gICAgICAgIH1cbiAgICAgICB9XG4gICAgICAgKi9cbiAgICB9KVxuICB9KTtcbiAgcGVyZmxvZyhcInNvcnQgKGE9XCIgKyByZXMubGVuZ3RoICsgXCIpXCIpO1xuICByZXMuc29ydChjbXBCeVJlc3VsdFRoZW5SYW5raW5nVHVwZWwpO1xuICBwZXJmbG9nKFwiTVJRTUMgZmlsdGVyUmV0YWluIC4uLlwiKTtcbiAgdmFyIHJlc3VsdDEgPSBPYmplY3QuYXNzaWduKHsgdHVwZWxhbnN3ZXJzOiByZXMgfSwgcFNlbnRlbmNlcyk7XG4gIC8qZGVidWdsb2coXCJORVdNQVBcIiArIHJlcy5tYXAobyA9PiBcIlxcbnJhbmtcIiArIG8uX3JhbmtpbmcgKyBcIiA9PlwiXG4gICAgICAgICAgICAgICsgby5yZXN1bHQuam9pbihcIlxcblwiKSkuam9pbihcIlxcblwiKSk7ICovXG4gIHZhciByZXN1bHQyID0gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0VHVwZWwocmVzdWx0MSk7XG4gIHBlcmZsb2coXCJNUlFNQyBtYXRjaFJlY29yZHNRdWljayBkb25lOiAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgYT1cIiArIHJlcy5sZW5ndGggKyBcIilcIik7XG4gIHJldHVybiByZXN1bHQyO1xufVxuXG5cbmZ1bmN0aW9uIGNsYXNzaWZ5V29yZFdpdGhUYXJnZXRDYXRlZ29yeSh3b3JkOiBzdHJpbmcsIHRhcmdldGNhdGVnb3J5OiBzdHJpbmcsIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcyxcbiAgd2hvbGVzZW50ZW5jZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgLy9jb25zb2xlLmxvZyhcImNsYXNzaWZ5IFwiICsgd29yZCArIFwiIFwiICArIHRhcmdldGNhdGVnb3J5KTtcbiAgdmFyIGNhdHMgPSBJbnB1dEZpbHRlci5jYXRlZ29yaXplQVdvcmQod29yZCwgcnVsZXMsIHdob2xlc2VudGVuY2UsIHt9KTtcbiAgLy8gVE9ETyBxdWFsaWZ5XG4gIGNhdHMgPSBjYXRzLmZpbHRlcihmdW5jdGlvbiAoY2F0KSB7XG4gICAgcmV0dXJuIGNhdC5jYXRlZ29yeSA9PT0gdGFyZ2V0Y2F0ZWdvcnk7XG4gIH0pXG4gIC8vZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoY2F0cykpO1xuICBpZiAoY2F0cy5sZW5ndGgpIHtcbiAgICByZXR1cm4gY2F0c1swXS5tYXRjaGVkU3RyaW5nO1xuICB9XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVDYXRlZ29yeShjYXRlZ29yeXdvcmQ6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCB3aG9sZXNlbnRlbmNlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KGNhdGVnb3J5d29yZCwgJ2NhdGVnb3J5JywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3BsaXRBdENvbW1hQW5kKHN0cjogc3RyaW5nKTogc3RyaW5nW10ge1xuICB2YXIgciA9IHN0ci5zcGxpdCgvKFxcYmFuZFxcYil8WyxdLyk7XG4gIHIgPSByLmZpbHRlcihmdW5jdGlvbiAobywgaW5kZXgpIHtcbiAgICBpZiAoaW5kZXggJSAyID4gMCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG4gIHZhciBydHJpbW1lZCA9IHIubWFwKGZ1bmN0aW9uIChvKSB7XG4gICAgcmV0dXJuIG5ldyBTdHJpbmcobykudHJpbSgpO1xuICB9KTtcbiAgcmV0dXJuIHJ0cmltbWVkO1xufVxuLyoqXG4gKiBBIHNpbXBsZSBpbXBsZW1lbnRhdGlvbiwgc3BsaXR0aW5nIGF0IGFuZCBhbmQgLFxuICovXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZUNhdGVnb3J5TXVsdE9ubHlBbmRDb21tYShjYXRlZ29yeWxpc3Q6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCB3aG9sZXNlbnRlbmNlOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIHZhciBydHJpbW1lZCA9IHNwbGl0QXRDb21tYUFuZChjYXRlZ29yeWxpc3QpO1xuICB2YXIgcmNhdCA9IHJ0cmltbWVkLm1hcChmdW5jdGlvbiAobykge1xuICAgIHJldHVybiBhbmFseXplQ2F0ZWdvcnkobywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xuICB9KTtcbiAgaWYgKHJjYXQuaW5kZXhPZih1bmRlZmluZWQpID49IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1wiJyArIHJ0cmltbWVkW3JjYXQuaW5kZXhPZih1bmRlZmluZWQpXSArICdcIiBpcyBub3QgYSBjYXRlZ29yeSEnKTtcbiAgfVxuICByZXR1cm4gcmNhdDtcbn1cblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJBY2NlcHRpbmdPbmx5KHJlczogSU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdW10sIGNhdGVnb3JpZXM6IHN0cmluZ1tdKTpcbiAgSU1hdGNoLklDYXRlZ29yaXplZFN0cmluZ1tdW10ge1xuICByZXR1cm4gcmVzLmZpbHRlcihmdW5jdGlvbiAoYVNlbnRlbmNlLCBpSW5kZXgpIHtcbiAgICByZXR1cm4gYVNlbnRlbmNlLmV2ZXJ5KGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgcmV0dXJuIGNhdGVnb3JpZXMuaW5kZXhPZihvV29yZC5jYXRlZ29yeSkgPj0gMDtcbiAgICB9KTtcbiAgfSlcbn1cblxuXG5pbXBvcnQgKiBhcyBFcmJhc2UgZnJvbSAnLi9lcmJhc2UnO1xuXG5cbmV4cG9ydCBmdW5jdGlvbiBwcm9jZXNzU3RyaW5nKHF1ZXJ5OiBzdHJpbmcsIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlc1xuKTogSU1hdGNoLklQcm9jZXNzZWRTZW50ZW5jZXMge1xuXG4vLyAgaWYgKCFwcm9jZXNzLmVudi5BQk9UX09MRE1BVENIKSB7XG4gICAgcmV0dXJuIEVyYmFzZS5wcm9jZXNzU3RyaW5nKHF1ZXJ5LCBydWxlcywgcnVsZXMud29yZENhY2hlKTtcbi8vICB9XG4vKlxuICB2YXIgbWF0Y2hlZCA9IElucHV0RmlsdGVyLmFuYWx5emVTdHJpbmcocXVlcnksIHJ1bGVzLCBzV29yZHMpO1xuICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgIGRlYnVnbG9nKFwiQWZ0ZXIgbWF0Y2hlZCBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWQpKTtcbiAgfVxuICB2YXIgYVNlbnRlbmNlcyA9IElucHV0RmlsdGVyLmV4cGFuZE1hdGNoQXJyKG1hdGNoZWQpO1xuICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgIGRlYnVnbG9nKFwiYWZ0ZXIgZXhwYW5kXCIgKyBhU2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgfVxuICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBJbnB1dEZpbHRlci5yZWluRm9yY2UoYVNlbnRlbmNlcyk7XG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgZGVidWdsb2coXCJhZnRlciByZWluZm9yY2VcIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgfVxuICByZXR1cm4ge1xuICAgIGVycm9yczogW10sXG4gICAgc2VudGVuY2VzOiBhU2VudGVuY2VzUmVpbmZvcmNlZFxuICB9IGFzIElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzO1xuKi9cbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZUNvbnRleHRTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nOiBzdHJpbmcsIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcyk6XG4gIElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzIHtcblxuICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBwcm9jZXNzU3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMpXG4gIC8vIHdlIGxpbWl0IGFuYWx5c2lzIHRvIG4gc2VudGVuY2VzXG4gIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcyA9IGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5zbGljZSgwLCBBbGdvbC5DdXRvZmZfU2VudGVuY2VzKTtcbiAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICBkZWJ1Z2xvZyhcImFmdGVyIHJlaW5mb3JjZSBhbmQgY3V0b2ZmXCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubGVuZ3RoICsgXCJcXG5cIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgfSkuam9pbihcIlxcblwiKSk7XG4gIH1cbiAgcmV0dXJuIGFTZW50ZW5jZXNSZWluZm9yY2VkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY21wQnlOckNhdGVnb3JpZXNBbmRTYW1lRG9tYWluKGE6IElNYXRjaC5JU2VudGVuY2UsIGI6IElNYXRjaC5JU2VudGVuY2UpOiBudW1iZXIge1xuICAvL2NvbnNvbGUubG9nKFwiY29tcGFyZSBhXCIgKyBhICsgXCIgY250YiBcIiArIGIpO1xuICB2YXIgY250YSA9IFNlbnRlbmNlLmdldERpc3RpbmN0Q2F0ZWdvcmllc0luU2VudGVuY2UoYSkubGVuZ3RoO1xuICB2YXIgY250YiA9IFNlbnRlbmNlLmdldERpc3RpbmN0Q2F0ZWdvcmllc0luU2VudGVuY2UoYikubGVuZ3RoO1xuICAvKlxuICAgIHZhciBjbnRhID0gYS5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgb1dvcmQpIHtcbiAgICAgIHJldHVybiBwcmV2ICsgKChvV29yZC5jYXRlZ29yeSA9PT0gXCJjYXRlZ29yeVwiKT8gMSA6IDApO1xuICAgIH0sMCk7XG4gICAgdmFyIGNudGIgPSBiLnJlZHVjZShmdW5jdGlvbihwcmV2LCBvV29yZCkge1xuICAgICAgcmV0dXJuIHByZXYgKyAoKG9Xb3JkLmNhdGVnb3J5ID09PSBcImNhdGVnb3J5XCIpPyAxIDogMCk7XG4gICAgfSwwKTtcbiAgIC8vIGNvbnNvbGUubG9nKFwiY250IGFcIiArIGNudGEgKyBcIiBjbnRiIFwiICsgY250Yik7XG4gICAqL1xuICByZXR1cm4gY250YiAtIGNudGE7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhbmFseXplQ2F0ZWdvcnlNdWx0KGNhdGVnb3J5bGlzdDogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHdob2xlc2VudGVuY2U6IHN0cmluZywgZ1dvcmRzOlxuICB7IFtrZXk6IHN0cmluZ106IElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmdbXSB9KTogc3RyaW5nW10ge1xuXG5cblxuXG5cbiAgdmFyIHJlcyA9IGFuYWx5emVDb250ZXh0U3RyaW5nKGNhdGVnb3J5bGlzdCwgcnVsZXMpO1xuICAvLyAgZGVidWdsb2coXCJyZXN1bHRpbmcgY2F0ZWdvcnkgc2VudGVuY2VzXCIsIEpTT04uc3RyaW5naWZ5KHJlcykpO1xuICB2YXIgcmVzMiA9IGZpbHRlckFjY2VwdGluZ09ubHkocmVzLnNlbnRlbmNlcywgW1wiY2F0ZWdvcnlcIiwgXCJmaWxsZXJcIl0pO1xuICAvLyAgY29uc29sZS5sb2coXCJoZXJlIHJlczJcIiArIEpTT04uc3RyaW5naWZ5KHJlczIpICk7XG4gIC8vICBjb25zb2xlLmxvZyhcImhlcmUgdW5kZWZpbmVkICEgKyBcIiArIHJlczIuZmlsdGVyKG8gPT4gIW8pLmxlbmd0aCk7XG4gIHJlczIuc29ydChTZW50ZW5jZS5jbXBSYW5raW5nUHJvZHVjdCk7XG4gIGRlYnVnbG9nKFwicmVzdWx0aW5nIGNhdGVnb3J5IHNlbnRlbmNlczogXFxuXCIsIGRlYnVnbG9nLmVuYWJsZWQgPyAoU2VudGVuY2UuZHVtcE5pY2VBcnIocmVzMi5zbGljZSgwLCAzKSwgU2VudGVuY2UucmFua2luZ1Byb2R1Y3QpKSA6ICctJyk7XG4gIC8vIFRPRE86ICAgcmVzMiA9IGZpbHRlckFjY2VwdGluZ09ubHlTYW1lRG9tYWluKHJlczIpO1xuICAvL2RlYnVnbG9nKFwicmVzdWx0aW5nIGNhdGVnb3J5IHNlbnRlbmNlc1wiLCBKU09OLnN0cmluZ2lmeShyZXMyLCB1bmRlZmluZWQsIDIpKTtcbiAgLy8gZXhwZWN0IG9ubHkgY2F0ZWdvcmllc1xuICAvLyB3ZSBjb3VsZCByYW5rIG5vdyBieSBjb21tb24gZG9tYWlucyAsIGJ1dCBmb3Igbm93IHdlIG9ubHkgdGFrZSB0aGUgZmlyc3Qgb25lXG4gIGlmICghcmVzMi5sZW5ndGgpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIC8vcmVzLnNvcnQoY21wQnlOckNhdGVnb3JpZXNBbmRTYW1lRG9tYWluKTtcbiAgdmFyIHJlc2NhdCA9IFNlbnRlbmNlLmdldERpc3RpbmN0Q2F0ZWdvcmllc0luU2VudGVuY2UocmVzMlswXSk7XG4gIHJldHVybiByZXNjYXQ7XG4gIC8vIFwiXCIgcmV0dXJuIHJlc1swXS5maWx0ZXIoKVxuICAvLyByZXR1cm4gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KGNhdGVnb3J5bGlzdCwgJ2NhdGVnb3J5JywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZU9wZXJhdG9yKG9wd29yZDogc3RyaW5nLCBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHdob2xlc2VudGVuY2U6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBjbGFzc2lmeVdvcmRXaXRoVGFyZ2V0Q2F0ZWdvcnkob3B3b3JkLCAnb3BlcmF0b3InLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG59XG5cblxuaW1wb3J0ICogYXMgRXJFcnJvciBmcm9tICcuL2VyZXJyb3InO1xuXG5pbXBvcnQgKiBhcyBMaXN0QWxsIGZyb20gJy4vbGlzdGFsbCc7XG4vLyBjb25zdCByZXN1bHQgPSBXaGF0SXMucmVzb2x2ZUNhdGVnb3J5KGNhdCwgYTEuZW50aXR5LFxuLy8gICB0aGVNb2RlbC5tUnVsZXMsIHRoZU1vZGVsLnRvb2xzLCB0aGVNb2RlbC5yZWNvcmRzKTtcblxuXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUNhdGVnb3J5KGNhdGVnb3J5OiBzdHJpbmcsIGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLFxuICBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPik6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzQW5zd2VycyB7XG4gIGlmIChjb250ZXh0UXVlcnlTdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHsgZXJyb3JzOiBbRXJFcnJvci5tYWtlRXJyb3JfRU1QVFlfSU5QVVQoKV0sIHRva2VuczogW10sIGFuc3dlcnM6IFtdIH07XG4gIH0gZWxzZSB7XG4gICAgLypcbiAgICAgICAgdmFyIG1hdGNoZWQgPSBJbnB1dEZpbHRlci5hbmFseXplU3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMpO1xuICAgICAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiYWZ0ZXIgbWF0Y2hlZCBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWQpKTogJy0nKTtcbiAgICAgICAgdmFyIGFTZW50ZW5jZXMgPSBJbnB1dEZpbHRlci5leHBhbmRNYXRjaEFycihtYXRjaGVkKTtcbiAgICAgICAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgIGRlYnVnbG9nKFwiYWZ0ZXIgZXhwYW5kXCIgKyBhU2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICAgICAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgICAgIH0gKi9cblxuXG4gICAgICAgICAgLy8gdmFyIGNhdGVnb3J5U2V0ID0gTW9kZWwuZ2V0QWxsUmVjb3JkQ2F0ZWdvcmllc0ZvclRhcmdldENhdGVnb3J5KHRoZU1vZGVsLCBjYXQsIHRydWUpO1xuXG4gICAgdmFyIHJlcyA9IExpc3RBbGwubGlzdEFsbFdpdGhDb250ZXh0KGNhdGVnb3J5LCBjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzLCByZWNvcmRzKTtcbiAgICAvLyogc29ydCBieSBzZW50ZW5jZVxuICAgIHJlcy5hbnN3ZXJzLmZvckVhY2gobyA9PiB7IG8uX3JhbmtpbmcgPSBvLl9yYW5raW5nICogIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KCBvLnNlbnRlbmNlICk7IH0pO1xuICAgIHJlcy5hbnN3ZXJzLnNvcnQoY21wQnlSYW5raW5nKTtcbiAgICByZXR1cm4gcmVzO1xuLypcbiAgICAvLyA/Pz8gdmFyIHJlcyA9IExpc3RBbGwubGlzdEFsbEhhdmluZ0NvbnRleHQoY2F0ZWdvcnksIGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMsIHJlY29yZHMpO1xuXG4gICAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gcHJvY2Vzc1N0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKTtcbiAgICAvL2FTZW50ZW5jZXMubWFwKGZ1bmN0aW9uKG9TZW50ZW5jZSkgeyByZXR1cm4gSW5wdXRGaWx0ZXIucmVpbkZvcmNlKG9TZW50ZW5jZSk7IH0pO1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJhZnRlciByZWluZm9yY2VcIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgfSkuam9pbihcIlxcblwiKSkgOiAnLScpO1xuICAgIHZhciBtYXRjaGVkQW5zd2VycyA9IG1hdGNoUmVjb3JkcyhhU2VudGVuY2VzUmVpbmZvcmNlZCwgY2F0ZWdvcnksIHJlY29yZHMpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8gKiBvYmplY3RzdHJlYW0qIC8ge1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCIgbWF0Y2hlZEFuc3dlcnNcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRBbnN3ZXJzLCB1bmRlZmluZWQsIDIpKSA6ICctJyk7XG4gICAgcmV0dXJuIG1hdGNoZWRBbnN3ZXJzO1xuKi9cbiB9XG59XG5cbi8qXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUNhdGVnb3J5T2xkKGNhdGVnb3J5OiBzdHJpbmcsIGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLFxuICBydWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPik6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzQW5zd2VycyB7XG4gIGlmIChjb250ZXh0UXVlcnlTdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHsgZXJyb3JzOiBbRXJFcnJvci5tYWtlRXJyb3JfRU1QVFlfSU5QVVQoKV0sIHRva2VuczogW10sIGFuc3dlcnM6IFtdIH07XG4gIH0gZWxzZSB7XG4gICAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gcHJvY2Vzc1N0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKTtcbiAgICAvL2FTZW50ZW5jZXMubWFwKGZ1bmN0aW9uKG9TZW50ZW5jZSkgeyByZXR1cm4gSW5wdXRGaWx0ZXIucmVpbkZvcmNlKG9TZW50ZW5jZSk7IH0pO1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJhZnRlciByZWluZm9yY2VcIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgfSkuam9pbihcIlxcblwiKSkgOiAnLScpO1xuICAgIHZhciBtYXRjaGVkQW5zd2VycyA9IG1hdGNoUmVjb3JkcyhhU2VudGVuY2VzUmVpbmZvcmNlZCwgY2F0ZWdvcnksIHJlY29yZHMpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8gKiBvYmplY3RzdHJlYW0qIC8ge1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCIgbWF0Y2hlZEFuc3dlcnNcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRBbnN3ZXJzLCB1bmRlZmluZWQsIDIpKSA6ICctJyk7XG4gICAgcmV0dXJuIG1hdGNoZWRBbnN3ZXJzO1xuICB9XG59XG4qL1xuXG5pbXBvcnQgKiBhcyBNb2RlbCBmcm9tICcuLi9tb2RlbC9tb2RlbCc7XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlQ2F0ZWdvcmllcyhjYXRlZ29yaWVzOiBzdHJpbmdbXSwgY29udGV4dFF1ZXJ5U3RyaW5nOiBzdHJpbmcsXG4gIHRoZU1vZGVsOiBJTWF0Y2guSU1vZGVscyk6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzVHVwZWxBbnN3ZXJzIHtcbiAgdmFyIHJlY29yZHMgPSB0aGVNb2RlbC5yZWNvcmRzO1xuICB2YXIgcnVsZXMgPSB0aGVNb2RlbC5ydWxlcztcbiAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4ge1xuICAgICAgZXJyb3JzOiBbRXJFcnJvci5tYWtlRXJyb3JfRU1QVFlfSU5QVVQoKV0sXG4gICAgICB0dXBlbGFuc3dlcnM6IFtdLFxuICAgICAgdG9rZW5zOiBbXVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyB2YXIgY2F0ZWdvcnlTZXQgPSBNb2RlbC5nZXRBbGxSZWNvcmRDYXRlZ29yaWVzRm9yVGFyZ2V0Q2F0ZWdvcnkodGhlTW9kZWwsIGNhdCwgdHJ1ZSk7XG4gICAgdmFyIHJlcyA9IExpc3RBbGwubGlzdEFsbFR1cGVsV2l0aENvbnRleHQoY2F0ZWdvcmllcywgY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcywgcmVjb3Jkcyk7XG4gICAgLy8qIHNvcnQgYnkgc2VudGVuY2VcbiAgICByZXMudHVwZWxhbnN3ZXJzLmZvckVhY2gobyA9PiB7IG8uX3JhbmtpbmcgPSBvLl9yYW5raW5nICogIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KCBvLnNlbnRlbmNlICk7IH0pO1xuICAgIHJlcy50dXBlbGFuc3dlcnMuc29ydChjbXBCeVJhbmtpbmdUdXBlbCk7XG4gICAgcmV0dXJuIHJlcztcbiAgfVxufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJPbmx5VG9wUmFua2VkKHJlc3VsdHM6IEFycmF5PElNYXRjaC5JV2hhdElzQW5zd2VyPik6IEFycmF5PElNYXRjaC5JV2hhdElzQW5zd2VyPiB7XG4gIHZhciByZXMgPSByZXN1bHRzLmZpbHRlcihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgaWYgKHNhZmVFcXVhbChyZXN1bHQuX3JhbmtpbmcsIHJlc3VsdHNbMF0uX3JhbmtpbmcpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHJlc3VsdC5fcmFua2luZyA+PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJMaXN0IHRvIGZpbHRlciBtdXN0IGJlIG9yZGVyZWRcIik7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG4gIHJldHVybiByZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJPbmx5VG9wUmFua2VkVHVwZWwocmVzdWx0czogQXJyYXk8SU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlcj4pOiBBcnJheTxJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyPiB7XG4gIHZhciByZXMgPSByZXN1bHRzLmZpbHRlcihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgaWYgKCBzYWZlRXF1YWwocmVzdWx0Ll9yYW5raW5nLCByZXN1bHRzWzBdLl9yYW5raW5nKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChyZXN1bHQuX3JhbmtpbmcgPj0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTGlzdCB0byBmaWx0ZXIgbXVzdCBiZSBvcmRlcmVkXCIpO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuICByZXR1cm4gcmVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdChyZXN1bHRzOiBBcnJheTxJTWF0Y2guSVdoYXRJc0Fuc3dlcj4pOiBzdHJpbmcge1xuICB2YXIgY250ID0gcmVzdWx0cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHJlc3VsdCkge1xuICAgIGlmIChzYWZlRXF1YWwocmVzdWx0Ll9yYW5raW5nLHJlc3VsdHNbMF0uX3JhbmtpbmcpKSB7XG4gICAgICByZXR1cm4gcHJldiArIDE7XG4gICAgfVxuICB9LCAwKTtcbiAgaWYgKGNudCA+IDEpIHtcbiAgICAvLyBzZWFyY2ggZm9yIGEgZGlzY3JpbWluYXRpbmcgY2F0ZWdvcnkgdmFsdWVcbiAgICB2YXIgZGlzY3JpbWluYXRpbmcgPSBPYmplY3Qua2V5cyhyZXN1bHRzWzBdLnJlY29yZCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBjYXRlZ29yeSkge1xuICAgICAgaWYgKChjYXRlZ29yeS5jaGFyQXQoMCkgIT09ICdfJyAmJiBjYXRlZ29yeSAhPT0gcmVzdWx0c1swXS5jYXRlZ29yeSlcbiAgICAgICAgJiYgKHJlc3VsdHNbMF0ucmVjb3JkW2NhdGVnb3J5XSAhPT0gcmVzdWx0c1sxXS5yZWNvcmRbY2F0ZWdvcnldKSkge1xuICAgICAgICBwcmV2LnB1c2goY2F0ZWdvcnkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgW10pO1xuICAgIGlmIChkaXNjcmltaW5hdGluZy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBcIk1hbnkgY29tcGFyYWJsZSByZXN1bHRzLCBwZXJoYXBzIHlvdSB3YW50IHRvIHNwZWNpZnkgYSBkaXNjcmltaW5hdGluZyBcIiArIGRpc2NyaW1pbmF0aW5nLmpvaW4oJywnKTtcbiAgICB9XG4gICAgcmV0dXJuICdZb3VyIHF1ZXN0aW9uIGRvZXMgbm90IGhhdmUgYSBzcGVjaWZpYyBhbnN3ZXInO1xuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0luZGlzY3JpbWluYXRlUmVzdWx0VHVwZWwocmVzdWx0czogQXJyYXk8SU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlcj4pOiBzdHJpbmcge1xuICB2YXIgY250ID0gcmVzdWx0cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHJlc3VsdCkge1xuICAgIGlmIChzYWZlRXF1YWwocmVzdWx0Ll9yYW5raW5nLHJlc3VsdHNbMF0uX3JhbmtpbmcpKSB7XG4gICAgICByZXR1cm4gcHJldiArIDE7XG4gICAgfVxuICB9LCAwKTtcbiAgaWYgKGNudCA+IDEpIHtcbiAgICAvLyBzZWFyY2ggZm9yIGEgZGlzY3JpbWluYXRpbmcgY2F0ZWdvcnkgdmFsdWVcbiAgICB2YXIgZGlzY3JpbWluYXRpbmcgPSBPYmplY3Qua2V5cyhyZXN1bHRzWzBdLnJlY29yZCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBjYXRlZ29yeSkge1xuICAgICAgaWYgKChjYXRlZ29yeS5jaGFyQXQoMCkgIT09ICdfJyAmJiByZXN1bHRzWzBdLmNhdGVnb3JpZXMuaW5kZXhPZihjYXRlZ29yeSkgPCAwKVxuICAgICAgICAmJiAocmVzdWx0c1swXS5yZWNvcmRbY2F0ZWdvcnldICE9PSByZXN1bHRzWzFdLnJlY29yZFtjYXRlZ29yeV0pKSB7XG4gICAgICAgIHByZXYucHVzaChjYXRlZ29yeSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJldjtcbiAgICB9LCBbXSk7XG4gICAgaWYgKGRpc2NyaW1pbmF0aW5nLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIFwiTWFueSBjb21wYXJhYmxlIHJlc3VsdHMsIHBlcmhhcHMgeW91IHdhbnQgdG8gc3BlY2lmeSBhIGRpc2NyaW1pbmF0aW5nIFwiICsgZGlzY3JpbWluYXRpbmcuam9pbignLCcpICsgJyBvciB1c2UgXCJsaXN0IGFsbCAuLi5cIic7XG4gICAgfVxuICAgIHJldHVybiAnWW91ciBxdWVzdGlvbiBkb2VzIG5vdCBoYXZlIGEgc3BlY2lmaWMgYW5zd2VyJztcbiAgfVxuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuIiwiLyoqXG4gKlxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuYW5hbHl6ZVxuICogQGZpbGUgYW5hbHl6ZS50c1xuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxuICovXG5cInVzZSBzdHJpY3RcIjtcbnZhciBJbnB1dEZpbHRlciA9IHJlcXVpcmUoXCIuL2lucHV0RmlsdGVyXCIpO1xudmFyIGRlYnVnID0gcmVxdWlyZShcImRlYnVnXCIpO1xudmFyIGRlYnVnbG9nID0gZGVidWcoJ3doYXRpcycpO1xudmFyIGRlYnVnbG9nViA9IGRlYnVnKCd3aGF0VmlzJyk7XG52YXIgcGVyZmxvZyA9IGRlYnVnKCdwZXJmJyk7XG5mdW5jdGlvbiBtb2NrRGVidWcobykge1xuICAgIGRlYnVnbG9nID0gbztcbiAgICBkZWJ1Z2xvZ1YgPSBvO1xuICAgIHBlcmZsb2cgPSBvO1xufVxuZXhwb3J0cy5tb2NrRGVidWcgPSBtb2NrRGVidWc7XG52YXIgXyA9IHJlcXVpcmUoXCJsb2Rhc2hcIik7XG52YXIgTWF0Y2ggPSByZXF1aXJlKFwiLi9tYXRjaFwiKTtcbnZhciBTZW50ZW5jZSA9IHJlcXVpcmUoXCIuL3NlbnRlbmNlXCIpO1xudmFyIFdvcmQgPSByZXF1aXJlKFwiLi93b3JkXCIpO1xudmFyIEFsZ29sID0gcmVxdWlyZShcIi4vYWxnb2xcIik7XG5mdW5jdGlvbiBjbXBCeVJlc3VsdFRoZW5SYW5raW5nKGEsIGIpIHtcbiAgICB2YXIgY21wID0gYS5yZXN1bHQubG9jYWxlQ29tcGFyZShiLnJlc3VsdCk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgICByZXR1cm4gY21wO1xuICAgIH1cbiAgICByZXR1cm4gLShhLl9yYW5raW5nIC0gYi5fcmFua2luZyk7XG59XG5leHBvcnRzLmNtcEJ5UmVzdWx0VGhlblJhbmtpbmcgPSBjbXBCeVJlc3VsdFRoZW5SYW5raW5nO1xuZnVuY3Rpb24gbG9jYWxlQ29tcGFyZUFycnMoYWFyZXN1bHQsIGJicmVzdWx0KSB7XG4gICAgdmFyIGNtcCA9IDA7XG4gICAgdmFyIGJsZW4gPSBiYnJlc3VsdC5sZW5ndGg7XG4gICAgYWFyZXN1bHQuZXZlcnkoZnVuY3Rpb24gKGEsIGluZGV4KSB7XG4gICAgICAgIGlmIChibGVuIDw9IGluZGV4KSB7XG4gICAgICAgICAgICBjbXAgPSAtMTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBjbXAgPSBhLmxvY2FsZUNvbXBhcmUoYmJyZXN1bHRbaW5kZXhdKTtcbiAgICAgICAgaWYgKGNtcCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIGlmIChjbXApIHtcbiAgICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG4gICAgaWYgKGJsZW4gPiBhYXJlc3VsdC5sZW5ndGgpIHtcbiAgICAgICAgY21wID0gKzE7XG4gICAgfVxuICAgIHJldHVybiAwO1xufVxuZnVuY3Rpb24gc2FmZUVxdWFsKGEsIGIpIHtcbiAgICB2YXIgZGVsdGEgPSBhIC0gYjtcbiAgICBpZiAoTWF0aC5hYnMoZGVsdGEpIDwgQWxnb2wuUkFOS0lOR19FUFNJTE9OKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5leHBvcnRzLnNhZmVFcXVhbCA9IHNhZmVFcXVhbDtcbmZ1bmN0aW9uIHNhZmVEZWx0YShhLCBiKSB7XG4gICAgdmFyIGRlbHRhID0gYSAtIGI7XG4gICAgaWYgKE1hdGguYWJzKGRlbHRhKSA8IEFsZ29sLlJBTktJTkdfRVBTSUxPTikge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgcmV0dXJuIGRlbHRhO1xufVxuZXhwb3J0cy5zYWZlRGVsdGEgPSBzYWZlRGVsdGE7XG5mdW5jdGlvbiBjbXBCeVJlc3VsdFRoZW5SYW5raW5nVHVwZWwoYWEsIGJiKSB7XG4gICAgdmFyIGNtcCA9IGxvY2FsZUNvbXBhcmVBcnJzKGFhLnJlc3VsdCwgYmIucmVzdWx0KTtcbiAgICBpZiAoY21wKSB7XG4gICAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuICAgIHJldHVybiAtc2FmZURlbHRhKGFhLl9yYW5raW5nLCBiYi5fcmFua2luZyk7XG59XG5leHBvcnRzLmNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbCA9IGNtcEJ5UmVzdWx0VGhlblJhbmtpbmdUdXBlbDtcbmZ1bmN0aW9uIGNtcEJ5UmFua2luZyhhLCBiKSB7XG4gICAgdmFyIGNtcCA9IC1zYWZlRGVsdGEoYS5fcmFua2luZywgYi5fcmFua2luZyk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgICByZXR1cm4gY21wO1xuICAgIH1cbiAgICBjbXAgPSBhLnJlc3VsdC5sb2NhbGVDb21wYXJlKGIucmVzdWx0KTtcbiAgICBpZiAoY21wKSB7XG4gICAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuICAgIC8vIGFyZSByZWNvcmRzIGRpZmZlcmVudD9cbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGEucmVjb3JkKS5jb25jYXQoT2JqZWN0LmtleXMoYi5yZWNvcmQpKS5zb3J0KCk7XG4gICAgdmFyIHJlcyA9IGtleXMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBzS2V5KSB7XG4gICAgICAgIGlmIChwcmV2KSB7XG4gICAgICAgICAgICByZXR1cm4gcHJldjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYi5yZWNvcmRbc0tleV0gIT09IGEucmVjb3JkW3NLZXldKSB7XG4gICAgICAgICAgICBpZiAoIWIucmVjb3JkW3NLZXldKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFhLnJlY29yZFtzS2V5XSkge1xuICAgICAgICAgICAgICAgIHJldHVybiArMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBhLnJlY29yZFtzS2V5XS5sb2NhbGVDb21wYXJlKGIucmVjb3JkW3NLZXldKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9LCAwKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5jbXBCeVJhbmtpbmcgPSBjbXBCeVJhbmtpbmc7XG5mdW5jdGlvbiBjbXBCeVJhbmtpbmdUdXBlbChhLCBiKSB7XG4gICAgdmFyIGNtcCA9IC1zYWZlRGVsdGEoYS5fcmFua2luZywgYi5fcmFua2luZyk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgICByZXR1cm4gY21wO1xuICAgIH1cbiAgICBjbXAgPSBsb2NhbGVDb21wYXJlQXJycyhhLnJlc3VsdCwgYi5yZXN1bHQpO1xuICAgIGlmIChjbXApIHtcbiAgICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG4gICAgLy8gYXJlIHJlY29yZHMgZGlmZmVyZW50P1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYS5yZWNvcmQpLmNvbmNhdChPYmplY3Qua2V5cyhiLnJlY29yZCkpLnNvcnQoKTtcbiAgICB2YXIgcmVzID0ga2V5cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHNLZXkpIHtcbiAgICAgICAgaWYgKHByZXYpIHtcbiAgICAgICAgICAgIHJldHVybiBwcmV2O1xuICAgICAgICB9XG4gICAgICAgIGlmIChiLnJlY29yZFtzS2V5XSAhPT0gYS5yZWNvcmRbc0tleV0pIHtcbiAgICAgICAgICAgIGlmICghYi5yZWNvcmRbc0tleV0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWEucmVjb3JkW3NLZXldKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICsxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGEucmVjb3JkW3NLZXldLmxvY2FsZUNvbXBhcmUoYi5yZWNvcmRbc0tleV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH0sIDApO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmNtcEJ5UmFua2luZ1R1cGVsID0gY21wQnlSYW5raW5nVHVwZWw7XG5mdW5jdGlvbiBkdW1wTmljZShhbnN3ZXIpIHtcbiAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICBzOiBcIlwiLFxuICAgICAgICBwdXNoOiBmdW5jdGlvbiAocykgeyB0aGlzLnMgPSB0aGlzLnMgKyBzOyB9XG4gICAgfTtcbiAgICB2YXIgcyA9IFwiKipSZXN1bHQgZm9yIGNhdGVnb3J5OiBcIiArIGFuc3dlci5jYXRlZ29yeSArIFwiIGlzIFwiICsgYW5zd2VyLnJlc3VsdCArIFwiXFxuIHJhbms6IFwiICsgYW5zd2VyLl9yYW5raW5nICsgXCJcXG5cIjtcbiAgICByZXN1bHQucHVzaChzKTtcbiAgICBPYmplY3Qua2V5cyhhbnN3ZXIucmVjb3JkKS5mb3JFYWNoKGZ1bmN0aW9uIChzUmVxdWlyZXMsIGluZGV4KSB7XG4gICAgICAgIGlmIChzUmVxdWlyZXMuY2hhckF0KDApICE9PSAnXycpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwicmVjb3JkOiBcIiArIHNSZXF1aXJlcyArIFwiIC0+IFwiICsgYW5zd2VyLnJlY29yZFtzUmVxdWlyZXNdKTtcbiAgICAgICAgfVxuICAgICAgICByZXN1bHQucHVzaCgnXFxuJyk7XG4gICAgfSk7XG4gICAgdmFyIG9TZW50ZW5jZSA9IGFuc3dlci5zZW50ZW5jZTtcbiAgICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGluZGV4KSB7XG4gICAgICAgIHZhciBzV29yZCA9IFwiW1wiICsgaW5kZXggKyBcIl0gOiBcIiArIG9Xb3JkLmNhdGVnb3J5ICsgXCIgXFxcIlwiICsgb1dvcmQuc3RyaW5nICsgXCJcXFwiID0+IFxcXCJcIiArIG9Xb3JkLm1hdGNoZWRTdHJpbmcgKyBcIlxcXCJcIjtcbiAgICAgICAgcmVzdWx0LnB1c2goc1dvcmQgKyBcIlxcblwiKTtcbiAgICB9KTtcbiAgICByZXN1bHQucHVzaChcIi5cXG5cIik7XG4gICAgcmV0dXJuIHJlc3VsdC5zO1xufVxuZXhwb3J0cy5kdW1wTmljZSA9IGR1bXBOaWNlO1xuZnVuY3Rpb24gZHVtcE5pY2VUdXBlbChhbnN3ZXIpIHtcbiAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICBzOiBcIlwiLFxuICAgICAgICBwdXNoOiBmdW5jdGlvbiAocykgeyB0aGlzLnMgPSB0aGlzLnMgKyBzOyB9XG4gICAgfTtcbiAgICB2YXIgcyA9IFwiKipSZXN1bHQgZm9yIGNhdGVnb3JpZXM6IFwiICsgYW5zd2VyLmNhdGVnb3JpZXMuam9pbihcIjtcIikgKyBcIiBpcyBcIiArIGFuc3dlci5yZXN1bHQgKyBcIlxcbiByYW5rOiBcIiArIGFuc3dlci5fcmFua2luZyArIFwiXFxuXCI7XG4gICAgcmVzdWx0LnB1c2gocyk7XG4gICAgT2JqZWN0LmtleXMoYW5zd2VyLnJlY29yZCkuZm9yRWFjaChmdW5jdGlvbiAoc1JlcXVpcmVzLCBpbmRleCkge1xuICAgICAgICBpZiAoc1JlcXVpcmVzLmNoYXJBdCgwKSAhPT0gJ18nKSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaChcInJlY29yZDogXCIgKyBzUmVxdWlyZXMgKyBcIiAtPiBcIiArIGFuc3dlci5yZWNvcmRbc1JlcXVpcmVzXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0LnB1c2goJ1xcbicpO1xuICAgIH0pO1xuICAgIHZhciBvU2VudGVuY2UgPSBhbnN3ZXIuc2VudGVuY2U7XG4gICAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpbmRleCkge1xuICAgICAgICB2YXIgc1dvcmQgPSBcIltcIiArIGluZGV4ICsgXCJdIDogXCIgKyBvV29yZC5jYXRlZ29yeSArIFwiIFxcXCJcIiArIG9Xb3JkLnN0cmluZyArIFwiXFxcIiA9PiBcXFwiXCIgKyBvV29yZC5tYXRjaGVkU3RyaW5nICsgXCJcXFwiXCI7XG4gICAgICAgIHJlc3VsdC5wdXNoKHNXb3JkICsgXCJcXG5cIik7XG4gICAgfSk7XG4gICAgcmVzdWx0LnB1c2goXCIuXFxuXCIpO1xuICAgIHJldHVybiByZXN1bHQucztcbn1cbmV4cG9ydHMuZHVtcE5pY2VUdXBlbCA9IGR1bXBOaWNlVHVwZWw7XG5mdW5jdGlvbiBkdW1wV2VpZ2h0c1RvcCh0b29sbWF0Y2hlcywgb3B0aW9ucykge1xuICAgIHZhciBzID0gJyc7XG4gICAgdG9vbG1hdGNoZXMuZm9yRWFjaChmdW5jdGlvbiAob01hdGNoLCBpbmRleCkge1xuICAgICAgICBpZiAoaW5kZXggPCBvcHRpb25zLnRvcCkge1xuICAgICAgICAgICAgcyA9IHMgKyBcIldoYXRJc0Fuc3dlcltcIiArIGluZGV4ICsgXCJdLi4uXFxuXCI7XG4gICAgICAgICAgICBzID0gcyArIGR1bXBOaWNlKG9NYXRjaCk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcztcbn1cbmV4cG9ydHMuZHVtcFdlaWdodHNUb3AgPSBkdW1wV2VpZ2h0c1RvcDtcbmZ1bmN0aW9uIGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdChyZXMpIHtcbiAgICB2YXIgcmVzdWx0ID0gcmVzLmFuc3dlcnMuZmlsdGVyKGZ1bmN0aW9uIChpUmVzLCBpbmRleCkge1xuICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgZGVidWdsb2coJ3JldGFpbiB0b3BSYW5rZWQ6ICcgKyBpbmRleCArICcgJyArIEpTT04uc3RyaW5naWZ5KGlSZXMpKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaVJlcy5yZXN1bHQgPT09IChyZXMuYW5zd2Vyc1tpbmRleCAtIDFdICYmIHJlcy5hbnN3ZXJzW2luZGV4IC0gMV0ucmVzdWx0KSkge1xuICAgICAgICAgICAgZGVidWdsb2coJ3NraXAnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICByZXN1bHQuc29ydChjbXBCeVJhbmtpbmcpO1xuICAgIHZhciBhID0gT2JqZWN0LmFzc2lnbih7IGFuc3dlcnM6IHJlc3VsdCB9LCByZXMsIHsgYW5zd2VyczogcmVzdWx0IH0pO1xuICAgIGEuYW5zd2VycyA9IHJlc3VsdDtcbiAgICByZXR1cm4gYTtcbn1cbmV4cG9ydHMuZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0ID0gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0O1xuZnVuY3Rpb24gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0VHVwZWwocmVzKSB7XG4gICAgdmFyIHJlc3VsdCA9IHJlcy50dXBlbGFuc3dlcnMuZmlsdGVyKGZ1bmN0aW9uIChpUmVzLCBpbmRleCkge1xuICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgZGVidWdsb2coJyByZXRhaW4gdHVwZWwgJyArIGluZGV4ICsgJyAnICsgSlNPTi5zdHJpbmdpZnkoaVJlcykpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChfLmlzRXF1YWwoaVJlcy5yZXN1bHQsIHJlcy50dXBlbGFuc3dlcnNbaW5kZXggLSAxXSAmJiByZXMudHVwZWxhbnN3ZXJzW2luZGV4IC0gMV0ucmVzdWx0KSkge1xuICAgICAgICAgICAgZGVidWdsb2coJ3NraXAnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICByZXN1bHQuc29ydChjbXBCeVJhbmtpbmdUdXBlbCk7XG4gICAgcmV0dXJuIE9iamVjdC5hc3NpZ24ocmVzLCB7IHR1cGVsYW5zd2VyczogcmVzdWx0IH0pO1xufVxuZXhwb3J0cy5maWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHRUdXBlbCA9IGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdFR1cGVsO1xuLyoqXG4gKiBBIHJhbmtpbmcgd2hpY2ggaXMgcHVyZWx5IGJhc2VkIG9uIHRoZSBudW1iZXJzIG9mIG1hdGNoZWQgZW50aXRpZXMsXG4gKiBkaXNyZWdhcmRpbmcgZXhhY3RuZXNzIG9mIG1hdGNoXG4gKi9cbi8qXG5leHBvcnQgZnVuY3Rpb24gY2FsY1JhbmtpbmdTaW1wbGUobWF0Y2hlZDogbnVtYmVyLFxuICBtaXNtYXRjaGVkOiBudW1iZXIsIG5vdXNlOiBudW1iZXIsXG4gIHJlbGV2YW50Q291bnQ6IG51bWJlcik6IG51bWJlciB7XG4gIC8vIDIgOiAwXG4gIC8vIDEgOiAwXG4gIHZhciBmYWN0b3IgPSBtYXRjaGVkICogTWF0aC5wb3coMS41LCBtYXRjaGVkKSAqIE1hdGgucG93KDEuNSwgbWF0Y2hlZCk7XG4gIHZhciBmYWN0b3IyID0gTWF0aC5wb3coMC40LCBtaXNtYXRjaGVkKTtcbiAgdmFyIGZhY3RvcjMgPSBNYXRoLnBvdygwLjQsIG5vdXNlKTtcbiAgcmV0dXJuIE1hdGgucG93KGZhY3RvcjIgKiBmYWN0b3IgKiBmYWN0b3IzLCAxIC8gKG1pc21hdGNoZWQgKyBtYXRjaGVkICsgbm91c2UpKTtcbn1cbiovXG5mdW5jdGlvbiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCByZWxldmFudENvdW50LCBoYXNEb21haW4pIHtcbiAgICB2YXIgbGVuTWF0Y2hlZCA9IE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aDtcbiAgICB2YXIgZmFjdG9yID0gTWF0Y2guY2FsY1JhbmtpbmdQcm9kdWN0KG1hdGNoZWQpO1xuICAgIGZhY3RvciAqPSBNYXRoLnBvdygxLjUsIGxlbk1hdGNoZWQpO1xuICAgIGlmIChoYXNEb21haW4pIHtcbiAgICAgICAgZmFjdG9yICo9IDEuNTtcbiAgICB9XG4gICAgdmFyIGxlbkhhc0NhdGVnb3J5ID0gT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aDtcbiAgICB2YXIgZmFjdG9ySCA9IE1hdGgucG93KDEuMSwgbGVuSGFzQ2F0ZWdvcnkpO1xuICAgIHZhciBsZW5NaXNNYXRjaGVkID0gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoO1xuICAgIHZhciBmYWN0b3IyID0gTWF0Y2guY2FsY1JhbmtpbmdQcm9kdWN0KG1pc21hdGNoZWQpO1xuICAgIGZhY3RvcjIgKj0gTWF0aC5wb3coMC40LCBsZW5NaXNNYXRjaGVkKTtcbiAgICB2YXIgZGl2aXNvciA9IChsZW5NaXNNYXRjaGVkICsgbGVuSGFzQ2F0ZWdvcnkgKyBsZW5NYXRjaGVkKTtcbiAgICBkaXZpc29yID0gZGl2aXNvciA/IGRpdmlzb3IgOiAxO1xuICAgIHJldHVybiBNYXRoLnBvdyhmYWN0b3IyICogZmFjdG9ySCAqIGZhY3RvciwgMSAvIChkaXZpc29yKSk7XG59XG5leHBvcnRzLmNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkgPSBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5O1xuLyoqXG4gKiBsaXN0IGFsbCB0b3AgbGV2ZWwgcmFua2luZ3NcbiAqL1xuLypcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFJlY29yZHNIYXZpbmdDb250ZXh0KFxuICBwU2VudGVuY2VzOiBJTWF0Y2guSVByb2Nlc3NlZFNlbnRlbmNlcywgY2F0ZWdvcnk6IHN0cmluZywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+LFxuICBjYXRlZ29yeVNldDogeyBba2V5OiBzdHJpbmddOiBib29sZWFuIH0pXG4gIDogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzIHtcblxuICAvL2RlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZHMsIHVuZGVmaW5lZCwgMikpO1xuICB2YXIgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZDogSU1hdGNoLklSZWNvcmQpIHtcbiAgICByZXR1cm4gKHJlY29yZFtjYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkgJiYgKHJlY29yZFtjYXRlZ29yeV0gIT09IG51bGwpO1xuICB9KTtcbiAgdmFyIHJlcyA9IFtdO1xuICBkZWJ1Z2xvZyhcIk1hdGNoUmVjb3Jkc0hhdmluZ0NvbnRleHQgOiByZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCk7XG4gIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJzZW50ZW5jZXMgYXJlIDogXCIgKyBKU09OLnN0cmluZ2lmeShwU2VudGVuY2VzLCB1bmRlZmluZWQsIDIpKSA6IFwiLVwiKTtcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImNhdGVnb3J5IFwiICsgY2F0ZWdvcnkgKyBcIiBhbmQgY2F0ZWdvcnlzZXQgaXM6IFwiICsgSlNPTi5zdHJpbmdpZnkoY2F0ZWdvcnlTZXQsIHVuZGVmaW5lZCwgMikpIDogXCItXCIpO1xuICBpZiAocHJvY2Vzcy5lbnYuQUJPVF9GQVNUICYmIGNhdGVnb3J5U2V0KSB7XG4gICAgLy8gd2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbiBjYXRlZ29yaWVzIHByZXNlbnQgaW4gcmVjb3JkcyBmb3IgZG9tYWlucyB3aGljaCBjb250YWluIHRoZSBjYXRlZ29yeVxuICAgIC8vIHZhciBjYXRlZ29yeXNldCA9IE1vZGVsLmNhbGN1bGF0ZVJlbGV2YW50UmVjb3JkQ2F0ZWdvcmllcyh0aGVNb2RlbCxjYXRlZ29yeSk7XG4gICAgLy9rbm93aW5nIHRoZSB0YXJnZXRcbiAgICBwZXJmbG9nKFwiZ290IGNhdGVnb3J5c2V0IHdpdGggXCIgKyBPYmplY3Qua2V5cyhjYXRlZ29yeVNldCkubGVuZ3RoKTtcbiAgICB2YXIgZmwgPSAwO1xuICAgIHZhciBsZiA9IDA7XG4gICAgdmFyIGFTaW1wbGlmaWVkU2VudGVuY2VzID0gcFNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIHZhciBmV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICByZXR1cm4gIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCk7XG4gICAgICB9KTtcbiAgICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICByZXR1cm4gISFjYXRlZ29yeVNldFtvV29yZC5jYXRlZ29yeV0gfHwgV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpO1xuICAgICAgfSk7XG4gICAgICBmbCA9IGZsICsgb1NlbnRlbmNlLmxlbmd0aDtcbiAgICAgIGxmID0gbGYgKyByV29yZHMubGVuZ3RoO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICAgIGNudFJlbGV2YW50V29yZHM6IHJXb3Jkcy5sZW5ndGgsIC8vIG5vdCBhIGZpbGxlciAgLy8gdG8gYmUgY29tcGF0aWJsZSBpdCB3b3VsZCBiZSBmV29yZHNcbiAgICAgICAgcldvcmRzOiByV29yZHNcbiAgICAgIH07XG4gICAgfSk7XG4gICAgT2JqZWN0LmZyZWV6ZShhU2ltcGxpZmllZFNlbnRlbmNlcyk7XG4gICAgZGVidWdsb2coXCJwb3N0IHNpbXBsaWZ5IChyPVwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHM9XCIgKyBwU2VudGVuY2VzLnNlbnRlbmNlcy5sZW5ndGggKyBcIiBmbCBcIiArIGZsICsgXCItPlwiICsgbGYgKyBcIilcIik7XG4gICAgcGVyZmxvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgZmwgKyBcIi0+XCIgKyBsZiArIFwiKVwiKTtcbiAgICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICBhU2ltcGxpZmllZFNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgICAgdmFyIGhhc0NhdGVnb3J5ID0ge307XG4gICAgICAgIHZhciBtaXNtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gYVNlbnRlbmNlLmNudFJlbGV2YW50V29yZHM7XG4gICAgICAgIGFTZW50ZW5jZS5yV29yZHMuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgIG1hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZiAoV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1dvcmQpICYmIHJlY29yZFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgaGFzQ2F0ZWdvcnlbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSAxO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgICBpZiAoKE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aCArIE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5sZW5ndGgpID4gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoKSB7XG4gICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgc2VudGVuY2U6IGFTZW50ZW5jZS5vU2VudGVuY2UsXG4gICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICAgIHJlc3VsdDogcmVjb3JkW2NhdGVnb3J5XSxcbiAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgIH0pO1xuICAgIGRlYnVnbG9nKFwiaGVyZSBpbiB3ZWlyZFwiKTtcbiAgfSBlbHNlIHtcbiAgICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICBwU2VudGVuY2VzLnNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgICAgdmFyIGhhc0NhdGVnb3J5ID0ge307XG4gICAgICAgIHZhciBtaXNtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gMDtcbiAgICAgICAgYVNlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgaWYgKCFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpKSB7XG4gICAgICAgICAgICBjbnRSZWxldmFudFdvcmRzID0gY250UmVsZXZhbnRXb3JkcyArIDE7XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKSAmJiByZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgICAgaGFzQ2F0ZWdvcnlbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmICgoT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoICsgT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aCkgPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLFxuICAgICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgICByZXN1bHQ6IHJlY29yZFtjYXRlZ29yeV0sXG4gICAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KTtcbiAgfVxuICByZXMuc29ydChjbXBCeVJlc3VsdFRoZW5SYW5raW5nKTtcbiAgZGVidWdsb2coXCIgYWZ0ZXIgc29ydFwiICsgcmVzLmxlbmd0aCk7XG4gIHZhciByZXN1bHQgPSBPYmplY3QuYXNzaWduKHt9LCBwU2VudGVuY2VzLCB7IGFuc3dlcnM6IHJlcyB9KTtcbiAgcmV0dXJuIGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdChyZXN1bHQpO1xufVxuKi9cbi8qKlxuICogbGlzdCBhbGwgdG9wIGxldmVsIHJhbmtpbmdzXG4gKi9cbmZ1bmN0aW9uIG1hdGNoUmVjb3Jkc1R1cGVsSGF2aW5nQ29udGV4dChwU2VudGVuY2VzLCBjYXRlZ29yaWVzLCByZWNvcmRzLCBjYXRlZ29yeVNldCkge1xuICAgIHJldHVybiBtYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcyhwU2VudGVuY2VzLCBjYXRlZ29yaWVzLCByZWNvcmRzLCBjYXRlZ29yeVNldCk7XG59XG5leHBvcnRzLm1hdGNoUmVjb3Jkc1R1cGVsSGF2aW5nQ29udGV4dCA9IG1hdGNoUmVjb3Jkc1R1cGVsSGF2aW5nQ29udGV4dDtcbi8qXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hSZWNvcmRzKGFTZW50ZW5jZXM6IElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzLCBjYXRlZ29yeTogc3RyaW5nLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4pXG4gIDogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzIHtcbiAgLy8gaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgLy8gICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRzLCB1bmRlZmluZWQsIDIpKTtcbiAgLy8gfVxuICB2YXIgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZDogSU1hdGNoLklSZWNvcmQpIHtcbiAgICByZXR1cm4gKHJlY29yZFtjYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkgJiYgKHJlY29yZFtjYXRlZ29yeV0gIT09IG51bGwpO1xuICB9KTtcbiAgdmFyIHJlcyA9IFtdO1xuICBkZWJ1Z2xvZyhcInJlbGV2YW50IHJlY29yZHMgbnI6XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoKTtcbiAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgIGFTZW50ZW5jZXMuc2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fVxuICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gMDtcbiAgICAgIGFTZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICBpZiAoIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCkpIHtcbiAgICAgICAgICBjbnRSZWxldmFudFdvcmRzID0gY250UmVsZXZhbnRXb3JkcyArIDE7XG4gICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICYmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgaWYgKE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aCA+IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aCkge1xuICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgc2VudGVuY2U6IGFTZW50ZW5jZSxcbiAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgcmVzdWx0OiByZWNvcmRbY2F0ZWdvcnldLFxuICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZyhtYXRjaGVkLCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KVxuICB9KTtcbiAgcmVzLnNvcnQoY21wQnlSZXN1bHRUaGVuUmFua2luZyk7XG4gIHZhciByZXN1bHQgPSBPYmplY3QuYXNzaWduKHt9LCBhU2VudGVuY2VzLCB7IGFuc3dlcnM6IHJlcyB9KTtcbiAgcmV0dXJuIGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdChyZXN1bHQpO1xufVxuKi9cbi8qXG5mdW5jdGlvbiBtYWtlU2ltcGxpZmllZFNlbnRlbmNlc0NhdGVnb3J5U2V0KGFTZW50ZW5jZXM6IElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzLFxuICBjYXRlZ29yeVNldDogeyBba2V5OiBzdHJpbmddOiBib29sZWFuIH0sIHRyYWNrOiB7IGZsOiBudW1iZXIsIGxmOiBudW1iZXIgfVxuKToge1xuICBkb21haW5zOiBzdHJpbmdbXSxcbiAgb1NlbnRlbmNlOiBJTWF0Y2guSVNlbnRlbmNlLFxuICBjbnRSZWxldmFudFdvcmRzOiBudW1iZXIsXG4gIHJXb3JkczogSU1hdGNoLklXb3JkW11cbn1bXSB7XG4gIHJldHVybiBhU2VudGVuY2VzLnNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgIHZhciBhRG9tYWlucyA9IFtdIGFzIHN0cmluZ1tdO1xuICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcImRvbWFpblwiKSB7XG4gICAgICAgIGFEb21haW5zLnB1c2gob1dvcmQubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJtZXRhXCIpIHtcbiAgICAgICAgLy8gZS5nLiBkb21haW4gWFhYXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiAhIWNhdGVnb3J5U2V0W29Xb3JkLmNhdGVnb3J5XTtcbiAgICB9KTtcbiAgICB0cmFjay5mbCArPSBvU2VudGVuY2UubGVuZ3RoO1xuICAgIHRyYWNrLmxmICs9IHJXb3Jkcy5sZW5ndGg7XG4gICAgcmV0dXJuIHtcbiAgICAgIGRvbWFpbnM6IGFEb21haW5zLFxuICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLFxuICAgICAgcldvcmRzOiByV29yZHNcbiAgICB9O1xuICB9KTtcbn1cbiovXG5mdW5jdGlvbiBtYWtlU2ltcGxpZmllZFNlbnRlbmNlc0NhdGVnb3J5U2V0MihhU2VudGVuY2VzLCBjYXRlZ29yeVNldCwgdHJhY2spIHtcbiAgICByZXR1cm4gYVNlbnRlbmNlcy5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgdmFyIGFEb21haW5zID0gW107XG4gICAgICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcImRvbWFpblwiKSB7XG4gICAgICAgICAgICAgICAgYURvbWFpbnMucHVzaChvV29yZC5tYXRjaGVkU3RyaW5nKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgPT09IFwibWV0YVwiKSB7XG4gICAgICAgICAgICAgICAgLy8gZS5nLiBkb21haW4gWFhYXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcImNhdGVnb3J5XCIpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2F0ZWdvcnlTZXRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuICEhY2F0ZWdvcnlTZXRbb1dvcmQuY2F0ZWdvcnldO1xuICAgICAgICB9KTtcbiAgICAgICAgdHJhY2suZmwgKz0gb1NlbnRlbmNlLmxlbmd0aDtcbiAgICAgICAgdHJhY2subGYgKz0gcldvcmRzLmxlbmd0aDtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRvbWFpbnM6IGFEb21haW5zLFxuICAgICAgICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICAgICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLFxuICAgICAgICAgICAgcldvcmRzOiByV29yZHNcbiAgICAgICAgfTtcbiAgICB9KTtcbn1cbmZ1bmN0aW9uIG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzKGFTZW50ZW5jZXMsIHRyYWNrKSB7XG4gICAgcmV0dXJuIGFTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgIHZhciBkb21haW5zID0gW107XG4gICAgICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ID09PSBcImRvbWFpblwiKSB7XG4gICAgICAgICAgICAgICAgZG9tYWlucy5wdXNoKG9Xb3JkLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSA9PT0gXCJtZXRhXCIpIHtcbiAgICAgICAgICAgICAgICAvLyBlLmcuIGRvbWFpbiBYWFhcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0cmFjay5mbCArPSBvU2VudGVuY2UubGVuZ3RoO1xuICAgICAgICB0cmFjay5sZiArPSByV29yZHMubGVuZ3RoO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICAgICAgICBkb21haW5zOiBkb21haW5zLFxuICAgICAgICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCxcbiAgICAgICAgICAgIHJXb3JkczogcldvcmRzXG4gICAgICAgIH07XG4gICAgfSk7XG59XG5mdW5jdGlvbiBleHRyYWN0UmVzdWx0KGNhdGVnb3JpZXMsIHJlY29yZCkge1xuICAgIHJldHVybiBjYXRlZ29yaWVzLm1hcChmdW5jdGlvbiAoY2F0ZWdvcnkpIHsgcmV0dXJuIHJlY29yZFtjYXRlZ29yeV0gfHwgXCJuL2FcIjsgfSk7XG59XG5mdW5jdGlvbiBtYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcyhwU2VudGVuY2VzLCBjYXRlZ29yaWVzLCByZWNvcmRzLCBkb21haW5DYXRlZ29yeUZpbHRlcikge1xuICAgIC8vIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgLy8gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZHMsIHVuZGVmaW5lZCwgMikpO1xuICAgIC8vIH1cbiAgICBpZiAoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIgJiYgIWRvbWFpbkNhdGVnb3J5RmlsdGVyLmRvbWFpbnMpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwib2xkIGNhdGVnb3J5c1NFdCA/P1wiKTtcbiAgICB9XG4gICAgT2JqZWN0LmZyZWV6ZShkb21haW5DYXRlZ29yeUZpbHRlcik7XG4gICAgdmFyIGNhdGVnb3J5RiA9IGNhdGVnb3JpZXNbMF07XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcIm1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzIChyPVwiICsgKHJlY29yZHMgJiYgcmVjb3Jkcy5sZW5ndGgpXG4gICAgICAgICsgXCIgcz1cIiArIChwU2VudGVuY2VzICYmIHBTZW50ZW5jZXMuc2VudGVuY2VzICYmIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCkgKyBcIilcXG4gY2F0ZWdvcmllczpcIiArIChjYXRlZ29yaWVzICYmIGNhdGVnb3JpZXMuam9pbihcIlxcblwiKSkgKyBcIiBjYXRlZ29yeVNldDogXCJcbiAgICAgICAgKyAoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIgJiYgKHR5cGVvZiBkb21haW5DYXRlZ29yeUZpbHRlci5jYXRlZ29yeVNldCA9PT0gXCJvYmplY3RcIikgJiYgT2JqZWN0LmtleXMoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIuY2F0ZWdvcnlTZXQpLmpvaW4oXCJcXG5cIikpKSA6IFwiLVwiKTtcbiAgICBwZXJmbG9nKFwibWF0Y2hSZWNvcmRzUXVpY2tNdWx0IC4uLihyPVwiICsgcmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIpXCIpO1xuICAgIC8vY29uc29sZS5sb2coJ2NhdGVnb3JpZXMgJyArICBKU09OLnN0cmluZ2lmeShjYXRlZ29yaWVzKSk7XG4gICAgLy9jb25zb2xlLmxvZygnY2F0ZWdyb3lTZXQnICsgIEpTT04uc3RyaW5naWZ5KGNhdGVnb3J5U2V0KSk7XG4gICAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHM7XG4gICAgaWYgKGRvbWFpbkNhdGVnb3J5RmlsdGVyICYmIGRvbWFpbkNhdGVnb3J5RmlsdGVyLmRvbWFpbnMpIHtcbiAgICAgICAgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICAgICAgcmV0dXJuIChkb21haW5DYXRlZ29yeUZpbHRlci5kb21haW5zLmluZGV4T2YocmVjb3JkLl9kb21haW4pID49IDApO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLyogZWxzZSovIHtcbiAgICAgICAgcmVsZXZhbnRSZWNvcmRzID0gcmVsZXZhbnRSZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgICAgICByZXR1cm4gKHJlY29yZFtjYXRlZ29yeUZdICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnlGXSAhPT0gbnVsbCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICB2YXIgcmVzID0gW107XG4gICAgZGVidWdsb2coXCJyZWxldmFudCByZWNvcmRzIHdpdGggZmlyc3QgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIpXCIpO1xuICAgIHBlcmZsb2coXCJyZWxldmFudCByZWNvcmRzIHdpdGggZmlyc3QgbnI6XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgc2VudGVuY2VzIFwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoKTtcbiAgICBpZiAoZG9tYWluQ2F0ZWdvcnlGaWx0ZXIpIHtcbiAgICAgICAgLy8gd2UgYXJlIG9ubHkgaW50ZXJlc3RlZCBpbiBjYXRlZ29yaWVzIHByZXNlbnQgaW4gcmVjb3JkcyBmb3IgZG9tYWlucyB3aGljaCBjb250YWluIHRoZSBjYXRlZ29yeVxuICAgICAgICAvLyB2YXIgY2F0ZWdvcnlzZXQgPSBNb2RlbC5jYWxjdWxhdGVSZWxldmFudFJlY29yZENhdGVnb3JpZXModGhlTW9kZWwsY2F0ZWdvcnkpO1xuICAgICAgICAvL2tub3dpbmcgdGhlIHRhcmdldFxuICAgICAgICBwZXJmbG9nKFwiZ290IGNhdGVnb3J5c2V0IHdpdGggXCIgKyBPYmplY3Qua2V5cyhkb21haW5DYXRlZ29yeUZpbHRlci5jYXRlZ29yeVNldCkubGVuZ3RoKTtcbiAgICAgICAgdmFyIG9iaiA9IHsgZmw6IDAsIGxmOiAwIH07XG4gICAgICAgIHZhciBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IFtdO1xuICAgICAgICAvLyAgaWYgKHByb2Nlc3MuZW52LkFCT1RfQkVUMSkge1xuICAgICAgICBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzQ2F0ZWdvcnlTZXQyKHBTZW50ZW5jZXMsIGRvbWFpbkNhdGVnb3J5RmlsdGVyLmNhdGVnb3J5U2V0LCBvYmopO1xuICAgICAgICAvLyAgfSBlbHNlIHtcbiAgICAgICAgLy8gICAgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBtYWtlU2ltcGxpZmllZFNlbnRlbmNlc0NhdGVnb3J5U2V0KHBTZW50ZW5jZXMsIGNhdGVnb3J5U2V0LCBvYmopIGFzIGFueTtcbiAgICAgICAgLy8gIH1cbiAgICAgICAgcGVyZmxvZyhcInBvc3Qgc2ltcGxpZnkgKHI9XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoICsgXCIgcz1cIiArIHBTZW50ZW5jZXMuc2VudGVuY2VzLmxlbmd0aCArIFwiIGZsIFwiICsgb2JqLmZsICsgXCItPlwiICsgb2JqLmxmICsgXCIpXCIpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgZGVidWdsb2coXCJub3QgYWJvdF9mYXN0ICFcIik7XG4gICAgICAgIHZhciB0cmFjayA9IHsgZmw6IDAsIGxmOiAwIH07XG4gICAgICAgIHZhciBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IG1ha2VTaW1wbGlmaWVkU2VudGVuY2VzKHBTZW50ZW5jZXMsIHRyYWNrKTtcbiAgICAgICAgLypcbiAgICAgICAgICAgIHBTZW50ZW5jZXMuc2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIGZsID0gZmwgKyBvU2VudGVuY2UubGVuZ3RoO1xuICAgICAgICAgICAgICBsZiA9IGxmICsgcldvcmRzLmxlbmd0aDtcbiAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBvU2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgICAgICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgIHJXb3JkczogcldvcmRzXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICovXG4gICAgICAgIGRlYnVnbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyB0cmFjay5mbCArIFwiLT5cIiArIHRyYWNrLmxmICsgXCIpXCIpO1xuICAgICAgICBwZXJmbG9nKFwicG9zdCBzaW1wbGlmeSAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgZmwgXCIgKyB0cmFjay5mbCArIFwiLT5cIiArIHRyYWNrLmxmICsgXCIpXCIpO1xuICAgIH1cbiAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiaGVyZSBzaW1wbGlmaWVkIHNlbnRlbmNlcyBcIiArXG4gICAgICAgIGFTaW1wbGlmaWVkU2VudGVuY2VzLm1hcChmdW5jdGlvbiAobykgeyByZXR1cm4gXCJcXG5Eb21haW49XCIgKyBvLmRvbWFpbnMuam9pbihcIlxcblwiKSArIFwiXFxuXCIgKyBTZW50ZW5jZS5kdW1wTmljZShvLnJXb3Jkcyk7IH0pLmpvaW4oXCJcXG5cIikpIDogXCItXCIpO1xuICAgIC8vY29uc29sZS5sb2coXCJoZXJlIHJlY3JvZHNcIiArIHJlbGV2YW50UmVjb3Jkcy5tYXAoIChvLGluZGV4KSA9PiAgXCIgaW5kZXggPSBcIiArIGluZGV4ICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShvKSkuam9pbihcIlxcblwiKSk7XG4gICAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICBhU2ltcGxpZmllZFNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgICAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgICAgICAgIHZhciBpbWlzbWF0Y2hlZCA9IDA7XG4gICAgICAgICAgICB2YXIgaW1hdGNoZWQgPSAwO1xuICAgICAgICAgICAgdmFyIG5vdXNlID0gMDtcbiAgICAgICAgICAgIHZhciBmb3VuZGNhdCA9IDE7XG4gICAgICAgICAgICB2YXIgbWlzc2luZ2NhdCA9IDA7XG4gICAgICAgICAgICB2YXIgbWF0Y2hlZCA9IHt9O1xuICAgICAgICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fTtcbiAgICAgICAgICAgIHZhciBoYXNDYXRlZ29yeSA9IHt9O1xuICAgICAgICAgICAgYVNlbnRlbmNlLnJXb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gMDtcbiAgICAgICAgICAgICAgICBpZiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICArK2ltYXRjaGVkO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgKytpbWlzbWF0Y2hlZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICE9PSBcImNhdGVnb3J5XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vdXNlICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXJlY29yZFtvV29yZC5tYXRjaGVkU3RyaW5nXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pc3NpbmdjYXQgKz0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kY2F0ICs9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICYmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmIChXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCkgJiYgcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhc0NhdGVnb3J5W29Xb3JkLm1hdGNoZWRTdHJpbmddID0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoIVdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUT0RPIGJldHRlciB1bm1hY2h0ZWRcbiAgICAgICAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHZhciBtYXRjaGVkRG9tYWluID0gMDtcbiAgICAgICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gYVNlbnRlbmNlLnJXb3Jkcy5sZW5ndGg7XG4gICAgICAgICAgICBpZiAoYVNlbnRlbmNlLmRvbWFpbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlY29yZC5fZG9tYWluICE9PSBhU2VudGVuY2UuZG9tYWluc1swXSkge1xuICAgICAgICAgICAgICAgICAgICBpbWlzbWF0Y2hlZCA9IDMwMDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpbWF0Y2hlZCArPSAxO1xuICAgICAgICAgICAgICAgICAgICBtYXRjaGVkRG9tYWluICs9IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLyppZiAocHJvY2Vzcy5lbnYuQUJPVF9CRVQyKSB7XG4gICAgICAgICAgICAgICovXG4gICAgICAgICAgICB2YXIgbWF0Y2hlZExlbiA9IE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aCArIE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5sZW5ndGg7XG4gICAgICAgICAgICB2YXIgbWlzbWF0Y2hlZExlbiA9IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aDtcbiAgICAgICAgICAgIC8qICAgICAgIGlmKHJlY29yZC5UcmFuc2FjdGlvbkNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKCcgaGVyZSB0Y29kZSA6ICcgKyByZWNvcmQuVHJhbnNhY3Rpb25Db2RlKTtcbiAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgIGlmKHJlY29yZC5UcmFuc2FjdGlvbkNvZGUgPT09ICdTX0FMUl84NzAxMjM5NCcpIHtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcIlRFSE9ORSBhZGRpbmcgXCIgKyBleHRyYWN0UmVzdWx0KGNhdGVnb3JpZXMscmVjb3JkKS5qb2luKFwiO1wiKSk7XG4gICAgICAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKFwid2l0aCByYW5raW5nIDogXCIgKyBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5MihtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcywgbWF0Y2hlZERvbWFpbikpO1xuICAgICAgICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcIiBjcmVhdGVkIGJ5IFwiICsgT2JqZWN0LmtleXMobWF0Y2hlZCkubWFwKGtleSA9PiBcImtleTpcIiArIGtleVxuICAgICAgICAgICAgICAgICAgICAgICArIFwiXFxuXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkW2tleV0pKS5qb2luKFwiXFxuXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICsgXCJcXG5oYXNDYXQgXCIgKyBKU09OLnN0cmluZ2lmeShoYXNDYXRlZ29yeSlcbiAgICAgICAgICAgICAgICAgICAgICAgKyBcIlxcbm1pc21hdCBcIiArIEpTT04uc3RyaW5naWZ5KG1pc21hdGNoZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICsgXCJcXG5jblRyZWwgXCIgKyBKU09OLnN0cmluZ2lmeShjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICAgICAgICAgICAgICAgICArIFwiXFxubWF0Y2VkRG9tYWluIFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZERvbWFpbilcbiAgICAgICAgICAgICAgICAgICAgICAgKyBcIlxcbmhhc0NhdCBcIiArIE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KVxuICAgICAgICAgICAgICAgICAgICAgICArIFwiXFxubWlzbWF0IFwiICsgT2JqZWN0LmtleXMobWlzbWF0Y2hlZClcbiAgICAgICAgICAgICAgICAgICAgICAgKyBgXFxubWF0Y2hlZCAke09iamVjdC5rZXlzKG1hdGNoZWQpfSBcXG5oYXNjYXQgJHtPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkuam9pbihcIjsgXCIpfSBcXG5taXNtOiAke09iamVjdC5rZXlzKG1pc21hdGNoZWQpfSBcXG5gXG4gICAgICAgICAgICAgICAgICAgICAgICsgXCJcXG5tYXRjZWREb21haW4gXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkRG9tYWluKVxuICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICovXG4gICAgICAgICAgICBpZiAoKGltaXNtYXRjaGVkIDwgMzAwMClcbiAgICAgICAgICAgICAgICAmJiAoKG1hdGNoZWRMZW4gPiBtaXNtYXRjaGVkTGVuKVxuICAgICAgICAgICAgICAgICAgICB8fCAobWF0Y2hlZExlbiA9PT0gbWlzbWF0Y2hlZExlbiAmJiBtYXRjaGVkRG9tYWluID4gMCkpKSB7XG4gICAgICAgICAgICAgICAgLypcbiAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKFwiYWRkaW5nIFwiICsgZXh0cmFjdFJlc3VsdChjYXRlZ29yaWVzLHJlY29yZCkuam9pbihcIjtcIikpO1xuICAgICAgICAgICAgICAgICAgZGVidWdsb2coXCJ3aXRoIHJhbmtpbmcgOiBcIiArIGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkyKG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzLCBtYXRjaGVkRG9tYWluKSk7XG4gICAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcIiBjcmVhdGVkIGJ5IFwiICsgT2JqZWN0LmtleXMobWF0Y2hlZCkubWFwKGtleSA9PiBcImtleTpcIiArIGtleVxuICAgICAgICAgICAgICAgICAgKyBcIlxcblwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZFtrZXldKSkuam9pbihcIlxcblwiKVxuICAgICAgICAgICAgICAgICAgKyBcIlxcbmhhc0NhdCBcIiArIEpTT04uc3RyaW5naWZ5KGhhc0NhdGVnb3J5KVxuICAgICAgICAgICAgICAgICAgKyBcIlxcbm1pc21hdCBcIiArIEpTT04uc3RyaW5naWZ5KG1pc21hdGNoZWQpXG4gICAgICAgICAgICAgICAgICArIFwiXFxuY25UcmVsIFwiICsgSlNPTi5zdHJpbmdpZnkoY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgICAgICAgICAgICsgXCJcXG5tYXRjZWREb21haW4gXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkRG9tYWluKVxuICAgICAgICAgICAgICAgICAgKyBcIlxcbmhhc0NhdCBcIiArIE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KVxuICAgICAgICAgICAgICAgICAgKyBcIlxcbm1pc21hdCBcIiArIE9iamVjdC5rZXlzKG1pc21hdGNoZWQpXG4gICAgICAgICAgICAgICAgICArIGBcXG5tYXRjaGVkICR7T2JqZWN0LmtleXMobWF0Y2hlZCl9IFxcbmhhc2NhdCAke09iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5qb2luKFwiOyBcIil9IFxcbm1pc206ICR7T2JqZWN0LmtleXMobWlzbWF0Y2hlZCl9IFxcbmBcbiAgICAgICAgICAgICAgICAgICsgXCJcXG5tYXRjZWREb21haW4gXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkRG9tYWluKVxuICAgICAgXG4gICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB2YXIgcmVjID0ge1xuICAgICAgICAgICAgICAgICAgICBzZW50ZW5jZTogYVNlbnRlbmNlLm9TZW50ZW5jZSxcbiAgICAgICAgICAgICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3JpZXM6IGNhdGVnb3JpZXMsXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDogZXh0cmFjdFJlc3VsdChjYXRlZ29yaWVzLCByZWNvcmQpLFxuICAgICAgICAgICAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcywgbWF0Y2hlZERvbWFpbilcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJoZXJlIHJhbmtpbmdcIiArIHJlYy5fcmFua2luZylcbiAgICAgICAgICAgICAgICBpZiAoKHJlYy5fcmFua2luZyA9PT0gbnVsbCkgfHwgIXJlYy5fcmFua2luZykge1xuICAgICAgICAgICAgICAgICAgICByZWMuX3JhbmtpbmcgPSAwLjk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlcy5wdXNoKHJlYyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvKn0gZWxzZSB7XG4gICAgICAgICAgICAvLyBpZihtYXRjaGVkID4gMCB8fCBtaXNtYXRjaGVkID4gMCApIHtcbiAgICAgICAgICAgIC8vICAgY29uc29sZS5sb2coXCIgbVwiICsgbWF0Y2hlZCArIFwiIG1pc21hdGNoZWRcIiArIG1pc21hdGNoZWQpO1xuICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhU2VudGVuY2Uub1NlbnRlbmNlKSk7XG4gICAgICAgICAgICAgIGlmIChpbWF0Y2hlZCA+IGltaXNtYXRjaGVkKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlYyA9IHtcbiAgICAgICAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2Uub1NlbnRlbmNlLFxuICAgICAgICAgICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgICAgICAgICBjYXRlZ29yaWVzOiBjYXRlZ29yaWVzLFxuICAgICAgICAgICAgICAgICAgcmVzdWx0OiBleHRyYWN0UmVzdWx0KGNhdGVnb3JpZXMsIHJlY29yZCksXG4gICAgICAgICAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmdTaW1wbGUoaW1hdGNoZWQsIGltaXNtYXRjaGVkLCAobm91c2UgKyBtaXNzaW5nY2F0KSwgYVNlbnRlbmNlLmNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXMucHVzaChyZWMpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgfVxuICAgICAgICAgICAgICovXG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHBlcmZsb2coXCJzb3J0IChhPVwiICsgcmVzLmxlbmd0aCArIFwiKVwiKTtcbiAgICByZXMuc29ydChjbXBCeVJlc3VsdFRoZW5SYW5raW5nVHVwZWwpO1xuICAgIHBlcmZsb2coXCJNUlFNQyBmaWx0ZXJSZXRhaW4gLi4uXCIpO1xuICAgIHZhciByZXN1bHQxID0gT2JqZWN0LmFzc2lnbih7IHR1cGVsYW5zd2VyczogcmVzIH0sIHBTZW50ZW5jZXMpO1xuICAgIC8qZGVidWdsb2coXCJORVdNQVBcIiArIHJlcy5tYXAobyA9PiBcIlxcbnJhbmtcIiArIG8uX3JhbmtpbmcgKyBcIiA9PlwiXG4gICAgICAgICAgICAgICAgKyBvLnJlc3VsdC5qb2luKFwiXFxuXCIpKS5qb2luKFwiXFxuXCIpKTsgKi9cbiAgICB2YXIgcmVzdWx0MiA9IGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdFR1cGVsKHJlc3VsdDEpO1xuICAgIHBlcmZsb2coXCJNUlFNQyBtYXRjaFJlY29yZHNRdWljayBkb25lOiAocj1cIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGggKyBcIiBzPVwiICsgcFNlbnRlbmNlcy5zZW50ZW5jZXMubGVuZ3RoICsgXCIgYT1cIiArIHJlcy5sZW5ndGggKyBcIilcIik7XG4gICAgcmV0dXJuIHJlc3VsdDI7XG59XG5leHBvcnRzLm1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzID0gbWF0Y2hSZWNvcmRzUXVpY2tNdWx0aXBsZUNhdGVnb3JpZXM7XG5mdW5jdGlvbiBjbGFzc2lmeVdvcmRXaXRoVGFyZ2V0Q2F0ZWdvcnkod29yZCwgdGFyZ2V0Y2F0ZWdvcnksIHJ1bGVzLCB3aG9sZXNlbnRlbmNlKSB7XG4gICAgLy9jb25zb2xlLmxvZyhcImNsYXNzaWZ5IFwiICsgd29yZCArIFwiIFwiICArIHRhcmdldGNhdGVnb3J5KTtcbiAgICB2YXIgY2F0cyA9IElucHV0RmlsdGVyLmNhdGVnb3JpemVBV29yZCh3b3JkLCBydWxlcywgd2hvbGVzZW50ZW5jZSwge30pO1xuICAgIC8vIFRPRE8gcXVhbGlmeVxuICAgIGNhdHMgPSBjYXRzLmZpbHRlcihmdW5jdGlvbiAoY2F0KSB7XG4gICAgICAgIHJldHVybiBjYXQuY2F0ZWdvcnkgPT09IHRhcmdldGNhdGVnb3J5O1xuICAgIH0pO1xuICAgIC8vZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoY2F0cykpO1xuICAgIGlmIChjYXRzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gY2F0c1swXS5tYXRjaGVkU3RyaW5nO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGFuYWx5emVDYXRlZ29yeShjYXRlZ29yeXdvcmQsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlKSB7XG4gICAgcmV0dXJuIGNsYXNzaWZ5V29yZFdpdGhUYXJnZXRDYXRlZ29yeShjYXRlZ29yeXdvcmQsICdjYXRlZ29yeScsIHJ1bGVzLCB3aG9sZXNlbnRlbmNlKTtcbn1cbmV4cG9ydHMuYW5hbHl6ZUNhdGVnb3J5ID0gYW5hbHl6ZUNhdGVnb3J5O1xuZnVuY3Rpb24gc3BsaXRBdENvbW1hQW5kKHN0cikge1xuICAgIHZhciByID0gc3RyLnNwbGl0KC8oXFxiYW5kXFxiKXxbLF0vKTtcbiAgICByID0gci5maWx0ZXIoZnVuY3Rpb24gKG8sIGluZGV4KSB7XG4gICAgICAgIGlmIChpbmRleCAlIDIgPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gICAgdmFyIHJ0cmltbWVkID0gci5tYXAoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBTdHJpbmcobykudHJpbSgpO1xuICAgIH0pO1xuICAgIHJldHVybiBydHJpbW1lZDtcbn1cbmV4cG9ydHMuc3BsaXRBdENvbW1hQW5kID0gc3BsaXRBdENvbW1hQW5kO1xuLyoqXG4gKiBBIHNpbXBsZSBpbXBsZW1lbnRhdGlvbiwgc3BsaXR0aW5nIGF0IGFuZCBhbmQgLFxuICovXG5mdW5jdGlvbiBhbmFseXplQ2F0ZWdvcnlNdWx0T25seUFuZENvbW1hKGNhdGVnb3J5bGlzdCwgcnVsZXMsIHdob2xlc2VudGVuY2UpIHtcbiAgICB2YXIgcnRyaW1tZWQgPSBzcGxpdEF0Q29tbWFBbmQoY2F0ZWdvcnlsaXN0KTtcbiAgICB2YXIgcmNhdCA9IHJ0cmltbWVkLm1hcChmdW5jdGlvbiAobykge1xuICAgICAgICByZXR1cm4gYW5hbHl6ZUNhdGVnb3J5KG8sIHJ1bGVzLCB3aG9sZXNlbnRlbmNlKTtcbiAgICB9KTtcbiAgICBpZiAocmNhdC5pbmRleE9mKHVuZGVmaW5lZCkgPj0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1wiJyArIHJ0cmltbWVkW3JjYXQuaW5kZXhPZih1bmRlZmluZWQpXSArICdcIiBpcyBub3QgYSBjYXRlZ29yeSEnKTtcbiAgICB9XG4gICAgcmV0dXJuIHJjYXQ7XG59XG5leHBvcnRzLmFuYWx5emVDYXRlZ29yeU11bHRPbmx5QW5kQ29tbWEgPSBhbmFseXplQ2F0ZWdvcnlNdWx0T25seUFuZENvbW1hO1xuZnVuY3Rpb24gZmlsdGVyQWNjZXB0aW5nT25seShyZXMsIGNhdGVnb3JpZXMpIHtcbiAgICByZXR1cm4gcmVzLmZpbHRlcihmdW5jdGlvbiAoYVNlbnRlbmNlLCBpSW5kZXgpIHtcbiAgICAgICAgcmV0dXJuIGFTZW50ZW5jZS5ldmVyeShmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICAgIHJldHVybiBjYXRlZ29yaWVzLmluZGV4T2Yob1dvcmQuY2F0ZWdvcnkpID49IDA7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuZXhwb3J0cy5maWx0ZXJBY2NlcHRpbmdPbmx5ID0gZmlsdGVyQWNjZXB0aW5nT25seTtcbnZhciBFcmJhc2UgPSByZXF1aXJlKFwiLi9lcmJhc2VcIik7XG5mdW5jdGlvbiBwcm9jZXNzU3RyaW5nKHF1ZXJ5LCBydWxlcykge1xuICAgIC8vICBpZiAoIXByb2Nlc3MuZW52LkFCT1RfT0xETUFUQ0gpIHtcbiAgICByZXR1cm4gRXJiYXNlLnByb2Nlc3NTdHJpbmcocXVlcnksIHJ1bGVzLCBydWxlcy53b3JkQ2FjaGUpO1xuICAgIC8vICB9XG4gICAgLypcbiAgICAgIHZhciBtYXRjaGVkID0gSW5wdXRGaWx0ZXIuYW5hbHl6ZVN0cmluZyhxdWVyeSwgcnVsZXMsIHNXb3Jkcyk7XG4gICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcIkFmdGVyIG1hdGNoZWQgXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkKSk7XG4gICAgICB9XG4gICAgICB2YXIgYVNlbnRlbmNlcyA9IElucHV0RmlsdGVyLmV4cGFuZE1hdGNoQXJyKG1hdGNoZWQpO1xuICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCJhZnRlciBleHBhbmRcIiArIGFTZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICAgICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgICB9XG4gICAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBJbnB1dEZpbHRlci5yZWluRm9yY2UoYVNlbnRlbmNlcyk7XG4gICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcImFmdGVyIHJlaW5mb3JjZVwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICAgICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICBlcnJvcnM6IFtdLFxuICAgICAgICBzZW50ZW5jZXM6IGFTZW50ZW5jZXNSZWluZm9yY2VkXG4gICAgICB9IGFzIElNYXRjaC5JUHJvY2Vzc2VkU2VudGVuY2VzO1xuICAgICovXG59XG5leHBvcnRzLnByb2Nlc3NTdHJpbmcgPSBwcm9jZXNzU3RyaW5nO1xuZnVuY3Rpb24gYW5hbHl6ZUNvbnRleHRTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcykge1xuICAgIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IHByb2Nlc3NTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcyk7XG4gICAgLy8gd2UgbGltaXQgYW5hbHlzaXMgdG8gbiBzZW50ZW5jZXNcbiAgICBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMgPSBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMuc2xpY2UoMCwgQWxnb2wuQ3V0b2ZmX1NlbnRlbmNlcyk7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCJhZnRlciByZWluZm9yY2UgYW5kIGN1dG9mZlwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLmxlbmd0aCArIFwiXFxuXCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgICAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgICB9XG4gICAgcmV0dXJuIGFTZW50ZW5jZXNSZWluZm9yY2VkO1xufVxuZXhwb3J0cy5hbmFseXplQ29udGV4dFN0cmluZyA9IGFuYWx5emVDb250ZXh0U3RyaW5nO1xuZnVuY3Rpb24gY21wQnlOckNhdGVnb3JpZXNBbmRTYW1lRG9tYWluKGEsIGIpIHtcbiAgICAvL2NvbnNvbGUubG9nKFwiY29tcGFyZSBhXCIgKyBhICsgXCIgY250YiBcIiArIGIpO1xuICAgIHZhciBjbnRhID0gU2VudGVuY2UuZ2V0RGlzdGluY3RDYXRlZ29yaWVzSW5TZW50ZW5jZShhKS5sZW5ndGg7XG4gICAgdmFyIGNudGIgPSBTZW50ZW5jZS5nZXREaXN0aW5jdENhdGVnb3JpZXNJblNlbnRlbmNlKGIpLmxlbmd0aDtcbiAgICAvKlxuICAgICAgdmFyIGNudGEgPSBhLnJlZHVjZShmdW5jdGlvbihwcmV2LCBvV29yZCkge1xuICAgICAgICByZXR1cm4gcHJldiArICgob1dvcmQuY2F0ZWdvcnkgPT09IFwiY2F0ZWdvcnlcIik/IDEgOiAwKTtcbiAgICAgIH0sMCk7XG4gICAgICB2YXIgY250YiA9IGIucmVkdWNlKGZ1bmN0aW9uKHByZXYsIG9Xb3JkKSB7XG4gICAgICAgIHJldHVybiBwcmV2ICsgKChvV29yZC5jYXRlZ29yeSA9PT0gXCJjYXRlZ29yeVwiKT8gMSA6IDApO1xuICAgICAgfSwwKTtcbiAgICAgLy8gY29uc29sZS5sb2coXCJjbnQgYVwiICsgY250YSArIFwiIGNudGIgXCIgKyBjbnRiKTtcbiAgICAgKi9cbiAgICByZXR1cm4gY250YiAtIGNudGE7XG59XG5leHBvcnRzLmNtcEJ5TnJDYXRlZ29yaWVzQW5kU2FtZURvbWFpbiA9IGNtcEJ5TnJDYXRlZ29yaWVzQW5kU2FtZURvbWFpbjtcbmZ1bmN0aW9uIGFuYWx5emVDYXRlZ29yeU11bHQoY2F0ZWdvcnlsaXN0LCBydWxlcywgd2hvbGVzZW50ZW5jZSwgZ1dvcmRzKSB7XG4gICAgdmFyIHJlcyA9IGFuYWx5emVDb250ZXh0U3RyaW5nKGNhdGVnb3J5bGlzdCwgcnVsZXMpO1xuICAgIC8vICBkZWJ1Z2xvZyhcInJlc3VsdGluZyBjYXRlZ29yeSBzZW50ZW5jZXNcIiwgSlNPTi5zdHJpbmdpZnkocmVzKSk7XG4gICAgdmFyIHJlczIgPSBmaWx0ZXJBY2NlcHRpbmdPbmx5KHJlcy5zZW50ZW5jZXMsIFtcImNhdGVnb3J5XCIsIFwiZmlsbGVyXCJdKTtcbiAgICAvLyAgY29uc29sZS5sb2coXCJoZXJlIHJlczJcIiArIEpTT04uc3RyaW5naWZ5KHJlczIpICk7XG4gICAgLy8gIGNvbnNvbGUubG9nKFwiaGVyZSB1bmRlZmluZWQgISArIFwiICsgcmVzMi5maWx0ZXIobyA9PiAhbykubGVuZ3RoKTtcbiAgICByZXMyLnNvcnQoU2VudGVuY2UuY21wUmFua2luZ1Byb2R1Y3QpO1xuICAgIGRlYnVnbG9nKFwicmVzdWx0aW5nIGNhdGVnb3J5IHNlbnRlbmNlczogXFxuXCIsIGRlYnVnbG9nLmVuYWJsZWQgPyAoU2VudGVuY2UuZHVtcE5pY2VBcnIocmVzMi5zbGljZSgwLCAzKSwgU2VudGVuY2UucmFua2luZ1Byb2R1Y3QpKSA6ICctJyk7XG4gICAgLy8gVE9ETzogICByZXMyID0gZmlsdGVyQWNjZXB0aW5nT25seVNhbWVEb21haW4ocmVzMik7XG4gICAgLy9kZWJ1Z2xvZyhcInJlc3VsdGluZyBjYXRlZ29yeSBzZW50ZW5jZXNcIiwgSlNPTi5zdHJpbmdpZnkocmVzMiwgdW5kZWZpbmVkLCAyKSk7XG4gICAgLy8gZXhwZWN0IG9ubHkgY2F0ZWdvcmllc1xuICAgIC8vIHdlIGNvdWxkIHJhbmsgbm93IGJ5IGNvbW1vbiBkb21haW5zICwgYnV0IGZvciBub3cgd2Ugb25seSB0YWtlIHRoZSBmaXJzdCBvbmVcbiAgICBpZiAoIXJlczIubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIC8vcmVzLnNvcnQoY21wQnlOckNhdGVnb3JpZXNBbmRTYW1lRG9tYWluKTtcbiAgICB2YXIgcmVzY2F0ID0gU2VudGVuY2UuZ2V0RGlzdGluY3RDYXRlZ29yaWVzSW5TZW50ZW5jZShyZXMyWzBdKTtcbiAgICByZXR1cm4gcmVzY2F0O1xuICAgIC8vIFwiXCIgcmV0dXJuIHJlc1swXS5maWx0ZXIoKVxuICAgIC8vIHJldHVybiBjbGFzc2lmeVdvcmRXaXRoVGFyZ2V0Q2F0ZWdvcnkoY2F0ZWdvcnlsaXN0LCAnY2F0ZWdvcnknLCBydWxlcywgd2hvbGVzZW50ZW5jZSk7XG59XG5leHBvcnRzLmFuYWx5emVDYXRlZ29yeU11bHQgPSBhbmFseXplQ2F0ZWdvcnlNdWx0O1xuZnVuY3Rpb24gYW5hbHl6ZU9wZXJhdG9yKG9wd29yZCwgcnVsZXMsIHdob2xlc2VudGVuY2UpIHtcbiAgICByZXR1cm4gY2xhc3NpZnlXb3JkV2l0aFRhcmdldENhdGVnb3J5KG9wd29yZCwgJ29wZXJhdG9yJywgcnVsZXMsIHdob2xlc2VudGVuY2UpO1xufVxuZXhwb3J0cy5hbmFseXplT3BlcmF0b3IgPSBhbmFseXplT3BlcmF0b3I7XG52YXIgRXJFcnJvciA9IHJlcXVpcmUoXCIuL2VyZXJyb3JcIik7XG52YXIgTGlzdEFsbCA9IHJlcXVpcmUoXCIuL2xpc3RhbGxcIik7XG4vLyBjb25zdCByZXN1bHQgPSBXaGF0SXMucmVzb2x2ZUNhdGVnb3J5KGNhdCwgYTEuZW50aXR5LFxuLy8gICB0aGVNb2RlbC5tUnVsZXMsIHRoZU1vZGVsLnRvb2xzLCB0aGVNb2RlbC5yZWNvcmRzKTtcbmZ1bmN0aW9uIHJlc29sdmVDYXRlZ29yeShjYXRlZ29yeSwgY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcywgcmVjb3Jkcykge1xuICAgIGlmIChjb250ZXh0UXVlcnlTdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB7IGVycm9yczogW0VyRXJyb3IubWFrZUVycm9yX0VNUFRZX0lOUFVUKCldLCB0b2tlbnM6IFtdLCBhbnN3ZXJzOiBbXSB9O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgLypcbiAgICAgICAgICAgIHZhciBtYXRjaGVkID0gSW5wdXRGaWx0ZXIuYW5hbHl6ZVN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKTtcbiAgICAgICAgICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJhZnRlciBtYXRjaGVkIFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZCkpOiAnLScpO1xuICAgICAgICAgICAgdmFyIGFTZW50ZW5jZXMgPSBJbnB1dEZpbHRlci5leHBhbmRNYXRjaEFycihtYXRjaGVkKTtcbiAgICAgICAgICAgIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgZGVidWdsb2coXCJhZnRlciBleHBhbmRcIiArIGFTZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICAgICAgICAgICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgICAgICAgfSAqL1xuICAgICAgICAvLyB2YXIgY2F0ZWdvcnlTZXQgPSBNb2RlbC5nZXRBbGxSZWNvcmRDYXRlZ29yaWVzRm9yVGFyZ2V0Q2F0ZWdvcnkodGhlTW9kZWwsIGNhdCwgdHJ1ZSk7XG4gICAgICAgIHZhciByZXMgPSBMaXN0QWxsLmxpc3RBbGxXaXRoQ29udGV4dChjYXRlZ29yeSwgY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcywgcmVjb3Jkcyk7XG4gICAgICAgIC8vKiBzb3J0IGJ5IHNlbnRlbmNlXG4gICAgICAgIHJlcy5hbnN3ZXJzLmZvckVhY2goZnVuY3Rpb24gKG8pIHsgby5fcmFua2luZyA9IG8uX3JhbmtpbmcgKiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvLnNlbnRlbmNlKTsgfSk7XG4gICAgICAgIHJlcy5hbnN3ZXJzLnNvcnQoY21wQnlSYW5raW5nKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG59XG5leHBvcnRzLnJlc29sdmVDYXRlZ29yeSA9IHJlc29sdmVDYXRlZ29yeTtcbmZ1bmN0aW9uIHJlc29sdmVDYXRlZ29yaWVzKGNhdGVnb3JpZXMsIGNvbnRleHRRdWVyeVN0cmluZywgdGhlTW9kZWwpIHtcbiAgICB2YXIgcmVjb3JkcyA9IHRoZU1vZGVsLnJlY29yZHM7XG4gICAgdmFyIHJ1bGVzID0gdGhlTW9kZWwucnVsZXM7XG4gICAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGVycm9yczogW0VyRXJyb3IubWFrZUVycm9yX0VNUFRZX0lOUFVUKCldLFxuICAgICAgICAgICAgdHVwZWxhbnN3ZXJzOiBbXSxcbiAgICAgICAgICAgIHRva2VuczogW11cbiAgICAgICAgfTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIC8vIHZhciBjYXRlZ29yeVNldCA9IE1vZGVsLmdldEFsbFJlY29yZENhdGVnb3JpZXNGb3JUYXJnZXRDYXRlZ29yeSh0aGVNb2RlbCwgY2F0LCB0cnVlKTtcbiAgICAgICAgdmFyIHJlcyA9IExpc3RBbGwubGlzdEFsbFR1cGVsV2l0aENvbnRleHQoY2F0ZWdvcmllcywgY29udGV4dFF1ZXJ5U3RyaW5nLCBydWxlcywgcmVjb3Jkcyk7XG4gICAgICAgIC8vKiBzb3J0IGJ5IHNlbnRlbmNlXG4gICAgICAgIHJlcy50dXBlbGFuc3dlcnMuZm9yRWFjaChmdW5jdGlvbiAobykgeyBvLl9yYW5raW5nID0gby5fcmFua2luZyAqIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG8uc2VudGVuY2UpOyB9KTtcbiAgICAgICAgcmVzLnR1cGVsYW5zd2Vycy5zb3J0KGNtcEJ5UmFua2luZ1R1cGVsKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG59XG5leHBvcnRzLnJlc29sdmVDYXRlZ29yaWVzID0gcmVzb2x2ZUNhdGVnb3JpZXM7XG5mdW5jdGlvbiBmaWx0ZXJPbmx5VG9wUmFua2VkKHJlc3VsdHMpIHtcbiAgICB2YXIgcmVzID0gcmVzdWx0cy5maWx0ZXIoZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICBpZiAoc2FmZUVxdWFsKHJlc3VsdC5fcmFua2luZywgcmVzdWx0c1swXS5fcmFua2luZykpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXN1bHQuX3JhbmtpbmcgPj0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTGlzdCB0byBmaWx0ZXIgbXVzdCBiZSBvcmRlcmVkXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5maWx0ZXJPbmx5VG9wUmFua2VkID0gZmlsdGVyT25seVRvcFJhbmtlZDtcbmZ1bmN0aW9uIGZpbHRlck9ubHlUb3BSYW5rZWRUdXBlbChyZXN1bHRzKSB7XG4gICAgdmFyIHJlcyA9IHJlc3VsdHMuZmlsdGVyKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgaWYgKHNhZmVFcXVhbChyZXN1bHQuX3JhbmtpbmcsIHJlc3VsdHNbMF0uX3JhbmtpbmcpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0Ll9yYW5raW5nID49IHJlc3VsdHNbMF0uX3JhbmtpbmcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkxpc3QgdG8gZmlsdGVyIG11c3QgYmUgb3JkZXJlZFwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZmlsdGVyT25seVRvcFJhbmtlZFR1cGVsID0gZmlsdGVyT25seVRvcFJhbmtlZFR1cGVsO1xuZnVuY3Rpb24gaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdChyZXN1bHRzKSB7XG4gICAgdmFyIGNudCA9IHJlc3VsdHMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCByZXN1bHQpIHtcbiAgICAgICAgaWYgKHNhZmVFcXVhbChyZXN1bHQuX3JhbmtpbmcsIHJlc3VsdHNbMF0uX3JhbmtpbmcpKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICB9LCAwKTtcbiAgICBpZiAoY250ID4gMSkge1xuICAgICAgICAvLyBzZWFyY2ggZm9yIGEgZGlzY3JpbWluYXRpbmcgY2F0ZWdvcnkgdmFsdWVcbiAgICAgICAgdmFyIGRpc2NyaW1pbmF0aW5nID0gT2JqZWN0LmtleXMocmVzdWx0c1swXS5yZWNvcmQpLnJlZHVjZShmdW5jdGlvbiAocHJldiwgY2F0ZWdvcnkpIHtcbiAgICAgICAgICAgIGlmICgoY2F0ZWdvcnkuY2hhckF0KDApICE9PSAnXycgJiYgY2F0ZWdvcnkgIT09IHJlc3VsdHNbMF0uY2F0ZWdvcnkpXG4gICAgICAgICAgICAgICAgJiYgKHJlc3VsdHNbMF0ucmVjb3JkW2NhdGVnb3J5XSAhPT0gcmVzdWx0c1sxXS5yZWNvcmRbY2F0ZWdvcnldKSkge1xuICAgICAgICAgICAgICAgIHByZXYucHVzaChjYXRlZ29yeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcHJldjtcbiAgICAgICAgfSwgW10pO1xuICAgICAgICBpZiAoZGlzY3JpbWluYXRpbmcubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJNYW55IGNvbXBhcmFibGUgcmVzdWx0cywgcGVyaGFwcyB5b3Ugd2FudCB0byBzcGVjaWZ5IGEgZGlzY3JpbWluYXRpbmcgXCIgKyBkaXNjcmltaW5hdGluZy5qb2luKCcsJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICdZb3VyIHF1ZXN0aW9uIGRvZXMgbm90IGhhdmUgYSBzcGVjaWZpYyBhbnN3ZXInO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xufVxuZXhwb3J0cy5pc0luZGlzY3JpbWluYXRlUmVzdWx0ID0gaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdDtcbmZ1bmN0aW9uIGlzSW5kaXNjcmltaW5hdGVSZXN1bHRUdXBlbChyZXN1bHRzKSB7XG4gICAgdmFyIGNudCA9IHJlc3VsdHMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCByZXN1bHQpIHtcbiAgICAgICAgaWYgKHNhZmVFcXVhbChyZXN1bHQuX3JhbmtpbmcsIHJlc3VsdHNbMF0uX3JhbmtpbmcpKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICB9LCAwKTtcbiAgICBpZiAoY250ID4gMSkge1xuICAgICAgICAvLyBzZWFyY2ggZm9yIGEgZGlzY3JpbWluYXRpbmcgY2F0ZWdvcnkgdmFsdWVcbiAgICAgICAgdmFyIGRpc2NyaW1pbmF0aW5nID0gT2JqZWN0LmtleXMocmVzdWx0c1swXS5yZWNvcmQpLnJlZHVjZShmdW5jdGlvbiAocHJldiwgY2F0ZWdvcnkpIHtcbiAgICAgICAgICAgIGlmICgoY2F0ZWdvcnkuY2hhckF0KDApICE9PSAnXycgJiYgcmVzdWx0c1swXS5jYXRlZ29yaWVzLmluZGV4T2YoY2F0ZWdvcnkpIDwgMClcbiAgICAgICAgICAgICAgICAmJiAocmVzdWx0c1swXS5yZWNvcmRbY2F0ZWdvcnldICE9PSByZXN1bHRzWzFdLnJlY29yZFtjYXRlZ29yeV0pKSB7XG4gICAgICAgICAgICAgICAgcHJldi5wdXNoKGNhdGVnb3J5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwcmV2O1xuICAgICAgICB9LCBbXSk7XG4gICAgICAgIGlmIChkaXNjcmltaW5hdGluZy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBcIk1hbnkgY29tcGFyYWJsZSByZXN1bHRzLCBwZXJoYXBzIHlvdSB3YW50IHRvIHNwZWNpZnkgYSBkaXNjcmltaW5hdGluZyBcIiArIGRpc2NyaW1pbmF0aW5nLmpvaW4oJywnKSArICcgb3IgdXNlIFwibGlzdCBhbGwgLi4uXCInO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnWW91ciBxdWVzdGlvbiBkb2VzIG5vdCBoYXZlIGEgc3BlY2lmaWMgYW5zd2VyJztcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbmV4cG9ydHMuaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdFR1cGVsID0gaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdFR1cGVsO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
