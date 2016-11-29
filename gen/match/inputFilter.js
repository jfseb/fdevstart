/// <reference path="../../lib/node-4.d.ts" />
"use strict";
/**
 * the input filter stage preprocesses a current context
 *
 * It a) combines multi-segment arguments into one context members
 * It b) attempts to augment the context by additional qualifications
 *           (Mid term generating Alternatives, e.g.
 *                 ClientSideTargetResolution -> unit test?
 *                 ClientSideTargetResolution -> source ?
 *           )
 *  Simple rules like  Intent
 *
 *
 * @module
 * @file inputFilter.ts
 */

var distance = require('../utils/damerauLevenshtein');
var debug = require('debug');
var debuglog = debug('inputFilter');
var matchdata = require('./matchdata');
var oUnitTests = matchdata.oUnitTests;
/**
 * @param sText {string} the text to match to NavTargetResolution
 * @param sText2 {string} the query text, e.g. NavTarget
 *
 * @return the distance, note that is is *not* symmetric!
 */
function calcDistance(sText1, sText2) {
    // console.log("length2" + sText1 + " - " + sText2)
    var a0 = distance.levenshtein(sText1.substring(0, sText2.length), sText2);
    var a = distance.levenshtein(sText1.toLowerCase(), sText2);
    return a0 * 500 / sText2.length + a;
}
var IFMatch = require('../match/ifmatch');
function nonPrivateKeys(oA) {
    return Object.keys(oA).filter(function (key) {
        return key[0] !== '_';
    });
}
function countAinB(oA, oB, fnCompare, aKeyIgnore) {
    aKeyIgnore = Array.isArray(aKeyIgnore) ? aKeyIgnore : typeof aKeyIgnore === "string" ? [aKeyIgnore] : [];
    fnCompare = fnCompare || function () {
        return true;
    };
    return nonPrivateKeys(oA).filter(function (key) {
        return aKeyIgnore.indexOf(key) < 0;
    }).reduce(function (prev, key) {
        if (Object.prototype.hasOwnProperty.call(oB, key)) {
            prev = prev + (fnCompare(oA[key], oB[key], key) ? 1 : 0);
        }
        return prev;
    }, 0);
}
exports.countAinB = countAinB;
function spuriousAnotInB(oA, oB, aKeyIgnore) {
    aKeyIgnore = Array.isArray(aKeyIgnore) ? aKeyIgnore : typeof aKeyIgnore === "string" ? [aKeyIgnore] : [];
    return nonPrivateKeys(oA).filter(function (key) {
        return aKeyIgnore.indexOf(key) < 0;
    }).reduce(function (prev, key) {
        if (!Object.prototype.hasOwnProperty.call(oB, key)) {
            prev = prev + 1;
        }
        return prev;
    }, 0);
}
exports.spuriousAnotInB = spuriousAnotInB;
function lowerCase(o) {
    if (typeof o === "string") {
        return o.toLowerCase();
    }
    return o;
}
function compareContext(oA, oB, aKeyIgnore) {
    var equal = countAinB(oA, oB, function (a, b) {
        return lowerCase(a) === lowerCase(b);
    }, aKeyIgnore);
    var different = countAinB(oA, oB, function (a, b) {
        return lowerCase(a) !== lowerCase(b);
    }, aKeyIgnore);
    var spuriousL = spuriousAnotInB(oA, oB, aKeyIgnore);
    var spuriousR = spuriousAnotInB(oB, oA, aKeyIgnore);
    return {
        equal: equal,
        different: different,
        spuriousL: spuriousL,
        spuriousR: spuriousR
    };
}
exports.compareContext = compareContext;
function categorizeString(string, exact, oRules) {
    // simply apply all rules
    var res = [];
    oRules.forEach(function (oRule) {
        switch (oRule.type) {
            case 0 /* WORD */:
                if (exact && oRule.word === string) {
                    res.push({
                        string: string,
                        matchedString: oRule.matchedString,
                        category: oRule.category
                    });
                }
                if (!exact) {
                    var levenmatch = calcDistance(oRule.word, string);
                    if (levenmatch < 150) {
                        res.push({
                            string: string,
                            matchedString: oRule.word,
                            category: oRule.category,
                            levenmatch: levenmatch
                        });
                    }
                }
                break;
            case 1 /* REGEXP */:
                {
                    debuglog(JSON.stringify(" here regexp" + JSON.stringify(oRule, undefined, 2)));
                    var m = oRule.regexp.exec(string);
                    if (m) {
                        res.push({
                            string: string,
                            matchedString: oRule.matchIndex !== undefined && m[oRule.matchIndex] || string,
                            category: oRule.category
                        });
                    }
                }
                break;
            default:
                throw new Error("unknown type" + JSON.stringify(oRule, undefined, 2));
        }
    });
    return res;
}
exports.categorizeString = categorizeString;
/**
 *
 * Options may be {
 * matchothers : true,  => only rules where all others match are considered
 * augment : true,
 * override : true }  =>
 *
 */
function matchWord(oRule, context, options) {
    if (context[oRule.key] === undefined) {
        return undefined;
    }
    var s1 = context[oRule.key].toLowerCase();
    var s2 = oRule.word.toLowerCase();
    options = options || {};
    var delta = compareContext(context, oRule.follows, oRule.key);
    debuglog(JSON.stringify(delta));
    debuglog(JSON.stringify(options));
    if (options.matchothers && delta.different > 0) {
        return undefined;
    }
    var c = calcDistance(s2, s1);
    debuglog(" s1 <> s2 " + s1 + "<>" + s2 + "  =>: " + c);
    if (c < 150) {
        var res = Object.assign({}, oRule.follows);
        res = Object.assign(res, context);
        if (options.override) {
            res = Object.assign(res, oRule.follows);
        }
        // force key property
        // console.log(' objectcategory', res['systemObjectCategory']);
        res[oRule.key] = oRule.follows[oRule.key] || res[oRule.key];
        res._weight = Object.assign({}, res._weight);
        res._weight[oRule.key] = c;
        Object.freeze(res);
        debuglog('Found one' + JSON.stringify(res, undefined, 2));
        return res;
    }
    return undefined;
}
exports.matchWord = matchWord;
function extractArgsMap(match, argsMap) {
    var res = {};
    if (!argsMap) {
        return res;
    }
    Object.keys(argsMap).forEach(function (iKey) {
        var value = match[iKey];
        var key = argsMap[iKey];
        if (typeof value === "string" && value.length > 0) {
            res[key] = value;
        }
    });
    return res;
}
exports.extractArgsMap = extractArgsMap;
function matchRegExp(oRule, context, options) {
    if (context[oRule.key] === undefined) {
        return undefined;
    }
    var sKey = oRule.key;
    var s1 = context[oRule.key].toLowerCase();
    var reg = oRule.regexp;
    var m = reg.exec(s1);
    debuglog("applying regexp: " + s1 + " " + JSON.stringify(m));
    if (!m) {
        return undefined;
    }
    options = options || {};
    var delta = compareContext(context, oRule.follows, oRule.key);
    debuglog(JSON.stringify(delta));
    debuglog(JSON.stringify(options));
    if (options.matchothers && delta.different > 0) {
        return undefined;
    }
    var oExtractedContext = extractArgsMap(m, oRule.argsMap);
    debuglog("extracted args " + JSON.stringify(oRule.argsMap));
    debuglog("match " + JSON.stringify(m));
    debuglog("extracted args " + JSON.stringify(oExtractedContext));
    var res = Object.assign({}, oRule.follows);
    res = Object.assign(res, oExtractedContext);
    res = Object.assign(res, context);
    if (oExtractedContext[sKey] !== undefined) {
        res[sKey] = oExtractedContext[sKey];
    }
    if (options.override) {
        res = Object.assign(res, oRule.follows);
        res = Object.assign(res, oExtractedContext);
    }
    Object.freeze(res);
    debuglog('Found one' + JSON.stringify(res, undefined, 2));
    return res;
}
exports.matchRegExp = matchRegExp;
function sortByWeight(sKey, oContextA, oContextB) {
    debuglog('sorting: ' + sKey + 'invoked with\n 1:' + JSON.stringify(oContextA, undefined, 2) + " vs \n 2:" + JSON.stringify(oContextB, undefined, 2));
    var rankingA = parseFloat(oContextA["_ranking"] || "1");
    var rankingB = parseFloat(oContextB["_ranking"] || "1");
    if (rankingA !== rankingB) {
        debuglog(" rankin delta" + 100 * (rankingB - rankingA));
        return 100 * (rankingB - rankingA);
    }
    var weightA = oContextA["_weight"] && oContextA["_weight"][sKey] || 0;
    var weightB = oContextB["_weight"] && oContextB["_weight"][sKey] || 0;
    return +(weightA - weightB);
}
exports.sortByWeight = sortByWeight;
// Word, Synonym, Regexp / ExtractionRule
function augmentContext1(context, oRules, options) {
    var sKey = oRules[0].key;
    // check that rule
    if (debuglog.enabled) {
        // check consistency
        oRules.every(function (iRule) {
            if (iRule.key !== sKey) {
                throw new Error("Inhomogenous keys in rules, expected " + sKey + " was " + JSON.stringify(iRule));
            }
            return true;
        });
    }
    // look for rules which match
    var res = oRules.map(function (oRule) {
        // is this rule applicable
        switch (oRule.type) {
            case 0 /* WORD */:
                return matchWord(oRule, context, options);
            case 1 /* REGEXP */:
                return matchRegExp(oRule, context, options);
        }
        return undefined;
    }).filter(function (ores) {
        return !!ores;
    }).sort(sortByWeight.bind(this, sKey));
    return res;
    // Object.keys().forEach(function (sKey) {
    // });
}
exports.augmentContext1 = augmentContext1;
function augmentContext(context, aRules) {
    var options1 = {
        matchothers: true,
        override: false
    };
    var aRes = augmentContext1(context, aRules, options1);
    if (aRes.length === 0) {
        var options2 = {
            matchothers: false,
            override: true
        };
        aRes = augmentContext1(context, aRules, options2);
    }
    return aRes;
}
exports.augmentContext = augmentContext;
function insertOrdered(result, iInsertedMember, limit) {
    // TODO: use some weight
    if (result.length < limit) {
        result.push(iInsertedMember);
    }
    return result;
}
exports.insertOrdered = insertOrdered;
function takeTopN(arr) {
    var u = arr.filter(function (innerArr) {
        return innerArr.length > 0;
    });
    var res = [];
    // shift out the top ones
    u = u.map(function (iArr) {
        var top = iArr.shift();
        res = insertOrdered(res, top, 5);
        return iArr;
    }).filter(function (innerArr) {
        return innerArr.length > 0;
    });
    // as Array<Array<IFMatch.context>>
    return res;
}
exports.takeTopN = takeTopN;
var inputFilterRules = require('./inputFilterRules');
var rm;
function getRMOnce() {
    if (!rm) {
        rm = inputFilterRules.getRuleMap();
    }
    return rm;
}
function applyRules(context) {
    var bestN = [context];
    inputFilterRules.oKeyOrder.forEach(function (sKey) {
        var bestNext = [];
        bestN.forEach(function (oContext) {
            if (oContext[sKey]) {
                debuglog('** applying rules for ' + sKey);
                var res = augmentContext(oContext, getRMOnce()[sKey] || []);
                debuglog('** result for ' + sKey + ' = ' + JSON.stringify(res, undefined, 2));
                bestNext.push(res || []);
            } else {
                // rule not relevant
                bestNext.push([oContext]);
            }
        });
        bestN = takeTopN(bestNext);
    });
    return bestN;
}
exports.applyRules = applyRules;
function applyRulesPickFirst(context) {
    var r = applyRules(context);
    return r && r[0];
}
exports.applyRulesPickFirst = applyRulesPickFirst;
/**
 * Decide whether to requery for a contet
 */
