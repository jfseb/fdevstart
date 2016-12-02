/**
 * @file toolmatcher
 * @module jfseb.fdevstart.toolmatcher
 * @copyright (c) Gerd Forstmann
 *
 * Match a tool record on a sentence,
 *
 * This will unify matching required and optional category words
 * with the requirements of the tool.
 *
 */

// / <reference path="../../lib/node-4.d.ts" />

import * as debug from 'debug';

import * as Sentence from './sentence';

import * as utils from '../utils/utils';

import * as IMatch from './ifmatch';

const debuglog = debug('toolmatcher');

export function matchTool(oSentence : IMatch.ISentence, oTool : IMatch.ITool) : IMatch.IToolMatchResult {
  var used = {} as any;
  var required = {} as any;
  var matched = {} as any;
  Object.keys(oTool.requires).forEach(function(sCategory : string) {
    let { word , index } = Sentence.findWordByCategory(oSentence, sCategory);
    matched[word as any] = "required";
    used[index] = 1;
    required[sCategory] = 1;
  });
  Object.keys(oTool.optional).forEach(function(sCategory : string) {
    var  { word , index } = Sentence.findWordByCategory(oSentence, sCategory);
    matched[word as any] = "optional";
    used[index] = 1;
    required[sCategory] = 1;
  });
  var missing = utils.ArrayUtils.setMinus(Object.keys(oTool.requires),Object.keys(required)).reduce(
    function(map, sKey) {
    map[sKey] = 1;
    return map;
  },{})

  return {
    required : required,
    missing : {},
    optional : {}
  }
}
