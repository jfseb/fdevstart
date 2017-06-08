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
var debug = require("debug");
var Utils = require("abot_utils");
var abot_erbase_1 = require("abot_erbase");
var abot_erbase_2 = require("abot_erbase");
var Word = abot_erbase_2.Word.Word;
var Category = abot_erbase_2.Word.Category;
var debuglog = debug('toolmatcher');
function matchTool(oSentence, oTool) {
    var used = {};
    var required = {};
    var optional = {};
    var matched = {};
    var spurious = {};
    var toolmentioned = [];
    Object.keys(oTool.requires || {}).forEach(function (sCategory) {
        var _abot_erbase_1$Senten = abot_erbase_1.Sentence.findWordByCategory(oSentence, sCategory),
            word = _abot_erbase_1$Senten.word,
            index = _abot_erbase_1$Senten.index;

        if (word) {
            matched[word] = "required";
            used[index] = 1;
            required[sCategory] = word;
        }
    });
    Object.keys(oTool.optional || {}).forEach(function (sCategory) {
        var _abot_erbase_1$Senten2 = abot_erbase_1.Sentence.findWordByCategory(oSentence, sCategory),
            word = _abot_erbase_1$Senten2.word,
            index = _abot_erbase_1$Senten2.index;

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
            } else {
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
var match = require("./match");
var ToolMatch = match.ToolMatch;
function matchTools(aSentences, aTool) {
    //var stream = new streamutils.MatchStream();
    debuglog("matchTools: sentences \n" + aSentences.map(function (oSentence, index) {
        return index < 30 ? "[" + index + "]" + abot_erbase_1.Sentence.rankingProduct(oSentence) + ":" + abot_erbase_1.Sentence.dumpNice(oSentence) : "\n";
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
        debuglog("matchTools: ranked toolmatches\n" + result.map(function (otoolmatch) {
            return abot_erbase_1.Sentence.dumpNice(otoolmatch.sentence) + JSON.stringify(otoolmatch);
        }).join("\n"));
    }
    return result;
}
exports.matchTools = matchTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1hdGNoL3Rvb2xtYXRjaGVyLmpzIiwiLi4vc3JjL21hdGNoL3Rvb2xtYXRjaGVyLnRzIl0sIm5hbWVzIjpbIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZXhwb3J0cyIsInZhbHVlIiwiZGVidWciLCJyZXF1aXJlIiwiVXRpbHMiLCJhYm90X2VyYmFzZV8xIiwiYWJvdF9lcmJhc2VfMiIsIldvcmQiLCJDYXRlZ29yeSIsImRlYnVnbG9nIiwibWF0Y2hUb29sIiwib1NlbnRlbmNlIiwib1Rvb2wiLCJ1c2VkIiwicmVxdWlyZWQiLCJvcHRpb25hbCIsIm1hdGNoZWQiLCJzcHVyaW91cyIsInRvb2xtZW50aW9uZWQiLCJrZXlzIiwicmVxdWlyZXMiLCJmb3JFYWNoIiwic0NhdGVnb3J5IiwiU2VudGVuY2UiLCJmaW5kV29yZEJ5Q2F0ZWdvcnkiLCJ3b3JkIiwiaW5kZXgiLCJvV29yZCIsImlzRmlsbGVyIiwiaXNDYXRlZ29yeSIsIkpTT04iLCJzdHJpbmdpZnkiLCJjYXRlZ29yeSIsIkNBVF9UT09MIiwibWF0Y2hlZFN0cmluZyIsIm5hbWUiLCJwdXNoIiwiam9pbiIsIm1pc3NpbmciLCJBcnJheVV0aWxzIiwic2V0TWludXMiLCJyZWR1Y2UiLCJtYXAiLCJzS2V5IiwibWF0Y2giLCJUb29sTWF0Y2giLCJtYXRjaFRvb2xzIiwiYVNlbnRlbmNlcyIsImFUb29sIiwicmFua2luZ1Byb2R1Y3QiLCJkdW1wTmljZSIsInJlc3VsdCIsInRvb2xtYXRjaHJlc3VsdCIsInRvb2xtYXRjaCIsInNlbnRlbmNlIiwidG9vbCIsInJhbmsiLCJyYW5rUmVzdWx0IiwiaXNBbnlNYXRjaCIsInNvcnQiLCJjb21wQmV0dGVyTWF0Y2giLCJlbmFibGVkIiwib3Rvb2xtYXRjaCJdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTs7Ozs7Ozs7Ozs7O0FEWUFBLE9BQU9DLGNBQVAsQ0FBc0JDLE9BQXRCLEVBQStCLFlBQS9CLEVBQTZDLEVBQUVDLE9BQU8sSUFBVCxFQUE3QztBQ0FBO0FB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QyxTQUZJO0FBR2Q0QyxzQkFBTzNDLEtBSE87QUFJZDRDLHNCQUFPO0FBSk8sYUFBaEI7QUFNQUgsc0JBQVVHLElBQVYsR0FBaUJYLFVBQVVZLFVBQVYsQ0FBcUJKLFVBQVVELGVBQS9CLENBQWpCO0FBQ0EsZ0JBQUlQLFVBQVVhLFVBQVYsQ0FBcUJMLFNBQXJCLENBQUosRUFBcUM7QUFDbkNGLHVCQUFPZixJQUFQLENBQVlpQixTQUFaO0FBQ0Q7QUFDRixTQVpEO0FBYUQsS0FkRDtBQWVBRixXQUFPUSxJQUFQLENBQVlkLFVBQVVlLGVBQXRCO0FBRUEsUUFBR25ELFNBQVNvRCxPQUFaLEVBQXFCO0FBQ25CcEQsaUJBQVMscUNBQ1AwQyxPQUFPVCxHQUFQLENBQVcsVUFBU29CLFVBQVQsRUFBbUI7QUFDNUIsbUJBQU96RCxjQUFBa0IsUUFBQSxDQUFTMkIsUUFBVCxDQUFrQlksV0FBV1IsUUFBN0IsSUFBeUN4QixLQUFLQyxTQUFMLENBQWUrQixVQUFmLENBQWhEO0FBQ0QsU0FGRCxFQUVHekIsSUFGSCxDQUVRLElBRlIsQ0FERjtBQUtEO0FBQ0QsV0FBT2MsTUFBUDtBQUNEO0FBaENEbkQsUUFBQThDLFVBQUEsR0FBQUEsVUFBQSIsImZpbGUiOiJtYXRjaC90b29sbWF0Y2hlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuLyoqXG4gKiBAZmlsZSB0b29sbWF0Y2hlclxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQudG9vbG1hdGNoZXJcbiAqIEBjb3B5cmlnaHQgKGMpIEdlcmQgRm9yc3RtYW5uXG4gKlxuICogTWF0Y2ggYSB0b29sIHJlY29yZCBvbiBhIHNlbnRlbmNlLFxuICpcbiAqIFRoaXMgd2lsbCB1bmlmeSBtYXRjaGluZyByZXF1aXJlZCBhbmQgb3B0aW9uYWwgY2F0ZWdvcnkgd29yZHNcbiAqIHdpdGggdGhlIHJlcXVpcmVtZW50cyBvZiB0aGUgdG9vbC5cbiAqXG4gKi9cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbi8vIC8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vbGliL25vZGUtNC5kLnRzXCIgLz5cbmNvbnN0IGRlYnVnID0gcmVxdWlyZShcImRlYnVnXCIpO1xuY29uc3QgVXRpbHMgPSByZXF1aXJlKFwiYWJvdF91dGlsc1wiKTtcbmNvbnN0IGFib3RfZXJiYXNlXzEgPSByZXF1aXJlKFwiYWJvdF9lcmJhc2VcIik7XG5jb25zdCBhYm90X2VyYmFzZV8yID0gcmVxdWlyZShcImFib3RfZXJiYXNlXCIpO1xuY29uc3QgV29yZCA9IGFib3RfZXJiYXNlXzIuV29yZC5Xb3JkO1xuY29uc3QgQ2F0ZWdvcnkgPSBhYm90X2VyYmFzZV8yLldvcmQuQ2F0ZWdvcnk7XG5jb25zdCBkZWJ1Z2xvZyA9IGRlYnVnKCd0b29sbWF0Y2hlcicpO1xuZnVuY3Rpb24gbWF0Y2hUb29sKG9TZW50ZW5jZSwgb1Rvb2wpIHtcbiAgICB2YXIgdXNlZCA9IHt9O1xuICAgIHZhciByZXF1aXJlZCA9IHt9O1xuICAgIHZhciBvcHRpb25hbCA9IHt9O1xuICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgdmFyIHNwdXJpb3VzID0ge307XG4gICAgdmFyIHRvb2xtZW50aW9uZWQgPSBbXTtcbiAgICBPYmplY3Qua2V5cyhvVG9vbC5yZXF1aXJlcyB8fCB7fSkuZm9yRWFjaChmdW5jdGlvbiAoc0NhdGVnb3J5KSB7XG4gICAgICAgIGxldCB7IHdvcmQsIGluZGV4IH0gPSBhYm90X2VyYmFzZV8xLlNlbnRlbmNlLmZpbmRXb3JkQnlDYXRlZ29yeShvU2VudGVuY2UsIHNDYXRlZ29yeSk7XG4gICAgICAgIGlmICh3b3JkKSB7XG4gICAgICAgICAgICBtYXRjaGVkW3dvcmRdID0gXCJyZXF1aXJlZFwiO1xuICAgICAgICAgICAgdXNlZFtpbmRleF0gPSAxO1xuICAgICAgICAgICAgcmVxdWlyZWRbc0NhdGVnb3J5XSA9IHdvcmQ7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBPYmplY3Qua2V5cyhvVG9vbC5vcHRpb25hbCB8fCB7fSkuZm9yRWFjaChmdW5jdGlvbiAoc0NhdGVnb3J5KSB7XG4gICAgICAgIHZhciB7IHdvcmQsIGluZGV4IH0gPSBhYm90X2VyYmFzZV8xLlNlbnRlbmNlLmZpbmRXb3JkQnlDYXRlZ29yeShvU2VudGVuY2UsIHNDYXRlZ29yeSk7XG4gICAgICAgIGlmICh3b3JkKSB7XG4gICAgICAgICAgICBtYXRjaGVkW3dvcmRdID0gXCJvcHRpb25hbFwiO1xuICAgICAgICAgICAgdXNlZFtpbmRleF0gPSAxO1xuICAgICAgICAgICAgb3B0aW9uYWxbc0NhdGVnb3J5XSA9IHdvcmQ7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGluZGV4KSB7XG4gICAgICAgIGlmICghdXNlZFtpbmRleF0gJiYgIVdvcmQuaXNGaWxsZXIob1dvcmQpICYmICFXb3JkLmlzQ2F0ZWdvcnkob1dvcmQpKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZyhcImhhdmUgc3B1cmlvdXMgd29yZFwiICsgSlNPTi5zdHJpbmdpZnkob1dvcmQpKTtcbiAgICAgICAgICAgIGlmICghdXNlZFtpbmRleF0gJiYgb1dvcmQuY2F0ZWdvcnkgPT09IENhdGVnb3J5LkNBVF9UT09MICYmIG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IG9Ub29sLm5hbWUpIHtcbiAgICAgICAgICAgICAgICB0b29sbWVudGlvbmVkLnB1c2gob1dvcmQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgc3B1cmlvdXNbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG4gICAgZGVidWdsb2coJ3NhdGlzZmllZCA6ICcgKyBPYmplY3Qua2V5cyhvVG9vbC5yZXF1aXJlcykuam9pbihcIjtcIikpO1xuICAgIGRlYnVnbG9nKCdyZXF1aXJlZCAgOiAnICsgT2JqZWN0LmtleXMob1Rvb2wucmVxdWlyZXMpLmpvaW4oXCI7XCIpKTtcbiAgICB2YXIgbWlzc2luZyA9IFV0aWxzLkFycmF5VXRpbHMuc2V0TWludXMoT2JqZWN0LmtleXMob1Rvb2wucmVxdWlyZXMpLCBPYmplY3Qua2V5cyhyZXF1aXJlZCkpLnJlZHVjZShmdW5jdGlvbiAobWFwLCBzS2V5KSB7XG4gICAgICAgIG1hcFtzS2V5XSA9IDE7XG4gICAgICAgIHJldHVybiBtYXA7XG4gICAgfSwge30pO1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlcXVpcmVkOiByZXF1aXJlZCxcbiAgICAgICAgbWlzc2luZzogbWlzc2luZyxcbiAgICAgICAgb3B0aW9uYWw6IG9wdGlvbmFsLFxuICAgICAgICBzcHVyaW91czogc3B1cmlvdXMsXG4gICAgICAgIHRvb2xtZW50aW9uZWQ6IHRvb2xtZW50aW9uZWRcbiAgICB9O1xufVxuZXhwb3J0cy5tYXRjaFRvb2wgPSBtYXRjaFRvb2w7XG5jb25zdCBtYXRjaCA9IHJlcXVpcmUoXCIuL21hdGNoXCIpO1xuY29uc3QgVG9vbE1hdGNoID0gbWF0Y2guVG9vbE1hdGNoO1xuZnVuY3Rpb24gbWF0Y2hUb29scyhhU2VudGVuY2VzLCBhVG9vbCkge1xuICAgIC8vdmFyIHN0cmVhbSA9IG5ldyBzdHJlYW11dGlscy5NYXRjaFN0cmVhbSgpO1xuICAgIGRlYnVnbG9nKFwibWF0Y2hUb29sczogc2VudGVuY2VzIFxcblwiICtcbiAgICAgICAgYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSwgaW5kZXgpIHtcbiAgICAgICAgICAgIHJldHVybiAoaW5kZXggPCAzMCkgPyBgWyR7aW5kZXh9XWAgKyBhYm90X2VyYmFzZV8xLlNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIGFib3RfZXJiYXNlXzEuU2VudGVuY2UuZHVtcE5pY2Uob1NlbnRlbmNlKSA6IFwiXFxuXCI7XG4gICAgICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICBhVG9vbC5mb3JFYWNoKGZ1bmN0aW9uIChvVG9vbCkge1xuICAgICAgICBhU2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICAgICAgdmFyIHRvb2xtYXRjaHJlc3VsdCA9IG1hdGNoVG9vbChvU2VudGVuY2UsIG9Ub29sKTtcbiAgICAgICAgICAgIHZhciB0b29sbWF0Y2ggPSB7XG4gICAgICAgICAgICAgICAgdG9vbG1hdGNocmVzdWx0OiB0b29sbWF0Y2hyZXN1bHQsXG4gICAgICAgICAgICAgICAgc2VudGVuY2U6IG9TZW50ZW5jZSxcbiAgICAgICAgICAgICAgICB0b29sOiBvVG9vbCxcbiAgICAgICAgICAgICAgICByYW5rOiAwXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdG9vbG1hdGNoLnJhbmsgPSBUb29sTWF0Y2gucmFua1Jlc3VsdCh0b29sbWF0Y2gudG9vbG1hdGNocmVzdWx0KTtcbiAgICAgICAgICAgIGlmIChUb29sTWF0Y2guaXNBbnlNYXRjaCh0b29sbWF0Y2gpKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2godG9vbG1hdGNoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmVzdWx0LnNvcnQoVG9vbE1hdGNoLmNvbXBCZXR0ZXJNYXRjaCk7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coXCJtYXRjaFRvb2xzOiByYW5rZWQgdG9vbG1hdGNoZXNcXG5cIiArXG4gICAgICAgICAgICByZXN1bHQubWFwKGZ1bmN0aW9uIChvdG9vbG1hdGNoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFib3RfZXJiYXNlXzEuU2VudGVuY2UuZHVtcE5pY2Uob3Rvb2xtYXRjaC5zZW50ZW5jZSkgKyBKU09OLnN0cmluZ2lmeShvdG9vbG1hdGNoKTtcbiAgICAgICAgICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuZXhwb3J0cy5tYXRjaFRvb2xzID0gbWF0Y2hUb29scztcbiIsIi8qKlxyXG4gKiBAZmlsZSB0b29sbWF0Y2hlclxyXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC50b29sbWF0Y2hlclxyXG4gKiBAY29weXJpZ2h0IChjKSBHZXJkIEZvcnN0bWFublxyXG4gKlxyXG4gKiBNYXRjaCBhIHRvb2wgcmVjb3JkIG9uIGEgc2VudGVuY2UsXHJcbiAqXHJcbiAqIFRoaXMgd2lsbCB1bmlmeSBtYXRjaGluZyByZXF1aXJlZCBhbmQgb3B0aW9uYWwgY2F0ZWdvcnkgd29yZHNcclxuICogd2l0aCB0aGUgcmVxdWlyZW1lbnRzIG9mIHRoZSB0b29sLlxyXG4gKlxyXG4gKi9cclxuXHJcbi8vIC8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vbGliL25vZGUtNC5kLnRzXCIgLz5cclxuXHJcbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcclxuXHJcbmltcG9ydCAqIGFzIElNYXRjaCBmcm9tICcuL2lmbWF0Y2gnO1xyXG5cclxuaW1wb3J0ICogYXMgVXRpbHMgZnJvbSAnYWJvdF91dGlscyc7XHJcbmltcG9ydCB7IFNlbnRlbmNlIGFzIFNlbnRlbmNlfSBmcm9tICdhYm90X2VyYmFzZSc7XHJcblxyXG5pbXBvcnQgeyBXb3JkIGFzIE9wc1dvcmQgfSAgZnJvbSAnYWJvdF9lcmJhc2UnO1xyXG5cclxuY29uc3QgV29yZCA9IE9wc1dvcmQuV29yZDtcclxuY29uc3QgQ2F0ZWdvcnkgPSBPcHNXb3JkLkNhdGVnb3J5O1xyXG5cclxuY29uc3QgZGVidWdsb2cgPSBkZWJ1ZygndG9vbG1hdGNoZXInKTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFRvb2wob1NlbnRlbmNlOiBJTWF0Y2guSVNlbnRlbmNlLCBvVG9vbDogSU1hdGNoLklUb29sKTogSU1hdGNoLklUb29sTWF0Y2hSZXN1bHQge1xyXG4gIHZhciB1c2VkID0ge30gYXMgeyBba2V5OiBudW1iZXJdOiBudW1iZXIgfTtcclxuICB2YXIgcmVxdWlyZWQgPSB7fSBhcyB7IFtrZXk6IHN0cmluZ106IElNYXRjaC5JV29yZCB9O1xyXG4gIHZhciBvcHRpb25hbCA9IHt9IGFzIHsgW2tleTogc3RyaW5nXTogSU1hdGNoLklXb3JkIH07XHJcbiAgdmFyIG1hdGNoZWQgPSB7fSBhcyB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9O1xyXG4gIHZhciBzcHVyaW91cyA9IHt9IGFzIHsgW2tleTogc3RyaW5nXTogbnVtYmVyIH07XHJcbiAgdmFyIHRvb2xtZW50aW9uZWQgPSBbXSBhcyBBcnJheTxJTWF0Y2guSVdvcmQ+O1xyXG4gIE9iamVjdC5rZXlzKG9Ub29sLnJlcXVpcmVzIHx8IHt9KS5mb3JFYWNoKGZ1bmN0aW9uIChzQ2F0ZWdvcnk6IHN0cmluZykge1xyXG4gICAgbGV0IHsgd29yZCwgaW5kZXggfSA9IFNlbnRlbmNlLmZpbmRXb3JkQnlDYXRlZ29yeShvU2VudGVuY2UsIHNDYXRlZ29yeSk7XHJcbiAgICBpZiAod29yZCkge1xyXG4gICAgICBtYXRjaGVkW3dvcmQgYXMgYW55XSA9IFwicmVxdWlyZWRcIjtcclxuICAgICAgdXNlZFtpbmRleF0gPSAxO1xyXG4gICAgICByZXF1aXJlZFtzQ2F0ZWdvcnldID0gd29yZDtcclxuICAgIH1cclxuICB9KTtcclxuICBPYmplY3Qua2V5cyhvVG9vbC5vcHRpb25hbCB8fCB7fSkuZm9yRWFjaChmdW5jdGlvbiAoc0NhdGVnb3J5OiBzdHJpbmcpIHtcclxuICAgIHZhciB7IHdvcmQsIGluZGV4IH0gPSBTZW50ZW5jZS5maW5kV29yZEJ5Q2F0ZWdvcnkob1NlbnRlbmNlLCBzQ2F0ZWdvcnkpO1xyXG4gICAgaWYgKHdvcmQpIHtcclxuICAgICAgbWF0Y2hlZFt3b3JkIGFzIGFueV0gPSBcIm9wdGlvbmFsXCI7XHJcbiAgICAgIHVzZWRbaW5kZXhdID0gMTtcclxuICAgICAgb3B0aW9uYWxbc0NhdGVnb3J5XSA9IHdvcmQ7XHJcbiAgICB9XHJcbiAgfSk7XHJcblxyXG4gIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaW5kZXgpIHtcclxuICAgIGlmICghdXNlZFtpbmRleF0gJiYgIVdvcmQuaXNGaWxsZXIob1dvcmQpICYmICFXb3JkLmlzQ2F0ZWdvcnkob1dvcmQpKSB7XHJcbiAgICAgIGRlYnVnbG9nKFwiaGF2ZSBzcHVyaW91cyB3b3JkXCIgKyBKU09OLnN0cmluZ2lmeShvV29yZCkpO1xyXG4gICAgICBpZiAoIXVzZWRbaW5kZXhdICYmIG9Xb3JkLmNhdGVnb3J5ID09PSBDYXRlZ29yeS5DQVRfVE9PTCAmJiBvV29yZC5tYXRjaGVkU3RyaW5nID09PSBvVG9vbC5uYW1lICkge1xyXG4gICAgICAgIHRvb2xtZW50aW9uZWQucHVzaChvV29yZCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgc3B1cmlvdXNbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSAxO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSk7XHJcbiAgZGVidWdsb2coJ3NhdGlzZmllZCA6ICcgKyBPYmplY3Qua2V5cyhvVG9vbC5yZXF1aXJlcykuam9pbihcIjtcIikpO1xyXG4gIGRlYnVnbG9nKCdyZXF1aXJlZCAgOiAnICsgT2JqZWN0LmtleXMob1Rvb2wucmVxdWlyZXMpLmpvaW4oXCI7XCIpKTtcclxuICB2YXIgbWlzc2luZyA9IFV0aWxzLkFycmF5VXRpbHMuc2V0TWludXMoT2JqZWN0LmtleXMob1Rvb2wucmVxdWlyZXMpLCBPYmplY3Qua2V5cyhyZXF1aXJlZCkpLnJlZHVjZShcclxuICAgIGZ1bmN0aW9uIChtYXAsIHNLZXkpIHtcclxuICAgICAgbWFwW3NLZXldID0gMTtcclxuICAgICAgcmV0dXJuIG1hcDtcclxuICAgIH0sIHt9KVxyXG5cclxuICByZXR1cm4ge1xyXG4gICAgcmVxdWlyZWQ6IHJlcXVpcmVkLFxyXG4gICAgbWlzc2luZzogbWlzc2luZyxcclxuICAgIG9wdGlvbmFsOiBvcHRpb25hbCxcclxuICAgIHNwdXJpb3VzOiBzcHVyaW91cyxcclxuICAgIHRvb2xtZW50aW9uZWQgOiB0b29sbWVudGlvbmVkXHJcbiAgfVxyXG59XHJcblxyXG5pbXBvcnQgKiBhcyBtYXRjaCBmcm9tICcuL21hdGNoJztcclxuXHJcbmNvbnN0IFRvb2xNYXRjaCA9IG1hdGNoLlRvb2xNYXRjaDtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFRvb2xzKGFTZW50ZW5jZXM6IEFycmF5PElNYXRjaC5JU2VudGVuY2U+LCBhVG9vbDogQXJyYXk8SU1hdGNoLklUb29sPik6IElNYXRjaC5JVG9vbE1hdGNoW10gLyogb2JqZWN0c3RyZWFtKi8ge1xyXG4gIC8vdmFyIHN0cmVhbSA9IG5ldyBzdHJlYW11dGlscy5NYXRjaFN0cmVhbSgpO1xyXG4gIGRlYnVnbG9nKFwibWF0Y2hUb29sczogc2VudGVuY2VzIFxcblwiICtcclxuICAgIGFTZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UsIGluZGV4KSB7XHJcbiAgICByZXR1cm4gKGluZGV4IDwgMzApID8gYFske2luZGV4fV1gICsgU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgU2VudGVuY2UuZHVtcE5pY2Uob1NlbnRlbmNlKSA6IFwiXFxuXCI7XHJcbiAgICB9KS5qb2luKFwiXFxuXCIpKTtcclxuICB2YXIgcmVzdWx0ID0gW107XHJcbiAgYVRvb2wuZm9yRWFjaChmdW5jdGlvbiAob1Rvb2wpIHtcclxuICAgIGFTZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XHJcbiAgICAgIHZhciB0b29sbWF0Y2hyZXN1bHQgPSBtYXRjaFRvb2wob1NlbnRlbmNlLCBvVG9vbCk7XHJcbiAgICAgIHZhciB0b29sbWF0Y2ggPSB7XHJcbiAgICAgICAgdG9vbG1hdGNocmVzdWx0OiB0b29sbWF0Y2hyZXN1bHQsXHJcbiAgICAgICAgc2VudGVuY2U6IG9TZW50ZW5jZSxcclxuICAgICAgICB0b29sIDogb1Rvb2wsXHJcbiAgICAgICAgcmFuayA6IDBcclxuICAgICAgfSBhcyBJTWF0Y2guSVRvb2xNYXRjaDtcclxuICAgICAgdG9vbG1hdGNoLnJhbmsgPSBUb29sTWF0Y2gucmFua1Jlc3VsdCh0b29sbWF0Y2gudG9vbG1hdGNocmVzdWx0KTtcclxuICAgICAgaWYgKFRvb2xNYXRjaC5pc0FueU1hdGNoKHRvb2xtYXRjaCkpIHtcclxuICAgICAgICByZXN1bHQucHVzaCh0b29sbWF0Y2gpO1xyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH0pO1xyXG4gIHJlc3VsdC5zb3J0KFRvb2xNYXRjaC5jb21wQmV0dGVyTWF0Y2gpO1xyXG5cclxuICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZyhcIm1hdGNoVG9vbHM6IHJhbmtlZCB0b29sbWF0Y2hlc1xcblwiICtcclxuICAgICAgcmVzdWx0Lm1hcChmdW5jdGlvbihvdG9vbG1hdGNoKSB7XHJcbiAgICAgICAgcmV0dXJuIFNlbnRlbmNlLmR1bXBOaWNlKG90b29sbWF0Y2guc2VudGVuY2UpICsgSlNPTi5zdHJpbmdpZnkob3Rvb2xtYXRjaCk7XHJcbiAgICAgIH0pLmpvaW4oXCJcXG5cIilcclxuICAgICk7XHJcbiAgfVxyXG4gIHJldHVybiByZXN1bHQ7XHJcbn0iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
