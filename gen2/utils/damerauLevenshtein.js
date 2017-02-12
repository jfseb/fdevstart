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
/*
export function levenshteinDamerau (a : string, b : string) {
  var i : number
  var j : number
  var cost : number
  var d = []
  if (a.length === 0) {
    return b.length
  }
  if (b.length === 0) {
    return a.length
  }
  for (i = 0; i <= a.length; i++) {
    d[ i ] = []
    d[ i ][ 0 ] = i
  }
  for (j = 0; j <= b.length; j++) {
    d[ 0 ][ j ] = j
  }
  for (i = 1; i <= a.length; i++) {
    for (j = 1; j <= b.length; j++) {
      if (a.charAt(i - 1) === b.charAt(j - 1)) {
        cost = 0
      } else {
        cost = 1
      }

      d[ i ][ j ] = Math.min(d[ i - 1 ][ j ] + 1, d[ i ][ j - 1 ] + 1, d[ i - 1 ][ j - 1 ] + cost)

      if (

        i > 1 &&

        j > 1 &&

        a.charAt(i - 1) === b.charAt(j - 2) &&

        a.charAt(i - 2) === b.charAt(j - 1)

      ) {
        d[i][j] = Math.min(

          d[i][j],

          d[i - 2][j - 2] + cost

        )
      }
    }
  }

  return d[ a.length ][ b.length ]
}
*/
/*
export function levenshtein (a : string, b : string) {
  //return 2.0 * sift3Distance(a,b); //,6,7); // + b.length / 2);
  return levenshteinDamerau(a,b);
}
*/
/*

export function sift3Distance(s1, s2) {
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
    if (Math.abs(s1.length  - s2.length) > 20) {
      return  Math.max(s1.length, s2.length)/2;
    }

    var c = 0;
    var offset1 = 0;
    var offset2 = 0;
    var lcs = 0;
    var maxOffset = 3;

    while ((c + offset1 < s1.length) && (c + offset2 < s2.length)) {
        if (s1.charAt(c + offset1) == s2.charAt(c + offset2)) {
            lcs++;
        } else {
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
*/
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
/**
 * Jaro-Winkler standard function.
 */
//export const jaroWinkler = customJaroWinkler.bind(null, null);
/**
 * Jaro-Winkler distance is 1 - the Jaro-Winkler score.
 */
