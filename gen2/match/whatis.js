/**
 *
 * @module jfseb.fdevstart.analyze
 * @file analyze.ts
 * @copyright (c) 2016 Gerd Forstmann
 */
"use strict";

var InputFilter = require('./inputFilter');
var debug = require('debug');
var debuglog = debug('whatis');
var Sentence = require('./sentence');
var Word = require('./word');
function cmpByResultThenRanking(a, b) {
    var cmp = a.result.localeCompare(b.result);
    if (cmp) {
        return cmp;
    }
    return -(a._ranking - b._ranking);
}
exports.cmpByResultThenRanking = cmpByResultThenRanking;
function cmpByRanking(a, b) {
    var cmp = -(a._ranking - b._ranking);
    if (cmp) {
        return cmp;
    }
    cmp = a.result.localeCompare(b.result);
    if (cmp) {
        return cmp;
    }
    // are records different?
    var keys = Object.keys(a.record).concat(Object.keys(b.record)).sort();
    var res = keys.reduce(function (prev, sKey) {
        if (prev) {
            return prev;
        }
        if (b.record[sKey] !== a.record[sKey]) {
            if (!b.record[sKey]) {
                return -1;
            }
            if (!a.record[sKey]) {
                return +1;
            }
            return a.record[sKey].localeCompare(b.record[sKey]);
        }
        return 0;
    }, 0);
    return res;
}
exports.cmpByRanking = cmpByRanking;
function dumpNice(answer) {
    var result = {
        s: "",
        push: function push(s) {
            this.s = this.s + s;
        }
    };
    var s = "**Result for category: " + answer.category + " is " + answer.result + "\n rank: " + answer._ranking + "\n";
    result.push(s);
    Object.keys(answer.record).forEach(function (sRequires, index) {
        if (sRequires.charAt(0) !== '_') {
            result.push("record: " + sRequires + " -> " + answer.record[sRequires]);
        }
        result.push('\n');
    });
    var oSentence = answer.sentence;
    oSentence.forEach(function (oWord, index) {
        var sWord = "[" + index + "] : " + oWord.category + " \"" + oWord.string + "\" => \"" + oWord.matchedString + "\"";
        result.push(sWord + "\n");
    });
    result.push(".\n");
    return result.s;
}
exports.dumpNice = dumpNice;
function dumpWeightsTop(toolmatches, options) {
    var s = '';
    toolmatches.forEach(function (oMatch, index) {
        if (index < options.top) {
            s = s + "WhatIsAnswer[" + index + "]...\n";
            s = s + dumpNice(oMatch);
        }
    });
    return s;
}
exports.dumpWeightsTop = dumpWeightsTop;
function filterRetainTopRankedResult(res) {
    var result = res.filter(function (iRes, index) {
        debuglog(index + ' ' + JSON.stringify(iRes));
        if (iRes.result === (res[index - 1] && res[index - 1].result)) {
            debuglog('skip');
            return false;
        }
        return true;
    });
    result.sort(cmpByRanking);
    return result;
}
exports.filterRetainTopRankedResult = filterRetainTopRankedResult;
var Match = require('./match');
function calcRanking(matched, mismatched, relevantCount) {
    var lenMatched = Object.keys(matched).length;
    var factor = Match.calcRankingProduct(matched);
    factor *= Math.pow(1.5, lenMatched);
    var lenMisMatched = Object.keys(mismatched).length;
    var factor2 = Match.calcRankingProduct(mismatched);
    factor2 *= Math.pow(0.4, lenMisMatched);
    return Math.pow(factor2 * factor, 1 / (lenMisMatched + lenMatched));
}
exports.calcRanking = calcRanking;
function calcRankingHavingCategory(matched, hasCategory, mismatched, relevantCount) {
    var lenMatched = Object.keys(matched).length;
    var factor = Match.calcRankingProduct(matched);
    factor *= Math.pow(1.5, lenMatched);
    var lenHasCategory = Object.keys(hasCategory).length;
    var factorH = Math.pow(1.2, lenHasCategory);
    var lenMisMatched = Object.keys(mismatched).length;
    var factor2 = Match.calcRankingProduct(mismatched);
    factor2 *= Math.pow(0.4, lenMisMatched);
    return Math.pow(factor2 * factorH * factor, 1 / (lenMisMatched + lenHasCategory + lenMatched));
}
exports.calcRankingHavingCategory = calcRankingHavingCategory;
/**
 * list all top level rankings
 */
