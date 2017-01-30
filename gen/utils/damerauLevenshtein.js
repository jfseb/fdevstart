'use strict';
// based on: http://en.wikibooks.org/wiki/Algorithm_implementation/Strings/Levenshtein_distance
// and:  http://en.wikipedia.org/wiki/Damerau%E2%80%93Levenshtein_distance
/**
 * Distance of strings algorithm
 * @module fsdevstart.utils.damerauLevenshtein
 */
/**
 * a function calculating distance between two strings
 * according to the damerau Levenshtein algorithm
 * (this algorithm, in contrast to plain levenshtein treats
 * swapping of characters a distance 1  "word"  <-> "wrod )
 * @param {string} a
 * @param {string} b
 * @public
 */
function levenshteinDamerau(a, b) {
    var i;
    var j;
    var cost;
    var d = [];
    if (a.length === 0) {
        return b.length;
    }
    if (b.length === 0) {
        return a.length;
    }
    for (i = 0; i <= a.length; i++) {
        d[i] = [];
        d[i][0] = i;
    }
    for (j = 0; j <= b.length; j++) {
        d[0][j] = j;
    }
    for (i = 1; i <= a.length; i++) {
        for (j = 1; j <= b.length; j++) {
            if (a.charAt(i - 1) === b.charAt(j - 1)) {
                cost = 0;
            }
            else {
                cost = 1;
            }
            d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
            if (i > 1 &&
                j > 1 &&
                a.charAt(i - 1) === b.charAt(j - 2) &&
                a.charAt(i - 2) === b.charAt(j - 1)) {
                d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
            }
        }
    }
    return d[a.length][b.length];
}
exports.levenshteinDamerau = levenshteinDamerau;
function levenshtein(a, b) {
    //return 2.0 * sift3Distance(a,b); //,6,7); // + b.length / 2);
    return levenshteinDamerau(a, b);
}
exports.levenshtein = levenshtein;
function sift3Distance(s1, s2) {
    if (s1 == null || s1.length === 0) {
        if (s2 == null || s2.length === 0) {
            return 0;
        }
        else {
            return s2.length;
        }
    }
    if (s2 == null || s2.length === 0) {
        return s1.length;
    }
    if (Math.abs(s1.length - s2.length) > 20) {
        return Math.max(s1.length, s2.length) / 2;
    }
    var c = 0;
    var offset1 = 0;
    var offset2 = 0;
    var lcs = 0;
    var maxOffset = 3;
    while ((c + offset1 < s1.length) && (c + offset2 < s2.length)) {
        if (s1.charAt(c + offset1) == s2.charAt(c + offset2)) {
            lcs++;
        }
        else {
            offset1 = 0;
            offset2 = 0;
            for (var i = 0; i < maxOffset; i++) {
                if ((c + i < s1.length) && (s1.charAt(c + i) == s2.charAt(c))) {
                    offset1 = i;
                    break;
                }
                if ((c + i < s2.length) && (s1.charAt(c) == s2.charAt(c + i))) {
                    offset2 = i;
                    break;
                }
            }
        }
        c++;
    }
    return (s1.length + s2.length) / 2 - lcs;
}
exports.sift3Distance = sift3Distance;
/*
//  Sift4 - common version
// https://siderite.blogspot.com/2014/11/super-fast-and-accurate-string-distance.html
// online algorithm to compute the distance between two strings in O(n)
// maxOffset is the number of characters to search for matching letters
// maxDistance is the distance at which the algorithm should stop computing the value and just exit (the strings are too different anyway)
export function sift4(s1, s2, maxOffset, maxDistance) {
    if (!s1||!s1.length) {
        if (!s2) {
            return 0;
        }
        return s2.length;
    }

    if (!s2||!s2.length) {
        return s1.length;
    }

    var l1=s1.length;
    var l2=s2.length;
    if(Math.abs(l1 - l2) > maxDistance) {
      return 50000;
    }

    var c1 = 0;  //cursor for string 1
    var c2 = 0;  //cursor for string 2
    var lcss = 0;  //largest common subsequence
    var local_cs = 0; //local common substring
    var trans = 0;  //number of transpositions ('ab' vs 'ba')
    var offset_arr=[];  //offset pair array, for computing the transpositions

    while ((c1 < l1) && (c2 < l2)) {
        if (s1.charAt(c1) == s2.charAt(c2)) {
            local_cs++;
            var isTrans=false;
            //see if current match is a transposition
            var i=0;
            while (i<offset_arr.length) {
                var ofs=offset_arr[i];
                if (c1<=ofs.c1 || c2 <= ofs.c2) {
                    // when two matches cross, the one considered a transposition is the one with the largest difference in offsets
                    isTrans=Math.abs(c2-c1)>=Math.abs(ofs.c2-ofs.c1);
                    if (isTrans)
                    {
                        trans++;
                    } else
                    {
                        if (!ofs.trans) {
                            ofs.trans=true;
                            trans++;
                        }
                    }
                    break;
                } else {
                    if (c1>ofs.c2 && c2>ofs.c1) {
                        offset_arr.splice(i,1);
                    } else {
                        i++;
                    }
                }
            }
            offset_arr.push({
                c1:c1,
                c2:c2,
                trans:isTrans
            });
        } else {
            lcss+=local_cs;
            local_cs=0;
            if (c1!=c2) {
                c1=c2=Math.min(c1,c2);  //using min allows the computation of transpositions
            }
            //if matching characters are found, remove 1 from both cursors (they get incremented at the end of the loop)
            //so that we can have only one code block handling matches
            for (var i = 0; i < maxOffset && (c1+i<l1 || c2+i<l2); i++) {
                if ((c1 + i < l1) && (s1.charAt(c1 + i) == s2.charAt(c2))) {
                    c1+= i-1;
                    c2--;
                    break;
                }
                if ((c2 + i < l2) && (s1.charAt(c1) == s2.charAt(c2 + i))) {
                    c1--;
                    c2+= i-1;
                    break;
                }
            }
        }
        c1++;
        c2++;
        if (maxDistance)
        {
            var temporaryDistance=Math.max(c1,c2)-lcss+trans;
            if (temporaryDistance>=maxDistance) return 50000; // Math.round(temporaryDistance);
        }
        // this covers the case where the last match is on the last token in list, so that it can compute transpositions correctly
        if ((c1 >= l1) || (c2 >= l2)) {
            lcss+=local_cs;
            local_cs=0;
            c1=c2=Math.min(c1,c2);
        }
    }
    lcss+=local_cs;
    return Math.round(Math.max(l1,l2)- lcss +trans); //add the cost of transpositions to the final result
}

*/
/*
jaro_winkler modified
origin from :
https://github.com/thsig/jaro-winkler-JS/blob/master/jaro_winkler.js

The MIT License (MIT)

Copyright (c) 2015 Thorarinn Sigurdsson

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


*/
var jaro_winkler = { lcadjustments: {} };
/* JS implementation of the strcmp95 C function written by
Bill Winkler, George McLaughlin, Matt Jaro and Maureen Lynch,
released in 1994 (http://web.archive.org/web/20100227020019/http://www.census.gov/geo/msb/stand/strcmp.c).
a and b should be strings. Always performs case-insensitive comparisons
and always adjusts for long strings. */
function jaro_winkler_adj(a, b) {
    if (!a || !b) {
        return 0.0;
    }
    // we have trimmed
    //a = a.trim().toUpperCase();
    //b = b.trim().toUpperCase();
    var a_len = a.length;
    var b_len = b.length;
    var a_flag = [];
    var b_flag = [];
    var search_range = Math.floor(Math.max(a_len, b_len) / 2) - 1;
    var minv = Math.min(a_len, b_len);
    // Looking only within the search range, count and flag the matched pairs.
    var Num_com = 0;
    var yl1 = b_len - 1;
    var j = 0;
    for (var i = 0; i < a_len; i++) {
        var lowlim = (i >= search_range) ? i - search_range : 0;
        var hilim = ((i + search_range) <= yl1) ? (i + search_range) : yl1;
        for (var j = lowlim; j <= hilim; j++) {
            if (b_flag[j] !== 1 && a[j] === b[i]) {
                a_flag[j] = 1;
                b_flag[i] = 1;
                Num_com++;
                break;
            }
        }
    }
    // Return if no characters in common
    if (Num_com === 0) {
        return 0.0;
    }
    // Count the number of transpositions
    var k = 0;
    var N_trans = 0;
    for (var i = 0; i < a_len; i++) {
        if (a_flag[i] === 1) {
            var j = 0;
            for (j = k; j < b_len; j++) {
                if (b_flag[j] === 1) {
                    k = j + 1;
                    break;
                }
            }
            if (a[i] !== b[j]) {
                N_trans++;
            }
        }
    }
    N_trans = Math.floor(N_trans / 2);
    // Adjust for similarities in nonmatched characters
    var N_simi = 0;
    var adjwt = {}; // jaro_winkler.lcadjustments;
    if (minv > Num_com) {
        for (var i = 0; i < a_len; i++) {
            if (!a_flag[i]) {
                for (var j = 0; j < b_len; j++) {
                    if (!b_flag[j]) {
                        if (adjwt[a[i]] === b[j]) {
                            N_simi += 3;
                            b_flag[j] = 2;
                            break;
                        }
                    }
                }
            }
        }
    }
    var Num_sim = (N_simi / 10.0) + Num_com;
    // Main weight computation
    var weight = Num_sim / a_len + Num_sim / b_len + (Num_com - N_trans) / Num_com;
    weight = weight / 3;
    // Continue to boost the weight if the strings are similar
    if (weight > 0.7) {
        // Adjust for having up to the first 4 characters in common
        var j = (minv >= 4) ? 4 : minv;
        var i = 0;
        for (i = 0; (i < j) && a[i] === b[i]; i++) { }
        if (i) {
            weight += i * 0.1 * (1.0 - weight);
        }
        ;
        // Adjust for long strings.
        // After agreeing beginning chars, at least two more must agree
        // and the agreeing characters must be more than half of the
        // remaining characters.
        if (minv > 4 && Num_com > i + 1 && 2 * Num_com >= minv + i) {
            weight += (1 - weight) * ((Num_com - i - 1) / (a_len * b_len - i * 2 + 2));
        }
    }
    return weight;
}
exports.jaro_winkler_adj = jaro_winkler_adj;
;
// The char adjustment table used above
/*
jaro_winkler.adjustments = {
   'A': 'E',
   'A': 'I',
   'A': 'O',
  'A': 'U',
  'B': 'V',
  'E': 'I',
  'E': 'O',
  'E': 'U',
  'I': 'O',
  'I': 'U',
  'O': 'U',
  'I': 'Y',
  'E': 'Y',
  'C': 'G',
  'E': 'F',
  'W': 'U',
  'W': 'V',
  'X': 'K',
  'S': 'Z',
  'X': 'S',
  'Q': 'C',
  'U': 'V',
  'M': 'N',
  'L': 'I',
  'Q': 'O',
  'P': 'R',
  'I': 'J',
  '2': 'Z',
  '5': 'S',
  '8': 'B',
  '1': 'I',
  '1': 'L',
  '0': 'O',
  '0': 'Q',
  'C': 'K',
  'G': 'J',
  'E': ' ',
  'Y': ' ',
  'S': ' '
}
*/
jaro_winkler.lcadjustments = {};
//Object.keys(jaro_winkler.adjustments).forEach(function(skey : string) {
//    jaro_winkler.lcasjustments[skey.toLowerCase()] = jaro_winkler.adjustments[skey].toLowerCase();
//});
//console.log(JSON.stringify(Object.keysjaro_winkler.adjustments))
/**
 * Talisman metrics/distance/jaro
 * ===============================
 *
 * Function computing the Jaro score.
 *
 * [Reference]:
 * https://en.wikipedia.org/wiki/Jaro%E2%80%93Winkler_distance
 *
 * [Articles]:
 * Jaro, M. A. (1989). "Advances in record linkage methodology as applied to
 * the 1985 census of Tampa Florida".
 * Journal of the American Statistical Association 84 (406): 414–20
 *
 * Jaro, M. A. (1995). "Probabilistic linkage of large public health data file".
 * Statistics in Medicine 14 (5–7): 491–8.
 *
 * [Tags]: semimetric, string metric.
 */