function decideOnReQuery(context) {
    return [];
}
exports.decideOnReQuery = decideOnReQuery;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9pbnB1dEZpbHRlci50cyIsIm1hdGNoL2lucHV0RmlsdGVyLmpzIl0sIm5hbWVzIjpbImRpc3RhbmNlIiwicmVxdWlyZSIsImRlYnVnIiwiZGVidWdsb2ciLCJtYXRjaGRhdGEiLCJvVW5pdFRlc3RzIiwiY2FsY0Rpc3RhbmNlIiwic1RleHQxIiwic1RleHQyIiwiYTAiLCJsZXZlbnNodGVpbiIsInN1YnN0cmluZyIsImxlbmd0aCIsImEiLCJ0b0xvd2VyQ2FzZSIsIklGTWF0Y2giLCJub25Qcml2YXRlS2V5cyIsIm9BIiwiT2JqZWN0Iiwia2V5cyIsImZpbHRlciIsImtleSIsImNvdW50QWluQiIsIm9CIiwiZm5Db21wYXJlIiwiYUtleUlnbm9yZSIsIkFycmF5IiwiaXNBcnJheSIsImluZGV4T2YiLCJyZWR1Y2UiLCJwcmV2IiwicHJvdG90eXBlIiwiaGFzT3duUHJvcGVydHkiLCJjYWxsIiwiZXhwb3J0cyIsInNwdXJpb3VzQW5vdEluQiIsImxvd2VyQ2FzZSIsIm8iLCJjb21wYXJlQ29udGV4dCIsImVxdWFsIiwiYiIsImRpZmZlcmVudCIsInNwdXJpb3VzTCIsInNwdXJpb3VzUiIsImNhdGVnb3JpemVTdHJpbmciLCJzdHJpbmciLCJleGFjdCIsIm9SdWxlcyIsInJlcyIsImZvckVhY2giLCJvUnVsZSIsInR5cGUiLCJ3b3JkIiwicHVzaCIsIm1hdGNoZWRTdHJpbmciLCJjYXRlZ29yeSIsImxldmVubWF0Y2giLCJKU09OIiwic3RyaW5naWZ5IiwidW5kZWZpbmVkIiwibSIsInJlZ2V4cCIsImV4ZWMiLCJtYXRjaEluZGV4IiwiRXJyb3IiLCJtYXRjaFdvcmQiLCJjb250ZXh0Iiwib3B0aW9ucyIsInMxIiwiczIiLCJkZWx0YSIsImZvbGxvd3MiLCJtYXRjaG90aGVycyIsImMiLCJhc3NpZ24iLCJvdmVycmlkZSIsIl93ZWlnaHQiLCJmcmVlemUiLCJleHRyYWN0QXJnc01hcCIsIm1hdGNoIiwiYXJnc01hcCIsImlLZXkiLCJ2YWx1ZSIsIm1hdGNoUmVnRXhwIiwic0tleSIsInJlZyIsIm9FeHRyYWN0ZWRDb250ZXh0Iiwic29ydEJ5V2VpZ2h0Iiwib0NvbnRleHRBIiwib0NvbnRleHRCIiwicmFua2luZ0EiLCJwYXJzZUZsb2F0IiwicmFua2luZ0IiLCJ3ZWlnaHRBIiwid2VpZ2h0QiIsImF1Z21lbnRDb250ZXh0MSIsImVuYWJsZWQiLCJldmVyeSIsImlSdWxlIiwibWFwIiwib3JlcyIsInNvcnQiLCJiaW5kIiwiYXVnbWVudENvbnRleHQiLCJhUnVsZXMiLCJvcHRpb25zMSIsImFSZXMiLCJvcHRpb25zMiIsImluc2VydE9yZGVyZWQiLCJyZXN1bHQiLCJpSW5zZXJ0ZWRNZW1iZXIiLCJsaW1pdCIsInRha2VUb3BOIiwiYXJyIiwidSIsImlubmVyQXJyIiwiaUFyciIsInRvcCIsInNoaWZ0IiwiaW5wdXRGaWx0ZXJSdWxlcyIsInJtIiwiZ2V0Uk1PbmNlIiwiZ2V0UnVsZU1hcCIsImFwcGx5UnVsZXMiLCJiZXN0TiIsIm9LZXlPcmRlciIsImJlc3ROZXh0Iiwib0NvbnRleHQiLCJhcHBseVJ1bGVzUGlja0ZpcnN0IiwiciIsImRlY2lkZU9uUmVRdWVyeSJdLCJtYXBwaW5ncyI6IkFBQUE7QUNDQTtBREVBOzs7Ozs7Ozs7Ozs7Ozs7O0FBZUEsSUFBWUEsV0FBUUMsUUFBTSw2QkFBTixDQUFwQjtBQUVBLElBQVlDLFFBQUtELFFBQU0sT0FBTixDQUFqQjtBQUlBLElBQU1FLFdBQVdELE1BQU0sYUFBTixDQUFqQjtBQUVBLElBQVlFLFlBQVNILFFBQU0sYUFBTixDQUFyQjtBQUNFLElBQUlJLGFBQWFELFVBQVVDLFVBQTNCO0FBRUE7Ozs7OztBQU1BLFNBQUFDLFlBQUEsQ0FBdUJDLE1BQXZCLEVBQXdDQyxNQUF4QyxFQUF1RDtBQUNyRDtBQUNBLFFBQUlDLEtBQUtULFNBQVNVLFdBQVQsQ0FBcUJILE9BQU9JLFNBQVAsQ0FBaUIsQ0FBakIsRUFBb0JILE9BQU9JLE1BQTNCLENBQXJCLEVBQXlESixNQUF6RCxDQUFUO0FBQ0Es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QVNjLFFBQVQsQ0FBUjtBQUNELEtBZEQ7QUFlQSxXQUFPRixLQUFQO0FBQ0Q7QUFsQmUxRixRQUFBeUYsVUFBQSxHQUFVQSxVQUFWO0FBcUJoQixTQUFBSyxtQkFBQSxDQUFvQzlELE9BQXBDLEVBQTZEO0FBQzNELFFBQUkrRCxJQUFJTixXQUFXekQsT0FBWCxDQUFSO0FBQ0EsV0FBTytELEtBQUtBLEVBQUUsQ0FBRixDQUFaO0FBQ0Q7QUFIZS9GLFFBQUE4RixtQkFBQSxHQUFtQkEsbUJBQW5CO0FBS2hCOzs7QUFHQSxTQUFBRSxlQUFBLENBQWlDaEUsT0FBakMsRUFBMEQ7QUFDeEQsV0FBTyxFQUFQO0FBQ0Q7QUFGZWhDLFFBQUFnRyxlQUFBLEdBQWVBLGVBQWYiLCJmaWxlIjoibWF0Y2gvaW5wdXRGaWx0ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vbGliL25vZGUtNC5kLnRzXCIgLz5cclxuXHJcblxyXG4vKipcclxuICogdGhlIGlucHV0IGZpbHRlciBzdGFnZSBwcmVwcm9jZXNzZXMgYSBjdXJyZW50IGNvbnRleHRcclxuICpcclxuICogSXQgYSkgY29tYmluZXMgbXVsdGktc2VnbWVudCBhcmd1bWVudHMgaW50byBvbmUgY29udGV4dCBtZW1iZXJzXHJcbiAqIEl0IGIpIGF0dGVtcHRzIHRvIGF1Z21lbnQgdGhlIGNvbnRleHQgYnkgYWRkaXRpb25hbCBxdWFsaWZpY2F0aW9uc1xyXG4gKiAgICAgICAgICAgKE1pZCB0ZXJtIGdlbmVyYXRpbmcgQWx0ZXJuYXRpdmVzLCBlLmcuXHJcbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiB1bml0IHRlc3Q/XHJcbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiBzb3VyY2UgP1xyXG4gKiAgICAgICAgICAgKVxyXG4gKiAgU2ltcGxlIHJ1bGVzIGxpa2UgIEludGVudFxyXG4gKlxyXG4gKlxyXG4gKiBAbW9kdWxlXHJcbiAqIEBmaWxlIGlucHV0RmlsdGVyLnRzXHJcbiAqL1xyXG5pbXBvcnQgKiBhcyBkaXN0YW5jZSBmcm9tICcuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4nO1xyXG5cclxuaW1wb3J0ICogYXMgZGVidWcgZnJvbSAnZGVidWcnO1xyXG5cclxuaW1wb3J0ICogYXMgSU1hdGNoIGZyb20gJy4vaWZtYXRjaCc7XHJcblxyXG5jb25zdCBkZWJ1Z2xvZyA9IGRlYnVnKCdpbnB1dEZpbHRlcicpXHJcblxyXG5pbXBvcnQgKiBhcyBtYXRjaGRhdGEgZnJvbSAnLi9tYXRjaGRhdGEnO1xyXG4gIHZhciBvVW5pdFRlc3RzID0gbWF0Y2hkYXRhLm9Vbml0VGVzdHNcclxuXHJcbiAgLyoqXHJcbiAgICogQHBhcmFtIHNUZXh0IHtzdHJpbmd9IHRoZSB0ZXh0IHRvIG1hdGNoIHRvIE5hdlRhcmdldFJlc29sdXRpb25cclxuICAgKiBAcGFyYW0gc1RleHQyIHtzdHJpbmd9IHRoZSBxdWVyeSB0ZXh0LCBlLmcuIE5hdlRhcmdldFxyXG4gICAqXHJcbiAgICogQHJldHVybiB0aGUgZGlzdGFuY2UsIG5vdGUgdGhhdCBpcyBpcyAqbm90KiBzeW1tZXRyaWMhXHJcbiAgICovXHJcbiAgZnVuY3Rpb24gY2FsY0Rpc3RhbmNlIChzVGV4dDEgOiBzdHJpbmcsIHNUZXh0MiA6IHN0cmluZykgOiBudW1iZXIge1xyXG4gICAgLy8gY29uc29sZS5sb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxyXG4gICAgdmFyIGEwID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnN1YnN0cmluZygwLCBzVGV4dDIubGVuZ3RoKSwgc1RleHQyKVxyXG4gICAgdmFyIGEgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEudG9Mb3dlckNhc2UoKSwgc1RleHQyKVxyXG4gICAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGFcclxuICB9XHJcblxyXG5pbXBvcnQgKiBhcyBJRk1hdGNoIGZyb20gJy4uL21hdGNoL2lmbWF0Y2gnO1xyXG5cclxudHlwZSBJUnVsZSA9IElGTWF0Y2guSVJ1bGVcclxuXHJcblxyXG5pbnRlcmZhY2UgSU1hdGNoT3B0aW9ucyB7XHJcbiAgbWF0Y2hvdGhlcnM/IDogYm9vbGVhbixcclxuICBhdWdtZW50PzogYm9vbGVhbixcclxuICBvdmVycmlkZT8gOiBib29sZWFuXHJcbn1cclxuXHJcbmludGVyZmFjZSBJTWF0Y2hDb3VudCB7XHJcbiAgZXF1YWwgOiBudW1iZXJcclxuICBkaWZmZXJlbnQgOiBudW1iZXJcclxuICBzcHVyaW91c1IgOiBudW1iZXJcclxuICBzcHVyaW91c0wgOiBudW1iZXJcclxufVxyXG5cclxudHlwZSBFbnVtUnVsZVR5cGUgPSBJRk1hdGNoLkVudW1SdWxlVHlwZVxyXG5cclxuXHJcbmZ1bmN0aW9uIG5vblByaXZhdGVLZXlzKG9BKSB7XHJcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG9BKS5maWx0ZXIoIGtleSA9PiB7XHJcbiAgICByZXR1cm4ga2V5WzBdICE9PSAnXyc7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjb3VudEFpbkIgKG9BLCBvQiwgZm5Db21wYXJlLCBhS2V5SWdub3JlPykgOiBudW1iZXJ7XHJcbiAgIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gIGFLZXlJZ25vcmUgOlxyXG4gICAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6ICBbXTtcclxuICAgZm5Db21wYXJlID0gZm5Db21wYXJlIHx8IGZ1bmN0aW9uKCkgeyByZXR1cm4gdHJ1ZTsgfVxyXG4gICByZXR1cm4gbm9uUHJpdmF0ZUtleXMob0EpLmZpbHRlciggZnVuY3Rpb24oa2V5KSB7XHJcbiAgICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcclxuICAgIH0pLlxyXG4gICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xyXG4gICAgICAgIHByZXYgPSBwcmV2ICsgKGZuQ29tcGFyZShvQVtrZXldLG9CW2tleV0sIGtleSkgPyAxIDogMClcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldlxyXG4gICAgfSwgMClcclxuICB9XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc3B1cmlvdXNBbm90SW5CKG9BLG9CLCBhS2V5SWdub3JlPyApIHtcclxuICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/ICBhS2V5SWdub3JlIDpcclxuICAgICAgdHlwZW9mIGFLZXlJZ25vcmUgPT09IFwic3RyaW5nXCIgPyBbYUtleUlnbm9yZV0gOiAgW107XHJcbiAgIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKCBmdW5jdGlvbihrZXkpIHtcclxuICAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xyXG4gICAgfSkuXHJcbiAgICByZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xyXG4gICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xyXG4gICAgICAgIHByZXYgPSBwcmV2ICsgMVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBwcmV2XHJcbiAgICB9LCAwKVxyXG59XHJcblxyXG5mdW5jdGlvbiBsb3dlckNhc2Uobykge1xyXG4gIGlmICh0eXBlb2YgbyA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgcmV0dXJuIG8udG9Mb3dlckNhc2UoKVxyXG4gIH1cclxuICByZXR1cm4gb1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY29tcGFyZUNvbnRleHQob0EgLCBvQiwgYUtleUlnbm9yZT8pIHtcclxuICB2YXIgZXF1YWwgPSBjb3VudEFpbkIob0Esb0IsIGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpID09PSBsb3dlckNhc2UoYik7fSwgYUtleUlnbm9yZSk7XHJcbiAgdmFyIGRpZmZlcmVudCA9IGNvdW50QWluQihvQSxvQiwgZnVuY3Rpb24oYSxiKSB7IHJldHVybiBsb3dlckNhc2UoYSkgIT09IGxvd2VyQ2FzZShiKTt9LCBhS2V5SWdub3JlKTtcclxuICB2YXIgc3B1cmlvdXNMID0gc3B1cmlvdXNBbm90SW5CKG9BLG9CLCBhS2V5SWdub3JlKVxyXG4gIHZhciBzcHVyaW91c1IgPSBzcHVyaW91c0Fub3RJbkIob0Isb0EsIGFLZXlJZ25vcmUpXHJcbiAgcmV0dXJuIHtcclxuICAgIGVxdWFsIDogZXF1YWwsXHJcbiAgICBkaWZmZXJlbnQ6IGRpZmZlcmVudCxcclxuICAgIHNwdXJpb3VzTDogc3B1cmlvdXNMLFxyXG4gICAgc3B1cmlvdXNSOiBzcHVyaW91c1JcclxuICB9XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY2F0ZWdvcml6ZVN0cmluZyhzdHJpbmcgOiBzdHJpbmcsIGV4YWN0IDogYm9vbGVhbiwgIG9SdWxlcyA6IEFycmF5PElNYXRjaC5tUnVsZT4pIHtcclxuICAvLyBzaW1wbHkgYXBwbHkgYWxsIHJ1bGVzXHJcbiAgdmFyIHJlcyA6IEFycmF5PElNYXRjaC5JQ2F0ZWdvcml6ZWRTdHJpbmc+ID0gW11cclxuICBvUnVsZXMuZm9yRWFjaChmdW5jdGlvbihvUnVsZSkge1xyXG4gICAgc3dpdGNoKG9SdWxlLnR5cGUpIHtcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5XT1JEIDpcclxuICAgICAgICAgIGlmICggZXhhY3QgJiYgb1J1bGUud29yZCA9PT0gc3RyaW5nKSB7XHJcbiAgICAgICAgICAgIHJlcy5wdXNoKCB7XHJcbiAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXHJcbiAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZyA6IG9SdWxlLm1hdGNoZWRTdHJpbmcsXHJcbiAgICAgICAgICAgICAgY2F0ZWdvcnkgOiBvUnVsZS5jYXRlZ29yeVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKCFleGFjdCkge1xyXG4gICAgICAgICAgICB2YXIgbGV2ZW5tYXRjaCA9IGNhbGNEaXN0YW5jZShvUnVsZS53b3JkLHN0cmluZylcclxuICAgICAgICAgICAgaWYgKGxldmVubWF0Y2ggPCAxNTApIHtcclxuICAgICAgICAgICAgICByZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcclxuICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmcgOiBvUnVsZS53b3JkLFxyXG4gICAgICAgICAgICAgICAgY2F0ZWdvcnkgOiBvUnVsZS5jYXRlZ29yeSxcclxuICAgICAgICAgICAgICAgIGxldmVubWF0Y2ggOiBsZXZlbm1hdGNoXHJcbiAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuUkVHRVhQOiB7XHJcblxyXG4gICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KFwiIGhlcmUgcmVnZXhwXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSx1bmRlZmluZWQsMikpKVxyXG4gICAgICAgIHZhciBtID0gb1J1bGUucmVnZXhwLmV4ZWMoc3RyaW5nKVxyXG4gICAgICAgIGlmKG0pIHtcclxuICAgICAgICAgICAgcmVzLnB1c2goIHtcclxuICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZyA6IChvUnVsZS5tYXRjaEluZGV4ICE9PSB1bmRlZmluZWQgJiYgbVtvUnVsZS5tYXRjaEluZGV4XSkgfHwgc3RyaW5nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeSA6IG9SdWxlLmNhdGVnb3J5XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgICBkZWZhdWx0OlxyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInVua25vd24gdHlwZVwiICsgSlNPTi5zdHJpbmdpZnkgKG9SdWxlLHVuZGVmaW5lZCwgMikpXHJcbiAgICB9XHJcbiAgfSk7XHJcbiAgICByZXR1cm4gcmVzO1xyXG59XHJcbi8qKlxyXG4gKlxyXG4gKiBPcHRpb25zIG1heSBiZSB7XHJcbiAqIG1hdGNob3RoZXJzIDogdHJ1ZSwgID0+IG9ubHkgcnVsZXMgd2hlcmUgYWxsIG90aGVycyBtYXRjaCBhcmUgY29uc2lkZXJlZFxyXG4gKiBhdWdtZW50IDogdHJ1ZSxcclxuICogb3ZlcnJpZGUgOiB0cnVlIH0gID0+XHJcbiAqXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hXb3JkKG9SdWxlIDogSVJ1bGUsIGNvbnRleHQgOiBJRk1hdGNoLmNvbnRleHQsIG9wdGlvbnMgPyA6IElNYXRjaE9wdGlvbnMpIHtcclxuICBpZiAoY29udGV4dFtvUnVsZS5rZXldID09PSB1bmRlZmluZWQpIHtcclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgfVxyXG4gIHZhciBzMSA9IGNvbnRleHRbb1J1bGUua2V5XS50b0xvd2VyQ2FzZSgpXHJcbiAgdmFyIHMyID0gb1J1bGUud29yZC50b0xvd2VyQ2FzZSgpO1xyXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XHJcbiAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCxvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpXHJcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XHJcbiAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKXtcclxuICAgIHJldHVybiB1bmRlZmluZWRcclxuICB9XHJcbiAgdmFyIGMgOiBudW1iZXIgPSBjYWxjRGlzdGFuY2UoczIsIHMxKTtcclxuICAgZGVidWdsb2coXCIgczEgPD4gczIgXCIgKyBzMSArIFwiPD5cIiArIHMyICsgXCIgID0+OiBcIiArIGMpO1xyXG4gIGlmKGMgPCAxNTAgKSB7XHJcbiAgICB2YXIgcmVzID0gT2JqZWN0LmFzc2lnbih7fSwgb1J1bGUuZm9sbG93cykgYXMgYW55O1xyXG4gICAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIGNvbnRleHQpO1xyXG4gICAgaWYgKG9wdGlvbnMub3ZlcnJpZGUpIHtcclxuICAgICAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xyXG4gICAgfVxyXG4gICAgLy8gZm9yY2Uga2V5IHByb3BlcnR5XHJcbiAgICAvLyBjb25zb2xlLmxvZygnIG9iamVjdGNhdGVnb3J5JywgcmVzWydzeXN0ZW1PYmplY3RDYXRlZ29yeSddKTtcclxuICAgIHJlc1tvUnVsZS5rZXldID0gb1J1bGUuZm9sbG93c1tvUnVsZS5rZXldIHx8IHJlc1tvUnVsZS5rZXldO1xyXG4gICAgcmVzLl93ZWlnaHQgPSBPYmplY3QuYXNzaWduKHt9LCByZXMuX3dlaWdodCk7XHJcbiAgICByZXMuX3dlaWdodFtvUnVsZS5rZXldID0gYztcclxuICAgIE9iamVjdC5mcmVlemUocmVzKTtcclxuICAgIGRlYnVnbG9nKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLHVuZGVmaW5lZCwyKSk7XHJcbiAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuICByZXR1cm4gdW5kZWZpbmVkO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEFyZ3NNYXAobWF0Y2ggOiBBcnJheTxzdHJpbmc+ICwgYXJnc01hcCA6IHsgW2tleSA6IG51bWJlcl0gOiBzdHJpbmd9KSA6IElGTWF0Y2guY29udGV4dCB7XHJcbiAgdmFyIHJlcyA9IHt9IGFzIElGTWF0Y2guY29udGV4dDtcclxuICBpZiAoIWFyZ3NNYXApIHtcclxuICAgIHJldHVybiByZXM7XHJcbiAgfVxyXG4gIE9iamVjdC5rZXlzKGFyZ3NNYXApLmZvckVhY2goZnVuY3Rpb24oaUtleSkge1xyXG4gICAgICB2YXIgdmFsdWUgPSBtYXRjaFtpS2V5XVxyXG4gICAgICB2YXIga2V5ID0gYXJnc01hcFtpS2V5XTtcclxuICAgICAgaWYgKCh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpICYmIHZhbHVlLmxlbmd0aCA+IDApIHtcclxuICAgICAgICByZXNba2V5XSA9IHZhbHVlXHJcbiAgICAgIH1cclxuICAgIH1cclxuICApO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFJlZ0V4cChvUnVsZSA6IElSdWxlLCBjb250ZXh0IDogSUZNYXRjaC5jb250ZXh0LCBvcHRpb25zID8gOiBJTWF0Y2hPcHRpb25zKSB7XHJcbiAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICB2YXIgc0tleSA9IG9SdWxlLmtleTtcclxuICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKVxyXG4gIHZhciByZWcgPSBvUnVsZS5yZWdleHA7XHJcblxyXG4gIHZhciBtID0gcmVnLmV4ZWMoczEpO1xyXG4gIGRlYnVnbG9nKFwiYXBwbHlpbmcgcmVnZXhwOiBcIiArIHMxICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XHJcbiAgaWYgKCFtKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxyXG4gIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KVxyXG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlbHRhKSk7XHJcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkob3B0aW9ucykpO1xyXG4gIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSl7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkXHJcbiAgfVxyXG4gIHZhciBvRXh0cmFjdGVkQ29udGV4dCA9IGV4dHJhY3RBcmdzTWFwKG0sIG9SdWxlLmFyZ3NNYXAgKTtcclxuICBkZWJ1Z2xvZyhcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUuYXJnc01hcCkpO1xyXG4gIGRlYnVnbG9nKFwibWF0Y2ggXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XHJcblxyXG4gIGRlYnVnbG9nKFwiZXh0cmFjdGVkIGFyZ3MgXCIgKyBKU09OLnN0cmluZ2lmeShvRXh0cmFjdGVkQ29udGV4dCkpO1xyXG4gIHZhciByZXMgPSBPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKSBhcyBhbnk7XHJcbiAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIG9FeHRyYWN0ZWRDb250ZXh0KTtcclxuICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgY29udGV4dCk7XHJcbiAgaWYgKG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldICE9PSB1bmRlZmluZWQpIHtcclxuICAgIHJlc1tzS2V5XSA9IG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldO1xyXG4gIH1cclxuICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xyXG4gICAgIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBvUnVsZS5mb2xsb3dzKTtcclxuICAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpXHJcbiAgfVxyXG4gIE9iamVjdC5mcmVlemUocmVzKTtcclxuICBkZWJ1Z2xvZygnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcyx1bmRlZmluZWQsMikpO1xyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzb3J0QnlXZWlnaHQoc0tleSA6IHN0cmluZywgb0NvbnRleHRBIDogSUZNYXRjaC5jb250ZXh0LCBvQ29udGV4dEIgOiBJRk1hdGNoLmNvbnRleHQpICA6IG51bWJlcntcclxuICBkZWJ1Z2xvZygnc29ydGluZzogJyArIHNLZXkgKyAnaW52b2tlZCB3aXRoXFxuIDE6JyArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QSx1bmRlZmluZWQsMikrXHJcbiAgIFwiIHZzIFxcbiAyOlwiICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHRCLHVuZGVmaW5lZCwyKSk7XHJcbiAgdmFyIHJhbmtpbmdBIDogbnVtYmVyID0gIHBhcnNlRmxvYXQob0NvbnRleHRBW1wiX3JhbmtpbmdcIl0gfHwgXCIxXCIpO1xyXG4gIHZhciByYW5raW5nQiA6IG51bWJlciAgPSBwYXJzZUZsb2F0KG9Db250ZXh0QltcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcclxuICBpZiAocmFua2luZ0EgIT09IHJhbmtpbmdCKSB7XHJcbiAgICBkZWJ1Z2xvZyhcIiByYW5raW4gZGVsdGFcIiArIDEwMCoocmFua2luZ0IgLSByYW5raW5nQSkpO1xyXG4gICAgcmV0dXJuIDEwMCoocmFua2luZ0IgLSByYW5raW5nQSlcclxuICB9XHJcblxyXG4gIHZhciB3ZWlnaHRBID0gb0NvbnRleHRBW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdW3NLZXldICB8fCAwO1xyXG4gIHZhciB3ZWlnaHRCID0gb0NvbnRleHRCW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdW3NLZXldICB8fCAwO1xyXG4gIHJldHVybiArKHdlaWdodEEgLSB3ZWlnaHRCKTtcclxufVxyXG5cclxuXHJcbi8vIFdvcmQsIFN5bm9ueW0sIFJlZ2V4cCAvIEV4dHJhY3Rpb25SdWxlXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXVnbWVudENvbnRleHQxKCBjb250ZXh0IDogSUZNYXRjaC5jb250ZXh0LCBvUnVsZXMgOiBBcnJheTxJUnVsZT4sIG9wdGlvbnMgOiBJTWF0Y2hPcHRpb25zKSA6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIHZhciBzS2V5ID0gb1J1bGVzWzBdLmtleTtcclxuICAvLyBjaGVjayB0aGF0IHJ1bGVcclxuICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgLy8gY2hlY2sgY29uc2lzdGVuY3lcclxuICAgIG9SdWxlcy5ldmVyeShmdW5jdGlvbiAoaVJ1bGUpIHtcclxuICAgICAgaWYgKGlSdWxlLmtleSAhPT0gc0tleSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkluaG9tb2dlbm91cyBrZXlzIGluIHJ1bGVzLCBleHBlY3RlZCBcIiArIHNLZXkgKyBcIiB3YXMgXCIgKyBKU09OLnN0cmluZ2lmeShpUnVsZSkpO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvLyBsb29rIGZvciBydWxlcyB3aGljaCBtYXRjaFxyXG4gIHZhciByZXMgPSBvUnVsZXMubWFwKGZ1bmN0aW9uKG9SdWxlKSB7XHJcbiAgICAvLyBpcyB0aGlzIHJ1bGUgYXBwbGljYWJsZVxyXG4gICAgc3dpdGNoKG9SdWxlLnR5cGUpIHtcclxuICAgICAgY2FzZSBJRk1hdGNoLkVudW1SdWxlVHlwZS5XT1JEOlxyXG4gICAgICAgIHJldHVybiBtYXRjaFdvcmQob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpXHJcbiAgICAgIGNhc2UgSUZNYXRjaC5FbnVtUnVsZVR5cGUuUkVHRVhQOlxyXG4gICAgICAgIHJldHVybiBtYXRjaFJlZ0V4cChvUnVsZSwgY29udGV4dCwgb3B0aW9ucyk7XHJcbiAgIC8vICAgY2FzZSBcIkV4dHJhY3Rpb25cIjpcclxuICAgLy8gICAgIHJldHVybiBtYXRjaEV4dHJhY3Rpb24ob1J1bGUsY29udGV4dCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkXHJcbiAgfSkuZmlsdGVyKGZ1bmN0aW9uKG9yZXMpIHtcclxuICAgIHJldHVybiAhIW9yZXNcclxuICB9KS5zb3J0KFxyXG4gICAgc29ydEJ5V2VpZ2h0LmJpbmQodGhpcywgc0tleSlcclxuICApO1xyXG4gIHJldHVybiByZXM7XHJcbiAgLy8gT2JqZWN0LmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XHJcbiAgLy8gfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhdWdtZW50Q29udGV4dCggY29udGV4dCA6IElGTWF0Y2guY29udGV4dCwgYVJ1bGVzIDogQXJyYXk8SVJ1bGU+KSA6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG5cclxudmFyIG9wdGlvbnMxIDogSU1hdGNoT3B0aW9ucyA9IHtcclxuICAgIG1hdGNob3RoZXJzIDogdHJ1ZSxcclxuICAgIG92ZXJyaWRlOiBmYWxzZVxyXG4gIH0gYXMgSU1hdGNoT3B0aW9ucztcclxuXHJcbiAgdmFyIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCxhUnVsZXMsb3B0aW9uczEpXHJcblxyXG4gIGlmIChhUmVzLmxlbmd0aCA9PT0gMCkgIHtcclxuICAgIHZhciBvcHRpb25zMiA6IElNYXRjaE9wdGlvbnMgPSB7XHJcbiAgICAgICAgbWF0Y2hvdGhlcnMgOiBmYWxzZSxcclxuICAgICAgICBvdmVycmlkZTogdHJ1ZVxyXG4gICAgfSBhcyBJTWF0Y2hPcHRpb25zO1xyXG4gICAgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMyKTtcclxuICB9XHJcbiAgcmV0dXJuIGFSZXM7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBpbnNlcnRPcmRlcmVkKHJlc3VsdCA6IEFycmF5PElGTWF0Y2guY29udGV4dD4sIGlJbnNlcnRlZE1lbWJlciA6IElGTWF0Y2guY29udGV4dCwgbGltaXQgOiBudW1iZXIpIDogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgLy8gVE9ETzogdXNlIHNvbWUgd2VpZ2h0XHJcbiAgaWYgKHJlc3VsdC5sZW5ndGggPCBsaW1pdCkge1xyXG4gICAgcmVzdWx0LnB1c2goaUluc2VydGVkTWVtYmVyKVxyXG4gIH1cclxuICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHRha2VUb3BOKGFyciA6IEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+KTogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgdmFyIHUgPSBhcnIuZmlsdGVyKGZ1bmN0aW9uKGlubmVyQXJyKSB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwfSlcclxuXHJcbiAgdmFyIHJlcyA9W107XHJcbiAgLy8gc2hpZnQgb3V0IHRoZSB0b3Agb25lc1xyXG4gIHUgPSB1Lm1hcChmdW5jdGlvbihpQXJyKSB7XHJcbiAgICB2YXIgdG9wID0gaUFyci5zaGlmdCgpO1xyXG4gICAgcmVzID0gaW5zZXJ0T3JkZXJlZChyZXMsdG9wLDUpXHJcbiAgICByZXR1cm4gaUFyclxyXG4gIH0pLmZpbHRlcihmdW5jdGlvbihpbm5lckFycjogQXJyYXk8SUZNYXRjaC5jb250ZXh0PikgOiBib29sZWFuIHsgcmV0dXJuIGlubmVyQXJyLmxlbmd0aCA+IDB9KTtcclxuICAvLyBhcyBBcnJheTxBcnJheTxJRk1hdGNoLmNvbnRleHQ+PlxyXG4gIHJldHVybiByZXM7XHJcbn1cclxuXHJcbmltcG9ydCAqIGFzIGlucHV0RmlsdGVyUnVsZXMgZnJvbSAnLi9pbnB1dEZpbHRlclJ1bGVzJztcclxuXHJcbnZhciBybTtcclxuXHJcbmZ1bmN0aW9uIGdldFJNT25jZSgpIHtcclxuICBpZiAoIXJtKSB7XHJcbiAgICBybSA9IGlucHV0RmlsdGVyUnVsZXMuZ2V0UnVsZU1hcCgpXHJcbiAgfVxyXG4gIHJldHVybiBybTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UnVsZXMoY29udGV4dCA6IElGTWF0Y2guY29udGV4dCkgOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICB2YXIgYmVzdE4gOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+ID0gW2NvbnRleHRdO1xyXG4gIGlucHV0RmlsdGVyUnVsZXMub0tleU9yZGVyLmZvckVhY2goZnVuY3Rpb24gKHNLZXkgOiBzdHJpbmcpIHtcclxuICAgICB2YXIgYmVzdE5leHQ6IEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+ID0gW107XHJcbiAgICAgYmVzdE4uZm9yRWFjaChmdW5jdGlvbihvQ29udGV4dCA6IElGTWF0Y2guY29udGV4dCkge1xyXG4gICAgICAgaWYgKG9Db250ZXh0W3NLZXldKSB7XHJcbiAgICAgICAgICBkZWJ1Z2xvZygnKiogYXBwbHlpbmcgcnVsZXMgZm9yICcgKyBzS2V5KVxyXG4gICAgICAgICAgdmFyIHJlcyA9IGF1Z21lbnRDb250ZXh0KG9Db250ZXh0LCBnZXRSTU9uY2UoKVtzS2V5XSB8fCBbXSlcclxuICAgICAgICAgIGRlYnVnbG9nKCcqKiByZXN1bHQgZm9yICcgKyBzS2V5ICsgJyA9ICcgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpXHJcbiAgICAgICAgICBiZXN0TmV4dC5wdXNoKHJlcyB8fCBbXSlcclxuICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgIC8vIHJ1bGUgbm90IHJlbGV2YW50XHJcbiAgICAgICAgIGJlc3ROZXh0LnB1c2goW29Db250ZXh0XSk7XHJcbiAgICAgICB9XHJcbiAgICB9KVxyXG4gICAgYmVzdE4gPSB0YWtlVG9wTihiZXN0TmV4dCk7XHJcbiAgfSk7XHJcbiAgcmV0dXJuIGJlc3ROXHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlSdWxlc1BpY2tGaXJzdChjb250ZXh0IDogSUZNYXRjaC5jb250ZXh0KSA6IElGTWF0Y2guY29udGV4dCB7XHJcbiAgdmFyIHIgPSBhcHBseVJ1bGVzKGNvbnRleHQpO1xyXG4gIHJldHVybiByICYmIHJbMF07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZWNpZGUgd2hldGhlciB0byByZXF1ZXJ5IGZvciBhIGNvbnRldFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGRlY2lkZU9uUmVRdWVyeSggY29udGV4dCA6IElGTWF0Y2guY29udGV4dCkgOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICByZXR1cm4gW11cclxufVxyXG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vbGliL25vZGUtNC5kLnRzXCIgLz5cblwidXNlIHN0cmljdFwiO1xuLyoqXG4gKiB0aGUgaW5wdXQgZmlsdGVyIHN0YWdlIHByZXByb2Nlc3NlcyBhIGN1cnJlbnQgY29udGV4dFxuICpcbiAqIEl0IGEpIGNvbWJpbmVzIG11bHRpLXNlZ21lbnQgYXJndW1lbnRzIGludG8gb25lIGNvbnRleHQgbWVtYmVyc1xuICogSXQgYikgYXR0ZW1wdHMgdG8gYXVnbWVudCB0aGUgY29udGV4dCBieSBhZGRpdGlvbmFsIHF1YWxpZmljYXRpb25zXG4gKiAgICAgICAgICAgKE1pZCB0ZXJtIGdlbmVyYXRpbmcgQWx0ZXJuYXRpdmVzLCBlLmcuXG4gKiAgICAgICAgICAgICAgICAgQ2xpZW50U2lkZVRhcmdldFJlc29sdXRpb24gLT4gdW5pdCB0ZXN0P1xuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHNvdXJjZSA/XG4gKiAgICAgICAgICAgKVxuICogIFNpbXBsZSBydWxlcyBsaWtlICBJbnRlbnRcbiAqXG4gKlxuICogQG1vZHVsZVxuICogQGZpbGUgaW5wdXRGaWx0ZXIudHNcbiAqL1xuY29uc3QgZGlzdGFuY2UgPSByZXF1aXJlKCcuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4nKTtcbmNvbnN0IGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKTtcbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ2lucHV0RmlsdGVyJyk7XG5jb25zdCBtYXRjaGRhdGEgPSByZXF1aXJlKCcuL21hdGNoZGF0YScpO1xudmFyIG9Vbml0VGVzdHMgPSBtYXRjaGRhdGEub1VuaXRUZXN0cztcbi8qKlxuICogQHBhcmFtIHNUZXh0IHtzdHJpbmd9IHRoZSB0ZXh0IHRvIG1hdGNoIHRvIE5hdlRhcmdldFJlc29sdXRpb25cbiAqIEBwYXJhbSBzVGV4dDIge3N0cmluZ30gdGhlIHF1ZXJ5IHRleHQsIGUuZy4gTmF2VGFyZ2V0XG4gKlxuICogQHJldHVybiB0aGUgZGlzdGFuY2UsIG5vdGUgdGhhdCBpcyBpcyAqbm90KiBzeW1tZXRyaWMhXG4gKi9cbmZ1bmN0aW9uIGNhbGNEaXN0YW5jZShzVGV4dDEsIHNUZXh0Mikge1xuICAgIC8vIGNvbnNvbGUubG9nKFwibGVuZ3RoMlwiICsgc1RleHQxICsgXCIgLSBcIiArIHNUZXh0MilcbiAgICB2YXIgYTAgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEuc3Vic3RyaW5nKDAsIHNUZXh0Mi5sZW5ndGgpLCBzVGV4dDIpO1xuICAgIHZhciBhID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnRvTG93ZXJDYXNlKCksIHNUZXh0Mik7XG4gICAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGE7XG59XG5jb25zdCBJRk1hdGNoID0gcmVxdWlyZSgnLi4vbWF0Y2gvaWZtYXRjaCcpO1xuZnVuY3Rpb24gbm9uUHJpdmF0ZUtleXMob0EpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMob0EpLmZpbHRlcihrZXkgPT4ge1xuICAgICAgICByZXR1cm4ga2V5WzBdICE9PSAnXyc7XG4gICAgfSk7XG59XG5mdW5jdGlvbiBjb3VudEFpbkIob0EsIG9CLCBmbkNvbXBhcmUsIGFLZXlJZ25vcmUpIHtcbiAgICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxuICAgICAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xuICAgIGZuQ29tcGFyZSA9IGZuQ29tcGFyZSB8fCBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcbiAgICB9KS5cbiAgICAgICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xuICAgICAgICAgICAgcHJldiA9IHByZXYgKyAoZm5Db21wYXJlKG9BW2tleV0sIG9CW2tleV0sIGtleSkgPyAxIDogMCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG59XG5leHBvcnRzLmNvdW50QWluQiA9IGNvdW50QWluQjtcbmZ1bmN0aW9uIHNwdXJpb3VzQW5vdEluQihvQSwgb0IsIGFLZXlJZ25vcmUpIHtcbiAgICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxuICAgICAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xuICAgIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcbiAgICB9KS5cbiAgICAgICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbn1cbmV4cG9ydHMuc3B1cmlvdXNBbm90SW5CID0gc3B1cmlvdXNBbm90SW5CO1xuZnVuY3Rpb24gbG93ZXJDYXNlKG8pIHtcbiAgICBpZiAodHlwZW9mIG8gPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgcmV0dXJuIG8udG9Mb3dlckNhc2UoKTtcbiAgICB9XG4gICAgcmV0dXJuIG87XG59XG5mdW5jdGlvbiBjb21wYXJlQ29udGV4dChvQSwgb0IsIGFLZXlJZ25vcmUpIHtcbiAgICB2YXIgZXF1YWwgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpID09PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xuICAgIHZhciBkaWZmZXJlbnQgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpICE9PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xuICAgIHZhciBzcHVyaW91c0wgPSBzcHVyaW91c0Fub3RJbkIob0EsIG9CLCBhS2V5SWdub3JlKTtcbiAgICB2YXIgc3B1cmlvdXNSID0gc3B1cmlvdXNBbm90SW5CKG9CLCBvQSwgYUtleUlnbm9yZSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZXF1YWw6IGVxdWFsLFxuICAgICAgICBkaWZmZXJlbnQ6IGRpZmZlcmVudCxcbiAgICAgICAgc3B1cmlvdXNMOiBzcHVyaW91c0wsXG4gICAgICAgIHNwdXJpb3VzUjogc3B1cmlvdXNSXG4gICAgfTtcbn1cbmV4cG9ydHMuY29tcGFyZUNvbnRleHQgPSBjb21wYXJlQ29udGV4dDtcbmZ1bmN0aW9uIGNhdGVnb3JpemVTdHJpbmcoc3RyaW5nLCBleGFjdCwgb1J1bGVzKSB7XG4gICAgLy8gc2ltcGx5IGFwcGx5IGFsbCBydWxlc1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBvUnVsZXMuZm9yRWFjaChmdW5jdGlvbiAob1J1bGUpIHtcbiAgICAgICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlIDAgLyogV09SRCAqLzpcbiAgICAgICAgICAgICAgICBpZiAoZXhhY3QgJiYgb1J1bGUud29yZCA9PT0gc3RyaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogb1J1bGUubWF0Y2hlZFN0cmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBvUnVsZS5jYXRlZ29yeVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFleGFjdCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGV2ZW5tYXRjaCA9IGNhbGNEaXN0YW5jZShvUnVsZS53b3JkLCBzdHJpbmcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobGV2ZW5tYXRjaCA8IDE1MCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0cmluZzogc3RyaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZWRTdHJpbmc6IG9SdWxlLndvcmQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldmVubWF0Y2g6IGxldmVubWF0Y2hcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAxIC8qIFJFR0VYUCAqLzpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KFwiIGhlcmUgcmVnZXhwXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSkpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbSA9IG9SdWxlLnJlZ2V4cC5leGVjKHN0cmluZyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyaW5nOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZFN0cmluZzogKG9SdWxlLm1hdGNoSW5kZXggIT09IHVuZGVmaW5lZCAmJiBtW29SdWxlLm1hdGNoSW5kZXhdKSB8fCBzdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IG9SdWxlLmNhdGVnb3J5XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidW5rbm93biB0eXBlXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZSwgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5jYXRlZ29yaXplU3RyaW5nID0gY2F0ZWdvcml6ZVN0cmluZztcbi8qKlxuICpcbiAqIE9wdGlvbnMgbWF5IGJlIHtcbiAqIG1hdGNob3RoZXJzIDogdHJ1ZSwgID0+IG9ubHkgcnVsZXMgd2hlcmUgYWxsIG90aGVycyBtYXRjaCBhcmUgY29uc2lkZXJlZFxuICogYXVnbWVudCA6IHRydWUsXG4gKiBvdmVycmlkZSA6IHRydWUgfSAgPT5cbiAqXG4gKi9cbmZ1bmN0aW9uIG1hdGNoV29yZChvUnVsZSwgY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChjb250ZXh0W29SdWxlLmtleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgczIgPSBvUnVsZS53b3JkLnRvTG93ZXJDYXNlKCk7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCwgb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcbiAgICBpZiAob3B0aW9ucy5tYXRjaG90aGVycyAmJiAoZGVsdGEuZGlmZmVyZW50ID4gMCkpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIGMgPSBjYWxjRGlzdGFuY2UoczIsIHMxKTtcbiAgICBkZWJ1Z2xvZyhcIiBzMSA8PiBzMiBcIiArIHMxICsgXCI8PlwiICsgczIgKyBcIiAgPT46IFwiICsgYyk7XG4gICAgaWYgKGMgPCAxNTApIHtcbiAgICAgICAgdmFyIHJlcyA9IE9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpO1xuICAgICAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgY29udGV4dCk7XG4gICAgICAgIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XG4gICAgICAgICAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgb1J1bGUuZm9sbG93cyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZm9yY2Uga2V5IHByb3BlcnR5XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCcgb2JqZWN0Y2F0ZWdvcnknLCByZXNbJ3N5c3RlbU9iamVjdENhdGVnb3J5J10pO1xuICAgICAgICByZXNbb1J1bGUua2V5XSA9IG9SdWxlLmZvbGxvd3Nbb1J1bGUua2V5XSB8fCByZXNbb1J1bGUua2V5XTtcbiAgICAgICAgcmVzLl93ZWlnaHQgPSBPYmplY3QuYXNzaWduKHt9LCByZXMuX3dlaWdodCk7XG4gICAgICAgIHJlcy5fd2VpZ2h0W29SdWxlLmtleV0gPSBjO1xuICAgICAgICBPYmplY3QuZnJlZXplKHJlcyk7XG4gICAgICAgIGRlYnVnbG9nKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbmV4cG9ydHMubWF0Y2hXb3JkID0gbWF0Y2hXb3JkO1xuZnVuY3Rpb24gZXh0cmFjdEFyZ3NNYXAobWF0Y2gsIGFyZ3NNYXApIHtcbiAgICB2YXIgcmVzID0ge307XG4gICAgaWYgKCFhcmdzTWFwKSB7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIE9iamVjdC5rZXlzKGFyZ3NNYXApLmZvckVhY2goZnVuY3Rpb24gKGlLZXkpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gbWF0Y2hbaUtleV07XG4gICAgICAgIHZhciBrZXkgPSBhcmdzTWFwW2lLZXldO1xuICAgICAgICBpZiAoKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikgJiYgdmFsdWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmVzW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmV4dHJhY3RBcmdzTWFwID0gZXh0cmFjdEFyZ3NNYXA7XG5mdW5jdGlvbiBtYXRjaFJlZ0V4cChvUnVsZSwgY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChjb250ZXh0W29SdWxlLmtleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgc0tleSA9IG9SdWxlLmtleTtcbiAgICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgcmVnID0gb1J1bGUucmVnZXhwO1xuICAgIHZhciBtID0gcmVnLmV4ZWMoczEpO1xuICAgIGRlYnVnbG9nKFwiYXBwbHlpbmcgcmVnZXhwOiBcIiArIHMxICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XG4gICAgaWYgKCFtKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsIG9SdWxlLmZvbGxvd3MsIG9SdWxlLmtleSk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XG4gICAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBvRXh0cmFjdGVkQ29udGV4dCA9IGV4dHJhY3RBcmdzTWFwKG0sIG9SdWxlLmFyZ3NNYXApO1xuICAgIGRlYnVnbG9nKFwiZXh0cmFjdGVkIGFyZ3MgXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZS5hcmdzTWFwKSk7XG4gICAgZGVidWdsb2coXCJtYXRjaCBcIiArIEpTT04uc3RyaW5naWZ5KG0pKTtcbiAgICBkZWJ1Z2xvZyhcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob0V4dHJhY3RlZENvbnRleHQpKTtcbiAgICB2YXIgcmVzID0gT2JqZWN0LmFzc2lnbih7fSwgb1J1bGUuZm9sbG93cyk7XG4gICAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIG9FeHRyYWN0ZWRDb250ZXh0KTtcbiAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgY29udGV4dCk7XG4gICAgaWYgKG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVzW3NLZXldID0gb0V4dHJhY3RlZENvbnRleHRbc0tleV07XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XG4gICAgICAgIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBvUnVsZS5mb2xsb3dzKTtcbiAgICAgICAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIG9FeHRyYWN0ZWRDb250ZXh0KTtcbiAgICB9XG4gICAgT2JqZWN0LmZyZWV6ZShyZXMpO1xuICAgIGRlYnVnbG9nKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5tYXRjaFJlZ0V4cCA9IG1hdGNoUmVnRXhwO1xuZnVuY3Rpb24gc29ydEJ5V2VpZ2h0KHNLZXksIG9Db250ZXh0QSwgb0NvbnRleHRCKSB7XG4gICAgZGVidWdsb2coJ3NvcnRpbmc6ICcgKyBzS2V5ICsgJ2ludm9rZWQgd2l0aFxcbiAxOicgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEEsIHVuZGVmaW5lZCwgMikgK1xuICAgICAgICBcIiB2cyBcXG4gMjpcIiArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QiwgdW5kZWZpbmVkLCAyKSk7XG4gICAgdmFyIHJhbmtpbmdBID0gcGFyc2VGbG9hdChvQ29udGV4dEFbXCJfcmFua2luZ1wiXSB8fCBcIjFcIik7XG4gICAgdmFyIHJhbmtpbmdCID0gcGFyc2VGbG9hdChvQ29udGV4dEJbXCJfcmFua2luZ1wiXSB8fCBcIjFcIik7XG4gICAgaWYgKHJhbmtpbmdBICE9PSByYW5raW5nQikge1xuICAgICAgICBkZWJ1Z2xvZyhcIiByYW5raW4gZGVsdGFcIiArIDEwMCAqIChyYW5raW5nQiAtIHJhbmtpbmdBKSk7XG4gICAgICAgIHJldHVybiAxMDAgKiAocmFua2luZ0IgLSByYW5raW5nQSk7XG4gICAgfVxuICAgIHZhciB3ZWlnaHRBID0gb0NvbnRleHRBW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdW3NLZXldIHx8IDA7XG4gICAgdmFyIHdlaWdodEIgPSBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QltcIl93ZWlnaHRcIl1bc0tleV0gfHwgMDtcbiAgICByZXR1cm4gKyh3ZWlnaHRBIC0gd2VpZ2h0Qik7XG59XG5leHBvcnRzLnNvcnRCeVdlaWdodCA9IHNvcnRCeVdlaWdodDtcbi8vIFdvcmQsIFN5bm9ueW0sIFJlZ2V4cCAvIEV4dHJhY3Rpb25SdWxlXG5mdW5jdGlvbiBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgb1J1bGVzLCBvcHRpb25zKSB7XG4gICAgdmFyIHNLZXkgPSBvUnVsZXNbMF0ua2V5O1xuICAgIC8vIGNoZWNrIHRoYXQgcnVsZVxuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIC8vIGNoZWNrIGNvbnNpc3RlbmN5XG4gICAgICAgIG9SdWxlcy5ldmVyeShmdW5jdGlvbiAoaVJ1bGUpIHtcbiAgICAgICAgICAgIGlmIChpUnVsZS5rZXkgIT09IHNLZXkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbmhvbW9nZW5vdXMga2V5cyBpbiBydWxlcywgZXhwZWN0ZWQgXCIgKyBzS2V5ICsgXCIgd2FzIFwiICsgSlNPTi5zdHJpbmdpZnkoaVJ1bGUpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8gbG9vayBmb3IgcnVsZXMgd2hpY2ggbWF0Y2hcbiAgICB2YXIgcmVzID0gb1J1bGVzLm1hcChmdW5jdGlvbiAob1J1bGUpIHtcbiAgICAgICAgLy8gaXMgdGhpcyBydWxlIGFwcGxpY2FibGVcbiAgICAgICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlIDAgLyogV09SRCAqLzpcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2hXb3JkKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKTtcbiAgICAgICAgICAgIGNhc2UgMSAvKiBSRUdFWFAgKi86XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hdGNoUmVnRXhwKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0pLmZpbHRlcihmdW5jdGlvbiAob3Jlcykge1xuICAgICAgICByZXR1cm4gISFvcmVzO1xuICAgIH0pLnNvcnQoc29ydEJ5V2VpZ2h0LmJpbmQodGhpcywgc0tleSkpO1xuICAgIHJldHVybiByZXM7XG4gICAgLy8gT2JqZWN0LmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgLy8gfSk7XG59XG5leHBvcnRzLmF1Z21lbnRDb250ZXh0MSA9IGF1Z21lbnRDb250ZXh0MTtcbmZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0KGNvbnRleHQsIGFSdWxlcykge1xuICAgIHZhciBvcHRpb25zMSA9IHtcbiAgICAgICAgbWF0Y2hvdGhlcnM6IHRydWUsXG4gICAgICAgIG92ZXJyaWRlOiBmYWxzZVxuICAgIH07XG4gICAgdmFyIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMSk7XG4gICAgaWYgKGFSZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHZhciBvcHRpb25zMiA9IHtcbiAgICAgICAgICAgIG1hdGNob3RoZXJzOiBmYWxzZSxcbiAgICAgICAgICAgIG92ZXJyaWRlOiB0cnVlXG4gICAgICAgIH07XG4gICAgICAgIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMik7XG4gICAgfVxuICAgIHJldHVybiBhUmVzO1xufVxuZXhwb3J0cy5hdWdtZW50Q29udGV4dCA9IGF1Z21lbnRDb250ZXh0O1xuZnVuY3Rpb24gaW5zZXJ0T3JkZXJlZChyZXN1bHQsIGlJbnNlcnRlZE1lbWJlciwgbGltaXQpIHtcbiAgICAvLyBUT0RPOiB1c2Ugc29tZSB3ZWlnaHRcbiAgICBpZiAocmVzdWx0Lmxlbmd0aCA8IGxpbWl0KSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKGlJbnNlcnRlZE1lbWJlcik7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5leHBvcnRzLmluc2VydE9yZGVyZWQgPSBpbnNlcnRPcmRlcmVkO1xuZnVuY3Rpb24gdGFrZVRvcE4oYXJyKSB7XG4gICAgdmFyIHUgPSBhcnIuZmlsdGVyKGZ1bmN0aW9uIChpbm5lckFycikgeyByZXR1cm4gaW5uZXJBcnIubGVuZ3RoID4gMDsgfSk7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIC8vIHNoaWZ0IG91dCB0aGUgdG9wIG9uZXNcbiAgICB1ID0gdS5tYXAoZnVuY3Rpb24gKGlBcnIpIHtcbiAgICAgICAgdmFyIHRvcCA9IGlBcnIuc2hpZnQoKTtcbiAgICAgICAgcmVzID0gaW5zZXJ0T3JkZXJlZChyZXMsIHRvcCwgNSk7XG4gICAgICAgIHJldHVybiBpQXJyO1xuICAgIH0pLmZpbHRlcihmdW5jdGlvbiAoaW5uZXJBcnIpIHsgcmV0dXJuIGlubmVyQXJyLmxlbmd0aCA+IDA7IH0pO1xuICAgIC8vIGFzIEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMudGFrZVRvcE4gPSB0YWtlVG9wTjtcbmNvbnN0IGlucHV0RmlsdGVyUnVsZXMgPSByZXF1aXJlKCcuL2lucHV0RmlsdGVyUnVsZXMnKTtcbnZhciBybTtcbmZ1bmN0aW9uIGdldFJNT25jZSgpIHtcbiAgICBpZiAoIXJtKSB7XG4gICAgICAgIHJtID0gaW5wdXRGaWx0ZXJSdWxlcy5nZXRSdWxlTWFwKCk7XG4gICAgfVxuICAgIHJldHVybiBybTtcbn1cbmZ1bmN0aW9uIGFwcGx5UnVsZXMoY29udGV4dCkge1xuICAgIHZhciBiZXN0TiA9IFtjb250ZXh0XTtcbiAgICBpbnB1dEZpbHRlclJ1bGVzLm9LZXlPcmRlci5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgICAgIHZhciBiZXN0TmV4dCA9IFtdO1xuICAgICAgICBiZXN0Ti5mb3JFYWNoKGZ1bmN0aW9uIChvQ29udGV4dCkge1xuICAgICAgICAgICAgaWYgKG9Db250ZXh0W3NLZXldKSB7XG4gICAgICAgICAgICAgICAgZGVidWdsb2coJyoqIGFwcGx5aW5nIHJ1bGVzIGZvciAnICsgc0tleSk7XG4gICAgICAgICAgICAgICAgdmFyIHJlcyA9IGF1Z21lbnRDb250ZXh0KG9Db250ZXh0LCBnZXRSTU9uY2UoKVtzS2V5XSB8fCBbXSk7XG4gICAgICAgICAgICAgICAgZGVidWdsb2coJyoqIHJlc3VsdCBmb3IgJyArIHNLZXkgKyAnID0gJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgICAgICAgICAgYmVzdE5leHQucHVzaChyZXMgfHwgW10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gcnVsZSBub3QgcmVsZXZhbnRcbiAgICAgICAgICAgICAgICBiZXN0TmV4dC5wdXNoKFtvQ29udGV4dF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgYmVzdE4gPSB0YWtlVG9wTihiZXN0TmV4dCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGJlc3ROO1xufVxuZXhwb3J0cy5hcHBseVJ1bGVzID0gYXBwbHlSdWxlcztcbmZ1bmN0aW9uIGFwcGx5UnVsZXNQaWNrRmlyc3QoY29udGV4dCkge1xuICAgIHZhciByID0gYXBwbHlSdWxlcyhjb250ZXh0KTtcbiAgICByZXR1cm4gciAmJiByWzBdO1xufVxuZXhwb3J0cy5hcHBseVJ1bGVzUGlja0ZpcnN0ID0gYXBwbHlSdWxlc1BpY2tGaXJzdDtcbi8qKlxuICogRGVjaWRlIHdoZXRoZXIgdG8gcmVxdWVyeSBmb3IgYSBjb250ZXRcbiAqL1xuZnVuY3Rpb24gZGVjaWRlT25SZVF1ZXJ5KGNvbnRleHQpIHtcbiAgICByZXR1cm4gW107XG59XG5leHBvcnRzLmRlY2lkZU9uUmVRdWVyeSA9IGRlY2lkZU9uUmVRdWVyeTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
