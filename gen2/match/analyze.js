/**
 *
 * @module jfseb.fdevstart.analyze
 * @file analyze.ts
 * @copyright (c) 2016 Gerd Forstmann
 */
"use strict";

var InputFilter = require('./inputFilter');
var debug = require('debug');
var debuglog = debug('analyze');
var logger = require('../utils/logger');
var perf = logger.perf('analyze');
var Toolmatcher = require('./toolmatcher');
var Sentence = require('./sentence');
function analyzeAll(sString, rules, aTools, words) {
    "use strict";

    if (sString.length === 0) {
        return [];
    } else {
        perf('analyzeString');
        //   InputFilter.resetCnt();
        var matched = InputFilter.analyzeString(sString, rules, words);
        perf('analyzeString');
        //   InputFilter.dumpCnt();
        perf('expand');
        debuglog("After matched " + JSON.stringify(matched));
        var aSentences = InputFilter.expandMatchArr(matched);
        debuglog("after expand" + aSentences.map(function (oSentence) {
            return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
        }).join("\n"));
        perf('expand');
        var aSentencesReinforced = InputFilter.reinForce(aSentences);
        //aSentences.map(function(oSentence) { return InputFilter.reinForce(oSentence); });
        debuglog("after reinforce" + aSentencesReinforced.map(function (oSentence) {
            return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
        }).join("\n"));
        perf('matchTools');
        var matchedTools = Toolmatcher.matchTools(aSentences, aTools); //aTool: Array<IMatch.ITool>): any /* objectstream*/ {
        perf('matchTools');
        debuglog(" matchedTools" + JSON.stringify(matchedTools, undefined, 2));
        return matchedTools;
    }
}
exports.analyzeAll = analyzeAll;
/**
 * TODO: rework this to work correctly with sets
 */
