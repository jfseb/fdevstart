/**
 * @file
 * @module jfseb.fdevstart.dispatcher
 * @copyright (c) 2016 Gerd Forstmann
 */
"use strict";

var AnyObject = Object;
var distance = require("abot_stringdist");
var debug = require("debug");
var debuglog = debug('dispatcher');
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
/*
  export function executeStartup (oMergedContextResult) {
    if (oMergedContextResult.result.type === 'URL') {
      var ptn = expandParametersInURL(oMergedContextResult)
      exec.startBrowser(ptn)
      return ptn
    } else {
      var s = ("Don't know how to start " + oMergedContextResult.result.type + '\n for "' + oMergedContextResult.query + '"')
      debuglog(s)
      return s
    }
  }
*/
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
/*
  function execShowEntity (oEntity) {
    var merged = filterShowEntity(oEntity, aShowEntityActions)
    if (merged) {
      return executeStartup(merged)
    }
    return null
  }
*/
// E:\projects\nodejs\botbuilder\samplebot>"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --incognito -url www.spiegel.de
exports.dispatcher = {
    //    execShowEntity: execShowEntity,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9kaXNwYXRjaGVyLnRzIiwibWF0Y2gvZGlzcGF0Y2hlci5qcyJdLCJuYW1lcyI6WyJBbnlPYmplY3QiLCJPYmplY3QiLCJkaXN0YW5jZSIsInJlcXVpcmUiLCJkZWJ1ZyIsImRlYnVnbG9nIiwiZXhlY3RlbXBsYXRlIiwibWF0Y2hkYXRhIiwiQWxnb2wiLCJvVW5pdFRlc3RzIiwib1dpa2lzIiwiY2FsY0Rpc3RhbmNlIiwic1RleHQxIiwic1RleHQyIiwidG9Mb3dlckNhc2UiLCJmbkZpbmRNYXRjaCIsInNLZXl3b3JkIiwib0NvbnRleHQiLCJvTWFwIiwic0tleXdvcmRMYyIsInNvcnQiLCJvRW50cnkxIiwib0VudHJ5MiIsInUxIiwia2V5IiwidTIiLCJkaXN0IiwiQ3V0b2ZmX1dvcmRNYXRjaCIsIm8xIiwiYXNzaWduIiwibzIiLCJjb250ZXh0IiwiZm5GaW5kVW5pdFRlc3QiLCJzc3lzdGVtT2JqZWN0SWQiLCJmbkZpbmRXaWtpIiwiYVNob3dFbnRpdHlBY3Rpb25zIiwic3lzdGVtSWQiLCJjbGllbnQiLCJzeXN0ZW10eXBlIiwic3lzdGVtT2JqZWN0SWQiLCJyZXN1bHQiLCJ0eXBlIiwicGF0dGVybiIsInN5c3RlbU9iamVjdENhdGVnb3J5IiwidG9vbCIsImV4cGFuZFBhcmFtZXRlcnNJblVSTCIsIm9NZXJnZWRDb250ZXh0UmVzdWx0IiwicHRuIiwiZXhwYW5kVGVtcGxhdGUiLCJuck1hdGNoZXMiLCJhT2JqZWN0Iiwia2V5cyIsInJlZHVjZSIsInByZXYiLCJwcm90b3R5cGUiLCJoYXNPd25Qcm9wZXJ0eSIsImNhbGwiLCJuck5vTWF0Y2hlcyIsIm5vTWF0Y2hBIiwibm9NYXRjaEIiLCJzYW1lT3JTdGFyIiwiczEiLCJzMiIsIm9FbnRpdHkiLCJ1bmRlZmluZWQiLCJSZWdFeHAiLCJleGVjIiwic2FtZU9yU3RhckVtcHR5IiwiZmlsdGVyU2hvd0VudGl0eU9sZCIsImFTaG93RW50aXR5IiwiYUZpbHRlcmVkIiwiZm9yRWFjaCIsInNLZXkiLCJmaWx0ZXIiLCJvU2hvd0VudGl0eSIsImEiLCJiIiwibnJNYXRjaGVzQSIsIm5yTWF0Y2hlc0IiLCJuck5vTWF0Y2hlc0EiLCJuck5vTWF0Y2hlc0IiLCJyZXMiLCJsZW5ndGgiLCJKU09OIiwic3RyaW5naWZ5Iiwib01hdGNoIiwib01lcmdlZCIsImlucHV0RmlsdGVyIiwiZmlsdGVyU2hvd0VudGl0eSIsImFwcGx5UnVsZXNQaWNrRmlyc3QiLCJleHBvcnRzIiwiZGlzcGF0Y2hlciIsIl90ZXN0IiwiX2FTaG93RW50aXR5QWN0aW9ucyJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7O0FDS0E7O0FEUUEsSUFBSUEsWUFBa0JDLE1BQXRCO0FBRUEsSUFBQUMsV0FBQUMsUUFBQSxpQkFBQSxDQUFBO0FBRUEsSUFBQUMsUUFBQUQsUUFBQSxPQUFBLENBQUE7QUFDQSxJQUFNRSxXQUFXRCxNQUFNLFlBQU4sQ0FBakI7QUFHQTtBQUNBO0FBRUEsSUFBQUUsZUFBQUgsUUFBQSxzQkFBQSxDQUFBO0FBRUU7QUFDRixJQUFBSSxZQUFBSixRQUFBLGFBQUEsQ0FBQTtBQUVBLElBQUFLLFFBQUFMLFFBQUEsZ0JBQUEsQ0FBQTtBQUVBLElBQU1NLGFBQWFGLFVBQVVFLFVBQTdCO0FBQ0EsSUFBTUMsU0FBU0gsVUFBVUcsTUFBekI7QUFFRSxTQUFBQyxZQUFBLENBQXVCQyxNQUF2QixFQUErQkMsTUFBL0IsRUFBcUM7QUFDbkMsV0FBT1gsU0FBU1MsWUFBVCxDQUFzQkMsT0FBT0UsV0FBUCxFQUF0QixFQUE0Q0QsTUFBNUMsQ0FBUDtBQUNBOzs7Ozs7QUFNRDtBQUVELFNBQUFFLFdBQUEsQ0FBc0JDLFFBQXRCLEVBQWdDQyxRQUFoQyxFQUEwQ0MsSUFBMUMsRUFBOEM7QUFDNUM7QUFDQTtBQUNBLFFBQUlDLGFBQWFILFNBQVNGLFdBQVQsRUFBakI7QUFDQUksU0FBS0UsSUFBTCxDQUFVLFVBQVVDLE9BQVYsRUFBbUJDLE9BQW5CLEVBQTBCO0FBQ2xDLFlBQUlDLEtBQUtaLGFBQWFVLFFBQVFHLEdBQXJC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QUNFN0Usc0JBQWNBLFlBUFQ7QUFRTGtGLDZCQUFxQjFEO0FBUmhCO0FBRmlCLENBQWI7QUFjYjtBQUVBIiwiZmlsZSI6Im1hdGNoL2Rpc3BhdGNoZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQGZpbGVcclxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuZGlzcGF0Y2hlclxyXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXHJcbiAqL1xyXG5cclxuXHJcbi8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2xpYi9ub2RlLTQuZC50c1wiIC8+XHJcblxyXG5kZWNsYXJlIGludGVyZmFjZSBPYmplY3RDb25zdHJ1Y3RvciB7XHJcbiAgICBhc3NpZ24odGFyZ2V0OiBhbnksIC4uLnNvdXJjZXM6IGFueVtdKTogYW55O1xyXG59XHJcblxyXG52YXIgQW55T2JqZWN0ID0gKDxhbnk+T2JqZWN0KTtcclxuXHJcbmltcG9ydCAqIGFzIGRpc3RhbmNlIGZyb20gICdhYm90X3N0cmluZ2Rpc3QnO1xyXG5cclxuaW1wb3J0ICogYXMgZGVidWcgZnJvbSAnZGVidWcnO1xyXG5jb25zdCBkZWJ1Z2xvZyA9IGRlYnVnKCdkaXNwYXRjaGVyJylcclxuXHJcbmltcG9ydCB7IGV4ZWMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcclxuLy8gIHZhciBleGVjID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpLmV4ZWNcclxuLy8gIHZhciBsZXZlbiA9IHJlcXVpcmUoJy4uL3V0aWxzL2RhbWVyYXVMZXZlbnNodGVpbi5qcycpLmxldmVuc2h0ZWluXHJcblxyXG5pbXBvcnQgKiBhcyBleGVjdGVtcGxhdGUgZnJvbSAnLi4vZXhlYy9leGVjdGVtcGxhdGUnO1xyXG5cclxuICAvL3ZhciBsZXZlbiA9IHJlcXVpcmUoJy4uL3V0aWxzL2RhbWVyYXVMZXZlbnNodGVpbi5qcycpXHJcbmltcG9ydCAqIGFzIG1hdGNoZGF0YSBmcm9tICcuL21hdGNoZGF0YSc7XHJcblxyXG5pbXBvcnQgKiBhcyBBbGdvbCBmcm9tICcuLi9tYXRjaC9hbGdvbCc7XHJcblxyXG5jb25zdCBvVW5pdFRlc3RzID0gbWF0Y2hkYXRhLm9Vbml0VGVzdHNcclxuY29uc3Qgb1dpa2lzID0gbWF0Y2hkYXRhLm9XaWtpc1xyXG5cclxuICBmdW5jdGlvbiBjYWxjRGlzdGFuY2UgKHNUZXh0MSwgc1RleHQyKSB7XHJcbiAgICByZXR1cm4gZGlzdGFuY2UuY2FsY0Rpc3RhbmNlKHNUZXh0MS50b0xvd2VyQ2FzZSgpLCBzVGV4dDIpO1xyXG4gICAgLypcclxuICAgIGRlYnVnbG9nKFwibGVuZ3RoMlwiICsgc1RleHQxICsgXCIgLSBcIiArIHNUZXh0MilcclxuICAgIHZhciBhMCA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCksIHNUZXh0MilcclxuICAgIHZhciBhID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnRvTG93ZXJDYXNlKCksIHNUZXh0MilcclxuICAgIHJldHVybiBhMCAqIDUwMCAvIHNUZXh0Mi5sZW5ndGggKyBhXHJcbiAgICAqL1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZm5GaW5kTWF0Y2ggKHNLZXl3b3JkLCBvQ29udGV4dCwgb01hcCkge1xyXG4gICAgLy8gcmV0dXJuIGEgYmV0dGVyIGNvbnRleHQgaWYgdGhlcmUgaXMgYSBtYXRjaFxyXG4gICAgLy8gc0tleXdvcmQgPSBzS2V5d29yZC50b0xvd2VyQ2FzZSgpO1xyXG4gICAgdmFyIHNLZXl3b3JkTGMgPSBzS2V5d29yZC50b0xvd2VyQ2FzZSgpO1xyXG4gICAgb01hcC5zb3J0KGZ1bmN0aW9uIChvRW50cnkxLCBvRW50cnkyKSB7XHJcbiAgICAgIHZhciB1MSA9IGNhbGNEaXN0YW5jZShvRW50cnkxLmtleSwgc0tleXdvcmRMYylcclxuICAgICAgdmFyIHUyID0gY2FsY0Rpc3RhbmNlKG9FbnRyeTIua2V5LCBzS2V5d29yZExjKVxyXG4gICAgICByZXR1cm4gdTIgLSB1MTtcclxuICAgIH0pXHJcbiAgICAvLyBsYXRlcjogaW4gY2FzZSBvZiBjb25mbGljdHMsIGFzayxcclxuICAgIC8vIG5vdzpcclxuICAgIHZhciBkaXN0ID0gY2FsY0Rpc3RhbmNlKG9NYXBbMF0ua2V5LCBzS2V5d29yZExjKVxyXG4gICAgZGVidWdsb2coJ2Jlc3QgZGlzdCcgKyBkaXN0ICsgJyAvICAnICsgb01hcFswXS5rZXkgKyAnICcgKyBzS2V5d29yZClcclxuICAgIGlmIChkaXN0ID4gQWxnb2wuQ3V0b2ZmX1dvcmRNYXRjaCkge1xyXG4gICAgICB2YXIgbzEgPSAoPGFueT5PYmplY3QpLmFzc2lnbih7fSwgb0NvbnRleHQpXHJcbiAgICAgIHZhciBvMlxyXG4gICAgICBvMS5jb250ZXh0ID0gKDxhbnk+T2JqZWN0KS5hc3NpZ24oe30sIG8xLmNvbnRleHQpXHJcbiAgICAgIG8yID0gbzFcclxuICAgICAgbzIuY29udGV4dCA9ICg8YW55Pk9iamVjdCkuYXNzaWduKG8xLmNvbnRleHQsIG9NYXBbMF0uY29udGV4dClcclxuICAgICAgcmV0dXJuIG8yXHJcbiAgICB9XHJcbiAgICByZXR1cm4gbnVsbFxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogYSBmdW5jdGlvbiB0byBtYXRjaCBhIHVuaXQgdGVzdCB1c2luZyBsZXZlbnNodGVpbiBkaXN0YW5jZXNcclxuICAgKiBAcHVibGljXHJcbiAgICovXHJcbiAgZnVuY3Rpb24gZm5GaW5kVW5pdFRlc3QgKHNzeXN0ZW1PYmplY3RJZCwgb0NvbnRleHQpIHtcclxuICAgIHJldHVybiBmbkZpbmRNYXRjaChzc3lzdGVtT2JqZWN0SWQsIG9Db250ZXh0LCBvVW5pdFRlc3RzKVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZm5GaW5kV2lraSAoc0tleXdvcmQsIG9Db250ZXh0KSB7XHJcbiAgICByZXR1cm4gZm5GaW5kTWF0Y2goc0tleXdvcmQsIG9Db250ZXh0LCBvV2lraXMpXHJcbiAgfVxyXG5cclxuICB2YXIgYVNob3dFbnRpdHlBY3Rpb25zID0gW1xyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtSWQ6ICd1djInLFxyXG4gICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxyXG4gICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscCdcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXV2Mi53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvdWkyL3VzaGVsbC9zaGVsbHMvYWJhcC9GaW9yaUxhdW5jaHBhZC5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1JZDogJ3V2MicsXHJcbiAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXHJcbiAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwZCdcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXV2Mi53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvc2FwL2Fyc3J2Y191cGJfYWRtbi9tYWluLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbUlkOiAndTF5JyxcclxuICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcclxuICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHAnXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1MXkud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3VpMi91c2hlbGwvc2hlbGxzL2FiYXAvRmlvcmlMYXVuY2hwYWQuaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtSWQ6ICd1MXknLFxyXG4gICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxyXG4gICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscGQnXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1MXkud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3NhcC9hcnNydmNfdXBiX2FkbW4vbWFpbi5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1JZDogJ3V2MicsXHJcbiAgICAgICAgY2xpZW50OiAnMTIwJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ2Zpb3JpIGNhdGFsb2cnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiAvLiovLFxyXG4gICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcclxuICAgICAgICB0b29sOiAnRkxQRCdcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXV2Mi53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvc2FwL2Fyc3J2Y191cGJfYWRtbi9tYWluLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSNDQVRBTE9HOntzeXN0ZW1PYmplY3RJZH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ3VuaXQnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiBmbkZpbmRVbml0VGVzdFxyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cDovL2xvY2FsaG9zdDo4MDgwL3twYXRofSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ3VuaXQgdGVzdCcsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IGZuRmluZFVuaXRUZXN0XHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwOi8vbG9jYWxob3N0OjgwODAve3BhdGh9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtT2JqZWN0Q2F0ZWdvcnk6ICd3aWtpJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogZm5GaW5kV2lraVxyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly93aWtpLndkZi5zYXAuY29ycC97cGF0aH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1JZDogJ0pJUkEnXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL2ppcmEud2RmLnNhcC5jb3JwOjgwODAvVElQQ09SRVVJSUknXHJcbiAgICAgIH1cclxuICAgIH1cclxuICBdXHJcblxyXG4gIC8vIGlmIFRPT0wgPSBKSVJBIHx8IFN5c3RlbUlkID0gSklSQSAtPiBTeXN0ZW1JZCA9IEpJUkFcclxuICAvL1xyXG4gIC8vXHJcblxyXG4gIC8vIHN0YXJ0U0FQR1VJXHJcblxyXG4gIC8vICAgTjpcXD5cImM6XFxQcm9ncmFtIEZpbGVzICh4ODYpXFxTQVBcXEZyb250RW5kXFxTQVBndWlcIlxcc2Fwc2hjdXQuZXhlICAtc3lzdGVtPVVWMiAtY2xpZW50PTEyMCAtY29tbWFuZD1TRTM4IC10eXBlPVRyYW5zYWN0aW9uIC11c2VyPUFVU0VSXHJcblxyXG4gIGZ1bmN0aW9uIGV4cGFuZFBhcmFtZXRlcnNJblVSTCAob01lcmdlZENvbnRleHRSZXN1bHQpIHtcclxuICAgIHZhciBwdG4gPSBvTWVyZ2VkQ29udGV4dFJlc3VsdC5yZXN1bHQucGF0dGVyblxyXG4gICAgcHRuID0gZXhlY3RlbXBsYXRlLmV4cGFuZFRlbXBsYXRlKG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHQsIHB0bik7XHJcbi8qICAgIE9iamVjdC5rZXlzKG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcclxuICAgICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cCgneycgKyBzS2V5ICsgJ30nLCAnZycpXHJcbiAgICAgIHB0biA9IHB0bi5yZXBsYWNlKHJlZ2V4LCBvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0W3NLZXldKVxyXG4gICAgICBwdG4gPSBwdG4ucmVwbGFjZShyZWdleCwgb01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dFtzS2V5XSlcclxuICAgIH0pXHJcbiAgICAqL1xyXG4gICAgcmV0dXJuIHB0blxyXG4gIH1cclxuXHJcbi8qXHJcbiAgZXhwb3J0IGZ1bmN0aW9uIGV4ZWN1dGVTdGFydHVwIChvTWVyZ2VkQ29udGV4dFJlc3VsdCkge1xyXG4gICAgaWYgKG9NZXJnZWRDb250ZXh0UmVzdWx0LnJlc3VsdC50eXBlID09PSAnVVJMJykge1xyXG4gICAgICB2YXIgcHRuID0gZXhwYW5kUGFyYW1ldGVyc0luVVJMKG9NZXJnZWRDb250ZXh0UmVzdWx0KVxyXG4gICAgICBleGVjLnN0YXJ0QnJvd3NlcihwdG4pXHJcbiAgICAgIHJldHVybiBwdG5cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHZhciBzID0gKFwiRG9uJ3Qga25vdyBob3cgdG8gc3RhcnQgXCIgKyBvTWVyZ2VkQ29udGV4dFJlc3VsdC5yZXN1bHQudHlwZSArICdcXG4gZm9yIFwiJyArIG9NZXJnZWRDb250ZXh0UmVzdWx0LnF1ZXJ5ICsgJ1wiJylcclxuICAgICAgZGVidWdsb2cocylcclxuICAgICAgcmV0dXJuIHNcclxuICAgIH1cclxuICB9XHJcbiovXHJcblxyXG4gIGZ1bmN0aW9uIG5yTWF0Y2hlcyAoYU9iamVjdCwgb0NvbnRleHQpIHtcclxuICAgIHJldHVybiBPYmplY3Qua2V5cyhhT2JqZWN0KS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xyXG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9Db250ZXh0LCBrZXkpKSB7XHJcbiAgICAgICAgcHJldiA9IHByZXYgKyAxXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHByZXZcclxuICAgIH0sIDApXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBuck5vTWF0Y2hlcyAoYU9iamVjdCwgb0NvbnRleHQpIHtcclxuICAgIHZhciBub01hdGNoQSA9IE9iamVjdC5rZXlzKGFPYmplY3QpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XHJcbiAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9Db250ZXh0LCBrZXkpKSB7XHJcbiAgICAgICAgcHJldiA9IHByZXYgKyAxXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHByZXZcclxuICAgIH0sIDApXHJcbiAgICB2YXIgbm9NYXRjaEIgPSBPYmplY3Qua2V5cyhvQ29udGV4dCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYU9iamVjdCwga2V5KSkge1xyXG4gICAgICAgIHByZXYgPSBwcmV2ICsgMVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBwcmV2XHJcbiAgICB9LCAwKVxyXG4gICAgcmV0dXJuIG5vTWF0Y2hBICsgbm9NYXRjaEJcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHNhbWVPclN0YXIgKHMxIDogc3RyaW5nLCBzMiA6IHN0cmluZyB8IFJlZ0V4cCB8IEZ1bmN0aW9uICwgb0VudGl0eSkge1xyXG4gICAgcmV0dXJuIHMxID09PSBzMiB8fFxyXG4gICAgICAoczEgPT09IHVuZGVmaW5lZCAmJiBzMiA9PT0gbnVsbCkgfHxcclxuICAgICAgKChzMiBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgczIuZXhlYyhzMSkgIT09IG51bGwpIHx8XHJcbiAgICAgICgodHlwZW9mIHMyID09PSAnZnVuY3Rpb24nICYmIHMxKSAmJiBzMihzMSwgb0VudGl0eSkpXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBzYW1lT3JTdGFyRW1wdHkgKHMxIDogc3RyaW5nLCBzMiA6IHN0cmluZyB8IFJlZ0V4cCB8IEZ1bmN0aW9uLCBvRW50aXR5KSB7XHJcbiAgICBpZiAoczEgPT09IHVuZGVmaW5lZCAmJiBzMiA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9XHJcbiAgICBpZiAoczIgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzMSA9PT0gczIgfHxcclxuICAgICAgKChzMiBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgczIuZXhlYyhzMSkgIT09IG51bGwpIHx8XHJcbiAgICAgICgodHlwZW9mIHMyID09PSAnZnVuY3Rpb24nICYmIHMxKSAmJiBzMihzMSwgb0VudGl0eSkpXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBmaWx0ZXJTaG93RW50aXR5T2xkIChvQ29udGV4dCwgYVNob3dFbnRpdHkpIHtcclxuICAgIHZhciBhRmlsdGVyZWRcclxuICAgIE9iamVjdC5rZXlzKG9Db250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XHJcbiAgICAgIGlmIChvQ29udGV4dFtzS2V5XSA9PT0gbnVsbCkge1xyXG4gICAgICAgIG9Db250ZXh0W3NLZXldID0gdW5kZWZpbmVkXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgICAvLyBmaWx0ZXIgY29udGV4dCwgYW1lbmRpbmcgc3lub255bXNcclxuXHJcblxyXG4gICAgYUZpbHRlcmVkID0gYVNob3dFbnRpdHkuZmlsdGVyKGZ1bmN0aW9uIChvU2hvd0VudGl0eSkge1xyXG4gICAgICAvLyAgICAgICBjb25zb2xlLmxvZyhcIi4uLlwiKVxyXG4gICAgICAvLyAgICAgIGNvbnNvbGUubG9nKG9TaG93RW50aXR5LmNvbnRleHQudG9vbCArIFwiIFwiICsgb0NvbnRleHQudG9vbCArIFwiXFxuXCIpXHJcbiAgICAgIC8vICAgICAgY29uc29sZS5sb2cob1Nob3dFbnRpdHkuY29udGV4dC5jbGllbnQgKyBcIiBcIiArIG9Db250ZXh0LmNsaWVudCArXCI6XCIgKyBzYW1lT3JTdGFyKG9Db250ZXh0LmNsaWVudCxvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCkgKyBcIlxcblwiKVxyXG4gICAgICAvLyAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkob1Nob3dFbnRpdHkuY29udGV4dCkgKyBcIlxcblwiICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHQuY2xpZW50KSArIFwiXFxuXCIpXHJcblxyXG4gICAgICByZXR1cm4gc2FtZU9yU3RhcihvU2hvd0VudGl0eS5jb250ZXh0LnN5c3RlbUlkLCBvQ29udGV4dC5zeXN0ZW1JZCwgb0NvbnRleHQpICYmXHJcbiAgICAgICAgc2FtZU9yU3RhcihvQ29udGV4dC50b29sLCBvU2hvd0VudGl0eS5jb250ZXh0LnRvb2wsIG9Db250ZXh0KSAmJlxyXG4gICAgICAgIHNhbWVPclN0YXIob0NvbnRleHQuY2xpZW50LCBvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCwgb0NvbnRleHQpICYmXHJcbiAgICAgICAgc2FtZU9yU3RhckVtcHR5KG9Db250ZXh0LnN5c3RlbU9iamVjdENhdGVnb3J5LCBvU2hvd0VudGl0eS5jb250ZXh0LnN5c3RlbU9iamVjdENhdGVnb3J5LCBvQ29udGV4dCkgJiZcclxuICAgICAgICBzYW1lT3JTdGFyRW1wdHkob0NvbnRleHQuc3lzdGVtT2JqZWN0SWQsIG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtT2JqZWN0SWQsIG9Db250ZXh0KVxyXG4gICAgLy8gICAgICAmJiBvU2hvd0VudGl0eS5jb250ZXh0LnRvb2wgPT09IG9Db250ZXh0LnRvb2xcclxuICAgIH0pXHJcbiAgICAvLyAgY29uc29sZS5sb2coYUZpbHRlcmVkLmxlbmd0aClcclxuICAgIC8vIG1hdGNoIG90aGVyIGNvbnRleHQgcGFyYW1ldGVyc1xyXG4gICAgYUZpbHRlcmVkLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcclxuICAgICAgdmFyIG5yTWF0Y2hlc0EgPSBuck1hdGNoZXMoYS5jb250ZXh0LCBvQ29udGV4dClcclxuICAgICAgdmFyIG5yTWF0Y2hlc0IgPSBuck1hdGNoZXMoYi5jb250ZXh0LCBvQ29udGV4dClcclxuICAgICAgdmFyIG5yTm9NYXRjaGVzQSA9IG5yTm9NYXRjaGVzKGEuY29udGV4dCwgb0NvbnRleHQpXHJcbiAgICAgIHZhciBuck5vTWF0Y2hlc0IgPSBuck5vTWF0Y2hlcyhiLmNvbnRleHQsIG9Db250ZXh0KVxyXG4gICAgICAvLyAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGEuY29udGV4dCkpXHJcbiAgICAgIC8vICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYi5jb250ZXh0KSlcclxuICAgICAgLy8gICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShvQ29udGV4dCkpXHJcbiAgICAgIHZhciByZXMgPSAtKG5yTWF0Y2hlc0EgLSBuck1hdGNoZXNCKSAqIDEwMCArIChuck5vTWF0Y2hlc0EgLSBuck5vTWF0Y2hlc0IpXHJcbiAgICAgIC8vICAgICBjb25zb2xlLmxvZyhcImRpZmYgXCIgKyByZXMpXHJcbiAgICAgIHJldHVybiByZXNcclxuICAgIH0pXHJcbiAgICBpZiAoYUZpbHRlcmVkLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICBkZWJ1Z2xvZygnbm8gdGFyZ2V0IGZvciBzaG93RW50aXR5ICcgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dCkpXHJcbiAgICB9XHJcbiAgICAvLyBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhRmlsdGVyZWQsdW5kZWZpbmVkLDIpKVxyXG4gICAgaWYgKGFGaWx0ZXJlZFswXSkge1xyXG4gICAgICAvLyBleGVjdXRlIGFsbCBmdW5jdGlvbnNcclxuXHJcbiAgICAgIHZhciBvTWF0Y2ggPSBhRmlsdGVyZWRbMF1cclxuXHJcbiAgICAgIHZhciBvTWVyZ2VkID0ge1xyXG4gICAgICAgIGNvbnRleHQ6IHtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIG9NZXJnZWQuY29udGV4dCA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9NZXJnZWQuY29udGV4dCwgYUZpbHRlcmVkWzBdLmNvbnRleHQsIG9Db250ZXh0KVxyXG4gICAgICBvTWVyZ2VkID0gQW55T2JqZWN0LmFzc2lnbihvTWVyZ2VkLCB7XHJcbiAgICAgICAgcmVzdWx0OiBhRmlsdGVyZWRbMF0ucmVzdWx0XHJcbiAgICAgIH0pXHJcblxyXG4gICAgICBPYmplY3Qua2V5cyhvTWF0Y2guY29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xyXG4gICAgICAgIGlmICh0eXBlb2Ygb01hdGNoLmNvbnRleHRbc0tleV0gPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgIGRlYnVnbG9nKCdOb3cgcmV0cm9maXR0aW5nIDonICsgc0tleSArICcgLSAnICsgb0NvbnRleHRbc0tleV0pXHJcbiAgICAgICAgICBvTWVyZ2VkID0gb01hdGNoLmNvbnRleHRbc0tleV0ob0NvbnRleHRbc0tleV0sIG9NZXJnZWQpXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG5cclxuICAgICAgcmV0dXJuIG9NZXJnZWRcclxuICAgIH1cclxuICAgIHJldHVybiBudWxsXHJcbiAgfVxyXG5cclxuXHJcbmltcG9ydCAqIGFzIGlucHV0RmlsdGVyIGZyb20gJy4vaW5wdXRGaWx0ZXInO1xyXG5cclxuICBmdW5jdGlvbiBmaWx0ZXJTaG93RW50aXR5IChvQ29udGV4dCwgYVNob3dFbnRpdHlBY3Rpb25zKSB7XHJcbiAgICBPYmplY3Qua2V5cyhvQ29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xyXG4gICAgICBpZiAob0NvbnRleHRbc0tleV0gPT09IG51bGwpIHtcclxuICAgICAgICBkZWxldGUgb0NvbnRleHRbc0tleV1cclxuICAgICAgfVxyXG4gICAgfSlcclxuICAgIHZhciByZXMgPSBpbnB1dEZpbHRlci5hcHBseVJ1bGVzUGlja0ZpcnN0KG9Db250ZXh0KTtcclxuICAgIGlmICghcmVzKSB7XHJcbiAgICAgIHJldHVybiB1bmRlZmluZWRcclxuICAgIH1cclxuICAgIGRlYnVnbG9nKFwiKiogYWZ0ZXIgZmlsdGVyIHJ1bGVzXCIgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpXHJcbiAgICByZXR1cm4gZmlsdGVyU2hvd0VudGl0eU9sZChyZXMsYVNob3dFbnRpdHlBY3Rpb25zKTtcclxuICB9XHJcblxyXG4vKlxyXG4gIGZ1bmN0aW9uIGV4ZWNTaG93RW50aXR5IChvRW50aXR5KSB7XHJcbiAgICB2YXIgbWVyZ2VkID0gZmlsdGVyU2hvd0VudGl0eShvRW50aXR5LCBhU2hvd0VudGl0eUFjdGlvbnMpXHJcbiAgICBpZiAobWVyZ2VkKSB7XHJcbiAgICAgIHJldHVybiBleGVjdXRlU3RhcnR1cChtZXJnZWQpXHJcbiAgICB9XHJcbiAgICByZXR1cm4gbnVsbFxyXG4gIH1cclxuKi9cclxuXHJcbiAgLy8gRTpcXHByb2plY3RzXFxub2RlanNcXGJvdGJ1aWxkZXJcXHNhbXBsZWJvdD5cIiVQcm9ncmFtRmlsZXMoeDg2KSVcXEdvb2dsZVxcQ2hyb21lXFxBcHBsaWNhdGlvblxcY2hyb21lLmV4ZVwiIC0taW5jb2duaXRvIC11cmwgd3d3LnNwaWVnZWwuZGVcclxuXHJcbiAgZXhwb3J0IGNvbnN0IGRpc3BhdGNoZXIgPSB7XHJcbi8vICAgIGV4ZWNTaG93RW50aXR5OiBleGVjU2hvd0VudGl0eSxcclxuICAgIF90ZXN0OiB7XHJcbiAgICAgIHNhbWVPclN0YXI6IHNhbWVPclN0YXIsXHJcbiAgICAgIG5yTWF0Y2hlczogbnJNYXRjaGVzLFxyXG4gICAgICBuck5vTWF0Y2hlczogbnJOb01hdGNoZXMsXHJcbiAgICAgIGV4cGFuZFBhcmFtZXRlcnNJblVSTDogZXhwYW5kUGFyYW1ldGVyc0luVVJMLFxyXG4gICAgICBmaWx0ZXJTaG93RW50aXR5OiBmaWx0ZXJTaG93RW50aXR5LFxyXG4gICAgLy8gIGZuRmluZFVuaXRUZXN0OiBmbkZpbmRVbml0VGVzdCxcclxuICAgICAgY2FsY0Rpc3RhbmNlOiBjYWxjRGlzdGFuY2UsXHJcbiAgICAgIF9hU2hvd0VudGl0eUFjdGlvbnM6IGFTaG93RW50aXR5QWN0aW9uc1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy9leHBvcnRzIGRpc3BhdGNoZXI7XHJcblxyXG4gIC8vbW9kdWxlLmV4cG9ydHMgPSBkaXNwYXRjaGVyXHJcblxyXG4iLCIvKipcbiAqIEBmaWxlXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5kaXNwYXRjaGVyXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXG4gKi9cblwidXNlIHN0cmljdFwiO1xudmFyIEFueU9iamVjdCA9IE9iamVjdDtcbnZhciBkaXN0YW5jZSA9IHJlcXVpcmUoXCJhYm90X3N0cmluZ2Rpc3RcIik7XG52YXIgZGVidWcgPSByZXF1aXJlKFwiZGVidWdcIik7XG52YXIgZGVidWdsb2cgPSBkZWJ1ZygnZGlzcGF0Y2hlcicpO1xuLy8gIHZhciBleGVjID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpLmV4ZWNcbi8vICB2YXIgbGV2ZW4gPSByZXF1aXJlKCcuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4uanMnKS5sZXZlbnNodGVpblxudmFyIGV4ZWN0ZW1wbGF0ZSA9IHJlcXVpcmUoXCIuLi9leGVjL2V4ZWN0ZW1wbGF0ZVwiKTtcbi8vdmFyIGxldmVuID0gcmVxdWlyZSgnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluLmpzJylcbnZhciBtYXRjaGRhdGEgPSByZXF1aXJlKFwiLi9tYXRjaGRhdGFcIik7XG52YXIgQWxnb2wgPSByZXF1aXJlKFwiLi4vbWF0Y2gvYWxnb2xcIik7XG52YXIgb1VuaXRUZXN0cyA9IG1hdGNoZGF0YS5vVW5pdFRlc3RzO1xudmFyIG9XaWtpcyA9IG1hdGNoZGF0YS5vV2lraXM7XG5mdW5jdGlvbiBjYWxjRGlzdGFuY2Uoc1RleHQxLCBzVGV4dDIpIHtcbiAgICByZXR1cm4gZGlzdGFuY2UuY2FsY0Rpc3RhbmNlKHNUZXh0MS50b0xvd2VyQ2FzZSgpLCBzVGV4dDIpO1xuICAgIC8qXG4gICAgZGVidWdsb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxuICAgIHZhciBhMCA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCksIHNUZXh0MilcbiAgICB2YXIgYSA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS50b0xvd2VyQ2FzZSgpLCBzVGV4dDIpXG4gICAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGFcbiAgICAqL1xufVxuZnVuY3Rpb24gZm5GaW5kTWF0Y2goc0tleXdvcmQsIG9Db250ZXh0LCBvTWFwKSB7XG4gICAgLy8gcmV0dXJuIGEgYmV0dGVyIGNvbnRleHQgaWYgdGhlcmUgaXMgYSBtYXRjaFxuICAgIC8vIHNLZXl3b3JkID0gc0tleXdvcmQudG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgc0tleXdvcmRMYyA9IHNLZXl3b3JkLnRvTG93ZXJDYXNlKCk7XG4gICAgb01hcC5zb3J0KGZ1bmN0aW9uIChvRW50cnkxLCBvRW50cnkyKSB7XG4gICAgICAgIHZhciB1MSA9IGNhbGNEaXN0YW5jZShvRW50cnkxLmtleSwgc0tleXdvcmRMYyk7XG4gICAgICAgIHZhciB1MiA9IGNhbGNEaXN0YW5jZShvRW50cnkyLmtleSwgc0tleXdvcmRMYyk7XG4gICAgICAgIHJldHVybiB1MiAtIHUxO1xuICAgIH0pO1xuICAgIC8vIGxhdGVyOiBpbiBjYXNlIG9mIGNvbmZsaWN0cywgYXNrLFxuICAgIC8vIG5vdzpcbiAgICB2YXIgZGlzdCA9IGNhbGNEaXN0YW5jZShvTWFwWzBdLmtleSwgc0tleXdvcmRMYyk7XG4gICAgZGVidWdsb2coJ2Jlc3QgZGlzdCcgKyBkaXN0ICsgJyAvICAnICsgb01hcFswXS5rZXkgKyAnICcgKyBzS2V5d29yZCk7XG4gICAgaWYgKGRpc3QgPiBBbGdvbC5DdXRvZmZfV29yZE1hdGNoKSB7XG4gICAgICAgIHZhciBvMSA9IE9iamVjdC5hc3NpZ24oe30sIG9Db250ZXh0KTtcbiAgICAgICAgdmFyIG8yO1xuICAgICAgICBvMS5jb250ZXh0ID0gT2JqZWN0LmFzc2lnbih7fSwgbzEuY29udGV4dCk7XG4gICAgICAgIG8yID0gbzE7XG4gICAgICAgIG8yLmNvbnRleHQgPSBPYmplY3QuYXNzaWduKG8xLmNvbnRleHQsIG9NYXBbMF0uY29udGV4dCk7XG4gICAgICAgIHJldHVybiBvMjtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59XG4vKipcbiAqIGEgZnVuY3Rpb24gdG8gbWF0Y2ggYSB1bml0IHRlc3QgdXNpbmcgbGV2ZW5zaHRlaW4gZGlzdGFuY2VzXG4gKiBAcHVibGljXG4gKi9cbmZ1bmN0aW9uIGZuRmluZFVuaXRUZXN0KHNzeXN0ZW1PYmplY3RJZCwgb0NvbnRleHQpIHtcbiAgICByZXR1cm4gZm5GaW5kTWF0Y2goc3N5c3RlbU9iamVjdElkLCBvQ29udGV4dCwgb1VuaXRUZXN0cyk7XG59XG5mdW5jdGlvbiBmbkZpbmRXaWtpKHNLZXl3b3JkLCBvQ29udGV4dCkge1xuICAgIHJldHVybiBmbkZpbmRNYXRjaChzS2V5d29yZCwgb0NvbnRleHQsIG9XaWtpcyk7XG59XG52YXIgYVNob3dFbnRpdHlBY3Rpb25zID0gW1xuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtSWQ6ICd1djInLFxuICAgICAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXG4gICAgICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscCdcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1djIud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3VpMi91c2hlbGwvc2hlbGxzL2FiYXAvRmlvcmlMYXVuY2hwYWQuaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbUlkOiAndXYyJyxcbiAgICAgICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxuICAgICAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHBkJ1xuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXV2Mi53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvc2FwL2Fyc3J2Y191cGJfYWRtbi9tYWluLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1JZDogJ3UxeScsXG4gICAgICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcbiAgICAgICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwJ1xuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXUxeS53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvdWkyL3VzaGVsbC9zaGVsbHMvYWJhcC9GaW9yaUxhdW5jaHBhZC5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtSWQ6ICd1MXknLFxuICAgICAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXG4gICAgICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscGQnXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdTF5LndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS9zYXAvYXJzcnZjX3VwYl9hZG1uL21haW4uaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbUlkOiAndXYyJyxcbiAgICAgICAgICAgIGNsaWVudDogJzEyMCcsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ2Zpb3JpIGNhdGFsb2cnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IC8uKi8sXG4gICAgICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXG4gICAgICAgICAgICB0b29sOiAnRkxQRCdcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1djIud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3NhcC9hcnNydmNfdXBiX2FkbW4vbWFpbi5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0jQ0FUQUxPRzp7c3lzdGVtT2JqZWN0SWR9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAndW5pdCcsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogZm5GaW5kVW5pdFRlc3RcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwOi8vbG9jYWxob3N0OjgwODAve3BhdGh9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAndW5pdCB0ZXN0JyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiBmbkZpbmRVbml0VGVzdFxuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MC97cGF0aH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtT2JqZWN0Q2F0ZWdvcnk6ICd3aWtpJyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiBmbkZpbmRXaWtpXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly93aWtpLndkZi5zYXAuY29ycC97cGF0aH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtSWQ6ICdKSVJBJ1xuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vamlyYS53ZGYuc2FwLmNvcnA6ODA4MC9USVBDT1JFVUlJSSdcbiAgICAgICAgfVxuICAgIH1cbl07XG4vLyBpZiBUT09MID0gSklSQSB8fCBTeXN0ZW1JZCA9IEpJUkEgLT4gU3lzdGVtSWQgPSBKSVJBXG4vL1xuLy9cbi8vIHN0YXJ0U0FQR1VJXG4vLyAgIE46XFw+XCJjOlxcUHJvZ3JhbSBGaWxlcyAoeDg2KVxcU0FQXFxGcm9udEVuZFxcU0FQZ3VpXCJcXHNhcHNoY3V0LmV4ZSAgLXN5c3RlbT1VVjIgLWNsaWVudD0xMjAgLWNvbW1hbmQ9U0UzOCAtdHlwZT1UcmFuc2FjdGlvbiAtdXNlcj1BVVNFUlxuZnVuY3Rpb24gZXhwYW5kUGFyYW1ldGVyc0luVVJMKG9NZXJnZWRDb250ZXh0UmVzdWx0KSB7XG4gICAgdmFyIHB0biA9IG9NZXJnZWRDb250ZXh0UmVzdWx0LnJlc3VsdC5wYXR0ZXJuO1xuICAgIHB0biA9IGV4ZWN0ZW1wbGF0ZS5leHBhbmRUZW1wbGF0ZShvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0LCBwdG4pO1xuICAgIC8qICAgIE9iamVjdC5rZXlzKG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgICAgICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKCd7JyArIHNLZXkgKyAnfScsICdnJylcbiAgICAgICAgICBwdG4gPSBwdG4ucmVwbGFjZShyZWdleCwgb01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dFtzS2V5XSlcbiAgICAgICAgICBwdG4gPSBwdG4ucmVwbGFjZShyZWdleCwgb01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dFtzS2V5XSlcbiAgICAgICAgfSlcbiAgICAgICAgKi9cbiAgICByZXR1cm4gcHRuO1xufVxuLypcbiAgZXhwb3J0IGZ1bmN0aW9uIGV4ZWN1dGVTdGFydHVwIChvTWVyZ2VkQ29udGV4dFJlc3VsdCkge1xuICAgIGlmIChvTWVyZ2VkQ29udGV4dFJlc3VsdC5yZXN1bHQudHlwZSA9PT0gJ1VSTCcpIHtcbiAgICAgIHZhciBwdG4gPSBleHBhbmRQYXJhbWV0ZXJzSW5VUkwob01lcmdlZENvbnRleHRSZXN1bHQpXG4gICAgICBleGVjLnN0YXJ0QnJvd3NlcihwdG4pXG4gICAgICByZXR1cm4gcHRuXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBzID0gKFwiRG9uJ3Qga25vdyBob3cgdG8gc3RhcnQgXCIgKyBvTWVyZ2VkQ29udGV4dFJlc3VsdC5yZXN1bHQudHlwZSArICdcXG4gZm9yIFwiJyArIG9NZXJnZWRDb250ZXh0UmVzdWx0LnF1ZXJ5ICsgJ1wiJylcbiAgICAgIGRlYnVnbG9nKHMpXG4gICAgICByZXR1cm4gc1xuICAgIH1cbiAgfVxuKi9cbmZ1bmN0aW9uIG5yTWF0Y2hlcyhhT2JqZWN0LCBvQ29udGV4dCkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhhT2JqZWN0KS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9Db250ZXh0LCBrZXkpKSB7XG4gICAgICAgICAgICBwcmV2ID0gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG59XG5mdW5jdGlvbiBuck5vTWF0Y2hlcyhhT2JqZWN0LCBvQ29udGV4dCkge1xuICAgIHZhciBub01hdGNoQSA9IE9iamVjdC5rZXlzKGFPYmplY3QpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XG4gICAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9Db250ZXh0LCBrZXkpKSB7XG4gICAgICAgICAgICBwcmV2ID0gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG4gICAgdmFyIG5vTWF0Y2hCID0gT2JqZWN0LmtleXMob0NvbnRleHQpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XG4gICAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGFPYmplY3QsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbiAgICByZXR1cm4gbm9NYXRjaEEgKyBub01hdGNoQjtcbn1cbmZ1bmN0aW9uIHNhbWVPclN0YXIoczEsIHMyLCBvRW50aXR5KSB7XG4gICAgcmV0dXJuIHMxID09PSBzMiB8fFxuICAgICAgICAoczEgPT09IHVuZGVmaW5lZCAmJiBzMiA9PT0gbnVsbCkgfHxcbiAgICAgICAgKChzMiBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgczIuZXhlYyhzMSkgIT09IG51bGwpIHx8XG4gICAgICAgICgodHlwZW9mIHMyID09PSAnZnVuY3Rpb24nICYmIHMxKSAmJiBzMihzMSwgb0VudGl0eSkpO1xufVxuZnVuY3Rpb24gc2FtZU9yU3RhckVtcHR5KHMxLCBzMiwgb0VudGl0eSkge1xuICAgIGlmIChzMSA9PT0gdW5kZWZpbmVkICYmIHMyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChzMiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gczEgPT09IHMyIHx8XG4gICAgICAgICgoczIgaW5zdGFuY2VvZiBSZWdFeHApICYmIHMyLmV4ZWMoczEpICE9PSBudWxsKSB8fFxuICAgICAgICAoKHR5cGVvZiBzMiA9PT0gJ2Z1bmN0aW9uJyAmJiBzMSkgJiYgczIoczEsIG9FbnRpdHkpKTtcbn1cbmZ1bmN0aW9uIGZpbHRlclNob3dFbnRpdHlPbGQob0NvbnRleHQsIGFTaG93RW50aXR5KSB7XG4gICAgdmFyIGFGaWx0ZXJlZDtcbiAgICBPYmplY3Qua2V5cyhvQ29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xuICAgICAgICBpZiAob0NvbnRleHRbc0tleV0gPT09IG51bGwpIHtcbiAgICAgICAgICAgIG9Db250ZXh0W3NLZXldID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgLy8gZmlsdGVyIGNvbnRleHQsIGFtZW5kaW5nIHN5bm9ueW1zXG4gICAgYUZpbHRlcmVkID0gYVNob3dFbnRpdHkuZmlsdGVyKGZ1bmN0aW9uIChvU2hvd0VudGl0eSkge1xuICAgICAgICAvLyAgICAgICBjb25zb2xlLmxvZyhcIi4uLlwiKVxuICAgICAgICAvLyAgICAgIGNvbnNvbGUubG9nKG9TaG93RW50aXR5LmNvbnRleHQudG9vbCArIFwiIFwiICsgb0NvbnRleHQudG9vbCArIFwiXFxuXCIpXG4gICAgICAgIC8vICAgICAgY29uc29sZS5sb2cob1Nob3dFbnRpdHkuY29udGV4dC5jbGllbnQgKyBcIiBcIiArIG9Db250ZXh0LmNsaWVudCArXCI6XCIgKyBzYW1lT3JTdGFyKG9Db250ZXh0LmNsaWVudCxvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCkgKyBcIlxcblwiKVxuICAgICAgICAvLyAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkob1Nob3dFbnRpdHkuY29udGV4dCkgKyBcIlxcblwiICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHQuY2xpZW50KSArIFwiXFxuXCIpXG4gICAgICAgIHJldHVybiBzYW1lT3JTdGFyKG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtSWQsIG9Db250ZXh0LnN5c3RlbUlkLCBvQ29udGV4dCkgJiZcbiAgICAgICAgICAgIHNhbWVPclN0YXIob0NvbnRleHQudG9vbCwgb1Nob3dFbnRpdHkuY29udGV4dC50b29sLCBvQ29udGV4dCkgJiZcbiAgICAgICAgICAgIHNhbWVPclN0YXIob0NvbnRleHQuY2xpZW50LCBvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCwgb0NvbnRleHQpICYmXG4gICAgICAgICAgICBzYW1lT3JTdGFyRW1wdHkob0NvbnRleHQuc3lzdGVtT2JqZWN0Q2F0ZWdvcnksIG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtT2JqZWN0Q2F0ZWdvcnksIG9Db250ZXh0KSAmJlxuICAgICAgICAgICAgc2FtZU9yU3RhckVtcHR5KG9Db250ZXh0LnN5c3RlbU9iamVjdElkLCBvU2hvd0VudGl0eS5jb250ZXh0LnN5c3RlbU9iamVjdElkLCBvQ29udGV4dCk7XG4gICAgICAgIC8vICAgICAgJiYgb1Nob3dFbnRpdHkuY29udGV4dC50b29sID09PSBvQ29udGV4dC50b29sXG4gICAgfSk7XG4gICAgLy8gIGNvbnNvbGUubG9nKGFGaWx0ZXJlZC5sZW5ndGgpXG4gICAgLy8gbWF0Y2ggb3RoZXIgY29udGV4dCBwYXJhbWV0ZXJzXG4gICAgYUZpbHRlcmVkLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgdmFyIG5yTWF0Y2hlc0EgPSBuck1hdGNoZXMoYS5jb250ZXh0LCBvQ29udGV4dCk7XG4gICAgICAgIHZhciBuck1hdGNoZXNCID0gbnJNYXRjaGVzKGIuY29udGV4dCwgb0NvbnRleHQpO1xuICAgICAgICB2YXIgbnJOb01hdGNoZXNBID0gbnJOb01hdGNoZXMoYS5jb250ZXh0LCBvQ29udGV4dCk7XG4gICAgICAgIHZhciBuck5vTWF0Y2hlc0IgPSBuck5vTWF0Y2hlcyhiLmNvbnRleHQsIG9Db250ZXh0KTtcbiAgICAgICAgLy8gICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhLmNvbnRleHQpKVxuICAgICAgICAvLyAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGIuY29udGV4dCkpXG4gICAgICAgIC8vICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkob0NvbnRleHQpKVxuICAgICAgICB2YXIgcmVzID0gLShuck1hdGNoZXNBIC0gbnJNYXRjaGVzQikgKiAxMDAgKyAobnJOb01hdGNoZXNBIC0gbnJOb01hdGNoZXNCKTtcbiAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKFwiZGlmZiBcIiArIHJlcylcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9KTtcbiAgICBpZiAoYUZpbHRlcmVkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBkZWJ1Z2xvZygnbm8gdGFyZ2V0IGZvciBzaG93RW50aXR5ICcgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dCkpO1xuICAgIH1cbiAgICAvLyBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhRmlsdGVyZWQsdW5kZWZpbmVkLDIpKVxuICAgIGlmIChhRmlsdGVyZWRbMF0pIHtcbiAgICAgICAgLy8gZXhlY3V0ZSBhbGwgZnVuY3Rpb25zXG4gICAgICAgIHZhciBvTWF0Y2ggPSBhRmlsdGVyZWRbMF07XG4gICAgICAgIHZhciBvTWVyZ2VkID0ge1xuICAgICAgICAgICAgY29udGV4dDoge31cbiAgICAgICAgfTtcbiAgICAgICAgb01lcmdlZC5jb250ZXh0ID0gQW55T2JqZWN0LmFzc2lnbih7fSwgb01lcmdlZC5jb250ZXh0LCBhRmlsdGVyZWRbMF0uY29udGV4dCwgb0NvbnRleHQpO1xuICAgICAgICBvTWVyZ2VkID0gQW55T2JqZWN0LmFzc2lnbihvTWVyZ2VkLCB7XG4gICAgICAgICAgICByZXN1bHQ6IGFGaWx0ZXJlZFswXS5yZXN1bHRcbiAgICAgICAgfSk7XG4gICAgICAgIE9iamVjdC5rZXlzKG9NYXRjaC5jb250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9NYXRjaC5jb250ZXh0W3NLZXldID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgZGVidWdsb2coJ05vdyByZXRyb2ZpdHRpbmcgOicgKyBzS2V5ICsgJyAtICcgKyBvQ29udGV4dFtzS2V5XSk7XG4gICAgICAgICAgICAgICAgb01lcmdlZCA9IG9NYXRjaC5jb250ZXh0W3NLZXldKG9Db250ZXh0W3NLZXldLCBvTWVyZ2VkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBvTWVyZ2VkO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cbnZhciBpbnB1dEZpbHRlciA9IHJlcXVpcmUoXCIuL2lucHV0RmlsdGVyXCIpO1xuZnVuY3Rpb24gZmlsdGVyU2hvd0VudGl0eShvQ29udGV4dCwgYVNob3dFbnRpdHlBY3Rpb25zKSB7XG4gICAgT2JqZWN0LmtleXMob0NvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgICAgaWYgKG9Db250ZXh0W3NLZXldID09PSBudWxsKSB7XG4gICAgICAgICAgICBkZWxldGUgb0NvbnRleHRbc0tleV07XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICB2YXIgcmVzID0gaW5wdXRGaWx0ZXIuYXBwbHlSdWxlc1BpY2tGaXJzdChvQ29udGV4dCk7XG4gICAgaWYgKCFyZXMpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZGVidWdsb2coXCIqKiBhZnRlciBmaWx0ZXIgcnVsZXNcIiArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgcmV0dXJuIGZpbHRlclNob3dFbnRpdHlPbGQocmVzLCBhU2hvd0VudGl0eUFjdGlvbnMpO1xufVxuLypcbiAgZnVuY3Rpb24gZXhlY1Nob3dFbnRpdHkgKG9FbnRpdHkpIHtcbiAgICB2YXIgbWVyZ2VkID0gZmlsdGVyU2hvd0VudGl0eShvRW50aXR5LCBhU2hvd0VudGl0eUFjdGlvbnMpXG4gICAgaWYgKG1lcmdlZCkge1xuICAgICAgcmV0dXJuIGV4ZWN1dGVTdGFydHVwKG1lcmdlZClcbiAgICB9XG4gICAgcmV0dXJuIG51bGxcbiAgfVxuKi9cbi8vIEU6XFxwcm9qZWN0c1xcbm9kZWpzXFxib3RidWlsZGVyXFxzYW1wbGVib3Q+XCIlUHJvZ3JhbUZpbGVzKHg4NiklXFxHb29nbGVcXENocm9tZVxcQXBwbGljYXRpb25cXGNocm9tZS5leGVcIiAtLWluY29nbml0byAtdXJsIHd3dy5zcGllZ2VsLmRlXG5leHBvcnRzLmRpc3BhdGNoZXIgPSB7XG4gICAgLy8gICAgZXhlY1Nob3dFbnRpdHk6IGV4ZWNTaG93RW50aXR5LFxuICAgIF90ZXN0OiB7XG4gICAgICAgIHNhbWVPclN0YXI6IHNhbWVPclN0YXIsXG4gICAgICAgIG5yTWF0Y2hlczogbnJNYXRjaGVzLFxuICAgICAgICBuck5vTWF0Y2hlczogbnJOb01hdGNoZXMsXG4gICAgICAgIGV4cGFuZFBhcmFtZXRlcnNJblVSTDogZXhwYW5kUGFyYW1ldGVyc0luVVJMLFxuICAgICAgICBmaWx0ZXJTaG93RW50aXR5OiBmaWx0ZXJTaG93RW50aXR5LFxuICAgICAgICAvLyAgZm5GaW5kVW5pdFRlc3Q6IGZuRmluZFVuaXRUZXN0LFxuICAgICAgICBjYWxjRGlzdGFuY2U6IGNhbGNEaXN0YW5jZSxcbiAgICAgICAgX2FTaG93RW50aXR5QWN0aW9uczogYVNob3dFbnRpdHlBY3Rpb25zXG4gICAgfVxufTtcbi8vZXhwb3J0cyBkaXNwYXRjaGVyO1xuLy9tb2R1bGUuZXhwb3J0cyA9IGRpc3BhdGNoZXJcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
