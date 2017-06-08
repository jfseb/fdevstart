"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
// / <reference path="../../lib/node-4.d.ts" />
const debug = require("debug");
const Utils = require("abot_utils");
const abot_erbase_1 = require("abot_erbase");
const abot_erbase_2 = require("abot_erbase");
const Word = abot_erbase_2.Word.Word;
const Category = abot_erbase_2.Word.Category;
const debuglog = debug('toolmatcher');
function matchTool(oSentence, oTool) {
    var used = {};
    var required = {};
    var optional = {};
    var matched = {};
    var spurious = {};
    var toolmentioned = [];
    Object.keys(oTool.requires || {}).forEach(function (sCategory) {
        let { word, index } = abot_erbase_1.Sentence.findWordByCategory(oSentence, sCategory);
        if (word) {
            matched[word] = "required";
            used[index] = 1;
            required[sCategory] = word;
        }
    });
    Object.keys(oTool.optional || {}).forEach(function (sCategory) {
        var { word, index } = abot_erbase_1.Sentence.findWordByCategory(oSentence, sCategory);
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
    var missing = Utils.ArrayUtils.setMinus(Object.keys(oTool.requires), Object.keys(required)).reduce(function (map, sKey) {
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
const match = require("./match");
const ToolMatch = match.ToolMatch;
function matchTools(aSentences, aTool) {
    //var stream = new streamutils.MatchStream();
    debuglog("matchTools: sentences \n" +
        aSentences.map(function (oSentence, index) {
            return (index < 30) ? `[${index}]` + abot_erbase_1.Sentence.rankingProduct(oSentence) + ":" + abot_erbase_1.Sentence.dumpNice(oSentence) : "\n";
        }).join("\n"));
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
    if (debuglog.enabled) {
        debuglog("matchTools: ranked toolmatches\n" +
            result.map(function (otoolmatch) {
                return abot_erbase_1.Sentence.dumpNice(otoolmatch.sentence) + JSON.stringify(otoolmatch);
            }).join("\n"));
    }
    return result;
}
exports.matchTools = matchTools;

//# sourceMappingURL=toolmatcher.js.map