function isComplete(match) {
    // TODO -> analyze sets
    return match && match.rank > 0.6 && Object.keys(match.toolmatchresult.missing || {}).length === 0;
}
exports.isComplete = isComplete;
function getPrompt(match) {
    if (!match) {
        return;
    }
    if (match.rank < 0.6) {
        return undefined;
    }
    if (Object.keys(match.toolmatchresult.missing).length) {
        var missing = Object.keys(match.toolmatchresult.missing)[0];
        return {
            category: missing,
            text: 'Please provide a missing "' + missing + '"?'
        };
    }
    return undefined;
}
exports.getPrompt = getPrompt;
function setPrompt(match, prompt, response) {
    if (!match) {
        return;
    }
    if (response.toLowerCase() !== 'cancel' && response.toLowerCase() !== 'abort') {
        var u = {};
        u.category = prompt.category;
        u._ranking = 1.0;
        u.matchedString = response;
        /// TODO test whether this can be valid at all?
        match.toolmatchresult.required[prompt.category] = u;
        delete match.toolmatchresult.missing[prompt.category];
    }
}
exports.setPrompt = setPrompt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9hbmFseXplLnRzIl0sIm5hbWVzIjpbIklucHV0RmlsdGVyIiwicmVxdWlyZSIsImRlYnVnIiwiZGVidWdsb2ciLCJsb2dnZXIiLCJwZXJmIiwiVG9vbG1hdGNoZXIiLCJTZW50ZW5jZSIsImFuYWx5emVBbGwiLCJzU3RyaW5nIiwicnVsZXMiLCJhVG9vbHMiLCJ3b3JkcyIsImxlbmd0aCIsIm1hdGNoZWQiLCJhbmFseXplU3RyaW5nIiwiSlNPTiIsInN0cmluZ2lmeSIsImFTZW50ZW5jZXMiLCJleHBhbmRNYXRjaEFyciIsIm1hcCIsIm9TZW50ZW5jZSIsInJhbmtpbmdQcm9kdWN0Iiwiam9pbiIsImFTZW50ZW5jZXNSZWluZm9yY2VkIiwicmVpbkZvcmNlIiwibWF0Y2hlZFRvb2xzIiwibWF0Y2hUb29scyIsInVuZGVmaW5lZCIsImV4cG9ydHMiLCJpc0NvbXBsZXRlIiwibWF0Y2giLCJyYW5rIiwiT2JqZWN0Iiwia2V5cyIsInRvb2xtYXRjaHJlc3VsdCIsIm1pc3NpbmciLCJnZXRQcm9tcHQiLCJjYXRlZ29yeSIsInRleHQiLCJzZXRQcm9tcHQiLCJwcm9tcHQiLCJyZXNwb25zZSIsInRvTG93ZXJDYXNlIiwidSIsIl9yYW5raW5nIiwibWF0Y2hlZFN0cmluZyIsInJlcXVpcmVkIl0sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0FBT0E7O0FBRUEsSUFBWUEsY0FBV0MsUUFBTSxlQUFOLENBQXZCO0FBRUEsSUFBWUMsUUFBS0QsUUFBTSxPQUFOLENBQWpCO0FBRUEsSUFBTUUsV0FBV0QsTUFBTSxTQUFOLENBQWpCO0FBSUEsSUFBWUUsU0FBTUgsUUFBTSxpQkFBTixDQUFsQjtBQUNBLElBQUlJLE9BQU9ELE9BQU9DLElBQVAsQ0FBWSxTQUFaLENBQVg7QUFPQSxJQUFZQyxjQUFXTCxRQUFNLGVBQU4sQ0FBdkI7QUFFQSxJQUFZTSxXQUFRTixRQUFNLFlBQU4sQ0FBcEI7QUFFQSxTQUFBTyxVQUFBLENBQTJCQyxPQUEzQixFQUE0Q0Ms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K0U7QUFDN0UsWUFBSUMsSUFBSSxFQUFSO0FBQ0FBLFVBQUVOLFFBQUYsR0FBYUcsT0FBT0gsUUFBcEI7QUFDQU0sVUFBRUMsUUFBRixHQUFhLEdBQWI7QUFDQUQsVUFBRUUsYUFBRixHQUFrQkosUUFBbEI7QUFDQTtBQUNBWCxjQUFNSSxlQUFOLENBQXNCWSxRQUF0QixDQUErQk4sT0FBT0gsUUFBdEMsSUFBa0RNLENBQWxEO0FBQ0EsZUFBT2IsTUFBTUksZUFBTixDQUFzQkMsT0FBdEIsQ0FBOEJLLE9BQU9ILFFBQXJDLENBQVA7QUFDRjtBQUNIO0FBZGVULFFBQUFXLFNBQUEsR0FBU0EsU0FBVCIsImZpbGUiOiJtYXRjaC9hbmFseXplLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKlxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuYW5hbHl6ZVxuICogQGZpbGUgYW5hbHl6ZS50c1xuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxuICovXG5cblwidXNlIHN0cmljdFwiO1xuXG5pbXBvcnQgKiBhcyBJbnB1dEZpbHRlciBmcm9tICcuL2lucHV0RmlsdGVyJztcblxuaW1wb3J0ICogYXMgZGVidWcgZnJvbSAnZGVidWcnO1xuXG5jb25zdCBkZWJ1Z2xvZyA9IGRlYnVnKCdhbmFseXplJyk7XG5cblxuXG5pbXBvcnQgKiBhcyBsb2dnZXIgZnJvbSAnLi4vdXRpbHMvbG9nZ2VyJztcbnZhciBwZXJmID0gbG9nZ2VyLnBlcmYoJ2FuYWx5emUnKTtcblxuXG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuLi91dGlscy91dGlscyc7XG5cbmltcG9ydCAqIGFzIElNYXRjaCBmcm9tICcuL2lmbWF0Y2gnO1xuXG5pbXBvcnQgKiBhcyBUb29sbWF0Y2hlciBmcm9tICcuL3Rvb2xtYXRjaGVyJztcblxuaW1wb3J0ICogYXMgU2VudGVuY2UgZnJvbSAnLi9zZW50ZW5jZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBhbmFseXplQWxsKHNTdHJpbmc6IHN0cmluZywgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCBhVG9vbHM6IEFycmF5PElNYXRjaC5JVG9vbD4sIHdvcmRzPyApIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIGlmIChzU3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBbXTtcbiAgfSBlbHNlIHtcbiAgICBwZXJmKCdhbmFseXplU3RyaW5nJyk7XG4gLy8gICBJbnB1dEZpbHRlci5yZXNldENudCgpO1xuICAgIHZhciBtYXRjaGVkID0gSW5wdXRGaWx0ZXIuYW5hbHl6ZVN0cmluZyhzU3RyaW5nLCBydWxlcywgd29yZHMpO1xuICAgIHBlcmYoJ2FuYWx5emVTdHJpbmcnKTtcbiAvLyAgIElucHV0RmlsdGVyLmR1bXBDbnQoKTtcbiAgICBwZXJmKCdleHBhbmQnKTtcbiAgICBkZWJ1Z2xvZyhcIkFmdGVyIG1hdGNoZWQgXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkKSk7XG4gICAgdmFyIGFTZW50ZW5jZXMgPSBJbnB1dEZpbHRlci5leHBhbmRNYXRjaEFycihtYXRjaGVkKTtcbiAgICBkZWJ1Z2xvZyhcImFmdGVyIGV4cGFuZFwiICsgYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgcGVyZignZXhwYW5kJyk7XG4gICAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gSW5wdXRGaWx0ZXIucmVpbkZvcmNlKGFTZW50ZW5jZXMpO1xuICAgIC8vYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24ob1NlbnRlbmNlKSB7IHJldHVybiBJbnB1dEZpbHRlci5yZWluRm9yY2Uob1NlbnRlbmNlKTsgfSk7XG4gICAgZGVidWdsb2coXCJhZnRlciByZWluZm9yY2VcIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgIHBlcmYoJ21hdGNoVG9vbHMnKTtcbiAgICB2YXIgbWF0Y2hlZFRvb2xzID0gVG9vbG1hdGNoZXIubWF0Y2hUb29scyhhU2VudGVuY2VzLCBhVG9vbHMpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8qIG9iamVjdHN0cmVhbSovIHtcbiAgICBwZXJmKCdtYXRjaFRvb2xzJyk7XG4gICAgZGVidWdsb2coXCIgbWF0Y2hlZFRvb2xzXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkVG9vbHMsIHVuZGVmaW5lZCwgMikpO1xuICAgIHJldHVybiBtYXRjaGVkVG9vbHM7XG4gIH1cbn1cblxuLyoqXG4gKiBUT0RPOiByZXdvcmsgdGhpcyB0byB3b3JrIGNvcnJlY3RseSB3aXRoIHNldHNcbiAqL1xuXG5leHBvcnQgZnVuY3Rpb24gaXNDb21wbGV0ZShtYXRjaCA6ICBJTWF0Y2guSVRvb2xNYXRjaCkge1xuICAvLyBUT0RPIC0+IGFuYWx5emUgc2V0c1xuICByZXR1cm4gbWF0Y2ggJiYgbWF0Y2gucmFuayA+IDAuNiAmJlxuICAgIE9iamVjdC5rZXlzKG1hdGNoLnRvb2xtYXRjaHJlc3VsdC5taXNzaW5nIHx8e30pLmxlbmd0aCA9PT0gMFxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJvbXB0KG1hdGNoIDogIElNYXRjaC5JVG9vbE1hdGNoKSB7XG4gIGlmKCFtYXRjaCkge1xuICAgICAgcmV0dXJuO1xuICB9XG4gIGlmIChtYXRjaC5yYW5rIDwgMC42ICkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgaWYoT2JqZWN0LmtleXMobWF0Y2gudG9vbG1hdGNocmVzdWx0Lm1pc3NpbmcpLmxlbmd0aCApIHtcbiAgICB2YXIgbWlzc2luZyA9IE9iamVjdC5rZXlzKG1hdGNoLnRvb2xtYXRjaHJlc3VsdC5taXNzaW5nKVswXTtcbiAgICByZXR1cm4ge1xuICAgICAgY2F0ZWdvcnkgOiBtaXNzaW5nLFxuICAgICAgdGV4dCA6ICdQbGVhc2UgcHJvdmlkZSBhIG1pc3NpbmcgXCInICsgbWlzc2luZyArICdcIj8nXG4gICAgfVxuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHNldFByb21wdChtYXRjaCA6IElNYXRjaC5JVG9vbE1hdGNoLCBwcm9tcHQ6IElNYXRjaC5JUHJvbXB0LFxuICByZXNwb25zZSA6IHN0cmluZykge1xuICAgIGlmKCFtYXRjaCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAocmVzcG9uc2UudG9Mb3dlckNhc2UoKSAhPT0gJ2NhbmNlbCcgJiYgcmVzcG9uc2UudG9Mb3dlckNhc2UoKSAhPT0gJ2Fib3J0Jykge1xuICAgICAgdmFyIHUgPSB7fSBhcyBJTWF0Y2guSVdvcmQ7XG4gICAgICB1LmNhdGVnb3J5ID0gcHJvbXB0LmNhdGVnb3J5O1xuICAgICAgdS5fcmFua2luZyA9IDEuMDtcbiAgICAgIHUubWF0Y2hlZFN0cmluZyA9IHJlc3BvbnNlO1xuICAgICAgLy8vIFRPRE8gdGVzdCB3aGV0aGVyIHRoaXMgY2FuIGJlIHZhbGlkIGF0IGFsbD9cbiAgICAgIG1hdGNoLnRvb2xtYXRjaHJlc3VsdC5yZXF1aXJlZFtwcm9tcHQuY2F0ZWdvcnldID0gdTtcbiAgICAgIGRlbGV0ZSBtYXRjaC50b29sbWF0Y2hyZXN1bHQubWlzc2luZ1twcm9tcHQuY2F0ZWdvcnldO1xuICAgfVxufVxuXG5cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
