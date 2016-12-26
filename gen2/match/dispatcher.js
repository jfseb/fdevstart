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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9kaXNwYXRjaGVyLnRzIiwibWF0Y2gvZGlzcGF0Y2hlci5qcyJdLCJuYW1lcyI6WyJBbnlPYmplY3QiLCJPYmplY3QiLCJkaXN0YW5jZSIsInJlcXVpcmUiLCJkZWJ1ZyIsImRlYnVnbG9nIiwiY2hpbGRfcHJvY2Vzc18xIiwiZXhlY3RlbXBsYXRlIiwibWF0Y2hkYXRhIiwib1VuaXRUZXN0cyIsIm9XaWtpcyIsImNhbGNEaXN0YW5jZSIsInNUZXh0MSIsInNUZXh0MiIsImEwIiwibGV2ZW5zaHRlaW4iLCJzdWJzdHJpbmciLCJsZW5ndGgiLCJhIiwidG9Mb3dlckNhc2UiLCJmbkZpbmRNYXRjaCIsInNLZXl3b3JkIiwib0NvbnRleHQiLCJvTWFwIiwic29ydCIsIm9FbnRyeTEiLCJvRW50cnkyIiwidTEiLCJrZXkiLCJ1MiIsImRpc3QiLCJvMSIsImFzc2lnbiIsIm8yIiwiY29udGV4dCIsImZuRmluZFVuaXRUZXN0Iiwic3N5c3RlbU9iamVjdElkIiwiZm5GaW5kV2lraSIsImFTaG93RW50aXR5QWN0aW9ucyIsInN5c3RlbUlkIiwiY2xpZW50Iiwic3lzdGVtdHlwZSIsInN5c3RlbU9iamVjdElkIiwicmVzdWx0IiwidHlwZSIsInBhdHRlcm4iLCJzeXN0ZW1PYmplY3RDYXRlZ29yeSIsInRvb2wiLCJzdGFydEJyb3dzZXIiLCJ1cmwiLCJjbWQiLCJleGVjIiwiZXJyb3IiLCJzdGRvdXQiLCJzdGRlcnIiLCJjb25zb2xlIiwiZXhwYW5kUGFyYW1ldGVyc0luVVJMIiwib01lcmdlZENvbnRleHRSZXN1bHQiLCJwdG4iLCJleHBhbmRUZW1wbGF0ZSIsImV4ZWN1dGVTdGFydHVwIiwicyIsInF1ZXJ5IiwibnJNYXRjaGVzIiwiYU9iamVjdCIsImtleXMiLCJyZWR1Y2UiLCJwcmV2IiwicHJvdG90eXBlIiwiaGFzT3duUHJvcGVydHkiLCJjYWxsIiwibnJOb01hdGNoZXMiLCJub01hdGNoQSIsIm5vTWF0Y2hCIiwic2FtZU9yU3RhciIsInMxIiwiczIiLCJvRW50aXR5IiwidW5kZWZpbmVkIiwiUmVnRXhwIiwic2FtZU9yU3RhckVtcHR5IiwiZmlsdGVyU2hvd0VudGl0eU9sZCIsImFTaG93RW50aXR5IiwiYUZpbHRlcmVkIiwiZm9yRWFjaCIsInNLZXkiLCJmaWx0ZXIiLCJvU2hvd0VudGl0eSIsImIiLCJuck1hdGNoZXNBIiwibnJNYXRjaGVzQiIsIm5yTm9NYXRjaGVzQSIsIm5yTm9NYXRjaGVzQiIsInJlcyIsIkpTT04iLCJzdHJpbmdpZnkiLCJvTWF0Y2giLCJvTWVyZ2VkIiwiaW5wdXRGaWx0ZXIiLCJmaWx0ZXJTaG93RW50aXR5IiwiYXBwbHlSdWxlc1BpY2tGaXJzdCIsImV4ZWNTaG93RW50aXR5IiwibWVyZ2VkIiwiZXhwb3J0cyIsImRpc3BhdGNoZXIiLCJfdGVzdCIsIl9hU2hvd0VudGl0eUFjdGlvbnMiXSwibWFwcGluZ3MiOiJBQUFBOzs7OztBQ0tBOztBRFFBLElBQUlBLFlBQWtCQyxNQUF0QjtBQUVBLElBQVlDLFdBQVFDLFFBQU0sNkJBQU4sQ0FBcEI7QUFFQSxJQUFZQyxRQUFLRCxRQUFNLE9BQU4sQ0FBakI7QUFDQSxJQUFNRSxXQUFXRCxNQUFNLFlBQU4sQ0FBakI7QUFFQSxJQUFBRSxrQkFBQUgsUUFBcUIsZUFBckIsQ0FBQTtBQUNBO0FBQ0E7QUFFQSxJQUFZSSxlQUFZSixRQUFNLHNCQUFOLENBQXhCO0FBRUU7QUFDRixJQUFZSyxZQUFTTCxRQUFNLGFBQU4sQ0FBckI7QUFFQSxJQUFNTSxhQUFhRCxVQUFVQyxVQUE3QjtBQUNBLElBQU1DLFNBQVNGLFVBQVVFLE1BQXpCO0FBRUUsU0FBQUMsWUFBQSxDQUF1QkMsTUFBdkIsRUFBK0JDLE1BQS9CLEVBQXFDO0FBQ25DUixhQUFTLFlBQVlPLE1BQVosR0FBcUIsS0FBckIsR0FBNkJDLE1BQXRDO0FBQ0EsUUFBSUMsS0FBS1osU0FBU2EsV0FBVCxDQUFxQkgsT0FBT0ksU0FBUCxDQUFpQixDQUFqQixFQUFvQkgsT0FBT0ksTUFBM0IsQ0FBckIsRUFBeURKLE1B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QWYsQ0FBUDtBQUNEO0FBQ0QsV0FBTyxJQUFQO0FBQ0Q7QUFFRDtBQUVhQyxRQUFBQyxVQUFBLEdBQWE7QUFDeEJILG9CQUFnQkEsY0FEUTtBQUV4QkksV0FBTztBQUNML0Isb0JBQVlBLFVBRFA7QUFFTFgsbUJBQVdBLFNBRk47QUFHTFEscUJBQWFBLFdBSFI7QUFJTGYsK0JBQXVCQSxxQkFKbEI7QUFLTDJDLDBCQUFrQkEsZ0JBTGI7QUFNTGhFLHdCQUFnQkEsY0FOWDtBQU9MeEIsc0JBQWNBLFlBUFQ7QUFRTCtGLDZCQUFxQnBFO0FBUmhCO0FBRmlCLENBQWI7QUFjYjtBQUVBIiwiZmlsZSI6Im1hdGNoL2Rpc3BhdGNoZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQGZpbGVcclxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuZGlzcGF0Y2hlclxyXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXHJcbiAqL1xyXG5cclxuXHJcbi8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2xpYi9ub2RlLTQuZC50c1wiIC8+XHJcblxyXG5kZWNsYXJlIGludGVyZmFjZSBPYmplY3RDb25zdHJ1Y3RvciB7XHJcbiAgICBhc3NpZ24odGFyZ2V0OiBhbnksIC4uLnNvdXJjZXM6IGFueVtdKTogYW55O1xyXG59XHJcblxyXG52YXIgQW55T2JqZWN0ID0gKDxhbnk+T2JqZWN0KTtcclxuXHJcbmltcG9ydCAqIGFzIGRpc3RhbmNlIGZyb20gJy4uL3V0aWxzL2RhbWVyYXVMZXZlbnNodGVpbic7XHJcblxyXG5pbXBvcnQgKiBhcyBkZWJ1ZyBmcm9tICdkZWJ1Zyc7XHJcbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ2Rpc3BhdGNoZXInKVxyXG5cclxuaW1wb3J0IHsgZXhlYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xyXG4vLyAgdmFyIGV4ZWMgPSByZXF1aXJlKCdjaGlsZF9wcm9jZXNzJykuZXhlY1xyXG4vLyAgdmFyIGxldmVuID0gcmVxdWlyZSgnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluLmpzJykubGV2ZW5zaHRlaW5cclxuXHJcbmltcG9ydCAqIGFzIGV4ZWN0ZW1wbGF0ZSBmcm9tICcuLi9leGVjL2V4ZWN0ZW1wbGF0ZSc7XHJcblxyXG4gIC8vdmFyIGxldmVuID0gcmVxdWlyZSgnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluLmpzJylcclxuaW1wb3J0ICogYXMgbWF0Y2hkYXRhIGZyb20gJy4vbWF0Y2hkYXRhJztcclxuXHJcbmNvbnN0IG9Vbml0VGVzdHMgPSBtYXRjaGRhdGEub1VuaXRUZXN0c1xyXG5jb25zdCBvV2lraXMgPSBtYXRjaGRhdGEub1dpa2lzXHJcblxyXG4gIGZ1bmN0aW9uIGNhbGNEaXN0YW5jZSAoc1RleHQxLCBzVGV4dDIpIHtcclxuICAgIGRlYnVnbG9nKFwibGVuZ3RoMlwiICsgc1RleHQxICsgXCIgLSBcIiArIHNUZXh0MilcclxuICAgIHZhciBhMCA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCksIHNUZXh0MilcclxuICAgIHZhciBhID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnRvTG93ZXJDYXNlKCksIHNUZXh0MilcclxuICAgIHJldHVybiBhMCAqIDUwMCAvIHNUZXh0Mi5sZW5ndGggKyBhXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBmbkZpbmRNYXRjaCAoc0tleXdvcmQsIG9Db250ZXh0LCBvTWFwKSB7XHJcbiAgICAvLyByZXR1cm4gYSBiZXR0ZXIgY29udGV4dCBpZiB0aGVyZSBpcyBhIG1hdGNoXHJcbiAgICAvLyBzS2V5d29yZCA9IHNLZXl3b3JkLnRvTG93ZXJDYXNlKCk7XHJcbiAgICBvTWFwLnNvcnQoZnVuY3Rpb24gKG9FbnRyeTEsIG9FbnRyeTIpIHtcclxuICAgICAgdmFyIHUxID0gY2FsY0Rpc3RhbmNlKG9FbnRyeTEua2V5LnRvTG93ZXJDYXNlKCksIHNLZXl3b3JkKVxyXG4gICAgICB2YXIgdTIgPSBjYWxjRGlzdGFuY2Uob0VudHJ5Mi5rZXkudG9Mb3dlckNhc2UoKSwgc0tleXdvcmQpXHJcbiAgICAgIHJldHVybiB1MSAtIHUyXHJcbiAgICB9KVxyXG4gICAgLy8gbGF0ZXI6IGluIGNhc2Ugb2YgY29uZmxpY3RzLCBhc2ssXHJcbiAgICAvLyBub3c6XHJcbiAgICB2YXIgZGlzdCA9IGNhbGNEaXN0YW5jZShvTWFwWzBdLmtleS50b0xvd2VyQ2FzZSgpLCBzS2V5d29yZClcclxuICAgIGRlYnVnbG9nKCdiZXN0IGRpc3QnICsgZGlzdCArICcgLyAgJyArIGRpc3QgKiBzS2V5d29yZC5sZW5ndGggKyAnICcgKyBzS2V5d29yZClcclxuICAgIGlmIChkaXN0IDwgMTUwKSB7XHJcbiAgICAgIHZhciBvMSA9ICg8YW55Pk9iamVjdCkuYXNzaWduKHt9LCBvQ29udGV4dClcclxuICAgICAgdmFyIG8yXHJcbiAgICAgIG8xLmNvbnRleHQgPSAoPGFueT5PYmplY3QpLmFzc2lnbih7fSwgbzEuY29udGV4dClcclxuICAgICAgbzIgPSBvMVxyXG4gICAgICBvMi5jb250ZXh0ID0gKDxhbnk+T2JqZWN0KS5hc3NpZ24obzEuY29udGV4dCwgb01hcFswXS5jb250ZXh0KVxyXG4gICAgICByZXR1cm4gbzJcclxuICAgIH1cclxuICAgIHJldHVybiBudWxsXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBhIGZ1bmN0aW9uIHRvIG1hdGNoIGEgdW5pdCB0ZXN0IHVzaW5nIGxldmVuc2h0ZWluIGRpc3RhbmNlc1xyXG4gICAqIEBwdWJsaWNcclxuICAgKi9cclxuICBmdW5jdGlvbiBmbkZpbmRVbml0VGVzdCAoc3N5c3RlbU9iamVjdElkLCBvQ29udGV4dCkge1xyXG4gICAgcmV0dXJuIGZuRmluZE1hdGNoKHNzeXN0ZW1PYmplY3RJZCwgb0NvbnRleHQsIG9Vbml0VGVzdHMpXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBmbkZpbmRXaWtpIChzS2V5d29yZCwgb0NvbnRleHQpIHtcclxuICAgIHJldHVybiBmbkZpbmRNYXRjaChzS2V5d29yZCwgb0NvbnRleHQsIG9XaWtpcylcclxuICB9XHJcblxyXG4gIHZhciBhU2hvd0VudGl0eUFjdGlvbnMgPSBbXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1JZDogJ3V2MicsXHJcbiAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXHJcbiAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwJ1xyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdXYyLndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS91aTIvdXNoZWxsL3NoZWxscy9hYmFwL0Zpb3JpTGF1bmNocGFkLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbUlkOiAndXYyJyxcclxuICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcclxuICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHBkJ1xyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdXYyLndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS9zYXAvYXJzcnZjX3VwYl9hZG1uL21haW4uaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtSWQ6ICd1MXknLFxyXG4gICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxyXG4gICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscCdcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXUxeS53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvdWkyL3VzaGVsbC9zaGVsbHMvYWJhcC9GaW9yaUxhdW5jaHBhZC5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1JZDogJ3UxeScsXHJcbiAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXHJcbiAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwZCdcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXUxeS53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvc2FwL2Fyc3J2Y191cGJfYWRtbi9tYWluLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbUlkOiAndXYyJyxcclxuICAgICAgICBjbGllbnQ6ICcxMjAnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAnZmlvcmkgY2F0YWxvZycsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IC8uKi8sXHJcbiAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxyXG4gICAgICAgIHRvb2w6ICdGTFBEJ1xyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdXYyLndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS9zYXAvYXJzcnZjX3VwYl9hZG1uL21haW4uaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9I0NBVEFMT0c6e3N5c3RlbU9iamVjdElkfSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAndW5pdCcsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IGZuRmluZFVuaXRUZXN0XHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwOi8vbG9jYWxob3N0OjgwODAve3BhdGh9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAndW5pdCB0ZXN0JyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogZm5GaW5kVW5pdFRlc3RcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MC97cGF0aH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ3dpa2knLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiBmbkZpbmRXaWtpXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL3dpa2kud2RmLnNhcC5jb3JwL3twYXRofSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbUlkOiAnSklSQSdcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vamlyYS53ZGYuc2FwLmNvcnA6ODA4MC9USVBDT1JFVUlJSSdcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIF1cclxuXHJcbiAgLy8gaWYgVE9PTCA9IEpJUkEgfHwgU3lzdGVtSWQgPSBKSVJBIC0+IFN5c3RlbUlkID0gSklSQVxyXG4gIC8vXHJcbiAgLy9cclxuXHJcbiAgZnVuY3Rpb24gc3RhcnRCcm93c2VyICh1cmwpIHtcclxuICAgIHZhciBjbWQgPVxyXG4gICAgJ1wiJVByb2dyYW1GaWxlcyh4ODYpJVxcXFxHb29nbGVcXFxcQ2hyb21lXFxcXEFwcGxpY2F0aW9uXFxcXGNocm9tZS5leGVcIiAtLWluY29nbml0byAtdXJsIFwiJyArIHVybCArICdcIidcclxuICAgIGV4ZWMoY21kLCBmdW5jdGlvbiAoZXJyb3IsIHN0ZG91dCwgc3RkZXJyKSB7XHJcbiAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYGV4ZWMgZXJyb3I6ICR7ZXJyb3J9YClcclxuICAgICAgICByZXR1cm5cclxuICAgICAgfVxyXG4gICAgICBkZWJ1Z2xvZyhgc3Rkb3V0OiAke3N0ZG91dH1gKVxyXG4gICAgICBkZWJ1Z2xvZyhgc3RkZXJyOiAke3N0ZGVycn1gKVxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIC8vIHN0YXJ0U0FQR1VJXHJcblxyXG4gIC8vICAgTjpcXD5cImM6XFxQcm9ncmFtIEZpbGVzICh4ODYpXFxTQVBcXEZyb250RW5kXFxTQVBndWlcIlxcc2Fwc2hjdXQuZXhlICAtc3lzdGVtPVVWMiAtY2xpZW50PTEyMCAtY29tbWFuZD1TRTM4IC10eXBlPVRyYW5zYWN0aW9uIC11c2VyPUFVU0VSXHJcblxyXG4gIGZ1bmN0aW9uIGV4cGFuZFBhcmFtZXRlcnNJblVSTCAob01lcmdlZENvbnRleHRSZXN1bHQpIHtcclxuICAgIHZhciBwdG4gPSBvTWVyZ2VkQ29udGV4dFJlc3VsdC5yZXN1bHQucGF0dGVyblxyXG4gICAgcHRuID0gZXhlY3RlbXBsYXRlLmV4cGFuZFRlbXBsYXRlKG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHQsIHB0bik7XHJcbi8qICAgIE9iamVjdC5rZXlzKG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcclxuICAgICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cCgneycgKyBzS2V5ICsgJ30nLCAnZycpXHJcbiAgICAgIHB0biA9IHB0bi5yZXBsYWNlKHJlZ2V4LCBvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0W3NLZXldKVxyXG4gICAgICBwdG4gPSBwdG4ucmVwbGFjZShyZWdleCwgb01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dFtzS2V5XSlcclxuICAgIH0pXHJcbiAgICAqL1xyXG4gICAgcmV0dXJuIHB0blxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZXhlY3V0ZVN0YXJ0dXAgKG9NZXJnZWRDb250ZXh0UmVzdWx0KSB7XHJcbiAgICBpZiAob01lcmdlZENvbnRleHRSZXN1bHQucmVzdWx0LnR5cGUgPT09ICdVUkwnKSB7XHJcbiAgICAgIHZhciBwdG4gPSBleHBhbmRQYXJhbWV0ZXJzSW5VUkwob01lcmdlZENvbnRleHRSZXN1bHQpXHJcbiAgICAgIHN0YXJ0QnJvd3NlcihwdG4pXHJcbiAgICAgIHJldHVybiBwdG5cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHZhciBzID0gKFwiRG9uJ3Qga25vdyBob3cgdG8gc3RhcnQgXCIgKyBvTWVyZ2VkQ29udGV4dFJlc3VsdC5yZXN1bHQudHlwZSArICdcXG4gZm9yIFwiJyArIG9NZXJnZWRDb250ZXh0UmVzdWx0LnF1ZXJ5ICsgJ1wiJylcclxuICAgICAgZGVidWdsb2cocylcclxuICAgICAgcmV0dXJuIHNcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIG5yTWF0Y2hlcyAoYU9iamVjdCwgb0NvbnRleHQpIHtcclxuICAgIHJldHVybiBPYmplY3Qua2V5cyhhT2JqZWN0KS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xyXG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9Db250ZXh0LCBrZXkpKSB7XHJcbiAgICAgICAgcHJldiA9IHByZXYgKyAxXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHByZXZcclxuICAgIH0sIDApXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBuck5vTWF0Y2hlcyAoYU9iamVjdCwgb0NvbnRleHQpIHtcclxuICAgIHZhciBub01hdGNoQSA9IE9iamVjdC5rZXlzKGFPYmplY3QpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XHJcbiAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9Db250ZXh0LCBrZXkpKSB7XHJcbiAgICAgICAgcHJldiA9IHByZXYgKyAxXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHByZXZcclxuICAgIH0sIDApXHJcbiAgICB2YXIgbm9NYXRjaEIgPSBPYmplY3Qua2V5cyhvQ29udGV4dCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYU9iamVjdCwga2V5KSkge1xyXG4gICAgICAgIHByZXYgPSBwcmV2ICsgMVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBwcmV2XHJcbiAgICB9LCAwKVxyXG4gICAgcmV0dXJuIG5vTWF0Y2hBICsgbm9NYXRjaEJcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHNhbWVPclN0YXIgKHMxIDogc3RyaW5nLCBzMiA6IHN0cmluZyB8IFJlZ0V4cCB8IEZ1bmN0aW9uICwgb0VudGl0eSkge1xyXG4gICAgcmV0dXJuIHMxID09PSBzMiB8fFxyXG4gICAgICAoczEgPT09IHVuZGVmaW5lZCAmJiBzMiA9PT0gbnVsbCkgfHxcclxuICAgICAgKChzMiBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgczIuZXhlYyhzMSkgIT09IG51bGwpIHx8XHJcbiAgICAgICgodHlwZW9mIHMyID09PSAnZnVuY3Rpb24nICYmIHMxKSAmJiBzMihzMSwgb0VudGl0eSkpXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBzYW1lT3JTdGFyRW1wdHkgKHMxIDogc3RyaW5nLCBzMiA6IHN0cmluZyB8IFJlZ0V4cCB8IEZ1bmN0aW9uLCBvRW50aXR5KSB7XHJcbiAgICBpZiAoczEgPT09IHVuZGVmaW5lZCAmJiBzMiA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9XHJcbiAgICBpZiAoczIgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzMSA9PT0gczIgfHxcclxuICAgICAgKChzMiBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgczIuZXhlYyhzMSkgIT09IG51bGwpIHx8XHJcbiAgICAgICgodHlwZW9mIHMyID09PSAnZnVuY3Rpb24nICYmIHMxKSAmJiBzMihzMSwgb0VudGl0eSkpXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBmaWx0ZXJTaG93RW50aXR5T2xkIChvQ29udGV4dCwgYVNob3dFbnRpdHkpIHtcclxuICAgIHZhciBhRmlsdGVyZWRcclxuICAgIE9iamVjdC5rZXlzKG9Db250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XHJcbiAgICAgIGlmIChvQ29udGV4dFtzS2V5XSA9PT0gbnVsbCkge1xyXG4gICAgICAgIG9Db250ZXh0W3NLZXldID0gdW5kZWZpbmVkXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgICAvLyBmaWx0ZXIgY29udGV4dCwgYW1lbmRpbmcgc3lub255bXNcclxuXHJcblxyXG4gICAgYUZpbHRlcmVkID0gYVNob3dFbnRpdHkuZmlsdGVyKGZ1bmN0aW9uIChvU2hvd0VudGl0eSkge1xyXG4gICAgICAvLyAgICAgICBjb25zb2xlLmxvZyhcIi4uLlwiKVxyXG4gICAgICAvLyAgICAgIGNvbnNvbGUubG9nKG9TaG93RW50aXR5LmNvbnRleHQudG9vbCArIFwiIFwiICsgb0NvbnRleHQudG9vbCArIFwiXFxuXCIpXHJcbiAgICAgIC8vICAgICAgY29uc29sZS5sb2cob1Nob3dFbnRpdHkuY29udGV4dC5jbGllbnQgKyBcIiBcIiArIG9Db250ZXh0LmNsaWVudCArXCI6XCIgKyBzYW1lT3JTdGFyKG9Db250ZXh0LmNsaWVudCxvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCkgKyBcIlxcblwiKVxyXG4gICAgICAvLyAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkob1Nob3dFbnRpdHkuY29udGV4dCkgKyBcIlxcblwiICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHQuY2xpZW50KSArIFwiXFxuXCIpXHJcblxyXG4gICAgICByZXR1cm4gc2FtZU9yU3RhcihvU2hvd0VudGl0eS5jb250ZXh0LnN5c3RlbUlkLCBvQ29udGV4dC5zeXN0ZW1JZCwgb0NvbnRleHQpICYmXHJcbiAgICAgICAgc2FtZU9yU3RhcihvQ29udGV4dC50b29sLCBvU2hvd0VudGl0eS5jb250ZXh0LnRvb2wsIG9Db250ZXh0KSAmJlxyXG4gICAgICAgIHNhbWVPclN0YXIob0NvbnRleHQuY2xpZW50LCBvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCwgb0NvbnRleHQpICYmXHJcbiAgICAgICAgc2FtZU9yU3RhckVtcHR5KG9Db250ZXh0LnN5c3RlbU9iamVjdENhdGVnb3J5LCBvU2hvd0VudGl0eS5jb250ZXh0LnN5c3RlbU9iamVjdENhdGVnb3J5LCBvQ29udGV4dCkgJiZcclxuICAgICAgICBzYW1lT3JTdGFyRW1wdHkob0NvbnRleHQuc3lzdGVtT2JqZWN0SWQsIG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtT2JqZWN0SWQsIG9Db250ZXh0KVxyXG4gICAgLy8gICAgICAmJiBvU2hvd0VudGl0eS5jb250ZXh0LnRvb2wgPT09IG9Db250ZXh0LnRvb2xcclxuICAgIH0pXHJcbiAgICAvLyAgY29uc29sZS5sb2coYUZpbHRlcmVkLmxlbmd0aClcclxuICAgIC8vIG1hdGNoIG90aGVyIGNvbnRleHQgcGFyYW1ldGVyc1xyXG4gICAgYUZpbHRlcmVkLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcclxuICAgICAgdmFyIG5yTWF0Y2hlc0EgPSBuck1hdGNoZXMoYS5jb250ZXh0LCBvQ29udGV4dClcclxuICAgICAgdmFyIG5yTWF0Y2hlc0IgPSBuck1hdGNoZXMoYi5jb250ZXh0LCBvQ29udGV4dClcclxuICAgICAgdmFyIG5yTm9NYXRjaGVzQSA9IG5yTm9NYXRjaGVzKGEuY29udGV4dCwgb0NvbnRleHQpXHJcbiAgICAgIHZhciBuck5vTWF0Y2hlc0IgPSBuck5vTWF0Y2hlcyhiLmNvbnRleHQsIG9Db250ZXh0KVxyXG4gICAgICAvLyAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGEuY29udGV4dCkpXHJcbiAgICAgIC8vICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYi5jb250ZXh0KSlcclxuICAgICAgLy8gICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShvQ29udGV4dCkpXHJcbiAgICAgIHZhciByZXMgPSAtKG5yTWF0Y2hlc0EgLSBuck1hdGNoZXNCKSAqIDEwMCArIChuck5vTWF0Y2hlc0EgLSBuck5vTWF0Y2hlc0IpXHJcbiAgICAgIC8vICAgICBjb25zb2xlLmxvZyhcImRpZmYgXCIgKyByZXMpXHJcbiAgICAgIHJldHVybiByZXNcclxuICAgIH0pXHJcbiAgICBpZiAoYUZpbHRlcmVkLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICBkZWJ1Z2xvZygnbm8gdGFyZ2V0IGZvciBzaG93RW50aXR5ICcgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dCkpXHJcbiAgICB9XHJcbiAgICAvLyBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhRmlsdGVyZWQsdW5kZWZpbmVkLDIpKVxyXG4gICAgaWYgKGFGaWx0ZXJlZFswXSkge1xyXG4gICAgICAvLyBleGVjdXRlIGFsbCBmdW5jdGlvbnNcclxuXHJcbiAgICAgIHZhciBvTWF0Y2ggPSBhRmlsdGVyZWRbMF1cclxuXHJcbiAgICAgIHZhciBvTWVyZ2VkID0ge1xyXG4gICAgICAgIGNvbnRleHQ6IHtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIG9NZXJnZWQuY29udGV4dCA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9NZXJnZWQuY29udGV4dCwgYUZpbHRlcmVkWzBdLmNvbnRleHQsIG9Db250ZXh0KVxyXG4gICAgICBvTWVyZ2VkID0gQW55T2JqZWN0LmFzc2lnbihvTWVyZ2VkLCB7XHJcbiAgICAgICAgcmVzdWx0OiBhRmlsdGVyZWRbMF0ucmVzdWx0XHJcbiAgICAgIH0pXHJcblxyXG4gICAgICBPYmplY3Qua2V5cyhvTWF0Y2guY29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xyXG4gICAgICAgIGlmICh0eXBlb2Ygb01hdGNoLmNvbnRleHRbc0tleV0gPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgIGRlYnVnbG9nKCdOb3cgcmV0cm9maXR0aW5nIDonICsgc0tleSArICcgLSAnICsgb0NvbnRleHRbc0tleV0pXHJcbiAgICAgICAgICBvTWVyZ2VkID0gb01hdGNoLmNvbnRleHRbc0tleV0ob0NvbnRleHRbc0tleV0sIG9NZXJnZWQpXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG5cclxuICAgICAgcmV0dXJuIG9NZXJnZWRcclxuICAgIH1cclxuICAgIHJldHVybiBudWxsXHJcbiAgfVxyXG5cclxuXHJcbmltcG9ydCAqIGFzIGlucHV0RmlsdGVyIGZyb20gJy4vaW5wdXRGaWx0ZXInO1xyXG5cclxuICBmdW5jdGlvbiBmaWx0ZXJTaG93RW50aXR5IChvQ29udGV4dCwgYVNob3dFbnRpdHlBY3Rpb25zKSB7XHJcbiAgICBPYmplY3Qua2V5cyhvQ29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xyXG4gICAgICBpZiAob0NvbnRleHRbc0tleV0gPT09IG51bGwpIHtcclxuICAgICAgICBkZWxldGUgb0NvbnRleHRbc0tleV1cclxuICAgICAgfVxyXG4gICAgfSlcclxuICAgIHZhciByZXMgPSBpbnB1dEZpbHRlci5hcHBseVJ1bGVzUGlja0ZpcnN0KG9Db250ZXh0KTtcclxuICAgIGlmICghcmVzKSB7XHJcbiAgICAgIHJldHVybiB1bmRlZmluZWRcclxuICAgIH1cclxuICAgIGRlYnVnbG9nKFwiKiogYWZ0ZXIgZmlsdGVyIHJ1bGVzXCIgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpXHJcbiAgICByZXR1cm4gZmlsdGVyU2hvd0VudGl0eU9sZChyZXMsYVNob3dFbnRpdHlBY3Rpb25zKTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGV4ZWNTaG93RW50aXR5IChvRW50aXR5KSB7XHJcbiAgICB2YXIgbWVyZ2VkID0gZmlsdGVyU2hvd0VudGl0eShvRW50aXR5LCBhU2hvd0VudGl0eUFjdGlvbnMpXHJcbiAgICBpZiAobWVyZ2VkKSB7XHJcbiAgICAgIHJldHVybiBleGVjdXRlU3RhcnR1cChtZXJnZWQpXHJcbiAgICB9XHJcbiAgICByZXR1cm4gbnVsbFxyXG4gIH1cclxuXHJcbiAgLy8gRTpcXHByb2plY3RzXFxub2RlanNcXGJvdGJ1aWxkZXJcXHNhbXBsZWJvdD5cIiVQcm9ncmFtRmlsZXMoeDg2KSVcXEdvb2dsZVxcQ2hyb21lXFxBcHBsaWNhdGlvblxcY2hyb21lLmV4ZVwiIC0taW5jb2duaXRvIC11cmwgd3d3LnNwaWVnZWwuZGVcclxuXHJcbiAgZXhwb3J0IGNvbnN0IGRpc3BhdGNoZXIgPSB7XHJcbiAgICBleGVjU2hvd0VudGl0eTogZXhlY1Nob3dFbnRpdHksXHJcbiAgICBfdGVzdDoge1xyXG4gICAgICBzYW1lT3JTdGFyOiBzYW1lT3JTdGFyLFxyXG4gICAgICBuck1hdGNoZXM6IG5yTWF0Y2hlcyxcclxuICAgICAgbnJOb01hdGNoZXM6IG5yTm9NYXRjaGVzLFxyXG4gICAgICBleHBhbmRQYXJhbWV0ZXJzSW5VUkw6IGV4cGFuZFBhcmFtZXRlcnNJblVSTCxcclxuICAgICAgZmlsdGVyU2hvd0VudGl0eTogZmlsdGVyU2hvd0VudGl0eSxcclxuICAgICAgZm5GaW5kVW5pdFRlc3Q6IGZuRmluZFVuaXRUZXN0LFxyXG4gICAgICBjYWxjRGlzdGFuY2U6IGNhbGNEaXN0YW5jZSxcclxuICAgICAgX2FTaG93RW50aXR5QWN0aW9uczogYVNob3dFbnRpdHlBY3Rpb25zXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvL2V4cG9ydHMgZGlzcGF0Y2hlcjtcclxuXHJcbiAgLy9tb2R1bGUuZXhwb3J0cyA9IGRpc3BhdGNoZXJcclxuXHJcbiIsIi8qKlxuICogQGZpbGVcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmRpc3BhdGNoZXJcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cbiAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgQW55T2JqZWN0ID0gT2JqZWN0O1xudmFyIGRpc3RhbmNlID0gcmVxdWlyZSgnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluJyk7XG52YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpO1xudmFyIGRlYnVnbG9nID0gZGVidWcoJ2Rpc3BhdGNoZXInKTtcbnZhciBjaGlsZF9wcm9jZXNzXzEgPSByZXF1aXJlKCdjaGlsZF9wcm9jZXNzJyk7XG4vLyAgdmFyIGV4ZWMgPSByZXF1aXJlKCdjaGlsZF9wcm9jZXNzJykuZXhlY1xuLy8gIHZhciBsZXZlbiA9IHJlcXVpcmUoJy4uL3V0aWxzL2RhbWVyYXVMZXZlbnNodGVpbi5qcycpLmxldmVuc2h0ZWluXG52YXIgZXhlY3RlbXBsYXRlID0gcmVxdWlyZSgnLi4vZXhlYy9leGVjdGVtcGxhdGUnKTtcbi8vdmFyIGxldmVuID0gcmVxdWlyZSgnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluLmpzJylcbnZhciBtYXRjaGRhdGEgPSByZXF1aXJlKCcuL21hdGNoZGF0YScpO1xudmFyIG9Vbml0VGVzdHMgPSBtYXRjaGRhdGEub1VuaXRUZXN0cztcbnZhciBvV2lraXMgPSBtYXRjaGRhdGEub1dpa2lzO1xuZnVuY3Rpb24gY2FsY0Rpc3RhbmNlKHNUZXh0MSwgc1RleHQyKSB7XG4gICAgZGVidWdsb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKTtcbiAgICB2YXIgYTAgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEuc3Vic3RyaW5nKDAsIHNUZXh0Mi5sZW5ndGgpLCBzVGV4dDIpO1xuICAgIHZhciBhID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnRvTG93ZXJDYXNlKCksIHNUZXh0Mik7XG4gICAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGE7XG59XG5mdW5jdGlvbiBmbkZpbmRNYXRjaChzS2V5d29yZCwgb0NvbnRleHQsIG9NYXApIHtcbiAgICAvLyByZXR1cm4gYSBiZXR0ZXIgY29udGV4dCBpZiB0aGVyZSBpcyBhIG1hdGNoXG4gICAgLy8gc0tleXdvcmQgPSBzS2V5d29yZC50b0xvd2VyQ2FzZSgpO1xuICAgIG9NYXAuc29ydChmdW5jdGlvbiAob0VudHJ5MSwgb0VudHJ5Mikge1xuICAgICAgICB2YXIgdTEgPSBjYWxjRGlzdGFuY2Uob0VudHJ5MS5rZXkudG9Mb3dlckNhc2UoKSwgc0tleXdvcmQpO1xuICAgICAgICB2YXIgdTIgPSBjYWxjRGlzdGFuY2Uob0VudHJ5Mi5rZXkudG9Mb3dlckNhc2UoKSwgc0tleXdvcmQpO1xuICAgICAgICByZXR1cm4gdTEgLSB1MjtcbiAgICB9KTtcbiAgICAvLyBsYXRlcjogaW4gY2FzZSBvZiBjb25mbGljdHMsIGFzayxcbiAgICAvLyBub3c6XG4gICAgdmFyIGRpc3QgPSBjYWxjRGlzdGFuY2Uob01hcFswXS5rZXkudG9Mb3dlckNhc2UoKSwgc0tleXdvcmQpO1xuICAgIGRlYnVnbG9nKCdiZXN0IGRpc3QnICsgZGlzdCArICcgLyAgJyArIGRpc3QgKiBzS2V5d29yZC5sZW5ndGggKyAnICcgKyBzS2V5d29yZCk7XG4gICAgaWYgKGRpc3QgPCAxNTApIHtcbiAgICAgICAgdmFyIG8xID0gT2JqZWN0LmFzc2lnbih7fSwgb0NvbnRleHQpO1xuICAgICAgICB2YXIgbzI7XG4gICAgICAgIG8xLmNvbnRleHQgPSBPYmplY3QuYXNzaWduKHt9LCBvMS5jb250ZXh0KTtcbiAgICAgICAgbzIgPSBvMTtcbiAgICAgICAgbzIuY29udGV4dCA9IE9iamVjdC5hc3NpZ24obzEuY29udGV4dCwgb01hcFswXS5jb250ZXh0KTtcbiAgICAgICAgcmV0dXJuIG8yO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cbi8qKlxuICogYSBmdW5jdGlvbiB0byBtYXRjaCBhIHVuaXQgdGVzdCB1c2luZyBsZXZlbnNodGVpbiBkaXN0YW5jZXNcbiAqIEBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gZm5GaW5kVW5pdFRlc3Qoc3N5c3RlbU9iamVjdElkLCBvQ29udGV4dCkge1xuICAgIHJldHVybiBmbkZpbmRNYXRjaChzc3lzdGVtT2JqZWN0SWQsIG9Db250ZXh0LCBvVW5pdFRlc3RzKTtcbn1cbmZ1bmN0aW9uIGZuRmluZFdpa2koc0tleXdvcmQsIG9Db250ZXh0KSB7XG4gICAgcmV0dXJuIGZuRmluZE1hdGNoKHNLZXl3b3JkLCBvQ29udGV4dCwgb1dpa2lzKTtcbn1cbnZhciBhU2hvd0VudGl0eUFjdGlvbnMgPSBbXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1JZDogJ3V2MicsXG4gICAgICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcbiAgICAgICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwJ1xuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXV2Mi53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvdWkyL3VzaGVsbC9zaGVsbHMvYWJhcC9GaW9yaUxhdW5jaHBhZC5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtSWQ6ICd1djInLFxuICAgICAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXG4gICAgICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscGQnXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdXYyLndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS9zYXAvYXJzcnZjX3VwYl9hZG1uL21haW4uaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbUlkOiAndTF5JyxcbiAgICAgICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxuICAgICAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHAnXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdTF5LndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS91aTIvdXNoZWxsL3NoZWxscy9hYmFwL0Zpb3JpTGF1bmNocGFkLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1JZDogJ3UxeScsXG4gICAgICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcbiAgICAgICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwZCdcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1MXkud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3NhcC9hcnNydmNfdXBiX2FkbW4vbWFpbi5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtSWQ6ICd1djInLFxuICAgICAgICAgICAgY2xpZW50OiAnMTIwJyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAnZmlvcmkgY2F0YWxvZycsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogLy4qLyxcbiAgICAgICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcbiAgICAgICAgICAgIHRvb2w6ICdGTFBEJ1xuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXV2Mi53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvc2FwL2Fyc3J2Y191cGJfYWRtbi9tYWluLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSNDQVRBTE9HOntzeXN0ZW1PYmplY3RJZH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtT2JqZWN0Q2F0ZWdvcnk6ICd1bml0JyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiBmbkZpbmRVbml0VGVzdFxuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MC97cGF0aH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtT2JqZWN0Q2F0ZWdvcnk6ICd1bml0IHRlc3QnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IGZuRmluZFVuaXRUZXN0XG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cDovL2xvY2FsaG9zdDo4MDgwL3twYXRofSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ3dpa2knLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IGZuRmluZFdpa2lcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwczovL3dpa2kud2RmLnNhcC5jb3JwL3twYXRofSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1JZDogJ0pJUkEnXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9qaXJhLndkZi5zYXAuY29ycDo4MDgwL1RJUENPUkVVSUlJJ1xuICAgICAgICB9XG4gICAgfVxuXTtcbi8vIGlmIFRPT0wgPSBKSVJBIHx8IFN5c3RlbUlkID0gSklSQSAtPiBTeXN0ZW1JZCA9IEpJUkFcbi8vXG4vL1xuZnVuY3Rpb24gc3RhcnRCcm93c2VyKHVybCkge1xuICAgIHZhciBjbWQgPSAnXCIlUHJvZ3JhbUZpbGVzKHg4NiklXFxcXEdvb2dsZVxcXFxDaHJvbWVcXFxcQXBwbGljYXRpb25cXFxcY2hyb21lLmV4ZVwiIC0taW5jb2duaXRvIC11cmwgXCInICsgdXJsICsgJ1wiJztcbiAgICBjaGlsZF9wcm9jZXNzXzEuZXhlYyhjbWQsIGZ1bmN0aW9uIChlcnJvciwgc3Rkb3V0LCBzdGRlcnIpIHtcbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiZXhlYyBlcnJvcjogXCIgKyBlcnJvcik7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZGVidWdsb2coXCJzdGRvdXQ6IFwiICsgc3Rkb3V0KTtcbiAgICAgICAgZGVidWdsb2coXCJzdGRlcnI6IFwiICsgc3RkZXJyKTtcbiAgICB9KTtcbn1cbi8vIHN0YXJ0U0FQR1VJXG4vLyAgIE46XFw+XCJjOlxcUHJvZ3JhbSBGaWxlcyAoeDg2KVxcU0FQXFxGcm9udEVuZFxcU0FQZ3VpXCJcXHNhcHNoY3V0LmV4ZSAgLXN5c3RlbT1VVjIgLWNsaWVudD0xMjAgLWNvbW1hbmQ9U0UzOCAtdHlwZT1UcmFuc2FjdGlvbiAtdXNlcj1BVVNFUlxuZnVuY3Rpb24gZXhwYW5kUGFyYW1ldGVyc0luVVJMKG9NZXJnZWRDb250ZXh0UmVzdWx0KSB7XG4gICAgdmFyIHB0biA9IG9NZXJnZWRDb250ZXh0UmVzdWx0LnJlc3VsdC5wYXR0ZXJuO1xuICAgIHB0biA9IGV4ZWN0ZW1wbGF0ZS5leHBhbmRUZW1wbGF0ZShvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0LCBwdG4pO1xuICAgIC8qICAgIE9iamVjdC5rZXlzKG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgICAgICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKCd7JyArIHNLZXkgKyAnfScsICdnJylcbiAgICAgICAgICBwdG4gPSBwdG4ucmVwbGFjZShyZWdleCwgb01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dFtzS2V5XSlcbiAgICAgICAgICBwdG4gPSBwdG4ucmVwbGFjZShyZWdleCwgb01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dFtzS2V5XSlcbiAgICAgICAgfSlcbiAgICAgICAgKi9cbiAgICByZXR1cm4gcHRuO1xufVxuZnVuY3Rpb24gZXhlY3V0ZVN0YXJ0dXAob01lcmdlZENvbnRleHRSZXN1bHQpIHtcbiAgICBpZiAob01lcmdlZENvbnRleHRSZXN1bHQucmVzdWx0LnR5cGUgPT09ICdVUkwnKSB7XG4gICAgICAgIHZhciBwdG4gPSBleHBhbmRQYXJhbWV0ZXJzSW5VUkwob01lcmdlZENvbnRleHRSZXN1bHQpO1xuICAgICAgICBzdGFydEJyb3dzZXIocHRuKTtcbiAgICAgICAgcmV0dXJuIHB0bjtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHZhciBzID0gKFwiRG9uJ3Qga25vdyBob3cgdG8gc3RhcnQgXCIgKyBvTWVyZ2VkQ29udGV4dFJlc3VsdC5yZXN1bHQudHlwZSArICdcXG4gZm9yIFwiJyArIG9NZXJnZWRDb250ZXh0UmVzdWx0LnF1ZXJ5ICsgJ1wiJyk7XG4gICAgICAgIGRlYnVnbG9nKHMpO1xuICAgICAgICByZXR1cm4gcztcbiAgICB9XG59XG5mdW5jdGlvbiBuck1hdGNoZXMoYU9iamVjdCwgb0NvbnRleHQpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoYU9iamVjdCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQ29udGV4dCwga2V5KSkge1xuICAgICAgICAgICAgcHJldiA9IHByZXYgKyAxO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIDApO1xufVxuZnVuY3Rpb24gbnJOb01hdGNoZXMoYU9iamVjdCwgb0NvbnRleHQpIHtcbiAgICB2YXIgbm9NYXRjaEEgPSBPYmplY3Qua2V5cyhhT2JqZWN0KS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xuICAgICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvQ29udGV4dCwga2V5KSkge1xuICAgICAgICAgICAgcHJldiA9IHByZXYgKyAxO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIDApO1xuICAgIHZhciBub01hdGNoQiA9IE9iamVjdC5rZXlzKG9Db250ZXh0KS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xuICAgICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChhT2JqZWN0LCBrZXkpKSB7XG4gICAgICAgICAgICBwcmV2ID0gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG4gICAgcmV0dXJuIG5vTWF0Y2hBICsgbm9NYXRjaEI7XG59XG5mdW5jdGlvbiBzYW1lT3JTdGFyKHMxLCBzMiwgb0VudGl0eSkge1xuICAgIHJldHVybiBzMSA9PT0gczIgfHxcbiAgICAgICAgKHMxID09PSB1bmRlZmluZWQgJiYgczIgPT09IG51bGwpIHx8XG4gICAgICAgICgoczIgaW5zdGFuY2VvZiBSZWdFeHApICYmIHMyLmV4ZWMoczEpICE9PSBudWxsKSB8fFxuICAgICAgICAoKHR5cGVvZiBzMiA9PT0gJ2Z1bmN0aW9uJyAmJiBzMSkgJiYgczIoczEsIG9FbnRpdHkpKTtcbn1cbmZ1bmN0aW9uIHNhbWVPclN0YXJFbXB0eShzMSwgczIsIG9FbnRpdHkpIHtcbiAgICBpZiAoczEgPT09IHVuZGVmaW5lZCAmJiBzMiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoczIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHMxID09PSBzMiB8fFxuICAgICAgICAoKHMyIGluc3RhbmNlb2YgUmVnRXhwKSAmJiBzMi5leGVjKHMxKSAhPT0gbnVsbCkgfHxcbiAgICAgICAgKCh0eXBlb2YgczIgPT09ICdmdW5jdGlvbicgJiYgczEpICYmIHMyKHMxLCBvRW50aXR5KSk7XG59XG5mdW5jdGlvbiBmaWx0ZXJTaG93RW50aXR5T2xkKG9Db250ZXh0LCBhU2hvd0VudGl0eSkge1xuICAgIHZhciBhRmlsdGVyZWQ7XG4gICAgT2JqZWN0LmtleXMob0NvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgICAgaWYgKG9Db250ZXh0W3NLZXldID09PSBudWxsKSB7XG4gICAgICAgICAgICBvQ29udGV4dFtzS2V5XSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIC8vIGZpbHRlciBjb250ZXh0LCBhbWVuZGluZyBzeW5vbnltc1xuICAgIGFGaWx0ZXJlZCA9IGFTaG93RW50aXR5LmZpbHRlcihmdW5jdGlvbiAob1Nob3dFbnRpdHkpIHtcbiAgICAgICAgLy8gICAgICAgY29uc29sZS5sb2coXCIuLi5cIilcbiAgICAgICAgLy8gICAgICBjb25zb2xlLmxvZyhvU2hvd0VudGl0eS5jb250ZXh0LnRvb2wgKyBcIiBcIiArIG9Db250ZXh0LnRvb2wgKyBcIlxcblwiKVxuICAgICAgICAvLyAgICAgIGNvbnNvbGUubG9nKG9TaG93RW50aXR5LmNvbnRleHQuY2xpZW50ICsgXCIgXCIgKyBvQ29udGV4dC5jbGllbnQgK1wiOlwiICsgc2FtZU9yU3RhcihvQ29udGV4dC5jbGllbnQsb1Nob3dFbnRpdHkuY29udGV4dC5jbGllbnQpICsgXCJcXG5cIilcbiAgICAgICAgLy8gIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KG9TaG93RW50aXR5LmNvbnRleHQpICsgXCJcXG5cIiArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0LmNsaWVudCkgKyBcIlxcblwiKVxuICAgICAgICByZXR1cm4gc2FtZU9yU3RhcihvU2hvd0VudGl0eS5jb250ZXh0LnN5c3RlbUlkLCBvQ29udGV4dC5zeXN0ZW1JZCwgb0NvbnRleHQpICYmXG4gICAgICAgICAgICBzYW1lT3JTdGFyKG9Db250ZXh0LnRvb2wsIG9TaG93RW50aXR5LmNvbnRleHQudG9vbCwgb0NvbnRleHQpICYmXG4gICAgICAgICAgICBzYW1lT3JTdGFyKG9Db250ZXh0LmNsaWVudCwgb1Nob3dFbnRpdHkuY29udGV4dC5jbGllbnQsIG9Db250ZXh0KSAmJlxuICAgICAgICAgICAgc2FtZU9yU3RhckVtcHR5KG9Db250ZXh0LnN5c3RlbU9iamVjdENhdGVnb3J5LCBvU2hvd0VudGl0eS5jb250ZXh0LnN5c3RlbU9iamVjdENhdGVnb3J5LCBvQ29udGV4dCkgJiZcbiAgICAgICAgICAgIHNhbWVPclN0YXJFbXB0eShvQ29udGV4dC5zeXN0ZW1PYmplY3RJZCwgb1Nob3dFbnRpdHkuY29udGV4dC5zeXN0ZW1PYmplY3RJZCwgb0NvbnRleHQpO1xuICAgICAgICAvLyAgICAgICYmIG9TaG93RW50aXR5LmNvbnRleHQudG9vbCA9PT0gb0NvbnRleHQudG9vbFxuICAgIH0pO1xuICAgIC8vICBjb25zb2xlLmxvZyhhRmlsdGVyZWQubGVuZ3RoKVxuICAgIC8vIG1hdGNoIG90aGVyIGNvbnRleHQgcGFyYW1ldGVyc1xuICAgIGFGaWx0ZXJlZC5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHZhciBuck1hdGNoZXNBID0gbnJNYXRjaGVzKGEuY29udGV4dCwgb0NvbnRleHQpO1xuICAgICAgICB2YXIgbnJNYXRjaGVzQiA9IG5yTWF0Y2hlcyhiLmNvbnRleHQsIG9Db250ZXh0KTtcbiAgICAgICAgdmFyIG5yTm9NYXRjaGVzQSA9IG5yTm9NYXRjaGVzKGEuY29udGV4dCwgb0NvbnRleHQpO1xuICAgICAgICB2YXIgbnJOb01hdGNoZXNCID0gbnJOb01hdGNoZXMoYi5jb250ZXh0LCBvQ29udGV4dCk7XG4gICAgICAgIC8vICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYS5jb250ZXh0KSlcbiAgICAgICAgLy8gICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShiLmNvbnRleHQpKVxuICAgICAgICAvLyAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KG9Db250ZXh0KSlcbiAgICAgICAgdmFyIHJlcyA9IC0obnJNYXRjaGVzQSAtIG5yTWF0Y2hlc0IpICogMTAwICsgKG5yTm9NYXRjaGVzQSAtIG5yTm9NYXRjaGVzQik7XG4gICAgICAgIC8vICAgICBjb25zb2xlLmxvZyhcImRpZmYgXCIgKyByZXMpXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfSk7XG4gICAgaWYgKGFGaWx0ZXJlZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgZGVidWdsb2coJ25vIHRhcmdldCBmb3Igc2hvd0VudGl0eSAnICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHQpKTtcbiAgICB9XG4gICAgLy8gY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYUZpbHRlcmVkLHVuZGVmaW5lZCwyKSlcbiAgICBpZiAoYUZpbHRlcmVkWzBdKSB7XG4gICAgICAgIC8vIGV4ZWN1dGUgYWxsIGZ1bmN0aW9uc1xuICAgICAgICB2YXIgb01hdGNoID0gYUZpbHRlcmVkWzBdO1xuICAgICAgICB2YXIgb01lcmdlZCA9IHtcbiAgICAgICAgICAgIGNvbnRleHQ6IHt9XG4gICAgICAgIH07XG4gICAgICAgIG9NZXJnZWQuY29udGV4dCA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9NZXJnZWQuY29udGV4dCwgYUZpbHRlcmVkWzBdLmNvbnRleHQsIG9Db250ZXh0KTtcbiAgICAgICAgb01lcmdlZCA9IEFueU9iamVjdC5hc3NpZ24ob01lcmdlZCwge1xuICAgICAgICAgICAgcmVzdWx0OiBhRmlsdGVyZWRbMF0ucmVzdWx0XG4gICAgICAgIH0pO1xuICAgICAgICBPYmplY3Qua2V5cyhvTWF0Y2guY29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBvTWF0Y2guY29udGV4dFtzS2V5XSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIGRlYnVnbG9nKCdOb3cgcmV0cm9maXR0aW5nIDonICsgc0tleSArICcgLSAnICsgb0NvbnRleHRbc0tleV0pO1xuICAgICAgICAgICAgICAgIG9NZXJnZWQgPSBvTWF0Y2guY29udGV4dFtzS2V5XShvQ29udGV4dFtzS2V5XSwgb01lcmdlZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gb01lcmdlZDtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59XG52YXIgaW5wdXRGaWx0ZXIgPSByZXF1aXJlKCcuL2lucHV0RmlsdGVyJyk7XG5mdW5jdGlvbiBmaWx0ZXJTaG93RW50aXR5KG9Db250ZXh0LCBhU2hvd0VudGl0eUFjdGlvbnMpIHtcbiAgICBPYmplY3Qua2V5cyhvQ29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xuICAgICAgICBpZiAob0NvbnRleHRbc0tleV0gPT09IG51bGwpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBvQ29udGV4dFtzS2V5XTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHZhciByZXMgPSBpbnB1dEZpbHRlci5hcHBseVJ1bGVzUGlja0ZpcnN0KG9Db250ZXh0KTtcbiAgICBpZiAoIXJlcykge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBkZWJ1Z2xvZyhcIioqIGFmdGVyIGZpbHRlciBydWxlc1wiICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICByZXR1cm4gZmlsdGVyU2hvd0VudGl0eU9sZChyZXMsIGFTaG93RW50aXR5QWN0aW9ucyk7XG59XG5mdW5jdGlvbiBleGVjU2hvd0VudGl0eShvRW50aXR5KSB7XG4gICAgdmFyIG1lcmdlZCA9IGZpbHRlclNob3dFbnRpdHkob0VudGl0eSwgYVNob3dFbnRpdHlBY3Rpb25zKTtcbiAgICBpZiAobWVyZ2VkKSB7XG4gICAgICAgIHJldHVybiBleGVjdXRlU3RhcnR1cChtZXJnZWQpO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cbi8vIEU6XFxwcm9qZWN0c1xcbm9kZWpzXFxib3RidWlsZGVyXFxzYW1wbGVib3Q+XCIlUHJvZ3JhbUZpbGVzKHg4NiklXFxHb29nbGVcXENocm9tZVxcQXBwbGljYXRpb25cXGNocm9tZS5leGVcIiAtLWluY29nbml0byAtdXJsIHd3dy5zcGllZ2VsLmRlXG5leHBvcnRzLmRpc3BhdGNoZXIgPSB7XG4gICAgZXhlY1Nob3dFbnRpdHk6IGV4ZWNTaG93RW50aXR5LFxuICAgIF90ZXN0OiB7XG4gICAgICAgIHNhbWVPclN0YXI6IHNhbWVPclN0YXIsXG4gICAgICAgIG5yTWF0Y2hlczogbnJNYXRjaGVzLFxuICAgICAgICBuck5vTWF0Y2hlczogbnJOb01hdGNoZXMsXG4gICAgICAgIGV4cGFuZFBhcmFtZXRlcnNJblVSTDogZXhwYW5kUGFyYW1ldGVyc0luVVJMLFxuICAgICAgICBmaWx0ZXJTaG93RW50aXR5OiBmaWx0ZXJTaG93RW50aXR5LFxuICAgICAgICBmbkZpbmRVbml0VGVzdDogZm5GaW5kVW5pdFRlc3QsXG4gICAgICAgIGNhbGNEaXN0YW5jZTogY2FsY0Rpc3RhbmNlLFxuICAgICAgICBfYVNob3dFbnRpdHlBY3Rpb25zOiBhU2hvd0VudGl0eUFjdGlvbnNcbiAgICB9XG59O1xuLy9leHBvcnRzIGRpc3BhdGNoZXI7XG4vL21vZHVsZS5leHBvcnRzID0gZGlzcGF0Y2hlclxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
