/**
 * @file word
 * @module jfseb.fdevstart.sentence
 * @copyright (c) Gerd Forstmann
 *
 * Word specific qualifications,
 *
 * These functions expose parf the underlying model,
 * e.g.
 * Match a tool record on a sentence,
 *
 * This will unify matching required and optional category words
 * with the requirements of the tool.
 *
 */
"use strict";
exports.Category = {
    CAT_CATEGORY: "category",
    CAT_DOMAIN: "domain",
    CAT_FILLER: "filler",
    CAT_TOOL: "tool",
    _aCatFillers: ["filler"],
    isDomain: function (sCategory) {
        return sCategory === exports.Category.CAT_DOMAIN;
    },
    isCategory: function (sCategory) {
        return sCategory === exports.Category.CAT_CATEGORY;
    },
    isFiller: function (sCategory) {
        return exports.Category._aCatFillers.indexOf(sCategory) >= 0;
    }
};
exports.Word = {
    isFiller: function (word) {
        return word.category === undefined || exports.Category.isFiller(word.category);
    },
    isCategory: function (word) {
        return exports.Category.isCategory(word.category);
    },
    isDomain: function (word) {
        return exports.Category.isDomain(word.category);
    }
};

//# sourceMappingURL=word.js.map
