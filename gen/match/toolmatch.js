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
"use strict";
// / <reference path="../../lib/node-4.d.ts" />
var debug = require("debug");
var debuglog = debug('toolmatch');
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
var Sentence = require("./sentence");
function cmpToolSet(sets, a, b) {
    return -(sets[a].set.length - sets[b].set.length);
}
/**
 * This onyl finds the best matching sets (=longest match)
 * independent of a record
 */
function findMatchingSets(a) {
    var matchingSets = Object.keys(a.tool.sets).filter(function (sSetKey) {
        var oSet = a.tool.sets[sSetKey];
        debuglog('here the set for tool ' + a.tool.name + " " + JSON.stringify(oSet));
        return oSet.set.every(function (category) {
            var word = Sentence.findWordByCategory(a.sentence, category);
            var b = !!(word && (word.word !== undefined));
            debuglog("searchign for category " + category + " " + b);
            return b;
        });
    });
    if (matchingSets.length === 0) {
        return []; // undefined;
    }
    var cmpThisToolSet = cmpToolSet.bind(undefined, a.tool.sets);
    matchingSets.sort(cmpThisToolSet);
    debuglog("best sets ordered " + matchingSets.join(","));
    matchingSets = matchingSets.filter(function (sKey) {
        if (!cmpThisToolSet(matchingSets[0], sKey)) {
            return true;
        }
        return false;
    });
    if (matchingSets.length > 1) {
        debuglog("More than one set matches: \"" + matchingSets.join('";"') + "for match:\n" + JSON.stringify(a, undefined, 2));
    }
    return matchingSets.sort();
}
exports.findMatchingSets = findMatchingSets;
function findBestMatchingSet(a) {
    var matchingSets = findMatchingSets(a);
    if (matchingSets && matchingSets.length) {
        return a.tool.sets[matchingSets[0]];
    }
    return undefined;
}
exports.findBestMatchingSet = findBestMatchingSet;
function isMatchingRecord(matchset, setcommand, record) {
    var res = Object.keys(matchset).every(function (category) {
        var value = matchset[category];
        if ((value === record[category]) || (record[category] === '*')) {
            return true;
        }
        return false;
    });
    if (!res) {
        return false;
    }
    if (!record[setcommand]) {
        // THROW?
        debuglog("Matching record lacks setcommand" + setcommand + " match:" + JSON.stringify(record) + " match " + JSON.stringify(matchset));
        return false;
    }
    return true;
}
exports.isMatchingRecord = isMatchingRecord;
function makeMatchSet(a, toolset) {
    var res = {};
    toolset.set.forEach(function (category) {
        res[category] = Sentence.findWordByCategory(a.sentence, category).word.matchedString;
    });
    Object.freeze(res);
    return res;
}
exports.makeMatchSet = makeMatchSet;
function findSetRecords(a, setIds, aRecords) {
    var res = [];
    setIds.forEach(function (setId) {
        var set = a.tool.sets[setId];
        var matchset = makeMatchSet(a, set);
        var filteredRecords = aRecords.filter(function (record) {
            return isMatchingRecord(matchset, set.response, record);
        });
        filteredRecords.forEach(function (record) {
            res.push({ setId: setId, record: record });
        });
    });
    // TODO SORT?
    return res;
}
exports.findSetRecords = findSetRecords;
function findFirstSetRecord(toolMatchResult, records) {
    var setIds = findMatchingSets(toolMatchResult);
    var res = findSetRecords(toolMatchResult, setIds, records);
    if (res) {
        return res[0];
    }
    return undefined;
}
exports.findFirstSetRecord = findFirstSetRecord;

//# sourceMappingURL=toolmatch.js.map
