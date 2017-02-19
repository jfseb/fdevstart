var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';
//var debuglog = require('debug')('plainRecoginizer.nunit');

var debug = require('debug');
const debuglog = debug('smartdialog.nunit');


var logger = require(root + '/utils/logger');
var HTMLConnector = require(root + '/ui/htmlconnector.js');
const SmartDialog = require(root + '/bot/smartdialog.js');



// Create bot and bind to console
function getBotInstance() {
  var connector = new HTMLConnector.HTMLConnector();
  SmartDialog.makeBot(connector);
  return connector;
}

//var conn = getBotInstance();

function testOne(str,cb) {
  var conn = getBotInstance();
  conn.setAnswerHook(cb);
  conn.processMessage(str, 'unittest');
  return conn;
}

//SimpleUpDownRecognizer

function doRecognize( sText, cb) {
  debuglog('type ' + typeof SmartDialog.SimpleUpDownRecognizer);
  var recognizer = new (SmartDialog.SimpleUpDownRecognizer)();
  recognizer.recognize({
    message : {
      text : sText
    }
  }, cb);
}

exports.testUpDownRecognizerQuit2 =  function (test) {
  doRecognize('quit', function(err, res) {
    test.deepEqual(res.intent,  'intent.up');
    test.done();
  });
};

exports.testUpDownRecognizerUp = function (test) {
  doRecognize('up', function(err, res) {
    test.deepEqual(res.intent,  'intent.up');
    test.done();
  });
};

exports.testUpDownRecognizerNothing = function (test) {
  doRecognize('this aint nothing', function(err, res) {
    test.deepEqual(res.intent,  'None');
    test.done();
  });
};

exports.testUpDownRecognizerDown = function (test) {
  doRecognize('down', function(err, res) {
    test.deepEqual(res.intent,  'intent.down');
    test.done();
  });
};

exports.testUpDownRecognizerDone = function (test) {
  doRecognize('done', function(err, res) {
    test.deepEqual(res.intent,  'intent.up');
    test.done();
  });
};

exports.testUpDownRecognizerExit = function (test) {
  doRecognize('exit', function(err, res) {
    test.deepEqual(res.intent,  'intent.up');
    test.done();
  });
};

exports.testUpDownRecognizer2 = function (test) {
  doRecognize('donenothing', function(err, res) {
    test.deepEqual(res.intent,  'intent.up');
    test.done();
  });
};

exports.testdescribeDontKnowQuotes = function (test) {
  testOne('describe "ABASDFSR"', function(res) {
    test.deepEqual(res,  'I don\'t know anything about "ABASDFSR".\n');
    test.done();
  });
};

//I don't know anything about ""DDF/DDEL_MON"".

exports.testUpDownWhatIsBSPNameManageLables = function (test) {
  testOne('what is the bspname for manage labels', function(res) {
    test.deepEqual(res, 'The bspname of manage labels is n/a\n' , ' correct stream');
    test.done();
  });
};


exports.testUpDownWhatIsBSPNameManageLablesQuote = function (test) {
  testOne('what is the bspname for "manage labels"', function(res) {
    test.deepEqual(res,  'The bspname of "manage labels" is n/a\n', 'correct string');
    test.done();
  });
};


exports.testUpDownWhatIsBSPNameFioriIntentManageLabels = function (test) {
  testOne('what is the bspname, fiori intent, appname for manage labels', function(res) {
    test.deepEqual(res,
'The "BSPName", "fiori intent" and "AppName" of manage labels are "n/a", "#ProductLabel-manage" and "Manage Labels"\n' ,

//    'Many comparable results, perhaps you want to specify a discriminating uri,appId,ApplicationComponent,RoleName,ApplicationType,BSPApplicationURL,releaseName,releaseId,BusinessCatalog,TechnicalCatalog,detailsurl,BSPPackage,AppDocumentationLinkKW,BusinessRoleName,BusinessGroupName,BusinessGroupDescription,PrimaryODataServiceName,SemanticObject,FrontendSoftwareComponent,TransactionCodes,PrimaryODataPFCGRole,ExternalReleaseName,ArtifactId,ProjectPortalLink,AppKey,UITechnology or use "list all ..."' );
    'correct result');
    test.done();
  });
};

exports.testUpDownWhatIsBSPNameFioriIntentManageLablesQuote = function (test) {
  testOne('what is the bspname, fiori intent, appname for "manage labels"', function(res) {
    test.deepEqual(res,  'The "BSPName", "fiori intent" and "AppName" of "manage labels" are "n/a", "#ProductLabel-manage" and "Manage Labels"\n');
    test.done();
  });
};


