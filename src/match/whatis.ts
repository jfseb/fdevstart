/**
 *
 * @module jfseb.fdevstart.analyze
 * @file analyze.ts
 * @copyright (c) 2016 Gerd Forstmann
 */


import * as InputFilter from './inputFilter';

import * as debug from 'debug';

var debuglog = debug('whatis');
var debuglogV = debug('whatVis');
var perflog = debug('perf');


export function mockDebug(o) {
  debuglog = o;
  debuglogV = o;
  perflog = o;
}


import * as utils from '../utils/utils';
import * as _ from 'lodash';

import * as IMatch from './ifmatch';


import * as Match from './match';


import * as Toolmatcher from './toolmatcher';

import * as Sentence from './sentence';

import * as Word from './word';

import * as Algol from './algol';


export function cmpByResultThenRanking(a: IMatch.IWhatIsAnswer, b: IMatch.IWhatIsAnswer) {
  var cmp = a.result.localeCompare(b.result);
  if (cmp) {
    return cmp;
  }
  return -(a._ranking - b._ranking);
}

function localeCompareArrs(aaresult: string[], bbresult: string[]): number {
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

export function cmpByResultThenRankingTupel(aa: IMatch.IWhatIsTupelAnswer, bb: IMatch.IWhatIsTupelAnswer) {
  var cmp = localeCompareArrs(aa.result, bb.result);
  if (cmp) {
    return cmp;
  }
  return -(aa._ranking - bb._ranking);
}


export function cmpByRanking(a: IMatch.IWhatIsAnswer, b: IMatch.IWhatIsAnswer) {
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



export function cmpByRankingTupel(a: IMatch.IWhatIsTupelAnswer, b: IMatch.IWhatIsTupelAnswer) {
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



export function dumpNice(answer: IMatch.IWhatIsAnswer) {
  var result = {
    s: "",
    push: function (s) { this.s = this.s + s; }
  };
  var s =
    `**Result for category: ${answer.category} is ${answer.result}
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
    var sWord = `[${index}] : ${oWord.category} "${oWord.string}" => "${oWord.matchedString}"`
    result.push(sWord + "\n");
  })
  result.push(".\n");
  return result.s;
}
export function dumpNiceTupel(answer: IMatch.IWhatIsTupelAnswer) {
  var result = {
    s: "",
    push: function (s) { this.s = this.s + s; }
  };
  var s =
    `**Result for categories: ${answer.categories.join(";")} is ${answer.result}
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
    var sWord = `[${index}] : ${oWord.category} "${oWord.string}" => "${oWord.matchedString}"`
    result.push(sWord + "\n");
  })
  result.push(".\n");
  return result.s;
}


export function dumpWeightsTop(toolmatches: Array<IMatch.IWhatIsAnswer>, options: any) {
  var s = '';
  toolmatches.forEach(function (oMatch, index) {
    if (index < options.top) {
      s = s + "WhatIsAnswer[" + index + "]...\n";
      s = s + dumpNice(oMatch);
    }
  });
  return s;
}

export function filterRetainTopRankedResult(res: IMatch.IProcessedWhatIsAnswers): IMatch.IProcessedWhatIsAnswers {
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

export function filterRetainTopRankedResultTupel(res: IMatch.IProcessedWhatIsTupelAnswers): IMatch.IProcessedWhatIsTupelAnswers {
  var result = res.tupelanswers.filter(function (iRes, index) {
    if (debuglog.enabled) {
      debuglog(' retain tupel ' + index + ' ' + JSON.stringify(iRes));
    }
    if (_.isEqual(iRes.result, res.tupelanswers[index - 1] && res.tupelanswers[index - 1].result)) {
      debuglog('skip');
      return false
    }
    return true;
  });
  result.sort(cmpByRankingTupel);
  return Object.assign(res, { tupelanswers: result });
}


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

export function calcRankingHavingCategory(matched: { [key: string]: IMatch.IWord },
  hasCategory: { [key: string]: number },
  mismatched: { [key: string]: IMatch.IWord }, relevantCount: number): number {


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
export function matchRecordsTupelHavingContext(
  pSentences: IMatch.IProcessedSentences, categories: string[], records: Array<IMatch.IRecord>,
  categorySet: { [key: string]: boolean })
  : IMatch.IProcessedWhatIsTupelAnswers {
  // debuglog(JSON.stringify(records, undefined, 2));
  var categoryF = categories[0];
  var relevantRecords = records.filter(function (record: IMatch.IRecord) {
    return (record[categoryF] !== undefined) && (record[categoryF] !== null);
  });
  var res = [] as IMatch.IWhatIsTupelAnswer[];
  debuglog("relevant records nr:" + relevantRecords.length);
  debuglog(debuglog.enabled ? ("sentences are : " + JSON.stringify(pSentences, undefined, 2)) : "-");
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
            categories: categories,
            result: extractResult(categories, record),
            _ranking: calcRankingHavingCategory(matched, hasCategory, mismatched, cntRelevantWords)
          });
        }
      })
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
            categories: categories,
            result: extractResult(categories, record),
            _ranking: calcRankingHavingCategory(matched, hasCategory, mismatched, cntRelevantWords)
          });
        }
      })
    });
  }
  res.sort(cmpByResultThenRankingTupel);
  var result1 = Object.assign({ tupelanswers: res }, pSentences);
  return filterRetainTopRankedResultTupel(result1);
}

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

