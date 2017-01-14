/**
 * @file
 * @module jfseb.fdevstart.dispatcher
 * @copyright (c) 2016 Gerd Forstmann
 */
"use strict";

var AnyObject = Object;
var distance = require('../utils/damerauLevenshtein');
var debug = require('debug');
var debuglog = debug('dispatcher');
var child_process_1 = require('child_process');
//  var exec = require('child_process').exec
//  var leven = require('../utils/damerauLevenshtein.js').levenshtein
var exectemplate = require('../exec/exectemplate');
//var leven = require('../utils/damerauLevenshtein.js')
var matchdata = require('./matchdata');
var oUnitTests = matchdata.oUnitTests;
var oWikis = matchdata.oWikis;
function calcDistance(sText1, sText2) {
    debuglog("length2" + sText1 + " - " + sText2);
    var a0 = distance.levenshtein(sText1.substring(0, sText2.length), sText2);
    var a = distance.levenshtein(sText1.toLowerCase(), sText2);
    return a0 * 500 / sText2.length + a;
}
function fnFindMatch(sKeyword, oContext, oMap) {
    // return a better context if there is a match
    // sKeyword = sKeyword.toLowerCase();
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
var inputFilter = require('./inputFilter');
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
        fnFindUnitTest: fnFindUnitTest,
        calcDistance: calcDistance,
        _aShowEntityActions: aShowEntityActions
    }
};
//exports dispatcher;
//module.exports = dispatcher
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9kaXNwYXRjaGVyLnRzIiwibWF0Y2gvZGlzcGF0Y2hlci5qcyJdLCJuYW1lcyI6WyJBbnlPYmplY3QiLCJPYmplY3QiLCJkaXN0YW5jZSIsInJlcXVpcmUiLCJkZWJ1ZyIsImRlYnVnbG9nIiwiY2hpbGRfcHJvY2Vzc18xIiwiZXhlY3RlbXBsYXRlIiwibWF0Y2hkYXRhIiwib1VuaXRUZXN0cyIsIm9XaWtpcyIsImNhbGNEaXN0YW5jZSIsInNUZXh0MSIsInNUZXh0MiIsImEwIiwibGV2ZW5zaHRlaW4iLCJzdWJzdHJpbmciLCJsZW5ndGgiLCJhIiwidG9Mb3dlckNhc2UiLCJmbkZpbmRNYXRjaCIsInNLZXl3b3JkIiwib0NvbnRleHQiLCJvTWFwIiwic29ydCIsIm9FbnRyeTEiLCJvRW50cnkyIiwidTEiLCJrZXkiLCJ1MiIsImRpc3QiLCJvMSIsImFzc2lnbiIsIm8yIiwiY29udGV4dCIsImZuRmluZFVuaXRUZXN0Iiwic3N5c3RlbU9iamVjdElkIiwiZm5GaW5kV2lraSIsImFTaG93RW50aXR5QWN0aW9ucyIsInN5c3RlbUlkIiwiY2xpZW50Iiwic3lzdGVtdHlwZSIsInN5c3RlbU9iamVjdElkIiwicmVzdWx0IiwidHlwZSIsInBhdHRlcm4iLCJzeXN0ZW1PYmplY3RDYXRlZ29yeSIsInRvb2wiLCJzdGFydEJyb3dzZXIiLCJ1cmwiLCJjbWQiLCJleGVjIiwiZXJyb3IiLCJzdGRvdXQiLCJzdGRlcnIiLCJjb25zb2xlIiwiZXhwYW5kUGFyYW1ldGVyc0luVVJMIiwib01lcmdlZENvbnRleHRSZXN1bHQiLCJwdG4iLCJleHBhbmRUZW1wbGF0ZSIsImV4ZWN1dGVTdGFydHVwIiwicyIsInF1ZXJ5IiwiZXhwb3J0cyIsIm5yTWF0Y2hlcyIsImFPYmplY3QiLCJrZXlzIiwicmVkdWNlIiwicHJldiIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiY2FsbCIsIm5yTm9NYXRjaGVzIiwibm9NYXRjaEEiLCJub01hdGNoQiIsInNhbWVPclN0YXIiLCJzMSIsInMyIiwib0VudGl0eSIsInVuZGVmaW5lZCIsIlJlZ0V4cCIsInNhbWVPclN0YXJFbXB0eSIsImZpbHRlclNob3dFbnRpdHlPbGQiLCJhU2hvd0VudGl0eSIsImFGaWx0ZXJlZCIsImZvckVhY2giLCJzS2V5IiwiZmlsdGVyIiwib1Nob3dFbnRpdHkiLCJiIiwibnJNYXRjaGVzQSIsIm5yTWF0Y2hlc0IiLCJuck5vTWF0Y2hlc0EiLCJuck5vTWF0Y2hlc0IiLCJyZXMiLCJKU09OIiwic3RyaW5naWZ5Iiwib01hdGNoIiwib01lcmdlZCIsImlucHV0RmlsdGVyIiwiZmlsdGVyU2hvd0VudGl0eSIsImFwcGx5UnVsZXNQaWNrRmlyc3QiLCJleGVjU2hvd0VudGl0eSIsIm1lcmdlZCIsImRpc3BhdGNoZXIiLCJfdGVzdCIsIl9hU2hvd0VudGl0eUFjdGlvbnMiXSwibWFwcGluZ3MiOiJBQUFBOzs7OztBQ0tBOztBRFFBLElBQUlBLFlBQWtCQyxNQUF0QjtBQUVBLElBQVlDLFdBQVFDLFFBQU0sNkJBQU4sQ0FBcEI7QUFFQSxJQUFZQyxRQUFLRCxRQUFNLE9BQU4sQ0FBakI7QUFDQSxJQUFNRSxXQUFXRCxNQUFNLFlBQU4sQ0FBakI7QUFFQSxJQUFBRSxrQkFBQUgsUUFBcUIsZUFBckIsQ0FBQTtBQUNBO0FBQ0E7QUFFQSxJQUFZSSxlQUFZSixRQUFNLHNCQUFOLENBQXhCO0FBRUU7QUFDRixJQUFZSyxZQUFTTCxRQUFNLGFBQU4sQ0FBckI7QUFFQSxJQUFNTSxhQUFhRCxVQUFVQyxVQUE3QjtBQUNBLElBQU1DLFNBQVNGLFVBQVVFLE1BQXpCO0FBRUUsU0FBQUMsWUFBQSxDQUF1QkMsTUFBdkIsRUFBK0JDLE1BQS9CLEVBQXFDO0FBQ25DUixhQUFTLFlBQVlPLE1BQVosR0FBcUIsS0FBckIsR0FBNkJDLE1BQXRDO0FBQ0EsUUFBSUMsS0FBS1osU0FBU2EsV0FBVCxDQUFxQkgsT0FBT0ksU0FBUCxDQUFpQixDQUFqQixFQUFvQkgsT0FBT0ksTUFBM0IsQ0FBckIsRUFBeURKLE1B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QUosRUFBWTtBQUNWLGVBQU8zQyxlQUFlMkMsTUFBZixDQUFQO0FBQ0Q7QUFDRCxXQUFPLElBQVA7QUFDRDtBQUVEO0FBRWF4QyxRQUFBeUMsVUFBQSxHQUFhO0FBQ3hCRixvQkFBZ0JBLGNBRFE7QUFFeEJHLFdBQU87QUFDTDlCLG9CQUFZQSxVQURQO0FBRUxYLG1CQUFXQSxTQUZOO0FBR0xRLHFCQUFhQSxXQUhSO0FBSUxoQiwrQkFBdUJBLHFCQUpsQjtBQUtMNEMsMEJBQWtCQSxnQkFMYjtBQU1MakUsd0JBQWdCQSxjQU5YO0FBT0x4QixzQkFBY0EsWUFQVDtBQVFMK0YsNkJBQXFCcEU7QUFSaEI7QUFGaUIsQ0FBYjtBQWNiO0FBRUEiLCJmaWxlIjoibWF0Y2gvZGlzcGF0Y2hlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBAZmlsZVxyXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5kaXNwYXRjaGVyXHJcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cclxuICovXHJcblxyXG5cclxuLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vbGliL25vZGUtNC5kLnRzXCIgLz5cclxuXHJcbmRlY2xhcmUgaW50ZXJmYWNlIE9iamVjdENvbnN0cnVjdG9yIHtcclxuICAgIGFzc2lnbih0YXJnZXQ6IGFueSwgLi4uc291cmNlczogYW55W10pOiBhbnk7XHJcbn1cclxuXHJcbnZhciBBbnlPYmplY3QgPSAoPGFueT5PYmplY3QpO1xyXG5cclxuaW1wb3J0ICogYXMgZGlzdGFuY2UgZnJvbSAnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluJztcclxuXHJcbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcclxuY29uc3QgZGVidWdsb2cgPSBkZWJ1ZygnZGlzcGF0Y2hlcicpXHJcblxyXG5pbXBvcnQgeyBleGVjIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XHJcbi8vICB2YXIgZXhlYyA9IHJlcXVpcmUoJ2NoaWxkX3Byb2Nlc3MnKS5leGVjXHJcbi8vICB2YXIgbGV2ZW4gPSByZXF1aXJlKCcuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4uanMnKS5sZXZlbnNodGVpblxyXG5cclxuaW1wb3J0ICogYXMgZXhlY3RlbXBsYXRlIGZyb20gJy4uL2V4ZWMvZXhlY3RlbXBsYXRlJztcclxuXHJcbiAgLy92YXIgbGV2ZW4gPSByZXF1aXJlKCcuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4uanMnKVxyXG5pbXBvcnQgKiBhcyBtYXRjaGRhdGEgZnJvbSAnLi9tYXRjaGRhdGEnO1xyXG5cclxuY29uc3Qgb1VuaXRUZXN0cyA9IG1hdGNoZGF0YS5vVW5pdFRlc3RzXHJcbmNvbnN0IG9XaWtpcyA9IG1hdGNoZGF0YS5vV2lraXNcclxuXHJcbiAgZnVuY3Rpb24gY2FsY0Rpc3RhbmNlIChzVGV4dDEsIHNUZXh0Mikge1xyXG4gICAgZGVidWdsb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxyXG4gICAgdmFyIGEwID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnN1YnN0cmluZygwLCBzVGV4dDIubGVuZ3RoKSwgc1RleHQyKVxyXG4gICAgdmFyIGEgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEudG9Mb3dlckNhc2UoKSwgc1RleHQyKVxyXG4gICAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGFcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGZuRmluZE1hdGNoIChzS2V5d29yZCwgb0NvbnRleHQsIG9NYXApIHtcclxuICAgIC8vIHJldHVybiBhIGJldHRlciBjb250ZXh0IGlmIHRoZXJlIGlzIGEgbWF0Y2hcclxuICAgIC8vIHNLZXl3b3JkID0gc0tleXdvcmQudG9Mb3dlckNhc2UoKTtcclxuICAgIG9NYXAuc29ydChmdW5jdGlvbiAob0VudHJ5MSwgb0VudHJ5Mikge1xyXG4gICAgICB2YXIgdTEgPSBjYWxjRGlzdGFuY2Uob0VudHJ5MS5rZXkudG9Mb3dlckNhc2UoKSwgc0tleXdvcmQpXHJcbiAgICAgIHZhciB1MiA9IGNhbGNEaXN0YW5jZShvRW50cnkyLmtleS50b0xvd2VyQ2FzZSgpLCBzS2V5d29yZClcclxuICAgICAgcmV0dXJuIHUxIC0gdTJcclxuICAgIH0pXHJcbiAgICAvLyBsYXRlcjogaW4gY2FzZSBvZiBjb25mbGljdHMsIGFzayxcclxuICAgIC8vIG5vdzpcclxuICAgIHZhciBkaXN0ID0gY2FsY0Rpc3RhbmNlKG9NYXBbMF0ua2V5LnRvTG93ZXJDYXNlKCksIHNLZXl3b3JkKVxyXG4gICAgZGVidWdsb2coJ2Jlc3QgZGlzdCcgKyBkaXN0ICsgJyAvICAnICsgZGlzdCAqIHNLZXl3b3JkLmxlbmd0aCArICcgJyArIHNLZXl3b3JkKVxyXG4gICAgaWYgKGRpc3QgPCAxNTApIHtcclxuICAgICAgdmFyIG8xID0gKDxhbnk+T2JqZWN0KS5hc3NpZ24oe30sIG9Db250ZXh0KVxyXG4gICAgICB2YXIgbzJcclxuICAgICAgbzEuY29udGV4dCA9ICg8YW55Pk9iamVjdCkuYXNzaWduKHt9LCBvMS5jb250ZXh0KVxyXG4gICAgICBvMiA9IG8xXHJcbiAgICAgIG8yLmNvbnRleHQgPSAoPGFueT5PYmplY3QpLmFzc2lnbihvMS5jb250ZXh0LCBvTWFwWzBdLmNvbnRleHQpXHJcbiAgICAgIHJldHVybiBvMlxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG51bGxcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIGEgZnVuY3Rpb24gdG8gbWF0Y2ggYSB1bml0IHRlc3QgdXNpbmcgbGV2ZW5zaHRlaW4gZGlzdGFuY2VzXHJcbiAgICogQHB1YmxpY1xyXG4gICAqL1xyXG4gIGZ1bmN0aW9uIGZuRmluZFVuaXRUZXN0IChzc3lzdGVtT2JqZWN0SWQsIG9Db250ZXh0KSB7XHJcbiAgICByZXR1cm4gZm5GaW5kTWF0Y2goc3N5c3RlbU9iamVjdElkLCBvQ29udGV4dCwgb1VuaXRUZXN0cylcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGZuRmluZFdpa2kgKHNLZXl3b3JkLCBvQ29udGV4dCkge1xyXG4gICAgcmV0dXJuIGZuRmluZE1hdGNoKHNLZXl3b3JkLCBvQ29udGV4dCwgb1dpa2lzKVxyXG4gIH1cclxuXHJcbiAgdmFyIGFTaG93RW50aXR5QWN0aW9ucyA9IFtcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbUlkOiAndXYyJyxcclxuICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcclxuICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHAnXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1djIud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3VpMi91c2hlbGwvc2hlbGxzL2FiYXAvRmlvcmlMYXVuY2hwYWQuaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtSWQ6ICd1djInLFxyXG4gICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxyXG4gICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscGQnXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1djIud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3NhcC9hcnNydmNfdXBiX2FkbW4vbWFpbi5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1JZDogJ3UxeScsXHJcbiAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXHJcbiAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwJ1xyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdTF5LndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS91aTIvdXNoZWxsL3NoZWxscy9hYmFwL0Zpb3JpTGF1bmNocGFkLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbUlkOiAndTF5JyxcclxuICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcclxuICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHBkJ1xyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdTF5LndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS9zYXAvYXJzcnZjX3VwYl9hZG1uL21haW4uaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtSWQ6ICd1djInLFxyXG4gICAgICAgIGNsaWVudDogJzEyMCcsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0Q2F0ZWdvcnk6ICdmaW9yaSBjYXRhbG9nJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogLy4qLyxcclxuICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXHJcbiAgICAgICAgdG9vbDogJ0ZMUEQnXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1djIud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3NhcC9hcnNydmNfdXBiX2FkbW4vbWFpbi5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0jQ0FUQUxPRzp7c3lzdGVtT2JqZWN0SWR9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtT2JqZWN0Q2F0ZWdvcnk6ICd1bml0JyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogZm5GaW5kVW5pdFRlc3RcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MC97cGF0aH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtT2JqZWN0Q2F0ZWdvcnk6ICd1bml0IHRlc3QnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiBmbkZpbmRVbml0VGVzdFxyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cDovL2xvY2FsaG9zdDo4MDgwL3twYXRofSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAnd2lraScsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IGZuRmluZFdpa2lcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vd2lraS53ZGYuc2FwLmNvcnAve3BhdGh9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtSWQ6ICdKSVJBJ1xyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9qaXJhLndkZi5zYXAuY29ycDo4MDgwL1RJUENPUkVVSUlJJ1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgXVxyXG5cclxuICAvLyBpZiBUT09MID0gSklSQSB8fCBTeXN0ZW1JZCA9IEpJUkEgLT4gU3lzdGVtSWQgPSBKSVJBXHJcbiAgLy9cclxuICAvL1xyXG5cclxuICBmdW5jdGlvbiBzdGFydEJyb3dzZXIgKHVybCkge1xyXG4gICAgdmFyIGNtZCA9XHJcbiAgICAnXCIlUHJvZ3JhbUZpbGVzKHg4NiklXFxcXEdvb2dsZVxcXFxDaHJvbWVcXFxcQXBwbGljYXRpb25cXFxcY2hyb21lLmV4ZVwiIC0taW5jb2duaXRvIC11cmwgXCInICsgdXJsICsgJ1wiJ1xyXG4gICAgZXhlYyhjbWQsIGZ1bmN0aW9uIChlcnJvciwgc3Rkb3V0LCBzdGRlcnIpIHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihgZXhlYyBlcnJvcjogJHtlcnJvcn1gKVxyXG4gICAgICAgIHJldHVyblxyXG4gICAgICB9XHJcbiAgICAgIGRlYnVnbG9nKGBzdGRvdXQ6ICR7c3Rkb3V0fWApXHJcbiAgICAgIGRlYnVnbG9nKGBzdGRlcnI6ICR7c3RkZXJyfWApXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgLy8gc3RhcnRTQVBHVUlcclxuXHJcbiAgLy8gICBOOlxcPlwiYzpcXFByb2dyYW0gRmlsZXMgKHg4NilcXFNBUFxcRnJvbnRFbmRcXFNBUGd1aVwiXFxzYXBzaGN1dC5leGUgIC1zeXN0ZW09VVYyIC1jbGllbnQ9MTIwIC1jb21tYW5kPVNFMzggLXR5cGU9VHJhbnNhY3Rpb24gLXVzZXI9QVVTRVJcclxuXHJcbiAgZnVuY3Rpb24gZXhwYW5kUGFyYW1ldGVyc0luVVJMIChvTWVyZ2VkQ29udGV4dFJlc3VsdCkge1xyXG4gICAgdmFyIHB0biA9IG9NZXJnZWRDb250ZXh0UmVzdWx0LnJlc3VsdC5wYXR0ZXJuXHJcbiAgICBwdG4gPSBleGVjdGVtcGxhdGUuZXhwYW5kVGVtcGxhdGUob01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dCwgcHRuKTtcclxuLyogICAgT2JqZWN0LmtleXMob01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xyXG4gICAgICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKCd7JyArIHNLZXkgKyAnfScsICdnJylcclxuICAgICAgcHRuID0gcHRuLnJlcGxhY2UocmVnZXgsIG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHRbc0tleV0pXHJcbiAgICAgIHB0biA9IHB0bi5yZXBsYWNlKHJlZ2V4LCBvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0W3NLZXldKVxyXG4gICAgfSlcclxuICAgICovXHJcbiAgICByZXR1cm4gcHRuXHJcbiAgfVxyXG5cclxuICBleHBvcnQgZnVuY3Rpb24gZXhlY3V0ZVN0YXJ0dXAgKG9NZXJnZWRDb250ZXh0UmVzdWx0KSB7XHJcbiAgICBpZiAob01lcmdlZENvbnRleHRSZXN1bHQucmVzdWx0LnR5cGUgPT09ICdVUkwnKSB7XHJcbiAgICAgIHZhciBwdG4gPSBleHBhbmRQYXJhbWV0ZXJzSW5VUkwob01lcmdlZENvbnRleHRSZXN1bHQpXHJcbiAgICAgIHN0YXJ0QnJvd3NlcihwdG4pXHJcbiAgICAgIHJldHVybiBwdG5cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHZhciBzID0gKFwiRG9uJ3Qga25vdyBob3cgdG8gc3RhcnQgXCIgKyBvTWVyZ2VkQ29udGV4dFJlc3VsdC5yZXN1bHQudHlwZSArICdcXG4gZm9yIFwiJyArIG9NZXJnZWRDb250ZXh0UmVzdWx0LnF1ZXJ5ICsgJ1wiJylcclxuICAgICAgZGVidWdsb2cocylcclxuICAgICAgcmV0dXJuIHNcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIG5yTWF0Y2hlcyAoYU9iamVjdCwgb0NvbnRleHQpIHtcclxuICAgIHJldHVybiBPYmplY3Qua2V5cyhhT2JqZWN0KS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xyXG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9Db250ZXh0LCBrZXkpKSB7XHJcbiAgICAgICAgcHJldiA9IHByZXYgKyAxXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHByZXZcclxuICAgIH0sIDApXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBuck5vTWF0Y2hlcyAoYU9iamVjdCwgb0NvbnRleHQpIHtcclxuICAgIHZhciBub01hdGNoQSA9IE9iamVjdC5rZXlzKGFPYmplY3QpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XHJcbiAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9Db250ZXh0LCBrZXkpKSB7XHJcbiAgICAgICAgcHJldiA9IHByZXYgKyAxXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHByZXZcclxuICAgIH0sIDApXHJcbiAgICB2YXIgbm9NYXRjaEIgPSBPYmplY3Qua2V5cyhvQ29udGV4dCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYU9iamVjdCwga2V5KSkge1xyXG4gICAgICAgIHByZXYgPSBwcmV2ICsgMVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBwcmV2XHJcbiAgICB9LCAwKVxyXG4gICAgcmV0dXJuIG5vTWF0Y2hBICsgbm9NYXRjaEJcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHNhbWVPclN0YXIgKHMxIDogc3RyaW5nLCBzMiA6IHN0cmluZyB8IFJlZ0V4cCB8IEZ1bmN0aW9uICwgb0VudGl0eSkge1xyXG4gICAgcmV0dXJuIHMxID09PSBzMiB8fFxyXG4gICAgICAoczEgPT09IHVuZGVmaW5lZCAmJiBzMiA9PT0gbnVsbCkgfHxcclxuICAgICAgKChzMiBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgczIuZXhlYyhzMSkgIT09IG51bGwpIHx8XHJcbiAgICAgICgodHlwZW9mIHMyID09PSAnZnVuY3Rpb24nICYmIHMxKSAmJiBzMihzMSwgb0VudGl0eSkpXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBzYW1lT3JTdGFyRW1wdHkgKHMxIDogc3RyaW5nLCBzMiA6IHN0cmluZyB8IFJlZ0V4cCB8IEZ1bmN0aW9uLCBvRW50aXR5KSB7XHJcbiAgICBpZiAoczEgPT09IHVuZGVmaW5lZCAmJiBzMiA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9XHJcbiAgICBpZiAoczIgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzMSA9PT0gczIgfHxcclxuICAgICAgKChzMiBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgczIuZXhlYyhzMSkgIT09IG51bGwpIHx8XHJcbiAgICAgICgodHlwZW9mIHMyID09PSAnZnVuY3Rpb24nICYmIHMxKSAmJiBzMihzMSwgb0VudGl0eSkpXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBmaWx0ZXJTaG93RW50aXR5T2xkIChvQ29udGV4dCwgYVNob3dFbnRpdHkpIHtcclxuICAgIHZhciBhRmlsdGVyZWRcclxuICAgIE9iamVjdC5rZXlzKG9Db250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XHJcbiAgICAgIGlmIChvQ29udGV4dFtzS2V5XSA9PT0gbnVsbCkge1xyXG4gICAgICAgIG9Db250ZXh0W3NLZXldID0gdW5kZWZpbmVkXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgICAvLyBmaWx0ZXIgY29udGV4dCwgYW1lbmRpbmcgc3lub255bXNcclxuXHJcblxyXG4gICAgYUZpbHRlcmVkID0gYVNob3dFbnRpdHkuZmlsdGVyKGZ1bmN0aW9uIChvU2hvd0VudGl0eSkge1xyXG4gICAgICAvLyAgICAgICBjb25zb2xlLmxvZyhcIi4uLlwiKVxyXG4gICAgICAvLyAgICAgIGNvbnNvbGUubG9nKG9TaG93RW50aXR5LmNvbnRleHQudG9vbCArIFwiIFwiICsgb0NvbnRleHQudG9vbCArIFwiXFxuXCIpXHJcbiAgICAgIC8vICAgICAgY29uc29sZS5sb2cob1Nob3dFbnRpdHkuY29udGV4dC5jbGllbnQgKyBcIiBcIiArIG9Db250ZXh0LmNsaWVudCArXCI6XCIgKyBzYW1lT3JTdGFyKG9Db250ZXh0LmNsaWVudCxvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCkgKyBcIlxcblwiKVxyXG4gICAgICAvLyAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkob1Nob3dFbnRpdHkuY29udGV4dCkgKyBcIlxcblwiICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHQuY2xpZW50KSArIFwiXFxuXCIpXHJcblxyXG4gICAgICByZXR1cm4gc2FtZU9yU3RhcihvU2hvd0VudGl0eS5jb250ZXh0LnN5c3RlbUlkLCBvQ29udGV4dC5zeXN0ZW1JZCwgb0NvbnRleHQpICYmXHJcbiAgICAgICAgc2FtZU9yU3RhcihvQ29udGV4dC50b29sLCBvU2hvd0VudGl0eS5jb250ZXh0LnRvb2wsIG9Db250ZXh0KSAmJlxyXG4gICAgICAgIHNhbWVPclN0YXIob0NvbnRleHQuY2xpZW50LCBvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCwgb0NvbnRleHQpICYmXHJcbiAgICAgICAgc2FtZU9yU3RhckVtcHR5KG9Db250ZXh0LnN5c3RlbU9iamVjdENhdGVnb3J5LCBvU2hvd0VudGl0eS5jb250ZXh0LnN5c3RlbU9iamVjdENhdGVnb3J5LCBvQ29udGV4dCkgJiZcclxuICAgICAgICBzYW1lT3JTdGFyRW1wdHkob0NvbnRleHQuc3lzdGVtT2JqZWN0SWQsIG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtT2JqZWN0SWQsIG9Db250ZXh0KVxyXG4gICAgLy8gICAgICAmJiBvU2hvd0VudGl0eS5jb250ZXh0LnRvb2wgPT09IG9Db250ZXh0LnRvb2xcclxuICAgIH0pXHJcbiAgICAvLyAgY29uc29sZS5sb2coYUZpbHRlcmVkLmxlbmd0aClcclxuICAgIC8vIG1hdGNoIG90aGVyIGNvbnRleHQgcGFyYW1ldGVyc1xyXG4gICAgYUZpbHRlcmVkLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcclxuICAgICAgdmFyIG5yTWF0Y2hlc0EgPSBuck1hdGNoZXMoYS5jb250ZXh0LCBvQ29udGV4dClcclxuICAgICAgdmFyIG5yTWF0Y2hlc0IgPSBuck1hdGNoZXMoYi5jb250ZXh0LCBvQ29udGV4dClcclxuICAgICAgdmFyIG5yTm9NYXRjaGVzQSA9IG5yTm9NYXRjaGVzKGEuY29udGV4dCwgb0NvbnRleHQpXHJcbiAgICAgIHZhciBuck5vTWF0Y2hlc0IgPSBuck5vTWF0Y2hlcyhiLmNvbnRleHQsIG9Db250ZXh0KVxyXG4gICAgICAvLyAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGEuY29udGV4dCkpXHJcbiAgICAgIC8vICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYi5jb250ZXh0KSlcclxuICAgICAgLy8gICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShvQ29udGV4dCkpXHJcbiAgICAgIHZhciByZXMgPSAtKG5yTWF0Y2hlc0EgLSBuck1hdGNoZXNCKSAqIDEwMCArIChuck5vTWF0Y2hlc0EgLSBuck5vTWF0Y2hlc0IpXHJcbiAgICAgIC8vICAgICBjb25zb2xlLmxvZyhcImRpZmYgXCIgKyByZXMpXHJcbiAgICAgIHJldHVybiByZXNcclxuICAgIH0pXHJcbiAgICBpZiAoYUZpbHRlcmVkLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICBkZWJ1Z2xvZygnbm8gdGFyZ2V0IGZvciBzaG93RW50aXR5ICcgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dCkpXHJcbiAgICB9XHJcbiAgICAvLyBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhRmlsdGVyZWQsdW5kZWZpbmVkLDIpKVxyXG4gICAgaWYgKGFGaWx0ZXJlZFswXSkge1xyXG4gICAgICAvLyBleGVjdXRlIGFsbCBmdW5jdGlvbnNcclxuXHJcbiAgICAgIHZhciBvTWF0Y2ggPSBhRmlsdGVyZWRbMF1cclxuXHJcbiAgICAgIHZhciBvTWVyZ2VkID0ge1xyXG4gICAgICAgIGNvbnRleHQ6IHtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIG9NZXJnZWQuY29udGV4dCA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9NZXJnZWQuY29udGV4dCwgYUZpbHRlcmVkWzBdLmNvbnRleHQsIG9Db250ZXh0KVxyXG4gICAgICBvTWVyZ2VkID0gQW55T2JqZWN0LmFzc2lnbihvTWVyZ2VkLCB7XHJcbiAgICAgICAgcmVzdWx0OiBhRmlsdGVyZWRbMF0ucmVzdWx0XHJcbiAgICAgIH0pXHJcblxyXG4gICAgICBPYmplY3Qua2V5cyhvTWF0Y2guY29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xyXG4gICAgICAgIGlmICh0eXBlb2Ygb01hdGNoLmNvbnRleHRbc0tleV0gPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgIGRlYnVnbG9nKCdOb3cgcmV0cm9maXR0aW5nIDonICsgc0tleSArICcgLSAnICsgb0NvbnRleHRbc0tleV0pXHJcbiAgICAgICAgICBvTWVyZ2VkID0gb01hdGNoLmNvbnRleHRbc0tleV0ob0NvbnRleHRbc0tleV0sIG9NZXJnZWQpXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG5cclxuICAgICAgcmV0dXJuIG9NZXJnZWRcclxuICAgIH1cclxuICAgIHJldHVybiBudWxsXHJcbiAgfVxyXG5cclxuXHJcbmltcG9ydCAqIGFzIGlucHV0RmlsdGVyIGZyb20gJy4vaW5wdXRGaWx0ZXInO1xyXG5cclxuICBmdW5jdGlvbiBmaWx0ZXJTaG93RW50aXR5IChvQ29udGV4dCwgYVNob3dFbnRpdHlBY3Rpb25zKSB7XHJcbiAgICBPYmplY3Qua2V5cyhvQ29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xyXG4gICAgICBpZiAob0NvbnRleHRbc0tleV0gPT09IG51bGwpIHtcclxuICAgICAgICBkZWxldGUgb0NvbnRleHRbc0tleV1cclxuICAgICAgfVxyXG4gICAgfSlcclxuICAgIHZhciByZXMgPSBpbnB1dEZpbHRlci5hcHBseVJ1bGVzUGlja0ZpcnN0KG9Db250ZXh0KTtcclxuICAgIGlmICghcmVzKSB7XHJcbiAgICAgIHJldHVybiB1bmRlZmluZWRcclxuICAgIH1cclxuICAgIGRlYnVnbG9nKFwiKiogYWZ0ZXIgZmlsdGVyIHJ1bGVzXCIgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpXHJcbiAgICByZXR1cm4gZmlsdGVyU2hvd0VudGl0eU9sZChyZXMsYVNob3dFbnRpdHlBY3Rpb25zKTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGV4ZWNTaG93RW50aXR5IChvRW50aXR5KSB7XHJcbiAgICB2YXIgbWVyZ2VkID0gZmlsdGVyU2hvd0VudGl0eShvRW50aXR5LCBhU2hvd0VudGl0eUFjdGlvbnMpXHJcbiAgICBpZiAobWVyZ2VkKSB7XHJcbiAgICAgIHJldHVybiBleGVjdXRlU3RhcnR1cChtZXJnZWQpXHJcbiAgICB9XHJcbiAgICByZXR1cm4gbnVsbFxyXG4gIH1cclxuXHJcbiAgLy8gRTpcXHByb2plY3RzXFxub2RlanNcXGJvdGJ1aWxkZXJcXHNhbXBsZWJvdD5cIiVQcm9ncmFtRmlsZXMoeDg2KSVcXEdvb2dsZVxcQ2hyb21lXFxBcHBsaWNhdGlvblxcY2hyb21lLmV4ZVwiIC0taW5jb2duaXRvIC11cmwgd3d3LnNwaWVnZWwuZGVcclxuXHJcbiAgZXhwb3J0IGNvbnN0IGRpc3BhdGNoZXIgPSB7XHJcbiAgICBleGVjU2hvd0VudGl0eTogZXhlY1Nob3dFbnRpdHksXHJcbiAgICBfdGVzdDoge1xyXG4gICAgICBzYW1lT3JTdGFyOiBzYW1lT3JTdGFyLFxyXG4gICAgICBuck1hdGNoZXM6IG5yTWF0Y2hlcyxcclxuICAgICAgbnJOb01hdGNoZXM6IG5yTm9NYXRjaGVzLFxyXG4gICAgICBleHBhbmRQYXJhbWV0ZXJzSW5VUkw6IGV4cGFuZFBhcmFtZXRlcnNJblVSTCxcclxuICAgICAgZmlsdGVyU2hvd0VudGl0eTogZmlsdGVyU2hvd0VudGl0eSxcclxuICAgICAgZm5GaW5kVW5pdFRlc3Q6IGZuRmluZFVuaXRUZXN0LFxyXG4gICAgICBjYWxjRGlzdGFuY2U6IGNhbGNEaXN0YW5jZSxcclxuICAgICAgX2FTaG93RW50aXR5QWN0aW9uczogYVNob3dFbnRpdHlBY3Rpb25zXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvL2V4cG9ydHMgZGlzcGF0Y2hlcjtcclxuXHJcbiAgLy9tb2R1bGUuZXhwb3J0cyA9IGRpc3BhdGNoZXJcclxuXHJcbiIsIi8qKlxuICogQGZpbGVcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmRpc3BhdGNoZXJcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cbiAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgQW55T2JqZWN0ID0gT2JqZWN0O1xudmFyIGRpc3RhbmNlID0gcmVxdWlyZSgnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluJyk7XG52YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpO1xudmFyIGRlYnVnbG9nID0gZGVidWcoJ2Rpc3BhdGNoZXInKTtcbnZhciBjaGlsZF9wcm9jZXNzXzEgPSByZXF1aXJlKCdjaGlsZF9wcm9jZXNzJyk7XG4vLyAgdmFyIGV4ZWMgPSByZXF1aXJlKCdjaGlsZF9wcm9jZXNzJykuZXhlY1xuLy8gIHZhciBsZXZlbiA9IHJlcXVpcmUoJy4uL3V0aWxzL2RhbWVyYXVMZXZlbnNodGVpbi5qcycpLmxldmVuc2h0ZWluXG52YXIgZXhlY3RlbXBsYXRlID0gcmVxdWlyZSgnLi4vZXhlYy9leGVjdGVtcGxhdGUnKTtcbi8vdmFyIGxldmVuID0gcmVxdWlyZSgnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluLmpzJylcbnZhciBtYXRjaGRhdGEgPSByZXF1aXJlKCcuL21hdGNoZGF0YScpO1xudmFyIG9Vbml0VGVzdHMgPSBtYXRjaGRhdGEub1VuaXRUZXN0cztcbnZhciBvV2lraXMgPSBtYXRjaGRhdGEub1dpa2lzO1xuZnVuY3Rpb24gY2FsY0Rpc3RhbmNlKHNUZXh0MSwgc1RleHQyKSB7XG4gICAgZGVidWdsb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKTtcbiAgICB2YXIgYTAgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEuc3Vic3RyaW5nKDAsIHNUZXh0Mi5sZW5ndGgpLCBzVGV4dDIpO1xuICAgIHZhciBhID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnRvTG93ZXJDYXNlKCksIHNUZXh0Mik7XG4gICAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGE7XG59XG5mdW5jdGlvbiBmbkZpbmRNYXRjaChzS2V5d29yZCwgb0NvbnRleHQsIG9NYXApIHtcbiAgICAvLyByZXR1cm4gYSBiZXR0ZXIgY29udGV4dCBpZiB0aGVyZSBpcyBhIG1hdGNoXG4gICAgLy8gc0tleXdvcmQgPSBzS2V5d29yZC50b0xvd2VyQ2FzZSgpO1xuICAgIG9NYXAuc29ydChmdW5jdGlvbiAob0VudHJ5MSwgb0VudHJ5Mikge1xuICAgICAgICB2YXIgdTEgPSBjYWxjRGlzdGFuY2Uob0VudHJ5MS5rZXkudG9Mb3dlckNhc2UoKSwgc0tleXdvcmQpO1xuICAgICAgICB2YXIgdTIgPSBjYWxjRGlzdGFuY2Uob0VudHJ5Mi5rZXkudG9Mb3dlckNhc2UoKSwgc0tleXdvcmQpO1xuICAgICAgICByZXR1cm4gdTEgLSB1MjtcbiAgICB9KTtcbiAgICAvLyBsYXRlcjogaW4gY2FzZSBvZiBjb25mbGljdHMsIGFzayxcbiAgICAvLyBub3c6XG4gICAgdmFyIGRpc3QgPSBjYWxjRGlzdGFuY2Uob01hcFswXS5rZXkudG9Mb3dlckNhc2UoKSwgc0tleXdvcmQpO1xuICAgIGRlYnVnbG9nKCdiZXN0IGRpc3QnICsgZGlzdCArICcgLyAgJyArIGRpc3QgKiBzS2V5d29yZC5sZW5ndGggKyAnICcgKyBzS2V5d29yZCk7XG4gICAgaWYgKGRpc3QgPCAxNTApIHtcbiAgICAgICAgdmFyIG8xID0gT2JqZWN0LmFzc2lnbih7fSwgb0NvbnRleHQpO1xuICAgICAgICB2YXIgbzI7XG4gICAgICAgIG8xLmNvbnRleHQgPSBPYmplY3QuYXNzaWduKHt9LCBvMS5jb250ZXh0KTtcbiAgICAgICAgbzIgPSBvMTtcbiAgICAgICAgbzIuY29udGV4dCA9IE9iamVjdC5hc3NpZ24obzEuY29udGV4dCwgb01hcFswXS5jb250ZXh0KTtcbiAgICAgICAgcmV0dXJuIG8yO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cbi8qKlxuICogYSBmdW5jdGlvbiB0byBtYXRjaCBhIHVuaXQgdGVzdCB1c2luZyBsZXZlbnNodGVpbiBkaXN0YW5jZXNcbiAqIEBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gZm5GaW5kVW5pdFRlc3Qoc3N5c3RlbU9iamVjdElkLCBvQ29udGV4dCkge1xuICAgIHJldHVybiBmbkZpbmRNYXRjaChzc3lzdGVtT2JqZWN0SWQsIG9Db250ZXh0LCBvVW5pdFRlc3RzKTtcbn1cbmZ1bmN0aW9uIGZuRmluZFdpa2koc0tleXdvcmQsIG9Db250ZXh0KSB7XG4gICAgcmV0dXJuIGZuRmluZE1hdGNoKHNLZXl3b3JkLCBvQ29udGV4dCwgb1dpa2lzKTtcbn1cbnZhciBhU2hvd0VudGl0eUFjdGlvbnMgPSBbXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1JZDogJ3V2MicsXG4gICAgICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcbiAgICAgICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwJ1xuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXV2Mi53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvdWkyL3VzaGVsbC9zaGVsbHMvYWJhcC9GaW9yaUxhdW5jaHBhZC5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtSWQ6ICd1djInLFxuICAgICAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXG4gICAgICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscGQnXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdXYyLndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS9zYXAvYXJzcnZjX3VwYl9hZG1uL21haW4uaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbUlkOiAndTF5JyxcbiAgICAgICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxuICAgICAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHAnXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdTF5LndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS91aTIvdXNoZWxsL3NoZWxscy9hYmFwL0Zpb3JpTGF1bmNocGFkLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1JZDogJ3UxeScsXG4gICAgICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcbiAgICAgICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwZCdcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1MXkud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3NhcC9hcnNydmNfdXBiX2FkbW4vbWFpbi5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtSWQ6ICd1djInLFxuICAgICAgICAgICAgY2xpZW50OiAnMTIwJyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAnZmlvcmkgY2F0YWxvZycsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogLy4qLyxcbiAgICAgICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcbiAgICAgICAgICAgIHRvb2w6ICdGTFBEJ1xuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXV2Mi53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvc2FwL2Fyc3J2Y191cGJfYWRtbi9tYWluLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSNDQVRBTE9HOntzeXN0ZW1PYmplY3RJZH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtT2JqZWN0Q2F0ZWdvcnk6ICd1bml0JyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiBmbkZpbmRVbml0VGVzdFxuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MC97cGF0aH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtT2JqZWN0Q2F0ZWdvcnk6ICd1bml0IHRlc3QnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IGZuRmluZFVuaXRUZXN0XG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cDovL2xvY2FsaG9zdDo4MDgwL3twYXRofSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ3dpa2knLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IGZuRmluZFdpa2lcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwczovL3dpa2kud2RmLnNhcC5jb3JwL3twYXRofSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1JZDogJ0pJUkEnXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9qaXJhLndkZi5zYXAuY29ycDo4MDgwL1RJUENPUkVVSUlJJ1xuICAgICAgICB9XG4gICAgfVxuXTtcbi8vIGlmIFRPT0wgPSBKSVJBIHx8IFN5c3RlbUlkID0gSklSQSAtPiBTeXN0ZW1JZCA9IEpJUkFcbi8vXG4vL1xuZnVuY3Rpb24gc3RhcnRCcm93c2VyKHVybCkge1xuICAgIHZhciBjbWQgPSAnXCIlUHJvZ3JhbUZpbGVzKHg4NiklXFxcXEdvb2dsZVxcXFxDaHJvbWVcXFxcQXBwbGljYXRpb25cXFxcY2hyb21lLmV4ZVwiIC0taW5jb2duaXRvIC11cmwgXCInICsgdXJsICsgJ1wiJztcbiAgICBjaGlsZF9wcm9jZXNzXzEuZXhlYyhjbWQsIGZ1bmN0aW9uIChlcnJvciwgc3Rkb3V0LCBzdGRlcnIpIHtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiZXhlYyBlcnJvcjogXCIgKyBlcnJvcik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZGVidWdsb2coXCJzdGRvdXQ6IFwiICsgc3Rkb3V0KTtcbiAgICAgICAgZGVidWdsb2coXCJzdGRlcnI6IFwiICsgc3RkZXJyKTtcbiAgICB9KTtcbn1cbi8vIHN0YXJ0U0FQR1VJXG4vLyAgIE46XFw+XCJjOlxcUHJvZ3JhbSBGaWxlcyAoeDg2KVxcU0FQXFxGcm9udEVuZFxcU0FQZ3VpXCJcXHNhcHNoY3V0LmV4ZSAgLXN5c3RlbT1VVjIgLWNsaWVudD0xMjAgLWNvbW1hbmQ9U0UzOCAtdHlwZT1UcmFuc2FjdGlvbiAtdXNlcj1BVVNFUlxuZnVuY3Rpb24gZXhwYW5kUGFyYW1ldGVyc0luVVJMKG9NZXJnZWRDb250ZXh0UmVzdWx0KSB7XG4gICAgdmFyIHB0biA9IG9NZXJnZWRDb250ZXh0UmVzdWx0LnJlc3VsdC5wYXR0ZXJuO1xuICAgIHB0biA9IGV4ZWN0ZW1wbGF0ZS5leHBhbmRUZW1wbGF0ZShvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0LCBwdG4pO1xuICAgIC8qICAgIE9iamVjdC5rZXlzKG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgICAgICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKCd7JyArIHNLZXkgKyAnfScsICdnJylcbiAgICAgICAgICBwdG4gPSBwdG4ucmVwbGFjZShyZWdleCwgb01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dFtzS2V5XSlcbiAgICAgICAgICBwdG4gPSBwdG4ucmVwbGFjZShyZWdleCwgb01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dFtzS2V5XSlcbiAgICAgICAgfSlcbiAgICAgICAgKi9cbiAgICByZXR1cm4gcHRuO1xufVxuZnVuY3Rpb24gZXhlY3V0ZVN0YXJ0dXAob01lcmdlZENvbnRleHRSZXN1bHQpIHtcbiAgICBpZiAob01lcmdlZENvbnRleHRSZXN1bHQucmVzdWx0LnR5cGUgPT09ICdVUkwnKSB7XG4gICAgICAgIHZhciBwdG4gPSBleHBhbmRQYXJhbWV0ZXJzSW5VUkwob01lcmdlZENvbnRleHRSZXN1bHQpO1xuICAgICAgICBzdGFydEJyb3dzZXIocHRuKTtcbiAgICAgICAgcmV0dXJuIHB0bjtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHZhciBzID0gKFwiRG9uJ3Qga25vdyBob3cgdG8gc3RhcnQgXCIgKyBvTWVyZ2VkQ29udGV4dFJlc3VsdC5yZXN1bHQudHlwZSArICdcXG4gZm9yIFwiJyArIG9NZXJnZWRDb250ZXh0UmVzdWx0LnF1ZXJ5ICsgJ1wiJyk7XG4gICAgICAgIGRlYnVnbG9nKHMpO1xuICAgICAgICByZXR1cm4gcztcbiAgICB9XG59XG5leHBvcnRzLmV4ZWN1dGVTdGFydHVwID0gZXhlY3V0ZVN0YXJ0dXA7XG5mdW5jdGlvbiBuck1hdGNoZXMoYU9iamVjdCwgb0NvbnRleHQpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoYU9iamVjdCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQ29udGV4dCwga2V5KSkge1xuICAgICAgICAgICAgcHJldiA9IHByZXYgKyAxO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIDApO1xufVxuZnVuY3Rpb24gbnJOb01hdGNoZXMoYU9iamVjdCwgb0NvbnRleHQpIHtcbiAgICB2YXIgbm9NYXRjaEEgPSBPYmplY3Qua2V5cyhhT2JqZWN0KS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xuICAgICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQ29udGV4dCwga2V5KSkge1xuICAgICAgICAgICAgcHJldiA9IHByZXYgKyAxO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIDApO1xuICAgIHZhciBub01hdGNoQiA9IE9iamVjdC5rZXlzKG9Db250ZXh0KS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xuICAgICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChhT2JqZWN0LCBrZXkpKSB7XG4gICAgICAgICAgICBwcmV2ID0gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG4gICAgcmV0dXJuIG5vTWF0Y2hBICsgbm9NYXRjaEI7XG59XG5mdW5jdGlvbiBzYW1lT3JTdGFyKHMxLCBzMiwgb0VudGl0eSkge1xuICAgIHJldHVybiBzMSA9PT0gczIgfHxcbiAgICAgICAgKHMxID09PSB1bmRlZmluZWQgJiYgczIgPT09IG51bGwpIHx8XG4gICAgICAgICgoczIgaW5zdGFuY2VvZiBSZWdFeHApICYmIHMyLmV4ZWMoczEpICE9PSBudWxsKSB8fFxuICAgICAgICAoKHR5cGVvZiBzMiA9PT0gJ2Z1bmN0aW9uJyAmJiBzMSkgJiYgczIoczEsIG9FbnRpdHkpKTtcbn1cbmZ1bmN0aW9uIHNhbWVPclN0YXJFbXB0eShzMSwgczIsIG9FbnRpdHkpIHtcbiAgICBpZiAoczEgPT09IHVuZGVmaW5lZCAmJiBzMiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoczIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHMxID09PSBzMiB8fFxuICAgICAgICAoKHMyIGluc3RhbmNlb2YgUmVnRXhwKSAmJiBzMi5leGVjKHMxKSAhPT0gbnVsbCkgfHxcbiAgICAgICAgKCh0eXBlb2YgczIgPT09ICdmdW5jdGlvbicgJiYgczEpICYmIHMyKHMxLCBvRW50aXR5KSk7XG59XG5mdW5jdGlvbiBmaWx0ZXJTaG93RW50aXR5T2xkKG9Db250ZXh0LCBhU2hvd0VudGl0eSkge1xuICAgIHZhciBhRmlsdGVyZWQ7XG4gICAgT2JqZWN0LmtleXMob0NvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgICAgaWYgKG9Db250ZXh0W3NLZXldID09PSBudWxsKSB7XG4gICAgICAgICAgICBvQ29udGV4dFtzS2V5XSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIC8vIGZpbHRlciBjb250ZXh0LCBhbWVuZGluZyBzeW5vbnltc1xuICAgIGFGaWx0ZXJlZCA9IGFTaG93RW50aXR5LmZpbHRlcihmdW5jdGlvbiAob1Nob3dFbnRpdHkpIHtcbiAgICAgICAgLy8gICAgICAgY29uc29sZS5sb2coXCIuLi5cIilcbiAgICAgICAgLy8gICAgICBjb25zb2xlLmxvZyhvU2hvd0VudGl0eS5jb250ZXh0LnRvb2wgKyBcIiBcIiArIG9Db250ZXh0LnRvb2wgKyBcIlxcblwiKVxuICAgICAgICAvLyAgICAgIGNvbnNvbGUubG9nKG9TaG93RW50aXR5LmNvbnRleHQuY2xpZW50ICsgXCIgXCIgKyBvQ29udGV4dC5jbGllbnQgK1wiOlwiICsgc2FtZU9yU3RhcihvQ29udGV4dC5jbGllbnQsb1Nob3dFbnRpdHkuY29udGV4dC5jbGllbnQpICsgXCJcXG5cIilcbiAgICAgICAgLy8gIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KG9TaG93RW50aXR5LmNvbnRleHQpICsgXCJcXG5cIiArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0LmNsaWVudCkgKyBcIlxcblwiKVxuICAgICAgICByZXR1cm4gc2FtZU9yU3RhcihvU2hvd0VudGl0eS5jb250ZXh0LnN5c3RlbUlkLCBvQ29udGV4dC5zeXN0ZW1JZCwgb0NvbnRleHQpICYmXG4gICAgICAgICAgICBzYW1lT3JTdGFyKG9Db250ZXh0LnRvb2wsIG9TaG93RW50aXR5LmNvbnRleHQudG9vbCwgb0NvbnRleHQpICYmXG4gICAgICAgICAgICBzYW1lT3JTdGFyKG9Db250ZXh0LmNsaWVudCwgb1Nob3dFbnRpdHkuY29udGV4dC5jbGllbnQsIG9Db250ZXh0KSAmJlxuICAgICAgICAgICAgc2FtZU9yU3RhckVtcHR5KG9Db250ZXh0LnN5c3RlbU9iamVjdENhdGVnb3J5LCBvU2hvd0VudGl0eS5jb250ZXh0LnN5c3RlbU9iamVjdENhdGVnb3J5LCBvQ29udGV4dCkgJiZcbiAgICAgICAgICAgIHNhbWVPclN0YXJFbXB0eShvQ29udGV4dC5zeXN0ZW1PYmplY3RJZCwgb1Nob3dFbnRpdHkuY29udGV4dC5zeXN0ZW1PYmplY3RJZCwgb0NvbnRleHQpO1xuICAgICAgICAvLyAgICAgICYmIG9TaG93RW50aXR5LmNvbnRleHQudG9vbCA9PT0gb0NvbnRleHQudG9vbFxuICAgIH0pO1xuICAgIC8vICBjb25zb2xlLmxvZyhhRmlsdGVyZWQubGVuZ3RoKVxuICAgIC8vIG1hdGNoIG90aGVyIGNvbnRleHQgcGFyYW1ldGVyc1xuICAgIGFGaWx0ZXJlZC5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHZhciBuck1hdGNoZXNBID0gbnJNYXRjaGVzKGEuY29udGV4dCwgb0NvbnRleHQpO1xuICAgICAgICB2YXIgbnJNYXRjaGVzQiA9IG5yTWF0Y2hlcyhiLmNvbnRleHQsIG9Db250ZXh0KTtcbiAgICAgICAgdmFyIG5yTm9NYXRjaGVzQSA9IG5yTm9NYXRjaGVzKGEuY29udGV4dCwgb0NvbnRleHQpO1xuICAgICAgICB2YXIgbnJOb01hdGNoZXNCID0gbnJOb01hdGNoZXMoYi5jb250ZXh0LCBvQ29udGV4dCk7XG4gICAgICAgIC8vICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYS5jb250ZXh0KSlcbiAgICAgICAgLy8gICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShiLmNvbnRleHQpKVxuICAgICAgICAvLyAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KG9Db250ZXh0KSlcbiAgICAgICAgdmFyIHJlcyA9IC0obnJNYXRjaGVzQSAtIG5yTWF0Y2hlc0IpICogMTAwICsgKG5yTm9NYXRjaGVzQSAtIG5yTm9NYXRjaGVzQik7XG4gICAgICAgIC8vICAgICBjb25zb2xlLmxvZyhcImRpZmYgXCIgKyByZXMpXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfSk7XG4gICAgaWYgKGFGaWx0ZXJlZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgZGVidWdsb2coJ25vIHRhcmdldCBmb3Igc2hvd0VudGl0eSAnICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHQpKTtcbiAgICB9XG4gICAgLy8gY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYUZpbHRlcmVkLHVuZGVmaW5lZCwyKSlcbiAgICBpZiAoYUZpbHRlcmVkWzBdKSB7XG4gICAgICAgIC8vIGV4ZWN1dGUgYWxsIGZ1bmN0aW9uc1xuICAgICAgICB2YXIgb01hdGNoID0gYUZpbHRlcmVkWzBdO1xuICAgICAgICB2YXIgb01lcmdlZCA9IHtcbiAgICAgICAgICAgIGNvbnRleHQ6IHt9XG4gICAgICAgIH07XG4gICAgICAgIG9NZXJnZWQuY29udGV4dCA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9NZXJnZWQuY29udGV4dCwgYUZpbHRlcmVkWzBdLmNvbnRleHQsIG9Db250ZXh0KTtcbiAgICAgICAgb01lcmdlZCA9IEFueU9iamVjdC5hc3NpZ24ob01lcmdlZCwge1xuICAgICAgICAgICAgcmVzdWx0OiBhRmlsdGVyZWRbMF0ucmVzdWx0XG4gICAgICAgIH0pO1xuICAgICAgICBPYmplY3Qua2V5cyhvTWF0Y2guY29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBvTWF0Y2guY29udGV4dFtzS2V5XSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIGRlYnVnbG9nKCdOb3cgcmV0cm9maXR0aW5nIDonICsgc0tleSArICcgLSAnICsgb0NvbnRleHRbc0tleV0pO1xuICAgICAgICAgICAgICAgIG9NZXJnZWQgPSBvTWF0Y2guY29udGV4dFtzS2V5XShvQ29udGV4dFtzS2V5XSwgb01lcmdlZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gb01lcmdlZDtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59XG52YXIgaW5wdXRGaWx0ZXIgPSByZXF1aXJlKCcuL2lucHV0RmlsdGVyJyk7XG5mdW5jdGlvbiBmaWx0ZXJTaG93RW50aXR5KG9Db250ZXh0LCBhU2hvd0VudGl0eUFjdGlvbnMpIHtcbiAgICBPYmplY3Qua2V5cyhvQ29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xuICAgICAgICBpZiAob0NvbnRleHRbc0tleV0gPT09IG51bGwpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBvQ29udGV4dFtzS2V5XTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHZhciByZXMgPSBpbnB1dEZpbHRlci5hcHBseVJ1bGVzUGlja0ZpcnN0KG9Db250ZXh0KTtcbiAgICBpZiAoIXJlcykge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBkZWJ1Z2xvZyhcIioqIGFmdGVyIGZpbHRlciBydWxlc1wiICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICByZXR1cm4gZmlsdGVyU2hvd0VudGl0eU9sZChyZXMsIGFTaG93RW50aXR5QWN0aW9ucyk7XG59XG5mdW5jdGlvbiBleGVjU2hvd0VudGl0eShvRW50aXR5KSB7XG4gICAgdmFyIG1lcmdlZCA9IGZpbHRlclNob3dFbnRpdHkob0VudGl0eSwgYVNob3dFbnRpdHlBY3Rpb25zKTtcbiAgICBpZiAobWVyZ2VkKSB7XG4gICAgICAgIHJldHVybiBleGVjdXRlU3RhcnR1cChtZXJnZWQpO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cbi8vIEU6XFxwcm9qZWN0c1xcbm9kZWpzXFxib3RidWlsZGVyXFxzYW1wbGVib3Q+XCIlUHJvZ3JhbUZpbGVzKHg4NiklXFxHb29nbGVcXENocm9tZVxcQXBwbGljYXRpb25cXGNocm9tZS5leGVcIiAtLWluY29nbml0byAtdXJsIHd3dy5zcGllZ2VsLmRlXG5leHBvcnRzLmRpc3BhdGNoZXIgPSB7XG4gICAgZXhlY1Nob3dFbnRpdHk6IGV4ZWNTaG93RW50aXR5LFxuICAgIF90ZXN0OiB7XG4gICAgICAgIHNhbWVPclN0YXI6IHNhbWVPclN0YXIsXG4gICAgICAgIG5yTWF0Y2hlczogbnJNYXRjaGVzLFxuICAgICAgICBuck5vTWF0Y2hlczogbnJOb01hdGNoZXMsXG4gICAgICAgIGV4cGFuZFBhcmFtZXRlcnNJblVSTDogZXhwYW5kUGFyYW1ldGVyc0luVVJMLFxuICAgICAgICBmaWx0ZXJTaG93RW50aXR5OiBmaWx0ZXJTaG93RW50aXR5LFxuICAgICAgICBmbkZpbmRVbml0VGVzdDogZm5GaW5kVW5pdFRlc3QsXG4gICAgICAgIGNhbGNEaXN0YW5jZTogY2FsY0Rpc3RhbmNlLFxuICAgICAgICBfYVNob3dFbnRpdHlBY3Rpb25zOiBhU2hvd0VudGl0eUFjdGlvbnNcbiAgICB9XG59O1xuLy9leHBvcnRzIGRpc3BhdGNoZXI7XG4vL21vZHVsZS5leHBvcnRzID0gZGlzcGF0Y2hlclxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
