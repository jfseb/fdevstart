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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9kZXNjcmliZS50cyIsIm1hdGNoL2Rlc2NyaWJlLmpzIl0sIm5hbWVzIjpbIkFsZ29sIiwicmVxdWlyZSIsImRlYnVnIiwiZGVidWdsb2ciLCJsb2dnZXIiLCJsb2dQZXJmIiwicGVyZiIsInBlcmZsb2ciLCJXb3JkIiwiV2hhdElzIiwiTW9kZWwiLCJVdGlscyIsInNXb3JkcyIsImlzU3lub255bUZvciIsImV4YWN0V29yZCIsInNsb3BweVdvcmQiLCJ0aGVNb2RlbCIsImV4cG9ydHMiLCJzbG9wcHlPckV4YWN0IiwidG9Mb3dlckNhc2UiLCJjb3VudFJlY29yZFByZXNlbmNlIiwiY2F0ZWdvcnkiLCJkb21haW4iLCJyZXMiLCJ0b3RhbHJlY29yZHMiLCJwcmVzZW50cmVjb3JkcyIsInZhbHVlcyIsIm11bHRpdmFsdWVkIiwicmVjb3JkcyIsImZvckVhY2giLCJyZWNvcmQiLCJfZG9tYWluIiwidmFsIiwidmFsYXJyIiwiQXJyYXkiLCJpc0FycmF5IiwidW5kZWZpbmVkIiwiY291bnRSZWNvcmRQcmVzZW5jZUZhY3QiLCJmYWN0IiwiaW5kZXhPZiIsIm1ha2VWYWx1ZXNMaXN0U3RyaW5nIiwicmVhbHZhbHVlcyIsInZhbHVlc1N0cmluZyIsInRvdGFsbGVuIiwibGlzdFZhbHVlcyIsImZpbHRlciIsImluZGV4IiwibGVuZ3RoIiwiRGVzY3JpYmVWYWx1ZUxpc3RNaW5Db3VudFZhbHVlTGlzdCIsIkRlc2NyaWJlVmFsdWVMaXN0TGVuZ3RoQ2hhckxpbWl0IiwibWF4bGVuIiwicmVkdWNlIiwicHJldiIsIk1hdGgiLCJtYXgiLCJsaXN0IiwibGlzdFRvUXVvdGVkQ29tbWFPciIsImpvaW4iLCJ0b1BlcmNlbnQiLCJhIiwiYiIsInRvRml4ZWQiLCJnZXRDYXRlZ29yeVN0YXRzSW5Eb21haW4iLCJmaWx0ZXJkb21haW4iLCJyZWNvcmRDb3VudCIsIkpTT04iLCJzdHJpbmdpZnkiLCJwZXJjZW50IiwiYWxsVmFsdWVzIiwiT2JqZWN0Iiwia2V5cyIsInZhbHVlIiwic29ydCIsInVuZGVmTmFEZWx0YSIsImRlbHRhIiwiZGlzdGluY3QiLCJ2YWx1ZXNMaXN0IiwiY2F0ZWdvcnlEZXNjIiwiZnVsbCIsImNhdGVnb3JpZXMiLCJwcmVzZW50UmVjb3JkcyIsInBlcmNQcmVzZW50Iiwic2FtcGxlVmFsdWVzIiwiZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluIiwic3RhdHMiLCJkZXNjIiwiZGVzY3JpcHRpb24iLCJmaW5kUmVjb3Jkc1dpdGhGYWN0IiwibWF0Y2hlZFN0cmluZyIsImRvbWFpbnMiLCJpbmNyZW1lbnQiLCJtYXAiLCJrZXkiLCJzb3J0ZWRLZXlzIiwiciIsImRlc2NyaWJlRG9tYWluIiwiY291bnQiLCJjYXRjb3VudCIsImdldENhdGVnb3JpZXNGb3JEb21haW4iLCJkZXNjcmliZUZhY3RJbkRvbWFpbiIsInNlbnRlbmNlcyIsImFuYWx5emVDb250ZXh0U3RyaW5nIiwicnVsZXMiLCJsZW5ndGhPbmVTZW50ZW5jZXMiLCJvU2VudGVuY2UiLCJvbmx5RmFjdHMiLCJpc0RvbWFpbiIsImlzRmlsbGVyIiwiaXNDYXRlZ29yeSIsIm9ubHlEb21haW5zIiwic2VudGVuY2UiLCJyZWNvcmRNYXAiLCJkb21haW5zTWFwIiwibWF0Y2hlZHdvcmRNYXAiLCJtYXRjaGVkQ2F0ZWdvcnlNYXAiLCJvV29yZCIsIm1hdGNoZWR3b3JkcyIsImRvbWFpblJlY29yZENvdW50IiwiZG9tYWluTWF0Y2hDYXRDb3VudCIsIm1hdGNoZWR3b3JkIiwibWQiLCJtZGMiLCJyZXNOZXh0Iiwic2luZ2xlIiwibGlzdFRvUXVvdGVkQ29tbWFBbmQiLCJtYXRjaGVkc3RyaW5nIiwiY2F0c2luZ2xlIiwiZGVzY3JpYmVDYXRlZ29yeSIsImZpbHRlckRvbWFpbiIsIm1vZGVsIiwibWVzc2FnZSIsImRvbXMiLCJnZXREb21haW5zRm9yQ2F0ZWdvcnkiLCJwdXNoIl0sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7QUNRQTs7QURHQSxJQUFZQSxRQUFLQyxRQUFNLFNBQU4sQ0FB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LCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5leHBsYWluXG4gKiBAZmlsZSBleHBsYWluLnRzXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXG4gKlxuICogRnVuY3Rpb25zIGRlYWxpbmcgd2l0aCBleHBsYWluaW5nIGZhY3RzLCBjYXRlZ29yaWVzIGV0Yy5cbiAqL1xuXG5cbmltcG9ydCAqIGFzIElucHV0RmlsdGVyIGZyb20gJy4vaW5wdXRGaWx0ZXInO1xuaW1wb3J0ICogYXMgQWxnb2wgZnJvbSAnLi9hbGdvbCc7XG5pbXBvcnQgKiBhcyBkZWJ1ZyBmcm9tICdkZWJ1Zyc7XG5cbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ2Rlc2NyaWJlJyk7XG5pbXBvcnQgKiBhcyBsb2dnZXIgZnJvbSAnLi4vdXRpbHMvbG9nZ2VyJztcbnZhciBsb2dQZXJmID0gbG9nZ2VyLnBlcmYoXCJwZXJmbGlzdGFsbFwiKTtcbnZhciBwZXJmbG9nID0gZGVidWcoJ3BlcmYnKTtcbi8vY29uc3QgcGVyZmxvZyA9IGxvZ2dlci5wZXJmKFwicGVyZmxpc3RhbGxcIik7XG5cbmltcG9ydCAqIGFzIElNYXRjaCBmcm9tICcuL2lmbWF0Y2gnO1xuXG5pbXBvcnQgKiBhcyBUb29sbWF0Y2hlciBmcm9tICcuL3Rvb2xtYXRjaGVyJztcbmltcG9ydCAqIGFzIEJyZWFrRG93biBmcm9tICcuL2JyZWFrZG93bic7XG5cbmltcG9ydCAqIGFzIFNlbnRlbmNlIGZyb20gJy4vc2VudGVuY2UnO1xuXG5pbXBvcnQgKiBhcyBXb3JkIGZyb20gJy4vd29yZCc7XG5pbXBvcnQgKiBhcyBPcGVyYXRvciBmcm9tICcuL29wZXJhdG9yJztcblxuaW1wb3J0ICogYXMgV2hhdElzIGZyb20gJy4vd2hhdGlzJztcblxuaW1wb3J0ICogYXMgTW9kZWwgZnJvbSAnLi4vbW9kZWwvbW9kZWwnO1xuaW1wb3J0ICogYXMgTWF0Y2ggZnJvbSAnLi9tYXRjaCc7XG5cblxuaW1wb3J0ICogYXMgVXRpbHMgZnJvbSAnLi4vdXRpbHMvdXRpbHMnO1xuXG5cbnZhciBzV29yZHMgPSB7fTtcblxuZXhwb3J0IGZ1bmN0aW9uIGlzU3lub255bUZvcihleGFjdFdvcmQgOiBzdHJpbmcsIHNsb3BweVdvcmQgOiBzdHJpbmcsIHRoZU1vZGVsOiBJTWF0Y2guSU1vZGVscykgOiBib29sZWFuIHtcbiAgLy8gVE9ETzogdXNlIG1vZGVsIHN5bm9ueW1zXG4gIHJldHVybiBzbG9wcHlXb3JkID09PSBcIm5hbWVcIiAmJiBleGFjdFdvcmQgPT09IFwiZWxlbWVudCBuYW1lXCI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzbG9wcHlPckV4YWN0KGV4YWN0V29yZCA6IHN0cmluZywgc2xvcHB5V29yZCA6IHN0cmluZywgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzKSB7XG4gIGlmKGV4YWN0V29yZC50b0xvd2VyQ2FzZSgpID09PSBzbG9wcHlXb3JkLnRvTG93ZXJDYXNlKCkpIHtcbiAgICByZXR1cm4gJ1wiJyArIHNsb3BweVdvcmQgKyAnXCInO1xuICB9XG4gIC8vIFRPRE8sIGZpbmQgcGx1cmFsIHMgZXRjLlxuICAvLyBzdGlsbCBleGFjdCxcbiAgLy9cbiAgaWYoaXNTeW5vbnltRm9yKGV4YWN0V29yZCxzbG9wcHlXb3JkLHRoZU1vZGVsKSkge1xucmV0dXJuICdcIicgKyBzbG9wcHlXb3JkICsgJ1wiIChpbnRlcnByZXRlZCBhcyBzeW5vbnltIGZvciBcIicgKyBleGFjdFdvcmQgKydcIiknO1xuICB9XG4gIC8vdG9kbywgZmluZCBpcyBzeW5vbnltZm9yIC4uLlxuICAvLyBUT0RPLCBhIHN5bm9ueW0gZm9yIC4uLlxuICByZXR1cm4gJ1wiJyArIHNsb3BweVdvcmQgKyAnXCIgKGludGVycHJldGVkIGFzIFwiJyArIGV4YWN0V29yZCArJ1wiKSc7XG59XG5cbmludGVyZmFjZSBJRGVzY3JpYmVDYXRlZ29yeSB7XG4gICAgdG90YWxyZWNvcmRzIDogbnVtYmVyLFxuICAgIHByZXNlbnRyZWNvcmRzIDogbnVtYmVyLFxuICAgIHZhbHVlcyA6IHsgW2tleSA6IHN0cmluZ10gOiBudW1iZXJ9LFxuICAgIG11bHRpdmFsdWVkIDogYm9vbGVhblxuICB9XG5cbmV4cG9ydCBmdW5jdGlvbiBjb3VudFJlY29yZFByZXNlbmNlKGNhdGVnb3J5IDogc3RyaW5nLCBkb21haW4gOiBzdHJpbmcsIHRoZU1vZGVsIDogSU1hdGNoLklNb2RlbHMpIDogSURlc2NyaWJlQ2F0ZWdvcnkge1xuICB2YXIgcmVzID0geyB0b3RhbHJlY29yZHMgOiAwLFxuICAgIHByZXNlbnRyZWNvcmRzIDogMCxcbiAgICB2YWx1ZXMgOiB7IH0sICAvLyBhbiB0aGVpciBmcmVxdWVuY3lcbiAgICBtdWx0aXZhbHVlZCA6IGZhbHNlXG4gIH0gYXMgSURlc2NyaWJlQ2F0ZWdvcnk7XG4gIHRoZU1vZGVsLnJlY29yZHMuZm9yRWFjaChmdW5jdGlvbihyZWNvcmQpIHtcbiAgICAvL2RlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZCx1bmRlZmluZWQsMikpO1xuICAgIGlmKHJlY29yZC5fZG9tYWluICE9PSBkb21haW4pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmVzLnRvdGFscmVjb3JkcysrO1xuICAgIHZhciB2YWwgPSByZWNvcmRbY2F0ZWdvcnldO1xuICAgIHZhciB2YWxhcnIgPSBbdmFsXTtcbiAgICBpZihBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICAgIHJlcy5tdWx0aXZhbHVlZCA9IHRydWU7XG4gICAgICB2YWxhcnIgPSB2YWw7XG4gICAgfVxuICAgIC8vIHRvZG8gd3JhcCBhcnJcbiAgICBpZih2YWwgIT09IHVuZGVmaW5lZCAmJiB2YWwgIT09IFwibi9hXCIpIHtcbiAgICAgIHJlcy5wcmVzZW50cmVjb3JkcyArKztcbiAgICB9XG4gICAgdmFsYXJyLmZvckVhY2goZnVuY3Rpb24odmFsKSB7XG4gICAgICByZXMudmFsdWVzW3ZhbF0gPSAocmVzLnZhbHVlc1t2YWxdIHx8IDApICsgMTtcbiAgICB9KVxuICB9KVxuICByZXR1cm4gcmVzO1xufVxuXG4vLyBjYXRlZ29yeSA9PiBtYXRjaGVkd29yZHNbXTtcblxuaW50ZXJmYWNlIElEZXNjcmliZUZhY3Qge1xuICAgIHRvdGFscmVjb3JkcyA6IG51bWJlcixcbiAgICBwcmVzZW50cmVjb3JkcyA6IG51bWJlcixcbiAgICBtdWx0aXZhbHVlZCA6IGJvb2xlYW5cbiAgfVxuXG5leHBvcnQgZnVuY3Rpb24gY291bnRSZWNvcmRQcmVzZW5jZUZhY3QoZmFjdCA6IHN0cmluZywgY2F0ZWdvcnkgOiBzdHJpbmcsIGRvbWFpbiA6IHN0cmluZywgdGhlTW9kZWwgOiBJTWF0Y2guSU1vZGVscykgOiBJRGVzY3JpYmVGYWN0IHtcbiAgdmFyIHJlcyA9IHsgdG90YWxyZWNvcmRzIDogMCxcbiAgICBwcmVzZW50cmVjb3JkcyA6IDAsXG4gICAgdmFsdWVzIDogeyB9LCAgLy8gYW4gdGhlaXIgZnJlcXVlbmN5XG4gICAgbXVsdGl2YWx1ZWQgOiBmYWxzZVxuICB9IGFzIElEZXNjcmliZUNhdGVnb3J5O1xuICB0aGVNb2RlbC5yZWNvcmRzLmZvckVhY2goZnVuY3Rpb24ocmVjb3JkKSB7XG4gICAgLy9kZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmQsdW5kZWZpbmVkLDIpKTtcbiAgICBpZihyZWNvcmQuX2RvbWFpbiAhPT0gZG9tYWluKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJlcy50b3RhbHJlY29yZHMrKztcbiAgICB2YXIgdmFsID0gcmVjb3JkW2NhdGVnb3J5XTtcbiAgICB2YXIgdmFsYXJyID0gW3ZhbF07XG4gICAgaWYoQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgICBpZih2YWwuaW5kZXhPZihmYWN0KSA+PSAwKSB7XG4gICAgICAgIHJlcy5tdWx0aXZhbHVlZCA9IHRydWU7XG4gICAgICAgIHZhbGFyciA9IHZhbDtcbiAgICAgICAgcmVzLnByZXNlbnRyZWNvcmRzKys7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh2YWwgPT09IGZhY3QpIHtcbiAgICAgICAgcmVzLnByZXNlbnRyZWNvcmRzKys7XG4gICAgfVxuICB9KVxuICByZXR1cm4gcmVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFrZVZhbHVlc0xpc3RTdHJpbmcocmVhbHZhbHVlczogc3RyaW5nW10pIDogc3RyaW5nIHtcbiAgdmFyIHZhbHVlc1N0cmluZyA9IFwiXCI7XG4gIHZhciB0b3RhbGxlbiA9IDA7XG4gIHZhciBsaXN0VmFsdWVzID0gcmVhbHZhbHVlcy5maWx0ZXIoZnVuY3Rpb24odmFsLCBpbmRleCkge1xuICAgIHRvdGFsbGVuID0gdG90YWxsZW4gKyB2YWwubGVuZ3RoO1xuICByZXR1cm4gKGluZGV4IDwgQWxnb2wuRGVzY3JpYmVWYWx1ZUxpc3RNaW5Db3VudFZhbHVlTGlzdCkgfHwgKHRvdGFsbGVuIDwgQWxnb2wuRGVzY3JpYmVWYWx1ZUxpc3RMZW5ndGhDaGFyTGltaXQpO1xuICB9KTtcbiAgaWYobGlzdFZhbHVlcy5sZW5ndGggPT09IDEgJiYgcmVhbHZhbHVlcy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gJ1RoZSBzb2xlIHZhbHVlIGlzIFxcXCInICsgbGlzdFZhbHVlc1swXSArICdcIic7XG4gIH1cbiAgdmFyIG1heGxlbiA9IGxpc3RWYWx1ZXMucmVkdWNlKCAocHJldix2YWwpID0+IE1hdGgubWF4KHByZXYsdmFsLmxlbmd0aCksMCk7XG4gIGlmKG1heGxlbiA+IDMwKSB7XG4gICAgcmV0dXJuIFwiUG9zc2libGUgdmFsdWVzIGFyZSAuLi5cXG5cIiArXG4gICAgICBsaXN0VmFsdWVzLnJlZHVjZSggKHByZXYsdmFsLGluZGV4KSA9PiAocHJldiArIFwiKFwiICsgKGluZGV4ICsgMSkgKyAnKTogXCInICsgdmFsICsgJ1wiXFxuJ1xuICAgICAgKSxcIlwiKVxuICAgICAgKyAoIGxpc3RWYWx1ZXMubGVuZ3RoID09PSByZWFsdmFsdWVzLmxlbmd0aCA/IFwiXCIgOiBcIi4uLlwiKTtcbiAgfVxuICB2YXIgbGlzdCA9IFwiXCI7XG4gIGlmKGxpc3RWYWx1ZXMubGVuZ3RoID09PSByZWFsdmFsdWVzLmxlbmd0aCkge1xuICAgIGxpc3QgPSBVdGlscy5saXN0VG9RdW90ZWRDb21tYU9yKGxpc3RWYWx1ZXMpO1xuICB9IGVsc2Uge1xuICAgIGxpc3QgPSAnXCInICsgbGlzdFZhbHVlcy5qb2luKCdcIiwgXCInKSArICdcIic7XG4gIH1cbiAgcmV0dXJuIFwiUG9zc2libGUgdmFsdWVzIGFyZSAuLi5cXG5cIlxuICAgICsgbGlzdFxuICAgICsgKCBsaXN0VmFsdWVzLmxlbmd0aCA9PT0gcmVhbHZhbHVlcy5sZW5ndGggPyBcIlwiIDogXCIgLi4uXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9QZXJjZW50KGEgOiBudW1iZXIsIGI6IG51bWJlcikgOiBzdHJpbmcge1xuICByZXR1cm4gXCJcIiArICgxMDAqIGEgLyBiKS50b0ZpeGVkKDEpO1xufVxuXG5cbmV4cG9ydCBpbnRlcmZhY2UgSUNhdGVnb3J5U3RhdHMge1xuICBjYXRlZ29yeURlc2MgOiBJTWF0Y2guSUNhdGVnb3J5RGVzYyxcbiAgcHJlc2VudFJlY29yZHMgOiBudW1iZXIsXG4gIGRpc3RpbmN0IDogc3RyaW5nLFxuICBkZWx0YSA6IHN0cmluZyxcbiAgcGVyY1ByZXNlbnQgOiBzdHJpbmcsXG4gIHNhbXBsZVZhbHVlcyA6IHN0cmluZyxcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDYXRlZ29yeVN0YXRzSW5Eb21haW4oY2F0ZWdvcnkgOiBzdHJpbmcsIGZpbHRlcmRvbWFpbiA6IHN0cmluZywgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzKSA6IElDYXRlZ29yeVN0YXRzIHtcbiAgY29uc3QgcmVjb3JkQ291bnQgPSBjb3VudFJlY29yZFByZXNlbmNlKGNhdGVnb3J5LCBmaWx0ZXJkb21haW4sIHRoZU1vZGVsKTtcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkodGhlTW9kZWwucmVjb3Jkcy5maWx0ZXIoYSA9PiBhLl9kb21haW4gPT09IFwiQ29zbW9zXCIpLHVuZGVmaW5lZCwyKSk7XG4gIGNvbnN0IHBlcmNlbnQgPSB0b1BlcmNlbnQocmVjb3JkQ291bnQucHJlc2VudHJlY29yZHMgLCByZWNvcmRDb3VudC50b3RhbHJlY29yZHMpO1xuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRDb3VudC52YWx1ZXMpKTtcbiAgdmFyIGFsbFZhbHVlcyA9T2JqZWN0LmtleXMocmVjb3JkQ291bnQudmFsdWVzKTtcbiAgdmFyIHJlYWx2YWx1ZXMgPSBhbGxWYWx1ZXMuZmlsdGVyKHZhbHVlID0+ICh2YWx1ZSAhPT0gJ3VuZGVmaW5lZCcpICYmICh2YWx1ZSAhPT0gJ24vYScpKTtcbiAgZGVidWdsb2dcbiAgcmVhbHZhbHVlcy5zb3J0KCk7XG4gIHZhciB1bmRlZk5hRGVsdGEgPSAgKGFsbFZhbHVlcy5sZW5ndGggLSByZWFsdmFsdWVzLmxlbmd0aCk7XG4gIHZhciBkZWx0YSA9ICAodW5kZWZOYURlbHRhKSA/ICBcIigrXCIgKyB1bmRlZk5hRGVsdGEgKyBcIilcIiA6IFwiXCI7XG4gIGNvbnN0IGRpc3RpbmN0ID0gJycgKyByZWFsdmFsdWVzLmxlbmd0aDtcbiAgY29uc3QgdmFsdWVzTGlzdCA9IG1ha2VWYWx1ZXNMaXN0U3RyaW5nKHJlYWx2YWx1ZXMpO1xuICByZXR1cm4ge1xuICAgIGNhdGVnb3J5RGVzYyA6IHRoZU1vZGVsLmZ1bGwuZG9tYWluW2ZpbHRlcmRvbWFpbl0uY2F0ZWdvcmllc1tjYXRlZ29yeV0sXG4gICAgZGlzdGluY3QgOiBkaXN0aW5jdCxcbiAgICBkZWx0YSA6IGRlbHRhLFxuICAgIHByZXNlbnRSZWNvcmRzIDogcmVjb3JkQ291bnQucHJlc2VudHJlY29yZHMsXG4gICAgcGVyY1ByZXNlbnQgOiBwZXJjZW50LFxuICAgIHNhbXBsZVZhbHVlcyA6IHZhbHVlc0xpc3RcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluKGNhdGVnb3J5IDogc3RyaW5nLCBmaWx0ZXJkb21haW4gOiBzdHJpbmcsIHRoZU1vZGVsOiBJTWF0Y2guSU1vZGVscykgOiBzdHJpbmcge1xuLyogIGNvbnN0IHJlY29yZENvdW50ID0gY291bnRSZWNvcmRQcmVzZW5jZShjYXRlZ29yeSwgZmlsdGVyZG9tYWluLCB0aGVNb2RlbCk7XG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHRoZU1vZGVsLnJlY29yZHMuZmlsdGVyKGEgPT4gYS5fZG9tYWluID09PSBcIkNvc21vc1wiKSx1bmRlZmluZWQsMikpO1xuICBjb25zdCBwZXJjZW50ID0gdG9QZXJjZW50KHJlY29yZENvdW50LnByZXNlbnRyZWNvcmRzICwgcmVjb3JkQ291bnQudG90YWxyZWNvcmRzKTtcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkQ291bnQudmFsdWVzKSk7XG4gIHZhciBhbGxWYWx1ZXMgPU9iamVjdC5rZXlzKHJlY29yZENvdW50LnZhbHVlcyk7XG4gIHZhciByZWFsdmFsdWVzID0gYWxsVmFsdWVzLmZpbHRlcih2YWx1ZSA9PiAodmFsdWUgIT09ICd1bmRlZmluZWQnKSAmJiAodmFsdWUgIT09ICduL2EnKSk7XG4gIGRlYnVnbG9nXG4gIHJlYWx2YWx1ZXMuc29ydCgpO1xuICB2YXIgdW5kZWZOYURlbHRhID0gIChhbGxWYWx1ZXMubGVuZ3RoIC0gcmVhbHZhbHVlcy5sZW5ndGgpO1xuICB2YXIgZGVsdGEgPSAgKHVuZGVmTmFEZWx0YSkgPyAgXCIoK1wiICsgdW5kZWZOYURlbHRhICsgXCIpXCIgOiBcIlwiO1xuICBjb25zdCBkaXN0aW5jdCA9ICcnICsgcmVhbHZhbHVlcy5sZW5ndGg7XG5cbiAgY29uc3QgdmFsdWVzTGlzdCA9IG1ha2VWYWx1ZXNMaXN0U3RyaW5nKHJlYWx2YWx1ZXMpO1xuKi9cbiAgdmFyIHN0YXRzID0gZ2V0Q2F0ZWdvcnlTdGF0c0luRG9tYWluKGNhdGVnb3J5LGZpbHRlcmRvbWFpbix0aGVNb2RlbCk7XG5cbiAgdmFyIHJlcyA9ICdpcyBhIGNhdGVnb3J5IGluIGRvbWFpbiBcIicgKyBmaWx0ZXJkb21haW4gKyAnXCJcXG4nXG4gICsgYEl0IGlzIHByZXNlbnQgaW4gJHtzdGF0cy5wcmVzZW50UmVjb3Jkc30gKCR7c3RhdHMucGVyY1ByZXNlbnR9JSkgb2YgcmVjb3JkcyBpbiB0aGlzIGRvbWFpbixcXG5gICtcbiAgIGBoYXZpbmcgJHtzdGF0cy5kaXN0aW5jdCArICcnfSR7c3RhdHMuZGVsdGF9IGRpc3RpbmN0IHZhbHVlcy5cXG5gXG4gICsgc3RhdHMuc2FtcGxlVmFsdWVzO1xuXG4gIHZhciBkZXNjID0gdGhlTW9kZWwuZnVsbC5kb21haW5bZmlsdGVyZG9tYWluXS5jYXRlZ29yaWVzW2NhdGVnb3J5XSB8fCB7fSBhcyBJTWF0Y2guSUNhdGVnb3J5RGVzYztcbiAgdmFyIGRlc2NyaXB0aW9uID0gZGVzYy5kZXNjcmlwdGlvbiB8fCBcIlwiO1xuICBpZiAoZGVzY3JpcHRpb24pIHtcbiAgICByZXMgKz0gYFxcbkRlc2NyaXB0aW9uOiAke2Rlc2NyaXB0aW9ufWA7XG4gIH1cbiAgcmV0dXJuIHJlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRSZWNvcmRzV2l0aEZhY3QobWF0Y2hlZFN0cmluZzogc3RyaW5nLCBjYXRlZ29yeSA6IHN0cmluZywgcmVjb3JkcyA6IGFueSwgZG9tYWlucyA6IHsgW2tleSA6IHN0cmluZ10gOiBudW1iZXJ9KSA6IGFueVtdIHtcbiAgcmV0dXJuIHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uKHJlY29yZCkgIHtcblxuICAgIGxldCByZXMgPSAocmVjb3JkW2NhdGVnb3J5XSA9PT0gbWF0Y2hlZFN0cmluZyk7XG4gICAgaWYoIHJlcykge1xuICAgICAgaW5jcmVtZW50KGRvbWFpbnMscmVjb3Jkcy5fZG9tYWluKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbmNyZW1lbnQobWFwIDoge1trZXk6IHN0cmluZ10gOiBudW1iZXJ9LCBrZXkgOiBzdHJpbmcpIHtcbiAgbWFwW2tleV0gPSAobWFwW2tleV0gfHwgMCkgKyAxO1xufVxuXG5mdW5jdGlvbiBzb3J0ZWRLZXlzPFQ+KG1hcCA6IHtba2V5IDogc3RyaW5nXSA6IFR9KSA6IHN0cmluZ1tdIHtcbiAgdmFyIHIgPSBPYmplY3Qua2V5cyhtYXApO1xuICByLnNvcnQoKTtcbiAgcmV0dXJuIHI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXNjcmliZURvbWFpbihmYWN0IDogc3RyaW5nLCBkb21haW46IHN0cmluZywgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzKSA6IHN0cmluZyB7XG4gIHZhciBjb3VudCA9IHRoZU1vZGVsLnJlY29yZHMucmVkdWNlKGZ1bmN0aW9uKHByZXYsIHJlY29yZCkge1xuICAgIHJldHVybiBwcmV2ICsgKChyZWNvcmQuX2RvbWFpbiA9PT0gZG9tYWluKSA/IDEgOiAwKTtcbiAgfSwwKTtcbiAgdmFyIGNhdGNvdW50ID0gTW9kZWwuZ2V0Q2F0ZWdvcmllc0ZvckRvbWFpbih0aGVNb2RlbCwgZG9tYWluKS5sZW5ndGg7XG4gIHZhciByZXMgPSBzbG9wcHlPckV4YWN0KGRvbWFpbiwgZmFjdCwgdGhlTW9kZWwpICsgYGlzIGEgZG9tYWluIHdpdGggJHtjYXRjb3VudH0gY2F0ZWdvcmllcyBhbmQgJHtjb3VudH0gcmVjb3Jkc1xcbmA7XG4gIHZhciBkZXNjID0gdGhlTW9kZWwuZnVsbC5kb21haW5bZG9tYWluXS5kZXNjcmlwdGlvbiB8fCBcIlwiO1xuICBpZihkZXNjKSB7XG4gICAgcmVzICs9IGBEZXNjcmlwdGlvbjpgICsgZGVzYyArIGBcXG5gO1xuICB9XG4gIHJldHVybiByZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXNjcmliZUZhY3RJbkRvbWFpbihmYWN0IDogc3RyaW5nLCBmaWx0ZXJkb21haW4gOiBzdHJpbmcsIHRoZU1vZGVsOiBJTWF0Y2guSU1vZGVscykgOiBzdHJpbmcge1xuICB2YXIgc2VudGVuY2VzID0gV2hhdElzLmFuYWx5emVDb250ZXh0U3RyaW5nKGZhY3QsICB0aGVNb2RlbC5ydWxlcyk7XG4gIHZhciBsZW5ndGhPbmVTZW50ZW5jZXMgPSBzZW50ZW5jZXMuZmlsdGVyKG9TZW50ZW5jZSA9PiBvU2VudGVuY2UubGVuZ3RoID09PSAxKTtcbiAgdmFyIHJlcyA9ICcnO1xuICAvLyByZW1vdmUgY2F0ZWdvcmllcyBhbmQgZG9tYWluc1xuICB2YXIgb25seUZhY3RzID0gbGVuZ3RoT25lU2VudGVuY2VzLmZpbHRlcihvU2VudGVuY2UgPT57XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlWzBdKSk7XG4gICAgcmV0dXJuICFXb3JkLldvcmQuaXNEb21haW4ob1NlbnRlbmNlWzBdKSAmJlxuICAgICAgICAgICAhV29yZC5Xb3JkLmlzRmlsbGVyKG9TZW50ZW5jZVswXSkgJiYgIVdvcmQuV29yZC5pc0NhdGVnb3J5KG9TZW50ZW5jZVswXSlcbiAgfVxuICApO1xuICB2YXIgb25seURvbWFpbnMgPSBsZW5ndGhPbmVTZW50ZW5jZXMuZmlsdGVyKG9TZW50ZW5jZSA9PntcbiAgICByZXR1cm4gV29yZC5Xb3JkLmlzRG9tYWluKG9TZW50ZW5jZVswXSk7XG4gIH0pO1xuICBpZihvbmx5RG9tYWlucyAmJiBvbmx5RG9tYWlucy5sZW5ndGggPiAwKSB7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkob25seURvbWFpbnMpKTtcbiAgICBvbmx5RG9tYWlucy5mb3JFYWNoKGZ1bmN0aW9uKHNlbnRlbmNlKSB7XG4gICAgICB2YXIgZG9tYWluID0gc2VudGVuY2VbMF0ubWF0Y2hlZFN0cmluZztcbiAgICAgIGlmKCAhZmlsdGVyZG9tYWluIHx8IGRvbWFpbiA9PT0gZmlsdGVyZG9tYWluKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiaGVyZSBtYXRjaCBcIiArIEpTT04uc3RyaW5naWZ5KHNlbnRlbmNlKSk7XG4gICAgICAgIHJlcyArPSBkZXNjcmliZURvbWFpbihmYWN0LCBzZW50ZW5jZVswXS5tYXRjaGVkU3RyaW5nLCB0aGVNb2RlbCk7XG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIGRlYnVnbG9nKFwib25seSBmYWN0czogXCIgKyBKU09OLnN0cmluZ2lmeShvbmx5RmFjdHMpKTtcbiAgdmFyIHJlY29yZE1hcCA9IHt9O1xuICB2YXIgZG9tYWluc01hcCA9IHt9IGFzIHtba2V5OiBzdHJpbmddIDogbnVtYmVyfTtcbiAgdmFyIG1hdGNoZWR3b3JkTWFwID0ge30gYXMge1trZXk6IHN0cmluZ10gOiBudW1iZXJ9O1xuICB2YXIgbWF0Y2hlZENhdGVnb3J5TWFwID0ge30gYXMge1trZXk6IHN0cmluZ10gOiBudW1iZXJ9O1xuICAvLyBsb29rIGZvciBhbGwgcmVjb3Jkc1xuICBvbmx5RmFjdHMuZm9yRWFjaChvU2VudGVuY2UgPT5cbiAgICBvU2VudGVuY2UuZm9yRWFjaChvV29yZCA9PlxuICAgICAge1xuICAgICAgICBpbmNyZW1lbnQobWF0Y2hlZHdvcmRNYXAsIG9Xb3JkLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICBpbmNyZW1lbnQobWF0Y2hlZENhdGVnb3J5TWFwLCBvV29yZC5jYXRlZ29yeSk7XG4gICAgICB9XG4gICAgKVxuICApO1xuICAvLyB3ZSBoYXZlOlxuICAvLyBhIGxpc3Qgb2YgY2F0ZWdvcmllcyxcbiAgLy8gYSBsaXN0IG9mIG1hdGNoZWRXb3JkcyAgLT5cbiAgLy9cblxuICB2YXIgY2F0ZWdvcmllcyA9IHNvcnRlZEtleXMobWF0Y2hlZENhdGVnb3J5TWFwKTtcbiAgdmFyIG1hdGNoZWR3b3JkcyA9IHNvcnRlZEtleXMobWF0Y2hlZHdvcmRNYXApO1xuICBkZWJ1Z2xvZyhcIm1hdGNoZWR3b3JkczogXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkd29yZHMpKTtcbiAgZGVidWdsb2coXCJjYXRlZ29yaWVzOiBcIiArIEpTT04uc3RyaW5naWZ5KGNhdGVnb3JpZXMpKTtcblxuICAvL3ZhciBhbGxNYXRjaGVkV29yZHMgPSB7IFtrZXkgOiBzdHJpbmddIDogbnVtYmVyIH07XG4gIHZhciBkb21haW5SZWNvcmRDb3VudCA9IHt9IGFzIHtba2V5OiBzdHJpbmddIDogbnVtYmVyfTtcbiAgdmFyIGRvbWFpbk1hdGNoQ2F0Q291bnQgPSB7fSBhcyB7W2tleTogc3RyaW5nXSA6XG4gICAgICAge1trZXk6IHN0cmluZ10gOlxuICAgICB7W2tleTogc3RyaW5nXSA6IG51bWJlcn19fTtcbiAgLy8gd2UgcHJlcGFyZSB0aGUgZm9sbG93aW5nIHN0cnVjdHVyZVxuICAvL1xuICAvLyB7ZG9tYWlufSA6IHJlY29yZGNvdW50O1xuICAvLyB7bWF0Y2hlZHdvcmRzfSA6XG4gIC8vIHtkb21haW59IHttYXRjaGVkd29yZH0ge2NhdGVnb3J5fSBwcmVzZW5jZWNvdW50XG4gIHRoZU1vZGVsLnJlY29yZHMuZm9yRWFjaChmdW5jdGlvbihyZWNvcmQpIHtcbiAgICBpZighZmlsdGVyZG9tYWluIHx8IHJlY29yZC5fZG9tYWluID09PSBmaWx0ZXJkb21haW4gKSB7XG4gICAgICBkb21haW5SZWNvcmRDb3VudFtyZWNvcmQuX2RvbWFpbl0gPSAoZG9tYWluUmVjb3JkQ291bnRbcmVjb3JkLl9kb21haW5dIHx8IDApICsgMTtcbiAgICAgIG1hdGNoZWR3b3Jkcy5mb3JFYWNoKG1hdGNoZWR3b3JkID0+XG4gICAgICAgIGNhdGVnb3JpZXMuZm9yRWFjaChjYXRlZ29yeSA9PiB7XG4gICAgICAgICAgaWYoIHJlY29yZFtjYXRlZ29yeV0gPT09IG1hdGNoZWR3b3JkKSB7XG4gICAgICAgICAgICB2YXIgbWQgPSBkb21haW5NYXRjaENhdENvdW50W3JlY29yZC5fZG9tYWluXSA9IGRvbWFpbk1hdGNoQ2F0Q291bnRbcmVjb3JkLl9kb21haW5dIHx8IHt9O1xuICAgICAgICAgICAgdmFyIG1kYyA9IG1kW21hdGNoZWR3b3JkXSA9ICBtZFttYXRjaGVkd29yZF0gfHwge307XG4gICAgICAgICAgICBpbmNyZW1lbnQobWRjLGNhdGVnb3J5KTtcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIClcbiAgICAgICk7XG4gICAgfVxuICB9KTtcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZG9tYWluTWF0Y2hDYXRDb3VudCx1bmRlZmluZWQsMikpO1xuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkb21haW5SZWNvcmRDb3VudCx1bmRlZmluZWQsMikpO1xuICB2YXIgZG9tYWlucyA9IHNvcnRlZEtleXMoZG9tYWluTWF0Y2hDYXRDb3VudCk7XG4gIHZhciByZXNOZXh0ID0gICdcIicgKyBmYWN0ICsgJ1wiIGhhcyBhIG1lYW5pbmcgaW4gJztcbiAgdmFyIHNpbmdsZSA9IGZhbHNlO1xuICBpZihPYmplY3Qua2V5cyhkb21haW5NYXRjaENhdENvdW50KS5sZW5ndGggPiAxKSB7XG4gICAgcmVzTmV4dCArPSAnJyArIGRvbWFpbnMubGVuZ3RoICtcbiAgICAgICAgICAgICAgJyBkb21haW5zOiAnICsgVXRpbHMubGlzdFRvUXVvdGVkQ29tbWFBbmQoZG9tYWlucykgKyBcIlwiO1xuICB9IGVsc2UgaWYoZG9tYWlucy5sZW5ndGggPT09IDEpIHtcbiAgICBpZighZmlsdGVyZG9tYWluKSB7XG4gICAgICByZXNOZXh0ICs9IGBvbmUgYDtcbiAgICB9XG4gICAgcmVzTmV4dCArPSBgZG9tYWluIFwiJHtkb21haW5zWzBdfVwiOmA7XG4gICAgc2luZ2xlID0gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICBpZihyZXMpIHtcbiAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIGlmKGZpbHRlcmRvbWFpbikge1xuICAgICAgcmV0dXJuIGBcIiR7ZmFjdH1cIiBpcyBubyBrbm93biBmYWN0IGluIGRvbWFpbiBcIiR7ZmlsdGVyZG9tYWlufVwiLlxcbmA7XG4gICAgfVxuICAgIHJldHVybiBgSSBkb24ndCBrbm93IGFueXRoaW5nIGFib3V0IFwiJHtmYWN0fVwiLlxcbmA7XG4gIH1cbiAgcmVzICs9IHJlc05leHQgKyBcIlxcblwiOyAvLyAuLi5cXG5cIjtcbiAgZG9tYWlucy5mb3JFYWNoKGZ1bmN0aW9uKGRvbWFpbikge1xuICAgIHZhciBtZCA9IGRvbWFpbk1hdGNoQ2F0Q291bnRbZG9tYWluXTtcbiAgICBPYmplY3Qua2V5cyhtZCkuZm9yRWFjaChtYXRjaGVkc3RyaW5nID0+IHtcbiAgICAgIHZhciBtZGMgPSBtZFttYXRjaGVkc3RyaW5nXTtcbiAgICAgIGlmKCFzaW5nbGUpIHtcbiAgICAgICAgcmVzICs9ICdpbiBkb21haW4gXCInICsgZG9tYWluICsgJ1wiICc7XG4gICAgICB9XG4gICAgICB2YXIgY2F0c2luZ2xlID0gT2JqZWN0LmtleXMobWRjKS5sZW5ndGggPT09IDE7XG4gICAgICByZXMgKz0gYCR7c2xvcHB5T3JFeGFjdChtYXRjaGVkc3RyaW5nLGZhY3QsdGhlTW9kZWwpfSBgO1xuICAgICAgaWYoIWNhdHNpbmdsZSkge1xuICAgICAgICByZXMgKz0gYC4uLlxcbmA7XG4gICAgICB9XG4gICAgICBPYmplY3Qua2V5cyhtZGMpLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xuICAgICAgdmFyIHBlcmNlbnQgPSAgdG9QZXJjZW50KG1kY1tjYXRlZ29yeV0sZG9tYWluUmVjb3JkQ291bnRbZG9tYWluXSk7XG5cbiAgICAgICAgcmVzICs9IGBpcyBhIHZhbHVlIGZvciBjYXRlZ29yeSBcIiR7Y2F0ZWdvcnl9XCIgcHJlc2VudCBpbiAke21kY1tjYXRlZ29yeV19KCR7cGVyY2VudH0lKSBvZiByZWNvcmRzO1xcbmA7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG4gIHJldHVybiByZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXNjcmliZUNhdGVnb3J5KGNhdGVnb3J5IDogc3RyaW5nLCBmaWx0ZXJEb21haW46IHN0cmluZywgbW9kZWw6IElNYXRjaC5JTW9kZWxzLG1lc3NhZ2UgOiBzdHJpbmcpIDogc3RyaW5nW10ge1xuICB2YXIgcmVzID0gW107XG4gIHZhciBkb21zID0gTW9kZWwuZ2V0RG9tYWluc0ZvckNhdGVnb3J5KG1vZGVsLGNhdGVnb3J5KTtcbiAgaWYoZmlsdGVyRG9tYWluKSB7XG4gICAgaWYoZG9tcy5pbmRleE9mKGZpbHRlckRvbWFpbikgPj0gMCkge1xuICAgICAgcmVzLnB1c2goZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluKGNhdGVnb3J5LGZpbHRlckRvbWFpbixtb2RlbCkpO1xuICAgICAgcmV0dXJuIHJlcztcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgfVxuICBkb21zLnNvcnQoKTtcbiAgZG9tcy5mb3JFYWNoKGZ1bmN0aW9uKGRvbWFpbikge1xuICAgICAgICByZXMucHVzaChkZXNjcmliZUNhdGVnb3J5SW5Eb21haW4oY2F0ZWdvcnksIGRvbWFpbiwgbW9kZWwpKTtcbiAgfSk7XG4gIHJldHVybiByZXM7XG59XG4iLCIvKipcbiAqXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5leHBsYWluXG4gKiBAZmlsZSBleHBsYWluLnRzXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXG4gKlxuICogRnVuY3Rpb25zIGRlYWxpbmcgd2l0aCBleHBsYWluaW5nIGZhY3RzLCBjYXRlZ29yaWVzIGV0Yy5cbiAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgQWxnb2wgPSByZXF1aXJlKCcuL2FsZ29sJyk7XG52YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpO1xudmFyIGRlYnVnbG9nID0gZGVidWcoJ2Rlc2NyaWJlJyk7XG52YXIgbG9nZ2VyID0gcmVxdWlyZSgnLi4vdXRpbHMvbG9nZ2VyJyk7XG52YXIgbG9nUGVyZiA9IGxvZ2dlci5wZXJmKFwicGVyZmxpc3RhbGxcIik7XG52YXIgcGVyZmxvZyA9IGRlYnVnKCdwZXJmJyk7XG52YXIgV29yZCA9IHJlcXVpcmUoJy4vd29yZCcpO1xudmFyIFdoYXRJcyA9IHJlcXVpcmUoJy4vd2hhdGlzJyk7XG52YXIgTW9kZWwgPSByZXF1aXJlKCcuLi9tb2RlbC9tb2RlbCcpO1xudmFyIFV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMvdXRpbHMnKTtcbnZhciBzV29yZHMgPSB7fTtcbmZ1bmN0aW9uIGlzU3lub255bUZvcihleGFjdFdvcmQsIHNsb3BweVdvcmQsIHRoZU1vZGVsKSB7XG4gICAgLy8gVE9ETzogdXNlIG1vZGVsIHN5bm9ueW1zXG4gICAgcmV0dXJuIHNsb3BweVdvcmQgPT09IFwibmFtZVwiICYmIGV4YWN0V29yZCA9PT0gXCJlbGVtZW50IG5hbWVcIjtcbn1cbmV4cG9ydHMuaXNTeW5vbnltRm9yID0gaXNTeW5vbnltRm9yO1xuZnVuY3Rpb24gc2xvcHB5T3JFeGFjdChleGFjdFdvcmQsIHNsb3BweVdvcmQsIHRoZU1vZGVsKSB7XG4gICAgaWYgKGV4YWN0V29yZC50b0xvd2VyQ2FzZSgpID09PSBzbG9wcHlXb3JkLnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgcmV0dXJuICdcIicgKyBzbG9wcHlXb3JkICsgJ1wiJztcbiAgICB9XG4gICAgLy8gVE9ETywgZmluZCBwbHVyYWwgcyBldGMuXG4gICAgLy8gc3RpbGwgZXhhY3QsXG4gICAgLy9cbiAgICBpZiAoaXNTeW5vbnltRm9yKGV4YWN0V29yZCwgc2xvcHB5V29yZCwgdGhlTW9kZWwpKSB7XG4gICAgICAgIHJldHVybiAnXCInICsgc2xvcHB5V29yZCArICdcIiAoaW50ZXJwcmV0ZWQgYXMgc3lub255bSBmb3IgXCInICsgZXhhY3RXb3JkICsgJ1wiKSc7XG4gICAgfVxuICAgIC8vdG9kbywgZmluZCBpcyBzeW5vbnltZm9yIC4uLlxuICAgIC8vIFRPRE8sIGEgc3lub255bSBmb3IgLi4uXG4gICAgcmV0dXJuICdcIicgKyBzbG9wcHlXb3JkICsgJ1wiIChpbnRlcnByZXRlZCBhcyBcIicgKyBleGFjdFdvcmQgKyAnXCIpJztcbn1cbmV4cG9ydHMuc2xvcHB5T3JFeGFjdCA9IHNsb3BweU9yRXhhY3Q7XG5mdW5jdGlvbiBjb3VudFJlY29yZFByZXNlbmNlKGNhdGVnb3J5LCBkb21haW4sIHRoZU1vZGVsKSB7XG4gICAgdmFyIHJlcyA9IHsgdG90YWxyZWNvcmRzOiAwLFxuICAgICAgICBwcmVzZW50cmVjb3JkczogMCxcbiAgICAgICAgdmFsdWVzOiB7fSxcbiAgICAgICAgbXVsdGl2YWx1ZWQ6IGZhbHNlXG4gICAgfTtcbiAgICB0aGVNb2RlbC5yZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICAvL2RlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZCx1bmRlZmluZWQsMikpO1xuICAgICAgICBpZiAocmVjb3JkLl9kb21haW4gIT09IGRvbWFpbikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJlcy50b3RhbHJlY29yZHMrKztcbiAgICAgICAgdmFyIHZhbCA9IHJlY29yZFtjYXRlZ29yeV07XG4gICAgICAgIHZhciB2YWxhcnIgPSBbdmFsXTtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgICAgICAgcmVzLm11bHRpdmFsdWVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHZhbGFyciA9IHZhbDtcbiAgICAgICAgfVxuICAgICAgICAvLyB0b2RvIHdyYXAgYXJyXG4gICAgICAgIGlmICh2YWwgIT09IHVuZGVmaW5lZCAmJiB2YWwgIT09IFwibi9hXCIpIHtcbiAgICAgICAgICAgIHJlcy5wcmVzZW50cmVjb3JkcysrO1xuICAgICAgICB9XG4gICAgICAgIHZhbGFyci5mb3JFYWNoKGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHJlcy52YWx1ZXNbdmFsXSA9IChyZXMudmFsdWVzW3ZhbF0gfHwgMCkgKyAxO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5jb3VudFJlY29yZFByZXNlbmNlID0gY291bnRSZWNvcmRQcmVzZW5jZTtcbmZ1bmN0aW9uIGNvdW50UmVjb3JkUHJlc2VuY2VGYWN0KGZhY3QsIGNhdGVnb3J5LCBkb21haW4sIHRoZU1vZGVsKSB7XG4gICAgdmFyIHJlcyA9IHsgdG90YWxyZWNvcmRzOiAwLFxuICAgICAgICBwcmVzZW50cmVjb3JkczogMCxcbiAgICAgICAgdmFsdWVzOiB7fSxcbiAgICAgICAgbXVsdGl2YWx1ZWQ6IGZhbHNlXG4gICAgfTtcbiAgICB0aGVNb2RlbC5yZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICAvL2RlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZCx1bmRlZmluZWQsMikpO1xuICAgICAgICBpZiAocmVjb3JkLl9kb21haW4gIT09IGRvbWFpbikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJlcy50b3RhbHJlY29yZHMrKztcbiAgICAgICAgdmFyIHZhbCA9IHJlY29yZFtjYXRlZ29yeV07XG4gICAgICAgIHZhciB2YWxhcnIgPSBbdmFsXTtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgICAgICAgaWYgKHZhbC5pbmRleE9mKGZhY3QpID49IDApIHtcbiAgICAgICAgICAgICAgICByZXMubXVsdGl2YWx1ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHZhbGFyciA9IHZhbDtcbiAgICAgICAgICAgICAgICByZXMucHJlc2VudHJlY29yZHMrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmICh2YWwgPT09IGZhY3QpIHtcbiAgICAgICAgICAgIHJlcy5wcmVzZW50cmVjb3JkcysrO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuY291bnRSZWNvcmRQcmVzZW5jZUZhY3QgPSBjb3VudFJlY29yZFByZXNlbmNlRmFjdDtcbmZ1bmN0aW9uIG1ha2VWYWx1ZXNMaXN0U3RyaW5nKHJlYWx2YWx1ZXMpIHtcbiAgICB2YXIgdmFsdWVzU3RyaW5nID0gXCJcIjtcbiAgICB2YXIgdG90YWxsZW4gPSAwO1xuICAgIHZhciBsaXN0VmFsdWVzID0gcmVhbHZhbHVlcy5maWx0ZXIoZnVuY3Rpb24gKHZhbCwgaW5kZXgpIHtcbiAgICAgICAgdG90YWxsZW4gPSB0b3RhbGxlbiArIHZhbC5sZW5ndGg7XG4gICAgICAgIHJldHVybiAoaW5kZXggPCBBbGdvbC5EZXNjcmliZVZhbHVlTGlzdE1pbkNvdW50VmFsdWVMaXN0KSB8fCAodG90YWxsZW4gPCBBbGdvbC5EZXNjcmliZVZhbHVlTGlzdExlbmd0aENoYXJMaW1pdCk7XG4gICAgfSk7XG4gICAgaWYgKGxpc3RWYWx1ZXMubGVuZ3RoID09PSAxICYmIHJlYWx2YWx1ZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHJldHVybiAnVGhlIHNvbGUgdmFsdWUgaXMgXFxcIicgKyBsaXN0VmFsdWVzWzBdICsgJ1wiJztcbiAgICB9XG4gICAgdmFyIG1heGxlbiA9IGxpc3RWYWx1ZXMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCB2YWwpIHsgcmV0dXJuIE1hdGgubWF4KHByZXYsIHZhbC5sZW5ndGgpOyB9LCAwKTtcbiAgICBpZiAobWF4bGVuID4gMzApIHtcbiAgICAgICAgcmV0dXJuIFwiUG9zc2libGUgdmFsdWVzIGFyZSAuLi5cXG5cIiArXG4gICAgICAgICAgICBsaXN0VmFsdWVzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgdmFsLCBpbmRleCkgeyByZXR1cm4gKHByZXYgKyBcIihcIiArIChpbmRleCArIDEpICsgJyk6IFwiJyArIHZhbCArICdcIlxcbicpOyB9LCBcIlwiKVxuICAgICAgICAgICAgKyAobGlzdFZhbHVlcy5sZW5ndGggPT09IHJlYWx2YWx1ZXMubGVuZ3RoID8gXCJcIiA6IFwiLi4uXCIpO1xuICAgIH1cbiAgICB2YXIgbGlzdCA9IFwiXCI7XG4gICAgaWYgKGxpc3RWYWx1ZXMubGVuZ3RoID09PSByZWFsdmFsdWVzLmxlbmd0aCkge1xuICAgICAgICBsaXN0ID0gVXRpbHMubGlzdFRvUXVvdGVkQ29tbWFPcihsaXN0VmFsdWVzKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGxpc3QgPSAnXCInICsgbGlzdFZhbHVlcy5qb2luKCdcIiwgXCInKSArICdcIic7XG4gICAgfVxuICAgIHJldHVybiBcIlBvc3NpYmxlIHZhbHVlcyBhcmUgLi4uXFxuXCJcbiAgICAgICAgKyBsaXN0XG4gICAgICAgICsgKGxpc3RWYWx1ZXMubGVuZ3RoID09PSByZWFsdmFsdWVzLmxlbmd0aCA/IFwiXCIgOiBcIiAuLi5cIik7XG59XG5leHBvcnRzLm1ha2VWYWx1ZXNMaXN0U3RyaW5nID0gbWFrZVZhbHVlc0xpc3RTdHJpbmc7XG5mdW5jdGlvbiB0b1BlcmNlbnQoYSwgYikge1xuICAgIHJldHVybiBcIlwiICsgKDEwMCAqIGEgLyBiKS50b0ZpeGVkKDEpO1xufVxuZXhwb3J0cy50b1BlcmNlbnQgPSB0b1BlcmNlbnQ7XG47XG5mdW5jdGlvbiBnZXRDYXRlZ29yeVN0YXRzSW5Eb21haW4oY2F0ZWdvcnksIGZpbHRlcmRvbWFpbiwgdGhlTW9kZWwpIHtcbiAgICB2YXIgcmVjb3JkQ291bnQgPSBjb3VudFJlY29yZFByZXNlbmNlKGNhdGVnb3J5LCBmaWx0ZXJkb21haW4sIHRoZU1vZGVsKTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeSh0aGVNb2RlbC5yZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAoYSkgeyByZXR1cm4gYS5fZG9tYWluID09PSBcIkNvc21vc1wiOyB9KSwgdW5kZWZpbmVkLCAyKSk7XG4gICAgdmFyIHBlcmNlbnQgPSB0b1BlcmNlbnQocmVjb3JkQ291bnQucHJlc2VudHJlY29yZHMsIHJlY29yZENvdW50LnRvdGFscmVjb3Jkcyk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkQ291bnQudmFsdWVzKSk7XG4gICAgdmFyIGFsbFZhbHVlcyA9IE9iamVjdC5rZXlzKHJlY29yZENvdW50LnZhbHVlcyk7XG4gICAgdmFyIHJlYWx2YWx1ZXMgPSBhbGxWYWx1ZXMuZmlsdGVyKGZ1bmN0aW9uICh2YWx1ZSkgeyByZXR1cm4gKHZhbHVlICE9PSAndW5kZWZpbmVkJykgJiYgKHZhbHVlICE9PSAnbi9hJyk7IH0pO1xuICAgIGRlYnVnbG9nO1xuICAgIHJlYWx2YWx1ZXMuc29ydCgpO1xuICAgIHZhciB1bmRlZk5hRGVsdGEgPSAoYWxsVmFsdWVzLmxlbmd0aCAtIHJlYWx2YWx1ZXMubGVuZ3RoKTtcbiAgICB2YXIgZGVsdGEgPSAodW5kZWZOYURlbHRhKSA/IFwiKCtcIiArIHVuZGVmTmFEZWx0YSArIFwiKVwiIDogXCJcIjtcbiAgICB2YXIgZGlzdGluY3QgPSAnJyArIHJlYWx2YWx1ZXMubGVuZ3RoO1xuICAgIHZhciB2YWx1ZXNMaXN0ID0gbWFrZVZhbHVlc0xpc3RTdHJpbmcocmVhbHZhbHVlcyk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgY2F0ZWdvcnlEZXNjOiB0aGVNb2RlbC5mdWxsLmRvbWFpbltmaWx0ZXJkb21haW5dLmNhdGVnb3JpZXNbY2F0ZWdvcnldLFxuICAgICAgICBkaXN0aW5jdDogZGlzdGluY3QsXG4gICAgICAgIGRlbHRhOiBkZWx0YSxcbiAgICAgICAgcHJlc2VudFJlY29yZHM6IHJlY29yZENvdW50LnByZXNlbnRyZWNvcmRzLFxuICAgICAgICBwZXJjUHJlc2VudDogcGVyY2VudCxcbiAgICAgICAgc2FtcGxlVmFsdWVzOiB2YWx1ZXNMaXN0XG4gICAgfTtcbn1cbmV4cG9ydHMuZ2V0Q2F0ZWdvcnlTdGF0c0luRG9tYWluID0gZ2V0Q2F0ZWdvcnlTdGF0c0luRG9tYWluO1xuZnVuY3Rpb24gZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluKGNhdGVnb3J5LCBmaWx0ZXJkb21haW4sIHRoZU1vZGVsKSB7XG4gICAgLyogIGNvbnN0IHJlY29yZENvdW50ID0gY291bnRSZWNvcmRQcmVzZW5jZShjYXRlZ29yeSwgZmlsdGVyZG9tYWluLCB0aGVNb2RlbCk7XG4gICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeSh0aGVNb2RlbC5yZWNvcmRzLmZpbHRlcihhID0+IGEuX2RvbWFpbiA9PT0gXCJDb3Ntb3NcIiksdW5kZWZpbmVkLDIpKTtcbiAgICAgIGNvbnN0IHBlcmNlbnQgPSB0b1BlcmNlbnQocmVjb3JkQ291bnQucHJlc2VudHJlY29yZHMgLCByZWNvcmRDb3VudC50b3RhbHJlY29yZHMpO1xuICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkQ291bnQudmFsdWVzKSk7XG4gICAgICB2YXIgYWxsVmFsdWVzID1PYmplY3Qua2V5cyhyZWNvcmRDb3VudC52YWx1ZXMpO1xuICAgICAgdmFyIHJlYWx2YWx1ZXMgPSBhbGxWYWx1ZXMuZmlsdGVyKHZhbHVlID0+ICh2YWx1ZSAhPT0gJ3VuZGVmaW5lZCcpICYmICh2YWx1ZSAhPT0gJ24vYScpKTtcbiAgICAgIGRlYnVnbG9nXG4gICAgICByZWFsdmFsdWVzLnNvcnQoKTtcbiAgICAgIHZhciB1bmRlZk5hRGVsdGEgPSAgKGFsbFZhbHVlcy5sZW5ndGggLSByZWFsdmFsdWVzLmxlbmd0aCk7XG4gICAgICB2YXIgZGVsdGEgPSAgKHVuZGVmTmFEZWx0YSkgPyAgXCIoK1wiICsgdW5kZWZOYURlbHRhICsgXCIpXCIgOiBcIlwiO1xuICAgICAgY29uc3QgZGlzdGluY3QgPSAnJyArIHJlYWx2YWx1ZXMubGVuZ3RoO1xuICAgIFxuICAgICAgY29uc3QgdmFsdWVzTGlzdCA9IG1ha2VWYWx1ZXNMaXN0U3RyaW5nKHJlYWx2YWx1ZXMpO1xuICAgICovXG4gICAgdmFyIHN0YXRzID0gZ2V0Q2F0ZWdvcnlTdGF0c0luRG9tYWluKGNhdGVnb3J5LCBmaWx0ZXJkb21haW4sIHRoZU1vZGVsKTtcbiAgICB2YXIgcmVzID0gJ2lzIGEgY2F0ZWdvcnkgaW4gZG9tYWluIFwiJyArIGZpbHRlcmRvbWFpbiArICdcIlxcbidcbiAgICAgICAgKyAoXCJJdCBpcyBwcmVzZW50IGluIFwiICsgc3RhdHMucHJlc2VudFJlY29yZHMgKyBcIiAoXCIgKyBzdGF0cy5wZXJjUHJlc2VudCArIFwiJSkgb2YgcmVjb3JkcyBpbiB0aGlzIGRvbWFpbixcXG5cIikgK1xuICAgICAgICAoXCJoYXZpbmcgXCIgKyAoc3RhdHMuZGlzdGluY3QgKyAnJykgKyBzdGF0cy5kZWx0YSArIFwiIGRpc3RpbmN0IHZhbHVlcy5cXG5cIilcbiAgICAgICAgKyBzdGF0cy5zYW1wbGVWYWx1ZXM7XG4gICAgdmFyIGRlc2MgPSB0aGVNb2RlbC5mdWxsLmRvbWFpbltmaWx0ZXJkb21haW5dLmNhdGVnb3JpZXNbY2F0ZWdvcnldIHx8IHt9O1xuICAgIHZhciBkZXNjcmlwdGlvbiA9IGRlc2MuZGVzY3JpcHRpb24gfHwgXCJcIjtcbiAgICBpZiAoZGVzY3JpcHRpb24pIHtcbiAgICAgICAgcmVzICs9IFwiXFxuRGVzY3JpcHRpb246IFwiICsgZGVzY3JpcHRpb247XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmRlc2NyaWJlQ2F0ZWdvcnlJbkRvbWFpbiA9IGRlc2NyaWJlQ2F0ZWdvcnlJbkRvbWFpbjtcbmZ1bmN0aW9uIGZpbmRSZWNvcmRzV2l0aEZhY3QobWF0Y2hlZFN0cmluZywgY2F0ZWdvcnksIHJlY29yZHMsIGRvbWFpbnMpIHtcbiAgICByZXR1cm4gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICB2YXIgcmVzID0gKHJlY29yZFtjYXRlZ29yeV0gPT09IG1hdGNoZWRTdHJpbmcpO1xuICAgICAgICBpZiAocmVzKSB7XG4gICAgICAgICAgICBpbmNyZW1lbnQoZG9tYWlucywgcmVjb3Jkcy5fZG9tYWluKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH0pO1xufVxuZXhwb3J0cy5maW5kUmVjb3Jkc1dpdGhGYWN0ID0gZmluZFJlY29yZHNXaXRoRmFjdDtcbmZ1bmN0aW9uIGluY3JlbWVudChtYXAsIGtleSkge1xuICAgIG1hcFtrZXldID0gKG1hcFtrZXldIHx8IDApICsgMTtcbn1cbmV4cG9ydHMuaW5jcmVtZW50ID0gaW5jcmVtZW50O1xuZnVuY3Rpb24gc29ydGVkS2V5cyhtYXApIHtcbiAgICB2YXIgciA9IE9iamVjdC5rZXlzKG1hcCk7XG4gICAgci5zb3J0KCk7XG4gICAgcmV0dXJuIHI7XG59XG5mdW5jdGlvbiBkZXNjcmliZURvbWFpbihmYWN0LCBkb21haW4sIHRoZU1vZGVsKSB7XG4gICAgdmFyIGNvdW50ID0gdGhlTW9kZWwucmVjb3Jkcy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHJlY29yZCkge1xuICAgICAgICByZXR1cm4gcHJldiArICgocmVjb3JkLl9kb21haW4gPT09IGRvbWFpbikgPyAxIDogMCk7XG4gICAgfSwgMCk7XG4gICAgdmFyIGNhdGNvdW50ID0gTW9kZWwuZ2V0Q2F0ZWdvcmllc0ZvckRvbWFpbih0aGVNb2RlbCwgZG9tYWluKS5sZW5ndGg7XG4gICAgdmFyIHJlcyA9IHNsb3BweU9yRXhhY3QoZG9tYWluLCBmYWN0LCB0aGVNb2RlbCkgKyAoXCJpcyBhIGRvbWFpbiB3aXRoIFwiICsgY2F0Y291bnQgKyBcIiBjYXRlZ29yaWVzIGFuZCBcIiArIGNvdW50ICsgXCIgcmVjb3Jkc1xcblwiKTtcbiAgICB2YXIgZGVzYyA9IHRoZU1vZGVsLmZ1bGwuZG9tYWluW2RvbWFpbl0uZGVzY3JpcHRpb24gfHwgXCJcIjtcbiAgICBpZiAoZGVzYykge1xuICAgICAgICByZXMgKz0gXCJEZXNjcmlwdGlvbjpcIiArIGRlc2MgKyBcIlxcblwiO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5kZXNjcmliZURvbWFpbiA9IGRlc2NyaWJlRG9tYWluO1xuZnVuY3Rpb24gZGVzY3JpYmVGYWN0SW5Eb21haW4oZmFjdCwgZmlsdGVyZG9tYWluLCB0aGVNb2RlbCkge1xuICAgIHZhciBzZW50ZW5jZXMgPSBXaGF0SXMuYW5hbHl6ZUNvbnRleHRTdHJpbmcoZmFjdCwgdGhlTW9kZWwucnVsZXMpO1xuICAgIHZhciBsZW5ndGhPbmVTZW50ZW5jZXMgPSBzZW50ZW5jZXMuZmlsdGVyKGZ1bmN0aW9uIChvU2VudGVuY2UpIHsgcmV0dXJuIG9TZW50ZW5jZS5sZW5ndGggPT09IDE7IH0pO1xuICAgIHZhciByZXMgPSAnJztcbiAgICAvLyByZW1vdmUgY2F0ZWdvcmllcyBhbmQgZG9tYWluc1xuICAgIHZhciBvbmx5RmFjdHMgPSBsZW5ndGhPbmVTZW50ZW5jZXMuZmlsdGVyKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkob1NlbnRlbmNlWzBdKSk7XG4gICAgICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRG9tYWluKG9TZW50ZW5jZVswXSkgJiZcbiAgICAgICAgICAgICFXb3JkLldvcmQuaXNGaWxsZXIob1NlbnRlbmNlWzBdKSAmJiAhV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1NlbnRlbmNlWzBdKTtcbiAgICB9KTtcbiAgICB2YXIgb25seURvbWFpbnMgPSBsZW5ndGhPbmVTZW50ZW5jZXMuZmlsdGVyKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgcmV0dXJuIFdvcmQuV29yZC5pc0RvbWFpbihvU2VudGVuY2VbMF0pO1xuICAgIH0pO1xuICAgIGlmIChvbmx5RG9tYWlucyAmJiBvbmx5RG9tYWlucy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9ubHlEb21haW5zKSk7XG4gICAgICAgIG9ubHlEb21haW5zLmZvckVhY2goZnVuY3Rpb24gKHNlbnRlbmNlKSB7XG4gICAgICAgICAgICB2YXIgZG9tYWluID0gc2VudGVuY2VbMF0ubWF0Y2hlZFN0cmluZztcbiAgICAgICAgICAgIGlmICghZmlsdGVyZG9tYWluIHx8IGRvbWFpbiA9PT0gZmlsdGVyZG9tYWluKSB7XG4gICAgICAgICAgICAgICAgZGVidWdsb2coXCJoZXJlIG1hdGNoIFwiICsgSlNPTi5zdHJpbmdpZnkoc2VudGVuY2UpKTtcbiAgICAgICAgICAgICAgICByZXMgKz0gZGVzY3JpYmVEb21haW4oZmFjdCwgc2VudGVuY2VbMF0ubWF0Y2hlZFN0cmluZywgdGhlTW9kZWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZGVidWdsb2coXCJvbmx5IGZhY3RzOiBcIiArIEpTT04uc3RyaW5naWZ5KG9ubHlGYWN0cykpO1xuICAgIHZhciByZWNvcmRNYXAgPSB7fTtcbiAgICB2YXIgZG9tYWluc01hcCA9IHt9O1xuICAgIHZhciBtYXRjaGVkd29yZE1hcCA9IHt9O1xuICAgIHZhciBtYXRjaGVkQ2F0ZWdvcnlNYXAgPSB7fTtcbiAgICAvLyBsb29rIGZvciBhbGwgcmVjb3Jkc1xuICAgIG9ubHlGYWN0cy5mb3JFYWNoKGZ1bmN0aW9uIChvU2VudGVuY2UpIHtcbiAgICAgICAgcmV0dXJuIG9TZW50ZW5jZS5mb3JFYWNoKGZ1bmN0aW9uIChvV29yZCkge1xuICAgICAgICAgICAgaW5jcmVtZW50KG1hdGNoZWR3b3JkTWFwLCBvV29yZC5tYXRjaGVkU3RyaW5nKTtcbiAgICAgICAgICAgIGluY3JlbWVudChtYXRjaGVkQ2F0ZWdvcnlNYXAsIG9Xb3JkLmNhdGVnb3J5KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgLy8gd2UgaGF2ZTpcbiAgICAvLyBhIGxpc3Qgb2YgY2F0ZWdvcmllcyxcbiAgICAvLyBhIGxpc3Qgb2YgbWF0Y2hlZFdvcmRzICAtPlxuICAgIC8vXG4gICAgdmFyIGNhdGVnb3JpZXMgPSBzb3J0ZWRLZXlzKG1hdGNoZWRDYXRlZ29yeU1hcCk7XG4gICAgdmFyIG1hdGNoZWR3b3JkcyA9IHNvcnRlZEtleXMobWF0Y2hlZHdvcmRNYXApO1xuICAgIGRlYnVnbG9nKFwibWF0Y2hlZHdvcmRzOiBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWR3b3JkcykpO1xuICAgIGRlYnVnbG9nKFwiY2F0ZWdvcmllczogXCIgKyBKU09OLnN0cmluZ2lmeShjYXRlZ29yaWVzKSk7XG4gICAgLy92YXIgYWxsTWF0Y2hlZFdvcmRzID0geyBba2V5IDogc3RyaW5nXSA6IG51bWJlciB9O1xuICAgIHZhciBkb21haW5SZWNvcmRDb3VudCA9IHt9O1xuICAgIHZhciBkb21haW5NYXRjaENhdENvdW50ID0ge307XG4gICAgLy8gd2UgcHJlcGFyZSB0aGUgZm9sbG93aW5nIHN0cnVjdHVyZVxuICAgIC8vXG4gICAgLy8ge2RvbWFpbn0gOiByZWNvcmRjb3VudDtcbiAgICAvLyB7bWF0Y2hlZHdvcmRzfSA6XG4gICAgLy8ge2RvbWFpbn0ge21hdGNoZWR3b3JkfSB7Y2F0ZWdvcnl9IHByZXNlbmNlY291bnRcbiAgICB0aGVNb2RlbC5yZWNvcmRzLmZvckVhY2goZnVuY3Rpb24gKHJlY29yZCkge1xuICAgICAgICBpZiAoIWZpbHRlcmRvbWFpbiB8fCByZWNvcmQuX2RvbWFpbiA9PT0gZmlsdGVyZG9tYWluKSB7XG4gICAgICAgICAgICBkb21haW5SZWNvcmRDb3VudFtyZWNvcmQuX2RvbWFpbl0gPSAoZG9tYWluUmVjb3JkQ291bnRbcmVjb3JkLl9kb21haW5dIHx8IDApICsgMTtcbiAgICAgICAgICAgIG1hdGNoZWR3b3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChtYXRjaGVkd29yZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjYXRlZ29yaWVzLmZvckVhY2goZnVuY3Rpb24gKGNhdGVnb3J5KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWNvcmRbY2F0ZWdvcnldID09PSBtYXRjaGVkd29yZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1kID0gZG9tYWluTWF0Y2hDYXRDb3VudFtyZWNvcmQuX2RvbWFpbl0gPSBkb21haW5NYXRjaENhdENvdW50W3JlY29yZC5fZG9tYWluXSB8fCB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtZGMgPSBtZFttYXRjaGVkd29yZF0gPSBtZFttYXRjaGVkd29yZF0gfHwge307XG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNyZW1lbnQobWRjLCBjYXRlZ29yeSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkb21haW5NYXRjaENhdENvdW50LCB1bmRlZmluZWQsIDIpKTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkb21haW5SZWNvcmRDb3VudCwgdW5kZWZpbmVkLCAyKSk7XG4gICAgdmFyIGRvbWFpbnMgPSBzb3J0ZWRLZXlzKGRvbWFpbk1hdGNoQ2F0Q291bnQpO1xuICAgIHZhciByZXNOZXh0ID0gJ1wiJyArIGZhY3QgKyAnXCIgaGFzIGEgbWVhbmluZyBpbiAnO1xuICAgIHZhciBzaW5nbGUgPSBmYWxzZTtcbiAgICBpZiAoT2JqZWN0LmtleXMoZG9tYWluTWF0Y2hDYXRDb3VudCkubGVuZ3RoID4gMSkge1xuICAgICAgICByZXNOZXh0ICs9ICcnICsgZG9tYWlucy5sZW5ndGggK1xuICAgICAgICAgICAgJyBkb21haW5zOiAnICsgVXRpbHMubGlzdFRvUXVvdGVkQ29tbWFBbmQoZG9tYWlucykgKyBcIlwiO1xuICAgIH1cbiAgICBlbHNlIGlmIChkb21haW5zLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBpZiAoIWZpbHRlcmRvbWFpbikge1xuICAgICAgICAgICAgcmVzTmV4dCArPSBcIm9uZSBcIjtcbiAgICAgICAgfVxuICAgICAgICByZXNOZXh0ICs9IFwiZG9tYWluIFxcXCJcIiArIGRvbWFpbnNbMF0gKyBcIlxcXCI6XCI7XG4gICAgICAgIHNpbmdsZSA9IHRydWU7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBpZiAocmVzKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChmaWx0ZXJkb21haW4pIHtcbiAgICAgICAgICAgIHJldHVybiBcIlxcXCJcIiArIGZhY3QgKyBcIlxcXCIgaXMgbm8ga25vd24gZmFjdCBpbiBkb21haW4gXFxcIlwiICsgZmlsdGVyZG9tYWluICsgXCJcXFwiLlxcblwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBcIkkgZG9uJ3Qga25vdyBhbnl0aGluZyBhYm91dCBcXFwiXCIgKyBmYWN0ICsgXCJcXFwiLlxcblwiO1xuICAgIH1cbiAgICByZXMgKz0gcmVzTmV4dCArIFwiXFxuXCI7IC8vIC4uLlxcblwiO1xuICAgIGRvbWFpbnMuZm9yRWFjaChmdW5jdGlvbiAoZG9tYWluKSB7XG4gICAgICAgIHZhciBtZCA9IGRvbWFpbk1hdGNoQ2F0Q291bnRbZG9tYWluXTtcbiAgICAgICAgT2JqZWN0LmtleXMobWQpLmZvckVhY2goZnVuY3Rpb24gKG1hdGNoZWRzdHJpbmcpIHtcbiAgICAgICAgICAgIHZhciBtZGMgPSBtZFttYXRjaGVkc3RyaW5nXTtcbiAgICAgICAgICAgIGlmICghc2luZ2xlKSB7XG4gICAgICAgICAgICAgICAgcmVzICs9ICdpbiBkb21haW4gXCInICsgZG9tYWluICsgJ1wiICc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgY2F0c2luZ2xlID0gT2JqZWN0LmtleXMobWRjKS5sZW5ndGggPT09IDE7XG4gICAgICAgICAgICByZXMgKz0gc2xvcHB5T3JFeGFjdChtYXRjaGVkc3RyaW5nLCBmYWN0LCB0aGVNb2RlbCkgKyBcIiBcIjtcbiAgICAgICAgICAgIGlmICghY2F0c2luZ2xlKSB7XG4gICAgICAgICAgICAgICAgcmVzICs9IFwiLi4uXFxuXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhtZGMpLmZvckVhY2goZnVuY3Rpb24gKGNhdGVnb3J5KSB7XG4gICAgICAgICAgICAgICAgdmFyIHBlcmNlbnQgPSB0b1BlcmNlbnQobWRjW2NhdGVnb3J5XSwgZG9tYWluUmVjb3JkQ291bnRbZG9tYWluXSk7XG4gICAgICAgICAgICAgICAgcmVzICs9IFwiaXMgYSB2YWx1ZSBmb3IgY2F0ZWdvcnkgXFxcIlwiICsgY2F0ZWdvcnkgKyBcIlxcXCIgcHJlc2VudCBpbiBcIiArIG1kY1tjYXRlZ29yeV0gKyBcIihcIiArIHBlcmNlbnQgKyBcIiUpIG9mIHJlY29yZHM7XFxuXCI7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZGVzY3JpYmVGYWN0SW5Eb21haW4gPSBkZXNjcmliZUZhY3RJbkRvbWFpbjtcbmZ1bmN0aW9uIGRlc2NyaWJlQ2F0ZWdvcnkoY2F0ZWdvcnksIGZpbHRlckRvbWFpbiwgbW9kZWwsIG1lc3NhZ2UpIHtcbiAgICB2YXIgcmVzID0gW107XG4gICAgdmFyIGRvbXMgPSBNb2RlbC5nZXREb21haW5zRm9yQ2F0ZWdvcnkobW9kZWwsIGNhdGVnb3J5KTtcbiAgICBpZiAoZmlsdGVyRG9tYWluKSB7XG4gICAgICAgIGlmIChkb21zLmluZGV4T2YoZmlsdGVyRG9tYWluKSA+PSAwKSB7XG4gICAgICAgICAgICByZXMucHVzaChkZXNjcmliZUNhdGVnb3J5SW5Eb21haW4oY2F0ZWdvcnksIGZpbHRlckRvbWFpbiwgbW9kZWwpKTtcbiAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cbiAgICB9XG4gICAgZG9tcy5zb3J0KCk7XG4gICAgZG9tcy5mb3JFYWNoKGZ1bmN0aW9uIChkb21haW4pIHtcbiAgICAgICAgcmVzLnB1c2goZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluKGNhdGVnb3J5LCBkb21haW4sIG1vZGVsKSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZGVzY3JpYmVDYXRlZ29yeSA9IGRlc2NyaWJlQ2F0ZWdvcnk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
