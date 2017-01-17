

import * as xinputFilter from './inputFilter';
import * as IMatch from './ifmatch';

import * as Model from '../model/model';


export const oKeyOrder: Array<String> = ["systemObjectCategory", "systemId", "systemObjectId"];

var mUnitTestURLMap = {};

var aregex = /\/([^/]*).qunit.html/;

var UnitTestList =
  [
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
  ];


var mUnitTestWords = UnitTestList.map(function (sEntry) {
  var sString = aregex.exec(sEntry)[1]; //.match('/([^/]*).qunit.html')[1]
  //console.log("here is the test " + sString);
  mUnitTestURLMap[sString] = "http://localhost:8080/sap/bc/" + sEntry;
  return {
    category: "unit test",
    matchedString: sString,
    type: 0,
    word: sString,
    _ranking: 0.95
  };
});


/* @covignore */
export function getRuleMap() {


  var systemObjectCategory = [
    {
      type: IMatch.EnumRuleType.WORD,
      key: "systemObjectCategory",
      word: "unit test",
      follows: {
        systemObjectCategory: "unit test"
      }
    },
    {
      type: IMatch.EnumRuleType.WORD,
      key: "systemObjectCategory",
      word: "unit",
      follows: {
        systemObjectCategory: "unit test"
      }
    }
  ];
  /* @covignore */
  var systemObjectCategory2 = [["unit test", "unit"],
  ["wiki", "web page"],
  ["fiori catalog", "flp catalog", "catalog"],
  ["fiori group", "flp group", "group"],
  ["url"],
  ["flp", "fiori launchpad", "lauchpage", "launchpad"],
  ["flpd"]
  ].map(function (aArr) {
    // console.log(JSON.stringify(aArr));
    var bestSynonym = aArr[0];
    return aArr.map(function (sEntry) {
      return {
        type: IMatch.EnumRuleType.WORD,
        key: "systemObjectCategory",
        word: sEntry,
        follows: {
          systemObjectCategory: bestSynonym
        }
      };
    });
  });
  systemObjectCategory2 = systemObjectCategory2.reduce(function (a, b) { return a.concat(b); }, []) as any;

  var systemObjectCategory = systemObjectCategory.concat(systemObjectCategory2 as any)

  var oRuleMap = {

    "systemObjectCategory": systemObjectCategory
    ,
    "systemId": [
      {
        regexp: /^([a-z0-9_]{3,3})CLNT(\d{3,3})$/i,
        key: 'systemId',
        argsMap: {
          1: 'systemId',
          2: 'client'
        },
        type: IMatch.EnumRuleType.REGEXP,
        follows: {}
      },
      {
        regexp: /^([a-z0-9_]{3,3})$/i,
        key: 'systemId',
        argsMap: {
          1: 'systemId'
        },
        type: IMatch.EnumRuleType.REGEXP,
        follows: {}
      }
    ],
  };




  var systemObjectId = UnitTestList.map(function (sEntry) {
    var sString = aregex.exec(sEntry)[1]; //.match('/([^/]*).qunit.html')[1]
    return {
      key: "systemObjectId",
      word: sString,
      type: IMatch.EnumRuleType.WORD,
      follows: {
        systemObjectCategory: "unit test",
        systemObjectId: sString
      }
    }
  }); // map


  var systemObjectId2 = [
    // wiki aliases, this is an old legacy foramt
    {
      key: 'Support page',
      res: 'CA-UI2-INT-FE support',
    },
    { key: 'FCC ABAP Alignment' },
    { key: 'UI2 test links' },
    { key: 'Support schedule', res: 'TIP Core UI Integration support' },
    { key: 'UII Support schedule', res: 'TIP Core UI Integration support' },
    {
      key: 'UI2 Support page',
      res: 'CA-UI2-INT-FE support'
    },
    {
      key: 'Backend Sprint Reviews',
      res: 'Backend Sprint Review'
    },
    {
      key: 'UI5 patch schedule',
      res: 'UI5 UI2 Patch plan'
    }
  ].map(function (oEntry: { key: string, res?: string }) {
    return {
      word: oEntry.key,
      key: "systemObjectId",
      type: IMatch.EnumRuleType.WORD,
      follows: {
        systemObjectCategory: "wiki",
        systemObjectId: (oEntry.res || oEntry.key).toLowerCase()
      }
    };
  }
    ); // map


  systemObjectId = systemObjectId.concat(systemObjectId2 as any);

  systemObjectId = systemObjectId.concat([
    {
      type: IMatch.EnumRuleType.WORD,
      key: "systemObjectId",
      word: "flpd",
      follows: {
      }
    },
    {
      type: IMatch.EnumRuleType.REGEXP,
      key: "systemObjectId",
      regexp: /\S+/i,
      follows: {
        _ranking: 0.9
      }
    }
  ] as any)

  oRuleMap["systemObjectId"] = systemObjectId;

  return oRuleMap;

}

