
/**
 * @file algol.ts
 *
 * Constant determining the algorithm
 */


/**
 * Number of sentences which are not used
 */
export const Cutoff_Sentences = 120;

/**
 * levenshtein distances above this will not be considered valid
 */
export const Cutoff_LevenShtein : number = 150;

/**
 * Maximum amount of spaces permitted in a combined word
 *
 * Note that quoted words are never combined, and may exceed this limit,
 * e.g.   A "q u o t e d" entry.
 */
export const MaxSpacesPerCombinedWord : number = 3;

/**
 * Weight factor to use on the a given word distance
 * of 0, 1, 2, 3 ....
 */
export const aReinforceDistWeight: Array<number> = [0.1, 0.1, 0.05, 0.02];

/**
 * only the top n words are considered
 */
export const Top_N_WordCategorizations = 5;



