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
        if (filterdomain) {
            return "\"" + fact + "\" is no known fact in domain \"" + filterdomain + "\".\n";
        }
        return "I don't know anything about \"" + fact + "\".\n";
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9kZXNjcmliZS50cyIsIm1hdGNoL2Rlc2NyaWJlLmpzIl0sIm5hbWVzIjpbIkFsZ29sIiwicmVxdWlyZSIsImRlYnVnIiwiZGVidWdsb2ciLCJsb2dnZXIiLCJsb2dQZXJmIiwicGVyZiIsInBlcmZsb2ciLCJXb3JkIiwiV2hhdElzIiwiTW9kZWwiLCJVdGlscyIsInNXb3JkcyIsImlzU3lub255bUZvciIsImV4YWN0V29yZCIsInNsb3BweVdvcmQiLCJ0aGVNb2RlbCIsImV4cG9ydHMiLCJzbG9wcHlPckV4YWN0IiwidG9Mb3dlckNhc2UiLCJjb3VudFJlY29yZFByZXNlbmNlIiwiY2F0ZWdvcnkiLCJkb21haW4iLCJyZXMiLCJ0b3RhbHJlY29yZHMiLCJwcmVzZW50cmVjb3JkcyIsInZhbHVlcyIsIm11bHRpdmFsdWVkIiwicmVjb3JkcyIsImZvckVhY2giLCJyZWNvcmQiLCJfZG9tYWluIiwidmFsIiwidmFsYXJyIiwiQXJyYXkiLCJpc0FycmF5IiwidW5kZWZpbmVkIiwiY291bnRSZWNvcmRQcmVzZW5jZUZhY3QiLCJmYWN0IiwiaW5kZXhPZiIsIm1ha2VWYWx1ZXNMaXN0U3RyaW5nIiwicmVhbHZhbHVlcyIsInZhbHVlc1N0cmluZyIsInRvdGFsbGVuIiwibGlzdFZhbHVlcyIsImZpbHRlciIsImluZGV4IiwibGVuZ3RoIiwiRGVzY3JpYmVWYWx1ZUxpc3RNaW5Db3VudFZhbHVlTGlzdCIsIkRlc2NyaWJlVmFsdWVMaXN0TGVuZ3RoQ2hhckxpbWl0IiwibWF4bGVuIiwicmVkdWNlIiwicHJldiIsIk1hdGgiLCJtYXgiLCJsaXN0IiwibGlzdFRvUXVvdGVkQ29tbWFPciIsImpvaW4iLCJ0b1BlcmNlbnQiLCJhIiwiYiIsInRvRml4ZWQiLCJnZXRDYXRlZ29yeVN0YXRzSW5Eb21haW4iLCJmaWx0ZXJkb21haW4iLCJyZWNvcmRDb3VudCIsIkpTT04iLCJzdHJpbmdpZnkiLCJwZXJjZW50IiwiYWxsVmFsdWVzIiwiT2JqZWN0Iiwia2V5cyIsInZhbHVlIiwic29ydCIsInVuZGVmTmFEZWx0YSIsImRlbHRhIiwiZGlzdGluY3QiLCJ2YWx1ZXNMaXN0IiwiY2F0ZWdvcnlEZXNjIiwiZnVsbCIsImNhdGVnb3JpZXMiLCJwcmVzZW50UmVjb3JkcyIsInBlcmNQcmVzZW50Iiwic2FtcGxlVmFsdWVzIiwiZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluIiwic3RhdHMiLCJkZXNjIiwiZGVzY3JpcHRpb24iLCJmaW5kUmVjb3Jkc1dpdGhGYWN0IiwibWF0Y2hlZFN0cmluZyIsImRvbWFpbnMiLCJpbmNyZW1lbnQiLCJtYXAiLCJrZXkiLCJzb3J0ZWRLZXlzIiwiciIsImRlc2NyaWJlRG9tYWluIiwiY291bnQiLCJjYXRjb3VudCIsImdldENhdGVnb3JpZXNGb3JEb21haW4iLCJkZXNjcmliZUZhY3RJbkRvbWFpbiIsInNlbnRlbmNlcyIsImFuYWx5emVDb250ZXh0U3RyaW5nIiwicnVsZXMiLCJsZW5ndGhPbmVTZW50ZW5jZXMiLCJvU2VudGVuY2UiLCJvbmx5RmFjdHMiLCJpc0RvbWFpbiIsImlzRmlsbGVyIiwiaXNDYXRlZ29yeSIsIm9ubHlEb21haW5zIiwic2VudGVuY2UiLCJyZWNvcmRNYXAiLCJkb21haW5zTWFwIiwibWF0Y2hlZHdvcmRNYXAiLCJtYXRjaGVkQ2F0ZWdvcnlNYXAiLCJvV29yZCIsIm1hdGNoZWR3b3JkcyIsImRvbWFpblJlY29yZENvdW50IiwiZG9tYWluTWF0Y2hDYXRDb3VudCIsIm1hdGNoZWR3b3JkIiwibWQiLCJtZGMiLCJyZXNOZXh0Iiwic2luZ2xlIiwibGlzdFRvUXVvdGVkQ29tbWFBbmQiLCJtYXRjaGVkc3RyaW5nIiwiY2F0c2luZ2xlIiwiZGVzY3JpYmVDYXRlZ29yeSIsImZpbHRlckRvbWFpbiIsIm1vZGVsIiwibWVzc2FnZSIsImRvbXMiLCJnZXREb21haW5zRm9yQ2F0ZWdvcnkiLCJwdXNoIl0sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7QUNRQTs7QURHQSxJQUFBQSxRQUFBQyxRQUFBLFNBQUEsQ0FB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IjpbIi8qKlxuICpcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmV4cGxhaW5cbiAqIEBmaWxlIGV4cGxhaW4udHNcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cbiAqXG4gKiBGdW5jdGlvbnMgZGVhbGluZyB3aXRoIGV4cGxhaW5pbmcgZmFjdHMsIGNhdGVnb3JpZXMgZXRjLlxuICovXG5cblxuaW1wb3J0ICogYXMgSW5wdXRGaWx0ZXIgZnJvbSAnLi9pbnB1dEZpbHRlcic7XG5pbXBvcnQgKiBhcyBBbGdvbCBmcm9tICcuL2FsZ29sJztcbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcblxuY29uc3QgZGVidWdsb2cgPSBkZWJ1ZygnZGVzY3JpYmUnKTtcbmltcG9ydCAqIGFzIGxvZ2dlciBmcm9tICcuLi91dGlscy9sb2dnZXInO1xudmFyIGxvZ1BlcmYgPSBsb2dnZXIucGVyZihcInBlcmZsaXN0YWxsXCIpO1xudmFyIHBlcmZsb2cgPSBkZWJ1ZygncGVyZicpO1xuLy9jb25zdCBwZXJmbG9nID0gbG9nZ2VyLnBlcmYoXCJwZXJmbGlzdGFsbFwiKTtcblxuaW1wb3J0ICogYXMgSU1hdGNoIGZyb20gJy4vaWZtYXRjaCc7XG5cbmltcG9ydCAqIGFzIFRvb2xtYXRjaGVyIGZyb20gJy4vdG9vbG1hdGNoZXInO1xuaW1wb3J0ICogYXMgQnJlYWtEb3duIGZyb20gJy4vYnJlYWtkb3duJztcblxuaW1wb3J0ICogYXMgU2VudGVuY2UgZnJvbSAnLi9zZW50ZW5jZSc7XG5cbmltcG9ydCAqIGFzIFdvcmQgZnJvbSAnLi93b3JkJztcbmltcG9ydCAqIGFzIE9wZXJhdG9yIGZyb20gJy4vb3BlcmF0b3InO1xuXG5pbXBvcnQgKiBhcyBXaGF0SXMgZnJvbSAnLi93aGF0aXMnO1xuXG5pbXBvcnQgKiBhcyBNb2RlbCBmcm9tICcuLi9tb2RlbC9tb2RlbCc7XG5pbXBvcnQgKiBhcyBNYXRjaCBmcm9tICcuL21hdGNoJztcblxuXG5pbXBvcnQgKiBhcyBVdGlscyBmcm9tICcuLi91dGlscy91dGlscyc7XG5cblxudmFyIHNXb3JkcyA9IHt9O1xuXG5leHBvcnQgZnVuY3Rpb24gaXNTeW5vbnltRm9yKGV4YWN0V29yZCA6IHN0cmluZywgc2xvcHB5V29yZCA6IHN0cmluZywgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzKSA6IGJvb2xlYW4ge1xuICAvLyBUT0RPOiB1c2UgbW9kZWwgc3lub255bXNcbiAgcmV0dXJuIHNsb3BweVdvcmQgPT09IFwibmFtZVwiICYmIGV4YWN0V29yZCA9PT0gXCJlbGVtZW50IG5hbWVcIjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNsb3BweU9yRXhhY3QoZXhhY3RXb3JkIDogc3RyaW5nLCBzbG9wcHlXb3JkIDogc3RyaW5nLCB0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMpIHtcbiAgaWYoZXhhY3RXb3JkLnRvTG93ZXJDYXNlKCkgPT09IHNsb3BweVdvcmQudG9Mb3dlckNhc2UoKSkge1xuICAgIHJldHVybiAnXCInICsgc2xvcHB5V29yZCArICdcIic7XG4gIH1cbiAgLy8gVE9ETywgZmluZCBwbHVyYWwgcyBldGMuXG4gIC8vIHN0aWxsIGV4YWN0LFxuICAvL1xuICBpZihpc1N5bm9ueW1Gb3IoZXhhY3RXb3JkLHNsb3BweVdvcmQsdGhlTW9kZWwpKSB7XG5yZXR1cm4gJ1wiJyArIHNsb3BweVdvcmQgKyAnXCIgKGludGVycHJldGVkIGFzIHN5bm9ueW0gZm9yIFwiJyArIGV4YWN0V29yZCArJ1wiKSc7XG4gIH1cbiAgLy90b2RvLCBmaW5kIGlzIHN5bm9ueW1mb3IgLi4uXG4gIC8vIFRPRE8sIGEgc3lub255bSBmb3IgLi4uXG4gIHJldHVybiAnXCInICsgc2xvcHB5V29yZCArICdcIiAoaW50ZXJwcmV0ZWQgYXMgXCInICsgZXhhY3RXb3JkICsnXCIpJztcbn1cblxuaW50ZXJmYWNlIElEZXNjcmliZUNhdGVnb3J5IHtcbiAgICB0b3RhbHJlY29yZHMgOiBudW1iZXIsXG4gICAgcHJlc2VudHJlY29yZHMgOiBudW1iZXIsXG4gICAgdmFsdWVzIDogeyBba2V5IDogc3RyaW5nXSA6IG51bWJlcn0sXG4gICAgbXVsdGl2YWx1ZWQgOiBib29sZWFuXG4gIH1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvdW50UmVjb3JkUHJlc2VuY2UoY2F0ZWdvcnkgOiBzdHJpbmcsIGRvbWFpbiA6IHN0cmluZywgdGhlTW9kZWwgOiBJTWF0Y2guSU1vZGVscykgOiBJRGVzY3JpYmVDYXRlZ29yeSB7XG4gIHZhciByZXMgPSB7IHRvdGFscmVjb3JkcyA6IDAsXG4gICAgcHJlc2VudHJlY29yZHMgOiAwLFxuICAgIHZhbHVlcyA6IHsgfSwgIC8vIGFuIHRoZWlyIGZyZXF1ZW5jeVxuICAgIG11bHRpdmFsdWVkIDogZmFsc2VcbiAgfSBhcyBJRGVzY3JpYmVDYXRlZ29yeTtcbiAgdGhlTW9kZWwucmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uKHJlY29yZCkge1xuICAgIC8vZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkLHVuZGVmaW5lZCwyKSk7XG4gICAgaWYocmVjb3JkLl9kb21haW4gIT09IGRvbWFpbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXMudG90YWxyZWNvcmRzKys7XG4gICAgdmFyIHZhbCA9IHJlY29yZFtjYXRlZ29yeV07XG4gICAgdmFyIHZhbGFyciA9IFt2YWxdO1xuICAgIGlmKEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgcmVzLm11bHRpdmFsdWVkID0gdHJ1ZTtcbiAgICAgIHZhbGFyciA9IHZhbDtcbiAgICB9XG4gICAgLy8gdG9kbyB3cmFwIGFyclxuICAgIGlmKHZhbCAhPT0gdW5kZWZpbmVkICYmIHZhbCAhPT0gXCJuL2FcIikge1xuICAgICAgcmVzLnByZXNlbnRyZWNvcmRzICsrO1xuICAgIH1cbiAgICB2YWxhcnIuZm9yRWFjaChmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJlcy52YWx1ZXNbdmFsXSA9IChyZXMudmFsdWVzW3ZhbF0gfHwgMCkgKyAxO1xuICAgIH0pXG4gIH0pXG4gIHJldHVybiByZXM7XG59XG5cbi8vIGNhdGVnb3J5ID0+IG1hdGNoZWR3b3Jkc1tdO1xuXG5pbnRlcmZhY2UgSURlc2NyaWJlRmFjdCB7XG4gICAgdG90YWxyZWNvcmRzIDogbnVtYmVyLFxuICAgIHByZXNlbnRyZWNvcmRzIDogbnVtYmVyLFxuICAgIG11bHRpdmFsdWVkIDogYm9vbGVhblxuICB9XG5cbmV4cG9ydCBmdW5jdGlvbiBjb3VudFJlY29yZFByZXNlbmNlRmFjdChmYWN0IDogc3RyaW5nLCBjYXRlZ29yeSA6IHN0cmluZywgZG9tYWluIDogc3RyaW5nLCB0aGVNb2RlbCA6IElNYXRjaC5JTW9kZWxzKSA6IElEZXNjcmliZUZhY3Qge1xuICB2YXIgcmVzID0geyB0b3RhbHJlY29yZHMgOiAwLFxuICAgIHByZXNlbnRyZWNvcmRzIDogMCxcbiAgICB2YWx1ZXMgOiB7IH0sICAvLyBhbiB0aGVpciBmcmVxdWVuY3lcbiAgICBtdWx0aXZhbHVlZCA6IGZhbHNlXG4gIH0gYXMgSURlc2NyaWJlQ2F0ZWdvcnk7XG4gIHRoZU1vZGVsLnJlY29yZHMuZm9yRWFjaChmdW5jdGlvbihyZWNvcmQpIHtcbiAgICAvL2RlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZCx1bmRlZmluZWQsMikpO1xuICAgIGlmKHJlY29yZC5fZG9tYWluICE9PSBkb21haW4pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmVzLnRvdGFscmVjb3JkcysrO1xuICAgIHZhciB2YWwgPSByZWNvcmRbY2F0ZWdvcnldO1xuICAgIHZhciB2YWxhcnIgPSBbdmFsXTtcbiAgICBpZihBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICAgIGlmKHZhbC5pbmRleE9mKGZhY3QpID49IDApIHtcbiAgICAgICAgcmVzLm11bHRpdmFsdWVkID0gdHJ1ZTtcbiAgICAgICAgdmFsYXJyID0gdmFsO1xuICAgICAgICByZXMucHJlc2VudHJlY29yZHMrKztcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHZhbCA9PT0gZmFjdCkge1xuICAgICAgICByZXMucHJlc2VudHJlY29yZHMrKztcbiAgICB9XG4gIH0pXG4gIHJldHVybiByZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWtlVmFsdWVzTGlzdFN0cmluZyhyZWFsdmFsdWVzOiBzdHJpbmdbXSkgOiBzdHJpbmcge1xuICB2YXIgdmFsdWVzU3RyaW5nID0gXCJcIjtcbiAgdmFyIHRvdGFsbGVuID0gMDtcbiAgdmFyIGxpc3RWYWx1ZXMgPSByZWFsdmFsdWVzLmZpbHRlcihmdW5jdGlvbih2YWwsIGluZGV4KSB7XG4gICAgdG90YWxsZW4gPSB0b3RhbGxlbiArIHZhbC5sZW5ndGg7XG4gIHJldHVybiAoaW5kZXggPCBBbGdvbC5EZXNjcmliZVZhbHVlTGlzdE1pbkNvdW50VmFsdWVMaXN0KSB8fCAodG90YWxsZW4gPCBBbGdvbC5EZXNjcmliZVZhbHVlTGlzdExlbmd0aENoYXJMaW1pdCk7XG4gIH0pO1xuICBpZihsaXN0VmFsdWVzLmxlbmd0aCA9PT0gMSAmJiByZWFsdmFsdWVzLmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiAnVGhlIHNvbGUgdmFsdWUgaXMgXFxcIicgKyBsaXN0VmFsdWVzWzBdICsgJ1wiJztcbiAgfVxuICB2YXIgbWF4bGVuID0gbGlzdFZhbHVlcy5yZWR1Y2UoIChwcmV2LHZhbCkgPT4gTWF0aC5tYXgocHJldix2YWwubGVuZ3RoKSwwKTtcbiAgaWYobWF4bGVuID4gMzApIHtcbiAgICByZXR1cm4gXCJQb3NzaWJsZSB2YWx1ZXMgYXJlIC4uLlxcblwiICtcbiAgICAgIGxpc3RWYWx1ZXMucmVkdWNlKCAocHJldix2YWwsaW5kZXgpID0+IChwcmV2ICsgXCIoXCIgKyAoaW5kZXggKyAxKSArICcpOiBcIicgKyB2YWwgKyAnXCJcXG4nXG4gICAgICApLFwiXCIpXG4gICAgICArICggbGlzdFZhbHVlcy5sZW5ndGggPT09IHJlYWx2YWx1ZXMubGVuZ3RoID8gXCJcIiA6IFwiLi4uXCIpO1xuICB9XG4gIHZhciBsaXN0ID0gXCJcIjtcbiAgaWYobGlzdFZhbHVlcy5sZW5ndGggPT09IHJlYWx2YWx1ZXMubGVuZ3RoKSB7XG4gICAgbGlzdCA9IFV0aWxzLmxpc3RUb1F1b3RlZENvbW1hT3IobGlzdFZhbHVlcyk7XG4gIH0gZWxzZSB7XG4gICAgbGlzdCA9ICdcIicgKyBsaXN0VmFsdWVzLmpvaW4oJ1wiLCBcIicpICsgJ1wiJztcbiAgfVxuICByZXR1cm4gXCJQb3NzaWJsZSB2YWx1ZXMgYXJlIC4uLlxcblwiXG4gICAgKyBsaXN0XG4gICAgKyAoIGxpc3RWYWx1ZXMubGVuZ3RoID09PSByZWFsdmFsdWVzLmxlbmd0aCA/IFwiXCIgOiBcIiAuLi5cIik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b1BlcmNlbnQoYSA6IG51bWJlciwgYjogbnVtYmVyKSA6IHN0cmluZyB7XG4gIHJldHVybiBcIlwiICsgKDEwMCogYSAvIGIpLnRvRml4ZWQoMSk7XG59XG5cblxuZXhwb3J0IGludGVyZmFjZSBJQ2F0ZWdvcnlTdGF0cyB7XG4gIGNhdGVnb3J5RGVzYyA6IElNYXRjaC5JQ2F0ZWdvcnlEZXNjLFxuICBwcmVzZW50UmVjb3JkcyA6IG51bWJlcixcbiAgZGlzdGluY3QgOiBzdHJpbmcsXG4gIGRlbHRhIDogc3RyaW5nLFxuICBwZXJjUHJlc2VudCA6IHN0cmluZyxcbiAgc2FtcGxlVmFsdWVzIDogc3RyaW5nLFxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldENhdGVnb3J5U3RhdHNJbkRvbWFpbihjYXRlZ29yeSA6IHN0cmluZywgZmlsdGVyZG9tYWluIDogc3RyaW5nLCB0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMpIDogSUNhdGVnb3J5U3RhdHMge1xuICBjb25zdCByZWNvcmRDb3VudCA9IGNvdW50UmVjb3JkUHJlc2VuY2UoY2F0ZWdvcnksIGZpbHRlcmRvbWFpbiwgdGhlTW9kZWwpO1xuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeSh0aGVNb2RlbC5yZWNvcmRzLmZpbHRlcihhID0+IGEuX2RvbWFpbiA9PT0gXCJDb3Ntb3NcIiksdW5kZWZpbmVkLDIpKTtcbiAgY29uc3QgcGVyY2VudCA9IHRvUGVyY2VudChyZWNvcmRDb3VudC5wcmVzZW50cmVjb3JkcyAsIHJlY29yZENvdW50LnRvdGFscmVjb3Jkcyk7XG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZENvdW50LnZhbHVlcykpO1xuICB2YXIgYWxsVmFsdWVzID1PYmplY3Qua2V5cyhyZWNvcmRDb3VudC52YWx1ZXMpO1xuICB2YXIgcmVhbHZhbHVlcyA9IGFsbFZhbHVlcy5maWx0ZXIodmFsdWUgPT4gKHZhbHVlICE9PSAndW5kZWZpbmVkJykgJiYgKHZhbHVlICE9PSAnbi9hJykpO1xuICBkZWJ1Z2xvZ1xuICByZWFsdmFsdWVzLnNvcnQoKTtcbiAgdmFyIHVuZGVmTmFEZWx0YSA9ICAoYWxsVmFsdWVzLmxlbmd0aCAtIHJlYWx2YWx1ZXMubGVuZ3RoKTtcbiAgdmFyIGRlbHRhID0gICh1bmRlZk5hRGVsdGEpID8gIFwiKCtcIiArIHVuZGVmTmFEZWx0YSArIFwiKVwiIDogXCJcIjtcbiAgY29uc3QgZGlzdGluY3QgPSAnJyArIHJlYWx2YWx1ZXMubGVuZ3RoO1xuICBjb25zdCB2YWx1ZXNMaXN0ID0gbWFrZVZhbHVlc0xpc3RTdHJpbmcocmVhbHZhbHVlcyk7XG4gIHJldHVybiB7XG4gICAgY2F0ZWdvcnlEZXNjIDogdGhlTW9kZWwuZnVsbC5kb21haW5bZmlsdGVyZG9tYWluXS5jYXRlZ29yaWVzW2NhdGVnb3J5XSxcbiAgICBkaXN0aW5jdCA6IGRpc3RpbmN0LFxuICAgIGRlbHRhIDogZGVsdGEsXG4gICAgcHJlc2VudFJlY29yZHMgOiByZWNvcmRDb3VudC5wcmVzZW50cmVjb3JkcyxcbiAgICBwZXJjUHJlc2VudCA6IHBlcmNlbnQsXG4gICAgc2FtcGxlVmFsdWVzIDogdmFsdWVzTGlzdFxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXNjcmliZUNhdGVnb3J5SW5Eb21haW4oY2F0ZWdvcnkgOiBzdHJpbmcsIGZpbHRlcmRvbWFpbiA6IHN0cmluZywgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzKSA6IHN0cmluZyB7XG4vKiAgY29uc3QgcmVjb3JkQ291bnQgPSBjb3VudFJlY29yZFByZXNlbmNlKGNhdGVnb3J5LCBmaWx0ZXJkb21haW4sIHRoZU1vZGVsKTtcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkodGhlTW9kZWwucmVjb3Jkcy5maWx0ZXIoYSA9PiBhLl9kb21haW4gPT09IFwiQ29zbW9zXCIpLHVuZGVmaW5lZCwyKSk7XG4gIGNvbnN0IHBlcmNlbnQgPSB0b1BlcmNlbnQocmVjb3JkQ291bnQucHJlc2VudHJlY29yZHMgLCByZWNvcmRDb3VudC50b3RhbHJlY29yZHMpO1xuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRDb3VudC52YWx1ZXMpKTtcbiAgdmFyIGFsbFZhbHVlcyA9T2JqZWN0LmtleXMocmVjb3JkQ291bnQudmFsdWVzKTtcbiAgdmFyIHJlYWx2YWx1ZXMgPSBhbGxWYWx1ZXMuZmlsdGVyKHZhbHVlID0+ICh2YWx1ZSAhPT0gJ3VuZGVmaW5lZCcpICYmICh2YWx1ZSAhPT0gJ24vYScpKTtcbiAgZGVidWdsb2dcbiAgcmVhbHZhbHVlcy5zb3J0KCk7XG4gIHZhciB1bmRlZk5hRGVsdGEgPSAgKGFsbFZhbHVlcy5sZW5ndGggLSByZWFsdmFsdWVzLmxlbmd0aCk7XG4gIHZhciBkZWx0YSA9ICAodW5kZWZOYURlbHRhKSA/ICBcIigrXCIgKyB1bmRlZk5hRGVsdGEgKyBcIilcIiA6IFwiXCI7XG4gIGNvbnN0IGRpc3RpbmN0ID0gJycgKyByZWFsdmFsdWVzLmxlbmd0aDtcblxuICBjb25zdCB2YWx1ZXNMaXN0ID0gbWFrZVZhbHVlc0xpc3RTdHJpbmcocmVhbHZhbHVlcyk7XG4qL1xuICB2YXIgc3RhdHMgPSBnZXRDYXRlZ29yeVN0YXRzSW5Eb21haW4oY2F0ZWdvcnksZmlsdGVyZG9tYWluLHRoZU1vZGVsKTtcblxuICB2YXIgcmVzID0gJ2lzIGEgY2F0ZWdvcnkgaW4gZG9tYWluIFwiJyArIGZpbHRlcmRvbWFpbiArICdcIlxcbidcbiAgKyBgSXQgaXMgcHJlc2VudCBpbiAke3N0YXRzLnByZXNlbnRSZWNvcmRzfSAoJHtzdGF0cy5wZXJjUHJlc2VudH0lKSBvZiByZWNvcmRzIGluIHRoaXMgZG9tYWluLFxcbmAgK1xuICAgYGhhdmluZyAke3N0YXRzLmRpc3RpbmN0ICsgJyd9JHtzdGF0cy5kZWx0YX0gZGlzdGluY3QgdmFsdWVzLlxcbmBcbiAgKyBzdGF0cy5zYW1wbGVWYWx1ZXM7XG5cbiAgdmFyIGRlc2MgPSB0aGVNb2RlbC5mdWxsLmRvbWFpbltmaWx0ZXJkb21haW5dLmNhdGVnb3JpZXNbY2F0ZWdvcnldIHx8IHt9IGFzIElNYXRjaC5JQ2F0ZWdvcnlEZXNjO1xuICB2YXIgZGVzY3JpcHRpb24gPSBkZXNjLmRlc2NyaXB0aW9uIHx8IFwiXCI7XG4gIGlmIChkZXNjcmlwdGlvbikge1xuICAgIHJlcyArPSBgXFxuRGVzY3JpcHRpb246ICR7ZGVzY3JpcHRpb259YDtcbiAgfVxuICByZXR1cm4gcmVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmluZFJlY29yZHNXaXRoRmFjdChtYXRjaGVkU3RyaW5nOiBzdHJpbmcsIGNhdGVnb3J5IDogc3RyaW5nLCByZWNvcmRzIDogYW55LCBkb21haW5zIDogeyBba2V5IDogc3RyaW5nXSA6IG51bWJlcn0pIDogYW55W10ge1xuICByZXR1cm4gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24ocmVjb3JkKSAge1xuXG4gICAgbGV0IHJlcyA9IChyZWNvcmRbY2F0ZWdvcnldID09PSBtYXRjaGVkU3RyaW5nKTtcbiAgICBpZiggcmVzKSB7XG4gICAgICBpbmNyZW1lbnQoZG9tYWlucyxyZWNvcmRzLl9kb21haW4pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGluY3JlbWVudChtYXAgOiB7W2tleTogc3RyaW5nXSA6IG51bWJlcn0sIGtleSA6IHN0cmluZykge1xuICBtYXBba2V5XSA9IChtYXBba2V5XSB8fCAwKSArIDE7XG59XG5cbmZ1bmN0aW9uIHNvcnRlZEtleXM8VD4obWFwIDoge1trZXkgOiBzdHJpbmddIDogVH0pIDogc3RyaW5nW10ge1xuICB2YXIgciA9IE9iamVjdC5rZXlzKG1hcCk7XG4gIHIuc29ydCgpO1xuICByZXR1cm4gcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlc2NyaWJlRG9tYWluKGZhY3QgOiBzdHJpbmcsIGRvbWFpbjogc3RyaW5nLCB0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMpIDogc3RyaW5nIHtcbiAgdmFyIGNvdW50ID0gdGhlTW9kZWwucmVjb3Jkcy5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgcmVjb3JkKSB7XG4gICAgcmV0dXJuIHByZXYgKyAoKHJlY29yZC5fZG9tYWluID09PSBkb21haW4pID8gMSA6IDApO1xuICB9LDApO1xuICB2YXIgY2F0Y291bnQgPSBNb2RlbC5nZXRDYXRlZ29yaWVzRm9yRG9tYWluKHRoZU1vZGVsLCBkb21haW4pLmxlbmd0aDtcbiAgdmFyIHJlcyA9IHNsb3BweU9yRXhhY3QoZG9tYWluLCBmYWN0LCB0aGVNb2RlbCkgKyBgaXMgYSBkb21haW4gd2l0aCAke2NhdGNvdW50fSBjYXRlZ29yaWVzIGFuZCAke2NvdW50fSByZWNvcmRzXFxuYDtcbiAgdmFyIGRlc2MgPSB0aGVNb2RlbC5mdWxsLmRvbWFpbltkb21haW5dLmRlc2NyaXB0aW9uIHx8IFwiXCI7XG4gIGlmKGRlc2MpIHtcbiAgICByZXMgKz0gYERlc2NyaXB0aW9uOmAgKyBkZXNjICsgYFxcbmA7XG4gIH1cbiAgcmV0dXJuIHJlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlc2NyaWJlRmFjdEluRG9tYWluKGZhY3QgOiBzdHJpbmcsIGZpbHRlcmRvbWFpbiA6IHN0cmluZywgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzKSA6IHN0cmluZyB7XG4gIHZhciBzZW50ZW5jZXMgPSBXaGF0SXMuYW5hbHl6ZUNvbnRleHRTdHJpbmcoZmFjdCwgIHRoZU1vZGVsLnJ1bGVzKTtcbiAgLy9jb25zb2xlLmxvZyhcImhlcmUgc2VudGVuY2VzIFwiICsgSlNPTi5zdHJpbmdpZnkoc2VudGVuY2VzKSk7XG4gIHZhciBsZW5ndGhPbmVTZW50ZW5jZXMgPSBzZW50ZW5jZXMuc2VudGVuY2VzLmZpbHRlcihvU2VudGVuY2UgPT4gb1NlbnRlbmNlLmxlbmd0aCA9PT0gMSk7XG4gIHZhciByZXMgPSAnJztcbiAgLy8gcmVtb3ZlIGNhdGVnb3JpZXMgYW5kIGRvbWFpbnNcbiAgdmFyIG9ubHlGYWN0cyA9IGxlbmd0aE9uZVNlbnRlbmNlcy5maWx0ZXIob1NlbnRlbmNlID0+e1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZVswXSkpO1xuICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRG9tYWluKG9TZW50ZW5jZVswXSkgJiZcbiAgICAgICAgICAgIVdvcmQuV29yZC5pc0ZpbGxlcihvU2VudGVuY2VbMF0pICYmICFXb3JkLldvcmQuaXNDYXRlZ29yeShvU2VudGVuY2VbMF0pXG4gIH1cbiAgKTtcbiAgdmFyIG9ubHlEb21haW5zID0gbGVuZ3RoT25lU2VudGVuY2VzLmZpbHRlcihvU2VudGVuY2UgPT57XG4gICAgcmV0dXJuIFdvcmQuV29yZC5pc0RvbWFpbihvU2VudGVuY2VbMF0pO1xuICB9KTtcbiAgaWYob25seURvbWFpbnMgJiYgb25seURvbWFpbnMubGVuZ3RoID4gMCkge1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9ubHlEb21haW5zKSk7XG4gICAgb25seURvbWFpbnMuZm9yRWFjaChmdW5jdGlvbihzZW50ZW5jZSkge1xuICAgICAgdmFyIGRvbWFpbiA9IHNlbnRlbmNlWzBdLm1hdGNoZWRTdHJpbmc7XG4gICAgICBpZiggIWZpbHRlcmRvbWFpbiB8fCBkb21haW4gPT09IGZpbHRlcmRvbWFpbikge1xuICAgICAgICBkZWJ1Z2xvZyhcImhlcmUgbWF0Y2ggXCIgKyBKU09OLnN0cmluZ2lmeShzZW50ZW5jZSkpO1xuICAgICAgICByZXMgKz0gZGVzY3JpYmVEb21haW4oZmFjdCwgc2VudGVuY2VbMF0ubWF0Y2hlZFN0cmluZywgdGhlTW9kZWwpO1xuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBkZWJ1Z2xvZyhcIm9ubHkgZmFjdHM6IFwiICsgSlNPTi5zdHJpbmdpZnkob25seUZhY3RzKSk7XG4gIHZhciByZWNvcmRNYXAgPSB7fTtcbiAgdmFyIGRvbWFpbnNNYXAgPSB7fSBhcyB7W2tleTogc3RyaW5nXSA6IG51bWJlcn07XG4gIHZhciBtYXRjaGVkd29yZE1hcCA9IHt9IGFzIHtba2V5OiBzdHJpbmddIDogbnVtYmVyfTtcbiAgdmFyIG1hdGNoZWRDYXRlZ29yeU1hcCA9IHt9IGFzIHtba2V5OiBzdHJpbmddIDogbnVtYmVyfTtcbiAgLy8gbG9vayBmb3IgYWxsIHJlY29yZHNcbiAgb25seUZhY3RzLmZvckVhY2gob1NlbnRlbmNlID0+XG4gICAgb1NlbnRlbmNlLmZvckVhY2gob1dvcmQgPT5cbiAgICAgIHtcbiAgICAgICAgaW5jcmVtZW50KG1hdGNoZWR3b3JkTWFwLCBvV29yZC5tYXRjaGVkU3RyaW5nKTtcbiAgICAgICAgaW5jcmVtZW50KG1hdGNoZWRDYXRlZ29yeU1hcCwgb1dvcmQuY2F0ZWdvcnkpO1xuICAgICAgfVxuICAgIClcbiAgKTtcbiAgLy8gd2UgaGF2ZTpcbiAgLy8gYSBsaXN0IG9mIGNhdGVnb3JpZXMsXG4gIC8vIGEgbGlzdCBvZiBtYXRjaGVkV29yZHMgIC0+XG4gIC8vXG5cbiAgdmFyIGNhdGVnb3JpZXMgPSBzb3J0ZWRLZXlzKG1hdGNoZWRDYXRlZ29yeU1hcCk7XG4gIHZhciBtYXRjaGVkd29yZHMgPSBzb3J0ZWRLZXlzKG1hdGNoZWR3b3JkTWFwKTtcbiAgZGVidWdsb2coXCJtYXRjaGVkd29yZHM6IFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZHdvcmRzKSk7XG4gIGRlYnVnbG9nKFwiY2F0ZWdvcmllczogXCIgKyBKU09OLnN0cmluZ2lmeShjYXRlZ29yaWVzKSk7XG5cbiAgLy92YXIgYWxsTWF0Y2hlZFdvcmRzID0geyBba2V5IDogc3RyaW5nXSA6IG51bWJlciB9O1xuICB2YXIgZG9tYWluUmVjb3JkQ291bnQgPSB7fSBhcyB7W2tleTogc3RyaW5nXSA6IG51bWJlcn07XG4gIHZhciBkb21haW5NYXRjaENhdENvdW50ID0ge30gYXMge1trZXk6IHN0cmluZ10gOlxuICAgICAgIHtba2V5OiBzdHJpbmddIDpcbiAgICAge1trZXk6IHN0cmluZ10gOiBudW1iZXJ9fX07XG4gIC8vIHdlIHByZXBhcmUgdGhlIGZvbGxvd2luZyBzdHJ1Y3R1cmVcbiAgLy9cbiAgLy8ge2RvbWFpbn0gOiByZWNvcmRjb3VudDtcbiAgLy8ge21hdGNoZWR3b3Jkc30gOlxuICAvLyB7ZG9tYWlufSB7bWF0Y2hlZHdvcmR9IHtjYXRlZ29yeX0gcHJlc2VuY2Vjb3VudFxuICB0aGVNb2RlbC5yZWNvcmRzLmZvckVhY2goZnVuY3Rpb24ocmVjb3JkKSB7XG4gICAgaWYoIWZpbHRlcmRvbWFpbiB8fCByZWNvcmQuX2RvbWFpbiA9PT0gZmlsdGVyZG9tYWluICkge1xuICAgICAgZG9tYWluUmVjb3JkQ291bnRbcmVjb3JkLl9kb21haW5dID0gKGRvbWFpblJlY29yZENvdW50W3JlY29yZC5fZG9tYWluXSB8fCAwKSArIDE7XG4gICAgICBtYXRjaGVkd29yZHMuZm9yRWFjaChtYXRjaGVkd29yZCA9PlxuICAgICAgICBjYXRlZ29yaWVzLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xuICAgICAgICAgIGlmKCByZWNvcmRbY2F0ZWdvcnldID09PSBtYXRjaGVkd29yZCkge1xuICAgICAgICAgICAgdmFyIG1kID0gZG9tYWluTWF0Y2hDYXRDb3VudFtyZWNvcmQuX2RvbWFpbl0gPSBkb21haW5NYXRjaENhdENvdW50W3JlY29yZC5fZG9tYWluXSB8fCB7fTtcbiAgICAgICAgICAgIHZhciBtZGMgPSBtZFttYXRjaGVkd29yZF0gPSAgbWRbbWF0Y2hlZHdvcmRdIHx8IHt9O1xuICAgICAgICAgICAgaW5jcmVtZW50KG1kYyxjYXRlZ29yeSk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICApXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRvbWFpbk1hdGNoQ2F0Q291bnQsdW5kZWZpbmVkLDIpKTtcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZG9tYWluUmVjb3JkQ291bnQsdW5kZWZpbmVkLDIpKTtcbiAgdmFyIGRvbWFpbnMgPSBzb3J0ZWRLZXlzKGRvbWFpbk1hdGNoQ2F0Q291bnQpO1xuICB2YXIgcmVzTmV4dCA9ICAnXCInICsgZmFjdCArICdcIiBoYXMgYSBtZWFuaW5nIGluICc7XG4gIHZhciBzaW5nbGUgPSBmYWxzZTtcbiAgaWYoT2JqZWN0LmtleXMoZG9tYWluTWF0Y2hDYXRDb3VudCkubGVuZ3RoID4gMSkge1xuICAgIHJlc05leHQgKz0gJycgKyBkb21haW5zLmxlbmd0aCArXG4gICAgICAgICAgICAgICcgZG9tYWluczogJyArIFV0aWxzLmxpc3RUb1F1b3RlZENvbW1hQW5kKGRvbWFpbnMpICsgXCJcIjtcbiAgfSBlbHNlIGlmKGRvbWFpbnMubGVuZ3RoID09PSAxKSB7XG4gICAgaWYoIWZpbHRlcmRvbWFpbikge1xuICAgICAgcmVzTmV4dCArPSBgb25lIGA7XG4gICAgfVxuICAgIHJlc05leHQgKz0gYGRvbWFpbiBcIiR7ZG9tYWluc1swXX1cIjpgO1xuICAgIHNpbmdsZSA9IHRydWU7XG4gIH0gZWxzZSB7XG4gICAgaWYocmVzKSB7XG4gICAgICByZXR1cm4gcmVzO1xuICAgIH1cbiAgICBpZihmaWx0ZXJkb21haW4pIHtcbiAgICAgIHJldHVybiBgXCIke2ZhY3R9XCIgaXMgbm8ga25vd24gZmFjdCBpbiBkb21haW4gXCIke2ZpbHRlcmRvbWFpbn1cIi5cXG5gO1xuICAgIH1cbiAgICByZXR1cm4gYEkgZG9uJ3Qga25vdyBhbnl0aGluZyBhYm91dCBcIiR7ZmFjdH1cIi5cXG5gO1xuICB9XG4gIHJlcyArPSByZXNOZXh0ICsgXCJcXG5cIjsgLy8gLi4uXFxuXCI7XG4gIGRvbWFpbnMuZm9yRWFjaChmdW5jdGlvbihkb21haW4pIHtcbiAgICB2YXIgbWQgPSBkb21haW5NYXRjaENhdENvdW50W2RvbWFpbl07XG4gICAgT2JqZWN0LmtleXMobWQpLmZvckVhY2gobWF0Y2hlZHN0cmluZyA9PiB7XG4gICAgICB2YXIgbWRjID0gbWRbbWF0Y2hlZHN0cmluZ107XG4gICAgICBpZighc2luZ2xlKSB7XG4gICAgICAgIHJlcyArPSAnaW4gZG9tYWluIFwiJyArIGRvbWFpbiArICdcIiAnO1xuICAgICAgfVxuICAgICAgdmFyIGNhdHNpbmdsZSA9IE9iamVjdC5rZXlzKG1kYykubGVuZ3RoID09PSAxO1xuICAgICAgcmVzICs9IGAke3Nsb3BweU9yRXhhY3QobWF0Y2hlZHN0cmluZyxmYWN0LHRoZU1vZGVsKX0gYDtcbiAgICAgIGlmKCFjYXRzaW5nbGUpIHtcbiAgICAgICAgcmVzICs9IGAuLi5cXG5gO1xuICAgICAgfVxuICAgICAgT2JqZWN0LmtleXMobWRjKS5mb3JFYWNoKGNhdGVnb3J5ID0+IHtcbiAgICAgIHZhciBwZXJjZW50ID0gIHRvUGVyY2VudChtZGNbY2F0ZWdvcnldLGRvbWFpblJlY29yZENvdW50W2RvbWFpbl0pO1xuXG4gICAgICAgIHJlcyArPSBgaXMgYSB2YWx1ZSBmb3IgY2F0ZWdvcnkgXCIke2NhdGVnb3J5fVwiIHByZXNlbnQgaW4gJHttZGNbY2F0ZWdvcnldfSgke3BlcmNlbnR9JSkgb2YgcmVjb3JkcztcXG5gO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuICByZXR1cm4gcmVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVzY3JpYmVDYXRlZ29yeShjYXRlZ29yeSA6IHN0cmluZywgZmlsdGVyRG9tYWluOiBzdHJpbmcsIG1vZGVsOiBJTWF0Y2guSU1vZGVscyxtZXNzYWdlIDogc3RyaW5nKSA6IHN0cmluZ1tdIHtcbiAgdmFyIHJlcyA9IFtdO1xuICB2YXIgZG9tcyA9IE1vZGVsLmdldERvbWFpbnNGb3JDYXRlZ29yeShtb2RlbCxjYXRlZ29yeSk7XG4gIGlmKGZpbHRlckRvbWFpbikge1xuICAgIGlmKGRvbXMuaW5kZXhPZihmaWx0ZXJEb21haW4pID49IDApIHtcbiAgICAgIHJlcy5wdXNoKGRlc2NyaWJlQ2F0ZWdvcnlJbkRvbWFpbihjYXRlZ29yeSxmaWx0ZXJEb21haW4sbW9kZWwpKTtcbiAgICAgIHJldHVybiByZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gIH1cbiAgZG9tcy5zb3J0KCk7XG4gIGRvbXMuZm9yRWFjaChmdW5jdGlvbihkb21haW4pIHtcbiAgICAgICAgcmVzLnB1c2goZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluKGNhdGVnb3J5LCBkb21haW4sIG1vZGVsKSk7XG4gIH0pO1xuICByZXR1cm4gcmVzO1xufVxuIiwiLyoqXG4gKlxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuZXhwbGFpblxuICogQGZpbGUgZXhwbGFpbi50c1xuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxuICpcbiAqIEZ1bmN0aW9ucyBkZWFsaW5nIHdpdGggZXhwbGFpbmluZyBmYWN0cywgY2F0ZWdvcmllcyBldGMuXG4gKi9cblwidXNlIHN0cmljdFwiO1xudmFyIEFsZ29sID0gcmVxdWlyZShcIi4vYWxnb2xcIik7XG52YXIgZGVidWcgPSByZXF1aXJlKFwiZGVidWdcIik7XG52YXIgZGVidWdsb2cgPSBkZWJ1ZygnZGVzY3JpYmUnKTtcbnZhciBsb2dnZXIgPSByZXF1aXJlKFwiLi4vdXRpbHMvbG9nZ2VyXCIpO1xudmFyIGxvZ1BlcmYgPSBsb2dnZXIucGVyZihcInBlcmZsaXN0YWxsXCIpO1xudmFyIHBlcmZsb2cgPSBkZWJ1ZygncGVyZicpO1xudmFyIFdvcmQgPSByZXF1aXJlKFwiLi93b3JkXCIpO1xudmFyIFdoYXRJcyA9IHJlcXVpcmUoXCIuL3doYXRpc1wiKTtcbnZhciBNb2RlbCA9IHJlcXVpcmUoXCIuLi9tb2RlbC9tb2RlbFwiKTtcbnZhciBVdGlscyA9IHJlcXVpcmUoXCIuLi91dGlscy91dGlsc1wiKTtcbnZhciBzV29yZHMgPSB7fTtcbmZ1bmN0aW9uIGlzU3lub255bUZvcihleGFjdFdvcmQsIHNsb3BweVdvcmQsIHRoZU1vZGVsKSB7XG4gICAgLy8gVE9ETzogdXNlIG1vZGVsIHN5bm9ueW1zXG4gICAgcmV0dXJuIHNsb3BweVdvcmQgPT09IFwibmFtZVwiICYmIGV4YWN0V29yZCA9PT0gXCJlbGVtZW50IG5hbWVcIjtcbn1cbmV4cG9ydHMuaXNTeW5vbnltRm9yID0gaXNTeW5vbnltRm9yO1xuZnVuY3Rpb24gc2xvcHB5T3JFeGFjdChleGFjdFdvcmQsIHNsb3BweVdvcmQsIHRoZU1vZGVsKSB7XG4gICAgaWYgKGV4YWN0V29yZC50b0xvd2VyQ2FzZSgpID09PSBzbG9wcHlXb3JkLnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgcmV0dXJuICdcIicgKyBzbG9wcHlXb3JkICsgJ1wiJztcbiAgICB9XG4gICAgLy8gVE9ETywgZmluZCBwbHVyYWwgcyBldGMuXG4gICAgLy8gc3RpbGwgZXhhY3QsXG4gICAgLy9cbiAgICBpZiAoaXNTeW5vbnltRm9yKGV4YWN0V29yZCwgc2xvcHB5V29yZCwgdGhlTW9kZWwpKSB7XG4gICAgICAgIHJldHVybiAnXCInICsgc2xvcHB5V29yZCArICdcIiAoaW50ZXJwcmV0ZWQgYXMgc3lub255bSBmb3IgXCInICsgZXhhY3RXb3JkICsgJ1wiKSc7XG4gICAgfVxuICAgIC8vdG9kbywgZmluZCBpcyBzeW5vbnltZm9yIC4uLlxuICAgIC8vIFRPRE8sIGEgc3lub255bSBmb3IgLi4uXG4gICAgcmV0dXJuICdcIicgKyBzbG9wcHlXb3JkICsgJ1wiIChpbnRlcnByZXRlZCBhcyBcIicgKyBleGFjdFdvcmQgKyAnXCIpJztcbn1cbmV4cG9ydHMuc2xvcHB5T3JFeGFjdCA9IHNsb3BweU9yRXhhY3Q7XG5mdW5jdGlvbiBjb3VudFJlY29yZFByZXNlbmNlKGNhdGVnb3J5LCBkb21haW4sIHRoZU1vZGVsKSB7XG4gICAgdmFyIHJlcyA9IHsgdG90YWxyZWNvcmRzOiAwLFxuICAgICAgICBwcmVzZW50cmVjb3JkczogMCxcbiAgICAgICAgdmFsdWVzOiB7fSxcbiAgICAgICAgbXVsdGl2YWx1ZWQ6IGZhbHNlXG4gICAgfTtcbiAgICB0aGVNb2RlbC5yZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICAvL2RlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZCx1bmRlZmluZWQsMikpO1xuICAgICAgICBpZiAocmVjb3JkLl9kb21haW4gIT09IGRvbWFpbikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJlcy50b3RhbHJlY29yZHMrKztcbiAgICAgICAgdmFyIHZhbCA9IHJlY29yZFtjYXRlZ29yeV07XG4gICAgICAgIHZhciB2YWxhcnIgPSBbdmFsXTtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgICAgICAgcmVzLm11bHRpdmFsdWVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHZhbGFyciA9IHZhbDtcbiAgICAgICAgfVxuICAgICAgICAvLyB0b2RvIHdyYXAgYXJyXG4gICAgICAgIGlmICh2YWwgIT09IHVuZGVmaW5lZCAmJiB2YWwgIT09IFwibi9hXCIpIHtcbiAgICAgICAgICAgIHJlcy5wcmVzZW50cmVjb3JkcysrO1xuICAgICAgICB9XG4gICAgICAgIHZhbGFyci5mb3JFYWNoKGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHJlcy52YWx1ZXNbdmFsXSA9IChyZXMudmFsdWVzW3ZhbF0gfHwgMCkgKyAxO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5jb3VudFJlY29yZFByZXNlbmNlID0gY291bnRSZWNvcmRQcmVzZW5jZTtcbmZ1bmN0aW9uIGNvdW50UmVjb3JkUHJlc2VuY2VGYWN0KGZhY3QsIGNhdGVnb3J5LCBkb21haW4sIHRoZU1vZGVsKSB7XG4gICAgdmFyIHJlcyA9IHsgdG90YWxyZWNvcmRzOiAwLFxuICAgICAgICBwcmVzZW50cmVjb3JkczogMCxcbiAgICAgICAgdmFsdWVzOiB7fSxcbiAgICAgICAgbXVsdGl2YWx1ZWQ6IGZhbHNlXG4gICAgfTtcbiAgICB0aGVNb2RlbC5yZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICAvL2RlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZCx1bmRlZmluZWQsMikpO1xuICAgICAgICBpZiAocmVjb3JkLl9kb21haW4gIT09IGRvbWFpbikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJlcy50b3RhbHJlY29yZHMrKztcbiAgICAgICAgdmFyIHZhbCA9IHJlY29yZFtjYXRlZ29yeV07XG4gICAgICAgIHZhciB2YWxhcnIgPSBbdmFsXTtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgICAgICAgaWYgKHZhbC5pbmRleE9mKGZhY3QpID49IDApIHtcbiAgICAgICAgICAgICAgICByZXMubXVsdGl2YWx1ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHZhbGFyciA9IHZhbDtcbiAgICAgICAgICAgICAgICByZXMucHJlc2VudHJlY29yZHMrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh2YWwgPT09IGZhY3QpIHtcbiAgICAgICAgICAgIHJlcy5wcmVzZW50cmVjb3JkcysrO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuY291bnRSZWNvcmRQcmVzZW5jZUZhY3QgPSBjb3VudFJlY29yZFByZXNlbmNlRmFjdDtcbmZ1bmN0aW9uIG1ha2VWYWx1ZXNMaXN0U3RyaW5nKHJlYWx2YWx1ZXMpIHtcbiAgICB2YXIgdmFsdWVzU3RyaW5nID0gXCJcIjtcbiAgICB2YXIgdG90YWxsZW4gPSAwO1xuICAgIHZhciBsaXN0VmFsdWVzID0gcmVhbHZhbHVlcy5maWx0ZXIoZnVuY3Rpb24gKHZhbCwgaW5kZXgpIHtcbiAgICAgICAgdG90YWxsZW4gPSB0b3RhbGxlbiArIHZhbC5sZW5ndGg7XG4gICAgICAgIHJldHVybiAoaW5kZXggPCBBbGdvbC5EZXNjcmliZVZhbHVlTGlzdE1pbkNvdW50VmFsdWVMaXN0KSB8fCAodG90YWxsZW4gPCBBbGdvbC5EZXNjcmliZVZhbHVlTGlzdExlbmd0aENoYXJMaW1pdCk7XG4gICAgfSk7XG4gICAgaWYgKGxpc3RWYWx1ZXMubGVuZ3RoID09PSAxICYmIHJlYWx2YWx1ZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHJldHVybiAnVGhlIHNvbGUgdmFsdWUgaXMgXFxcIicgKyBsaXN0VmFsdWVzWzBdICsgJ1wiJztcbiAgICB9XG4gICAgdmFyIG1heGxlbiA9IGxpc3RWYWx1ZXMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCB2YWwpIHsgcmV0dXJuIE1hdGgubWF4KHByZXYsIHZhbC5sZW5ndGgpOyB9LCAwKTtcbiAgICBpZiAobWF4bGVuID4gMzApIHtcbiAgICAgICAgcmV0dXJuIFwiUG9zc2libGUgdmFsdWVzIGFyZSAuLi5cXG5cIiArXG4gICAgICAgICAgICBsaXN0VmFsdWVzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgdmFsLCBpbmRleCkgeyByZXR1cm4gKHByZXYgKyBcIihcIiArIChpbmRleCArIDEpICsgJyk6IFwiJyArIHZhbCArICdcIlxcbicpOyB9LCBcIlwiKVxuICAgICAgICAgICAgKyAobGlzdFZhbHVlcy5sZW5ndGggPT09IHJlYWx2YWx1ZXMubGVuZ3RoID8gXCJcIiA6IFwiLi4uXCIpO1xuICAgIH1cbiAgICB2YXIgbGlzdCA9IFwiXCI7XG4gICAgaWYgKGxpc3RWYWx1ZXMubGVuZ3RoID09PSByZWFsdmFsdWVzLmxlbmd0aCkge1xuICAgICAgICBsaXN0ID0gVXRpbHMubGlzdFRvUXVvdGVkQ29tbWFPcihsaXN0VmFsdWVzKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGxpc3QgPSAnXCInICsgbGlzdFZhbHVlcy5qb2luKCdcIiwgXCInKSArICdcIic7XG4gICAgfVxuICAgIHJldHVybiBcIlBvc3NpYmxlIHZhbHVlcyBhcmUgLi4uXFxuXCJcbiAgICAgICAgKyBsaXN0XG4gICAgICAgICsgKGxpc3RWYWx1ZXMubGVuZ3RoID09PSByZWFsdmFsdWVzLmxlbmd0aCA/IFwiXCIgOiBcIiAuLi5cIik7XG59XG5leHBvcnRzLm1ha2VWYWx1ZXNMaXN0U3RyaW5nID0gbWFrZVZhbHVlc0xpc3RTdHJpbmc7XG5mdW5jdGlvbiB0b1BlcmNlbnQoYSwgYikge1xuICAgIHJldHVybiBcIlwiICsgKDEwMCAqIGEgLyBiKS50b0ZpeGVkKDEpO1xufVxuZXhwb3J0cy50b1BlcmNlbnQgPSB0b1BlcmNlbnQ7XG47XG5mdW5jdGlvbiBnZXRDYXRlZ29yeVN0YXRzSW5Eb21haW4oY2F0ZWdvcnksIGZpbHRlcmRvbWFpbiwgdGhlTW9kZWwpIHtcbiAgICB2YXIgcmVjb3JkQ291bnQgPSBjb3VudFJlY29yZFByZXNlbmNlKGNhdGVnb3J5LCBmaWx0ZXJkb21haW4sIHRoZU1vZGVsKTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeSh0aGVNb2RlbC5yZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAoYSkgeyByZXR1cm4gYS5fZG9tYWluID09PSBcIkNvc21vc1wiOyB9KSwgdW5kZWZpbmVkLCAyKSk7XG4gICAgdmFyIHBlcmNlbnQgPSB0b1BlcmNlbnQocmVjb3JkQ291bnQucHJlc2VudHJlY29yZHMsIHJlY29yZENvdW50LnRvdGFscmVjb3Jkcyk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkQ291bnQudmFsdWVzKSk7XG4gICAgdmFyIGFsbFZhbHVlcyA9IE9iamVjdC5rZXlzKHJlY29yZENvdW50LnZhbHVlcyk7XG4gICAgdmFyIHJlYWx2YWx1ZXMgPSBhbGxWYWx1ZXMuZmlsdGVyKGZ1bmN0aW9uICh2YWx1ZSkgeyByZXR1cm4gKHZhbHVlICE9PSAndW5kZWZpbmVkJykgJiYgKHZhbHVlICE9PSAnbi9hJyk7IH0pO1xuICAgIGRlYnVnbG9nO1xuICAgIHJlYWx2YWx1ZXMuc29ydCgpO1xuICAgIHZhciB1bmRlZk5hRGVsdGEgPSAoYWxsVmFsdWVzLmxlbmd0aCAtIHJlYWx2YWx1ZXMubGVuZ3RoKTtcbiAgICB2YXIgZGVsdGEgPSAodW5kZWZOYURlbHRhKSA/IFwiKCtcIiArIHVuZGVmTmFEZWx0YSArIFwiKVwiIDogXCJcIjtcbiAgICB2YXIgZGlzdGluY3QgPSAnJyArIHJlYWx2YWx1ZXMubGVuZ3RoO1xuICAgIHZhciB2YWx1ZXNMaXN0ID0gbWFrZVZhbHVlc0xpc3RTdHJpbmcocmVhbHZhbHVlcyk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgY2F0ZWdvcnlEZXNjOiB0aGVNb2RlbC5mdWxsLmRvbWFpbltmaWx0ZXJkb21haW5dLmNhdGVnb3JpZXNbY2F0ZWdvcnldLFxuICAgICAgICBkaXN0aW5jdDogZGlzdGluY3QsXG4gICAgICAgIGRlbHRhOiBkZWx0YSxcbiAgICAgICAgcHJlc2VudFJlY29yZHM6IHJlY29yZENvdW50LnByZXNlbnRyZWNvcmRzLFxuICAgICAgICBwZXJjUHJlc2VudDogcGVyY2VudCxcbiAgICAgICAgc2FtcGxlVmFsdWVzOiB2YWx1ZXNMaXN0XG4gICAgfTtcbn1cbmV4cG9ydHMuZ2V0Q2F0ZWdvcnlTdGF0c0luRG9tYWluID0gZ2V0Q2F0ZWdvcnlTdGF0c0luRG9tYWluO1xuZnVuY3Rpb24gZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluKGNhdGVnb3J5LCBmaWx0ZXJkb21haW4sIHRoZU1vZGVsKSB7XG4gICAgLyogIGNvbnN0IHJlY29yZENvdW50ID0gY291bnRSZWNvcmRQcmVzZW5jZShjYXRlZ29yeSwgZmlsdGVyZG9tYWluLCB0aGVNb2RlbCk7XG4gICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeSh0aGVNb2RlbC5yZWNvcmRzLmZpbHRlcihhID0+IGEuX2RvbWFpbiA9PT0gXCJDb3Ntb3NcIiksdW5kZWZpbmVkLDIpKTtcbiAgICAgIGNvbnN0IHBlcmNlbnQgPSB0b1BlcmNlbnQocmVjb3JkQ291bnQucHJlc2VudHJlY29yZHMgLCByZWNvcmRDb3VudC50b3RhbHJlY29yZHMpO1xuICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkQ291bnQudmFsdWVzKSk7XG4gICAgICB2YXIgYWxsVmFsdWVzID1PYmplY3Qua2V5cyhyZWNvcmRDb3VudC52YWx1ZXMpO1xuICAgICAgdmFyIHJlYWx2YWx1ZXMgPSBhbGxWYWx1ZXMuZmlsdGVyKHZhbHVlID0+ICh2YWx1ZSAhPT0gJ3VuZGVmaW5lZCcpICYmICh2YWx1ZSAhPT0gJ24vYScpKTtcbiAgICAgIGRlYnVnbG9nXG4gICAgICByZWFsdmFsdWVzLnNvcnQoKTtcbiAgICAgIHZhciB1bmRlZk5hRGVsdGEgPSAgKGFsbFZhbHVlcy5sZW5ndGggLSByZWFsdmFsdWVzLmxlbmd0aCk7XG4gICAgICB2YXIgZGVsdGEgPSAgKHVuZGVmTmFEZWx0YSkgPyAgXCIoK1wiICsgdW5kZWZOYURlbHRhICsgXCIpXCIgOiBcIlwiO1xuICAgICAgY29uc3QgZGlzdGluY3QgPSAnJyArIHJlYWx2YWx1ZXMubGVuZ3RoO1xuICAgIFxuICAgICAgY29uc3QgdmFsdWVzTGlzdCA9IG1ha2VWYWx1ZXNMaXN0U3RyaW5nKHJlYWx2YWx1ZXMpO1xuICAgICovXG4gICAgdmFyIHN0YXRzID0gZ2V0Q2F0ZWdvcnlTdGF0c0luRG9tYWluKGNhdGVnb3J5LCBmaWx0ZXJkb21haW4sIHRoZU1vZGVsKTtcbiAgICB2YXIgcmVzID0gJ2lzIGEgY2F0ZWdvcnkgaW4gZG9tYWluIFwiJyArIGZpbHRlcmRvbWFpbiArICdcIlxcbidcbiAgICAgICAgKyAoXCJJdCBpcyBwcmVzZW50IGluIFwiICsgc3RhdHMucHJlc2VudFJlY29yZHMgKyBcIiAoXCIgKyBzdGF0cy5wZXJjUHJlc2VudCArIFwiJSkgb2YgcmVjb3JkcyBpbiB0aGlzIGRvbWFpbixcXG5cIikgK1xuICAgICAgICAoXCJoYXZpbmcgXCIgKyAoc3RhdHMuZGlzdGluY3QgKyAnJykgKyBzdGF0cy5kZWx0YSArIFwiIGRpc3RpbmN0IHZhbHVlcy5cXG5cIilcbiAgICAgICAgKyBzdGF0cy5zYW1wbGVWYWx1ZXM7XG4gICAgdmFyIGRlc2MgPSB0aGVNb2RlbC5mdWxsLmRvbWFpbltmaWx0ZXJkb21haW5dLmNhdGVnb3JpZXNbY2F0ZWdvcnldIHx8IHt9O1xuICAgIHZhciBkZXNjcmlwdGlvbiA9IGRlc2MuZGVzY3JpcHRpb24gfHwgXCJcIjtcbiAgICBpZiAoZGVzY3JpcHRpb24pIHtcbiAgICAgICAgcmVzICs9IFwiXFxuRGVzY3JpcHRpb246IFwiICsgZGVzY3JpcHRpb247XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmRlc2NyaWJlQ2F0ZWdvcnlJbkRvbWFpbiA9IGRlc2NyaWJlQ2F0ZWdvcnlJbkRvbWFpbjtcbmZ1bmN0aW9uIGZpbmRSZWNvcmRzV2l0aEZhY3QobWF0Y2hlZFN0cmluZywgY2F0ZWdvcnksIHJlY29yZHMsIGRvbWFpbnMpIHtcbiAgICByZXR1cm4gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICB2YXIgcmVzID0gKHJlY29yZFtjYXRlZ29yeV0gPT09IG1hdGNoZWRTdHJpbmcpO1xuICAgICAgICBpZiAocmVzKSB7XG4gICAgICAgICAgICBpbmNyZW1lbnQoZG9tYWlucywgcmVjb3Jkcy5fZG9tYWluKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH0pO1xufVxuZXhwb3J0cy5maW5kUmVjb3Jkc1dpdGhGYWN0ID0gZmluZFJlY29yZHNXaXRoRmFjdDtcbmZ1bmN0aW9uIGluY3JlbWVudChtYXAsIGtleSkge1xuICAgIG1hcFtrZXldID0gKG1hcFtrZXldIHx8IDApICsgMTtcbn1cbmV4cG9ydHMuaW5jcmVtZW50ID0gaW5jcmVtZW50O1xuZnVuY3Rpb24gc29ydGVkS2V5cyhtYXApIHtcbiAgICB2YXIgciA9IE9iamVjdC5rZXlzKG1hcCk7XG4gICAgci5zb3J0KCk7XG4gICAgcmV0dXJuIHI7XG59XG5mdW5jdGlvbiBkZXNjcmliZURvbWFpbihmYWN0LCBkb21haW4sIHRoZU1vZGVsKSB7XG4gICAgdmFyIGNvdW50ID0gdGhlTW9kZWwucmVjb3Jkcy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHJlY29yZCkge1xuICAgICAgICByZXR1cm4gcHJldiArICgocmVjb3JkLl9kb21haW4gPT09IGRvbWFpbikgPyAxIDogMCk7XG4gICAgfSwgMCk7XG4gICAgdmFyIGNhdGNvdW50ID0gTW9kZWwuZ2V0Q2F0ZWdvcmllc0ZvckRvbWFpbih0aGVNb2RlbCwgZG9tYWluKS5sZW5ndGg7XG4gICAgdmFyIHJlcyA9IHNsb3BweU9yRXhhY3QoZG9tYWluLCBmYWN0LCB0aGVNb2RlbCkgKyAoXCJpcyBhIGRvbWFpbiB3aXRoIFwiICsgY2F0Y291bnQgKyBcIiBjYXRlZ29yaWVzIGFuZCBcIiArIGNvdW50ICsgXCIgcmVjb3Jkc1xcblwiKTtcbiAgICB2YXIgZGVzYyA9IHRoZU1vZGVsLmZ1bGwuZG9tYWluW2RvbWFpbl0uZGVzY3JpcHRpb24gfHwgXCJcIjtcbiAgICBpZiAoZGVzYykge1xuICAgICAgICByZXMgKz0gXCJEZXNjcmlwdGlvbjpcIiArIGRlc2MgKyBcIlxcblwiO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5kZXNjcmliZURvbWFpbiA9IGRlc2NyaWJlRG9tYWluO1xuZnVuY3Rpb24gZGVzY3JpYmVGYWN0SW5Eb21haW4oZmFjdCwgZmlsdGVyZG9tYWluLCB0aGVNb2RlbCkge1xuICAgIHZhciBzZW50ZW5jZXMgPSBXaGF0SXMuYW5hbHl6ZUNvbnRleHRTdHJpbmcoZmFjdCwgdGhlTW9kZWwucnVsZXMpO1xuICAgIC8vY29uc29sZS5sb2coXCJoZXJlIHNlbnRlbmNlcyBcIiArIEpTT04uc3RyaW5naWZ5KHNlbnRlbmNlcykpO1xuICAgIHZhciBsZW5ndGhPbmVTZW50ZW5jZXMgPSBzZW50ZW5jZXMuc2VudGVuY2VzLmZpbHRlcihmdW5jdGlvbiAob1NlbnRlbmNlKSB7IHJldHVybiBvU2VudGVuY2UubGVuZ3RoID09PSAxOyB9KTtcbiAgICB2YXIgcmVzID0gJyc7XG4gICAgLy8gcmVtb3ZlIGNhdGVnb3JpZXMgYW5kIGRvbWFpbnNcbiAgICB2YXIgb25seUZhY3RzID0gbGVuZ3RoT25lU2VudGVuY2VzLmZpbHRlcihmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZVswXSkpO1xuICAgICAgICByZXR1cm4gIVdvcmQuV29yZC5pc0RvbWFpbihvU2VudGVuY2VbMF0pICYmXG4gICAgICAgICAgICAhV29yZC5Xb3JkLmlzRmlsbGVyKG9TZW50ZW5jZVswXSkgJiYgIVdvcmQuV29yZC5pc0NhdGVnb3J5KG9TZW50ZW5jZVswXSk7XG4gICAgfSk7XG4gICAgdmFyIG9ubHlEb21haW5zID0gbGVuZ3RoT25lU2VudGVuY2VzLmZpbHRlcihmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgIHJldHVybiBXb3JkLldvcmQuaXNEb21haW4ob1NlbnRlbmNlWzBdKTtcbiAgICB9KTtcbiAgICBpZiAob25seURvbWFpbnMgJiYgb25seURvbWFpbnMubGVuZ3RoID4gMCkge1xuICAgICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvbmx5RG9tYWlucykpO1xuICAgICAgICBvbmx5RG9tYWlucy5mb3JFYWNoKGZ1bmN0aW9uIChzZW50ZW5jZSkge1xuICAgICAgICAgICAgdmFyIGRvbWFpbiA9IHNlbnRlbmNlWzBdLm1hdGNoZWRTdHJpbmc7XG4gICAgICAgICAgICBpZiAoIWZpbHRlcmRvbWFpbiB8fCBkb21haW4gPT09IGZpbHRlcmRvbWFpbikge1xuICAgICAgICAgICAgICAgIGRlYnVnbG9nKFwiaGVyZSBtYXRjaCBcIiArIEpTT04uc3RyaW5naWZ5KHNlbnRlbmNlKSk7XG4gICAgICAgICAgICAgICAgcmVzICs9IGRlc2NyaWJlRG9tYWluKGZhY3QsIHNlbnRlbmNlWzBdLm1hdGNoZWRTdHJpbmcsIHRoZU1vZGVsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGRlYnVnbG9nKFwib25seSBmYWN0czogXCIgKyBKU09OLnN0cmluZ2lmeShvbmx5RmFjdHMpKTtcbiAgICB2YXIgcmVjb3JkTWFwID0ge307XG4gICAgdmFyIGRvbWFpbnNNYXAgPSB7fTtcbiAgICB2YXIgbWF0Y2hlZHdvcmRNYXAgPSB7fTtcbiAgICB2YXIgbWF0Y2hlZENhdGVnb3J5TWFwID0ge307XG4gICAgLy8gbG9vayBmb3IgYWxsIHJlY29yZHNcbiAgICBvbmx5RmFjdHMuZm9yRWFjaChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgIHJldHVybiBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICAgIGluY3JlbWVudChtYXRjaGVkd29yZE1hcCwgb1dvcmQubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgICAgICBpbmNyZW1lbnQobWF0Y2hlZENhdGVnb3J5TWFwLCBvV29yZC5jYXRlZ29yeSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIC8vIHdlIGhhdmU6XG4gICAgLy8gYSBsaXN0IG9mIGNhdGVnb3JpZXMsXG4gICAgLy8gYSBsaXN0IG9mIG1hdGNoZWRXb3JkcyAgLT5cbiAgICAvL1xuICAgIHZhciBjYXRlZ29yaWVzID0gc29ydGVkS2V5cyhtYXRjaGVkQ2F0ZWdvcnlNYXApO1xuICAgIHZhciBtYXRjaGVkd29yZHMgPSBzb3J0ZWRLZXlzKG1hdGNoZWR3b3JkTWFwKTtcbiAgICBkZWJ1Z2xvZyhcIm1hdGNoZWR3b3JkczogXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkd29yZHMpKTtcbiAgICBkZWJ1Z2xvZyhcImNhdGVnb3JpZXM6IFwiICsgSlNPTi5zdHJpbmdpZnkoY2F0ZWdvcmllcykpO1xuICAgIC8vdmFyIGFsbE1hdGNoZWRXb3JkcyA9IHsgW2tleSA6IHN0cmluZ10gOiBudW1iZXIgfTtcbiAgICB2YXIgZG9tYWluUmVjb3JkQ291bnQgPSB7fTtcbiAgICB2YXIgZG9tYWluTWF0Y2hDYXRDb3VudCA9IHt9O1xuICAgIC8vIHdlIHByZXBhcmUgdGhlIGZvbGxvd2luZyBzdHJ1Y3R1cmVcbiAgICAvL1xuICAgIC8vIHtkb21haW59IDogcmVjb3JkY291bnQ7XG4gICAgLy8ge21hdGNoZWR3b3Jkc30gOlxuICAgIC8vIHtkb21haW59IHttYXRjaGVkd29yZH0ge2NhdGVnb3J5fSBwcmVzZW5jZWNvdW50XG4gICAgdGhlTW9kZWwucmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgaWYgKCFmaWx0ZXJkb21haW4gfHwgcmVjb3JkLl9kb21haW4gPT09IGZpbHRlcmRvbWFpbikge1xuICAgICAgICAgICAgZG9tYWluUmVjb3JkQ291bnRbcmVjb3JkLl9kb21haW5dID0gKGRvbWFpblJlY29yZENvdW50W3JlY29yZC5fZG9tYWluXSB8fCAwKSArIDE7XG4gICAgICAgICAgICBtYXRjaGVkd29yZHMuZm9yRWFjaChmdW5jdGlvbiAobWF0Y2hlZHdvcmQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2F0ZWdvcmllcy5mb3JFYWNoKGZ1bmN0aW9uIChjYXRlZ29yeSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVjb3JkW2NhdGVnb3J5XSA9PT0gbWF0Y2hlZHdvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtZCA9IGRvbWFpbk1hdGNoQ2F0Q291bnRbcmVjb3JkLl9kb21haW5dID0gZG9tYWluTWF0Y2hDYXRDb3VudFtyZWNvcmQuX2RvbWFpbl0gfHwge307XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWRjID0gbWRbbWF0Y2hlZHdvcmRdID0gbWRbbWF0Y2hlZHdvcmRdIHx8IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5jcmVtZW50KG1kYywgY2F0ZWdvcnkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZG9tYWluTWF0Y2hDYXRDb3VudCwgdW5kZWZpbmVkLCAyKSk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZG9tYWluUmVjb3JkQ291bnQsIHVuZGVmaW5lZCwgMikpO1xuICAgIHZhciBkb21haW5zID0gc29ydGVkS2V5cyhkb21haW5NYXRjaENhdENvdW50KTtcbiAgICB2YXIgcmVzTmV4dCA9ICdcIicgKyBmYWN0ICsgJ1wiIGhhcyBhIG1lYW5pbmcgaW4gJztcbiAgICB2YXIgc2luZ2xlID0gZmFsc2U7XG4gICAgaWYgKE9iamVjdC5rZXlzKGRvbWFpbk1hdGNoQ2F0Q291bnQpLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgcmVzTmV4dCArPSAnJyArIGRvbWFpbnMubGVuZ3RoICtcbiAgICAgICAgICAgICcgZG9tYWluczogJyArIFV0aWxzLmxpc3RUb1F1b3RlZENvbW1hQW5kKGRvbWFpbnMpICsgXCJcIjtcbiAgICB9XG4gICAgZWxzZSBpZiAoZG9tYWlucy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgaWYgKCFmaWx0ZXJkb21haW4pIHtcbiAgICAgICAgICAgIHJlc05leHQgKz0gXCJvbmUgXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmVzTmV4dCArPSBcImRvbWFpbiBcXFwiXCIgKyBkb21haW5zWzBdICsgXCJcXFwiOlwiO1xuICAgICAgICBzaW5nbGUgPSB0cnVlO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgaWYgKHJlcykge1xuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfVxuICAgICAgICBpZiAoZmlsdGVyZG9tYWluKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJcXFwiXCIgKyBmYWN0ICsgXCJcXFwiIGlzIG5vIGtub3duIGZhY3QgaW4gZG9tYWluIFxcXCJcIiArIGZpbHRlcmRvbWFpbiArIFwiXFxcIi5cXG5cIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gXCJJIGRvbid0IGtub3cgYW55dGhpbmcgYWJvdXQgXFxcIlwiICsgZmFjdCArIFwiXFxcIi5cXG5cIjtcbiAgICB9XG4gICAgcmVzICs9IHJlc05leHQgKyBcIlxcblwiOyAvLyAuLi5cXG5cIjtcbiAgICBkb21haW5zLmZvckVhY2goZnVuY3Rpb24gKGRvbWFpbikge1xuICAgICAgICB2YXIgbWQgPSBkb21haW5NYXRjaENhdENvdW50W2RvbWFpbl07XG4gICAgICAgIE9iamVjdC5rZXlzKG1kKS5mb3JFYWNoKGZ1bmN0aW9uIChtYXRjaGVkc3RyaW5nKSB7XG4gICAgICAgICAgICB2YXIgbWRjID0gbWRbbWF0Y2hlZHN0cmluZ107XG4gICAgICAgICAgICBpZiAoIXNpbmdsZSkge1xuICAgICAgICAgICAgICAgIHJlcyArPSAnaW4gZG9tYWluIFwiJyArIGRvbWFpbiArICdcIiAnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGNhdHNpbmdsZSA9IE9iamVjdC5rZXlzKG1kYykubGVuZ3RoID09PSAxO1xuICAgICAgICAgICAgcmVzICs9IHNsb3BweU9yRXhhY3QobWF0Y2hlZHN0cmluZywgZmFjdCwgdGhlTW9kZWwpICsgXCIgXCI7XG4gICAgICAgICAgICBpZiAoIWNhdHNpbmdsZSkge1xuICAgICAgICAgICAgICAgIHJlcyArPSBcIi4uLlxcblwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgT2JqZWN0LmtleXMobWRjKS5mb3JFYWNoKGZ1bmN0aW9uIChjYXRlZ29yeSkge1xuICAgICAgICAgICAgICAgIHZhciBwZXJjZW50ID0gdG9QZXJjZW50KG1kY1tjYXRlZ29yeV0sIGRvbWFpblJlY29yZENvdW50W2RvbWFpbl0pO1xuICAgICAgICAgICAgICAgIHJlcyArPSBcImlzIGEgdmFsdWUgZm9yIGNhdGVnb3J5IFxcXCJcIiArIGNhdGVnb3J5ICsgXCJcXFwiIHByZXNlbnQgaW4gXCIgKyBtZGNbY2F0ZWdvcnldICsgXCIoXCIgKyBwZXJjZW50ICsgXCIlKSBvZiByZWNvcmRzO1xcblwiO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmRlc2NyaWJlRmFjdEluRG9tYWluID0gZGVzY3JpYmVGYWN0SW5Eb21haW47XG5mdW5jdGlvbiBkZXNjcmliZUNhdGVnb3J5KGNhdGVnb3J5LCBmaWx0ZXJEb21haW4sIG1vZGVsLCBtZXNzYWdlKSB7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIHZhciBkb21zID0gTW9kZWwuZ2V0RG9tYWluc0ZvckNhdGVnb3J5KG1vZGVsLCBjYXRlZ29yeSk7XG4gICAgaWYgKGZpbHRlckRvbWFpbikge1xuICAgICAgICBpZiAoZG9tcy5pbmRleE9mKGZpbHRlckRvbWFpbikgPj0gMCkge1xuICAgICAgICAgICAgcmVzLnB1c2goZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluKGNhdGVnb3J5LCBmaWx0ZXJEb21haW4sIG1vZGVsKSk7XG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG4gICAgfVxuICAgIGRvbXMuc29ydCgpO1xuICAgIGRvbXMuZm9yRWFjaChmdW5jdGlvbiAoZG9tYWluKSB7XG4gICAgICAgIHJlcy5wdXNoKGRlc2NyaWJlQ2F0ZWdvcnlJbkRvbWFpbihjYXRlZ29yeSwgZG9tYWluLCBtb2RlbCkpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmRlc2NyaWJlQ2F0ZWdvcnkgPSBkZXNjcmliZUNhdGVnb3J5O1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
