"use strict";
/**
 *
 * @module jfseb.fdevstart.explain
 * @file explain.ts
 * @copyright (c) 2016 Gerd Forstmann
 *
 * Functions dealing with explaining facts, categories etc.
 */

Object.defineProperty(exports, "__esModule", { value: true });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1hdGNoL2Rlc2NyaWJlLmpzIiwiLi4vc3JjL21hdGNoL2Rlc2NyaWJlLnRzIl0sIm5hbWVzIjpbIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZXhwb3J0cyIsInZhbHVlIiwiQWxnb2wiLCJyZXF1aXJlIiwiZGVidWciLCJkZWJ1Z2xvZyIsImxvZ2dlciIsImxvZ1BlcmYiLCJwZXJmIiwicGVyZmxvZyIsImFib3RfZXJiYXNlXzEiLCJXaGF0SXMiLCJmZGV2c3RhX21vbm1vdmVfMSIsIlV0aWxzIiwic1dvcmRzIiwiaXNTeW5vbnltRm9yIiwiZXhhY3RXb3JkIiwic2xvcHB5V29yZCIsInRoZU1vZGVsIiwic2xvcHB5T3JFeGFjdCIsInRvTG93ZXJDYXNlIiwiY291bnRSZWNvcmRQcmVzZW5jZSIsImNhdGVnb3J5IiwiZG9tYWluIiwicmVzIiwidG90YWxyZWNvcmRzIiwicHJlc2VudHJlY29yZHMiLCJ2YWx1ZXMiLCJtdWx0aXZhbHVlZCIsInJlY29yZHMiLCJmb3JFYWNoIiwicmVjb3JkIiwiX2RvbWFpbiIsInZhbCIsInZhbGFyciIsIkFycmF5IiwiaXNBcnJheSIsInVuZGVmaW5lZCIsImNvdW50UmVjb3JkUHJlc2VuY2VGYWN0IiwiZmFjdCIsImluZGV4T2YiLCJtYWtlVmFsdWVzTGlzdFN0cmluZyIsInJlYWx2YWx1ZXMiLCJ2YWx1ZXNTdHJpbmciLCJ0b3RhbGxlbiIsImxpc3RWYWx1ZXMiLCJmaWx0ZXIiLCJpbmRleCIsImxlbmd0aCIsIkRlc2NyaWJlVmFsdWVMaXN0TWluQ291bnRWYWx1ZUxpc3QiLCJEZXNjcmliZVZhbHVlTGlzdExlbmd0aENoYXJMaW1pdCIsIm1heGxlbiIsInJlZHVjZSIsInByZXYiLCJNYXRoIiwibWF4IiwibGlzdCIsImxpc3RUb1F1b3RlZENvbW1hT3IiLCJqb2luIiwidG9QZXJjZW50IiwiYSIsImIiLCJ0b0ZpeGVkIiwiZ2V0Q2F0ZWdvcnlTdGF0c0luRG9tYWluIiwiZmlsdGVyZG9tYWluIiwicmVjb3JkQ291bnQiLCJKU09OIiwic3RyaW5naWZ5IiwicGVyY2VudCIsImFsbFZhbHVlcyIsImtleXMiLCJzb3J0IiwidW5kZWZOYURlbHRhIiwiZGVsdGEiLCJkaXN0aW5jdCIsInZhbHVlc0xpc3QiLCJjYXRlZ29yeURlc2MiLCJmdWxsIiwiY2F0ZWdvcmllcyIsInByZXNlbnRSZWNvcmRzIiwicGVyY1ByZXNlbnQiLCJzYW1wbGVWYWx1ZXMiLCJkZXNjcmliZUNhdGVnb3J5SW5Eb21haW4iLCJzdGF0cyIsImRlc2MiLCJkZXNjcmlwdGlvbiIsImZpbmRSZWNvcmRzV2l0aEZhY3QiLCJtYXRjaGVkU3RyaW5nIiwiZG9tYWlucyIsImluY3JlbWVudCIsIm1hcCIsImtleSIsInNvcnRlZEtleXMiLCJyIiwiZGVzY3JpYmVEb21haW4iLCJjb3VudCIsImNhdGNvdW50IiwiTW9kZWwiLCJnZXRDYXRlZ29yaWVzRm9yRG9tYWluIiwiZGVzY3JpYmVGYWN0SW5Eb21haW4iLCJzZW50ZW5jZXMiLCJhbmFseXplQ29udGV4dFN0cmluZyIsInJ1bGVzIiwibGVuZ3RoT25lU2VudGVuY2VzIiwib1NlbnRlbmNlIiwib25seUZhY3RzIiwiV29yZCIsImlzRG9tYWluIiwiaXNGaWxsZXIiLCJpc0NhdGVnb3J5Iiwib25seURvbWFpbnMiLCJzZW50ZW5jZSIsInJlY29yZE1hcCIsImRvbWFpbnNNYXAiLCJtYXRjaGVkd29yZE1hcCIsIm1hdGNoZWRDYXRlZ29yeU1hcCIsIm9Xb3JkIiwibWF0Y2hlZHdvcmRzIiwiZG9tYWluUmVjb3JkQ291bnQiLCJkb21haW5NYXRjaENhdENvdW50IiwibWF0Y2hlZHdvcmQiLCJtZCIsIm1kYyIsInJlc05leHQiLCJzaW5nbGUiLCJsaXN0VG9RdW90ZWRDb21tYUFuZCIsImZhY3RjbGVhbiIsInN0cmlwUXVvdGVzIiwibWF0Y2hlZHN0cmluZyIsImNhdHNpbmdsZSIsImRlc2NyaWJlQ2F0ZWdvcnkiLCJmaWx0ZXJEb21haW4iLCJtb2RlbCIsIm1lc3NhZ2UiLCJkb21zIiwiZ2V0RG9tYWluc0Zv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VixFQUF3QmdHLGtCQUFrQi9GLE1BQWxCLENBQXhCLENBQWY7QUFFRUMsc0RBQW1DRixRQUFuQyxzQkFBMkRvRyxJQUFJcEcsUUFBSixDQUEzRCxTQUE0RThDLE9BQTVFO0FBQ0QsYUFKRDtBQUtELFNBZkQ7QUFnQkQsS0FsQkQ7QUFtQkEsV0FBTzVDLEdBQVA7QUFDRDtBQXhIRHhCLFFBQUFtRyxvQkFBQSxHQUFBQSxvQkFBQTtBQTBIQSxTQUFBK0IsZ0JBQUEsQ0FBaUM1RyxRQUFqQyxFQUFvRDZHLFlBQXBELEVBQTBFQyxLQUExRSxFQUFnR0MsT0FBaEcsRUFBZ0g7QUFDOUcsUUFBSTdHLE1BQU0sRUFBVjtBQUNBLFFBQUk4RyxPQUFPMUgsa0JBQUFxRixLQUFBLENBQU1zQyxxQkFBTixDQUE0QkgsS0FBNUIsRUFBa0M5RyxRQUFsQyxDQUFYO0FBQ0EsUUFBRzZHLFlBQUgsRUFBaUI7QUFDZixZQUFHRyxLQUFLOUYsT0FBTCxDQUFhMkYsWUFBYixLQUE4QixDQUFqQyxFQUFvQztBQUNsQzNHLGdCQUFJZ0gsSUFBSixDQUFTdEQseUJBQXlCNUQsUUFBekIsRUFBa0M2RyxZQUFsQyxFQUErQ0MsS0FBL0MsQ0FBVDtBQUNBLG1CQUFPNUcsR0FBUDtBQUNELFNBSEQsTUFHTztBQUNMLG1CQUFPLEVBQVA7QUFDRDtBQUNGO0FBQ0Q4RyxTQUFLL0QsSUFBTDtBQUNBK0QsU0FBS3hHLE9BQUwsQ0FBYSxVQUFTUCxNQUFULEVBQWU7QUFDdEJDLFlBQUlnSCxJQUFKLENBQVN0RCx5QkFBeUI1RCxRQUF6QixFQUFtQ0MsTUFBbkMsRUFBMkM2RyxLQUEzQyxDQUFUO0FBQ0wsS0FGRDtBQUdBLFdBQU81RyxHQUFQO0FBQ0Q7QUFoQkR4QixRQUFBa0ksZ0JBQUEsR0FBQUEsZ0JBQUEiLCJmaWxlIjoibWF0Y2gvZGVzY3JpYmUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcbi8qKlxuICpcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmV4cGxhaW5cbiAqIEBmaWxlIGV4cGxhaW4udHNcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cbiAqXG4gKiBGdW5jdGlvbnMgZGVhbGluZyB3aXRoIGV4cGxhaW5pbmcgZmFjdHMsIGNhdGVnb3JpZXMgZXRjLlxuICovXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5jb25zdCBBbGdvbCA9IHJlcXVpcmUoXCIuL2FsZ29sXCIpO1xuY29uc3QgZGVidWcgPSByZXF1aXJlKFwiZGVidWdcIik7XG5jb25zdCBkZWJ1Z2xvZyA9IGRlYnVnKCdkZXNjcmliZScpO1xuY29uc3QgbG9nZ2VyID0gcmVxdWlyZShcIi4uL3V0aWxzL2xvZ2dlclwiKTtcbnZhciBsb2dQZXJmID0gbG9nZ2VyLnBlcmYoXCJwZXJmbGlzdGFsbFwiKTtcbnZhciBwZXJmbG9nID0gZGVidWcoJ3BlcmYnKTtcbmNvbnN0IGFib3RfZXJiYXNlXzEgPSByZXF1aXJlKFwiYWJvdF9lcmJhc2VcIik7XG5jb25zdCBXaGF0SXMgPSByZXF1aXJlKFwiLi93aGF0aXNcIik7XG5jb25zdCBmZGV2c3RhX21vbm1vdmVfMSA9IHJlcXVpcmUoXCJmZGV2c3RhX21vbm1vdmVcIik7XG5jb25zdCBVdGlscyA9IHJlcXVpcmUoXCJhYm90X3V0aWxzXCIpO1xudmFyIHNXb3JkcyA9IHt9O1xuZnVuY3Rpb24gaXNTeW5vbnltRm9yKGV4YWN0V29yZCwgc2xvcHB5V29yZCwgdGhlTW9kZWwpIHtcbiAgICAvLyBUT0RPOiB1c2UgbW9kZWwgc3lub255bXNcbiAgICByZXR1cm4gc2xvcHB5V29yZCA9PT0gXCJuYW1lXCIgJiYgZXhhY3RXb3JkID09PSBcImVsZW1lbnQgbmFtZVwiO1xufVxuZXhwb3J0cy5pc1N5bm9ueW1Gb3IgPSBpc1N5bm9ueW1Gb3I7XG5mdW5jdGlvbiBzbG9wcHlPckV4YWN0KGV4YWN0V29yZCwgc2xvcHB5V29yZCwgdGhlTW9kZWwpIHtcbiAgICBpZiAoZXhhY3RXb3JkLnRvTG93ZXJDYXNlKCkgPT09IHNsb3BweVdvcmQudG9Mb3dlckNhc2UoKSkge1xuICAgICAgICByZXR1cm4gJ1wiJyArIHNsb3BweVdvcmQgKyAnXCInO1xuICAgIH1cbiAgICAvLyBUT0RPLCBmaW5kIHBsdXJhbCBzIGV0Yy5cbiAgICAvLyBzdGlsbCBleGFjdCxcbiAgICAvL1xuICAgIGlmIChpc1N5bm9ueW1Gb3IoZXhhY3RXb3JkLCBzbG9wcHlXb3JkLCB0aGVNb2RlbCkpIHtcbiAgICAgICAgcmV0dXJuICdcIicgKyBzbG9wcHlXb3JkICsgJ1wiIChpbnRlcnByZXRlZCBhcyBzeW5vbnltIGZvciBcIicgKyBleGFjdFdvcmQgKyAnXCIpJztcbiAgICB9XG4gICAgLy90b2RvLCBmaW5kIGlzIHN5bm9ueW1mb3IgLi4uXG4gICAgLy8gVE9ETywgYSBzeW5vbnltIGZvciAuLi5cbiAgICByZXR1cm4gJ1wiJyArIHNsb3BweVdvcmQgKyAnXCIgKGludGVycHJldGVkIGFzIFwiJyArIGV4YWN0V29yZCArICdcIiknO1xufVxuZXhwb3J0cy5zbG9wcHlPckV4YWN0ID0gc2xvcHB5T3JFeGFjdDtcbmZ1bmN0aW9uIGNvdW50UmVjb3JkUHJlc2VuY2UoY2F0ZWdvcnksIGRvbWFpbiwgdGhlTW9kZWwpIHtcbiAgICB2YXIgcmVzID0geyB0b3RhbHJlY29yZHM6IDAsXG4gICAgICAgIHByZXNlbnRyZWNvcmRzOiAwLFxuICAgICAgICB2YWx1ZXM6IHt9LFxuICAgICAgICBtdWx0aXZhbHVlZDogZmFsc2VcbiAgICB9O1xuICAgIHRoZU1vZGVsLnJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgIC8vZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkLHVuZGVmaW5lZCwyKSk7XG4gICAgICAgIGlmIChyZWNvcmQuX2RvbWFpbiAhPT0gZG9tYWluKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcmVzLnRvdGFscmVjb3JkcysrO1xuICAgICAgICB2YXIgdmFsID0gcmVjb3JkW2NhdGVnb3J5XTtcbiAgICAgICAgdmFyIHZhbGFyciA9IFt2YWxdO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgICAgICAgICByZXMubXVsdGl2YWx1ZWQgPSB0cnVlO1xuICAgICAgICAgICAgdmFsYXJyID0gdmFsO1xuICAgICAgICB9XG4gICAgICAgIC8vIHRvZG8gd3JhcCBhcnJcbiAgICAgICAgaWYgKHZhbCAhPT0gdW5kZWZpbmVkICYmIHZhbCAhPT0gXCJuL2FcIikge1xuICAgICAgICAgICAgcmVzLnByZXNlbnRyZWNvcmRzKys7XG4gICAgICAgIH1cbiAgICAgICAgdmFsYXJyLmZvckVhY2goZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgcmVzLnZhbHVlc1t2YWxdID0gKHJlcy52YWx1ZXNbdmFsXSB8fCAwKSArIDE7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmNvdW50UmVjb3JkUHJlc2VuY2UgPSBjb3VudFJlY29yZFByZXNlbmNlO1xuZnVuY3Rpb24gY291bnRSZWNvcmRQcmVzZW5jZUZhY3QoZmFjdCwgY2F0ZWdvcnksIGRvbWFpbiwgdGhlTW9kZWwpIHtcbiAgICB2YXIgcmVzID0geyB0b3RhbHJlY29yZHM6IDAsXG4gICAgICAgIHByZXNlbnRyZWNvcmRzOiAwLFxuICAgICAgICB2YWx1ZXM6IHt9LFxuICAgICAgICBtdWx0aXZhbHVlZDogZmFsc2VcbiAgICB9O1xuICAgIHRoZU1vZGVsLnJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgIC8vZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkLHVuZGVmaW5lZCwyKSk7XG4gICAgICAgIGlmIChyZWNvcmQuX2RvbWFpbiAhPT0gZG9tYWluKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgcmVzLnRvdGFscmVjb3JkcysrO1xuICAgICAgICB2YXIgdmFsID0gcmVjb3JkW2NhdGVnb3J5XTtcbiAgICAgICAgdmFyIHZhbGFyciA9IFt2YWxdO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgICAgICAgICBpZiAodmFsLmluZGV4T2YoZmFjdCkgPj0gMCkge1xuICAgICAgICAgICAgICAgIHJlcy5tdWx0aXZhbHVlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgdmFsYXJyID0gdmFsO1xuICAgICAgICAgICAgICAgIHJlcy5wcmVzZW50cmVjb3JkcysrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHZhbCA9PT0gZmFjdCkge1xuICAgICAgICAgICAgcmVzLnByZXNlbnRyZWNvcmRzKys7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5jb3VudFJlY29yZFByZXNlbmNlRmFjdCA9IGNvdW50UmVjb3JkUHJlc2VuY2VGYWN0O1xuZnVuY3Rpb24gbWFrZVZhbHVlc0xpc3RTdHJpbmcocmVhbHZhbHVlcykge1xuICAgIHZhciB2YWx1ZXNTdHJpbmcgPSBcIlwiO1xuICAgIHZhciB0b3RhbGxlbiA9IDA7XG4gICAgdmFyIGxpc3RWYWx1ZXMgPSByZWFsdmFsdWVzLmZpbHRlcihmdW5jdGlvbiAodmFsLCBpbmRleCkge1xuICAgICAgICB0b3RhbGxlbiA9IHRvdGFsbGVuICsgdmFsLmxlbmd0aDtcbiAgICAgICAgcmV0dXJuIChpbmRleCA8IEFsZ29sLkRlc2NyaWJlVmFsdWVMaXN0TWluQ291bnRWYWx1ZUxpc3QpIHx8ICh0b3RhbGxlbiA8IEFsZ29sLkRlc2NyaWJlVmFsdWVMaXN0TGVuZ3RoQ2hhckxpbWl0KTtcbiAgICB9KTtcbiAgICBpZiAobGlzdFZhbHVlcy5sZW5ndGggPT09IDEgJiYgcmVhbHZhbHVlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuICdUaGUgc29sZSB2YWx1ZSBpcyBcXFwiJyArIGxpc3RWYWx1ZXNbMF0gKyAnXCInO1xuICAgIH1cbiAgICB2YXIgbWF4bGVuID0gbGlzdFZhbHVlcy5yZWR1Y2UoKHByZXYsIHZhbCkgPT4gTWF0aC5tYXgocHJldiwgdmFsLmxlbmd0aCksIDApO1xuICAgIGlmIChtYXhsZW4gPiAzMCkge1xuICAgICAgICByZXR1cm4gXCJQb3NzaWJsZSB2YWx1ZXMgYXJlIC4uLlxcblwiICtcbiAgICAgICAgICAgIGxpc3RWYWx1ZXMucmVkdWNlKChwcmV2LCB2YWwsIGluZGV4KSA9PiAocHJldiArIFwiKFwiICsgKGluZGV4ICsgMSkgKyAnKTogXCInICsgdmFsICsgJ1wiXFxuJyksIFwiXCIpXG4gICAgICAgICAgICArIChsaXN0VmFsdWVzLmxlbmd0aCA9PT0gcmVhbHZhbHVlcy5sZW5ndGggPyBcIlwiIDogXCIuLi5cIik7XG4gICAgfVxuICAgIHZhciBsaXN0ID0gXCJcIjtcbiAgICBpZiAobGlzdFZhbHVlcy5sZW5ndGggPT09IHJlYWx2YWx1ZXMubGVuZ3RoKSB7XG4gICAgICAgIGxpc3QgPSBVdGlscy5saXN0VG9RdW90ZWRDb21tYU9yKGxpc3RWYWx1ZXMpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgbGlzdCA9ICdcIicgKyBsaXN0VmFsdWVzLmpvaW4oJ1wiLCBcIicpICsgJ1wiJztcbiAgICB9XG4gICAgcmV0dXJuIFwiUG9zc2libGUgdmFsdWVzIGFyZSAuLi5cXG5cIlxuICAgICAgICArIGxpc3RcbiAgICAgICAgKyAobGlzdFZhbHVlcy5sZW5ndGggPT09IHJlYWx2YWx1ZXMubGVuZ3RoID8gXCJcIiA6IFwiIC4uLlwiKTtcbn1cbmV4cG9ydHMubWFrZVZhbHVlc0xpc3RTdHJpbmcgPSBtYWtlVmFsdWVzTGlzdFN0cmluZztcbmZ1bmN0aW9uIHRvUGVyY2VudChhLCBiKSB7XG4gICAgcmV0dXJuIFwiXCIgKyAoMTAwICogYSAvIGIpLnRvRml4ZWQoMSk7XG59XG5leHBvcnRzLnRvUGVyY2VudCA9IHRvUGVyY2VudDtcbjtcbmZ1bmN0aW9uIGdldENhdGVnb3J5U3RhdHNJbkRvbWFpbihjYXRlZ29yeSwgZmlsdGVyZG9tYWluLCB0aGVNb2RlbCkge1xuICAgIGNvbnN0IHJlY29yZENvdW50ID0gY291bnRSZWNvcmRQcmVzZW5jZShjYXRlZ29yeSwgZmlsdGVyZG9tYWluLCB0aGVNb2RlbCk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkodGhlTW9kZWwucmVjb3Jkcy5maWx0ZXIoYSA9PiBhLl9kb21haW4gPT09IFwiQ29zbW9zXCIpLCB1bmRlZmluZWQsIDIpKTtcbiAgICBjb25zdCBwZXJjZW50ID0gdG9QZXJjZW50KHJlY29yZENvdW50LnByZXNlbnRyZWNvcmRzLCByZWNvcmRDb3VudC50b3RhbHJlY29yZHMpO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZENvdW50LnZhbHVlcykpO1xuICAgIHZhciBhbGxWYWx1ZXMgPSBPYmplY3Qua2V5cyhyZWNvcmRDb3VudC52YWx1ZXMpO1xuICAgIHZhciByZWFsdmFsdWVzID0gYWxsVmFsdWVzLmZpbHRlcih2YWx1ZSA9PiAodmFsdWUgIT09ICd1bmRlZmluZWQnKSAmJiAodmFsdWUgIT09ICduL2EnKSk7XG4gICAgZGVidWdsb2c7XG4gICAgcmVhbHZhbHVlcy5zb3J0KCk7XG4gICAgdmFyIHVuZGVmTmFEZWx0YSA9IChhbGxWYWx1ZXMubGVuZ3RoIC0gcmVhbHZhbHVlcy5sZW5ndGgpO1xuICAgIHZhciBkZWx0YSA9ICh1bmRlZk5hRGVsdGEpID8gXCIoK1wiICsgdW5kZWZOYURlbHRhICsgXCIpXCIgOiBcIlwiO1xuICAgIGNvbnN0IGRpc3RpbmN0ID0gJycgKyByZWFsdmFsdWVzLmxlbmd0aDtcbiAgICBjb25zdCB2YWx1ZXNMaXN0ID0gbWFrZVZhbHVlc0xpc3RTdHJpbmcocmVhbHZhbHVlcyk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgY2F0ZWdvcnlEZXNjOiB0aGVNb2RlbC5mdWxsLmRvbWFpbltmaWx0ZXJkb21haW5dLmNhdGVnb3JpZXNbY2F0ZWdvcnldLFxuICAgICAgICBkaXN0aW5jdDogZGlzdGluY3QsXG4gICAgICAgIGRlbHRhOiBkZWx0YSxcbiAgICAgICAgcHJlc2VudFJlY29yZHM6IHJlY29yZENvdW50LnByZXNlbnRyZWNvcmRzLFxuICAgICAgICBwZXJjUHJlc2VudDogcGVyY2VudCxcbiAgICAgICAgc2FtcGxlVmFsdWVzOiB2YWx1ZXNMaXN0XG4gICAgfTtcbn1cbmV4cG9ydHMuZ2V0Q2F0ZWdvcnlTdGF0c0luRG9tYWluID0gZ2V0Q2F0ZWdvcnlTdGF0c0luRG9tYWluO1xuZnVuY3Rpb24gZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluKGNhdGVnb3J5LCBmaWx0ZXJkb21haW4sIHRoZU1vZGVsKSB7XG4gICAgLyogIGNvbnN0IHJlY29yZENvdW50ID0gY291bnRSZWNvcmRQcmVzZW5jZShjYXRlZ29yeSwgZmlsdGVyZG9tYWluLCB0aGVNb2RlbCk7XG4gICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeSh0aGVNb2RlbC5yZWNvcmRzLmZpbHRlcihhID0+IGEuX2RvbWFpbiA9PT0gXCJDb3Ntb3NcIiksdW5kZWZpbmVkLDIpKTtcbiAgICAgIGNvbnN0IHBlcmNlbnQgPSB0b1BlcmNlbnQocmVjb3JkQ291bnQucHJlc2VudHJlY29yZHMgLCByZWNvcmRDb3VudC50b3RhbHJlY29yZHMpO1xuICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkQ291bnQudmFsdWVzKSk7XG4gICAgICB2YXIgYWxsVmFsdWVzID1PYmplY3Qua2V5cyhyZWNvcmRDb3VudC52YWx1ZXMpO1xuICAgICAgdmFyIHJlYWx2YWx1ZXMgPSBhbGxWYWx1ZXMuZmlsdGVyKHZhbHVlID0+ICh2YWx1ZSAhPT0gJ3VuZGVmaW5lZCcpICYmICh2YWx1ZSAhPT0gJ24vYScpKTtcbiAgICAgIGRlYnVnbG9nXG4gICAgICByZWFsdmFsdWVzLnNvcnQoKTtcbiAgICAgIHZhciB1bmRlZk5hRGVsdGEgPSAgKGFsbFZhbHVlcy5sZW5ndGggLSByZWFsdmFsdWVzLmxlbmd0aCk7XG4gICAgICB2YXIgZGVsdGEgPSAgKHVuZGVmTmFEZWx0YSkgPyAgXCIoK1wiICsgdW5kZWZOYURlbHRhICsgXCIpXCIgOiBcIlwiO1xuICAgICAgY29uc3QgZGlzdGluY3QgPSAnJyArIHJlYWx2YWx1ZXMubGVuZ3RoO1xuICAgIFxyXG4gICAgICBjb25zdCB2YWx1ZXNMaXN0ID0gbWFrZVZhbHVlc0xpc3RTdHJpbmcocmVhbHZhbHVlcyk7XG4gICAgKi9cbiAgICB2YXIgc3RhdHMgPSBnZXRDYXRlZ29yeVN0YXRzSW5Eb21haW4oY2F0ZWdvcnksIGZpbHRlcmRvbWFpbiwgdGhlTW9kZWwpO1xuICAgIHZhciByZXMgPSAnaXMgYSBjYXRlZ29yeSBpbiBkb21haW4gXCInICsgZmlsdGVyZG9tYWluICsgJ1wiXFxuJ1xuICAgICAgICArIGBJdCBpcyBwcmVzZW50IGluICR7c3RhdHMucHJlc2VudFJlY29yZHN9ICgke3N0YXRzLnBlcmNQcmVzZW50fSUpIG9mIHJlY29yZHMgaW4gdGhpcyBkb21haW4sXFxuYCArXG4gICAgICAgIGBoYXZpbmcgJHtzdGF0cy5kaXN0aW5jdCArICcnfSR7c3RhdHMuZGVsdGF9IGRpc3RpbmN0IHZhbHVlcy5cXG5gXG4gICAgICAgICsgc3RhdHMuc2FtcGxlVmFsdWVzO1xuICAgIHZhciBkZXNjID0gdGhlTW9kZWwuZnVsbC5kb21haW5bZmlsdGVyZG9tYWluXS5jYXRlZ29yaWVzW2NhdGVnb3J5XSB8fCB7fTtcbiAgICB2YXIgZGVzY3JpcHRpb24gPSBkZXNjLmRlc2NyaXB0aW9uIHx8IFwiXCI7XG4gICAgaWYgKGRlc2NyaXB0aW9uKSB7XG4gICAgICAgIHJlcyArPSBgXFxuRGVzY3JpcHRpb246ICR7ZGVzY3JpcHRpb259YDtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluID0gZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluO1xuZnVuY3Rpb24gZmluZFJlY29yZHNXaXRoRmFjdChtYXRjaGVkU3RyaW5nLCBjYXRlZ29yeSwgcmVjb3JkcywgZG9tYWlucykge1xuICAgIHJldHVybiByZWNvcmRzLmZpbHRlcihmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgIGxldCByZXMgPSAocmVjb3JkW2NhdGVnb3J5XSA9PT0gbWF0Y2hlZFN0cmluZyk7XG4gICAgICAgIGlmIChyZXMpIHtcbiAgICAgICAgICAgIGluY3JlbWVudChkb21haW5zLCByZWNvcmRzLl9kb21haW4pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfSk7XG59XG5leHBvcnRzLmZpbmRSZWNvcmRzV2l0aEZhY3QgPSBmaW5kUmVjb3Jkc1dpdGhGYWN0O1xuZnVuY3Rpb24gaW5jcmVtZW50KG1hcCwga2V5KSB7XG4gICAgbWFwW2tleV0gPSAobWFwW2tleV0gfHwgMCkgKyAxO1xufVxuZXhwb3J0cy5pbmNyZW1lbnQgPSBpbmNyZW1lbnQ7XG5mdW5jdGlvbiBzb3J0ZWRLZXlzKG1hcCkge1xuICAgIHZhciByID0gT2JqZWN0LmtleXMobWFwKTtcbiAgICByLnNvcnQoKTtcbiAgICByZXR1cm4gcjtcbn1cbmZ1bmN0aW9uIGRlc2NyaWJlRG9tYWluKGZhY3QsIGRvbWFpbiwgdGhlTW9kZWwpIHtcbiAgICB2YXIgY291bnQgPSB0aGVNb2RlbC5yZWNvcmRzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgcmVjb3JkKSB7XG4gICAgICAgIHJldHVybiBwcmV2ICsgKChyZWNvcmQuX2RvbWFpbiA9PT0gZG9tYWluKSA/IDEgOiAwKTtcbiAgICB9LCAwKTtcbiAgICB2YXIgY2F0Y291bnQgPSBmZGV2c3RhX21vbm1vdmVfMS5Nb2RlbC5nZXRDYXRlZ29yaWVzRm9yRG9tYWluKHRoZU1vZGVsLCBkb21haW4pLmxlbmd0aDtcbiAgICB2YXIgcmVzID0gc2xvcHB5T3JFeGFjdChkb21haW4sIGZhY3QsIHRoZU1vZGVsKSArIGBpcyBhIGRvbWFpbiB3aXRoICR7Y2F0Y291bnR9IGNhdGVnb3JpZXMgYW5kICR7Y291bnR9IHJlY29yZHNcXG5gO1xuICAgIHZhciBkZXNjID0gdGhlTW9kZWwuZnVsbC5kb21haW5bZG9tYWluXS5kZXNjcmlwdGlvbiB8fCBcIlwiO1xuICAgIGlmIChkZXNjKSB7XG4gICAgICAgIHJlcyArPSBgRGVzY3JpcHRpb246YCArIGRlc2MgKyBgXFxuYDtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZGVzY3JpYmVEb21haW4gPSBkZXNjcmliZURvbWFpbjtcbmZ1bmN0aW9uIGRlc2NyaWJlRmFjdEluRG9tYWluKGZhY3QsIGZpbHRlcmRvbWFpbiwgdGhlTW9kZWwpIHtcbiAgICB2YXIgc2VudGVuY2VzID0gV2hhdElzLmFuYWx5emVDb250ZXh0U3RyaW5nKGZhY3QsIHRoZU1vZGVsLnJ1bGVzKTtcbiAgICAvL2NvbnNvbGUubG9nKFwiaGVyZSBzZW50ZW5jZXMgXCIgKyBKU09OLnN0cmluZ2lmeShzZW50ZW5jZXMpKTtcbiAgICB2YXIgbGVuZ3RoT25lU2VudGVuY2VzID0gc2VudGVuY2VzLnNlbnRlbmNlcy5maWx0ZXIob1NlbnRlbmNlID0+IG9TZW50ZW5jZS5sZW5ndGggPT09IDEpO1xuICAgIHZhciByZXMgPSAnJztcbiAgICAvLyByZW1vdmUgY2F0ZWdvcmllcyBhbmQgZG9tYWluc1xuICAgIHZhciBvbmx5RmFjdHMgPSBsZW5ndGhPbmVTZW50ZW5jZXMuZmlsdGVyKG9TZW50ZW5jZSA9PiB7XG4gICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZVswXSkpO1xuICAgICAgICByZXR1cm4gIWFib3RfZXJiYXNlXzEuV29yZC5Xb3JkLmlzRG9tYWluKG9TZW50ZW5jZVswXSkgJiZcbiAgICAgICAgICAgICFhYm90X2VyYmFzZV8xLldvcmQuV29yZC5pc0ZpbGxlcihvU2VudGVuY2VbMF0pICYmICFhYm90X2VyYmFzZV8xLldvcmQuV29yZC5pc0NhdGVnb3J5KG9TZW50ZW5jZVswXSk7XG4gICAgfSk7XG4gICAgdmFyIG9ubHlEb21haW5zID0gbGVuZ3RoT25lU2VudGVuY2VzLmZpbHRlcihvU2VudGVuY2UgPT4ge1xuICAgICAgICByZXR1cm4gYWJvdF9lcmJhc2VfMS5Xb3JkLldvcmQuaXNEb21haW4ob1NlbnRlbmNlWzBdKTtcbiAgICB9KTtcbiAgICBpZiAob25seURvbWFpbnMgJiYgb25seURvbWFpbnMubGVuZ3RoID4gMCkge1xuICAgICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvbmx5RG9tYWlucykpO1xuICAgICAgICBvbmx5RG9tYWlucy5mb3JFYWNoKGZ1bmN0aW9uIChzZW50ZW5jZSkge1xuICAgICAgICAgICAgdmFyIGRvbWFpbiA9IHNlbnRlbmNlWzBdLm1hdGNoZWRTdHJpbmc7XG4gICAgICAgICAgICBpZiAoIWZpbHRlcmRvbWFpbiB8fCBkb21haW4gPT09IGZpbHRlcmRvbWFpbikge1xuICAgICAgICAgICAgICAgIGRlYnVnbG9nKFwiaGVyZSBtYXRjaCBcIiArIEpTT04uc3RyaW5naWZ5KHNlbnRlbmNlKSk7XG4gICAgICAgICAgICAgICAgcmVzICs9IGRlc2NyaWJlRG9tYWluKGZhY3QsIHNlbnRlbmNlWzBdLm1hdGNoZWRTdHJpbmcsIHRoZU1vZGVsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGRlYnVnbG9nKFwib25seSBmYWN0czogXCIgKyBKU09OLnN0cmluZ2lmeShvbmx5RmFjdHMpKTtcbiAgICB2YXIgcmVjb3JkTWFwID0ge307XG4gICAgdmFyIGRvbWFpbnNNYXAgPSB7fTtcbiAgICB2YXIgbWF0Y2hlZHdvcmRNYXAgPSB7fTtcbiAgICB2YXIgbWF0Y2hlZENhdGVnb3J5TWFwID0ge307XG4gICAgLy8gbG9vayBmb3IgYWxsIHJlY29yZHNcbiAgICBvbmx5RmFjdHMuZm9yRWFjaChvU2VudGVuY2UgPT4gb1NlbnRlbmNlLmZvckVhY2gob1dvcmQgPT4ge1xuICAgICAgICBpbmNyZW1lbnQobWF0Y2hlZHdvcmRNYXAsIG9Xb3JkLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICBpbmNyZW1lbnQobWF0Y2hlZENhdGVnb3J5TWFwLCBvV29yZC5jYXRlZ29yeSk7XG4gICAgfSkpO1xuICAgIC8vIHdlIGhhdmU6XG4gICAgLy8gYSBsaXN0IG9mIGNhdGVnb3JpZXMsXG4gICAgLy8gYSBsaXN0IG9mIG1hdGNoZWRXb3JkcyAgLT5cbiAgICAvL1xuICAgIHZhciBjYXRlZ29yaWVzID0gc29ydGVkS2V5cyhtYXRjaGVkQ2F0ZWdvcnlNYXApO1xuICAgIHZhciBtYXRjaGVkd29yZHMgPSBzb3J0ZWRLZXlzKG1hdGNoZWR3b3JkTWFwKTtcbiAgICBkZWJ1Z2xvZyhcIm1hdGNoZWR3b3JkczogXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkd29yZHMpKTtcbiAgICBkZWJ1Z2xvZyhcImNhdGVnb3JpZXM6IFwiICsgSlNPTi5zdHJpbmdpZnkoY2F0ZWdvcmllcykpO1xuICAgIC8vdmFyIGFsbE1hdGNoZWRXb3JkcyA9IHsgW2tleSA6IHN0cmluZ10gOiBudW1iZXIgfTtcbiAgICB2YXIgZG9tYWluUmVjb3JkQ291bnQgPSB7fTtcbiAgICB2YXIgZG9tYWluTWF0Y2hDYXRDb3VudCA9IHt9O1xuICAgIC8vIHdlIHByZXBhcmUgdGhlIGZvbGxvd2luZyBzdHJ1Y3R1cmVcbiAgICAvL1xuICAgIC8vIHtkb21haW59IDogcmVjb3JkY291bnQ7XG4gICAgLy8ge21hdGNoZWR3b3Jkc30gOlxuICAgIC8vIHtkb21haW59IHttYXRjaGVkd29yZH0ge2NhdGVnb3J5fSBwcmVzZW5jZWNvdW50XG4gICAgdGhlTW9kZWwucmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgaWYgKCFmaWx0ZXJkb21haW4gfHwgcmVjb3JkLl9kb21haW4gPT09IGZpbHRlcmRvbWFpbikge1xuICAgICAgICAgICAgZG9tYWluUmVjb3JkQ291bnRbcmVjb3JkLl9kb21haW5dID0gKGRvbWFpblJlY29yZENvdW50W3JlY29yZC5fZG9tYWluXSB8fCAwKSArIDE7XG4gICAgICAgICAgICBtYXRjaGVkd29yZHMuZm9yRWFjaChtYXRjaGVkd29yZCA9PiBjYXRlZ29yaWVzLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZWNvcmRbY2F0ZWdvcnldID09PSBtYXRjaGVkd29yZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbWQgPSBkb21haW5NYXRjaENhdENvdW50W3JlY29yZC5fZG9tYWluXSA9IGRvbWFpbk1hdGNoQ2F0Q291bnRbcmVjb3JkLl9kb21haW5dIHx8IHt9O1xuICAgICAgICAgICAgICAgICAgICB2YXIgbWRjID0gbWRbbWF0Y2hlZHdvcmRdID0gbWRbbWF0Y2hlZHdvcmRdIHx8IHt9O1xuICAgICAgICAgICAgICAgICAgICBpbmNyZW1lbnQobWRjLCBjYXRlZ29yeSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIDtcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRvbWFpbk1hdGNoQ2F0Q291bnQsIHVuZGVmaW5lZCwgMikpO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRvbWFpblJlY29yZENvdW50LCB1bmRlZmluZWQsIDIpKTtcbiAgICB2YXIgZG9tYWlucyA9IHNvcnRlZEtleXMoZG9tYWluTWF0Y2hDYXRDb3VudCk7XG4gICAgdmFyIHJlc05leHQgPSAnXCInICsgZmFjdCArICdcIiBoYXMgYSBtZWFuaW5nIGluICc7XG4gICAgdmFyIHNpbmdsZSA9IGZhbHNlO1xuICAgIGlmIChPYmplY3Qua2V5cyhkb21haW5NYXRjaENhdENvdW50KS5sZW5ndGggPiAxKSB7XG4gICAgICAgIHJlc05leHQgKz0gJycgKyBkb21haW5zLmxlbmd0aCArXG4gICAgICAgICAgICAnIGRvbWFpbnM6ICcgKyBVdGlscy5saXN0VG9RdW90ZWRDb21tYUFuZChkb21haW5zKSArIFwiXCI7XG4gICAgfVxuICAgIGVsc2UgaWYgKGRvbWFpbnMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIGlmICghZmlsdGVyZG9tYWluKSB7XG4gICAgICAgICAgICByZXNOZXh0ICs9IGBvbmUgYDtcbiAgICAgICAgfVxuICAgICAgICByZXNOZXh0ICs9IGBkb21haW4gXCIke2RvbWFpbnNbMF19XCI6YDtcbiAgICAgICAgc2luZ2xlID0gdHJ1ZTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGlmIChyZXMpIHtcbiAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGZhY3RjbGVhbiA9IFV0aWxzLnN0cmlwUXVvdGVzKGZhY3QpO1xuICAgICAgICBpZiAoZmlsdGVyZG9tYWluKSB7XG4gICAgICAgICAgICByZXR1cm4gYFwiJHtmYWN0Y2xlYW59XCIgaXMgbm8ga25vd24gZmFjdCBpbiBkb21haW4gXCIke2ZpbHRlcmRvbWFpbn1cIi5cXG5gO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBgSSBkb24ndCBrbm93IGFueXRoaW5nIGFib3V0IFwiJHtmYWN0Y2xlYW59XCIuXFxuYDtcbiAgICB9XG4gICAgcmVzICs9IHJlc05leHQgKyBcIlxcblwiOyAvLyAuLi5cXG5cIjtcbiAgICBkb21haW5zLmZvckVhY2goZnVuY3Rpb24gKGRvbWFpbikge1xuICAgICAgICB2YXIgbWQgPSBkb21haW5NYXRjaENhdENvdW50W2RvbWFpbl07XG4gICAgICAgIE9iamVjdC5rZXlzKG1kKS5mb3JFYWNoKG1hdGNoZWRzdHJpbmcgPT4ge1xuICAgICAgICAgICAgdmFyIG1kYyA9IG1kW21hdGNoZWRzdHJpbmddO1xuICAgICAgICAgICAgaWYgKCFzaW5nbGUpIHtcbiAgICAgICAgICAgICAgICByZXMgKz0gJ2luIGRvbWFpbiBcIicgKyBkb21haW4gKyAnXCIgJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBjYXRzaW5nbGUgPSBPYmplY3Qua2V5cyhtZGMpLmxlbmd0aCA9PT0gMTtcbiAgICAgICAgICAgIHJlcyArPSBgJHtzbG9wcHlPckV4YWN0KG1hdGNoZWRzdHJpbmcsIGZhY3QsIHRoZU1vZGVsKX0gYDtcbiAgICAgICAgICAgIGlmICghY2F0c2luZ2xlKSB7XG4gICAgICAgICAgICAgICAgcmVzICs9IGAuLi5cXG5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgT2JqZWN0LmtleXMobWRjKS5mb3JFYWNoKGNhdGVnb3J5ID0+IHtcbiAgICAgICAgICAgICAgICB2YXIgcGVyY2VudCA9IHRvUGVyY2VudChtZGNbY2F0ZWdvcnldLCBkb21haW5SZWNvcmRDb3VudFtkb21haW5dKTtcbiAgICAgICAgICAgICAgICByZXMgKz0gYGlzIGEgdmFsdWUgZm9yIGNhdGVnb3J5IFwiJHtjYXRlZ29yeX1cIiBwcmVzZW50IGluICR7bWRjW2NhdGVnb3J5XX0oJHtwZXJjZW50fSUpIG9mIHJlY29yZHM7XFxuYDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5kZXNjcmliZUZhY3RJbkRvbWFpbiA9IGRlc2NyaWJlRmFjdEluRG9tYWluO1xuZnVuY3Rpb24gZGVzY3JpYmVDYXRlZ29yeShjYXRlZ29yeSwgZmlsdGVyRG9tYWluLCBtb2RlbCwgbWVzc2FnZSkge1xuICAgIHZhciByZXMgPSBbXTtcbiAgICB2YXIgZG9tcyA9IGZkZXZzdGFfbW9ubW92ZV8xLk1vZGVsLmdldERvbWFpbnNGb3JDYXRlZ29yeShtb2RlbCwgY2F0ZWdvcnkpO1xuICAgIGlmIChmaWx0ZXJEb21haW4pIHtcbiAgICAgICAgaWYgKGRvbXMuaW5kZXhPZihmaWx0ZXJEb21haW4pID49IDApIHtcbiAgICAgICAgICAgIHJlcy5wdXNoKGRlc2NyaWJlQ2F0ZWdvcnlJbkRvbWFpbihjYXRlZ29yeSwgZmlsdGVyRG9tYWluLCBtb2RlbCkpO1xuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBkb21zLnNvcnQoKTtcbiAgICBkb21zLmZvckVhY2goZnVuY3Rpb24gKGRvbWFpbikge1xuICAgICAgICByZXMucHVzaChkZXNjcmliZUNhdGVnb3J5SW5Eb21haW4oY2F0ZWdvcnksIGRvbWFpbiwgbW9kZWwpKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5kZXNjcmliZUNhdGVnb3J5ID0gZGVzY3JpYmVDYXRlZ29yeTtcbiIsIi8qKlxuICpcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmV4cGxhaW5cbiAqIEBmaWxlIGV4cGxhaW4udHNcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cbiAqXG4gKiBGdW5jdGlvbnMgZGVhbGluZyB3aXRoIGV4cGxhaW5pbmcgZmFjdHMsIGNhdGVnb3JpZXMgZXRjLlxuICovXG5cblxuaW1wb3J0ICogYXMgSW5wdXRGaWx0ZXIgZnJvbSAnLi9pbnB1dEZpbHRlcic7XG5pbXBvcnQgKiBhcyBBbGdvbCBmcm9tICcuL2FsZ29sJztcbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcblxuY29uc3QgZGVidWdsb2cgPSBkZWJ1ZygnZGVzY3JpYmUnKTtcbmltcG9ydCAqIGFzIGxvZ2dlciBmcm9tICcuLi91dGlscy9sb2dnZXInO1xudmFyIGxvZ1BlcmYgPSBsb2dnZXIucGVyZihcInBlcmZsaXN0YWxsXCIpO1xudmFyIHBlcmZsb2cgPSBkZWJ1ZygncGVyZicpO1xuLy9jb25zdCBwZXJmbG9nID0gbG9nZ2VyLnBlcmYoXCJwZXJmbGlzdGFsbFwiKTtcblxuaW1wb3J0ICogYXMgSU1hdGNoIGZyb20gJy4vaWZtYXRjaCc7XG5cbmltcG9ydCAqIGFzIFRvb2xtYXRjaGVyIGZyb20gJy4vdG9vbG1hdGNoZXInO1xuaW1wb3J0IHsgQnJlYWtEb3duIH0gZnJvbSAnZmRldnN0YV9tb25tb3ZlJztcblxuaW1wb3J0IHsgU2VudGVuY2UgYXMgU2VudGVuY2UgfSBmcm9tICdhYm90X2VyYmFzZSc7XG5cbmltcG9ydCB7IFdvcmQgYXMgV29yZCB9IGZyb20gJ2Fib3RfZXJiYXNlJztcbmltcG9ydCAqIGFzIE9wZXJhdG9yIGZyb20gJy4vb3BlcmF0b3InO1xuXG5pbXBvcnQgKiBhcyBXaGF0SXMgZnJvbSAnLi93aGF0aXMnO1xuXG5pbXBvcnQgeyBNb2RlbCB9IGZyb20gJ2ZkZXZzdGFfbW9ubW92ZSc7XG5cblxuaW1wb3J0ICogYXMgTWF0Y2ggZnJvbSAnLi9tYXRjaCc7XG5cblxuaW1wb3J0ICogYXMgVXRpbHMgZnJvbSAnYWJvdF91dGlscyc7XG5cblxudmFyIHNXb3JkcyA9IHt9O1xuXG5leHBvcnQgZnVuY3Rpb24gaXNTeW5vbnltRm9yKGV4YWN0V29yZCA6IHN0cmluZywgc2xvcHB5V29yZCA6IHN0cmluZywgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzKSA6IGJvb2xlYW4ge1xuICAvLyBUT0RPOiB1c2UgbW9kZWwgc3lub255bXNcbiAgcmV0dXJuIHNsb3BweVdvcmQgPT09IFwibmFtZVwiICYmIGV4YWN0V29yZCA9PT0gXCJlbGVtZW50IG5hbWVcIjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNsb3BweU9yRXhhY3QoZXhhY3RXb3JkIDogc3RyaW5nLCBzbG9wcHlXb3JkIDogc3RyaW5nLCB0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMpIHtcbiAgaWYoZXhhY3RXb3JkLnRvTG93ZXJDYXNlKCkgPT09IHNsb3BweVdvcmQudG9Mb3dlckNhc2UoKSkge1xuICAgIHJldHVybiAnXCInICsgc2xvcHB5V29yZCArICdcIic7XG4gIH1cbiAgLy8gVE9ETywgZmluZCBwbHVyYWwgcyBldGMuXG4gIC8vIHN0aWxsIGV4YWN0LFxuICAvL1xuICBpZihpc1N5bm9ueW1Gb3IoZXhhY3RXb3JkLHNsb3BweVdvcmQsdGhlTW9kZWwpKSB7XG5yZXR1cm4gJ1wiJyArIHNsb3BweVdvcmQgKyAnXCIgKGludGVycHJldGVkIGFzIHN5bm9ueW0gZm9yIFwiJyArIGV4YWN0V29yZCArJ1wiKSc7XG4gIH1cbiAgLy90b2RvLCBmaW5kIGlzIHN5bm9ueW1mb3IgLi4uXG4gIC8vIFRPRE8sIGEgc3lub255bSBmb3IgLi4uXG4gIHJldHVybiAnXCInICsgc2xvcHB5V29yZCArICdcIiAoaW50ZXJwcmV0ZWQgYXMgXCInICsgZXhhY3RXb3JkICsnXCIpJztcbn1cblxuaW50ZXJmYWNlIElEZXNjcmliZUNhdGVnb3J5IHtcbiAgICB0b3RhbHJlY29yZHMgOiBudW1iZXIsXG4gICAgcHJlc2VudHJlY29yZHMgOiBudW1iZXIsXG4gICAgdmFsdWVzIDogeyBba2V5IDogc3RyaW5nXSA6IG51bWJlcn0sXG4gICAgbXVsdGl2YWx1ZWQgOiBib29sZWFuXG4gIH1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvdW50UmVjb3JkUHJlc2VuY2UoY2F0ZWdvcnkgOiBzdHJpbmcsIGRvbWFpbiA6IHN0cmluZywgdGhlTW9kZWwgOiBJTWF0Y2guSU1vZGVscykgOiBJRGVzY3JpYmVDYXRlZ29yeSB7XG4gIHZhciByZXMgPSB7IHRvdGFscmVjb3JkcyA6IDAsXG4gICAgcHJlc2VudHJlY29yZHMgOiAwLFxuICAgIHZhbHVlcyA6IHsgfSwgIC8vIGFuIHRoZWlyIGZyZXF1ZW5jeVxuICAgIG11bHRpdmFsdWVkIDogZmFsc2VcbiAgfSBhcyBJRGVzY3JpYmVDYXRlZ29yeTtcbiAgdGhlTW9kZWwucmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uKHJlY29yZCkge1xuICAgIC8vZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkLHVuZGVmaW5lZCwyKSk7XG4gICAgaWYocmVjb3JkLl9kb21haW4gIT09IGRvbWFpbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXMudG90YWxyZWNvcmRzKys7XG4gICAgdmFyIHZhbCA9IHJlY29yZFtjYXRlZ29yeV07XG4gICAgdmFyIHZhbGFyciA9IFt2YWxdO1xuICAgIGlmKEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgcmVzLm11bHRpdmFsdWVkID0gdHJ1ZTtcbiAgICAgIHZhbGFyciA9IHZhbDtcbiAgICB9XG4gICAgLy8gdG9kbyB3cmFwIGFyclxuICAgIGlmKHZhbCAhPT0gdW5kZWZpbmVkICYmIHZhbCAhPT0gXCJuL2FcIikge1xuICAgICAgcmVzLnByZXNlbnRyZWNvcmRzICsrO1xuICAgIH1cbiAgICB2YWxhcnIuZm9yRWFjaChmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJlcy52YWx1ZXNbdmFsXSA9IChyZXMudmFsdWVzW3ZhbF0gfHwgMCkgKyAxO1xuICAgIH0pXG4gIH0pXG4gIHJldHVybiByZXM7XG59XG5cbi8vIGNhdGVnb3J5ID0+IG1hdGNoZWR3b3Jkc1tdO1xuXG5pbnRlcmZhY2UgSURlc2NyaWJlRmFjdCB7XG4gICAgdG90YWxyZWNvcmRzIDogbnVtYmVyLFxuICAgIHByZXNlbnRyZWNvcmRzIDogbnVtYmVyLFxuICAgIG11bHRpdmFsdWVkIDogYm9vbGVhblxuICB9XG5cbmV4cG9ydCBmdW5jdGlvbiBjb3VudFJlY29yZFByZXNlbmNlRmFjdChmYWN0IDogc3RyaW5nLCBjYXRlZ29yeSA6IHN0cmluZywgZG9tYWluIDogc3RyaW5nLCB0aGVNb2RlbCA6IElNYXRjaC5JTW9kZWxzKSA6IElEZXNjcmliZUZhY3Qge1xuICB2YXIgcmVzID0geyB0b3RhbHJlY29yZHMgOiAwLFxuICAgIHByZXNlbnRyZWNvcmRzIDogMCxcbiAgICB2YWx1ZXMgOiB7IH0sICAvLyBhbiB0aGVpciBmcmVxdWVuY3lcbiAgICBtdWx0aXZhbHVlZCA6IGZhbHNlXG4gIH0gYXMgSURlc2NyaWJlQ2F0ZWdvcnk7XG4gIHRoZU1vZGVsLnJlY29yZHMuZm9yRWFjaChmdW5jdGlvbihyZWNvcmQpIHtcbiAgICAvL2RlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZCx1bmRlZmluZWQsMikpO1xuICAgIGlmKHJlY29yZC5fZG9tYWluICE9PSBkb21haW4pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmVzLnRvdGFscmVjb3JkcysrO1xuICAgIHZhciB2YWwgPSByZWNvcmRbY2F0ZWdvcnldO1xuICAgIHZhciB2YWxhcnIgPSBbdmFsXTtcbiAgICBpZihBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICAgIGlmKHZhbC5pbmRleE9mKGZhY3QpID49IDApIHtcbiAgICAgICAgcmVzLm11bHRpdmFsdWVkID0gdHJ1ZTtcbiAgICAgICAgdmFsYXJyID0gdmFsO1xuICAgICAgICByZXMucHJlc2VudHJlY29yZHMrKztcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHZhbCA9PT0gZmFjdCkge1xuICAgICAgICByZXMucHJlc2VudHJlY29yZHMrKztcbiAgICB9XG4gIH0pXG4gIHJldHVybiByZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWtlVmFsdWVzTGlzdFN0cmluZyhyZWFsdmFsdWVzOiBzdHJpbmdbXSkgOiBzdHJpbmcge1xuICB2YXIgdmFsdWVzU3RyaW5nID0gXCJcIjtcbiAgdmFyIHRvdGFsbGVuID0gMDtcbiAgdmFyIGxpc3RWYWx1ZXMgPSByZWFsdmFsdWVzLmZpbHRlcihmdW5jdGlvbih2YWwsIGluZGV4KSB7XG4gICAgdG90YWxsZW4gPSB0b3RhbGxlbiArIHZhbC5sZW5ndGg7XG4gIHJldHVybiAoaW5kZXggPCBBbGdvbC5EZXNjcmliZVZhbHVlTGlzdE1pbkNvdW50VmFsdWVMaXN0KSB8fCAodG90YWxsZW4gPCBBbGdvbC5EZXNjcmliZVZhbHVlTGlzdExlbmd0aENoYXJMaW1pdCk7XG4gIH0pO1xuICBpZihsaXN0VmFsdWVzLmxlbmd0aCA9PT0gMSAmJiByZWFsdmFsdWVzLmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiAnVGhlIHNvbGUgdmFsdWUgaXMgXFxcIicgKyBsaXN0VmFsdWVzWzBdICsgJ1wiJztcbiAgfVxuICB2YXIgbWF4bGVuID0gbGlzdFZhbHVlcy5yZWR1Y2UoIChwcmV2LHZhbCkgPT4gTWF0aC5tYXgocHJldix2YWwubGVuZ3RoKSwwKTtcbiAgaWYobWF4bGVuID4gMzApIHtcbiAgICByZXR1cm4gXCJQb3NzaWJsZSB2YWx1ZXMgYXJlIC4uLlxcblwiICtcbiAgICAgIGxpc3RWYWx1ZXMucmVkdWNlKCAocHJldix2YWwsaW5kZXgpID0+IChwcmV2ICsgXCIoXCIgKyAoaW5kZXggKyAxKSArICcpOiBcIicgKyB2YWwgKyAnXCJcXG4nXG4gICAgICApLFwiXCIpXG4gICAgICArICggbGlzdFZhbHVlcy5sZW5ndGggPT09IHJlYWx2YWx1ZXMubGVuZ3RoID8gXCJcIiA6IFwiLi4uXCIpO1xuICB9XG4gIHZhciBsaXN0ID0gXCJcIjtcbiAgaWYobGlzdFZhbHVlcy5sZW5ndGggPT09IHJlYWx2YWx1ZXMubGVuZ3RoKSB7XG4gICAgbGlzdCA9IFV0aWxzLmxpc3RUb1F1b3RlZENvbW1hT3IobGlzdFZhbHVlcyk7XG4gIH0gZWxzZSB7XG4gICAgbGlzdCA9ICdcIicgKyBsaXN0VmFsdWVzLmpvaW4oJ1wiLCBcIicpICsgJ1wiJztcbiAgfVxuICByZXR1cm4gXCJQb3NzaWJsZSB2YWx1ZXMgYXJlIC4uLlxcblwiXG4gICAgKyBsaXN0XG4gICAgKyAoIGxpc3RWYWx1ZXMubGVuZ3RoID09PSByZWFsdmFsdWVzLmxlbmd0aCA/IFwiXCIgOiBcIiAuLi5cIik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b1BlcmNlbnQoYSA6IG51bWJlciwgYjogbnVtYmVyKSA6IHN0cmluZyB7XG4gIHJldHVybiBcIlwiICsgKDEwMCogYSAvIGIpLnRvRml4ZWQoMSk7XG59XG5cblxuZXhwb3J0IGludGVyZmFjZSBJQ2F0ZWdvcnlTdGF0cyB7XG4gIGNhdGVnb3J5RGVzYyA6IElNYXRjaC5JQ2F0ZWdvcnlEZXNjLFxuICBwcmVzZW50UmVjb3JkcyA6IG51bWJlcixcbiAgZGlzdGluY3QgOiBzdHJpbmcsXG4gIGRlbHRhIDogc3RyaW5nLFxuICBwZXJjUHJlc2VudCA6IHN0cmluZyxcbiAgc2FtcGxlVmFsdWVzIDogc3RyaW5nLFxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldENhdGVnb3J5U3RhdHNJbkRvbWFpbihjYXRlZ29yeSA6IHN0cmluZywgZmlsdGVyZG9tYWluIDogc3RyaW5nLCB0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMpIDogSUNhdGVnb3J5U3RhdHMge1xuICBjb25zdCByZWNvcmRDb3VudCA9IGNvdW50UmVjb3JkUHJlc2VuY2UoY2F0ZWdvcnksIGZpbHRlcmRvbWFpbiwgdGhlTW9kZWwpO1xuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeSh0aGVNb2RlbC5yZWNvcmRzLmZpbHRlcihhID0+IGEuX2RvbWFpbiA9PT0gXCJDb3Ntb3NcIiksdW5kZWZpbmVkLDIpKTtcbiAgY29uc3QgcGVyY2VudCA9IHRvUGVyY2VudChyZWNvcmRDb3VudC5wcmVzZW50cmVjb3JkcyAsIHJlY29yZENvdW50LnRvdGFscmVjb3Jkcyk7XG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZENvdW50LnZhbHVlcykpO1xuICB2YXIgYWxsVmFsdWVzID1PYmplY3Qua2V5cyhyZWNvcmRDb3VudC52YWx1ZXMpO1xuICB2YXIgcmVhbHZhbHVlcyA9IGFsbFZhbHVlcy5maWx0ZXIodmFsdWUgPT4gKHZhbHVlICE9PSAndW5kZWZpbmVkJykgJiYgKHZhbHVlICE9PSAnbi9hJykpO1xuICBkZWJ1Z2xvZ1xuICByZWFsdmFsdWVzLnNvcnQoKTtcbiAgdmFyIHVuZGVmTmFEZWx0YSA9ICAoYWxsVmFsdWVzLmxlbmd0aCAtIHJlYWx2YWx1ZXMubGVuZ3RoKTtcbiAgdmFyIGRlbHRhID0gICh1bmRlZk5hRGVsdGEpID8gIFwiKCtcIiArIHVuZGVmTmFEZWx0YSArIFwiKVwiIDogXCJcIjtcbiAgY29uc3QgZGlzdGluY3QgPSAnJyArIHJlYWx2YWx1ZXMubGVuZ3RoO1xuICBjb25zdCB2YWx1ZXNMaXN0ID0gbWFrZVZhbHVlc0xpc3RTdHJpbmcocmVhbHZhbHVlcyk7XG4gIHJldHVybiB7XG4gICAgY2F0ZWdvcnlEZXNjIDogdGhlTW9kZWwuZnVsbC5kb21haW5bZmlsdGVyZG9tYWluXS5jYXRlZ29yaWVzW2NhdGVnb3J5XSxcbiAgICBkaXN0aW5jdCA6IGRpc3RpbmN0LFxuICAgIGRlbHRhIDogZGVsdGEsXG4gICAgcHJlc2VudFJlY29yZHMgOiByZWNvcmRDb3VudC5wcmVzZW50cmVjb3JkcyxcbiAgICBwZXJjUHJlc2VudCA6IHBlcmNlbnQsXG4gICAgc2FtcGxlVmFsdWVzIDogdmFsdWVzTGlzdFxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXNjcmliZUNhdGVnb3J5SW5Eb21haW4oY2F0ZWdvcnkgOiBzdHJpbmcsIGZpbHRlcmRvbWFpbiA6IHN0cmluZywgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzKSA6IHN0cmluZyB7XG4vKiAgY29uc3QgcmVjb3JkQ291bnQgPSBjb3VudFJlY29yZFByZXNlbmNlKGNhdGVnb3J5LCBmaWx0ZXJkb21haW4sIHRoZU1vZGVsKTtcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkodGhlTW9kZWwucmVjb3Jkcy5maWx0ZXIoYSA9PiBhLl9kb21haW4gPT09IFwiQ29zbW9zXCIpLHVuZGVmaW5lZCwyKSk7XG4gIGNvbnN0IHBlcmNlbnQgPSB0b1BlcmNlbnQocmVjb3JkQ291bnQucHJlc2VudHJlY29yZHMgLCByZWNvcmRDb3VudC50b3RhbHJlY29yZHMpO1xuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRDb3VudC52YWx1ZXMpKTtcbiAgdmFyIGFsbFZhbHVlcyA9T2JqZWN0LmtleXMocmVjb3JkQ291bnQudmFsdWVzKTtcbiAgdmFyIHJlYWx2YWx1ZXMgPSBhbGxWYWx1ZXMuZmlsdGVyKHZhbHVlID0+ICh2YWx1ZSAhPT0gJ3VuZGVmaW5lZCcpICYmICh2YWx1ZSAhPT0gJ24vYScpKTtcbiAgZGVidWdsb2dcbiAgcmVhbHZhbHVlcy5zb3J0KCk7XG4gIHZhciB1bmRlZk5hRGVsdGEgPSAgKGFsbFZhbHVlcy5sZW5ndGggLSByZWFsdmFsdWVzLmxlbmd0aCk7XG4gIHZhciBkZWx0YSA9ICAodW5kZWZOYURlbHRhKSA/ICBcIigrXCIgKyB1bmRlZk5hRGVsdGEgKyBcIilcIiA6IFwiXCI7XG4gIGNvbnN0IGRpc3RpbmN0ID0gJycgKyByZWFsdmFsdWVzLmxlbmd0aDtcblxuICBjb25zdCB2YWx1ZXNMaXN0ID0gbWFrZVZhbHVlc0xpc3RTdHJpbmcocmVhbHZhbHVlcyk7XG4qL1xuICB2YXIgc3RhdHMgPSBnZXRDYXRlZ29yeVN0YXRzSW5Eb21haW4oY2F0ZWdvcnksZmlsdGVyZG9tYWluLHRoZU1vZGVsKTtcblxuICB2YXIgcmVzID0gJ2lzIGEgY2F0ZWdvcnkgaW4gZG9tYWluIFwiJyArIGZpbHRlcmRvbWFpbiArICdcIlxcbidcbiAgKyBgSXQgaXMgcHJlc2VudCBpbiAke3N0YXRzLnByZXNlbnRSZWNvcmRzfSAoJHtzdGF0cy5wZXJjUHJlc2VudH0lKSBvZiByZWNvcmRzIGluIHRoaXMgZG9tYWluLFxcbmAgK1xuICAgYGhhdmluZyAke3N0YXRzLmRpc3RpbmN0ICsgJyd9JHtzdGF0cy5kZWx0YX0gZGlzdGluY3QgdmFsdWVzLlxcbmBcbiAgKyBzdGF0cy5zYW1wbGVWYWx1ZXM7XG5cbiAgdmFyIGRlc2MgPSB0aGVNb2RlbC5mdWxsLmRvbWFpbltmaWx0ZXJkb21haW5dLmNhdGVnb3JpZXNbY2F0ZWdvcnldIHx8IHt9IGFzIElNYXRjaC5JQ2F0ZWdvcnlEZXNjO1xuICB2YXIgZGVzY3JpcHRpb24gPSBkZXNjLmRlc2NyaXB0aW9uIHx8IFwiXCI7XG4gIGlmIChkZXNjcmlwdGlvbikge1xuICAgIHJlcyArPSBgXFxuRGVzY3JpcHRpb246ICR7ZGVzY3JpcHRpb259YDtcbiAgfVxuICByZXR1cm4gcmVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmluZFJlY29yZHNXaXRoRmFjdChtYXRjaGVkU3RyaW5nOiBzdHJpbmcsIGNhdGVnb3J5IDogc3RyaW5nLCByZWNvcmRzIDogYW55LCBkb21haW5zIDogeyBba2V5IDogc3RyaW5nXSA6IG51bWJlcn0pIDogYW55W10ge1xuICByZXR1cm4gcmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24ocmVjb3JkKSAge1xuXG4gICAgbGV0IHJlcyA9IChyZWNvcmRbY2F0ZWdvcnldID09PSBtYXRjaGVkU3RyaW5nKTtcbiAgICBpZiggcmVzKSB7XG4gICAgICBpbmNyZW1lbnQoZG9tYWlucyxyZWNvcmRzLl9kb21haW4pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGluY3JlbWVudChtYXAgOiB7W2tleTogc3RyaW5nXSA6IG51bWJlcn0sIGtleSA6IHN0cmluZykge1xuICBtYXBba2V5XSA9IChtYXBba2V5XSB8fCAwKSArIDE7XG59XG5cbmZ1bmN0aW9uIHNvcnRlZEtleXM8VD4obWFwIDoge1trZXkgOiBzdHJpbmddIDogVH0pIDogc3RyaW5nW10ge1xuICB2YXIgciA9IE9iamVjdC5rZXlzKG1hcCk7XG4gIHIuc29ydCgpO1xuICByZXR1cm4gcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlc2NyaWJlRG9tYWluKGZhY3QgOiBzdHJpbmcsIGRvbWFpbjogc3RyaW5nLCB0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMpIDogc3RyaW5nIHtcbiAgdmFyIGNvdW50ID0gdGhlTW9kZWwucmVjb3Jkcy5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgcmVjb3JkKSB7XG4gICAgcmV0dXJuIHByZXYgKyAoKHJlY29yZC5fZG9tYWluID09PSBkb21haW4pID8gMSA6IDApO1xuICB9LDApO1xuICB2YXIgY2F0Y291bnQgPSBNb2RlbC5nZXRDYXRlZ29yaWVzRm9yRG9tYWluKHRoZU1vZGVsLCBkb21haW4pLmxlbmd0aDtcbiAgdmFyIHJlcyA9IHNsb3BweU9yRXhhY3QoZG9tYWluLCBmYWN0LCB0aGVNb2RlbCkgKyBgaXMgYSBkb21haW4gd2l0aCAke2NhdGNvdW50fSBjYXRlZ29yaWVzIGFuZCAke2NvdW50fSByZWNvcmRzXFxuYDtcbiAgdmFyIGRlc2MgPSB0aGVNb2RlbC5mdWxsLmRvbWFpbltkb21haW5dLmRlc2NyaXB0aW9uIHx8IFwiXCI7XG4gIGlmKGRlc2MpIHtcbiAgICByZXMgKz0gYERlc2NyaXB0aW9uOmAgKyBkZXNjICsgYFxcbmA7XG4gIH1cbiAgcmV0dXJuIHJlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlc2NyaWJlRmFjdEluRG9tYWluKGZhY3QgOiBzdHJpbmcsIGZpbHRlcmRvbWFpbiA6IHN0cmluZywgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzKSA6IHN0cmluZyB7XG4gIHZhciBzZW50ZW5jZXMgPSBXaGF0SXMuYW5hbHl6ZUNvbnRleHRTdHJpbmcoZmFjdCwgIHRoZU1vZGVsLnJ1bGVzKTtcbiAgLy9jb25zb2xlLmxvZyhcImhlcmUgc2VudGVuY2VzIFwiICsgSlNPTi5zdHJpbmdpZnkoc2VudGVuY2VzKSk7XG4gIHZhciBsZW5ndGhPbmVTZW50ZW5jZXMgPSBzZW50ZW5jZXMuc2VudGVuY2VzLmZpbHRlcihvU2VudGVuY2UgPT4gb1NlbnRlbmNlLmxlbmd0aCA9PT0gMSk7XG4gIHZhciByZXMgPSAnJztcbiAgLy8gcmVtb3ZlIGNhdGVnb3JpZXMgYW5kIGRvbWFpbnNcbiAgdmFyIG9ubHlGYWN0cyA9IGxlbmd0aE9uZVNlbnRlbmNlcy5maWx0ZXIob1NlbnRlbmNlID0+e1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZVswXSkpO1xuICAgIHJldHVybiAhV29yZC5Xb3JkLmlzRG9tYWluKG9TZW50ZW5jZVswXSkgJiZcbiAgICAgICAgICAgIVdvcmQuV29yZC5pc0ZpbGxlcihvU2VudGVuY2VbMF0pICYmICFXb3JkLldvcmQuaXNDYXRlZ29yeShvU2VudGVuY2VbMF0pXG4gIH1cbiAgKTtcbiAgdmFyIG9ubHlEb21haW5zID0gbGVuZ3RoT25lU2VudGVuY2VzLmZpbHRlcihvU2VudGVuY2UgPT57XG4gICAgcmV0dXJuIFdvcmQuV29yZC5pc0RvbWFpbihvU2VudGVuY2VbMF0pO1xuICB9KTtcbiAgaWYob25seURvbWFpbnMgJiYgb25seURvbWFpbnMubGVuZ3RoID4gMCkge1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9ubHlEb21haW5zKSk7XG4gICAgb25seURvbWFpbnMuZm9yRWFjaChmdW5jdGlvbihzZW50ZW5jZSkge1xuICAgICAgdmFyIGRvbWFpbiA9IHNlbnRlbmNlWzBdLm1hdGNoZWRTdHJpbmc7XG4gICAgICBpZiggIWZpbHRlcmRvbWFpbiB8fCBkb21haW4gPT09IGZpbHRlcmRvbWFpbikge1xuICAgICAgICBkZWJ1Z2xvZyhcImhlcmUgbWF0Y2ggXCIgKyBKU09OLnN0cmluZ2lmeShzZW50ZW5jZSkpO1xuICAgICAgICByZXMgKz0gZGVzY3JpYmVEb21haW4oZmFjdCwgc2VudGVuY2VbMF0ubWF0Y2hlZFN0cmluZywgdGhlTW9kZWwpO1xuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBkZWJ1Z2xvZyhcIm9ubHkgZmFjdHM6IFwiICsgSlNPTi5zdHJpbmdpZnkob25seUZhY3RzKSk7XG4gIHZhciByZWNvcmRNYXAgPSB7fTtcbiAgdmFyIGRvbWFpbnNNYXAgPSB7fSBhcyB7W2tleTogc3RyaW5nXSA6IG51bWJlcn07XG4gIHZhciBtYXRjaGVkd29yZE1hcCA9IHt9IGFzIHtba2V5OiBzdHJpbmddIDogbnVtYmVyfTtcbiAgdmFyIG1hdGNoZWRDYXRlZ29yeU1hcCA9IHt9IGFzIHtba2V5OiBzdHJpbmddIDogbnVtYmVyfTtcbiAgLy8gbG9vayBmb3IgYWxsIHJlY29yZHNcbiAgb25seUZhY3RzLmZvckVhY2gob1NlbnRlbmNlID0+XG4gICAgb1NlbnRlbmNlLmZvckVhY2gob1dvcmQgPT5cbiAgICAgIHtcbiAgICAgICAgaW5jcmVtZW50KG1hdGNoZWR3b3JkTWFwLCBvV29yZC5tYXRjaGVkU3RyaW5nKTtcbiAgICAgICAgaW5jcmVtZW50KG1hdGNoZWRDYXRlZ29yeU1hcCwgb1dvcmQuY2F0ZWdvcnkpO1xuICAgICAgfVxuICAgIClcbiAgKTtcbiAgLy8gd2UgaGF2ZTpcbiAgLy8gYSBsaXN0IG9mIGNhdGVnb3JpZXMsXG4gIC8vIGEgbGlzdCBvZiBtYXRjaGVkV29yZHMgIC0+XG4gIC8vXG5cbiAgdmFyIGNhdGVnb3JpZXMgPSBzb3J0ZWRLZXlzKG1hdGNoZWRDYXRlZ29yeU1hcCk7XG4gIHZhciBtYXRjaGVkd29yZHMgPSBzb3J0ZWRLZXlzKG1hdGNoZWR3b3JkTWFwKTtcbiAgZGVidWdsb2coXCJtYXRjaGVkd29yZHM6IFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZHdvcmRzKSk7XG4gIGRlYnVnbG9nKFwiY2F0ZWdvcmllczogXCIgKyBKU09OLnN0cmluZ2lmeShjYXRlZ29yaWVzKSk7XG5cbiAgLy92YXIgYWxsTWF0Y2hlZFdvcmRzID0geyBba2V5IDogc3RyaW5nXSA6IG51bWJlciB9O1xuICB2YXIgZG9tYWluUmVjb3JkQ291bnQgPSB7fSBhcyB7W2tleTogc3RyaW5nXSA6IG51bWJlcn07XG4gIHZhciBkb21haW5NYXRjaENhdENvdW50ID0ge30gYXMge1trZXk6IHN0cmluZ10gOlxuICAgICAgIHtba2V5OiBzdHJpbmddIDpcbiAgICAge1trZXk6IHN0cmluZ10gOiBudW1iZXJ9fX07XG4gIC8vIHdlIHByZXBhcmUgdGhlIGZvbGxvd2luZyBzdHJ1Y3R1cmVcbiAgLy9cbiAgLy8ge2RvbWFpbn0gOiByZWNvcmRjb3VudDtcbiAgLy8ge21hdGNoZWR3b3Jkc30gOlxuICAvLyB7ZG9tYWlufSB7bWF0Y2hlZHdvcmR9IHtjYXRlZ29yeX0gcHJlc2VuY2Vjb3VudFxuICB0aGVNb2RlbC5yZWNvcmRzLmZvckVhY2goZnVuY3Rpb24ocmVjb3JkKSB7XG4gICAgaWYoIWZpbHRlcmRvbWFpbiB8fCByZWNvcmQuX2RvbWFpbiA9PT0gZmlsdGVyZG9tYWluICkge1xuICAgICAgZG9tYWluUmVjb3JkQ291bnRbcmVjb3JkLl9kb21haW5dID0gKGRvbWFpblJlY29yZENvdW50W3JlY29yZC5fZG9tYWluXSB8fCAwKSArIDE7XG4gICAgICBtYXRjaGVkd29yZHMuZm9yRWFjaChtYXRjaGVkd29yZCA9PlxuICAgICAgICBjYXRlZ29yaWVzLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xuICAgICAgICAgIGlmKCByZWNvcmRbY2F0ZWdvcnldID09PSBtYXRjaGVkd29yZCkge1xuICAgICAgICAgICAgdmFyIG1kID0gZG9tYWluTWF0Y2hDYXRDb3VudFtyZWNvcmQuX2RvbWFpbl0gPSBkb21haW5NYXRjaENhdENvdW50W3JlY29yZC5fZG9tYWluXSB8fCB7fTtcbiAgICAgICAgICAgIHZhciBtZGMgPSBtZFttYXRjaGVkd29yZF0gPSAgbWRbbWF0Y2hlZHdvcmRdIHx8IHt9O1xuICAgICAgICAgICAgaW5jcmVtZW50KG1kYyxjYXRlZ29yeSk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICApXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRvbWFpbk1hdGNoQ2F0Q291bnQsdW5kZWZpbmVkLDIpKTtcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZG9tYWluUmVjb3JkQ291bnQsdW5kZWZpbmVkLDIpKTtcbiAgdmFyIGRvbWFpbnMgPSBzb3J0ZWRLZXlzKGRvbWFpbk1hdGNoQ2F0Q291bnQpO1xuICB2YXIgcmVzTmV4dCA9ICAnXCInICsgZmFjdCArICdcIiBoYXMgYSBtZWFuaW5nIGluICc7XG4gIHZhciBzaW5nbGUgPSBmYWxzZTtcbiAgaWYoT2JqZWN0LmtleXMoZG9tYWluTWF0Y2hDYXRDb3VudCkubGVuZ3RoID4gMSkge1xuICAgIHJlc05leHQgKz0gJycgKyBkb21haW5zLmxlbmd0aCArXG4gICAgICAgICAgICAgICcgZG9tYWluczogJyArIFV0aWxzLmxpc3RUb1F1b3RlZENvbW1hQW5kKGRvbWFpbnMpICsgXCJcIjtcbiAgfSBlbHNlIGlmKGRvbWFpbnMubGVuZ3RoID09PSAxKSB7XG4gICAgaWYoIWZpbHRlcmRvbWFpbikge1xuICAgICAgcmVzTmV4dCArPSBgb25lIGA7XG4gICAgfVxuICAgIHJlc05leHQgKz0gYGRvbWFpbiBcIiR7ZG9tYWluc1swXX1cIjpgO1xuICAgIHNpbmdsZSA9IHRydWU7XG4gIH0gZWxzZSB7XG4gICAgaWYocmVzKSB7XG4gICAgICByZXR1cm4gcmVzO1xuICAgIH1cbiAgICB2YXIgZmFjdGNsZWFuID0gVXRpbHMuc3RyaXBRdW90ZXMoZmFjdCk7XG4gICAgaWYoZmlsdGVyZG9tYWluKSB7XG4gICAgICByZXR1cm4gYFwiJHtmYWN0Y2xlYW59XCIgaXMgbm8ga25vd24gZmFjdCBpbiBkb21haW4gXCIke2ZpbHRlcmRvbWFpbn1cIi5cXG5gO1xuICAgIH1cbiAgICByZXR1cm4gYEkgZG9uJ3Qga25vdyBhbnl0aGluZyBhYm91dCBcIiR7ZmFjdGNsZWFufVwiLlxcbmA7XG4gIH1cbiAgcmVzICs9IHJlc05leHQgKyBcIlxcblwiOyAvLyAuLi5cXG5cIjtcbiAgZG9tYWlucy5mb3JFYWNoKGZ1bmN0aW9uKGRvbWFpbikge1xuICAgIHZhciBtZCA9IGRvbWFpbk1hdGNoQ2F0Q291bnRbZG9tYWluXTtcbiAgICBPYmplY3Qua2V5cyhtZCkuZm9yRWFjaChtYXRjaGVkc3RyaW5nID0+IHtcbiAgICAgIHZhciBtZGMgPSBtZFttYXRjaGVkc3RyaW5nXTtcbiAgICAgIGlmKCFzaW5nbGUpIHtcbiAgICAgICAgcmVzICs9ICdpbiBkb21haW4gXCInICsgZG9tYWluICsgJ1wiICc7XG4gICAgICB9XG4gICAgICB2YXIgY2F0c2luZ2xlID0gT2JqZWN0LmtleXMobWRjKS5sZW5ndGggPT09IDE7XG4gICAgICByZXMgKz0gYCR7c2xvcHB5T3JFeGFjdChtYXRjaGVkc3RyaW5nLGZhY3QsdGhlTW9kZWwpfSBgO1xuICAgICAgaWYoIWNhdHNpbmdsZSkge1xuICAgICAgICByZXMgKz0gYC4uLlxcbmA7XG4gICAgICB9XG4gICAgICBPYmplY3Qua2V5cyhtZGMpLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xuICAgICAgdmFyIHBlcmNlbnQgPSAgdG9QZXJjZW50KG1kY1tjYXRlZ29yeV0sZG9tYWluUmVjb3JkQ291bnRbZG9tYWluXSk7XG5cbiAgICAgICAgcmVzICs9IGBpcyBhIHZhbHVlIGZvciBjYXRlZ29yeSBcIiR7Y2F0ZWdvcnl9XCIgcHJlc2VudCBpbiAke21kY1tjYXRlZ29yeV19KCR7cGVyY2VudH0lKSBvZiByZWNvcmRzO1xcbmA7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG4gIHJldHVybiByZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXNjcmliZUNhdGVnb3J5KGNhdGVnb3J5IDogc3RyaW5nLCBmaWx0ZXJEb21haW46IHN0cmluZywgbW9kZWw6IElNYXRjaC5JTW9kZWxzLG1lc3NhZ2UgOiBzdHJpbmcpIDogc3RyaW5nW10ge1xuICB2YXIgcmVzID0gW107XG4gIHZhciBkb21zID0gTW9kZWwuZ2V0RG9tYWluc0ZvckNhdGVnb3J5KG1vZGVsLGNhdGVnb3J5KTtcbiAgaWYoZmlsdGVyRG9tYWluKSB7XG4gICAgaWYoZG9tcy5pbmRleE9mKGZpbHRlckRvbWFpbikgPj0gMCkge1xuICAgICAgcmVzLnB1c2goZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluKGNhdGVnb3J5LGZpbHRlckRvbWFpbixtb2RlbCkpO1xuICAgICAgcmV0dXJuIHJlcztcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgfVxuICBkb21zLnNvcnQoKTtcbiAgZG9tcy5mb3JFYWNoKGZ1bmN0aW9uKGRvbWFpbikge1xuICAgICAgICByZXMucHVzaChkZXNjcmliZUNhdGVnb3J5SW5Eb21haW4oY2F0ZWdvcnksIGRvbWFpbiwgbW9kZWwpKTtcbiAgfSk7XG4gIHJldHVybiByZXM7XG59XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
