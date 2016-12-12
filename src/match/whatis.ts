/**
 *
 * @module jfseb.fdevstart.analyze
 * @file analyze.ts
 * @copyright (c) 2016 Gerd Forstmann
 */


import * as InputFilter from './inputFilter';

import * as debug from 'debug';

const debuglog = debug('whatis');

import * as utils from '../utils/utils';

import * as IMatch from './ifmatch';

import * as Toolmatcher from './toolmatcher';

import * as Sentence from './sentence';

import * as Word from './word';


export function cmpByResultThenRanking(a: IMatch.IWhatIsAnswer, b: IMatch.IWhatIsAnswer) {
  var cmp = a.result.localeCompare(b.result);
  if (cmp) {
    return cmp;
  }
  return -(a._ranking - b._ranking);
}


export function cmpByRanking(a: IMatch.IWhatIsAnswer, b: IMatch.IWhatIsAnswer) {
  var cmp = -(a._ranking - b._ranking);
  if (cmp) {
    return cmp;
  }
  cmp = a.result.localeCompare(b.result);
  if(cmp) {
    return cmp;
  }

  // are records different?
  var res = Object.keys(a.result).sort().reduce(function(prev, sKey) {
    if(prev) {
      return prev;
    }
    if(b.result[sKey] !== a.result[sKey]) {
      if(!b.result[sKey]) {
        return -1;
      }
      if(!a.result[sKey]) {
        return +1;
      }
      return b.result[sKey].localeCompare(a.result[sKey]);
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

export function filterRetainTopRankedResult(res: Array<IMatch.IWhatIsAnswer>): Array<IMatch.IWhatIsAnswer> {
  var result = res.filter(function (iRes, index) {
    debuglog(index + ' ' + JSON.stringify(iRes));
    if (iRes.result === (res[index - 1] && res[index - 1].result)) {
      debuglog('skip');
      return false;
    }
    return true;
  });
  result.sort(cmpByRanking);
  return result;
}

import * as Match from './match';

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

export function matchRecords(aSentences: Array<IMatch.ISentence>, category: string, records: Array<IMatch.IRecord>)
  : Array<IMatch.IWhatIsAnswer> {
  var relevantRecords = records.filter(function (record: IMatch.IRecord) {
    return !!record[category];
  });
  var res = [];
  relevantRecords.forEach(function (record) {
    aSentences.forEach(function (oSentence) {
      // count matches in record which are *not* the category
      var mismatched = {}
      var matched = {};
      aSentences.forEach(function (aSentence) {
        var mismatched = {};
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
            record : record,
            category : category,
            result: record[category],
            _ranking: calcRanking(matched, mismatched, cntRelevantWords)
          });
        }
      })
    });
  });
  res.sort(cmpByResultThenRanking);
  res = filterRetainTopRankedResult(res);
  return res;
}

export function analyzeCategory(categoryword : string , aRules: Array<IMatch.mRule>, wholesentence: string): string {
  var cats = InputFilter.categorizeAWord(categoryword, aRules, wholesentence, {});
  // TODO qualify
  cats = cats.filter(function(cat) {
    return cat.category === 'category';
  })
  if (cats.length) {
    return cats[0].matchedString;
  }
}

// const result = WhatIs.resolveCategory(cat, a1.entity,
//   theModel.mRules, theModel.tools, theModel.records);

export function resolveCategory(category: string, contextQueryString: string,
  aRules: Array<IMatch.mRule>, records: Array<IMatch.IRecord>): Array<IMatch.IWhatIsAnswer> {
  if (contextQueryString.length === 0) {
    return [];
  } else {
    var matched = InputFilter.analyzeString(contextQueryString, aRules);
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
    var matchedAnswers = matchRecords(aSentences, category, records); //aTool: Array<IMatch.ITool>): any /* objectstream*/ {
    debuglog(" matchedTools" + JSON.stringify(matchedAnswers, undefined, 2));
    return matchedAnswers;
  }
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
    return 'Your question does not have a specifci answer';
  }
  return undefined;
}

/**
 * TODO: rework this to work correctly with sets
 */

export function isComplete(match: IMatch.IToolMatch) {
  // TODO -> analyze sets
  return match && match.rank > 0.6 &&
    Object.keys(match.toolmatchresult.missing || {}).length === 0
}

export function getPrompt(match: IMatch.IToolMatch) {
  if (!match) {
    return;
  }
  if (match.rank > 0.6) {
    return undefined;
  }
  if (Object.keys(match.toolmatchresult.missing).length) {
    var missing = Object.keys(match.toolmatchresult.missing)[0];
    return {
      category: missing,
      text: 'Please provide a missing "' + missing + '"?'
    }
  }
  return undefined;
}


export function setPrompt(match: IMatch.IToolMatch, prompt: IMatch.IPrompt,
  response: string) {
  if (!match) {
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


