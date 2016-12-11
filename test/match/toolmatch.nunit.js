/**
 * @file
 * @module toolmatcher.nunit
 * @copyright (c) 2016 Gerd Forstmann
 */

var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

var debuglog = require('debug')('toolmatcher.nunit');

const Toolmatch = require(root + '/match/toolmatch.js');


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

var sentenceAmbiguous = [
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
  { matchedString : 'Agroup',
    category : 'fiori group'
  },
  {
    matchedString : '#ABC-def',
    category : 'fiori intent'
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


var sentenceShort = [
  {
    matchedString: 'UV2',
    category : 'systemId'
  },
  {
    matchedString : '120',
    category : 'client'
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
    _urlpatternintent : 'urlpattern1:<fiori intent>',
    _urlpattenr2 : 'urlpatern2:?sap-client=<client>',
    _urlpatterngroup : 'urlpatern2:?sap-client=<group>'
  },
  { tool : 'FLP',
    'systemId' : 'UV2',
    'client' : '*',
    'fiori group' : 'Agroup',
    _urlpatternintent : 'urlpattern1:<fiori intent>',
    _urlpattern2 : 'urlpatern2:?sap-client=<client>',
    _urlpatterngroup : 'urlpatern2:?sap-client=<group>'
  }
];


exports.testFindBestMatchingSet = function (test) {
  toolmatch.sentence = sentenceFull;
  var res = Toolmatch.findBestMatchingSet(toolmatch);
  debuglog('result : ' + JSON.stringify(res, undefined, 2));
  test.deepEqual(res, {
    set : ['systemId', 'client', 'fiori intent'],
    response : '_urlpattern1'
  });
  test.done();
};

exports.testFindBestMatchingSet = function (test) {
  toolmatch.sentence = sentenceFull;
  var res = Toolmatch.findBestMatchingSet(toolmatch);
  debuglog('result : ' + JSON.stringify(res, undefined, 2));
  test.deepEqual(res, {
    set : ['systemId', 'client', 'fiori intent'],
    response : '_urlpatternintent'
  });
  test.done();
};

exports.testFindMatchingSetShort = function (test) {
  toolmatch.sentence = sentenceShort;
  var res = Toolmatch.findBestMatchingSet(toolmatch);
  debuglog('result : ' + JSON.stringify(res, undefined, 2));
  test.deepEqual(res, {
    set : ['systemId', 'client'],
    response : '_urlpattern2'
  });
  test.done();
};


exports.testFindMatchingSetIncomplete = function (test) {
  toolmatch.sentence = sentenceIncomplete;
  var res = Toolmatch.findBestMatchingSet(toolmatch);
  debuglog('result : ' + JSON.stringify(res, undefined, 2));
  test.deepEqual(res, undefined);
  test.done();
};

exports.testFindBestMatchingSetAmbiguous = function (test) {
  toolmatch.sentence = sentenceAmbiguous;
  var res = Toolmatch.findMatchingSets(toolmatch);
  debuglog('result : ' + JSON.stringify(res, undefined, 2));
  test.deepEqual(res, ['group', 'intent']);
  test.done();
};



exports.testIsMatchingRecord = function (test) {
  var requiredWords = { 'systemId' : 'UV2', 'client' : '120' ,
    'fiori intent' : '#ABC-def' };
  var res = Toolmatch.isMatchingRecord( requiredWords, '_urlpatternintent', records[0]);
  test.equal(res,true,'0 matches');
  res = Toolmatch.isMatchingRecord(requiredWords, '_urlpatternintent', records[1]);
  test.equal(res,false,'1 matches');
  res = Toolmatch.isMatchingRecord(requiredWords, '_urlpatterrnixda', records[0]);
  test.equal(res,false,'0 does not match with missing response member matches');
  test.done();
};


var toolSet = {
  set : ['client', 'systemId'],
  command : '_urlpattern3'
};

exports.testMakeMatchSet = function (test) {
  toolmatch.sentence = sentenceFull;
  var res = Toolmatch.makeMatchSet(toolmatch,
  toolSet);

  test.deepEqual(res, { 'client' : '120', systemId : 'UV2' });
  test.done();

};


exports.testFindMatchingRecord = function (test) {
  toolmatch.sentence = sentenceFull;
  var setIds = Toolmatch.findMatchingSets(toolmatch);
  var res = Toolmatch.findSetRecords(toolmatch, setIds, records);
  debuglog('result : ' + JSON.stringify(res, undefined, 2));
  test.deepEqual(res, [{
    setId : 'intent',
    record : records[0]
  }
  ], 'correct match');
  test.done();
};



exports.testFindMatchingRecordAmbg = function (test) {
  toolmatch.sentence = sentenceAmbiguous;
  var setIds = Toolmatch.findMatchingSets(toolmatch);
  var res = Toolmatch.findSetRecords(toolmatch, setIds, records);
  debuglog('result : ' + JSON.stringify(res, undefined, 2));
  test.deepEqual(res, [{
    setId : 'group',
    record : records[1]
  },
  {
    setId : 'intent',
    record : records[0]
  }
  ], 'correct match');
  test.done();
};