//const distance = (a, b) => 1 - jaroWinkler(a, b);
/**
 * Exporting.
 */
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
/*

function cntChars(str : string, len : number) {
  var cnt = 0;
  for(var i = 0; i < len; ++i) {
    cnt += (str.charAt(i) === 'X')? 1 : 0;
  }
  return cnt;
}
*/
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
    if (Math.abs(s1len - s2len) > min) {
        return 0.3;
    }
    var dist = jaroWinklerDistance(sText1, sText2);
    /*
    var cnt1 = cntChars(sText1, s1len);
    var cnt2 = cntChars(sText2, s2len);
    if(cnt1 !== cnt2) {
      dist = dist * 0.7;
    }
    */
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4udHMiXSwibmFtZXMiOlsidmVjIiwibiIsImZpbGwiLCJ2ZWN0b3IiLCJBcnJheSIsImFyZ3VtZW50cyIsImxlbmd0aCIsImkiLCJleHBvcnRzIiwidGFsaXNtYW5famFybyIsImEiLCJiIiwibWF4IiwibWluIiwicmFuZ2UiLCJNYXRoIiwiaW5kZXhlcyIsImZsYWdzIiwibWF0Y2hlcyIsImwiLCJjaGFyYWN0ZXIiLCJ4aSIsInhuIiwiaiIsIm1fMSIsIm1zMSIsIm1zMiIsInNpIiwidHJhbnNwb3NpdGlvbnMiLCJ0IiwibSIsImphcm9XaW5rbGVyRGlzdGFuY2UiLCJzMSIsInMyIiwiamFybyIsInAiLCJjYWxjRGlzdGFuY2UiLCJzVGV4dDEiLCJzVGV4dDIiLCJzMWxlbiIsInMybGVuIiwiYWJzIiwiZGlzdCIsImNhbGNEaXN0YW5jZUFkanVzdGVkIiwibWwiLCJmYWMiXSwibWFwcGluZ3MiOiJBQUFBO0FBRUE7QUFDQTtBQUdBOzs7O0FBS0E7Ozs7Ozs7OztBQVdBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUF1REE7Ozs7OztBQVFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBK0NBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBMkdBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBcUJBOzs7Ozs7Ozs7QUFRQSxTQUFBQSxHQUFBLENBQW9CQyxDQUFwQixFQUF1QkMsSUFBdkIsRUFBMkI7QUFDekIsUUFBTUMsU0FBUyxJQUFJQyxLQUFKLENBQVVILENBQVYsQ0FBZjtBQUVBLFFBQUlJLFVBQVVDLE1BQVYsR0FBbUIsQ0FBdkIsRUFBMEI7QUFDeEIsYUFBSyxJQUFJ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S0FBS0YsR0FBTCxDQUFTMEIsS0FBVCxFQUFlQyxLQUFmLENBQVY7QUFDQSxRQUFHekIsS0FBSzBCLEdBQUwsQ0FBU0YsUUFBUUMsS0FBakIsSUFBMEIzQixHQUE3QixFQUFrQztBQUNoQyxlQUFPLEdBQVA7QUFDRDtBQUNELFFBQUk2QixPQUFPWCxvQkFBb0JNLE1BQXBCLEVBQTJCQyxNQUEzQixDQUFYO0FBQ0E7Ozs7Ozs7QUFPQSxXQUFPSSxJQUFQO0FBQ0E7Ozs7Ozs7Ozs7O0FBV0Q7QUE1QkRsQyxRQUFBNEIsWUFBQSxHQUFBQSxZQUFBO0FBOEJBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBb0JBOzs7Ozs7Ozs7O0FBYUEsU0FBQU8sb0JBQUEsQ0FBcUNqQyxDQUFyQyxFQUFnREMsQ0FBaEQsRUFBd0Q7QUFDdEQsUUFBSStCLE9BQU9OLGFBQWExQixDQUFiLEVBQWVDLENBQWYsQ0FBWDtBQUNBLFFBQUlpQyxLQUFLN0IsS0FBS0YsR0FBTCxDQUFTSCxFQUFFSixNQUFYLEVBQW1CSyxFQUFFTCxNQUFyQixDQUFUO0FBQ0EsUUFBR29DLE9BQU8sR0FBUCxJQUFlRSxLQUFLLEVBQXZCLEVBQTRCO0FBQ3hCLFlBQUlDLE1BQU8sSUFBSyxRQUFNLElBQVAsSUFBYyxLQUFHRCxFQUFqQixDQUFmO0FBQ0EsZUFBTyxNQUFRLENBQUMsTUFBTUYsSUFBUCxJQUFjRyxHQUE3QjtBQUNIO0FBQ0QsV0FBT0gsSUFBUDtBQUNEO0FBUkRsQyxRQUFBbUMsb0JBQUEsR0FBQUEsb0JBQUE7QUFVQSIsImZpbGUiOiJ1dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCdcblxuLy8gYmFzZWQgb246IGh0dHA6Ly9lbi53aWtpYm9va3Mub3JnL3dpa2kvQWxnb3JpdGhtX2ltcGxlbWVudGF0aW9uL1N0cmluZ3MvTGV2ZW5zaHRlaW5fZGlzdGFuY2Vcbi8vIGFuZDogIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRGFtZXJhdSVFMiU4MCU5M0xldmVuc2h0ZWluX2Rpc3RhbmNlXG5cblxuLyoqXG4gKiBEaXN0YW5jZSBvZiBzdHJpbmdzIGFsZ29yaXRobVxuICogQG1vZHVsZSBmc2RldnN0YXJ0LnV0aWxzLmRhbWVyYXVMZXZlbnNodGVpblxuICovXG5cbi8qKlxuICogYSBmdW5jdGlvbiBjYWxjdWxhdGluZyBkaXN0YW5jZSBiZXR3ZWVuIHR3byBzdHJpbmdzXG4gKiBhY2NvcmRpbmcgdG8gdGhlIGRhbWVyYXUgTGV2ZW5zaHRlaW4gYWxnb3JpdGhtXG4gKiAodGhpcyBhbGdvcml0aG0sIGluIGNvbnRyYXN0IHRvIHBsYWluIGxldmVuc2h0ZWluIHRyZWF0c1xuICogc3dhcHBpbmcgb2YgY2hhcmFjdGVycyBhIGRpc3RhbmNlIDEgIFwid29yZFwiICA8LT4gXCJ3cm9kIClcbiAqIEBwYXJhbSB7c3RyaW5nfSBhXG4gKiBAcGFyYW0ge3N0cmluZ30gYlxuICogQHB1YmxpY1xuICovXG5cblxuLypcbmV4cG9ydCBmdW5jdGlvbiBsZXZlbnNodGVpbkRhbWVyYXUgKGEgOiBzdHJpbmcsIGIgOiBzdHJpbmcpIHtcbiAgdmFyIGkgOiBudW1iZXJcbiAgdmFyIGogOiBudW1iZXJcbiAgdmFyIGNvc3QgOiBudW1iZXJcbiAgdmFyIGQgPSBbXVxuICBpZiAoYS5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gYi5sZW5ndGhcbiAgfVxuICBpZiAoYi5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gYS5sZW5ndGhcbiAgfVxuICBmb3IgKGkgPSAwOyBpIDw9IGEubGVuZ3RoOyBpKyspIHtcbiAgICBkWyBpIF0gPSBbXVxuICAgIGRbIGkgXVsgMCBdID0gaVxuICB9XG4gIGZvciAoaiA9IDA7IGogPD0gYi5sZW5ndGg7IGorKykge1xuICAgIGRbIDAgXVsgaiBdID0galxuICB9XG4gIGZvciAoaSA9IDE7IGkgPD0gYS5sZW5ndGg7IGkrKykge1xuICAgIGZvciAoaiA9IDE7IGogPD0gYi5sZW5ndGg7IGorKykge1xuICAgICAgaWYgKGEuY2hhckF0KGkgLSAxKSA9PT0gYi5jaGFyQXQoaiAtIDEpKSB7XG4gICAgICAgIGNvc3QgPSAwXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb3N0ID0gMVxuICAgICAgfVxuXG4gICAgICBkWyBpIF1bIGogXSA9IE1hdGgubWluKGRbIGkgLSAxIF1bIGogXSArIDEsIGRbIGkgXVsgaiAtIDEgXSArIDEsIGRbIGkgLSAxIF1bIGogLSAxIF0gKyBjb3N0KVxuXG4gICAgICBpZiAoXG5cbiAgICAgICAgaSA+IDEgJiZcblxuICAgICAgICBqID4gMSAmJlxuXG4gICAgICAgIGEuY2hhckF0KGkgLSAxKSA9PT0gYi5jaGFyQXQoaiAtIDIpICYmXG5cbiAgICAgICAgYS5jaGFyQXQoaSAtIDIpID09PSBiLmNoYXJBdChqIC0gMSlcblxuICAgICAgKSB7XG4gICAgICAgIGRbaV1bal0gPSBNYXRoLm1pbihcblxuICAgICAgICAgIGRbaV1bal0sXG5cbiAgICAgICAgICBkW2kgLSAyXVtqIC0gMl0gKyBjb3N0XG5cbiAgICAgICAgKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBkWyBhLmxlbmd0aCBdWyBiLmxlbmd0aCBdXG59XG4qL1xuXG4vKlxuZXhwb3J0IGZ1bmN0aW9uIGxldmVuc2h0ZWluIChhIDogc3RyaW5nLCBiIDogc3RyaW5nKSB7XG4gIC8vcmV0dXJuIDIuMCAqIHNpZnQzRGlzdGFuY2UoYSxiKTsgLy8sNiw3KTsgLy8gKyBiLmxlbmd0aCAvIDIpO1xuICByZXR1cm4gbGV2ZW5zaHRlaW5EYW1lcmF1KGEsYik7XG59XG4qL1xuXG5cbi8qXG5cbmV4cG9ydCBmdW5jdGlvbiBzaWZ0M0Rpc3RhbmNlKHMxLCBzMikge1xuICAgIGlmIChzMSA9PSBudWxsIHx8IHMxLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBpZiAoczIgPT0gbnVsbCB8fCBzMi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHMyLmxlbmd0aDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzMiA9PSBudWxsIHx8IHMyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gczEubGVuZ3RoO1xuICAgIH1cbiAgICBpZiAoTWF0aC5hYnMoczEubGVuZ3RoICAtIHMyLmxlbmd0aCkgPiAyMCkge1xuICAgICAgcmV0dXJuICBNYXRoLm1heChzMS5sZW5ndGgsIHMyLmxlbmd0aCkvMjtcbiAgICB9XG5cbiAgICB2YXIgYyA9IDA7XG4gICAgdmFyIG9mZnNldDEgPSAwO1xuICAgIHZhciBvZmZzZXQyID0gMDtcbiAgICB2YXIgbGNzID0gMDtcbiAgICB2YXIgbWF4T2Zmc2V0ID0gMztcblxuICAgIHdoaWxlICgoYyArIG9mZnNldDEgPCBzMS5sZW5ndGgpICYmIChjICsgb2Zmc2V0MiA8IHMyLmxlbmd0aCkpIHtcbiAgICAgICAgaWYgKHMxLmNoYXJBdChjICsgb2Zmc2V0MSkgPT0gczIuY2hhckF0KGMgKyBvZmZzZXQyKSkge1xuICAgICAgICAgICAgbGNzKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvZmZzZXQxID0gMDtcbiAgICAgICAgICAgIG9mZnNldDIgPSAwO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtYXhPZmZzZXQ7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmICgoYyArIGkgPCBzMS5sZW5ndGgpICYmIChzMS5jaGFyQXQoYyArIGkpID09IHMyLmNoYXJBdChjKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgb2Zmc2V0MSA9IGk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoKGMgKyBpIDwgczIubGVuZ3RoKSAmJiAoczEuY2hhckF0KGMpID09IHMyLmNoYXJBdChjICsgaSkpKSB7XG4gICAgICAgICAgICAgICAgICAgIG9mZnNldDIgPSBpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYysrO1xuICAgIH1cbiAgICByZXR1cm4gKHMxLmxlbmd0aCArIHMyLmxlbmd0aCkgLyAyIC0gbGNzO1xufVxuKi9cblxuLypcbi8vICBTaWZ0NCAtIGNvbW1vbiB2ZXJzaW9uXG4vLyBodHRwczovL3NpZGVyaXRlLmJsb2dzcG90LmNvbS8yMDE0LzExL3N1cGVyLWZhc3QtYW5kLWFjY3VyYXRlLXN0cmluZy1kaXN0YW5jZS5odG1sXG4vLyBvbmxpbmUgYWxnb3JpdGhtIHRvIGNvbXB1dGUgdGhlIGRpc3RhbmNlIGJldHdlZW4gdHdvIHN0cmluZ3MgaW4gTyhuKVxuLy8gbWF4T2Zmc2V0IGlzIHRoZSBudW1iZXIgb2YgY2hhcmFjdGVycyB0byBzZWFyY2ggZm9yIG1hdGNoaW5nIGxldHRlcnNcbi8vIG1heERpc3RhbmNlIGlzIHRoZSBkaXN0YW5jZSBhdCB3aGljaCB0aGUgYWxnb3JpdGhtIHNob3VsZCBzdG9wIGNvbXB1dGluZyB0aGUgdmFsdWUgYW5kIGp1c3QgZXhpdCAodGhlIHN0cmluZ3MgYXJlIHRvbyBkaWZmZXJlbnQgYW55d2F5KVxuZXhwb3J0IGZ1bmN0aW9uIHNpZnQ0KHMxLCBzMiwgbWF4T2Zmc2V0LCBtYXhEaXN0YW5jZSkge1xuICAgIGlmICghczF8fCFzMS5sZW5ndGgpIHtcbiAgICAgICAgaWYgKCFzMikge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHMyLmxlbmd0aDtcbiAgICB9XG5cbiAgICBpZiAoIXMyfHwhczIubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBzMS5sZW5ndGg7XG4gICAgfVxuXG4gICAgdmFyIGwxPXMxLmxlbmd0aDtcbiAgICB2YXIgbDI9czIubGVuZ3RoO1xuICAgIGlmKE1hdGguYWJzKGwxIC0gbDIpID4gbWF4RGlzdGFuY2UpIHtcbiAgICAgIHJldHVybiA1MDAwMDtcbiAgICB9XG5cbiAgICB2YXIgYzEgPSAwOyAgLy9jdXJzb3IgZm9yIHN0cmluZyAxXG4gICAgdmFyIGMyID0gMDsgIC8vY3Vyc29yIGZvciBzdHJpbmcgMlxuICAgIHZhciBsY3NzID0gMDsgIC8vbGFyZ2VzdCBjb21tb24gc3Vic2VxdWVuY2VcbiAgICB2YXIgbG9jYWxfY3MgPSAwOyAvL2xvY2FsIGNvbW1vbiBzdWJzdHJpbmdcbiAgICB2YXIgdHJhbnMgPSAwOyAgLy9udW1iZXIgb2YgdHJhbnNwb3NpdGlvbnMgKCdhYicgdnMgJ2JhJylcbiAgICB2YXIgb2Zmc2V0X2Fycj1bXTsgIC8vb2Zmc2V0IHBhaXIgYXJyYXksIGZvciBjb21wdXRpbmcgdGhlIHRyYW5zcG9zaXRpb25zXG5cbiAgICB3aGlsZSAoKGMxIDwgbDEpICYmIChjMiA8IGwyKSkge1xuICAgICAgICBpZiAoczEuY2hhckF0KGMxKSA9PSBzMi5jaGFyQXQoYzIpKSB7XG4gICAgICAgICAgICBsb2NhbF9jcysrO1xuICAgICAgICAgICAgdmFyIGlzVHJhbnM9ZmFsc2U7XG4gICAgICAgICAgICAvL3NlZSBpZiBjdXJyZW50IG1hdGNoIGlzIGEgdHJhbnNwb3NpdGlvblxuICAgICAgICAgICAgdmFyIGk9MDtcbiAgICAgICAgICAgIHdoaWxlIChpPG9mZnNldF9hcnIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9mcz1vZmZzZXRfYXJyW2ldO1xuICAgICAgICAgICAgICAgIGlmIChjMTw9b2ZzLmMxIHx8IGMyIDw9IG9mcy5jMikge1xuICAgICAgICAgICAgICAgICAgICAvLyB3aGVuIHR3byBtYXRjaGVzIGNyb3NzLCB0aGUgb25lIGNvbnNpZGVyZWQgYSB0cmFuc3Bvc2l0aW9uIGlzIHRoZSBvbmUgd2l0aCB0aGUgbGFyZ2VzdCBkaWZmZXJlbmNlIGluIG9mZnNldHNcbiAgICAgICAgICAgICAgICAgICAgaXNUcmFucz1NYXRoLmFicyhjMi1jMSk+PU1hdGguYWJzKG9mcy5jMi1vZnMuYzEpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNUcmFucylcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnMrKztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghb2ZzLnRyYW5zKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2ZzLnRyYW5zPXRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnMrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYzE+b2ZzLmMyICYmIGMyPm9mcy5jMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0X2Fyci5zcGxpY2UoaSwxKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9mZnNldF9hcnIucHVzaCh7XG4gICAgICAgICAgICAgICAgYzE6YzEsXG4gICAgICAgICAgICAgICAgYzI6YzIsXG4gICAgICAgICAgICAgICAgdHJhbnM6aXNUcmFuc1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsY3NzKz1sb2NhbF9jcztcbiAgICAgICAgICAgIGxvY2FsX2NzPTA7XG4gICAgICAgICAgICBpZiAoYzEhPWMyKSB7XG4gICAgICAgICAgICAgICAgYzE9YzI9TWF0aC5taW4oYzEsYzIpOyAgLy91c2luZyBtaW4gYWxsb3dzIHRoZSBjb21wdXRhdGlvbiBvZiB0cmFuc3Bvc2l0aW9uc1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy9pZiBtYXRjaGluZyBjaGFyYWN0ZXJzIGFyZSBmb3VuZCwgcmVtb3ZlIDEgZnJvbSBib3RoIGN1cnNvcnMgKHRoZXkgZ2V0IGluY3JlbWVudGVkIGF0IHRoZSBlbmQgb2YgdGhlIGxvb3ApXG4gICAgICAgICAgICAvL3NvIHRoYXQgd2UgY2FuIGhhdmUgb25seSBvbmUgY29kZSBibG9jayBoYW5kbGluZyBtYXRjaGVzXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1heE9mZnNldCAmJiAoYzEraTxsMSB8fCBjMitpPGwyKTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKChjMSArIGkgPCBsMSkgJiYgKHMxLmNoYXJBdChjMSArIGkpID09IHMyLmNoYXJBdChjMikpKSB7XG4gICAgICAgICAgICAgICAgICAgIGMxKz0gaS0xO1xuICAgICAgICAgICAgICAgICAgICBjMi0tO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKChjMiArIGkgPCBsMikgJiYgKHMxLmNoYXJBdChjMSkgPT0gczIuY2hhckF0KGMyICsgaSkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGMxLS07XG4gICAgICAgICAgICAgICAgICAgIGMyKz0gaS0xO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYzErKztcbiAgICAgICAgYzIrKztcbiAgICAgICAgaWYgKG1heERpc3RhbmNlKVxuICAgICAgICB7XG4gICAgICAgICAgICB2YXIgdGVtcG9yYXJ5RGlzdGFuY2U9TWF0aC5tYXgoYzEsYzIpLWxjc3MrdHJhbnM7XG4gICAgICAgICAgICBpZiAodGVtcG9yYXJ5RGlzdGFuY2U+PW1heERpc3RhbmNlKSByZXR1cm4gNTAwMDA7IC8vIE1hdGgucm91bmQodGVtcG9yYXJ5RGlzdGFuY2UpO1xuICAgICAgICB9XG4gICAgICAgIC8vIHRoaXMgY292ZXJzIHRoZSBjYXNlIHdoZXJlIHRoZSBsYXN0IG1hdGNoIGlzIG9uIHRoZSBsYXN0IHRva2VuIGluIGxpc3QsIHNvIHRoYXQgaXQgY2FuIGNvbXB1dGUgdHJhbnNwb3NpdGlvbnMgY29ycmVjdGx5XG4gICAgICAgIGlmICgoYzEgPj0gbDEpIHx8IChjMiA+PSBsMikpIHtcbiAgICAgICAgICAgIGxjc3MrPWxvY2FsX2NzO1xuICAgICAgICAgICAgbG9jYWxfY3M9MDtcbiAgICAgICAgICAgIGMxPWMyPU1hdGgubWluKGMxLGMyKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBsY3NzKz1sb2NhbF9jcztcbiAgICByZXR1cm4gTWF0aC5yb3VuZChNYXRoLm1heChsMSxsMiktIGxjc3MgK3RyYW5zKTsgLy9hZGQgdGhlIGNvc3Qgb2YgdHJhbnNwb3NpdGlvbnMgdG8gdGhlIGZpbmFsIHJlc3VsdFxufVxuXG4qL1xuXG4vKipcbiAqIFRhbGlzbWFuIG1ldHJpY3MvZGlzdGFuY2UvamFyb1xuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICpcbiAqIEZ1bmN0aW9uIGNvbXB1dGluZyB0aGUgSmFybyBzY29yZS5cbiAqXG4gKiBbUmVmZXJlbmNlXTpcbiAqIGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0phcm8lRTIlODAlOTNXaW5rbGVyX2Rpc3RhbmNlXG4gKlxuICogW0FydGljbGVzXTpcbiAqIEphcm8sIE0uIEEuICgxOTg5KS4gXCJBZHZhbmNlcyBpbiByZWNvcmQgbGlua2FnZSBtZXRob2RvbG9neSBhcyBhcHBsaWVkIHRvXG4gKiB0aGUgMTk4NSBjZW5zdXMgb2YgVGFtcGEgRmxvcmlkYVwiLlxuICogSm91cm5hbCBvZiB0aGUgQW1lcmljYW4gU3RhdGlzdGljYWwgQXNzb2NpYXRpb24gODQgKDQwNik6IDQxNOKAkzIwXG4gKlxuICogSmFybywgTS4gQS4gKDE5OTUpLiBcIlByb2JhYmlsaXN0aWMgbGlua2FnZSBvZiBsYXJnZSBwdWJsaWMgaGVhbHRoIGRhdGEgZmlsZVwiLlxuICogU3RhdGlzdGljcyBpbiBNZWRpY2luZSAxNCAoNeKAkzcpOiA0OTHigJM4LlxuICpcbiAqIFtUYWdzXTogc2VtaW1ldHJpYywgc3RyaW5nIG1ldHJpYy5cbiAqL1xuXG5cbi8qKlxuICogRnVuY3Rpb24gY3JlYXRpbmcgYSB2ZWN0b3Igb2YgbiBkaW1lbnNpb25zIGFuZCBmaWxsaW5nIGl0IHdpdGggYSBzaW5nbGVcbiAqIHZhbHVlIGlmIHJlcXVpcmVkLlxuICpcbiAqIEBwYXJhbSAge251bWJlcn0gbiAgICAtIERpbWVuc2lvbnMgb2YgdGhlIHZlY3RvciB0byBjcmVhdGUuXG4gKiBAcGFyYW0gIHttaXhlZH0gIGZpbGwgLSBWYWx1ZSB0byBiZSB1c2VkIHRvIGZpbGwgdGhlIHZlY3Rvci5cbiAqIEByZXR1cm4ge2FycmF5fSAgICAgICAtIFRoZSByZXN1bHRpbmcgdmVjdG9yLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdmVjKG4sIGZpbGwpIHtcbiAgY29uc3QgdmVjdG9yID0gbmV3IEFycmF5KG4pO1xuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSsrKVxuICAgICAgdmVjdG9yW2ldID0gZmlsbDtcbiAgfVxuICByZXR1cm4gdmVjdG9yO1xufVxuXG5cbi8qKlxuICogRnVuY3Rpb24gcmV0dXJuaW5nIHRoZSBKYXJvIHNjb3JlIGJldHdlZW4gdHdvIHNlcXVlbmNlcy5cbiAqXG4gKiBAcGFyYW0gIHttaXhlZH0gIGEgICAgIC0gVGhlIGZpcnN0IHNlcXVlbmNlLlxuICogQHBhcmFtICB7bWl4ZWR9ICBiICAgICAtIFRoZSBzZWNvbmQgc2VxdWVuY2UuXG4gKiBAcmV0dXJuIHtudW1iZXJ9ICAgICAgIC0gVGhlIEphcm8gc2NvcmUgYmV0d2VlbiBhICYgYi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRhbGlzbWFuX2phcm8oYSwgYikge1xuICAvLyBGYXN0IGJyZWFrXG4gIGlmIChhID09PSBiKVxuICAgIHJldHVybiAxO1xuXG4gIGxldCBtYXgsIG1pbjtcblxuICBpZiAoYS5sZW5ndGggPiBiLmxlbmd0aCkge1xuICAgIG1heCA9IGE7XG4gICAgbWluID0gYjtcbiAgfVxuICBlbHNlIHtcbiAgICBtYXggPSBiO1xuICAgIG1pbiA9IGE7XG4gIH1cblxuICAvLyBGaW5kaW5nIG1hdGNoZXNcbiAgY29uc3QgcmFuZ2UgPSBNYXRoLm1heCgoKG1heC5sZW5ndGggLyAyKSB8IDApIC0gMSwgMCksXG4gICAgICAgIGluZGV4ZXMgPSB2ZWMobWluLmxlbmd0aCwgLTEpLFxuICAgICAgICBmbGFncyA9IHZlYyhtYXgubGVuZ3RoLCBmYWxzZSk7XG5cbiAgbGV0IG1hdGNoZXMgPSAwO1xuXG4gIGZvciAobGV0IGkgPSAwLCBsID0gbWluLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGNvbnN0IGNoYXJhY3RlciA9IG1pbltpXSxcbiAgICAgICAgICB4aSA9IE1hdGgubWF4KGkgLSByYW5nZSwgMCksXG4gICAgICAgICAgeG4gPSBNYXRoLm1pbihpICsgcmFuZ2UgKyAxLCBtYXgubGVuZ3RoKTtcblxuICAgIGZvciAobGV0IGogPSB4aSwgbSA9IHhuOyBqIDwgbTsgaisrKSB7XG4gICAgICBpZiAoIWZsYWdzW2pdICYmIGNoYXJhY3RlciA9PT0gbWF4W2pdKSB7XG4gICAgICAgIGluZGV4ZXNbaV0gPSBqO1xuICAgICAgICBmbGFnc1tqXSA9IHRydWU7XG4gICAgICAgIG1hdGNoZXMrKztcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY29uc3QgbXMxID0gbmV3IEFycmF5KG1hdGNoZXMpLFxuICAgICAgICBtczIgPSBuZXcgQXJyYXkobWF0Y2hlcyk7XG5cbiAgbGV0IHNpO1xuXG4gIHNpID0gMDtcbiAgZm9yIChsZXQgaSA9IDAsIGwgPSBtaW4ubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKGluZGV4ZXNbaV0gIT09IC0xKSB7XG4gICAgICBtczFbc2ldID0gbWluW2ldO1xuICAgICAgc2krKztcbiAgICB9XG4gIH1cblxuICBzaSA9IDA7XG4gIGZvciAobGV0IGkgPSAwLCBsID0gbWF4Lmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGlmIChmbGFnc1tpXSkge1xuICAgICAgbXMyW3NpXSA9IG1heFtpXTtcbiAgICAgIHNpKys7XG4gICAgfVxuICB9XG5cbiAgbGV0IHRyYW5zcG9zaXRpb25zID0gMDtcbiAgZm9yIChsZXQgaSA9IDAsIGwgPSBtczEubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKG1zMVtpXSAhPT0gbXMyW2ldKVxuICAgICAgdHJhbnNwb3NpdGlvbnMrKztcbiAgfVxuXG4gIC8vIENvbXB1dGluZyB0aGUgZGlzdGFuY2VcbiAgaWYgKCFtYXRjaGVzKVxuICAgIHJldHVybiAwO1xuXG4gIGNvbnN0IHQgPSAodHJhbnNwb3NpdGlvbnMgLyAyKSB8IDAsXG4gICAgICAgIG0gPSBtYXRjaGVzO1xuXG4gIHJldHVybiAoKG0gLyBhLmxlbmd0aCkgKyAobSAvIGIubGVuZ3RoKSArICgobSAtIHQpIC8gbSkpIC8gMztcbn1cblxuLyoqXG4gKiBKYXJvIGRpc3RhbmNlIGlzIDEgLSB0aGUgSmFybyBzY29yZS5cbiAqL1xuLy9jb25zdCBkaXN0YW5jZSA9IChhLCBiKSA9PiAxIC0gamFybyhhLCBiKTtcblxuXG5cblxuLyoqXG4gKiBUYWxpc21hbiBtZXRyaWNzL2Rpc3RhbmNlL2phcm8td2lua2xlclxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKlxuICogRnVuY3Rpb24gY29tcHV0aW5nIHRoZSBKYXJvLVdpbmtsZXIgc2NvcmUuXG4gKlxuICogW1JlZmVyZW5jZV06XG4gKiBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9KYXJvJUUyJTgwJTkzV2lua2xlcl9kaXN0YW5jZVxuICpcbiAqIFtBcnRpY2xlXTpcbiAqIFdpbmtsZXIsIFcuIEUuICgxOTkwKS4gXCJTdHJpbmcgQ29tcGFyYXRvciBNZXRyaWNzIGFuZCBFbmhhbmNlZCBEZWNpc2lvbiBSdWxlc1xuICogaW4gdGhlIEZlbGxlZ2ktU3VudGVyIE1vZGVsIG9mIFJlY29yZCBMaW5rYWdlXCIuXG4gKiBQcm9jZWVkaW5ncyBvZiB0aGUgU2VjdGlvbiBvbiBTdXJ2ZXkgUmVzZWFyY2ggTWV0aG9kc1xuICogKEFtZXJpY2FuIFN0YXRpc3RpY2FsIEFzc29jaWF0aW9uKTogMzU04oCTMzU5LlxuICpcbiAqIFtUYWdzXTogc2VtaW1ldHJpYywgc3RyaW5nIG1ldHJpYy5cbiAqL1xuXG4vKipcbiAqIEphcm8tV2lua2xlciBzdGFuZGFyZCBmdW5jdGlvbi5cbiAqL1xuLy9leHBvcnQgY29uc3QgamFyb1dpbmtsZXIgPSBjdXN0b21KYXJvV2lua2xlci5iaW5kKG51bGwsIG51bGwpO1xuXG4vKipcbiAqIEphcm8tV2lua2xlciBkaXN0YW5jZSBpcyAxIC0gdGhlIEphcm8tV2lua2xlciBzY29yZS5cbiAqL1xuLy9jb25zdCBkaXN0YW5jZSA9IChhLCBiKSA9PiAxIC0gamFyb1dpbmtsZXIoYSwgYik7XG5cbi8qKlxuICogRXhwb3J0aW5nLlxuICovXG5cblxuLy8gQ29tcHV0ZXMgdGhlIFdpbmtsZXIgZGlzdGFuY2UgYmV0d2VlbiB0d28gc3RyaW5nIC0tIGludHJlcHJldGVkIGZyb206XG4vLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0phcm8lRTIlODAlOTNXaW5rbGVyX2Rpc3RhbmNlXG4vLyBzMSBpcyB0aGUgZmlyc3Qgc3RyaW5nIHRvIGNvbXBhcmVcbi8vIHMyIGlzIHRoZSBzZWNvbmQgc3RyaW5nIHRvIGNvbXBhcmVcbi8vIGRqIGlzIHRoZSBKYXJvIERpc3RhbmNlIChpZiB5b3UndmUgYWxyZWFkeSBjb21wdXRlZCBpdCksIGxlYXZlIGJsYW5rIGFuZCB0aGUgbWV0aG9kIGhhbmRsZXMgaXRcbmV4cG9ydCBmdW5jdGlvbiBqYXJvV2lua2xlckRpc3RhbmNlKHMxIDogc3RyaW5nLCBzMjogc3RyaW5nKSB7XG5cdFx0aWYgKHMxID09IHMyKSB7XG5cdFx0XHRcdHJldHVybiAxXG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdCAgICB2YXIgamFybyA9IHRhbGlzbWFuX2phcm8oczEsczIpO1xuICAgICAgICB2YXIgcCA9IDAuMTsgLy9cblx0XHQgICAgdmFyIGwgPSAwIC8vIGxlbmd0aCBvZiB0aGUgbWF0Y2hpbmcgcHJlZml4XG5cdFx0ICAgIHdoaWxlKHMxW2xdID09IHMyW2xdICYmIGwgPCA0KVxuXHRcdCAgICAgICAgbCsrO1xuXG5cdFx0ICAgIHJldHVybiBqYXJvICsgbCAqIHAgKiAoMSAtIGphcm8pO1xuXHRcdH1cbn1cblxuLypcblxuZnVuY3Rpb24gY250Q2hhcnMoc3RyIDogc3RyaW5nLCBsZW4gOiBudW1iZXIpIHtcbiAgdmFyIGNudCA9IDA7XG4gIGZvcih2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgIGNudCArPSAoc3RyLmNoYXJBdChpKSA9PT0gJ1gnKT8gMSA6IDA7XG4gIH1cbiAgcmV0dXJuIGNudDtcbn1cbiovXG5cbi8qKlxuICogQHBhcmFtIHNUZXh0IHtzdHJpbmd9IHRoZSB0ZXh0IHRvIG1hdGNoIHRvIE5hdlRhcmdldFJlc29sdXRpb25cbiAqIEBwYXJhbSBzVGV4dDIge3N0cmluZ30gdGhlIHF1ZXJ5IHRleHQsIGUuZy4gTmF2VGFyZ2V0XG4gKlxuICogQHJldHVybiB0aGUgZGlzdGFuY2UsIG5vdGUgdGhhdCBpcyBpcyAqbm90KiBzeW1tZXRyaWMhXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYWxjRGlzdGFuY2Uoc1RleHQxOiBzdHJpbmcsIHNUZXh0Mjogc3RyaW5nKTogbnVtYmVyIHtcbiAgLy8gY29uc29sZS5sb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxuICB2YXIgczFsZW4gPSBzVGV4dDEubGVuZ3RoO1xuICB2YXIgczJsZW4gPSBzVGV4dDIubGVuZ3RoO1xuICB2YXIgbWluID0gTWF0aC5taW4oczFsZW4sczJsZW4pO1xuICBpZihNYXRoLmFicyhzMWxlbiAtIHMybGVuKSA+IG1pbikge1xuICAgIHJldHVybiAwLjM7XG4gIH1cbiAgdmFyIGRpc3QgPSBqYXJvV2lua2xlckRpc3RhbmNlKHNUZXh0MSxzVGV4dDIpO1xuICAvKlxuICB2YXIgY250MSA9IGNudENoYXJzKHNUZXh0MSwgczFsZW4pO1xuICB2YXIgY250MiA9IGNudENoYXJzKHNUZXh0MiwgczJsZW4pO1xuICBpZihjbnQxICE9PSBjbnQyKSB7XG4gICAgZGlzdCA9IGRpc3QgKiAwLjc7XG4gIH1cbiAgKi9cbiAgcmV0dXJuIGRpc3Q7XG4gIC8qXG4gIHZhciBhMCA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCksIHNUZXh0MilcbiAgaWYoZGVidWdsb2dWLmVuYWJsZWQpIHtcbiAgICBkZWJ1Z2xvZ1YoXCJkaXN0YW5jZVwiICsgYTAgKyBcInN0cmlwcGVkPlwiICsgc1RleHQxLnN1YnN0cmluZygwLHNUZXh0Mi5sZW5ndGgpICsgXCI8PlwiICsgc1RleHQyKyBcIjxcIik7XG4gIH1cbiAgaWYoYTAgKiA1MCA+IDE1ICogc1RleHQyLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIDQwMDAwO1xuICB9XG4gIHZhciBhID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLCBzVGV4dDIpXG4gIHJldHVybiBhMCAqIDUwMCAvIHNUZXh0Mi5sZW5ndGggKyBhXG4gICovXG59XG5cbi8qXG52YXIgZmFjQWRqdXN0RGlzdGFuY2UgPSBbXTtcbnZhciB1ID0gXCJhXCI7XG5mb3IodmFyIGkgPSAyOyBpIDwgMTU7ICsraSkge1xuICB2YXIgdW4gPSB1ICsgU3RyaW5nLmZyb21DaGFyQ29kZSgnQScuY2hhckNvZGVBdCgwKSArIGkgKyAxICk7XG4gIGNvbnNvbGUubG9nKHVuKTtcbiAgZmFjQWRqdXN0RGlzdGFuY2VbdS5sZW5ndGhdID0gKDEtMC45ODAxMDAwKS8gKDEuMCAtIGNhbGNEaXN0YW5jZSh1LHVuKSk7XG4gIHUgPSB1bjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNEaXN0YW5jZUFkanVzdGVkMihhOiBzdHJpbmcsIGI6c3RyaW5nKSA6IG51bWJlciB7XG4gIHZhciBkaXN0ID0gY2FsY0Rpc3RhbmNlKGEsYik7XG4gIHZhciBtbCA9IE1hdGgubWluKGEubGVuZ3RoLCBiLmxlbmd0aCk7XG4gIGlmKGRpc3QgPCAxLjAgJiYgKG1sIDwgMTUpICYmICAobWwgPiAyKSkge1xuICAgICAgcmV0dXJuIDEuMCAgLSAgKDEuMC0gZGlzdCkgKiBmYWNBZGp1c3REaXN0YW5jZVttbF07XG4gIH1cbiAgcmV0dXJuIGRpc3Q7XG59XG4qL1xuXG4vKipcbiAqIFRoZSBhZGp1c3RtZW50IGlzIGNob3NlbiBpbiB0aGUgZm9sbG93aW5nIHdheSxcbiAqIGEgc2luZ2xlIFwiYWRkZWRcIiBjaGFyYWN0ZXIgYXQgdGhlIGVuZCBvZiB0aGUgc3RyaW5nIGZpdHNcbiAqIGlzIFwibGlmdGVkIGF0IGxlbmd0aCA1XCIgdG8gMC45OFxuICogICAxLjY2NSA9ICAoIDEgLSBjYWxjRGlzdGFuY2UoJ2FiY2RlJywnYWJjZGVfJykpIC8gMC45OFxuICpcbiAqIFRoZSBmdW5jdGlvbiBpcyBzbW9vdGhseSB0byBtZXJnZSBhdCBsZW5ndGggMjA7XG4gKiAgIGZhYyA9KCgyMC1sZW4pLygxNSkpKjAuNjY1ICsxXG4gKiAgIHJlcyA9IDEtICgxLWQpL2ZhYztcbiAqL1xuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNEaXN0YW5jZUFkanVzdGVkKGE6IHN0cmluZywgYjpzdHJpbmcpIDogbnVtYmVyIHtcbiAgdmFyIGRpc3QgPSBjYWxjRGlzdGFuY2UoYSxiKTtcbiAgdmFyIG1sID0gTWF0aC5taW4oYS5sZW5ndGgsIGIubGVuZ3RoKTtcbiAgaWYoZGlzdCA8IDEuMCAmJiAobWwgPCAyMCkpIHtcbiAgICAgIHZhciBmYWMgPSAgMSArICgwLjY2NS8xNS4wKSooMjAtbWwpO1xuICAgICAgcmV0dXJuIDEuMCAgLSAgKDEuMCAtIGRpc3QpIC9mYWM7XG4gIH1cbiAgcmV0dXJuIGRpc3Q7XG59XG5cbi8qXG5cbmZ1bmN0aW9uIGdldENoYXJBdChzdHIsIG4pIHtcbiAgaWYoc3RyLmxlbmd0aCA+IG4pIHtcbiAgICByZXR1cm4gc3RyLmNoYXJBdChuKTtcbiAgfVxuICByZXR1cm4gJyc7XG59XG5cbmZ1bmN0aW9uIGdldEhlYWQoc3RyLHUpIHtcbiAgdSA9IE1hdGgubWluKHN0ci5sZW5ndGgsIHUpO1xuICB1ID0gTWF0aC5tYXgoMCx1KTtcbiAgcmV0dXJuIHN0ci5zdWJzdHJpbmcoMCx1KTtcbn1cblxuZnVuY3Rpb24gZ2V0VGFpbChzdHIscCkge1xuICByZXR1cm4gc3RyLnN1YnN0cmluZyhwKTtcbn1cblxudmFyIHN0cnMgPSBbXCJBXCJdO1xudmFyIHUgPSBcIkFcIjtcbmZvcih2YXIgaSA9IDE7IGkgPCAyNTsgKytpKSB7XG4gIHZhciB1biA9IHUgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKCdBJy5jaGFyQ29kZUF0KDApICsgaSApO1xuICBzdHJzW3VuLmxlbmd0aC0xXSA9IHVuO1xuICBjb25zb2xlLmxvZyh1bik7XG4gIGZhY0FkanVzdERpc3RhbmNlW3UubGVuZ3RoXSA9ICgxLTAuOTgwMTAwMCkvICgxLjAgLSBjYWxjRGlzdGFuY2UodSx1bikpO1xuICB1ID0gdW47XG59XG5cbnZhciByZXMgPSBbXTtcblxudmFyIHJlczIgPSBbXTtcbmZvcih2YXIgaSA9IDE7IGkgPCBzdHJzLmxlbmd0aDsgKytpKSB7XG4gIHZhciBzdHIgPSBzdHJzW2ldO1xuICB2YXIgbmMgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKCdhJy5jaGFyQ29kZUF0KDApICsgMippICsgMiApO1xuICB2YXIgbmMgPSAnXyc7XG4gIHZhciBhZGRUYWlsID0gc3RyICArIG5jO1xuICB2YXIgYWRkRnJvbnQgPSBuYyArIHN0cjtcbiAgdmFyIG5jMiA9ICcvJzsgLy9TdHJpbmcuZnJvbUNoYXJDb2RlKCdhJy5jaGFyQ29kZUF0KDApICsgMippICsgMyApO1xuXG4gIHZhciBkaWZmTWlkID0gZ2V0SGVhZChzdHIsTWF0aC5mbG9vcihzdHIubGVuZ3RoLzIpKSAgKyBuYyAgKyBnZXRUYWlsKHN0ciwgTWF0aC5mbG9vcihzdHIubGVuZ3RoLzIpKzEpO1xuICB2YXIgZGlmZk1pZDIgPSBzdHJzW2ldLnN1YnN0cmluZygwLCBNYXRoLmZsb29yKHN0ci5sZW5ndGgvMiktMSkgKyBuYyArIG5jMiArIGdldFRhaWwoc3RyLE1hdGguZmxvb3Ioc3RyLmxlbmd0aC8yKSsxKTtcbiAgdmFyIGRpZmZFbmQgPSBzdHJzW2ldLnN1YnN0cmluZygwLCBzdHJzW2ldLmxlbmd0aCAtIDEpICsgbmM7XG4gIHZhciBkaWZmU3RhcnQgPSBuYyArIHN0cnNbaV0uc3Vic3RyaW5nKDEpO1xuICB2YXIgc3dhcEZyb250ID0gc3RyLnN1YnN0cmluZygwLDIpICsgZ2V0Q2hhckF0KHN0ciwzKSArIGdldENoYXJBdChzdHIsMikgKyBzdHIuc3Vic3RyaW5nKDQpO1xuICB2YXIgc3dhcE1pZCA9IGdldEhlYWQoc3RyLCBNYXRoLmZsb29yKHN0ci5sZW5ndGgvMiktMSkgICsgZ2V0Q2hhckF0KHN0cixNYXRoLmZsb29yKHN0ci5sZW5ndGgvMikpICsgZ2V0Q2hhckF0KHN0cixNYXRoLmZsb29yKHN0ci5sZW5ndGgvMiktMSkgICsgZ2V0VGFpbChzdHIsTWF0aC5mbG9vcihzdHIubGVuZ3RoLzIpKzEpO1xuICB2YXIgc3dhcEVuZCA9IGdldEhlYWQoc3RyLCBzdHIubGVuZ3RoIC0gMikgKyBnZXRDaGFyQXQoc3RyLHN0ci5sZW5ndGgtMSkgKyBnZXRDaGFyQXQoc3RyLHN0ci5sZW5ndGgtMik7XG5cbiAgdmFyIHIgPSBbZGlmZlN0YXJ0LCBkaWZmTWlkLCBkaWZmRW5kLCBhZGRGcm9udCwgYWRkVGFpbCwgZGlmZk1pZDIsIHN3YXBGcm9udCwgc3dhcE1pZCwgc3dhcEVuZCBdO1xuICBjb25zb2xlLmxvZygnKioqKlxcbicgKyBzdHIgKydcXG4nICsgci5qb2luKFwiXFxuXCIpKTtcbiAgaWYoIGkgPT09IDEpIHtcbiAgICByZXMucHVzaChgaVxcdGRpZmZTdGFydFxcdGRpZmZNaWRcXHRkaWZmRW5kXFx0YWRkRnJvbnRcXHRhZGRUYWlsXFx0ZGlmZk1pZDJcXHRzd2FwRnJvbnRcXHRzd2FwTWlkXFx0c3dhcEVuZFxcbmApO1xuICAgIHJlczIucHVzaChgaVxcdGRpZmZTdGFydFxcdGRpZmZNaWRcXHRkaWZmRW5kXFx0YWRkRnJvbnRcXHRhZGRUYWlsXFx0ZGlmZk1pZDJcXHRzd2FwRnJvbnRcXHRzd2FwTWlkXFx0c3dhcEVuZFxcbmApO1xuICB9XG4gIHJlcy5wdXNoKGAke3N0ci5sZW5ndGh9XFx0YCArIHIubWFwKHMgPT4gY2FsY0Rpc3RhbmNlKHN0cixzKS50b0ZpeGVkKDQpKS5qb2luKFwiXFx0XCIpICsgJ1xcbicpO1xuICByZXMyLnB1c2goYCR7c3RyLmxlbmd0aH1cXHRgICsgci5tYXAocyA9PiBjYWxjRGlzdGFuY2VBZGp1c3RlZChzdHIscykudG9GaXhlZCg0KSkuam9pbihcIlxcdFwiKSArICdcXG4nKTtcbn1cblxuXG5jb25zb2xlLmxvZyhyZXMuam9pbignJykpO1xuXG5jb25zb2xlLmxvZygnLS0tJyk7XG5jb25zb2xlLmxvZyhyZXMyLmpvaW4oJycpKTtcblxudmFyIGZzID0gcmVxdWlyZSgnZnMnKTtcbmZzLndyaXRlRmlsZVN5bmMoJ2xldmVuLnR4dCcsIHJlcy5qb2luKCcnKSArICdcXG4nICsgcmVzMi5qb2luKCcnKSk7XG5cbiovXG5cblxuXG5cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