var mRuleArray: Array<IMatch.mRule>;

export function compareMRuleFull(a: IMatch.mRule, b: IMatch.mRule) {
  var r = a.category.localeCompare(b.category);
  if (r) {
    return r;
  }
  r = a.type - b.type;
  if (r) {
    return r;
  }
  if (a.matchedString && b.matchedString) {
    r = a.matchedString.localeCompare(b.matchedString);
    if (r) {
      return r;
    }
  }
  if (a.word && b.word) {
    var r = a.word.localeCompare(b.word);
    if(r) {
      return r;
    }
  }
  r = (a._ranking || 1.0) - (b._ranking || 1.0);
  if(r) {
    return r;
  }
  if(a.exactOnly && !b.exactOnly) {
    return -1;
  }
  if(b.exactOnly && !a.exactOnly) {
    return +1;
  }
  return 0;
}

export function cmpMRule(a: IMatch.mRule, b: IMatch.mRule) {
  var r = a.category.localeCompare(b.category);
  if (r) {
    return r;
  }
  r = a.type - b.type;
  if (r) {
    return r;
  }
  if (a.matchedString && b.matchedString) {
    r = a.matchedString.localeCompare(b.matchedString);
    if (r) {
      return r;
    }
  }
  if (a.word && b.word) {
    return a.word.localeCompare(b.word);
    /*
    if(r) {
      return r;
    }*/
  }
  r = (a._ranking || 1.0) - (b._ranking || 1.0);
  if(r) {
    return r;
  }
  return 0;
  /*
  if(a.exactOnly && !b.exactOnly) {
    return -1;
  }
  if(b.exactOnly && !a.exactOnly) {
    return +1;
  }*/

}

