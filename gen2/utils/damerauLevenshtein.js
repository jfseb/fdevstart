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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4udHMiXSwibmFtZXMiOlsibGV2ZW5zaHRlaW5EYW1lcmF1IiwiYSIsImIiLCJpIiwiaiIsImNvc3QiLCJkIiwibGVuZ3RoIiwiY2hhckF0IiwiTWF0aCIsIm1pbiIsImV4cG9ydHMiLCJsZXZlbnNodGVpbiIsInNpZnQzRGlzdGFuY2UiLCJzMSIsInMyIiwiYWJzIiwibWF4IiwiYyIsIm9mZnNldDEiLCJvZmZzZXQyIiwibGNzIiwibWF4T2Zmc2V0IiwiamFyb193aW5rbGVyIiwibGNhZGp1c3RtZW50cyIsImphcm9fd2lua2xlcl9hZGoiLCJhX2xlbiIsImJfbGVuIiwiYV9mbGFnIiwiYl9mbGFnIiwic2VhcmNoX3JhbmdlIiwiZmxvb3IiLCJtaW52IiwiTnVtX2NvbSIsInlsMSIsImxvd2xpbSIsImhpbGltIiwiayIsIk5fdHJhbnMiLCJOX3NpbWkiLCJhZGp3dCIsIk51bV9zaW0iLCJ3ZWlnaHQiLCJ2ZWMiLCJuIiwiZmlsbCIsInZlY3RvciIsIkFycmF5IiwiYXJndW1lbnRzIiwidGFsaXNtYW5famFybyIsInJhbmdlIiwiaW5kZXhlcyIsImZsYWdzIiwibWF0Y2hlcyIsImwiLCJjaGFyYWN0ZXIiLCJ4aSIsInhuIiwibV8xIiwibXMxIiwibXMyIiwic2kiLCJ0cmFuc3Bvc2l0aW9ucyIsInQiLCJtIiwiamFybyIsImN1c3RvbUphcm9XaW5rbGVyIiwib3B0aW9ucyIsIl9hIiwiYm9vc3RUaHJlc2hvbGQiLCJfYiIsInNjYWxpbmdGYWN0b3IiLCJFcnJvciIsIm1heExlbmd0aCIsIm1pbkxlbmd0aCIsInByZWZpeCIsImphcm9XaW5rbGVyIiwiYmluZCIsImRpc3RhbmNlIiwiamFyb0Rpc3RhbmNlIiwibWF0Y2hXaW5kb3ciLCJtYXRjaGVzMSIsIm1hdGNoZXMyIiwibWF0Y2hlZCIsImphcm9XaW5rbGVyRGlzdGFuY2UiLCJwIl0sIm1hcHBpbmdzIjoiQUFBQTtBQUVBO0FBQ0E7QUFHQTs7OztB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QUFDSDtBQUNEO0FBRUQ7QUFDQTtBQUNBO0FBQ0EwQixRQUFJQSxJQUFJLEdBQVI7QUFDQSxXQUFPLENBQUNDLElBQUlsRCxHQUFHUCxNQUFQLEdBQWdCeUQsSUFBSWpELEdBQUdSLE1BQXZCLEdBQWdDLENBQUN5RCxJQUFJRCxDQUFMLElBQVVDLENBQTNDLElBQWdELENBQXZEO0FBQ0g7QUFqRWVyRCxRQUFBb0UsWUFBQSxHQUFZQSxZQUFaO0FBbUVoQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBQUssbUJBQUEsQ0FBb0N0RSxFQUFwQyxFQUFpREMsRUFBakQsRUFBMkQ7QUFDekQsUUFBSUQsTUFBTUMsRUFBVixFQUFjO0FBQ1osZUFBTyxDQUFQO0FBQ0QsS0FGRCxNQUdLO0FBQ0QsWUFBSWtELE9BQU9oQixjQUFjbkMsRUFBZCxFQUFpQkMsRUFBakIsQ0FBWDtBQUNFLFlBQUlzRSxJQUFJLEdBQVIsQ0FGRCxDQUVjO0FBQ2YsWUFBSS9CLElBQUksQ0FBUixDQUhDLENBR1M7QUFDVixlQUFNeEMsR0FBR3dDLENBQUgsS0FBU3ZDLEdBQUd1QyxDQUFILENBQVQsSUFBa0JBLElBQUksQ0FBNUI7QUFDSUE7QUFESixTQUdBLE9BQU9XLE9BQU9YLElBQUkrQixDQUFKLElBQVMsSUFBSXBCLElBQWIsQ0FBZDtBQUNIO0FBQ0Y7QUFiZXRELFFBQUF5RSxtQkFBQSxHQUFtQkEsbUJBQW5CIiwiZmlsZSI6InV0aWxzL2RhbWVyYXVMZXZlbnNodGVpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0J1xuXG4vLyBiYXNlZCBvbjogaHR0cDovL2VuLndpa2lib29rcy5vcmcvd2lraS9BbGdvcml0aG1faW1wbGVtZW50YXRpb24vU3RyaW5ncy9MZXZlbnNodGVpbl9kaXN0YW5jZVxuLy8gYW5kOiAgaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9EYW1lcmF1JUUyJTgwJTkzTGV2ZW5zaHRlaW5fZGlzdGFuY2VcblxuXG4vKipcbiAqIERpc3RhbmNlIG9mIHN0cmluZ3MgYWxnb3JpdGhtXG4gKiBAbW9kdWxlIGZzZGV2c3RhcnQudXRpbHMuZGFtZXJhdUxldmVuc2h0ZWluXG4gKi9cblxuLyoqXG4gKiBhIGZ1bmN0aW9uIGNhbGN1bGF0aW5nIGRpc3RhbmNlIGJldHdlZW4gdHdvIHN0cmluZ3NcbiAqIGFjY29yZGluZyB0byB0aGUgZGFtZXJhdSBMZXZlbnNodGVpbiBhbGdvcml0aG1cbiAqICh0aGlzIGFsZ29yaXRobSwgaW4gY29udHJhc3QgdG8gcGxhaW4gbGV2ZW5zaHRlaW4gdHJlYXRzXG4gKiBzd2FwcGluZyBvZiBjaGFyYWN0ZXJzIGEgZGlzdGFuY2UgMSAgXCJ3b3JkXCIgIDwtPiBcIndyb2QgKVxuICogQHBhcmFtIHtzdHJpbmd9IGFcbiAqIEBwYXJhbSB7c3RyaW5nfSBiXG4gKiBAcHVibGljXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsZXZlbnNodGVpbkRhbWVyYXUgKGEgOiBzdHJpbmcsIGIgOiBzdHJpbmcpIHtcbiAgdmFyIGkgOiBudW1iZXJcbiAgdmFyIGogOiBudW1iZXJcbiAgdmFyIGNvc3QgOiBudW1iZXJcbiAgdmFyIGQgPSBbXVxuICBpZiAoYS5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gYi5sZW5ndGhcbiAgfVxuICBpZiAoYi5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gYS5sZW5ndGhcbiAgfVxuICBmb3IgKGkgPSAwOyBpIDw9IGEubGVuZ3RoOyBpKyspIHtcbiAgICBkWyBpIF0gPSBbXVxuICAgIGRbIGkgXVsgMCBdID0gaVxuICB9XG4gIGZvciAoaiA9IDA7IGogPD0gYi5sZW5ndGg7IGorKykge1xuICAgIGRbIDAgXVsgaiBdID0galxuICB9XG4gIGZvciAoaSA9IDE7IGkgPD0gYS5sZW5ndGg7IGkrKykge1xuICAgIGZvciAoaiA9IDE7IGogPD0gYi5sZW5ndGg7IGorKykge1xuICAgICAgaWYgKGEuY2hhckF0KGkgLSAxKSA9PT0gYi5jaGFyQXQoaiAtIDEpKSB7XG4gICAgICAgIGNvc3QgPSAwXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb3N0ID0gMVxuICAgICAgfVxuXG4gICAgICBkWyBpIF1bIGogXSA9IE1hdGgubWluKGRbIGkgLSAxIF1bIGogXSArIDEsIGRbIGkgXVsgaiAtIDEgXSArIDEsIGRbIGkgLSAxIF1bIGogLSAxIF0gKyBjb3N0KVxuXG4gICAgICBpZiAoXG5cbiAgICAgICAgaSA+IDEgJiZcblxuICAgICAgICBqID4gMSAmJlxuXG4gICAgICAgIGEuY2hhckF0KGkgLSAxKSA9PT0gYi5jaGFyQXQoaiAtIDIpICYmXG5cbiAgICAgICAgYS5jaGFyQXQoaSAtIDIpID09PSBiLmNoYXJBdChqIC0gMSlcblxuICAgICAgKSB7XG4gICAgICAgIGRbaV1bal0gPSBNYXRoLm1pbihcblxuICAgICAgICAgIGRbaV1bal0sXG5cbiAgICAgICAgICBkW2kgLSAyXVtqIC0gMl0gKyBjb3N0XG5cbiAgICAgICAgKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBkWyBhLmxlbmd0aCBdWyBiLmxlbmd0aCBdXG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGxldmVuc2h0ZWluIChhIDogc3RyaW5nLCBiIDogc3RyaW5nKSB7XG4gIC8vcmV0dXJuIDIuMCAqIHNpZnQzRGlzdGFuY2UoYSxiKTsgLy8sNiw3KTsgLy8gKyBiLmxlbmd0aCAvIDIpO1xuICByZXR1cm4gbGV2ZW5zaHRlaW5EYW1lcmF1KGEsYik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzaWZ0M0Rpc3RhbmNlKHMxLCBzMikge1xuICAgIGlmIChzMSA9PSBudWxsIHx8IHMxLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBpZiAoczIgPT0gbnVsbCB8fCBzMi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHMyLmxlbmd0aDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzMiA9PSBudWxsIHx8IHMyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gczEubGVuZ3RoO1xuICAgIH1cbiAgICBpZiAoTWF0aC5hYnMoczEubGVuZ3RoICAtIHMyLmxlbmd0aCkgPiAyMCkge1xuICAgICAgcmV0dXJuICBNYXRoLm1heChzMS5sZW5ndGgsIHMyLmxlbmd0aCkvMjtcbiAgICB9XG5cbiAgICB2YXIgYyA9IDA7XG4gICAgdmFyIG9mZnNldDEgPSAwO1xuICAgIHZhciBvZmZzZXQyID0gMDtcbiAgICB2YXIgbGNzID0gMDtcbiAgICB2YXIgbWF4T2Zmc2V0ID0gMztcblxuICAgIHdoaWxlICgoYyArIG9mZnNldDEgPCBzMS5sZW5ndGgpICYmIChjICsgb2Zmc2V0MiA8IHMyLmxlbmd0aCkpIHtcbiAgICAgICAgaWYgKHMxLmNoYXJBdChjICsgb2Zmc2V0MSkgPT0gczIuY2hhckF0KGMgKyBvZmZzZXQyKSkge1xuICAgICAgICAgICAgbGNzKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvZmZzZXQxID0gMDtcbiAgICAgICAgICAgIG9mZnNldDIgPSAwO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtYXhPZmZzZXQ7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmICgoYyArIGkgPCBzMS5sZW5ndGgpICYmIChzMS5jaGFyQXQoYyArIGkpID09IHMyLmNoYXJBdChjKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgb2Zmc2V0MSA9IGk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoKGMgKyBpIDwgczIubGVuZ3RoKSAmJiAoczEuY2hhckF0KGMpID09IHMyLmNoYXJBdChjICsgaSkpKSB7XG4gICAgICAgICAgICAgICAgICAgIG9mZnNldDIgPSBpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYysrO1xuICAgIH1cbiAgICByZXR1cm4gKHMxLmxlbmd0aCArIHMyLmxlbmd0aCkgLyAyIC0gbGNzO1xufVxuXG4vKlxuLy8gIFNpZnQ0IC0gY29tbW9uIHZlcnNpb25cbi8vIGh0dHBzOi8vc2lkZXJpdGUuYmxvZ3Nwb3QuY29tLzIwMTQvMTEvc3VwZXItZmFzdC1hbmQtYWNjdXJhdGUtc3RyaW5nLWRpc3RhbmNlLmh0bWxcbi8vIG9ubGluZSBhbGdvcml0aG0gdG8gY29tcHV0ZSB0aGUgZGlzdGFuY2UgYmV0d2VlbiB0d28gc3RyaW5ncyBpbiBPKG4pXG4vLyBtYXhPZmZzZXQgaXMgdGhlIG51bWJlciBvZiBjaGFyYWN0ZXJzIHRvIHNlYXJjaCBmb3IgbWF0Y2hpbmcgbGV0dGVyc1xuLy8gbWF4RGlzdGFuY2UgaXMgdGhlIGRpc3RhbmNlIGF0IHdoaWNoIHRoZSBhbGdvcml0aG0gc2hvdWxkIHN0b3AgY29tcHV0aW5nIHRoZSB2YWx1ZSBhbmQganVzdCBleGl0ICh0aGUgc3RyaW5ncyBhcmUgdG9vIGRpZmZlcmVudCBhbnl3YXkpXG5leHBvcnQgZnVuY3Rpb24gc2lmdDQoczEsIHMyLCBtYXhPZmZzZXQsIG1heERpc3RhbmNlKSB7XG4gICAgaWYgKCFzMXx8IXMxLmxlbmd0aCkge1xuICAgICAgICBpZiAoIXMyKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gczIubGVuZ3RoO1xuICAgIH1cblxuICAgIGlmICghczJ8fCFzMi5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHMxLmxlbmd0aDtcbiAgICB9XG5cbiAgICB2YXIgbDE9czEubGVuZ3RoO1xuICAgIHZhciBsMj1zMi5sZW5ndGg7XG4gICAgaWYoTWF0aC5hYnMobDEgLSBsMikgPiBtYXhEaXN0YW5jZSkge1xuICAgICAgcmV0dXJuIDUwMDAwO1xuICAgIH1cblxuICAgIHZhciBjMSA9IDA7ICAvL2N1cnNvciBmb3Igc3RyaW5nIDFcbiAgICB2YXIgYzIgPSAwOyAgLy9jdXJzb3IgZm9yIHN0cmluZyAyXG4gICAgdmFyIGxjc3MgPSAwOyAgLy9sYXJnZXN0IGNvbW1vbiBzdWJzZXF1ZW5jZVxuICAgIHZhciBsb2NhbF9jcyA9IDA7IC8vbG9jYWwgY29tbW9uIHN1YnN0cmluZ1xuICAgIHZhciB0cmFucyA9IDA7ICAvL251bWJlciBvZiB0cmFuc3Bvc2l0aW9ucyAoJ2FiJyB2cyAnYmEnKVxuICAgIHZhciBvZmZzZXRfYXJyPVtdOyAgLy9vZmZzZXQgcGFpciBhcnJheSwgZm9yIGNvbXB1dGluZyB0aGUgdHJhbnNwb3NpdGlvbnNcblxuICAgIHdoaWxlICgoYzEgPCBsMSkgJiYgKGMyIDwgbDIpKSB7XG4gICAgICAgIGlmIChzMS5jaGFyQXQoYzEpID09IHMyLmNoYXJBdChjMikpIHtcbiAgICAgICAgICAgIGxvY2FsX2NzKys7XG4gICAgICAgICAgICB2YXIgaXNUcmFucz1mYWxzZTtcbiAgICAgICAgICAgIC8vc2VlIGlmIGN1cnJlbnQgbWF0Y2ggaXMgYSB0cmFuc3Bvc2l0aW9uXG4gICAgICAgICAgICB2YXIgaT0wO1xuICAgICAgICAgICAgd2hpbGUgKGk8b2Zmc2V0X2Fyci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB2YXIgb2ZzPW9mZnNldF9hcnJbaV07XG4gICAgICAgICAgICAgICAgaWYgKGMxPD1vZnMuYzEgfHwgYzIgPD0gb2ZzLmMyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHdoZW4gdHdvIG1hdGNoZXMgY3Jvc3MsIHRoZSBvbmUgY29uc2lkZXJlZCBhIHRyYW5zcG9zaXRpb24gaXMgdGhlIG9uZSB3aXRoIHRoZSBsYXJnZXN0IGRpZmZlcmVuY2UgaW4gb2Zmc2V0c1xuICAgICAgICAgICAgICAgICAgICBpc1RyYW5zPU1hdGguYWJzKGMyLWMxKT49TWF0aC5hYnMob2ZzLmMyLW9mcy5jMSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1RyYW5zKVxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFucysrO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFvZnMudHJhbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvZnMudHJhbnM9dHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFucysrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjMT5vZnMuYzIgJiYgYzI+b2ZzLmMxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXRfYXJyLnNwbGljZShpLDEpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb2Zmc2V0X2Fyci5wdXNoKHtcbiAgICAgICAgICAgICAgICBjMTpjMSxcbiAgICAgICAgICAgICAgICBjMjpjMixcbiAgICAgICAgICAgICAgICB0cmFuczppc1RyYW5zXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxjc3MrPWxvY2FsX2NzO1xuICAgICAgICAgICAgbG9jYWxfY3M9MDtcbiAgICAgICAgICAgIGlmIChjMSE9YzIpIHtcbiAgICAgICAgICAgICAgICBjMT1jMj1NYXRoLm1pbihjMSxjMik7ICAvL3VzaW5nIG1pbiBhbGxvd3MgdGhlIGNvbXB1dGF0aW9uIG9mIHRyYW5zcG9zaXRpb25zXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvL2lmIG1hdGNoaW5nIGNoYXJhY3RlcnMgYXJlIGZvdW5kLCByZW1vdmUgMSBmcm9tIGJvdGggY3Vyc29ycyAodGhleSBnZXQgaW5jcmVtZW50ZWQgYXQgdGhlIGVuZCBvZiB0aGUgbG9vcClcbiAgICAgICAgICAgIC8vc28gdGhhdCB3ZSBjYW4gaGF2ZSBvbmx5IG9uZSBjb2RlIGJsb2NrIGhhbmRsaW5nIG1hdGNoZXNcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWF4T2Zmc2V0ICYmIChjMStpPGwxIHx8IGMyK2k8bDIpOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoKGMxICsgaSA8IGwxKSAmJiAoczEuY2hhckF0KGMxICsgaSkgPT0gczIuY2hhckF0KGMyKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgYzErPSBpLTE7XG4gICAgICAgICAgICAgICAgICAgIGMyLS07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoKGMyICsgaSA8IGwyKSAmJiAoczEuY2hhckF0KGMxKSA9PSBzMi5jaGFyQXQoYzIgKyBpKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgYzEtLTtcbiAgICAgICAgICAgICAgICAgICAgYzIrPSBpLTE7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjMSsrO1xuICAgICAgICBjMisrO1xuICAgICAgICBpZiAobWF4RGlzdGFuY2UpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciB0ZW1wb3JhcnlEaXN0YW5jZT1NYXRoLm1heChjMSxjMiktbGNzcyt0cmFucztcbiAgICAgICAgICAgIGlmICh0ZW1wb3JhcnlEaXN0YW5jZT49bWF4RGlzdGFuY2UpIHJldHVybiA1MDAwMDsgLy8gTWF0aC5yb3VuZCh0ZW1wb3JhcnlEaXN0YW5jZSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gdGhpcyBjb3ZlcnMgdGhlIGNhc2Ugd2hlcmUgdGhlIGxhc3QgbWF0Y2ggaXMgb24gdGhlIGxhc3QgdG9rZW4gaW4gbGlzdCwgc28gdGhhdCBpdCBjYW4gY29tcHV0ZSB0cmFuc3Bvc2l0aW9ucyBjb3JyZWN0bHlcbiAgICAgICAgaWYgKChjMSA+PSBsMSkgfHwgKGMyID49IGwyKSkge1xuICAgICAgICAgICAgbGNzcys9bG9jYWxfY3M7XG4gICAgICAgICAgICBsb2NhbF9jcz0wO1xuICAgICAgICAgICAgYzE9YzI9TWF0aC5taW4oYzEsYzIpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGxjc3MrPWxvY2FsX2NzO1xuICAgIHJldHVybiBNYXRoLnJvdW5kKE1hdGgubWF4KGwxLGwyKS0gbGNzcyArdHJhbnMpOyAvL2FkZCB0aGUgY29zdCBvZiB0cmFuc3Bvc2l0aW9ucyB0byB0aGUgZmluYWwgcmVzdWx0XG59XG5cbiovXG5cbi8qXG5qYXJvX3dpbmtsZXIgbW9kaWZpZWRcbm9yaWdpbiBmcm9tIDpcbmh0dHBzOi8vZ2l0aHViLmNvbS90aHNpZy9qYXJvLXdpbmtsZXItSlMvYmxvYi9tYXN0ZXIvamFyb193aW5rbGVyLmpzXG5cblRoZSBNSVQgTGljZW5zZSAoTUlUKVxuXG5Db3B5cmlnaHQgKGMpIDIwMTUgVGhvcmFyaW5uIFNpZ3VyZHNzb25cblxuUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxub2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xudG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG5mdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuXG5UaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpbiBhbGxcbmNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbklNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG5BVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG5MSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEVcblNPRlRXQVJFLlxuXG5cbiovXG5cbnZhciBqYXJvX3dpbmtsZXIgPSB7IGxjYWRqdXN0bWVudHM6IHt9fTtcblxuLyogSlMgaW1wbGVtZW50YXRpb24gb2YgdGhlIHN0cmNtcDk1IEMgZnVuY3Rpb24gd3JpdHRlbiBieVxuQmlsbCBXaW5rbGVyLCBHZW9yZ2UgTWNMYXVnaGxpbiwgTWF0dCBKYXJvIGFuZCBNYXVyZWVuIEx5bmNoLFxucmVsZWFzZWQgaW4gMTk5NCAoaHR0cDovL3dlYi5hcmNoaXZlLm9yZy93ZWIvMjAxMDAyMjcwMjAwMTkvaHR0cDovL3d3dy5jZW5zdXMuZ292L2dlby9tc2Ivc3RhbmQvc3RyY21wLmMpLlxuYSBhbmQgYiBzaG91bGQgYmUgc3RyaW5ncy4gQWx3YXlzIHBlcmZvcm1zIGNhc2UtaW5zZW5zaXRpdmUgY29tcGFyaXNvbnNcbmFuZCBhbHdheXMgYWRqdXN0cyBmb3IgbG9uZyBzdHJpbmdzLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGphcm9fd2lua2xlcl9hZGooYSwgYikge1xuXG4gIGlmICghYSB8fCAhYikgeyByZXR1cm4gMC4wOyB9XG5cbiAgLy8gd2UgaGF2ZSB0cmltbWVkXG4gIC8vYSA9IGEudHJpbSgpLnRvVXBwZXJDYXNlKCk7XG4gIC8vYiA9IGIudHJpbSgpLnRvVXBwZXJDYXNlKCk7XG4gIHZhciBhX2xlbiA9IGEubGVuZ3RoO1xuICB2YXIgYl9sZW4gPSBiLmxlbmd0aDtcbiAgdmFyIGFfZmxhZyA9IFtdOyB2YXIgYl9mbGFnID0gW107XG4gIHZhciBzZWFyY2hfcmFuZ2UgPSBNYXRoLmZsb29yKE1hdGgubWF4KGFfbGVuLCBiX2xlbikgLyAyKSAtIDE7XG4gIHZhciBtaW52ID0gTWF0aC5taW4oYV9sZW4sIGJfbGVuKTtcblxuICAvLyBMb29raW5nIG9ubHkgd2l0aGluIHRoZSBzZWFyY2ggcmFuZ2UsIGNvdW50IGFuZCBmbGFnIHRoZSBtYXRjaGVkIHBhaXJzLlxuICB2YXIgTnVtX2NvbSA9IDA7XG4gIHZhciB5bDEgPSBiX2xlbiAtIDE7XG4gIHZhciBqID0gMCBhcyBudW1iZXI7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYV9sZW47IGkrKykge1xuICAgIHZhciBsb3dsaW0gPSAoaSA+PSBzZWFyY2hfcmFuZ2UpID8gaSAtIHNlYXJjaF9yYW5nZSA6IDAgYXMgbnVtYmVyO1xuICAgIHZhciBoaWxpbSAgPSAoKGkgKyBzZWFyY2hfcmFuZ2UpIDw9IHlsMSkgPyAoaSArIHNlYXJjaF9yYW5nZSkgOiB5bDE7XG4gICAgZm9yICh2YXIgaiA9IGxvd2xpbTsgaiA8PSBoaWxpbTsgaisrKSB7XG4gICAgICBpZiAoYl9mbGFnW2pdICE9PSAxICYmIGFbal0gPT09IGJbaV0pIHtcbiAgICAgICAgYV9mbGFnW2pdID0gMTtcbiAgICAgICAgYl9mbGFnW2ldID0gMTtcbiAgICAgICAgTnVtX2NvbSsrO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBSZXR1cm4gaWYgbm8gY2hhcmFjdGVycyBpbiBjb21tb25cbiAgaWYgKE51bV9jb20gPT09IDApIHsgcmV0dXJuIDAuMDsgfVxuXG4gIC8vIENvdW50IHRoZSBudW1iZXIgb2YgdHJhbnNwb3NpdGlvbnNcbiAgdmFyIGsgPSAwOyB2YXIgTl90cmFucyA9IDA7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYV9sZW47IGkrKykge1xuICAgIGlmIChhX2ZsYWdbaV0gPT09IDEpIHtcbiAgICAgIHZhciBqID0gMCBhcyBudW1iZXI7XG4gICAgICBmb3IgKGogPSBrOyBqIDwgYl9sZW47IGorKykge1xuICAgICAgICBpZiAoYl9mbGFnW2pdID09PSAxKSB7XG4gICAgICAgICAgayA9IGogKyAxO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoYVtpXSAhPT0gYltqXSkgeyBOX3RyYW5zKys7IH1cbiAgICB9XG4gIH1cbiAgTl90cmFucyA9IE1hdGguZmxvb3IoTl90cmFucyAvIDIpO1xuXG4gIC8vIEFkanVzdCBmb3Igc2ltaWxhcml0aWVzIGluIG5vbm1hdGNoZWQgY2hhcmFjdGVyc1xuICB2YXIgTl9zaW1pID0gMDsgdmFyIGFkand0ID0ge307IC8vIGphcm9fd2lua2xlci5sY2FkanVzdG1lbnRzO1xuICBpZiAobWludiA+IE51bV9jb20pIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFfbGVuOyBpKyspIHtcbiAgICAgIGlmICghYV9mbGFnW2ldKSB7XG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgYl9sZW47IGorKykge1xuICAgICAgICAgIGlmICghYl9mbGFnW2pdKSB7XG4gICAgICAgICAgICBpZiAoYWRqd3RbYVtpXV0gPT09IGJbal0pIHtcbiAgICAgICAgICAgICAgTl9zaW1pICs9IDM7XG4gICAgICAgICAgICAgIGJfZmxhZ1tqXSA9IDI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHZhciBOdW1fc2ltID0gKE5fc2ltaSAvIDEwLjApICsgTnVtX2NvbTtcblxuICAvLyBNYWluIHdlaWdodCBjb21wdXRhdGlvblxuICB2YXIgd2VpZ2h0ID0gTnVtX3NpbSAvIGFfbGVuICsgTnVtX3NpbSAvIGJfbGVuICsgKE51bV9jb20gLSBOX3RyYW5zKSAvIE51bV9jb207XG4gIHdlaWdodCA9IHdlaWdodCAvIDM7XG5cbiAgLy8gQ29udGludWUgdG8gYm9vc3QgdGhlIHdlaWdodCBpZiB0aGUgc3RyaW5ncyBhcmUgc2ltaWxhclxuICBpZiAod2VpZ2h0ID4gMC43KSB7XG4gICAgLy8gQWRqdXN0IGZvciBoYXZpbmcgdXAgdG8gdGhlIGZpcnN0IDQgY2hhcmFjdGVycyBpbiBjb21tb25cbiAgICB2YXIgaiA9IChtaW52ID49IDQpID8gNCA6IG1pbnYgYXMgbnVtYmVyO1xuICAgIHZhciBpID0gMCBhcyBudW1iZXI7XG4gICAgZm9yIChpID0gMDsgKGkgPCBqKSAmJiBhW2ldID09PSBiW2ldOyBpKyspIHsgfVxuICAgIGlmIChpKSB7IHdlaWdodCArPSBpICogMC4xICogKDEuMCAtIHdlaWdodCkgfTtcblxuICAgIC8vIEFkanVzdCBmb3IgbG9uZyBzdHJpbmdzLlxuICAgIC8vIEFmdGVyIGFncmVlaW5nIGJlZ2lubmluZyBjaGFycywgYXQgbGVhc3QgdHdvIG1vcmUgbXVzdCBhZ3JlZVxuICAgIC8vIGFuZCB0aGUgYWdyZWVpbmcgY2hhcmFjdGVycyBtdXN0IGJlIG1vcmUgdGhhbiBoYWxmIG9mIHRoZVxuICAgIC8vIHJlbWFpbmluZyBjaGFyYWN0ZXJzLlxuICAgIGlmIChtaW52ID4gNCAmJiBOdW1fY29tID4gaSArIDEgJiYgMiAqIE51bV9jb20gPj0gbWludiArIGkpIHtcbiAgICAgIHdlaWdodCArPSAoMSAtIHdlaWdodCkgKiAoKE51bV9jb20gLSBpIC0gMSkgLyAoYV9sZW4gKiBiX2xlbiAtIGkqMiArIDIpKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gd2VpZ2h0XG5cbn07XG5cblxuLy8gVGhlIGNoYXIgYWRqdXN0bWVudCB0YWJsZSB1c2VkIGFib3ZlXG4vKlxuamFyb193aW5rbGVyLmFkanVzdG1lbnRzID0ge1xuICAgJ0EnOiAnRScsXG4gICAnQSc6ICdJJyxcbiAgICdBJzogJ08nLFxuICAnQSc6ICdVJyxcbiAgJ0InOiAnVicsXG4gICdFJzogJ0knLFxuICAnRSc6ICdPJyxcbiAgJ0UnOiAnVScsXG4gICdJJzogJ08nLFxuICAnSSc6ICdVJyxcbiAgJ08nOiAnVScsXG4gICdJJzogJ1knLFxuICAnRSc6ICdZJyxcbiAgJ0MnOiAnRycsXG4gICdFJzogJ0YnLFxuICAnVyc6ICdVJyxcbiAgJ1cnOiAnVicsXG4gICdYJzogJ0snLFxuICAnUyc6ICdaJyxcbiAgJ1gnOiAnUycsXG4gICdRJzogJ0MnLFxuICAnVSc6ICdWJyxcbiAgJ00nOiAnTicsXG4gICdMJzogJ0knLFxuICAnUSc6ICdPJyxcbiAgJ1AnOiAnUicsXG4gICdJJzogJ0onLFxuICAnMic6ICdaJyxcbiAgJzUnOiAnUycsXG4gICc4JzogJ0InLFxuICAnMSc6ICdJJyxcbiAgJzEnOiAnTCcsXG4gICcwJzogJ08nLFxuICAnMCc6ICdRJyxcbiAgJ0MnOiAnSycsXG4gICdHJzogJ0onLFxuICAnRSc6ICcgJyxcbiAgJ1knOiAnICcsXG4gICdTJzogJyAnXG59XG4qL1xuamFyb193aW5rbGVyLmxjYWRqdXN0bWVudHMgPSB7fTtcblxuLy9PYmplY3Qua2V5cyhqYXJvX3dpbmtsZXIuYWRqdXN0bWVudHMpLmZvckVhY2goZnVuY3Rpb24oc2tleSA6IHN0cmluZykge1xuLy8gICAgamFyb193aW5rbGVyLmxjYXNqdXN0bWVudHNbc2tleS50b0xvd2VyQ2FzZSgpXSA9IGphcm9fd2lua2xlci5hZGp1c3RtZW50c1tza2V5XS50b0xvd2VyQ2FzZSgpO1xuLy99KTtcbi8vY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoT2JqZWN0LmtleXNqYXJvX3dpbmtsZXIuYWRqdXN0bWVudHMpKVxuXG5cblxuLyoqXG4gKiBUYWxpc21hbiBtZXRyaWNzL2Rpc3RhbmNlL2phcm9cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqXG4gKiBGdW5jdGlvbiBjb21wdXRpbmcgdGhlIEphcm8gc2NvcmUuXG4gKlxuICogW1JlZmVyZW5jZV06XG4gKiBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9KYXJvJUUyJTgwJTkzV2lua2xlcl9kaXN0YW5jZVxuICpcbiAqIFtBcnRpY2xlc106XG4gKiBKYXJvLCBNLiBBLiAoMTk4OSkuIFwiQWR2YW5jZXMgaW4gcmVjb3JkIGxpbmthZ2UgbWV0aG9kb2xvZ3kgYXMgYXBwbGllZCB0b1xuICogdGhlIDE5ODUgY2Vuc3VzIG9mIFRhbXBhIEZsb3JpZGFcIi5cbiAqIEpvdXJuYWwgb2YgdGhlIEFtZXJpY2FuIFN0YXRpc3RpY2FsIEFzc29jaWF0aW9uIDg0ICg0MDYpOiA0MTTigJMyMFxuICpcbiAqIEphcm8sIE0uIEEuICgxOTk1KS4gXCJQcm9iYWJpbGlzdGljIGxpbmthZ2Ugb2YgbGFyZ2UgcHVibGljIGhlYWx0aCBkYXRhIGZpbGVcIi5cbiAqIFN0YXRpc3RpY3MgaW4gTWVkaWNpbmUgMTQgKDXigJM3KTogNDkx4oCTOC5cbiAqXG4gKiBbVGFnc106IHNlbWltZXRyaWMsIHN0cmluZyBtZXRyaWMuXG4gKi9cblxuXG4vKipcbiAqIEZ1bmN0aW9uIGNyZWF0aW5nIGEgdmVjdG9yIG9mIG4gZGltZW5zaW9ucyBhbmQgZmlsbGluZyBpdCB3aXRoIGEgc2luZ2xlXG4gKiB2YWx1ZSBpZiByZXF1aXJlZC5cbiAqXG4gKiBAcGFyYW0gIHtudW1iZXJ9IG4gICAgLSBEaW1lbnNpb25zIG9mIHRoZSB2ZWN0b3IgdG8gY3JlYXRlLlxuICogQHBhcmFtICB7bWl4ZWR9ICBmaWxsIC0gVmFsdWUgdG8gYmUgdXNlZCB0byBmaWxsIHRoZSB2ZWN0b3IuXG4gKiBAcmV0dXJuIHthcnJheX0gICAgICAgLSBUaGUgcmVzdWx0aW5nIHZlY3Rvci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZlYyhuLCBmaWxsKSB7XG4gIGNvbnN0IHZlY3RvciA9IG5ldyBBcnJheShuKTtcblxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKylcbiAgICAgIHZlY3RvcltpXSA9IGZpbGw7XG4gIH1cbiAgcmV0dXJuIHZlY3Rvcjtcbn1cblxuXG4vKipcbiAqIEZ1bmN0aW9uIHJldHVybmluZyB0aGUgSmFybyBzY29yZSBiZXR3ZWVuIHR3byBzZXF1ZW5jZXMuXG4gKlxuICogQHBhcmFtICB7bWl4ZWR9ICBhICAgICAtIFRoZSBmaXJzdCBzZXF1ZW5jZS5cbiAqIEBwYXJhbSAge21peGVkfSAgYiAgICAgLSBUaGUgc2Vjb25kIHNlcXVlbmNlLlxuICogQHJldHVybiB7bnVtYmVyfSAgICAgICAtIFRoZSBKYXJvIHNjb3JlIGJldHdlZW4gYSAmIGIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0YWxpc21hbl9qYXJvKGEsIGIpIHtcbiAgLy8gRmFzdCBicmVha1xuICBpZiAoYSA9PT0gYilcbiAgICByZXR1cm4gMTtcblxuICBsZXQgbWF4LCBtaW47XG5cbiAgaWYgKGEubGVuZ3RoID4gYi5sZW5ndGgpIHtcbiAgICBtYXggPSBhO1xuICAgIG1pbiA9IGI7XG4gIH1cbiAgZWxzZSB7XG4gICAgbWF4ID0gYjtcbiAgICBtaW4gPSBhO1xuICB9XG5cbiAgLy8gRmluZGluZyBtYXRjaGVzXG4gIGNvbnN0IHJhbmdlID0gTWF0aC5tYXgoKChtYXgubGVuZ3RoIC8gMikgfCAwKSAtIDEsIDApLFxuICAgICAgICBpbmRleGVzID0gdmVjKG1pbi5sZW5ndGgsIC0xKSxcbiAgICAgICAgZmxhZ3MgPSB2ZWMobWF4Lmxlbmd0aCwgZmFsc2UpO1xuXG4gIGxldCBtYXRjaGVzID0gMDtcblxuICBmb3IgKGxldCBpID0gMCwgbCA9IG1pbi5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBjb25zdCBjaGFyYWN0ZXIgPSBtaW5baV0sXG4gICAgICAgICAgeGkgPSBNYXRoLm1heChpIC0gcmFuZ2UsIDApLFxuICAgICAgICAgIHhuID0gTWF0aC5taW4oaSArIHJhbmdlICsgMSwgbWF4Lmxlbmd0aCk7XG5cbiAgICBmb3IgKGxldCBqID0geGksIG0gPSB4bjsgaiA8IG07IGorKykge1xuICAgICAgaWYgKCFmbGFnc1tqXSAmJiBjaGFyYWN0ZXIgPT09IG1heFtqXSkge1xuICAgICAgICBpbmRleGVzW2ldID0gajtcbiAgICAgICAgZmxhZ3Nbal0gPSB0cnVlO1xuICAgICAgICBtYXRjaGVzKys7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNvbnN0IG1zMSA9IG5ldyBBcnJheShtYXRjaGVzKSxcbiAgICAgICAgbXMyID0gbmV3IEFycmF5KG1hdGNoZXMpO1xuXG4gIGxldCBzaTtcblxuICBzaSA9IDA7XG4gIGZvciAobGV0IGkgPSAwLCBsID0gbWluLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlmIChpbmRleGVzW2ldICE9PSAtMSkge1xuICAgICAgbXMxW3NpXSA9IG1pbltpXTtcbiAgICAgIHNpKys7XG4gICAgfVxuICB9XG5cbiAgc2kgPSAwO1xuICBmb3IgKGxldCBpID0gMCwgbCA9IG1heC5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAoZmxhZ3NbaV0pIHtcbiAgICAgIG1zMltzaV0gPSBtYXhbaV07XG4gICAgICBzaSsrO1xuICAgIH1cbiAgfVxuXG4gIGxldCB0cmFuc3Bvc2l0aW9ucyA9IDA7XG4gIGZvciAobGV0IGkgPSAwLCBsID0gbXMxLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlmIChtczFbaV0gIT09IG1zMltpXSlcbiAgICAgIHRyYW5zcG9zaXRpb25zKys7XG4gIH1cblxuICAvLyBDb21wdXRpbmcgdGhlIGRpc3RhbmNlXG4gIGlmICghbWF0Y2hlcylcbiAgICByZXR1cm4gMDtcblxuICBjb25zdCB0ID0gKHRyYW5zcG9zaXRpb25zIC8gMikgfCAwLFxuICAgICAgICBtID0gbWF0Y2hlcztcblxuICByZXR1cm4gKChtIC8gYS5sZW5ndGgpICsgKG0gLyBiLmxlbmd0aCkgKyAoKG0gLSB0KSAvIG0pKSAvIDM7XG59XG5cbi8qKlxuICogSmFybyBkaXN0YW5jZSBpcyAxIC0gdGhlIEphcm8gc2NvcmUuXG4gKi9cbi8vY29uc3QgZGlzdGFuY2UgPSAoYSwgYikgPT4gMSAtIGphcm8oYSwgYik7XG5cblxuLypcbi1UaGUgTUlUIExpY2Vuc2UgKE1JVClcbi1cbi1Db3B5cmlnaHQgKGMpIDIwMTUgVGhvcmFyaW5uIFNpZ3VyZHNzb25cbi1cbi1QZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4tb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuLWluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbi10byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4tY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4tZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi1cbi1UaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpbiBhbGxcbi1jb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLVxuLVRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1Jcbi1JTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbi1GSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbi1BVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4tTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbi1PVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRVxuLVNPRlRXQVJFLlxuKi9cblxuXG4vKipcbiAqIFRhbGlzbWFuIG1ldHJpY3MvZGlzdGFuY2UvamFyby13aW5rbGVyXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqXG4gKiBGdW5jdGlvbiBjb21wdXRpbmcgdGhlIEphcm8tV2lua2xlciBzY29yZS5cbiAqXG4gKiBbUmVmZXJlbmNlXTpcbiAqIGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0phcm8lRTIlODAlOTNXaW5rbGVyX2Rpc3RhbmNlXG4gKlxuICogW0FydGljbGVdOlxuICogV2lua2xlciwgVy4gRS4gKDE5OTApLiBcIlN0cmluZyBDb21wYXJhdG9yIE1ldHJpY3MgYW5kIEVuaGFuY2VkIERlY2lzaW9uIFJ1bGVzXG4gKiBpbiB0aGUgRmVsbGVnaS1TdW50ZXIgTW9kZWwgb2YgUmVjb3JkIExpbmthZ2VcIi5cbiAqIFByb2NlZWRpbmdzIG9mIHRoZSBTZWN0aW9uIG9uIFN1cnZleSBSZXNlYXJjaCBNZXRob2RzXG4gKiAoQW1lcmljYW4gU3RhdGlzdGljYWwgQXNzb2NpYXRpb24pOiAzNTTigJMzNTkuXG4gKlxuICogW1RhZ3NdOiBzZW1pbWV0cmljLCBzdHJpbmcgbWV0cmljLlxuICovXG52YXIgamFybyA9IHRhbGlzbWFuX2phcm87IC8vaW1wb3J0IGphcm8gZnJvbSAnLi9qYXJvJztcblxuLyoqXG4gKiBGdW5jdGlvbiByZXR1cm5pbmcgdGhlIEphcm8tV2lua2xlciBzY29yZSBiZXR3ZWVuIHR3byBzZXF1ZW5jZXMuXG4gKlxuICogQHBhcmFtICB7b2JqZWN0fSBvcHRpb25zIC0gQ3VzdG9tIG9wdGlvbnMuXG4gKiBAcGFyYW0gIHttaXhlZH0gIGEgICAgICAgLSBUaGUgZmlyc3Qgc2VxdWVuY2UuXG4gKiBAcGFyYW0gIHttaXhlZH0gIGIgICAgICAgLSBUaGUgc2Vjb25kIHNlcXVlbmNlLlxuICogQHJldHVybiB7bnVtYmVyfSAgICAgICAgIC0gVGhlIEphcm8tV2lua2xlciBzY29yZSBiZXR3ZWVuIGEgJiBiLlxuICovXG5mdW5jdGlvbiBjdXN0b21KYXJvV2lua2xlcihvcHRpb25zLCBhLCBiKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIGNvbnN0IHtcbiAgICBib29zdFRocmVzaG9sZCA9IDAuNyxcbiAgICBzY2FsaW5nRmFjdG9yID0gMC4xXG4gIH0gPSBvcHRpb25zO1xuXG4gIGlmIChzY2FsaW5nRmFjdG9yID4gMC4yNSlcbiAgICB0aHJvdyBFcnJvcigndGFsaXNtYW4vbWV0cmljcy9kaXN0YW5jZS9qYXJvLXdpbmtsZXI6IHRoZSBzY2FsaW5nIGZhY3RvciBzaG91bGQgbm90IGV4Y2VlZCAwLjI1LicpO1xuXG4gIGlmIChib29zdFRocmVzaG9sZCA8IDAgfHwgYm9vc3RUaHJlc2hvbGQgPiAxKVxuICAgIHRocm93IEVycm9yKCd0YWxpc21hbi9tZXRyaWNzL2Rpc3RhbmNlL2phcm8td2lua2xlcjogdGhlIGJvb3N0IHRocmVzaG9sZCBzaG91bGQgYmUgY29tcHJpc2VkIGJldHdlZW4gMCBhbmQgMS4nKTtcblxuICAvLyBGYXN0IGJyZWFrXG4gIGlmIChhID09PSBiKVxuICAgIHJldHVybiAxO1xuXG4gIGNvbnN0IG1heExlbmd0aCA9IE1hdGgubWF4KGEubGVuZ3RoLCBiLmxlbmd0aCksXG4gICAgICAgIG1pbkxlbmd0aCA9IE1hdGgubWluKGEubGVuZ3RoLCBiLmxlbmd0aCk7XG5cbiAgLy8gQ29tcHV0aW5nIHByZWZpeFxuICBsZXQgcHJlZml4ID0gMDtcbiAgZm9yIChsZXQgaSA9IDAsIGwgPSBtaW5MZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBpZiAoYVtpXSA9PT0gYltpXSlcbiAgICAgIHByZWZpeCsrO1xuICAgIGVsc2VcbiAgICAgIGJyZWFrO1xuICB9XG5cbiAgLy8gQ29tcHV0aW5nIEphcm8tV2lua2xlciBzY29yZVxuICBjb25zdCBqID0gamFybyhhLCBiKTtcblxuICBpZiAoaiA8IGJvb3N0VGhyZXNob2xkKVxuICAgIHJldHVybiBqO1xuXG4gIHJldHVybiBqICsgTWF0aC5taW4oc2NhbGluZ0ZhY3RvciwgbWF4TGVuZ3RoKSAqIHByZWZpeCAqICgxIC0gaik7XG59XG5cbi8qKlxuICogSmFyby1XaW5rbGVyIHN0YW5kYXJkIGZ1bmN0aW9uLlxuICovXG5leHBvcnQgY29uc3QgamFyb1dpbmtsZXIgPSBjdXN0b21KYXJvV2lua2xlci5iaW5kKG51bGwsIG51bGwpO1xuXG4vKipcbiAqIEphcm8tV2lua2xlciBkaXN0YW5jZSBpcyAxIC0gdGhlIEphcm8tV2lua2xlciBzY29yZS5cbiAqL1xuY29uc3QgZGlzdGFuY2UgPSAoYSwgYikgPT4gMSAtIGphcm9XaW5rbGVyKGEsIGIpO1xuXG4vKipcbiAqIEV4cG9ydGluZy5cbiAqL1xuXG5cblxuLypcbkNvcHlyaWdodCAoYykgMjAxMiwgQWRhbSBQaGlsbGFiYXVtLCBDaHJpcyBVbWJlbFxuUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxub2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xudG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG5mdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbmFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuVW5sZXNzIG90aGVyd2lzZSBzdGF0ZWQgYnkgYSBzcGVjaWZpYyBzZWN0aW9uIG9mIGNvZGVcblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbklNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG5BVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG5MSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuVEhFIFNPRlRXQVJFLlxuKi9cblxuLy8gQ29tcHV0ZXMgdGhlIEphcm8gZGlzdGFuY2UgYmV0d2VlbiB0d28gc3RyaW5nIC0tIGludHJlcHJldGVkIGZyb206XG4vLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0phcm8lRTIlODAlOTNXaW5rbGVyX2Rpc3RhbmNlXG4vLyBzMSBpcyB0aGUgZmlyc3Qgc3RyaW5nIHRvIGNvbXBhcmVcbi8vIHMyIGlzIHRoZSBzZWNvbmQgc3RyaW5nIHRvIGNvbXBhcmVcbmV4cG9ydCBmdW5jdGlvbiBqYXJvRGlzdGFuY2UoczEsIHMyKSB7XG4gICAgaWYgKHR5cGVvZihzMSkgIT0gXCJzdHJpbmdcIiB8fCB0eXBlb2YoczIpICE9IFwic3RyaW5nXCIpIHJldHVybiAwO1xuICAgIGlmIChzMS5sZW5ndGggPT0gMCB8fCBzMi5sZW5ndGggPT0gMClcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgLy9zMSA9IHMxLnRvTG93ZXJDYXNlKCksIHMyID0gczIudG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgbWF0Y2hXaW5kb3cgPSAoTWF0aC5mbG9vcihNYXRoLm1heChzMS5sZW5ndGgsIHMyLmxlbmd0aCkgLyAyLjApKSAtIDE7XG4gICAgdmFyIG1hdGNoZXMxID0gbmV3IEFycmF5KHMxLmxlbmd0aCk7XG4gICAgdmFyIG1hdGNoZXMyID0gbmV3IEFycmF5KHMyLmxlbmd0aCk7XG4gICAgdmFyIG0gPSAwOyAvLyBudW1iZXIgb2YgbWF0Y2hlc1xuICAgIHZhciB0ID0gMDsgLy8gbnVtYmVyIG9mIHRyYW5zcG9zaXRpb25zXG5cbiAgICAvL2RlYnVnIGhlbHBlcnNcbiAgICAvL2NvbnNvbGUubG9nKFwiczE6IFwiICsgczEgKyBcIjsgczI6IFwiICsgczIpO1xuICAgIC8vY29uc29sZS5sb2coXCIgLSBtYXRjaFdpbmRvdzogXCIgKyBtYXRjaFdpbmRvdyk7XG5cbiAgICAvLyBmaW5kIG1hdGNoZXNcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHMxLmxlbmd0aDsgaSsrKSB7XG5cdHZhciBtYXRjaGVkID0gZmFsc2U7XG5cblx0Ly8gY2hlY2sgZm9yIGFuIGV4YWN0IG1hdGNoXG5cdGlmIChzMVtpXSA9PSAgczJbaV0pIHtcblx0XHRtYXRjaGVzMVtpXSA9IG1hdGNoZXMyW2ldID0gbWF0Y2hlZCA9IHRydWU7XG5cdFx0bSsrXG5cdH1cblxuXHQvLyBjaGVjayB0aGUgXCJtYXRjaCB3aW5kb3dcIlxuXHRlbHNlIHtcbiAgICAgICAgXHQvLyB0aGlzIGZvciBsb29wIGlzIGEgbGl0dGxlIGJydXRhbFxuICAgICAgICBcdGZvciAoayA9IChpIDw9IG1hdGNoV2luZG93KSA/IDAgOiBpIC0gbWF0Y2hXaW5kb3c7XG4gICAgICAgIFx0XHQoayA8PSBpICsgbWF0Y2hXaW5kb3cpICYmIGsgPCBzMi5sZW5ndGggJiYgIW1hdGNoZWQ7XG5cdFx0XHRrKyspIHtcbiAgICAgICAgICAgIFx0XHRpZiAoczFbaV0gPT0gczJba10pIHtcbiAgICAgICAgICAgICAgICBcdFx0aWYoIW1hdGNoZXMxW2ldICYmICFtYXRjaGVzMltrXSkge1xuICAgICAgICAgICAgICAgIFx0ICAgIFx0XHRtKys7XG4gICAgICAgICAgICAgICBcdFx0fVxuXG4gICAgICAgIFx0ICAgICAgICBtYXRjaGVzMVtpXSA9IG1hdGNoZXMyW2tdID0gbWF0Y2hlZCA9IHRydWU7XG4gICAgICAgIFx0ICAgIH1cbiAgICAgICAgXHR9XG5cdH1cbiAgICB9XG5cbiAgICBpZihtID09IDApXG4gICAgICAgIHJldHVybiAwLjA7XG5cbiAgICAvLyBjb3VudCB0cmFuc3Bvc2l0aW9uc1xuICAgIHZhciBrID0gMDtcblxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBzMS5sZW5ndGg7IGkrKykge1xuICAgIFx0aWYobWF0Y2hlczFba10pIHtcbiAgICBcdCAgICB3aGlsZSghbWF0Y2hlczJba10gJiYgayA8IG1hdGNoZXMyLmxlbmd0aClcbiAgICAgICAgICAgICAgICBrKys7XG5cdCAgICAgICAgaWYoczFbaV0gIT0gczJba10gJiYgIGsgPCBtYXRjaGVzMi5sZW5ndGgpICB7XG4gICAgICAgICAgICAgICAgdCsrO1xuICAgICAgICAgICAgfVxuXG4gICAgXHQgICAgaysrO1xuICAgIFx0fVxuICAgIH1cblxuICAgIC8vZGVidWcgaGVscGVyczpcbiAgICAvL2NvbnNvbGUubG9nKFwiIC0gbWF0Y2hlczogXCIgKyBtKTtcbiAgICAvL2NvbnNvbGUubG9nKFwiIC0gdHJhbnNwb3NpdGlvbnM6IFwiICsgdCk7XG4gICAgdCA9IHQgLyAyLjA7XG4gICAgcmV0dXJuIChtIC8gczEubGVuZ3RoICsgbSAvIHMyLmxlbmd0aCArIChtIC0gdCkgLyBtKSAvIDM7XG59XG5cbi8vIENvbXB1dGVzIHRoZSBXaW5rbGVyIGRpc3RhbmNlIGJldHdlZW4gdHdvIHN0cmluZyAtLSBpbnRyZXByZXRlZCBmcm9tOlxuLy8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9KYXJvJUUyJTgwJTkzV2lua2xlcl9kaXN0YW5jZVxuLy8gczEgaXMgdGhlIGZpcnN0IHN0cmluZyB0byBjb21wYXJlXG4vLyBzMiBpcyB0aGUgc2Vjb25kIHN0cmluZyB0byBjb21wYXJlXG4vLyBkaiBpcyB0aGUgSmFybyBEaXN0YW5jZSAoaWYgeW91J3ZlIGFscmVhZHkgY29tcHV0ZWQgaXQpLCBsZWF2ZSBibGFuayBhbmQgdGhlIG1ldGhvZCBoYW5kbGVzIGl0XG5leHBvcnQgZnVuY3Rpb24gamFyb1dpbmtsZXJEaXN0YW5jZShzMSA6IHN0cmluZywgczI6IHN0cmluZykge1xuXHRcdGlmIChzMSA9PSBzMikge1xuXHRcdFx0XHRyZXR1cm4gMVxuXHRcdH1cblx0XHRlbHNlIHtcblx0XHQgICAgdmFyIGphcm8gPSB0YWxpc21hbl9qYXJvKHMxLHMyKTtcbiAgICAgICAgdmFyIHAgPSAwLjE7IC8vXG5cdFx0ICAgIHZhciBsID0gMCAvLyBsZW5ndGggb2YgdGhlIG1hdGNoaW5nIHByZWZpeFxuXHRcdCAgICB3aGlsZShzMVtsXSA9PSBzMltsXSAmJiBsIDwgNClcblx0XHQgICAgICAgIGwrKztcblxuXHRcdCAgICByZXR1cm4gamFybyArIGwgKiBwICogKDEgLSBqYXJvKTtcblx0XHR9XG59XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
