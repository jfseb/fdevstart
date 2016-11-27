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
function calcDistance(sText1, sText2) {
    // console.log("length2" + sText1 + " - " + sText2)
    var a0 = distance.levenshtein(sText1.substring(0, sText2.length), sText2);
    var a = distance.levenshtein(sText1.toLowerCase(), sText2);
    return a0 * 500 / sText2.length + a;
}
function fnFindMatch(sKeyword, oContext, oMap) {
    // return a better context if there is a match
    oMap.sort(function (oEntry1, oEntry2) {
        var u1 = calcDistance(oEntry1.key.toLowerCase(), sKeyword);
        var u2 = calcDistance(oEntry2.key.toLowerCase(), sKeyword);
        return u1 - u2;
    });
    // later: in case of conflicts, ask,
    // now:
    var dist = calcDistance(oMap[0].key.toLowerCase(), sKeyword);
    debuglog('best dist' + dist + ' /  ' + dist * sKeyword.length + ' ' + sKeyword);
    if (dist < 150) {
        var o1 = Object.assign({}, oContext);
        var o2;
        o1.context = Object.assign({}, o1.context);
        o2 = o1;
        o2.context = Object.assign(o1.context, oMap[0].context);
        return o2;
    }
    return null;
}
/**
 * a function to match a unit test using levenshtein distances
 * @public
 */
