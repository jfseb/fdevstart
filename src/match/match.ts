/**
 * @file match
 * @module jfseb.fdevstart.match
 * @copyright (c) Gerd Forstmann
 *
 *
 * Judging function for a match
 */

import * as IMatch from './ifmatch';


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
  }
}