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
        sameOrStar: sameOrStar,
        nrMatches: nrMatches,
        nrNoMatches: nrNoMatches,
        expandParametersInURL: expandParametersInURL,
        //    filterShowEntity: filterShowEntity,
        //  fnFindUnitTest: fnFindUnitTest,
        calcDistance: calcDistance,
        _aShowEntityActions: aShowEntityActions
    }
};
//exports dispatcher;
//module.exports = dispatcher
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9kaXNwYXRjaGVyLnRzIiwibWF0Y2gvZGlzcGF0Y2hlci5qcyJdLCJuYW1lcyI6WyJBbnlPYmplY3QiLCJPYmplY3QiLCJkaXN0YW5jZSIsInJlcXVpcmUiLCJkZWJ1ZyIsImRlYnVnbG9nIiwiZXhlY3RlbXBsYXRlIiwibWF0Y2hkYXRhIiwiQWxnb2wiLCJvVW5pdFRlc3RzIiwib1dpa2lzIiwiY2FsY0Rpc3RhbmNlIiwic1RleHQxIiwic1RleHQyIiwidG9Mb3dlckNhc2UiLCJmbkZpbmRNYXRjaCIsInNLZXl3b3JkIiwib0NvbnRleHQiLCJvTWFwIiwic0tleXdvcmRMYyIsInNvcnQiLCJvRW50cnkxIiwib0VudHJ5MiIsInUxIiwia2V5IiwidTIiLCJkaXN0IiwiQ3V0b2ZmX1dvcmRNYXRjaCIsIm8xIiwiYXNzaWduIiwibzIiLCJjb250ZXh0IiwiZm5GaW5kVW5pdFRlc3QiLCJzc3lzdGVtT2JqZWN0SWQiLCJmbkZpbmRXaWtpIiwiYVNob3dFbnRpdHlBY3Rpb25zIiwic3lzdGVtSWQiLCJjbGllbnQiLCJzeXN0ZW10eXBlIiwic3lzdGVtT2JqZWN0SWQiLCJyZXN1bHQiLCJ0eXBlIiwicGF0dGVybiIsInN5c3RlbU9iamVjdENhdGVnb3J5IiwidG9vbCIsImV4cGFuZFBhcmFtZXRlcnNJblVSTCIsIm9NZXJnZWRDb250ZXh0UmVzdWx0IiwicHRuIiwiZXhwYW5kVGVtcGxhdGUiLCJuck1hdGNoZXMiLCJhT2JqZWN0Iiwia2V5cyIsInJlZHVjZSIsInByZXYiLCJwcm90b3R5cGUiLCJoYXNPd25Qcm9wZXJ0eSIsImNhbGwiLCJuck5vTWF0Y2hlcyIsIm5vTWF0Y2hBIiwibm9NYXRjaEIiLCJzYW1lT3JTdGFyIiwiczEiLCJzMiIsIm9FbnRpdHkiLCJ1bmRlZmluZWQiLCJSZWdFeHAiLCJleGVjIiwic2FtZU9yU3RhckVtcHR5IiwiZmlsdGVyU2hvd0VudGl0eU9sZCIsImFTaG93RW50aXR5IiwiYUZpbHRlcmVkIiwiZm9yRWFjaCIsInNLZXkiLCJmaWx0ZXIiLCJvU2hvd0VudGl0eSIsImEiLCJiIiwibnJNYXRjaGVzQSIsIm5yTWF0Y2hlc0IiLCJuck5vTWF0Y2hlc0EiLCJuck5vTWF0Y2hlc0IiLCJyZXMiLCJsZW5ndGgiLCJKU09OIiwic3RyaW5naWZ5Iiwib01hdGNoIiwib01lcmdlZCIsImV4cG9ydHMiLCJkaXNwYXRjaGVyIiwiX3Rlc3QiLCJfYVNob3dFbnRpdHlBY3Rpb25zIl0sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7QUNLQTs7QURRQSxJQUFJQSxZQUFrQkMsTUFBdEI7QUFFQSxJQUFBQyxXQUFBQyxRQUFBLGlCQUFBLENBQUE7QUFFQSxJQUFBQyxRQUFBRCxRQUFBLE9BQUEsQ0FBQTtBQUNBLElBQU1FLFdBQVdELE1BQU0sWUFBTixDQUFqQjtBQUdBO0FBQ0E7QUFFQSxJQUFBRSxlQUFBSCxRQUFBLHNCQUFBLENBQUE7QUFFRTtBQUNGLElBQUFJLFlBQUFKLFFBQUEsYUFBQSxDQUFBO0FBRUEsSUFBQUssUUFBQUwsUUFBQSxnQkFBQSxDQUFBO0FBRUEsSUFBTU0sYUFBYUYsVUFBVUUsVUFBN0I7QUFDQSxJQUFNQyxTQUFTSCxVQUFVRyxNQUF6QjtBQUVFLFNBQUFDLFlBQUEsQ0FBdUJDLE1BQXZCLEVBQStCQyxNQUEvQixFQUFxQztBQUNuQyxXQUFPWCxTQUFTUyxZQUFULENBQXNCQyxPQUFPRSxXQUFQLEVBQXRCLEVBQTRDRCxNQUE1QyxDQUFQO0FBQ0E7Ozs7OztBQU1EO0FBRUQsU0FBQUUsV0FBQSxDQUFzQkMsUUFBdEIsRUFBZ0NDLFFBQWhDLEVBQTBDQyxJQUExQyxFQUE4QztBQUM1QztBQUNBO0FBQ0EsUUFBSUMsYUFBYUgsU0FBU0YsV0FBVCxFQUFqQjtBQUNBSSxTQUFLRSxJQUFMLENBQVUsVUFBVUMsT0FBVixFQUFtQkMsT0FBbkIsRUFBMEI7QUFDbEMsWUFBSUMsS0FBS1osYUFBYVUsUUFBUUcsR0FBckIsRUFBMEJMLFVBQTFCLENBQVQ7QUFDQSxZQUFJTSxLQUFLZCxhQUFhVyxRQUFRRSxHQUFyQixF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Z0MsVUFBcEMsRUFBZ0Q7QUFDOUNuRSx5QkFBUyx1QkFBdUJtRSxJQUF2QixHQUE4QixLQUE5QixHQUFzQ3ZELFNBQVN1RCxJQUFULENBQS9DO0FBQ0FjLDBCQUFVRCxPQUFPdEQsT0FBUCxDQUFleUMsSUFBZixFQUFxQnZELFNBQVN1RCxJQUFULENBQXJCLEVBQXFDYyxPQUFyQyxDQUFWO0FBQ0Q7QUFDRixTQUxEO0FBT0EsZUFBT0EsT0FBUDtBQUNEO0FBQ0QsV0FBTyxJQUFQO0FBQ0Q7QUFDSDs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBa0JBOzs7Ozs7Ozs7QUFVRTtBQUVhQyxRQUFBQyxVQUFBLEdBQWE7QUFDNUI7QUFDSUMsV0FBTztBQUNMN0Isb0JBQVlBLFVBRFA7QUFFTFgsbUJBQVdBLFNBRk47QUFHTFEscUJBQWFBLFdBSFI7QUFJTFosK0JBQXVCQSxxQkFKbEI7QUFLVDtBQUNFO0FBQ0VsQyxzQkFBY0EsWUFQVDtBQVFMK0UsNkJBQXFCdkQ7QUFSaEI7QUFGaUIsQ0FBYjtBQWNiO0FBRUEiLCJmaWxlIjoibWF0Y2gvZGlzcGF0Y2hlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBAZmlsZVxyXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5kaXNwYXRjaGVyXHJcbiAqIEBjb3B5cmlnaHQgKGMpIDIwMTYgR2VyZCBGb3JzdG1hbm5cclxuICovXHJcblxyXG5cclxuLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vbGliL25vZGUtNC5kLnRzXCIgLz5cclxuXHJcbmRlY2xhcmUgaW50ZXJmYWNlIE9iamVjdENvbnN0cnVjdG9yIHtcclxuICAgIGFzc2lnbih0YXJnZXQ6IGFueSwgLi4uc291cmNlczogYW55W10pOiBhbnk7XHJcbn1cclxuXHJcbnZhciBBbnlPYmplY3QgPSAoPGFueT5PYmplY3QpO1xyXG5cclxuaW1wb3J0ICogYXMgZGlzdGFuY2UgZnJvbSAgJ2Fib3Rfc3RyaW5nZGlzdCc7XHJcblxyXG5pbXBvcnQgKiBhcyBkZWJ1ZyBmcm9tICdkZWJ1Zyc7XHJcbmNvbnN0IGRlYnVnbG9nID0gZGVidWcoJ2Rpc3BhdGNoZXInKVxyXG5cclxuaW1wb3J0IHsgZXhlYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xyXG4vLyAgdmFyIGV4ZWMgPSByZXF1aXJlKCdjaGlsZF9wcm9jZXNzJykuZXhlY1xyXG4vLyAgdmFyIGxldmVuID0gcmVxdWlyZSgnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluLmpzJykubGV2ZW5zaHRlaW5cclxuXHJcbmltcG9ydCAqIGFzIGV4ZWN0ZW1wbGF0ZSBmcm9tICcuLi9leGVjL2V4ZWN0ZW1wbGF0ZSc7XHJcblxyXG4gIC8vdmFyIGxldmVuID0gcmVxdWlyZSgnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluLmpzJylcclxuaW1wb3J0ICogYXMgbWF0Y2hkYXRhIGZyb20gJy4vbWF0Y2hkYXRhJztcclxuXHJcbmltcG9ydCAqIGFzIEFsZ29sIGZyb20gJy4uL21hdGNoL2FsZ29sJztcclxuXHJcbmNvbnN0IG9Vbml0VGVzdHMgPSBtYXRjaGRhdGEub1VuaXRUZXN0c1xyXG5jb25zdCBvV2lraXMgPSBtYXRjaGRhdGEub1dpa2lzXHJcblxyXG4gIGZ1bmN0aW9uIGNhbGNEaXN0YW5jZSAoc1RleHQxLCBzVGV4dDIpIHtcclxuICAgIHJldHVybiBkaXN0YW5jZS5jYWxjRGlzdGFuY2Uoc1RleHQxLnRvTG93ZXJDYXNlKCksIHNUZXh0Mik7XHJcbiAgICAvKlxyXG4gICAgZGVidWdsb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxyXG4gICAgdmFyIGEwID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnN1YnN0cmluZygwLCBzVGV4dDIubGVuZ3RoKSwgc1RleHQyKVxyXG4gICAgdmFyIGEgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEudG9Mb3dlckNhc2UoKSwgc1RleHQyKVxyXG4gICAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGFcclxuICAgICovXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBmbkZpbmRNYXRjaCAoc0tleXdvcmQsIG9Db250ZXh0LCBvTWFwKSB7XHJcbiAgICAvLyByZXR1cm4gYSBiZXR0ZXIgY29udGV4dCBpZiB0aGVyZSBpcyBhIG1hdGNoXHJcbiAgICAvLyBzS2V5d29yZCA9IHNLZXl3b3JkLnRvTG93ZXJDYXNlKCk7XHJcbiAgICB2YXIgc0tleXdvcmRMYyA9IHNLZXl3b3JkLnRvTG93ZXJDYXNlKCk7XHJcbiAgICBvTWFwLnNvcnQoZnVuY3Rpb24gKG9FbnRyeTEsIG9FbnRyeTIpIHtcclxuICAgICAgdmFyIHUxID0gY2FsY0Rpc3RhbmNlKG9FbnRyeTEua2V5LCBzS2V5d29yZExjKVxyXG4gICAgICB2YXIgdTIgPSBjYWxjRGlzdGFuY2Uob0VudHJ5Mi5rZXksIHNLZXl3b3JkTGMpXHJcbiAgICAgIHJldHVybiB1MiAtIHUxO1xyXG4gICAgfSlcclxuICAgIC8vIGxhdGVyOiBpbiBjYXNlIG9mIGNvbmZsaWN0cywgYXNrLFxyXG4gICAgLy8gbm93OlxyXG4gICAgdmFyIGRpc3QgPSBjYWxjRGlzdGFuY2Uob01hcFswXS5rZXksIHNLZXl3b3JkTGMpXHJcbiAgICBkZWJ1Z2xvZygnYmVzdCBkaXN0JyArIGRpc3QgKyAnIC8gICcgKyBvTWFwWzBdLmtleSArICcgJyArIHNLZXl3b3JkKVxyXG4gICAgaWYgKGRpc3QgPiBBbGdvbC5DdXRvZmZfV29yZE1hdGNoKSB7XHJcbiAgICAgIHZhciBvMSA9ICg8YW55Pk9iamVjdCkuYXNzaWduKHt9LCBvQ29udGV4dClcclxuICAgICAgdmFyIG8yXHJcbiAgICAgIG8xLmNvbnRleHQgPSAoPGFueT5PYmplY3QpLmFzc2lnbih7fSwgbzEuY29udGV4dClcclxuICAgICAgbzIgPSBvMVxyXG4gICAgICBvMi5jb250ZXh0ID0gKDxhbnk+T2JqZWN0KS5hc3NpZ24obzEuY29udGV4dCwgb01hcFswXS5jb250ZXh0KVxyXG4gICAgICByZXR1cm4gbzJcclxuICAgIH1cclxuICAgIHJldHVybiBudWxsXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBhIGZ1bmN0aW9uIHRvIG1hdGNoIGEgdW5pdCB0ZXN0IHVzaW5nIGxldmVuc2h0ZWluIGRpc3RhbmNlc1xyXG4gICAqIEBwdWJsaWNcclxuICAgKi9cclxuICBmdW5jdGlvbiBmbkZpbmRVbml0VGVzdCAoc3N5c3RlbU9iamVjdElkLCBvQ29udGV4dCkge1xyXG4gICAgcmV0dXJuIGZuRmluZE1hdGNoKHNzeXN0ZW1PYmplY3RJZCwgb0NvbnRleHQsIG9Vbml0VGVzdHMpXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBmbkZpbmRXaWtpIChzS2V5d29yZCwgb0NvbnRleHQpIHtcclxuICAgIHJldHVybiBmbkZpbmRNYXRjaChzS2V5d29yZCwgb0NvbnRleHQsIG9XaWtpcylcclxuICB9XHJcblxyXG4gIHZhciBhU2hvd0VudGl0eUFjdGlvbnMgPSBbXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1JZDogJ3V2MicsXHJcbiAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXHJcbiAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwJ1xyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdXYyLndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS91aTIvdXNoZWxsL3NoZWxscy9hYmFwL0Zpb3JpTGF1bmNocGFkLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbUlkOiAndXYyJyxcclxuICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcclxuICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHBkJ1xyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdXYyLndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS9zYXAvYXJzcnZjX3VwYl9hZG1uL21haW4uaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtSWQ6ICd1MXknLFxyXG4gICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxyXG4gICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscCdcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXUxeS53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvdWkyL3VzaGVsbC9zaGVsbHMvYWJhcC9GaW9yaUxhdW5jaHBhZC5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1JZDogJ3UxeScsXHJcbiAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXHJcbiAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwZCdcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXUxeS53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvc2FwL2Fyc3J2Y191cGJfYWRtbi9tYWluLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbUlkOiAndXYyJyxcclxuICAgICAgICBjbGllbnQ6ICcxMjAnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAnZmlvcmkgY2F0YWxvZycsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IC8uKi8sXHJcbiAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxyXG4gICAgICAgIHRvb2w6ICdGTFBEJ1xyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdXYyLndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS9zYXAvYXJzcnZjX3VwYl9hZG1uL21haW4uaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9I0NBVEFMT0c6e3N5c3RlbU9iamVjdElkfSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAndW5pdCcsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IGZuRmluZFVuaXRUZXN0XHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwOi8vbG9jYWxob3N0OjgwODAve3BhdGh9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAndW5pdCB0ZXN0JyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogZm5GaW5kVW5pdFRlc3RcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MC97cGF0aH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ3dpa2knLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiBmbkZpbmRXaWtpXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL3dpa2kud2RmLnNhcC5jb3JwL3twYXRofSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbUlkOiAnSklSQSdcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vamlyYS53ZGYuc2FwLmNvcnA6ODA4MC9USVBDT1JFVUlJSSdcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIF1cclxuXHJcbiAgLy8gaWYgVE9PTCA9IEpJUkEgfHwgU3lzdGVtSWQgPSBKSVJBIC0+IFN5c3RlbUlkID0gSklSQVxyXG4gIC8vXHJcbiAgLy9cclxuXHJcbiAgLy8gc3RhcnRTQVBHVUlcclxuXHJcbiAgLy8gICBOOlxcPlwiYzpcXFByb2dyYW0gRmlsZXMgKHg4NilcXFNBUFxcRnJvbnRFbmRcXFNBUGd1aVwiXFxzYXBzaGN1dC5leGUgIC1zeXN0ZW09VVYyIC1jbGllbnQ9MTIwIC1jb21tYW5kPVNFMzggLXR5cGU9VHJhbnNhY3Rpb24gLXVzZXI9QVVTRVJcclxuXHJcbiAgZnVuY3Rpb24gZXhwYW5kUGFyYW1ldGVyc0luVVJMIChvTWVyZ2VkQ29udGV4dFJlc3VsdCkge1xyXG4gICAgdmFyIHB0biA9IG9NZXJnZWRDb250ZXh0UmVzdWx0LnJlc3VsdC5wYXR0ZXJuXHJcbiAgICBwdG4gPSBleGVjdGVtcGxhdGUuZXhwYW5kVGVtcGxhdGUob01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dCwgcHRuKTtcclxuLyogICAgT2JqZWN0LmtleXMob01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xyXG4gICAgICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKCd7JyArIHNLZXkgKyAnfScsICdnJylcclxuICAgICAgcHRuID0gcHRuLnJlcGxhY2UocmVnZXgsIG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHRbc0tleV0pXHJcbiAgICAgIHB0biA9IHB0bi5yZXBsYWNlKHJlZ2V4LCBvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0W3NLZXldKVxyXG4gICAgfSlcclxuICAgICovXHJcbiAgICByZXR1cm4gcHRuXHJcbiAgfVxyXG5cclxuLypcclxuICBleHBvcnQgZnVuY3Rpb24gZXhlY3V0ZVN0YXJ0dXAgKG9NZXJnZWRDb250ZXh0UmVzdWx0KSB7XHJcbiAgICBpZiAob01lcmdlZENvbnRleHRSZXN1bHQucmVzdWx0LnR5cGUgPT09ICdVUkwnKSB7XHJcbiAgICAgIHZhciBwdG4gPSBleHBhbmRQYXJhbWV0ZXJzSW5VUkwob01lcmdlZENvbnRleHRSZXN1bHQpXHJcbiAgICAgIGV4ZWMuc3RhcnRCcm93c2VyKHB0bilcclxuICAgICAgcmV0dXJuIHB0blxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdmFyIHMgPSAoXCJEb24ndCBrbm93IGhvdyB0byBzdGFydCBcIiArIG9NZXJnZWRDb250ZXh0UmVzdWx0LnJlc3VsdC50eXBlICsgJ1xcbiBmb3IgXCInICsgb01lcmdlZENvbnRleHRSZXN1bHQucXVlcnkgKyAnXCInKVxyXG4gICAgICBkZWJ1Z2xvZyhzKVxyXG4gICAgICByZXR1cm4gc1xyXG4gICAgfVxyXG4gIH1cclxuKi9cclxuXHJcbiAgZnVuY3Rpb24gbnJNYXRjaGVzIChhT2JqZWN0LCBvQ29udGV4dCkge1xyXG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKGFPYmplY3QpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XHJcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0NvbnRleHQsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIDFcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldlxyXG4gICAgfSwgMClcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIG5yTm9NYXRjaGVzIChhT2JqZWN0LCBvQ29udGV4dCkge1xyXG4gICAgdmFyIG5vTWF0Y2hBID0gT2JqZWN0LmtleXMoYU9iamVjdCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob0NvbnRleHQsIGtleSkpIHtcclxuICAgICAgICBwcmV2ID0gcHJldiArIDFcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcHJldlxyXG4gICAgfSwgMClcclxuICAgIHZhciBub01hdGNoQiA9IE9iamVjdC5rZXlzKG9Db250ZXh0KS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xyXG4gICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChhT2JqZWN0LCBrZXkpKSB7XHJcbiAgICAgICAgcHJldiA9IHByZXYgKyAxXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHByZXZcclxuICAgIH0sIDApXHJcbiAgICByZXR1cm4gbm9NYXRjaEEgKyBub01hdGNoQlxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gc2FtZU9yU3RhciAoczEgOiBzdHJpbmcsIHMyIDogc3RyaW5nIHwgUmVnRXhwIHwgRnVuY3Rpb24gLCBvRW50aXR5KSB7XHJcbiAgICByZXR1cm4gczEgPT09IHMyIHx8XHJcbiAgICAgIChzMSA9PT0gdW5kZWZpbmVkICYmIHMyID09PSBudWxsKSB8fFxyXG4gICAgICAoKHMyIGluc3RhbmNlb2YgUmVnRXhwKSAmJiBzMi5leGVjKHMxKSAhPT0gbnVsbCkgfHxcclxuICAgICAgKCh0eXBlb2YgczIgPT09ICdmdW5jdGlvbicgJiYgczEpICYmIHMyKHMxLCBvRW50aXR5KSlcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHNhbWVPclN0YXJFbXB0eSAoczEgOiBzdHJpbmcsIHMyIDogc3RyaW5nIHwgUmVnRXhwIHwgRnVuY3Rpb24sIG9FbnRpdHkpIHtcclxuICAgIGlmIChzMSA9PT0gdW5kZWZpbmVkICYmIHMyID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgcmV0dXJuIHRydWVcclxuICAgIH1cclxuICAgIGlmIChzMiA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHMxID09PSBzMiB8fFxyXG4gICAgICAoKHMyIGluc3RhbmNlb2YgUmVnRXhwKSAmJiBzMi5leGVjKHMxKSAhPT0gbnVsbCkgfHxcclxuICAgICAgKCh0eXBlb2YgczIgPT09ICdmdW5jdGlvbicgJiYgczEpICYmIHMyKHMxLCBvRW50aXR5KSlcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGZpbHRlclNob3dFbnRpdHlPbGQgKG9Db250ZXh0LCBhU2hvd0VudGl0eSkge1xyXG4gICAgdmFyIGFGaWx0ZXJlZFxyXG4gICAgT2JqZWN0LmtleXMob0NvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcclxuICAgICAgaWYgKG9Db250ZXh0W3NLZXldID09PSBudWxsKSB7XHJcbiAgICAgICAgb0NvbnRleHRbc0tleV0gPSB1bmRlZmluZWRcclxuICAgICAgfVxyXG4gICAgfSlcclxuICAgIC8vIGZpbHRlciBjb250ZXh0LCBhbWVuZGluZyBzeW5vbnltc1xyXG5cclxuXHJcbiAgICBhRmlsdGVyZWQgPSBhU2hvd0VudGl0eS5maWx0ZXIoZnVuY3Rpb24gKG9TaG93RW50aXR5KSB7XHJcbiAgICAgIC8vICAgICAgIGNvbnNvbGUubG9nKFwiLi4uXCIpXHJcbiAgICAgIC8vICAgICAgY29uc29sZS5sb2cob1Nob3dFbnRpdHkuY29udGV4dC50b29sICsgXCIgXCIgKyBvQ29udGV4dC50b29sICsgXCJcXG5cIilcclxuICAgICAgLy8gICAgICBjb25zb2xlLmxvZyhvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCArIFwiIFwiICsgb0NvbnRleHQuY2xpZW50ICtcIjpcIiArIHNhbWVPclN0YXIob0NvbnRleHQuY2xpZW50LG9TaG93RW50aXR5LmNvbnRleHQuY2xpZW50KSArIFwiXFxuXCIpXHJcbiAgICAgIC8vICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShvU2hvd0VudGl0eS5jb250ZXh0KSArIFwiXFxuXCIgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dC5jbGllbnQpICsgXCJcXG5cIilcclxuXHJcbiAgICAgIHJldHVybiBzYW1lT3JTdGFyKG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtSWQsIG9Db250ZXh0LnN5c3RlbUlkLCBvQ29udGV4dCkgJiZcclxuICAgICAgICBzYW1lT3JTdGFyKG9Db250ZXh0LnRvb2wsIG9TaG93RW50aXR5LmNvbnRleHQudG9vbCwgb0NvbnRleHQpICYmXHJcbiAgICAgICAgc2FtZU9yU3RhcihvQ29udGV4dC5jbGllbnQsIG9TaG93RW50aXR5LmNvbnRleHQuY2xpZW50LCBvQ29udGV4dCkgJiZcclxuICAgICAgICBzYW1lT3JTdGFyRW1wdHkob0NvbnRleHQuc3lzdGVtT2JqZWN0Q2F0ZWdvcnksIG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtT2JqZWN0Q2F0ZWdvcnksIG9Db250ZXh0KSAmJlxyXG4gICAgICAgIHNhbWVPclN0YXJFbXB0eShvQ29udGV4dC5zeXN0ZW1PYmplY3RJZCwgb1Nob3dFbnRpdHkuY29udGV4dC5zeXN0ZW1PYmplY3RJZCwgb0NvbnRleHQpXHJcbiAgICAvLyAgICAgICYmIG9TaG93RW50aXR5LmNvbnRleHQudG9vbCA9PT0gb0NvbnRleHQudG9vbFxyXG4gICAgfSlcclxuICAgIC8vICBjb25zb2xlLmxvZyhhRmlsdGVyZWQubGVuZ3RoKVxyXG4gICAgLy8gbWF0Y2ggb3RoZXIgY29udGV4dCBwYXJhbWV0ZXJzXHJcbiAgICBhRmlsdGVyZWQuc29ydChmdW5jdGlvbiAoYSwgYikge1xyXG4gICAgICB2YXIgbnJNYXRjaGVzQSA9IG5yTWF0Y2hlcyhhLmNvbnRleHQsIG9Db250ZXh0KVxyXG4gICAgICB2YXIgbnJNYXRjaGVzQiA9IG5yTWF0Y2hlcyhiLmNvbnRleHQsIG9Db250ZXh0KVxyXG4gICAgICB2YXIgbnJOb01hdGNoZXNBID0gbnJOb01hdGNoZXMoYS5jb250ZXh0LCBvQ29udGV4dClcclxuICAgICAgdmFyIG5yTm9NYXRjaGVzQiA9IG5yTm9NYXRjaGVzKGIuY29udGV4dCwgb0NvbnRleHQpXHJcbiAgICAgIC8vICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYS5jb250ZXh0KSlcclxuICAgICAgLy8gICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShiLmNvbnRleHQpKVxyXG4gICAgICAvLyAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KG9Db250ZXh0KSlcclxuICAgICAgdmFyIHJlcyA9IC0obnJNYXRjaGVzQSAtIG5yTWF0Y2hlc0IpICogMTAwICsgKG5yTm9NYXRjaGVzQSAtIG5yTm9NYXRjaGVzQilcclxuICAgICAgLy8gICAgIGNvbnNvbGUubG9nKFwiZGlmZiBcIiArIHJlcylcclxuICAgICAgcmV0dXJuIHJlc1xyXG4gICAgfSlcclxuICAgIGlmIChhRmlsdGVyZWQubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIGRlYnVnbG9nKCdubyB0YXJnZXQgZm9yIHNob3dFbnRpdHkgJyArIEpTT04uc3RyaW5naWZ5KG9Db250ZXh0KSlcclxuICAgIH1cclxuICAgIC8vIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGFGaWx0ZXJlZCx1bmRlZmluZWQsMikpXHJcbiAgICBpZiAoYUZpbHRlcmVkWzBdKSB7XHJcbiAgICAgIC8vIGV4ZWN1dGUgYWxsIGZ1bmN0aW9uc1xyXG5cclxuICAgICAgdmFyIG9NYXRjaCA9IGFGaWx0ZXJlZFswXVxyXG5cclxuICAgICAgdmFyIG9NZXJnZWQgPSB7XHJcbiAgICAgICAgY29udGV4dDoge1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgb01lcmdlZC5jb250ZXh0ID0gQW55T2JqZWN0LmFzc2lnbih7fSwgb01lcmdlZC5jb250ZXh0LCBhRmlsdGVyZWRbMF0uY29udGV4dCwgb0NvbnRleHQpXHJcbiAgICAgIG9NZXJnZWQgPSBBbnlPYmplY3QuYXNzaWduKG9NZXJnZWQsIHtcclxuICAgICAgICByZXN1bHQ6IGFGaWx0ZXJlZFswXS5yZXN1bHRcclxuICAgICAgfSlcclxuXHJcbiAgICAgIE9iamVjdC5rZXlzKG9NYXRjaC5jb250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBvTWF0Y2guY29udGV4dFtzS2V5XSA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgZGVidWdsb2coJ05vdyByZXRyb2ZpdHRpbmcgOicgKyBzS2V5ICsgJyAtICcgKyBvQ29udGV4dFtzS2V5XSlcclxuICAgICAgICAgIG9NZXJnZWQgPSBvTWF0Y2guY29udGV4dFtzS2V5XShvQ29udGV4dFtzS2V5XSwgb01lcmdlZClcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcblxyXG4gICAgICByZXR1cm4gb01lcmdlZFxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG51bGxcclxuICB9XHJcbi8qXHJcblxyXG5pbXBvcnQge0lucHV0RmlsdGVyIGFzIGlucHV0RmlsdGVyfSBmcm9tICdhYm90X2VyYmFzZSc7XHJcblxyXG4gIGZ1bmN0aW9uIGZpbHRlclNob3dFbnRpdHkgKG9Db250ZXh0LCBhU2hvd0VudGl0eUFjdGlvbnMpIHtcclxuICAgIE9iamVjdC5rZXlzKG9Db250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XHJcbiAgICAgIGlmIChvQ29udGV4dFtzS2V5XSA9PT0gbnVsbCkge1xyXG4gICAgICAgIGRlbGV0ZSBvQ29udGV4dFtzS2V5XVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gICAgdmFyIHJlcyA9IGlucHV0RmlsdGVyLmFwcGx5UnVsZXNQaWNrRmlyc3Qob0NvbnRleHQpO1xyXG4gICAgaWYgKCFyZXMpIHtcclxuICAgICAgcmV0dXJuIHVuZGVmaW5lZFxyXG4gICAgfVxyXG4gICAgZGVidWdsb2coXCIqKiBhZnRlciBmaWx0ZXIgcnVsZXNcIiArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSlcclxuICAgIHJldHVybiBmaWx0ZXJTaG93RW50aXR5T2xkKHJlcyxhU2hvd0VudGl0eUFjdGlvbnMpO1xyXG4gIH1cclxuKi9cclxuLypcclxuICBmdW5jdGlvbiBleGVjU2hvd0VudGl0eSAob0VudGl0eSkge1xyXG4gICAgdmFyIG1lcmdlZCA9IGZpbHRlclNob3dFbnRpdHkob0VudGl0eSwgYVNob3dFbnRpdHlBY3Rpb25zKVxyXG4gICAgaWYgKG1lcmdlZCkge1xyXG4gICAgICByZXR1cm4gZXhlY3V0ZVN0YXJ0dXAobWVyZ2VkKVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG51bGxcclxuICB9XHJcbiovXHJcblxyXG4gIC8vIEU6XFxwcm9qZWN0c1xcbm9kZWpzXFxib3RidWlsZGVyXFxzYW1wbGVib3Q+XCIlUHJvZ3JhbUZpbGVzKHg4NiklXFxHb29nbGVcXENocm9tZVxcQXBwbGljYXRpb25cXGNocm9tZS5leGVcIiAtLWluY29nbml0byAtdXJsIHd3dy5zcGllZ2VsLmRlXHJcblxyXG4gIGV4cG9ydCBjb25zdCBkaXNwYXRjaGVyID0ge1xyXG4vLyAgICBleGVjU2hvd0VudGl0eTogZXhlY1Nob3dFbnRpdHksXHJcbiAgICBfdGVzdDoge1xyXG4gICAgICBzYW1lT3JTdGFyOiBzYW1lT3JTdGFyLFxyXG4gICAgICBuck1hdGNoZXM6IG5yTWF0Y2hlcyxcclxuICAgICAgbnJOb01hdGNoZXM6IG5yTm9NYXRjaGVzLFxyXG4gICAgICBleHBhbmRQYXJhbWV0ZXJzSW5VUkw6IGV4cGFuZFBhcmFtZXRlcnNJblVSTCxcclxuICAvLyAgICBmaWx0ZXJTaG93RW50aXR5OiBmaWx0ZXJTaG93RW50aXR5LFxyXG4gICAgLy8gIGZuRmluZFVuaXRUZXN0OiBmbkZpbmRVbml0VGVzdCxcclxuICAgICAgY2FsY0Rpc3RhbmNlOiBjYWxjRGlzdGFuY2UsXHJcbiAgICAgIF9hU2hvd0VudGl0eUFjdGlvbnM6IGFTaG93RW50aXR5QWN0aW9uc1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy9leHBvcnRzIGRpc3BhdGNoZXI7XHJcblxyXG4gIC8vbW9kdWxlLmV4cG9ydHMgPSBkaXNwYXRjaGVyXHJcblxyXG4iLCIvKipcbiAqIEBmaWxlXG4gKiBAbW9kdWxlIGpmc2ViLmZkZXZzdGFydC5kaXNwYXRjaGVyXG4gKiBAY29weXJpZ2h0IChjKSAyMDE2IEdlcmQgRm9yc3RtYW5uXG4gKi9cblwidXNlIHN0cmljdFwiO1xudmFyIEFueU9iamVjdCA9IE9iamVjdDtcbnZhciBkaXN0YW5jZSA9IHJlcXVpcmUoXCJhYm90X3N0cmluZ2Rpc3RcIik7XG52YXIgZGVidWcgPSByZXF1aXJlKFwiZGVidWdcIik7XG52YXIgZGVidWdsb2cgPSBkZWJ1ZygnZGlzcGF0Y2hlcicpO1xuLy8gIHZhciBleGVjID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpLmV4ZWNcbi8vICB2YXIgbGV2ZW4gPSByZXF1aXJlKCcuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4uanMnKS5sZXZlbnNodGVpblxudmFyIGV4ZWN0ZW1wbGF0ZSA9IHJlcXVpcmUoXCIuLi9leGVjL2V4ZWN0ZW1wbGF0ZVwiKTtcbi8vdmFyIGxldmVuID0gcmVxdWlyZSgnLi4vdXRpbHMvZGFtZXJhdUxldmVuc2h0ZWluLmpzJylcbnZhciBtYXRjaGRhdGEgPSByZXF1aXJlKFwiLi9tYXRjaGRhdGFcIik7XG52YXIgQWxnb2wgPSByZXF1aXJlKFwiLi4vbWF0Y2gvYWxnb2xcIik7XG52YXIgb1VuaXRUZXN0cyA9IG1hdGNoZGF0YS5vVW5pdFRlc3RzO1xudmFyIG9XaWtpcyA9IG1hdGNoZGF0YS5vV2lraXM7XG5mdW5jdGlvbiBjYWxjRGlzdGFuY2Uoc1RleHQxLCBzVGV4dDIpIHtcbiAgICByZXR1cm4gZGlzdGFuY2UuY2FsY0Rpc3RhbmNlKHNUZXh0MS50b0xvd2VyQ2FzZSgpLCBzVGV4dDIpO1xuICAgIC8qXG4gICAgZGVidWdsb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxuICAgIHZhciBhMCA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS5zdWJzdHJpbmcoMCwgc1RleHQyLmxlbmd0aCksIHNUZXh0MilcbiAgICB2YXIgYSA9IGRpc3RhbmNlLmxldmVuc2h0ZWluKHNUZXh0MS50b0xvd2VyQ2FzZSgpLCBzVGV4dDIpXG4gICAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGFcbiAgICAqL1xufVxuZnVuY3Rpb24gZm5GaW5kTWF0Y2goc0tleXdvcmQsIG9Db250ZXh0LCBvTWFwKSB7XG4gICAgLy8gcmV0dXJuIGEgYmV0dGVyIGNvbnRleHQgaWYgdGhlcmUgaXMgYSBtYXRjaFxuICAgIC8vIHNLZXl3b3JkID0gc0tleXdvcmQudG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgc0tleXdvcmRMYyA9IHNLZXl3b3JkLnRvTG93ZXJDYXNlKCk7XG4gICAgb01hcC5zb3J0KGZ1bmN0aW9uIChvRW50cnkxLCBvRW50cnkyKSB7XG4gICAgICAgIHZhciB1MSA9IGNhbGNEaXN0YW5jZShvRW50cnkxLmtleSwgc0tleXdvcmRMYyk7XG4gICAgICAgIHZhciB1MiA9IGNhbGNEaXN0YW5jZShvRW50cnkyLmtleSwgc0tleXdvcmRMYyk7XG4gICAgICAgIHJldHVybiB1MiAtIHUxO1xuICAgIH0pO1xuICAgIC8vIGxhdGVyOiBpbiBjYXNlIG9mIGNvbmZsaWN0cywgYXNrLFxuICAgIC8vIG5vdzpcbiAgICB2YXIgZGlzdCA9IGNhbGNEaXN0YW5jZShvTWFwWzBdLmtleSwgc0tleXdvcmRMYyk7XG4gICAgZGVidWdsb2coJ2Jlc3QgZGlzdCcgKyBkaXN0ICsgJyAvICAnICsgb01hcFswXS5rZXkgKyAnICcgKyBzS2V5d29yZCk7XG4gICAgaWYgKGRpc3QgPiBBbGdvbC5DdXRvZmZfV29yZE1hdGNoKSB7XG4gICAgICAgIHZhciBvMSA9IE9iamVjdC5hc3NpZ24oe30sIG9Db250ZXh0KTtcbiAgICAgICAgdmFyIG8yO1xuICAgICAgICBvMS5jb250ZXh0ID0gT2JqZWN0LmFzc2lnbih7fSwgbzEuY29udGV4dCk7XG4gICAgICAgIG8yID0gbzE7XG4gICAgICAgIG8yLmNvbnRleHQgPSBPYmplY3QuYXNzaWduKG8xLmNvbnRleHQsIG9NYXBbMF0uY29udGV4dCk7XG4gICAgICAgIHJldHVybiBvMjtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59XG4vKipcbiAqIGEgZnVuY3Rpb24gdG8gbWF0Y2ggYSB1bml0IHRlc3QgdXNpbmcgbGV2ZW5zaHRlaW4gZGlzdGFuY2VzXG4gKiBAcHVibGljXG4gKi9cbmZ1bmN0aW9uIGZuRmluZFVuaXRUZXN0KHNzeXN0ZW1PYmplY3RJZCwgb0NvbnRleHQpIHtcbiAgICByZXR1cm4gZm5GaW5kTWF0Y2goc3N5c3RlbU9iamVjdElkLCBvQ29udGV4dCwgb1VuaXRUZXN0cyk7XG59XG5mdW5jdGlvbiBmbkZpbmRXaWtpKHNLZXl3b3JkLCBvQ29udGV4dCkge1xuICAgIHJldHVybiBmbkZpbmRNYXRjaChzS2V5d29yZCwgb0NvbnRleHQsIG9XaWtpcyk7XG59XG52YXIgYVNob3dFbnRpdHlBY3Rpb25zID0gW1xuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtSWQ6ICd1djInLFxuICAgICAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXG4gICAgICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscCdcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1djIud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3VpMi91c2hlbGwvc2hlbGxzL2FiYXAvRmlvcmlMYXVuY2hwYWQuaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbUlkOiAndXYyJyxcbiAgICAgICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxuICAgICAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHBkJ1xuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXV2Mi53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvc2FwL2Fyc3J2Y191cGJfYWRtbi9tYWluLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1JZDogJ3UxeScsXG4gICAgICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcbiAgICAgICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwJ1xuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXUxeS53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvdWkyL3VzaGVsbC9zaGVsbHMvYWJhcC9GaW9yaUxhdW5jaHBhZC5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtSWQ6ICd1MXknLFxuICAgICAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXG4gICAgICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscGQnXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdTF5LndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS9zYXAvYXJzcnZjX3VwYl9hZG1uL21haW4uaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbUlkOiAndXYyJyxcbiAgICAgICAgICAgIGNsaWVudDogJzEyMCcsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ2Zpb3JpIGNhdGFsb2cnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IC8uKi8sXG4gICAgICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXG4gICAgICAgICAgICB0b29sOiAnRkxQRCdcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1djIud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3NhcC9hcnNydmNfdXBiX2FkbW4vbWFpbi5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0jQ0FUQUxPRzp7c3lzdGVtT2JqZWN0SWR9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAndW5pdCcsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogZm5GaW5kVW5pdFRlc3RcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwOi8vbG9jYWxob3N0OjgwODAve3BhdGh9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAndW5pdCB0ZXN0JyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiBmbkZpbmRVbml0VGVzdFxuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MC97cGF0aH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtT2JqZWN0Q2F0ZWdvcnk6ICd3aWtpJyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiBmbkZpbmRXaWtpXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly93aWtpLndkZi5zYXAuY29ycC97cGF0aH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtSWQ6ICdKSVJBJ1xuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vamlyYS53ZGYuc2FwLmNvcnA6ODA4MC9USVBDT1JFVUlJSSdcbiAgICAgICAgfVxuICAgIH1cbl07XG4vLyBpZiBUT09MID0gSklSQSB8fCBTeXN0ZW1JZCA9IEpJUkEgLT4gU3lzdGVtSWQgPSBKSVJBXG4vL1xuLy9cbi8vIHN0YXJ0U0FQR1VJXG4vLyAgIE46XFw+XCJjOlxcUHJvZ3JhbSBGaWxlcyAoeDg2KVxcU0FQXFxGcm9udEVuZFxcU0FQZ3VpXCJcXHNhcHNoY3V0LmV4ZSAgLXN5c3RlbT1VVjIgLWNsaWVudD0xMjAgLWNvbW1hbmQ9U0UzOCAtdHlwZT1UcmFuc2FjdGlvbiAtdXNlcj1BVVNFUlxuZnVuY3Rpb24gZXhwYW5kUGFyYW1ldGVyc0luVVJMKG9NZXJnZWRDb250ZXh0UmVzdWx0KSB7XG4gICAgdmFyIHB0biA9IG9NZXJnZWRDb250ZXh0UmVzdWx0LnJlc3VsdC5wYXR0ZXJuO1xuICAgIHB0biA9IGV4ZWN0ZW1wbGF0ZS5leHBhbmRUZW1wbGF0ZShvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0LCBwdG4pO1xuICAgIC8qICAgIE9iamVjdC5rZXlzKG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgICAgICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKCd7JyArIHNLZXkgKyAnfScsICdnJylcbiAgICAgICAgICBwdG4gPSBwdG4ucmVwbGFjZShyZWdleCwgb01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dFtzS2V5XSlcbiAgICAgICAgICBwdG4gPSBwdG4ucmVwbGFjZShyZWdleCwgb01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dFtzS2V5XSlcbiAgICAgICAgfSlcbiAgICAgICAgKi9cbiAgICByZXR1cm4gcHRuO1xufVxuLypcbiAgZXhwb3J0IGZ1bmN0aW9uIGV4ZWN1dGVTdGFydHVwIChvTWVyZ2VkQ29udGV4dFJlc3VsdCkge1xuICAgIGlmIChvTWVyZ2VkQ29udGV4dFJlc3VsdC5yZXN1bHQudHlwZSA9PT0gJ1VSTCcpIHtcbiAgICAgIHZhciBwdG4gPSBleHBhbmRQYXJhbWV0ZXJzSW5VUkwob01lcmdlZENvbnRleHRSZXN1bHQpXG4gICAgICBleGVjLnN0YXJ0QnJvd3NlcihwdG4pXG4gICAgICByZXR1cm4gcHRuXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBzID0gKFwiRG9uJ3Qga25vdyBob3cgdG8gc3RhcnQgXCIgKyBvTWVyZ2VkQ29udGV4dFJlc3VsdC5yZXN1bHQudHlwZSArICdcXG4gZm9yIFwiJyArIG9NZXJnZWRDb250ZXh0UmVzdWx0LnF1ZXJ5ICsgJ1wiJylcbiAgICAgIGRlYnVnbG9nKHMpXG4gICAgICByZXR1cm4gc1xuICAgIH1cbiAgfVxuKi9cbmZ1bmN0aW9uIG5yTWF0Y2hlcyhhT2JqZWN0LCBvQ29udGV4dCkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhhT2JqZWN0KS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9Db250ZXh0LCBrZXkpKSB7XG4gICAgICAgICAgICBwcmV2ID0gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG59XG5mdW5jdGlvbiBuck5vTWF0Y2hlcyhhT2JqZWN0LCBvQ29udGV4dCkge1xuICAgIHZhciBub01hdGNoQSA9IE9iamVjdC5rZXlzKGFPYmplY3QpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XG4gICAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9Db250ZXh0LCBrZXkpKSB7XG4gICAgICAgICAgICBwcmV2ID0gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG4gICAgdmFyIG5vTWF0Y2hCID0gT2JqZWN0LmtleXMob0NvbnRleHQpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XG4gICAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGFPYmplY3QsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbiAgICByZXR1cm4gbm9NYXRjaEEgKyBub01hdGNoQjtcbn1cbmZ1bmN0aW9uIHNhbWVPclN0YXIoczEsIHMyLCBvRW50aXR5KSB7XG4gICAgcmV0dXJuIHMxID09PSBzMiB8fFxuICAgICAgICAoczEgPT09IHVuZGVmaW5lZCAmJiBzMiA9PT0gbnVsbCkgfHxcbiAgICAgICAgKChzMiBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgczIuZXhlYyhzMSkgIT09IG51bGwpIHx8XG4gICAgICAgICgodHlwZW9mIHMyID09PSAnZnVuY3Rpb24nICYmIHMxKSAmJiBzMihzMSwgb0VudGl0eSkpO1xufVxuZnVuY3Rpb24gc2FtZU9yU3RhckVtcHR5KHMxLCBzMiwgb0VudGl0eSkge1xuICAgIGlmIChzMSA9PT0gdW5kZWZpbmVkICYmIHMyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChzMiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gczEgPT09IHMyIHx8XG4gICAgICAgICgoczIgaW5zdGFuY2VvZiBSZWdFeHApICYmIHMyLmV4ZWMoczEpICE9PSBudWxsKSB8fFxuICAgICAgICAoKHR5cGVvZiBzMiA9PT0gJ2Z1bmN0aW9uJyAmJiBzMSkgJiYgczIoczEsIG9FbnRpdHkpKTtcbn1cbmZ1bmN0aW9uIGZpbHRlclNob3dFbnRpdHlPbGQob0NvbnRleHQsIGFTaG93RW50aXR5KSB7XG4gICAgdmFyIGFGaWx0ZXJlZDtcbiAgICBPYmplY3Qua2V5cyhvQ29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xuICAgICAgICBpZiAob0NvbnRleHRbc0tleV0gPT09IG51bGwpIHtcbiAgICAgICAgICAgIG9Db250ZXh0W3NLZXldID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgLy8gZmlsdGVyIGNvbnRleHQsIGFtZW5kaW5nIHN5bm9ueW1zXG4gICAgYUZpbHRlcmVkID0gYVNob3dFbnRpdHkuZmlsdGVyKGZ1bmN0aW9uIChvU2hvd0VudGl0eSkge1xuICAgICAgICAvLyAgICAgICBjb25zb2xlLmxvZyhcIi4uLlwiKVxuICAgICAgICAvLyAgICAgIGNvbnNvbGUubG9nKG9TaG93RW50aXR5LmNvbnRleHQudG9vbCArIFwiIFwiICsgb0NvbnRleHQudG9vbCArIFwiXFxuXCIpXG4gICAgICAgIC8vICAgICAgY29uc29sZS5sb2cob1Nob3dFbnRpdHkuY29udGV4dC5jbGllbnQgKyBcIiBcIiArIG9Db250ZXh0LmNsaWVudCArXCI6XCIgKyBzYW1lT3JTdGFyKG9Db250ZXh0LmNsaWVudCxvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCkgKyBcIlxcblwiKVxuICAgICAgICAvLyAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkob1Nob3dFbnRpdHkuY29udGV4dCkgKyBcIlxcblwiICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHQuY2xpZW50KSArIFwiXFxuXCIpXG4gICAgICAgIHJldHVybiBzYW1lT3JTdGFyKG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtSWQsIG9Db250ZXh0LnN5c3RlbUlkLCBvQ29udGV4dCkgJiZcbiAgICAgICAgICAgIHNhbWVPclN0YXIob0NvbnRleHQudG9vbCwgb1Nob3dFbnRpdHkuY29udGV4dC50b29sLCBvQ29udGV4dCkgJiZcbiAgICAgICAgICAgIHNhbWVPclN0YXIob0NvbnRleHQuY2xpZW50LCBvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCwgb0NvbnRleHQpICYmXG4gICAgICAgICAgICBzYW1lT3JTdGFyRW1wdHkob0NvbnRleHQuc3lzdGVtT2JqZWN0Q2F0ZWdvcnksIG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtT2JqZWN0Q2F0ZWdvcnksIG9Db250ZXh0KSAmJlxuICAgICAgICAgICAgc2FtZU9yU3RhckVtcHR5KG9Db250ZXh0LnN5c3RlbU9iamVjdElkLCBvU2hvd0VudGl0eS5jb250ZXh0LnN5c3RlbU9iamVjdElkLCBvQ29udGV4dCk7XG4gICAgICAgIC8vICAgICAgJiYgb1Nob3dFbnRpdHkuY29udGV4dC50b29sID09PSBvQ29udGV4dC50b29sXG4gICAgfSk7XG4gICAgLy8gIGNvbnNvbGUubG9nKGFGaWx0ZXJlZC5sZW5ndGgpXG4gICAgLy8gbWF0Y2ggb3RoZXIgY29udGV4dCBwYXJhbWV0ZXJzXG4gICAgYUZpbHRlcmVkLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgdmFyIG5yTWF0Y2hlc0EgPSBuck1hdGNoZXMoYS5jb250ZXh0LCBvQ29udGV4dCk7XG4gICAgICAgIHZhciBuck1hdGNoZXNCID0gbnJNYXRjaGVzKGIuY29udGV4dCwgb0NvbnRleHQpO1xuICAgICAgICB2YXIgbnJOb01hdGNoZXNBID0gbnJOb01hdGNoZXMoYS5jb250ZXh0LCBvQ29udGV4dCk7XG4gICAgICAgIHZhciBuck5vTWF0Y2hlc0IgPSBuck5vTWF0Y2hlcyhiLmNvbnRleHQsIG9Db250ZXh0KTtcbiAgICAgICAgLy8gICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhLmNvbnRleHQpKVxuICAgICAgICAvLyAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGIuY29udGV4dCkpXG4gICAgICAgIC8vICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkob0NvbnRleHQpKVxuICAgICAgICB2YXIgcmVzID0gLShuck1hdGNoZXNBIC0gbnJNYXRjaGVzQikgKiAxMDAgKyAobnJOb01hdGNoZXNBIC0gbnJOb01hdGNoZXNCKTtcbiAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKFwiZGlmZiBcIiArIHJlcylcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9KTtcbiAgICBpZiAoYUZpbHRlcmVkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBkZWJ1Z2xvZygnbm8gdGFyZ2V0IGZvciBzaG93RW50aXR5ICcgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dCkpO1xuICAgIH1cbiAgICAvLyBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhRmlsdGVyZWQsdW5kZWZpbmVkLDIpKVxuICAgIGlmIChhRmlsdGVyZWRbMF0pIHtcbiAgICAgICAgLy8gZXhlY3V0ZSBhbGwgZnVuY3Rpb25zXG4gICAgICAgIHZhciBvTWF0Y2ggPSBhRmlsdGVyZWRbMF07XG4gICAgICAgIHZhciBvTWVyZ2VkID0ge1xuICAgICAgICAgICAgY29udGV4dDoge31cbiAgICAgICAgfTtcbiAgICAgICAgb01lcmdlZC5jb250ZXh0ID0gQW55T2JqZWN0LmFzc2lnbih7fSwgb01lcmdlZC5jb250ZXh0LCBhRmlsdGVyZWRbMF0uY29udGV4dCwgb0NvbnRleHQpO1xuICAgICAgICBvTWVyZ2VkID0gQW55T2JqZWN0LmFzc2lnbihvTWVyZ2VkLCB7XG4gICAgICAgICAgICByZXN1bHQ6IGFGaWx0ZXJlZFswXS5yZXN1bHRcbiAgICAgICAgfSk7XG4gICAgICAgIE9iamVjdC5rZXlzKG9NYXRjaC5jb250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9NYXRjaC5jb250ZXh0W3NLZXldID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgZGVidWdsb2coJ05vdyByZXRyb2ZpdHRpbmcgOicgKyBzS2V5ICsgJyAtICcgKyBvQ29udGV4dFtzS2V5XSk7XG4gICAgICAgICAgICAgICAgb01lcmdlZCA9IG9NYXRjaC5jb250ZXh0W3NLZXldKG9Db250ZXh0W3NLZXldLCBvTWVyZ2VkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBvTWVyZ2VkO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cbi8qXG5cbmltcG9ydCB7SW5wdXRGaWx0ZXIgYXMgaW5wdXRGaWx0ZXJ9IGZyb20gJ2Fib3RfZXJiYXNlJztcblxuICBmdW5jdGlvbiBmaWx0ZXJTaG93RW50aXR5IChvQ29udGV4dCwgYVNob3dFbnRpdHlBY3Rpb25zKSB7XG4gICAgT2JqZWN0LmtleXMob0NvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgIGlmIChvQ29udGV4dFtzS2V5XSA9PT0gbnVsbCkge1xuICAgICAgICBkZWxldGUgb0NvbnRleHRbc0tleV1cbiAgICAgIH1cbiAgICB9KVxuICAgIHZhciByZXMgPSBpbnB1dEZpbHRlci5hcHBseVJ1bGVzUGlja0ZpcnN0KG9Db250ZXh0KTtcbiAgICBpZiAoIXJlcykge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZFxuICAgIH1cbiAgICBkZWJ1Z2xvZyhcIioqIGFmdGVyIGZpbHRlciBydWxlc1wiICsgSlNPTi5zdHJpbmdpZnkocmVzLCB1bmRlZmluZWQsIDIpKVxuICAgIHJldHVybiBmaWx0ZXJTaG93RW50aXR5T2xkKHJlcyxhU2hvd0VudGl0eUFjdGlvbnMpO1xuICB9XG4qL1xuLypcbiAgZnVuY3Rpb24gZXhlY1Nob3dFbnRpdHkgKG9FbnRpdHkpIHtcbiAgICB2YXIgbWVyZ2VkID0gZmlsdGVyU2hvd0VudGl0eShvRW50aXR5LCBhU2hvd0VudGl0eUFjdGlvbnMpXG4gICAgaWYgKG1lcmdlZCkge1xuICAgICAgcmV0dXJuIGV4ZWN1dGVTdGFydHVwKG1lcmdlZClcbiAgICB9XG4gICAgcmV0dXJuIG51bGxcbiAgfVxuKi9cbi8vIEU6XFxwcm9qZWN0c1xcbm9kZWpzXFxib3RidWlsZGVyXFxzYW1wbGVib3Q+XCIlUHJvZ3JhbUZpbGVzKHg4NiklXFxHb29nbGVcXENocm9tZVxcQXBwbGljYXRpb25cXGNocm9tZS5leGVcIiAtLWluY29nbml0byAtdXJsIHd3dy5zcGllZ2VsLmRlXG5leHBvcnRzLmRpc3BhdGNoZXIgPSB7XG4gICAgLy8gICAgZXhlY1Nob3dFbnRpdHk6IGV4ZWNTaG93RW50aXR5LFxuICAgIF90ZXN0OiB7XG4gICAgICAgIHNhbWVPclN0YXI6IHNhbWVPclN0YXIsXG4gICAgICAgIG5yTWF0Y2hlczogbnJNYXRjaGVzLFxuICAgICAgICBuck5vTWF0Y2hlczogbnJOb01hdGNoZXMsXG4gICAgICAgIGV4cGFuZFBhcmFtZXRlcnNJblVSTDogZXhwYW5kUGFyYW1ldGVyc0luVVJMLFxuICAgICAgICAvLyAgICBmaWx0ZXJTaG93RW50aXR5OiBmaWx0ZXJTaG93RW50aXR5LFxuICAgICAgICAvLyAgZm5GaW5kVW5pdFRlc3Q6IGZuRmluZFVuaXRUZXN0LFxuICAgICAgICBjYWxjRGlzdGFuY2U6IGNhbGNEaXN0YW5jZSxcbiAgICAgICAgX2FTaG93RW50aXR5QWN0aW9uczogYVNob3dFbnRpdHlBY3Rpb25zXG4gICAgfVxufTtcbi8vZXhwb3J0cyBkaXNwYXRjaGVyO1xuLy9tb2R1bGUuZXhwb3J0cyA9IGRpc3BhdGNoZXJcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
