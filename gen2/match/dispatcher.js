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
        fnFindUnitTest: fnFindUnitTest,
        calcDistance: calcDistance,
        _aShowEntityActions: aShowEntityActions
    }
};
//exports dispatcher;
//module.exports = dispatcher
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9kaXNwYXRjaGVyLnRzIiwibWF0Y2gvZGlzcGF0Y2hlci5qcyJdLCJuYW1lcyI6WyJBbnlPYmplY3QiLCJPYmplY3QiLCJkaXN0YW5jZSIsInJlcXVpcmUiLCJkZWJ1ZyIsImRlYnVnbG9nIiwiY2hpbGRfcHJvY2Vzc18xIiwiZXhlY3RlbXBsYXRlIiwibWF0Y2hkYXRhIiwib1VuaXRUZXN0cyIsIm9XaWtpcyIsImNhbGNEaXN0YW5jZSIsInNUZXh0MSIsInNUZXh0MiIsImEwIiwibGV2ZW5zaHRlaW4iLCJzdWJzdHJpbmciLCJsZW5ndGgiLCJhIiwidG9Mb3dlckNhc2UiLCJmbkZpbmRNYXRjaCIsInNLZXl3b3JkIiwib0NvbnRleHQiLCJvTWFwIiwic29ydCIsIm9FbnRyeTEiLCJvRW50cnkyIiwidTEiLCJrZXkiLCJ1MiIsImRpc3QiLCJvMSIsImFzc2lnbiIsIm8yIiwiY29udGV4dCIsImZuRmluZFVuaXRUZXN0Iiwic3N5c3RlbU9iamVjdElkIiwiZm5GaW5kV2lraSIsImFTaG93RW50aXR5QWN0aW9ucyIsInN5c3RlbUlkIiwiY2xpZW50Iiwic3lzdGVtdHlwZSIsInN5c3RlbU9iamVjdElkIiwicmVzdWx0IiwidHlwZSIsInBhdHRlcm4iLCJzeXN0ZW1PYmplY3RDYXRlZ29yeSIsInRvb2wiLCJzdGFydEJyb3dzZXIiLCJ1cmwiLCJjbWQiLCJleGVjIiwiZXJyb3IiLCJzdGRvdXQiLCJzdGRlcnIiLCJjb25zb2xlIiwiZXhwYW5kUGFyYW1ldGVyc0luVVJMIiwib01lcmdlZENvbnRleHRSZXN1bHQiLCJwdG4iLCJleHBhbmRUZW1wbGF0ZSIsImV4ZWN1dGVTdGFydHVwIiwicyIsInF1ZXJ5IiwiZXhwb3J0cyIsIm5yTWF0Y2hlcyIsImFPYmplY3QiLCJrZXlzIiwicmVkdWNlIiwicHJldiIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiY2FsbCIsIm5yTm9NYXRjaGVzIiwibm9NYXRjaEEiLCJub01hdGNoQiIsInNhbWVPclN0YXIiLCJzMSIsInMyIiwib0VudGl0eSIsInVuZGVmaW5lZCIsIlJlZ0V4cCIsInNhbWVPclN0YXJFbXB0eSIsImZpbHRlclNob3dFbnRpdHlPbGQiLCJhU2hvd0VudGl0eSIsImFGaWx0ZXJlZCIsImZvckVhY2giLCJzS2V5IiwiZmlsdGVyIiwib1Nob3dFbnRpdHkiLCJiIiwibnJNYXRjaGVzQSIsIm5yTWF0Y2hlc0IiLCJuck5vTWF0Y2hlc0EiLCJuck5vTWF0Y2hlc0IiLCJyZXMiLCJKU09OIiwic3RyaW5naWZ5Iiwib01hdGNoIiwib01lcmdlZCIsImlucHV0RmlsdGVyIiwiZmlsdGVyU2hvd0VudGl0eSIsImFwcGx5UnVsZXNQaWNrRmlyc3QiLCJleGVjU2hvd0VudGl0eSIsIm1lcmdlZCIsImRpc3BhdGNoZXIiLCJfdGVzdCIsIl9hU2hvd0VudGl0eUFjdGlvbnMiXSwibWFwcGluZ3MiOiJBQUFBOzs7OztBQ0tBOztBRFFBLElBQUlBLFlBQWtCQyxNQUF0QjtBQUVBLElBQUFDLFdBQUFDLFFBQUEsNkJBQUEsQ0FBQTtBQUVBLElBQUFDLFFBQUFELFFBQUEsT0FBQSxDQUFBO0FBQ0EsSUFBTUUsV0FBV0QsTUFBTSxZQUFOLENBQWpCO0FBRUEsSUFBQUUsa0JBQUFILFFBQUEsZUFBQSxDQUFBO0FBQ0E7QUFDQTtBQUVBLElBQUFJLGVBQUFKLFFBQUEsc0JBQUEsQ0FBQTtBQUVFO0FBQ0YsSUFBQUssWUFBQUwsUUFBQSxhQUFBLENBQUE7QUFFQSxJQUFNTSxhQUFhRCxVQUFVQyxVQUE3QjtBQUNBLElBQU1DLFNBQVNGLFVBQVVFLE1BQXpCO0FBRUUsU0FBQUMsWUFBQSxDQUF1QkMsTUFBdkIsRUFBK0JDLE1BQS9CLEVBQXFDO0FBQ25DUixhQUFTLFlBQVlPLE1BQVosR0FBcUIsS0FBckIsR0FBNkJDLE1BQXRDO0FBQ0EsUUFBSUMsS0FBS1osU0FBU2EsV0FBVCxDQUFxQkgsT0FBT0ksU0FBUCxDQUFpQixDQUFqQixFQUFvQkgsT0FBT0ksTUFBM0IsQ0FBckIsRUFBeURKLE1BQXpELENBQVQ7QUFDQSxRQUFJSyxJQUFJaEIsU0FBU2EsV0FBVCxDQUFxQkgsT0FBT08sV0FBUCxFQUFyQixFQUEyQ04sTUFBM0MsQ0FBUjtBQUNBLFdBQU9DLEtBQUssR0FBTCxHQUFXRCxPQUFPSSxNQUFsQixHQUEyQkMsQ0FBbEM7QUFDRDtBQUVELFNBQUFFLFdBQUEsQ0FBc0JDLFFBQXRCLEVBQWdDQyxRQUFoQyxFQUEwQ0MsSUFBMUMsRUFBOEM7QUFDNUM7QUFDQTtBQUNBQSxTQUFLQyxJQUFMLENBQVUsVUFBVUMsT0FBVixFQUFtQkMsT0FBbkIsRUFBMEI7QUFDbEMsWUFBSUMsS0FBS2hCLGFBQWFjLFFBQVFHLEdBQVIsQ0FBWVQsV0FBWixFQUFiLEVBQXdDRSxRQUF4QyxDQUFUO0FBQ0EsWUFBSVEsS0FBS2xCLGFBQWFlLFFBQVFFLEdBQVIsQ0FBWVQsV0FBWixFQUFiLEVBQXdDRSxRQUF4QyxDQUFUO0FBQ0EsZUFBT00sS0FBS0UsRUFBWjtBQUNELEtBSkQ7QUFLQTtBQUNBO0FBQ0EsUUFBSUMsT0FBT25CLGFBQWFZLEtBQUssQ0FBTCxFQUFRSyxHQUFSLENBQVlULFdBQVosRUFBYixFQUF3Q0UsUUFBeEMsQ0FBWDtBQUNBaEIsYUFBUyxjQUFjeUIsSUFBZCxHQUFxQixNQUFyQixHQUE4QkEsT0FBT1QsU0FBU0osTUFBOUMsR0FBdUQsR0FBdkQsR0FBNkRJLFFBQXRFO0FBQ0EsUUFBSVMsT0FBTyxHQUFYLEVBQWdCO0FBQ2QsWUFBSUMsS0FBVzlCLE9BQVErQixNQUFSLENBQWUsRUFBZixFQUFtQlYsUUFBbkIsQ0FBZjtBQUNBLFlBQUlXLEVBQUo7QUFDQUYsV0FBR0csT0FBSCxHQUFtQmpDLE9BQVErQixNQUFSLENBQWUsRUFBZixFQUFtQkQsR0FBR0csT0FBdEIsQ0FBbkI7QUFDQUQsYUFBS0YsRUFBTDtBQUNBRSxXQUFHQyxPQUFILEdBQW1CakMsT0FBUStCLE1BQVIsQ0FBZUQsR0FBR0csT0FBbEIsRUFBMkJYLEtBQUssQ0FBTCxFQUFRVyxPQUFuQyxDQUFuQjtBQUNBLGVBQU9ELEVBQVA7QUFDRDtBQUNELFdBQU8sSUFBUDtBQUNEO0FBRUQ7Ozs7QUFJQSxTQUFBRSxjQUFBLENBQXlCQyxlQUF6QixFQUEwQ2QsUUFBMUMsRUFBa0Q7QUFDaEQsV0FBT0YsWUFBWWdCLGVBQVosRUFBNkJkLFFBQTdCLEVBQXVDYixVQUF2QyxDQUFQO0FBQ0Q7QUFFRCxTQUFBNEIsVUFBQSxDQUFxQmhCLFFBQXJCLEVBQStCQyxRQUEvQixFQUF1QztBQUNyQyxXQUFPRixZQUFZQyxRQUFaLEVBQXNCQyxRQUF0QixFQUFnQ1osTUFBaEMsQ0FBUDtBQUNEO0FBRUQsSUFBSTRCLHFCQUFxQixDQUN2QjtBQUNFSixhQUFTO0FBQ1BLLGtCQUFVLEtBREg7QUFFUEMsZ0JBQVEsV0FGRDtBQUdQQyxvQkFBWSxTQUhMO0FBSVBDLHdCQUFnQjtBQUpULEtBRFg7QUFPRUMsWUFBUTtBQUNOQyxjQUFNLEtBREE7QUFFTkMsaUJBQVM7QUFGSDtBQVBWLENBRHVCLEVBYXZCO0FBQ0VYLGFBQVM7QUFDUEssa0JBQVUsS0FESDtBQUVQQyxnQkFBUSxXQUZEO0FBR1BDLG9CQUFZLFNBSEw7QUFJUEMsd0JBQWdCO0FBSlQsS0FEWDtBQU9FQyxZQUFRO0FBQ05DLGNBQU0sS0FEQTtBQUVOQyxpQkFBUztBQUZIO0FBUFYsQ0FidUIsRUF5QnZCO0FBQ0VYLGFBQVM7QUFDUEssa0JBQVUsS0FESDtBQUVQQyxnQkFBUSxXQUZEO0FBR1BDLG9CQUFZLFNBSEw7QUFJUEMsd0JBQWdCO0FBSlQsS0FEWDtBQU9FQyxZQUFRO0FBQ05DLGNBQU0sS0FEQTtBQUVOQyxpQkFBUztBQUZIO0FBUFYsQ0F6QnVCLEVBcUN2QjtBQUNFWCxhQUFTO0FBQ1BLLGtCQUFVLEtBREg7QUFFUEMsZ0JBQVEsV0FGRDtBQUdQQyxvQkFBWSxTQUhMO0FBSVBDLHdCQUFnQjtBQUpULEtBRFg7QUFPRUMsWUFBUTtBQUNOQyxjQUFNLEtBREE7QUFFTkMsaUJBQVM7QUFGSDtBQVBWLENBckN1QixFQWlEdkI7QUFDRVgsYUFBUztBQUNQSyxrQkFBVSxLQURIO0FBRVBDLGdCQUFRLEtBRkQ7QUFHUE0sOEJBQXNCLGVBSGY7QUFJUEosd0JBQWdCLElBSlQ7QUFLUEQsb0JBQVksU0FMTDtBQU1QTSxjQUFNO0FBTkMsS0FEWDtBQVNFSixZQUFRO0FBQ05DLGNBQU0sS0FEQTtBQUVOQyxpQkFBUztBQUZIO0FBVFYsQ0FqRHVCLEVBK0R2QjtBQUNFWCxhQUFTO0FBQ1BZLDhCQUFzQixNQURmO0FBRVBKLHdCQUFnQlA7QUFGVCxLQURYO0FBS0VRLFlBQVE7QUFDTkMsY0FBTSxLQURBO0FBRU5DLGlCQUFTO0FBRkg7QUFMVixDQS9EdUIsRUF5RXRCO0FBQ0NYLGFBQVM7QUFDUFksOEJBQXNCLFdBRGY7QUFFUEosd0JBQWdCUDtBQUZULEtBRFY7QUFLQ1EsWUFBUTtBQUNOQyxjQUFNLEtBREE7QUFFTkMsaUJBQVM7QUFGSDtBQUxULENBekVzQixFQW1GdkI7QUFDRVgsYUFBUztBQUNQWSw4QkFBc0IsTUFEZjtBQUVQSix3QkFBZ0JMO0FBRlQsS0FEWDtBQUtFTSxZQUFRO0FBQ05DLGNBQU0sS0FEQTtBQUVOQyxpQkFBUztBQUZIO0FBTFYsQ0FuRnVCLEVBNkZ2QjtBQUNFWCxhQUFTO0FBQ1BLLGtCQUFVO0FBREgsS0FEWDtBQUlFSSxZQUFRO0FBQ05DLGNBQU0sS0FEQTtBQUVOQyxpQkFBUztBQUZIO0FBSlYsQ0E3RnVCLENBQXpCO0FBd0dBO0FBQ0E7QUFDQTtBQUVBLFNBQUFHLFlBQUEsQ0FBdUJDLEdBQXZCLEVBQTBCO0FBQ3hCLFFBQUlDLE1BQ0osc0ZBQXNGRCxHQUF0RixHQUE0RixHQUQ1RjtBQUVBM0Msb0JBQUE2QyxJQUFBLENBQUtELEdBQUwsRUFBVSxVQUFVRSxLQUFWLEVBQWlCQyxNQUFqQixFQUF5QkMsTUFBekIsRUFBK0I7QUFDdkMsWUFBSUYsS0FBSixFQUFXO0FBQ1RHLG9CQUFRSCxLQUFSLENBQWMsaUJBQWVBLEtBQTdCO0FBQ0E7QUFDRDtBQUNEL0MsaUJBQVMsYUFBV2dELE1BQXBCO0FBQ0FoRCxpQkFBUyxhQUFXaUQsTUFBcEI7QUFDRCxLQVBEO0FBUUQ7QUFFRDtBQUVBO0FBRUEsU0FBQUUscUJBQUEsQ0FBZ0NDLG9CQUFoQyxFQUFvRDtBQUNsRCxRQUFJQyxNQUFNRCxxQkFBcUJkLE1BQXJCLENBQTRCRSxPQUF0QztBQUNBYSxVQUFNbkQsYUFBYW9ELGNBQWIsQ0FBNEJGLHFCQUFxQnZCLE9BQWpELEVBQTBEd0IsR0FBMUQsQ0FBTjtBQUNKOzs7Ozs7QUFNSSxXQUFPQSxHQUFQO0FBQ0Q7QUFFRCxTQUFBRSxjQUFBLENBQWdDSCxvQkFBaEMsRUFBb0Q7QUFDbEQsUUFBSUEscUJBQXFCZCxNQUFyQixDQUE0QkMsSUFBNUIsS0FBcUMsS0FBekMsRUFBZ0Q7QUFDOUMsWUFBSWMsTUFBTUYsc0JBQXNCQyxvQkFBdEIsQ0FBVjtBQUNBVCxxQkFBYVUsR0FBYjtBQUNBLGVBQU9BLEdBQVA7QUFDRCxLQUpELE1BSU87QUFDTCxZQUFJRyxJQUFLLDZCQUE2QkoscUJBQXFCZCxNQUFyQixDQUE0QkMsSUFBekQsR0FBZ0UsVUFBaEUsR0FBNkVhLHFCQUFxQkssS0FBbEcsR0FBMEcsR0FBbkg7QUFDQXpELGlCQUFTd0QsQ0FBVDtBQUNBLGVBQU9BLENBQVA7QUFDRDtBQUNGO0FBVkRFLFFBQUFILGNBQUEsR0FBQUEsY0FBQTtBQVlBLFNBQUFJLFNBQUEsQ0FBb0JDLE9BQXBCLEVBQTZCM0MsUUFBN0IsRUFBcUM7QUFDbkMsV0FBT3JCLE9BQU9pRSxJQUFQLENBQVlELE9BQVosRUFBcUJFLE1BQXJCLENBQTRCLFVBQVVDLElBQVYsRUFBZ0J4QyxHQUFoQixFQUFtQjtBQUNwRCxZQUFJM0IsT0FBT29FLFNBQVAsQ0FBaUJDLGNBQWpCLENBQWdDQyxJQUFoQyxDQUFxQ2pELFFBQXJDLEVBQStDTSxHQUEvQyxDQUFKLEVBQXlEO0FBQ3ZEd0MsbUJBQU9BLE9BQU8sQ0FBZDtBQUNEO0FBQ0QsZUFBT0EsSUFBUDtBQUNELEtBTE0sRUFLSixDQUxJLENBQVA7QUFNRDtBQUVELFNBQUFJLFdBQUEsQ0FBc0JQLE9BQXRCLEVBQStCM0MsUUFBL0IsRUFBdUM7QUFDckMsUUFBSW1ELFdBQVd4RSxPQUFPaUUsSUFBUCxDQUFZRCxPQUFaLEVBQXFCRSxNQUFyQixDQUE0QixVQUFVQyxJQUFWLEVBQWdCeEMsR0FBaEIsRUFBbUI7QUFDNUQsWUFBSSxDQUFDM0IsT0FBT29FLFNBQVAsQ0FBaUJDLGNBQWpCLENBQWdDQyxJQUFoQyxDQUFxQ2pELFFBQXJDLEVBQStDTSxHQUEvQyxDQUFMLEVBQTBEO0FBQ3hEd0MsbUJBQU9BLE9BQU8sQ0FBZDtBQUNEO0FBQ0QsZUFBT0EsSUFBUDtBQUNELEtBTGMsRUFLWixDQUxZLENBQWY7QUFNQSxRQUFJTSxXQUFXekUsT0FBT2lFLElBQVAsQ0FBWTVDLFFBQVosRUFBc0I2QyxNQUF0QixDQUE2QixVQUFVQyxJQUFWLEVBQWdCeEMsR0FBaEIsRUFBbUI7QUFDN0QsWUFBSSxDQUFDM0IsT0FBT29FLFNBQVAsQ0FBaUJDLGNBQWpCLENBQWdDQyxJQUFoQyxDQUFxQ04sT0FBckMsRUFBOENyQyxHQUE5QyxDQUFMLEVBQXlEO0FBQ3ZEd0MsbUJBQU9BLE9BQU8sQ0FBZDtBQUNEO0FBQ0QsZUFBT0EsSUFBUDtBQUNELEtBTGMsRUFLWixDQUxZLENBQWY7QUFNQSxXQUFPSyxXQUFXQyxRQUFsQjtBQUNEO0FBRUQsU0FBQUMsVUFBQSxDQUFxQkMsRUFBckIsRUFBa0NDLEVBQWxDLEVBQW9FQyxPQUFwRSxFQUEyRTtBQUN6RSxXQUFPRixPQUFPQyxFQUFQLElBQ0pELE9BQU9HLFNBQVAsSUFBb0JGLE9BQU8sSUFEdkIsSUFFSEEsY0FBY0csTUFBZixJQUEwQkgsR0FBRzFCLElBQUgsQ0FBUXlCLEVBQVIsTUFBZ0IsSUFGdEMsSUFHSCxPQUFPQyxFQUFQLEtBQWMsVUFBZCxJQUE0QkQsRUFBN0IsSUFBb0NDLEdBQUdELEVBQUgsRUFBT0UsT0FBUCxDQUh2QztBQUlEO0FBRUQsU0FBQUcsZUFBQSxDQUEwQkwsRUFBMUIsRUFBdUNDLEVBQXZDLEVBQXdFQyxPQUF4RSxFQUErRTtBQUM3RSxRQUFJRixPQUFPRyxTQUFQLElBQW9CRixPQUFPRSxTQUEvQixFQUEwQztBQUN4QyxlQUFPLElBQVA7QUFDRDtBQUNELFFBQUlGLE9BQU9FLFNBQVgsRUFBc0I7QUFDcEIsZUFBTyxJQUFQO0FBQ0Q7QUFFRCxXQUFPSCxPQUFPQyxFQUFQLElBQ0hBLGNBQWNHLE1BQWYsSUFBMEJILEdBQUcxQixJQUFILENBQVF5QixFQUFSLE1BQWdCLElBRHRDLElBRUgsT0FBT0MsRUFBUCxLQUFjLFVBQWQsSUFBNEJELEVBQTdCLElBQW9DQyxHQUFHRCxFQUFILEVBQU9FLE9BQVAsQ0FGdkM7QUFHRDtBQUVELFNBQUFJLG1CQUFBLENBQThCNUQsUUFBOUIsRUFBd0M2RCxXQUF4QyxFQUFtRDtBQUNqRCxRQUFJQyxTQUFKO0FBQ0FuRixXQUFPaUUsSUFBUCxDQUFZNUMsUUFBWixFQUFzQitELE9BQXRCLENBQThCLFVBQVVDLElBQVYsRUFBYztBQUMxQyxZQUFJaEUsU0FBU2dFLElBQVQsTUFBbUIsSUFBdkIsRUFBNkI7QUFDM0JoRSxxQkFBU2dFLElBQVQsSUFBaUJQLFNBQWpCO0FBQ0Q7QUFDRixLQUpEO0FBS0E7QUFHQUssZ0JBQVlELFlBQVlJLE1BQVosQ0FBbUIsVUFBVUMsV0FBVixFQUFxQjtBQUNsRDtBQUNBO0FBQ0E7QUFDQTtBQUVBLGVBQU9iLFdBQVdhLFlBQVl0RCxPQUFaLENBQW9CSyxRQUEvQixFQUF5Q2pCLFNBQVNpQixRQUFsRCxFQUE0RGpCLFFBQTVELEtBQ0xxRCxXQUFXckQsU0FBU3lCLElBQXBCLEVBQTBCeUMsWUFBWXRELE9BQVosQ0FBb0JhLElBQTlDLEVBQW9EekIsUUFBcEQsQ0FESyxJQUVMcUQsV0FBV3JELFNBQVNrQixNQUFwQixFQUE0QmdELFlBQVl0RCxPQUFaLENBQW9CTSxNQUFoRCxFQUF3RGxCLFFBQXhELENBRkssSUFHTDJELGdCQUFnQjNELFNBQVN3QixvQkFBekIsRUFBK0MwQyxZQUFZdEQsT0FBWixDQUFvQlksb0JBQW5FLEVBQXlGeEIsUUFBekYsQ0FISyxJQUlMMkQsZ0JBQWdCM0QsU0FBU29CLGNBQXpCLEVBQXlDOEMsWUFBWXRELE9BQVosQ0FBb0JRLGNBQTdELEVBQTZFcEIsUUFBN0UsQ0FKRjtBQUtGO0FBQ0MsS0FaVyxDQUFaO0FBYUE7QUFDQTtBQUNBOEQsY0FBVTVELElBQVYsQ0FBZSxVQUFVTixDQUFWLEVBQWF1RSxDQUFiLEVBQWM7QUFDM0IsWUFBSUMsYUFBYTFCLFVBQVU5QyxFQUFFZ0IsT0FBWixFQUFxQlosUUFBckIsQ0FBakI7QUFDQSxZQUFJcUUsYUFBYTNCLFVBQVV5QixFQUFFdkQsT0FBWixFQUFxQlosUUFBckIsQ0FBakI7QUFDQSxZQUFJc0UsZUFBZXBCLFlBQVl0RCxFQUFFZ0IsT0FBZCxFQUF1QlosUUFBdkIsQ0FBbkI7QUFDQSxZQUFJdUUsZUFBZXJCLFlBQVlpQixFQUFFdkQsT0FBZCxFQUF1QlosUUFBdkIsQ0FBbkI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxZQUFJd0UsTUFBTSxFQUFFSixhQUFhQyxVQUFmLElBQTZCLEdBQTdCLElBQW9DQyxlQUFlQyxZQUFuRCxDQUFWO0FBQ0E7QUFDQSxlQUFPQyxHQUFQO0FBQ0QsS0FYRDtBQVlBLFFBQUlWLFVBQVVuRSxNQUFWLEtBQXFCLENBQXpCLEVBQTRCO0FBQzFCWixpQkFBUyw4QkFBOEIwRixLQUFLQyxTQUFMLENBQWUxRSxRQUFmLENBQXZDO0FBQ0Q7QUFDRDtBQUNBLFFBQUk4RCxVQUFVLENBQVYsQ0FBSixFQUFrQjtBQUNoQjtBQUVBLFlBQUlhLFNBQVNiLFVBQVUsQ0FBVixDQUFiO0FBRUEsWUFBSWMsVUFBVTtBQUNaaEUscUJBQVM7QUFERyxTQUFkO0FBS0FnRSxnQkFBUWhFLE9BQVIsR0FBa0JsQyxVQUFVZ0MsTUFBVixDQUFpQixFQUFqQixFQUFxQmtFLFFBQVFoRSxPQUE3QixFQUFzQ2tELFVBQVUsQ0FBVixFQUFhbEQsT0FBbkQsRUFBNERaLFFBQTVELENBQWxCO0FBQ0E0RSxrQkFBVWxHLFVBQVVnQyxNQUFWLENBQWlCa0UsT0FBakIsRUFBMEI7QUFDbEN2RCxvQkFBUXlDLFVBQVUsQ0FBVixFQUFhekM7QUFEYSxTQUExQixDQUFWO0FBSUExQyxlQUFPaUUsSUFBUCxDQUFZK0IsT0FBTy9ELE9BQW5CLEVBQTRCbUQsT0FBNUIsQ0FBb0MsVUFBVUMsSUFBVixFQUFjO0FBQ2hELGdCQUFJLE9BQU9XLE9BQU8vRCxPQUFQLENBQWVvRCxJQUFmLENBQVAsS0FBZ0MsVUFBcEMsRUFBZ0Q7QUFDOUNqRix5QkFBUyx1QkFBdUJpRixJQUF2QixHQUE4QixLQUE5QixHQUFzQ2hFLFNBQVNnRSxJQUFULENBQS9DO0FBQ0FZLDBCQUFVRCxPQUFPL0QsT0FBUCxDQUFlb0QsSUFBZixFQUFxQmhFLFNBQVNnRSxJQUFULENBQXJCLEVBQXFDWSxPQUFyQyxDQUFWO0FBQ0Q7QUFDRixTQUxEO0FBT0EsZUFBT0EsT0FBUDtBQUNEO0FBQ0QsV0FBTyxJQUFQO0FBQ0Q7QUFHSCxJQUFBQyxjQUFBaEcsUUFBQSxlQUFBLENBQUE7QUFFRSxTQUFBaUcsZ0JBQUEsQ0FBMkI5RSxRQUEzQixFQUFxQ2dCLGtCQUFyQyxFQUF1RDtBQUNyRHJDLFdBQU9pRSxJQUFQLENBQVk1QyxRQUFaLEVBQXNCK0QsT0FBdEIsQ0FBOEIsVUFBVUMsSUFBVixFQUFjO0FBQzFDLFlBQUloRSxTQUFTZ0UsSUFBVCxNQUFtQixJQUF2QixFQUE2QjtBQUMzQixtQkFBT2hFLFNBQVNnRSxJQUFULENBQVA7QUFDRDtBQUNGLEtBSkQ7QUFLQSxRQUFJUSxNQUFNSyxZQUFZRSxtQkFBWixDQUFnQy9FLFFBQWhDLENBQVY7QUFDQSxRQUFJLENBQUN3RSxHQUFMLEVBQVU7QUFDUixlQUFPZixTQUFQO0FBQ0Q7QUFDRDFFLGFBQVMsMEJBQTBCMEYsS0FBS0MsU0FBTCxDQUFlRixHQUFmLEVBQW9CZixTQUFwQixFQUErQixDQUEvQixDQUFuQztBQUNBLFdBQU9HLG9CQUFvQlksR0FBcEIsRUFBd0J4RCxrQkFBeEIsQ0FBUDtBQUNEO0FBRUQsU0FBQWdFLGNBQUEsQ0FBeUJ4QixPQUF6QixFQUFnQztBQUM5QixRQUFJeUIsU0FBU0gsaUJBQWlCdEIsT0FBakIsRUFBMEJ4QyxrQkFBMUIsQ0FBYjtBQUNBLFFBQUlpRSxNQUFKLEVBQVk7QUFDVixlQUFPM0MsZUFBZTJDLE1BQWYsQ0FBUDtBQUNEO0FBQ0QsV0FBTyxJQUFQO0FBQ0Q7QUFFRDtBQUVheEMsUUFBQXlDLFVBQUEsR0FBYTtBQUN4QkYsb0JBQWdCQSxjQURRO0FBRXhCRyxXQUFPO0FBQ0w5QixvQkFBWUEsVUFEUDtBQUVMWCxtQkFBV0EsU0FGTjtBQUdMUSxxQkFBYUEsV0FIUjtBQUlMaEIsK0JBQXVCQSxxQkFKbEI7QUFLTDRDLDBCQUFrQkEsZ0JBTGI7QUFNTGpFLHdCQUFnQkEsY0FOWDtBQU9MeEIsc0JBQWNBLFlBUFQ7QUFRTCtGLDZCQUFxQnBFO0FBUmhCO0FBRmlCLENBQWI7QUFjYjtBQUVBIiwiZmlsZSI6Im1hdGNoL2Rpc3BhdGNoZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQGZpbGVcclxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuZGlzcGF0Y2hlclxyXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXHJcbiAqL1xyXG5cclxuXHJcbi8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2xpYi9ub2RlLTQuZC50c1wiIC8+XHJcblxyXG5kZWNsYXJlIGludGVyZmFjZSBPYmplY3RDb25zdHJ1Y3RvciB7XHJcbiAgICBhc3NpZ24odGFyZ2V0OiBhbnksIC4uLnNvdXJjZXM6IGFueVtdKTogYW55O1xyXG59XHJcblxyXG52YXIgQW55T2JqZWN0ID0gKDxhbnk+T2JqZWN0KTtcclxuXHJcbmltcG9ydCAqIGFzIGRpc3RhbmNlIGZyb20gJy4uL3V0aWxzL2RhbWVyYXVMZXZlbnNodGVpbic7XHJcblxyXG5pbXBvcnQgKiBhcyBkZWJ1ZyBmcm9tICdkZWJ1Zyc7XHJcbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ2Rpc3BhdGNoZXInKVxyXG5cclxuaW1wb3J0IHsgZXhlYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xyXG4vLyAgdmFyIGV4ZWMgPSByZXF1aXJlKCdjaGlsZF9wcm9jZXNzJykuZXhlY1xyXG4vLyAgdmFyIGxldmVuID0gcmVxdWlyZSgnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluLmpzJykubGV2ZW5zaHRlaW5cclxuXHJcbmltcG9ydCAqIGFzIGV4ZWN0ZW1wbGF0ZSBmcm9tICcuLi9leGVjL2V4ZWN0ZW1wbGF0ZSc7XHJcblxyXG4gIC8vdmFyIGxldmVuID0gcmVxdWlyZSgnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluLmpzJylcclxuaW1wb3J0ICogYXMgbWF0Y2hkYXRhIGZyb20gJy4vbWF0Y2hkYXRhJztcclxuXHJcbmNvbnN0IG9Vbml0VGVzdHMgPSBtYXRjaGRhdGEub1VuaXRUZXN0c1xyXG5jb25zdCBvV2lraXMgPSBtYXRjaGRhdGEub1dpa2lzXHJcblxyXG4gIGZ1bmN0aW9uIGNhbGNEaXN0YW5jZSAoc1RleHQxLCBzVGV4dDIpIHtcclxuICAgIGRlYnVnbG9nKFwibGVuZ3RoMlwiICsgc1RleHQxICsgXCIgLSBcIiArIHNUZXh0MilcclxuICAgIHZhciBhMCA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCksIHNUZXh0MilcclxuICAgIHZhciBhID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnRvTG93ZXJDYXNlKCksIHNUZXh0MilcclxuICAgIHJldHVybiBhMCAqIDUwMCAvIHNUZXh0Mi5sZW5ndGggKyBhXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBmbkZpbmRNYXRjaCAoc0tleXdvcmQsIG9Db250ZXh0LCBvTWFwKSB7XHJcbiAgICAvLyByZXR1cm4gYSBiZXR0ZXIgY29udGV4dCBpZiB0aGVyZSBpcyBhIG1hdGNoXHJcbiAgICAvLyBzS2V5d29yZCA9IHNLZXl3b3JkLnRvTG93ZXJDYXNlKCk7XHJcbiAgICBvTWFwLnNvcnQoZnVuY3Rpb24gKG9FbnRyeTEsIG9FbnRyeTIpIHtcclxuICAgICAgdmFyIHUxID0gY2FsY0Rpc3RhbmNlKG9FbnRyeTEua2V5LnRvTG93ZXJDYXNlKCksIHNLZXl3b3JkKVxyXG4gICAgICB2YXIgdTIgPSBjYWxjRGlzdGFuY2Uob0VudHJ5Mi5rZXkudG9Mb3dlckNhc2UoKSwgc0tleXdvcmQpXHJcbiAgICAgIHJldHVybiB1MSAtIHUyXHJcbiAgICB9KVxyXG4gICAgLy8gbGF0ZXI6IGluIGNhc2Ugb2YgY29uZmxpY3RzLCBhc2ssXHJcbiAgICAvLyBub3c6XHJcbiAgICB2YXIgZGlzdCA9IGNhbGNEaXN0YW5jZShvTWFwWzBdLmtleS50b0xvd2VyQ2FzZSgpLCBzS2V5d29yZClcclxuICAgIGRlYnVnbG9nKCdiZXN0IGRpc3QnICsgZGlzdCArICcgLyAgJyArIGRpc3QgKiBzS2V5d29yZC5sZW5ndGggKyAnICcgKyBzS2V5d29yZClcclxuICAgIGlmIChkaXN0IDwgMTUwKSB7XHJcbiAgICAgIHZhciBvMSA9ICg8YW55Pk9iamVjdCkuYXNzaWduKHt9LCBvQ29udGV4dClcclxuICAgICAgdmFyIG8yXHJcbiAgICAgIG8xLmNvbnRleHQgPSAoPGFueT5PYmplY3QpLmFzc2lnbih7fSwgbzEuY29udGV4dClcclxuICAgICAgbzIgPSBvMVxyXG4gICAgICBvMi5jb250ZXh0ID0gKDxhbnk+T2JqZWN0KS5hc3NpZ24obzEuY29udGV4dCwgb01hcFswXS5jb250ZXh0KVxyXG4gICAgICByZXR1cm4gbzJcclxuICAgIH1cclxuICAgIHJldHVybiBudWxsXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBhIGZ1bmN0aW9uIHRvIG1hdGNoIGEgdW5pdCB0ZXN0IHVzaW5nIGxldmVuc2h0ZWluIGRpc3RhbmNlc1xyXG4gICAqIEBwdWJsaWNcclxuICAgKi9cclxuICBmdW5jdGlvbiBmbkZpbmRVbml0VGVzdCAoc3N5c3RlbU9iamVjdElkLCBvQ29udGV4dCkge1xyXG4gICAgcmV0dXJuIGZuRmluZE1hdGNoKHNzeXN0ZW1PYmplY3RJZCwgb0NvbnRleHQsIG9Vbml0VGVzdHMpXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBmbkZpbmRXaWtpIChzS2V5d29yZCwgb0NvbnRleHQpIHtcclxuICAgIHJldHVybiBmbkZpbmRNYXRjaChzS2V5d29yZCwgb0NvbnRleHQsIG9XaWtpcylcclxuICB9XHJcblxyXG4gIHZhciBhU2hvd0VudGl0eUFjdGlvbnMgPSBbXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1JZDogJ3V2MicsXHJcbiAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXHJcbiAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwJ1xyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdXYyLndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS91aTIvdXNoZWxsL3NoZWxscy9hYmFwL0Zpb3JpTGF1bmNocGFkLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbUlkOiAndXYyJyxcclxuICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcclxuICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHBkJ1xyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdXYyLndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS9zYXAvYXJzcnZjX3VwYl9hZG1uL21haW4uaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtSWQ6ICd1MXknLFxyXG4gICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxyXG4gICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscCdcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXUxeS53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvdWkyL3VzaGVsbC9zaGVsbHMvYWJhcC9GaW9yaUxhdW5jaHBhZC5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1JZDogJ3UxeScsXHJcbiAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXHJcbiAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwZCdcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXUxeS53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvc2FwL2Fyc3J2Y191cGJfYWRtbi9tYWluLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbUlkOiAndXYyJyxcclxuICAgICAgICBjbGllbnQ6ICcxMjAnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAnZmlvcmkgY2F0YWxvZycsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IC8uKi8sXHJcbiAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxyXG4gICAgICAgIHRvb2w6ICdGTFBEJ1xyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdXYyLndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS9zYXAvYXJzcnZjX3VwYl9hZG1uL21haW4uaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9I0NBVEFMT0c6e3N5c3RlbU9iamVjdElkfSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAndW5pdCcsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IGZuRmluZFVuaXRUZXN0XHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwOi8vbG9jYWxob3N0OjgwODAve3BhdGh9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAndW5pdCB0ZXN0JyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogZm5GaW5kVW5pdFRlc3RcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MC97cGF0aH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ3dpa2knLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiBmbkZpbmRXaWtpXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL3dpa2kud2RmLnNhcC5jb3JwL3twYXRofSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbUlkOiAnSklSQSdcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vamlyYS53ZGYuc2FwLmNvcnA6ODA4MC9USVBDT1JFVUlJSSdcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIF1cclxuXHJcbiAgLy8gaWYgVE9PTCA9IEpJUkEgfHwgU3lzdGVtSWQgPSBKSVJBIC0+IFN5c3RlbUlkID0gSklSQVxyXG4gIC8vXHJcbiAgLy9cclxuXHJcbiAgZnVuY3Rpb24gc3RhcnRCcm93c2VyICh1cmwpIHtcclxuICAgIHZhciBjbWQgPVxyXG4gICAgJ1wiJVByb2dyYW1GaWxlcyh4ODYpJVxcXFxHb29nbGVcXFxcQ2hyb21lXFxcXEFwcGxpY2F0aW9uXFxcXGNocm9tZS5leGVcIiAtLWluY29nbml0byAtdXJsIFwiJyArIHVybCArICdcIidcclxuICAgIGV4ZWMoY21kLCBmdW5jdGlvbiAoZXJyb3IsIHN0ZG91dCwgc3RkZXJyKSB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYGV4ZWMgZXJyb3I6ICR7ZXJyb3J9YClcclxuICAgICAgICByZXR1cm5cclxuICAgICAgfVxyXG4gICAgICBkZWJ1Z2xvZyhgc3Rkb3V0OiAke3N0ZG91dH1gKVxyXG4gICAgICBkZWJ1Z2xvZyhgc3RkZXJyOiAke3N0ZGVycn1gKVxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIC8vIHN0YXJ0U0FQR1VJXHJcblxyXG4gIC8vICAgTjpcXD5cImM6XFxQcm9ncmFtIEZpbGVzICh4ODYpXFxTQVBcXEZyb250RW5kXFxTQVBndWlcIlxcc2Fwc2hjdXQuZXhlICAtc3lzdGVtPVVWMiAtY2xpZW50PTEyMCAtY29tbWFuZD1TRTM4IC10eXBlPVRyYW5zYWN0aW9uIC11c2VyPUFVU0VSXHJcblxyXG4gIGZ1bmN0aW9uIGV4cGFuZFBhcmFtZXRlcnNJblVSTCAob01lcmdlZENvbnRleHRSZXN1bHQpIHtcclxuICAgIHZhciBwdG4gPSBvTWVyZ2VkQ29udGV4dFJlc3VsdC5yZXN1bHQucGF0dGVyblxyXG4gICAgcHRuID0gZXhlY3RlbXBsYXRlLmV4cGFuZFRlbXBsYXRlKG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHQsIHB0bik7XHJcbi8qICAgIE9iamVjdC5rZXlzKG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcclxuICAgICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cCgneycgKyBzS2V5ICsgJ30nLCAnZycpXHJcbiAgICAgIHB0biA9IHB0bi5yZXBsYWNlKHJlZ2V4LCBvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0W3NLZXldKVxyXG4gICAgICBwdG4gPSBwdG4ucmVwbGFjZShyZWdleCwgb01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dFtzS2V5XSlcclxuICAgIH0pXHJcbiAgICAqL1xyXG4gICAgcmV0dXJuIHB0blxyXG4gIH1cclxuXHJcbiAgZXhwb3J0IGZ1bmN0aW9uIGV4ZWN1dGVTdGFydHVwIChvTWVyZ2VkQ29udGV4dFJlc3VsdCkge1xyXG4gICAgaWYgKG9NZXJnZWRDb250ZXh0UmVzdWx0LnJlc3VsdC50eXBlID09PSAnVVJMJykge1xyXG4gICAgICB2YXIgcHRuID0gZXhwYW5kUGFyYW1ldGVyc0luVVJMKG9NZXJnZWRDb250ZXh0UmVzdWx0KVxyXG4gICAgICBzdGFydEJyb3dzZXIocHRuKVxyXG4gICAgICByZXR1cm4gcHRuXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB2YXIgcyA9IChcIkRvbid0IGtub3cgaG93IHRvIHN0YXJ0IFwiICsgb01lcmdlZENvbnRleHRSZXN1bHQucmVzdWx0LnR5cGUgKyAnXFxuIGZvciBcIicgKyBvTWVyZ2VkQ29udGV4dFJlc3VsdC5xdWVyeSArICdcIicpXHJcbiAgICAgIGRlYnVnbG9nKHMpXHJcbiAgICAgIHJldHVybiBzXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBuck1hdGNoZXMgKGFPYmplY3QsIG9Db250ZXh0KSB7XHJcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoYU9iamVjdCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQ29udGV4dCwga2V5KSkge1xyXG4gICAgICAgIHByZXYgPSBwcmV2ICsgMVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBwcmV2XHJcbiAgICB9LCAwKVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gbnJOb01hdGNoZXMgKGFPYmplY3QsIG9Db250ZXh0KSB7XHJcbiAgICB2YXIgbm9NYXRjaEEgPSBPYmplY3Qua2V5cyhhT2JqZWN0KS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xyXG4gICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQ29udGV4dCwga2V5KSkge1xyXG4gICAgICAgIHByZXYgPSBwcmV2ICsgMVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBwcmV2XHJcbiAgICB9LCAwKVxyXG4gICAgdmFyIG5vTWF0Y2hCID0gT2JqZWN0LmtleXMob0NvbnRleHQpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XHJcbiAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGFPYmplY3QsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIDFcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldlxyXG4gICAgfSwgMClcclxuICAgIHJldHVybiBub01hdGNoQSArIG5vTWF0Y2hCXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBzYW1lT3JTdGFyIChzMSA6IHN0cmluZywgczIgOiBzdHJpbmcgfCBSZWdFeHAgfCBGdW5jdGlvbiAsIG9FbnRpdHkpIHtcclxuICAgIHJldHVybiBzMSA9PT0gczIgfHxcclxuICAgICAgKHMxID09PSB1bmRlZmluZWQgJiYgczIgPT09IG51bGwpIHx8XHJcbiAgICAgICgoczIgaW5zdGFuY2VvZiBSZWdFeHApICYmIHMyLmV4ZWMoczEpICE9PSBudWxsKSB8fFxyXG4gICAgICAoKHR5cGVvZiBzMiA9PT0gJ2Z1bmN0aW9uJyAmJiBzMSkgJiYgczIoczEsIG9FbnRpdHkpKVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gc2FtZU9yU3RhckVtcHR5IChzMSA6IHN0cmluZywgczIgOiBzdHJpbmcgfCBSZWdFeHAgfCBGdW5jdGlvbiwgb0VudGl0eSkge1xyXG4gICAgaWYgKHMxID09PSB1bmRlZmluZWQgJiYgczIgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgfVxyXG4gICAgaWYgKHMyID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgcmV0dXJuIHRydWVcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gczEgPT09IHMyIHx8XHJcbiAgICAgICgoczIgaW5zdGFuY2VvZiBSZWdFeHApICYmIHMyLmV4ZWMoczEpICE9PSBudWxsKSB8fFxyXG4gICAgICAoKHR5cGVvZiBzMiA9PT0gJ2Z1bmN0aW9uJyAmJiBzMSkgJiYgczIoczEsIG9FbnRpdHkpKVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZmlsdGVyU2hvd0VudGl0eU9sZCAob0NvbnRleHQsIGFTaG93RW50aXR5KSB7XHJcbiAgICB2YXIgYUZpbHRlcmVkXHJcbiAgICBPYmplY3Qua2V5cyhvQ29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xyXG4gICAgICBpZiAob0NvbnRleHRbc0tleV0gPT09IG51bGwpIHtcclxuICAgICAgICBvQ29udGV4dFtzS2V5XSA9IHVuZGVmaW5lZFxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gICAgLy8gZmlsdGVyIGNvbnRleHQsIGFtZW5kaW5nIHN5bm9ueW1zXHJcblxyXG5cclxuICAgIGFGaWx0ZXJlZCA9IGFTaG93RW50aXR5LmZpbHRlcihmdW5jdGlvbiAob1Nob3dFbnRpdHkpIHtcclxuICAgICAgLy8gICAgICAgY29uc29sZS5sb2coXCIuLi5cIilcclxuICAgICAgLy8gICAgICBjb25zb2xlLmxvZyhvU2hvd0VudGl0eS5jb250ZXh0LnRvb2wgKyBcIiBcIiArIG9Db250ZXh0LnRvb2wgKyBcIlxcblwiKVxyXG4gICAgICAvLyAgICAgIGNvbnNvbGUubG9nKG9TaG93RW50aXR5LmNvbnRleHQuY2xpZW50ICsgXCIgXCIgKyBvQ29udGV4dC5jbGllbnQgK1wiOlwiICsgc2FtZU9yU3RhcihvQ29udGV4dC5jbGllbnQsb1Nob3dFbnRpdHkuY29udGV4dC5jbGllbnQpICsgXCJcXG5cIilcclxuICAgICAgLy8gIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KG9TaG93RW50aXR5LmNvbnRleHQpICsgXCJcXG5cIiArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0LmNsaWVudCkgKyBcIlxcblwiKVxyXG5cclxuICAgICAgcmV0dXJuIHNhbWVPclN0YXIob1Nob3dFbnRpdHkuY29udGV4dC5zeXN0ZW1JZCwgb0NvbnRleHQuc3lzdGVtSWQsIG9Db250ZXh0KSAmJlxyXG4gICAgICAgIHNhbWVPclN0YXIob0NvbnRleHQudG9vbCwgb1Nob3dFbnRpdHkuY29udGV4dC50b29sLCBvQ29udGV4dCkgJiZcclxuICAgICAgICBzYW1lT3JTdGFyKG9Db250ZXh0LmNsaWVudCwgb1Nob3dFbnRpdHkuY29udGV4dC5jbGllbnQsIG9Db250ZXh0KSAmJlxyXG4gICAgICAgIHNhbWVPclN0YXJFbXB0eShvQ29udGV4dC5zeXN0ZW1PYmplY3RDYXRlZ29yeSwgb1Nob3dFbnRpdHkuY29udGV4dC5zeXN0ZW1PYmplY3RDYXRlZ29yeSwgb0NvbnRleHQpICYmXHJcbiAgICAgICAgc2FtZU9yU3RhckVtcHR5KG9Db250ZXh0LnN5c3RlbU9iamVjdElkLCBvU2hvd0VudGl0eS5jb250ZXh0LnN5c3RlbU9iamVjdElkLCBvQ29udGV4dClcclxuICAgIC8vICAgICAgJiYgb1Nob3dFbnRpdHkuY29udGV4dC50b29sID09PSBvQ29udGV4dC50b29sXHJcbiAgICB9KVxyXG4gICAgLy8gIGNvbnNvbGUubG9nKGFGaWx0ZXJlZC5sZW5ndGgpXHJcbiAgICAvLyBtYXRjaCBvdGhlciBjb250ZXh0IHBhcmFtZXRlcnNcclxuICAgIGFGaWx0ZXJlZC5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XHJcbiAgICAgIHZhciBuck1hdGNoZXNBID0gbnJNYXRjaGVzKGEuY29udGV4dCwgb0NvbnRleHQpXHJcbiAgICAgIHZhciBuck1hdGNoZXNCID0gbnJNYXRjaGVzKGIuY29udGV4dCwgb0NvbnRleHQpXHJcbiAgICAgIHZhciBuck5vTWF0Y2hlc0EgPSBuck5vTWF0Y2hlcyhhLmNvbnRleHQsIG9Db250ZXh0KVxyXG4gICAgICB2YXIgbnJOb01hdGNoZXNCID0gbnJOb01hdGNoZXMoYi5jb250ZXh0LCBvQ29udGV4dClcclxuICAgICAgLy8gICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhLmNvbnRleHQpKVxyXG4gICAgICAvLyAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGIuY29udGV4dCkpXHJcbiAgICAgIC8vICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkob0NvbnRleHQpKVxyXG4gICAgICB2YXIgcmVzID0gLShuck1hdGNoZXNBIC0gbnJNYXRjaGVzQikgKiAxMDAgKyAobnJOb01hdGNoZXNBIC0gbnJOb01hdGNoZXNCKVxyXG4gICAgICAvLyAgICAgY29uc29sZS5sb2coXCJkaWZmIFwiICsgcmVzKVxyXG4gICAgICByZXR1cm4gcmVzXHJcbiAgICB9KVxyXG4gICAgaWYgKGFGaWx0ZXJlZC5sZW5ndGggPT09IDApIHtcclxuICAgICAgZGVidWdsb2coJ25vIHRhcmdldCBmb3Igc2hvd0VudGl0eSAnICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHQpKVxyXG4gICAgfVxyXG4gICAgLy8gY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYUZpbHRlcmVkLHVuZGVmaW5lZCwyKSlcclxuICAgIGlmIChhRmlsdGVyZWRbMF0pIHtcclxuICAgICAgLy8gZXhlY3V0ZSBhbGwgZnVuY3Rpb25zXHJcblxyXG4gICAgICB2YXIgb01hdGNoID0gYUZpbHRlcmVkWzBdXHJcblxyXG4gICAgICB2YXIgb01lcmdlZCA9IHtcclxuICAgICAgICBjb250ZXh0OiB7XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBvTWVyZ2VkLmNvbnRleHQgPSBBbnlPYmplY3QuYXNzaWduKHt9LCBvTWVyZ2VkLmNvbnRleHQsIGFGaWx0ZXJlZFswXS5jb250ZXh0LCBvQ29udGV4dClcclxuICAgICAgb01lcmdlZCA9IEFueU9iamVjdC5hc3NpZ24ob01lcmdlZCwge1xyXG4gICAgICAgIHJlc3VsdDogYUZpbHRlcmVkWzBdLnJlc3VsdFxyXG4gICAgICB9KVxyXG5cclxuICAgICAgT2JqZWN0LmtleXMob01hdGNoLmNvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcclxuICAgICAgICBpZiAodHlwZW9mIG9NYXRjaC5jb250ZXh0W3NLZXldID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICBkZWJ1Z2xvZygnTm93IHJldHJvZml0dGluZyA6JyArIHNLZXkgKyAnIC0gJyArIG9Db250ZXh0W3NLZXldKVxyXG4gICAgICAgICAgb01lcmdlZCA9IG9NYXRjaC5jb250ZXh0W3NLZXldKG9Db250ZXh0W3NLZXldLCBvTWVyZ2VkKVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuXHJcbiAgICAgIHJldHVybiBvTWVyZ2VkXHJcbiAgICB9XHJcbiAgICByZXR1cm4gbnVsbFxyXG4gIH1cclxuXHJcblxyXG5pbXBvcnQgKiBhcyBpbnB1dEZpbHRlciBmcm9tICcuL2lucHV0RmlsdGVyJztcclxuXHJcbiAgZnVuY3Rpb24gZmlsdGVyU2hvd0VudGl0eSAob0NvbnRleHQsIGFTaG93RW50aXR5QWN0aW9ucykge1xyXG4gICAgT2JqZWN0LmtleXMob0NvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcclxuICAgICAgaWYgKG9Db250ZXh0W3NLZXldID09PSBudWxsKSB7XHJcbiAgICAgICAgZGVsZXRlIG9Db250ZXh0W3NLZXldXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgICB2YXIgcmVzID0gaW5wdXRGaWx0ZXIuYXBwbHlSdWxlc1BpY2tGaXJzdChvQ29udGV4dCk7XHJcbiAgICBpZiAoIXJlcykge1xyXG4gICAgICByZXR1cm4gdW5kZWZpbmVkXHJcbiAgICB9XHJcbiAgICBkZWJ1Z2xvZyhcIioqIGFmdGVyIGZpbHRlciBydWxlc1wiICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKVxyXG4gICAgcmV0dXJuIGZpbHRlclNob3dFbnRpdHlPbGQocmVzLGFTaG93RW50aXR5QWN0aW9ucyk7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBleGVjU2hvd0VudGl0eSAob0VudGl0eSkge1xyXG4gICAgdmFyIG1lcmdlZCA9IGZpbHRlclNob3dFbnRpdHkob0VudGl0eSwgYVNob3dFbnRpdHlBY3Rpb25zKVxyXG4gICAgaWYgKG1lcmdlZCkge1xyXG4gICAgICByZXR1cm4gZXhlY3V0ZVN0YXJ0dXAobWVyZ2VkKVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG51bGxcclxuICB9XHJcblxyXG4gIC8vIEU6XFxwcm9qZWN0c1xcbm9kZWpzXFxib3RidWlsZGVyXFxzYW1wbGVib3Q+XCIlUHJvZ3JhbUZpbGVzKHg4NiklXFxHb29nbGVcXENocm9tZVxcQXBwbGljYXRpb25cXGNocm9tZS5leGVcIiAtLWluY29nbml0byAtdXJsIHd3dy5zcGllZ2VsLmRlXHJcblxyXG4gIGV4cG9ydCBjb25zdCBkaXNwYXRjaGVyID0ge1xyXG4gICAgZXhlY1Nob3dFbnRpdHk6IGV4ZWNTaG93RW50aXR5LFxyXG4gICAgX3Rlc3Q6IHtcclxuICAgICAgc2FtZU9yU3Rhcjogc2FtZU9yU3RhcixcclxuICAgICAgbnJNYXRjaGVzOiBuck1hdGNoZXMsXHJcbiAgICAgIG5yTm9NYXRjaGVzOiBuck5vTWF0Y2hlcyxcclxuICAgICAgZXhwYW5kUGFyYW1ldGVyc0luVVJMOiBleHBhbmRQYXJhbWV0ZXJzSW5VUkwsXHJcbiAgICAgIGZpbHRlclNob3dFbnRpdHk6IGZpbHRlclNob3dFbnRpdHksXHJcbiAgICAgIGZuRmluZFVuaXRUZXN0OiBmbkZpbmRVbml0VGVzdCxcclxuICAgICAgY2FsY0Rpc3RhbmNlOiBjYWxjRGlzdGFuY2UsXHJcbiAgICAgIF9hU2hvd0VudGl0eUFjdGlvbnM6IGFTaG93RW50aXR5QWN0aW9uc1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy9leHBvcnRzIGRpc3BhdGNoZXI7XHJcblxyXG4gIC8vbW9kdWxlLmV4cG9ydHMgPSBkaXNwYXRjaGVyXHJcblxyXG4iLCIvKipcbiAqIEBmaWxlXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5kaXNwYXRjaGVyXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXG4gKi9cblwidXNlIHN0cmljdFwiO1xudmFyIEFueU9iamVjdCA9IE9iamVjdDtcbnZhciBkaXN0YW5jZSA9IHJlcXVpcmUoXCIuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW5cIik7XG52YXIgZGVidWcgPSByZXF1aXJlKFwiZGVidWdcIik7XG52YXIgZGVidWdsb2cgPSBkZWJ1ZygnZGlzcGF0Y2hlcicpO1xudmFyIGNoaWxkX3Byb2Nlc3NfMSA9IHJlcXVpcmUoXCJjaGlsZF9wcm9jZXNzXCIpO1xuLy8gIHZhciBleGVjID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpLmV4ZWNcbi8vICB2YXIgbGV2ZW4gPSByZXF1aXJlKCcuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4uanMnKS5sZXZlbnNodGVpblxudmFyIGV4ZWN0ZW1wbGF0ZSA9IHJlcXVpcmUoXCIuLi9leGVjL2V4ZWN0ZW1wbGF0ZVwiKTtcbi8vdmFyIGxldmVuID0gcmVxdWlyZSgnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluLmpzJylcbnZhciBtYXRjaGRhdGEgPSByZXF1aXJlKFwiLi9tYXRjaGRhdGFcIik7XG52YXIgb1VuaXRUZXN0cyA9IG1hdGNoZGF0YS5vVW5pdFRlc3RzO1xudmFyIG9XaWtpcyA9IG1hdGNoZGF0YS5vV2lraXM7XG5mdW5jdGlvbiBjYWxjRGlzdGFuY2Uoc1RleHQxLCBzVGV4dDIpIHtcbiAgICBkZWJ1Z2xvZyhcImxlbmd0aDJcIiArIHNUZXh0MSArIFwiIC0gXCIgKyBzVGV4dDIpO1xuICAgIHZhciBhMCA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCksIHNUZXh0Mik7XG4gICAgdmFyIGEgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEudG9Mb3dlckNhc2UoKSwgc1RleHQyKTtcbiAgICByZXR1cm4gYTAgKiA1MDAgLyBzVGV4dDIubGVuZ3RoICsgYTtcbn1cbmZ1bmN0aW9uIGZuRmluZE1hdGNoKHNLZXl3b3JkLCBvQ29udGV4dCwgb01hcCkge1xuICAgIC8vIHJldHVybiBhIGJldHRlciBjb250ZXh0IGlmIHRoZXJlIGlzIGEgbWF0Y2hcbiAgICAvLyBzS2V5d29yZCA9IHNLZXl3b3JkLnRvTG93ZXJDYXNlKCk7XG4gICAgb01hcC5zb3J0KGZ1bmN0aW9uIChvRW50cnkxLCBvRW50cnkyKSB7XG4gICAgICAgIHZhciB1MSA9IGNhbGNEaXN0YW5jZShvRW50cnkxLmtleS50b0xvd2VyQ2FzZSgpLCBzS2V5d29yZCk7XG4gICAgICAgIHZhciB1MiA9IGNhbGNEaXN0YW5jZShvRW50cnkyLmtleS50b0xvd2VyQ2FzZSgpLCBzS2V5d29yZCk7XG4gICAgICAgIHJldHVybiB1MSAtIHUyO1xuICAgIH0pO1xuICAgIC8vIGxhdGVyOiBpbiBjYXNlIG9mIGNvbmZsaWN0cywgYXNrLFxuICAgIC8vIG5vdzpcbiAgICB2YXIgZGlzdCA9IGNhbGNEaXN0YW5jZShvTWFwWzBdLmtleS50b0xvd2VyQ2FzZSgpLCBzS2V5d29yZCk7XG4gICAgZGVidWdsb2coJ2Jlc3QgZGlzdCcgKyBkaXN0ICsgJyAvICAnICsgZGlzdCAqIHNLZXl3b3JkLmxlbmd0aCArICcgJyArIHNLZXl3b3JkKTtcbiAgICBpZiAoZGlzdCA8IDE1MCkge1xuICAgICAgICB2YXIgbzEgPSBPYmplY3QuYXNzaWduKHt9LCBvQ29udGV4dCk7XG4gICAgICAgIHZhciBvMjtcbiAgICAgICAgbzEuY29udGV4dCA9IE9iamVjdC5hc3NpZ24oe30sIG8xLmNvbnRleHQpO1xuICAgICAgICBvMiA9IG8xO1xuICAgICAgICBvMi5jb250ZXh0ID0gT2JqZWN0LmFzc2lnbihvMS5jb250ZXh0LCBvTWFwWzBdLmNvbnRleHQpO1xuICAgICAgICByZXR1cm4gbzI7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuLyoqXG4gKiBhIGZ1bmN0aW9uIHRvIG1hdGNoIGEgdW5pdCB0ZXN0IHVzaW5nIGxldmVuc2h0ZWluIGRpc3RhbmNlc1xuICogQHB1YmxpY1xuICovXG5mdW5jdGlvbiBmbkZpbmRVbml0VGVzdChzc3lzdGVtT2JqZWN0SWQsIG9Db250ZXh0KSB7XG4gICAgcmV0dXJuIGZuRmluZE1hdGNoKHNzeXN0ZW1PYmplY3RJZCwgb0NvbnRleHQsIG9Vbml0VGVzdHMpO1xufVxuZnVuY3Rpb24gZm5GaW5kV2lraShzS2V5d29yZCwgb0NvbnRleHQpIHtcbiAgICByZXR1cm4gZm5GaW5kTWF0Y2goc0tleXdvcmQsIG9Db250ZXh0LCBvV2lraXMpO1xufVxudmFyIGFTaG93RW50aXR5QWN0aW9ucyA9IFtcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbUlkOiAndXYyJyxcbiAgICAgICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxuICAgICAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHAnXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdXYyLndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS91aTIvdXNoZWxsL3NoZWxscy9hYmFwL0Zpb3JpTGF1bmNocGFkLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1JZDogJ3V2MicsXG4gICAgICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcbiAgICAgICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwZCdcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1djIud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3NhcC9hcnNydmNfdXBiX2FkbW4vbWFpbi5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtSWQ6ICd1MXknLFxuICAgICAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXG4gICAgICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscCdcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1MXkud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3VpMi91c2hlbGwvc2hlbGxzL2FiYXAvRmlvcmlMYXVuY2hwYWQuaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbUlkOiAndTF5JyxcbiAgICAgICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxuICAgICAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHBkJ1xuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXUxeS53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvc2FwL2Fyc3J2Y191cGJfYWRtbi9tYWluLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1JZDogJ3V2MicsXG4gICAgICAgICAgICBjbGllbnQ6ICcxMjAnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0Q2F0ZWdvcnk6ICdmaW9yaSBjYXRhbG9nJyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiAvLiovLFxuICAgICAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxuICAgICAgICAgICAgdG9vbDogJ0ZMUEQnXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdXYyLndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS9zYXAvYXJzcnZjX3VwYl9hZG1uL21haW4uaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9I0NBVEFMT0c6e3N5c3RlbU9iamVjdElkfSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ3VuaXQnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IGZuRmluZFVuaXRUZXN0XG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cDovL2xvY2FsaG9zdDo4MDgwL3twYXRofSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ3VuaXQgdGVzdCcsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogZm5GaW5kVW5pdFRlc3RcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwOi8vbG9jYWxob3N0OjgwODAve3BhdGh9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAnd2lraScsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogZm5GaW5kV2lraVxuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vd2lraS53ZGYuc2FwLmNvcnAve3BhdGh9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbUlkOiAnSklSQSdcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwczovL2ppcmEud2RmLnNhcC5jb3JwOjgwODAvVElQQ09SRVVJSUknXG4gICAgICAgIH1cbiAgICB9XG5dO1xuLy8gaWYgVE9PTCA9IEpJUkEgfHwgU3lzdGVtSWQgPSBKSVJBIC0+IFN5c3RlbUlkID0gSklSQVxuLy9cbi8vXG5mdW5jdGlvbiBzdGFydEJyb3dzZXIodXJsKSB7XG4gICAgdmFyIGNtZCA9ICdcIiVQcm9ncmFtRmlsZXMoeDg2KSVcXFxcR29vZ2xlXFxcXENocm9tZVxcXFxBcHBsaWNhdGlvblxcXFxjaHJvbWUuZXhlXCIgLS1pbmNvZ25pdG8gLXVybCBcIicgKyB1cmwgKyAnXCInO1xuICAgIGNoaWxkX3Byb2Nlc3NfMS5leGVjKGNtZCwgZnVuY3Rpb24gKGVycm9yLCBzdGRvdXQsIHN0ZGVycikge1xuICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJleGVjIGVycm9yOiBcIiArIGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBkZWJ1Z2xvZyhcInN0ZG91dDogXCIgKyBzdGRvdXQpO1xuICAgICAgICBkZWJ1Z2xvZyhcInN0ZGVycjogXCIgKyBzdGRlcnIpO1xuICAgIH0pO1xufVxuLy8gc3RhcnRTQVBHVUlcbi8vICAgTjpcXD5cImM6XFxQcm9ncmFtIEZpbGVzICh4ODYpXFxTQVBcXEZyb250RW5kXFxTQVBndWlcIlxcc2Fwc2hjdXQuZXhlICAtc3lzdGVtPVVWMiAtY2xpZW50PTEyMCAtY29tbWFuZD1TRTM4IC10eXBlPVRyYW5zYWN0aW9uIC11c2VyPUFVU0VSXG5mdW5jdGlvbiBleHBhbmRQYXJhbWV0ZXJzSW5VUkwob01lcmdlZENvbnRleHRSZXN1bHQpIHtcbiAgICB2YXIgcHRuID0gb01lcmdlZENvbnRleHRSZXN1bHQucmVzdWx0LnBhdHRlcm47XG4gICAgcHRuID0gZXhlY3RlbXBsYXRlLmV4cGFuZFRlbXBsYXRlKG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHQsIHB0bik7XG4gICAgLyogICAgT2JqZWN0LmtleXMob01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xuICAgICAgICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoJ3snICsgc0tleSArICd9JywgJ2cnKVxuICAgICAgICAgIHB0biA9IHB0bi5yZXBsYWNlKHJlZ2V4LCBvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0W3NLZXldKVxuICAgICAgICAgIHB0biA9IHB0bi5yZXBsYWNlKHJlZ2V4LCBvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0W3NLZXldKVxuICAgICAgICB9KVxuICAgICAgICAqL1xuICAgIHJldHVybiBwdG47XG59XG5mdW5jdGlvbiBleGVjdXRlU3RhcnR1cChvTWVyZ2VkQ29udGV4dFJlc3VsdCkge1xuICAgIGlmIChvTWVyZ2VkQ29udGV4dFJlc3VsdC5yZXN1bHQudHlwZSA9PT0gJ1VSTCcpIHtcbiAgICAgICAgdmFyIHB0biA9IGV4cGFuZFBhcmFtZXRlcnNJblVSTChvTWVyZ2VkQ29udGV4dFJlc3VsdCk7XG4gICAgICAgIHN0YXJ0QnJvd3NlcihwdG4pO1xuICAgICAgICByZXR1cm4gcHRuO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdmFyIHMgPSAoXCJEb24ndCBrbm93IGhvdyB0byBzdGFydCBcIiArIG9NZXJnZWRDb250ZXh0UmVzdWx0LnJlc3VsdC50eXBlICsgJ1xcbiBmb3IgXCInICsgb01lcmdlZENvbnRleHRSZXN1bHQucXVlcnkgKyAnXCInKTtcbiAgICAgICAgZGVidWdsb2cocyk7XG4gICAgICAgIHJldHVybiBzO1xuICAgIH1cbn1cbmV4cG9ydHMuZXhlY3V0ZVN0YXJ0dXAgPSBleGVjdXRlU3RhcnR1cDtcbmZ1bmN0aW9uIG5yTWF0Y2hlcyhhT2JqZWN0LCBvQ29udGV4dCkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhhT2JqZWN0KS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9Db250ZXh0LCBrZXkpKSB7XG4gICAgICAgICAgICBwcmV2ID0gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG59XG5mdW5jdGlvbiBuck5vTWF0Y2hlcyhhT2JqZWN0LCBvQ29udGV4dCkge1xuICAgIHZhciBub01hdGNoQSA9IE9iamVjdC5rZXlzKGFPYmplY3QpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XG4gICAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9Db250ZXh0LCBrZXkpKSB7XG4gICAgICAgICAgICBwcmV2ID0gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG4gICAgdmFyIG5vTWF0Y2hCID0gT2JqZWN0LmtleXMob0NvbnRleHQpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XG4gICAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGFPYmplY3QsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbiAgICByZXR1cm4gbm9NYXRjaEEgKyBub01hdGNoQjtcbn1cbmZ1bmN0aW9uIHNhbWVPclN0YXIoczEsIHMyLCBvRW50aXR5KSB7XG4gICAgcmV0dXJuIHMxID09PSBzMiB8fFxuICAgICAgICAoczEgPT09IHVuZGVmaW5lZCAmJiBzMiA9PT0gbnVsbCkgfHxcbiAgICAgICAgKChzMiBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgczIuZXhlYyhzMSkgIT09IG51bGwpIHx8XG4gICAgICAgICgodHlwZW9mIHMyID09PSAnZnVuY3Rpb24nICYmIHMxKSAmJiBzMihzMSwgb0VudGl0eSkpO1xufVxuZnVuY3Rpb24gc2FtZU9yU3RhckVtcHR5KHMxLCBzMiwgb0VudGl0eSkge1xuICAgIGlmIChzMSA9PT0gdW5kZWZpbmVkICYmIHMyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChzMiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gczEgPT09IHMyIHx8XG4gICAgICAgICgoczIgaW5zdGFuY2VvZiBSZWdFeHApICYmIHMyLmV4ZWMoczEpICE9PSBudWxsKSB8fFxuICAgICAgICAoKHR5cGVvZiBzMiA9PT0gJ2Z1bmN0aW9uJyAmJiBzMSkgJiYgczIoczEsIG9FbnRpdHkpKTtcbn1cbmZ1bmN0aW9uIGZpbHRlclNob3dFbnRpdHlPbGQob0NvbnRleHQsIGFTaG93RW50aXR5KSB7XG4gICAgdmFyIGFGaWx0ZXJlZDtcbiAgICBPYmplY3Qua2V5cyhvQ29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xuICAgICAgICBpZiAob0NvbnRleHRbc0tleV0gPT09IG51bGwpIHtcbiAgICAgICAgICAgIG9Db250ZXh0W3NLZXldID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgLy8gZmlsdGVyIGNvbnRleHQsIGFtZW5kaW5nIHN5bm9ueW1zXG4gICAgYUZpbHRlcmVkID0gYVNob3dFbnRpdHkuZmlsdGVyKGZ1bmN0aW9uIChvU2hvd0VudGl0eSkge1xuICAgICAgICAvLyAgICAgICBjb25zb2xlLmxvZyhcIi4uLlwiKVxuICAgICAgICAvLyAgICAgIGNvbnNvbGUubG9nKG9TaG93RW50aXR5LmNvbnRleHQudG9vbCArIFwiIFwiICsgb0NvbnRleHQudG9vbCArIFwiXFxuXCIpXG4gICAgICAgIC8vICAgICAgY29uc29sZS5sb2cob1Nob3dFbnRpdHkuY29udGV4dC5jbGllbnQgKyBcIiBcIiArIG9Db250ZXh0LmNsaWVudCArXCI6XCIgKyBzYW1lT3JTdGFyKG9Db250ZXh0LmNsaWVudCxvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCkgKyBcIlxcblwiKVxuICAgICAgICAvLyAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkob1Nob3dFbnRpdHkuY29udGV4dCkgKyBcIlxcblwiICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHQuY2xpZW50KSArIFwiXFxuXCIpXG4gICAgICAgIHJldHVybiBzYW1lT3JTdGFyKG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtSWQsIG9Db250ZXh0LnN5c3RlbUlkLCBvQ29udGV4dCkgJiZcbiAgICAgICAgICAgIHNhbWVPclN0YXIob0NvbnRleHQudG9vbCwgb1Nob3dFbnRpdHkuY29udGV4dC50b29sLCBvQ29udGV4dCkgJiZcbiAgICAgICAgICAgIHNhbWVPclN0YXIob0NvbnRleHQuY2xpZW50LCBvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCwgb0NvbnRleHQpICYmXG4gICAgICAgICAgICBzYW1lT3JTdGFyRW1wdHkob0NvbnRleHQuc3lzdGVtT2JqZWN0Q2F0ZWdvcnksIG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtT2JqZWN0Q2F0ZWdvcnksIG9Db250ZXh0KSAmJlxuICAgICAgICAgICAgc2FtZU9yU3RhckVtcHR5KG9Db250ZXh0LnN5c3RlbU9iamVjdElkLCBvU2hvd0VudGl0eS5jb250ZXh0LnN5c3RlbU9iamVjdElkLCBvQ29udGV4dCk7XG4gICAgICAgIC8vICAgICAgJiYgb1Nob3dFbnRpdHkuY29udGV4dC50b29sID09PSBvQ29udGV4dC50b29sXG4gICAgfSk7XG4gICAgLy8gIGNvbnNvbGUubG9nKGFGaWx0ZXJlZC5sZW5ndGgpXG4gICAgLy8gbWF0Y2ggb3RoZXIgY29udGV4dCBwYXJhbWV0ZXJzXG4gICAgYUZpbHRlcmVkLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgdmFyIG5yTWF0Y2hlc0EgPSBuck1hdGNoZXMoYS5jb250ZXh0LCBvQ29udGV4dCk7XG4gICAgICAgIHZhciBuck1hdGNoZXNCID0gbnJNYXRjaGVzKGIuY29udGV4dCwgb0NvbnRleHQpO1xuICAgICAgICB2YXIgbnJOb01hdGNoZXNBID0gbnJOb01hdGNoZXMoYS5jb250ZXh0LCBvQ29udGV4dCk7XG4gICAgICAgIHZhciBuck5vTWF0Y2hlc0IgPSBuck5vTWF0Y2hlcyhiLmNvbnRleHQsIG9Db250ZXh0KTtcbiAgICAgICAgLy8gICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhLmNvbnRleHQpKVxuICAgICAgICAvLyAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGIuY29udGV4dCkpXG4gICAgICAgIC8vICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkob0NvbnRleHQpKVxuICAgICAgICB2YXIgcmVzID0gLShuck1hdGNoZXNBIC0gbnJNYXRjaGVzQikgKiAxMDAgKyAobnJOb01hdGNoZXNBIC0gbnJOb01hdGNoZXNCKTtcbiAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKFwiZGlmZiBcIiArIHJlcylcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9KTtcbiAgICBpZiAoYUZpbHRlcmVkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBkZWJ1Z2xvZygnbm8gdGFyZ2V0IGZvciBzaG93RW50aXR5ICcgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dCkpO1xuICAgIH1cbiAgICAvLyBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhRmlsdGVyZWQsdW5kZWZpbmVkLDIpKVxuICAgIGlmIChhRmlsdGVyZWRbMF0pIHtcbiAgICAgICAgLy8gZXhlY3V0ZSBhbGwgZnVuY3Rpb25zXG4gICAgICAgIHZhciBvTWF0Y2ggPSBhRmlsdGVyZWRbMF07XG4gICAgICAgIHZhciBvTWVyZ2VkID0ge1xuICAgICAgICAgICAgY29udGV4dDoge31cbiAgICAgICAgfTtcbiAgICAgICAgb01lcmdlZC5jb250ZXh0ID0gQW55T2JqZWN0LmFzc2lnbih7fSwgb01lcmdlZC5jb250ZXh0LCBhRmlsdGVyZWRbMF0uY29udGV4dCwgb0NvbnRleHQpO1xuICAgICAgICBvTWVyZ2VkID0gQW55T2JqZWN0LmFzc2lnbihvTWVyZ2VkLCB7XG4gICAgICAgICAgICByZXN1bHQ6IGFGaWx0ZXJlZFswXS5yZXN1bHRcbiAgICAgICAgfSk7XG4gICAgICAgIE9iamVjdC5rZXlzKG9NYXRjaC5jb250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9NYXRjaC5jb250ZXh0W3NLZXldID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgZGVidWdsb2coJ05vdyByZXRyb2ZpdHRpbmcgOicgKyBzS2V5ICsgJyAtICcgKyBvQ29udGV4dFtzS2V5XSk7XG4gICAgICAgICAgICAgICAgb01lcmdlZCA9IG9NYXRjaC5jb250ZXh0W3NLZXldKG9Db250ZXh0W3NLZXldLCBvTWVyZ2VkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBvTWVyZ2VkO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cbnZhciBpbnB1dEZpbHRlciA9IHJlcXVpcmUoXCIuL2lucHV0RmlsdGVyXCIpO1xuZnVuY3Rpb24gZmlsdGVyU2hvd0VudGl0eShvQ29udGV4dCwgYVNob3dFbnRpdHlBY3Rpb25zKSB7XG4gICAgT2JqZWN0LmtleXMob0NvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgICAgaWYgKG9Db250ZXh0W3NLZXldID09PSBudWxsKSB7XG4gICAgICAgICAgICBkZWxldGUgb0NvbnRleHRbc0tleV07XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICB2YXIgcmVzID0gaW5wdXRGaWx0ZXIuYXBwbHlSdWxlc1BpY2tGaXJzdChvQ29udGV4dCk7XG4gICAgaWYgKCFyZXMpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZGVidWdsb2coXCIqKiBhZnRlciBmaWx0ZXIgcnVsZXNcIiArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgcmV0dXJuIGZpbHRlclNob3dFbnRpdHlPbGQocmVzLCBhU2hvd0VudGl0eUFjdGlvbnMpO1xufVxuZnVuY3Rpb24gZXhlY1Nob3dFbnRpdHkob0VudGl0eSkge1xuICAgIHZhciBtZXJnZWQgPSBmaWx0ZXJTaG93RW50aXR5KG9FbnRpdHksIGFTaG93RW50aXR5QWN0aW9ucyk7XG4gICAgaWYgKG1lcmdlZCkge1xuICAgICAgICByZXR1cm4gZXhlY3V0ZVN0YXJ0dXAobWVyZ2VkKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59XG4vLyBFOlxccHJvamVjdHNcXG5vZGVqc1xcYm90YnVpbGRlclxcc2FtcGxlYm90PlwiJVByb2dyYW1GaWxlcyh4ODYpJVxcR29vZ2xlXFxDaHJvbWVcXEFwcGxpY2F0aW9uXFxjaHJvbWUuZXhlXCIgLS1pbmNvZ25pdG8gLXVybCB3d3cuc3BpZWdlbC5kZVxuZXhwb3J0cy5kaXNwYXRjaGVyID0ge1xuICAgIGV4ZWNTaG93RW50aXR5OiBleGVjU2hvd0VudGl0eSxcbiAgICBfdGVzdDoge1xuICAgICAgICBzYW1lT3JTdGFyOiBzYW1lT3JTdGFyLFxuICAgICAgICBuck1hdGNoZXM6IG5yTWF0Y2hlcyxcbiAgICAgICAgbnJOb01hdGNoZXM6IG5yTm9NYXRjaGVzLFxuICAgICAgICBleHBhbmRQYXJhbWV0ZXJzSW5VUkw6IGV4cGFuZFBhcmFtZXRlcnNJblVSTCxcbiAgICAgICAgZmlsdGVyU2hvd0VudGl0eTogZmlsdGVyU2hvd0VudGl0eSxcbiAgICAgICAgZm5GaW5kVW5pdFRlc3Q6IGZuRmluZFVuaXRUZXN0LFxuICAgICAgICBjYWxjRGlzdGFuY2U6IGNhbGNEaXN0YW5jZSxcbiAgICAgICAgX2FTaG93RW50aXR5QWN0aW9uczogYVNob3dFbnRpdHlBY3Rpb25zXG4gICAgfVxufTtcbi8vZXhwb3J0cyBkaXNwYXRjaGVyO1xuLy9tb2R1bGUuZXhwb3J0cyA9IGRpc3BhdGNoZXJcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
