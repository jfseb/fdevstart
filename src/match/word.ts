/**
 * @file word
 * @module jfseb.fdevstart.sentence
 * @copyright (c) Gerd Forstmann
 *
 * Word specific qualifications,
 *
 * These functions expose parf the underlying model,
 * e.g.
 * Match a tool record on a sentence,
 *
 * This will unify matching required and optional category words
 * with the requirements of the tool.
 *
 */

// <reference path="../../lib/node-4.d.ts" />

// import * as debug from 'debug';

// import * as utils from '../utils/utils';

import * as IMatch from './ifmatch';

export const Category = {
  CAT_CATEGORY :  "category",
  CAT_DOMAIN :  "domain",
  CAT_FILLER : "filler",
  CAT_TOOL : "tool",
  _aCatFillers : ["filler"],
  isDomain : function(sCategory : string )  : boolean{
    return sCategory === Category.CAT_DOMAIN;
  },
  isCategory : function(sCategory : string )  : boolean{
    return sCategory === Category.CAT_CATEGORY;
  },
  isFiller: function(sCategory : string) : boolean {
    return Category._aCatFillers.indexOf(sCategory) >= 0;
  }
}

export const Word = {
  isFiller : function(word : IMatch.IWord) : boolean {
    return word.category === undefined || Category.isFiller(word.category);
  },
  isCategory : function(word : IMatch.IWord) : boolean {
    return Category.isCategory(word.category);
  },
  isDomain : function(word : IMatch.IWord) : boolean {
    return Category.isDomain(word.category);
  }
};