exports.testUpDownListAllBSPName = function (test) {
  testOne('list all bspname, fiori intent, appname for manage labels', function(res) {
    test.deepEqual(res,
     'the bspname, fiori intent, appname for manage labels are ...\n"FRA_ALERT_MAN", "#ComplianceAlerts-manage" and "Manage Alerts";\n"n/a", "#ProductLabel-manage" and "Manage Labels"' );
    test.done();
  });
};


exports.testUpDownListAllBSPNameManageLAables = function (test) {
  testOne('list all bspname, fiori intent, appname for "manage labels"', function(res) {
    test.deepEqual(res,
     'the bspname, fiori intent, appname for "manage labels" are ...\n"n/a", "#ProductLabel-manage" and "Manage Labels"' );
    test.done();
  });
};


exports.testListAllMultipleCategories = function (test) {
  testOne('List all atomic weight, element name, element symbol for element name silver',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes,  'the atomic weight, element name, element symbol for element name silver are ...\n"107.8682(2)", "silver" and "Ag"' );
    test.done();
  });
};


/* TODO!

exports.testShowMe1 = function (test) {
  var cnt = 0;
  testOne('start SU01 in',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    cnt = cnt + 1;
    test.deepEqual((cnt === 1) && (sRes.indexOf('Not enough') < 0), false);
    test.deepEqual((cnt === 2) && (sRes.indexOf('Please provide') < 0), false, 'first call');
    if(cnt === 2) {
      testOne('UV2', function(oRes) {
        debuglog(JSON.stringify(oRes));
        testOne('120', function(oRes) {
          debuglog(JSON.stringify(oRes));
          test.done();
        });
      });
    }
  });
};
*/

exports.testShowMe2 = function (test) {
  testOne('start SU01 in UV2 client 120',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes.indexOf('120') >= 0, false, 'wiki present');
    test.done();
  });
};

exports.testListAllMultipleCategories = function (test) {
  testOne('List all atomic weight, element name, element symbol for element name silver',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes,  'the atomic weight, element name, element symbol for element name silver are ...\n"107.8682(2)", "silver" and "Ag"' );
    test.done();
  });
};


exports.testListAllDomainsOBJ = function (test) {
  testOne('List all Tables in domain SOBJ Tables',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes,
   'the Tables for domain SOBJ Tables are ...\n/UIF/LREPDATTR;\n/UIF/LREPDATTRCD;\n/UIF/LREPDCONT;\n/UIF/LREPDCONTCD;\n/UIF/LREPDEREF;\n/UIF/LREPDEREFCD;\n/UIF/LREPDLTXT;\n/UIF/LREPDLTXTCD;\n/UIF/LREPDREF;\n/UIF/LREPDREFCD;\n/UIF/LREPDSTXT;\n/UIF/LREPDSTXTCD;\n/UIF/LREPDTEXT;\n/UIF/LREPDTEXTCD;\nLTDHTRAW;\nLTDHTTMPL;\nLTR_REPOSITORY;\nSWOTDI;\nSWOTDQ;\nTZS02'  , 'correct tables');
    test.done();
  });
};


//"list all Transport Tables in domain "SOBJ TAbles"

exports.testListAllInDomainsOBJIUPAC = function (test) {
  testOne('List all Tables in domain IUPAC',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes,
  'i did not find any Tables for domain IUPAC.\n'  , 'correct tables');
    test.done();
  });
};


exports.testListAllInDomainsQuoted = function (test) {
  testOne('List all Tables in domain "SOBJ Tables"',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes,
 'the Tables for domain "SOBJ Tables" are ...\n/UIF/LREPDATTR;\n/UIF/LREPDATTRCD;\n/UIF/LREPDCONT;\n/UIF/LREPDCONTCD;\n/UIF/LREPDEREF;\n/UIF/LREPDEREFCD;\n/UIF/LREPDLTXT;\n/UIF/LREPDLTXTCD;\n/UIF/LREPDREF;\n/UIF/LREPDREFCD;\n/UIF/LREPDSTXT;\n/UIF/LREPDSTXTCD;\n/UIF/LREPDTEXT;\n/UIF/LREPDTEXTCD;\nLTDHTRAW;\nLTDHTTMPL;\nLTR_REPOSITORY;\nSWOTDI;\nSWOTDQ;\nTZS02', 'correct tables');
    test.done();
  });
};