function makeSimplifiedSentences(aSentences : IMatch.IProcessedSentences,  track: { fl: number, lf: number }): {
  domains: string[],
  oSentence: IMatch.ISentence,
  cntRelevantWords: number,
  rWords: IMatch.IWord[]
}[] {
  return aSentences.sentences.map(function (oSentence) {
    var domains = [] as string[];
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


function extractResult(categories: string[], record: { [key: string]: string }): string[] {
  return categories.map(function (category) { return record[category] || "n/a"; });
}

export function matchRecordsQuickMultipleCategories(pSentences: IMatch.IProcessedSentences, categories: string[], records: Array<IMatch.IRecord>, categorySet?: { [key: string]: boolean })
  : IMatch.IProcessedWhatIsTupelAnswers {
  // if (debuglog.enabled) {
  //  debuglog(JSON.stringify(records, undefined, 2));
  // }
  Object.freeze(categorySet);
  var categoryF = categories[0];
  debuglog("matchRecordsQuickMultipleCategories (r=" + records.length + " s=" + pSentences.sentences.length + ")\n categories:" + categories.join("\n"));
  perflog("matchRecordsQuickMult ...(r=" + records.length + " s=" + pSentences.sentences.length + ")");
  var relevantRecords = records.filter(function (record: IMatch.IRecord) {
    return (record[categoryF] !== undefined) && (record[categoryF] !== null);
  });
  var res = [] as Array<IMatch.IWhatIsTupelAnswer>;
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
    var track = { fl: 0 , lf : 0};
    var aSimplifiedSentences = makeSimplifiedSentences(pSentences,track);
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
        if ((record as any)._domain !== aSentence.domains[0]) {
          mismatched = 3000;
        } else {
          matched += 1;
          //console.log("GOT A DOMAIN HIT" + matched + " " + mismatched);
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
          _ranking: calcRankingSimple(matched, mismatched, (nouse + missingcat), aSentence.cntRelevantWords)
        }
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
    })
  });
  perflog("sort (a=" + res.length + ")");
  res.sort(cmpByResultThenRankingTupel);
  perflog("filterRetain ...");
  var result1 = Object.assign({ tupelanswers: res }, pSentences)
  var result2 = filterRetainTopRankedResultTupel(result1);
  perflog("matchRecordsQuick done: (r=" + relevantRecords.length + " s=" + pSentences.sentences.length + " a=" + res.length + ")");
  return result2;
}


function classifyWordWithTargetCategory(word: string, targetcategory: string, rules: IMatch.SplitRules,
  wholesentence: string): string {
  //console.log("classify " + word + " "  + targetcategory);
  var cats = InputFilter.categorizeAWord(word, rules, wholesentence, {});
  // TODO qualify
  cats = cats.filter(function (cat) {
    return cat.category === targetcategory;
  })
  debuglog(JSON.stringify(cats));
  if (cats.length) {
    return cats[0].matchedString;
  }
}


export function analyzeCategory(categoryword: string, rules: IMatch.SplitRules, wholesentence: string): string {
  return classifyWordWithTargetCategory(categoryword, 'category', rules, wholesentence);
}

