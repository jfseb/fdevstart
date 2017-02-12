/**
 * @file algol.ts
 *
 * Constant determining the algorithm
 */
"use strict";
/**
 * Number of sentences which are not used
 */
exports.Cutoff_Sentences = 120;
/*
 try 4, 1.2

 instead of 8, 1.5
*/
exports.calcDist = {
    lengthDelta1: 15,
};
/**
 * levenshtein distances above this will not be considered valid
 */
exports.Cutoff_LevenShtein = 150;
exports.Cutoff_WordMatch = 0.85; // 0.98
exports.Cutoff_rangeCloseMatch = 0.98;
/**
 * Maximum amount of spaces permitted in a combined word
 *
 * Note that quoted words are never combined, and may exceed this limit,
 * e.g.   A "q u o t e d" entry.
 */
exports.MaxSpacesPerCombinedWord = 3;
/**
 * Weight factor to use on the a given word distance
 * of 0, 1, 2, 3 ....
 */
exports.aReinforceDistWeight = [0.1, 0.1, 0.05, 0.02];
/**
 * only the top n words are considered
 */
exports.Top_N_WordCategorizations = 5;
exports.DescribeValueListMinCountValueList = 3;
exports.DescribeValueListLengthCharLimit = 60;

//# sourceMappingURL=algol.js.map
