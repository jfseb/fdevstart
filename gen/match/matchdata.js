/**
 * @file
 * @module jfseb.fdevstart.matchdata
 * @copyright (c) 2016 Gerd Forstmann
 */
"use strict";
exports.oUnitTests = [
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
    var sString = sEntry.match('/([^/]*).qunit.html')[1];
    return {
        key: sString,
        context: {
            systemObjectId: sString,
            path: 'sap/bc/ui5_ui5/ui2/ushell/' + sEntry
        }
    };
}));
exports.oWikis = [
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
        key: 'CA-UI2-INT-FE support',
        context: {
            systemObjectId: 'CA-UI2-INT-FE support',
            path: 'wiki/display/UICEI/CSS+Message+Dispatching+-+component+CA-UI2-INT-FE'
        }
    },
    {
        key: 'ca-ui2-int-fe support',
        context: {
            systemObjectId: 'ca-ui2-int-fe support',
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
];

//# sourceMappingURL=matchdata.js.map
