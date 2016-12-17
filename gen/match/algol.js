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
/**
 * levenshtein distances above this will not be considered valid
 */
exports.Cutoff_LevenShtein = 150;
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

//# sourceMappingURL=algol.js.map
