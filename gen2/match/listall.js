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
function listAllWithContextXX(category, contextQueryString, aRules, records, categorySet) {
    if (contextQueryString.length === 0) {
        return {
            answers: [],
            errors: [ErError.makeError_EMPTY_INPUT()],
            tokens: []
        };
    } else {
        logPerf('listAllWithContext');
        perflog("totalListAllWithContext");
        var aSentencesReinforced = analyzeContextString(contextQueryString, aRules);
        debuglog("listAllWithContext:matching records (s=" + aSentencesReinforced.sentences.length + ")...");
        debuglog("here sentences" + JSON.stringify(aSentencesReinforced, undefined, 2));
        perflog("matching records (s=" + aSentencesReinforced.sentences.length + ")...");
        var matchedAnswers = WhatIs.matchRecordsQuick(aSentencesReinforced, category, records, categorySet); //aTool: Array<IMatch.ITool>): any /* objectstream*/ {
        if (debuglog.enabled) {
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
            answers: matchedFiltered,
            errors: aSentencesReinforced.errors,
            tokens: aSentencesReinforced.tokens
        };
    }
}
exports.listAllWithContextXX = listAllWithContextXX;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9saXN0YWxsLnRzIiwibWF0Y2gvbGlzdGFsbC5qcyJdLCJuYW1lcyI6WyJkZWJ1ZyIsInJlcXVpcmUiLCJkZWJ1Z2xvZyIsImxvZ2dlciIsImxvZ1BlcmYiLCJwZXJmIiwicGVyZmxvZyIsIkJyZWFrRG93biIsIk9wZXJhdG9yIiwiV2hhdElzIiwiRXJFcnJvciIsIk1vZGVsIiwic1dvcmRzIiwibWF0Y2hSZWNvcmRIYXZpbmdDYXRlZ29yeSIsImNhdGVnb3J5IiwicmVjb3JkcyIsImVuYWJsZWQiLCJKU09OIiwic3RyaW5naWZ5IiwidW5kZWZpbmVkIiwicmVsZXZhbnRSZWNvcmRzIiwiZmlsdGVyIiwicmVjb3JkIiwicmVzIiwibGVuZ3RoIiwiZXhwb3J0cyIsImFuYWx5emVDb250ZXh0U3RyaW5nIiwiY29udGV4dFF1ZXJ5U3RyaW5nIiwicnVsZXMiLCJsaXN0QWxsV2l0aENvbnRleHQiLCJhUnVsZXMiLCJjYXRlZ29yeVNldCIsImxpc3RBbGxUdXBlbFdpdGhDb250ZXh0IiwiYW5zd2VycyIsInR1cGVsYW5zd2VycyIsIm1hcCIsIm8iLCJzZW50ZW5jZSIsImNhdGVnb3JpZXMiLCJyZXN1bHQiLCJfcmFua2luZyIsInNlbnRlbmNlcyIsImVycm9ycyIsInRva2VucyIsImxpc3RBbGxXaXRoQ29udGV4dFhYIiwibWFrZUVycm9yX0VNUFRZX0lOUFVUIiwiYVNlbnRlbmNlc1JlaW5mb3JjZWQiLCJtYXRjaGVkQW5zd2VycyIsIm1hdGNoUmVjb3Jkc1F1aWNrIiwibWF0Y2hlZEZpbHRlcmVkIiwiZmlsdGVyT25seVRvcFJhbmtlZCIsImxpc3RBbGxIYXZpbmdDb250ZXh0IiwibGlzdEFsbFR1cGVsSGF2aW5nQ29udGV4dCIsIm1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzIiwiZmlsdGVyT25seVRvcFJhbmtlZFR1cGVsIiwibWF0Y2hSZWNvcmRzVHVwZWxIYXZpbmdDb250ZXh0IiwiZmlsdGVyU3RyaW5nTGlzdEJ5T3AiLCJvcGVyYXRvciIsImZyYWdtZW50Iiwic3JjYXJyIiwiZnJhZ21lbnRMQyIsInRyaW1RdW90ZWRTcGFjZWQiLCJ0b0xvd2VyQ2FzZSIsInN0ciIsIm1hdGNoZXMiLCJzb3J0IiwiY29tcGFyZUNhc2VJbnNlbnNpdGl2ZSIsImEiLCJiIiwiciIsImxvY2FsZUNvbXBhcmUiLCJyZW1vdmVDYXNlRHVwbGljYXRlcyIsImFyciIsInMiLCJpbmRleCIsImdldENhdGVnb3J5T3BGaWx0ZXJBc0Rpc3RpbmN0U3RyaW5ncyIsImZpbHRlckRvbWFpbiIsInRyaW1RdW90ZWQiLCJzZWVuIiwiZm9yRWFjaCIsInB1c2giLCJsaWtlbHlQbHVyYWxEaWZmIiwicGx1cmFsT2ZhIiwiYUxDIiwicGx1cmFsT2ZBTEMiLCJsaXN0QWxsV2l0aENhdGVnb3J5Iiwiam9pblNvcnRlZFF1b3RlZCIsInN0cmluZ3MiLCJqb2luIiwiam9pbkRpc3RpbmN0IiwicmVkdWNlIiwicHJldiIsIm9SZWNvcmQiLCJPYmplY3QiLCJrZXlzIiwiZm9ybWF0RGlzdGluY3RGcm9tV2hhdElmUmVzdWx0Iiwib0Fuc3dlciIsImpvaW5SZXN1bHRzIiwicmVzdWx0cyIsImNudCIsImluZGV4T2YiLCJVdGlscyIsImpvaW5SZXN1bHRzVHVwZWwiLCJ2YWx1ZSIsImxpc3RUb1F1b3RlZENvbW1hQW5kIiwiaW5mZXJEb21haW4iLCJ0aGVNb2RlbCIsImRvbWFpbnMiLCJvV29yZEdyb3VwIiwibWF0Y2hlZFN0cmluZyIsInNDYXQiLCJkb21zIiwiZ2V0RG9tYWluc0ZvckNhdGVnb3J5Iiwic0RvbSJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztBQ01BOztBREtBLElBQUFBLFFBQUFDLFFBQUEsT0FBQSxDQUFBO0FBRUEsSUFBTUMsV0FBV0YsTUFBTSxTQUFOLENBQWpCO0FBQ0EsSUFBQUcsU0FBQUYsUUFBQSxpQkFBQSxDQUFBO0FBQ0EsSUFBSUcsVUFBVUQsT0FBT0UsSUFBUCxDQUFZLGFBQVosQ0FBZDtBQUNBLElBQUlDLFVBQVVOLE1BQU0sTUFB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LENBQVIsQ0FBbkM7QUFDRCxlQUFPQSxRQUFRLENBQVIsQ0FBUDtBQUNEO0FBQ0R6RyxhQUFTQSxTQUFTYyxPQUFULEdBQW9CLHlDQUF5QzJGLFFBQVFuQixJQUFSLENBQWEsSUFBYixDQUE3RCxHQUFrRixHQUEzRjtBQUNBLFdBQU9yRSxTQUFQO0FBQ0Q7QUE3Q0RNLFFBQUFnRixXQUFBLEdBQUFBLFdBQUE7QUE2Q0MiLCJmaWxlIjoibWF0Y2gvbGlzdGFsbC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICpcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmFuYWx5emVcbiAqIEBmaWxlIGFuYWx5emUudHNcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cbiAqL1xuXG5cbmltcG9ydCAqIGFzIElucHV0RmlsdGVyIGZyb20gJy4vaW5wdXRGaWx0ZXInO1xuXG5pbXBvcnQgKiBhcyBBbGdvbCBmcm9tICcuL2FsZ29sJztcbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcblxuY29uc3QgZGVidWdsb2cgPSBkZWJ1ZygnbGlzdGFsbCcpO1xuaW1wb3J0ICogYXMgbG9nZ2VyIGZyb20gJy4uL3V0aWxzL2xvZ2dlcic7XG52YXIgbG9nUGVyZiA9IGxvZ2dlci5wZXJmKFwicGVyZmxpc3RhbGxcIik7XG52YXIgcGVyZmxvZyA9IGRlYnVnKCdwZXJmJyk7XG4vL2NvbnN0IHBlcmZsb2cgPSBsb2dnZXIucGVyZihcInBlcmZsaXN0YWxsXCIpO1xuXG5pbXBvcnQgKiBhcyB1dGlscyBmcm9tICcuLi91dGlscy91dGlscyc7XG5cbmltcG9ydCAqIGFzIElNYXRjaCBmcm9tICcuL2lmbWF0Y2gnO1xuXG5pbXBvcnQgKiBhcyBUb29sbWF0Y2hlciBmcm9tICcuL3Rvb2xtYXRjaGVyJztcbmltcG9ydCAqIGFzIEJyZWFrRG93biBmcm9tICcuL2JyZWFrZG93bic7XG5cbmltcG9ydCAqIGFzIFNlbnRlbmNlIGZyb20gJy4vc2VudGVuY2UnO1xuXG5pbXBvcnQgKiBhcyBXb3JkIGZyb20gJy4vd29yZCc7XG5pbXBvcnQgKiBhcyBPcGVyYXRvciBmcm9tICcuL29wZXJhdG9yJztcblxuaW1wb3J0ICogYXMgV2hhdElzIGZyb20gJy4vd2hhdGlzJztcbmltcG9ydCAqIGFzIEVyRXJyb3IgZnJvbSAnLi9lcmVycm9yJztcblxuaW1wb3J0ICogYXMgTW9kZWwgZnJvbSAnLi4vbW9kZWwvbW9kZWwnO1xuaW1wb3J0ICogYXMgTWF0Y2ggZnJvbSAnLi9tYXRjaCc7XG5cbnZhciBzV29yZHMgPSB7fTtcblxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVjb3JkSGF2aW5nQ2F0ZWdvcnkoY2F0ZWdvcnk6IHN0cmluZywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+KVxuICA6IEFycmF5PElNYXRjaC5JUmVjb3JkPiB7XG4gIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyBKU09OLnN0cmluZ2lmeShyZWNvcmRzLHVuZGVmaW5lZCwyKSA6IFwiLVwiKTtcbiAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQ6IElNYXRjaC5JUmVjb3JkKSB7XG4gICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnldICE9PSBudWxsKTtcbiAgfSk7XG4gIHZhciByZXMgPSBbXTtcbiAgZGVidWdsb2coXCJyZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCk7XG4gIHJldHVybiByZWxldmFudFJlY29yZHM7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGFuYWx5emVDb250ZXh0U3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZyA6IHN0cmluZywgIHJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcykge1xuICByZXR1cm4gV2hhdElzLmFuYWx5emVDb250ZXh0U3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZyxydWxlcyk7XG59XG5cbi8vIGNvbnN0IHJlc3VsdCA9IFdoYXRJcy5yZXNvbHZlQ2F0ZWdvcnkoY2F0LCBhMS5lbnRpdHksXG4vLyAgIHRoZU1vZGVsLm1SdWxlcywgdGhlTW9kZWwudG9vbHMsIHRoZU1vZGVsLnJlY29yZHMpO1xuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RBbGxXaXRoQ29udGV4dChjYXRlZ29yeTogc3RyaW5nLCBjb250ZXh0UXVlcnlTdHJpbmc6IHN0cmluZyxcbiAgYVJ1bGVzOiBJTWF0Y2guU3BsaXRSdWxlcywgcmVjb3JkczogQXJyYXk8SU1hdGNoLklSZWNvcmQ+LCBjYXRlZ29yeVNldD86IHsgW2tleTogc3RyaW5nXTogYm9vbGVhbiB9KTogSU1hdGNoLklQcm9jZXNzZWRXaGF0SXNBbnN3ZXJzIHtcbiAgdmFyIHJlcyA9IGxpc3RBbGxUdXBlbFdpdGhDb250ZXh0KFtjYXRlZ29yeV0sIGNvbnRleHRRdWVyeVN0cmluZywgYVJ1bGVzLCByZWNvcmRzLCBjYXRlZ29yeVNldCk7XG5cbiAgdmFyIGFuc3dlcnMgPSByZXMudHVwZWxhbnN3ZXJzLm1hcChmdW5jdGlvbiAobyk6IElNYXRjaC5JV2hhdElzQW5zd2VyIHtcbiAgICByZXR1cm4ge1xuICAgICAgc2VudGVuY2U6IG8uc2VudGVuY2UsXG4gICAgICByZWNvcmQ6IG8ucmVjb3JkLFxuICAgICAgY2F0ZWdvcnk6IG8uY2F0ZWdvcmllc1swXSxcbiAgICAgIHJlc3VsdDogby5yZXN1bHRbMF0sXG4gICAgICBfcmFua2luZzogby5fcmFua2luZ1xuICAgIH07XG4gIH1cbiAgKTtcbiAgcmV0dXJuIHtcbiAgICBzZW50ZW5jZXM6IHJlcy5zZW50ZW5jZXMsXG4gICAgZXJyb3JzOiByZXMuZXJyb3JzLFxuICAgIHRva2VuczogcmVzLnRva2VucyxcbiAgICBhbnN3ZXJzOiBhbnN3ZXJzXG4gIH07XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RBbGxXaXRoQ29udGV4dFhYKGNhdGVnb3J5OiBzdHJpbmcsIGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLFxuICBhUnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sIGNhdGVnb3J5U2V0PzogeyBba2V5IDogc3RyaW5nXSA6IGJvb2xlYW4gfSk6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzQW5zd2Vyc1xuIHtcbiAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4ge1xuICAgICAgYW5zd2VycyA6IFtdLFxuICAgICAgZXJyb3JzIDogW0VyRXJyb3IubWFrZUVycm9yX0VNUFRZX0lOUFVUKCldICxcbiAgICAgIHRva2VucyA6W11cbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIGxvZ1BlcmYoJ2xpc3RBbGxXaXRoQ29udGV4dCcpO1xuICAgIHBlcmZsb2coXCJ0b3RhbExpc3RBbGxXaXRoQ29udGV4dFwiKTtcbiAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBhbmFseXplQ29udGV4dFN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIGFSdWxlcyk7XG4gICAgZGVidWdsb2coXCJsaXN0QWxsV2l0aENvbnRleHQ6bWF0Y2hpbmcgcmVjb3JkcyAocz1cIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5sZW5ndGggKyBcIikuLi5cIik7XG4gICAgZGVidWdsb2coXCJoZXJlIHNlbnRlbmNlc1wiICsgSlNPTi5zdHJpbmdpZnkoYVNlbnRlbmNlc1JlaW5mb3JjZWQsdW5kZWZpbmVkLDIpKTtcbiAgICBwZXJmbG9nKFwibWF0Y2hpbmcgcmVjb3JkcyAocz1cIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5sZW5ndGggKyBcIikuLi5cIik7XG4gICAgdmFyIG1hdGNoZWRBbnN3ZXJzID0gV2hhdElzLm1hdGNoUmVjb3Jkc1F1aWNrKGFTZW50ZW5jZXNSZWluZm9yY2VkLCBjYXRlZ29yeSwgcmVjb3JkcywgY2F0ZWdvcnlTZXQpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8qIG9iamVjdHN0cmVhbSovIHtcbiAgICBpZihkZWJ1Z2xvZy5lbmFibGVkKXtcbiAgICAgIGRlYnVnbG9nKFwiIG1hdGNoZWQgQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMsIHVuZGVmaW5lZCwgMikpO1xuICAgIH1cbiAgICBwZXJmbG9nKFwiZmlsdGVyaW5nIHRvcFJhbmtlZCAoYT1cIiArIG1hdGNoZWRBbnN3ZXJzLmFuc3dlcnMubGVuZ3RoICsgXCIpLi4uXCIpO1xuICAgIHZhciBtYXRjaGVkRmlsdGVyZWQgPSBXaGF0SXMuZmlsdGVyT25seVRvcFJhbmtlZChtYXRjaGVkQW5zd2Vycy5hbnN3ZXJzKTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgZGVidWdsb2coXCIgbWF0Y2hlZCB0b3AtcmFua2VkIEFuc3dlcnNcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRGaWx0ZXJlZCwgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHBlcmZsb2coXCJ0b3RhbExpc3RBbGxXaXRoQ29udGV4dCAoYT1cIiArIG1hdGNoZWRGaWx0ZXJlZC5sZW5ndGggKyBcIilcIik7XG4gICAgbG9nUGVyZignbGlzdEFsbFdpdGhDb250ZXh0Jyk7XG4gICAgcmV0dXJuIHtcbiAgICAgYW5zd2VycyA6ICBtYXRjaGVkRmlsdGVyZWQsIC8vID8/PyBBbnN3ZXJzO1xuICAgICBlcnJvcnMgOiBhU2VudGVuY2VzUmVpbmZvcmNlZC5lcnJvcnMsXG4gICAgIHRva2VucyA6IGFTZW50ZW5jZXNSZWluZm9yY2VkLnRva2Vuc1xuICAgIH1cbiB9XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RBbGxIYXZpbmdDb250ZXh0KGNhdGVnb3J5OiBzdHJpbmcsIGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLFxuICBhUnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sXG4gIGNhdGVnb3J5U2V0IDogeyBba2V5OnN0cmluZ10gOiBib29sZWFuIH0pOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnMge1xuICB2YXIgcmVzID0gbGlzdEFsbFR1cGVsSGF2aW5nQ29udGV4dChbY2F0ZWdvcnldLCBjb250ZXh0UXVlcnlTdHJpbmcsIGFSdWxlcywgcmVjb3JkcywgY2F0ZWdvcnlTZXQpO1xuICB2YXIgYW5zd2VycyA9IHJlcy50dXBlbGFuc3dlcnMubWFwKGZ1bmN0aW9uIChvKTogSU1hdGNoLklXaGF0SXNBbnN3ZXIge1xuICAgIHJldHVybiB7XG4gICAgICBzZW50ZW5jZTogby5zZW50ZW5jZSxcbiAgICAgIHJlY29yZDogby5yZWNvcmQsXG4gICAgICBjYXRlZ29yeTogby5jYXRlZ29yaWVzWzBdLFxuICAgICAgcmVzdWx0OiBvLnJlc3VsdFswXSxcbiAgICAgIF9yYW5raW5nOiBvLl9yYW5raW5nXG4gICAgfTtcbiAgfVxuICApO1xuICByZXR1cm4ge1xuICAgIHNlbnRlbmNlczogcmVzLnNlbnRlbmNlcyxcbiAgICBlcnJvcnM6IHJlcy5lcnJvcnMsXG4gICAgdG9rZW5zOiByZXMudG9rZW5zLFxuICAgIGFuc3dlcnM6IGFuc3dlcnNcbiAgfTtcbn1cblxuLypcbmV4cG9ydCBmdW5jdGlvbiBsaXN0QWxsSGF2aW5nQ29udGV4dFhYKGNhdGVnb3J5OiBzdHJpbmcsIGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLFxuICBhUnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sXG4gIGNhdGVnb3J5U2V0IDogeyBba2V5OnN0cmluZ10gOiBib29sZWFuIH0pOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnMge1xuICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcnMgOiBbRXJFcnJvci5tYWtlRXJyb3JfRU1QVFlfSU5QVVQoKV0gLFxuICAgICAgdG9rZW5zIDpbXSxcbiAgICAgIGFuc3dlcnM6W11cbiAgIH07XG4gIH0gZWxzZSB7XG4gICAgcGVyZmxvZyhcImFuYWx5emVDb250ZXh0U3RyaW5nIC4uLlwiKTtcbiAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBhbmFseXplQ29udGV4dFN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIGFSdWxlcyk7XG4gICAgcGVyZmxvZyhcIm1hdGNoaW5nIHJlY29yZHMgaGF2aW5nIChzPVwiICsgKGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5sZW5ndGgpICsgXCIpLi4uXCIpO1xuICAgIHZhciBtYXRjaGVkQW5zd2VycyA9IFdoYXRJcy5tYXRjaFJlY29yZHNIYXZpbmdDb250ZXh0KGFTZW50ZW5jZXNSZWluZm9yY2VkLCBjYXRlZ29yeSwgcmVjb3JkcywgY2F0ZWdvcnlTZXQpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8gKiBvYmplY3RzdHJlYW0qIC8ge1xuICAgIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgIGRlYnVnbG9nKFwiTEFIQyBtYXRjaGVkIEFuc3dlcnNcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRBbnN3ZXJzLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgcGVyZmxvZyhcImZpbHRlcmluZ1RvcFJhbmtlZCAoYT1cIiArIG1hdGNoZWRBbnN3ZXJzLnNlbnRlbmNlcy5sZW5ndGggKyBcIikuLi5cIik7XG4gICAgbWF0Y2hlZEFuc3dlcnMuYW5zd2VycyA9IFdoYXRJcy5maWx0ZXJPbmx5VG9wUmFua2VkKG1hdGNoZWRBbnN3ZXJzLmFuc3dlcnMpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICBkZWJ1Z2xvZyhcIiBtYXRjaGVkIHRvcC1yYW5rZWQgQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMuYW5zd2VycywgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHBlcmZsb2coXCJ0b3RhbExpc3RBbGxIYXZpbmdDb250ZXh0IChhPVwiICsgbWF0Y2hlZEFuc3dlcnMuYW5zd2Vycy5sZW5ndGggKyBcIilcIik7XG4gICAgcmV0dXJuIG1hdGNoZWRBbnN3ZXJzO1xuICB9XG59XG4qL1xuXG5leHBvcnQgZnVuY3Rpb24gbGlzdEFsbFR1cGVsV2l0aENvbnRleHQoY2F0ZWdvcmllczogc3RyaW5nW10sIGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLFxuICBhUnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sIGNhdGVnb3J5U2V0PzogeyBba2V5IDogc3RyaW5nXSA6IGJvb2xlYW4gfSk6IElNYXRjaC5JUHJvY2Vzc2VkV2hhdElzVHVwZWxBbnN3ZXJzIHtcbiAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4ge1xuICAgICAgdHVwZWxhbnN3ZXJzIDogW10sXG4gICAgICBlcnJvcnMgOiBbRXJFcnJvci5tYWtlRXJyb3JfRU1QVFlfSU5QVVQoKV0gLFxuICAgICAgdG9rZW5zIDpbXSxcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIGxvZ1BlcmYoJ2xpc3RBbGxXaXRoQ29udGV4dCcpO1xuICAgIHBlcmZsb2coXCJ0b3RhbExpc3RBbGxXaXRoQ29udGV4dFwiKTtcbiAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBhbmFseXplQ29udGV4dFN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIGFSdWxlcyk7XG4gICAgcGVyZmxvZyhcIkxBVFdDIG1hdGNoaW5nIHJlY29yZHMgKHM9XCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubGVuZ3RoICsgXCIpLi4uXCIpO1xuICAgIHZhciBtYXRjaGVkQW5zd2VycyA9IFdoYXRJcy5tYXRjaFJlY29yZHNRdWlja011bHRpcGxlQ2F0ZWdvcmllcyhhU2VudGVuY2VzUmVpbmZvcmNlZCwgY2F0ZWdvcmllcywgcmVjb3JkcywgY2F0ZWdvcnlTZXQpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8qIG9iamVjdHN0cmVhbSovIHtcbiAgICBpZihkZWJ1Z2xvZy5lbmFibGVkKXtcbiAgICAgIGRlYnVnbG9nKFwiIG1hdGNoZWQgQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMsIHVuZGVmaW5lZCwgMikpO1xuICAgIH1cbiAgICBwZXJmbG9nKFwiZmlsdGVyaW5nIHRvcFJhbmtlZCAoYT1cIiArIG1hdGNoZWRBbnN3ZXJzLnR1cGVsYW5zd2Vycy5sZW5ndGggKyBcIikuLi5cIik7XG4gICAgdmFyIG1hdGNoZWRGaWx0ZXJlZCA9IFdoYXRJcy5maWx0ZXJPbmx5VG9wUmFua2VkVHVwZWwobWF0Y2hlZEFuc3dlcnMudHVwZWxhbnN3ZXJzKTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgZGVidWdsb2coXCJMQVRXQyBtYXRjaGVkIHRvcC1yYW5rZWQgQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEZpbHRlcmVkLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgcGVyZmxvZyhcInRvdGFsTGlzdEFsbFdpdGhDb250ZXh0IChhPVwiICsgbWF0Y2hlZEZpbHRlcmVkLmxlbmd0aCArIFwiKVwiKTtcbiAgICBsb2dQZXJmKCdsaXN0QWxsV2l0aENvbnRleHQnKTtcbiAgICByZXR1cm4ge1xuICAgICAgdHVwZWxhbnN3ZXJzIDogbWF0Y2hlZEZpbHRlcmVkLCAvLyA/Pz8gQW5zd2VycztcbiAgICAgIGVycm9ycyA6IGFTZW50ZW5jZXNSZWluZm9yY2VkLmVycm9ycyxcbiAgICAgIHRva2VuczogYVNlbnRlbmNlc1JlaW5mb3JjZWQudG9rZW5zXG4gICAgfVxuICB9XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RBbGxUdXBlbEhhdmluZ0NvbnRleHQoY2F0ZWdvcmllczogc3RyaW5nW10sIGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLFxuICBhUnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sXG4gIGNhdGVnb3J5U2V0IDogeyBba2V5OnN0cmluZ10gOiBib29sZWFuIH0pOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc1R1cGVsQW5zd2VycyB7XG4gIGlmIChjb250ZXh0UXVlcnlTdHJpbmcubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHR1cGVsYW5zd2VycyA6IFtdLFxuICAgICAgZXJyb3JzIDogW0VyRXJyb3IubWFrZUVycm9yX0VNUFRZX0lOUFVUKCldICxcbiAgICAgIHRva2VucyA6W10sXG4gICAgfTtcbiAgfSBlbHNlIHtcbiAgICBwZXJmbG9nKFwiYW5hbHl6ZUNvbnRleHRTdHJpbmcgLi4uXCIpO1xuICAgIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IGFuYWx5emVDb250ZXh0U3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgYVJ1bGVzKTtcbiAgICBwZXJmbG9nKFwibWF0Y2hpbmcgcmVjb3JkcyBoYXZpbmcgKHM9XCIgKyAoYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLmxlbmd0aCkgKyBcIikuLi5cIik7XG4gICAgdmFyIG1hdGNoZWRBbnN3ZXJzID0gV2hhdElzLm1hdGNoUmVjb3Jkc1R1cGVsSGF2aW5nQ29udGV4dChhU2VudGVuY2VzUmVpbmZvcmNlZCwgY2F0ZWdvcmllcywgcmVjb3JkcywgY2F0ZWdvcnlTZXQpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8qIG9iamVjdHN0cmVhbSovIHtcbiAgICBpZihkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICBkZWJ1Z2xvZyhcIiBtYXRjaGVkIEFuc3dlcnNcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRBbnN3ZXJzLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgcGVyZmxvZyhcImZpbHRlcmluZ1RvcFJhbmtlZCAoYT1cIiArIG1hdGNoZWRBbnN3ZXJzLnR1cGVsYW5zd2Vycy5sZW5ndGggKyBcIikuLi5cIik7XG4gICAgdmFyIG1hdGNoZWRGaWx0ZXJlZCA9IFdoYXRJcy5maWx0ZXJPbmx5VG9wUmFua2VkVHVwZWwobWF0Y2hlZEFuc3dlcnMudHVwZWxhbnN3ZXJzKTtcbiAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgZGVidWdsb2coXCIgbWF0Y2hlZCB0b3AtcmFua2VkIEFuc3dlcnNcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRGaWx0ZXJlZCwgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHBlcmZsb2coXCJ0b3RhbExpc3RBbGxIYXZpbmdDb250ZXh0IChhPVwiICsgbWF0Y2hlZEZpbHRlcmVkLmxlbmd0aCArIFwiKVwiKTtcbiAgICByZXR1cm4ge1xuICAgICAgdHVwZWxhbnN3ZXJzIDogIG1hdGNoZWRGaWx0ZXJlZCxcbiAgICAgIGVycm9ycyA6IGFTZW50ZW5jZXNSZWluZm9yY2VkLmVycm9ycyxcbiAgICAgIHRva2VuczogYVNlbnRlbmNlc1JlaW5mb3JjZWQudG9rZW5zXG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaWx0ZXJTdHJpbmdMaXN0QnlPcChvcGVyYXRvcjogSU1hdGNoLklPcGVyYXRvciwgZnJhZ21lbnQgOiBzdHJpbmcsICBzcmNhcnIgOiBzdHJpbmdbXSApIDogc3RyaW5nW10ge1xuICB2YXIgZnJhZ21lbnRMQyA9IEJyZWFrRG93bi50cmltUXVvdGVkU3BhY2VkKGZyYWdtZW50LnRvTG93ZXJDYXNlKCkpO1xuICByZXR1cm4gc3JjYXJyLmZpbHRlcihmdW5jdGlvbihzdHIpIHtcbiAgICByZXR1cm4gT3BlcmF0b3IubWF0Y2hlcyhvcGVyYXRvciwgZnJhZ21lbnRMQywgc3RyLnRvTG93ZXJDYXNlKCkpO1xuICB9KS5zb3J0KCk7XG59XG5cbmZ1bmN0aW9uIGNvbXBhcmVDYXNlSW5zZW5zaXRpdmUoYTogc3RyaW5nLCBiIDogc3RyaW5nKSB7XG4gIHZhciByID0gYS50b0xvd2VyQ2FzZSgpLmxvY2FsZUNvbXBhcmUoYi50b0xvd2VyQ2FzZSgpKTtcbiAgaWYgKHIpIHtcbiAgICByZXR1cm4gcjtcbiAgfVxuICByZXR1cm4gLWEubG9jYWxlQ29tcGFyZShiKTtcbn1cblxuLyoqXG4gKiBTb3J0IHN0cmluZyBsaXN0IGNhc2UgaW5zZW5zaXRpdmUsIHRoZW4gcmVtb3ZlIGR1cGxpY2F0ZXMgcmV0YWluaW5nXG4gKiBcImxhcmdlc3RcIiBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVtb3ZlQ2FzZUR1cGxpY2F0ZXMoYXJyIDogc3RyaW5nW10pIDogc3RyaW5nW10ge1xuICBhcnIuc29ydChjb21wYXJlQ2FzZUluc2Vuc2l0aXZlKTtcbiAgZGVidWdsb2coJ3NvcnRlZCBhcnInICsgSlNPTi5zdHJpbmdpZnkoYXJyKSk7XG4gIHJldHVybiBhcnIuZmlsdGVyKGZ1bmN0aW9uKHMsIGluZGV4KSB7XG4gICAgcmV0dXJuIGluZGV4ID09PSAwIHx8ICgwICE9PSBhcnJbaW5kZXggLTEgXS50b0xvd2VyQ2FzZSgpLmxvY2FsZUNvbXBhcmUocy50b0xvd2VyQ2FzZSgpKSk7XG4gIH0pO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldENhdGVnb3J5T3BGaWx0ZXJBc0Rpc3RpbmN0U3RyaW5ncyhvcGVyYXRvcjogSU1hdGNoLklPcGVyYXRvciwgZnJhZ21lbnQgOiBzdHJpbmcsXG4gIGNhdGVnb3J5IDogc3RyaW5nLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sIGZpbHRlckRvbWFpbj8gOiBzdHJpbmcpIDogc3RyaW5nW10ge1xuICAgIHZhciBmcmFnbWVudExDID0gQnJlYWtEb3duLnRyaW1RdW90ZWQoZnJhZ21lbnQudG9Mb3dlckNhc2UoKSk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIHZhciBzZWVuID0ge307XG4gICAgcmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uKHJlY29yZCkge1xuICAgICAgaWYoZmlsdGVyRG9tYWluICYmIHJlY29yZCBbJ19kb21haW4nXSAhPT0gZmlsdGVyRG9tYWluKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmKHJlY29yZFtjYXRlZ29yeV0gJiYgT3BlcmF0b3IubWF0Y2hlcyhvcGVyYXRvciwgZnJhZ21lbnRMQywgcmVjb3JkW2NhdGVnb3J5XS50b0xvd2VyQ2FzZSgpKSkge1xuICAgICAgICBpZighc2VlbltyZWNvcmRbY2F0ZWdvcnldXSkge1xuICAgICAgICAgIHNlZW5bcmVjb3JkW2NhdGVnb3J5XV0gPSB0cnVlO1xuICAgICAgICAgIHJlcy5wdXNoKHJlY29yZFtjYXRlZ29yeV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlbW92ZUNhc2VEdXBsaWNhdGVzKHJlcyk7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gbGlrZWx5UGx1cmFsRGlmZihhIDogc3RyaW5nLCBwbHVyYWxPZmEgOiBzdHJpbmcpIDogYm9vbGVhbiB7XG4gIHZhciBhTEMgPSBCcmVha0Rvd24udHJpbVF1b3RlZChhLnRvTG93ZXJDYXNlKCkpICB8fCBcIlwiO1xuICB2YXIgcGx1cmFsT2ZBTEMgPSBCcmVha0Rvd24udHJpbVF1b3RlZCgocGx1cmFsT2ZhIHx8XCJcIikudG9Mb3dlckNhc2UoKSkgfHwgXCJcIjtcbiAgaWYgKGFMQyA9PT0gcGx1cmFsT2ZBTEMpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBpZiggYUxDICsncycgPT09IHBsdXJhbE9mQUxDKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuXG5leHBvcnQgZnVuY3Rpb24gbGlzdEFsbFdpdGhDYXRlZ29yeShjYXRlZ29yeTogc3RyaW5nLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4pOiBBcnJheTxJTWF0Y2guSVJlY29yZD4ge1xuICB2YXIgbWF0Y2hlZEFuc3dlcnMgPSBtYXRjaFJlY29yZEhhdmluZ0NhdGVnb3J5KGNhdGVnb3J5LCByZWNvcmRzKTsgLy9hVG9vbDogQXJyYXk8SU1hdGNoLklUb29sPik6IGFueSAvKiBvYmplY3RzdHJlYW0qLyB7XG4gIGRlYnVnbG9nKFwiIGxpc3RBbGxXaXRoQ2F0ZWdvcnk6XCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkQW5zd2VycywgdW5kZWZpbmVkLCAyKSk7XG4gIHJldHVybiBtYXRjaGVkQW5zd2Vycztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGpvaW5Tb3J0ZWRRdW90ZWQoc3RyaW5ncyA6IHN0cmluZ1tdICkgOiBzdHJpbmcge1xuICBpZiAoc3RyaW5ncy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gXCJcIjtcbiAgfVxuICByZXR1cm4gJ1wiJyArIHN0cmluZ3Muc29ydCgpLmpvaW4oJ1wiOyBcIicpICsgJ1wiJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGpvaW5EaXN0aW5jdChjYXRlZ29yeSA6IHN0cmluZywgcmVjb3JkcyA6IEFycmF5PElNYXRjaC5JUmVjb3JkPikgOiBzdHJpbmcge1xuICB2YXIgcmVzID0gcmVjb3Jkcy5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgb1JlY29yZCkge1xuICAgIHByZXZbb1JlY29yZFtjYXRlZ29yeV1dID0gMTtcbiAgICByZXR1cm4gcHJldjtcbiAgfSx7fSBhcyBhbnkpO1xuICByZXR1cm4gam9pblNvcnRlZFF1b3RlZChPYmplY3Qua2V5cyhyZXMpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdERpc3RpbmN0RnJvbVdoYXRJZlJlc3VsdCggYW5zd2VycyA6IEFycmF5PElNYXRjaC5JV2hhdElzQW5zd2VyPikgOiBzdHJpbmcge1xuICByZXR1cm4gam9pblNvcnRlZFF1b3RlZChhbnN3ZXJzLm1hcChmdW5jdGlvbihvQW5zd2VyKSB7XG4gICAgcmV0dXJuIG9BbnN3ZXIucmVzdWx0O1xuICB9KSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBqb2luUmVzdWx0cyhyZXN1bHRzOiBBcnJheTxJTWF0Y2guSVdoYXRJc0Fuc3dlcj4pOiBzdHJpbmdbXSB7XG4gIHZhciByZXMgID0gW107XG4gIHZhciBjbnQgPSByZXN1bHRzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgcmVzdWx0KSB7XG4gICAgaWYgKHJlc3VsdC5fcmFua2luZyA9PT0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgaWYocmVzLmluZGV4T2YocmVzdWx0LnJlc3VsdCkgPCAwICl7XG4gICAgICAgIHJlcy5wdXNoKHJlc3VsdC5yZXN1bHQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHByZXYgKyAxO1xuICAgIH1cbiAgfSwgMCk7XG4gIHJldHVybiByZXM7XG59XG5cbmltcG9ydCAqIGFzIFV0aWxzIGZyb20gJy4uL3V0aWxzL3V0aWxzJztcblxuZXhwb3J0IGZ1bmN0aW9uIGpvaW5SZXN1bHRzVHVwZWwocmVzdWx0czogQXJyYXk8SU1hdGNoLklXaGF0SXNUdXBlbEFuc3dlcj4pOiBzdHJpbmdbXSB7XG4gIHZhciByZXMgID0gW107XG4gIHZhciBjbnQgPSByZXN1bHRzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgcmVzdWx0KSB7XG4gICAgaWYgKHJlc3VsdC5fcmFua2luZyA9PT0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgdmFyIHZhbHVlID0gVXRpbHMubGlzdFRvUXVvdGVkQ29tbWFBbmQocmVzdWx0LnJlc3VsdCk7XG4gICAgICBpZihyZXMuaW5kZXhPZih2YWx1ZSkgPCAwICl7XG4gICAgICAgIHJlcy5wdXNoKHZhbHVlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcmV2ICsgMTtcbiAgICB9XG4gIH0sIDApO1xuICByZXR1cm4gcmVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5mZXJEb21haW4odGhlTW9kZWwgOiBJTWF0Y2guSU1vZGVscywgY29udGV4dFF1ZXJ5U3RyaW5nOiBzdHJpbmcpOiBzdHJpbmcge1xuIC8vIGNvbnNvbGUubG9nKFwiaGVyZSB0aGUgc3RyaW5nXCIgKyBjb250ZXh0UXVlcnlTdHJpbmcpO1xuIC8vICBjb25zb2xlLmxvZyhcImhlcmUgdGhlIHJ1bGVzXCIgKyBKU09OLnN0cmluZ2lmeSh0aGVNb2RlbC5tUnVsZXMpKTtcbiAgdmFyIHJlcyA9IGFuYWx5emVDb250ZXh0U3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgdGhlTW9kZWwucnVsZXMpO1xuICAvL2NvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHJlcyx1bmRlZmluZWQsMikpO1xuICAvLyBydW4gdGhyb3VnaCB0aGUgc3RyaW5nLCBzZWFyY2ggZm9yIGEgY2F0ZWdvcnlcbiAgaWYoIXJlcy5zZW50ZW5jZXMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICB2YXIgZG9tYWlucyA9IFtdO1xuICAvL2NvbnNvbGUubG9nKFNlbnRlbmNlLmR1bXBOaWNlQXJyKHJlcykpO1xuICAvLyBkbyB3ZSBoYXZlIGEgZG9tYWluID9cbiAgcmVzLnNlbnRlbmNlc1swXS5mb3JFYWNoKGZ1bmN0aW9uKG9Xb3JkR3JvdXApIHtcbiAgICBpZihvV29yZEdyb3VwLmNhdGVnb3J5ID09PSBcImRvbWFpblwiKSB7XG4gICAgICBkb21haW5zLnB1c2gob1dvcmRHcm91cC5tYXRjaGVkU3RyaW5nKVxuICAgIH1cbiAgfSk7XG4gIGlmKGRvbWFpbnMubGVuZ3RoID09PSAxKSB7XG4gICAgZGVidWdsb2coXCJnb3QgYSBwcmVjaXNlIGRvbWFpbiBcIiArIGRvbWFpbnNbMF0pO1xuICAgIHJldHVybiBkb21haW5zWzBdO1xuICB9XG4gIGlmKGRvbWFpbnMubGVuZ3RoID4gMCApIHtcbiAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkPyAoXCJnb3QgbW9yZSB0aGFuIG9uZSBkb21haW4sIGNvbmZ1c2VkICBcIiArIGRvbWFpbnMuam9pbihcIlxcblwiKSk6Jy0nKTtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIC8vIFRPRE9EXG4gIH1cbiAgZGVidWdsb2coXCJhdHRlbXB0aW5nIHRvIGRldGVybWluZSBjYXRlZ29yaWVzXCIpXG4gIC8vIHRyeSBhIGNhdGVnb3J5IHJldmVyc2UgbWFwXG4gIHJlcy5zZW50ZW5jZXNbMF0uZm9yRWFjaChmdW5jdGlvbihvV29yZEdyb3VwKXtcbiAgICBpZihvV29yZEdyb3VwLmNhdGVnb3J5ID09PSBcImNhdGVnb3J5XCIpIHtcbiAgICAgIHZhciBzQ2F0ID0gb1dvcmRHcm91cC5tYXRjaGVkU3RyaW5nO1xuICAgICAgdmFyIGRvbXMgPSBNb2RlbC5nZXREb21haW5zRm9yQ2F0ZWdvcnkodGhlTW9kZWwsc0NhdCk7XG4gICAgICBkb21zLmZvckVhY2goZnVuY3Rpb24oc0RvbSkge1xuICAgICAgICBpZihkb21haW5zLmluZGV4T2Yoc0RvbSkgPCAwKSB7XG4gICAgICAgICAgZG9tYWlucy5wdXNoKHNEb20pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuICBpZihkb21haW5zLmxlbmd0aCA9PT0gMSkge1xuICAgICBkZWJ1Z2xvZyhcImdvdCBhIHByZWNpc2UgZG9tYWluIFwiICsgZG9tYWluc1swXSk7XG4gICAgcmV0dXJuIGRvbWFpbnNbMF07XG4gIH1cbiAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IChcImdvdCBtb3JlIHRoYW4gb25lIGRvbWFpbiwgY29uZnVzZWQgIFwiICsgZG9tYWlucy5qb2luKFwiXFxuXCIpKSA6Jy0nKTtcbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn07IiwiLyoqXG4gKlxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuYW5hbHl6ZVxuICogQGZpbGUgYW5hbHl6ZS50c1xuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxuICovXG5cInVzZSBzdHJpY3RcIjtcbnZhciBkZWJ1ZyA9IHJlcXVpcmUoXCJkZWJ1Z1wiKTtcbnZhciBkZWJ1Z2xvZyA9IGRlYnVnKCdsaXN0YWxsJyk7XG52YXIgbG9nZ2VyID0gcmVxdWlyZShcIi4uL3V0aWxzL2xvZ2dlclwiKTtcbnZhciBsb2dQZXJmID0gbG9nZ2VyLnBlcmYoXCJwZXJmbGlzdGFsbFwiKTtcbnZhciBwZXJmbG9nID0gZGVidWcoJ3BlcmYnKTtcbnZhciBCcmVha0Rvd24gPSByZXF1aXJlKFwiLi9icmVha2Rvd25cIik7XG52YXIgT3BlcmF0b3IgPSByZXF1aXJlKFwiLi9vcGVyYXRvclwiKTtcbnZhciBXaGF0SXMgPSByZXF1aXJlKFwiLi93aGF0aXNcIik7XG52YXIgRXJFcnJvciA9IHJlcXVpcmUoXCIuL2VyZXJyb3JcIik7XG52YXIgTW9kZWwgPSByZXF1aXJlKFwiLi4vbW9kZWwvbW9kZWxcIik7XG52YXIgc1dvcmRzID0ge307XG5mdW5jdGlvbiBtYXRjaFJlY29yZEhhdmluZ0NhdGVnb3J5KGNhdGVnb3J5LCByZWNvcmRzKSB7XG4gICAgZGVidWdsb2coZGVidWdsb2cuZW5hYmxlZCA/IEpTT04uc3RyaW5naWZ5KHJlY29yZHMsIHVuZGVmaW5lZCwgMikgOiBcIi1cIik7XG4gICAgdmFyIHJlbGV2YW50UmVjb3JkcyA9IHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgcmV0dXJuIChyZWNvcmRbY2F0ZWdvcnldICE9PSB1bmRlZmluZWQpICYmIChyZWNvcmRbY2F0ZWdvcnldICE9PSBudWxsKTtcbiAgICB9KTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgZGVidWdsb2coXCJyZWxldmFudCByZWNvcmRzIG5yOlwiICsgcmVsZXZhbnRSZWNvcmRzLmxlbmd0aCk7XG4gICAgcmV0dXJuIHJlbGV2YW50UmVjb3Jkcztcbn1cbmV4cG9ydHMubWF0Y2hSZWNvcmRIYXZpbmdDYXRlZ29yeSA9IG1hdGNoUmVjb3JkSGF2aW5nQ2F0ZWdvcnk7XG5mdW5jdGlvbiBhbmFseXplQ29udGV4dFN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKSB7XG4gICAgcmV0dXJuIFdoYXRJcy5hbmFseXplQ29udGV4dFN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHJ1bGVzKTtcbn1cbmV4cG9ydHMuYW5hbHl6ZUNvbnRleHRTdHJpbmcgPSBhbmFseXplQ29udGV4dFN0cmluZztcbi8vIGNvbnN0IHJlc3VsdCA9IFdoYXRJcy5yZXNvbHZlQ2F0ZWdvcnkoY2F0LCBhMS5lbnRpdHksXG4vLyAgIHRoZU1vZGVsLm1SdWxlcywgdGhlTW9kZWwudG9vbHMsIHRoZU1vZGVsLnJlY29yZHMpO1xuZnVuY3Rpb24gbGlzdEFsbFdpdGhDb250ZXh0KGNhdGVnb3J5LCBjb250ZXh0UXVlcnlTdHJpbmcsIGFSdWxlcywgcmVjb3JkcywgY2F0ZWdvcnlTZXQpIHtcbiAgICB2YXIgcmVzID0gbGlzdEFsbFR1cGVsV2l0aENvbnRleHQoW2NhdGVnb3J5XSwgY29udGV4dFF1ZXJ5U3RyaW5nLCBhUnVsZXMsIHJlY29yZHMsIGNhdGVnb3J5U2V0KTtcbiAgICB2YXIgYW5zd2VycyA9IHJlcy50dXBlbGFuc3dlcnMubWFwKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzZW50ZW5jZTogby5zZW50ZW5jZSxcbiAgICAgICAgICAgIHJlY29yZDogby5yZWNvcmQsXG4gICAgICAgICAgICBjYXRlZ29yeTogby5jYXRlZ29yaWVzWzBdLFxuICAgICAgICAgICAgcmVzdWx0OiBvLnJlc3VsdFswXSxcbiAgICAgICAgICAgIF9yYW5raW5nOiBvLl9yYW5raW5nXG4gICAgICAgIH07XG4gICAgfSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2VudGVuY2VzOiByZXMuc2VudGVuY2VzLFxuICAgICAgICBlcnJvcnM6IHJlcy5lcnJvcnMsXG4gICAgICAgIHRva2VuczogcmVzLnRva2VucyxcbiAgICAgICAgYW5zd2VyczogYW5zd2Vyc1xuICAgIH07XG59XG5leHBvcnRzLmxpc3RBbGxXaXRoQ29udGV4dCA9IGxpc3RBbGxXaXRoQ29udGV4dDtcbmZ1bmN0aW9uIGxpc3RBbGxXaXRoQ29udGV4dFhYKGNhdGVnb3J5LCBjb250ZXh0UXVlcnlTdHJpbmcsIGFSdWxlcywgcmVjb3JkcywgY2F0ZWdvcnlTZXQpIHtcbiAgICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYW5zd2VyczogW10sXG4gICAgICAgICAgICBlcnJvcnM6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSxcbiAgICAgICAgICAgIHRva2VuczogW11cbiAgICAgICAgfTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGxvZ1BlcmYoJ2xpc3RBbGxXaXRoQ29udGV4dCcpO1xuICAgICAgICBwZXJmbG9nKFwidG90YWxMaXN0QWxsV2l0aENvbnRleHRcIik7XG4gICAgICAgIHZhciBhU2VudGVuY2VzUmVpbmZvcmNlZCA9IGFuYWx5emVDb250ZXh0U3RyaW5nKGNvbnRleHRRdWVyeVN0cmluZywgYVJ1bGVzKTtcbiAgICAgICAgZGVidWdsb2coXCJsaXN0QWxsV2l0aENvbnRleHQ6bWF0Y2hpbmcgcmVjb3JkcyAocz1cIiArIGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5sZW5ndGggKyBcIikuLi5cIik7XG4gICAgICAgIGRlYnVnbG9nKFwiaGVyZSBzZW50ZW5jZXNcIiArIEpTT04uc3RyaW5naWZ5KGFTZW50ZW5jZXNSZWluZm9yY2VkLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgcGVyZmxvZyhcIm1hdGNoaW5nIHJlY29yZHMgKHM9XCIgKyBhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubGVuZ3RoICsgXCIpLi4uXCIpO1xuICAgICAgICB2YXIgbWF0Y2hlZEFuc3dlcnMgPSBXaGF0SXMubWF0Y2hSZWNvcmRzUXVpY2soYVNlbnRlbmNlc1JlaW5mb3JjZWQsIGNhdGVnb3J5LCByZWNvcmRzLCBjYXRlZ29yeVNldCk7IC8vYVRvb2w6IEFycmF5PElNYXRjaC5JVG9vbD4pOiBhbnkgLyogb2JqZWN0c3RyZWFtKi8ge1xuICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgZGVidWdsb2coXCIgbWF0Y2hlZCBBbnN3ZXJzXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkQW5zd2VycywgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgIH1cbiAgICAgICAgcGVyZmxvZyhcImZpbHRlcmluZyB0b3BSYW5rZWQgKGE9XCIgKyBtYXRjaGVkQW5zd2Vycy5hbnN3ZXJzLmxlbmd0aCArIFwiKS4uLlwiKTtcbiAgICAgICAgdmFyIG1hdGNoZWRGaWx0ZXJlZCA9IFdoYXRJcy5maWx0ZXJPbmx5VG9wUmFua2VkKG1hdGNoZWRBbnN3ZXJzLmFuc3dlcnMpO1xuICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgZGVidWdsb2coXCIgbWF0Y2hlZCB0b3AtcmFua2VkIEFuc3dlcnNcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRGaWx0ZXJlZCwgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgIH1cbiAgICAgICAgcGVyZmxvZyhcInRvdGFsTGlzdEFsbFdpdGhDb250ZXh0IChhPVwiICsgbWF0Y2hlZEZpbHRlcmVkLmxlbmd0aCArIFwiKVwiKTtcbiAgICAgICAgbG9nUGVyZignbGlzdEFsbFdpdGhDb250ZXh0Jyk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhbnN3ZXJzOiBtYXRjaGVkRmlsdGVyZWQsXG4gICAgICAgICAgICBlcnJvcnM6IGFTZW50ZW5jZXNSZWluZm9yY2VkLmVycm9ycyxcbiAgICAgICAgICAgIHRva2VuczogYVNlbnRlbmNlc1JlaW5mb3JjZWQudG9rZW5zXG4gICAgICAgIH07XG4gICAgfVxufVxuZXhwb3J0cy5saXN0QWxsV2l0aENvbnRleHRYWCA9IGxpc3RBbGxXaXRoQ29udGV4dFhYO1xuZnVuY3Rpb24gbGlzdEFsbEhhdmluZ0NvbnRleHQoY2F0ZWdvcnksIGNvbnRleHRRdWVyeVN0cmluZywgYVJ1bGVzLCByZWNvcmRzLCBjYXRlZ29yeVNldCkge1xuICAgIHZhciByZXMgPSBsaXN0QWxsVHVwZWxIYXZpbmdDb250ZXh0KFtjYXRlZ29yeV0sIGNvbnRleHRRdWVyeVN0cmluZywgYVJ1bGVzLCByZWNvcmRzLCBjYXRlZ29yeVNldCk7XG4gICAgdmFyIGFuc3dlcnMgPSByZXMudHVwZWxhbnN3ZXJzLm1hcChmdW5jdGlvbiAobykge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc2VudGVuY2U6IG8uc2VudGVuY2UsXG4gICAgICAgICAgICByZWNvcmQ6IG8ucmVjb3JkLFxuICAgICAgICAgICAgY2F0ZWdvcnk6IG8uY2F0ZWdvcmllc1swXSxcbiAgICAgICAgICAgIHJlc3VsdDogby5yZXN1bHRbMF0sXG4gICAgICAgICAgICBfcmFua2luZzogby5fcmFua2luZ1xuICAgICAgICB9O1xuICAgIH0pO1xuICAgIHJldHVybiB7XG4gICAgICAgIHNlbnRlbmNlczogcmVzLnNlbnRlbmNlcyxcbiAgICAgICAgZXJyb3JzOiByZXMuZXJyb3JzLFxuICAgICAgICB0b2tlbnM6IHJlcy50b2tlbnMsXG4gICAgICAgIGFuc3dlcnM6IGFuc3dlcnNcbiAgICB9O1xufVxuZXhwb3J0cy5saXN0QWxsSGF2aW5nQ29udGV4dCA9IGxpc3RBbGxIYXZpbmdDb250ZXh0O1xuLypcbmV4cG9ydCBmdW5jdGlvbiBsaXN0QWxsSGF2aW5nQ29udGV4dFhYKGNhdGVnb3J5OiBzdHJpbmcsIGNvbnRleHRRdWVyeVN0cmluZzogc3RyaW5nLFxuICBhUnVsZXM6IElNYXRjaC5TcGxpdFJ1bGVzLCByZWNvcmRzOiBBcnJheTxJTWF0Y2guSVJlY29yZD4sXG4gIGNhdGVnb3J5U2V0IDogeyBba2V5OnN0cmluZ10gOiBib29sZWFuIH0pOiBJTWF0Y2guSVByb2Nlc3NlZFdoYXRJc0Fuc3dlcnMge1xuICBpZiAoY29udGV4dFF1ZXJ5U3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcnMgOiBbRXJFcnJvci5tYWtlRXJyb3JfRU1QVFlfSU5QVVQoKV0gLFxuICAgICAgdG9rZW5zIDpbXSxcbiAgICAgIGFuc3dlcnM6W11cbiAgIH07XG4gIH0gZWxzZSB7XG4gICAgcGVyZmxvZyhcImFuYWx5emVDb250ZXh0U3RyaW5nIC4uLlwiKTtcbiAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBhbmFseXplQ29udGV4dFN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIGFSdWxlcyk7XG4gICAgcGVyZmxvZyhcIm1hdGNoaW5nIHJlY29yZHMgaGF2aW5nIChzPVwiICsgKGFTZW50ZW5jZXNSZWluZm9yY2VkLnNlbnRlbmNlcy5sZW5ndGgpICsgXCIpLi4uXCIpO1xuICAgIHZhciBtYXRjaGVkQW5zd2VycyA9IFdoYXRJcy5tYXRjaFJlY29yZHNIYXZpbmdDb250ZXh0KGFTZW50ZW5jZXNSZWluZm9yY2VkLCBjYXRlZ29yeSwgcmVjb3JkcywgY2F0ZWdvcnlTZXQpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8gKiBvYmplY3RzdHJlYW0qIC8ge1xuICAgIGlmKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgIGRlYnVnbG9nKFwiTEFIQyBtYXRjaGVkIEFuc3dlcnNcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRBbnN3ZXJzLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9XG4gICAgcGVyZmxvZyhcImZpbHRlcmluZ1RvcFJhbmtlZCAoYT1cIiArIG1hdGNoZWRBbnN3ZXJzLnNlbnRlbmNlcy5sZW5ndGggKyBcIikuLi5cIik7XG4gICAgbWF0Y2hlZEFuc3dlcnMuYW5zd2VycyA9IFdoYXRJcy5maWx0ZXJPbmx5VG9wUmFua2VkKG1hdGNoZWRBbnN3ZXJzLmFuc3dlcnMpO1xuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICBkZWJ1Z2xvZyhcIiBtYXRjaGVkIHRvcC1yYW5rZWQgQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMuYW5zd2VycywgdW5kZWZpbmVkLCAyKSk7XG4gICAgfVxuICAgIHBlcmZsb2coXCJ0b3RhbExpc3RBbGxIYXZpbmdDb250ZXh0IChhPVwiICsgbWF0Y2hlZEFuc3dlcnMuYW5zd2Vycy5sZW5ndGggKyBcIilcIik7XG4gICAgcmV0dXJuIG1hdGNoZWRBbnN3ZXJzO1xuICB9XG59XG4qL1xuZnVuY3Rpb24gbGlzdEFsbFR1cGVsV2l0aENvbnRleHQoY2F0ZWdvcmllcywgY29udGV4dFF1ZXJ5U3RyaW5nLCBhUnVsZXMsIHJlY29yZHMsIGNhdGVnb3J5U2V0KSB7XG4gICAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR1cGVsYW5zd2VyczogW10sXG4gICAgICAgICAgICBlcnJvcnM6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSxcbiAgICAgICAgICAgIHRva2VuczogW10sXG4gICAgICAgIH07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBsb2dQZXJmKCdsaXN0QWxsV2l0aENvbnRleHQnKTtcbiAgICAgICAgcGVyZmxvZyhcInRvdGFsTGlzdEFsbFdpdGhDb250ZXh0XCIpO1xuICAgICAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBhbmFseXplQ29udGV4dFN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIGFSdWxlcyk7XG4gICAgICAgIHBlcmZsb2coXCJMQVRXQyBtYXRjaGluZyByZWNvcmRzIChzPVwiICsgYVNlbnRlbmNlc1JlaW5mb3JjZWQuc2VudGVuY2VzLmxlbmd0aCArIFwiKS4uLlwiKTtcbiAgICAgICAgdmFyIG1hdGNoZWRBbnN3ZXJzID0gV2hhdElzLm1hdGNoUmVjb3Jkc1F1aWNrTXVsdGlwbGVDYXRlZ29yaWVzKGFTZW50ZW5jZXNSZWluZm9yY2VkLCBjYXRlZ29yaWVzLCByZWNvcmRzLCBjYXRlZ29yeVNldCk7IC8vYVRvb2w6IEFycmF5PElNYXRjaC5JVG9vbD4pOiBhbnkgLyogb2JqZWN0c3RyZWFtKi8ge1xuICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgZGVidWdsb2coXCIgbWF0Y2hlZCBBbnN3ZXJzXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkQW5zd2VycywgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgIH1cbiAgICAgICAgcGVyZmxvZyhcImZpbHRlcmluZyB0b3BSYW5rZWQgKGE9XCIgKyBtYXRjaGVkQW5zd2Vycy50dXBlbGFuc3dlcnMubGVuZ3RoICsgXCIpLi4uXCIpO1xuICAgICAgICB2YXIgbWF0Y2hlZEZpbHRlcmVkID0gV2hhdElzLmZpbHRlck9ubHlUb3BSYW5rZWRUdXBlbChtYXRjaGVkQW5zd2Vycy50dXBlbGFuc3dlcnMpO1xuICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgZGVidWdsb2coXCJMQVRXQyBtYXRjaGVkIHRvcC1yYW5rZWQgQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEZpbHRlcmVkLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgfVxuICAgICAgICBwZXJmbG9nKFwidG90YWxMaXN0QWxsV2l0aENvbnRleHQgKGE9XCIgKyBtYXRjaGVkRmlsdGVyZWQubGVuZ3RoICsgXCIpXCIpO1xuICAgICAgICBsb2dQZXJmKCdsaXN0QWxsV2l0aENvbnRleHQnKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR1cGVsYW5zd2VyczogbWF0Y2hlZEZpbHRlcmVkLFxuICAgICAgICAgICAgZXJyb3JzOiBhU2VudGVuY2VzUmVpbmZvcmNlZC5lcnJvcnMsXG4gICAgICAgICAgICB0b2tlbnM6IGFTZW50ZW5jZXNSZWluZm9yY2VkLnRva2Vuc1xuICAgICAgICB9O1xuICAgIH1cbn1cbmV4cG9ydHMubGlzdEFsbFR1cGVsV2l0aENvbnRleHQgPSBsaXN0QWxsVHVwZWxXaXRoQ29udGV4dDtcbmZ1bmN0aW9uIGxpc3RBbGxUdXBlbEhhdmluZ0NvbnRleHQoY2F0ZWdvcmllcywgY29udGV4dFF1ZXJ5U3RyaW5nLCBhUnVsZXMsIHJlY29yZHMsIGNhdGVnb3J5U2V0KSB7XG4gICAgaWYgKGNvbnRleHRRdWVyeVN0cmluZy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR1cGVsYW5zd2VyczogW10sXG4gICAgICAgICAgICBlcnJvcnM6IFtFckVycm9yLm1ha2VFcnJvcl9FTVBUWV9JTlBVVCgpXSxcbiAgICAgICAgICAgIHRva2VuczogW10sXG4gICAgICAgIH07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBwZXJmbG9nKFwiYW5hbHl6ZUNvbnRleHRTdHJpbmcgLi4uXCIpO1xuICAgICAgICB2YXIgYVNlbnRlbmNlc1JlaW5mb3JjZWQgPSBhbmFseXplQ29udGV4dFN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIGFSdWxlcyk7XG4gICAgICAgIHBlcmZsb2coXCJtYXRjaGluZyByZWNvcmRzIGhhdmluZyAocz1cIiArIChhU2VudGVuY2VzUmVpbmZvcmNlZC5zZW50ZW5jZXMubGVuZ3RoKSArIFwiKS4uLlwiKTtcbiAgICAgICAgdmFyIG1hdGNoZWRBbnN3ZXJzID0gV2hhdElzLm1hdGNoUmVjb3Jkc1R1cGVsSGF2aW5nQ29udGV4dChhU2VudGVuY2VzUmVpbmZvcmNlZCwgY2F0ZWdvcmllcywgcmVjb3JkcywgY2F0ZWdvcnlTZXQpOyAvL2FUb29sOiBBcnJheTxJTWF0Y2guSVRvb2w+KTogYW55IC8qIG9iamVjdHN0cmVhbSovIHtcbiAgICAgICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgICAgIGRlYnVnbG9nKFwiIG1hdGNoZWQgQW5zd2Vyc1wiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZEFuc3dlcnMsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgICB9XG4gICAgICAgIHBlcmZsb2coXCJmaWx0ZXJpbmdUb3BSYW5rZWQgKGE9XCIgKyBtYXRjaGVkQW5zd2Vycy50dXBlbGFuc3dlcnMubGVuZ3RoICsgXCIpLi4uXCIpO1xuICAgICAgICB2YXIgbWF0Y2hlZEZpbHRlcmVkID0gV2hhdElzLmZpbHRlck9ubHlUb3BSYW5rZWRUdXBlbChtYXRjaGVkQW5zd2Vycy50dXBlbGFuc3dlcnMpO1xuICAgICAgICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xuICAgICAgICAgICAgZGVidWdsb2coXCIgbWF0Y2hlZCB0b3AtcmFua2VkIEFuc3dlcnNcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWRGaWx0ZXJlZCwgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgIH1cbiAgICAgICAgcGVyZmxvZyhcInRvdGFsTGlzdEFsbEhhdmluZ0NvbnRleHQgKGE9XCIgKyBtYXRjaGVkRmlsdGVyZWQubGVuZ3RoICsgXCIpXCIpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHVwZWxhbnN3ZXJzOiBtYXRjaGVkRmlsdGVyZWQsXG4gICAgICAgICAgICBlcnJvcnM6IGFTZW50ZW5jZXNSZWluZm9yY2VkLmVycm9ycyxcbiAgICAgICAgICAgIHRva2VuczogYVNlbnRlbmNlc1JlaW5mb3JjZWQudG9rZW5zXG4gICAgICAgIH07XG4gICAgfVxufVxuZXhwb3J0cy5saXN0QWxsVHVwZWxIYXZpbmdDb250ZXh0ID0gbGlzdEFsbFR1cGVsSGF2aW5nQ29udGV4dDtcbmZ1bmN0aW9uIGZpbHRlclN0cmluZ0xpc3RCeU9wKG9wZXJhdG9yLCBmcmFnbWVudCwgc3JjYXJyKSB7XG4gICAgdmFyIGZyYWdtZW50TEMgPSBCcmVha0Rvd24udHJpbVF1b3RlZFNwYWNlZChmcmFnbWVudC50b0xvd2VyQ2FzZSgpKTtcbiAgICByZXR1cm4gc3JjYXJyLmZpbHRlcihmdW5jdGlvbiAoc3RyKSB7XG4gICAgICAgIHJldHVybiBPcGVyYXRvci5tYXRjaGVzKG9wZXJhdG9yLCBmcmFnbWVudExDLCBzdHIudG9Mb3dlckNhc2UoKSk7XG4gICAgfSkuc29ydCgpO1xufVxuZXhwb3J0cy5maWx0ZXJTdHJpbmdMaXN0QnlPcCA9IGZpbHRlclN0cmluZ0xpc3RCeU9wO1xuZnVuY3Rpb24gY29tcGFyZUNhc2VJbnNlbnNpdGl2ZShhLCBiKSB7XG4gICAgdmFyIHIgPSBhLnRvTG93ZXJDYXNlKCkubG9jYWxlQ29tcGFyZShiLnRvTG93ZXJDYXNlKCkpO1xuICAgIGlmIChyKSB7XG4gICAgICAgIHJldHVybiByO1xuICAgIH1cbiAgICByZXR1cm4gLWEubG9jYWxlQ29tcGFyZShiKTtcbn1cbi8qKlxuICogU29ydCBzdHJpbmcgbGlzdCBjYXNlIGluc2Vuc2l0aXZlLCB0aGVuIHJlbW92ZSBkdXBsaWNhdGVzIHJldGFpbmluZ1xuICogXCJsYXJnZXN0XCIgbWF0Y2hcbiAqL1xuZnVuY3Rpb24gcmVtb3ZlQ2FzZUR1cGxpY2F0ZXMoYXJyKSB7XG4gICAgYXJyLnNvcnQoY29tcGFyZUNhc2VJbnNlbnNpdGl2ZSk7XG4gICAgZGVidWdsb2coJ3NvcnRlZCBhcnInICsgSlNPTi5zdHJpbmdpZnkoYXJyKSk7XG4gICAgcmV0dXJuIGFyci5maWx0ZXIoZnVuY3Rpb24gKHMsIGluZGV4KSB7XG4gICAgICAgIHJldHVybiBpbmRleCA9PT0gMCB8fCAoMCAhPT0gYXJyW2luZGV4IC0gMV0udG9Mb3dlckNhc2UoKS5sb2NhbGVDb21wYXJlKHMudG9Mb3dlckNhc2UoKSkpO1xuICAgIH0pO1xufVxuZXhwb3J0cy5yZW1vdmVDYXNlRHVwbGljYXRlcyA9IHJlbW92ZUNhc2VEdXBsaWNhdGVzO1xuO1xuZnVuY3Rpb24gZ2V0Q2F0ZWdvcnlPcEZpbHRlckFzRGlzdGluY3RTdHJpbmdzKG9wZXJhdG9yLCBmcmFnbWVudCwgY2F0ZWdvcnksIHJlY29yZHMsIGZpbHRlckRvbWFpbikge1xuICAgIHZhciBmcmFnbWVudExDID0gQnJlYWtEb3duLnRyaW1RdW90ZWQoZnJhZ21lbnQudG9Mb3dlckNhc2UoKSk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIHZhciBzZWVuID0ge307XG4gICAgcmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgaWYgKGZpbHRlckRvbWFpbiAmJiByZWNvcmRbJ19kb21haW4nXSAhPT0gZmlsdGVyRG9tYWluKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlY29yZFtjYXRlZ29yeV0gJiYgT3BlcmF0b3IubWF0Y2hlcyhvcGVyYXRvciwgZnJhZ21lbnRMQywgcmVjb3JkW2NhdGVnb3J5XS50b0xvd2VyQ2FzZSgpKSkge1xuICAgICAgICAgICAgaWYgKCFzZWVuW3JlY29yZFtjYXRlZ29yeV1dKSB7XG4gICAgICAgICAgICAgICAgc2VlbltyZWNvcmRbY2F0ZWdvcnldXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmVzLnB1c2gocmVjb3JkW2NhdGVnb3J5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVtb3ZlQ2FzZUR1cGxpY2F0ZXMocmVzKTtcbn1cbmV4cG9ydHMuZ2V0Q2F0ZWdvcnlPcEZpbHRlckFzRGlzdGluY3RTdHJpbmdzID0gZ2V0Q2F0ZWdvcnlPcEZpbHRlckFzRGlzdGluY3RTdHJpbmdzO1xuO1xuZnVuY3Rpb24gbGlrZWx5UGx1cmFsRGlmZihhLCBwbHVyYWxPZmEpIHtcbiAgICB2YXIgYUxDID0gQnJlYWtEb3duLnRyaW1RdW90ZWQoYS50b0xvd2VyQ2FzZSgpKSB8fCBcIlwiO1xuICAgIHZhciBwbHVyYWxPZkFMQyA9IEJyZWFrRG93bi50cmltUXVvdGVkKChwbHVyYWxPZmEgfHwgXCJcIikudG9Mb3dlckNhc2UoKSkgfHwgXCJcIjtcbiAgICBpZiAoYUxDID09PSBwbHVyYWxPZkFMQykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGFMQyArICdzJyA9PT0gcGx1cmFsT2ZBTEMpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn1cbmV4cG9ydHMubGlrZWx5UGx1cmFsRGlmZiA9IGxpa2VseVBsdXJhbERpZmY7XG47XG5mdW5jdGlvbiBsaXN0QWxsV2l0aENhdGVnb3J5KGNhdGVnb3J5LCByZWNvcmRzKSB7XG4gICAgdmFyIG1hdGNoZWRBbnN3ZXJzID0gbWF0Y2hSZWNvcmRIYXZpbmdDYXRlZ29yeShjYXRlZ29yeSwgcmVjb3Jkcyk7IC8vYVRvb2w6IEFycmF5PElNYXRjaC5JVG9vbD4pOiBhbnkgLyogb2JqZWN0c3RyZWFtKi8ge1xuICAgIGRlYnVnbG9nKFwiIGxpc3RBbGxXaXRoQ2F0ZWdvcnk6XCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkQW5zd2VycywgdW5kZWZpbmVkLCAyKSk7XG4gICAgcmV0dXJuIG1hdGNoZWRBbnN3ZXJzO1xufVxuZXhwb3J0cy5saXN0QWxsV2l0aENhdGVnb3J5ID0gbGlzdEFsbFdpdGhDYXRlZ29yeTtcbmZ1bmN0aW9uIGpvaW5Tb3J0ZWRRdW90ZWQoc3RyaW5ncykge1xuICAgIGlmIChzdHJpbmdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gXCJcIjtcbiAgICB9XG4gICAgcmV0dXJuICdcIicgKyBzdHJpbmdzLnNvcnQoKS5qb2luKCdcIjsgXCInKSArICdcIic7XG59XG5leHBvcnRzLmpvaW5Tb3J0ZWRRdW90ZWQgPSBqb2luU29ydGVkUXVvdGVkO1xuZnVuY3Rpb24gam9pbkRpc3RpbmN0KGNhdGVnb3J5LCByZWNvcmRzKSB7XG4gICAgdmFyIHJlcyA9IHJlY29yZHMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBvUmVjb3JkKSB7XG4gICAgICAgIHByZXZbb1JlY29yZFtjYXRlZ29yeV1dID0gMTtcbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwge30pO1xuICAgIHJldHVybiBqb2luU29ydGVkUXVvdGVkKE9iamVjdC5rZXlzKHJlcykpO1xufVxuZXhwb3J0cy5qb2luRGlzdGluY3QgPSBqb2luRGlzdGluY3Q7XG5mdW5jdGlvbiBmb3JtYXREaXN0aW5jdEZyb21XaGF0SWZSZXN1bHQoYW5zd2Vycykge1xuICAgIHJldHVybiBqb2luU29ydGVkUXVvdGVkKGFuc3dlcnMubWFwKGZ1bmN0aW9uIChvQW5zd2VyKSB7XG4gICAgICAgIHJldHVybiBvQW5zd2VyLnJlc3VsdDtcbiAgICB9KSk7XG59XG5leHBvcnRzLmZvcm1hdERpc3RpbmN0RnJvbVdoYXRJZlJlc3VsdCA9IGZvcm1hdERpc3RpbmN0RnJvbVdoYXRJZlJlc3VsdDtcbmZ1bmN0aW9uIGpvaW5SZXN1bHRzKHJlc3VsdHMpIHtcbiAgICB2YXIgcmVzID0gW107XG4gICAgdmFyIGNudCA9IHJlc3VsdHMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCByZXN1bHQpIHtcbiAgICAgICAgaWYgKHJlc3VsdC5fcmFua2luZyA9PT0gcmVzdWx0c1swXS5fcmFua2luZykge1xuICAgICAgICAgICAgaWYgKHJlcy5pbmRleE9mKHJlc3VsdC5yZXN1bHQpIDwgMCkge1xuICAgICAgICAgICAgICAgIHJlcy5wdXNoKHJlc3VsdC5yZXN1bHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByZXYgKyAxO1xuICAgICAgICB9XG4gICAgfSwgMCk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuam9pblJlc3VsdHMgPSBqb2luUmVzdWx0cztcbnZhciBVdGlscyA9IHJlcXVpcmUoXCIuLi91dGlscy91dGlsc1wiKTtcbmZ1bmN0aW9uIGpvaW5SZXN1bHRzVHVwZWwocmVzdWx0cykge1xuICAgIHZhciByZXMgPSBbXTtcbiAgICB2YXIgY250ID0gcmVzdWx0cy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHJlc3VsdCkge1xuICAgICAgICBpZiAocmVzdWx0Ll9yYW5raW5nID09PSByZXN1bHRzWzBdLl9yYW5raW5nKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBVdGlscy5saXN0VG9RdW90ZWRDb21tYUFuZChyZXN1bHQucmVzdWx0KTtcbiAgICAgICAgICAgIGlmIChyZXMuaW5kZXhPZih2YWx1ZSkgPCAwKSB7XG4gICAgICAgICAgICAgICAgcmVzLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHByZXYgKyAxO1xuICAgICAgICB9XG4gICAgfSwgMCk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuam9pblJlc3VsdHNUdXBlbCA9IGpvaW5SZXN1bHRzVHVwZWw7XG5mdW5jdGlvbiBpbmZlckRvbWFpbih0aGVNb2RlbCwgY29udGV4dFF1ZXJ5U3RyaW5nKSB7XG4gICAgLy8gY29uc29sZS5sb2coXCJoZXJlIHRoZSBzdHJpbmdcIiArIGNvbnRleHRRdWVyeVN0cmluZyk7XG4gICAgLy8gIGNvbnNvbGUubG9nKFwiaGVyZSB0aGUgcnVsZXNcIiArIEpTT04uc3RyaW5naWZ5KHRoZU1vZGVsLm1SdWxlcykpO1xuICAgIHZhciByZXMgPSBhbmFseXplQ29udGV4dFN0cmluZyhjb250ZXh0UXVlcnlTdHJpbmcsIHRoZU1vZGVsLnJ1bGVzKTtcbiAgICAvL2NvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHJlcyx1bmRlZmluZWQsMikpO1xuICAgIC8vIHJ1biB0aHJvdWdoIHRoZSBzdHJpbmcsIHNlYXJjaCBmb3IgYSBjYXRlZ29yeVxuICAgIGlmICghcmVzLnNlbnRlbmNlcy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIGRvbWFpbnMgPSBbXTtcbiAgICAvL2NvbnNvbGUubG9nKFNlbnRlbmNlLmR1bXBOaWNlQXJyKHJlcykpO1xuICAgIC8vIGRvIHdlIGhhdmUgYSBkb21haW4gP1xuICAgIHJlcy5zZW50ZW5jZXNbMF0uZm9yRWFjaChmdW5jdGlvbiAob1dvcmRHcm91cCkge1xuICAgICAgICBpZiAob1dvcmRHcm91cC5jYXRlZ29yeSA9PT0gXCJkb21haW5cIikge1xuICAgICAgICAgICAgZG9tYWlucy5wdXNoKG9Xb3JkR3JvdXAubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoZG9tYWlucy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgZGVidWdsb2coXCJnb3QgYSBwcmVjaXNlIGRvbWFpbiBcIiArIGRvbWFpbnNbMF0pO1xuICAgICAgICByZXR1cm4gZG9tYWluc1swXTtcbiAgICB9XG4gICAgaWYgKGRvbWFpbnMubGVuZ3RoID4gMCkge1xuICAgICAgICBkZWJ1Z2xvZyhkZWJ1Z2xvZy5lbmFibGVkID8gKFwiZ290IG1vcmUgdGhhbiBvbmUgZG9tYWluLCBjb25mdXNlZCAgXCIgKyBkb21haW5zLmpvaW4oXCJcXG5cIikpIDogJy0nKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZGVidWdsb2coXCJhdHRlbXB0aW5nIHRvIGRldGVybWluZSBjYXRlZ29yaWVzXCIpO1xuICAgIC8vIHRyeSBhIGNhdGVnb3J5IHJldmVyc2UgbWFwXG4gICAgcmVzLnNlbnRlbmNlc1swXS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZEdyb3VwKSB7XG4gICAgICAgIGlmIChvV29yZEdyb3VwLmNhdGVnb3J5ID09PSBcImNhdGVnb3J5XCIpIHtcbiAgICAgICAgICAgIHZhciBzQ2F0ID0gb1dvcmRHcm91cC5tYXRjaGVkU3RyaW5nO1xuICAgICAgICAgICAgdmFyIGRvbXMgPSBNb2RlbC5nZXREb21haW5zRm9yQ2F0ZWdvcnkodGhlTW9kZWwsIHNDYXQpO1xuICAgICAgICAgICAgZG9tcy5mb3JFYWNoKGZ1bmN0aW9uIChzRG9tKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRvbWFpbnMuaW5kZXhPZihzRG9tKSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZG9tYWlucy5wdXNoKHNEb20pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgaWYgKGRvbWFpbnMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiZ290IGEgcHJlY2lzZSBkb21haW4gXCIgKyBkb21haW5zWzBdKTtcbiAgICAgICAgcmV0dXJuIGRvbWFpbnNbMF07XG4gICAgfVxuICAgIGRlYnVnbG9nKGRlYnVnbG9nLmVuYWJsZWQgPyAoXCJnb3QgbW9yZSB0aGFuIG9uZSBkb21haW4sIGNvbmZ1c2VkICBcIiArIGRvbWFpbnMuam9pbihcIlxcblwiKSkgOiAnLScpO1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5leHBvcnRzLmluZmVyRG9tYWluID0gaW5mZXJEb21haW47XG47XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
