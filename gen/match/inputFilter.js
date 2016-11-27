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
    debuglog('sorting: ' + sKey + 'invoked with' + JSON.stringify(oContextA, undefined, 2) + " vs \n" + JSON.stringify(oContextB, undefined, 2));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9pbnB1dEZpbHRlci50cyIsIm1hdGNoL2lucHV0RmlsdGVyLmpzIl0sIm5hbWVzIjpbImRpc3RhbmNlIiwicmVxdWlyZSIsImRlYnVnIiwiZGVidWdsb2ciLCJtYXRjaGRhdGEiLCJvVW5pdFRlc3RzIiwiY2FsY0Rpc3RhbmNlIiwic1RleHQxIiwic1RleHQyIiwiYTAiLCJsZXZlbnNodGVpbiIsInN1YnN0cmluZyIsImxlbmd0aCIsImEiLCJ0b0xvd2VyQ2FzZSIsImZuRmluZE1hdGNoIiwic0tleXdvcmQiLCJvQ29udGV4dCIsIm9NYXAiLCJzb3J0Iiwib0VudHJ5MSIsIm9FbnRyeTIiLCJ1MSIsImtleSIsInUyIiwiZGlzdCIsIm8xIiwiT2JqZWN0IiwiYXNzaWduIiwibzIiLCJjb250ZXh0IiwiZm5GaW5kVW5pdFRlc3QiLCJzc3lzdGVtT2JqZWN0SWQiLCJFbnVtUnVsZVR5cGUiLCJleHBvcnRzIiwibm9uUHJpdmF0ZUtleXMiLCJvQSIsImtleXMiLCJmaWx0ZXIiLCJjb3VudEFpbkIiLCJvQiIsImZuQ29tcGFyZSIsImFLZXlJZ25vcmUiLCJBcnJheSIsImlzQXJyYXkiLCJpbmRleE9mIiwicmVkdWNlIiwicHJldiIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiY2FsbCIsInNwdXJpb3VzQW5vdEluQiIsImxvd2VyQ2FzZSIsIm8iLCJjb21wYXJlQ29udGV4dCIsImVxdWFsIiwiYiIsImRpZmZlcmVudCIsInNwdXJpb3VzTCIsInNwdXJpb3VzUiIsIm1hdGNoV29yZCIsIm9SdWxlIiwib3B0aW9ucyIsInVuZGVmaW5lZCIsInMxIiwiczIiLCJ3b3JkIiwiZGVsdGEiLCJmb2xsb3dzIiwiSlNPTiIsInN0cmluZ2lmeSIsIm1hdGNob3RoZXJzIiwiYyIsInJlcyIsIm92ZXJyaWRlIiwiX3dlaWdodCIsImZyZWV6ZSIsImV4dHJhY3RBcmdzTWFwIiwibWF0Y2giLCJhcmdzTWFwIiwiZm9yRWFjaCIsImlLZXkiLCJ2YWx1ZSIsIm1hdGNoUmVnRXhwIiwic0tleSIsInJlZyIsInJlZ2V4cCIsIm0iLCJleGVjIiwib0V4dHJhY3RlZENvbnRleHQiLCJzb3J0QnlXZWlnaHQiLCJvQ29udGV4dEEiLCJvQ29udGV4dEIiLCJ3ZWlnaHRBIiwid2VpZ2h0QiIsImF1Z21lbnRDb250ZXh0MSIsIm9SdWxlcyIsImVuYWJsZWQiLCJldmVyeSIsImlSdWxlIiwiRXJyb3IiLCJtYXAiLCJ0eXBlIiwib3JlcyIsImJpbmQiLCJhdWdtZW50Q29udGV4dCIsImFSdWxlcyIsIm9wdGlvbnMxIiwiYVJlcyIsIm9wdGlvbnMyIiwiaW5zZXJ0T3JkZXJlZCIsInJlc3VsdCIsImlJbnNlcnRlZE1lbWJlciIsImxpbWl0IiwicHVzaCIsInRha2VUb3BOIiwiYXJyIiwidSIsImlubmVyQXJyIiwiaUFyciIsInRvcCIsInNoaWZ0IiwiaW5wdXRGaWx0ZXJSdWxlcyIsImFwcGx5UnVsZXMiLCJiZXN0TiIsIm9LZXlPcmRlciIsImJlc3ROZXh0Iiwib1J1bGVNYXAiLCJkZWNpZGVPblJlUXVlcnkiLCJhU2hvd0VudGl0eUFjdGlvbnMiLCJzeXN0ZW1JZCIsImNsaWVudCIsInN5c3RlbXR5cGUiLCJzeXN0ZW1PYmplY3RJZCIsInBhdHRlcm4iLCJzeXN0ZW1PYmplY3RDYXRlZ29yeSIsInRvb2wiLCJleHBhbmRQYXJhbWV0ZXJzSW5VUkwiLCJvTWVyZ2VkQ29udGV4dFJlc3VsdCIsInB0biIsInJlZ2V4IiwiUmVnRXhwIiwicmVwbGFjZSIsIm5yTWF0Y2hlcyIsImFPYmplY3QiLCJuck5vTWF0Y2hlcyIsIm5vTWF0Y2hBIiwibm9NYXRjaEIiLCJzYW1lT3JTdGFyIiwib0VudGl0eSIsInNhbWVPclN0YXJFbXB0eSIsImZpbHRlclNob3dFbnRpdHkiLCJhU2hvd0VudGl0eSIsImFGaWx0ZXJlZCIsIm9TaG93RW50aXR5IiwibnJNYXRjaGVzQSIsIm5yTWF0Y2hlc0IiLCJuck5vTWF0Y2hlc0EiLCJuck5vTWF0Y2hlc0IiLCJvTWF0Y2giLCJvTWVyZ2VkIiwi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dEZpbHRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9saWIvbm9kZS00LmQudHNcIiAvPlxyXG5cclxuXHJcbi8qKlxyXG4gKiB0aGUgaW5wdXQgZmlsdGVyIHN0YWdlIHByZXByb2Nlc3NlcyBhIGN1cnJlbnQgY29udGV4dFxyXG4gKlxyXG4gKiBJdCBhKSBjb21iaW5lcyBtdWx0aS1zZWdtZW50IGFyZ3VtZW50cyBpbnRvIG9uZSBjb250ZXh0IG1lbWJlcnNcclxuICogSXQgYikgYXR0ZW1wdHMgdG8gYXVnbWVudCB0aGUgY29udGV4dCBieSBhZGRpdGlvbmFsIHF1YWxpZmljYXRpb25zXHJcbiAqICAgICAgICAgICAoTWlkIHRlcm0gZ2VuZXJhdGluZyBBbHRlcm5hdGl2ZXMsIGUuZy5cclxuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHVuaXQgdGVzdD9cclxuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHNvdXJjZSA/XHJcbiAqICAgICAgICAgICApXHJcbiAqICBTaW1wbGUgcnVsZXMgbGlrZSAgSW50ZW50XHJcbiAqXHJcbiAqXHJcbiAqIEBtb2R1bGVcclxuICogQGZpbGUgaW5wdXRGaWx0ZXIudHNcclxuICovXHJcbmltcG9ydCAqIGFzIGRpc3RhbmNlIGZyb20gJy4uL3V0aWxzL2RhbWVyYXVMZXZlbnNodGVpbic7XHJcblxyXG5pbXBvcnQgKiBhcyBkZWJ1ZyBmcm9tICdkZWJ1Zyc7XHJcblxyXG5jb25zdCBkZWJ1Z2xvZyA9IGRlYnVnKCdpbnB1dEZpbHRlcicpXHJcblxyXG5pbXBvcnQgKiBhcyBtYXRjaGRhdGEgZnJvbSAnLi9tYXRjaGRhdGEnO1xyXG4gIHZhciBvVW5pdFRlc3RzID0gbWF0Y2hkYXRhLm9Vbml0VGVzdHNcclxuXHJcbiAgZnVuY3Rpb24gY2FsY0Rpc3RhbmNlIChzVGV4dDEgOiBzdHJpbmcsIHNUZXh0MiA6IHN0cmluZykgOiBudW1iZXIge1xyXG4gICAgLy8gY29uc29sZS5sb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxyXG4gICAgdmFyIGEwID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnN1YnN0cmluZygwLCBzVGV4dDIubGVuZ3RoKSwgc1RleHQyKVxyXG4gICAgdmFyIGEgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEudG9Mb3dlckNhc2UoKSwgc1RleHQyKVxyXG4gICAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGFcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGZuRmluZE1hdGNoIChzS2V5d29yZCwgb0NvbnRleHQgOiBJRk1hdGNoLmNvbnRleHQsIG9NYXApIHtcclxuICAgIC8vIHJldHVybiBhIGJldHRlciBjb250ZXh0IGlmIHRoZXJlIGlzIGEgbWF0Y2hcclxuICAgIG9NYXAuc29ydChmdW5jdGlvbiAob0VudHJ5MSwgb0VudHJ5Mikge1xyXG4gICAgICB2YXIgdTEgPSBjYWxjRGlzdGFuY2Uob0VudHJ5MS5rZXkudG9Mb3dlckNhc2UoKSwgc0tleXdvcmQpXHJcbiAgICAgIHZhciB1MiA9IGNhbGNEaXN0YW5jZShvRW50cnkyLmtleS50b0xvd2VyQ2FzZSgpLCBzS2V5d29yZClcclxuICAgICAgcmV0dXJuIHUxIC0gdTJcclxuICAgIH0pXHJcbiAgICAvLyBsYXRlcjogaW4gY2FzZSBvZiBjb25mbGljdHMsIGFzayxcclxuICAgIC8vIG5vdzpcclxuICAgIHZhciBkaXN0ID0gY2FsY0Rpc3RhbmNlKG9NYXBbMF0ua2V5LnRvTG93ZXJDYXNlKCksIHNLZXl3b3JkKVxyXG4gICAgZGVidWdsb2coJ2Jlc3QgZGlzdCcgKyBkaXN0ICsgJyAvICAnICsgZGlzdCAqIHNLZXl3b3JkLmxlbmd0aCArICcgJyArIHNLZXl3b3JkKVxyXG4gICAgaWYgKGRpc3QgPCAxNTApIHtcclxuICAgICAgdmFyIG8xID0gT2JqZWN0LmFzc2lnbih7fSwgb0NvbnRleHQpIGFzIGFueVxyXG4gICAgICB2YXIgbzJcclxuICAgICAgbzEuY29udGV4dCA9IE9iamVjdC5hc3NpZ24oe30sIG8xLmNvbnRleHQpXHJcbiAgICAgIG8yID0gbzFcclxuICAgICAgbzIuY29udGV4dCA9IE9iamVjdC5hc3NpZ24obzEuY29udGV4dCwgb01hcFswXS5jb250ZXh0KVxyXG4gICAgICByZXR1cm4gbzJcclxuICAgIH1cclxuICAgIHJldHVybiBudWxsXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBhIGZ1bmN0aW9uIHRvIG1hdGNoIGEgdW5pdCB0ZXN0IHVzaW5nIGxldmVuc2h0ZWluIGRpc3RhbmNlc1xyXG4gICAqIEBwdWJsaWNcclxuICAgKi9cclxuICBmdW5jdGlvbiBmbkZpbmRVbml0VGVzdCAoc3N5c3RlbU9iamVjdElkLCBvQ29udGV4dCkge1xyXG4gICAgcmV0dXJuIGZuRmluZE1hdGNoKHNzeXN0ZW1PYmplY3RJZCwgb0NvbnRleHQsIG9Vbml0VGVzdHMpXHJcbiAgfVxyXG5cclxuaW1wb3J0ICogYXMgSUZNYXRjaCBmcm9tICcuLi9tYXRjaC9pZm1hdGNoJztcclxuXHJcbmV4cG9ydCBjb25zdCAgZW51bSBFbnVtUnVsZVR5cGUge1xyXG4gIFdPUkQgLFxyXG4gIFJFR0VYUFxyXG59XHJcblxyXG5pbnRlcmZhY2UgSVJ1bGUge1xyXG4gIHR5cGUgOiBFbnVtUnVsZVR5cGUsXHJcbiAga2V5IDogc3RyaW5nLFxyXG4gIHdvcmQ/IDogc3RyaW5nLFxyXG4gIHJlZ2V4cD8gOiBSZWdFeHAsXHJcbiAgYXJnc01hcD8gOiB7IFtrZXk6bnVtYmVyXSA6IHN0cmluZ30gIC8vIGEgbWFwIG9mIHJlZ2V4cCBtYXRjaCBncm91cCAtPiBjb250ZXh0IGtleVxyXG4gIC8vIGUuZy4gLyhbYS16MC05XXszLDN9KUNMTlQoW1xcZHszLDN9XSkvXHJcbiAgLy8gICAgICB7IDEgOiBcInN5c3RlbUlkXCIsIDIgOiBcImNsaWVudFwiIH1cclxuICBmb2xsb3dzIDogSUZNYXRjaC5jb250ZXh0XHJcbn1cclxuXHJcbmludGVyZmFjZSBJTWF0Y2hPcHRpb25zIHtcclxuICBtYXRjaG90aGVycz8gOiBib29sZWFuLFxyXG4gIGF1Z21lbnQ/OiBib29sZWFuLFxyXG4gIG92ZXJyaWRlPyA6IGJvb2xlYW5cclxufVxyXG5cclxuaW50ZXJmYWNlIElNYXRjaENvdW50IHtcclxuICBlcXVhbCA6IG51bWJlclxyXG4gIGRpZmZlcmVudCA6IG51bWJlclxyXG4gIHNwdXJpb3VzUiA6IG51bWJlclxyXG4gIHNwdXJpb3VzTCA6IG51bWJlclxyXG59XHJcblxyXG5mdW5jdGlvbiBub25Qcml2YXRlS2V5cyhvQSkge1xyXG4gIHJldHVybiBPYmplY3Qua2V5cyhvQSkuZmlsdGVyKCBrZXkgPT4ge1xyXG4gICAgcmV0dXJuIGtleVswXSAhPT0gJ18nO1xyXG4gIH0pO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY291bnRBaW5CIChvQSwgb0IsIGZuQ29tcGFyZSwgYUtleUlnbm9yZT8pIDogbnVtYmVye1xyXG4gICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/ICBhS2V5SWdub3JlIDpcclxuICAgICAgdHlwZW9mIGFLZXlJZ25vcmUgPT09IFwic3RyaW5nXCIgPyBbYUtleUlnbm9yZV0gOiAgW107XHJcbiAgIGZuQ29tcGFyZSA9IGZuQ29tcGFyZSB8fCBmdW5jdGlvbigpIHsgcmV0dXJuIHRydWU7IH1cclxuICAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoIGZ1bmN0aW9uKGtleSkge1xyXG4gICAgIHJldHVybiBhS2V5SWdub3JlLmluZGV4T2Yoa2V5KSA8IDA7XHJcbiAgICB9KS5cclxuICAgIHJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XHJcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIChmbkNvbXBhcmUob0Fba2V5XSxvQltrZXldLCBrZXkpID8gMSA6IDApXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHByZXZcclxuICAgIH0sIDApXHJcbiAgfVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNwdXJpb3VzQW5vdEluQihvQSxvQiwgYUtleUlnbm9yZT8gKSB7XHJcbiAgYUtleUlnbm9yZSA9IEFycmF5LmlzQXJyYXkoYUtleUlnbm9yZSkgPyAgYUtleUlnbm9yZSA6XHJcbiAgICAgIHR5cGVvZiBhS2V5SWdub3JlID09PSBcInN0cmluZ1wiID8gW2FLZXlJZ25vcmVdIDogIFtdO1xyXG4gICByZXR1cm4gbm9uUHJpdmF0ZUtleXMob0EpLmZpbHRlciggZnVuY3Rpb24oa2V5KSB7XHJcbiAgICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcclxuICAgIH0pLlxyXG4gICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIDFcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldlxyXG4gICAgfSwgMClcclxufVxyXG5cclxuZnVuY3Rpb24gbG93ZXJDYXNlKG8pIHtcclxuICBpZiAodHlwZW9mIG8gPT09IFwic3RyaW5nXCIpIHtcclxuICAgIHJldHVybiBvLnRvTG93ZXJDYXNlKClcclxuICB9XHJcbiAgcmV0dXJuIG9cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmVDb250ZXh0KG9BICwgb0IsIGFLZXlJZ25vcmU/KSB7XHJcbiAgdmFyIGVxdWFsID0gY291bnRBaW5CKG9BLG9CLCBmdW5jdGlvbihhLGIpIHsgcmV0dXJuIGxvd2VyQ2FzZShhKSA9PT0gbG93ZXJDYXNlKGIpO30sIGFLZXlJZ25vcmUpO1xyXG4gIHZhciBkaWZmZXJlbnQgPSBjb3VudEFpbkIob0Esb0IsIGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpICE9PSBsb3dlckNhc2UoYik7fSwgYUtleUlnbm9yZSk7XHJcbiAgdmFyIHNwdXJpb3VzTCA9IHNwdXJpb3VzQW5vdEluQihvQSxvQiwgYUtleUlnbm9yZSlcclxuICB2YXIgc3B1cmlvdXNSID0gc3B1cmlvdXNBbm90SW5CKG9CLG9BLCBhS2V5SWdub3JlKVxyXG4gIHJldHVybiB7XHJcbiAgICBlcXVhbCA6IGVxdWFsLFxyXG4gICAgZGlmZmVyZW50OiBkaWZmZXJlbnQsXHJcbiAgICBzcHVyaW91c0w6IHNwdXJpb3VzTCxcclxuICAgIHNwdXJpb3VzUjogc3B1cmlvdXNSXHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICpcclxuICogT3B0aW9ucyBtYXkgYmUge1xyXG4gKiBtYXRjaG90aGVycyA6IHRydWUsICA9PiBvbmx5IHJ1bGVzIHdoZXJlIGFsbCBvdGhlcnMgbWF0Y2ggYXJlIGNvbnNpZGVyZWRcclxuICogYXVnbWVudCA6IHRydWUsXHJcbiAqIG92ZXJyaWRlIDogdHJ1ZSB9ICA9PlxyXG4gKlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoV29yZChvUnVsZSA6IElSdWxlLCBjb250ZXh0IDogSUZNYXRjaC5jb250ZXh0LCBvcHRpb25zID8gOiBJTWF0Y2hPcHRpb25zKSB7XHJcbiAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKVxyXG4gIHZhciBzMiA9IG9SdWxlLndvcmQudG9Mb3dlckNhc2UoKTtcclxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxyXG4gIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KVxyXG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlbHRhKSk7XHJcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkob3B0aW9ucykpO1xyXG4gIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSl7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkXHJcbiAgfVxyXG4gIHZhciBjIDogbnVtYmVyID0gY2FsY0Rpc3RhbmNlKHMyLCBzMSk7XHJcbiAgIGRlYnVnbG9nKFwiIHMxIDw+IHMyIFwiICsgczEgKyBcIjw+XCIgKyBzMiArIFwiICA9PjogXCIgKyBjKTtcclxuICBpZihjIDwgMTUwICkge1xyXG4gICAgdmFyIHJlcyA9IE9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpIGFzIGFueTtcclxuICAgIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcclxuICAgIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XHJcbiAgICAgIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBvUnVsZS5mb2xsb3dzKTtcclxuICAgIH1cclxuICAgIC8vIGZvcmNlIGtleSBwcm9wZXJ0eVxyXG4gICAgLy8gY29uc29sZS5sb2coJyBvYmplY3RjYXRlZ29yeScsIHJlc1snc3lzdGVtT2JqZWN0Q2F0ZWdvcnknXSk7XHJcbiAgICByZXNbb1J1bGUua2V5XSA9IG9SdWxlLmZvbGxvd3Nbb1J1bGUua2V5XSB8fCByZXNbb1J1bGUua2V5XTtcclxuICAgIHJlcy5fd2VpZ2h0ID0gT2JqZWN0LmFzc2lnbih7fSwgcmVzLl93ZWlnaHQpO1xyXG4gICAgcmVzLl93ZWlnaHRbb1J1bGUua2V5XSA9IGM7XHJcbiAgICBPYmplY3QuZnJlZXplKHJlcyk7XHJcbiAgICBkZWJ1Z2xvZygnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcyx1bmRlZmluZWQsMikpO1xyXG4gICAgcmV0dXJuIHJlcztcclxuICB9XHJcbiAgcmV0dXJuIHVuZGVmaW5lZDtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RBcmdzTWFwKG1hdGNoIDogQXJyYXk8c3RyaW5nPiAsIGFyZ3NNYXAgOiB7IFtrZXkgOiBudW1iZXJdIDogc3RyaW5nfSkgOiBJRk1hdGNoLmNvbnRleHQge1xyXG4gIHZhciByZXMgPSB7fSBhcyBJRk1hdGNoLmNvbnRleHQ7XHJcbiAgaWYgKCFhcmdzTWFwKSB7XHJcbiAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxuICBPYmplY3Qua2V5cyhhcmdzTWFwKS5mb3JFYWNoKGZ1bmN0aW9uKGlLZXkpIHtcclxuICAgICAgdmFyIHZhbHVlID0gbWF0Y2hbaUtleV1cclxuICAgICAgdmFyIGtleSA9IGFyZ3NNYXBbaUtleV07XHJcbiAgICAgIGlmICgodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKSAmJiB2YWx1ZS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgcmVzW2tleV0gPSB2YWx1ZVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hSZWdFeHAob1J1bGUgOiBJUnVsZSwgY29udGV4dCA6IElGTWF0Y2guY29udGV4dCwgb3B0aW9ucyA/IDogSU1hdGNoT3B0aW9ucykge1xyXG4gIGlmIChjb250ZXh0W29SdWxlLmtleV0gPT09IHVuZGVmaW5lZCkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICB9XHJcbiAgdmFyIHNLZXkgPSBvUnVsZS5rZXk7XHJcbiAgdmFyIHMxID0gY29udGV4dFtvUnVsZS5rZXldLnRvTG93ZXJDYXNlKClcclxuICB2YXIgcmVnID0gb1J1bGUucmVnZXhwO1xyXG5cclxuICB2YXIgbSA9IHJlZy5leGVjKHMxKTtcclxuICBkZWJ1Z2xvZyhcImFwcGx5aW5nIHJlZ2V4cDogXCIgKyBzMSArIFwiIFwiICsgSlNPTi5zdHJpbmdpZnkobSkpO1xyXG4gIGlmICghbSkge1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICB9XHJcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge31cclxuICB2YXIgZGVsdGEgPSBjb21wYXJlQ29udGV4dChjb250ZXh0LG9SdWxlLmZvbGxvd3MsIG9SdWxlLmtleSlcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xyXG4gIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcclxuICBpZiAob3B0aW9ucy5tYXRjaG90aGVycyAmJiAoZGVsdGEuZGlmZmVyZW50ID4gMCkpe1xyXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gIH1cclxuICB2YXIgb0V4dHJhY3RlZENvbnRleHQgPSBleHRyYWN0QXJnc01hcChtLCBvUnVsZS5hcmdzTWFwICk7XHJcbiAgZGVidWdsb2coXCJleHRyYWN0ZWQgYXJncyBcIiArIEpTT04uc3RyaW5naWZ5KG9SdWxlLmFyZ3NNYXApKTtcclxuICBkZWJ1Z2xvZyhcIm1hdGNoIFwiICsgSlNPTi5zdHJpbmdpZnkobSkpO1xyXG5cclxuICBkZWJ1Z2xvZyhcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob0V4dHJhY3RlZENvbnRleHQpKTtcclxuICB2YXIgcmVzID0gT2JqZWN0LmFzc2lnbih7fSwgb1J1bGUuZm9sbG93cykgYXMgYW55O1xyXG4gIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBvRXh0cmFjdGVkQ29udGV4dCk7XHJcbiAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIGNvbnRleHQpO1xyXG4gIGlmIChvRXh0cmFjdGVkQ29udGV4dFtzS2V5XSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICByZXNbc0tleV0gPSBvRXh0cmFjdGVkQ29udGV4dFtzS2V5XTtcclxuICB9XHJcbiAgaWYgKG9wdGlvbnMub3ZlcnJpZGUpIHtcclxuICAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgb1J1bGUuZm9sbG93cyk7XHJcbiAgICAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIG9FeHRyYWN0ZWRDb250ZXh0KVxyXG4gIH1cclxuICBPYmplY3QuZnJlZXplKHJlcyk7XHJcbiAgZGVidWdsb2coJ0ZvdW5kIG9uZScgKyBKU09OLnN0cmluZ2lmeShyZXMsdW5kZWZpbmVkLDIpKTtcclxuICByZXR1cm4gcmVzO1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc29ydEJ5V2VpZ2h0KHNLZXkgOiBzdHJpbmcsIG9Db250ZXh0QSA6IElGTWF0Y2guY29udGV4dCwgb0NvbnRleHRCIDogSUZNYXRjaC5jb250ZXh0KSAgOiBudW1iZXJ7XHJcbiAgZGVidWdsb2coJ3NvcnRpbmc6ICcgKyBzS2V5ICsgJ2ludm9rZWQgd2l0aCcgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEEsdW5kZWZpbmVkLDIpK1xyXG4gICBcIiB2cyBcXG5cIiArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0Qix1bmRlZmluZWQsMikpO1xyXG4gIHZhciB3ZWlnaHRBID0gb0NvbnRleHRBW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdW3NLZXldICB8fCAwO1xyXG4gIHZhciB3ZWlnaHRCID0gb0NvbnRleHRCW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdW3NLZXldICB8fCAwO1xyXG4gIHJldHVybiArKHdlaWdodEEgLSB3ZWlnaHRCKTtcclxufVxyXG5cclxuXHJcbi8vIFdvcmQsIFN5bm9ueW0sIFJlZ2V4cCAvIEV4dHJhY3Rpb25SdWxlXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXVnbWVudENvbnRleHQxKCBjb250ZXh0IDogSUZNYXRjaC5jb250ZXh0LCBvUnVsZXMgOiBBcnJheTxJUnVsZT4sIG9wdGlvbnMgOiBJTWF0Y2hPcHRpb25zKSA6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIHZhciBzS2V5ID0gb1J1bGVzWzBdLmtleTtcclxuICAvLyBjaGVjayB0aGF0IHJ1bGVcclxuICBpZiAoZGVidWdsb2cuZW5hYmxlZCkge1xyXG4gICAgLy8gY2hlY2sgY29uc2lzdGVuY3lcclxuICAgIG9SdWxlcy5ldmVyeShmdW5jdGlvbiAoaVJ1bGUpIHtcclxuICAgICAgaWYgKGlSdWxlLmtleSAhPT0gc0tleSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkluaG9tb2dlbm91cyBrZXlzIGluIHJ1bGVzLCBleHBlY3RlZCBcIiArIHNLZXkgKyBcIiB3YXMgXCIgKyBKU09OLnN0cmluZ2lmeShpUnVsZSkpO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvLyBsb29rIGZvciBydWxlcyB3aGljaCBtYXRjaFxyXG4gIHZhciByZXMgPSBvUnVsZXMubWFwKGZ1bmN0aW9uKG9SdWxlKSB7XHJcbiAgICAvLyBpcyB0aGlzIHJ1bGUgYXBwbGljYWJsZVxyXG4gICAgc3dpdGNoKG9SdWxlLnR5cGUpIHtcclxuICAgICAgY2FzZSBFbnVtUnVsZVR5cGUuV09SRDpcclxuICAgICAgICByZXR1cm4gbWF0Y2hXb3JkKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKVxyXG4gICAgICBjYXNlIEVudW1SdWxlVHlwZS5SRUdFWFA6XHJcbiAgICAgICAgcmV0dXJuIG1hdGNoUmVnRXhwKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKTtcclxuICAgLy8gICBjYXNlIFwiRXh0cmFjdGlvblwiOlxyXG4gICAvLyAgICAgcmV0dXJuIG1hdGNoRXh0cmFjdGlvbihvUnVsZSxjb250ZXh0KTtcclxuICAgIH1cclxuICAgIHJldHVybiB1bmRlZmluZWRcclxuICB9KS5maWx0ZXIoZnVuY3Rpb24ob3Jlcykge1xyXG4gICAgcmV0dXJuICEhb3Jlc1xyXG4gIH0pLnNvcnQoXHJcbiAgICBzb3J0QnlXZWlnaHQuYmluZCh0aGlzLCBzS2V5KVxyXG4gICk7XHJcbiAgcmV0dXJuIHJlcztcclxuICAvLyBPYmplY3Qua2V5cygpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcclxuICAvLyB9KTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0KCBjb250ZXh0IDogSUZNYXRjaC5jb250ZXh0LCBhUnVsZXMgOiBBcnJheTxJUnVsZT4pIDogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiB7XHJcblxyXG52YXIgb3B0aW9uczEgOiBJTWF0Y2hPcHRpb25zID0ge1xyXG4gICAgbWF0Y2hvdGhlcnMgOiB0cnVlLFxyXG4gICAgb3ZlcnJpZGU6IGZhbHNlXHJcbiAgfSBhcyBJTWF0Y2hPcHRpb25zO1xyXG5cclxuICB2YXIgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LGFSdWxlcyxvcHRpb25zMSlcclxuXHJcbiAgaWYgKGFSZXMubGVuZ3RoID09PSAwKSAge1xyXG4gICAgdmFyIG9wdGlvbnMyIDogSU1hdGNoT3B0aW9ucyA9IHtcclxuICAgICAgICBtYXRjaG90aGVycyA6IGZhbHNlLFxyXG4gICAgICAgIG92ZXJyaWRlOiB0cnVlXHJcbiAgICB9IGFzIElNYXRjaE9wdGlvbnM7XHJcbiAgICBhUmVzID0gYXVnbWVudENvbnRleHQxKGNvbnRleHQsIGFSdWxlcywgb3B0aW9uczIpO1xyXG4gIH1cclxuICByZXR1cm4gYVJlcztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGluc2VydE9yZGVyZWQocmVzdWx0IDogQXJyYXk8SUZNYXRjaC5jb250ZXh0PiwgaUluc2VydGVkTWVtYmVyIDogSUZNYXRjaC5jb250ZXh0LCBsaW1pdCA6IG51bWJlcikgOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICAvLyBUT0RPOiB1c2Ugc29tZSB3ZWlnaHRcclxuICBpZiAocmVzdWx0Lmxlbmd0aCA8IGxpbWl0KSB7XHJcbiAgICByZXN1bHQucHVzaChpSW5zZXJ0ZWRNZW1iZXIpXHJcbiAgfVxyXG4gIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdGFrZVRvcE4oYXJyIDogQXJyYXk8QXJyYXk8SUZNYXRjaC5jb250ZXh0Pj4pOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICB2YXIgdSA9IGFyci5maWx0ZXIoZnVuY3Rpb24oaW5uZXJBcnIpIHsgcmV0dXJuIGlubmVyQXJyLmxlbmd0aCA+IDB9KVxyXG5cclxuICB2YXIgcmVzID1bXTtcclxuICAvLyBzaGlmdCBvdXQgdGhlIHRvcCBvbmVzXHJcbiAgdSA9IHUubWFwKGZ1bmN0aW9uKGlBcnIpIHtcclxuICAgIHZhciB0b3AgPSBpQXJyLnNoaWZ0KCk7XHJcbiAgICByZXMgPSBpbnNlcnRPcmRlcmVkKHJlcyx0b3AsNSlcclxuICAgIHJldHVybiBpQXJyXHJcbiAgfSkuZmlsdGVyKGZ1bmN0aW9uKGlubmVyQXJyOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+KSA6IGJvb2xlYW4geyByZXR1cm4gaW5uZXJBcnIubGVuZ3RoID4gMH0pO1xyXG4gIC8vIGFzIEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuaW1wb3J0ICogYXMgaW5wdXRGaWx0ZXJSdWxlcyBmcm9tICcuL2lucHV0RmlsdGVyUnVsZXMnO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UnVsZXMoY29udGV4dCA6IElGTWF0Y2guY29udGV4dCkgOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICB2YXIgYmVzdE4gOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+ID0gW2NvbnRleHRdO1xyXG4gIGlucHV0RmlsdGVyUnVsZXMub0tleU9yZGVyLmZvckVhY2goZnVuY3Rpb24gKHNLZXkgOiBzdHJpbmcpIHtcclxuICAgICB2YXIgYmVzdE5leHQ6IEFycmF5PEFycmF5PElGTWF0Y2guY29udGV4dD4+ID0gW107XHJcbiAgICAgYmVzdE4uZm9yRWFjaChmdW5jdGlvbihvQ29udGV4dCA6IElGTWF0Y2guY29udGV4dCkge1xyXG4gICAgICAgaWYgKG9Db250ZXh0W3NLZXldKSB7XHJcbiAgICAgICAgICBkZWJ1Z2xvZygnKiogYXBwbHlpbmcgcnVsZXMgZm9yICcgKyBzS2V5KVxyXG4gICAgICAgICAgdmFyIHJlcyA9IGF1Z21lbnRDb250ZXh0KG9Db250ZXh0LCBpbnB1dEZpbHRlclJ1bGVzLm9SdWxlTWFwW3NLZXldIHx8IFtdKVxyXG4gICAgICAgICAgZGVidWdsb2coJyoqIHJlc3VsdCBmb3IgJyArIHNLZXkgKyAnID0gJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSlcclxuICAgICAgICAgIGJlc3ROZXh0LnB1c2gocmVzIHx8IFtdKVxyXG4gICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgLy8gcnVsZSBub3QgcmVsZXZhbnRcclxuICAgICAgICAgYmVzdE5leHQucHVzaChbb0NvbnRleHRdKTtcclxuICAgICAgIH1cclxuICAgIH0pXHJcbiAgICBiZXN0TiA9IHRha2VUb3BOKGJlc3ROZXh0KTtcclxuICB9KTtcclxuICByZXR1cm4gYmVzdE5cclxufVxyXG5cclxuLyoqXHJcbiAqIERlY2lkZSB3aGV0aGVyIHRvIHJlcXVlcnkgZm9yIGEgY29udGV0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZGVjaWRlT25SZVF1ZXJ5KCBjb250ZXh0IDogSUZNYXRjaC5jb250ZXh0KSA6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG4gIHJldHVybiBbXVxyXG59XHJcblxyXG5cclxuXHJcbiAgdmFyIGFTaG93RW50aXR5QWN0aW9ucyA9IFtcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbUlkOiAndXYyJyxcclxuICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcclxuICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHAnXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1djIud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3VpMi91c2hlbGwvc2hlbGxzL2FiYXAvRmlvcmlMYXVuY2hwYWQuaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtSWQ6ICd1djInLFxyXG4gICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxyXG4gICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscGQnXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1djIud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3NhcC9hcnNydmNfdXBiX2FkbW4vbWFpbi5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1JZDogJ3UxeScsXHJcbiAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXHJcbiAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwJ1xyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdTF5LndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS91aTIvdXNoZWxsL3NoZWxscy9hYmFwL0Zpb3JpTGF1bmNocGFkLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbUlkOiAndTF5JyxcclxuICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcclxuICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHBkJ1xyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdTF5LndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS9zYXAvYXJzcnZjX3VwYl9hZG1uL21haW4uaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtSWQ6ICd1djInLFxyXG4gICAgICAgIGNsaWVudDogJzEyMCcsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0Q2F0ZWdvcnk6ICdjYXRhbG9nJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogLy4qLyxcclxuICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXHJcbiAgICAgICAgdG9vbDogJ0ZMUEQnXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1djIud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3NhcC9hcnNydmNfdXBiX2FkbW4vbWFpbi5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0jQ0FUQUxPRzp7c3lzdGVtT2JqZWN0SWR9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtT2JqZWN0Q2F0ZWdvcnk6ICd1bml0JyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogZm5GaW5kVW5pdFRlc3RcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MC97cGF0aH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ3dpa2knLFxyXG4gICAgIC8vICAgc3lzdGVtT2JqZWN0SWQ6IGZuRmluZFdpa2lcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vd2lraS53ZGYuc2FwLmNvcnAve3BhdGh9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtSWQ6ICdKSVJBJ1xyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9qaXJhLndkZi5zYXAuY29ycDo4MDgwL1RJUENPUkVVSUlJJ1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgXVxyXG5cclxuICAvLyBpZiBUT09MID0gSklSQSB8fCBTeXN0ZW1JZCA9IEpJUkEgLT4gU3lzdGVtSWQgPSBKSVJBXHJcbiAgLy9cclxuICAvL1xyXG5cclxuXHJcbiAgLy8gc3RhcnRTQVBHVUlcclxuXHJcbiAgLy8gICBOOlxcPlwiYzpcXFByb2dyYW0gRmlsZXMgKHg4NilcXFNBUFxcRnJvbnRFbmRcXFNBUGd1aVwiXFxzYXBzaGN1dC5leGUgIC1zeXN0ZW09VVYyIC1jbGllbnQ9MTIwIC1jb21tYW5kPVNFMzggLXR5cGU9VHJhbnNhY3Rpb24gLXVzZXI9QVVTRVJcclxuXHJcbiAgZnVuY3Rpb24gZXhwYW5kUGFyYW1ldGVyc0luVVJMIChvTWVyZ2VkQ29udGV4dFJlc3VsdCkge1xyXG4gICAgdmFyIHB0biA9IG9NZXJnZWRDb250ZXh0UmVzdWx0LnJlc3VsdC5wYXR0ZXJuXHJcbiAgICBPYmplY3Qua2V5cyhvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XHJcbiAgICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoJ3snICsgc0tleSArICd9JywgJ2cnKVxyXG4gICAgICBwdG4gPSBwdG4ucmVwbGFjZShyZWdleCwgb01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dFtzS2V5XSlcclxuICAgICAgcHRuID0gcHRuLnJlcGxhY2UocmVnZXgsIG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHRbc0tleV0pXHJcbiAgICB9KVxyXG4gICAgcmV0dXJuIHB0blxyXG4gIH1cclxuXHJcblxyXG4gIGZ1bmN0aW9uIG5yTWF0Y2hlcyAoYU9iamVjdCwgb0NvbnRleHQpIHtcclxuICAgIHJldHVybiBPYmplY3Qua2V5cyhhT2JqZWN0KS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xyXG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9Db250ZXh0LCBrZXkpKSB7XHJcbiAgICAgICAgcHJldiA9IHByZXYgKyAxXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHByZXZcclxuICAgIH0sIDApXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBuck5vTWF0Y2hlcyAoYU9iamVjdCwgb0NvbnRleHQpIHtcclxuICAgIHZhciBub01hdGNoQSA9IE9iamVjdC5rZXlzKGFPYmplY3QpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XHJcbiAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9Db250ZXh0LCBrZXkpKSB7XHJcbiAgICAgICAgcHJldiA9IHByZXYgKyAxXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHByZXZcclxuICAgIH0sIDApXHJcbiAgICB2YXIgbm9NYXRjaEIgPSBPYmplY3Qua2V5cyhvQ29udGV4dCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYU9iamVjdCwga2V5KSkge1xyXG4gICAgICAgIHByZXYgPSBwcmV2ICsgMVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBwcmV2XHJcbiAgICB9LCAwKVxyXG4gICAgcmV0dXJuIG5vTWF0Y2hBICsgbm9NYXRjaEJcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHNhbWVPclN0YXIgKHMxIDogc3RyaW5nLCBzMiA6IHN0cmluZyB8IFJlZ0V4cCB8IEZ1bmN0aW9uICwgb0VudGl0eSkge1xyXG4gICAgcmV0dXJuIHMxID09PSBzMiB8fFxyXG4gICAgICAoczEgPT09IHVuZGVmaW5lZCAmJiBzMiA9PT0gbnVsbCkgfHxcclxuICAgICAgKChzMiBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgczIuZXhlYyhzMSkgIT09IG51bGwpIHx8XHJcbiAgICAgICgodHlwZW9mIHMyID09PSAnZnVuY3Rpb24nICYmIHMxKSAmJiBzMihzMSwgb0VudGl0eSkpXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBzYW1lT3JTdGFyRW1wdHkgKHMxIDogc3RyaW5nLCBzMiA6IHN0cmluZyB8IFJlZ0V4cCB8IEZ1bmN0aW9uLCBvRW50aXR5KSB7XHJcbiAgICBpZiAoczEgPT09IHVuZGVmaW5lZCAmJiBzMiA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9XHJcbiAgICBpZiAoczIgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzMSA9PT0gczIgfHxcclxuICAgICAgKChzMiBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgczIuZXhlYyhzMSkgIT09IG51bGwpIHx8XHJcbiAgICAgICgodHlwZW9mIHMyID09PSAnZnVuY3Rpb24nICYmIHMxKSAmJiBzMihzMSwgb0VudGl0eSkpXHJcbiAgfVxyXG4gIGZ1bmN0aW9uIGZpbHRlclNob3dFbnRpdHkgKG9Db250ZXh0LCBhU2hvd0VudGl0eSkge1xyXG4gICAgdmFyIGFGaWx0ZXJlZFxyXG4gICAgT2JqZWN0LmtleXMob0NvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcclxuICAgICAgaWYgKG9Db250ZXh0W3NLZXldID09PSBudWxsKSB7XHJcbiAgICAgICAgb0NvbnRleHRbc0tleV0gPSB1bmRlZmluZWRcclxuICAgICAgfVxyXG4gICAgfSlcclxuICAgIGFGaWx0ZXJlZCA9IGFTaG93RW50aXR5LmZpbHRlcihmdW5jdGlvbiAob1Nob3dFbnRpdHkpIHtcclxuICAgICAgLy8gICAgICAgY29uc29sZS5sb2coXCIuLi5cIilcclxuICAgICAgLy8gICAgICBjb25zb2xlLmxvZyhvU2hvd0VudGl0eS5jb250ZXh0LnRvb2wgKyBcIiBcIiArIG9Db250ZXh0LnRvb2wgKyBcIlxcblwiKVxyXG4gICAgICAvLyAgICAgIGNvbnNvbGUubG9nKG9TaG93RW50aXR5LmNvbnRleHQuY2xpZW50ICsgXCIgXCIgKyBvQ29udGV4dC5jbGllbnQgK1wiOlwiICsgc2FtZU9yU3RhcihvQ29udGV4dC5jbGllbnQsb1Nob3dFbnRpdHkuY29udGV4dC5jbGllbnQpICsgXCJcXG5cIilcclxuICAgICAgLy8gIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KG9TaG93RW50aXR5LmNvbnRleHQpICsgXCJcXG5cIiArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0LmNsaWVudCkgKyBcIlxcblwiKVxyXG5cclxuICAgICAgcmV0dXJuIHNhbWVPclN0YXIob1Nob3dFbnRpdHkuY29udGV4dC5zeXN0ZW1JZCwgb0NvbnRleHQuc3lzdGVtSWQsIG9Db250ZXh0KSAmJlxyXG4gICAgICAgIHNhbWVPclN0YXIob0NvbnRleHQudG9vbCwgb1Nob3dFbnRpdHkuY29udGV4dC50b29sLCBvQ29udGV4dCkgJiZcclxuICAgICAgICBzYW1lT3JTdGFyKG9Db250ZXh0LmNsaWVudCwgb1Nob3dFbnRpdHkuY29udGV4dC5jbGllbnQsIG9Db250ZXh0KSAmJlxyXG4gICAgICAgIHNhbWVPclN0YXJFbXB0eShvQ29udGV4dC5zeXN0ZW1PYmplY3RDYXRlZ29yeSwgb1Nob3dFbnRpdHkuY29udGV4dC5zeXN0ZW1PYmplY3RDYXRlZ29yeSwgb0NvbnRleHQpICYmXHJcbiAgICAgICAgc2FtZU9yU3RhckVtcHR5KG9Db250ZXh0LnN5c3RlbU9iamVjdElkLCBvU2hvd0VudGl0eS5jb250ZXh0LnN5c3RlbU9iamVjdElkLCBvQ29udGV4dClcclxuICAgIC8vICAgICAgJiYgb1Nob3dFbnRpdHkuY29udGV4dC50b29sID09PSBvQ29udGV4dC50b29sXHJcbiAgICB9KVxyXG4gICAgLy8gIGNvbnNvbGUubG9nKGFGaWx0ZXJlZC5sZW5ndGgpXHJcbiAgICAvLyBtYXRjaCBvdGhlciBjb250ZXh0IHBhcmFtZXRlcnNcclxuICAgIGFGaWx0ZXJlZC5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XHJcbiAgICAgIHZhciBuck1hdGNoZXNBID0gbnJNYXRjaGVzKGEuY29udGV4dCwgb0NvbnRleHQpXHJcbiAgICAgIHZhciBuck1hdGNoZXNCID0gbnJNYXRjaGVzKGIuY29udGV4dCwgb0NvbnRleHQpXHJcbiAgICAgIHZhciBuck5vTWF0Y2hlc0EgPSBuck5vTWF0Y2hlcyhhLmNvbnRleHQsIG9Db250ZXh0KVxyXG4gICAgICB2YXIgbnJOb01hdGNoZXNCID0gbnJOb01hdGNoZXMoYi5jb250ZXh0LCBvQ29udGV4dClcclxuICAgICAgLy8gICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhLmNvbnRleHQpKVxyXG4gICAgICAvLyAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGIuY29udGV4dCkpXHJcbiAgICAgIC8vICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkob0NvbnRleHQpKVxyXG4gICAgICB2YXIgcmVzID0gLShuck1hdGNoZXNBIC0gbnJNYXRjaGVzQikgKiAxMDAgKyAobnJOb01hdGNoZXNBIC0gbnJOb01hdGNoZXNCKVxyXG4gICAgICAvLyAgICAgY29uc29sZS5sb2coXCJkaWZmIFwiICsgcmVzKVxyXG4gICAgICByZXR1cm4gcmVzXHJcbiAgICB9KVxyXG4gICAgaWYgKGFGaWx0ZXJlZC5sZW5ndGggPT09IDApIHtcclxuICAgICAgZGVidWdsb2coJ25vIHRhcmdldCBmb3Igc2hvd0VudGl0eSAnICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHQpKVxyXG4gICAgfVxyXG4gICAgLy8gY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYUZpbHRlcmVkLHVuZGVmaW5lZCwyKSlcclxuICAgIGlmIChhRmlsdGVyZWRbMF0pIHtcclxuICAgICAgLy8gZXhlY3V0ZSBhbGwgZnVuY3Rpb25zXHJcblxyXG4gICAgICB2YXIgb01hdGNoID0gYUZpbHRlcmVkWzBdXHJcblxyXG4gICAgICB2YXIgb01lcmdlZCA9IHtcclxuICAgICAgICBjb250ZXh0OiB7XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBvTWVyZ2VkLmNvbnRleHQgPSBPYmplY3QuYXNzaWduKHt9LCBvTWVyZ2VkLmNvbnRleHQsIGFGaWx0ZXJlZFswXS5jb250ZXh0LCBvQ29udGV4dClcclxuICAgICAgb01lcmdlZCA9IE9iamVjdC5hc3NpZ24ob01lcmdlZCwge1xyXG4gICAgICAgIHJlc3VsdDogYUZpbHRlcmVkWzBdLnJlc3VsdFxyXG4gICAgICB9KVxyXG5cclxuICAgICAgT2JqZWN0LmtleXMob01hdGNoLmNvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcclxuICAgICAgICBpZiAodHlwZW9mIG9NYXRjaC5jb250ZXh0W3NLZXldID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICBkZWJ1Z2xvZygnTm93IHJldHJvZml0dGluZyA6JyArIHNLZXkgKyAnIC0gJyArIG9Db250ZXh0W3NLZXldKVxyXG4gICAgICAgICAgb01lcmdlZCA9IG9NYXRjaC5jb250ZXh0W3NLZXldKG9Db250ZXh0W3NLZXldLCBvTWVyZ2VkKVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuXHJcbiAgICAgIHJldHVybiBvTWVyZ2VkXHJcbiAgICB9XHJcbiAgICByZXR1cm4gbnVsbFxyXG4gIH1cclxuXHJcblxyXG4gIC8vIEU6XFxwcm9qZWN0c1xcbm9kZWpzXFxib3RidWlsZGVyXFxzYW1wbGVib3Q+XCIlUHJvZ3JhbUZpbGVzKHg4NiklXFxHb29nbGVcXENocm9tZVxcQXBwbGljYXRpb25cXGNocm9tZS5leGVcIiAtLWluY29nbml0byAtdXJsIHd3dy5zcGllZ2VsLmRlXHJcblxyXG4gIGV4cG9ydCBjb25zdCBhYiA9IHtcclxuICAgIF90ZXN0OiB7XHJcbiAgICAgIHNhbWVPclN0YXI6IHNhbWVPclN0YXIsXHJcbiAgICAgIG5yTWF0Y2hlczogbnJNYXRjaGVzLFxyXG4gICAgICBuck5vTWF0Y2hlczogbnJOb01hdGNoZXMsXHJcbiAgICAgIGV4cGFuZFBhcmFtZXRlcnNJblVSTDogZXhwYW5kUGFyYW1ldGVyc0luVVJMLFxyXG4gICAgICBmaWx0ZXJTaG93RW50aXR5OiBmaWx0ZXJTaG93RW50aXR5LFxyXG4gICAgICBmbkZpbmRVbml0VGVzdDogZm5GaW5kVW5pdFRlc3QsXHJcbiAgICAgIGNhbGNEaXN0YW5jZTogY2FsY0Rpc3RhbmNlLFxyXG4gICAgICBfYVNob3dFbnRpdHlBY3Rpb25zOiBhU2hvd0VudGl0eUFjdGlvbnNcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vZXhwb3J0cyBkaXNwYXRjaGVyO1xyXG5cclxuICAvL21vZHVsZS5leHBvcnRzID0gZGlzcGF0Y2hlclxyXG5cclxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2xpYi9ub2RlLTQuZC50c1wiIC8+XG5cInVzZSBzdHJpY3RcIjtcbi8qKlxuICogdGhlIGlucHV0IGZpbHRlciBzdGFnZSBwcmVwcm9jZXNzZXMgYSBjdXJyZW50IGNvbnRleHRcbiAqXG4gKiBJdCBhKSBjb21iaW5lcyBtdWx0aS1zZWdtZW50IGFyZ3VtZW50cyBpbnRvIG9uZSBjb250ZXh0IG1lbWJlcnNcbiAqIEl0IGIpIGF0dGVtcHRzIHRvIGF1Z21lbnQgdGhlIGNvbnRleHQgYnkgYWRkaXRpb25hbCBxdWFsaWZpY2F0aW9uc1xuICogICAgICAgICAgIChNaWQgdGVybSBnZW5lcmF0aW5nIEFsdGVybmF0aXZlcywgZS5nLlxuICogICAgICAgICAgICAgICAgIENsaWVudFNpZGVUYXJnZXRSZXNvbHV0aW9uIC0+IHVuaXQgdGVzdD9cbiAqICAgICAgICAgICAgICAgICBDbGllbnRTaWRlVGFyZ2V0UmVzb2x1dGlvbiAtPiBzb3VyY2UgP1xuICogICAgICAgICAgIClcbiAqICBTaW1wbGUgcnVsZXMgbGlrZSAgSW50ZW50XG4gKlxuICpcbiAqIEBtb2R1bGVcbiAqIEBmaWxlIGlucHV0RmlsdGVyLnRzXG4gKi9cbmNvbnN0IGRpc3RhbmNlID0gcmVxdWlyZSgnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluJyk7XG5jb25zdCBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJyk7XG5jb25zdCBkZWJ1Z2xvZyA9IGRlYnVnKCdpbnB1dEZpbHRlcicpO1xuY29uc3QgbWF0Y2hkYXRhID0gcmVxdWlyZSgnLi9tYXRjaGRhdGEnKTtcbnZhciBvVW5pdFRlc3RzID0gbWF0Y2hkYXRhLm9Vbml0VGVzdHM7XG5mdW5jdGlvbiBjYWxjRGlzdGFuY2Uoc1RleHQxLCBzVGV4dDIpIHtcbiAgICAvLyBjb25zb2xlLmxvZyhcImxlbmd0aDJcIiArIHNUZXh0MSArIFwiIC0gXCIgKyBzVGV4dDIpXG4gICAgdmFyIGEwID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnN1YnN0cmluZygwLCBzVGV4dDIubGVuZ3RoKSwgc1RleHQyKTtcbiAgICB2YXIgYSA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS50b0xvd2VyQ2FzZSgpLCBzVGV4dDIpO1xuICAgIHJldHVybiBhMCAqIDUwMCAvIHNUZXh0Mi5sZW5ndGggKyBhO1xufVxuZnVuY3Rpb24gZm5GaW5kTWF0Y2goc0tleXdvcmQsIG9Db250ZXh0LCBvTWFwKSB7XG4gICAgLy8gcmV0dXJuIGEgYmV0dGVyIGNvbnRleHQgaWYgdGhlcmUgaXMgYSBtYXRjaFxuICAgIG9NYXAuc29ydChmdW5jdGlvbiAob0VudHJ5MSwgb0VudHJ5Mikge1xuICAgICAgICB2YXIgdTEgPSBjYWxjRGlzdGFuY2Uob0VudHJ5MS5rZXkudG9Mb3dlckNhc2UoKSwgc0tleXdvcmQpO1xuICAgICAgICB2YXIgdTIgPSBjYWxjRGlzdGFuY2Uob0VudHJ5Mi5rZXkudG9Mb3dlckNhc2UoKSwgc0tleXdvcmQpO1xuICAgICAgICByZXR1cm4gdTEgLSB1MjtcbiAgICB9KTtcbiAgICAvLyBsYXRlcjogaW4gY2FzZSBvZiBjb25mbGljdHMsIGFzayxcbiAgICAvLyBub3c6XG4gICAgdmFyIGRpc3QgPSBjYWxjRGlzdGFuY2Uob01hcFswXS5rZXkudG9Mb3dlckNhc2UoKSwgc0tleXdvcmQpO1xuICAgIGRlYnVnbG9nKCdiZXN0IGRpc3QnICsgZGlzdCArICcgLyAgJyArIGRpc3QgKiBzS2V5d29yZC5sZW5ndGggKyAnICcgKyBzS2V5d29yZCk7XG4gICAgaWYgKGRpc3QgPCAxNTApIHtcbiAgICAgICAgdmFyIG8xID0gT2JqZWN0LmFzc2lnbih7fSwgb0NvbnRleHQpO1xuICAgICAgICB2YXIgbzI7XG4gICAgICAgIG8xLmNvbnRleHQgPSBPYmplY3QuYXNzaWduKHt9LCBvMS5jb250ZXh0KTtcbiAgICAgICAgbzIgPSBvMTtcbiAgICAgICAgbzIuY29udGV4dCA9IE9iamVjdC5hc3NpZ24obzEuY29udGV4dCwgb01hcFswXS5jb250ZXh0KTtcbiAgICAgICAgcmV0dXJuIG8yO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cbi8qKlxuICogYSBmdW5jdGlvbiB0byBtYXRjaCBhIHVuaXQgdGVzdCB1c2luZyBsZXZlbnNodGVpbiBkaXN0YW5jZXNcbiAqIEBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gZm5GaW5kVW5pdFRlc3Qoc3N5c3RlbU9iamVjdElkLCBvQ29udGV4dCkge1xuICAgIHJldHVybiBmbkZpbmRNYXRjaChzc3lzdGVtT2JqZWN0SWQsIG9Db250ZXh0LCBvVW5pdFRlc3RzKTtcbn1cbihmdW5jdGlvbiAoRW51bVJ1bGVUeXBlKSB7XG4gICAgRW51bVJ1bGVUeXBlW0VudW1SdWxlVHlwZVtcIldPUkRcIl0gPSAwXSA9IFwiV09SRFwiO1xuICAgIEVudW1SdWxlVHlwZVtFbnVtUnVsZVR5cGVbXCJSRUdFWFBcIl0gPSAxXSA9IFwiUkVHRVhQXCI7XG59KShleHBvcnRzLkVudW1SdWxlVHlwZSB8fCAoZXhwb3J0cy5FbnVtUnVsZVR5cGUgPSB7fSkpO1xudmFyIEVudW1SdWxlVHlwZSA9IGV4cG9ydHMuRW51bVJ1bGVUeXBlO1xuZnVuY3Rpb24gbm9uUHJpdmF0ZUtleXMob0EpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMob0EpLmZpbHRlcihrZXkgPT4ge1xuICAgICAgICByZXR1cm4ga2V5WzBdICE9PSAnXyc7XG4gICAgfSk7XG59XG5mdW5jdGlvbiBjb3VudEFpbkIob0EsIG9CLCBmbkNvbXBhcmUsIGFLZXlJZ25vcmUpIHtcbiAgICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxuICAgICAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xuICAgIGZuQ29tcGFyZSA9IGZuQ29tcGFyZSB8fCBmdW5jdGlvbiAoKSB7IHJldHVybiB0cnVlOyB9O1xuICAgIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcbiAgICB9KS5cbiAgICAgICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xuICAgICAgICAgICAgcHJldiA9IHByZXYgKyAoZm5Db21wYXJlKG9BW2tleV0sIG9CW2tleV0sIGtleSkgPyAxIDogMCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG59XG5leHBvcnRzLmNvdW50QWluQiA9IGNvdW50QWluQjtcbmZ1bmN0aW9uIHNwdXJpb3VzQW5vdEluQihvQSwgb0IsIGFLZXlJZ25vcmUpIHtcbiAgICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/IGFLZXlJZ25vcmUgOlxuICAgICAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6IFtdO1xuICAgIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcbiAgICB9KS5cbiAgICAgICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0IsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbn1cbmV4cG9ydHMuc3B1cmlvdXNBbm90SW5CID0gc3B1cmlvdXNBbm90SW5CO1xuZnVuY3Rpb24gbG93ZXJDYXNlKG8pIHtcbiAgICBpZiAodHlwZW9mIG8gPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgcmV0dXJuIG8udG9Mb3dlckNhc2UoKTtcbiAgICB9XG4gICAgcmV0dXJuIG87XG59XG5mdW5jdGlvbiBjb21wYXJlQ29udGV4dChvQSwgb0IsIGFLZXlJZ25vcmUpIHtcbiAgICB2YXIgZXF1YWwgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpID09PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xuICAgIHZhciBkaWZmZXJlbnQgPSBjb3VudEFpbkIob0EsIG9CLCBmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpICE9PSBsb3dlckNhc2UoYik7IH0sIGFLZXlJZ25vcmUpO1xuICAgIHZhciBzcHVyaW91c0wgPSBzcHVyaW91c0Fub3RJbkIob0EsIG9CLCBhS2V5SWdub3JlKTtcbiAgICB2YXIgc3B1cmlvdXNSID0gc3B1cmlvdXNBbm90SW5CKG9CLCBvQSwgYUtleUlnbm9yZSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZXF1YWw6IGVxdWFsLFxuICAgICAgICBkaWZmZXJlbnQ6IGRpZmZlcmVudCxcbiAgICAgICAgc3B1cmlvdXNMOiBzcHVyaW91c0wsXG4gICAgICAgIHNwdXJpb3VzUjogc3B1cmlvdXNSXG4gICAgfTtcbn1cbmV4cG9ydHMuY29tcGFyZUNvbnRleHQgPSBjb21wYXJlQ29udGV4dDtcbi8qKlxuICpcbiAqIE9wdGlvbnMgbWF5IGJlIHtcbiAqIG1hdGNob3RoZXJzIDogdHJ1ZSwgID0+IG9ubHkgcnVsZXMgd2hlcmUgYWxsIG90aGVycyBtYXRjaCBhcmUgY29uc2lkZXJlZFxuICogYXVnbWVudCA6IHRydWUsXG4gKiBvdmVycmlkZSA6IHRydWUgfSAgPT5cbiAqXG4gKi9cbmZ1bmN0aW9uIG1hdGNoV29yZChvUnVsZSwgY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChjb250ZXh0W29SdWxlLmtleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgczIgPSBvUnVsZS53b3JkLnRvTG93ZXJDYXNlKCk7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCwgb1J1bGUuZm9sbG93cywgb1J1bGUua2V5KTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShkZWx0YSkpO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTtcbiAgICBpZiAob3B0aW9ucy5tYXRjaG90aGVycyAmJiAoZGVsdGEuZGlmZmVyZW50ID4gMCkpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIGMgPSBjYWxjRGlzdGFuY2UoczIsIHMxKTtcbiAgICBkZWJ1Z2xvZyhcIiBzMSA8PiBzMiBcIiArIHMxICsgXCI8PlwiICsgczIgKyBcIiAgPT46IFwiICsgYyk7XG4gICAgaWYgKGMgPCAxNTApIHtcbiAgICAgICAgdmFyIHJlcyA9IE9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpO1xuICAgICAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgY29udGV4dCk7XG4gICAgICAgIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XG4gICAgICAgICAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgb1J1bGUuZm9sbG93cyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZm9yY2Uga2V5IHByb3BlcnR5XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCcgb2JqZWN0Y2F0ZWdvcnknLCByZXNbJ3N5c3RlbU9iamVjdENhdGVnb3J5J10pO1xuICAgICAgICByZXNbb1J1bGUua2V5XSA9IG9SdWxlLmZvbGxvd3Nbb1J1bGUua2V5XSB8fCByZXNbb1J1bGUua2V5XTtcbiAgICAgICAgcmVzLl93ZWlnaHQgPSBPYmplY3QuYXNzaWduKHt9LCByZXMuX3dlaWdodCk7XG4gICAgICAgIHJlcy5fd2VpZ2h0W29SdWxlLmtleV0gPSBjO1xuICAgICAgICBPYmplY3QuZnJlZXplKHJlcyk7XG4gICAgICAgIGRlYnVnbG9nKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cbmV4cG9ydHMubWF0Y2hXb3JkID0gbWF0Y2hXb3JkO1xuZnVuY3Rpb24gZXh0cmFjdEFyZ3NNYXAobWF0Y2gsIGFyZ3NNYXApIHtcbiAgICB2YXIgcmVzID0ge307XG4gICAgaWYgKCFhcmdzTWFwKSB7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIE9iamVjdC5rZXlzKGFyZ3NNYXApLmZvckVhY2goZnVuY3Rpb24gKGlLZXkpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gbWF0Y2hbaUtleV07XG4gICAgICAgIHZhciBrZXkgPSBhcmdzTWFwW2lLZXldO1xuICAgICAgICBpZiAoKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikgJiYgdmFsdWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmVzW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG59XG5leHBvcnRzLmV4dHJhY3RBcmdzTWFwID0gZXh0cmFjdEFyZ3NNYXA7XG5mdW5jdGlvbiBtYXRjaFJlZ0V4cChvUnVsZSwgY29udGV4dCwgb3B0aW9ucykge1xuICAgIGlmIChjb250ZXh0W29SdWxlLmtleV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgc0tleSA9IG9SdWxlLmtleTtcbiAgICB2YXIgczEgPSBjb250ZXh0W29SdWxlLmtleV0udG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgcmVnID0gb1J1bGUucmVnZXhwO1xuICAgIHZhciBtID0gcmVnLmV4ZWMoczEpO1xuICAgIGRlYnVnbG9nKFwiYXBwbHlpbmcgcmVnZXhwOiBcIiArIHMxICsgXCIgXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XG4gICAgaWYgKCFtKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHZhciBkZWx0YSA9IGNvbXBhcmVDb250ZXh0KGNvbnRleHQsIG9SdWxlLmZvbGxvd3MsIG9SdWxlLmtleSk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcbiAgICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XG4gICAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBvRXh0cmFjdGVkQ29udGV4dCA9IGV4dHJhY3RBcmdzTWFwKG0sIG9SdWxlLmFyZ3NNYXApO1xuICAgIGRlYnVnbG9nKFwiZXh0cmFjdGVkIGFyZ3MgXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZS5hcmdzTWFwKSk7XG4gICAgZGVidWdsb2coXCJtYXRjaCBcIiArIEpTT04uc3RyaW5naWZ5KG0pKTtcbiAgICBkZWJ1Z2xvZyhcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob0V4dHJhY3RlZENvbnRleHQpKTtcbiAgICB2YXIgcmVzID0gT2JqZWN0LmFzc2lnbih7fSwgb1J1bGUuZm9sbG93cyk7XG4gICAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIG9FeHRyYWN0ZWRDb250ZXh0KTtcbiAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgY29udGV4dCk7XG4gICAgaWYgKG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVzW3NLZXldID0gb0V4dHJhY3RlZENvbnRleHRbc0tleV07XG4gICAgfVxuICAgIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XG4gICAgICAgIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBvUnVsZS5mb2xsb3dzKTtcbiAgICAgICAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIG9FeHRyYWN0ZWRDb250ZXh0KTtcbiAgICB9XG4gICAgT2JqZWN0LmZyZWV6ZShyZXMpO1xuICAgIGRlYnVnbG9nKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5tYXRjaFJlZ0V4cCA9IG1hdGNoUmVnRXhwO1xuZnVuY3Rpb24gc29ydEJ5V2VpZ2h0KHNLZXksIG9Db250ZXh0QSwgb0NvbnRleHRCKSB7XG4gICAgZGVidWdsb2coJ3NvcnRpbmc6ICcgKyBzS2V5ICsgJ2ludm9rZWQgd2l0aCcgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEEsIHVuZGVmaW5lZCwgMikgK1xuICAgICAgICBcIiB2cyBcXG5cIiArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0QiwgdW5kZWZpbmVkLCAyKSk7XG4gICAgdmFyIHdlaWdodEEgPSBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QVtcIl93ZWlnaHRcIl1bc0tleV0gfHwgMDtcbiAgICB2YXIgd2VpZ2h0QiA9IG9Db250ZXh0QltcIl93ZWlnaHRcIl0gJiYgb0NvbnRleHRCW1wiX3dlaWdodFwiXVtzS2V5XSB8fCAwO1xuICAgIHJldHVybiArKHdlaWdodEEgLSB3ZWlnaHRCKTtcbn1cbmV4cG9ydHMuc29ydEJ5V2VpZ2h0ID0gc29ydEJ5V2VpZ2h0O1xuLy8gV29yZCwgU3lub255bSwgUmVnZXhwIC8gRXh0cmFjdGlvblJ1bGVcbmZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBvUnVsZXMsIG9wdGlvbnMpIHtcbiAgICB2YXIgc0tleSA9IG9SdWxlc1swXS5rZXk7XG4gICAgLy8gY2hlY2sgdGhhdCBydWxlXG4gICAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcbiAgICAgICAgLy8gY2hlY2sgY29uc2lzdGVuY3lcbiAgICAgICAgb1J1bGVzLmV2ZXJ5KGZ1bmN0aW9uIChpUnVsZSkge1xuICAgICAgICAgICAgaWYgKGlSdWxlLmtleSAhPT0gc0tleSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkluaG9tb2dlbm91cyBrZXlzIGluIHJ1bGVzLCBleHBlY3RlZCBcIiArIHNLZXkgKyBcIiB3YXMgXCIgKyBKU09OLnN0cmluZ2lmeShpUnVsZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBsb29rIGZvciBydWxlcyB3aGljaCBtYXRjaFxuICAgIHZhciByZXMgPSBvUnVsZXMubWFwKGZ1bmN0aW9uIChvUnVsZSkge1xuICAgICAgICAvLyBpcyB0aGlzIHJ1bGUgYXBwbGljYWJsZVxuICAgICAgICBzd2l0Y2ggKG9SdWxlLnR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgMCAvKiBXT1JEICovOlxuICAgICAgICAgICAgICAgIHJldHVybiBtYXRjaFdvcmQob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgY2FzZSAxIC8qIFJFR0VYUCAqLzpcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2hSZWdFeHAob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSkuZmlsdGVyKGZ1bmN0aW9uIChvcmVzKSB7XG4gICAgICAgIHJldHVybiAhIW9yZXM7XG4gICAgfSkuc29ydChzb3J0QnlXZWlnaHQuYmluZCh0aGlzLCBzS2V5KSk7XG4gICAgcmV0dXJuIHJlcztcbiAgICAvLyBPYmplY3Qua2V5cygpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAvLyB9KTtcbn1cbmV4cG9ydHMuYXVnbWVudENvbnRleHQxID0gYXVnbWVudENvbnRleHQxO1xuZnVuY3Rpb24gYXVnbWVudENvbnRleHQoY29udGV4dCwgYVJ1bGVzKSB7XG4gICAgdmFyIG9wdGlvbnMxID0ge1xuICAgICAgICBtYXRjaG90aGVyczogdHJ1ZSxcbiAgICAgICAgb3ZlcnJpZGU6IGZhbHNlXG4gICAgfTtcbiAgICB2YXIgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMxKTtcbiAgICBpZiAoYVJlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdmFyIG9wdGlvbnMyID0ge1xuICAgICAgICAgICAgbWF0Y2hvdGhlcnM6IGZhbHNlLFxuICAgICAgICAgICAgb3ZlcnJpZGU6IHRydWVcbiAgICAgICAgfTtcbiAgICAgICAgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMyKTtcbiAgICB9XG4gICAgcmV0dXJuIGFSZXM7XG59XG5leHBvcnRzLmF1Z21lbnRDb250ZXh0ID0gYXVnbWVudENvbnRleHQ7XG5mdW5jdGlvbiBpbnNlcnRPcmRlcmVkKHJlc3VsdCwgaUluc2VydGVkTWVtYmVyLCBsaW1pdCkge1xuICAgIC8vIFRPRE86IHVzZSBzb21lIHdlaWdodFxuICAgIGlmIChyZXN1bHQubGVuZ3RoIDwgbGltaXQpIHtcbiAgICAgICAgcmVzdWx0LnB1c2goaUluc2VydGVkTWVtYmVyKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cbmV4cG9ydHMuaW5zZXJ0T3JkZXJlZCA9IGluc2VydE9yZGVyZWQ7XG5mdW5jdGlvbiB0YWtlVG9wTihhcnIpIHtcbiAgICB2YXIgdSA9IGFyci5maWx0ZXIoZnVuY3Rpb24gKGlubmVyQXJyKSB7IHJldHVybiBpbm5lckFyci5sZW5ndGggPiAwOyB9KTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgLy8gc2hpZnQgb3V0IHRoZSB0b3Agb25lc1xuICAgIHUgPSB1Lm1hcChmdW5jdGlvbiAoaUFycikge1xuICAgICAgICB2YXIgdG9wID0gaUFyci5zaGlmdCgpO1xuICAgICAgICByZXMgPSBpbnNlcnRPcmRlcmVkKHJlcywgdG9wLCA1KTtcbiAgICAgICAgcmV0dXJuIGlBcnI7XG4gICAgfSkuZmlsdGVyKGZ1bmN0aW9uIChpbm5lckFycikgeyByZXR1cm4gaW5uZXJBcnIubGVuZ3RoID4gMDsgfSk7XG4gICAgLy8gYXMgQXJyYXk8QXJyYXk8SUZNYXRjaC5jb250ZXh0Pj5cbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy50YWtlVG9wTiA9IHRha2VUb3BOO1xuY29uc3QgaW5wdXRGaWx0ZXJSdWxlcyA9IHJlcXVpcmUoJy4vaW5wdXRGaWx0ZXJSdWxlcycpO1xuZnVuY3Rpb24gYXBwbHlSdWxlcyhjb250ZXh0KSB7XG4gICAgdmFyIGJlc3ROID0gW2NvbnRleHRdO1xuICAgIGlucHV0RmlsdGVyUnVsZXMub0tleU9yZGVyLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgICAgdmFyIGJlc3ROZXh0ID0gW107XG4gICAgICAgIGJlc3ROLmZvckVhY2goZnVuY3Rpb24gKG9Db250ZXh0KSB7XG4gICAgICAgICAgICBpZiAob0NvbnRleHRbc0tleV0pIHtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZygnKiogYXBwbHlpbmcgcnVsZXMgZm9yICcgKyBzS2V5KTtcbiAgICAgICAgICAgICAgICB2YXIgcmVzID0gYXVnbWVudENvbnRleHQob0NvbnRleHQsIGlucHV0RmlsdGVyUnVsZXMub1J1bGVNYXBbc0tleV0gfHwgW10pO1xuICAgICAgICAgICAgICAgIGRlYnVnbG9nKCcqKiByZXN1bHQgZm9yICcgKyBzS2V5ICsgJyA9ICcgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpO1xuICAgICAgICAgICAgICAgIGJlc3ROZXh0LnB1c2gocmVzIHx8IFtdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIHJ1bGUgbm90IHJlbGV2YW50XG4gICAgICAgICAgICAgICAgYmVzdE5leHQucHVzaChbb0NvbnRleHRdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGJlc3ROID0gdGFrZVRvcE4oYmVzdE5leHQpO1xuICAgIH0pO1xuICAgIHJldHVybiBiZXN0Tjtcbn1cbmV4cG9ydHMuYXBwbHlSdWxlcyA9IGFwcGx5UnVsZXM7XG4vKipcbiAqIERlY2lkZSB3aGV0aGVyIHRvIHJlcXVlcnkgZm9yIGEgY29udGV0XG4gKi9cbmZ1bmN0aW9uIGRlY2lkZU9uUmVRdWVyeShjb250ZXh0KSB7XG4gICAgcmV0dXJuIFtdO1xufVxuZXhwb3J0cy5kZWNpZGVPblJlUXVlcnkgPSBkZWNpZGVPblJlUXVlcnk7XG52YXIgYVNob3dFbnRpdHlBY3Rpb25zID0gW1xuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtSWQ6ICd1djInLFxuICAgICAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXG4gICAgICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscCdcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1djIud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3VpMi91c2hlbGwvc2hlbGxzL2FiYXAvRmlvcmlMYXVuY2hwYWQuaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbUlkOiAndXYyJyxcbiAgICAgICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxuICAgICAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHBkJ1xuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXV2Mi53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvc2FwL2Fyc3J2Y191cGJfYWRtbi9tYWluLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1JZDogJ3UxeScsXG4gICAgICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcbiAgICAgICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwJ1xuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXUxeS53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvdWkyL3VzaGVsbC9zaGVsbHMvYWJhcC9GaW9yaUxhdW5jaHBhZC5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtSWQ6ICd1MXknLFxuICAgICAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXG4gICAgICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscGQnXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdTF5LndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS9zYXAvYXJzcnZjX3VwYl9hZG1uL21haW4uaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbUlkOiAndXYyJyxcbiAgICAgICAgICAgIGNsaWVudDogJzEyMCcsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ2NhdGFsb2cnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IC8uKi8sXG4gICAgICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXG4gICAgICAgICAgICB0b29sOiAnRkxQRCdcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1djIud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3NhcC9hcnNydmNfdXBiX2FkbW4vbWFpbi5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0jQ0FUQUxPRzp7c3lzdGVtT2JqZWN0SWR9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAndW5pdCcsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogZm5GaW5kVW5pdFRlc3RcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwOi8vbG9jYWxob3N0OjgwODAve3BhdGh9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAnd2lraScsXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly93aWtpLndkZi5zYXAuY29ycC97cGF0aH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtSWQ6ICdKSVJBJ1xuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vamlyYS53ZGYuc2FwLmNvcnA6ODA4MC9USVBDT1JFVUlJSSdcbiAgICAgICAgfVxuICAgIH1cbl07XG4vLyBpZiBUT09MID0gSklSQSB8fCBTeXN0ZW1JZCA9IEpJUkEgLT4gU3lzdGVtSWQgPSBKSVJBXG4vL1xuLy9cbi8vIHN0YXJ0U0FQR1VJXG4vLyAgIE46XFw+XCJjOlxcUHJvZ3JhbSBGaWxlcyAoeDg2KVxcU0FQXFxGcm9udEVuZFxcU0FQZ3VpXCJcXHNhcHNoY3V0LmV4ZSAgLXN5c3RlbT1VVjIgLWNsaWVudD0xMjAgLWNvbW1hbmQ9U0UzOCAtdHlwZT1UcmFuc2FjdGlvbiAtdXNlcj1BVVNFUlxuZnVuY3Rpb24gZXhwYW5kUGFyYW1ldGVyc0luVVJMKG9NZXJnZWRDb250ZXh0UmVzdWx0KSB7XG4gICAgdmFyIHB0biA9IG9NZXJnZWRDb250ZXh0UmVzdWx0LnJlc3VsdC5wYXR0ZXJuO1xuICAgIE9iamVjdC5rZXlzKG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cCgneycgKyBzS2V5ICsgJ30nLCAnZycpO1xuICAgICAgICBwdG4gPSBwdG4ucmVwbGFjZShyZWdleCwgb01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dFtzS2V5XSk7XG4gICAgICAgIHB0biA9IHB0bi5yZXBsYWNlKHJlZ2V4LCBvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0W3NLZXldKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcHRuO1xufVxuZnVuY3Rpb24gbnJNYXRjaGVzKGFPYmplY3QsIG9Db250ZXh0KSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKGFPYmplY3QpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0NvbnRleHQsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbn1cbmZ1bmN0aW9uIG5yTm9NYXRjaGVzKGFPYmplY3QsIG9Db250ZXh0KSB7XG4gICAgdmFyIG5vTWF0Y2hBID0gT2JqZWN0LmtleXMoYU9iamVjdCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0NvbnRleHQsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbiAgICB2YXIgbm9NYXRjaEIgPSBPYmplY3Qua2V5cyhvQ29udGV4dCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYU9iamVjdCwga2V5KSkge1xuICAgICAgICAgICAgcHJldiA9IHByZXYgKyAxO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIDApO1xuICAgIHJldHVybiBub01hdGNoQSArIG5vTWF0Y2hCO1xufVxuZnVuY3Rpb24gc2FtZU9yU3RhcihzMSwgczIsIG9FbnRpdHkpIHtcbiAgICByZXR1cm4gczEgPT09IHMyIHx8XG4gICAgICAgIChzMSA9PT0gdW5kZWZpbmVkICYmIHMyID09PSBudWxsKSB8fFxuICAgICAgICAoKHMyIGluc3RhbmNlb2YgUmVnRXhwKSAmJiBzMi5leGVjKHMxKSAhPT0gbnVsbCkgfHxcbiAgICAgICAgKCh0eXBlb2YgczIgPT09ICdmdW5jdGlvbicgJiYgczEpICYmIHMyKHMxLCBvRW50aXR5KSk7XG59XG5mdW5jdGlvbiBzYW1lT3JTdGFyRW1wdHkoczEsIHMyLCBvRW50aXR5KSB7XG4gICAgaWYgKHMxID09PSB1bmRlZmluZWQgJiYgczIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHMyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBzMSA9PT0gczIgfHxcbiAgICAgICAgKChzMiBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgczIuZXhlYyhzMSkgIT09IG51bGwpIHx8XG4gICAgICAgICgodHlwZW9mIHMyID09PSAnZnVuY3Rpb24nICYmIHMxKSAmJiBzMihzMSwgb0VudGl0eSkpO1xufVxuZnVuY3Rpb24gZmlsdGVyU2hvd0VudGl0eShvQ29udGV4dCwgYVNob3dFbnRpdHkpIHtcbiAgICB2YXIgYUZpbHRlcmVkO1xuICAgIE9iamVjdC5rZXlzKG9Db250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgICAgIGlmIChvQ29udGV4dFtzS2V5XSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgb0NvbnRleHRbc0tleV0gPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBhRmlsdGVyZWQgPSBhU2hvd0VudGl0eS5maWx0ZXIoZnVuY3Rpb24gKG9TaG93RW50aXR5KSB7XG4gICAgICAgIC8vICAgICAgIGNvbnNvbGUubG9nKFwiLi4uXCIpXG4gICAgICAgIC8vICAgICAgY29uc29sZS5sb2cob1Nob3dFbnRpdHkuY29udGV4dC50b29sICsgXCIgXCIgKyBvQ29udGV4dC50b29sICsgXCJcXG5cIilcbiAgICAgICAgLy8gICAgICBjb25zb2xlLmxvZyhvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCArIFwiIFwiICsgb0NvbnRleHQuY2xpZW50ICtcIjpcIiArIHNhbWVPclN0YXIob0NvbnRleHQuY2xpZW50LG9TaG93RW50aXR5LmNvbnRleHQuY2xpZW50KSArIFwiXFxuXCIpXG4gICAgICAgIC8vICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShvU2hvd0VudGl0eS5jb250ZXh0KSArIFwiXFxuXCIgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dC5jbGllbnQpICsgXCJcXG5cIilcbiAgICAgICAgcmV0dXJuIHNhbWVPclN0YXIob1Nob3dFbnRpdHkuY29udGV4dC5zeXN0ZW1JZCwgb0NvbnRleHQuc3lzdGVtSWQsIG9Db250ZXh0KSAmJlxuICAgICAgICAgICAgc2FtZU9yU3RhcihvQ29udGV4dC50b29sLCBvU2hvd0VudGl0eS5jb250ZXh0LnRvb2wsIG9Db250ZXh0KSAmJlxuICAgICAgICAgICAgc2FtZU9yU3RhcihvQ29udGV4dC5jbGllbnQsIG9TaG93RW50aXR5LmNvbnRleHQuY2xpZW50LCBvQ29udGV4dCkgJiZcbiAgICAgICAgICAgIHNhbWVPclN0YXJFbXB0eShvQ29udGV4dC5zeXN0ZW1PYmplY3RDYXRlZ29yeSwgb1Nob3dFbnRpdHkuY29udGV4dC5zeXN0ZW1PYmplY3RDYXRlZ29yeSwgb0NvbnRleHQpICYmXG4gICAgICAgICAgICBzYW1lT3JTdGFyRW1wdHkob0NvbnRleHQuc3lzdGVtT2JqZWN0SWQsIG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtT2JqZWN0SWQsIG9Db250ZXh0KTtcbiAgICAgICAgLy8gICAgICAmJiBvU2hvd0VudGl0eS5jb250ZXh0LnRvb2wgPT09IG9Db250ZXh0LnRvb2xcbiAgICB9KTtcbiAgICAvLyAgY29uc29sZS5sb2coYUZpbHRlcmVkLmxlbmd0aClcbiAgICAvLyBtYXRjaCBvdGhlciBjb250ZXh0IHBhcmFtZXRlcnNcbiAgICBhRmlsdGVyZWQuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICB2YXIgbnJNYXRjaGVzQSA9IG5yTWF0Y2hlcyhhLmNvbnRleHQsIG9Db250ZXh0KTtcbiAgICAgICAgdmFyIG5yTWF0Y2hlc0IgPSBuck1hdGNoZXMoYi5jb250ZXh0LCBvQ29udGV4dCk7XG4gICAgICAgIHZhciBuck5vTWF0Y2hlc0EgPSBuck5vTWF0Y2hlcyhhLmNvbnRleHQsIG9Db250ZXh0KTtcbiAgICAgICAgdmFyIG5yTm9NYXRjaGVzQiA9IG5yTm9NYXRjaGVzKGIuY29udGV4dCwgb0NvbnRleHQpO1xuICAgICAgICAvLyAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGEuY29udGV4dCkpXG4gICAgICAgIC8vICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYi5jb250ZXh0KSlcbiAgICAgICAgLy8gICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShvQ29udGV4dCkpXG4gICAgICAgIHZhciByZXMgPSAtKG5yTWF0Y2hlc0EgLSBuck1hdGNoZXNCKSAqIDEwMCArIChuck5vTWF0Y2hlc0EgLSBuck5vTWF0Y2hlc0IpO1xuICAgICAgICAvLyAgICAgY29uc29sZS5sb2coXCJkaWZmIFwiICsgcmVzKVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH0pO1xuICAgIGlmIChhRmlsdGVyZWQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGRlYnVnbG9nKCdubyB0YXJnZXQgZm9yIHNob3dFbnRpdHkgJyArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0KSk7XG4gICAgfVxuICAgIC8vIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGFGaWx0ZXJlZCx1bmRlZmluZWQsMikpXG4gICAgaWYgKGFGaWx0ZXJlZFswXSkge1xuICAgICAgICAvLyBleGVjdXRlIGFsbCBmdW5jdGlvbnNcbiAgICAgICAgdmFyIG9NYXRjaCA9IGFGaWx0ZXJlZFswXTtcbiAgICAgICAgdmFyIG9NZXJnZWQgPSB7XG4gICAgICAgICAgICBjb250ZXh0OiB7fVxuICAgICAgICB9O1xuICAgICAgICBvTWVyZ2VkLmNvbnRleHQgPSBPYmplY3QuYXNzaWduKHt9LCBvTWVyZ2VkLmNvbnRleHQsIGFGaWx0ZXJlZFswXS5jb250ZXh0LCBvQ29udGV4dCk7XG4gICAgICAgIG9NZXJnZWQgPSBPYmplY3QuYXNzaWduKG9NZXJnZWQsIHtcbiAgICAgICAgICAgIHJlc3VsdDogYUZpbHRlcmVkWzBdLnJlc3VsdFxuICAgICAgICB9KTtcbiAgICAgICAgT2JqZWN0LmtleXMob01hdGNoLmNvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb01hdGNoLmNvbnRleHRbc0tleV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZygnTm93IHJldHJvZml0dGluZyA6JyArIHNLZXkgKyAnIC0gJyArIG9Db250ZXh0W3NLZXldKTtcbiAgICAgICAgICAgICAgICBvTWVyZ2VkID0gb01hdGNoLmNvbnRleHRbc0tleV0ob0NvbnRleHRbc0tleV0sIG9NZXJnZWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG9NZXJnZWQ7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuLy8gRTpcXHByb2plY3RzXFxub2RlanNcXGJvdGJ1aWxkZXJcXHNhbXBsZWJvdD5cIiVQcm9ncmFtRmlsZXMoeDg2KSVcXEdvb2dsZVxcQ2hyb21lXFxBcHBsaWNhdGlvblxcY2hyb21lLmV4ZVwiIC0taW5jb2duaXRvIC11cmwgd3d3LnNwaWVnZWwuZGVcbmV4cG9ydHMuYWIgPSB7XG4gICAgX3Rlc3Q6IHtcbiAgICAgICAgc2FtZU9yU3Rhcjogc2FtZU9yU3RhcixcbiAgICAgICAgbnJNYXRjaGVzOiBuck1hdGNoZXMsXG4gICAgICAgIG5yTm9NYXRjaGVzOiBuck5vTWF0Y2hlcyxcbiAgICAgICAgZXhwYW5kUGFyYW1ldGVyc0luVVJMOiBleHBhbmRQYXJhbWV0ZXJzSW5VUkwsXG4gICAgICAgIGZpbHRlclNob3dFbnRpdHk6IGZpbHRlclNob3dFbnRpdHksXG4gICAgICAgIGZuRmluZFVuaXRUZXN0OiBmbkZpbmRVbml0VGVzdCxcbiAgICAgICAgY2FsY0Rpc3RhbmNlOiBjYWxjRGlzdGFuY2UsXG4gICAgICAgIF9hU2hvd0VudGl0eUFjdGlvbnM6IGFTaG93RW50aXR5QWN0aW9uc1xuICAgIH1cbn07XG4vL2V4cG9ydHMgZGlzcGF0Y2hlcjtcbi8vbW9kdWxlLmV4cG9ydHMgPSBkaXNwYXRjaGVyXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
