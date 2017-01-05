/**
 * @file toolmatch
 * @module jfseb.fdevstart.toolmatch
 * @copyright (c) Gerd Forstmann
 *
 * Methods operating on a matched tool,
 *
 * This will unify matching required and optional category words
 * with the requirements of the tool.
 *
 */

// / <reference path="../../lib/node-4.d.ts" />

import * as debug from 'debug';
import * as IMatch from './ifmatch';
const debuglog = debug('toolmatch');

/*
var oToolFLP = {
  'name': 'FLP',
  'requires': { 'systemId': {}, 'client': {} },
  "optional": {
    "fiori intent": {}
  },
  "sets": {
    "intent": {
      "set": [
        "systemId",
        "client",
        "fiori intent"
      ],
      "response": "_urlpattern1"
    },
    "none": {
      "set": [
        "systemId",
        "client"
      ],
      "response": "_urlpattern2"
    }
  }
};
*/

import * as Sentence from './sentence';

function cmpToolSet(sets : IMatch.IToolSets, a : string, b:string) {
  return -(sets[a].set.length - sets[b].set.length);
}


/**
 * This onyl finds the best matching sets (=longest match)
 * independent of a record
 */
export function findMatchingSets(a : IMatch.IToolMatch ) : string[] {
  var matchingSets = Object.keys(a.tool.sets).filter(function(sSetKey) {
    var oSet = a.tool.sets[sSetKey];
    debuglog('here the set for tool ' + a.tool.name + " " + JSON.stringify(oSet));
    return oSet.set.every(function(category : string) :boolean {
      var word = Sentence.findWordByCategory(a.sentence, category);
      var b = !!(word && (word.word !== undefined));
      debuglog("searchign for category " + category + " " + b);
      return b;
    });
  });
  if(matchingSets.length === 0) {
    return []; // undefined;
  }
  var cmpThisToolSet = cmpToolSet.bind(undefined, a.tool.sets);
  matchingSets.sort(cmpThisToolSet);
  debuglog("best sets ordered " + matchingSets.join(","));
  matchingSets = matchingSets.filter(function(sKey) {
    if(!cmpThisToolSet(matchingSets[0],sKey)) {
      return true;
    }
    return false;
  });
  if (matchingSets.length > 1) {
    debuglog("More than one set matches: \"" + matchingSets.join('";"') + "for match:\n" + JSON.stringify(a, undefined,2))
  }
  return matchingSets.sort();
}

export function findBestMatchingSet(a : IMatch.IToolMatch) : IMatch.IToolSet {
  var matchingSets = findMatchingSets(a);
  if(matchingSets && matchingSets.length) {
    return a.tool.sets[matchingSets[0]];
  }
  return undefined;
}


export function isMatchingRecord( matchset : IMatch.IMatchSet, setcommand : string, record : IMatch.IRecord) {

  var res = Object.keys(matchset).every(function(category) {
    var value = matchset[category];
    if ((value === record[category]) ||  (record[category] === '*')) {
      return true;
    }
    return false;
  });
  if(!res) {
    return false;
  }
  if(!record[setcommand]) {
    // THROW?
    debuglog("Matching record lacks setcommand" + setcommand + " match:" + JSON.stringify(record) + " match " + JSON.stringify(matchset) )
    return false;
 }
  return true;
}

export function makeMatchSet(a : IMatch.IToolMatch, toolset : IMatch.IToolSet) : IMatch.IMatchSet {
  var res = {} as IMatch.IMatchSet;
  toolset.set.forEach(function(category) {
    res[category] = Sentence.findWordByCategory(a.sentence, category).word.matchedString;
  });
  Object.freeze(res);
  return res;
}


export function findSetRecords(a : IMatch.IToolMatch, setIds : string[], aRecords : IMatch.IRecord[]) : IMatch.IMatchedSetRecords {
  var res = [] as IMatch.IMatchedSetRecord[];
  setIds.forEach(function(setId) {
    var set = a.tool.sets[setId];
    var matchset = makeMatchSet(a, set);
    var filteredRecords = aRecords.filter(function(record) {
      return isMatchingRecord(matchset, set.response, record);
    })
    filteredRecords.forEach(function(record) {
      res.push({ setId : setId, record: record});
    })
  })
  // TODO SORT?
  return res;
}

export function findFirstSetRecord(toolMatchResult: IMatch.IToolMatch, records: IMatch.IRecord[]) : IMatch.IMatchedSetRecord {
  var setIds = findMatchingSets(toolMatchResult);
  var res = findSetRecords(toolMatchResult, setIds, records);
  if (res) {
    return res[0];
  }
  return undefined;
}
