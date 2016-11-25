/**
 * @file match
 * @module jfseb.fdevstart.match
 * @copyright (c) Gerd Forstmann
 *
 *
 * Judging function for a match
 */
"use strict";
var debug = require('debug');
var debuglog = debug('match');
function rankToolMatch(a) {
    var missing = Object.keys(a.missing || {}).length;
    var required = Object.keys(a.required || {}).length;
    var optional = Object.keys(a.optional || {}).length;
    var spurious = Object.keys(a.spurious || {}).length;
    var matching = required + optional;
    debuglog("caluclating rank of " + JSON.stringify(a));
    var factor1 = Object.keys(a.required).reduce(function (prev, sCategory) {
        return prev *= a.required[sCategory]._ranking;
    }, 1.0);
    var factor = Object.keys(a.optional).reduce(function (prev, sCategory) {
        return prev *= a.optional[sCategory]._ranking;
    }, factor1);
    var res = matching * 100 - 30 * missing - 10 * spurious + factor;
    debuglog("result is " + factor + " res" + res);
    return res;
}
exports.rankToolMatch = rankToolMatch;
;
exports.ToolMatch = {
    rankResult: function (a) {
        return rankToolMatch(a);
    },
    isAnyMatch: function (toolmatch) {
        return (Object.keys(toolmatch.toolmatchresult.required).length +
            Object.keys(toolmatch.toolmatchresult.optional).length) > 0;
    },
    compBetterMatch: function (a, b) {
        return rankToolMatch(b.toolmatchresult) - rankToolMatch(a.toolmatchresult);
    },
    isComplete: function (toolmatch) {
        return Object.keys(toolmatch.toolmatchresult.missing).length === 0;
    },
    dumpNiceTop: function (toolmatches, options) {
        var s = '';
        toolmatches.forEach(function (oMatch, index) {
            if (index < options.top) {
                s = s + "Toolmatch[" + index + "]...\n";
                s = s + exports.ToolMatch.dumpNice(oMatch);
            }
        });
        return s;
    },
    dumpNice: function (toolmatch) {
        var result = {
            s: "",
            push: function (s) { this.s = this.s + s; }
        };
        var s = "**Result for tool: " + toolmatch.tool.name + "\n rank: " + toolmatch.rank + "\n";
        result.push(s);
        Object.keys(toolmatch.tool.requires).forEach(function (sRequires, index) {
            result.push("required: " + sRequires + " -> ");
            if (toolmatch.toolmatchresult.required[sRequires]) {
                result.push('"' + toolmatch.toolmatchresult.required[sRequires].matchedString + '"');
            }
            else {
                result.push("? missing!");
            }
            result.push('\n');
        });
        Object.keys(toolmatch.tool.optional).forEach(function (sRequires, index) {
            result.push("optional : " + sRequires + " -> ");
            if (toolmatch.toolmatchresult.optional[sRequires]) {
                result.push('"' + toolmatch.toolmatchresult.optional[sRequires].matchedString + '"');
            }
            else {
                result.push("?");
            }
            result.push('\n');
        });
        var oSentence = toolmatch.sentence;
        oSentence.forEach(function (oWord, index) {
            var sWord = "[" + index + "] : " + oWord.category + " \"" + oWord.string + "\" => \"" + oWord.matchedString + "\"";
            result.push(sWord + "\n");
        });
        result.push(".\n");
        return result.s;
    },
    dumpWeightsTop: function (toolmatches, options) {
        var s = '';
        toolmatches.forEach(function (oMatch, index) {
            if (index < options.top) {
                s = s + "Toolmatch[" + index + "]...\n";
                s = s + exports.ToolMatch.dumpWeights(oMatch);
            }
        });
        return s;
    },
    dumpWeights: function (toolmatch) {
        var result = {
            s: "",
            push: function (s) { this.s = this.s + s; }
        };
        var requires = Object.keys(toolmatch.tool.requires).length;
        var required = Object.keys(toolmatch.toolmatchresult.required).length;
        var spurious = Object.keys(toolmatch.toolmatchresult.spurious).length;
        var s = "**Result for tool: " + toolmatch.tool.name + "\n rank: " + toolmatch.rank + "  (req:" + required + "/" + requires + "   " + spurious + ")\n";
        result.push(s);
        Object.keys(toolmatch.tool.requires).forEach(function (sRequires, index) {
            result.push("required: " + sRequires + " -> ");
            if (toolmatch.toolmatchresult.required[sRequires]) {
                result.push('"' + toolmatch.toolmatchresult.required[sRequires].matchedString + '"');
            }
            else {
                result.push("? missing!");
            }
            result.push('\n');
        });
        Object.keys(toolmatch.tool.optional).forEach(function (sRequires, index) {
            result.push("optional : " + sRequires + " -> ");
            if (toolmatch.toolmatchresult.optional[sRequires]) {
                result.push('"' + toolmatch.toolmatchresult.optional[sRequires].matchedString + '"');
            }
            else {
                result.push("?");
            }
            result.push('\n');
        });
        var oSentence = toolmatch.sentence;
        oSentence.forEach(function (oWord, index) {
            var sWord = "[" + index + "] : " + oWord.category + " \"" + oWord.string + "\" => \"" + oWord.matchedString + "\"  (_r:" + oWord._ranking + "/" + (oWord.reinforce || '') + "/" + (oWord.levenmatch || '') + ")";
            result.push(sWord + "\n");
        });
        result.push(".\n");
        return result.s;
    }
};

//# sourceMappingURL=match.js.map
