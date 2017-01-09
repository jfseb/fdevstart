/**
 *
 * @module jfseb.fdevstart.analyze
 * @file analyze.ts
 * @copyright (c) 2016 Gerd Forstmann
 */


import * as InputFilter from './inputFilter';

import * as Algol from './algol';
import * as debug from 'debug';

const debuglog = debug('listall');
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

import * as Model from '../model/model';
import * as Match from './match';

var sWords = {};

export function matchRecordHavingCategory(category: string, records: Array<IMatch.IRecord>)
  : Array<IMatch.IRecord> {
  debuglog(debuglog.enabled ? JSON.stringify(records,undefined,2) : "-");
  var relevantRecords = records.filter(function (record: IMatch.IRecord) {
    return (record[category] !== undefined) && (record[category] !== null);
  });
  var res = [];
  debuglog("relevant records nr:" + relevantRecords.length);
  return relevantRecords;
}


export function analyzeContextString(contextQueryString : string,  rules: IMatch.SplitRules) {
    var matched = InputFilter.analyzeString(contextQueryString, rules, sWords);
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
    return aSentencesReinforced;
}

// const result = WhatIs.resolveCategory(cat, a1.entity,
//   theModel.mRules, theModel.tools, theModel.records);

export function listAllWithContext(category: string, contextQueryString: string,
  aRules: IMatch.SplitRules, records: Array<IMatch.IRecord>, categorySet?: { [key : string] : boolean }): Array<IMatch.IWhatIsAnswer> {
  if (contextQueryString.length === 0) {
    return [];
  } else {
    logPerf('listAllWithContext');
    perflog("totalListAllWithContext");
    var aSentencesReinforced = analyzeContextString(contextQueryString, aRules);
    perflog("matching records (s=" + aSentencesReinforced.length + ")...");
    var matchedAnswers = WhatIs.matchRecordsQuick(aSentencesReinforced, category, records, categorySet); //aTool: Array<IMatch.ITool>): any /* objectstream*/ {
    if(debuglog.enabled){
      debuglog(" matched Answers" + JSON.stringify(matchedAnswers, undefined, 2));
    }
    perflog("filtering topRanked (a=" + matchedAnswers.length + ")...");
    var matchedFiltered = WhatIs.filterOnlyTopRanked(matchedAnswers);
    if (debuglog.enabled) {
      debuglog(" matched top-ranked Answers" + JSON.stringify(matchedFiltered, undefined, 2));
    }
    perflog("totalListAllWithContext (a=" + matchedFiltered.length + ")");
    logPerf('listAllWithContext');
    return matchedFiltered; // ??? Answers;
  }
}


export function listAllHavingContext(category: string, contextQueryString: string,
  aRules: IMatch.SplitRules, records: Array<IMatch.IRecord>,
  categorySet : { [key:string] : boolean }): Array<IMatch.IWhatIsAnswer> {
  if (contextQueryString.length === 0) {
    return [];
  } else {
    perflog("analyzeContextString ...");
    var aSentencesReinforced = analyzeContextString(contextQueryString, aRules);
    perflog("matching records having (s=" + (aSentencesReinforced.length) + ")...");
    var matchedAnswers = WhatIs.matchRecordsHavingContext(aSentencesReinforced, category, records, categorySet); //aTool: Array<IMatch.ITool>): any /* objectstream*/ {
    if(debuglog.enabled) {
      debuglog(" matched Answers" + JSON.stringify(matchedAnswers, undefined, 2));
    }
    perflog("filteringTopRanked (a=" + matchedAnswers.length + ")...");
    var matchedFiltered = WhatIs.filterOnlyTopRanked(matchedAnswers);
    if (debuglog.enabled) {
      debuglog(" matched top-ranked Answers" + JSON.stringify(matchedFiltered, undefined, 2));
    }
    perflog("totalListAllHavingContext (a=" + matchedFiltered.length + ")");
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

export function inferDomain(theModel : IMatch.IModels, contextQueryString: string): string {
 // console.log("here the string" + contextQueryString);
 //  console.log("here the rules" + JSON.stringify(theModel.mRules));
  var res = analyzeContextString(contextQueryString, theModel.rules);
  //console.log(JSON.stringify(res,undefined,2));
  // run through the string, search for a category
  if(!res.length) {
    return undefined;
  }
  var domains = [];
  // do we have a domain ?
  res[0].forEach(function(oWordGroup) {
    if(oWordGroup.category === "domain") {
      domains.push(oWordGroup.matchedString)
    }
  });
  if(domains.length === 1) {
    return domains[0];
  }
  if(domains.length > 0 ) {
    return undefined;
    // TODOD
  }
  // try a category reverse map
  res[0].forEach(function(oWordGroup){
    if(oWordGroup.category === "category") {
      var sCat = oWordGroup.matchedString;
      var doms = Model.getDomainsForCategory(theModel,sCat);
      doms.forEach(function(sDom) {
        if(domains.indexOf(sDom) < 0) {
          domains.push(sDom);
        }
      });
    }
  });
  if(domains.length === 1) {
    return domains[0];
  }
  return undefined;
};