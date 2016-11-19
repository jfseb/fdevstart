/// <reference path="../../lib/node-4.d.ts" />


import * as distance from '../utils/damerauLevenshtein';

import * as debug from 'debug';

const debuglog = debug('dispatcher')

import { exec } from 'child_process';
//  var exec = require('child_process').exec
//  var leven = require('../utils/damerauLevenshtein.js').levenshtein


  //var leven = require('../utils/damerauLevenshtein.js')

  var oUnitTests = [
    {
      key: 'ClientSideTargetResolution',
      context: {
        systemObjectId: 'ClientSideTargetResolution',
        path: 'sap/bc/ui5_ui5/ui2/ushell/test-resources/sap/ushell/qunit/adapters/cdm/ClientSideTargetResolutionAdapter.qunit.html'
      }
    },
    {
      key: 'CommonDataModelAdapter',
      context: {
        systemObjectId: 'CommonDataModelAdapter',
        path: 'sap/bc/ui5_ui5/ui2/ushell/test-resources/sap/ushell/qunit/adapters/cdm/CommonDataModelAdapter.qunit.html'
      }
    },
    {
      key: 'ushell lib',
      context: {
        systemObjectId: 'ushell lib',
        path: 'sap/bc/ui5_ui5/ui2/ushell/test-resources/sap/ushell/qunit/testsuite.qunit.html'
      }
    },
    {
      key: 'ushell_abap',
      context: {
        systemObjectId: 'ushell_abap',
        path: 'sap/bc/ui5_ui5/ui2/ushell/test-resources/sap/ushell_abap/testsuite.qunit.html'
      }
    },
    {
      key: 'ui2 shell api',
      context: {
        systemObjectId: 'ui2 shell api',
        path: 'sap/public/bc/ui2/services/test/testsuite.qunit.html'
      }
    },
    {
      key: 'NavTargetResolution',
      context: {
        systemObjectId: 'NavTargetResolution',
        path: '/sap/bc/test/NavTargetResolution.js'
      }
    },
    {
      key: 'CSTR',
      context: {
        systemObjectId: 'ClientSideTargetResolution',
        path: '/sap/bc/test/CleintSideTargetResolution.js'
      }
    },
    {
      key: 'Shell.controller.js',
      context: {
        systemObjectId: 'Shell.controller.js',
        path: '/sap/bc/test/Shell.controller.js'
      }
    }
  ].concat([
    // alphabetic order please
    'test-resources/sap/ushell/qunit/adapters/cdm/ClientSideTargetResolutionAdapter.qunit.html',
    'test-resources/sap/ushell/qunit/adapters/cdm/CommonDataModelAdapter.qunit.html',
    'test-resources/sap/ushell/qunit/adapters/cdm/LaunchPageAdapter.qunit.html',

    'test-resources/sap/ushell/qunit/adapters/local/AppStateAdapter.qunit.html',
    'test-resources/sap/ushell/qunit/adapters/local/ClientSideTargetResolutionAdapter.qunit.html',
    'test-resources/sap/ushell/qunit/adapters/local/ContainerAdapter.qunit.html',
    'test-resources/sap/ushell/qunit/adapters/local/EndUserFeedbackAdapter.qunit.html',
    'test-resources/sap/ushell/qunit/adapters/local/NavTargetResolutionAdapter.qunit.html',
    'test-resources/sap/ushell/qunit/adapters/local/PersonalizationAdapter.qunit.html',
    'test-resources/sap/ushell/qunit/adapters/local/SupportTicketAdapterTest.qunit.html',
    'test-resources/sap/ushell/qunit/adapters/local/UserDefaultParameterPersistenceAdapter.qunit.html',
    'test-resources/sap/ushell/qunit/adapters/local/UserInfoAdapter.qunit.html',

    'test-resources/sap/ushell/qunit/bootstrap/sandbox.qunit.html',
    'test-resources/sap/ushell/qunit/CanvasShapesManager.qunit.html',

    'test-resources/sap/ushell/qunit/components/container/ApplicationContainer.qunit.html',
    'test-resources/sap/ushell/qunit/components/factsheet/annotation/ODataURLTemplating.qunit.html',
    'test-resources/sap/ushell/qunit/components/flp/ComponentKeysHandler.qunit.html',
    'test-resources/sap/ushell/qunit/components/flp/FlpApp.qunit.html',
    'test-resources/sap/ushell/qunit/components/flp/launchpad/appfinder/EasyAccess.qunit.html',
    'test-resources/sap/ushell/qunit/components/flp/launchpad/DashboardManager.qunit.html',
    'test-resources/sap/ushell/qunit/components/flp/launchpad/PagingManager.qunit.html',
    'test-resources/sap/ushell/qunit/components/flp/launchpad/appfinder/AppFinder.qunit.html',
    'test-resources/sap/ushell/qunit/components/flp/launchpad/appfinder/GroupListPopover.qunit.html',
    'test-resources/sap/ushell/qunit/components/flp/launchpad/appfinder/HierarchyApps.qunit.html',
    'test-resources/sap/ushell/qunit/components/flp/launchpad/appfinder/HierarchyFolders.qunit.html',
    'test-resources/sap/ushell/qunit/renderers/fiori2/userPreferences/LanguageRegionSelector.qunit.html',
    'test-resources/sap/ushell/qunit/components/flp/launchpad/dashboard/DashboardContent.qunit.html',
    'test-resources/sap/ushell/qunit/components/flp/launchpad/dashboard/DashboardUIActions.qunit.html',
    'test-resources/sap/ushell/qunit/components/flp/settings/FlpSettings.qunit.html',

    'test-resources/sap/ushell/qunit/components/tiles/applauncher/StaticTile.qunit.html',
    'test-resources/sap/ushell/qunit/components/tiles/applauncherdynamic/DynamicTile.qunit.html',
    'test-resources/sap/ushell/qunit/components/tiles/cdm/applauncher/StaticTile.qunit.html',
    'test-resources/sap/ushell/qunit/components/tiles/cdm/applauncherdynamic/DynamicTile.qunit.html',
    'test-resources/sap/ushell/qunit/components/tiles/utils.qunit.html',
    'test-resources/sap/ushell/qunit/components/tiles/utilsRT.qunit.html',
    'test-resources/sap/ushell/qunit/components/userActivity/userActivityLog.qunit.html',

    // "test-resources/sap/ushell/qunit/demoapps/UserDefaultPluginSample/UserDefaultPluginSample.qunit.html", // Currently not run inside the QUnit Test Loader for ushell-lib
    'test-resources/sap/ushell/qunit/FLPAnalytics.qunit.html',
    'test-resources/sap/ushell/qunit/Layout.qunit.html',

    'test-resources/sap/ushell/qunit/renderers/fiori2/AccessKeysHandler.qunit.html',
    'test-resources/sap/ushell/qunit/renderers/fiori2/DefaultParameters/DefaultParameters.qunit.html',
    'test-resources/sap/ushell/qunit/renderers/fiori2/Lifecycle.qunit.html',
    'test-resources/sap/ushell/qunit/renderers/fiori2/meArea/MeArea.qunit.html',
    'test-resources/sap/ushell/qunit/renderers/fiori2/meArea/UserSettings.qunit.html',
    'test-resources/sap/ushell/qunit/renderers/fiori2/notifications/Notifications.qunit.html',
    'test-resources/sap/ushell/qunit/renderers/fiori2/notifications/Settings.qunit.html',
    'test-resources/sap/ushell/qunit/renderers/fiori2/Renderer.qunit.html',
    'test-resources/sap/ushell/qunit/renderers/fiori2/RendererExtensions.qunit.html',
    'test-resources/sap/ushell/qunit/renderers/fiori2/Shell.qunit.html',
    'test-resources/sap/ushell/qunit/renderers/fiori2/UIActions.qunit.html',

    'test-resources/sap/ushell/qunit/services/AppConfiguration.qunit.html',
    'test-resources/sap/ushell/qunit/services/AppContext.qunit.html',
    'test-resources/sap/ushell/qunit/services/AppLifeCycle.qunit.html',
    'test-resources/sap/ushell/qunit/services/AppState.qunit.html',
    'test-resources/sap/ushell/qunit/services/Bookmark.qunit.html',
    'test-resources/sap/ushell/qunit/services/ClientSideTargetResolution.qunit.html',
    'test-resources/sap/ushell/qunit/services/CommonDataModel.qunit.html',
    'test-resources/sap/ushell/qunit/services/CommonDataModel/PersonalizationProcessor.qunit.html',
    'test-resources/sap/ushell/qunit/services/CommonDataModel/PersonalizationProcessorCDMBlackbox.qunit.html',
    'test-resources/sap/ushell/qunit/services/Container.qunit.html',
    'test-resources/sap/ushell/qunit/services/CrossApplicationNavigation.qunit.html',
    'test-resources/sap/ushell/qunit/services/EndUserFeedback.qunit.html',
    'test-resources/sap/ushell/qunit/services/LaunchPage.qunit.html',
    'test-resources/sap/ushell/qunit/services/Message.qunit.html',
    'test-resources/sap/ushell/qunit/services/NavTargetResolution.qunit.html',
    'test-resources/sap/ushell/qunit/services/NavTargetResolutionCDMBlackbox.qunit.html',
    'test-resources/sap/ushell/qunit/services/Notifications.qunit.html',
    'test-resources/sap/ushell/qunit/services/Personalization.qunit.html',
    'test-resources/sap/ushell/qunit/services/PluginManager.qunit.html',
    'test-resources/sap/ushell/qunit/services/ReferenceResolver.qunit.html',
    'test-resources/sap/ushell/qunit/services/ShellNavigation.History.qunit.html',
    'test-resources/sap/ushell/qunit/services/ShellNavigation.qunit.html',
    'test-resources/sap/ushell/qunit/services/SupportTicket.qunit.html',
    'test-resources/sap/ushell/qunit/services/URLParsing.qunit.html',
    'test-resources/sap/ushell/qunit/services/URLShortening.qunit.html',
    'test-resources/sap/ushell/qunit/services/Ui5ComponentLoader.qunit.html',
    'test-resources/sap/ushell/qunit/services/UsageAnalytics.qunit.html',
    'test-resources/sap/ushell/qunit/services/UserDefaultParameterPersistence.qunit.html',
    'test-resources/sap/ushell/qunit/services/UserDefaultParameters.qunit.html',
    'test-resources/sap/ushell/qunit/services/UserInfo.qunit.html',
    'test-resources/sap/ushell/qunit/services/UserRecents.qunit.html',
    'test-resources/sap/ushell/qunit/services/SmartNavigation.qunit.html',

    'test-resources/sap/ushell/qunit/System.qunit.html',

    'test-resources/sap/ushell/qunit/ui/footerbar/AboutButton.qunit.html',
    'test-resources/sap/ushell/qunit/ui/footerbar/AddBookmarkButton.qunit.html',
    'test-resources/sap/ushell/qunit/ui/footerbar/ContactSupportButton.qunit.html',
    'test-resources/sap/ushell/qunit/ui/footerbar/EndUserFeedback.qunit.html',
    'test-resources/sap/ushell/qunit/ui/footerbar/JamDiscussButton.qunit.html',
    'test-resources/sap/ushell/qunit/ui/footerbar/JamShareButton.qunit.html',
    'test-resources/sap/ushell/qunit/ui/footerbar/LogoutButton.qunit.html',
    'test-resources/sap/ushell/qunit/ui/footerbar/SettingsButton.qunit.html',
    'test-resources/sap/ushell/qunit/ui/footerbar/UserPreferencesButton.qunit.html',

    'test-resources/sap/ushell/qunit/ui/launchpad/AccessibilityCustomData.qunit.html',
    'test-resources/sap/ushell/qunit/ui/launchpad/ActionItem.qunit.html',
    'test-resources/sap/ushell/qunit/ui/launchpad/AnchorItem.qunit.html',
    'test-resources/sap/ushell/qunit/ui/launchpad/AnchorNavigationBar.qunit.html',
    'test-resources/sap/ushell/qunit/ui/launchpad/EmbeddedSupportErrorMessage.qunit.html',
    'test-resources/sap/ushell/qunit/ui/launchpad/Fiori2LoadingDialog.qunit.html',
    'test-resources/sap/ushell/qunit/ui/launchpad/GroupListItem.qunit.html',
    'test-resources/sap/ushell/qunit/ui/launchpad/LinkTileWrapper.qunit.html',
    'test-resources/sap/ushell/qunit/ui/launchpad/LoadingDialog.qunit.html',
    'test-resources/sap/ushell/qunit/ui/launchpad/TileContainer.qunit.html',
    'test-resources/sap/ushell/qunit/ui/launchpad/ViewPortContainer.qunit.html',

    'test-resources/sap/ushell/qunit/ui/shell/FloatingContainer.qunit.html',
    'test-resources/sap/ushell/qunit/ui/shell/RightFloatingContainer.qunit.html',
    'test-resources/sap/ushell/qunit/ui/shell/ShellAppTitle.qunit.html',
    'test-resources/sap/ushell/qunit/ui/shell/ShellLayout.qunit.html',
    'test-resources/sap/ushell/qunit/ui/shell/ShellTitle.qunit.html',
    'test-resources/sap/ushell/qunit/ui/shell/SplitContainer.qunit.html',

    'test-resources/sap/ushell/qunit/ui/tile/DynamicTile.qunit.html',
    'test-resources/sap/ushell/qunit/ui/tile/ImageTile.qunit.html',
    'test-resources/sap/ushell/qunit/ui/tile/StaticTile.qunit.html',
    'test-resources/sap/ushell/qunit/ui/tile/TileBase.qunit.html',
    'test-resources/sap/ushell/qunit/ui5service/ShellUIService.qunit.html'
  ].map(function (sEntry) {
    var sString = sEntry.match('/([^/]*).qunit.html')[1]
    return {
      key: sString,
      context: {
        systemObjectId: sString,
        path: 'sap/bc/ui5_ui5/ui2/ushell/' + sEntry
      }
    }
  }))

  var oWikis = [
    {
      key: 'FCC ABAP Alignment',
      context: {
        systemObjectId: 'UI2 Support page',
        path: '/unifiedshell/display/FCC+ABAP+Alignment'
      }
    },
    {
      key: 'UI2 test links',
      context: {
        systemObjectId: 'UI2 test links',
        path: 'wiki/display/unifiedshell/Adaption+to+UI5+QUnit+Test+Runner'
      }
    },
    {
      key: 'Support schedule',
      context: {
        systemObjectId: 'TIP Core UI Integration support',
        path: 'wiki/display/TIPCoreUII/Support'
      }
    },
    {
      key: 'UII Support schedule',
      context: {
        systemObjectId: 'TIP Core UI Integration support',
        path: 'wiki/display/TIPCoreUII/Support'
      }
    },
    {
      key: 'Support page',
      context: {
        systemObjectId: 'CA-UI2-INT-FE support',
        path: 'wiki/display/UICEI/CSS+Message+Dispatching+-+component+CA-UI2-INT-FE'
      }
    },
    {
      key: 'UI2 Support page',
      context: {
        systemObjectId: 'CA-UI2-INT-FE support',
        path: 'wiki/display/UICEI/CSS+Message+Dispatching+-+component+CA-UI2-INT-FE'
      }
    },
    {
      key: 'Backend Sprint Reviews',
      context: {
        systemObjectId: 'Backend Sprint Review',
        path: 'wiki/display/UICEI/Tact+Overviews'
      }
    },
    {
      key: 'UI5 patch schedule',
      context: {
        systemObjectId: 'UI5 UI2 Pach plan',
        path: 'wiki/pages/viewpage.action?pageId=1679623157'
      }
    }
  ]

  function calcDistance (sText1, sText2) {
    // console.log("length2" + sText1 + " - " + sText2)
    var a0 = distance.levenshtein(sText1.substring(0, sText2.length), sText2)
    var a = distance.levenshtein(sText1.toLowerCase(), sText2)
    return a0 * 500 / sText2.length + a
  }

  function fnFindMatch (sKeyword, oContext, oMap) {
    // return a better context if there is a match
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
      var o1 = Object.assign({}, oContext)
      var o2
      o1.context = Object.assign({}, o1.context)
      o2 = o1
      o2.context = Object.assign(o1.context, oMap[0].context)
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
        systemObjectCategory: 'catalog',
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
    Object.keys(oMergedContextResult.context).forEach(function (sKey) {
      var regex = new RegExp('{' + sKey + '}', 'g')
      ptn = ptn.replace(regex, oMergedContextResult.context[sKey])
      ptn = ptn.replace(regex, oMergedContextResult.context[sKey])
    })
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
  function filterShowEntity (oContext, aShowEntity) {
    var aFiltered
    Object.keys(oContext).forEach(function (sKey) {
      if (oContext[sKey] === null) {
        oContext[sKey] = undefined
      }
    })
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
      oMerged.context = Object.assign({}, oMerged.context, aFiltered[0].context, oContext)
      oMerged = Object.assign(oMerged, {
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