exports.testListAllInImplicitDomainQuoted = function (test) {
  testOne('List all Tables in "SOBJ Tables"',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes,
 /*   'the Tables for domain SOBJ Tables are ...\n/UIF/LREPDATTR;\n/UIF/LREPDATTRCD;\n/UIF/LREPDCONT;\n/UIF/LREPDCONTCD;\n/UIF/LREPDEREF;\n/UIF/LREPDEREFCD;\n/UIF/LREPDLTXT;\n/UIF/LREPDLTXTCD;\n/UIF/LREPDREF;\n/UIF/LREPDREFCD;\n/UIF/LREPDSTXT;\n/UIF/LREPDSTXTCD;\n/UIF/LREPDTEXT;\n/UIF/LREPDTEXTCD;\nLTDHTRAW;\nLTDHTTMPL;\nLTR_REPOSITORY;\nTZS02'  */
    'the Tables for "SOBJ Tables" are ...\n/UIF/LREPDATTR;\n/UIF/LREPDATTRCD;\n/UIF/LREPDCONT;\n/UIF/LREPDCONTCD;\n/UIF/LREPDEREF;\n/UIF/LREPDEREFCD;\n/UIF/LREPDLTXT;\n/UIF/LREPDLTXTCD;\n/UIF/LREPDREF;\n/UIF/LREPDREFCD;\n/UIF/LREPDSTXT;\n/UIF/LREPDSTXTCD;\n/UIF/LREPDTEXT;\n/UIF/LREPDTEXTCD;\nLTDHTRAW;\nLTDHTTMPL;\nLTR_REPOSITORY;\nSWOTDI;\nSWOTDQ;\nTZS02'
    , 'correct tables');
    test.done();
  });
};


/*
exports.testListAllCAtegoryInNonDomain = function (test) {
  testOne('List all categories in TWF',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes,
    'the Tables for "SOBJ Tables" are ...\n/UIF/LREPDATTR;\n/UIF/LREPDATTRCD;\n/UIF/LREPDCONT;\n/UIF/LREPDCONTCD;\n/UIF/LREPDEREF;\n/UIF/LREPDEREFCD;\n/UIF/LREPDLTXT;\n/UIF/LREPDLTXTCD;\n/UIF/LREPDREF;\n/UIF/LREPDREFCD;\n/UIF/LREPDSTXT;\n/UIF/LREPDSTXTCD;\n/UIF/LREPDTEXT;\n/UIF/LREPDTEXTCD;\nLTDHTRAW;\nLTDHTTMPL;\nLTR_REPOSITORY;\nSWOTDI;\nSWOTDQ;\nTZS02'
    , 'correct tables');
    test.done();
  });
};
*/

exports.testListAllCAtegoryInDomainNonDomain = function (test) {
  testOne('List all categories in domain ELOM',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes,
 /*   'the Tables for domain SOBJ Tables are ...\n/UIF/LREPDATTR;\n/UIF/LREPDATTRCD;\n/UIF/LREPDCONT;\n/UIF/LREPDCONTCD;\n/UIF/LREPDEREF;\n/UIF/LREPDEREFCD;\n/UIF/LREPDLTXT;\n/UIF/LREPDLTXTCD;\n/UIF/LREPDREF;\n/UIF/LREPDREFCD;\n/UIF/LREPDSTXT;\n/UIF/LREPDSTXTCD;\n/UIF/LREPDTEXT;\n/UIF/LREPDTEXTCD;\nLTDHTRAW;\nLTDHTTMPL;\nLTR_REPOSITORY;\nTZS02'  */
  'I did not infer a domain restriction from "domain ELOM", all my categories are ...\nAppDocumentationLinkKW;\nAppKey;\nAppName;\nApplicationComponent;\nApplicationType;\nArtifactId;\nBSPApplicationURL;\nBSPName;\nBSPPackage;\nBusinessCatalog;\nBusinessGroupDescription;\nBusinessGroupName;\nBusinessRoleName;\nCategory;\nExternalReleaseName;\nFrontendSoftwareComponent;\nLPDCustInstance;\nObject name length;\nPrimaryODataPFCGRole;\nPrimaryODataServiceName;\nPrimaryTable;\nRoleName;\nSemanticAction;\nSemanticObject;\nShortText;\nTable;\nTableTransportKeySpec;\nTechnicalCatalog;\nTransactionCodes;\nTranslationRelevant;\nTransportObject;\nType;\nURLParameters;\n_url;\nalbedo;\nappId;\natomic weight;\nclient;\nclientSpecific;\ndetailsurl;\ndevclass;\ndistance;\neccentricity;\nelement name;\nelement number;\nelement properties;\nelement symbol;\nfiori catalog;\nfiori group;\nfiori intent;\nisPublished;\nmass;\nobject name;\nobject type;\norbit radius;\norbital period;\norbits;\nradius;\nrecordKey;\nreleaseId;\nreleaseName;\nsystemId;\ntcode;\ntool;\ntransaction;\ntransaction description;\nunit test;\nuri;\nurl;\nvisual luminosity;\nvisual magnitude;\nwiki'
    , 'correct tables');
    test.done();
  });
};




