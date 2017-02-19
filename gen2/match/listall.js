/**
 *
 * @module jfseb.fdevstart.analyze
 * @file analyze.ts
 * @copyright (c) 2016 Gerd Forstmann
 */
"use strict";

var debug = require("debug");
var debuglog = debug('listall');
var logger = require("../utils/logger");
var logPerf = logger.perf("perflistall");
var perflog = debug('perf');
var BreakDown = require("./breakdown");
var Operator = require("./operator");
var WhatIs = require("./whatis");
var ErError = require("./ererror");
var Model = require("../model/model");
var sWords = {};
function matchRecordHavingCategory(category, records) {
    debuglog(debuglog.enabled ? JSON.stringify(records, undefined, 2) : "-");
    var relevantRecords = records.filter(function (record) {
        return record[category] !== undefined && record[category] !== null;
    });
    var res = [];
    debuglog("relevant records nr:" + relevantRecords.length);
    return relevantRecords;
}
exports.matchRecordHavingCategory = matchRecordHavingCategory;
function analyzeContextString(contextQueryString, rules) {
    return WhatIs.analyzeContextString(contextQueryString, rules);
}
exports.analyzeContextString = analyzeContextString;
// const result = WhatIs.resolveCategory(cat, a1.entity,
//   theModel.mRules, theModel.tools, theModel.records);
function listAllWithContext(category, contextQueryString, aRules, records, categorySet) {
    var res = listAllTupelWithContext([category], contextQueryString, aRules, records, categorySet);
    var answers = res.tupelanswers.map(function (o) {
        return {
            sentence: o.sentence,
            record: o.record,
            category: o.categories[0],
            result: o.result[0],
            _ranking: o._ranking
        };
    });
    return {
        sentences: res.sentences,
        errors: res.errors,
        tokens: res.tokens,
        answers: answers
    };
}
exports.listAllWithContext = listAllWithContext;
/*
export function listAllWithContextXX(category: string, contextQueryString: string,
  aRules: IMatch.SplitRules, records: Array<IMatch.IRecord>, categorySet?: { [key : string] : boolean }): IMatch.IProcessedWhatIsAnswers
 {
  if (contextQueryString.length === 0) {
    return {
      answers : [],
      errors : [ErError.makeError_EMPTY_INPUT()] ,
      tokens :[]
    };
  } else {
    logPerf('listAllWithContext');
    perflog("totalListAllWithContext");
    var aSentencesReinforced = analyzeContextString(contextQueryString, aRules);
    debuglog("listAllWithContext:matching records (s=" + aSentencesReinforced.sentences.length + ")...");
    debuglog("here sentences" + JSON.stringify(aSentencesReinforced,undefined,2));
    perflog("matching records (s=" + aSentencesReinforced.sentences.length + ")...");
    var matchedAnswers = WhatIs.matchRecordsQuick(aSentencesReinforced, category, records, categorySet);
    //aTool: Array<IMatch.ITool>): any / * objectstream* / {
    if(debuglog.enabled){
      debuglog(" matched Answers" + JSON.stringify(matchedAnswers, undefined, 2));
    }
    perflog("filtering topRanked (a=" + matchedAnswers.answers.length + ")...");
    var matchedFiltered = WhatIs.filterOnlyTopRanked(matchedAnswers.answers);
    if (debuglog.enabled) {
      debuglog(" matched top-ranked Answers" + JSON.stringify(matchedFiltered, undefined, 2));
    }
    perflog("totalListAllWithContext (a=" + matchedFiltered.length + ")");
    logPerf('listAllWithContext');
    return {
     answers :  matchedFiltered, // ??? Answers;
     errors : aSentencesReinforced.errors,
     tokens : aSentencesReinforced.tokens
    }
 }
}
*/
function listAllHavingContext(category, contextQueryString, aRules, records, categorySet) {
    var res = listAllTupelHavingContext([category], contextQueryString, aRules, records, categorySet);
    var answers = res.tupelanswers.map(function (o) {
        return {
            sentence: o.sentence,
            record: o.record,
            category: o.categories[0],
            result: o.result[0],
            _ranking: o._ranking
        };
    });
    return {
        sentences: res.sentences,
        errors: res.errors,
        tokens: res.tokens,
        answers: answers
    };
}
exports.listAllHavingContext = listAllHavingContext;
/*
export function listAllHavingContextXX(category: string, contextQueryString: string,
  aRules: IMatch.SplitRules, records: Array<IMatch.IRecord>,
  categorySet : { [key:string] : boolean }): IMatch.IProcessedWhatIsAnswers {
  if (contextQueryString.length === 0) {
    return {
      errors : [ErError.makeError_EMPTY_INPUT()] ,
      tokens :[],
      answers:[]
   };
  } else {
    perflog("analyzeContextString ...");
    var aSentencesReinforced = analyzeContextString(contextQueryString, aRules);
    perflog("matching records having (s=" + (aSentencesReinforced.sentences.length) + ")...");
    var matchedAnswers = WhatIs.matchRecordsHavingContext(aSentencesReinforced, category, records, categorySet); //aTool: Array<IMatch.ITool>): any / * objectstream* / {
    if(debuglog.enabled) {
      debuglog("LAHC matched Answers" + JSON.stringify(matchedAnswers, undefined, 2));
    }
    perflog("filteringTopRanked (a=" + matchedAnswers.sentences.length + ")...");
    matchedAnswers.answers = WhatIs.filterOnlyTopRanked(matchedAnswers.answers);
    if (debuglog.enabled) {
      debuglog(" matched top-ranked Answers" + JSON.stringify(matchedAnswers.answers, undefined, 2));
    }
    perflog("totalListAllHavingContext (a=" + matchedAnswers.answers.length + ")");
    return matchedAnswers;
  }
}
*/
function listAllTupelWithContext(categories, contextQueryString, aRules, records, categorySet) {
    if (contextQueryString.length === 0) {
        return {
            tupelanswers: [],
            errors: [ErError.makeError_EMPTY_INPUT()],
            tokens: []
        };
    } else {
        logPerf('listAllWithContext');
        perflog("totalListAllWithContext");
        var aSentencesReinforced = analyzeContextString(contextQueryString, aRules);
        perflog("LATWC matching records (s=" + aSentencesReinforced.sentences.length + ")...");
        var matchedAnswers = WhatIs.matchRecordsQuickMultipleCategories(aSentencesReinforced, categories, records, categorySet); //aTool: Array<IMatch.ITool>): any /* objectstream*/ {
        if (debuglog.enabled) {
            debuglog(" matched Answers" + JSON.stringify(matchedAnswers, undefined, 2));
        }
        perflog("filtering topRanked (a=" + matchedAnswers.tupelanswers.length + ")...");
        var matchedFiltered = WhatIs.filterOnlyTopRankedTupel(matchedAnswers.tupelanswers);
        if (debuglog.enabled) {
            debuglog("LATWC matched top-ranked Answers" + JSON.stringify(matchedFiltered, undefined, 2));
        }
        perflog("totalListAllWithContext (a=" + matchedFiltered.length + ")");
        logPerf('listAllWithContext');
        return {
            tupelanswers: matchedFiltered,
            errors: aSentencesReinforced.errors,
            tokens: aSentencesReinforced.tokens
        };
    }
}
exports.listAllTupelWithContext = listAllTupelWithContext;
function listAllTupelHavingContext(categories, contextQueryString, aRules, records, categorySet) {
    if (contextQueryString.length === 0) {
        return {
            tupelanswers: [],
            errors: [ErError.makeError_EMPTY_INPUT()],
            tokens: []
        };
    } else {
        perflog("analyzeContextString ...");
        var aSentencesReinforced = analyzeContextString(contextQueryString, aRules);
        perflog("matching records having (s=" + aSentencesReinforced.sentences.length + ")...");
        var matchedAnswers = WhatIs.matchRecordsTupelHavingContext(aSentencesReinforced, categories, records, categorySet); //aTool: Array<IMatch.ITool>): any /* objectstream*/ {
        if (debuglog.enabled) {
            debuglog(" matched Answers" + JSON.stringify(matchedAnswers, undefined, 2));
        }
        perflog("filteringTopRanked (a=" + matchedAnswers.tupelanswers.length + ")...");
        var matchedFiltered = WhatIs.filterOnlyTopRankedTupel(matchedAnswers.tupelanswers);
        if (debuglog.enabled) {
            debuglog(" matched top-ranked Answers" + JSON.stringify(matchedFiltered, undefined, 2));
        }
        perflog("totalListAllHavingContext (a=" + matchedFiltered.length + ")");
        return {
            tupelanswers: matchedFiltered,
            errors: aSentencesReinforced.errors,
            tokens: aSentencesReinforced.tokens
        };
    }
}
exports.listAllTupelHavingContext = listAllTupelHavingContext;
function filterStringListByOp(operator, fragment, srcarr) {
    var fragmentLC = BreakDown.trimQuotedSpaced(fragment.toLowerCase());
    return srcarr.filter(function (str) {
        return Operator.matches(operator, fragmentLC, str.toLowerCase());
    }).sort();
}
exports.filterStringListByOp = filterStringListByOp;
function compareCaseInsensitive(a, b) {
    var r = a.toLowerCase().localeCompare(b.toLowerCase());
    if (r) {
        return r;
    }
    return -a.localeCompare(b);
}
/**
 * Sort string list case insensitive, then remove duplicates retaining
 * "largest" match
 */
