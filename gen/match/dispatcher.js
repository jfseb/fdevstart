/// <reference path="../../lib/node-4.d.ts" />
"use strict";

var distance = require('../utils/damerauLevenshtein');
var debug = require('debug');
var debuglog = debug('dispatcher');
var child_process_1 = require('child_process');
//  var exec = require('child_process').exec
//  var leven = require('../utils/damerauLevenshtein.js').levenshtein
//var leven = require('../utils/damerauLevenshtein.js')
var matchdata = require('./matchdata');
var oUnitTests = matchdata.oUnitTests;
var oWikis = [{
    key: 'FCC ABAP Alignment',
    context: {
        systemObjectId: 'UI2 Support page',
        path: '/unifiedshell/display/FCC+ABAP+Alignment'
    }
}, {
    key: 'UI2 test links',
    context: {
        systemObjectId: 'UI2 test links',
        path: 'wiki/display/unifiedshell/Adaption+to+UI5+QUnit+Test+Runner'
    }
}, {
    key: 'Support schedule',
    context: {
        systemObjectId: 'TIP Core UI Integration support',
        path: 'wiki/display/TIPCoreUII/Support'
    }
}, {
    key: 'UII Support schedule',
    context: {
        systemObjectId: 'TIP Core UI Integration support',
        path: 'wiki/display/TIPCoreUII/Support'
    }
}, {
    key: 'Support page',
    context: {
        systemObjectId: 'CA-UI2-INT-FE support',
        path: 'wiki/display/UICEI/CSS+Message+Dispatching+-+component+CA-UI2-INT-FE'
    }
}, {
    key: 'UI2 Support page',
    context: {
        systemObjectId: 'CA-UI2-INT-FE support',
        path: 'wiki/display/UICEI/CSS+Message+Dispatching+-+component+CA-UI2-INT-FE'
    }
}, {
    key: 'Backend Sprint Reviews',
    context: {
        systemObjectId: 'Backend Sprint Review',
        path: 'wiki/display/UICEI/Tact+Overviews'
    }
}, {
    key: 'UI5 patch schedule',
    context: {
        systemObjectId: 'UI5 UI2 Pach plan',
        path: 'wiki/pages/viewpage.action?pageId=1679623157'
    }
}];
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
            console.error('exec error: ' + error);
            return;
        }
        debuglog('stdout: ' + stdout);
        debuglog('stderr: ' + stderr);
    });
}
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9tYXRjaC9kaXNwYXRjaGVyLnRzIiwibWF0Y2gvZGlzcGF0Y2hlci5qcyJdLCJuYW1lcyI6WyJkaXN0YW5jZSIsInJlcXVpcmUiLCJkZWJ1ZyIsImRlYnVnbG9nIiwiY2hpbGRfcHJvY2Vzc18xIiwibWF0Y2hkYXRhIiwib1VuaXRUZXN0cyIsIm9XaWtpcyIsImtleSIsImNvbnRleHQiLCJzeXN0ZW1PYmplY3RJZCIsInBhdGgiLCJjYWxjRGlzdGFuY2UiLCJzVGV4dDEiLCJzVGV4dDIiLCJhMCIsImxldmVuc2h0ZWluIiwic3Vic3RyaW5nIiwibGVuZ3RoIiwiYSIsInRvTG93ZXJDYXNlIiwiZm5GaW5kTWF0Y2giLCJzS2V5d29yZCIsIm9Db250ZXh0Iiwib01hcCIsInNvcnQiLCJvRW50cnkxIiwib0VudHJ5MiIsInUxIiwidTIiLCJkaXN0IiwibzEiLCJPYmplY3QiLCJhc3NpZ24iLCJvMiIsImZuRmluZFVuaXRUZXN0Iiwic3N5c3RlbU9iamVjdElkIiwiZm5GaW5kV2lraSIsImFTaG93RW50aXR5QWN0aW9ucyIsInN5c3RlbUlkIiwiY2xpZW50Iiwic3lzdGVtdHlwZSIsInJlc3VsdCIsInR5cGUiLCJwYXR0ZXJuIiwic3lzdGVtT2JqZWN0Q2F0ZWdvcnkiLCJ0b29sIiwic3RhcnRCcm93c2VyIiwidXJsIiwiY21kIiwiZXhlYyIsImVycm9yIiwic3Rkb3V0Iiwic3RkZXJyIiwiY29uc29sZSIsImV4cGFuZFBhcmFtZXRlcnNJblVSTCIsIm9NZXJnZWRDb250ZXh0UmVzdWx0IiwicHRuIiwia2V5cyIsImZvckVhY2giLCJzS2V5IiwicmVnZXgiLCJSZWdFeHAiLCJyZXBsYWNlIiwiZXhlY3V0ZVN0YXJ0dXAiLCJzIiwicXVlcnkiLCJuck1hdGNoZXMiLCJhT2JqZWN0IiwicmVkdWNlIiwicHJldiIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiY2FsbCIsIm5yTm9NYXRjaGVzIiwibm9NYXRjaEEiLCJub01hdGNoQiIsInNhbWVPclN0YXIiLCJzMSIsInMyIiwib0VudGl0eSIsInVuZGVmaW5lZCIsInNhbWVPclN0YXJFbXB0eSIsImZpbHRlclNob3dFbnRpdHlPbGQiLCJhU2hvd0VudGl0eSIsImFGaWx0ZXJlZCIsImZpbHRlciIsIm9TaG93RW50aXR5IiwiYiIsIm5yTWF0Y2hlc0EiLCJuck1hdGNoZXNCIiwibnJOb01hdGNoZXNBIiwibnJOb01hdGNoZXNCIiwicmVzIiwiSlNPTiIsInN0cmluZ2lmeSIsIm9NYXRjaCIsIm9NZXJnZWQiLCJpbnB1dEZpbHRlciIsImZpbHRlclNob3dFbnRpdHkiLCJhcHBseVJ1bGVzUGlja0ZpcnN0IiwiZXhlY1Nob3dFbnRpdHkiLCJtZXJnZWQiLCJleHBvcnRzIiwiZGlzcGF0Y2hlciIsIl90ZXN0IiwiX2FTaG93RW50aXR5QWN0aW9ucyJdLCJtYXBwaW5ncyI6IkFBQUE7QUNDQTs7QURFQSxJQUFZQSxXQUFRQyxRQUFNLDZCQUFOLENBQXBCO0FBRUEsSUFBWUMsUUFBS0QsUUFBTSxPQUFOLENBQWpCO0FBRUEsSUFBTUUsV0FBV0QsTUFBTSxZQUFOLENBQWpCO0FBRUEsSUFBQUUsa0JBQUFILFFBQXFCLGVBQXJCLENBQUE7QUFDQTtBQUNBO0FBR0U7QUFDRixJQUFZSSxZQUFTSixRQUFNLGFBQU4sQ0FBckI7QUFFQSxJQUFNSyxhQUFhRCxVQUFVQyxVQUE3QjtBQUVFLElBQUlDLFNBQVMsQ0FDWDtBQUNFQyxTQUFLLG9CQURQO0FBRUVDLGFBQVM7QUFDUEMsd0JBQWdCLGtCQURUO0FBRVBDLGNBQU07QUFGQztBQUZYLENBRFcsRUFRWDtBQUNFSCxTQUFLLGdCQURQO0FBRUVDLGFBQVM7QUFDUEMsd0JBQWdCLGdCQURUO0FBRVBDLGNBQU07QUFGQztBQUZYLENBUlcsRUFlWDtBQUNFSCxTQUFLLGtCQURQO0FBRUVDLGFBQVM7QUFDUEMsd0JBQWdCLGlDQURUO0FBRVBDLGNBQU07QUFGQztBQUZYLENBZlcsRUFzQlg7QUFDRUgsU0FBSyxzQkFEUDtBQUVFQyxhQUFTO0FBQ1BDLHdCQUFnQixp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QkFBYUEsV0FIUjtBQUlMbkIsK0JBQXVCQSxxQkFKbEI7QUFLTDRDLDBCQUFrQkEsZ0JBTGI7QUFNTGhFLHdCQUFnQkEsY0FOWDtBQU9MdkIsc0JBQWNBLFlBUFQ7QUFRTDhGLDZCQUFxQnBFO0FBUmhCO0FBRmlCLENBQWI7QUFjYjtBQUVBIiwiZmlsZSI6Im1hdGNoL2Rpc3BhdGNoZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi4vLi4vbGliL25vZGUtNC5kLnRzXCIgLz5cclxuXHJcblxyXG5pbXBvcnQgKiBhcyBkaXN0YW5jZSBmcm9tICcuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4nO1xyXG5cclxuaW1wb3J0ICogYXMgZGVidWcgZnJvbSAnZGVidWcnO1xyXG5cclxuY29uc3QgZGVidWdsb2cgPSBkZWJ1ZygnZGlzcGF0Y2hlcicpXHJcblxyXG5pbXBvcnQgeyBleGVjIH0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XHJcbi8vICB2YXIgZXhlYyA9IHJlcXVpcmUoJ2NoaWxkX3Byb2Nlc3MnKS5leGVjXHJcbi8vICB2YXIgbGV2ZW4gPSByZXF1aXJlKCcuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4uanMnKS5sZXZlbnNodGVpblxyXG5cclxuXHJcbiAgLy92YXIgbGV2ZW4gPSByZXF1aXJlKCcuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4uanMnKVxyXG5pbXBvcnQgKiBhcyBtYXRjaGRhdGEgZnJvbSAnLi9tYXRjaGRhdGEnO1xyXG5cclxuY29uc3Qgb1VuaXRUZXN0cyA9IG1hdGNoZGF0YS5vVW5pdFRlc3RzXHJcblxyXG4gIHZhciBvV2lraXMgPSBbXHJcbiAgICB7XHJcbiAgICAgIGtleTogJ0ZDQyBBQkFQIEFsaWdubWVudCcsXHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ1VJMiBTdXBwb3J0IHBhZ2UnLFxyXG4gICAgICAgIHBhdGg6ICcvdW5pZmllZHNoZWxsL2Rpc3BsYXkvRkNDK0FCQVArQWxpZ25tZW50J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBrZXk6ICdVSTIgdGVzdCBsaW5rcycsXHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ1VJMiB0ZXN0IGxpbmtzJyxcclxuICAgICAgICBwYXRoOiAnd2lraS9kaXNwbGF5L3VuaWZpZWRzaGVsbC9BZGFwdGlvbit0bytVSTUrUVVuaXQrVGVzdCtSdW5uZXInXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGtleTogJ1N1cHBvcnQgc2NoZWR1bGUnLFxyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdUSVAgQ29yZSBVSSBJbnRlZ3JhdGlvbiBzdXBwb3J0JyxcclxuICAgICAgICBwYXRoOiAnd2lraS9kaXNwbGF5L1RJUENvcmVVSUkvU3VwcG9ydCdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAga2V5OiAnVUlJIFN1cHBvcnQgc2NoZWR1bGUnLFxyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdUSVAgQ29yZSBVSSBJbnRlZ3JhdGlvbiBzdXBwb3J0JyxcclxuICAgICAgICBwYXRoOiAnd2lraS9kaXNwbGF5L1RJUENvcmVVSUkvU3VwcG9ydCdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAga2V5OiAnU3VwcG9ydCBwYWdlJyxcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiAnQ0EtVUkyLUlOVC1GRSBzdXBwb3J0JyxcclxuICAgICAgICBwYXRoOiAnd2lraS9kaXNwbGF5L1VJQ0VJL0NTUytNZXNzYWdlK0Rpc3BhdGNoaW5nKy0rY29tcG9uZW50K0NBLVVJMi1JTlQtRkUnXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGtleTogJ1VJMiBTdXBwb3J0IHBhZ2UnLFxyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdDQS1VSTItSU5ULUZFIHN1cHBvcnQnLFxyXG4gICAgICAgIHBhdGg6ICd3aWtpL2Rpc3BsYXkvVUlDRUkvQ1NTK01lc3NhZ2UrRGlzcGF0Y2hpbmcrLStjb21wb25lbnQrQ0EtVUkyLUlOVC1GRSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAga2V5OiAnQmFja2VuZCBTcHJpbnQgUmV2aWV3cycsXHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ0JhY2tlbmQgU3ByaW50IFJldmlldycsXHJcbiAgICAgICAgcGF0aDogJ3dpa2kvZGlzcGxheS9VSUNFSS9UYWN0K092ZXJ2aWV3cydcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAga2V5OiAnVUk1IHBhdGNoIHNjaGVkdWxlJyxcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiAnVUk1IFVJMiBQYWNoIHBsYW4nLFxyXG4gICAgICAgIHBhdGg6ICd3aWtpL3BhZ2VzL3ZpZXdwYWdlLmFjdGlvbj9wYWdlSWQ9MTY3OTYyMzE1NydcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIF1cclxuXHJcbiAgZnVuY3Rpb24gY2FsY0Rpc3RhbmNlIChzVGV4dDEsIHNUZXh0Mikge1xyXG4gICAgLy8gY29uc29sZS5sb2coXCJsZW5ndGgyXCIgKyBzVGV4dDEgKyBcIiAtIFwiICsgc1RleHQyKVxyXG4gICAgdmFyIGEwID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnN1YnN0cmluZygwLCBzVGV4dDIubGVuZ3RoKSwgc1RleHQyKVxyXG4gICAgdmFyIGEgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEudG9Mb3dlckNhc2UoKSwgc1RleHQyKVxyXG4gICAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGFcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGZuRmluZE1hdGNoIChzS2V5d29yZCwgb0NvbnRleHQsIG9NYXApIHtcclxuICAgIC8vIHJldHVybiBhIGJldHRlciBjb250ZXh0IGlmIHRoZXJlIGlzIGEgbWF0Y2hcclxuICAgIG9NYXAuc29ydChmdW5jdGlvbiAob0VudHJ5MSwgb0VudHJ5Mikge1xyXG4gICAgICB2YXIgdTEgPSBjYWxjRGlzdGFuY2Uob0VudHJ5MS5rZXkudG9Mb3dlckNhc2UoKSwgc0tleXdvcmQpXHJcbiAgICAgIHZhciB1MiA9IGNhbGNEaXN0YW5jZShvRW50cnkyLmtleS50b0xvd2VyQ2FzZSgpLCBzS2V5d29yZClcclxuICAgICAgcmV0dXJuIHUxIC0gdTJcclxuICAgIH0pXHJcbiAgICAvLyBsYXRlcjogaW4gY2FzZSBvZiBjb25mbGljdHMsIGFzayxcclxuICAgIC8vIG5vdzpcclxuICAgIHZhciBkaXN0ID0gY2FsY0Rpc3RhbmNlKG9NYXBbMF0ua2V5LnRvTG93ZXJDYXNlKCksIHNLZXl3b3JkKVxyXG4gICAgZGVidWdsb2coJ2Jlc3QgZGlzdCcgKyBkaXN0ICsgJyAvICAnICsgZGlzdCAqIHNLZXl3b3JkLmxlbmd0aCArICcgJyArIHNLZXl3b3JkKVxyXG4gICAgaWYgKGRpc3QgPCAxNTApIHtcclxuICAgICAgdmFyIG8xID0gT2JqZWN0LmFzc2lnbih7fSwgb0NvbnRleHQpXHJcbiAgICAgIHZhciBvMlxyXG4gICAgICBvMS5jb250ZXh0ID0gT2JqZWN0LmFzc2lnbih7fSwgbzEuY29udGV4dClcclxuICAgICAgbzIgPSBvMVxyXG4gICAgICBvMi5jb250ZXh0ID0gT2JqZWN0LmFzc2lnbihvMS5jb250ZXh0LCBvTWFwWzBdLmNvbnRleHQpXHJcbiAgICAgIHJldHVybiBvMlxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG51bGxcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIGEgZnVuY3Rpb24gdG8gbWF0Y2ggYSB1bml0IHRlc3QgdXNpbmcgbGV2ZW5zaHRlaW4gZGlzdGFuY2VzXHJcbiAgICogQHB1YmxpY1xyXG4gICAqL1xyXG4gIGZ1bmN0aW9uIGZuRmluZFVuaXRUZXN0IChzc3lzdGVtT2JqZWN0SWQsIG9Db250ZXh0KSB7XHJcbiAgICByZXR1cm4gZm5GaW5kTWF0Y2goc3N5c3RlbU9iamVjdElkLCBvQ29udGV4dCwgb1VuaXRUZXN0cylcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGZuRmluZFdpa2kgKHNLZXl3b3JkLCBvQ29udGV4dCkge1xyXG4gICAgcmV0dXJuIGZuRmluZE1hdGNoKHNLZXl3b3JkLCBvQ29udGV4dCwgb1dpa2lzKVxyXG4gIH1cclxuXHJcbiAgdmFyIGFTaG93RW50aXR5QWN0aW9ucyA9IFtcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbUlkOiAndXYyJyxcclxuICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcclxuICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHAnXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1djIud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3VpMi91c2hlbGwvc2hlbGxzL2FiYXAvRmlvcmlMYXVuY2hwYWQuaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtSWQ6ICd1djInLFxyXG4gICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxyXG4gICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscGQnXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1djIud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3NhcC9hcnNydmNfdXBiX2FkbW4vbWFpbi5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICB7XHJcbiAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICBzeXN0ZW1JZDogJ3UxeScsXHJcbiAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXHJcbiAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwJ1xyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdTF5LndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS91aTIvdXNoZWxsL3NoZWxscy9hYmFwL0Zpb3JpTGF1bmNocGFkLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbUlkOiAndTF5JyxcclxuICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcclxuICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHBkJ1xyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdTF5LndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS9zYXAvYXJzcnZjX3VwYl9hZG1uL21haW4uaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtSWQ6ICd1djInLFxyXG4gICAgICAgIGNsaWVudDogJzEyMCcsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0Q2F0ZWdvcnk6ICdmaW9yaSBjYXRhbG9nJyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogLy4qLyxcclxuICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXHJcbiAgICAgICAgdG9vbDogJ0ZMUEQnXHJcbiAgICAgIH0sXHJcbiAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgIHR5cGU6ICdVUkwnLFxyXG4gICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1djIud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3NhcC9hcnNydmNfdXBiX2FkbW4vbWFpbi5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0jQ0FUQUxPRzp7c3lzdGVtT2JqZWN0SWR9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtT2JqZWN0Q2F0ZWdvcnk6ICd1bml0JyxcclxuICAgICAgICBzeXN0ZW1PYmplY3RJZDogZm5GaW5kVW5pdFRlc3RcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MC97cGF0aH0nXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtT2JqZWN0Q2F0ZWdvcnk6ICd1bml0IHRlc3QnLFxyXG4gICAgICAgIHN5c3RlbU9iamVjdElkOiBmbkZpbmRVbml0VGVzdFxyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cDovL2xvY2FsaG9zdDo4MDgwL3twYXRofSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHtcclxuICAgICAgY29udGV4dDoge1xyXG4gICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAnd2lraScsXHJcbiAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IGZuRmluZFdpa2lcclxuICAgICAgfSxcclxuICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgdHlwZTogJ1VSTCcsXHJcbiAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vd2lraS53ZGYuc2FwLmNvcnAve3BhdGh9J1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAge1xyXG4gICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgc3lzdGVtSWQ6ICdKSVJBJ1xyXG4gICAgICB9LFxyXG4gICAgICByZXN1bHQ6IHtcclxuICAgICAgICB0eXBlOiAnVVJMJyxcclxuICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9qaXJhLndkZi5zYXAuY29ycDo4MDgwL1RJUENPUkVVSUlJJ1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgXVxyXG5cclxuICAvLyBpZiBUT09MID0gSklSQSB8fCBTeXN0ZW1JZCA9IEpJUkEgLT4gU3lzdGVtSWQgPSBKSVJBXHJcbiAgLy9cclxuICAvL1xyXG5cclxuICBmdW5jdGlvbiBzdGFydEJyb3dzZXIgKHVybCkge1xyXG4gICAgdmFyIGNtZCA9XHJcbiAgICAnXCIlUHJvZ3JhbUZpbGVzKHg4NiklXFxcXEdvb2dsZVxcXFxDaHJvbWVcXFxcQXBwbGljYXRpb25cXFxcY2hyb21lLmV4ZVwiIC0taW5jb2duaXRvIC11cmwgXCInICsgdXJsICsgJ1wiJ1xyXG4gICAgZXhlYyhjbWQsIGZ1bmN0aW9uIChlcnJvciwgc3Rkb3V0LCBzdGRlcnIpIHtcclxuICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihgZXhlYyBlcnJvcjogJHtlcnJvcn1gKVxyXG4gICAgICAgIHJldHVyblxyXG4gICAgICB9XHJcbiAgICAgIGRlYnVnbG9nKGBzdGRvdXQ6ICR7c3Rkb3V0fWApXHJcbiAgICAgIGRlYnVnbG9nKGBzdGRlcnI6ICR7c3RkZXJyfWApXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgLy8gc3RhcnRTQVBHVUlcclxuXHJcbiAgLy8gICBOOlxcPlwiYzpcXFByb2dyYW0gRmlsZXMgKHg4NilcXFNBUFxcRnJvbnRFbmRcXFNBUGd1aVwiXFxzYXBzaGN1dC5leGUgIC1zeXN0ZW09VVYyIC1jbGllbnQ9MTIwIC1jb21tYW5kPVNFMzggLXR5cGU9VHJhbnNhY3Rpb24gLXVzZXI9QVVTRVJcclxuXHJcbiAgZnVuY3Rpb24gZXhwYW5kUGFyYW1ldGVyc0luVVJMIChvTWVyZ2VkQ29udGV4dFJlc3VsdCkge1xyXG4gICAgdmFyIHB0biA9IG9NZXJnZWRDb250ZXh0UmVzdWx0LnJlc3VsdC5wYXR0ZXJuXHJcbiAgICBPYmplY3Qua2V5cyhvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XHJcbiAgICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoJ3snICsgc0tleSArICd9JywgJ2cnKVxyXG4gICAgICBwdG4gPSBwdG4ucmVwbGFjZShyZWdleCwgb01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dFtzS2V5XSlcclxuICAgICAgcHRuID0gcHRuLnJlcGxhY2UocmVnZXgsIG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHRbc0tleV0pXHJcbiAgICB9KVxyXG4gICAgcmV0dXJuIHB0blxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZXhlY3V0ZVN0YXJ0dXAgKG9NZXJnZWRDb250ZXh0UmVzdWx0KSB7XHJcbiAgICBpZiAob01lcmdlZENvbnRleHRSZXN1bHQucmVzdWx0LnR5cGUgPT09ICdVUkwnKSB7XHJcbiAgICAgIHZhciBwdG4gPSBleHBhbmRQYXJhbWV0ZXJzSW5VUkwob01lcmdlZENvbnRleHRSZXN1bHQpXHJcbiAgICAgIHN0YXJ0QnJvd3NlcihwdG4pXHJcbiAgICAgIHJldHVybiBwdG5cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHZhciBzID0gKFwiRG9uJ3Qga25vdyBob3cgdG8gc3RhcnQgXCIgKyBvTWVyZ2VkQ29udGV4dFJlc3VsdC5yZXN1bHQudHlwZSArICdcXG4gZm9yIFwiJyArIG9NZXJnZWRDb250ZXh0UmVzdWx0LnF1ZXJ5ICsgJ1wiJylcclxuICAgICAgZGVidWdsb2cocylcclxuICAgICAgcmV0dXJuIHNcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIG5yTWF0Y2hlcyAoYU9iamVjdCwgb0NvbnRleHQpIHtcclxuICAgIHJldHVybiBPYmplY3Qua2V5cyhhT2JqZWN0KS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xyXG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9Db250ZXh0LCBrZXkpKSB7XHJcbiAgICAgICAgcHJldiA9IHByZXYgKyAxXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHByZXZcclxuICAgIH0sIDApXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBuck5vTWF0Y2hlcyAoYU9iamVjdCwgb0NvbnRleHQpIHtcclxuICAgIHZhciBub01hdGNoQSA9IE9iamVjdC5rZXlzKGFPYmplY3QpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XHJcbiAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9Db250ZXh0LCBrZXkpKSB7XHJcbiAgICAgICAgcHJldiA9IHByZXYgKyAxXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHByZXZcclxuICAgIH0sIDApXHJcbiAgICB2YXIgbm9NYXRjaEIgPSBPYmplY3Qua2V5cyhvQ29udGV4dCkucmVkdWNlKGZ1bmN0aW9uIChwcmV2LCBrZXkpIHtcclxuICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYU9iamVjdCwga2V5KSkge1xyXG4gICAgICAgIHByZXYgPSBwcmV2ICsgMVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBwcmV2XHJcbiAgICB9LCAwKVxyXG4gICAgcmV0dXJuIG5vTWF0Y2hBICsgbm9NYXRjaEJcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIHNhbWVPclN0YXIgKHMxIDogc3RyaW5nLCBzMiA6IHN0cmluZyB8IFJlZ0V4cCB8IEZ1bmN0aW9uICwgb0VudGl0eSkge1xyXG4gICAgcmV0dXJuIHMxID09PSBzMiB8fFxyXG4gICAgICAoczEgPT09IHVuZGVmaW5lZCAmJiBzMiA9PT0gbnVsbCkgfHxcclxuICAgICAgKChzMiBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgczIuZXhlYyhzMSkgIT09IG51bGwpIHx8XHJcbiAgICAgICgodHlwZW9mIHMyID09PSAnZnVuY3Rpb24nICYmIHMxKSAmJiBzMihzMSwgb0VudGl0eSkpXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBzYW1lT3JTdGFyRW1wdHkgKHMxIDogc3RyaW5nLCBzMiA6IHN0cmluZyB8IFJlZ0V4cCB8IEZ1bmN0aW9uLCBvRW50aXR5KSB7XHJcbiAgICBpZiAoczEgPT09IHVuZGVmaW5lZCAmJiBzMiA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9XHJcbiAgICBpZiAoczIgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBzMSA9PT0gczIgfHxcclxuICAgICAgKChzMiBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgczIuZXhlYyhzMSkgIT09IG51bGwpIHx8XHJcbiAgICAgICgodHlwZW9mIHMyID09PSAnZnVuY3Rpb24nICYmIHMxKSAmJiBzMihzMSwgb0VudGl0eSkpXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBmaWx0ZXJTaG93RW50aXR5T2xkIChvQ29udGV4dCwgYVNob3dFbnRpdHkpIHtcclxuICAgIHZhciBhRmlsdGVyZWRcclxuICAgIE9iamVjdC5rZXlzKG9Db250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XHJcbiAgICAgIGlmIChvQ29udGV4dFtzS2V5XSA9PT0gbnVsbCkge1xyXG4gICAgICAgIG9Db250ZXh0W3NLZXldID0gdW5kZWZpbmVkXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgICAvLyBmaWx0ZXIgY29udGV4dCwgYW1lbmRpbmcgc3lub255bXNcclxuXHJcblxyXG4gICAgYUZpbHRlcmVkID0gYVNob3dFbnRpdHkuZmlsdGVyKGZ1bmN0aW9uIChvU2hvd0VudGl0eSkge1xyXG4gICAgICAvLyAgICAgICBjb25zb2xlLmxvZyhcIi4uLlwiKVxyXG4gICAgICAvLyAgICAgIGNvbnNvbGUubG9nKG9TaG93RW50aXR5LmNvbnRleHQudG9vbCArIFwiIFwiICsgb0NvbnRleHQudG9vbCArIFwiXFxuXCIpXHJcbiAgICAgIC8vICAgICAgY29uc29sZS5sb2cob1Nob3dFbnRpdHkuY29udGV4dC5jbGllbnQgKyBcIiBcIiArIG9Db250ZXh0LmNsaWVudCArXCI6XCIgKyBzYW1lT3JTdGFyKG9Db250ZXh0LmNsaWVudCxvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCkgKyBcIlxcblwiKVxyXG4gICAgICAvLyAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkob1Nob3dFbnRpdHkuY29udGV4dCkgKyBcIlxcblwiICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHQuY2xpZW50KSArIFwiXFxuXCIpXHJcblxyXG4gICAgICByZXR1cm4gc2FtZU9yU3RhcihvU2hvd0VudGl0eS5jb250ZXh0LnN5c3RlbUlkLCBvQ29udGV4dC5zeXN0ZW1JZCwgb0NvbnRleHQpICYmXHJcbiAgICAgICAgc2FtZU9yU3RhcihvQ29udGV4dC50b29sLCBvU2hvd0VudGl0eS5jb250ZXh0LnRvb2wsIG9Db250ZXh0KSAmJlxyXG4gICAgICAgIHNhbWVPclN0YXIob0NvbnRleHQuY2xpZW50LCBvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCwgb0NvbnRleHQpICYmXHJcbiAgICAgICAgc2FtZU9yU3RhckVtcHR5KG9Db250ZXh0LnN5c3RlbU9iamVjdENhdGVnb3J5LCBvU2hvd0VudGl0eS5jb250ZXh0LnN5c3RlbU9iamVjdENhdGVnb3J5LCBvQ29udGV4dCkgJiZcclxuICAgICAgICBzYW1lT3JTdGFyRW1wdHkob0NvbnRleHQuc3lzdGVtT2JqZWN0SWQsIG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtT2JqZWN0SWQsIG9Db250ZXh0KVxyXG4gICAgLy8gICAgICAmJiBvU2hvd0VudGl0eS5jb250ZXh0LnRvb2wgPT09IG9Db250ZXh0LnRvb2xcclxuICAgIH0pXHJcbiAgICAvLyAgY29uc29sZS5sb2coYUZpbHRlcmVkLmxlbmd0aClcclxuICAgIC8vIG1hdGNoIG90aGVyIGNvbnRleHQgcGFyYW1ldGVyc1xyXG4gICAgYUZpbHRlcmVkLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcclxuICAgICAgdmFyIG5yTWF0Y2hlc0EgPSBuck1hdGNoZXMoYS5jb250ZXh0LCBvQ29udGV4dClcclxuICAgICAgdmFyIG5yTWF0Y2hlc0IgPSBuck1hdGNoZXMoYi5jb250ZXh0LCBvQ29udGV4dClcclxuICAgICAgdmFyIG5yTm9NYXRjaGVzQSA9IG5yTm9NYXRjaGVzKGEuY29udGV4dCwgb0NvbnRleHQpXHJcbiAgICAgIHZhciBuck5vTWF0Y2hlc0IgPSBuck5vTWF0Y2hlcyhiLmNvbnRleHQsIG9Db250ZXh0KVxyXG4gICAgICAvLyAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGEuY29udGV4dCkpXHJcbiAgICAgIC8vICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoYi5jb250ZXh0KSlcclxuICAgICAgLy8gICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShvQ29udGV4dCkpXHJcbiAgICAgIHZhciByZXMgPSAtKG5yTWF0Y2hlc0EgLSBuck1hdGNoZXNCKSAqIDEwMCArIChuck5vTWF0Y2hlc0EgLSBuck5vTWF0Y2hlc0IpXHJcbiAgICAgIC8vICAgICBjb25zb2xlLmxvZyhcImRpZmYgXCIgKyByZXMpXHJcbiAgICAgIHJldHVybiByZXNcclxuICAgIH0pXHJcbiAgICBpZiAoYUZpbHRlcmVkLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICBkZWJ1Z2xvZygnbm8gdGFyZ2V0IGZvciBzaG93RW50aXR5ICcgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dCkpXHJcbiAgICB9XHJcbiAgICAvLyBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhRmlsdGVyZWQsdW5kZWZpbmVkLDIpKVxyXG4gICAgaWYgKGFGaWx0ZXJlZFswXSkge1xyXG4gICAgICAvLyBleGVjdXRlIGFsbCBmdW5jdGlvbnNcclxuXHJcbiAgICAgIHZhciBvTWF0Y2ggPSBhRmlsdGVyZWRbMF1cclxuXHJcbiAgICAgIHZhciBvTWVyZ2VkID0ge1xyXG4gICAgICAgIGNvbnRleHQ6IHtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIG9NZXJnZWQuY29udGV4dCA9IE9iamVjdC5hc3NpZ24oe30sIG9NZXJnZWQuY29udGV4dCwgYUZpbHRlcmVkWzBdLmNvbnRleHQsIG9Db250ZXh0KVxyXG4gICAgICBvTWVyZ2VkID0gT2JqZWN0LmFzc2lnbihvTWVyZ2VkLCB7XHJcbiAgICAgICAgcmVzdWx0OiBhRmlsdGVyZWRbMF0ucmVzdWx0XHJcbiAgICAgIH0pXHJcblxyXG4gICAgICBPYmplY3Qua2V5cyhvTWF0Y2guY29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xyXG4gICAgICAgIGlmICh0eXBlb2Ygb01hdGNoLmNvbnRleHRbc0tleV0gPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgIGRlYnVnbG9nKCdOb3cgcmV0cm9maXR0aW5nIDonICsgc0tleSArICcgLSAnICsgb0NvbnRleHRbc0tleV0pXHJcbiAgICAgICAgICBvTWVyZ2VkID0gb01hdGNoLmNvbnRleHRbc0tleV0ob0NvbnRleHRbc0tleV0sIG9NZXJnZWQpXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG5cclxuICAgICAgcmV0dXJuIG9NZXJnZWRcclxuICAgIH1cclxuICAgIHJldHVybiBudWxsXHJcbiAgfVxyXG5cclxuXHJcbmltcG9ydCAqIGFzIGlucHV0RmlsdGVyIGZyb20gJy4vaW5wdXRGaWx0ZXInO1xyXG5cclxuICBmdW5jdGlvbiBmaWx0ZXJTaG93RW50aXR5IChvQ29udGV4dCwgYVNob3dFbnRpdHlBY3Rpb25zKSB7XHJcbiAgICBPYmplY3Qua2V5cyhvQ29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xyXG4gICAgICBpZiAob0NvbnRleHRbc0tleV0gPT09IG51bGwpIHtcclxuICAgICAgICBkZWxldGUgb0NvbnRleHRbc0tleV1cclxuICAgICAgfVxyXG4gICAgfSlcclxuICAgIHZhciByZXMgPSBpbnB1dEZpbHRlci5hcHBseVJ1bGVzUGlja0ZpcnN0KG9Db250ZXh0KTtcclxuICAgIGlmICghcmVzKSB7XHJcbiAgICAgIHJldHVybiB1bmRlZmluZWRcclxuICAgIH1cclxuICAgIGRlYnVnbG9nKFwiKiogYWZ0ZXIgZmlsdGVyIHJ1bGVzXCIgKyBKU09OLnN0cmluZ2lmeShyZXMsIHVuZGVmaW5lZCwgMikpXHJcbiAgICByZXR1cm4gZmlsdGVyU2hvd0VudGl0eU9sZChyZXMsYVNob3dFbnRpdHlBY3Rpb25zKTtcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGV4ZWNTaG93RW50aXR5IChvRW50aXR5KSB7XHJcbiAgICB2YXIgbWVyZ2VkID0gZmlsdGVyU2hvd0VudGl0eShvRW50aXR5LCBhU2hvd0VudGl0eUFjdGlvbnMpXHJcbiAgICBpZiAobWVyZ2VkKSB7XHJcbiAgICAgIHJldHVybiBleGVjdXRlU3RhcnR1cChtZXJnZWQpXHJcbiAgICB9XHJcbiAgICByZXR1cm4gbnVsbFxyXG4gIH1cclxuXHJcbiAgLy8gRTpcXHByb2plY3RzXFxub2RlanNcXGJvdGJ1aWxkZXJcXHNhbXBsZWJvdD5cIiVQcm9ncmFtRmlsZXMoeDg2KSVcXEdvb2dsZVxcQ2hyb21lXFxBcHBsaWNhdGlvblxcY2hyb21lLmV4ZVwiIC0taW5jb2duaXRvIC11cmwgd3d3LnNwaWVnZWwuZGVcclxuXHJcbiAgZXhwb3J0IGNvbnN0IGRpc3BhdGNoZXIgPSB7XHJcbiAgICBleGVjU2hvd0VudGl0eTogZXhlY1Nob3dFbnRpdHksXHJcbiAgICBfdGVzdDoge1xyXG4gICAgICBzYW1lT3JTdGFyOiBzYW1lT3JTdGFyLFxyXG4gICAgICBuck1hdGNoZXM6IG5yTWF0Y2hlcyxcclxuICAgICAgbnJOb01hdGNoZXM6IG5yTm9NYXRjaGVzLFxyXG4gICAgICBleHBhbmRQYXJhbWV0ZXJzSW5VUkw6IGV4cGFuZFBhcmFtZXRlcnNJblVSTCxcclxuICAgICAgZmlsdGVyU2hvd0VudGl0eTogZmlsdGVyU2hvd0VudGl0eSxcclxuICAgICAgZm5GaW5kVW5pdFRlc3Q6IGZuRmluZFVuaXRUZXN0LFxyXG4gICAgICBjYWxjRGlzdGFuY2U6IGNhbGNEaXN0YW5jZSxcclxuICAgICAgX2FTaG93RW50aXR5QWN0aW9uczogYVNob3dFbnRpdHlBY3Rpb25zXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvL2V4cG9ydHMgZGlzcGF0Y2hlcjtcclxuXHJcbiAgLy9tb2R1bGUuZXhwb3J0cyA9IGRpc3BhdGNoZXJcclxuXHJcbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCIuLi8uLi9saWIvbm9kZS00LmQudHNcIiAvPlxuXCJ1c2Ugc3RyaWN0XCI7XG5jb25zdCBkaXN0YW5jZSA9IHJlcXVpcmUoJy4uL3V0aWxzL2RhbWVyYXVMZXZlbnNodGVpbicpO1xuY29uc3QgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpO1xuY29uc3QgZGVidWdsb2cgPSBkZWJ1ZygnZGlzcGF0Y2hlcicpO1xuY29uc3QgY2hpbGRfcHJvY2Vzc18xID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpO1xuLy8gIHZhciBleGVjID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpLmV4ZWNcbi8vICB2YXIgbGV2ZW4gPSByZXF1aXJlKCcuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4uanMnKS5sZXZlbnNodGVpblxuLy92YXIgbGV2ZW4gPSByZXF1aXJlKCcuLi91dGlscy9kYW1lcmF1TGV2ZW5zaHRlaW4uanMnKVxuY29uc3QgbWF0Y2hkYXRhID0gcmVxdWlyZSgnLi9tYXRjaGRhdGEnKTtcbmNvbnN0IG9Vbml0VGVzdHMgPSBtYXRjaGRhdGEub1VuaXRUZXN0cztcbnZhciBvV2lraXMgPSBbXG4gICAge1xuICAgICAgICBrZXk6ICdGQ0MgQUJBUCBBbGlnbm1lbnQnLFxuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ1VJMiBTdXBwb3J0IHBhZ2UnLFxuICAgICAgICAgICAgcGF0aDogJy91bmlmaWVkc2hlbGwvZGlzcGxheS9GQ0MrQUJBUCtBbGlnbm1lbnQnXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAga2V5OiAnVUkyIHRlc3QgbGlua3MnLFxuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ1VJMiB0ZXN0IGxpbmtzJyxcbiAgICAgICAgICAgIHBhdGg6ICd3aWtpL2Rpc3BsYXkvdW5pZmllZHNoZWxsL0FkYXB0aW9uK3RvK1VJNStRVW5pdCtUZXN0K1J1bm5lcidcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBrZXk6ICdTdXBwb3J0IHNjaGVkdWxlJyxcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdUSVAgQ29yZSBVSSBJbnRlZ3JhdGlvbiBzdXBwb3J0JyxcbiAgICAgICAgICAgIHBhdGg6ICd3aWtpL2Rpc3BsYXkvVElQQ29yZVVJSS9TdXBwb3J0J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGtleTogJ1VJSSBTdXBwb3J0IHNjaGVkdWxlJyxcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdUSVAgQ29yZSBVSSBJbnRlZ3JhdGlvbiBzdXBwb3J0JyxcbiAgICAgICAgICAgIHBhdGg6ICd3aWtpL2Rpc3BsYXkvVElQQ29yZVVJSS9TdXBwb3J0J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGtleTogJ1N1cHBvcnQgcGFnZScsXG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiAnQ0EtVUkyLUlOVC1GRSBzdXBwb3J0JyxcbiAgICAgICAgICAgIHBhdGg6ICd3aWtpL2Rpc3BsYXkvVUlDRUkvQ1NTK01lc3NhZ2UrRGlzcGF0Y2hpbmcrLStjb21wb25lbnQrQ0EtVUkyLUlOVC1GRSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBrZXk6ICdVSTIgU3VwcG9ydCBwYWdlJyxcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdDQS1VSTItSU5ULUZFIHN1cHBvcnQnLFxuICAgICAgICAgICAgcGF0aDogJ3dpa2kvZGlzcGxheS9VSUNFSS9DU1MrTWVzc2FnZStEaXNwYXRjaGluZystK2NvbXBvbmVudCtDQS1VSTItSU5ULUZFJ1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGtleTogJ0JhY2tlbmQgU3ByaW50IFJldmlld3MnLFxuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ0JhY2tlbmQgU3ByaW50IFJldmlldycsXG4gICAgICAgICAgICBwYXRoOiAnd2lraS9kaXNwbGF5L1VJQ0VJL1RhY3QrT3ZlcnZpZXdzJ1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGtleTogJ1VJNSBwYXRjaCBzY2hlZHVsZScsXG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiAnVUk1IFVJMiBQYWNoIHBsYW4nLFxuICAgICAgICAgICAgcGF0aDogJ3dpa2kvcGFnZXMvdmlld3BhZ2UuYWN0aW9uP3BhZ2VJZD0xNjc5NjIzMTU3J1xuICAgICAgICB9XG4gICAgfVxuXTtcbmZ1bmN0aW9uIGNhbGNEaXN0YW5jZShzVGV4dDEsIHNUZXh0Mikge1xuICAgIC8vIGNvbnNvbGUubG9nKFwibGVuZ3RoMlwiICsgc1RleHQxICsgXCIgLSBcIiArIHNUZXh0MilcbiAgICB2YXIgYTAgPSBkaXN0YW5jZS5sZXZlbnNodGVpbihzVGV4dDEuc3Vic3RyaW5nKDAsIHNUZXh0Mi5sZW5ndGgpLCBzVGV4dDIpO1xuICAgIHZhciBhID0gZGlzdGFuY2UubGV2ZW5zaHRlaW4oc1RleHQxLnRvTG93ZXJDYXNlKCksIHNUZXh0Mik7XG4gICAgcmV0dXJuIGEwICogNTAwIC8gc1RleHQyLmxlbmd0aCArIGE7XG59XG5mdW5jdGlvbiBmbkZpbmRNYXRjaChzS2V5d29yZCwgb0NvbnRleHQsIG9NYXApIHtcbiAgICAvLyByZXR1cm4gYSBiZXR0ZXIgY29udGV4dCBpZiB0aGVyZSBpcyBhIG1hdGNoXG4gICAgb01hcC5zb3J0KGZ1bmN0aW9uIChvRW50cnkxLCBvRW50cnkyKSB7XG4gICAgICAgIHZhciB1MSA9IGNhbGNEaXN0YW5jZShvRW50cnkxLmtleS50b0xvd2VyQ2FzZSgpLCBzS2V5d29yZCk7XG4gICAgICAgIHZhciB1MiA9IGNhbGNEaXN0YW5jZShvRW50cnkyLmtleS50b0xvd2VyQ2FzZSgpLCBzS2V5d29yZCk7XG4gICAgICAgIHJldHVybiB1MSAtIHUyO1xuICAgIH0pO1xuICAgIC8vIGxhdGVyOiBpbiBjYXNlIG9mIGNvbmZsaWN0cywgYXNrLFxuICAgIC8vIG5vdzpcbiAgICB2YXIgZGlzdCA9IGNhbGNEaXN0YW5jZShvTWFwWzBdLmtleS50b0xvd2VyQ2FzZSgpLCBzS2V5d29yZCk7XG4gICAgZGVidWdsb2coJ2Jlc3QgZGlzdCcgKyBkaXN0ICsgJyAvICAnICsgZGlzdCAqIHNLZXl3b3JkLmxlbmd0aCArICcgJyArIHNLZXl3b3JkKTtcbiAgICBpZiAoZGlzdCA8IDE1MCkge1xuICAgICAgICB2YXIgbzEgPSBPYmplY3QuYXNzaWduKHt9LCBvQ29udGV4dCk7XG4gICAgICAgIHZhciBvMjtcbiAgICAgICAgbzEuY29udGV4dCA9IE9iamVjdC5hc3NpZ24oe30sIG8xLmNvbnRleHQpO1xuICAgICAgICBvMiA9IG8xO1xuICAgICAgICBvMi5jb250ZXh0ID0gT2JqZWN0LmFzc2lnbihvMS5jb250ZXh0LCBvTWFwWzBdLmNvbnRleHQpO1xuICAgICAgICByZXR1cm4gbzI7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuLyoqXG4gKiBhIGZ1bmN0aW9uIHRvIG1hdGNoIGEgdW5pdCB0ZXN0IHVzaW5nIGxldmVuc2h0ZWluIGRpc3RhbmNlc1xuICogQHB1YmxpY1xuICovXG5mdW5jdGlvbiBmbkZpbmRVbml0VGVzdChzc3lzdGVtT2JqZWN0SWQsIG9Db250ZXh0KSB7XG4gICAgcmV0dXJuIGZuRmluZE1hdGNoKHNzeXN0ZW1PYmplY3RJZCwgb0NvbnRleHQsIG9Vbml0VGVzdHMpO1xufVxuZnVuY3Rpb24gZm5GaW5kV2lraShzS2V5d29yZCwgb0NvbnRleHQpIHtcbiAgICByZXR1cm4gZm5GaW5kTWF0Y2goc0tleXdvcmQsIG9Db250ZXh0LCBvV2lraXMpO1xufVxudmFyIGFTaG93RW50aXR5QWN0aW9ucyA9IFtcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbUlkOiAndXYyJyxcbiAgICAgICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxuICAgICAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHAnXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdXYyLndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS91aTIvdXNoZWxsL3NoZWxscy9hYmFwL0Zpb3JpTGF1bmNocGFkLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1JZDogJ3V2MicsXG4gICAgICAgICAgICBjbGllbnQ6IC9eXFxkezMsM30kLyxcbiAgICAgICAgICAgIHN5c3RlbXR5cGU6ICdBQkFQRkVTJyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiAnZmxwZCdcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1djIud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3NhcC9hcnNydmNfdXBiX2FkbW4vbWFpbi5odG1sP3NhcC1jbGllbnQ9e2NsaWVudH0nXG4gICAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgICAgY29udGV4dDoge1xuICAgICAgICAgICAgc3lzdGVtSWQ6ICd1MXknLFxuICAgICAgICAgICAgY2xpZW50OiAvXlxcZHszLDN9JC8sXG4gICAgICAgICAgICBzeXN0ZW10eXBlOiAnQUJBUEZFUycsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogJ2ZscCdcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwczovL2xkY2l1MXkud2RmLnNhcC5jb3JwOjQ0MzU1L3NhcC9iYy91aTVfdWk1L3VpMi91c2hlbGwvc2hlbGxzL2FiYXAvRmlvcmlMYXVuY2hwYWQuaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbUlkOiAndTF5JyxcbiAgICAgICAgICAgIGNsaWVudDogL15cXGR7MywzfSQvLFxuICAgICAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6ICdmbHBkJ1xuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vbGRjaXUxeS53ZGYuc2FwLmNvcnA6NDQzNTUvc2FwL2JjL3VpNV91aTUvc2FwL2Fyc3J2Y191cGJfYWRtbi9tYWluLmh0bWw/c2FwLWNsaWVudD17Y2xpZW50fSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1JZDogJ3V2MicsXG4gICAgICAgICAgICBjbGllbnQ6ICcxMjAnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0Q2F0ZWdvcnk6ICdmaW9yaSBjYXRhbG9nJyxcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdElkOiAvLiovLFxuICAgICAgICAgICAgc3lzdGVtdHlwZTogJ0FCQVBGRVMnLFxuICAgICAgICAgICAgdG9vbDogJ0ZMUEQnXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cHM6Ly9sZGNpdXYyLndkZi5zYXAuY29ycDo0NDM1NS9zYXAvYmMvdWk1X3VpNS9zYXAvYXJzcnZjX3VwYl9hZG1uL21haW4uaHRtbD9zYXAtY2xpZW50PXtjbGllbnR9I0NBVEFMT0c6e3N5c3RlbU9iamVjdElkfSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ3VuaXQnLFxuICAgICAgICAgICAgc3lzdGVtT2JqZWN0SWQ6IGZuRmluZFVuaXRUZXN0XG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdDoge1xuICAgICAgICAgICAgdHlwZTogJ1VSTCcsXG4gICAgICAgICAgICBwYXR0ZXJuOiAnaHR0cDovL2xvY2FsaG9zdDo4MDgwL3twYXRofSdcbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBjb250ZXh0OiB7XG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RDYXRlZ29yeTogJ3VuaXQgdGVzdCcsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogZm5GaW5kVW5pdFRlc3RcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwOi8vbG9jYWxob3N0OjgwODAve3BhdGh9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbU9iamVjdENhdGVnb3J5OiAnd2lraScsXG4gICAgICAgICAgICBzeXN0ZW1PYmplY3RJZDogZm5GaW5kV2lraVxuICAgICAgICB9LFxuICAgICAgICByZXN1bHQ6IHtcbiAgICAgICAgICAgIHR5cGU6ICdVUkwnLFxuICAgICAgICAgICAgcGF0dGVybjogJ2h0dHBzOi8vd2lraS53ZGYuc2FwLmNvcnAve3BhdGh9J1xuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgIHN5c3RlbUlkOiAnSklSQSdcbiAgICAgICAgfSxcbiAgICAgICAgcmVzdWx0OiB7XG4gICAgICAgICAgICB0eXBlOiAnVVJMJyxcbiAgICAgICAgICAgIHBhdHRlcm46ICdodHRwczovL2ppcmEud2RmLnNhcC5jb3JwOjgwODAvVElQQ09SRVVJSUknXG4gICAgICAgIH1cbiAgICB9XG5dO1xuLy8gaWYgVE9PTCA9IEpJUkEgfHwgU3lzdGVtSWQgPSBKSVJBIC0+IFN5c3RlbUlkID0gSklSQVxuLy9cbi8vXG5mdW5jdGlvbiBzdGFydEJyb3dzZXIodXJsKSB7XG4gICAgdmFyIGNtZCA9ICdcIiVQcm9ncmFtRmlsZXMoeDg2KSVcXFxcR29vZ2xlXFxcXENocm9tZVxcXFxBcHBsaWNhdGlvblxcXFxjaHJvbWUuZXhlXCIgLS1pbmNvZ25pdG8gLXVybCBcIicgKyB1cmwgKyAnXCInO1xuICAgIGNoaWxkX3Byb2Nlc3NfMS5leGVjKGNtZCwgZnVuY3Rpb24gKGVycm9yLCBzdGRvdXQsIHN0ZGVycikge1xuICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYGV4ZWMgZXJyb3I6ICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZGVidWdsb2coYHN0ZG91dDogJHtzdGRvdXR9YCk7XG4gICAgICAgIGRlYnVnbG9nKGBzdGRlcnI6ICR7c3RkZXJyfWApO1xuICAgIH0pO1xufVxuLy8gc3RhcnRTQVBHVUlcbi8vICAgTjpcXD5cImM6XFxQcm9ncmFtIEZpbGVzICh4ODYpXFxTQVBcXEZyb250RW5kXFxTQVBndWlcIlxcc2Fwc2hjdXQuZXhlICAtc3lzdGVtPVVWMiAtY2xpZW50PTEyMCAtY29tbWFuZD1TRTM4IC10eXBlPVRyYW5zYWN0aW9uIC11c2VyPUFVU0VSXG5mdW5jdGlvbiBleHBhbmRQYXJhbWV0ZXJzSW5VUkwob01lcmdlZENvbnRleHRSZXN1bHQpIHtcbiAgICB2YXIgcHRuID0gb01lcmdlZENvbnRleHRSZXN1bHQucmVzdWx0LnBhdHRlcm47XG4gICAgT2JqZWN0LmtleXMob01lcmdlZENvbnRleHRSZXN1bHQuY29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xuICAgICAgICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKCd7JyArIHNLZXkgKyAnfScsICdnJyk7XG4gICAgICAgIHB0biA9IHB0bi5yZXBsYWNlKHJlZ2V4LCBvTWVyZ2VkQ29udGV4dFJlc3VsdC5jb250ZXh0W3NLZXldKTtcbiAgICAgICAgcHRuID0gcHRuLnJlcGxhY2UocmVnZXgsIG9NZXJnZWRDb250ZXh0UmVzdWx0LmNvbnRleHRbc0tleV0pO1xuICAgIH0pO1xuICAgIHJldHVybiBwdG47XG59XG5mdW5jdGlvbiBleGVjdXRlU3RhcnR1cChvTWVyZ2VkQ29udGV4dFJlc3VsdCkge1xuICAgIGlmIChvTWVyZ2VkQ29udGV4dFJlc3VsdC5yZXN1bHQudHlwZSA9PT0gJ1VSTCcpIHtcbiAgICAgICAgdmFyIHB0biA9IGV4cGFuZFBhcmFtZXRlcnNJblVSTChvTWVyZ2VkQ29udGV4dFJlc3VsdCk7XG4gICAgICAgIHN0YXJ0QnJvd3NlcihwdG4pO1xuICAgICAgICByZXR1cm4gcHRuO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdmFyIHMgPSAoXCJEb24ndCBrbm93IGhvdyB0byBzdGFydCBcIiArIG9NZXJnZWRDb250ZXh0UmVzdWx0LnJlc3VsdC50eXBlICsgJ1xcbiBmb3IgXCInICsgb01lcmdlZENvbnRleHRSZXN1bHQucXVlcnkgKyAnXCInKTtcbiAgICAgICAgZGVidWdsb2cocyk7XG4gICAgICAgIHJldHVybiBzO1xuICAgIH1cbn1cbmZ1bmN0aW9uIG5yTWF0Y2hlcyhhT2JqZWN0LCBvQ29udGV4dCkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhhT2JqZWN0KS5yZWR1Y2UoZnVuY3Rpb24gKHByZXYsIGtleSkge1xuICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9Db250ZXh0LCBrZXkpKSB7XG4gICAgICAgICAgICBwcmV2ID0gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG59XG5mdW5jdGlvbiBuck5vTWF0Y2hlcyhhT2JqZWN0LCBvQ29udGV4dCkge1xuICAgIHZhciBub01hdGNoQSA9IE9iamVjdC5rZXlzKGFPYmplY3QpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XG4gICAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9Db250ZXh0LCBrZXkpKSB7XG4gICAgICAgICAgICBwcmV2ID0gcHJldiArIDE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByZXY7XG4gICAgfSwgMCk7XG4gICAgdmFyIG5vTWF0Y2hCID0gT2JqZWN0LmtleXMob0NvbnRleHQpLnJlZHVjZShmdW5jdGlvbiAocHJldiwga2V5KSB7XG4gICAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGFPYmplY3QsIGtleSkpIHtcbiAgICAgICAgICAgIHByZXYgPSBwcmV2ICsgMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJldjtcbiAgICB9LCAwKTtcbiAgICByZXR1cm4gbm9NYXRjaEEgKyBub01hdGNoQjtcbn1cbmZ1bmN0aW9uIHNhbWVPclN0YXIoczEsIHMyLCBvRW50aXR5KSB7XG4gICAgcmV0dXJuIHMxID09PSBzMiB8fFxuICAgICAgICAoczEgPT09IHVuZGVmaW5lZCAmJiBzMiA9PT0gbnVsbCkgfHxcbiAgICAgICAgKChzMiBpbnN0YW5jZW9mIFJlZ0V4cCkgJiYgczIuZXhlYyhzMSkgIT09IG51bGwpIHx8XG4gICAgICAgICgodHlwZW9mIHMyID09PSAnZnVuY3Rpb24nICYmIHMxKSAmJiBzMihzMSwgb0VudGl0eSkpO1xufVxuZnVuY3Rpb24gc2FtZU9yU3RhckVtcHR5KHMxLCBzMiwgb0VudGl0eSkge1xuICAgIGlmIChzMSA9PT0gdW5kZWZpbmVkICYmIHMyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChzMiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gczEgPT09IHMyIHx8XG4gICAgICAgICgoczIgaW5zdGFuY2VvZiBSZWdFeHApICYmIHMyLmV4ZWMoczEpICE9PSBudWxsKSB8fFxuICAgICAgICAoKHR5cGVvZiBzMiA9PT0gJ2Z1bmN0aW9uJyAmJiBzMSkgJiYgczIoczEsIG9FbnRpdHkpKTtcbn1cbmZ1bmN0aW9uIGZpbHRlclNob3dFbnRpdHlPbGQob0NvbnRleHQsIGFTaG93RW50aXR5KSB7XG4gICAgdmFyIGFGaWx0ZXJlZDtcbiAgICBPYmplY3Qua2V5cyhvQ29udGV4dCkuZm9yRWFjaChmdW5jdGlvbiAoc0tleSkge1xuICAgICAgICBpZiAob0NvbnRleHRbc0tleV0gPT09IG51bGwpIHtcbiAgICAgICAgICAgIG9Db250ZXh0W3NLZXldID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgLy8gZmlsdGVyIGNvbnRleHQsIGFtZW5kaW5nIHN5bm9ueW1zXG4gICAgYUZpbHRlcmVkID0gYVNob3dFbnRpdHkuZmlsdGVyKGZ1bmN0aW9uIChvU2hvd0VudGl0eSkge1xuICAgICAgICAvLyAgICAgICBjb25zb2xlLmxvZyhcIi4uLlwiKVxuICAgICAgICAvLyAgICAgIGNvbnNvbGUubG9nKG9TaG93RW50aXR5LmNvbnRleHQudG9vbCArIFwiIFwiICsgb0NvbnRleHQudG9vbCArIFwiXFxuXCIpXG4gICAgICAgIC8vICAgICAgY29uc29sZS5sb2cob1Nob3dFbnRpdHkuY29udGV4dC5jbGllbnQgKyBcIiBcIiArIG9Db250ZXh0LmNsaWVudCArXCI6XCIgKyBzYW1lT3JTdGFyKG9Db250ZXh0LmNsaWVudCxvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCkgKyBcIlxcblwiKVxuICAgICAgICAvLyAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkob1Nob3dFbnRpdHkuY29udGV4dCkgKyBcIlxcblwiICsgSlNPTi5zdHJpbmdpZnkob0NvbnRleHQuY2xpZW50KSArIFwiXFxuXCIpXG4gICAgICAgIHJldHVybiBzYW1lT3JTdGFyKG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtSWQsIG9Db250ZXh0LnN5c3RlbUlkLCBvQ29udGV4dCkgJiZcbiAgICAgICAgICAgIHNhbWVPclN0YXIob0NvbnRleHQudG9vbCwgb1Nob3dFbnRpdHkuY29udGV4dC50b29sLCBvQ29udGV4dCkgJiZcbiAgICAgICAgICAgIHNhbWVPclN0YXIob0NvbnRleHQuY2xpZW50LCBvU2hvd0VudGl0eS5jb250ZXh0LmNsaWVudCwgb0NvbnRleHQpICYmXG4gICAgICAgICAgICBzYW1lT3JTdGFyRW1wdHkob0NvbnRleHQuc3lzdGVtT2JqZWN0Q2F0ZWdvcnksIG9TaG93RW50aXR5LmNvbnRleHQuc3lzdGVtT2JqZWN0Q2F0ZWdvcnksIG9Db250ZXh0KSAmJlxuICAgICAgICAgICAgc2FtZU9yU3RhckVtcHR5KG9Db250ZXh0LnN5c3RlbU9iamVjdElkLCBvU2hvd0VudGl0eS5jb250ZXh0LnN5c3RlbU9iamVjdElkLCBvQ29udGV4dCk7XG4gICAgICAgIC8vICAgICAgJiYgb1Nob3dFbnRpdHkuY29udGV4dC50b29sID09PSBvQ29udGV4dC50b29sXG4gICAgfSk7XG4gICAgLy8gIGNvbnNvbGUubG9nKGFGaWx0ZXJlZC5sZW5ndGgpXG4gICAgLy8gbWF0Y2ggb3RoZXIgY29udGV4dCBwYXJhbWV0ZXJzXG4gICAgYUZpbHRlcmVkLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgdmFyIG5yTWF0Y2hlc0EgPSBuck1hdGNoZXMoYS5jb250ZXh0LCBvQ29udGV4dCk7XG4gICAgICAgIHZhciBuck1hdGNoZXNCID0gbnJNYXRjaGVzKGIuY29udGV4dCwgb0NvbnRleHQpO1xuICAgICAgICB2YXIgbnJOb01hdGNoZXNBID0gbnJOb01hdGNoZXMoYS5jb250ZXh0LCBvQ29udGV4dCk7XG4gICAgICAgIHZhciBuck5vTWF0Y2hlc0IgPSBuck5vTWF0Y2hlcyhiLmNvbnRleHQsIG9Db250ZXh0KTtcbiAgICAgICAgLy8gICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhLmNvbnRleHQpKVxuICAgICAgICAvLyAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGIuY29udGV4dCkpXG4gICAgICAgIC8vICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkob0NvbnRleHQpKVxuICAgICAgICB2YXIgcmVzID0gLShuck1hdGNoZXNBIC0gbnJNYXRjaGVzQikgKiAxMDAgKyAobnJOb01hdGNoZXNBIC0gbnJOb01hdGNoZXNCKTtcbiAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKFwiZGlmZiBcIiArIHJlcylcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9KTtcbiAgICBpZiAoYUZpbHRlcmVkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBkZWJ1Z2xvZygnbm8gdGFyZ2V0IGZvciBzaG93RW50aXR5ICcgKyBKU09OLnN0cmluZ2lmeShvQ29udGV4dCkpO1xuICAgIH1cbiAgICAvLyBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShhRmlsdGVyZWQsdW5kZWZpbmVkLDIpKVxuICAgIGlmIChhRmlsdGVyZWRbMF0pIHtcbiAgICAgICAgLy8gZXhlY3V0ZSBhbGwgZnVuY3Rpb25zXG4gICAgICAgIHZhciBvTWF0Y2ggPSBhRmlsdGVyZWRbMF07XG4gICAgICAgIHZhciBvTWVyZ2VkID0ge1xuICAgICAgICAgICAgY29udGV4dDoge31cbiAgICAgICAgfTtcbiAgICAgICAgb01lcmdlZC5jb250ZXh0ID0gT2JqZWN0LmFzc2lnbih7fSwgb01lcmdlZC5jb250ZXh0LCBhRmlsdGVyZWRbMF0uY29udGV4dCwgb0NvbnRleHQpO1xuICAgICAgICBvTWVyZ2VkID0gT2JqZWN0LmFzc2lnbihvTWVyZ2VkLCB7XG4gICAgICAgICAgICByZXN1bHQ6IGFGaWx0ZXJlZFswXS5yZXN1bHRcbiAgICAgICAgfSk7XG4gICAgICAgIE9iamVjdC5rZXlzKG9NYXRjaC5jb250ZXh0KS5mb3JFYWNoKGZ1bmN0aW9uIChzS2V5KSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG9NYXRjaC5jb250ZXh0W3NLZXldID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgZGVidWdsb2coJ05vdyByZXRyb2ZpdHRpbmcgOicgKyBzS2V5ICsgJyAtICcgKyBvQ29udGV4dFtzS2V5XSk7XG4gICAgICAgICAgICAgICAgb01lcmdlZCA9IG9NYXRjaC5jb250ZXh0W3NLZXldKG9Db250ZXh0W3NLZXldLCBvTWVyZ2VkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBvTWVyZ2VkO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cbmNvbnN0IGlucHV0RmlsdGVyID0gcmVxdWlyZSgnLi9pbnB1dEZpbHRlcicpO1xuZnVuY3Rpb24gZmlsdGVyU2hvd0VudGl0eShvQ29udGV4dCwgYVNob3dFbnRpdHlBY3Rpb25zKSB7XG4gICAgT2JqZWN0LmtleXMob0NvbnRleHQpLmZvckVhY2goZnVuY3Rpb24gKHNLZXkpIHtcbiAgICAgICAgaWYgKG9Db250ZXh0W3NLZXldID09PSBudWxsKSB7XG4gICAgICAgICAgICBkZWxldGUgb0NvbnRleHRbc0tleV07XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICB2YXIgcmVzID0gaW5wdXRGaWx0ZXIuYXBwbHlSdWxlc1BpY2tGaXJzdChvQ29udGV4dCk7XG4gICAgaWYgKCFyZXMpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZGVidWdsb2coXCIqKiBhZnRlciBmaWx0ZXIgcnVsZXNcIiArIEpTT04uc3RyaW5naWZ5KHJlcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgcmV0dXJuIGZpbHRlclNob3dFbnRpdHlPbGQocmVzLCBhU2hvd0VudGl0eUFjdGlvbnMpO1xufVxuZnVuY3Rpb24gZXhlY1Nob3dFbnRpdHkob0VudGl0eSkge1xuICAgIHZhciBtZXJnZWQgPSBmaWx0ZXJTaG93RW50aXR5KG9FbnRpdHksIGFTaG93RW50aXR5QWN0aW9ucyk7XG4gICAgaWYgKG1lcmdlZCkge1xuICAgICAgICByZXR1cm4gZXhlY3V0ZVN0YXJ0dXAobWVyZ2VkKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59XG4vLyBFOlxccHJvamVjdHNcXG5vZGVqc1xcYm90YnVpbGRlclxcc2FtcGxlYm90PlwiJVByb2dyYW1GaWxlcyh4ODYpJVxcR29vZ2xlXFxDaHJvbWVcXEFwcGxpY2F0aW9uXFxjaHJvbWUuZXhlXCIgLS1pbmNvZ25pdG8gLXVybCB3d3cuc3BpZWdlbC5kZVxuZXhwb3J0cy5kaXNwYXRjaGVyID0ge1xuICAgIGV4ZWNTaG93RW50aXR5OiBleGVjU2hvd0VudGl0eSxcbiAgICBfdGVzdDoge1xuICAgICAgICBzYW1lT3JTdGFyOiBzYW1lT3JTdGFyLFxuICAgICAgICBuck1hdGNoZXM6IG5yTWF0Y2hlcyxcbiAgICAgICAgbnJOb01hdGNoZXM6IG5yTm9NYXRjaGVzLFxuICAgICAgICBleHBhbmRQYXJhbWV0ZXJzSW5VUkw6IGV4cGFuZFBhcmFtZXRlcnNJblVSTCxcbiAgICAgICAgZmlsdGVyU2hvd0VudGl0eTogZmlsdGVyU2hvd0VudGl0eSxcbiAgICAgICAgZm5GaW5kVW5pdFRlc3Q6IGZuRmluZFVuaXRUZXN0LFxuICAgICAgICBjYWxjRGlzdGFuY2U6IGNhbGNEaXN0YW5jZSxcbiAgICAgICAgX2FTaG93RW50aXR5QWN0aW9uczogYVNob3dFbnRpdHlBY3Rpb25zXG4gICAgfVxufTtcbi8vZXhwb3J0cyBkaXNwYXRjaGVyO1xuLy9tb2R1bGUuZXhwb3J0cyA9IGRpc3BhdGNoZXJcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