exports.testMakeTable = function (test) {
  testOne('make table for element name, element symbol and atomic weight',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes,
     'I had to drop "atomic weight". But here you go ...\nCreating and starting table with "element name" and "element symbol"', 'wiki present');
    test.done();
  });
};



exports.testListAllSingleSimple = function (test) {
  testOne('List all element names with element number 10',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes,  'the element names for element number 10 are ...\nneon');
    test.done();
  });
};




exports.testWhatIsNonParseable = function (test) {
  testOne('What is the atomic weight, element name for element name silver sowasgibts nicht',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));

    test.deepEqual(sRes, 'I don\'t know anything about "atomic weight, element name" ("atomic weight" and "element name")" in relation to "element name silver sowasgibts nicht"\nI do not understand "sowasgibts".\nI do not understand "nicht".');
    test.done();
  });
};

exports.testListAllNonParseableSingleCat = function (test) {
  testOne('List all atomic weight for element name silver sowasgibts nicht',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes,
 'i did not find any atomic weight for element name silver sowasgibts nicht.\n\nI do not understand "sowasgibts".\nI do not understand "nicht".'
 );
    test.done();
  });
};



exports.testListAllMultipleCategoriesJunk = function (test) {
  testOne('List all atomic weight, sowasgibtsgarnicht, element symbol for element name silver',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes,  'I don\'t know anything about "atomic weight, sowasgibtsgarnicht, element symbol"(Error: "sowasgibtsgarnicht" is not a category!)' );
    test.done();
  });
};




exports.testListAllMultipleCategories2 = function (test) {
  testOne('What is the atomic weight and element symbol for gold',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes, 'The "atomic weight" and "element symbol" of gold are "196.966 569(5)" and "Au"\n');
    test.deepEqual(sRes.indexOf('966') >= 0, true, 'wiki present');
    test.done();
  });
};

exports.testListAllMultipleCategoriesBadMix = function (test) {
  testOne('What is the unit test and element symbol for gold',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes, 'I don\'t know anything about "unit test and element symbol" ("unit test" and "element symbol")" in relation to "gold"');
    test.done();
  });
};

exports.testListAllMultipleOK2 = function (test) {
  testOne('list all element name, atomic weight for mercury',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes, 'the element name, atomic weight for mercury are ...\n"mercury" and "200.592(3)"' );

    test.done();
  });
};

exports.testTooLongWordCount = function (test) {
  testOne('a b c d e f g h i j "k l m n o p" r s t ad so on is very short a',function(oRes) {
    //console.log('here answeres', SmartDialog.aResponsesOnTooLong.join('\n'));
    test.deepEqual(SmartDialog.aResponsesOnTooLong.indexOf(oRes) >= 0, true);
    test.done();
  });
};


exports.testTooLongSentence = function (test) {
  testOne('ahasdfasdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd'
  +' kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk '
  +' kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk '
  +' kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk '
  + ' jjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj jjjjjjjjjjjjjjjjjjjj'
  + ' llllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllll',function(oRes) {
    test.deepEqual(SmartDialog.aResponsesOnTooLong.indexOf(oRes) >= 0, true);
    test.done();
  });
};

exports.testListAllMultipleBadCombine = function (test) {
  testOne('list all element name, wiki for mercury',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes, 'I cannot combine "element name, wiki(Error: categories "element name" and "wiki" have no common domain.)' );
    test.done();
  });
};



exports.testShowMe2 = function (test) {
  testOne('What is the element weight for element name silver',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes.indexOf('107.') >= 0, true, 'wiki present');
    test.done();
  });
};


exports.testDomainsListAllIn = function (test) {
  testOne('list all categories in domain IUPAC',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes.indexOf('wiki') >= 0, false, 'wiki present');
    test.deepEqual(sRes.indexOf('element name') >= 0, true, 'wiki present');
    test.done();
  });
};


exports.testDomains = function (test) {
  testOne('list all domains',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes.indexOf('wiki') >= 0, true, 'wiki present');
    test.deepEqual(sRes.indexOf('FioriFLP') >= 0, true, 'wiki present');
    test.done();
  });
};


