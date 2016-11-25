/**
 *
 * @module jfseb.fdevstart.analyze
 * @file analyze.ts
 * @copyright (c) 2016 Gerd Forstmann
 */


import * as InputFilter from './InputFilter';

import * as debug from 'debug';

const debuglog = debug('analyze');

import * as utils from '../utils/utils';

import * as IMatch from './ifmatch';

import * as Toolmatcher from './toolmatcher';

export function analyzeAll(sString : string, aRules : Array<IMatch.mRule>, aTools : Array<IMatch.ITool>) {

  var matched = InputFilter.analyzeString(sString,aRules);
  debuglog("After matched " + JSON.stringify(matched));
  var aSentences = InputFilter.expandMatchArr(matched);
  debuglog("After expand " + JSON.stringify(aSentences));
  var aSentencesReinforced = InputFilter.reinForce(aSentences);
  //aSentences.map(function(oSentence) { return InputFilter.reinForce(oSentence); });

  var matchedTools = Toolmatcher.matchTools(aSentences, aTools); //aTool: Array<IMatch.ITool>): any /* objectstream*/ {
    debuglog(" matchedTools" + JSON.stringify(matchedTools, undefined, 2));
    return matchedTools;
}