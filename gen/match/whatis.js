"use strict";
/**
 *
 * @module jfseb.fdevstart.analyze
 * @file analyze.ts
 * @copyright (c) 2016 Gerd Forstmann
 */
Object.defineProperty(exports, "__esModule", { value: true });
const abot_erbase_1 = require("abot_erbase");
const debug = require("debug");
var debuglog = debug('whatis');
var debuglogV = debug('whatVis');
var perflog = debug('perf');
const abot_erbase_2 = require("abot_erbase");
const abot_erbase_3 = require("abot_erbase");
function mockDebug(o) {
    debuglog = o;
    debuglogV = o;
    perflog = o;
}
exports.mockDebug = mockDebug;
const _ = require("lodash");
const Match = require("./match");
const abot_erbase_4 = require("abot_erbase");
const abot_erbase_5 = require("abot_erbase");
const Algol = require("./algol");
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
        push: function (s) { this.s = this.s + s; }
    };
    var s = `**Result for category: ${answer.category} is ${answer.result}
 rank: ${answer._ranking}
`;
    result.push(s);
    Object.keys(answer.record).forEach(function (sRequires, index) {
        if (sRequires.charAt(0) !== '_') {
            result.push(`record: ${sRequires} -> ${answer.record[sRequires]}`);
        }
        result.push('\n');
    });
    var oSentence = answer.sentence;
    oSentence.forEach(function (oWord, index) {
        var sWord = `[${index}] : ${oWord.category} "${oWord.string}" => "${oWord.matchedString}"`;
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
    var s = `**Result for categories: ${answer.categories.join(";")} is ${answer.result}
 rank: ${answer._ranking}
`;
    result.push(s);
    Object.keys(answer.record).forEach(function (sRequires, index) {
        if (sRequires.charAt(0) !== '_') {
            result.push(`record: ${sRequires} -> ${answer.record[sRequires]}`);
        }
        result.push('\n');
    });
    var oSentence = answer.sentence;
    oSentence.forEach(function (oWord, index) {
        var sWord = `[${index}] : ${oWord.category} "${oWord.string}" => "${oWord.matchedString}"`;
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
    var divisor = (lenMisMatched + lenHasCategory + lenMatched);
    divisor = divisor ? divisor : 1;
    return Math.pow(factor2 * factorH * factor, 1 / (divisor));
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
    return categories.map(function (category) { return record[category] || "n/a"; });
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
    debuglog(debuglog.enabled ? ("matchRecordsQuickMultipleCategories (r=" + (records && records.length)
        + " s=" + (pSentences && pSentences.sentences && pSentences.sentences.length) + ")\n categories:" + (categories && categories.join("\n")) + " categorySet: "
        + (domainCategoryFilter && (typeof domainCategoryFilter.categorySet === "object") && Object.keys(domainCategoryFilter.categorySet).join("\n"))) : "-");
    perflog("matchRecordsQuickMult ...(r=" + records.length + " s=" + pSentences.sentences.length + ")");
    //console.log('categories ' +  JSON.stringify(categories));
    //console.log('categroySet' +  JSON.stringify(categorySet));
    var relevantRecords = records;
    if (domainCategoryFilter && domainCategoryFilter.domains) {
        relevantRecords = records.filter(function (record) {
            return (domainCategoryFilter.domains.indexOf(record._domain) >= 0);
        });
    }
    else {
        relevantRecords = relevantRecords.filter(function (record) {
            return !categories.every(cat => (record[cat] === undefined) || (record[cat] === null));
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
    }
    else {
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
    debuglog(debuglog.enabled ? ("here simplified sentences " +
        aSimplifiedSentences.map(o => "\nDomain=" + o.domains.join("\n") + "\n" + abot_erbase_4.Sentence.dumpNice(o.rWords)).join("\n")) : "-");
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
                    }
                    else {
                        ++imismatched;
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
                        else {
                            foundcat += 1;
                        }
                    }
                }
                if (oWord.category && (record[oWord.category] !== undefined)) {
                    if (oWord.matchedString === record[oWord.category]) {
                        matched[oWord.category] = oWord;
                    }
                    else {
                        mismatched[oWord.category] = oWord;
                    }
                }
                else if (abot_erbase_5.Word.Word.isCategory(oWord) && record[oWord.matchedString]) {
                    hasCategory[oWord.matchedString] = 1;
                }
                else if (!abot_erbase_5.Word.Word.isCategory(oWord)) {
                    // TODO better unmachted
                    mismatched[oWord.category] = oWord;
                }
            });
            var matchedDomain = 0;
            var cntRelevantWords = aSentence.rWords.length;
            if (aSentence.domains.length) {
                if (record._domain !== aSentence.domains[0]) {
                    imismatched = 3000;
                }
                else {
                    imatched += 1;
                    matchedDomain += 1;
                    //console.log("GOT A DOMAIN HIT" + matched + " " + mismatched);
                }
            }
            var matchedLen = Object.keys(matched).length + Object.keys(hasCategory).length;
            var mismatchedLen = Object.keys(mismatched).length;
            if ((imismatched < 3000)
                && ((matchedLen > mismatchedLen)
                    || (matchedLen === mismatchedLen && matchedDomain > 0))) {
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
                if ((rec._ranking === null) || !rec._ranking) {
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
    debuglog("resulting category sentences: \n", debuglog.enabled ? (abot_erbase_4.Sentence.dumpNiceArr(res2.slice(0, 3), abot_erbase_4.Sentence.rankingProduct)) : '-');
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
const ListAll = require("./listall");
// const result = WhatIs.resolveCategory(cat, a1.entity,
//   theModel.mRules, theModel.tools, theModel.records);
function resolveCategory(category, contextQueryString, rules, records) {
    if (contextQueryString.length === 0) {
        return { errors: [abot_erbase_2.ErError.makeError_EMPTY_INPUT()], tokens: [], answers: [] };
    }
    else {
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
        res.answers.forEach(o => { o._ranking = o._ranking * abot_erbase_4.Sentence.rankingProduct(o.sentence); });
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
    }
    else {
        // var categorySet = Model.getAllRecordCategoriesForTargetCategory(theModel, cat, true);
        var res = ListAll.listAllTupelWithContext(categories, contextQueryString, rules, records, domainCategoryFilter);
        //* sort by sentence
        res.tupelanswers.forEach(o => { o._ranking = o._ranking * abot_erbase_4.Sentence.rankingProduct(o.sentence); });
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
        if (safeEqual(result._ranking, results[0]._ranking)) {
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
