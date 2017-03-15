/**
 *
 * @module jfseb.fdevstart.explain
 * @file explain.ts
 * @copyright (c) 2016 Gerd Forstmann
 *
 * Functions dealing with explaining facts, categories etc.
 */
"use strict";

var Algol = require("./algol");
var debug = require("debug");
var debuglog = debug('describe');
var logger = require("../utils/logger");
var logPerf = logger.perf("perflistall");
var perflog = debug('perf');
var abot_erbase_1 = require("abot_erbase");
var WhatIs = require("./whatis");
var fdevsta_monmove_1 = require("fdevsta_monmove");
var Utils = require("abot_utils");
var sWords = {};
function isSynonymFor(exactWord, sloppyWord, theModel) {
    // TODO: use model synonyms
    return sloppyWord === "name" && exactWord === "element name";
}
exports.isSynonymFor = isSynonymFor;
function sloppyOrExact(exactWord, sloppyWord, theModel) {
    if (exactWord.toLowerCase() === sloppyWord.toLowerCase()) {
        return '"' + sloppyWord + '"';
    }
    // TODO, find plural s etc.
    // still exact,
    //
    if (isSynonymFor(exactWord, sloppyWord, theModel)) {
        return '"' + sloppyWord + '" (interpreted as synonym for "' + exactWord + '")';
    }
    //todo, find is synonymfor ...
    // TODO, a synonym for ...
    return '"' + sloppyWord + '" (interpreted as "' + exactWord + '")';
}
exports.sloppyOrExact = sloppyOrExact;
function countRecordPresence(category, domain, theModel) {
    var res = { totalrecords: 0,
        presentrecords: 0,
        values: {},
        multivalued: false
    };
    theModel.records.forEach(function (record) {
        //debuglog(JSON.stringify(record,undefined,2));
        if (record._domain !== domain) {
            return;
        }
        res.totalrecords++;
        var val = record[category];
        var valarr = [val];
        if (Array.isArray(val)) {
            res.multivalued = true;
            valarr = val;
        }
        // todo wrap arr
        if (val !== undefined && val !== "n/a") {
            res.presentrecords++;
        }
        valarr.forEach(function (val) {
            res.values[val] = (res.values[val] || 0) + 1;
        });
    });
    return res;
}
exports.countRecordPresence = countRecordPresence;
function countRecordPresenceFact(fact, category, domain, theModel) {
    var res = { totalrecords: 0,
        presentrecords: 0,
        values: {},
        multivalued: false
    };
    theModel.records.forEach(function (record) {
        //debuglog(JSON.stringify(record,undefined,2));
        if (record._domain !== domain) {
            return;
        }
        res.totalrecords++;
        var val = record[category];
        var valarr = [val];
        if (Array.isArray(val)) {
            if (val.indexOf(fact) >= 0) {
                res.multivalued = true;
                valarr = val;
                res.presentrecords++;
            }
        } else if (val === fact) {
            res.presentrecords++;
        }
    });
    return res;
}
exports.countRecordPresenceFact = countRecordPresenceFact;
function makeValuesListString(realvalues) {
    var valuesString = "";
    var totallen = 0;
    var listValues = realvalues.filter(function (val, index) {
        totallen = totallen + val.length;
        return index < Algol.DescribeValueListMinCountValueList || totallen < Algol.DescribeValueListLengthCharLimit;
    });
    if (listValues.length === 1 && realvalues.length === 1) {
        return 'The sole value is \"' + listValues[0] + '"';
    }
    var maxlen = listValues.reduce(function (prev, val) {
        return Math.max(prev, val.length);
    }, 0);
    if (maxlen > 30) {
        return "Possible values are ...\n" + listValues.reduce(function (prev, val, index) {
            return prev + "(" + (index + 1) + '): "' + val + '"\n';
        }, "") + (listValues.length === realvalues.length ? "" : "...");
    }
    var list = "";
    if (listValues.length === realvalues.length) {
        list = Utils.listToQuotedCommaOr(listValues);
    } else {
        list = '"' + listValues.join('", "') + '"';
    }
    return "Possible values are ...\n" + list + (listValues.length === realvalues.length ? "" : " ...");
}
exports.makeValuesListString = makeValuesListString;
function toPercent(a, b) {
    return "" + (100 * a / b).toFixed(1);
}
exports.toPercent = toPercent;
;
function getCategoryStatsInDomain(category, filterdomain, theModel) {
    var recordCount = countRecordPresence(category, filterdomain, theModel);
    debuglog(JSON.stringify(theModel.records.filter(function (a) {
        return a._domain === "Cosmos";
    }), undefined, 2));
    var percent = toPercent(recordCount.presentrecords, recordCount.totalrecords);
    debuglog(JSON.stringify(recordCount.values));
    var allValues = Object.keys(recordCount.values);
    var realvalues = allValues.filter(function (value) {
        return value !== 'undefined' && value !== 'n/a';
    });
    debuglog;
    realvalues.sort();
    var undefNaDelta = allValues.length - realvalues.length;
    var delta = undefNaDelta ? "(+" + undefNaDelta + ")" : "";
    var distinct = '' + realvalues.length;
    var valuesList = makeValuesListString(realvalues);
    return {
        categoryDesc: theModel.full.domain[filterdomain].categories[category],
        distinct: distinct,
        delta: delta,
        presentRecords: recordCount.presentrecords,
        percPresent: percent,
        sampleValues: valuesList
    };
}
exports.getCategoryStatsInDomain = getCategoryStatsInDomain;
function describeCategoryInDomain(category, filterdomain, theModel) {
    /*  const recordCount = countRecordPresence(category, filterdomain, theModel);
      debuglog(JSON.stringify(theModel.records.filter(a => a._domain === "Cosmos"),undefined,2));
      const percent = toPercent(recordCount.presentrecords , recordCount.totalrecords);
      debuglog(JSON.stringify(recordCount.values));
      var allValues =Object.keys(recordCount.values);
      var realvalues = allValues.filter(value => (value !== 'undefined') && (value !== 'n/a'));
      debuglog
      realvalues.sort();
      var undefNaDelta =  (allValues.length - realvalues.length);
      var delta =  (undefNaDelta) ?  "(+" + undefNaDelta + ")" : "";
      const distinct = '' + realvalues.length;
    
      const valuesList = makeValuesListString(realvalues);
    */
    var stats = getCategoryStatsInDomain(category, filterdomain, theModel);
    var res = 'is a category in domain "' + filterdomain + '"\n' + ("It is present in " + stats.presentRecords + " (" + stats.percPresent + "%) of records in this domain,\n") + ("having " + (stats.distinct + '') + stats.delta + " distinct values.\n") + stats.sampleValues;
    var desc = theModel.full.domain[filterdomain].categories[category] || {};
    var description = desc.description || "";
    if (description) {
        res += "\nDescription: " + description;
    }
    return res;
}
exports.describeCategoryInDomain = describeCategoryInDomain;
function findRecordsWithFact(matchedString, category, records, domains) {
    return records.filter(function (record) {
        var res = record[category] === matchedString;
        if (res) {
            increment(domains, records._domain);
        }
        return res;
    });
}
exports.findRecordsWithFact = findRecordsWithFact;
function increment(map, key) {
    map[key] = (map[key] || 0) + 1;
}
exports.increment = increment;
function sortedKeys(map) {
    var r = Object.keys(map);
    r.sort();
    return r;
}
function describeDomain(fact, domain, theModel) {
    var count = theModel.records.reduce(function (prev, record) {
        return prev + (record._domain === domain ? 1 : 0);
    }, 0);
    var catcount = fdevsta_monmove_1.Model.getCategoriesForDomain(theModel, domain).length;
    var res = sloppyOrExact(domain, fact, theModel) + ("is a domain with " + catcount + " categories and " + count + " records\n");
    var desc = theModel.full.domain[domain].description || "";
    if (desc) {
        res += "Description:" + desc + "\n";
    }
    return res;
}
exports.describeDomain = describeDomain;
function describeFactInDomain(fact, filterdomain, theModel) {
    var sentences = WhatIs.analyzeContextString(fact, theModel.rules);
    //console.log("here sentences " + JSON.stringify(sentences));
    var lengthOneSentences = sentences.sentences.filter(function (oSentence) {
        return oSentence.length === 1;
    });
    var res = '';
    // remove categories and domains
    var onlyFacts = lengthOneSentences.filter(function (oSentence) {
        debuglog(JSON.stringify(oSentence[0]));
        return !abot_erbase_1.Word.Word.isDomain(oSentence[0]) && !abot_erbase_1.Word.Word.isFiller(oSentence[0]) && !abot_erbase_1.Word.Word.isCategory(oSentence[0]);
    });
    var onlyDomains = lengthOneSentences.filter(function (oSentence) {
        return abot_erbase_1.Word.Word.isDomain(oSentence[0]);
    });
    if (onlyDomains && onlyDomains.length > 0) {
        debuglog(JSON.stringify(onlyDomains));
        onlyDomains.forEach(function (sentence) {
            var domain = sentence[0].matchedString;
            if (!filterdomain || domain === filterdomain) {
                debuglog("here match " + JSON.stringify(sentence));
                res += describeDomain(fact, sentence[0].matchedString, theModel);
            }
        });
    }
    debuglog("only facts: " + JSON.stringify(onlyFacts));
    var recordMap = {};
    var domainsMap = {};
    var matchedwordMap = {};
    var matchedCategoryMap = {};
    // look for all records
    onlyFacts.forEach(function (oSentence) {
        return oSentence.forEach(function (oWord) {
            increment(matchedwordMap, oWord.matchedString);
            increment(matchedCategoryMap, oWord.category);
        });
    });
    // we have:
    // a list of categories,
    // a list of matchedWords  ->
    //
    var categories = sortedKeys(matchedCategoryMap);
    var matchedwords = sortedKeys(matchedwordMap);
    debuglog("matchedwords: " + JSON.stringify(matchedwords));
    debuglog("categories: " + JSON.stringify(categories));
    //var allMatchedWords = { [key : string] : number };
    var domainRecordCount = {};
    var domainMatchCatCount = {};
    // we prepare the following structure
    //
    // {domain} : recordcount;
    // {matchedwords} :
    // {domain} {matchedword} {category} presencecount
    theModel.records.forEach(function (record) {
        if (!filterdomain || record._domain === filterdomain) {
            domainRecordCount[record._domain] = (domainRecordCount[record._domain] || 0) + 1;
            matchedwords.forEach(function (matchedword) {
                return categories.forEach(function (category) {
                    if (record[category] === matchedword) {
                        var md = domainMatchCatCount[record._domain] = domainMatchCatCount[record._domain] || {};
                        var mdc = md[matchedword] = md[matchedword] || {};
                        increment(mdc, category);
                    }
                    ;
                });
            });
        }
    });
    debuglog(JSON.stringify(domainMatchCatCount, undefined, 2));
    debuglog(JSON.stringify(domainRecordCount, undefined, 2));
    var domains = sortedKeys(domainMatchCatCount);
    var resNext = '"' + fact + '" has a meaning in ';
    var single = false;
    if (Object.keys(domainMatchCatCount).length > 1) {
        resNext += '' + domains.length + ' domains: ' + Utils.listToQuotedCommaAnd(domains) + "";
    } else if (domains.length === 1) {
        if (!filterdomain) {
            resNext += "one ";
        }
        resNext += "domain \"" + domains[0] + "\":";
        single = true;
    } else {
        if (res) {
            return res;
        }
        var factclean = Utils.stripQuotes(fact);
        if (filterdomain) {
            return "\"" + factclean + "\" is no known fact in domain \"" + filterdomain + "\".\n";
        }
        return "I don't know anything about \"" + factclean + "\".\n";
    }
    res += resNext + "\n"; // ...\n";
    domains.forEach(function (domain) {
        var md = domainMatchCatCount[domain];
        Object.keys(md).forEach(function (matchedstring) {
            var mdc = md[matchedstring];
            if (!single) {
                res += 'in domain "' + domain + '" ';
            }
            var catsingle = Object.keys(mdc).length === 1;
            res += sloppyOrExact(matchedstring, fact, theModel) + " ";
            if (!catsingle) {
                res += "...\n";
            }
            Object.keys(mdc).forEach(function (category) {
                var percent = toPercent(mdc[category], domainRecordCount[domain]);
                res += "is a value for category \"" + category + "\" present in " + mdc[category] + "(" + percent + "%) of records;\n";
            });
        });
    });
    return res;
}
exports.describeFactInDomain = describeFactInDomain;
function describeCategory(category, filterDomain, model, message) {
    var res = [];
    var doms = fdevsta_monmove_1.Model.getDomainsForCategory(model, category);
    if (filterDomain) {
        if (doms.indexOf(filterDomain) >= 0) {
            res.push(describeCategoryInDomain(category, filterDomain, model));
            return res;
        } else {
            return [];
        }
    }
    doms.sort();
    doms.forEach(function (domain) {
        res.push(describeCategoryInDomain(category, domain, model));
    });
    return res;
}
exports.describeCategory = describeCategory;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9kZXNjcmliZS50cyIsIm1hdGNoL2Rlc2NyaWJlLmpzIl0sIm5hbWVzIjpbIkFsZ29sIiwicmVxdWlyZSIsImRlYnVnIiwiZGVidWdsb2ciLCJsb2dnZXIiLCJsb2dQZXJmIiwicGVyZiIsInBlcmZsb2ciLCJhYm90X2VyYmFzZV8xIiwiV2hhdElzIiwiZmRldnN0YV9tb25tb3ZlXzEiLCJVdGlscyIsInNXb3JkcyIsImlzU3lub255bUZvciIsImV4YWN0V29yZCIsInNsb3BweVdvcmQiLCJ0aGVNb2RlbCIsImV4cG9ydHMiLCJzbG9wcHlPckV4YWN0IiwidG9Mb3dlckNhc2UiLCJjb3VudFJlY29yZFByZXNlbmNlIiwiY2F0ZWdvcnkiLCJkb21haW4iLCJyZXMiLCJ0b3RhbHJlY29yZHMiLCJwcmVzZW50cmVjb3JkcyIsInZhbHVlcyIsIm11bHRpdmFsdWVkIiwicmVjb3JkcyIsImZvckVhY2giLCJyZWNvcmQiLCJfZG9tYWluIiwidmFsIiwidmFsYXJyIiwiQXJyYXkiLCJpc0FycmF5IiwidW5kZWZpbmVkIiwiY291bnRSZWNvcmRQcmVzZW5jZUZhY3QiLCJmYWN0IiwiaW5kZXhPZiIsIm1ha2VWYWx1ZXNMaXN0U3RyaW5nIiwicmVhbHZhbHVlcyIsInZhbHVlc1N0cmluZyIsInRvdGFsbGVuIiwibGlzdFZhbHVlcyIsImZpbHRlciIsImluZGV4IiwibGVuZ3RoIiwiRGVzY3JpYmVWYWx1ZUxpc3RNaW5Db3VudFZhbHVlTGlzdCIsIkRlc2NyaWJlVmFsdWVMaXN0TGVuZ3RoQ2hhckxpbWl0IiwibWF4bGVuIiwicmVkdWNlIiwicHJldiIsIk1hdGgiLCJtYXgiLCJsaXN0IiwibGlzdFRvUXVvdGVkQ29tbWFPciIsImpvaW4iLCJ0b1BlcmNlbnQiLCJhIiwiYiIsInRvRml4ZWQiLCJnZXRDYXRlZ29yeVN0YXRzSW5Eb21haW4iLCJmaWx0ZXJkb21haW4iLCJyZWNvcmRDb3VudCIsIkpTT04iLCJzdHJpbmdpZnkiLCJwZXJjZW50IiwiYWxsVmFsdWVzIiwiT2JqZWN0Iiwia2V5cyIsInZhbHVlIiwic29ydCIsInVuZGVmTmFEZWx0YSIsImRlbHRhIiwiZGlzdGluY3QiLCJ2YWx1ZXNMaXN0IiwiY2F0ZWdvcnlEZXNjIiwiZnVsbCIsImNhdGVnb3JpZXMiLCJwcmVzZW50UmVjb3JkcyIsInBlcmNQcmVzZW50Iiwic2FtcGxlVmFsdWVzIiwiZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluIiwic3RhdHMiLCJkZXNjIiwiZGVzY3JpcHRpb24iLCJmaW5kUmVjb3Jkc1dpdGhGYWN0IiwibWF0Y2hlZFN0cmluZyIsImRvbWFpbnMiLCJpbmNyZW1lbnQiLCJtYXAiLCJrZXkiLCJzb3J0ZWRLZXlzIiwiciIsImRlc2NyaWJlRG9tYWluIiwiY291bnQiLCJjYXRjb3VudCIsIk1vZGVsIiwiZ2V0Q2F0ZWdvcmllc0ZvckRvbWFpbiIsImRlc2NyaWJlRmFjdEluRG9tYWluIiwic2VudGVuY2VzIiwiYW5hbHl6ZUNvbnRleHRTdHJpbmciLCJydWxlcyIsImxlbmd0aE9uZVNlbnRlbmNlcyIsIm9TZW50ZW5jZSIsIm9ubHlGYWN0cyIsIldvcmQiLCJpc0RvbWFpbiIsImlzRmlsbGVyIiwiaXNDYXRlZ29yeSIsIm9ubHlEb21haW5zIiwic2VudGVuY2UiLCJyZWNvcmRNYXAiLCJkb21haW5zTWFwIiwibWF0Y2hlZHdvcmRNYXAiLCJtYXRjaGVkQ2F0ZWdvcnlNYXAiLCJvV29yZCIsIm1hdGNoZWR3b3JkcyIsImRvbWFpblJlY29yZENvdW50IiwiZG9tYWluTWF0Y2hDYXRDb3VudCIsIm1hdGNoZWR3b3JkIiwibWQiLCJtZGMiLCJyZXNOZXh0Iiwic2luZ2xlIiwibGlzdFRvUXVvdGVkQ29tbWFBbmQiLCJmYWN0Y2xlYW4iLCJzdHJpcFF1b3RlcyIsIm1hdGNoZWRzdHJpbmciLCJjYXRzaW5nbGUiLCJkZXNjcmliZUNhdGVnb3J5IiwiZmlsdGVyRG9tYWluIiwibW9kZWwiLCJtZXNzYWdlIiwiZG9tcyIsImdldERvbWFpbnNGb3JDYXRlZ29yeSIsInB1c2gi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QUFlO0FBQ3RCQyxZQUFJa0gsSUFBSixDQUFTdEQseUJBQXlCOUQsUUFBekIsRUFBbUNDLE1BQW5DLEVBQTJDK0csS0FBM0MsQ0FBVDtBQUNMLEtBRkQ7QUFHQSxXQUFPOUcsR0FBUDtBQUNEO0FBaEJETixRQUFBa0gsZ0JBQUEsR0FBQUEsZ0JBQUEiLCJmaWxlIjoibWF0Y2gvZGVzY3JpYmUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5leHBsYWluXG4gKiBAZmlsZSBleHBsYWluLnRzXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXG4gKlxuICogRnVuY3Rpb25zIGRlYWxpbmcgd2l0aCBleHBsYWluaW5nIGZhY3RzLCBjYXRlZ29yaWVzIGV0Yy5cbiAqL1xuXG5cbmltcG9ydCAqIGFzIElucHV0RmlsdGVyIGZyb20gJy4vaW5wdXRGaWx0ZXInO1xuaW1wb3J0ICogYXMgQWxnb2wgZnJvbSAnLi9hbGdvbCc7XG5pbXBvcnQgKiBhcyBkZWJ1ZyBmcm9tICdkZWJ1Zyc7XG5cbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ2Rlc2NyaWJlJyk7XG5pbXBvcnQgKiBhcyBsb2dnZXIgZnJvbSAnLi4vdXRpbHMvbG9nZ2VyJztcbnZhciBsb2dQZXJmID0gbG9nZ2VyLnBlcmYoXCJwZXJmbGlzdGFsbFwiKTtcbnZhciBwZXJmbG9nID0gZGVidWcoJ3BlcmYnKTtcbi8vY29uc3QgcGVyZmxvZyA9IGxvZ2dlci5wZXJmKFwicGVyZmxpc3RhbGxcIik7XG5cbmltcG9ydCAqIGFzIElNYXRjaCBmcm9tICcuL2lmbWF0Y2gnO1xuXG5pbXBvcnQgKiBhcyBUb29sbWF0Y2hlciBmcm9tICcuL3Rvb2xtYXRjaGVyJztcbmltcG9ydCB7IEJyZWFrRG93biB9IGZyb20gJ2ZkZXZzdGFfbW9ubW92ZSc7XG5cbmltcG9ydCB7IFNlbnRlbmNlIGFzIFNlbnRlbmNlIH0gZnJvbSAnYWJvdF9lcmJhc2UnO1xuXG5pbXBvcnQgeyBXb3JkIGFzIFdvcmQgfSBmcm9tICdhYm90X2VyYmFzZSc7XG5pbXBvcnQgKiBhcyBPcGVyYXRvciBmcm9tICcuL29wZXJhdG9yJztcblxuaW1wb3J0ICogYXMgV2hhdElzIGZyb20gJy4vd2hhdGlzJztcblxuaW1wb3J0IHsgTW9kZWwgfSBmcm9tICdmZGV2c3RhX21vbm1vdmUnO1xuXG5cbmltcG9ydCAqIGFzIE1hdGNoIGZyb20gJy4vbWF0Y2gnO1xuXG5cbmltcG9ydCAqIGFzIFV0aWxzIGZyb20gJ2Fib3RfdXRpbHMnO1xuXG5cbnZhciBzV29yZHMgPSB7fTtcblxuZXhwb3J0IGZ1bmN0aW9uIGlzU3lub255bUZvcihleGFjdFdvcmQgOiBzdHJpbmcsIHNsb3BweVdvcmQgOiBzdHJpbmcsIHRoZU1vZGVsOiBJTWF0Y2guSU1vZGVscykgOiBib29sZWFuIHtcbiAgLy8gVE9ETzogdXNlIG1vZGVsIHN5bm9ueW1zXG4gIHJldHVybiBzbG9wcHlXb3JkID09PSBcIm5hbWVcIiAmJiBleGFjdFdvcmQgPT09IFwiZWxlbWVudCBuYW1lXCI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzbG9wcHlPckV4YWN0KGV4YWN0V29yZCA6IHN0cmluZywgc2xvcHB5V29yZCA6IHN0cmluZywgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzKSB7XG4gIGlmKGV4YWN0V29yZC50b0xvd2VyQ2FzZSgpID09PSBzbG9wcHlXb3JkLnRvTG93ZXJDYXNlKCkpIHtcbiAgICByZXR1cm4gJ1wiJyArIHNsb3BweVdvcmQgKyAnXCInO1xuICB9XG4gIC8vIFRPRE8sIGZpbmQgcGx1cmFsIHMgZXRjLlxuICAvLyBzdGlsbCBleGFjdCxcbiAgLy9cbiAgaWYoaXNTeW5vbnltRm9yKGV4YWN0V29yZCxzbG9wcHlXb3JkLHRoZU1vZGVsKSkge1xucmV0dXJuICdcIicgKyBzbG9wcHlXb3JkICsgJ1wiIChpbnRlcnByZXRlZCBhcyBzeW5vbnltIGZvciBcIicgKyBleGFjdFdvcmQgKydcIiknO1xuICB9XG4gIC8vdG9kbywgZmluZCBpcyBzeW5vbnltZm9yIC4uLlxuICAvLyBUT0RPLCBhIHN5bm9ueW0gZm9yIC4uLlxuICByZXR1cm4gJ1wiJyArIHNsb3BweVdvcmQgKyAnXCIgKGludGVycHJldGVkIGFzIFwiJyArIGV4YWN0V29yZCArJ1wiKSc7XG59XG5cbmludGVyZmFjZSBJRGVzY3JpYmVDYXRlZ29yeSB7XG4gICAgdG90YWxyZWNvcmRzIDogbnVtYmVyLFxuICAgIHByZXNlbnRyZWNvcmRzIDogbnVtYmVyLFxuICAgIHZhbHVlcyA6IHsgW2tleSA6IHN0cmluZ10gOiBudW1iZXJ9LFxuICAgIG11bHRpdmFsdWVkIDogYm9vbGVhblxuICB9XG5cbmV4cG9ydCBmdW5jdGlvbiBjb3VudFJlY29yZFByZXNlbmNlKGNhdGVnb3J5IDogc3RyaW5nLCBkb21haW4gOiBzdHJpbmcsIHRoZU1vZGVsIDogSU1hdGNoLklNb2RlbHMpIDogSURlc2NyaWJlQ2F0ZWdvcnkge1xuICB2YXIgcmVzID0geyB0b3RhbHJlY29yZHMgOiAwLFxuICAgIHByZXNlbnRyZWNvcmRzIDogMCxcbiAgICB2YWx1ZXMgOiB7IH0sICAvLyBhbiB0aGVpciBmcmVxdWVuY3lcbiAgICBtdWx0aXZhbHVlZCA6IGZhbHNlXG4gIH0gYXMgSURlc2NyaWJlQ2F0ZWdvcnk7XG4gIHRoZU1vZGVsLnJlY29yZHMuZm9yRWFjaChmdW5jdGlvbihyZWNvcmQpIHtcbiAgICAvL2RlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZCx1bmRlZmluZWQsMikpO1xuICAgIGlmKHJlY29yZC5fZG9tYWluICE9PSBkb21haW4pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmVzLnRvdGFscmVjb3JkcysrO1xuICAgIHZhciB2YWwgPSByZWNvcmRbY2F0ZWdvcnldO1xuICAgIHZhciB2YWxhcnIgPSBbdmFsXTtcbiAgICBpZihBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICAgIHJlcy5tdWx0aXZhbHVlZCA9IHRydWU7XG4gICAgICB2YWxhcnIgPSB2YWw7XG4gICAgfVxuICAgIC8vIHRvZG8gd3JhcCBhcnJcbiAgICBpZih2YWwgIT09IHVuZGVmaW5lZCAmJiB2YWwgIT09IFwibi9hXCIpIHtcbiAgICAgIHJlcy5wcmVzZW50cmVjb3JkcyArKztcbiAgICB9XG4gICAgdmFsYXJyLmZvckVhY2goZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXMudmFsdWVzW3ZhbF0gPSAocmVzLnZhbHVlc1t2YWxdIHx8IDApICsgMTtcbiAgICB9KVxuICB9KVxuICByZXR1cm4gcmVzO1xufVxuXG4vLyBjYXRlZ29yeSA9PiBtYXRjaGVkd29yZHNbXTtcblxuaW50ZXJmYWNlIElEZXNjcmliZUZhY3Qge1xuICAgIHRvdGFscmVjb3JkcyA6IG51bWJlcixcbiAgICBwcmVzZW50cmVjb3JkcyA6IG51bWJlcixcbiAgICBtdWx0aXZhbHVlZCA6IGJvb2xlYW5cbiAgfVxuXG5leHBvcnQgZnVuY3Rpb24gY291bnRSZWNvcmRQcmVzZW5jZUZhY3QoZmFjdCA6IHN0cmluZywgY2F0ZWdvcnkgOiBzdHJpbmcsIGRvbWFpbiA6IHN0cmluZywgdGhlTW9kZWwgOiBJTWF0Y2guSU1vZGVscykgOiBJRGVzY3JpYmVGYWN0IHtcbiAgdmFyIHJlcyA9IHsgdG90YWxyZWNvcmRzIDogMCxcbiAgICBwcmVzZW50cmVjb3JkcyA6IDAsXG4gICAgdmFsdWVzIDogeyB9LCAgLy8gYW4gdGhlaXIgZnJlcXVlbmN5XG4gICAgbXVsdGl2YWx1ZWQgOiBmYWxzZVxuICB9IGFzIElEZXNjcmliZUNhdGVnb3J5O1xuICB0aGVNb2RlbC5yZWNvcmRzLmZvckVhY2goZnVuY3Rpb24ocmVjb3JkKSB7XG4gICAgLy9kZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmQsdW5kZWZpbmVkLDIpKTtcbiAgICBpZihyZWNvcmQuX2RvbWFpbiAhPT0gZG9tYWluKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJlcy50b3RhbHJlY29yZHMrKztcbiAgICB2YXIgdmFsID0gcmVjb3JkW2NhdGVnb3J5XTtcbiAgICB2YXIgdmFsYXJyID0gW3ZhbF07XG4gICAgaWYoQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgICBpZih2YWwuaW5kZXhPZihmYWN0KSA+PSAwKSB7XG4gICAgICAgIHJlcy5tdWx0aXZhbHVlZCA9IHRydWU7XG4gICAgICAgIHZhbGFyciA9IHZhbDtcbiAgICAgICAgcmVzLnByZXNlbnRyZWNvcmRzKys7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh2YWwgPT09IGZhY3QpIHtcbiAgICAgICAgcmVzLnByZXNlbnRyZWNvcmRzKys7XG4gICAgfVxuICB9KVxuICByZXR1cm4gcmVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFrZVZhbHVlc0xpc3RTdHJpbmcocmVhbHZhbHVlczogc3RyaW5nW10pIDogc3RyaW5nIHtcbiAgdmFyIHZhbHVlc1N0cmluZyA9IFwiXCI7XG4gIHZhciB0b3RhbGxlbiA9IDA7XG4gIHZhciBsaXN0VmFsdWVzID0gcmVhbHZhbHVlcy5maWx0ZXIoZnVuY3Rpb24odmFsLCBpbmRleCkge1xuICAgIHRvdGFsbGVuID0gdG90YWxsZW4gKyB2YWwubGVuZ3RoO1xuICByZXR1cm4gKGluZGV4IDwgQWxnb2wuRGVzY3JpYmVWYWx1ZUxpc3RNaW5Db3VudFZhbHVlTGlzdCkgfHwgKHRvdGFsbGVuIDwgQWxnb2wuRGVzY3JpYmVWYWx1ZUxpc3RMZW5ndGhDaGFyTGltaXQpO1xuICB9KTtcbiAgaWYobGlzdFZhbHVlcy5sZW5ndGggPT09IDEgJiYgcmVhbHZhbHVlcy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gJ1RoZSBzb2xlIHZhbHVlIGlzIFxcXCInICsgbGlzdFZhbHVlc1swXSArICdcIic7XG4gIH1cbiAgdmFyIG1heGxlbiA9IGxpc3RWYWx1ZXMucmVkdWNlKCAocHJldix2YWwpID0+IE1hdGgubWF4KHByZXYsdmFsLmxlbmd0aCksMCk7XG4gIGlmKG1heGxlbiA+IDMwKSB7XG4gICAgcmV0dXJuIFwiUG9zc2libGUgdmFsdWVzIGFyZSAuLi5cXG5cIiArXG4gICAgICBsaXN0VmFsdWVzLnJlZHVjZSggKHByZXYsdmFsLGluZGV4KSA9PiAocHJldiArIFwiKFwiICsgKGluZGV4ICsgMSkgKyAnKTogXCInICsgdmFsICsgJ1wiXFxuJ1xuICAgICAgKSxcIlwiKVxuICAgICAgKyAoIGxpc3RWYWx1ZXMubGVuZ3RoID09PSByZWFsdmFsdWVzLmxlbmd0aCA/IFwiXCIgOiBcIi4uLlwiKTtcbiAgfVxuICB2YXIgbGlzdCA9IFwiXCI7XG4gIGlmKGxpc3RWYWx1ZXMubGVuZ3RoID09PSByZWFsdmFsdWVzLmxlbmd0aCkge1xuICAgIGxpc3QgPSBVdGlscy5saXN0VG9RdW90ZWRDb21tYU9yKGxpc3RWYWx1ZXMpO1xuICB9IGVsc2Uge1xuICAgIGxpc3QgPSAnXCInICsgbGlzdFZhbHVlcy5qb2luKCdcIiwgXCInKSArICdcIic7XG4gIH1cbiAgcmV0dXJuIFwiUG9zc2libGUgdmFsdWVzIGFyZSAuLi5cXG5cIlxuICAgICsgbGlzdFxuICAgICsgKCBsaXN0VmFsdWVzLmxlbmd0aCA9PT0gcmVhbHZhbHVlcy5sZW5ndGggPyBcIlwiIDogXCIgLi4uXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9QZXJjZW50KGEgOiBudW1iZXIsIGI6IG51bWJlcikgOiBzdHJpbmcge1xuICByZXR1cm4gXCJcIiArICgxMDAqIGEgLyBiKS50b0ZpeGVkKDEpO1xufVxuXG5cbmV4cG9ydCBpbnRlcmZhY2UgSUNhdGVnb3J5U3RhdHMge1xuICBjYXRlZ29yeURlc2MgOiBJTWF0Y2guSUNhdGVnb3J5RGVzYyxcbiAgcHJlc2VudFJlY29yZHMgOiBudW1iZXIsXG4gIGRpc3RpbmN0IDogc3RyaW5nLFxuICBkZWx0YSA6IHN0cmluZyxcbiAgcGVyY1ByZXNlbnQgOiBzdHJpbmcsXG4gIHNhbXBsZVZhbHVlcyA6IHN0cmluZyxcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDYXRlZ29yeVN0YXRzSW5Eb21haW4oY2F0ZWdvcnkgOiBzdHJpbmcsIGZpbHRlcmRvbWFpbiA6IHN0cmluZywgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzKSA6IElDYXRlZ29yeVN0YXRzIHtcbiAgY29uc3QgcmVjb3JkQ291bnQgPSBjb3VudFJlY29yZFByZXNlbmNlKGNhdGVnb3J5LCBmaWx0ZXJkb21haW4sIHRoZU1vZGVsKTtcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkodGhlTW9kZWwucmVjb3Jkcy5maWx0ZXIoYSA9PiBhLl9kb21haW4gPT09IFwiQ29zbW9zXCIpLHVuZGVmaW5lZCwyKSk7XG4gIGNvbnN0IHBlcmNlbnQgPSB0b1BlcmNlbnQocmVjb3JkQ291bnQucHJlc2VudHJlY29yZHMgLCByZWNvcmRDb3VudC50b3RhbHJlY29yZHMpO1xuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRDb3VudC52YWx1ZXMpKTtcbiAgdmFyIGFsbFZhbHVlcyA9T2JqZWN0LmtleXMocmVjb3JkQ291bnQudmFsdWVzKTtcbiAgdmFyIHJlYWx2YWx1ZXMgPSBhbGxWYWx1ZXMuZmlsdGVyKHZhbHVlID0+ICh2YWx1ZSAhPT0gJ3VuZGVmaW5lZCcpICYmICh2YWx1ZSAhPT0gJ24vYScpKTtcbiAgZGVidWdsb2dcbiAgcmVhbHZhbHVlcy5zb3J0KCk7XG4gIHZhciB1bmRlZk5hRGVsdGEgPSAgKGFsbFZhbHVlcy5sZW5ndGggLSByZWFsdmFsdWVzLmxlbmd0aCk7XG4gIHZhciBkZWx0YSA9ICAodW5kZWZOYURlbHRhKSA/ICBcIigrXCIgKyB1bmRlZk5hRGVsdGEgKyBcIilcIiA6IFwiXCI7XG4gIGNvbnN0IGRpc3RpbmN0ID0gJycgKyByZWFsdmFsdWVzLmxlbmd0aDtcbiAgY29uc3QgdmFsdWVzTGlzdCA9IG1ha2VWYWx1ZXNMaXN0U3RyaW5nKHJlYWx2YWx1ZXMpO1xuICByZXR1cm4ge1xuICAgIGNhdGVnb3J5RGVzYyA6IHRoZU1vZGVsLmZ1bGwuZG9tYWluW2ZpbHRlcmRvbWFpbl0uY2F0ZWdvcmllc1tjYXRlZ29yeV0sXG4gICAgZGlzdGluY3QgOiBkaXN0aW5jdCxcbiAgICBkZWx0YSA6IGRlbHRhLFxuICAgIHByZXNlbnRSZWNvcmRzIDogcmVjb3JkQ291bnQucHJlc2VudHJlY29yZHMsXG4gICAgcGVyY1ByZXNlbnQgOiBwZXJjZW50LFxuICAgIHNhbXBsZVZhbHVlcyA6IHZhbHVlc0xpc3RcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluKGNhdGVnb3J5IDogc3RyaW5nLCBmaWx0ZXJkb21haW4gOiBzdHJpbmcsIHRoZU1vZGVsOiBJTWF0Y2guSU1vZGVscykgOiBzdHJpbmcge1xuLyogIGNvbnN0IHJlY29yZENvdW50ID0gY291bnRSZWNvcmRQcmVzZW5jZShjYXRlZ29yeSwgZmlsdGVyZG9tYWluLCB0aGVNb2RlbCk7XG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHRoZU1vZGVsLnJlY29yZHMuZmlsdGVyKGEgPT4gYS5fZG9tYWluID09PSBcIkNvc21vc1wiKSx1bmRlZmluZWQsMikpO1xuICBjb25zdCBwZXJjZW50ID0gdG9QZXJjZW50KHJlY29yZENvdW50LnByZXNlbnRyZWNvcmRzICwgcmVjb3JkQ291bnQudG90YWxyZWNvcmRzKTtcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkQ291bnQudmFsdWVzKSk7XG4gIHZhciBhbGxWYWx1ZXMgPU9iamVjdC5rZXlzKHJlY29yZENvdW50LnZhbHVlcyk7XG4gIHZhciByZWFsdmFsdWVzID0gYWxsVmFsdWVzLmZpbHRlcih2YWx1ZSA9PiAodmFsdWUgIT09ICd1bmRlZmluZWQnKSAmJiAodmFsdWUgIT09ICduL2EnKSk7XG4gIGRlYnVnbG9nXG4gIHJlYWx2YWx1ZXMuc29ydCgpO1xuICB2YXIgdW5kZWZOYURlbHRhID0gIChhbGxWYWx1ZXMubGVuZ3RoIC0gcmVhbHZhbHVlcy5sZW5ndGgpO1xuICB2YXIgZGVsdGEgPSAgKHVuZGVmTmFEZWx0YSkgPyAgXCIoK1wiICsgdW5kZWZOYURlbHRhICsgXCIpXCIgOiBcIlwiO1xuICBjb25zdCBkaXN0aW5jdCA9ICcnICsgcmVhbHZhbHVlcy5sZW5ndGg7XG5cbiAgY29uc3QgdmFsdWVzTGlzdCA9IG1ha2VWYWx1ZXNMaXN0U3RyaW5nKHJlYWx2YWx1ZXMpO1xuKi9cbiAgdmFyIHN0YXRzID0gZ2V0Q2F0ZWdvcnlTdGF0c0luRG9tYWluKGNhdGVnb3J5LGZpbHRlcmRvbWFpbix0aGVNb2RlbCk7XG5cbiAgdmFyIHJlcyA9ICdpcyBhIGNhdGVnb3J5IGluIGRvbWFpbiBcIicgKyBmaWx0ZXJkb21haW4gKyAnXCJcXG4nXG4gICsgYEl0IGlzIHByZXNlbnQgaW4gJHtzdGF0cy5wcmVzZW50UmVjb3Jkc30gKCR7c3RhdHMucGVyY1ByZXNlbnR9JSkgb2YgcmVjb3JkcyBpbiB0aGlzIGRvbWFpbixcXG5gICtcbiAgIGBoYXZpbmcgJHtzdGF0cy5kaXN0aW5jdCArICcnfSR7c3RhdHMuZGVsdGF9IGRpc3RpbmN0IHZhbHVlcy5cXG5gXG4gICsgc3RhdHMuc2FtcGxlVmFsdWVzO1xuXG4gIHZhciBkZXNjID0gdGhlTW9kZWwuZnVsbC5kb21haW5bZmlsdGVyZG9tYWluXS5jYXRlZ29yaWVzW2NhdGVnb3J5XSB8fCB7fSBhcyBJTWF0Y2guSUNhdGVnb3J5RGVzYztcbiAgdmFyIGRlc2NyaXB0aW9uID0gZGVzYy5kZXNjcmlwdGlvbiB8fCBcIlwiO1xuICBpZiAoZGVzY3JpcHRpb24pIHtcbiAgICByZXMgKz0gYFxcbkRlc2NyaXB0aW9uOiAke2Rlc2NyaXB0aW9ufWA7XG4gIH1cbiAgcmV0dXJuIHJlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRSZWNvcmRzV2l0aEZhY3QobWF0Y2hlZFN0cmluZzogc3RyaW5nLCBjYXRlZ29yeSA6IHN0cmluZywgcmVjb3JkcyA6IGFueSwgZG9tYWlucyA6IHsgW2tleSA6IHN0cmluZ10gOiBudW1iZXJ9KSA6IGFueVtdIHtcbiAgcmV0dXJuIHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uKHJlY29yZCkgIHtcblxuICAgIGxldCByZXMgPSAocmVjb3JkW2NhdGVnb3J5XSA9PT0gbWF0Y2hlZFN0cmluZyk7XG4gICAgaWYoIHJlcykge1xuICAgICAgaW5jcmVtZW50KGRvbWFpbnMscmVjb3Jkcy5fZG9tYWluKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbmNyZW1lbnQobWFwIDoge1trZXk6IHN0cmluZ10gOiBudW1iZXJ9LCBrZXkgOiBzdHJpbmcpIHtcbiAgbWFwW2tleV0gPSAobWFwW2tleV0gfHwgMCkgKyAxO1xufVxuXG5mdW5jdGlvbiBzb3J0ZWRLZXlzPFQ+KG1hcCA6IHtba2V5IDogc3RyaW5nXSA6IFR9KSA6IHN0cmluZ1tdIHtcbiAgdmFyIHIgPSBPYmplY3Qua2V5cyhtYXApO1xuICByLnNvcnQoKTtcbiAgcmV0dXJuIHI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXNjcmliZURvbWFpbihmYWN0IDogc3RyaW5nLCBkb21haW46IHN0cmluZywgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzKSA6IHN0cmluZyB7XG4gIHZhciBjb3VudCA9IHRoZU1vZGVsLnJlY29yZHMucmVkdWNlKGZ1bmN0aW9uKHByZXYsIHJlY29yZCkge1xuICAgIHJldHVybiBwcmV2ICsgKChyZWNvcmQuX2RvbWFpbiA9PT0gZG9tYWluKSA/IDEgOiAwKTtcbiAgfSwwKTtcbiAgdmFyIGNhdGNvdW50ID0gTW9kZWwuZ2V0Q2F0ZWdvcmllc0ZvckRvbWFpbih0aGVNb2RlbCwgZG9tYWluKS5sZW5ndGg7XG4gIHZhciByZXMgPSBzbG9wcHlPckV4YWN0KGRvbWFpbiwgZmFjdCwgdGhlTW9kZWwpICsgYGlzIGEgZG9tYWluIHdpdGggJHtjYXRjb3VudH0gY2F0ZWdvcmllcyBhbmQgJHtjb3VudH0gcmVjb3Jkc1xcbmA7XG4gIHZhciBkZXNjID0gdGhlTW9kZWwuZnVsbC5kb21haW5bZG9tYWluXS5kZXNjcmlwdGlvbiB8fCBcIlwiO1xuICBpZihkZXNjKSB7XG4gICAgcmVzICs9IGBEZXNjcmlwdGlvbjpgICsgZGVzYyArIGBcXG5gO1xuICB9XG4gIHJldHVybiByZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXNjcmliZUZhY3RJbkRvbWFpbihmYWN0IDogc3RyaW5nLCBmaWx0ZXJkb21haW4gOiBzdHJpbmcsIHRoZU1vZGVsOiBJTWF0Y2guSU1vZGVscykgOiBzdHJpbmcge1xuICB2YXIgc2VudGVuY2VzID0gV2hhdElzLmFuYWx5emVDb250ZXh0U3RyaW5nKGZhY3QsICB0aGVNb2RlbC5ydWxlcyk7XG4gIC8vY29uc29sZS5sb2coXCJoZXJlIHNlbnRlbmNlcyBcIiArIEpTT04uc3RyaW5naWZ5KHNlbnRlbmNlcykpO1xuICB2YXIgbGVuZ3RoT25lU2VudGVuY2VzID0gc2VudGVuY2VzLnNlbnRlbmNlcy5maWx0ZXIob1NlbnRlbmNlID0+IG9TZW50ZW5jZS5sZW5ndGggPT09IDEpO1xuICB2YXIgcmVzID0gJyc7XG4gIC8vIHJlbW92ZSBjYXRlZ29yaWVzIGFuZCBkb21haW5zXG4gIHZhciBvbmx5RmFjdHMgPSBsZW5ndGhPbmVTZW50ZW5jZXMuZmlsdGVyKG9TZW50ZW5jZSA9PntcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvU2VudGVuY2VbMF0pKTtcbiAgICByZXR1cm4gIVdvcmQuV29yZC5pc0RvbWFpbihvU2VudGVuY2VbMF0pICYmXG4gICAgICAgICAgICFXb3JkLldvcmQuaXNGaWxsZXIob1NlbnRlbmNlWzBdKSAmJiAhV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1NlbnRlbmNlWzBdKVxuICB9XG4gICk7XG4gIHZhciBvbmx5RG9tYWlucyA9IGxlbmd0aE9uZVNlbnRlbmNlcy5maWx0ZXIob1NlbnRlbmNlID0+e1xuICAgIHJldHVybiBXb3JkLldvcmQuaXNEb21haW4ob1NlbnRlbmNlWzBdKTtcbiAgfSk7XG4gIGlmKG9ubHlEb21haW5zICYmIG9ubHlEb21haW5zLmxlbmd0aCA+IDApIHtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvbmx5RG9tYWlucykpO1xuICAgIG9ubHlEb21haW5zLmZvckVhY2goZnVuY3Rpb24oc2VudGVuY2UpIHtcbiAgICAgIHZhciBkb21haW4gPSBzZW50ZW5jZVswXS5tYXRjaGVkU3RyaW5nO1xuICAgICAgaWYoICFmaWx0ZXJkb21haW4gfHwgZG9tYWluID09PSBmaWx0ZXJkb21haW4pIHtcbiAgICAgICAgZGVidWdsb2coXCJoZXJlIG1hdGNoIFwiICsgSlNPTi5zdHJpbmdpZnkoc2VudGVuY2UpKTtcbiAgICAgICAgcmVzICs9IGRlc2NyaWJlRG9tYWluKGZhY3QsIHNlbnRlbmNlWzBdLm1hdGNoZWRTdHJpbmcsIHRoZU1vZGVsKTtcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgZGVidWdsb2coXCJvbmx5IGZhY3RzOiBcIiArIEpTT04uc3RyaW5naWZ5KG9ubHlGYWN0cykpO1xuICB2YXIgcmVjb3JkTWFwID0ge307XG4gIHZhciBkb21haW5zTWFwID0ge30gYXMge1trZXk6IHN0cmluZ10gOiBudW1iZXJ9O1xuICB2YXIgbWF0Y2hlZHdvcmRNYXAgPSB7fSBhcyB7W2tleTogc3RyaW5nXSA6IG51bWJlcn07XG4gIHZhciBtYXRjaGVkQ2F0ZWdvcnlNYXAgPSB7fSBhcyB7W2tleTogc3RyaW5nXSA6IG51bWJlcn07XG4gIC8vIGxvb2sgZm9yIGFsbCByZWNvcmRzXG4gIG9ubHlGYWN0cy5mb3JFYWNoKG9TZW50ZW5jZSA9PlxuICAgIG9TZW50ZW5jZS5mb3JFYWNoKG9Xb3JkID0+XG4gICAgICB7XG4gICAgICAgIGluY3JlbWVudChtYXRjaGVkd29yZE1hcCwgb1dvcmQubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgIGluY3JlbWVudChtYXRjaGVkQ2F0ZWdvcnlNYXAsIG9Xb3JkLmNhdGVnb3J5KTtcbiAgICAgIH1cbiAgICApXG4gICk7XG4gIC8vIHdlIGhhdmU6XG4gIC8vIGEgbGlzdCBvZiBjYXRlZ29yaWVzLFxuICAvLyBhIGxpc3Qgb2YgbWF0Y2hlZFdvcmRzICAtPlxuICAvL1xuXG4gIHZhciBjYXRlZ29yaWVzID0gc29ydGVkS2V5cyhtYXRjaGVkQ2F0ZWdvcnlNYXApO1xuICB2YXIgbWF0Y2hlZHdvcmRzID0gc29ydGVkS2V5cyhtYXRjaGVkd29yZE1hcCk7XG4gIGRlYnVnbG9nKFwibWF0Y2hlZHdvcmRzOiBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWR3b3JkcykpO1xuICBkZWJ1Z2xvZyhcImNhdGVnb3JpZXM6IFwiICsgSlNPTi5zdHJpbmdpZnkoY2F0ZWdvcmllcykpO1xuXG4gIC8vdmFyIGFsbE1hdGNoZWRXb3JkcyA9IHsgW2tleSA6IHN0cmluZ10gOiBudW1iZXIgfTtcbiAgdmFyIGRvbWFpblJlY29yZENvdW50ID0ge30gYXMge1trZXk6IHN0cmluZ10gOiBudW1iZXJ9O1xuICB2YXIgZG9tYWluTWF0Y2hDYXRDb3VudCA9IHt9IGFzIHtba2V5OiBzdHJpbmddIDpcbiAgICAgICB7W2tleTogc3RyaW5nXSA6XG4gICAgIHtba2V5OiBzdHJpbmddIDogbnVtYmVyfX19O1xuICAvLyB3ZSBwcmVwYXJlIHRoZSBmb2xsb3dpbmcgc3RydWN0dXJlXG4gIC8vXG4gIC8vIHtkb21haW59IDogcmVjb3JkY291bnQ7XG4gIC8vIHttYXRjaGVkd29yZHN9IDpcbiAgLy8ge2RvbWFpbn0ge21hdGNoZWR3b3JkfSB7Y2F0ZWdvcnl9IHByZXNlbmNlY291bnRcbiAgdGhlTW9kZWwucmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uKHJlY29yZCkge1xuICAgIGlmKCFmaWx0ZXJkb21haW4gfHwgcmVjb3JkLl9kb21haW4gPT09IGZpbHRlcmRvbWFpbiApIHtcbiAgICAgIGRvbWFpblJlY29yZENvdW50W3JlY29yZC5fZG9tYWluXSA9IChkb21haW5SZWNvcmRDb3VudFtyZWNvcmQuX2RvbWFpbl0gfHwgMCkgKyAxO1xuICAgICAgbWF0Y2hlZHdvcmRzLmZvckVhY2gobWF0Y2hlZHdvcmQgPT5cbiAgICAgICAgY2F0ZWdvcmllcy5mb3JFYWNoKGNhdGVnb3J5ID0+IHtcbiAgICAgICAgICBpZiggcmVjb3JkW2NhdGVnb3J5XSA9PT0gbWF0Y2hlZHdvcmQpIHtcbiAgICAgICAgICAgIHZhciBtZCA9IGRvbWFpbk1hdGNoQ2F0Q291bnRbcmVjb3JkLl9kb21haW5dID0gZG9tYWluTWF0Y2hDYXRDb3VudFtyZWNvcmQuX2RvbWFpbl0gfHwge307XG4gICAgICAgICAgICB2YXIgbWRjID0gbWRbbWF0Y2hlZHdvcmRdID0gIG1kW21hdGNoZWR3b3JkXSB8fCB7fTtcbiAgICAgICAgICAgIGluY3JlbWVudChtZGMsY2F0ZWdvcnkpO1xuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgKVxuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkb21haW5NYXRjaENhdENvdW50LHVuZGVmaW5lZCwyKSk7XG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRvbWFpblJlY29yZENvdW50LHVuZGVmaW5lZCwyKSk7XG4gIHZhciBkb21haW5zID0gc29ydGVkS2V5cyhkb21haW5NYXRjaENhdENvdW50KTtcbiAgdmFyIHJlc05leHQgPSAgJ1wiJyArIGZhY3QgKyAnXCIgaGFzIGEgbWVhbmluZyBpbiAnO1xuICB2YXIgc2luZ2xlID0gZmFsc2U7XG4gIGlmKE9iamVjdC5rZXlzKGRvbWFpbk1hdGNoQ2F0Q291bnQpLmxlbmd0aCA+IDEpIHtcbiAgICByZXNOZXh0ICs9ICcnICsgZG9tYWlucy5sZW5ndGggK1xuICAgICAgICAgICAgICAnIGRvbWFpbnM6ICcgKyBVdGlscy5saXN0VG9RdW90ZWRDb21tYUFuZChkb21haW5zKSArIFwiXCI7XG4gIH0gZWxzZSBpZihkb21haW5zLmxlbmd0aCA9PT0gMSkge1xuICAgIGlmKCFmaWx0ZXJkb21haW4pIHtcbiAgICAgIHJlc05leHQgKz0gYG9uZSBgO1xuICAgIH1cbiAgICByZXNOZXh0ICs9IGBkb21haW4gXCIke2RvbWFpbnNbMF19XCI6YDtcbiAgICBzaW5nbGUgPSB0cnVlO1xuICB9IGVsc2Uge1xuICAgIGlmKHJlcykge1xuICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG4gICAgdmFyIGZhY3RjbGVhbiA9IFV0aWxzLnN0cmlwUXVvdGVzKGZhY3QpO1xuICAgIGlmKGZpbHRlcmRvbWFpbikge1xuICAgICAgcmV0dXJuIGBcIiR7ZmFjdGNsZWFufVwiIGlzIG5vIGtub3duIGZhY3QgaW4gZG9tYWluIFwiJHtmaWx0ZXJkb21haW59XCIuXFxuYDtcbiAgICB9XG4gICAgcmV0dXJuIGBJIGRvbid0IGtub3cgYW55dGhpbmcgYWJvdXQgXCIke2ZhY3RjbGVhbn1cIi5cXG5gO1xuICB9XG4gIHJlcyArPSByZXNOZXh0ICsgXCJcXG5cIjsgLy8gLi4uXFxuXCI7XG4gIGRvbWFpbnMuZm9yRWFjaChmdW5jdGlvbihkb21haW4pIHtcbiAgICB2YXIgbWQgPSBkb21haW5NYXRjaENhdENvdW50W2RvbWFpbl07XG4gICAgT2JqZWN0LmtleXMobWQpLmZvckVhY2gobWF0Y2hlZHN0cmluZyA9PiB7XG4gICAgICB2YXIgbWRjID0gbWRbbWF0Y2hlZHN0cmluZ107XG4gICAgICBpZighc2luZ2xlKSB7XG4gICAgICAgIHJlcyArPSAnaW4gZG9tYWluIFwiJyArIGRvbWFpbiArICdcIiAnO1xuICAgICAgfVxuICAgICAgdmFyIGNhdHNpbmdsZSA9IE9iamVjdC5rZXlzKG1kYykubGVuZ3RoID09PSAxO1xuICAgICAgcmVzICs9IGAke3Nsb3BweU9yRXhhY3QobWF0Y2hlZHN0cmluZyxmYWN0LHRoZU1vZGVsKX0gYDtcbiAgICAgIGlmKCFjYXRzaW5nbGUpIHtcbiAgICAgICAgcmVzICs9IGAuLi5cXG5gO1xuICAgICAgfVxuICAgICAgT2JqZWN0LmtleXMobWRjKS5mb3JFYWNoKGNhdGVnb3J5ID0+IHtcbiAgICAgIHZhciBwZXJjZW50ID0gIHRvUGVyY2VudChtZGNbY2F0ZWdvcnldLGRvbWFpblJlY29yZENvdW50W2RvbWFpbl0pO1xuXG4gICAgICAgIHJlcyArPSBgaXMgYSB2YWx1ZSBmb3IgY2F0ZWdvcnkgXCIke2NhdGVnb3J5fVwiIHByZXNlbnQgaW4gJHttZGNbY2F0ZWdvcnldfSgke3BlcmNlbnR9JSkgb2YgcmVjb3JkcztcXG5gO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuICByZXR1cm4gcmVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVzY3JpYmVDYXRlZ29yeShjYXRlZ29yeSA6IHN0cmluZywgZmlsdGVyRG9tYWluOiBzdHJpbmcsIG1vZGVsOiBJTWF0Y2guSU1vZGVscyxtZXNzYWdlIDogc3RyaW5nKSA6IHN0cmluZ1tdIHtcbiAgdmFyIHJlcyA9IFtdO1xuICB2YXIgZG9tcyA9IE1vZGVsLmdldERvbWFpbnNGb3JDYXRlZ29yeShtb2RlbCxjYXRlZ29yeSk7XG4gIGlmKGZpbHRlckRvbWFpbikge1xuICAgIGlmKGRvbXMuaW5kZXhPZihmaWx0ZXJEb21haW4pID49IDApIHtcbiAgICAgIHJlcy5wdXNoKGRlc2NyaWJlQ2F0ZWdvcnlJbkRvbWFpbihjYXRlZ29yeSxmaWx0ZXJEb21haW4sbW9kZWwpKTtcbiAgICAgIHJldHVybiByZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gIH1cbiAgZG9tcy5zb3J0KCk7XG4gIGRvbXMuZm9yRWFjaChmdW5jdGlvbihkb21haW4pIHtcbiAgICAgICAgcmVzLnB1c2goZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluKGNhdGVnb3J5LCBkb21haW4sIG1vZGVsKSk7XG4gIH0pO1xuICByZXR1cm4gcmVzO1xufVxuIiwiLyoqXG4gKlxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuZXhwbGFpblxuICogQGZpbGUgZXhwbGFpbi50c1xuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxuICpcbiAqIEZ1bmN0aW9ucyBkZWFsaW5nIHdpdGggZXhwbGFpbmluZyBmYWN0cywgY2F0ZWdvcmllcyBldGMuXG4gKi9cblwidXNlIHN0cmljdFwiO1xudmFyIEFsZ29sID0gcmVxdWlyZShcIi4vYWxnb2xcIik7XG52YXIgZGVidWcgPSByZXF1aXJlKFwiZGVidWdcIik7XG52YXIgZGVidWdsb2cgPSBkZWJ1ZygnZGVzY3JpYmUnKTtcbnZhciBsb2dnZXIgPSByZXF1aXJlKFwiLi4vdXRpbHMvbG9nZ2VyXCIpO1xudmFyIGxvZ1BlcmYgPSBsb2dnZXIucGVyZihcInBlcmZsaXN0YWxsXCIpO1xudmFyIHBlcmZsb2cgPSBkZWJ1ZygncGVyZicpO1xudmFyIGFib3RfZXJiYXNlXzEgPSByZXF1aXJlKFwiYWJvdF9lcmJhc2VcIik7XG52YXIgV2hhdElzID0gcmVxdWlyZShcIi4vd2hhdGlzXCIpO1xudmFyIGZkZXZzdGFfbW9ubW92ZV8xID0gcmVxdWlyZShcImZkZXZzdGFfbW9ubW92ZVwiKTtcbnZhciBVdGlscyA9IHJlcXVpcmUoXCJhYm90X3V0aWxzXCIpO1xudmFyIHNXb3JkcyA9IHt9O1xuZnVuY3Rpb24gaXNTeW5vbnltRm9yKGV4YWN0V29yZCwgc2xvcHB5V29yZCwgdGhlTW9kZWwpIHtcbiAgICAvLyBUT0RPOiB1c2UgbW9kZWwgc3lub255bXNcbiAgICByZXR1cm4gc2xvcHB5V29yZCA9PT0gXCJuYW1lXCIgJiYgZXhhY3RXb3JkID09PSBcImVsZW1lbnQgbmFtZVwiO1xufVxuZXhwb3J0cy5pc1N5bm9ueW1Gb3IgPSBpc1N5bm9ueW1Gb3I7XG5mdW5jdGlvbiBzbG9wcHlPckV4YWN0KGV4YWN0V29yZCwgc2xvcHB5V29yZCwgdGhlTW9kZWwpIHtcbiAgICBpZiAoZXhhY3RXb3JkLnRvTG93ZXJDYXNlKCkgPT09IHNsb3BweVdvcmQudG9Mb3dlckNhc2UoKSkge1xuICAgICAgICByZXR1cm4gJ1wiJyArIHNsb3BweVdvcmQgKyAnXCInO1xuICAgIH1cbiAgICAvLyBUT0RPLCBmaW5kIHBsdXJhbCBzIGV0Yy5cbiAgICAvLyBzdGlsbCBleGFjdCxcbiAgICAvL1xuICAgIGlmIChpc1N5bm9ueW1Gb3IoZXhhY3RXb3JkLCBzbG9wcHlXb3JkLCB0aGVNb2RlbCkpIHtcbiAgICAgICAgcmV0dXJuICdcIicgKyBzbG9wcHlXb3JkICsgJ1wiIChpbnRlcnByZXRlZCBhcyBzeW5vbnltIGZvciBcIicgKyBleGFjdFdvcmQgKyAnXCIpJztcbiAgICB9XG4gICAgLy90b2RvLCBmaW5kIGlzIHN5bm9ueW1mb3IgLi4uXG4gICAgLy8gVE9ETywgYSBzeW5vbnltIGZvciAuLi5cbiAgICByZXR1cm4gJ1wiJyArIHNsb3BweVdvcmQgKyAnXCIgKGludGVycHJldGVkIGFzIFwiJyArIGV4YWN0V29yZCArICdcIiknO1xufVxuZXhwb3J0cy5zbG9wcHlPckV4YWN0ID0gc2xvcHB5T3JFeGFjdDtcbmZ1bmN0aW9uIGNvdW50UmVjb3JkUHJlc2VuY2UoY2F0ZWdvcnksIGRvbWFpbiwgdGhlTW9kZWwpIHtcbiAgICB2YXIgcmVzID0geyB0b3RhbHJlY29yZHM6IDAsXG4gICAgICAgIHByZXNlbnRyZWNvcmRzOiAwLFxuICAgICAgICB2YWx1ZXM6IHt9LFxuICAgICAgICBtdWx0aXZhbHVlZDogZmFsc2VcbiAgICB9O1xuICAgIHRoZU1vZGVsLnJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgIC8vZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkLHVuZGVmaW5lZCwyKSk7XG4gICAgICAgIGlmIChyZWNvcmQuX2RvbWFpbiAhPT0gZG9tYWluKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcmVzLnRvdGFscmVjb3JkcysrO1xuICAgICAgICB2YXIgdmFsID0gcmVjb3JkW2NhdGVnb3J5XTtcbiAgICAgICAgdmFyIHZhbGFyciA9IFt2YWxdO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgICAgICAgICByZXMubXVsdGl2YWx1ZWQgPSB0cnVlO1xuICAgICAgICAgICAgdmFsYXJyID0gdmFsO1xuICAgICAgICB9XG4gICAgICAgIC8vIHRvZG8gd3JhcCBhcnJcbiAgICAgICAgaWYgKHZhbCAhPT0gdW5kZWZpbmVkICYmIHZhbCAhPT0gXCJuL2FcIikge1xuICAgICAgICAgICAgcmVzLnByZXNlbnRyZWNvcmRzKys7XG4gICAgICAgIH1cbiAgICAgICAgdmFsYXJyLmZvckVhY2goZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgcmVzLnZhbHVlc1t2YWxdID0gKHJlcy52YWx1ZXNbdmFsXSB8fCAwKSArIDE7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmNvdW50UmVjb3JkUHJlc2VuY2UgPSBjb3VudFJlY29yZFByZXNlbmNlO1xuZnVuY3Rpb24gY291bnRSZWNvcmRQcmVzZW5jZUZhY3QoZmFjdCwgY2F0ZWdvcnksIGRvbWFpbiwgdGhlTW9kZWwpIHtcbiAgICB2YXIgcmVzID0geyB0b3RhbHJlY29yZHM6IDAsXG4gICAgICAgIHByZXNlbnRyZWNvcmRzOiAwLFxuICAgICAgICB2YWx1ZXM6IHt9LFxuICAgICAgICBtdWx0aXZhbHVlZDogZmFsc2VcbiAgICB9O1xuICAgIHRoZU1vZGVsLnJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgIC8vZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkLHVuZGVmaW5lZCwyKSk7XG4gICAgICAgIGlmIChyZWNvcmQuX2RvbWFpbiAhPT0gZG9tYWluKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcmVzLnRvdGFscmVjb3JkcysrO1xuICAgICAgICB2YXIgdmFsID0gcmVjb3JkW2NhdGVnb3J5XTtcbiAgICAgICAgdmFyIHZhbGFyciA9IFt2YWxdO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgICAgICAgICBpZiAodmFsLmluZGV4T2YoZmFjdCkgPj0gMCkge1xuICAgICAgICAgICAgICAgIHJlcy5tdWx0aXZhbHVlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgdmFsYXJyID0gdmFsO1xuICAgICAgICAgICAgICAgIHJlcy5wcmVzZW50cmVjb3JkcysrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHZhbCA9PT0gZmFjdCkge1xuICAgICAgICAgICAgcmVzLnByZXNlbnRyZWNvcmRzKys7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5jb3VudFJlY29yZFByZXNlbmNlRmFjdCA9IGNvdW50UmVjb3JkUHJlc2VuY2VGYWN0O1xuZnVuY3Rpb24gbWFrZVZhbHVlc0xpc3RTdHJpbmcocmVhbHZhbHVlcykge1xuICAgIHZhciB2YWx1ZXNTdHJpbmcgPSBcIlwiO1xuICAgIHZhciB0b3RhbGxlbiA9IDA7XG4gICAgdmFyIGxpc3RWYWx1ZXMgPSByZWFsdmFsdWVzLmZpbHRlcihmdW5jdGlvbiAodmFsLCBpbmRleCkge1xuICAgICAgICB0b3RhbGxlbiA9IHRvdGFsbGVuICsgdmFsLmxlbmd0aDtcbiAgICAgICAgcmV0dXJuIChpbmRleCA8IEFsZ29sLkRlc2NyaWJlVmFsdWVMaXN0TWluQ291bnRWYWx1ZUxpc3QpIHx8ICh0b3RhbGxlbiA8IEFsZ29sLkRlc2NyaWJlVmFsdWVMaXN0TGVuZ3RoQ2hhckxpbWl0KTtcbiAgICB9KTtcbiAgICBpZiAobGlzdFZhbHVlcy5sZW5ndGggPT09IDEgJiYgcmVhbHZhbHVlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuICdUaGUgc29sZSB2YWx1ZSBpcyBcXFwiJyArIGxpc3RWYWx1ZXNbMF0gKyAnXCInO1xuICAgIH1cbiAgICB2YXIgbWF4bGVuID0gbGlzdFZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHZhbCkgeyByZXR1cm4gTWF0aC5tYXgocHJldiwgdmFsLmxlbmd0aCk7IH0sIDApO1xuICAgIGlmIChtYXhsZW4gPiAzMCkge1xuICAgICAgICByZXR1cm4gXCJQb3NzaWJsZSB2YWx1ZXMgYXJlIC4uLlxcblwiICtcbiAgICAgICAgICAgIGxpc3RWYWx1ZXMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCB2YWwsIGluZGV4KSB7IHJldHVybiAocHJldiArIFwiKFwiICsgKGluZGV4ICsgMSkgKyAnKTogXCInICsgdmFsICsgJ1wiXFxuJyk7IH0sIFwiXCIpXG4gICAgICAgICAgICArIChsaXN0VmFsdWVzLmxlbmd0aCA9PT0gcmVhbHZhbHVlcy5sZW5ndGggPyBcIlwiIDogXCIuLi5cIik7XG4gICAgfVxuICAgIHZhciBsaXN0ID0gXCJcIjtcbiAgICBpZiAobGlzdFZhbHVlcy5sZW5ndGggPT09IHJlYWx2YWx1ZXMubGVuZ3RoKSB7XG4gICAgICAgIGxpc3QgPSBVdGlscy5saXN0VG9RdW90ZWRDb21tYU9yKGxpc3RWYWx1ZXMpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgbGlzdCA9ICdcIicgKyBsaXN0VmFsdWVzLmpvaW4oJ1wiLCBcIicpICsgJ1wiJztcbiAgICB9XG4gICAgcmV0dXJuIFwiUG9zc2libGUgdmFsdWVzIGFyZSAuLi5cXG5cIlxuICAgICAgICArIGxpc3RcbiAgICAgICAgKyAobGlzdFZhbHVlcy5sZW5ndGggPT09IHJlYWx2YWx1ZXMubGVuZ3RoID8gXCJcIiA6IFwiIC4uLlwiKTtcbn1cbmV4cG9ydHMubWFrZVZhbHVlc0xpc3RTdHJpbmcgPSBtYWtlVmFsdWVzTGlzdFN0cmluZztcbmZ1bmN0aW9uIHRvUGVyY2VudChhLCBiKSB7XG4gICAgcmV0dXJuIFwiXCIgKyAoMTAwICogYSAvIGIpLnRvRml4ZWQoMSk7XG59XG5leHBvcnRzLnRvUGVyY2VudCA9IHRvUGVyY2VudDtcbjtcbmZ1bmN0aW9uIGdldENhdGVnb3J5U3RhdHNJbkRvbWFpbihjYXRlZ29yeSwgZmlsdGVyZG9tYWluLCB0aGVNb2RlbCkge1xuICAgIHZhciByZWNvcmRDb3VudCA9IGNvdW50UmVjb3JkUHJlc2VuY2UoY2F0ZWdvcnksIGZpbHRlcmRvbWFpbiwgdGhlTW9kZWwpO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHRoZU1vZGVsLnJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChhKSB7IHJldHVybiBhLl9kb21haW4gPT09IFwiQ29zbW9zXCI7IH0pLCB1bmRlZmluZWQsIDIpKTtcbiAgICB2YXIgcGVyY2VudCA9IHRvUGVyY2VudChyZWNvcmRDb3VudC5wcmVzZW50cmVjb3JkcywgcmVjb3JkQ291bnQudG90YWxyZWNvcmRzKTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRDb3VudC52YWx1ZXMpKTtcbiAgICB2YXIgYWxsVmFsdWVzID0gT2JqZWN0LmtleXMocmVjb3JkQ291bnQudmFsdWVzKTtcbiAgICB2YXIgcmVhbHZhbHVlcyA9IGFsbFZhbHVlcy5maWx0ZXIoZnVuY3Rpb24gKHZhbHVlKSB7IHJldHVybiAodmFsdWUgIT09ICd1bmRlZmluZWQnKSAmJiAodmFsdWUgIT09ICduL2EnKTsgfSk7XG4gICAgZGVidWdsb2c7XG4gICAgcmVhbHZhbHVlcy5zb3J0KCk7XG4gICAgdmFyIHVuZGVmTmFEZWx0YSA9IChhbGxWYWx1ZXMubGVuZ3RoIC0gcmVhbHZhbHVlcy5sZW5ndGgpO1xuICAgIHZhciBkZWx0YSA9ICh1bmRlZk5hRGVsdGEpID8gXCIoK1wiICsgdW5kZWZOYURlbHRhICsgXCIpXCIgOiBcIlwiO1xuICAgIHZhciBkaXN0aW5jdCA9ICcnICsgcmVhbHZhbHVlcy5sZW5ndGg7XG4gICAgdmFyIHZhbHVlc0xpc3QgPSBtYWtlVmFsdWVzTGlzdFN0cmluZyhyZWFsdmFsdWVzKTtcbiAgICByZXR1cm4ge1xuICAgICAgICBjYXRlZ29yeURlc2M6IHRoZU1vZGVsLmZ1bGwuZG9tYWluW2ZpbHRlcmRvbWFpbl0uY2F0ZWdvcmllc1tjYXRlZ29yeV0sXG4gICAgICAgIGRpc3RpbmN0OiBkaXN0aW5jdCxcbiAgICAgICAgZGVsdGE6IGRlbHRhLFxuICAgICAgICBwcmVzZW50UmVjb3JkczogcmVjb3JkQ291bnQucHJlc2VudHJlY29yZHMsXG4gICAgICAgIHBlcmNQcmVzZW50OiBwZXJjZW50LFxuICAgICAgICBzYW1wbGVWYWx1ZXM6IHZhbHVlc0xpc3RcbiAgICB9O1xufVxuZXhwb3J0cy5nZXRDYXRlZ29yeVN0YXRzSW5Eb21haW4gPSBnZXRDYXRlZ29yeVN0YXRzSW5Eb21haW47XG5mdW5jdGlvbiBkZXNjcmliZUNhdGVnb3J5SW5Eb21haW4oY2F0ZWdvcnksIGZpbHRlcmRvbWFpbiwgdGhlTW9kZWwpIHtcbiAgICAvKiAgY29uc3QgcmVjb3JkQ291bnQgPSBjb3VudFJlY29yZFByZXNlbmNlKGNhdGVnb3J5LCBmaWx0ZXJkb21haW4sIHRoZU1vZGVsKTtcbiAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHRoZU1vZGVsLnJlY29yZHMuZmlsdGVyKGEgPT4gYS5fZG9tYWluID09PSBcIkNvc21vc1wiKSx1bmRlZmluZWQsMikpO1xuICAgICAgY29uc3QgcGVyY2VudCA9IHRvUGVyY2VudChyZWNvcmRDb3VudC5wcmVzZW50cmVjb3JkcyAsIHJlY29yZENvdW50LnRvdGFscmVjb3Jkcyk7XG4gICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRDb3VudC52YWx1ZXMpKTtcbiAgICAgIHZhciBhbGxWYWx1ZXMgPU9iamVjdC5rZXlzKHJlY29yZENvdW50LnZhbHVlcyk7XG4gICAgICB2YXIgcmVhbHZhbHVlcyA9IGFsbFZhbHVlcy5maWx0ZXIodmFsdWUgPT4gKHZhbHVlICE9PSAndW5kZWZpbmVkJykgJiYgKHZhbHVlICE9PSAnbi9hJykpO1xuICAgICAgZGVidWdsb2dcbiAgICAgIHJlYWx2YWx1ZXMuc29ydCgpO1xuICAgICAgdmFyIHVuZGVmTmFEZWx0YSA9ICAoYWxsVmFsdWVzLmxlbmd0aCAtIHJlYWx2YWx1ZXMubGVuZ3RoKTtcbiAgICAgIHZhciBkZWx0YSA9ICAodW5kZWZOYURlbHRhKSA/ICBcIigrXCIgKyB1bmRlZk5hRGVsdGEgKyBcIilcIiA6IFwiXCI7XG4gICAgICBjb25zdCBkaXN0aW5jdCA9ICcnICsgcmVhbHZhbHVlcy5sZW5ndGg7XG4gICAgXG4gICAgICBjb25zdCB2YWx1ZXNMaXN0ID0gbWFrZVZhbHVlc0xpc3RTdHJpbmcocmVhbHZhbHVlcyk7XG4gICAgKi9cbiAgICB2YXIgc3RhdHMgPSBnZXRDYXRlZ29yeVN0YXRzSW5Eb21haW4oY2F0ZWdvcnksIGZpbHRlcmRvbWFpbiwgdGhlTW9kZWwpO1xuICAgIHZhciByZXMgPSAnaXMgYSBjYXRlZ29yeSBpbiBkb21haW4gXCInICsgZmlsdGVyZG9tYWluICsgJ1wiXFxuJ1xuICAgICAgICArIChcIkl0IGlzIHByZXNlbnQgaW4gXCIgKyBzdGF0cy5wcmVzZW50UmVjb3JkcyArIFwiIChcIiArIHN0YXRzLnBlcmNQcmVzZW50ICsgXCIlKSBvZiByZWNvcmRzIGluIHRoaXMgZG9tYWluLFxcblwiKSArXG4gICAgICAgIChcImhhdmluZyBcIiArIChzdGF0cy5kaXN0aW5jdCArICcnKSArIHN0YXRzLmRlbHRhICsgXCIgZGlzdGluY3QgdmFsdWVzLlxcblwiKVxuICAgICAgICArIHN0YXRzLnNhbXBsZVZhbHVlcztcbiAgICB2YXIgZGVzYyA9IHRoZU1vZGVsLmZ1bGwuZG9tYWluW2ZpbHRlcmRvbWFpbl0uY2F0ZWdvcmllc1tjYXRlZ29yeV0gfHwge307XG4gICAgdmFyIGRlc2NyaXB0aW9uID0gZGVzYy5kZXNjcmlwdGlvbiB8fCBcIlwiO1xuICAgIGlmIChkZXNjcmlwdGlvbikge1xuICAgICAgICByZXMgKz0gXCJcXG5EZXNjcmlwdGlvbjogXCIgKyBkZXNjcmlwdGlvbjtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluID0gZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluO1xuZnVuY3Rpb24gZmluZFJlY29yZHNXaXRoRmFjdChtYXRjaGVkU3RyaW5nLCBjYXRlZ29yeSwgcmVjb3JkcywgZG9tYWlucykge1xuICAgIHJldHVybiByZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgIHZhciByZXMgPSAocmVjb3JkW2NhdGVnb3J5XSA9PT0gbWF0Y2hlZFN0cmluZyk7XG4gICAgICAgIGlmIChyZXMpIHtcbiAgICAgICAgICAgIGluY3JlbWVudChkb21haW5zLCByZWNvcmRzLl9kb21haW4pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfSk7XG59XG5leHBvcnRzLmZpbmRSZWNvcmRzV2l0aEZhY3QgPSBmaW5kUmVjb3Jkc1dpdGhGYWN0O1xuZnVuY3Rpb24gaW5jcmVtZW50KG1hcCwga2V5KSB7XG4gICAgbWFwW2tleV0gPSAobWFwW2tleV0gfHwgMCkgKyAxO1xufVxuZXhwb3J0cy5pbmNyZW1lbnQgPSBpbmNyZW1lbnQ7XG5mdW5jdGlvbiBzb3J0ZWRLZXlzKG1hcCkge1xuICAgIHZhciByID0gT2JqZWN0LmtleXMobWFwKTtcbiAgICByLnNvcnQoKTtcbiAgICByZXR1cm4gcjtcbn1cbmZ1bmN0aW9uIGRlc2NyaWJlRG9tYWluKGZhY3QsIGRvbWFpbiwgdGhlTW9kZWwpIHtcbiAgICB2YXIgY291bnQgPSB0aGVNb2RlbC5yZWNvcmRzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgcmVjb3JkKSB7XG4gICAgICAgIHJldHVybiBwcmV2ICsgKChyZWNvcmQuX2RvbWFpbiA9PT0gZG9tYWluKSA/IDEgOiAwKTtcbiAgICB9LCAwKTtcbiAgICB2YXIgY2F0Y291bnQgPSBmZGV2c3RhX21vbm1vdmVfMS5Nb2RlbC5nZXRDYXRlZ29yaWVzRm9yRG9tYWluKHRoZU1vZGVsLCBkb21haW4pLmxlbmd0aDtcbiAgICB2YXIgcmVzID0gc2xvcHB5T3JFeGFjdChkb21haW4sIGZhY3QsIHRoZU1vZGVsKSArIChcImlzIGEgZG9tYWluIHdpdGggXCIgKyBjYXRjb3VudCArIFwiIGNhdGVnb3JpZXMgYW5kIFwiICsgY291bnQgKyBcIiByZWNvcmRzXFxuXCIpO1xuICAgIHZhciBkZXNjID0gdGhlTW9kZWwuZnVsbC5kb21haW5bZG9tYWluXS5kZXNjcmlwdGlvbiB8fCBcIlwiO1xuICAgIGlmIChkZXNjKSB7XG4gICAgICAgIHJlcyArPSBcIkRlc2NyaXB0aW9uOlwiICsgZGVzYyArIFwiXFxuXCI7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmRlc2NyaWJlRG9tYWluID0gZGVzY3JpYmVEb21haW47XG5mdW5jdGlvbiBkZXNjcmliZUZhY3RJbkRvbWFpbihmYWN0LCBmaWx0ZXJkb21haW4sIHRoZU1vZGVsKSB7XG4gICAgdmFyIHNlbnRlbmNlcyA9IFdoYXRJcy5hbmFseXplQ29udGV4dFN0cmluZyhmYWN0LCB0aGVNb2RlbC5ydWxlcyk7XG4gICAgLy9jb25zb2xlLmxvZyhcImhlcmUgc2VudGVuY2VzIFwiICsgSlNPTi5zdHJpbmdpZnkoc2VudGVuY2VzKSk7XG4gICAgdmFyIGxlbmd0aE9uZVNlbnRlbmNlcyA9IHNlbnRlbmNlcy5zZW50ZW5jZXMuZmlsdGVyKGZ1bmN0aW9uIChvU2VudGVuY2UpIHsgcmV0dXJuIG9TZW50ZW5jZS5sZW5ndGggPT09IDE7IH0pO1xuICAgIHZhciByZXMgPSAnJztcbiAgICAvLyByZW1vdmUgY2F0ZWdvcmllcyBhbmQgZG9tYWluc1xuICAgIHZhciBvbmx5RmFjdHMgPSBsZW5ndGhPbmVTZW50ZW5jZXMuZmlsdGVyKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlWzBdKSk7XG4gICAgICAgIHJldHVybiAhYWJvdF9lcmJhc2VfMS5Xb3JkLldvcmQuaXNEb21haW4ob1NlbnRlbmNlWzBdKSAmJlxuICAgICAgICAgICAgIWFib3RfZXJiYXNlXzEuV29yZC5Xb3JkLmlzRmlsbGVyKG9TZW50ZW5jZVswXSkgJiYgIWFib3RfZXJiYXNlXzEuV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1NlbnRlbmNlWzBdKTtcbiAgICB9KTtcbiAgICB2YXIgb25seURvbWFpbnMgPSBsZW5ndGhPbmVTZW50ZW5jZXMuZmlsdGVyKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgcmV0dXJuIGFib3RfZXJiYXNlXzEuV29yZC5Xb3JkLmlzRG9tYWluKG9TZW50ZW5jZVswXSk7XG4gICAgfSk7XG4gICAgaWYgKG9ubHlEb21haW5zICYmIG9ubHlEb21haW5zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkob25seURvbWFpbnMpKTtcbiAgICAgICAgb25seURvbWFpbnMuZm9yRWFjaChmdW5jdGlvbiAoc2VudGVuY2UpIHtcbiAgICAgICAgICAgIHZhciBkb21haW4gPSBzZW50ZW5jZVswXS5tYXRjaGVkU3RyaW5nO1xuICAgICAgICAgICAgaWYgKCFmaWx0ZXJkb21haW4gfHwgZG9tYWluID09PSBmaWx0ZXJkb21haW4pIHtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZyhcImhlcmUgbWF0Y2ggXCIgKyBKU09OLnN0cmluZ2lmeShzZW50ZW5jZSkpO1xuICAgICAgICAgICAgICAgIHJlcyArPSBkZXNjcmliZURvbWFpbihmYWN0LCBzZW50ZW5jZVswXS5tYXRjaGVkU3RyaW5nLCB0aGVNb2RlbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBkZWJ1Z2xvZyhcIm9ubHkgZmFjdHM6IFwiICsgSlNPTi5zdHJpbmdpZnkob25seUZhY3RzKSk7XG4gICAgdmFyIHJlY29yZE1hcCA9IHt9O1xuICAgIHZhciBkb21haW5zTWFwID0ge307XG4gICAgdmFyIG1hdGNoZWR3b3JkTWFwID0ge307XG4gICAgdmFyIG1hdGNoZWRDYXRlZ29yeU1hcCA9IHt9O1xuICAgIC8vIGxvb2sgZm9yIGFsbCByZWNvcmRzXG4gICAgb25seUZhY3RzLmZvckVhY2goZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICByZXR1cm4gb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgICBpbmNyZW1lbnQobWF0Y2hlZHdvcmRNYXAsIG9Xb3JkLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICAgICAgaW5jcmVtZW50KG1hdGNoZWRDYXRlZ29yeU1hcCwgb1dvcmQuY2F0ZWdvcnkpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICAvLyB3ZSBoYXZlOlxuICAgIC8vIGEgbGlzdCBvZiBjYXRlZ29yaWVzLFxuICAgIC8vIGEgbGlzdCBvZiBtYXRjaGVkV29yZHMgIC0+XG4gICAgLy9cbiAgICB2YXIgY2F0ZWdvcmllcyA9IHNvcnRlZEtleXMobWF0Y2hlZENhdGVnb3J5TWFwKTtcbiAgICB2YXIgbWF0Y2hlZHdvcmRzID0gc29ydGVkS2V5cyhtYXRjaGVkd29yZE1hcCk7XG4gICAgZGVidWdsb2coXCJtYXRjaGVkd29yZHM6IFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZHdvcmRzKSk7XG4gICAgZGVidWdsb2coXCJjYXRlZ29yaWVzOiBcIiArIEpTT04uc3RyaW5naWZ5KGNhdGVnb3JpZXMpKTtcbiAgICAvL3ZhciBhbGxNYXRjaGVkV29yZHMgPSB7IFtrZXkgOiBzdHJpbmddIDogbnVtYmVyIH07XG4gICAgdmFyIGRvbWFpblJlY29yZENvdW50ID0ge307XG4gICAgdmFyIGRvbWFpbk1hdGNoQ2F0Q291bnQgPSB7fTtcbiAgICAvLyB3ZSBwcmVwYXJlIHRoZSBmb2xsb3dpbmcgc3RydWN0dXJlXG4gICAgLy9cbiAgICAvLyB7ZG9tYWlufSA6IHJlY29yZGNvdW50O1xuICAgIC8vIHttYXRjaGVkd29yZHN9IDpcbiAgICAvLyB7ZG9tYWlufSB7bWF0Y2hlZHdvcmR9IHtjYXRlZ29yeX0gcHJlc2VuY2Vjb3VudFxuICAgIHRoZU1vZGVsLnJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgIGlmICghZmlsdGVyZG9tYWluIHx8IHJlY29yZC5fZG9tYWluID09PSBmaWx0ZXJkb21haW4pIHtcbiAgICAgICAgICAgIGRvbWFpblJlY29yZENvdW50W3JlY29yZC5fZG9tYWluXSA9IChkb21haW5SZWNvcmRDb3VudFtyZWNvcmQuX2RvbWFpbl0gfHwgMCkgKyAxO1xuICAgICAgICAgICAgbWF0Y2hlZHdvcmRzLmZvckVhY2goZnVuY3Rpb24gKG1hdGNoZWR3b3JkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhdGVnb3JpZXMuZm9yRWFjaChmdW5jdGlvbiAoY2F0ZWdvcnkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlY29yZFtjYXRlZ29yeV0gPT09IG1hdGNoZWR3b3JkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWQgPSBkb21haW5NYXRjaENhdENvdW50W3JlY29yZC5fZG9tYWluXSA9IGRvbWFpbk1hdGNoQ2F0Q291bnRbcmVjb3JkLl9kb21haW5dIHx8IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1kYyA9IG1kW21hdGNoZWR3b3JkXSA9IG1kW21hdGNoZWR3b3JkXSB8fCB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY3JlbWVudChtZGMsIGNhdGVnb3J5KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICA7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRvbWFpbk1hdGNoQ2F0Q291bnQsIHVuZGVmaW5lZCwgMikpO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRvbWFpblJlY29yZENvdW50LCB1bmRlZmluZWQsIDIpKTtcbiAgICB2YXIgZG9tYWlucyA9IHNvcnRlZEtleXMoZG9tYWluTWF0Y2hDYXRDb3VudCk7XG4gICAgdmFyIHJlc05leHQgPSAnXCInICsgZmFjdCArICdcIiBoYXMgYSBtZWFuaW5nIGluICc7XG4gICAgdmFyIHNpbmdsZSA9IGZhbHNlO1xuICAgIGlmIChPYmplY3Qua2V5cyhkb21haW5NYXRjaENhdENvdW50KS5sZW5ndGggPiAxKSB7XG4gICAgICAgIHJlc05leHQgKz0gJycgKyBkb21haW5zLmxlbmd0aCArXG4gICAgICAgICAgICAnIGRvbWFpbnM6ICcgKyBVdGlscy5saXN0VG9RdW90ZWRDb21tYUFuZChkb21haW5zKSArIFwiXCI7XG4gICAgfVxuICAgIGVsc2UgaWYgKGRvbWFpbnMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIGlmICghZmlsdGVyZG9tYWluKSB7XG4gICAgICAgICAgICByZXNOZXh0ICs9IFwib25lIFwiO1xuICAgICAgICB9XG4gICAgICAgIHJlc05leHQgKz0gXCJkb21haW4gXFxcIlwiICsgZG9tYWluc1swXSArIFwiXFxcIjpcIjtcbiAgICAgICAgc2luZ2xlID0gdHJ1ZTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGlmIChyZXMpIHtcbiAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGZhY3RjbGVhbiA9IFV0aWxzLnN0cmlwUXVvdGVzKGZhY3QpO1xuICAgICAgICBpZiAoZmlsdGVyZG9tYWluKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJcXFwiXCIgKyBmYWN0Y2xlYW4gKyBcIlxcXCIgaXMgbm8ga25vd24gZmFjdCBpbiBkb21haW4gXFxcIlwiICsgZmlsdGVyZG9tYWluICsgXCJcXFwiLlxcblwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBcIkkgZG9uJ3Qga25vdyBhbnl0aGluZyBhYm91dCBcXFwiXCIgKyBmYWN0Y2xlYW4gKyBcIlxcXCIuXFxuXCI7XG4gICAgfVxuICAgIHJlcyArPSByZXNOZXh0ICsgXCJcXG5cIjsgLy8gLi4uXFxuXCI7XG4gICAgZG9tYWlucy5mb3JFYWNoKGZ1bmN0aW9uIChkb21haW4pIHtcbiAgICAgICAgdmFyIG1kID0gZG9tYWluTWF0Y2hDYXRDb3VudFtkb21haW5dO1xuICAgICAgICBPYmplY3Qua2V5cyhtZCkuZm9yRWFjaChmdW5jdGlvbiAobWF0Y2hlZHN0cmluZykge1xuICAgICAgICAgICAgdmFyIG1kYyA9IG1kW21hdGNoZWRzdHJpbmddO1xuICAgICAgICAgICAgaWYgKCFzaW5nbGUpIHtcbiAgICAgICAgICAgICAgICByZXMgKz0gJ2luIGRvbWFpbiBcIicgKyBkb21haW4gKyAnXCIgJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBjYXRzaW5nbGUgPSBPYmplY3Qua2V5cyhtZGMpLmxlbmd0aCA9PT0gMTtcbiAgICAgICAgICAgIHJlcyArPSBzbG9wcHlPckV4YWN0KG1hdGNoZWRzdHJpbmcsIGZhY3QsIHRoZU1vZGVsKSArIFwiIFwiO1xuICAgICAgICAgICAgaWYgKCFjYXRzaW5nbGUpIHtcbiAgICAgICAgICAgICAgICByZXMgKz0gXCIuLi5cXG5cIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIE9iamVjdC5rZXlzKG1kYykuZm9yRWFjaChmdW5jdGlvbiAoY2F0ZWdvcnkpIHtcbiAgICAgICAgICAgICAgICB2YXIgcGVyY2VudCA9IHRvUGVyY2VudChtZGNbY2F0ZWdvcnldLCBkb21haW5SZWNvcmRDb3VudFtkb21haW5dKTtcbiAgICAgICAgICAgICAgICByZXMgKz0gXCJpcyBhIHZhbHVlIGZvciBjYXRlZ29yeSBcXFwiXCIgKyBjYXRlZ29yeSArIFwiXFxcIiBwcmVzZW50IGluIFwiICsgbWRjW2NhdGVnb3J5XSArIFwiKFwiICsgcGVyY2VudCArIFwiJSkgb2YgcmVjb3JkcztcXG5cIjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5kZXNjcmliZUZhY3RJbkRvbWFpbiA9IGRlc2NyaWJlRmFjdEluRG9tYWluO1xuZnVuY3Rpb24gZGVzY3JpYmVDYXRlZ29yeShjYXRlZ29yeSwgZmlsdGVyRG9tYWluLCBtb2RlbCwgbWVzc2FnZSkge1xuICAgIHZhciByZXMgPSBbXTtcbiAgICB2YXIgZG9tcyA9IGZkZXZzdGFfbW9ubW92ZV8xLk1vZGVsLmdldERvbWFpbnNGb3JDYXRlZ29yeShtb2RlbCwgY2F0ZWdvcnkpO1xuICAgIGlmIChmaWx0ZXJEb21haW4pIHtcbiAgICAgICAgaWYgKGRvbXMuaW5kZXhPZihmaWx0ZXJEb21haW4pID49IDApIHtcbiAgICAgICAgICAgIHJlcy5wdXNoKGRlc2NyaWJlQ2F0ZWdvcnlJbkRvbWFpbihjYXRlZ29yeSwgZmlsdGVyRG9tYWluLCBtb2RlbCkpO1xuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBkb21zLnNvcnQoKTtcbiAgICBkb21zLmZvckVhY2goZnVuY3Rpb24gKGRvbWFpbikge1xuICAgICAgICByZXMucHVzaChkZXNjcmliZUNhdGVnb3J5SW5Eb21haW4oY2F0ZWdvcnksIGRvbWFpbiwgbW9kZWwpKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5kZXNjcmliZUNhdGVnb3J5ID0gZGVzY3JpYmVDYXRlZ29yeTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
