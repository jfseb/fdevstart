/**
 *
 * @module jfseb.fdevstart.explain
 * @file explain.ts
 * @copyright (c) 2016 Gerd Forstmann
 *
 * Functions dealing with explaining facts, categories etc.
 */
"use strict";

var Algol = require('./algol');
var debug = require('debug');
var debuglog = debug('describe');
var logger = require('../utils/logger');
var logPerf = logger.perf("perflistall");
var perflog = debug('perf');
var Word = require('./word');
var WhatIs = require('./whatis');
var Model = require('../model/model');
var Utils = require('../utils/utils');
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
    var lengthOneSentences = sentences.filter(function (oSentence) {
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
        return "\"" + fact + "\" is no known fact.\n";
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9kZXNjcmliZS50cyIsIm1hdGNoL2Rlc2NyaWJlLmpzIl0sIm5hbWVzIjpbIkFsZ29sIiwicmVxdWlyZSIsImRlYnVnIiwiZGVidWdsb2ciLCJsb2dnZXIiLCJsb2dQZXJmIiwicGVyZiIsInBlcmZsb2ciLCJXb3JkIiwiV2hhdElzIiwiTW9kZWwiLCJVdGlscyIsInNXb3JkcyIsImlzU3lub255bUZvciIsImV4YWN0V29yZCIsInNsb3BweVdvcmQiLCJ0aGVNb2RlbCIsImV4cG9ydHMiLCJzbG9wcHlPckV4YWN0IiwidG9Mb3dlckNhc2UiLCJjb3VudFJlY29yZFByZXNlbmNlIiwiY2F0ZWdvcnkiLCJkb21haW4iLCJyZXMiLCJ0b3RhbHJlY29yZHMiLCJwcmVzZW50cmVjb3JkcyIsInZhbHVlcyIsIm11bHRpdmFsdWVkIiwicmVjb3JkcyIsImZvckVhY2giLCJyZWNvcmQiLCJfZG9tYWluIiwidmFsIiwidmFsYXJyIiwiQXJyYXkiLCJpc0FycmF5IiwidW5kZWZpbmVkIiwiY291bnRSZWNvcmRQcmVzZW5jZUZhY3QiLCJmYWN0IiwiaW5kZXhPZiIsIm1ha2VWYWx1ZXNMaXN0U3RyaW5nIiwicmVhbHZhbHVlcyIsInZhbHVlc1N0cmluZyIsInRvdGFsbGVuIiwibGlzdFZhbHVlcyIsImZpbHRlciIsImluZGV4IiwibGVuZ3RoIiwiRGVzY3JpYmVWYWx1ZUxpc3RNaW5Db3VudFZhbHVlTGlzdCIsIkRlc2NyaWJlVmFsdWVMaXN0TGVuZ3RoQ2hhckxpbWl0IiwibWF4bGVuIiwicmVkdWNlIiwicHJldiIsIk1hdGgiLCJtYXgiLCJsaXN0IiwibGlzdFRvUXVvdGVkQ29tbWFPciIsImpvaW4iLCJ0b1BlcmNlbnQiLCJhIiwiYiIsInRvRml4ZWQiLCJnZXRDYXRlZ29yeVN0YXRzSW5Eb21haW4iLCJmaWx0ZXJkb21haW4iLCJyZWNvcmRDb3VudCIsIkpTT04iLCJzdHJpbmdpZnkiLCJwZXJjZW50IiwiYWxsVmFsdWVzIiwiT2JqZWN0Iiwia2V5cyIsInZhbHVlIiwic29ydCIsInVuZGVmTmFEZWx0YSIsImRlbHRhIiwiZGlzdGluY3QiLCJ2YWx1ZXNMaXN0IiwiY2F0ZWdvcnlEZXNjIiwiZnVsbCIsImNhdGVnb3JpZXMiLCJwcmVzZW50UmVjb3JkcyIsInBlcmNQcmVzZW50Iiwic2FtcGxlVmFsdWVzIiwiZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluIiwic3RhdHMiLCJkZXNjIiwiZGVzY3JpcHRpb24iLCJmaW5kUmVjb3Jkc1dpdGhGYWN0IiwibWF0Y2hlZFN0cmluZyIsImRvbWFpbnMiLCJpbmNyZW1lbnQiLCJtYXAiLCJrZXkiLCJzb3J0ZWRLZXlzIiwiciIsImRlc2NyaWJlRG9tYWluIiwiY291bnQiLCJjYXRjb3VudCIsImdldENhdGVnb3JpZXNGb3JEb21haW4iLCJkZXNjcmliZUZhY3RJbkRvbWFpbiIsInNlbnRlbmNlcyIsImFuYWx5emVDb250ZXh0U3RyaW5nIiwicnVsZXMiLCJsZW5ndGhPbmVTZW50ZW5jZXMiLCJvU2VudGVuY2UiLCJvbmx5RmFjdHMiLCJpc0RvbWFpbiIsImlzRmlsbGVyIiwiaXNDYXRlZ29yeSIsIm9ubHlEb21haW5zIiwic2VudGVuY2UiLCJyZWNvcmRNYXAiLCJkb21haW5zTWFwIiwibWF0Y2hlZHdvcmRNYXAiLCJtYXRjaGVkQ2F0ZWdvcnlNYXAiLCJvV29yZCIsIm1hdGNoZWR3b3JkcyIsImRvbWFpblJlY29yZENvdW50IiwiZG9tYWluTWF0Y2hDYXRDb3VudCIsIm1hdGNoZWR3b3JkIiwibWQiLCJtZGMiLCJyZXNOZXh0Iiwic2luZ2xlIiwibGlzdFRvUXVvdGVkQ29tbWFBbmQiLCJtYXRjaGVkc3RyaW5nIiwiY2F0c2luZ2xlIiwiZGVzY3JpYmVDYXRlZ29yeSIsImZpbHRlckRvbWFpbiIsIm1vZGVsIiwibWVzc2FnZSIsImRvbXMiLCJnZXREb21haW5zRm9yQ2F0ZWdvcnkiLCJwdXNoIl0sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7QUNRQTs7QURHQSxJQUFZQSxRQUFLQyxRQUFNLFNBQU4sQ0FB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dXJjZXNDb250ZW50IjpbIi8qKlxuICpcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmV4cGxhaW5cbiAqIEBmaWxlIGV4cGxhaW4udHNcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cbiAqXG4gKiBGdW5jdGlvbnMgZGVhbGluZyB3aXRoIGV4cGxhaW5pbmcgZmFjdHMsIGNhdGVnb3JpZXMgZXRjLlxuICovXG5cblxuaW1wb3J0ICogYXMgSW5wdXRGaWx0ZXIgZnJvbSAnLi9pbnB1dEZpbHRlcic7XG5pbXBvcnQgKiBhcyBBbGdvbCBmcm9tICcuL2FsZ29sJztcbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcblxuY29uc3QgZGVidWdsb2cgPSBkZWJ1ZygnZGVzY3JpYmUnKTtcbmltcG9ydCAqIGFzIGxvZ2dlciBmcm9tICcuLi91dGlscy9sb2dnZXInO1xudmFyIGxvZ1BlcmYgPSBsb2dnZXIucGVyZihcInBlcmZsaXN0YWxsXCIpO1xudmFyIHBlcmZsb2cgPSBkZWJ1ZygncGVyZicpO1xuLy9jb25zdCBwZXJmbG9nID0gbG9nZ2VyLnBlcmYoXCJwZXJmbGlzdGFsbFwiKTtcblxuaW1wb3J0ICogYXMgSU1hdGNoIGZyb20gJy4vaWZtYXRjaCc7XG5cbmltcG9ydCAqIGFzIFRvb2xtYXRjaGVyIGZyb20gJy4vdG9vbG1hdGNoZXInO1xuaW1wb3J0ICogYXMgQnJlYWtEb3duIGZyb20gJy4vYnJlYWtkb3duJztcblxuaW1wb3J0ICogYXMgU2VudGVuY2UgZnJvbSAnLi9zZW50ZW5jZSc7XG5cbmltcG9ydCAqIGFzIFdvcmQgZnJvbSAnLi93b3JkJztcbmltcG9ydCAqIGFzIE9wZXJhdG9yIGZyb20gJy4vb3BlcmF0b3InO1xuXG5pbXBvcnQgKiBhcyBXaGF0SXMgZnJvbSAnLi93aGF0aXMnO1xuXG5pbXBvcnQgKiBhcyBNb2RlbCBmcm9tICcuLi9tb2RlbC9tb2RlbCc7XG5pbXBvcnQgKiBhcyBNYXRjaCBmcm9tICcuL21hdGNoJztcblxuXG5pbXBvcnQgKiBhcyBVdGlscyBmcm9tICcuLi91dGlscy91dGlscyc7XG5cblxudmFyIHNXb3JkcyA9IHt9O1xuXG5leHBvcnQgZnVuY3Rpb24gaXNTeW5vbnltRm9yKGV4YWN0V29yZCA6IHN0cmluZywgc2xvcHB5V29yZCA6IHN0cmluZywgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzKSA6IGJvb2xlYW4ge1xuICAvLyBUT0RPOiB1c2UgbW9kZWwgc3lub255bXNcbiAgcmV0dXJuIHNsb3BweVdvcmQgPT09IFwibmFtZVwiICYmIGV4YWN0V29yZCA9PT0gXCJlbGVtZW50IG5hbWVcIjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNsb3BweU9yRXhhY3QoZXhhY3RXb3JkIDogc3RyaW5nLCBzbG9wcHlXb3JkIDogc3RyaW5nLCB0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMpIHtcbiAgaWYoZXhhY3RXb3JkLnRvTG93ZXJDYXNlKCkgPT09IHNsb3BweVdvcmQudG9Mb3dlckNhc2UoKSkge1xuICAgIHJldHVybiAnXCInICsgc2xvcHB5V29yZCArICdcIic7XG4gIH1cbiAgLy8gVE9ETywgZmluZCBwbHVyYWwgcyBldGMuXG4gIC8vIHN0aWxsIGV4YWN0LFxuICAvL1xuICBpZihpc1N5bm9ueW1Gb3IoZXhhY3RXb3JkLHNsb3BweVdvcmQsdGhlTW9kZWwpKSB7XG5yZXR1cm4gJ1wiJyArIHNsb3BweVdvcmQgKyAnXCIgKGludGVycHJldGVkIGFzIHN5bm9ueW0gZm9yIFwiJyArIGV4YWN0V29yZCArJ1wiKSc7XG4gIH1cbiAgLy90b2RvLCBmaW5kIGlzIHN5bm9ueW1mb3IgLi4uXG4gIC8vIFRPRE8sIGEgc3lub255bSBmb3IgLi4uXG4gIHJldHVybiAnXCInICsgc2xvcHB5V29yZCArICdcIiAoaW50ZXJwcmV0ZWQgYXMgXCInICsgZXhhY3RXb3JkICsnXCIpJztcbn1cblxuaW50ZXJmYWNlIElEZXNjcmliZUNhdGVnb3J5IHtcbiAgICB0b3RhbHJlY29yZHMgOiBudW1iZXIsXG4gICAgcHJlc2VudHJlY29yZHMgOiBudW1iZXIsXG4gICAgdmFsdWVzIDogeyBba2V5IDogc3RyaW5nXSA6IG51bWJlcn0sXG4gICAgbXVsdGl2YWx1ZWQgOiBib29sZWFuXG4gIH1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvdW50UmVjb3JkUHJlc2VuY2UoY2F0ZWdvcnkgOiBzdHJpbmcsIGRvbWFpbiA6IHN0cmluZywgdGhlTW9kZWwgOiBJTWF0Y2guSU1vZGVscykgOiBJRGVzY3JpYmVDYXRlZ29yeSB7XG4gIHZhciByZXMgPSB7IHRvdGFscmVjb3JkcyA6IDAsXG4gICAgcHJlc2VudHJlY29yZHMgOiAwLFxuICAgIHZhbHVlcyA6IHsgfSwgIC8vIGFuIHRoZWlyIGZyZXF1ZW5jeVxuICAgIG11bHRpdmFsdWVkIDogZmFsc2VcbiAgfSBhcyBJRGVzY3JpYmVDYXRlZ29yeTtcbiAgdGhlTW9kZWwucmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uKHJlY29yZCkge1xuICAgIC8vZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkLHVuZGVmaW5lZCwyKSk7XG4gICAgaWYocmVjb3JkLl9kb21haW4gIT09IGRvbWFpbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXMudG90YWxyZWNvcmRzKys7XG4gICAgdmFyIHZhbCA9IHJlY29yZFtjYXRlZ29yeV07XG4gICAgdmFyIHZhbGFyciA9IFt2YWxdO1xuICAgIGlmKEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgcmVzLm11bHRpdmFsdWVkID0gdHJ1ZTtcbiAgICAgIHZhbGFyciA9IHZhbDtcbiAgICB9XG4gICAgLy8gdG9kbyB3cmFwIGFyclxuICAgIGlmKHZhbCAhPT0gdW5kZWZpbmVkICYmIHZhbCAhPT0gXCJuL2FcIikge1xuICAgICAgcmVzLnByZXNlbnRyZWNvcmRzICsrO1xuICAgIH1cbiAgICB2YWxhcnIuZm9yRWFjaChmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJlcy52YWx1ZXNbdmFsXSA9IChyZXMudmFsdWVzW3ZhbF0gfHwgMCkgKyAxO1xuICAgIH0pXG4gIH0pXG4gIHJldHVybiByZXM7XG59XG5cbi8vIGNhdGVnb3J5ID0+IG1hdGNoZWR3b3Jkc1tdO1xuXG5pbnRlcmZhY2UgSURlc2NyaWJlRmFjdCB7XG4gICAgdG90YWxyZWNvcmRzIDogbnVtYmVyLFxuICAgIHByZXNlbnRyZWNvcmRzIDogbnVtYmVyLFxuICAgIG11bHRpdmFsdWVkIDogYm9vbGVhblxuICB9XG5cbmV4cG9ydCBmdW5jdGlvbiBjb3VudFJlY29yZFByZXNlbmNlRmFjdChmYWN0IDogc3RyaW5nLCBjYXRlZ29yeSA6IHN0cmluZywgZG9tYWluIDogc3RyaW5nLCB0aGVNb2RlbCA6IElNYXRjaC5JTW9kZWxzKSA6IElEZXNjcmliZUZhY3Qge1xuICB2YXIgcmVzID0geyB0b3RhbHJlY29yZHMgOiAwLFxuICAgIHByZXNlbnRyZWNvcmRzIDogMCxcbiAgICB2YWx1ZXMgOiB7IH0sICAvLyBhbiB0aGVpciBmcmVxdWVuY3lcbiAgICBtdWx0aXZhbHVlZCA6IGZhbHNlXG4gIH0gYXMgSURlc2NyaWJlQ2F0ZWdvcnk7XG4gIHRoZU1vZGVsLnJlY29yZHMuZm9yRWFjaChmdW5jdGlvbihyZWNvcmQpIHtcbiAgICAvL2RlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZCx1bmRlZmluZWQsMikpO1xuICAgIGlmKHJlY29yZC5fZG9tYWluICE9PSBkb21haW4pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmVzLnRvdGFscmVjb3JkcysrO1xuICAgIHZhciB2YWwgPSByZWNvcmRbY2F0ZWdvcnldO1xuICAgIHZhciB2YWxhcnIgPSBbdmFsXTtcbiAgICBpZihBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICAgIGlmKHZhbC5pbmRleE9mKGZhY3QpID49IDApIHtcbiAgICAgICAgcmVzLm11bHRpdmFsdWVkID0gdHJ1ZTtcbiAgICAgICAgdmFsYXJyID0gdmFsO1xuICAgICAgICByZXMucHJlc2VudHJlY29yZHMrKztcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHZhbCA9PT0gZmFjdCkge1xuICAgICAgICByZXMucHJlc2VudHJlY29yZHMrKztcbiAgICB9XG4gIH0pXG4gIHJldHVybiByZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWtlVmFsdWVzTGlzdFN0cmluZyhyZWFsdmFsdWVzOiBzdHJpbmdbXSkgOiBzdHJpbmcge1xuICB2YXIgdmFsdWVzU3RyaW5nID0gXCJcIjtcbiAgdmFyIHRvdGFsbGVuID0gMDtcbiAgdmFyIGxpc3RWYWx1ZXMgPSByZWFsdmFsdWVzLmZpbHRlcihmdW5jdGlvbih2YWwsIGluZGV4KSB7XG4gICAgdG90YWxsZW4gPSB0b3RhbGxlbiArIHZhbC5sZW5ndGg7XG4gIHJldHVybiAoaW5kZXggPCBBbGdvbC5EZXNjcmliZVZhbHVlTGlzdE1pbkNvdW50VmFsdWVMaXN0KSB8fCAodG90YWxsZW4gPCBBbGdvbC5EZXNjcmliZVZhbHVlTGlzdExlbmd0aENoYXJMaW1pdCk7XG4gIH0pO1xuICBpZihsaXN0VmFsdWVzLmxlbmd0aCA9PT0gMSAmJiByZWFsdmFsdWVzLmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiAnVGhlIHNvbGUgdmFsdWUgaXMgXFxcIicgKyBsaXN0VmFsdWVzWzBdICsgJ1wiJztcbiAgfVxuICB2YXIgbWF4bGVuID0gbGlzdFZhbHVlcy5yZWR1Y2UoIChwcmV2LHZhbCkgPT4gTWF0aC5tYXgocHJldix2YWwubGVuZ3RoKSwwKTtcbiAgaWYobWF4bGVuID4gMzApIHtcbiAgICByZXR1cm4gXCJQb3NzaWJsZSB2YWx1ZXMgYXJlIC4uLlxcblwiICtcbiAgICAgIGxpc3RWYWx1ZXMucmVkdWNlKCAocHJldix2YWwsaW5kZXgpID0+IChwcmV2ICsgXCIoXCIgKyAoaW5kZXggKyAxKSArICcpOiBcIicgKyB2YWwgKyAnXCJcXG4nXG4gICAgICApLFwiXCIpXG4gICAgICArICggbGlzdFZhbHVlcy5sZW5ndGggPT09IHJlYWx2YWx1ZXMubGVuZ3RoID8gXCJcIiA6IFwiLi4uXCIpO1xuICB9XG4gIHZhciBsaXN0ID0gXCJcIjtcbiAgaWYobGlzdFZhbHVlcy5sZW5ndGggPT09IHJlYWx2YWx1ZXMubGVuZ3RoKSB7XG4gICAgbGlzdCA9IFV0aWxzLmxpc3RUb1F1b3RlZENvbW1hT3IobGlzdFZhbHVlcyk7XG4gIH0gZWxzZSB7XG4gICAgbGlzdCA9ICdcIicgKyBsaXN0VmFsdWVzLmpvaW4oJ1wiLCBcIicpICsgJ1wiJztcbiAgfVxuICByZXR1cm4gXCJQb3NzaWJsZSB2YWx1ZXMgYXJlIC4uLlxcblwiXG4gICAgKyBsaXN0XG4gICAgKyAoIGxpc3RWYWx1ZXMubGVuZ3RoID09PSByZWFsdmFsdWVzLmxlbmd0aCA/IFwiXCIgOiBcIiAuLi5cIik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b1BlcmNlbnQoYSA6IG51bWJlciwgYjogbnVtYmVyKSA6IHN0cmluZyB7XG4gIHJldHVybiBcIlwiICsgKDEwMCogYSAvIGIpLnRvRml4ZWQoMSk7XG59XG5cblxuZXhwb3J0IGludGVyZmFjZSBJQ2F0ZWdvcnlTdGF0cyB7XG4gIGNhdGVnb3J5RGVzYyA6IElNYXRjaC5JQ2F0ZWdvcnlEZXNjLFxuICBwcmVzZW50UmVjb3JkcyA6IG51bWJlcixcbiAgZGlzdGluY3QgOiBzdHJpbmcsXG4gIGRlbHRhIDogc3RyaW5nLFxuICBwZXJjUHJlc2VudCA6IHN0cmluZyxcbiAgc2FtcGxlVmFsdWVzIDogc3RyaW5nLFxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldENhdGVnb3J5U3RhdHNJbkRvbWFpbihjYXRlZ29yeSA6IHN0cmluZywgZmlsdGVyZG9tYWluIDogc3RyaW5nLCB0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMpIDogSUNhdGVnb3J5U3RhdHMge1xuICBjb25zdCByZWNvcmRDb3VudCA9IGNvdW50UmVjb3JkUHJlc2VuY2UoY2F0ZWdvcnksIGZpbHRlcmRvbWFpbiwgdGhlTW9kZWwpO1xuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeSh0aGVNb2RlbC5yZWNvcmRzLmZpbHRlcihhID0+IGEuX2RvbWFpbiA9PT0gXCJDb3Ntb3NcIiksdW5kZWZpbmVkLDIpKTtcbiAgY29uc3QgcGVyY2VudCA9IHRvUGVyY2VudChyZWNvcmRDb3VudC5wcmVzZW50cmVjb3JkcyAsIHJlY29yZENvdW50LnRvdGFscmVjb3Jkcyk7XG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZENvdW50LnZhbHVlcykpO1xuICB2YXIgYWxsVmFsdWVzID1PYmplY3Qua2V5cyhyZWNvcmRDb3VudC52YWx1ZXMpO1xuICB2YXIgcmVhbHZhbHVlcyA9IGFsbFZhbHVlcy5maWx0ZXIodmFsdWUgPT4gKHZhbHVlICE9PSAndW5kZWZpbmVkJykgJiYgKHZhbHVlICE9PSAnbi9hJykpO1xuICBkZWJ1Z2xvZ1xuICByZWFsdmFsdWVzLnNvcnQoKTtcbiAgdmFyIHVuZGVmTmFEZWx0YSA9ICAoYWxsVmFsdWVzLmxlbmd0aCAtIHJlYWx2YWx1ZXMubGVuZ3RoKTtcbiAgdmFyIGRlbHRhID0gICh1bmRlZk5hRGVsdGEpID8gIFwiKCtcIiArIHVuZGVmTmFEZWx0YSArIFwiKVwiIDogXCJcIjtcbiAgY29uc3QgZGlzdGluY3QgPSAnJyArIHJlYWx2YWx1ZXMubGVuZ3RoO1xuICBjb25zdCB2YWx1ZXNMaXN0ID0gbWFrZVZhbHVlc0xpc3RTdHJpbmcocmVhbHZhbHVlcyk7XG4gIHJldHVybiB7XG4gICAgY2F0ZWdvcnlEZXNjIDogdGhlTW9kZWwuZnVsbC5kb21haW5bZmlsdGVyZG9tYWluXS5jYXRlZ29yaWVzW2NhdGVnb3J5XSxcbiAgICBkaXN0aW5jdCA6IGRpc3RpbmN0LFxuICAgIGRlbHRhIDogZGVsdGEsXG4gICAgcHJlc2VudFJlY29yZHMgOiByZWNvcmRDb3VudC5wcmVzZW50cmVjb3JkcyxcbiAgICBwZXJjUHJlc2VudCA6IHBlcmNlbnQsXG4gICAgc2FtcGxlVmFsdWVzIDogdmFsdWVzTGlzdFxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXNjcmliZUNhdGVnb3J5SW5Eb21haW4oY2F0ZWdvcnkgOiBzdHJpbmcsIGZpbHRlcmRvbWFpbiA6IHN0cmluZywgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzKSA6IHN0cmluZyB7XG4vKiAgY29uc3QgcmVjb3JkQ291bnQgPSBjb3VudFJlY29yZFByZXNlbmNlKGNhdGVnb3J5LCBmaWx0ZXJkb21haW4sIHRoZU1vZGVsKTtcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkodGhlTW9kZWwucmVjb3Jkcy5maWx0ZXIoYSA9PiBhLl9kb21haW4gPT09IFwiQ29zbW9zXCIpLHVuZGVmaW5lZCwyKSk7XG4gIGNvbnN0IHBlcmNlbnQgPSB0b1BlcmNlbnQocmVjb3JkQ291bnQucHJlc2VudHJlY29yZHMgLCByZWNvcmRDb3VudC50b3RhbHJlY29yZHMpO1xuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRDb3VudC52YWx1ZXMpKTtcbiAgdmFyIGFsbFZhbHVlcyA9T2JqZWN0LmtleXMocmVjb3JkQ291bnQudmFsdWVzKTtcbiAgdmFyIHJlYWx2YWx1ZXMgPSBhbGxWYWx1ZXMuZmlsdGVyKHZhbHVlID0+ICh2YWx1ZSAhPT0gJ3VuZGVmaW5lZCcpICYmICh2YWx1ZSAhPT0gJ24vYScpKTtcbiAgZGVidWdsb2dcbiAgcmVhbHZhbHVlcy5zb3J0KCk7XG4gIHZhciB1bmRlZk5hRGVsdGEgPSAgKGFsbFZhbHVlcy5sZW5ndGggLSByZWFsdmFsdWVzLmxlbmd0aCk7XG4gIHZhciBkZWx0YSA9ICAodW5kZWZOYURlbHRhKSA/ICBcIigrXCIgKyB1bmRlZk5hRGVsdGEgKyBcIilcIiA6IFwiXCI7XG4gIGNvbnN0IGRpc3RpbmN0ID0gJycgKyByZWFsdmFsdWVzLmxlbmd0aDtcblxuICBjb25zdCB2YWx1ZXNMaXN0ID0gbWFrZVZhbHVlc0xpc3RTdHJpbmcocmVhbHZhbHVlcyk7XG4qL1xuICB2YXIgc3RhdHMgPSBnZXRDYXRlZ29yeVN0YXRzSW5Eb21haW4oY2F0ZWdvcnksZmlsdGVyZG9tYWluLHRoZU1vZGVsKTtcblxuICB2YXIgcmVzID0gJ2lzIGEgY2F0ZWdvcnkgaW4gZG9tYWluIFwiJyArIGZpbHRlcmRvbWFpbiArICdcIlxcbidcbiAgKyBgSXQgaXMgcHJlc2VudCBpbiAke3N0YXRzLnByZXNlbnRSZWNvcmRzfSAoJHtzdGF0cy5wZXJjUHJlc2VudH0lKSBvZiByZWNvcmRzIGluIHRoaXMgZG9tYWluLFxcbmAgK1xuICAgYGhhdmluZyAke3N0YXRzLmRpc3RpbmN0ICsgJyd9JHtzdGF0cy5kZWx0YX0gZGlzdGluY3QgdmFsdWVzLlxcbmBcbiAgKyBzdGF0cy5zYW1wbGVWYWx1ZXM7XG5cbiAgdmFyIGRlc2MgPSB0aGVNb2RlbC5mdWxsLmRvbWFpbltmaWx0ZXJkb21haW5dLmNhdGVnb3JpZXNbY2F0ZWdvcnldIHx8IHt9IGFzIElNYXRjaC5JQ2F0ZWdvcnlEZXNjO1xuICB2YXIgZGVzY3JpcHRpb24gPSBkZXNjLmRlc2NyaXB0aW9uIHx8IFwiXCI7XG4gIGlmIChkZXNjcmlwdGlvbikge1xuICAgIHJlcyArPSBgXFxuRGVzY3JpcHRpb246ICR7ZGVzY3JpcHRpb259YDtcbiAgfVxuICByZXR1cm4gcmVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmluZFJlY29yZHNXaXRoRmFjdChtYXRjaGVkU3RyaW5nOiBzdHJpbmcsIGNhdGVnb3J5IDogc3RyaW5nLCByZWNvcmRzIDogYW55LCBkb21haW5zIDogeyBba2V5IDogc3RyaW5nXSA6IG51bWJlcn0pIDogYW55W10ge1xuICByZXR1cm4gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24ocmVjb3JkKSAge1xuXG4gICAgbGV0IHJlcyA9IChyZWNvcmRbY2F0ZWdvcnldID09PSBtYXRjaGVkU3RyaW5nKTtcbiAgICBpZiggcmVzKSB7XG4gICAgICBpbmNyZW1lbnQoZG9tYWlucyxyZWNvcmRzLl9kb21haW4pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGluY3JlbWVudChtYXAgOiB7W2tleTogc3RyaW5nXSA6IG51bWJlcn0sIGtleSA6IHN0cmluZykge1xuICBtYXBba2V5XSA9IChtYXBba2V5XSB8fCAwKSArIDE7XG59XG5cbmZ1bmN0aW9uIHNvcnRlZEtleXM8VD4obWFwIDoge1trZXkgOiBzdHJpbmddIDogVH0pIDogc3RyaW5nW10ge1xuICB2YXIgciA9IE9iamVjdC5rZXlzKG1hcCk7XG4gIHIuc29ydCgpO1xuICByZXR1cm4gcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlc2NyaWJlRG9tYWluKGZhY3QgOiBzdHJpbmcsIGRvbWFpbjogc3RyaW5nLCB0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMpIDogc3RyaW5nIHtcbiAgdmFyIGNvdW50ID0gdGhlTW9kZWwucmVjb3Jkcy5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgcmVjb3JkKSB7XG4gICAgcmV0dXJuIHByZXYgKyAoKHJlY29yZC5fZG9tYWluID09PSBkb21haW4pID8gMSA6IDApO1xuICB9LDApO1xuICB2YXIgY2F0Y291bnQgPSBNb2RlbC5nZXRDYXRlZ29yaWVzRm9yRG9tYWluKHRoZU1vZGVsLCBkb21haW4pLmxlbmd0aDtcbiAgdmFyIHJlcyA9IHNsb3BweU9yRXhhY3QoZG9tYWluLCBmYWN0LCB0aGVNb2RlbCkgKyBgaXMgYSBkb21haW4gd2l0aCAke2NhdGNvdW50fSBjYXRlZ29yaWVzIGFuZCAke2NvdW50fSByZWNvcmRzXFxuYDtcbiAgdmFyIGRlc2MgPSB0aGVNb2RlbC5mdWxsLmRvbWFpbltkb21haW5dLmRlc2NyaXB0aW9uIHx8IFwiXCI7XG4gIGlmKGRlc2MpIHtcbiAgICByZXMgKz0gYERlc2NyaXB0aW9uOmAgKyBkZXNjICsgYFxcbmA7XG4gIH1cbiAgcmV0dXJuIHJlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlc2NyaWJlRmFjdEluRG9tYWluKGZhY3QgOiBzdHJpbmcsIGZpbHRlcmRvbWFpbiA6IHN0cmluZywgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzKSA6IHN0cmluZyB7XG4gIHZhciBzZW50ZW5jZXMgPSBXaGF0SXMuYW5hbHl6ZUNvbnRleHRTdHJpbmcoZmFjdCwgIHRoZU1vZGVsLnJ1bGVzKTtcbiAgdmFyIGxlbmd0aE9uZVNlbnRlbmNlcyA9IHNlbnRlbmNlcy5maWx0ZXIob1NlbnRlbmNlID0+IG9TZW50ZW5jZS5sZW5ndGggPT09IDEpO1xuICB2YXIgcmVzID0gJyc7XG4gIC8vIHJlbW92ZSBjYXRlZ29yaWVzIGFuZCBkb21haW5zXG4gIHZhciBvbmx5RmFjdHMgPSBsZW5ndGhPbmVTZW50ZW5jZXMuZmlsdGVyKG9TZW50ZW5jZSA9PntcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvU2VudGVuY2VbMF0pKTtcbiAgICByZXR1cm4gIVdvcmQuV29yZC5pc0RvbWFpbihvU2VudGVuY2VbMF0pICYmXG4gICAgICAgICAgICFXb3JkLldvcmQuaXNGaWxsZXIob1NlbnRlbmNlWzBdKSAmJiAhV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1NlbnRlbmNlWzBdKVxuICB9XG4gICk7XG4gIHZhciBvbmx5RG9tYWlucyA9IGxlbmd0aE9uZVNlbnRlbmNlcy5maWx0ZXIob1NlbnRlbmNlID0+e1xuICAgIHJldHVybiBXb3JkLldvcmQuaXNEb21haW4ob1NlbnRlbmNlWzBdKTtcbiAgfSk7XG4gIGlmKG9ubHlEb21haW5zICYmIG9ubHlEb21haW5zLmxlbmd0aCA+IDApIHtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvbmx5RG9tYWlucykpO1xuICAgIG9ubHlEb21haW5zLmZvckVhY2goZnVuY3Rpb24oc2VudGVuY2UpIHtcbiAgICAgIHZhciBkb21haW4gPSBzZW50ZW5jZVswXS5tYXRjaGVkU3RyaW5nO1xuICAgICAgaWYoICFmaWx0ZXJkb21haW4gfHwgZG9tYWluID09PSBmaWx0ZXJkb21haW4pIHtcbiAgICAgICAgZGVidWdsb2coXCJoZXJlIG1hdGNoIFwiICsgSlNPTi5zdHJpbmdpZnkoc2VudGVuY2UpKTtcbiAgICAgICAgcmVzICs9IGRlc2NyaWJlRG9tYWluKGZhY3QsIHNlbnRlbmNlWzBdLm1hdGNoZWRTdHJpbmcsIHRoZU1vZGVsKTtcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgZGVidWdsb2coXCJvbmx5IGZhY3RzOiBcIiArIEpTT04uc3RyaW5naWZ5KG9ubHlGYWN0cykpO1xuICB2YXIgcmVjb3JkTWFwID0ge307XG4gIHZhciBkb21haW5zTWFwID0ge30gYXMge1trZXk6IHN0cmluZ10gOiBudW1iZXJ9O1xuICB2YXIgbWF0Y2hlZHdvcmRNYXAgPSB7fSBhcyB7W2tleTogc3RyaW5nXSA6IG51bWJlcn07XG4gIHZhciBtYXRjaGVkQ2F0ZWdvcnlNYXAgPSB7fSBhcyB7W2tleTogc3RyaW5nXSA6IG51bWJlcn07XG4gIC8vIGxvb2sgZm9yIGFsbCByZWNvcmRzXG4gIG9ubHlGYWN0cy5mb3JFYWNoKG9TZW50ZW5jZSA9PlxuICAgIG9TZW50ZW5jZS5mb3JFYWNoKG9Xb3JkID0+XG4gICAgICB7XG4gICAgICAgIGluY3JlbWVudChtYXRjaGVkd29yZE1hcCwgb1dvcmQubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgIGluY3JlbWVudChtYXRjaGVkQ2F0ZWdvcnlNYXAsIG9Xb3JkLmNhdGVnb3J5KTtcbiAgICAgIH1cbiAgICApXG4gICk7XG4gIC8vIHdlIGhhdmU6XG4gIC8vIGEgbGlzdCBvZiBjYXRlZ29yaWVzLFxuICAvLyBhIGxpc3Qgb2YgbWF0Y2hlZFdvcmRzICAtPlxuICAvL1xuXG4gIHZhciBjYXRlZ29yaWVzID0gc29ydGVkS2V5cyhtYXRjaGVkQ2F0ZWdvcnlNYXApO1xuICB2YXIgbWF0Y2hlZHdvcmRzID0gc29ydGVkS2V5cyhtYXRjaGVkd29yZE1hcCk7XG4gIGRlYnVnbG9nKFwibWF0Y2hlZHdvcmRzOiBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWR3b3JkcykpO1xuICBkZWJ1Z2xvZyhcImNhdGVnb3JpZXM6IFwiICsgSlNPTi5zdHJpbmdpZnkoY2F0ZWdvcmllcykpO1xuXG4gIC8vdmFyIGFsbE1hdGNoZWRXb3JkcyA9IHsgW2tleSA6IHN0cmluZ10gOiBudW1iZXIgfTtcbiAgdmFyIGRvbWFpblJlY29yZENvdW50ID0ge30gYXMge1trZXk6IHN0cmluZ10gOiBudW1iZXJ9O1xuICB2YXIgZG9tYWluTWF0Y2hDYXRDb3VudCA9IHt9IGFzIHtba2V5OiBzdHJpbmddIDpcbiAgICAgICB7W2tleTogc3RyaW5nXSA6XG4gICAgIHtba2V5OiBzdHJpbmddIDogbnVtYmVyfX19O1xuICAvLyB3ZSBwcmVwYXJlIHRoZSBmb2xsb3dpbmcgc3RydWN0dXJlXG4gIC8vXG4gIC8vIHtkb21haW59IDogcmVjb3JkY291bnQ7XG4gIC8vIHttYXRjaGVkd29yZHN9IDpcbiAgLy8ge2RvbWFpbn0ge21hdGNoZWR3b3JkfSB7Y2F0ZWdvcnl9IHByZXNlbmNlY291bnRcbiAgdGhlTW9kZWwucmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uKHJlY29yZCkge1xuICAgIGlmKCFmaWx0ZXJkb21haW4gfHwgcmVjb3JkLl9kb21haW4gPT09IGZpbHRlcmRvbWFpbiApIHtcbiAgICAgIGRvbWFpblJlY29yZENvdW50W3JlY29yZC5fZG9tYWluXSA9IChkb21haW5SZWNvcmRDb3VudFtyZWNvcmQuX2RvbWFpbl0gfHwgMCkgKyAxO1xuICAgICAgbWF0Y2hlZHdvcmRzLmZvckVhY2gobWF0Y2hlZHdvcmQgPT5cbiAgICAgICAgY2F0ZWdvcmllcy5mb3JFYWNoKGNhdGVnb3J5ID0+IHtcbiAgICAgICAgICBpZiggcmVjb3JkW2NhdGVnb3J5XSA9PT0gbWF0Y2hlZHdvcmQpIHtcbiAgICAgICAgICAgIHZhciBtZCA9IGRvbWFpbk1hdGNoQ2F0Q291bnRbcmVjb3JkLl9kb21haW5dID0gZG9tYWluTWF0Y2hDYXRDb3VudFtyZWNvcmQuX2RvbWFpbl0gfHwge307XG4gICAgICAgICAgICB2YXIgbWRjID0gbWRbbWF0Y2hlZHdvcmRdID0gIG1kW21hdGNoZWR3b3JkXSB8fCB7fTtcbiAgICAgICAgICAgIGluY3JlbWVudChtZGMsY2F0ZWdvcnkpO1xuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgKVxuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkb21haW5NYXRjaENhdENvdW50LHVuZGVmaW5lZCwyKSk7XG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRvbWFpblJlY29yZENvdW50LHVuZGVmaW5lZCwyKSk7XG4gIHZhciBkb21haW5zID0gc29ydGVkS2V5cyhkb21haW5NYXRjaENhdENvdW50KTtcbiAgdmFyIHJlc05leHQgPSAgJ1wiJyArIGZhY3QgKyAnXCIgaGFzIGEgbWVhbmluZyBpbiAnO1xuICB2YXIgc2luZ2xlID0gZmFsc2U7XG4gIGlmKE9iamVjdC5rZXlzKGRvbWFpbk1hdGNoQ2F0Q291bnQpLmxlbmd0aCA+IDEpIHtcbiAgICByZXNOZXh0ICs9ICcnICsgZG9tYWlucy5sZW5ndGggK1xuICAgICAgICAgICAgICAnIGRvbWFpbnM6ICcgKyBVdGlscy5saXN0VG9RdW90ZWRDb21tYUFuZChkb21haW5zKSArIFwiXCI7XG4gIH0gZWxzZSBpZihkb21haW5zLmxlbmd0aCA9PT0gMSkge1xuICAgIGlmKCFmaWx0ZXJkb21haW4pIHtcbiAgICAgIHJlc05leHQgKz0gYG9uZSBgO1xuICAgIH1cbiAgICByZXNOZXh0ICs9IGBkb21haW4gXCIke2RvbWFpbnNbMF19XCI6YDtcbiAgICBzaW5nbGUgPSB0cnVlO1xuICB9IGVsc2Uge1xuICAgIGlmKHJlcykge1xuICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG4gICAgaWYoZmlsdGVyZG9tYWluKSB7XG4gICAgICByZXR1cm4gYFwiJHtmYWN0fVwiIGlzIG5vIGtub3duIGZhY3QgaW4gZG9tYWluIFwiJHtmaWx0ZXJkb21haW59XCIuXFxuYDtcbiAgICB9XG4gICAgcmV0dXJuIGBcIiR7ZmFjdH1cIiBpcyBubyBrbm93biBmYWN0LlxcbmA7XG4gIH1cbiAgcmVzICs9IHJlc05leHQgKyBcIlxcblwiOyAvLyAuLi5cXG5cIjtcbiAgZG9tYWlucy5mb3JFYWNoKGZ1bmN0aW9uKGRvbWFpbikge1xuICAgIHZhciBtZCA9IGRvbWFpbk1hdGNoQ2F0Q291bnRbZG9tYWluXTtcbiAgICBPYmplY3Qua2V5cyhtZCkuZm9yRWFjaChtYXRjaGVkc3RyaW5nID0+IHtcbiAgICAgIHZhciBtZGMgPSBtZFttYXRjaGVkc3RyaW5nXTtcbiAgICAgIGlmKCFzaW5nbGUpIHtcbiAgICAgICAgcmVzICs9ICdpbiBkb21haW4gXCInICsgZG9tYWluICsgJ1wiICc7XG4gICAgICB9XG4gICAgICB2YXIgY2F0c2luZ2xlID0gT2JqZWN0LmtleXMobWRjKS5sZW5ndGggPT09IDE7XG4gICAgICByZXMgKz0gYCR7c2xvcHB5T3JFeGFjdChtYXRjaGVkc3RyaW5nLGZhY3QsdGhlTW9kZWwpfSBgO1xuICAgICAgaWYoIWNhdHNpbmdsZSkge1xuICAgICAgICByZXMgKz0gYC4uLlxcbmA7XG4gICAgICB9XG4gICAgICBPYmplY3Qua2V5cyhtZGMpLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xuICAgICAgdmFyIHBlcmNlbnQgPSAgdG9QZXJjZW50KG1kY1tjYXRlZ29yeV0sZG9tYWluUmVjb3JkQ291bnRbZG9tYWluXSk7XG5cbiAgICAgICAgcmVzICs9IGBpcyBhIHZhbHVlIGZvciBjYXRlZ29yeSBcIiR7Y2F0ZWdvcnl9XCIgcHJlc2VudCBpbiAke21kY1tjYXRlZ29yeV19KCR7cGVyY2VudH0lKSBvZiByZWNvcmRzO1xcbmA7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG4gIHJldHVybiByZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXNjcmliZUNhdGVnb3J5KGNhdGVnb3J5IDogc3RyaW5nLCBmaWx0ZXJEb21haW46IHN0cmluZywgbW9kZWw6IElNYXRjaC5JTW9kZWxzLG1lc3NhZ2UgOiBzdHJpbmcpIDogc3RyaW5nW10ge1xuICB2YXIgcmVzID0gW107XG4gIHZhciBkb21zID0gTW9kZWwuZ2V0RG9tYWluc0ZvckNhdGVnb3J5KG1vZGVsLGNhdGVnb3J5KTtcbiAgaWYoZmlsdGVyRG9tYWluKSB7XG4gICAgaWYoZG9tcy5pbmRleE9mKGZpbHRlckRvbWFpbikgPj0gMCkge1xuICAgICAgcmVzLnB1c2goZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluKGNhdGVnb3J5LGZpbHRlckRvbWFpbixtb2RlbCkpO1xuICAgICAgcmV0dXJuIHJlcztcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgfVxuICBkb21zLnNvcnQoKTtcbiAgZG9tcy5mb3JFYWNoKGZ1bmN0aW9uKGRvbWFpbikge1xuICAgICAgICByZXMucHVzaChkZXNjcmliZUNhdGVnb3J5SW5Eb21haW4oY2F0ZWdvcnksIGRvbWFpbiwgbW9kZWwpKTtcbiAgfSk7XG4gIHJldHVybiByZXM7XG59XG4iLCIvKipcbiAqXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5leHBsYWluXG4gKiBAZmlsZSBleHBsYWluLnRzXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXG4gKlxuICogRnVuY3Rpb25zIGRlYWxpbmcgd2l0aCBleHBsYWluaW5nIGZhY3RzLCBjYXRlZ29yaWVzIGV0Yy5cbiAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgQWxnb2wgPSByZXF1aXJlKCcuL2FsZ29sJyk7XG52YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpO1xudmFyIGRlYnVnbG9nID0gZGVidWcoJ2Rlc2NyaWJlJyk7XG52YXIgbG9nZ2VyID0gcmVxdWlyZSgnLi4vdXRpbHMvbG9nZ2VyJyk7XG52YXIgbG9nUGVyZiA9IGxvZ2dlci5wZXJmKFwicGVyZmxpc3RhbGxcIik7XG52YXIgcGVyZmxvZyA9IGRlYnVnKCdwZXJmJyk7XG52YXIgV29yZCA9IHJlcXVpcmUoJy4vd29yZCcpO1xudmFyIFdoYXRJcyA9IHJlcXVpcmUoJy4vd2hhdGlzJyk7XG52YXIgTW9kZWwgPSByZXF1aXJlKCcuLi9tb2RlbC9tb2RlbCcpO1xudmFyIFV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMvdXRpbHMnKTtcbnZhciBzV29yZHMgPSB7fTtcbmZ1bmN0aW9uIGlzU3lub255bUZvcihleGFjdFdvcmQsIHNsb3BweVdvcmQsIHRoZU1vZGVsKSB7XG4gICAgLy8gVE9ETzogdXNlIG1vZGVsIHN5bm9ueW1zXG4gICAgcmV0dXJuIHNsb3BweVdvcmQgPT09IFwibmFtZVwiICYmIGV4YWN0V29yZCA9PT0gXCJlbGVtZW50IG5hbWVcIjtcbn1cbmV4cG9ydHMuaXNTeW5vbnltRm9yID0gaXNTeW5vbnltRm9yO1xuZnVuY3Rpb24gc2xvcHB5T3JFeGFjdChleGFjdFdvcmQsIHNsb3BweVdvcmQsIHRoZU1vZGVsKSB7XG4gICAgaWYgKGV4YWN0V29yZC50b0xvd2VyQ2FzZSgpID09PSBzbG9wcHlXb3JkLnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgcmV0dXJuICdcIicgKyBzbG9wcHlXb3JkICsgJ1wiJztcbiAgICB9XG4gICAgLy8gVE9ETywgZmluZCBwbHVyYWwgcyBldGMuXG4gICAgLy8gc3RpbGwgZXhhY3QsXG4gICAgLy9cbiAgICBpZiAoaXNTeW5vbnltRm9yKGV4YWN0V29yZCwgc2xvcHB5V29yZCwgdGhlTW9kZWwpKSB7XG4gICAgICAgIHJldHVybiAnXCInICsgc2xvcHB5V29yZCArICdcIiAoaW50ZXJwcmV0ZWQgYXMgc3lub255bSBmb3IgXCInICsgZXhhY3RXb3JkICsgJ1wiKSc7XG4gICAgfVxuICAgIC8vdG9kbywgZmluZCBpcyBzeW5vbnltZm9yIC4uLlxuICAgIC8vIFRPRE8sIGEgc3lub255bSBmb3IgLi4uXG4gICAgcmV0dXJuICdcIicgKyBzbG9wcHlXb3JkICsgJ1wiIChpbnRlcnByZXRlZCBhcyBcIicgKyBleGFjdFdvcmQgKyAnXCIpJztcbn1cbmV4cG9ydHMuc2xvcHB5T3JFeGFjdCA9IHNsb3BweU9yRXhhY3Q7XG5mdW5jdGlvbiBjb3VudFJlY29yZFByZXNlbmNlKGNhdGVnb3J5LCBkb21haW4sIHRoZU1vZGVsKSB7XG4gICAgdmFyIHJlcyA9IHsgdG90YWxyZWNvcmRzOiAwLFxuICAgICAgICBwcmVzZW50cmVjb3JkczogMCxcbiAgICAgICAgdmFsdWVzOiB7fSxcbiAgICAgICAgbXVsdGl2YWx1ZWQ6IGZhbHNlXG4gICAgfTtcbiAgICB0aGVNb2RlbC5yZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICAvL2RlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZCx1bmRlZmluZWQsMikpO1xuICAgICAgICBpZiAocmVjb3JkLl9kb21haW4gIT09IGRvbWFpbikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJlcy50b3RhbHJlY29yZHMrKztcbiAgICAgICAgdmFyIHZhbCA9IHJlY29yZFtjYXRlZ29yeV07XG4gICAgICAgIHZhciB2YWxhcnIgPSBbdmFsXTtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgICAgICAgcmVzLm11bHRpdmFsdWVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHZhbGFyciA9IHZhbDtcbiAgICAgICAgfVxuICAgICAgICAvLyB0b2RvIHdyYXAgYXJyXG4gICAgICAgIGlmICh2YWwgIT09IHVuZGVmaW5lZCAmJiB2YWwgIT09IFwibi9hXCIpIHtcbiAgICAgICAgICAgIHJlcy5wcmVzZW50cmVjb3JkcysrO1xuICAgICAgICB9XG4gICAgICAgIHZhbGFyci5mb3JFYWNoKGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHJlcy52YWx1ZXNbdmFsXSA9IChyZXMudmFsdWVzW3ZhbF0gfHwgMCkgKyAxO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5jb3VudFJlY29yZFByZXNlbmNlID0gY291bnRSZWNvcmRQcmVzZW5jZTtcbmZ1bmN0aW9uIGNvdW50UmVjb3JkUHJlc2VuY2VGYWN0KGZhY3QsIGNhdGVnb3J5LCBkb21haW4sIHRoZU1vZGVsKSB7XG4gICAgdmFyIHJlcyA9IHsgdG90YWxyZWNvcmRzOiAwLFxuICAgICAgICBwcmVzZW50cmVjb3JkczogMCxcbiAgICAgICAgdmFsdWVzOiB7fSxcbiAgICAgICAgbXVsdGl2YWx1ZWQ6IGZhbHNlXG4gICAgfTtcbiAgICB0aGVNb2RlbC5yZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICAvL2RlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZCx1bmRlZmluZWQsMikpO1xuICAgICAgICBpZiAocmVjb3JkLl9kb21haW4gIT09IGRvbWFpbikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJlcy50b3RhbHJlY29yZHMrKztcbiAgICAgICAgdmFyIHZhbCA9IHJlY29yZFtjYXRlZ29yeV07XG4gICAgICAgIHZhciB2YWxhcnIgPSBbdmFsXTtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgICAgICAgaWYgKHZhbC5pbmRleE9mKGZhY3QpID49IDApIHtcbiAgICAgICAgICAgICAgICByZXMubXVsdGl2YWx1ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHZhbGFyciA9IHZhbDtcbiAgICAgICAgICAgICAgICByZXMucHJlc2VudHJlY29yZHMrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh2YWwgPT09IGZhY3QpIHtcbiAgICAgICAgICAgIHJlcy5wcmVzZW50cmVjb3JkcysrO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuY291bnRSZWNvcmRQcmVzZW5jZUZhY3QgPSBjb3VudFJlY29yZFByZXNlbmNlRmFjdDtcbmZ1bmN0aW9uIG1ha2VWYWx1ZXNMaXN0U3RyaW5nKHJlYWx2YWx1ZXMpIHtcbiAgICB2YXIgdmFsdWVzU3RyaW5nID0gXCJcIjtcbiAgICB2YXIgdG90YWxsZW4gPSAwO1xuICAgIHZhciBsaXN0VmFsdWVzID0gcmVhbHZhbHVlcy5maWx0ZXIoZnVuY3Rpb24gKHZhbCwgaW5kZXgpIHtcbiAgICAgICAgdG90YWxsZW4gPSB0b3RhbGxlbiArIHZhbC5sZW5ndGg7XG4gICAgICAgIHJldHVybiAoaW5kZXggPCBBbGdvbC5EZXNjcmliZVZhbHVlTGlzdE1pbkNvdW50VmFsdWVMaXN0KSB8fCAodG90YWxsZW4gPCBBbGdvbC5EZXNjcmliZVZhbHVlTGlzdExlbmd0aENoYXJMaW1pdCk7XG4gICAgfSk7XG4gICAgaWYgKGxpc3RWYWx1ZXMubGVuZ3RoID09PSAxICYmIHJlYWx2YWx1ZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHJldHVybiAnVGhlIHNvbGUgdmFsdWUgaXMgXFxcIicgKyBsaXN0VmFsdWVzWzBdICsgJ1wiJztcbiAgICB9XG4gICAgdmFyIG1heGxlbiA9IGxpc3RWYWx1ZXMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCB2YWwpIHsgcmV0dXJuIE1hdGgubWF4KHByZXYsIHZhbC5sZW5ndGgpOyB9LCAwKTtcbiAgICBpZiAobWF4bGVuID4gMzApIHtcbiAgICAgICAgcmV0dXJuIFwiUG9zc2libGUgdmFsdWVzIGFyZSAuLi5cXG5cIiArXG4gICAgICAgICAgICBsaXN0VmFsdWVzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgdmFsLCBpbmRleCkgeyByZXR1cm4gKHByZXYgKyBcIihcIiArIChpbmRleCArIDEpICsgJyk6IFwiJyArIHZhbCArICdcIlxcbicpOyB9LCBcIlwiKVxuICAgICAgICAgICAgKyAobGlzdFZhbHVlcy5sZW5ndGggPT09IHJlYWx2YWx1ZXMubGVuZ3RoID8gXCJcIiA6IFwiLi4uXCIpO1xuICAgIH1cbiAgICB2YXIgbGlzdCA9IFwiXCI7XG4gICAgaWYgKGxpc3RWYWx1ZXMubGVuZ3RoID09PSByZWFsdmFsdWVzLmxlbmd0aCkge1xuICAgICAgICBsaXN0ID0gVXRpbHMubGlzdFRvUXVvdGVkQ29tbWFPcihsaXN0VmFsdWVzKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGxpc3QgPSAnXCInICsgbGlzdFZhbHVlcy5qb2luKCdcIiwgXCInKSArICdcIic7XG4gICAgfVxuICAgIHJldHVybiBcIlBvc3NpYmxlIHZhbHVlcyBhcmUgLi4uXFxuXCJcbiAgICAgICAgKyBsaXN0XG4gICAgICAgICsgKGxpc3RWYWx1ZXMubGVuZ3RoID09PSByZWFsdmFsdWVzLmxlbmd0aCA/IFwiXCIgOiBcIiAuLi5cIik7XG59XG5leHBvcnRzLm1ha2VWYWx1ZXNMaXN0U3RyaW5nID0gbWFrZVZhbHVlc0xpc3RTdHJpbmc7XG5mdW5jdGlvbiB0b1BlcmNlbnQoYSwgYikge1xuICAgIHJldHVybiBcIlwiICsgKDEwMCAqIGEgLyBiKS50b0ZpeGVkKDEpO1xufVxuZXhwb3J0cy50b1BlcmNlbnQgPSB0b1BlcmNlbnQ7XG47XG5mdW5jdGlvbiBnZXRDYXRlZ29yeVN0YXRzSW5Eb21haW4oY2F0ZWdvcnksIGZpbHRlcmRvbWFpbiwgdGhlTW9kZWwpIHtcbiAgICB2YXIgcmVjb3JkQ291bnQgPSBjb3VudFJlY29yZFByZXNlbmNlKGNhdGVnb3J5LCBmaWx0ZXJkb21haW4sIHRoZU1vZGVsKTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeSh0aGVNb2RlbC5yZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAoYSkgeyByZXR1cm4gYS5fZG9tYWluID09PSBcIkNvc21vc1wiOyB9KSwgdW5kZWZpbmVkLCAyKSk7XG4gICAgdmFyIHBlcmNlbnQgPSB0b1BlcmNlbnQocmVjb3JkQ291bnQucHJlc2VudHJlY29yZHMsIHJlY29yZENvdW50LnRvdGFscmVjb3Jkcyk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkQ291bnQudmFsdWVzKSk7XG4gICAgdmFyIGFsbFZhbHVlcyA9IE9iamVjdC5rZXlzKHJlY29yZENvdW50LnZhbHVlcyk7XG4gICAgdmFyIHJlYWx2YWx1ZXMgPSBhbGxWYWx1ZXMuZmlsdGVyKGZ1bmN0aW9uICh2YWx1ZSkgeyByZXR1cm4gKHZhbHVlICE9PSAndW5kZWZpbmVkJykgJiYgKHZhbHVlICE9PSAnbi9hJyk7IH0pO1xuICAgIGRlYnVnbG9nO1xuICAgIHJlYWx2YWx1ZXMuc29ydCgpO1xuICAgIHZhciB1bmRlZk5hRGVsdGEgPSAoYWxsVmFsdWVzLmxlbmd0aCAtIHJlYWx2YWx1ZXMubGVuZ3RoKTtcbiAgICB2YXIgZGVsdGEgPSAodW5kZWZOYURlbHRhKSA/IFwiKCtcIiArIHVuZGVmTmFEZWx0YSArIFwiKVwiIDogXCJcIjtcbiAgICB2YXIgZGlzdGluY3QgPSAnJyArIHJlYWx2YWx1ZXMubGVuZ3RoO1xuICAgIHZhciB2YWx1ZXNMaXN0ID0gbWFrZVZhbHVlc0xpc3RTdHJpbmcocmVhbHZhbHVlcyk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgY2F0ZWdvcnlEZXNjOiB0aGVNb2RlbC5mdWxsLmRvbWFpbltmaWx0ZXJkb21haW5dLmNhdGVnb3JpZXNbY2F0ZWdvcnldLFxuICAgICAgICBkaXN0aW5jdDogZGlzdGluY3QsXG4gICAgICAgIGRlbHRhOiBkZWx0YSxcbiAgICAgICAgcHJlc2VudFJlY29yZHM6IHJlY29yZENvdW50LnByZXNlbnRyZWNvcmRzLFxuICAgICAgICBwZXJjUHJlc2VudDogcGVyY2VudCxcbiAgICAgICAgc2FtcGxlVmFsdWVzOiB2YWx1ZXNMaXN0XG4gICAgfTtcbn1cbmV4cG9ydHMuZ2V0Q2F0ZWdvcnlTdGF0c0luRG9tYWluID0gZ2V0Q2F0ZWdvcnlTdGF0c0luRG9tYWluO1xuZnVuY3Rpb24gZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluKGNhdGVnb3J5LCBmaWx0ZXJkb21haW4sIHRoZU1vZGVsKSB7XG4gICAgLyogIGNvbnN0IHJlY29yZENvdW50ID0gY291bnRSZWNvcmRQcmVzZW5jZShjYXRlZ29yeSwgZmlsdGVyZG9tYWluLCB0aGVNb2RlbCk7XG4gICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeSh0aGVNb2RlbC5yZWNvcmRzLmZpbHRlcihhID0+IGEuX2RvbWFpbiA9PT0gXCJDb3Ntb3NcIiksdW5kZWZpbmVkLDIpKTtcbiAgICAgIGNvbnN0IHBlcmNlbnQgPSB0b1BlcmNlbnQocmVjb3JkQ291bnQucHJlc2VudHJlY29yZHMgLCByZWNvcmRDb3VudC50b3RhbHJlY29yZHMpO1xuICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkQ291bnQudmFsdWVzKSk7XG4gICAgICB2YXIgYWxsVmFsdWVzID1PYmplY3Qua2V5cyhyZWNvcmRDb3VudC52YWx1ZXMpO1xuICAgICAgdmFyIHJlYWx2YWx1ZXMgPSBhbGxWYWx1ZXMuZmlsdGVyKHZhbHVlID0+ICh2YWx1ZSAhPT0gJ3VuZGVmaW5lZCcpICYmICh2YWx1ZSAhPT0gJ24vYScpKTtcbiAgICAgIGRlYnVnbG9nXG4gICAgICByZWFsdmFsdWVzLnNvcnQoKTtcbiAgICAgIHZhciB1bmRlZk5hRGVsdGEgPSAgKGFsbFZhbHVlcy5sZW5ndGggLSByZWFsdmFsdWVzLmxlbmd0aCk7XG4gICAgICB2YXIgZGVsdGEgPSAgKHVuZGVmTmFEZWx0YSkgPyAgXCIoK1wiICsgdW5kZWZOYURlbHRhICsgXCIpXCIgOiBcIlwiO1xuICAgICAgY29uc3QgZGlzdGluY3QgPSAnJyArIHJlYWx2YWx1ZXMubGVuZ3RoO1xuICAgIFxuICAgICAgY29uc3QgdmFsdWVzTGlzdCA9IG1ha2VWYWx1ZXNMaXN0U3RyaW5nKHJlYWx2YWx1ZXMpO1xuICAgICovXG4gICAgdmFyIHN0YXRzID0gZ2V0Q2F0ZWdvcnlTdGF0c0luRG9tYWluKGNhdGVnb3J5LCBmaWx0ZXJkb21haW4sIHRoZU1vZGVsKTtcbiAgICB2YXIgcmVzID0gJ2lzIGEgY2F0ZWdvcnkgaW4gZG9tYWluIFwiJyArIGZpbHRlcmRvbWFpbiArICdcIlxcbidcbiAgICAgICAgKyAoXCJJdCBpcyBwcmVzZW50IGluIFwiICsgc3RhdHMucHJlc2VudFJlY29yZHMgKyBcIiAoXCIgKyBzdGF0cy5wZXJjUHJlc2VudCArIFwiJSkgb2YgcmVjb3JkcyBpbiB0aGlzIGRvbWFpbixcXG5cIikgK1xuICAgICAgICAoXCJoYXZpbmcgXCIgKyAoc3RhdHMuZGlzdGluY3QgKyAnJykgKyBzdGF0cy5kZWx0YSArIFwiIGRpc3RpbmN0IHZhbHVlcy5cXG5cIilcbiAgICAgICAgKyBzdGF0cy5zYW1wbGVWYWx1ZXM7XG4gICAgdmFyIGRlc2MgPSB0aGVNb2RlbC5mdWxsLmRvbWFpbltmaWx0ZXJkb21haW5dLmNhdGVnb3JpZXNbY2F0ZWdvcnldIHx8IHt9O1xuICAgIHZhciBkZXNjcmlwdGlvbiA9IGRlc2MuZGVzY3JpcHRpb24gfHwgXCJcIjtcbiAgICBpZiAoZGVzY3JpcHRpb24pIHtcbiAgICAgICAgcmVzICs9IFwiXFxuRGVzY3JpcHRpb246IFwiICsgZGVzY3JpcHRpb247XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmRlc2NyaWJlQ2F0ZWdvcnlJbkRvbWFpbiA9IGRlc2NyaWJlQ2F0ZWdvcnlJbkRvbWFpbjtcbmZ1bmN0aW9uIGZpbmRSZWNvcmRzV2l0aEZhY3QobWF0Y2hlZFN0cmluZywgY2F0ZWdvcnksIHJlY29yZHMsIGRvbWFpbnMpIHtcbiAgICByZXR1cm4gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICB2YXIgcmVzID0gKHJlY29yZFtjYXRlZ29yeV0gPT09IG1hdGNoZWRTdHJpbmcpO1xuICAgICAgICBpZiAocmVzKSB7XG4gICAgICAgICAgICBpbmNyZW1lbnQoZG9tYWlucywgcmVjb3Jkcy5fZG9tYWluKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH0pO1xufVxuZXhwb3J0cy5maW5kUmVjb3Jkc1dpdGhGYWN0ID0gZmluZFJlY29yZHNXaXRoRmFjdDtcbmZ1bmN0aW9uIGluY3JlbWVudChtYXAsIGtleSkge1xuICAgIG1hcFtrZXldID0gKG1hcFtrZXldIHx8IDApICsgMTtcbn1cbmV4cG9ydHMuaW5jcmVtZW50ID0gaW5jcmVtZW50O1xuZnVuY3Rpb24gc29ydGVkS2V5cyhtYXApIHtcbiAgICB2YXIgciA9IE9iamVjdC5rZXlzKG1hcCk7XG4gICAgci5zb3J0KCk7XG4gICAgcmV0dXJuIHI7XG59XG5mdW5jdGlvbiBkZXNjcmliZURvbWFpbihmYWN0LCBkb21haW4sIHRoZU1vZGVsKSB7XG4gICAgdmFyIGNvdW50ID0gdGhlTW9kZWwucmVjb3Jkcy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHJlY29yZCkge1xuICAgICAgICByZXR1cm4gcHJldiArICgocmVjb3JkLl9kb21haW4gPT09IGRvbWFpbikgPyAxIDogMCk7XG4gICAgfSwgMCk7XG4gICAgdmFyIGNhdGNvdW50ID0gTW9kZWwuZ2V0Q2F0ZWdvcmllc0ZvckRvbWFpbih0aGVNb2RlbCwgZG9tYWluKS5sZW5ndGg7XG4gICAgdmFyIHJlcyA9IHNsb3BweU9yRXhhY3QoZG9tYWluLCBmYWN0LCB0aGVNb2RlbCkgKyAoXCJpcyBhIGRvbWFpbiB3aXRoIFwiICsgY2F0Y291bnQgKyBcIiBjYXRlZ29yaWVzIGFuZCBcIiArIGNvdW50ICsgXCIgcmVjb3Jkc1xcblwiKTtcbiAgICB2YXIgZGVzYyA9IHRoZU1vZGVsLmZ1bGwuZG9tYWluW2RvbWFpbl0uZGVzY3JpcHRpb24gfHwgXCJcIjtcbiAgICBpZiAoZGVzYykge1xuICAgICAgICByZXMgKz0gXCJEZXNjcmlwdGlvbjpcIiArIGRlc2MgKyBcIlxcblwiO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5kZXNjcmliZURvbWFpbiA9IGRlc2NyaWJlRG9tYWluO1xuZnVuY3Rpb24gZGVzY3JpYmVGYWN0SW5Eb21haW4oZmFjdCwgZmlsdGVyZG9tYWluLCB0aGVNb2RlbCkge1xuICAgIHZhciBzZW50ZW5jZXMgPSBXaGF0SXMuYW5hbHl6ZUNvbnRleHRTdHJpbmcoZmFjdCwgdGhlTW9kZWwucnVsZXMpO1xuICAgIHZhciBsZW5ndGhPbmVTZW50ZW5jZXMgPSBzZW50ZW5jZXMuZmlsdGVyKGZ1bmN0aW9uIChvU2VudGVuY2UpIHsgcmV0dXJuIG9TZW50ZW5jZS5sZW5ndGggPT09IDE7IH0pO1xuICAgIHZhciByZXMgPSAnJztcbiAgICAvLyByZW1vdmUgY2F0ZWdvcmllcyBhbmQgZG9tYWluc1xuICAgIHZhciBvbmx5RmFjdHMgPSBsZW5ndGhPbmVTZW50ZW5jZXMuZmlsdGVyKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlWzBdKSk7XG4gICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRG9tYWluKG9TZW50ZW5jZVswXSkgJiZcbiAgICAgICAgICAgICFXb3JkLldvcmQuaXNGaWxsZXIob1NlbnRlbmNlWzBdKSAmJiAhV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1NlbnRlbmNlWzBdKTtcbiAgICB9KTtcbiAgICB2YXIgb25seURvbWFpbnMgPSBsZW5ndGhPbmVTZW50ZW5jZXMuZmlsdGVyKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgcmV0dXJuIFdvcmQuV29yZC5pc0RvbWFpbihvU2VudGVuY2VbMF0pO1xuICAgIH0pO1xuICAgIGlmIChvbmx5RG9tYWlucyAmJiBvbmx5RG9tYWlucy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9ubHlEb21haW5zKSk7XG4gICAgICAgIG9ubHlEb21haW5zLmZvckVhY2goZnVuY3Rpb24gKHNlbnRlbmNlKSB7XG4gICAgICAgICAgICB2YXIgZG9tYWluID0gc2VudGVuY2VbMF0ubWF0Y2hlZFN0cmluZztcbiAgICAgICAgICAgIGlmICghZmlsdGVyZG9tYWluIHx8IGRvbWFpbiA9PT0gZmlsdGVyZG9tYWluKSB7XG4gICAgICAgICAgICAgICAgZGVidWdsb2coXCJoZXJlIG1hdGNoIFwiICsgSlNPTi5zdHJpbmdpZnkoc2VudGVuY2UpKTtcbiAgICAgICAgICAgICAgICByZXMgKz0gZGVzY3JpYmVEb21haW4oZmFjdCwgc2VudGVuY2VbMF0ubWF0Y2hlZFN0cmluZywgdGhlTW9kZWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZGVidWdsb2coXCJvbmx5IGZhY3RzOiBcIiArIEpTT04uc3RyaW5naWZ5KG9ubHlGYWN0cykpO1xuICAgIHZhciByZWNvcmRNYXAgPSB7fTtcbiAgICB2YXIgZG9tYWluc01hcCA9IHt9O1xuICAgIHZhciBtYXRjaGVkd29yZE1hcCA9IHt9O1xuICAgIHZhciBtYXRjaGVkQ2F0ZWdvcnlNYXAgPSB7fTtcbiAgICAvLyBsb29rIGZvciBhbGwgcmVjb3Jkc1xuICAgIG9ubHlGYWN0cy5mb3JFYWNoKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgcmV0dXJuIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgaW5jcmVtZW50KG1hdGNoZWR3b3JkTWFwLCBvV29yZC5tYXRjaGVkU3RyaW5nKTtcbiAgICAgICAgICAgIGluY3JlbWVudChtYXRjaGVkQ2F0ZWdvcnlNYXAsIG9Xb3JkLmNhdGVnb3J5KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgLy8gd2UgaGF2ZTpcbiAgICAvLyBhIGxpc3Qgb2YgY2F0ZWdvcmllcyxcbiAgICAvLyBhIGxpc3Qgb2YgbWF0Y2hlZFdvcmRzICAtPlxuICAgIC8vXG4gICAgdmFyIGNhdGVnb3JpZXMgPSBzb3J0ZWRLZXlzKG1hdGNoZWRDYXRlZ29yeU1hcCk7XG4gICAgdmFyIG1hdGNoZWR3b3JkcyA9IHNvcnRlZEtleXMobWF0Y2hlZHdvcmRNYXApO1xuICAgIGRlYnVnbG9nKFwibWF0Y2hlZHdvcmRzOiBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWR3b3JkcykpO1xuICAgIGRlYnVnbG9nKFwiY2F0ZWdvcmllczogXCIgKyBKU09OLnN0cmluZ2lmeShjYXRlZ29yaWVzKSk7XG4gICAgLy92YXIgYWxsTWF0Y2hlZFdvcmRzID0geyBba2V5IDogc3RyaW5nXSA6IG51bWJlciB9O1xuICAgIHZhciBkb21haW5SZWNvcmRDb3VudCA9IHt9O1xuICAgIHZhciBkb21haW5NYXRjaENhdENvdW50ID0ge307XG4gICAgLy8gd2UgcHJlcGFyZSB0aGUgZm9sbG93aW5nIHN0cnVjdHVyZVxuICAgIC8vXG4gICAgLy8ge2RvbWFpbn0gOiByZWNvcmRjb3VudDtcbiAgICAvLyB7bWF0Y2hlZHdvcmRzfSA6XG4gICAgLy8ge2RvbWFpbn0ge21hdGNoZWR3b3JkfSB7Y2F0ZWdvcnl9IHByZXNlbmNlY291bnRcbiAgICB0aGVNb2RlbC5yZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICBpZiAoIWZpbHRlcmRvbWFpbiB8fCByZWNvcmQuX2RvbWFpbiA9PT0gZmlsdGVyZG9tYWluKSB7XG4gICAgICAgICAgICBkb21haW5SZWNvcmRDb3VudFtyZWNvcmQuX2RvbWFpbl0gPSAoZG9tYWluUmVjb3JkQ291bnRbcmVjb3JkLl9kb21haW5dIHx8IDApICsgMTtcbiAgICAgICAgICAgIG1hdGNoZWR3b3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChtYXRjaGVkd29yZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYXRlZ29yaWVzLmZvckVhY2goZnVuY3Rpb24gKGNhdGVnb3J5KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWNvcmRbY2F0ZWdvcnldID09PSBtYXRjaGVkd29yZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1kID0gZG9tYWluTWF0Y2hDYXRDb3VudFtyZWNvcmQuX2RvbWFpbl0gPSBkb21haW5NYXRjaENhdENvdW50W3JlY29yZC5fZG9tYWluXSB8fCB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtZGMgPSBtZFttYXRjaGVkd29yZF0gPSBtZFttYXRjaGVkd29yZF0gfHwge307XG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNyZW1lbnQobWRjLCBjYXRlZ29yeSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkb21haW5NYXRjaENhdENvdW50LCB1bmRlZmluZWQsIDIpKTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkb21haW5SZWNvcmRDb3VudCwgdW5kZWZpbmVkLCAyKSk7XG4gICAgdmFyIGRvbWFpbnMgPSBzb3J0ZWRLZXlzKGRvbWFpbk1hdGNoQ2F0Q291bnQpO1xuICAgIHZhciByZXNOZXh0ID0gJ1wiJyArIGZhY3QgKyAnXCIgaGFzIGEgbWVhbmluZyBpbiAnO1xuICAgIHZhciBzaW5nbGUgPSBmYWxzZTtcbiAgICBpZiAoT2JqZWN0LmtleXMoZG9tYWluTWF0Y2hDYXRDb3VudCkubGVuZ3RoID4gMSkge1xuICAgICAgICByZXNOZXh0ICs9ICcnICsgZG9tYWlucy5sZW5ndGggK1xuICAgICAgICAgICAgJyBkb21haW5zOiAnICsgVXRpbHMubGlzdFRvUXVvdGVkQ29tbWFBbmQoZG9tYWlucykgKyBcIlwiO1xuICAgIH1cbiAgICBlbHNlIGlmIChkb21haW5zLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBpZiAoIWZpbHRlcmRvbWFpbikge1xuICAgICAgICAgICAgcmVzTmV4dCArPSBcIm9uZSBcIjtcbiAgICAgICAgfVxuICAgICAgICByZXNOZXh0ICs9IFwiZG9tYWluIFxcXCJcIiArIGRvbWFpbnNbMF0gKyBcIlxcXCI6XCI7XG4gICAgICAgIHNpbmdsZSA9IHRydWU7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBpZiAocmVzKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChmaWx0ZXJkb21haW4pIHtcbiAgICAgICAgICAgIHJldHVybiBcIlxcXCJcIiArIGZhY3QgKyBcIlxcXCIgaXMgbm8ga25vd24gZmFjdCBpbiBkb21haW4gXFxcIlwiICsgZmlsdGVyZG9tYWluICsgXCJcXFwiLlxcblwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBcIlxcXCJcIiArIGZhY3QgKyBcIlxcXCIgaXMgbm8ga25vd24gZmFjdC5cXG5cIjtcbiAgICB9XG4gICAgcmVzICs9IHJlc05leHQgKyBcIlxcblwiOyAvLyAuLi5cXG5cIjtcbiAgICBkb21haW5zLmZvckVhY2goZnVuY3Rpb24gKGRvbWFpbikge1xuICAgICAgICB2YXIgbWQgPSBkb21haW5NYXRjaENhdENvdW50W2RvbWFpbl07XG4gICAgICAgIE9iamVjdC5rZXlzKG1kKS5mb3JFYWNoKGZ1bmN0aW9uIChtYXRjaGVkc3RyaW5nKSB7XG4gICAgICAgICAgICB2YXIgbWRjID0gbWRbbWF0Y2hlZHN0cmluZ107XG4gICAgICAgICAgICBpZiAoIXNpbmdsZSkge1xuICAgICAgICAgICAgICAgIHJlcyArPSAnaW4gZG9tYWluIFwiJyArIGRvbWFpbiArICdcIiAnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGNhdHNpbmdsZSA9IE9iamVjdC5rZXlzKG1kYykubGVuZ3RoID09PSAxO1xuICAgICAgICAgICAgcmVzICs9IHNsb3BweU9yRXhhY3QobWF0Y2hlZHN0cmluZywgZmFjdCwgdGhlTW9kZWwpICsgXCIgXCI7XG4gICAgICAgICAgICBpZiAoIWNhdHNpbmdsZSkge1xuICAgICAgICAgICAgICAgIHJlcyArPSBcIi4uLlxcblwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgT2JqZWN0LmtleXMobWRjKS5mb3JFYWNoKGZ1bmN0aW9uIChjYXRlZ29yeSkge1xuICAgICAgICAgICAgICAgIHZhciBwZXJjZW50ID0gdG9QZXJjZW50KG1kY1tjYXRlZ29yeV0sIGRvbWFpblJlY29yZENvdW50W2RvbWFpbl0pO1xuICAgICAgICAgICAgICAgIHJlcyArPSBcImlzIGEgdmFsdWUgZm9yIGNhdGVnb3J5IFxcXCJcIiArIGNhdGVnb3J5ICsgXCJcXFwiIHByZXNlbnQgaW4gXCIgKyBtZGNbY2F0ZWdvcnldICsgXCIoXCIgKyBwZXJjZW50ICsgXCIlKSBvZiByZWNvcmRzO1xcblwiO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmRlc2NyaWJlRmFjdEluRG9tYWluID0gZGVzY3JpYmVGYWN0SW5Eb21haW47XG5mdW5jdGlvbiBkZXNjcmliZUNhdGVnb3J5KGNhdGVnb3J5LCBmaWx0ZXJEb21haW4sIG1vZGVsLCBtZXNzYWdlKSB7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIHZhciBkb21zID0gTW9kZWwuZ2V0RG9tYWluc0ZvckNhdGVnb3J5KG1vZGVsLCBjYXRlZ29yeSk7XG4gICAgaWYgKGZpbHRlckRvbWFpbikge1xuICAgICAgICBpZiAoZG9tcy5pbmRleE9mKGZpbHRlckRvbWFpbikgPj0gMCkge1xuICAgICAgICAgICAgcmVzLnB1c2goZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluKGNhdGVnb3J5LCBmaWx0ZXJEb21haW4sIG1vZGVsKSk7XG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG4gICAgfVxuICAgIGRvbXMuc29ydCgpO1xuICAgIGRvbXMuZm9yRWFjaChmdW5jdGlvbiAoZG9tYWluKSB7XG4gICAgICAgIHJlcy5wdXNoKGRlc2NyaWJlQ2F0ZWdvcnlJbkRvbWFpbihjYXRlZ29yeSwgZG9tYWluLCBtb2RlbCkpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmRlc2NyaWJlQ2F0ZWdvcnkgPSBkZXNjcmliZUNhdGVnb3J5O1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