exports.testSuggest = function (test) {
  testOne('help me',function(oRes) {
    //var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.done();
  });
};


exports.testListWithContextDontKnow = function (test) {
  testOne('list abcnames for silver',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes.indexOf('know anything about \"abcnames\"') >= 0, true, 'not found');
    test.done();
  });
};

exports.testListWithContextKnow = function (test) {
  testOne('list all element name for silver',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes.indexOf('silver') >= 0, true, 'silver present');
    test.done();
  });
};


exports.testEliza = function (test) {
  testOne('i am sad',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes.indexOf('sad') >= 0, true, 'sad present');
    test.done();
  });
};

exports.testTrain = function (test) {
  testOne('i am sad',function(oRes) {
    testOne('Wrong', function(oRes){
      testOne('down', function(oRes){
        testOne('What is this', function(oRes){
          testOne('done', function(oRes){
            testOne('done', function(oRes){
              testOne('list all domains', function(oRes){
                var sRes = oRes;
                debuglog(JSON.stringify(oRes));
                test.deepEqual(sRes.indexOf('wiki') >= 0, true, 'wiki present');
                test.deepEqual(sRes.indexOf('FioriFLP') >= 0, true, 'FioriFLP present');
                test.done();
              });
            });
          });
        });
      });
    });
  });
};




exports.testListAllNotACat = function (test) {
  testOne('list all NOTACATEGORY',function(oRes) {
    debuglog(JSON.stringify(oRes));
    test.deepEqual(oRes,
    'I don\'t know anything about "NOTACATEGORY"(Error: "NOTACATEGORY" is not a category!)');
    test.done();
  });
};

//TODO; this should accept undefined and list more!
exports.testListAllMultOnlyCat = function (test) {
  testOne('list all orbits, object type',function(oRes) {
    debuglog(JSON.stringify(oRes));
    test.deepEqual(oRes,
    'the orbits, object type are ...\n"Alpha Centauri C" and "planet";\n"n/a" and "star, red dwarf";\n"Sun" and "planet"'
     );
    test.done();
  });
};


exports.testListWeirdNoCatError = function (test) {
  testOne('list all silver',function(oRes) {
    debuglog(JSON.stringify(oRes));
    test.deepEqual(oRes,
    'I don\'t know anything about "silver"(Error: "silver" is not a category!)');
    test.done();
  });
};

exports.testListWeirdUnknownError = function (test) {
  testOne('list all NOTANYWHERE',function(oRes) {
    debuglog(JSON.stringify(oRes));
    test.deepEqual(oRes,
    'I don\'t know anything about "NOTANYWHERE"(Error: "NOTANYWHERE" is not a category!)');
    test.done();
  });
};


exports.testListAllCategories = function (test) {
  testOne('list all categories',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes.indexOf('wiki') >= 0, true, 'wiki present');
    test.deepEqual(sRes.indexOf('FioriFLP') < 0, true, 'wiki present');
    test.done();
  });
};

exports.testListAllCategoriesInDomain = function (test) {
  testOne('list all categories in domain unit test',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes.indexOf('wiki') < 0, true, 'wiki present');
    test.deepEqual(sRes.indexOf('url') >= 0, true, 'wiki present');
    test.deepEqual(sRes.indexOf('unit test') >= 0, true, 'wiki present');
    test.done();
  });
};

exports.testListAllCategoriesRelatedTo = function (test) {
  testOne('list all categories related to unit test',function(oRes) {
    var sRes = oRes;
    debuglog(JSON.stringify(oRes));
    test.deepEqual(sRes.indexOf('wiki') < 0, true, 'wiki present');
    test.deepEqual(sRes.indexOf('unit test') >= 0, true, 'wiki present');
    test.done();
  });
};

exports.testDescribeStupidDomain = function (test) {
  testOne('describe ABC in domain NODomain',function(oRes) {
    debuglog(JSON.stringify(oRes));
    test.deepEqual(oRes, 'I did not infer a domain restriction from "NODomain". Specify an existing domain. (List all domains) to get exact names.\n');
    test.done();
  });
};


exports.testDescribeCategory = function (test) {
  testOne('describe category',function(oRes) {
    debuglog(JSON.stringify(oRes));
    test.deepEqual(oRes,
    '"category" is ' + SmartDialog.metawordsDescriptions['category']);
    test.done();
  });
};

