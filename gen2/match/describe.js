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
var Word = require("./word");
var WhatIs = require("./whatis");
var Model = require("../model/model");
var Utils = require("../utils/utils");
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
    var catcount = Model.getCategoriesForDomain(theModel, domain).length;
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
        return !Word.Word.isDomain(oSentence[0]) && !Word.Word.isFiller(oSentence[0]) && !Word.Word.isCategory(oSentence[0]);
    });
    var onlyDomains = lengthOneSentences.filter(function (oSentence) {
        return Word.Word.isDomain(oSentence[0]);
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
    var doms = Model.getDomainsForCategory(model, category);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9kZXNjcmliZS50cyIsIm1hdGNoL2Rlc2NyaWJlLmpzIl0sIm5hbWVzIjpbIkFsZ29sIiwicmVxdWlyZSIsImRlYnVnIiwiZGVidWdsb2ciLCJsb2dnZXIiLCJsb2dQZXJmIiwicGVyZiIsInBlcmZsb2ciLCJXb3JkIiwiV2hhdElzIiwiTW9kZWwiLCJVdGlscyIsInNXb3JkcyIsImlzU3lub255bUZvciIsImV4YWN0V29yZCIsInNsb3BweVdvcmQiLCJ0aGVNb2RlbCIsImV4cG9ydHMiLCJzbG9wcHlPckV4YWN0IiwidG9Mb3dlckNhc2UiLCJjb3VudFJlY29yZFByZXNlbmNlIiwiY2F0ZWdvcnkiLCJkb21haW4iLCJyZXMiLCJ0b3RhbHJlY29yZHMiLCJwcmVzZW50cmVjb3JkcyIsInZhbHVlcyIsIm11bHRpdmFsdWVkIiwicmVjb3JkcyIsImZvckVhY2giLCJyZWNvcmQiLCJfZG9tYWluIiwidmFsIiwidmFsYXJyIiwiQXJyYXkiLCJpc0FycmF5IiwidW5kZWZpbmVkIiwiY291bnRSZWNvcmRQcmVzZW5jZUZhY3QiLCJmYWN0IiwiaW5kZXhPZiIsIm1ha2VWYWx1ZXNMaXN0U3RyaW5nIiwicmVhbHZhbHVlcyIsInZhbHVlc1N0cmluZyIsInRvdGFsbGVuIiwibGlzdFZhbHVlcyIsImZpbHRlciIsImluZGV4IiwibGVuZ3RoIiwiRGVzY3JpYmVWYWx1ZUxpc3RNaW5Db3VudFZhbHVlTGlzdCIsIkRlc2NyaWJlVmFsdWVMaXN0TGVuZ3RoQ2hhckxpbWl0IiwibWF4bGVuIiwicmVkdWNlIiwicHJldiIsIk1hdGgiLCJtYXgiLCJsaXN0IiwibGlzdFRvUXVvdGVkQ29tbWFPciIsImpvaW4iLCJ0b1BlcmNlbnQiLCJhIiwiYiIsInRvRml4ZWQiLCJnZXRDYXRlZ29yeVN0YXRzSW5Eb21haW4iLCJmaWx0ZXJkb21haW4iLCJyZWNvcmRDb3VudCIsIkpTT04iLCJzdHJpbmdpZnkiLCJwZXJjZW50IiwiYWxsVmFsdWVzIiwiT2JqZWN0Iiwia2V5cyIsInZhbHVlIiwic29ydCIsInVuZGVmTmFEZWx0YSIsImRlbHRhIiwiZGlzdGluY3QiLCJ2YWx1ZXNMaXN0IiwiY2F0ZWdvcnlEZXNjIiwiZnVsbCIsImNhdGVnb3JpZXMiLCJwcmVzZW50UmVjb3JkcyIsInBlcmNQcmVzZW50Iiwic2FtcGxlVmFsdWVzIiwiZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluIiwic3RhdHMiLCJkZXNjIiwiZGVzY3JpcHRpb24iLCJmaW5kUmVjb3Jkc1dpdGhGYWN0IiwibWF0Y2hlZFN0cmluZyIsImRvbWFpbnMiLCJpbmNyZW1lbnQiLCJtYXAiLCJrZXkiLCJzb3J0ZWRLZXlzIiwiciIsImRlc2NyaWJlRG9tYWluIiwiY291bnQiLCJjYXRjb3VudCIsImdldENhdGVnb3JpZXNGb3JEb21haW4iLCJkZXNjcmliZUZhY3RJbkRvbWFpbiIsInNlbnRlbmNlcyIsImFuYWx5emVDb250ZXh0U3RyaW5nIiwicnVsZXMiLCJsZW5ndGhPbmVTZW50ZW5jZXMiLCJvU2VudGVuY2UiLCJvbmx5RmFjdHMiLCJpc0RvbWFpbiIsImlzRmlsbGVyIiwiaXNDYXRlZ29yeSIsIm9ubHlEb21haW5zIiwic2VudGVuY2UiLCJyZWNvcmRNYXAiLCJkb21haW5zTWFwIiwibWF0Y2hlZHdvcmRNYXAiLCJtYXRjaGVkQ2F0ZWdvcnlNYXAiLCJvV29yZCIsIm1hdGNoZWR3b3JkcyIsImRvbWFpblJlY29yZENvdW50IiwiZG9tYWluTWF0Y2hDYXRDb3VudCIsIm1hdGNoZWR3b3JkIiwibWQiLCJtZGMiLCJyZXNOZXh0Iiwic2luZ2xlIiwibGlzdFRvUXVvdGVkQ29tbWFBbmQiLCJmYWN0Y2xlYW4iLCJzdHJpcFF1b3RlcyIsIm1hdGNoZWRzdHJpbmciLCJjYXRzaW5nbGUiLCJkZXNjcmliZUNhdGVnb3J5IiwiZmlsdGVyRG9tYWluIiwibW9kZWwiLCJtZXNzYWdlIiwiZG9tcyIsImdldERvbWFpbnNGb3JDYXRlZ29yeSIsInB1c2giXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7OztBQ1FBOztBREdB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Q0Q7QUFoQkROLFFBQUFnSCxnQkFBQSxHQUFBQSxnQkFBQSIsImZpbGUiOiJtYXRjaC9kZXNjcmliZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICpcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmV4cGxhaW5cbiAqIEBmaWxlIGV4cGxhaW4udHNcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cbiAqXG4gKiBGdW5jdGlvbnMgZGVhbGluZyB3aXRoIGV4cGxhaW5pbmcgZmFjdHMsIGNhdGVnb3JpZXMgZXRjLlxuICovXG5cblxuaW1wb3J0ICogYXMgSW5wdXRGaWx0ZXIgZnJvbSAnLi9pbnB1dEZpbHRlcic7XG5pbXBvcnQgKiBhcyBBbGdvbCBmcm9tICcuL2FsZ29sJztcbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcblxuY29uc3QgZGVidWdsb2cgPSBkZWJ1ZygnZGVzY3JpYmUnKTtcbmltcG9ydCAqIGFzIGxvZ2dlciBmcm9tICcuLi91dGlscy9sb2dnZXInO1xudmFyIGxvZ1BlcmYgPSBsb2dnZXIucGVyZihcInBlcmZsaXN0YWxsXCIpO1xudmFyIHBlcmZsb2cgPSBkZWJ1ZygncGVyZicpO1xuLy9jb25zdCBwZXJmbG9nID0gbG9nZ2VyLnBlcmYoXCJwZXJmbGlzdGFsbFwiKTtcblxuaW1wb3J0ICogYXMgSU1hdGNoIGZyb20gJy4vaWZtYXRjaCc7XG5cbmltcG9ydCAqIGFzIFRvb2xtYXRjaGVyIGZyb20gJy4vdG9vbG1hdGNoZXInO1xuaW1wb3J0ICogYXMgQnJlYWtEb3duIGZyb20gJy4vYnJlYWtkb3duJztcblxuaW1wb3J0ICogYXMgU2VudGVuY2UgZnJvbSAnLi9zZW50ZW5jZSc7XG5cbmltcG9ydCAqIGFzIFdvcmQgZnJvbSAnLi93b3JkJztcbmltcG9ydCAqIGFzIE9wZXJhdG9yIGZyb20gJy4vb3BlcmF0b3InO1xuXG5pbXBvcnQgKiBhcyBXaGF0SXMgZnJvbSAnLi93aGF0aXMnO1xuXG5pbXBvcnQgKiBhcyBNb2RlbCBmcm9tICcuLi9tb2RlbC9tb2RlbCc7XG5pbXBvcnQgKiBhcyBNYXRjaCBmcm9tICcuL21hdGNoJztcblxuXG5pbXBvcnQgKiBhcyBVdGlscyBmcm9tICcuLi91dGlscy91dGlscyc7XG5cblxudmFyIHNXb3JkcyA9IHt9O1xuXG5leHBvcnQgZnVuY3Rpb24gaXNTeW5vbnltRm9yKGV4YWN0V29yZCA6IHN0cmluZywgc2xvcHB5V29yZCA6IHN0cmluZywgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzKSA6IGJvb2xlYW4ge1xuICAvLyBUT0RPOiB1c2UgbW9kZWwgc3lub255bXNcbiAgcmV0dXJuIHNsb3BweVdvcmQgPT09IFwibmFtZVwiICYmIGV4YWN0V29yZCA9PT0gXCJlbGVtZW50IG5hbWVcIjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNsb3BweU9yRXhhY3QoZXhhY3RXb3JkIDogc3RyaW5nLCBzbG9wcHlXb3JkIDogc3RyaW5nLCB0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMpIHtcbiAgaWYoZXhhY3RXb3JkLnRvTG93ZXJDYXNlKCkgPT09IHNsb3BweVdvcmQudG9Mb3dlckNhc2UoKSkge1xuICAgIHJldHVybiAnXCInICsgc2xvcHB5V29yZCArICdcIic7XG4gIH1cbiAgLy8gVE9ETywgZmluZCBwbHVyYWwgcyBldGMuXG4gIC8vIHN0aWxsIGV4YWN0LFxuICAvL1xuICBpZihpc1N5bm9ueW1Gb3IoZXhhY3RXb3JkLHNsb3BweVdvcmQsdGhlTW9kZWwpKSB7XG5yZXR1cm4gJ1wiJyArIHNsb3BweVdvcmQgKyAnXCIgKGludGVycHJldGVkIGFzIHN5bm9ueW0gZm9yIFwiJyArIGV4YWN0V29yZCArJ1wiKSc7XG4gIH1cbiAgLy90b2RvLCBmaW5kIGlzIHN5bm9ueW1mb3IgLi4uXG4gIC8vIFRPRE8sIGEgc3lub255bSBmb3IgLi4uXG4gIHJldHVybiAnXCInICsgc2xvcHB5V29yZCArICdcIiAoaW50ZXJwcmV0ZWQgYXMgXCInICsgZXhhY3RXb3JkICsnXCIpJztcbn1cblxuaW50ZXJmYWNlIElEZXNjcmliZUNhdGVnb3J5IHtcbiAgICB0b3RhbHJlY29yZHMgOiBudW1iZXIsXG4gICAgcHJlc2VudHJlY29yZHMgOiBudW1iZXIsXG4gICAgdmFsdWVzIDogeyBba2V5IDogc3RyaW5nXSA6IG51bWJlcn0sXG4gICAgbXVsdGl2YWx1ZWQgOiBib29sZWFuXG4gIH1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvdW50UmVjb3JkUHJlc2VuY2UoY2F0ZWdvcnkgOiBzdHJpbmcsIGRvbWFpbiA6IHN0cmluZywgdGhlTW9kZWwgOiBJTWF0Y2guSU1vZGVscykgOiBJRGVzY3JpYmVDYXRlZ29yeSB7XG4gIHZhciByZXMgPSB7IHRvdGFscmVjb3JkcyA6IDAsXG4gICAgcHJlc2VudHJlY29yZHMgOiAwLFxuICAgIHZhbHVlcyA6IHsgfSwgIC8vIGFuIHRoZWlyIGZyZXF1ZW5jeVxuICAgIG11bHRpdmFsdWVkIDogZmFsc2VcbiAgfSBhcyBJRGVzY3JpYmVDYXRlZ29yeTtcbiAgdGhlTW9kZWwucmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uKHJlY29yZCkge1xuICAgIC8vZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkLHVuZGVmaW5lZCwyKSk7XG4gICAgaWYocmVjb3JkLl9kb21haW4gIT09IGRvbWFpbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXMudG90YWxyZWNvcmRzKys7XG4gICAgdmFyIHZhbCA9IHJlY29yZFtjYXRlZ29yeV07XG4gICAgdmFyIHZhbGFyciA9IFt2YWxdO1xuICAgIGlmKEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgcmVzLm11bHRpdmFsdWVkID0gdHJ1ZTtcbiAgICAgIHZhbGFyciA9IHZhbDtcbiAgICB9XG4gICAgLy8gdG9kbyB3cmFwIGFyclxuICAgIGlmKHZhbCAhPT0gdW5kZWZpbmVkICYmIHZhbCAhPT0gXCJuL2FcIikge1xuICAgICAgcmVzLnByZXNlbnRyZWNvcmRzICsrO1xuICAgIH1cbiAgICB2YWxhcnIuZm9yRWFjaChmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJlcy52YWx1ZXNbdmFsXSA9IChyZXMudmFsdWVzW3ZhbF0gfHwgMCkgKyAxO1xuICAgIH0pXG4gIH0pXG4gIHJldHVybiByZXM7XG59XG5cbi8vIGNhdGVnb3J5ID0+IG1hdGNoZWR3b3Jkc1tdO1xuXG5pbnRlcmZhY2UgSURlc2NyaWJlRmFjdCB7XG4gICAgdG90YWxyZWNvcmRzIDogbnVtYmVyLFxuICAgIHByZXNlbnRyZWNvcmRzIDogbnVtYmVyLFxuICAgIG11bHRpdmFsdWVkIDogYm9vbGVhblxuICB9XG5cbmV4cG9ydCBmdW5jdGlvbiBjb3VudFJlY29yZFByZXNlbmNlRmFjdChmYWN0IDogc3RyaW5nLCBjYXRlZ29yeSA6IHN0cmluZywgZG9tYWluIDogc3RyaW5nLCB0aGVNb2RlbCA6IElNYXRjaC5JTW9kZWxzKSA6IElEZXNjcmliZUZhY3Qge1xuICB2YXIgcmVzID0geyB0b3RhbHJlY29yZHMgOiAwLFxuICAgIHByZXNlbnRyZWNvcmRzIDogMCxcbiAgICB2YWx1ZXMgOiB7IH0sICAvLyBhbiB0aGVpciBmcmVxdWVuY3lcbiAgICBtdWx0aXZhbHVlZCA6IGZhbHNlXG4gIH0gYXMgSURlc2NyaWJlQ2F0ZWdvcnk7XG4gIHRoZU1vZGVsLnJlY29yZHMuZm9yRWFjaChmdW5jdGlvbihyZWNvcmQpIHtcbiAgICAvL2RlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZCx1bmRlZmluZWQsMikpO1xuICAgIGlmKHJlY29yZC5fZG9tYWluICE9PSBkb21haW4pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmVzLnRvdGFscmVjb3JkcysrO1xuICAgIHZhciB2YWwgPSByZWNvcmRbY2F0ZWdvcnldO1xuICAgIHZhciB2YWxhcnIgPSBbdmFsXTtcbiAgICBpZihBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICAgIGlmKHZhbC5pbmRleE9mKGZhY3QpID49IDApIHtcbiAgICAgICAgcmVzLm11bHRpdmFsdWVkID0gdHJ1ZTtcbiAgICAgICAgdmFsYXJyID0gdmFsO1xuICAgICAgICByZXMucHJlc2VudHJlY29yZHMrKztcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHZhbCA9PT0gZmFjdCkge1xuICAgICAgICByZXMucHJlc2VudHJlY29yZHMrKztcbiAgICB9XG4gIH0pXG4gIHJldHVybiByZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWtlVmFsdWVzTGlzdFN0cmluZyhyZWFsdmFsdWVzOiBzdHJpbmdbXSkgOiBzdHJpbmcge1xuICB2YXIgdmFsdWVzU3RyaW5nID0gXCJcIjtcbiAgdmFyIHRvdGFsbGVuID0gMDtcbiAgdmFyIGxpc3RWYWx1ZXMgPSByZWFsdmFsdWVzLmZpbHRlcihmdW5jdGlvbih2YWwsIGluZGV4KSB7XG4gICAgdG90YWxsZW4gPSB0b3RhbGxlbiArIHZhbC5sZW5ndGg7XG4gIHJldHVybiAoaW5kZXggPCBBbGdvbC5EZXNjcmliZVZhbHVlTGlzdE1pbkNvdW50VmFsdWVMaXN0KSB8fCAodG90YWxsZW4gPCBBbGdvbC5EZXNjcmliZVZhbHVlTGlzdExlbmd0aENoYXJMaW1pdCk7XG4gIH0pO1xuICBpZihsaXN0VmFsdWVzLmxlbmd0aCA9PT0gMSAmJiByZWFsdmFsdWVzLmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiAnVGhlIHNvbGUgdmFsdWUgaXMgXFxcIicgKyBsaXN0VmFsdWVzWzBdICsgJ1wiJztcbiAgfVxuICB2YXIgbWF4bGVuID0gbGlzdFZhbHVlcy5yZWR1Y2UoIChwcmV2LHZhbCkgPT4gTWF0aC5tYXgocHJldix2YWwubGVuZ3RoKSwwKTtcbiAgaWYobWF4bGVuID4gMzApIHtcbiAgICByZXR1cm4gXCJQb3NzaWJsZSB2YWx1ZXMgYXJlIC4uLlxcblwiICtcbiAgICAgIGxpc3RWYWx1ZXMucmVkdWNlKCAocHJldix2YWwsaW5kZXgpID0+IChwcmV2ICsgXCIoXCIgKyAoaW5kZXggKyAxKSArICcpOiBcIicgKyB2YWwgKyAnXCJcXG4nXG4gICAgICApLFwiXCIpXG4gICAgICArICggbGlzdFZhbHVlcy5sZW5ndGggPT09IHJlYWx2YWx1ZXMubGVuZ3RoID8gXCJcIiA6IFwiLi4uXCIpO1xuICB9XG4gIHZhciBsaXN0ID0gXCJcIjtcbiAgaWYobGlzdFZhbHVlcy5sZW5ndGggPT09IHJlYWx2YWx1ZXMubGVuZ3RoKSB7XG4gICAgbGlzdCA9IFV0aWxzLmxpc3RUb1F1b3RlZENvbW1hT3IobGlzdFZhbHVlcyk7XG4gIH0gZWxzZSB7XG4gICAgbGlzdCA9ICdcIicgKyBsaXN0VmFsdWVzLmpvaW4oJ1wiLCBcIicpICsgJ1wiJztcbiAgfVxuICByZXR1cm4gXCJQb3NzaWJsZSB2YWx1ZXMgYXJlIC4uLlxcblwiXG4gICAgKyBsaXN0XG4gICAgKyAoIGxpc3RWYWx1ZXMubGVuZ3RoID09PSByZWFsdmFsdWVzLmxlbmd0aCA/IFwiXCIgOiBcIiAuLi5cIik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b1BlcmNlbnQoYSA6IG51bWJlciwgYjogbnVtYmVyKSA6IHN0cmluZyB7XG4gIHJldHVybiBcIlwiICsgKDEwMCogYSAvIGIpLnRvRml4ZWQoMSk7XG59XG5cblxuZXhwb3J0IGludGVyZmFjZSBJQ2F0ZWdvcnlTdGF0cyB7XG4gIGNhdGVnb3J5RGVzYyA6IElNYXRjaC5JQ2F0ZWdvcnlEZXNjLFxuICBwcmVzZW50UmVjb3JkcyA6IG51bWJlcixcbiAgZGlzdGluY3QgOiBzdHJpbmcsXG4gIGRlbHRhIDogc3RyaW5nLFxuICBwZXJjUHJlc2VudCA6IHN0cmluZyxcbiAgc2FtcGxlVmFsdWVzIDogc3RyaW5nLFxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldENhdGVnb3J5U3RhdHNJbkRvbWFpbihjYXRlZ29yeSA6IHN0cmluZywgZmlsdGVyZG9tYWluIDogc3RyaW5nLCB0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMpIDogSUNhdGVnb3J5U3RhdHMge1xuICBjb25zdCByZWNvcmRDb3VudCA9IGNvdW50UmVjb3JkUHJlc2VuY2UoY2F0ZWdvcnksIGZpbHRlcmRvbWFpbiwgdGhlTW9kZWwpO1xuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeSh0aGVNb2RlbC5yZWNvcmRzLmZpbHRlcihhID0+IGEuX2RvbWFpbiA9PT0gXCJDb3Ntb3NcIiksdW5kZWZpbmVkLDIpKTtcbiAgY29uc3QgcGVyY2VudCA9IHRvUGVyY2VudChyZWNvcmRDb3VudC5wcmVzZW50cmVjb3JkcyAsIHJlY29yZENvdW50LnRvdGFscmVjb3Jkcyk7XG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZENvdW50LnZhbHVlcykpO1xuICB2YXIgYWxsVmFsdWVzID1PYmplY3Qua2V5cyhyZWNvcmRDb3VudC52YWx1ZXMpO1xuICB2YXIgcmVhbHZhbHVlcyA9IGFsbFZhbHVlcy5maWx0ZXIodmFsdWUgPT4gKHZhbHVlICE9PSAndW5kZWZpbmVkJykgJiYgKHZhbHVlICE9PSAnbi9hJykpO1xuICBkZWJ1Z2xvZ1xuICByZWFsdmFsdWVzLnNvcnQoKTtcbiAgdmFyIHVuZGVmTmFEZWx0YSA9ICAoYWxsVmFsdWVzLmxlbmd0aCAtIHJlYWx2YWx1ZXMubGVuZ3RoKTtcbiAgdmFyIGRlbHRhID0gICh1bmRlZk5hRGVsdGEpID8gIFwiKCtcIiArIHVuZGVmTmFEZWx0YSArIFwiKVwiIDogXCJcIjtcbiAgY29uc3QgZGlzdGluY3QgPSAnJyArIHJlYWx2YWx1ZXMubGVuZ3RoO1xuICBjb25zdCB2YWx1ZXNMaXN0ID0gbWFrZVZhbHVlc0xpc3RTdHJpbmcocmVhbHZhbHVlcyk7XG4gIHJldHVybiB7XG4gICAgY2F0ZWdvcnlEZXNjIDogdGhlTW9kZWwuZnVsbC5kb21haW5bZmlsdGVyZG9tYWluXS5jYXRlZ29yaWVzW2NhdGVnb3J5XSxcbiAgICBkaXN0aW5jdCA6IGRpc3RpbmN0LFxuICAgIGRlbHRhIDogZGVsdGEsXG4gICAgcHJlc2VudFJlY29yZHMgOiByZWNvcmRDb3VudC5wcmVzZW50cmVjb3JkcyxcbiAgICBwZXJjUHJlc2VudCA6IHBlcmNlbnQsXG4gICAgc2FtcGxlVmFsdWVzIDogdmFsdWVzTGlzdFxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXNjcmliZUNhdGVnb3J5SW5Eb21haW4oY2F0ZWdvcnkgOiBzdHJpbmcsIGZpbHRlcmRvbWFpbiA6IHN0cmluZywgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzKSA6IHN0cmluZyB7XG4vKiAgY29uc3QgcmVjb3JkQ291bnQgPSBjb3VudFJlY29yZFByZXNlbmNlKGNhdGVnb3J5LCBmaWx0ZXJkb21haW4sIHRoZU1vZGVsKTtcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkodGhlTW9kZWwucmVjb3Jkcy5maWx0ZXIoYSA9PiBhLl9kb21haW4gPT09IFwiQ29zbW9zXCIpLHVuZGVmaW5lZCwyKSk7XG4gIGNvbnN0IHBlcmNlbnQgPSB0b1BlcmNlbnQocmVjb3JkQ291bnQucHJlc2VudHJlY29yZHMgLCByZWNvcmRDb3VudC50b3RhbHJlY29yZHMpO1xuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRDb3VudC52YWx1ZXMpKTtcbiAgdmFyIGFsbFZhbHVlcyA9T2JqZWN0LmtleXMocmVjb3JkQ291bnQudmFsdWVzKTtcbiAgdmFyIHJlYWx2YWx1ZXMgPSBhbGxWYWx1ZXMuZmlsdGVyKHZhbHVlID0+ICh2YWx1ZSAhPT0gJ3VuZGVmaW5lZCcpICYmICh2YWx1ZSAhPT0gJ24vYScpKTtcbiAgZGVidWdsb2dcbiAgcmVhbHZhbHVlcy5zb3J0KCk7XG4gIHZhciB1bmRlZk5hRGVsdGEgPSAgKGFsbFZhbHVlcy5sZW5ndGggLSByZWFsdmFsdWVzLmxlbmd0aCk7XG4gIHZhciBkZWx0YSA9ICAodW5kZWZOYURlbHRhKSA/ICBcIigrXCIgKyB1bmRlZk5hRGVsdGEgKyBcIilcIiA6IFwiXCI7XG4gIGNvbnN0IGRpc3RpbmN0ID0gJycgKyByZWFsdmFsdWVzLmxlbmd0aDtcblxuICBjb25zdCB2YWx1ZXNMaXN0ID0gbWFrZVZhbHVlc0xpc3RTdHJpbmcocmVhbHZhbHVlcyk7XG4qL1xuICB2YXIgc3RhdHMgPSBnZXRDYXRlZ29yeVN0YXRzSW5Eb21haW4oY2F0ZWdvcnksZmlsdGVyZG9tYWluLHRoZU1vZGVsKTtcblxuICB2YXIgcmVzID0gJ2lzIGEgY2F0ZWdvcnkgaW4gZG9tYWluIFwiJyArIGZpbHRlcmRvbWFpbiArICdcIlxcbidcbiAgKyBgSXQgaXMgcHJlc2VudCBpbiAke3N0YXRzLnByZXNlbnRSZWNvcmRzfSAoJHtzdGF0cy5wZXJjUHJlc2VudH0lKSBvZiByZWNvcmRzIGluIHRoaXMgZG9tYWluLFxcbmAgK1xuICAgYGhhdmluZyAke3N0YXRzLmRpc3RpbmN0ICsgJyd9JHtzdGF0cy5kZWx0YX0gZGlzdGluY3QgdmFsdWVzLlxcbmBcbiAgKyBzdGF0cy5zYW1wbGVWYWx1ZXM7XG5cbiAgdmFyIGRlc2MgPSB0aGVNb2RlbC5mdWxsLmRvbWFpbltmaWx0ZXJkb21haW5dLmNhdGVnb3JpZXNbY2F0ZWdvcnldIHx8IHt9IGFzIElNYXRjaC5JQ2F0ZWdvcnlEZXNjO1xuICB2YXIgZGVzY3JpcHRpb24gPSBkZXNjLmRlc2NyaXB0aW9uIHx8IFwiXCI7XG4gIGlmIChkZXNjcmlwdGlvbikge1xuICAgIHJlcyArPSBgXFxuRGVzY3JpcHRpb246ICR7ZGVzY3JpcHRpb259YDtcbiAgfVxuICByZXR1cm4gcmVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmluZFJlY29yZHNXaXRoRmFjdChtYXRjaGVkU3RyaW5nOiBzdHJpbmcsIGNhdGVnb3J5IDogc3RyaW5nLCByZWNvcmRzIDogYW55LCBkb21haW5zIDogeyBba2V5IDogc3RyaW5nXSA6IG51bWJlcn0pIDogYW55W10ge1xuICByZXR1cm4gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24ocmVjb3JkKSAge1xuXG4gICAgbGV0IHJlcyA9IChyZWNvcmRbY2F0ZWdvcnldID09PSBtYXRjaGVkU3RyaW5nKTtcbiAgICBpZiggcmVzKSB7XG4gICAgICBpbmNyZW1lbnQoZG9tYWlucyxyZWNvcmRzLl9kb21haW4pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGluY3JlbWVudChtYXAgOiB7W2tleTogc3RyaW5nXSA6IG51bWJlcn0sIGtleSA6IHN0cmluZykge1xuICBtYXBba2V5XSA9IChtYXBba2V5XSB8fCAwKSArIDE7XG59XG5cbmZ1bmN0aW9uIHNvcnRlZEtleXM8VD4obWFwIDoge1trZXkgOiBzdHJpbmddIDogVH0pIDogc3RyaW5nW10ge1xuICB2YXIgciA9IE9iamVjdC5rZXlzKG1hcCk7XG4gIHIuc29ydCgpO1xuICByZXR1cm4gcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlc2NyaWJlRG9tYWluKGZhY3QgOiBzdHJpbmcsIGRvbWFpbjogc3RyaW5nLCB0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMpIDogc3RyaW5nIHtcbiAgdmFyIGNvdW50ID0gdGhlTW9kZWwucmVjb3Jkcy5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgcmVjb3JkKSB7XG4gICAgcmV0dXJuIHByZXYgKyAoKHJlY29yZC5fZG9tYWluID09PSBkb21haW4pID8gMSA6IDApO1xuICB9LDApO1xuICB2YXIgY2F0Y291bnQgPSBNb2RlbC5nZXRDYXRlZ29yaWVzRm9yRG9tYWluKHRoZU1vZGVsLCBkb21haW4pLmxlbmd0aDtcbiAgdmFyIHJlcyA9IHNsb3BweU9yRXhhY3QoZG9tYWluLCBmYWN0LCB0aGVNb2RlbCkgKyBgaXMgYSBkb21haW4gd2l0aCAke2NhdGNvdW50fSBjYXRlZ29yaWVzIGFuZCAke2NvdW50fSByZWNvcmRzXFxuYDtcbiAgdmFyIGRlc2MgPSB0aGVNb2RlbC5mdWxsLmRvbWFpbltkb21haW5dLmRlc2NyaXB0aW9uIHx8IFwiXCI7XG4gIGlmKGRlc2MpIHtcbiAgICByZXMgKz0gYERlc2NyaXB0aW9uOmAgKyBkZXNjICsgYFxcbmA7XG4gIH1cbiAgcmV0dXJuIHJlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlc2NyaWJlRmFjdEluRG9tYWluKGZhY3QgOiBzdHJpbmcsIGZpbHRlcmRvbWFpbiA6IHN0cmluZywgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzKSA6IHN0cmluZyB7XG4gIHZhciBzZW50ZW5jZXMgPSBXaGF0SXMuYW5hbHl6ZUNvbnRleHRTdHJpbmcoZmFjdCwgIHRoZU1vZGVsLnJ1bGVzKTtcbiAgLy9jb25zb2xlLmxvZyhcImhlcmUgc2VudGVuY2VzIFwiICsgSlNPTi5zdHJpbmdpZnkoc2VudGVuY2VzKSk7XG4gIHZhciBsZW5ndGhPbmVTZW50ZW5jZXMgPSBzZW50ZW5jZXMuc2VudGVuY2VzLmZpbHRlcihvU2VudGVuY2UgPT4gb1NlbnRlbmNlLmxlbmd0aCA9PT0gMSk7XG4gIHZhciByZXMgPSAnJztcbiAgLy8gcmVtb3ZlIGNhdGVnb3JpZXMgYW5kIGRvbWFpbnNcbiAgdmFyIG9ubHlGYWN0cyA9IGxlbmd0aE9uZVNlbnRlbmNlcy5maWx0ZXIob1NlbnRlbmNlID0+e1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZVswXSkpO1xuICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRG9tYWluKG9TZW50ZW5jZVswXSkgJiZcbiAgICAgICAgICAgIVdvcmQuV29yZC5pc0ZpbGxlcihvU2VudGVuY2VbMF0pICYmICFXb3JkLldvcmQuaXNDYXRlZ29yeShvU2VudGVuY2VbMF0pXG4gIH1cbiAgKTtcbiAgdmFyIG9ubHlEb21haW5zID0gbGVuZ3RoT25lU2VudGVuY2VzLmZpbHRlcihvU2VudGVuY2UgPT57XG4gICAgcmV0dXJuIFdvcmQuV29yZC5pc0RvbWFpbihvU2VudGVuY2VbMF0pO1xuICB9KTtcbiAgaWYob25seURvbWFpbnMgJiYgb25seURvbWFpbnMubGVuZ3RoID4gMCkge1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9ubHlEb21haW5zKSk7XG4gICAgb25seURvbWFpbnMuZm9yRWFjaChmdW5jdGlvbihzZW50ZW5jZSkge1xuICAgICAgdmFyIGRvbWFpbiA9IHNlbnRlbmNlWzBdLm1hdGNoZWRTdHJpbmc7XG4gICAgICBpZiggIWZpbHRlcmRvbWFpbiB8fCBkb21haW4gPT09IGZpbHRlcmRvbWFpbikge1xuICAgICAgICBkZWJ1Z2xvZyhcImhlcmUgbWF0Y2ggXCIgKyBKU09OLnN0cmluZ2lmeShzZW50ZW5jZSkpO1xuICAgICAgICByZXMgKz0gZGVzY3JpYmVEb21haW4oZmFjdCwgc2VudGVuY2VbMF0ubWF0Y2hlZFN0cmluZywgdGhlTW9kZWwpO1xuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBkZWJ1Z2xvZyhcIm9ubHkgZmFjdHM6IFwiICsgSlNPTi5zdHJpbmdpZnkob25seUZhY3RzKSk7XG4gIHZhciByZWNvcmRNYXAgPSB7fTtcbiAgdmFyIGRvbWFpbnNNYXAgPSB7fSBhcyB7W2tleTogc3RyaW5nXSA6IG51bWJlcn07XG4gIHZhciBtYXRjaGVkd29yZE1hcCA9IHt9IGFzIHtba2V5OiBzdHJpbmddIDogbnVtYmVyfTtcbiAgdmFyIG1hdGNoZWRDYXRlZ29yeU1hcCA9IHt9IGFzIHtba2V5OiBzdHJpbmddIDogbnVtYmVyfTtcbiAgLy8gbG9vayBmb3IgYWxsIHJlY29yZHNcbiAgb25seUZhY3RzLmZvckVhY2gob1NlbnRlbmNlID0+XG4gICAgb1NlbnRlbmNlLmZvckVhY2gob1dvcmQgPT5cbiAgICAgIHtcbiAgICAgICAgaW5jcmVtZW50KG1hdGNoZWR3b3JkTWFwLCBvV29yZC5tYXRjaGVkU3RyaW5nKTtcbiAgICAgICAgaW5jcmVtZW50KG1hdGNoZWRDYXRlZ29yeU1hcCwgb1dvcmQuY2F0ZWdvcnkpO1xuICAgICAgfVxuICAgIClcbiAgKTtcbiAgLy8gd2UgaGF2ZTpcbiAgLy8gYSBsaXN0IG9mIGNhdGVnb3JpZXMsXG4gIC8vIGEgbGlzdCBvZiBtYXRjaGVkV29yZHMgIC0+XG4gIC8vXG5cbiAgdmFyIGNhdGVnb3JpZXMgPSBzb3J0ZWRLZXlzKG1hdGNoZWRDYXRlZ29yeU1hcCk7XG4gIHZhciBtYXRjaGVkd29yZHMgPSBzb3J0ZWRLZXlzKG1hdGNoZWR3b3JkTWFwKTtcbiAgZGVidWdsb2coXCJtYXRjaGVkd29yZHM6IFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZHdvcmRzKSk7XG4gIGRlYnVnbG9nKFwiY2F0ZWdvcmllczogXCIgKyBKU09OLnN0cmluZ2lmeShjYXRlZ29yaWVzKSk7XG5cbiAgLy92YXIgYWxsTWF0Y2hlZFdvcmRzID0geyBba2V5IDogc3RyaW5nXSA6IG51bWJlciB9O1xuICB2YXIgZG9tYWluUmVjb3JkQ291bnQgPSB7fSBhcyB7W2tleTogc3RyaW5nXSA6IG51bWJlcn07XG4gIHZhciBkb21haW5NYXRjaENhdENvdW50ID0ge30gYXMge1trZXk6IHN0cmluZ10gOlxuICAgICAgIHtba2V5OiBzdHJpbmddIDpcbiAgICAge1trZXk6IHN0cmluZ10gOiBudW1iZXJ9fX07XG4gIC8vIHdlIHByZXBhcmUgdGhlIGZvbGxvd2luZyBzdHJ1Y3R1cmVcbiAgLy9cbiAgLy8ge2RvbWFpbn0gOiByZWNvcmRjb3VudDtcbiAgLy8ge21hdGNoZWR3b3Jkc30gOlxuICAvLyB7ZG9tYWlufSB7bWF0Y2hlZHdvcmR9IHtjYXRlZ29yeX0gcHJlc2VuY2Vjb3VudFxuICB0aGVNb2RlbC5yZWNvcmRzLmZvckVhY2goZnVuY3Rpb24ocmVjb3JkKSB7XG4gICAgaWYoIWZpbHRlcmRvbWFpbiB8fCByZWNvcmQuX2RvbWFpbiA9PT0gZmlsdGVyZG9tYWluICkge1xuICAgICAgZG9tYWluUmVjb3JkQ291bnRbcmVjb3JkLl9kb21haW5dID0gKGRvbWFpblJlY29yZENvdW50W3JlY29yZC5fZG9tYWluXSB8fCAwKSArIDE7XG4gICAgICBtYXRjaGVkd29yZHMuZm9yRWFjaChtYXRjaGVkd29yZCA9PlxuICAgICAgICBjYXRlZ29yaWVzLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xuICAgICAgICAgIGlmKCByZWNvcmRbY2F0ZWdvcnldID09PSBtYXRjaGVkd29yZCkge1xuICAgICAgICAgICAgdmFyIG1kID0gZG9tYWluTWF0Y2hDYXRDb3VudFtyZWNvcmQuX2RvbWFpbl0gPSBkb21haW5NYXRjaENhdENvdW50W3JlY29yZC5fZG9tYWluXSB8fCB7fTtcbiAgICAgICAgICAgIHZhciBtZGMgPSBtZFttYXRjaGVkd29yZF0gPSAgbWRbbWF0Y2hlZHdvcmRdIHx8IHt9O1xuICAgICAgICAgICAgaW5jcmVtZW50KG1kYyxjYXRlZ29yeSk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICApXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRvbWFpbk1hdGNoQ2F0Q291bnQsdW5kZWZpbmVkLDIpKTtcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZG9tYWluUmVjb3JkQ291bnQsdW5kZWZpbmVkLDIpKTtcbiAgdmFyIGRvbWFpbnMgPSBzb3J0ZWRLZXlzKGRvbWFpbk1hdGNoQ2F0Q291bnQpO1xuICB2YXIgcmVzTmV4dCA9ICAnXCInICsgZmFjdCArICdcIiBoYXMgYSBtZWFuaW5nIGluICc7XG4gIHZhciBzaW5nbGUgPSBmYWxzZTtcbiAgaWYoT2JqZWN0LmtleXMoZG9tYWluTWF0Y2hDYXRDb3VudCkubGVuZ3RoID4gMSkge1xuICAgIHJlc05leHQgKz0gJycgKyBkb21haW5zLmxlbmd0aCArXG4gICAgICAgICAgICAgICcgZG9tYWluczogJyArIFV0aWxzLmxpc3RUb1F1b3RlZENvbW1hQW5kKGRvbWFpbnMpICsgXCJcIjtcbiAgfSBlbHNlIGlmKGRvbWFpbnMubGVuZ3RoID09PSAxKSB7XG4gICAgaWYoIWZpbHRlcmRvbWFpbikge1xuICAgICAgcmVzTmV4dCArPSBgb25lIGA7XG4gICAgfVxuICAgIHJlc05leHQgKz0gYGRvbWFpbiBcIiR7ZG9tYWluc1swXX1cIjpgO1xuICAgIHNpbmdsZSA9IHRydWU7XG4gIH0gZWxzZSB7XG4gICAgaWYocmVzKSB7XG4gICAgICByZXR1cm4gcmVzO1xuICAgIH1cbiAgICB2YXIgZmFjdGNsZWFuID0gVXRpbHMuc3RyaXBRdW90ZXMoZmFjdCk7XG4gICAgaWYoZmlsdGVyZG9tYWluKSB7XG4gICAgICByZXR1cm4gYFwiJHtmYWN0Y2xlYW59XCIgaXMgbm8ga25vd24gZmFjdCBpbiBkb21haW4gXCIke2ZpbHRlcmRvbWFpbn1cIi5cXG5gO1xuICAgIH1cbiAgICByZXR1cm4gYEkgZG9uJ3Qga25vdyBhbnl0aGluZyBhYm91dCBcIiR7ZmFjdGNsZWFufVwiLlxcbmA7XG4gIH1cbiAgcmVzICs9IHJlc05leHQgKyBcIlxcblwiOyAvLyAuLi5cXG5cIjtcbiAgZG9tYWlucy5mb3JFYWNoKGZ1bmN0aW9uKGRvbWFpbikge1xuICAgIHZhciBtZCA9IGRvbWFpbk1hdGNoQ2F0Q291bnRbZG9tYWluXTtcbiAgICBPYmplY3Qua2V5cyhtZCkuZm9yRWFjaChtYXRjaGVkc3RyaW5nID0+IHtcbiAgICAgIHZhciBtZGMgPSBtZFttYXRjaGVkc3RyaW5nXTtcbiAgICAgIGlmKCFzaW5nbGUpIHtcbiAgICAgICAgcmVzICs9ICdpbiBkb21haW4gXCInICsgZG9tYWluICsgJ1wiICc7XG4gICAgICB9XG4gICAgICB2YXIgY2F0c2luZ2xlID0gT2JqZWN0LmtleXMobWRjKS5sZW5ndGggPT09IDE7XG4gICAgICByZXMgKz0gYCR7c2xvcHB5T3JFeGFjdChtYXRjaGVkc3RyaW5nLGZhY3QsdGhlTW9kZWwpfSBgO1xuICAgICAgaWYoIWNhdHNpbmdsZSkge1xuICAgICAgICByZXMgKz0gYC4uLlxcbmA7XG4gICAgICB9XG4gICAgICBPYmplY3Qua2V5cyhtZGMpLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xuICAgICAgdmFyIHBlcmNlbnQgPSAgdG9QZXJjZW50KG1kY1tjYXRlZ29yeV0sZG9tYWluUmVjb3JkQ291bnRbZG9tYWluXSk7XG5cbiAgICAgICAgcmVzICs9IGBpcyBhIHZhbHVlIGZvciBjYXRlZ29yeSBcIiR7Y2F0ZWdvcnl9XCIgcHJlc2VudCBpbiAke21kY1tjYXRlZ29yeV19KCR7cGVyY2VudH0lKSBvZiByZWNvcmRzO1xcbmA7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG4gIHJldHVybiByZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXNjcmliZUNhdGVnb3J5KGNhdGVnb3J5IDogc3RyaW5nLCBmaWx0ZXJEb21haW46IHN0cmluZywgbW9kZWw6IElNYXRjaC5JTW9kZWxzLG1lc3NhZ2UgOiBzdHJpbmcpIDogc3RyaW5nW10ge1xuICB2YXIgcmVzID0gW107XG4gIHZhciBkb21zID0gTW9kZWwuZ2V0RG9tYWluc0ZvckNhdGVnb3J5KG1vZGVsLGNhdGVnb3J5KTtcbiAgaWYoZmlsdGVyRG9tYWluKSB7XG4gICAgaWYoZG9tcy5pbmRleE9mKGZpbHRlckRvbWFpbikgPj0gMCkge1xuICAgICAgcmVzLnB1c2goZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluKGNhdGVnb3J5LGZpbHRlckRvbWFpbixtb2RlbCkpO1xuICAgICAgcmV0dXJuIHJlcztcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgfVxuICBkb21zLnNvcnQoKTtcbiAgZG9tcy5mb3JFYWNoKGZ1bmN0aW9uKGRvbWFpbikge1xuICAgICAgICByZXMucHVzaChkZXNjcmliZUNhdGVnb3J5SW5Eb21haW4oY2F0ZWdvcnksIGRvbWFpbiwgbW9kZWwpKTtcbiAgfSk7XG4gIHJldHVybiByZXM7XG59XG4iLCIvKipcbiAqXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5leHBsYWluXG4gKiBAZmlsZSBleHBsYWluLnRzXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXG4gKlxuICogRnVuY3Rpb25zIGRlYWxpbmcgd2l0aCBleHBsYWluaW5nIGZhY3RzLCBjYXRlZ29yaWVzIGV0Yy5cbiAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgQWxnb2wgPSByZXF1aXJlKFwiLi9hbGdvbFwiKTtcbnZhciBkZWJ1ZyA9IHJlcXVpcmUoXCJkZWJ1Z1wiKTtcbnZhciBkZWJ1Z2xvZyA9IGRlYnVnKCdkZXNjcmliZScpO1xudmFyIGxvZ2dlciA9IHJlcXVpcmUoXCIuLi91dGlscy9sb2dnZXJcIik7XG52YXIgbG9nUGVyZiA9IGxvZ2dlci5wZXJmKFwicGVyZmxpc3RhbGxcIik7XG52YXIgcGVyZmxvZyA9IGRlYnVnKCdwZXJmJyk7XG52YXIgV29yZCA9IHJlcXVpcmUoXCIuL3dvcmRcIik7XG52YXIgV2hhdElzID0gcmVxdWlyZShcIi4vd2hhdGlzXCIpO1xudmFyIE1vZGVsID0gcmVxdWlyZShcIi4uL21vZGVsL21vZGVsXCIpO1xudmFyIFV0aWxzID0gcmVxdWlyZShcIi4uL3V0aWxzL3V0aWxzXCIpO1xudmFyIHNXb3JkcyA9IHt9O1xuZnVuY3Rpb24gaXNTeW5vbnltRm9yKGV4YWN0V29yZCwgc2xvcHB5V29yZCwgdGhlTW9kZWwpIHtcbiAgICAvLyBUT0RPOiB1c2UgbW9kZWwgc3lub255bXNcbiAgICByZXR1cm4gc2xvcHB5V29yZCA9PT0gXCJuYW1lXCIgJiYgZXhhY3RXb3JkID09PSBcImVsZW1lbnQgbmFtZVwiO1xufVxuZXhwb3J0cy5pc1N5bm9ueW1Gb3IgPSBpc1N5bm9ueW1Gb3I7XG5mdW5jdGlvbiBzbG9wcHlPckV4YWN0KGV4YWN0V29yZCwgc2xvcHB5V29yZCwgdGhlTW9kZWwpIHtcbiAgICBpZiAoZXhhY3RXb3JkLnRvTG93ZXJDYXNlKCkgPT09IHNsb3BweVdvcmQudG9Mb3dlckNhc2UoKSkge1xuICAgICAgICByZXR1cm4gJ1wiJyArIHNsb3BweVdvcmQgKyAnXCInO1xuICAgIH1cbiAgICAvLyBUT0RPLCBmaW5kIHBsdXJhbCBzIGV0Yy5cbiAgICAvLyBzdGlsbCBleGFjdCxcbiAgICAvL1xuICAgIGlmIChpc1N5bm9ueW1Gb3IoZXhhY3RXb3JkLCBzbG9wcHlXb3JkLCB0aGVNb2RlbCkpIHtcbiAgICAgICAgcmV0dXJuICdcIicgKyBzbG9wcHlXb3JkICsgJ1wiIChpbnRlcnByZXRlZCBhcyBzeW5vbnltIGZvciBcIicgKyBleGFjdFdvcmQgKyAnXCIpJztcbiAgICB9XG4gICAgLy90b2RvLCBmaW5kIGlzIHN5bm9ueW1mb3IgLi4uXG4gICAgLy8gVE9ETywgYSBzeW5vbnltIGZvciAuLi5cbiAgICByZXR1cm4gJ1wiJyArIHNsb3BweVdvcmQgKyAnXCIgKGludGVycHJldGVkIGFzIFwiJyArIGV4YWN0V29yZCArICdcIiknO1xufVxuZXhwb3J0cy5zbG9wcHlPckV4YWN0ID0gc2xvcHB5T3JFeGFjdDtcbmZ1bmN0aW9uIGNvdW50UmVjb3JkUHJlc2VuY2UoY2F0ZWdvcnksIGRvbWFpbiwgdGhlTW9kZWwpIHtcbiAgICB2YXIgcmVzID0geyB0b3RhbHJlY29yZHM6IDAsXG4gICAgICAgIHByZXNlbnRyZWNvcmRzOiAwLFxuICAgICAgICB2YWx1ZXM6IHt9LFxuICAgICAgICBtdWx0aXZhbHVlZDogZmFsc2VcbiAgICB9O1xuICAgIHRoZU1vZGVsLnJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgIC8vZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkLHVuZGVmaW5lZCwyKSk7XG4gICAgICAgIGlmIChyZWNvcmQuX2RvbWFpbiAhPT0gZG9tYWluKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcmVzLnRvdGFscmVjb3JkcysrO1xuICAgICAgICB2YXIgdmFsID0gcmVjb3JkW2NhdGVnb3J5XTtcbiAgICAgICAgdmFyIHZhbGFyciA9IFt2YWxdO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgICAgICAgICByZXMubXVsdGl2YWx1ZWQgPSB0cnVlO1xuICAgICAgICAgICAgdmFsYXJyID0gdmFsO1xuICAgICAgICB9XG4gICAgICAgIC8vIHRvZG8gd3JhcCBhcnJcbiAgICAgICAgaWYgKHZhbCAhPT0gdW5kZWZpbmVkICYmIHZhbCAhPT0gXCJuL2FcIikge1xuICAgICAgICAgICAgcmVzLnByZXNlbnRyZWNvcmRzKys7XG4gICAgICAgIH1cbiAgICAgICAgdmFsYXJyLmZvckVhY2goZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgcmVzLnZhbHVlc1t2YWxdID0gKHJlcy52YWx1ZXNbdmFsXSB8fCAwKSArIDE7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmNvdW50UmVjb3JkUHJlc2VuY2UgPSBjb3VudFJlY29yZFByZXNlbmNlO1xuZnVuY3Rpb24gY291bnRSZWNvcmRQcmVzZW5jZUZhY3QoZmFjdCwgY2F0ZWdvcnksIGRvbWFpbiwgdGhlTW9kZWwpIHtcbiAgICB2YXIgcmVzID0geyB0b3RhbHJlY29yZHM6IDAsXG4gICAgICAgIHByZXNlbnRyZWNvcmRzOiAwLFxuICAgICAgICB2YWx1ZXM6IHt9LFxuICAgICAgICBtdWx0aXZhbHVlZDogZmFsc2VcbiAgICB9O1xuICAgIHRoZU1vZGVsLnJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgIC8vZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkLHVuZGVmaW5lZCwyKSk7XG4gICAgICAgIGlmIChyZWNvcmQuX2RvbWFpbiAhPT0gZG9tYWluKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcmVzLnRvdGFscmVjb3JkcysrO1xuICAgICAgICB2YXIgdmFsID0gcmVjb3JkW2NhdGVnb3J5XTtcbiAgICAgICAgdmFyIHZhbGFyciA9IFt2YWxdO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgICAgICAgICBpZiAodmFsLmluZGV4T2YoZmFjdCkgPj0gMCkge1xuICAgICAgICAgICAgICAgIHJlcy5tdWx0aXZhbHVlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgdmFsYXJyID0gdmFsO1xuICAgICAgICAgICAgICAgIHJlcy5wcmVzZW50cmVjb3JkcysrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHZhbCA9PT0gZmFjdCkge1xuICAgICAgICAgICAgcmVzLnByZXNlbnRyZWNvcmRzKys7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5jb3VudFJlY29yZFByZXNlbmNlRmFjdCA9IGNvdW50UmVjb3JkUHJlc2VuY2VGYWN0O1xuZnVuY3Rpb24gbWFrZVZhbHVlc0xpc3RTdHJpbmcocmVhbHZhbHVlcykge1xuICAgIHZhciB2YWx1ZXNTdHJpbmcgPSBcIlwiO1xuICAgIHZhciB0b3RhbGxlbiA9IDA7XG4gICAgdmFyIGxpc3RWYWx1ZXMgPSByZWFsdmFsdWVzLmZpbHRlcihmdW5jdGlvbiAodmFsLCBpbmRleCkge1xuICAgICAgICB0b3RhbGxlbiA9IHRvdGFsbGVuICsgdmFsLmxlbmd0aDtcbiAgICAgICAgcmV0dXJuIChpbmRleCA8IEFsZ29sLkRlc2NyaWJlVmFsdWVMaXN0TWluQ291bnRWYWx1ZUxpc3QpIHx8ICh0b3RhbGxlbiA8IEFsZ29sLkRlc2NyaWJlVmFsdWVMaXN0TGVuZ3RoQ2hhckxpbWl0KTtcbiAgICB9KTtcbiAgICBpZiAobGlzdFZhbHVlcy5sZW5ndGggPT09IDEgJiYgcmVhbHZhbHVlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuICdUaGUgc29sZSB2YWx1ZSBpcyBcXFwiJyArIGxpc3RWYWx1ZXNbMF0gKyAnXCInO1xuICAgIH1cbiAgICB2YXIgbWF4bGVuID0gbGlzdFZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHZhbCkgeyByZXR1cm4gTWF0aC5tYXgocHJldiwgdmFsLmxlbmd0aCk7IH0sIDApO1xuICAgIGlmIChtYXhsZW4gPiAzMCkge1xuICAgICAgICByZXR1cm4gXCJQb3NzaWJsZSB2YWx1ZXMgYXJlIC4uLlxcblwiICtcbiAgICAgICAgICAgIGxpc3RWYWx1ZXMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCB2YWwsIGluZGV4KSB7IHJldHVybiAocHJldiArIFwiKFwiICsgKGluZGV4ICsgMSkgKyAnKTogXCInICsgdmFsICsgJ1wiXFxuJyk7IH0sIFwiXCIpXG4gICAgICAgICAgICArIChsaXN0VmFsdWVzLmxlbmd0aCA9PT0gcmVhbHZhbHVlcy5sZW5ndGggPyBcIlwiIDogXCIuLi5cIik7XG4gICAgfVxuICAgIHZhciBsaXN0ID0gXCJcIjtcbiAgICBpZiAobGlzdFZhbHVlcy5sZW5ndGggPT09IHJlYWx2YWx1ZXMubGVuZ3RoKSB7XG4gICAgICAgIGxpc3QgPSBVdGlscy5saXN0VG9RdW90ZWRDb21tYU9yKGxpc3RWYWx1ZXMpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgbGlzdCA9ICdcIicgKyBsaXN0VmFsdWVzLmpvaW4oJ1wiLCBcIicpICsgJ1wiJztcbiAgICB9XG4gICAgcmV0dXJuIFwiUG9zc2libGUgdmFsdWVzIGFyZSAuLi5cXG5cIlxuICAgICAgICArIGxpc3RcbiAgICAgICAgKyAobGlzdFZhbHVlcy5sZW5ndGggPT09IHJlYWx2YWx1ZXMubGVuZ3RoID8gXCJcIiA6IFwiIC4uLlwiKTtcbn1cbmV4cG9ydHMubWFrZVZhbHVlc0xpc3RTdHJpbmcgPSBtYWtlVmFsdWVzTGlzdFN0cmluZztcbmZ1bmN0aW9uIHRvUGVyY2VudChhLCBiKSB7XG4gICAgcmV0dXJuIFwiXCIgKyAoMTAwICogYSAvIGIpLnRvRml4ZWQoMSk7XG59XG5leHBvcnRzLnRvUGVyY2VudCA9IHRvUGVyY2VudDtcbjtcbmZ1bmN0aW9uIGdldENhdGVnb3J5U3RhdHNJbkRvbWFpbihjYXRlZ29yeSwgZmlsdGVyZG9tYWluLCB0aGVNb2RlbCkge1xuICAgIHZhciByZWNvcmRDb3VudCA9IGNvdW50UmVjb3JkUHJlc2VuY2UoY2F0ZWdvcnksIGZpbHRlcmRvbWFpbiwgdGhlTW9kZWwpO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHRoZU1vZGVsLnJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChhKSB7IHJldHVybiBhLl9kb21haW4gPT09IFwiQ29zbW9zXCI7IH0pLCB1bmRlZmluZWQsIDIpKTtcbiAgICB2YXIgcGVyY2VudCA9IHRvUGVyY2VudChyZWNvcmRDb3VudC5wcmVzZW50cmVjb3JkcywgcmVjb3JkQ291bnQudG90YWxyZWNvcmRzKTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRDb3VudC52YWx1ZXMpKTtcbiAgICB2YXIgYWxsVmFsdWVzID0gT2JqZWN0LmtleXMocmVjb3JkQ291bnQudmFsdWVzKTtcbiAgICB2YXIgcmVhbHZhbHVlcyA9IGFsbFZhbHVlcy5maWx0ZXIoZnVuY3Rpb24gKHZhbHVlKSB7IHJldHVybiAodmFsdWUgIT09ICd1bmRlZmluZWQnKSAmJiAodmFsdWUgIT09ICduL2EnKTsgfSk7XG4gICAgZGVidWdsb2c7XG4gICAgcmVhbHZhbHVlcy5zb3J0KCk7XG4gICAgdmFyIHVuZGVmTmFEZWx0YSA9IChhbGxWYWx1ZXMubGVuZ3RoIC0gcmVhbHZhbHVlcy5sZW5ndGgpO1xuICAgIHZhciBkZWx0YSA9ICh1bmRlZk5hRGVsdGEpID8gXCIoK1wiICsgdW5kZWZOYURlbHRhICsgXCIpXCIgOiBcIlwiO1xuICAgIHZhciBkaXN0aW5jdCA9ICcnICsgcmVhbHZhbHVlcy5sZW5ndGg7XG4gICAgdmFyIHZhbHVlc0xpc3QgPSBtYWtlVmFsdWVzTGlzdFN0cmluZyhyZWFsdmFsdWVzKTtcbiAgICByZXR1cm4ge1xuICAgICAgICBjYXRlZ29yeURlc2M6IHRoZU1vZGVsLmZ1bGwuZG9tYWluW2ZpbHRlcmRvbWFpbl0uY2F0ZWdvcmllc1tjYXRlZ29yeV0sXG4gICAgICAgIGRpc3RpbmN0OiBkaXN0aW5jdCxcbiAgICAgICAgZGVsdGE6IGRlbHRhLFxuICAgICAgICBwcmVzZW50UmVjb3JkczogcmVjb3JkQ291bnQucHJlc2VudHJlY29yZHMsXG4gICAgICAgIHBlcmNQcmVzZW50OiBwZXJjZW50LFxuICAgICAgICBzYW1wbGVWYWx1ZXM6IHZhbHVlc0xpc3RcbiAgICB9O1xufVxuZXhwb3J0cy5nZXRDYXRlZ29yeVN0YXRzSW5Eb21haW4gPSBnZXRDYXRlZ29yeVN0YXRzSW5Eb21haW47XG5mdW5jdGlvbiBkZXNjcmliZUNhdGVnb3J5SW5Eb21haW4oY2F0ZWdvcnksIGZpbHRlcmRvbWFpbiwgdGhlTW9kZWwpIHtcbiAgICAvKiAgY29uc3QgcmVjb3JkQ291bnQgPSBjb3VudFJlY29yZFByZXNlbmNlKGNhdGVnb3J5LCBmaWx0ZXJkb21haW4sIHRoZU1vZGVsKTtcbiAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHRoZU1vZGVsLnJlY29yZHMuZmlsdGVyKGEgPT4gYS5fZG9tYWluID09PSBcIkNvc21vc1wiKSx1bmRlZmluZWQsMikpO1xuICAgICAgY29uc3QgcGVyY2VudCA9IHRvUGVyY2VudChyZWNvcmRDb3VudC5wcmVzZW50cmVjb3JkcyAsIHJlY29yZENvdW50LnRvdGFscmVjb3Jkcyk7XG4gICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRDb3VudC52YWx1ZXMpKTtcbiAgICAgIHZhciBhbGxWYWx1ZXMgPU9iamVjdC5rZXlzKHJlY29yZENvdW50LnZhbHVlcyk7XG4gICAgICB2YXIgcmVhbHZhbHVlcyA9IGFsbFZhbHVlcy5maWx0ZXIodmFsdWUgPT4gKHZhbHVlICE9PSAndW5kZWZpbmVkJykgJiYgKHZhbHVlICE9PSAnbi9hJykpO1xuICAgICAgZGVidWdsb2dcbiAgICAgIHJlYWx2YWx1ZXMuc29ydCgpO1xuICAgICAgdmFyIHVuZGVmTmFEZWx0YSA9ICAoYWxsVmFsdWVzLmxlbmd0aCAtIHJlYWx2YWx1ZXMubGVuZ3RoKTtcbiAgICAgIHZhciBkZWx0YSA9ICAodW5kZWZOYURlbHRhKSA/ICBcIigrXCIgKyB1bmRlZk5hRGVsdGEgKyBcIilcIiA6IFwiXCI7XG4gICAgICBjb25zdCBkaXN0aW5jdCA9ICcnICsgcmVhbHZhbHVlcy5sZW5ndGg7XG4gICAgXG4gICAgICBjb25zdCB2YWx1ZXNMaXN0ID0gbWFrZVZhbHVlc0xpc3RTdHJpbmcocmVhbHZhbHVlcyk7XG4gICAgKi9cbiAgICB2YXIgc3RhdHMgPSBnZXRDYXRlZ29yeVN0YXRzSW5Eb21haW4oY2F0ZWdvcnksIGZpbHRlcmRvbWFpbiwgdGhlTW9kZWwpO1xuICAgIHZhciByZXMgPSAnaXMgYSBjYXRlZ29yeSBpbiBkb21haW4gXCInICsgZmlsdGVyZG9tYWluICsgJ1wiXFxuJ1xuICAgICAgICArIChcIkl0IGlzIHByZXNlbnQgaW4gXCIgKyBzdGF0cy5wcmVzZW50UmVjb3JkcyArIFwiIChcIiArIHN0YXRzLnBlcmNQcmVzZW50ICsgXCIlKSBvZiByZWNvcmRzIGluIHRoaXMgZG9tYWluLFxcblwiKSArXG4gICAgICAgIChcImhhdmluZyBcIiArIChzdGF0cy5kaXN0aW5jdCArICcnKSArIHN0YXRzLmRlbHRhICsgXCIgZGlzdGluY3QgdmFsdWVzLlxcblwiKVxuICAgICAgICArIHN0YXRzLnNhbXBsZVZhbHVlcztcbiAgICB2YXIgZGVzYyA9IHRoZU1vZGVsLmZ1bGwuZG9tYWluW2ZpbHRlcmRvbWFpbl0uY2F0ZWdvcmllc1tjYXRlZ29yeV0gfHwge307XG4gICAgdmFyIGRlc2NyaXB0aW9uID0gZGVzYy5kZXNjcmlwdGlvbiB8fCBcIlwiO1xuICAgIGlmIChkZXNjcmlwdGlvbikge1xuICAgICAgICByZXMgKz0gXCJcXG5EZXNjcmlwdGlvbjogXCIgKyBkZXNjcmlwdGlvbjtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluID0gZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluO1xuZnVuY3Rpb24gZmluZFJlY29yZHNXaXRoRmFjdChtYXRjaGVkU3RyaW5nLCBjYXRlZ29yeSwgcmVjb3JkcywgZG9tYWlucykge1xuICAgIHJldHVybiByZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgIHZhciByZXMgPSAocmVjb3JkW2NhdGVnb3J5XSA9PT0gbWF0Y2hlZFN0cmluZyk7XG4gICAgICAgIGlmIChyZXMpIHtcbiAgICAgICAgICAgIGluY3JlbWVudChkb21haW5zLCByZWNvcmRzLl9kb21haW4pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfSk7XG59XG5leHBvcnRzLmZpbmRSZWNvcmRzV2l0aEZhY3QgPSBmaW5kUmVjb3Jkc1dpdGhGYWN0O1xuZnVuY3Rpb24gaW5jcmVtZW50KG1hcCwga2V5KSB7XG4gICAgbWFwW2tleV0gPSAobWFwW2tleV0gfHwgMCkgKyAxO1xufVxuZXhwb3J0cy5pbmNyZW1lbnQgPSBpbmNyZW1lbnQ7XG5mdW5jdGlvbiBzb3J0ZWRLZXlzKG1hcCkge1xuICAgIHZhciByID0gT2JqZWN0LmtleXMobWFwKTtcbiAgICByLnNvcnQoKTtcbiAgICByZXR1cm4gcjtcbn1cbmZ1bmN0aW9uIGRlc2NyaWJlRG9tYWluKGZhY3QsIGRvbWFpbiwgdGhlTW9kZWwpIHtcbiAgICB2YXIgY291bnQgPSB0aGVNb2RlbC5yZWNvcmRzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgcmVjb3JkKSB7XG4gICAgICAgIHJldHVybiBwcmV2ICsgKChyZWNvcmQuX2RvbWFpbiA9PT0gZG9tYWluKSA/IDEgOiAwKTtcbiAgICB9LCAwKTtcbiAgICB2YXIgY2F0Y291bnQgPSBNb2RlbC5nZXRDYXRlZ29yaWVzRm9yRG9tYWluKHRoZU1vZGVsLCBkb21haW4pLmxlbmd0aDtcbiAgICB2YXIgcmVzID0gc2xvcHB5T3JFeGFjdChkb21haW4sIGZhY3QsIHRoZU1vZGVsKSArIChcImlzIGEgZG9tYWluIHdpdGggXCIgKyBjYXRjb3VudCArIFwiIGNhdGVnb3JpZXMgYW5kIFwiICsgY291bnQgKyBcIiByZWNvcmRzXFxuXCIpO1xuICAgIHZhciBkZXNjID0gdGhlTW9kZWwuZnVsbC5kb21haW5bZG9tYWluXS5kZXNjcmlwdGlvbiB8fCBcIlwiO1xuICAgIGlmIChkZXNjKSB7XG4gICAgICAgIHJlcyArPSBcIkRlc2NyaXB0aW9uOlwiICsgZGVzYyArIFwiXFxuXCI7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmRlc2NyaWJlRG9tYWluID0gZGVzY3JpYmVEb21haW47XG5mdW5jdGlvbiBkZXNjcmliZUZhY3RJbkRvbWFpbihmYWN0LCBmaWx0ZXJkb21haW4sIHRoZU1vZGVsKSB7XG4gICAgdmFyIHNlbnRlbmNlcyA9IFdoYXRJcy5hbmFseXplQ29udGV4dFN0cmluZyhmYWN0LCB0aGVNb2RlbC5ydWxlcyk7XG4gICAgLy9jb25zb2xlLmxvZyhcImhlcmUgc2VudGVuY2VzIFwiICsgSlNPTi5zdHJpbmdpZnkoc2VudGVuY2VzKSk7XG4gICAgdmFyIGxlbmd0aE9uZVNlbnRlbmNlcyA9IHNlbnRlbmNlcy5zZW50ZW5jZXMuZmlsdGVyKGZ1bmN0aW9uIChvU2VudGVuY2UpIHsgcmV0dXJuIG9TZW50ZW5jZS5sZW5ndGggPT09IDE7IH0pO1xuICAgIHZhciByZXMgPSAnJztcbiAgICAvLyByZW1vdmUgY2F0ZWdvcmllcyBhbmQgZG9tYWluc1xuICAgIHZhciBvbmx5RmFjdHMgPSBsZW5ndGhPbmVTZW50ZW5jZXMuZmlsdGVyKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlWzBdKSk7XG4gICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRG9tYWluKG9TZW50ZW5jZVswXSkgJiZcbiAgICAgICAgICAgICFXb3JkLldvcmQuaXNGaWxsZXIob1NlbnRlbmNlWzBdKSAmJiAhV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1NlbnRlbmNlWzBdKTtcbiAgICB9KTtcbiAgICB2YXIgb25seURvbWFpbnMgPSBsZW5ndGhPbmVTZW50ZW5jZXMuZmlsdGVyKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgcmV0dXJuIFdvcmQuV29yZC5pc0RvbWFpbihvU2VudGVuY2VbMF0pO1xuICAgIH0pO1xuICAgIGlmIChvbmx5RG9tYWlucyAmJiBvbmx5RG9tYWlucy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9ubHlEb21haW5zKSk7XG4gICAgICAgIG9ubHlEb21haW5zLmZvckVhY2goZnVuY3Rpb24gKHNlbnRlbmNlKSB7XG4gICAgICAgICAgICB2YXIgZG9tYWluID0gc2VudGVuY2VbMF0ubWF0Y2hlZFN0cmluZztcbiAgICAgICAgICAgIGlmICghZmlsdGVyZG9tYWluIHx8IGRvbWFpbiA9PT0gZmlsdGVyZG9tYWluKSB7XG4gICAgICAgICAgICAgICAgZGVidWdsb2coXCJoZXJlIG1hdGNoIFwiICsgSlNPTi5zdHJpbmdpZnkoc2VudGVuY2UpKTtcbiAgICAgICAgICAgICAgICByZXMgKz0gZGVzY3JpYmVEb21haW4oZmFjdCwgc2VudGVuY2VbMF0ubWF0Y2hlZFN0cmluZywgdGhlTW9kZWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZGVidWdsb2coXCJvbmx5IGZhY3RzOiBcIiArIEpTT04uc3RyaW5naWZ5KG9ubHlGYWN0cykpO1xuICAgIHZhciByZWNvcmRNYXAgPSB7fTtcbiAgICB2YXIgZG9tYWluc01hcCA9IHt9O1xuICAgIHZhciBtYXRjaGVkd29yZE1hcCA9IHt9O1xuICAgIHZhciBtYXRjaGVkQ2F0ZWdvcnlNYXAgPSB7fTtcbiAgICAvLyBsb29rIGZvciBhbGwgcmVjb3Jkc1xuICAgIG9ubHlGYWN0cy5mb3JFYWNoKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgcmV0dXJuIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgaW5jcmVtZW50KG1hdGNoZWR3b3JkTWFwLCBvV29yZC5tYXRjaGVkU3RyaW5nKTtcbiAgICAgICAgICAgIGluY3JlbWVudChtYXRjaGVkQ2F0ZWdvcnlNYXAsIG9Xb3JkLmNhdGVnb3J5KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgLy8gd2UgaGF2ZTpcbiAgICAvLyBhIGxpc3Qgb2YgY2F0ZWdvcmllcyxcbiAgICAvLyBhIGxpc3Qgb2YgbWF0Y2hlZFdvcmRzICAtPlxuICAgIC8vXG4gICAgdmFyIGNhdGVnb3JpZXMgPSBzb3J0ZWRLZXlzKG1hdGNoZWRDYXRlZ29yeU1hcCk7XG4gICAgdmFyIG1hdGNoZWR3b3JkcyA9IHNvcnRlZEtleXMobWF0Y2hlZHdvcmRNYXApO1xuICAgIGRlYnVnbG9nKFwibWF0Y2hlZHdvcmRzOiBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWR3b3JkcykpO1xuICAgIGRlYnVnbG9nKFwiY2F0ZWdvcmllczogXCIgKyBKU09OLnN0cmluZ2lmeShjYXRlZ29yaWVzKSk7XG4gICAgLy92YXIgYWxsTWF0Y2hlZFdvcmRzID0geyBba2V5IDogc3RyaW5nXSA6IG51bWJlciB9O1xuICAgIHZhciBkb21haW5SZWNvcmRDb3VudCA9IHt9O1xuICAgIHZhciBkb21haW5NYXRjaENhdENvdW50ID0ge307XG4gICAgLy8gd2UgcHJlcGFyZSB0aGUgZm9sbG93aW5nIHN0cnVjdHVyZVxuICAgIC8vXG4gICAgLy8ge2RvbWFpbn0gOiByZWNvcmRjb3VudDtcbiAgICAvLyB7bWF0Y2hlZHdvcmRzfSA6XG4gICAgLy8ge2RvbWFpbn0ge21hdGNoZWR3b3JkfSB7Y2F0ZWdvcnl9IHByZXNlbmNlY291bnRcbiAgICB0aGVNb2RlbC5yZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICBpZiAoIWZpbHRlcmRvbWFpbiB8fCByZWNvcmQuX2RvbWFpbiA9PT0gZmlsdGVyZG9tYWluKSB7XG4gICAgICAgICAgICBkb21haW5SZWNvcmRDb3VudFtyZWNvcmQuX2RvbWFpbl0gPSAoZG9tYWluUmVjb3JkQ291bnRbcmVjb3JkLl9kb21haW5dIHx8IDApICsgMTtcbiAgICAgICAgICAgIG1hdGNoZWR3b3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChtYXRjaGVkd29yZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYXRlZ29yaWVzLmZvckVhY2goZnVuY3Rpb24gKGNhdGVnb3J5KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWNvcmRbY2F0ZWdvcnldID09PSBtYXRjaGVkd29yZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1kID0gZG9tYWluTWF0Y2hDYXRDb3VudFtyZWNvcmQuX2RvbWFpbl0gPSBkb21haW5NYXRjaENhdENvdW50W3JlY29yZC5fZG9tYWluXSB8fCB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtZGMgPSBtZFttYXRjaGVkd29yZF0gPSBtZFttYXRjaGVkd29yZF0gfHwge307XG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNyZW1lbnQobWRjLCBjYXRlZ29yeSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkb21haW5NYXRjaENhdENvdW50LCB1bmRlZmluZWQsIDIpKTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkb21haW5SZWNvcmRDb3VudCwgdW5kZWZpbmVkLCAyKSk7XG4gICAgdmFyIGRvbWFpbnMgPSBzb3J0ZWRLZXlzKGRvbWFpbk1hdGNoQ2F0Q291bnQpO1xuICAgIHZhciByZXNOZXh0ID0gJ1wiJyArIGZhY3QgKyAnXCIgaGFzIGEgbWVhbmluZyBpbiAnO1xuICAgIHZhciBzaW5nbGUgPSBmYWxzZTtcbiAgICBpZiAoT2JqZWN0LmtleXMoZG9tYWluTWF0Y2hDYXRDb3VudCkubGVuZ3RoID4gMSkge1xuICAgICAgICByZXNOZXh0ICs9ICcnICsgZG9tYWlucy5sZW5ndGggK1xuICAgICAgICAgICAgJyBkb21haW5zOiAnICsgVXRpbHMubGlzdFRvUXVvdGVkQ29tbWFBbmQoZG9tYWlucykgKyBcIlwiO1xuICAgIH1cbiAgICBlbHNlIGlmIChkb21haW5zLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBpZiAoIWZpbHRlcmRvbWFpbikge1xuICAgICAgICAgICAgcmVzTmV4dCArPSBcIm9uZSBcIjtcbiAgICAgICAgfVxuICAgICAgICByZXNOZXh0ICs9IFwiZG9tYWluIFxcXCJcIiArIGRvbWFpbnNbMF0gKyBcIlxcXCI6XCI7XG4gICAgICAgIHNpbmdsZSA9IHRydWU7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBpZiAocmVzKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9XG4gICAgICAgIHZhciBmYWN0Y2xlYW4gPSBVdGlscy5zdHJpcFF1b3RlcyhmYWN0KTtcbiAgICAgICAgaWYgKGZpbHRlcmRvbWFpbikge1xuICAgICAgICAgICAgcmV0dXJuIFwiXFxcIlwiICsgZmFjdGNsZWFuICsgXCJcXFwiIGlzIG5vIGtub3duIGZhY3QgaW4gZG9tYWluIFxcXCJcIiArIGZpbHRlcmRvbWFpbiArIFwiXFxcIi5cXG5cIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gXCJJIGRvbid0IGtub3cgYW55dGhpbmcgYWJvdXQgXFxcIlwiICsgZmFjdGNsZWFuICsgXCJcXFwiLlxcblwiO1xuICAgIH1cbiAgICByZXMgKz0gcmVzTmV4dCArIFwiXFxuXCI7IC8vIC4uLlxcblwiO1xuICAgIGRvbWFpbnMuZm9yRWFjaChmdW5jdGlvbiAoZG9tYWluKSB7XG4gICAgICAgIHZhciBtZCA9IGRvbWFpbk1hdGNoQ2F0Q291bnRbZG9tYWluXTtcbiAgICAgICAgT2JqZWN0LmtleXMobWQpLmZvckVhY2goZnVuY3Rpb24gKG1hdGNoZWRzdHJpbmcpIHtcbiAgICAgICAgICAgIHZhciBtZGMgPSBtZFttYXRjaGVkc3RyaW5nXTtcbiAgICAgICAgICAgIGlmICghc2luZ2xlKSB7XG4gICAgICAgICAgICAgICAgcmVzICs9ICdpbiBkb21haW4gXCInICsgZG9tYWluICsgJ1wiICc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgY2F0c2luZ2xlID0gT2JqZWN0LmtleXMobWRjKS5sZW5ndGggPT09IDE7XG4gICAgICAgICAgICByZXMgKz0gc2xvcHB5T3JFeGFjdChtYXRjaGVkc3RyaW5nLCBmYWN0LCB0aGVNb2RlbCkgKyBcIiBcIjtcbiAgICAgICAgICAgIGlmICghY2F0c2luZ2xlKSB7XG4gICAgICAgICAgICAgICAgcmVzICs9IFwiLi4uXFxuXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhtZGMpLmZvckVhY2goZnVuY3Rpb24gKGNhdGVnb3J5KSB7XG4gICAgICAgICAgICAgICAgdmFyIHBlcmNlbnQgPSB0b1BlcmNlbnQobWRjW2NhdGVnb3J5XSwgZG9tYWluUmVjb3JkQ291bnRbZG9tYWluXSk7XG4gICAgICAgICAgICAgICAgcmVzICs9IFwiaXMgYSB2YWx1ZSBmb3IgY2F0ZWdvcnkgXFxcIlwiICsgY2F0ZWdvcnkgKyBcIlxcXCIgcHJlc2VudCBpbiBcIiArIG1kY1tjYXRlZ29yeV0gKyBcIihcIiArIHBlcmNlbnQgKyBcIiUpIG9mIHJlY29yZHM7XFxuXCI7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZGVzY3JpYmVGYWN0SW5Eb21haW4gPSBkZXNjcmliZUZhY3RJbkRvbWFpbjtcbmZ1bmN0aW9uIGRlc2NyaWJlQ2F0ZWdvcnkoY2F0ZWdvcnksIGZpbHRlckRvbWFpbiwgbW9kZWwsIG1lc3NhZ2UpIHtcbiAgICB2YXIgcmVzID0gW107XG4gICAgdmFyIGRvbXMgPSBNb2RlbC5nZXREb21haW5zRm9yQ2F0ZWdvcnkobW9kZWwsIGNhdGVnb3J5KTtcbiAgICBpZiAoZmlsdGVyRG9tYWluKSB7XG4gICAgICAgIGlmIChkb21zLmluZGV4T2YoZmlsdGVyRG9tYWluKSA+PSAwKSB7XG4gICAgICAgICAgICByZXMucHVzaChkZXNjcmliZUNhdGVnb3J5SW5Eb21haW4oY2F0ZWdvcnksIGZpbHRlckRvbWFpbiwgbW9kZWwpKTtcbiAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cbiAgICB9XG4gICAgZG9tcy5zb3J0KCk7XG4gICAgZG9tcy5mb3JFYWNoKGZ1bmN0aW9uIChkb21haW4pIHtcbiAgICAgICAgcmVzLnB1c2goZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluKGNhdGVnb3J5LCBkb21haW4sIG1vZGVsKSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZGVzY3JpYmVDYXRlZ29yeSA9IGRlc2NyaWJlQ2F0ZWdvcnk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
