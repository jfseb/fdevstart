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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4udHMiXSwibmFtZXMiOlsibGV2ZW5zaHRlaW5EYW1lcmF1IiwiYSIsImIiLCJpIiwiaiIsImNvc3QiLCJkIiwibGVuZ3RoIiwiY2hhckF0IiwiTWF0aCIsIm1pbiIsImV4cG9ydHMiLCJsZXZlbnNodGVpbiIsInNpZnQzRGlzdGFuY2UiLCJzMSIsInMyIiwiYWJzIiwibWF4IiwiYyIsIm9mZnNldDEiLCJvZmZzZXQyIiwibGNzIiwibWF4T2Zmc2V0Il0sIm1hcHBpbmdzIjoiQUFBQTtBQUVBO0FBQ0E7QUFHQTs7OztBQUtBOzs7Ozs7Ozs7O0FBU0EsU0FBQUEsa0JBQUEsQ0FBb0NDLENBQXBDLEVBQWdEQyxDQUFoRCxFQUEwRDtBQUN4RCxRQUFJQyxDQUFKO0FBQ0EsUUFBSUMsQ0FBSjtBQUNBLFFBQUlDLElBQUo7QUFDQSxRQUFJQyxJQUFJLEVBQVI7QUFDQSxRQUFJTCxFQUFFTSxNQUFGLEtBQWEsQ0FBakIsRUFBb0I7QUFDbEIsZUFBT0wsRUFBRUssTUFBVDtBQUNEO0FBQ0QsUUFBSUwsRUFBRUssTUFBRixLQUFhLENBQWpCLEVBQW9CO0FBQ2xCLGVBQU9OLEVBQUVNLE1BQVQ7QUFDRDtBQUNELFNBQUtKLElBQUksQ0FBVCxFQUFZQSxLQUFLRixFQUFFTSxNQUFuQixFQUEyQkosR0FBM0IsRUFBZ0M7QUFDOUJHLFVBQUdILENBQUgsSUFBUyxFQUFUO0FBQ0FHLFVBQUdILENBQUgsRUFBUSxDQUFSLElBQWNBLENBQWQ7QUFDRDtBQUNELFNBQUtDLElBQUksQ0FBVCxFQUFZQSxLQUFLRixFQUFFSyxNQUFuQixFQUEyQkgsR0FBM0IsRUFBZ0M7QUFDOUJFLFVBQUcsQ0FBSCxFQUFRRixDQUFSLElBQWNBLENBQWQ7QUFDRDtBQUNELFNBQUtELElBQUksQ0FBVCxFQUFZQSxLQUFLRixFQUFFTSxNQUFuQixFQUEyQkosR0FBM0IsRUFBZ0M7QUFDOUIsYUFBS0MsSUFBSSxDQUFULEVBQVlBLEtBQUtGLEVB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LENBQUosR0FBUVcsR0FBR1AsTUFBWixJQUF3Qk8sR0FBR04sTUFBSCxDQUFVVSxJQUFJZixDQUFkLEtBQW9CWSxHQUFHUCxNQUFILENBQVVVLENBQVYsQ0FBaEQsRUFBK0Q7QUFDM0RDLDhCQUFVaEIsQ0FBVjtBQUNBO0FBQ0g7QUFDRCxvQkFBS2UsSUFBSWYsQ0FBSixHQUFRWSxHQUFHUixNQUFaLElBQXdCTyxHQUFHTixNQUFILENBQVVVLENBQVYsS0FBZ0JILEdBQUdQLE1BQUgsQ0FBVVUsSUFBSWYsQ0FBZCxDQUE1QyxFQUErRDtBQUMzRGlCLDhCQUFVakIsQ0FBVjtBQUNBO0FBQ0g7QUFDSjtBQUNKO0FBQ0RlO0FBQ0g7QUFDRCxXQUFPLENBQUNKLEdBQUdQLE1BQUgsR0FBWVEsR0FBR1IsTUFBaEIsSUFBMEIsQ0FBMUIsR0FBOEJjLEdBQXJDO0FBQ0g7QUExQ2VWLFFBQUFFLGFBQUEsR0FBYUEsYUFBYjtBQTRDaEIiLCJmaWxlIjoidXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnXHJcblxyXG4vLyBiYXNlZCBvbjogaHR0cDovL2VuLndpa2lib29rcy5vcmcvd2lraS9BbGdvcml0aG1faW1wbGVtZW50YXRpb24vU3RyaW5ncy9MZXZlbnNodGVpbl9kaXN0YW5jZVxyXG4vLyBhbmQ6ICBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0RhbWVyYXUlRTIlODAlOTNMZXZlbnNodGVpbl9kaXN0YW5jZVxyXG5cclxuXHJcbi8qKlxyXG4gKiBEaXN0YW5jZSBvZiBzdHJpbmdzIGFsZ29yaXRobVxyXG4gKiBAbW9kdWxlIGZzZGV2c3RhcnQudXRpbHMuZGFtZXJhdUxldmVuc2h0ZWluXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIGEgZnVuY3Rpb24gY2FsY3VsYXRpbmcgZGlzdGFuY2UgYmV0d2VlbiB0d28gc3RyaW5nc1xyXG4gKiBhY2NvcmRpbmcgdG8gdGhlIGRhbWVyYXUgTGV2ZW5zaHRlaW4gYWxnb3JpdGhtXHJcbiAqICh0aGlzIGFsZ29yaXRobSwgaW4gY29udHJhc3QgdG8gcGxhaW4gbGV2ZW5zaHRlaW4gdHJlYXRzXHJcbiAqIHN3YXBwaW5nIG9mIGNoYXJhY3RlcnMgYSBkaXN0YW5jZSAxICBcIndvcmRcIiAgPC0+IFwid3JvZCApXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBhXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBiXHJcbiAqIEBwdWJsaWNcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBsZXZlbnNodGVpbkRhbWVyYXUgKGEgOiBzdHJpbmcsIGIgOiBzdHJpbmcpIHtcclxuICB2YXIgaSA6IG51bWJlclxyXG4gIHZhciBqIDogbnVtYmVyXHJcbiAgdmFyIGNvc3QgOiBudW1iZXJcclxuICB2YXIgZCA9IFtdXHJcbiAgaWYgKGEubGVuZ3RoID09PSAwKSB7XHJcbiAgICByZXR1cm4gYi5sZW5ndGhcclxuICB9XHJcbiAgaWYgKGIubGVuZ3RoID09PSAwKSB7XHJcbiAgICByZXR1cm4gYS5sZW5ndGhcclxuICB9XHJcbiAgZm9yIChpID0gMDsgaSA8PSBhLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBkWyBpIF0gPSBbXVxyXG4gICAgZFsgaSBdWyAwIF0gPSBpXHJcbiAgfVxyXG4gIGZvciAoaiA9IDA7IGogPD0gYi5sZW5ndGg7IGorKykge1xyXG4gICAgZFsgMCBdWyBqIF0gPSBqXHJcbiAgfVxyXG4gIGZvciAoaSA9IDE7IGkgPD0gYS5sZW5ndGg7IGkrKykge1xyXG4gICAgZm9yIChqID0gMTsgaiA8PSBiLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgIGlmIChhLmNoYXJBdChpIC0gMSkgPT09IGIuY2hhckF0KGogLSAxKSkge1xyXG4gICAgICAgIGNvc3QgPSAwXHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY29zdCA9IDFcclxuICAgICAgfVxyXG5cclxuICAgICAgZFsgaSBdWyBqIF0gPSBNYXRoLm1pbihkWyBpIC0gMSBdWyBqIF0gKyAxLCBkWyBpIF1bIGogLSAxIF0gKyAxLCBkWyBpIC0gMSBdWyBqIC0gMSBdICsgY29zdClcclxuXHJcbiAgICAgIGlmIChcclxuXHJcbiAgICAgICAgaSA+IDEgJiZcclxuXHJcbiAgICAgICAgaiA+IDEgJiZcclxuXHJcbiAgICAgICAgYS5jaGFyQXQoaSAtIDEpID09PSBiLmNoYXJBdChqIC0gMikgJiZcclxuXHJcbiAgICAgICAgYS5jaGFyQXQoaSAtIDIpID09PSBiLmNoYXJBdChqIC0gMSlcclxuXHJcbiAgICAgICkge1xyXG4gICAgICAgIGRbaV1bal0gPSBNYXRoLm1pbihcclxuXHJcbiAgICAgICAgICBkW2ldW2pdLFxyXG5cclxuICAgICAgICAgIGRbaSAtIDJdW2ogLSAyXSArIGNvc3RcclxuXHJcbiAgICAgICAgKVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gZFsgYS5sZW5ndGggXVsgYi5sZW5ndGggXVxyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGxldmVuc2h0ZWluIChhIDogc3RyaW5nLCBiIDogc3RyaW5nKSB7XHJcbiAgLy9yZXR1cm4gMi4wICogc2lmdDNEaXN0YW5jZShhLGIpOyAvLyw2LDcpOyAvLyArIGIubGVuZ3RoIC8gMik7XHJcbiAgcmV0dXJuIGxldmVuc2h0ZWluRGFtZXJhdShhLGIpO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc2lmdDNEaXN0YW5jZShzMSwgczIpIHtcclxuICAgIGlmIChzMSA9PSBudWxsIHx8IHMxLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIGlmIChzMiA9PSBudWxsIHx8IHMyLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICByZXR1cm4gMDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gczIubGVuZ3RoO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpZiAoczIgPT0gbnVsbCB8fCBzMi5sZW5ndGggPT09IDApIHtcclxuICAgICAgICByZXR1cm4gczEubGVuZ3RoO1xyXG4gICAgfVxyXG4gICAgaWYgKE1hdGguYWJzKHMxLmxlbmd0aCAgLSBzMi5sZW5ndGgpID4gMjApIHtcclxuICAgICAgcmV0dXJuICBNYXRoLm1heChzMS5sZW5ndGgsIHMyLmxlbmd0aCkvMjtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgYyA9IDA7XHJcbiAgICB2YXIgb2Zmc2V0MSA9IDA7XHJcbiAgICB2YXIgb2Zmc2V0MiA9IDA7XHJcbiAgICB2YXIgbGNzID0gMDtcclxuICAgIHZhciBtYXhPZmZzZXQgPSAzO1xyXG5cclxuICAgIHdoaWxlICgoYyArIG9mZnNldDEgPCBzMS5sZW5ndGgpICYmIChjICsgb2Zmc2V0MiA8IHMyLmxlbmd0aCkpIHtcclxuICAgICAgICBpZiAoczEuY2hhckF0KGMgKyBvZmZzZXQxKSA9PSBzMi5jaGFyQXQoYyArIG9mZnNldDIpKSB7XHJcbiAgICAgICAgICAgIGxjcysrO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIG9mZnNldDEgPSAwO1xyXG4gICAgICAgICAgICBvZmZzZXQyID0gMDtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtYXhPZmZzZXQ7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKChjICsgaSA8IHMxLmxlbmd0aCkgJiYgKHMxLmNoYXJBdChjICsgaSkgPT0gczIuY2hhckF0KGMpKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG9mZnNldDEgPSBpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKChjICsgaSA8IHMyLmxlbmd0aCkgJiYgKHMxLmNoYXJBdChjKSA9PSBzMi5jaGFyQXQoYyArIGkpKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG9mZnNldDIgPSBpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGMrKztcclxuICAgIH1cclxuICAgIHJldHVybiAoczEubGVuZ3RoICsgczIubGVuZ3RoKSAvIDIgLSBsY3M7XHJcbn1cclxuXHJcbi8qXHJcbi8vICBTaWZ0NCAtIGNvbW1vbiB2ZXJzaW9uXHJcbi8vIGh0dHBzOi8vc2lkZXJpdGUuYmxvZ3Nwb3QuY29tLzIwMTQvMTEvc3VwZXItZmFzdC1hbmQtYWNjdXJhdGUtc3RyaW5nLWRpc3RhbmNlLmh0bWxcclxuLy8gb25saW5lIGFsZ29yaXRobSB0byBjb21wdXRlIHRoZSBkaXN0YW5jZSBiZXR3ZWVuIHR3byBzdHJpbmdzIGluIE8obilcclxuLy8gbWF4T2Zmc2V0IGlzIHRoZSBudW1iZXIgb2YgY2hhcmFjdGVycyB0byBzZWFyY2ggZm9yIG1hdGNoaW5nIGxldHRlcnNcclxuLy8gbWF4RGlzdGFuY2UgaXMgdGhlIGRpc3RhbmNlIGF0IHdoaWNoIHRoZSBhbGdvcml0aG0gc2hvdWxkIHN0b3AgY29tcHV0aW5nIHRoZSB2YWx1ZSBhbmQganVzdCBleGl0ICh0aGUgc3RyaW5ncyBhcmUgdG9vIGRpZmZlcmVudCBhbnl3YXkpXHJcbmV4cG9ydCBmdW5jdGlvbiBzaWZ0NChzMSwgczIsIG1heE9mZnNldCwgbWF4RGlzdGFuY2UpIHtcclxuICAgIGlmICghczF8fCFzMS5sZW5ndGgpIHtcclxuICAgICAgICBpZiAoIXMyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gczIubGVuZ3RoO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghczJ8fCFzMi5sZW5ndGgpIHtcclxuICAgICAgICByZXR1cm4gczEubGVuZ3RoO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBsMT1zMS5sZW5ndGg7XHJcbiAgICB2YXIgbDI9czIubGVuZ3RoO1xyXG4gICAgaWYoTWF0aC5hYnMobDEgLSBsMikgPiBtYXhEaXN0YW5jZSkge1xyXG4gICAgICByZXR1cm4gNTAwMDA7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGMxID0gMDsgIC8vY3Vyc29yIGZvciBzdHJpbmcgMVxyXG4gICAgdmFyIGMyID0gMDsgIC8vY3Vyc29yIGZvciBzdHJpbmcgMlxyXG4gICAgdmFyIGxjc3MgPSAwOyAgLy9sYXJnZXN0IGNvbW1vbiBzdWJzZXF1ZW5jZVxyXG4gICAgdmFyIGxvY2FsX2NzID0gMDsgLy9sb2NhbCBjb21tb24gc3Vic3RyaW5nXHJcbiAgICB2YXIgdHJhbnMgPSAwOyAgLy9udW1iZXIgb2YgdHJhbnNwb3NpdGlvbnMgKCdhYicgdnMgJ2JhJylcclxuICAgIHZhciBvZmZzZXRfYXJyPVtdOyAgLy9vZmZzZXQgcGFpciBhcnJheSwgZm9yIGNvbXB1dGluZyB0aGUgdHJhbnNwb3NpdGlvbnNcclxuXHJcbiAgICB3aGlsZSAoKGMxIDwgbDEpICYmIChjMiA8IGwyKSkge1xyXG4gICAgICAgIGlmIChzMS5jaGFyQXQoYzEpID09IHMyLmNoYXJBdChjMikpIHtcclxuICAgICAgICAgICAgbG9jYWxfY3MrKztcclxuICAgICAgICAgICAgdmFyIGlzVHJhbnM9ZmFsc2U7XHJcbiAgICAgICAgICAgIC8vc2VlIGlmIGN1cnJlbnQgbWF0Y2ggaXMgYSB0cmFuc3Bvc2l0aW9uXHJcbiAgICAgICAgICAgIHZhciBpPTA7XHJcbiAgICAgICAgICAgIHdoaWxlIChpPG9mZnNldF9hcnIubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgb2ZzPW9mZnNldF9hcnJbaV07XHJcbiAgICAgICAgICAgICAgICBpZiAoYzE8PW9mcy5jMSB8fCBjMiA8PSBvZnMuYzIpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyB3aGVuIHR3byBtYXRjaGVzIGNyb3NzLCB0aGUgb25lIGNvbnNpZGVyZWQgYSB0cmFuc3Bvc2l0aW9uIGlzIHRoZSBvbmUgd2l0aCB0aGUgbGFyZ2VzdCBkaWZmZXJlbmNlIGluIG9mZnNldHNcclxuICAgICAgICAgICAgICAgICAgICBpc1RyYW5zPU1hdGguYWJzKGMyLWMxKT49TWF0aC5hYnMob2ZzLmMyLW9mcy5jMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzVHJhbnMpXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFucysrO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFvZnMudHJhbnMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mcy50cmFucz10cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnMrKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGMxPm9mcy5jMiAmJiBjMj5vZnMuYzEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0X2Fyci5zcGxpY2UoaSwxKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpKys7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG9mZnNldF9hcnIucHVzaCh7XHJcbiAgICAgICAgICAgICAgICBjMTpjMSxcclxuICAgICAgICAgICAgICAgIGMyOmMyLFxyXG4gICAgICAgICAgICAgICAgdHJhbnM6aXNUcmFuc1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsY3NzKz1sb2NhbF9jcztcclxuICAgICAgICAgICAgbG9jYWxfY3M9MDtcclxuICAgICAgICAgICAgaWYgKGMxIT1jMikge1xyXG4gICAgICAgICAgICAgICAgYzE9YzI9TWF0aC5taW4oYzEsYzIpOyAgLy91c2luZyBtaW4gYWxsb3dzIHRoZSBjb21wdXRhdGlvbiBvZiB0cmFuc3Bvc2l0aW9uc1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vaWYgbWF0Y2hpbmcgY2hhcmFjdGVycyBhcmUgZm91bmQsIHJlbW92ZSAxIGZyb20gYm90aCBjdXJzb3JzICh0aGV5IGdldCBpbmNyZW1lbnRlZCBhdCB0aGUgZW5kIG9mIHRoZSBsb29wKVxyXG4gICAgICAgICAgICAvL3NvIHRoYXQgd2UgY2FuIGhhdmUgb25seSBvbmUgY29kZSBibG9jayBoYW5kbGluZyBtYXRjaGVzXHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWF4T2Zmc2V0ICYmIChjMStpPGwxIHx8IGMyK2k8bDIpOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGlmICgoYzEgKyBpIDwgbDEpICYmIChzMS5jaGFyQXQoYzEgKyBpKSA9PSBzMi5jaGFyQXQoYzIpKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGMxKz0gaS0xO1xyXG4gICAgICAgICAgICAgICAgICAgIGMyLS07XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoKGMyICsgaSA8IGwyKSAmJiAoczEuY2hhckF0KGMxKSA9PSBzMi5jaGFyQXQoYzIgKyBpKSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBjMS0tO1xyXG4gICAgICAgICAgICAgICAgICAgIGMyKz0gaS0xO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGMxKys7XHJcbiAgICAgICAgYzIrKztcclxuICAgICAgICBpZiAobWF4RGlzdGFuY2UpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB2YXIgdGVtcG9yYXJ5RGlzdGFuY2U9TWF0aC5tYXgoYzEsYzIpLWxjc3MrdHJhbnM7XHJcbiAgICAgICAgICAgIGlmICh0ZW1wb3JhcnlEaXN0YW5jZT49bWF4RGlzdGFuY2UpIHJldHVybiA1MDAwMDsgLy8gTWF0aC5yb3VuZCh0ZW1wb3JhcnlEaXN0YW5jZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIHRoaXMgY292ZXJzIHRoZSBjYXNlIHdoZXJlIHRoZSBsYXN0IG1hdGNoIGlzIG9uIHRoZSBsYXN0IHRva2VuIGluIGxpc3QsIHNvIHRoYXQgaXQgY2FuIGNvbXB1dGUgdHJhbnNwb3NpdGlvbnMgY29ycmVjdGx5XHJcbiAgICAgICAgaWYgKChjMSA+PSBsMSkgfHwgKGMyID49IGwyKSkge1xyXG4gICAgICAgICAgICBsY3NzKz1sb2NhbF9jcztcclxuICAgICAgICAgICAgbG9jYWxfY3M9MDtcclxuICAgICAgICAgICAgYzE9YzI9TWF0aC5taW4oYzEsYzIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGxjc3MrPWxvY2FsX2NzO1xyXG4gICAgcmV0dXJuIE1hdGgucm91bmQoTWF0aC5tYXgobDEsbDIpLSBsY3NzICt0cmFucyk7IC8vYWRkIHRoZSBjb3N0IG9mIHRyYW5zcG9zaXRpb25zIHRvIHRoZSBmaW5hbCByZXN1bHRcclxufVxyXG5cclxuKi8iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
