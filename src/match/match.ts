/**
 * @file match
 * @module jfseb.fdevstart.match
 * @copyright (c) Gerd Forstmann
 *
 *
 * Judging function for a match
 */


import * as debug from 'debug';
const debuglog = debug('match');
import * as IMatch from './ifmatch';
import * as stream from 'stream';


function weakenByN(a : number, n : number) : number {
  return 1.0 + (a-1.0)/n;
}

function calcGeometricMeansOfRanking(oSet) {
  var keys = Object.keys(oSet);
  if(!keys.length) {
    return 1.0;
  }
  var factor = Object.keys(oSet).reduce(function(prev, sCategory) {
    return prev *= oSet[sCategory]._ranking;
  },1.0);
  return Math.pow(factor, 1/keys.length);
}
/**
 * Calculate a number to rank a matched tool
 *
 *
 */
export function rankToolMatch(a: IMatch.IToolMatchResult) : number {
  var missing = Object.keys(a.missing || {}).length;
  var required = Object.keys(a.required || {}).length;
  var optional = Object.keys(a.optional || {}) .length;
  var spurious = Object.keys(a.spurious || {}).length;
  var matching = required + optional;
  debuglog("caluclating rank of " + JSON.stringify(a));
  var rankingRequired = calcGeometricMeansOfRanking(a.required);
  var rankingOptional = calcGeometricMeansOfRanking(a.optional);

  // 1.1 for every optional;

 //  0.9 for every spurious
 //  for every required
 var spuriousDeprec = Math.pow(0.9, Object.keys(a.spurious).length);
 // 0.8 for every missing;
 var missingDeprec = Math.pow(0.8, Object.keys(a.missing).length);

 // 1.1 for toolmentiond
 if(a.toolmentioned) {
   res *= 1.1;
 }

 var res = missingDeprec * spuriousDeprec * (weakenByN(rankingRequired*rankingOptional, 10))
//  var res =  matching * 100 - 30 * missing  -  10* spurious + factor;
  debuglog("result is " + res);
  return res;
};

export const ToolMatch = {
  rankResult: function(a: IMatch.IToolMatchResult) : number {
    return rankToolMatch(a);
  },
  isAnyMatch: function(toolmatch : IMatch.IToolMatch) : boolean  {
    return (Object.keys(toolmatch.toolmatchresult.required).length +
     Object.keys(toolmatch.toolmatchresult.optional).length) > 0;
  },
  compBetterMatch(a : IMatch.IToolMatch, b : IMatch.IToolMatch) {
    return rankToolMatch(b.toolmatchresult ) - rankToolMatch(a.toolmatchresult);
  },
  isComplete: function(toolmatch: IMatch.IToolMatch) {
    return Object.keys(toolmatch.toolmatchresult.missing).length === 0;
  },

  dumpNiceTop : function(toolmatches : Array<IMatch.IToolMatch>, options : any) {
    var s = '';
    toolmatches.forEach(function(oMatch,index) {
      if ( index < options.top) {
        s = s + "Toolmatch[" + index + "]...\n";
        s = s + ToolMatch.dumpNice(oMatch);
      }
    });
    return s;
  },

  dumpNice : function(toolmatch : IMatch.IToolMatch) {
    var result = {
      s : "",
      push : function(s) { this.s = this.s + s; }
    };
    var s =
`**Result for tool: ${toolmatch.tool.name}
 rank: ${toolmatch.rank}
`;
    result.push(s);
    Object.keys(toolmatch.tool.requires).forEach(function(sRequires,index) {
      result.push(`required: ${sRequires} -> `);
      if (toolmatch.toolmatchresult.required[sRequires]) {
        result.push('"' + toolmatch.toolmatchresult.required[sRequires].matchedString + '"');
      } else {
        result.push(`? missing!`);
      }
      result.push('\n');
    });

    Object.keys(toolmatch.tool.optional).forEach(function(sRequires,index) {
      result.push(`optional : ${sRequires} -> `);
      if (toolmatch.toolmatchresult.optional[sRequires]) {
        result.push('"' + toolmatch.toolmatchresult.optional[sRequires].matchedString + '"');
    } else {
        result.push(`?`);
      }
      result.push('\n');
    });
    var oSentence = toolmatch.sentence;
    oSentence.forEach(function(oWord, index) {
      var sWord = `[${index}] : ${oWord.category} "${oWord.string}" => "${oWord.matchedString}"`
      result.push(sWord + "\n");
    })
    result.push(".\n");
    return result.s;

  },

  dumpWeightsTop : function(toolmatches : Array<IMatch.IToolMatch>, options : any) {
    var s = '';
    toolmatches.forEach(function(oMatch,index) {
      if ( index < options.top) {
        s = s + "Toolmatch[" + index + "]...\n";
        s = s + ToolMatch.dumpWeights(oMatch);
      }
    });
    return s;
  },

  dumpWeights : function(toolmatch : IMatch.IToolMatch) {
    var result = {
      s : "",
      push : function(s) { this.s = this.s + s; }
    };

  var requires = Object.keys(toolmatch.tool.requires).length;
  var required = Object.keys(toolmatch.toolmatchresult.required).length;

    var spurious = Object.keys(toolmatch.toolmatchresult.spurious).length;
    var s =
`**Result for tool: ${toolmatch.tool.name}
 rank: ${toolmatch.rank}  (req:${required}/${requires}   ${spurious})
`
    result.push(s);
    Object.keys(toolmatch.tool.requires).forEach(function(sRequires,index) {
      result.push(`required: ${sRequires} -> `);
      if (toolmatch.toolmatchresult.required[sRequires]) {
        result.push('"' + toolmatch.toolmatchresult.required[sRequires].matchedString + '"');
      } else {
        result.push(`? missing!`);
      }
      result.push('\n');
    });

    Object.keys(toolmatch.tool.optional).forEach(function(sRequires,index) {
      result.push(`optional : ${sRequires} -> `);
      if (toolmatch.toolmatchresult.optional[sRequires]) {
        result.push('"' + toolmatch.toolmatchresult.optional[sRequires].matchedString + '"');
    } else {
        result.push(`?`);
      }
      result.push('\n');
    });
    var oSentence = toolmatch.sentence;
    oSentence.forEach(function(oWord, index) {
      var sWord = `[${index}] : ${oWord.category} "${oWord.string}" => "${oWord.matchedString}"  (_r:${oWord._ranking}/${oWord.reinforce || ''}/${oWord.levenmatch || ''})`
      result.push(sWord + "\n");
    })
    result.push(".\n");
    return result.s;

  }
}


export const Result = {
  getEntity: function(match : IMatch.IToolMatch, key : string) : IMatch.IWord {
    if(!match.toolmatchresult) {
      return undefined;
    }

    if(match.toolmatchresult.required[key]) {
      return match.toolmatchresult.required[key];
    }
    if(match.toolmatchresult.optional[key]) {
      return match.toolmatchresult.optional[key];
    }
    return undefined;
  }
}