/**
 * Function creating a vector of n dimensions and filling it with a single
 * value if required.
 *
 * @param  {number} n    - Dimensions of the vector to create.
 * @param  {mixed}  fill - Value to be used to fill the vector.
 * @return {array}       - The resulting vector.
 */
function vec(n, fill) {
    var vector = new Array(n);
    if (arguments.length > 1) {
        for (var i = 0; i < n; i++)
            vector[i] = fill;
    }
    return vector;
}
exports.vec = vec;
/**
 * Function returning the Jaro score between two sequences.
 *
 * @param  {mixed}  a     - The first sequence.
 * @param  {mixed}  b     - The second sequence.
 * @return {number}       - The Jaro score between a & b.
 */
function talisman_jaro(a, b) {
    // Fast break
    if (a === b)
        return 1;
    var max, min;
    if (a.length > b.length) {
        max = a;
        min = b;
    }
    else {
        max = b;
        min = a;
    }
    // Finding matches
    var range = Math.max(((max.length / 2) | 0) - 1, 0), indexes = vec(min.length, -1), flags = vec(max.length, false);
    var matches = 0;
    for (var i = 0, l = min.length; i < l; i++) {
        var character = min[i], xi = Math.max(i - range, 0), xn = Math.min(i + range + 1, max.length);
        for (var j = xi, m_1 = xn; j < m_1; j++) {
            if (!flags[j] && character === max[j]) {
                indexes[i] = j;
                flags[j] = true;
                matches++;
                break;
            }
        }
    }
    var ms1 = new Array(matches), ms2 = new Array(matches);
    var si;
    si = 0;
    for (var i = 0, l = min.length; i < l; i++) {
        if (indexes[i] !== -1) {
            ms1[si] = min[i];
            si++;
        }
    }
    si = 0;
    for (var i = 0, l = max.length; i < l; i++) {
        if (flags[i]) {
            ms2[si] = max[i];
            si++;
        }
    }
    var transpositions = 0;
    for (var i = 0, l = ms1.length; i < l; i++) {
        if (ms1[i] !== ms2[i])
            transpositions++;
    }
    // Computing the distance
    if (!matches)
        return 0;
    var t = (transpositions / 2) | 0, m = matches;
    return ((m / a.length) + (m / b.length) + ((m - t) / m)) / 3;
}
exports.talisman_jaro = talisman_jaro;
/**
 * Jaro distance is 1 - the Jaro score.
 */
