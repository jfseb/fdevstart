/**
 *
 * @module jfseb.fdevstart.analyze
 * @file analyze.ts
 * @copyright (c) 2016 Gerd Forstmann
 */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const abot_erbase_1 = require("abot_erbase");
const debug = require("debug");
const debuglog = debug('analyze');
const logger = require("../utils/logger");
var perf = logger.perf('analyze');
const Toolmatcher = require("./toolmatcher");
function analyzeAll(sString, rules, aTools, words) {
    "use strict";
    if (sString.length === 0) {
        return [];
    }
    else {
        perf('analyzeString');
        //   InputFilter.resetCnt();
        var matched = abot_erbase_1.InputFilter.analyzeString(sString, rules, words);
        perf('analyzeString');
        //   InputFilter.dumpCnt();
        perf('expand');
        debuglog("After matched " + JSON.stringify(matched));
        var aSentences = abot_erbase_1.InputFilter.expandMatchArr(matched);
        aSentences.sort(abot_erbase_1.Sentence.cmpRankingProduct);
        debuglog("after expand" + aSentences.map(function (oSentence) {
            return abot_erbase_1.Sentence.rankingProduct(oSentence) + ":" + abot_erbase_1.Sentence.dumpNice(oSentence);
        }).join("\n"));
        if (debuglog.enabled) {
            debuglog(" after expand:" + abot_erbase_1.Sentence.dumpNiceArr(aSentencesReinforced, abot_erbase_1.Sentence.rankingProduct));
        }
        perf('expand');
        var aSentencesReinforced = abot_erbase_1.InputFilter.reinForce(aSentences);
        //aSentences.map(function(oSentence) { return InputFilter.reinForce(oSentence); });
        aSentencesReinforced.sort(abot_erbase_1.Sentence.cmpRankingProduct);
        debuglog("after reinforce \n" + aSentencesReinforced.map(function (oSentence) {
            return abot_erbase_1.Sentence.rankingProduct(oSentence) + ":" + abot_erbase_1.Sentence.dumpNice(oSentence);
        }).join("\n"));
        if (debuglog.enabled) {
            debuglog(" after reinforce:" + abot_erbase_1.Sentence.dumpNiceArr(aSentencesReinforced, abot_erbase_1.Sentence.rankingProduct));
        }
        aSentencesReinforced = abot_erbase_1.Sentence.cutoffSentenceAtRatio(aSentencesReinforced);
        perf('matchTools');
        var matchedTools = Toolmatcher.matchTools(aSentencesReinforced, aTools); //aTool: Array<IMatch.ITool>): any /* objectstream*/ {
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
    return match && match.rank > 0.6 &&
        Object.keys(match.toolmatchresult.missing || {}).length === 0;
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

//# sourceMappingURL=analyze.js.map
