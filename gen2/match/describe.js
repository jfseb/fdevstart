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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9kZXNjcmliZS50cyIsIm1hdGNoL2Rlc2NyaWJlLmpzIl0sIm5hbWVzIjpbIkFsZ29sIiwicmVxdWlyZSIsImRlYnVnIiwiZGVidWdsb2ciLCJsb2dnZXIiLCJsb2dQZXJmIiwicGVyZiIsInBlcmZsb2ciLCJXb3JkIiwiV2hhdElzIiwiTW9kZWwiLCJVdGlscyIsInNXb3JkcyIsImlzU3lub255bUZvciIsImV4YWN0V29yZCIsInNsb3BweVdvcmQiLCJ0aGVNb2RlbCIsImV4cG9ydHMiLCJzbG9wcHlPckV4YWN0IiwidG9Mb3dlckNhc2UiLCJjb3VudFJlY29yZFByZXNlbmNlIiwiY2F0ZWdvcnkiLCJkb21haW4iLCJyZXMiLCJ0b3RhbHJlY29yZHMiLCJwcmVzZW50cmVjb3JkcyIsInZhbHVlcyIsIm11bHRpdmFsdWVkIiwicmVjb3JkcyIsImZvckVhY2giLCJyZWNvcmQiLCJfZG9tYWluIiwidmFsIiwidmFsYXJyIiwiQXJyYXkiLCJpc0FycmF5IiwidW5kZWZpbmVkIiwiY291bnRSZWNvcmRQcmVzZW5jZUZhY3QiLCJmYWN0IiwiaW5kZXhPZiIsIm1ha2VWYWx1ZXNMaXN0U3RyaW5nIiwicmVhbHZhbHVlcyIsInZhbHVlc1N0cmluZyIsInRvdGFsbGVuIiwibGlzdFZhbHVlcyIsImZpbHRlciIsImluZGV4IiwibGVuZ3RoIiwiRGVzY3JpYmVWYWx1ZUxpc3RNaW5Db3VudFZhbHVlTGlzdCIsIkRlc2NyaWJlVmFsdWVMaXN0TGVuZ3RoQ2hhckxpbWl0IiwibWF4bGVuIiwicmVkdWNlIiwicHJldiIsIk1hdGgiLCJtYXgiLCJsaXN0IiwibGlzdFRvUXVvdGVkQ29tbWFPciIsImpvaW4iLCJ0b1BlcmNlbnQiLCJhIiwiYiIsInRvRml4ZWQiLCJnZXRDYXRlZ29yeVN0YXRzSW5Eb21haW4iLCJmaWx0ZXJkb21haW4iLCJyZWNvcmRDb3VudCIsIkpTT04iLCJzdHJpbmdpZnkiLCJwZXJjZW50IiwiYWxsVmFsdWVzIiwiT2JqZWN0Iiwia2V5cyIsInZhbHVlIiwic29ydCIsInVuZGVmTmFEZWx0YSIsImRlbHRhIiwiZGlzdGluY3QiLCJ2YWx1ZXNMaXN0IiwiY2F0ZWdvcnlEZXNjIiwiZnVsbCIsImNhdGVnb3JpZXMiLCJwcmVzZW50UmVjb3JkcyIsInBlcmNQcmVzZW50Iiwic2FtcGxlVmFsdWVzIiwiZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluIiwic3RhdHMiLCJkZXNjIiwiZGVzY3JpcHRpb24iLCJmaW5kUmVjb3Jkc1dpdGhGYWN0IiwibWF0Y2hlZFN0cmluZyIsImRvbWFpbnMiLCJpbmNyZW1lbnQiLCJtYXAiLCJrZXkiLCJzb3J0ZWRLZXlzIiwiciIsImRlc2NyaWJlRG9tYWluIiwiY291bnQiLCJjYXRjb3VudCIsImdldENhdGVnb3JpZXNGb3JEb21haW4iLCJkZXNjcmliZUZhY3RJbkRvbWFpbiIsInNlbnRlbmNlcyIsImFuYWx5emVDb250ZXh0U3RyaW5nIiwicnVsZXMiLCJsZW5ndGhPbmVTZW50ZW5jZXMiLCJvU2VudGVuY2UiLCJvbmx5RmFjdHMiLCJpc0RvbWFpbiIsImlzRmlsbGVyIiwiaXNDYXRlZ29yeSIsIm9ubHlEb21haW5zIiwic2VudGVuY2UiLCJyZWNvcmRNYXAiLCJkb21haW5zTWFwIiwibWF0Y2hlZHdvcmRNYXAiLCJtYXRjaGVkQ2F0ZWdvcnlNYXAiLCJvV29yZCIsIm1hdGNoZWR3b3JkcyIsImRvbWFpblJlY29yZENvdW50IiwiZG9tYWluTWF0Y2hDYXRDb3VudCIsIm1hdGNoZWR3b3JkIiwibWQiLCJtZGMiLCJyZXNOZXh0Iiwic2luZ2xlIiwibGlzdFRvUXVvdGVkQ29tbWFBbmQiLCJtYXRjaGVkc3RyaW5nIiwiY2F0c2luZ2xlIiwiZGVzY3JpYmVDYXRlZ29yeSIsImZpbHRlckRvbWFpbiIsIm1vZGVsIiwibWVzc2FnZSIsImRvbXMiLCJnZXREb21haW5zRm9yQ2F0ZWdvcnkiLCJwdXNoIl0sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7QUNRQTs7QURHQSxJQUFBQSxRQUFBQyxRQUFBLFNBQUEsQ0FBQTtBQUNBLElBQUFDLFFBQUFELFFBQUEsT0FBQSxDQUFBO0FBRUEsSUFBTUUsV0FBV0QsTUFBTSxVQUFOLENBQWpCO0FBQ0EsSUFBQUUsU0FBQUgsUUFBQSxpQkFBQSxDQUFBO0FBQ0EsSUFBSUksVUFBVUQsT0FBT0UsSUFBUCxDQUFZLGFBQVosQ0FBZDtBQUNBLElBQUlDLFVBQVVMLE1BQU0sTUFBTixDQUFkO0FBVUEsSUFBQU0sT0FBQVAsUUFBQSxRQUFBLENBQUE7QUFHQSxJQUFBUSxTQUFBUixRQUFBLFVBQUEsQ0FBQTtBQUVBLElBQUFTLFFBQUFULFFBQUEsZ0JBQUEsQ0FBQTtBQUlBLElBQUFVLFFBQUFWLFFBQUEsZ0JBQUEsQ0FBQTtBQUdBLElBQUlXLFNBQVMsRUFBYjtBQUVBLFNBQUFDLFlBQUEsQ0FBNkJDLFNBQTdCLEVBQWlEQyxVQUFqRCxFQUFzRUMsUUFBdEUsRUFBOEY7QUFDNUY7QUFDQSxXQUFPRCxlQUFlLE1BQWYsSUFBeUJELGNBQWMsY0FBOUM7QUFDRDtBQUhERyxRQUFBSixZQUFBLEdBQUFBLFlBQUE7QUFLQSxTQUFBSyxhQUFBLENBQThCSixTQUE5QixFQUFrREMsVUFBbEQsRUFBdUVDLFFBQXZFLEVBQStGO0FBQzdGLFFBQUdGLFVBQVVLLFdBQVYsT0FBNEJKLFdBQVdJLFdBQVgsRUFBL0IsRUFBeUQ7QUFDdkQsZUFBTyxNQUFNSixVQUFOLEdBQW1CLEdBQTFCO0FBQ0Q7QUFDRDtBQUNBO0FBQ0E7QUFDQSxRQUFHRixhQUFhQyxTQUFiLEVBQXVCQyxVQUF2QixFQUFrQ0MsUUFBbEMsQ0FBSCxFQUFnRDtBQUNsRCxlQUFPLE1BQU1ELFVBQU4sR0FBbUIsaUNBQW5CLEdBQXVERCxTQUF2RCxHQUFrRSxJQUF6RTtBQUNHO0FBQ0Q7QUFDQTtBQUNBLFdBQU8sTUFBTUMsVUFBTixHQUFtQixxQkFBbkIsR0FBMkNELFNBQTNDLEdBQXNELElBQTdEO0FBQ0Q7QUFiREcsUUFBQUMsYUFBQSxHQUFBQSxhQUFBO0FBc0JBLFNBQUFFLG1CQUFBLENBQW9DQyxRQUFwQyxFQUF1REMsTUFBdkQsRUFBd0VOLFFBQXhFLEVBQWlHO0FBQy9GLFFBQUlPLE1BQU0sRUFBRUMsY0FBZSxDQUFqQjtBQUNSQyx3QkFBaUIsQ0FEVDtBQUVSQyxnQkFBUyxFQUZEO0FBR1JDLHFCQUFjO0FBSE4sS0FBVjtBQUtBWCxhQUFTWSxPQUFULENBQWlCQyxPQUFqQixDQUF5QixVQUFTQyxNQUFULEVBQWU7QUFDdEM7QUFDQSxZQUFHQSxPQUFPQyxPQUFQLEtBQW1CVCxNQUF0QixFQUE4QjtBQUM1QjtBQUNEO0FBQ0RDLFlBQUlDLFlBQUo7QUFDQSxZQUFJUSxNQUFNRixPQUFPVCxRQUFQLENBQVY7QUFDQSxZQUFJWSxTQUFTLENBQUNELEdBQUQsQ0FBYjtBQUNBLFlBQUdFLE1BQU1DLE9BQU4sQ0FBY0gsR0FBZCxDQUFILEVBQXVCO0FBQ3JCVCxnQkFBSUksV0FBSixHQUFrQixJQUFsQjtBQUNBTSxxQkFBU0QsR0FBVDtBQUNEO0FBQ0Q7QUFDQSxZQUFHQSxRQUFRSSxTQUFSLElBQXFCSixRQUFRLEtBQWhDLEVBQXVDO0FBQ3JDVCxnQkFBSUUsY0FBSjtBQUNEO0FBQ0RRLGVBQU9KLE9BQVAsQ0FBZSxVQUFTRyxHQUFULEVBQVk7QUFDekJULGdCQUFJRyxNQUFKLENBQVdNLEdBQVgsSUFBa0IsQ0FBQ1QsSUFBSUcsTUFBSixDQUFXTSxHQUFYLEtBQW1CLENBQXBCLElBQXlCLENBQTNDO0FBQ0QsU0FGRDtBQUdELEtBbkJEO0FBb0JBLFdBQU9ULEdBQVA7QUFDRDtBQTNCRE4sUUFBQUcsbUJBQUEsR0FBQUEsbUJBQUE7QUFxQ0EsU0FBQWlCLHVCQUFBLENBQXdDQyxJQUF4QyxFQUF1RGpCLFFBQXZELEVBQTBFQyxNQUExRSxFQUEyRk4sUUFBM0YsRUFBb0g7QUFDbEgsUUFBSU8sTUFBTSxFQUFFQyxjQUFlLENBQWpCO0FBQ1JDLHdCQUFpQixDQURUO0FBRVJDLGdCQUFTLEVBRkQ7QUFHUkMscUJBQWM7QUFITixLQUFWO0FBS0FYLGFBQVNZLE9BQVQsQ0FBaUJDLE9BQWpCLENBQXlCLFVBQVNDLE1BQVQsRUFBZTtBQUN0QztBQUNBLFlBQUdBLE9BQU9DLE9BQVAsS0FBbUJULE1BQXRCLEVBQThCO0FBQzVCO0FBQ0Q7QUFDREMsWUFBSUMsWUFBSjtBQUNBLFlBQUlRLE1BQU1GLE9BQU9ULFFBQVAsQ0FBVjtBQUNBLFlBQUlZLFNBQVMsQ0FBQ0QsR0FBRCxDQUFiO0FBQ0EsWUFBR0UsTUFBTUMsT0FBTixDQUFjSCxHQUFkLENBQUgsRUFBdUI7QUFDckIsZ0JBQUdBLElBQUlPLE9BQUosQ0FBWUQsSUFBWixLQUFxQixDQUF4QixFQUEyQjtBQUN6QmYsb0JBQUlJLFdBQUosR0FBa0IsSUFBbEI7QUFDQU0seUJBQVNELEdBQVQ7QUFDQVQsb0JBQUlFLGNBQUo7QUFDRDtBQUNGLFNBTkQsTUFNTyxJQUFJTyxRQUFRTSxJQUFaLEVBQWtCO0FBQ3JCZixnQkFBSUUsY0FBSjtBQUNIO0FBQ0YsS0FqQkQ7QUFrQkEsV0FBT0YsR0FBUDtBQUNEO0FBekJETixRQUFBb0IsdUJBQUEsR0FBQUEsdUJBQUE7QUEyQkEsU0FBQUcsb0JBQUEsQ0FBcUNDLFVBQXJDLEVBQXlEO0FBQ3ZELFFBQUlDLGVBQWUsRUFBbkI7QUFDQSxRQUFJQyxXQUFXLENBQWY7QUFDQSxRQUFJQyxhQUFhSCxXQUFXSSxNQUFYLENBQWtCLFVBQVNiLEdBQVQsRUFBY2MsS0FBZCxFQUFtQjtBQUNwREgsbUJBQVdBLFdBQVdYLElBQUllLE1BQTFCO0FBQ0YsZUFBUUQsUUFBUTlDLE1BQU1nRCxrQ0FBZixJQUF1REwsV0FBVzNDLE1BQU1pRCxnQ0FBL0U7QUFDQyxLQUhnQixDQUFqQjtBQUlBLFFBQUdMLFdBQVdHLE1BQVgsS0FBc0IsQ0FBdEIsSUFBMkJOLFdBQVdNLE1BQVgsS0FBc0IsQ0FBcEQsRUFBdUQ7QUFDckQsZUFBTyx5QkFBeUJILFdBQVcsQ0FBWCxDQUF6QixHQUF5QyxHQUFoRDtBQUNEO0FBQ0QsUUFBSU0sU0FBU04sV0FBV08sTUFBWCxDQUFtQixVQUFDQyxJQUFELEVBQU1wQixHQUFOLEVBQVM7QUFBSyxlQUFBcUIsS0FBS0MsR0FBTCxDQUFTRixJQUFULEVBQWNwQixJQUFJZSxNQUFsQixDQUFBO0FBQXlCLEtBQTFELEVBQTJELENBQTNELENBQWI7QUFDQSxRQUFHRyxTQUFTLEVBQVosRUFBZ0I7QUFDZCxlQUFPLDhCQUNMTixXQUFXTyxNQUFYLENBQW1CLFVBQUNDLElBQUQsRUFBTXBCLEdBQU4sRUFBVWMsS0FBVixFQUFlO0FBQUssbUJBQUNNLE9BQU8sR0FBUCxJQUFjTixRQUFRLENBQXRCLElBQTJCLE1BQTNCLEdBQW9DZCxHQUFwQyxHQUEwQyxLQUEzQztBQUN0QyxTQURELEVBQ0UsRUFERixDQURLLElBR0RZLFdBQVdHLE1BQVgsS0FBc0JOLFdBQVdNLE1BQWpDLEdBQTBDLEVBQTFDLEdBQStDLEtBSDlDLENBQVA7QUFJRDtBQUNELFFBQUlRLE9BQU8sRUFBWDtBQUNBLFFBQUdYLFdBQVdHLE1BQVgsS0FBc0JOLFdBQVdNLE1BQXBDLEVBQTRDO0FBQzFDUSxlQUFPNUMsTUFBTTZDLG1CQUFOLENBQTBCWixVQUExQixDQUFQO0FBQ0QsS0FGRCxNQUVPO0FBQ0xXLGVBQU8sTUFBTVgsV0FBV2EsSUFBWCxDQUFnQixNQUFoQixDQUFOLEdBQWdDLEdBQXZDO0FBQ0Q7QUFDRCxXQUFPLDhCQUNIRixJQURHLElBRURYLFdBQVdHLE1BQVgsS0FBc0JOLFdBQVdNLE1BQWpDLEdBQTBDLEVBQTFDLEdBQStDLE1BRjlDLENBQVA7QUFHRDtBQTFCRDlCLFFBQUF1QixvQkFBQSxHQUFBQSxvQkFBQTtBQTRCQSxTQUFBa0IsU0FBQSxDQUEwQkMsQ0FBMUIsRUFBc0NDLENBQXRDLEVBQStDO0FBQzdDLFdBQU8sS0FBSyxDQUFDLE1BQUtELENBQUwsR0FBU0MsQ0FBVixFQUFhQyxPQUFiLENBQXFCLENBQXJCLENBQVo7QUFDRDtBQUZENUMsUUFBQXlDLFNBQUEsR0FBQUEsU0FBQTtBQVlDO0FBRUQsU0FBQUksd0JBQUEsQ0FBeUN6QyxRQUF6QyxFQUE0RDBDLFlBQTVELEVBQW1GL0MsUUFBbkYsRUFBMkc7QUFDekcsUUFBTWdELGNBQWM1QyxvQkFBb0JDLFFBQXBCLEVBQThCMEMsWUFBOUIsRUFBNEMvQyxRQUE1QyxDQUFwQjtBQUNBYixhQUFTOEQsS0FBS0MsU0FBTCxDQUFlbEQsU0FBU1ksT0FBVCxDQUFpQmlCLE1BQWpCLENBQXdCLFVBQUFjLENBQUEsRUFBQztBQUFJLGVBQUFBLEVBQUU1QixPQUFGLEtBQWMsUUFBZDtBQUFzQixLQUFuRCxDQUFmLEVBQW9FSyxTQUFwRSxFQUE4RSxDQUE5RSxDQUFUO0FBQ0EsUUFBTStCLFVBQVVULFVBQVVNLFlBQVl2QyxjQUF0QixFQUF1Q3VDLFlBQVl4QyxZQUFuRCxDQUFoQjtBQUNBckIsYUFBUzhELEtBQUtDLFNBQUwsQ0FBZUYsWUFBWXRDLE1BQTNCLENBQVQ7QUFDQSxRQUFJMEMsWUFBV0MsT0FBT0MsSUFBUCxDQUFZTixZQUFZdEMsTUFBeEIsQ0FBZjtBQUNBLFFBQUllLGFBQWEyQixVQUFVdkIsTUFBVixDQUFpQixVQUFBMEIsS0FBQSxFQUFLO0FBQUksZUFBQ0EsVUFBVSxXQUFYLElBQTRCQSxVQUFVLEtBQXRDO0FBQTRDLEtBQXRFLENBQWpCO0FBQ0FwRTtBQUNBc0MsZUFBVytCLElBQVg7QUFDQSxRQUFJQyxlQUFpQkwsVUFBVXJCLE1BQVYsR0FBbUJOLFdBQVdNLE1BQW5EO0FBQ0EsUUFBSTJCLFFBQVVELFlBQUQsR0FBa0IsT0FBT0EsWUFBUCxHQUFzQixHQUF4QyxHQUE4QyxFQUEzRDtBQUNBLFFBQU1FLFdBQVcsS0FBS2xDLFdBQVdNLE1BQWpDO0FBQ0EsUUFBTTZCLGFBQWFwQyxxQkFBcUJDLFVBQXJCLENBQW5CO0FBQ0EsV0FBTztBQUNMb0Msc0JBQWU3RCxTQUFTOEQsSUFBVCxDQUFjeEQsTUFBZCxDQUFxQnlDLFlBQXJCLEVBQW1DZ0IsVUFBbkMsQ0FBOEMxRCxRQUE5QyxDQURWO0FBRUxzRCxrQkFBV0EsUUFGTjtBQUdMRCxlQUFRQSxLQUhIO0FBSUxNLHdCQUFpQmhCLFlBQVl2QyxjQUp4QjtBQUtMd0QscUJBQWNkLE9BTFQ7QUFNTGUsc0JBQWVOO0FBTlYsS0FBUDtBQVFEO0FBckJEM0QsUUFBQTZDLHdCQUFBLEdBQUFBLHdCQUFBO0FBdUJBLFNBQUFxQix3QkFBQSxDQUF5QzlELFFBQXpDLEVBQTREMEMsWUFBNUQsRUFBbUYvQyxRQUFuRixFQUEyRztBQUMzRzs7Ozs7Ozs7Ozs7Ozs7QUFjRSxRQUFJb0UsUUFBUXRCLHlCQUF5QnpDLFFBQXpCLEVBQWtDMEMsWUFBbEMsRUFBK0MvQyxRQUEvQyxDQUFaO0FBRUEsUUFBSU8sTUFBTSw4QkFBOEJ3QyxZQUE5QixHQUE2QyxLQUE3QyxJQUNSLHNCQUFvQnFCLE1BQU1KLGNBQTFCLEdBQXdDLElBQXhDLEdBQTZDSSxNQUFNSCxXQUFuRCxHQUE4RCxpQ0FEdEQsS0FFVCxhQUFVRyxNQUFNVCxRQUFOLEdBQWlCLEVBQTNCLElBQWdDUyxNQUFNVixLQUF0QyxHQUEyQyxxQkFGbEMsSUFHUlUsTUFBTUYsWUFIUjtBQUtBLFFBQUlHLE9BQU9yRSxTQUFTOEQsSUFBVCxDQUFjeEQsTUFBZCxDQUFxQnlDLFlBQXJCLEVBQW1DZ0IsVUFBbkMsQ0FBOEMxRCxRQUE5QyxLQUEyRCxFQUF0RTtBQUNBLFFBQUlpRSxjQUFjRCxLQUFLQyxXQUFMLElBQW9CLEVBQXRDO0FBQ0EsUUFBSUEsV0FBSixFQUFpQjtBQUNmL0QsZUFBTyxvQkFBa0IrRCxXQUF6QjtBQUNEO0FBQ0QsV0FBTy9ELEdBQVA7QUFDRDtBQTVCRE4sUUFBQWtFLHdCQUFBLEdBQUFBLHdCQUFBO0FBOEJBLFNBQUFJLG1CQUFBLENBQW9DQyxhQUFwQyxFQUEyRG5FLFFBQTNELEVBQThFTyxPQUE5RSxFQUE2RjZELE9BQTdGLEVBQWlJO0FBQy9ILFdBQU83RCxRQUFRaUIsTUFBUixDQUFlLFVBQVNmLE1BQVQsRUFBZTtBQUVuQyxZQUFJUCxNQUFPTyxPQUFPVCxRQUFQLE1BQXFCbUUsYUFBaEM7QUFDQSxZQUFJakUsR0FBSixFQUFTO0FBQ1BtRSxzQkFBVUQsT0FBVixFQUFrQjdELFFBQVFHLE9BQTFCO0FBQ0Q7QUFDRCxlQUFPUixHQUFQO0FBQ0QsS0FQTSxDQUFQO0FBUUQ7QUFURE4sUUFBQXNFLG1CQUFBLEdBQUFBLG1CQUFBO0FBV0EsU0FBQUcsU0FBQSxDQUEwQkMsR0FBMUIsRUFBMERDLEdBQTFELEVBQXNFO0FBQ3BFRCxRQUFJQyxHQUFKLElBQVcsQ0FBQ0QsSUFBSUMsR0FBSixLQUFZLENBQWIsSUFBa0IsQ0FBN0I7QUFDRDtBQUZEM0UsUUFBQXlFLFNBQUEsR0FBQUEsU0FBQTtBQUlBLFNBQUFHLFVBQUEsQ0FBdUJGLEdBQXZCLEVBQWlEO0FBQy9DLFFBQUlHLElBQUl6QixPQUFPQyxJQUFQLENBQVlxQixHQUFaLENBQVI7QUFDQUcsTUFBRXRCLElBQUY7QUFDQSxXQUFPc0IsQ0FBUDtBQUNEO0FBRUQsU0FBQUMsY0FBQSxDQUErQnpELElBQS9CLEVBQThDaEIsTUFBOUMsRUFBOEROLFFBQTlELEVBQXNGO0FBQ3BGLFFBQUlnRixRQUFRaEYsU0FBU1ksT0FBVCxDQUFpQnVCLE1BQWpCLENBQXdCLFVBQVNDLElBQVQsRUFBZXRCLE1BQWYsRUFBcUI7QUFDdkQsZUFBT3NCLFFBQVN0QixPQUFPQyxPQUFQLEtBQW1CVCxNQUFwQixHQUE4QixDQUE5QixHQUFrQyxDQUExQyxDQUFQO0FBQ0QsS0FGVyxFQUVWLENBRlUsQ0FBWjtBQUdBLFFBQUkyRSxXQUFXdkYsTUFBTXdGLHNCQUFOLENBQTZCbEYsUUFBN0IsRUFBdUNNLE1BQXZDLEVBQStDeUIsTUFBOUQ7QUFDQSxRQUFJeEIsTUFBTUwsY0FBY0ksTUFBZCxFQUFzQmdCLElBQXRCLEVBQTRCdEIsUUFBNUIsS0FBd0Msc0JBQW9CaUYsUUFBcEIsR0FBNEIsa0JBQTVCLEdBQStDRCxLQUEvQyxHQUFvRCxZQUE1RixDQUFWO0FBQ0EsUUFBSVgsT0FBT3JFLFNBQVM4RCxJQUFULENBQWN4RCxNQUFkLENBQXFCQSxNQUFyQixFQUE2QmdFLFdBQTdCLElBQTRDLEVBQXZEO0FBQ0EsUUFBR0QsSUFBSCxFQUFTO0FBQ1A5RCxlQUFPLGlCQUFpQjhELElBQWpCLEdBQXdCLElBQS9CO0FBQ0Q7QUFDRCxXQUFPOUQsR0FBUDtBQUNEO0FBWEROLFFBQUE4RSxjQUFBLEdBQUFBLGNBQUE7QUFhQSxTQUFBSSxvQkFBQSxDQUFxQzdELElBQXJDLEVBQW9EeUIsWUFBcEQsRUFBMkUvQyxRQUEzRSxFQUFtRztBQUNqRyxRQUFJb0YsWUFBWTNGLE9BQU80RixvQkFBUCxDQUE0Qi9ELElBQTVCLEVBQW1DdEIsU0FBU3NGLEtBQTVDLENBQWhCO0FBQ0E7QUFDQSxRQUFJQyxxQkFBcUJILFVBQVV2RCxNQUFWLENBQWlCLFVBQUEyRCxTQUFBLEVBQVM7QUFBSSxlQUFBQSxVQUFVekQsTUFBVixLQUFxQixDQUFyQjtBQUFzQixLQUFwRCxDQUF6QjtBQUNBLFFBQUl4QixNQUFNLEVBQVY7QUFDQTtBQUNBLFFBQUlrRixZQUFZRixtQkFBbUIxRCxNQUFuQixDQUEwQixVQUFBMkQsU0FBQSxFQUFTO0FBQ2pEckcsaUJBQVM4RCxLQUFLQyxTQUFMLENBQWVzQyxVQUFVLENBQVYsQ0FBZixDQUFUO0FBQ0EsZUFBTyxDQUFDaEcsS0FBS0EsSUFBTCxDQUFVa0csUUFBVixDQUFtQkYsVUFBVSxDQUFWLENBQW5CLENBQUQsSUFDQSxDQUFDaEcsS0FBS0EsSUFBTCxDQUFVbUcsUUFBVixDQUFtQkgsVUFBVSxDQUFWLENBQW5CLENBREQsSUFDcUMsQ0FBQ2hHLEtBQUtBLElBQUwsQ0FBVW9HLFVBQVYsQ0FBcUJKLFVBQVUsQ0FBVixDQUFyQixDQUQ3QztBQUVELEtBSmUsQ0FBaEI7QUFNQSxRQUFJSyxjQUFjTixtQkFBbUIxRCxNQUFuQixDQUEwQixVQUFBMkQsU0FBQSxFQUFTO0FBQ25ELGVBQU9oRyxLQUFLQSxJQUFMLENBQVVrRyxRQUFWLENBQW1CRixVQUFVLENBQVYsQ0FBbkIsQ0FBUDtBQUNELEtBRmlCLENBQWxCO0FBR0EsUUFBR0ssZUFBZUEsWUFBWTlELE1BQVosR0FBcUIsQ0FBdkMsRUFBMEM7QUFDeEM1QyxpQkFBUzhELEtBQUtDLFNBQUwsQ0FBZTJDLFdBQWYsQ0FBVDtBQUNBQSxvQkFBWWhGLE9BQVosQ0FBb0IsVUFBU2lGLFFBQVQsRUFBaUI7QUFDbkMsZ0JBQUl4RixTQUFTd0YsU0FBUyxDQUFULEVBQVl0QixhQUF6QjtBQUNBLGdCQUFJLENBQUN6QixZQUFELElBQWlCekMsV0FBV3lDLFlBQWhDLEVBQThDO0FBQzVDNUQseUJBQVMsZ0JBQWdCOEQsS0FBS0MsU0FBTCxDQUFlNEMsUUFBZixDQUF6QjtBQUNBdkYsdUJBQU93RSxlQUFlekQsSUFBZixFQUFxQndFLFNBQVMsQ0FBVCxFQUFZdEIsYUFBakMsRUFBZ0R4RSxRQUFoRCxDQUFQO0FBQ0Q7QUFDRixTQU5EO0FBT0Q7QUFFRGIsYUFBUyxpQkFBaUI4RCxLQUFLQyxTQUFMLENBQWV1QyxTQUFmLENBQTFCO0FBQ0EsUUFBSU0sWUFBWSxFQUFoQjtBQUNBLFFBQUlDLGFBQWEsRUFBakI7QUFDQSxRQUFJQyxpQkFBaUIsRUFBckI7QUFDQSxRQUFJQyxxQkFBcUIsRUFBekI7QUFDQTtBQUNBVCxjQUFVNUUsT0FBVixDQUFrQixVQUFBMkUsU0FBQSxFQUFTO0FBQ3pCLGVBQUFBLFVBQVUzRSxPQUFWLENBQWtCLFVBQUFzRixLQUFBLEVBQUs7QUFFbkJ6QixzQkFBVXVCLGNBQVYsRUFBMEJFLE1BQU0zQixhQUFoQztBQUNBRSxzQkFBVXdCLGtCQUFWLEVBQThCQyxNQUFNOUYsUUFBcEM7QUFDRCxTQUpILENBQUE7QUFLQyxLQU5IO0FBUUE7QUFDQTtBQUNBO0FBQ0E7QUFFQSxRQUFJMEQsYUFBYWMsV0FBV3FCLGtCQUFYLENBQWpCO0FBQ0EsUUFBSUUsZUFBZXZCLFdBQVdvQixjQUFYLENBQW5CO0FBQ0E5RyxhQUFTLG1CQUFtQjhELEtBQUtDLFNBQUwsQ0FBZWtELFlBQWYsQ0FBNUI7QUFDQWpILGFBQVMsaUJBQWlCOEQsS0FBS0MsU0FBTCxDQUFlYSxVQUFmLENBQTFCO0FBRUE7QUFDQSxRQUFJc0Msb0JBQW9CLEVBQXhCO0FBQ0EsUUFBSUMsc0JBQXNCLEVBQTFCO0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBdEcsYUFBU1ksT0FBVCxDQUFpQkMsT0FBakIsQ0FBeUIsVUFBU0MsTUFBVCxFQUFlO0FBQ3RDLFlBQUcsQ0FBQ2lDLFlBQUQsSUFBaUJqQyxPQUFPQyxPQUFQLEtBQW1CZ0MsWUFBdkMsRUFBc0Q7QUFDcERzRCw4QkFBa0J2RixPQUFPQyxPQUF6QixJQUFvQyxDQUFDc0Ysa0JBQWtCdkYsT0FBT0MsT0FBekIsS0FBcUMsQ0FBdEMsSUFBMkMsQ0FBL0U7QUFDQXFGLHlCQUFhdkYsT0FBYixDQUFxQixVQUFBMEYsV0FBQSxFQUFXO0FBQzlCLHVCQUFBeEMsV0FBV2xELE9BQVgsQ0FBbUIsVUFBQVIsUUFBQSxFQUFRO0FBQ3pCLHdCQUFJUyxPQUFPVCxRQUFQLE1BQXFCa0csV0FBekIsRUFBc0M7QUFDcEMsNEJBQUlDLEtBQUtGLG9CQUFvQnhGLE9BQU9DLE9BQTNCLElBQXNDdUYsb0JBQW9CeEYsT0FBT0MsT0FBM0IsS0FBdUMsRUFBdEY7QUFDQSw0QkFBSTBGLE1BQU1ELEdBQUdELFdBQUgsSUFBbUJDLEdBQUdELFdBQUgsS0FBbUIsRUFBaEQ7QUFDQTdCLGtDQUFVK0IsR0FBVixFQUFjcEcsUUFBZDtBQUNEO0FBQUE7QUFDRixpQkFORCxDQUFBO0FBT0MsYUFSSDtBQVVEO0FBQ0YsS0FkRDtBQWVBbEIsYUFBUzhELEtBQUtDLFNBQUwsQ0FBZW9ELG1CQUFmLEVBQW1DbEYsU0FBbkMsRUFBNkMsQ0FBN0MsQ0FBVDtBQUNBakMsYUFBUzhELEtBQUtDLFNBQUwsQ0FBZW1ELGlCQUFmLEVBQWlDakYsU0FBakMsRUFBMkMsQ0FBM0MsQ0FBVDtBQUNBLFFBQUlxRCxVQUFVSSxXQUFXeUIsbUJBQVgsQ0FBZDtBQUNBLFFBQUlJLFVBQVcsTUFBTXBGLElBQU4sR0FBYSxxQkFBNUI7QUFDQSxRQUFJcUYsU0FBUyxLQUFiO0FBQ0EsUUFBR3RELE9BQU9DLElBQVAsQ0FBWWdELG1CQUFaLEVBQWlDdkUsTUFBakMsR0FBMEMsQ0FBN0MsRUFBZ0Q7QUFDOUMyRSxtQkFBVyxLQUFLakMsUUFBUTFDLE1BQWIsR0FDRCxZQURDLEdBQ2NwQyxNQUFNaUgsb0JBQU4sQ0FBMkJuQyxPQUEzQixDQURkLEdBQ29ELEVBRC9EO0FBRUQsS0FIRCxNQUdPLElBQUdBLFFBQVExQyxNQUFSLEtBQW1CLENBQXRCLEVBQXlCO0FBQzlCLFlBQUcsQ0FBQ2dCLFlBQUosRUFBa0I7QUFDaEIyRCx1QkFBVyxNQUFYO0FBQ0Q7QUFDREEsbUJBQVcsY0FBV2pDLFFBQVEsQ0FBUixDQUFYLEdBQXFCLEtBQWhDO0FBQ0FrQyxpQkFBUyxJQUFUO0FBQ0QsS0FOTSxNQU1BO0FBQ0wsWUFBR3BHLEdBQUgsRUFBUTtBQUNOLG1CQUFPQSxHQUFQO0FBQ0Q7QUFDRCxZQUFHd0MsWUFBSCxFQUFpQjtBQUNmLG1CQUFPLE9BQUl6QixJQUFKLEdBQVEsa0NBQVIsR0FBeUN5QixZQUF6QyxHQUFxRCxPQUE1RDtBQUNEO0FBQ0QsZUFBTyxtQ0FBZ0N6QixJQUFoQyxHQUFvQyxPQUEzQztBQUNEO0FBQ0RmLFdBQU9tRyxVQUFVLElBQWpCLENBbEdpRyxDQWtHMUU7QUFDdkJqQyxZQUFRNUQsT0FBUixDQUFnQixVQUFTUCxNQUFULEVBQWU7QUFDN0IsWUFBSWtHLEtBQUtGLG9CQUFvQmhHLE1BQXBCLENBQVQ7QUFDQStDLGVBQU9DLElBQVAsQ0FBWWtELEVBQVosRUFBZ0IzRixPQUFoQixDQUF3QixVQUFBZ0csYUFBQSxFQUFhO0FBQ25DLGdCQUFJSixNQUFNRCxHQUFHSyxhQUFILENBQVY7QUFDQSxnQkFBRyxDQUFDRixNQUFKLEVBQVk7QUFDVnBHLHVCQUFPLGdCQUFnQkQsTUFBaEIsR0FBeUIsSUFBaEM7QUFDRDtBQUNELGdCQUFJd0csWUFBWXpELE9BQU9DLElBQVAsQ0FBWW1ELEdBQVosRUFBaUIxRSxNQUFqQixLQUE0QixDQUE1QztBQUNBeEIsbUJBQVVMLGNBQWMyRyxhQUFkLEVBQTRCdkYsSUFBNUIsRUFBaUN0QixRQUFqQyxJQUEwQyxHQUFwRDtBQUNBLGdCQUFHLENBQUM4RyxTQUFKLEVBQWU7QUFDYnZHLHVCQUFPLE9BQVA7QUFDRDtBQUNEOEMsbUJBQU9DLElBQVAsQ0FBWW1ELEdBQVosRUFBaUI1RixPQUFqQixDQUF5QixVQUFBUixRQUFBLEVBQVE7QUFDakMsb0JBQUk4QyxVQUFXVCxVQUFVK0QsSUFBSXBHLFFBQUosQ0FBVixFQUF3QmdHLGtCQUFrQi9GLE1BQWxCLENBQXhCLENBQWY7QUFFRUMsdUJBQU8sK0JBQTRCRixRQUE1QixHQUFvQyxnQkFBcEMsR0FBb0RvRyxJQUFJcEcsUUFBSixDQUFwRCxHQUFpRSxHQUFqRSxHQUFxRThDLE9BQXJFLEdBQTRFLGtCQUFuRjtBQUNELGFBSkQ7QUFLRCxTQWZEO0FBZ0JELEtBbEJEO0FBbUJBLFdBQU81QyxHQUFQO0FBQ0Q7QUF2SEROLFFBQUFrRixvQkFBQSxHQUFBQSxvQkFBQTtBQXlIQSxTQUFBNEIsZ0JBQUEsQ0FBaUMxRyxRQUFqQyxFQUFvRDJHLFlBQXBELEVBQTBFQyxLQUExRSxFQUFnR0MsT0FBaEcsRUFBZ0g7QUFDOUcsUUFBSTNHLE1BQU0sRUFBVjtBQUNBLFFBQUk0RyxPQUFPekgsTUFBTTBILHFCQUFOLENBQTRCSCxLQUE1QixFQUFrQzVHLFFBQWxDLENBQVg7QUFDQSxRQUFHMkcsWUFBSCxFQUFpQjtBQUNmLFlBQUdHLEtBQUs1RixPQUFMLENBQWF5RixZQUFiLEtBQThCLENBQWpDLEVBQW9DO0FBQ2xDekcsZ0JBQUk4RyxJQUFKLENBQVNsRCx5QkFBeUI5RCxRQUF6QixFQUFrQzJHLFlBQWxDLEVBQStDQyxLQUEvQyxDQUFUO0FBQ0EsbUJBQU8xRyxHQUFQO0FBQ0QsU0FIRCxNQUdPO0FBQ0wsbUJBQU8sRUFBUDtBQUNEO0FBQ0Y7QUFDRDRHLFNBQUszRCxJQUFMO0FBQ0EyRCxTQUFLdEcsT0FBTCxDQUFhLFVBQVNQLE1BQVQsRUFBZTtBQUN0QkMsWUFBSThHLElBQUosQ0FBU2xELHlCQUF5QjlELFFBQXpCLEVBQW1DQyxNQUFuQyxFQUEyQzJHLEtBQTNDLENBQVQ7QUFDTCxLQUZEO0FBR0EsV0FBTzFHLEdBQVA7QUFDRDtBQWhCRE4sUUFBQThHLGdCQUFBLEdBQUFBLGdCQUFBIiwiZmlsZSI6Im1hdGNoL2Rlc2NyaWJlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKlxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuZXhwbGFpblxuICogQGZpbGUgZXhwbGFpbi50c1xuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxuICpcbiAqIEZ1bmN0aW9ucyBkZWFsaW5nIHdpdGggZXhwbGFpbmluZyBmYWN0cywgY2F0ZWdvcmllcyBldGMuXG4gKi9cblxuXG5pbXBvcnQgKiBhcyBJbnB1dEZpbHRlciBmcm9tICcuL2lucHV0RmlsdGVyJztcbmltcG9ydCAqIGFzIEFsZ29sIGZyb20gJy4vYWxnb2wnO1xuaW1wb3J0ICogYXMgZGVidWcgZnJvbSAnZGVidWcnO1xuXG5jb25zdCBkZWJ1Z2xvZyA9IGRlYnVnKCdkZXNjcmliZScpO1xuaW1wb3J0ICogYXMgbG9nZ2VyIGZyb20gJy4uL3V0aWxzL2xvZ2dlcic7XG52YXIgbG9nUGVyZiA9IGxvZ2dlci5wZXJmKFwicGVyZmxpc3RhbGxcIik7XG52YXIgcGVyZmxvZyA9IGRlYnVnKCdwZXJmJyk7XG4vL2NvbnN0IHBlcmZsb2cgPSBsb2dnZXIucGVyZihcInBlcmZsaXN0YWxsXCIpO1xuXG5pbXBvcnQgKiBhcyBJTWF0Y2ggZnJvbSAnLi9pZm1hdGNoJztcblxuaW1wb3J0ICogYXMgVG9vbG1hdGNoZXIgZnJvbSAnLi90b29sbWF0Y2hlcic7XG5pbXBvcnQgKiBhcyBCcmVha0Rvd24gZnJvbSAnLi9icmVha2Rvd24nO1xuXG5pbXBvcnQgKiBhcyBTZW50ZW5jZSBmcm9tICcuL3NlbnRlbmNlJztcblxuaW1wb3J0ICogYXMgV29yZCBmcm9tICcuL3dvcmQnO1xuaW1wb3J0ICogYXMgT3BlcmF0b3IgZnJvbSAnLi9vcGVyYXRvcic7XG5cbmltcG9ydCAqIGFzIFdoYXRJcyBmcm9tICcuL3doYXRpcyc7XG5cbmltcG9ydCAqIGFzIE1vZGVsIGZyb20gJy4uL21vZGVsL21vZGVsJztcbmltcG9ydCAqIGFzIE1hdGNoIGZyb20gJy4vbWF0Y2gnO1xuXG5cbmltcG9ydCAqIGFzIFV0aWxzIGZyb20gJy4uL3V0aWxzL3V0aWxzJztcblxuXG52YXIgc1dvcmRzID0ge307XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1N5bm9ueW1Gb3IoZXhhY3RXb3JkIDogc3RyaW5nLCBzbG9wcHlXb3JkIDogc3RyaW5nLCB0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMpIDogYm9vbGVhbiB7XG4gIC8vIFRPRE86IHVzZSBtb2RlbCBzeW5vbnltc1xuICByZXR1cm4gc2xvcHB5V29yZCA9PT0gXCJuYW1lXCIgJiYgZXhhY3RXb3JkID09PSBcImVsZW1lbnQgbmFtZVwiO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2xvcHB5T3JFeGFjdChleGFjdFdvcmQgOiBzdHJpbmcsIHNsb3BweVdvcmQgOiBzdHJpbmcsIHRoZU1vZGVsOiBJTWF0Y2guSU1vZGVscykge1xuICBpZihleGFjdFdvcmQudG9Mb3dlckNhc2UoKSA9PT0gc2xvcHB5V29yZC50b0xvd2VyQ2FzZSgpKSB7XG4gICAgcmV0dXJuICdcIicgKyBzbG9wcHlXb3JkICsgJ1wiJztcbiAgfVxuICAvLyBUT0RPLCBmaW5kIHBsdXJhbCBzIGV0Yy5cbiAgLy8gc3RpbGwgZXhhY3QsXG4gIC8vXG4gIGlmKGlzU3lub255bUZvcihleGFjdFdvcmQsc2xvcHB5V29yZCx0aGVNb2RlbCkpIHtcbnJldHVybiAnXCInICsgc2xvcHB5V29yZCArICdcIiAoaW50ZXJwcmV0ZWQgYXMgc3lub255bSBmb3IgXCInICsgZXhhY3RXb3JkICsnXCIpJztcbiAgfVxuICAvL3RvZG8sIGZpbmQgaXMgc3lub255bWZvciAuLi5cbiAgLy8gVE9ETywgYSBzeW5vbnltIGZvciAuLi5cbiAgcmV0dXJuICdcIicgKyBzbG9wcHlXb3JkICsgJ1wiIChpbnRlcnByZXRlZCBhcyBcIicgKyBleGFjdFdvcmQgKydcIiknO1xufVxuXG5pbnRlcmZhY2UgSURlc2NyaWJlQ2F0ZWdvcnkge1xuICAgIHRvdGFscmVjb3JkcyA6IG51bWJlcixcbiAgICBwcmVzZW50cmVjb3JkcyA6IG51bWJlcixcbiAgICB2YWx1ZXMgOiB7IFtrZXkgOiBzdHJpbmddIDogbnVtYmVyfSxcbiAgICBtdWx0aXZhbHVlZCA6IGJvb2xlYW5cbiAgfVxuXG5leHBvcnQgZnVuY3Rpb24gY291bnRSZWNvcmRQcmVzZW5jZShjYXRlZ29yeSA6IHN0cmluZywgZG9tYWluIDogc3RyaW5nLCB0aGVNb2RlbCA6IElNYXRjaC5JTW9kZWxzKSA6IElEZXNjcmliZUNhdGVnb3J5IHtcbiAgdmFyIHJlcyA9IHsgdG90YWxyZWNvcmRzIDogMCxcbiAgICBwcmVzZW50cmVjb3JkcyA6IDAsXG4gICAgdmFsdWVzIDogeyB9LCAgLy8gYW4gdGhlaXIgZnJlcXVlbmN5XG4gICAgbXVsdGl2YWx1ZWQgOiBmYWxzZVxuICB9IGFzIElEZXNjcmliZUNhdGVnb3J5O1xuICB0aGVNb2RlbC5yZWNvcmRzLmZvckVhY2goZnVuY3Rpb24ocmVjb3JkKSB7XG4gICAgLy9kZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmQsdW5kZWZpbmVkLDIpKTtcbiAgICBpZihyZWNvcmQuX2RvbWFpbiAhPT0gZG9tYWluKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJlcy50b3RhbHJlY29yZHMrKztcbiAgICB2YXIgdmFsID0gcmVjb3JkW2NhdGVnb3J5XTtcbiAgICB2YXIgdmFsYXJyID0gW3ZhbF07XG4gICAgaWYoQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgICByZXMubXVsdGl2YWx1ZWQgPSB0cnVlO1xuICAgICAgdmFsYXJyID0gdmFsO1xuICAgIH1cbiAgICAvLyB0b2RvIHdyYXAgYXJyXG4gICAgaWYodmFsICE9PSB1bmRlZmluZWQgJiYgdmFsICE9PSBcIm4vYVwiKSB7XG4gICAgICByZXMucHJlc2VudHJlY29yZHMgKys7XG4gICAgfVxuICAgIHZhbGFyci5mb3JFYWNoKGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmVzLnZhbHVlc1t2YWxdID0gKHJlcy52YWx1ZXNbdmFsXSB8fCAwKSArIDE7XG4gICAgfSlcbiAgfSlcbiAgcmV0dXJuIHJlcztcbn1cblxuLy8gY2F0ZWdvcnkgPT4gbWF0Y2hlZHdvcmRzW107XG5cbmludGVyZmFjZSBJRGVzY3JpYmVGYWN0IHtcbiAgICB0b3RhbHJlY29yZHMgOiBudW1iZXIsXG4gICAgcHJlc2VudHJlY29yZHMgOiBudW1iZXIsXG4gICAgbXVsdGl2YWx1ZWQgOiBib29sZWFuXG4gIH1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvdW50UmVjb3JkUHJlc2VuY2VGYWN0KGZhY3QgOiBzdHJpbmcsIGNhdGVnb3J5IDogc3RyaW5nLCBkb21haW4gOiBzdHJpbmcsIHRoZU1vZGVsIDogSU1hdGNoLklNb2RlbHMpIDogSURlc2NyaWJlRmFjdCB7XG4gIHZhciByZXMgPSB7IHRvdGFscmVjb3JkcyA6IDAsXG4gICAgcHJlc2VudHJlY29yZHMgOiAwLFxuICAgIHZhbHVlcyA6IHsgfSwgIC8vIGFuIHRoZWlyIGZyZXF1ZW5jeVxuICAgIG11bHRpdmFsdWVkIDogZmFsc2VcbiAgfSBhcyBJRGVzY3JpYmVDYXRlZ29yeTtcbiAgdGhlTW9kZWwucmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uKHJlY29yZCkge1xuICAgIC8vZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkLHVuZGVmaW5lZCwyKSk7XG4gICAgaWYocmVjb3JkLl9kb21haW4gIT09IGRvbWFpbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXMudG90YWxyZWNvcmRzKys7XG4gICAgdmFyIHZhbCA9IHJlY29yZFtjYXRlZ29yeV07XG4gICAgdmFyIHZhbGFyciA9IFt2YWxdO1xuICAgIGlmKEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgaWYodmFsLmluZGV4T2YoZmFjdCkgPj0gMCkge1xuICAgICAgICByZXMubXVsdGl2YWx1ZWQgPSB0cnVlO1xuICAgICAgICB2YWxhcnIgPSB2YWw7XG4gICAgICAgIHJlcy5wcmVzZW50cmVjb3JkcysrO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodmFsID09PSBmYWN0KSB7XG4gICAgICAgIHJlcy5wcmVzZW50cmVjb3JkcysrO1xuICAgIH1cbiAgfSlcbiAgcmV0dXJuIHJlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VWYWx1ZXNMaXN0U3RyaW5nKHJlYWx2YWx1ZXM6IHN0cmluZ1tdKSA6IHN0cmluZyB7XG4gIHZhciB2YWx1ZXNTdHJpbmcgPSBcIlwiO1xuICB2YXIgdG90YWxsZW4gPSAwO1xuICB2YXIgbGlzdFZhbHVlcyA9IHJlYWx2YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uKHZhbCwgaW5kZXgpIHtcbiAgICB0b3RhbGxlbiA9IHRvdGFsbGVuICsgdmFsLmxlbmd0aDtcbiAgcmV0dXJuIChpbmRleCA8IEFsZ29sLkRlc2NyaWJlVmFsdWVMaXN0TWluQ291bnRWYWx1ZUxpc3QpIHx8ICh0b3RhbGxlbiA8IEFsZ29sLkRlc2NyaWJlVmFsdWVMaXN0TGVuZ3RoQ2hhckxpbWl0KTtcbiAgfSk7XG4gIGlmKGxpc3RWYWx1ZXMubGVuZ3RoID09PSAxICYmIHJlYWx2YWx1ZXMubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuICdUaGUgc29sZSB2YWx1ZSBpcyBcXFwiJyArIGxpc3RWYWx1ZXNbMF0gKyAnXCInO1xuICB9XG4gIHZhciBtYXhsZW4gPSBsaXN0VmFsdWVzLnJlZHVjZSggKHByZXYsdmFsKSA9PiBNYXRoLm1heChwcmV2LHZhbC5sZW5ndGgpLDApO1xuICBpZihtYXhsZW4gPiAzMCkge1xuICAgIHJldHVybiBcIlBvc3NpYmxlIHZhbHVlcyBhcmUgLi4uXFxuXCIgK1xuICAgICAgbGlzdFZhbHVlcy5yZWR1Y2UoIChwcmV2LHZhbCxpbmRleCkgPT4gKHByZXYgKyBcIihcIiArIChpbmRleCArIDEpICsgJyk6IFwiJyArIHZhbCArICdcIlxcbidcbiAgICAgICksXCJcIilcbiAgICAgICsgKCBsaXN0VmFsdWVzLmxlbmd0aCA9PT0gcmVhbHZhbHVlcy5sZW5ndGggPyBcIlwiIDogXCIuLi5cIik7XG4gIH1cbiAgdmFyIGxpc3QgPSBcIlwiO1xuICBpZihsaXN0VmFsdWVzLmxlbmd0aCA9PT0gcmVhbHZhbHVlcy5sZW5ndGgpIHtcbiAgICBsaXN0ID0gVXRpbHMubGlzdFRvUXVvdGVkQ29tbWFPcihsaXN0VmFsdWVzKTtcbiAgfSBlbHNlIHtcbiAgICBsaXN0ID0gJ1wiJyArIGxpc3RWYWx1ZXMuam9pbignXCIsIFwiJykgKyAnXCInO1xuICB9XG4gIHJldHVybiBcIlBvc3NpYmxlIHZhbHVlcyBhcmUgLi4uXFxuXCJcbiAgICArIGxpc3RcbiAgICArICggbGlzdFZhbHVlcy5sZW5ndGggPT09IHJlYWx2YWx1ZXMubGVuZ3RoID8gXCJcIiA6IFwiIC4uLlwiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvUGVyY2VudChhIDogbnVtYmVyLCBiOiBudW1iZXIpIDogc3RyaW5nIHtcbiAgcmV0dXJuIFwiXCIgKyAoMTAwKiBhIC8gYikudG9GaXhlZCgxKTtcbn1cblxuXG5leHBvcnQgaW50ZXJmYWNlIElDYXRlZ29yeVN0YXRzIHtcbiAgY2F0ZWdvcnlEZXNjIDogSU1hdGNoLklDYXRlZ29yeURlc2MsXG4gIHByZXNlbnRSZWNvcmRzIDogbnVtYmVyLFxuICBkaXN0aW5jdCA6IHN0cmluZyxcbiAgZGVsdGEgOiBzdHJpbmcsXG4gIHBlcmNQcmVzZW50IDogc3RyaW5nLFxuICBzYW1wbGVWYWx1ZXMgOiBzdHJpbmcsXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2F0ZWdvcnlTdGF0c0luRG9tYWluKGNhdGVnb3J5IDogc3RyaW5nLCBmaWx0ZXJkb21haW4gOiBzdHJpbmcsIHRoZU1vZGVsOiBJTWF0Y2guSU1vZGVscykgOiBJQ2F0ZWdvcnlTdGF0cyB7XG4gIGNvbnN0IHJlY29yZENvdW50ID0gY291bnRSZWNvcmRQcmVzZW5jZShjYXRlZ29yeSwgZmlsdGVyZG9tYWluLCB0aGVNb2RlbCk7XG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHRoZU1vZGVsLnJlY29yZHMuZmlsdGVyKGEgPT4gYS5fZG9tYWluID09PSBcIkNvc21vc1wiKSx1bmRlZmluZWQsMikpO1xuICBjb25zdCBwZXJjZW50ID0gdG9QZXJjZW50KHJlY29yZENvdW50LnByZXNlbnRyZWNvcmRzICwgcmVjb3JkQ291bnQudG90YWxyZWNvcmRzKTtcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkQ291bnQudmFsdWVzKSk7XG4gIHZhciBhbGxWYWx1ZXMgPU9iamVjdC5rZXlzKHJlY29yZENvdW50LnZhbHVlcyk7XG4gIHZhciByZWFsdmFsdWVzID0gYWxsVmFsdWVzLmZpbHRlcih2YWx1ZSA9PiAodmFsdWUgIT09ICd1bmRlZmluZWQnKSAmJiAodmFsdWUgIT09ICduL2EnKSk7XG4gIGRlYnVnbG9nXG4gIHJlYWx2YWx1ZXMuc29ydCgpO1xuICB2YXIgdW5kZWZOYURlbHRhID0gIChhbGxWYWx1ZXMubGVuZ3RoIC0gcmVhbHZhbHVlcy5sZW5ndGgpO1xuICB2YXIgZGVsdGEgPSAgKHVuZGVmTmFEZWx0YSkgPyAgXCIoK1wiICsgdW5kZWZOYURlbHRhICsgXCIpXCIgOiBcIlwiO1xuICBjb25zdCBkaXN0aW5jdCA9ICcnICsgcmVhbHZhbHVlcy5sZW5ndGg7XG4gIGNvbnN0IHZhbHVlc0xpc3QgPSBtYWtlVmFsdWVzTGlzdFN0cmluZyhyZWFsdmFsdWVzKTtcbiAgcmV0dXJuIHtcbiAgICBjYXRlZ29yeURlc2MgOiB0aGVNb2RlbC5mdWxsLmRvbWFpbltmaWx0ZXJkb21haW5dLmNhdGVnb3JpZXNbY2F0ZWdvcnldLFxuICAgIGRpc3RpbmN0IDogZGlzdGluY3QsXG4gICAgZGVsdGEgOiBkZWx0YSxcbiAgICBwcmVzZW50UmVjb3JkcyA6IHJlY29yZENvdW50LnByZXNlbnRyZWNvcmRzLFxuICAgIHBlcmNQcmVzZW50IDogcGVyY2VudCxcbiAgICBzYW1wbGVWYWx1ZXMgOiB2YWx1ZXNMaXN0XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlc2NyaWJlQ2F0ZWdvcnlJbkRvbWFpbihjYXRlZ29yeSA6IHN0cmluZywgZmlsdGVyZG9tYWluIDogc3RyaW5nLCB0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMpIDogc3RyaW5nIHtcbi8qICBjb25zdCByZWNvcmRDb3VudCA9IGNvdW50UmVjb3JkUHJlc2VuY2UoY2F0ZWdvcnksIGZpbHRlcmRvbWFpbiwgdGhlTW9kZWwpO1xuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeSh0aGVNb2RlbC5yZWNvcmRzLmZpbHRlcihhID0+IGEuX2RvbWFpbiA9PT0gXCJDb3Ntb3NcIiksdW5kZWZpbmVkLDIpKTtcbiAgY29uc3QgcGVyY2VudCA9IHRvUGVyY2VudChyZWNvcmRDb3VudC5wcmVzZW50cmVjb3JkcyAsIHJlY29yZENvdW50LnRvdGFscmVjb3Jkcyk7XG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZENvdW50LnZhbHVlcykpO1xuICB2YXIgYWxsVmFsdWVzID1PYmplY3Qua2V5cyhyZWNvcmRDb3VudC52YWx1ZXMpO1xuICB2YXIgcmVhbHZhbHVlcyA9IGFsbFZhbHVlcy5maWx0ZXIodmFsdWUgPT4gKHZhbHVlICE9PSAndW5kZWZpbmVkJykgJiYgKHZhbHVlICE9PSAnbi9hJykpO1xuICBkZWJ1Z2xvZ1xuICByZWFsdmFsdWVzLnNvcnQoKTtcbiAgdmFyIHVuZGVmTmFEZWx0YSA9ICAoYWxsVmFsdWVzLmxlbmd0aCAtIHJlYWx2YWx1ZXMubGVuZ3RoKTtcbiAgdmFyIGRlbHRhID0gICh1bmRlZk5hRGVsdGEpID8gIFwiKCtcIiArIHVuZGVmTmFEZWx0YSArIFwiKVwiIDogXCJcIjtcbiAgY29uc3QgZGlzdGluY3QgPSAnJyArIHJlYWx2YWx1ZXMubGVuZ3RoO1xuXG4gIGNvbnN0IHZhbHVlc0xpc3QgPSBtYWtlVmFsdWVzTGlzdFN0cmluZyhyZWFsdmFsdWVzKTtcbiovXG4gIHZhciBzdGF0cyA9IGdldENhdGVnb3J5U3RhdHNJbkRvbWFpbihjYXRlZ29yeSxmaWx0ZXJkb21haW4sdGhlTW9kZWwpO1xuXG4gIHZhciByZXMgPSAnaXMgYSBjYXRlZ29yeSBpbiBkb21haW4gXCInICsgZmlsdGVyZG9tYWluICsgJ1wiXFxuJ1xuICArIGBJdCBpcyBwcmVzZW50IGluICR7c3RhdHMucHJlc2VudFJlY29yZHN9ICgke3N0YXRzLnBlcmNQcmVzZW50fSUpIG9mIHJlY29yZHMgaW4gdGhpcyBkb21haW4sXFxuYCArXG4gICBgaGF2aW5nICR7c3RhdHMuZGlzdGluY3QgKyAnJ30ke3N0YXRzLmRlbHRhfSBkaXN0aW5jdCB2YWx1ZXMuXFxuYFxuICArIHN0YXRzLnNhbXBsZVZhbHVlcztcblxuICB2YXIgZGVzYyA9IHRoZU1vZGVsLmZ1bGwuZG9tYWluW2ZpbHRlcmRvbWFpbl0uY2F0ZWdvcmllc1tjYXRlZ29yeV0gfHwge30gYXMgSU1hdGNoLklDYXRlZ29yeURlc2M7XG4gIHZhciBkZXNjcmlwdGlvbiA9IGRlc2MuZGVzY3JpcHRpb24gfHwgXCJcIjtcbiAgaWYgKGRlc2NyaXB0aW9uKSB7XG4gICAgcmVzICs9IGBcXG5EZXNjcmlwdGlvbjogJHtkZXNjcmlwdGlvbn1gO1xuICB9XG4gIHJldHVybiByZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kUmVjb3Jkc1dpdGhGYWN0KG1hdGNoZWRTdHJpbmc6IHN0cmluZywgY2F0ZWdvcnkgOiBzdHJpbmcsIHJlY29yZHMgOiBhbnksIGRvbWFpbnMgOiB7IFtrZXkgOiBzdHJpbmddIDogbnVtYmVyfSkgOiBhbnlbXSB7XG4gIHJldHVybiByZWNvcmRzLmZpbHRlcihmdW5jdGlvbihyZWNvcmQpICB7XG5cbiAgICBsZXQgcmVzID0gKHJlY29yZFtjYXRlZ29yeV0gPT09IG1hdGNoZWRTdHJpbmcpO1xuICAgIGlmKCByZXMpIHtcbiAgICAgIGluY3JlbWVudChkb21haW5zLHJlY29yZHMuX2RvbWFpbik7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5jcmVtZW50KG1hcCA6IHtba2V5OiBzdHJpbmddIDogbnVtYmVyfSwga2V5IDogc3RyaW5nKSB7XG4gIG1hcFtrZXldID0gKG1hcFtrZXldIHx8IDApICsgMTtcbn1cblxuZnVuY3Rpb24gc29ydGVkS2V5czxUPihtYXAgOiB7W2tleSA6IHN0cmluZ10gOiBUfSkgOiBzdHJpbmdbXSB7XG4gIHZhciByID0gT2JqZWN0LmtleXMobWFwKTtcbiAgci5zb3J0KCk7XG4gIHJldHVybiByO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVzY3JpYmVEb21haW4oZmFjdCA6IHN0cmluZywgZG9tYWluOiBzdHJpbmcsIHRoZU1vZGVsOiBJTWF0Y2guSU1vZGVscykgOiBzdHJpbmcge1xuICB2YXIgY291bnQgPSB0aGVNb2RlbC5yZWNvcmRzLnJlZHVjZShmdW5jdGlvbihwcmV2LCByZWNvcmQpIHtcbiAgICByZXR1cm4gcHJldiArICgocmVjb3JkLl9kb21haW4gPT09IGRvbWFpbikgPyAxIDogMCk7XG4gIH0sMCk7XG4gIHZhciBjYXRjb3VudCA9IE1vZGVsLmdldENhdGVnb3JpZXNGb3JEb21haW4odGhlTW9kZWwsIGRvbWFpbikubGVuZ3RoO1xuICB2YXIgcmVzID0gc2xvcHB5T3JFeGFjdChkb21haW4sIGZhY3QsIHRoZU1vZGVsKSArIGBpcyBhIGRvbWFpbiB3aXRoICR7Y2F0Y291bnR9IGNhdGVnb3JpZXMgYW5kICR7Y291bnR9IHJlY29yZHNcXG5gO1xuICB2YXIgZGVzYyA9IHRoZU1vZGVsLmZ1bGwuZG9tYWluW2RvbWFpbl0uZGVzY3JpcHRpb24gfHwgXCJcIjtcbiAgaWYoZGVzYykge1xuICAgIHJlcyArPSBgRGVzY3JpcHRpb246YCArIGRlc2MgKyBgXFxuYDtcbiAgfVxuICByZXR1cm4gcmVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVzY3JpYmVGYWN0SW5Eb21haW4oZmFjdCA6IHN0cmluZywgZmlsdGVyZG9tYWluIDogc3RyaW5nLCB0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMpIDogc3RyaW5nIHtcbiAgdmFyIHNlbnRlbmNlcyA9IFdoYXRJcy5hbmFseXplQ29udGV4dFN0cmluZyhmYWN0LCAgdGhlTW9kZWwucnVsZXMpO1xuICAvL2NvbnNvbGUubG9nKFwiaGVyZSBzZW50ZW5jZXMgXCIgKyBKU09OLnN0cmluZ2lmeShzZW50ZW5jZXMpKTtcbiAgdmFyIGxlbmd0aE9uZVNlbnRlbmNlcyA9IHNlbnRlbmNlcy5maWx0ZXIob1NlbnRlbmNlID0+IG9TZW50ZW5jZS5sZW5ndGggPT09IDEpO1xuICB2YXIgcmVzID0gJyc7XG4gIC8vIHJlbW92ZSBjYXRlZ29yaWVzIGFuZCBkb21haW5zXG4gIHZhciBvbmx5RmFjdHMgPSBsZW5ndGhPbmVTZW50ZW5jZXMuZmlsdGVyKG9TZW50ZW5jZSA9PntcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvU2VudGVuY2VbMF0pKTtcbiAgICByZXR1cm4gIVdvcmQuV29yZC5pc0RvbWFpbihvU2VudGVuY2VbMF0pICYmXG4gICAgICAgICAgICFXb3JkLldvcmQuaXNGaWxsZXIob1NlbnRlbmNlWzBdKSAmJiAhV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1NlbnRlbmNlWzBdKVxuICB9XG4gICk7XG4gIHZhciBvbmx5RG9tYWlucyA9IGxlbmd0aE9uZVNlbnRlbmNlcy5maWx0ZXIob1NlbnRlbmNlID0+e1xuICAgIHJldHVybiBXb3JkLldvcmQuaXNEb21haW4ob1NlbnRlbmNlWzBdKTtcbiAgfSk7XG4gIGlmKG9ubHlEb21haW5zICYmIG9ubHlEb21haW5zLmxlbmd0aCA+IDApIHtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvbmx5RG9tYWlucykpO1xuICAgIG9ubHlEb21haW5zLmZvckVhY2goZnVuY3Rpb24oc2VudGVuY2UpIHtcbiAgICAgIHZhciBkb21haW4gPSBzZW50ZW5jZVswXS5tYXRjaGVkU3RyaW5nO1xuICAgICAgaWYoICFmaWx0ZXJkb21haW4gfHwgZG9tYWluID09PSBmaWx0ZXJkb21haW4pIHtcbiAgICAgICAgZGVidWdsb2coXCJoZXJlIG1hdGNoIFwiICsgSlNPTi5zdHJpbmdpZnkoc2VudGVuY2UpKTtcbiAgICAgICAgcmVzICs9IGRlc2NyaWJlRG9tYWluKGZhY3QsIHNlbnRlbmNlWzBdLm1hdGNoZWRTdHJpbmcsIHRoZU1vZGVsKTtcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgZGVidWdsb2coXCJvbmx5IGZhY3RzOiBcIiArIEpTT04uc3RyaW5naWZ5KG9ubHlGYWN0cykpO1xuICB2YXIgcmVjb3JkTWFwID0ge307XG4gIHZhciBkb21haW5zTWFwID0ge30gYXMge1trZXk6IHN0cmluZ10gOiBudW1iZXJ9O1xuICB2YXIgbWF0Y2hlZHdvcmRNYXAgPSB7fSBhcyB7W2tleTogc3RyaW5nXSA6IG51bWJlcn07XG4gIHZhciBtYXRjaGVkQ2F0ZWdvcnlNYXAgPSB7fSBhcyB7W2tleTogc3RyaW5nXSA6IG51bWJlcn07XG4gIC8vIGxvb2sgZm9yIGFsbCByZWNvcmRzXG4gIG9ubHlGYWN0cy5mb3JFYWNoKG9TZW50ZW5jZSA9PlxuICAgIG9TZW50ZW5jZS5mb3JFYWNoKG9Xb3JkID0+XG4gICAgICB7XG4gICAgICAgIGluY3JlbWVudChtYXRjaGVkd29yZE1hcCwgb1dvcmQubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgIGluY3JlbWVudChtYXRjaGVkQ2F0ZWdvcnlNYXAsIG9Xb3JkLmNhdGVnb3J5KTtcbiAgICAgIH1cbiAgICApXG4gICk7XG4gIC8vIHdlIGhhdmU6XG4gIC8vIGEgbGlzdCBvZiBjYXRlZ29yaWVzLFxuICAvLyBhIGxpc3Qgb2YgbWF0Y2hlZFdvcmRzICAtPlxuICAvL1xuXG4gIHZhciBjYXRlZ29yaWVzID0gc29ydGVkS2V5cyhtYXRjaGVkQ2F0ZWdvcnlNYXApO1xuICB2YXIgbWF0Y2hlZHdvcmRzID0gc29ydGVkS2V5cyhtYXRjaGVkd29yZE1hcCk7XG4gIGRlYnVnbG9nKFwibWF0Y2hlZHdvcmRzOiBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWR3b3JkcykpO1xuICBkZWJ1Z2xvZyhcImNhdGVnb3JpZXM6IFwiICsgSlNPTi5zdHJpbmdpZnkoY2F0ZWdvcmllcykpO1xuXG4gIC8vdmFyIGFsbE1hdGNoZWRXb3JkcyA9IHsgW2tleSA6IHN0cmluZ10gOiBudW1iZXIgfTtcbiAgdmFyIGRvbWFpblJlY29yZENvdW50ID0ge30gYXMge1trZXk6IHN0cmluZ10gOiBudW1iZXJ9O1xuICB2YXIgZG9tYWluTWF0Y2hDYXRDb3VudCA9IHt9IGFzIHtba2V5OiBzdHJpbmddIDpcbiAgICAgICB7W2tleTogc3RyaW5nXSA6XG4gICAgIHtba2V5OiBzdHJpbmddIDogbnVtYmVyfX19O1xuICAvLyB3ZSBwcmVwYXJlIHRoZSBmb2xsb3dpbmcgc3RydWN0dXJlXG4gIC8vXG4gIC8vIHtkb21haW59IDogcmVjb3JkY291bnQ7XG4gIC8vIHttYXRjaGVkd29yZHN9IDpcbiAgLy8ge2RvbWFpbn0ge21hdGNoZWR3b3JkfSB7Y2F0ZWdvcnl9IHByZXNlbmNlY291bnRcbiAgdGhlTW9kZWwucmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uKHJlY29yZCkge1xuICAgIGlmKCFmaWx0ZXJkb21haW4gfHwgcmVjb3JkLl9kb21haW4gPT09IGZpbHRlcmRvbWFpbiApIHtcbiAgICAgIGRvbWFpblJlY29yZENvdW50W3JlY29yZC5fZG9tYWluXSA9IChkb21haW5SZWNvcmRDb3VudFtyZWNvcmQuX2RvbWFpbl0gfHwgMCkgKyAxO1xuICAgICAgbWF0Y2hlZHdvcmRzLmZvckVhY2gobWF0Y2hlZHdvcmQgPT5cbiAgICAgICAgY2F0ZWdvcmllcy5mb3JFYWNoKGNhdGVnb3J5ID0+IHtcbiAgICAgICAgICBpZiggcmVjb3JkW2NhdGVnb3J5XSA9PT0gbWF0Y2hlZHdvcmQpIHtcbiAgICAgICAgICAgIHZhciBtZCA9IGRvbWFpbk1hdGNoQ2F0Q291bnRbcmVjb3JkLl9kb21haW5dID0gZG9tYWluTWF0Y2hDYXRDb3VudFtyZWNvcmQuX2RvbWFpbl0gfHwge307XG4gICAgICAgICAgICB2YXIgbWRjID0gbWRbbWF0Y2hlZHdvcmRdID0gIG1kW21hdGNoZWR3b3JkXSB8fCB7fTtcbiAgICAgICAgICAgIGluY3JlbWVudChtZGMsY2F0ZWdvcnkpO1xuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgKVxuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkb21haW5NYXRjaENhdENvdW50LHVuZGVmaW5lZCwyKSk7XG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRvbWFpblJlY29yZENvdW50LHVuZGVmaW5lZCwyKSk7XG4gIHZhciBkb21haW5zID0gc29ydGVkS2V5cyhkb21haW5NYXRjaENhdENvdW50KTtcbiAgdmFyIHJlc05leHQgPSAgJ1wiJyArIGZhY3QgKyAnXCIgaGFzIGEgbWVhbmluZyBpbiAnO1xuICB2YXIgc2luZ2xlID0gZmFsc2U7XG4gIGlmKE9iamVjdC5rZXlzKGRvbWFpbk1hdGNoQ2F0Q291bnQpLmxlbmd0aCA+IDEpIHtcbiAgICByZXNOZXh0ICs9ICcnICsgZG9tYWlucy5sZW5ndGggK1xuICAgICAgICAgICAgICAnIGRvbWFpbnM6ICcgKyBVdGlscy5saXN0VG9RdW90ZWRDb21tYUFuZChkb21haW5zKSArIFwiXCI7XG4gIH0gZWxzZSBpZihkb21haW5zLmxlbmd0aCA9PT0gMSkge1xuICAgIGlmKCFmaWx0ZXJkb21haW4pIHtcbiAgICAgIHJlc05leHQgKz0gYG9uZSBgO1xuICAgIH1cbiAgICByZXNOZXh0ICs9IGBkb21haW4gXCIke2RvbWFpbnNbMF19XCI6YDtcbiAgICBzaW5nbGUgPSB0cnVlO1xuICB9IGVsc2Uge1xuICAgIGlmKHJlcykge1xuICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG4gICAgaWYoZmlsdGVyZG9tYWluKSB7XG4gICAgICByZXR1cm4gYFwiJHtmYWN0fVwiIGlzIG5vIGtub3duIGZhY3QgaW4gZG9tYWluIFwiJHtmaWx0ZXJkb21haW59XCIuXFxuYDtcbiAgICB9XG4gICAgcmV0dXJuIGBJIGRvbid0IGtub3cgYW55dGhpbmcgYWJvdXQgXCIke2ZhY3R9XCIuXFxuYDtcbiAgfVxuICByZXMgKz0gcmVzTmV4dCArIFwiXFxuXCI7IC8vIC4uLlxcblwiO1xuICBkb21haW5zLmZvckVhY2goZnVuY3Rpb24oZG9tYWluKSB7XG4gICAgdmFyIG1kID0gZG9tYWluTWF0Y2hDYXRDb3VudFtkb21haW5dO1xuICAgIE9iamVjdC5rZXlzKG1kKS5mb3JFYWNoKG1hdGNoZWRzdHJpbmcgPT4ge1xuICAgICAgdmFyIG1kYyA9IG1kW21hdGNoZWRzdHJpbmddO1xuICAgICAgaWYoIXNpbmdsZSkge1xuICAgICAgICByZXMgKz0gJ2luIGRvbWFpbiBcIicgKyBkb21haW4gKyAnXCIgJztcbiAgICAgIH1cbiAgICAgIHZhciBjYXRzaW5nbGUgPSBPYmplY3Qua2V5cyhtZGMpLmxlbmd0aCA9PT0gMTtcbiAgICAgIHJlcyArPSBgJHtzbG9wcHlPckV4YWN0KG1hdGNoZWRzdHJpbmcsZmFjdCx0aGVNb2RlbCl9IGA7XG4gICAgICBpZighY2F0c2luZ2xlKSB7XG4gICAgICAgIHJlcyArPSBgLi4uXFxuYDtcbiAgICAgIH1cbiAgICAgIE9iamVjdC5rZXlzKG1kYykuZm9yRWFjaChjYXRlZ29yeSA9PiB7XG4gICAgICB2YXIgcGVyY2VudCA9ICB0b1BlcmNlbnQobWRjW2NhdGVnb3J5XSxkb21haW5SZWNvcmRDb3VudFtkb21haW5dKTtcblxuICAgICAgICByZXMgKz0gYGlzIGEgdmFsdWUgZm9yIGNhdGVnb3J5IFwiJHtjYXRlZ29yeX1cIiBwcmVzZW50IGluICR7bWRjW2NhdGVnb3J5XX0oJHtwZXJjZW50fSUpIG9mIHJlY29yZHM7XFxuYDtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIHJlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlc2NyaWJlQ2F0ZWdvcnkoY2F0ZWdvcnkgOiBzdHJpbmcsIGZpbHRlckRvbWFpbjogc3RyaW5nLCBtb2RlbDogSU1hdGNoLklNb2RlbHMsbWVzc2FnZSA6IHN0cmluZykgOiBzdHJpbmdbXSB7XG4gIHZhciByZXMgPSBbXTtcbiAgdmFyIGRvbXMgPSBNb2RlbC5nZXREb21haW5zRm9yQ2F0ZWdvcnkobW9kZWwsY2F0ZWdvcnkpO1xuICBpZihmaWx0ZXJEb21haW4pIHtcbiAgICBpZihkb21zLmluZGV4T2YoZmlsdGVyRG9tYWluKSA+PSAwKSB7XG4gICAgICByZXMucHVzaChkZXNjcmliZUNhdGVnb3J5SW5Eb21haW4oY2F0ZWdvcnksZmlsdGVyRG9tYWluLG1vZGVsKSk7XG4gICAgICByZXR1cm4gcmVzO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICB9XG4gIGRvbXMuc29ydCgpO1xuICBkb21zLmZvckVhY2goZnVuY3Rpb24oZG9tYWluKSB7XG4gICAgICAgIHJlcy5wdXNoKGRlc2NyaWJlQ2F0ZWdvcnlJbkRvbWFpbihjYXRlZ29yeSwgZG9tYWluLCBtb2RlbCkpO1xuICB9KTtcbiAgcmV0dXJuIHJlcztcbn1cbiIsIi8qKlxuICpcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmV4cGxhaW5cbiAqIEBmaWxlIGV4cGxhaW4udHNcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cbiAqXG4gKiBGdW5jdGlvbnMgZGVhbGluZyB3aXRoIGV4cGxhaW5pbmcgZmFjdHMsIGNhdGVnb3JpZXMgZXRjLlxuICovXG5cInVzZSBzdHJpY3RcIjtcbnZhciBBbGdvbCA9IHJlcXVpcmUoXCIuL2FsZ29sXCIpO1xudmFyIGRlYnVnID0gcmVxdWlyZShcImRlYnVnXCIpO1xudmFyIGRlYnVnbG9nID0gZGVidWcoJ2Rlc2NyaWJlJyk7XG52YXIgbG9nZ2VyID0gcmVxdWlyZShcIi4uL3V0aWxzL2xvZ2dlclwiKTtcbnZhciBsb2dQZXJmID0gbG9nZ2VyLnBlcmYoXCJwZXJmbGlzdGFsbFwiKTtcbnZhciBwZXJmbG9nID0gZGVidWcoJ3BlcmYnKTtcbnZhciBXb3JkID0gcmVxdWlyZShcIi4vd29yZFwiKTtcbnZhciBXaGF0SXMgPSByZXF1aXJlKFwiLi93aGF0aXNcIik7XG52YXIgTW9kZWwgPSByZXF1aXJlKFwiLi4vbW9kZWwvbW9kZWxcIik7XG52YXIgVXRpbHMgPSByZXF1aXJlKFwiLi4vdXRpbHMvdXRpbHNcIik7XG52YXIgc1dvcmRzID0ge307XG5mdW5jdGlvbiBpc1N5bm9ueW1Gb3IoZXhhY3RXb3JkLCBzbG9wcHlXb3JkLCB0aGVNb2RlbCkge1xuICAgIC8vIFRPRE86IHVzZSBtb2RlbCBzeW5vbnltc1xuICAgIHJldHVybiBzbG9wcHlXb3JkID09PSBcIm5hbWVcIiAmJiBleGFjdFdvcmQgPT09IFwiZWxlbWVudCBuYW1lXCI7XG59XG5leHBvcnRzLmlzU3lub255bUZvciA9IGlzU3lub255bUZvcjtcbmZ1bmN0aW9uIHNsb3BweU9yRXhhY3QoZXhhY3RXb3JkLCBzbG9wcHlXb3JkLCB0aGVNb2RlbCkge1xuICAgIGlmIChleGFjdFdvcmQudG9Mb3dlckNhc2UoKSA9PT0gc2xvcHB5V29yZC50b0xvd2VyQ2FzZSgpKSB7XG4gICAgICAgIHJldHVybiAnXCInICsgc2xvcHB5V29yZCArICdcIic7XG4gICAgfVxuICAgIC8vIFRPRE8sIGZpbmQgcGx1cmFsIHMgZXRjLlxuICAgIC8vIHN0aWxsIGV4YWN0LFxuICAgIC8vXG4gICAgaWYgKGlzU3lub255bUZvcihleGFjdFdvcmQsIHNsb3BweVdvcmQsIHRoZU1vZGVsKSkge1xuICAgICAgICByZXR1cm4gJ1wiJyArIHNsb3BweVdvcmQgKyAnXCIgKGludGVycHJldGVkIGFzIHN5bm9ueW0gZm9yIFwiJyArIGV4YWN0V29yZCArICdcIiknO1xuICAgIH1cbiAgICAvL3RvZG8sIGZpbmQgaXMgc3lub255bWZvciAuLi5cbiAgICAvLyBUT0RPLCBhIHN5bm9ueW0gZm9yIC4uLlxuICAgIHJldHVybiAnXCInICsgc2xvcHB5V29yZCArICdcIiAoaW50ZXJwcmV0ZWQgYXMgXCInICsgZXhhY3RXb3JkICsgJ1wiKSc7XG59XG5leHBvcnRzLnNsb3BweU9yRXhhY3QgPSBzbG9wcHlPckV4YWN0O1xuZnVuY3Rpb24gY291bnRSZWNvcmRQcmVzZW5jZShjYXRlZ29yeSwgZG9tYWluLCB0aGVNb2RlbCkge1xuICAgIHZhciByZXMgPSB7IHRvdGFscmVjb3JkczogMCxcbiAgICAgICAgcHJlc2VudHJlY29yZHM6IDAsXG4gICAgICAgIHZhbHVlczoge30sXG4gICAgICAgIG11bHRpdmFsdWVkOiBmYWxzZVxuICAgIH07XG4gICAgdGhlTW9kZWwucmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgLy9kZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmQsdW5kZWZpbmVkLDIpKTtcbiAgICAgICAgaWYgKHJlY29yZC5fZG9tYWluICE9PSBkb21haW4pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXMudG90YWxyZWNvcmRzKys7XG4gICAgICAgIHZhciB2YWwgPSByZWNvcmRbY2F0ZWdvcnldO1xuICAgICAgICB2YXIgdmFsYXJyID0gW3ZhbF07XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICAgICAgICAgIHJlcy5tdWx0aXZhbHVlZCA9IHRydWU7XG4gICAgICAgICAgICB2YWxhcnIgPSB2YWw7XG4gICAgICAgIH1cbiAgICAgICAgLy8gdG9kbyB3cmFwIGFyclxuICAgICAgICBpZiAodmFsICE9PSB1bmRlZmluZWQgJiYgdmFsICE9PSBcIm4vYVwiKSB7XG4gICAgICAgICAgICByZXMucHJlc2VudHJlY29yZHMrKztcbiAgICAgICAgfVxuICAgICAgICB2YWxhcnIuZm9yRWFjaChmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICByZXMudmFsdWVzW3ZhbF0gPSAocmVzLnZhbHVlc1t2YWxdIHx8IDApICsgMTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuY291bnRSZWNvcmRQcmVzZW5jZSA9IGNvdW50UmVjb3JkUHJlc2VuY2U7XG5mdW5jdGlvbiBjb3VudFJlY29yZFByZXNlbmNlRmFjdChmYWN0LCBjYXRlZ29yeSwgZG9tYWluLCB0aGVNb2RlbCkge1xuICAgIHZhciByZXMgPSB7IHRvdGFscmVjb3JkczogMCxcbiAgICAgICAgcHJlc2VudHJlY29yZHM6IDAsXG4gICAgICAgIHZhbHVlczoge30sXG4gICAgICAgIG11bHRpdmFsdWVkOiBmYWxzZVxuICAgIH07XG4gICAgdGhlTW9kZWwucmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgLy9kZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmQsdW5kZWZpbmVkLDIpKTtcbiAgICAgICAgaWYgKHJlY29yZC5fZG9tYWluICE9PSBkb21haW4pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXMudG90YWxyZWNvcmRzKys7XG4gICAgICAgIHZhciB2YWwgPSByZWNvcmRbY2F0ZWdvcnldO1xuICAgICAgICB2YXIgdmFsYXJyID0gW3ZhbF07XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICAgICAgICAgIGlmICh2YWwuaW5kZXhPZihmYWN0KSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgcmVzLm11bHRpdmFsdWVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2YWxhcnIgPSB2YWw7XG4gICAgICAgICAgICAgICAgcmVzLnByZXNlbnRyZWNvcmRzKys7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodmFsID09PSBmYWN0KSB7XG4gICAgICAgICAgICByZXMucHJlc2VudHJlY29yZHMrKztcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmNvdW50UmVjb3JkUHJlc2VuY2VGYWN0ID0gY291bnRSZWNvcmRQcmVzZW5jZUZhY3Q7XG5mdW5jdGlvbiBtYWtlVmFsdWVzTGlzdFN0cmluZyhyZWFsdmFsdWVzKSB7XG4gICAgdmFyIHZhbHVlc1N0cmluZyA9IFwiXCI7XG4gICAgdmFyIHRvdGFsbGVuID0gMDtcbiAgICB2YXIgbGlzdFZhbHVlcyA9IHJlYWx2YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uICh2YWwsIGluZGV4KSB7XG4gICAgICAgIHRvdGFsbGVuID0gdG90YWxsZW4gKyB2YWwubGVuZ3RoO1xuICAgICAgICByZXR1cm4gKGluZGV4IDwgQWxnb2wuRGVzY3JpYmVWYWx1ZUxpc3RNaW5Db3VudFZhbHVlTGlzdCkgfHwgKHRvdGFsbGVuIDwgQWxnb2wuRGVzY3JpYmVWYWx1ZUxpc3RMZW5ndGhDaGFyTGltaXQpO1xuICAgIH0pO1xuICAgIGlmIChsaXN0VmFsdWVzLmxlbmd0aCA9PT0gMSAmJiByZWFsdmFsdWVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gJ1RoZSBzb2xlIHZhbHVlIGlzIFxcXCInICsgbGlzdFZhbHVlc1swXSArICdcIic7XG4gICAgfVxuICAgIHZhciBtYXhsZW4gPSBsaXN0VmFsdWVzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgdmFsKSB7IHJldHVybiBNYXRoLm1heChwcmV2LCB2YWwubGVuZ3RoKTsgfSwgMCk7XG4gICAgaWYgKG1heGxlbiA+IDMwKSB7XG4gICAgICAgIHJldHVybiBcIlBvc3NpYmxlIHZhbHVlcyBhcmUgLi4uXFxuXCIgK1xuICAgICAgICAgICAgbGlzdFZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHZhbCwgaW5kZXgpIHsgcmV0dXJuIChwcmV2ICsgXCIoXCIgKyAoaW5kZXggKyAxKSArICcpOiBcIicgKyB2YWwgKyAnXCJcXG4nKTsgfSwgXCJcIilcbiAgICAgICAgICAgICsgKGxpc3RWYWx1ZXMubGVuZ3RoID09PSByZWFsdmFsdWVzLmxlbmd0aCA/IFwiXCIgOiBcIi4uLlwiKTtcbiAgICB9XG4gICAgdmFyIGxpc3QgPSBcIlwiO1xuICAgIGlmIChsaXN0VmFsdWVzLmxlbmd0aCA9PT0gcmVhbHZhbHVlcy5sZW5ndGgpIHtcbiAgICAgICAgbGlzdCA9IFV0aWxzLmxpc3RUb1F1b3RlZENvbW1hT3IobGlzdFZhbHVlcyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBsaXN0ID0gJ1wiJyArIGxpc3RWYWx1ZXMuam9pbignXCIsIFwiJykgKyAnXCInO1xuICAgIH1cbiAgICByZXR1cm4gXCJQb3NzaWJsZSB2YWx1ZXMgYXJlIC4uLlxcblwiXG4gICAgICAgICsgbGlzdFxuICAgICAgICArIChsaXN0VmFsdWVzLmxlbmd0aCA9PT0gcmVhbHZhbHVlcy5sZW5ndGggPyBcIlwiIDogXCIgLi4uXCIpO1xufVxuZXhwb3J0cy5tYWtlVmFsdWVzTGlzdFN0cmluZyA9IG1ha2VWYWx1ZXNMaXN0U3RyaW5nO1xuZnVuY3Rpb24gdG9QZXJjZW50KGEsIGIpIHtcbiAgICByZXR1cm4gXCJcIiArICgxMDAgKiBhIC8gYikudG9GaXhlZCgxKTtcbn1cbmV4cG9ydHMudG9QZXJjZW50ID0gdG9QZXJjZW50O1xuO1xuZnVuY3Rpb24gZ2V0Q2F0ZWdvcnlTdGF0c0luRG9tYWluKGNhdGVnb3J5LCBmaWx0ZXJkb21haW4sIHRoZU1vZGVsKSB7XG4gICAgdmFyIHJlY29yZENvdW50ID0gY291bnRSZWNvcmRQcmVzZW5jZShjYXRlZ29yeSwgZmlsdGVyZG9tYWluLCB0aGVNb2RlbCk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkodGhlTW9kZWwucmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKGEpIHsgcmV0dXJuIGEuX2RvbWFpbiA9PT0gXCJDb3Ntb3NcIjsgfSksIHVuZGVmaW5lZCwgMikpO1xuICAgIHZhciBwZXJjZW50ID0gdG9QZXJjZW50KHJlY29yZENvdW50LnByZXNlbnRyZWNvcmRzLCByZWNvcmRDb3VudC50b3RhbHJlY29yZHMpO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZENvdW50LnZhbHVlcykpO1xuICAgIHZhciBhbGxWYWx1ZXMgPSBPYmplY3Qua2V5cyhyZWNvcmRDb3VudC52YWx1ZXMpO1xuICAgIHZhciByZWFsdmFsdWVzID0gYWxsVmFsdWVzLmZpbHRlcihmdW5jdGlvbiAodmFsdWUpIHsgcmV0dXJuICh2YWx1ZSAhPT0gJ3VuZGVmaW5lZCcpICYmICh2YWx1ZSAhPT0gJ24vYScpOyB9KTtcbiAgICBkZWJ1Z2xvZztcbiAgICByZWFsdmFsdWVzLnNvcnQoKTtcbiAgICB2YXIgdW5kZWZOYURlbHRhID0gKGFsbFZhbHVlcy5sZW5ndGggLSByZWFsdmFsdWVzLmxlbmd0aCk7XG4gICAgdmFyIGRlbHRhID0gKHVuZGVmTmFEZWx0YSkgPyBcIigrXCIgKyB1bmRlZk5hRGVsdGEgKyBcIilcIiA6IFwiXCI7XG4gICAgdmFyIGRpc3RpbmN0ID0gJycgKyByZWFsdmFsdWVzLmxlbmd0aDtcbiAgICB2YXIgdmFsdWVzTGlzdCA9IG1ha2VWYWx1ZXNMaXN0U3RyaW5nKHJlYWx2YWx1ZXMpO1xuICAgIHJldHVybiB7XG4gICAgICAgIGNhdGVnb3J5RGVzYzogdGhlTW9kZWwuZnVsbC5kb21haW5bZmlsdGVyZG9tYWluXS5jYXRlZ29yaWVzW2NhdGVnb3J5XSxcbiAgICAgICAgZGlzdGluY3Q6IGRpc3RpbmN0LFxuICAgICAgICBkZWx0YTogZGVsdGEsXG4gICAgICAgIHByZXNlbnRSZWNvcmRzOiByZWNvcmRDb3VudC5wcmVzZW50cmVjb3JkcyxcbiAgICAgICAgcGVyY1ByZXNlbnQ6IHBlcmNlbnQsXG4gICAgICAgIHNhbXBsZVZhbHVlczogdmFsdWVzTGlzdFxuICAgIH07XG59XG5leHBvcnRzLmdldENhdGVnb3J5U3RhdHNJbkRvbWFpbiA9IGdldENhdGVnb3J5U3RhdHNJbkRvbWFpbjtcbmZ1bmN0aW9uIGRlc2NyaWJlQ2F0ZWdvcnlJbkRvbWFpbihjYXRlZ29yeSwgZmlsdGVyZG9tYWluLCB0aGVNb2RlbCkge1xuICAgIC8qICBjb25zdCByZWNvcmRDb3VudCA9IGNvdW50UmVjb3JkUHJlc2VuY2UoY2F0ZWdvcnksIGZpbHRlcmRvbWFpbiwgdGhlTW9kZWwpO1xuICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkodGhlTW9kZWwucmVjb3Jkcy5maWx0ZXIoYSA9PiBhLl9kb21haW4gPT09IFwiQ29zbW9zXCIpLHVuZGVmaW5lZCwyKSk7XG4gICAgICBjb25zdCBwZXJjZW50ID0gdG9QZXJjZW50KHJlY29yZENvdW50LnByZXNlbnRyZWNvcmRzICwgcmVjb3JkQ291bnQudG90YWxyZWNvcmRzKTtcbiAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZENvdW50LnZhbHVlcykpO1xuICAgICAgdmFyIGFsbFZhbHVlcyA9T2JqZWN0LmtleXMocmVjb3JkQ291bnQudmFsdWVzKTtcbiAgICAgIHZhciByZWFsdmFsdWVzID0gYWxsVmFsdWVzLmZpbHRlcih2YWx1ZSA9PiAodmFsdWUgIT09ICd1bmRlZmluZWQnKSAmJiAodmFsdWUgIT09ICduL2EnKSk7XG4gICAgICBkZWJ1Z2xvZ1xuICAgICAgcmVhbHZhbHVlcy5zb3J0KCk7XG4gICAgICB2YXIgdW5kZWZOYURlbHRhID0gIChhbGxWYWx1ZXMubGVuZ3RoIC0gcmVhbHZhbHVlcy5sZW5ndGgpO1xuICAgICAgdmFyIGRlbHRhID0gICh1bmRlZk5hRGVsdGEpID8gIFwiKCtcIiArIHVuZGVmTmFEZWx0YSArIFwiKVwiIDogXCJcIjtcbiAgICAgIGNvbnN0IGRpc3RpbmN0ID0gJycgKyByZWFsdmFsdWVzLmxlbmd0aDtcbiAgICBcbiAgICAgIGNvbnN0IHZhbHVlc0xpc3QgPSBtYWtlVmFsdWVzTGlzdFN0cmluZyhyZWFsdmFsdWVzKTtcbiAgICAqL1xuICAgIHZhciBzdGF0cyA9IGdldENhdGVnb3J5U3RhdHNJbkRvbWFpbihjYXRlZ29yeSwgZmlsdGVyZG9tYWluLCB0aGVNb2RlbCk7XG4gICAgdmFyIHJlcyA9ICdpcyBhIGNhdGVnb3J5IGluIGRvbWFpbiBcIicgKyBmaWx0ZXJkb21haW4gKyAnXCJcXG4nXG4gICAgICAgICsgKFwiSXQgaXMgcHJlc2VudCBpbiBcIiArIHN0YXRzLnByZXNlbnRSZWNvcmRzICsgXCIgKFwiICsgc3RhdHMucGVyY1ByZXNlbnQgKyBcIiUpIG9mIHJlY29yZHMgaW4gdGhpcyBkb21haW4sXFxuXCIpICtcbiAgICAgICAgKFwiaGF2aW5nIFwiICsgKHN0YXRzLmRpc3RpbmN0ICsgJycpICsgc3RhdHMuZGVsdGEgKyBcIiBkaXN0aW5jdCB2YWx1ZXMuXFxuXCIpXG4gICAgICAgICsgc3RhdHMuc2FtcGxlVmFsdWVzO1xuICAgIHZhciBkZXNjID0gdGhlTW9kZWwuZnVsbC5kb21haW5bZmlsdGVyZG9tYWluXS5jYXRlZ29yaWVzW2NhdGVnb3J5XSB8fCB7fTtcbiAgICB2YXIgZGVzY3JpcHRpb24gPSBkZXNjLmRlc2NyaXB0aW9uIHx8IFwiXCI7XG4gICAgaWYgKGRlc2NyaXB0aW9uKSB7XG4gICAgICAgIHJlcyArPSBcIlxcbkRlc2NyaXB0aW9uOiBcIiArIGRlc2NyaXB0aW9uO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5kZXNjcmliZUNhdGVnb3J5SW5Eb21haW4gPSBkZXNjcmliZUNhdGVnb3J5SW5Eb21haW47XG5mdW5jdGlvbiBmaW5kUmVjb3Jkc1dpdGhGYWN0KG1hdGNoZWRTdHJpbmcsIGNhdGVnb3J5LCByZWNvcmRzLCBkb21haW5zKSB7XG4gICAgcmV0dXJuIHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgdmFyIHJlcyA9IChyZWNvcmRbY2F0ZWdvcnldID09PSBtYXRjaGVkU3RyaW5nKTtcbiAgICAgICAgaWYgKHJlcykge1xuICAgICAgICAgICAgaW5jcmVtZW50KGRvbWFpbnMsIHJlY29yZHMuX2RvbWFpbik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9KTtcbn1cbmV4cG9ydHMuZmluZFJlY29yZHNXaXRoRmFjdCA9IGZpbmRSZWNvcmRzV2l0aEZhY3Q7XG5mdW5jdGlvbiBpbmNyZW1lbnQobWFwLCBrZXkpIHtcbiAgICBtYXBba2V5XSA9IChtYXBba2V5XSB8fCAwKSArIDE7XG59XG5leHBvcnRzLmluY3JlbWVudCA9IGluY3JlbWVudDtcbmZ1bmN0aW9uIHNvcnRlZEtleXMobWFwKSB7XG4gICAgdmFyIHIgPSBPYmplY3Qua2V5cyhtYXApO1xuICAgIHIuc29ydCgpO1xuICAgIHJldHVybiByO1xufVxuZnVuY3Rpb24gZGVzY3JpYmVEb21haW4oZmFjdCwgZG9tYWluLCB0aGVNb2RlbCkge1xuICAgIHZhciBjb3VudCA9IHRoZU1vZGVsLnJlY29yZHMucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCByZWNvcmQpIHtcbiAgICAgICAgcmV0dXJuIHByZXYgKyAoKHJlY29yZC5fZG9tYWluID09PSBkb21haW4pID8gMSA6IDApO1xuICAgIH0sIDApO1xuICAgIHZhciBjYXRjb3VudCA9IE1vZGVsLmdldENhdGVnb3JpZXNGb3JEb21haW4odGhlTW9kZWwsIGRvbWFpbikubGVuZ3RoO1xuICAgIHZhciByZXMgPSBzbG9wcHlPckV4YWN0KGRvbWFpbiwgZmFjdCwgdGhlTW9kZWwpICsgKFwiaXMgYSBkb21haW4gd2l0aCBcIiArIGNhdGNvdW50ICsgXCIgY2F0ZWdvcmllcyBhbmQgXCIgKyBjb3VudCArIFwiIHJlY29yZHNcXG5cIik7XG4gICAgdmFyIGRlc2MgPSB0aGVNb2RlbC5mdWxsLmRvbWFpbltkb21haW5dLmRlc2NyaXB0aW9uIHx8IFwiXCI7XG4gICAgaWYgKGRlc2MpIHtcbiAgICAgICAgcmVzICs9IFwiRGVzY3JpcHRpb246XCIgKyBkZXNjICsgXCJcXG5cIjtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZGVzY3JpYmVEb21haW4gPSBkZXNjcmliZURvbWFpbjtcbmZ1bmN0aW9uIGRlc2NyaWJlRmFjdEluRG9tYWluKGZhY3QsIGZpbHRlcmRvbWFpbiwgdGhlTW9kZWwpIHtcbiAgICB2YXIgc2VudGVuY2VzID0gV2hhdElzLmFuYWx5emVDb250ZXh0U3RyaW5nKGZhY3QsIHRoZU1vZGVsLnJ1bGVzKTtcbiAgICAvL2NvbnNvbGUubG9nKFwiaGVyZSBzZW50ZW5jZXMgXCIgKyBKU09OLnN0cmluZ2lmeShzZW50ZW5jZXMpKTtcbiAgICB2YXIgbGVuZ3RoT25lU2VudGVuY2VzID0gc2VudGVuY2VzLmZpbHRlcihmdW5jdGlvbiAob1NlbnRlbmNlKSB7IHJldHVybiBvU2VudGVuY2UubGVuZ3RoID09PSAxOyB9KTtcbiAgICB2YXIgcmVzID0gJyc7XG4gICAgLy8gcmVtb3ZlIGNhdGVnb3JpZXMgYW5kIGRvbWFpbnNcbiAgICB2YXIgb25seUZhY3RzID0gbGVuZ3RoT25lU2VudGVuY2VzLmZpbHRlcihmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9TZW50ZW5jZVswXSkpO1xuICAgICAgICByZXR1cm4gIVdvcmQuV29yZC5pc0RvbWFpbihvU2VudGVuY2VbMF0pICYmXG4gICAgICAgICAgICAhV29yZC5Xb3JkLmlzRmlsbGVyKG9TZW50ZW5jZVswXSkgJiYgIVdvcmQuV29yZC5pc0NhdGVnb3J5KG9TZW50ZW5jZVswXSk7XG4gICAgfSk7XG4gICAgdmFyIG9ubHlEb21haW5zID0gbGVuZ3RoT25lU2VudGVuY2VzLmZpbHRlcihmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgIHJldHVybiBXb3JkLldvcmQuaXNEb21haW4ob1NlbnRlbmNlWzBdKTtcbiAgICB9KTtcbiAgICBpZiAob25seURvbWFpbnMgJiYgb25seURvbWFpbnMubGVuZ3RoID4gMCkge1xuICAgICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvbmx5RG9tYWlucykpO1xuICAgICAgICBvbmx5RG9tYWlucy5mb3JFYWNoKGZ1bmN0aW9uIChzZW50ZW5jZSkge1xuICAgICAgICAgICAgdmFyIGRvbWFpbiA9IHNlbnRlbmNlWzBdLm1hdGNoZWRTdHJpbmc7XG4gICAgICAgICAgICBpZiAoIWZpbHRlcmRvbWFpbiB8fCBkb21haW4gPT09IGZpbHRlcmRvbWFpbikge1xuICAgICAgICAgICAgICAgIGRlYnVnbG9nKFwiaGVyZSBtYXRjaCBcIiArIEpTT04uc3RyaW5naWZ5KHNlbnRlbmNlKSk7XG4gICAgICAgICAgICAgICAgcmVzICs9IGRlc2NyaWJlRG9tYWluKGZhY3QsIHNlbnRlbmNlWzBdLm1hdGNoZWRTdHJpbmcsIHRoZU1vZGVsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGRlYnVnbG9nKFwib25seSBmYWN0czogXCIgKyBKU09OLnN0cmluZ2lmeShvbmx5RmFjdHMpKTtcbiAgICB2YXIgcmVjb3JkTWFwID0ge307XG4gICAgdmFyIGRvbWFpbnNNYXAgPSB7fTtcbiAgICB2YXIgbWF0Y2hlZHdvcmRNYXAgPSB7fTtcbiAgICB2YXIgbWF0Y2hlZENhdGVnb3J5TWFwID0ge307XG4gICAgLy8gbG9vayBmb3IgYWxsIHJlY29yZHNcbiAgICBvbmx5RmFjdHMuZm9yRWFjaChmdW5jdGlvbiAob1NlbnRlbmNlKSB7XG4gICAgICAgIHJldHVybiBvU2VudGVuY2UuZm9yRWFjaChmdW5jdGlvbiAob1dvcmQpIHtcbiAgICAgICAgICAgIGluY3JlbWVudChtYXRjaGVkd29yZE1hcCwgb1dvcmQubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgICAgICBpbmNyZW1lbnQobWF0Y2hlZENhdGVnb3J5TWFwLCBvV29yZC5jYXRlZ29yeSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIC8vIHdlIGhhdmU6XG4gICAgLy8gYSBsaXN0IG9mIGNhdGVnb3JpZXMsXG4gICAgLy8gYSBsaXN0IG9mIG1hdGNoZWRXb3JkcyAgLT5cbiAgICAvL1xuICAgIHZhciBjYXRlZ29yaWVzID0gc29ydGVkS2V5cyhtYXRjaGVkQ2F0ZWdvcnlNYXApO1xuICAgIHZhciBtYXRjaGVkd29yZHMgPSBzb3J0ZWRLZXlzKG1hdGNoZWR3b3JkTWFwKTtcbiAgICBkZWJ1Z2xvZyhcIm1hdGNoZWR3b3JkczogXCIgKyBKU09OLnN0cmluZ2lmeShtYXRjaGVkd29yZHMpKTtcbiAgICBkZWJ1Z2xvZyhcImNhdGVnb3JpZXM6IFwiICsgSlNPTi5zdHJpbmdpZnkoY2F0ZWdvcmllcykpO1xuICAgIC8vdmFyIGFsbE1hdGNoZWRXb3JkcyA9IHsgW2tleSA6IHN0cmluZ10gOiBudW1iZXIgfTtcbiAgICB2YXIgZG9tYWluUmVjb3JkQ291bnQgPSB7fTtcbiAgICB2YXIgZG9tYWluTWF0Y2hDYXRDb3VudCA9IHt9O1xuICAgIC8vIHdlIHByZXBhcmUgdGhlIGZvbGxvd2luZyBzdHJ1Y3R1cmVcbiAgICAvL1xuICAgIC8vIHtkb21haW59IDogcmVjb3JkY291bnQ7XG4gICAgLy8ge21hdGNoZWR3b3Jkc30gOlxuICAgIC8vIHtkb21haW59IHttYXRjaGVkd29yZH0ge2NhdGVnb3J5fSBwcmVzZW5jZWNvdW50XG4gICAgdGhlTW9kZWwucmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgaWYgKCFmaWx0ZXJkb21haW4gfHwgcmVjb3JkLl9kb21haW4gPT09IGZpbHRlcmRvbWFpbikge1xuICAgICAgICAgICAgZG9tYWluUmVjb3JkQ291bnRbcmVjb3JkLl9kb21haW5dID0gKGRvbWFpblJlY29yZENvdW50W3JlY29yZC5fZG9tYWluXSB8fCAwKSArIDE7XG4gICAgICAgICAgICBtYXRjaGVkd29yZHMuZm9yRWFjaChmdW5jdGlvbiAobWF0Y2hlZHdvcmQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2F0ZWdvcmllcy5mb3JFYWNoKGZ1bmN0aW9uIChjYXRlZ29yeSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVjb3JkW2NhdGVnb3J5XSA9PT0gbWF0Y2hlZHdvcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtZCA9IGRvbWFpbk1hdGNoQ2F0Q291bnRbcmVjb3JkLl9kb21haW5dID0gZG9tYWluTWF0Y2hDYXRDb3VudFtyZWNvcmQuX2RvbWFpbl0gfHwge307XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWRjID0gbWRbbWF0Y2hlZHdvcmRdID0gbWRbbWF0Y2hlZHdvcmRdIHx8IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5jcmVtZW50KG1kYywgY2F0ZWdvcnkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZG9tYWluTWF0Y2hDYXRDb3VudCwgdW5kZWZpbmVkLCAyKSk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZG9tYWluUmVjb3JkQ291bnQsIHVuZGVmaW5lZCwgMikpO1xuICAgIHZhciBkb21haW5zID0gc29ydGVkS2V5cyhkb21haW5NYXRjaENhdENvdW50KTtcbiAgICB2YXIgcmVzTmV4dCA9ICdcIicgKyBmYWN0ICsgJ1wiIGhhcyBhIG1lYW5pbmcgaW4gJztcbiAgICB2YXIgc2luZ2xlID0gZmFsc2U7XG4gICAgaWYgKE9iamVjdC5rZXlzKGRvbWFpbk1hdGNoQ2F0Q291bnQpLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgcmVzTmV4dCArPSAnJyArIGRvbWFpbnMubGVuZ3RoICtcbiAgICAgICAgICAgICcgZG9tYWluczogJyArIFV0aWxzLmxpc3RUb1F1b3RlZENvbW1hQW5kKGRvbWFpbnMpICsgXCJcIjtcbiAgICB9XG4gICAgZWxzZSBpZiAoZG9tYWlucy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgaWYgKCFmaWx0ZXJkb21haW4pIHtcbiAgICAgICAgICAgIHJlc05leHQgKz0gXCJvbmUgXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmVzTmV4dCArPSBcImRvbWFpbiBcXFwiXCIgKyBkb21haW5zWzBdICsgXCJcXFwiOlwiO1xuICAgICAgICBzaW5nbGUgPSB0cnVlO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgaWYgKHJlcykge1xuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfVxuICAgICAgICBpZiAoZmlsdGVyZG9tYWluKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJcXFwiXCIgKyBmYWN0ICsgXCJcXFwiIGlzIG5vIGtub3duIGZhY3QgaW4gZG9tYWluIFxcXCJcIiArIGZpbHRlcmRvbWFpbiArIFwiXFxcIi5cXG5cIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gXCJJIGRvbid0IGtub3cgYW55dGhpbmcgYWJvdXQgXFxcIlwiICsgZmFjdCArIFwiXFxcIi5cXG5cIjtcbiAgICB9XG4gICAgcmVzICs9IHJlc05leHQgKyBcIlxcblwiOyAvLyAuLi5cXG5cIjtcbiAgICBkb21haW5zLmZvckVhY2goZnVuY3Rpb24gKGRvbWFpbikge1xuICAgICAgICB2YXIgbWQgPSBkb21haW5NYXRjaENhdENvdW50W2RvbWFpbl07XG4gICAgICAgIE9iamVjdC5rZXlzKG1kKS5mb3JFYWNoKGZ1bmN0aW9uIChtYXRjaGVkc3RyaW5nKSB7XG4gICAgICAgICAgICB2YXIgbWRjID0gbWRbbWF0Y2hlZHN0cmluZ107XG4gICAgICAgICAgICBpZiAoIXNpbmdsZSkge1xuICAgICAgICAgICAgICAgIHJlcyArPSAnaW4gZG9tYWluIFwiJyArIGRvbWFpbiArICdcIiAnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGNhdHNpbmdsZSA9IE9iamVjdC5rZXlzKG1kYykubGVuZ3RoID09PSAxO1xuICAgICAgICAgICAgcmVzICs9IHNsb3BweU9yRXhhY3QobWF0Y2hlZHN0cmluZywgZmFjdCwgdGhlTW9kZWwpICsgXCIgXCI7XG4gICAgICAgICAgICBpZiAoIWNhdHNpbmdsZSkge1xuICAgICAgICAgICAgICAgIHJlcyArPSBcIi4uLlxcblwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgT2JqZWN0LmtleXMobWRjKS5mb3JFYWNoKGZ1bmN0aW9uIChjYXRlZ29yeSkge1xuICAgICAgICAgICAgICAgIHZhciBwZXJjZW50ID0gdG9QZXJjZW50KG1kY1tjYXRlZ29yeV0sIGRvbWFpblJlY29yZENvdW50W2RvbWFpbl0pO1xuICAgICAgICAgICAgICAgIHJlcyArPSBcImlzIGEgdmFsdWUgZm9yIGNhdGVnb3J5IFxcXCJcIiArIGNhdGVnb3J5ICsgXCJcXFwiIHByZXNlbnQgaW4gXCIgKyBtZGNbY2F0ZWdvcnldICsgXCIoXCIgKyBwZXJjZW50ICsgXCIlKSBvZiByZWNvcmRzO1xcblwiO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmRlc2NyaWJlRmFjdEluRG9tYWluID0gZGVzY3JpYmVGYWN0SW5Eb21haW47XG5mdW5jdGlvbiBkZXNjcmliZUNhdGVnb3J5KGNhdGVnb3J5LCBmaWx0ZXJEb21haW4sIG1vZGVsLCBtZXNzYWdlKSB7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIHZhciBkb21zID0gTW9kZWwuZ2V0RG9tYWluc0ZvckNhdGVnb3J5KG1vZGVsLCBjYXRlZ29yeSk7XG4gICAgaWYgKGZpbHRlckRvbWFpbikge1xuICAgICAgICBpZiAoZG9tcy5pbmRleE9mKGZpbHRlckRvbWFpbikgPj0gMCkge1xuICAgICAgICAgICAgcmVzLnB1c2goZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluKGNhdGVnb3J5LCBmaWx0ZXJEb21haW4sIG1vZGVsKSk7XG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG4gICAgfVxuICAgIGRvbXMuc29ydCgpO1xuICAgIGRvbXMuZm9yRWFjaChmdW5jdGlvbiAoZG9tYWluKSB7XG4gICAgICAgIHJlcy5wdXNoKGRlc2NyaWJlQ2F0ZWdvcnlJbkRvbWFpbihjYXRlZ29yeSwgZG9tYWluLCBtb2RlbCkpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmRlc2NyaWJlQ2F0ZWdvcnkgPSBkZXNjcmliZUNhdGVnb3J5O1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
