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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9kaXNwYXRjaGVyLnRzIiwibWF0Y2gvZGlzcGF0Y2hlci5qcyJdLCJuYW1lcyI6WyJBbnlPYmplY3QiLCJPYmplY3QiLCJkaXN0YW5jZSIsInJlcXVpcmUiLCJkZWJ1ZyIsImRlYnVnbG9nIiwiZXhlY3RlbXBsYXRlIiwibWF0Y2hkYXRhIiwiQWxnb2wiLCJvVW5pdFRlc3RzIiwib1dpa2lzIiwiY2FsY0Rpc3RhbmNlIiwic1RleHQxIiwic1RleHQyIiwidG9Mb3dlckNhc2UiLCJmbkZpbmRNYXRjaCIsInNLZXl3b3JkIiwib0NvbnRleHQiLCJvTWFwIiwic0tleXdvcmRMYyIsInNvcnQiLCJvRW50cnkxIiwib0VudHJ5MiIsInUxIiwia2V5IiwidTIiLCJkaXN0IiwiQ3V0b2ZmX1dvcmRNYXRjaCIsIm8xIiwiYXNzaWduIiwibzIiLCJjb250ZXh0IiwiZm5GaW5kVW5pdFRlc3QiLCJzc3lzdGVtT2JqZWN0SWQiLCJmbkZpbmRXaWtpIiwiYVNob3dFbnRpdHlBY3Rpb25zIiwic3lzdGVtSWQiLCJjbGllbnQiLCJzeXN0ZW10eXBlIiwic3lzdGVtT2JqZWN0SWQiLCJyZXN1bHQiLCJ0eXBlIiwicGF0dGVybiIsInN5c3RlbU9iamVjdENhdGVnb3J5IiwidG9vbCIsImV4cGFuZFBhcmFtZXRlcnNJblVSTCIsIm9NZXJnZWRDb250ZXh0UmVzdWx0IiwicHRuIiwiZXhwYW5kVGVtcGxhdGUiLCJuck1hdGNoZXMiLCJhT2JqZWN0Iiwia2V5cyIsInJlZHVjZSIsInByZXYiLCJwcm90b3R5cGUiLCJoYXNPd25Qcm9wZXJ0eSIsImNhbGwiLCJuck5vTWF0Y2hlcyIsIm5vTWF0Y2hBIiwibm9NYXRjaEIiLCJzYW1lT3JTdGFyIiwiczEiLCJzMiIsIm9FbnRpdHkiLCJ1bmRlZmluZWQiLCJSZWdFeHAiLCJleGVjIiwic2FtZU9yU3RhckVtcHR5IiwiZmlsdGVyU2hvd0VudGl0eU9sZCIsImFTaG93RW50aXR5IiwiYUZpbHRlcmVkIiwiZm9yRWFjaCIsInNLZXkiLCJmaWx0ZXIiLCJvU2hvd0VudGl0eSIsImEiLCJiIiwibnJNYXRjaGVzQSIsIm5yTWF0Y2hlc0IiLCJuck5vTWF0Y2hlc0EiLCJuck5vTWF0Y2hlc0IiLCJyZXMiLCJsZW5ndGgiLCJKU09OIiwic3RyaW5naWZ5Iiwib01hdGNoIiwib01lcmdlZCIsImlucHV0RmlsdGVyIiwiZmlsdGVyU2hvd0VudGl0eSIsImFwcGx5UnVsZXNQaWNrRmlyc3QiLCJleHBvcnRzIiwiZGlzcGF0Y2hlciIsIl90ZXN0IiwiX2FTaG93RW50aXR5QWN0aW9ucyJdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7O0FDS0E7O0FEUUEsSUFBSUEsWUFBa0JDLE1BQXRCO0FBRUEsSUFBQUMsV0FBQUMsUUFBQSw2QkFBQSxDQUFBO0FBRUEsSUFBQUMsUUFBQUQsUUFBQSxPQUFBLENBQUE7QUFDQSxJQUFNRSxXQUFXRCxNQUFNLFlBQU4sQ0FBakI7QUFHQTtBQUNBO0FBRUEsSUFBQUUsZUFBQUgsUUFBQSxzQkFBQSxDQUFBO0FBRUU7QUFDRixJQUFBSSxZQUFBSixRQUFBLGFBQUEsQ0FBQTtBQUVBLElBQUFLLFFBQUFMLFFBQUEsZ0JBQUEsQ0FBQTtBQUVBLElBQU1NLGFBQWFGLFVBQVVFLFVBQTdCO0FBQ0EsSUFBTUMsU0FBU0gsVUFBVUcsTUFBekI7QUFFRSxTQUFBQyxZQUFBLENBQXVCQyxNQUF2QixFQUErQkMsTUFBL0IsRUFBcUM7QUFDbkMsV0FBT1gsU0FBU1MsWUFBVCxDQUFzQkMsT0FBT0UsV0FBUCxFQUF0QixFQUE0Q0QsTUFBNUMsQ0FBUDtBQUNBOzs7Ozs7QUFNRDtBQUVELFNBQUFFLFdBQUEsQ0FBc0JDLFFBQXRCLEVBQWdDQyxRQUFoQyxFQUEwQ0MsSUFBMUMsRUFBOEM7QUFDNUM7QUFDQTtBQUNBLFFBQUlDLGFBQWFILFNBQVNGLFdBQVQsRUFBakI7QUFDQUksU0FBS0UsSUFBTCxDQUFVLFVBQVVDLE9BQVYsRUFBbUJDLE9BQW5CLEVBQTBCO0FBQ2xDLFlBQUlDLEtBQUtaLGFBQWFVLFFBQVFHLEdBQXJC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QUNFN0Usc0JBQWNBLFlBUFQ7QUFRTGtGLDZCQUFxQjFEO0FBUmhCO0FBRmlCLENBQWI7QUFjYjtBQUVBIiwiZmlsZSI6Im1hdGNoL2Rpc3BhdGNoZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQGZpbGVcclxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuZGlzcGF0Y2hlclxyXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXHJcbiAqL1xyXG5cclxuXHJcbi8vIDxyZWZlcmVuY2UgcGF0aD1cIi4uLy4uL2xpYi9ub2RlLTQuZC50c1wiIC8+XHJcblxyXG5kZWNsYXJlIGludGVyZmFjZSBPYmplY3RDb25zdHJ1Y3RvciB7XHJcbiAgICBhc3NpZ24odGFyZ2V0OiBhbnksIC4uLnNvdXJjZXM6IGFueVtdKTogYW55O1xyXG59XHJcblxyXG52YXIgQW55T2JqZWN0ID0gKDxhbnk+T2JqZWN0KTtcclxuXHJcbmltcG9ydCAqIGFzIGRpc3RhbmNlIGZyb20gJy4uL3V0aWxzL2RhbWVyYXVMZXZlbnNodGVpbic7XHJcblxyXG5pbXBvcnQgKiBhcyBkZWJ1ZyBmcm9tICdkZWJ1Zyc7XHJcbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ2Rpc3BhdGNoZXInKVxyXG5cclxuaW1wb3J0IHsgZXhlYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xyXG4vLyAgdmFyIGV4ZWMgPSByZXF1aXJlKCdjaGlsZF9wcm9jZXNzJykuZXhlY1xyXG4vLyAgdmFyIGxldmVuID0gcmVxdWlyZSgnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluLmpzJykubGV2ZW5zaHRlaW5cclxuXHJcbmltcG9ydCAqIGFzIGV4ZWN0ZW1wbGF0ZSBmcm9tICcuLi9leGVjL2V4ZWN0ZW1wbGF0ZSc7XHJcblxyXG4gIC8vdmFyIGxldmVuID0gcmVxdWlyZSgnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluLmpzJylcclxuaW1wb3J0ICogYXMgbWF0Y2hkYXRhIGZyb20gJy4vbWF0Y2hkYXRhJztcclxuXHJcbmltcG9ydCAqIGFzIEFsZ29sIGZyb20gJy4uL21hdGNoL2FsZ29sJztcclxuXHJcbmNvbnN0IG9Vbml0VGVzdHMgPSBtYXRjaGRhdGEub1VuaXRUZXN0c1xyXG5jb25zdCBvV2lraXMgPSBtYXRjaGRhdGEub1dpa2lzXHJcblxyXG4gIGZ1bmN0aW9uIGNhbGNEaXN0YW5jZSAoc1RleHQxLCBzVGV4dDIpIHtcclxuICAgIHJldHVybiBkaXN0YW5jZS5jYWxjRGlzdGFuY2Uoc1RleHQxLnRvTG93ZXJDYXNlKCksIHNUZXh0Mik7XHJcbiAgICAvKlxyXG4gICAgZGVidWdsb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxyXG4gICAgdmFyIGEwID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnN1YnN0cmluZygwLCBzVGV4dDIubGVuZ3RoKSwgc1RleHQyKVxyXG4gICAgdmFyIGEgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEudG9Mb3dlckNhc2UoKSwgc1RleHQyKVxyXG4gICAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGFcclxuICAgICovXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBmbkZpbmRNYXRjaCAoc0tleXdvcmQsIG9Db250ZXh0LCBvTWFwKSB7XHJcbiAgICAvLyByZXR1cm4gYSBiZXR0ZXIgY29udGV4dCBpZiB0aGVyZSBpcyBhIG1hdGNoXHJcbiAgICAvLyBzS2V5d29yZCA9IHNLZXl3b3JkLnRvTG93ZXJDYXNlKCk7XHJcbiAgICB2YXIgc0tleXdvcmRMYyA9IHNLZXl3b3JkLnRvTG93ZXJDYXNlKCk7XHJcbiAgICBvTWFwLnNvcnQoZnVuY3Rpb24gKG9FbnRyeTEsIG9FbnRyeTIpIHtcclxuICAgICAgdmFyIHUxID0gY2FsY0Rpc3RhbmNlKG9FbnRyeTEua2V5LCBzS2V5d29yZExjKVxyXG4gICAgICB2YXIgdTIgPSBjYWxjRGlzdGFuY2Uob0VudHJ5Mi5rZXksIHNLZXl3b3JkTGMpXHJcbiAgICAgIHJldHVybiB1MiAtIHUxO1xyXG4gICAgfSlcclxuICAgIC8vIGxhdGVyOiBpbiBjYXNlIG9mIGNvbmZsaWN0cywgYXNrLFxyXG4gICAgLy8gbm93OlxyXG4gICAgdmFyIGRpc3QgPSBjYWxjRGlzdGFuY2Uob01hcFswXS5rZXksIHNLZXl3b3JkTGMpXHJcbiAgICBkZWJ1Z2xvZygnYmVzdCBkaXN0JyArIGRpc3QgKyAnIC8gICcgKyBvTWFwWzBdLmtleSArICcgJyArIHNLZXl3b3JkKVxyXG4gICAgaWYgKGRpc3QgPiBBbGdvbC5DdXRvZmZfV29yZE1hdGNoKSB7XHJcbiAgICAgIHZhciBvMSA9ICg8YW55Pk9iamVjdCkuYXNzaWduKHt9LCBvQ29udGV4dClcclxuICAgICAgdmFyIG8yXHJcbiAgICAgIG8xLmNvbnRleHQgPSAoPGFueT5PYmplY3QpLmFzc2lnbih7fSwgbzEuY29udGV4dClcclxuICAgICAgbzIgPSBvMVxyXG4gICAgICBvMi5jb250ZXh0ID0gKDxhbnk+T2JqZWN0KS5hc3NpZ24obzEuY29udGV4dCwgb01hcFswXS5jb250ZXh0KVxyXG4gICAgICByZXR1cm4gbzJcclxuICAgIH1cclxuICAgIHJldHVybiBudWxsXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBhIGZ1bmN0aW9uIHRvIG1hdGNoIGEgdW5pdCB0ZXN0IHVzaW5nIGxldmVuc2h0ZWluIGRpc3RhbmNlc1xyXG4gICAqIEBwdWJsaWNcclxuICAgKi9cclxuICBmdW5jdGlvbiBmbkZpbmRVbml0VGVzdCAoc3N5c3RlbU9iamVjdElkLCBvQ29udGV4dCkge1xyXG4gICAgcmV0dXJuIGZuRmluZE1hdGNoKHNzeXN0ZW1PYmplY3RJZCwgb0NvbnRleHQsIG9Vbml0VGVzdHMpXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBmbkZpbmRXaWtpIChzS2V5d29yZCwgb0NvbnRleHQpIHtcclxuICAgIHJldHVybiBmbkZpbmRNYXRjaChzS2V5d29yZCwgb0NvbnRleHQsIG9XaWtpcylcclxuICB9XHJcblxyXG4gIHZhciBhU2hvd0VudGl0eUFjdGlvbnMgPSBbXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1JZDogJ3V2MicsXHJcbiAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXHJcbiAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwJ1xyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdXYyLndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS91aTIvdXNoZWxsL3NoZWxscy9hYmFwL0Zpb3JpTGF1bmNocGFkLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbUlkOiAndXYyJyxcclxuICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcclxuICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHBkJ1xyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdXYyLndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS9zYXAvYXJzcnZjX3VwYl9hZG1uL21haW4uaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtSWQ6ICd1MXknLFxyXG4gICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxyXG4gICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscCdcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXUxeS53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvdWkyL3VzaGVsbC9zaGVsbHMvYWJhcC9GaW9yaUxhdW5jaHBhZC5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1JZDogJ3UxeScsXHJcbiAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXHJcbiAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwZCdcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXUxeS53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvc2FwL2Fyc3J2Y191cGJfYWRtbi9tYWluLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbUlkOiAndXYyJyxcclxuICAgICAgICBjbGllbnQ6ICcxMjAnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAnZmlvcmkgY2F0YWxvZycsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IC8uKi8sXHJcbiAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxyXG4gICAgICAgIHRvb2w6ICdGTFBEJ1xyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdXYyLndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS9zYXAvYXJzcnZjX3VwYl9hZG1uL21haW4uaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9I0NBVEFMT0c6e3N5c3RlbU9iamVjdElkfSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAndW5pdCcsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IGZuRmluZFVuaXRUZXN0XHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwOi8vbG9jYWxob3N0OjgwODAve3BhdGh9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAndW5pdCB0ZXN0JyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogZm5GaW5kVW5pdFRlc3RcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MC97cGF0aH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ3dpa2knLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiBmbkZpbmRXaWtpXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL3dpa2kud2RmLnNhcC5jb3JwL3twYXRofSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbUlkOiAnSklSQSdcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vamlyYS53ZGYuc2FwLmNvcnA6ODA4MC9USVBDT1JFVUlJSSdcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIF1cclxuXHJcbiAgLy8gaWYgVE9PTCA9IEpJUkEgfHwgU3lzdGVtSWQgPSBKSVJBIC0+IFN5c3RlbUlkID0gSklSQVxyXG4gIC8vXHJcbiAgLy9cclxuXHJcbiAgLy8gc3RhcnRTQVBHVUlcclxuXHJcbiAgLy8gICBOOlxcPlwiYzpcXFByb2dyYW0gRmlsZXMgKHg4NilcXFNBUFxcRnJvbnRFbmRcXFNBUGd1aVwiXFxzYXBzaGN1dC5leGUgIC1zeXN0ZW09VVYyIC1jbGllbnQ9MTIwIC1jb21tYW5kPVNFMzggLXR5cGU9VHJhbnNhY3Rpb24gLXVzZXI9QVVTRVJcclxuXHJcbiAgZnVuY3Rpb24gZXhwYW5kUGFyYW1ldGVyc0luVVJMIChvTWVyZ2VkQ29udGV4dFJlc3VsdCkge1xyXG4gICAgdmFyIHB0biA9IG9NZXJnZWRDb250ZXh0UmVzdWx0LnJlc3VsdC5wYXR0ZXJuXHJcbiAgICBwdG4gPSBleGVjdGVtcGxhdGUuZXhwYW5kVGVtcGxhdGUob01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dCwgcHRuKTtcclxuLyogICAgT2JqZWN0LmtleXMob01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xyXG4gICAgICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKCd7JyArIHNLZXkgKyAnfScsICdnJylcclxuICAgICAgcHRuID0gcHRuLnJlcGxhY2UocmVnZXgsIG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHRbc0tleV0pXHJcbiAgICAgIHB0biA9IHB0bi5yZXBsYWNlKHJlZ2V4LCBvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0W3NLZXldKVxyXG4gICAgfSlcclxuICAgICovXHJcbiAgICByZXR1cm4gcHRuXHJcbiAgfVxyXG5cclxuLypcclxuICBleHBvcnQgZnVuY3Rpb24gZXhlY3V0ZVN0YXJ0dXAgKG9NZXJnZWRDb250ZXh0UmVzdWx0KSB7XHJcbiAgICBpZiAob01lcmdlZENvbnRleHRSZXN1bHQucmVzdWx0LnR5cGUgPT09ICdVUkwnKSB7XHJcbiAgICAgIHZhciBwdG4gPSBleHBhbmRQYXJhbWV0ZXJzSW5VUkwob01lcmdlZENvbnRleHRSZXN1bHQpXHJcbiAgICAgIGV4ZWMuc3RhcnRCcm93c2VyKHB0bilcclxuICAgICAgcmV0dXJuIHB0blxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdmFyIHMgPSAoXCJEb24ndCBrbm93IGhvdyB0byBzdGFydCBcIiArIG9NZXJnZWRDb250ZXh0UmVzdWx0LnJlc3VsdC50eXBlICsgJ1xcbiBmb3IgXCInICsgb01lcmdlZENvbnRleHRSZXN1bHQucXVlcnkgKyAnXCInKVxyXG4gICAgICBkZWJ1Z2xvZyhzKVxyXG4gICAgICByZXR1cm4gc1xyXG4gICAgfVxyXG4gIH1cclxuKi9cclxuXHJcbiAgZnVuY3Rpb24gbnJNYXRjaGVzIChhT2JqZWN0LCBvQ29udGV4dCkge1xyXG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKGFPYmplY3QpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XHJcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0NvbnRleHQsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIDFcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldlxyXG4gICAgfSwgMClcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIG5yTm9NYXRjaGVzIChhT2JqZWN0LCBvQ29udGV4dCkge1xyXG4gICAgdmFyIG5vTWF0Y2hBID0gT2JqZWN0LmtleXMoYU9iamVjdCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0NvbnRleHQsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIDFcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldlxyXG4gICAgfSwgMClcclxuICAgIHZhciBub01hdGNoQiA9IE9iamVjdC5rZXlzKG9Db250ZXh0KS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xyXG4gICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChhT2JqZWN0LCBrZXkpKSB7XHJcbiAgICAgICAgcHJldiA9IHByZXYgKyAxXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHByZXZcclxuICAgIH0sIDApXHJcbiAgICByZXR1cm4gbm9NYXRjaEEgKyBub01hdGNoQlxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gc2FtZU9yU3RhciAoczEgOiBzdHJpbmcsIHMyIDogc3RyaW5nIHwgUmVnRXhwIHwgRnVuY3Rpb24gLCBvRW50aXR5KSB7XHJcbiAgICByZXR1cm4gczEgPT09IHMyIHx8XHJcbiAgICAgIChzMSA9PT0gdW5kZWZpbmVkICYmIHMyID09PSBudWxsKSB8fFxyXG4gICAgICAoKHMyIGluc3RhbmNlb2YgUmVnRXhwKSAmJiBzMi5leGVjKHMxKSAhPT0gbnVsbCkgfHxcclxuICAgICAgKCh0eXBlb2YgczIgPT09ICdmdW5jdGlvbicgJiYgczEpICYmIHMyKHMxLCBvRW50aXR5KSlcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHNhbWVPclN0YXJFbXB0eSAoczEgOiBzdHJpbmcsIHMyIDogc3RyaW5nIHwgUmVnRXhwIHwgRnVuY3Rpb24sIG9FbnRpdHkpIHtcclxuICAgIGlmIChzMSA9PT0gdW5kZWZpbmVkICYmIHMyID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgcmV0dXJuIHRydWVcclxuICAgIH1cclxuICAgIGlmIChzMiA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHMxID09PSBzMiB8fFxyXG4gICAgICAoKHMyIGluc3RhbmNlb2YgUmVnRXhwKSAmJiBzMi5leGVjKHMxKSAhPT0gbnVsbCkgfHxcclxuICAgICAgKCh0eXBlb2YgczIgPT09ICdmdW5jdGlvbicgJiYgczEpICYmIHMyKHMxLCBvRW50aXR5KSlcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGZpbHRlclNob3dFbnRpdHlPbGQgKG9Db250ZXh0LCBhU2hvd0VudGl0eSkge1xyXG4gICAgdmFyIGFGaWx0ZXJlZFxyXG4gICAgT2JqZWN0LmtleXMob0NvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcclxuICAgICAgaWYgKG9Db250ZXh0W3NLZXldID09PSBudWxsKSB7XHJcbiAgICAgICAgb0NvbnRleHRbc0tleV0gPSB1bmRlZmluZWRcclxuICAgICAgfVxyXG4gICAgfSlcclxuICAgIC8vIGZpbHRlciBjb250ZXh0LCBhbWVuZGluZyBzeW5vbnltc1xyXG5cclxuXHJcbiAgICBhRmlsdGVyZWQgPSBhU2hvd0VudGl0eS5maWx0ZXIoZnVuY3Rpb24gKG9TaG93RW50aXR5KSB7XHJcbiAgICAgIC8vICAgICAgIGNvbnNvbGUubG9nKFwiLi4uXCIpXHJcbiAgICAgIC8vICAgICAgY29uc29sZS5sb2cob1Nob3dFbnRpdHkuY29udGV4dC50b29sICsgXCIgXCIgKyBvQ29udGV4dC50b29sICsgXCJcXG5cIilcclxuICAgICAgLy8gICAgICBjb25zb2xlLmxvZyhvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCArIFwiIFwiICsgb0NvbnRleHQuY2xpZW50ICtcIjpcIiArIHNhbWVPclN0YXIob0NvbnRleHQuY2xpZW50LG9TaG93RW50aXR5LmNvbnRleHQuY2xpZW50KSArIFwiXFxuXCIpXHJcbiAgICAgIC8vICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShvU2hvd0VudGl0eS5jb250ZXh0KSArIFwiXFxuXCIgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dC5jbGllbnQpICsgXCJcXG5cIilcclxuXHJcbiAgICAgIHJldHVybiBzYW1lT3JTdGFyKG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtSWQsIG9Db250ZXh0LnN5c3RlbUlkLCBvQ29udGV4dCkgJiZcclxuICAgICAgICBzYW1lT3JTdGFyKG9Db250ZXh0LnRvb2wsIG9TaG93RW50aXR5LmNvbnRleHQudG9vbCwgb0NvbnRleHQpICYmXHJcbiAgICAgICAgc2FtZU9yU3RhcihvQ29udGV4dC5jbGllbnQsIG9TaG93RW50aXR5LmNvbnRleHQuY2xpZW50LCBvQ29udGV4dCkgJiZcclxuICAgICAgICBzYW1lT3JTdGFyRW1wdHkob0NvbnRleHQuc3lzdGVtT2JqZWN0Q2F0ZWdvcnksIG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtT2JqZWN0Q2F0ZWdvcnksIG9Db250ZXh0KSAmJlxyXG4gICAgICAgIHNhbWVPclN0YXJFbXB0eShvQ29udGV4dC5zeXN0ZW1PYmplY3RJZCwgb1Nob3dFbnRpdHkuY29udGV4dC5zeXN0ZW1PYmplY3RJZCwgb0NvbnRleHQpXHJcbiAgICAvLyAgICAgICYmIG9TaG93RW50aXR5LmNvbnRleHQudG9vbCA9PT0gb0NvbnRleHQudG9vbFxyXG4gICAgfSlcclxuICAgIC8vICBjb25zb2xlLmxvZyhhRmlsdGVyZWQubGVuZ3RoKVxyXG4gICAgLy8gbWF0Y2ggb3RoZXIgY29udGV4dCBwYXJhbWV0ZXJzXHJcbiAgICBhRmlsdGVyZWQuc29ydChmdW5jdGlvbiAoYSwgYikge1xyXG4gICAgICB2YXIgbnJNYXRjaGVzQSA9IG5yTWF0Y2hlcyhhLmNvbnRleHQsIG9Db250ZXh0KVxyXG4gICAgICB2YXIgbnJNYXRjaGVzQiA9IG5yTWF0Y2hlcyhiLmNvbnRleHQsIG9Db250ZXh0KVxyXG4gICAgICB2YXIgbnJOb01hdGNoZXNBID0gbnJOb01hdGNoZXMoYS5jb250ZXh0LCBvQ29udGV4dClcclxuICAgICAgdmFyIG5yTm9NYXRjaGVzQiA9IG5yTm9NYXRjaGVzKGIuY29udGV4dCwgb0NvbnRleHQpXHJcbiAgICAgIC8vICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYS5jb250ZXh0KSlcclxuICAgICAgLy8gICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShiLmNvbnRleHQpKVxyXG4gICAgICAvLyAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KG9Db250ZXh0KSlcclxuICAgICAgdmFyIHJlcyA9IC0obnJNYXRjaGVzQSAtIG5yTWF0Y2hlc0IpICogMTAwICsgKG5yTm9NYXRjaGVzQSAtIG5yTm9NYXRjaGVzQilcclxuICAgICAgLy8gICAgIGNvbnNvbGUubG9nKFwiZGlmZiBcIiArIHJlcylcclxuICAgICAgcmV0dXJuIHJlc1xyXG4gICAgfSlcclxuICAgIGlmIChhRmlsdGVyZWQubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIGRlYnVnbG9nKCdubyB0YXJnZXQgZm9yIHNob3dFbnRpdHkgJyArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0KSlcclxuICAgIH1cclxuICAgIC8vIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGFGaWx0ZXJlZCx1bmRlZmluZWQsMikpXHJcbiAgICBpZiAoYUZpbHRlcmVkWzBdKSB7XHJcbiAgICAgIC8vIGV4ZWN1dGUgYWxsIGZ1bmN0aW9uc1xyXG5cclxuICAgICAgdmFyIG9NYXRjaCA9IGFGaWx0ZXJlZFswXVxyXG5cclxuICAgICAgdmFyIG9NZXJnZWQgPSB7XHJcbiAgICAgICAgY29udGV4dDoge1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgb01lcmdlZC5jb250ZXh0ID0gQW55T2JqZWN0LmFzc2lnbih7fSwgb01lcmdlZC5jb250ZXh0LCBhRmlsdGVyZWRbMF0uY29udGV4dCwgb0NvbnRleHQpXHJcbiAgICAgIG9NZXJnZWQgPSBBbnlPYmplY3QuYXNzaWduKG9NZXJnZWQsIHtcclxuICAgICAgICByZXN1bHQ6IGFGaWx0ZXJlZFswXS5yZXN1bHRcclxuICAgICAgfSlcclxuXHJcbiAgICAgIE9iamVjdC5rZXlzKG9NYXRjaC5jb250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBvTWF0Y2guY29udGV4dFtzS2V5XSA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgZGVidWdsb2coJ05vdyByZXRyb2ZpdHRpbmcgOicgKyBzS2V5ICsgJyAtICcgKyBvQ29udGV4dFtzS2V5XSlcclxuICAgICAgICAgIG9NZXJnZWQgPSBvTWF0Y2guY29udGV4dFtzS2V5XShvQ29udGV4dFtzS2V5XSwgb01lcmdlZClcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcblxyXG4gICAgICByZXR1cm4gb01lcmdlZFxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG51bGxcclxuICB9XHJcblxyXG5cclxuaW1wb3J0ICogYXMgaW5wdXRGaWx0ZXIgZnJvbSAnLi9pbnB1dEZpbHRlcic7XHJcblxyXG4gIGZ1bmN0aW9uIGZpbHRlclNob3dFbnRpdHkgKG9Db250ZXh0LCBhU2hvd0VudGl0eUFjdGlvbnMpIHtcclxuICAgIE9iamVjdC5rZXlzKG9Db250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XHJcbiAgICAgIGlmIChvQ29udGV4dFtzS2V5XSA9PT0gbnVsbCkge1xyXG4gICAgICAgIGRlbGV0ZSBvQ29udGV4dFtzS2V5XVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gICAgdmFyIHJlcyA9IGlucHV0RmlsdGVyLmFwcGx5UnVsZXNQaWNrRmlyc3Qob0NvbnRleHQpO1xyXG4gICAgaWYgKCFyZXMpIHtcclxuICAgICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gICAgfVxyXG4gICAgZGVidWdsb2coXCIqKiBhZnRlciBmaWx0ZXIgcnVsZXNcIiArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSlcclxuICAgIHJldHVybiBmaWx0ZXJTaG93RW50aXR5T2xkKHJlcyxhU2hvd0VudGl0eUFjdGlvbnMpO1xyXG4gIH1cclxuXHJcbi8qXHJcbiAgZnVuY3Rpb24gZXhlY1Nob3dFbnRpdHkgKG9FbnRpdHkpIHtcclxuICAgIHZhciBtZXJnZWQgPSBmaWx0ZXJTaG93RW50aXR5KG9FbnRpdHksIGFTaG93RW50aXR5QWN0aW9ucylcclxuICAgIGlmIChtZXJnZWQpIHtcclxuICAgICAgcmV0dXJuIGV4ZWN1dGVTdGFydHVwKG1lcmdlZClcclxuICAgIH1cclxuICAgIHJldHVybiBudWxsXHJcbiAgfVxyXG4qL1xyXG5cclxuICAvLyBFOlxccHJvamVjdHNcXG5vZGVqc1xcYm90YnVpbGRlclxcc2FtcGxlYm90PlwiJVByb2dyYW1GaWxlcyh4ODYpJVxcR29vZ2xlXFxDaHJvbWVcXEFwcGxpY2F0aW9uXFxjaHJvbWUuZXhlXCIgLS1pbmNvZ25pdG8gLXVybCB3d3cuc3BpZWdlbC5kZVxyXG5cclxuICBleHBvcnQgY29uc3QgZGlzcGF0Y2hlciA9IHtcclxuLy8gICAgZXhlY1Nob3dFbnRpdHk6IGV4ZWNTaG93RW50aXR5LFxyXG4gICAgX3Rlc3Q6IHtcclxuICAgICAgc2FtZU9yU3Rhcjogc2FtZU9yU3RhcixcclxuICAgICAgbnJNYXRjaGVzOiBuck1hdGNoZXMsXHJcbiAgICAgIG5yTm9NYXRjaGVzOiBuck5vTWF0Y2hlcyxcclxuICAgICAgZXhwYW5kUGFyYW1ldGVyc0luVVJMOiBleHBhbmRQYXJhbWV0ZXJzSW5VUkwsXHJcbiAgICAgIGZpbHRlclNob3dFbnRpdHk6IGZpbHRlclNob3dFbnRpdHksXHJcbiAgICAvLyAgZm5GaW5kVW5pdFRlc3Q6IGZuRmluZFVuaXRUZXN0LFxyXG4gICAgICBjYWxjRGlzdGFuY2U6IGNhbGNEaXN0YW5jZSxcclxuICAgICAgX2FTaG93RW50aXR5QWN0aW9uczogYVNob3dFbnRpdHlBY3Rpb25zXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvL2V4cG9ydHMgZGlzcGF0Y2hlcjtcclxuXHJcbiAgLy9tb2R1bGUuZXhwb3J0cyA9IGRpc3BhdGNoZXJcclxuXHJcbiIsIi8qKlxuICogQGZpbGVcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmRpc3BhdGNoZXJcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cbiAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG52YXIgQW55T2JqZWN0ID0gT2JqZWN0O1xudmFyIGRpc3RhbmNlID0gcmVxdWlyZShcIi4uL3V0aWxzL2RhbWVyYXVMZXZlbnNodGVpblwiKTtcbnZhciBkZWJ1ZyA9IHJlcXVpcmUoXCJkZWJ1Z1wiKTtcbnZhciBkZWJ1Z2xvZyA9IGRlYnVnKCdkaXNwYXRjaGVyJyk7XG4vLyAgdmFyIGV4ZWMgPSByZXF1aXJlKCdjaGlsZF9wcm9jZXNzJykuZXhlY1xuLy8gIHZhciBsZXZlbiA9IHJlcXVpcmUoJy4uL3V0aWxzL2RhbWVyYXVMZXZlbnNodGVpbi5qcycpLmxldmVuc2h0ZWluXG52YXIgZXhlY3RlbXBsYXRlID0gcmVxdWlyZShcIi4uL2V4ZWMvZXhlY3RlbXBsYXRlXCIpO1xuLy92YXIgbGV2ZW4gPSByZXF1aXJlKCcuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4uanMnKVxudmFyIG1hdGNoZGF0YSA9IHJlcXVpcmUoXCIuL21hdGNoZGF0YVwiKTtcbnZhciBBbGdvbCA9IHJlcXVpcmUoXCIuLi9tYXRjaC9hbGdvbFwiKTtcbnZhciBvVW5pdFRlc3RzID0gbWF0Y2hkYXRhLm9Vbml0VGVzdHM7XG52YXIgb1dpa2lzID0gbWF0Y2hkYXRhLm9XaWtpcztcbmZ1bmN0aW9uIGNhbGNEaXN0YW5jZShzVGV4dDEsIHNUZXh0Mikge1xuICAgIHJldHVybiBkaXN0YW5jZS5jYWxjRGlzdGFuY2Uoc1RleHQxLnRvTG93ZXJDYXNlKCksIHNUZXh0Mik7XG4gICAgLypcbiAgICBkZWJ1Z2xvZyhcImxlbmd0aDJcIiArIHNUZXh0MSArIFwiIC0gXCIgKyBzVGV4dDIpXG4gICAgdmFyIGEwID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnN1YnN0cmluZygwLCBzVGV4dDIubGVuZ3RoKSwgc1RleHQyKVxuICAgIHZhciBhID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnRvTG93ZXJDYXNlKCksIHNUZXh0MilcbiAgICByZXR1cm4gYTAgKiA1MDAgLyBzVGV4dDIubGVuZ3RoICsgYVxuICAgICovXG59XG5mdW5jdGlvbiBmbkZpbmRNYXRjaChzS2V5d29yZCwgb0NvbnRleHQsIG9NYXApIHtcbiAgICAvLyByZXR1cm4gYSBiZXR0ZXIgY29udGV4dCBpZiB0aGVyZSBpcyBhIG1hdGNoXG4gICAgLy8gc0tleXdvcmQgPSBzS2V5d29yZC50b0xvd2VyQ2FzZSgpO1xuICAgIHZhciBzS2V5d29yZExjID0gc0tleXdvcmQudG9Mb3dlckNhc2UoKTtcbiAgICBvTWFwLnNvcnQoZnVuY3Rpb24gKG9FbnRyeTEsIG9FbnRyeTIpIHtcbiAgICAgICAgdmFyIHUxID0gY2FsY0Rpc3RhbmNlKG9FbnRyeTEua2V5LCBzS2V5d29yZExjKTtcbiAgICAgICAgdmFyIHUyID0gY2FsY0Rpc3RhbmNlKG9FbnRyeTIua2V5LCBzS2V5d29yZExjKTtcbiAgICAgICAgcmV0dXJuIHUyIC0gdTE7XG4gICAgfSk7XG4gICAgLy8gbGF0ZXI6IGluIGNhc2Ugb2YgY29uZmxpY3RzLCBhc2ssXG4gICAgLy8gbm93OlxuICAgIHZhciBkaXN0ID0gY2FsY0Rpc3RhbmNlKG9NYXBbMF0ua2V5LCBzS2V5d29yZExjKTtcbiAgICBkZWJ1Z2xvZygnYmVzdCBkaXN0JyArIGRpc3QgKyAnIC8gICcgKyBvTWFwWzBdLmtleSArICcgJyArIHNLZXl3b3JkKTtcbiAgICBpZiAoZGlzdCA+IEFsZ29sLkN1dG9mZl9Xb3JkTWF0Y2gpIHtcbiAgICAgICAgdmFyIG8xID0gT2JqZWN0LmFzc2lnbih7fSwgb0NvbnRleHQpO1xuICAgICAgICB2YXIgbzI7XG4gICAgICAgIG8xLmNvbnRleHQgPSBPYmplY3QuYXNzaWduKHt9LCBvMS5jb250ZXh0KTtcbiAgICAgICAgbzIgPSBvMTtcbiAgICAgICAgbzIuY29udGV4dCA9IE9iamVjdC5hc3NpZ24obzEuY29udGV4dCwgb01hcFswXS5jb250ZXh0KTtcbiAgICAgICAgcmV0dXJuIG8yO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cbi8qKlxuICogYSBmdW5jdGlvbiB0byBtYXRjaCBhIHVuaXQgdGVzdCB1c2luZyBsZXZlbnNodGVpbiBkaXN0YW5jZXNcbiAqIEBwdWJsaWNcbiAqL1xuZnVuY3Rpb24gZm5GaW5kVW5pdFRlc3Qoc3N5c3RlbU9iamVjdElkLCBvQ29udGV4dCkge1xuICAgIHJldHVybiBmbkZpbmRNYXRjaChzc3lzdGVtT2JqZWN0SWQsIG9Db250ZXh0LCBvVW5pdFRlc3RzKTtcbn1cbmZ1bmN0aW9uIGZuRmluZFdpa2koc0tleXdvcmQsIG9Db250ZXh0KSB7XG4gICAgcmV0dXJuIGZuRmluZE1hdGNoKHNLZXl3b3JkLCBvQ29udGV4dCwgb1dpa2lzKTtcbn1cbnZhciBhU2hvd0VudGl0eUFjdGlvbnMgPSBbXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1JZDogJ3V2MicsXG4gICAgICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcbiAgICAgICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwJ1xuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXV2Mi53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvdWkyL3VzaGVsbC9zaGVsbHMvYWJhcC9GaW9yaUxhdW5jaHBhZC5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtSWQ6ICd1djInLFxuICAgICAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXG4gICAgICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscGQnXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdXYyLndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS9zYXAvYXJzcnZjX3VwYl9hZG1uL21haW4uaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbUlkOiAndTF5JyxcbiAgICAgICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxuICAgICAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHAnXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdTF5LndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS91aTIvdXNoZWxsL3NoZWxscy9hYmFwL0Zpb3JpTGF1bmNocGFkLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1JZDogJ3UxeScsXG4gICAgICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcbiAgICAgICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwZCdcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1MXkud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3NhcC9hcnNydmNfdXBiX2FkbW4vbWFpbi5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtSWQ6ICd1djInLFxuICAgICAgICAgICAgY2xpZW50OiAnMTIwJyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAnZmlvcmkgY2F0YWxvZycsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogLy4qLyxcbiAgICAgICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcbiAgICAgICAgICAgIHRvb2w6ICdGTFBEJ1xuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXV2Mi53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvc2FwL2Fyc3J2Y191cGJfYWRtbi9tYWluLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSNDQVRBTE9HOntzeXN0ZW1PYmplY3RJZH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtT2JqZWN0Q2F0ZWdvcnk6ICd1bml0JyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiBmbkZpbmRVbml0VGVzdFxuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MC97cGF0aH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtT2JqZWN0Q2F0ZWdvcnk6ICd1bml0IHRlc3QnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IGZuRmluZFVuaXRUZXN0XG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cDovL2xvY2FsaG9zdDo4MDgwL3twYXRofSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ3dpa2knLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IGZuRmluZFdpa2lcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwczovL3dpa2kud2RmLnNhcC5jb3JwL3twYXRofSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1JZDogJ0pJUkEnXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9qaXJhLndkZi5zYXAuY29ycDo4MDgwL1RJUENPUkVVSUlJJ1xuICAgICAgICB9XG4gICAgfVxuXTtcbi8vIGlmIFRPT0wgPSBKSVJBIHx8IFN5c3RlbUlkID0gSklSQSAtPiBTeXN0ZW1JZCA9IEpJUkFcbi8vXG4vL1xuLy8gc3RhcnRTQVBHVUlcbi8vICAgTjpcXD5cImM6XFxQcm9ncmFtIEZpbGVzICh4ODYpXFxTQVBcXEZyb250RW5kXFxTQVBndWlcIlxcc2Fwc2hjdXQuZXhlICAtc3lzdGVtPVVWMiAtY2xpZW50PTEyMCAtY29tbWFuZD1TRTM4IC10eXBlPVRyYW5zYWN0aW9uIC11c2VyPUFVU0VSXG5mdW5jdGlvbiBleHBhbmRQYXJhbWV0ZXJzSW5VUkwob01lcmdlZENvbnRleHRSZXN1bHQpIHtcbiAgICB2YXIgcHRuID0gb01lcmdlZENvbnRleHRSZXN1bHQucmVzdWx0LnBhdHRlcm47XG4gICAgcHRuID0gZXhlY3RlbXBsYXRlLmV4cGFuZFRlbXBsYXRlKG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHQsIHB0bik7XG4gICAgLyogICAgT2JqZWN0LmtleXMob01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xuICAgICAgICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoJ3snICsgc0tleSArICd9JywgJ2cnKVxuICAgICAgICAgIHB0biA9IHB0bi5yZXBsYWNlKHJlZ2V4LCBvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0W3NLZXldKVxuICAgICAgICAgIHB0biA9IHB0bi5yZXBsYWNlKHJlZ2V4LCBvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0W3NLZXldKVxuICAgICAgICB9KVxuICAgICAgICAqL1xuICAgIHJldHVybiBwdG47XG59XG4vKlxuICBleHBvcnQgZnVuY3Rpb24gZXhlY3V0ZVN0YXJ0dXAgKG9NZXJnZWRDb250ZXh0UmVzdWx0KSB7XG4gICAgaWYgKG9NZXJnZWRDb250ZXh0UmVzdWx0LnJlc3VsdC50eXBlID09PSAnVVJMJykge1xuICAgICAgdmFyIHB0biA9IGV4cGFuZFBhcmFtZXRlcnNJblVSTChvTWVyZ2VkQ29udGV4dFJlc3VsdClcbiAgICAgIGV4ZWMuc3RhcnRCcm93c2VyKHB0bilcbiAgICAgIHJldHVybiBwdG5cbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHMgPSAoXCJEb24ndCBrbm93IGhvdyB0byBzdGFydCBcIiArIG9NZXJnZWRDb250ZXh0UmVzdWx0LnJlc3VsdC50eXBlICsgJ1xcbiBmb3IgXCInICsgb01lcmdlZENvbnRleHRSZXN1bHQucXVlcnkgKyAnXCInKVxuICAgICAgZGVidWdsb2cocylcbiAgICAgIHJldHVybiBzXG4gICAgfVxuICB9XG4qL1xuZnVuY3Rpb24gbnJNYXRjaGVzKGFPYmplY3QsIG9Db250ZXh0KSB7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKGFPYmplY3QpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0NvbnRleHQsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbn1cbmZ1bmN0aW9uIG5yTm9NYXRjaGVzKGFPYmplY3QsIG9Db250ZXh0KSB7XG4gICAgdmFyIG5vTWF0Y2hBID0gT2JqZWN0LmtleXMoYU9iamVjdCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0NvbnRleHQsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbiAgICB2YXIgbm9NYXRjaEIgPSBPYmplY3Qua2V5cyhvQ29udGV4dCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcbiAgICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYU9iamVjdCwga2V5KSkge1xuICAgICAgICAgICAgcHJldiA9IHByZXYgKyAxO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgIH0sIDApO1xuICAgIHJldHVybiBub01hdGNoQSArIG5vTWF0Y2hCO1xufVxuZnVuY3Rpb24gc2FtZU9yU3RhcihzMSwgczIsIG9FbnRpdHkpIHtcbiAgICByZXR1cm4gczEgPT09IHMyIHx8XG4gICAgICAgIChzMSA9PT0gdW5kZWZpbmVkICYmIHMyID09PSBudWxsKSB8fFxuICAgICAgICAoKHMyIGluc3RhbmNlb2YgUmVnRXhwKSAmJiBzMi5leGVjKHMxKSAhPT0gbnVsbCkgfHxcbiAgICAgICAgKCh0eXBlb2YgczIgPT09ICdmdW5jdGlvbicgJiYgczEpICYmIHMyKHMxLCBvRW50aXR5KSk7XG59XG5mdW5jdGlvbiBzYW1lT3JTdGFyRW1wdHkoczEsIHMyLCBvRW50aXR5KSB7XG4gICAgaWYgKHMxID09PSB1bmRlZmluZWQgJiYgczIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKHMyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBzMSA9PT0gczIgfHxcbiAgICAgICAgKChzMiBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgczIuZXhlYyhzMSkgIT09IG51bGwpIHx8XG4gICAgICAgICgodHlwZW9mIHMyID09PSAnZnVuY3Rpb24nICYmIHMxKSAmJiBzMihzMSwgb0VudGl0eSkpO1xufVxuZnVuY3Rpb24gZmlsdGVyU2hvd0VudGl0eU9sZChvQ29udGV4dCwgYVNob3dFbnRpdHkpIHtcbiAgICB2YXIgYUZpbHRlcmVkO1xuICAgIE9iamVjdC5rZXlzKG9Db250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgICAgIGlmIChvQ29udGV4dFtzS2V5XSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgb0NvbnRleHRbc0tleV0gPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICAvLyBmaWx0ZXIgY29udGV4dCwgYW1lbmRpbmcgc3lub255bXNcbiAgICBhRmlsdGVyZWQgPSBhU2hvd0VudGl0eS5maWx0ZXIoZnVuY3Rpb24gKG9TaG93RW50aXR5KSB7XG4gICAgICAgIC8vICAgICAgIGNvbnNvbGUubG9nKFwiLi4uXCIpXG4gICAgICAgIC8vICAgICAgY29uc29sZS5sb2cob1Nob3dFbnRpdHkuY29udGV4dC50b29sICsgXCIgXCIgKyBvQ29udGV4dC50b29sICsgXCJcXG5cIilcbiAgICAgICAgLy8gICAgICBjb25zb2xlLmxvZyhvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCArIFwiIFwiICsgb0NvbnRleHQuY2xpZW50ICtcIjpcIiArIHNhbWVPclN0YXIob0NvbnRleHQuY2xpZW50LG9TaG93RW50aXR5LmNvbnRleHQuY2xpZW50KSArIFwiXFxuXCIpXG4gICAgICAgIC8vICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShvU2hvd0VudGl0eS5jb250ZXh0KSArIFwiXFxuXCIgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dC5jbGllbnQpICsgXCJcXG5cIilcbiAgICAgICAgcmV0dXJuIHNhbWVPclN0YXIob1Nob3dFbnRpdHkuY29udGV4dC5zeXN0ZW1JZCwgb0NvbnRleHQuc3lzdGVtSWQsIG9Db250ZXh0KSAmJlxuICAgICAgICAgICAgc2FtZU9yU3RhcihvQ29udGV4dC50b29sLCBvU2hvd0VudGl0eS5jb250ZXh0LnRvb2wsIG9Db250ZXh0KSAmJlxuICAgICAgICAgICAgc2FtZU9yU3RhcihvQ29udGV4dC5jbGllbnQsIG9TaG93RW50aXR5LmNvbnRleHQuY2xpZW50LCBvQ29udGV4dCkgJiZcbiAgICAgICAgICAgIHNhbWVPclN0YXJFbXB0eShvQ29udGV4dC5zeXN0ZW1PYmplY3RDYXRlZ29yeSwgb1Nob3dFbnRpdHkuY29udGV4dC5zeXN0ZW1PYmplY3RDYXRlZ29yeSwgb0NvbnRleHQpICYmXG4gICAgICAgICAgICBzYW1lT3JTdGFyRW1wdHkob0NvbnRleHQuc3lzdGVtT2JqZWN0SWQsIG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtT2JqZWN0SWQsIG9Db250ZXh0KTtcbiAgICAgICAgLy8gICAgICAmJiBvU2hvd0VudGl0eS5jb250ZXh0LnRvb2wgPT09IG9Db250ZXh0LnRvb2xcbiAgICB9KTtcbiAgICAvLyAgY29uc29sZS5sb2coYUZpbHRlcmVkLmxlbmd0aClcbiAgICAvLyBtYXRjaCBvdGhlciBjb250ZXh0IHBhcmFtZXRlcnNcbiAgICBhRmlsdGVyZWQuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICB2YXIgbnJNYXRjaGVzQSA9IG5yTWF0Y2hlcyhhLmNvbnRleHQsIG9Db250ZXh0KTtcbiAgICAgICAgdmFyIG5yTWF0Y2hlc0IgPSBuck1hdGNoZXMoYi5jb250ZXh0LCBvQ29udGV4dCk7XG4gICAgICAgIHZhciBuck5vTWF0Y2hlc0EgPSBuck5vTWF0Y2hlcyhhLmNvbnRleHQsIG9Db250ZXh0KTtcbiAgICAgICAgdmFyIG5yTm9NYXRjaGVzQiA9IG5yTm9NYXRjaGVzKGIuY29udGV4dCwgb0NvbnRleHQpO1xuICAgICAgICAvLyAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGEuY29udGV4dCkpXG4gICAgICAgIC8vICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYi5jb250ZXh0KSlcbiAgICAgICAgLy8gICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShvQ29udGV4dCkpXG4gICAgICAgIHZhciByZXMgPSAtKG5yTWF0Y2hlc0EgLSBuck1hdGNoZXNCKSAqIDEwMCArIChuck5vTWF0Y2hlc0EgLSBuck5vTWF0Y2hlc0IpO1xuICAgICAgICAvLyAgICAgY29uc29sZS5sb2coXCJkaWZmIFwiICsgcmVzKVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH0pO1xuICAgIGlmIChhRmlsdGVyZWQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGRlYnVnbG9nKCdubyB0YXJnZXQgZm9yIHNob3dFbnRpdHkgJyArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0KSk7XG4gICAgfVxuICAgIC8vIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGFGaWx0ZXJlZCx1bmRlZmluZWQsMikpXG4gICAgaWYgKGFGaWx0ZXJlZFswXSkge1xuICAgICAgICAvLyBleGVjdXRlIGFsbCBmdW5jdGlvbnNcbiAgICAgICAgdmFyIG9NYXRjaCA9IGFGaWx0ZXJlZFswXTtcbiAgICAgICAgdmFyIG9NZXJnZWQgPSB7XG4gICAgICAgICAgICBjb250ZXh0OiB7fVxuICAgICAgICB9O1xuICAgICAgICBvTWVyZ2VkLmNvbnRleHQgPSBBbnlPYmplY3QuYXNzaWduKHt9LCBvTWVyZ2VkLmNvbnRleHQsIGFGaWx0ZXJlZFswXS5jb250ZXh0LCBvQ29udGV4dCk7XG4gICAgICAgIG9NZXJnZWQgPSBBbnlPYmplY3QuYXNzaWduKG9NZXJnZWQsIHtcbiAgICAgICAgICAgIHJlc3VsdDogYUZpbHRlcmVkWzBdLnJlc3VsdFxuICAgICAgICB9KTtcbiAgICAgICAgT2JqZWN0LmtleXMob01hdGNoLmNvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb01hdGNoLmNvbnRleHRbc0tleV0gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBkZWJ1Z2xvZygnTm93IHJldHJvZml0dGluZyA6JyArIHNLZXkgKyAnIC0gJyArIG9Db250ZXh0W3NLZXldKTtcbiAgICAgICAgICAgICAgICBvTWVyZ2VkID0gb01hdGNoLmNvbnRleHRbc0tleV0ob0NvbnRleHRbc0tleV0sIG9NZXJnZWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG9NZXJnZWQ7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxudmFyIGlucHV0RmlsdGVyID0gcmVxdWlyZShcIi4vaW5wdXRGaWx0ZXJcIik7XG5mdW5jdGlvbiBmaWx0ZXJTaG93RW50aXR5KG9Db250ZXh0LCBhU2hvd0VudGl0eUFjdGlvbnMpIHtcbiAgICBPYmplY3Qua2V5cyhvQ29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xuICAgICAgICBpZiAob0NvbnRleHRbc0tleV0gPT09IG51bGwpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBvQ29udGV4dFtzS2V5XTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHZhciByZXMgPSBpbnB1dEZpbHRlci5hcHBseVJ1bGVzUGlja0ZpcnN0KG9Db250ZXh0KTtcbiAgICBpZiAoIXJlcykge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBkZWJ1Z2xvZyhcIioqIGFmdGVyIGZpbHRlciBydWxlc1wiICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKTtcbiAgICByZXR1cm4gZmlsdGVyU2hvd0VudGl0eU9sZChyZXMsIGFTaG93RW50aXR5QWN0aW9ucyk7XG59XG4vKlxuICBmdW5jdGlvbiBleGVjU2hvd0VudGl0eSAob0VudGl0eSkge1xuICAgIHZhciBtZXJnZWQgPSBmaWx0ZXJTaG93RW50aXR5KG9FbnRpdHksIGFTaG93RW50aXR5QWN0aW9ucylcbiAgICBpZiAobWVyZ2VkKSB7XG4gICAgICByZXR1cm4gZXhlY3V0ZVN0YXJ0dXAobWVyZ2VkKVxuICAgIH1cbiAgICByZXR1cm4gbnVsbFxuICB9XG4qL1xuLy8gRTpcXHByb2plY3RzXFxub2RlanNcXGJvdGJ1aWxkZXJcXHNhbXBsZWJvdD5cIiVQcm9ncmFtRmlsZXMoeDg2KSVcXEdvb2dsZVxcQ2hyb21lXFxBcHBsaWNhdGlvblxcY2hyb21lLmV4ZVwiIC0taW5jb2duaXRvIC11cmwgd3d3LnNwaWVnZWwuZGVcbmV4cG9ydHMuZGlzcGF0Y2hlciA9IHtcbiAgICAvLyAgICBleGVjU2hvd0VudGl0eTogZXhlY1Nob3dFbnRpdHksXG4gICAgX3Rlc3Q6IHtcbiAgICAgICAgc2FtZU9yU3Rhcjogc2FtZU9yU3RhcixcbiAgICAgICAgbnJNYXRjaGVzOiBuck1hdGNoZXMsXG4gICAgICAgIG5yTm9NYXRjaGVzOiBuck5vTWF0Y2hlcyxcbiAgICAgICAgZXhwYW5kUGFyYW1ldGVyc0luVVJMOiBleHBhbmRQYXJhbWV0ZXJzSW5VUkwsXG4gICAgICAgIGZpbHRlclNob3dFbnRpdHk6IGZpbHRlclNob3dFbnRpdHksXG4gICAgICAgIC8vICBmbkZpbmRVbml0VGVzdDogZm5GaW5kVW5pdFRlc3QsXG4gICAgICAgIGNhbGNEaXN0YW5jZTogY2FsY0Rpc3RhbmNlLFxuICAgICAgICBfYVNob3dFbnRpdHlBY3Rpb25zOiBhU2hvd0VudGl0eUFjdGlvbnNcbiAgICB9XG59O1xuLy9leHBvcnRzIGRpc3BhdGNoZXI7XG4vL21vZHVsZS5leHBvcnRzID0gZGlzcGF0Y2hlclxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
