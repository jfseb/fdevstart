/**
 * @file
 * @module jfseb.fdevstart.dispatcher
 * @copyright (c) 2016 Gerd Forstmann
 */


/// <reference path="../../lib/node-4.d.ts" />

declare interface ObjectConstructor {
    assign(target: any, ...sources: any[]): any;
}

var AnyObject = (<any>Object);

import * as distance from '../utils/damerauLevenshtein';

import * as debug from 'debug';
const debuglog = debug('dispatcher')

import { exec } from 'child_process';
//  var exec = require('child_process').exec
//  var leven = require('../utils/damerauLevenshtein.js').levenshtein

import * as exectemplate from '../exec/exectemplate';

  //var leven = require('../utils/damerauLevenshtein.js')
import * as matchdata from './matchdata';

const oUnitTests = matchdata.oUnitTests
const oWikis = matchdata.oWikis

  function calcDistance (sText1, sText2) {
    debuglog("length2" + sText1 + " - " + sText2)
    var a0 = distance.levenshtein(sText1.substring(0, sText2.length), sText2)
    var a = distance.levenshtein(sText1.toLowerCase(), sText2)
    return a0 * 500 / sText2.length + a
  }

  function fnFindMatch (sKeyword, oContext, oMap) {
    // return a better context if there is a match
    // sKeyword = sKeyword.toLowerCase();
    oMap.sort(function (oEntry1, oEntry2) {
      var u1 = calcDistance(oEntry1.key.toLowerCase(), sKeyword)
      var u2 = calcDistance(oEntry2.key.toLowerCase(), sKeyword)
      return u1 - u2
    })
    // later: in case of conflicts, ask,
    // now:
    var dist = calcDistance(oMap[0].key.toLowerCase(), sKeyword)
    debuglog('best dist' + dist + ' /  ' + dist * sKeyword.length + ' ' + sKeyword)
    if (dist < 150) {
      var o1 = (<any>Object).assign({}, oContext)
      var o2
      o1.context = (<any>Object).assign({}, o1.context)
      o2 = o1
      o2.context = (<any>Object).assign(o1.context, oMap[0].context)
      return o2
    }
    return null
  }

  /**
   * a function to match a unit test using levenshtein distances
   * @public
   */
  function fnFindUnitTest (ssystemObjectId, oContext) {
    return fnFindMatch(ssystemObjectId, oContext, oUnitTests)
  }

  function fnFindWiki (sKeyword, oContext) {
    return fnFindMatch(sKeyword, oContext, oWikis)
  }

  var aShowEntityActions = [
    {
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
    },
    {
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
    },
    {
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
    },
    {
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
    },
    {
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
    },
    {
      context: {
        systemObjectCategory: 'unit',
        systemObjectId: fnFindUnitTest
      },
      result: {
        type: 'URL',
        pattern: 'http://localhost:8080/{path}'
      }
    },
     {
      context: {
        systemObjectCategory: 'unit test',
        systemObjectId: fnFindUnitTest
      },
      result: {
        type: 'URL',
        pattern: 'http://localhost:8080/{path}'
      }
    },
    {
      context: {
        systemObjectCategory: 'wiki',
        systemObjectId: fnFindWiki
      },
      result: {
        type: 'URL',
        pattern: 'https://wiki.wdf.sap.corp/{path}'
      }
    },
    {
      context: {
        systemId: 'JIRA'
      },
      result: {
        type: 'URL',
        pattern: 'https://jira.wdf.sap.corp:8080/TIPCOREUIII'
      }
    }
  ]

  // if TOOL = JIRA || SystemId = JIRA -> SystemId = JIRA
  //
  //

  function startBrowser (url) {
    var cmd =
    '"%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" --incognito -url "' + url + '"'
    exec(cmd, function (error, stdout, stderr) {
      if (error) {
        console.error(`exec error: ${error}`)
        return
      }
      debuglog(`stdout: ${stdout}`)
      debuglog(`stderr: ${stderr}`)
    })
  }

  // startSAPGUI

  //   N:\>"c:\Program Files (x86)\SAP\FrontEnd\SAPgui"\sapshcut.exe  -system=UV2 -client=120 -command=SE38 -type=Transaction -user=AUSER

  function expandParametersInURL (oMergedContextResult) {
    var ptn = oMergedContextResult.result.pattern
    ptn = exectemplate.expandTemplate(oMergedContextResult.context, ptn);
/*    Object.keys(oMergedContextResult.context).forEach(function (sKey) {
      var regex = new RegExp('{' + sKey + '}', 'g')
      ptn = ptn.replace(regex, oMergedContextResult.context[sKey])
      ptn = ptn.replace(regex, oMergedContextResult.context[sKey])
    })
    */
    return ptn
  }

  function executeStartup (oMergedContextResult) {
    if (oMergedContextResult.result.type === 'URL') {
      var ptn = expandParametersInURL(oMergedContextResult)
      startBrowser(ptn)
      return ptn
    } else {
      var s = ("Don't know how to start " + oMergedContextResult.result.type + '\n for "' + oMergedContextResult.query + '"')
      debuglog(s)
      return s
    }
  }

  function nrMatches (aObject, oContext) {
    return Object.keys(aObject).reduce(function (prev, key) {
      if (Object.prototype.hasOwnProperty.call(oContext, key)) {
        prev = prev + 1
      }
      return prev
    }, 0)
  }

  function nrNoMatches (aObject, oContext) {
    var noMatchA = Object.keys(aObject).reduce(function (prev, key) {
      if (!Object.prototype.hasOwnProperty.call(oContext, key)) {
        prev = prev + 1
      }
      return prev
    }, 0)
    var noMatchB = Object.keys(oContext).reduce(function (prev, key) {
      if (!Object.prototype.hasOwnProperty.call(aObject, key)) {
        prev = prev + 1
      }
      return prev
    }, 0)
    return noMatchA + noMatchB
  }

  function sameOrStar (s1 : string, s2 : string | RegExp | Function , oEntity) {
    return s1 === s2 ||
      (s1 === undefined && s2 === null) ||
      ((s2 instanceof RegExp) && s2.exec(s1) !== null) ||
      ((typeof s2 === 'function' && s1) && s2(s1, oEntity))
  }

  function sameOrStarEmpty (s1 : string, s2 : string | RegExp | Function, oEntity) {
    if (s1 === undefined && s2 === undefined) {
      return true
    }
    if (s2 === undefined) {
      return true
    }

    return s1 === s2 ||
      ((s2 instanceof RegExp) && s2.exec(s1) !== null) ||
      ((typeof s2 === 'function' && s1) && s2(s1, oEntity))
  }

  function filterShowEntityOld (oContext, aShowEntity) {
    var aFiltered
    Object.keys(oContext).forEach(function (sKey) {
      if (oContext[sKey] === null) {
        oContext[sKey] = undefined
      }
    })
    // filter context, amending synonyms


    aFiltered = aShowEntity.filter(function (oShowEntity) {
      //       console.log("...")
      //      console.log(oShowEntity.context.tool + " " + oContext.tool + "\n")
      //      console.log(oShowEntity.context.client + " " + oContext.client +":" + sameOrStar(oContext.client,oShowEntity.context.client) + "\n")
      //  console.log(JSON.stringify(oShowEntity.context) + "\n" + JSON.stringify(oContext.client) + "\n")

      return sameOrStar(oShowEntity.context.systemId, oContext.systemId, oContext) &&
        sameOrStar(oContext.tool, oShowEntity.context.tool, oContext) &&
        sameOrStar(oContext.client, oShowEntity.context.client, oContext) &&
        sameOrStarEmpty(oContext.systemObjectCategory, oShowEntity.context.systemObjectCategory, oContext) &&
        sameOrStarEmpty(oContext.systemObjectId, oShowEntity.context.systemObjectId, oContext)
    //      && oShowEntity.context.tool === oContext.tool
    })
    //  console.log(aFiltered.length)
    // match other context parameters
    aFiltered.sort(function (a, b) {
      var nrMatchesA = nrMatches(a.context, oContext)
      var nrMatchesB = nrMatches(b.context, oContext)
      var nrNoMatchesA = nrNoMatches(a.context, oContext)
      var nrNoMatchesB = nrNoMatches(b.context, oContext)
      //   console.log(JSON.stringify(a.context))
      //   console.log(JSON.stringify(b.context))
      //   console.log(JSON.stringify(oContext))
      var res = -(nrMatchesA - nrMatchesB) * 100 + (nrNoMatchesA - nrNoMatchesB)
      //     console.log("diff " + res)
      return res
    })
    if (aFiltered.length === 0) {
      debuglog('no target for showEntity ' + JSON.stringify(oContext))
    }
    // console.log(JSON.stringify(aFiltered,undefined,2))
    if (aFiltered[0]) {
      // execute all functions

      var oMatch = aFiltered[0]

      var oMerged = {
        context: {

        }
      }
      oMerged.context = AnyObject.assign({}, oMerged.context, aFiltered[0].context, oContext)
      oMerged = AnyObject.assign(oMerged, {
        result: aFiltered[0].result
      })

      Object.keys(oMatch.context).forEach(function (sKey) {
        if (typeof oMatch.context[sKey] === 'function') {
          debuglog('Now retrofitting :' + sKey + ' - ' + oContext[sKey])
          oMerged = oMatch.context[sKey](oContext[sKey], oMerged)
        }
      })

      return oMerged
    }
    return null
  }


import * as inputFilter from './inputFilter';

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

  function execShowEntity (oEntity) {
    var merged = filterShowEntity(oEntity, aShowEntityActions)
    if (merged) {
      return executeStartup(merged)
    }
    return null
  }

  // E:\projects\nodejs\botbuilder\samplebot>"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --incognito -url www.spiegel.de

  export const dispatcher = {
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
  }

  //exports dispatcher;

  //module.exports = dispatcher

