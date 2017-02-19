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

var debug = require("debug");
var Utils = require("abot_utils");
var Sentence = require("./sentence");
var OpsWord = require("./word");
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
        var _a = Sentence.findWordByCategory(oSentence, sCategory),
            word = _a.word,
            index = _a.index;
        if (word) {
            matched[word] = "required";
            used[index] = 1;
            required[sCategory] = word;
        }
    });
    Object.keys(oTool.optional || {}).forEach(function (sCategory) {
        var _a = Sentence.findWordByCategory(oSentence, sCategory),
            word = _a.word,
            index = _a.index;
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
        return index < 30 ? "[" + index + "]" + Sentence.rankingProduct(oSentence) + ":" + Sentence.dumpNice(oSentence) : "\n";
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
            return Sentence.dumpNice(otoolmatch.sentence) + JSON.stringify(otoolmatch);
        }).join("\n"));
    }
    return result;
}
exports.matchTools = matchTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC90b29sbWF0Y2hlci50cyIsIm1hdGNoL3Rvb2xtYXRjaGVyLmpzIl0sIm5hbWVzIjpbImRlYnVnIiwicmVxdWlyZSIsIlV0aWxzIiwiU2VudGVuY2UiLCJPcHNXb3JkIiwiV29yZCIsIkNhdGVnb3J5IiwiZGVidWdsb2ciLCJtYXRjaFRvb2wiLCJvU2VudGVuY2UiLCJvVG9vbCIsInVzZWQiLCJyZXF1aXJlZCIsIm9wdGlvbmFsIiwibWF0Y2hlZCIsInNwdXJpb3VzIiwidG9vbG1lbnRpb25lZCIsIk9iamVjdCIsImtleXMiLCJyZXF1aXJlcyIsImZvckVhY2giLCJzQ2F0ZWdvcnkiLCJfYSIsImZpbmRXb3JkQnlDYXRlZ29yeSIsIndvcmQiLCJpbmRleCIsIm9Xb3JkIiwiaXNGaWxsZXIiLCJpc0NhdGVnb3J5IiwiSlNPTiIsInN0cmluZ2lmeSIsImNhdGVnb3J5IiwiQ0FUX1RPT0wiLCJtYXRjaGVkU3RyaW5nIiwibmFtZSIsInB1c2giLCJqb2luIiwibWlzc2luZyIsIkFycmF5VXRpbHMiLCJzZXRNaW51cyIsInJlZHVjZSIsIm1hcCIsInNLZXkiLCJleHBvcnRzIiwibWF0Y2giLCJUb29sTWF0Y2giLCJtYXRjaFRvb2xzIiwiYVNlbnRlbmNlcyIsImFUb29sIiwicmFua2luZ1Byb2R1Y3QiLCJkdW1wTmljZSIsInJlc3VsdCIsInRvb2xtYXRjaHJlc3VsdCIsInRvb2xtYXRjaCIsInNlbnRlbmNlIiwidG9vbCIsInJhbmsiLCJyYW5rUmVzdWx0IiwiaXNBbnlNYXRjaCIsInNvcnQiLCJjb21wQmV0dGVyTWF0Y2giLCJlbmFibGVkIiwib3Rvb2xtYXRjaCJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7O0FDV0E7QURDQTs7QUFFQSxJQUFBQSxRQUFBQyxRQUFBLE9BQUEsQ0FBQTtBQUlBLElBQUFDLFFBQUFELFFBQUEsWUFBQSxDQUFBO0FBQ0EsSUFBQUUsV0FBQUYsUUFBQSxZQUFBLENBQUE7QUFDQSxJQUFBRyxVQUFBSCxRQUFBLFFBQUEsQ0FBQTtBQUVBLElBQU1JLE9BQU9ELFFBQVFDLElBQXJCO0FBQ0EsSUFBTUMsV0FBV0YsUUFBUUUsUUFBekI7QUFFQSxJQUFNQyxXQUFXUCxNQUFNLGFBQU4sQ0FBakI7QUFFQSxTQUFBUSxTQUFBLENBQTBCQyxTQUExQixFQUF1REMsS0FBdkQsRUFBMEU7QUFDeEUsUUFBSUMsT0FBTyxFQUFYO0FBQ0EsUUFBSUMsV0FBVyxFQUFmO0FBQ0EsUUFBSUMsV0FBVyxFQUFmO0FBQ0EsUUFBSUMsVUFBVSxFQUFkO0FBQ0EsUUFBSUMsV0FBVyxFQUFmO0FBQ0EsUUFBSUMsZ0JBQWdCLEVBQXBCO0FBQ0FDLFdBQU9DLElBQVAsQ0FBWVIsTUFBTVMsUUFBTixJQUFrQixFQUE5QixFQUFrQ0MsT0FBbEMsQ0FBMEMsVUFBVUMsU0FBVixFQUEyQjtBQUMvRCxZQUFBQyxLQUFBbkIsU0FBQW9CLGtCQUFBLENBQUFkLFNBQUEsRUFBQVksU0FBQSxDQUFBO0FBQUEsWUFBRUcsT0FBQUYsR0FBQUUsSUFBRjtBQUFBLFlBQVFDLFFBQUFILEdBQUFHLEtBQVI7QUFDSixZQUFJRCxJQUFKLEVBQVU7QUFDUlYsb0JBQVFVLElBQVIsSUFBdUIsVUFBdkI7QUFDQWIsaUJBQUtjLEtBQUwsSUFBYyxDQUFkO0FBQ0FiLHFCQUFTUyxTQUFULElBQXNCRyxJQUF0QjtBQUNEO0FBQ0YsS0FQRDtBQVFBUCxXQUFPQyxJQUFQLENBQVlSLE1BQU1HLFFBQU4sSUFBa0IsRUFBOUIsRUFBa0NPLE9BQWxDLENBQTBDLFVBQVVDLFNBQVYsRUFBMkI7QUFDL0QsWUFBQUMsS0FBQW5CLFNBQUFvQixrQkFBQSxDQUFBZCxTQUFBLEVBQUFZLFNBQUEsQ0FBQTtBQUFBLFlBQUVHLE9BQUFGLEdBQUFFLElBQUY7QUFBQSxZQUFRQyxRQUFBSCxHQUFBRyxLQUFSO0FBQ0osWUFBSUQsSUFBSixFQUFVO0FBQ1JWLG9CQUFRVSxJQUFSLElBQXVCLFVBQXZCO0FBQ0FiLGlCQUFLYyxLQUFMLElBQWMsQ0FBZDtBQUNBWixxQkFBU1EsU0FBVCxJQUFzQkcsSUFBdEI7QUFDRDtBQUNGLEtBUEQ7QUFTQWYsY0FBVVcsT0FBVixDQUFrQixVQUFVTSxLQUFWLEVBQWlCRCxLQUFqQixFQUFzQjtBQUN0QyxZQUFJLENBQUNkLEtBQUtjLEtBQUwsQ0FBRCxJQUFnQixDQUFDcEIsS0FBS3NCLFFBQUwsQ0FBY0QsS0FBZCxDQUFqQixJQUF5QyxDQUFDckIsS0FBS3VCLFVBQUwsQ0FBZ0JGLEtBQWhCLENBQTlDLEVBQXNFO0FBQ3BFbkIscUJBQVMsdUJBQXVCc0IsS0FBS0MsU0FBTCxDQUFlSixLQUFmLENBQWhDO0FBQ0EsZ0JBQUksQ0FBQ2YsS0FBS2MsS0FBTCxDQUFELElBQWdCQyxNQUFNSyxRQUFOLEtBQW1CekIsU0FBUzBCLFFBQTVDLElBQXdETixNQUFNTyxhQUFOLEtBQXdCdkIsTUFBTXdCLElBQTFGLEVBQWlHO0FBQy9GbEIsOEJBQWNtQixJQUFkLENBQW1CVCxLQUFuQjtBQUNELGFBRkQsTUFFTztBQUNMWCx5QkFBU1csTUFBTU8sYUFBZixJQUFnQyxDQUFoQztBQUNEO0FBQ0Y7QUFDRixLQVREO0FBVUExQixhQUFTLGlCQUFpQlUsT0FBT0MsSUFBUCxDQUFZUixNQUFNUyxRQUFsQixFQUE0QmlCLElBQTVCLENBQWlDLEdBQWpDLENBQTFCO0FBQ0E3QixhQUFTLGlCQUFpQlUsT0FBT0MsSUFBUCxDQUFZUixNQUFNUyxRQUFsQixFQUE0QmlCLElBQTVCLENBQWlDLEdBQWpDLENBQTFCO0FBQ0EsUUFBSUMsVUFBVW5DLE1BQU1vQyxVQUFOLENBQWlCQyxRQUFqQixDQUEwQnRCLE9BQU9DLElBQVAsQ0FBWVIsTUFBTVMsUUFBbEIsQ0FBMUIsRUFBdURGLE9BQU9DLElBQVAsQ0FBWU4sUUFBWixDQUF2RCxFQUE4RTRCLE1BQTlFLENBQ1osVUFBVUMsR0FBVixFQUFlQyxJQUFmLEVBQW1CO0FBQ2pCRCxZQUFJQyxJQUFKLElBQVksQ0FBWjtBQUNBLGVBQU9ELEdBQVA7QUFDRCxLQUpXLEVBSVQsRUFKUyxDQUFkO0FBTUEsV0FBTztBQUNMN0Isa0JBQVVBLFFBREw7QUFFTHlCLGlCQUFTQSxPQUZKO0FBR0x4QixrQkFBVUEsUUFITDtBQUlMRSxrQkFBVUEsUUFKTDtBQUtMQyx1QkFBZ0JBO0FBTFgsS0FBUDtBQU9EO0FBakREMkIsUUFBQW5DLFNBQUEsR0FBQUEsU0FBQTtBQW1EQSxJQUFBb0MsUUFBQTNDLFFBQUEsU0FBQSxDQUFBO0FBRUEsSUFBTTRDLFlBQVlELE1BQU1DLFNBQXhCO0FBRUEsU0FBQUMsVUFBQSxDQUEyQkMsVUFBM0IsRUFBZ0VDLEtBQWhFLEVBQTBGO0FBQ3hGO0FBQ0F6QyxhQUFTLDZCQUNQd0MsV0FBV04sR0FBWCxDQUFlLFVBQVVoQyxTQUFWLEVBQXFCZ0IsS0FBckIsRUFBMEI7QUFDekMsZUFBUUEsUUFBUSxFQUFULEdBQWUsTUFBSUEsS0FBSixHQUFTLEdBQVQsR0FBZXRCLFNBQVM4QyxjQUFULENBQXdCeEMsU0FBeEIsQ0FBZixHQUFvRCxHQUFwRCxHQUEwRE4sU0FBUytDLFFBQVQsQ0FBa0J6QyxTQUFsQixDQUF6RSxHQUF3RyxJQUEvRztBQUNDLEtBRkQsRUFFRzJCLElBRkgsQ0FFUSxJQUZSLENBREY7QUFJQSxRQUFJZSxTQUFTLEVBQWI7QUFDQUgsVUFBTTVCLE9BQU4sQ0FBYyxVQUFVVixLQUFWLEVBQWU7QUFDM0JxQyxtQkFBVzNCLE9BQVgsQ0FBbUIsVUFBVVgsU0FBVixFQUFtQjtBQUNwQyxnQkFBSTJDLGtCQUFrQjVDLFVBQVVDLFNBQVYsRUFBcUJDLEtBQXJCLENBQXRCO0FBQ0EsZ0JBQUkyQyxZQUFZO0FBQ2RELGlDQUFpQkEsZUFESDtBQUVkRSwwQkFBVTdDLFNBRkk7QUFHZDhDLHNCQUFPN0MsS0FITztBQUlkOEMsc0JBQU87QUFKTyxhQUFoQjtBQU1BSCxzQkFBVUcsSUFBVixHQUFpQlgsVUFBVVksVUFBVixDQUFxQkosVUFBVUQsZUFBL0IsQ0FBakI7QUFDQSxnQkFBSVAsVUFBVWEsVUFBVixDQUFxQkwsU0FBckIsQ0FBSixFQUFxQztBQUNuQ0YsdUJBQU9oQixJQUFQLENBQVlrQixTQUFaO0FBQ0Q7QUFDRixTQVpEO0FBYUQsS0FkRDtBQWVBRixXQUFPUSxJQUFQLENBQVlkLFVBQVVlLGVBQXRCO0FBRUEsUUFBR3JELFNBQVNzRCxPQUFaLEVBQXFCO0FBQ25CdEQsaUJBQVMscUNBQ1A0QyxPQUFPVixHQUFQLENBQVcsVUFBU3FCLFVBQVQsRUFBbUI7QUFDNUIsbUJBQU8zRCxTQUFTK0MsUUFBVCxDQUFrQlksV0FBV1IsUUFBN0IsSUFBeUN6QixLQUFLQyxTQUFMLENBQWVnQyxVQUFmLENBQWhEO0FBQ0QsU0FGRCxFQUVHMUIsSUFGSCxDQUVRLElBRlIsQ0FERjtBQUtEO0FBQ0QsV0FBT2UsTUFBUDtBQUNEO0FBaENEUixRQUFBRyxVQUFBLEdBQUFBLFVBQUEiLCJmaWxlIjoibWF0Y2gvdG9vbG1hdGNoZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQGZpbGUgdG9vbG1hdGNoZXJcclxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQudG9vbG1hdGNoZXJcclxuICogQGNvcHlyaWdodCAoYykgR2VyZCBGb3JzdG1hbm5cclxuICpcclxuICogTWF0Y2ggYSB0b29sIHJlY29yZCBvbiBhIHNlbnRlbmNlLFxyXG4gKlxyXG4gKiBUaGlzIHdpbGwgdW5pZnkgbWF0Y2hpbmcgcmVxdWlyZWQgYW5kIG9wdGlvbmFsIGNhdGVnb3J5IHdvcmRzXHJcbiAqIHdpdGggdGhlIHJlcXVpcmVtZW50cyBvZiB0aGUgdG9vbC5cclxuICpcclxuICovXHJcblxyXG4vLyAvIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2xpYi9ub2RlLTQuZC50c1wiIC8+XHJcblxyXG5pbXBvcnQgKiBhcyBkZWJ1ZyBmcm9tICdkZWJ1Zyc7XHJcblxyXG5pbXBvcnQgKiBhcyBJTWF0Y2ggZnJvbSAnLi9pZm1hdGNoJztcclxuXHJcbmltcG9ydCAqIGFzIFV0aWxzIGZyb20gJ2Fib3RfdXRpbHMnO1xyXG5pbXBvcnQgKiBhcyBTZW50ZW5jZSBmcm9tICcuL3NlbnRlbmNlJztcclxuaW1wb3J0ICogYXMgT3BzV29yZCBmcm9tICcuL3dvcmQnO1xyXG5cclxuY29uc3QgV29yZCA9IE9wc1dvcmQuV29yZDtcclxuY29uc3QgQ2F0ZWdvcnkgPSBPcHNXb3JkLkNhdGVnb3J5O1xyXG5cclxuY29uc3QgZGVidWdsb2cgPSBkZWJ1ZygndG9vbG1hdGNoZXInKTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFRvb2wob1NlbnRlbmNlOiBJTWF0Y2guSVNlbnRlbmNlLCBvVG9vbDogSU1hdGNoLklUb29sKTogSU1hdGNoLklUb29sTWF0Y2hSZXN1bHQge1xyXG4gIHZhciB1c2VkID0ge30gYXMgeyBba2V5OiBudW1iZXJdOiBudW1iZXIgfTtcclxuICB2YXIgcmVxdWlyZWQgPSB7fSBhcyB7IFtrZXk6IHN0cmluZ106IElNYXRjaC5JV29yZCB9O1xyXG4gIHZhciBvcHRpb25hbCA9IHt9IGFzIHsgW2tleTogc3RyaW5nXTogSU1hdGNoLklXb3JkIH07XHJcbiAgdmFyIG1hdGNoZWQgPSB7fSBhcyB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9O1xyXG4gIHZhciBzcHVyaW91cyA9IHt9IGFzIHsgW2tleTogc3RyaW5nXTogbnVtYmVyIH07XHJcbiAgdmFyIHRvb2xtZW50aW9uZWQgPSBbXSBhcyBBcnJheTxJTWF0Y2guSVdvcmQ+O1xyXG4gIE9iamVjdC5rZXlzKG9Ub29sLnJlcXVpcmVzIHx8IHt9KS5mb3JFYWNoKGZ1bmN0aW9uIChzQ2F0ZWdvcnk6IHN0cmluZykge1xyXG4gICAgbGV0IHsgd29yZCwgaW5kZXggfSA9IFNlbnRlbmNlLmZpbmRXb3JkQnlDYXRlZ29yeShvU2VudGVuY2UsIHNDYXRlZ29yeSk7XHJcbiAgICBpZiAod29yZCkge1xyXG4gICAgICBtYXRjaGVkW3dvcmQgYXMgYW55XSA9IFwicmVxdWlyZWRcIjtcclxuICAgICAgdXNlZFtpbmRleF0gPSAxO1xyXG4gICAgICByZXF1aXJlZFtzQ2F0ZWdvcnldID0gd29yZDtcclxuICAgIH1cclxuICB9KTtcclxuICBPYmplY3Qua2V5cyhvVG9vbC5vcHRpb25hbCB8fCB7fSkuZm9yRWFjaChmdW5jdGlvbiAoc0NhdGVnb3J5OiBzdHJpbmcpIHtcclxuICAgIHZhciB7IHdvcmQsIGluZGV4IH0gPSBTZW50ZW5jZS5maW5kV29yZEJ5Q2F0ZWdvcnkob1NlbnRlbmNlLCBzQ2F0ZWdvcnkpO1xyXG4gICAgaWYgKHdvcmQpIHtcclxuICAgICAgbWF0Y2hlZFt3b3JkIGFzIGFueV0gPSBcIm9wdGlvbmFsXCI7XHJcbiAgICAgIHVzZWRbaW5kZXhdID0gMTtcclxuICAgICAgb3B0aW9uYWxbc0NhdGVnb3J5XSA9IHdvcmQ7XHJcbiAgICB9XHJcbiAgfSk7XHJcblxyXG4gIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaW5kZXgpIHtcclxuICAgIGlmICghdXNlZFtpbmRleF0gJiYgIVdvcmQuaXNGaWxsZXIob1dvcmQpICYmICFXb3JkLmlzQ2F0ZWdvcnkob1dvcmQpKSB7XHJcbiAgICAgIGRlYnVnbG9nKFwiaGF2ZSBzcHVyaW91cyB3b3JkXCIgKyBKU09OLnN0cmluZ2lmeShvV29yZCkpO1xyXG4gICAgICBpZiAoIXVzZWRbaW5kZXhdICYmIG9Xb3JkLmNhdGVnb3J5ID09PSBDYXRlZ29yeS5DQVRfVE9PTCAmJiBvV29yZC5tYXRjaGVkU3RyaW5nID09PSBvVG9vbC5uYW1lICkge1xyXG4gICAgICAgIHRvb2xtZW50aW9uZWQucHVzaChvV29yZCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgc3B1cmlvdXNbb1dvcmQubWF0Y2hlZFN0cmluZ10gPSAxO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSk7XHJcbiAgZGVidWdsb2coJ3NhdGlzZmllZCA6ICcgKyBPYmplY3Qua2V5cyhvVG9vbC5yZXF1aXJlcykuam9pbihcIjtcIikpO1xyXG4gIGRlYnVnbG9nKCdyZXF1aXJlZCAgOiAnICsgT2JqZWN0LmtleXMob1Rvb2wucmVxdWlyZXMpLmpvaW4oXCI7XCIpKTtcclxuICB2YXIgbWlzc2luZyA9IFV0aWxzLkFycmF5VXRpbHMuc2V0TWludXMoT2JqZWN0LmtleXMob1Rvb2wucmVxdWlyZXMpLCBPYmplY3Qua2V5cyhyZXF1aXJlZCkpLnJlZHVjZShcclxuICAgIGZ1bmN0aW9uIChtYXAsIHNLZXkpIHtcclxuICAgICAgbWFwW3NLZXldID0gMTtcclxuICAgICAgcmV0dXJuIG1hcDtcclxuICAgIH0sIHt9KVxyXG5cclxuICByZXR1cm4ge1xyXG4gICAgcmVxdWlyZWQ6IHJlcXVpcmVkLFxyXG4gICAgbWlzc2luZzogbWlzc2luZyxcclxuICAgIG9wdGlvbmFsOiBvcHRpb25hbCxcclxuICAgIHNwdXJpb3VzOiBzcHVyaW91cyxcclxuICAgIHRvb2xtZW50aW9uZWQgOiB0b29sbWVudGlvbmVkXHJcbiAgfVxyXG59XHJcblxyXG5pbXBvcnQgKiBhcyBtYXRjaCBmcm9tICcuL21hdGNoJztcclxuXHJcbmNvbnN0IFRvb2xNYXRjaCA9IG1hdGNoLlRvb2xNYXRjaDtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFRvb2xzKGFTZW50ZW5jZXM6IEFycmF5PElNYXRjaC5JU2VudGVuY2U+LCBhVG9vbDogQXJyYXk8SU1hdGNoLklUb29sPik6IElNYXRjaC5JVG9vbE1hdGNoW10gLyogb2JqZWN0c3RyZWFtKi8ge1xyXG4gIC8vdmFyIHN0cmVhbSA9IG5ldyBzdHJlYW11dGlscy5NYXRjaFN0cmVhbSgpO1xyXG4gIGRlYnVnbG9nKFwibWF0Y2hUb29sczogc2VudGVuY2VzIFxcblwiICtcclxuICAgIGFTZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UsIGluZGV4KSB7XHJcbiAgICByZXR1cm4gKGluZGV4IDwgMzApID8gYFske2luZGV4fV1gICsgU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgU2VudGVuY2UuZHVtcE5pY2Uob1NlbnRlbmNlKSA6IFwiXFxuXCI7XHJcbiAgICB9KS5qb2luKFwiXFxuXCIpKTtcclxuICB2YXIgcmVzdWx0ID0gW107XHJcbiAgYVRvb2wuZm9yRWFjaChmdW5jdGlvbiAob1Rvb2wpIHtcclxuICAgIGFTZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XHJcbiAgICAgIHZhciB0b29sbWF0Y2hyZXN1bHQgPSBtYXRjaFRvb2wob1NlbnRlbmNlLCBvVG9vbCk7XHJcbiAgICAgIHZhciB0b29sbWF0Y2ggPSB7XHJcbiAgICAgICAgdG9vbG1hdGNocmVzdWx0OiB0b29sbWF0Y2hyZXN1bHQsXHJcbiAgICAgICAgc2VudGVuY2U6IG9TZW50ZW5jZSxcclxuICAgICAgICB0b29sIDogb1Rvb2wsXHJcbiAgICAgICAgcmFuayA6IDBcclxuICAgICAgfSBhcyBJTWF0Y2guSVRvb2xNYXRjaDtcclxuICAgICAgdG9vbG1hdGNoLnJhbmsgPSBUb29sTWF0Y2gucmFua1Jlc3VsdCh0b29sbWF0Y2gudG9vbG1hdGNocmVzdWx0KTtcclxuICAgICAgaWYgKFRvb2xNYXRjaC5pc0FueU1hdGNoKHRvb2xtYXRjaCkpIHtcclxuICAgICAgICByZXN1bHQucHVzaCh0b29sbWF0Y2gpO1xyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH0pO1xyXG4gIHJlc3VsdC5zb3J0KFRvb2xNYXRjaC5jb21wQmV0dGVyTWF0Y2gpO1xyXG5cclxuICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICBkZWJ1Z2xvZyhcIm1hdGNoVG9vbHM6IHJhbmtlZCB0b29sbWF0Y2hlc1xcblwiICtcclxuICAgICAgcmVzdWx0Lm1hcChmdW5jdGlvbihvdG9vbG1hdGNoKSB7XHJcbiAgICAgICAgcmV0dXJuIFNlbnRlbmNlLmR1bXBOaWNlKG90b29sbWF0Y2guc2VudGVuY2UpICsgSlNPTi5zdHJpbmdpZnkob3Rvb2xtYXRjaCk7XHJcbiAgICAgIH0pLmpvaW4oXCJcXG5cIilcclxuICAgICk7XHJcbiAgfVxyXG4gIHJldHVybiByZXN1bHQ7XHJcbn0iLCIvKipcbiAqIEBmaWxlIHRvb2xtYXRjaGVyXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC50b29sbWF0Y2hlclxuICogQGNvcHlyaWdodCAoYykgR2VyZCBGb3JzdG1hbm5cbiAqXG4gKiBNYXRjaCBhIHRvb2wgcmVjb3JkIG9uIGEgc2VudGVuY2UsXG4gKlxuICogVGhpcyB3aWxsIHVuaWZ5IG1hdGNoaW5nIHJlcXVpcmVkIGFuZCBvcHRpb25hbCBjYXRlZ29yeSB3b3Jkc1xuICogd2l0aCB0aGUgcmVxdWlyZW1lbnRzIG9mIHRoZSB0b29sLlxuICpcbiAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG4vLyAvIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2xpYi9ub2RlLTQuZC50c1wiIC8+XG52YXIgZGVidWcgPSByZXF1aXJlKFwiZGVidWdcIik7XG52YXIgVXRpbHMgPSByZXF1aXJlKFwiYWJvdF91dGlsc1wiKTtcbnZhciBTZW50ZW5jZSA9IHJlcXVpcmUoXCIuL3NlbnRlbmNlXCIpO1xudmFyIE9wc1dvcmQgPSByZXF1aXJlKFwiLi93b3JkXCIpO1xudmFyIFdvcmQgPSBPcHNXb3JkLldvcmQ7XG52YXIgQ2F0ZWdvcnkgPSBPcHNXb3JkLkNhdGVnb3J5O1xudmFyIGRlYnVnbG9nID0gZGVidWcoJ3Rvb2xtYXRjaGVyJyk7XG5mdW5jdGlvbiBtYXRjaFRvb2wob1NlbnRlbmNlLCBvVG9vbCkge1xuICAgIHZhciB1c2VkID0ge307XG4gICAgdmFyIHJlcXVpcmVkID0ge307XG4gICAgdmFyIG9wdGlvbmFsID0ge307XG4gICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICB2YXIgc3B1cmlvdXMgPSB7fTtcbiAgICB2YXIgdG9vbG1lbnRpb25lZCA9IFtdO1xuICAgIE9iamVjdC5rZXlzKG9Ub29sLnJlcXVpcmVzIHx8IHt9KS5mb3JFYWNoKGZ1bmN0aW9uIChzQ2F0ZWdvcnkpIHtcbiAgICAgICAgdmFyIF9hID0gU2VudGVuY2UuZmluZFdvcmRCeUNhdGVnb3J5KG9TZW50ZW5jZSwgc0NhdGVnb3J5KSwgd29yZCA9IF9hLndvcmQsIGluZGV4ID0gX2EuaW5kZXg7XG4gICAgICAgIGlmICh3b3JkKSB7XG4gICAgICAgICAgICBtYXRjaGVkW3dvcmRdID0gXCJyZXF1aXJlZFwiO1xuICAgICAgICAgICAgdXNlZFtpbmRleF0gPSAxO1xuICAgICAgICAgICAgcmVxdWlyZWRbc0NhdGVnb3J5XSA9IHdvcmQ7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBPYmplY3Qua2V5cyhvVG9vbC5vcHRpb25hbCB8fCB7fSkuZm9yRWFjaChmdW5jdGlvbiAoc0NhdGVnb3J5KSB7XG4gICAgICAgIHZhciBfYSA9IFNlbnRlbmNlLmZpbmRXb3JkQnlDYXRlZ29yeShvU2VudGVuY2UsIHNDYXRlZ29yeSksIHdvcmQgPSBfYS53b3JkLCBpbmRleCA9IF9hLmluZGV4O1xuICAgICAgICBpZiAod29yZCkge1xuICAgICAgICAgICAgbWF0Y2hlZFt3b3JkXSA9IFwib3B0aW9uYWxcIjtcbiAgICAgICAgICAgIHVzZWRbaW5kZXhdID0gMTtcbiAgICAgICAgICAgIG9wdGlvbmFsW3NDYXRlZ29yeV0gPSB3b3JkO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpbmRleCkge1xuICAgICAgICBpZiAoIXVzZWRbaW5kZXhdICYmICFXb3JkLmlzRmlsbGVyKG9Xb3JkKSAmJiAhV29yZC5pc0NhdGVnb3J5KG9Xb3JkKSkge1xuICAgICAgICAgICAgZGVidWdsb2coXCJoYXZlIHNwdXJpb3VzIHdvcmRcIiArIEpTT04uc3RyaW5naWZ5KG9Xb3JkKSk7XG4gICAgICAgICAgICBpZiAoIXVzZWRbaW5kZXhdICYmIG9Xb3JkLmNhdGVnb3J5ID09PSBDYXRlZ29yeS5DQVRfVE9PTCAmJiBvV29yZC5tYXRjaGVkU3RyaW5nID09PSBvVG9vbC5uYW1lKSB7XG4gICAgICAgICAgICAgICAgdG9vbG1lbnRpb25lZC5wdXNoKG9Xb3JkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHNwdXJpb3VzW29Xb3JkLm1hdGNoZWRTdHJpbmddID0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGRlYnVnbG9nKCdzYXRpc2ZpZWQgOiAnICsgT2JqZWN0LmtleXMob1Rvb2wucmVxdWlyZXMpLmpvaW4oXCI7XCIpKTtcbiAgICBkZWJ1Z2xvZygncmVxdWlyZWQgIDogJyArIE9iamVjdC5rZXlzKG9Ub29sLnJlcXVpcmVzKS5qb2luKFwiO1wiKSk7XG4gICAgdmFyIG1pc3NpbmcgPSBVdGlscy5BcnJheVV0aWxzLnNldE1pbnVzKE9iamVjdC5rZXlzKG9Ub29sLnJlcXVpcmVzKSwgT2JqZWN0LmtleXMocmVxdWlyZWQpKS5yZWR1Y2UoZnVuY3Rpb24gKG1hcCwgc0tleSkge1xuICAgICAgICBtYXBbc0tleV0gPSAxO1xuICAgICAgICByZXR1cm4gbWFwO1xuICAgIH0sIHt9KTtcbiAgICByZXR1cm4ge1xuICAgICAgICByZXF1aXJlZDogcmVxdWlyZWQsXG4gICAgICAgIG1pc3Npbmc6IG1pc3NpbmcsXG4gICAgICAgIG9wdGlvbmFsOiBvcHRpb25hbCxcbiAgICAgICAgc3B1cmlvdXM6IHNwdXJpb3VzLFxuICAgICAgICB0b29sbWVudGlvbmVkOiB0b29sbWVudGlvbmVkXG4gICAgfTtcbn1cbmV4cG9ydHMubWF0Y2hUb29sID0gbWF0Y2hUb29sO1xudmFyIG1hdGNoID0gcmVxdWlyZShcIi4vbWF0Y2hcIik7XG52YXIgVG9vbE1hdGNoID0gbWF0Y2guVG9vbE1hdGNoO1xuZnVuY3Rpb24gbWF0Y2hUb29scyhhU2VudGVuY2VzLCBhVG9vbCkge1xuICAgIC8vdmFyIHN0cmVhbSA9IG5ldyBzdHJlYW11dGlscy5NYXRjaFN0cmVhbSgpO1xuICAgIGRlYnVnbG9nKFwibWF0Y2hUb29sczogc2VudGVuY2VzIFxcblwiICtcbiAgICAgICAgYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSwgaW5kZXgpIHtcbiAgICAgICAgICAgIHJldHVybiAoaW5kZXggPCAzMCkgPyBcIltcIiArIGluZGV4ICsgXCJdXCIgKyBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBTZW50ZW5jZS5kdW1wTmljZShvU2VudGVuY2UpIDogXCJcXG5cIjtcbiAgICAgICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIGFUb29sLmZvckVhY2goZnVuY3Rpb24gKG9Ub29sKSB7XG4gICAgICAgIGFTZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgICB2YXIgdG9vbG1hdGNocmVzdWx0ID0gbWF0Y2hUb29sKG9TZW50ZW5jZSwgb1Rvb2wpO1xuICAgICAgICAgICAgdmFyIHRvb2xtYXRjaCA9IHtcbiAgICAgICAgICAgICAgICB0b29sbWF0Y2hyZXN1bHQ6IHRvb2xtYXRjaHJlc3VsdCxcbiAgICAgICAgICAgICAgICBzZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgICAgICAgICAgIHRvb2w6IG9Ub29sLFxuICAgICAgICAgICAgICAgIHJhbms6IDBcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0b29sbWF0Y2gucmFuayA9IFRvb2xNYXRjaC5yYW5rUmVzdWx0KHRvb2xtYXRjaC50b29sbWF0Y2hyZXN1bHQpO1xuICAgICAgICAgICAgaWYgKFRvb2xNYXRjaC5pc0FueU1hdGNoKHRvb2xtYXRjaCkpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaCh0b29sbWF0Y2gpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICByZXN1bHQuc29ydChUb29sTWF0Y2guY29tcEJldHRlck1hdGNoKTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhcIm1hdGNoVG9vbHM6IHJhbmtlZCB0b29sbWF0Y2hlc1xcblwiICtcbiAgICAgICAgICAgIHJlc3VsdC5tYXAoZnVuY3Rpb24gKG90b29sbWF0Y2gpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gU2VudGVuY2UuZHVtcE5pY2Uob3Rvb2xtYXRjaC5zZW50ZW5jZSkgKyBKU09OLnN0cmluZ2lmeShvdG9vbG1hdGNoKTtcbiAgICAgICAgICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuZXhwb3J0cy5tYXRjaFRvb2xzID0gbWF0Y2hUb29scztcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