export function splitAtCommaAnd(str: string): string[] {
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
/**
 * A simple implementation, splitting at and and ,
 */
export function analyzeCategoryMultOnlyAndComma(categorylist: string, rules: IMatch.SplitRules, wholesentence: string): string[] {
  var rtrimmed = splitAtCommaAnd(categorylist);
  var rcat = rtrimmed.map(function (o) {
    return analyzeCategory(o, rules, wholesentence);
  });
  if (rcat.indexOf(undefined) >= 0) {
    throw new Error('"' + rtrimmed[rcat.indexOf(undefined)] + '" is not a category!');
  }
  return rcat;
}



export function filterAcceptingOnly(res: IMatch.ICategorizedString[][], categories: string[]):
  IMatch.ICategorizedString[][] {
  return res.filter(function (aSentence, iIndex) {
    return aSentence.every(function (oWord) {
      return categories.indexOf(oWord.category) >= 0;
    });
  })
}


import * as Erbase from './erbase';

var sWords = {};

export function resetCache(): void {
  sWords = {};
}

export function processString(query: string, rules: IMatch.SplitRules
): IMatch.IProcessedSentences {

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


export function analyzeContextString(contextQueryString: string, rules: IMatch.SplitRules):
  IMatch.IProcessedSentences {

  var aSentencesReinforced = processString(contextQueryString, rules)
  // we limit analysis to n sentences
  aSentencesReinforced.sentences = aSentencesReinforced.sentences.slice(0, Algol.Cutoff_Sentences);
  if (debuglog.enabled) {
    debuglog("after reinforce and cutoff" + aSentencesReinforced.sentences.length + "\n" + aSentencesReinforced.sentences.map(function (oSentence) {
      return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
    }).join("\n"));
  }
  return aSentencesReinforced;
}

export function cmpByNrCategoriesAndSameDomain(a: IMatch.ISentence, b: IMatch.ISentence): number {
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

export function analyzeCategoryMult(categorylist: string, rules: IMatch.SplitRules, wholesentence: string, gWords:
  { [key: string]: IMatch.ICategorizedString[] }): string[] {
  var res = analyzeContextString(categorylist, rules);
  //  debuglog("resulting category sentences", JSON.stringify(res));
  var res2 = filterAcceptingOnly(res.sentences, ["category", "filler"]);
  //  console.log("here res2" + JSON.stringify(res2) );
  //  console.log("here undefined ! + " + res2.filter(o => !o).length);
  res2.sort(Sentence.cmpRankingProduct);
  debuglog("resulting category sentences: \n", debuglog.enabled ? (Sentence.dumpNiceArr(res2.slice(0, 3), Sentence.rankingProduct)) : '-');
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

export function analyzeOperator(opword: string, rules: IMatch.SplitRules, wholesentence: string): string {
  return classifyWordWithTargetCategory(opword, 'operator', rules, wholesentence);
}


import * as ErError from './ererror';

import * as ListAll from './listall';
// const result = WhatIs.resolveCategory(cat, a1.entity,
//   theModel.mRules, theModel.tools, theModel.records);


export function resolveCategory(category: string, contextQueryString: string,
  rules: IMatch.SplitRules, records: Array<IMatch.IRecord>): IMatch.IProcessedWhatIsAnswers {
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
    res.answers.forEach(o => { o._ranking = o._ranking *  Sentence.rankingProduct( o.sentence ); });
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

import * as Model from '../model/model';

export function resolveCategories(categories: string[], contextQueryString: string,
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
    // var categorySet = Model.getAllRecordCategoriesForTargetCategory(theModel, cat, true);
    var res = ListAll.listAllTupelWithContext(categories, contextQueryString, rules, records);
    //* sort by sentence
    res.tupelanswers.forEach(o => { o._ranking = o._ranking *  Sentence.rankingProduct( o.sentence ); });
    res.tupelanswers.sort(cmpByRankingTupel);
    return res;
  }
}

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

export function filterOnlyTopRanked(results: Array<IMatch.IWhatIsAnswer>): Array<IMatch.IWhatIsAnswer> {
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

export function filterOnlyTopRankedTupel(results: Array<IMatch.IWhatIsTupelAnswer>): Array<IMatch.IWhatIsTupelAnswer> {
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

export function isIndiscriminateResult(results: Array<IMatch.IWhatIsAnswer>): string {
  var cnt = results.reduce(function (prev, result) {
    if (result._ranking === results[0]._ranking) {
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

export function isIndiscriminateResultTupel(results: Array<IMatch.IWhatIsTupelAnswer>): string {
  var cnt = results.reduce(function (prev, result) {
    if (result._ranking === results[0]._ranking) {
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
