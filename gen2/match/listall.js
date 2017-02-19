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
function listAllWithContext(category, contextQueryString, aRules, records, domainCategoryFilter) {
    var res = listAllTupelWithContext([category], contextQueryString, aRules, records, domainCategoryFilter);
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
function listAllHavingContext(category, contextQueryString, aRules, records, domainCategoryFilter) {
    var res = listAllTupelHavingContext([category], contextQueryString, aRules, records, domainCategoryFilter);
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
function listAllTupelWithContext(categories, contextQueryString, aRules, records, domainCategoryFilter) {
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
        var matchedAnswers = WhatIs.matchRecordsQuickMultipleCategories(aSentencesReinforced, categories, records, domainCategoryFilter); //aTool: Array<IMatch.ITool>): any /* objectstream*/ {
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
function listAllTupelHavingContext(categories, contextQueryString, aRules, records, domainCategoryFilter) {
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
        var matchedAnswers = WhatIs.matchRecordsTupelHavingContext(aSentencesReinforced, categories, records, domainCategoryFilter); //aTool: Array<IMatch.ITool>): any /* objectstream*/ {
        if (debuglog.enabled) {
            debuglog(" matched Answers" + JSON.stringify(matchedAnswers, undefined, 2));
        }
        perflog("filteringTopRanked (a=" + matchedAnswers.tupelanswers.length + ")...");
        //console.log(matchedAnswers.tupelanswers.slice(0,2).map(o=> JSON.stringify(o)).join("\n"));
        var matchedFiltered = WhatIs.filterOnlyTopRankedTupel(matchedAnswers.tupelanswers);
        if (debuglog.enabled) {
            debuglog("LATHC matched top-ranked Answers" + JSON.stringify(matchedFiltered, undefined, 2));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9saXN0YWxsLnRzIiwibWF0Y2gvbGlzdGFsbC5qcyJdLCJuYW1lcyI6WyJkZWJ1ZyIsInJlcXVpcmUiLCJkZWJ1Z2xvZyIsImxvZ2dlciIsImxvZ1BlcmYiLCJwZXJmIiwicGVyZmxvZyIsIkJyZWFrRG93biIsIk9wZXJhdG9yIiwiV2hhdElzIiwiRXJFcnJvciIsIk1vZGVsIiwic1dvcmRzIiwibWF0Y2hSZWNvcmRIYXZpbmdDYXRlZ29yeSIsImNhdGVnb3J5IiwicmVjb3JkcyIsImVuYWJsZWQiLCJKU09OIiwic3RyaW5naWZ5IiwidW5kZWZpbmVkIiwicmVsZXZhbnRSZWNvcmRzIiwiZmlsdGVyIiwicmVjb3JkIiwicmVzIiwibGVuZ3RoIiwiZXhwb3J0cyIsImFuYWx5emVDb250ZXh0U3RyaW5nIiwiY29udGV4dFF1ZXJ5U3RyaW5nIiwicnVsZXMiLCJsaXN0QWxsV2l0aENvbnRleHQiLCJhUnVsZXMiLCJkb21haW5DYXRlZ29yeUZpbHRlciIsImxpc3RBbGxUdXBlbFdpdGhDb250ZXh0IiwiYW5zd2VycyIsInR1cGVsYW5zd2VycyIsIm1hcCIsIm8iLCJzZW50ZW5jZSIsImNhdGVnb3JpZXMiLCJyZXN1bHQiLCJfcmFua2luZyIsInNlbnRlbmNlcyIsImVycm9ycyIsInRva2VucyIsImxpc3RBbGxIYXZpbmdDb250ZXh0IiwibGlzdEFsbFR1cGVsSGF2aW5nQ29udGV4dCIsIm1ha2VFcnJvcl9FTVBUWV9JTlBVVCIsImFTZW50ZW5jZXNSZWluZm9yY2VkIiwibWF0Y2hlZEFuc3dlcnMiLCJtYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcyIsIm1hdGNoZWRGaWx0ZXJlZCIsImZpbHRlck9ubHlUb3BSYW5rZWRUdXBlbCIsIm1hdGNoUmVjb3Jkc1R1cGVsSGF2aW5nQ29udGV4dCIsImZpbHRlclN0cmluZ0xpc3RCeU9wIiwib3BlcmF0b3IiLCJmcmFnbWVudCIsInNyY2FyciIsImZyYWdtZW50TEMiLCJ0cmltUXVvdGVkU3BhY2VkIiwidG9Mb3dlckNhc2UiLCJzdHIiLCJtYXRjaGVzIiwic29ydCIsImNvbXBhcmVDYXNlSW5zZW5zaXRpdmUiLCJhIiwiYiIsInIiLCJsb2NhbGVDb21wYXJlIiwicmVtb3ZlQ2FzZUR1cGxpY2F0ZXMiLCJhcnIiLCJzIiwiaW5kZXgiLCJnZXRDYXRlZ29yeU9wRmlsdGVyQXNEaXN0aW5jdFN0cmluZ3MiLCJmaWx0ZXJEb21haW4iLCJ0cmltUXVvdGVkIiwic2VlbiIsImZvckVhY2giLCJwdXNoIiwibGlrZWx5UGx1cmFsRGlmZiIsInBsdXJhbE9mYSIsImFMQyIsInBsdXJhbE9mQUxDIiwibGlzdEFsbFdpdGhDYXRlZ29yeSIsImpvaW5Tb3J0ZWRRdW90ZWQiLCJzdHJpbmdzIiwiam9pbiIsImpvaW5EaXN0aW5jdCIsInJlZHVjZSIsInByZXYiLCJvUmVjb3JkIiwiT2JqZWN0Iiwia2V5cyIsImZvcm1hdERpc3RpbmN0RnJvbVdoYXRJZlJlc3VsdCIsIm9BbnN3ZXIiLCJqb2luUmVzdWx0cyIsInJlc3VsdHMiLCJjbnQiLCJpbmRleE9mIiwiVXRpbHMiLCJqb2luUmVzdWx0c1R1cGVsIiwidmFsdWUiLCJsaXN0VG9RdW90ZWRDb21tYUFuZCIsImluZmVyRG9tYWluIiwidGhlTW9kZWwiLCJkb21haW5zIiwib1dvcmRHcm91cCIsIm1hdGNoZWRTdHJpbmciLCJzQ2F0IiwiZG9tcyIsImdldERvbWFpbnNGb3JDYXRlZ29yeSIsInNEb20iXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7QUNNQTs7QURLQSxJQUFBQSxRQUFBQyxRQUFBLE9BQUEsQ0FBQTtBQUVBLElBQU1DLFdBQVdGLE1BQU0sU0FBTixDQUFqQjtBQUNBLElBQUFHLFNBQUFGLFFBQUEsaUJBQUEsQ0FBQTtBQUNBLElBQUlHLFVBQVVELE9BQU9FLElBQVAsQ0FBWSxhQUFaLENBQWQ7QUFDQSxJQUFJQyxVQUFVTixNQUFNLE1BQU4sQ0FBZDtBQVFBLElBQUFPLFlBQUFOLFFBQUEsYUFBQSxDQUFBO0FBS0EsSUFBQU8sV0FBQVAs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LGVBQU9BLFFBQVEsQ0FBUixDQUFQO0FBQ0Q7QUFDRCxRQUFHQSxRQUFRaEYsTUFBUixHQUFpQixDQUFwQixFQUF3QjtBQUN0QnRCLGlCQUFTQSxTQUFTYyxPQUFULEdBQW1CLHlDQUF5Q3dGLFFBQVFuQixJQUFSLENBQWEsSUFBYixDQUE1RCxHQUFnRixHQUF6RjtBQUNBLGVBQU9sRSxTQUFQO0FBRUQ7QUFDRGpCLGFBQVMsb0NBQVQ7QUFDQTtBQUNBcUIsUUFBSWtCLFNBQUosQ0FBYyxDQUFkLEVBQWlCbUMsT0FBakIsQ0FBeUIsVUFBUzZCLFVBQVQsRUFBbUI7QUFDMUMsWUFBR0EsV0FBVzNGLFFBQVgsS0FBd0IsVUFBM0IsRUFBdUM7QUFDckMsZ0JBQUk2RixPQUFPRixXQUFXQyxhQUF0QjtBQUNBLGdCQUFJRSxPQUFPakcsTUFBTWtHLHFCQUFOLENBQTRCTixRQUE1QixFQUFxQ0ksSUFBckMsQ0FBWDtBQUNBQyxpQkFBS2hDLE9BQUwsQ0FBYSxVQUFTa0MsSUFBVCxFQUFhO0FBQ3hCLG9CQUFHTixRQUFRUCxPQUFSLENBQWdCYSxJQUFoQixJQUF3QixDQUEzQixFQUE4QjtBQUM1Qk4sNEJBQVEzQixJQUFSLENBQWFpQyxJQUFiO0FBQ0Q7QUFDRixhQUpEO0FBS0Q7QUFDRixLQVZEO0FBV0EsUUFBR04sUUFBUWhGLE1BQVIsS0FBbUIsQ0FBdEIsRUFBeUI7QUFDdEJ0QixpQkFBUywwQkFBMEJzRyxRQUFRLENBQVIsQ0FBbkM7QUFDRCxlQUFPQSxRQUFRLENBQVIsQ0FBUDtBQUNEO0FBQ0R0RyxhQUFTQSxTQUFTYyxPQUFULEdBQW9CLHlDQUF5Q3dGLFFBQVFuQixJQUFSLENBQWEsSUFBYixDQUE3RCxHQUFrRixHQUEzRjtBQUNBLFdBQU9sRSxTQUFQO0FBQ0Q7QUE3Q0RNLFFBQUE2RSxXQUFBLEdBQUFBLFdBQUE7QUE2Q0MiLCJmaWxlIjoibWF0Y2gvbGlzdGFsbC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICpcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmFuYWx5emVcbiAqIEBmaWxlIGFuYWx5emUudHNcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cbiAqL1xuXG5cbmltcG9ydCAqIGFzIElucHV0RmlsdGVyIGZyb20gJy4vaW5wdXRGaWx0ZXInO1xuXG5pbXBvcnQgKiBhcyBBbGdvbCBmcm9tICcuL2FsZ29sJztcbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcblxuY29uc3QgZGVidWdsb2cgPSBkZWJ1ZygnbGlzdGFsbCcpO1xuaW1wb3J0ICogYXMgbG9nZ2VyIGZyb20gJy4uL3V0aWxzL2xvZ2dlcic7XG52YXIgbG9nUGVyZiA9IGxvZ2dlci5wZXJmKFwicGVyZmxpc3RhbGxcIik7XG52YXIgcGVyZmxvZyA9IGRlYnVnKCdwZXJmJyk7XG4vL2NvbnN0IHBlcmZsb2cgPSBsb2dnZXIucGVyZihcInBlcmZsaXN0YWxsXCIpO1xuXG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuLi91dGlscy91dGlscyc7XG5cbmltcG9ydCAqIGFzIElNYXRjaCBmcm9tICcuL2lmbWF0Y2gnO1xuXG5pbXBvcnQgKiBhcyBUb29sbWF0Y2hlciBmcm9tICcuL3Rvb2xtYXRjaGVyJztcbmltcG9ydCAqIGFzIEJyZWFrRG93biBmcm9tICcuL2JyZWFrZG93bic7XG5cbmltcG9ydCAqIGFzIFNlbnRlbmNlIGZyb20gJy4vc2VudGVuY2UnO1xuXG5pbXBvcnQgKiBhcyBXb3JkIGZyb20gJy4vd29yZCc7XG5pbXBvcnQgKiBhcyBPcGVyYXRvciBmcm9tICcuL29wZXJhdG9yJztcblxuaW1wb3J0ICogYXMgV2hhdElzIGZyb20gJy4vd2hhdGlzJztcbmltcG9ydCAqIGFzIEVyRXJyb3IgZnJvbSAnLi9lcmVycm9yJztcblxuaW1wb3J0ICogYXMgTW9kZWwgZnJvbSAnLi4vbW9kZWwvbW9kZWwnO1xuaW1wb3J0ICogYXMgTWF0Y2ggZnJvbSAnLi9tYXRjaCc7XG5cbnZhciBzV29yZHMgPSB7fTtcblxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVjb3JkSGF2aW5nQ2F0ZWdvcnkoY2F0ZWdvcnk6IHN0cmluZywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+KVxuICA6IEFycmF5PElNYXRjaC5JUmVjb3JkPiB7XG4gIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyBKU09OLnN0cmluZ2lmeShyZWNvcmRzLHVuZGVmaW5lZCwyKSA6IFwiLVwiKTtcbiAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQ6IElNYXRjaC5JUmVjb3JkKSB7XG4gICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnldICE9PSBudWxsKTtcbiAgfSk7XG4gIHZhciByZXMgPSBbXTtcbiAgZGVidWdsb2coXCJyZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCk7XG4gIHJldHVybiByZWxldmFudFJlY29yZHM7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVDb250ZXh0U3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZyA6IHN0cmluZywgIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcykge1xuICByZXR1cm4gV2hhdElzLmFuYWx5emVDb250ZXh0U3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZyxydWxlcyk7XG59XG5cbi8vIGNvbnN0IHJlc3VsdCA9IFdoYXRJcy5yZXNvbHZlQ2F0ZWdvcnkoY2F0LCBhMS5lbnRpdHksXG4vLyAgIHRoZU1vZGVsLm1SdWxlcywgdGhlTW9kZWwudG9vbHMsIHRoZU1vZGVsLnJlY29yZHMpO1xuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RBbGxXaXRoQ29udGV4dChjYXRlZ29yeTogc3RyaW5nLCBjb250ZXh0UXVlcnlTdHJpbmc6IHN0cmluZyxcbiAgYVJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+LCBkb21haW5DYXRlZ29yeUZpbHRlcj86IElNYXRjaC5JRG9tYWluQ2F0ZWdvcnlGaWx0ZXIpOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnMge1xuICB2YXIgcmVzID0gbGlzdEFsbFR1cGVsV2l0aENvbnRleHQoW2NhdGVnb3J5XSwgY29udGV4dFF1ZXJ5U3RyaW5nLCBhUnVsZXMsIHJlY29yZHMsIGRvbWFpbkNhdGVnb3J5RmlsdGVyKTtcblxuICB2YXIgYW5zd2VycyA9IHJlcy50dXBlbGFuc3dlcnMubWFwKGZ1bmN0aW9uIChvKTogSU1hdGNoLklXaGF0SXNBbnN3ZXIge1xuICAgIHJldHVybiB7XG4gICAgICBzZW50ZW5jZTogby5zZW50ZW5jZSxcbiAgICAgIHJlY29yZDogby5yZWNvcmQsXG4gICAgICBjYXRlZ29yeTogby5jYXRlZ29yaWVzWzBdLFxuICAgICAgcmVzdWx0OiBvLnJlc3VsdFswXSxcbiAgICAgIF9yYW5raW5nOiBvLl9yYW5raW5nXG4gICAgfTtcbiAgfVxuICApO1xuICByZXR1cm4ge1xuICAgIHNlbnRlbmNlczogcmVzLnNlbnRlbmNlcyxcbiAgICBlcnJvcnM6IHJlcy5lcnJvcnMsXG4gICAgdG9rZW5zOiByZXMudG9rZW5zLFxuICAgIGFuc3dlcnM6IGFuc3dlcnNcbiAgfTtcbn1cblxuLypcbmV4cG9ydCBmdW5jdGlvbiBsaXN0QWxsV2l0aENvbnRleHRYWChjYXRlZ29yeTogc3RyaW5nLCBjb250ZXh0UXVlcnlTdHJpbmc6IHN0cmluZyxcbiAgYVJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+LCBjYXRlZ29yeVNldD86IHsgW2tleSA6IHN0cmluZ10gOiBib29sZWFuIH0pOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnNcbiB7XG4gIGlmIChjb250ZXh0UXVlcnlTdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGFuc3dlcnMgOiBbXSxcbiAgICAgIGVycm9ycyA6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSAsXG4gICAgICB0b2tlbnMgOltdXG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICBsb2dQZXJmKCdsaXN0QWxsV2l0aENvbnRleHQnKTtcbiAgICBwZXJmbG9nKFwidG90YWxMaXN0QWxsV2l0aENvbnRleHRcIik7XG4gICAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gYW5hbHl6ZUNvbnRleHRTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCBhUnVsZXMpO1xuICAgIGRlYnVnbG9nKFwibGlzdEFsbFdpdGhDb250ZXh0Om1hdGNoaW5nIHJlY29yZHMgKHM9XCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubGVuZ3RoICsgXCIpLi4uXCIpO1xuICAgIGRlYnVnbG9nKFwiaGVyZSBzZW50ZW5jZXNcIiArIEpTT04uc3RyaW5naWZ5KGFTZW50ZW5jZXNSZWluZm9yY2VkLHVuZGVmaW5lZCwyKSk7XG4gICAgcGVyZmxvZyhcIm1hdGNoaW5nIHJlY29yZHMgKHM9XCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubGVuZ3RoICsgXCIpLi4uXCIpO1xuICAgIHZhciBtYXRjaGVkQW5zd2VycyA9IFdoYXRJcy5tYXRjaFJlY29yZHNRdWljayhhU2VudGVuY2VzUmVpbmZvcmNlZCwgY2F0ZWdvcnksIHJlY29yZHMsIGNhdGVnb3J5U2V0KTtcbiAgICAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8gKiBvYmplY3RzdHJlYW0qIC8ge1xuICAgIGlmKGRlYnVnbG9nLmVuYWJsZWQpe1xuICAgICAgZGVidWdsb2coXCIgbWF0Y2hlZCBBbnN3ZXJzXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkQW5zd2VycywgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHBlcmZsb2coXCJmaWx0ZXJpbmcgdG9wUmFua2VkIChhPVwiICsgbWF0Y2hlZEFuc3dlcnMuYW5zd2Vycy5sZW5ndGggKyBcIikuLi5cIik7XG4gICAgdmFyIG1hdGNoZWRGaWx0ZXJlZCA9IFdoYXRJcy5maWx0ZXJPbmx5VG9wUmFua2VkKG1hdGNoZWRBbnN3ZXJzLmFuc3dlcnMpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICBkZWJ1Z2xvZyhcIiBtYXRjaGVkIHRvcC1yYW5rZWQgQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEZpbHRlcmVkLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgcGVyZmxvZyhcInRvdGFsTGlzdEFsbFdpdGhDb250ZXh0IChhPVwiICsgbWF0Y2hlZEZpbHRlcmVkLmxlbmd0aCArIFwiKVwiKTtcbiAgICBsb2dQZXJmKCdsaXN0QWxsV2l0aENvbnRleHQnKTtcbiAgICByZXR1cm4ge1xuICAgICBhbnN3ZXJzIDogIG1hdGNoZWRGaWx0ZXJlZCwgLy8gPz8/IEFuc3dlcnM7XG4gICAgIGVycm9ycyA6IGFTZW50ZW5jZXNSZWluZm9yY2VkLmVycm9ycyxcbiAgICAgdG9rZW5zIDogYVNlbnRlbmNlc1JlaW5mb3JjZWQudG9rZW5zXG4gICAgfVxuIH1cbn1cbiovXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RBbGxIYXZpbmdDb250ZXh0KGNhdGVnb3J5OiBzdHJpbmcsIGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLFxuICBhUnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sXG4gIGRvbWFpbkNhdGVnb3J5RmlsdGVyIDogSU1hdGNoLklEb21haW5DYXRlZ29yeUZpbHRlcik6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzQW5zd2VycyB7XG4gIHZhciByZXMgPSBsaXN0QWxsVHVwZWxIYXZpbmdDb250ZXh0KFtjYXRlZ29yeV0sIGNvbnRleHRRdWVyeVN0cmluZywgYVJ1bGVzLCByZWNvcmRzLCBkb21haW5DYXRlZ29yeUZpbHRlcik7XG4gIHZhciBhbnN3ZXJzID0gcmVzLnR1cGVsYW5zd2Vycy5tYXAoZnVuY3Rpb24gKG8pOiBJTWF0Y2guSVdoYXRJc0Fuc3dlciB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHNlbnRlbmNlOiBvLnNlbnRlbmNlLFxuICAgICAgcmVjb3JkOiBvLnJlY29yZCxcbiAgICAgIGNhdGVnb3J5OiBvLmNhdGVnb3JpZXNbMF0sXG4gICAgICByZXN1bHQ6IG8ucmVzdWx0WzBdLFxuICAgICAgX3Jhbmtpbmc6IG8uX3JhbmtpbmdcbiAgICB9O1xuICB9XG4gICk7XG4gIHJldHVybiB7XG4gICAgc2VudGVuY2VzOiByZXMuc2VudGVuY2VzLFxuICAgIGVycm9yczogcmVzLmVycm9ycyxcbiAgICB0b2tlbnM6IHJlcy50b2tlbnMsXG4gICAgYW5zd2VyczogYW5zd2Vyc1xuICB9O1xufVxuXG4vKlxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RBbGxIYXZpbmdDb250ZXh0WFgoY2F0ZWdvcnk6IHN0cmluZywgY29udGV4dFF1ZXJ5U3RyaW5nOiBzdHJpbmcsXG4gIGFSdWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPixcbiAgY2F0ZWdvcnlTZXQgOiB7IFtrZXk6c3RyaW5nXSA6IGJvb2xlYW4gfSk6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzQW5zd2VycyB7XG4gIGlmIChjb250ZXh0UXVlcnlTdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9ycyA6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSAsXG4gICAgICB0b2tlbnMgOltdLFxuICAgICAgYW5zd2VyczpbXVxuICAgfTtcbiAgfSBlbHNlIHtcbiAgICBwZXJmbG9nKFwiYW5hbHl6ZUNvbnRleHRTdHJpbmcgLi4uXCIpO1xuICAgIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IGFuYWx5emVDb250ZXh0U3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgYVJ1bGVzKTtcbiAgICBwZXJmbG9nKFwibWF0Y2hpbmcgcmVjb3JkcyBoYXZpbmcgKHM9XCIgKyAoYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLmxlbmd0aCkgKyBcIikuLi5cIik7XG4gICAgdmFyIG1hdGNoZWRBbnN3ZXJzID0gV2hhdElzLm1hdGNoUmVjb3Jkc0hhdmluZ0NvbnRleHQoYVNlbnRlbmNlc1JlaW5mb3JjZWQsIGNhdGVnb3J5LCByZWNvcmRzLCBjYXRlZ29yeVNldCk7IC8vYVRvb2w6IEFycmF5PElNYXRjaC5JVG9vbD4pOiBhbnkgLyAqIG9iamVjdHN0cmVhbSogLyB7XG4gICAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgZGVidWdsb2coXCJMQUhDIG1hdGNoZWQgQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMsIHVuZGVmaW5lZCwgMikpO1xuICAgIH1cbiAgICBwZXJmbG9nKFwiZmlsdGVyaW5nVG9wUmFua2VkIChhPVwiICsgbWF0Y2hlZEFuc3dlcnMuc2VudGVuY2VzLmxlbmd0aCArIFwiKS4uLlwiKTtcbiAgICBtYXRjaGVkQW5zd2Vycy5hbnN3ZXJzID0gV2hhdElzLmZpbHRlck9ubHlUb3BSYW5rZWQobWF0Y2hlZEFuc3dlcnMuYW5zd2Vycyk7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgIGRlYnVnbG9nKFwiIG1hdGNoZWQgdG9wLXJhbmtlZCBBbnN3ZXJzXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkQW5zd2Vycy5hbnN3ZXJzLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgcGVyZmxvZyhcInRvdGFsTGlzdEFsbEhhdmluZ0NvbnRleHQgKGE9XCIgKyBtYXRjaGVkQW5zd2Vycy5hbnN3ZXJzLmxlbmd0aCArIFwiKVwiKTtcbiAgICByZXR1cm4gbWF0Y2hlZEFuc3dlcnM7XG4gIH1cbn1cbiovXG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0QWxsVHVwZWxXaXRoQ29udGV4dChjYXRlZ29yaWVzOiBzdHJpbmdbXSwgY29udGV4dFF1ZXJ5U3RyaW5nOiBzdHJpbmcsXG4gIGFSdWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPiwgZG9tYWluQ2F0ZWdvcnlGaWx0ZXI/OiBJTWF0Y2guSURvbWFpbkNhdGVnb3J5RmlsdGVyKTogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNUdXBlbEFuc3dlcnMge1xuICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB7XG4gICAgICB0dXBlbGFuc3dlcnMgOiBbXSxcbiAgICAgIGVycm9ycyA6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSAsXG4gICAgICB0b2tlbnMgOltdLFxuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgbG9nUGVyZignbGlzdEFsbFdpdGhDb250ZXh0Jyk7XG4gICAgcGVyZmxvZyhcInRvdGFsTGlzdEFsbFdpdGhDb250ZXh0XCIpO1xuICAgIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IGFuYWx5emVDb250ZXh0U3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgYVJ1bGVzKTtcbiAgICBwZXJmbG9nKFwiTEFUV0MgbWF0Y2hpbmcgcmVjb3JkcyAocz1cIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5sZW5ndGggKyBcIikuLi5cIik7XG4gICAgdmFyIG1hdGNoZWRBbnN3ZXJzID0gV2hhdElzLm1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzKGFTZW50ZW5jZXNSZWluZm9yY2VkLCBjYXRlZ29yaWVzLCByZWNvcmRzLCBkb21haW5DYXRlZ29yeUZpbHRlcik7IC8vYVRvb2w6IEFycmF5PElNYXRjaC5JVG9vbD4pOiBhbnkgLyogb2JqZWN0c3RyZWFtKi8ge1xuICAgIGlmKGRlYnVnbG9nLmVuYWJsZWQpe1xuICAgICAgZGVidWdsb2coXCIgbWF0Y2hlZCBBbnN3ZXJzXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkQW5zd2VycywgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHBlcmZsb2coXCJmaWx0ZXJpbmcgdG9wUmFua2VkIChhPVwiICsgbWF0Y2hlZEFuc3dlcnMudHVwZWxhbnN3ZXJzLmxlbmd0aCArIFwiKS4uLlwiKTtcbiAgICB2YXIgbWF0Y2hlZEZpbHRlcmVkID0gV2hhdElzLmZpbHRlck9ubHlUb3BSYW5rZWRUdXBlbChtYXRjaGVkQW5zd2Vycy50dXBlbGFuc3dlcnMpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICBkZWJ1Z2xvZyhcIkxBVFdDIG1hdGNoZWQgdG9wLXJhbmtlZCBBbnN3ZXJzXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkRmlsdGVyZWQsIHVuZGVmaW5lZCwgMikpO1xuICAgIH1cbiAgICBwZXJmbG9nKFwidG90YWxMaXN0QWxsV2l0aENvbnRleHQgKGE9XCIgKyBtYXRjaGVkRmlsdGVyZWQubGVuZ3RoICsgXCIpXCIpO1xuICAgIGxvZ1BlcmYoJ2xpc3RBbGxXaXRoQ29udGV4dCcpO1xuICAgIHJldHVybiB7XG4gICAgICB0dXBlbGFuc3dlcnMgOiBtYXRjaGVkRmlsdGVyZWQsIC8vID8/PyBBbnN3ZXJzO1xuICAgICAgZXJyb3JzIDogYVNlbnRlbmNlc1JlaW5mb3JjZWQuZXJyb3JzLFxuICAgICAgdG9rZW5zOiBhU2VudGVuY2VzUmVpbmZvcmNlZC50b2tlbnNcbiAgICB9XG4gIH1cbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gbGlzdEFsbFR1cGVsSGF2aW5nQ29udGV4dChjYXRlZ29yaWVzOiBzdHJpbmdbXSwgY29udGV4dFF1ZXJ5U3RyaW5nOiBzdHJpbmcsXG4gIGFSdWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPixcbiAgZG9tYWluQ2F0ZWdvcnlGaWx0ZXIgOiBJTWF0Y2guSURvbWFpbkNhdGVnb3J5RmlsdGVyKTogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNUdXBlbEFuc3dlcnMge1xuICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB7XG4gICAgICB0dXBlbGFuc3dlcnMgOiBbXSxcbiAgICAgIGVycm9ycyA6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSAsXG4gICAgICB0b2tlbnMgOltdLFxuICAgIH07XG4gIH0gZWxzZSB7XG4gICAgcGVyZmxvZyhcImFuYWx5emVDb250ZXh0U3RyaW5nIC4uLlwiKTtcbiAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBhbmFseXplQ29udGV4dFN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIGFSdWxlcyk7XG4gICAgcGVyZmxvZyhcIm1hdGNoaW5nIHJlY29yZHMgaGF2aW5nIChzPVwiICsgKGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5sZW5ndGgpICsgXCIpLi4uXCIpO1xuICAgIHZhciBtYXRjaGVkQW5zd2VycyA9IFdoYXRJcy5tYXRjaFJlY29yZHNUdXBlbEhhdmluZ0NvbnRleHQoYVNlbnRlbmNlc1JlaW5mb3JjZWQsIGNhdGVnb3JpZXMsIHJlY29yZHMsIGRvbWFpbkNhdGVnb3J5RmlsdGVyKTsgLy9hVG9vbDogQXJyYXk8SU1hdGNoLklUb29sPik6IGFueSAvKiBvYmplY3RzdHJlYW0qLyB7XG4gICAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgZGVidWdsb2coXCIgbWF0Y2hlZCBBbnN3ZXJzXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkQW5zd2VycywgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHBlcmZsb2coXCJmaWx0ZXJpbmdUb3BSYW5rZWQgKGE9XCIgKyBtYXRjaGVkQW5zd2Vycy50dXBlbGFuc3dlcnMubGVuZ3RoICsgXCIpLi4uXCIpO1xuICAgIC8vY29uc29sZS5sb2cobWF0Y2hlZEFuc3dlcnMudHVwZWxhbnN3ZXJzLnNsaWNlKDAsMikubWFwKG89PiBKU09OLnN0cmluZ2lmeShvKSkuam9pbihcIlxcblwiKSk7XG4gICAgdmFyIG1hdGNoZWRGaWx0ZXJlZCA9IFdoYXRJcy5maWx0ZXJPbmx5VG9wUmFua2VkVHVwZWwobWF0Y2hlZEFuc3dlcnMudHVwZWxhbnN3ZXJzKTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgZGVidWdsb2coXCJMQVRIQyBtYXRjaGVkIHRvcC1yYW5rZWQgQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEZpbHRlcmVkLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgcGVyZmxvZyhcInRvdGFsTGlzdEFsbEhhdmluZ0NvbnRleHQgKGE9XCIgKyBtYXRjaGVkRmlsdGVyZWQubGVuZ3RoICsgXCIpXCIpO1xuICAgIHJldHVybiB7XG4gICAgICB0dXBlbGFuc3dlcnMgOiAgbWF0Y2hlZEZpbHRlcmVkLFxuICAgICAgZXJyb3JzIDogYVNlbnRlbmNlc1JlaW5mb3JjZWQuZXJyb3JzLFxuICAgICAgdG9rZW5zOiBhU2VudGVuY2VzUmVpbmZvcmNlZC50b2tlbnNcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlclN0cmluZ0xpc3RCeU9wKG9wZXJhdG9yOiBJTWF0Y2guSU9wZXJhdG9yLCBmcmFnbWVudCA6IHN0cmluZywgIHNyY2FyciA6IHN0cmluZ1tdICkgOiBzdHJpbmdbXSB7XG4gIHZhciBmcmFnbWVudExDID0gQnJlYWtEb3duLnRyaW1RdW90ZWRTcGFjZWQoZnJhZ21lbnQudG9Mb3dlckNhc2UoKSk7XG4gIHJldHVybiBzcmNhcnIuZmlsdGVyKGZ1bmN0aW9uKHN0cikge1xuICAgIHJldHVybiBPcGVyYXRvci5tYXRjaGVzKG9wZXJhdG9yLCBmcmFnbWVudExDLCBzdHIudG9Mb3dlckNhc2UoKSk7XG4gIH0pLnNvcnQoKTtcbn1cblxuZnVuY3Rpb24gY29tcGFyZUNhc2VJbnNlbnNpdGl2ZShhOiBzdHJpbmcsIGIgOiBzdHJpbmcpIHtcbiAgdmFyIHIgPSBhLnRvTG93ZXJDYXNlKCkubG9jYWxlQ29tcGFyZShiLnRvTG93ZXJDYXNlKCkpO1xuICBpZiAocikge1xuICAgIHJldHVybiByO1xuICB9XG4gIHJldHVybiAtYS5sb2NhbGVDb21wYXJlKGIpO1xufVxuXG4vKipcbiAqIFNvcnQgc3RyaW5nIGxpc3QgY2FzZSBpbnNlbnNpdGl2ZSwgdGhlbiByZW1vdmUgZHVwbGljYXRlcyByZXRhaW5pbmdcbiAqIFwibGFyZ2VzdFwiIG1hdGNoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZW1vdmVDYXNlRHVwbGljYXRlcyhhcnIgOiBzdHJpbmdbXSkgOiBzdHJpbmdbXSB7XG4gIGFyci5zb3J0KGNvbXBhcmVDYXNlSW5zZW5zaXRpdmUpO1xuICBkZWJ1Z2xvZygnc29ydGVkIGFycicgKyBKU09OLnN0cmluZ2lmeShhcnIpKTtcbiAgcmV0dXJuIGFyci5maWx0ZXIoZnVuY3Rpb24ocywgaW5kZXgpIHtcbiAgICByZXR1cm4gaW5kZXggPT09IDAgfHwgKDAgIT09IGFycltpbmRleCAtMSBdLnRvTG93ZXJDYXNlKCkubG9jYWxlQ29tcGFyZShzLnRvTG93ZXJDYXNlKCkpKTtcbiAgfSk7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2F0ZWdvcnlPcEZpbHRlckFzRGlzdGluY3RTdHJpbmdzKG9wZXJhdG9yOiBJTWF0Y2guSU9wZXJhdG9yLCBmcmFnbWVudCA6IHN0cmluZyxcbiAgY2F0ZWdvcnkgOiBzdHJpbmcsIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPiwgZmlsdGVyRG9tYWluPyA6IHN0cmluZykgOiBzdHJpbmdbXSB7XG4gICAgdmFyIGZyYWdtZW50TEMgPSBCcmVha0Rvd24udHJpbVF1b3RlZChmcmFnbWVudC50b0xvd2VyQ2FzZSgpKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgdmFyIHNlZW4gPSB7fTtcbiAgICByZWNvcmRzLmZvckVhY2goZnVuY3Rpb24ocmVjb3JkKSB7XG4gICAgICBpZihmaWx0ZXJEb21haW4gJiYgcmVjb3JkIFsnX2RvbWFpbiddICE9PSBmaWx0ZXJEb21haW4pIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYocmVjb3JkW2NhdGVnb3J5XSAmJiBPcGVyYXRvci5tYXRjaGVzKG9wZXJhdG9yLCBmcmFnbWVudExDLCByZWNvcmRbY2F0ZWdvcnldLnRvTG93ZXJDYXNlKCkpKSB7XG4gICAgICAgIGlmKCFzZWVuW3JlY29yZFtjYXRlZ29yeV1dKSB7XG4gICAgICAgICAgc2VlbltyZWNvcmRbY2F0ZWdvcnldXSA9IHRydWU7XG4gICAgICAgICAgcmVzLnB1c2gocmVjb3JkW2NhdGVnb3J5XSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVtb3ZlQ2FzZUR1cGxpY2F0ZXMocmVzKTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBsaWtlbHlQbHVyYWxEaWZmKGEgOiBzdHJpbmcsIHBsdXJhbE9mYSA6IHN0cmluZykgOiBib29sZWFuIHtcbiAgdmFyIGFMQyA9IEJyZWFrRG93bi50cmltUXVvdGVkKGEudG9Mb3dlckNhc2UoKSkgIHx8IFwiXCI7XG4gIHZhciBwbHVyYWxPZkFMQyA9IEJyZWFrRG93bi50cmltUXVvdGVkKChwbHVyYWxPZmEgfHxcIlwiKS50b0xvd2VyQ2FzZSgpKSB8fCBcIlwiO1xuICBpZiAoYUxDID09PSBwbHVyYWxPZkFMQykge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIGlmKCBhTEMgKydzJyA9PT0gcGx1cmFsT2ZBTEMpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59O1xuXG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0QWxsV2l0aENhdGVnb3J5KGNhdGVnb3J5OiBzdHJpbmcsIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPik6IEFycmF5PElNYXRjaC5JUmVjb3JkPiB7XG4gIHZhciBtYXRjaGVkQW5zd2VycyA9IG1hdGNoUmVjb3JkSGF2aW5nQ2F0ZWdvcnkoY2F0ZWdvcnksIHJlY29yZHMpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8qIG9iamVjdHN0cmVhbSovIHtcbiAgZGVidWdsb2coXCIgbGlzdEFsbFdpdGhDYXRlZ29yeTpcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRBbnN3ZXJzLCB1bmRlZmluZWQsIDIpKTtcbiAgcmV0dXJuIG1hdGNoZWRBbnN3ZXJzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gam9pblNvcnRlZFF1b3RlZChzdHJpbmdzIDogc3RyaW5nW10gKSA6IHN0cmluZyB7XG4gIGlmIChzdHJpbmdzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBcIlwiO1xuICB9XG4gIHJldHVybiAnXCInICsgc3RyaW5ncy5zb3J0KCkuam9pbignXCI7IFwiJykgKyAnXCInO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gam9pbkRpc3RpbmN0KGNhdGVnb3J5IDogc3RyaW5nLCByZWNvcmRzIDogQXJyYXk8SU1hdGNoLklSZWNvcmQ+KSA6IHN0cmluZyB7XG4gIHZhciByZXMgPSByZWNvcmRzLnJlZHVjZShmdW5jdGlvbihwcmV2LCBvUmVjb3JkKSB7XG4gICAgcHJldltvUmVjb3JkW2NhdGVnb3J5XV0gPSAxO1xuICAgIHJldHVybiBwcmV2O1xuICB9LHt9IGFzIGFueSk7XG4gIHJldHVybiBqb2luU29ydGVkUXVvdGVkKE9iamVjdC5rZXlzKHJlcykpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0RGlzdGluY3RGcm9tV2hhdElmUmVzdWx0KCBhbnN3ZXJzIDogQXJyYXk8SU1hdGNoLklXaGF0SXNBbnN3ZXI+KSA6IHN0cmluZyB7XG4gIHJldHVybiBqb2luU29ydGVkUXVvdGVkKGFuc3dlcnMubWFwKGZ1bmN0aW9uKG9BbnN3ZXIpIHtcbiAgICByZXR1cm4gb0Fuc3dlci5yZXN1bHQ7XG4gIH0pKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGpvaW5SZXN1bHRzKHJlc3VsdHM6IEFycmF5PElNYXRjaC5JV2hhdElzQW5zd2VyPik6IHN0cmluZ1tdIHtcbiAgdmFyIHJlcyAgPSBbXTtcbiAgdmFyIGNudCA9IHJlc3VsdHMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCByZXN1bHQpIHtcbiAgICBpZiAocmVzdWx0Ll9yYW5raW5nID09PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICBpZihyZXMuaW5kZXhPZihyZXN1bHQucmVzdWx0KSA8IDAgKXtcbiAgICAgICAgcmVzLnB1c2gocmVzdWx0LnJlc3VsdCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcHJldiArIDE7XG4gICAgfVxuICB9LCAwKTtcbiAgcmV0dXJuIHJlcztcbn1cblxuaW1wb3J0ICogYXMgVXRpbHMgZnJvbSAnLi4vdXRpbHMvdXRpbHMnO1xuXG5leHBvcnQgZnVuY3Rpb24gam9pblJlc3VsdHNUdXBlbChyZXN1bHRzOiBBcnJheTxJTWF0Y2guSVdoYXRJc1R1cGVsQW5zd2VyPik6IHN0cmluZ1tdIHtcbiAgdmFyIHJlcyAgPSBbXTtcbiAgdmFyIGNudCA9IHJlc3VsdHMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCByZXN1bHQpIHtcbiAgICBpZiAocmVzdWx0Ll9yYW5raW5nID09PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICB2YXIgdmFsdWUgPSBVdGlscy5saXN0VG9RdW90ZWRDb21tYUFuZChyZXN1bHQucmVzdWx0KTtcbiAgICAgIGlmKHJlcy5pbmRleE9mKHZhbHVlKSA8IDAgKXtcbiAgICAgICAgcmVzLnB1c2godmFsdWUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHByZXYgKyAxO1xuICAgIH1cbiAgfSwgMCk7XG4gIHJldHVybiByZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbmZlckRvbWFpbih0aGVNb2RlbCA6IElNYXRjaC5JTW9kZWxzLCBjb250ZXh0UXVlcnlTdHJpbmc6IHN0cmluZyk6IHN0cmluZyB7XG4gLy8gY29uc29sZS5sb2coXCJoZXJlIHRoZSBzdHJpbmdcIiArIGNvbnRleHRRdWVyeVN0cmluZyk7XG4gLy8gIGNvbnNvbGUubG9nKFwiaGVyZSB0aGUgcnVsZXNcIiArIEpTT04uc3RyaW5naWZ5KHRoZU1vZGVsLm1SdWxlcykpO1xuICB2YXIgcmVzID0gYW5hbHl6ZUNvbnRleHRTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCB0aGVNb2RlbC5ydWxlcyk7XG4gIC8vY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkocmVzLHVuZGVmaW5lZCwyKSk7XG4gIC8vIHJ1biB0aHJvdWdoIHRoZSBzdHJpbmcsIHNlYXJjaCBmb3IgYSBjYXRlZ29yeVxuICBpZighcmVzLnNlbnRlbmNlcy5sZW5ndGgpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIHZhciBkb21haW5zID0gW107XG4gIC8vY29uc29sZS5sb2coU2VudGVuY2UuZHVtcE5pY2VBcnIocmVzKSk7XG4gIC8vIGRvIHdlIGhhdmUgYSBkb21haW4gP1xuICByZXMuc2VudGVuY2VzWzBdLmZvckVhY2goZnVuY3Rpb24ob1dvcmRHcm91cCkge1xuICAgIGlmKG9Xb3JkR3JvdXAuY2F0ZWdvcnkgPT09IFwiZG9tYWluXCIpIHtcbiAgICAgIGRvbWFpbnMucHVzaChvV29yZEdyb3VwLm1hdGNoZWRTdHJpbmcpXG4gICAgfVxuICB9KTtcbiAgaWYoZG9tYWlucy5sZW5ndGggPT09IDEpIHtcbiAgICBkZWJ1Z2xvZyhcImdvdCBhIHByZWNpc2UgZG9tYWluIFwiICsgZG9tYWluc1swXSk7XG4gICAgcmV0dXJuIGRvbWFpbnNbMF07XG4gIH1cbiAgaWYoZG9tYWlucy5sZW5ndGggPiAwICkge1xuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQ/IChcImdvdCBtb3JlIHRoYW4gb25lIGRvbWFpbiwgY29uZnVzZWQgIFwiICsgZG9tYWlucy5qb2luKFwiXFxuXCIpKTonLScpO1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgLy8gVE9ET0RcbiAgfVxuICBkZWJ1Z2xvZyhcImF0dGVtcHRpbmcgdG8gZGV0ZXJtaW5lIGNhdGVnb3JpZXNcIilcbiAgLy8gdHJ5IGEgY2F0ZWdvcnkgcmV2ZXJzZSBtYXBcbiAgcmVzLnNlbnRlbmNlc1swXS5mb3JFYWNoKGZ1bmN0aW9uKG9Xb3JkR3JvdXApe1xuICAgIGlmKG9Xb3JkR3JvdXAuY2F0ZWdvcnkgPT09IFwiY2F0ZWdvcnlcIikge1xuICAgICAgdmFyIHNDYXQgPSBvV29yZEdyb3VwLm1hdGNoZWRTdHJpbmc7XG4gICAgICB2YXIgZG9tcyA9IE1vZGVsLmdldERvbWFpbnNGb3JDYXRlZ29yeSh0aGVNb2RlbCxzQ2F0KTtcbiAgICAgIGRvbXMuZm9yRWFjaChmdW5jdGlvbihzRG9tKSB7XG4gICAgICAgIGlmKGRvbWFpbnMuaW5kZXhPZihzRG9tKSA8IDApIHtcbiAgICAgICAgICBkb21haW5zLnB1c2goc0RvbSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG4gIGlmKGRvbWFpbnMubGVuZ3RoID09PSAxKSB7XG4gICAgIGRlYnVnbG9nKFwiZ290IGEgcHJlY2lzZSBkb21haW4gXCIgKyBkb21haW5zWzBdKTtcbiAgICByZXR1cm4gZG9tYWluc1swXTtcbiAgfVxuICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiZ290IG1vcmUgdGhhbiBvbmUgZG9tYWluLCBjb25mdXNlZCAgXCIgKyBkb21haW5zLmpvaW4oXCJcXG5cIikpIDonLScpO1xuICByZXR1cm4gdW5kZWZpbmVkO1xufTsiLCIvKipcbiAqXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5hbmFseXplXG4gKiBAZmlsZSBhbmFseXplLnRzXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXG4gKi9cblwidXNlIHN0cmljdFwiO1xudmFyIGRlYnVnID0gcmVxdWlyZShcImRlYnVnXCIpO1xudmFyIGRlYnVnbG9nID0gZGVidWcoJ2xpc3RhbGwnKTtcbnZhciBsb2dnZXIgPSByZXF1aXJlKFwiLi4vdXRpbHMvbG9nZ2VyXCIpO1xudmFyIGxvZ1BlcmYgPSBsb2dnZXIucGVyZihcInBlcmZsaXN0YWxsXCIpO1xudmFyIHBlcmZsb2cgPSBkZWJ1ZygncGVyZicpO1xudmFyIEJyZWFrRG93biA9IHJlcXVpcmUoXCIuL2JyZWFrZG93blwiKTtcbnZhciBPcGVyYXRvciA9IHJlcXVpcmUoXCIuL29wZXJhdG9yXCIpO1xudmFyIFdoYXRJcyA9IHJlcXVpcmUoXCIuL3doYXRpc1wiKTtcbnZhciBFckVycm9yID0gcmVxdWlyZShcIi4vZXJlcnJvclwiKTtcbnZhciBNb2RlbCA9IHJlcXVpcmUoXCIuLi9tb2RlbC9tb2RlbFwiKTtcbnZhciBzV29yZHMgPSB7fTtcbmZ1bmN0aW9uIG1hdGNoUmVjb3JkSGF2aW5nQ2F0ZWdvcnkoY2F0ZWdvcnksIHJlY29yZHMpIHtcbiAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gSlNPTi5zdHJpbmdpZnkocmVjb3JkcywgdW5kZWZpbmVkLCAyKSA6IFwiLVwiKTtcbiAgICB2YXIgcmVsZXZhbnRSZWNvcmRzID0gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICByZXR1cm4gKHJlY29yZFtjYXRlZ29yeV0gIT09IHVuZGVmaW5lZCkgJiYgKHJlY29yZFtjYXRlZ29yeV0gIT09IG51bGwpO1xuICAgIH0pO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBkZWJ1Z2xvZyhcInJlbGV2YW50IHJlY29yZHMgbnI6XCIgKyByZWxldmFudFJlY29yZHMubGVuZ3RoKTtcbiAgICByZXR1cm4gcmVsZXZhbnRSZWNvcmRzO1xufVxuZXhwb3J0cy5tYXRjaFJlY29yZEhhdmluZ0NhdGVnb3J5ID0gbWF0Y2hSZWNvcmRIYXZpbmdDYXRlZ29yeTtcbmZ1bmN0aW9uIGFuYWx5emVDb250ZXh0U3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMpIHtcbiAgICByZXR1cm4gV2hhdElzLmFuYWx5emVDb250ZXh0U3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgcnVsZXMpO1xufVxuZXhwb3J0cy5hbmFseXplQ29udGV4dFN0cmluZyA9IGFuYWx5emVDb250ZXh0U3RyaW5nO1xuLy8gY29uc3QgcmVzdWx0ID0gV2hhdElzLnJlc29sdmVDYXRlZ29yeShjYXQsIGExLmVudGl0eSxcbi8vICAgdGhlTW9kZWwubVJ1bGVzLCB0aGVNb2RlbC50b29scywgdGhlTW9kZWwucmVjb3Jkcyk7XG5mdW5jdGlvbiBsaXN0QWxsV2l0aENvbnRleHQoY2F0ZWdvcnksIGNvbnRleHRRdWVyeVN0cmluZywgYVJ1bGVzLCByZWNvcmRzLCBkb21haW5DYXRlZ29yeUZpbHRlcikge1xuICAgIHZhciByZXMgPSBsaXN0QWxsVHVwZWxXaXRoQ29udGV4dChbY2F0ZWdvcnldLCBjb250ZXh0UXVlcnlTdHJpbmcsIGFSdWxlcywgcmVjb3JkcywgZG9tYWluQ2F0ZWdvcnlGaWx0ZXIpO1xuICAgIHZhciBhbnN3ZXJzID0gcmVzLnR1cGVsYW5zd2Vycy5tYXAoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNlbnRlbmNlOiBvLnNlbnRlbmNlLFxuICAgICAgICAgICAgcmVjb3JkOiBvLnJlY29yZCxcbiAgICAgICAgICAgIGNhdGVnb3J5OiBvLmNhdGVnb3JpZXNbMF0sXG4gICAgICAgICAgICByZXN1bHQ6IG8ucmVzdWx0WzBdLFxuICAgICAgICAgICAgX3Jhbmtpbmc6IG8uX3JhbmtpbmdcbiAgICAgICAgfTtcbiAgICB9KTtcbiAgICByZXR1cm4ge1xuICAgICAgICBzZW50ZW5jZXM6IHJlcy5zZW50ZW5jZXMsXG4gICAgICAgIGVycm9yczogcmVzLmVycm9ycyxcbiAgICAgICAgdG9rZW5zOiByZXMudG9rZW5zLFxuICAgICAgICBhbnN3ZXJzOiBhbnN3ZXJzXG4gICAgfTtcbn1cbmV4cG9ydHMubGlzdEFsbFdpdGhDb250ZXh0ID0gbGlzdEFsbFdpdGhDb250ZXh0O1xuLypcbmV4cG9ydCBmdW5jdGlvbiBsaXN0QWxsV2l0aENvbnRleHRYWChjYXRlZ29yeTogc3RyaW5nLCBjb250ZXh0UXVlcnlTdHJpbmc6IHN0cmluZyxcbiAgYVJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+LCBjYXRlZ29yeVNldD86IHsgW2tleSA6IHN0cmluZ10gOiBib29sZWFuIH0pOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnNcbiB7XG4gIGlmIChjb250ZXh0UXVlcnlTdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGFuc3dlcnMgOiBbXSxcbiAgICAgIGVycm9ycyA6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSAsXG4gICAgICB0b2tlbnMgOltdXG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICBsb2dQZXJmKCdsaXN0QWxsV2l0aENvbnRleHQnKTtcbiAgICBwZXJmbG9nKFwidG90YWxMaXN0QWxsV2l0aENvbnRleHRcIik7XG4gICAgdmFyIGFTZW50ZW5jZXNSZWluZm9yY2VkID0gYW5hbHl6ZUNvbnRleHRTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCBhUnVsZXMpO1xuICAgIGRlYnVnbG9nKFwibGlzdEFsbFdpdGhDb250ZXh0Om1hdGNoaW5nIHJlY29yZHMgKHM9XCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubGVuZ3RoICsgXCIpLi4uXCIpO1xuICAgIGRlYnVnbG9nKFwiaGVyZSBzZW50ZW5jZXNcIiArIEpTT04uc3RyaW5naWZ5KGFTZW50ZW5jZXNSZWluZm9yY2VkLHVuZGVmaW5lZCwyKSk7XG4gICAgcGVyZmxvZyhcIm1hdGNoaW5nIHJlY29yZHMgKHM9XCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubGVuZ3RoICsgXCIpLi4uXCIpO1xuICAgIHZhciBtYXRjaGVkQW5zd2VycyA9IFdoYXRJcy5tYXRjaFJlY29yZHNRdWljayhhU2VudGVuY2VzUmVpbmZvcmNlZCwgY2F0ZWdvcnksIHJlY29yZHMsIGNhdGVnb3J5U2V0KTtcbiAgICAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8gKiBvYmplY3RzdHJlYW0qIC8ge1xuICAgIGlmKGRlYnVnbG9nLmVuYWJsZWQpe1xuICAgICAgZGVidWdsb2coXCIgbWF0Y2hlZCBBbnN3ZXJzXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkQW5zd2VycywgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHBlcmZsb2coXCJmaWx0ZXJpbmcgdG9wUmFua2VkIChhPVwiICsgbWF0Y2hlZEFuc3dlcnMuYW5zd2Vycy5sZW5ndGggKyBcIikuLi5cIik7XG4gICAgdmFyIG1hdGNoZWRGaWx0ZXJlZCA9IFdoYXRJcy5maWx0ZXJPbmx5VG9wUmFua2VkKG1hdGNoZWRBbnN3ZXJzLmFuc3dlcnMpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICBkZWJ1Z2xvZyhcIiBtYXRjaGVkIHRvcC1yYW5rZWQgQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEZpbHRlcmVkLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgcGVyZmxvZyhcInRvdGFsTGlzdEFsbFdpdGhDb250ZXh0IChhPVwiICsgbWF0Y2hlZEZpbHRlcmVkLmxlbmd0aCArIFwiKVwiKTtcbiAgICBsb2dQZXJmKCdsaXN0QWxsV2l0aENvbnRleHQnKTtcbiAgICByZXR1cm4ge1xuICAgICBhbnN3ZXJzIDogIG1hdGNoZWRGaWx0ZXJlZCwgLy8gPz8/IEFuc3dlcnM7XG4gICAgIGVycm9ycyA6IGFTZW50ZW5jZXNSZWluZm9yY2VkLmVycm9ycyxcbiAgICAgdG9rZW5zIDogYVNlbnRlbmNlc1JlaW5mb3JjZWQudG9rZW5zXG4gICAgfVxuIH1cbn1cbiovXG5mdW5jdGlvbiBsaXN0QWxsSGF2aW5nQ29udGV4dChjYXRlZ29yeSwgY29udGV4dFF1ZXJ5U3RyaW5nLCBhUnVsZXMsIHJlY29yZHMsIGRvbWFpbkNhdGVnb3J5RmlsdGVyKSB7XG4gICAgdmFyIHJlcyA9IGxpc3RBbGxUdXBlbEhhdmluZ0NvbnRleHQoW2NhdGVnb3J5XSwgY29udGV4dFF1ZXJ5U3RyaW5nLCBhUnVsZXMsIHJlY29yZHMsIGRvbWFpbkNhdGVnb3J5RmlsdGVyKTtcbiAgICB2YXIgYW5zd2VycyA9IHJlcy50dXBlbGFuc3dlcnMubWFwKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzZW50ZW5jZTogby5zZW50ZW5jZSxcbiAgICAgICAgICAgIHJlY29yZDogby5yZWNvcmQsXG4gICAgICAgICAgICBjYXRlZ29yeTogby5jYXRlZ29yaWVzWzBdLFxuICAgICAgICAgICAgcmVzdWx0OiBvLnJlc3VsdFswXSxcbiAgICAgICAgICAgIF9yYW5raW5nOiBvLl9yYW5raW5nXG4gICAgICAgIH07XG4gICAgfSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2VudGVuY2VzOiByZXMuc2VudGVuY2VzLFxuICAgICAgICBlcnJvcnM6IHJlcy5lcnJvcnMsXG4gICAgICAgIHRva2VuczogcmVzLnRva2VucyxcbiAgICAgICAgYW5zd2VyczogYW5zd2Vyc1xuICAgIH07XG59XG5leHBvcnRzLmxpc3RBbGxIYXZpbmdDb250ZXh0ID0gbGlzdEFsbEhhdmluZ0NvbnRleHQ7XG4vKlxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RBbGxIYXZpbmdDb250ZXh0WFgoY2F0ZWdvcnk6IHN0cmluZywgY29udGV4dFF1ZXJ5U3RyaW5nOiBzdHJpbmcsXG4gIGFSdWxlczogSU1hdGNoLlNwbGl0UnVsZXMsIHJlY29yZHM6IEFycmF5PElNYXRjaC5JUmVjb3JkPixcbiAgY2F0ZWdvcnlTZXQgOiB7IFtrZXk6c3RyaW5nXSA6IGJvb2xlYW4gfSk6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzQW5zd2VycyB7XG4gIGlmIChjb250ZXh0UXVlcnlTdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9ycyA6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSAsXG4gICAgICB0b2tlbnMgOltdLFxuICAgICAgYW5zd2VyczpbXVxuICAgfTtcbiAgfSBlbHNlIHtcbiAgICBwZXJmbG9nKFwiYW5hbHl6ZUNvbnRleHRTdHJpbmcgLi4uXCIpO1xuICAgIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IGFuYWx5emVDb250ZXh0U3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgYVJ1bGVzKTtcbiAgICBwZXJmbG9nKFwibWF0Y2hpbmcgcmVjb3JkcyBoYXZpbmcgKHM9XCIgKyAoYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLmxlbmd0aCkgKyBcIikuLi5cIik7XG4gICAgdmFyIG1hdGNoZWRBbnN3ZXJzID0gV2hhdElzLm1hdGNoUmVjb3Jkc0hhdmluZ0NvbnRleHQoYVNlbnRlbmNlc1JlaW5mb3JjZWQsIGNhdGVnb3J5LCByZWNvcmRzLCBjYXRlZ29yeVNldCk7IC8vYVRvb2w6IEFycmF5PElNYXRjaC5JVG9vbD4pOiBhbnkgLyAqIG9iamVjdHN0cmVhbSogLyB7XG4gICAgaWYoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgZGVidWdsb2coXCJMQUhDIG1hdGNoZWQgQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMsIHVuZGVmaW5lZCwgMikpO1xuICAgIH1cbiAgICBwZXJmbG9nKFwiZmlsdGVyaW5nVG9wUmFua2VkIChhPVwiICsgbWF0Y2hlZEFuc3dlcnMuc2VudGVuY2VzLmxlbmd0aCArIFwiKS4uLlwiKTtcbiAgICBtYXRjaGVkQW5zd2Vycy5hbnN3ZXJzID0gV2hhdElzLmZpbHRlck9ubHlUb3BSYW5rZWQobWF0Y2hlZEFuc3dlcnMuYW5zd2Vycyk7XG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgIGRlYnVnbG9nKFwiIG1hdGNoZWQgdG9wLXJhbmtlZCBBbnN3ZXJzXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkQW5zd2Vycy5hbnN3ZXJzLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgcGVyZmxvZyhcInRvdGFsTGlzdEFsbEhhdmluZ0NvbnRleHQgKGE9XCIgKyBtYXRjaGVkQW5zd2Vycy5hbnN3ZXJzLmxlbmd0aCArIFwiKVwiKTtcbiAgICByZXR1cm4gbWF0Y2hlZEFuc3dlcnM7XG4gIH1cbn1cbiovXG5mdW5jdGlvbiBsaXN0QWxsVHVwZWxXaXRoQ29udGV4dChjYXRlZ29yaWVzLCBjb250ZXh0UXVlcnlTdHJpbmcsIGFSdWxlcywgcmVjb3JkcywgZG9tYWluQ2F0ZWdvcnlGaWx0ZXIpIHtcbiAgICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHVwZWxhbnN3ZXJzOiBbXSxcbiAgICAgICAgICAgIGVycm9yczogW0VyRXJyb3IubWFrZUVycm9yX0VNUFRZX0lOUFVUKCldLFxuICAgICAgICAgICAgdG9rZW5zOiBbXSxcbiAgICAgICAgfTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGxvZ1BlcmYoJ2xpc3RBbGxXaXRoQ29udGV4dCcpO1xuICAgICAgICBwZXJmbG9nKFwidG90YWxMaXN0QWxsV2l0aENvbnRleHRcIik7XG4gICAgICAgIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IGFuYWx5emVDb250ZXh0U3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgYVJ1bGVzKTtcbiAgICAgICAgcGVyZmxvZyhcIkxBVFdDIG1hdGNoaW5nIHJlY29yZHMgKHM9XCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubGVuZ3RoICsgXCIpLi4uXCIpO1xuICAgICAgICB2YXIgbWF0Y2hlZEFuc3dlcnMgPSBXaGF0SXMubWF0Y2hSZWNvcmRzUXVpY2tNdWx0aXBsZUNhdGVnb3JpZXMoYVNlbnRlbmNlc1JlaW5mb3JjZWQsIGNhdGVnb3JpZXMsIHJlY29yZHMsIGRvbWFpbkNhdGVnb3J5RmlsdGVyKTsgLy9hVG9vbDogQXJyYXk8SU1hdGNoLklUb29sPik6IGFueSAvKiBvYmplY3RzdHJlYW0qLyB7XG4gICAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZyhcIiBtYXRjaGVkIEFuc3dlcnNcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRBbnN3ZXJzLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgfVxuICAgICAgICBwZXJmbG9nKFwiZmlsdGVyaW5nIHRvcFJhbmtlZCAoYT1cIiArIG1hdGNoZWRBbnN3ZXJzLnR1cGVsYW5zd2Vycy5sZW5ndGggKyBcIikuLi5cIik7XG4gICAgICAgIHZhciBtYXRjaGVkRmlsdGVyZWQgPSBXaGF0SXMuZmlsdGVyT25seVRvcFJhbmtlZFR1cGVsKG1hdGNoZWRBbnN3ZXJzLnR1cGVsYW5zd2Vycyk7XG4gICAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZyhcIkxBVFdDIG1hdGNoZWQgdG9wLXJhbmtlZCBBbnN3ZXJzXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkRmlsdGVyZWQsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgICB9XG4gICAgICAgIHBlcmZsb2coXCJ0b3RhbExpc3RBbGxXaXRoQ29udGV4dCAoYT1cIiArIG1hdGNoZWRGaWx0ZXJlZC5sZW5ndGggKyBcIilcIik7XG4gICAgICAgIGxvZ1BlcmYoJ2xpc3RBbGxXaXRoQ29udGV4dCcpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHVwZWxhbnN3ZXJzOiBtYXRjaGVkRmlsdGVyZWQsXG4gICAgICAgICAgICBlcnJvcnM6IGFTZW50ZW5jZXNSZWluZm9yY2VkLmVycm9ycyxcbiAgICAgICAgICAgIHRva2VuczogYVNlbnRlbmNlc1JlaW5mb3JjZWQudG9rZW5zXG4gICAgICAgIH07XG4gICAgfVxufVxuZXhwb3J0cy5saXN0QWxsVHVwZWxXaXRoQ29udGV4dCA9IGxpc3RBbGxUdXBlbFdpdGhDb250ZXh0O1xuZnVuY3Rpb24gbGlzdEFsbFR1cGVsSGF2aW5nQ29udGV4dChjYXRlZ29yaWVzLCBjb250ZXh0UXVlcnlTdHJpbmcsIGFSdWxlcywgcmVjb3JkcywgZG9tYWluQ2F0ZWdvcnlGaWx0ZXIpIHtcbiAgICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHVwZWxhbnN3ZXJzOiBbXSxcbiAgICAgICAgICAgIGVycm9yczogW0VyRXJyb3IubWFrZUVycm9yX0VNUFRZX0lOUFVUKCldLFxuICAgICAgICAgICAgdG9rZW5zOiBbXSxcbiAgICAgICAgfTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHBlcmZsb2coXCJhbmFseXplQ29udGV4dFN0cmluZyAuLi5cIik7XG4gICAgICAgIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IGFuYWx5emVDb250ZXh0U3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgYVJ1bGVzKTtcbiAgICAgICAgcGVyZmxvZyhcIm1hdGNoaW5nIHJlY29yZHMgaGF2aW5nIChzPVwiICsgKGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5sZW5ndGgpICsgXCIpLi4uXCIpO1xuICAgICAgICB2YXIgbWF0Y2hlZEFuc3dlcnMgPSBXaGF0SXMubWF0Y2hSZWNvcmRzVHVwZWxIYXZpbmdDb250ZXh0KGFTZW50ZW5jZXNSZWluZm9yY2VkLCBjYXRlZ29yaWVzLCByZWNvcmRzLCBkb21haW5DYXRlZ29yeUZpbHRlcik7IC8vYVRvb2w6IEFycmF5PElNYXRjaC5JVG9vbD4pOiBhbnkgLyogb2JqZWN0c3RyZWFtKi8ge1xuICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgZGVidWdsb2coXCIgbWF0Y2hlZCBBbnN3ZXJzXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkQW5zd2VycywgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgIH1cbiAgICAgICAgcGVyZmxvZyhcImZpbHRlcmluZ1RvcFJhbmtlZCAoYT1cIiArIG1hdGNoZWRBbnN3ZXJzLnR1cGVsYW5zd2Vycy5sZW5ndGggKyBcIikuLi5cIik7XG4gICAgICAgIC8vY29uc29sZS5sb2cobWF0Y2hlZEFuc3dlcnMudHVwZWxhbnN3ZXJzLnNsaWNlKDAsMikubWFwKG89PiBKU09OLnN0cmluZ2lmeShvKSkuam9pbihcIlxcblwiKSk7XG4gICAgICAgIHZhciBtYXRjaGVkRmlsdGVyZWQgPSBXaGF0SXMuZmlsdGVyT25seVRvcFJhbmtlZFR1cGVsKG1hdGNoZWRBbnN3ZXJzLnR1cGVsYW5zd2Vycyk7XG4gICAgICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgICAgICBkZWJ1Z2xvZyhcIkxBVEhDIG1hdGNoZWQgdG9wLXJhbmtlZCBBbnN3ZXJzXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkRmlsdGVyZWQsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgICB9XG4gICAgICAgIHBlcmZsb2coXCJ0b3RhbExpc3RBbGxIYXZpbmdDb250ZXh0IChhPVwiICsgbWF0Y2hlZEZpbHRlcmVkLmxlbmd0aCArIFwiKVwiKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR1cGVsYW5zd2VyczogbWF0Y2hlZEZpbHRlcmVkLFxuICAgICAgICAgICAgZXJyb3JzOiBhU2VudGVuY2VzUmVpbmZvcmNlZC5lcnJvcnMsXG4gICAgICAgICAgICB0b2tlbnM6IGFTZW50ZW5jZXNSZWluZm9yY2VkLnRva2Vuc1xuICAgICAgICB9O1xuICAgIH1cbn1cbmV4cG9ydHMubGlzdEFsbFR1cGVsSGF2aW5nQ29udGV4dCA9IGxpc3RBbGxUdXBlbEhhdmluZ0NvbnRleHQ7XG5mdW5jdGlvbiBmaWx0ZXJTdHJpbmdMaXN0QnlPcChvcGVyYXRvciwgZnJhZ21lbnQsIHNyY2Fycikge1xuICAgIHZhciBmcmFnbWVudExDID0gQnJlYWtEb3duLnRyaW1RdW90ZWRTcGFjZWQoZnJhZ21lbnQudG9Mb3dlckNhc2UoKSk7XG4gICAgcmV0dXJuIHNyY2Fyci5maWx0ZXIoZnVuY3Rpb24gKHN0cikge1xuICAgICAgICByZXR1cm4gT3BlcmF0b3IubWF0Y2hlcyhvcGVyYXRvciwgZnJhZ21lbnRMQywgc3RyLnRvTG93ZXJDYXNlKCkpO1xuICAgIH0pLnNvcnQoKTtcbn1cbmV4cG9ydHMuZmlsdGVyU3RyaW5nTGlzdEJ5T3AgPSBmaWx0ZXJTdHJpbmdMaXN0QnlPcDtcbmZ1bmN0aW9uIGNvbXBhcmVDYXNlSW5zZW5zaXRpdmUoYSwgYikge1xuICAgIHZhciByID0gYS50b0xvd2VyQ2FzZSgpLmxvY2FsZUNvbXBhcmUoYi50b0xvd2VyQ2FzZSgpKTtcbiAgICBpZiAocikge1xuICAgICAgICByZXR1cm4gcjtcbiAgICB9XG4gICAgcmV0dXJuIC1hLmxvY2FsZUNvbXBhcmUoYik7XG59XG4vKipcbiAqIFNvcnQgc3RyaW5nIGxpc3QgY2FzZSBpbnNlbnNpdGl2ZSwgdGhlbiByZW1vdmUgZHVwbGljYXRlcyByZXRhaW5pbmdcbiAqIFwibGFyZ2VzdFwiIG1hdGNoXG4gKi9cbmZ1bmN0aW9uIHJlbW92ZUNhc2VEdXBsaWNhdGVzKGFycikge1xuICAgIGFyci5zb3J0KGNvbXBhcmVDYXNlSW5zZW5zaXRpdmUpO1xuICAgIGRlYnVnbG9nKCdzb3J0ZWQgYXJyJyArIEpTT04uc3RyaW5naWZ5KGFycikpO1xuICAgIHJldHVybiBhcnIuZmlsdGVyKGZ1bmN0aW9uIChzLCBpbmRleCkge1xuICAgICAgICByZXR1cm4gaW5kZXggPT09IDAgfHwgKDAgIT09IGFycltpbmRleCAtIDFdLnRvTG93ZXJDYXNlKCkubG9jYWxlQ29tcGFyZShzLnRvTG93ZXJDYXNlKCkpKTtcbiAgICB9KTtcbn1cbmV4cG9ydHMucmVtb3ZlQ2FzZUR1cGxpY2F0ZXMgPSByZW1vdmVDYXNlRHVwbGljYXRlcztcbjtcbmZ1bmN0aW9uIGdldENhdGVnb3J5T3BGaWx0ZXJBc0Rpc3RpbmN0U3RyaW5ncyhvcGVyYXRvciwgZnJhZ21lbnQsIGNhdGVnb3J5LCByZWNvcmRzLCBmaWx0ZXJEb21haW4pIHtcbiAgICB2YXIgZnJhZ21lbnRMQyA9IEJyZWFrRG93bi50cmltUXVvdGVkKGZyYWdtZW50LnRvTG93ZXJDYXNlKCkpO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICB2YXIgc2VlbiA9IHt9O1xuICAgIHJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgIGlmIChmaWx0ZXJEb21haW4gJiYgcmVjb3JkWydfZG9tYWluJ10gIT09IGZpbHRlckRvbWFpbikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZWNvcmRbY2F0ZWdvcnldICYmIE9wZXJhdG9yLm1hdGNoZXMob3BlcmF0b3IsIGZyYWdtZW50TEMsIHJlY29yZFtjYXRlZ29yeV0udG9Mb3dlckNhc2UoKSkpIHtcbiAgICAgICAgICAgIGlmICghc2VlbltyZWNvcmRbY2F0ZWdvcnldXSkge1xuICAgICAgICAgICAgICAgIHNlZW5bcmVjb3JkW2NhdGVnb3J5XV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJlcy5wdXNoKHJlY29yZFtjYXRlZ29yeV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlbW92ZUNhc2VEdXBsaWNhdGVzKHJlcyk7XG59XG5leHBvcnRzLmdldENhdGVnb3J5T3BGaWx0ZXJBc0Rpc3RpbmN0U3RyaW5ncyA9IGdldENhdGVnb3J5T3BGaWx0ZXJBc0Rpc3RpbmN0U3RyaW5ncztcbjtcbmZ1bmN0aW9uIGxpa2VseVBsdXJhbERpZmYoYSwgcGx1cmFsT2ZhKSB7XG4gICAgdmFyIGFMQyA9IEJyZWFrRG93bi50cmltUXVvdGVkKGEudG9Mb3dlckNhc2UoKSkgfHwgXCJcIjtcbiAgICB2YXIgcGx1cmFsT2ZBTEMgPSBCcmVha0Rvd24udHJpbVF1b3RlZCgocGx1cmFsT2ZhIHx8IFwiXCIpLnRvTG93ZXJDYXNlKCkpIHx8IFwiXCI7XG4gICAgaWYgKGFMQyA9PT0gcGx1cmFsT2ZBTEMpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChhTEMgKyAncycgPT09IHBsdXJhbE9mQUxDKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59XG5leHBvcnRzLmxpa2VseVBsdXJhbERpZmYgPSBsaWtlbHlQbHVyYWxEaWZmO1xuO1xuZnVuY3Rpb24gbGlzdEFsbFdpdGhDYXRlZ29yeShjYXRlZ29yeSwgcmVjb3Jkcykge1xuICAgIHZhciBtYXRjaGVkQW5zd2VycyA9IG1hdGNoUmVjb3JkSGF2aW5nQ2F0ZWdvcnkoY2F0ZWdvcnksIHJlY29yZHMpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8qIG9iamVjdHN0cmVhbSovIHtcbiAgICBkZWJ1Z2xvZyhcIiBsaXN0QWxsV2l0aENhdGVnb3J5OlwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMsIHVuZGVmaW5lZCwgMikpO1xuICAgIHJldHVybiBtYXRjaGVkQW5zd2Vycztcbn1cbmV4cG9ydHMubGlzdEFsbFdpdGhDYXRlZ29yeSA9IGxpc3RBbGxXaXRoQ2F0ZWdvcnk7XG5mdW5jdGlvbiBqb2luU29ydGVkUXVvdGVkKHN0cmluZ3MpIHtcbiAgICBpZiAoc3RyaW5ncy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgfVxuICAgIHJldHVybiAnXCInICsgc3RyaW5ncy5zb3J0KCkuam9pbignXCI7IFwiJykgKyAnXCInO1xufVxuZXhwb3J0cy5qb2luU29ydGVkUXVvdGVkID0gam9pblNvcnRlZFF1b3RlZDtcbmZ1bmN0aW9uIGpvaW5EaXN0aW5jdChjYXRlZ29yeSwgcmVjb3Jkcykge1xuICAgIHZhciByZXMgPSByZWNvcmRzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgb1JlY29yZCkge1xuICAgICAgICBwcmV2W29SZWNvcmRbY2F0ZWdvcnldXSA9IDE7XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIHt9KTtcbiAgICByZXR1cm4gam9pblNvcnRlZFF1b3RlZChPYmplY3Qua2V5cyhyZXMpKTtcbn1cbmV4cG9ydHMuam9pbkRpc3RpbmN0ID0gam9pbkRpc3RpbmN0O1xuZnVuY3Rpb24gZm9ybWF0RGlzdGluY3RGcm9tV2hhdElmUmVzdWx0KGFuc3dlcnMpIHtcbiAgICByZXR1cm4gam9pblNvcnRlZFF1b3RlZChhbnN3ZXJzLm1hcChmdW5jdGlvbiAob0Fuc3dlcikge1xuICAgICAgICByZXR1cm4gb0Fuc3dlci5yZXN1bHQ7XG4gICAgfSkpO1xufVxuZXhwb3J0cy5mb3JtYXREaXN0aW5jdEZyb21XaGF0SWZSZXN1bHQgPSBmb3JtYXREaXN0aW5jdEZyb21XaGF0SWZSZXN1bHQ7XG5mdW5jdGlvbiBqb2luUmVzdWx0cyhyZXN1bHRzKSB7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIHZhciBjbnQgPSByZXN1bHRzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgcmVzdWx0KSB7XG4gICAgICAgIGlmIChyZXN1bHQuX3JhbmtpbmcgPT09IHJlc3VsdHNbMF0uX3JhbmtpbmcpIHtcbiAgICAgICAgICAgIGlmIChyZXMuaW5kZXhPZihyZXN1bHQucmVzdWx0KSA8IDApIHtcbiAgICAgICAgICAgICAgICByZXMucHVzaChyZXN1bHQucmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgIH0sIDApO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmpvaW5SZXN1bHRzID0gam9pblJlc3VsdHM7XG52YXIgVXRpbHMgPSByZXF1aXJlKFwiLi4vdXRpbHMvdXRpbHNcIik7XG5mdW5jdGlvbiBqb2luUmVzdWx0c1R1cGVsKHJlc3VsdHMpIHtcbiAgICB2YXIgcmVzID0gW107XG4gICAgdmFyIGNudCA9IHJlc3VsdHMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCByZXN1bHQpIHtcbiAgICAgICAgaWYgKHJlc3VsdC5fcmFua2luZyA9PT0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gVXRpbHMubGlzdFRvUXVvdGVkQ29tbWFBbmQocmVzdWx0LnJlc3VsdCk7XG4gICAgICAgICAgICBpZiAocmVzLmluZGV4T2YodmFsdWUpIDwgMCkge1xuICAgICAgICAgICAgICAgIHJlcy5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgIH0sIDApO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmpvaW5SZXN1bHRzVHVwZWwgPSBqb2luUmVzdWx0c1R1cGVsO1xuZnVuY3Rpb24gaW5mZXJEb21haW4odGhlTW9kZWwsIGNvbnRleHRRdWVyeVN0cmluZykge1xuICAgIC8vIGNvbnNvbGUubG9nKFwiaGVyZSB0aGUgc3RyaW5nXCIgKyBjb250ZXh0UXVlcnlTdHJpbmcpO1xuICAgIC8vICBjb25zb2xlLmxvZyhcImhlcmUgdGhlIHJ1bGVzXCIgKyBKU09OLnN0cmluZ2lmeSh0aGVNb2RlbC5tUnVsZXMpKTtcbiAgICB2YXIgcmVzID0gYW5hbHl6ZUNvbnRleHRTdHJpbmcoY29udGV4dFF1ZXJ5U3RyaW5nLCB0aGVNb2RlbC5ydWxlcyk7XG4gICAgLy9jb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShyZXMsdW5kZWZpbmVkLDIpKTtcbiAgICAvLyBydW4gdGhyb3VnaCB0aGUgc3RyaW5nLCBzZWFyY2ggZm9yIGEgY2F0ZWdvcnlcbiAgICBpZiAoIXJlcy5zZW50ZW5jZXMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBkb21haW5zID0gW107XG4gICAgLy9jb25zb2xlLmxvZyhTZW50ZW5jZS5kdW1wTmljZUFycihyZXMpKTtcbiAgICAvLyBkbyB3ZSBoYXZlIGEgZG9tYWluID9cbiAgICByZXMuc2VudGVuY2VzWzBdLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkR3JvdXApIHtcbiAgICAgICAgaWYgKG9Xb3JkR3JvdXAuY2F0ZWdvcnkgPT09IFwiZG9tYWluXCIpIHtcbiAgICAgICAgICAgIGRvbWFpbnMucHVzaChvV29yZEdyb3VwLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgaWYgKGRvbWFpbnMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiZ290IGEgcHJlY2lzZSBkb21haW4gXCIgKyBkb21haW5zWzBdKTtcbiAgICAgICAgcmV0dXJuIGRvbWFpbnNbMF07XG4gICAgfVxuICAgIGlmIChkb21haW5zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImdvdCBtb3JlIHRoYW4gb25lIGRvbWFpbiwgY29uZnVzZWQgIFwiICsgZG9tYWlucy5qb2luKFwiXFxuXCIpKSA6ICctJyk7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGRlYnVnbG9nKFwiYXR0ZW1wdGluZyB0byBkZXRlcm1pbmUgY2F0ZWdvcmllc1wiKTtcbiAgICAvLyB0cnkgYSBjYXRlZ29yeSByZXZlcnNlIG1hcFxuICAgIHJlcy5zZW50ZW5jZXNbMF0uZm9yRWFjaChmdW5jdGlvbiAob1dvcmRHcm91cCkge1xuICAgICAgICBpZiAob1dvcmRHcm91cC5jYXRlZ29yeSA9PT0gXCJjYXRlZ29yeVwiKSB7XG4gICAgICAgICAgICB2YXIgc0NhdCA9IG9Xb3JkR3JvdXAubWF0Y2hlZFN0cmluZztcbiAgICAgICAgICAgIHZhciBkb21zID0gTW9kZWwuZ2V0RG9tYWluc0ZvckNhdGVnb3J5KHRoZU1vZGVsLCBzQ2F0KTtcbiAgICAgICAgICAgIGRvbXMuZm9yRWFjaChmdW5jdGlvbiAoc0RvbSkge1xuICAgICAgICAgICAgICAgIGlmIChkb21haW5zLmluZGV4T2Yoc0RvbSkgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvbWFpbnMucHVzaChzRG9tKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGlmIChkb21haW5zLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBkZWJ1Z2xvZyhcImdvdCBhIHByZWNpc2UgZG9tYWluIFwiICsgZG9tYWluc1swXSk7XG4gICAgICAgIHJldHVybiBkb21haW5zWzBdO1xuICAgIH1cbiAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiZ290IG1vcmUgdGhhbiBvbmUgZG9tYWluLCBjb25mdXNlZCAgXCIgKyBkb21haW5zLmpvaW4oXCJcXG5cIikpIDogJy0nKTtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xufVxuZXhwb3J0cy5pbmZlckRvbWFpbiA9IGluZmVyRG9tYWluO1xuO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
