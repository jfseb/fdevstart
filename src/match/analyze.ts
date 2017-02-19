/**
 *
 * @module jfseb.fdevstart.analyze
 * @file analyze.ts
 * @copyright (c) 2016 Gerd Forstmann
 */

"use strict";

import * as InputFilter from './inputFilter';

import * as debug from 'debug';

const debuglog = debug('analyze');



import * as logger from '../utils/logger';
var perf = logger.perf('analyze');


import * as Utils from 'abot_utils';

import * as IMatch from './ifmatch';

import * as Toolmatcher from './toolmatcher';

import * as Sentence from './sentence';

export function analyzeAll(sString: string, rules: IMatch.SplitRules, aTools: Array<IMatch.ITool>, words? ) {
  "use strict";
  if (sString.length === 0) {
    return [];
  } else {
    perf('analyzeString');
 //   InputFilter.resetCnt();
    var matched = InputFilter.analyzeString(sString, rules, words);
    perf('analyzeString');
 //   InputFilter.dumpCnt();
    perf('expand');
    debuglog("After matched " + JSON.stringify(matched));
    var aSentences = InputFilter.expandMatchArr(matched);

    aSentences.sort(Sentence.cmpRankingProduct);
    debuglog("after expand" + aSentences.map(function (oSentence) {
      return Sentence.rankingProduct(oSentence) + ":" + Sentence.dumpNice(oSentence);
    }).join("\n"));
    if (debuglog.enabled) {
      debuglog(" after expand:" + Sentence.dumpNiceArr(aSentencesReinforced, Sentence.rankingProduct));
    }
    perf('expand');
    var aSentencesReinforced = InputFilter.reinForce(aSentences);
    //aSentences.map(function(oSentence) { return InputFilter.reinForce(oSentence); });
    aSentencesReinforced.sort(Sentence.cmpRankingProduct);
    debuglog("after reinforce \n" + aSentencesReinforced.map(function (oSentence) {
      return Sentence.rankingProduct(oSentence) + ":" + Sentence.dumpNice(oSentence);
    }).join("\n"));
    if (debuglog.enabled) {
      debuglog(" after reinforce:" + Sentence.dumpNiceArr(aSentencesReinforced, Sentence.rankingProduct));
    }
    aSentencesReinforced = Sentence.cutoffSentenceAtRatio(aSentencesReinforced)
    perf('matchTools');
    var matchedTools = Toolmatcher.matchTools(aSentencesReinforced, aTools); //aTool: Array<IMatch.ITool>): any /* objectstream*/ {
    perf('matchTools');
    debuglog(" matchedTools" + JSON.stringify(matchedTools, undefined, 2));
    return matchedTools;
  }
}

/**
 * TODO: rework this to work correctly with sets
 */

export function isComplete(match :  IMatch.IToolMatch) {
  // TODO -> analyze sets
  return match && match.rank > 0.6 &&
    Object.keys(match.toolmatchresult.missing ||{}).length === 0
}

export function getPrompt(match :  IMatch.IToolMatch) {
  if(!match) {
      return;
  }
  if (match.rank < 0.6 ) {
    return undefined;
  }
  if(Object.keys(match.toolmatchresult.missing).length ) {
    var missing = Object.keys(match.toolmatchresult.missing)[0];
    return {
      category : missing,
      text : 'Please provide a missing "' + missing + '"?'
    }
  }
  return undefined;
}


export function setPrompt(match : IMatch.IToolMatch, prompt: IMatch.IPrompt,
  response : string) {
    if(!match) {
      return;
    }
    if (response.toLowerCase() !== 'cancel' && response.toLowerCase() !== 'abort') {
      var u = {} as IMatch.IWord;
      u.category = prompt.category;
      u._ranking = 1.0;
      u.matchedString = response;
      /// TODO test whether this can be valid at all?
      match.toolmatchresult.required[prompt.category] = u;
      delete match.toolmatchresult.missing[prompt.category];
   }
}


