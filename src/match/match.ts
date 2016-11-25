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

export function rankToolMatch(a: IMatch.IToolMatchResult) : number {
  var missing = Object.keys(a.missing || {}).length;
  var required = Object.keys(a.required || {}).length;
  var optional = Object.keys(a.optional || {}) .length;
  var spurious = Object.keys(a.spurious || {}).length;
  var matching = required + optional;
  return matching * 100 - 3 * missing;
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

  }
}