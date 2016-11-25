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
"use strict";
// / <reference path="../../lib/node-4.d.ts" />
var debug = require('debug');
var utils = require('../utils/utils');
var Sentence = require('./sentence');
var OpsWord = require('./word');
var Word = OpsWord.Word;
var Category = OpsWord.Category;
var debuglog = debug('toolmatcher');
function matchTool(oSentence, oTool) {
    var used = {};
    var required = {};
    var optional = {};
    var matched = {};
    var spurious = {};
    var toolmentioned = [];
    Object.keys(oTool.requires || {}).forEach(function (sCategory) {
        var _a = Sentence.findWordByCategory(oSentence, sCategory), word = _a.word, index = _a.index;
        if (word) {
            matched[word] = "required";
            used[index] = 1;
            required[sCategory] = word;
        }
    });
    Object.keys(oTool.optional || {}).forEach(function (sCategory) {
        var _a = Sentence.findWordByCategory(oSentence, sCategory), word = _a.word, index = _a.index;
        if (word) {
            matched[word] = "optional";
            used[index] = 1;
            optional[sCategory] = word;
        }
    });
    oSentence.forEach(function (oWord, index) {
        if (!used[index] && !Word.isFiller(oWord) && !Word.isCategory(oWord)) {
            debuglog("have spurious word" + JSON.stringify(oWord));
            if (!used[index] && oWord.category === Category.CAT_TOOL && oWord.matchedString === oTool.name) {
                toolmentioned.push(oWord);
            }
            else {
                spurious[oWord.matchedString] = 1;
            }
        }
    });
    debuglog('satisfied : ' + Object.keys(oTool.requires).join(";"));
    debuglog('required  : ' + Object.keys(oTool.requires).join(";"));
    var missing = utils.ArrayUtils.setMinus(Object.keys(oTool.requires), Object.keys(required)).reduce(function (map, sKey) {
        map[sKey] = 1;
        return map;
    }, {});
    return {
        required: required,
        missing: missing,
        optional: optional,
        spurious: spurious,
        toolmentioned: toolmentioned
    };
}
exports.matchTool = matchTool;
var match = require('./match');
var ToolMatch = match.ToolMatch;
function matchTools(aSentences, aTool) {
    //var stream = new streamutils.MatchStream();
    var result = [];
    aTool.forEach(function (oTool) {
        aSentences.forEach(function (oSentence) {
            var toolmatchresult = matchTool(oSentence, oTool);
            var toolmatch = {
                toolmatchresult: toolmatchresult,
                sentence: oSentence,
                tool: oTool,
                rank: 0
            };
            toolmatch.rank = ToolMatch.rankResult(toolmatch.toolmatchresult);
            if (ToolMatch.isAnyMatch(toolmatch)) {
                result.push(toolmatch);
            }
        });
    });
    result.sort(ToolMatch.compBetterMatch);
    return result;
}
exports.matchTools = matchTools;

//# sourceMappingURL=toolmatcher.js.map
