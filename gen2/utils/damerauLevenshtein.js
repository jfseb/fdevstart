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
            } else {
                cost = 1;
            }
            d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
            if (i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) {
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
        } else {
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
    while (c + offset1 < s1.length && c + offset2 < s2.length) {
        if (s1.charAt(c + offset1) == s2.charAt(c + offset2)) {
            lcs++;
        } else {
            offset1 = 0;
            offset2 = 0;
            for (var i = 0; i < maxOffset; i++) {
                if (c + i < s1.length && s1.charAt(c + i) == s2.charAt(c)) {
                    offset1 = i;
                    break;
                }
                if (c + i < s2.length && s1.charAt(c) == s2.charAt(c + i)) {
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
        var lowlim = i >= search_range ? i - search_range : 0;
        var hilim = i + search_range <= yl1 ? i + search_range : yl1;
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
    var Num_sim = N_simi / 10.0 + Num_com;
    // Main weight computation
    var weight = Num_sim / a_len + Num_sim / b_len + (Num_com - N_trans) / Num_com;
    weight = weight / 3;
    // Continue to boost the weight if the strings are similar
    if (weight > 0.7) {
        // Adjust for having up to the first 4 characters in common
        var j = minv >= 4 ? 4 : minv;
        var i = 0;
        for (i = 0; i < j && a[i] === b[i]; i++) {}
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
        for (var i = 0; i < n; i++) {
            vector[i] = fill;
        }
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
    if (a === b) return 1;
    var max, min;
    if (a.length > b.length) {
        max = a;
        min = b;
    } else {
        max = b;
        min = a;
    }
    // Finding matches
    var range = Math.max((max.length / 2 | 0) - 1, 0),
        indexes = vec(min.length, -1),
        flags = vec(max.length, false);
    var matches = 0;
    for (var i = 0, l = min.length; i < l; i++) {
        var character = min[i],
            xi = Math.max(i - range, 0),
            xn = Math.min(i + range + 1, max.length);
        for (var j = xi, m_1 = xn; j < m_1; j++) {
            if (!flags[j] && character === max[j]) {
                indexes[i] = j;
                flags[j] = true;
                matches++;
                break;
            }
        }
    }
    var ms1 = new Array(matches),
        ms2 = new Array(matches);
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
        if (ms1[i] !== ms2[i]) transpositions++;
    }
    // Computing the distance
    if (!matches) return 0;
    var t = transpositions / 2 | 0,
        m = matches;
    return (m / a.length + m / b.length + (m - t) / m) / 3;
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
    var _a = options.boostThreshold,
        boostThreshold = _a === void 0 ? 0.7 : _a,
        _b = options.scalingFactor,
        scalingFactor = _b === void 0 ? 0.1 : _b;
    if (scalingFactor > 0.25) throw Error('talisman/metrics/distance/jaro-winkler: the scaling factor should not exceed 0.25.');
    if (boostThreshold < 0 || boostThreshold > 1) throw Error('talisman/metrics/distance/jaro-winkler: the boost threshold should be comprised between 0 and 1.');
    // Fast break
    if (a === b) return 1;
    var maxLength = Math.max(a.length, b.length),
        minLength = Math.min(a.length, b.length);
    // Computing prefix
    var prefix = 0;
    for (var i = 0, l = minLength; i < l; i++) {
        if (a[i] === b[i]) prefix++;else break;
    }
    // Computing Jaro-Winkler score
    var j = jaro(a, b);
    if (j < boostThreshold) return j;
    return j + Math.min(scalingFactor, maxLength) * prefix * (1 - j);
}
/**
 * Jaro-Winkler standard function.
 */
exports.jaroWinkler = customJaroWinkler.bind(null, null);
/**
 * Jaro-Winkler distance is 1 - the Jaro-Winkler score.
 */
var distance = function distance(a, b) {
    return 1 - exports.jaroWinkler(a, b);
};
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
    if (typeof s1 != "string" || typeof s2 != "string") return 0;
    if (s1.length == 0 || s2.length == 0) return 0;
    //s1 = s1.toLowerCase(), s2 = s2.toLowerCase();
    var matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2.0) - 1;
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
        } else {
            // this for loop is a little brutal
            for (k = i <= matchWindow ? 0 : i - matchWindow; k <= i + matchWindow && k < s2.length && !matched; k++) {
                if (s1[i] == s2[k]) {
                    if (!matches1[i] && !matches2[k]) {
                        m++;
                    }
                    matches1[i] = matches2[k] = matched = true;
                }
            }
        }
    }
    if (m == 0) return 0.0;
    // count transpositions
    var k = 0;
    for (var i = 0; i < s1.length; i++) {
        if (matches1[k]) {
            while (!matches2[k] && k < matches2.length) {
                k++;
            }if (s1[i] != s2[k] && k < matches2.length) {
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
    } else {
        var jaro = talisman_jaro(s1, s2);
        var p = 0.1; //
        var l = 0; // length of the matching prefix
        while (s1[l] == s2[l] && l < 4) {
            l++;
        }return jaro + l * p * (1 - jaro);
    }
}
exports.jaroWinklerDistance = jaroWinklerDistance;
function cntChars(str, len) {
    var cnt = 0;
    for (var i = 0; i < len; ++i) {
        cnt += str.charAt(i) === 'X' ? 1 : 0;
    }
    return cnt;
}
/**
 * @param sText {string} the text to match to NavTargetResolution
 * @param sText2 {string} the query text, e.g. NavTarget
 *
 * @return the distance, note that is is *not* symmetric!
 */
function calcDistance(sText1, sText2) {
    // console.log("length2" + sText1 + " - " + sText2)
    var s1len = sText1.length;
    var s2len = sText2.length;
    var min = Math.min(s1len, s2len);
    if (Math.abs(s1len - s2len) > Math.min(s1len, s2len)) {
        return 0.3;
    }
    var dist = jaroWinklerDistance(sText1, sText2);
    var cnt1 = cntChars(sText1, s1len);
    var cnt2 = cntChars(sText2, s2len);
    if (cnt1 !== cnt2) {
        dist = dist * 0.7;
    }
    return dist;
    /*
    var a0 = distance.levenshtein(sText1.substring(0, sText2.length), sText2)
    if(debuglogV.enabled) {
      debuglogV("distance" + a0 + "stripped>" + sText1.substring(0,sText2.length) + "<>" + sText2+ "<");
    }
    if(a0 * 50 > 15 * sText2.length) {
        return 40000;
    }
    var a = distance.levenshtein(sText1, sText2)
    return a0 * 500 / sText2.length + a
    */
}
exports.calcDistance = calcDistance;
/*
var facAdjustDistance = [];
var u = "a";
for(var i = 2; i < 15; ++i) {
  var un = u + String.fromCharCode('A'.charCodeAt(0) + i + 1 );
  console.log(un);
  facAdjustDistance[u.length] = (1-0.9801000)/ (1.0 - calcDistance(u,un));
  u = un;
}

export function calcDistanceAdjusted2(a: string, b:string) : number {
  var dist = calcDistance(a,b);
  var ml = Math.min(a.length, b.length);
  if(dist < 1.0 && (ml < 15) &&  (ml > 2)) {
      return 1.0  -  (1.0- dist) * facAdjustDistance[ml];
  }
  return dist;
}
*/
/**
 * The adjustment is chosen in the following way,
 * a single "added" character at the end of the string fits
 * is "lifted at length 5" to 0.98
 *   1.665 =  ( 1 - calcDistance('abcde','abcde_')) / 0.98
 *
 * The function is smoothly to merge at length 20;
 *   fac =((20-len)/(15))*0.665 +1
 *   res = 1- (1-d)/fac;
 */
function calcDistanceAdjusted(a, b) {
    var dist = calcDistance(a, b);
    var ml = Math.min(a.length, b.length);
    if (dist < 1.0 && ml < 20) {
        var fac = 1 + 0.665 / 15.0 * (20 - ml);
        return 1.0 - (1.0 - dist) / fac;
    }
    return dist;
}
exports.calcDistanceAdjusted = calcDistanceAdjusted;
/*

function getCharAt(str, n) {
  if(str.length > n) {
    return str.charAt(n);
  }
  return '';
}

function getHead(str,u) {
  u = Math.min(str.length, u);
  u = Math.max(0,u);
  return str.substring(0,u);
}

function getTail(str,p) {
  return str.substring(p);
}

var strs = ["A"];
var u = "A";
for(var i = 1; i < 25; ++i) {
  var un = u + String.fromCharCode('A'.charCodeAt(0) + i );
  strs[un.length-1] = un;
  console.log(un);
  facAdjustDistance[u.length] = (1-0.9801000)/ (1.0 - calcDistance(u,un));
  u = un;
}

var res = [];

var res2 = [];
for(var i = 1; i < strs.length; ++i) {
  var str = strs[i];
  var nc = String.fromCharCode('a'.charCodeAt(0) + 2*i + 2 );
  var nc = '_';
  var addTail = str  + nc;
  var addFront = nc + str;
  var nc2 = '/'; //String.fromCharCode('a'.charCodeAt(0) + 2*i + 3 );

  var diffMid = getHead(str,Math.floor(str.length/2))  + nc  + getTail(str, Math.floor(str.length/2)+1);
  var diffMid2 = strs[i].substring(0, Math.floor(str.length/2)-1) + nc + nc2 + getTail(str,Math.floor(str.length/2)+1);
  var diffEnd = strs[i].substring(0, strs[i].length - 1) + nc;
  var diffStart = nc + strs[i].substring(1);
  var swapFront = str.substring(0,2) + getCharAt(str,3) + getCharAt(str,2) + str.substring(4);
  var swapMid = getHead(str, Math.floor(str.length/2)-1)  + getCharAt(str,Math.floor(str.length/2)) + getCharAt(str,Math.floor(str.length/2)-1)  + getTail(str,Math.floor(str.length/2)+1);
  var swapEnd = getHead(str, str.length - 2) + getCharAt(str,str.length-1) + getCharAt(str,str.length-2);

  var r = [diffStart, diffMid, diffEnd, addFront, addTail, diffMid2, swapFront, swapMid, swapEnd ];
  console.log('****\n' + str +'\n' + r.join("\n"));
  if( i === 1) {
    res.push(`i\tdiffStart\tdiffMid\tdiffEnd\taddFront\taddTail\tdiffMid2\tswapFront\tswapMid\tswapEnd\n`);
    res2.push(`i\tdiffStart\tdiffMid\tdiffEnd\taddFront\taddTail\tdiffMid2\tswapFront\tswapMid\tswapEnd\n`);
  }
  res.push(`${str.length}\t` + r.map(s => calcDistance(str,s).toFixed(4)).join("\t") + '\n');
  res2.push(`${str.length}\t` + r.map(s => calcDistanceAdjusted(str,s).toFixed(4)).join("\t") + '\n');
}


console.log(res.join(''));

console.log('---');
console.log(res2.join(''));

var fs = require('fs');
fs.writeFileSync('leven.txt', res.join('') + '\n' + res2.join(''));

*/
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4udHMiXSwibmFtZXMiOlsibGV2ZW5zaHRlaW5EYW1lcmF1IiwiYSIsImIiLCJpIiwiaiIsImNvc3QiLCJkIiwibGVuZ3RoIiwiY2hhckF0IiwiTWF0aCIsIm1pbiIsImV4cG9ydHMiLCJsZXZlbnNodGVpbiIsInNpZnQzRGlzdGFuY2UiLCJzMSIsInMyIiwiYWJzIiwibWF4IiwiYyIsIm9mZnNldDEiLCJvZmZzZXQyIiwibGNzIiwibWF4T2Zmc2V0IiwiamFyb193aW5rbGVyIiwibGNhZGp1c3RtZW50cyIsImphcm9fd2lua2xlcl9hZGoiLCJhX2xlbiIsImJfbGVuIiwiYV9mbGFnIiwiYl9mbGFnIiwic2VhcmNoX3JhbmdlIiwiZmxvb3IiLCJtaW52IiwiTnVtX2NvbSIsInlsMSIsImxvd2xpbSIsImhpbGltIiwiayIsIk5fdHJhbnMiLCJOX3NpbWkiLCJhZGp3dCIsIk51bV9zaW0iLCJ3ZWlnaHQiLCJ2ZWMiLCJuIiwiZmlsbCIsInZlY3RvciIsIkFycmF5IiwiYXJndW1lbnRzIiwidGFsaXNtYW5famFybyIsInJhbmdlIiwiaW5kZXhlcyIsImZsYWdzIiwibWF0Y2hlcyIsImwiLCJjaGFyYWN0ZXIiLCJ4aSIsInhuIiwibV8xIiwibXMxIiwibXMyIiwic2kiLCJ0cmFuc3Bvc2l0aW9ucyIsInQiLCJtIiwiamFybyIsImN1c3RvbUphcm9XaW5rbGVyIiwib3B0aW9ucyIsIl9hIiwiYm9vc3RUaHJlc2hvbGQiLCJfYiIsInNjYWxpbmdGYWN0b3IiLCJFcnJvciIsIm1heExlbmd0aCIsIm1pbkxlbmd0aCIsInByZWZpeCIsImphcm9XaW5rbGVyIiwiYmluZCIsImRpc3RhbmNlIiwiamFyb0Rpc3RhbmNlIiwibWF0Y2hXaW5kb3ciLCJtYXRjaGVzMSIsIm1hdGNoZXMyIiwibWF0Y2hlZCIsImphcm9XaW5rbGVyRGlzdGFuY2UiLCJwIiwiY250Q2hhcnMiLCJzdHIiLCJsZW4iLCJjbnQiLCJjYWxjRGlzdGFuY2UiLCJzVGV4dDEiLCJzVGV4dDIiLCJzMWxlbiIsInMybGVuIiwiZGlzdCIsImNudDEiLCJjbnQyIiwiY2FsY0Rpc3RhbmNlQWRqdXN0ZWQiLCJtbCIsImZhYyJdLCJtYXBwaW5ncyI6IkFBQUE7QUFFQTtBQUNBO0FBR0E7Ozs7QUFLQTs7Ozs7Ozs7OztBQVNBLFNBQUFBLGtCQUFBLENBQW9DQyxDQUFwQyxFQUFnREMsQ0FBaEQsRUFBMEQ7QUFDeEQsUUFBSUMsQ0FBSjtBQUNBLFFBQUlDLENBQUo7QUFDQSxRQUFJQyxJQUFKO0FBQ0EsUUFBSUMsSUFBSSxFQUFSO0FBQ0EsUUFBSUwsRUFBRU0sTUFBRixLQUFhLENBQWpCLEVBQW9CO0FBQ2xCLGVBQU9MLEVBQUVLLE1BQVQ7QUFDRDtBQUNELFFBQUlMLEVBQUVLLE1BQUYsS0FBYSxDQUFqQixFQUFvQjtBQUNsQixlQUFPTixFQUFFTSxNQUFUO0FBQ0Q7QUFDRCxTQUFLSixJQUFJLENBQVQsRUFBWUEsS0FBS0YsRUFBRU0sTUFBbkIsRUFBMkJKLEdBQTNCLEVBQWdDO0FBQzlCRyxVQUFHSCxDQUFILElBQVMsRUFBVDtBQUNBRyxVQUFHSCxDQUFILEVBQVEsQ0FBUixJQUFjQSxDQUFkO0FBQ0Q7QUFDRCxTQUFLQyxJQUFJLENBQVQsRUFBWUEsS0FBS0YsRUFBRUssTUFBbkIsRUFBMkJILEdBQTNCLEVBQWdDO0FBQzlCRSxVQUFHLENBQUgsRUFBUUYsQ0FBUixJQUFjQSxDQUFkO0FBQ0Q7QUFDRCxTQUFLRCxJQUFJLENBQVQsRUFBWUEsS0FBS0YsRUFBRU0sTUFBbkIsRUFBMkJKLEdBQTNCLEVBQWdDO0FBQzlCLGFBQUtDLElBQUksQ0FBVCxFQUFZQSxLQUFLRixFQUFFSyxNQUFuQixFQUEyQkgsR0FBM0IsRUFBZ0M7QUFDOUIsZ0JBQUlILEVBQUVPLE1BQUYsQ0FBU0wsSUFBSSxDQUFiLE1BQW9CRCxFQUFFTSxNQUFGLENBQVNKLElBQUksQ0FBYixDQUF4QixFQUF5QztBQUN2Q0MsdUJBQU8sQ0FBUDtBQUNELGFBRkQsTUFFTztBQUNMQSx1QkFB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QyxNQUFPLElBQUssUUFBTSxJQUFQLElBQWMsS0FBR0QsRUFBakIsQ0FBZjtBQUNBLGVBQU8sTUFBUSxDQUFDLE1BQU1KLElBQVAsSUFBY0ssR0FBN0I7QUFDSDtBQUNELFdBQU9MLElBQVA7QUFDRDtBQVJEcEYsUUFBQXVGLG9CQUFBLEdBQUFBLG9CQUFBO0FBVUEiLCJmaWxlIjoidXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnXG5cbi8vIGJhc2VkIG9uOiBodHRwOi8vZW4ud2lraWJvb2tzLm9yZy93aWtpL0FsZ29yaXRobV9pbXBsZW1lbnRhdGlvbi9TdHJpbmdzL0xldmVuc2h0ZWluX2Rpc3RhbmNlXG4vLyBhbmQ6ICBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0RhbWVyYXUlRTIlODAlOTNMZXZlbnNodGVpbl9kaXN0YW5jZVxuXG5cbi8qKlxuICogRGlzdGFuY2Ugb2Ygc3RyaW5ncyBhbGdvcml0aG1cbiAqIEBtb2R1bGUgZnNkZXZzdGFydC51dGlscy5kYW1lcmF1TGV2ZW5zaHRlaW5cbiAqL1xuXG4vKipcbiAqIGEgZnVuY3Rpb24gY2FsY3VsYXRpbmcgZGlzdGFuY2UgYmV0d2VlbiB0d28gc3RyaW5nc1xuICogYWNjb3JkaW5nIHRvIHRoZSBkYW1lcmF1IExldmVuc2h0ZWluIGFsZ29yaXRobVxuICogKHRoaXMgYWxnb3JpdGhtLCBpbiBjb250cmFzdCB0byBwbGFpbiBsZXZlbnNodGVpbiB0cmVhdHNcbiAqIHN3YXBwaW5nIG9mIGNoYXJhY3RlcnMgYSBkaXN0YW5jZSAxICBcIndvcmRcIiAgPC0+IFwid3JvZCApXG4gKiBAcGFyYW0ge3N0cmluZ30gYVxuICogQHBhcmFtIHtzdHJpbmd9IGJcbiAqIEBwdWJsaWNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxldmVuc2h0ZWluRGFtZXJhdSAoYSA6IHN0cmluZywgYiA6IHN0cmluZykge1xuICB2YXIgaSA6IG51bWJlclxuICB2YXIgaiA6IG51bWJlclxuICB2YXIgY29zdCA6IG51bWJlclxuICB2YXIgZCA9IFtdXG4gIGlmIChhLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBiLmxlbmd0aFxuICB9XG4gIGlmIChiLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBhLmxlbmd0aFxuICB9XG4gIGZvciAoaSA9IDA7IGkgPD0gYS5sZW5ndGg7IGkrKykge1xuICAgIGRbIGkgXSA9IFtdXG4gICAgZFsgaSBdWyAwIF0gPSBpXG4gIH1cbiAgZm9yIChqID0gMDsgaiA8PSBiLmxlbmd0aDsgaisrKSB7XG4gICAgZFsgMCBdWyBqIF0gPSBqXG4gIH1cbiAgZm9yIChpID0gMTsgaSA8PSBhLmxlbmd0aDsgaSsrKSB7XG4gICAgZm9yIChqID0gMTsgaiA8PSBiLmxlbmd0aDsgaisrKSB7XG4gICAgICBpZiAoYS5jaGFyQXQoaSAtIDEpID09PSBiLmNoYXJBdChqIC0gMSkpIHtcbiAgICAgICAgY29zdCA9IDBcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvc3QgPSAxXG4gICAgICB9XG5cbiAgICAgIGRbIGkgXVsgaiBdID0gTWF0aC5taW4oZFsgaSAtIDEgXVsgaiBdICsgMSwgZFsgaSBdWyBqIC0gMSBdICsgMSwgZFsgaSAtIDEgXVsgaiAtIDEgXSArIGNvc3QpXG5cbiAgICAgIGlmIChcblxuICAgICAgICBpID4gMSAmJlxuXG4gICAgICAgIGogPiAxICYmXG5cbiAgICAgICAgYS5jaGFyQXQoaSAtIDEpID09PSBiLmNoYXJBdChqIC0gMikgJiZcblxuICAgICAgICBhLmNoYXJBdChpIC0gMikgPT09IGIuY2hhckF0KGogLSAxKVxuXG4gICAgICApIHtcbiAgICAgICAgZFtpXVtqXSA9IE1hdGgubWluKFxuXG4gICAgICAgICAgZFtpXVtqXSxcblxuICAgICAgICAgIGRbaSAtIDJdW2ogLSAyXSArIGNvc3RcblxuICAgICAgICApXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGRbIGEubGVuZ3RoIF1bIGIubGVuZ3RoIF1cbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gbGV2ZW5zaHRlaW4gKGEgOiBzdHJpbmcsIGIgOiBzdHJpbmcpIHtcbiAgLy9yZXR1cm4gMi4wICogc2lmdDNEaXN0YW5jZShhLGIpOyAvLyw2LDcpOyAvLyArIGIubGVuZ3RoIC8gMik7XG4gIHJldHVybiBsZXZlbnNodGVpbkRhbWVyYXUoYSxiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNpZnQzRGlzdGFuY2UoczEsIHMyKSB7XG4gICAgaWYgKHMxID09IG51bGwgfHwgczEubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGlmIChzMiA9PSBudWxsIHx8IHMyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gczIubGVuZ3RoO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHMyID09IG51bGwgfHwgczIubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBzMS5sZW5ndGg7XG4gICAgfVxuICAgIGlmIChNYXRoLmFicyhzMS5sZW5ndGggIC0gczIubGVuZ3RoKSA+IDIwKSB7XG4gICAgICByZXR1cm4gIE1hdGgubWF4KHMxLmxlbmd0aCwgczIubGVuZ3RoKS8yO1xuICAgIH1cblxuICAgIHZhciBjID0gMDtcbiAgICB2YXIgb2Zmc2V0MSA9IDA7XG4gICAgdmFyIG9mZnNldDIgPSAwO1xuICAgIHZhciBsY3MgPSAwO1xuICAgIHZhciBtYXhPZmZzZXQgPSAzO1xuXG4gICAgd2hpbGUgKChjICsgb2Zmc2V0MSA8IHMxLmxlbmd0aCkgJiYgKGMgKyBvZmZzZXQyIDwgczIubGVuZ3RoKSkge1xuICAgICAgICBpZiAoczEuY2hhckF0KGMgKyBvZmZzZXQxKSA9PSBzMi5jaGFyQXQoYyArIG9mZnNldDIpKSB7XG4gICAgICAgICAgICBsY3MrKztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9mZnNldDEgPSAwO1xuICAgICAgICAgICAgb2Zmc2V0MiA9IDA7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1heE9mZnNldDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKChjICsgaSA8IHMxLmxlbmd0aCkgJiYgKHMxLmNoYXJBdChjICsgaSkgPT0gczIuY2hhckF0KGMpKSkge1xuICAgICAgICAgICAgICAgICAgICBvZmZzZXQxID0gaTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICgoYyArIGkgPCBzMi5sZW5ndGgpICYmIChzMS5jaGFyQXQoYykgPT0gczIuY2hhckF0KGMgKyBpKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgb2Zmc2V0MiA9IGk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjKys7XG4gICAgfVxuICAgIHJldHVybiAoczEubGVuZ3RoICsgczIubGVuZ3RoKSAvIDIgLSBsY3M7XG59XG5cbi8qXG4vLyAgU2lmdDQgLSBjb21tb24gdmVyc2lvblxuLy8gaHR0cHM6Ly9zaWRlcml0ZS5ibG9nc3BvdC5jb20vMjAxNC8xMS9zdXBlci1mYXN0LWFuZC1hY2N1cmF0ZS1zdHJpbmctZGlzdGFuY2UuaHRtbFxuLy8gb25saW5lIGFsZ29yaXRobSB0byBjb21wdXRlIHRoZSBkaXN0YW5jZSBiZXR3ZWVuIHR3byBzdHJpbmdzIGluIE8obilcbi8vIG1heE9mZnNldCBpcyB0aGUgbnVtYmVyIG9mIGNoYXJhY3RlcnMgdG8gc2VhcmNoIGZvciBtYXRjaGluZyBsZXR0ZXJzXG4vLyBtYXhEaXN0YW5jZSBpcyB0aGUgZGlzdGFuY2UgYXQgd2hpY2ggdGhlIGFsZ29yaXRobSBzaG91bGQgc3RvcCBjb21wdXRpbmcgdGhlIHZhbHVlIGFuZCBqdXN0IGV4aXQgKHRoZSBzdHJpbmdzIGFyZSB0b28gZGlmZmVyZW50IGFueXdheSlcbmV4cG9ydCBmdW5jdGlvbiBzaWZ0NChzMSwgczIsIG1heE9mZnNldCwgbWF4RGlzdGFuY2UpIHtcbiAgICBpZiAoIXMxfHwhczEubGVuZ3RoKSB7XG4gICAgICAgIGlmICghczIpIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzMi5sZW5ndGg7XG4gICAgfVxuXG4gICAgaWYgKCFzMnx8IXMyLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gczEubGVuZ3RoO1xuICAgIH1cblxuICAgIHZhciBsMT1zMS5sZW5ndGg7XG4gICAgdmFyIGwyPXMyLmxlbmd0aDtcbiAgICBpZihNYXRoLmFicyhsMSAtIGwyKSA+IG1heERpc3RhbmNlKSB7XG4gICAgICByZXR1cm4gNTAwMDA7XG4gICAgfVxuXG4gICAgdmFyIGMxID0gMDsgIC8vY3Vyc29yIGZvciBzdHJpbmcgMVxuICAgIHZhciBjMiA9IDA7ICAvL2N1cnNvciBmb3Igc3RyaW5nIDJcbiAgICB2YXIgbGNzcyA9IDA7ICAvL2xhcmdlc3QgY29tbW9uIHN1YnNlcXVlbmNlXG4gICAgdmFyIGxvY2FsX2NzID0gMDsgLy9sb2NhbCBjb21tb24gc3Vic3RyaW5nXG4gICAgdmFyIHRyYW5zID0gMDsgIC8vbnVtYmVyIG9mIHRyYW5zcG9zaXRpb25zICgnYWInIHZzICdiYScpXG4gICAgdmFyIG9mZnNldF9hcnI9W107ICAvL29mZnNldCBwYWlyIGFycmF5LCBmb3IgY29tcHV0aW5nIHRoZSB0cmFuc3Bvc2l0aW9uc1xuXG4gICAgd2hpbGUgKChjMSA8IGwxKSAmJiAoYzIgPCBsMikpIHtcbiAgICAgICAgaWYgKHMxLmNoYXJBdChjMSkgPT0gczIuY2hhckF0KGMyKSkge1xuICAgICAgICAgICAgbG9jYWxfY3MrKztcbiAgICAgICAgICAgIHZhciBpc1RyYW5zPWZhbHNlO1xuICAgICAgICAgICAgLy9zZWUgaWYgY3VycmVudCBtYXRjaCBpcyBhIHRyYW5zcG9zaXRpb25cbiAgICAgICAgICAgIHZhciBpPTA7XG4gICAgICAgICAgICB3aGlsZSAoaTxvZmZzZXRfYXJyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHZhciBvZnM9b2Zmc2V0X2FycltpXTtcbiAgICAgICAgICAgICAgICBpZiAoYzE8PW9mcy5jMSB8fCBjMiA8PSBvZnMuYzIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gd2hlbiB0d28gbWF0Y2hlcyBjcm9zcywgdGhlIG9uZSBjb25zaWRlcmVkIGEgdHJhbnNwb3NpdGlvbiBpcyB0aGUgb25lIHdpdGggdGhlIGxhcmdlc3QgZGlmZmVyZW5jZSBpbiBvZmZzZXRzXG4gICAgICAgICAgICAgICAgICAgIGlzVHJhbnM9TWF0aC5hYnMoYzItYzEpPj1NYXRoLmFicyhvZnMuYzItb2ZzLmMxKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzVHJhbnMpXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zKys7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW9mcy50cmFucykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mcy50cmFucz10cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zKys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGMxPm9mcy5jMiAmJiBjMj5vZnMuYzEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldF9hcnIuc3BsaWNlKGksMSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvZmZzZXRfYXJyLnB1c2goe1xuICAgICAgICAgICAgICAgIGMxOmMxLFxuICAgICAgICAgICAgICAgIGMyOmMyLFxuICAgICAgICAgICAgICAgIHRyYW5zOmlzVHJhbnNcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGNzcys9bG9jYWxfY3M7XG4gICAgICAgICAgICBsb2NhbF9jcz0wO1xuICAgICAgICAgICAgaWYgKGMxIT1jMikge1xuICAgICAgICAgICAgICAgIGMxPWMyPU1hdGgubWluKGMxLGMyKTsgIC8vdXNpbmcgbWluIGFsbG93cyB0aGUgY29tcHV0YXRpb24gb2YgdHJhbnNwb3NpdGlvbnNcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vaWYgbWF0Y2hpbmcgY2hhcmFjdGVycyBhcmUgZm91bmQsIHJlbW92ZSAxIGZyb20gYm90aCBjdXJzb3JzICh0aGV5IGdldCBpbmNyZW1lbnRlZCBhdCB0aGUgZW5kIG9mIHRoZSBsb29wKVxuICAgICAgICAgICAgLy9zbyB0aGF0IHdlIGNhbiBoYXZlIG9ubHkgb25lIGNvZGUgYmxvY2sgaGFuZGxpbmcgbWF0Y2hlc1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtYXhPZmZzZXQgJiYgKGMxK2k8bDEgfHwgYzIraTxsMik7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmICgoYzEgKyBpIDwgbDEpICYmIChzMS5jaGFyQXQoYzEgKyBpKSA9PSBzMi5jaGFyQXQoYzIpKSkge1xuICAgICAgICAgICAgICAgICAgICBjMSs9IGktMTtcbiAgICAgICAgICAgICAgICAgICAgYzItLTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICgoYzIgKyBpIDwgbDIpICYmIChzMS5jaGFyQXQoYzEpID09IHMyLmNoYXJBdChjMiArIGkpKSkge1xuICAgICAgICAgICAgICAgICAgICBjMS0tO1xuICAgICAgICAgICAgICAgICAgICBjMis9IGktMTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGMxKys7XG4gICAgICAgIGMyKys7XG4gICAgICAgIGlmIChtYXhEaXN0YW5jZSlcbiAgICAgICAge1xuICAgICAgICAgICAgdmFyIHRlbXBvcmFyeURpc3RhbmNlPU1hdGgubWF4KGMxLGMyKS1sY3NzK3RyYW5zO1xuICAgICAgICAgICAgaWYgKHRlbXBvcmFyeURpc3RhbmNlPj1tYXhEaXN0YW5jZSkgcmV0dXJuIDUwMDAwOyAvLyBNYXRoLnJvdW5kKHRlbXBvcmFyeURpc3RhbmNlKTtcbiAgICAgICAgfVxuICAgICAgICAvLyB0aGlzIGNvdmVycyB0aGUgY2FzZSB3aGVyZSB0aGUgbGFzdCBtYXRjaCBpcyBvbiB0aGUgbGFzdCB0b2tlbiBpbiBsaXN0LCBzbyB0aGF0IGl0IGNhbiBjb21wdXRlIHRyYW5zcG9zaXRpb25zIGNvcnJlY3RseVxuICAgICAgICBpZiAoKGMxID49IGwxKSB8fCAoYzIgPj0gbDIpKSB7XG4gICAgICAgICAgICBsY3NzKz1sb2NhbF9jcztcbiAgICAgICAgICAgIGxvY2FsX2NzPTA7XG4gICAgICAgICAgICBjMT1jMj1NYXRoLm1pbihjMSxjMik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgbGNzcys9bG9jYWxfY3M7XG4gICAgcmV0dXJuIE1hdGgucm91bmQoTWF0aC5tYXgobDEsbDIpLSBsY3NzICt0cmFucyk7IC8vYWRkIHRoZSBjb3N0IG9mIHRyYW5zcG9zaXRpb25zIHRvIHRoZSBmaW5hbCByZXN1bHRcbn1cblxuKi9cblxuLypcbmphcm9fd2lua2xlciBtb2RpZmllZFxub3JpZ2luIGZyb20gOlxuaHR0cHM6Ly9naXRodWIuY29tL3Roc2lnL2phcm8td2lua2xlci1KUy9ibG9iL21hc3Rlci9qYXJvX3dpbmtsZXIuanNcblxuVGhlIE1JVCBMaWNlbnNlIChNSVQpXG5cbkNvcHlyaWdodCAoYykgMjAxNSBUaG9yYXJpbm4gU2lndXJkc3NvblxuXG5QZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG5vZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG5pbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG50byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG5jb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbmZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5cblRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluIGFsbFxuY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cblxuVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG5GSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbkFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbkxJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG5PVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRVxuU09GVFdBUkUuXG5cblxuKi9cblxudmFyIGphcm9fd2lua2xlciA9IHsgbGNhZGp1c3RtZW50czoge319O1xuXG4vKiBKUyBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgc3RyY21wOTUgQyBmdW5jdGlvbiB3cml0dGVuIGJ5XG5CaWxsIFdpbmtsZXIsIEdlb3JnZSBNY0xhdWdobGluLCBNYXR0IEphcm8gYW5kIE1hdXJlZW4gTHluY2gsXG5yZWxlYXNlZCBpbiAxOTk0IChodHRwOi8vd2ViLmFyY2hpdmUub3JnL3dlYi8yMDEwMDIyNzAyMDAxOS9odHRwOi8vd3d3LmNlbnN1cy5nb3YvZ2VvL21zYi9zdGFuZC9zdHJjbXAuYykuXG5hIGFuZCBiIHNob3VsZCBiZSBzdHJpbmdzLiBBbHdheXMgcGVyZm9ybXMgY2FzZS1pbnNlbnNpdGl2ZSBjb21wYXJpc29uc1xuYW5kIGFsd2F5cyBhZGp1c3RzIGZvciBsb25nIHN0cmluZ3MuICovXG5leHBvcnQgZnVuY3Rpb24gamFyb193aW5rbGVyX2FkaihhLCBiKSB7XG5cbiAgaWYgKCFhIHx8ICFiKSB7IHJldHVybiAwLjA7IH1cblxuICAvLyB3ZSBoYXZlIHRyaW1tZWRcbiAgLy9hID0gYS50cmltKCkudG9VcHBlckNhc2UoKTtcbiAgLy9iID0gYi50cmltKCkudG9VcHBlckNhc2UoKTtcbiAgdmFyIGFfbGVuID0gYS5sZW5ndGg7XG4gIHZhciBiX2xlbiA9IGIubGVuZ3RoO1xuICB2YXIgYV9mbGFnID0gW107IHZhciBiX2ZsYWcgPSBbXTtcbiAgdmFyIHNlYXJjaF9yYW5nZSA9IE1hdGguZmxvb3IoTWF0aC5tYXgoYV9sZW4sIGJfbGVuKSAvIDIpIC0gMTtcbiAgdmFyIG1pbnYgPSBNYXRoLm1pbihhX2xlbiwgYl9sZW4pO1xuXG4gIC8vIExvb2tpbmcgb25seSB3aXRoaW4gdGhlIHNlYXJjaCByYW5nZSwgY291bnQgYW5kIGZsYWcgdGhlIG1hdGNoZWQgcGFpcnMuXG4gIHZhciBOdW1fY29tID0gMDtcbiAgdmFyIHlsMSA9IGJfbGVuIC0gMTtcbiAgdmFyIGogPSAwIGFzIG51bWJlcjtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhX2xlbjsgaSsrKSB7XG4gICAgdmFyIGxvd2xpbSA9IChpID49IHNlYXJjaF9yYW5nZSkgPyBpIC0gc2VhcmNoX3JhbmdlIDogMCBhcyBudW1iZXI7XG4gICAgdmFyIGhpbGltICA9ICgoaSArIHNlYXJjaF9yYW5nZSkgPD0geWwxKSA/IChpICsgc2VhcmNoX3JhbmdlKSA6IHlsMTtcbiAgICBmb3IgKHZhciBqID0gbG93bGltOyBqIDw9IGhpbGltOyBqKyspIHtcbiAgICAgIGlmIChiX2ZsYWdbal0gIT09IDEgJiYgYVtqXSA9PT0gYltpXSkge1xuICAgICAgICBhX2ZsYWdbal0gPSAxO1xuICAgICAgICBiX2ZsYWdbaV0gPSAxO1xuICAgICAgICBOdW1fY29tKys7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFJldHVybiBpZiBubyBjaGFyYWN0ZXJzIGluIGNvbW1vblxuICBpZiAoTnVtX2NvbSA9PT0gMCkgeyByZXR1cm4gMC4wOyB9XG5cbiAgLy8gQ291bnQgdGhlIG51bWJlciBvZiB0cmFuc3Bvc2l0aW9uc1xuICB2YXIgayA9IDA7IHZhciBOX3RyYW5zID0gMDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhX2xlbjsgaSsrKSB7XG4gICAgaWYgKGFfZmxhZ1tpXSA9PT0gMSkge1xuICAgICAgdmFyIGogPSAwIGFzIG51bWJlcjtcbiAgICAgIGZvciAoaiA9IGs7IGogPCBiX2xlbjsgaisrKSB7XG4gICAgICAgIGlmIChiX2ZsYWdbal0gPT09IDEpIHtcbiAgICAgICAgICBrID0gaiArIDE7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChhW2ldICE9PSBiW2pdKSB7IE5fdHJhbnMrKzsgfVxuICAgIH1cbiAgfVxuICBOX3RyYW5zID0gTWF0aC5mbG9vcihOX3RyYW5zIC8gMik7XG5cbiAgLy8gQWRqdXN0IGZvciBzaW1pbGFyaXRpZXMgaW4gbm9ubWF0Y2hlZCBjaGFyYWN0ZXJzXG4gIHZhciBOX3NpbWkgPSAwOyB2YXIgYWRqd3QgPSB7fTsgLy8gamFyb193aW5rbGVyLmxjYWRqdXN0bWVudHM7XG4gIGlmIChtaW52ID4gTnVtX2NvbSkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYV9sZW47IGkrKykge1xuICAgICAgaWYgKCFhX2ZsYWdbaV0pIHtcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBiX2xlbjsgaisrKSB7XG4gICAgICAgICAgaWYgKCFiX2ZsYWdbal0pIHtcbiAgICAgICAgICAgIGlmIChhZGp3dFthW2ldXSA9PT0gYltqXSkge1xuICAgICAgICAgICAgICBOX3NpbWkgKz0gMztcbiAgICAgICAgICAgICAgYl9mbGFnW2pdID0gMjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgdmFyIE51bV9zaW0gPSAoTl9zaW1pIC8gMTAuMCkgKyBOdW1fY29tO1xuXG4gIC8vIE1haW4gd2VpZ2h0IGNvbXB1dGF0aW9uXG4gIHZhciB3ZWlnaHQgPSBOdW1fc2ltIC8gYV9sZW4gKyBOdW1fc2ltIC8gYl9sZW4gKyAoTnVtX2NvbSAtIE5fdHJhbnMpIC8gTnVtX2NvbTtcbiAgd2VpZ2h0ID0gd2VpZ2h0IC8gMztcblxuICAvLyBDb250aW51ZSB0byBib29zdCB0aGUgd2VpZ2h0IGlmIHRoZSBzdHJpbmdzIGFyZSBzaW1pbGFyXG4gIGlmICh3ZWlnaHQgPiAwLjcpIHtcbiAgICAvLyBBZGp1c3QgZm9yIGhhdmluZyB1cCB0byB0aGUgZmlyc3QgNCBjaGFyYWN0ZXJzIGluIGNvbW1vblxuICAgIHZhciBqID0gKG1pbnYgPj0gNCkgPyA0IDogbWludiBhcyBudW1iZXI7XG4gICAgdmFyIGkgPSAwIGFzIG51bWJlcjtcbiAgICBmb3IgKGkgPSAwOyAoaSA8IGopICYmIGFbaV0gPT09IGJbaV07IGkrKykgeyB9XG4gICAgaWYgKGkpIHsgd2VpZ2h0ICs9IGkgKiAwLjEgKiAoMS4wIC0gd2VpZ2h0KSB9O1xuXG4gICAgLy8gQWRqdXN0IGZvciBsb25nIHN0cmluZ3MuXG4gICAgLy8gQWZ0ZXIgYWdyZWVpbmcgYmVnaW5uaW5nIGNoYXJzLCBhdCBsZWFzdCB0d28gbW9yZSBtdXN0IGFncmVlXG4gICAgLy8gYW5kIHRoZSBhZ3JlZWluZyBjaGFyYWN0ZXJzIG11c3QgYmUgbW9yZSB0aGFuIGhhbGYgb2YgdGhlXG4gICAgLy8gcmVtYWluaW5nIGNoYXJhY3RlcnMuXG4gICAgaWYgKG1pbnYgPiA0ICYmIE51bV9jb20gPiBpICsgMSAmJiAyICogTnVtX2NvbSA+PSBtaW52ICsgaSkge1xuICAgICAgd2VpZ2h0ICs9ICgxIC0gd2VpZ2h0KSAqICgoTnVtX2NvbSAtIGkgLSAxKSAvIChhX2xlbiAqIGJfbGVuIC0gaSoyICsgMikpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB3ZWlnaHRcblxufTtcblxuXG4vLyBUaGUgY2hhciBhZGp1c3RtZW50IHRhYmxlIHVzZWQgYWJvdmVcbi8qXG5qYXJvX3dpbmtsZXIuYWRqdXN0bWVudHMgPSB7XG4gICAnQSc6ICdFJyxcbiAgICdBJzogJ0knLFxuICAgJ0EnOiAnTycsXG4gICdBJzogJ1UnLFxuICAnQic6ICdWJyxcbiAgJ0UnOiAnSScsXG4gICdFJzogJ08nLFxuICAnRSc6ICdVJyxcbiAgJ0knOiAnTycsXG4gICdJJzogJ1UnLFxuICAnTyc6ICdVJyxcbiAgJ0knOiAnWScsXG4gICdFJzogJ1knLFxuICAnQyc6ICdHJyxcbiAgJ0UnOiAnRicsXG4gICdXJzogJ1UnLFxuICAnVyc6ICdWJyxcbiAgJ1gnOiAnSycsXG4gICdTJzogJ1onLFxuICAnWCc6ICdTJyxcbiAgJ1EnOiAnQycsXG4gICdVJzogJ1YnLFxuICAnTSc6ICdOJyxcbiAgJ0wnOiAnSScsXG4gICdRJzogJ08nLFxuICAnUCc6ICdSJyxcbiAgJ0knOiAnSicsXG4gICcyJzogJ1onLFxuICAnNSc6ICdTJyxcbiAgJzgnOiAnQicsXG4gICcxJzogJ0knLFxuICAnMSc6ICdMJyxcbiAgJzAnOiAnTycsXG4gICcwJzogJ1EnLFxuICAnQyc6ICdLJyxcbiAgJ0cnOiAnSicsXG4gICdFJzogJyAnLFxuICAnWSc6ICcgJyxcbiAgJ1MnOiAnICdcbn1cbiovXG5qYXJvX3dpbmtsZXIubGNhZGp1c3RtZW50cyA9IHt9O1xuXG4vL09iamVjdC5rZXlzKGphcm9fd2lua2xlci5hZGp1c3RtZW50cykuZm9yRWFjaChmdW5jdGlvbihza2V5IDogc3RyaW5nKSB7XG4vLyAgICBqYXJvX3dpbmtsZXIubGNhc2p1c3RtZW50c1tza2V5LnRvTG93ZXJDYXNlKCldID0gamFyb193aW5rbGVyLmFkanVzdG1lbnRzW3NrZXldLnRvTG93ZXJDYXNlKCk7XG4vL30pO1xuLy9jb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShPYmplY3Qua2V5c2phcm9fd2lua2xlci5hZGp1c3RtZW50cykpXG5cblxuXG4vKipcbiAqIFRhbGlzbWFuIG1ldHJpY3MvZGlzdGFuY2UvamFyb1xuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICpcbiAqIEZ1bmN0aW9uIGNvbXB1dGluZyB0aGUgSmFybyBzY29yZS5cbiAqXG4gKiBbUmVmZXJlbmNlXTpcbiAqIGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0phcm8lRTIlODAlOTNXaW5rbGVyX2Rpc3RhbmNlXG4gKlxuICogW0FydGljbGVzXTpcbiAqIEphcm8sIE0uIEEuICgxOTg5KS4gXCJBZHZhbmNlcyBpbiByZWNvcmQgbGlua2FnZSBtZXRob2RvbG9neSBhcyBhcHBsaWVkIHRvXG4gKiB0aGUgMTk4NSBjZW5zdXMgb2YgVGFtcGEgRmxvcmlkYVwiLlxuICogSm91cm5hbCBvZiB0aGUgQW1lcmljYW4gU3RhdGlzdGljYWwgQXNzb2NpYXRpb24gODQgKDQwNik6IDQxNOKAkzIwXG4gKlxuICogSmFybywgTS4gQS4gKDE5OTUpLiBcIlByb2JhYmlsaXN0aWMgbGlua2FnZSBvZiBsYXJnZSBwdWJsaWMgaGVhbHRoIGRhdGEgZmlsZVwiLlxuICogU3RhdGlzdGljcyBpbiBNZWRpY2luZSAxNCAoNeKAkzcpOiA0OTHigJM4LlxuICpcbiAqIFtUYWdzXTogc2VtaW1ldHJpYywgc3RyaW5nIG1ldHJpYy5cbiAqL1xuXG5cbi8qKlxuICogRnVuY3Rpb24gY3JlYXRpbmcgYSB2ZWN0b3Igb2YgbiBkaW1lbnNpb25zIGFuZCBmaWxsaW5nIGl0IHdpdGggYSBzaW5nbGVcbiAqIHZhbHVlIGlmIHJlcXVpcmVkLlxuICpcbiAqIEBwYXJhbSAge251bWJlcn0gbiAgICAtIERpbWVuc2lvbnMgb2YgdGhlIHZlY3RvciB0byBjcmVhdGUuXG4gKiBAcGFyYW0gIHttaXhlZH0gIGZpbGwgLSBWYWx1ZSB0byBiZSB1c2VkIHRvIGZpbGwgdGhlIHZlY3Rvci5cbiAqIEByZXR1cm4ge2FycmF5fSAgICAgICAtIFRoZSByZXN1bHRpbmcgdmVjdG9yLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdmVjKG4sIGZpbGwpIHtcbiAgY29uc3QgdmVjdG9yID0gbmV3IEFycmF5KG4pO1xuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKVxuICAgICAgdmVjdG9yW2ldID0gZmlsbDtcbiAgfVxuICByZXR1cm4gdmVjdG9yO1xufVxuXG5cbi8qKlxuICogRnVuY3Rpb24gcmV0dXJuaW5nIHRoZSBKYXJvIHNjb3JlIGJldHdlZW4gdHdvIHNlcXVlbmNlcy5cbiAqXG4gKiBAcGFyYW0gIHttaXhlZH0gIGEgICAgIC0gVGhlIGZpcnN0IHNlcXVlbmNlLlxuICogQHBhcmFtICB7bWl4ZWR9ICBiICAgICAtIFRoZSBzZWNvbmQgc2VxdWVuY2UuXG4gKiBAcmV0dXJuIHtudW1iZXJ9ICAgICAgIC0gVGhlIEphcm8gc2NvcmUgYmV0d2VlbiBhICYgYi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRhbGlzbWFuX2phcm8oYSwgYikge1xuICAvLyBGYXN0IGJyZWFrXG4gIGlmIChhID09PSBiKVxuICAgIHJldHVybiAxO1xuXG4gIGxldCBtYXgsIG1pbjtcblxuICBpZiAoYS5sZW5ndGggPiBiLmxlbmd0aCkge1xuICAgIG1heCA9IGE7XG4gICAgbWluID0gYjtcbiAgfVxuICBlbHNlIHtcbiAgICBtYXggPSBiO1xuICAgIG1pbiA9IGE7XG4gIH1cblxuICAvLyBGaW5kaW5nIG1hdGNoZXNcbiAgY29uc3QgcmFuZ2UgPSBNYXRoLm1heCgoKG1heC5sZW5ndGggLyAyKSB8IDApIC0gMSwgMCksXG4gICAgICAgIGluZGV4ZXMgPSB2ZWMobWluLmxlbmd0aCwgLTEpLFxuICAgICAgICBmbGFncyA9IHZlYyhtYXgubGVuZ3RoLCBmYWxzZSk7XG5cbiAgbGV0IG1hdGNoZXMgPSAwO1xuXG4gIGZvciAobGV0IGkgPSAwLCBsID0gbWluLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGNvbnN0IGNoYXJhY3RlciA9IG1pbltpXSxcbiAgICAgICAgICB4aSA9IE1hdGgubWF4KGkgLSByYW5nZSwgMCksXG4gICAgICAgICAgeG4gPSBNYXRoLm1pbihpICsgcmFuZ2UgKyAxLCBtYXgubGVuZ3RoKTtcblxuICAgIGZvciAobGV0IGogPSB4aSwgbSA9IHhuOyBqIDwgbTsgaisrKSB7XG4gICAgICBpZiAoIWZsYWdzW2pdICYmIGNoYXJhY3RlciA9PT0gbWF4W2pdKSB7XG4gICAgICAgIGluZGV4ZXNbaV0gPSBqO1xuICAgICAgICBmbGFnc1tqXSA9IHRydWU7XG4gICAgICAgIG1hdGNoZXMrKztcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY29uc3QgbXMxID0gbmV3IEFycmF5KG1hdGNoZXMpLFxuICAgICAgICBtczIgPSBuZXcgQXJyYXkobWF0Y2hlcyk7XG5cbiAgbGV0IHNpO1xuXG4gIHNpID0gMDtcbiAgZm9yIChsZXQgaSA9IDAsIGwgPSBtaW4ubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKGluZGV4ZXNbaV0gIT09IC0xKSB7XG4gICAgICBtczFbc2ldID0gbWluW2ldO1xuICAgICAgc2krKztcbiAgICB9XG4gIH1cblxuICBzaSA9IDA7XG4gIGZvciAobGV0IGkgPSAwLCBsID0gbWF4Lmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlmIChmbGFnc1tpXSkge1xuICAgICAgbXMyW3NpXSA9IG1heFtpXTtcbiAgICAgIHNpKys7XG4gICAgfVxuICB9XG5cbiAgbGV0IHRyYW5zcG9zaXRpb25zID0gMDtcbiAgZm9yIChsZXQgaSA9IDAsIGwgPSBtczEubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKG1zMVtpXSAhPT0gbXMyW2ldKVxuICAgICAgdHJhbnNwb3NpdGlvbnMrKztcbiAgfVxuXG4gIC8vIENvbXB1dGluZyB0aGUgZGlzdGFuY2VcbiAgaWYgKCFtYXRjaGVzKVxuICAgIHJldHVybiAwO1xuXG4gIGNvbnN0IHQgPSAodHJhbnNwb3NpdGlvbnMgLyAyKSB8IDAsXG4gICAgICAgIG0gPSBtYXRjaGVzO1xuXG4gIHJldHVybiAoKG0gLyBhLmxlbmd0aCkgKyAobSAvIGIubGVuZ3RoKSArICgobSAtIHQpIC8gbSkpIC8gMztcbn1cblxuLyoqXG4gKiBKYXJvIGRpc3RhbmNlIGlzIDEgLSB0aGUgSmFybyBzY29yZS5cbiAqL1xuLy9jb25zdCBkaXN0YW5jZSA9IChhLCBiKSA9PiAxIC0gamFybyhhLCBiKTtcblxuXG4vKlxuLVRoZSBNSVQgTGljZW5zZSAoTUlUKVxuLVxuLUNvcHlyaWdodCAoYykgMjAxNSBUaG9yYXJpbm4gU2lndXJkc3NvblxuLVxuLVBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbi1vZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4taW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuLXRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbi1jb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbi1mdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLVxuLVRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluIGFsbFxuLWNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4tXG4tVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuLUlNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuLUZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuLUFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbi1MSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuLU9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFXG4tU09GVFdBUkUuXG4qL1xuXG5cbi8qKlxuICogVGFsaXNtYW4gbWV0cmljcy9kaXN0YW5jZS9qYXJvLXdpbmtsZXJcbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICpcbiAqIEZ1bmN0aW9uIGNvbXB1dGluZyB0aGUgSmFyby1XaW5rbGVyIHNjb3JlLlxuICpcbiAqIFtSZWZlcmVuY2VdOlxuICogaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvSmFybyVFMiU4MCU5M1dpbmtsZXJfZGlzdGFuY2VcbiAqXG4gKiBbQXJ0aWNsZV06XG4gKiBXaW5rbGVyLCBXLiBFLiAoMTk5MCkuIFwiU3RyaW5nIENvbXBhcmF0b3IgTWV0cmljcyBhbmQgRW5oYW5jZWQgRGVjaXNpb24gUnVsZXNcbiAqIGluIHRoZSBGZWxsZWdpLVN1bnRlciBNb2RlbCBvZiBSZWNvcmQgTGlua2FnZVwiLlxuICogUHJvY2VlZGluZ3Mgb2YgdGhlIFNlY3Rpb24gb24gU3VydmV5IFJlc2VhcmNoIE1ldGhvZHNcbiAqIChBbWVyaWNhbiBTdGF0aXN0aWNhbCBBc3NvY2lhdGlvbik6IDM1NOKAkzM1OS5cbiAqXG4gKiBbVGFnc106IHNlbWltZXRyaWMsIHN0cmluZyBtZXRyaWMuXG4gKi9cbnZhciBqYXJvID0gdGFsaXNtYW5famFybzsgLy9pbXBvcnQgamFybyBmcm9tICcuL2phcm8nO1xuXG4vKipcbiAqIEZ1bmN0aW9uIHJldHVybmluZyB0aGUgSmFyby1XaW5rbGVyIHNjb3JlIGJldHdlZW4gdHdvIHNlcXVlbmNlcy5cbiAqXG4gKiBAcGFyYW0gIHtvYmplY3R9IG9wdGlvbnMgLSBDdXN0b20gb3B0aW9ucy5cbiAqIEBwYXJhbSAge21peGVkfSAgYSAgICAgICAtIFRoZSBmaXJzdCBzZXF1ZW5jZS5cbiAqIEBwYXJhbSAge21peGVkfSAgYiAgICAgICAtIFRoZSBzZWNvbmQgc2VxdWVuY2UuXG4gKiBAcmV0dXJuIHtudW1iZXJ9ICAgICAgICAgLSBUaGUgSmFyby1XaW5rbGVyIHNjb3JlIGJldHdlZW4gYSAmIGIuXG4gKi9cbmZ1bmN0aW9uIGN1c3RvbUphcm9XaW5rbGVyKG9wdGlvbnMsIGEsIGIpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgY29uc3Qge1xuICAgIGJvb3N0VGhyZXNob2xkID0gMC43LFxuICAgIHNjYWxpbmdGYWN0b3IgPSAwLjFcbiAgfSA9IG9wdGlvbnM7XG5cbiAgaWYgKHNjYWxpbmdGYWN0b3IgPiAwLjI1KVxuICAgIHRocm93IEVycm9yKCd0YWxpc21hbi9tZXRyaWNzL2Rpc3RhbmNlL2phcm8td2lua2xlcjogdGhlIHNjYWxpbmcgZmFjdG9yIHNob3VsZCBub3QgZXhjZWVkIDAuMjUuJyk7XG5cbiAgaWYgKGJvb3N0VGhyZXNob2xkIDwgMCB8fCBib29zdFRocmVzaG9sZCA+IDEpXG4gICAgdGhyb3cgRXJyb3IoJ3RhbGlzbWFuL21ldHJpY3MvZGlzdGFuY2UvamFyby13aW5rbGVyOiB0aGUgYm9vc3QgdGhyZXNob2xkIHNob3VsZCBiZSBjb21wcmlzZWQgYmV0d2VlbiAwIGFuZCAxLicpO1xuXG4gIC8vIEZhc3QgYnJlYWtcbiAgaWYgKGEgPT09IGIpXG4gICAgcmV0dXJuIDE7XG5cbiAgY29uc3QgbWF4TGVuZ3RoID0gTWF0aC5tYXgoYS5sZW5ndGgsIGIubGVuZ3RoKSxcbiAgICAgICAgbWluTGVuZ3RoID0gTWF0aC5taW4oYS5sZW5ndGgsIGIubGVuZ3RoKTtcblxuICAvLyBDb21wdXRpbmcgcHJlZml4XG4gIGxldCBwcmVmaXggPSAwO1xuICBmb3IgKGxldCBpID0gMCwgbCA9IG1pbkxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlmIChhW2ldID09PSBiW2ldKVxuICAgICAgcHJlZml4Kys7XG4gICAgZWxzZVxuICAgICAgYnJlYWs7XG4gIH1cblxuICAvLyBDb21wdXRpbmcgSmFyby1XaW5rbGVyIHNjb3JlXG4gIGNvbnN0IGogPSBqYXJvKGEsIGIpO1xuXG4gIGlmIChqIDwgYm9vc3RUaHJlc2hvbGQpXG4gICAgcmV0dXJuIGo7XG5cbiAgcmV0dXJuIGogKyBNYXRoLm1pbihzY2FsaW5nRmFjdG9yLCBtYXhMZW5ndGgpICogcHJlZml4ICogKDEgLSBqKTtcbn1cblxuLyoqXG4gKiBKYXJvLVdpbmtsZXIgc3RhbmRhcmQgZnVuY3Rpb24uXG4gKi9cbmV4cG9ydCBjb25zdCBqYXJvV2lua2xlciA9IGN1c3RvbUphcm9XaW5rbGVyLmJpbmQobnVsbCwgbnVsbCk7XG5cbi8qKlxuICogSmFyby1XaW5rbGVyIGRpc3RhbmNlIGlzIDEgLSB0aGUgSmFyby1XaW5rbGVyIHNjb3JlLlxuICovXG5jb25zdCBkaXN0YW5jZSA9IChhLCBiKSA9PiAxIC0gamFyb1dpbmtsZXIoYSwgYik7XG5cbi8qKlxuICogRXhwb3J0aW5nLlxuICovXG5cblxuXG4vKlxuQ29weXJpZ2h0IChjKSAyMDEyLCBBZGFtIFBoaWxsYWJhdW0sIENocmlzIFVtYmVsXG5QZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG5vZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG5pbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG50byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG5jb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbmZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5UaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5Vbmxlc3Mgb3RoZXJ3aXNlIHN0YXRlZCBieSBhIHNwZWNpZmljIHNlY3Rpb24gb2YgY29kZVxuVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG5GSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbkFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbkxJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG5PVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG5USEUgU09GVFdBUkUuXG4qL1xuXG4vLyBDb21wdXRlcyB0aGUgSmFybyBkaXN0YW5jZSBiZXR3ZWVuIHR3byBzdHJpbmcgLS0gaW50cmVwcmV0ZWQgZnJvbTpcbi8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvSmFybyVFMiU4MCU5M1dpbmtsZXJfZGlzdGFuY2Vcbi8vIHMxIGlzIHRoZSBmaXJzdCBzdHJpbmcgdG8gY29tcGFyZVxuLy8gczIgaXMgdGhlIHNlY29uZCBzdHJpbmcgdG8gY29tcGFyZVxuZXhwb3J0IGZ1bmN0aW9uIGphcm9EaXN0YW5jZShzMSwgczIpIHtcbiAgICBpZiAodHlwZW9mKHMxKSAhPSBcInN0cmluZ1wiIHx8IHR5cGVvZihzMikgIT0gXCJzdHJpbmdcIikgcmV0dXJuIDA7XG4gICAgaWYgKHMxLmxlbmd0aCA9PSAwIHx8IHMyLmxlbmd0aCA9PSAwKVxuICAgICAgICByZXR1cm4gMDtcbiAgICAvL3MxID0gczEudG9Mb3dlckNhc2UoKSwgczIgPSBzMi50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciBtYXRjaFdpbmRvdyA9IChNYXRoLmZsb29yKE1hdGgubWF4KHMxLmxlbmd0aCwgczIubGVuZ3RoKSAvIDIuMCkpIC0gMTtcbiAgICB2YXIgbWF0Y2hlczEgPSBuZXcgQXJyYXkoczEubGVuZ3RoKTtcbiAgICB2YXIgbWF0Y2hlczIgPSBuZXcgQXJyYXkoczIubGVuZ3RoKTtcbiAgICB2YXIgbSA9IDA7IC8vIG51bWJlciBvZiBtYXRjaGVzXG4gICAgdmFyIHQgPSAwOyAvLyBudW1iZXIgb2YgdHJhbnNwb3NpdGlvbnNcblxuICAgIC8vZGVidWcgaGVscGVyc1xuICAgIC8vY29uc29sZS5sb2coXCJzMTogXCIgKyBzMSArIFwiOyBzMjogXCIgKyBzMik7XG4gICAgLy9jb25zb2xlLmxvZyhcIiAtIG1hdGNoV2luZG93OiBcIiArIG1hdGNoV2luZG93KTtcblxuICAgIC8vIGZpbmQgbWF0Y2hlc1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgczEubGVuZ3RoOyBpKyspIHtcblx0dmFyIG1hdGNoZWQgPSBmYWxzZTtcblxuXHQvLyBjaGVjayBmb3IgYW4gZXhhY3QgbWF0Y2hcblx0aWYgKHMxW2ldID09ICBzMltpXSkge1xuXHRcdG1hdGNoZXMxW2ldID0gbWF0Y2hlczJbaV0gPSBtYXRjaGVkID0gdHJ1ZTtcblx0XHRtKytcblx0fVxuXG5cdC8vIGNoZWNrIHRoZSBcIm1hdGNoIHdpbmRvd1wiXG5cdGVsc2Uge1xuICAgICAgICBcdC8vIHRoaXMgZm9yIGxvb3AgaXMgYSBsaXR0bGUgYnJ1dGFsXG4gICAgICAgIFx0Zm9yIChrID0gKGkgPD0gbWF0Y2hXaW5kb3cpID8gMCA6IGkgLSBtYXRjaFdpbmRvdztcbiAgICAgICAgXHRcdChrIDw9IGkgKyBtYXRjaFdpbmRvdykgJiYgayA8IHMyLmxlbmd0aCAmJiAhbWF0Y2hlZDtcblx0XHRcdGsrKykge1xuICAgICAgICAgICAgXHRcdGlmIChzMVtpXSA9PSBzMltrXSkge1xuICAgICAgICAgICAgICAgIFx0XHRpZighbWF0Y2hlczFbaV0gJiYgIW1hdGNoZXMyW2tdKSB7XG4gICAgICAgICAgICAgICAgXHQgICAgXHRcdG0rKztcbiAgICAgICAgICAgICAgIFx0XHR9XG5cbiAgICAgICAgXHQgICAgICAgIG1hdGNoZXMxW2ldID0gbWF0Y2hlczJba10gPSBtYXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgXHQgICAgfVxuICAgICAgICBcdH1cblx0fVxuICAgIH1cblxuICAgIGlmKG0gPT0gMClcbiAgICAgICAgcmV0dXJuIDAuMDtcblxuICAgIC8vIGNvdW50IHRyYW5zcG9zaXRpb25zXG4gICAgdmFyIGsgPSAwO1xuXG4gICAgZm9yKHZhciBpID0gMDsgaSA8IHMxLmxlbmd0aDsgaSsrKSB7XG4gICAgXHRpZihtYXRjaGVzMVtrXSkge1xuICAgIFx0ICAgIHdoaWxlKCFtYXRjaGVzMltrXSAmJiBrIDwgbWF0Y2hlczIubGVuZ3RoKVxuICAgICAgICAgICAgICAgIGsrKztcblx0ICAgICAgICBpZihzMVtpXSAhPSBzMltrXSAmJiAgayA8IG1hdGNoZXMyLmxlbmd0aCkgIHtcbiAgICAgICAgICAgICAgICB0Kys7XG4gICAgICAgICAgICB9XG5cbiAgICBcdCAgICBrKys7XG4gICAgXHR9XG4gICAgfVxuXG4gICAgLy9kZWJ1ZyBoZWxwZXJzOlxuICAgIC8vY29uc29sZS5sb2coXCIgLSBtYXRjaGVzOiBcIiArIG0pO1xuICAgIC8vY29uc29sZS5sb2coXCIgLSB0cmFuc3Bvc2l0aW9uczogXCIgKyB0KTtcbiAgICB0ID0gdCAvIDIuMDtcbiAgICByZXR1cm4gKG0gLyBzMS5sZW5ndGggKyBtIC8gczIubGVuZ3RoICsgKG0gLSB0KSAvIG0pIC8gMztcbn1cblxuLy8gQ29tcHV0ZXMgdGhlIFdpbmtsZXIgZGlzdGFuY2UgYmV0d2VlbiB0d28gc3RyaW5nIC0tIGludHJlcHJldGVkIGZyb206XG4vLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0phcm8lRTIlODAlOTNXaW5rbGVyX2Rpc3RhbmNlXG4vLyBzMSBpcyB0aGUgZmlyc3Qgc3RyaW5nIHRvIGNvbXBhcmVcbi8vIHMyIGlzIHRoZSBzZWNvbmQgc3RyaW5nIHRvIGNvbXBhcmVcbi8vIGRqIGlzIHRoZSBKYXJvIERpc3RhbmNlIChpZiB5b3UndmUgYWxyZWFkeSBjb21wdXRlZCBpdCksIGxlYXZlIGJsYW5rIGFuZCB0aGUgbWV0aG9kIGhhbmRsZXMgaXRcbmV4cG9ydCBmdW5jdGlvbiBqYXJvV2lua2xlckRpc3RhbmNlKHMxIDogc3RyaW5nLCBzMjogc3RyaW5nKSB7XG5cdFx0aWYgKHMxID09IHMyKSB7XG5cdFx0XHRcdHJldHVybiAxXG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdCAgICB2YXIgamFybyA9IHRhbGlzbWFuX2phcm8oczEsczIpO1xuICAgICAgICB2YXIgcCA9IDAuMTsgLy9cblx0XHQgICAgdmFyIGwgPSAwIC8vIGxlbmd0aCBvZiB0aGUgbWF0Y2hpbmcgcHJlZml4XG5cdFx0ICAgIHdoaWxlKHMxW2xdID09IHMyW2xdICYmIGwgPCA0KVxuXHRcdCAgICAgICAgbCsrO1xuXG5cdFx0ICAgIHJldHVybiBqYXJvICsgbCAqIHAgKiAoMSAtIGphcm8pO1xuXHRcdH1cbn1cblxuXG5cbmZ1bmN0aW9uIGNudENoYXJzKHN0ciA6IHN0cmluZywgbGVuIDogbnVtYmVyKSB7XG4gIHZhciBjbnQgPSAwO1xuICBmb3IodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICBjbnQgKz0gKHN0ci5jaGFyQXQoaSkgPT09ICdYJyk/IDEgOiAwO1xuICB9XG4gIHJldHVybiBjbnQ7XG59XG5cbi8qKlxuICogQHBhcmFtIHNUZXh0IHtzdHJpbmd9IHRoZSB0ZXh0IHRvIG1hdGNoIHRvIE5hdlRhcmdldFJlc29sdXRpb25cbiAqIEBwYXJhbSBzVGV4dDIge3N0cmluZ30gdGhlIHF1ZXJ5IHRleHQsIGUuZy4gTmF2VGFyZ2V0XG4gKlxuICogQHJldHVybiB0aGUgZGlzdGFuY2UsIG5vdGUgdGhhdCBpcyBpcyAqbm90KiBzeW1tZXRyaWMhXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYWxjRGlzdGFuY2Uoc1RleHQxOiBzdHJpbmcsIHNUZXh0Mjogc3RyaW5nKTogbnVtYmVyIHtcbiAgLy8gY29uc29sZS5sb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxuICB2YXIgczFsZW4gPSBzVGV4dDEubGVuZ3RoO1xuICB2YXIgczJsZW4gPSBzVGV4dDIubGVuZ3RoO1xuICB2YXIgbWluID0gTWF0aC5taW4oczFsZW4sczJsZW4pO1xuICBpZihNYXRoLmFicyhzMWxlbiAtIHMybGVuKSA+IE1hdGgubWluKHMxbGVuLHMybGVuKSkge1xuICAgIHJldHVybiAwLjM7XG4gIH1cbiAgdmFyIGRpc3QgPSBqYXJvV2lua2xlckRpc3RhbmNlKHNUZXh0MSxzVGV4dDIpO1xuICB2YXIgY250MSA9IGNudENoYXJzKHNUZXh0MSwgczFsZW4pO1xuICB2YXIgY250MiA9IGNudENoYXJzKHNUZXh0MiwgczJsZW4pO1xuICBpZihjbnQxICE9PSBjbnQyKSB7XG4gICAgZGlzdCA9IGRpc3QgKiAwLjc7XG4gIH1cbiAgcmV0dXJuIGRpc3Q7XG4gIC8qXG4gIHZhciBhMCA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCksIHNUZXh0MilcbiAgaWYoZGVidWdsb2dWLmVuYWJsZWQpIHtcbiAgICBkZWJ1Z2xvZ1YoXCJkaXN0YW5jZVwiICsgYTAgKyBcInN0cmlwcGVkPlwiICsgc1RleHQxLnN1YnN0cmluZygwLHNUZXh0Mi5sZW5ndGgpICsgXCI8PlwiICsgc1RleHQyKyBcIjxcIik7XG4gIH1cbiAgaWYoYTAgKiA1MCA+IDE1ICogc1RleHQyLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIDQwMDAwO1xuICB9XG4gIHZhciBhID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLCBzVGV4dDIpXG4gIHJldHVybiBhMCAqIDUwMCAvIHNUZXh0Mi5sZW5ndGggKyBhXG4gICovXG59XG5cbi8qXG52YXIgZmFjQWRqdXN0RGlzdGFuY2UgPSBbXTtcbnZhciB1ID0gXCJhXCI7XG5mb3IodmFyIGkgPSAyOyBpIDwgMTU7ICsraSkge1xuICB2YXIgdW4gPSB1ICsgU3RyaW5nLmZyb21DaGFyQ29kZSgnQScuY2hhckNvZGVBdCgwKSArIGkgKyAxICk7XG4gIGNvbnNvbGUubG9nKHVuKTtcbiAgZmFjQWRqdXN0RGlzdGFuY2VbdS5sZW5ndGhdID0gKDEtMC45ODAxMDAwKS8gKDEuMCAtIGNhbGNEaXN0YW5jZSh1LHVuKSk7XG4gIHUgPSB1bjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNEaXN0YW5jZUFkanVzdGVkMihhOiBzdHJpbmcsIGI6c3RyaW5nKSA6IG51bWJlciB7XG4gIHZhciBkaXN0ID0gY2FsY0Rpc3RhbmNlKGEsYik7XG4gIHZhciBtbCA9IE1hdGgubWluKGEubGVuZ3RoLCBiLmxlbmd0aCk7XG4gIGlmKGRpc3QgPCAxLjAgJiYgKG1sIDwgMTUpICYmICAobWwgPiAyKSkge1xuICAgICAgcmV0dXJuIDEuMCAgLSAgKDEuMC0gZGlzdCkgKiBmYWNBZGp1c3REaXN0YW5jZVttbF07XG4gIH1cbiAgcmV0dXJuIGRpc3Q7XG59XG4qL1xuXG4vKipcbiAqIFRoZSBhZGp1c3RtZW50IGlzIGNob3NlbiBpbiB0aGUgZm9sbG93aW5nIHdheSxcbiAqIGEgc2luZ2xlIFwiYWRkZWRcIiBjaGFyYWN0ZXIgYXQgdGhlIGVuZCBvZiB0aGUgc3RyaW5nIGZpdHNcbiAqIGlzIFwibGlmdGVkIGF0IGxlbmd0aCA1XCIgdG8gMC45OFxuICogICAxLjY2NSA9ICAoIDEgLSBjYWxjRGlzdGFuY2UoJ2FiY2RlJywnYWJjZGVfJykpIC8gMC45OFxuICpcbiAqIFRoZSBmdW5jdGlvbiBpcyBzbW9vdGhseSB0byBtZXJnZSBhdCBsZW5ndGggMjA7XG4gKiAgIGZhYyA9KCgyMC1sZW4pLygxNSkpKjAuNjY1ICsxXG4gKiAgIHJlcyA9IDEtICgxLWQpL2ZhYztcbiAqL1xuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNEaXN0YW5jZUFkanVzdGVkKGE6IHN0cmluZywgYjpzdHJpbmcpIDogbnVtYmVyIHtcbiAgdmFyIGRpc3QgPSBjYWxjRGlzdGFuY2UoYSxiKTtcbiAgdmFyIG1sID0gTWF0aC5taW4oYS5sZW5ndGgsIGIubGVuZ3RoKTtcbiAgaWYoZGlzdCA8IDEuMCAmJiAobWwgPCAyMCkpIHtcbiAgICAgIHZhciBmYWMgPSAgMSArICgwLjY2NS8xNS4wKSooMjAtbWwpO1xuICAgICAgcmV0dXJuIDEuMCAgLSAgKDEuMCAtIGRpc3QpIC9mYWM7XG4gIH1cbiAgcmV0dXJuIGRpc3Q7XG59XG5cbi8qXG5cbmZ1bmN0aW9uIGdldENoYXJBdChzdHIsIG4pIHtcbiAgaWYoc3RyLmxlbmd0aCA+IG4pIHtcbiAgICByZXR1cm4gc3RyLmNoYXJBdChuKTtcbiAgfVxuICByZXR1cm4gJyc7XG59XG5cbmZ1bmN0aW9uIGdldEhlYWQoc3RyLHUpIHtcbiAgdSA9IE1hdGgubWluKHN0ci5sZW5ndGgsIHUpO1xuICB1ID0gTWF0aC5tYXgoMCx1KTtcbiAgcmV0dXJuIHN0ci5zdWJzdHJpbmcoMCx1KTtcbn1cblxuZnVuY3Rpb24gZ2V0VGFpbChzdHIscCkge1xuICByZXR1cm4gc3RyLnN1YnN0cmluZyhwKTtcbn1cblxudmFyIHN0cnMgPSBbXCJBXCJdO1xudmFyIHUgPSBcIkFcIjtcbmZvcih2YXIgaSA9IDE7IGkgPCAyNTsgKytpKSB7XG4gIHZhciB1biA9IHUgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKCdBJy5jaGFyQ29kZUF0KDApICsgaSApO1xuICBzdHJzW3VuLmxlbmd0aC0xXSA9IHVuO1xuICBjb25zb2xlLmxvZyh1bik7XG4gIGZhY0FkanVzdERpc3RhbmNlW3UubGVuZ3RoXSA9ICgxLTAuOTgwMTAwMCkvICgxLjAgLSBjYWxjRGlzdGFuY2UodSx1bikpO1xuICB1ID0gdW47XG59XG5cbnZhciByZXMgPSBbXTtcblxudmFyIHJlczIgPSBbXTtcbmZvcih2YXIgaSA9IDE7IGkgPCBzdHJzLmxlbmd0aDsgKytpKSB7XG4gIHZhciBzdHIgPSBzdHJzW2ldO1xuICB2YXIgbmMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKCdhJy5jaGFyQ29kZUF0KDApICsgMippICsgMiApO1xuICB2YXIgbmMgPSAnXyc7XG4gIHZhciBhZGRUYWlsID0gc3RyICArIG5jO1xuICB2YXIgYWRkRnJvbnQgPSBuYyArIHN0cjtcbiAgdmFyIG5jMiA9ICcvJzsgLy9TdHJpbmcuZnJvbUNoYXJDb2RlKCdhJy5jaGFyQ29kZUF0KDApICsgMippICsgMyApO1xuXG4gIHZhciBkaWZmTWlkID0gZ2V0SGVhZChzdHIsTWF0aC5mbG9vcihzdHIubGVuZ3RoLzIpKSAgKyBuYyAgKyBnZXRUYWlsKHN0ciwgTWF0aC5mbG9vcihzdHIubGVuZ3RoLzIpKzEpO1xuICB2YXIgZGlmZk1pZDIgPSBzdHJzW2ldLnN1YnN0cmluZygwLCBNYXRoLmZsb29yKHN0ci5sZW5ndGgvMiktMSkgKyBuYyArIG5jMiArIGdldFRhaWwoc3RyLE1hdGguZmxvb3Ioc3RyLmxlbmd0aC8yKSsxKTtcbiAgdmFyIGRpZmZFbmQgPSBzdHJzW2ldLnN1YnN0cmluZygwLCBzdHJzW2ldLmxlbmd0aCAtIDEpICsgbmM7XG4gIHZhciBkaWZmU3RhcnQgPSBuYyArIHN0cnNbaV0uc3Vic3RyaW5nKDEpO1xuICB2YXIgc3dhcEZyb250ID0gc3RyLnN1YnN0cmluZygwLDIpICsgZ2V0Q2hhckF0KHN0ciwzKSArIGdldENoYXJBdChzdHIsMikgKyBzdHIuc3Vic3RyaW5nKDQpO1xuICB2YXIgc3dhcE1pZCA9IGdldEhlYWQoc3RyLCBNYXRoLmZsb29yKHN0ci5sZW5ndGgvMiktMSkgICsgZ2V0Q2hhckF0KHN0cixNYXRoLmZsb29yKHN0ci5sZW5ndGgvMikpICsgZ2V0Q2hhckF0KHN0cixNYXRoLmZsb29yKHN0ci5sZW5ndGgvMiktMSkgICsgZ2V0VGFpbChzdHIsTWF0aC5mbG9vcihzdHIubGVuZ3RoLzIpKzEpO1xuICB2YXIgc3dhcEVuZCA9IGdldEhlYWQoc3RyLCBzdHIubGVuZ3RoIC0gMikgKyBnZXRDaGFyQXQoc3RyLHN0ci5sZW5ndGgtMSkgKyBnZXRDaGFyQXQoc3RyLHN0ci5sZW5ndGgtMik7XG5cbiAgdmFyIHIgPSBbZGlmZlN0YXJ0LCBkaWZmTWlkLCBkaWZmRW5kLCBhZGRGcm9udCwgYWRkVGFpbCwgZGlmZk1pZDIsIHN3YXBGcm9udCwgc3dhcE1pZCwgc3dhcEVuZCBdO1xuICBjb25zb2xlLmxvZygnKioqKlxcbicgKyBzdHIgKydcXG4nICsgci5qb2luKFwiXFxuXCIpKTtcbiAgaWYoIGkgPT09IDEpIHtcbiAgICByZXMucHVzaChgaVxcdGRpZmZTdGFydFxcdGRpZmZNaWRcXHRkaWZmRW5kXFx0YWRkRnJvbnRcXHRhZGRUYWlsXFx0ZGlmZk1pZDJcXHRzd2FwRnJvbnRcXHRzd2FwTWlkXFx0c3dhcEVuZFxcbmApO1xuICAgIHJlczIucHVzaChgaVxcdGRpZmZTdGFydFxcdGRpZmZNaWRcXHRkaWZmRW5kXFx0YWRkRnJvbnRcXHRhZGRUYWlsXFx0ZGlmZk1pZDJcXHRzd2FwRnJvbnRcXHRzd2FwTWlkXFx0c3dhcEVuZFxcbmApO1xuICB9XG4gIHJlcy5wdXNoKGAke3N0ci5sZW5ndGh9XFx0YCArIHIubWFwKHMgPT4gY2FsY0Rpc3RhbmNlKHN0cixzKS50b0ZpeGVkKDQpKS5qb2luKFwiXFx0XCIpICsgJ1xcbicpO1xuICByZXMyLnB1c2goYCR7c3RyLmxlbmd0aH1cXHRgICsgci5tYXAocyA9PiBjYWxjRGlzdGFuY2VBZGp1c3RlZChzdHIscykudG9GaXhlZCg0KSkuam9pbihcIlxcdFwiKSArICdcXG4nKTtcbn1cblxuXG5jb25zb2xlLmxvZyhyZXMuam9pbignJykpO1xuXG5jb25zb2xlLmxvZygnLS0tJyk7XG5jb25zb2xlLmxvZyhyZXMyLmpvaW4oJycpKTtcblxudmFyIGZzID0gcmVxdWlyZSgnZnMnKTtcbmZzLndyaXRlRmlsZVN5bmMoJ2xldmVuLnR4dCcsIHJlcy5qb2luKCcnKSArICdcXG4nICsgcmVzMi5qb2luKCcnKSk7XG5cbiovXG5cblxuXG5cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
