/**
 * @file
 * @module toolmatcher.nunit
 * @copyright (c) 2016 Gerd Forstmann
 */

var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

var debuglog = require('debug')('execserver.nunit');

const ExecServer = require(root + '/exec/execserver.js');



var oToolFLP = {
  'name': 'FLP',
  'requires': { 'systemId': {}, 'client': {} },
  'optional': {
    'fiori intent': {}
  },
  'sets': {
    'group': {
      'set': [
        'systemId',
        'client',
        'fiori group'
      ],
      'response': '_urlpatterngroup'
    },
    'none': {
      'set': [
        'systemId',
        'client'
      ],
      'response': '_urlpattern2'
    },
    'intent': {
      'set': [
        'systemId',
        'client',
        'fiori intent'
      ],
      'response': '_urlpatternintent'
    },
  }
};

var sentenceFull = [
  {
    matchedString: 'UV2',
    category : 'systemId'
  },
  { matchedString : '120',
    category : 'client'
  },
  { matchedString : '120',
    category : 'client'
  },
  {
    matchedString : '#ABC-def',
    category : 'fiori intent'
  }
];

var sentenceGroup = [
  {
    matchedString: 'UV2',
    category : 'systemId'
  },
  { matchedString : '120',
    category : 'client'
  },
  { matchedString : '120',
    category : 'client'
  },
  {
    matchedString : 'Agroup',
    category : 'fiori group'
  }
];



var sentenceIncomplete = [
  {
    matchedString: 'UV2',
    category : 'systemId'
  },
  {
    matchedString : '#ABC-def',
    category : 'fiori intent'
  }
];



var toolmatch = {
  sentence : [
    {
      matchedString: 'UV2',
      category : 'systemId'
    },
    { matchedString : '120',
      category : 'client'
    },
    { matchedString : '120',
      category : 'client'
    },
    {
      matchedString : '#ABC-def',
      category : 'fiori intent'
    }
  ],
  tool : oToolFLP,
  toolmatchresult : {
  }
};



var records = [
  { tool : 'FLP',
    'systemId' : 'UV2',
    'client' : '*',
    'fiori intent' : '#ABC-def',
    _urlpatternintent : 'urlpattern1?sap-client={client}{fiori intent}',
    _urlpattenr2 : 'urlpatern2:?sap-client=<client>',
    _urlpatterngroup : 'urlpatern2:?sap-client=<group>'
  },
  { tool : 'FLP',
    'systemId' : 'UV2',
    'client' : '*',
    'fiori group' : 'Agroup',
    _urlpatterngroup : 'urlpattern1:{fiori group}',
    _text_urlpatterngroup : 'Show Fiori Launchpad group "{fiori group}" in {systemId}CLNT{client}',
    _urlpattern2 : 'urlpatern2:?sap-client=<client>',
    _urlpatternintent : 'urlpatern2:?sap-client=<group>'
  }
];


exports.testNoStar = function(test) {
  test.equal(ExecServer.noStar('*','AA'), 'AA');
  test.equal(ExecServer.noStar('BB','*'), 'BB');
  test.equal(ExecServer.noStar('AA','AA'), 'AA');
  try {
    test.equal(ExecServer.noStar('bb','AA'), 'AA');
    test.equal(true, false);
  } catch (e) {
    test.equal(true,true);
  }
  test.done();
};

exports.testMakeGenericText = function (test) {
  toolmatch.sentence = sentenceFull;
  var res = ExecServer.makeGenericText(toolmatch, 'intent', records[0]);
  test.deepEqual(res,
  'start FLP using systemId "UV2"; client "120" and fiori intent "#ABC-def"');
  test.done();
};


exports.testMakeGenericTextThrow = function (test) {
  test.expect(1);
  toolmatch.sentence = sentenceIncomplete;
  try {
    ExecServer.makeGenericText(toolmatch, 'intent', records[0]);
    test.equal(true,false, 'shoudl not get here');
  } catch (exc) {
    test.equal(1,1,'threw');
  }
  test.done();
};


exports.testMakeGenericTextToolOnly = function (test) {
  toolmatch.sentence = sentenceFull;
  var oToolX = {
    'name': 'FLP',
    'requires': { },
    'sets': {
      'short': {
        'set': [
        ],
        'response': '_urlpatterngroup'
      }
    }
  };
  var res = ExecServer.makeGenericText({ tool : oToolX,}, 'short', records[0]);
  test.deepEqual(res,
  'start FLP');
  test.done();
};



exports.testMakeGenericTextTool1 = function (test) {
  toolmatch.sentence = sentenceFull;
  var oToolX = {
    'name': 'FLP',
    'requires': { },
    'sets': {
      'short': {
        'set': [ 'client'
        ],
        'response': '_urlpatterngroup'
      }
    }
  };
  var res = ExecServer.makeGenericText({
    sentence : [{ 'category' : 'client', 'matchedString' : '120' }],
    tool : oToolX }, 'short', records[0]);
  test.deepEqual(res,
  'start FLP using client "120"');
  test.done();
};

exports.testMakeGenericTextTool2 = function (test) {
  toolmatch.sentence = sentenceFull;
  var oToolX = {
    'name': 'FLP',
    'requires': { },
    'sets': {
      'short': {
        'set': [   'client', 'systemId'
        ],
        'response': '_urlpatterngroup'
      }
    }
  };
  var res = ExecServer.makeGenericText({
    sentence : [{ 'category' : 'client', 'matchedString' : '120' },
      { 'category' : 'systemId', 'matchedString' : 'UV2' }
    ],
    tool : oToolX}, 'short', records[0]);
  test.deepEqual(res,
  'start FLP using client "120" and systemId "UV2"');
  test.done();
};


exports.testMakeGenericTextToolMisMatch = function (test) {
  toolmatch.sentence = sentenceFull;
  test.expect(1);
  var oToolX = {
    'name': 'FLP',
    'requires': { },
    'sets': {
      'short': {
        'set': [   'client', 'systemId'
        ],
        'response': '_urlpatterngroup'
      }
    }
  };
  try {
    ExecServer.makeGenericText({
      sentence : [{ 'category' : 'client', 'matchedString' : '120' },
      { 'category' : 'systemId', 'matchedString' : 'UXR' }
      ],
      tool : oToolX}, 'short', records[0]);
    test.equal(true,false, 'should not get here');
  } catch(e) {
    test.ok(true,true,'threw');
  }
  test.done();
};




exports.testExecTool = function (test) {
  toolmatch.sentence = sentenceFull;
  var res = ExecServer.execTool(toolmatch, records); // matchSetResult, records);
  test.deepEqual(res, {
    text : 'start FLP using systemId "UV2"; client "120" and fiori intent "#ABC-def"',
    action : { url : 'urlpattern1?sap-client=120#ABC-def' }
  });
  test.done();
};

exports.testExecToolCustomText = function (test) {
  toolmatch.sentence = sentenceGroup;
  debuglog('toolmatch: ' + JSON.stringify(toolmatch));
  debuglog('record: ' + JSON.stringify(records));

  var res = ExecServer.execTool(toolmatch, records); // matchSetResult, records);
  test.deepEqual(res, {
    text : 'Show Fiori Launchpad group "Agroup" in UV2CLNT120',
    action : { url : 'urlpattern1:Agroup' }
  });
  test.done();
};