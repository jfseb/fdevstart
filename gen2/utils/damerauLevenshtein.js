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
    //return sift4(a,b,5,5 + b.length / 2);
    return levenshteinDamerau(a, b);
}
exports.levenshtein = levenshtein;
//  Sift4 - common version
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
    if (Math.abs(l1 - l2) > 5) {
        return 500;
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
            if (temporaryDistance >= maxDistance) return 500; // Math.round(temporaryDistance);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4udHMiXSwibmFtZXMiOlsibGV2ZW5zaHRlaW5EYW1lcmF1IiwiYSIsImIiLCJpIiwiaiIsImNvc3QiLCJkIiwibGVuZ3RoIiwiY2hhckF0IiwiTWF0aCIsIm1pbiIsImV4cG9ydHMiLCJsZXZlbnNodGVpbiIsInNpZnQ0IiwiczEiLCJzMiIsIm1heE9mZnNldCIsIm1heERpc3RhbmNlIiwibDEiLCJsMiIsImFicyIsImMxIiwiYzIiLCJsY3NzIiwibG9jYWxfY3MiLCJ0cmFucyIsIm9mZnNldF9hcnIiLCJpc1RyYW5zIiwib2ZzIiwic3BsaWNlIiwicHVzaCIsInRlbXBvcmFyeURpc3RhbmNlIiwibWF4Iiwicm91bmQiXSwibWFwcGluZ3MiOiJBQUFBO0FBRUE7QUFDQTtBQUdBOzs7O0FBS0E7Ozs7Ozs7Ozs7QUFTQSxTQUFBQSxrQkFBQSxDQUFvQ0MsQ0FBcEMsRUFBZ0RDLENBQWhELEVBQTBEO0FBQ3hELFFBQUlDLENBQUo7QUFDQSxRQUFJQyxDQUFKO0FBQ0EsUUFBSUMsSUFBSjtBQUNBLFFBQUlDLElBQUksRUFBUjtBQUNBLFFBQUlMLEVBQUVNLE1BQUYsS0FBYSxDQUFqQixFQUFvQjtBQUNsQixlQUFPTCxFQUFFSyxNQUFUO0FBQ0Q7QUFDRCxRQUFJTCxFQUFFSyxNQUFGLEtBQWEsQ0FBakIsRUFBb0I7QUFDbEIsZUFBT04sRUFBRU0sTUFBVDtBQUNEO0FBQ0QsU0FBS0osSUFBSSxDQUFULEVBQVlBLEtBQUtGLEVBQUVNLE1BQW5CLEVBQTJCSixHQUEzQixFQUFnQztBQUM5QkcsVUFBR0gsQ0FBSCxJQUFTLEVBQVQ7QUFDQUcsVUFBR0gsQ0FBSCxFQUFRLENBQVIsSUFBY0EsQ0FBZDtBQUNEO0FBQ0QsU0FBS0MsSUFBSSxDQUFULEVBQVlBLEtBQUtGLEVBQUVLLE1BQW5CLEVBQTJCSCxHQUEzQixFQUFnQztBQUM5QkUsVUFBRyxDQUFILEVBQVFGLENBQVIsSUFBY0EsQ0FBZDtBQUNEO0FBQ0Qs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QixDQUFILEdBQUtnQixFQUFsQyxDQUFoQixFQUF1RGhCLEdBQXZELEVBQTREO0FBQ3hELG9CQUFLa0IsS0FBS2xCLENBQUwsR0FBU2UsRUFBVixJQUFrQkosR0FBR04sTUFBSCxDQUFVYSxLQUFLbEIsQ0FBZixLQUFxQlksR0FBR1AsTUFBSCxDQUFVYyxFQUFWLENBQTNDLEVBQTJEO0FBQ3ZERCwwQkFBS2xCLElBQUUsQ0FBUDtBQUNBbUI7QUFDQTtBQUNIO0FBQ0Qsb0JBQUtBLEtBQUtuQixDQUFMLEdBQVNnQixFQUFWLElBQWtCTCxHQUFHTixNQUFILENBQVVhLEVBQVYsS0FBaUJOLEdBQUdQLE1BQUgsQ0FBVWMsS0FBS25CLENBQWYsQ0FBdkMsRUFBMkQ7QUFDdkRrQjtBQUNBQywwQkFBS25CLElBQUUsQ0FBUDtBQUNBO0FBQ0g7QUFDSjtBQUNKO0FBQ0RrQjtBQUNBQztBQUNBLFlBQUlMLFdBQUosRUFDQTtBQUNJLGdCQUFJYyxvQkFBa0J0QixLQUFLdUIsR0FBTCxDQUFTWCxFQUFULEVBQVlDLEVBQVosSUFBZ0JDLElBQWhCLEdBQXFCRSxLQUEzQztBQUNBLGdCQUFJTSxxQkFBbUJkLFdBQXZCLEVBQW9DLE9BQU8sR0FBUCxDQUZ4QyxDQUVvRDtBQUNuRDtBQUNEO0FBQ0EsWUFBS0ksTUFBTUgsRUFBUCxJQUFlSSxNQUFNSCxFQUF6QixFQUE4QjtBQUMxQkksb0JBQU1DLFFBQU47QUFDQUEsdUJBQVMsQ0FBVDtBQUNBSCxpQkFBR0MsS0FBR2IsS0FBS0MsR0FBTCxDQUFTVyxFQUFULEVBQVlDLEVBQVosQ0FBTjtBQUNIO0FBQ0o7QUFDREMsWUFBTUMsUUFBTjtBQUNBLFdBQU9mLEtBQUt3QixLQUFMLENBQVd4QixLQUFLdUIsR0FBTCxDQUFTZCxFQUFULEVBQVlDLEVBQVosSUFBaUJJLElBQWpCLEdBQXVCRSxLQUFsQyxDQUFQLENBaEd5QyxDQWdHUTtBQUNwRCIsImZpbGUiOiJ1dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCdcclxuXHJcbi8vIGJhc2VkIG9uOiBodHRwOi8vZW4ud2lraWJvb2tzLm9yZy93aWtpL0FsZ29yaXRobV9pbXBsZW1lbnRhdGlvbi9TdHJpbmdzL0xldmVuc2h0ZWluX2Rpc3RhbmNlXHJcbi8vIGFuZDogIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRGFtZXJhdSVFMiU4MCU5M0xldmVuc2h0ZWluX2Rpc3RhbmNlXHJcblxyXG5cclxuLyoqXHJcbiAqIERpc3RhbmNlIG9mIHN0cmluZ3MgYWxnb3JpdGhtXHJcbiAqIEBtb2R1bGUgZnNkZXZzdGFydC51dGlscy5kYW1lcmF1TGV2ZW5zaHRlaW5cclxuICovXHJcblxyXG4vKipcclxuICogYSBmdW5jdGlvbiBjYWxjdWxhdGluZyBkaXN0YW5jZSBiZXR3ZWVuIHR3byBzdHJpbmdzXHJcbiAqIGFjY29yZGluZyB0byB0aGUgZGFtZXJhdSBMZXZlbnNodGVpbiBhbGdvcml0aG1cclxuICogKHRoaXMgYWxnb3JpdGhtLCBpbiBjb250cmFzdCB0byBwbGFpbiBsZXZlbnNodGVpbiB0cmVhdHNcclxuICogc3dhcHBpbmcgb2YgY2hhcmFjdGVycyBhIGRpc3RhbmNlIDEgIFwid29yZFwiICA8LT4gXCJ3cm9kIClcclxuICogQHBhcmFtIHtzdHJpbmd9IGFcclxuICogQHBhcmFtIHtzdHJpbmd9IGJcclxuICogQHB1YmxpY1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGxldmVuc2h0ZWluRGFtZXJhdSAoYSA6IHN0cmluZywgYiA6IHN0cmluZykge1xyXG4gIHZhciBpIDogbnVtYmVyXHJcbiAgdmFyIGogOiBudW1iZXJcclxuICB2YXIgY29zdCA6IG51bWJlclxyXG4gIHZhciBkID0gW11cclxuICBpZiAoYS5sZW5ndGggPT09IDApIHtcclxuICAgIHJldHVybiBiLmxlbmd0aFxyXG4gIH1cclxuICBpZiAoYi5sZW5ndGggPT09IDApIHtcclxuICAgIHJldHVybiBhLmxlbmd0aFxyXG4gIH1cclxuICBmb3IgKGkgPSAwOyBpIDw9IGEubGVuZ3RoOyBpKyspIHtcclxuICAgIGRbIGkgXSA9IFtdXHJcbiAgICBkWyBpIF1bIDAgXSA9IGlcclxuICB9XHJcbiAgZm9yIChqID0gMDsgaiA8PSBiLmxlbmd0aDsgaisrKSB7XHJcbiAgICBkWyAwIF1bIGogXSA9IGpcclxuICB9XHJcbiAgZm9yIChpID0gMTsgaSA8PSBhLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBmb3IgKGogPSAxOyBqIDw9IGIubGVuZ3RoOyBqKyspIHtcclxuICAgICAgaWYgKGEuY2hhckF0KGkgLSAxKSA9PT0gYi5jaGFyQXQoaiAtIDEpKSB7XHJcbiAgICAgICAgY29zdCA9IDBcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjb3N0ID0gMVxyXG4gICAgICB9XHJcblxyXG4gICAgICBkWyBpIF1bIGogXSA9IE1hdGgubWluKGRbIGkgLSAxIF1bIGogXSArIDEsIGRbIGkgXVsgaiAtIDEgXSArIDEsIGRbIGkgLSAxIF1bIGogLSAxIF0gKyBjb3N0KVxyXG5cclxuICAgICAgaWYgKFxyXG5cclxuICAgICAgICBpID4gMSAmJlxyXG5cclxuICAgICAgICBqID4gMSAmJlxyXG5cclxuICAgICAgICBhLmNoYXJBdChpIC0gMSkgPT09IGIuY2hhckF0KGogLSAyKSAmJlxyXG5cclxuICAgICAgICBhLmNoYXJBdChpIC0gMikgPT09IGIuY2hhckF0KGogLSAxKVxyXG5cclxuICAgICAgKSB7XHJcbiAgICAgICAgZFtpXVtqXSA9IE1hdGgubWluKFxyXG5cclxuICAgICAgICAgIGRbaV1bal0sXHJcblxyXG4gICAgICAgICAgZFtpIC0gMl1baiAtIDJdICsgY29zdFxyXG5cclxuICAgICAgICApXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiBkWyBhLmxlbmd0aCBdWyBiLmxlbmd0aCBdXHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbGV2ZW5zaHRlaW4gKGEgOiBzdHJpbmcsIGIgOiBzdHJpbmcpIHtcclxuICAvL3JldHVybiBzaWZ0NChhLGIsNSw1ICsgYi5sZW5ndGggLyAyKTtcclxuICByZXR1cm4gbGV2ZW5zaHRlaW5EYW1lcmF1KGEsYik7XHJcbn1cclxuLy8gIFNpZnQ0IC0gY29tbW9uIHZlcnNpb25cclxuLy8gb25saW5lIGFsZ29yaXRobSB0byBjb21wdXRlIHRoZSBkaXN0YW5jZSBiZXR3ZWVuIHR3byBzdHJpbmdzIGluIE8obilcclxuLy8gbWF4T2Zmc2V0IGlzIHRoZSBudW1iZXIgb2YgY2hhcmFjdGVycyB0byBzZWFyY2ggZm9yIG1hdGNoaW5nIGxldHRlcnNcclxuLy8gbWF4RGlzdGFuY2UgaXMgdGhlIGRpc3RhbmNlIGF0IHdoaWNoIHRoZSBhbGdvcml0aG0gc2hvdWxkIHN0b3AgY29tcHV0aW5nIHRoZSB2YWx1ZSBhbmQganVzdCBleGl0ICh0aGUgc3RyaW5ncyBhcmUgdG9vIGRpZmZlcmVudCBhbnl3YXkpXHJcbmZ1bmN0aW9uIHNpZnQ0KHMxLCBzMiwgbWF4T2Zmc2V0LCBtYXhEaXN0YW5jZSkge1xyXG4gICAgaWYgKCFzMXx8IXMxLmxlbmd0aCkge1xyXG4gICAgICAgIGlmICghczIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIDA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBzMi5sZW5ndGg7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFzMnx8IXMyLmxlbmd0aCkge1xyXG4gICAgICAgIHJldHVybiBzMS5sZW5ndGg7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGwxPXMxLmxlbmd0aDtcclxuICAgIHZhciBsMj1zMi5sZW5ndGg7XHJcbiAgICBpZihNYXRoLmFicyhsMSAtIGwyKSA+IDUpIHtcclxuICAgICAgcmV0dXJuIDUwMDtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgYzEgPSAwOyAgLy9jdXJzb3IgZm9yIHN0cmluZyAxXHJcbiAgICB2YXIgYzIgPSAwOyAgLy9jdXJzb3IgZm9yIHN0cmluZyAyXHJcbiAgICB2YXIgbGNzcyA9IDA7ICAvL2xhcmdlc3QgY29tbW9uIHN1YnNlcXVlbmNlXHJcbiAgICB2YXIgbG9jYWxfY3MgPSAwOyAvL2xvY2FsIGNvbW1vbiBzdWJzdHJpbmdcclxuICAgIHZhciB0cmFucyA9IDA7ICAvL251bWJlciBvZiB0cmFuc3Bvc2l0aW9ucyAoJ2FiJyB2cyAnYmEnKVxyXG4gICAgdmFyIG9mZnNldF9hcnI9W107ICAvL29mZnNldCBwYWlyIGFycmF5LCBmb3IgY29tcHV0aW5nIHRoZSB0cmFuc3Bvc2l0aW9uc1xyXG5cclxuICAgIHdoaWxlICgoYzEgPCBsMSkgJiYgKGMyIDwgbDIpKSB7XHJcbiAgICAgICAgaWYgKHMxLmNoYXJBdChjMSkgPT0gczIuY2hhckF0KGMyKSkge1xyXG4gICAgICAgICAgICBsb2NhbF9jcysrO1xyXG4gICAgICAgICAgICB2YXIgaXNUcmFucz1mYWxzZTtcclxuICAgICAgICAgICAgLy9zZWUgaWYgY3VycmVudCBtYXRjaCBpcyBhIHRyYW5zcG9zaXRpb25cclxuICAgICAgICAgICAgdmFyIGk9MDtcclxuICAgICAgICAgICAgd2hpbGUgKGk8b2Zmc2V0X2Fyci5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgIHZhciBvZnM9b2Zmc2V0X2FycltpXTtcclxuICAgICAgICAgICAgICAgIGlmIChjMTw9b2ZzLmMxIHx8IGMyIDw9IG9mcy5jMikge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHdoZW4gdHdvIG1hdGNoZXMgY3Jvc3MsIHRoZSBvbmUgY29uc2lkZXJlZCBhIHRyYW5zcG9zaXRpb24gaXMgdGhlIG9uZSB3aXRoIHRoZSBsYXJnZXN0IGRpZmZlcmVuY2UgaW4gb2Zmc2V0c1xyXG4gICAgICAgICAgICAgICAgICAgIGlzVHJhbnM9TWF0aC5hYnMoYzItYzEpPj1NYXRoLmFicyhvZnMuYzItb2ZzLmMxKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNUcmFucylcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zKys7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW9mcy50cmFucykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb2ZzLnRyYW5zPXRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFucysrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYzE+b2ZzLmMyICYmIGMyPm9mcy5jMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXRfYXJyLnNwbGljZShpLDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgb2Zmc2V0X2Fyci5wdXNoKHtcclxuICAgICAgICAgICAgICAgIGMxOmMxLFxyXG4gICAgICAgICAgICAgICAgYzI6YzIsXHJcbiAgICAgICAgICAgICAgICB0cmFuczppc1RyYW5zXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGxjc3MrPWxvY2FsX2NzO1xyXG4gICAgICAgICAgICBsb2NhbF9jcz0wO1xyXG4gICAgICAgICAgICBpZiAoYzEhPWMyKSB7XHJcbiAgICAgICAgICAgICAgICBjMT1jMj1NYXRoLm1pbihjMSxjMik7ICAvL3VzaW5nIG1pbiBhbGxvd3MgdGhlIGNvbXB1dGF0aW9uIG9mIHRyYW5zcG9zaXRpb25zXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy9pZiBtYXRjaGluZyBjaGFyYWN0ZXJzIGFyZSBmb3VuZCwgcmVtb3ZlIDEgZnJvbSBib3RoIGN1cnNvcnMgKHRoZXkgZ2V0IGluY3JlbWVudGVkIGF0IHRoZSBlbmQgb2YgdGhlIGxvb3ApXHJcbiAgICAgICAgICAgIC8vc28gdGhhdCB3ZSBjYW4gaGF2ZSBvbmx5IG9uZSBjb2RlIGJsb2NrIGhhbmRsaW5nIG1hdGNoZXNcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtYXhPZmZzZXQgJiYgKGMxK2k8bDEgfHwgYzIraTxsMik7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKChjMSArIGkgPCBsMSkgJiYgKHMxLmNoYXJBdChjMSArIGkpID09IHMyLmNoYXJBdChjMikpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYzErPSBpLTE7XHJcbiAgICAgICAgICAgICAgICAgICAgYzItLTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICgoYzIgKyBpIDwgbDIpICYmIChzMS5jaGFyQXQoYzEpID09IHMyLmNoYXJBdChjMiArIGkpKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGMxLS07XHJcbiAgICAgICAgICAgICAgICAgICAgYzIrPSBpLTE7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgYzErKztcclxuICAgICAgICBjMisrO1xyXG4gICAgICAgIGlmIChtYXhEaXN0YW5jZSlcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIHZhciB0ZW1wb3JhcnlEaXN0YW5jZT1NYXRoLm1heChjMSxjMiktbGNzcyt0cmFucztcclxuICAgICAgICAgICAgaWYgKHRlbXBvcmFyeURpc3RhbmNlPj1tYXhEaXN0YW5jZSkgcmV0dXJuIDUwMDsgLy8gTWF0aC5yb3VuZCh0ZW1wb3JhcnlEaXN0YW5jZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIHRoaXMgY292ZXJzIHRoZSBjYXNlIHdoZXJlIHRoZSBsYXN0IG1hdGNoIGlzIG9uIHRoZSBsYXN0IHRva2VuIGluIGxpc3QsIHNvIHRoYXQgaXQgY2FuIGNvbXB1dGUgdHJhbnNwb3NpdGlvbnMgY29ycmVjdGx5XHJcbiAgICAgICAgaWYgKChjMSA+PSBsMSkgfHwgKGMyID49IGwyKSkge1xyXG4gICAgICAgICAgICBsY3NzKz1sb2NhbF9jcztcclxuICAgICAgICAgICAgbG9jYWxfY3M9MDtcclxuICAgICAgICAgICAgYzE9YzI9TWF0aC5taW4oYzEsYzIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGxjc3MrPWxvY2FsX2NzO1xyXG4gICAgcmV0dXJuIE1hdGgucm91bmQoTWF0aC5tYXgobDEsbDIpLSBsY3NzICt0cmFucyk7IC8vYWRkIHRoZSBjb3N0IG9mIHRyYW5zcG9zaXRpb25zIHRvIHRoZSBmaW5hbCByZXN1bHRcclxufVxyXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
