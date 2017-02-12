/**
 * @file sentence
 * @module jfseb.fdevstart.sentence
 * @copyright (c) Gerd Forstmann
 *
 * Match a tool record on a sentence,
 *
 * This will unify matching required and optional category words
 * with the requirements of the tool.
 *
 */
"use strict";
// <reference path="../../lib/node-4.d.ts" />
var debug = require("debug");
var debuglog = debug('sentence');
function findWordByCategory(oSentence, sCategory) {
    var res = {};
    oSentence.every(function (oWord, iIndex) {
        if (oWord.category === sCategory) {
            res = { word: oWord,
                index: iIndex };
            return false;
        }
        return true;
    });
    return res;
}
exports.findWordByCategory = findWordByCategory;
function getDistinctCategoriesInSentence(oSentence) {
    var res = [];
    var resm = {};
    oSentence.forEach(function (oWord) {
        if (oWord.category === "category") {
            if (!resm[oWord.matchedString]) {
                res.push(oWord.matchedString);
                resm[oWord.matchedString] = 1;
            }
        }
    });
    return res;
}
exports.getDistinctCategoriesInSentence = getDistinctCategoriesInSentence;
function rankingGeometricMean(oSentence) {
    var length = oSentence.length;
    if (length === 0) {
        return 1.0;
    }
    var prod = oSentence.reduce(function (prev, oWord) {
        return prev * (oWord._ranking || 1.0);
    }, 1.0);
    // TODO: find somethign faster ;-)
    return Math.pow(prod, 1 / length);
}
exports.rankingGeometricMean = rankingGeometricMean;
function rankingProduct(oSentence) {
    return rankingGeometricMean(oSentence);
}
exports.rankingProduct = rankingProduct;
function cmpRankingProduct(a, b) {
    return -(rankingProduct(a) - rankingProduct(b));
}
exports.cmpRankingProduct = cmpRankingProduct;
function cutoffSentenceAtRatio(sentences) {
    if (sentences.length === 0) {
        return sentences;
    }
    var bestRank = rankingProduct(sentences[0]);
    for (var i = 1; (i < Math.min(sentences.length, 300)) && ((rankingProduct(sentences[i]) / bestRank) > 0.8); ++i) {
    }
    debuglog("reduce sentences by " + i + "/" + sentences.length);
    return sentences.slice(0, i);
}
exports.cutoffSentenceAtRatio = cutoffSentenceAtRatio;
function dumpNice(sentence, fn) {
    var result = [];
    sentence.forEach(function (oWord, index) {
        var sWord = "[" + index + "] : " + (oWord._ranking || 0).toFixed(3) + " " + oWord.category + " \"" + oWord.string + "\" => \"" + oWord.matchedString + "\"";
        result.push(sWord + "\n");
    });
    result.push(".\n");
    return result.join("");
}
exports.dumpNice = dumpNice;
function dumpNiceArr(sentences, fn) {
    if (!sentences) {
        return "";
    }
    var res = sentences.reduce(function (prev, oSentence) {
        return prev + dumpNice(oSentence);
    }, "");
    return res;
}
exports.dumpNiceArr = dumpNiceArr;

//# sourceMappingURL=sentence.js.map
