/**
 *
 * @module jfseb.fdevstart.analyze
 * @file analyze.ts
 * @copyright (c) 2016 Gerd Forstmann
 */
"use strict";
var InputFilter = require('./InputFilter');
var debug = require('debug');
var debuglog = debug('analyze');
var Toolmatcher = require('./toolmatcher');
var Sentence = require('./Sentence');
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

//# sourceMappingURL=analyze.js.map
