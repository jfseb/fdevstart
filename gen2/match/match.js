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
function weakenByN(a, n) {
    return 1.0 + (a - 1.0) / n;
}
function calcGeometricMeansOfRanking(oSet) {
    var keys = Object.keys(oSet);
    if (!keys.length) {
        return 1.0;
    }
    var factor = Object.keys(oSet).reduce(function (prev, sCategory) {
        return prev *= oSet[sCategory]._ranking;
    }, 1.0);
    return Math.pow(factor, 1 / keys.length);
}
/**
 * Calculate a number to rank a matched tool
 *
 *
 */
function rankToolMatch(a) {
    var missing = Object.keys(a.missing || {}).length;
    var required = Object.keys(a.required || {}).length;
    var optional = Object.keys(a.optional || {}).length;
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
    if (a.toolmentioned) {
        res *= 1.1;
    }
    var res = missingDeprec * spuriousDeprec * weakenByN(rankingRequired * rankingOptional, 10);
    //  var res =  matching * 100 - 30 * missing  -  10* spurious + factor;
    debuglog("result is " + res);
    return res;
}
exports.rankToolMatch = rankToolMatch;
;
exports.ToolMatch = {
    rankResult: function rankResult(a) {
        return rankToolMatch(a);
    },
    isAnyMatch: function isAnyMatch(toolmatch) {
        return Object.keys(toolmatch.toolmatchresult.required).length + Object.keys(toolmatch.toolmatchresult.optional).length > 0;
    },
    compBetterMatch: function compBetterMatch(a, b) {
        return rankToolMatch(b.toolmatchresult) - rankToolMatch(a.toolmatchresult);
    },
    isComplete: function isComplete(toolmatch) {
        return Object.keys(toolmatch.toolmatchresult.missing).length === 0;
    },
    dumpNiceTop: function dumpNiceTop(toolmatches, options) {
        var s = '';
        toolmatches.forEach(function (oMatch, index) {
            if (index < options.top) {
                s = s + "Toolmatch[" + index + "]...\n";
                s = s + exports.ToolMatch.dumpNice(oMatch);
            }
        });
        return s;
    },
    dumpNice: function dumpNice(toolmatch) {
        var result = {
            s: "",
            push: function push(s) {
                this.s = this.s + s;
            }
        };
        var s = "**Result for tool: " + toolmatch.tool.name + "\n rank: " + toolmatch.rank + "\n";
        result.push(s);
        Object.keys(toolmatch.tool.requires).forEach(function (sRequires, index) {
            result.push("required: " + sRequires + " -> ");
            if (toolmatch.toolmatchresult.required[sRequires]) {
                result.push('"' + toolmatch.toolmatchresult.required[sRequires].matchedString + '"');
            } else {
                result.push("? missing!");
            }
            result.push('\n');
        });
        Object.keys(toolmatch.tool.optional).forEach(function (sRequires, index) {
            result.push("optional : " + sRequires + " -> ");
            if (toolmatch.toolmatchresult.optional[sRequires]) {
                result.push('"' + toolmatch.toolmatchresult.optional[sRequires].matchedString + '"');
            } else {
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
    dumpWeightsTop: function dumpWeightsTop(toolmatches, options) {
        var s = '';
        toolmatches.forEach(function (oMatch, index) {
            if (index < options.top) {
                s = s + "Toolmatch[" + index + "]...\n";
                s = s + exports.ToolMatch.dumpWeights(oMatch);
            }
        });
        return s;
    },
    dumpWeights: function dumpWeights(toolmatch) {
        var result = {
            s: "",
            push: function push(s) {
                this.s = this.s + s;
            }
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
            } else {
                result.push("? missing!");
            }
            result.push('\n');
        });
        Object.keys(toolmatch.tool.optional).forEach(function (sRequires, index) {
            result.push("optional : " + sRequires + " -> ");
            if (toolmatch.toolmatchresult.optional[sRequires]) {
                result.push('"' + toolmatch.toolmatchresult.optional[sRequires].matchedString + '"');
            } else {
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
exports.Result = {
    getEntity: function getEntity(match, key) {
        if (!match.toolmatchresult) {
            return undefined;
        }
        if (match.toolmatchresult.required[key]) {
            return match.toolmatchresult.required[key];
        }
        if (match.toolmatchresult.optional[key]) {
            return match.toolmatchresult.optional[key];
        }
        return undefined;
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9tYXRjaC50cyIsIm1hdGNoL21hdGNoLmpzIl0sIm5hbWVzIjpbImRlYnVnIiwicmVxdWlyZSIsImRlYnVnbG9nIiwid2Vha2VuQnlOIiwiYSIsIm4iLCJjYWxjR2VvbWV0cmljTWVhbnNPZlJhbmtpbmciLCJvU2V0Iiwia2V5cyIsIk9iamVjdCIsImxlbmd0aCIsImZhY3RvciIsInJlZHVjZSIsInByZXYiLCJzQ2F0ZWdvcnkiLCJfcmFua2luZyIsIk1hdGgiLCJwb3ciLCJyYW5rVG9vbE1hdGNoIiwibWlzc2luZyIsInJlcXVpcmVkIiwib3B0aW9uYWwiLCJzcHVyaW91cyIsIm1hdGNoaW5nIiwiSlNPTiIsInN0cmluZ2lmeSIsInJhbmtpbmdSZXF1aXJlZCIsInJhbmtpbmdPcHRpb25hbCIsInNwdXJpb3VzRGVwcmVjIiwibWlzc2luZ0RlcHJlYyIsInRvb2xtZW50aW9uZWQiLCJyZXMiLCJleHBvcnRzIiwiVG9vbE1hdGNoIiwicmFua1Jlc3VsdCIsImlzQW55TWF0Y2giLCJ0b29sbWF0Y2giLCJ0b29sbWF0Y2hyZXN1bHQiLCJjb21wQmV0dGVyTWF0Y2giLCJiIiwiaXNDb21wbGV0ZSIsImR1bXBOaWNlVG9wIiwidG9vbG1hdGNoZXMiLCJvcHRpb25zIiwicyIsImZvckVhY2giLCJvTWF0Y2giLCJpbmRleCIsInRvcCIsImR1bXBOaWNlIiwicmVzdWx0IiwicHVzaCIsInRvb2wiLCJuYW1lIiwicmFuayIsInJlcXVpcmVzIiwic1JlcXVpcmVzIiwibWF0Y2hlZFN0cmluZyIsIm9TZW50ZW5jZSIsInNlbnRlbmNlIiwib1dvcmQiLCJzV29yZCIsImNhdGVnb3J5Iiwic3RyaW5nIiwiZHVtcFdlaWdodHNUb3AiLCJkdW1wV2VpZ2h0cyIsInJlaW5mb3JjZSIsImxldmVubWF0Y2giLCJSZXN1bHQiLCJnZXRFbnRpdHkiLCJtYXRjaCIsImtleSIsInVuZGVmaW5lZCJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7O0FDUUE7O0FERUEs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cUI7QUFDckMsZ0JBQUljLFFBQVEsTUFBSWQsS0FBSixHQUFTLE1BQVQsR0FBZ0JhLE1BQU1FLFFBQXRCLEdBQThCLEtBQTlCLEdBQW1DRixNQUFNRyxNQUF6QyxHQUErQyxVQUEvQyxHQUF3REgsTUFBTUgsYUFBOUQsR0FBMkUsVUFBM0UsR0FBcUZHLE1BQU03QyxRQUEzRixHQUFtRyxHQUFuRyxJQUF1RzZDLE1BQU1NLFNBQU4sSUFBbUIsRUFBMUgsSUFBNEgsR0FBNUgsSUFBZ0lOLE1BQU1PLFVBQU4sSUFBb0IsRUFBcEosSUFBc0osR0FBbEs7QUFDQWpCLG1CQUFPQyxJQUFQLENBQVlVLFFBQVEsSUFBcEI7QUFDRCxTQUhEO0FBSUFYLGVBQU9DLElBQVAsQ0FBWSxLQUFaO0FBQ0EsZUFBT0QsT0FBT04sQ0FBZDtBQUVEO0FBdEhzQixDQUFaO0FBMEhBWixRQUFBb0MsTUFBQSxHQUFTO0FBQ3BCQyxlQUFXLG1CQUFTQyxLQUFULEVBQW9DQyxHQUFwQyxFQUFnRDtBQUN6RCxZQUFHLENBQUNELE1BQU1qQyxlQUFWLEVBQTJCO0FBQ3pCLG1CQUFPbUMsU0FBUDtBQUNEO0FBRUQsWUFBR0YsTUFBTWpDLGVBQU4sQ0FBc0JqQixRQUF0QixDQUErQm1ELEdBQS9CLENBQUgsRUFBd0M7QUFDdEMsbUJBQU9ELE1BQU1qQyxlQUFOLENBQXNCakIsUUFBdEIsQ0FBK0JtRCxHQUEvQixDQUFQO0FBQ0Q7QUFDRCxZQUFHRCxNQUFNakMsZUFBTixDQUFzQmhCLFFBQXRCLENBQStCa0QsR0FBL0IsQ0FBSCxFQUF3QztBQUN0QyxtQkFBT0QsTUFBTWpDLGVBQU4sQ0FBc0JoQixRQUF0QixDQUErQmtELEdBQS9CLENBQVA7QUFDRDtBQUNELGVBQU9DLFNBQVA7QUFDRDtBQWJtQixDQUFUIiwiZmlsZSI6Im1hdGNoL21hdGNoLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAZmlsZSBtYXRjaFxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQubWF0Y2hcbiAqIEBjb3B5cmlnaHQgKGMpIEdlcmQgRm9yc3RtYW5uXG4gKlxuICpcbiAqIEp1ZGdpbmcgZnVuY3Rpb24gZm9yIGEgbWF0Y2hcbiAqL1xuXG5cbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ21hdGNoJyk7XG5pbXBvcnQgKiBhcyBJTWF0Y2ggZnJvbSAnLi9pZm1hdGNoJztcbmltcG9ydCAqIGFzIHN0cmVhbSBmcm9tICdzdHJlYW0nO1xuXG5cbmZ1bmN0aW9uIHdlYWtlbkJ5TihhIDogbnVtYmVyLCBuIDogbnVtYmVyKSA6IG51bWJlciB7XG4gIHJldHVybiAxLjAgKyAoYS0xLjApL247XG59XG5cbmZ1bmN0aW9uIGNhbGNHZW9tZXRyaWNNZWFuc09mUmFua2luZyhvU2V0KSB7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMob1NldCk7XG4gIGlmKCFrZXlzLmxlbmd0aCkge1xuICAgIHJldHVybiAxLjA7XG4gIH1cbiAgdmFyIGZhY3RvciA9IE9iamVjdC5rZXlzKG9TZXQpLnJlZHVjZShmdW5jdGlvbihwcmV2LCBzQ2F0ZWdvcnkpIHtcbiAgICByZXR1cm4gcHJldiAqPSBvU2V0W3NDYXRlZ29yeV0uX3Jhbmtpbmc7XG4gIH0sMS4wKTtcbiAgcmV0dXJuIE1hdGgucG93KGZhY3RvciwgMS9rZXlzLmxlbmd0aCk7XG59XG4vKipcbiAqIENhbGN1bGF0ZSBhIG51bWJlciB0byByYW5rIGEgbWF0Y2hlZCB0b29sXG4gKlxuICpcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJhbmtUb29sTWF0Y2goYTogSU1hdGNoLklUb29sTWF0Y2hSZXN1bHQpIDogbnVtYmVyIHtcbiAgdmFyIG1pc3NpbmcgPSBPYmplY3Qua2V5cyhhLm1pc3NpbmcgfHwge30pLmxlbmd0aDtcbiAgdmFyIHJlcXVpcmVkID0gT2JqZWN0LmtleXMoYS5yZXF1aXJlZCB8fCB7fSkubGVuZ3RoO1xuICB2YXIgb3B0aW9uYWwgPSBPYmplY3Qua2V5cyhhLm9wdGlvbmFsIHx8IHt9KSAubGVuZ3RoO1xuICB2YXIgc3B1cmlvdXMgPSBPYmplY3Qua2V5cyhhLnNwdXJpb3VzIHx8IHt9KS5sZW5ndGg7XG4gIHZhciBtYXRjaGluZyA9IHJlcXVpcmVkICsgb3B0aW9uYWw7XG4gIGRlYnVnbG9nKFwiY2FsdWNsYXRpbmcgcmFuayBvZiBcIiArIEpTT04uc3RyaW5naWZ5KGEpKTtcbiAgdmFyIHJhbmtpbmdSZXF1aXJlZCA9IGNhbGNHZW9tZXRyaWNNZWFuc09mUmFua2luZyhhLnJlcXVpcmVkKTtcbiAgdmFyIHJhbmtpbmdPcHRpb25hbCA9IGNhbGNHZW9tZXRyaWNNZWFuc09mUmFua2luZyhhLm9wdGlvbmFsKTtcblxuICAvLyAxLjEgZm9yIGV2ZXJ5IG9wdGlvbmFsO1xuXG4gLy8gIDAuOSBmb3IgZXZlcnkgc3B1cmlvdXNcbiAvLyAgZm9yIGV2ZXJ5IHJlcXVpcmVkXG4gdmFyIHNwdXJpb3VzRGVwcmVjID0gTWF0aC5wb3coMC45LCBPYmplY3Qua2V5cyhhLnNwdXJpb3VzKS5sZW5ndGgpO1xuIC8vIDAuOCBmb3IgZXZlcnkgbWlzc2luZztcbiB2YXIgbWlzc2luZ0RlcHJlYyA9IE1hdGgucG93KDAuOCwgT2JqZWN0LmtleXMoYS5taXNzaW5nKS5sZW5ndGgpO1xuXG4gLy8gMS4xIGZvciB0b29sbWVudGlvbmRcbiBpZihhLnRvb2xtZW50aW9uZWQpIHtcbiAgIHJlcyAqPSAxLjE7XG4gfVxuXG4gdmFyIHJlcyA9IG1pc3NpbmdEZXByZWMgKiBzcHVyaW91c0RlcHJlYyAqICh3ZWFrZW5CeU4ocmFua2luZ1JlcXVpcmVkKnJhbmtpbmdPcHRpb25hbCwgMTApKVxuLy8gIHZhciByZXMgPSAgbWF0Y2hpbmcgKiAxMDAgLSAzMCAqIG1pc3NpbmcgIC0gIDEwKiBzcHVyaW91cyArIGZhY3RvcjtcbiAgZGVidWdsb2coXCJyZXN1bHQgaXMgXCIgKyByZXMpO1xuICByZXR1cm4gcmVzO1xufTtcblxuZXhwb3J0IGNvbnN0IFRvb2xNYXRjaCA9IHtcbiAgcmFua1Jlc3VsdDogZnVuY3Rpb24oYTogSU1hdGNoLklUb29sTWF0Y2hSZXN1bHQpIDogbnVtYmVyIHtcbiAgICByZXR1cm4gcmFua1Rvb2xNYXRjaChhKTtcbiAgfSxcbiAgaXNBbnlNYXRjaDogZnVuY3Rpb24odG9vbG1hdGNoIDogSU1hdGNoLklUb29sTWF0Y2gpIDogYm9vbGVhbiAge1xuICAgIHJldHVybiAoT2JqZWN0LmtleXModG9vbG1hdGNoLnRvb2xtYXRjaHJlc3VsdC5yZXF1aXJlZCkubGVuZ3RoICtcbiAgICAgT2JqZWN0LmtleXModG9vbG1hdGNoLnRvb2xtYXRjaHJlc3VsdC5vcHRpb25hbCkubGVuZ3RoKSA+IDA7XG4gIH0sXG4gIGNvbXBCZXR0ZXJNYXRjaChhIDogSU1hdGNoLklUb29sTWF0Y2gsIGIgOiBJTWF0Y2guSVRvb2xNYXRjaCkge1xuICAgIHJldHVybiByYW5rVG9vbE1hdGNoKGIudG9vbG1hdGNocmVzdWx0ICkgLSByYW5rVG9vbE1hdGNoKGEudG9vbG1hdGNocmVzdWx0KTtcbiAgfSxcbiAgaXNDb21wbGV0ZTogZnVuY3Rpb24odG9vbG1hdGNoOiBJTWF0Y2guSVRvb2xNYXRjaCkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyh0b29sbWF0Y2gudG9vbG1hdGNocmVzdWx0Lm1pc3NpbmcpLmxlbmd0aCA9PT0gMDtcbiAgfSxcblxuICBkdW1wTmljZVRvcCA6IGZ1bmN0aW9uKHRvb2xtYXRjaGVzIDogQXJyYXk8SU1hdGNoLklUb29sTWF0Y2g+LCBvcHRpb25zIDogYW55KSB7XG4gICAgdmFyIHMgPSAnJztcbiAgICB0b29sbWF0Y2hlcy5mb3JFYWNoKGZ1bmN0aW9uKG9NYXRjaCxpbmRleCkge1xuICAgICAgaWYgKCBpbmRleCA8IG9wdGlvbnMudG9wKSB7XG4gICAgICAgIHMgPSBzICsgXCJUb29sbWF0Y2hbXCIgKyBpbmRleCArIFwiXS4uLlxcblwiO1xuICAgICAgICBzID0gcyArIFRvb2xNYXRjaC5kdW1wTmljZShvTWF0Y2gpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBzO1xuICB9LFxuXG4gIGR1bXBOaWNlIDogZnVuY3Rpb24odG9vbG1hdGNoIDogSU1hdGNoLklUb29sTWF0Y2gpIHtcbiAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgcyA6IFwiXCIsXG4gICAgICBwdXNoIDogZnVuY3Rpb24ocykgeyB0aGlzLnMgPSB0aGlzLnMgKyBzOyB9XG4gICAgfTtcbiAgICB2YXIgcyA9XG5gKipSZXN1bHQgZm9yIHRvb2w6ICR7dG9vbG1hdGNoLnRvb2wubmFtZX1cbiByYW5rOiAke3Rvb2xtYXRjaC5yYW5rfVxuYDtcbiAgICByZXN1bHQucHVzaChzKTtcbiAgICBPYmplY3Qua2V5cyh0b29sbWF0Y2gudG9vbC5yZXF1aXJlcykuZm9yRWFjaChmdW5jdGlvbihzUmVxdWlyZXMsaW5kZXgpIHtcbiAgICAgIHJlc3VsdC5wdXNoKGByZXF1aXJlZDogJHtzUmVxdWlyZXN9IC0+IGApO1xuICAgICAgaWYgKHRvb2xtYXRjaC50b29sbWF0Y2hyZXN1bHQucmVxdWlyZWRbc1JlcXVpcmVzXSkge1xuICAgICAgICByZXN1bHQucHVzaCgnXCInICsgdG9vbG1hdGNoLnRvb2xtYXRjaHJlc3VsdC5yZXF1aXJlZFtzUmVxdWlyZXNdLm1hdGNoZWRTdHJpbmcgKyAnXCInKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKGA/IG1pc3NpbmchYCk7XG4gICAgICB9XG4gICAgICByZXN1bHQucHVzaCgnXFxuJyk7XG4gICAgfSk7XG5cbiAgICBPYmplY3Qua2V5cyh0b29sbWF0Y2gudG9vbC5vcHRpb25hbCkuZm9yRWFjaChmdW5jdGlvbihzUmVxdWlyZXMsaW5kZXgpIHtcbiAgICAgIHJlc3VsdC5wdXNoKGBvcHRpb25hbCA6ICR7c1JlcXVpcmVzfSAtPiBgKTtcbiAgICAgIGlmICh0b29sbWF0Y2gudG9vbG1hdGNocmVzdWx0Lm9wdGlvbmFsW3NSZXF1aXJlc10pIHtcbiAgICAgICAgcmVzdWx0LnB1c2goJ1wiJyArIHRvb2xtYXRjaC50b29sbWF0Y2hyZXN1bHQub3B0aW9uYWxbc1JlcXVpcmVzXS5tYXRjaGVkU3RyaW5nICsgJ1wiJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0LnB1c2goYD9gKTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdC5wdXNoKCdcXG4nKTtcbiAgICB9KTtcbiAgICB2YXIgb1NlbnRlbmNlID0gdG9vbG1hdGNoLnNlbnRlbmNlO1xuICAgIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uKG9Xb3JkLCBpbmRleCkge1xuICAgICAgdmFyIHNXb3JkID0gYFske2luZGV4fV0gOiAke29Xb3JkLmNhdGVnb3J5fSBcIiR7b1dvcmQuc3RyaW5nfVwiID0+IFwiJHtvV29yZC5tYXRjaGVkU3RyaW5nfVwiYFxuICAgICAgcmVzdWx0LnB1c2goc1dvcmQgKyBcIlxcblwiKTtcbiAgICB9KVxuICAgIHJlc3VsdC5wdXNoKFwiLlxcblwiKTtcbiAgICByZXR1cm4gcmVzdWx0LnM7XG5cbiAgfSxcblxuICBkdW1wV2VpZ2h0c1RvcCA6IGZ1bmN0aW9uKHRvb2xtYXRjaGVzIDogQXJyYXk8SU1hdGNoLklUb29sTWF0Y2g+LCBvcHRpb25zIDogYW55KSB7XG4gICAgdmFyIHMgPSAnJztcbiAgICB0b29sbWF0Y2hlcy5mb3JFYWNoKGZ1bmN0aW9uKG9NYXRjaCxpbmRleCkge1xuICAgICAgaWYgKCBpbmRleCA8IG9wdGlvbnMudG9wKSB7XG4gICAgICAgIHMgPSBzICsgXCJUb29sbWF0Y2hbXCIgKyBpbmRleCArIFwiXS4uLlxcblwiO1xuICAgICAgICBzID0gcyArIFRvb2xNYXRjaC5kdW1wV2VpZ2h0cyhvTWF0Y2gpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBzO1xuICB9LFxuXG4gIGR1bXBXZWlnaHRzIDogZnVuY3Rpb24odG9vbG1hdGNoIDogSU1hdGNoLklUb29sTWF0Y2gpIHtcbiAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgcyA6IFwiXCIsXG4gICAgICBwdXNoIDogZnVuY3Rpb24ocykgeyB0aGlzLnMgPSB0aGlzLnMgKyBzOyB9XG4gICAgfTtcblxuICB2YXIgcmVxdWlyZXMgPSBPYmplY3Qua2V5cyh0b29sbWF0Y2gudG9vbC5yZXF1aXJlcykubGVuZ3RoO1xuICB2YXIgcmVxdWlyZWQgPSBPYmplY3Qua2V5cyh0b29sbWF0Y2gudG9vbG1hdGNocmVzdWx0LnJlcXVpcmVkKS5sZW5ndGg7XG5cbiAgICB2YXIgc3B1cmlvdXMgPSBPYmplY3Qua2V5cyh0b29sbWF0Y2gudG9vbG1hdGNocmVzdWx0LnNwdXJpb3VzKS5sZW5ndGg7XG4gICAgdmFyIHMgPVxuYCoqUmVzdWx0IGZvciB0b29sOiAke3Rvb2xtYXRjaC50b29sLm5hbWV9XG4gcmFuazogJHt0b29sbWF0Y2gucmFua30gIChyZXE6JHtyZXF1aXJlZH0vJHtyZXF1aXJlc30gICAke3NwdXJpb3VzfSlcbmBcbiAgICByZXN1bHQucHVzaChzKTtcbiAgICBPYmplY3Qua2V5cyh0b29sbWF0Y2gudG9vbC5yZXF1aXJlcykuZm9yRWFjaChmdW5jdGlvbihzUmVxdWlyZXMsaW5kZXgpIHtcbiAgICAgIHJlc3VsdC5wdXNoKGByZXF1aXJlZDogJHtzUmVxdWlyZXN9IC0+IGApO1xuICAgICAgaWYgKHRvb2xtYXRjaC50b29sbWF0Y2hyZXN1bHQucmVxdWlyZWRbc1JlcXVpcmVzXSkge1xuICAgICAgICByZXN1bHQucHVzaCgnXCInICsgdG9vbG1hdGNoLnRvb2xtYXRjaHJlc3VsdC5yZXF1aXJlZFtzUmVxdWlyZXNdLm1hdGNoZWRTdHJpbmcgKyAnXCInKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKGA/IG1pc3NpbmchYCk7XG4gICAgICB9XG4gICAgICByZXN1bHQucHVzaCgnXFxuJyk7XG4gICAgfSk7XG5cbiAgICBPYmplY3Qua2V5cyh0b29sbWF0Y2gudG9vbC5vcHRpb25hbCkuZm9yRWFjaChmdW5jdGlvbihzUmVxdWlyZXMsaW5kZXgpIHtcbiAgICAgIHJlc3VsdC5wdXNoKGBvcHRpb25hbCA6ICR7c1JlcXVpcmVzfSAtPiBgKTtcbiAgICAgIGlmICh0b29sbWF0Y2gudG9vbG1hdGNocmVzdWx0Lm9wdGlvbmFsW3NSZXF1aXJlc10pIHtcbiAgICAgICAgcmVzdWx0LnB1c2goJ1wiJyArIHRvb2xtYXRjaC50b29sbWF0Y2hyZXN1bHQub3B0aW9uYWxbc1JlcXVpcmVzXS5tYXRjaGVkU3RyaW5nICsgJ1wiJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0LnB1c2goYD9gKTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdC5wdXNoKCdcXG4nKTtcbiAgICB9KTtcbiAgICB2YXIgb1NlbnRlbmNlID0gdG9vbG1hdGNoLnNlbnRlbmNlO1xuICAgIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uKG9Xb3JkLCBpbmRleCkge1xuICAgICAgdmFyIHNXb3JkID0gYFske2luZGV4fV0gOiAke29Xb3JkLmNhdGVnb3J5fSBcIiR7b1dvcmQuc3RyaW5nfVwiID0+IFwiJHtvV29yZC5tYXRjaGVkU3RyaW5nfVwiICAoX3I6JHtvV29yZC5fcmFua2luZ30vJHtvV29yZC5yZWluZm9yY2UgfHwgJyd9LyR7b1dvcmQubGV2ZW5tYXRjaCB8fCAnJ30pYFxuICAgICAgcmVzdWx0LnB1c2goc1dvcmQgKyBcIlxcblwiKTtcbiAgICB9KVxuICAgIHJlc3VsdC5wdXNoKFwiLlxcblwiKTtcbiAgICByZXR1cm4gcmVzdWx0LnM7XG5cbiAgfVxufVxuXG5cbmV4cG9ydCBjb25zdCBSZXN1bHQgPSB7XG4gIGdldEVudGl0eTogZnVuY3Rpb24obWF0Y2ggOiBJTWF0Y2guSVRvb2xNYXRjaCwga2V5IDogc3RyaW5nKSA6IElNYXRjaC5JV29yZCB7XG4gICAgaWYoIW1hdGNoLnRvb2xtYXRjaHJlc3VsdCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBpZihtYXRjaC50b29sbWF0Y2hyZXN1bHQucmVxdWlyZWRba2V5XSkge1xuICAgICAgcmV0dXJuIG1hdGNoLnRvb2xtYXRjaHJlc3VsdC5yZXF1aXJlZFtrZXldO1xuICAgIH1cbiAgICBpZihtYXRjaC50b29sbWF0Y2hyZXN1bHQub3B0aW9uYWxba2V5XSkge1xuICAgICAgcmV0dXJuIG1hdGNoLnRvb2xtYXRjaHJlc3VsdC5vcHRpb25hbFtrZXldO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59IiwiLyoqXG4gKiBAZmlsZSBtYXRjaFxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQubWF0Y2hcbiAqIEBjb3B5cmlnaHQgKGMpIEdlcmQgRm9yc3RtYW5uXG4gKlxuICpcbiAqIEp1ZGdpbmcgZnVuY3Rpb24gZm9yIGEgbWF0Y2hcbiAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpO1xudmFyIGRlYnVnbG9nID0gZGVidWcoJ21hdGNoJyk7XG5mdW5jdGlvbiB3ZWFrZW5CeU4oYSwgbikge1xuICAgIHJldHVybiAxLjAgKyAoYSAtIDEuMCkgLyBuO1xufVxuZnVuY3Rpb24gY2FsY0dlb21ldHJpY01lYW5zT2ZSYW5raW5nKG9TZXQpIHtcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9TZXQpO1xuICAgIGlmICgha2V5cy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIDEuMDtcbiAgICB9XG4gICAgdmFyIGZhY3RvciA9IE9iamVjdC5rZXlzKG9TZXQpLnJlZHVjZShmdW5jdGlvbiAocHJldiwgc0NhdGVnb3J5KSB7XG4gICAgICAgIHJldHVybiBwcmV2ICo9IG9TZXRbc0NhdGVnb3J5XS5fcmFua2luZztcbiAgICB9LCAxLjApO1xuICAgIHJldHVybiBNYXRoLnBvdyhmYWN0b3IsIDEgLyBrZXlzLmxlbmd0aCk7XG59XG4vKipcbiAqIENhbGN1bGF0ZSBhIG51bWJlciB0byByYW5rIGEgbWF0Y2hlZCB0b29sXG4gKlxuICpcbiAqL1xuZnVuY3Rpb24gcmFua1Rvb2xNYXRjaChhKSB7XG4gICAgdmFyIG1pc3NpbmcgPSBPYmplY3Qua2V5cyhhLm1pc3NpbmcgfHwge30pLmxlbmd0aDtcbiAgICB2YXIgcmVxdWlyZWQgPSBPYmplY3Qua2V5cyhhLnJlcXVpcmVkIHx8IHt9KS5sZW5ndGg7XG4gICAgdmFyIG9wdGlvbmFsID0gT2JqZWN0LmtleXMoYS5vcHRpb25hbCB8fCB7fSkubGVuZ3RoO1xuICAgIHZhciBzcHVyaW91cyA9IE9iamVjdC5rZXlzKGEuc3B1cmlvdXMgfHwge30pLmxlbmd0aDtcbiAgICB2YXIgbWF0Y2hpbmcgPSByZXF1aXJlZCArIG9wdGlvbmFsO1xuICAgIGRlYnVnbG9nKFwiY2FsdWNsYXRpbmcgcmFuayBvZiBcIiArIEpTT04uc3RyaW5naWZ5KGEpKTtcbiAgICB2YXIgcmFua2luZ1JlcXVpcmVkID0gY2FsY0dlb21ldHJpY01lYW5zT2ZSYW5raW5nKGEucmVxdWlyZWQpO1xuICAgIHZhciByYW5raW5nT3B0aW9uYWwgPSBjYWxjR2VvbWV0cmljTWVhbnNPZlJhbmtpbmcoYS5vcHRpb25hbCk7XG4gICAgLy8gMS4xIGZvciBldmVyeSBvcHRpb25hbDtcbiAgICAvLyAgMC45IGZvciBldmVyeSBzcHVyaW91c1xuICAgIC8vICBmb3IgZXZlcnkgcmVxdWlyZWRcbiAgICB2YXIgc3B1cmlvdXNEZXByZWMgPSBNYXRoLnBvdygwLjksIE9iamVjdC5rZXlzKGEuc3B1cmlvdXMpLmxlbmd0aCk7XG4gICAgLy8gMC44IGZvciBldmVyeSBtaXNzaW5nO1xuICAgIHZhciBtaXNzaW5nRGVwcmVjID0gTWF0aC5wb3coMC44LCBPYmplY3Qua2V5cyhhLm1pc3NpbmcpLmxlbmd0aCk7XG4gICAgLy8gMS4xIGZvciB0b29sbWVudGlvbmRcbiAgICBpZiAoYS50b29sbWVudGlvbmVkKSB7XG4gICAgICAgIHJlcyAqPSAxLjE7XG4gICAgfVxuICAgIHZhciByZXMgPSBtaXNzaW5nRGVwcmVjICogc3B1cmlvdXNEZXByZWMgKiAod2Vha2VuQnlOKHJhbmtpbmdSZXF1aXJlZCAqIHJhbmtpbmdPcHRpb25hbCwgMTApKTtcbiAgICAvLyAgdmFyIHJlcyA9ICBtYXRjaGluZyAqIDEwMCAtIDMwICogbWlzc2luZyAgLSAgMTAqIHNwdXJpb3VzICsgZmFjdG9yO1xuICAgIGRlYnVnbG9nKFwicmVzdWx0IGlzIFwiICsgcmVzKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5yYW5rVG9vbE1hdGNoID0gcmFua1Rvb2xNYXRjaDtcbjtcbmV4cG9ydHMuVG9vbE1hdGNoID0ge1xuICAgIHJhbmtSZXN1bHQ6IGZ1bmN0aW9uIChhKSB7XG4gICAgICAgIHJldHVybiByYW5rVG9vbE1hdGNoKGEpO1xuICAgIH0sXG4gICAgaXNBbnlNYXRjaDogZnVuY3Rpb24gKHRvb2xtYXRjaCkge1xuICAgICAgICByZXR1cm4gKE9iamVjdC5rZXlzKHRvb2xtYXRjaC50b29sbWF0Y2hyZXN1bHQucmVxdWlyZWQpLmxlbmd0aCArXG4gICAgICAgICAgICBPYmplY3Qua2V5cyh0b29sbWF0Y2gudG9vbG1hdGNocmVzdWx0Lm9wdGlvbmFsKS5sZW5ndGgpID4gMDtcbiAgICB9LFxuICAgIGNvbXBCZXR0ZXJNYXRjaDogZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIHJhbmtUb29sTWF0Y2goYi50b29sbWF0Y2hyZXN1bHQpIC0gcmFua1Rvb2xNYXRjaChhLnRvb2xtYXRjaHJlc3VsdCk7XG4gICAgfSxcbiAgICBpc0NvbXBsZXRlOiBmdW5jdGlvbiAodG9vbG1hdGNoKSB7XG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyh0b29sbWF0Y2gudG9vbG1hdGNocmVzdWx0Lm1pc3NpbmcpLmxlbmd0aCA9PT0gMDtcbiAgICB9LFxuICAgIGR1bXBOaWNlVG9wOiBmdW5jdGlvbiAodG9vbG1hdGNoZXMsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIHMgPSAnJztcbiAgICAgICAgdG9vbG1hdGNoZXMuZm9yRWFjaChmdW5jdGlvbiAob01hdGNoLCBpbmRleCkge1xuICAgICAgICAgICAgaWYgKGluZGV4IDwgb3B0aW9ucy50b3ApIHtcbiAgICAgICAgICAgICAgICBzID0gcyArIFwiVG9vbG1hdGNoW1wiICsgaW5kZXggKyBcIl0uLi5cXG5cIjtcbiAgICAgICAgICAgICAgICBzID0gcyArIGV4cG9ydHMuVG9vbE1hdGNoLmR1bXBOaWNlKG9NYXRjaCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcztcbiAgICB9LFxuICAgIGR1bXBOaWNlOiBmdW5jdGlvbiAodG9vbG1hdGNoKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgICAgICBzOiBcIlwiLFxuICAgICAgICAgICAgcHVzaDogZnVuY3Rpb24gKHMpIHsgdGhpcy5zID0gdGhpcy5zICsgczsgfVxuICAgICAgICB9O1xuICAgICAgICB2YXIgcyA9IFwiKipSZXN1bHQgZm9yIHRvb2w6IFwiICsgdG9vbG1hdGNoLnRvb2wubmFtZSArIFwiXFxuIHJhbms6IFwiICsgdG9vbG1hdGNoLnJhbmsgKyBcIlxcblwiO1xuICAgICAgICByZXN1bHQucHVzaChzKTtcbiAgICAgICAgT2JqZWN0LmtleXModG9vbG1hdGNoLnRvb2wucmVxdWlyZXMpLmZvckVhY2goZnVuY3Rpb24gKHNSZXF1aXJlcywgaW5kZXgpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwicmVxdWlyZWQ6IFwiICsgc1JlcXVpcmVzICsgXCIgLT4gXCIpO1xuICAgICAgICAgICAgaWYgKHRvb2xtYXRjaC50b29sbWF0Y2hyZXN1bHQucmVxdWlyZWRbc1JlcXVpcmVzXSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKCdcIicgKyB0b29sbWF0Y2gudG9vbG1hdGNocmVzdWx0LnJlcXVpcmVkW3NSZXF1aXJlc10ubWF0Y2hlZFN0cmluZyArICdcIicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goXCI/IG1pc3NpbmchXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzdWx0LnB1c2goJ1xcbicpO1xuICAgICAgICB9KTtcbiAgICAgICAgT2JqZWN0LmtleXModG9vbG1hdGNoLnRvb2wub3B0aW9uYWwpLmZvckVhY2goZnVuY3Rpb24gKHNSZXF1aXJlcywgaW5kZXgpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwib3B0aW9uYWwgOiBcIiArIHNSZXF1aXJlcyArIFwiIC0+IFwiKTtcbiAgICAgICAgICAgIGlmICh0b29sbWF0Y2gudG9vbG1hdGNocmVzdWx0Lm9wdGlvbmFsW3NSZXF1aXJlc10pIHtcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaCgnXCInICsgdG9vbG1hdGNoLnRvb2xtYXRjaHJlc3VsdC5vcHRpb25hbFtzUmVxdWlyZXNdLm1hdGNoZWRTdHJpbmcgKyAnXCInKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwiP1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKCdcXG4nKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBvU2VudGVuY2UgPSB0b29sbWF0Y2guc2VudGVuY2U7XG4gICAgICAgIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaW5kZXgpIHtcbiAgICAgICAgICAgIHZhciBzV29yZCA9IFwiW1wiICsgaW5kZXggKyBcIl0gOiBcIiArIG9Xb3JkLmNhdGVnb3J5ICsgXCIgXFxcIlwiICsgb1dvcmQuc3RyaW5nICsgXCJcXFwiID0+IFxcXCJcIiArIG9Xb3JkLm1hdGNoZWRTdHJpbmcgKyBcIlxcXCJcIjtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHNXb3JkICsgXCJcXG5cIik7XG4gICAgICAgIH0pO1xuICAgICAgICByZXN1bHQucHVzaChcIi5cXG5cIik7XG4gICAgICAgIHJldHVybiByZXN1bHQucztcbiAgICB9LFxuICAgIGR1bXBXZWlnaHRzVG9wOiBmdW5jdGlvbiAodG9vbG1hdGNoZXMsIG9wdGlvbnMpIHtcbiAgICAgICAgdmFyIHMgPSAnJztcbiAgICAgICAgdG9vbG1hdGNoZXMuZm9yRWFjaChmdW5jdGlvbiAob01hdGNoLCBpbmRleCkge1xuICAgICAgICAgICAgaWYgKGluZGV4IDwgb3B0aW9ucy50b3ApIHtcbiAgICAgICAgICAgICAgICBzID0gcyArIFwiVG9vbG1hdGNoW1wiICsgaW5kZXggKyBcIl0uLi5cXG5cIjtcbiAgICAgICAgICAgICAgICBzID0gcyArIGV4cG9ydHMuVG9vbE1hdGNoLmR1bXBXZWlnaHRzKG9NYXRjaCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcztcbiAgICB9LFxuICAgIGR1bXBXZWlnaHRzOiBmdW5jdGlvbiAodG9vbG1hdGNoKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgICAgICBzOiBcIlwiLFxuICAgICAgICAgICAgcHVzaDogZnVuY3Rpb24gKHMpIHsgdGhpcy5zID0gdGhpcy5zICsgczsgfVxuICAgICAgICB9O1xuICAgICAgICB2YXIgcmVxdWlyZXMgPSBPYmplY3Qua2V5cyh0b29sbWF0Y2gudG9vbC5yZXF1aXJlcykubGVuZ3RoO1xuICAgICAgICB2YXIgcmVxdWlyZWQgPSBPYmplY3Qua2V5cyh0b29sbWF0Y2gudG9vbG1hdGNocmVzdWx0LnJlcXVpcmVkKS5sZW5ndGg7XG4gICAgICAgIHZhciBzcHVyaW91cyA9IE9iamVjdC5rZXlzKHRvb2xtYXRjaC50b29sbWF0Y2hyZXN1bHQuc3B1cmlvdXMpLmxlbmd0aDtcbiAgICAgICAgdmFyIHMgPSBcIioqUmVzdWx0IGZvciB0b29sOiBcIiArIHRvb2xtYXRjaC50b29sLm5hbWUgKyBcIlxcbiByYW5rOiBcIiArIHRvb2xtYXRjaC5yYW5rICsgXCIgIChyZXE6XCIgKyByZXF1aXJlZCArIFwiL1wiICsgcmVxdWlyZXMgKyBcIiAgIFwiICsgc3B1cmlvdXMgKyBcIilcXG5cIjtcbiAgICAgICAgcmVzdWx0LnB1c2gocyk7XG4gICAgICAgIE9iamVjdC5rZXlzKHRvb2xtYXRjaC50b29sLnJlcXVpcmVzKS5mb3JFYWNoKGZ1bmN0aW9uIChzUmVxdWlyZXMsIGluZGV4KSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaChcInJlcXVpcmVkOiBcIiArIHNSZXF1aXJlcyArIFwiIC0+IFwiKTtcbiAgICAgICAgICAgIGlmICh0b29sbWF0Y2gudG9vbG1hdGNocmVzdWx0LnJlcXVpcmVkW3NSZXF1aXJlc10pIHtcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaCgnXCInICsgdG9vbG1hdGNoLnRvb2xtYXRjaHJlc3VsdC5yZXF1aXJlZFtzUmVxdWlyZXNdLm1hdGNoZWRTdHJpbmcgKyAnXCInKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwiPyBtaXNzaW5nIVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKCdcXG4nKTtcbiAgICAgICAgfSk7XG4gICAgICAgIE9iamVjdC5rZXlzKHRvb2xtYXRjaC50b29sLm9wdGlvbmFsKS5mb3JFYWNoKGZ1bmN0aW9uIChzUmVxdWlyZXMsIGluZGV4KSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaChcIm9wdGlvbmFsIDogXCIgKyBzUmVxdWlyZXMgKyBcIiAtPiBcIik7XG4gICAgICAgICAgICBpZiAodG9vbG1hdGNoLnRvb2xtYXRjaHJlc3VsdC5vcHRpb25hbFtzUmVxdWlyZXNdKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goJ1wiJyArIHRvb2xtYXRjaC50b29sbWF0Y2hyZXN1bHQub3B0aW9uYWxbc1JlcXVpcmVzXS5tYXRjaGVkU3RyaW5nICsgJ1wiJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaChcIj9cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXN1bHQucHVzaCgnXFxuJyk7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgb1NlbnRlbmNlID0gdG9vbG1hdGNoLnNlbnRlbmNlO1xuICAgICAgICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGluZGV4KSB7XG4gICAgICAgICAgICB2YXIgc1dvcmQgPSBcIltcIiArIGluZGV4ICsgXCJdIDogXCIgKyBvV29yZC5jYXRlZ29yeSArIFwiIFxcXCJcIiArIG9Xb3JkLnN0cmluZyArIFwiXFxcIiA9PiBcXFwiXCIgKyBvV29yZC5tYXRjaGVkU3RyaW5nICsgXCJcXFwiICAoX3I6XCIgKyBvV29yZC5fcmFua2luZyArIFwiL1wiICsgKG9Xb3JkLnJlaW5mb3JjZSB8fCAnJykgKyBcIi9cIiArIChvV29yZC5sZXZlbm1hdGNoIHx8ICcnKSArIFwiKVwiO1xuICAgICAgICAgICAgcmVzdWx0LnB1c2goc1dvcmQgKyBcIlxcblwiKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJlc3VsdC5wdXNoKFwiLlxcblwiKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdC5zO1xuICAgIH1cbn07XG5leHBvcnRzLlJlc3VsdCA9IHtcbiAgICBnZXRFbnRpdHk6IGZ1bmN0aW9uIChtYXRjaCwga2V5KSB7XG4gICAgICAgIGlmICghbWF0Y2gudG9vbG1hdGNocmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtYXRjaC50b29sbWF0Y2hyZXN1bHQucmVxdWlyZWRba2V5XSkge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoLnRvb2xtYXRjaHJlc3VsdC5yZXF1aXJlZFtrZXldO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtYXRjaC50b29sbWF0Y2hyZXN1bHQub3B0aW9uYWxba2V5XSkge1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoLnRvb2xtYXRjaHJlc3VsdC5vcHRpb25hbFtrZXldO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxufTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
