var process = require('process');
var root = (process.env.FSD_COVERAGE) ? '../../gen_cov' : '../../gen';

// var debug = require('debug')('exectemplate.nunit');

const exectemplate = require(root + '/exec/exectemplate.js');


exports.test_expandParametersInURL = function (test) {
  var fut = exectemplate.expandTemplate;

  test.equal(fut({
    abc: 'def', hij: 1
  },
    'http://abc{abc}?def={hij}'
  ), 'http://abcdef?def=1', 'ok');
  test.done();
};

exports.test_expandParametersInURL2 = function (test) {
  var fut = exectemplate.expandTemplate;
  test.equal(fut({ abc: 'def', hij: 1 },
    'http://abc{abc}?klm={abc}&{efabc}=8&def={hij}and{ABC}'
  ), 'http://abcdef?klm=def&{efabc}=8&def=1and{ABC}', 'ok');
  test.done();
};



exports.test_extractREplKEys = function (test) {
  var fut = exectemplate.extractReplacementKeys;
  test.deepEqual(fut('http://abc{abc}?klm={abc}&{efabc}=8&def={hij}and{ABC}'
  ), [ 'ABC', 'abc', 'efabc', 'hij'], 'correct');
  test.done();
};
