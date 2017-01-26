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
    return 'is a category in domain "' + filterdomain + '"\n' + ("It is present in " + stats.presentRecords + " (" + stats.percPresent + "%) of records in this domain,\n") + ("having " + (stats.distinct + '') + stats.delta + " distinct values.\n") + stats.sampleValues;
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
function describeFactInDomain(fact, filterdomain, theModel) {
    var sentences = WhatIs.analyzeContextString(fact, theModel.rules);
    var lengthOneSentences = sentences.filter(function (oSentence) {
        return oSentence.length === 1;
    });
    // remove categories and domains
    var onlyFacts = lengthOneSentences.filter(function (oSentence) {
        debuglog(JSON.stringify(oSentence[0]));
        return !Word.Word.isFiller(oSentence[0]) && !Word.Word.isCategory(oSentence[0]);
    });
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
    var res = '"' + fact + '" has a meaning in ';
    var single = false;
    if (Object.keys(domainMatchCatCount).length > 1) {
        res += '' + domains.length + ' domains: ' + Utils.listToQuotedCommaAnd(domains) + "";
    } else if (domains.length === 1) {
        if (!filterdomain) {
            res += "one ";
        }
        res += "domain \"" + domains[0] + "\":";
        single = true;
    } else {
        if (filterdomain) {
            return "\"" + fact + "\" is no known fact in domain \"" + filterdomain + "\".\n";
        }
        return "\"" + fact + "\" is no known fact.\n";
    }
    res += "\n"; // ...\n";
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9kZXNjcmliZS50cyIsIm1hdGNoL2Rlc2NyaWJlLmpzIl0sIm5hbWVzIjpbIkFsZ29sIiwicmVxdWlyZSIsImRlYnVnIiwiZGVidWdsb2ciLCJsb2dnZXIiLCJsb2dQZXJmIiwicGVyZiIsInBlcmZsb2ciLCJXb3JkIiwiV2hhdElzIiwiTW9kZWwiLCJVdGlscyIsInNXb3JkcyIsImlzU3lub255bUZvciIsImV4YWN0V29yZCIsInNsb3BweVdvcmQiLCJ0aGVNb2RlbCIsImV4cG9ydHMiLCJzbG9wcHlPckV4YWN0IiwidG9Mb3dlckNhc2UiLCJjb3VudFJlY29yZFByZXNlbmNlIiwiY2F0ZWdvcnkiLCJkb21haW4iLCJyZXMiLCJ0b3RhbHJlY29yZHMiLCJwcmVzZW50cmVjb3JkcyIsInZhbHVlcyIsIm11bHRpdmFsdWVkIiwicmVjb3JkcyIsImZvckVhY2giLCJyZWNvcmQiLCJfZG9tYWluIiwidmFsIiwidmFsYXJyIiwiQXJyYXkiLCJpc0FycmF5IiwidW5kZWZpbmVkIiwiY291bnRSZWNvcmRQcmVzZW5jZUZhY3QiLCJmYWN0IiwiaW5kZXhPZiIsIm1ha2VWYWx1ZXNMaXN0U3RyaW5nIiwicmVhbHZhbHVlcyIsInZhbHVlc1N0cmluZyIsInRvdGFsbGVuIiwibGlzdFZhbHVlcyIsImZpbHRlciIsImluZGV4IiwibGVuZ3RoIiwiRGVzY3JpYmVWYWx1ZUxpc3RNaW5Db3VudFZhbHVlTGlzdCIsIkRlc2NyaWJlVmFsdWVMaXN0TGVuZ3RoQ2hhckxpbWl0IiwibWF4bGVuIiwicmVkdWNlIiwicHJldiIsIk1hdGgiLCJtYXgiLCJsaXN0IiwibGlzdFRvUXVvdGVkQ29tbWFPciIsImpvaW4iLCJ0b1BlcmNlbnQiLCJhIiwiYiIsInRvRml4ZWQiLCJnZXRDYXRlZ29yeVN0YXRzSW5Eb21haW4iLCJmaWx0ZXJkb21haW4iLCJyZWNvcmRDb3VudCIsIkpTT04iLCJzdHJpbmdpZnkiLCJwZXJjZW50IiwiYWxsVmFsdWVzIiwiT2JqZWN0Iiwia2V5cyIsInZhbHVlIiwic29ydCIsInVuZGVmTmFEZWx0YSIsImRlbHRhIiwiZGlzdGluY3QiLCJ2YWx1ZXNMaXN0IiwiY2F0ZWdvcnlEZXNjIiwiZnVsbCIsImNhdGVnb3JpZXMiLCJwcmVzZW50UmVjb3JkcyIsInBlcmNQcmVzZW50Iiwic2FtcGxlVmFsdWVzIiwiZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluIiwic3RhdHMiLCJmaW5kUmVjb3Jkc1dpdGhGYWN0IiwibWF0Y2hlZFN0cmluZyIsImRvbWFpbnMiLCJpbmNyZW1lbnQiLCJtYXAiLCJrZXkiLCJzb3J0ZWRLZXlzIiwiciIsImRlc2NyaWJlRmFjdEluRG9tYWluIiwic2VudGVuY2VzIiwiYW5hbHl6ZUNvbnRleHRTdHJpbmciLCJydWxlcyIsImxlbmd0aE9uZVNlbnRlbmNlcyIsIm9TZW50ZW5jZSIsIm9ubHlGYWN0cyIsImlzRmlsbGVyIiwiaXNDYXRlZ29yeSIsInJlY29yZE1hcCIsImRvbWFpbnNNYXAiLCJtYXRjaGVkd29yZE1hcCIsIm1hdGNoZWRDYXRlZ29yeU1hcCIsIm9Xb3JkIiwibWF0Y2hlZHdvcmRzIiwiZG9tYWluUmVjb3JkQ291bnQiLCJkb21haW5NYXRjaENhdENvdW50IiwibWF0Y2hlZHdvcmQiLCJtZCIsIm1kYyIsInNpbmdsZSIsImxpc3RUb1F1b3RlZENvbW1hQW5kIiwibWF0Y2hlZHN0cmluZyIsImNhdHNpbmdsZSIsImRlc2NyaWJlQ2F0ZWdvcnkiLCJmaWx0ZXJEb21haW4iLCJtb2RlbCIsIm1lc3NhZ2UiLCJkb21zIiwiZ2V0RG9tYWluc0ZvckNhdGVnb3J5IiwicHVzaCJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7O0FDUUE7O0FER0EsSUFBWUEsUUFBS0MsUUFBTSxTQUFOLENBQWpCO0FBQ0EsSUFBWUMsUUFBS0QsUUFBTSxPQUFOLENBQWpCO0FBRUEsSUFBTUUsV0FBV0QsTUFBTSxVQUFOLENBQWpCO0FBQ0EsSUFBWUUsU0FBTUgsUUFBTSxpQkFBTixDQUFsQjtBQUNBLElBQUlJLFVBQVVELE9BQU9FLElBQVAsQ0FBWSxhQUFaLENBQWQ7QUFDQSxJQUFJQyxVQUFVTCxNQUFNLE1BQU4sQ0FBZDtBQVVBLElBQVlNLE9BQUlQLFFBQU0sUUFBTixDQUFoQjtBQUdBLElBQVlRLFNBQU1SLFFBQU0sVUFBTixDQUFsQjtBQUVBLElBQVlTLFFBQUtULFFBQU0sZ0JBQU4sQ0FBakI7QUFJQSxJQUFZVSxRQUFLVixRQUFNLGdCQUFOLENBQWpCO0FBR0EsSUFBSVcsU0FBUyxFQUFiO0FBRUEsU0FBQUMsWUFBQSxDQUE2QkMsU0FBN0IsRUFBaURDLFVBQWpELEVBQXNFQyxRQUF0RSxFQUE4RjtBQUM1RjtBQUNBLFdBQU9ELGVBQWUsTUFBZixJQUF5QkQsY0FBYyxjQUE5QztBQUNEO0FBSGVHLFFBQUFKLFlBQUEsR0FBWUEsWUFBWjtBQUtoQixTQUFBSyxhQUFBLENBQThCSixTQUE5QixFQUFrREMsVUFBbEQsRUFBdUVDLFFBQXZFLEVBQStGO0FBQzdGLFFBQUdGLFVBQVVLLFdBQVYsT0FBNEJKLFdBQVdJLFdBQVgsRUFBL0IsRUFBeUQ7QUFDdkQsZUFBTyxNQUFNSixVQUFOLEdBQW1CLEdBQTFCO0FBQ0Q7QUFDRDtBQUNBO0FBQ0E7QUFDQSxRQUFHRixhQUFhQyxTQUFiLEVBQXVCQyxVQUF2QixFQUFrQ0MsUUFBbEMsQ0FBSCxFQUFnRDtBQUNsRCxlQUFPLE1BQU1ELFVBQU4sR0FBbUIsaUNBQW5CLEdBQXVERCxTQUF2RCxHQUFrRSxJQUF6RTtBQUNHO0FBQ0Q7QUFDQTtBQUNBLFdBQU8sTUFBTUMsVUFBTixHQUFtQixxQkFBbkIsR0FBMkNELFNBQTNDLEdBQXNELElBQTdEO0FBQ0Q7QUFiZUcsUUFBQUMsYUFBQSxHQUFhQSxhQUFiO0FBc0JoQixTQUFBRSxtQkFBQSxDQUFvQ0MsUUFBcEMsRUFBdURDLE1BQXZELEVBQXdFTixRQUF4RSxFQUFpRztBQUMvRixRQUFJTyxNQUFNLEVBQUVDLGNBQWUsQ0FBakI7QUFDUkMsd0JBQWlCLENBRFQ7QUFFUkMsZ0JBQVMsRUFGRDtBQUdSQyxxQkFBYztBQUhOLEtBQVY7QUFLQVgsYUFBU1ksT0FBVCxDQUFpQkMsT0FBakIsQ0FBeUIsVUFBU0MsTUFBVCxFQUFlO0FBQ3RDO0FBQ0EsWUFBR0EsT0FBT0MsT0FBUCxLQUFtQlQsTUFBdEIsRUFBOEI7QUFDNUI7QUFDRDtBQUNEQyxZQUFJQyxZQUFKO0FBQ0EsWUFBSVEsTUFBTUYsT0FBT1QsUUFBUCxDQUFWO0FBQ0EsWUFBSVksU0FBUyxDQUFDRCxHQUFELENBQWI7QUFDQSxZQUFHRSxNQUFNQyxPQUFOLENBQWNILEdBQWQsQ0FBSCxFQUF1QjtBQUNyQlQsZ0JBQUlJLFdBQUosR0FBa0IsSUFBbEI7QUFDQU0scUJBQVNELEdBQVQ7QUFDRDtBQUNEO0FBQ0EsWUFBR0EsUUFBUUksU0FBUixJQUFxQkosUUFBUSxLQUFoQyxFQUF1QztBQUNyQ1QsZ0JBQUlFLGNBQUo7QUFDRDtBQUNEUSxlQUFPSixPQUFQLENBQWUsVUFBU0csR0FBVCxFQUFZO0FBQ3pCVCxnQkFBSUcsTUFBSixDQUFXTSxHQUFYLElBQWtCLENBQUNULElBQUlHLE1BQUosQ0FBV00sR0FBWCxLQUFtQixDQUFwQixJQUF5QixDQUEzQztBQUNELFNBRkQ7QUFHRCxLQW5CRDtBQW9CQSxXQUFPVCxHQUFQO0FBQ0Q7QUEzQmVOLFFBQUFHLG1CQUFBLEdBQW1CQSxtQkFBbkI7QUFxQ2hCLFNBQUFpQix1QkFBQSxDQUF3Q0MsSUFBeEMsRUFBdURqQixRQUF2RCxFQUEwRUMsTUFBMUUsRUFBMkZOLFFBQTNGLEVBQW9IO0FBQ2xILFFBQUlPLE1BQU0sRUFBRUMsY0FBZSxDQUFqQjtBQUNSQyx3QkFBaUIsQ0FEVDtBQUVSQyxnQkFBUyxFQUZEO0FBR1JDLHFCQUFjO0FBSE4sS0FBVjtBQUtBWCxhQUFTWSxPQUFULENBQWlCQyxPQUFqQixDQUF5QixVQUFTQyxNQUFULEVBQWU7QUFDdEM7QUFDQSxZQUFHQSxPQUFPQyxPQUFQLEtBQW1CVCxNQUF0QixFQUE4QjtBQUM1QjtBQUNEO0FBQ0RDLFlBQUlDLFlBQUo7QUFDQSxZQUFJUSxNQUFNRixPQUFPVCxRQUFQLENBQVY7QUFDQSxZQUFJWSxTQUFTLENBQUNELEdBQUQsQ0FBYjtBQUNBLFlBQUdFLE1BQU1DLE9BQU4sQ0FBY0gsR0FBZCxDQUFILEVBQXVCO0FBQ3JCLGdCQUFHQSxJQUFJTyxPQUFKLENBQVlELElBQVosS0FBcUIsQ0FBeEIsRUFBMkI7QUFDekJmLG9CQUFJSSxXQUFKLEdBQWtCLElBQWxCO0FBQ0FNLHlCQUFTRCxHQUFUO0FBQ0FULG9CQUFJRSxjQUFKO0FBQ0Q7QUFDRixTQU5ELE1BTU8sSUFBSU8sUUFBUU0sSUFBWixFQUFrQjtBQUNyQmYsZ0JBQUlFLGNBQUo7QUFDSDtBQUNGLEtBakJEO0FBa0JBLFdBQU9GLEdBQVA7QUFDRDtBQXpCZU4sUUFBQW9CLHVCQUFBLEdBQXVCQSx1QkFBdkI7QUEyQmhCLFNBQUFHLG9CQUFBLENBQXFDQyxVQUFyQyxFQUF5RDtBQUN2RCxRQUFJQyxlQUFlLEVBQW5CO0FBQ0EsUUFBSUMsV0FBVyxDQUFmO0FBQ0EsUUFBSUMsYUFBYUgsV0FBV0ksTUFBWCxDQUFrQixVQUFTYixHQUFULEVBQWNjLEtBQWQsRUFBbUI7QUFDcERILG1CQUFXQSxXQUFXWCxJQUFJZSxNQUExQjtBQUNGLGVBQVFELFFBQVE5QyxNQUFNZ0Qsa0NBQWYsSUFBdURMLFdBQVczQyxNQUFNaUQsZ0NBQS9FO0FBQ0MsS0FIZ0IsQ0FBakI7QUFJQSxRQUFHTCxXQUFXRyxNQUFYLEtBQXNCLENBQXRCLElBQTJCTixXQUFXTSxNQUFYLEtBQXNCLENBQXBELEVBQXVEO0FBQ3JELGVBQU8seUJBQXlCSCxXQUFXLENBQVgsQ0FBekIsR0FBeUMsR0FBaEQ7QUFDRDtBQUNELFFBQUlNLFNBQVNOLFdBQVdPLE1BQVgsQ0FBbUIsVUFBQ0MsSUFBRCxFQUFNcEIsR0FBTixFQUFTO0FBQUssZUFBQXFCLEtBQUtDLEdBQUwsQ0FBU0YsSUFBVCxFQUFjcEIsSUFBSWUsTUFBbEIsQ0FBQTtBQUF5QixLQUExRCxFQUEyRCxDQUEzRCxDQUFiO0FBQ0EsUUFBR0csU0FBUyxFQUFaLEVBQWdCO0FBQ2QsZUFBTyw4QkFDTE4sV0FBV08sTUFBWCxDQUFtQixVQUFDQyxJQUFELEVBQU1wQixHQUFOLEVBQVVjLEtBQVYsRUFBZTtBQUFLLG1CQUFDTSxPQUFPLEdBQVAsSUFBY04sUUFBUSxDQUF0QixJQUEyQixNQUEzQixHQUFvQ2QsR0FBcEMsR0FBMEMsS0FBM0M7QUFDdEMsU0FERCxFQUNFLEVBREYsQ0FESyxJQUdEWSxXQUFXRyxNQUFYLEtBQXNCTixXQUFXTSxNQUFqQyxHQUEwQyxFQUExQyxHQUErQyxLQUg5QyxDQUFQO0FBSUQ7QUFDRCxRQUFJUSxPQUFPLEVBQVg7QUFDQSxRQUFHWCxXQUFXRyxNQUFYLEtBQXNCTixXQUFXTSxNQUFwQyxFQUE0QztBQUMxQ1EsZUFBTzVDLE1BQU02QyxtQkFBTixDQUEwQlosVUFBMUIsQ0FBUDtBQUNELEtBRkQsTUFFTztBQUNMVyxlQUFPLE1BQU1YLFdBQVdhLElBQVgsQ0FBZ0IsTUFBaEIsQ0FBTixHQUFnQyxHQUF2QztBQUNEO0FBQ0QsV0FBTyw4QkFDSEYsSUFERyxJQUVEWCxXQUFXRyxNQUFYLEtBQXNCTixXQUFXTSxNQUFqQyxHQUEwQyxFQUExQyxHQUErQyxNQUY5QyxDQUFQO0FBR0Q7QUExQmU5QixRQUFBdUIsb0JBQUEsR0FBb0JBLG9CQUFwQjtBQTRCaEIsU0FBQWtCLFNBQUEsQ0FBMEJDLENBQTFCLEVBQXNDQyxDQUF0QyxFQUErQztBQUM3QyxXQUFPLEtBQUssQ0FBQyxNQUFLRCxDQUFMLEdBQVNDLENBQVYsRUFBYUMsT0FBYixDQUFxQixDQUFyQixDQUFaO0FBQ0Q7QUFGZTVDLFFBQUF5QyxTQUFBLEdBQVNBLFNBQVQ7QUFZZjtBQUVELFNBQUFJLHdCQUFBLENBQXlDekMsUUFBekMsRUFBNEQwQyxZQUE1RCxFQUFtRi9DLFFBQW5GLEVBQTJHO0FBQ3pHLFFBQU1nRCxjQUFjNUMsb0JBQW9CQyxRQUFwQixFQUE4QjBDLFlBQTlCLEVBQTRDL0MsUUFBNUMsQ0FBcEI7QUFDQWIsYUFBUzhELEtBQUtDLFNBQUwsQ0FBZWxELFNBQVNZLE9BQVQsQ0FBaUJpQixNQUFqQixDQUF3QixVQUFBYyxDQUFBLEVBQUM7QUFBSSxlQUFBQSxFQUFFNUIsT0FBRixLQUFjLFFBQWQ7QUFBc0IsS0FBbkQsQ0FBZixFQUFvRUssU0FBcEUsRUFBOEUsQ0FBOUUsQ0FBVDtBQUNBLFFBQU0rQixVQUFVVCxVQUFVTSxZQUFZdkMsY0FBdEIsRUFBdUN1QyxZQUFZeEMsWUFBbkQsQ0FBaEI7QUFDQXJCLGFBQVM4RCxLQUFLQyxTQUFMLENBQWVGLFlBQVl0QyxNQUEzQixDQUFUO0FBQ0EsUUFBSTBDLFlBQVdDLE9BQU9DLElBQVAsQ0FBWU4sWUFBWXRDLE1BQXhCLENBQWY7QUFDQSxRQUFJZSxhQUFhMkIsVUFBVXZCLE1BQVYsQ0FBaUIsVUFBQTBCLEtBQUEsRUFBSztBQUFJLGVBQUNBLFVBQVUsV0FBWCxJQUE0QkEsVUFBVSxLQUF0QztBQUE0QyxLQUF0RSxDQUFqQjtBQUNBcEU7QUFDQXNDLGVBQVcrQixJQUFYO0FBQ0EsUUFBSUMsZUFBaUJMLFVBQVVyQixNQUFWLEdBQW1CTixXQUFXTSxNQUFuRDtBQUNBLFFBQUkyQixRQUFVRCxZQUFELEdBQWtCLE9BQU9BLFlBQVAsR0FBc0IsR0FBeEMsR0FBOEMsRUFBM0Q7QUFDQSxRQUFNRSxXQUFXLEtBQUtsQyxXQUFXTSxNQUFqQztBQUNBLFFBQU02QixhQUFhcEMscUJBQXFCQyxVQUFyQixDQUFuQjtBQUNBLFdBQU87QUFDTG9DLHNCQUFlN0QsU0FBUzhELElBQVQsQ0FBY3hELE1BQWQsQ0FBcUJ5QyxZQUFyQixFQUFtQ2dCLFVBQW5DLENBQThDMUQsUUFBOUMsQ0FEVjtBQUVMc0Qsa0JBQVdBLFFBRk47QUFHTEQsZUFBUUEsS0FISDtBQUlMTSx3QkFBaUJoQixZQUFZdkMsY0FKeEI7QUFLTHdELHFCQUFjZCxPQUxUO0FBTUxlLHNCQUFlTjtBQU5WLEtBQVA7QUFRRDtBQXJCZTNELFFBQUE2Qyx3QkFBQSxHQUF3QkEsd0JBQXhCO0FBdUJoQixTQUFBcUIsd0JBQUEsQ0FBeUM5RCxRQUF6QyxFQUE0RDBDLFlBQTVELEVBQW1GL0MsUUFBbkYsRUFBMkc7QUFDM0c7Ozs7Ozs7Ozs7Ozs7O0FBY0UsUUFBSW9FLFFBQVF0Qix5QkFBeUJ6QyxRQUF6QixFQUFrQzBDLFlBQWxDLEVBQStDL0MsUUFBL0MsQ0FBWjtBQUVBLFdBQU8sOEJBQThCK0MsWUFBOUIsR0FBNkMsS0FBN0MsSUFDTCxzQkFBb0JxQixNQUFNSixjQUExQixHQUF3QyxJQUF4QyxHQUE2Q0ksTUFBTUgsV0FBbkQsR0FBOEQsaUNBRHpELEtBRU4sYUFBVUcsTUFBTVQsUUFBTixHQUFpQixFQUEzQixJQUFnQ1MsTUFBTVYsS0FBdEMsR0FBMkMscUJBRnJDLElBR0xVLE1BQU1GLFlBSFI7QUFJRDtBQXJCZWpFLFFBQUFrRSx3QkFBQSxHQUF3QkEsd0JBQXhCO0FBdUJoQixTQUFBRSxtQkFBQSxDQUFvQ0MsYUFBcEMsRUFBMkRqRSxRQUEzRCxFQUE4RU8sT0FBOUUsRUFBNkYyRCxPQUE3RixFQUFpSTtBQUMvSCxXQUFPM0QsUUFBUWlCLE1BQVIsQ0FBZSxVQUFTZixNQUFULEVBQWU7QUFFbkMsWUFBSVAsTUFBT08sT0FBT1QsUUFBUCxNQUFxQmlFLGFBQWhDO0FBQ0EsWUFBSS9ELEdBQUosRUFBUztBQUNQaUUsc0JBQVVELE9BQVYsRUFBa0IzRCxRQUFRRyxPQUExQjtBQUNEO0FBQ0QsZUFBT1IsR0FBUDtBQUNELEtBUE0sQ0FBUDtBQVFEO0FBVGVOLFFBQUFvRSxtQkFBQSxHQUFtQkEsbUJBQW5CO0FBV2hCLFNBQUFHLFNBQUEsQ0FBMEJDLEdBQTFCLEVBQTBEQyxHQUExRCxFQUFzRTtBQUNwRUQsUUFBSUMsR0FBSixJQUFXLENBQUNELElBQUlDLEdBQUosS0FBWSxDQUFiLElBQWtCLENBQTdCO0FBQ0Q7QUFGZXpFLFFBQUF1RSxTQUFBLEdBQVNBLFNBQVQ7QUFJaEIsU0FBQUcsVUFBQSxDQUF1QkYsR0FBdkIsRUFBaUQ7QUFDL0MsUUFBSUcsSUFBSXZCLE9BQU9DLElBQVAsQ0FBWW1CLEdBQVosQ0FBUjtBQUNBRyxNQUFFcEIsSUFBRjtBQUNBLFdBQU9vQixDQUFQO0FBQ0Q7QUFFRCxTQUFBQyxvQkFBQSxDQUFxQ3ZELElBQXJDLEVBQW9EeUIsWUFBcEQsRUFBMkUvQyxRQUEzRSxFQUFtRztBQUNqRyxRQUFJOEUsWUFBWXJGLE9BQU9zRixvQkFBUCxDQUE0QnpELElBQTVCLEVBQW1DdEIsU0FBU2dGLEtBQTVDLENBQWhCO0FBQ0EsUUFBSUMscUJBQXFCSCxVQUFVakQsTUFBVixDQUFpQixVQUFBcUQsU0FBQSxFQUFTO0FBQUksZUFBQUEsVUFBVW5ELE1BQVYsS0FBcUIsQ0FBckI7QUFBc0IsS0FBcEQsQ0FBekI7QUFDQTtBQUNBLFFBQUlvRCxZQUFZRixtQkFBbUJwRCxNQUFuQixDQUEwQixVQUFBcUQsU0FBQSxFQUFTO0FBQ2pEL0YsaUJBQVM4RCxLQUFLQyxTQUFMLENBQWVnQyxVQUFVLENBQVYsQ0FBZixDQUFUO0FBQ0EsZUFBTyxDQUFDMUYsS0FBS0EsSUFBTCxDQUFVNEYsUUFBVixDQUFtQkYsVUFBVSxDQUFWLENBQW5CLENBQUQsSUFBcUMsQ0FBQzFGLEtBQUtBLElBQUwsQ0FBVTZGLFVBQVYsQ0FBcUJILFVBQVUsQ0FBVixDQUFyQixDQUE3QztBQUNELEtBSGUsQ0FBaEI7QUFLQS9GLGFBQVMsaUJBQWlCOEQsS0FBS0MsU0FBTCxDQUFlaUMsU0FBZixDQUExQjtBQUNBLFFBQUlHLFlBQVksRUFBaEI7QUFDQSxRQUFJQyxhQUFhLEVBQWpCO0FBQ0EsUUFBSUMsaUJBQWlCLEVBQXJCO0FBQ0EsUUFBSUMscUJBQXFCLEVBQXpCO0FBQ0E7QUFDQU4sY0FBVXRFLE9BQVYsQ0FBa0IsVUFBQXFFLFNBQUEsRUFBUztBQUN6QixlQUFBQSxVQUFVckUsT0FBVixDQUFrQixVQUFBNkUsS0FBQSxFQUFLO0FBRW5CbEIsc0JBQVVnQixjQUFWLEVBQTBCRSxNQUFNcEIsYUFBaEM7QUFDQUUsc0JBQVVpQixrQkFBVixFQUE4QkMsTUFBTXJGLFFBQXBDO0FBQ0QsU0FKSCxDQUFBO0FBS0MsS0FOSDtBQVFBO0FBQ0E7QUFDQTtBQUNBO0FBRUEsUUFBSTBELGFBQWFZLFdBQVdjLGtCQUFYLENBQWpCO0FBQ0EsUUFBSUUsZUFBZWhCLFdBQVdhLGNBQVgsQ0FBbkI7QUFDQXJHLGFBQVMsbUJBQW1COEQsS0FBS0MsU0FBTCxDQUFleUMsWUFBZixDQUE1QjtBQUNBeEcsYUFBUyxpQkFBaUI4RCxLQUFLQyxTQUFMLENBQWVhLFVBQWYsQ0FBMUI7QUFFQTtBQUNBLFFBQUk2QixvQkFBb0IsRUFBeEI7QUFDQSxRQUFJQyxzQkFBc0IsRUFBMUI7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E3RixhQUFTWSxPQUFULENBQWlCQyxPQUFqQixDQUF5QixVQUFTQyxNQUFULEVBQWU7QUFDdEMsWUFBRyxDQUFDaUMsWUFBRCxJQUFpQmpDLE9BQU9DLE9BQVAsS0FBbUJnQyxZQUF2QyxFQUFzRDtBQUNwRDZDLDhCQUFrQjlFLE9BQU9DLE9BQXpCLElBQW9DLENBQUM2RSxrQkFBa0I5RSxPQUFPQyxPQUF6QixLQUFxQyxDQUF0QyxJQUEyQyxDQUEvRTtBQUNBNEUseUJBQWE5RSxPQUFiLENBQXFCLFVBQUFpRixXQUFBLEVBQVc7QUFDOUIsdUJBQUEvQixXQUFXbEQsT0FBWCxDQUFtQixVQUFBUixRQUFBLEVBQVE7QUFDekIsd0JBQUlTLE9BQU9ULFFBQVAsTUFBcUJ5RixXQUF6QixFQUFzQztBQUNwQyw0QkFBSUMsS0FBS0Ysb0JBQW9CL0UsT0FBT0MsT0FBM0IsSUFBc0M4RSxvQkFBb0IvRSxPQUFPQyxPQUEzQixLQUF1QyxFQUF0RjtBQUNBLDRCQUFJaUYsTUFBTUQsR0FBR0QsV0FBSCxJQUFtQkMsR0FBR0QsV0FBSCxLQUFtQixFQUFoRDtBQUNBdEIsa0NBQVV3QixHQUFWLEVBQWMzRixRQUFkO0FBQ0Q7QUFBQTtBQUNGLGlCQU5ELENBQUE7QUFPQyxhQVJIO0FBVUQ7QUFDRixLQWREO0FBZUFsQixhQUFTOEQsS0FBS0MsU0FBTCxDQUFlMkMsbUJBQWYsRUFBbUN6RSxTQUFuQyxFQUE2QyxDQUE3QyxDQUFUO0FBQ0FqQyxhQUFTOEQsS0FBS0MsU0FBTCxDQUFlMEMsaUJBQWYsRUFBaUN4RSxTQUFqQyxFQUEyQyxDQUEzQyxDQUFUO0FBQ0EsUUFBSW1ELFVBQVVJLFdBQVdrQixtQkFBWCxDQUFkO0FBQ0EsUUFBSXRGLE1BQU0sTUFBTWUsSUFBTixHQUFhLHFCQUF2QjtBQUNBLFFBQUkyRSxTQUFTLEtBQWI7QUFDQSxRQUFHNUMsT0FBT0MsSUFBUCxDQUFZdUMsbUJBQVosRUFBaUM5RCxNQUFqQyxHQUEwQyxDQUE3QyxFQUFnRDtBQUM5Q3hCLGVBQU8sS0FBS2dFLFFBQVF4QyxNQUFiLEdBQ0csWUFESCxHQUNrQnBDLE1BQU11RyxvQkFBTixDQUEyQjNCLE9BQTNCLENBRGxCLEdBQ3dELEVBRC9EO0FBRUQsS0FIRCxNQUdPLElBQUdBLFFBQVF4QyxNQUFSLEtBQW1CLENBQXRCLEVBQXlCO0FBQzlCLFlBQUcsQ0FBQ2dCLFlBQUosRUFBa0I7QUFDaEJ4QyxtQkFBTyxNQUFQO0FBQ0Q7QUFDREEsZUFBTyxjQUFXZ0UsUUFBUSxDQUFSLENBQVgsR0FBcUIsS0FBNUI7QUFDQTBCLGlCQUFTLElBQVQ7QUFDRCxLQU5NLE1BTUE7QUFDTCxZQUFHbEQsWUFBSCxFQUFpQjtBQUNmLG1CQUFPLE9BQUl6QixJQUFKLEdBQVEsa0NBQVIsR0FBeUN5QixZQUF6QyxHQUFxRCxPQUE1RDtBQUNEO0FBQ0QsZUFBTyxPQUFJekIsSUFBSixHQUFRLHdCQUFmO0FBQ0Q7QUFDRGYsV0FBTyxJQUFQLENBOUVpRyxDQThFcEY7QUFDYmdFLFlBQVExRCxPQUFSLENBQWdCLFVBQVNQLE1BQVQsRUFBZTtBQUM3QixZQUFJeUYsS0FBS0Ysb0JBQW9CdkYsTUFBcEIsQ0FBVDtBQUNBK0MsZUFBT0MsSUFBUCxDQUFZeUMsRUFBWixFQUFnQmxGLE9BQWhCLENBQXdCLFVBQUFzRixhQUFBLEVBQWE7QUFDbkMsZ0JBQUlILE1BQU1ELEdBQUdJLGFBQUgsQ0FBVjtBQUNBLGdCQUFHLENBQUNGLE1BQUosRUFBWTtBQUNWMUYsdUJBQU8sZ0JBQWdCRCxNQUFoQixHQUF5QixJQUFoQztBQUNEO0FBQ0QsZ0JBQUk4RixZQUFZL0MsT0FBT0MsSUFBUCxDQUFZMEMsR0FBWixFQUFpQmpFLE1BQWpCLEtBQTRCLENBQTVDO0FBQ0F4QixtQkFBVUwsY0FBY2lHLGFBQWQsRUFBNEI3RSxJQUE1QixFQUFpQ3RCLFFBQWpDLElBQTBDLEdBQXBEO0FBQ0EsZ0JBQUcsQ0FBQ29HLFNBQUosRUFBZTtBQUNiN0YsdUJBQU8sT0FBUDtBQUNEO0FBQ0Q4QyxtQkFBT0MsSUFBUCxDQUFZMEMsR0FBWixFQUFpQm5GLE9BQWpCLENBQXlCLFVBQUFSLFFBQUEsRUFBUTtBQUNqQyxvQkFBSThDLFVBQVdULFVBQVVzRCxJQUFJM0YsUUFBSixDQUFWLEVBQXdCdUYsa0JBQWtCdEYsTUFBbEIsQ0FBeEIsQ0FBZjtBQUVFQyx1QkFBTywrQkFBNEJGLFFBQTVCLEdBQW9DLGdCQUFwQyxHQUFvRDJGLElBQUkzRixRQUFKLENBQXBELEdBQWlFLEdBQWpFLEdBQXFFOEMsT0FBckUsR0FBNEUsa0JBQW5GO0FBQ0QsYUFKRDtBQUtELFNBZkQ7QUFnQkQsS0FsQkQ7QUFtQkEsV0FBTzVDLEdBQVA7QUFDRDtBQW5HZU4sUUFBQTRFLG9CQUFBLEdBQW9CQSxvQkFBcEI7QUFxR2hCLFNBQUF3QixnQkFBQSxDQUFpQ2hHLFFBQWpDLEVBQW9EaUcsWUFBcEQsRUFBMEVDLEtBQTFFLEVBQWdHQyxPQUFoRyxFQUFnSDtBQUM5RyxRQUFJakcsTUFBTSxFQUFWO0FBQ0EsUUFBSWtHLE9BQU8vRyxNQUFNZ0gscUJBQU4sQ0FBNEJILEtBQTVCLEVBQWtDbEcsUUFBbEMsQ0FBWDtBQUNBLFFBQUdpRyxZQUFILEVBQWlCO0FBQ2YsWUFBR0csS0FBS2xGLE9BQUwsQ0FBYStFLFlBQWIsS0FBOEIsQ0FBakMsRUFBb0M7QUFDbEMvRixnQkFBSW9HLElBQUosQ0FBU3hDLHlCQUF5QjlELFFBQXpCLEVBQWtDaUcsWUFBbEMsRUFBK0NDLEtBQS9DLENBQVQ7QUFDQSxtQkFBT2hHLEdBQVA7QUFDRCxTQUhELE1BR087QUFDTCxtQkFBTyxFQUFQO0FBQ0Q7QUFDRjtBQUNEa0csU0FBS2pELElBQUw7QUFDQWlELFNBQUs1RixPQUFMLENBQWEsVUFBU1AsTUFBVCxFQUFlO0FBQ3RCQyxZQUFJb0csSUFBSixDQUFTeEMseUJBQXlCOUQsUUFBekIsRUFBbUNDLE1BQW5DLEVBQTJDaUcsS0FBM0MsQ0FBVDtBQUNMLEtBRkQ7QUFHQSxXQUFPaEcsR0FBUDtBQUNEO0FBaEJlTixRQUFBb0csZ0JBQUEsR0FBZ0JBLGdCQUFoQiIsImZpbGUiOiJtYXRjaC9kZXNjcmliZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICpcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmV4cGxhaW5cbiAqIEBmaWxlIGV4cGxhaW4udHNcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cbiAqXG4gKiBGdW5jdGlvbnMgZGVhbGluZyB3aXRoIGV4cGxhaW5pbmcgZmFjdHMsIGNhdGVnb3JpZXMgZXRjLlxuICovXG5cblxuaW1wb3J0ICogYXMgSW5wdXRGaWx0ZXIgZnJvbSAnLi9pbnB1dEZpbHRlcic7XG5pbXBvcnQgKiBhcyBBbGdvbCBmcm9tICcuL2FsZ29sJztcbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcblxuY29uc3QgZGVidWdsb2cgPSBkZWJ1ZygnZGVzY3JpYmUnKTtcbmltcG9ydCAqIGFzIGxvZ2dlciBmcm9tICcuLi91dGlscy9sb2dnZXInO1xudmFyIGxvZ1BlcmYgPSBsb2dnZXIucGVyZihcInBlcmZsaXN0YWxsXCIpO1xudmFyIHBlcmZsb2cgPSBkZWJ1ZygncGVyZicpO1xuLy9jb25zdCBwZXJmbG9nID0gbG9nZ2VyLnBlcmYoXCJwZXJmbGlzdGFsbFwiKTtcblxuaW1wb3J0ICogYXMgSU1hdGNoIGZyb20gJy4vaWZtYXRjaCc7XG5cbmltcG9ydCAqIGFzIFRvb2xtYXRjaGVyIGZyb20gJy4vdG9vbG1hdGNoZXInO1xuaW1wb3J0ICogYXMgQnJlYWtEb3duIGZyb20gJy4vYnJlYWtkb3duJztcblxuaW1wb3J0ICogYXMgU2VudGVuY2UgZnJvbSAnLi9zZW50ZW5jZSc7XG5cbmltcG9ydCAqIGFzIFdvcmQgZnJvbSAnLi93b3JkJztcbmltcG9ydCAqIGFzIE9wZXJhdG9yIGZyb20gJy4vb3BlcmF0b3InO1xuXG5pbXBvcnQgKiBhcyBXaGF0SXMgZnJvbSAnLi93aGF0aXMnO1xuXG5pbXBvcnQgKiBhcyBNb2RlbCBmcm9tICcuLi9tb2RlbC9tb2RlbCc7XG5pbXBvcnQgKiBhcyBNYXRjaCBmcm9tICcuL21hdGNoJztcblxuXG5pbXBvcnQgKiBhcyBVdGlscyBmcm9tICcuLi91dGlscy91dGlscyc7XG5cblxudmFyIHNXb3JkcyA9IHt9O1xuXG5leHBvcnQgZnVuY3Rpb24gaXNTeW5vbnltRm9yKGV4YWN0V29yZCA6IHN0cmluZywgc2xvcHB5V29yZCA6IHN0cmluZywgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzKSA6IGJvb2xlYW4ge1xuICAvLyBUT0RPOiB1c2UgbW9kZWwgc3lub255bXNcbiAgcmV0dXJuIHNsb3BweVdvcmQgPT09IFwibmFtZVwiICYmIGV4YWN0V29yZCA9PT0gXCJlbGVtZW50IG5hbWVcIjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNsb3BweU9yRXhhY3QoZXhhY3RXb3JkIDogc3RyaW5nLCBzbG9wcHlXb3JkIDogc3RyaW5nLCB0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMpIHtcbiAgaWYoZXhhY3RXb3JkLnRvTG93ZXJDYXNlKCkgPT09IHNsb3BweVdvcmQudG9Mb3dlckNhc2UoKSkge1xuICAgIHJldHVybiAnXCInICsgc2xvcHB5V29yZCArICdcIic7XG4gIH1cbiAgLy8gVE9ETywgZmluZCBwbHVyYWwgcyBldGMuXG4gIC8vIHN0aWxsIGV4YWN0LFxuICAvL1xuICBpZihpc1N5bm9ueW1Gb3IoZXhhY3RXb3JkLHNsb3BweVdvcmQsdGhlTW9kZWwpKSB7XG5yZXR1cm4gJ1wiJyArIHNsb3BweVdvcmQgKyAnXCIgKGludGVycHJldGVkIGFzIHN5bm9ueW0gZm9yIFwiJyArIGV4YWN0V29yZCArJ1wiKSc7XG4gIH1cbiAgLy90b2RvLCBmaW5kIGlzIHN5bm9ueW1mb3IgLi4uXG4gIC8vIFRPRE8sIGEgc3lub255bSBmb3IgLi4uXG4gIHJldHVybiAnXCInICsgc2xvcHB5V29yZCArICdcIiAoaW50ZXJwcmV0ZWQgYXMgXCInICsgZXhhY3RXb3JkICsnXCIpJztcbn1cblxuaW50ZXJmYWNlIElEZXNjcmliZUNhdGVnb3J5IHtcbiAgICB0b3RhbHJlY29yZHMgOiBudW1iZXIsXG4gICAgcHJlc2VudHJlY29yZHMgOiBudW1iZXIsXG4gICAgdmFsdWVzIDogeyBba2V5IDogc3RyaW5nXSA6IG51bWJlcn0sXG4gICAgbXVsdGl2YWx1ZWQgOiBib29sZWFuXG4gIH1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvdW50UmVjb3JkUHJlc2VuY2UoY2F0ZWdvcnkgOiBzdHJpbmcsIGRvbWFpbiA6IHN0cmluZywgdGhlTW9kZWwgOiBJTWF0Y2guSU1vZGVscykgOiBJRGVzY3JpYmVDYXRlZ29yeSB7XG4gIHZhciByZXMgPSB7IHRvdGFscmVjb3JkcyA6IDAsXG4gICAgcHJlc2VudHJlY29yZHMgOiAwLFxuICAgIHZhbHVlcyA6IHsgfSwgIC8vIGFuIHRoZWlyIGZyZXF1ZW5jeVxuICAgIG11bHRpdmFsdWVkIDogZmFsc2VcbiAgfSBhcyBJRGVzY3JpYmVDYXRlZ29yeTtcbiAgdGhlTW9kZWwucmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uKHJlY29yZCkge1xuICAgIC8vZGVidWdsb2coSlNPTi5zdHJpbmdpZnkocmVjb3JkLHVuZGVmaW5lZCwyKSk7XG4gICAgaWYocmVjb3JkLl9kb21haW4gIT09IGRvbWFpbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXMudG90YWxyZWNvcmRzKys7XG4gICAgdmFyIHZhbCA9IHJlY29yZFtjYXRlZ29yeV07XG4gICAgdmFyIHZhbGFyciA9IFt2YWxdO1xuICAgIGlmKEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgcmVzLm11bHRpdmFsdWVkID0gdHJ1ZTtcbiAgICAgIHZhbGFyciA9IHZhbDtcbiAgICB9XG4gICAgLy8gdG9kbyB3cmFwIGFyclxuICAgIGlmKHZhbCAhPT0gdW5kZWZpbmVkICYmIHZhbCAhPT0gXCJuL2FcIikge1xuICAgICAgcmVzLnByZXNlbnRyZWNvcmRzICsrO1xuICAgIH1cbiAgICB2YWxhcnIuZm9yRWFjaChmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJlcy52YWx1ZXNbdmFsXSA9IChyZXMudmFsdWVzW3ZhbF0gfHwgMCkgKyAxO1xuICAgIH0pXG4gIH0pXG4gIHJldHVybiByZXM7XG59XG5cbi8vIGNhdGVnb3J5ID0+IG1hdGNoZWR3b3Jkc1tdO1xuXG5pbnRlcmZhY2UgSURlc2NyaWJlRmFjdCB7XG4gICAgdG90YWxyZWNvcmRzIDogbnVtYmVyLFxuICAgIHByZXNlbnRyZWNvcmRzIDogbnVtYmVyLFxuICAgIG11bHRpdmFsdWVkIDogYm9vbGVhblxuICB9XG5cbmV4cG9ydCBmdW5jdGlvbiBjb3VudFJlY29yZFByZXNlbmNlRmFjdChmYWN0IDogc3RyaW5nLCBjYXRlZ29yeSA6IHN0cmluZywgZG9tYWluIDogc3RyaW5nLCB0aGVNb2RlbCA6IElNYXRjaC5JTW9kZWxzKSA6IElEZXNjcmliZUZhY3Qge1xuICB2YXIgcmVzID0geyB0b3RhbHJlY29yZHMgOiAwLFxuICAgIHByZXNlbnRyZWNvcmRzIDogMCxcbiAgICB2YWx1ZXMgOiB7IH0sICAvLyBhbiB0aGVpciBmcmVxdWVuY3lcbiAgICBtdWx0aXZhbHVlZCA6IGZhbHNlXG4gIH0gYXMgSURlc2NyaWJlQ2F0ZWdvcnk7XG4gIHRoZU1vZGVsLnJlY29yZHMuZm9yRWFjaChmdW5jdGlvbihyZWNvcmQpIHtcbiAgICAvL2RlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZCx1bmRlZmluZWQsMikpO1xuICAgIGlmKHJlY29yZC5fZG9tYWluICE9PSBkb21haW4pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmVzLnRvdGFscmVjb3JkcysrO1xuICAgIHZhciB2YWwgPSByZWNvcmRbY2F0ZWdvcnldO1xuICAgIHZhciB2YWxhcnIgPSBbdmFsXTtcbiAgICBpZihBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICAgIGlmKHZhbC5pbmRleE9mKGZhY3QpID49IDApIHtcbiAgICAgICAgcmVzLm11bHRpdmFsdWVkID0gdHJ1ZTtcbiAgICAgICAgdmFsYXJyID0gdmFsO1xuICAgICAgICByZXMucHJlc2VudHJlY29yZHMrKztcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHZhbCA9PT0gZmFjdCkge1xuICAgICAgICByZXMucHJlc2VudHJlY29yZHMrKztcbiAgICB9XG4gIH0pXG4gIHJldHVybiByZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWtlVmFsdWVzTGlzdFN0cmluZyhyZWFsdmFsdWVzOiBzdHJpbmdbXSkgOiBzdHJpbmcge1xuICB2YXIgdmFsdWVzU3RyaW5nID0gXCJcIjtcbiAgdmFyIHRvdGFsbGVuID0gMDtcbiAgdmFyIGxpc3RWYWx1ZXMgPSByZWFsdmFsdWVzLmZpbHRlcihmdW5jdGlvbih2YWwsIGluZGV4KSB7XG4gICAgdG90YWxsZW4gPSB0b3RhbGxlbiArIHZhbC5sZW5ndGg7XG4gIHJldHVybiAoaW5kZXggPCBBbGdvbC5EZXNjcmliZVZhbHVlTGlzdE1pbkNvdW50VmFsdWVMaXN0KSB8fCAodG90YWxsZW4gPCBBbGdvbC5EZXNjcmliZVZhbHVlTGlzdExlbmd0aENoYXJMaW1pdCk7XG4gIH0pO1xuICBpZihsaXN0VmFsdWVzLmxlbmd0aCA9PT0gMSAmJiByZWFsdmFsdWVzLmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiAnVGhlIHNvbGUgdmFsdWUgaXMgXFxcIicgKyBsaXN0VmFsdWVzWzBdICsgJ1wiJztcbiAgfVxuICB2YXIgbWF4bGVuID0gbGlzdFZhbHVlcy5yZWR1Y2UoIChwcmV2LHZhbCkgPT4gTWF0aC5tYXgocHJldix2YWwubGVuZ3RoKSwwKTtcbiAgaWYobWF4bGVuID4gMzApIHtcbiAgICByZXR1cm4gXCJQb3NzaWJsZSB2YWx1ZXMgYXJlIC4uLlxcblwiICtcbiAgICAgIGxpc3RWYWx1ZXMucmVkdWNlKCAocHJldix2YWwsaW5kZXgpID0+IChwcmV2ICsgXCIoXCIgKyAoaW5kZXggKyAxKSArICcpOiBcIicgKyB2YWwgKyAnXCJcXG4nXG4gICAgICApLFwiXCIpXG4gICAgICArICggbGlzdFZhbHVlcy5sZW5ndGggPT09IHJlYWx2YWx1ZXMubGVuZ3RoID8gXCJcIiA6IFwiLi4uXCIpO1xuICB9XG4gIHZhciBsaXN0ID0gXCJcIjtcbiAgaWYobGlzdFZhbHVlcy5sZW5ndGggPT09IHJlYWx2YWx1ZXMubGVuZ3RoKSB7XG4gICAgbGlzdCA9IFV0aWxzLmxpc3RUb1F1b3RlZENvbW1hT3IobGlzdFZhbHVlcyk7XG4gIH0gZWxzZSB7XG4gICAgbGlzdCA9ICdcIicgKyBsaXN0VmFsdWVzLmpvaW4oJ1wiLCBcIicpICsgJ1wiJztcbiAgfVxuICByZXR1cm4gXCJQb3NzaWJsZSB2YWx1ZXMgYXJlIC4uLlxcblwiXG4gICAgKyBsaXN0XG4gICAgKyAoIGxpc3RWYWx1ZXMubGVuZ3RoID09PSByZWFsdmFsdWVzLmxlbmd0aCA/IFwiXCIgOiBcIiAuLi5cIik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b1BlcmNlbnQoYSA6IG51bWJlciwgYjogbnVtYmVyKSA6IHN0cmluZyB7XG4gIHJldHVybiBcIlwiICsgKDEwMCogYSAvIGIpLnRvRml4ZWQoMSk7XG59XG5cblxuZXhwb3J0IGludGVyZmFjZSBJQ2F0ZWdvcnlTdGF0cyB7XG4gIGNhdGVnb3J5RGVzYyA6IElNYXRjaC5JQ2F0ZWdvcnlEZXNjLFxuICBwcmVzZW50UmVjb3JkcyA6IG51bWJlcixcbiAgZGlzdGluY3QgOiBzdHJpbmcsXG4gIGRlbHRhIDogc3RyaW5nLFxuICBwZXJjUHJlc2VudCA6IHN0cmluZyxcbiAgc2FtcGxlVmFsdWVzIDogc3RyaW5nLFxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldENhdGVnb3J5U3RhdHNJbkRvbWFpbihjYXRlZ29yeSA6IHN0cmluZywgZmlsdGVyZG9tYWluIDogc3RyaW5nLCB0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMpIDogSUNhdGVnb3J5U3RhdHMge1xuICBjb25zdCByZWNvcmRDb3VudCA9IGNvdW50UmVjb3JkUHJlc2VuY2UoY2F0ZWdvcnksIGZpbHRlcmRvbWFpbiwgdGhlTW9kZWwpO1xuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeSh0aGVNb2RlbC5yZWNvcmRzLmZpbHRlcihhID0+IGEuX2RvbWFpbiA9PT0gXCJDb3Ntb3NcIiksdW5kZWZpbmVkLDIpKTtcbiAgY29uc3QgcGVyY2VudCA9IHRvUGVyY2VudChyZWNvcmRDb3VudC5wcmVzZW50cmVjb3JkcyAsIHJlY29yZENvdW50LnRvdGFscmVjb3Jkcyk7XG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZENvdW50LnZhbHVlcykpO1xuICB2YXIgYWxsVmFsdWVzID1PYmplY3Qua2V5cyhyZWNvcmRDb3VudC52YWx1ZXMpO1xuICB2YXIgcmVhbHZhbHVlcyA9IGFsbFZhbHVlcy5maWx0ZXIodmFsdWUgPT4gKHZhbHVlICE9PSAndW5kZWZpbmVkJykgJiYgKHZhbHVlICE9PSAnbi9hJykpO1xuICBkZWJ1Z2xvZ1xuICByZWFsdmFsdWVzLnNvcnQoKTtcbiAgdmFyIHVuZGVmTmFEZWx0YSA9ICAoYWxsVmFsdWVzLmxlbmd0aCAtIHJlYWx2YWx1ZXMubGVuZ3RoKTtcbiAgdmFyIGRlbHRhID0gICh1bmRlZk5hRGVsdGEpID8gIFwiKCtcIiArIHVuZGVmTmFEZWx0YSArIFwiKVwiIDogXCJcIjtcbiAgY29uc3QgZGlzdGluY3QgPSAnJyArIHJlYWx2YWx1ZXMubGVuZ3RoO1xuICBjb25zdCB2YWx1ZXNMaXN0ID0gbWFrZVZhbHVlc0xpc3RTdHJpbmcocmVhbHZhbHVlcyk7XG4gIHJldHVybiB7XG4gICAgY2F0ZWdvcnlEZXNjIDogdGhlTW9kZWwuZnVsbC5kb21haW5bZmlsdGVyZG9tYWluXS5jYXRlZ29yaWVzW2NhdGVnb3J5XSxcbiAgICBkaXN0aW5jdCA6IGRpc3RpbmN0LFxuICAgIGRlbHRhIDogZGVsdGEsXG4gICAgcHJlc2VudFJlY29yZHMgOiByZWNvcmRDb3VudC5wcmVzZW50cmVjb3JkcyxcbiAgICBwZXJjUHJlc2VudCA6IHBlcmNlbnQsXG4gICAgc2FtcGxlVmFsdWVzIDogdmFsdWVzTGlzdFxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXNjcmliZUNhdGVnb3J5SW5Eb21haW4oY2F0ZWdvcnkgOiBzdHJpbmcsIGZpbHRlcmRvbWFpbiA6IHN0cmluZywgdGhlTW9kZWw6IElNYXRjaC5JTW9kZWxzKSA6IHN0cmluZyB7XG4vKiAgY29uc3QgcmVjb3JkQ291bnQgPSBjb3VudFJlY29yZFByZXNlbmNlKGNhdGVnb3J5LCBmaWx0ZXJkb21haW4sIHRoZU1vZGVsKTtcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkodGhlTW9kZWwucmVjb3Jkcy5maWx0ZXIoYSA9PiBhLl9kb21haW4gPT09IFwiQ29zbW9zXCIpLHVuZGVmaW5lZCwyKSk7XG4gIGNvbnN0IHBlcmNlbnQgPSB0b1BlcmNlbnQocmVjb3JkQ291bnQucHJlc2VudHJlY29yZHMgLCByZWNvcmRDb3VudC50b3RhbHJlY29yZHMpO1xuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmRDb3VudC52YWx1ZXMpKTtcbiAgdmFyIGFsbFZhbHVlcyA9T2JqZWN0LmtleXMocmVjb3JkQ291bnQudmFsdWVzKTtcbiAgdmFyIHJlYWx2YWx1ZXMgPSBhbGxWYWx1ZXMuZmlsdGVyKHZhbHVlID0+ICh2YWx1ZSAhPT0gJ3VuZGVmaW5lZCcpICYmICh2YWx1ZSAhPT0gJ24vYScpKTtcbiAgZGVidWdsb2dcbiAgcmVhbHZhbHVlcy5zb3J0KCk7XG4gIHZhciB1bmRlZk5hRGVsdGEgPSAgKGFsbFZhbHVlcy5sZW5ndGggLSByZWFsdmFsdWVzLmxlbmd0aCk7XG4gIHZhciBkZWx0YSA9ICAodW5kZWZOYURlbHRhKSA/ICBcIigrXCIgKyB1bmRlZk5hRGVsdGEgKyBcIilcIiA6IFwiXCI7XG4gIGNvbnN0IGRpc3RpbmN0ID0gJycgKyByZWFsdmFsdWVzLmxlbmd0aDtcblxuICBjb25zdCB2YWx1ZXNMaXN0ID0gbWFrZVZhbHVlc0xpc3RTdHJpbmcocmVhbHZhbHVlcyk7XG4qL1xuICB2YXIgc3RhdHMgPSBnZXRDYXRlZ29yeVN0YXRzSW5Eb21haW4oY2F0ZWdvcnksZmlsdGVyZG9tYWluLHRoZU1vZGVsKTtcblxuICByZXR1cm4gJ2lzIGEgY2F0ZWdvcnkgaW4gZG9tYWluIFwiJyArIGZpbHRlcmRvbWFpbiArICdcIlxcbidcbiAgKyBgSXQgaXMgcHJlc2VudCBpbiAke3N0YXRzLnByZXNlbnRSZWNvcmRzfSAoJHtzdGF0cy5wZXJjUHJlc2VudH0lKSBvZiByZWNvcmRzIGluIHRoaXMgZG9tYWluLFxcbmAgK1xuICAgYGhhdmluZyAke3N0YXRzLmRpc3RpbmN0ICsgJyd9JHtzdGF0cy5kZWx0YX0gZGlzdGluY3QgdmFsdWVzLlxcbmBcbiAgKyBzdGF0cy5zYW1wbGVWYWx1ZXM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kUmVjb3Jkc1dpdGhGYWN0KG1hdGNoZWRTdHJpbmc6IHN0cmluZywgY2F0ZWdvcnkgOiBzdHJpbmcsIHJlY29yZHMgOiBhbnksIGRvbWFpbnMgOiB7IFtrZXkgOiBzdHJpbmddIDogbnVtYmVyfSkgOiBhbnlbXSB7XG4gIHJldHVybiByZWNvcmRzLmZpbHRlcihmdW5jdGlvbihyZWNvcmQpICB7XG5cbiAgICBsZXQgcmVzID0gKHJlY29yZFtjYXRlZ29yeV0gPT09IG1hdGNoZWRTdHJpbmcpO1xuICAgIGlmKCByZXMpIHtcbiAgICAgIGluY3JlbWVudChkb21haW5zLHJlY29yZHMuX2RvbWFpbik7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5jcmVtZW50KG1hcCA6IHtba2V5OiBzdHJpbmddIDogbnVtYmVyfSwga2V5IDogc3RyaW5nKSB7XG4gIG1hcFtrZXldID0gKG1hcFtrZXldIHx8IDApICsgMTtcbn1cblxuZnVuY3Rpb24gc29ydGVkS2V5czxUPihtYXAgOiB7W2tleSA6IHN0cmluZ10gOiBUfSkgOiBzdHJpbmdbXSB7XG4gIHZhciByID0gT2JqZWN0LmtleXMobWFwKTtcbiAgci5zb3J0KCk7XG4gIHJldHVybiByO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVzY3JpYmVGYWN0SW5Eb21haW4oZmFjdCA6IHN0cmluZywgZmlsdGVyZG9tYWluIDogc3RyaW5nLCB0aGVNb2RlbDogSU1hdGNoLklNb2RlbHMpIDogc3RyaW5nIHtcbiAgdmFyIHNlbnRlbmNlcyA9IFdoYXRJcy5hbmFseXplQ29udGV4dFN0cmluZyhmYWN0LCAgdGhlTW9kZWwucnVsZXMpO1xuICB2YXIgbGVuZ3RoT25lU2VudGVuY2VzID0gc2VudGVuY2VzLmZpbHRlcihvU2VudGVuY2UgPT4gb1NlbnRlbmNlLmxlbmd0aCA9PT0gMSk7XG4gIC8vIHJlbW92ZSBjYXRlZ29yaWVzIGFuZCBkb21haW5zXG4gIHZhciBvbmx5RmFjdHMgPSBsZW5ndGhPbmVTZW50ZW5jZXMuZmlsdGVyKG9TZW50ZW5jZSA9PntcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvU2VudGVuY2VbMF0pKTtcbiAgICByZXR1cm4gIVdvcmQuV29yZC5pc0ZpbGxlcihvU2VudGVuY2VbMF0pICYmICFXb3JkLldvcmQuaXNDYXRlZ29yeShvU2VudGVuY2VbMF0pXG4gIH1cbiAgKTtcbiAgZGVidWdsb2coXCJvbmx5IGZhY3RzOiBcIiArIEpTT04uc3RyaW5naWZ5KG9ubHlGYWN0cykpO1xuICB2YXIgcmVjb3JkTWFwID0ge307XG4gIHZhciBkb21haW5zTWFwID0ge30gYXMge1trZXk6IHN0cmluZ10gOiBudW1iZXJ9O1xuICB2YXIgbWF0Y2hlZHdvcmRNYXAgPSB7fSBhcyB7W2tleTogc3RyaW5nXSA6IG51bWJlcn07XG4gIHZhciBtYXRjaGVkQ2F0ZWdvcnlNYXAgPSB7fSBhcyB7W2tleTogc3RyaW5nXSA6IG51bWJlcn07XG4gIC8vIGxvb2sgZm9yIGFsbCByZWNvcmRzXG4gIG9ubHlGYWN0cy5mb3JFYWNoKG9TZW50ZW5jZSA9PlxuICAgIG9TZW50ZW5jZS5mb3JFYWNoKG9Xb3JkID0+XG4gICAgICB7XG4gICAgICAgIGluY3JlbWVudChtYXRjaGVkd29yZE1hcCwgb1dvcmQubWF0Y2hlZFN0cmluZyk7XG4gICAgICAgIGluY3JlbWVudChtYXRjaGVkQ2F0ZWdvcnlNYXAsIG9Xb3JkLmNhdGVnb3J5KTtcbiAgICAgIH1cbiAgICApXG4gICk7XG4gIC8vIHdlIGhhdmU6XG4gIC8vIGEgbGlzdCBvZiBjYXRlZ29yaWVzLFxuICAvLyBhIGxpc3Qgb2YgbWF0Y2hlZFdvcmRzICAtPlxuICAvL1xuXG4gIHZhciBjYXRlZ29yaWVzID0gc29ydGVkS2V5cyhtYXRjaGVkQ2F0ZWdvcnlNYXApO1xuICB2YXIgbWF0Y2hlZHdvcmRzID0gc29ydGVkS2V5cyhtYXRjaGVkd29yZE1hcCk7XG4gIGRlYnVnbG9nKFwibWF0Y2hlZHdvcmRzOiBcIiArIEpTT04uc3RyaW5naWZ5KG1hdGNoZWR3b3JkcykpO1xuICBkZWJ1Z2xvZyhcImNhdGVnb3JpZXM6IFwiICsgSlNPTi5zdHJpbmdpZnkoY2F0ZWdvcmllcykpO1xuXG4gIC8vdmFyIGFsbE1hdGNoZWRXb3JkcyA9IHsgW2tleSA6IHN0cmluZ10gOiBudW1iZXIgfTtcbiAgdmFyIGRvbWFpblJlY29yZENvdW50ID0ge30gYXMge1trZXk6IHN0cmluZ10gOiBudW1iZXJ9O1xuICB2YXIgZG9tYWluTWF0Y2hDYXRDb3VudCA9IHt9IGFzIHtba2V5OiBzdHJpbmddIDpcbiAgICAgICB7W2tleTogc3RyaW5nXSA6XG4gICAgIHtba2V5OiBzdHJpbmddIDogbnVtYmVyfX19O1xuICAvLyB3ZSBwcmVwYXJlIHRoZSBmb2xsb3dpbmcgc3RydWN0dXJlXG4gIC8vXG4gIC8vIHtkb21haW59IDogcmVjb3JkY291bnQ7XG4gIC8vIHttYXRjaGVkd29yZHN9IDpcbiAgLy8ge2RvbWFpbn0ge21hdGNoZWR3b3JkfSB7Y2F0ZWdvcnl9IHByZXNlbmNlY291bnRcbiAgdGhlTW9kZWwucmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uKHJlY29yZCkge1xuICAgIGlmKCFmaWx0ZXJkb21haW4gfHwgcmVjb3JkLl9kb21haW4gPT09IGZpbHRlcmRvbWFpbiApIHtcbiAgICAgIGRvbWFpblJlY29yZENvdW50W3JlY29yZC5fZG9tYWluXSA9IChkb21haW5SZWNvcmRDb3VudFtyZWNvcmQuX2RvbWFpbl0gfHwgMCkgKyAxO1xuICAgICAgbWF0Y2hlZHdvcmRzLmZvckVhY2gobWF0Y2hlZHdvcmQgPT5cbiAgICAgICAgY2F0ZWdvcmllcy5mb3JFYWNoKGNhdGVnb3J5ID0+IHtcbiAgICAgICAgICBpZiggcmVjb3JkW2NhdGVnb3J5XSA9PT0gbWF0Y2hlZHdvcmQpIHtcbiAgICAgICAgICAgIHZhciBtZCA9IGRvbWFpbk1hdGNoQ2F0Q291bnRbcmVjb3JkLl9kb21haW5dID0gZG9tYWluTWF0Y2hDYXRDb3VudFtyZWNvcmQuX2RvbWFpbl0gfHwge307XG4gICAgICAgICAgICB2YXIgbWRjID0gbWRbbWF0Y2hlZHdvcmRdID0gIG1kW21hdGNoZWR3b3JkXSB8fCB7fTtcbiAgICAgICAgICAgIGluY3JlbWVudChtZGMsY2F0ZWdvcnkpO1xuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgKVxuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkb21haW5NYXRjaENhdENvdW50LHVuZGVmaW5lZCwyKSk7XG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRvbWFpblJlY29yZENvdW50LHVuZGVmaW5lZCwyKSk7XG4gIHZhciBkb21haW5zID0gc29ydGVkS2V5cyhkb21haW5NYXRjaENhdENvdW50KTtcbiAgdmFyIHJlcyA9ICdcIicgKyBmYWN0ICsgJ1wiIGhhcyBhIG1lYW5pbmcgaW4gJztcbiAgdmFyIHNpbmdsZSA9IGZhbHNlO1xuICBpZihPYmplY3Qua2V5cyhkb21haW5NYXRjaENhdENvdW50KS5sZW5ndGggPiAxKSB7XG4gICAgcmVzICs9ICcnICsgZG9tYWlucy5sZW5ndGggK1xuICAgICAgICAgICAgICAnIGRvbWFpbnM6ICcgKyBVdGlscy5saXN0VG9RdW90ZWRDb21tYUFuZChkb21haW5zKSArIFwiXCI7XG4gIH0gZWxzZSBpZihkb21haW5zLmxlbmd0aCA9PT0gMSkge1xuICAgIGlmKCFmaWx0ZXJkb21haW4pIHtcbiAgICAgIHJlcyArPSBgb25lIGA7XG4gICAgfVxuICAgIHJlcyArPSBgZG9tYWluIFwiJHtkb21haW5zWzBdfVwiOmA7XG4gICAgc2luZ2xlID0gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICBpZihmaWx0ZXJkb21haW4pIHtcbiAgICAgIHJldHVybiBgXCIke2ZhY3R9XCIgaXMgbm8ga25vd24gZmFjdCBpbiBkb21haW4gXCIke2ZpbHRlcmRvbWFpbn1cIi5cXG5gO1xuICAgIH1cbiAgICByZXR1cm4gYFwiJHtmYWN0fVwiIGlzIG5vIGtub3duIGZhY3QuXFxuYDtcbiAgfVxuICByZXMgKz0gXCJcXG5cIjsgLy8gLi4uXFxuXCI7XG4gIGRvbWFpbnMuZm9yRWFjaChmdW5jdGlvbihkb21haW4pIHtcbiAgICB2YXIgbWQgPSBkb21haW5NYXRjaENhdENvdW50W2RvbWFpbl07XG4gICAgT2JqZWN0LmtleXMobWQpLmZvckVhY2gobWF0Y2hlZHN0cmluZyA9PiB7XG4gICAgICB2YXIgbWRjID0gbWRbbWF0Y2hlZHN0cmluZ107XG4gICAgICBpZighc2luZ2xlKSB7XG4gICAgICAgIHJlcyArPSAnaW4gZG9tYWluIFwiJyArIGRvbWFpbiArICdcIiAnO1xuICAgICAgfVxuICAgICAgdmFyIGNhdHNpbmdsZSA9IE9iamVjdC5rZXlzKG1kYykubGVuZ3RoID09PSAxO1xuICAgICAgcmVzICs9IGAke3Nsb3BweU9yRXhhY3QobWF0Y2hlZHN0cmluZyxmYWN0LHRoZU1vZGVsKX0gYDtcbiAgICAgIGlmKCFjYXRzaW5nbGUpIHtcbiAgICAgICAgcmVzICs9IGAuLi5cXG5gO1xuICAgICAgfVxuICAgICAgT2JqZWN0LmtleXMobWRjKS5mb3JFYWNoKGNhdGVnb3J5ID0+IHtcbiAgICAgIHZhciBwZXJjZW50ID0gIHRvUGVyY2VudChtZGNbY2F0ZWdvcnldLGRvbWFpblJlY29yZENvdW50W2RvbWFpbl0pO1xuXG4gICAgICAgIHJlcyArPSBgaXMgYSB2YWx1ZSBmb3IgY2F0ZWdvcnkgXCIke2NhdGVnb3J5fVwiIHByZXNlbnQgaW4gJHttZGNbY2F0ZWdvcnldfSgke3BlcmNlbnR9JSkgb2YgcmVjb3JkcztcXG5gO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuICByZXR1cm4gcmVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVzY3JpYmVDYXRlZ29yeShjYXRlZ29yeSA6IHN0cmluZywgZmlsdGVyRG9tYWluOiBzdHJpbmcsIG1vZGVsOiBJTWF0Y2guSU1vZGVscyxtZXNzYWdlIDogc3RyaW5nKSA6IHN0cmluZ1tdIHtcbiAgdmFyIHJlcyA9IFtdO1xuICB2YXIgZG9tcyA9IE1vZGVsLmdldERvbWFpbnNGb3JDYXRlZ29yeShtb2RlbCxjYXRlZ29yeSk7XG4gIGlmKGZpbHRlckRvbWFpbikge1xuICAgIGlmKGRvbXMuaW5kZXhPZihmaWx0ZXJEb21haW4pID49IDApIHtcbiAgICAgIHJlcy5wdXNoKGRlc2NyaWJlQ2F0ZWdvcnlJbkRvbWFpbihjYXRlZ29yeSxmaWx0ZXJEb21haW4sbW9kZWwpKTtcbiAgICAgIHJldHVybiByZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gIH1cbiAgZG9tcy5zb3J0KCk7XG4gIGRvbXMuZm9yRWFjaChmdW5jdGlvbihkb21haW4pIHtcbiAgICAgICAgcmVzLnB1c2goZGVzY3JpYmVDYXRlZ29yeUluRG9tYWluKGNhdGVnb3J5LCBkb21haW4sIG1vZGVsKSk7XG4gIH0pO1xuICByZXR1cm4gcmVzO1xufVxuIiwiLyoqXG4gKlxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuZXhwbGFpblxuICogQGZpbGUgZXhwbGFpbi50c1xuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxuICpcbiAqIEZ1bmN0aW9ucyBkZWFsaW5nIHdpdGggZXhwbGFpbmluZyBmYWN0cywgY2F0ZWdvcmllcyBldGMuXG4gKi9cblwidXNlIHN0cmljdFwiO1xudmFyIEFsZ29sID0gcmVxdWlyZSgnLi9hbGdvbCcpO1xudmFyIGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKTtcbnZhciBkZWJ1Z2xvZyA9IGRlYnVnKCdkZXNjcmliZScpO1xudmFyIGxvZ2dlciA9IHJlcXVpcmUoJy4uL3V0aWxzL2xvZ2dlcicpO1xudmFyIGxvZ1BlcmYgPSBsb2dnZXIucGVyZihcInBlcmZsaXN0YWxsXCIpO1xudmFyIHBlcmZsb2cgPSBkZWJ1ZygncGVyZicpO1xudmFyIFdvcmQgPSByZXF1aXJlKCcuL3dvcmQnKTtcbnZhciBXaGF0SXMgPSByZXF1aXJlKCcuL3doYXRpcycpO1xudmFyIE1vZGVsID0gcmVxdWlyZSgnLi4vbW9kZWwvbW9kZWwnKTtcbnZhciBVdGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzL3V0aWxzJyk7XG52YXIgc1dvcmRzID0ge307XG5mdW5jdGlvbiBpc1N5bm9ueW1Gb3IoZXhhY3RXb3JkLCBzbG9wcHlXb3JkLCB0aGVNb2RlbCkge1xuICAgIC8vIFRPRE86IHVzZSBtb2RlbCBzeW5vbnltc1xuICAgIHJldHVybiBzbG9wcHlXb3JkID09PSBcIm5hbWVcIiAmJiBleGFjdFdvcmQgPT09IFwiZWxlbWVudCBuYW1lXCI7XG59XG5leHBvcnRzLmlzU3lub255bUZvciA9IGlzU3lub255bUZvcjtcbmZ1bmN0aW9uIHNsb3BweU9yRXhhY3QoZXhhY3RXb3JkLCBzbG9wcHlXb3JkLCB0aGVNb2RlbCkge1xuICAgIGlmIChleGFjdFdvcmQudG9Mb3dlckNhc2UoKSA9PT0gc2xvcHB5V29yZC50b0xvd2VyQ2FzZSgpKSB7XG4gICAgICAgIHJldHVybiAnXCInICsgc2xvcHB5V29yZCArICdcIic7XG4gICAgfVxuICAgIC8vIFRPRE8sIGZpbmQgcGx1cmFsIHMgZXRjLlxuICAgIC8vIHN0aWxsIGV4YWN0LFxuICAgIC8vXG4gICAgaWYgKGlzU3lub255bUZvcihleGFjdFdvcmQsIHNsb3BweVdvcmQsIHRoZU1vZGVsKSkge1xuICAgICAgICByZXR1cm4gJ1wiJyArIHNsb3BweVdvcmQgKyAnXCIgKGludGVycHJldGVkIGFzIHN5bm9ueW0gZm9yIFwiJyArIGV4YWN0V29yZCArICdcIiknO1xuICAgIH1cbiAgICAvL3RvZG8sIGZpbmQgaXMgc3lub255bWZvciAuLi5cbiAgICAvLyBUT0RPLCBhIHN5bm9ueW0gZm9yIC4uLlxuICAgIHJldHVybiAnXCInICsgc2xvcHB5V29yZCArICdcIiAoaW50ZXJwcmV0ZWQgYXMgXCInICsgZXhhY3RXb3JkICsgJ1wiKSc7XG59XG5leHBvcnRzLnNsb3BweU9yRXhhY3QgPSBzbG9wcHlPckV4YWN0O1xuZnVuY3Rpb24gY291bnRSZWNvcmRQcmVzZW5jZShjYXRlZ29yeSwgZG9tYWluLCB0aGVNb2RlbCkge1xuICAgIHZhciByZXMgPSB7IHRvdGFscmVjb3JkczogMCxcbiAgICAgICAgcHJlc2VudHJlY29yZHM6IDAsXG4gICAgICAgIHZhbHVlczoge30sXG4gICAgICAgIG11bHRpdmFsdWVkOiBmYWxzZVxuICAgIH07XG4gICAgdGhlTW9kZWwucmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgLy9kZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmQsdW5kZWZpbmVkLDIpKTtcbiAgICAgICAgaWYgKHJlY29yZC5fZG9tYWluICE9PSBkb21haW4pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXMudG90YWxyZWNvcmRzKys7XG4gICAgICAgIHZhciB2YWwgPSByZWNvcmRbY2F0ZWdvcnldO1xuICAgICAgICB2YXIgdmFsYXJyID0gW3ZhbF07XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICAgICAgICAgIHJlcy5tdWx0aXZhbHVlZCA9IHRydWU7XG4gICAgICAgICAgICB2YWxhcnIgPSB2YWw7XG4gICAgICAgIH1cbiAgICAgICAgLy8gdG9kbyB3cmFwIGFyclxuICAgICAgICBpZiAodmFsICE9PSB1bmRlZmluZWQgJiYgdmFsICE9PSBcIm4vYVwiKSB7XG4gICAgICAgICAgICByZXMucHJlc2VudHJlY29yZHMrKztcbiAgICAgICAgfVxuICAgICAgICB2YWxhcnIuZm9yRWFjaChmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICByZXMudmFsdWVzW3ZhbF0gPSAocmVzLnZhbHVlc1t2YWxdIHx8IDApICsgMTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuY291bnRSZWNvcmRQcmVzZW5jZSA9IGNvdW50UmVjb3JkUHJlc2VuY2U7XG5mdW5jdGlvbiBjb3VudFJlY29yZFByZXNlbmNlRmFjdChmYWN0LCBjYXRlZ29yeSwgZG9tYWluLCB0aGVNb2RlbCkge1xuICAgIHZhciByZXMgPSB7IHRvdGFscmVjb3JkczogMCxcbiAgICAgICAgcHJlc2VudHJlY29yZHM6IDAsXG4gICAgICAgIHZhbHVlczoge30sXG4gICAgICAgIG11bHRpdmFsdWVkOiBmYWxzZVxuICAgIH07XG4gICAgdGhlTW9kZWwucmVjb3Jkcy5mb3JFYWNoKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgLy9kZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShyZWNvcmQsdW5kZWZpbmVkLDIpKTtcbiAgICAgICAgaWYgKHJlY29yZC5fZG9tYWluICE9PSBkb21haW4pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXMudG90YWxyZWNvcmRzKys7XG4gICAgICAgIHZhciB2YWwgPSByZWNvcmRbY2F0ZWdvcnldO1xuICAgICAgICB2YXIgdmFsYXJyID0gW3ZhbF07XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICAgICAgICAgIGlmICh2YWwuaW5kZXhPZihmYWN0KSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgcmVzLm11bHRpdmFsdWVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2YWxhcnIgPSB2YWw7XG4gICAgICAgICAgICAgICAgcmVzLnByZXNlbnRyZWNvcmRzKys7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodmFsID09PSBmYWN0KSB7XG4gICAgICAgICAgICByZXMucHJlc2VudHJlY29yZHMrKztcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmNvdW50UmVjb3JkUHJlc2VuY2VGYWN0ID0gY291bnRSZWNvcmRQcmVzZW5jZUZhY3Q7XG5mdW5jdGlvbiBtYWtlVmFsdWVzTGlzdFN0cmluZyhyZWFsdmFsdWVzKSB7XG4gICAgdmFyIHZhbHVlc1N0cmluZyA9IFwiXCI7XG4gICAgdmFyIHRvdGFsbGVuID0gMDtcbiAgICB2YXIgbGlzdFZhbHVlcyA9IHJlYWx2YWx1ZXMuZmlsdGVyKGZ1bmN0aW9uICh2YWwsIGluZGV4KSB7XG4gICAgICAgIHRvdGFsbGVuID0gdG90YWxsZW4gKyB2YWwubGVuZ3RoO1xuICAgICAgICByZXR1cm4gKGluZGV4IDwgQWxnb2wuRGVzY3JpYmVWYWx1ZUxpc3RNaW5Db3VudFZhbHVlTGlzdCkgfHwgKHRvdGFsbGVuIDwgQWxnb2wuRGVzY3JpYmVWYWx1ZUxpc3RMZW5ndGhDaGFyTGltaXQpO1xuICAgIH0pO1xuICAgIGlmIChsaXN0VmFsdWVzLmxlbmd0aCA9PT0gMSAmJiByZWFsdmFsdWVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gJ1RoZSBzb2xlIHZhbHVlIGlzIFxcXCInICsgbGlzdFZhbHVlc1swXSArICdcIic7XG4gICAgfVxuICAgIHZhciBtYXhsZW4gPSBsaXN0VmFsdWVzLnJlZHVjZShmdW5jdGlvbiAocHJldiwgdmFsKSB7IHJldHVybiBNYXRoLm1heChwcmV2LCB2YWwubGVuZ3RoKTsgfSwgMCk7XG4gICAgaWYgKG1heGxlbiA+IDMwKSB7XG4gICAgICAgIHJldHVybiBcIlBvc3NpYmxlIHZhbHVlcyBhcmUgLi4uXFxuXCIgK1xuICAgICAgICAgICAgbGlzdFZhbHVlcy5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIHZhbCwgaW5kZXgpIHsgcmV0dXJuIChwcmV2ICsgXCIoXCIgKyAoaW5kZXggKyAxKSArICcpOiBcIicgKyB2YWwgKyAnXCJcXG4nKTsgfSwgXCJcIilcbiAgICAgICAgICAgICsgKGxpc3RWYWx1ZXMubGVuZ3RoID09PSByZWFsdmFsdWVzLmxlbmd0aCA/IFwiXCIgOiBcIi4uLlwiKTtcbiAgICB9XG4gICAgdmFyIGxpc3QgPSBcIlwiO1xuICAgIGlmIChsaXN0VmFsdWVzLmxlbmd0aCA9PT0gcmVhbHZhbHVlcy5sZW5ndGgpIHtcbiAgICAgICAgbGlzdCA9IFV0aWxzLmxpc3RUb1F1b3RlZENvbW1hT3IobGlzdFZhbHVlcyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBsaXN0ID0gJ1wiJyArIGxpc3RWYWx1ZXMuam9pbignXCIsIFwiJykgKyAnXCInO1xuICAgIH1cbiAgICByZXR1cm4gXCJQb3NzaWJsZSB2YWx1ZXMgYXJlIC4uLlxcblwiXG4gICAgICAgICsgbGlzdFxuICAgICAgICArIChsaXN0VmFsdWVzLmxlbmd0aCA9PT0gcmVhbHZhbHVlcy5sZW5ndGggPyBcIlwiIDogXCIgLi4uXCIpO1xufVxuZXhwb3J0cy5tYWtlVmFsdWVzTGlzdFN0cmluZyA9IG1ha2VWYWx1ZXNMaXN0U3RyaW5nO1xuZnVuY3Rpb24gdG9QZXJjZW50KGEsIGIpIHtcbiAgICByZXR1cm4gXCJcIiArICgxMDAgKiBhIC8gYikudG9GaXhlZCgxKTtcbn1cbmV4cG9ydHMudG9QZXJjZW50ID0gdG9QZXJjZW50O1xuO1xuZnVuY3Rpb24gZ2V0Q2F0ZWdvcnlTdGF0c0luRG9tYWluKGNhdGVnb3J5LCBmaWx0ZXJkb21haW4sIHRoZU1vZGVsKSB7XG4gICAgdmFyIHJlY29yZENvdW50ID0gY291bnRSZWNvcmRQcmVzZW5jZShjYXRlZ29yeSwgZmlsdGVyZG9tYWluLCB0aGVNb2RlbCk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkodGhlTW9kZWwucmVjb3Jkcy5maWx0ZXIoZnVuY3Rpb24gKGEpIHsgcmV0dXJuIGEuX2RvbWFpbiA9PT0gXCJDb3Ntb3NcIjsgfSksIHVuZGVmaW5lZCwgMikpO1xuICAgIHZhciBwZXJjZW50ID0gdG9QZXJjZW50KHJlY29yZENvdW50LnByZXNlbnRyZWNvcmRzLCByZWNvcmRDb3VudC50b3RhbHJlY29yZHMpO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZENvdW50LnZhbHVlcykpO1xuICAgIHZhciBhbGxWYWx1ZXMgPSBPYmplY3Qua2V5cyhyZWNvcmRDb3VudC52YWx1ZXMpO1xuICAgIHZhciByZWFsdmFsdWVzID0gYWxsVmFsdWVzLmZpbHRlcihmdW5jdGlvbiAodmFsdWUpIHsgcmV0dXJuICh2YWx1ZSAhPT0gJ3VuZGVmaW5lZCcpICYmICh2YWx1ZSAhPT0gJ24vYScpOyB9KTtcbiAgICBkZWJ1Z2xvZztcbiAgICByZWFsdmFsdWVzLnNvcnQoKTtcbiAgICB2YXIgdW5kZWZOYURlbHRhID0gKGFsbFZhbHVlcy5sZW5ndGggLSByZWFsdmFsdWVzLmxlbmd0aCk7XG4gICAgdmFyIGRlbHRhID0gKHVuZGVmTmFEZWx0YSkgPyBcIigrXCIgKyB1bmRlZk5hRGVsdGEgKyBcIilcIiA6IFwiXCI7XG4gICAgdmFyIGRpc3RpbmN0ID0gJycgKyByZWFsdmFsdWVzLmxlbmd0aDtcbiAgICB2YXIgdmFsdWVzTGlzdCA9IG1ha2VWYWx1ZXNMaXN0U3RyaW5nKHJlYWx2YWx1ZXMpO1xuICAgIHJldHVybiB7XG4gICAgICAgIGNhdGVnb3J5RGVzYzogdGhlTW9kZWwuZnVsbC5kb21haW5bZmlsdGVyZG9tYWluXS5jYXRlZ29yaWVzW2NhdGVnb3J5XSxcbiAgICAgICAgZGlzdGluY3Q6IGRpc3RpbmN0LFxuICAgICAgICBkZWx0YTogZGVsdGEsXG4gICAgICAgIHByZXNlbnRSZWNvcmRzOiByZWNvcmRDb3VudC5wcmVzZW50cmVjb3JkcyxcbiAgICAgICAgcGVyY1ByZXNlbnQ6IHBlcmNlbnQsXG4gICAgICAgIHNhbXBsZVZhbHVlczogdmFsdWVzTGlzdFxuICAgIH07XG59XG5leHBvcnRzLmdldENhdGVnb3J5U3RhdHNJbkRvbWFpbiA9IGdldENhdGVnb3J5U3RhdHNJbkRvbWFpbjtcbmZ1bmN0aW9uIGRlc2NyaWJlQ2F0ZWdvcnlJbkRvbWFpbihjYXRlZ29yeSwgZmlsdGVyZG9tYWluLCB0aGVNb2RlbCkge1xuICAgIC8qICBjb25zdCByZWNvcmRDb3VudCA9IGNvdW50UmVjb3JkUHJlc2VuY2UoY2F0ZWdvcnksIGZpbHRlcmRvbWFpbiwgdGhlTW9kZWwpO1xuICAgICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkodGhlTW9kZWwucmVjb3Jkcy5maWx0ZXIoYSA9PiBhLl9kb21haW4gPT09IFwiQ29zbW9zXCIpLHVuZGVmaW5lZCwyKSk7XG4gICAgICBjb25zdCBwZXJjZW50ID0gdG9QZXJjZW50KHJlY29yZENvdW50LnByZXNlbnRyZWNvcmRzICwgcmVjb3JkQ291bnQudG90YWxyZWNvcmRzKTtcbiAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KHJlY29yZENvdW50LnZhbHVlcykpO1xuICAgICAgdmFyIGFsbFZhbHVlcyA9T2JqZWN0LmtleXMocmVjb3JkQ291bnQudmFsdWVzKTtcbiAgICAgIHZhciByZWFsdmFsdWVzID0gYWxsVmFsdWVzLmZpbHRlcih2YWx1ZSA9PiAodmFsdWUgIT09ICd1bmRlZmluZWQnKSAmJiAodmFsdWUgIT09ICduL2EnKSk7XG4gICAgICBkZWJ1Z2xvZ1xuICAgICAgcmVhbHZhbHVlcy5zb3J0KCk7XG4gICAgICB2YXIgdW5kZWZOYURlbHRhID0gIChhbGxWYWx1ZXMubGVuZ3RoIC0gcmVhbHZhbHVlcy5sZW5ndGgpO1xuICAgICAgdmFyIGRlbHRhID0gICh1bmRlZk5hRGVsdGEpID8gIFwiKCtcIiArIHVuZGVmTmFEZWx0YSArIFwiKVwiIDogXCJcIjtcbiAgICAgIGNvbnN0IGRpc3RpbmN0ID0gJycgKyByZWFsdmFsdWVzLmxlbmd0aDtcbiAgICBcbiAgICAgIGNvbnN0IHZhbHVlc0xpc3QgPSBtYWtlVmFsdWVzTGlzdFN0cmluZyhyZWFsdmFsdWVzKTtcbiAgICAqL1xuICAgIHZhciBzdGF0cyA9IGdldENhdGVnb3J5U3RhdHNJbkRvbWFpbihjYXRlZ29yeSwgZmlsdGVyZG9tYWluLCB0aGVNb2RlbCk7XG4gICAgcmV0dXJuICdpcyBhIGNhdGVnb3J5IGluIGRvbWFpbiBcIicgKyBmaWx0ZXJkb21haW4gKyAnXCJcXG4nXG4gICAgICAgICsgKFwiSXQgaXMgcHJlc2VudCBpbiBcIiArIHN0YXRzLnByZXNlbnRSZWNvcmRzICsgXCIgKFwiICsgc3RhdHMucGVyY1ByZXNlbnQgKyBcIiUpIG9mIHJlY29yZHMgaW4gdGhpcyBkb21haW4sXFxuXCIpICtcbiAgICAgICAgKFwiaGF2aW5nIFwiICsgKHN0YXRzLmRpc3RpbmN0ICsgJycpICsgc3RhdHMuZGVsdGEgKyBcIiBkaXN0aW5jdCB2YWx1ZXMuXFxuXCIpXG4gICAgICAgICsgc3RhdHMuc2FtcGxlVmFsdWVzO1xufVxuZXhwb3J0cy5kZXNjcmliZUNhdGVnb3J5SW5Eb21haW4gPSBkZXNjcmliZUNhdGVnb3J5SW5Eb21haW47XG5mdW5jdGlvbiBmaW5kUmVjb3Jkc1dpdGhGYWN0KG1hdGNoZWRTdHJpbmcsIGNhdGVnb3J5LCByZWNvcmRzLCBkb21haW5zKSB7XG4gICAgcmV0dXJuIHJlY29yZHMuZmlsdGVyKGZ1bmN0aW9uIChyZWNvcmQpIHtcbiAgICAgICAgdmFyIHJlcyA9IChyZWNvcmRbY2F0ZWdvcnldID09PSBtYXRjaGVkU3RyaW5nKTtcbiAgICAgICAgaWYgKHJlcykge1xuICAgICAgICAgICAgaW5jcmVtZW50KGRvbWFpbnMsIHJlY29yZHMuX2RvbWFpbik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9KTtcbn1cbmV4cG9ydHMuZmluZFJlY29yZHNXaXRoRmFjdCA9IGZpbmRSZWNvcmRzV2l0aEZhY3Q7XG5mdW5jdGlvbiBpbmNyZW1lbnQobWFwLCBrZXkpIHtcbiAgICBtYXBba2V5XSA9IChtYXBba2V5XSB8fCAwKSArIDE7XG59XG5leHBvcnRzLmluY3JlbWVudCA9IGluY3JlbWVudDtcbmZ1bmN0aW9uIHNvcnRlZEtleXMobWFwKSB7XG4gICAgdmFyIHIgPSBPYmplY3Qua2V5cyhtYXApO1xuICAgIHIuc29ydCgpO1xuICAgIHJldHVybiByO1xufVxuZnVuY3Rpb24gZGVzY3JpYmVGYWN0SW5Eb21haW4oZmFjdCwgZmlsdGVyZG9tYWluLCB0aGVNb2RlbCkge1xuICAgIHZhciBzZW50ZW5jZXMgPSBXaGF0SXMuYW5hbHl6ZUNvbnRleHRTdHJpbmcoZmFjdCwgdGhlTW9kZWwucnVsZXMpO1xuICAgIHZhciBsZW5ndGhPbmVTZW50ZW5jZXMgPSBzZW50ZW5jZXMuZmlsdGVyKGZ1bmN0aW9uIChvU2VudGVuY2UpIHsgcmV0dXJuIG9TZW50ZW5jZS5sZW5ndGggPT09IDE7IH0pO1xuICAgIC8vIHJlbW92ZSBjYXRlZ29yaWVzIGFuZCBkb21haW5zXG4gICAgdmFyIG9ubHlGYWN0cyA9IGxlbmd0aE9uZVNlbnRlbmNlcy5maWx0ZXIoZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvU2VudGVuY2VbMF0pKTtcbiAgICAgICAgcmV0dXJuICFXb3JkLldvcmQuaXNGaWxsZXIob1NlbnRlbmNlWzBdKSAmJiAhV29yZC5Xb3JkLmlzQ2F0ZWdvcnkob1NlbnRlbmNlWzBdKTtcbiAgICB9KTtcbiAgICBkZWJ1Z2xvZyhcIm9ubHkgZmFjdHM6IFwiICsgSlNPTi5zdHJpbmdpZnkob25seUZhY3RzKSk7XG4gICAgdmFyIHJlY29yZE1hcCA9IHt9O1xuICAgIHZhciBkb21haW5zTWFwID0ge307XG4gICAgdmFyIG1hdGNoZWR3b3JkTWFwID0ge307XG4gICAgdmFyIG1hdGNoZWRDYXRlZ29yeU1hcCA9IHt9O1xuICAgIC8vIGxvb2sgZm9yIGFsbCByZWNvcmRzXG4gICAgb25seUZhY3RzLmZvckVhY2goZnVuY3Rpb24gKG9TZW50ZW5jZSkge1xuICAgICAgICByZXR1cm4gb1NlbnRlbmNlLmZvckVhY2goZnVuY3Rpb24gKG9Xb3JkKSB7XG4gICAgICAgICAgICBpbmNyZW1lbnQobWF0Y2hlZHdvcmRNYXAsIG9Xb3JkLm1hdGNoZWRTdHJpbmcpO1xuICAgICAgICAgICAgaW5jcmVtZW50KG1hdGNoZWRDYXRlZ29yeU1hcCwgb1dvcmQuY2F0ZWdvcnkpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICAvLyB3ZSBoYXZlOlxuICAgIC8vIGEgbGlzdCBvZiBjYXRlZ29yaWVzLFxuICAgIC8vIGEgbGlzdCBvZiBtYXRjaGVkV29yZHMgIC0+XG4gICAgLy9cbiAgICB2YXIgY2F0ZWdvcmllcyA9IHNvcnRlZEtleXMobWF0Y2hlZENhdGVnb3J5TWFwKTtcbiAgICB2YXIgbWF0Y2hlZHdvcmRzID0gc29ydGVkS2V5cyhtYXRjaGVkd29yZE1hcCk7XG4gICAgZGVidWdsb2coXCJtYXRjaGVkd29yZHM6IFwiICsgSlNPTi5zdHJpbmdpZnkobWF0Y2hlZHdvcmRzKSk7XG4gICAgZGVidWdsb2coXCJjYXRlZ29yaWVzOiBcIiArIEpTT04uc3RyaW5naWZ5KGNhdGVnb3JpZXMpKTtcbiAgICAvL3ZhciBhbGxNYXRjaGVkV29yZHMgPSB7IFtrZXkgOiBzdHJpbmddIDogbnVtYmVyIH07XG4gICAgdmFyIGRvbWFpblJlY29yZENvdW50ID0ge307XG4gICAgdmFyIGRvbWFpbk1hdGNoQ2F0Q291bnQgPSB7fTtcbiAgICAvLyB3ZSBwcmVwYXJlIHRoZSBmb2xsb3dpbmcgc3RydWN0dXJlXG4gICAgLy9cbiAgICAvLyB7ZG9tYWlufSA6IHJlY29yZGNvdW50O1xuICAgIC8vIHttYXRjaGVkd29yZHN9IDpcbiAgICAvLyB7ZG9tYWlufSB7bWF0Y2hlZHdvcmR9IHtjYXRlZ29yeX0gcHJlc2VuY2Vjb3VudFxuICAgIHRoZU1vZGVsLnJlY29yZHMuZm9yRWFjaChmdW5jdGlvbiAocmVjb3JkKSB7XG4gICAgICAgIGlmICghZmlsdGVyZG9tYWluIHx8IHJlY29yZC5fZG9tYWluID09PSBmaWx0ZXJkb21haW4pIHtcbiAgICAgICAgICAgIGRvbWFpblJlY29yZENvdW50W3JlY29yZC5fZG9tYWluXSA9IChkb21haW5SZWNvcmRDb3VudFtyZWNvcmQuX2RvbWFpbl0gfHwgMCkgKyAxO1xuICAgICAgICAgICAgbWF0Y2hlZHdvcmRzLmZvckVhY2goZnVuY3Rpb24gKG1hdGNoZWR3b3JkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhdGVnb3JpZXMuZm9yRWFjaChmdW5jdGlvbiAoY2F0ZWdvcnkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlY29yZFtjYXRlZ29yeV0gPT09IG1hdGNoZWR3b3JkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbWQgPSBkb21haW5NYXRjaENhdENvdW50W3JlY29yZC5fZG9tYWluXSA9IGRvbWFpbk1hdGNoQ2F0Q291bnRbcmVjb3JkLl9kb21haW5dIHx8IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG1kYyA9IG1kW21hdGNoZWR3b3JkXSA9IG1kW21hdGNoZWR3b3JkXSB8fCB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY3JlbWVudChtZGMsIGNhdGVnb3J5KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICA7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRvbWFpbk1hdGNoQ2F0Q291bnQsIHVuZGVmaW5lZCwgMikpO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRvbWFpblJlY29yZENvdW50LCB1bmRlZmluZWQsIDIpKTtcbiAgICB2YXIgZG9tYWlucyA9IHNvcnRlZEtleXMoZG9tYWluTWF0Y2hDYXRDb3VudCk7XG4gICAgdmFyIHJlcyA9ICdcIicgKyBmYWN0ICsgJ1wiIGhhcyBhIG1lYW5pbmcgaW4gJztcbiAgICB2YXIgc2luZ2xlID0gZmFsc2U7XG4gICAgaWYgKE9iamVjdC5rZXlzKGRvbWFpbk1hdGNoQ2F0Q291bnQpLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgcmVzICs9ICcnICsgZG9tYWlucy5sZW5ndGggK1xuICAgICAgICAgICAgJyBkb21haW5zOiAnICsgVXRpbHMubGlzdFRvUXVvdGVkQ29tbWFBbmQoZG9tYWlucykgKyBcIlwiO1xuICAgIH1cbiAgICBlbHNlIGlmIChkb21haW5zLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBpZiAoIWZpbHRlcmRvbWFpbikge1xuICAgICAgICAgICAgcmVzICs9IFwib25lIFwiO1xuICAgICAgICB9XG4gICAgICAgIHJlcyArPSBcImRvbWFpbiBcXFwiXCIgKyBkb21haW5zWzBdICsgXCJcXFwiOlwiO1xuICAgICAgICBzaW5nbGUgPSB0cnVlO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgaWYgKGZpbHRlcmRvbWFpbikge1xuICAgICAgICAgICAgcmV0dXJuIFwiXFxcIlwiICsgZmFjdCArIFwiXFxcIiBpcyBubyBrbm93biBmYWN0IGluIGRvbWFpbiBcXFwiXCIgKyBmaWx0ZXJkb21haW4gKyBcIlxcXCIuXFxuXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFwiXFxcIlwiICsgZmFjdCArIFwiXFxcIiBpcyBubyBrbm93biBmYWN0LlxcblwiO1xuICAgIH1cbiAgICByZXMgKz0gXCJcXG5cIjsgLy8gLi4uXFxuXCI7XG4gICAgZG9tYWlucy5mb3JFYWNoKGZ1bmN0aW9uIChkb21haW4pIHtcbiAgICAgICAgdmFyIG1kID0gZG9tYWluTWF0Y2hDYXRDb3VudFtkb21haW5dO1xuICAgICAgICBPYmplY3Qua2V5cyhtZCkuZm9yRWFjaChmdW5jdGlvbiAobWF0Y2hlZHN0cmluZykge1xuICAgICAgICAgICAgdmFyIG1kYyA9IG1kW21hdGNoZWRzdHJpbmddO1xuICAgICAgICAgICAgaWYgKCFzaW5nbGUpIHtcbiAgICAgICAgICAgICAgICByZXMgKz0gJ2luIGRvbWFpbiBcIicgKyBkb21haW4gKyAnXCIgJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBjYXRzaW5nbGUgPSBPYmplY3Qua2V5cyhtZGMpLmxlbmd0aCA9PT0gMTtcbiAgICAgICAgICAgIHJlcyArPSBzbG9wcHlPckV4YWN0KG1hdGNoZWRzdHJpbmcsIGZhY3QsIHRoZU1vZGVsKSArIFwiIFwiO1xuICAgICAgICAgICAgaWYgKCFjYXRzaW5nbGUpIHtcbiAgICAgICAgICAgICAgICByZXMgKz0gXCIuLi5cXG5cIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIE9iamVjdC5rZXlzKG1kYykuZm9yRWFjaChmdW5jdGlvbiAoY2F0ZWdvcnkpIHtcbiAgICAgICAgICAgICAgICB2YXIgcGVyY2VudCA9IHRvUGVyY2VudChtZGNbY2F0ZWdvcnldLCBkb21haW5SZWNvcmRDb3VudFtkb21haW5dKTtcbiAgICAgICAgICAgICAgICByZXMgKz0gXCJpcyBhIHZhbHVlIGZvciBjYXRlZ29yeSBcXFwiXCIgKyBjYXRlZ29yeSArIFwiXFxcIiBwcmVzZW50IGluIFwiICsgbWRjW2NhdGVnb3J5XSArIFwiKFwiICsgcGVyY2VudCArIFwiJSkgb2YgcmVjb3JkcztcXG5cIjtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5kZXNjcmliZUZhY3RJbkRvbWFpbiA9IGRlc2NyaWJlRmFjdEluRG9tYWluO1xuZnVuY3Rpb24gZGVzY3JpYmVDYXRlZ29yeShjYXRlZ29yeSwgZmlsdGVyRG9tYWluLCBtb2RlbCwgbWVzc2FnZSkge1xuICAgIHZhciByZXMgPSBbXTtcbiAgICB2YXIgZG9tcyA9IE1vZGVsLmdldERvbWFpbnNGb3JDYXRlZ29yeShtb2RlbCwgY2F0ZWdvcnkpO1xuICAgIGlmIChmaWx0ZXJEb21haW4pIHtcbiAgICAgICAgaWYgKGRvbXMuaW5kZXhPZihmaWx0ZXJEb21haW4pID49IDApIHtcbiAgICAgICAgICAgIHJlcy5wdXNoKGRlc2NyaWJlQ2F0ZWdvcnlJbkRvbWFpbihjYXRlZ29yeSwgZmlsdGVyRG9tYWluLCBtb2RlbCkpO1xuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBkb21zLnNvcnQoKTtcbiAgICBkb21zLmZvckVhY2goZnVuY3Rpb24gKGRvbWFpbikge1xuICAgICAgICByZXMucHVzaChkZXNjcmliZUNhdGVnb3J5SW5Eb21haW4oY2F0ZWdvcnksIGRvbWFpbiwgbW9kZWwpKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5kZXNjcmliZUNhdGVnb3J5ID0gZGVzY3JpYmVDYXRlZ29yeTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
