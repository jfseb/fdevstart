/// <reference path="../../lib/node-4.d.ts" />
"use strict";
/**
 * the input filter stage preprocesses a current context
 *
 * It a) combines multi-segment arguments into one context members
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
        res._weight = res._weight || {};
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9pbnB1dEZpbHRlci50cyIsIm1hdGNoL2lucHV0RmlsdGVyLmpzIl0sIm5hbWVzIjpbImRpc3RhbmNlIiwicmVxdWlyZSIsImRlYnVnIiwiZGVidWdsb2ciLCJtYXRjaGRhdGEiLCJvVW5pdFRlc3RzIiwiY2FsY0Rpc3RhbmNlIiwic1RleHQxIiwic1RleHQyIiwiYTAiLCJsZXZlbnNodGVpbiIsInN1YnN0cmluZyIsImxlbmd0aCIsImEiLCJ0b0xvd2VyQ2FzZSIsImZuRmluZE1hdGNoIiwic0tleXdvcmQiLCJvQ29udGV4dCIsIm9NYXAiLCJzb3J0Iiwib0VudHJ5MSIsIm9FbnRyeTIiLCJ1MSIsImtleSIsInUyIiwiZGlzdCIsIm8xIiwiT2JqZWN0IiwiYXNzaWduIiwibzIiLCJjb250ZXh0IiwiZm5GaW5kVW5pdFRlc3QiLCJzc3lzdGVtT2JqZWN0SWQiLCJFbnVtUnVsZVR5cGUiLCJleHBvcnRzIiwibm9uUHJpdmF0ZUtleXMiLCJvQSIsImtleXMiLCJmaWx0ZXIiLCJjb3VudEFpbkIiLCJvQiIsImZuQ29tcGFyZSIsImFLZXlJZ25vcmUiLCJBcnJheSIsImlzQXJyYXkiLCJpbmRleE9mIiwicmVkdWNlIiwicHJldiIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiY2FsbCIsInNwdXJpb3VzQW5vdEluQiIsImxvd2VyQ2FzZSIsIm8iLCJjb21wYXJlQ29udGV4dCIsImVxdWFsIiwiYiIsImRpZmZlcmVudCIsInNwdXJpb3VzTCIsInNwdXJpb3VzUiIsIm1hdGNoV29yZCIsIm9SdWxlIiwib3B0aW9ucyIsInVuZGVmaW5lZCIsInMxIiwiczIiLCJ3b3JkIiwiZGVsdGEiLCJmb2xsb3dzIiwiSlNPTiIsInN0cmluZ2lmeSIsIm1hdGNob3RoZXJzIiwiYyIsInJlcyIsIm92ZXJyaWRlIiwiX3dlaWdodCIsImZyZWV6ZSIsImV4dHJhY3RBcmdzTWFwIiwibWF0Y2giLCJhcmdzTWFwIiwiZm9yRWFjaCIsImlLZXkiLCJ2YWx1ZSIsIm1hdGNoUmVnRXhwIiwic0tleSIsInJlZyIsInJlZ2V4cCIsIm0iLCJleGVjIiwib0V4dHJhY3RlZENvbnRleHQiLCJzb3J0QnlXZWlnaHQiLCJvQ29udGV4dEEiLCJvQ29udGV4dEIiLCJ3ZWlnaHRBIiwid2VpZ2h0QiIsImF1Z21lbnRDb250ZXh0MSIsIm9SdWxlcyIsImVuYWJsZWQiLCJldmVyeSIsImlSdWxlIiwiRXJyb3IiLCJtYXAiLCJ0eXBlIiwib3JlcyIsImJpbmQiLCJhdWdtZW50Q29udGV4dCIsImFSdWxlcyIsIm9wdGlvbnMxIiwiYVJlcyIsIm9wdGlvbnMyIiwiYVNob3dFbnRpdHlBY3Rpb25zIiwic3lzdGVtSWQiLCJjbGllbnQiLCJzeXN0ZW10eXBlIiwic3lzdGVtT2JqZWN0SWQiLCJyZXN1bHQiLCJwYXR0ZXJuIiwic3lzdGVtT2JqZWN0Q2F0ZWdvcnkiLCJ0b29sIiwiZXhwYW5kUGFyYW1ldGVyc0luVVJMIiwib01lcmdlZENvbnRleHRSZXN1bHQiLCJwdG4iLCJyZWdleCIsIlJlZ0V4cCIsInJlcGxhY2UiLCJuck1hdGNoZXMiLCJhT2JqZWN0IiwibnJOb01hdGNoZXMiLCJub01hdGNoQSIsIm5vTWF0Y2hCIiwic2FtZU9yU3RhciIsIm9FbnRpdHkiLCJzYW1lT3JTdGFyRW1wdHkiLCJmaWx0ZXJTaG93RW50aXR5IiwiYVNob3dFbnRpdHkiLCJhRmlsdGVyZWQiLCJvU2hvd0VudGl0eSIsIm5yTWF0Y2hlc0EiLCJuck1hdGNoZXNCIiwibnJOb01hdGNoZXNBIiwibnJOb01hdGNoZXNCIiwib01hdGNoIiwib01lcmdlZCIsImFiIiwiX3Rlc3QiLCJfYVNob3dFbnRpdHlBY3Rpb25zIl0sIm1hcHBpbmdzIjoiQUFBQTtBQ0NBO0FERUE7Ozs7Ozs7O0FBT0EsSUFBWUEsV0FBUUMsUUFBTSw2QkFBTixDQUFwQjtBQUVBLElBQVlDLFFBQUtELFFBQU0sT0FBTixDQUFqQjtBQUVBLElBQU1FLFdBQVdELE1BQU0sYUFBTixDQUFqQjtBQUVBLElBQVlFLFlBQVNILFFBQU0sYUFB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QU1MdEcsd0JBQWdCQSxjQU5YO0FBT0x6QixzQkFBY0EsWUFQVDtBQVFMMkksNkJBQXFCbkM7QUFSaEI7QUFEUyxDQUFMO0FBYWI7QUFFQSIsImZpbGUiOiJtYXRjaC9pbnB1dEZpbHRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9saWIvbm9kZS00LmQudHNcIiAvPlxyXG5cclxuXHJcbi8qKlxyXG4gKiB0aGUgaW5wdXQgZmlsdGVyIHN0YWdlIHByZXByb2Nlc3NlcyBhIGN1cnJlbnQgY29udGV4dFxyXG4gKlxyXG4gKiBJdCBhKSBjb21iaW5lcyBtdWx0aS1zZWdtZW50IGFyZ3VtZW50cyBpbnRvIG9uZSBjb250ZXh0IG1lbWJlcnNcclxuICogQG1vZHVsZVxyXG4gKiBAZmlsZSBpbnB1dEZpbHRlci50c1xyXG4gKi9cclxuaW1wb3J0ICogYXMgZGlzdGFuY2UgZnJvbSAnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluJztcclxuXHJcbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcclxuXHJcbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ2lucHV0RmlsdGVyJylcclxuXHJcbmltcG9ydCAqIGFzIG1hdGNoZGF0YSBmcm9tICcuL21hdGNoZGF0YSc7XHJcbiAgdmFyIG9Vbml0VGVzdHMgPSBtYXRjaGRhdGEub1VuaXRUZXN0c1xyXG5cclxuICBmdW5jdGlvbiBjYWxjRGlzdGFuY2UgKHNUZXh0MSA6IHN0cmluZywgc1RleHQyIDogc3RyaW5nKSA6IG51bWJlciB7XHJcbiAgICAvLyBjb25zb2xlLmxvZyhcImxlbmd0aDJcIiArIHNUZXh0MSArIFwiIC0gXCIgKyBzVGV4dDIpXHJcbiAgICB2YXIgYTAgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEuc3Vic3RyaW5nKDAsIHNUZXh0Mi5sZW5ndGgpLCBzVGV4dDIpXHJcbiAgICB2YXIgYSA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS50b0xvd2VyQ2FzZSgpLCBzVGV4dDIpXHJcbiAgICByZXR1cm4gYTAgKiA1MDAgLyBzVGV4dDIubGVuZ3RoICsgYVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZm5GaW5kTWF0Y2ggKHNLZXl3b3JkLCBvQ29udGV4dCA6IElGTWF0Y2guY29udGV4dCwgb01hcCkge1xyXG4gICAgLy8gcmV0dXJuIGEgYmV0dGVyIGNvbnRleHQgaWYgdGhlcmUgaXMgYSBtYXRjaFxyXG4gICAgb01hcC5zb3J0KGZ1bmN0aW9uIChvRW50cnkxLCBvRW50cnkyKSB7XHJcbiAgICAgIHZhciB1MSA9IGNhbGNEaXN0YW5jZShvRW50cnkxLmtleS50b0xvd2VyQ2FzZSgpLCBzS2V5d29yZClcclxuICAgICAgdmFyIHUyID0gY2FsY0Rpc3RhbmNlKG9FbnRyeTIua2V5LnRvTG93ZXJDYXNlKCksIHNLZXl3b3JkKVxyXG4gICAgICByZXR1cm4gdTEgLSB1MlxyXG4gICAgfSlcclxuICAgIC8vIGxhdGVyOiBpbiBjYXNlIG9mIGNvbmZsaWN0cywgYXNrLFxyXG4gICAgLy8gbm93OlxyXG4gICAgdmFyIGRpc3QgPSBjYWxjRGlzdGFuY2Uob01hcFswXS5rZXkudG9Mb3dlckNhc2UoKSwgc0tleXdvcmQpXHJcbiAgICBkZWJ1Z2xvZygnYmVzdCBkaXN0JyArIGRpc3QgKyAnIC8gICcgKyBkaXN0ICogc0tleXdvcmQubGVuZ3RoICsgJyAnICsgc0tleXdvcmQpXHJcbiAgICBpZiAoZGlzdCA8IDE1MCkge1xyXG4gICAgICB2YXIgbzEgPSBPYmplY3QuYXNzaWduKHt9LCBvQ29udGV4dCkgYXMgYW55XHJcbiAgICAgIHZhciBvMlxyXG4gICAgICBvMS5jb250ZXh0ID0gT2JqZWN0LmFzc2lnbih7fSwgbzEuY29udGV4dClcclxuICAgICAgbzIgPSBvMVxyXG4gICAgICBvMi5jb250ZXh0ID0gT2JqZWN0LmFzc2lnbihvMS5jb250ZXh0LCBvTWFwWzBdLmNvbnRleHQpXHJcbiAgICAgIHJldHVybiBvMlxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG51bGxcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIGEgZnVuY3Rpb24gdG8gbWF0Y2ggYSB1bml0IHRlc3QgdXNpbmcgbGV2ZW5zaHRlaW4gZGlzdGFuY2VzXHJcbiAgICogQHB1YmxpY1xyXG4gICAqL1xyXG4gIGZ1bmN0aW9uIGZuRmluZFVuaXRUZXN0IChzc3lzdGVtT2JqZWN0SWQsIG9Db250ZXh0KSB7XHJcbiAgICByZXR1cm4gZm5GaW5kTWF0Y2goc3N5c3RlbU9iamVjdElkLCBvQ29udGV4dCwgb1VuaXRUZXN0cylcclxuICB9XHJcblxyXG5pbXBvcnQgKiBhcyBJRk1hdGNoIGZyb20gJy4uL21hdGNoL2lmbWF0Y2gnO1xyXG5cclxuZXhwb3J0IGNvbnN0ICBlbnVtIEVudW1SdWxlVHlwZSB7XHJcbiAgV09SRCAsXHJcbiAgUkVHRVhQXHJcbn1cclxuXHJcbmludGVyZmFjZSBJUnVsZSB7XHJcbiAgdHlwZSA6IEVudW1SdWxlVHlwZSxcclxuICBrZXkgOiBzdHJpbmcsXHJcbiAgd29yZD8gOiBzdHJpbmcsXHJcbiAgcmVnZXhwPyA6IFJlZ0V4cCxcclxuICBhcmdzTWFwPyA6IHsgW2tleTpudW1iZXJdIDogc3RyaW5nfSAgLy8gYSBtYXAgb2YgcmVnZXhwIG1hdGNoIGdyb3VwIC0+IGNvbnRleHQga2V5XHJcbiAgLy8gZS5nLiAvKFthLXowLTldezMsM30pQ0xOVChbXFxkezMsM31dKS9cclxuICAvLyAgICAgIHsgMSA6IFwic3lzdGVtSWRcIiwgMiA6IFwiY2xpZW50XCIgfVxyXG4gIGZvbGxvd3MgOiBJRk1hdGNoLmNvbnRleHRcclxufVxyXG5cclxuaW50ZXJmYWNlIElNYXRjaE9wdGlvbnMge1xyXG4gIG1hdGNob3RoZXJzPyA6IGJvb2xlYW4sXHJcbiAgYXVnbWVudD86IGJvb2xlYW4sXHJcbiAgb3ZlcnJpZGU/IDogYm9vbGVhblxyXG59XHJcblxyXG5pbnRlcmZhY2UgSU1hdGNoQ291bnQge1xyXG4gIGVxdWFsIDogbnVtYmVyXHJcbiAgZGlmZmVyZW50IDogbnVtYmVyXHJcbiAgc3B1cmlvdXNSIDogbnVtYmVyXHJcbiAgc3B1cmlvdXNMIDogbnVtYmVyXHJcbn1cclxuXHJcbmZ1bmN0aW9uIG5vblByaXZhdGVLZXlzKG9BKSB7XHJcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG9BKS5maWx0ZXIoIGtleSA9PiB7XHJcbiAgICByZXR1cm4ga2V5WzBdICE9PSAnXyc7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjb3VudEFpbkIgKG9BLCBvQiwgZm5Db21wYXJlLCBhS2V5SWdub3JlPykgOiBudW1iZXJ7XHJcbiAgIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gIGFLZXlJZ25vcmUgOlxyXG4gICAgICB0eXBlb2YgYUtleUlnbm9yZSA9PT0gXCJzdHJpbmdcIiA/IFthS2V5SWdub3JlXSA6ICBbXTtcclxuICAgZm5Db21wYXJlID0gZm5Db21wYXJlIHx8IGZ1bmN0aW9uKCkgeyByZXR1cm4gdHJ1ZTsgfVxyXG4gICByZXR1cm4gbm9uUHJpdmF0ZUtleXMob0EpLmZpbHRlciggZnVuY3Rpb24oa2V5KSB7XHJcbiAgICAgcmV0dXJuIGFLZXlJZ25vcmUuaW5kZXhPZihrZXkpIDwgMDtcclxuICAgIH0pLlxyXG4gICAgcmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xyXG4gICAgICAgIHByZXYgPSBwcmV2ICsgKGZuQ29tcGFyZShvQVtrZXldLG9CW2tleV0sIGtleSkgPyAxIDogMClcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldlxyXG4gICAgfSwgMClcclxuICB9XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gc3B1cmlvdXNBbm90SW5CKG9BLG9CLCBhS2V5SWdub3JlPyApIHtcclxuICBhS2V5SWdub3JlID0gQXJyYXkuaXNBcnJheShhS2V5SWdub3JlKSA/ICBhS2V5SWdub3JlIDpcclxuICAgICAgdHlwZW9mIGFLZXlJZ25vcmUgPT09IFwic3RyaW5nXCIgPyBbYUtleUlnbm9yZV0gOiAgW107XHJcbiAgIHJldHVybiBub25Qcml2YXRlS2V5cyhvQSkuZmlsdGVyKCBmdW5jdGlvbihrZXkpIHtcclxuICAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xyXG4gICAgfSkuXHJcbiAgICByZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xyXG4gICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xyXG4gICAgICAgIHByZXYgPSBwcmV2ICsgMVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBwcmV2XHJcbiAgICB9LCAwKVxyXG59XHJcblxyXG5mdW5jdGlvbiBsb3dlckNhc2Uobykge1xyXG4gIGlmICh0eXBlb2YgbyA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgcmV0dXJuIG8udG9Mb3dlckNhc2UoKVxyXG4gIH1cclxuICByZXR1cm4gb1xyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY29tcGFyZUNvbnRleHQob0EgLCBvQiwgYUtleUlnbm9yZT8pIHtcclxuICB2YXIgZXF1YWwgPSBjb3VudEFpbkIob0Esb0IsIGZ1bmN0aW9uKGEsYikgeyByZXR1cm4gbG93ZXJDYXNlKGEpID09PSBsb3dlckNhc2UoYik7fSwgYUtleUlnbm9yZSk7XHJcbiAgdmFyIGRpZmZlcmVudCA9IGNvdW50QWluQihvQSxvQiwgZnVuY3Rpb24oYSxiKSB7IHJldHVybiBsb3dlckNhc2UoYSkgIT09IGxvd2VyQ2FzZShiKTt9LCBhS2V5SWdub3JlKTtcclxuICB2YXIgc3B1cmlvdXNMID0gc3B1cmlvdXNBbm90SW5CKG9BLG9CLCBhS2V5SWdub3JlKVxyXG4gIHZhciBzcHVyaW91c1IgPSBzcHVyaW91c0Fub3RJbkIob0Isb0EsIGFLZXlJZ25vcmUpXHJcbiAgcmV0dXJuIHtcclxuICAgIGVxdWFsIDogZXF1YWwsXHJcbiAgICBkaWZmZXJlbnQ6IGRpZmZlcmVudCxcclxuICAgIHNwdXJpb3VzTDogc3B1cmlvdXNMLFxyXG4gICAgc3B1cmlvdXNSOiBzcHVyaW91c1JcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKlxyXG4gKiBPcHRpb25zIG1heSBiZSB7XHJcbiAqIG1hdGNob3RoZXJzIDogdHJ1ZSwgID0+IG9ubHkgcnVsZXMgd2hlcmUgYWxsIG90aGVycyBtYXRjaCBhcmUgY29uc2lkZXJlZFxyXG4gKiBhdWdtZW50IDogdHJ1ZSxcclxuICogb3ZlcnJpZGUgOiB0cnVlIH0gID0+XHJcbiAqXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbWF0Y2hXb3JkKG9SdWxlIDogSVJ1bGUsIGNvbnRleHQgOiBJRk1hdGNoLmNvbnRleHQsIG9wdGlvbnMgPyA6IElNYXRjaE9wdGlvbnMpIHtcclxuICBpZiAoY29udGV4dFtvUnVsZS5rZXldID09PSB1bmRlZmluZWQpIHtcclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgfVxyXG4gIHZhciBzMSA9IGNvbnRleHRbb1J1bGUua2V5XS50b0xvd2VyQ2FzZSgpXHJcbiAgdmFyIHMyID0gb1J1bGUud29yZC50b0xvd2VyQ2FzZSgpO1xyXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XHJcbiAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCxvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpXHJcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XHJcbiAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKXtcclxuICAgIHJldHVybiB1bmRlZmluZWRcclxuICB9XHJcbiAgdmFyIGMgOiBudW1iZXIgPSBjYWxjRGlzdGFuY2UoczIsIHMxKTtcclxuICAgZGVidWdsb2coXCIgczEgPD4gczIgXCIgKyBzMSArIFwiPD5cIiArIHMyICsgXCIgID0+OiBcIiArIGMpO1xyXG4gIGlmKGMgPCAxNTAgKSB7XHJcbiAgICB2YXIgcmVzID0gT2JqZWN0LmFzc2lnbih7fSwgb1J1bGUuZm9sbG93cykgYXMgYW55O1xyXG4gICAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIGNvbnRleHQpO1xyXG4gICAgaWYgKG9wdGlvbnMub3ZlcnJpZGUpIHtcclxuICAgICAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xyXG4gICAgfVxyXG4gICAgLy8gZm9yY2Uga2V5IHByb3BlcnR5XHJcbiAgICAvLyBjb25zb2xlLmxvZygnIG9iamVjdGNhdGVnb3J5JywgcmVzWydzeXN0ZW1PYmplY3RDYXRlZ29yeSddKTtcclxuICAgIHJlc1tvUnVsZS5rZXldID0gb1J1bGUuZm9sbG93c1tvUnVsZS5rZXldIHx8IHJlc1tvUnVsZS5rZXldO1xyXG4gICAgcmVzLl93ZWlnaHQgPSByZXMuX3dlaWdodCB8fCB7fTtcclxuICAgIHJlcy5fd2VpZ2h0W29SdWxlLmtleV0gPSBjO1xyXG4gICAgT2JqZWN0LmZyZWV6ZShyZXMpO1xyXG4gICAgZGVidWdsb2coJ0ZvdW5kIG9uZScgKyBKU09OLnN0cmluZ2lmeShyZXMsdW5kZWZpbmVkLDIpKTtcclxuICAgIHJldHVybiByZXM7XHJcbiAgfVxyXG4gIHJldHVybiB1bmRlZmluZWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0QXJnc01hcChtYXRjaCA6IEFycmF5PHN0cmluZz4gLCBhcmdzTWFwIDogeyBba2V5IDogbnVtYmVyXSA6IHN0cmluZ30pIDogSUZNYXRjaC5jb250ZXh0IHtcclxuICB2YXIgcmVzID0ge30gYXMgSUZNYXRjaC5jb250ZXh0O1xyXG4gIGlmICghYXJnc01hcCkge1xyXG4gICAgcmV0dXJuIHJlcztcclxuICB9XHJcbiAgT2JqZWN0LmtleXMoYXJnc01hcCkuZm9yRWFjaChmdW5jdGlvbihpS2V5KSB7XHJcbiAgICAgIHZhciB2YWx1ZSA9IG1hdGNoW2lLZXldXHJcbiAgICAgIHZhciBrZXkgPSBhcmdzTWFwW2lLZXldO1xyXG4gICAgICBpZiAoKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikgJiYgdmFsdWUubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIHJlc1trZXldID0gdmFsdWVcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoUmVnRXhwKG9SdWxlIDogSVJ1bGUsIGNvbnRleHQgOiBJRk1hdGNoLmNvbnRleHQsIG9wdGlvbnMgPyA6IElNYXRjaE9wdGlvbnMpIHtcclxuICBpZiAoY29udGV4dFtvUnVsZS5rZXldID09PSB1bmRlZmluZWQpIHtcclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgfVxyXG4gIHZhciBzS2V5ID0gb1J1bGUua2V5O1xyXG4gIHZhciBzMSA9IGNvbnRleHRbb1J1bGUua2V5XS50b0xvd2VyQ2FzZSgpXHJcbiAgdmFyIHJlZyA9IG9SdWxlLnJlZ2V4cDtcclxuXHJcbiAgdmFyIG0gPSByZWcuZXhlYyhzMSk7XHJcbiAgZGVidWdsb2coXCJhcHBseWluZyByZWdleHA6IFwiICsgczEgKyBcIiBcIiArIEpTT04uc3RyaW5naWZ5KG0pKTtcclxuICBpZiAoIW0pIHtcclxuICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgfVxyXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XHJcbiAgdmFyIGRlbHRhID0gY29tcGFyZUNvbnRleHQoY29udGV4dCxvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpXHJcbiAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkoZGVsdGEpKTtcclxuICBkZWJ1Z2xvZyhKU09OLnN0cmluZ2lmeShvcHRpb25zKSk7XHJcbiAgaWYgKG9wdGlvbnMubWF0Y2hvdGhlcnMgJiYgKGRlbHRhLmRpZmZlcmVudCA+IDApKXtcclxuICAgIHJldHVybiB1bmRlZmluZWRcclxuICB9XHJcbiAgdmFyIG9FeHRyYWN0ZWRDb250ZXh0ID0gZXh0cmFjdEFyZ3NNYXAobSwgb1J1bGUuYXJnc01hcCApO1xyXG4gIGRlYnVnbG9nKFwiZXh0cmFjdGVkIGFyZ3MgXCIgKyBKU09OLnN0cmluZ2lmeShvUnVsZS5hcmdzTWFwKSk7XHJcbiAgZGVidWdsb2coXCJtYXRjaCBcIiArIEpTT04uc3RyaW5naWZ5KG0pKTtcclxuXHJcbiAgZGVidWdsb2coXCJleHRyYWN0ZWQgYXJncyBcIiArIEpTT04uc3RyaW5naWZ5KG9FeHRyYWN0ZWRDb250ZXh0KSk7XHJcbiAgdmFyIHJlcyA9IE9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpIGFzIGFueTtcclxuICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgb0V4dHJhY3RlZENvbnRleHQpO1xyXG4gIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcclxuICBpZiAob0V4dHJhY3RlZENvbnRleHRbc0tleV0gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgcmVzW3NLZXldID0gb0V4dHJhY3RlZENvbnRleHRbc0tleV07XHJcbiAgfVxyXG4gIGlmIChvcHRpb25zLm92ZXJyaWRlKSB7XHJcbiAgICAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIG9SdWxlLmZvbGxvd3MpO1xyXG4gICAgIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBvRXh0cmFjdGVkQ29udGV4dClcclxuICB9XHJcbiAgT2JqZWN0LmZyZWV6ZShyZXMpO1xyXG4gIGRlYnVnbG9nKCdGb3VuZCBvbmUnICsgSlNPTi5zdHJpbmdpZnkocmVzLHVuZGVmaW5lZCwyKSk7XHJcbiAgcmV0dXJuIHJlcztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNvcnRCeVdlaWdodChzS2V5IDogc3RyaW5nLCBvQ29udGV4dEEgOiBJRk1hdGNoLmNvbnRleHQsIG9Db250ZXh0QiA6IElGTWF0Y2guY29udGV4dCkgIDogbnVtYmVye1xyXG4gIGRlYnVnbG9nKCdzb3J0aW5nOiAnICsgc0tleSArICdpbnZva2VkIHdpdGgnICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHRBLHVuZGVmaW5lZCwyKStcclxuICAgXCIgdnMgXFxuXCIgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEIsdW5kZWZpbmVkLDIpKTtcclxuICB2YXIgd2VpZ2h0QSA9IG9Db250ZXh0QVtcIl93ZWlnaHRcIl0gJiYgb0NvbnRleHRBW1wiX3dlaWdodFwiXVtzS2V5XSAgfHwgMDtcclxuICB2YXIgd2VpZ2h0QiA9IG9Db250ZXh0QltcIl93ZWlnaHRcIl0gJiYgb0NvbnRleHRCW1wiX3dlaWdodFwiXVtzS2V5XSAgfHwgMDtcclxuICByZXR1cm4gKyh3ZWlnaHRBIC0gd2VpZ2h0Qik7XHJcbn1cclxuXHJcblxyXG4vLyBXb3JkLCBTeW5vbnltLCBSZWdleHAgLyBFeHRyYWN0aW9uUnVsZVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0MSggY29udGV4dCA6IElGTWF0Y2guY29udGV4dCwgb1J1bGVzIDogQXJyYXk8SVJ1bGU+LCBvcHRpb25zIDogSU1hdGNoT3B0aW9ucykgOiBBcnJheTxJRk1hdGNoLmNvbnRleHQ+IHtcclxuICB2YXIgc0tleSA9IG9SdWxlc1swXS5rZXk7XHJcbiAgLy8gY2hlY2sgdGhhdCBydWxlXHJcbiAgaWYgKGRlYnVnbG9nLmVuYWJsZWQpIHtcclxuICAgIC8vIGNoZWNrIGNvbnNpc3RlbmN5XHJcbiAgICBvUnVsZXMuZXZlcnkoZnVuY3Rpb24gKGlSdWxlKSB7XHJcbiAgICAgIGlmIChpUnVsZS5rZXkgIT09IHNLZXkpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbmhvbW9nZW5vdXMga2V5cyBpbiBydWxlcywgZXhwZWN0ZWQgXCIgKyBzS2V5ICsgXCIgd2FzIFwiICsgSlNPTi5zdHJpbmdpZnkoaVJ1bGUpKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLy8gbG9vayBmb3IgcnVsZXMgd2hpY2ggbWF0Y2hcclxuICB2YXIgcmVzID0gb1J1bGVzLm1hcChmdW5jdGlvbihvUnVsZSkge1xyXG4gICAgLy8gaXMgdGhpcyBydWxlIGFwcGxpY2FibGVcclxuICAgIHN3aXRjaChvUnVsZS50eXBlKSB7XHJcbiAgICAgIGNhc2UgRW51bVJ1bGVUeXBlLldPUkQ6XHJcbiAgICAgICAgcmV0dXJuIG1hdGNoV29yZChvUnVsZSwgY29udGV4dCwgb3B0aW9ucylcclxuICAgICAgY2FzZSBFbnVtUnVsZVR5cGUuUkVHRVhQOlxyXG4gICAgICAgIHJldHVybiBtYXRjaFJlZ0V4cChvUnVsZSwgY29udGV4dCwgb3B0aW9ucyk7XHJcbiAgIC8vICAgY2FzZSBcIkV4dHJhY3Rpb25cIjpcclxuICAgLy8gICAgIHJldHVybiBtYXRjaEV4dHJhY3Rpb24ob1J1bGUsY29udGV4dCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkXHJcbiAgfSkuZmlsdGVyKGZ1bmN0aW9uKG9yZXMpIHtcclxuICAgIHJldHVybiAhIW9yZXNcclxuICB9KS5zb3J0KFxyXG4gICAgc29ydEJ5V2VpZ2h0LmJpbmQodGhpcywgc0tleSlcclxuICApO1xyXG4gIHJldHVybiByZXM7XHJcbiAgLy8gT2JqZWN0LmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XHJcbiAgLy8gfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhdWdtZW50Q29udGV4dCggY29udGV4dCA6IElGTWF0Y2guY29udGV4dCwgYVJ1bGVzIDogQXJyYXk8SVJ1bGU+KSA6IEFycmF5PElGTWF0Y2guY29udGV4dD4ge1xyXG5cclxudmFyIG9wdGlvbnMxIDogSU1hdGNoT3B0aW9ucyA9IHtcclxuICAgIG1hdGNob3RoZXJzIDogdHJ1ZSxcclxuICAgIG92ZXJyaWRlOiBmYWxzZVxyXG4gIH0gYXMgSU1hdGNoT3B0aW9ucztcclxuXHJcbiAgdmFyIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCxhUnVsZXMsb3B0aW9uczEpXHJcblxyXG4gIGlmIChhUmVzLmxlbmd0aCA9PT0gMCkgIHtcclxuICAgIHZhciBvcHRpb25zMiA6IElNYXRjaE9wdGlvbnMgPSB7XHJcbiAgICAgICAgbWF0Y2hvdGhlcnMgOiBmYWxzZSxcclxuICAgICAgICBvdmVycmlkZTogdHJ1ZVxyXG4gICAgfSBhcyBJTWF0Y2hPcHRpb25zO1xyXG4gICAgYVJlcyA9IGF1Z21lbnRDb250ZXh0MShjb250ZXh0LCBhUnVsZXMsIG9wdGlvbnMyKTtcclxuICB9XHJcbiAgcmV0dXJuIGFSZXM7XHJcbn1cclxuXHJcblxyXG5cclxuICB2YXIgYVNob3dFbnRpdHlBY3Rpb25zID0gW1xyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtSWQ6ICd1djInLFxyXG4gICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxyXG4gICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscCdcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXV2Mi53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvdWkyL3VzaGVsbC9zaGVsbHMvYWJhcC9GaW9yaUxhdW5jaHBhZC5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1JZDogJ3V2MicsXHJcbiAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXHJcbiAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwZCdcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXV2Mi53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvc2FwL2Fyc3J2Y191cGJfYWRtbi9tYWluLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbUlkOiAndTF5JyxcclxuICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcclxuICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHAnXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1MXkud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3VpMi91c2hlbGwvc2hlbGxzL2FiYXAvRmlvcmlMYXVuY2hwYWQuaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtSWQ6ICd1MXknLFxyXG4gICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxyXG4gICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscGQnXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1MXkud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3NhcC9hcnNydmNfdXBiX2FkbW4vbWFpbi5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1JZDogJ3V2MicsXHJcbiAgICAgICAgY2xpZW50OiAnMTIwJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ2NhdGFsb2cnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiAvLiovLFxyXG4gICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcclxuICAgICAgICB0b29sOiAnRkxQRCdcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXV2Mi53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvc2FwL2Fyc3J2Y191cGJfYWRtbi9tYWluLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSNDQVRBTE9HOntzeXN0ZW1PYmplY3RJZH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ3VuaXQnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiBmbkZpbmRVbml0VGVzdFxyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cDovL2xvY2FsaG9zdDo4MDgwL3twYXRofSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAnd2lraScsXHJcbiAgICAgLy8gICBzeXN0ZW1PYmplY3RJZDogZm5GaW5kV2lraVxyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly93aWtpLndkZi5zYXAuY29ycC97cGF0aH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1JZDogJ0pJUkEnXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL2ppcmEud2RmLnNhcC5jb3JwOjgwODAvVElQQ09SRVVJSUknXHJcbiAgICAgIH1cclxuICAgIH1cclxuICBdXHJcblxyXG4gIC8vIGlmIFRPT0wgPSBKSVJBIHx8IFN5c3RlbUlkID0gSklSQSAtPiBTeXN0ZW1JZCA9IEpJUkFcclxuICAvL1xyXG4gIC8vXHJcblxyXG5cclxuICAvLyBzdGFydFNBUEdVSVxyXG5cclxuICAvLyAgIE46XFw+XCJjOlxcUHJvZ3JhbSBGaWxlcyAoeDg2KVxcU0FQXFxGcm9udEVuZFxcU0FQZ3VpXCJcXHNhcHNoY3V0LmV4ZSAgLXN5c3RlbT1VVjIgLWNsaWVudD0xMjAgLWNvbW1hbmQ9U0UzOCAtdHlwZT1UcmFuc2FjdGlvbiAtdXNlcj1BVVNFUlxyXG5cclxuICBmdW5jdGlvbiBleHBhbmRQYXJhbWV0ZXJzSW5VUkwgKG9NZXJnZWRDb250ZXh0UmVzdWx0KSB7XHJcbiAgICB2YXIgcHRuID0gb01lcmdlZENvbnRleHRSZXN1bHQucmVzdWx0LnBhdHRlcm5cclxuICAgIE9iamVjdC5rZXlzKG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcclxuICAgICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cCgneycgKyBzS2V5ICsgJ30nLCAnZycpXHJcbiAgICAgIHB0biA9IHB0bi5yZXBsYWNlKHJlZ2V4LCBvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0W3NLZXldKVxyXG4gICAgICBwdG4gPSBwdG4ucmVwbGFjZShyZWdleCwgb01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dFtzS2V5XSlcclxuICAgIH0pXHJcbiAgICByZXR1cm4gcHRuXHJcbiAgfVxyXG5cclxuXHJcbiAgZnVuY3Rpb24gbnJNYXRjaGVzIChhT2JqZWN0LCBvQ29udGV4dCkge1xyXG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKGFPYmplY3QpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XHJcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0NvbnRleHQsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIDFcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldlxyXG4gICAgfSwgMClcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIG5yTm9NYXRjaGVzIChhT2JqZWN0LCBvQ29udGV4dCkge1xyXG4gICAgdmFyIG5vTWF0Y2hBID0gT2JqZWN0LmtleXMoYU9iamVjdCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0NvbnRleHQsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIDFcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldlxyXG4gICAgfSwgMClcclxuICAgIHZhciBub01hdGNoQiA9IE9iamVjdC5rZXlzKG9Db250ZXh0KS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xyXG4gICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChhT2JqZWN0LCBrZXkpKSB7XHJcbiAgICAgICAgcHJldiA9IHByZXYgKyAxXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHByZXZcclxuICAgIH0sIDApXHJcbiAgICByZXR1cm4gbm9NYXRjaEEgKyBub01hdGNoQlxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gc2FtZU9yU3RhciAoczEgOiBzdHJpbmcsIHMyIDogc3RyaW5nIHwgUmVnRXhwIHwgRnVuY3Rpb24gLCBvRW50aXR5KSB7XHJcbiAgICByZXR1cm4gczEgPT09IHMyIHx8XHJcbiAgICAgIChzMSA9PT0gdW5kZWZpbmVkICYmIHMyID09PSBudWxsKSB8fFxyXG4gICAgICAoKHMyIGluc3RhbmNlb2YgUmVnRXhwKSAmJiBzMi5leGVjKHMxKSAhPT0gbnVsbCkgfHxcclxuICAgICAgKCh0eXBlb2YgczIgPT09ICdmdW5jdGlvbicgJiYgczEpICYmIHMyKHMxLCBvRW50aXR5KSlcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHNhbWVPclN0YXJFbXB0eSAoczEgOiBzdHJpbmcsIHMyIDogc3RyaW5nIHwgUmVnRXhwIHwgRnVuY3Rpb24sIG9FbnRpdHkpIHtcclxuICAgIGlmIChzMSA9PT0gdW5kZWZpbmVkICYmIHMyID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgcmV0dXJuIHRydWVcclxuICAgIH1cclxuICAgIGlmIChzMiA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHMxID09PSBzMiB8fFxyXG4gICAgICAoKHMyIGluc3RhbmNlb2YgUmVnRXhwKSAmJiBzMi5leGVjKHMxKSAhPT0gbnVsbCkgfHxcclxuICAgICAgKCh0eXBlb2YgczIgPT09ICdmdW5jdGlvbicgJiYgczEpICYmIHMyKHMxLCBvRW50aXR5KSlcclxuICB9XHJcbiAgZnVuY3Rpb24gZmlsdGVyU2hvd0VudGl0eSAob0NvbnRleHQsIGFTaG93RW50aXR5KSB7XHJcbiAgICB2YXIgYUZpbHRlcmVkXHJcbiAgICBPYmplY3Qua2V5cyhvQ29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xyXG4gICAgICBpZiAob0NvbnRleHRbc0tleV0gPT09IG51bGwpIHtcclxuICAgICAgICBvQ29udGV4dFtzS2V5XSA9IHVuZGVmaW5lZFxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gICAgYUZpbHRlcmVkID0gYVNob3dFbnRpdHkuZmlsdGVyKGZ1bmN0aW9uIChvU2hvd0VudGl0eSkge1xyXG4gICAgICAvLyAgICAgICBjb25zb2xlLmxvZyhcIi4uLlwiKVxyXG4gICAgICAvLyAgICAgIGNvbnNvbGUubG9nKG9TaG93RW50aXR5LmNvbnRleHQudG9vbCArIFwiIFwiICsgb0NvbnRleHQudG9vbCArIFwiXFxuXCIpXHJcbiAgICAgIC8vICAgICAgY29uc29sZS5sb2cob1Nob3dFbnRpdHkuY29udGV4dC5jbGllbnQgKyBcIiBcIiArIG9Db250ZXh0LmNsaWVudCArXCI6XCIgKyBzYW1lT3JTdGFyKG9Db250ZXh0LmNsaWVudCxvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCkgKyBcIlxcblwiKVxyXG4gICAgICAvLyAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkob1Nob3dFbnRpdHkuY29udGV4dCkgKyBcIlxcblwiICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHQuY2xpZW50KSArIFwiXFxuXCIpXHJcblxyXG4gICAgICByZXR1cm4gc2FtZU9yU3RhcihvU2hvd0VudGl0eS5jb250ZXh0LnN5c3RlbUlkLCBvQ29udGV4dC5zeXN0ZW1JZCwgb0NvbnRleHQpICYmXHJcbiAgICAgICAgc2FtZU9yU3RhcihvQ29udGV4dC50b29sLCBvU2hvd0VudGl0eS5jb250ZXh0LnRvb2wsIG9Db250ZXh0KSAmJlxyXG4gICAgICAgIHNhbWVPclN0YXIob0NvbnRleHQuY2xpZW50LCBvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCwgb0NvbnRleHQpICYmXHJcbiAgICAgICAgc2FtZU9yU3RhckVtcHR5KG9Db250ZXh0LnN5c3RlbU9iamVjdENhdGVnb3J5LCBvU2hvd0VudGl0eS5jb250ZXh0LnN5c3RlbU9iamVjdENhdGVnb3J5LCBvQ29udGV4dCkgJiZcclxuICAgICAgICBzYW1lT3JTdGFyRW1wdHkob0NvbnRleHQuc3lzdGVtT2JqZWN0SWQsIG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtT2JqZWN0SWQsIG9Db250ZXh0KVxyXG4gICAgLy8gICAgICAmJiBvU2hvd0VudGl0eS5jb250ZXh0LnRvb2wgPT09IG9Db250ZXh0LnRvb2xcclxuICAgIH0pXHJcbiAgICAvLyAgY29uc29sZS5sb2coYUZpbHRlcmVkLmxlbmd0aClcclxuICAgIC8vIG1hdGNoIG90aGVyIGNvbnRleHQgcGFyYW1ldGVyc1xyXG4gICAgYUZpbHRlcmVkLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcclxuICAgICAgdmFyIG5yTWF0Y2hlc0EgPSBuck1hdGNoZXMoYS5jb250ZXh0LCBvQ29udGV4dClcclxuICAgICAgdmFyIG5yTWF0Y2hlc0IgPSBuck1hdGNoZXMoYi5jb250ZXh0LCBvQ29udGV4dClcclxuICAgICAgdmFyIG5yTm9NYXRjaGVzQSA9IG5yTm9NYXRjaGVzKGEuY29udGV4dCwgb0NvbnRleHQpXHJcbiAgICAgIHZhciBuck5vTWF0Y2hlc0IgPSBuck5vTWF0Y2hlcyhiLmNvbnRleHQsIG9Db250ZXh0KVxyXG4gICAgICAvLyAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGEuY29udGV4dCkpXHJcbiAgICAgIC8vICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYi5jb250ZXh0KSlcclxuICAgICAgLy8gICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShvQ29udGV4dCkpXHJcbiAgICAgIHZhciByZXMgPSAtKG5yTWF0Y2hlc0EgLSBuck1hdGNoZXNCKSAqIDEwMCArIChuck5vTWF0Y2hlc0EgLSBuck5vTWF0Y2hlc0IpXHJcbiAgICAgIC8vICAgICBjb25zb2xlLmxvZyhcImRpZmYgXCIgKyByZXMpXHJcbiAgICAgIHJldHVybiByZXNcclxuICAgIH0pXHJcbiAgICBpZiAoYUZpbHRlcmVkLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICBkZWJ1Z2xvZygnbm8gdGFyZ2V0IGZvciBzaG93RW50aXR5ICcgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dCkpXHJcbiAgICB9XHJcbiAgICAvLyBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhRmlsdGVyZWQsdW5kZWZpbmVkLDIpKVxyXG4gICAgaWYgKGFGaWx0ZXJlZFswXSkge1xyXG4gICAgICAvLyBleGVjdXRlIGFsbCBmdW5jdGlvbnNcclxuXHJcbiAgICAgIHZhciBvTWF0Y2ggPSBhRmlsdGVyZWRbMF1cclxuXHJcbiAgICAgIHZhciBvTWVyZ2VkID0ge1xyXG4gICAgICAgIGNvbnRleHQ6IHtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIG9NZXJnZWQuY29udGV4dCA9IE9iamVjdC5hc3NpZ24oe30sIG9NZXJnZWQuY29udGV4dCwgYUZpbHRlcmVkWzBdLmNvbnRleHQsIG9Db250ZXh0KVxyXG4gICAgICBvTWVyZ2VkID0gT2JqZWN0LmFzc2lnbihvTWVyZ2VkLCB7XHJcbiAgICAgICAgcmVzdWx0OiBhRmlsdGVyZWRbMF0ucmVzdWx0XHJcbiAgICAgIH0pXHJcblxyXG4gICAgICBPYmplY3Qua2V5cyhvTWF0Y2guY29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xyXG4gICAgICAgIGlmICh0eXBlb2Ygb01hdGNoLmNvbnRleHRbc0tleV0gPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgIGRlYnVnbG9nKCdOb3cgcmV0cm9maXR0aW5nIDonICsgc0tleSArICcgLSAnICsgb0NvbnRleHRbc0tleV0pXHJcbiAgICAgICAgICBvTWVyZ2VkID0gb01hdGNoLmNvbnRleHRbc0tleV0ob0NvbnRleHRbc0tleV0sIG9NZXJnZWQpXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG5cclxuICAgICAgcmV0dXJuIG9NZXJnZWRcclxuICAgIH1cclxuICAgIHJldHVybiBudWxsXHJcbiAgfVxyXG5cclxuXHJcbiAgLy8gRTpcXHByb2plY3RzXFxub2RlanNcXGJvdGJ1aWxkZXJcXHNhbXBsZWJvdD5cIiVQcm9ncmFtRmlsZXMoeDg2KSVcXEdvb2dsZVxcQ2hyb21lXFxBcHBsaWNhdGlvblxcY2hyb21lLmV4ZVwiIC0taW5jb2duaXRvIC11cmwgd3d3LnNwaWVnZWwuZGVcclxuXHJcbiAgZXhwb3J0IGNvbnN0IGFiID0ge1xyXG4gICAgX3Rlc3Q6IHtcclxuICAgICAgc2FtZU9yU3Rhcjogc2FtZU9yU3RhcixcclxuICAgICAgbnJNYXRjaGVzOiBuck1hdGNoZXMsXHJcbiAgICAgIG5yTm9NYXRjaGVzOiBuck5vTWF0Y2hlcyxcclxuICAgICAgZXhwYW5kUGFyYW1ldGVyc0luVVJMOiBleHBhbmRQYXJhbWV0ZXJzSW5VUkwsXHJcbiAgICAgIGZpbHRlclNob3dFbnRpdHk6IGZpbHRlclNob3dFbnRpdHksXHJcbiAgICAgIGZuRmluZFVuaXRUZXN0OiBmbkZpbmRVbml0VGVzdCxcclxuICAgICAgY2FsY0Rpc3RhbmNlOiBjYWxjRGlzdGFuY2UsXHJcbiAgICAgIF9hU2hvd0VudGl0eUFjdGlvbnM6IGFTaG93RW50aXR5QWN0aW9uc1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy9leHBvcnRzIGRpc3BhdGNoZXI7XHJcblxyXG4gIC8vbW9kdWxlLmV4cG9ydHMgPSBkaXNwYXRjaGVyXHJcblxyXG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vbGliL25vZGUtNC5kLnRzXCIgLz5cblwidXNlIHN0cmljdFwiO1xuLyoqXG4gKiB0aGUgaW5wdXQgZmlsdGVyIHN0YWdlIHByZXByb2Nlc3NlcyBhIGN1cnJlbnQgY29udGV4dFxuICpcbiAqIEl0IGEpIGNvbWJpbmVzIG11bHRpLXNlZ21lbnQgYXJndW1lbnRzIGludG8gb25lIGNvbnRleHQgbWVtYmVyc1xuICogQG1vZHVsZVxuICogQGZpbGUgaW5wdXRGaWx0ZXIudHNcbiAqL1xuY29uc3QgZGlzdGFuY2UgPSByZXF1aXJlKCcuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4nKTtcbmNvbnN0IGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKTtcbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ2lucHV0RmlsdGVyJyk7XG5jb25zdCBtYXRjaGRhdGEgPSByZXF1aXJlKCcuL21hdGNoZGF0YScpO1xudmFyIG9Vbml0VGVzdHMgPSBtYXRjaGRhdGEub1VuaXRUZXN0cztcbmZ1bmN0aW9uIGNhbGNEaXN0YW5jZShzVGV4dDEsIHNUZXh0Mikge1xuICAgIC8vIGNvbnNvbGUubG9nKFwibGVuZ3RoMlwiICsgc1RleHQxICsgXCIgLSBcIiArIHNUZXh0MilcbiAgICB2YXIgYTAgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEuc3Vic3RyaW5nKDAsIHNUZXh0Mi5sZW5ndGgpLCBzVGV4dDIpO1xuICAgIHZhciBhID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnRvTG93ZXJDYXNlKCksIHNUZXh0Mik7XG4gICAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGE7XG59XG5mdW5jdGlvbiBmbkZpbmRNYXRjaChzS2V5d29yZCwgb0NvbnRleHQsIG9NYXApIHtcbiAgICAvLyByZXR1cm4gYSBiZXR0ZXIgY29udGV4dCBpZiB0aGVyZSBpcyBhIG1hdGNoXG4gICAgb01hcC5zb3J0KGZ1bmN0aW9uIChvRW50cnkxLCBvRW50cnkyKSB7XG4gICAgICAgIHZhciB1MSA9IGNhbGNEaXN0YW5jZShvRW50cnkxLmtleS50b0xvd2VyQ2FzZSgpLCBzS2V5d29yZCk7XG4gICAgICAgIHZhciB1MiA9IGNhbGNEaXN0YW5jZShvRW50cnkyLmtleS50b0xvd2VyQ2FzZSgpLCBzS2V5d29yZCk7XG4gICAgICAgIHJldHVybiB1MSAtIHUyO1xuICAgIH0pO1xuICAgIC8vIGxhdGVyOiBpbiBjYXNlIG9mIGNvbmZsaWN0cywgYXNrLFxuICAgIC8vIG5vdzpcbiAgICB2YXIgZGlzdCA9IGNhbGNEaXN0YW5jZShvTWFwWzBdLmtleS50b0xvd2VyQ2FzZSgpLCBzS2V5d29yZCk7XG4gICAgZGVidWdsb2coJ2Jlc3QgZGlzdCcgKyBkaXN0ICsgJyAvICAnICsgZGlzdCAqIHNLZXl3b3JkLmxlbmd0aCArICcgJyArIHNLZXl3b3JkKTtcbiAgICBpZiAoZGlzdCA8IDE1MCkge1xuICAgICAgICB2YXIgbzEgPSBPYmplY3QuYXNzaWduKHt9LCBvQ29udGV4dCk7XG4gICAgICAgIHZhciBvMjtcbiAgICAgICAgbzEuY29udGV4dCA9IE9iamVjdC5hc3NpZ24oe30sIG8xLmNvbnRleHQpO1xuICAgICAgICBvMiA9IG8xO1xuICAgICAgICBvMi5jb250ZXh0ID0gT2JqZWN0LmFzc2lnbihvMS5jb250ZXh0LCBvTWFwWzBdLmNvbnRleHQpO1xuICAgICAgICByZXR1cm4gbzI7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuLyoqXG4gKiBhIGZ1bmN0aW9uIHRvIG1hdGNoIGEgdW5pdCB0ZXN0IHVzaW5nIGxldmVuc2h0ZWluIGRpc3RhbmNlc1xuICogQHB1YmxpY1xuICovXG5mdW5jdGlvbiBmbkZpbmRVbml0VGVzdChzc3lzdGVtT2JqZWN0SWQsIG9Db250ZXh0KSB7XG4gICAgcmV0dXJuIGZuRmluZE1hdGNoKHNzeXN0ZW1PYmplY3RJZCwgb0NvbnRleHQsIG9Vbml0VGVzdHMpO1xufVxuKGZ1bmN0aW9uIChFbnVtUnVsZVR5cGUpIHtcbiAgICBFbnVtUnVsZVR5cGVbRW51bVJ1bGVUeXBlW1wiV09SRFwiXSA9IDBdID0gXCJXT1JEXCI7XG4gICAgRW51bVJ1bGVUeXBlW0VudW1SdWxlVHlwZVtcIlJFR0VYUFwiXSA9IDFdID0gXCJSRUdFWFBcIjtcbn0pKGV4cG9ydHMuRW51bVJ1bGVUeXBlIHx8IChleHBvcnRzLkVudW1SdWxlVHlwZSA9IHt9KSk7XG52YXIgRW51bVJ1bGVUeXBlID0gZXhwb3J0cy5FbnVtUnVsZVR5cGU7XG5mdW5jdGlvbiBub25Qcml2YXRlS2V5cyhvQSkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhvQSkuZmlsdGVyKGtleSA9PiB7XG4gICAgICAgIHJldHVybiBrZXlbMF0gIT09ICdfJztcbiAgICB9KTtcbn1cbmZ1bmN0aW9uIGNvdW50QWluQihvQSwgb0IsIGZuQ29tcGFyZSwgYUtleUlnbm9yZSkge1xuICAgIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gYUtleUlnbm9yZSA6XG4gICAgICAgIHR5cGVvZiBhS2V5SWdub3JlID09PSBcInN0cmluZ1wiID8gW2FLZXlJZ25vcmVdIDogW107XG4gICAgZm5Db21wYXJlID0gZm5Db21wYXJlIHx8IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH07XG4gICAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xuICAgIH0pLlxuICAgICAgICByZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9CLCBrZXkpKSB7XG4gICAgICAgICAgICBwcmV2ID0gcHJldiArIChmbkNvbXBhcmUob0Fba2V5XSwgb0Jba2V5XSwga2V5KSA/IDEgOiAwKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbn1cbmV4cG9ydHMuY291bnRBaW5CID0gY291bnRBaW5CO1xuZnVuY3Rpb24gc3B1cmlvdXNBbm90SW5CKG9BLCBvQiwgYUtleUlnbm9yZSkge1xuICAgIGFLZXlJZ25vcmUgPSBBcnJheS5pc0FycmF5KGFLZXlJZ25vcmUpID8gYUtleUlnbm9yZSA6XG4gICAgICAgIHR5cGVvZiBhS2V5SWdub3JlID09PSBcInN0cmluZ1wiID8gW2FLZXlJZ25vcmVdIDogW107XG4gICAgcmV0dXJuIG5vblByaXZhdGVLZXlzKG9BKS5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICByZXR1cm4gYUtleUlnbm9yZS5pbmRleE9mKGtleSkgPCAwO1xuICAgIH0pLlxuICAgICAgICByZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xuICAgICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQiwga2V5KSkge1xuICAgICAgICAgICAgcHJldiA9IHByZXYgKyAxO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIDApO1xufVxuZXhwb3J0cy5zcHVyaW91c0Fub3RJbkIgPSBzcHVyaW91c0Fub3RJbkI7XG5mdW5jdGlvbiBsb3dlckNhc2Uobykge1xuICAgIGlmICh0eXBlb2YgbyA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICByZXR1cm4gby50b0xvd2VyQ2FzZSgpO1xuICAgIH1cbiAgICByZXR1cm4gbztcbn1cbmZ1bmN0aW9uIGNvbXBhcmVDb250ZXh0KG9BLCBvQiwgYUtleUlnbm9yZSkge1xuICAgIHZhciBlcXVhbCA9IGNvdW50QWluQihvQSwgb0IsIGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBsb3dlckNhc2UoYSkgPT09IGxvd2VyQ2FzZShiKTsgfSwgYUtleUlnbm9yZSk7XG4gICAgdmFyIGRpZmZlcmVudCA9IGNvdW50QWluQihvQSwgb0IsIGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBsb3dlckNhc2UoYSkgIT09IGxvd2VyQ2FzZShiKTsgfSwgYUtleUlnbm9yZSk7XG4gICAgdmFyIHNwdXJpb3VzTCA9IHNwdXJpb3VzQW5vdEluQihvQSwgb0IsIGFLZXlJZ25vcmUpO1xuICAgIHZhciBzcHVyaW91c1IgPSBzcHVyaW91c0Fub3RJbkIob0IsIG9BLCBhS2V5SWdub3JlKTtcbiAgICByZXR1cm4ge1xuICAgICAgICBlcXVhbDogZXF1YWwsXG4gICAgICAgIGRpZmZlcmVudDogZGlmZmVyZW50LFxuICAgICAgICBzcHVyaW91c0w6IHNwdXJpb3VzTCxcbiAgICAgICAgc3B1cmlvdXNSOiBzcHVyaW91c1JcbiAgICB9O1xufVxuZXhwb3J0cy5jb21wYXJlQ29udGV4dCA9IGNvbXBhcmVDb250ZXh0O1xuLyoqXG4gKlxuICogT3B0aW9ucyBtYXkgYmUge1xuICogbWF0Y2hvdGhlcnMgOiB0cnVlLCAgPT4gb25seSBydWxlcyB3aGVyZSBhbGwgb3RoZXJzIG1hdGNoIGFyZSBjb25zaWRlcmVkXG4gKiBhdWdtZW50IDogdHJ1ZSxcbiAqIG92ZXJyaWRlIDogdHJ1ZSB9ICA9PlxuICpcbiAqL1xuZnVuY3Rpb24gbWF0Y2hXb3JkKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgaWYgKGNvbnRleHRbb1J1bGUua2V5XSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBzMSA9IGNvbnRleHRbb1J1bGUua2V5XS50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciBzMiA9IG9SdWxlLndvcmQudG9Mb3dlckNhc2UoKTtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB2YXIgZGVsdGEgPSBjb21wYXJlQ29udGV4dChjb250ZXh0LCBvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlbHRhKSk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkob3B0aW9ucykpO1xuICAgIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgYyA9IGNhbGNEaXN0YW5jZShzMiwgczEpO1xuICAgIGRlYnVnbG9nKFwiIHMxIDw+IHMyIFwiICsgczEgKyBcIjw+XCIgKyBzMiArIFwiICA9PjogXCIgKyBjKTtcbiAgICBpZiAoYyA8IDE1MCkge1xuICAgICAgICB2YXIgcmVzID0gT2JqZWN0LmFzc2lnbih7fSwgb1J1bGUuZm9sbG93cyk7XG4gICAgICAgIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBjb250ZXh0KTtcbiAgICAgICAgaWYgKG9wdGlvbnMub3ZlcnJpZGUpIHtcbiAgICAgICAgICAgIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBvUnVsZS5mb2xsb3dzKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBmb3JjZSBrZXkgcHJvcGVydHlcbiAgICAgICAgLy8gY29uc29sZS5sb2coJyBvYmplY3RjYXRlZ29yeScsIHJlc1snc3lzdGVtT2JqZWN0Q2F0ZWdvcnknXSk7XG4gICAgICAgIHJlc1tvUnVsZS5rZXldID0gb1J1bGUuZm9sbG93c1tvUnVsZS5rZXldIHx8IHJlc1tvUnVsZS5rZXldO1xuICAgICAgICByZXMuX3dlaWdodCA9IHJlcy5fd2VpZ2h0IHx8IHt9O1xuICAgICAgICByZXMuX3dlaWdodFtvUnVsZS5rZXldID0gYztcbiAgICAgICAgT2JqZWN0LmZyZWV6ZShyZXMpO1xuICAgICAgICBkZWJ1Z2xvZygnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5leHBvcnRzLm1hdGNoV29yZCA9IG1hdGNoV29yZDtcbmZ1bmN0aW9uIGV4dHJhY3RBcmdzTWFwKG1hdGNoLCBhcmdzTWFwKSB7XG4gICAgdmFyIHJlcyA9IHt9O1xuICAgIGlmICghYXJnc01hcCkge1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cbiAgICBPYmplY3Qua2V5cyhhcmdzTWFwKS5mb3JFYWNoKGZ1bmN0aW9uIChpS2V5KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IG1hdGNoW2lLZXldO1xuICAgICAgICB2YXIga2V5ID0gYXJnc01hcFtpS2V5XTtcbiAgICAgICAgaWYgKCh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpICYmIHZhbHVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJlc1trZXldID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xufVxuZXhwb3J0cy5leHRyYWN0QXJnc01hcCA9IGV4dHJhY3RBcmdzTWFwO1xuZnVuY3Rpb24gbWF0Y2hSZWdFeHAob1J1bGUsIGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICBpZiAoY29udGV4dFtvUnVsZS5rZXldID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIHNLZXkgPSBvUnVsZS5rZXk7XG4gICAgdmFyIHMxID0gY29udGV4dFtvUnVsZS5rZXldLnRvTG93ZXJDYXNlKCk7XG4gICAgdmFyIHJlZyA9IG9SdWxlLnJlZ2V4cDtcbiAgICB2YXIgbSA9IHJlZy5leGVjKHMxKTtcbiAgICBkZWJ1Z2xvZyhcImFwcGx5aW5nIHJlZ2V4cDogXCIgKyBzMSArIFwiIFwiICsgSlNPTi5zdHJpbmdpZnkobSkpO1xuICAgIGlmICghbSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB2YXIgZGVsdGEgPSBjb21wYXJlQ29udGV4dChjb250ZXh0LCBvUnVsZS5mb2xsb3dzLCBvUnVsZS5rZXkpO1xuICAgIGRlYnVnbG9nKEpTT04uc3RyaW5naWZ5KGRlbHRhKSk7XG4gICAgZGVidWdsb2coSlNPTi5zdHJpbmdpZnkob3B0aW9ucykpO1xuICAgIGlmIChvcHRpb25zLm1hdGNob3RoZXJzICYmIChkZWx0YS5kaWZmZXJlbnQgPiAwKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgb0V4dHJhY3RlZENvbnRleHQgPSBleHRyYWN0QXJnc01hcChtLCBvUnVsZS5hcmdzTWFwKTtcbiAgICBkZWJ1Z2xvZyhcImV4dHJhY3RlZCBhcmdzIFwiICsgSlNPTi5zdHJpbmdpZnkob1J1bGUuYXJnc01hcCkpO1xuICAgIGRlYnVnbG9nKFwibWF0Y2ggXCIgKyBKU09OLnN0cmluZ2lmeShtKSk7XG4gICAgZGVidWdsb2coXCJleHRyYWN0ZWQgYXJncyBcIiArIEpTT04uc3RyaW5naWZ5KG9FeHRyYWN0ZWRDb250ZXh0KSk7XG4gICAgdmFyIHJlcyA9IE9iamVjdC5hc3NpZ24oe30sIG9SdWxlLmZvbGxvd3MpO1xuICAgIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBvRXh0cmFjdGVkQ29udGV4dCk7XG4gICAgcmVzID0gT2JqZWN0LmFzc2lnbihyZXMsIGNvbnRleHQpO1xuICAgIGlmIChvRXh0cmFjdGVkQ29udGV4dFtzS2V5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlc1tzS2V5XSA9IG9FeHRyYWN0ZWRDb250ZXh0W3NLZXldO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5vdmVycmlkZSkge1xuICAgICAgICByZXMgPSBPYmplY3QuYXNzaWduKHJlcywgb1J1bGUuZm9sbG93cyk7XG4gICAgICAgIHJlcyA9IE9iamVjdC5hc3NpZ24ocmVzLCBvRXh0cmFjdGVkQ29udGV4dCk7XG4gICAgfVxuICAgIE9iamVjdC5mcmVlemUocmVzKTtcbiAgICBkZWJ1Z2xvZygnRm91bmQgb25lJyArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgcmV0dXJuIHJlcztcbn1cbmV4cG9ydHMubWF0Y2hSZWdFeHAgPSBtYXRjaFJlZ0V4cDtcbmZ1bmN0aW9uIHNvcnRCeVdlaWdodChzS2V5LCBvQ29udGV4dEEsIG9Db250ZXh0Qikge1xuICAgIGRlYnVnbG9nKCdzb3J0aW5nOiAnICsgc0tleSArICdpbnZva2VkIHdpdGgnICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHRBLCB1bmRlZmluZWQsIDIpICtcbiAgICAgICAgXCIgdnMgXFxuXCIgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dEIsIHVuZGVmaW5lZCwgMikpO1xuICAgIHZhciB3ZWlnaHRBID0gb0NvbnRleHRBW1wiX3dlaWdodFwiXSAmJiBvQ29udGV4dEFbXCJfd2VpZ2h0XCJdW3NLZXldIHx8IDA7XG4gICAgdmFyIHdlaWdodEIgPSBvQ29udGV4dEJbXCJfd2VpZ2h0XCJdICYmIG9Db250ZXh0QltcIl93ZWlnaHRcIl1bc0tleV0gfHwgMDtcbiAgICByZXR1cm4gKyh3ZWlnaHRBIC0gd2VpZ2h0Qik7XG59XG5leHBvcnRzLnNvcnRCeVdlaWdodCA9IHNvcnRCeVdlaWdodDtcbi8vIFdvcmQsIFN5bm9ueW0sIFJlZ2V4cCAvIEV4dHJhY3Rpb25SdWxlXG5mdW5jdGlvbiBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgb1J1bGVzLCBvcHRpb25zKSB7XG4gICAgdmFyIHNLZXkgPSBvUnVsZXNbMF0ua2V5O1xuICAgIC8vIGNoZWNrIHRoYXQgcnVsZVxuICAgIGlmIChkZWJ1Z2xvZy5lbmFibGVkKSB7XG4gICAgICAgIC8vIGNoZWNrIGNvbnNpc3RlbmN5XG4gICAgICAgIG9SdWxlcy5ldmVyeShmdW5jdGlvbiAoaVJ1bGUpIHtcbiAgICAgICAgICAgIGlmIChpUnVsZS5rZXkgIT09IHNLZXkpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbmhvbW9nZW5vdXMga2V5cyBpbiBydWxlcywgZXhwZWN0ZWQgXCIgKyBzS2V5ICsgXCIgd2FzIFwiICsgSlNPTi5zdHJpbmdpZnkoaVJ1bGUpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgLy8gbG9vayBmb3IgcnVsZXMgd2hpY2ggbWF0Y2hcbiAgICB2YXIgcmVzID0gb1J1bGVzLm1hcChmdW5jdGlvbiAob1J1bGUpIHtcbiAgICAgICAgLy8gaXMgdGhpcyBydWxlIGFwcGxpY2FibGVcbiAgICAgICAgc3dpdGNoIChvUnVsZS50eXBlKSB7XG4gICAgICAgICAgICBjYXNlIDAgLyogV09SRCAqLzpcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2hXb3JkKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKTtcbiAgICAgICAgICAgIGNhc2UgMSAvKiBSRUdFWFAgKi86XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hdGNoUmVnRXhwKG9SdWxlLCBjb250ZXh0LCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0pLmZpbHRlcihmdW5jdGlvbiAob3Jlcykge1xuICAgICAgICByZXR1cm4gISFvcmVzO1xuICAgIH0pLnNvcnQoc29ydEJ5V2VpZ2h0LmJpbmQodGhpcywgc0tleSkpO1xuICAgIHJldHVybiByZXM7XG4gICAgLy8gT2JqZWN0LmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgLy8gfSk7XG59XG5leHBvcnRzLmF1Z21lbnRDb250ZXh0MSA9IGF1Z21lbnRDb250ZXh0MTtcbmZ1bmN0aW9uIGF1Z21lbnRDb250ZXh0KGNvbnRleHQsIGFSdWxlcykge1xuICAgIHZhciBvcHRpb25zMSA9IHtcbiAgICAgICAgbWF0Y2hvdGhlcnM6IHRydWUsXG4gICAgICAgIG92ZXJyaWRlOiBmYWxzZVxuICAgIH07XG4gICAgdmFyIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMSk7XG4gICAgaWYgKGFSZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHZhciBvcHRpb25zMiA9IHtcbiAgICAgICAgICAgIG1hdGNob3RoZXJzOiBmYWxzZSxcbiAgICAgICAgICAgIG92ZXJyaWRlOiB0cnVlXG4gICAgICAgIH07XG4gICAgICAgIGFSZXMgPSBhdWdtZW50Q29udGV4dDEoY29udGV4dCwgYVJ1bGVzLCBvcHRpb25zMik7XG4gICAgfVxuICAgIHJldHVybiBhUmVzO1xufVxuZXhwb3J0cy5hdWdtZW50Q29udGV4dCA9IGF1Z21lbnRDb250ZXh0O1xudmFyIGFTaG93RW50aXR5QWN0aW9ucyA9IFtcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbUlkOiAndXYyJyxcbiAgICAgICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxuICAgICAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHAnXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdXYyLndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS91aTIvdXNoZWxsL3NoZWxscy9hYmFwL0Zpb3JpTGF1bmNocGFkLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1JZDogJ3V2MicsXG4gICAgICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcbiAgICAgICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwZCdcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1djIud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3NhcC9hcnNydmNfdXBiX2FkbW4vbWFpbi5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtSWQ6ICd1MXknLFxuICAgICAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXG4gICAgICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscCdcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1MXkud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3VpMi91c2hlbGwvc2hlbGxzL2FiYXAvRmlvcmlMYXVuY2hwYWQuaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbUlkOiAndTF5JyxcbiAgICAgICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxuICAgICAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHBkJ1xuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXUxeS53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvc2FwL2Fyc3J2Y191cGJfYWRtbi9tYWluLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1JZDogJ3V2MicsXG4gICAgICAgICAgICBjbGllbnQ6ICcxMjAnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0Q2F0ZWdvcnk6ICdjYXRhbG9nJyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiAvLiovLFxuICAgICAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxuICAgICAgICAgICAgdG9vbDogJ0ZMUEQnXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdXYyLndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS9zYXAvYXJzcnZjX3VwYl9hZG1uL21haW4uaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9I0NBVEFMT0c6e3N5c3RlbU9iamVjdElkfSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ3VuaXQnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IGZuRmluZFVuaXRUZXN0XG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cDovL2xvY2FsaG9zdDo4MDgwL3twYXRofSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ3dpa2knLFxuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vd2lraS53ZGYuc2FwLmNvcnAve3BhdGh9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbUlkOiAnSklSQSdcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwczovL2ppcmEud2RmLnNhcC5jb3JwOjgwODAvVElQQ09SRVVJSUknXG4gICAgICAgIH1cbiAgICB9XG5dO1xuLy8gaWYgVE9PTCA9IEpJUkEgfHwgU3lzdGVtSWQgPSBKSVJBIC0+IFN5c3RlbUlkID0gSklSQVxuLy9cbi8vXG4vLyBzdGFydFNBUEdVSVxuLy8gICBOOlxcPlwiYzpcXFByb2dyYW0gRmlsZXMgKHg4NilcXFNBUFxcRnJvbnRFbmRcXFNBUGd1aVwiXFxzYXBzaGN1dC5leGUgIC1zeXN0ZW09VVYyIC1jbGllbnQ9MTIwIC1jb21tYW5kPVNFMzggLXR5cGU9VHJhbnNhY3Rpb24gLXVzZXI9QVVTRVJcbmZ1bmN0aW9uIGV4cGFuZFBhcmFtZXRlcnNJblVSTChvTWVyZ2VkQ29udGV4dFJlc3VsdCkge1xuICAgIHZhciBwdG4gPSBvTWVyZ2VkQ29udGV4dFJlc3VsdC5yZXN1bHQucGF0dGVybjtcbiAgICBPYmplY3Qua2V5cyhvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoJ3snICsgc0tleSArICd9JywgJ2cnKTtcbiAgICAgICAgcHRuID0gcHRuLnJlcGxhY2UocmVnZXgsIG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHRbc0tleV0pO1xuICAgICAgICBwdG4gPSBwdG4ucmVwbGFjZShyZWdleCwgb01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dFtzS2V5XSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHB0bjtcbn1cbmZ1bmN0aW9uIG5yTWF0Y2hlcyhhT2JqZWN0LCBvQ29udGV4dCkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhhT2JqZWN0KS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9Db250ZXh0LCBrZXkpKSB7XG4gICAgICAgICAgICBwcmV2ID0gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG59XG5mdW5jdGlvbiBuck5vTWF0Y2hlcyhhT2JqZWN0LCBvQ29udGV4dCkge1xuICAgIHZhciBub01hdGNoQSA9IE9iamVjdC5rZXlzKGFPYmplY3QpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XG4gICAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9Db250ZXh0LCBrZXkpKSB7XG4gICAgICAgICAgICBwcmV2ID0gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG4gICAgdmFyIG5vTWF0Y2hCID0gT2JqZWN0LmtleXMob0NvbnRleHQpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XG4gICAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGFPYmplY3QsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbiAgICByZXR1cm4gbm9NYXRjaEEgKyBub01hdGNoQjtcbn1cbmZ1bmN0aW9uIHNhbWVPclN0YXIoczEsIHMyLCBvRW50aXR5KSB7XG4gICAgcmV0dXJuIHMxID09PSBzMiB8fFxuICAgICAgICAoczEgPT09IHVuZGVmaW5lZCAmJiBzMiA9PT0gbnVsbCkgfHxcbiAgICAgICAgKChzMiBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgczIuZXhlYyhzMSkgIT09IG51bGwpIHx8XG4gICAgICAgICgodHlwZW9mIHMyID09PSAnZnVuY3Rpb24nICYmIHMxKSAmJiBzMihzMSwgb0VudGl0eSkpO1xufVxuZnVuY3Rpb24gc2FtZU9yU3RhckVtcHR5KHMxLCBzMiwgb0VudGl0eSkge1xuICAgIGlmIChzMSA9PT0gdW5kZWZpbmVkICYmIHMyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChzMiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gczEgPT09IHMyIHx8XG4gICAgICAgICgoczIgaW5zdGFuY2VvZiBSZWdFeHApICYmIHMyLmV4ZWMoczEpICE9PSBudWxsKSB8fFxuICAgICAgICAoKHR5cGVvZiBzMiA9PT0gJ2Z1bmN0aW9uJyAmJiBzMSkgJiYgczIoczEsIG9FbnRpdHkpKTtcbn1cbmZ1bmN0aW9uIGZpbHRlclNob3dFbnRpdHkob0NvbnRleHQsIGFTaG93RW50aXR5KSB7XG4gICAgdmFyIGFGaWx0ZXJlZDtcbiAgICBPYmplY3Qua2V5cyhvQ29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xuICAgICAgICBpZiAob0NvbnRleHRbc0tleV0gPT09IG51bGwpIHtcbiAgICAgICAgICAgIG9Db250ZXh0W3NLZXldID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgYUZpbHRlcmVkID0gYVNob3dFbnRpdHkuZmlsdGVyKGZ1bmN0aW9uIChvU2hvd0VudGl0eSkge1xuICAgICAgICAvLyAgICAgICBjb25zb2xlLmxvZyhcIi4uLlwiKVxuICAgICAgICAvLyAgICAgIGNvbnNvbGUubG9nKG9TaG93RW50aXR5LmNvbnRleHQudG9vbCArIFwiIFwiICsgb0NvbnRleHQudG9vbCArIFwiXFxuXCIpXG4gICAgICAgIC8vICAgICAgY29uc29sZS5sb2cob1Nob3dFbnRpdHkuY29udGV4dC5jbGllbnQgKyBcIiBcIiArIG9Db250ZXh0LmNsaWVudCArXCI6XCIgKyBzYW1lT3JTdGFyKG9Db250ZXh0LmNsaWVudCxvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCkgKyBcIlxcblwiKVxuICAgICAgICAvLyAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkob1Nob3dFbnRpdHkuY29udGV4dCkgKyBcIlxcblwiICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHQuY2xpZW50KSArIFwiXFxuXCIpXG4gICAgICAgIHJldHVybiBzYW1lT3JTdGFyKG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtSWQsIG9Db250ZXh0LnN5c3RlbUlkLCBvQ29udGV4dCkgJiZcbiAgICAgICAgICAgIHNhbWVPclN0YXIob0NvbnRleHQudG9vbCwgb1Nob3dFbnRpdHkuY29udGV4dC50b29sLCBvQ29udGV4dCkgJiZcbiAgICAgICAgICAgIHNhbWVPclN0YXIob0NvbnRleHQuY2xpZW50LCBvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCwgb0NvbnRleHQpICYmXG4gICAgICAgICAgICBzYW1lT3JTdGFyRW1wdHkob0NvbnRleHQuc3lzdGVtT2JqZWN0Q2F0ZWdvcnksIG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtT2JqZWN0Q2F0ZWdvcnksIG9Db250ZXh0KSAmJlxuICAgICAgICAgICAgc2FtZU9yU3RhckVtcHR5KG9Db250ZXh0LnN5c3RlbU9iamVjdElkLCBvU2hvd0VudGl0eS5jb250ZXh0LnN5c3RlbU9iamVjdElkLCBvQ29udGV4dCk7XG4gICAgICAgIC8vICAgICAgJiYgb1Nob3dFbnRpdHkuY29udGV4dC50b29sID09PSBvQ29udGV4dC50b29sXG4gICAgfSk7XG4gICAgLy8gIGNvbnNvbGUubG9nKGFGaWx0ZXJlZC5sZW5ndGgpXG4gICAgLy8gbWF0Y2ggb3RoZXIgY29udGV4dCBwYXJhbWV0ZXJzXG4gICAgYUZpbHRlcmVkLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgdmFyIG5yTWF0Y2hlc0EgPSBuck1hdGNoZXMoYS5jb250ZXh0LCBvQ29udGV4dCk7XG4gICAgICAgIHZhciBuck1hdGNoZXNCID0gbnJNYXRjaGVzKGIuY29udGV4dCwgb0NvbnRleHQpO1xuICAgICAgICB2YXIgbnJOb01hdGNoZXNBID0gbnJOb01hdGNoZXMoYS5jb250ZXh0LCBvQ29udGV4dCk7XG4gICAgICAgIHZhciBuck5vTWF0Y2hlc0IgPSBuck5vTWF0Y2hlcyhiLmNvbnRleHQsIG9Db250ZXh0KTtcbiAgICAgICAgLy8gICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhLmNvbnRleHQpKVxuICAgICAgICAvLyAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGIuY29udGV4dCkpXG4gICAgICAgIC8vICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkob0NvbnRleHQpKVxuICAgICAgICB2YXIgcmVzID0gLShuck1hdGNoZXNBIC0gbnJNYXRjaGVzQikgKiAxMDAgKyAobnJOb01hdGNoZXNBIC0gbnJOb01hdGNoZXNCKTtcbiAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKFwiZGlmZiBcIiArIHJlcylcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9KTtcbiAgICBpZiAoYUZpbHRlcmVkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBkZWJ1Z2xvZygnbm8gdGFyZ2V0IGZvciBzaG93RW50aXR5ICcgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dCkpO1xuICAgIH1cbiAgICAvLyBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhRmlsdGVyZWQsdW5kZWZpbmVkLDIpKVxuICAgIGlmIChhRmlsdGVyZWRbMF0pIHtcbiAgICAgICAgLy8gZXhlY3V0ZSBhbGwgZnVuY3Rpb25zXG4gICAgICAgIHZhciBvTWF0Y2ggPSBhRmlsdGVyZWRbMF07XG4gICAgICAgIHZhciBvTWVyZ2VkID0ge1xuICAgICAgICAgICAgY29udGV4dDoge31cbiAgICAgICAgfTtcbiAgICAgICAgb01lcmdlZC5jb250ZXh0ID0gT2JqZWN0LmFzc2lnbih7fSwgb01lcmdlZC5jb250ZXh0LCBhRmlsdGVyZWRbMF0uY29udGV4dCwgb0NvbnRleHQpO1xuICAgICAgICBvTWVyZ2VkID0gT2JqZWN0LmFzc2lnbihvTWVyZ2VkLCB7XG4gICAgICAgICAgICByZXN1bHQ6IGFGaWx0ZXJlZFswXS5yZXN1bHRcbiAgICAgICAgfSk7XG4gICAgICAgIE9iamVjdC5rZXlzKG9NYXRjaC5jb250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9NYXRjaC5jb250ZXh0W3NLZXldID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgZGVidWdsb2coJ05vdyByZXRyb2ZpdHRpbmcgOicgKyBzS2V5ICsgJyAtICcgKyBvQ29udGV4dFtzS2V5XSk7XG4gICAgICAgICAgICAgICAgb01lcmdlZCA9IG9NYXRjaC5jb250ZXh0W3NLZXldKG9Db250ZXh0W3NLZXldLCBvTWVyZ2VkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBvTWVyZ2VkO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cbi8vIEU6XFxwcm9qZWN0c1xcbm9kZWpzXFxib3RidWlsZGVyXFxzYW1wbGVib3Q+XCIlUHJvZ3JhbUZpbGVzKHg4NiklXFxHb29nbGVcXENocm9tZVxcQXBwbGljYXRpb25cXGNocm9tZS5leGVcIiAtLWluY29nbml0byAtdXJsIHd3dy5zcGllZ2VsLmRlXG5leHBvcnRzLmFiID0ge1xuICAgIF90ZXN0OiB7XG4gICAgICAgIHNhbWVPclN0YXI6IHNhbWVPclN0YXIsXG4gICAgICAgIG5yTWF0Y2hlczogbnJNYXRjaGVzLFxuICAgICAgICBuck5vTWF0Y2hlczogbnJOb01hdGNoZXMsXG4gICAgICAgIGV4cGFuZFBhcmFtZXRlcnNJblVSTDogZXhwYW5kUGFyYW1ldGVyc0luVVJMLFxuICAgICAgICBmaWx0ZXJTaG93RW50aXR5OiBmaWx0ZXJTaG93RW50aXR5LFxuICAgICAgICBmbkZpbmRVbml0VGVzdDogZm5GaW5kVW5pdFRlc3QsXG4gICAgICAgIGNhbGNEaXN0YW5jZTogY2FsY0Rpc3RhbmNlLFxuICAgICAgICBfYVNob3dFbnRpdHlBY3Rpb25zOiBhU2hvd0VudGl0eUFjdGlvbnNcbiAgICB9XG59O1xuLy9leHBvcnRzIGRpc3BhdGNoZXI7XG4vL21vZHVsZS5leHBvcnRzID0gZGlzcGF0Y2hlclxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
