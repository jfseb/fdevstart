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
var Toolmatcher = require('./toolmatcher');
var Sentence = require('./sentence');
function analyzeAll(sString, aRules, aTools) {
    if (sString.length === 0) {
        return [];
    }
    else {
        var matched = InputFilter.analyzeString(sString, aRules);
        debuglog("After matched " + JSON.stringify(matched));
        var aSentences = InputFilter.expandMatchArr(matched);
        debuglog("after expand" + aSentences.map(function (oSentence) {
            return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
        }).join("\n"));
        var aSentencesReinforced = InputFilter.reinForce(aSentences);
        //aSentences.map(function(oSentence) { return InputFilter.reinForce(oSentence); });
        debuglog("after reinforce" + aSentencesReinforced.map(function (oSentence) {
            return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
        }).join("\n"));
        var matchedTools = Toolmatcher.matchTools(aSentences, aTools); //aTool: Array<IMatch.ITool>): any /* objectstream*/ {
        debuglog(" matchedTools" + JSON.stringify(matchedTools, undefined, 2));
        return matchedTools;
    }
}
exports.analyzeAll = analyzeAll;
function isComplete(match) {
    return match && match.rank > 0.6 &&
        Object.keys(match.toolmatchresult.missing || {}).length === 0;
}
exports.isComplete = isComplete;
function getPrompt(match) {
    if (!match) {
        return;
    }
    if (match.rank > 0.6) {
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