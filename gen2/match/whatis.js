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
var perflog = debug('perf');
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
function calcRankingSimple(matched, mismatched, relevantCount) {
    var factor = Math.pow(1.5, matched);
    var factor2 = Math.pow(0.4, mismatched);
    return Math.pow(factor2 * factor, 1 / (mismatched + matched));
}
exports.calcRankingSimple = calcRankingSimple;
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
        // count matches in record which are *not* the category
        aSentences.forEach(function (aSentence) {
            var hasCategory = {};
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
    res.sort(cmpByResultThenRanking);
    res = filterRetainTopRankedResult(res);
    return res;
}
exports.matchRecordsHavingContext = matchRecordsHavingContext;
function matchRecords(aSentences, category, records) {
    if (debuglog.enabled) {
        debuglog(JSON.stringify(records, undefined, 2));
    }
    var relevantRecords = records.filter(function (record) {
        return record[category] !== undefined && record[category] !== null;
    });
    var res = [];
    debuglog("relevant records nr:" + relevantRecords.length);
    relevantRecords.forEach(function (record) {
        aSentences.forEach(function (aSentence) {
            // count matches in record which are *not* the category
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
    res.sort(cmpByResultThenRanking);
    res = filterRetainTopRankedResult(res);
    return res;
}
exports.matchRecords = matchRecords;
function matchRecordsQuick(aSentences, category, records) {
    if (debuglog.enabled) {
        debuglog(JSON.stringify(records, undefined, 2));
    }
    var relevantRecords = records.filter(function (record) {
        return record[category] !== undefined && record[category] !== null;
    });
    var res = [];
    debuglog("relevant records nr:" + relevantRecords.length);
    perflog("relevant records nr:" + relevantRecords.length + " sentences " + aSentences.length);
    var aSimplifiedSentences = aSentences.map(function (oSentence) {
        var rWords = oSentence.filter(function (oWord) {
            return !Word.Word.isFiller(oWord);
        });
        return {
            oSentence: oSentence,
            cntRelevantWords: rWords.length,
            rWords: rWords
        };
    });
    relevantRecords.forEach(function (record) {
        aSimplifiedSentences.forEach(function (aSentence) {
            // count matches in record which are *not* the category
            var mismatched = 0;
            var matched = 0;
            aSentence.rWords.forEach(function (oWord) {
                if (oWord.category && record[oWord.category] !== undefined) {
                    if (oWord.matchedString === record[oWord.category]) {
                        ++matched;
                    } else {
                        ++mismatched;
                    }
                }
            });
            //console.log(JSON.stringify(aSentence.oSentence));
            if (matched > mismatched) {
                res.push({
                    sentence: aSentence.oSentence,
                    record: record,
                    category: category,
                    result: record[category],
                    _ranking: calcRankingSimple(matched, mismatched, aSentence.cntRelevantWords)
                });
            }
        });
    });
    res.sort(cmpByResultThenRanking);
    res = filterRetainTopRankedResult(res);
    return res;
}
exports.matchRecordsQuick = matchRecordsQuick;
function analyzeCategory(categoryword, aRules, wholesentence) {
    var cats = InputFilter.categorizeAWord(categoryword, aRules, wholesentence, {});
    // TODO qualify
    cats = cats.filter(function (cat) {
        return cat.category === 'category';
    });
    debuglog(JSON.stringify(cats));
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
        return 'Your question does not have a specific answer';
    }
    return undefined;
}
exports.isIndiscriminateResult = isIndiscriminateResult;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC93aGF0aXMudHMiLCJtYXRjaC93aGF0aXMuanMiXSwibmFtZXMiOlsiSW5wdXRGaWx0ZXIiLCJyZXF1aXJlIiwiZGVidWciLCJkZWJ1Z2xvZyIsInBlcmZsb2ciLCJTZW50ZW5jZSIsIldvcmQiLCJjbXBCeVJlc3VsdFRoZW5SYW5raW5nIiwiYSIsImIiLCJjbXAiLCJyZXN1bHQiLCJsb2NhbGVDb21wYXJlIiwiX3JhbmtpbmciLCJleHBvcnRzIiwiY21wQnlSYW5raW5nIiwia2V5cyIsIk9iamVjdCIsInJlY29yZCIsImNvbmNhdCIsInNvcnQiLCJyZXMiLCJyZWR1Y2UiLCJwcmV2Iiwic0tleSIsImR1bXBOaWNlIiwiYW5zd2VyIiwicyIsInB1c2giLCJjYXRlZ29yeSIsImZvckVhY2giLCJzUmVxdWlyZXMiLCJpbmRleCIsImNoYXJBdCIsIm9TZW50ZW5jZSIsInNlbnRlbmNlIiwib1dvcmQiLCJzV29yZCIsInN0cmluZyIsIm1hdGNoZWRTdHJpbmciLCJkdW1wV2VpZ2h0c1RvcCIsInRvb2xtYXRjaGVzIiwib3B0aW9ucyIsIm9NYXRjaCIsInRvcCIsImZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdCIsImZpbHRlciIsImlSZXMiLCJKU09OIiwic3RyaW5naWZ5IiwiTWF0Y2giLCJjYWxjUmFua2luZyIsIm1hdGNoZWQiLCJtaXNtYXRjaGVkIiwicmVsZXZhbnRDb3VudCIsImxlbk1hdGNoZWQiLCJsZW5ndGgiLCJmYWN0b3IiLCJjYWxjUmFua2luZ1Byb2R1Y3QiLCJNYXRoIiwicG93IiwibGVuTWlzTWF0Y2hlZCIsImZhY3RvcjIiLCJjYWxjUmFua2luZ1NpbXBsZSIsImNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkiLCJoYXNDYXRlZ29yeSIsImxlbkhhc0NhdGVnb3J5IiwiZmFjdG9ySCIsIm1hdGNoUmVjb3Jkc0hhdmluZ0NvbnRleHQiLCJhU2VudGVuY2VzIiwicmVjb3JkcyIsInVuZGVmaW5lZCIsInJlbGV2YW50UmVjb3JkcyIsImFTZW50ZW5jZSIsImNudFJlbGV2YW50V29yZHMiLCJpc0ZpbGxlciIsImlzQ2F0ZWdvcnkiLCJtYXRjaFJlY29yZHMiLCJlbmFibGVkIiwibWF0Y2hSZWNvcmRzUXVpY2siLCJhU2ltcGxpZmllZFNlbnRlbmNlcyIsIm1hcCIsInJXb3JkcyIsImFuYWx5emVDYXRlZ29yeSIsImNhdGVnb3J5d29yZCIsImFSdWxlcyIsIndob2xlc2VudGVuY2UiLCJjYXRzIiwiY2F0ZWdvcml6ZUFXb3JkIiwiY2F0IiwicmVzb2x2ZUNhdGVnb3J5IiwiY29udGV4dFF1ZXJ5U3RyaW5nIiwiYW5hbHl6ZVN0cmluZyIsImV4cGFuZE1hdGNoQXJyIiwicmFua2luZ1Byb2R1Y3QiLCJqb2luIiwiYVNlbnRlbmNlc1JlaW5mb3JjZWQiLCJyZWluRm9yY2UiLCJtYXRjaGVkQW5zd2VycyIsImZpbHRlck9ubHlUb3BSYW5rZWQiLCJyZXN1bHRzIiwiRXJyb3IiLCJpc0luZGlzY3JpbWluYXRlUmVzdWx0IiwiY250IiwiZGlzY3JpbWluYXRpbmciXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7QUNNQTs7QURFQSxJQUFZQSxjQUFXQyxRQUFNLGVBQU4sQ0FBdkI7QUFFQSxJQUFZQyxRQUFLRCxRQUFNLE9BQU4sQ0FBakI7QUFFQSxJQUFNRSxXQUFXRCxNQUFNLFFBQU4sQ0FBakI7QUFDQSxJQUFNRSxVQUFVRixNQUFNLE1BQU4sQ0FBaEI7QUFRQSxJQUFZRyxXQUFRSixRQUFNLFlBQU4sQ0FBcEI7QUFFQSxJQUFZSyxPQUFJTCxRQUFNLFFBQU4sQ0FBaEI7QUFHQSxTQUFBTSxzQkFBQSxDQUF1Q0MsQ0FBdkMsRUFBZ0VDLENBQWhFLEVBQXVGO0FBQ3JGLFFBQUlDLE1BQU1GLEVBQUVHLE1BQUYsQ0FBU0MsYUFBVCxDQUF1QkgsRUFBRUUsTUFBekIsQ0FBVjtBQUNBLFFBQUlELEdBQUosRUFBUztBQUNQLGVBQU9BLEdBQVA7QUFDRDtBQUNELFdBQU8sRUFBRUYsRUFBRUssUUFBRixHQUFhSixFQUFFSSxRQUFqQixDQUFQ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QUFDekIsbUJBQU8sMkVBQTJFZ0QsZUFBZVQsSUFBZixDQUFvQixHQUFwQixDQUFsRjtBQUNEO0FBQ0QsZUFBTywrQ0FBUDtBQUNEO0FBQ0QsV0FBT3hCLFNBQVA7QUFDRDtBQXJCZXpELFFBQUF3RixzQkFBQSxHQUFzQkEsc0JBQXRCIiwiZmlsZSI6Im1hdGNoL3doYXRpcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICpcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmFuYWx5emVcbiAqIEBmaWxlIGFuYWx5emUudHNcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cbiAqL1xuXG5cbmltcG9ydCAqIGFzIElucHV0RmlsdGVyIGZyb20gJy4vaW5wdXRGaWx0ZXInO1xuXG5pbXBvcnQgKiBhcyBkZWJ1ZyBmcm9tICdkZWJ1Zyc7XG5cbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ3doYXRpcycpO1xuY29uc3QgcGVyZmxvZyA9IGRlYnVnKCdwZXJmJyk7XG5cbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gJy4uL3V0aWxzL3V0aWxzJztcblxuaW1wb3J0ICogYXMgSU1hdGNoIGZyb20gJy4vaWZtYXRjaCc7XG5cbmltcG9ydCAqIGFzIFRvb2xtYXRjaGVyIGZyb20gJy4vdG9vbG1hdGNoZXInO1xuXG5pbXBvcnQgKiBhcyBTZW50ZW5jZSBmcm9tICcuL3NlbnRlbmNlJztcblxuaW1wb3J0ICogYXMgV29yZCBmcm9tICcuL3dvcmQnO1xuXG5cbmV4cG9ydCBmdW5jdGlvbiBjbXBCeVJlc3VsdFRoZW5SYW5raW5nKGE6IElNYXRjaC5JV2hhdElzQW5zd2VyLCBiOiBJTWF0Y2guSVdoYXRJc0Fuc3dlcikge1xuICB2YXIgY21wID0gYS5yZXN1bHQubG9jYWxlQ29tcGFyZShiLnJlc3VsdCk7XG4gIGlmIChjbXApIHtcbiAgICByZXR1cm4gY21wO1xuICB9XG4gIHJldHVybiAtKGEuX3JhbmtpbmcgLSBiLl9yYW5raW5nKTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gY21wQnlSYW5raW5nKGE6IElNYXRjaC5JV2hhdElzQW5zd2VyLCBiOiBJTWF0Y2guSVdoYXRJc0Fuc3dlcikge1xuICB2YXIgY21wID0gLShhLl9yYW5raW5nIC0gYi5fcmFua2luZyk7XG4gIGlmIChjbXApIHtcbiAgICByZXR1cm4gY21wO1xuICB9XG4gIGNtcCA9IGEucmVzdWx0LmxvY2FsZUNvbXBhcmUoYi5yZXN1bHQpO1xuICBpZiAoY21wKSB7XG4gICAgcmV0dXJuIGNtcDtcbiAgfVxuXG4gIC8vIGFyZSByZWNvcmRzIGRpZmZlcmVudD9cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhLnJlY29yZCkuY29uY2F0KE9iamVjdC5rZXlzKGIucmVjb3JkKSkuc29ydCgpO1xuICB2YXIgcmVzID0ga2V5cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHNLZXkpIHtcbiAgICBpZiAocHJldikge1xuICAgICAgcmV0dXJuIHByZXY7XG4gICAgfVxuICAgIGlmIChiLnJlY29yZFtzS2V5XSAhPT0gYS5yZWNvcmRbc0tleV0pIHtcbiAgICAgIGlmICghYi5yZWNvcmRbc0tleV0pIHtcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgfVxuICAgICAgaWYgKCFhLnJlY29yZFtzS2V5XSkge1xuICAgICAgICByZXR1cm4gKzE7XG4gICAgICB9XG4gICAgICByZXR1cm4gYS5yZWNvcmRbc0tleV0ubG9jYWxlQ29tcGFyZShiLnJlY29yZFtzS2V5XSk7XG4gICAgfVxuICAgIHJldHVybiAwO1xuICB9LCAwKTtcbiAgcmV0dXJuIHJlcztcbn1cblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBkdW1wTmljZShhbnN3ZXI6IElNYXRjaC5JV2hhdElzQW5zd2VyKSB7XG4gIHZhciByZXN1bHQgPSB7XG4gICAgczogXCJcIixcbiAgICBwdXNoOiBmdW5jdGlvbiAocykgeyB0aGlzLnMgPSB0aGlzLnMgKyBzOyB9XG4gIH07XG4gIHZhciBzID1cbiAgICBgKipSZXN1bHQgZm9yIGNhdGVnb3J5OiAke2Fuc3dlci5jYXRlZ29yeX0gaXMgJHthbnN3ZXIucmVzdWx0fVxuIHJhbms6ICR7YW5zd2VyLl9yYW5raW5nfVxuYDtcbiAgcmVzdWx0LnB1c2gocyk7XG4gIE9iamVjdC5rZXlzKGFuc3dlci5yZWNvcmQpLmZvckVhY2goZnVuY3Rpb24gKHNSZXF1aXJlcywgaW5kZXgpIHtcbiAgICBpZiAoc1JlcXVpcmVzLmNoYXJBdCgwKSAhPT0gJ18nKSB7XG4gICAgICByZXN1bHQucHVzaChgcmVjb3JkOiAke3NSZXF1aXJlc30gLT4gJHthbnN3ZXIucmVjb3JkW3NSZXF1aXJlc119YCk7XG4gICAgfVxuICAgIHJlc3VsdC5wdXNoKCdcXG4nKTtcbiAgfSk7XG4gIHZhciBvU2VudGVuY2UgPSBhbnN3ZXIuc2VudGVuY2U7XG4gIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCwgaW5kZXgpIHtcbiAgICB2YXIgc1dvcmQgPSBgWyR7aW5kZXh9XSA6ICR7b1dvcmQuY2F0ZWdvcnl9IFwiJHtvV29yZC5zdHJpbmd9XCIgPT4gXCIke29Xb3JkLm1hdGNoZWRTdHJpbmd9XCJgXG4gICAgcmVzdWx0LnB1c2goc1dvcmQgKyBcIlxcblwiKTtcbiAgfSlcbiAgcmVzdWx0LnB1c2goXCIuXFxuXCIpO1xuICByZXR1cm4gcmVzdWx0LnM7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGR1bXBXZWlnaHRzVG9wKHRvb2xtYXRjaGVzOiBBcnJheTxJTWF0Y2guSVdoYXRJc0Fuc3dlcj4sIG9wdGlvbnM6IGFueSkge1xuICB2YXIgcyA9ICcnO1xuICB0b29sbWF0Y2hlcy5mb3JFYWNoKGZ1bmN0aW9uIChvTWF0Y2gsIGluZGV4KSB7XG4gICAgaWYgKGluZGV4IDwgb3B0aW9ucy50b3ApIHtcbiAgICAgIHMgPSBzICsgXCJXaGF0SXNBbnN3ZXJbXCIgKyBpbmRleCArIFwiXS4uLlxcblwiO1xuICAgICAgcyA9IHMgKyBkdW1wTmljZShvTWF0Y2gpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0KHJlczogQXJyYXk8SU1hdGNoLklXaGF0SXNBbnN3ZXI+KTogQXJyYXk8SU1hdGNoLklXaGF0SXNBbnN3ZXI+IHtcbiAgdmFyIHJlc3VsdCA9IHJlcy5maWx0ZXIoZnVuY3Rpb24gKGlSZXMsIGluZGV4KSB7XG4gICAgZGVidWdsb2coaW5kZXggKyAnICcgKyBKU09OLnN0cmluZ2lmeShpUmVzKSk7XG4gICAgaWYgKGlSZXMucmVzdWx0ID09PSAocmVzW2luZGV4IC0gMV0gJiYgcmVzW2luZGV4IC0gMV0ucmVzdWx0KSkge1xuICAgICAgZGVidWdsb2coJ3NraXAnKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH0pO1xuICByZXN1bHQuc29ydChjbXBCeVJhbmtpbmcpO1xuICByZXR1cm4gcmVzdWx0O1xufVxuXG5pbXBvcnQgKiBhcyBNYXRjaCBmcm9tICcuL21hdGNoJztcblxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNSYW5raW5nKG1hdGNoZWQ6IHsgW2tleTogc3RyaW5nXTogSU1hdGNoLklXb3JkIH0sXG4gIG1pc21hdGNoZWQ6IHsgW2tleTogc3RyaW5nXTogSU1hdGNoLklXb3JkIH0sIHJlbGV2YW50Q291bnQ6IG51bWJlcik6IG51bWJlciB7XG5cbiAgdmFyIGxlbk1hdGNoZWQgPSBPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGg7XG4gIHZhciBmYWN0b3IgPSBNYXRjaC5jYWxjUmFua2luZ1Byb2R1Y3QobWF0Y2hlZCk7XG4gIGZhY3RvciAqPSBNYXRoLnBvdygxLjUsIGxlbk1hdGNoZWQpO1xuXG4gIHZhciBsZW5NaXNNYXRjaGVkID0gT2JqZWN0LmtleXMobWlzbWF0Y2hlZCkubGVuZ3RoO1xuICB2YXIgZmFjdG9yMiA9IE1hdGNoLmNhbGNSYW5raW5nUHJvZHVjdChtaXNtYXRjaGVkKTtcbiAgZmFjdG9yMiAqPSBNYXRoLnBvdygwLjQsIGxlbk1pc01hdGNoZWQpO1xuXG4gIHJldHVybiBNYXRoLnBvdyhmYWN0b3IyICogZmFjdG9yLCAxIC8gKGxlbk1pc01hdGNoZWQgKyBsZW5NYXRjaGVkKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjYWxjUmFua2luZ1NpbXBsZShtYXRjaGVkOiBudW1iZXIsXG4gIG1pc21hdGNoZWQ6IG51bWJlcixcbiAgcmVsZXZhbnRDb3VudDogbnVtYmVyKTogbnVtYmVyIHtcbiAgdmFyIGZhY3RvciA9IE1hdGgucG93KDEuNSwgbWF0Y2hlZCk7XG4gIHZhciBmYWN0b3IyID0gTWF0aC5wb3coMC40LCBtaXNtYXRjaGVkKTtcbiAgcmV0dXJuIE1hdGgucG93KGZhY3RvcjIgKiBmYWN0b3IsIDEgLyAobWlzbWF0Y2hlZCArIG1hdGNoZWQpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkobWF0Y2hlZDogeyBba2V5OiBzdHJpbmddOiBJTWF0Y2guSVdvcmQgfSxcbiAgaGFzQ2F0ZWdvcnk6IHsgW2tleTogc3RyaW5nXTogbnVtYmVyIH0sXG4gIG1pc21hdGNoZWQ6IHsgW2tleTogc3RyaW5nXTogSU1hdGNoLklXb3JkIH0sIHJlbGV2YW50Q291bnQ6IG51bWJlcik6IG51bWJlciB7XG5cblxuICB2YXIgbGVuTWF0Y2hlZCA9IE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aDtcbiAgdmFyIGZhY3RvciA9IE1hdGNoLmNhbGNSYW5raW5nUHJvZHVjdChtYXRjaGVkKTtcbiAgZmFjdG9yICo9IE1hdGgucG93KDEuNSwgbGVuTWF0Y2hlZCk7XG5cbiAgdmFyIGxlbkhhc0NhdGVnb3J5ID0gT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aDtcbiAgdmFyIGZhY3RvckggPSBNYXRoLnBvdygxLjIsIGxlbkhhc0NhdGVnb3J5KTtcblxuICB2YXIgbGVuTWlzTWF0Y2hlZCA9IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aDtcbiAgdmFyIGZhY3RvcjIgPSBNYXRjaC5jYWxjUmFua2luZ1Byb2R1Y3QobWlzbWF0Y2hlZCk7XG4gIGZhY3RvcjIgKj0gTWF0aC5wb3coMC40LCBsZW5NaXNNYXRjaGVkKTtcblxuICByZXR1cm4gTWF0aC5wb3coZmFjdG9yMiAqIGZhY3RvckggKiBmYWN0b3IsIDEgLyAobGVuTWlzTWF0Y2hlZCArIGxlbkhhc0NhdGVnb3J5ICsgbGVuTWF0Y2hlZCkpO1xufVxuXG4vKipcbiAqIGxpc3QgYWxsIHRvcCBsZXZlbCByYW5raW5nc1xuICovXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hSZWNvcmRzSGF2aW5nQ29udGV4dChcbiAgYVNlbnRlbmNlczogQXJyYXk8SU1hdGNoLklTZW50ZW5jZT4sIGNhdGVnb3J5OiBzdHJpbmcsIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPilcbiAgOiBBcnJheTxJTWF0Y2guSVdoYXRJc0Fuc3dlcj4ge1xuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRzLCB1bmRlZmluZWQsIDIpKTtcbiAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQ6IElNYXRjaC5JUmVjb3JkKSB7XG4gICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnldICE9PSBudWxsKTtcbiAgfSk7XG4gIHZhciByZXMgPSBbXTtcbiAgZGVidWdsb2coXCJyZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCk7XG4gIGRlYnVnbG9nKFwic2VudGVuY2VzIGFyZSA6IFwiICsgSlNPTi5zdHJpbmdpZnkoYVNlbnRlbmNlcywgdW5kZWZpbmVkLCAyKSk7XG4gIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgYVNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgIHZhciBoYXNDYXRlZ29yeSA9IHt9O1xuICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fTtcbiAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IDA7XG4gICAgICBhU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgaWYgKCFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpKSB7XG4gICAgICAgICAgY250UmVsZXZhbnRXb3JkcyA9IGNudFJlbGV2YW50V29yZHMgKyAxO1xuICAgICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmIChXb3JkLldvcmQuaXNDYXRlZ29yeShvV29yZCkgJiYgcmVjb3JkW29Xb3JkLm1hdGNoZWRTdHJpbmddKSB7XG4gICAgICAgICAgICBoYXNDYXRlZ29yeVtvV29yZC5tYXRjaGVkU3RyaW5nXSA9IDE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGlmICgoT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoICsgT2JqZWN0LmtleXMoaGFzQ2F0ZWdvcnkpLmxlbmd0aCkgPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2UsXG4gICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxuICAgICAgICAgIHJlc3VsdDogcmVjb3JkW2NhdGVnb3J5XSxcbiAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSlcbiAgfSk7XG4gIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmcpO1xuICByZXMgPSBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHQocmVzKTtcbiAgcmV0dXJuIHJlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVjb3JkcyhhU2VudGVuY2VzOiBBcnJheTxJTWF0Y2guSVNlbnRlbmNlPiwgY2F0ZWdvcnk6IHN0cmluZywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+KVxuICA6IEFycmF5PElNYXRjaC5JV2hhdElzQW5zd2VyPiB7XG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gIH1cbiAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQ6IElNYXRjaC5JUmVjb3JkKSB7XG4gICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnldICE9PSBudWxsKTtcbiAgfSk7XG4gIHZhciByZXMgPSBbXTtcbiAgZGVidWdsb2coXCJyZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCk7XG4gIHJlbGV2YW50UmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICBhU2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fVxuICAgICAgdmFyIG1hdGNoZWQgPSB7fTtcbiAgICAgIHZhciBjbnRSZWxldmFudFdvcmRzID0gMDtcbiAgICAgIGFTZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICBpZiAoIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCkpIHtcbiAgICAgICAgICBjbnRSZWxldmFudFdvcmRzID0gY250UmVsZXZhbnRXb3JkcyArIDE7XG4gICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICYmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICBtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbWlzbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgaWYgKE9iamVjdC5rZXlzKG1hdGNoZWQpLmxlbmd0aCA+IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aCkge1xuICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgc2VudGVuY2U6IGFTZW50ZW5jZSxcbiAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgcmVzdWx0OiByZWNvcmRbY2F0ZWdvcnldLFxuICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZyhtYXRjaGVkLCBtaXNtYXRjaGVkLCBjbnRSZWxldmFudFdvcmRzKVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KVxuICB9KTtcbiAgcmVzLnNvcnQoY21wQnlSZXN1bHRUaGVuUmFua2luZyk7XG4gIHJlcyA9IGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdChyZXMpO1xuICByZXR1cm4gcmVzO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFJlY29yZHNRdWljayhhU2VudGVuY2VzOiBBcnJheTxJTWF0Y2guSVNlbnRlbmNlPiwgY2F0ZWdvcnk6IHN0cmluZywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+KVxuICA6IEFycmF5PElNYXRjaC5JV2hhdElzQW5zd2VyPiB7XG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gIH1cbiAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQ6IElNYXRjaC5JUmVjb3JkKSB7XG4gICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnldICE9PSBudWxsKTtcbiAgfSk7XG4gIHZhciByZXMgPSBbXTtcbiAgZGVidWdsb2coXCJyZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCk7XG4gIHBlcmZsb2coXCJyZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHNlbnRlbmNlcyBcIiArIGFTZW50ZW5jZXMubGVuZ3RoKTtcblxuXG4gIHZhciBhU2ltcGxpZmllZFNlbnRlbmNlcyA9IGFTZW50ZW5jZXMubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICB2YXIgcldvcmRzID0gb1NlbnRlbmNlLmZpbHRlcihmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRmlsbGVyKG9Xb3JkKTtcbiAgICB9KTtcbiAgICByZXR1cm4ge1xuICAgICAgb1NlbnRlbmNlOiBvU2VudGVuY2UsXG4gICAgICBjbnRSZWxldmFudFdvcmRzOiByV29yZHMubGVuZ3RoLFxuICAgICAgcldvcmRzOiByV29yZHNcbiAgICB9O1xuICB9KTtcblxuICByZWxldmFudFJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgYVNpbXBsaWZpZWRTZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAoYVNlbnRlbmNlKSB7XG4gICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICB2YXIgbWlzbWF0Y2hlZCA9IDA7XG4gICAgICB2YXIgbWF0Y2hlZCA9IDA7XG4gICAgICBhU2VudGVuY2UucldvcmRzLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgIGlmIChvV29yZC5jYXRlZ29yeSAmJiAocmVjb3JkW29Xb3JkLmNhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSkge1xuICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICArK21hdGNoZWQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICsrbWlzbWF0Y2hlZDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgLy9jb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhU2VudGVuY2Uub1NlbnRlbmNlKSk7XG4gICAgICBpZiAobWF0Y2hlZCA+IG1pc21hdGNoZWQpIHtcbiAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2Uub1NlbnRlbmNlLFxuICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICByZXN1bHQ6IHJlY29yZFtjYXRlZ29yeV0sXG4gICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nU2ltcGxlKG1hdGNoZWQsIG1pc21hdGNoZWQsIGFTZW50ZW5jZS5jbnRSZWxldmFudFdvcmRzKVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KVxuICB9KTtcbiAgcmVzLnNvcnQoY21wQnlSZXN1bHRUaGVuUmFua2luZyk7XG4gIHJlcyA9IGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdChyZXMpO1xuICByZXR1cm4gcmVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZUNhdGVnb3J5KGNhdGVnb3J5d29yZDogc3RyaW5nLCBhUnVsZXM6IEFycmF5PElNYXRjaC5tUnVsZT4sIHdob2xlc2VudGVuY2U6IHN0cmluZyk6IHN0cmluZyB7XG4gIHZhciBjYXRzID0gSW5wdXRGaWx0ZXIuY2F0ZWdvcml6ZUFXb3JkKGNhdGVnb3J5d29yZCwgYVJ1bGVzLCB3aG9sZXNlbnRlbmNlLCB7fSk7XG4gIC8vIFRPRE8gcXVhbGlmeVxuICBjYXRzID0gY2F0cy5maWx0ZXIoZnVuY3Rpb24gKGNhdCkge1xuICAgIHJldHVybiBjYXQuY2F0ZWdvcnkgPT09ICdjYXRlZ29yeSc7XG4gIH0pXG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGNhdHMpKTtcbiAgaWYgKGNhdHMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGNhdHNbMF0ubWF0Y2hlZFN0cmluZztcbiAgfVxufVxuXG4vLyBjb25zdCByZXN1bHQgPSBXaGF0SXMucmVzb2x2ZUNhdGVnb3J5KGNhdCwgYTEuZW50aXR5LFxuLy8gICB0aGVNb2RlbC5tUnVsZXMsIHRoZU1vZGVsLnRvb2xzLCB0aGVNb2RlbC5yZWNvcmRzKTtcblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVDYXRlZ29yeShjYXRlZ29yeTogc3RyaW5nLCBjb250ZXh0UXVlcnlTdHJpbmc6IHN0cmluZyxcbiAgYVJ1bGVzOiBBcnJheTxJTWF0Y2gubVJ1bGU+LCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4pOiBBcnJheTxJTWF0Y2guSVdoYXRJc0Fuc3dlcj4ge1xuICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBbXTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgbWF0Y2hlZCA9IElucHV0RmlsdGVyLmFuYWx5emVTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCBhUnVsZXMpO1xuICAgIGRlYnVnbG9nKFwiYWZ0ZXIgbWF0Y2hlZCBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWQpKTtcbiAgICB2YXIgYVNlbnRlbmNlcyA9IElucHV0RmlsdGVyLmV4cGFuZE1hdGNoQXJyKG1hdGNoZWQpO1xuICAgIGRlYnVnbG9nKFwiYWZ0ZXIgZXhwYW5kXCIgKyBhU2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICB9KS5qb2luKFwiXFxuXCIpKTtcbiAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBJbnB1dEZpbHRlci5yZWluRm9yY2UoYVNlbnRlbmNlcyk7XG4gICAgLy9hU2VudGVuY2VzLm1hcChmdW5jdGlvbihvU2VudGVuY2UpIHsgcmV0dXJuIElucHV0RmlsdGVyLnJlaW5Gb3JjZShvU2VudGVuY2UpOyB9KTtcbiAgICBkZWJ1Z2xvZyhcImFmdGVyIHJlaW5mb3JjZVwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQubWFwKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgIHJldHVybiBTZW50ZW5jZS5yYW5raW5nUHJvZHVjdChvU2VudGVuY2UpICsgXCI6XCIgKyBKU09OLnN0cmluZ2lmeShvU2VudGVuY2UpO1xuICAgIH0pLmpvaW4oXCJcXG5cIikpO1xuICAgIHZhciBtYXRjaGVkQW5zd2VycyA9IG1hdGNoUmVjb3JkcyhhU2VudGVuY2VzLCBjYXRlZ29yeSwgcmVjb3Jkcyk7IC8vYVRvb2w6IEFycmF5PElNYXRjaC5JVG9vbD4pOiBhbnkgLyogb2JqZWN0c3RyZWFtKi8ge1xuICAgIGRlYnVnbG9nKFwiIG1hdGNoZWRBbnN3ZXJzXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkQW5zd2VycywgdW5kZWZpbmVkLCAyKSk7XG4gICAgcmV0dXJuIG1hdGNoZWRBbnN3ZXJzO1xuICB9XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlck9ubHlUb3BSYW5rZWQocmVzdWx0czogQXJyYXk8SU1hdGNoLklXaGF0SXNBbnN3ZXI+KTogQXJyYXk8SU1hdGNoLklXaGF0SXNBbnN3ZXI+IHtcbiAgdmFyIHJlcyA9IHJlc3VsdHMuZmlsdGVyKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICBpZiAocmVzdWx0Ll9yYW5raW5nID09PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHJlc3VsdC5fcmFua2luZyA+PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJMaXN0IHRvIGZpbHRlciBtdXN0IGJlIG9yZGVyZWRcIik7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG4gIHJldHVybiByZXM7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGlzSW5kaXNjcmltaW5hdGVSZXN1bHQocmVzdWx0czogQXJyYXk8SU1hdGNoLklXaGF0SXNBbnN3ZXI+KTogc3RyaW5nIHtcbiAgdmFyIGNudCA9IHJlc3VsdHMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCByZXN1bHQpIHtcbiAgICBpZiAocmVzdWx0Ll9yYW5raW5nID09PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICByZXR1cm4gcHJldiArIDE7XG4gICAgfVxuICB9LCAwKTtcbiAgaWYgKGNudCA+IDEpIHtcbiAgICAvLyBzZWFyY2ggZm9yIGEgZGlzY3JpbWluYXRpbmcgY2F0ZWdvcnkgdmFsdWVcbiAgICB2YXIgZGlzY3JpbWluYXRpbmcgPSBPYmplY3Qua2V5cyhyZXN1bHRzWzBdLnJlY29yZCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBjYXRlZ29yeSkge1xuICAgICAgaWYgKChjYXRlZ29yeS5jaGFyQXQoMCkgIT09ICdfJyAmJiBjYXRlZ29yeSAhPT0gcmVzdWx0c1swXS5jYXRlZ29yeSlcbiAgICAgICAgJiYgKHJlc3VsdHNbMF0ucmVjb3JkW2NhdGVnb3J5XSAhPT0gcmVzdWx0c1sxXS5yZWNvcmRbY2F0ZWdvcnldKSkge1xuICAgICAgICBwcmV2LnB1c2goY2F0ZWdvcnkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgW10pO1xuICAgIGlmIChkaXNjcmltaW5hdGluZy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBcIk1hbnkgY29tcGFyYWJsZSByZXN1bHRzLCBwZXJoYXBzIHlvdSB3YW50IHRvIHNwZWNpZnkgYSBkaXNjcmltaW5hdGluZyBcIiArIGRpc2NyaW1pbmF0aW5nLmpvaW4oJywnKTtcbiAgICB9XG4gICAgcmV0dXJuICdZb3VyIHF1ZXN0aW9uIGRvZXMgbm90IGhhdmUgYSBzcGVjaWZpYyBhbnN3ZXInO1xuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59XG4iLCIvKipcbiAqXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5hbmFseXplXG4gKiBAZmlsZSBhbmFseXplLnRzXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXG4gKi9cblwidXNlIHN0cmljdFwiO1xudmFyIElucHV0RmlsdGVyID0gcmVxdWlyZSgnLi9pbnB1dEZpbHRlcicpO1xudmFyIGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKTtcbnZhciBkZWJ1Z2xvZyA9IGRlYnVnKCd3aGF0aXMnKTtcbnZhciBwZXJmbG9nID0gZGVidWcoJ3BlcmYnKTtcbnZhciBTZW50ZW5jZSA9IHJlcXVpcmUoJy4vc2VudGVuY2UnKTtcbnZhciBXb3JkID0gcmVxdWlyZSgnLi93b3JkJyk7XG5mdW5jdGlvbiBjbXBCeVJlc3VsdFRoZW5SYW5raW5nKGEsIGIpIHtcbiAgICB2YXIgY21wID0gYS5yZXN1bHQubG9jYWxlQ29tcGFyZShiLnJlc3VsdCk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgICByZXR1cm4gY21wO1xuICAgIH1cbiAgICByZXR1cm4gLShhLl9yYW5raW5nIC0gYi5fcmFua2luZyk7XG59XG5leHBvcnRzLmNtcEJ5UmVzdWx0VGhlblJhbmtpbmcgPSBjbXBCeVJlc3VsdFRoZW5SYW5raW5nO1xuZnVuY3Rpb24gY21wQnlSYW5raW5nKGEsIGIpIHtcbiAgICB2YXIgY21wID0gLShhLl9yYW5raW5nIC0gYi5fcmFua2luZyk7XG4gICAgaWYgKGNtcCkge1xuICAgICAgICByZXR1cm4gY21wO1xuICAgIH1cbiAgICBjbXAgPSBhLnJlc3VsdC5sb2NhbGVDb21wYXJlKGIucmVzdWx0KTtcbiAgICBpZiAoY21wKSB7XG4gICAgICAgIHJldHVybiBjbXA7XG4gICAgfVxuICAgIC8vIGFyZSByZWNvcmRzIGRpZmZlcmVudD9cbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGEucmVjb3JkKS5jb25jYXQoT2JqZWN0LmtleXMoYi5yZWNvcmQpKS5zb3J0KCk7XG4gICAgdmFyIHJlcyA9IGtleXMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBzS2V5KSB7XG4gICAgICAgIGlmIChwcmV2KSB7XG4gICAgICAgICAgICByZXR1cm4gcHJldjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYi5yZWNvcmRbc0tleV0gIT09IGEucmVjb3JkW3NLZXldKSB7XG4gICAgICAgICAgICBpZiAoIWIucmVjb3JkW3NLZXldKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFhLnJlY29yZFtzS2V5XSkge1xuICAgICAgICAgICAgICAgIHJldHVybiArMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBhLnJlY29yZFtzS2V5XS5sb2NhbGVDb21wYXJlKGIucmVjb3JkW3NLZXldKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMDtcbiAgICB9LCAwKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5jbXBCeVJhbmtpbmcgPSBjbXBCeVJhbmtpbmc7XG5mdW5jdGlvbiBkdW1wTmljZShhbnN3ZXIpIHtcbiAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICBzOiBcIlwiLFxuICAgICAgICBwdXNoOiBmdW5jdGlvbiAocykgeyB0aGlzLnMgPSB0aGlzLnMgKyBzOyB9XG4gICAgfTtcbiAgICB2YXIgcyA9IFwiKipSZXN1bHQgZm9yIGNhdGVnb3J5OiBcIiArIGFuc3dlci5jYXRlZ29yeSArIFwiIGlzIFwiICsgYW5zd2VyLnJlc3VsdCArIFwiXFxuIHJhbms6IFwiICsgYW5zd2VyLl9yYW5raW5nICsgXCJcXG5cIjtcbiAgICByZXN1bHQucHVzaChzKTtcbiAgICBPYmplY3Qua2V5cyhhbnN3ZXIucmVjb3JkKS5mb3JFYWNoKGZ1bmN0aW9uIChzUmVxdWlyZXMsIGluZGV4KSB7XG4gICAgICAgIGlmIChzUmVxdWlyZXMuY2hhckF0KDApICE9PSAnXycpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKFwicmVjb3JkOiBcIiArIHNSZXF1aXJlcyArIFwiIC0+IFwiICsgYW5zd2VyLnJlY29yZFtzUmVxdWlyZXNdKTtcbiAgICAgICAgfVxuICAgICAgICByZXN1bHQucHVzaCgnXFxuJyk7XG4gICAgfSk7XG4gICAgdmFyIG9TZW50ZW5jZSA9IGFuc3dlci5zZW50ZW5jZTtcbiAgICBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQsIGluZGV4KSB7XG4gICAgICAgIHZhciBzV29yZCA9IFwiW1wiICsgaW5kZXggKyBcIl0gOiBcIiArIG9Xb3JkLmNhdGVnb3J5ICsgXCIgXFxcIlwiICsgb1dvcmQuc3RyaW5nICsgXCJcXFwiID0+IFxcXCJcIiArIG9Xb3JkLm1hdGNoZWRTdHJpbmcgKyBcIlxcXCJcIjtcbiAgICAgICAgcmVzdWx0LnB1c2goc1dvcmQgKyBcIlxcblwiKTtcbiAgICB9KTtcbiAgICByZXN1bHQucHVzaChcIi5cXG5cIik7XG4gICAgcmV0dXJuIHJlc3VsdC5zO1xufVxuZXhwb3J0cy5kdW1wTmljZSA9IGR1bXBOaWNlO1xuZnVuY3Rpb24gZHVtcFdlaWdodHNUb3AodG9vbG1hdGNoZXMsIG9wdGlvbnMpIHtcbiAgICB2YXIgcyA9ICcnO1xuICAgIHRvb2xtYXRjaGVzLmZvckVhY2goZnVuY3Rpb24gKG9NYXRjaCwgaW5kZXgpIHtcbiAgICAgICAgaWYgKGluZGV4IDwgb3B0aW9ucy50b3ApIHtcbiAgICAgICAgICAgIHMgPSBzICsgXCJXaGF0SXNBbnN3ZXJbXCIgKyBpbmRleCArIFwiXS4uLlxcblwiO1xuICAgICAgICAgICAgcyA9IHMgKyBkdW1wTmljZShvTWF0Y2gpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHM7XG59XG5leHBvcnRzLmR1bXBXZWlnaHRzVG9wID0gZHVtcFdlaWdodHNUb3A7XG5mdW5jdGlvbiBmaWx0ZXJSZXRhaW5Ub3BSYW5rZWRSZXN1bHQocmVzKSB7XG4gICAgdmFyIHJlc3VsdCA9IHJlcy5maWx0ZXIoZnVuY3Rpb24gKGlSZXMsIGluZGV4KSB7XG4gICAgICAgIGRlYnVnbG9nKGluZGV4ICsgJyAnICsgSlNPTi5zdHJpbmdpZnkoaVJlcykpO1xuICAgICAgICBpZiAoaVJlcy5yZXN1bHQgPT09IChyZXNbaW5kZXggLSAxXSAmJiByZXNbaW5kZXggLSAxXS5yZXN1bHQpKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZygnc2tpcCcpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICAgIHJlc3VsdC5zb3J0KGNtcEJ5UmFua2luZyk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cbmV4cG9ydHMuZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0ID0gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0O1xudmFyIE1hdGNoID0gcmVxdWlyZSgnLi9tYXRjaCcpO1xuZnVuY3Rpb24gY2FsY1JhbmtpbmcobWF0Y2hlZCwgbWlzbWF0Y2hlZCwgcmVsZXZhbnRDb3VudCkge1xuICAgIHZhciBsZW5NYXRjaGVkID0gT2JqZWN0LmtleXMobWF0Y2hlZCkubGVuZ3RoO1xuICAgIHZhciBmYWN0b3IgPSBNYXRjaC5jYWxjUmFua2luZ1Byb2R1Y3QobWF0Y2hlZCk7XG4gICAgZmFjdG9yICo9IE1hdGgucG93KDEuNSwgbGVuTWF0Y2hlZCk7XG4gICAgdmFyIGxlbk1pc01hdGNoZWQgPSBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGg7XG4gICAgdmFyIGZhY3RvcjIgPSBNYXRjaC5jYWxjUmFua2luZ1Byb2R1Y3QobWlzbWF0Y2hlZCk7XG4gICAgZmFjdG9yMiAqPSBNYXRoLnBvdygwLjQsIGxlbk1pc01hdGNoZWQpO1xuICAgIHJldHVybiBNYXRoLnBvdyhmYWN0b3IyICogZmFjdG9yLCAxIC8gKGxlbk1pc01hdGNoZWQgKyBsZW5NYXRjaGVkKSk7XG59XG5leHBvcnRzLmNhbGNSYW5raW5nID0gY2FsY1Jhbmtpbmc7XG5mdW5jdGlvbiBjYWxjUmFua2luZ1NpbXBsZShtYXRjaGVkLCBtaXNtYXRjaGVkLCByZWxldmFudENvdW50KSB7XG4gICAgdmFyIGZhY3RvciA9IE1hdGgucG93KDEuNSwgbWF0Y2hlZCk7XG4gICAgdmFyIGZhY3RvcjIgPSBNYXRoLnBvdygwLjQsIG1pc21hdGNoZWQpO1xuICAgIHJldHVybiBNYXRoLnBvdyhmYWN0b3IyICogZmFjdG9yLCAxIC8gKG1pc21hdGNoZWQgKyBtYXRjaGVkKSk7XG59XG5leHBvcnRzLmNhbGNSYW5raW5nU2ltcGxlID0gY2FsY1JhbmtpbmdTaW1wbGU7XG5mdW5jdGlvbiBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5KG1hdGNoZWQsIGhhc0NhdGVnb3J5LCBtaXNtYXRjaGVkLCByZWxldmFudENvdW50KSB7XG4gICAgdmFyIGxlbk1hdGNoZWQgPSBPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGg7XG4gICAgdmFyIGZhY3RvciA9IE1hdGNoLmNhbGNSYW5raW5nUHJvZHVjdChtYXRjaGVkKTtcbiAgICBmYWN0b3IgKj0gTWF0aC5wb3coMS41LCBsZW5NYXRjaGVkKTtcbiAgICB2YXIgbGVuSGFzQ2F0ZWdvcnkgPSBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoO1xuICAgIHZhciBmYWN0b3JIID0gTWF0aC5wb3coMS4yLCBsZW5IYXNDYXRlZ29yeSk7XG4gICAgdmFyIGxlbk1pc01hdGNoZWQgPSBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGg7XG4gICAgdmFyIGZhY3RvcjIgPSBNYXRjaC5jYWxjUmFua2luZ1Byb2R1Y3QobWlzbWF0Y2hlZCk7XG4gICAgZmFjdG9yMiAqPSBNYXRoLnBvdygwLjQsIGxlbk1pc01hdGNoZWQpO1xuICAgIHJldHVybiBNYXRoLnBvdyhmYWN0b3IyICogZmFjdG9ySCAqIGZhY3RvciwgMSAvIChsZW5NaXNNYXRjaGVkICsgbGVuSGFzQ2F0ZWdvcnkgKyBsZW5NYXRjaGVkKSk7XG59XG5leHBvcnRzLmNhbGNSYW5raW5nSGF2aW5nQ2F0ZWdvcnkgPSBjYWxjUmFua2luZ0hhdmluZ0NhdGVnb3J5O1xuLyoqXG4gKiBsaXN0IGFsbCB0b3AgbGV2ZWwgcmFua2luZ3NcbiAqL1xuZnVuY3Rpb24gbWF0Y2hSZWNvcmRzSGF2aW5nQ29udGV4dChhU2VudGVuY2VzLCBjYXRlZ29yeSwgcmVjb3Jkcykge1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZHMsIHVuZGVmaW5lZCwgMikpO1xuICAgIHZhciByZWxldmFudFJlY29yZHMgPSByZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgIHJldHVybiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSAmJiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gbnVsbCk7XG4gICAgfSk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIGRlYnVnbG9nKFwicmVsZXZhbnQgcmVjb3JkcyBucjpcIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGgpO1xuICAgIGRlYnVnbG9nKFwic2VudGVuY2VzIGFyZSA6IFwiICsgSlNPTi5zdHJpbmdpZnkoYVNlbnRlbmNlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICAvLyBjb3VudCBtYXRjaGVzIGluIHJlY29yZCB3aGljaCBhcmUgKm5vdCogdGhlIGNhdGVnb3J5XG4gICAgICAgIGFTZW50ZW5jZXMuZm9yRWFjaChmdW5jdGlvbiAoYVNlbnRlbmNlKSB7XG4gICAgICAgICAgICB2YXIgaGFzQ2F0ZWdvcnkgPSB7fTtcbiAgICAgICAgICAgIHZhciBtaXNtYXRjaGVkID0ge307XG4gICAgICAgICAgICB2YXIgbWF0Y2hlZCA9IHt9O1xuICAgICAgICAgICAgdmFyIGNudFJlbGV2YW50V29yZHMgPSAwO1xuICAgICAgICAgICAgYVNlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNudFJlbGV2YW50V29yZHMgPSBjbnRSZWxldmFudFdvcmRzICsgMTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9Xb3JkLmNhdGVnb3J5ICYmIChyZWNvcmRbb1dvcmQuY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob1dvcmQubWF0Y2hlZFN0cmluZyA9PT0gcmVjb3JkW29Xb3JkLmNhdGVnb3J5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaXNtYXRjaGVkW29Xb3JkLmNhdGVnb3J5XSA9IG9Xb3JkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKFdvcmQuV29yZC5pc0NhdGVnb3J5KG9Xb3JkKSAmJiByZWNvcmRbb1dvcmQubWF0Y2hlZFN0cmluZ10pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhc0NhdGVnb3J5W29Xb3JkLm1hdGNoZWRTdHJpbmddID0gMTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKChPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggKyBPYmplY3Qua2V5cyhoYXNDYXRlZ29yeSkubGVuZ3RoKSA+IE9iamVjdC5rZXlzKG1pc21hdGNoZWQpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgc2VudGVuY2U6IGFTZW50ZW5jZSxcbiAgICAgICAgICAgICAgICAgICAgcmVjb3JkOiByZWNvcmQsXG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiByZWNvcmRbY2F0ZWdvcnldLFxuICAgICAgICAgICAgICAgICAgICBfcmFua2luZzogY2FsY1JhbmtpbmdIYXZpbmdDYXRlZ29yeShtYXRjaGVkLCBoYXNDYXRlZ29yeSwgbWlzbWF0Y2hlZCwgY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmVzLnNvcnQoY21wQnlSZXN1bHRUaGVuUmFua2luZyk7XG4gICAgcmVzID0gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0KHJlcyk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMubWF0Y2hSZWNvcmRzSGF2aW5nQ29udGV4dCA9IG1hdGNoUmVjb3Jkc0hhdmluZ0NvbnRleHQ7XG5mdW5jdGlvbiBtYXRjaFJlY29yZHMoYVNlbnRlbmNlcywgY2F0ZWdvcnksIHJlY29yZHMpIHtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRzLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnldICE9PSBudWxsKTtcbiAgICB9KTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgZGVidWdsb2coXCJyZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCk7XG4gICAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICBhU2VudGVuY2VzLmZvckVhY2goZnVuY3Rpb24gKGFTZW50ZW5jZSkge1xuICAgICAgICAgICAgLy8gY291bnQgbWF0Y2hlcyBpbiByZWNvcmQgd2hpY2ggYXJlICpub3QqIHRoZSBjYXRlZ29yeVxuICAgICAgICAgICAgdmFyIG1pc21hdGNoZWQgPSB7fTtcbiAgICAgICAgICAgIHZhciBtYXRjaGVkID0ge307XG4gICAgICAgICAgICB2YXIgY250UmVsZXZhbnRXb3JkcyA9IDA7XG4gICAgICAgICAgICBhU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIVdvcmQuV29yZC5pc0ZpbGxlcihvV29yZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgY250UmVsZXZhbnRXb3JkcyA9IGNudFJlbGV2YW50V29yZHMgKyAxO1xuICAgICAgICAgICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvV29yZC5tYXRjaGVkU3RyaW5nID09PSByZWNvcmRbb1dvcmQuY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFtvV29yZC5jYXRlZ29yeV0gPSBvV29yZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pc21hdGNoZWRbb1dvcmQuY2F0ZWdvcnldID0gb1dvcmQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChPYmplY3Qua2V5cyhtYXRjaGVkKS5sZW5ndGggPiBPYmplY3Qua2V5cyhtaXNtYXRjaGVkKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2UsXG4gICAgICAgICAgICAgICAgICAgIHJlY29yZDogcmVjb3JkLFxuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDogcmVjb3JkW2NhdGVnb3J5XSxcbiAgICAgICAgICAgICAgICAgICAgX3Jhbmtpbmc6IGNhbGNSYW5raW5nKG1hdGNoZWQsIG1pc21hdGNoZWQsIGNudFJlbGV2YW50V29yZHMpXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJlcy5zb3J0KGNtcEJ5UmVzdWx0VGhlblJhbmtpbmcpO1xuICAgIHJlcyA9IGZpbHRlclJldGFpblRvcFJhbmtlZFJlc3VsdChyZXMpO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLm1hdGNoUmVjb3JkcyA9IG1hdGNoUmVjb3JkcztcbmZ1bmN0aW9uIG1hdGNoUmVjb3Jkc1F1aWNrKGFTZW50ZW5jZXMsIGNhdGVnb3J5LCByZWNvcmRzKSB7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHZhciByZWxldmFudFJlY29yZHMgPSByZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgIHJldHVybiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gdW5kZWZpbmVkKSAmJiAocmVjb3JkW2NhdGVnb3J5XSAhPT0gbnVsbCk7XG4gICAgfSk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIGRlYnVnbG9nKFwicmVsZXZhbnQgcmVjb3JkcyBucjpcIiArIHJlbGV2YW50UmVjb3Jkcy5sZW5ndGgpO1xuICAgIHBlcmZsb2coXCJyZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCArIFwiIHNlbnRlbmNlcyBcIiArIGFTZW50ZW5jZXMubGVuZ3RoKTtcbiAgICB2YXIgYVNpbXBsaWZpZWRTZW50ZW5jZXMgPSBhU2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgIHZhciByV29yZHMgPSBvU2VudGVuY2UuZmlsdGVyKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgcmV0dXJuICFXb3JkLldvcmQuaXNGaWxsZXIob1dvcmQpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG9TZW50ZW5jZTogb1NlbnRlbmNlLFxuICAgICAgICAgICAgY250UmVsZXZhbnRXb3JkczogcldvcmRzLmxlbmd0aCxcbiAgICAgICAgICAgIHJXb3JkczogcldvcmRzXG4gICAgICAgIH07XG4gICAgfSk7XG4gICAgcmVsZXZhbnRSZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICBhU2ltcGxpZmllZFNlbnRlbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChhU2VudGVuY2UpIHtcbiAgICAgICAgICAgIC8vIGNvdW50IG1hdGNoZXMgaW4gcmVjb3JkIHdoaWNoIGFyZSAqbm90KiB0aGUgY2F0ZWdvcnlcbiAgICAgICAgICAgIHZhciBtaXNtYXRjaGVkID0gMDtcbiAgICAgICAgICAgIHZhciBtYXRjaGVkID0gMDtcbiAgICAgICAgICAgIGFTZW50ZW5jZS5yV29yZHMuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICAgICAgICBpZiAob1dvcmQuY2F0ZWdvcnkgJiYgKHJlY29yZFtvV29yZC5jYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9Xb3JkLm1hdGNoZWRTdHJpbmcgPT09IHJlY29yZFtvV29yZC5jYXRlZ29yeV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICsrbWF0Y2hlZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICsrbWlzbWF0Y2hlZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhU2VudGVuY2Uub1NlbnRlbmNlKSk7XG4gICAgICAgICAgICBpZiAobWF0Y2hlZCA+IG1pc21hdGNoZWQpIHtcbiAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIHNlbnRlbmNlOiBhU2VudGVuY2Uub1NlbnRlbmNlLFxuICAgICAgICAgICAgICAgICAgICByZWNvcmQ6IHJlY29yZCxcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IHJlY29yZFtjYXRlZ29yeV0sXG4gICAgICAgICAgICAgICAgICAgIF9yYW5raW5nOiBjYWxjUmFua2luZ1NpbXBsZShtYXRjaGVkLCBtaXNtYXRjaGVkLCBhU2VudGVuY2UuY250UmVsZXZhbnRXb3JkcylcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmVzLnNvcnQoY21wQnlSZXN1bHRUaGVuUmFua2luZyk7XG4gICAgcmVzID0gZmlsdGVyUmV0YWluVG9wUmFua2VkUmVzdWx0KHJlcyk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMubWF0Y2hSZWNvcmRzUXVpY2sgPSBtYXRjaFJlY29yZHNRdWljaztcbmZ1bmN0aW9uIGFuYWx5emVDYXRlZ29yeShjYXRlZ29yeXdvcmQsIGFSdWxlcywgd2hvbGVzZW50ZW5jZSkge1xuICAgIHZhciBjYXRzID0gSW5wdXRGaWx0ZXIuY2F0ZWdvcml6ZUFXb3JkKGNhdGVnb3J5d29yZCwgYVJ1bGVzLCB3aG9sZXNlbnRlbmNlLCB7fSk7XG4gICAgLy8gVE9ETyBxdWFsaWZ5XG4gICAgY2F0cyA9IGNhdHMuZmlsdGVyKGZ1bmN0aW9uIChjYXQpIHtcbiAgICAgICAgcmV0dXJuIGNhdC5jYXRlZ29yeSA9PT0gJ2NhdGVnb3J5JztcbiAgICB9KTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShjYXRzKSk7XG4gICAgaWYgKGNhdHMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBjYXRzWzBdLm1hdGNoZWRTdHJpbmc7XG4gICAgfVxufVxuZXhwb3J0cy5hbmFseXplQ2F0ZWdvcnkgPSBhbmFseXplQ2F0ZWdvcnk7XG4vLyBjb25zdCByZXN1bHQgPSBXaGF0SXMucmVzb2x2ZUNhdGVnb3J5KGNhdCwgYTEuZW50aXR5LFxuLy8gICB0aGVNb2RlbC5tUnVsZXMsIHRoZU1vZGVsLnRvb2xzLCB0aGVNb2RlbC5yZWNvcmRzKTtcbmZ1bmN0aW9uIHJlc29sdmVDYXRlZ29yeShjYXRlZ29yeSwgY29udGV4dFF1ZXJ5U3RyaW5nLCBhUnVsZXMsIHJlY29yZHMpIHtcbiAgICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB2YXIgbWF0Y2hlZCA9IElucHV0RmlsdGVyLmFuYWx5emVTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCBhUnVsZXMpO1xuICAgICAgICBkZWJ1Z2xvZyhcImFmdGVyIG1hdGNoZWQgXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkKSk7XG4gICAgICAgIHZhciBhU2VudGVuY2VzID0gSW5wdXRGaWx0ZXIuZXhwYW5kTWF0Y2hBcnIobWF0Y2hlZCk7XG4gICAgICAgIGRlYnVnbG9nKFwiYWZ0ZXIgZXhwYW5kXCIgKyBhU2VudGVuY2VzLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICAgICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgICAgIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IElucHV0RmlsdGVyLnJlaW5Gb3JjZShhU2VudGVuY2VzKTtcbiAgICAgICAgLy9hU2VudGVuY2VzLm1hcChmdW5jdGlvbihvU2VudGVuY2UpIHsgcmV0dXJuIElucHV0RmlsdGVyLnJlaW5Gb3JjZShvU2VudGVuY2UpOyB9KTtcbiAgICAgICAgZGVidWdsb2coXCJhZnRlciByZWluZm9yY2VcIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLm1hcChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgICAgICByZXR1cm4gU2VudGVuY2UucmFua2luZ1Byb2R1Y3Qob1NlbnRlbmNlKSArIFwiOlwiICsgSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlKTtcbiAgICAgICAgfSkuam9pbihcIlxcblwiKSk7XG4gICAgICAgIHZhciBtYXRjaGVkQW5zd2VycyA9IG1hdGNoUmVjb3JkcyhhU2VudGVuY2VzLCBjYXRlZ29yeSwgcmVjb3Jkcyk7IC8vYVRvb2w6IEFycmF5PElNYXRjaC5JVG9vbD4pOiBhbnkgLyogb2JqZWN0c3RyZWFtKi8ge1xuICAgICAgICBkZWJ1Z2xvZyhcIiBtYXRjaGVkQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgICByZXR1cm4gbWF0Y2hlZEFuc3dlcnM7XG4gICAgfVxufVxuZXhwb3J0cy5yZXNvbHZlQ2F0ZWdvcnkgPSByZXNvbHZlQ2F0ZWdvcnk7XG5mdW5jdGlvbiBmaWx0ZXJPbmx5VG9wUmFua2VkKHJlc3VsdHMpIHtcbiAgICB2YXIgcmVzID0gcmVzdWx0cy5maWx0ZXIoZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICBpZiAocmVzdWx0Ll9yYW5raW5nID09PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVzdWx0Ll9yYW5raW5nID49IHJlc3VsdHNbMF0uX3JhbmtpbmcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkxpc3QgdG8gZmlsdGVyIG11c3QgYmUgb3JkZXJlZFwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZmlsdGVyT25seVRvcFJhbmtlZCA9IGZpbHRlck9ubHlUb3BSYW5rZWQ7XG5mdW5jdGlvbiBpc0luZGlzY3JpbWluYXRlUmVzdWx0KHJlc3VsdHMpIHtcbiAgICB2YXIgY250ID0gcmVzdWx0cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHJlc3VsdCkge1xuICAgICAgICBpZiAocmVzdWx0Ll9yYW5raW5nID09PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICB9LCAwKTtcbiAgICBpZiAoY250ID4gMSkge1xuICAgICAgICAvLyBzZWFyY2ggZm9yIGEgZGlzY3JpbWluYXRpbmcgY2F0ZWdvcnkgdmFsdWVcbiAgICAgICAgdmFyIGRpc2NyaW1pbmF0aW5nID0gT2JqZWN0LmtleXMocmVzdWx0c1swXS5yZWNvcmQpLnJlZHVjZShmdW5jdGlvbiAocHJldiwgY2F0ZWdvcnkpIHtcbiAgICAgICAgICAgIGlmICgoY2F0ZWdvcnkuY2hhckF0KDApICE9PSAnXycgJiYgY2F0ZWdvcnkgIT09IHJlc3VsdHNbMF0uY2F0ZWdvcnkpXG4gICAgICAgICAgICAgICAgJiYgKHJlc3VsdHNbMF0ucmVjb3JkW2NhdGVnb3J5XSAhPT0gcmVzdWx0c1sxXS5yZWNvcmRbY2F0ZWdvcnldKSkge1xuICAgICAgICAgICAgICAgIHByZXYucHVzaChjYXRlZ29yeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcHJldjtcbiAgICAgICAgfSwgW10pO1xuICAgICAgICBpZiAoZGlzY3JpbWluYXRpbmcubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJNYW55IGNvbXBhcmFibGUgcmVzdWx0cywgcGVyaGFwcyB5b3Ugd2FudCB0byBzcGVjaWZ5IGEgZGlzY3JpbWluYXRpbmcgXCIgKyBkaXNjcmltaW5hdGluZy5qb2luKCcsJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICdZb3VyIHF1ZXN0aW9uIGRvZXMgbm90IGhhdmUgYSBzcGVjaWZpYyBhbnN3ZXInO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xufVxuZXhwb3J0cy5pc0luZGlzY3JpbWluYXRlUmVzdWx0ID0gaXNJbmRpc2NyaW1pbmF0ZVJlc3VsdDtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
