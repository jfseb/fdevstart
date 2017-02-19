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

import * as IMatch from './ifmatch';

import * as Utils from 'abot_utils';
import * as Sentence from './sentence';
import * as OpsWord from './word';

const Word = OpsWord.Word;
const Category = OpsWord.Category;

const debuglog = debug('toolmatcher');

export function matchTool(oSentence: IMatch.ISentence, oTool: IMatch.ITool): IMatch.IToolMatchResult {
  var used = {} as { [key: number]: number };
  var required = {} as { [key: string]: IMatch.IWord };
  var optional = {} as { [key: string]: IMatch.IWord };
  var matched = {} as { [key: string]: string };
  var spurious = {} as { [key: string]: number };
  var toolmentioned = [] as Array<IMatch.IWord>;
  Object.keys(oTool.requires || {}).forEach(function (sCategory: string) {
    let { word, index } = Sentence.findWordByCategory(oSentence, sCategory);
    if (word) {
      matched[word as any] = "required";
      used[index] = 1;
      required[sCategory] = word;
    }
  });
  Object.keys(oTool.optional || {}).forEach(function (sCategory: string) {
    var { word, index } = Sentence.findWordByCategory(oSentence, sCategory);
    if (word) {
      matched[word as any] = "optional";
      used[index] = 1;
      optional[sCategory] = word;
    }
  });

  oSentence.forEach(function (oWord, index) {
    if (!used[index] && !Word.isFiller(oWord) && !Word.isCategory(oWord)) {
      debuglog("have spurious word" + JSON.stringify(oWord));
      if (!used[index] && oWord.category === Category.CAT_TOOL && oWord.matchedString === oTool.name ) {
        toolmentioned.push(oWord);
      } else {
        spurious[oWord.matchedString] = 1;
      }
    }
  });
  debuglog('satisfied : ' + Object.keys(oTool.requires).join(";"));
  debuglog('required  : ' + Object.keys(oTool.requires).join(";"));
  var missing = Utils.ArrayUtils.setMinus(Object.keys(oTool.requires), Object.keys(required)).reduce(
    function (map, sKey) {
      map[sKey] = 1;
      return map;
    }, {})

  return {
    required: required,
    missing: missing,
    optional: optional,
    spurious: spurious,
    toolmentioned : toolmentioned
  }
}

import * as match from './match';

const ToolMatch = match.ToolMatch;

export function matchTools(aSentences: Array<IMatch.ISentence>, aTool: Array<IMatch.ITool>): IMatch.IToolMatch[] /* objectstream*/ {
  //var stream = new streamutils.MatchStream();
  debuglog("matchTools: sentences \n" +
    aSentences.map(function (oSentence, index) {
    return (index < 30) ? `[${index}]` + Sentence.rankingProduct(oSentence) + ":" + Sentence.dumpNice(oSentence) : "\n";
    }).join("\n"));
  var result = [];
  aTool.forEach(function (oTool) {
    aSentences.forEach(function (oSentence) {
      var toolmatchresult = matchTool(oSentence, oTool);
      var toolmatch = {
        toolmatchresult: toolmatchresult,
        sentence: oSentence,
        tool : oTool,
        rank : 0
      } as IMatch.IToolMatch;
      toolmatch.rank = ToolMatch.rankResult(toolmatch.toolmatchresult);
      if (ToolMatch.isAnyMatch(toolmatch)) {
        result.push(toolmatch);
      }
    })
  });
  result.sort(ToolMatch.compBetterMatch);

  if(debuglog.enabled) {
    debuglog("matchTools: ranked toolmatches\n" +
      result.map(function(otoolmatch) {
        return Sentence.dumpNice(otoolmatch.sentence) + JSON.stringify(otoolmatch);
      }).join("\n")
    );
  }
  return result;
}