exports.testDescribeCategorySenselessDomain = function (test) {
  testOne('describe category in domain wiki',function(oRes) {
    debuglog(JSON.stringify(oRes));
    test.deepEqual(oRes,
'"in domain "wiki" make no sense when matching a metaword.\n' +

    '"category" is ' + SmartDialog.metawordsDescriptions['category']);
    test.done();
  });
};


exports.testDescribeOneAtATime = function (test) {
  testOne('describe silver and gold',function(oRes) {
    debuglog(JSON.stringify(oRes));
    test.deepEqual(oRes,'Whoa, i can only explain one thing at a time, not "silver and gold". Please ask one at a time.');
    test.done();
  });
};


exports.testDescribeADomain = function (test) {
  testOne('describe cosmos',function(oRes) {
    debuglog(JSON.stringify(oRes));
    test.deepEqual(oRes,
    '"cosmos"is a domain with 13 categories and 7 records\nDescription:a model with a small subset of cosmological entities. Main purpose is to test \na)properties which occur multiple times (e.g. "Sun" in "object name" as key and in "orbits"; \nb) "earth" as a property which is also present in a differnt model\n' );
    test.done();
  });
};


exports.testDescribeEcc = function (test) {
  testOne('describe eccentricity',function(oRes) {
    debuglog(JSON.stringify(oRes));
    const DESCRIBE_ECCEN = '"eccentricity"  is a category in domain "Cosmos"\nIt is present in 2 (28.6%) of records in this domain,\nhaving 2(+1) distinct values.\nPossible values are ...\n"0.0167" or "0.0934"';

    //const DESCRIBE_ECCEN =  '"eccentricity"  is a category in domain "Cosmos"\nIt is present in 2 (33.3%) of records in this domain,\n'
    //+ 'having 2(+1) distinct values.\nPossible values are ...\n"0.0167" or "0.0934"';
    test.deepEqual(oRes,
    DESCRIBE_ECCEN);
    test.done();
  });
};

exports.testIsAnyonymous = function(test) {
  test.deepEqual(SmartDialog.isAnonymous('ano:abc'),true);
  test.deepEqual(SmartDialog.isAnonymous('somebody'),false);
  test.deepEqual(SmartDialog.isAnonymous('somano:xx'),false);
  test.done();
};



exports.testRestrictData = function (test) {

  test.deepEqual(SmartDialog.restrictData([1,2,3,4]), [1,2,3,4]);

  test.deepEqual(SmartDialog.restrictData([1,2,3,4,5,6,7,8,9]), [1,2,3,4,5,6,7]);

  test.deepEqual(SmartDialog.restrictData([1,2,3,4,5,6,7,8,9].map(i => '' + i)),

  [1,2,3,4,5,6,7,].map(i=> ''+i).concat('... and 2 more entries for registered users'));
  test.done();
};


exports.testDescribe = function (test) {
  testOne('describe silver',function(oRes) {
    debuglog(JSON.stringify(oRes));
    test.deepEqual(oRes,
     '"silver" has a meaning in one domain "IUPAC":\n"silver" is a value for category "element name" present in 1(0.8%) of records;\n'
        );
    test.done();
  });
};



exports.testDescribeEarth = function (test) {
  testOne('describe earth',function(oRes) {
    debuglog(JSON.stringify(oRes));
    test.deepEqual(oRes,
    '"earth" has a meaning in 2 domains: "Cosmos" and "Philosophers elements"\nin domain "Cosmos" "earth" is a value for category "object name" present in 1(14.3%) of records;\nin domain "Philosophers elements" "earth" is a value for category "element name" present in 1(25.0%) of records;\n'
    );
    test.done();
  });
};

exports.testListAllDomainContaining = function (test) {
  testOne('list all domains containing IU',function(oRes) {
    debuglog(JSON.stringify(oRes));
    test.deepEqual(oRes,
   'my domains containing "IU" are ...\nIUPAC'
    );
    test.done();
  });
};


exports.testListAllDomainContainingNotPresent = function (test) {
  testOne('list all domains containing IUNIXDA',function(oRes) {
    debuglog(JSON.stringify(oRes));
    test.deepEqual(oRes,
    'I have no domains containing "IUNIXDA"'
    );
    test.done();
  });
};


exports.testBadOP = function (test) {
  testOne('list all element names overfroombolding ea',function(oRes) {
    debuglog(JSON.stringify(oRes));
    test.deepEqual(oRes,
   'ouch, this was in internal error. Recovering from a weird operator "overfroombolding"\n'
    );
    test.done();
  });
};



