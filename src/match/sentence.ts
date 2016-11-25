/**
 * @file sentence
 * @module jfseb.fdevstart.sentence
 * @copyright (c) Gerd Forstmann
 *
 * Match a tool record on a sentence,
 *
 * This will unify matching required and optional category words
 * with the requirements of the tool.
 *
 */

/// <reference path="../../lib/node-4.d.ts" />

// import * as debug from 'debug';

// import * as utils from '../utils/utils';

import * as IMatch from './ifmatch';

// const debuglog = debug('toolmatcher')

export function findWordByCategory(oSentence, sCategory : string) : { word : IMatch.IWord, index : number} {
  	var res = {} as { word : IMatch.IWord, index : number};
    oSentence.every(function(oWord, iIndex) {
      if(oWord.category === sCategory) {
        res = { word: oWord,
                index : iIndex };
        return false;
      }
      return true;
    })
    return res;
}

export function rankingProduct(oSentence: IMatch.ISentence) : number {
  return oSentence.reduce(function(prev, oWord) {
    return prev * (oWord._ranking || 1.0);
  },1.0)
}

export function cmpRankingProduct(a : IMatch.ISentence, b : IMatch.ISentence) {
  return - (rankingProduct(a) - rankingProduct(b));
}