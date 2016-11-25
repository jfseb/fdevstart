/**
 *
 * @module jfseb.fdevstart.analyze
 * @file analyze.ts
 * @copyright (c) 2016 Gerd Forstmann
 */


import * as InputFilter from './inputFilter';

import * as debug from 'debug';

const debuglog = debug('analyze');

import * as utils from '../utils/utils';

import * as IMatch from './ifmatch';

import * as Toolmatcher from './toolmatcher';

import * as Sentence from './sentence';

export function analyzeAll(sString: string, aRules: Array<IMatch.mRule>, aTools: Array<IMatch.ITool>) {
  if (sString.length === 0) {
    return [];
  } else {
    var matched = InputFilter.analyzeString(sString, aRules);
    debuglog("After matched " + JSON.stringify(matched));
    var aSentences = InputFilter.expandMatchArr(matched);
    debuglog("after expand" + aSentences.map(function (oSentence) {
      return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
    }).join("\n"));
    var aSentencesReinforced = InputFilter.reinForce(aSentences);
    //aSentences.map(function(oSentence) { return InputFilter.reinForce(oSentence); });
    debuglog("after reinforce" + aSentencesReinforced.map(function (oSentence) {
      return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
    }).join("\n"));

    var matchedTools = Toolmatcher.matchTools(aSentences, aTools); //aTool: Array<IMatch.ITool>): any /* objectstream*/ {
    debuglog(" matchedTools" + JSON.stringify(matchedTools, undefined, 2));
    return matchedTools;
  }
}