export function getIntMRulesSample(): Array<IMatch.mRule> {
  var mRules = [] as Array<IMatch.mRule>;
  mRules = mRules.concat([
    // a generic rule for any id
    {
      type: IMatch.EnumRuleType.REGEXP,
      category: "systemObjectId",
      regexp: /\S+/i,
      _ranking: 0.5
    },
    {
      type: IMatch.EnumRuleType.REGEXP,
      category: "fiori catalog",
      regexp: /^[A-Z0-9a-z_\/]+$/i,
      _ranking: 0.5
    },
    {
      type: IMatch.EnumRuleType.REGEXP,
      category: "client",
      regexp: /^\d{3,3}$/i,
      _ranking: 0.8
    },
    {
      type: IMatch.EnumRuleType.REGEXP,
      category: "systemId",
      regexp: /^[A-Z][A-Z0-9][A-Z0-9]$/i,
      _ranking: 0.7
    },
    {
      type: IMatch.EnumRuleType.WORD,
      category: "systemId",
      word: "UV2",
      matchedString: "UV2"
    },
    {
      type: IMatch.EnumRuleType.REGEXP,
      category: "transaction",
      regexp: /^[A-Z][A-Z0-9_]{3,3}$/i,
      _ranking: 0.7
    },
    {
      type: IMatch.EnumRuleType.REGEXP,
      category: "fiori catalog",
      regexp: /^SAP_BC[A-Z][A-Z0-9_]*$/,
      _ranking: 0.85
    },
    {
      type: IMatch.EnumRuleType.REGEXP,
      category: "fiori catalog",
      regexp: /^SAP_TC[A-Z][A-Z0-9_]*$/,
      _ranking: 0.85
    },
    // a few unit tests
    {
      category: "unit test",
      matchedString: "NavTargetResolution",
      type: 0,
      word: "NavTargetResolution"
    },
    {
      category: "unit test",
      matchedString: "NavTargetResolutionAdapter",
      type: 0,
      word: "NavTargetResolutionAdapter"
    },
    // a few unit tests
    {
      category: "wiki",
      matchedString: "UI2 Integration",
      type: 0,
      word: "UI2 Integration"
    },
    {
      category: "wiki",
      matchedString: "UI2 Support pages",
      type: 0,
      word: "UI2 Support pages"
    },
    // categories of this model
    {
      category: "category",
      matchedString: "wiki",
      type: 0,
      word: "wiki",
    },
    {
      category: "category",
      matchedString: "unit test",
      type: 0,
      word: "unit test",
    },
    {
      category: "category",
      matchedString: "url",
      type: 0,
      word: "url",
    },
    {
      category: "category",
      matchedString: "transaction",
      type: 0,
      word: "transaction",
    },
    {
      category: "category",
      matchedString: "transaction",
      type: 0,
      word: "ta",
    },
    {
      category: "category",
      matchedString: "fiori catalog",
      type: 0,
      word: "fiori catalog",
    },
    {
      category: "category",
      matchedString: "fiori catalog",
      type: 0,
      _ranking: 0.8,
      word: "catalog",
    },
    {
      category: "category",
      matchedString: "systemId",
      type: 0,
      word: "system",
    },
    {
      category: "category",
      matchedString: "client",
      type: 0,
      word: "client",
    },
    // tools of the sample model
    {
      category: "tool",
      matchedString: "FLPD",
      type: 0,
      word: "flpd",
    },
    {
      category: "operator",
      matchedString: "starts with",
      type: 0,
      word: "starting with",
    },
    {
      category: "tool",
      matchedString: "FLP",
      type: 0,
      word: "flp",
    },
    {
      category: "tool",
      matchedString: "FLP",
      type: 0,
      word: "Fiori Launchpad",
    },
    {
      category: "tool",
      matchedString: "wiki",
      type: 0,
      word: "wiki",
    },

    // fillers
    // tools of the sample model
    {
      category: "filler",
      type: 1,
      regexp: /^((start)|(show)|(from)|(in))$/i,
      matchedString: "filler",
      _ranking: 0.9
    },
  ]
  );
  var mRules = assureLowerCaseWord(mRules);
  return mRules.sort(cmpMRule);
}


export function getMRulesSample(): IMatch.SplitRules {
  return Model.splitRules(getIntMRulesSample());
}


export function assureLowerCaseWord(mRules: Array<IMatch.mRule>) {
  return mRules.map(function (oRule) {
    if (oRule.type === IMatch.EnumRuleType.WORD) {
      oRule.lowercaseword = oRule.word.toLowerCase();
    }
    return oRule;
  });
}

export function getUnitTestUrl(string: string) {
  return mUnitTestURLMap[string];
}

export function getWikiUrl(string: string) {
  // TODO
  return mUnitTestURLMap[string];
}


export function getMRulesFull(): IMatch.SplitRules {
  var mRules = getIntMRulesSample();
  mRules = mRules.concat(mUnitTestWords);
  mRules = assureLowerCaseWord(mRules);
  return Model.splitRules(mRules.sort(cmpMRule));
}