function removeCaseDuplicates(arr) {
    arr.sort(compareCaseInsensitive);
    debuglog('sorted arr' + JSON.stringify(arr));
    return arr.filter(function (s, index) {
        return index === 0 || 0 !== arr[index - 1].toLowerCase().localeCompare(s.toLowerCase());
    });
}
exports.removeCaseDuplicates = removeCaseDuplicates;
;
function getCategoryOpFilterAsDistinctStrings(operator, fragment, category, records, filterDomain) {
    var fragmentLC = BreakDown.trimQuoted(fragment.toLowerCase());
    var res = [];
    var seen = {};
    records.forEach(function (record) {
        if (filterDomain && record['_domain'] !== filterDomain) {
            return;
        }
        if (record[category] && Operator.matches(operator, fragmentLC, record[category].toLowerCase())) {
            if (!seen[record[category]]) {
                seen[record[category]] = true;
                res.push(record[category]);
            }
        }
    });
    return removeCaseDuplicates(res);
}
exports.getCategoryOpFilterAsDistinctStrings = getCategoryOpFilterAsDistinctStrings;
;
function likelyPluralDiff(a, pluralOfa) {
    var aLC = BreakDown.trimQuoted(a.toLowerCase()) || "";
    var pluralOfALC = BreakDown.trimQuoted((pluralOfa || "").toLowerCase()) || "";
    if (aLC === pluralOfALC) {
        return true;
    }
    if (aLC + 's' === pluralOfALC) {
        return true;
    }
    return false;
}
exports.likelyPluralDiff = likelyPluralDiff;
;
function listAllWithCategory(category, records) {
    var matchedAnswers = matchRecordHavingCategory(category, records); //aTool: Array<IMatch.ITool>): any /* objectstream*/ {
    debuglog(" listAllWithCategory:" + JSON.stringify(matchedAnswers, undefined, 2));
    return matchedAnswers;
}
exports.listAllWithCategory = listAllWithCategory;
function joinSortedQuoted(strings) {
    if (strings.length === 0) {
        return "";
    }
    return '"' + strings.sort().join('"; "') + '"';
}
exports.joinSortedQuoted = joinSortedQuoted;
function joinDistinct(category, records) {
    var res = records.reduce(function (prev, oRecord) {
        prev[oRecord[category]] = 1;
        return prev;
    }, {});
    return joinSortedQuoted(Object.keys(res));
}
exports.joinDistinct = joinDistinct;
function formatDistinctFromWhatIfResult(answers) {
    return joinSortedQuoted(answers.map(function (oAnswer) {
        return oAnswer.result;
    }));
}
exports.formatDistinctFromWhatIfResult = formatDistinctFromWhatIfResult;
function joinResults(results) {
    var res = [];
    var cnt = results.reduce(function (prev, result) {
        if (result._ranking === results[0]._ranking) {
            if (res.indexOf(result.result) < 0) {
                res.push(result.result);
            }
            return prev + 1;
        }
    }, 0);
    return res;
}
exports.joinResults = joinResults;
var Utils = require("../utils/utils");
function joinResultsTupel(results) {
    var res = [];
    var cnt = results.reduce(function (prev, result) {
        if (result._ranking === results[0]._ranking) {
            var value = Utils.listToQuotedCommaAnd(result.result);
            if (res.indexOf(value) < 0) {
                res.push(value);
            }
            return prev + 1;
        }
    }, 0);
    return res;
}
exports.joinResultsTupel = joinResultsTupel;
function inferDomain(theModel, contextQueryString) {
    // console.log("here the string" + contextQueryString);
    //  console.log("here the rules" + JSON.stringify(theModel.mRules));
    var res = analyzeContextString(contextQueryString, theModel.rules);
    //console.log(JSON.stringify(res,undefined,2));
    // run through the string, search for a category
    if (!res.sentences.length) {
        return undefined;
    }
    var domains = [];
    //console.log(Sentence.dumpNiceArr(res));
    // do we have a domain ?
    res.sentences[0].forEach(function (oWordGroup) {
        if (oWordGroup.category === "domain") {
            domains.push(oWordGroup.matchedString);
        }
    });
    if (domains.length === 1) {
        debuglog("got a precise domain " + domains[0]);
        return domains[0];
    }
    if (domains.length > 0) {
        debuglog(debuglog.enabled ? "got more than one domain, confused  " + domains.join("\n") : '-');
        return undefined;
    }
    debuglog("attempting to determine categories");
    // try a category reverse map
    res.sentences[0].forEach(function (oWordGroup) {
        if (oWordGroup.category === "category") {
            var sCat = oWordGroup.matchedString;
            var doms = Model.getDomainsForCategory(theModel, sCat);
            doms.forEach(function (sDom) {
                if (domains.indexOf(sDom) < 0) {
                    domains.push(sDom);
                }
            });
        }
    });
    if (domains.length === 1) {
        debuglog("got a precise domain " + domains[0]);
        return domains[0];
    }
    debuglog(debuglog.enabled ? "got more than one domain, confused  " + domains.join("\n") : '-');
    return undefined;
}
exports.inferDomain = inferDomain;
;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9saXN0YWxsLnRzIiwibWF0Y2gvbGlzdGFsbC5qcyJdLCJuYW1lcyI6WyJkZWJ1ZyIsInJlcXVpcmUiLCJkZWJ1Z2xvZyIsImxvZ2dlciIsImxvZ1BlcmYiLCJwZXJmIiwicGVyZmxvZyIsIkJyZWFrRG93biIsIk9wZXJhdG9yIiwiV2hhdElzIiwiRXJFcnJvciIsIk1vZGVsIiwic1dvcmRzIiwibWF0Y2hSZWNvcmRIYXZpbmdDYXRlZ29yeSIsImNhdGVnb3J5IiwicmVjb3JkcyIsImVuYWJsZWQiLCJKU09OIiwic3RyaW5naWZ5IiwidW5kZWZpbmVkIiwicmVsZXZhbnRSZWNvcmRzIiwiZmlsdGVyIiwicmVjb3JkIiwicmVzIiwibGVuZ3RoIiwiZXhwb3J0cyIsImFuYWx5emVDb250ZXh0U3RyaW5nIiwiY29udGV4dFF1ZXJ5U3RyaW5nIiwicnVsZXMiLCJsaXN0QWxsV2l0aENvbnRleHQiLCJhUnVsZXMiLCJjYXRlZ29yeVNldCIsImxpc3RBbGxUdXBlbFdpdGhDb250ZXh0IiwiYW5zd2VycyIsInR1cGVsYW5zd2VycyIsIm1hcCIsIm8iLCJzZW50ZW5jZSIsImNhdGVnb3JpZXMiLCJyZXN1bHQiLCJfcmFua2luZyIsInNlbnRlbmNlcyIsImVycm9ycyIsInRva2VucyIsImxpc3RBbGxIYXZpbmdDb250ZXh0IiwibGlzdEFsbFR1cGVsSGF2aW5nQ29udGV4dCIsIm1ha2VFcnJvcl9FTVBUWV9JTlBVVCIsImFTZW50ZW5jZXNSZWluZm9yY2VkIiwibWF0Y2hlZEFuc3dlcnMiLCJtYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcyIsIm1hdGNoZWRGaWx0ZXJlZCIsImZpbHRlck9ubHlUb3BSYW5rZWRUdXBlbCIsIm1hdGNoUmVjb3Jkc1R1cGVsSGF2aW5nQ29udGV4dCIsImZpbHRlclN0cmluZ0xpc3RCeU9wIiwib3BlcmF0b3IiLCJmcmFnbWVudCIsInNyY2FyciIsImZyYWdtZW50TEMiLCJ0cmltUXVvdGVkU3BhY2VkIiwidG9Mb3dlckNhc2UiLCJzdHIiLCJtYXRjaGVzIiwic29ydCIsImNvbXBhcmVDYXNlSW5zZW5zaXRpdmUiLCJhIiwiYiIsInIiLCJsb2NhbGVDb21wYXJlIiwicmVtb3ZlQ2FzZUR1cGxpY2F0ZXMiLCJhcnIiLCJzIiwiaW5kZXgiLCJnZXRDYXRlZ29yeU9wRmlsdGVyQXNEaXN0aW5jdFN0cmluZ3MiLCJmaWx0ZXJEb21haW4iLCJ0cmltUXVvdGVkIiwic2VlbiIsImZvckVhY2giLCJwdXNoIiwibGlrZWx5UGx1cmFsRGlmZiIsInBsdXJhbE9mYSIsImFMQyIsInBsdXJhbE9mQUxDIiwibGlzdEFsbFdpdGhDYXRlZ29yeSIsImpvaW5Tb3J0ZWRRdW90ZWQiLCJzdHJpbmdzIiwiam9pbiIsImpvaW5EaXN0aW5jdCIsInJlZHVjZSIsInByZXYiLCJvUmVjb3JkIiwiT2JqZWN0Iiwia2V5cyIsImZvcm1hdERpc3RpbmN0RnJvbVdoYXRJZlJlc3VsdCIsIm9BbnN3ZXIiLCJqb2luUmVzdWx0cyIsInJlc3VsdHMiLCJjbnQiLCJpbmRleE9mIiwiVXRpbHMiLCJqb2luUmVzdWx0c1R1cGVsIiwidmFsdWUiLCJsaXN0VG9RdW90ZWRDb21tYUFuZCIsImluZmVyRG9tYWluIiwidGhlTW9kZWwiLCJkb21haW5zIiwib1dvcmRHcm91cCIsIm1hdGNoZWRTdHJpbmciLCJzQ2F0IiwiZG9tcyIsImdldERvbWFpbnNGb3JDYXRlZ29yeSIsInNEb20iXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7QUNNQTs7QURLQSxJQUFBQSxRQUFBQyxRQUFBLE9BQUEsQ0FBQTtBQUVBLElBQU1DLFdBQVdGLE1BQU0sU0FBTixDQUFqQjtBQUNBLElBQUFHLFNBQUFGLFFBQUEsaUJBQUEsQ0FBQTtBQUNBLElBQUlHLFVBQVVELE9BQU9FLElBQVAsQ0FBWSxhQUFaLENBQWQ7QUFDQSxJQUFJQyxVQUFVTixNQUFNLE1BQU4sQ0FBZDtBQVFBLElBQUFPLFlBQUFOLFFBQUEsYUFBQSxDQUFBO0FBS0EsSUFBQU8sV0FBQVAsUUFBQSxZQUFB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QUFDRDtBQUNELFFBQUdBLFFBQVFoRixNQUFSLEdBQWlCLENBQXBCLEVBQXdCO0FBQ3RCdEIsaUJBQVNBLFNBQVNjLE9BQVQsR0FBbUIseUNBQXlDd0YsUUFBUW5CLElBQVIsQ0FBYSxJQUFiLENBQTVELEdBQWdGLEdBQXpGO0FBQ0EsZUFBT2xFLFNBQVA7QUFFRDtBQUNEakIsYUFBUyxvQ0FBVDtBQUNBO0FBQ0FxQixRQUFJa0IsU0FBSixDQUFjLENBQWQsRUFBaUJtQyxPQUFqQixDQUF5QixVQUFTNkIsVUFBVCxFQUFtQjtBQUMxQyxZQUFHQSxXQUFXM0YsUUFBWCxLQUF3QixVQUEzQixFQUF1QztBQUNyQyxnQkFBSTZGLE9BQU9GLFdBQVdDLGFBQXRCO0FBQ0EsZ0JBQUlFLE9BQU9qRyxNQUFNa0cscUJBQU4sQ0FBNEJOLFFBQTVCLEVBQXFDSSxJQUFyQyxDQUFYO0FBQ0FDLGlCQUFLaEMsT0FBTCxDQUFhLFVBQVNrQyxJQUFULEVBQWE7QUFDeEIsb0JBQUdOLFFBQVFQLE9BQVIsQ0FBZ0JhLElBQWhCLElBQXdCLENBQTNCLEVBQThCO0FBQzVCTiw0QkFBUTNCLElBQVIsQ0FBYWlDLElBQWI7QUFDRDtBQUNGLGFBSkQ7QUFLRDtBQUNGLEtBVkQ7QUFXQSxRQUFHTixRQUFRaEYsTUFBUixLQUFtQixDQUF0QixFQUF5QjtBQUN0QnRCLGlCQUFTLDBCQUEwQnNHLFFBQVEsQ0FBUixDQUFuQztBQUNELGVBQU9BLFFBQVEsQ0FBUixDQUFQO0FBQ0Q7QUFDRHRHLGFBQVNBLFNBQVNjLE9BQVQsR0FBb0IseUNBQXlDd0YsUUFBUW5CLElBQVIsQ0FBYSxJQUFiLENBQTdELEdBQWtGLEdBQTNGO0FBQ0EsV0FBT2xFLFNBQVA7QUFDRDtBQTdDRE0sUUFBQTZFLFdBQUEsR0FBQUEsV0FBQTtBQTZDQyIsImZpbGUiOiJtYXRjaC9saXN0YWxsLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKlxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuYW5hbHl6ZVxuICogQGZpbGUgYW5hbHl6ZS50c1xuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxuICovXG5cblxuaW1wb3J0ICogYXMgSW5wdXRGaWx0ZXIgZnJvbSAnLi9pbnB1dEZpbHRlcic7XG5cbmltcG9ydCAqIGFzIEFsZ29sIGZyb20gJy4vYWxnb2wnO1xuaW1wb3J0ICogYXMgZGVidWcgZnJvbSAnZGVidWcnO1xuXG5jb25zdCBkZWJ1Z2xvZyA9IGRlYnVnKCdsaXN0YWxsJyk7XG5pbXBvcnQgKiBhcyBsb2dnZXIgZnJvbSAnLi4vdXRpbHMvbG9nZ2VyJztcbnZhciBsb2dQZXJmID0gbG9nZ2VyLnBlcmYoXCJwZXJmbGlzdGFsbFwiKTtcbnZhciBwZXJmbG9nID0gZGVidWcoJ3BlcmYnKTtcbi8vY29uc3QgcGVyZmxvZyA9IGxvZ2dlci5wZXJmKFwicGVyZmxpc3RhbGxcIik7XG5cbmltcG9ydCAqIGFzIHV0aWxzIGZyb20gJy4uL3V0aWxzL3V0aWxzJztcblxuaW1wb3J0ICogYXMgSU1hdGNoIGZyb20gJy4vaWZtYXRjaCc7XG5cbmltcG9ydCAqIGFzIFRvb2xtYXRjaGVyIGZyb20gJy4vdG9vbG1hdGNoZXInO1xuaW1wb3J0ICogYXMgQnJlYWtEb3duIGZyb20gJy4vYnJlYWtkb3duJztcblxuaW1wb3J0ICogYXMgU2VudGVuY2UgZnJvbSAnLi9zZW50ZW5jZSc7XG5cbmltcG9ydCAqIGFzIFdvcmQgZnJvbSAnLi93b3JkJztcbmltcG9ydCAqIGFzIE9wZXJhdG9yIGZyb20gJy4vb3BlcmF0b3InO1xuXG5pbXBvcnQgKiBhcyBXaGF0SXMgZnJvbSAnLi93aGF0aXMnO1xuaW1wb3J0ICogYXMgRXJFcnJvciBmcm9tICcuL2VyZXJyb3InO1xuXG5pbXBvcnQgKiBhcyBNb2RlbCBmcm9tICcuLi9tb2RlbC9tb2RlbCc7XG5pbXBvcnQgKiBhcyBNYXRjaCBmcm9tICcuL21hdGNoJztcblxudmFyIHNXb3JkcyA9IHt9O1xuXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hSZWNvcmRIYXZpbmdDYXRlZ29yeShjYXRlZ29yeTogc3RyaW5nLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4pXG4gIDogQXJyYXk8SU1hdGNoLklSZWNvcmQ+IHtcbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IEpTT04uc3RyaW5naWZ5KHJlY29yZHMsdW5kZWZpbmVkLDIpIDogXCItXCIpO1xuICB2YXIgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZDogSU1hdGNoLklSZWNvcmQpIHtcbiAgICByZXR1cm4gKHJlY29yZFtjYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkgJiYgKHJlY29yZFtjYXRlZ29yeV0gIT09IG51bGwpO1xuICB9KTtcbiAgdmFyIHJlcyA9IFtdO1xuICBkZWJ1Z2xvZyhcInJlbGV2YW50IHJlY29yZHMgbnI6XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoKTtcbiAgcmV0dXJuIHJlbGV2YW50UmVjb3Jkcztcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZUNvbnRleHRTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nIDogc3RyaW5nLCAgcnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzKSB7XG4gIHJldHVybiBXaGF0SXMuYW5hbHl6ZUNvbnRleHRTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLHJ1bGVzKTtcbn1cblxuLy8gY29uc3QgcmVzdWx0ID0gV2hhdElzLnJlc29sdmVDYXRlZ29yeShjYXQsIGExLmVudGl0eSxcbi8vICAgdGhlTW9kZWwubVJ1bGVzLCB0aGVNb2RlbC50b29scywgdGhlTW9kZWwucmVjb3Jkcyk7XG5cblxuXG5leHBvcnQgZnVuY3Rpb24gbGlzdEFsbFdpdGhDb250ZXh0KGNhdGVnb3J5OiBzdHJpbmcsIGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLFxuICBhUnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sIGNhdGVnb3J5U2V0PzogeyBba2V5OiBzdHJpbmddOiBib29sZWFuIH0pOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnMge1xuICB2YXIgcmVzID0gbGlzdEFsbFR1cGVsV2l0aENvbnRleHQoW2NhdGVnb3J5XSwgY29udGV4dFF1ZXJ5U3RyaW5nLCBhUnVsZXMsIHJlY29yZHMsIGNhdGVnb3J5U2V0KTtcblxuICB2YXIgYW5zd2VycyA9IHJlcy50dXBlbGFuc3dlcnMubWFwKGZ1bmN0aW9uIChvKTogSU1hdGNoLklXaGF0SXNBbnN3ZXIge1xuICAgIHJldHVybiB7XG4gICAgICBzZW50ZW5jZTogby5zZW50ZW5jZSxcbiAgICAgIHJlY29yZDogby5yZWNvcmQsXG4gICAgICBjYXRlZ29yeTogby5jYXRlZ29yaWVzWzBdLFxuICAgICAgcmVzdWx0OiBvLnJlc3VsdFswXSxcbiAgICAgIF9yYW5raW5nOiBvLl9yYW5raW5nXG4gICAgfTtcbiAgfVxuICApO1xuICByZXR1cm4ge1xuICAgIHNlbnRlbmNlczogcmVzLnNlbnRlbmNlcyxcbiAgICBlcnJvcnM6IHJlcy5lcnJvcnMsXG4gICAgdG9rZW5zOiByZXMudG9rZW5zLFxuICAgIGFuc3dlcnM6IGFuc3dlcnNcbiAgfTtcbn1cblxuLypcbmV4cG9ydCBmdW5jdGlvbiBsaXN0QWxsV2l0aENvbnRleHRYWChjYXRlZ29yeTogc3RyaW5nLCBjb250ZXh0UXVlcnlTdHJpbmc6IHN0cmluZyxcbiAgYVJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+LCBjYXRlZ29yeVNldD86IHsgW2tleSA6IHN0cmluZ10gOiBib29sZWFuIH0pOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnNcbiB7XG4gIGlmIChjb250ZXh0UXVlcnlTdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGFuc3dlcnMgOiBbXSxcbiAgICAgIGVycm9ycyA6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSAsXG4gICAgICB0b2tlbnMgOltdXG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICBsb2dQZXJmKCdsaXN0QWxsV2l0aENvbnRleHQnKTtcbiAgICBwZXJmbG9nKFwidG90YWxMaXN0QWxsV2l0aENvbnRleHRcIik7XG4gICAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gYW5hbHl6ZUNvbnRleHRTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCBhUnVsZXMpO1xuICAgIGRlYnVnbG9nKFwibGlzdEFsbFdpdGhDb250ZXh0Om1hdGNoaW5nIHJlY29yZHMgKHM9XCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubGVuZ3RoICsgXCIpLi4uXCIpO1xuICAgIGRlYnVnbG9nKFwiaGVyZSBzZW50ZW5jZXNcIiArIEpTT04uc3RyaW5naWZ5KGFTZW50ZW5jZXNSZWluZm9yY2VkLHVuZGVmaW5lZCwyKSk7XG4gICAgcGVyZmxvZyhcIm1hdGNoaW5nIHJlY29yZHMgKHM9XCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubGVuZ3RoICsgXCIpLi4uXCIpO1xuICAgIHZhciBtYXRjaGVkQW5zd2VycyA9IFdoYXRJcy5tYXRjaFJlY29yZHNRdWljayhhU2VudGVuY2VzUmVpbmZvcmNlZCwgY2F0ZWdvcnksIHJlY29yZHMsIGNhdGVnb3J5U2V0KTtcbiAgICAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8gKiBvYmplY3RzdHJlYW0qIC8ge1xuICAgIGlmKGRlYnVnbG9nLmVuYWJsZWQpe1xuICAgICAgZGVidWdsb2coXCIgbWF0Y2hlZCBBbnN3ZXJzXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkQW5zd2VycywgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHBlcmZsb2coXCJmaWx0ZXJpbmcgdG9wUmFua2VkIChhPVwiICsgbWF0Y2hlZEFuc3dlcnMuYW5zd2Vycy5sZW5ndGggKyBcIikuLi5cIik7XG4gICAgdmFyIG1hdGNoZWRGaWx0ZXJlZCA9IFdoYXRJcy5maWx0ZXJPbmx5VG9wUmFua2VkKG1hdGNoZWRBbnN3ZXJzLmFuc3dlcnMpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICBkZWJ1Z2xvZyhcIiBtYXRjaGVkIHRvcC1yYW5rZWQgQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEZpbHRlcmVkLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgcGVyZmxvZyhcInRvdGFsTGlzdEFsbFdpdGhDb250ZXh0IChhPVwiICsgbWF0Y2hlZEZpbHRlcmVkLmxlbmd0aCArIFwiKVwiKTtcbiAgICBsb2dQZXJmKCdsaXN0QWxsV2l0aENvbnRleHQnKTtcbiAgICByZXR1cm4ge1xuICAgICBhbnN3ZXJzIDogIG1hdGNoZWRGaWx0ZXJlZCwgLy8gPz8/IEFuc3dlcnM7XG4gICAgIGVycm9ycyA6IGFTZW50ZW5jZXNSZWluZm9yY2VkLmVycm9ycyxcbiAgICAgdG9rZW5zIDogYVNlbnRlbmNlc1JlaW5mb3JjZWQudG9rZW5zXG4gICAgfVxuIH1cbn1cbiovXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RBbGxIYXZpbmdDb250ZXh0KGNhdGVnb3J5OiBzdHJpbmcsIGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLFxuICBhUnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sXG4gIGNhdGVnb3J5U2V0IDogeyBba2V5OnN0cmluZ10gOiBib29sZWFuIH0pOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnMge1xuICB2YXIgcmVzID0gbGlzdEFsbFR1cGVsSGF2aW5nQ29udGV4dChbY2F0ZWdvcnldLCBjb250ZXh0UXVlcnlTdHJpbmcsIGFSdWxlcywgcmVjb3JkcywgY2F0ZWdvcnlTZXQpO1xuICB2YXIgYW5zd2VycyA9IHJlcy50dXBlbGFuc3dlcnMubWFwKGZ1bmN0aW9uIChvKTogSU1hdGNoLklXaGF0SXNBbnN3ZXIge1xuICAgIHJldHVybiB7XG4gICAgICBzZW50ZW5jZTogby5zZW50ZW5jZSxcbiAgICAgIHJlY29yZDogby5yZWNvcmQsXG4gICAgICBjYXRlZ29yeTogby5jYXRlZ29yaWVzWzBdLFxuICAgICAgcmVzdWx0OiBvLnJlc3VsdFswXSxcbiAgICAgIF9yYW5raW5nOiBvLl9yYW5raW5nXG4gICAgfTtcbiAgfVxuICApO1xuICByZXR1cm4ge1xuICAgIHNlbnRlbmNlczogcmVzLnNlbnRlbmNlcyxcbiAgICBlcnJvcnM6IHJlcy5lcnJvcnMsXG4gICAgdG9rZW5zOiByZXMudG9rZW5zLFxuICAgIGFuc3dlcnM6IGFuc3dlcnNcbiAgfTtcbn1cblxuLypcbmV4cG9ydCBmdW5jdGlvbiBsaXN0QWxsSGF2aW5nQ29udGV4dFhYKGNhdGVnb3J5OiBzdHJpbmcsIGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLFxuICBhUnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sXG4gIGNhdGVnb3J5U2V0IDogeyBba2V5OnN0cmluZ10gOiBib29sZWFuIH0pOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnMge1xuICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcnMgOiBbRXJFcnJvci5tYWtlRXJyb3JfRU1QVFlfSU5QVVQoKV0gLFxuICAgICAgdG9rZW5zIDpbXSxcbiAgICAgIGFuc3dlcnM6W11cbiAgIH07XG4gIH0gZWxzZSB7XG4gICAgcGVyZmxvZyhcImFuYWx5emVDb250ZXh0U3RyaW5nIC4uLlwiKTtcbiAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBhbmFseXplQ29udGV4dFN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIGFSdWxlcyk7XG4gICAgcGVyZmxvZyhcIm1hdGNoaW5nIHJlY29yZHMgaGF2aW5nIChzPVwiICsgKGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5sZW5ndGgpICsgXCIpLi4uXCIpO1xuICAgIHZhciBtYXRjaGVkQW5zd2VycyA9IFdoYXRJcy5tYXRjaFJlY29yZHNIYXZpbmdDb250ZXh0KGFTZW50ZW5jZXNSZWluZm9yY2VkLCBjYXRlZ29yeSwgcmVjb3JkcywgY2F0ZWdvcnlTZXQpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8gKiBvYmplY3RzdHJlYW0qIC8ge1xuICAgIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgIGRlYnVnbG9nKFwiTEFIQyBtYXRjaGVkIEFuc3dlcnNcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRBbnN3ZXJzLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgcGVyZmxvZyhcImZpbHRlcmluZ1RvcFJhbmtlZCAoYT1cIiArIG1hdGNoZWRBbnN3ZXJzLnNlbnRlbmNlcy5sZW5ndGggKyBcIikuLi5cIik7XG4gICAgbWF0Y2hlZEFuc3dlcnMuYW5zd2VycyA9IFdoYXRJcy5maWx0ZXJPbmx5VG9wUmFua2VkKG1hdGNoZWRBbnN3ZXJzLmFuc3dlcnMpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICBkZWJ1Z2xvZyhcIiBtYXRjaGVkIHRvcC1yYW5rZWQgQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMuYW5zd2VycywgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHBlcmZsb2coXCJ0b3RhbExpc3RBbGxIYXZpbmdDb250ZXh0IChhPVwiICsgbWF0Y2hlZEFuc3dlcnMuYW5zd2Vycy5sZW5ndGggKyBcIilcIik7XG4gICAgcmV0dXJuIG1hdGNoZWRBbnN3ZXJzO1xuICB9XG59XG4qL1xuXG5leHBvcnQgZnVuY3Rpb24gbGlzdEFsbFR1cGVsV2l0aENvbnRleHQoY2F0ZWdvcmllczogc3RyaW5nW10sIGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLFxuICBhUnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sIGNhdGVnb3J5U2V0PzogeyBba2V5IDogc3RyaW5nXSA6IGJvb2xlYW4gfSk6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzVHVwZWxBbnN3ZXJzIHtcbiAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4ge1xuICAgICAgdHVwZWxhbnN3ZXJzIDogW10sXG4gICAgICBlcnJvcnMgOiBbRXJFcnJvci5tYWtlRXJyb3JfRU1QVFlfSU5QVVQoKV0gLFxuICAgICAgdG9rZW5zIDpbXSxcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIGxvZ1BlcmYoJ2xpc3RBbGxXaXRoQ29udGV4dCcpO1xuICAgIHBlcmZsb2coXCJ0b3RhbExpc3RBbGxXaXRoQ29udGV4dFwiKTtcbiAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBhbmFseXplQ29udGV4dFN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIGFSdWxlcyk7XG4gICAgcGVyZmxvZyhcIkxBVFdDIG1hdGNoaW5nIHJlY29yZHMgKHM9XCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubGVuZ3RoICsgXCIpLi4uXCIpO1xuICAgIHZhciBtYXRjaGVkQW5zd2VycyA9IFdoYXRJcy5tYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcyhhU2VudGVuY2VzUmVpbmZvcmNlZCwgY2F0ZWdvcmllcywgcmVjb3JkcywgY2F0ZWdvcnlTZXQpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8qIG9iamVjdHN0cmVhbSovIHtcbiAgICBpZihkZWJ1Z2xvZy5lbmFibGVkKXtcbiAgICAgIGRlYnVnbG9nKFwiIG1hdGNoZWQgQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMsIHVuZGVmaW5lZCwgMikpO1xuICAgIH1cbiAgICBwZXJmbG9nKFwiZmlsdGVyaW5nIHRvcFJhbmtlZCAoYT1cIiArIG1hdGNoZWRBbnN3ZXJzLnR1cGVsYW5zd2Vycy5sZW5ndGggKyBcIikuLi5cIik7XG4gICAgdmFyIG1hdGNoZWRGaWx0ZXJlZCA9IFdoYXRJcy5maWx0ZXJPbmx5VG9wUmFua2VkVHVwZWwobWF0Y2hlZEFuc3dlcnMudHVwZWxhbnN3ZXJzKTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgZGVidWdsb2coXCJMQVRXQyBtYXRjaGVkIHRvcC1yYW5rZWQgQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEZpbHRlcmVkLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgcGVyZmxvZyhcInRvdGFsTGlzdEFsbFdpdGhDb250ZXh0IChhPVwiICsgbWF0Y2hlZEZpbHRlcmVkLmxlbmd0aCArIFwiKVwiKTtcbiAgICBsb2dQZXJmKCdsaXN0QWxsV2l0aENvbnRleHQnKTtcbiAgICByZXR1cm4ge1xuICAgICAgdHVwZWxhbnN3ZXJzIDogbWF0Y2hlZEZpbHRlcmVkLCAvLyA/Pz8gQW5zd2VycztcbiAgICAgIGVycm9ycyA6IGFTZW50ZW5jZXNSZWluZm9yY2VkLmVycm9ycyxcbiAgICAgIHRva2VuczogYVNlbnRlbmNlc1JlaW5mb3JjZWQudG9rZW5zXG4gICAgfVxuICB9XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RBbGxUdXBlbEhhdmluZ0NvbnRleHQoY2F0ZWdvcmllczogc3RyaW5nW10sIGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLFxuICBhUnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sXG4gIGNhdGVnb3J5U2V0IDogeyBba2V5OnN0cmluZ10gOiBib29sZWFuIH0pOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc1R1cGVsQW5zd2VycyB7XG4gIGlmIChjb250ZXh0UXVlcnlTdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHR1cGVsYW5zd2VycyA6IFtdLFxuICAgICAgZXJyb3JzIDogW0VyRXJyb3IubWFrZUVycm9yX0VNUFRZX0lOUFVUKCldICxcbiAgICAgIHRva2VucyA6W10sXG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICBwZXJmbG9nKFwiYW5hbHl6ZUNvbnRleHRTdHJpbmcgLi4uXCIpO1xuICAgIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IGFuYWx5emVDb250ZXh0U3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgYVJ1bGVzKTtcbiAgICBwZXJmbG9nKFwibWF0Y2hpbmcgcmVjb3JkcyBoYXZpbmcgKHM9XCIgKyAoYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLmxlbmd0aCkgKyBcIikuLi5cIik7XG4gICAgdmFyIG1hdGNoZWRBbnN3ZXJzID0gV2hhdElzLm1hdGNoUmVjb3Jkc1R1cGVsSGF2aW5nQ29udGV4dChhU2VudGVuY2VzUmVpbmZvcmNlZCwgY2F0ZWdvcmllcywgcmVjb3JkcywgY2F0ZWdvcnlTZXQpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8qIG9iamVjdHN0cmVhbSovIHtcbiAgICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICBkZWJ1Z2xvZyhcIiBtYXRjaGVkIEFuc3dlcnNcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRBbnN3ZXJzLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgcGVyZmxvZyhcImZpbHRlcmluZ1RvcFJhbmtlZCAoYT1cIiArIG1hdGNoZWRBbnN3ZXJzLnR1cGVsYW5zd2Vycy5sZW5ndGggKyBcIikuLi5cIik7XG4gICAgdmFyIG1hdGNoZWRGaWx0ZXJlZCA9IFdoYXRJcy5maWx0ZXJPbmx5VG9wUmFua2VkVHVwZWwobWF0Y2hlZEFuc3dlcnMudHVwZWxhbnN3ZXJzKTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgZGVidWdsb2coXCIgbWF0Y2hlZCB0b3AtcmFua2VkIEFuc3dlcnNcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRGaWx0ZXJlZCwgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHBlcmZsb2coXCJ0b3RhbExpc3RBbGxIYXZpbmdDb250ZXh0IChhPVwiICsgbWF0Y2hlZEZpbHRlcmVkLmxlbmd0aCArIFwiKVwiKTtcbiAgICByZXR1cm4ge1xuICAgICAgdHVwZWxhbnN3ZXJzIDogIG1hdGNoZWRGaWx0ZXJlZCxcbiAgICAgIGVycm9ycyA6IGFTZW50ZW5jZXNSZWluZm9yY2VkLmVycm9ycyxcbiAgICAgIHRva2VuczogYVNlbnRlbmNlc1JlaW5mb3JjZWQudG9rZW5zXG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJTdHJpbmdMaXN0QnlPcChvcGVyYXRvcjogSU1hdGNoLklPcGVyYXRvciwgZnJhZ21lbnQgOiBzdHJpbmcsICBzcmNhcnIgOiBzdHJpbmdbXSApIDogc3RyaW5nW10ge1xuICB2YXIgZnJhZ21lbnRMQyA9IEJyZWFrRG93bi50cmltUXVvdGVkU3BhY2VkKGZyYWdtZW50LnRvTG93ZXJDYXNlKCkpO1xuICByZXR1cm4gc3JjYXJyLmZpbHRlcihmdW5jdGlvbihzdHIpIHtcbiAgICByZXR1cm4gT3BlcmF0b3IubWF0Y2hlcyhvcGVyYXRvciwgZnJhZ21lbnRMQywgc3RyLnRvTG93ZXJDYXNlKCkpO1xuICB9KS5zb3J0KCk7XG59XG5cbmZ1bmN0aW9uIGNvbXBhcmVDYXNlSW5zZW5zaXRpdmUoYTogc3RyaW5nLCBiIDogc3RyaW5nKSB7XG4gIHZhciByID0gYS50b0xvd2VyQ2FzZSgpLmxvY2FsZUNvbXBhcmUoYi50b0xvd2VyQ2FzZSgpKTtcbiAgaWYgKHIpIHtcbiAgICByZXR1cm4gcjtcbiAgfVxuICByZXR1cm4gLWEubG9jYWxlQ29tcGFyZShiKTtcbn1cblxuLyoqXG4gKiBTb3J0IHN0cmluZyBsaXN0IGNhc2UgaW5zZW5zaXRpdmUsIHRoZW4gcmVtb3ZlIGR1cGxpY2F0ZXMgcmV0YWluaW5nXG4gKiBcImxhcmdlc3RcIiBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVtb3ZlQ2FzZUR1cGxpY2F0ZXMoYXJyIDogc3RyaW5nW10pIDogc3RyaW5nW10ge1xuICBhcnIuc29ydChjb21wYXJlQ2FzZUluc2Vuc2l0aXZlKTtcbiAgZGVidWdsb2coJ3NvcnRlZCBhcnInICsgSlNPTi5zdHJpbmdpZnkoYXJyKSk7XG4gIHJldHVybiBhcnIuZmlsdGVyKGZ1bmN0aW9uKHMsIGluZGV4KSB7XG4gICAgcmV0dXJuIGluZGV4ID09PSAwIHx8ICgwICE9PSBhcnJbaW5kZXggLTEgXS50b0xvd2VyQ2FzZSgpLmxvY2FsZUNvbXBhcmUocy50b0xvd2VyQ2FzZSgpKSk7XG4gIH0pO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldENhdGVnb3J5T3BGaWx0ZXJBc0Rpc3RpbmN0U3RyaW5ncyhvcGVyYXRvcjogSU1hdGNoLklPcGVyYXRvciwgZnJhZ21lbnQgOiBzdHJpbmcsXG4gIGNhdGVnb3J5IDogc3RyaW5nLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sIGZpbHRlckRvbWFpbj8gOiBzdHJpbmcpIDogc3RyaW5nW10ge1xuICAgIHZhciBmcmFnbWVudExDID0gQnJlYWtEb3duLnRyaW1RdW90ZWQoZnJhZ21lbnQudG9Mb3dlckNhc2UoKSk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIHZhciBzZWVuID0ge307XG4gICAgcmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uKHJlY29yZCkge1xuICAgICAgaWYoZmlsdGVyRG9tYWluICYmIHJlY29yZCBbJ19kb21haW4nXSAhPT0gZmlsdGVyRG9tYWluKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmKHJlY29yZFtjYXRlZ29yeV0gJiYgT3BlcmF0b3IubWF0Y2hlcyhvcGVyYXRvciwgZnJhZ21lbnRMQywgcmVjb3JkW2NhdGVnb3J5XS50b0xvd2VyQ2FzZSgpKSkge1xuICAgICAgICBpZighc2VlbltyZWNvcmRbY2F0ZWdvcnldXSkge1xuICAgICAgICAgIHNlZW5bcmVjb3JkW2NhdGVnb3J5XV0gPSB0cnVlO1xuICAgICAgICAgIHJlcy5wdXNoKHJlY29yZFtjYXRlZ29yeV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlbW92ZUNhc2VEdXBsaWNhdGVzKHJlcyk7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gbGlrZWx5UGx1cmFsRGlmZihhIDogc3RyaW5nLCBwbHVyYWxPZmEgOiBzdHJpbmcpIDogYm9vbGVhbiB7XG4gIHZhciBhTEMgPSBCcmVha0Rvd24udHJpbVF1b3RlZChhLnRvTG93ZXJDYXNlKCkpICB8fCBcIlwiO1xuICB2YXIgcGx1cmFsT2ZBTEMgPSBCcmVha0Rvd24udHJpbVF1b3RlZCgocGx1cmFsT2ZhIHx8XCJcIikudG9Mb3dlckNhc2UoKSkgfHwgXCJcIjtcbiAgaWYgKGFMQyA9PT0gcGx1cmFsT2ZBTEMpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBpZiggYUxDICsncycgPT09IHBsdXJhbE9mQUxDKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuXG5leHBvcnQgZnVuY3Rpb24gbGlzdEFsbFdpdGhDYXRlZ29yeShjYXRlZ29yeTogc3RyaW5nLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4pOiBBcnJheTxJTWF0Y2guSVJlY29yZD4ge1xuICB2YXIgbWF0Y2hlZEFuc3dlcnMgPSBtYXRjaFJlY29yZEhhdmluZ0NhdGVnb3J5KGNhdGVnb3J5LCByZWNvcmRzKTsgLy9hVG9vbDogQXJyYXk8SU1hdGNoLklUb29sPik6IGFueSAvKiBvYmplY3RzdHJlYW0qLyB7XG4gIGRlYnVnbG9nKFwiIGxpc3RBbGxXaXRoQ2F0ZWdvcnk6XCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkQW5zd2VycywgdW5kZWZpbmVkLCAyKSk7XG4gIHJldHVybiBtYXRjaGVkQW5zd2Vycztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGpvaW5Tb3J0ZWRRdW90ZWQoc3RyaW5ncyA6IHN0cmluZ1tdICkgOiBzdHJpbmcge1xuICBpZiAoc3RyaW5ncy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gXCJcIjtcbiAgfVxuICByZXR1cm4gJ1wiJyArIHN0cmluZ3Muc29ydCgpLmpvaW4oJ1wiOyBcIicpICsgJ1wiJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGpvaW5EaXN0aW5jdChjYXRlZ29yeSA6IHN0cmluZywgcmVjb3JkcyA6IEFycmF5PElNYXRjaC5JUmVjb3JkPikgOiBzdHJpbmcge1xuICB2YXIgcmVzID0gcmVjb3Jkcy5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgb1JlY29yZCkge1xuICAgIHByZXZbb1JlY29yZFtjYXRlZ29yeV1dID0gMTtcbiAgICByZXR1cm4gcHJldjtcbiAgfSx7fSBhcyBhbnkpO1xuICByZXR1cm4gam9pblNvcnRlZFF1b3RlZChPYmplY3Qua2V5cyhyZXMpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdERpc3RpbmN0RnJvbVdoYXRJZlJlc3VsdCggYW5zd2VycyA6IEFycmF5PElNYXRjaC5JV2hhdElzQW5zd2VyPikgOiBzdHJpbmcge1xuICByZXR1cm4gam9pblNvcnRlZFF1b3RlZChhbnN3ZXJzLm1hcChmdW5jdGlvbihvQW5zd2VyKSB7XG4gICAgcmV0dXJuIG9BbnN3ZXIucmVzdWx0O1xuICB9KSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBqb2luUmVzdWx0cyhyZXN1bHRzOiBBcnJheTxJTWF0Y2guSVdoYXRJc0Fuc3dlcj4pOiBzdHJpbmdbXSB7XG4gIHZhciByZXMgID0gW107XG4gIHZhciBjbnQgPSByZXN1bHRzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgcmVzdWx0KSB7XG4gICAgaWYgKHJlc3VsdC5fcmFua2luZyA9PT0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgaWYocmVzLmluZGV4T2YocmVzdWx0LnJlc3VsdCkgPCAwICl7XG4gICAgICAgIHJlcy5wdXNoKHJlc3VsdC5yZXN1bHQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHByZXYgKyAxO1xuICAgIH1cbiAgfSwgMCk7XG4gIHJldHVybiByZXM7XG59XG5cbmltcG9ydCAqIGFzIFV0aWxzIGZyb20gJy4uL3V0aWxzL3V0aWxzJztcblxuZXhwb3J0IGZ1bmN0aW9uIGpvaW5SZXN1bHRzVHVwZWwocmVzdWx0czogQXJyYXk8SU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlcj4pOiBzdHJpbmdbXSB7XG4gIHZhciByZXMgID0gW107XG4gIHZhciBjbnQgPSByZXN1bHRzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgcmVzdWx0KSB7XG4gICAgaWYgKHJlc3VsdC5fcmFua2luZyA9PT0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgdmFyIHZhbHVlID0gVXRpbHMubGlzdFRvUXVvdGVkQ29tbWFBbmQocmVzdWx0LnJlc3VsdCk7XG4gICAgICBpZihyZXMuaW5kZXhPZih2YWx1ZSkgPCAwICl7XG4gICAgICAgIHJlcy5wdXNoKHZhbHVlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcmV2ICsgMTtcbiAgICB9XG4gIH0sIDApO1xuICByZXR1cm4gcmVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5mZXJEb21haW4odGhlTW9kZWwgOiBJTWF0Y2guSU1vZGVscywgY29udGV4dFF1ZXJ5U3RyaW5nOiBzdHJpbmcpOiBzdHJpbmcge1xuIC8vIGNvbnNvbGUubG9nKFwiaGVyZSB0aGUgc3RyaW5nXCIgKyBjb250ZXh0UXVlcnlTdHJpbmcpO1xuIC8vICBjb25zb2xlLmxvZyhcImhlcmUgdGhlIHJ1bGVzXCIgKyBKU09OLnN0cmluZ2lmeSh0aGVNb2RlbC5tUnVsZXMpKTtcbiAgdmFyIHJlcyA9IGFuYWx5emVDb250ZXh0U3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgdGhlTW9kZWwucnVsZXMpO1xuICAvL2NvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHJlcyx1bmRlZmluZWQsMikpO1xuICAvLyBydW4gdGhyb3VnaCB0aGUgc3RyaW5nLCBzZWFyY2ggZm9yIGEgY2F0ZWdvcnlcbiAgaWYoIXJlcy5zZW50ZW5jZXMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICB2YXIgZG9tYWlucyA9IFtdO1xuICAvL2NvbnNvbGUubG9nKFNlbnRlbmNlLmR1bXBOaWNlQXJyKHJlcykpO1xuICAvLyBkbyB3ZSBoYXZlIGEgZG9tYWluID9cbiAgcmVzLnNlbnRlbmNlc1swXS5mb3JFYWNoKGZ1bmN0aW9uKG9Xb3JkR3JvdXApIHtcbiAgICBpZihvV29yZEdyb3VwLmNhdGVnb3J5ID09PSBcImRvbWFpblwiKSB7XG4gICAgICBkb21haW5zLnB1c2gob1dvcmRHcm91cC5tYXRjaGVkU3RyaW5nKVxuICAgIH1cbiAgfSk7XG4gIGlmKGRvbWFpbnMubGVuZ3RoID09PSAxKSB7XG4gICAgZGVidWdsb2coXCJnb3QgYSBwcmVjaXNlIGRvbWFpbiBcIiArIGRvbWFpbnNbMF0pO1xuICAgIHJldHVybiBkb21haW5zWzBdO1xuICB9XG4gIGlmKGRvbWFpbnMubGVuZ3RoID4gMCApIHtcbiAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkPyAoXCJnb3QgbW9yZSB0aGFuIG9uZSBkb21haW4sIGNvbmZ1c2VkICBcIiArIGRvbWFpbnMuam9pbihcIlxcblwiKSk6Jy0nKTtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIC8vIFRPRE9EXG4gIH1cbiAgZGVidWdsb2coXCJhdHRlbXB0aW5nIHRvIGRldGVybWluZSBjYXRlZ29yaWVzXCIpXG4gIC8vIHRyeSBhIGNhdGVnb3J5IHJldmVyc2UgbWFwXG4gIHJlcy5zZW50ZW5jZXNbMF0uZm9yRWFjaChmdW5jdGlvbihvV29yZEdyb3VwKXtcbiAgICBpZihvV29yZEdyb3VwLmNhdGVnb3J5ID09PSBcImNhdGVnb3J5XCIpIHtcbiAgICAgIHZhciBzQ2F0ID0gb1dvcmRHcm91cC5tYXRjaGVkU3RyaW5nO1xuICAgICAgdmFyIGRvbXMgPSBNb2RlbC5nZXREb21haW5zRm9yQ2F0ZWdvcnkodGhlTW9kZWwsc0NhdCk7XG4gICAgICBkb21zLmZvckVhY2goZnVuY3Rpb24oc0RvbSkge1xuICAgICAgICBpZihkb21haW5zLmluZGV4T2Yoc0RvbSkgPCAwKSB7XG4gICAgICAgICAgZG9tYWlucy5wdXNoKHNEb20pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuICBpZihkb21haW5zLmxlbmd0aCA9PT0gMSkge1xuICAgICBkZWJ1Z2xvZyhcImdvdCBhIHByZWNpc2UgZG9tYWluIFwiICsgZG9tYWluc1swXSk7XG4gICAgcmV0dXJuIGRvbWFpbnNbMF07XG4gIH1cbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImdvdCBtb3JlIHRoYW4gb25lIGRvbWFpbiwgY29uZnVzZWQgIFwiICsgZG9tYWlucy5qb2luKFwiXFxuXCIpKSA6Jy0nKTtcbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn07IiwiLyoqXG4gKlxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuYW5hbHl6ZVxuICogQGZpbGUgYW5hbHl6ZS50c1xuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxuICovXG5cInVzZSBzdHJpY3RcIjtcbnZhciBkZWJ1ZyA9IHJlcXVpcmUoXCJkZWJ1Z1wiKTtcbnZhciBkZWJ1Z2xvZyA9IGRlYnVnKCdsaXN0YWxsJyk7XG52YXIgbG9nZ2VyID0gcmVxdWlyZShcIi4uL3V0aWxzL2xvZ2dlclwiKTtcbnZhciBsb2dQZXJmID0gbG9nZ2VyLnBlcmYoXCJwZXJmbGlzdGFsbFwiKTtcbnZhciBwZXJmbG9nID0gZGVidWcoJ3BlcmYnKTtcbnZhciBCcmVha0Rvd24gPSByZXF1aXJlKFwiLi9icmVha2Rvd25cIik7XG52YXIgT3BlcmF0b3IgPSByZXF1aXJlKFwiLi9vcGVyYXRvclwiKTtcbnZhciBXaGF0SXMgPSByZXF1aXJlKFwiLi93aGF0aXNcIik7XG52YXIgRXJFcnJvciA9IHJlcXVpcmUoXCIuL2VyZXJyb3JcIik7XG52YXIgTW9kZWwgPSByZXF1aXJlKFwiLi4vbW9kZWwvbW9kZWxcIik7XG52YXIgc1dvcmRzID0ge307XG5mdW5jdGlvbiBtYXRjaFJlY29yZEhhdmluZ0NhdGVnb3J5KGNhdGVnb3J5LCByZWNvcmRzKSB7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IEpTT04uc3RyaW5naWZ5KHJlY29yZHMsIHVuZGVmaW5lZCwgMikgOiBcIi1cIik7XG4gICAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnldICE9PSBudWxsKTtcbiAgICB9KTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgZGVidWdsb2coXCJyZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCk7XG4gICAgcmV0dXJuIHJlbGV2YW50UmVjb3Jkcztcbn1cbmV4cG9ydHMubWF0Y2hSZWNvcmRIYXZpbmdDYXRlZ29yeSA9IG1hdGNoUmVjb3JkSGF2aW5nQ2F0ZWdvcnk7XG5mdW5jdGlvbiBhbmFseXplQ29udGV4dFN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKSB7XG4gICAgcmV0dXJuIFdoYXRJcy5hbmFseXplQ29udGV4dFN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKTtcbn1cbmV4cG9ydHMuYW5hbHl6ZUNvbnRleHRTdHJpbmcgPSBhbmFseXplQ29udGV4dFN0cmluZztcbi8vIGNvbnN0IHJlc3VsdCA9IFdoYXRJcy5yZXNvbHZlQ2F0ZWdvcnkoY2F0LCBhMS5lbnRpdHksXG4vLyAgIHRoZU1vZGVsLm1SdWxlcywgdGhlTW9kZWwudG9vbHMsIHRoZU1vZGVsLnJlY29yZHMpO1xuZnVuY3Rpb24gbGlzdEFsbFdpdGhDb250ZXh0KGNhdGVnb3J5LCBjb250ZXh0UXVlcnlTdHJpbmcsIGFSdWxlcywgcmVjb3JkcywgY2F0ZWdvcnlTZXQpIHtcbiAgICB2YXIgcmVzID0gbGlzdEFsbFR1cGVsV2l0aENvbnRleHQoW2NhdGVnb3J5XSwgY29udGV4dFF1ZXJ5U3RyaW5nLCBhUnVsZXMsIHJlY29yZHMsIGNhdGVnb3J5U2V0KTtcbiAgICB2YXIgYW5zd2VycyA9IHJlcy50dXBlbGFuc3dlcnMubWFwKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzZW50ZW5jZTogby5zZW50ZW5jZSxcbiAgICAgICAgICAgIHJlY29yZDogby5yZWNvcmQsXG4gICAgICAgICAgICBjYXRlZ29yeTogby5jYXRlZ29yaWVzWzBdLFxuICAgICAgICAgICAgcmVzdWx0OiBvLnJlc3VsdFswXSxcbiAgICAgICAgICAgIF9yYW5raW5nOiBvLl9yYW5raW5nXG4gICAgICAgIH07XG4gICAgfSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2VudGVuY2VzOiByZXMuc2VudGVuY2VzLFxuICAgICAgICBlcnJvcnM6IHJlcy5lcnJvcnMsXG4gICAgICAgIHRva2VuczogcmVzLnRva2VucyxcbiAgICAgICAgYW5zd2VyczogYW5zd2Vyc1xuICAgIH07XG59XG5leHBvcnRzLmxpc3RBbGxXaXRoQ29udGV4dCA9IGxpc3RBbGxXaXRoQ29udGV4dDtcbi8qXG5leHBvcnQgZnVuY3Rpb24gbGlzdEFsbFdpdGhDb250ZXh0WFgoY2F0ZWdvcnk6IHN0cmluZywgY29udGV4dFF1ZXJ5U3RyaW5nOiBzdHJpbmcsXG4gIGFSdWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPiwgY2F0ZWdvcnlTZXQ/OiB7IFtrZXkgOiBzdHJpbmddIDogYm9vbGVhbiB9KTogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzXG4ge1xuICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB7XG4gICAgICBhbnN3ZXJzIDogW10sXG4gICAgICBlcnJvcnMgOiBbRXJFcnJvci5tYWtlRXJyb3JfRU1QVFlfSU5QVVQoKV0gLFxuICAgICAgdG9rZW5zIDpbXVxuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgbG9nUGVyZignbGlzdEFsbFdpdGhDb250ZXh0Jyk7XG4gICAgcGVyZmxvZyhcInRvdGFsTGlzdEFsbFdpdGhDb250ZXh0XCIpO1xuICAgIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IGFuYWx5emVDb250ZXh0U3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgYVJ1bGVzKTtcbiAgICBkZWJ1Z2xvZyhcImxpc3RBbGxXaXRoQ29udGV4dDptYXRjaGluZyByZWNvcmRzIChzPVwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLmxlbmd0aCArIFwiKS4uLlwiKTtcbiAgICBkZWJ1Z2xvZyhcImhlcmUgc2VudGVuY2VzXCIgKyBKU09OLnN0cmluZ2lmeShhU2VudGVuY2VzUmVpbmZvcmNlZCx1bmRlZmluZWQsMikpO1xuICAgIHBlcmZsb2coXCJtYXRjaGluZyByZWNvcmRzIChzPVwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLmxlbmd0aCArIFwiKS4uLlwiKTtcbiAgICB2YXIgbWF0Y2hlZEFuc3dlcnMgPSBXaGF0SXMubWF0Y2hSZWNvcmRzUXVpY2soYVNlbnRlbmNlc1JlaW5mb3JjZWQsIGNhdGVnb3J5LCByZWNvcmRzLCBjYXRlZ29yeVNldCk7XG4gICAgLy9hVG9vbDogQXJyYXk8SU1hdGNoLklUb29sPik6IGFueSAvICogb2JqZWN0c3RyZWFtKiAvIHtcbiAgICBpZihkZWJ1Z2xvZy5lbmFibGVkKXtcbiAgICAgIGRlYnVnbG9nKFwiIG1hdGNoZWQgQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMsIHVuZGVmaW5lZCwgMikpO1xuICAgIH1cbiAgICBwZXJmbG9nKFwiZmlsdGVyaW5nIHRvcFJhbmtlZCAoYT1cIiArIG1hdGNoZWRBbnN3ZXJzLmFuc3dlcnMubGVuZ3RoICsgXCIpLi4uXCIpO1xuICAgIHZhciBtYXRjaGVkRmlsdGVyZWQgPSBXaGF0SXMuZmlsdGVyT25seVRvcFJhbmtlZChtYXRjaGVkQW5zd2Vycy5hbnN3ZXJzKTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgZGVidWdsb2coXCIgbWF0Y2hlZCB0b3AtcmFua2VkIEFuc3dlcnNcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRGaWx0ZXJlZCwgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHBlcmZsb2coXCJ0b3RhbExpc3RBbGxXaXRoQ29udGV4dCAoYT1cIiArIG1hdGNoZWRGaWx0ZXJlZC5sZW5ndGggKyBcIilcIik7XG4gICAgbG9nUGVyZignbGlzdEFsbFdpdGhDb250ZXh0Jyk7XG4gICAgcmV0dXJuIHtcbiAgICAgYW5zd2VycyA6ICBtYXRjaGVkRmlsdGVyZWQsIC8vID8/PyBBbnN3ZXJzO1xuICAgICBlcnJvcnMgOiBhU2VudGVuY2VzUmVpbmZvcmNlZC5lcnJvcnMsXG4gICAgIHRva2VucyA6IGFTZW50ZW5jZXNSZWluZm9yY2VkLnRva2Vuc1xuICAgIH1cbiB9XG59XG4qL1xuZnVuY3Rpb24gbGlzdEFsbEhhdmluZ0NvbnRleHQoY2F0ZWdvcnksIGNvbnRleHRRdWVyeVN0cmluZywgYVJ1bGVzLCByZWNvcmRzLCBjYXRlZ29yeVNldCkge1xuICAgIHZhciByZXMgPSBsaXN0QWxsVHVwZWxIYXZpbmdDb250ZXh0KFtjYXRlZ29yeV0sIGNvbnRleHRRdWVyeVN0cmluZywgYVJ1bGVzLCByZWNvcmRzLCBjYXRlZ29yeVNldCk7XG4gICAgdmFyIGFuc3dlcnMgPSByZXMudHVwZWxhbnN3ZXJzLm1hcChmdW5jdGlvbiAobykge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc2VudGVuY2U6IG8uc2VudGVuY2UsXG4gICAgICAgICAgICByZWNvcmQ6IG8ucmVjb3JkLFxuICAgICAgICAgICAgY2F0ZWdvcnk6IG8uY2F0ZWdvcmllc1swXSxcbiAgICAgICAgICAgIHJlc3VsdDogby5yZXN1bHRbMF0sXG4gICAgICAgICAgICBfcmFua2luZzogby5fcmFua2luZ1xuICAgICAgICB9O1xuICAgIH0pO1xuICAgIHJldHVybiB7XG4gICAgICAgIHNlbnRlbmNlczogcmVzLnNlbnRlbmNlcyxcbiAgICAgICAgZXJyb3JzOiByZXMuZXJyb3JzLFxuICAgICAgICB0b2tlbnM6IHJlcy50b2tlbnMsXG4gICAgICAgIGFuc3dlcnM6IGFuc3dlcnNcbiAgICB9O1xufVxuZXhwb3J0cy5saXN0QWxsSGF2aW5nQ29udGV4dCA9IGxpc3RBbGxIYXZpbmdDb250ZXh0O1xuLypcbmV4cG9ydCBmdW5jdGlvbiBsaXN0QWxsSGF2aW5nQ29udGV4dFhYKGNhdGVnb3J5OiBzdHJpbmcsIGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLFxuICBhUnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sXG4gIGNhdGVnb3J5U2V0IDogeyBba2V5OnN0cmluZ10gOiBib29sZWFuIH0pOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnMge1xuICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcnMgOiBbRXJFcnJvci5tYWtlRXJyb3JfRU1QVFlfSU5QVVQoKV0gLFxuICAgICAgdG9rZW5zIDpbXSxcbiAgICAgIGFuc3dlcnM6W11cbiAgIH07XG4gIH0gZWxzZSB7XG4gICAgcGVyZmxvZyhcImFuYWx5emVDb250ZXh0U3RyaW5nIC4uLlwiKTtcbiAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBhbmFseXplQ29udGV4dFN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIGFSdWxlcyk7XG4gICAgcGVyZmxvZyhcIm1hdGNoaW5nIHJlY29yZHMgaGF2aW5nIChzPVwiICsgKGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5sZW5ndGgpICsgXCIpLi4uXCIpO1xuICAgIHZhciBtYXRjaGVkQW5zd2VycyA9IFdoYXRJcy5tYXRjaFJlY29yZHNIYXZpbmdDb250ZXh0KGFTZW50ZW5jZXNSZWluZm9yY2VkLCBjYXRlZ29yeSwgcmVjb3JkcywgY2F0ZWdvcnlTZXQpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8gKiBvYmplY3RzdHJlYW0qIC8ge1xuICAgIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgIGRlYnVnbG9nKFwiTEFIQyBtYXRjaGVkIEFuc3dlcnNcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRBbnN3ZXJzLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgcGVyZmxvZyhcImZpbHRlcmluZ1RvcFJhbmtlZCAoYT1cIiArIG1hdGNoZWRBbnN3ZXJzLnNlbnRlbmNlcy5sZW5ndGggKyBcIikuLi5cIik7XG4gICAgbWF0Y2hlZEFuc3dlcnMuYW5zd2VycyA9IFdoYXRJcy5maWx0ZXJPbmx5VG9wUmFua2VkKG1hdGNoZWRBbnN3ZXJzLmFuc3dlcnMpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICBkZWJ1Z2xvZyhcIiBtYXRjaGVkIHRvcC1yYW5rZWQgQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMuYW5zd2VycywgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHBlcmZsb2coXCJ0b3RhbExpc3RBbGxIYXZpbmdDb250ZXh0IChhPVwiICsgbWF0Y2hlZEFuc3dlcnMuYW5zd2Vycy5sZW5ndGggKyBcIilcIik7XG4gICAgcmV0dXJuIG1hdGNoZWRBbnN3ZXJzO1xuICB9XG59XG4qL1xuZnVuY3Rpb24gbGlzdEFsbFR1cGVsV2l0aENvbnRleHQoY2F0ZWdvcmllcywgY29udGV4dFF1ZXJ5U3RyaW5nLCBhUnVsZXMsIHJlY29yZHMsIGNhdGVnb3J5U2V0KSB7XG4gICAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR1cGVsYW5zd2VyczogW10sXG4gICAgICAgICAgICBlcnJvcnM6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSxcbiAgICAgICAgICAgIHRva2VuczogW10sXG4gICAgICAgIH07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBsb2dQZXJmKCdsaXN0QWxsV2l0aENvbnRleHQnKTtcbiAgICAgICAgcGVyZmxvZyhcInRvdGFsTGlzdEFsbFdpdGhDb250ZXh0XCIpO1xuICAgICAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBhbmFseXplQ29udGV4dFN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIGFSdWxlcyk7XG4gICAgICAgIHBlcmZsb2coXCJMQVRXQyBtYXRjaGluZyByZWNvcmRzIChzPVwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLmxlbmd0aCArIFwiKS4uLlwiKTtcbiAgICAgICAgdmFyIG1hdGNoZWRBbnN3ZXJzID0gV2hhdElzLm1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzKGFTZW50ZW5jZXNSZWluZm9yY2VkLCBjYXRlZ29yaWVzLCByZWNvcmRzLCBjYXRlZ29yeVNldCk7IC8vYVRvb2w6IEFycmF5PElNYXRjaC5JVG9vbD4pOiBhbnkgLyogb2JqZWN0c3RyZWFtKi8ge1xuICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgZGVidWdsb2coXCIgbWF0Y2hlZCBBbnN3ZXJzXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkQW5zd2VycywgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgIH1cbiAgICAgICAgcGVyZmxvZyhcImZpbHRlcmluZyB0b3BSYW5rZWQgKGE9XCIgKyBtYXRjaGVkQW5zd2Vycy50dXBlbGFuc3dlcnMubGVuZ3RoICsgXCIpLi4uXCIpO1xuICAgICAgICB2YXIgbWF0Y2hlZEZpbHRlcmVkID0gV2hhdElzLmZpbHRlck9ubHlUb3BSYW5rZWRUdXBlbChtYXRjaGVkQW5zd2Vycy50dXBlbGFuc3dlcnMpO1xuICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgZGVidWdsb2coXCJMQVRXQyBtYXRjaGVkIHRvcC1yYW5rZWQgQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEZpbHRlcmVkLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgfVxuICAgICAgICBwZXJmbG9nKFwidG90YWxMaXN0QWxsV2l0aENvbnRleHQgKGE9XCIgKyBtYXRjaGVkRmlsdGVyZWQubGVuZ3RoICsgXCIpXCIpO1xuICAgICAgICBsb2dQZXJmKCdsaXN0QWxsV2l0aENvbnRleHQnKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR1cGVsYW5zd2VyczogbWF0Y2hlZEZpbHRlcmVkLFxuICAgICAgICAgICAgZXJyb3JzOiBhU2VudGVuY2VzUmVpbmZvcmNlZC5lcnJvcnMsXG4gICAgICAgICAgICB0b2tlbnM6IGFTZW50ZW5jZXNSZWluZm9yY2VkLnRva2Vuc1xuICAgICAgICB9O1xuICAgIH1cbn1cbmV4cG9ydHMubGlzdEFsbFR1cGVsV2l0aENvbnRleHQgPSBsaXN0QWxsVHVwZWxXaXRoQ29udGV4dDtcbmZ1bmN0aW9uIGxpc3RBbGxUdXBlbEhhdmluZ0NvbnRleHQoY2F0ZWdvcmllcywgY29udGV4dFF1ZXJ5U3RyaW5nLCBhUnVsZXMsIHJlY29yZHMsIGNhdGVnb3J5U2V0KSB7XG4gICAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR1cGVsYW5zd2VyczogW10sXG4gICAgICAgICAgICBlcnJvcnM6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSxcbiAgICAgICAgICAgIHRva2VuczogW10sXG4gICAgICAgIH07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBwZXJmbG9nKFwiYW5hbHl6ZUNvbnRleHRTdHJpbmcgLi4uXCIpO1xuICAgICAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBhbmFseXplQ29udGV4dFN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIGFSdWxlcyk7XG4gICAgICAgIHBlcmZsb2coXCJtYXRjaGluZyByZWNvcmRzIGhhdmluZyAocz1cIiArIChhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubGVuZ3RoKSArIFwiKS4uLlwiKTtcbiAgICAgICAgdmFyIG1hdGNoZWRBbnN3ZXJzID0gV2hhdElzLm1hdGNoUmVjb3Jkc1R1cGVsSGF2aW5nQ29udGV4dChhU2VudGVuY2VzUmVpbmZvcmNlZCwgY2F0ZWdvcmllcywgcmVjb3JkcywgY2F0ZWdvcnlTZXQpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8qIG9iamVjdHN0cmVhbSovIHtcbiAgICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgICAgIGRlYnVnbG9nKFwiIG1hdGNoZWQgQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgICB9XG4gICAgICAgIHBlcmZsb2coXCJmaWx0ZXJpbmdUb3BSYW5rZWQgKGE9XCIgKyBtYXRjaGVkQW5zd2Vycy50dXBlbGFuc3dlcnMubGVuZ3RoICsgXCIpLi4uXCIpO1xuICAgICAgICB2YXIgbWF0Y2hlZEZpbHRlcmVkID0gV2hhdElzLmZpbHRlck9ubHlUb3BSYW5rZWRUdXBlbChtYXRjaGVkQW5zd2Vycy50dXBlbGFuc3dlcnMpO1xuICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgZGVidWdsb2coXCIgbWF0Y2hlZCB0b3AtcmFua2VkIEFuc3dlcnNcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRGaWx0ZXJlZCwgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgIH1cbiAgICAgICAgcGVyZmxvZyhcInRvdGFsTGlzdEFsbEhhdmluZ0NvbnRleHQgKGE9XCIgKyBtYXRjaGVkRmlsdGVyZWQubGVuZ3RoICsgXCIpXCIpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHVwZWxhbnN3ZXJzOiBtYXRjaGVkRmlsdGVyZWQsXG4gICAgICAgICAgICBlcnJvcnM6IGFTZW50ZW5jZXNSZWluZm9yY2VkLmVycm9ycyxcbiAgICAgICAgICAgIHRva2VuczogYVNlbnRlbmNlc1JlaW5mb3JjZWQudG9rZW5zXG4gICAgICAgIH07XG4gICAgfVxufVxuZXhwb3J0cy5saXN0QWxsVHVwZWxIYXZpbmdDb250ZXh0ID0gbGlzdEFsbFR1cGVsSGF2aW5nQ29udGV4dDtcbmZ1bmN0aW9uIGZpbHRlclN0cmluZ0xpc3RCeU9wKG9wZXJhdG9yLCBmcmFnbWVudCwgc3JjYXJyKSB7XG4gICAgdmFyIGZyYWdtZW50TEMgPSBCcmVha0Rvd24udHJpbVF1b3RlZFNwYWNlZChmcmFnbWVudC50b0xvd2VyQ2FzZSgpKTtcbiAgICByZXR1cm4gc3JjYXJyLmZpbHRlcihmdW5jdGlvbiAoc3RyKSB7XG4gICAgICAgIHJldHVybiBPcGVyYXRvci5tYXRjaGVzKG9wZXJhdG9yLCBmcmFnbWVudExDLCBzdHIudG9Mb3dlckNhc2UoKSk7XG4gICAgfSkuc29ydCgpO1xufVxuZXhwb3J0cy5maWx0ZXJTdHJpbmdMaXN0QnlPcCA9IGZpbHRlclN0cmluZ0xpc3RCeU9wO1xuZnVuY3Rpb24gY29tcGFyZUNhc2VJbnNlbnNpdGl2ZShhLCBiKSB7XG4gICAgdmFyIHIgPSBhLnRvTG93ZXJDYXNlKCkubG9jYWxlQ29tcGFyZShiLnRvTG93ZXJDYXNlKCkpO1xuICAgIGlmIChyKSB7XG4gICAgICAgIHJldHVybiByO1xuICAgIH1cbiAgICByZXR1cm4gLWEubG9jYWxlQ29tcGFyZShiKTtcbn1cbi8qKlxuICogU29ydCBzdHJpbmcgbGlzdCBjYXNlIGluc2Vuc2l0aXZlLCB0aGVuIHJlbW92ZSBkdXBsaWNhdGVzIHJldGFpbmluZ1xuICogXCJsYXJnZXN0XCIgbWF0Y2hcbiAqL1xuZnVuY3Rpb24gcmVtb3ZlQ2FzZUR1cGxpY2F0ZXMoYXJyKSB7XG4gICAgYXJyLnNvcnQoY29tcGFyZUNhc2VJbnNlbnNpdGl2ZSk7XG4gICAgZGVidWdsb2coJ3NvcnRlZCBhcnInICsgSlNPTi5zdHJpbmdpZnkoYXJyKSk7XG4gICAgcmV0dXJuIGFyci5maWx0ZXIoZnVuY3Rpb24gKHMsIGluZGV4KSB7XG4gICAgICAgIHJldHVybiBpbmRleCA9PT0gMCB8fCAoMCAhPT0gYXJyW2luZGV4IC0gMV0udG9Mb3dlckNhc2UoKS5sb2NhbGVDb21wYXJlKHMudG9Mb3dlckNhc2UoKSkpO1xuICAgIH0pO1xufVxuZXhwb3J0cy5yZW1vdmVDYXNlRHVwbGljYXRlcyA9IHJlbW92ZUNhc2VEdXBsaWNhdGVzO1xuO1xuZnVuY3Rpb24gZ2V0Q2F0ZWdvcnlPcEZpbHRlckFzRGlzdGluY3RTdHJpbmdzKG9wZXJhdG9yLCBmcmFnbWVudCwgY2F0ZWdvcnksIHJlY29yZHMsIGZpbHRlckRvbWFpbikge1xuICAgIHZhciBmcmFnbWVudExDID0gQnJlYWtEb3duLnRyaW1RdW90ZWQoZnJhZ21lbnQudG9Mb3dlckNhc2UoKSk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIHZhciBzZWVuID0ge307XG4gICAgcmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgaWYgKGZpbHRlckRvbWFpbiAmJiByZWNvcmRbJ19kb21haW4nXSAhPT0gZmlsdGVyRG9tYWluKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlY29yZFtjYXRlZ29yeV0gJiYgT3BlcmF0b3IubWF0Y2hlcyhvcGVyYXRvciwgZnJhZ21lbnRMQywgcmVjb3JkW2NhdGVnb3J5XS50b0xvd2VyQ2FzZSgpKSkge1xuICAgICAgICAgICAgaWYgKCFzZWVuW3JlY29yZFtjYXRlZ29yeV1dKSB7XG4gICAgICAgICAgICAgICAgc2VlbltyZWNvcmRbY2F0ZWdvcnldXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmVzLnB1c2gocmVjb3JkW2NhdGVnb3J5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVtb3ZlQ2FzZUR1cGxpY2F0ZXMocmVzKTtcbn1cbmV4cG9ydHMuZ2V0Q2F0ZWdvcnlPcEZpbHRlckFzRGlzdGluY3RTdHJpbmdzID0gZ2V0Q2F0ZWdvcnlPcEZpbHRlckFzRGlzdGluY3RTdHJpbmdzO1xuO1xuZnVuY3Rpb24gbGlrZWx5UGx1cmFsRGlmZihhLCBwbHVyYWxPZmEpIHtcbiAgICB2YXIgYUxDID0gQnJlYWtEb3duLnRyaW1RdW90ZWQoYS50b0xvd2VyQ2FzZSgpKSB8fCBcIlwiO1xuICAgIHZhciBwbHVyYWxPZkFMQyA9IEJyZWFrRG93bi50cmltUXVvdGVkKChwbHVyYWxPZmEgfHwgXCJcIikudG9Mb3dlckNhc2UoKSkgfHwgXCJcIjtcbiAgICBpZiAoYUxDID09PSBwbHVyYWxPZkFMQykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGFMQyArICdzJyA9PT0gcGx1cmFsT2ZBTEMpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cbmV4cG9ydHMubGlrZWx5UGx1cmFsRGlmZiA9IGxpa2VseVBsdXJhbERpZmY7XG47XG5mdW5jdGlvbiBsaXN0QWxsV2l0aENhdGVnb3J5KGNhdGVnb3J5LCByZWNvcmRzKSB7XG4gICAgdmFyIG1hdGNoZWRBbnN3ZXJzID0gbWF0Y2hSZWNvcmRIYXZpbmdDYXRlZ29yeShjYXRlZ29yeSwgcmVjb3Jkcyk7IC8vYVRvb2w6IEFycmF5PElNYXRjaC5JVG9vbD4pOiBhbnkgLyogb2JqZWN0c3RyZWFtKi8ge1xuICAgIGRlYnVnbG9nKFwiIGxpc3RBbGxXaXRoQ2F0ZWdvcnk6XCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkQW5zd2VycywgdW5kZWZpbmVkLCAyKSk7XG4gICAgcmV0dXJuIG1hdGNoZWRBbnN3ZXJzO1xufVxuZXhwb3J0cy5saXN0QWxsV2l0aENhdGVnb3J5ID0gbGlzdEFsbFdpdGhDYXRlZ29yeTtcbmZ1bmN0aW9uIGpvaW5Tb3J0ZWRRdW90ZWQoc3RyaW5ncykge1xuICAgIGlmIChzdHJpbmdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gXCJcIjtcbiAgICB9XG4gICAgcmV0dXJuICdcIicgKyBzdHJpbmdzLnNvcnQoKS5qb2luKCdcIjsgXCInKSArICdcIic7XG59XG5leHBvcnRzLmpvaW5Tb3J0ZWRRdW90ZWQgPSBqb2luU29ydGVkUXVvdGVkO1xuZnVuY3Rpb24gam9pbkRpc3RpbmN0KGNhdGVnb3J5LCByZWNvcmRzKSB7XG4gICAgdmFyIHJlcyA9IHJlY29yZHMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBvUmVjb3JkKSB7XG4gICAgICAgIHByZXZbb1JlY29yZFtjYXRlZ29yeV1dID0gMTtcbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwge30pO1xuICAgIHJldHVybiBqb2luU29ydGVkUXVvdGVkKE9iamVjdC5rZXlzKHJlcykpO1xufVxuZXhwb3J0cy5qb2luRGlzdGluY3QgPSBqb2luRGlzdGluY3Q7XG5mdW5jdGlvbiBmb3JtYXREaXN0aW5jdEZyb21XaGF0SWZSZXN1bHQoYW5zd2Vycykge1xuICAgIHJldHVybiBqb2luU29ydGVkUXVvdGVkKGFuc3dlcnMubWFwKGZ1bmN0aW9uIChvQW5zd2VyKSB7XG4gICAgICAgIHJldHVybiBvQW5zd2VyLnJlc3VsdDtcbiAgICB9KSk7XG59XG5leHBvcnRzLmZvcm1hdERpc3RpbmN0RnJvbVdoYXRJZlJlc3VsdCA9IGZvcm1hdERpc3RpbmN0RnJvbVdoYXRJZlJlc3VsdDtcbmZ1bmN0aW9uIGpvaW5SZXN1bHRzKHJlc3VsdHMpIHtcbiAgICB2YXIgcmVzID0gW107XG4gICAgdmFyIGNudCA9IHJlc3VsdHMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCByZXN1bHQpIHtcbiAgICAgICAgaWYgKHJlc3VsdC5fcmFua2luZyA9PT0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgICAgICAgaWYgKHJlcy5pbmRleE9mKHJlc3VsdC5yZXN1bHQpIDwgMCkge1xuICAgICAgICAgICAgICAgIHJlcy5wdXNoKHJlc3VsdC5yZXN1bHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByZXYgKyAxO1xuICAgICAgICB9XG4gICAgfSwgMCk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuam9pblJlc3VsdHMgPSBqb2luUmVzdWx0cztcbnZhciBVdGlscyA9IHJlcXVpcmUoXCIuLi91dGlscy91dGlsc1wiKTtcbmZ1bmN0aW9uIGpvaW5SZXN1bHRzVHVwZWwocmVzdWx0cykge1xuICAgIHZhciByZXMgPSBbXTtcbiAgICB2YXIgY250ID0gcmVzdWx0cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHJlc3VsdCkge1xuICAgICAgICBpZiAocmVzdWx0Ll9yYW5raW5nID09PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBVdGlscy5saXN0VG9RdW90ZWRDb21tYUFuZChyZXN1bHQucmVzdWx0KTtcbiAgICAgICAgICAgIGlmIChyZXMuaW5kZXhPZih2YWx1ZSkgPCAwKSB7XG4gICAgICAgICAgICAgICAgcmVzLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByZXYgKyAxO1xuICAgICAgICB9XG4gICAgfSwgMCk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuam9pblJlc3VsdHNUdXBlbCA9IGpvaW5SZXN1bHRzVHVwZWw7XG5mdW5jdGlvbiBpbmZlckRvbWFpbih0aGVNb2RlbCwgY29udGV4dFF1ZXJ5U3RyaW5nKSB7XG4gICAgLy8gY29uc29sZS5sb2coXCJoZXJlIHRoZSBzdHJpbmdcIiArIGNvbnRleHRRdWVyeVN0cmluZyk7XG4gICAgLy8gIGNvbnNvbGUubG9nKFwiaGVyZSB0aGUgcnVsZXNcIiArIEpTT04uc3RyaW5naWZ5KHRoZU1vZGVsLm1SdWxlcykpO1xuICAgIHZhciByZXMgPSBhbmFseXplQ29udGV4dFN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHRoZU1vZGVsLnJ1bGVzKTtcbiAgICAvL2NvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHJlcyx1bmRlZmluZWQsMikpO1xuICAgIC8vIHJ1biB0aHJvdWdoIHRoZSBzdHJpbmcsIHNlYXJjaCBmb3IgYSBjYXRlZ29yeVxuICAgIGlmICghcmVzLnNlbnRlbmNlcy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIGRvbWFpbnMgPSBbXTtcbiAgICAvL2NvbnNvbGUubG9nKFNlbnRlbmNlLmR1bXBOaWNlQXJyKHJlcykpO1xuICAgIC8vIGRvIHdlIGhhdmUgYSBkb21haW4gP1xuICAgIHJlcy5zZW50ZW5jZXNbMF0uZm9yRWFjaChmdW5jdGlvbiAob1dvcmRHcm91cCkge1xuICAgICAgICBpZiAob1dvcmRHcm91cC5jYXRlZ29yeSA9PT0gXCJkb21haW5cIikge1xuICAgICAgICAgICAgZG9tYWlucy5wdXNoKG9Xb3JkR3JvdXAubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoZG9tYWlucy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgZGVidWdsb2coXCJnb3QgYSBwcmVjaXNlIGRvbWFpbiBcIiArIGRvbWFpbnNbMF0pO1xuICAgICAgICByZXR1cm4gZG9tYWluc1swXTtcbiAgICB9XG4gICAgaWYgKGRvbWFpbnMubGVuZ3RoID4gMCkge1xuICAgICAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiZ290IG1vcmUgdGhhbiBvbmUgZG9tYWluLCBjb25mdXNlZCAgXCIgKyBkb21haW5zLmpvaW4oXCJcXG5cIikpIDogJy0nKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZGVidWdsb2coXCJhdHRlbXB0aW5nIHRvIGRldGVybWluZSBjYXRlZ29yaWVzXCIpO1xuICAgIC8vIHRyeSBhIGNhdGVnb3J5IHJldmVyc2UgbWFwXG4gICAgcmVzLnNlbnRlbmNlc1swXS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZEdyb3VwKSB7XG4gICAgICAgIGlmIChvV29yZEdyb3VwLmNhdGVnb3J5ID09PSBcImNhdGVnb3J5XCIpIHtcbiAgICAgICAgICAgIHZhciBzQ2F0ID0gb1dvcmRHcm91cC5tYXRjaGVkU3RyaW5nO1xuICAgICAgICAgICAgdmFyIGRvbXMgPSBNb2RlbC5nZXREb21haW5zRm9yQ2F0ZWdvcnkodGhlTW9kZWwsIHNDYXQpO1xuICAgICAgICAgICAgZG9tcy5mb3JFYWNoKGZ1bmN0aW9uIChzRG9tKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRvbWFpbnMuaW5kZXhPZihzRG9tKSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZG9tYWlucy5wdXNoKHNEb20pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgaWYgKGRvbWFpbnMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiZ290IGEgcHJlY2lzZSBkb21haW4gXCIgKyBkb21haW5zWzBdKTtcbiAgICAgICAgcmV0dXJuIGRvbWFpbnNbMF07XG4gICAgfVxuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJnb3QgbW9yZSB0aGFuIG9uZSBkb21haW4sIGNvbmZ1c2VkICBcIiArIGRvbWFpbnMuam9pbihcIlxcblwiKSkgOiAnLScpO1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5leHBvcnRzLmluZmVyRG9tYWluID0gaW5mZXJEb21haW47XG47XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
