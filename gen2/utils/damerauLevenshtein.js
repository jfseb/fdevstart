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
    //return sift4(a,b,10,40); // + b.length / 2);
    return levenshteinDamerau(a, b);
}
exports.levenshtein = levenshtein;
//  Sift4 - common version
// https://siderite.blogspot.com/2014/11/super-fast-and-accurate-string-distance.html
// online algorithm to compute the distance between two strings in O(n)
// maxOffset is the number of characters to search for matching letters
// maxDistance is the distance at which the algorithm should stop computing the value and just exit (the strings are too different anyway)
function sift4(s1, s2, maxOffset, maxDistance) {
    if (!s1 || !s1.length) {
        if (!s2) {
            return 0;
        }
        return s2.length;
    }
    if (!s2 || !s2.length) {
        return s1.length;
    }
    var l1 = s1.length;
    var l2 = s2.length;
    if (Math.abs(l1 - l2) > maxDistance) {
        return 50000;
    }
    var c1 = 0; //cursor for string 1
    var c2 = 0; //cursor for string 2
    var lcss = 0; //largest common subsequence
    var local_cs = 0; //local common substring
    var trans = 0; //number of transpositions ('ab' vs 'ba')
    var offset_arr = []; //offset pair array, for computing the transpositions
    while (c1 < l1 && c2 < l2) {
        if (s1.charAt(c1) == s2.charAt(c2)) {
            local_cs++;
            var isTrans = false;
            //see if current match is a transposition
            var i = 0;
            while (i < offset_arr.length) {
                var ofs = offset_arr[i];
                if (c1 <= ofs.c1 || c2 <= ofs.c2) {
                    // when two matches cross, the one considered a transposition is the one with the largest difference in offsets
                    isTrans = Math.abs(c2 - c1) >= Math.abs(ofs.c2 - ofs.c1);
                    if (isTrans) {
                        trans++;
                    } else {
                        if (!ofs.trans) {
                            ofs.trans = true;
                            trans++;
                        }
                    }
                    break;
                } else {
                    if (c1 > ofs.c2 && c2 > ofs.c1) {
                        offset_arr.splice(i, 1);
                    } else {
                        i++;
                    }
                }
            }
            offset_arr.push({
                c1: c1,
                c2: c2,
                trans: isTrans
            });
        } else {
            lcss += local_cs;
            local_cs = 0;
            if (c1 != c2) {
                c1 = c2 = Math.min(c1, c2); //using min allows the computation of transpositions
            }
            //if matching characters are found, remove 1 from both cursors (they get incremented at the end of the loop)
            //so that we can have only one code block handling matches
            for (var i = 0; i < maxOffset && (c1 + i < l1 || c2 + i < l2); i++) {
                if (c1 + i < l1 && s1.charAt(c1 + i) == s2.charAt(c2)) {
                    c1 += i - 1;
                    c2--;
                    break;
                }
                if (c2 + i < l2 && s1.charAt(c1) == s2.charAt(c2 + i)) {
                    c1--;
                    c2 += i - 1;
                    break;
                }
            }
        }
        c1++;
        c2++;
        if (maxDistance) {
            var temporaryDistance = Math.max(c1, c2) - lcss + trans;
            if (temporaryDistance >= maxDistance) return 50000; // Math.round(temporaryDistance);
        }
        // this covers the case where the last match is on the last token in list, so that it can compute transpositions correctly
        if (c1 >= l1 || c2 >= l2) {
            lcss += local_cs;
            local_cs = 0;
            c1 = c2 = Math.min(c1, c2);
        }
    }
    lcss += local_cs;
    return Math.round(Math.max(l1, l2) - lcss + trans); //add the cost of transpositions to the final result
}
exports.sift4 = sift4;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4udHMiXSwibmFtZXMiOlsibGV2ZW5zaHRlaW5EYW1lcmF1IiwiYSIsImIiLCJpIiwiaiIsImNvc3QiLCJkIiwibGVuZ3RoIiwiY2hhckF0IiwiTWF0aCIsIm1pbiIsImV4cG9ydHMiLCJsZXZlbnNodGVpbiIsInNpZnQ0IiwiczEiLCJzMiIsIm1heE9mZnNldCIsIm1heERpc3RhbmNlIiwibDEiLCJsMiIsImFicyIsImMxIiwiYzIiLCJsY3NzIiwibG9jYWxfY3MiLCJ0cmFucyIsIm9mZnNldF9hcnIiLCJpc1RyYW5zIiwib2ZzIiwic3BsaWNlIiwicHVzaCIsInRlbXBvcmFyeURpc3RhbmNlIiwibWF4Iiwicm91bmQiXSwibWFwcGluZ3MiOiJBQUFBO0FBRUE7QUFDQTtBQUdBOzs7O0FBS0E7Ozs7Ozs7Ozs7QUFTQSxTQUFBQSxrQkFBQSxDQUFvQ0MsQ0FBcEMsRUFBZ0RDLENBQWhELEVBQTBEO0FBQ3hELFFBQUlDLENBQUo7QUFDQSxRQUFJQyxDQUFKO0FBQ0EsUUFBSUMsSUFBSjtBQUNBLFFBQUlDLElBQUksRUFBUjtBQUNBLFFBQUlMLEVBQUVNLE1BQUYsS0FBYSxDQUFqQixFQUFvQjtBQUNsQixlQUFPTCxFQUFFSyxNQUFUO0FBQ0Q7QUFDRCxRQUFJTCxFQUFFSyxNQUFGLEtBQWEsQ0FBakIsRUFBb0I7QUFDbEIsZUFBT04sRUFBRU0sTUFBVDtBQUNEO0FBQ0QsU0FBS0osSUFBSSxDQUFULEVBQVlBLEtBQUtGLEVBQUVNLE1BQW5CLEVBQTJCSixHQUEzQixFQUFnQztBQUM5QkcsVUFBR0gsQ0FBSCxJQUFTLEVBQVQ7QUFDQUcsVUFBR0gsQ0FBSCxFQUFRLENBQVIsSUFBY0EsQ0FBZDtBQUNEO0FBQ0QsU0FBS0MsSUFBSSxDQUFULEVBQVlBLEtBQUtGLEVBQUVLLE1BQW5CLEVBQTJCSCxHQUEzQixFQUFnQztBQUM5QkUsVUFBRyxDQUFILEVBQVFGLENBQVIsSUFBY0EsQ0FBZDtBQUNEO0FBQ0Qs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Iiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnXHJcblxyXG4vLyBiYXNlZCBvbjogaHR0cDovL2VuLndpa2lib29rcy5vcmcvd2lraS9BbGdvcml0aG1faW1wbGVtZW50YXRpb24vU3RyaW5ncy9MZXZlbnNodGVpbl9kaXN0YW5jZVxyXG4vLyBhbmQ6ICBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0RhbWVyYXUlRTIlODAlOTNMZXZlbnNodGVpbl9kaXN0YW5jZVxyXG5cclxuXHJcbi8qKlxyXG4gKiBEaXN0YW5jZSBvZiBzdHJpbmdzIGFsZ29yaXRobVxyXG4gKiBAbW9kdWxlIGZzZGV2c3RhcnQudXRpbHMuZGFtZXJhdUxldmVuc2h0ZWluXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIGEgZnVuY3Rpb24gY2FsY3VsYXRpbmcgZGlzdGFuY2UgYmV0d2VlbiB0d28gc3RyaW5nc1xyXG4gKiBhY2NvcmRpbmcgdG8gdGhlIGRhbWVyYXUgTGV2ZW5zaHRlaW4gYWxnb3JpdGhtXHJcbiAqICh0aGlzIGFsZ29yaXRobSwgaW4gY29udHJhc3QgdG8gcGxhaW4gbGV2ZW5zaHRlaW4gdHJlYXRzXHJcbiAqIHN3YXBwaW5nIG9mIGNoYXJhY3RlcnMgYSBkaXN0YW5jZSAxICBcIndvcmRcIiAgPC0+IFwid3JvZCApXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBhXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBiXHJcbiAqIEBwdWJsaWNcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBsZXZlbnNodGVpbkRhbWVyYXUgKGEgOiBzdHJpbmcsIGIgOiBzdHJpbmcpIHtcclxuICB2YXIgaSA6IG51bWJlclxyXG4gIHZhciBqIDogbnVtYmVyXHJcbiAgdmFyIGNvc3QgOiBudW1iZXJcclxuICB2YXIgZCA9IFtdXHJcbiAgaWYgKGEubGVuZ3RoID09PSAwKSB7XHJcbiAgICByZXR1cm4gYi5sZW5ndGhcclxuICB9XHJcbiAgaWYgKGIubGVuZ3RoID09PSAwKSB7XHJcbiAgICByZXR1cm4gYS5sZW5ndGhcclxuICB9XHJcbiAgZm9yIChpID0gMDsgaSA8PSBhLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBkWyBpIF0gPSBbXVxyXG4gICAgZFsgaSBdWyAwIF0gPSBpXHJcbiAgfVxyXG4gIGZvciAoaiA9IDA7IGogPD0gYi5sZW5ndGg7IGorKykge1xyXG4gICAgZFsgMCBdWyBqIF0gPSBqXHJcbiAgfVxyXG4gIGZvciAoaSA9IDE7IGkgPD0gYS5sZW5ndGg7IGkrKykge1xyXG4gICAgZm9yIChqID0gMTsgaiA8PSBiLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgIGlmIChhLmNoYXJBdChpIC0gMSkgPT09IGIuY2hhckF0KGogLSAxKSkge1xyXG4gICAgICAgIGNvc3QgPSAwXHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY29zdCA9IDFcclxuICAgICAgfVxyXG5cclxuICAgICAgZFsgaSBdWyBqIF0gPSBNYXRoLm1pbihkWyBpIC0gMSBdWyBqIF0gKyAxLCBkWyBpIF1bIGogLSAxIF0gKyAxLCBkWyBpIC0gMSBdWyBqIC0gMSBdICsgY29zdClcclxuXHJcbiAgICAgIGlmIChcclxuXHJcbiAgICAgICAgaSA+IDEgJiZcclxuXHJcbiAgICAgICAgaiA+IDEgJiZcclxuXHJcbiAgICAgICAgYS5jaGFyQXQoaSAtIDEpID09PSBiLmNoYXJBdChqIC0gMikgJiZcclxuXHJcbiAgICAgICAgYS5jaGFyQXQoaSAtIDIpID09PSBiLmNoYXJBdChqIC0gMSlcclxuXHJcbiAgICAgICkge1xyXG4gICAgICAgIGRbaV1bal0gPSBNYXRoLm1pbihcclxuXHJcbiAgICAgICAgICBkW2ldW2pdLFxyXG5cclxuICAgICAgICAgIGRbaSAtIDJdW2ogLSAyXSArIGNvc3RcclxuXHJcbiAgICAgICAgKVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gZFsgYS5sZW5ndGggXVsgYi5sZW5ndGggXVxyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGxldmVuc2h0ZWluIChhIDogc3RyaW5nLCBiIDogc3RyaW5nKSB7XHJcbiAgLy9yZXR1cm4gc2lmdDQoYSxiLDEwLDQwKTsgLy8gKyBiLmxlbmd0aCAvIDIpO1xyXG4gIHJldHVybiBsZXZlbnNodGVpbkRhbWVyYXUoYSxiKTtcclxufVxyXG4vLyAgU2lmdDQgLSBjb21tb24gdmVyc2lvblxyXG4vLyBodHRwczovL3NpZGVyaXRlLmJsb2dzcG90LmNvbS8yMDE0LzExL3N1cGVyLWZhc3QtYW5kLWFjY3VyYXRlLXN0cmluZy1kaXN0YW5jZS5odG1sXHJcbi8vIG9ubGluZSBhbGdvcml0aG0gdG8gY29tcHV0ZSB0aGUgZGlzdGFuY2UgYmV0d2VlbiB0d28gc3RyaW5ncyBpbiBPKG4pXHJcbi8vIG1heE9mZnNldCBpcyB0aGUgbnVtYmVyIG9mIGNoYXJhY3RlcnMgdG8gc2VhcmNoIGZvciBtYXRjaGluZyBsZXR0ZXJzXHJcbi8vIG1heERpc3RhbmNlIGlzIHRoZSBkaXN0YW5jZSBhdCB3aGljaCB0aGUgYWxnb3JpdGhtIHNob3VsZCBzdG9wIGNvbXB1dGluZyB0aGUgdmFsdWUgYW5kIGp1c3QgZXhpdCAodGhlIHN0cmluZ3MgYXJlIHRvbyBkaWZmZXJlbnQgYW55d2F5KVxyXG5leHBvcnQgZnVuY3Rpb24gc2lmdDQoczEsIHMyLCBtYXhPZmZzZXQsIG1heERpc3RhbmNlKSB7XHJcbiAgICBpZiAoIXMxfHwhczEubGVuZ3RoKSB7XHJcbiAgICAgICAgaWYgKCFzMikge1xyXG4gICAgICAgICAgICByZXR1cm4gMDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHMyLmxlbmd0aDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIXMyfHwhczIubGVuZ3RoKSB7XHJcbiAgICAgICAgcmV0dXJuIHMxLmxlbmd0aDtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgbDE9czEubGVuZ3RoO1xyXG4gICAgdmFyIGwyPXMyLmxlbmd0aDtcclxuICAgIGlmKE1hdGguYWJzKGwxIC0gbDIpID4gbWF4RGlzdGFuY2UpIHtcclxuICAgICAgcmV0dXJuIDUwMDAwO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBjMSA9IDA7ICAvL2N1cnNvciBmb3Igc3RyaW5nIDFcclxuICAgIHZhciBjMiA9IDA7ICAvL2N1cnNvciBmb3Igc3RyaW5nIDJcclxuICAgIHZhciBsY3NzID0gMDsgIC8vbGFyZ2VzdCBjb21tb24gc3Vic2VxdWVuY2VcclxuICAgIHZhciBsb2NhbF9jcyA9IDA7IC8vbG9jYWwgY29tbW9uIHN1YnN0cmluZ1xyXG4gICAgdmFyIHRyYW5zID0gMDsgIC8vbnVtYmVyIG9mIHRyYW5zcG9zaXRpb25zICgnYWInIHZzICdiYScpXHJcbiAgICB2YXIgb2Zmc2V0X2Fycj1bXTsgIC8vb2Zmc2V0IHBhaXIgYXJyYXksIGZvciBjb21wdXRpbmcgdGhlIHRyYW5zcG9zaXRpb25zXHJcblxyXG4gICAgd2hpbGUgKChjMSA8IGwxKSAmJiAoYzIgPCBsMikpIHtcclxuICAgICAgICBpZiAoczEuY2hhckF0KGMxKSA9PSBzMi5jaGFyQXQoYzIpKSB7XHJcbiAgICAgICAgICAgIGxvY2FsX2NzKys7XHJcbiAgICAgICAgICAgIHZhciBpc1RyYW5zPWZhbHNlO1xyXG4gICAgICAgICAgICAvL3NlZSBpZiBjdXJyZW50IG1hdGNoIGlzIGEgdHJhbnNwb3NpdGlvblxyXG4gICAgICAgICAgICB2YXIgaT0wO1xyXG4gICAgICAgICAgICB3aGlsZSAoaTxvZmZzZXRfYXJyLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIG9mcz1vZmZzZXRfYXJyW2ldO1xyXG4gICAgICAgICAgICAgICAgaWYgKGMxPD1vZnMuYzEgfHwgYzIgPD0gb2ZzLmMyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gd2hlbiB0d28gbWF0Y2hlcyBjcm9zcywgdGhlIG9uZSBjb25zaWRlcmVkIGEgdHJhbnNwb3NpdGlvbiBpcyB0aGUgb25lIHdpdGggdGhlIGxhcmdlc3QgZGlmZmVyZW5jZSBpbiBvZmZzZXRzXHJcbiAgICAgICAgICAgICAgICAgICAgaXNUcmFucz1NYXRoLmFicyhjMi1jMSk+PU1hdGguYWJzKG9mcy5jMi1vZnMuYzEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1RyYW5zKVxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnMrKztcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghb2ZzLnRyYW5zKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvZnMudHJhbnM9dHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zKys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjMT5vZnMuYzIgJiYgYzI+b2ZzLmMxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldF9hcnIuc3BsaWNlKGksMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBvZmZzZXRfYXJyLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgYzE6YzEsXHJcbiAgICAgICAgICAgICAgICBjMjpjMixcclxuICAgICAgICAgICAgICAgIHRyYW5zOmlzVHJhbnNcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbGNzcys9bG9jYWxfY3M7XHJcbiAgICAgICAgICAgIGxvY2FsX2NzPTA7XHJcbiAgICAgICAgICAgIGlmIChjMSE9YzIpIHtcclxuICAgICAgICAgICAgICAgIGMxPWMyPU1hdGgubWluKGMxLGMyKTsgIC8vdXNpbmcgbWluIGFsbG93cyB0aGUgY29tcHV0YXRpb24gb2YgdHJhbnNwb3NpdGlvbnNcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvL2lmIG1hdGNoaW5nIGNoYXJhY3RlcnMgYXJlIGZvdW5kLCByZW1vdmUgMSBmcm9tIGJvdGggY3Vyc29ycyAodGhleSBnZXQgaW5jcmVtZW50ZWQgYXQgdGhlIGVuZCBvZiB0aGUgbG9vcClcclxuICAgICAgICAgICAgLy9zbyB0aGF0IHdlIGNhbiBoYXZlIG9ubHkgb25lIGNvZGUgYmxvY2sgaGFuZGxpbmcgbWF0Y2hlc1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1heE9mZnNldCAmJiAoYzEraTxsMSB8fCBjMitpPGwyKTsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoKGMxICsgaSA8IGwxKSAmJiAoczEuY2hhckF0KGMxICsgaSkgPT0gczIuY2hhckF0KGMyKSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBjMSs9IGktMTtcclxuICAgICAgICAgICAgICAgICAgICBjMi0tO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKChjMiArIGkgPCBsMikgJiYgKHMxLmNoYXJBdChjMSkgPT0gczIuY2hhckF0KGMyICsgaSkpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYzEtLTtcclxuICAgICAgICAgICAgICAgICAgICBjMis9IGktMTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBjMSsrO1xyXG4gICAgICAgIGMyKys7XHJcbiAgICAgICAgaWYgKG1heERpc3RhbmNlKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgdmFyIHRlbXBvcmFyeURpc3RhbmNlPU1hdGgubWF4KGMxLGMyKS1sY3NzK3RyYW5zO1xyXG4gICAgICAgICAgICBpZiAodGVtcG9yYXJ5RGlzdGFuY2U+PW1heERpc3RhbmNlKSByZXR1cm4gNTAwMDA7IC8vIE1hdGgucm91bmQodGVtcG9yYXJ5RGlzdGFuY2UpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyB0aGlzIGNvdmVycyB0aGUgY2FzZSB3aGVyZSB0aGUgbGFzdCBtYXRjaCBpcyBvbiB0aGUgbGFzdCB0b2tlbiBpbiBsaXN0LCBzbyB0aGF0IGl0IGNhbiBjb21wdXRlIHRyYW5zcG9zaXRpb25zIGNvcnJlY3RseVxyXG4gICAgICAgIGlmICgoYzEgPj0gbDEpIHx8IChjMiA+PSBsMikpIHtcclxuICAgICAgICAgICAgbGNzcys9bG9jYWxfY3M7XHJcbiAgICAgICAgICAgIGxvY2FsX2NzPTA7XHJcbiAgICAgICAgICAgIGMxPWMyPU1hdGgubWluKGMxLGMyKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBsY3NzKz1sb2NhbF9jcztcclxuICAgIHJldHVybiBNYXRoLnJvdW5kKE1hdGgubWF4KGwxLGwyKS0gbGNzcyArdHJhbnMpOyAvL2FkZCB0aGUgY29zdCBvZiB0cmFuc3Bvc2l0aW9ucyB0byB0aGUgZmluYWwgcmVzdWx0XHJcbn1cclxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
