/**
 *
 * @module jfseb.fdevstart.analyze
 * @file analyze.ts
 * @copyright (c) 2016 Gerd Forstmann
 */


import * as InputFilter from './inputFilter';

import * as Algol from './Algol';
import * as debug from 'debug';

const debuglog = debug('whatis');
import * as logger from '../utils/logger';
var logPerf = logger.perf("perflistall");
var perflog = debug('perf');
//const perflog = logger.perf("perflistall");

import * as utils from '../utils/utils';

import * as IMatch from './ifmatch';

import * as Toolmatcher from './toolmatcher';

import * as Sentence from './sentence';

import * as Word from './word';

import * as WhatIs from './whatis';


import * as Match from './match';


export function matchRecordHavingCategory(category: string, records: Array<IMatch.IRecord>)
  : Array<IMatch.IRecord> {
  debuglog(JSON.stringify(records,undefined,2));
  var relevantRecords = records.filter(function (record: IMatch.IRecord) {
    return (record[category] !== undefined) && (record[category] !== null);
  });
  var res = [];
  debuglog("relevant records nr:" + relevantRecords.length);
  return relevantRecords;
}

// const result = WhatIs.resolveCategory(cat, a1.entity,
//   theModel.mRules, theModel.tools, theModel.records);

export function listAllWithContext(category: string, contextQueryString: string,
  aRules: Array<IMatch.mRule>, records: Array<IMatch.IRecord>): Array<IMatch.IWhatIsAnswer> {
  if (contextQueryString.length === 0) {
    return [];
  } else {
    logPerf('listAllWithContext');
    perflog("totalListAllWithContext");
    var matched = InputFilter.analyzeString(contextQueryString, aRules);
    if(debuglog.enabled) {
      debuglog("After matched " + JSON.stringify(matched));
    }
    var aSentences = InputFilter.expandMatchArr(matched);
    if(debuglog.enabled) {
      debuglog("after expand" + aSentences.map(function (oSentence) {
        return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
      }).join("\n"));
    }
    var aSentencesReinforced = InputFilter.reinForce(aSentences);
    if(debuglog.enabled) {
      debuglog("after reinforce" + aSentencesReinforced.map(function (oSentence) {
        return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
      }).join("\n"));
    }
    // we limit analysis to n sentences
    var aSentencesReinforced = aSentencesReinforced.slice(0, Algol.Cutoff_Sentences);

    perflog("matching records ...");


    var matchedAnswers = WhatIs.matchRecordsQuick(aSentencesReinforced, category, records); //aTool: Array<IMatch.ITool>): any /* objectstream*/ {
    if(debuglog.enabled){
      debuglog(" matched Answers" + JSON.stringify(matchedAnswers, undefined, 2));
    }
    perflog("match records");
    var matchedFiltered = WhatIs.filterOnlyTopRanked(matchedAnswers);
    if (debuglog.enabled) {
      debuglog(" matched top-ranked Answers" + JSON.stringify(matchedFiltered, undefined, 2));
    }
    perflog("totalListAllWithContext");
    logPerf('listAllWithContext');
    return matchedAnswers;
  }
}


export function listAllHavingContext(category: string, contextQueryString: string,
  aRules: Array<IMatch.mRule>, records: Array<IMatch.IRecord>): Array<IMatch.IWhatIsAnswer> {
  if (contextQueryString.length === 0) {
    return [];
  } else {
    var matched = InputFilter.analyzeString(contextQueryString, aRules);
    perflog("having after analyze ")
    if(debuglog.enabled) {
      debuglog("After matched " + JSON.stringify(matched));
    }
    var aSentences = InputFilter.expandMatchArr(matched);
    if(debuglog.enabled) {
      debuglog("after expand" + aSentences.map(function (oSentence) {
        return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
      }).join("\n"));
    }
    var aSentencesReinforced = InputFilter.reinForce(aSentences);
    //aSentences.map(function(oSentence) { return InputFilter.reinForce(oSentence); });
    debuglog("after reinforce" + aSentencesReinforced.map(function (oSentence) {
      return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
    }).join("\n"));
        // we limit analysis to n sentences
    var aSentencesReinforced = aSentencesReinforced.slice(0,Algol.Cutoff_Sentences);
    perflog("matching records ...")
    var matchedAnswers = WhatIs.matchRecordsHavingContext(aSentencesReinforced, category, records); //aTool: Array<IMatch.ITool>): any /* objectstream*/ {
    if(debuglog.enabled) {
      debuglog(" matched Answers" + JSON.stringify(matchedAnswers, undefined, 2));
    }
    var matchedFiltered = WhatIs.filterOnlyTopRanked(matchedAnswers);
    if (debuglog.enabled) {
      debuglog(" matched top-ranked Answers" + JSON.stringify(matchedFiltered, undefined, 2));
    }
    perflog("total listAllHavingContext")
    return matchedFiltered;
  }
}




export function listAllWithCategory(category: string, records: Array<IMatch.IRecord>): Array<IMatch.IRecord> {
  var matchedAnswers = matchRecordHavingCategory(category, records); //aTool: Array<IMatch.ITool>): any /* objectstream*/ {
  debuglog(" listAllWithCategory:" + JSON.stringify(matchedAnswers, undefined, 2));

  return matchedAnswers;
}

export function joinSortedQuoted(strings : string[] ) : string {
  if (strings.length === 0) {
    return "";
  }
  return '"' + strings.sort().join('"; "') + '"';
}

export function joinDistinct(category : string, records : Array<IMatch.IRecord>) : string {
  var res = records.reduce(function(prev, oRecord) {
    prev[oRecord[category]] = 1;
    return prev;
  },{} as any);
  return joinSortedQuoted(Object.keys(res));
}

export function formatDistinctFromWhatIfResult( answers : Array<IMatch.IWhatIsAnswer>) : string {
  return joinSortedQuoted(answers.map(function(oAnswer) {
    return oAnswer.result;
  }));
}

export function joinResults(results: Array<IMatch.IWhatIsAnswer>): string[] {
  var res  = [];
  var cnt = results.reduce(function (prev, result) {
    if (result._ranking === results[0]._ranking) {
      if(res.indexOf(result.result) < 0 ){
        res.push(result.result);
      }
      return prev + 1;
    }
  }, 0);
  return res;
}