//const distance = (a, b) => 1 - jaro(a, b);
/*
-The MIT License (MIT)
-
-Copyright (c) 2015 Thorarinn Sigurdsson
-
-Permission is hereby granted, free of charge, to any person obtaining a copy
-of this software and associated documentation files (the "Software"), to deal
-in the Software without restriction, including without limitation the rights
-to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
-copies of the Software, and to permit persons to whom the Software is
-furnished to do so, subject to the following conditions:
-
-The above copyright notice and this permission notice shall be included in all
-copies or substantial portions of the Software.
-
-THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
-IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
-FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
-AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
-LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
-OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
-SOFTWARE.
*/
/**
 * Talisman metrics/distance/jaro-winkler
 * =======================================
 *
 * Function computing the Jaro-Winkler score.
 *
 * [Reference]:
 * https://en.wikipedia.org/wiki/Jaro%E2%80%93Winkler_distance
 *
 * [Article]:
 * Winkler, W. E. (1990). "String Comparator Metrics and Enhanced Decision Rules
 * in the Fellegi-Sunter Model of Record Linkage".
 * Proceedings of the Section on Survey Research Methods
 * (American Statistical Association): 354–359.
 *
 * [Tags]: semimetric, string metric.
 */
var jaro = talisman_jaro; //import jaro from './jaro';
/**
 * Function returning the Jaro-Winkler score between two sequences.
 *
 * @param  {object} options - Custom options.
 * @param  {mixed}  a       - The first sequence.
 * @param  {mixed}  b       - The second sequence.
 * @return {number}         - The Jaro-Winkler score between a & b.
 */
