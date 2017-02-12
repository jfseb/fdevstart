/**
 * @file
 * @module jfseb.fdevstart.dispatcher
 * @copyright (c) 2016 Gerd Forstmann
 */
"use strict";

var AnyObject = Object;
var distance = require("../utils/damerauLevenshtein");
var debug = require("debug");
var debuglog = debug('dispatcher');
var child_process_1 = require("child_process");
//  var exec = require('child_process').exec
//  var leven = require('../utils/damerauLevenshtein.js').levenshtein
var exectemplate = require("../exec/exectemplate");
//var leven = require('../utils/damerauLevenshtein.js')
var matchdata = require("./matchdata");
var Algol = require("../match/algol");
var oUnitTests = matchdata.oUnitTests;
var oWikis = matchdata.oWikis;
function calcDistance(sText1, sText2) {
    return distance.calcDistance(sText1.toLowerCase(), sText2);
    /*
    debuglog("length2" + sText1 + " - " + sText2)
    var a0 = distance.levenshtein(sText1.substring(0, sText2.length), sText2)
    var a = distance.levenshtein(sText1.toLowerCase(), sText2)
    return a0 * 500 / sText2.length + a
    */
}
function fnFindMatch(sKeyword, oContext, oMap) {
    // return a better context if there is a match
    // sKeyword = sKeyword.toLowerCase();
    var sKeywordLc = sKeyword.toLowerCase();
    oMap.sort(function (oEntry1, oEntry2) {
        var u1 = calcDistance(oEntry1.key, sKeywordLc);
        var u2 = calcDistance(oEntry2.key, sKeywordLc);
        return u2 - u1;
    });
    // later: in case of conflicts, ask,
    // now:
    var dist = calcDistance(oMap[0].key, sKeywordLc);
    debuglog('best dist' + dist + ' /  ' + oMap[0].key + ' ' + sKeyword);
    if (dist > Algol.Cutoff_WordMatch) {
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
function fnFindWiki(sKeyword, oContext) {
    return fnFindMatch(sKeyword, oContext, oWikis);
}
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
        systemObjectCategory: 'fiori catalog',
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
        systemObjectCategory: 'unit test',
        systemObjectId: fnFindUnitTest
    },
    result: {
        type: 'URL',
        pattern: 'http://localhost:8080/{path}'
    }
}, {
    context: {
        systemObjectCategory: 'wiki',
        systemObjectId: fnFindWiki
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
function startBrowser(url) {
    var cmd = '"%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" --incognito -url "' + url + '"';
    child_process_1.exec(cmd, function (error, stdout, stderr) {
        if (error) {
            console.error("exec error: " + error);
            return;
        }
        debuglog("stdout: " + stdout);
        debuglog("stderr: " + stderr);
    });
}
// startSAPGUI
//   N:\>"c:\Program Files (x86)\SAP\FrontEnd\SAPgui"\sapshcut.exe  -system=UV2 -client=120 -command=SE38 -type=Transaction -user=AUSER
function expandParametersInURL(oMergedContextResult) {
    var ptn = oMergedContextResult.result.pattern;
    ptn = exectemplate.expandTemplate(oMergedContextResult.context, ptn);
    /*    Object.keys(oMergedContextResult.context).forEach(function (sKey) {
          var regex = new RegExp('{' + sKey + '}', 'g')
          ptn = ptn.replace(regex, oMergedContextResult.context[sKey])
          ptn = ptn.replace(regex, oMergedContextResult.context[sKey])
        })
        */
    return ptn;
}
function executeStartup(oMergedContextResult) {
    if (oMergedContextResult.result.type === 'URL') {
        var ptn = expandParametersInURL(oMergedContextResult);
        startBrowser(ptn);
        return ptn;
    } else {
        var s = "Don't know how to start " + oMergedContextResult.result.type + '\n for "' + oMergedContextResult.query + '"';
        debuglog(s);
        return s;
    }
}
exports.executeStartup = executeStartup;
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
function filterShowEntityOld(oContext, aShowEntity) {
    var aFiltered;
    Object.keys(oContext).forEach(function (sKey) {
        if (oContext[sKey] === null) {
            oContext[sKey] = undefined;
        }
    });
    // filter context, amending synonyms
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
        oMerged.context = AnyObject.assign({}, oMerged.context, aFiltered[0].context, oContext);
        oMerged = AnyObject.assign(oMerged, {
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
var inputFilter = require("./inputFilter");
function filterShowEntity(oContext, aShowEntityActions) {
    Object.keys(oContext).forEach(function (sKey) {
        if (oContext[sKey] === null) {
            delete oContext[sKey];
        }
    });
    var res = inputFilter.applyRulesPickFirst(oContext);
    if (!res) {
        return undefined;
    }
    debuglog("** after filter rules" + JSON.stringify(res, undefined, 2));
    return filterShowEntityOld(res, aShowEntityActions);
}
function execShowEntity(oEntity) {
    var merged = filterShowEntity(oEntity, aShowEntityActions);
    if (merged) {
        return executeStartup(merged);
    }
    return null;
}
// E:\projects\nodejs\botbuilder\samplebot>"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --incognito -url www.spiegel.de
exports.dispatcher = {
    execShowEntity: execShowEntity,
    _test: {
        sameOrStar: sameOrStar,
        nrMatches: nrMatches,
        nrNoMatches: nrNoMatches,
        expandParametersInURL: expandParametersInURL,
        filterShowEntity: filterShowEntity,
        //  fnFindUnitTest: fnFindUnitTest,
        calcDistance: calcDistance,
        _aShowEntityActions: aShowEntityActions
    }
};
//exports dispatcher;
//module.exports = dispatcher
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9kaXNwYXRjaGVyLnRzIiwibWF0Y2gvZGlzcGF0Y2hlci5qcyJdLCJuYW1lcyI6WyJBbnlPYmplY3QiLCJPYmplY3QiLCJkaXN0YW5jZSIsInJlcXVpcmUiLCJkZWJ1ZyIsImRlYnVnbG9nIiwiY2hpbGRfcHJvY2Vzc18xIiwiZXhlY3RlbXBsYXRlIiwibWF0Y2hkYXRhIiwiQWxnb2wiLCJvVW5pdFRlc3RzIiwib1dpa2lzIiwiY2FsY0Rpc3RhbmNlIiwic1RleHQxIiwic1RleHQyIiwidG9Mb3dlckNhc2UiLCJmbkZpbmRNYXRjaCIsInNLZXl3b3JkIiwib0NvbnRleHQiLCJvTWFwIiwic0tleXdvcmRMYyIsInNvcnQiLCJvRW50cnkxIiwib0VudHJ5MiIsInUxIiwia2V5IiwidTIiLCJkaXN0IiwiQ3V0b2ZmX1dvcmRNYXRjaCIsIm8xIiwiYXNzaWduIiwibzIiLCJjb250ZXh0IiwiZm5GaW5kVW5pdFRlc3QiLCJzc3lzdGVtT2JqZWN0SWQiLCJmbkZpbmRXaWtpIiwiYVNob3dFbnRpdHlBY3Rpb25zIiwic3lzdGVtSWQiLCJjbGllbnQiLCJzeXN0ZW10eXBlIiwic3lzdGVtT2JqZWN0SWQiLCJyZXN1bHQiLCJ0eXBlIiwicGF0dGVybiIsInN5c3RlbU9iamVjdENhdGVnb3J5IiwidG9vbCIsInN0YXJ0QnJvd3NlciIsInVybCIsImNtZCIsImV4ZWMiLCJlcnJvciIsInN0ZG91dCIsInN0ZGVyciIsImNvbnNvbGUiLCJleHBhbmRQYXJhbWV0ZXJzSW5VUkwiLCJvTWVyZ2VkQ29udGV4dFJlc3VsdCIsInB0biIsImV4cGFuZFRlbXBsYXRlIiwiZXhlY3V0ZVN0YXJ0dXAiLCJzIiwicXVlcnkiLCJleHBvcnRzIiwibnJNYXRjaGVzIiwiYU9iamVjdCIsImtleXMiLCJyZWR1Y2UiLCJwcmV2IiwicHJvdG90eXBlIiwiaGFzT3duUHJvcGVydHkiLCJjYWxsIiwibnJOb01hdGNoZXMiLCJub01hdGNoQSIsIm5vTWF0Y2hCIiwic2FtZU9yU3RhciIsInMxIiwiczIiLCJvRW50aXR5IiwidW5kZWZpbmVkIiwiUmVnRXhwIiwic2FtZU9yU3RhckVtcHR5IiwiZmlsdGVyU2hvd0VudGl0eU9sZCIsImFTaG93RW50aXR5IiwiYUZpbHRlcmVkIiwiZm9yRWFjaCIsInNLZXkiLCJmaWx0ZXIiLCJvU2hvd0VudGl0eSIsImEiLCJiIiwibnJNYXRjaGVzQSIsIm5yTWF0Y2hlc0IiLCJuck5vTWF0Y2hlc0EiLCJuck5vTWF0Y2hlc0IiLCJyZXMiLCJsZW5ndGgiLCJKU09OIiwic3RyaW5naWZ5Iiwib01hdGNoIiwib01lcmdlZCIsImlucHV0RmlsdGVyIiwiZmlsdGVyU2hvd0VudGl0eSIsImFwcGx5UnVsZXNQaWNrRmlyc3QiLCJleGVjU2hvd0VudGl0eSIsIm1lcmdlZCIsImRpc3BhdGNoZXIiLCJfdGVzdCIsIl9hU2hvd0VudGl0eUFjdGlvbnMiXSwibWFwcGluZ3MiOiJBQUFBOzs7OztBQ0tBOztBRFFBLElBQUlBLFlBQWtCQyxNQUF0QjtBQUVBLElBQUFDLFdBQUFDLFFBQUEsNkJBQUEsQ0FBQTtBQUVBLElBQUFDLFFBQUFELFFBQUEsT0FBQSxDQUFBO0FBQ0EsSUFBTUUsV0FBV0QsTUFBTSxZQUFOLENBQWpCO0FBRUEsSUFBQUUsa0JBQUFILFFBQUEsZUFBQSxDQUFBO0FBQ0E7QUFDQTtBQUVBLElBQUFJLGVBQUFKLFFBQUEsc0JBQUEsQ0FBQTtBQUVFO0FBQ0YsSUFBQUssWUFBQUwsUUFBQSxhQUFBLENBQUE7QUFFQSxJQUFBTSxRQUFBTixRQUFBLGdCQUFBLENBQUE7QUFFQSxJQUFNTyxhQUFhRixVQUFVRSxVQUE3QjtBQUNBLElBQU1DLFNBQVNILFVBQVVHLE1BQXpCO0FBRUUsU0FBQUMsWUFBQSxDQUF1QkMsTUFBdkIsRUFBK0JDLE1BQS9CLEVBQXFDO0FBQ25DLFdBQU9aLFNBQVNVLFlBQVQsQ0FBc0JDLE9BQU9FLFdBQVAsRUFBdEIsRUFBNENELE1BQTVDLENBQVA7QUFDQTs7Ozs7O0FBTUQ7QUFFRCxTQUFBRSxXQUFBLENBQXNCQyxR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Rk47QUFHTFEscUJBQWFBLFdBSFI7QUFJTGhCLCtCQUF1QkEscUJBSmxCO0FBS0w4QywwQkFBa0JBLGdCQUxiO0FBTVA7QUFDRXhGLHNCQUFjQSxZQVBUO0FBUUw4Riw2QkFBcUJ0RTtBQVJoQjtBQUZpQixDQUFiO0FBY2I7QUFFQSIsImZpbGUiOiJtYXRjaC9kaXNwYXRjaGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEBmaWxlXHJcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmRpc3BhdGNoZXJcclxuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxyXG4gKi9cclxuXHJcblxyXG4vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9saWIvbm9kZS00LmQudHNcIiAvPlxyXG5cclxuZGVjbGFyZSBpbnRlcmZhY2UgT2JqZWN0Q29uc3RydWN0b3Ige1xyXG4gICAgYXNzaWduKHRhcmdldDogYW55LCAuLi5zb3VyY2VzOiBhbnlbXSk6IGFueTtcclxufVxyXG5cclxudmFyIEFueU9iamVjdCA9ICg8YW55Pk9iamVjdCk7XHJcblxyXG5pbXBvcnQgKiBhcyBkaXN0YW5jZSBmcm9tICcuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4nO1xyXG5cclxuaW1wb3J0ICogYXMgZGVidWcgZnJvbSAnZGVidWcnO1xyXG5jb25zdCBkZWJ1Z2xvZyA9IGRlYnVnKCdkaXNwYXRjaGVyJylcclxuXHJcbmltcG9ydCB7IGV4ZWMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcclxuLy8gIHZhciBleGVjID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpLmV4ZWNcclxuLy8gIHZhciBsZXZlbiA9IHJlcXVpcmUoJy4uL3V0aWxzL2RhbWVyYXVMZXZlbnNodGVpbi5qcycpLmxldmVuc2h0ZWluXHJcblxyXG5pbXBvcnQgKiBhcyBleGVjdGVtcGxhdGUgZnJvbSAnLi4vZXhlYy9leGVjdGVtcGxhdGUnO1xyXG5cclxuICAvL3ZhciBsZXZlbiA9IHJlcXVpcmUoJy4uL3V0aWxzL2RhbWVyYXVMZXZlbnNodGVpbi5qcycpXHJcbmltcG9ydCAqIGFzIG1hdGNoZGF0YSBmcm9tICcuL21hdGNoZGF0YSc7XHJcblxyXG5pbXBvcnQgKiBhcyBBbGdvbCBmcm9tICcuLi9tYXRjaC9hbGdvbCc7XHJcblxyXG5jb25zdCBvVW5pdFRlc3RzID0gbWF0Y2hkYXRhLm9Vbml0VGVzdHNcclxuY29uc3Qgb1dpa2lzID0gbWF0Y2hkYXRhLm9XaWtpc1xyXG5cclxuICBmdW5jdGlvbiBjYWxjRGlzdGFuY2UgKHNUZXh0MSwgc1RleHQyKSB7XHJcbiAgICByZXR1cm4gZGlzdGFuY2UuY2FsY0Rpc3RhbmNlKHNUZXh0MS50b0xvd2VyQ2FzZSgpLCBzVGV4dDIpO1xyXG4gICAgLypcclxuICAgIGRlYnVnbG9nKFwibGVuZ3RoMlwiICsgc1RleHQxICsgXCIgLSBcIiArIHNUZXh0MilcclxuICAgIHZhciBhMCA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCksIHNUZXh0MilcclxuICAgIHZhciBhID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnRvTG93ZXJDYXNlKCksIHNUZXh0MilcclxuICAgIHJldHVybiBhMCAqIDUwMCAvIHNUZXh0Mi5sZW5ndGggKyBhXHJcbiAgICAqL1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZm5GaW5kTWF0Y2ggKHNLZXl3b3JkLCBvQ29udGV4dCwgb01hcCkge1xyXG4gICAgLy8gcmV0dXJuIGEgYmV0dGVyIGNvbnRleHQgaWYgdGhlcmUgaXMgYSBtYXRjaFxyXG4gICAgLy8gc0tleXdvcmQgPSBzS2V5d29yZC50b0xvd2VyQ2FzZSgpO1xyXG4gICAgdmFyIHNLZXl3b3JkTGMgPSBzS2V5d29yZC50b0xvd2VyQ2FzZSgpO1xyXG4gICAgb01hcC5zb3J0KGZ1bmN0aW9uIChvRW50cnkxLCBvRW50cnkyKSB7XHJcbiAgICAgIHZhciB1MSA9IGNhbGNEaXN0YW5jZShvRW50cnkxLmtleSwgc0tleXdvcmRMYylcclxuICAgICAgdmFyIHUyID0gY2FsY0Rpc3RhbmNlKG9FbnRyeTIua2V5LCBzS2V5d29yZExjKVxyXG4gICAgICByZXR1cm4gdTIgLSB1MTtcclxuICAgIH0pXHJcbiAgICAvLyBsYXRlcjogaW4gY2FzZSBvZiBjb25mbGljdHMsIGFzayxcclxuICAgIC8vIG5vdzpcclxuICAgIHZhciBkaXN0ID0gY2FsY0Rpc3RhbmNlKG9NYXBbMF0ua2V5LCBzS2V5d29yZExjKVxyXG4gICAgZGVidWdsb2coJ2Jlc3QgZGlzdCcgKyBkaXN0ICsgJyAvICAnICsgb01hcFswXS5rZXkgKyAnICcgKyBzS2V5d29yZClcclxuICAgIGlmIChkaXN0ID4gQWxnb2wuQ3V0b2ZmX1dvcmRNYXRjaCkge1xyXG4gICAgICB2YXIgbzEgPSAoPGFueT5PYmplY3QpLmFzc2lnbih7fSwgb0NvbnRleHQpXHJcbiAgICAgIHZhciBvMlxyXG4gICAgICBvMS5jb250ZXh0ID0gKDxhbnk+T2JqZWN0KS5hc3NpZ24oe30sIG8xLmNvbnRleHQpXHJcbiAgICAgIG8yID0gbzFcclxuICAgICAgbzIuY29udGV4dCA9ICg8YW55Pk9iamVjdCkuYXNzaWduKG8xLmNvbnRleHQsIG9NYXBbMF0uY29udGV4dClcclxuICAgICAgcmV0dXJuIG8yXHJcbiAgICB9XHJcbiAgICByZXR1cm4gbnVsbFxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogYSBmdW5jdGlvbiB0byBtYXRjaCBhIHVuaXQgdGVzdCB1c2luZyBsZXZlbnNodGVpbiBkaXN0YW5jZXNcclxuICAgKiBAcHVibGljXHJcbiAgICovXHJcbiAgZnVuY3Rpb24gZm5GaW5kVW5pdFRlc3QgKHNzeXN0ZW1PYmplY3RJZCwgb0NvbnRleHQpIHtcclxuICAgIHJldHVybiBmbkZpbmRNYXRjaChzc3lzdGVtT2JqZWN0SWQsIG9Db250ZXh0LCBvVW5pdFRlc3RzKVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZm5GaW5kV2lraSAoc0tleXdvcmQsIG9Db250ZXh0KSB7XHJcbiAgICByZXR1cm4gZm5GaW5kTWF0Y2goc0tleXdvcmQsIG9Db250ZXh0LCBvV2lraXMpXHJcbiAgfVxyXG5cclxuICB2YXIgYVNob3dFbnRpdHlBY3Rpb25zID0gW1xyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtSWQ6ICd1djInLFxyXG4gICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxyXG4gICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscCdcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXV2Mi53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvdWkyL3VzaGVsbC9zaGVsbHMvYWJhcC9GaW9yaUxhdW5jaHBhZC5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1JZDogJ3V2MicsXHJcbiAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXHJcbiAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwZCdcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXV2Mi53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvc2FwL2Fyc3J2Y191cGJfYWRtbi9tYWluLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbUlkOiAndTF5JyxcclxuICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcclxuICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHAnXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1MXkud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3VpMi91c2hlbGwvc2hlbGxzL2FiYXAvRmlvcmlMYXVuY2hwYWQuaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtSWQ6ICd1MXknLFxyXG4gICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxyXG4gICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscGQnXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1MXkud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3NhcC9hcnNydmNfdXBiX2FkbW4vbWFpbi5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1JZDogJ3V2MicsXHJcbiAgICAgICAgY2xpZW50OiAnMTIwJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ2Zpb3JpIGNhdGFsb2cnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiAvLiovLFxyXG4gICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcclxuICAgICAgICB0b29sOiAnRkxQRCdcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXV2Mi53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvc2FwL2Fyc3J2Y191cGJfYWRtbi9tYWluLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSNDQVRBTE9HOntzeXN0ZW1PYmplY3RJZH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ3VuaXQnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiBmbkZpbmRVbml0VGVzdFxyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cDovL2xvY2FsaG9zdDo4MDgwL3twYXRofSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ3VuaXQgdGVzdCcsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IGZuRmluZFVuaXRUZXN0XHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwOi8vbG9jYWxob3N0OjgwODAve3BhdGh9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtT2JqZWN0Q2F0ZWdvcnk6ICd3aWtpJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogZm5GaW5kV2lraVxyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly93aWtpLndkZi5zYXAuY29ycC97cGF0aH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1JZDogJ0pJUkEnXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL2ppcmEud2RmLnNhcC5jb3JwOjgwODAvVElQQ09SRVVJSUknXHJcbiAgICAgIH1cclxuICAgIH1cclxuICBdXHJcblxyXG4gIC8vIGlmIFRPT0wgPSBKSVJBIHx8IFN5c3RlbUlkID0gSklSQSAtPiBTeXN0ZW1JZCA9IEpJUkFcclxuICAvL1xyXG4gIC8vXHJcblxyXG4gIGZ1bmN0aW9uIHN0YXJ0QnJvd3NlciAodXJsKSB7XHJcbiAgICB2YXIgY21kID1cclxuICAgICdcIiVQcm9ncmFtRmlsZXMoeDg2KSVcXFxcR29vZ2xlXFxcXENocm9tZVxcXFxBcHBsaWNhdGlvblxcXFxjaHJvbWUuZXhlXCIgLS1pbmNvZ25pdG8gLXVybCBcIicgKyB1cmwgKyAnXCInXHJcbiAgICBleGVjKGNtZCwgZnVuY3Rpb24gKGVycm9yLCBzdGRvdXQsIHN0ZGVycikge1xyXG4gICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKGBleGVjIGVycm9yOiAke2Vycm9yfWApXHJcbiAgICAgICAgcmV0dXJuXHJcbiAgICAgIH1cclxuICAgICAgZGVidWdsb2coYHN0ZG91dDogJHtzdGRvdXR9YClcclxuICAgICAgZGVidWdsb2coYHN0ZGVycjogJHtzdGRlcnJ9YClcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICAvLyBzdGFydFNBUEdVSVxyXG5cclxuICAvLyAgIE46XFw+XCJjOlxcUHJvZ3JhbSBGaWxlcyAoeDg2KVxcU0FQXFxGcm9udEVuZFxcU0FQZ3VpXCJcXHNhcHNoY3V0LmV4ZSAgLXN5c3RlbT1VVjIgLWNsaWVudD0xMjAgLWNvbW1hbmQ9U0UzOCAtdHlwZT1UcmFuc2FjdGlvbiAtdXNlcj1BVVNFUlxyXG5cclxuICBmdW5jdGlvbiBleHBhbmRQYXJhbWV0ZXJzSW5VUkwgKG9NZXJnZWRDb250ZXh0UmVzdWx0KSB7XHJcbiAgICB2YXIgcHRuID0gb01lcmdlZENvbnRleHRSZXN1bHQucmVzdWx0LnBhdHRlcm5cclxuICAgIHB0biA9IGV4ZWN0ZW1wbGF0ZS5leHBhbmRUZW1wbGF0ZShvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0LCBwdG4pO1xyXG4vKiAgICBPYmplY3Qua2V5cyhvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XHJcbiAgICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoJ3snICsgc0tleSArICd9JywgJ2cnKVxyXG4gICAgICBwdG4gPSBwdG4ucmVwbGFjZShyZWdleCwgb01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dFtzS2V5XSlcclxuICAgICAgcHRuID0gcHRuLnJlcGxhY2UocmVnZXgsIG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHRbc0tleV0pXHJcbiAgICB9KVxyXG4gICAgKi9cclxuICAgIHJldHVybiBwdG5cclxuICB9XHJcblxyXG4gIGV4cG9ydCBmdW5jdGlvbiBleGVjdXRlU3RhcnR1cCAob01lcmdlZENvbnRleHRSZXN1bHQpIHtcclxuICAgIGlmIChvTWVyZ2VkQ29udGV4dFJlc3VsdC5yZXN1bHQudHlwZSA9PT0gJ1VSTCcpIHtcclxuICAgICAgdmFyIHB0biA9IGV4cGFuZFBhcmFtZXRlcnNJblVSTChvTWVyZ2VkQ29udGV4dFJlc3VsdClcclxuICAgICAgc3RhcnRCcm93c2VyKHB0bilcclxuICAgICAgcmV0dXJuIHB0blxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdmFyIHMgPSAoXCJEb24ndCBrbm93IGhvdyB0byBzdGFydCBcIiArIG9NZXJnZWRDb250ZXh0UmVzdWx0LnJlc3VsdC50eXBlICsgJ1xcbiBmb3IgXCInICsgb01lcmdlZENvbnRleHRSZXN1bHQucXVlcnkgKyAnXCInKVxyXG4gICAgICBkZWJ1Z2xvZyhzKVxyXG4gICAgICByZXR1cm4gc1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gbnJNYXRjaGVzIChhT2JqZWN0LCBvQ29udGV4dCkge1xyXG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKGFPYmplY3QpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XHJcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0NvbnRleHQsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIDFcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldlxyXG4gICAgfSwgMClcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIG5yTm9NYXRjaGVzIChhT2JqZWN0LCBvQ29udGV4dCkge1xyXG4gICAgdmFyIG5vTWF0Y2hBID0gT2JqZWN0LmtleXMoYU9iamVjdCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0NvbnRleHQsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIDFcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldlxyXG4gICAgfSwgMClcclxuICAgIHZhciBub01hdGNoQiA9IE9iamVjdC5rZXlzKG9Db250ZXh0KS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xyXG4gICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChhT2JqZWN0LCBrZXkpKSB7XHJcbiAgICAgICAgcHJldiA9IHByZXYgKyAxXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHByZXZcclxuICAgIH0sIDApXHJcbiAgICByZXR1cm4gbm9NYXRjaEEgKyBub01hdGNoQlxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gc2FtZU9yU3RhciAoczEgOiBzdHJpbmcsIHMyIDogc3RyaW5nIHwgUmVnRXhwIHwgRnVuY3Rpb24gLCBvRW50aXR5KSB7XHJcbiAgICByZXR1cm4gczEgPT09IHMyIHx8XHJcbiAgICAgIChzMSA9PT0gdW5kZWZpbmVkICYmIHMyID09PSBudWxsKSB8fFxyXG4gICAgICAoKHMyIGluc3RhbmNlb2YgUmVnRXhwKSAmJiBzMi5leGVjKHMxKSAhPT0gbnVsbCkgfHxcclxuICAgICAgKCh0eXBlb2YgczIgPT09ICdmdW5jdGlvbicgJiYgczEpICYmIHMyKHMxLCBvRW50aXR5KSlcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHNhbWVPclN0YXJFbXB0eSAoczEgOiBzdHJpbmcsIHMyIDogc3RyaW5nIHwgUmVnRXhwIHwgRnVuY3Rpb24sIG9FbnRpdHkpIHtcclxuICAgIGlmIChzMSA9PT0gdW5kZWZpbmVkICYmIHMyID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgcmV0dXJuIHRydWVcclxuICAgIH1cclxuICAgIGlmIChzMiA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHMxID09PSBzMiB8fFxyXG4gICAgICAoKHMyIGluc3RhbmNlb2YgUmVnRXhwKSAmJiBzMi5leGVjKHMxKSAhPT0gbnVsbCkgfHxcclxuICAgICAgKCh0eXBlb2YgczIgPT09ICdmdW5jdGlvbicgJiYgczEpICYmIHMyKHMxLCBvRW50aXR5KSlcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGZpbHRlclNob3dFbnRpdHlPbGQgKG9Db250ZXh0LCBhU2hvd0VudGl0eSkge1xyXG4gICAgdmFyIGFGaWx0ZXJlZFxyXG4gICAgT2JqZWN0LmtleXMob0NvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcclxuICAgICAgaWYgKG9Db250ZXh0W3NLZXldID09PSBudWxsKSB7XHJcbiAgICAgICAgb0NvbnRleHRbc0tleV0gPSB1bmRlZmluZWRcclxuICAgICAgfVxyXG4gICAgfSlcclxuICAgIC8vIGZpbHRlciBjb250ZXh0LCBhbWVuZGluZyBzeW5vbnltc1xyXG5cclxuXHJcbiAgICBhRmlsdGVyZWQgPSBhU2hvd0VudGl0eS5maWx0ZXIoZnVuY3Rpb24gKG9TaG93RW50aXR5KSB7XHJcbiAgICAgIC8vICAgICAgIGNvbnNvbGUubG9nKFwiLi4uXCIpXHJcbiAgICAgIC8vICAgICAgY29uc29sZS5sb2cob1Nob3dFbnRpdHkuY29udGV4dC50b29sICsgXCIgXCIgKyBvQ29udGV4dC50b29sICsgXCJcXG5cIilcclxuICAgICAgLy8gICAgICBjb25zb2xlLmxvZyhvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCArIFwiIFwiICsgb0NvbnRleHQuY2xpZW50ICtcIjpcIiArIHNhbWVPclN0YXIob0NvbnRleHQuY2xpZW50LG9TaG93RW50aXR5LmNvbnRleHQuY2xpZW50KSArIFwiXFxuXCIpXHJcbiAgICAgIC8vICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShvU2hvd0VudGl0eS5jb250ZXh0KSArIFwiXFxuXCIgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dC5jbGllbnQpICsgXCJcXG5cIilcclxuXHJcbiAgICAgIHJldHVybiBzYW1lT3JTdGFyKG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtSWQsIG9Db250ZXh0LnN5c3RlbUlkLCBvQ29udGV4dCkgJiZcclxuICAgICAgICBzYW1lT3JTdGFyKG9Db250ZXh0LnRvb2wsIG9TaG93RW50aXR5LmNvbnRleHQudG9vbCwgb0NvbnRleHQpICYmXHJcbiAgICAgICAgc2FtZU9yU3RhcihvQ29udGV4dC5jbGllbnQsIG9TaG93RW50aXR5LmNvbnRleHQuY2xpZW50LCBvQ29udGV4dCkgJiZcclxuICAgICAgICBzYW1lT3JTdGFyRW1wdHkob0NvbnRleHQuc3lzdGVtT2JqZWN0Q2F0ZWdvcnksIG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtT2JqZWN0Q2F0ZWdvcnksIG9Db250ZXh0KSAmJlxyXG4gICAgICAgIHNhbWVPclN0YXJFbXB0eShvQ29udGV4dC5zeXN0ZW1PYmplY3RJZCwgb1Nob3dFbnRpdHkuY29udGV4dC5zeXN0ZW1PYmplY3RJZCwgb0NvbnRleHQpXHJcbiAgICAvLyAgICAgICYmIG9TaG93RW50aXR5LmNvbnRleHQudG9vbCA9PT0gb0NvbnRleHQudG9vbFxyXG4gICAgfSlcclxuICAgIC8vICBjb25zb2xlLmxvZyhhRmlsdGVyZWQubGVuZ3RoKVxyXG4gICAgLy8gbWF0Y2ggb3RoZXIgY29udGV4dCBwYXJhbWV0ZXJzXHJcbiAgICBhRmlsdGVyZWQuc29ydChmdW5jdGlvbiAoYSwgYikge1xyXG4gICAgICB2YXIgbnJNYXRjaGVzQSA9IG5yTWF0Y2hlcyhhLmNvbnRleHQsIG9Db250ZXh0KVxyXG4gICAgICB2YXIgbnJNYXRjaGVzQiA9IG5yTWF0Y2hlcyhiLmNvbnRleHQsIG9Db250ZXh0KVxyXG4gICAgICB2YXIgbnJOb01hdGNoZXNBID0gbnJOb01hdGNoZXMoYS5jb250ZXh0LCBvQ29udGV4dClcclxuICAgICAgdmFyIG5yTm9NYXRjaGVzQiA9IG5yTm9NYXRjaGVzKGIuY29udGV4dCwgb0NvbnRleHQpXHJcbiAgICAgIC8vICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYS5jb250ZXh0KSlcclxuICAgICAgLy8gICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShiLmNvbnRleHQpKVxyXG4gICAgICAvLyAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KG9Db250ZXh0KSlcclxuICAgICAgdmFyIHJlcyA9IC0obnJNYXRjaGVzQSAtIG5yTWF0Y2hlc0IpICogMTAwICsgKG5yTm9NYXRjaGVzQSAtIG5yTm9NYXRjaGVzQilcclxuICAgICAgLy8gICAgIGNvbnNvbGUubG9nKFwiZGlmZiBcIiArIHJlcylcclxuICAgICAgcmV0dXJuIHJlc1xyXG4gICAgfSlcclxuICAgIGlmIChhRmlsdGVyZWQubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIGRlYnVnbG9nKCdubyB0YXJnZXQgZm9yIHNob3dFbnRpdHkgJyArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0KSlcclxuICAgIH1cclxuICAgIC8vIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGFGaWx0ZXJlZCx1bmRlZmluZWQsMikpXHJcbiAgICBpZiAoYUZpbHRlcmVkWzBdKSB7XHJcbiAgICAgIC8vIGV4ZWN1dGUgYWxsIGZ1bmN0aW9uc1xyXG5cclxuICAgICAgdmFyIG9NYXRjaCA9IGFGaWx0ZXJlZFswXVxyXG5cclxuICAgICAgdmFyIG9NZXJnZWQgPSB7XHJcbiAgICAgICAgY29udGV4dDoge1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgb01lcmdlZC5jb250ZXh0ID0gQW55T2JqZWN0LmFzc2lnbih7fSwgb01lcmdlZC5jb250ZXh0LCBhRmlsdGVyZWRbMF0uY29udGV4dCwgb0NvbnRleHQpXHJcbiAgICAgIG9NZXJnZWQgPSBBbnlPYmplY3QuYXNzaWduKG9NZXJnZWQsIHtcclxuICAgICAgICByZXN1bHQ6IGFGaWx0ZXJlZFswXS5yZXN1bHRcclxuICAgICAgfSlcclxuXHJcbiAgICAgIE9iamVjdC5rZXlzKG9NYXRjaC5jb250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBvTWF0Y2guY29udGV4dFtzS2V5XSA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgZGVidWdsb2coJ05vdyByZXRyb2ZpdHRpbmcgOicgKyBzS2V5ICsgJyAtICcgKyBvQ29udGV4dFtzS2V5XSlcclxuICAgICAgICAgIG9NZXJnZWQgPSBvTWF0Y2guY29udGV4dFtzS2V5XShvQ29udGV4dFtzS2V5XSwgb01lcmdlZClcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcblxyXG4gICAgICByZXR1cm4gb01lcmdlZFxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG51bGxcclxuICB9XHJcblxyXG5cclxuaW1wb3J0ICogYXMgaW5wdXRGaWx0ZXIgZnJvbSAnLi9pbnB1dEZpbHRlcic7XHJcblxyXG4gIGZ1bmN0aW9uIGZpbHRlclNob3dFbnRpdHkgKG9Db250ZXh0LCBhU2hvd0VudGl0eUFjdGlvbnMpIHtcclxuICAgIE9iamVjdC5rZXlzKG9Db250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XHJcbiAgICAgIGlmIChvQ29udGV4dFtzS2V5XSA9PT0gbnVsbCkge1xyXG4gICAgICAgIGRlbGV0ZSBvQ29udGV4dFtzS2V5XVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gICAgdmFyIHJlcyA9IGlucHV0RmlsdGVyLmFwcGx5UnVsZXNQaWNrRmlyc3Qob0NvbnRleHQpO1xyXG4gICAgaWYgKCFyZXMpIHtcclxuICAgICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gICAgfVxyXG4gICAgZGVidWdsb2coXCIqKiBhZnRlciBmaWx0ZXIgcnVsZXNcIiArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSlcclxuICAgIHJldHVybiBmaWx0ZXJTaG93RW50aXR5T2xkKHJlcyxhU2hvd0VudGl0eUFjdGlvbnMpO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZXhlY1Nob3dFbnRpdHkgKG9FbnRpdHkpIHtcclxuICAgIHZhciBtZXJnZWQgPSBmaWx0ZXJTaG93RW50aXR5KG9FbnRpdHksIGFTaG93RW50aXR5QWN0aW9ucylcclxuICAgIGlmIChtZXJnZWQpIHtcclxuICAgICAgcmV0dXJuIGV4ZWN1dGVTdGFydHVwKG1lcmdlZClcclxuICAgIH1cclxuICAgIHJldHVybiBudWxsXHJcbiAgfVxyXG5cclxuICAvLyBFOlxccHJvamVjdHNcXG5vZGVqc1xcYm90YnVpbGRlclxcc2FtcGxlYm90PlwiJVByb2dyYW1GaWxlcyh4ODYpJVxcR29vZ2xlXFxDaHJvbWVcXEFwcGxpY2F0aW9uXFxjaHJvbWUuZXhlXCIgLS1pbmNvZ25pdG8gLXVybCB3d3cuc3BpZWdlbC5kZVxyXG5cclxuICBleHBvcnQgY29uc3QgZGlzcGF0Y2hlciA9IHtcclxuICAgIGV4ZWNTaG93RW50aXR5OiBleGVjU2hvd0VudGl0eSxcclxuICAgIF90ZXN0OiB7XHJcbiAgICAgIHNhbWVPclN0YXI6IHNhbWVPclN0YXIsXHJcbiAgICAgIG5yTWF0Y2hlczogbnJNYXRjaGVzLFxyXG4gICAgICBuck5vTWF0Y2hlczogbnJOb01hdGNoZXMsXHJcbiAgICAgIGV4cGFuZFBhcmFtZXRlcnNJblVSTDogZXhwYW5kUGFyYW1ldGVyc0luVVJMLFxyXG4gICAgICBmaWx0ZXJTaG93RW50aXR5OiBmaWx0ZXJTaG93RW50aXR5LFxyXG4gICAgLy8gIGZuRmluZFVuaXRUZXN0OiBmbkZpbmRVbml0VGVzdCxcclxuICAgICAgY2FsY0Rpc3RhbmNlOiBjYWxjRGlzdGFuY2UsXHJcbiAgICAgIF9hU2hvd0VudGl0eUFjdGlvbnM6IGFTaG93RW50aXR5QWN0aW9uc1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy9leHBvcnRzIGRpc3BhdGNoZXI7XHJcblxyXG4gIC8vbW9kdWxlLmV4cG9ydHMgPSBkaXNwYXRjaGVyXHJcblxyXG4iLCIvKipcbiAqIEBmaWxlXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5kaXNwYXRjaGVyXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXG4gKi9cblwidXNlIHN0cmljdFwiO1xudmFyIEFueU9iamVjdCA9IE9iamVjdDtcbnZhciBkaXN0YW5jZSA9IHJlcXVpcmUoXCIuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW5cIik7XG52YXIgZGVidWcgPSByZXF1aXJlKFwiZGVidWdcIik7XG52YXIgZGVidWdsb2cgPSBkZWJ1ZygnZGlzcGF0Y2hlcicpO1xudmFyIGNoaWxkX3Byb2Nlc3NfMSA9IHJlcXVpcmUoXCJjaGlsZF9wcm9jZXNzXCIpO1xuLy8gIHZhciBleGVjID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpLmV4ZWNcbi8vICB2YXIgbGV2ZW4gPSByZXF1aXJlKCcuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4uanMnKS5sZXZlbnNodGVpblxudmFyIGV4ZWN0ZW1wbGF0ZSA9IHJlcXVpcmUoXCIuLi9leGVjL2V4ZWN0ZW1wbGF0ZVwiKTtcbi8vdmFyIGxldmVuID0gcmVxdWlyZSgnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluLmpzJylcbnZhciBtYXRjaGRhdGEgPSByZXF1aXJlKFwiLi9tYXRjaGRhdGFcIik7XG52YXIgQWxnb2wgPSByZXF1aXJlKFwiLi4vbWF0Y2gvYWxnb2xcIik7XG52YXIgb1VuaXRUZXN0cyA9IG1hdGNoZGF0YS5vVW5pdFRlc3RzO1xudmFyIG9XaWtpcyA9IG1hdGNoZGF0YS5vV2lraXM7XG5mdW5jdGlvbiBjYWxjRGlzdGFuY2Uoc1RleHQxLCBzVGV4dDIpIHtcbiAgICByZXR1cm4gZGlzdGFuY2UuY2FsY0Rpc3RhbmNlKHNUZXh0MS50b0xvd2VyQ2FzZSgpLCBzVGV4dDIpO1xuICAgIC8qXG4gICAgZGVidWdsb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxuICAgIHZhciBhMCA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCksIHNUZXh0MilcbiAgICB2YXIgYSA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS50b0xvd2VyQ2FzZSgpLCBzVGV4dDIpXG4gICAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGFcbiAgICAqL1xufVxuZnVuY3Rpb24gZm5GaW5kTWF0Y2goc0tleXdvcmQsIG9Db250ZXh0LCBvTWFwKSB7XG4gICAgLy8gcmV0dXJuIGEgYmV0dGVyIGNvbnRleHQgaWYgdGhlcmUgaXMgYSBtYXRjaFxuICAgIC8vIHNLZXl3b3JkID0gc0tleXdvcmQudG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgc0tleXdvcmRMYyA9IHNLZXl3b3JkLnRvTG93ZXJDYXNlKCk7XG4gICAgb01hcC5zb3J0KGZ1bmN0aW9uIChvRW50cnkxLCBvRW50cnkyKSB7XG4gICAgICAgIHZhciB1MSA9IGNhbGNEaXN0YW5jZShvRW50cnkxLmtleSwgc0tleXdvcmRMYyk7XG4gICAgICAgIHZhciB1MiA9IGNhbGNEaXN0YW5jZShvRW50cnkyLmtleSwgc0tleXdvcmRMYyk7XG4gICAgICAgIHJldHVybiB1MiAtIHUxO1xuICAgIH0pO1xuICAgIC8vIGxhdGVyOiBpbiBjYXNlIG9mIGNvbmZsaWN0cywgYXNrLFxuICAgIC8vIG5vdzpcbiAgICB2YXIgZGlzdCA9IGNhbGNEaXN0YW5jZShvTWFwWzBdLmtleSwgc0tleXdvcmRMYyk7XG4gICAgZGVidWdsb2coJ2Jlc3QgZGlzdCcgKyBkaXN0ICsgJyAvICAnICsgb01hcFswXS5rZXkgKyAnICcgKyBzS2V5d29yZCk7XG4gICAgaWYgKGRpc3QgPiBBbGdvbC5DdXRvZmZfV29yZE1hdGNoKSB7XG4gICAgICAgIHZhciBvMSA9IE9iamVjdC5hc3NpZ24oe30sIG9Db250ZXh0KTtcbiAgICAgICAgdmFyIG8yO1xuICAgICAgICBvMS5jb250ZXh0ID0gT2JqZWN0LmFzc2lnbih7fSwgbzEuY29udGV4dCk7XG4gICAgICAgIG8yID0gbzE7XG4gICAgICAgIG8yLmNvbnRleHQgPSBPYmplY3QuYXNzaWduKG8xLmNvbnRleHQsIG9NYXBbMF0uY29udGV4dCk7XG4gICAgICAgIHJldHVybiBvMjtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59XG4vKipcbiAqIGEgZnVuY3Rpb24gdG8gbWF0Y2ggYSB1bml0IHRlc3QgdXNpbmcgbGV2ZW5zaHRlaW4gZGlzdGFuY2VzXG4gKiBAcHVibGljXG4gKi9cbmZ1bmN0aW9uIGZuRmluZFVuaXRUZXN0KHNzeXN0ZW1PYmplY3RJZCwgb0NvbnRleHQpIHtcbiAgICByZXR1cm4gZm5GaW5kTWF0Y2goc3N5c3RlbU9iamVjdElkLCBvQ29udGV4dCwgb1VuaXRUZXN0cyk7XG59XG5mdW5jdGlvbiBmbkZpbmRXaWtpKHNLZXl3b3JkLCBvQ29udGV4dCkge1xuICAgIHJldHVybiBmbkZpbmRNYXRjaChzS2V5d29yZCwgb0NvbnRleHQsIG9XaWtpcyk7XG59XG52YXIgYVNob3dFbnRpdHlBY3Rpb25zID0gW1xuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtSWQ6ICd1djInLFxuICAgICAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXG4gICAgICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscCdcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1djIud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3VpMi91c2hlbGwvc2hlbGxzL2FiYXAvRmlvcmlMYXVuY2hwYWQuaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbUlkOiAndXYyJyxcbiAgICAgICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxuICAgICAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHBkJ1xuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXV2Mi53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvc2FwL2Fyc3J2Y191cGJfYWRtbi9tYWluLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1JZDogJ3UxeScsXG4gICAgICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcbiAgICAgICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwJ1xuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXUxeS53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvdWkyL3VzaGVsbC9zaGVsbHMvYWJhcC9GaW9yaUxhdW5jaHBhZC5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtSWQ6ICd1MXknLFxuICAgICAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXG4gICAgICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscGQnXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdTF5LndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS9zYXAvYXJzcnZjX3VwYl9hZG1uL21haW4uaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbUlkOiAndXYyJyxcbiAgICAgICAgICAgIGNsaWVudDogJzEyMCcsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ2Zpb3JpIGNhdGFsb2cnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IC8uKi8sXG4gICAgICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXG4gICAgICAgICAgICB0b29sOiAnRkxQRCdcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1djIud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3NhcC9hcnNydmNfdXBiX2FkbW4vbWFpbi5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0jQ0FUQUxPRzp7c3lzdGVtT2JqZWN0SWR9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAndW5pdCcsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogZm5GaW5kVW5pdFRlc3RcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwOi8vbG9jYWxob3N0OjgwODAve3BhdGh9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAndW5pdCB0ZXN0JyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiBmbkZpbmRVbml0VGVzdFxuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MC97cGF0aH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtT2JqZWN0Q2F0ZWdvcnk6ICd3aWtpJyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiBmbkZpbmRXaWtpXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly93aWtpLndkZi5zYXAuY29ycC97cGF0aH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtSWQ6ICdKSVJBJ1xuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vamlyYS53ZGYuc2FwLmNvcnA6ODA4MC9USVBDT1JFVUlJSSdcbiAgICAgICAgfVxuICAgIH1cbl07XG4vLyBpZiBUT09MID0gSklSQSB8fCBTeXN0ZW1JZCA9IEpJUkEgLT4gU3lzdGVtSWQgPSBKSVJBXG4vL1xuLy9cbmZ1bmN0aW9uIHN0YXJ0QnJvd3Nlcih1cmwpIHtcbiAgICB2YXIgY21kID0gJ1wiJVByb2dyYW1GaWxlcyh4ODYpJVxcXFxHb29nbGVcXFxcQ2hyb21lXFxcXEFwcGxpY2F0aW9uXFxcXGNocm9tZS5leGVcIiAtLWluY29nbml0byAtdXJsIFwiJyArIHVybCArICdcIic7XG4gICAgY2hpbGRfcHJvY2Vzc18xLmV4ZWMoY21kLCBmdW5jdGlvbiAoZXJyb3IsIHN0ZG91dCwgc3RkZXJyKSB7XG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcImV4ZWMgZXJyb3I6IFwiICsgZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGRlYnVnbG9nKFwic3Rkb3V0OiBcIiArIHN0ZG91dCk7XG4gICAgICAgIGRlYnVnbG9nKFwic3RkZXJyOiBcIiArIHN0ZGVycik7XG4gICAgfSk7XG59XG4vLyBzdGFydFNBUEdVSVxuLy8gICBOOlxcPlwiYzpcXFByb2dyYW0gRmlsZXMgKHg4NilcXFNBUFxcRnJvbnRFbmRcXFNBUGd1aVwiXFxzYXBzaGN1dC5leGUgIC1zeXN0ZW09VVYyIC1jbGllbnQ9MTIwIC1jb21tYW5kPVNFMzggLXR5cGU9VHJhbnNhY3Rpb24gLXVzZXI9QVVTRVJcbmZ1bmN0aW9uIGV4cGFuZFBhcmFtZXRlcnNJblVSTChvTWVyZ2VkQ29udGV4dFJlc3VsdCkge1xuICAgIHZhciBwdG4gPSBvTWVyZ2VkQ29udGV4dFJlc3VsdC5yZXN1bHQucGF0dGVybjtcbiAgICBwdG4gPSBleGVjdGVtcGxhdGUuZXhwYW5kVGVtcGxhdGUob01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dCwgcHRuKTtcbiAgICAvKiAgICBPYmplY3Qua2V5cyhvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgICAgICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cCgneycgKyBzS2V5ICsgJ30nLCAnZycpXG4gICAgICAgICAgcHRuID0gcHRuLnJlcGxhY2UocmVnZXgsIG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHRbc0tleV0pXG4gICAgICAgICAgcHRuID0gcHRuLnJlcGxhY2UocmVnZXgsIG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHRbc0tleV0pXG4gICAgICAgIH0pXG4gICAgICAgICovXG4gICAgcmV0dXJuIHB0bjtcbn1cbmZ1bmN0aW9uIGV4ZWN1dGVTdGFydHVwKG9NZXJnZWRDb250ZXh0UmVzdWx0KSB7XG4gICAgaWYgKG9NZXJnZWRDb250ZXh0UmVzdWx0LnJlc3VsdC50eXBlID09PSAnVVJMJykge1xuICAgICAgICB2YXIgcHRuID0gZXhwYW5kUGFyYW1ldGVyc0luVVJMKG9NZXJnZWRDb250ZXh0UmVzdWx0KTtcbiAgICAgICAgc3RhcnRCcm93c2VyKHB0bik7XG4gICAgICAgIHJldHVybiBwdG47XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB2YXIgcyA9IChcIkRvbid0IGtub3cgaG93IHRvIHN0YXJ0IFwiICsgb01lcmdlZENvbnRleHRSZXN1bHQucmVzdWx0LnR5cGUgKyAnXFxuIGZvciBcIicgKyBvTWVyZ2VkQ29udGV4dFJlc3VsdC5xdWVyeSArICdcIicpO1xuICAgICAgICBkZWJ1Z2xvZyhzKTtcbiAgICAgICAgcmV0dXJuIHM7XG4gICAgfVxufVxuZXhwb3J0cy5leGVjdXRlU3RhcnR1cCA9IGV4ZWN1dGVTdGFydHVwO1xuZnVuY3Rpb24gbnJNYXRjaGVzKGFPYmplY3QsIG9Db250ZXh0KSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKGFPYmplY3QpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0NvbnRleHQsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbn1cbmZ1bmN0aW9uIG5yTm9NYXRjaGVzKGFPYmplY3QsIG9Db250ZXh0KSB7XG4gICAgdmFyIG5vTWF0Y2hBID0gT2JqZWN0LmtleXMoYU9iamVjdCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0NvbnRleHQsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbiAgICB2YXIgbm9NYXRjaEIgPSBPYmplY3Qua2V5cyhvQ29udGV4dCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYU9iamVjdCwga2V5KSkge1xuICAgICAgICAgICAgcHJldiA9IHByZXYgKyAxO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIDApO1xuICAgIHJldHVybiBub01hdGNoQSArIG5vTWF0Y2hCO1xufVxuZnVuY3Rpb24gc2FtZU9yU3RhcihzMSwgczIsIG9FbnRpdHkpIHtcbiAgICByZXR1cm4gczEgPT09IHMyIHx8XG4gICAgICAgIChzMSA9PT0gdW5kZWZpbmVkICYmIHMyID09PSBudWxsKSB8fFxuICAgICAgICAoKHMyIGluc3RhbmNlb2YgUmVnRXhwKSAmJiBzMi5leGVjKHMxKSAhPT0gbnVsbCkgfHxcbiAgICAgICAgKCh0eXBlb2YgczIgPT09ICdmdW5jdGlvbicgJiYgczEpICYmIHMyKHMxLCBvRW50aXR5KSk7XG59XG5mdW5jdGlvbiBzYW1lT3JTdGFyRW1wdHkoczEsIHMyLCBvRW50aXR5KSB7XG4gICAgaWYgKHMxID09PSB1bmRlZmluZWQgJiYgczIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHMyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBzMSA9PT0gczIgfHxcbiAgICAgICAgKChzMiBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgczIuZXhlYyhzMSkgIT09IG51bGwpIHx8XG4gICAgICAgICgodHlwZW9mIHMyID09PSAnZnVuY3Rpb24nICYmIHMxKSAmJiBzMihzMSwgb0VudGl0eSkpO1xufVxuZnVuY3Rpb24gZmlsdGVyU2hvd0VudGl0eU9sZChvQ29udGV4dCwgYVNob3dFbnRpdHkpIHtcbiAgICB2YXIgYUZpbHRlcmVkO1xuICAgIE9iamVjdC5rZXlzKG9Db250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgICAgIGlmIChvQ29udGV4dFtzS2V5XSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgb0NvbnRleHRbc0tleV0gPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICAvLyBmaWx0ZXIgY29udGV4dCwgYW1lbmRpbmcgc3lub255bXNcbiAgICBhRmlsdGVyZWQgPSBhU2hvd0VudGl0eS5maWx0ZXIoZnVuY3Rpb24gKG9TaG93RW50aXR5KSB7XG4gICAgICAgIC8vICAgICAgIGNvbnNvbGUubG9nKFwiLi4uXCIpXG4gICAgICAgIC8vICAgICAgY29uc29sZS5sb2cob1Nob3dFbnRpdHkuY29udGV4dC50b29sICsgXCIgXCIgKyBvQ29udGV4dC50b29sICsgXCJcXG5cIilcbiAgICAgICAgLy8gICAgICBjb25zb2xlLmxvZyhvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCArIFwiIFwiICsgb0NvbnRleHQuY2xpZW50ICtcIjpcIiArIHNhbWVPclN0YXIob0NvbnRleHQuY2xpZW50LG9TaG93RW50aXR5LmNvbnRleHQuY2xpZW50KSArIFwiXFxuXCIpXG4gICAgICAgIC8vICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShvU2hvd0VudGl0eS5jb250ZXh0KSArIFwiXFxuXCIgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dC5jbGllbnQpICsgXCJcXG5cIilcbiAgICAgICAgcmV0dXJuIHNhbWVPclN0YXIob1Nob3dFbnRpdHkuY29udGV4dC5zeXN0ZW1JZCwgb0NvbnRleHQuc3lzdGVtSWQsIG9Db250ZXh0KSAmJlxuICAgICAgICAgICAgc2FtZU9yU3RhcihvQ29udGV4dC50b29sLCBvU2hvd0VudGl0eS5jb250ZXh0LnRvb2wsIG9Db250ZXh0KSAmJlxuICAgICAgICAgICAgc2FtZU9yU3RhcihvQ29udGV4dC5jbGllbnQsIG9TaG93RW50aXR5LmNvbnRleHQuY2xpZW50LCBvQ29udGV4dCkgJiZcbiAgICAgICAgICAgIHNhbWVPclN0YXJFbXB0eShvQ29udGV4dC5zeXN0ZW1PYmplY3RDYXRlZ29yeSwgb1Nob3dFbnRpdHkuY29udGV4dC5zeXN0ZW1PYmplY3RDYXRlZ29yeSwgb0NvbnRleHQpICYmXG4gICAgICAgICAgICBzYW1lT3JTdGFyRW1wdHkob0NvbnRleHQuc3lzdGVtT2JqZWN0SWQsIG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtT2JqZWN0SWQsIG9Db250ZXh0KTtcbiAgICAgICAgLy8gICAgICAmJiBvU2hvd0VudGl0eS5jb250ZXh0LnRvb2wgPT09IG9Db250ZXh0LnRvb2xcbiAgICB9KTtcbiAgICAvLyAgY29uc29sZS5sb2coYUZpbHRlcmVkLmxlbmd0aClcbiAgICAvLyBtYXRjaCBvdGhlciBjb250ZXh0IHBhcmFtZXRlcnNcbiAgICBhRmlsdGVyZWQuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICB2YXIgbnJNYXRjaGVzQSA9IG5yTWF0Y2hlcyhhLmNvbnRleHQsIG9Db250ZXh0KTtcbiAgICAgICAgdmFyIG5yTWF0Y2hlc0IgPSBuck1hdGNoZXMoYi5jb250ZXh0LCBvQ29udGV4dCk7XG4gICAgICAgIHZhciBuck5vTWF0Y2hlc0EgPSBuck5vTWF0Y2hlcyhhLmNvbnRleHQsIG9Db250ZXh0KTtcbiAgICAgICAgdmFyIG5yTm9NYXRjaGVzQiA9IG5yTm9NYXRjaGVzKGIuY29udGV4dCwgb0NvbnRleHQpO1xuICAgICAgICAvLyAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGEuY29udGV4dCkpXG4gICAgICAgIC8vICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYi5jb250ZXh0KSlcbiAgICAgICAgLy8gICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShvQ29udGV4dCkpXG4gICAgICAgIHZhciByZXMgPSAtKG5yTWF0Y2hlc0EgLSBuck1hdGNoZXNCKSAqIDEwMCArIChuck5vTWF0Y2hlc0EgLSBuck5vTWF0Y2hlc0IpO1xuICAgICAgICAvLyAgICAgY29uc29sZS5sb2coXCJkaWZmIFwiICsgcmVzKVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH0pO1xuICAgIGlmIChhRmlsdGVyZWQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGRlYnVnbG9nKCdubyB0YXJnZXQgZm9yIHNob3dFbnRpdHkgJyArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0KSk7XG4gICAgfVxuICAgIC8vIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGFGaWx0ZXJlZCx1bmRlZmluZWQsMikpXG4gICAgaWYgKGFGaWx0ZXJlZFswXSkge1xuICAgICAgICAvLyBleGVjdXRlIGFsbCBmdW5jdGlvbnNcbiAgICAgICAgdmFyIG9NYXRjaCA9IGFGaWx0ZXJlZFswXTtcbiAgICAgICAgdmFyIG9NZXJnZWQgPSB7XG4gICAgICAgICAgICBjb250ZXh0OiB7fVxuICAgICAgICB9O1xuICAgICAgICBvTWVyZ2VkLmNvbnRleHQgPSBBbnlPYmplY3QuYXNzaWduKHt9LCBvTWVyZ2VkLmNvbnRleHQsIGFGaWx0ZXJlZFswXS5jb250ZXh0LCBvQ29udGV4dCk7XG4gICAgICAgIG9NZXJnZWQgPSBBbnlPYmplY3QuYXNzaWduKG9NZXJnZWQsIHtcbiAgICAgICAgICAgIHJlc3VsdDogYUZpbHRlcmVkWzBdLnJlc3VsdFxuICAgICAgICB9KTtcbiAgICAgICAgT2JqZWN0LmtleXMob01hdGNoLmNvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb01hdGNoLmNvbnRleHRbc0tleV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZygnTm93IHJldHJvZml0dGluZyA6JyArIHNLZXkgKyAnIC0gJyArIG9Db250ZXh0W3NLZXldKTtcbiAgICAgICAgICAgICAgICBvTWVyZ2VkID0gb01hdGNoLmNvbnRleHRbc0tleV0ob0NvbnRleHRbc0tleV0sIG9NZXJnZWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG9NZXJnZWQ7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxudmFyIGlucHV0RmlsdGVyID0gcmVxdWlyZShcIi4vaW5wdXRGaWx0ZXJcIik7XG5mdW5jdGlvbiBmaWx0ZXJTaG93RW50aXR5KG9Db250ZXh0LCBhU2hvd0VudGl0eUFjdGlvbnMpIHtcbiAgICBPYmplY3Qua2V5cyhvQ29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xuICAgICAgICBpZiAob0NvbnRleHRbc0tleV0gPT09IG51bGwpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBvQ29udGV4dFtzS2V5XTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHZhciByZXMgPSBpbnB1dEZpbHRlci5hcHBseVJ1bGVzUGlja0ZpcnN0KG9Db250ZXh0KTtcbiAgICBpZiAoIXJlcykge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBkZWJ1Z2xvZyhcIioqIGFmdGVyIGZpbHRlciBydWxlc1wiICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICByZXR1cm4gZmlsdGVyU2hvd0VudGl0eU9sZChyZXMsIGFTaG93RW50aXR5QWN0aW9ucyk7XG59XG5mdW5jdGlvbiBleGVjU2hvd0VudGl0eShvRW50aXR5KSB7XG4gICAgdmFyIG1lcmdlZCA9IGZpbHRlclNob3dFbnRpdHkob0VudGl0eSwgYVNob3dFbnRpdHlBY3Rpb25zKTtcbiAgICBpZiAobWVyZ2VkKSB7XG4gICAgICAgIHJldHVybiBleGVjdXRlU3RhcnR1cChtZXJnZWQpO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cbi8vIEU6XFxwcm9qZWN0c1xcbm9kZWpzXFxib3RidWlsZGVyXFxzYW1wbGVib3Q+XCIlUHJvZ3JhbUZpbGVzKHg4NiklXFxHb29nbGVcXENocm9tZVxcQXBwbGljYXRpb25cXGNocm9tZS5leGVcIiAtLWluY29nbml0byAtdXJsIHd3dy5zcGllZ2VsLmRlXG5leHBvcnRzLmRpc3BhdGNoZXIgPSB7XG4gICAgZXhlY1Nob3dFbnRpdHk6IGV4ZWNTaG93RW50aXR5LFxuICAgIF90ZXN0OiB7XG4gICAgICAgIHNhbWVPclN0YXI6IHNhbWVPclN0YXIsXG4gICAgICAgIG5yTWF0Y2hlczogbnJNYXRjaGVzLFxuICAgICAgICBuck5vTWF0Y2hlczogbnJOb01hdGNoZXMsXG4gICAgICAgIGV4cGFuZFBhcmFtZXRlcnNJblVSTDogZXhwYW5kUGFyYW1ldGVyc0luVVJMLFxuICAgICAgICBmaWx0ZXJTaG93RW50aXR5OiBmaWx0ZXJTaG93RW50aXR5LFxuICAgICAgICAvLyAgZm5GaW5kVW5pdFRlc3Q6IGZuRmluZFVuaXRUZXN0LFxuICAgICAgICBjYWxjRGlzdGFuY2U6IGNhbGNEaXN0YW5jZSxcbiAgICAgICAgX2FTaG93RW50aXR5QWN0aW9uczogYVNob3dFbnRpdHlBY3Rpb25zXG4gICAgfVxufTtcbi8vZXhwb3J0cyBkaXNwYXRjaGVyO1xuLy9tb2R1bGUuZXhwb3J0cyA9IGRpc3BhdGNoZXJcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
