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
    var dist = distance.calcDistance(oMap[0].key.toLowerCase(), sKeywordLc);
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
/*

import {InputFilter as inputFilter} from 'abot_erbase';

  function filterShowEntity (oContext, aShowEntityActions) {
    Object.keys(oContext).forEach(function (sKey) {
      if (oContext[sKey] === null) {
        delete oContext[sKey]
      }
    })
    var res = inputFilter.applyRulesPickFirst(oContext);
    if (!res) {
      return undefined
    }
    debuglog("** after filter rules" + JSON.stringify(res, undefined, 2))
    return filterShowEntityOld(res,aShowEntityActions);
  }
*/
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
        // sameOrStar: sameOrStar,
        //    nrMatches: nrMatches,
        //    nrNoMatches: nrNoMatches,
        expandParametersInURL: expandParametersInURL,
        //    filterShowEntity: filterShowEntity,
        //  fnFindUnitTest: fnFindUnitTest,
        calcDistance: calcDistance,
        _aShowEntityActions: aShowEntityActions
    }
};
//exports dispatcher;
//module.exports = dispatcher
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9kaXNwYXRjaGVyLnRzIiwibWF0Y2gvZGlzcGF0Y2hlci5qcyJdLCJuYW1lcyI6WyJBbnlPYmplY3QiLCJPYmplY3QiLCJkaXN0YW5jZSIsInJlcXVpcmUiLCJkZWJ1ZyIsImRlYnVnbG9nIiwiZXhlY3RlbXBsYXRlIiwibWF0Y2hkYXRhIiwiQWxnb2wiLCJvVW5pdFRlc3RzIiwib1dpa2lzIiwiY2FsY0Rpc3RhbmNlIiwic1RleHQxIiwic1RleHQyIiwidG9Mb3dlckNhc2UiLCJmbkZpbmRNYXRjaCIsInNLZXl3b3JkIiwib0NvbnRleHQiLCJvTWFwIiwic0tleXdvcmRMYyIsInNvcnQiLCJvRW50cnkxIiwib0VudHJ5MiIsInUxIiwia2V5IiwidTIiLCJkaXN0IiwiQ3V0b2ZmX1dvcmRNYXRjaCIsIm8xIiwiYXNzaWduIiwibzIiLCJjb250ZXh0IiwiZm5GaW5kVW5pdFRlc3QiLCJzc3lzdGVtT2JqZWN0SWQiLCJmbkZpbmRXaWtpIiwiYVNob3dFbnRpdHlBY3Rpb25zIiwic3lzdGVtSWQiLCJjbGllbnQiLCJzeXN0ZW10eXBlIiwic3lzdGVtT2JqZWN0SWQiLCJyZXN1bHQiLCJ0eXBlIiwicGF0dGVybiIsInN5c3RlbU9iamVjdENhdGVnb3J5IiwidG9vbCIsImV4cGFuZFBhcmFtZXRlcnNJblVSTCIsIm9NZXJnZWRDb250ZXh0UmVzdWx0IiwicHRuIiwiZXhwYW5kVGVtcGxhdGUiLCJuck1hdGNoZXMiLCJhT2JqZWN0Iiwia2V5cyIsInJlZHVjZSIsInByZXYiLCJwcm90b3R5cGUiLCJoYXNPd25Qcm9wZXJ0eSIsImNhbGwiLCJuck5vTWF0Y2hlcyIsIm5vTWF0Y2hBIiwibm9NYXRjaEIiLCJzYW1lT3JTdGFyIiwiczEiLCJzMiIsIm9FbnRpdHkiLCJ1bmRlZmluZWQiLCJSZWdFeHAiLCJleGVjIiwic2FtZU9yU3RhckVtcHR5IiwiZmlsdGVyU2hvd0VudGl0eU9sZCIsImFTaG93RW50aXR5IiwiYUZpbHRlcmVkIiwiZm9yRWFjaCIsInNLZXkiLCJmaWx0ZXIiLCJvU2hvd0VudGl0eSIsImEiLCJiIiwibnJNYXRjaGVzQSIsIm5yTWF0Y2hlc0IiLCJuck5vTWF0Y2hlc0EiLCJuck5vTWF0Y2hlc0IiLCJyZXMiLCJsZW5ndGgiLCJKU09OIiwic3RyaW5naWZ5Iiwib01hdGNoIiwib01lcmdlZCIsImV4cG9ydHMiLCJkaXNwYXRjaGVyIiwiX3Rlc3QiLCJfYVNob3dFbnRpdHlBY3Rpb25zIl0sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7QUNLQTs7QURRQSxJQUFJQSxZQUFrQkMsTUFBdEI7QUFFQSxJQUFBQyxXQUFBQyxRQUFBLGlCQUFBLENBQUE7QUFFQSxJQUFBQyxRQUFBRCxRQUFBLE9BQUEsQ0FBQTtBQUNBLElBQU1FLFdBQVdELE1BQU0sWUFBTixDQUFqQjtBQUdBO0FBQ0E7QUFFQSxJQUFBRSxlQUFBSCxRQUFBLHNCQUFBLENBQUE7QUFFRTtBQUNGLElBQUFJLFlBQUFKLFFBQUEsYUFBQSxDQUFBO0FBRUEsSUFBQUssUUFBQUwsUUFBQSxnQkFBQSxDQUFBO0FBRUEsSUFBTU0sYUFBYUYsVUFBVUUsVUFBN0I7QUFDQSxJQUFNQyxTQUFTSCxVQUFVRyxNQUF6QjtBQUVFLFNBQUFDLFlBQUEsQ0FBdUJDLE1BQXZCLEVBQStCQyxNQUEvQixFQUFxQztBQUNuQyxXQUFPWCxTQUFTUyxZQUFULENBQXNCQyxPQUFPRSxXQUFQLEVBQXRCLEVBQTRDRCxNQUE1QyxDQUFQO0FBQ0E7Ozs7OztBQU1EO0FBRUQsU0FBQUUsV0FBQSxDQUFzQkMsUUFBdEIsRUFBZ0NDLFFBQWhDLEVBQTBDQyxJQUExQyxFQUE4QztBQUM1QztBQUNBO0FBQ0EsUUFBSUMsYUFBYUgsU0FBU0YsV0FBVCxFQUFqQjtBQUNBSSxTQUFLRSxJQUFMLENBQVUsVUFBVUMsT0FBVixFQUFtQkMsT0FBbkIsRUFBMEI7QUFDbEMsWUFBSUMsS0FBS1osYUFBYVUsUUFBUUcsR0FBckIsRUFBMEJMLFVBQTFCLENBQVQ7QUFDQSxZQUFJTSxLQUFLZCxhQUFhVyxRQUFRRSxHQUFyQixF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T3RELE9BQVAsQ0FBZXlDLElBQWYsQ0FBUCxLQUFnQyxVQUFwQyxFQUFnRDtBQUM5Q25FLHlCQUFTLHVCQUF1Qm1FLElBQXZCLEdBQThCLEtBQTlCLEdBQXNDdkQsU0FBU3VELElBQVQsQ0FBL0M7QUFDQWMsMEJBQVVELE9BQU90RCxPQUFQLENBQWV5QyxJQUFmLEVBQXFCdkQsU0FBU3VELElBQVQsQ0FBckIsRUFBcUNjLE9BQXJDLENBQVY7QUFDRDtBQUNGLFNBTEQ7QUFPQSxlQUFPQSxPQUFQO0FBQ0Q7QUFDRCxXQUFPLElBQVA7QUFDRDtBQUNIOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFrQkE7Ozs7Ozs7OztBQVVFO0FBRWFDLFFBQUFDLFVBQUEsR0FBYTtBQUM1QjtBQUNJQyxXQUFPO0FBQ047QUFDSDtBQUNBO0FBQ0k1QywrQkFBdUJBLHFCQUpsQjtBQUtUO0FBQ0U7QUFDRWxDLHNCQUFjQSxZQVBUO0FBUUwrRSw2QkFBcUJ2RDtBQVJoQjtBQUZpQixDQUFiO0FBY2I7QUFFQSIsImZpbGUiOiJtYXRjaC9kaXNwYXRjaGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEBmaWxlXHJcbiAqIEBtb2R1bGUgamZzZWIuZmRldnN0YXJ0LmRpc3BhdGNoZXJcclxuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxyXG4gKi9cclxuXHJcblxyXG4vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9saWIvbm9kZS00LmQudHNcIiAvPlxyXG5cclxuZGVjbGFyZSBpbnRlcmZhY2UgT2JqZWN0Q29uc3RydWN0b3Ige1xyXG4gICAgYXNzaWduKHRhcmdldDogYW55LCAuLi5zb3VyY2VzOiBhbnlbXSk6IGFueTtcclxufVxyXG5cclxudmFyIEFueU9iamVjdCA9ICg8YW55Pk9iamVjdCk7XHJcblxyXG5pbXBvcnQgKiBhcyBkaXN0YW5jZSBmcm9tICAnYWJvdF9zdHJpbmdkaXN0JztcclxuXHJcbmltcG9ydCAqIGFzIGRlYnVnIGZyb20gJ2RlYnVnJztcclxuY29uc3QgZGVidWdsb2cgPSBkZWJ1ZygnZGlzcGF0Y2hlcicpXHJcblxyXG5pbXBvcnQgeyBleGVjIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XHJcbi8vICB2YXIgZXhlYyA9IHJlcXVpcmUoJ2NoaWxkX3Byb2Nlc3MnKS5leGVjXHJcbi8vICB2YXIgbGV2ZW4gPSByZXF1aXJlKCcuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4uanMnKS5sZXZlbnNodGVpblxyXG5cclxuaW1wb3J0ICogYXMgZXhlY3RlbXBsYXRlIGZyb20gJy4uL2V4ZWMvZXhlY3RlbXBsYXRlJztcclxuXHJcbiAgLy92YXIgbGV2ZW4gPSByZXF1aXJlKCcuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4uanMnKVxyXG5pbXBvcnQgKiBhcyBtYXRjaGRhdGEgZnJvbSAnLi9tYXRjaGRhdGEnO1xyXG5cclxuaW1wb3J0ICogYXMgQWxnb2wgZnJvbSAnLi4vbWF0Y2gvYWxnb2wnO1xyXG5cclxuY29uc3Qgb1VuaXRUZXN0cyA9IG1hdGNoZGF0YS5vVW5pdFRlc3RzXHJcbmNvbnN0IG9XaWtpcyA9IG1hdGNoZGF0YS5vV2lraXNcclxuXHJcbiAgZnVuY3Rpb24gY2FsY0Rpc3RhbmNlIChzVGV4dDEsIHNUZXh0Mikge1xyXG4gICAgcmV0dXJuIGRpc3RhbmNlLmNhbGNEaXN0YW5jZShzVGV4dDEudG9Mb3dlckNhc2UoKSwgc1RleHQyKTtcclxuICAgIC8qXHJcbiAgICBkZWJ1Z2xvZyhcImxlbmd0aDJcIiArIHNUZXh0MSArIFwiIC0gXCIgKyBzVGV4dDIpXHJcbiAgICB2YXIgYTAgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEuc3Vic3RyaW5nKDAsIHNUZXh0Mi5sZW5ndGgpLCBzVGV4dDIpXHJcbiAgICB2YXIgYSA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS50b0xvd2VyQ2FzZSgpLCBzVGV4dDIpXHJcbiAgICByZXR1cm4gYTAgKiA1MDAgLyBzVGV4dDIubGVuZ3RoICsgYVxyXG4gICAgKi9cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGZuRmluZE1hdGNoIChzS2V5d29yZCwgb0NvbnRleHQsIG9NYXApIHtcclxuICAgIC8vIHJldHVybiBhIGJldHRlciBjb250ZXh0IGlmIHRoZXJlIGlzIGEgbWF0Y2hcclxuICAgIC8vIHNLZXl3b3JkID0gc0tleXdvcmQudG9Mb3dlckNhc2UoKTtcclxuICAgIHZhciBzS2V5d29yZExjID0gc0tleXdvcmQudG9Mb3dlckNhc2UoKTtcclxuICAgIG9NYXAuc29ydChmdW5jdGlvbiAob0VudHJ5MSwgb0VudHJ5Mikge1xyXG4gICAgICB2YXIgdTEgPSBjYWxjRGlzdGFuY2Uob0VudHJ5MS5rZXksIHNLZXl3b3JkTGMpXHJcbiAgICAgIHZhciB1MiA9IGNhbGNEaXN0YW5jZShvRW50cnkyLmtleSwgc0tleXdvcmRMYylcclxuICAgICAgcmV0dXJuIHUyIC0gdTE7XHJcbiAgICB9KVxyXG4gICAgLy8gbGF0ZXI6IGluIGNhc2Ugb2YgY29uZmxpY3RzLCBhc2ssXHJcbiAgICAvLyBub3c6XHJcbiAgICB2YXIgZGlzdCA9IGRpc3RhbmNlLmNhbGNEaXN0YW5jZShvTWFwWzBdLmtleS50b0xvd2VyQ2FzZSgpLCBzS2V5d29yZExjKVxyXG4gICAgZGVidWdsb2coJ2Jlc3QgZGlzdCcgKyBkaXN0ICsgJyAvICAnICsgb01hcFswXS5rZXkgKyAnICcgKyBzS2V5d29yZClcclxuICAgIGlmIChkaXN0ID4gQWxnb2wuQ3V0b2ZmX1dvcmRNYXRjaCkge1xyXG4gICAgICB2YXIgbzEgPSAoPGFueT5PYmplY3QpLmFzc2lnbih7fSwgb0NvbnRleHQpXHJcbiAgICAgIHZhciBvMlxyXG4gICAgICBvMS5jb250ZXh0ID0gKDxhbnk+T2JqZWN0KS5hc3NpZ24oe30sIG8xLmNvbnRleHQpXHJcbiAgICAgIG8yID0gbzFcclxuICAgICAgbzIuY29udGV4dCA9ICg8YW55Pk9iamVjdCkuYXNzaWduKG8xLmNvbnRleHQsIG9NYXBbMF0uY29udGV4dClcclxuICAgICAgcmV0dXJuIG8yXHJcbiAgICB9XHJcbiAgICByZXR1cm4gbnVsbFxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogYSBmdW5jdGlvbiB0byBtYXRjaCBhIHVuaXQgdGVzdCB1c2luZyBsZXZlbnNodGVpbiBkaXN0YW5jZXNcclxuICAgKiBAcHVibGljXHJcbiAgICovXHJcbiAgZnVuY3Rpb24gZm5GaW5kVW5pdFRlc3QgKHNzeXN0ZW1PYmplY3RJZCwgb0NvbnRleHQpIHtcclxuICAgIHJldHVybiBmbkZpbmRNYXRjaChzc3lzdGVtT2JqZWN0SWQsIG9Db250ZXh0LCBvVW5pdFRlc3RzKVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZm5GaW5kV2lraSAoc0tleXdvcmQsIG9Db250ZXh0KSB7XHJcbiAgICByZXR1cm4gZm5GaW5kTWF0Y2goc0tleXdvcmQsIG9Db250ZXh0LCBvV2lraXMpXHJcbiAgfVxyXG5cclxuICB2YXIgYVNob3dFbnRpdHlBY3Rpb25zID0gW1xyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtSWQ6ICd1djInLFxyXG4gICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxyXG4gICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscCdcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXV2Mi53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvdWkyL3VzaGVsbC9zaGVsbHMvYWJhcC9GaW9yaUxhdW5jaHBhZC5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1JZDogJ3V2MicsXHJcbiAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXHJcbiAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwZCdcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXV2Mi53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvc2FwL2Fyc3J2Y191cGJfYWRtbi9tYWluLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbUlkOiAndTF5JyxcclxuICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcclxuICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHAnXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1MXkud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3VpMi91c2hlbGwvc2hlbGxzL2FiYXAvRmlvcmlMYXVuY2hwYWQuaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtSWQ6ICd1MXknLFxyXG4gICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxyXG4gICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscGQnXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1MXkud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3NhcC9hcnNydmNfdXBiX2FkbW4vbWFpbi5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1JZDogJ3V2MicsXHJcbiAgICAgICAgY2xpZW50OiAnMTIwJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ2Zpb3JpIGNhdGFsb2cnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiAvLiovLFxyXG4gICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcclxuICAgICAgICB0b29sOiAnRkxQRCdcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXV2Mi53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvc2FwL2Fyc3J2Y191cGJfYWRtbi9tYWluLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSNDQVRBTE9HOntzeXN0ZW1PYmplY3RJZH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ3VuaXQnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiBmbkZpbmRVbml0VGVzdFxyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cDovL2xvY2FsaG9zdDo4MDgwL3twYXRofSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ3VuaXQgdGVzdCcsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IGZuRmluZFVuaXRUZXN0XHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwOi8vbG9jYWxob3N0OjgwODAve3BhdGh9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtT2JqZWN0Q2F0ZWdvcnk6ICd3aWtpJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogZm5GaW5kV2lraVxyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly93aWtpLndkZi5zYXAuY29ycC97cGF0aH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1JZDogJ0pJUkEnXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL2ppcmEud2RmLnNhcC5jb3JwOjgwODAvVElQQ09SRVVJSUknXHJcbiAgICAgIH1cclxuICAgIH1cclxuICBdXHJcblxyXG4gIC8vIGlmIFRPT0wgPSBKSVJBIHx8IFN5c3RlbUlkID0gSklSQSAtPiBTeXN0ZW1JZCA9IEpJUkFcclxuICAvL1xyXG4gIC8vXHJcblxyXG4gIC8vIHN0YXJ0U0FQR1VJXHJcblxyXG4gIC8vICAgTjpcXD5cImM6XFxQcm9ncmFtIEZpbGVzICh4ODYpXFxTQVBcXEZyb250RW5kXFxTQVBndWlcIlxcc2Fwc2hjdXQuZXhlICAtc3lzdGVtPVVWMiAtY2xpZW50PTEyMCAtY29tbWFuZD1TRTM4IC10eXBlPVRyYW5zYWN0aW9uIC11c2VyPUFVU0VSXHJcblxyXG4gIGZ1bmN0aW9uIGV4cGFuZFBhcmFtZXRlcnNJblVSTCAob01lcmdlZENvbnRleHRSZXN1bHQpIHtcclxuICAgIHZhciBwdG4gPSBvTWVyZ2VkQ29udGV4dFJlc3VsdC5yZXN1bHQucGF0dGVyblxyXG4gICAgcHRuID0gZXhlY3RlbXBsYXRlLmV4cGFuZFRlbXBsYXRlKG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHQsIHB0bik7XHJcbi8qICAgIE9iamVjdC5rZXlzKG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcclxuICAgICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cCgneycgKyBzS2V5ICsgJ30nLCAnZycpXHJcbiAgICAgIHB0biA9IHB0bi5yZXBsYWNlKHJlZ2V4LCBvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0W3NLZXldKVxyXG4gICAgICBwdG4gPSBwdG4ucmVwbGFjZShyZWdleCwgb01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dFtzS2V5XSlcclxuICAgIH0pXHJcbiAgICAqL1xyXG4gICAgcmV0dXJuIHB0blxyXG4gIH1cclxuXHJcbi8qXHJcbiAgZXhwb3J0IGZ1bmN0aW9uIGV4ZWN1dGVTdGFydHVwIChvTWVyZ2VkQ29udGV4dFJlc3VsdCkge1xyXG4gICAgaWYgKG9NZXJnZWRDb250ZXh0UmVzdWx0LnJlc3VsdC50eXBlID09PSAnVVJMJykge1xyXG4gICAgICB2YXIgcHRuID0gZXhwYW5kUGFyYW1ldGVyc0luVVJMKG9NZXJnZWRDb250ZXh0UmVzdWx0KVxyXG4gICAgICBleGVjLnN0YXJ0QnJvd3NlcihwdG4pXHJcbiAgICAgIHJldHVybiBwdG5cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHZhciBzID0gKFwiRG9uJ3Qga25vdyBob3cgdG8gc3RhcnQgXCIgKyBvTWVyZ2VkQ29udGV4dFJlc3VsdC5yZXN1bHQudHlwZSArICdcXG4gZm9yIFwiJyArIG9NZXJnZWRDb250ZXh0UmVzdWx0LnF1ZXJ5ICsgJ1wiJylcclxuICAgICAgZGVidWdsb2cocylcclxuICAgICAgcmV0dXJuIHNcclxuICAgIH1cclxuICB9XHJcbiovXHJcblxyXG4gIGZ1bmN0aW9uIG5yTWF0Y2hlcyAoYU9iamVjdCwgb0NvbnRleHQpIHtcclxuICAgIHJldHVybiBPYmplY3Qua2V5cyhhT2JqZWN0KS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xyXG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9Db250ZXh0LCBrZXkpKSB7XHJcbiAgICAgICAgcHJldiA9IHByZXYgKyAxXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHByZXZcclxuICAgIH0sIDApXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBuck5vTWF0Y2hlcyAoYU9iamVjdCwgb0NvbnRleHQpIHtcclxuICAgIHZhciBub01hdGNoQSA9IE9iamVjdC5rZXlzKGFPYmplY3QpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XHJcbiAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9Db250ZXh0LCBrZXkpKSB7XHJcbiAgICAgICAgcHJldiA9IHByZXYgKyAxXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHByZXZcclxuICAgIH0sIDApXHJcbiAgICB2YXIgbm9NYXRjaEIgPSBPYmplY3Qua2V5cyhvQ29udGV4dCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYU9iamVjdCwga2V5KSkge1xyXG4gICAgICAgIHByZXYgPSBwcmV2ICsgMVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBwcmV2XHJcbiAgICB9LCAwKVxyXG4gICAgcmV0dXJuIG5vTWF0Y2hBICsgbm9NYXRjaEJcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHNhbWVPclN0YXIgKHMxIDogc3RyaW5nLCBzMiA6IHN0cmluZyB8IFJlZ0V4cCB8IEZ1bmN0aW9uICwgb0VudGl0eSkge1xyXG4gICAgcmV0dXJuIHMxID09PSBzMiB8fFxyXG4gICAgICAoczEgPT09IHVuZGVmaW5lZCAmJiBzMiA9PT0gbnVsbCkgfHxcclxuICAgICAgKChzMiBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgczIuZXhlYyhzMSkgIT09IG51bGwpIHx8XHJcbiAgICAgICgodHlwZW9mIHMyID09PSAnZnVuY3Rpb24nICYmIHMxKSAmJiBzMihzMSwgb0VudGl0eSkpXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBzYW1lT3JTdGFyRW1wdHkgKHMxIDogc3RyaW5nLCBzMiA6IHN0cmluZyB8IFJlZ0V4cCB8IEZ1bmN0aW9uLCBvRW50aXR5KSB7XHJcbiAgICBpZiAoczEgPT09IHVuZGVmaW5lZCAmJiBzMiA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9XHJcbiAgICBpZiAoczIgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzMSA9PT0gczIgfHxcclxuICAgICAgKChzMiBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgczIuZXhlYyhzMSkgIT09IG51bGwpIHx8XHJcbiAgICAgICgodHlwZW9mIHMyID09PSAnZnVuY3Rpb24nICYmIHMxKSAmJiBzMihzMSwgb0VudGl0eSkpXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBmaWx0ZXJTaG93RW50aXR5T2xkIChvQ29udGV4dCwgYVNob3dFbnRpdHkpIHtcclxuICAgIHZhciBhRmlsdGVyZWRcclxuICAgIE9iamVjdC5rZXlzKG9Db250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XHJcbiAgICAgIGlmIChvQ29udGV4dFtzS2V5XSA9PT0gbnVsbCkge1xyXG4gICAgICAgIG9Db250ZXh0W3NLZXldID0gdW5kZWZpbmVkXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgICAvLyBmaWx0ZXIgY29udGV4dCwgYW1lbmRpbmcgc3lub255bXNcclxuXHJcblxyXG4gICAgYUZpbHRlcmVkID0gYVNob3dFbnRpdHkuZmlsdGVyKGZ1bmN0aW9uIChvU2hvd0VudGl0eSkge1xyXG4gICAgICAvLyAgICAgICBjb25zb2xlLmxvZyhcIi4uLlwiKVxyXG4gICAgICAvLyAgICAgIGNvbnNvbGUubG9nKG9TaG93RW50aXR5LmNvbnRleHQudG9vbCArIFwiIFwiICsgb0NvbnRleHQudG9vbCArIFwiXFxuXCIpXHJcbiAgICAgIC8vICAgICAgY29uc29sZS5sb2cob1Nob3dFbnRpdHkuY29udGV4dC5jbGllbnQgKyBcIiBcIiArIG9Db250ZXh0LmNsaWVudCArXCI6XCIgKyBzYW1lT3JTdGFyKG9Db250ZXh0LmNsaWVudCxvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCkgKyBcIlxcblwiKVxyXG4gICAgICAvLyAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkob1Nob3dFbnRpdHkuY29udGV4dCkgKyBcIlxcblwiICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHQuY2xpZW50KSArIFwiXFxuXCIpXHJcblxyXG4gICAgICByZXR1cm4gc2FtZU9yU3RhcihvU2hvd0VudGl0eS5jb250ZXh0LnN5c3RlbUlkLCBvQ29udGV4dC5zeXN0ZW1JZCwgb0NvbnRleHQpICYmXHJcbiAgICAgICAgc2FtZU9yU3RhcihvQ29udGV4dC50b29sLCBvU2hvd0VudGl0eS5jb250ZXh0LnRvb2wsIG9Db250ZXh0KSAmJlxyXG4gICAgICAgIHNhbWVPclN0YXIob0NvbnRleHQuY2xpZW50LCBvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCwgb0NvbnRleHQpICYmXHJcbiAgICAgICAgc2FtZU9yU3RhckVtcHR5KG9Db250ZXh0LnN5c3RlbU9iamVjdENhdGVnb3J5LCBvU2hvd0VudGl0eS5jb250ZXh0LnN5c3RlbU9iamVjdENhdGVnb3J5LCBvQ29udGV4dCkgJiZcclxuICAgICAgICBzYW1lT3JTdGFyRW1wdHkob0NvbnRleHQuc3lzdGVtT2JqZWN0SWQsIG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtT2JqZWN0SWQsIG9Db250ZXh0KVxyXG4gICAgLy8gICAgICAmJiBvU2hvd0VudGl0eS5jb250ZXh0LnRvb2wgPT09IG9Db250ZXh0LnRvb2xcclxuICAgIH0pXHJcbiAgICAvLyAgY29uc29sZS5sb2coYUZpbHRlcmVkLmxlbmd0aClcclxuICAgIC8vIG1hdGNoIG90aGVyIGNvbnRleHQgcGFyYW1ldGVyc1xyXG4gICAgYUZpbHRlcmVkLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcclxuICAgICAgdmFyIG5yTWF0Y2hlc0EgPSBuck1hdGNoZXMoYS5jb250ZXh0LCBvQ29udGV4dClcclxuICAgICAgdmFyIG5yTWF0Y2hlc0IgPSBuck1hdGNoZXMoYi5jb250ZXh0LCBvQ29udGV4dClcclxuICAgICAgdmFyIG5yTm9NYXRjaGVzQSA9IG5yTm9NYXRjaGVzKGEuY29udGV4dCwgb0NvbnRleHQpXHJcbiAgICAgIHZhciBuck5vTWF0Y2hlc0IgPSBuck5vTWF0Y2hlcyhiLmNvbnRleHQsIG9Db250ZXh0KVxyXG4gICAgICAvLyAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGEuY29udGV4dCkpXHJcbiAgICAgIC8vICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYi5jb250ZXh0KSlcclxuICAgICAgLy8gICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShvQ29udGV4dCkpXHJcbiAgICAgIHZhciByZXMgPSAtKG5yTWF0Y2hlc0EgLSBuck1hdGNoZXNCKSAqIDEwMCArIChuck5vTWF0Y2hlc0EgLSBuck5vTWF0Y2hlc0IpXHJcbiAgICAgIC8vICAgICBjb25zb2xlLmxvZyhcImRpZmYgXCIgKyByZXMpXHJcbiAgICAgIHJldHVybiByZXNcclxuICAgIH0pXHJcbiAgICBpZiAoYUZpbHRlcmVkLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICBkZWJ1Z2xvZygnbm8gdGFyZ2V0IGZvciBzaG93RW50aXR5ICcgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dCkpXHJcbiAgICB9XHJcbiAgICAvLyBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhRmlsdGVyZWQsdW5kZWZpbmVkLDIpKVxyXG4gICAgaWYgKGFGaWx0ZXJlZFswXSkge1xyXG4gICAgICAvLyBleGVjdXRlIGFsbCBmdW5jdGlvbnNcclxuXHJcbiAgICAgIHZhciBvTWF0Y2ggPSBhRmlsdGVyZWRbMF1cclxuXHJcbiAgICAgIHZhciBvTWVyZ2VkID0ge1xyXG4gICAgICAgIGNvbnRleHQ6IHtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIG9NZXJnZWQuY29udGV4dCA9IEFueU9iamVjdC5hc3NpZ24oe30sIG9NZXJnZWQuY29udGV4dCwgYUZpbHRlcmVkWzBdLmNvbnRleHQsIG9Db250ZXh0KVxyXG4gICAgICBvTWVyZ2VkID0gQW55T2JqZWN0LmFzc2lnbihvTWVyZ2VkLCB7XHJcbiAgICAgICAgcmVzdWx0OiBhRmlsdGVyZWRbMF0ucmVzdWx0XHJcbiAgICAgIH0pXHJcblxyXG4gICAgICBPYmplY3Qua2V5cyhvTWF0Y2guY29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xyXG4gICAgICAgIGlmICh0eXBlb2Ygb01hdGNoLmNvbnRleHRbc0tleV0gPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgIGRlYnVnbG9nKCdOb3cgcmV0cm9maXR0aW5nIDonICsgc0tleSArICcgLSAnICsgb0NvbnRleHRbc0tleV0pXHJcbiAgICAgICAgICBvTWVyZ2VkID0gb01hdGNoLmNvbnRleHRbc0tleV0ob0NvbnRleHRbc0tleV0sIG9NZXJnZWQpXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG5cclxuICAgICAgcmV0dXJuIG9NZXJnZWRcclxuICAgIH1cclxuICAgIHJldHVybiBudWxsXHJcbiAgfVxyXG4vKlxyXG5cclxuaW1wb3J0IHtJbnB1dEZpbHRlciBhcyBpbnB1dEZpbHRlcn0gZnJvbSAnYWJvdF9lcmJhc2UnO1xyXG5cclxuICBmdW5jdGlvbiBmaWx0ZXJTaG93RW50aXR5IChvQ29udGV4dCwgYVNob3dFbnRpdHlBY3Rpb25zKSB7XHJcbiAgICBPYmplY3Qua2V5cyhvQ29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xyXG4gICAgICBpZiAob0NvbnRleHRbc0tleV0gPT09IG51bGwpIHtcclxuICAgICAgICBkZWxldGUgb0NvbnRleHRbc0tleV1cclxuICAgICAgfVxyXG4gICAgfSlcclxuICAgIHZhciByZXMgPSBpbnB1dEZpbHRlci5hcHBseVJ1bGVzUGlja0ZpcnN0KG9Db250ZXh0KTtcclxuICAgIGlmICghcmVzKSB7XHJcbiAgICAgIHJldHVybiB1bmRlZmluZWRcclxuICAgIH1cclxuICAgIGRlYnVnbG9nKFwiKiogYWZ0ZXIgZmlsdGVyIHJ1bGVzXCIgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpXHJcbiAgICByZXR1cm4gZmlsdGVyU2hvd0VudGl0eU9sZChyZXMsYVNob3dFbnRpdHlBY3Rpb25zKTtcclxuICB9XHJcbiovXHJcbi8qXHJcbiAgZnVuY3Rpb24gZXhlY1Nob3dFbnRpdHkgKG9FbnRpdHkpIHtcclxuICAgIHZhciBtZXJnZWQgPSBmaWx0ZXJTaG93RW50aXR5KG9FbnRpdHksIGFTaG93RW50aXR5QWN0aW9ucylcclxuICAgIGlmIChtZXJnZWQpIHtcclxuICAgICAgcmV0dXJuIGV4ZWN1dGVTdGFydHVwKG1lcmdlZClcclxuICAgIH1cclxuICAgIHJldHVybiBudWxsXHJcbiAgfVxyXG4qL1xyXG5cclxuICAvLyBFOlxccHJvamVjdHNcXG5vZGVqc1xcYm90YnVpbGRlclxcc2FtcGxlYm90PlwiJVByb2dyYW1GaWxlcyh4ODYpJVxcR29vZ2xlXFxDaHJvbWVcXEFwcGxpY2F0aW9uXFxjaHJvbWUuZXhlXCIgLS1pbmNvZ25pdG8gLXVybCB3d3cuc3BpZWdlbC5kZVxyXG5cclxuICBleHBvcnQgY29uc3QgZGlzcGF0Y2hlciA9IHtcclxuLy8gICAgZXhlY1Nob3dFbnRpdHk6IGV4ZWNTaG93RW50aXR5LFxyXG4gICAgX3Rlc3Q6IHtcclxuICAgICAvLyBzYW1lT3JTdGFyOiBzYW1lT3JTdGFyLFxyXG4gIC8vICAgIG5yTWF0Y2hlczogbnJNYXRjaGVzLFxyXG4gIC8vICAgIG5yTm9NYXRjaGVzOiBuck5vTWF0Y2hlcyxcclxuICAgICAgZXhwYW5kUGFyYW1ldGVyc0luVVJMOiBleHBhbmRQYXJhbWV0ZXJzSW5VUkwsXHJcbiAgLy8gICAgZmlsdGVyU2hvd0VudGl0eTogZmlsdGVyU2hvd0VudGl0eSxcclxuICAgIC8vICBmbkZpbmRVbml0VGVzdDogZm5GaW5kVW5pdFRlc3QsXHJcbiAgICAgIGNhbGNEaXN0YW5jZTogY2FsY0Rpc3RhbmNlLFxyXG4gICAgICBfYVNob3dFbnRpdHlBY3Rpb25zOiBhU2hvd0VudGl0eUFjdGlvbnNcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vZXhwb3J0cyBkaXNwYXRjaGVyO1xyXG5cclxuICAvL21vZHVsZS5leHBvcnRzID0gZGlzcGF0Y2hlclxyXG5cclxuIiwiLyoqXG4gKiBAZmlsZVxuICogQG1vZHVsZSBqZnNlYi5mZGV2c3RhcnQuZGlzcGF0Y2hlclxuICogQGNvcHlyaWdodCAoYykgMjAxNiBHZXJkIEZvcnN0bWFublxuICovXG5cInVzZSBzdHJpY3RcIjtcbnZhciBBbnlPYmplY3QgPSBPYmplY3Q7XG52YXIgZGlzdGFuY2UgPSByZXF1aXJlKFwiYWJvdF9zdHJpbmdkaXN0XCIpO1xudmFyIGRlYnVnID0gcmVxdWlyZShcImRlYnVnXCIpO1xudmFyIGRlYnVnbG9nID0gZGVidWcoJ2Rpc3BhdGNoZXInKTtcbi8vICB2YXIgZXhlYyA9IHJlcXVpcmUoJ2NoaWxkX3Byb2Nlc3MnKS5leGVjXG4vLyAgdmFyIGxldmVuID0gcmVxdWlyZSgnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluLmpzJykubGV2ZW5zaHRlaW5cbnZhciBleGVjdGVtcGxhdGUgPSByZXF1aXJlKFwiLi4vZXhlYy9leGVjdGVtcGxhdGVcIik7XG4vL3ZhciBsZXZlbiA9IHJlcXVpcmUoJy4uL3V0aWxzL2RhbWVyYXVMZXZlbnNodGVpbi5qcycpXG52YXIgbWF0Y2hkYXRhID0gcmVxdWlyZShcIi4vbWF0Y2hkYXRhXCIpO1xudmFyIEFsZ29sID0gcmVxdWlyZShcIi4uL21hdGNoL2FsZ29sXCIpO1xudmFyIG9Vbml0VGVzdHMgPSBtYXRjaGRhdGEub1VuaXRUZXN0cztcbnZhciBvV2lraXMgPSBtYXRjaGRhdGEub1dpa2lzO1xuZnVuY3Rpb24gY2FsY0Rpc3RhbmNlKHNUZXh0MSwgc1RleHQyKSB7XG4gICAgcmV0dXJuIGRpc3RhbmNlLmNhbGNEaXN0YW5jZShzVGV4dDEudG9Mb3dlckNhc2UoKSwgc1RleHQyKTtcbiAgICAvKlxuICAgIGRlYnVnbG9nKFwibGVuZ3RoMlwiICsgc1RleHQxICsgXCIgLSBcIiArIHNUZXh0MilcbiAgICB2YXIgYTAgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEuc3Vic3RyaW5nKDAsIHNUZXh0Mi5sZW5ndGgpLCBzVGV4dDIpXG4gICAgdmFyIGEgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEudG9Mb3dlckNhc2UoKSwgc1RleHQyKVxuICAgIHJldHVybiBhMCAqIDUwMCAvIHNUZXh0Mi5sZW5ndGggKyBhXG4gICAgKi9cbn1cbmZ1bmN0aW9uIGZuRmluZE1hdGNoKHNLZXl3b3JkLCBvQ29udGV4dCwgb01hcCkge1xuICAgIC8vIHJldHVybiBhIGJldHRlciBjb250ZXh0IGlmIHRoZXJlIGlzIGEgbWF0Y2hcbiAgICAvLyBzS2V5d29yZCA9IHNLZXl3b3JkLnRvTG93ZXJDYXNlKCk7XG4gICAgdmFyIHNLZXl3b3JkTGMgPSBzS2V5d29yZC50b0xvd2VyQ2FzZSgpO1xuICAgIG9NYXAuc29ydChmdW5jdGlvbiAob0VudHJ5MSwgb0VudHJ5Mikge1xuICAgICAgICB2YXIgdTEgPSBjYWxjRGlzdGFuY2Uob0VudHJ5MS5rZXksIHNLZXl3b3JkTGMpO1xuICAgICAgICB2YXIgdTIgPSBjYWxjRGlzdGFuY2Uob0VudHJ5Mi5rZXksIHNLZXl3b3JkTGMpO1xuICAgICAgICByZXR1cm4gdTIgLSB1MTtcbiAgICB9KTtcbiAgICAvLyBsYXRlcjogaW4gY2FzZSBvZiBjb25mbGljdHMsIGFzayxcbiAgICAvLyBub3c6XG4gICAgdmFyIGRpc3QgPSBkaXN0YW5jZS5jYWxjRGlzdGFuY2Uob01hcFswXS5rZXkudG9Mb3dlckNhc2UoKSwgc0tleXdvcmRMYyk7XG4gICAgZGVidWdsb2coJ2Jlc3QgZGlzdCcgKyBkaXN0ICsgJyAvICAnICsgb01hcFswXS5rZXkgKyAnICcgKyBzS2V5d29yZCk7XG4gICAgaWYgKGRpc3QgPiBBbGdvbC5DdXRvZmZfV29yZE1hdGNoKSB7XG4gICAgICAgIHZhciBvMSA9IE9iamVjdC5hc3NpZ24oe30sIG9Db250ZXh0KTtcbiAgICAgICAgdmFyIG8yO1xuICAgICAgICBvMS5jb250ZXh0ID0gT2JqZWN0LmFzc2lnbih7fSwgbzEuY29udGV4dCk7XG4gICAgICAgIG8yID0gbzE7XG4gICAgICAgIG8yLmNvbnRleHQgPSBPYmplY3QuYXNzaWduKG8xLmNvbnRleHQsIG9NYXBbMF0uY29udGV4dCk7XG4gICAgICAgIHJldHVybiBvMjtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59XG4vKipcbiAqIGEgZnVuY3Rpb24gdG8gbWF0Y2ggYSB1bml0IHRlc3QgdXNpbmcgbGV2ZW5zaHRlaW4gZGlzdGFuY2VzXG4gKiBAcHVibGljXG4gKi9cbmZ1bmN0aW9uIGZuRmluZFVuaXRUZXN0KHNzeXN0ZW1PYmplY3RJZCwgb0NvbnRleHQpIHtcbiAgICByZXR1cm4gZm5GaW5kTWF0Y2goc3N5c3RlbU9iamVjdElkLCBvQ29udGV4dCwgb1VuaXRUZXN0cyk7XG59XG5mdW5jdGlvbiBmbkZpbmRXaWtpKHNLZXl3b3JkLCBvQ29udGV4dCkge1xuICAgIHJldHVybiBmbkZpbmRNYXRjaChzS2V5d29yZCwgb0NvbnRleHQsIG9XaWtpcyk7XG59XG52YXIgYVNob3dFbnRpdHlBY3Rpb25zID0gW1xuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtSWQ6ICd1djInLFxuICAgICAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXG4gICAgICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscCdcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1djIud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3VpMi91c2hlbGwvc2hlbGxzL2FiYXAvRmlvcmlMYXVuY2hwYWQuaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbUlkOiAndXYyJyxcbiAgICAgICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxuICAgICAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHBkJ1xuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXV2Mi53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvc2FwL2Fyc3J2Y191cGJfYWRtbi9tYWluLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1JZDogJ3UxeScsXG4gICAgICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcbiAgICAgICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwJ1xuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXUxeS53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvdWkyL3VzaGVsbC9zaGVsbHMvYWJhcC9GaW9yaUxhdW5jaHBhZC5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtSWQ6ICd1MXknLFxuICAgICAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXG4gICAgICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscGQnXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdTF5LndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS9zYXAvYXJzcnZjX3VwYl9hZG1uL21haW4uaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbUlkOiAndXYyJyxcbiAgICAgICAgICAgIGNsaWVudDogJzEyMCcsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ2Zpb3JpIGNhdGFsb2cnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IC8uKi8sXG4gICAgICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXG4gICAgICAgICAgICB0b29sOiAnRkxQRCdcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1djIud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3NhcC9hcnNydmNfdXBiX2FkbW4vbWFpbi5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0jQ0FUQUxPRzp7c3lzdGVtT2JqZWN0SWR9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAndW5pdCcsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogZm5GaW5kVW5pdFRlc3RcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwOi8vbG9jYWxob3N0OjgwODAve3BhdGh9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAndW5pdCB0ZXN0JyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiBmbkZpbmRVbml0VGVzdFxuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MC97cGF0aH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtT2JqZWN0Q2F0ZWdvcnk6ICd3aWtpJyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiBmbkZpbmRXaWtpXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly93aWtpLndkZi5zYXAuY29ycC97cGF0aH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtSWQ6ICdKSVJBJ1xuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vamlyYS53ZGYuc2FwLmNvcnA6ODA4MC9USVBDT1JFVUlJSSdcbiAgICAgICAgfVxuICAgIH1cbl07XG4vLyBpZiBUT09MID0gSklSQSB8fCBTeXN0ZW1JZCA9IEpJUkEgLT4gU3lzdGVtSWQgPSBKSVJBXG4vL1xuLy9cbi8vIHN0YXJ0U0FQR1VJXG4vLyAgIE46XFw+XCJjOlxcUHJvZ3JhbSBGaWxlcyAoeDg2KVxcU0FQXFxGcm9udEVuZFxcU0FQZ3VpXCJcXHNhcHNoY3V0LmV4ZSAgLXN5c3RlbT1VVjIgLWNsaWVudD0xMjAgLWNvbW1hbmQ9U0UzOCAtdHlwZT1UcmFuc2FjdGlvbiAtdXNlcj1BVVNFUlxuZnVuY3Rpb24gZXhwYW5kUGFyYW1ldGVyc0luVVJMKG9NZXJnZWRDb250ZXh0UmVzdWx0KSB7XG4gICAgdmFyIHB0biA9IG9NZXJnZWRDb250ZXh0UmVzdWx0LnJlc3VsdC5wYXR0ZXJuO1xuICAgIHB0biA9IGV4ZWN0ZW1wbGF0ZS5leHBhbmRUZW1wbGF0ZShvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0LCBwdG4pO1xuICAgIC8qICAgIE9iamVjdC5rZXlzKG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgICAgICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKCd7JyArIHNLZXkgKyAnfScsICdnJylcbiAgICAgICAgICBwdG4gPSBwdG4ucmVwbGFjZShyZWdleCwgb01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dFtzS2V5XSlcbiAgICAgICAgICBwdG4gPSBwdG4ucmVwbGFjZShyZWdleCwgb01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dFtzS2V5XSlcbiAgICAgICAgfSlcbiAgICAgICAgKi9cbiAgICByZXR1cm4gcHRuO1xufVxuLypcbiAgZXhwb3J0IGZ1bmN0aW9uIGV4ZWN1dGVTdGFydHVwIChvTWVyZ2VkQ29udGV4dFJlc3VsdCkge1xuICAgIGlmIChvTWVyZ2VkQ29udGV4dFJlc3VsdC5yZXN1bHQudHlwZSA9PT0gJ1VSTCcpIHtcbiAgICAgIHZhciBwdG4gPSBleHBhbmRQYXJhbWV0ZXJzSW5VUkwob01lcmdlZENvbnRleHRSZXN1bHQpXG4gICAgICBleGVjLnN0YXJ0QnJvd3NlcihwdG4pXG4gICAgICByZXR1cm4gcHRuXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBzID0gKFwiRG9uJ3Qga25vdyBob3cgdG8gc3RhcnQgXCIgKyBvTWVyZ2VkQ29udGV4dFJlc3VsdC5yZXN1bHQudHlwZSArICdcXG4gZm9yIFwiJyArIG9NZXJnZWRDb250ZXh0UmVzdWx0LnF1ZXJ5ICsgJ1wiJylcbiAgICAgIGRlYnVnbG9nKHMpXG4gICAgICByZXR1cm4gc1xuICAgIH1cbiAgfVxuKi9cbmZ1bmN0aW9uIG5yTWF0Y2hlcyhhT2JqZWN0LCBvQ29udGV4dCkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhhT2JqZWN0KS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9Db250ZXh0LCBrZXkpKSB7XG4gICAgICAgICAgICBwcmV2ID0gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG59XG5mdW5jdGlvbiBuck5vTWF0Y2hlcyhhT2JqZWN0LCBvQ29udGV4dCkge1xuICAgIHZhciBub01hdGNoQSA9IE9iamVjdC5rZXlzKGFPYmplY3QpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XG4gICAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9Db250ZXh0LCBrZXkpKSB7XG4gICAgICAgICAgICBwcmV2ID0gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG4gICAgdmFyIG5vTWF0Y2hCID0gT2JqZWN0LmtleXMob0NvbnRleHQpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XG4gICAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGFPYmplY3QsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbiAgICByZXR1cm4gbm9NYXRjaEEgKyBub01hdGNoQjtcbn1cbmZ1bmN0aW9uIHNhbWVPclN0YXIoczEsIHMyLCBvRW50aXR5KSB7XG4gICAgcmV0dXJuIHMxID09PSBzMiB8fFxuICAgICAgICAoczEgPT09IHVuZGVmaW5lZCAmJiBzMiA9PT0gbnVsbCkgfHxcbiAgICAgICAgKChzMiBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgczIuZXhlYyhzMSkgIT09IG51bGwpIHx8XG4gICAgICAgICgodHlwZW9mIHMyID09PSAnZnVuY3Rpb24nICYmIHMxKSAmJiBzMihzMSwgb0VudGl0eSkpO1xufVxuZnVuY3Rpb24gc2FtZU9yU3RhckVtcHR5KHMxLCBzMiwgb0VudGl0eSkge1xuICAgIGlmIChzMSA9PT0gdW5kZWZpbmVkICYmIHMyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChzMiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gczEgPT09IHMyIHx8XG4gICAgICAgICgoczIgaW5zdGFuY2VvZiBSZWdFeHApICYmIHMyLmV4ZWMoczEpICE9PSBudWxsKSB8fFxuICAgICAgICAoKHR5cGVvZiBzMiA9PT0gJ2Z1bmN0aW9uJyAmJiBzMSkgJiYgczIoczEsIG9FbnRpdHkpKTtcbn1cbmZ1bmN0aW9uIGZpbHRlclNob3dFbnRpdHlPbGQob0NvbnRleHQsIGFTaG93RW50aXR5KSB7XG4gICAgdmFyIGFGaWx0ZXJlZDtcbiAgICBPYmplY3Qua2V5cyhvQ29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xuICAgICAgICBpZiAob0NvbnRleHRbc0tleV0gPT09IG51bGwpIHtcbiAgICAgICAgICAgIG9Db250ZXh0W3NLZXldID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgLy8gZmlsdGVyIGNvbnRleHQsIGFtZW5kaW5nIHN5bm9ueW1zXG4gICAgYUZpbHRlcmVkID0gYVNob3dFbnRpdHkuZmlsdGVyKGZ1bmN0aW9uIChvU2hvd0VudGl0eSkge1xuICAgICAgICAvLyAgICAgICBjb25zb2xlLmxvZyhcIi4uLlwiKVxuICAgICAgICAvLyAgICAgIGNvbnNvbGUubG9nKG9TaG93RW50aXR5LmNvbnRleHQudG9vbCArIFwiIFwiICsgb0NvbnRleHQudG9vbCArIFwiXFxuXCIpXG4gICAgICAgIC8vICAgICAgY29uc29sZS5sb2cob1Nob3dFbnRpdHkuY29udGV4dC5jbGllbnQgKyBcIiBcIiArIG9Db250ZXh0LmNsaWVudCArXCI6XCIgKyBzYW1lT3JTdGFyKG9Db250ZXh0LmNsaWVudCxvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCkgKyBcIlxcblwiKVxuICAgICAgICAvLyAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkob1Nob3dFbnRpdHkuY29udGV4dCkgKyBcIlxcblwiICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHQuY2xpZW50KSArIFwiXFxuXCIpXG4gICAgICAgIHJldHVybiBzYW1lT3JTdGFyKG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtSWQsIG9Db250ZXh0LnN5c3RlbUlkLCBvQ29udGV4dCkgJiZcbiAgICAgICAgICAgIHNhbWVPclN0YXIob0NvbnRleHQudG9vbCwgb1Nob3dFbnRpdHkuY29udGV4dC50b29sLCBvQ29udGV4dCkgJiZcbiAgICAgICAgICAgIHNhbWVPclN0YXIob0NvbnRleHQuY2xpZW50LCBvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCwgb0NvbnRleHQpICYmXG4gICAgICAgICAgICBzYW1lT3JTdGFyRW1wdHkob0NvbnRleHQuc3lzdGVtT2JqZWN0Q2F0ZWdvcnksIG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtT2JqZWN0Q2F0ZWdvcnksIG9Db250ZXh0KSAmJlxuICAgICAgICAgICAgc2FtZU9yU3RhckVtcHR5KG9Db250ZXh0LnN5c3RlbU9iamVjdElkLCBvU2hvd0VudGl0eS5jb250ZXh0LnN5c3RlbU9iamVjdElkLCBvQ29udGV4dCk7XG4gICAgICAgIC8vICAgICAgJiYgb1Nob3dFbnRpdHkuY29udGV4dC50b29sID09PSBvQ29udGV4dC50b29sXG4gICAgfSk7XG4gICAgLy8gIGNvbnNvbGUubG9nKGFGaWx0ZXJlZC5sZW5ndGgpXG4gICAgLy8gbWF0Y2ggb3RoZXIgY29udGV4dCBwYXJhbWV0ZXJzXG4gICAgYUZpbHRlcmVkLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgdmFyIG5yTWF0Y2hlc0EgPSBuck1hdGNoZXMoYS5jb250ZXh0LCBvQ29udGV4dCk7XG4gICAgICAgIHZhciBuck1hdGNoZXNCID0gbnJNYXRjaGVzKGIuY29udGV4dCwgb0NvbnRleHQpO1xuICAgICAgICB2YXIgbnJOb01hdGNoZXNBID0gbnJOb01hdGNoZXMoYS5jb250ZXh0LCBvQ29udGV4dCk7XG4gICAgICAgIHZhciBuck5vTWF0Y2hlc0IgPSBuck5vTWF0Y2hlcyhiLmNvbnRleHQsIG9Db250ZXh0KTtcbiAgICAgICAgLy8gICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhLmNvbnRleHQpKVxuICAgICAgICAvLyAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGIuY29udGV4dCkpXG4gICAgICAgIC8vICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkob0NvbnRleHQpKVxuICAgICAgICB2YXIgcmVzID0gLShuck1hdGNoZXNBIC0gbnJNYXRjaGVzQikgKiAxMDAgKyAobnJOb01hdGNoZXNBIC0gbnJOb01hdGNoZXNCKTtcbiAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKFwiZGlmZiBcIiArIHJlcylcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9KTtcbiAgICBpZiAoYUZpbHRlcmVkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBkZWJ1Z2xvZygnbm8gdGFyZ2V0IGZvciBzaG93RW50aXR5ICcgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dCkpO1xuICAgIH1cbiAgICAvLyBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhRmlsdGVyZWQsdW5kZWZpbmVkLDIpKVxuICAgIGlmIChhRmlsdGVyZWRbMF0pIHtcbiAgICAgICAgLy8gZXhlY3V0ZSBhbGwgZnVuY3Rpb25zXG4gICAgICAgIHZhciBvTWF0Y2ggPSBhRmlsdGVyZWRbMF07XG4gICAgICAgIHZhciBvTWVyZ2VkID0ge1xuICAgICAgICAgICAgY29udGV4dDoge31cbiAgICAgICAgfTtcbiAgICAgICAgb01lcmdlZC5jb250ZXh0ID0gQW55T2JqZWN0LmFzc2lnbih7fSwgb01lcmdlZC5jb250ZXh0LCBhRmlsdGVyZWRbMF0uY29udGV4dCwgb0NvbnRleHQpO1xuICAgICAgICBvTWVyZ2VkID0gQW55T2JqZWN0LmFzc2lnbihvTWVyZ2VkLCB7XG4gICAgICAgICAgICByZXN1bHQ6IGFGaWx0ZXJlZFswXS5yZXN1bHRcbiAgICAgICAgfSk7XG4gICAgICAgIE9iamVjdC5rZXlzKG9NYXRjaC5jb250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9NYXRjaC5jb250ZXh0W3NLZXldID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgZGVidWdsb2coJ05vdyByZXRyb2ZpdHRpbmcgOicgKyBzS2V5ICsgJyAtICcgKyBvQ29udGV4dFtzS2V5XSk7XG4gICAgICAgICAgICAgICAgb01lcmdlZCA9IG9NYXRjaC5jb250ZXh0W3NLZXldKG9Db250ZXh0W3NLZXldLCBvTWVyZ2VkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBvTWVyZ2VkO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cbi8qXG5cbmltcG9ydCB7SW5wdXRGaWx0ZXIgYXMgaW5wdXRGaWx0ZXJ9IGZyb20gJ2Fib3RfZXJiYXNlJztcblxuICBmdW5jdGlvbiBmaWx0ZXJTaG93RW50aXR5IChvQ29udGV4dCwgYVNob3dFbnRpdHlBY3Rpb25zKSB7XG4gICAgT2JqZWN0LmtleXMob0NvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgIGlmIChvQ29udGV4dFtzS2V5XSA9PT0gbnVsbCkge1xuICAgICAgICBkZWxldGUgb0NvbnRleHRbc0tleV1cbiAgICAgIH1cbiAgICB9KVxuICAgIHZhciByZXMgPSBpbnB1dEZpbHRlci5hcHBseVJ1bGVzUGlja0ZpcnN0KG9Db250ZXh0KTtcbiAgICBpZiAoIXJlcykge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZFxuICAgIH1cbiAgICBkZWJ1Z2xvZyhcIioqIGFmdGVyIGZpbHRlciBydWxlc1wiICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKVxuICAgIHJldHVybiBmaWx0ZXJTaG93RW50aXR5T2xkKHJlcyxhU2hvd0VudGl0eUFjdGlvbnMpO1xuICB9XG4qL1xuLypcbiAgZnVuY3Rpb24gZXhlY1Nob3dFbnRpdHkgKG9FbnRpdHkpIHtcbiAgICB2YXIgbWVyZ2VkID0gZmlsdGVyU2hvd0VudGl0eShvRW50aXR5LCBhU2hvd0VudGl0eUFjdGlvbnMpXG4gICAgaWYgKG1lcmdlZCkge1xuICAgICAgcmV0dXJuIGV4ZWN1dGVTdGFydHVwKG1lcmdlZClcbiAgICB9XG4gICAgcmV0dXJuIG51bGxcbiAgfVxuKi9cbi8vIEU6XFxwcm9qZWN0c1xcbm9kZWpzXFxib3RidWlsZGVyXFxzYW1wbGVib3Q+XCIlUHJvZ3JhbUZpbGVzKHg4NiklXFxHb29nbGVcXENocm9tZVxcQXBwbGljYXRpb25cXGNocm9tZS5leGVcIiAtLWluY29nbml0byAtdXJsIHd3dy5zcGllZ2VsLmRlXG5leHBvcnRzLmRpc3BhdGNoZXIgPSB7XG4gICAgLy8gICAgZXhlY1Nob3dFbnRpdHk6IGV4ZWNTaG93RW50aXR5LFxuICAgIF90ZXN0OiB7XG4gICAgICAgIC8vIHNhbWVPclN0YXI6IHNhbWVPclN0YXIsXG4gICAgICAgIC8vICAgIG5yTWF0Y2hlczogbnJNYXRjaGVzLFxuICAgICAgICAvLyAgICBuck5vTWF0Y2hlczogbnJOb01hdGNoZXMsXG4gICAgICAgIGV4cGFuZFBhcmFtZXRlcnNJblVSTDogZXhwYW5kUGFyYW1ldGVyc0luVVJMLFxuICAgICAgICAvLyAgICBmaWx0ZXJTaG93RW50aXR5OiBmaWx0ZXJTaG93RW50aXR5LFxuICAgICAgICAvLyAgZm5GaW5kVW5pdFRlc3Q6IGZuRmluZFVuaXRUZXN0LFxuICAgICAgICBjYWxjRGlzdGFuY2U6IGNhbGNEaXN0YW5jZSxcbiAgICAgICAgX2FTaG93RW50aXR5QWN0aW9uczogYVNob3dFbnRpdHlBY3Rpb25zXG4gICAgfVxufTtcbi8vZXhwb3J0cyBkaXNwYXRjaGVyO1xuLy9tb2R1bGUuZXhwb3J0cyA9IGRpc3BhdGNoZXJcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