function customJaroWinkler(options, a, b) {
    options = options || {};
    var _a = options.boostThreshold, boostThreshold = _a === void 0 ? 0.7 : _a, _b = options.scalingFactor, scalingFactor = _b === void 0 ? 0.1 : _b;
    if (scalingFactor > 0.25)
        throw Error('talisman/metrics/distance/jaro-winkler: the scaling factor should not exceed 0.25.');
    if (boostThreshold < 0 || boostThreshold > 1)
        throw Error('talisman/metrics/distance/jaro-winkler: the boost threshold should be comprised between 0 and 1.');
    // Fast break
    if (a === b)
        return 1;
    var maxLength = Math.max(a.length, b.length), minLength = Math.min(a.length, b.length);
    // Computing prefix
    var prefix = 0;
    for (var i = 0, l = minLength; i < l; i++) {
        if (a[i] === b[i])
            prefix++;
        else
            break;
    }
    // Computing Jaro-Winkler score
    var j = jaro(a, b);
    if (j < boostThreshold)
        return j;
    return j + Math.min(scalingFactor, maxLength) * prefix * (1 - j);
}
/**
 * Jaro-Winkler standard function.
 */
exports.jaroWinkler = customJaroWinkler.bind(null, null);
/**
 * Jaro-Winkler distance is 1 - the Jaro-Winkler score.
 */