function matchRecordsHavingContext(aSentences, category, records) {
    debuglog(JSON.stringify(records, undefined, 2));
    var relevantRecords = records.filter(function (record) {
        return record[category] !== undefined && record[category] !== null;
    });
    var res = [];
    debuglog("relevant records nr:" + relevantRecords.length);
    debuglog("sentences are : " + JSON.stringify(aSentences, undefined, 2));
    relevantRecords.forEach(function (record) {
        aSentences.forEach(function (oSentence) {
            // count matches in record which are *not* the category
            var mismatched = {};
            var matched = {};
            var hasCategory = {};
            aSentences.forEach(function (aSentence) {
                var mismatched = {};
                var matched = {};
                var cntRelevantWords = 0;
                aSentence.forEach(function (oWord) {
                    if (!Word.Word.isFiller(oWord)) {
                        cntRelevantWords = cntRelevantWords + 1;
                        if (oWord.category && record[oWord.category] !== undefined) {
                            if (oWord.matchedString === record[oWord.category]) {
                                matched[oWord.category] = oWord;
                            } else {
                                mismatched[oWord.category] = oWord;
                            }
                        } else if (Word.Word.isCategory(oWord) && record[oWord.matchedString]) {
                            hasCategory[oWord.matchedString] = 1;
                        }
                    }
                });
                if (Object.keys(matched).length + Object.keys(hasCategory).length > Object.keys(mismatched).length) {
                    res.push({
                        sentence: aSentence,
                        record: record,
                        category: category,
                        result: record[category],
                        _ranking: calcRankingHavingCategory(matched, hasCategory, mismatched, cntRelevantWords)
                    });
                }
            });
        });
    });
    res.sort(cmpByResultThenRanking);
    res = filterRetainTopRankedResult(res);
    return res;
}
exports.matchRecordsHavingContext = matchRecordsHavingContext;
function matchRecords(aSentences, category, records) {
    debuglog(JSON.stringify(records, undefined, 2));
    var relevantRecords = records.filter(function (record) {
        return record[category] !== undefined && record[category] !== null;
    });
    var res = [];
    debuglog("relevant records nr:" + relevantRecords.length);
    relevantRecords.forEach(function (record) {
        aSentences.forEach(function (oSentence) {
            // count matches in record which are *not* the category
            var mismatched = {};
            var matched = {};
            aSentences.forEach(function (aSentence) {
                var mismatched = {};
                var matched = {};
                var cntRelevantWords = 0;
                aSentence.forEach(function (oWord) {
                    if (!Word.Word.isFiller(oWord)) {
                        cntRelevantWords = cntRelevantWords + 1;
                        if (oWord.category && record[oWord.category] !== undefined) {
                            if (oWord.matchedString === record[oWord.category]) {
                                matched[oWord.category] = oWord;
                            } else {
                                mismatched[oWord.category] = oWord;
                            }
                        }
                    }
                });
                if (Object.keys(matched).length > Object.keys(mismatched).length) {
                    res.push({
                        sentence: aSentence,
                        record: record,
                        category: category,
                        result: record[category],
                        _ranking: calcRanking(matched, mismatched, cntRelevantWords)
                    });
                }
            });
        });
    });
    res.sort(cmpByResultThenRanking);
    res = filterRetainTopRankedResult(res);
    return res;
}
exports.matchRecords = matchRecords;
function analyzeCategory(categoryword, aRules, wholesentence) {
    var cats = InputFilter.categorizeAWord(categoryword, aRules, wholesentence, {});
    // TODO qualify
    cats = cats.filter(function (cat) {
        return cat.category === 'category';
    });
    if (cats.length) {
        return cats[0].matchedString;
    }
}
exports.analyzeCategory = analyzeCategory;
// const result = WhatIs.resolveCategory(cat, a1.entity,
//   theModel.mRules, theModel.tools, theModel.records);
function resolveCategory(category, contextQueryString, aRules, records) {
    if (contextQueryString.length === 0) {
        return [];
    } else {
        var matched = InputFilter.analyzeString(contextQueryString, aRules);
        debuglog("after matched " + JSON.stringify(matched));
        var aSentences = InputFilter.expandMatchArr(matched);
        debuglog("after expand" + aSentences.map(function (oSentence) {
            return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
        }).join("\n"));
        var aSentencesReinforced = InputFilter.reinForce(aSentences);
        //aSentences.map(function(oSentence) { return InputFilter.reinForce(oSentence); });
        debuglog("after reinforce" + aSentencesReinforced.map(function (oSentence) {
            return Sentence.rankingProduct(oSentence) + ":" + JSON.stringify(oSentence);
        }).join("\n"));
        var matchedAnswers = matchRecords(aSentences, category, records); //aTool: Array<IMatch.ITool>): any /* objectstream*/ {
        debuglog(" matchedAnswers" + JSON.stringify(matchedAnswers, undefined, 2));
        return matchedAnswers;
    }
}
exports.resolveCategory = resolveCategory;
function filterOnlyTopRanked(results) {
    var res = results.filter(function (result) {
        if (result._ranking === results[0]._ranking) {
            return true;
        }
        if (result._ranking >= results[0]._ranking) {
            throw new Error("List to filter must be ordered");
        }
        return false;
    });
    return res;
}
exports.filterOnlyTopRanked = filterOnlyTopRanked;
function isIndiscriminateResult(results) {
    var cnt = results.reduce(function (prev, result) {
        if (result._ranking === results[0]._ranking) {
            return prev + 1;
        }
    }, 0);
    if (cnt > 1) {
        // search for a discriminating category value
        var discriminating = Object.keys(results[0].record).reduce(function (prev, category) {
            if (category.charAt(0) !== '_' && category !== results[0].category && results[0].record[category] !== results[1].record[category]) {
                prev.push(category);
            }
            return prev;
        }, []);
        if (discriminating.length) {
            return "Many comparable results, perhaps you want to specify a discriminating " + discriminating.join(',');
        }
        return 'Your question does not have a specifci answer';
    }
    return undefined;
}
exports.isIndiscriminateResult = isIndiscriminateResult;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC93aGF0aXMudHMiLCJtYXRjaC93aGF0aXMuanMiXSwibmFtZXMiOlsiSW5wdXRGaWx0ZXIiLCJyZXF1aXJlIiwiZGVidWciLCJkZWJ1Z2xvZyIsIlNlbnRlbmNlIiwiV29yZCIsImNtcEJ5UmVzdWx0VGhlblJhbmtpbmciLCJhIiwiYiIsImNtcCIsInJlc3VsdCIsImxvY2FsZUNvbXBhcmUiLCJfcmFua2luZyIsImV4cG9ydHMiLCJjbXBCeVJhbmtpbmciLCJrZXlzIiwiT2JqZWN0IiwicmVjb3JkIiwiY29uY2F0Iiwic29ydCIsInJlcyIsInJlZHVjZSIsInByZXYiLCJzS2V5IiwiZHVtcE5pY2UiLCJhbnN3ZXIiLCJzIiwicHVzaCIsImNhdGVnb3J5IiwiZm9yRWFjaCIsInNSZXF1aXJlcyIsImluZGV4IiwiY2hhckF0Iiwib1NlbnRlbmNlIiwic2VudGVuY2UiLCJvV29yZCIsInNXb3JkIiwic3RyaW5nIiwibWF0Y2hlZFN0cmluZyIsImR1bXBXZWlnaHRzVG9wIiwidG9vbG1hdGNoZXMiLCJvcHRpb25zIiwib01hdGNoIiwidG9wIiwiZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0IiwiZmlsdGVyIiwiaVJlcyIsIkpTT04iLCJzdHJpbmdpZnkiLCJNYXRjaCIsImNhbGNSYW5raW5nIiwibWF0Y2hlZCIsIm1pc21hdGNoZWQiLCJyZWxldmFudENvdW50IiwibGVuTWF0Y2hlZCIsImxlbmd0aCIsImZhY3RvciIsImNhbGNSYW5raW5nUHJvZHVjdCIsIk1hdGgiLCJwb3ciLCJsZW5NaXNNYXRjaGVkIiwiZmFjdG9yMiIsImNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkiLCJoYXNDYXRlZ29yeSIsImxlbkhhc0NhdGVnb3J5IiwiZmFjdG9ySCIsIm1hdGNoUmVjb3Jkc0hhdmluZ0NvbnRleHQiLCJhU2VudGVuY2VzIiwicmVjb3JkcyIsInVuZGVmaW5lZCIsInJlbGV2YW50UmVjb3JkcyIsImFTZW50ZW5jZSIsImNudFJlbGV2YW50V29yZHMiLCJpc0ZpbGxlciIsImlzQ2F0ZWdvcnkiLCJtYXRjaFJlY29yZHMiLCJhbmFseXplQ2F0ZWdvcnkiLCJjYXRlZ29yeXdvcmQiLCJhUnVsZXMiLCJ3aG9sZXNlbnRlbmNlIiwiY2F0cyIsImNhdGVnb3JpemVBV29yZCIsImNhdCIsInJlc29sdmVDYXRlZ29yeSIsImNvbnRleHRRdWVyeVN0cmluZyIsImFuYWx5emVTdHJpbmciLCJleHBhbmRNYXRjaEFyciIsIm1hcCIsInJhbmtpbmdQcm9kdWN0Iiwiam9pbiIsImFTZW50ZW5jZXNSZWluZm9yY2VkIiwicmVpbkZvcmNlIiwibWF0Y2hlZEFuc3dlcnMiLCJmaWx0ZXJPbmx5VG9wUmFua2VkIiwicmVzdWx0cyIsIkVycm9yIiwiaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdCIsImNudCIsImRpc2NyaW1pbmF0aW5nIl0sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0FDTUE7O0FERUEsSUFBWUEsY0FBV0MsUUFBTSxlQUFOLENBQXZCO0FBRUEsSUFBWUMsUUFBS0QsUUFBTSxPQUFOLENBQWpCO0FBRUEsSUFBTUUsV0FBV0QsTUFBTSxRQUFOLENBQWpCO0FBUUEsSUFBWUUsV0FBUUgsUUFBTSxZQUFOLENBQXBCO0FBRUEsSUFBWUksT0FBSUosUUFBTSxRQUFOLENBQWhCO0FBR0EsU0FBQUssc0JBQUEsQ0FBdUNDLENBQXZDLEVBQWdFQyxDQUFoRSxFQUF1RjtBQUNyRixRQUFJQyxNQUFNRixFQUFFRyxNQUFGLENBQVNDLGFBQVQsQ0FBdUJILEVBQUVFLE1BQXpCLENBQVY7QUFDQSxRQUFJRCxHQUFKLEVBQVM7QUFDUCxlQUFPQSxHQUFQO0FBQ0Q7QUFDRCxXQUFPLEVBQUVGLEVBQUVLLFFBQUYsR0FBYUosRUFBRUksUUFBakIsQ0FBUDtBQUNEO0FBTmVDLFFBQUFQLHNCQUFBLEdBQXNCQSxzQkFBdEI7QUFTaEIsU0FBQVEsWUFBQSxDQUE2QlAsQ0FBN0IsRUFBc0RDLENBQXRELEVBQTZFO0FBQzNFLFFBQUlDLE1BQU0sRUFBRUYsRUFBRUssUUFBRixHQUFh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QSxZQUFJNEUsZUFBZTNDLE1BQW5CLEVBQTJCO0FBQ3pCLG1CQUFPLDJFQUEyRTJDLGVBQWVULElBQWYsQ0FBb0IsR0FBcEIsQ0FBbEY7QUFDRDtBQUNELGVBQU8sK0NBQVA7QUFDRDtBQUNELFdBQU9wQixTQUFQO0FBQ0Q7QUFyQmV4RCxRQUFBbUYsc0JBQUEsR0FBc0JBLHNCQUF0QiIsImZpbGUiOiJtYXRjaC93aGF0aXMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5hbmFseXplXG4gKiBAZmlsZSBhbmFseXplLnRzXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXG4gKi9cblxuXG5pbXBvcnQgKiBhcyBJbnB1dEZpbHRlciBmcm9tICcuL2lucHV0RmlsdGVyJztcblxuaW1wb3J0ICogYXMgZGVidWcgZnJvbSAnZGVidWcnO1xuXG5jb25zdCBkZWJ1Z2xvZyA9IGRlYnVnKCd3aGF0aXMnKTtcblxuaW1wb3J0ICogYXMgdXRpbHMgZnJvbSAnLi4vdXRpbHMvdXRpbHMnO1xuXG5pbXBvcnQgKiBhcyBJTWF0Y2ggZnJvbSAnLi9pZm1hdGNoJztcblxuaW1wb3J0ICogYXMgVG9vbG1hdGNoZXIgZnJvbSAnLi90b29sbWF0Y2hlcic7XG5cbmltcG9ydCAqIGFzIFNlbnRlbmNlIGZyb20gJy4vc2VudGVuY2UnO1xuXG5pbXBvcnQgKiBhcyBXb3JkIGZyb20gJy4vd29yZCc7XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGNtcEJ5UmVzdWx0VGhlblJhbmtpbmcoYTogSU1hdGNoLklXaGF0SXNBbnN3ZXIsIGI6IElNYXRjaC5JV2hhdElzQW5zd2VyKSB7XG4gIHZhciBjbXAgPSBhLnJlc3VsdC5sb2NhbGVDb21wYXJlKGIucmVzdWx0KTtcbiAgaWYgKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cbiAgcmV0dXJuIC0oYS5fcmFua2luZyAtIGIuX3JhbmtpbmcpO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBjbXBCeVJhbmtpbmcoYTogSU1hdGNoLklXaGF0SXNBbnN3ZXIsIGI6IElNYXRjaC5JV2hhdElzQW5zd2VyKSB7XG4gIHZhciBjbXAgPSAtKGEuX3JhbmtpbmcgLSBiLl9yYW5raW5nKTtcbiAgaWYgKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cbiAgY21wID0gYS5yZXN1bHQubG9jYWxlQ29tcGFyZShiLnJlc3VsdCk7XG4gIGlmKGNtcCkge1xuICAgIHJldHVybiBjbXA7XG4gIH1cblxuICAvLyBhcmUgcmVjb3JkcyBkaWZmZXJlbnQ/XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYS5yZWNvcmQpLmNvbmNhdChPYmplY3Qua2V5cyhiLnJlY29yZCkpLnNvcnQoKTtcbiAgdmFyIHJlcyA9IGtleXMucmVkdWNlKGZ1bmN0aW9uKHByZXYsIHNLZXkpIHtcbiAgICBpZihwcmV2KSB7XG4gICAgICByZXR1cm4gcHJldjtcbiAgICB9XG4gICAgaWYoYi5yZWNvcmRbc0tleV0gIT09IGEucmVjb3JkW3NLZXldKSB7XG4gICAgICBpZighYi5yZWNvcmRbc0tleV0pIHtcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgfVxuICAgICAgaWYoIWEucmVjb3JkW3NLZXldKSB7XG4gICAgICAgIHJldHVybiArMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhLnJlY29yZFtzS2V5XS5sb2NhbGVDb21wYXJlKGIucmVjb3JkW3NLZXldKTtcbiAgICB9XG4gICAgcmV0dXJuIDA7XG4gIH0sIDApO1xuICByZXR1cm4gcmVzO1xufVxuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGR1bXBOaWNlKGFuc3dlcjogSU1hdGNoLklXaGF0SXNBbnN3ZXIpIHtcbiAgdmFyIHJlc3VsdCA9IHtcbiAgICBzOiBcIlwiLFxuICAgIHB1c2g6IGZ1bmN0aW9uIChzKSB7IHRoaXMucyA9IHRoaXMucyArIHM7IH1cbiAgfTtcbiAgdmFyIHMgPVxuICAgIGAqKlJlc3VsdCBmb3IgY2F0ZWdvcnk6ICR7YW5zd2VyLmNhdGVnb3J5fSBpcyAke2Fuc3dlci5yZXN1bHR9XG4gcmFuazogJHthbnN3ZXIuX3Jhbmtpbmd9XG5gO1xuICByZXN1bHQucHVzaChzKTtcbiAgT2JqZWN0LmtleXMoYW5zd2VyLnJlY29yZCkuZm9yRWFjaChmdW5jdGlvbiAoc1JlcXVpcmVzLCBpbmRleCkge1xuICAgIGlmIChzUmVxdWlyZXMuY2hhckF0KDApICE9PSAnXycpIHtcbiAgICAgIHJlc3VsdC5wdXNoKGByZWNvcmQ6ICR7c1JlcXVpcmVzfSAtPiAke2Fuc3dlci5yZWNvcmRbc1JlcXVpcmVzXX1gKTtcbiAgICB9XG4gICAgcmVzdWx0LnB1c2goJ1xcbicpO1xuICB9KTtcbiAgdmFyIG9TZW50ZW5jZSA9IGFuc3dlci5zZW50ZW5jZTtcbiAgb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkLCBpbmRleCkge1xuICAgIHZhciBzV29yZCA9IGBbJHtpbmRleH1dIDogJHtvV29yZC5jYXRlZ29yeX0gXCIke29Xb3JkLnN0cmluZ31cIiA9PiBcIiR7b1dvcmQubWF0Y2hlZFN0cmluZ31cImBcbiAgICByZXN1bHQucHVzaChzV29yZCArIFwiXFxuXCIpO1xuICB9KVxuICByZXN1bHQucHVzaChcIi5cXG5cIik7XG4gIHJldHVybiByZXN1bHQucztcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gZHVtcFdlaWdodHNUb3AodG9vbG1hdGNoZXM6IEFycmF5PElNYXRjaC5JV2hhdElzQW5zd2VyPiwgb3B0aW9uczogYW55KSB7XG4gIHZhciBzID0gJyc7XG4gIHRvb2xtYXRjaGVzLmZvckVhY2goZnVuY3Rpb24gKG9NYXRjaCwgaW5kZXgpIHtcbiAgICBpZiAoaW5kZXggPCBvcHRpb25zLnRvcCkge1xuICAgICAgcyA9IHMgKyBcIldoYXRJc0Fuc3dlcltcIiArIGluZGV4ICsgXCJdLi4uXFxuXCI7XG4gICAgICBzID0gcyArIGR1bXBOaWNlKG9NYXRjaCk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHQocmVzOiBBcnJheTxJTWF0Y2guSVdoYXRJc0Fuc3dlcj4pOiBBcnJheTxJTWF0Y2guSVdoYXRJc0Fuc3dlcj4ge1xuICB2YXIgcmVzdWx0ID0gcmVzLmZpbHRlcihmdW5jdGlvbiAoaVJlcywgaW5kZXgpIHtcbiAgICBkZWJ1Z2xvZyhpbmRleCArICcgJyArIEpTT04uc3RyaW5naWZ5KGlSZXMpKTtcbiAgICBpZiAoaVJlcy5yZXN1bHQgPT09IChyZXNbaW5kZXggLSAxXSAmJiByZXNbaW5kZXggLSAxXS5yZXN1bHQpKSB7XG4gICAgICBkZWJ1Z2xvZygnc2tpcCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG4gIHJlc3VsdC5zb3J0KGNtcEJ5UmFua2luZyk7XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmltcG9ydCAqIGFzIE1hdGNoIGZyb20gJy4vbWF0Y2gnO1xuXG5leHBvcnQgZnVuY3Rpb24gY2FsY1JhbmtpbmcobWF0Y2hlZDogeyBba2V5OiBzdHJpbmddOiBJTWF0Y2guSVdvcmQgfSxcbiAgbWlzbWF0Y2hlZDogeyBba2V5OiBzdHJpbmddOiBJTWF0Y2guSVdvcmQgfSwgcmVsZXZhbnRDb3VudDogbnVtYmVyKTogbnVtYmVyIHtcblxuICB2YXIgbGVuTWF0Y2hlZCA9IE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aDtcbiAgdmFyIGZhY3RvciA9IE1hdGNoLmNhbGNSYW5raW5nUHJvZHVjdChtYXRjaGVkKTtcbiAgZmFjdG9yICo9IE1hdGgucG93KDEuNSwgbGVuTWF0Y2hlZCk7XG5cbiAgdmFyIGxlbk1pc01hdGNoZWQgPSBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGg7XG4gIHZhciBmYWN0b3IyID0gTWF0Y2guY2FsY1JhbmtpbmdQcm9kdWN0KG1pc21hdGNoZWQpO1xuICBmYWN0b3IyICo9IE1hdGgucG93KDAuNCwgbGVuTWlzTWF0Y2hlZCk7XG5cbiAgcmV0dXJuIE1hdGgucG93KGZhY3RvcjIgKiBmYWN0b3IsIDEgLyAobGVuTWlzTWF0Y2hlZCArIGxlbk1hdGNoZWQpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkobWF0Y2hlZDogeyBba2V5OiBzdHJpbmddOiBJTWF0Y2guSVdvcmQgfSxcbiAgaGFzQ2F0ZWdvcnkgOiB7W2tleSA6IHN0cmluZ10gOiBudW1iZXJ9LFxuICBtaXNtYXRjaGVkOiB7IFtrZXk6IHN0cmluZ106IElNYXRjaC5JV29yZCB9LCByZWxldmFudENvdW50OiBudW1iZXIpOiBudW1iZXIge1xuXG5cbiAgdmFyIGxlbk1hdGNoZWQgPSBPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGg7XG4gIHZhciBmYWN0b3IgPSBNYXRjaC5jYWxjUmFua2luZ1Byb2R1Y3QobWF0Y2hlZCk7XG4gIGZhY3RvciAqPSBNYXRoLnBvdygxLjUsIGxlbk1hdGNoZWQpO1xuXG4gIHZhciBsZW5IYXNDYXRlZ29yeSA9IE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5sZW5ndGg7XG4gIHZhciBmYWN0b3JIID0gTWF0aC5wb3coMS4yLGxlbkhhc0NhdGVnb3J5KTtcblxuICB2YXIgbGVuTWlzTWF0Y2hlZCA9IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aDtcbiAgdmFyIGZhY3RvcjIgPSBNYXRjaC5jYWxjUmFua2luZ1Byb2R1Y3QobWlzbWF0Y2hlZCk7XG4gIGZhY3RvcjIgKj0gTWF0aC5wb3coMC40LCBsZW5NaXNNYXRjaGVkKTtcblxuICByZXR1cm4gTWF0aC5wb3coZmFjdG9yMiAqIGZhY3RvckggKiBmYWN0b3IsIDEgLyAobGVuTWlzTWF0Y2hlZCArIGxlbkhhc0NhdGVnb3J5ICsgbGVuTWF0Y2hlZCkpO1xufVxuXG4vKipcbiAqIGxpc3QgYWxsIHRvcCBsZXZlbCByYW5raW5nc1xuICovXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hSZWNvcmRzSGF2aW5nQ29udGV4dChcbiAgYVNlbnRlbmNlczogQXJyYXk8SU1hdGNoLklTZW50ZW5jZT4sIGNhdGVnb3J5OiBzdHJpbmcsIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPilcbiAgOiBBcnJheTxJTWF0Y2guSVdoYXRJc0Fuc3dlcj4ge1xuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRzLHVuZGVmaW5lZCwyKSk7XG4gIHZhciByZWxldmFudFJlY29yZHMgPSByZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAocmVjb3JkOiBJTWF0Y2guSVJlY29yZCkge1xuICAgIHJldHVybiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSAmJiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gbnVsbCk7XG4gIH0pO1xuICB2YXIgcmVzID0gW107XG4gIGRlYnVnbG9nKFwicmVsZXZhbnQgcmVjb3JkcyBucjpcIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGgpO1xuICAgIGRlYnVnbG9nKFwic2VudGVuY2VzIGFyZSA6IFwiICsgSlNPTi5zdHJpbmdpZnkoYVNlbnRlbmNlcyx1bmRlZmluZWQsMikpO1xuICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgYVNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgIHZhciBtaXNtYXRjaGVkID0ge31cbiAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICB2YXIgaGFzQ2F0ZWdvcnkgPSB7fTtcbiAgICAgIGFTZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAoYVNlbnRlbmNlKSB7XG4gICAgICAgIHZhciBtaXNtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gMDtcbiAgICAgICAgYVNlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgaWYgKCFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpKSB7XG4gICAgICAgICAgICBjbnRSZWxldmFudFdvcmRzID0gY250UmVsZXZhbnRXb3JkcyArIDE7XG4gICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKSAmJiByZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgICAgICBoYXNDYXRlZ29yeVtvV29yZC5tYXRjaGVkU3RyaW5nXSA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKChPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoKSA+IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aCkge1xuICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2UsXG4gICAgICAgICAgICByZWNvcmQgOiByZWNvcmQsXG4gICAgICAgICAgICBjYXRlZ29yeSA6IGNhdGVnb3J5LFxuICAgICAgICAgICAgcmVzdWx0OiByZWNvcmRbY2F0ZWdvcnldLFxuICAgICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSk7XG4gIH0pO1xuICByZXMuc29ydChjbXBCeVJlc3VsdFRoZW5SYW5raW5nKTtcbiAgcmVzID0gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0KHJlcyk7XG4gIHJldHVybiByZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFJlY29yZHMoYVNlbnRlbmNlczogQXJyYXk8SU1hdGNoLklTZW50ZW5jZT4sIGNhdGVnb3J5OiBzdHJpbmcsIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPilcbiAgOiBBcnJheTxJTWF0Y2guSVdoYXRJc0Fuc3dlcj4ge1xuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRzLHVuZGVmaW5lZCwyKSk7XG4gIHZhciByZWxldmFudFJlY29yZHMgPSByZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAocmVjb3JkOiBJTWF0Y2guSVJlY29yZCkge1xuICAgIHJldHVybiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSAmJiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gbnVsbCk7XG4gIH0pO1xuICB2YXIgcmVzID0gW107XG4gIGRlYnVnbG9nKFwicmVsZXZhbnQgcmVjb3JkcyBucjpcIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGgpO1xuICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgYVNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgIHZhciBtaXNtYXRjaGVkID0ge31cbiAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICBhU2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgICB2YXIgbWlzbWF0Y2hlZCA9IHt9O1xuICAgICAgICB2YXIgbWF0Y2hlZCA9IHt9O1xuICAgICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IDA7XG4gICAgICAgIGFTZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgIGlmICghV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKSkge1xuICAgICAgICAgICAgY250UmVsZXZhbnRXb3JkcyA9IGNudFJlbGV2YW50V29yZHMgKyAxO1xuICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICYmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aCA+IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aCkge1xuICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2UsXG4gICAgICAgICAgICByZWNvcmQgOiByZWNvcmQsXG4gICAgICAgICAgICBjYXRlZ29yeSA6IGNhdGVnb3J5LFxuICAgICAgICAgICAgcmVzdWx0OiByZWNvcmRbY2F0ZWdvcnldLFxuICAgICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nKG1hdGNoZWQsIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfSk7XG4gIH0pO1xuICByZXMuc29ydChjbXBCeVJlc3VsdFRoZW5SYW5raW5nKTtcbiAgcmVzID0gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0KHJlcyk7XG4gIHJldHVybiByZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhbmFseXplQ2F0ZWdvcnkoY2F0ZWdvcnl3b3JkIDogc3RyaW5nICwgYVJ1bGVzOiBBcnJheTxJTWF0Y2gubVJ1bGU+LCB3aG9sZXNlbnRlbmNlOiBzdHJpbmcpOiBzdHJpbmcge1xuICB2YXIgY2F0cyA9IElucHV0RmlsdGVyLmNhdGVnb3JpemVBV29yZChjYXRlZ29yeXdvcmQsIGFSdWxlcywgd2hvbGVzZW50ZW5jZSwge30pO1xuICAvLyBUT0RPIHF1YWxpZnlcbiAgY2F0cyA9IGNhdHMuZmlsdGVyKGZ1bmN0aW9uKGNhdCkge1xuICAgIHJldHVybiBjYXQuY2F0ZWdvcnkgPT09ICdjYXRlZ29yeSc7XG4gIH0pXG4gIGlmIChjYXRzLmxlbmd0aCkge1xuICAgIHJldHVybiBjYXRzWzBdLm1hdGNoZWRTdHJpbmc7XG4gIH1cbn1cblxuLy8gY29uc3QgcmVzdWx0ID0gV2hhdElzLnJlc29sdmVDYXRlZ29yeShjYXQsIGExLmVudGl0eSxcbi8vICAgdGhlTW9kZWwubVJ1bGVzLCB0aGVNb2RlbC50b29scywgdGhlTW9kZWwucmVjb3Jkcyk7XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlQ2F0ZWdvcnkoY2F0ZWdvcnk6IHN0cmluZywgY29udGV4dFF1ZXJ5U3RyaW5nOiBzdHJpbmcsXG4gIGFSdWxlczogQXJyYXk8SU1hdGNoLm1SdWxlPiwgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+KTogQXJyYXk8SU1hdGNoLklXaGF0SXNBbnN3ZXI+IHtcbiAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gW107XG4gIH0gZWxzZSB7XG4gICAgdmFyIG1hdGNoZWQgPSBJbnB1dEZpbHRlci5hbmFseXplU3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgYVJ1bGVzKTtcbiAgICBkZWJ1Z2xvZyhcImFmdGVyIG1hdGNoZWQgXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkKSk7XG4gICAgdmFyIGFTZW50ZW5jZXMgPSBJbnB1dEZpbHRlci5leHBhbmRNYXRjaEFycihtYXRjaGVkKTtcbiAgICBkZWJ1Z2xvZyhcImFmdGVyIGV4cGFuZFwiICsgYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gSW5wdXRGaWx0ZXIucmVpbkZvcmNlKGFTZW50ZW5jZXMpO1xuICAgIC8vYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24ob1NlbnRlbmNlKSB7IHJldHVybiBJbnB1dEZpbHRlci5yZWluRm9yY2Uob1NlbnRlbmNlKTsgfSk7XG4gICAgZGVidWdsb2coXCJhZnRlciByZWluZm9yY2VcIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgICB2YXIgbWF0Y2hlZEFuc3dlcnMgPSBtYXRjaFJlY29yZHMoYVNlbnRlbmNlcywgY2F0ZWdvcnksIHJlY29yZHMpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8qIG9iamVjdHN0cmVhbSovIHtcbiAgICBkZWJ1Z2xvZyhcIiBtYXRjaGVkQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMsIHVuZGVmaW5lZCwgMikpO1xuICAgIHJldHVybiBtYXRjaGVkQW5zd2VycztcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyT25seVRvcFJhbmtlZChyZXN1bHRzOiBBcnJheTxJTWF0Y2guSVdoYXRJc0Fuc3dlcj4pOiBBcnJheTxJTWF0Y2guSVdoYXRJc0Fuc3dlcj4ge1xuICB2YXIgcmVzID0gcmVzdWx0cy5maWx0ZXIoZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgIGlmIChyZXN1bHQuX3JhbmtpbmcgPT09IHJlc3VsdHNbMF0uX3JhbmtpbmcpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiggcmVzdWx0Ll9yYW5raW5nID49IHJlc3VsdHNbMF0uX3JhbmtpbmcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkxpc3QgdG8gZmlsdGVyIG11c3QgYmUgb3JkZXJlZFwiKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbiAgcmV0dXJuIHJlcztcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdChyZXN1bHRzOiBBcnJheTxJTWF0Y2guSVdoYXRJc0Fuc3dlcj4pOiBzdHJpbmcge1xuICB2YXIgY250ID0gcmVzdWx0cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHJlc3VsdCkge1xuICAgIGlmIChyZXN1bHQuX3JhbmtpbmcgPT09IHJlc3VsdHNbMF0uX3JhbmtpbmcpIHtcbiAgICAgIHJldHVybiBwcmV2ICsgMTtcbiAgICB9XG4gIH0sIDApO1xuICBpZiAoY250ID4gMSkge1xuICAgIC8vIHNlYXJjaCBmb3IgYSBkaXNjcmltaW5hdGluZyBjYXRlZ29yeSB2YWx1ZVxuICAgIHZhciBkaXNjcmltaW5hdGluZyA9IE9iamVjdC5rZXlzKHJlc3VsdHNbMF0ucmVjb3JkKS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGNhdGVnb3J5KSB7XG4gICAgICBpZiAoKGNhdGVnb3J5LmNoYXJBdCgwKSAhPT0gJ18nICYmIGNhdGVnb3J5ICE9PSByZXN1bHRzWzBdLmNhdGVnb3J5KVxuICAgICAgICAmJiAocmVzdWx0c1swXS5yZWNvcmRbY2F0ZWdvcnldICE9PSByZXN1bHRzWzFdLnJlY29yZFtjYXRlZ29yeV0pKSB7XG4gICAgICAgIHByZXYucHVzaChjYXRlZ29yeSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJldjtcbiAgICB9LCBbXSk7XG4gICAgaWYgKGRpc2NyaW1pbmF0aW5nLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIFwiTWFueSBjb21wYXJhYmxlIHJlc3VsdHMsIHBlcmhhcHMgeW91IHdhbnQgdG8gc3BlY2lmeSBhIGRpc2NyaW1pbmF0aW5nIFwiICsgZGlzY3JpbWluYXRpbmcuam9pbignLCcpO1xuICAgIH1cbiAgICByZXR1cm4gJ1lvdXIgcXVlc3Rpb24gZG9lcyBub3QgaGF2ZSBhIHNwZWNpZmNpIGFuc3dlcic7XG4gIH1cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbiIsIi8qKlxuICpcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmFuYWx5emVcbiAqIEBmaWxlIGFuYWx5emUudHNcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cbiAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgSW5wdXRGaWx0ZXIgPSByZXF1aXJlKCcuL2lucHV0RmlsdGVyJyk7XG52YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpO1xudmFyIGRlYnVnbG9nID0gZGVidWcoJ3doYXRpcycpO1xudmFyIFNlbnRlbmNlID0gcmVxdWlyZSgnLi9zZW50ZW5jZScpO1xudmFyIFdvcmQgPSByZXF1aXJlKCcuL3dvcmQnKTtcbmZ1bmN0aW9uIGNtcEJ5UmVzdWx0VGhlblJhbmtpbmcoYSwgYikge1xuICAgIHZhciBjbXAgPSBhLnJlc3VsdC5sb2NhbGVDb21wYXJlKGIucmVzdWx0KTtcbiAgICBpZiAoY21wKSB7XG4gICAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuICAgIHJldHVybiAtKGEuX3JhbmtpbmcgLSBiLl9yYW5raW5nKTtcbn1cbmV4cG9ydHMuY21wQnlSZXN1bHRUaGVuUmFua2luZyA9IGNtcEJ5UmVzdWx0VGhlblJhbmtpbmc7XG5mdW5jdGlvbiBjbXBCeVJhbmtpbmcoYSwgYikge1xuICAgIHZhciBjbXAgPSAtKGEuX3JhbmtpbmcgLSBiLl9yYW5raW5nKTtcbiAgICBpZiAoY21wKSB7XG4gICAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuICAgIGNtcCA9IGEucmVzdWx0LmxvY2FsZUNvbXBhcmUoYi5yZXN1bHQpO1xuICAgIGlmIChjbXApIHtcbiAgICAgICAgcmV0dXJuIGNtcDtcbiAgICB9XG4gICAgLy8gYXJlIHJlY29yZHMgZGlmZmVyZW50P1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYS5yZWNvcmQpLmNvbmNhdChPYmplY3Qua2V5cyhiLnJlY29yZCkpLnNvcnQoKTtcbiAgICB2YXIgcmVzID0ga2V5cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHNLZXkpIHtcbiAgICAgICAgaWYgKHByZXYpIHtcbiAgICAgICAgICAgIHJldHVybiBwcmV2O1xuICAgICAgICB9XG4gICAgICAgIGlmIChiLnJlY29yZFtzS2V5XSAhPT0gYS5yZWNvcmRbc0tleV0pIHtcbiAgICAgICAgICAgIGlmICghYi5yZWNvcmRbc0tleV0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWEucmVjb3JkW3NLZXldKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICsxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGEucmVjb3JkW3NLZXldLmxvY2FsZUNvbXBhcmUoYi5yZWNvcmRbc0tleV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAwO1xuICAgIH0sIDApO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmNtcEJ5UmFua2luZyA9IGNtcEJ5UmFua2luZztcbmZ1bmN0aW9uIGR1bXBOaWNlKGFuc3dlcikge1xuICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgIHM6IFwiXCIsXG4gICAgICAgIHB1c2g6IGZ1bmN0aW9uIChzKSB7IHRoaXMucyA9IHRoaXMucyArIHM7IH1cbiAgICB9O1xuICAgIHZhciBzID0gXCIqKlJlc3VsdCBmb3IgY2F0ZWdvcnk6IFwiICsgYW5zd2VyLmNhdGVnb3J5ICsgXCIgaXMgXCIgKyBhbnN3ZXIucmVzdWx0ICsgXCJcXG4gcmFuazogXCIgKyBhbnN3ZXIuX3JhbmtpbmcgKyBcIlxcblwiO1xuICAgIHJlc3VsdC5wdXNoKHMpO1xuICAgIE9iamVjdC5rZXlzKGFuc3dlci5yZWNvcmQpLmZvckVhY2goZnVuY3Rpb24gKHNSZXF1aXJlcywgaW5kZXgpIHtcbiAgICAgICAgaWYgKHNSZXF1aXJlcy5jaGFyQXQoMCkgIT09ICdfJykge1xuICAgICAgICAgICAgcmVzdWx0LnB1c2goXCJyZWNvcmQ6IFwiICsgc1JlcXVpcmVzICsgXCIgLT4gXCIgKyBhbnN3ZXIucmVjb3JkW3NSZXF1aXJlc10pO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdC5wdXNoKCdcXG4nKTtcbiAgICB9KTtcbiAgICB2YXIgb1NlbnRlbmNlID0gYW5zd2VyLnNlbnRlbmNlO1xuICAgIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaW5kZXgpIHtcbiAgICAgICAgdmFyIHNXb3JkID0gXCJbXCIgKyBpbmRleCArIFwiXSA6IFwiICsgb1dvcmQuY2F0ZWdvcnkgKyBcIiBcXFwiXCIgKyBvV29yZC5zdHJpbmcgKyBcIlxcXCIgPT4gXFxcIlwiICsgb1dvcmQubWF0Y2hlZFN0cmluZyArIFwiXFxcIlwiO1xuICAgICAgICByZXN1bHQucHVzaChzV29yZCArIFwiXFxuXCIpO1xuICAgIH0pO1xuICAgIHJlc3VsdC5wdXNoKFwiLlxcblwiKTtcbiAgICByZXR1cm4gcmVzdWx0LnM7XG59XG5leHBvcnRzLmR1bXBOaWNlID0gZHVtcE5pY2U7XG5mdW5jdGlvbiBkdW1wV2VpZ2h0c1RvcCh0b29sbWF0Y2hlcywgb3B0aW9ucykge1xuICAgIHZhciBzID0gJyc7XG4gICAgdG9vbG1hdGNoZXMuZm9yRWFjaChmdW5jdGlvbiAob01hdGNoLCBpbmRleCkge1xuICAgICAgICBpZiAoaW5kZXggPCBvcHRpb25zLnRvcCkge1xuICAgICAgICAgICAgcyA9IHMgKyBcIldoYXRJc0Fuc3dlcltcIiArIGluZGV4ICsgXCJdLi4uXFxuXCI7XG4gICAgICAgICAgICBzID0gcyArIGR1bXBOaWNlKG9NYXRjaCk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcztcbn1cbmV4cG9ydHMuZHVtcFdlaWdodHNUb3AgPSBkdW1wV2VpZ2h0c1RvcDtcbmZ1bmN0aW9uIGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdChyZXMpIHtcbiAgICB2YXIgcmVzdWx0ID0gcmVzLmZpbHRlcihmdW5jdGlvbiAoaVJlcywgaW5kZXgpIHtcbiAgICAgICAgZGVidWdsb2coaW5kZXggKyAnICcgKyBKU09OLnN0cmluZ2lmeShpUmVzKSk7XG4gICAgICAgIGlmIChpUmVzLnJlc3VsdCA9PT0gKHJlc1tpbmRleCAtIDFdICYmIHJlc1tpbmRleCAtIDFdLnJlc3VsdCkpIHtcbiAgICAgICAgICAgIGRlYnVnbG9nKCdza2lwJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gICAgcmVzdWx0LnNvcnQoY21wQnlSYW5raW5nKTtcbiAgICByZXR1cm4gcmVzdWx0O1xufVxuZXhwb3J0cy5maWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHQgPSBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHQ7XG52YXIgTWF0Y2ggPSByZXF1aXJlKCcuL21hdGNoJyk7XG5mdW5jdGlvbiBjYWxjUmFua2luZyhtYXRjaGVkLCBtaXNtYXRjaGVkLCByZWxldmFudENvdW50KSB7XG4gICAgdmFyIGxlbk1hdGNoZWQgPSBPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGg7XG4gICAgdmFyIGZhY3RvciA9IE1hdGNoLmNhbGNSYW5raW5nUHJvZHVjdChtYXRjaGVkKTtcbiAgICBmYWN0b3IgKj0gTWF0aC5wb3coMS41LCBsZW5NYXRjaGVkKTtcbiAgICB2YXIgbGVuTWlzTWF0Y2hlZCA9IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aDtcbiAgICB2YXIgZmFjdG9yMiA9IE1hdGNoLmNhbGNSYW5raW5nUHJvZHVjdChtaXNtYXRjaGVkKTtcbiAgICBmYWN0b3IyICo9IE1hdGgucG93KDAuNCwgbGVuTWlzTWF0Y2hlZCk7XG4gICAgcmV0dXJuIE1hdGgucG93KGZhY3RvcjIgKiBmYWN0b3IsIDEgLyAobGVuTWlzTWF0Y2hlZCArIGxlbk1hdGNoZWQpKTtcbn1cbmV4cG9ydHMuY2FsY1JhbmtpbmcgPSBjYWxjUmFua2luZztcbmZ1bmN0aW9uIGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkobWF0Y2hlZCwgaGFzQ2F0ZWdvcnksIG1pc21hdGNoZWQsIHJlbGV2YW50Q291bnQpIHtcbiAgICB2YXIgbGVuTWF0Y2hlZCA9IE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aDtcbiAgICB2YXIgZmFjdG9yID0gTWF0Y2guY2FsY1JhbmtpbmdQcm9kdWN0KG1hdGNoZWQpO1xuICAgIGZhY3RvciAqPSBNYXRoLnBvdygxLjUsIGxlbk1hdGNoZWQpO1xuICAgIHZhciBsZW5IYXNDYXRlZ29yeSA9IE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5sZW5ndGg7XG4gICAgdmFyIGZhY3RvckggPSBNYXRoLnBvdygxLjIsIGxlbkhhc0NhdGVnb3J5KTtcbiAgICB2YXIgbGVuTWlzTWF0Y2hlZCA9IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aDtcbiAgICB2YXIgZmFjdG9yMiA9IE1hdGNoLmNhbGNSYW5raW5nUHJvZHVjdChtaXNtYXRjaGVkKTtcbiAgICBmYWN0b3IyICo9IE1hdGgucG93KDAuNCwgbGVuTWlzTWF0Y2hlZCk7XG4gICAgcmV0dXJuIE1hdGgucG93KGZhY3RvcjIgKiBmYWN0b3JIICogZmFjdG9yLCAxIC8gKGxlbk1pc01hdGNoZWQgKyBsZW5IYXNDYXRlZ29yeSArIGxlbk1hdGNoZWQpKTtcbn1cbmV4cG9ydHMuY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeSA9IGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnk7XG4vKipcbiAqIGxpc3QgYWxsIHRvcCBsZXZlbCByYW5raW5nc1xuICovXG5mdW5jdGlvbiBtYXRjaFJlY29yZHNIYXZpbmdDb250ZXh0KGFTZW50ZW5jZXMsIGNhdGVnb3J5LCByZWNvcmRzKSB7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnldICE9PSBudWxsKTtcbiAgICB9KTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgZGVidWdsb2coXCJyZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCk7XG4gICAgZGVidWdsb2coXCJzZW50ZW5jZXMgYXJlIDogXCIgKyBKU09OLnN0cmluZ2lmeShhU2VudGVuY2VzLCB1bmRlZmluZWQsIDIpKTtcbiAgICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgIGFTZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICAgICAgICB2YXIgbWlzbWF0Y2hlZCA9IHt9O1xuICAgICAgICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgICAgICAgIHZhciBoYXNDYXRlZ29yeSA9IHt9O1xuICAgICAgICAgICAgYVNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgICAgICAgICAgICB2YXIgbWlzbWF0Y2hlZCA9IHt9O1xuICAgICAgICAgICAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICAgICAgICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSAwO1xuICAgICAgICAgICAgICAgIGFTZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNudFJlbGV2YW50V29yZHMgPSBjbnRSZWxldmFudFdvcmRzICsgMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKSAmJiByZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNDYXRlZ29yeVtvV29yZC5tYXRjaGVkU3RyaW5nXSA9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAoKE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aCArIE9iamVjdC5rZXlzKGhhc0NhdGVnb3J5KS5sZW5ndGgpID4gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDogcmVjb3JkW2NhdGVnb3J5XSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmVzLnNvcnQoY21wQnlSZXN1bHRUaGVuUmFua2luZyk7XG4gICAgcmVzID0gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0KHJlcyk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMubWF0Y2hSZWNvcmRzSGF2aW5nQ29udGV4dCA9IG1hdGNoUmVjb3Jkc0hhdmluZ0NvbnRleHQ7XG5mdW5jdGlvbiBtYXRjaFJlY29yZHMoYVNlbnRlbmNlcywgY2F0ZWdvcnksIHJlY29yZHMpIHtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRzLCB1bmRlZmluZWQsIDIpKTtcbiAgICB2YXIgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICByZXR1cm4gKHJlY29yZFtjYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkgJiYgKHJlY29yZFtjYXRlZ29yeV0gIT09IG51bGwpO1xuICAgIH0pO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBkZWJ1Z2xvZyhcInJlbGV2YW50IHJlY29yZHMgbnI6XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoKTtcbiAgICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgIGFTZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICAgICAgICB2YXIgbWlzbWF0Y2hlZCA9IHt9O1xuICAgICAgICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgICAgICAgIGFTZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAoYVNlbnRlbmNlKSB7XG4gICAgICAgICAgICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fTtcbiAgICAgICAgICAgICAgICB2YXIgbWF0Y2hlZCA9IHt9O1xuICAgICAgICAgICAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gMDtcbiAgICAgICAgICAgICAgICBhU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbnRSZWxldmFudFdvcmRzID0gY250UmVsZXZhbnRXb3JkcyArIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBpZiAoT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoID4gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDogcmVjb3JkW2NhdGVnb3J5XSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZyhtYXRjaGVkLCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmVzLnNvcnQoY21wQnlSZXN1bHRUaGVuUmFua2luZyk7XG4gICAgcmVzID0gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0KHJlcyk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMubWF0Y2hSZWNvcmRzID0gbWF0Y2hSZWNvcmRzO1xuZnVuY3Rpb24gYW5hbHl6ZUNhdGVnb3J5KGNhdGVnb3J5d29yZCwgYVJ1bGVzLCB3aG9sZXNlbnRlbmNlKSB7XG4gICAgdmFyIGNhdHMgPSBJbnB1dEZpbHRlci5jYXRlZ29yaXplQVdvcmQoY2F0ZWdvcnl3b3JkLCBhUnVsZXMsIHdob2xlc2VudGVuY2UsIHt9KTtcbiAgICAvLyBUT0RPIHF1YWxpZnlcbiAgICBjYXRzID0gY2F0cy5maWx0ZXIoZnVuY3Rpb24gKGNhdCkge1xuICAgICAgICByZXR1cm4gY2F0LmNhdGVnb3J5ID09PSAnY2F0ZWdvcnknO1xuICAgIH0pO1xuICAgIGlmIChjYXRzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gY2F0c1swXS5tYXRjaGVkU3RyaW5nO1xuICAgIH1cbn1cbmV4cG9ydHMuYW5hbHl6ZUNhdGVnb3J5ID0gYW5hbHl6ZUNhdGVnb3J5O1xuLy8gY29uc3QgcmVzdWx0ID0gV2hhdElzLnJlc29sdmVDYXRlZ29yeShjYXQsIGExLmVudGl0eSxcbi8vICAgdGhlTW9kZWwubVJ1bGVzLCB0aGVNb2RlbC50b29scywgdGhlTW9kZWwucmVjb3Jkcyk7XG5mdW5jdGlvbiByZXNvbHZlQ2F0ZWdvcnkoY2F0ZWdvcnksIGNvbnRleHRRdWVyeVN0cmluZywgYVJ1bGVzLCByZWNvcmRzKSB7XG4gICAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdmFyIG1hdGNoZWQgPSBJbnB1dEZpbHRlci5hbmFseXplU3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgYVJ1bGVzKTtcbiAgICAgICAgZGVidWdsb2coXCJhZnRlciBtYXRjaGVkIFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZCkpO1xuICAgICAgICB2YXIgYVNlbnRlbmNlcyA9IElucHV0RmlsdGVyLmV4cGFuZE1hdGNoQXJyKG1hdGNoZWQpO1xuICAgICAgICBkZWJ1Z2xvZyhcImFmdGVyIGV4cGFuZFwiICsgYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICAgICAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBJbnB1dEZpbHRlci5yZWluRm9yY2UoYVNlbnRlbmNlcyk7XG4gICAgICAgIC8vYVNlbnRlbmNlcy5tYXAoZnVuY3Rpb24ob1NlbnRlbmNlKSB7IHJldHVybiBJbnB1dEZpbHRlci5yZWluRm9yY2Uob1NlbnRlbmNlKTsgfSk7XG4gICAgICAgIGRlYnVnbG9nKFwiYWZ0ZXIgcmVpbmZvcmNlXCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5tYXAoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICAgICAgcmV0dXJuIFNlbnRlbmNlLnJhbmtpbmdQcm9kdWN0KG9TZW50ZW5jZSkgKyBcIjpcIiArIEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZSk7XG4gICAgICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICAgICAgICB2YXIgbWF0Y2hlZEFuc3dlcnMgPSBtYXRjaFJlY29yZHMoYVNlbnRlbmNlcywgY2F0ZWdvcnksIHJlY29yZHMpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8qIG9iamVjdHN0cmVhbSovIHtcbiAgICAgICAgZGVidWdsb2coXCIgbWF0Y2hlZEFuc3dlcnNcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRBbnN3ZXJzLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgcmV0dXJuIG1hdGNoZWRBbnN3ZXJzO1xuICAgIH1cbn1cbmV4cG9ydHMucmVzb2x2ZUNhdGVnb3J5ID0gcmVzb2x2ZUNhdGVnb3J5O1xuZnVuY3Rpb24gZmlsdGVyT25seVRvcFJhbmtlZChyZXN1bHRzKSB7XG4gICAgdmFyIHJlcyA9IHJlc3VsdHMuZmlsdGVyKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgaWYgKHJlc3VsdC5fcmFua2luZyA9PT0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlc3VsdC5fcmFua2luZyA+PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJMaXN0IHRvIGZpbHRlciBtdXN0IGJlIG9yZGVyZWRcIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmZpbHRlck9ubHlUb3BSYW5rZWQgPSBmaWx0ZXJPbmx5VG9wUmFua2VkO1xuZnVuY3Rpb24gaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdChyZXN1bHRzKSB7XG4gICAgdmFyIGNudCA9IHJlc3VsdHMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCByZXN1bHQpIHtcbiAgICAgICAgaWYgKHJlc3VsdC5fcmFua2luZyA9PT0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgICAgICAgcmV0dXJuIHByZXYgKyAxO1xuICAgICAgICB9XG4gICAgfSwgMCk7XG4gICAgaWYgKGNudCA+IDEpIHtcbiAgICAgICAgLy8gc2VhcmNoIGZvciBhIGRpc2NyaW1pbmF0aW5nIGNhdGVnb3J5IHZhbHVlXG4gICAgICAgIHZhciBkaXNjcmltaW5hdGluZyA9IE9iamVjdC5rZXlzKHJlc3VsdHNbMF0ucmVjb3JkKS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGNhdGVnb3J5KSB7XG4gICAgICAgICAgICBpZiAoKGNhdGVnb3J5LmNoYXJBdCgwKSAhPT0gJ18nICYmIGNhdGVnb3J5ICE9PSByZXN1bHRzWzBdLmNhdGVnb3J5KVxuICAgICAgICAgICAgICAgICYmIChyZXN1bHRzWzBdLnJlY29yZFtjYXRlZ29yeV0gIT09IHJlc3VsdHNbMV0ucmVjb3JkW2NhdGVnb3J5XSkpIHtcbiAgICAgICAgICAgICAgICBwcmV2LnB1c2goY2F0ZWdvcnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgICAgIH0sIFtdKTtcbiAgICAgICAgaWYgKGRpc2NyaW1pbmF0aW5nLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIFwiTWFueSBjb21wYXJhYmxlIHJlc3VsdHMsIHBlcmhhcHMgeW91IHdhbnQgdG8gc3BlY2lmeSBhIGRpc2NyaW1pbmF0aW5nIFwiICsgZGlzY3JpbWluYXRpbmcuam9pbignLCcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnWW91ciBxdWVzdGlvbiBkb2VzIG5vdCBoYXZlIGEgc3BlY2lmY2kgYW5zd2VyJztcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbmV4cG9ydHMuaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdCA9IGlzSW5kaXNjcmltaW5hdGVSZXN1bHQ7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