exports.testOperatorStartsWith = function (test) {
  logPerf('testPerfListAll');
 // var u = 'list all AppNames in FIN-GL Account Manage fiori intent MM-PUR Work Center WBS Elements Planning related to unit test';
  testOne('list all element names starting with ni',function(oRes) {
  //  var sRes = oRes;
    logPerf('testPerfListAll');
    debuglog(JSON.stringify(oRes));
    test.deepEqual(oRes, 'my element names starting with "ni" are ...\nnickel;\nnihonium;\nniobium;\nnitrogen');
    test.done();
  });
};

exports.testOperatorStartsWithFI = function (test) {
  logPerf('testPerfListAll');
 // var u = 'list all AppNames in FIN-GL Account Manage fiori intent MM-PUR Work Center WBS Elements Planning related to unit test';
  testOne('list all KURUMBA LUBUMBA starting with FI',function(oRes) {
  //  var sRes = oRes;
    logPerf('testPerfListAll');
    debuglog(JSON.stringify(oRes));
    test.deepEqual(oRes, 'I don\'t know anything about \"KURUMBA LUBUMBA\"');
    test.done();
  });
};


exports.testOperatorCatEndingUPAC = function (test) {
  logPerf('testPerfListAll');
 // var u = 'list all AppNames in FIN-GL Account Manage fiori intent MM-PUR Work Center WBS Elements Planning related to unit test';
  testOne('list all categories ending with UPA!',function(oRes) {
  //  var sRes = oRes;
    logPerf('testPerfListAll');
    debuglog(JSON.stringify(oRes));
    test.deepEqual(oRes, 'I have no categories ending with "UPA"');
    test.done();
  });
};



exports.testTrainMe = function (test) {
  //logPerf('testPerfListAll');
 // var u = 'list all AppNames in FIN-GL Account Manage fiori intent MM-PUR Work Center WBS Elements Planning related to unit test';
  testOne('I think ABC is related to DEF', function(oRes) {
  //  var sRes = oRes;
    //logPerf('testPerfListAll');
    test.deepEqual(SmartDialog.aTrainReplies.indexOf(oRes) >= 0, true);
    test.done();
  });
};



exports.testTrainMeKlingon = function (test) {
  logPerf('testPerfListAll');
 // var u = 'list all AppNames in FIN-GL Account Manage fiori intent MM-PUR Work Center WBS Elements Planning related to unit test';
  testOne('I think Klingon is related to kronos', function(oRes) {
  //  var sRes = oRes;
    logPerf('testPerfListAll');
    debuglog(JSON.stringify(oRes));
    test.deepEqual(SmartDialog.aTrainNoKlingon.indexOf(oRes) >= 0, true);
    test.done();
  });
};




exports.testOperatorContainingUPAC = function (test) {
  logPerf('testPerfListAll');
 // var u = 'list all AppNames in FIN-GL Account Manage fiori intent MM-PUR Work Center WBS Elements Planning related to unit test';
  testOne('list all domains containing "UPA"',function(oRes) {
  //  var sRes = oRes;
    logPerf('testPerfListAll');
    debuglog(JSON.stringify(oRes));
    test.deepEqual(oRes, 'my domains containing "UPA" are ...\nIUPAC');
    test.done();
  });
};

exports.testOperatorContainingNit = function (test) {
  logPerf('testPerfListAll');
 // var u = 'list all AppNames in FIN-GL Account Manage fiori intent MM-PUR Work Center WBS Elements Planning related to unit test';
  testOne('list all tools containing "nit"',function(oRes) {
  //  var sRes = oRes;
    logPerf('testPerfListAll');
    debuglog(JSON.stringify(oRes));
    test.deepEqual(oRes, 'my tools containing "nit" are ...\nunit test');
    test.done();
  });
};


exports.testOperatorEndingWith = function (test) {
  logPerf('testPerfListAll');
 // var u = 'list all AppNames in FIN-GL Account Manage fiori intent MM-PUR Work Center WBS Elements Planning related to unit test';
  testOne('list all tools ending with "ABC"',function(oRes) {
  //  var sRes = oRes;
    logPerf('testPerfListAll');
    debuglog(JSON.stringify(oRes));
    test.deepEqual(oRes, 'I have no tools ending with "ABC"');
    test.done();
  });
};


exports.testOperatorCategoriesStartsWith = function (test) {
  logPerf('testPerfListAll');
 // var u = 'list all AppNames in FIN-GL Account Manage fiori intent MM-PUR Work Center WBS Elements Planning related to unit test';
  testOne('list all categories starting with elem?',function(oRes) {
  //  var sRes = oRes;
    logPerf('testPerfListAll');
    debuglog(JSON.stringify(oRes));
    test.deepEqual(oRes, 'my categories starting with "elem" are ...\nelement name;\nelement number;\nelement properties;\nelement symbol');
    test.done();
  });
};