var distance = function (a, b) { return 1 - exports.jaroWinkler(a, b); };
/**
 * Exporting.
 */
/*
Copyright (c) 2012, Adam Phillabaum, Chris Umbel
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.
Unless otherwise stated by a specific section of code
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
// Computes the Jaro distance between two string -- intrepreted from:
// http://en.wikipedia.org/wiki/Jaro%E2%80%93Winkler_distance
// s1 is the first string to compare
// s2 is the second string to compare
function jaroDistance(s1, s2) {
    if (typeof (s1) != "string" || typeof (s2) != "string")
        return 0;
    if (s1.length == 0 || s2.length == 0)
        return 0;
    //s1 = s1.toLowerCase(), s2 = s2.toLowerCase();
    var matchWindow = (Math.floor(Math.max(s1.length, s2.length) / 2.0)) - 1;
    var matches1 = new Array(s1.length);
    var matches2 = new Array(s2.length);
    var m = 0; // number of matches
    var t = 0; // number of transpositions
    //debug helpers
    //console.log("s1: " + s1 + "; s2: " + s2);
    //console.log(" - matchWindow: " + matchWindow);
    // find matches
    for (var i = 0; i < s1.length; i++) {
        var matched = false;
        // check for an exact match
        if (s1[i] == s2[i]) {
            matches1[i] = matches2[i] = matched = true;
            m++;
        }
        else {
            // this for loop is a little brutal
            for (k = (i <= matchWindow) ? 0 : i - matchWindow; (k <= i + matchWindow) && k < s2.length && !matched; k++) {
                if (s1[i] == s2[k]) {
                    if (!matches1[i] && !matches2[k]) {
                        m++;
                    }
                    matches1[i] = matches2[k] = matched = true;
                }
            }
        }
    }
    if (m == 0)
        return 0.0;
    // count transpositions
    var k = 0;
    for (var i = 0; i < s1.length; i++) {
        if (matches1[k]) {
            while (!matches2[k] && k < matches2.length)
                k++;
            if (s1[i] != s2[k] && k < matches2.length) {
                t++;
            }
            k++;
        }
    }
    //debug helpers:
    //console.log(" - matches: " + m);
    //console.log(" - transpositions: " + t);
    t = t / 2.0;
    return (m / s1.length + m / s2.length + (m - t) / m) / 3;
}
exports.jaroDistance = jaroDistance;
// Computes the Winkler distance between two string -- intrepreted from:
// http://en.wikipedia.org/wiki/Jaro%E2%80%93Winkler_distance
// s1 is the first string to compare
// s2 is the second string to compare
// dj is the Jaro Distance (if you've already computed it), leave blank and the method handles it
function jaroWinklerDistance(s1, s2) {
    if (s1 == s2) {
        return 1;
    }
    else {
        var jaro = talisman_jaro(s1, s2);
        var p = 0.1; //
        var l = 0; // length of the matching prefix
        while (s1[l] == s2[l] && l < 4)
            l++;
        return jaro + l * p * (1 - jaro);
    }
}
exports.jaroWinklerDistance = jaroWinklerDistance;

//# sourceMappingURL=damerauLevenshtein.js.map