function fnFindUnitTest(ssystemObjectId, oContext) {
    return fnFindMatch(ssystemObjectId, oContext, oUnitTests);
}
(function (EnumRuleType) {
    EnumRuleType[EnumRuleType["WORD"] = 0] = "WORD";
    EnumRuleType[EnumRuleType["REGEXP"] = 1] = "REGEXP";
})(exports.EnumRuleType || (exports.EnumRuleType = {}));
var EnumRuleType = exports.EnumRuleType;
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
function applyRules(context) {
    var bestN = [context];
    inputFilterRules.oKeyOrder.forEach(function (sKey) {
        var bestNext = [];
        bestN.forEach(function (oContext) {
            if (oContext[sKey]) {
                debuglog('** applying rules for ' + sKey);
                var res = augmentContext(oContext, inputFilterRules.oRuleMap[sKey] || []);
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
var aShowEntityActions = [{
    context: {
        systemId: 'uv2',
        client: /^\d{3,3}$/,
        systemtype: 'ABAPFES',
        systemObjectId: 'flp'
    },
    result: {
        type: 'URL',
        pattern: 'https://ldciuv2.wdf.sap.corp:44355/sap/bc/ui5_ui5/ui2/ushell/shells/abap/FioriLaunchpad.html?sap-client={client}'
    }
}, {
    context: {
        systemId: 'uv2',
        client: /^\d{3,3}$/,
        systemtype: 'ABAPFES',
        systemObjectId: 'flpd'
    },
    result: {
        type: 'URL',
        pattern: 'https://ldciuv2.wdf.sap.corp:44355/sap/bc/ui5_ui5/sap/arsrvc_upb_admn/main.html?sap-client={client}'
    }
}, {
    context: {
        systemId: 'u1y',
        client: /^\d{3,3}$/,
        systemtype: 'ABAPFES',
        systemObjectId: 'flp'
    },
    result: {
        type: 'URL',
        pattern: 'https://ldciu1y.wdf.sap.corp:44355/sap/bc/ui5_ui5/ui2/ushell/shells/abap/FioriLaunchpad.html?sap-client={client}'
    }
}, {
    context: {
        systemId: 'u1y',
        client: /^\d{3,3}$/,
        systemtype: 'ABAPFES',
        systemObjectId: 'flpd'
    },
    result: {
        type: 'URL',
        pattern: 'https://ldciu1y.wdf.sap.corp:44355/sap/bc/ui5_ui5/sap/arsrvc_upb_admn/main.html?sap-client={client}'
    }
}, {
    context: {
        systemId: 'uv2',
        client: '120',
        systemObjectCategory: 'catalog',
        systemObjectId: /.*/,
        systemtype: 'ABAPFES',
        tool: 'FLPD'
    },
    result: {
        type: 'URL',
        pattern: 'https://ldciuv2.wdf.sap.corp:44355/sap/bc/ui5_ui5/sap/arsrvc_upb_admn/main.html?sap-client={client}#CATALOG:{systemObjectId}'
    }
}, {
    context: {
        systemObjectCategory: 'unit',
        systemObjectId: fnFindUnitTest
    },
    result: {
        type: 'URL',
        pattern: 'http://localhost:8080/{path}'
    }
}, {
    context: {
        systemObjectCategory: 'wiki'
    },
    result: {
        type: 'URL',
        pattern: 'https://wiki.wdf.sap.corp/{path}'
    }
}, {
    context: {
        systemId: 'JIRA'
    },
    result: {
        type: 'URL',
        pattern: 'https://jira.wdf.sap.corp:8080/TIPCOREUIII'
    }
}];
// if TOOL = JIRA || SystemId = JIRA -> SystemId = JIRA
//
//
// startSAPGUI
//   N:\>"c:\Program Files (x86)\SAP\FrontEnd\SAPgui"\sapshcut.exe  -system=UV2 -client=120 -command=SE38 -type=Transaction -user=AUSER
function expandParametersInURL(oMergedContextResult) {
    var ptn = oMergedContextResult.result.pattern;
    Object.keys(oMergedContextResult.context).forEach(function (sKey) {
        var regex = new RegExp('{' + sKey + '}', 'g');
        ptn = ptn.replace(regex, oMergedContextResult.context[sKey]);
        ptn = ptn.replace(regex, oMergedContextResult.context[sKey]);
    });
    return ptn;
}
function nrMatches(aObject, oContext) {
    return Object.keys(aObject).reduce(function (prev, key) {
        if (Object.prototype.hasOwnProperty.call(oContext, key)) {
            prev = prev + 1;
        }
        return prev;
    }, 0);
}
function nrNoMatches(aObject, oContext) {
    var noMatchA = Object.keys(aObject).reduce(function (prev, key) {
        if (!Object.prototype.hasOwnProperty.call(oContext, key)) {
            prev = prev + 1;
        }
        return prev;
    }, 0);
    var noMatchB = Object.keys(oContext).reduce(function (prev, key) {
        if (!Object.prototype.hasOwnProperty.call(aObject, key)) {
            prev = prev + 1;
        }
        return prev;
    }, 0);
    return noMatchA + noMatchB;
}
function sameOrStar(s1, s2, oEntity) {
    return s1 === s2 || s1 === undefined && s2 === null || s2 instanceof RegExp && s2.exec(s1) !== null || typeof s2 === 'function' && s1 && s2(s1, oEntity);
}
function sameOrStarEmpty(s1, s2, oEntity) {
    if (s1 === undefined && s2 === undefined) {
        return true;
    }
    if (s2 === undefined) {
        return true;
    }
    return s1 === s2 || s2 instanceof RegExp && s2.exec(s1) !== null || typeof s2 === 'function' && s1 && s2(s1, oEntity);
}
function filterShowEntity(oContext, aShowEntity) {
    var aFiltered;
    Object.keys(oContext).forEach(function (sKey) {
        if (oContext[sKey] === null) {
            oContext[sKey] = undefined;
        }
    });
    aFiltered = aShowEntity.filter(function (oShowEntity) {
        //       console.log("...")
        //      console.log(oShowEntity.context.tool + " " + oContext.tool + "\n")
        //      console.log(oShowEntity.context.client + " " + oContext.client +":" + sameOrStar(oContext.client,oShowEntity.context.client) + "\n")
        //  console.log(JSON.stringify(oShowEntity.context) + "\n" + JSON.stringify(oContext.client) + "\n")
        return sameOrStar(oShowEntity.context.systemId, oContext.systemId, oContext) && sameOrStar(oContext.tool, oShowEntity.context.tool, oContext) && sameOrStar(oContext.client, oShowEntity.context.client, oContext) && sameOrStarEmpty(oContext.systemObjectCategory, oShowEntity.context.systemObjectCategory, oContext) && sameOrStarEmpty(oContext.systemObjectId, oShowEntity.context.systemObjectId, oContext);
        //      && oShowEntity.context.tool === oContext.tool
    });
    //  console.log(aFiltered.length)
    // match other context parameters
    aFiltered.sort(function (a, b) {
        var nrMatchesA = nrMatches(a.context, oContext);
        var nrMatchesB = nrMatches(b.context, oContext);
        var nrNoMatchesA = nrNoMatches(a.context, oContext);
        var nrNoMatchesB = nrNoMatches(b.context, oContext);
        //   console.log(JSON.stringify(a.context))
        //   console.log(JSON.stringify(b.context))
        //   console.log(JSON.stringify(oContext))
        var res = -(nrMatchesA - nrMatchesB) * 100 + (nrNoMatchesA - nrNoMatchesB);
        //     console.log("diff " + res)
        return res;
    });
    if (aFiltered.length === 0) {
        debuglog('no target for showEntity ' + JSON.stringify(oContext));
    }
    // console.log(JSON.stringify(aFiltered,undefined,2))
    if (aFiltered[0]) {
        // execute all functions
        var oMatch = aFiltered[0];
        var oMerged = {
            context: {}
        };
        oMerged.context = Object.assign({}, oMerged.context, aFiltered[0].context, oContext);
        oMerged = Object.assign(oMerged, {
            result: aFiltered[0].result
        });
        Object.keys(oMatch.context).forEach(function (sKey) {
            if (typeof oMatch.context[sKey] === 'function') {
                debuglog('Now retrofitting :' + sKey + ' - ' + oContext[sKey]);
                oMerged = oMatch.context[sKey](oContext[sKey], oMerged);
            }
        });
        return oMerged;
    }
    return null;
}
// E:\projects\nodejs\botbuilder\samplebot>"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --incognito -url www.spiegel.de
exports.ab = {
    _test: {
        sameOrStar: sameOrStar,
        nrMatches: nrMatches,
        nrNoMatches: nrNoMatches,
        expandParametersInURL: expandParametersInURL,
        filterShowEntity: filterShowEntity,
        fnFindUnitTest: fnFindUnitTest,
        calcDistance: calcDistance,
        _aShowEntityActions: aShowEntityActions
    }
};
//exports dispatcher;
//module.exports = dispatcher
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9pbnB1dEZpbHRlci50cyIsIm1hdGNoL2lucHV0RmlsdGVyLmpzIl0sIm5hbWVzIjpbImRpc3RhbmNlIiwicmVxdWlyZSIsImRlYnVnIiwiZGVidWdsb2ciLCJtYXRjaGRhdGEiLCJvVW5pdFRlc3RzIiwiY2FsY0Rpc3RhbmNlIiwic1RleHQxIiwic1RleHQyIiwiYTAiLCJsZXZlbnNodGVpbiIsInN1YnN0cmluZyIsImxlbmd0aCIsImEiLCJ0b0xvd2VyQ2FzZSIsImZuRmluZE1hdGNoIiwic0tleXdvcmQiLCJvQ29udGV4dCIsIm9NYXAiLCJzb3J0Iiwib0VudHJ5MSIsIm9FbnRyeTIiLCJ1MSIsImtleSIsInUyIiwiZGlzdCIsIm8xIiwiT2JqZWN0IiwiYXNzaWduIiwibzIiLCJjb250ZXh0IiwiZm5GaW5kVW5pdFRlc3QiLCJzc3lzdGVtT2JqZWN0SWQiLCJFbnVtUnVsZVR5cGUiLCJleHBvcnRzIiwibm9uUHJpdmF0ZUtleXMiLCJvQSIsImtleXMiLCJmaWx0ZXIiLCJjb3VudEFpbkIiLCJvQiIsImZuQ29tcGFyZSIsImFLZXlJZ25vcmUiLCJBcnJheSIsImlzQXJyYXkiLCJpbmRleE9mIiwicmVkdWNlIiwicHJldiIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiY2FsbCIsInNwdXJpb3VzQW5vdEluQiIsImxvd2VyQ2FzZSIsIm8iLCJjb21wYXJlQ29udGV4dCIsImVxdWFsIiwiYiIsImRpZmZlcmVudCIsInNwdXJpb3VzTCIsInNwdXJpb3VzUiIsIm1hdGNoV29yZCIsIm9SdWxlIiwib3B0aW9ucyIsInVuZGVmaW5lZCIsInMxIiwiczIiLCJ3b3JkIiwiZGVsdGEiLCJmb2xsb3dzIiwiSlNPTiIsInN0cmluZ2lmeSIsIm1hdGNob3RoZXJzIiwiYyIsInJlcyIsIm92ZXJyaWRlIiwiX3dlaWdodCIsImZyZWV6ZSIsImV4dHJhY3RBcmdzTWFwIiwibWF0Y2giLCJhcmdzTWFwIiwiZm9yRWFjaCIsImlLZXkiLCJ2YWx1ZSIsIm1hdGNoUmVnRXhwIiwic0tleSIsInJlZyIsInJlZ2V4cCIsIm0iLCJleGVjIiwib0V4dHJhY3RlZENvbnRleHQiLCJzb3J0QnlXZWlnaHQiLCJvQ29udGV4dEEiLCJvQ29udGV4dEIiLCJyYW5raW5nQSIsInBhcnNlRmxvYXQiLCJyYW5raW5nQiIsIndlaWdodEEiLCJ3ZWlnaHRCIiwiYXVnbWVudENvbnRleHQxIiwib1J1bGVzIiwiZW5hYmxlZCIsImV2ZXJ5IiwiaVJ1bGUiLCJFcnJvciIsIm1hcCIsInR5cGUiLCJvcmVzIiwiYmluZCIsImF1Z21lbnRDb250ZXh0IiwiYVJ1bGVzIiwib3B0aW9uczEiLCJhUmVzIiwib3B0aW9uczIiLCJpbnNlcnRPcmRlcmVkIiwicmVzdWx0IiwiaUluc2VydGVkTWVtYmVyIiwibGltaXQiLCJwdXNoIiwidGFrZVRvcE4iLCJhcnIiLCJ1IiwiaW5uZXJBcnIiLCJpQXJyIiwidG9wIiwic2hpZnQiLCJpbnB1dEZpbHRlclJ1bGVzIiwiYXBwbHlSdWxlcyIsImJlc3ROIiwib0tleU9yZGVyIiwiYmVzdE5leHQiLCJvUnVsZU1hcCIsImFwcGx5UnVsZXNQaWNrRmlyc3QiLCJyIiwiZGVjaWRlT25SZVF1ZXJ5IiwiYVNob3dFbnRpdHlBY3Rpb25zIiwic3lzdGVtSWQiLCJjbGllbnQiLCJzeXN0ZW10eXBlIiwic3lzdGVtT2JqZWN0SWQiLCJwYXR0ZXJuIiwic3lzdGVtT2JqZWN0Q2F0ZWdvcnkiLCJ0b29sIiwiZXhwYW5kUGFyYW1ldGVyc0luVVJMIiwib01lcmdlZENvbnRleHRSZXN1bHQiLCJwdG4iLCJyZWdleCIsIlJlZ0V4cCIsInJlcGxhY2UiLCJuck1hdGNoZXMiLCJhT2JqZWN0IiwibnJOb01hdGNoZXMiLCJub01hdGNoQSIsIm5vTWF0Y2hCIiwic2FtZU9yU3RhciIsIm9FbnRpdHkiLCJzYW1lT3JTdGFyRW1wdHkiLCJmaWx0ZXJTaG93RW50aXR5IiwiYVNob3dFbnRpdHkiLCJhRmlsdGVyZWQiLCJvU2hvd0VudGl0eSIsIm5yTWF0Y2hlc0EiLCJuck1hdGNoZXNCIiwibnJOb01hdGNoZXNBIiwibnJOb01hdGNoZXNCIiwib01hdGNoIiwib01lcmdlZCIsImFiIiwiX3Rlc3QiLCJfYVNob3dFbnRpdHlBY3Rpb25zIl0sIm1hcHBpbmdzIjoiQUFBQTtBQ0NBO0FERUE7Ozs7Ozs7Ozs7Ozs7Ozs7QUFlQSxJQUFZQSxXQUFRQyxRQUFNLDZCQUFOLENBQXBCO0FBRUEsSUFBWUMsUUFBS0QsUUFBTSxPQUFOLENBQWpCO0FBRUEsSUFBTUUsV0FBV0QsTUFBTSxhQUFOLENBQWpCO0FBRUEsSUFBWUUsWUFBU0gsUUFBTSxhQUFOLENBQXJCO0FBQ0UsSUFBSUksYUFBYUQsVUFBVUMsVUFBM0I7QUFFQSxTQUFBQyxZQUFBLENBQXVCQyxNQUF2QixFQUF3Q0MsTUFBeEMsRUFBdUQ7QUFDckQ7QUFDQSxRQUFJQyxLQUFLVCxTQUFTVSxXQUFULENBQXFCSCxPQUFPSSxTQUFQLENBQWlCLENBQWpCLEVBQW9CSCxPQUFPSSxNQUEzQixDQUFyQixFQUF5REosTUFBekQsQ0FBVDtBQUNBLFFBQUlLLElBQUliLFNBQVNVLFdBQVQsQ0FBcUJILE9BQU9PLFdBQVAsRUFBckIsRUFBMkNOLE1BQTNDLENBQVI7QUFDQSxXQUFPQyxLQUFLLEdBQUwsR0FBV0QsT0FBT0ksTUFBbEIsR0FBMkJDLENBQWxDO0FBQ0Q7QUFFRCxTQUFBRSxXQUFBLENBQXNCQyxRQUF0QixFQUFnQ0MsUUFBaEMsRUFBNERDLElBQTVELEVBQWdFO0FBQzlEO0FBQ0FBLFNBQUtDLElBQUwsQ0FBVSxVQUFVQyxPQUFWLEVBQW1CQyxPQUFuQixFQUEwQjtBQUNsQyxZQUFJQyxLQUFLaEIsYUFBYWMsUUFBUUcsR0FBUixDQUFZVCxXQUFaLEVBQWIsRUFBd0NFLFFBQXhDLENBQVQ7QUFDQSxZQUFJUSxLQUFLbEIsYUFBYWUsUUFBUUUsR0FBUixDQUFZVCxXQUFaLEVBQWIsRUFBd0NFLFFBQXhDLENBQVQ7QUFDQSxlQUFPTSxLQUFLRSxFQUFaO0FBQ0QsS0FKRDtBQUtBO0FBQ0E7QUFDQSxRQUFJQyxPQUFPbkIs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QkFBdUJpRixJQUF2QixHQUE4QixLQUE5QixHQUFzQ25FLFNBQVNtRSxJQUFULENBQS9DO0FBQ0FpRiwwQkFBVUQsT0FBT3RJLE9BQVAsQ0FBZXNELElBQWYsRUFBcUJuRSxTQUFTbUUsSUFBVCxDQUFyQixFQUFxQ2lGLE9BQXJDLENBQVY7QUFDRDtBQUNGLFNBTEQ7QUFPQSxlQUFPQSxPQUFQO0FBQ0Q7QUFDRCxXQUFPLElBQVA7QUFDRDtBQUdEO0FBRWFuSSxRQUFBb0ksRUFBQSxHQUFLO0FBQ2hCQyxXQUFPO0FBQ0xkLG9CQUFZQSxVQURQO0FBRUxMLG1CQUFXQSxTQUZOO0FBR0xFLHFCQUFhQSxXQUhSO0FBSUxSLCtCQUF1QkEscUJBSmxCO0FBS0xjLDBCQUFrQkEsZ0JBTGI7QUFNTDdILHdCQUFnQkEsY0FOWDtBQU9MekIsc0JBQWNBLFlBUFQ7QUFRTGtLLDZCQUFxQmxDO0FBUmhCO0FBRFMsQ0FBTDtBQWFiO0FBRUEiLCJmaWxlIjoibWF0Y2gvaW5wdXRGaWx0ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vbGliL25vZGUtNC5kLnRzXCIgLz5cclxuXHJcblxyXG4vKipcclxuICogdGhlIGlucHV0IGZpbHRlciBzdGFnZSBwcmVwcm9jZXNzZXMgYSBjdXJyZW50IGNvbnRleHRcclxuICpcclxuICogSXQgYSkgY29tYmluZXMgbXVsdGktc2VnbWVudCBhcmd1bWVudHMgaW50byBvbmUgY29udGV4dCBtZW1iZXJzXHJcbiAqIEl0IGIpIGF0dGVtcHRzIHRvIGF1Z21lbnQgdGhlIGNvbnRleHQgYnkgYWRkaXRpb25hbCBxdWFsaWZpY2F0aW9uc1xyXG4gKiAgICAgICAgICAgKE1pZCB0ZXJtIGdlbmVyYXRpbmcgQWx0ZXJuYXRpdmVzLCBlLmcuXHJcbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiB1bml0IHRlc3Q/XHJcbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiBzb3VyY2UgP1xyXG4gKiAgICAgICAgICAgKVxyXG4gKiAgU2ltcGxlIHJ1bGVzIGxpa2UgIEludGVudFxyXG4gKlxyXG4gKlxyXG4gKiBAbW9kdWxlXHJcbiAqIEBmaWxlIGlucHV0RmlsdGVyLnRzXHJcbiAqL1xyXG5pbXBvcnQgKiBhcyBkaXN0YW5jZSBmcm9tICcuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4nO1xyXG5cclxuaW1wb3J0ICogYXMgZGVidWcgZnJvbSAnZGVidWcnO1xyXG5cclxuY29uc3QgZGVidWdsb2cgPSBkZWJ1ZygnaW5wdXRGaWx0ZXInKVxyXG5cclxuaW1wb3J0ICogYXMgbWF0Y2hkYXRhIGZyb20gJy4vbWF0Y2hkYXRhJztcclxuICB2YXIgb1VuaXRUZXN0cyA9IG1hdGNoZGF0YS5vVW5pdFRlc3RzXHJcblxyXG4gIGZ1bmN0aW9uIGNhbGNEaXN0YW5jZSAoc1RleHQxIDogc3RyaW5nLCBzVGV4dDIgOiBzdHJpbmcpIDogbnVtYmVyIHtcclxuICAgIC8vIGNvbnNvbGUubG9nKFwibGVuZ3RoMlwiICsgc1RleHQxICsgXCIgLSBcIiArIHNUZXh0MilcclxuICAgIHZhciBhMCA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCksIHNUZXh0MilcclxuICAgIHZhciBhID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnRvTG93ZXJDYXNlKCksIHNUZXh0MilcclxuICAgIHJldHVybiBhMCAqIDUwMCAvIHNUZXh0Mi5sZW5ndGggKyBhXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBmbkZpbmRNYXRjaCAoc0tleXdvcmQsIG9Db250ZXh0IDogSUZNYXRjaC5jb250ZXh0LCBvTWFwKSB7XHJcbiAgICAvLyByZXR1cm4gYSBiZXR0ZXIgY29udGV4dCBpZiB0aGVyZSBpcyBhIG1hdGNoXHJcbiAgICBvTWFwLnNvcnQoZnVuY3Rpb24gKG9FbnRyeTEsIG9FbnRyeTIpIHtcclxuICAgICAgdmFyIHUxID0gY2FsY0Rpc3RhbmNlKG9FbnRyeTEua2V5LnRvTG93ZXJDYXNlKCksIHNLZXl3b3JkKVxyXG4gICAgICB2YXIgdTIgPSBjYWxjRGlzdGFuY2Uob0VudHJ5Mi5rZXkudG9Mb3dlckNhc2UoKSwgc0tleXdvcmQpXHJcbiAgICAgIHJldHVybiB1MSAtIHUyXHJcbiAgICB9KVxyXG4gICAgLy8gbGF0ZXI6IGluIGNhc2Ugb2YgY29uZmxpY3RzLCBhc2ssXHJcbiAgICAvLyBub3c6XHJcbiAgICB2YXIgZGlzdCA9IGNhbGNEaXN0YW5jZShvTWFwWzBdLmtleS50b0xvd2VyQ2FzZSgpLCBzS2V5d29yZClcclxuICAgIGRlYnVnbG9nKCdiZXN0IGRpc3QnICsgZGlzdCArICcgLyAgJyArIGRpc3QgKiBzS2V5d29yZC5sZW5ndGggKyAnICcgKyBzS2V5d29yZClcclxuICAgIGlmIChkaXN0IDwgMTUwKSB7XHJcbiAgICAgIHZhciBvMSA9IE9iamVjdC5hc3NpZ24oe30sIG9Db250ZXh0KSBhcyBhbnlcclxuICAgICAgdmFyIG8yXHJcbiAgICAgIG8xLmNvbnRleHQgPSBPYmplY3QuYXNzaWduKHt9LCBvMS5jb250ZXh0KVxyXG4gICAgICBvMiA9IG8xXHJcbiAgICAgIG8yLmNvbnRleHQgPSBPYmplY3QuYXNzaWduKG8xLmNvbnRleHQsIG9NYXBbMF0uY29udGV4dClcclxuICAgICAgcmV0dXJuIG8yXHJcbiAgICB9XHJcbiAgICByZXR1cm4gbnVsbFxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogYSBmdW5jdGlvbiB0byBtYXRjaCBhIHVuaXQgdGVzdCB1c2luZyBsZXZlbnNodGVpbiBkaXN0YW5jZXNcclxuICAgKiBAcHVibGljXHJcbiAgICovXHJcbiAgZnVuY3Rpb24gZm5GaW5kVW5pdFRlc3QgKHNzeXN0ZW1PYmplY3RJZCwgb0NvbnRleHQpIHtcclxuICAgIHJldHVybiBmbkZpbmRNYXRjaChzc3lzdGVtT2JqZWN0SWQsIG9Db250ZXh0LCBvVW5pdFRlc3RzKVxyXG4gIH1cclxuXHJcbmltcG9ydCAqIGFzIElGTWF0Y2ggZnJvbSAnLi4vbWF0Y2gvaWZtYXRjaCc7XHJcblxyXG5leHBvcnQgY29uc3QgIGVudW0gRW51bVJ1bGVUeXBlIHtcclxuICBXT1JEICxcclxuICBSRUdFWFBcclxufVxyXG5cclxuaW50ZXJmYWNlIElSdWxlIHtcclxuICB0eXBlIDogRW51bVJ1bGVUeXBlLFxyXG4gIGtleSA6IHN0cmluZyxcclxuICB3b3JkPyA6IHN0cmluZyxcclxuICByZWdleHA/IDogUmVnRXhwLFxyXG4gIGFyZ3NNYXA/IDogeyBba2V5Om51bWJlcl0gOiBzdHJpbmd9ICAvLyBhIG1hcCBvZiByZWdleHAgbWF0Y2ggZ3JvdXAgLT4gY29udGV4dCBrZXlcclxuICAvLyBlLmcuIC8oW2EtejAtOV17MywzfSlDTE5UKFtcXGR7MywzfV0pL1xyXG4gIC8vICAgICAgeyAxIDogXCJzeXN0ZW1JZFwiLCAyIDogXCJjbGllbnRcIiB9XHJcbiAgZm9sbG93cyA6IElGTWF0Y2guY29udGV4dFxyXG59XHJcblxyXG5pbnRlcmZhY2UgSU1hdGNoT3B0aW9ucyB7XHJcbiAgbWF0Y2hvdGhlcnM/IDogYm9vbGVhbixcclxuICBhdWdtZW50PzogYm9vbGVhbixcclxuICBvdmVycmlkZT8gOiBib29sZWFuXHJcbn1cclxuXHJcbmludGVyZmFjZSBJTWF0Y2hDb3VudCB7XHJcbiAgZXF1YWwgOiBudW1iZXJcclxuICBkaWZmZXJlbnQgOiBudW1iZXJcclxuICBzcHVyaW91c1IgOiBudW1iZXJcclxuICBzcHVyaW91c0wgOiBudW1iZXJcclxufVxyXG5cclxuZnVuY3Rpb24gbm9uUHJpdmF0ZUtleXMob0EpIHtcclxuICByZXR1cm4gT2JqZWN0LmtleXMob0EpLmZpbHRlcigga2V5ID0+IHtcclxuICAgIHJldHVybiBrZXlbMF0gIT09ICdfJztcclxuICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNvdW50QWluQiAob0EsIG9CLCBmbkNvbXBhcmUsIGFLZXlJZ25vcmU/KSA6IG51bWJlcntcclxuICAgYUtleUlnbm9yZSA9IEFycmF5LmlzQXJyYXkoYUtleUlnbm9yZSkgPyAgYUtleUlnbm9yZSA6XHJcbiAgICAgIHR5cGVvZiBhS2V5SWdub3JlID09PSBcInN0cmluZ1wiID8gW2FLZXlJZ25vcmVdIDogIFtdO1xyXG4gICBmbkNvbXBhcmUgPSBmbkNvbXBhcmUgfHwgZnVuY3Rpb24oKSB7IHJldHVybiB0cnVlOyB9XHJcbiAgIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKCBmdW5jdGlvbihrZXkpIHtcclxuICAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xyXG4gICAgfSkuXHJcbiAgICByZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xyXG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9CLCBrZXkpKSB7XHJcbiAgICAgICAgcHJldiA9IHByZXYgKyAoZm5Db21wYXJlKG9BW2tleV0sb0Jba2V5XSwga2V5KSA/IDEgOiAwKVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBwcmV2XHJcbiAgICB9LCAwKVxyXG4gIH1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzcHVyaW91c0Fub3RJbkIob0Esb0IsIGFLZXlJZ25vcmU/ICkge1xyXG4gIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gIGFLZXlJZ25vcmUgOlxyXG4gICAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6ICBbXTtcclxuICAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoIGZ1bmN0aW9uKGtleSkge1xyXG4gICAgIHJldHVybiBhS2V5SWdub3JlLmluZGV4T2Yoa2V5KSA8IDA7XHJcbiAgICB9KS5cclxuICAgIHJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XHJcbiAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9CLCBrZXkpKSB7XHJcbiAgICAgICAgcHJldiA9IHByZXYgKyAxXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHByZXZcclxuICAgIH0sIDApXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvd2VyQ2FzZShvKSB7XHJcbiAgaWYgKHR5cGVvZiBvID09PSBcInN0cmluZ1wiKSB7XHJcbiAgICByZXR1cm4gby50b0xvd2VyQ2FzZSgpXHJcbiAgfVxyXG4gIHJldHVybiBvXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjb21wYXJlQ29udGV4dChvQSAsIG9CLCBhS2V5SWdub3JlPykge1xyXG4gIHZhciBlcXVhbCA9IGNvdW50QWluQihvQSxvQiwgZnVuY3Rpb24oYSxiKSB7IHJldHVybiBsb3dlckNhc2UoYSkgPT09IGxvd2VyQ2FzZShiKTt9LCBhS2V5SWdub3JlKTtcclxuICB2YXIgZGlmZmVyZW50ID0gY291bnRBaW5CKG9BLG9CLCBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGxvd2VyQ2FzZShhKSAhPT0gbG93ZXJDYXNlKGIpO30sIGFLZXlJZ25vcmUpO1xyXG4gIHZhciBzcHVyaW91c0wgPSBzcHVyaW91c0Fub3RJbkIob0Esb0IsIGFLZXlJZ25vcmUpXHJcbiAgdmFyIHNwdXJpb3VzUiA9IHNwdXJpb3VzQW5vdEluQihvQixvQSwgYUtleUlnbm9yZSlcclxuICByZXR1cm4ge1xyXG4gICAgZXF1YWwgOiBlcXVhbCxcclxuICAgIGRpZmZlcmVudDogZGlmZmVyZW50LFxyXG4gICAgc3B1cmlvdXNMOiBzcHVyaW91c0wsXHJcbiAgICBzcHVyaW91c1I6IHNwdXJpb3VzUlxyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqXHJcbiAqIE9wdGlvbnMgbWF5IGJlIHtcclxuICogbWF0Y2hvdGhlcnMgOiB0cnVlLCAgPT4gb25seSBydWxlcyB3aGVyZSBhbGwgb3RoZXJzIG1hdGNoIGFyZSBjb25zaWRlcmVkXHJcbiAqIGF1Z21lbnQgOiB0cnVlLFxyXG4gKiBvdmVycmlkZSA6IHRydWUgfSAgPT5cclxuICpcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBtYXRjaFdvcmQob1J1bGUgOiBJUnVsZSwgY29udGV4dCA6IElGTWF0Y2guY29udGV4dCwgb3B0aW9ucyA/IDogSU1hdGNoT3B0aW9ucykge1xyXG4gIGlmIChjb250ZXh0W29SdWxlLmtleV0gPT09IHVuZGVmaW5lZCkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICB9XHJcbiAgdmFyIHMxID0gY29udGV4dFtvUnVsZS5rZXldLnRvTG93ZXJDYXNlKClcclxuICB2YXIgczIgPSBvUnVsZS53b3JkLnRvTG93ZXJDYXNlKCk7XHJcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cclxuICB2YXIgZGVsdGEgPSBjb21wYXJlQ29udGV4dChjb250ZXh0LG9SdWxlLmZvbGxvd3MsIG9SdWxlLmtleSlcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xyXG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcclxuICBpZiAob3B0aW9ucy5tYXRjaG90aGVycyAmJiAoZGVsdGEuZGlmZmVyZW50ID4gMCkpe1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gIH1cclxuICB2YXIgYyA6IG51bWJlciA9IGNhbGNEaXN0YW5jZShzMiwgczEpO1xyXG4gICBkZWJ1Z2xvZyhcIiBzMSA8PiBzMiBcIiArIHMxICsgXCI8PlwiICsgczIgKyBcIiAgPT46IFwiICsgYyk7XHJcbiAgaWYoYyA8IDE1MCApIHtcclxuICAgIHZhciByZXMgPSBPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKSBhcyBhbnk7XHJcbiAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgY29udGV4dCk7XHJcbiAgICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xyXG4gICAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgb1J1bGUuZm9sbG93cyk7XHJcbiAgICB9XHJcbiAgICAvLyBmb3JjZSBrZXkgcHJvcGVydHlcclxuICAgIC8vIGNvbnNvbGUubG9nKCcgb2JqZWN0Y2F0ZWdvcnknLCByZXNbJ3N5c3RlbU9iamVjdENhdGVnb3J5J10pO1xyXG4gICAgcmVzW29SdWxlLmtleV0gPSBvUnVsZS5mb2xsb3dzW29SdWxlLmtleV0gfHwgcmVzW29SdWxlLmtleV07XHJcbiAgICByZXMuX3dlaWdodCA9IE9iamVjdC5hc3NpZ24oe30sIHJlcy5fd2VpZ2h0KTtcclxuICAgIHJlcy5fd2VpZ2h0W29SdWxlLmtleV0gPSBjO1xyXG4gICAgT2JqZWN0LmZyZWV6ZShyZXMpO1xyXG4gICAgZGVidWdsb2coJ0ZvdW5kIG9uZScgKyBKU09OLnN0cmluZ2lmeShyZXMsdW5kZWZpbmVkLDIpKTtcclxuICAgIHJldHVybiByZXM7XHJcbiAgfVxyXG4gIHJldHVybiB1bmRlZmluZWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0QXJnc01hcChtYXRjaCA6IEFycmF5PHN0cmluZz4gLCBhcmdzTWFwIDogeyBba2V5IDogbnVtYmVyXSA6IHN0cmluZ30pIDogSUZNYXRjaC5jb250ZXh0IHtcclxuICB2YXIgcmVzID0ge30gYXMgSUZNYXRjaC5jb250ZXh0O1xyXG4gIGlmICghYXJnc01hcCkge1xyXG4gICAgcmV0dXJuIHJlcztcclxuICB9XHJcbiAgT2JqZWN0LmtleXMoYXJnc01hcCkuZm9yRWFjaChmdW5jdGlvbihpS2V5KSB7XHJcbiAgICAgIHZhciB2YWx1ZSA9IG1hdGNoW2lLZXldXHJcbiAgICAgIHZhciBrZXkgPSBhcmdzTWFwW2lLZXldO1xyXG4gICAgICBpZiAoKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikgJiYgdmFsdWUubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIHJlc1trZXldID0gdmFsdWVcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVnRXhwKG9SdWxlIDogSVJ1bGUsIGNvbnRleHQgOiBJRk1hdGNoLmNvbnRleHQsIG9wdGlvbnMgPyA6IElNYXRjaE9wdGlvbnMpIHtcclxuICBpZiAoY29udGV4dFtvUnVsZS5rZXldID09PSB1bmRlZmluZWQpIHtcclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgfVxyXG4gIHZhciBzS2V5ID0gb1J1bGUua2V5O1xyXG4gIHZhciBzMSA9IGNvbnRleHRbb1J1bGUua2V5XS50b0xvd2VyQ2FzZSgpXHJcbiAgdmFyIHJlZyA9IG9SdWxlLnJlZ2V4cDtcclxuXHJcbiAgdmFyIG0gPSByZWcuZXhlYyhzMSk7XHJcbiAgZGVidWdsb2coXCJhcHBseWluZyByZWdleHA6IFwiICsgczEgKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KG0pKTtcclxuICBpZiAoIW0pIHtcclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgfVxyXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XHJcbiAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCxvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpXHJcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XHJcbiAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKXtcclxuICAgIHJldHVybiB1bmRlZmluZWRcclxuICB9XHJcbiAgdmFyIG9FeHRyYWN0ZWRDb250ZXh0ID0gZXh0cmFjdEFyZ3NNYXAobSwgb1J1bGUuYXJnc01hcCApO1xyXG4gIGRlYnVnbG9nKFwiZXh0cmFjdGVkIGFyZ3MgXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZS5hcmdzTWFwKSk7XHJcbiAgZGVidWdsb2coXCJtYXRjaCBcIiArIEpTT04uc3RyaW5naWZ5KG0pKTtcclxuXHJcbiAgZGVidWdsb2coXCJleHRyYWN0ZWQgYXJncyBcIiArIEpTT04uc3RyaW5naWZ5KG9FeHRyYWN0ZWRDb250ZXh0KSk7XHJcbiAgdmFyIHJlcyA9IE9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpIGFzIGFueTtcclxuICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpO1xyXG4gIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcclxuICBpZiAob0V4dHJhY3RlZENvbnRleHRbc0tleV0gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgcmVzW3NLZXldID0gb0V4dHJhY3RlZENvbnRleHRbc0tleV07XHJcbiAgfVxyXG4gIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XHJcbiAgICAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xyXG4gICAgIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBvRXh0cmFjdGVkQ29udGV4dClcclxuICB9XHJcbiAgT2JqZWN0LmZyZWV6ZShyZXMpO1xyXG4gIGRlYnVnbG9nKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLHVuZGVmaW5lZCwyKSk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNvcnRCeVdlaWdodChzS2V5IDogc3RyaW5nLCBvQ29udGV4dEEgOiBJRk1hdGNoLmNvbnRleHQsIG9Db250ZXh0QiA6IElGTWF0Y2guY29udGV4dCkgIDogbnVtYmVye1xyXG4gIGRlYnVnbG9nKCdzb3J0aW5nOiAnICsgc0tleSArICdpbnZva2VkIHdpdGhcXG4gMTonICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHRBLHVuZGVmaW5lZCwyKStcclxuICAgXCIgdnMgXFxuIDI6XCIgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEIsdW5kZWZpbmVkLDIpKTtcclxuICB2YXIgcmFua2luZ0EgOiBudW1iZXIgPSAgcGFyc2VGbG9hdChvQ29udGV4dEFbXCJfcmFua2luZ1wiXSB8fCBcIjFcIik7XHJcbiAgdmFyIHJhbmtpbmdCIDogbnVtYmVyICA9IHBhcnNlRmxvYXQob0NvbnRleHRCW1wiX3JhbmtpbmdcIl0gfHwgXCIxXCIpO1xyXG4gIGlmIChyYW5raW5nQSAhPT0gcmFua2luZ0IpIHtcclxuICAgIGRlYnVnbG9nKFwiIHJhbmtpbiBkZWx0YVwiICsgMTAwKihyYW5raW5nQiAtIHJhbmtpbmdBKSk7XHJcbiAgICByZXR1cm4gMTAwKihyYW5raW5nQiAtIHJhbmtpbmdBKVxyXG4gIH1cclxuXHJcbiAgdmFyIHdlaWdodEEgPSBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QVtcIl93ZWlnaHRcIl1bc0tleV0gIHx8IDA7XHJcbiAgdmFyIHdlaWdodEIgPSBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QltcIl93ZWlnaHRcIl1bc0tleV0gIHx8IDA7XHJcbiAgcmV0dXJuICsod2VpZ2h0QSAtIHdlaWdodEIpO1xyXG59XHJcblxyXG5cclxuLy8gV29yZCwgU3lub255bSwgUmVnZXhwIC8gRXh0cmFjdGlvblJ1bGVcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhdWdtZW50Q29udGV4dDEoIGNvbnRleHQgOiBJRk1hdGNoLmNvbnRleHQsIG9SdWxlcyA6IEFycmF5PElSdWxlPiwgb3B0aW9ucyA6IElNYXRjaE9wdGlvbnMpIDogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgdmFyIHNLZXkgPSBvUnVsZXNbMF0ua2V5O1xyXG4gIC8vIGNoZWNrIHRoYXQgcnVsZVxyXG4gIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XHJcbiAgICAvLyBjaGVjayBjb25zaXN0ZW5jeVxyXG4gICAgb1J1bGVzLmV2ZXJ5KGZ1bmN0aW9uIChpUnVsZSkge1xyXG4gICAgICBpZiAoaVJ1bGUua2V5ICE9PSBzS2V5KSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW5ob21vZ2Vub3VzIGtleXMgaW4gcnVsZXMsIGV4cGVjdGVkIFwiICsgc0tleSArIFwiIHdhcyBcIiArIEpTT04uc3RyaW5naWZ5KGlSdWxlKSk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8vIGxvb2sgZm9yIHJ1bGVzIHdoaWNoIG1hdGNoXHJcbiAgdmFyIHJlcyA9IG9SdWxlcy5tYXAoZnVuY3Rpb24ob1J1bGUpIHtcclxuICAgIC8vIGlzIHRoaXMgcnVsZSBhcHBsaWNhYmxlXHJcbiAgICBzd2l0Y2gob1J1bGUudHlwZSkge1xyXG4gICAgICBjYXNlIEVudW1SdWxlVHlwZS5XT1JEOlxyXG4gICAgICAgIHJldHVybiBtYXRjaFdvcmQob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpXHJcbiAgICAgIGNhc2UgRW51bVJ1bGVUeXBlLlJFR0VYUDpcclxuICAgICAgICByZXR1cm4gbWF0Y2hSZWdFeHAob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xyXG4gICAvLyAgIGNhc2UgXCJFeHRyYWN0aW9uXCI6XHJcbiAgIC8vICAgICByZXR1cm4gbWF0Y2hFeHRyYWN0aW9uKG9SdWxlLGNvbnRleHQpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gIH0pLmZpbHRlcihmdW5jdGlvbihvcmVzKSB7XHJcbiAgICByZXR1cm4gISFvcmVzXHJcbiAgfSkuc29ydChcclxuICAgIHNvcnRCeVdlaWdodC5iaW5kKHRoaXMsIHNLZXkpXHJcbiAgKTtcclxuICByZXR1cm4gcmVzO1xyXG4gIC8vIE9iamVjdC5rZXlzKCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xyXG4gIC8vIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXVnbWVudENvbnRleHQoIGNvbnRleHQgOiBJRk1hdGNoLmNvbnRleHQsIGFSdWxlcyA6IEFycmF5PElSdWxlPikgOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuXHJcbnZhciBvcHRpb25zMSA6IElNYXRjaE9wdGlvbnMgPSB7XHJcbiAgICBtYXRjaG90aGVycyA6IHRydWUsXHJcbiAgICBvdmVycmlkZTogZmFsc2VcclxuICB9IGFzIElNYXRjaE9wdGlvbnM7XHJcblxyXG4gIHZhciBhUmVzID0gYXVnbWVudENvbnRleHQxKGNvbnRleHQsYVJ1bGVzLG9wdGlvbnMxKVxyXG5cclxuICBpZiAoYVJlcy5sZW5ndGggPT09IDApICB7XHJcbiAgICB2YXIgb3B0aW9uczIgOiBJTWF0Y2hPcHRpb25zID0ge1xyXG4gICAgICAgIG1hdGNob3RoZXJzIDogZmFsc2UsXHJcbiAgICAgICAgb3ZlcnJpZGU6IHRydWVcclxuICAgIH0gYXMgSU1hdGNoT3B0aW9ucztcclxuICAgIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMik7XHJcbiAgfVxyXG4gIHJldHVybiBhUmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gaW5zZXJ0T3JkZXJlZChyZXN1bHQgOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+LCBpSW5zZXJ0ZWRNZW1iZXIgOiBJRk1hdGNoLmNvbnRleHQsIGxpbWl0IDogbnVtYmVyKSA6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIC8vIFRPRE86IHVzZSBzb21lIHdlaWdodFxyXG4gIGlmIChyZXN1bHQubGVuZ3RoIDwgbGltaXQpIHtcclxuICAgIHJlc3VsdC5wdXNoKGlJbnNlcnRlZE1lbWJlcilcclxuICB9XHJcbiAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB0YWtlVG9wTihhcnIgOiBBcnJheTxBcnJheTxJRk1hdGNoLmNvbnRleHQ+Pik6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIHZhciB1ID0gYXJyLmZpbHRlcihmdW5jdGlvbihpbm5lckFycikgeyByZXR1cm4gaW5uZXJBcnIubGVuZ3RoID4gMH0pXHJcblxyXG4gIHZhciByZXMgPVtdO1xyXG4gIC8vIHNoaWZ0IG91dCB0aGUgdG9wIG9uZXNcclxuICB1ID0gdS5tYXAoZnVuY3Rpb24oaUFycikge1xyXG4gICAgdmFyIHRvcCA9IGlBcnIuc2hpZnQoKTtcclxuICAgIHJlcyA9IGluc2VydE9yZGVyZWQocmVzLHRvcCw1KVxyXG4gICAgcmV0dXJuIGlBcnJcclxuICB9KS5maWx0ZXIoZnVuY3Rpb24oaW5uZXJBcnI6IEFycmF5PElGTWF0Y2guY29udGV4dD4pIDogYm9vbGVhbiB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwfSk7XHJcbiAgLy8gYXMgQXJyYXk8QXJyYXk8SUZNYXRjaC5jb250ZXh0Pj5cclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5pbXBvcnQgKiBhcyBpbnB1dEZpbHRlclJ1bGVzIGZyb20gJy4vaW5wdXRGaWx0ZXJSdWxlcyc7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlSdWxlcyhjb250ZXh0IDogSUZNYXRjaC5jb250ZXh0KSA6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIHZhciBiZXN0TiA6IEFycmF5PElGTWF0Y2guY29udGV4dD4gPSBbY29udGV4dF07XHJcbiAgaW5wdXRGaWx0ZXJSdWxlcy5vS2V5T3JkZXIuZm9yRWFjaChmdW5jdGlvbiAoc0tleSA6IHN0cmluZykge1xyXG4gICAgIHZhciBiZXN0TmV4dDogQXJyYXk8QXJyYXk8SUZNYXRjaC5jb250ZXh0Pj4gPSBbXTtcclxuICAgICBiZXN0Ti5mb3JFYWNoKGZ1bmN0aW9uKG9Db250ZXh0IDogSUZNYXRjaC5jb250ZXh0KSB7XHJcbiAgICAgICBpZiAob0NvbnRleHRbc0tleV0pIHtcclxuICAgICAgICAgIGRlYnVnbG9nKCcqKiBhcHBseWluZyBydWxlcyBmb3IgJyArIHNLZXkpXHJcbiAgICAgICAgICB2YXIgcmVzID0gYXVnbWVudENvbnRleHQob0NvbnRleHQsIGlucHV0RmlsdGVyUnVsZXMub1J1bGVNYXBbc0tleV0gfHwgW10pXHJcbiAgICAgICAgICBkZWJ1Z2xvZygnKiogcmVzdWx0IGZvciAnICsgc0tleSArICcgPSAnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKVxyXG4gICAgICAgICAgYmVzdE5leHQucHVzaChyZXMgfHwgW10pXHJcbiAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAvLyBydWxlIG5vdCByZWxldmFudFxyXG4gICAgICAgICBiZXN0TmV4dC5wdXNoKFtvQ29udGV4dF0pO1xyXG4gICAgICAgfVxyXG4gICAgfSlcclxuICAgIGJlc3ROID0gdGFrZVRvcE4oYmVzdE5leHQpO1xyXG4gIH0pO1xyXG4gIHJldHVybiBiZXN0TlxyXG59XHJcblxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UnVsZXNQaWNrRmlyc3QoY29udGV4dCA6IElGTWF0Y2guY29udGV4dCkgOiBJRk1hdGNoLmNvbnRleHQge1xyXG4gIHZhciByID0gYXBwbHlSdWxlcyhjb250ZXh0KTtcclxuICByZXR1cm4gciAmJiByWzBdO1xyXG59XHJcblxyXG4vKipcclxuICogRGVjaWRlIHdoZXRoZXIgdG8gcmVxdWVyeSBmb3IgYSBjb250ZXRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBkZWNpZGVPblJlUXVlcnkoIGNvbnRleHQgOiBJRk1hdGNoLmNvbnRleHQpIDogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcbiAgcmV0dXJuIFtdXHJcbn1cclxuXHJcblxyXG5cclxuICB2YXIgYVNob3dFbnRpdHlBY3Rpb25zID0gW1xyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtSWQ6ICd1djInLFxyXG4gICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxyXG4gICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscCdcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXV2Mi53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvdWkyL3VzaGVsbC9zaGVsbHMvYWJhcC9GaW9yaUxhdW5jaHBhZC5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1JZDogJ3V2MicsXHJcbiAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXHJcbiAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwZCdcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXV2Mi53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvc2FwL2Fyc3J2Y191cGJfYWRtbi9tYWluLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbUlkOiAndTF5JyxcclxuICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcclxuICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHAnXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1MXkud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3VpMi91c2hlbGwvc2hlbGxzL2FiYXAvRmlvcmlMYXVuY2hwYWQuaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtSWQ6ICd1MXknLFxyXG4gICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxyXG4gICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscGQnXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1MXkud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3NhcC9hcnNydmNfdXBiX2FkbW4vbWFpbi5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1JZDogJ3V2MicsXHJcbiAgICAgICAgY2xpZW50OiAnMTIwJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ2NhdGFsb2cnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiAvLiovLFxyXG4gICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcclxuICAgICAgICB0b29sOiAnRkxQRCdcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXV2Mi53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvc2FwL2Fyc3J2Y191cGJfYWRtbi9tYWluLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSNDQVRBTE9HOntzeXN0ZW1PYmplY3RJZH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ3VuaXQnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiBmbkZpbmRVbml0VGVzdFxyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cDovL2xvY2FsaG9zdDo4MDgwL3twYXRofSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAnd2lraScsXHJcbiAgICAgLy8gICBzeXN0ZW1PYmplY3RJZDogZm5GaW5kV2lraVxyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly93aWtpLndkZi5zYXAuY29ycC97cGF0aH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1JZDogJ0pJUkEnXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL2ppcmEud2RmLnNhcC5jb3JwOjgwODAvVElQQ09SRVVJSUknXHJcbiAgICAgIH1cclxuICAgIH1cclxuICBdXHJcblxyXG4gIC8vIGlmIFRPT0wgPSBKSVJBIHx8IFN5c3RlbUlkID0gSklSQSAtPiBTeXN0ZW1JZCA9IEpJUkFcclxuICAvL1xyXG4gIC8vXHJcblxyXG5cclxuICAvLyBzdGFydFNBUEdVSVxyXG5cclxuICAvLyAgIE46XFw+XCJjOlxcUHJvZ3JhbSBGaWxlcyAoeDg2KVxcU0FQXFxGcm9udEVuZFxcU0FQZ3VpXCJcXHNhcHNoY3V0LmV4ZSAgLXN5c3RlbT1VVjIgLWNsaWVudD0xMjAgLWNvbW1hbmQ9U0UzOCAtdHlwZT1UcmFuc2FjdGlvbiAtdXNlcj1BVVNFUlxyXG5cclxuICBmdW5jdGlvbiBleHBhbmRQYXJhbWV0ZXJzSW5VUkwgKG9NZXJnZWRDb250ZXh0UmVzdWx0KSB7XHJcbiAgICB2YXIgcHRuID0gb01lcmdlZENvbnRleHRSZXN1bHQucmVzdWx0LnBhdHRlcm5cclxuICAgIE9iamVjdC5rZXlzKG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcclxuICAgICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cCgneycgKyBzS2V5ICsgJ30nLCAnZycpXHJcbiAgICAgIHB0biA9IHB0bi5yZXBsYWNlKHJlZ2V4LCBvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0W3NLZXldKVxyXG4gICAgICBwdG4gPSBwdG4ucmVwbGFjZShyZWdleCwgb01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dFtzS2V5XSlcclxuICAgIH0pXHJcbiAgICByZXR1cm4gcHRuXHJcbiAgfVxyXG5cclxuXHJcbiAgZnVuY3Rpb24gbnJNYXRjaGVzIChhT2JqZWN0LCBvQ29udGV4dCkge1xyXG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKGFPYmplY3QpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XHJcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0NvbnRleHQsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIDFcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldlxyXG4gICAgfSwgMClcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIG5yTm9NYXRjaGVzIChhT2JqZWN0LCBvQ29udGV4dCkge1xyXG4gICAgdmFyIG5vTWF0Y2hBID0gT2JqZWN0LmtleXMoYU9iamVjdCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0NvbnRleHQsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIDFcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldlxyXG4gICAgfSwgMClcclxuICAgIHZhciBub01hdGNoQiA9IE9iamVjdC5rZXlzKG9Db250ZXh0KS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xyXG4gICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChhT2JqZWN0LCBrZXkpKSB7XHJcbiAgICAgICAgcHJldiA9IHByZXYgKyAxXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHByZXZcclxuICAgIH0sIDApXHJcbiAgICByZXR1cm4gbm9NYXRjaEEgKyBub01hdGNoQlxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gc2FtZU9yU3RhciAoczEgOiBzdHJpbmcsIHMyIDogc3RyaW5nIHwgUmVnRXhwIHwgRnVuY3Rpb24gLCBvRW50aXR5KSB7XHJcbiAgICByZXR1cm4gczEgPT09IHMyIHx8XHJcbiAgICAgIChzMSA9PT0gdW5kZWZpbmVkICYmIHMyID09PSBudWxsKSB8fFxyXG4gICAgICAoKHMyIGluc3RhbmNlb2YgUmVnRXhwKSAmJiBzMi5leGVjKHMxKSAhPT0gbnVsbCkgfHxcclxuICAgICAgKCh0eXBlb2YgczIgPT09ICdmdW5jdGlvbicgJiYgczEpICYmIHMyKHMxLCBvRW50aXR5KSlcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHNhbWVPclN0YXJFbXB0eSAoczEgOiBzdHJpbmcsIHMyIDogc3RyaW5nIHwgUmVnRXhwIHwgRnVuY3Rpb24sIG9FbnRpdHkpIHtcclxuICAgIGlmIChzMSA9PT0gdW5kZWZpbmVkICYmIHMyID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgcmV0dXJuIHRydWVcclxuICAgIH1cclxuICAgIGlmIChzMiA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHMxID09PSBzMiB8fFxyXG4gICAgICAoKHMyIGluc3RhbmNlb2YgUmVnRXhwKSAmJiBzMi5leGVjKHMxKSAhPT0gbnVsbCkgfHxcclxuICAgICAgKCh0eXBlb2YgczIgPT09ICdmdW5jdGlvbicgJiYgczEpICYmIHMyKHMxLCBvRW50aXR5KSlcclxuICB9XHJcbiAgZnVuY3Rpb24gZmlsdGVyU2hvd0VudGl0eSAob0NvbnRleHQsIGFTaG93RW50aXR5KSB7XHJcbiAgICB2YXIgYUZpbHRlcmVkXHJcbiAgICBPYmplY3Qua2V5cyhvQ29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xyXG4gICAgICBpZiAob0NvbnRleHRbc0tleV0gPT09IG51bGwpIHtcclxuICAgICAgICBvQ29udGV4dFtzS2V5XSA9IHVuZGVmaW5lZFxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gICAgYUZpbHRlcmVkID0gYVNob3dFbnRpdHkuZmlsdGVyKGZ1bmN0aW9uIChvU2hvd0VudGl0eSkge1xyXG4gICAgICAvLyAgICAgICBjb25zb2xlLmxvZyhcIi4uLlwiKVxyXG4gICAgICAvLyAgICAgIGNvbnNvbGUubG9nKG9TaG93RW50aXR5LmNvbnRleHQudG9vbCArIFwiIFwiICsgb0NvbnRleHQudG9vbCArIFwiXFxuXCIpXHJcbiAgICAgIC8vICAgICAgY29uc29sZS5sb2cob1Nob3dFbnRpdHkuY29udGV4dC5jbGllbnQgKyBcIiBcIiArIG9Db250ZXh0LmNsaWVudCArXCI6XCIgKyBzYW1lT3JTdGFyKG9Db250ZXh0LmNsaWVudCxvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCkgKyBcIlxcblwiKVxyXG4gICAgICAvLyAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkob1Nob3dFbnRpdHkuY29udGV4dCkgKyBcIlxcblwiICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHQuY2xpZW50KSArIFwiXFxuXCIpXHJcblxyXG4gICAgICByZXR1cm4gc2FtZU9yU3RhcihvU2hvd0VudGl0eS5jb250ZXh0LnN5c3RlbUlkLCBvQ29udGV4dC5zeXN0ZW1JZCwgb0NvbnRleHQpICYmXHJcbiAgICAgICAgc2FtZU9yU3RhcihvQ29udGV4dC50b29sLCBvU2hvd0VudGl0eS5jb250ZXh0LnRvb2wsIG9Db250ZXh0KSAmJlxyXG4gICAgICAgIHNhbWVPclN0YXIob0NvbnRleHQuY2xpZW50LCBvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCwgb0NvbnRleHQpICYmXHJcbiAgICAgICAgc2FtZU9yU3RhckVtcHR5KG9Db250ZXh0LnN5c3RlbU9iamVjdENhdGVnb3J5LCBvU2hvd0VudGl0eS5jb250ZXh0LnN5c3RlbU9iamVjdENhdGVnb3J5LCBvQ29udGV4dCkgJiZcclxuICAgICAgICBzYW1lT3JTdGFyRW1wdHkob0NvbnRleHQuc3lzdGVtT2JqZWN0SWQsIG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtT2JqZWN0SWQsIG9Db250ZXh0KVxyXG4gICAgLy8gICAgICAmJiBvU2hvd0VudGl0eS5jb250ZXh0LnRvb2wgPT09IG9Db250ZXh0LnRvb2xcclxuICAgIH0pXHJcbiAgICAvLyAgY29uc29sZS5sb2coYUZpbHRlcmVkLmxlbmd0aClcclxuICAgIC8vIG1hdGNoIG90aGVyIGNvbnRleHQgcGFyYW1ldGVyc1xyXG4gICAgYUZpbHRlcmVkLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcclxuICAgICAgdmFyIG5yTWF0Y2hlc0EgPSBuck1hdGNoZXMoYS5jb250ZXh0LCBvQ29udGV4dClcclxuICAgICAgdmFyIG5yTWF0Y2hlc0IgPSBuck1hdGNoZXMoYi5jb250ZXh0LCBvQ29udGV4dClcclxuICAgICAgdmFyIG5yTm9NYXRjaGVzQSA9IG5yTm9NYXRjaGVzKGEuY29udGV4dCwgb0NvbnRleHQpXHJcbiAgICAgIHZhciBuck5vTWF0Y2hlc0IgPSBuck5vTWF0Y2hlcyhiLmNvbnRleHQsIG9Db250ZXh0KVxyXG4gICAgICAvLyAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGEuY29udGV4dCkpXHJcbiAgICAgIC8vICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYi5jb250ZXh0KSlcclxuICAgICAgLy8gICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShvQ29udGV4dCkpXHJcbiAgICAgIHZhciByZXMgPSAtKG5yTWF0Y2hlc0EgLSBuck1hdGNoZXNCKSAqIDEwMCArIChuck5vTWF0Y2hlc0EgLSBuck5vTWF0Y2hlc0IpXHJcbiAgICAgIC8vICAgICBjb25zb2xlLmxvZyhcImRpZmYgXCIgKyByZXMpXHJcbiAgICAgIHJldHVybiByZXNcclxuICAgIH0pXHJcbiAgICBpZiAoYUZpbHRlcmVkLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICBkZWJ1Z2xvZygnbm8gdGFyZ2V0IGZvciBzaG93RW50aXR5ICcgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dCkpXHJcbiAgICB9XHJcbiAgICAvLyBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhRmlsdGVyZWQsdW5kZWZpbmVkLDIpKVxyXG4gICAgaWYgKGFGaWx0ZXJlZFswXSkge1xyXG4gICAgICAvLyBleGVjdXRlIGFsbCBmdW5jdGlvbnNcclxuXHJcbiAgICAgIHZhciBvTWF0Y2ggPSBhRmlsdGVyZWRbMF1cclxuXHJcbiAgICAgIHZhciBvTWVyZ2VkID0ge1xyXG4gICAgICAgIGNvbnRleHQ6IHtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIG9NZXJnZWQuY29udGV4dCA9IE9iamVjdC5hc3NpZ24oe30sIG9NZXJnZWQuY29udGV4dCwgYUZpbHRlcmVkWzBdLmNvbnRleHQsIG9Db250ZXh0KVxyXG4gICAgICBvTWVyZ2VkID0gT2JqZWN0LmFzc2lnbihvTWVyZ2VkLCB7XHJcbiAgICAgICAgcmVzdWx0OiBhRmlsdGVyZWRbMF0ucmVzdWx0XHJcbiAgICAgIH0pXHJcblxyXG4gICAgICBPYmplY3Qua2V5cyhvTWF0Y2guY29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xyXG4gICAgICAgIGlmICh0eXBlb2Ygb01hdGNoLmNvbnRleHRbc0tleV0gPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgIGRlYnVnbG9nKCdOb3cgcmV0cm9maXR0aW5nIDonICsgc0tleSArICcgLSAnICsgb0NvbnRleHRbc0tleV0pXHJcbiAgICAgICAgICBvTWVyZ2VkID0gb01hdGNoLmNvbnRleHRbc0tleV0ob0NvbnRleHRbc0tleV0sIG9NZXJnZWQpXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG5cclxuICAgICAgcmV0dXJuIG9NZXJnZWRcclxuICAgIH1cclxuICAgIHJldHVybiBudWxsXHJcbiAgfVxyXG5cclxuXHJcbiAgLy8gRTpcXHByb2plY3RzXFxub2RlanNcXGJvdGJ1aWxkZXJcXHNhbXBsZWJvdD5cIiVQcm9ncmFtRmlsZXMoeDg2KSVcXEdvb2dsZVxcQ2hyb21lXFxBcHBsaWNhdGlvblxcY2hyb21lLmV4ZVwiIC0taW5jb2duaXRvIC11cmwgd3d3LnNwaWVnZWwuZGVcclxuXHJcbiAgZXhwb3J0IGNvbnN0IGFiID0ge1xyXG4gICAgX3Rlc3Q6IHtcclxuICAgICAgc2FtZU9yU3Rhcjogc2FtZU9yU3RhcixcclxuICAgICAgbnJNYXRjaGVzOiBuck1hdGNoZXMsXHJcbiAgICAgIG5yTm9NYXRjaGVzOiBuck5vTWF0Y2hlcyxcclxuICAgICAgZXhwYW5kUGFyYW1ldGVyc0luVVJMOiBleHBhbmRQYXJhbWV0ZXJzSW5VUkwsXHJcbiAgICAgIGZpbHRlclNob3dFbnRpdHk6IGZpbHRlclNob3dFbnRpdHksXHJcbiAgICAgIGZuRmluZFVuaXRUZXN0OiBmbkZpbmRVbml0VGVzdCxcclxuICAgICAgY2FsY0Rpc3RhbmNlOiBjYWxjRGlzdGFuY2UsXHJcbiAgICAgIF9hU2hvd0VudGl0eUFjdGlvbnM6IGFTaG93RW50aXR5QWN0aW9uc1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy9leHBvcnRzIGRpc3BhdGNoZXI7XHJcblxyXG4gIC8vbW9kdWxlLmV4cG9ydHMgPSBkaXNwYXRjaGVyXHJcblxyXG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vbGliL25vZGUtNC5kLnRzXCIgLz5cblwidXNlIHN0cmljdFwiO1xuLyoqXG4gKiB0aGUgaW5wdXQgZmlsdGVyIHN0YWdlIHByZXByb2Nlc3NlcyBhIGN1cnJlbnQgY29udGV4dFxuICpcbiAqIEl0IGEpIGNvbWJpbmVzIG11bHRpLXNlZ21lbnQgYXJndW1lbnRzIGludG8gb25lIGNvbnRleHQgbWVtYmVyc1xuICogSXQgYikgYXR0ZW1wdHMgdG8gYXVnbWVudCB0aGUgY29udGV4dCBieSBhZGRpdGlvbmFsIHF1YWxpZmljYXRpb25zXG4gKiAgICAgICAgICAgKE1pZCB0ZXJtIGdlbmVyYXRpbmcgQWx0ZXJuYXRpdmVzLCBlLmcuXG4gKiAgICAgICAgICAgICAgICAgQ2xpZW50U2lkZVRhcmdldFJlc29sdXRpb24gLT4gdW5pdCB0ZXN0P1xuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHNvdXJjZSA/XG4gKiAgICAgICAgICAgKVxuICogIFNpbXBsZSBydWxlcyBsaWtlICBJbnRlbnRcbiAqXG4gKlxuICogQG1vZHVsZVxuICogQGZpbGUgaW5wdXRGaWx0ZXIudHNcbiAqL1xuY29uc3QgZGlzdGFuY2UgPSByZXF1aXJlKCcuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4nKTtcbmNvbnN0IGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKTtcbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ2lucHV0RmlsdGVyJyk7XG5jb25zdCBtYXRjaGRhdGEgPSByZXF1aXJlKCcuL21hdGNoZGF0YScpO1xudmFyIG9Vbml0VGVzdHMgPSBtYXRjaGRhdGEub1VuaXRUZXN0cztcbmZ1bmN0aW9uIGNhbGNEaXN0YW5jZShzVGV4dDEsIHNUZXh0Mikge1xuICAgIC8vIGNvbnNvbGUubG9nKFwibGVuZ3RoMlwiICsgc1RleHQxICsgXCIgLSBcIiArIHNUZXh0MilcbiAgICB2YXIgYTAgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEuc3Vic3RyaW5nKDAsIHNUZXh0Mi5sZW5ndGgpLCBzVGV4dDIpO1xuICAgIHZhciBhID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnRvTG93ZXJDYXNlKCksIHNUZXh0Mik7XG4gICAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGE7XG59XG5mdW5jdGlvbiBmbkZpbmRNYXRjaChzS2V5d29yZCwgb0NvbnRleHQsIG9NYXApIHtcbiAgICAvLyByZXR1cm4gYSBiZXR0ZXIgY29udGV4dCBpZiB0aGVyZSBpcyBhIG1hdGNoXG4gICAgb01hcC5zb3J0KGZ1bmN0aW9uIChvRW50cnkxLCBvRW50cnkyKSB7XG4gICAgICAgIHZhciB1MSA9IGNhbGNEaXN0YW5jZShvRW50cnkxLmtleS50b0xvd2VyQ2FzZSgpLCBzS2V5d29yZCk7XG4gICAgICAgIHZhciB1MiA9IGNhbGNEaXN0YW5jZShvRW50cnkyLmtleS50b0xvd2VyQ2FzZSgpLCBzS2V5d29yZCk7XG4gICAgICAgIHJldHVybiB1MSAtIHUyO1xuICAgIH0pO1xuICAgIC8vIGxhdGVyOiBpbiBjYXNlIG9mIGNvbmZsaWN0cywgYXNrLFxuICAgIC8vIG5vdzpcbiAgICB2YXIgZGlzdCA9IGNhbGNEaXN0YW5jZShvTWFwWzBdLmtleS50b0xvd2VyQ2FzZSgpLCBzS2V5d29yZCk7XG4gICAgZGVidWdsb2coJ2Jlc3QgZGlzdCcgKyBkaXN0ICsgJyAvICAnICsgZGlzdCAqIHNLZXl3b3JkLmxlbmd0aCArICcgJyArIHNLZXl3b3JkKTtcbiAgICBpZiAoZGlzdCA8IDE1MCkge1xuICAgICAgICB2YXIgbzEgPSBPYmplY3QuYXNzaWduKHt9LCBvQ29udGV4dCk7XG4gICAgICAgIHZhciBvMjtcbiAgICAgICAgbzEuY29udGV4dCA9IE9iamVjdC5hc3NpZ24oe30sIG8xLmNvbnRleHQpO1xuICAgICAgICBvMiA9IG8xO1xuICAgICAgICBvMi5jb250ZXh0ID0gT2JqZWN0LmFzc2lnbihvMS5jb250ZXh0LCBvTWFwWzBdLmNvbnRleHQpO1xuICAgICAgICByZXR1cm4gbzI7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuLyoqXG4gKiBhIGZ1bmN0aW9uIHRvIG1hdGNoIGEgdW5pdCB0ZXN0IHVzaW5nIGxldmVuc2h0ZWluIGRpc3RhbmNlc1xuICogQHB1YmxpY1xuICovXG5mdW5jdGlvbiBmbkZpbmRVbml0VGVzdChzc3lzdGVtT2JqZWN0SWQsIG9Db250ZXh0KSB7XG4gICAgcmV0dXJuIGZuRmluZE1hdGNoKHNzeXN0ZW1PYmplY3RJZCwgb0NvbnRleHQsIG9Vbml0VGVzdHMpO1xufVxuKGZ1bmN0aW9uIChFbnVtUnVsZVR5cGUpIHtcbiAgICBFbnVtUnVsZVR5cGVbRW51bVJ1bGVUeXBlW1wiV09SRFwiXSA9IDBdID0gXCJXT1JEXCI7XG4gICAgRW51bVJ1bGVUeXBlW0VudW1SdWxlVHlwZVtcIlJFR0VYUFwiXSA9IDFdID0gXCJSRUdFWFBcIjtcbn0pKGV4cG9ydHMuRW51bVJ1bGVUeXBlIHx8IChleHBvcnRzLkVudW1SdWxlVHlwZSA9IHt9KSk7XG52YXIgRW51bVJ1bGVUeXBlID0gZXhwb3J0cy5FbnVtUnVsZVR5cGU7XG5mdW5jdGlvbiBub25Qcml2YXRlS2V5cyhvQSkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhvQSkuZmlsdGVyKGtleSA9PiB7XG4gICAgICAgIHJldHVybiBrZXlbMF0gIT09ICdfJztcbiAgICB9KTtcbn1cbmZ1bmN0aW9uIGNvdW50QWluQihvQSwgb0IsIGZuQ29tcGFyZSwgYUtleUlnbm9yZSkge1xuICAgIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gYUtleUlnbm9yZSA6XG4gICAgICAgIHR5cGVvZiBhS2V5SWdub3JlID09PSBcInN0cmluZ1wiID8gW2FLZXlJZ25vcmVdIDogW107XG4gICAgZm5Db21wYXJlID0gZm5Db21wYXJlIHx8IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH07XG4gICAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xuICAgIH0pLlxuICAgICAgICByZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9CLCBrZXkpKSB7XG4gICAgICAgICAgICBwcmV2ID0gcHJldiArIChmbkNvbXBhcmUob0Fba2V5XSwgb0Jba2V5XSwga2V5KSA/IDEgOiAwKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbn1cbmV4cG9ydHMuY291bnRBaW5CID0gY291bnRBaW5CO1xuZnVuY3Rpb24gc3B1cmlvdXNBbm90SW5CKG9BLCBvQiwgYUtleUlnbm9yZSkge1xuICAgIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gYUtleUlnbm9yZSA6XG4gICAgICAgIHR5cGVvZiBhS2V5SWdub3JlID09PSBcInN0cmluZ1wiID8gW2FLZXlJZ25vcmVdIDogW107XG4gICAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xuICAgIH0pLlxuICAgICAgICByZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xuICAgICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xuICAgICAgICAgICAgcHJldiA9IHByZXYgKyAxO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIDApO1xufVxuZXhwb3J0cy5zcHVyaW91c0Fub3RJbkIgPSBzcHVyaW91c0Fub3RJbkI7XG5mdW5jdGlvbiBsb3dlckNhc2Uobykge1xuICAgIGlmICh0eXBlb2YgbyA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICByZXR1cm4gby50b0xvd2VyQ2FzZSgpO1xuICAgIH1cbiAgICByZXR1cm4gbztcbn1cbmZ1bmN0aW9uIGNvbXBhcmVDb250ZXh0KG9BLCBvQiwgYUtleUlnbm9yZSkge1xuICAgIHZhciBlcXVhbCA9IGNvdW50QWluQihvQSwgb0IsIGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBsb3dlckNhc2UoYSkgPT09IGxvd2VyQ2FzZShiKTsgfSwgYUtleUlnbm9yZSk7XG4gICAgdmFyIGRpZmZlcmVudCA9IGNvdW50QWluQihvQSwgb0IsIGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBsb3dlckNhc2UoYSkgIT09IGxvd2VyQ2FzZShiKTsgfSwgYUtleUlnbm9yZSk7XG4gICAgdmFyIHNwdXJpb3VzTCA9IHNwdXJpb3VzQW5vdEluQihvQSwgb0IsIGFLZXlJZ25vcmUpO1xuICAgIHZhciBzcHVyaW91c1IgPSBzcHVyaW91c0Fub3RJbkIob0IsIG9BLCBhS2V5SWdub3JlKTtcbiAgICByZXR1cm4ge1xuICAgICAgICBlcXVhbDogZXF1YWwsXG4gICAgICAgIGRpZmZlcmVudDogZGlmZmVyZW50LFxuICAgICAgICBzcHVyaW91c0w6IHNwdXJpb3VzTCxcbiAgICAgICAgc3B1cmlvdXNSOiBzcHVyaW91c1JcbiAgICB9O1xufVxuZXhwb3J0cy5jb21wYXJlQ29udGV4dCA9IGNvbXBhcmVDb250ZXh0O1xuLyoqXG4gKlxuICogT3B0aW9ucyBtYXkgYmUge1xuICogbWF0Y2hvdGhlcnMgOiB0cnVlLCAgPT4gb25seSBydWxlcyB3aGVyZSBhbGwgb3RoZXJzIG1hdGNoIGFyZSBjb25zaWRlcmVkXG4gKiBhdWdtZW50IDogdHJ1ZSxcbiAqIG92ZXJyaWRlIDogdHJ1ZSB9ICA9PlxuICpcbiAqL1xuZnVuY3Rpb24gbWF0Y2hXb3JkKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBzMSA9IGNvbnRleHRbb1J1bGUua2V5XS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciBzMiA9IG9SdWxlLndvcmQudG9Mb3dlckNhc2UoKTtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB2YXIgZGVsdGEgPSBjb21wYXJlQ29udGV4dChjb250ZXh0LCBvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlbHRhKSk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkob3B0aW9ucykpO1xuICAgIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgYyA9IGNhbGNEaXN0YW5jZShzMiwgczEpO1xuICAgIGRlYnVnbG9nKFwiIHMxIDw+IHMyIFwiICsgczEgKyBcIjw+XCIgKyBzMiArIFwiICA9PjogXCIgKyBjKTtcbiAgICBpZiAoYyA8IDE1MCkge1xuICAgICAgICB2YXIgcmVzID0gT2JqZWN0LmFzc2lnbih7fSwgb1J1bGUuZm9sbG93cyk7XG4gICAgICAgIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcbiAgICAgICAgaWYgKG9wdGlvbnMub3ZlcnJpZGUpIHtcbiAgICAgICAgICAgIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBvUnVsZS5mb2xsb3dzKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBmb3JjZSBrZXkgcHJvcGVydHlcbiAgICAgICAgLy8gY29uc29sZS5sb2coJyBvYmplY3RjYXRlZ29yeScsIHJlc1snc3lzdGVtT2JqZWN0Q2F0ZWdvcnknXSk7XG4gICAgICAgIHJlc1tvUnVsZS5rZXldID0gb1J1bGUuZm9sbG93c1tvUnVsZS5rZXldIHx8IHJlc1tvUnVsZS5rZXldO1xuICAgICAgICByZXMuX3dlaWdodCA9IE9iamVjdC5hc3NpZ24oe30sIHJlcy5fd2VpZ2h0KTtcbiAgICAgICAgcmVzLl93ZWlnaHRbb1J1bGUua2V5XSA9IGM7XG4gICAgICAgIE9iamVjdC5mcmVlemUocmVzKTtcbiAgICAgICAgZGVidWdsb2coJ0ZvdW5kIG9uZScgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xufVxuZXhwb3J0cy5tYXRjaFdvcmQgPSBtYXRjaFdvcmQ7XG5mdW5jdGlvbiBleHRyYWN0QXJnc01hcChtYXRjaCwgYXJnc01hcCkge1xuICAgIHZhciByZXMgPSB7fTtcbiAgICBpZiAoIWFyZ3NNYXApIHtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG4gICAgT2JqZWN0LmtleXMoYXJnc01hcCkuZm9yRWFjaChmdW5jdGlvbiAoaUtleSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBtYXRjaFtpS2V5XTtcbiAgICAgICAgdmFyIGtleSA9IGFyZ3NNYXBbaUtleV07XG4gICAgICAgIGlmICgodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKSAmJiB2YWx1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXNba2V5XSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMuZXh0cmFjdEFyZ3NNYXAgPSBleHRyYWN0QXJnc01hcDtcbmZ1bmN0aW9uIG1hdGNoUmVnRXhwKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBzS2V5ID0gb1J1bGUua2V5O1xuICAgIHZhciBzMSA9IGNvbnRleHRbb1J1bGUua2V5XS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciByZWcgPSBvUnVsZS5yZWdleHA7XG4gICAgdmFyIG0gPSByZWcuZXhlYyhzMSk7XG4gICAgZGVidWdsb2coXCJhcHBseWluZyByZWdleHA6IFwiICsgczEgKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KG0pKTtcbiAgICBpZiAoIW0pIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCwgb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcbiAgICBpZiAob3B0aW9ucy5tYXRjaG90aGVycyAmJiAoZGVsdGEuZGlmZmVyZW50ID4gMCkpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIG9FeHRyYWN0ZWRDb250ZXh0ID0gZXh0cmFjdEFyZ3NNYXAobSwgb1J1bGUuYXJnc01hcCk7XG4gICAgZGVidWdsb2coXCJleHRyYWN0ZWQgYXJncyBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLmFyZ3NNYXApKTtcbiAgICBkZWJ1Z2xvZyhcIm1hdGNoIFwiICsgSlNPTi5zdHJpbmdpZnkobSkpO1xuICAgIGRlYnVnbG9nKFwiZXh0cmFjdGVkIGFyZ3MgXCIgKyBKU09OLnN0cmluZ2lmeShvRXh0cmFjdGVkQ29udGV4dCkpO1xuICAgIHZhciByZXMgPSBPYmplY3QuYXNzaWduKHt9LCBvUnVsZS5mb2xsb3dzKTtcbiAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpO1xuICAgIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcbiAgICBpZiAob0V4dHJhY3RlZENvbnRleHRbc0tleV0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXNbc0tleV0gPSBvRXh0cmFjdGVkQ29udGV4dFtzS2V5XTtcbiAgICB9XG4gICAgaWYgKG9wdGlvbnMub3ZlcnJpZGUpIHtcbiAgICAgICAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xuICAgICAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpO1xuICAgIH1cbiAgICBPYmplY3QuZnJlZXplKHJlcyk7XG4gICAgZGVidWdsb2coJ0ZvdW5kIG9uZScgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLm1hdGNoUmVnRXhwID0gbWF0Y2hSZWdFeHA7XG5mdW5jdGlvbiBzb3J0QnlXZWlnaHQoc0tleSwgb0NvbnRleHRBLCBvQ29udGV4dEIpIHtcbiAgICBkZWJ1Z2xvZygnc29ydGluZzogJyArIHNLZXkgKyAnaW52b2tlZCB3aXRoXFxuIDE6JyArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QSwgdW5kZWZpbmVkLCAyKSArXG4gICAgICAgIFwiIHZzIFxcbiAyOlwiICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHRCLCB1bmRlZmluZWQsIDIpKTtcbiAgICB2YXIgcmFua2luZ0EgPSBwYXJzZUZsb2F0KG9Db250ZXh0QVtcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcbiAgICB2YXIgcmFua2luZ0IgPSBwYXJzZUZsb2F0KG9Db250ZXh0QltcIl9yYW5raW5nXCJdIHx8IFwiMVwiKTtcbiAgICBpZiAocmFua2luZ0EgIT09IHJhbmtpbmdCKSB7XG4gICAgICAgIGRlYnVnbG9nKFwiIHJhbmtpbiBkZWx0YVwiICsgMTAwICogKHJhbmtpbmdCIC0gcmFua2luZ0EpKTtcbiAgICAgICAgcmV0dXJuIDEwMCAqIChyYW5raW5nQiAtIHJhbmtpbmdBKTtcbiAgICB9XG4gICAgdmFyIHdlaWdodEEgPSBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QVtcIl93ZWlnaHRcIl1bc0tleV0gfHwgMDtcbiAgICB2YXIgd2VpZ2h0QiA9IG9Db250ZXh0QltcIl93ZWlnaHRcIl0gJiYgb0NvbnRleHRCW1wiX3dlaWdodFwiXVtzS2V5XSB8fCAwO1xuICAgIHJldHVybiArKHdlaWdodEEgLSB3ZWlnaHRCKTtcbn1cbmV4cG9ydHMuc29ydEJ5V2VpZ2h0ID0gc29ydEJ5V2VpZ2h0O1xuLy8gV29yZCwgU3lub255bSwgUmVnZXhwIC8gRXh0cmFjdGlvblJ1bGVcbmZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBvUnVsZXMsIG9wdGlvbnMpIHtcbiAgICB2YXIgc0tleSA9IG9SdWxlc1swXS5rZXk7XG4gICAgLy8gY2hlY2sgdGhhdCBydWxlXG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgLy8gY2hlY2sgY29uc2lzdGVuY3lcbiAgICAgICAgb1J1bGVzLmV2ZXJ5KGZ1bmN0aW9uIChpUnVsZSkge1xuICAgICAgICAgICAgaWYgKGlSdWxlLmtleSAhPT0gc0tleSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkluaG9tb2dlbm91cyBrZXlzIGluIHJ1bGVzLCBleHBlY3RlZCBcIiArIHNLZXkgKyBcIiB3YXMgXCIgKyBKU09OLnN0cmluZ2lmeShpUnVsZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBsb29rIGZvciBydWxlcyB3aGljaCBtYXRjaFxuICAgIHZhciByZXMgPSBvUnVsZXMubWFwKGZ1bmN0aW9uIChvUnVsZSkge1xuICAgICAgICAvLyBpcyB0aGlzIHJ1bGUgYXBwbGljYWJsZVxuICAgICAgICBzd2l0Y2ggKG9SdWxlLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgMCAvKiBXT1JEICovOlxuICAgICAgICAgICAgICAgIHJldHVybiBtYXRjaFdvcmQob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgY2FzZSAxIC8qIFJFR0VYUCAqLzpcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2hSZWdFeHAob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSkuZmlsdGVyKGZ1bmN0aW9uIChvcmVzKSB7XG4gICAgICAgIHJldHVybiAhIW9yZXM7XG4gICAgfSkuc29ydChzb3J0QnlXZWlnaHQuYmluZCh0aGlzLCBzS2V5KSk7XG4gICAgcmV0dXJuIHJlcztcbiAgICAvLyBPYmplY3Qua2V5cygpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAvLyB9KTtcbn1cbmV4cG9ydHMuYXVnbWVudENvbnRleHQxID0gYXVnbWVudENvbnRleHQxO1xuZnVuY3Rpb24gYXVnbWVudENvbnRleHQoY29udGV4dCwgYVJ1bGVzKSB7XG4gICAgdmFyIG9wdGlvbnMxID0ge1xuICAgICAgICBtYXRjaG90aGVyczogdHJ1ZSxcbiAgICAgICAgb3ZlcnJpZGU6IGZhbHNlXG4gICAgfTtcbiAgICB2YXIgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMxKTtcbiAgICBpZiAoYVJlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdmFyIG9wdGlvbnMyID0ge1xuICAgICAgICAgICAgbWF0Y2hvdGhlcnM6IGZhbHNlLFxuICAgICAgICAgICAgb3ZlcnJpZGU6IHRydWVcbiAgICAgICAgfTtcbiAgICAgICAgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMyKTtcbiAgICB9XG4gICAgcmV0dXJuIGFSZXM7XG59XG5leHBvcnRzLmF1Z21lbnRDb250ZXh0ID0gYXVnbWVudENvbnRleHQ7XG5mdW5jdGlvbiBpbnNlcnRPcmRlcmVkKHJlc3VsdCwgaUluc2VydGVkTWVtYmVyLCBsaW1pdCkge1xuICAgIC8vIFRPRE86IHVzZSBzb21lIHdlaWdodFxuICAgIGlmIChyZXN1bHQubGVuZ3RoIDwgbGltaXQpIHtcbiAgICAgICAgcmVzdWx0LnB1c2goaUluc2VydGVkTWVtYmVyKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cbmV4cG9ydHMuaW5zZXJ0T3JkZXJlZCA9IGluc2VydE9yZGVyZWQ7XG5mdW5jdGlvbiB0YWtlVG9wTihhcnIpIHtcbiAgICB2YXIgdSA9IGFyci5maWx0ZXIoZnVuY3Rpb24gKGlubmVyQXJyKSB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwOyB9KTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgLy8gc2hpZnQgb3V0IHRoZSB0b3Agb25lc1xuICAgIHUgPSB1Lm1hcChmdW5jdGlvbiAoaUFycikge1xuICAgICAgICB2YXIgdG9wID0gaUFyci5zaGlmdCgpO1xuICAgICAgICByZXMgPSBpbnNlcnRPcmRlcmVkKHJlcywgdG9wLCA1KTtcbiAgICAgICAgcmV0dXJuIGlBcnI7XG4gICAgfSkuZmlsdGVyKGZ1bmN0aW9uIChpbm5lckFycikgeyByZXR1cm4gaW5uZXJBcnIubGVuZ3RoID4gMDsgfSk7XG4gICAgLy8gYXMgQXJyYXk8QXJyYXk8SUZNYXRjaC5jb250ZXh0Pj5cbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy50YWtlVG9wTiA9IHRha2VUb3BOO1xuY29uc3QgaW5wdXRGaWx0ZXJSdWxlcyA9IHJlcXVpcmUoJy4vaW5wdXRGaWx0ZXJSdWxlcycpO1xuZnVuY3Rpb24gYXBwbHlSdWxlcyhjb250ZXh0KSB7XG4gICAgdmFyIGJlc3ROID0gW2NvbnRleHRdO1xuICAgIGlucHV0RmlsdGVyUnVsZXMub0tleU9yZGVyLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgICAgdmFyIGJlc3ROZXh0ID0gW107XG4gICAgICAgIGJlc3ROLmZvckVhY2goZnVuY3Rpb24gKG9Db250ZXh0KSB7XG4gICAgICAgICAgICBpZiAob0NvbnRleHRbc0tleV0pIHtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZygnKiogYXBwbHlpbmcgcnVsZXMgZm9yICcgKyBzS2V5KTtcbiAgICAgICAgICAgICAgICB2YXIgcmVzID0gYXVnbWVudENvbnRleHQob0NvbnRleHQsIGlucHV0RmlsdGVyUnVsZXMub1J1bGVNYXBbc0tleV0gfHwgW10pO1xuICAgICAgICAgICAgICAgIGRlYnVnbG9nKCcqKiByZXN1bHQgZm9yICcgKyBzS2V5ICsgJyA9ICcgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgICAgICAgICAgIGJlc3ROZXh0LnB1c2gocmVzIHx8IFtdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIHJ1bGUgbm90IHJlbGV2YW50XG4gICAgICAgICAgICAgICAgYmVzdE5leHQucHVzaChbb0NvbnRleHRdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGJlc3ROID0gdGFrZVRvcE4oYmVzdE5leHQpO1xuICAgIH0pO1xuICAgIHJldHVybiBiZXN0Tjtcbn1cbmV4cG9ydHMuYXBwbHlSdWxlcyA9IGFwcGx5UnVsZXM7XG5mdW5jdGlvbiBhcHBseVJ1bGVzUGlja0ZpcnN0KGNvbnRleHQpIHtcbiAgICB2YXIgciA9IGFwcGx5UnVsZXMoY29udGV4dCk7XG4gICAgcmV0dXJuIHIgJiYgclswXTtcbn1cbmV4cG9ydHMuYXBwbHlSdWxlc1BpY2tGaXJzdCA9IGFwcGx5UnVsZXNQaWNrRmlyc3Q7XG4vKipcbiAqIERlY2lkZSB3aGV0aGVyIHRvIHJlcXVlcnkgZm9yIGEgY29udGV0XG4gKi9cbmZ1bmN0aW9uIGRlY2lkZU9uUmVRdWVyeShjb250ZXh0KSB7XG4gICAgcmV0dXJuIFtdO1xufVxuZXhwb3J0cy5kZWNpZGVPblJlUXVlcnkgPSBkZWNpZGVPblJlUXVlcnk7XG52YXIgYVNob3dFbnRpdHlBY3Rpb25zID0gW1xuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtSWQ6ICd1djInLFxuICAgICAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXG4gICAgICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscCdcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1djIud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3VpMi91c2hlbGwvc2hlbGxzL2FiYXAvRmlvcmlMYXVuY2hwYWQuaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbUlkOiAndXYyJyxcbiAgICAgICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxuICAgICAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHBkJ1xuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXV2Mi53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvc2FwL2Fyc3J2Y191cGJfYWRtbi9tYWluLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1JZDogJ3UxeScsXG4gICAgICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcbiAgICAgICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwJ1xuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXUxeS53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvdWkyL3VzaGVsbC9zaGVsbHMvYWJhcC9GaW9yaUxhdW5jaHBhZC5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtSWQ6ICd1MXknLFxuICAgICAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXG4gICAgICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscGQnXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdTF5LndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS9zYXAvYXJzcnZjX3VwYl9hZG1uL21haW4uaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbUlkOiAndXYyJyxcbiAgICAgICAgICAgIGNsaWVudDogJzEyMCcsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ2NhdGFsb2cnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IC8uKi8sXG4gICAgICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXG4gICAgICAgICAgICB0b29sOiAnRkxQRCdcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1djIud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3NhcC9hcnNydmNfdXBiX2FkbW4vbWFpbi5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0jQ0FUQUxPRzp7c3lzdGVtT2JqZWN0SWR9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAndW5pdCcsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogZm5GaW5kVW5pdFRlc3RcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwOi8vbG9jYWxob3N0OjgwODAve3BhdGh9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAnd2lraScsXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly93aWtpLndkZi5zYXAuY29ycC97cGF0aH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtSWQ6ICdKSVJBJ1xuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vamlyYS53ZGYuc2FwLmNvcnA6ODA4MC9USVBDT1JFVUlJSSdcbiAgICAgICAgfVxuICAgIH1cbl07XG4vLyBpZiBUT09MID0gSklSQSB8fCBTeXN0ZW1JZCA9IEpJUkEgLT4gU3lzdGVtSWQgPSBKSVJBXG4vL1xuLy9cbi8vIHN0YXJ0U0FQR1VJXG4vLyAgIE46XFw+XCJjOlxcUHJvZ3JhbSBGaWxlcyAoeDg2KVxcU0FQXFxGcm9udEVuZFxcU0FQZ3VpXCJcXHNhcHNoY3V0LmV4ZSAgLXN5c3RlbT1VVjIgLWNsaWVudD0xMjAgLWNvbW1hbmQ9U0UzOCAtdHlwZT1UcmFuc2FjdGlvbiAtdXNlcj1BVVNFUlxuZnVuY3Rpb24gZXhwYW5kUGFyYW1ldGVyc0luVVJMKG9NZXJnZWRDb250ZXh0UmVzdWx0KSB7XG4gICAgdmFyIHB0biA9IG9NZXJnZWRDb250ZXh0UmVzdWx0LnJlc3VsdC5wYXR0ZXJuO1xuICAgIE9iamVjdC5rZXlzKG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cCgneycgKyBzS2V5ICsgJ30nLCAnZycpO1xuICAgICAgICBwdG4gPSBwdG4ucmVwbGFjZShyZWdleCwgb01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dFtzS2V5XSk7XG4gICAgICAgIHB0biA9IHB0bi5yZXBsYWNlKHJlZ2V4LCBvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0W3NLZXldKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcHRuO1xufVxuZnVuY3Rpb24gbnJNYXRjaGVzKGFPYmplY3QsIG9Db250ZXh0KSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKGFPYmplY3QpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0NvbnRleHQsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbn1cbmZ1bmN0aW9uIG5yTm9NYXRjaGVzKGFPYmplY3QsIG9Db250ZXh0KSB7XG4gICAgdmFyIG5vTWF0Y2hBID0gT2JqZWN0LmtleXMoYU9iamVjdCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0NvbnRleHQsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbiAgICB2YXIgbm9NYXRjaEIgPSBPYmplY3Qua2V5cyhvQ29udGV4dCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYU9iamVjdCwga2V5KSkge1xuICAgICAgICAgICAgcHJldiA9IHByZXYgKyAxO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIDApO1xuICAgIHJldHVybiBub01hdGNoQSArIG5vTWF0Y2hCO1xufVxuZnVuY3Rpb24gc2FtZU9yU3RhcihzMSwgczIsIG9FbnRpdHkpIHtcbiAgICByZXR1cm4gczEgPT09IHMyIHx8XG4gICAgICAgIChzMSA9PT0gdW5kZWZpbmVkICYmIHMyID09PSBudWxsKSB8fFxuICAgICAgICAoKHMyIGluc3RhbmNlb2YgUmVnRXhwKSAmJiBzMi5leGVjKHMxKSAhPT0gbnVsbCkgfHxcbiAgICAgICAgKCh0eXBlb2YgczIgPT09ICdmdW5jdGlvbicgJiYgczEpICYmIHMyKHMxLCBvRW50aXR5KSk7XG59XG5mdW5jdGlvbiBzYW1lT3JTdGFyRW1wdHkoczEsIHMyLCBvRW50aXR5KSB7XG4gICAgaWYgKHMxID09PSB1bmRlZmluZWQgJiYgczIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHMyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBzMSA9PT0gczIgfHxcbiAgICAgICAgKChzMiBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgczIuZXhlYyhzMSkgIT09IG51bGwpIHx8XG4gICAgICAgICgodHlwZW9mIHMyID09PSAnZnVuY3Rpb24nICYmIHMxKSAmJiBzMihzMSwgb0VudGl0eSkpO1xufVxuZnVuY3Rpb24gZmlsdGVyU2hvd0VudGl0eShvQ29udGV4dCwgYVNob3dFbnRpdHkpIHtcbiAgICB2YXIgYUZpbHRlcmVkO1xuICAgIE9iamVjdC5rZXlzKG9Db250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgICAgIGlmIChvQ29udGV4dFtzS2V5XSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgb0NvbnRleHRbc0tleV0gPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBhRmlsdGVyZWQgPSBhU2hvd0VudGl0eS5maWx0ZXIoZnVuY3Rpb24gKG9TaG93RW50aXR5KSB7XG4gICAgICAgIC8vICAgICAgIGNvbnNvbGUubG9nKFwiLi4uXCIpXG4gICAgICAgIC8vICAgICAgY29uc29sZS5sb2cob1Nob3dFbnRpdHkuY29udGV4dC50b29sICsgXCIgXCIgKyBvQ29udGV4dC50b29sICsgXCJcXG5cIilcbiAgICAgICAgLy8gICAgICBjb25zb2xlLmxvZyhvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCArIFwiIFwiICsgb0NvbnRleHQuY2xpZW50ICtcIjpcIiArIHNhbWVPclN0YXIob0NvbnRleHQuY2xpZW50LG9TaG93RW50aXR5LmNvbnRleHQuY2xpZW50KSArIFwiXFxuXCIpXG4gICAgICAgIC8vICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShvU2hvd0VudGl0eS5jb250ZXh0KSArIFwiXFxuXCIgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dC5jbGllbnQpICsgXCJcXG5cIilcbiAgICAgICAgcmV0dXJuIHNhbWVPclN0YXIob1Nob3dFbnRpdHkuY29udGV4dC5zeXN0ZW1JZCwgb0NvbnRleHQuc3lzdGVtSWQsIG9Db250ZXh0KSAmJlxuICAgICAgICAgICAgc2FtZU9yU3RhcihvQ29udGV4dC50b29sLCBvU2hvd0VudGl0eS5jb250ZXh0LnRvb2wsIG9Db250ZXh0KSAmJlxuICAgICAgICAgICAgc2FtZU9yU3RhcihvQ29udGV4dC5jbGllbnQsIG9TaG93RW50aXR5LmNvbnRleHQuY2xpZW50LCBvQ29udGV4dCkgJiZcbiAgICAgICAgICAgIHNhbWVPclN0YXJFbXB0eShvQ29udGV4dC5zeXN0ZW1PYmplY3RDYXRlZ29yeSwgb1Nob3dFbnRpdHkuY29udGV4dC5zeXN0ZW1PYmplY3RDYXRlZ29yeSwgb0NvbnRleHQpICYmXG4gICAgICAgICAgICBzYW1lT3JTdGFyRW1wdHkob0NvbnRleHQuc3lzdGVtT2JqZWN0SWQsIG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtT2JqZWN0SWQsIG9Db250ZXh0KTtcbiAgICAgICAgLy8gICAgICAmJiBvU2hvd0VudGl0eS5jb250ZXh0LnRvb2wgPT09IG9Db250ZXh0LnRvb2xcbiAgICB9KTtcbiAgICAvLyAgY29uc29sZS5sb2coYUZpbHRlcmVkLmxlbmd0aClcbiAgICAvLyBtYXRjaCBvdGhlciBjb250ZXh0IHBhcmFtZXRlcnNcbiAgICBhRmlsdGVyZWQuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICB2YXIgbnJNYXRjaGVzQSA9IG5yTWF0Y2hlcyhhLmNvbnRleHQsIG9Db250ZXh0KTtcbiAgICAgICAgdmFyIG5yTWF0Y2hlc0IgPSBuck1hdGNoZXMoYi5jb250ZXh0LCBvQ29udGV4dCk7XG4gICAgICAgIHZhciBuck5vTWF0Y2hlc0EgPSBuck5vTWF0Y2hlcyhhLmNvbnRleHQsIG9Db250ZXh0KTtcbiAgICAgICAgdmFyIG5yTm9NYXRjaGVzQiA9IG5yTm9NYXRjaGVzKGIuY29udGV4dCwgb0NvbnRleHQpO1xuICAgICAgICAvLyAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGEuY29udGV4dCkpXG4gICAgICAgIC8vICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYi5jb250ZXh0KSlcbiAgICAgICAgLy8gICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShvQ29udGV4dCkpXG4gICAgICAgIHZhciByZXMgPSAtKG5yTWF0Y2hlc0EgLSBuck1hdGNoZXNCKSAqIDEwMCArIChuck5vTWF0Y2hlc0EgLSBuck5vTWF0Y2hlc0IpO1xuICAgICAgICAvLyAgICAgY29uc29sZS5sb2coXCJkaWZmIFwiICsgcmVzKVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH0pO1xuICAgIGlmIChhRmlsdGVyZWQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGRlYnVnbG9nKCdubyB0YXJnZXQgZm9yIHNob3dFbnRpdHkgJyArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0KSk7XG4gICAgfVxuICAgIC8vIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGFGaWx0ZXJlZCx1bmRlZmluZWQsMikpXG4gICAgaWYgKGFGaWx0ZXJlZFswXSkge1xuICAgICAgICAvLyBleGVjdXRlIGFsbCBmdW5jdGlvbnNcbiAgICAgICAgdmFyIG9NYXRjaCA9IGFGaWx0ZXJlZFswXTtcbiAgICAgICAgdmFyIG9NZXJnZWQgPSB7XG4gICAgICAgICAgICBjb250ZXh0OiB7fVxuICAgICAgICB9O1xuICAgICAgICBvTWVyZ2VkLmNvbnRleHQgPSBPYmplY3QuYXNzaWduKHt9LCBvTWVyZ2VkLmNvbnRleHQsIGFGaWx0ZXJlZFswXS5jb250ZXh0LCBvQ29udGV4dCk7XG4gICAgICAgIG9NZXJnZWQgPSBPYmplY3QuYXNzaWduKG9NZXJnZWQsIHtcbiAgICAgICAgICAgIHJlc3VsdDogYUZpbHRlcmVkWzBdLnJlc3VsdFxuICAgICAgICB9KTtcbiAgICAgICAgT2JqZWN0LmtleXMob01hdGNoLmNvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb01hdGNoLmNvbnRleHRbc0tleV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZygnTm93IHJldHJvZml0dGluZyA6JyArIHNLZXkgKyAnIC0gJyArIG9Db250ZXh0W3NLZXldKTtcbiAgICAgICAgICAgICAgICBvTWVyZ2VkID0gb01hdGNoLmNvbnRleHRbc0tleV0ob0NvbnRleHRbc0tleV0sIG9NZXJnZWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG9NZXJnZWQ7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuLy8gRTpcXHByb2plY3RzXFxub2RlanNcXGJvdGJ1aWxkZXJcXHNhbXBsZWJvdD5cIiVQcm9ncmFtRmlsZXMoeDg2KSVcXEdvb2dsZVxcQ2hyb21lXFxBcHBsaWNhdGlvblxcY2hyb21lLmV4ZVwiIC0taW5jb2duaXRvIC11cmwgd3d3LnNwaWVnZWwuZGVcbmV4cG9ydHMuYWIgPSB7XG4gICAgX3Rlc3Q6IHtcbiAgICAgICAgc2FtZU9yU3Rhcjogc2FtZU9yU3RhcixcbiAgICAgICAgbnJNYXRjaGVzOiBuck1hdGNoZXMsXG4gICAgICAgIG5yTm9NYXRjaGVzOiBuck5vTWF0Y2hlcyxcbiAgICAgICAgZXhwYW5kUGFyYW1ldGVyc0luVVJMOiBleHBhbmRQYXJhbWV0ZXJzSW5VUkwsXG4gICAgICAgIGZpbHRlclNob3dFbnRpdHk6IGZpbHRlclNob3dFbnRpdHksXG4gICAgICAgIGZuRmluZFVuaXRUZXN0OiBmbkZpbmRVbml0VGVzdCxcbiAgICAgICAgY2FsY0Rpc3RhbmNlOiBjYWxjRGlzdGFuY2UsXG4gICAgICAgIF9hU2hvd0VudGl0eUFjdGlvbnM6IGFTaG93RW50aXR5QWN0aW9uc1xuICAgIH1cbn07XG4vL2V4cG9ydHMgZGlzcGF0Y2hlcjtcbi8vbW9kdWxlLmV4cG9ydHMgPSBkaXNwYXRjaGVyXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