exports.testOperatorStartsWithQuoted = function (test) {
  logPerf('testPerfListAll');
 // var u = 'list all AppNames in FIN-GL Account Manage fiori intent MM-PUR Work Center WBS Elements Planning related to unit test';
  testOne('list all categories starting with "elem"',function(oRes) {
  //  var sRes = oRes;
    logPerf('testPerfListAll');
    debuglog(JSON.stringify(oRes));
    test.deepEqual(oRes, 'my categories starting with "elem" are ...\nelement name;\nelement number;\nelement properties;\nelement symbol');
    test.done();
  });
};

exports.testOperatorStartsWithQuotedInDomain = function (test) {
  logPerf('testPerfListAll');
 // var u = 'list all AppNames in FIN-GL Account Manage fiori intent MM-PUR Work Center WBS Elements Planning related to unit test';
  testOne('list all categories starting with "elem" in domain IUPAC',function(oRes) {
  //  var sRes = oRes;
    logPerf('testPerfListAll');
    debuglog(JSON.stringify(oRes));
    test.deepEqual(oRes, 'my categories starting with "elem" in domain "IUPAC" are ...\nelement name;\nelement number;\nelement symbol');
    test.done();
  });
};

exports.testOperatorStartsWithQuotedInDomainSloppy = function (test) {
  logPerf('testPerfListAll');
 // var u = 'list all AppNames in FIN-GL Account Manage fiori intent MM-PUR Work Center WBS Elements Planning related to unit test';
  testOne('list all categories starting with "elem" in domain IUPAD',function(oRes) {
  //  var sRes = oRes;
    logPerf('testPerfListAll');
    debuglog(JSON.stringify(oRes));
    test.deepEqual(oRes, 'my categories starting with "elem" in domain "IUPAC" are ...\nelement name;\nelement number;\nelement symbol');
    test.done();
  });
};


exports.testOperatorStartsWithQuotedInNoDomain = function (test) {
  logPerf('testPerfListAll');
 // var u = 'list all AppNames in FIN-GL Account Manage fiori intent MM-PUR Work Center WBS Elements Planning related to unit test';
  testOne('list all categories starting with "elem" in domain NONEXSITENT',function(oRes) {
  //  var sRes = oRes;
    logPerf('testPerfListAll');
    debuglog(JSON.stringify(oRes));
    test.deepEqual(oRes, 'I did not infer a domain restriction from "NONEXSITENT". Specify an existing domain. (List all domains) to get exact names.\n');
    test.done();
  });
};

exports.testOperatorStartsWithQuotedMemberInDomain = function (test) {
  logPerf('testPerfListAll');
 // var u = 'list all AppNames in FIN-GL Account Manage fiori intent MM-PUR Work Center WBS Elements Planning related to unit test';
  testOne('list all element names starting with e in domain IUPAC',function(oRes) {
  //  var sRes = oRes;
    logPerf('testPerfListAll');
    debuglog(JSON.stringify(oRes));
    test.deepEqual(oRes, 'my element names starting with "e" in domain "IUPAC" are ...\neinsteinium;\nerbium;\neuropium');
    test.done();
  });
};


//var debug = require('debug');

var logPerf = logger.perf('perflistall');
//var perflog = debug('perf');


exports.testPerfListAll1 = function (test) {
  logPerf('testPerfListAll1');
  testOne('list all AppNames in FIN-GL Account Manage fiori intent MM-PUR Work Center WBS Elements Planning',function(oRes) {
   // var sRes = oRes;
    logPerf('testPerfListAll1');
    debuglog(JSON.stringify(oRes));
    test.deepEqual(true, true);
    test.done();
  });
};


exports.testPerfListAll2 = function (test) {
  logPerf('testPerfListAll');
 // var u = 'list all AppNames in FIN-GL Account Manage fiori intent MM-PUR Work Center WBS Elements Planning related to unit test';
  testOne('list all AppNames in FIN-GL Account Manage fiori intent related to unit test',function(oRes) {
  //  var sRes = oRes;
    logPerf('testPerfListAll');
    debuglog(JSON.stringify(oRes));
    test.deepEqual(true, true);
    test.done();
  });
};


exports.testUpDownRecognizerUp = function (test) {
  doRecognize('up', function(err, res) {
    test.deepEqual(res.intent,  'intent.up');
    test.done();
  });
};